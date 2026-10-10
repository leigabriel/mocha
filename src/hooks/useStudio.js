import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { downloadBlob } from '../utils/helpers.js';
import { ensureFont, hasFont } from '../tagbuilder/fonts.js';
import { parseSvgShapes } from '../tagbuilder/svg.js';
import { LIMITS, PRIMITIVES } from '../studio/constants.js';
import { parseDoc } from '../studio/doc.js';
import { FORMAT_INFO, exportStudio } from '../studio/exporters.js';
import { createStudioStore } from '../studio/store.js';
import { TEMPLATES } from '../studio/templates.js';
import { createStudioViewport } from '../studio/viewport.js';

const STORE_KEY = 'mocha.studio.v1';

function loadInitial() {
  try {
    const saved = parseDoc(localStorage.getItem(STORE_KEY));
    if (saved && saved.objects.length) return { doc: saved, fresh: false };
  } catch {
    // storage may be unavailable
  }
  return { doc: TEMPLATES.find((t) => t.id === 'starter').build(), fresh: true };
}

const isTyping = (e) => {
  const t = e.target;
  return t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
};

export function useStudio() {
  const containerRef = useRef(null);
  const viewportRef = useRef(null);
  const toastTimer = useRef(null);
  const [init] = useState(loadInitial);
  const [store] = useState(() => createStudioStore(init.doc));
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const [toast, setToast] = useState({ text: 'READY', visible: false });
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(init.fresh ? 'templates' : null);
  const [addMenu, setAddMenu] = useState(false);
  const [imageScale, setImageScale] = useState(2);
  const [transparent, setTransparent] = useState(false);
  const [quality, setQuality] = useState('high');

  const showToast = useCallback((text) => {
    setToast({ text, visible: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 2200);
  }, []);

  // viewport lifecycle
  useEffect(() => {
    if (!containerRef.current) return undefined;
    let vp;
    try {
      vp = createStudioViewport(containerRef.current, store);
    } catch (err) {
      console.error(err);
      setTimeout(() => showToast('3D VIEW NOT AVAILABLE'), 0);
      return undefined;
    }
    viewportRef.current = vp;
    setTimeout(() => vp.frame([]), 60);
    return () => {
      vp.dispose();
      viewportRef.current = null;
    };
  }, [store, showToast]);

  // autosave
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, store.save());
      } catch {
        // ignore
      }
    }, 500);
    return () => clearTimeout(t);
  }, [state.doc, store]);

  // fonts used by text objects
  useEffect(() => {
    const needed = new Set(state.doc.objects.filter((o) => o.type === 'text').map((o) => o.params.font));
    needed.add('inter');
    let cancelled = false;
    [...needed].filter((id) => !hasFont(id)).forEach((id) => {
      ensureFont(id).then(() => !cancelled && store.touch()).catch((err) => console.error('font failed', id, err));
    });
    return () => {
      cancelled = true;
    };
  }, [state.doc.objects, store]);

  const frame = useCallback(() => viewportRef.current?.frame(), []);
  const setView = useCallback((dir) => viewportRef.current?.setView(dir), []);

  const addObject = useCallback((type) => {
    const o = store.add(type);
    if (!o) showToast(`MAX ${LIMITS.maxObjects} OBJECTS`);
    setAddMenu(false);
    return o;
  }, [store, showToast]);

  const exportAs = useCallback(async (format) => {
    const info = FORMAT_INFO[format];
    setBusy(true);
    showToast(`PACKING ${info.label.toUpperCase()}...`);
    try {
      await new Promise((r) => setTimeout(r, 30));
      const { blob, filename } = await exportStudio(format, store.getState().doc, { quality });
      downloadBlob(blob, filename);
      showToast(`EXPORTED ${info.label.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      showToast(`${info.label.toUpperCase()} EXPORT FAILED`);
    } finally {
      setBusy(false);
    }
  }, [store, showToast, quality]);

  const renderImage = useCallback(async (format, sceneCamera = false) => {
    const vp = viewportRef.current;
    if (!vp) return;
    setBusy(true);
    showToast(`RENDERING ${format === 'jpeg' ? 'JPG' : 'PNG'}...`);
    try {
      await new Promise((r) => setTimeout(r, 30));
      const blob = await vp.snapshot({ scale: imageScale, transparent: format === 'png' && transparent, format, sceneCamera });
      downloadBlob(blob, `${store.getState().doc.name.toLowerCase().replace(/\W+/g, '_')}_${Date.now()}.${format === 'jpeg' ? 'jpg' : 'png'}`);
      showToast(`${format === 'jpeg' ? 'JPG' : 'PNG'} SAVED`);
    } catch (err) {
      console.error(err);
      showToast('RENDER FAILED');
    } finally {
      setBusy(false);
    }
  }, [imageScale, showToast, store, transparent]);

  const openProject = useCallback(async (file) => {
    try {
      const text = await file.text();
      if (!store.load(text)) throw new Error('Not a Mocha project');
      showToast('PROJECT OPENED');
      setTimeout(() => viewportRef.current?.frame([]), 60);
    } catch (err) {
      showToast(String(err.message ?? 'COULD NOT OPEN').toUpperCase().slice(0, 40));
    }
  }, [store, showToast]);

  const useTemplate = useCallback((id) => {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    store.load(t.build());
    setDialog(null);
    setTimeout(() => viewportRef.current?.frame([]), 60);
  }, [store]);

  const uploadSvg = useCallback(async (file, replaceId = null) => {
    try {
      if (file.size > LIMITS.svgBytes) throw new Error('SVG is over 150 KB');
      const text = await file.text();
      if (!parseSvgShapes(text)) throw new Error('No filled shapes in that SVG');
      if (replaceId) {
        const cur = store.getState().doc.objects.find((o) => o.id === replaceId);
        if (cur) store.update(replaceId, { params: { ...cur.params, svg: text } });
        showToast('SVG REPLACED');
        return;
      }
      const o = store.add('svg', { name: file.name.replace(/\.svg$/i, '').slice(0, 30), params: { ...PRIMITIVES.find((p) => p.id === 'svg').params, svg: text } });
      if (o) showToast('SVG ADDED');
    } catch (err) {
      showToast(String(err.message ?? 'BAD SVG').toUpperCase().slice(0, 40));
    }
  }, [store, showToast]);

  // keyboard shortcuts (Blender-like)
  useEffect(() => {
    const onKey = (e) => {
      if (isTyping(e) || dialog) return;
      const s = store.getState();
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) store.redo(); else store.undo(); return; }
      if (mod && k === 'y') { e.preventDefault(); store.redo(); return; }
      if (mod && k === 's') { e.preventDefault(); exportAs('json'); return; }
      if (mod && k === 'g') { e.preventDefault(); if (e.shiftKey) s.selection.forEach((id) => store.ungroup(id)); else store.group(); return; }
      if (mod && k === 'a') { e.preventDefault(); store.selectAll(); return; }
      if (mod) return;
      if (e.shiftKey && k === 'a') { e.preventDefault(); setAddMenu((v) => !v); return; }
      if (e.shiftKey && k === 'd') { e.preventDefault(); store.duplicate(); return; }
      if (k === 'q') store.setTool('select');
      else if (k === 'g') store.setTool('move');
      else if (k === 'r') store.setTool('rotate');
      else if (k === 's') store.setTool('scale');
      else if (k === 'delete' || k === 'x' || k === 'backspace') { e.preventDefault(); store.remove(); }
      else if (k === 'f') frame();
      else if (k === 'a' && e.altKey) store.clearSelection();
      else if (k === 'h') {
        const ids = s.selection;
        store.updateMany(ids.map((id) => ({ id, visible: false })));
      } else if (k === 'i') s.selection.forEach((id) => store.addKey(id));
      else if (k === ' ') { e.preventDefault(); store.setView({ playing: !s.playing }); }
      else if (k === 'escape') { store.clearSelection(); setAddMenu(false); }
      else if (k === '1') setView('front');
      else if (k === '3') setView('right');
      else if (k === '7') setView('top');
      else if (k === '0') setView('iso');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store, dialog, exportAs, frame, setView]);

  const api = useMemo(() => ({
    store, state, toast, busy, dialog, setDialog, addMenu, setAddMenu, imageScale, setImageScale, transparent, setTransparent,
    quality, setQuality, frame, setView, addObject, exportAs, renderImage, openProject, useTemplate, uploadSvg, showToast,
  }), [state, toast, busy, dialog, addMenu, imageScale, transparent, quality, store, frame, setView, addObject, exportAs, renderImage, openProject, useTemplate, uploadSvg, showToast]);
  return [containerRef, api];
}
