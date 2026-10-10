import { LIMITS, SNAP } from './constants.js';
import {
  childrenOf,
  createObject,
  defaultDoc,
  parseDoc,
  sanitizeDoc,
  sanitizeObject,
  serializeDoc,
  subtreeIds,
  uniqueName,
} from './doc.js';

const HISTORY_MAX = 100;

/**
 * The editor state: the scene document (saved, undoable) plus view state (selection, tool,
 * shading, time). Plain JS with subscribe, so React reads it through `useSyncExternalStore`
 * and tests drive it directly.
 */
export function createStudioStore(initialDoc = defaultDoc()) {
  let doc = sanitizeDoc(initialDoc);
  const undoStack = [];
  const redoStack = [];
  let view = {
    selection: [],
    tool: 'select',
    space: 'world',
    snap: false,
    shading: 'material',
    time: 0,
    playing: false,
  };
  let snapshot = { doc, ...view, canUndo: false, canRedo: false };
  const listeners = new Set();

  const refresh = () => {
    snapshot = { doc, ...view, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 };
    listeners.forEach((l) => l());
  };
  const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };
  const getState = () => snapshot;

  /** Records the current doc for undo, then installs `next`. */
  function commit(next, { record = true } = {}) {
    if (record) {
      undoStack.push(doc);
      if (undoStack.length > HISTORY_MAX) undoStack.shift();
      redoStack.length = 0;
    }
    doc = next;
    // selection must stay valid
    const ids = new Set(doc.objects.map((o) => o.id));
    view = { ...view, selection: view.selection.filter((id) => ids.has(id)) };
    refresh();
  }

  const setView = (patch) => {
    view = { ...view, ...patch };
    refresh();
  };

  // ------------------------------------------------------------ history
  function undo() {
    if (!undoStack.length) return;
    redoStack.push(doc);
    doc = undoStack.pop();
    view = { ...view, selection: view.selection.filter((id) => doc.objects.some((o) => o.id === id)) };
    refresh();
  }
  function redo() {
    if (!redoStack.length) return;
    undoStack.push(doc);
    doc = redoStack.pop();
    view = { ...view, selection: view.selection.filter((id) => doc.objects.some((o) => o.id === id)) };
    refresh();
  }

  // ------------------------------------------------------------ objects
  function add(type, over = {}, { select = true } = {}) {
    if (doc.objects.length >= LIMITS.maxObjects) return null;
    const obj = sanitizeObject(createObject(type, { ...over }));
    obj.name = uniqueName(doc, over.name ?? obj.name);
    commit({ ...doc, objects: [...doc.objects, obj] });
    if (select) setView({ selection: [obj.id] });
    return obj;
  }

  /** Merges `patch` into one object. `record:false` is for live drags (commit once at the end). */
  function update(id, patch, opts) {
    commit({ ...doc, objects: doc.objects.map((o) => (o.id === id ? sanitizeObject({ ...o, ...patch, id }) : o)) }, opts);
  }
  function updateMany(patches, opts) {
    const map = new Map(patches.map((p) => [p.id, p]));
    commit({ ...doc, objects: doc.objects.map((o) => (map.has(o.id) ? sanitizeObject({ ...o, ...map.get(o.id) }) : o)) }, opts);
  }
  const updateWorld = (patch) => commit(sanitizeDoc({ ...doc, world: { ...doc.world, ...patch } }));
  const updateTime = (patch) => commit(sanitizeDoc({ ...doc, time: { ...doc.time, ...patch } }));
  const rename = (name) => commit({ ...doc, name: String(name).slice(0, 60) || 'Untitled' });

  function remove(ids = view.selection) {
    const drop = new Set(ids.flatMap((id) => subtreeIds(doc, id)));
    if (!drop.size) return;
    commit({ ...doc, objects: doc.objects.filter((o) => !drop.has(o.id)) });
  }

  function duplicate(ids = view.selection) {
    const roots = ids.filter((id) => !ids.some((other) => other !== id && subtreeIds(doc, other).includes(id)));
    const created = [];
    let objects = [...doc.objects];
    const copyTree = (id, parent) => {
      const src = objects.find((o) => o.id === id);
      if (!src || objects.length >= LIMITS.maxObjects) return null;
      const copy = sanitizeObject({ ...JSON.parse(JSON.stringify(src)), id: undefined, parent });
      copy.name = uniqueName({ objects }, src.name);
      if (parent === src.parent) copy.pos = [src.pos[0] + 0.5, src.pos[1], src.pos[2] + 0.5];
      objects = [...objects, copy];
      created.push(copy.id);
      for (const c of childrenOf(doc, id)) copyTree(c.id, copy.id);
      return copy;
    };
    const rootCopies = roots.map((id) => copyTree(id, objects.find((o) => o.id === id)?.parent ?? null)).filter(Boolean);
    if (!rootCopies.length) return [];
    commit({ ...doc, objects });
    setView({ selection: rootCopies.map((c) => c.id) });
    return rootCopies.map((c) => c.id);
  }

  /** Puts the selection into a new group at its centre. */
  function group(ids = view.selection) {
    const members = doc.objects.filter((o) => ids.includes(o.id) && !ids.includes(o.parent));
    if (!members.length) return null;
    const c = [0, 1, 2].map((i) => members.reduce((s, o) => s + o.pos[i], 0) / members.length);
    const g = sanitizeObject(createObject('group', { pos: c, parent: members[0].parent }));
    g.name = uniqueName(doc, 'Group');
    const objects = doc.objects.map((o) => (members.some((m) => m.id === o.id) ? { ...o, parent: g.id, pos: o.pos.map((v, i) => v - c[i]) } : o));
    commit({ ...doc, objects: [...objects, g] });
    setView({ selection: [g.id] });
    return g;
  }

  /** Releases a group's children (keeps their positions relative to the group origin's parent). */
  function ungroup(id) {
    const g = doc.objects.find((o) => o.id === id && o.type === 'group');
    if (!g) return;
    const objects = doc.objects
      .filter((o) => o.id !== id)
      .map((o) => (o.parent === id ? { ...o, parent: g.parent, pos: o.pos.map((v, i) => v + g.pos[i]) } : o));
    commit({ ...doc, objects });
    setView({ selection: objects.filter((o) => o.parent === g.parent && childrenOf(doc, id).some((c) => c.id === o.id)).map((o) => o.id) });
  }

  function setParent(id, parentId) {
    if (id === parentId || (parentId && subtreeIds(doc, id).includes(parentId))) return;
    commit({ ...doc, objects: doc.objects.map((o) => (o.id === id ? { ...o, parent: parentId } : o)) });
  }

  // ---------------------------------------------------------- selection
  const select = (ids, { additive = false } = {}) => {
    const next = additive ? [...new Set([...view.selection, ...ids])] : [...ids];
    setView({ selection: next });
  };
  const toggleSelect = (id) => setView({ selection: view.selection.includes(id) ? view.selection.filter((s) => s !== id) : [...view.selection, id] });
  const selectAll = () => setView({ selection: doc.objects.filter((o) => !o.locked && o.visible).map((o) => o.id) });
  const clearSelection = () => setView({ selection: [] });

  // ---------------------------------------------------------- keyframes
  function addKey(id, t = view.time, ease = 'ease') {
    const o = doc.objects.find((x) => x.id === id);
    if (!o) return;
    const keys = o.keys.filter((k) => Math.abs(k.t - t) > 1e-3);
    keys.push({ t, pos: [...o.pos], rot: [...o.rot], scale: [...o.scale], ease });
    update(id, { keys: keys.sort((a, b) => a.t - b.t) });
  }
  function removeKey(id, index) {
    const o = doc.objects.find((x) => x.id === id);
    if (o) update(id, { keys: o.keys.filter((_, i) => i !== index) });
  }
  function moveKey(id, index, t) {
    const o = doc.objects.find((x) => x.id === id);
    if (!o || !o.keys[index]) return;
    const keys = o.keys.map((k, i) => (i === index ? { ...k, t: Math.max(0, Math.min(doc.time.duration, t)) } : k));
    update(id, { keys: keys.sort((a, b) => a.t - b.t) });
  }

  // ----------------------------------------------------------- document
  const load = (next) => {
    const parsed = typeof next === 'string' ? parseDoc(next) : sanitizeDoc(next);
    if (!parsed) return false;
    undoStack.length = 0;
    redoStack.length = 0;
    doc = parsed;
    view = { ...view, selection: [], time: 0, playing: false };
    refresh();
    return true;
  };
  const reset = () => load(defaultDoc());
  /** Rebuilds the scene without an undo step (e.g. after a font finished loading). */
  const touch = () => commit({ ...doc }, { record: false });
  const save = () => serializeDoc(doc);

  return {
    subscribe, getState, setView,
    undo, redo, add, update, updateMany, updateWorld, updateTime, rename, remove, duplicate, group, ungroup, setParent,
    select, toggleSelect, selectAll, clearSelection, addKey, removeKey, moveKey, load, reset, save, touch,
    setTool: (tool) => setView({ tool }),
    setTime: (time) => setView({ time: Math.max(0, Math.min(doc.time.duration, time)) }),
    SNAP,
  };
}
