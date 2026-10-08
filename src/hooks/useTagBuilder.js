import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { downloadBlob, saveDataUrl } from '../utils/helpers.js';
import { DesignHistory } from '../utils/history.js';
import { TAG_LIMITS } from '../tagbuilder/constants.js';
import {
  defaultDesign,
  defaultTag,
  newId,
  parseTagDesign,
  readHashTagDesign,
  sanitizeTag,
  serializeTagDesign,
  tagShareUrl,
} from '../tagbuilder/design.js';
import { buildKeychain } from '../tagbuilder/builder.js';
import { createTagStage } from '../tagbuilder/tagStage.js';
import { ensureFont, hasFont, registerFont } from '../tagbuilder/fonts.js';
import { FORMAT_INFO, exportModel, meshHealth } from '../tagbuilder/exporters.js';
import { parseSvgShapes } from '../tagbuilder/svg.js';
import { PRESETS } from '../tagbuilder/presets.js';

const STORE_KEY = 'mocha.tagbuilder.v1';
const TOAST_MS = 2000;
const REBUILD_DEBOUNCE_MS = 90;

function loadStored() {
  try {
    return parseTagDesign(localStorage.getItem(STORE_KEY));
  } catch {
    return null;
  }
}

export function useTagBuilder(active) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const buildRef = useRef(null);
  const historyRef = useRef(new DesignHistory());
  const toastTimer = useRef(null);
  const commitTimer = useRef(null);
  const [design, setDesignState] = useState(() => readHashTagDesign() ?? loadStored() ?? defaultDesign());
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState({ text: 'READY', visible: false });
  const [fontTick, setFontTick] = useState(0);
  const [stats, setStats] = useState({ overlap: 0, triangles: 0, health: null, ms: 0, sizeMm: { w: 0, h: 0, d: 0 } });
  const [busy, setBusy] = useState(false);
  const [historyFlags, setHistoryFlags] = useState({ canUndo: false, canRedo: false });

  const designRef = useRef(design);
  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    designRef.current = design;
    selectedIdRef.current = selectedId;
  });
  const selected = design.tags.find((t) => t.id === selectedId) ?? null;

  const showToast = useCallback((text) => {
    setToast({ text, visible: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((p) => ({ ...p, visible: false })), TOAST_MS);
  }, []);

  // ------------------------------------------------------------- history

  const flags = useCallback(() => {
    const h = historyRef.current;
    setHistoryFlags({ canUndo: h.canUndo, canRedo: h.canRedo });
  }, []);

  const persist = useCallback((d) => {
    const text = serializeTagDesign(d);
    historyRef.current.push(text);
    try {
      localStorage.setItem(STORE_KEY, text);
    } catch {
      // storage can be unavailable
    }
    flags();
  }, [flags]);

  useEffect(() => {
    historyRef.current.push(serializeTagDesign(designRef.current));
    flags();
  }, [flags]);

  // debounce history commits so a slider drag is one undo step
  useEffect(() => {
    clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => persist(design), 450);
    return () => clearTimeout(commitTimer.current);
  }, [design, persist]);

  const setDesign = useCallback((updater) => {
    setDesignState((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const applySerialized = useCallback((text) => {
    const next = parseTagDesign(text);
    if (!next) return;
    setDesignState(next);
    try {
      localStorage.setItem(STORE_KEY, text);
    } catch {
      // ignore
    }
  }, []);

  const undo = useCallback(() => {
    clearTimeout(commitTimer.current);
    const h = historyRef.current;
    h.push(serializeTagDesign(designRef.current)); // flush a pending edit first
    const text = h.undo();
    if (text) applySerialized(text);
    flags();
  }, [applySerialized, flags]);

  const redo = useCallback(() => {
    const text = historyRef.current.redo();
    if (text) applySerialized(text);
    flags();
  }, [applySerialized, flags]);

  // ----------------------------------------------------------------- stage

  useEffect(() => {
    if (!active || !containerRef.current) return undefined;
    let stage;
    try {
      stage = createTagStage(containerRef.current, {
        onPick: (id) => setSelectedId(id),
      });
    } catch (err) {
      console.error(err);
      return undefined;
    }
    stageRef.current = stage;
    stage.setBackground(designRef.current.bg);
    stage.setSelected(selectedIdRef.current);
    return () => {
      stage.dispose();
      stageRef.current = null;
      buildRef.current?.dispose();
      buildRef.current = null;
    };
  }, [active]);

  useEffect(() => {
    stageRef.current?.setSelected(selectedId);
  }, [selectedId]);

  useEffect(() => {
    stageRef.current?.setBackground(design.bg);
  }, [design.bg, active]);

  // make sure every font in use is parsed, then rebuild
  useEffect(() => {
    const needed = new Set(design.tags.map((t) => t.font));
    let cancelled = false;
    [...needed].filter((id) => !hasFont(id)).forEach((id) => {
      ensureFont(id)
        .then(() => !cancelled && setFontTick((n) => n + 1))
        .catch((err) => console.error('font failed', id, err));
    });
    return () => {
      cancelled = true;
    };
  }, [design.tags]);

  // rebuild the model whenever the design (or a font) changes
  useEffect(() => {
    if (!active) return undefined;
    const timer = setTimeout(() => {
      const stage = stageRef.current;
      if (!stage) return;
      const t0 = performance.now();
      const built = buildKeychain(design);
      const previous = buildRef.current;
      stage.setModel(built);
      previous?.dispose();
      buildRef.current = built;
      let triangles = 0;
      built.group.traverse((o) => {
        if (o.isMesh) triangles += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
      });
      const size = built.bounds.getSize(built.bounds.min.clone());
      setStats((s) => ({
        ...s,
        overlap: built.report.overlap,
        triangles: Math.round(triangles),
        ms: Math.round(performance.now() - t0),
        sizeMm: { w: Math.round(size.x), h: Math.round(size.y), d: Math.round(size.z) },
        health: null,
      }));
    }, REBUILD_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [design, fontTick, active]);

  // --------------------------------------------------------------- actions

  const updateTag = useCallback((id, patch) => {
    setDesign((d) => ({
      ...d,
      tags: d.tags.map((t) => (t.id === id ? sanitizeTag({ ...t, ...patch }) : t)),
    }));
  }, [setDesign]);

  const updateGlobal = useCallback((patch) => setDesign((d) => ({ ...d, ...patch })), [setDesign]);

  const addTag = useCallback((overrides = {}) => {
    if (designRef.current.tags.length >= TAG_LIMITS.maxTags) {
      showToast(`MAX ${TAG_LIMITS.maxTags} TAGS`);
      return;
    }
    const tag = defaultTag({ id: newId(), ...overrides });
    setDesign((d) => ({ ...d, tags: [...d.tags, sanitizeTag(tag)] }));
    setSelectedId(tag.id);
  }, [setDesign, showToast]);

  const duplicateTag = useCallback((id) => {
    const src = designRef.current.tags.find((t) => t.id === id);
    if (!src) return;
    if (designRef.current.tags.length >= TAG_LIMITS.maxTags) {
      showToast(`MAX ${TAG_LIMITS.maxTags} TAGS`);
      return;
    }
    const copy = { ...src, id: newId() };
    setDesign((d) => {
      const i = d.tags.findIndex((t) => t.id === id);
      const tags = [...d.tags];
      tags.splice(i + 1, 0, copy);
      return { ...d, tags };
    });
    setSelectedId(copy.id);
  }, [setDesign, showToast]);

  const removeTag = useCallback((id) => {
    if (designRef.current.tags.length <= 1) {
      showToast('MINIMUM 1 TAG');
      return;
    }
    setDesign((d) => ({ ...d, tags: d.tags.filter((t) => t.id !== id) }));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, [setDesign, showToast]);

  const moveTag = useCallback((id, dir) => {
    setDesign((d) => {
      const i = d.tags.findIndex((t) => t.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.tags.length) return d;
      const tags = [...d.tags];
      [tags[i], tags[j]] = [tags[j], tags[i]];
      return { ...d, tags };
    });
  }, [setDesign]);

  const loadPreset = useCallback((id) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setDesign(preset.build());
    setSelectedId(null);
    showToast(`LOADED PRESET: ${preset.label.toUpperCase()}`);
  }, [setDesign, showToast]);

  const uploadFont = useCallback(async (file, tagId) => {
    try {
      if (file.size > 3_000_000) throw new Error('Font file is over 3 MB');
      const id = `custom-${newId().slice(-8)}`;
      registerFont(id, await file.arrayBuffer(), file.name);
      updateTag(tagId, { font: id });
      showToast(`FONT LOADED: ${file.name.slice(0, 24).toUpperCase()}`);
    } catch (err) {
      showToast('FONT NOT SUPPORTED (USE TTF, OTF OR WOFF)');
      console.error(err);
    }
  }, [showToast, updateTag]);

  const uploadSvg = useCallback(async (file, tagId) => {
    try {
      if (file.size > TAG_LIMITS.svgBytes) throw new Error('SVG is over 150 KB');
      const text = await file.text();
      if (!parseSvgShapes(text)) throw new Error('No filled shapes found');
      updateTag(tagId, { svg: text });
      showToast('LOGO LOADED');
    } catch (err) {
      showToast(String(err.message ?? 'BAD SVG').toUpperCase().slice(0, 40));
    }
  }, [showToast, updateTag]);

  const handleExport = useCallback(async (format) => {
    const info = FORMAT_INFO[format];
    setBusy(true);
    showToast(`PACKING ${info.label.toUpperCase()}...`);
    try {
      await new Promise((r) => setTimeout(r, 30)); // let the toast paint first
      const { blob, filename } = await exportModel(format, designRef.current);
      downloadBlob(blob, filename);
      showToast(`EXPORTED ${info.label.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      showToast(`${info.label.toUpperCase()} EXPORT FAILED`);
    } finally {
      setBusy(false);
    }
  }, [showToast]);

  const renderImage = useCallback(async ({ transparent = false, scale = 3 } = {}) => {
    const stage = stageRef.current;
    if (!stage) return;
    setBusy(true);
    showToast('RENDERING IMAGE...');
    try {
      await new Promise((r) => setTimeout(r, 30));
      const blob = await stage.snapshot({ scale, transparent, bgId: designRef.current.bg });
      downloadBlob(blob, `mocha_tag_keychain_${Date.now()}.png`);
      showToast('IMAGE SAVED');
    } catch (err) {
      console.error(err);
      showToast('RENDER FAILED');
    } finally {
      setBusy(false);
    }
  }, [showToast]);

  const checkPrintability = useCallback(() => {
    if (!buildRef.current) return;
    const health = meshHealth(buildRef.current.group);
    setStats((s) => ({ ...s, health }));
  }, []);

  const copyShareLink = useCallback(async () => {
    const url = tagShareUrl(designRef.current);
    try {
      window.history.replaceState(null, '', new URL(url).hash);
    } catch {
      // history can be unavailable in sandboxed frames
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('LINK COPIED');
    } catch {
      showToast('LINK IN ADDRESS BAR');
    }
  }, [showToast]);

  const resetView = useCallback(() => stageRef.current?.fit([-0.7, 0.1, 0.7]), []);

  const savePng = useCallback((dataUrl) => saveDataUrl(dataUrl, 'mocha_tag.png'), []);

  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, undo, redo]);

  const api = useMemo(
    () => ({
      design, selected, selectedId, setSelectedId, toast, stats, busy, historyFlags,
      updateTag, updateGlobal, addTag, duplicateTag, removeTag, moveTag, loadPreset,
      uploadFont, uploadSvg, handleExport, renderImage, checkPrintability, copyShareLink,
      resetView, savePng, undo, redo,
    }),
    [design, selected, selectedId, toast, stats, busy, historyFlags, updateTag, updateGlobal, addTag,
      duplicateTag, removeTag, moveTag, loadPreset, uploadFont, uploadSvg, handleExport, renderImage,
      checkPrintability, copyShareLink, resetView, savePng, undo, redo]
  );
  return { containerRef, api };
}
