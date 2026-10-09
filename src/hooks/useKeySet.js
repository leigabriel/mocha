import * as THREE from 'three';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { downloadBlob } from '../utils/helpers.js';
import { createTagStage } from '../tagbuilder/tagStage.js';
import * as animator from '../tagbuilder/animation.js';
import { ensureFont, hasFont } from '../tagbuilder/fonts.js';
import { parseSvgShapes } from '../tagbuilder/svg.js';
import { BACKDROPS, LIGHTING, SET_LIMITS as L } from '../keyset/constants.js';
import { buildKeySet } from '../keyset/builder.js';
import {
  defaultCharm,
  defaultDesign,
  generateDesign,
  parseDesign,
  sanitizeCharm,
  sanitizeDesign,
  serializeDesign,
} from '../keyset/design.js';
import { FORMAT_INFO, exportKeySet } from '../keyset/exporters.js';

const STORE_KEY = 'mocha.keyset.v1';
const REBUILD_MS = 100;
const DEFAULT_VIEW = [-0.45, 0.08, 1];

function initialDesign() {
  try {
    return parseDesign(localStorage.getItem(STORE_KEY)) ?? defaultDesign();
  } catch {
    return defaultDesign();
  }
}

export function useKeySet(active) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const buildRef = useRef(null);
  const toastTimer = useRef(null);

  const [design, setDesign] = useState(initialDesign);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState({ text: 'READY', visible: false });
  const [busy, setBusy] = useState(false);
  const [animation, setAnimationState] = useState('off');
  const [exportAnim, setExportAnim] = useState('spin');
  const [imageScale, setImageScale] = useState(2);
  const [transparent, setTransparent] = useState(false);
  const [quality, setQuality] = useState('high');
  const [stats, setStats] = useState({ ms: 0, triangles: 0, overlap: 0 });
  const [fontTick, setFontTick] = useState(0);

  const designRef = useRef(design);
  const animationRef = useRef('off');
  const exportAnimRef = useRef('spin');
  const qualityRef = useRef('high');
  useEffect(() => {
    designRef.current = design;
    animationRef.current = animation;
    exportAnimRef.current = exportAnim;
    qualityRef.current = quality;
  });

  const selected = design.charms.find((c) => c.id === selectedId) ?? null;

  const showToast = useCallback((text) => {
    setToast({ text, visible: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 2200);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, serializeDesign(design));
      } catch {
        // storage may be unavailable
      }
    }, 400);
    return () => clearTimeout(t);
  }, [design]);

  // ----------------------------------------------------------------- stage
  useEffect(() => {
    if (!active || !containerRef.current) return undefined;
    let stage;
    try {
      stage = createTagStage(containerRef.current, {
        onPick: (id) => setSelectedId(id),
        environment: 'showcase',
        animator,
        defaultView: DEFAULT_VIEW,
        backgrounds: BACKDROPS,
        toneMapping: THREE.NeutralToneMapping,
        sceneBackground: true,
      });
    } catch (err) {
      console.error(err);
      return undefined;
    }
    stageRef.current = stage;
    stage.setBackground(designRef.current.backdrop);
    stage.setLighting(LIGHTING[designRef.current.lighting]);
    stage.setAnimation(animationRef.current === 'off' ? null : animationRef.current);
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
    stageRef.current?.setBackground(design.backdrop);
  }, [design.backdrop, active]);
  useEffect(() => {
    stageRef.current?.setLighting(LIGHTING[design.lighting]);
  }, [design.lighting, active]);

  // make sure every font in use is parsed, then rebuild
  useEffect(() => {
    const needed = new Set(design.charms.map((c) => c.font));
    let cancelled = false;
    [...needed].filter((id) => !hasFont(id)).forEach((id) => {
      ensureFont(id)
        .then(() => !cancelled && setFontTick((n) => n + 1))
        .catch((err) => console.error('font failed', id, err));
    });
    return () => {
      cancelled = true;
    };
  }, [design.charms]);

  useEffect(() => {
    if (!active) return undefined;
    const timer = setTimeout(() => {
      const stage = stageRef.current;
      if (!stage) return;
      const t0 = performance.now();
      let built;
      try {
        built = buildKeySet(design);
      } catch (err) {
        console.error(err);
        showToast('COULD NOT BUILD THE SET');
        return;
      }
      const previous = buildRef.current;
      stage.setModel(built, { view: DEFAULT_VIEW });
      previous?.dispose();
      buildRef.current = built;
      let triangles = 0;
      built.group.traverse((o) => {
        if (o.isMesh) triangles += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
      });
      setStats({ ms: Math.round(performance.now() - t0), triangles: Math.round(triangles), overlap: built.report.overlap });
    }, REBUILD_MS);
    return () => clearTimeout(timer);
  }, [design, fontTick, active, showToast]);

  // --------------------------------------------------------------- actions
  const updateGlobal = useCallback((patch) => setDesign((d) => sanitizeDesign({ ...d, ...patch })), []);
  const updateCharm = useCallback((id, patch) => {
    setDesign((d) => ({ ...d, charms: d.charms.map((c) => (c.id === id ? sanitizeCharm({ ...c, ...patch }) : c)) }));
  }, []);

  const addCharm = useCallback((style) => {
    if (designRef.current.charms.length >= L.maxCharms) {
      showToast(`MAX ${L.maxCharms} CHARMS`);
      return;
    }
    const charm = sanitizeCharm(defaultCharm({ style, title: style === 'silhouette' ? '' : 'Title', num: '' }));
    setDesign((d) => ({ ...d, charms: [...d.charms, charm] }));
    setSelectedId(charm.id);
  }, [showToast]);

  const removeCharm = useCallback((id) => {
    setDesign((d) => ({ ...d, charms: d.charms.filter((c) => c.id !== id) }));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const duplicateCharm = useCallback((id) => {
    const src = designRef.current.charms.find((c) => c.id === id);
    if (!src) return;
    if (designRef.current.charms.length >= L.maxCharms) {
      showToast(`MAX ${L.maxCharms} CHARMS`);
      return;
    }
    const copy = sanitizeCharm({ ...src, id: undefined });
    setDesign((d) => {
      const i = d.charms.findIndex((c) => c.id === id);
      const next = [...d.charms];
      next.splice(i + 1, 0, copy);
      return { ...d, charms: next };
    });
    setSelectedId(copy.id);
  }, [showToast]);

  const moveCharm = useCallback((id, dir) => {
    setDesign((d) => {
      const i = d.charms.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.charms.length) return d;
      const next = [...d.charms];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...d, charms: next };
    });
  }, []);

  const generate = useCallback(() => {
    setDesign(generateDesign(Math.floor(Math.random() * 2 ** 31)));
    setSelectedId(null);
    showToast('NEW SET GENERATED');
  }, [showToast]);

  const resetDesign = useCallback(() => {
    setDesign(defaultDesign());
    setSelectedId(null);
    showToast('REFERENCE SET RESTORED');
  }, [showToast]);

  const uploadSvg = useCallback(async (id, file) => {
    try {
      if (file.size > L.svgBytes) throw new Error('SVG is over 150 KB');
      const text = await file.text();
      if (!parseSvgShapes(text)) throw new Error('No filled shapes in that SVG');
      updateCharm(id, { style: 'silhouette', silhouette: 'upload', svg: text });
      showToast('SVG SHAPE LOADED');
    } catch (err) {
      showToast(String(err.message ?? 'BAD SVG').toUpperCase().slice(0, 40));
    }
  }, [showToast, updateCharm]);

  const setAnimation = useCallback((kind) => {
    setAnimationState(kind);
    stageRef.current?.setAnimation(kind === 'off' ? null : kind);
  }, []);
  const resetView = useCallback(() => stageRef.current?.fit(DEFAULT_VIEW), []);
  const frontView = useCallback(() => stageRef.current?.fit([0, 0.001, 1]), []);

  const renderImage = useCallback(async (format) => {
    const stage = stageRef.current;
    if (!stage) return;
    setBusy(true);
    showToast(`RENDERING ${format === 'jpeg' ? 'JPG' : 'PNG'}...`);
    try {
      await new Promise((r) => setTimeout(r, 30));
      const blob = await stage.snapshot({ scale: imageScale, transparent: format === 'png' && transparent, bgId: designRef.current.backdrop, format, quality: 0.92 });
      downloadBlob(blob, `mocha_key_set_${Date.now()}.${format === 'jpeg' ? 'jpg' : 'png'}`);
      showToast(`${format === 'jpeg' ? 'JPG' : 'PNG'} SAVED`);
    } catch (err) {
      console.error(err);
      showToast('RENDER FAILED');
    } finally {
      setBusy(false);
    }
  }, [imageScale, showToast, transparent]);

  const handleExport = useCallback(async (format) => {
    const info = FORMAT_INFO[format];
    setBusy(true);
    showToast(`PACKING ${info.label.toUpperCase()}...`);
    try {
      await new Promise((r) => setTimeout(r, 30));
      const { blob, filename } = await exportKeySet(format, designRef.current, { anim: exportAnimRef.current, blender: { quality: qualityRef.current } });
      downloadBlob(blob, filename);
      showToast(`EXPORTED ${info.label.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      showToast(`${info.label.toUpperCase()} EXPORT FAILED`);
    } finally {
      setBusy(false);
    }
  }, [showToast]);

  const api = useMemo(
    () => ({
      design, selected, selectedId, setSelectedId, toast, busy, stats, animation, exportAnim, imageScale, transparent, quality,
      setAnimation, setExportAnim, setImageScale, setTransparent, setQuality,
      updateGlobal, updateCharm, addCharm, removeCharm, duplicateCharm, moveCharm, generate, resetDesign, uploadSvg,
      resetView, frontView, renderImage, handleExport,
    }),
    [design, selected, selectedId, toast, busy, stats, animation, exportAnim, imageScale, transparent, quality, setAnimation,
      updateGlobal, updateCharm, addCharm, removeCharm, duplicateCharm, moveCharm, generate, resetDesign, uploadSvg,
      resetView, frontView, renderImage, handleExport]
  );
  return { containerRef, api };
}
