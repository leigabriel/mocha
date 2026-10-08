import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { bakeClips } from './animation.js';
import { buildPack } from './builder.js';

export const FORMAT_INFO = {
  glb: { label: 'GLB', ext: 'glb', mime: 'model/gltf-binary', note: 'Web, AR, Blender, Unity. Pictures are embedded as textures.' },
  gltf: { label: 'GLTF', ext: 'gltf', mime: 'model/gltf+json', note: 'Same model as readable JSON with embedded textures.' },
};

function gltfData(root, binary, animations) {
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(root, resolve, reject, { binary, onlyVisible: true, animations });
  });
}

/** Builds a fresh pack (in metres) and exports it as GLB / GLTF with the chosen loop(s). */
export async function exportPackModel(format, design, images, { anim = 'none', stamp = Date.now() } = {}) {
  const info = FORMAT_INFO[format];
  if (!info) throw new Error(`Unsupported format: ${format}`);
  const kc = buildPack(design, images);
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
