import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const BACKGROUNDS = {
  black: { label: 'Black', color: '#0a0a0a', shadow: 0.0 },
  studio: { label: 'Studio', color: '#e9e4da', shadow: 0.28 },
  paper: { label: 'Kraft', color: '#c9b08a', shadow: 0.3 },
  blue: { label: 'Blue', color: '#2f4cff', shadow: 0.3 },
};

/** Orbit preview for a single sticker or a whole sheet; stickers sit just above a shadow-catching wall. */
export function createStickerStage(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.005, 20);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
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
  scene.environmentIntensity = 0.6;

  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(0.12, 0.2, 0.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0002;
  scene.add(sun, sun.target);

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShadowMaterial({ opacity: 0.3 }));
  wall.position.z = -0.004;
  wall.receiveShadow = true;
  scene.add(wall);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.92;

  let current = null; // { root, dispose, extent:{w,h} }
  let radius = 0.1;
  let fit = 1.3;
  let spin = false;
  let t0 = performance.now();
  let raf = 0;
  let disposed = false;

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  function frame() {
    const dist = (radius / Math.tan((camera.fov * Math.PI) / 360)) * (camera.aspect < 1 ? fit / camera.aspect : fit);
    camera.position.set(dist * 0.18, dist * 0.12, dist);
    controls.target.set(0, 0, 0);
    controls.minDistance = radius * 0.4;
    controls.maxDistance = dist * 3;
    camera.near = dist / 200;
    camera.far = dist * 20;
    camera.updateProjectionMatrix();
    controls.update();
  }

  function setModel(model, { extent } = {}) {
    if (current) {
      scene.remove(current.root);
      current.dispose?.();
    }
    current = model;
    if (!model) return;
    fit = extent ? 1.02 : 1.3;
    scene.add(model.root);
    const box = new THREE.Box3().setFromObject(model.root);
    const size = box.getSize(new THREE.Vector3());
    radius = Math.max(extent ? Math.max(extent.w, extent.h) / 2 : 0, Math.max(size.x, size.y) / 2, 0.02);
    wall.scale.setScalar(Math.max(1, radius * 14));
    sun.shadow.camera.left = sun.shadow.camera.bottom = -radius * 1.6;
    sun.shadow.camera.right = sun.shadow.camera.top = radius * 1.6;
    sun.shadow.camera.near = 0.001;
    sun.shadow.camera.far = radius * 12;
    sun.shadow.camera.updateProjectionMatrix();
    sun.position.set(radius * 0.7, radius * 1.2, radius * 2.2);
    frame();
  }

  function setBackground(id) {
    const b = BACKGROUNDS[id] ?? BACKGROUNDS.black;
    scene.background = new THREE.Color(b.color);
    wall.material.opacity = b.shadow;
    wall.visible = b.shadow > 0;
  }
  setBackground('black');

  function loop() {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    if (spin && current) current.root.rotation.y = Math.sin((performance.now() - t0) / 1600) * 0.5;
    controls.update();
    renderer.render(scene, camera);
  }
  loop();

  return {
    setModel,
    setBackground,
    frame,
    camera,
    controls,
    scene,
    setSpin(v) {
      spin = v;
      if (!v && current) current.root.rotation.y = 0;
      t0 = performance.now();
    },
    snapshot(scale = 2, mime = 'image/png') {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setPixelRatio(scale);
      renderer.setSize(w, h, false);
      renderer.render(scene, camera);
      return new Promise((resolve) => {
        canvas.toBlob((b) => {
          resize();
          resolve(b);
        }, mime, 0.92);
      });
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      if (current) current.dispose?.();
      wall.geometry.dispose();
      wall.material.dispose();
      scene.environment?.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
