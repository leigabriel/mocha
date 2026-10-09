import * as THREE from 'three';
import { PACK, STAMP_SHAPES } from './constants.js';

const ARC = 9; // segments per perforation
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Outline (CCW, centred, mm) of a stamp shape before the perforated edge is added. */
export function baseOutline(shapeId, w, h) {
  const hw = w / 2;
  const hh = h / 2;
  if (shapeId === 'wedge') return [[hw * 0.1, -hh], [hw, hh], [-hw, hh]]; // wide at the top, pointing down
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
}

/** Polygon with a semicircular bite between every pair of teeth along each straight edge. */
export function perforatePolygon(verts, pitch, radius) {
  const out = [];
  for (let i = 0; i < verts.length; i++) {
    const [ax, ay] = verts[i];
    const [bx, by] = verts[(i + 1) % verts.length];
    const len = Math.hypot(bx - ax, by - ay);
    const dx = (bx - ax) / len;
    const dy = (by - ay) / len;
    const nx = -dy; // inward for a CCW polygon
    const ny = dx;
    const n = Math.max(1, Math.round(len / pitch));
    const step = len / n;
    const r = Math.min(radius, step * 0.38);
    out.push([ax, ay]);
    for (let k = 0; k < n; k++) {
      const cx = ax + dx * (k + 0.5) * step;
      const cy = ay + dy * (k + 0.5) * step;
      for (let j = 0; j <= ARC; j++) {
        const a = (Math.PI * j) / ARC;
        const along = -r * Math.cos(a);
        const depth = r * Math.sin(a);
        out.push([cx + dx * along + nx * depth, cy + dy * along + ny * depth]);
      }
    }
  }
  return out;
}

export function perforateCircle(R, pitch, radius) {
  const n = Math.max(8, Math.round((Math.PI * 2 * R) / pitch));
  const step = (Math.PI * 2) / n;
  const r = Math.min(radius, R * step * 0.38);
  const out = [];
  for (let k = 0; k < n; k++) {
    out.push([R * Math.cos(k * step), R * Math.sin(k * step)]);
    const t = (k + 0.5) * step;
    const cx = R * Math.cos(t);
    const cy = R * Math.sin(t);
    const tx = -Math.sin(t);
    const ty = Math.cos(t);
    for (let j = 0; j <= ARC; j++) {
      const a = (Math.PI * j) / ARC;
      const along = -r * Math.cos(a);
      const depth = r * Math.sin(a);
      out.push([cx + tx * along - Math.cos(t) * depth, cy + ty * along - Math.sin(t) * depth]);
    }
  }
  return out;
}

export function stampOutline(shapeId, w, h, pitch) {
  const r = pitch * 0.3;
  if (shapeId === 'circle') return perforateCircle(Math.min(w, h) / 2, pitch, r);
  return perforatePolygon(baseOutline(shapeId, w, h), pitch, r);
}

/** Final stamp dimensions (mm) for a shape and scale. */
export function stampSize(shapeId, scale) {
  const info = STAMP_SHAPES.find((s) => s.id === shapeId) ?? STAMP_SHAPES[0];
  return { w: info.w * scale, h: info.h * scale };
}

/**
 * Flat sheet geometry from an outline. Three material groups: 0 = printed front,
 * 1 = plain back, 2 = edge. UVs map the front onto the bounding box, so a canvas that
 * covers the bounding box lines up exactly.
 */
export function sheetGeometry(points, depth, size) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const src = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
  const pos = src.attributes.position;
  const nor = src.attributes.normal;
  const buckets = [[], [], []];
  const eps = depth * 0.01;
  for (let t = 0; t < pos.count; t += 3) {
    const zs = [pos.getZ(t), pos.getZ(t + 1), pos.getZ(t + 2)];
    let bucket = 2;
    if (zs.every((z) => Math.abs(z - depth) < eps)) bucket = 0;
    else if (zs.every((z) => Math.abs(z) < eps)) bucket = 1;
    buckets[bucket].push(t);
  }
  const total = pos.count;
  const p = new Float32Array(total * 3);
  const n = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  const geo = new THREE.BufferGeometry();
  let w = 0;
  buckets.forEach((tris, g) => {
    const start = w;
    for (const t of tris) {
      for (let k = 0; k < 3; k++) {
        const i = t + k;
        p.set([pos.getX(i), pos.getY(i), pos.getZ(i)], w * 3);
        n.set([nor.getX(i), nor.getY(i), nor.getZ(i)], w * 3);
        uv.set([clamp01((pos.getX(i) + size.w / 2) / size.w), clamp01((pos.getY(i) + size.h / 2) / size.h)], w * 2);
        w++;
      }
    }
    geo.addGroup(start, w - start, g);
  });
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  src.dispose();
  return geo;
}

export function stampGeometry(shapeId, scale, pitch, depth = PACK.paperT) {
  const size = stampSize(shapeId, scale);
  return { geometry: sheetGeometry(stampOutline(shapeId, size.w, size.h, pitch), depth, size), size };
}

/** Header card: a plain rectangle with an optional punched hole. */
export function cardGeometry(w, h, hole, depth = PACK.paperT) {
  const shape = new THREE.Shape([new THREE.Vector2(-w / 2, -h / 2), new THREE.Vector2(w / 2, -h / 2), new THREE.Vector2(w / 2, h / 2), new THREE.Vector2(-w / 2, h / 2)]);
  if (hole) {
    const path = new THREE.Path();
    path.absarc(0, h / 2 - 5.2, 1.9, 0, Math.PI * 2, true);
    shape.holes.push(path);
  }
  const src = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 16 });
  const pos = src.attributes.position;
  const nor = src.attributes.normal;
  const buckets = [[], [], []];
  const eps = depth * 0.01;
  for (let t = 0; t < pos.count; t += 3) {
    const zs = [pos.getZ(t), pos.getZ(t + 1), pos.getZ(t + 2)];
    buckets[zs.every((z) => Math.abs(z - depth) < eps) ? 0 : zs.every((z) => Math.abs(z) < eps) ? 1 : 2].push(t);
  }
  const p = new Float32Array(pos.count * 3);
  const n = new Float32Array(pos.count * 3);
  const uv = new Float32Array(pos.count * 2);
  const geo = new THREE.BufferGeometry();
  let c = 0;
  buckets.forEach((tris, g) => {
    const start = c;
    for (const t of tris) {
      for (let k = 0; k < 3; k++) {
        const i = t + k;
        p.set([pos.getX(i), pos.getY(i), pos.getZ(i)], c * 3);
        n.set([nor.getX(i), nor.getY(i), nor.getZ(i)], c * 3);
        uv.set([(pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h], c * 2);
        c++;
      }
    }
    geo.addGroup(start, c - start, g);
  });
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  src.dispose();
  return geo;
}
