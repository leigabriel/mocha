import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { bakeClips } from './animation.js';
import { buildPack } from './builder.js';
import { LIGHTING } from './constants.js';

export const FORMAT_INFO = {
  gltf: { label: 'GLTF', ext: 'gltf', mime: 'model/gltf+json', note: 'Recommended. Pictures, lights, camera and spin loop embedded; opens in Blender, three.js and glTF viewers.' },
  glb: { label: 'GLB', ext: 'glb', mime: 'model/gltf-binary', note: 'Single binary file for web and AR. Some viewers ignore the embedded lights.' },
};

function gltfData(root, binary, animations) {
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(root, resolve, reject, { binary, onlyVisible: true, animations });
  });
}

/**
 * Lights and a camera travel with the model (KHR_lights_punctual + a glTF camera). A GLB
 * cannot carry an environment map, so reflections come from the viewer's own environment;
 * these lights add the key, fill and rim shape on top.
 */
function addStudioRig(root, bounds, lighting) {
  const k = LIGHTING[lighting] ?? LIGHTING.studio;
  const mk = (name, color, intensity, pos) => {
    const l = new THREE.DirectionalLight(color, intensity);
    l.name = name;
    l.position.set(...pos);
    l.lookAt(0, 0, 0);
    root.add(l);
  };
  mk('Mocha_KeyLight', 0xfff4e6, 3 * (k.key / 0.9), [-180, 220, 320]);
  mk('Mocha_FillLight', 0xdbe8ff, 1.2 * (k.env), [260, 40, 220]);
  mk('Mocha_RimLight', 0xffffff, 2 * (k.key / 0.9), [0, 200, -260]);
  const size = bounds.getSize(new THREE.Vector3());
  const centre = bounds.getCenter(new THREE.Vector3());
  const cam = new THREE.PerspectiveCamera(28, size.x / size.y, 1, 6000);
  const dist = (Math.max(size.y / 2, size.x / 2 / Math.max(0.5, size.x / size.y)) / Math.tan((14 * Math.PI) / 180)) * 1.2 + size.z;
  cam.name = 'Mocha_Camera';
  cam.position.set(centre.x + dist * 0.12, centre.y + dist * 0.06, centre.z + dist);
  cam.lookAt(centre);
  root.add(cam);
}

/** Builds a fresh pack (in metres) and exports it as GLB / GLTF with the chosen loop(s). */
export async function exportPackModel(format, design, images, { anim = 'none', stamp = Date.now() } = {}) {
  const info = FORMAT_INFO[format];
  if (!info) throw new Error(`Unsupported format: ${format}`);
  const kc = buildPack(design, images);
  addStudioRig(kc.group, kc.bounds, design.lighting);
  kc.group.scale.setScalar(0.001);
  kc.group.updateMatrixWorld(true);
  try {
    const clips = bakeClips(kc, anim);
    const data = await gltfData(kc.group, format === 'glb', clips);
    const body = format === 'glb' ? data : JSON.stringify(data);
    return { blob: new Blob([body], { type: info.mime }), filename: `mocha_stamp_pack_${stamp}.${info.ext}`, info };
  } finally {
    kc.dispose();
  }
}
