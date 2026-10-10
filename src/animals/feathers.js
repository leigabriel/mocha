import * as THREE from 'three';
import { merge, rng } from './parts.js';

/**
 * One feather card in its own frame: root at the origin, shaft along +Y, vane across X, outward normal +Z.
 * Vane edges curl slightly away from the viewer and the tip lifts, so overlapping rows read as layers.
 */
export function featherCard({ len = 1, width = 0.3, curl = 0.18, bow = 0.12, rows = 7, cols = 4, tip = 'round' } = {}) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    let f;
    if (tip === 'point') f = t < 0.12 ? 0.35 + t * 5.4 : Math.max(0.02, 1 - ((t - 0.12) / 0.88) ** 1.6);
    else f = t < 0.12 ? 0.35 + t * 5.4 : Math.sqrt(Math.max(0.0, 1 - ((t - 0.12) / 0.88) ** 2.4));
    f = Math.max(f, 0.03);
    for (let j = 0; j <= cols; j++) {
      const s = (j / cols) * 2 - 1;
      const x = s * width * 0.5 * f;
      const z = -curl * width * s * s * f + bow * len * t * t;
      pos.push(x, t * len, z);
      uv.push((s + 1) / 2, t);
    }
  }
  const row = cols + 1;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * row + j;
      idx.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const _m = new THREE.Matrix4();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();

/** Places a feather card: root at `p`, shaft along `dir`, face towards `normal`. */
export function placeFeather(card, p, dir, normal, scale = 1, roll = 0) {
  _y.copy(dir).normalize();
  _z.copy(normal).addScaledVector(_y, -normal.dot(_y)).normalize();
  _x.crossVectors(_y, _z).normalize();
  if (roll) {
    const c = Math.cos(roll);
    const s = Math.sin(roll);
    const nx = _x.clone().multiplyScalar(c).addScaledVector(_z, s);
    const nz = _z.clone().multiplyScalar(c).addScaledVector(_x, -s);
    _x.copy(nx);
    _z.copy(nz);
  }
  _m.makeBasis(_x, _y, _z).setPosition(p);
  _m.scale(new THREE.Vector3(scale, scale, scale));
  const g = card.clone();
  g.applyMatrix4(_m);
  return g;
}

/**
 * Covers a lofted tube (geometry from loft()) with rows of overlapping feathers whose tips point
 * along the tube (dir = -1: towards the start, +1: towards the end).
 */
export function coverLoft(src, { skip = () => false, stepRings = 3, per = 14, len = 0.05, width = 0.04, tilt = 0.35, dir = -1, seed = 1, jitter = 0.25, cardOpts = {}, arc = [0, 1] } = {}) {
  const { rings, segs } = src.userData;
  const pos = src.getAttribute('position');
  const nor = src.getAttribute('normal');
  const rnd = rng(seed);
  const card = featherCard({ len: 1, width: 1, ...cardOpts });
  const list = [];
  const P = new THREE.Vector3();
  const Pn = new THREE.Vector3();
  const N = new THREE.Vector3();
  const T = new THREE.Vector3();
  const D = new THREE.Vector3();
  for (let i = 1; i < rings; i += stepRings) {
    const t = i / rings;
    const a = i * (segs + 1);
    const b = Math.min(rings, i + 1) * (segs + 1);
    for (let k = 0; k < per; k++) {
      const u = arc[0] + ((arc[1] - arc[0]) * (k + (Math.floor(i / stepRings) % 2) * 0.5)) / per;
      const j = Math.min(segs - 1, Math.max(0, Math.floor(u * segs)));
      if (skip(t, u)) continue;
      P.fromBufferAttribute(pos, a + j);
      Pn.fromBufferAttribute(pos, b + j);
      N.fromBufferAttribute(nor, a + j);
      T.subVectors(Pn, P).normalize().multiplyScalar(dir);
      D.copy(T).addScaledVector(N, tilt).normalize();
      D.x += (rnd() - 0.5) * jitter * 0.4;
      const s = 0.85 + rnd() * 0.3;
      const g = placeFeather(card.clone().scale(width * s, len * s, len * s), P.clone().addScaledVector(N, 0.0015), D, N, 1, (rnd() - 0.5) * 0.3);
      list.push(g);
    }
  }
  return list.length ? merge(list) : null;
}
