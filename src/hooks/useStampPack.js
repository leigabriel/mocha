import * as THREE from 'three';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { downloadBlob } from '../utils/helpers.js';
import { createTagStage } from '../tagbuilder/tagStage.js';
import * as packAnimator from '../stamppack/animation.js';
import { BACKDROPS, PACK_LIMITS as L } from '../stamppack/constants.js';
import { buildPack } from '../stamppack/builder.js';
import {
  defaultDesign,
  defaultStamp,
  newId,
  parseSettings,
  sanitizeCard,
  sanitizeDesign,
  sanitizeStamp,
  scatter,
  serializeSettings,
} from '../stamppack/design.js';
import { FORMAT_INFO, exportPackModel } from '../stamppack/exporters.js';
import { isImageFile, loadImageFile, sampleImages } from '../stamppack/images.js';

const STORE_KEY = 'mocha.stamppack.v1';
const REBUILD_MS = 90;
const DEFAULT_VIEW = [0.2, 0.12, 1];

const SAMPLE_PLAN = [
  { shape: 'landscape', caption: 'MADE IN', look: 'original' },
  { shape: 'portrait', caption: 'RUN YOUR WAY', look: 'original' },
  { shape: 'circle', caption: 'EST. 1906 · MOCHA', look: 'original' },
  { shape: 'wedge', caption: '', look: 'original' },
  { shape: 'square', caption: 'CLUB', look: 'halftone' },
];

function shapeFor(img) {
  const ar = img.w / img.h;
  if (ar > 1.25) return 'landscape';
  if (ar < 0.8) return 'portrait';
  return 'square';
}

function initialState() {
  let saved;
  try {
    saved = parseSettings(localStorage.getItem(STORE_KEY));
  } catch {
    saved = null;
  }
  const base = saved ?? defaultDesign();
  const images = typeof document !== 'undefined' ? sampleImages() : [];
  const stamps = scatter(
    images.map((img, i) => defaultStamp({ imageId: img.id, ...SAMPLE_PLAN[i % SAMPLE_PLAN.length] })),
    base.seed
  );
  return { design: sanitizeDesign({ ...base, stamps }), images };
}

export function useStampPack(active) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const buildRef = useRef(null);
  const toastTimer = useRef(null);

  const [{ design, images }, setState] = useState(initialState);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState({ text: 'READY', visible: false });
  const [busy, setBusy] = useState(false);
  const [animation, setAnimationState] = useState('off');
  const [exportAnim, setExportAnim] = useState('spin');
  const [imageScale, setImageScale] = useState(2);
  const [transparent, setTransparent] = useState(false);
  const [stats, setStats] = useState({ ms: 0, triangles: 0, stamps: 0 });

  const designRef = useRef(design);
  const imagesRef = useRef(images);
  const animationRef = useRef('off');
  const exportAnimRef = useRef('spin');
  useEffect(() => {
    designRef.current = design;
    imagesRef.current = images;
    animationRef.current = animation;
    exportAnimRef.current = exportAnim;
  });

  const imageMap = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const selected = design.stamps.find((s) => s.id === selectedId) ?? null;

  const showToast = useCallback((text) => {
    setToast({ text, visible: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 2200);
  }, []);

  const setDesign = useCallback((fn) => {
    setState((s) => ({ ...s, design: typeof fn === 'function' ? fn(s.design) : fn }));
  }, []);

  // save the look-and-feel (never the pictures)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, serializeSettings(design));
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
        animator: packAnimator,
        defaultView: DEFAULT_VIEW,
        backgrounds: BACKDROPS,
        toneMapping: THREE.NeutralToneMapping,
      });
    } catch (err) {
      console.error(err);
      return undefined;
    }
    stageRef.current = stage;
    stage.setBackground(designRef.current.backdrop);
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
    if (!active) return undefined;
    const timer = setTimeout(() => {
      const stage = stageRef.current;
      if (!stage) return;
      const t0 = performance.now();
      let built;
      try {
        built = buildPack(design, imageMap);
      } catch (err) {
        console.error(err);
        showToast('COULD NOT BUILD THE PACK');
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
      setStats({ ms: Math.round(performance.now() - t0), triangles: Math.round(triangles), stamps: built.report.stamps });
    }, REBUILD_MS);
    return () => clearTimeout(timer);
  }, [design, imageMap, active, showToast]);

  // --------------------------------------------------------------- actions
  const placeNew = useCallback((stamps, stamp, seed) => {
    const all = scatter([...stamps, stamp], seed + stamps.length);
    return [...stamps, { ...stamp, x: all[all.length - 1].x, y: all[all.length - 1].y, rot: all[all.length - 1].rot, scale: all[all.length - 1].scale }];
  }, []);

  const addFiles = useCallback(async (fileList) => {
    const files = [...fileList].filter(Boolean);
    if (!files.length) return;
    const loaded = [];
    let skipped = 0;
    for (const file of files) {
      try {
        if (!isImageFile(file)) throw new Error('Not an image');
        loaded.push(await loadImageFile(file));
      } catch (err) {
        skipped++;
        console.error(file.name, err);
        showToast(String(err.message ?? 'Could not read the image').toUpperCase().slice(0, 44));
      }
    }
    if (!loaded.length) return;
    const room = L.maxStamps - designRef.current.stamps.length;
    const use = loaded.slice(0, Math.max(0, room)).map((img) => ({ img, id: newId() }));
    setState((s) => {
      let stamps = s.design.stamps;
      use.forEach(({ img, id }) => {
        stamps = placeNew(stamps, sanitizeStamp(defaultStamp({ id, imageId: img.id, shape: shapeFor(img) })), s.design.seed);
      });
      return { images: [...s.images, ...loaded], design: { ...s.design, stamps } };
    });
    if (use.length) setSelectedId(use[use.length - 1].id);
    if (loaded.length > use.length) showToast(`MAX ${L.maxStamps} STAMPS`);
    else if (!skipped) showToast(`ADDED ${use.length} STAMP${use.length === 1 ? '' : 'S'}`);
  }, [placeNew, showToast]);

  const updateStamp = useCallback((id, patch) => {
    setDesign((d) => ({ ...d, stamps: d.stamps.map((s) => (s.id === id ? sanitizeStamp({ ...s, ...patch }) : s)) }));
  }, [setDesign]);

  const updateCard = useCallback((patch) => setDesign((d) => ({ ...d, card: sanitizeCard({ ...d.card, ...patch }) })), [setDesign]);
  const updateGlobal = useCallback((patch) => setDesign((d) => sanitizeDesign({ ...d, ...patch })), [setDesign]);

  const removeStamp = useCallback((id) => {
    setDesign((d) => ({ ...d, stamps: d.stamps.filter((s) => s.id !== id) }));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, [setDesign]);

  const duplicateStamp = useCallback((id) => {
    if (designRef.current.stamps.length >= L.maxStamps) {
      showToast(`MAX ${L.maxStamps} STAMPS`);
      return;
    }
    const copy = { id: newId() };
    setDesign((d) => {
      const src = d.stamps.find((s) => s.id === id);
      if (!src) return d;
      return { ...d, stamps: [...d.stamps, sanitizeStamp({ ...src, ...copy, x: src.x + 6, y: src.y - 6, rot: src.rot + 8 })] };
    });
    setSelectedId(copy.id);
  }, [setDesign, showToast]);

  const reorder = useCallback((id, where) => {
    setDesign((d) => {
      const i = d.stamps.findIndex((s) => s.id === id);
      if (i < 0) return d;
      const stamps = [...d.stamps];
      const [it] = stamps.splice(i, 1);
      const j = where === 'front' ? stamps.length : where === 'back' ? 0 : Math.max(0, Math.min(stamps.length, i + where));
      stamps.splice(j, 0, it);
      return { ...d, stamps };
    });
  }, [setDesign]);

  const replaceImage = useCallback(async (file, stampId) => {
    try {
      const img = await loadImageFile(file);
      setState((s) => ({
        images: [...s.images, img],
        design: { ...s.design, stamps: s.design.stamps.map((st) => (st.id === stampId ? { ...st, imageId: img.id } : st)) },
      }));
      showToast('PICTURE REPLACED');
    } catch (err) {
      showToast(String(err.message ?? 'Could not read the image').toUpperCase().slice(0, 44));
    }
  }, [showToast]);

  const setCardImage = useCallback(async (kind, file) => {
    try {
      if (!file) {
        updateCard({ [kind === 'logo' ? 'logoId' : 'iconId']: '' });
        return;
      }
      const img = await loadImageFile(file);
      setState((s) => ({ images: [...s.images, img], design: { ...s.design, card: { ...s.design.card, [kind === 'logo' ? 'logoId' : 'iconId']: img.id } } }));
      showToast(kind === 'logo' ? 'LOGO ADDED' : 'ICON ADDED');
    } catch (err) {
      showToast(String(err.message ?? 'Could not read the image').toUpperCase().slice(0, 44));
    }
  }, [showToast, updateCard]);

  const shuffle = useCallback(() => {
    setDesign((d) => {
      const seed = 1 + Math.floor(Math.random() * 999998);
      return { ...d, seed, stamps: scatter(d.stamps, seed) };
    });
  }, [setDesign]);

  const loadSamples = useCallback(() => {
    const fresh = sampleImages();
    setState((s) => {
      const stamps = scatter(fresh.map((img, i) => defaultStamp({ imageId: img.id, ...SAMPLE_PLAN[i % SAMPLE_PLAN.length] })), s.design.seed);
      return { images: fresh, design: sanitizeDesign({ ...s.design, card: { ...s.design.card, logoId: '', iconId: '' }, stamps }) };
    });
    setSelectedId(null);
    showToast('SAMPLE STAMPS LOADED');
  }, [showToast]);

  const clearStamps = useCallback(() => {
    setDesign((d) => ({ ...d, stamps: [] }));
    setSelectedId(null);
  }, [setDesign]);

  const setAnimation = useCallback((kind) => {
    setAnimationState(kind);
    stageRef.current?.setAnimation(kind === 'off' ? null : kind);
  }, []);

  const resetView = useCallback(() => stageRef.current?.fit(DEFAULT_VIEW), []);
  const topView = useCallback(() => stageRef.current?.fit([0, 0.001, 1]), []);

  const renderImage = useCallback(async (format) => {
    const stage = stageRef.current;
    if (!stage) return;
    setBusy(true);
    showToast(`RENDERING ${format === 'jpeg' ? 'JPG' : 'PNG'}...`);
    try {
      await new Promise((r) => setTimeout(r, 30));
      const blob = await stage.snapshot({
        scale: imageScale,
        transparent: format === 'png' && transparent,
        bgId: designRef.current.backdrop,
        format,
        quality: 0.92,
      });
      downloadBlob(blob, `mocha_stamp_pack_${Date.now()}.${format === 'jpeg' ? 'jpg' : 'png'}`);
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
    showToast(`PACKING ${info.label}...`);
    try {
      await new Promise((r) => setTimeout(r, 30));
      const map = new Map(imagesRef.current.map((i) => [i.id, i]));
      const { blob, filename } = await exportPackModel(format, designRef.current, map, { anim: exportAnimRef.current });
      downloadBlob(blob, filename);
      showToast(`EXPORTED ${info.label}`);
    } catch (err) {
      console.error(err);
      showToast(`${info.label} EXPORT FAILED`);
    } finally {
      setBusy(false);
    }
  }, [showToast]);

  const api = useMemo(
    () => ({
      design, images, selected, selectedId, setSelectedId, toast, busy, stats, animation, exportAnim, imageScale, transparent,
      setAnimation, setExportAnim, setImageScale, setTransparent,
      addFiles, updateStamp, updateCard, updateGlobal, removeStamp, duplicateStamp, reorder, replaceImage, setCardImage,
      shuffle, loadSamples, clearStamps, resetView, topView, renderImage, handleExport,
    }),
    [design, images, selected, selectedId, toast, busy, stats, animation, exportAnim, imageScale, transparent, setAnimation,
      addFiles, updateStamp, updateCard, updateGlobal, removeStamp, duplicateStamp, reorder, replaceImage, setCardImage,
      shuffle, loadSamples, clearStamps, resetView, topView, renderImage, handleExport]
  );
  return { containerRef, api };
}
