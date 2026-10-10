import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { downloadBlob } from '../utils/helpers.js';
import { ANIMAL_IDS, CLIP_LIST, SPECIES, clipsFor } from '../animals/species.js';
import { buildAnimal } from '../animals/builder.js';
import { buildClips } from '../animals/clips.js';
import { createAnimalStage } from '../animals/stage.js';
import { exportAnimal } from '../animals/exporters.js';

const STORE_KEY = 'mocha.animals.v1';

function initial() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');
    return {
      id: ANIMAL_IDS.includes(s.id) ? s.id : 'deer',
      clip: typeof s.clip === 'string' ? s.clip : 'idle',
      bg: typeof s.bg === 'string' ? s.bg : 'studio',
    };
  } catch {
    return { id: 'deer', clip: 'idle', bg: 'studio' };
  }
}

export function useAnimals() {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const toastTimer = useRef(null);
  const [init] = useState(initial);
  const [id, setId] = useState(init.id);
  const [clip, setClipState] = useState(init.clip);
  const [bg, setBgState] = useState(init.bg);
  const [colors, setColors] = useState({});
  const [options, setOptions] = useState({});
  const [size, setSize] = useState(1);
  const [speed, setSpeedState] = useState(1);
  const [paused, setPausedState] = useState(false);
  const [time, setTime] = useState(0);
  const [toast, setToast] = useState({ text: 'READY', visible: false });
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const live = useRef({ clip, speed, paused });
  useEffect(() => {
    live.current = { clip, speed, paused };
  });

  const showToast = useCallback((text) => {
    setToast({ text, visible: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }, []);

  // one stage for the lifetime of the tab
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    let stage;
    let lastTick = 0;
    try {
      stage = createAnimalStage(container, {
        onTime: (u) => {
          const now = performance.now();
          if (now - lastTick > 80) {
            lastTick = now;
            setTime(u);
          }
        },
      });
    } catch (err) {
      console.error('animal stage failed', err);
      setTimeout(() => showToast('3D PREVIEW NEEDS WEBGL'), 0);
      return undefined;
    }
    stageRef.current = stage;
    if (import.meta.env.DEV) window.__animalStage = stage;
    const readyTimer = setTimeout(() => setReady(true), 0);
    return () => {
      clearTimeout(readyTimer);
      clearTimeout(toastTimer.current);
      stage.dispose();
      stageRef.current = null;
    };
  }, [showToast]);

  // (re)build the animal whenever its look changes
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !ready) return undefined;
    const t = setTimeout(() => {
      try {
        const rig = buildAnimal(id, { colors, options, size });
        const clips = buildClips(rig);
        const want = clips[live.current.clip] ? live.current.clip : 'idle';
        stage.setRig(rig, clips, want);
        stage.setSpeed(live.current.speed);
        stage.setPaused(live.current.paused);
        if (want !== live.current.clip) setClipState(want);
      } catch (err) {
        console.error('animal build failed', err);
        showToast('COULD NOT BUILD THAT ANIMAL');
      }
    }, 60);
    return () => clearTimeout(t);
  }, [id, colors, options, size, ready, showToast]);

  useEffect(() => {
    stageRef.current?.setBackground(bg);
  }, [bg, ready]);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ id, clip, bg }));
    } catch {
      /* storage can be unavailable */
    }
  }, [id, clip, bg]);

  const api = useMemo(() => {
    const spec = SPECIES[id];
    return {
      id,
      spec,
      species: ANIMAL_IDS.map((k) => ({ id: k, label: SPECIES[k].label })),
      clips: CLIP_LIST.filter((c) => clipsFor(id).includes(c.id)),
      clip,
      bg,
      colors: { ...spec.colors, ...colors },
      options: { ...spec.options, ...options },
      size,
      speed,
      paused,
      time,
      toast,
      busy,
      selectAnimal: (next) => {
        setId(next);
        setColors({});
        setOptions({});
      },
      setClip: (c) => {
        setClipState(c);
        live.current.clip = c;
        stageRef.current?.play(c);
      },
      setBg: setBgState,
      setColor: (key, value) => setColors((cur) => ({ ...cur, [key]: value })),
      setOption: (key, value) => setOptions((cur) => ({ ...cur, [key]: value })),
      resetLook: () => {
        setColors({});
        setOptions({});
        setSize(1);
      },
      setSize,
      setSpeed: (v) => {
        setSpeedState(v);
        stageRef.current?.setSpeed(v);
      },
      setPaused: (v) => {
        setPausedState(v);
        stageRef.current?.setPaused(v);
      },
      seek: (u) => {
        setPausedState(true);
        stageRef.current?.setPaused(true);
        stageRef.current?.seek(u);
        setTime(u);
      },
      frame: () => stageRef.current?.frame(),
      async exportModel(format, only = null) {
        setBusy(true);
        try {
          const out = await exportAnimal(format, id, { colors, options, size }, { only });
          downloadBlob(out.blob, out.filename);
          showToast(`${out.info.label} SAVED · ${out.clips.length} CLIPS`);
        } catch (err) {
          console.error(err);
          showToast('EXPORT FAILED');
        } finally {
          setBusy(false);
        }
      },
      async renderImage(mime = 'image/png') {
        const stage = stageRef.current;
        if (!stage) return;
        setBusy(true);
        try {
          const blob = await stage.snapshot(2, mime);
          if (blob) downloadBlob(blob, `mocha_${id}_${Date.now()}.${mime === 'image/png' ? 'png' : 'jpg'}`);
        } finally {
          setBusy(false);
        }
      },
    };
  }, [id, colors, options, size, clip, bg, speed, paused, time, toast, busy, showToast]);

  return [containerRef, api];
}
