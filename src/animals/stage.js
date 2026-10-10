import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CLIP_LIST } from './species.js';

export const BACKGROUNDS = {
  studio: { label: 'Studio', bg: '#e9e4da', ground: '#d9d2c4', line: '#c2baa8' },
  meadow: { label: 'Meadow', bg: '#bfe0f2', ground: '#8fbf6a', line: '#7aa856' },
  dusk: { label: 'Dusk', bg: '#3b3560', ground: '#4c4670', line: '#5c5685' },
  night: { label: 'Night', bg: '#101216', ground: '#1b1e25', line: '#2a2e38' },
};

function groundTexture(ground, line) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = ground;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = line;
  g.fillRect(0, 0, 128, 6);
  g.fillRect(0, 0, 6, 128);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Render-on-demand-free demo stage: one animal on a scrolling ground, driven by an AnimationMixer. */
export function createAnimalStage(container, { onTime = () => {} } = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 200);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  canvas.setAttribute('aria-hidden', 'true');
  container.replaceChildren(canvas);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new RoomEnvironment();
  scene.environment = pmrem.fromScene(env, 0.04).texture;
  env.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
  pmrem.dispose();
  scene.environmentIntensity = 0.7;

  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(3, 6, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;

  const groundMat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64).rotateX(-Math.PI / 2), groundMat);
  ground.name = 'Ground';
  ground.receiveShadow = true;
  scene.add(ground);

  let rig = null;
  let mixer = null;
  let actions = {};
  let clips = {};
  let current = null;
  let speed = 1;
  let paused = false;
  let bgKey = 'studio';
  let tile = 0.5;
  let groundTex = null;
  let raf = 0;
  let last = performance.now();
  let disposed = false;
  let scrollV = 0; // metres per second of ground travel at speed 1

  function setBackground(key) {
    bgKey = BACKGROUNDS[key] ? key : 'studio';
    const b = BACKGROUNDS[bgKey];
    scene.background = new THREE.Color(b.bg);
    groundTex?.dispose();
    groundTex = groundTexture(b.ground, b.line);
    groundMat.map = groundTex;
    groundMat.color.set('#ffffff');
    groundMat.needsUpdate = true;
    applyTile();
  }
  function applyTile() {
    if (!groundTex) return;
    groundTex.repeat.set(80 / tile / 2, 80 / tile / 2);
  }

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  function frame() {
    if (!rig) return;
    const b = rig.bounds;
    const sc = rig.root.scale.x;
    const sizeV = b.getSize(new THREE.Vector3()).multiplyScalar(sc);
    const wing = rig.spec.kind === 'bird' ? rig.spec.wing.l1 + rig.spec.wing.l2 + rig.spec.wing.l3 : 0;
    const span = Math.max(sizeV.x, sizeV.y, sizeV.z, wing * 2 * sc);
    const target = new THREE.Vector3(0, sizeV.y * 0.45, 0);
    const dist = (span * 0.75) / Math.tan((camera.fov * Math.PI) / 360) + span * 0.4;
    camera.position.set(-0.8, 0.28, 1).normalize().multiplyScalar(dist).add(target);
    controls.target.copy(target);
    controls.minDistance = span * 0.6;
    controls.maxDistance = span * 12;
    camera.near = Math.max(0.01, span / 100);
    camera.far = span * 200;
    camera.updateProjectionMatrix();
    controls.update();
    const s = span * 1.6;
    sun.shadow.camera.left = -s;
    sun.shadow.camera.right = s;
    sun.shadow.camera.top = s;
    sun.shadow.camera.bottom = -s;
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = span * 12;
    sun.shadow.camera.updateProjectionMatrix();
    sun.position.set(span * 1.2, span * 2.4, span * 1.5);
    tile = Math.max(0.25, span / 5);
    applyTile();
  }

  function setRig(next, nextClips, startClip = 'idle') {
    if (rig) {
      mixer?.stopAllAction();
      scene.remove(rig.root);
      rig.dispose();
    }
    rig = next;
    clips = nextClips;
    scene.add(rig.root);
    mixer = new THREE.AnimationMixer(rig.root);
    actions = {};
    for (const [id, clip] of Object.entries(clips)) {
      const a = mixer.clipAction(clip);
      a.setLoop(THREE.LoopRepeat, Infinity);
      actions[id] = a;
    }
    current = null;
    frame();
    play(clips[startClip] ? startClip : 'idle', 0);
  }

  function play(id, fade = 0.25) {
    const next = actions[id];
    if (!next) return;
    const prev = current ? actions[current] : null;
    next.reset().setEffectiveWeight(1).play();
    if (prev && prev !== next && fade > 0) prev.crossFadeTo(next, fade, false);
    else if (prev && prev !== next) prev.stop();
    current = id;
    next.paused = paused;
    next.timeScale = speed;
    scrollV = (CLIP_LIST.find((c) => c.id === id)?.speed ?? 0) * (rig?.root.scale.x ?? 1) * 0.55;
  }

  function seek(u) {
    if (!current) return;
    const a = actions[current];
    a.time = Math.min(a.getClip().duration, Math.max(0, u * a.getClip().duration));
    mixer.update(0);
  }

  function tick(now) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (mixer) {
      if (!paused) mixer.update(dt * speed);
      if (current && !paused) {
        const a = actions[current];
        const d = a.getClip().duration;
        onTime(((a.time % d) + d) % d / d);
      }
    }
    if (groundTex && !paused && scrollV) groundTex.offset.y -= (scrollV * dt * speed) / (tile * 2);
    controls.update();
    renderer.render(scene, camera);
  }
  setBackground('studio');
  raf = requestAnimationFrame(tick);

  return {
    setRig,
    play,
    seek,
    frame,
    setBackground,
    setSpeed: (v) => {
      speed = v;
      if (current) actions[current].timeScale = v;
    },
    setPaused: (v) => {
      paused = v;
      if (current) actions[current].paused = v;
    },
    get rig() {
      return rig;
    },
    snapshot: (scale = 2, mime = 'image/png') =>
      new Promise((resolve) => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        renderer.setPixelRatio(scale);
        renderer.setSize(w, h, false);
        renderer.render(scene, camera);
        canvas.toBlob((blob) => {
          resize();
          resolve(blob);
        }, mime, 0.92);
      }),
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      rig?.dispose();
      groundTex?.dispose();
      groundMat.dispose();
      ground.geometry.dispose();
      scene.environment?.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
