import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const rad = (d) => (d * Math.PI) / 180;

/** Small deterministic RNG so markings are the same on every build and export. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ellipsoid = (rx, ry, rz, seg = 20) => new THREE.SphereGeometry(1, seg, Math.max(8, Math.round(seg * 0.7))).scale(rx, ry, rz);

/** Tapered tube hanging down the -Y axis from the origin. */
export function limbDown(r0, r1, len, seg = 12) {
  return new THREE.CylinderGeometry(r0, r1, len, seg, 1).translate(0, -len / 2, 0);
}
/** Tapered tube growing up the +Y axis from the origin (r0 at the base). */
export function limbUp(r0, r1, len, seg = 12) {
  return new THREE.CylinderGeometry(r1, r0, len, seg, 1).translate(0, len / 2, 0);
}
/** Tapered tube growing along -Z (tails). */
export function limbBack(r0, r1, len, seg = 10) {
  return limbUp(r0, r1, len, seg).rotateX(-Math.PI / 2);
}
/** Tapered tube growing along +Z (snouts, toes). */
export function limbFwd(r0, r1, len, seg = 10) {
  return limbUp(r0, r1, len, seg).rotateX(Math.PI / 2);
}
/** Cone along +Z (beaks, claws). */
export const coneFwd = (r, len, seg = 10) => new THREE.ConeGeometry(r, len, seg).translate(0, len / 2, 0).rotateX(Math.PI / 2);

export const merge = (list) => mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)), false);

/**
 * Rows of small overlapping scales (feathers / fur tufts) laid over an ellipsoid, pointing backwards.
 * Merged into one geometry so a body costs one draw call.
 */
export function overlapScales(rx, ry, rz, { rows = 7, per = 10, size = 0.03, len = 1.7, from = -0.8, to = 0.75, arc = [-0.25, 1.1], seed = 1 } = {}) {
  const rnd = rng(seed);
  const list = [];
  const m = new THREE.Matrix4();
  const n = new THREE.Vector3();
  const back = new THREE.Vector3(0, 0, -1);
  const yAxis = new THREE.Vector3();
  const xAxis = new THREE.Vector3();
  for (let r = 0; r < rows; r++) {
    const z = rz * (from + ((to - from) * r) / Math.max(1, rows - 1));
    const f = Math.sqrt(Math.max(0.02, 1 - (z / rz) ** 2));
    for (let j = 0; j < per; j++) {
      // angle around the body: arc[0]..arc[1] in half turns from the right side up over the back to the left
      const a = Math.PI * (arc[0] + ((arc[1] - arc[0]) * (j + (r % 2) * 0.5)) / per) + (rnd() - 0.5) * 0.12;
      const p = new THREE.Vector3(rx * f * Math.cos(a), ry * f * Math.sin(a), z);
      n.set((f * Math.cos(a)) / rx, (f * Math.sin(a)) / ry, z / (rz * rz)).normalize();
      yAxis.copy(back).addScaledVector(n, -back.dot(n)).normalize();
      xAxis.crossVectors(yAxis, n).normalize();
      m.makeBasis(xAxis, yAxis, n).setPosition(p.multiplyScalar(1.004));
      const s = size * (0.85 + rnd() * 0.3);
      const g = new THREE.SphereGeometry(1, 8, 6).scale(s, s * len, s * 0.3).translate(0, s * len * 0.35, 0);
      g.applyMatrix4(m);
      list.push(g);
    }
  }
  return merge(list);
}

/** A flat wing/tail feather blade: leading edge along +X, trailing edge toothed, extruded thin. `sd` mirrors left. */
export function bladeGeometry(length, chord0, chord1, { sd = 1, teeth = 0, tip = false, depth = 0.012 } = {}) {
  const pts = [[0, 0], [length * (tip ? 0.92 : 1), 0]];
  if (tip) pts.push([length, chord1 * 0.25]);
  const nT = Math.max(0, teeth);
  for (let i = nT; i >= 0; i--) {
    const u = nT === 0 ? 0 : i / nT; // 1 at the tip end, 0 at the root
    const c = chord0 + (chord1 - chord0) * u;
    const x = length * u;
    pts.push([x, c * (i % 2 === 1 && nT > 0 ? 0.82 : 1)]);
    if (nT === 0) break;
  }
  if (nT === 0) pts.push([0, chord0]);
  const shape = new THREE.Shape();
  pts.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x * sd, y) : shape.lineTo(x * sd, y)));
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -depth / 2);
  g.rotateX(-Math.PI / 2); // shape y -> world -Z (towards the tail), thin along Y
  return g;
}
