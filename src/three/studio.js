import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CONFIG, LIGHTING, SCENE_BG } from '../constants/index.js';

const FOV = 34;
const VIEW_DIRECTIONS = {
  front: new THREE.Vector3(0, 0.04, 1).normalize(),
  iso: new THREE.Vector3(0.62, 0.28, 0.73).normalize(),
};

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Distance at which a box of half extents (hw, hh, hd) fits the view. */
function fitDistance(hw, hh, hd, aspect) {
  const tanV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  return (Math.max(hh / tanV, hw / (tanV * aspect)) + hd) * 1.12;
}

/**
 * Creates the renderer, camera, lights, environment and the wall peg, and owns the
 * render-on-demand loop. `step(dt)` is called every frame and returns true when the
 * scene changed and needs rendering.
 */
export function createStudio(container, { anchor, step }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SCENE_BG.light.hex);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 60);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.setAttribute('aria-hidden', 'true');
  container.replaceChildren(canvas);

  // Image-based lighting: without an environment map metals only reflect the lights.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envTarget.texture;
  pmrem.dispose();

  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1);
  keyLight.position.set(2.8, 4.5, 3.5);
  const rimLight = new THREE.DirectionalLight(0xdbe4f2, 1);
  rimLight.position.set(-3.0, 2.5, -2.5);
  scene.add(ambientLight, keyLight, rimLight);

  // Wall peg the ring hangs from (static, not part of the exported model)
  const props = new THREE.Group();
  props.name = 'StudioProps';
  const propMat = new THREE.MeshStandardMaterial({ color: 0x8d93a0, metalness: 0.35, roughness: 0.45 });
  const pegGeo = new THREE.CylinderGeometry(CONFIG.pegRadius, CONFIG.pegRadius, 0.16, 24).rotateX(Math.PI / 2);
  const plateGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.014, 40).rotateX(Math.PI / 2);
  const peg = new THREE.Mesh(pegGeo, propMat);
  const plate = new THREE.Mesh(plateGeo, propMat);
  peg.position.copy(anchor);
  plate.position.set(anchor.x, anchor.y, anchor.z - 0.08);
  props.add(peg, plate);
  scene.add(props);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.5;
  controls.maxDistance = 8;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = Math.PI - 0.15;

  let dirty = true;
  let autoFrame = true;
  let frameBounds = new THREE.Box3(new THREE.Vector3(-0.4, -0.2, -0.2), new THREE.Vector3(0.4, 1.1, 0.2));
  let tween = null;
  let rafId = 0;
  let lastTime = 0;
  let disposed = false;

  const invalidate = () => {
    dirty = true;
  };

  const aspect = () => Math.max(0.2, canvas.clientWidth / Math.max(1, canvas.clientHeight));

  function setLights(mode) {
    const l = LIGHTING[mode];
    ambientLight.intensity = l.ambient;
    keyLight.intensity = l.key;
    rimLight.intensity = l.rim;
    scene.environmentIntensity = l.env;
  }
  setLights('light');

  function setBackground(mode) {
    scene.background = new THREE.Color(SCENE_BG[mode].hex);
    container.style.backgroundColor = SCENE_BG[mode].css;
    setLights(mode);
    invalidate();
  }

  function goTo(position, target, animate) {
    if (!animate || prefersReducedMotion()) {
      tween = null;
      camera.position.copy(position);
      controls.target.copy(target);
      controls.update();
      invalidate();
      return;
    }
    tween = {
      fromPos: camera.position.clone(),
      toPos: position.clone(),
      fromTarget: controls.target.clone(),
      toTarget: target.clone(),
      t: 0,
      duration: 0.6,
    };
  }

  /** Frames the whole cluster, keeping the current orbit direction unless `view` is given. */
  function frame({ bounds = frameBounds, view = null, animate = true } = {}) {
    frameBounds = bounds;
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const dist = fitDistance(size.x / 2, size.y / 2, size.z / 2, aspect());

    let dir;
    if (view && VIEW_DIRECTIONS[view]) dir = VIEW_DIRECTIONS[view];
    else dir = camera.position.clone().sub(controls.target).normalize();
    if (!Number.isFinite(dir.x) || dir.lengthSq() === 0) dir = VIEW_DIRECTIONS.front;

    goTo(center.clone().addScaledVector(dir, dist), center, animate);
  }

  /** Close-up of the master ring and the top of the chains. */
  function frameRing(ringCenter, ringRadius) {
    const center = ringCenter.clone();
    const dist = fitDistance(ringRadius * 1.3, ringRadius * 1.25, 0.1, aspect());
    goTo(center.clone().addScaledVector(VIEW_DIRECTIONS.front, dist), center, true);
  }

  function setView(name, bounds, ringInfo) {
    if (name === 'hardware') {
      autoFrame = false;
      frameRing(ringInfo.center, ringInfo.radius);
    } else {
      autoFrame = true;
      frame({ bounds, view: name });
    }
  }

  /** Re-fits only while the user has not taken manual control of the camera. */
  function refit(bounds) {
    frameBounds = bounds;
    if (autoFrame) frame({ bounds, animate: true });
  }

  controls.addEventListener('start', () => {
    autoFrame = false;
    tween = null;
  });

  const panCenter = new THREE.Vector3();
  const panShift = new THREE.Vector3();
  controls.addEventListener('change', () => {
    // Keep the orbit target near the cluster so it cannot be panned out of reach.
    frameBounds.getCenter(panCenter);
    const limit = Math.max(0.4, frameBounds.getSize(panShift).length() * 0.5);
    panShift.copy(controls.target).sub(panCenter);
    const len = panShift.length();
    if (len > limit) {
      panShift.multiplyScalar(1 - limit / len);
      controls.target.sub(panShift);
      camera.position.sub(panShift);
    }
    invalidate();
  });

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (autoFrame) frame({ animate: false });
    invalidate();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  function loop(now) {
    if (disposed) return;
    rafId = requestAnimationFrame(loop);
    const dt = Math.min((now - (lastTime || now)) / 1000, 0.1);
    lastTime = now;

    let needsRender = dirty;
    dirty = false;

    if (tween) {
      tween.t = Math.min(1, tween.t + dt / tween.duration);
      const k = easeInOutCubic(tween.t);
      camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
      if (tween.t >= 1) tween = null;
      needsRender = true;
    }

    if (step(dt)) needsRender = true;
    if (controls.update()) needsRender = true;
    if (needsRender) renderer.render(scene, camera);
  }
  rafId = requestAnimationFrame(loop);

  /** Renders a PNG data URL at `scale` times the on-screen size (capped at 4096 px). */
  function snapshot({ scale = 2, transparent = false } = {}) {
    const size = renderer.getSize(new THREE.Vector2());
    const prevRatio = renderer.getPixelRatio();
    const prevBackground = scene.background;
    const factor = Math.min(scale, 4096 / Math.max(size.x, size.y));

    renderer.setPixelRatio(1);
    renderer.setSize(Math.round(size.x * factor), Math.round(size.y * factor), false);
    if (transparent) scene.background = null;
    renderer.render(scene, camera);
    const url = canvas.toDataURL('image/png');

    scene.background = prevBackground;
    renderer.setPixelRatio(prevRatio);
    renderer.setSize(size.x, size.y, false);
    renderer.render(scene, camera);
    return url;
  }

  function dispose() {
    disposed = true;
    cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    controls.dispose();
    envTarget.dispose();
    pegGeo.dispose();
    plateGeo.dispose();
    propMat.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    if (canvas.parentNode === container) container.removeChild(canvas);
  }

  return {
    scene,
    camera,
    renderer,
    controls,
    canvas,
    invalidate,
    setBackground,
    setView,
    refit,
    frame,
    snapshot,
    dispose,
  };
}
