import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { strToU8, zipSync } from 'three/examples/jsm/libs/fflate.module.js';
import { buildSheet, buildSticker, dieCut, renderSticker } from './build.js';
import { makePack } from './styles.js';

export const FORMAT_INFO = {
  glb: { label: 'GLB', ext: 'glb', mime: 'model/gltf-binary', kind: 'model', note: 'Textured 3D sticker in one file (Blender, three.js, engines).' },
  gltf: { label: 'glTF', ext: 'gltf', mime: 'model/gltf+json', kind: 'model', note: 'Same as GLB with the texture embedded as JSON.' },
  obj: { label: 'OBJ', ext: 'zip', mime: 'application/zip', kind: 'model', note: 'Zip with .obj, .mtl and the front texture PNG.' },
  stl: { label: 'STL', ext: 'stl', mime: 'model/stl', kind: 'model', note: 'Geometry only, for 3D printing a solid sticker.' },
  png: { label: 'PNG', ext: 'png', mime: 'image/png', kind: 'image', note: 'Flat die-cut artwork with transparent background.' },
  svg: { label: 'SVG', ext: 'svg', mime: 'image/svg+xml', kind: 'image', note: 'Artwork plus a CutContour path for print-and-cut machines.' },
};

const safe = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'sticker';
const canvasBlob = (cv, mime = 'image/png') => new Promise((res) => cv.toBlob((b) => res(b), mime));

function gltf(root, binary) {
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(root, resolve, reject, { binary, onlyVisible: true });
  });
}

function buildOBJ(sticker, name) {
  const g = sticker.mesh.geometry;
  const p = g.getAttribute('position');
  const n = g.getAttribute('normal');
  const u = g.getAttribute('uv');
  const idx = g.getIndex();
  const lines = [`# Mocha sticker ${name}`, `mtllib ${name}.mtl`, `o ${name}`];
  for (let i = 0; i < p.count; i++) lines.push(`v ${p.getX(i).toFixed(6)} ${p.getY(i).toFixed(6)} ${p.getZ(i).toFixed(6)}`);
  for (let i = 0; i < u.count; i++) lines.push(`vt ${u.getX(i).toFixed(5)} ${u.getY(i).toFixed(5)}`);
  for (let i = 0; i < n.count; i++) lines.push(`vn ${n.getX(i).toFixed(4)} ${n.getY(i).toFixed(4)} ${n.getZ(i).toFixed(4)}`);
  const mats = ['front', 'back', 'edge'];
  g.groups.forEach((grp) => {
    lines.push(`usemtl ${name}_${mats[grp.materialIndex]}`);
    for (let i = grp.start; i < grp.start + grp.count; i += 3) {
      const f = [0, 1, 2].map((k) => idx.getX(i + k) + 1);
      lines.push(`f ${f.map((v) => `${v}/${v}/${v}`).join(' ')}`);
    }
  });
  const hex = (c) => `${(c.r).toFixed(4)} ${(c.g).toFixed(4)} ${(c.b).toFixed(4)}`;
  const mtl = sticker.mesh.material.map((m, i) => [`newmtl ${name}_${mats[i]}`, `Kd ${hex(m.color)}`, 'Ks 0.2 0.2 0.2', 'Ns 60', i === 0 ? `map_Kd ${name}_front.png` : ''].filter(Boolean).join('\n')).join('\n\n');
  return { obj: lines.join('\n'), mtl };
}

function buildSVG(def, style, dc, pngDataUrl) {
  const [x0, y0, x1, y1] = dc.bounds;
  const mm = (v) => (v * 10).toFixed(3);
  const path = dc.cut.map((l) => `M${l.map(([x, y]) => `${mm(x - x0)} ${mm(y1 - y)}`).join('L')}Z`).join(' ');
  const W = mm(x1 - x0);
  const H = mm(y1 - y0);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">
  <title>${def.name.replace(/[<&>]/g, '')}</title>
  <defs><clipPath id="cut"><path d="${path}" clip-rule="evenodd"/></clipPath></defs>
  <g id="print" clip-path="url(#cut)"><image width="${W}" height="${H}" xlink:href="${pngDataUrl}"/></g>
  <path id="CutContour" d="${path}" fill="none" stroke="#ff00ff" stroke-width="0.25" fill-rule="evenodd"/>
</svg>
`;
}

/** Exports one sticker (a library/custom def) in the chosen format. */
export async function exportSticker(format, def, style, { stamp = Date.now(), scale = 2 } = {}) {
  const info = FORMAT_INFO[format];
  if (!info) throw new Error(`Unsupported format: ${format}`);
  const name = `mocha_sticker_${safe(def.name)}`;
  const filename = (ext = info.ext) => `${name}_${stamp}.${ext}`;
  if (format === 'png' || format === 'svg') {
    const ppu = 100 * scale;
    const cv = renderSticker(def, style, { ppu });
    if (format === 'png') return { blob: await canvasBlob(cv), filename: filename(), info };
    const dc = dieCut(def, style);
    return { blob: new Blob([buildSVG(def, style, dc, cv.toDataURL('image/png'))], { type: info.mime }), filename: filename(), info };
  }
  const s = buildSticker(def, style, { ppu: 100 * scale });
  try {
    if (format === 'glb' || format === 'gltf') {
      const data = await gltf(s.root, format === 'glb');
      return { blob: new Blob([format === 'glb' ? data : JSON.stringify(data)], { type: info.mime }), filename: filename(), info };
    }
    if (format === 'stl') {
      const data = new STLExporter().parse(s.mesh, { binary: true });
      return { blob: new Blob([data], { type: info.mime }), filename: filename(), info };
    }
    const { obj, mtl } = buildOBJ(s, name);
    const png = new Uint8Array(await (await canvasBlob(s.canvas)).arrayBuffer());
    const zip = zipSync({ [`${name}.obj`]: strToU8(obj), [`${name}.mtl`]: strToU8(mtl), [`${name}_front.png`]: png }, { level: 6 });
    return { blob: new Blob([zip], { type: info.mime }), filename: filename('zip'), info };
  } finally {
    s.dispose();
  }
}

/** The whole pack as one textured 3D sheet (GLB). */
export async function exportSheetModel(defs, style, { stamp = Date.now(), cols = 6 } = {}) {
  const sheet = buildSheet(defs, style, { cols, ppu: 80 });
  try {
    const data = await gltf(sheet.root, true);
    return { blob: new Blob([data], { type: 'model/gltf-binary' }), filename: `mocha_sticker_pack_${stamp}.glb`, count: defs.length };
  } finally {
    sheet.dispose();
  }
}

/** A contact sheet PNG (stickers with a soft shadow on a solid or transparent background). */
export async function exportSheetPNG(defs, style, { stamp = Date.now(), cols = 6, cell = 420, bg = '#000000' } = {}) {
  const rows = Math.ceil(defs.length / cols);
  const pad = cell * 0.12;
  const cv = document.createElement('canvas');
  cv.width = cols * cell;
  cv.height = rows * cell;
  const g = cv.getContext('2d');
  if (bg) {
    g.fillStyle = bg;
    g.fillRect(0, 0, cv.width, cv.height);
  }
  const maxDim = Math.max(...defs.map((d) => Math.max(d.shape.w, d.shape.h))) + style.border.width * 2 + 0.6;
  const ppu = (cell - pad * 2) / maxDim;
  defs.forEach((d, i) => {
    const art = renderSticker(d, style, { ppu });
    const x = (i % cols) * cell + (cell - art.width) / 2;
    const y = Math.floor(i / cols) * cell + (cell - art.height) / 2;
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.35)';
    g.shadowBlur = cell * 0.03;
    g.shadowOffsetY = cell * 0.012;
    g.drawImage(art, x, y);
    g.restore();
  });
  return { blob: await canvasBlob(cv), filename: `mocha_sticker_sheet_${stamp}.png`, count: defs.length };
}

export function exportPackJSON(style, customs, { stamp = Date.now() } = {}) {
  const pack = makePack(style, customs);
  return { blob: new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' }), filename: `mocha_sticker_pack_${safe(pack.style.name)}_${stamp}.json` };
}

/** A zip with every sticker as a transparent PNG (print-ready) plus the pack file. */
export async function exportPackZip(defs, style, customs, { stamp = Date.now(), scale = 2 } = {}) {
  const files = {};
  for (const d of defs) {
    const cv = renderSticker(d, style, { ppu: 100 * scale });
    files[`${safe(d.name)}.png`] = new Uint8Array(await (await canvasBlob(cv)).arrayBuffer());
  }
  files['pack.json'] = strToU8(JSON.stringify(makePack(style, customs), null, 2));
  return { blob: new Blob([zipSync(files, { level: 6 })], { type: 'application/zip' }), filename: `mocha_sticker_pack_${stamp}.zip`, count: defs.length };
}

