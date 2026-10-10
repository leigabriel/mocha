import { clamp } from '../utils/helpers.js';
import {
  BACKGROUNDS,
  EASINGS,
  LIGHT_IDS,
  LIGHTS,
  LIMITS,
  MATERIAL_PRESET_IDS,
  PRIMITIVE_IDS,
  primitiveInfo,
} from './constants.js';

const VERSION = 1;
const HEX = /^#[0-9a-f]{6}$/i;
let uid = 0;
export const newId = () => `o${Date.now().toString(36)}${(uid++).toString(36)}`;

const num = (v, lo, hi, fb) => (Number.isFinite(Number(v)) ? clamp(Number(v), lo, hi) : fb);
const hex = (v, fb) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fb);
const vec = (v, fb, lo = -1000, hi = 1000) => (Array.isArray(v) && v.length === 3 ? v.map((x, i) => num(x, lo, hi, fb[i])) : [...fb]);

export const typeOf = (o) => (o.type.startsWith('light:') ? 'light' : o.type === 'camera' ? 'camera' : o.type === 'group' ? 'group' : 'mesh');
export const lightKind = (o) => o.type.slice(6);

export function defaultMaterial(over = {}) {
  return { preset: 'plastic', color: '#e9eaee', roughness: 0.35, metalness: 0, opacity: 1, emissive: '#000000', emissiveIntensity: 1, ...over };
}

/** Creates one scene object of `type` with sensible defaults. */
export function createObject(type, over = {}) {
  const isLight = type.startsWith('light:');
  const prim = primitiveInfo(type);
  const lightInfo = isLight ? LIGHTS.find((l) => l.id === type.slice(6)) : null;
  const label = prim?.label ?? lightInfo?.label ?? (type === 'camera' ? 'Camera' : 'Group');
  return {
    id: newId(),
    name: label,
    type,
    parent: null,
    visible: true,
    locked: false,
    pos: [0, isLight ? 4 : type === 'camera' ? 2.5 : prim ? 0.5 : 0, type === 'camera' ? 7 : 0],
    rot: type === 'light:sun' ? [-50, 30, 0] : type === 'light:spot' ? [-90, 0, 0] : [0, 0, 0],
    scale: [1, 1, 1],
    params: prim ? { ...prim.params } : {},
    material: defaultMaterial(),
    light: isLight ? { color: '#ffffff', intensity: lightInfo.intensity, angle: 40, castShadow: true } : null,
    mods: [],
    keys: [],
    ...over,
  };
}

function sanitizeParams(type, raw) {
  const base = primitiveInfo(type)?.params;
  if (!base) return {};
  const out = {};
  const r = raw ?? {};
  for (const [k, v] of Object.entries(base)) {
    if (typeof v === 'number') out[k] = num(r[k], 0, 200, v);
    else if (typeof v === 'string') out[k] = typeof r[k] === 'string' ? r[k].slice(0, k === 'svg' ? LIMITS.svgBytes : 120) : v;
  }
  if (out.seg !== undefined) out.seg = Math.round(clamp(out.seg, 3, 128));
  if (out.detail !== undefined) out.detail = Math.round(clamp(out.detail, 0, 4));
  if (out.points !== undefined) out.points = Math.round(clamp(out.points, 3, 24));
  return out;
}

export function sanitizeObject(raw) {
  const type = OBJECT_OK(raw?.type) ? raw.type : 'box';
  const o = createObject(type, { id: typeof raw?.id === 'string' && raw.id ? raw.id.slice(0, 40) : newId() });
  const r = raw ?? {};
  const m = r.material ?? {};
  const keys = Array.isArray(r.keys)
    ? r.keys.slice(0, LIMITS.maxKeys).map((k) => ({
        t: num(k?.t, 0, 600, 0),
        pos: vec(k?.pos, o.pos),
        rot: vec(k?.rot, o.rot, -3600, 3600),
        scale: vec(k?.scale, o.scale, -1000, 1000),
        ease: EASINGS.includes(k?.ease) ? k.ease : 'ease',
      })).sort((a, b) => a.t - b.t)
    : [];
  return {
    ...o,
    name: typeof r.name === 'string' && r.name.trim() ? r.name.slice(0, LIMITS.nameLength) : o.name,
    parent: typeof r.parent === 'string' ? r.parent : null,
    visible: r.visible !== false,
    locked: r.locked === true,
    pos: vec(r.pos, o.pos),
    rot: vec(r.rot, o.rot, -3600, 3600),
    scale: vec(r.scale, o.scale, -1000, 1000),
    params: sanitizeParams(type, r.params),
    material: {
      preset: MATERIAL_PRESET_IDS.includes(m.preset) ? m.preset : o.material.preset,
      color: hex(m.color, o.material.color),
      roughness: num(m.roughness, 0, 1, o.material.roughness),
      metalness: num(m.metalness, 0, 1, o.material.metalness),
      opacity: num(m.opacity, 0, 1, 1),
      emissive: hex(m.emissive, o.material.emissive),
      emissiveIntensity: num(m.emissiveIntensity, 0, 20, 1),
    },
    light: typeOf(o) === 'light'
      ? {
          color: hex(r.light?.color, '#ffffff'),
          intensity: num(r.light?.intensity, 0, 5000, o.light.intensity),
          angle: num(r.light?.angle, 5, 90, 40),
          castShadow: r.light?.castShadow !== false,
        }
      : null,
    mods: Array.isArray(r.mods)
      ? r.mods.slice(0, 4).map((md) => (md?.type === 'mirror'
          ? { type: 'mirror', axis: ['x', 'y', 'z'].includes(md.axis) ? md.axis : 'x' }
          : { type: 'array', count: Math.round(num(md?.count, 1, LIMITS.maxArray, 3)), offset: vec(md?.offset, [1.2, 0, 0], -50, 50) }))
      : [],
    keys,
  };
}

function OBJECT_OK(t) {
  return typeof t === 'string' && (PRIMITIVE_IDS.includes(t) || t === 'camera' || t === 'group' || (t.startsWith('light:') && LIGHT_IDS.includes(t.slice(6))));
}

export function defaultDoc() {
  return {
    v: VERSION,
    name: 'Untitled',
    world: { bg: 'dark', env: 1, grid: true, shadows: true, ambient: 0.35 },
    time: { duration: 4, loop: true },
    objects: [],
  };
}

export function sanitizeDoc(raw) {
  const d = defaultDoc();
  const r = raw ?? {};
  const objects = Array.isArray(r.objects) ? r.objects.slice(0, LIMITS.maxObjects).map(sanitizeObject) : [];
  const ids = new Set(objects.map((o) => o.id));
  // drop dangling or cyclic parents
  for (const o of objects) if (o.parent && (!ids.has(o.parent) || o.parent === o.id)) o.parent = null;
  for (const o of objects) {
    let p = o.parent;
    for (let i = 0; p && i < 64; i++) p = objects.find((x) => x.id === p)?.parent ?? null;
    if (p) o.parent = null;
  }
  const w = r.world ?? {};
  return {
    v: VERSION,
    name: typeof r.name === 'string' && r.name.trim() ? r.name.slice(0, 60) : d.name,
    world: {
      bg: BACKGROUNDS[w.bg] ? w.bg : d.world.bg,
      env: num(w.env, 0, 4, d.world.env),
      grid: w.grid !== false,
      shadows: w.shadows !== false,
      ambient: num(w.ambient, 0, 3, d.world.ambient),
    },
    time: { duration: num(r.time?.duration, 0.5, 120, d.time.duration), loop: r.time?.loop !== false },
    objects,
  };
}

export const serializeDoc = (d) => JSON.stringify(d);
export function parseDoc(text) {
  if (typeof text !== 'string' || !text) return null;
  try {
    return sanitizeDoc(JSON.parse(text));
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------- queries

export const childrenOf = (doc, id) => doc.objects.filter((o) => o.parent === id);
export const byId = (doc, id) => doc.objects.find((o) => o.id === id) ?? null;

/** Ids of `id` and all its descendants. */
export function subtreeIds(doc, id) {
  const out = [id];
  for (let i = 0; i < out.length; i++) for (const c of childrenOf(doc, out[i])) out.push(c.id);
  return out;
}

/** Unique "Name.001" style name. */
export function uniqueName(doc, base) {
  const names = new Set(doc.objects.map((o) => o.name));
  if (!names.has(base)) return base;
  const stem = base.replace(/\.\d{3}$/, '');
  for (let i = 1; i < 1000; i++) {
    const n = `${stem}.${String(i).padStart(3, '0')}`;
    if (!names.has(n)) return n;
  }
  return `${stem}.${Date.now()}`;
}
