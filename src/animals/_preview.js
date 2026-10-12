// Dev-only lean preview used while sculpting. Not imported by the app.
import * as THREE from 'three';
import { buildAnimal } from './builder.js';
import { buildClips } from './clips.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d7dae0');
scene.add(new THREE.HemisphereLight('#ffffff', '#8a8f99', 1.4));
const key = new THREE.DirectionalLight('#fff4e5', 2.2);
key.position.set(2, 4, 3);
scene.add(key);
const rim = new THREE.DirectionalLight('#cfe0ff', 1.0);
rim.position.set(-3, 2, -2);
scene.add(rim);
const ground = new THREE.Mesh(new THREE.CircleGeometry(6, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#c3c6cd', roughness: 1 }));
scene.add(ground);
const cam = new THREE.PerspectiveCamera(30, 760 / 520, 0.05, 50);
let rig = null;
let clips = null;
let mixer = null;

window.load = (id, clip = 'idle', t = 0) => {
  if (rig) { scene.remove(rig.root); rig.dispose(); }
  const t0 = performance.now();
  rig = buildAnimal(id);
  window.buildMs = Math.round(performance.now() - t0);
  scene.add(rig.root);
  window.rig = rig;
  clips = buildClips(rig);
  mixer = new THREE.AnimationMixer(rig.root);
  const a = mixer.clipAction(clips[clip]);
  a.play();
  mixer.setTime(t);
  rig.root.updateMatrixWorld(true);
  let tris = 0;
  rig.root.traverse((o) => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  window.tris = tris;
  return { ms: window.buildMs, tris };
};
window.shot = (az, el, dist = 2.3, tx = null) => {
  const b = new THREE.Box3().setFromObject(rig.root);
  const c = b.getCenter(new THREE.Vector3());
  const r = b.getSize(new THREE.Vector3()).length() / 2;
  const d = r * dist;
  const a = (az * Math.PI) / 180;
  const e = (el * Math.PI) / 180;
  if (tx) c.set(tx[0], tx[1], tx[2]);
  cam.position.set(c.x + d * Math.sin(a) * Math.cos(e), c.y + d * Math.sin(e), c.z + d * Math.cos(a) * Math.cos(e));
  cam.lookAt(c);
  ground.position.y = b.min.y - 0.001;
  renderer.render(scene, cam);
  return true;
};
window.ready = true;
