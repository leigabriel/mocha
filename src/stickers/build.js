import * as THREE from 'three';
import { circle, subtract, move, sampleGrid, traceGrid, simplify, smooth, bounds as loopBounds } from './sdf.js';
import { makeShape } from './shapes.js';
import { TEMPLATES } from './templates.js';
import { resolveStyle } from './styles.js';
import { rng } from './draw.js';

const SCALE = 0.01; // model units are metres; artwork/shape units are centimetres

const dieCache = new Map();

/** Die-cut geometry for a design: the art area, the cut line (art + border) and an optional eyelet. */
export function dieCut(def, style) {
  const bw = style.border.mode === 'none' ? 0 : style.border.width;
  const key = `${def.id}|${JSON.stringify(def.shape)}|${bw}|${style.softness}`;
  if (dieCache.has(key)) return dieCache.get(key);
  const { type, w, h, ...opts } = def.shape;
  const shape = makeShape(type, w, h, opts);
  let artSdf = shape.sdf;
  if (shape.hole) artSdf = subtract(artSdf, move(circle(shape.hole.r + bw), shape.hole.x, shape.hole.y));
  // coarse pass to find the true extent (shapes may overflow their nominal box), then one fine grid
  const span = Math.max(w, h);
  const coarse = sampleGrid(artSdf, [-span, -span, span, span], 0.1);
  const loose = loopBounds(traceGrid(coarse, bw), 0.0);
  const rough = Number.isFinite(loose[0]) ? loose : [-w / 2, -h / 2, w / 2, h / 2];
  const pad = bw + 0.4;
  const b = [rough[0] - pad, rough[1] - pad, rough[2] + pad, rough[3] + pad];
  const step = Math.max(0.03, Math.max(b[2] - b[0], b[3] - b[1]) / 280);
  const grid = sampleGrid(artSdf, b, step);
  const fix = (loops) => loops.map((l) => smooth(simplify(l, step * 0.12), style.softness));
  const cut = fix(traceGrid(grid, bw));
  const art = fix(traceGrid(grid, 0));
  const bb = loopBounds(cut, 0.02);
  const out = { cut, art, bounds: bb, hole: shape.hole ?? null, w, h, bw };
  dieCache.set(key, out);
  if (dieCache.size > 400) dieCache.delete(dieCache.keys().next().value);
  return out;
}

const loopPath = (g, loops, X, Y) => {
  g.beginPath();
  for (const l of loops) {
    l.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
    g.closePath();
  }
};

const grainCache = new Map();
function grainTile(seed) {
  if (grainCache.has(seed)) return grainCache.get(seed);
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  if (!g) return null;
  const r = rng(seed);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    g.fillRect(Math.floor(r() * 128), Math.floor(r() * 128), 1 + Math.floor(r() * 2), 1);
  }
  grainCache.set(seed, c);
  return c;
}

/** Paints the sticker (border + artwork) into a canvas; everything outside the cut stays transparent. */
export function renderSticker(def, style, { ppu = 100, canvas = null } = {}) {
  const dc = dieCut(def, style);
  const [bx0, by0, bx1, by1] = dc.bounds;
  const cw = Math.max(8, Math.ceil((bx1 - bx0) * ppu));
  const ch = Math.max(8, Math.ceil((by1 - by0) * ppu));
  const cv = canvas ?? document.createElement('canvas');
  cv.width = cw;
  cv.height = ch;
  const g = cv.getContext('2d');
  if (!g) return cv;
  g.clearRect(0, 0, cw, ch);
  const X = (x) => (x - bx0) * ppu;
  const Y = (y) => (by1 - y) * ppu;
  loopPath(g, dc.cut, X, Y);
  g.fillStyle = style.border.mode === 'none' ? style.palette.paper : style.border.color;
  g.fill('evenodd');
  g.save();
  loopPath(g, dc.art, X, Y);
  g.clip('evenodd');
  g.save();
  g.translate(X(-dc.w / 2), Y(dc.h / 2));
  try {
    (TEMPLATES[def.tpl] ?? TEMPLATES.typo)(g, dc.w * ppu, dc.h * ppu, resolveStyle(style), { ...def.p, shape: def.p?.shape });
  } catch (err) {
    console.error('sticker art failed', def.id, err);
  }
  g.restore();
  g.restore();
  if (style.border.mode === 'double' && dc.bw > 0) {
    g.save();
    loopPath(g, dc.cut, X, Y);
    g.clip('evenodd');
    loopPath(g, dc.art, X, Y);
    g.lineWidth = Math.max(1.5, ppu * 0.05);
    g.strokeStyle = style.palette.ink;
    g.stroke();
    g.restore();
  }
  if (style.grain > 0) {
    const tile = grainTile(7);
    if (tile) {
      g.save();
      loopPath(g, dc.cut, X, Y);
      g.clip('evenodd');
      g.globalAlpha = style.grain * 0.18;
      g.fillStyle = g.createPattern(tile, 'repeat') ?? '#000';
      g.fillRect(0, 0, cw, ch);
      g.restore();
    }
  }
  return cv;
}

// ------------------------------------------------------------------ geometry

function pointInLoop(p, loop) {
  let c = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i, i++) {
    const [xi, yi] = loop[i];
    const [xj, yj] = loop[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Front + back faces from the cut loops and a smooth-shaded edge wall, in three material groups. */
export function stickerGeometry(cut, bb, thickness) {
  const outers = cut.filter((l) => !l.hole);
  const holes = cut.filter((l) => l.hole);
  const shapes = outers.map((o) => {
    const s = new THREE.Shape(o.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const h of holes) if (pointInLoop(h[0], o)) s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    return s;
  });
  const cap = new THREE.ShapeGeometry(shapes, 1);
  const cp = cap.getAttribute('position');
  const ci = cap.getIndex();
  const n = cp.count;
  const [x0, y0, x1, y1] = bb;
  const t2 = thickness / 2;
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i < n; i++) {
    const x = cp.getX(i);
    const y = cp.getY(i);
    pos.push(x, y, t2);
    nor.push(0, 0, 1);
    uv.push((x - x0) / (x1 - x0), (y - y0) / (y1 - y0));
  }
  const frontCount = ci.count;
  for (let i = 0; i < ci.count; i++) idx.push(ci.getX(i));
  for (let i = 0; i < n; i++) {
    const x = cp.getX(i);
    const y = cp.getY(i);
    pos.push(x, y, -t2);
    nor.push(0, 0, -1);
    uv.push((x - x0) / (x1 - x0), (y - y0) / (y1 - y0));
  }
  for (let i = 0; i < ci.count; i += 3) idx.push(n + ci.getX(i), n + ci.getX(i + 2), n + ci.getX(i + 1));
  const backCount = ci.count;
  let base = n * 2;
  for (const loop of cut) {
    const m = loop.length;
    const en = loop.map((p, i) => {
      const q = loop[(i + 1) % m];
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const len = Math.hypot(dx, dy) || 1;
      return [dy / len, -dx / len];
    });
    for (let i = 0; i < m; i++) {
      const a = en[(i - 1 + m) % m];
      const b = en[i];
      const nx = a[0] + b[0];
      const ny = a[1] + b[1];
      const l = Math.hypot(nx, ny) || 1;
      pos.push(loop[i][0], loop[i][1], -t2, loop[i][0], loop[i][1], t2);
      nor.push(nx / l, ny / l, 0, nx / l, ny / l, 0);
      uv.push(0, 0, 0, 0);
    }
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m;
      const pb = base + i * 2;
      const pt = pb + 1;
      const qb = base + j * 2;
      const qt = qb + 1;
      idx.push(pb, qb, qt, pb, qt, pt);
    }
    base += m * 2;
  }
  cap.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.addGroup(0, frontCount, 0);
  g.addGroup(frontCount, backCount, 1);
  g.addGroup(frontCount + backCount, idx.length - frontCount - backCount, 2);
  g.scale(SCALE, SCALE, SCALE);
  return g;
}

function finishMaterial(style, map) {
  const f = style.finish;
  const base = { map, side: THREE.FrontSide };
  const m = new THREE.MeshPhysicalMaterial(base);
  if (f === 'gloss') Object.assign(m, { roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 });
  else if (f === 'matte') Object.assign(m, { roughness: 0.85, metalness: 0, clearcoat: 0 });
  else if (f === 'holo') Object.assign(m, { roughness: 0.22, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [200, 700] });
  else Object.assign(m, { roughness: 0.3, metalness: 0.75, clearcoat: 0.4, clearcoatRoughness: 0.2 });
  m.name = `Sticker_${f}_front`;
  return m;
}

function cordMesh(dc, style, thickness) {
  const { x, y, r } = dc.hole;
  const cr = 0.06;
  const zr = thickness / 2 + cr * 1.4;
  const yLow = y + r - cr * 1.15;
  const yHigh = dc.bounds[3] + 3.2;
  const mid = (yLow + yHigh) / 2;
  const pts = [
    [x, yLow, zr], [x, mid, zr * 1.1], [x, yHigh - 0.5, zr * 0.8], [x, yHigh + 0.25, 0],
    [x, yHigh - 0.5, -zr * 0.8], [x, mid, -zr * 1.1], [x, yLow, -zr], [x, yLow - cr * 0.4, 0],
  ].map(([a, b, c]) => new THREE.Vector3(a * SCALE, b * SCALE, c * SCALE));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const geo = new THREE.TubeGeometry(curve, 72, cr * SCALE, 8, true);
  const mat = new THREE.MeshStandardMaterial({ color: style.cordColor, roughness: 0.75 });
  mat.name = 'Sticker_cord';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'Cord';
  return mesh;
}

/**
 * A finished sticker: a thin die-cut slab (artwork on the front, paper on the back, vinyl edge)
 * plus an optional hang cord. Model units are metres, the sticker is centred on its own box.
 */
export function buildSticker(def, style, { ppu = 100, cord = def.cord && style.cord } = {}) {
  const dc = dieCut(def, style);
  const canvas = renderSticker(def, style, { ppu });
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const front = finishMaterial(style, map);
  const back = new THREE.MeshStandardMaterial({ color: '#efece4', roughness: 0.9 });
  back.name = 'Sticker_backing';
  const edge = new THREE.MeshStandardMaterial({ color: style.border.mode === 'none' ? style.palette.paper : style.border.color, roughness: 0.55 });
  edge.name = 'Sticker_edge';
  const geo = stickerGeometry(dc.cut, dc.bounds, style.thickness);
  const mesh = new THREE.Mesh(geo, [front, back, edge]);
  mesh.name = 'Sticker';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const root = new THREE.Group();
  root.name = `Mocha_Sticker_${def.name.replace(/[^A-Za-z0-9]+/g, '_')}`;
  root.add(mesh);
  if (cord && dc.hole) root.add(cordMesh(dc, style, style.thickness));
  const [x0, y0, x1, y1] = dc.bounds;
  const size = { w: (x1 - x0), h: (y1 - y0) };
  const dispose = () => {
    geo.dispose();
    map.dispose();
    for (const m of [front, back, edge]) m.dispose();
    root.traverse((o) => {
      if (o.name === 'Cord') {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
  };
  return { root, mesh, canvas, size, dc, dispose };
}

/** Lays every sticker out on a grid in the XY plane (centre-aligned cells). */
export function buildSheet(defs, style, { cols = 6, gap = 1.2, ppu = 70 } = {}) {
  const items = defs.map((d) => buildSticker(d, style, { ppu, cord: false }));
  const cell = Math.max(...items.map((i) => Math.max(i.size.w, i.size.h))) + gap;
  const rows = Math.ceil(items.length / cols);
  const root = new THREE.Group();
  root.name = 'Mocha_Sticker_Sheet';
  items.forEach((it, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const [x0, y0, x1, y1] = it.dc.bounds;
    it.root.position.set(((c - (cols - 1) / 2) * cell - (x0 + x1) / 2) * SCALE, (((rows - 1) / 2 - r) * cell - (y0 + y1) / 2) * SCALE, 0);
    root.add(it.root);
  });
  return { root, items, extent: { w: cols * cell * SCALE, h: rows * cell * SCALE }, dispose: () => items.forEach((i) => i.dispose()) };
}

export const MODEL_SCALE = SCALE;
