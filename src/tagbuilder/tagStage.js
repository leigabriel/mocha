import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BACKGROUNDS } from './constants.js';

const FOV = 28;
const HOVER = { color: 0xffffff, intensity: 0.12 };
const SELECT = { color: 0x3b6bff, intensity: 0.22 };

/** Soft-box studio used for reflections: a dim dome with three bright rectangles. */
function buildStudioEnvironment() {
  const scene = new THREE.Scene();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6f7b8e), side: THREE.BackSide })
  );
  scene.add(dome);
  const box = (w, h, intensity, pos, tint = 0xffffff) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(intensity), side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  box(6, 4, 9, [4, 6, 5]); // key
  box(3, 7, 5, [-7, 2, 2], 0xdfe9ff); // fill strip
  box(8, 2, 6, [0, 7, -5]); // top / rim
  box(4, 4, 2.5, [0, -5, 6], 0xffe8d0); // warm bounce from below
  return scene;
}

/**
 * Orbit viewer for the Tag Builder. Render-on-demand; the model is swapped with
 * `setModel`. Picking and hover report the tag id found under the pointer.
 */
export function createTagStage(container, { onPick = () => {}, onHover = () => {} } = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 4000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = 1;
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.setAttribute('aria-hidden', 'true');
  container.replaceChildren(canvas);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = buildStudioEnvironment();
  const envTarget = pmrem.fromScene(envScene, 0.02);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 1;
  envScene.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(120, 220, 260);
  scene.add(key);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI - 0.2;

  let model = null;
  let bounds = new THREE.Box3(new THREE.Vector3(-30, -90, -20), new THREE.Vector3(30, 60, 20));
  let dirty = true;
  let disposed = false;
  let rafId = 0;
  let selectedId = null;
  let hoverId = null;
  let userMoved = false;

  const invalidate = () => {
    dirty = true;
  };

  function fit(view = null) {
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const aspect = Math.max(0.2, canvas.clientWidth / Math.max(1, canvas.clientHeight));
    const tanV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const dist = (Math.max(size.y / 2 / tanV, size.x / 2 / (tanV * aspect)) + size.z / 2) * 1.2;
    const dir = view
      ? new THREE.Vector3(...view).normalize()
      : camera.position.clone().sub(controls.target).normalize();
    if (!Number.isFinite(dir.x) || dir.lengthSq() === 0) dir.set(-0.7, 0.1, 0.7).normalize();
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(dir, dist);
    camera.near = Math.max(0.5, dist / 80);
    camera.far = dist * 40;
    camera.updateProjectionMatrix();
    controls.minDistance = dist * 0.18;
    controls.maxDistance = dist * 3;
    controls.update();
    invalidate();
  }

  function applyHighlights() {
    if (!model) return;
    model.traverse((o) => {
      if (!o.isMesh || !o.material || o.material.userData.shared) return;
      const id = o.userData.tagId;
      const state = id && id === selectedId ? SELECT : id && id === hoverId ? HOVER : null;
      const m = o.material;
      if (!m.emissive) return;
      if (state) {
        m.emissive.setHex(state.color);
        m.emissiveIntensity = state.intensity;
      } else {
        m.emissive.setHex(0x000000);
        m.emissiveIntensity = 1;
      }
    });
    invalidate();
  }

  function setModel(built, { refit = false, view = null } = {}) {
    if (model) {
      scene.remove(model);
      built.previous?.dispose?.();
    }
    model = built.group;
    bounds = built.bounds.clone();
    scene.add(model);
    applyHighlights();
    if (refit || !userMoved) fit(view);
    invalidate();
  }

  function setSelected(id) {
    selectedId = id;
    applyHighlights();
  }

  function setBackground(id) {
    const bg = BACKGROUNDS[id] ?? BACKGROUNDS.studio;
    if (bg.top) {
      container.style.background = `linear-gradient(180deg, ${bg.top}, ${bg.bottom})`;
    } else {
      container.style.background =
        'repeating-conic-gradient(#d9dbe0 0% 25%, #eceef2 0% 50%) 50% / 24px 24px';
    }
    invalidate();
  }

  // ------------------------------------------------------------------ picking
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pickAt(e) {
    if (!model) return null;
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObject(model, true);
    for (const h of hits) if (h.object.userData.tagId) return h.object.userData.tagId;
    return null;
  }

  let down = null;
  const onDown = (e) => {
    down = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved < 5) onPick(pickAt(e));
  };
  const onMove = (e) => {
    if (down) return;
    const id = pickAt(e);
    canvas.style.cursor = id ? 'pointer' : 'grab';
    if (id !== hoverId) {
      hoverId = id;
      applyHighlights();
      onHover(id);
    }
  };
  const onLeave = () => {
    if (hoverId) {
      hoverId = null;
      applyHighlights();
      onHover(null);
    }
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  controls.addEventListener('start', () => {
    userMoved = true;
  });
  controls.addEventListener('change', invalidate);

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!userMoved) fit();
    invalidate();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  function loop() {
    if (disposed) return;
    rafId = requestAnimationFrame(loop);
    const moved = controls.update();
    if (dirty || moved) {
      dirty = false;
      renderer.render(scene, camera);
    }
  }
  rafId = requestAnimationFrame(loop);

  /**
   * Renders the current view at `scale` times the on-screen size (capped at 4096 px on
   * the long side). With a background, the backdrop gradient is painted behind it.
   * Returns a PNG blob.
   */
  async function snapshot({ scale = 3, transparent = false, bgId = 'studio' } = {}) {
    const size = renderer.getSize(new THREE.Vector2());
    const prevRatio = renderer.getPixelRatio();
    const factor = Math.min(scale, 4096 / Math.max(size.x, size.y));
    const w = Math.round(size.x * factor);
    const h = Math.round(size.y * factor);
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    renderer.render(scene, camera);

    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');
    const bg = BACKGROUNDS[bgId] ?? BACKGROUNDS.studio;
    if (!transparent && bg.top) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, bg.top);
      grad.addColorStop(1, bg.bottom);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(canvas, 0, 0, w, h);

    renderer.setPixelRatio(prevRatio);
    renderer.setSize(size.x, size.y, false);
    invalidate();
    return new Promise((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG failed'))), 'image/png'));
  }

  function dispose() {
    disposed = true;
    cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerleave', onLeave);
    controls.dispose();
    envTarget.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    if (canvas.parentNode === container) container.removeChild(canvas);
  }

  return {
    scene,
    camera,
    renderer,
    canvas,
    setModel,
    setSelected,
    setBackground,
    fit: (view) => {
      userMoved = false;
      fit(view);
    },
    snapshot,
    invalidate,
    dispose,
  };
}
