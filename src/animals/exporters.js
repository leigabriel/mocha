import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { buildAnimal } from './builder.js';
import { buildClips } from './clips.js';

export const FORMAT_INFO = {
  glb: { label: 'GLB', ext: 'glb', mime: 'model/gltf-binary', note: 'One file with the model and every animation clip.' },
  gltf: { label: 'glTF', ext: 'gltf', mime: 'model/gltf+json', note: 'Same content as JSON with embedded data.' },
};

/**
 * Builds a fresh rig in its rest pose (so the file never inherits a demo pose) and writes it with
 * every animation clip (or just `only`) as glTF animations.
 */
export async function exportAnimal(format, id, settings = {}, { only = null, stamp = Date.now() } = {}) {
  const info = FORMAT_INFO[format];
  if (!info) throw new Error(`Unsupported format: ${format}`);
  const rig = buildAnimal(id, settings);
  try {
    const all = buildClips(rig);
    const clips = Object.entries(all).filter(([k]) => !only || only.includes(k)).map(([, c]) => c);
    const data = await new Promise((resolve, reject) => {
      new GLTFExporter().parse(rig.root, resolve, reject, { binary: format === 'glb', onlyVisible: true, animations: clips });
    });
    const body = format === 'glb' ? data : JSON.stringify(data);
    return { blob: new Blob([body], { type: info.mime }), filename: `mocha_${id}_${stamp}.${info.ext}`, info, clips: clips.map((c) => c.name) };
  } finally {
    rig.dispose();
  }
}

/** Puts every bone back to its rest transform. */
export function poseRest(rig) {
  for (const [name, b] of rig.bones) {
    const r = rig.rest.get(name);
    b.position.set(...r.pos);
    b.rotation.set(r.rot[0], r.rot[1], r.rot[2], 'ZYX');
    b.scale.set(1, 1, 1);
  }
  rig.root.position.set(0, 0, 0);
}

