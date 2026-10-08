import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { bakeClips } from './animation.js';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';
import { strToU8, zipSync } from 'three/examples/jsm/libs/fflate.module.js';
import { buildKeychain } from './builder.js';
import { blenderScript } from './blenderScript.js';

export const FORMAT_INFO = {
  glb: { label: 'GLB', ext: 'glb', mime: 'model/gltf-binary', note: 'Web, AR, Blender, Unity. Keeps colours, glass and metal.' },
  gltf: { label: 'GLTF', ext: 'gltf', mime: 'model/gltf+json', note: 'Same as GLB as readable JSON.' },
  obj: { label: 'OBJ', ext: 'obj', mime: 'text/plain', note: 'Geometry only (millimetres), for any 3D app.' },
  stl: { label: 'STL', ext: 'stl', mime: 'model/stl', note: '3D printing, geometry only (millimetres).' },
  ply: { label: 'PLY', ext: 'ply', mime: 'application/octet-stream', note: 'Geometry only, for scan and mesh tools.' },
  usdz: { label: 'USDZ', ext: 'usdz', mime: 'model/vnd.usdz+zip', note: 'iPhone AR Quick Look and Apple tools.' },
  '3mf': { label: '3MF', ext: '3mf', mime: 'model/3mf', note: 'Multi-colour 3D printing (millimetres).' },
  blend: { label: 'Blender script', ext: 'py', mime: 'text/x-python', note: 'Opens in Blender: imports the model and sets up a studio render.' },
};

/** Builds a fresh export scene (no highlight, no helpers). `unitScale` converts mm. */
export function prepareExportRoot(design, unitScale = 1) {
  const kc = buildKeychain(design);
  kc.group.scale.setScalar(unitScale);
  kc.group.updateMatrixWorld(true);
  return kc;
}

const toBlob = (data, mime) => new Blob([data], { type: mime });

function gltfData(root, binary, animations = []) {
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(root, resolve, reject, { binary, onlyVisible: true, animations });
  });
}

// ------------------------------------------------------- welded world meshes

const hex2 = (n) => n.toString(16).padStart(2, '0');
const esc = (s) => String(s).replace(/[<>&"']/g, '_');

/**
 * Collects every mesh in world space with welded vertices (shared corners), which keeps
 * OBJ / PLY / 3MF small and lets slicers see connected surfaces.
 */
export function collectMeshes(root) {
  const out = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    const pos = geo.attributes.position;
    const index = geo.index;
    const verts = [];
    const vmap = new Map();
    const tris = [];
    const vid = (i) => {
      const k = `${Math.round(pos.getX(i) * 1000)},${Math.round(pos.getY(i) * 1000)},${Math.round(pos.getZ(i) * 1000)}`;
      let id = vmap.get(k);
      if (id === undefined) {
        id = verts.length;
        vmap.set(k, id);
        verts.push([pos.getX(i), pos.getY(i), pos.getZ(i)]);
      }
      return id;
    };
    const count = index ? index.count : pos.count;
    for (let t = 0; t < count; t += 3) {
      const a = vid(index ? index.getX(t) : t);
      const b = vid(index ? index.getX(t + 1) : t + 1);
      const c = vid(index ? index.getX(t + 2) : t + 2);
      if (a !== b && b !== c && a !== c) tris.push([a, b, c]);
    }
    geo.dispose();
    if (!tris.length) return;
    const m = o.material;
    out.push({
      name: o.name || 'part',
      material: m.name || 'material',
      color: m.color ? [m.color.r, m.color.g, m.color.b].map((c) => Math.round(Math.pow(c, 1 / 2.2) * 255)) : [200, 200, 200],
      hex: m.color ? m.color.getHexString().toUpperCase() : 'C8C8C8',
      alpha: m.transmission > 0.5 ? 0x99 : 0xff,
      verts,
      tris,
    });
  });
  return out;
}

/** Wavefront OBJ with per-vertex colours (v x y z r g b) and one group per part. */
export function buildOBJ(root) {
  const parts = collectMeshes(root);
  const lines = ['# Mocha Tag Builder (millimetres, vertex colours as v x y z r g b)'];
  let base = 1;
  for (const p of parts) {
    lines.push(`g ${esc(p.name)}`);
    const [r, g, b] = p.color.map((c) => (c / 255).toFixed(4));
    for (const v of p.verts) lines.push(`v ${v[0].toFixed(4)} ${v[1].toFixed(4)} ${v[2].toFixed(4)} ${r} ${g} ${b}`);
    for (const t of p.tris) lines.push(`f ${t[0] + base} ${t[1] + base} ${t[2] + base}`);
    base += p.verts.length;
  }
  return lines.join('\n') + '\n';
}

/** Binary little-endian PLY with vertex colours. */
export function buildPLY(root) {
  const parts = collectMeshes(root);
  const nv = parts.reduce((n, p) => n + p.verts.length, 0);
  const nf = parts.reduce((n, p) => n + p.tris.length, 0);
  const header =
    'ply\nformat binary_little_endian 1.0\ncomment Mocha Tag Builder, millimetres\n' +
    `element vertex ${nv}\nproperty float x\nproperty float y\nproperty float z\n` +
    'property uchar red\nproperty uchar green\nproperty uchar blue\n' +
    `element face ${nf}\nproperty list uchar int vertex_indices\nend_header\n`;
  const head = new TextEncoder().encode(header);
  const buf = new ArrayBuffer(head.length + nv * 15 + nf * 13);
  new Uint8Array(buf).set(head);
  const dv = new DataView(buf);
  let o = head.length;
  for (const p of parts) {
    for (const v of p.verts) {
      dv.setFloat32(o, v[0], true); dv.setFloat32(o + 4, v[1], true); dv.setFloat32(o + 8, v[2], true);
      dv.setUint8(o + 12, p.color[0]); dv.setUint8(o + 13, p.color[1]); dv.setUint8(o + 14, p.color[2]);
      o += 15;
    }
  }
  let base = 0;
  for (const p of parts) {
    for (const t of p.tris) {
      dv.setUint8(o, 3);
      dv.setInt32(o + 1, t[0] + base, true); dv.setInt32(o + 5, t[1] + base, true); dv.setInt32(o + 9, t[2] + base, true);
      o += 13;
    }
    base += p.verts.length;
  }
  return buf;
}

/** 3MF package (millimetres, one object per part, base material colours). */
export function build3MF(root) {
  const parts = collectMeshes(root);
  const materials = [];
  const matIndex = new Map();
  for (const p of parts) {
    const color = `#${p.hex}${hex2(p.alpha).toUpperCase()}`;
    const mk = `${color}|${p.material}`;
    if (!matIndex.has(mk)) {
      matIndex.set(mk, materials.length);
      materials.push({ name: p.material, color });
    }
    p.mat = matIndex.get(mk);
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n';
  xml += '<metadata name="Application">Mocha Tag Builder</metadata>\n<resources>\n';
  xml += '<basematerials id="1">\n';
  for (const m of materials) xml += `<base name="${esc(m.name)}" displaycolor="${m.color}"/>\n`;
  xml += '</basematerials>\n';
  parts.forEach((obj, i) => {
    xml += `<object id="${i + 2}" type="model" name="${esc(obj.name)}" pid="1" pindex="${obj.mat}"><mesh><vertices>\n`;
    for (const v of obj.verts) xml += `<vertex x="${v[0].toFixed(4)}" y="${v[1].toFixed(4)}" z="${v[2].toFixed(4)}"/>\n`;
    xml += '</vertices><triangles>\n';
    for (const t of obj.tris) xml += `<triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}"/>\n`;
    xml += '</triangles></mesh></object>\n';
  });
  xml += '</resources>\n<build>\n';
  parts.forEach((_, i) => (xml += `<item objectid="${i + 2}"/>\n`));
  xml += '</build>\n</model>\n';

  const files = {
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'
    ),
    '3D/3dmodel.model': strToU8(xml),
  };
  return { data: zipSync(files, { level: 6 }), objects: parts.length, triangles: parts.reduce((n, p) => n + p.tris.length, 0) };
}

// -------------------------------------------------------------- mesh health

/** Counts open (boundary) and non-manifold edges per part, after welding vertices. */
export function meshHealth(root) {
  let parts = 0;
  let closed = 0;
  let triangles = 0;
  let openEdges = 0;
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    parts++;
    const pos = o.geometry.attributes.position;
    const index = o.geometry.index;
    const count = index ? index.count : pos.count;
    const ids = new Map();
    const id = (i) => {
      const k = `${Math.round(pos.getX(i) * 500)},${Math.round(pos.getY(i) * 500)},${Math.round(pos.getZ(i) * 500)}`;
      if (!ids.has(k)) ids.set(k, ids.size);
      return ids.get(k);
    };
    const edges = new Map();
    const bump = (a, b) => {
      const k = a < b ? `${a}_${b}` : `${b}_${a}`;
      edges.set(k, (edges.get(k) ?? 0) + 1);
    };
    for (let t = 0; t < count; t += 3) {
      const a = id(index ? index.getX(t) : t);
      const b = id(index ? index.getX(t + 1) : t + 1);
      const c = id(index ? index.getX(t + 2) : t + 2);
      if (a === b || b === c || a === c) continue;
      triangles++;
      bump(a, b); bump(b, c); bump(c, a);
    }
    let bad = 0;
    for (const n of edges.values()) if (n !== 2) bad++;
    openEdges += bad;
    if (bad === 0) closed++;
  });
  return { parts, closed, triangles, openEdges };
}

// ------------------------------------------------------------------- driver

/** Exports `design` in `format`. Returns { blob, filename, info }. */
export async function exportModel(format, design, { stamp = Date.now(), anim = 'none' } = {}) {
  const info = FORMAT_INFO[format];
  if (!info) throw new Error(`Unsupported format: ${format}`);
  const metres = format === 'glb' || format === 'gltf' || format === 'usdz';
  const kc = prepareExportRoot(design, metres ? 0.001 : 1);
  const filename = `mocha_tag_keychain_${stamp}.${info.ext}`;
  try {
    let data;
    switch (format) {
      case 'glb':
        data = await gltfData(kc.group, true, bakeClips(kc, anim));
        break;
      case 'gltf':
        data = JSON.stringify(await gltfData(kc.group, false, bakeClips(kc, anim)), null, 2);
        break;
      case 'obj':
        data = buildOBJ(kc.group);
        break;
      case 'stl':
        data = new STLExporter().parse(kc.group, { binary: true });
        break;
      case 'ply':
        data = buildPLY(kc.group);
        break;
      case 'usdz':
        data = await new USDZExporter().parseAsync(kc.group);
        break;
      case '3mf':
        data = build3MF(kc.group).data;
        break;
      case 'blend': {
        const animated = prepareExportRoot(design, 0.001);
        const glb = await gltfData(animated.group, true, bakeClips(animated, anim));
        animated.dispose();
        data = blenderScript(design, glb, kc.bounds);
        break;
      }
      default:
        throw new Error('unreachable');
    }
    return { blob: toBlob(data, info.mime), filename, info };
  } finally {
    kc.dispose();
  }
}

