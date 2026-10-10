import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { applyTime, poseRest } from './animation.js';
import { BACKGROUNDS, SNAP } from './constants.js';
import { buildStudioScene } from './builder.js';

const RAD = Math.PI / 180;
const SELECT_COLOR = 0xff8a1f;

/**
 * The 3D view of the editor: orbit camera, move / rotate / scale handles with snapping,
 * click picking, solid / material / wireframe shading, grid, axis gizmo and keyframe playback.
 * Render-on-demand; it follows the store and rebuilds the three.js scene when the document changes.
 */
export function createStudioViewport(container, store) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.setAttribute('aria-hidden', 'true');
  container.replaceChildren(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 500);
  camera.position.set(6, 4.5, 8);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.6, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.update();

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const ambient = new THREE.HemisphereLight(0xffffff, 0x444455, 0.35);
  scene.add(ambient);

  // grid + coloured axes (red X, blue Z) like Blender
  const grid = new THREE.GridHelper(40, 40, 0x555a63, 0x30343a);
  grid.material.transparent = true;
  grid.material.opacity = 0.7;
  const axes = new THREE.Group();
  const axisLine = (a, b, color) => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color }));
  };
  axes.add(axisLine([-20, 0.002, 0], [20, 0.002, 0], 0xc0392b), axisLine([0, 0.002, -20], [0, 0.002, 20], 0x2f6fd1));
  scene.add(grid, axes);

  const viewHelper = new ViewHelper(camera, canvas);
  viewHelper.center = controls.target;
  viewHelper.location = { top: null, right: 12, bottom: 12, left: null };

  const solidMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.6, metalness: 0 });
  const wireMat = new THREE.MeshBasicMaterial({ color: 0xcfd4dc, wireframe: true });

  const tc = new TransformControls(camera, canvas);
  tc.setSize(0.85);
  const tcHelper = tc.getHelper();
  scene.add(tcHelper);
  const pivot = new THREE.Object3D();
  pivot.name = '__pivot';
  scene.add(pivot);
  const selBoxes = new THREE.Group();
  scene.add(selBoxes);

  let built = null;
  let lastDoc = null;
  let lastTool = null;
  let lastSelKey = '';
  let lastTime = -1;
  let wasPlaying = false;
  let dirty = true;
  let disposed = false;
  let rafId = 0;
  let dragging = false;
  let startPivot = new THREE.Matrix4();
  let startMats = [];
  let playStart = 0;
  let playFrom = 0;
  let prevFrame = performance.now();
  const invalidate = () => {
    dirty = true;
  };

  // ---------------------------------------------------------------- build
  function rebuild(doc) {
    const prev = built;
    if (prev) {
      scene.remove(prev.root);
      prev.dispose();
    }
    built = buildStudioScene(doc, { editor: true });
    scene.add(built.root);
    const bg = BACKGROUNDS[doc.world.bg] ?? BACKGROUNDS.dark;
    scene.background = new THREE.Color(bg.color);
    scene.environmentIntensity = doc.world.env;
    ambient.intensity = doc.world.ambient;
    renderer.shadowMap.enabled = doc.world.shadows;
    grid.visible = doc.world.grid;
    axes.visible = doc.world.grid;
    lastTime = -1; // re-pose keyed objects
    invalidate();
  }

  // ------------------------------------------------------------- selection
  function nodesOf(ids) {
    return ids.map((id) => built?.nodes.get(id)).filter(Boolean);
  }

  function refreshSelection(state) {
    selBoxes.children.forEach((c) => {
      c.geometry?.dispose();
      c.material?.dispose();
    });
    selBoxes.clear();
    for (const node of nodesOf(state.selection)) {
      const box = new THREE.Box3();
      node.traverse((o) => {
        if (o.isMesh && !o.userData.helper) {
          o.geometry.computeBoundingBox();
          box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
        }
      });
      if (box.isEmpty()) box.setFromCenterAndSize(node.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(0.6, 0.6, 0.6));
      const h = new THREE.Box3Helper(box, SELECT_COLOR);
      h.userData.node = node;
      selBoxes.add(h);
    }
    attachGizmo(state);
    invalidate();
  }

  function attachGizmo(state) {
    const nodes = nodesOf(state.selection);
    const locked = state.doc.objects.some((o) => state.selection.includes(o.id) && o.locked);
    if (!nodes.length || state.tool === 'select' || locked) {
      tc.detach();
      return;
    }
    tc.setMode(state.tool === 'move' ? 'translate' : state.tool === 'rotate' ? 'rotate' : 'scale');
    tc.setSpace(state.space);
    tc.setTranslationSnap(state.snap ? SNAP.move : null);
    tc.setRotationSnap(state.snap ? SNAP.rotate * RAD : null);
    tc.setScaleSnap(state.snap ? SNAP.scale : null);
    if (nodes.length === 1) {
      tc.attach(nodes[0]);
    } else {
      const c = new THREE.Vector3();
      nodes.forEach((n) => c.add(n.getWorldPosition(new THREE.Vector3())));
      c.divideScalar(nodes.length);
      pivot.position.copy(c);
      pivot.quaternion.identity();
      pivot.scale.set(1, 1, 1);
      pivot.updateMatrixWorld(true);
      tc.attach(pivot);
    }
  }

  tc.addEventListener('dragging-changed', (e) => {
    controls.enabled = !e.value;
    dragging = e.value;
    const state = store.getState();
    if (e.value) {
      pivot.updateMatrixWorld(true);
      startPivot = pivot.matrixWorld.clone();
      startMats = nodesOf(state.selection).map((n) => n.matrixWorld.clone());
    } else {
      commitTransforms();
    }
  });
  tc.addEventListener('objectChange', () => {
    const state = store.getState();
    if (state.selection.length > 1 && tc.object === pivot) {
      pivot.updateMatrixWorld(true);
      const delta = pivot.matrixWorld.clone().multiply(startPivot.clone().invert());
      nodesOf(state.selection).forEach((n, i) => {
        const world = delta.clone().multiply(startMats[i]);
        const local = n.parent ? n.parent.matrixWorld.clone().invert().multiply(world) : world;
        local.decompose(n.position, n.quaternion, n.scale);
      });
    }
    invalidate();
  });

  function commitTransforms() {
    const state = store.getState();
    const patches = nodesOf(state.selection).map((n) => {
      const e = new THREE.Euler().setFromQuaternion(n.quaternion, 'XYZ');
      const round = (v) => Math.round(v * 10000) / 10000;
      return {
        id: n.userData.id,
        pos: [n.position.x, n.position.y, n.position.z].map(round),
        rot: [e.x / RAD, e.y / RAD, e.z / RAD].map((v) => Math.round(v * 100) / 100),
        scale: [n.scale.x, n.scale.y, n.scale.z].map(round),
      };
    });
    if (patches.length) store.updateMany(patches);
  }

  // --------------------------------------------------------------- picking
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;

  function pick(e) {
    if (!built) return null;
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObject(built.root, true);
    const doc = store.getState().doc;
    for (const h of hits) {
      const id = h.object.userData.id;
      const o = id && doc.objects.find((x) => x.id === id);
      if (o && !o.locked && o.visible) return id;
    }
    return null;
  }

  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, axis: tc.axis };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || e.button !== 0) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4;
    const hadAxis = down.axis;
    down = null;
    if (moved || dragging || hadAxis) return;
    if (viewHelper.handleClick(e)) {
      invalidate();
      return;
    }
    const id = pick(e);
    if (id) {
      if (e.shiftKey || e.ctrlKey || e.metaKey) store.toggleSelect(id);
      else store.select([id]);
    } else if (!e.shiftKey) {
      store.clearSelection();
    }
  });
  controls.addEventListener('change', invalidate);

  // ----------------------------------------------------------- state sync
  function sync() {
    const state = store.getState();
    if (state.doc !== lastDoc) {
      lastDoc = state.doc;
      rebuild(state.doc);
      lastSelKey = '';
    }
    const selKey = `${state.selection.join(',')}|${state.tool}|${state.space}|${state.snap}|${state.doc.objects.map((o) => o.locked).join('')}`;
    if (selKey !== lastSelKey || state.tool !== lastTool) {
      lastSelKey = selKey;
      lastTool = state.tool;
      refreshSelection(state);
    }
    const scn = state.shading;
    scene.overrideMaterial = scn === 'solid' ? solidMat : scn === 'wire' ? wireMat : null;

    if (state.playing && !wasPlaying) {
      playStart = performance.now();
      playFrom = state.time;
    }
    wasPlaying = state.playing;
    let t = state.time;
    if (state.playing) {
      const dur = state.doc.time.duration;
      let el = playFrom + (performance.now() - playStart) / 1000;
      if (el >= dur) {
        if (state.doc.time.loop) {
          el %= dur;
          playStart = performance.now();
          playFrom = el;
        } else {
          el = dur;
          store.setView({ playing: false, time: dur });
        }
      }
      t = el;
      if (Math.abs(t - state.time) > 0.03) store.setView({ time: t });
    }
    if (built && (t !== lastTime || state.playing)) {
      lastTime = t;
      if (state.doc.objects.some((o) => o.keys.length > 1)) applyTime(state.doc, built.nodes, t);
      else if (!dragging) poseRest(state.doc, built.nodes);
      built.root.updateMatrixWorld(true);
      dirty = true;
    }
    return state;
  }

  const unsub = store.subscribe(() => {
    invalidate();
  });

  function updateSelBoxes() {
    for (const h of selBoxes.children) {
      const node = h.userData.node;
      const box = new THREE.Box3();
      node.updateWorldMatrix(true, true);
      node.traverse((o) => {
        if (o.isMesh && !o.userData.helper) {
          o.geometry.computeBoundingBox();
          box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
        }
      });
      if (box.isEmpty()) box.setFromCenterAndSize(node.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(0.6, 0.6, 0.6));
      h.box.copy(box);
    }
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    invalidate();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  function loop() {
    if (disposed) return;
    rafId = requestAnimationFrame(loop);
    const now = performance.now();
    const delta = (now - prevFrame) / 1000;
    prevFrame = now;
    const state = sync();
    if (viewHelper.animating) {
      viewHelper.update(delta);
      dirty = true;
    }
    const moved = controls.update();
    if (dirty || moved || state.playing || dragging) {
      dirty = false;
      updateSelBoxes();
      renderer.autoClear = true;
      renderer.render(scene, camera);
      renderer.autoClear = false;
      viewHelper.render(renderer);
      renderer.autoClear = true;
    }
  }
  rafId = requestAnimationFrame(loop);

  // ------------------------------------------------------------------ API
  function frame(ids = store.getState().selection) {
    const nodes = ids.length ? nodesOf(ids) : built ? [built.root] : [];
    const box = new THREE.Box3();
    nodes.forEach((n) => {
      n.traverse((o) => {
        if (o.isMesh && !o.userData.helper) {
          o.geometry.computeBoundingBox();
          box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
        }
      });
    });
    if (box.isEmpty()) box.setFromCenterAndSize(new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(2, 2, 2));
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const dist = Math.max(size.length() * 1.1, 1.5) / Math.tan((camera.fov * RAD) / 2) / 1.6;
    const dir = camera.position.clone().sub(controls.target).normalize();
    controls.target.copy(centre);
    camera.position.copy(centre).addScaledVector(dir, dist);
    controls.update();
    invalidate();
  }

  function setView(dir) {
    const d = controls.target.distanceTo(camera.position);
    const v = { front: [0, 0, 1], back: [0, 0, -1], right: [1, 0, 0], left: [-1, 0, 0], top: [0, 1, 0.0001], bottom: [0, -1, 0.0001], iso: [0.62, 0.45, 0.78] }[dir];
    if (!v) return;
    camera.position.copy(controls.target).addScaledVector(new THREE.Vector3(...v).normalize(), d);
    controls.update();
    invalidate();
  }

  /** PNG / JPG blob of the current view (or the first scene camera) at `scale` times the screen size. */
  async function snapshot({ scale = 2, transparent = false, format = 'png', quality = 0.92, sceneCamera = false } = {}) {
    const size = renderer.getSize(new THREE.Vector2());
    const prevRatio = renderer.getPixelRatio();
    const factor = Math.min(scale, 4096 / Math.max(size.x, size.y));
    const w = Math.round(size.x * factor);
    const h = Math.round(size.y * factor);
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    const keepBg = scene.background;
    const hidden = [grid, axes, tcHelper, selBoxes];
    const vis = hidden.map((o) => o.visible);
    hidden.forEach((o) => (o.visible = false));
    const proxies = [];
    built.root.traverse((o) => {
      if (o.userData.helper) proxies.push([o, o.visible]);
    });
    proxies.forEach(([o]) => (o.visible = false));
    if (transparent && format !== 'jpeg') {
      scene.background = null;
      renderer.setClearColor(0x000000, 0);
    }
    let cam = camera;
    const camObj = sceneCamera ? store.getState().doc.objects.find((o) => o.type === 'camera') : null;
    if (camObj && built.nodes.get(camObj.id)) {
      cam = built.nodes.get(camObj.id);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
    renderer.autoClear = true;
    renderer.render(scene, cam);
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    out.getContext('2d').drawImage(canvas, 0, 0, w, h);
    scene.background = keepBg;
    hidden.forEach((o, i) => (o.visible = vis[i]));
    proxies.forEach(([o, v]) => (o.visible = v));
    renderer.setPixelRatio(prevRatio);
    renderer.setSize(size.x, size.y, false);
    invalidate();
    return new Promise((resolve, reject) =>
      out.toBlob((b) => (b ? resolve(b) : reject(new Error('Image export failed'))), format === 'jpeg' ? 'image/jpeg' : 'image/png', quality)
    );
  }

  function dispose() {
    disposed = true;
    cancelAnimationFrame(rafId);
    unsub();
    ro.disconnect();
    tc.dispose();
    controls.dispose();
    viewHelper.dispose?.();
    built?.dispose();
    envTex.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    if (canvas.parentNode === container) container.removeChild(canvas);
  }

  return { frame, setView, snapshot, invalidate, dispose, get camera() { return camera; }, get nodes() { return built?.nodes ?? new Map(); } };
}
