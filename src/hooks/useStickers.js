import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { downloadBlob } from '../utils/helpers.js';
import { LIBRARY } from '../stickers/library.js';
import { DEFAULT_STYLE, PRESETS, customToDef, makePack, NEW_CUSTOM, parsePack, sanitizeCustom, sanitizeStyle } from '../stickers/styles.js';
import { buildSheet, buildSticker, renderSticker } from '../stickers/build.js';
import { createStickerStage } from '../stickers/stage.js';
import { loadStickerFonts } from '../stickers/fonts.js';
import { exportPackJSON, exportPackZip, exportSheetModel, exportSheetPNG, exportSticker, FORMAT_INFO } from '../stickers/exporters.js';

const STORE_KEY = 'mocha.stickers.v1';
const STYLES_KEY = 'mocha.stickers.styles.v1';

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage can be unavailable */
  }
};

function initial() {
  const s = read(STORE_KEY, {});
  return {
    id: typeof s.id === 'string' ? s.id : 'meat-market',
    bg: typeof s.bg === 'string' ? s.bg : 'black',
    view: s.view === 'sheet' ? 'sheet' : 'single',
    spin: s.spin !== false,
    style: sanitizeStyle(s.style ?? DEFAULT_STYLE),
    customs: (Array.isArray(s.customs) ? s.customs : []).slice(0, 60).map(sanitizeCustom),
    saved: (Array.isArray(read(STYLES_KEY, [])) ? read(STYLES_KEY, []) : []).slice(0, 20).map(sanitizeStyle),
  };
}

export function useStickers() {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const toastTimer = useRef(null);
  const [init] = useState(initial);
  const [id, setId] = useState(init.id);
  const [bg, setBgState] = useState(init.bg);
  const [view, setView] = useState(init.view);
  const [spin, setSpinState] = useState(init.spin);
  const [style, setStyle] = useState(init.style);
  const [customs, setCustoms] = useState(init.customs);
  const [saved, setSaved] = useState(init.saved);
  const [group, setGroup] = useState('all');
  const [thumbs, setThumbs] = useState({});
  const [toast, setToast] = useState({ text: 'READY', visible: false });
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);

  const showToast = useCallback((text) => {
    setToast({ text, visible: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2400);
  }, []);

  const defs = useMemo(() => [...customs.map(customToDef), ...LIBRARY], [customs]);
  const current = defs.find((d) => d.id === id) ?? defs[0];
  const customRecord = customs.find((c) => c.id === current.id) ?? null;

  useEffect(() => {
    let alive = true;
    loadStickerFonts().then(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    let stage;
    try {
      stage = createStickerStage(container);
    } catch (err) {
      console.error('sticker stage failed', err);
      setTimeout(() => showToast('3D PREVIEW NEEDS WEBGL'), 0);
      return undefined;
    }
    stageRef.current = stage;
    if (import.meta.env.DEV) window.__stickerStage = stage;
    const t = setTimeout(() => setReady(true), 0);
    return () => {
      clearTimeout(t);
      clearTimeout(toastTimer.current);
      stage.dispose();
      stageRef.current = null;
    };
  }, [showToast]);

  // (re)build the model whenever the design, style or view changes
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !ready || !fontsReady) return undefined;
    const t = setTimeout(() => {
      try {
        if (view === 'sheet') {
          const sheet = buildSheet(defs, style, { cols: 6, ppu: 60 });
          stage.setModel({ root: sheet.root, dispose: sheet.dispose }, { extent: sheet.extent });
          stage.setSpin(false);
        } else {
          const s = buildSticker(current, style, { ppu: 140 });
          stage.setModel({ root: s.root, dispose: s.dispose });
          stage.setSpin(spin);
        }
      } catch (err) {
        console.error('sticker build failed', err);
        showToast('COULD NOT BUILD THAT STICKER');
      }
    }, 50);
    return () => clearTimeout(t);
  }, [current, defs, style, view, spin, ready, fontsReady, showToast]);

  useEffect(() => {
    stageRef.current?.setBackground(bg);
  }, [bg, ready]);

  // thumbnails: small flat renders, produced a few at a time so the UI stays responsive
  useEffect(() => {
    if (!fontsReady) return undefined;
    let cancelled = false;
    const queue = [...defs];
    const next = {};
    const step = () => {
      if (cancelled) return;
      const batch = queue.splice(0, 5);
      for (const d of batch) {
        try {
          next[d.id] = renderSticker(d, style, { ppu: 24 }).toDataURL('image/png');
        } catch {
          /* skip */
        }
      }
      setThumbs({ ...next });
      if (queue.length) setTimeout(step, 0);
    };
    const t = setTimeout(step, 30);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [defs, style, fontsReady]);

  useEffect(() => {
    write(STORE_KEY, { id, bg, view, spin, style, customs });
  }, [id, bg, view, spin, style, customs]);
  useEffect(() => {
    write(STYLES_KEY, saved);
  }, [saved]);

  const patchStyle = useCallback((patch) => setStyle((s) => sanitizeStyle({ ...s, ...patch })), []);

  const run = useCallback(
    async (fn, okText) => {
      setBusy(true);
      try {
        const out = await fn();
        if (out?.blob) downloadBlob(out.blob, out.filename);
        showToast(okText(out));
      } catch (err) {
        console.error(err);
        showToast('EXPORT FAILED');
      } finally {
        setBusy(false);
      }
    },
    [showToast],
  );

  const api = useMemo(
    () => ({
      defs,
      current,
      customRecord,
      id: current.id,
      group,
      thumbs,
      style,
      saved,
      bg,
      view,
      spin,
      toast,
      busy,
      customs,
      formats: FORMAT_INFO,
      presets: PRESETS,
      setGroup,
      select: (next) => {
        setId(next);
        setView('single');
      },
      setBg: setBgState,
      setView,
      setSpin: (v) => {
        setSpinState(v);
      },
      patchStyle,
      setPalette: (role, value) => setStyle((s) => sanitizeStyle({ ...s, palette: { ...s.palette, [role]: value } })),
      setBorder: (patch) => setStyle((s) => sanitizeStyle({ ...s, border: { ...s.border, ...patch } })),
      applyPreset: (key) => setStyle((s) => sanitizeStyle({ ...s, ...PRESETS[key], name: s.name })),
      resetStyle: () => setStyle(sanitizeStyle(DEFAULT_STYLE)),
      saveStyle: () => {
        setSaved((list) => [style, ...list.filter((x) => x.name !== style.name)].slice(0, 20));
        showToast(`STYLE “${style.name}” SAVED`);
      },
      loadStyle: (name) => {
        const found = saved.find((x) => x.name === name);
        if (found) setStyle(found);
      },
      deleteStyle: (name) => setSaved((list) => list.filter((x) => x.name !== name)),
      addCustom: (base = {}) => {
        const c = sanitizeCustom({ ...NEW_CUSTOM, ...base, id: undefined });
        setCustoms((list) => [c, ...list].slice(0, 60));
        setId(c.id);
        setView('single');
        showToast('NEW STICKER ADDED');
      },
      updateCustom: (patch) => setCustoms((list) => list.map((c) => (c.id === current.id ? sanitizeCustom({ ...c, ...patch, id: c.id }) : c))),
      deleteCustom: () => {
        setCustoms((list) => list.filter((c) => c.id !== current.id));
        setId(LIBRARY[0].id);
      },
      duplicateCustom: () => {
        if (!customRecord) return;
        const c = sanitizeCustom({ ...customRecord, id: undefined, name: `${customRecord.name} copy` });
        setCustoms((list) => [c, ...list].slice(0, 60));
        setId(c.id);
      },
      exportOne: (format, scale = 2) => run(() => exportSticker(format, current, style, { scale }), (o) => `${o.info.label} SAVED`),
      exportSheetPNG: (bgColor) => run(() => exportSheetPNG(defs, style, { bg: bgColor }), (o) => `SHEET PNG · ${o.count} STICKERS`),
      exportSheetModel: () => run(() => exportSheetModel(defs, style), (o) => `PACK GLB · ${o.count} STICKERS`),
      exportZip: () => run(() => exportPackZip(defs, style, customs), (o) => `ZIP · ${o.count} PNGS`),
      exportPack: () => run(async () => exportPackJSON(style, customs), () => 'PACK FILE SAVED'),
      async importPack(file) {
        try {
          const pack = parsePack(await file.text());
          setStyle(pack.style);
          setCustoms(pack.stickers);
          if (pack.stickers[0]) setId(pack.stickers[0].id);
          showToast(`PACK “${pack.style.name}” LOADED`);
        } catch {
          showToast('NOT A STICKER PACK FILE');
        }
      },
      async renderImage(mime = 'image/png') {
        const stage = stageRef.current;
        if (!stage) return;
        setBusy(true);
        try {
          const blob = await stage.snapshot(2, mime);
          if (blob) downloadBlob(blob, `mocha_sticker_view_${Date.now()}.${mime === 'image/png' ? 'png' : 'jpg'}`);
        } finally {
          setBusy(false);
        }
      },
      makePack: () => makePack(style, customs),
    }),
    [defs, current, customRecord, group, thumbs, style, saved, bg, view, spin, toast, busy, customs, patchStyle, run, showToast],
  );

  return [containerRef, api];
}
