import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bakeClips } from '../tagbuilder/animation.js';
import { buildKeySet } from './builder.js';
import { blenderScene } from './blenderScene.js';
import { LIGHTING } from './constants.js';

export const FORMAT_INFO = {
  gltf: { label: 'GLTF', ext: 'gltf', mime: 'model/gltf+json', note: 'Recommended. Charms, lights, camera and the chosen loop embedded; opens in Blender, three.js and glTF viewers.' },
  glb: { label: 'GLB', ext: 'glb', mime: 'model/gltf-binary', note: 'Single binary file for web and AR. Some viewers ignore the embedded lights.' },
  blend: { label: 'Blender', ext: 'py', mime: 'text/x-python', note: 'Self-contained Blender script: Cycles glass and chrome, softbox lights, camera and turntable. Run it in Blender to render or save a .blend.' },
};

function gltfData(root, binary, animations) {
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(root, resolve, reject, { binary, onlyVisible: true, animations });
  });
}

/** Key / fill / rim lights and a camera travel with the model (KHR_lights_punctual + a glTF camera). */
export function addStudioRig(root, bounds, lighting) {
  const k = LIGHTING[lighting] ?? LIGHTING.studio;
  const mk = (name, color, intensity, pos) => {
    const l = new THREE.DirectionalLight(color, intensity);
    l.name = name;
    l.position.set(...pos);
    l.lookAt(0, 0, 0);
    root.add(l);
  };
  mk('Mocha_KeyLight', 0xfff4e6, 3 * (k.key / 1.5), [-180, 220, 320]);
  mk('Mocha_FillLight', 0xdbe8ff, 1.2 * (k.env / 1.9), [260, 40, 220]);
  mk('Mocha_RimLight', 0xffffff, 2 * (k.key / 1.5), [0, 200, -260]);
  const size = bounds.getSize(new THREE.Vector3());
  const centre = bounds.getCenter(new THREE.Vector3());
  const cam = new THREE.PerspectiveCamera(28, Math.max(0.4, size.x / size.y), 0.01, 20);
  const dist = (Math.max(size.y / 2, size.x / 2 / Math.max(0.5, size.x / size.y)) / Math.tan((14 * Math.PI) / 180)) * 1.2 + size.z;
  cam.name = 'Mocha_Camera';
  cam.position.set(centre.x + dist * 0.12, centre.y + dist * 0.06, centre.z + dist);
  cam.lookAt(centre);
  root.add(cam);
}

function buildForExport(design, withRig) {
  const kc = buildKeySet(design);
  if (withRig) addStudioRig(kc.group, kc.bounds, design.lighting);
  // ExtrudeGeometry is non-indexed; welding identical vertices keeps files several times smaller
  kc.group.traverse((o) => {
    if (o.isMesh && !o.geometry.index) {
      const old = o.geometry;
      o.geometry = mergeVertices(old, 1e-4);
      old.dispose();
    }
  });
  kc.group.scale.setScalar(0.001);
  kc.group.updateMatrixWorld(true);
  return kc;
}

/** Exports the set. `format` is 'gltf' | 'glb' | 'blend'. Returns { blob, filename, info }. */
export async function exportKeySet(format, design, { anim = 'none', stamp = Date.now(), blender = {} } = {}) {
  const info = FORMAT_INFO[format];
  if (!info) throw new Error(`Unsupported format: ${format}`);
  const kc = buildForExport(design, format !== 'blend');
  const filename = `mocha_key_set_${stamp}.${info.ext}`;
  try {
    const clips = bakeClips(kc, anim);
    if (format === 'blend') {
      const glb = await gltfData(kc.group, true, clips);
      return { blob: new Blob([blenderScene(design, glb, kc.bounds, blender)], { type: info.mime }), filename, info };
    }
    const data = await gltfData(kc.group, format === 'glb', clips);
    const body = format === 'glb' ? data : JSON.stringify(data);
    return { blob: new Blob([body], { type: info.mime }), filename, info };
  } finally {
    kc.dispose();
  }
}
