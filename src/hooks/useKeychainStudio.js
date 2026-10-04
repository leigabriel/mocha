import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ADD_POOL, EMOJI_DATABASE, MAX_LINKS, MIN_LINKS, MM_PER_UNIT, SPREAD_MAX, SPREAD_MIN } from '../constants/index.js';
import { MasterKeychainCluster } from '../three/MasterKeychainCluster.js';
import { createStudio } from '../three/studio.js';
import { attachInteraction } from '../three/interaction.js';
import { clamp, extractFirstEmoji, saveDataUrl } from '../utils/helpers.js';
import {
  defaultDesign,
  loadStoredDesign,
  parseDesign,
  readHashDesign,
  saveStoredDesign,
  serializeDesign,
  shareUrl,
  writeHashDesign,
} from '../utils/design.js';
import { DesignHistory } from '../utils/history.js';

const TOAST_MS = 1800;
const COMMIT_DEBOUNCE_MS = 400;

const spreadLabel = (v) => (v < 0.9 ? 'TIGHT' : v > 1.15 ? 'WIDE' : 'COMPACT');

export function useKeychainStudio() {
  const containerRef = useRef(null);
  const clusterRef = useRef(null);
  const studioRef = useRef(null);
  const interactionRef = useRef(null);
  const historyRef = useRef(new DesignHistory());
  const activeRef = useRef(0);
  const bgRef = useRef('light');
  const toastTimerRef = useRef(null);
  const commitTimerRef = useRef(null);

  const [toast, setToast] = useState({ text: 'READY', visible: false });
  const [bgMode, setBgMode] = useState('light');
  const [branches, setBranches] = useState([]);
  const [activeCharmIndex, setActiveCharmIndex] = useState(0);
  const [customEmojiInput, setCustomEmojiInput] = useState('👾');
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [chainLinks, setChainLinks] = useState(MIN_LINKS);
  const [clusterSpread, setClusterSpread] = useState(1.0);
  const [thickness, setThickness] = useState(2);
  const [finish, setFinish] = useState('steel');
  const [exportAnimType, setExportAnimType] = useState('swing');
  const [snapshotTransparent, setSnapshotTransparent] = useState(false);
  const [sizeMm, setSizeMm] = useState({ w: 0, h: 0, d: 0 });
  const [historyFlags, setHistoryFlags] = useState({ canUndo: false, canRedo: false });

  const showToast = useCallback((text) => {
    setToast({ text, visible: true });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), TOAST_MS);
  }, []);

  // ------------------------------------------------------------ state sync

  const currentDesign = useCallback(() => {
    const cluster = clusterRef.current;
    return {
      finish: cluster.finish,
      spread: cluster.spread,
      bg: bgRef.current,
      charms: cluster.branches.map((b) => ({ emoji: b.emoji, thickness: b.thickness, links: b.chainLinks })),
    };
  }, []);

  const syncFromCluster = useCallback((index = activeRef.current) => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    setBranches(cluster.branches.map((b, i) => ({ index: i, emoji: b.emoji, thickness: b.thickness, chainLinks: b.chainLinks })));
    const idx = clamp(index, 0, cluster.branches.length - 1);
    activeRef.current = idx;
    setActiveCharmIndex(idx);

    const active = cluster.branches[idx];
    if (active) {
      setCustomEmojiInput(active.emoji);
      setChainLinks(active.chainLinks);
      setThickness(active.thickness);
    }
    setFinish(cluster.finish);
    setClusterSpread(cluster.spread);

    const { min, max } = cluster.assemblyBounds;
    setSizeMm({
      w: Math.round((max.x - min.x) * MM_PER_UNIT),
      h: Math.round((max.y - min.y) * MM_PER_UNIT),
      d: Math.round((max.z - min.z) * MM_PER_UNIT),
    });

    interactionRef.current?.refreshHighlights();
    studioRef.current?.refit(cluster.restBounds);
  }, []);

  const persist = useCallback((design) => {
    saveStoredDesign(design);
    writeHashDesign(design);
  }, []);

  const refreshHistoryFlags = useCallback(() => {
    const h = historyRef.current;
    setHistoryFlags({ canUndo: h.canUndo, canRedo: h.canRedo });
  }, []);

  const commit = useCallback(() => {
    clearTimeout(commitTimerRef.current);
    commitTimerRef.current = null;
    if (!clusterRef.current) return;
    const design = currentDesign();
    if (historyRef.current.push(serializeDesign(design))) persist(design);
    refreshHistoryFlags();
  }, [currentDesign, persist, refreshHistoryFlags]);

  const scheduleCommit = useCallback(() => {
    clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(commit, COMMIT_DEBOUNCE_MS);
  }, [commit]);

  const applyDesign = useCallback(
    (design) => {
      const cluster = clusterRef.current;
      const studio = studioRef.current;
      if (!cluster || !studio) return;
      cluster.loadDesign({ charms: design.charms.map((c) => ({ ...c })), finish: design.finish, spread: design.spread });
      bgRef.current = design.bg;
      setBgMode(design.bg);
      studio.setBackground(design.bg);
      syncFromCluster(Math.min(activeRef.current, design.charms.length - 1));
    },
    [syncFromCluster]
  );

  // -------------------------------------------------------------- actions

  const selectCharm = useCallback(
    (index) => {
      const cluster = clusterRef.current;
      const b = cluster?.branches[index];
      if (!b) return;
      const changed = activeRef.current !== index;
      activeRef.current = index;
      setActiveCharmIndex(index);
      setCustomEmojiInput(b.emoji);
      setChainLinks(b.chainLinks);
      setThickness(b.thickness);
      interactionRef.current?.refreshHighlights();
      if (changed) showToast(`SELECTED CHARM #${index + 1}: ${b.emoji}`);
    },
    [showToast]
  );

  const applyNewEmoji = useCallback(
    (raw) => {
      const cluster = clusterRef.current;
      if (!cluster) return;
      const emoji = extractFirstEmoji(raw);
      if (!emoji) {
        showToast('NOT AN EMOJI - PASTE OR TYPE ONE');
        return;
      }
      const charm = cluster.updateCharm(activeRef.current, { emoji });
      syncFromCluster();
      commit();
      showToast(
        charm?.monochrome
          ? `${emoji} HAS NO COLOUR GLYPH IN THIS BROWSER FONT`
          : `UPDATED CHARM #${activeRef.current + 1}: ${emoji}`
      );
    },
    [commit, showToast, syncFromCluster]
  );

  const handleAddCharm = useCallback(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    const emoji = ADD_POOL[cluster.branches.length % ADD_POOL.length];
    const branch = cluster.addCharm(emoji, 2, MIN_LINKS);
    if (!branch) return;
    cluster.applyImpulse(0.5);
    syncFromCluster(cluster.branches.length - 1);
    commit();
    showToast(`ATTACHED ${emoji} TO MASTER RING`);
  }, [commit, showToast, syncFromCluster]);

  const handleRemoveCharm = useCallback(
    (index) => {
      const cluster = clusterRef.current;
      if (!cluster || !cluster.removeCharm(index)) return;
      const active = activeRef.current;
      // Keep the same charm selected when a charm before it is removed.
      const next = index < active ? active - 1 : active;
      cluster.applyImpulse(0.4);
      syncFromCluster(next);
      commit();
      showToast('REMOVED CHARM FROM RING');
    },
    [commit, showToast, syncFromCluster]
  );

  const handleUpdateLinks = useCallback(
    (value, { quiet = false } = {}) => {
      const cluster = clusterRef.current;
      const count = clamp(parseInt(value, 10) || MIN_LINKS, MIN_LINKS, MAX_LINKS);
      if (!cluster || cluster.branches[activeRef.current]?.chainLinks === count) return;
      cluster.updateCharm(activeRef.current, { chainLinks: count });
      syncFromCluster();
      scheduleCommit();
      if (!quiet) showToast(`CHARM #${activeRef.current + 1} CHAIN: ${count} LINKS`);
    },
    [scheduleCommit, showToast, syncFromCluster]
  );

  const handleUpdateSpread = useCallback(
    (value) => {
      const cluster = clusterRef.current;
      if (!cluster) return;
      cluster.setSpread(clamp(parseFloat(value) || 1, SPREAD_MIN, SPREAD_MAX));
      syncFromCluster();
      scheduleCommit();
    },
    [scheduleCommit, syncFromCluster]
  );

  const handleUpdateThickness = useCallback(
    (mode) => {
      const cluster = clusterRef.current;
      if (!cluster || cluster.branches[activeRef.current]?.thickness === mode) return;
      cluster.updateCharm(activeRef.current, { thickness: mode });
      syncFromCluster();
      commit();
      showToast('THICKNESS UPDATED');
    },
    [commit, showToast, syncFromCluster]
  );

  const handleUpdateFinish = useCallback(
    (f) => {
      const cluster = clusterRef.current;
      if (!cluster || f === cluster.finish) return;
      cluster.setFinish(f);
      setFinish(f);
      commit();
      showToast(`ALLOY: ${f.toUpperCase()}`);
    },
    [commit, showToast]
  );

  const handleCameraView = useCallback(
    (view) => {
      const cluster = clusterRef.current;
      const studio = studioRef.current;
      if (!cluster || !studio) return;
      const ringCenter = cluster.ringMesh.getWorldPosition(cluster.anchorPos.clone());
      studio.setView(view, cluster.restBounds, { center: ringCenter, radius: 0.3 });
      showToast(`CAMERA: ${view.toUpperCase()}`);
    },
    [showToast]
  );

  const handleSetSceneBackground = useCallback(
    (mode) => {
      bgRef.current = mode;
      setBgMode(mode);
      studioRef.current?.setBackground(mode);
      commit();
      showToast(`SCENE: ${mode.toUpperCase()}`);
    },
    [commit, showToast]
  );

  const handleSpinCluster = useCallback(() => {
    clusterRef.current?.applySpin(9.0);
    showToast('SPUN CLUSTER 360°');
  }, [showToast]);

  const handleNudgeCluster = useCallback(() => {
    clusterRef.current?.applyImpulse(0.85);
    showToast('SWUNG CLUSTER');
  }, [showToast]);

  const handleResetPose = useCallback(() => {
    clusterRef.current?.resetPose();
    showToast('RESET CLUSTER TO REST POSE');
  }, [showToast]);

  const handleUndo = useCallback(() => {
    if (commitTimerRef.current) commit();
    const text = historyRef.current.undo();
    const design = text && parseDesign(text);
    if (!design) return;
    applyDesign(design);
    persist(design);
    refreshHistoryFlags();
    showToast('UNDO');
  }, [applyDesign, commit, persist, refreshHistoryFlags, showToast]);

  const handleRedo = useCallback(() => {
    const text = historyRef.current.redo();
    const design = text && parseDesign(text);
    if (!design) return;
    applyDesign(design);
    persist(design);
    refreshHistoryFlags();
    showToast('REDO');
  }, [applyDesign, persist, refreshHistoryFlags, showToast]);

  const handleCopyShareLink = useCallback(async () => {
    if (!clusterRef.current) return;
    const url = shareUrl(currentDesign());
    try {
      await navigator.clipboard.writeText(url);
      showToast('SHARE LINK COPIED');
    } catch {
      writeHashDesign(currentDesign());
      showToast('COPY THE LINK FROM THE ADDRESS BAR');
    }
  }, [currentDesign, showToast]);

  const withExporters = useCallback(
    async (run) => {
      try {
        const mod = await import('../three/exporters.js');
        await run(mod);
      } catch (err) {
        console.error(err);
        showToast('EXPORT MODULE FAILED TO LOAD');
      }
    },
    [showToast]
  );

  const handleExportGLB = useCallback(
    () => withExporters((m) => m.exportGLB(clusterRef.current, showToast, exportAnimType)),
    [exportAnimType, showToast, withExporters]
  );
  const handleExportGLTF = useCallback(
    () => withExporters((m) => m.exportGLTF(clusterRef.current, showToast, exportAnimType)),
    [exportAnimType, showToast, withExporters]
  );
  const handleExportOBJ = useCallback(
    () => withExporters((m) => m.exportOBJ(clusterRef.current, showToast)),
    [showToast, withExporters]
  );

  const handleCaptureSnapshot = useCallback(() => {
    const studio = studioRef.current;
    if (!studio) return;
    const url = studio.snapshot({ scale: 2, transparent: snapshotTransparent });
    saveDataUrl(url, `mocha_snapshot_${Date.now()}.png`);
    showToast(snapshotTransparent ? 'SNAPSHOT SAVED (TRANSPARENT, 2X)' : 'SNAPSHOT SAVED (2X)');
  }, [showToast, snapshotTransparent]);

  /** Keyboard control for the focused 3D viewport. */
  const handleViewportKeyDown = useCallback(
    (e) => {
      const cluster = clusterRef.current;
      if (!cluster || e.ctrlKey || e.metaKey || e.altKey) return;
      let handled = true;
      switch (e.key) {
        case 'ArrowLeft': cluster.nudge(-1); break;
        case 'ArrowRight': cluster.nudge(1); break;
        case 'ArrowUp': cluster.nudge(-1, 'x'); break;
        case 'ArrowDown': cluster.nudge(1, 'x'); break;
        case ' ': cluster.applyImpulse(0.85); showToast('SWUNG CLUSTER'); break;
        case 's': case 'S': cluster.applySpin(9.0); showToast('SPUN CLUSTER 360°'); break;
        case 'r': case 'R': cluster.resetPose(); showToast('RESET CLUSTER TO REST POSE'); break;
        case '[': selectCharm((activeRef.current + cluster.branches.length - 1) % cluster.branches.length); break;
        case ']': selectCharm((activeRef.current + 1) % cluster.branches.length); break;
        default:
          if (/^[1-5]$/.test(e.key) && cluster.branches[Number(e.key) - 1]) selectCharm(Number(e.key) - 1);
          else handled = false;
      }
      if (handled) e.preventDefault();
    },
    [selectCharm, showToast]
  );

  // ---------------------------------------------------------- scene setup

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const cluster = new MasterKeychainCluster({ onToast: showToast });
    let lastVersion = -1;
    const studio = createStudio(container, {
      anchor: cluster.anchorPos,
      step: (dt) => {
        const moved = cluster.update(dt);
        const changed = moved || cluster.version !== lastVersion;
        lastVersion = cluster.version;
        return changed;
      },
    });
    studio.scene.add(cluster.rootGroup);
    clusterRef.current = cluster;
    studioRef.current = studio;

    interactionRef.current = attachInteraction({
      canvas: studio.canvas,
      camera: studio.camera,
      controls: studio.controls,
      cluster,
      getSelectedIndex: () => activeRef.current,
      onSelect: (index) => selectCharm(index),
      onActivity: studio.invalidate,
    });

    const design = readHashDesign() ?? loadStoredDesign() ?? defaultDesign();
    bgRef.current = design.bg;
    setBgMode(design.bg);
    studio.setBackground(design.bg);
    cluster.loadDesign({ charms: design.charms, finish: design.finish, spread: design.spread });
    historyRef.current = new DesignHistory();
    historyRef.current.push(serializeDesign(design));
    activeRef.current = 0;
    syncFromCluster(0);
    studio.frame({ bounds: cluster.restBounds, view: 'front', animate: false });

    const onKeyDown = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(commitTimerRef.current);
      clearTimeout(toastTimerRef.current);
      interactionRef.current?.detach();
      interactionRef.current = null;
      studio.dispose();
      cluster.dispose();
      studioRef.current = null;
      clusterRef.current = null;
    };
    // The scene is created once per mount; handlers read live state through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredEmojis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return EMOJI_DATABASE.filter((item) => {
      const matchCat = category === 'all' || item.cat === category;
      return matchCat && (!q || item.char.includes(q) || item.tags.toLowerCase().includes(q));
    });
  }, [category, searchQuery]);

  return {
    containerRef,
    toast,
    bgMode,
    branches,
    activeCharmIndex,
    activeBranch: branches[activeCharmIndex],
    customEmojiInput,
    setCustomEmojiInput,
    category,
    setCategory,
    searchQuery,
    setSearchQuery,
    chainLinks,
    clusterSpread,
    clusterSpreadText: spreadLabel(clusterSpread),
    thickness,
    finish,
    exportAnimType,
    setExportAnimType,
    snapshotTransparent,
    setSnapshotTransparent,
    sizeMm,
    canUndo: historyFlags.canUndo,
    canRedo: historyFlags.canRedo,
    filteredEmojis,
    selectCharm,
    applyNewEmoji,
    handleAddCharm,
    handleRemoveCharm,
    handleUpdateLinks,
    handleUpdateSpread,
    handleUpdateThickness,
    handleUpdateFinish,
    handleCameraView,
    handleSetSceneBackground,
    handleSpinCluster,
    handleNudgeCluster,
    handleResetPose,
    handleUndo,
    handleRedo,
    handleCopyShareLink,
    handleExportGLB,
    handleExportGLTF,
    handleExportOBJ,
    handleCaptureSnapshot,
    handleViewportKeyDown,
  };
}
