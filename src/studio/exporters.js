import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { blenderScene } from '../keyset/blenderScene.js';
import { BACKGROUNDS } from './constants.js';
import { buildClip } from './animation.js';
import { buildStudioScene } from './builder.js';
import { serializeDoc } from './doc.js';

export const FORMAT_INFO = {
  glb: { label: 'GLB', ext: 'glb', mime: 'model/gltf-binary', note: 'Web, AR, Blender, Unity. Keeps materials, lights, cameras and animation.' },
  gltf: { label: 'glTF', ext: 'gltf', mime: 'model/gltf+json', note: 'Same as GLB as readable JSON.' },
  obj: { label: 'OBJ', ext: 'obj', mime: 'text/plain', note: 'Geometry only, for any 3D app.' },
  stl: { label: 'STL', ext: 'stl', mime: 'model/stl', note: '3D printing, geometry only.' },
  blend: { label: 'Blender script', ext: 'py', mime: 'text/x-python', note: 'Self-contained Blender scene with Cycles materials; run it to render or save a .blend.' },
  json: { label: 'Project', ext: 'mocha.json', mime: 'application/json', note: 'Save the scene to reopen and keep editing.' },
};

function gltfData(root, binary, animations) {
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(root, resolve, reject, { binary, onlyVisible: true, animations });
  });
}

function exportRoot(doc) {
  const built = buildStudioScene(doc, { editor: false });
  built.root.traverse((o) => {
    if (o.isMesh && !o.geometry.index) {
      const old = o.geometry;
      o.geometry = mergeVertices(old, 1e-5);
      old.dispose();
    }
  });
  built.root.updateMatrixWorld(true);
  return built;
}

const safe = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'scene';

/** Exports the document. Returns { blob, filename, info }. */
export async function exportStudio(format, doc, { quality = 'high' } = {}) {
  const info = FORMAT_INFO[format];
  if (!info) throw new Error(`Unsupported format: ${format}`);
  const filename = `${safe(doc.name)}_${Date.now()}.${info.ext}`;
  if (format === 'json') return { blob: new Blob([serializeDoc(doc)], { type: info.mime }), filename, info };

  const built = exportRoot(doc);
  try {
    const clip = buildClip(doc, built.nodes);
    const clips = clip ? [clip] : [];
    if (format === 'glb' || format === 'gltf') {
      const data = await gltfData(built.root, format === 'glb', clips);
      return { blob: new Blob([format === 'glb' ? data : JSON.stringify(data)], { type: info.mime }), filename, info };
    }
    if (format === 'obj') return { blob: new Blob([new OBJExporter().parse(built.root)], { type: info.mime }), filename, info };
    if (format === 'stl') return { blob: new Blob([new STLExporter().parse(built.root, { binary: true })], { type: info.mime }), filename, info };
    // blender: the GLB in metres plus a studio render setup
    const glb = await gltfData(built.root, true, clips);
    const bounds = new THREE.Box3().setFromObject(built.root);
    const mm = new THREE.Box3(bounds.min.clone().multiplyScalar(1000), bounds.max.clone().multiplyScalar(1000));
    const hasRig = doc.objects.some((o) => o.type === 'camera' || o.type.startsWith('light:'));
    const py = blenderScene({ backdrop: 'black' }, glb, mm, {
      quality,
      backdropHex: (BACKGROUNDS[doc.world.bg] ?? BACKGROUNDS.dark).color,
      keepRig: hasRig,
      title: `Mocha 3D Studio (${doc.name})`,
    });
    return { blob: new Blob([py], { type: info.mime }), filename, info };
  } finally {
    built.dispose();
  }
}
