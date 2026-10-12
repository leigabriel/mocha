import * as THREE from 'three';

// Vertex-colour coats for sculpted animals. Every marking is a function of where a point is on the body,
// so it is the same on every build and survives glTF export as COLOR_0.

function hash3(ix, iy, iz, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(iz, 1274126177) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function noise3(x, y, z, seed = 1) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fy = y - y0;
  const fz = z - z0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const sz = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (i, j, k) => hash3(x0 + i, y0 + j, z0 + k, seed);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), sx), l(c(0, 1, 0), c(1, 1, 0), sx), sy),
    l(l(c(0, 0, 1), c(1, 0, 1), sx), l(c(0, 1, 1), c(1, 1, 1), sx), sy),
    sz,
  );
}
export const fbm3 = (x, y, z, seed = 1, oct = 3) => {
  let s = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    s += a * noise3(x * f, y * f, z * f, seed + i * 13);
    a *= 0.5;
    f *= 2;
  }
  return s;
};
export const smooth = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

/**
 * Returns colorFn(p, n) for a species. `info` carries body measurements:
 * { L, W, Hw, Hr, chestBottom, HL, toHead(p) -> head-local point, legTopY, ... }.
 */
export function makeCoat(id, palette, info) {
  const C = new THREE.Color(palette.coat);
  const B = new THREE.Color(palette.belly);
  const A = new THREE.Color(palette.accent);
  const D = new THREE.Color(palette.dark);
  const out = new THREE.Color();
  const tmp = new THREE.Color();
  const hp = new THREE.Vector3();
  const seed = id.length * 7 + 3;

  return (p, n) => {
    const hl = info.toHead(p, hp);
    const hz = hl.z / info.HL; // 0 at the back of the skull .. ~1 at the nose
    const inHead = p.y > info.Hw - info.D * 0.25 && hz > 0.0 ? smooth(-0.05, 0.1, hz) : 0;
    const drift = (fbm3(p.x * 9, p.y * 9, p.z * 9, seed) - 0.5) * 0.22;
    out.copy(C);
    // underside, chest and inner legs fade to the belly colour
    const under = smooth(-0.15, -0.75, n.y);
    const lowLeg = smooth(info.Hr * 0.55, info.chestBottom * 0.55, p.y);
    out.lerp(B, Math.max(under * 0.95, lowLeg * (id === 'dog' ? 0.6 : 0.35)));
    if (id === 'dog') {
      // muzzle, blaze and chest bib
      const muzzle = smooth(0.5, 0.78, hz) * inHead;
      out.lerp(B, muzzle * 0.8);
      out.lerp(A, smooth(0.78, 0.97, hz) * inHead * 0.6);
      const bib = smooth(info.L * 0.22, info.L * 0.4, p.z) * smooth(info.chestBottom + info.D * 0.5, info.chestBottom, p.y) * (1 - inHead);
      out.lerp(A, bib * 0.85);
      // dark saddle on the back with a ragged edge
      const edge = fbm3(p.x * 14, p.y * 14, p.z * 14, seed + 5) - 0.5;
      const sad = smooth(0.35, 0.8, n.y + edge * 0.5) * smooth(-0.34 * info.L, -0.2 * info.L, p.z) * smooth(0.18 * info.L, 0.05 * info.L, p.z) * (1 - inHead);
      out.lerp(D, sad * 0.85);
    }
    tmp.setRGB(1 + drift, 1 + drift, 1 + drift);
    out.multiply(tmp);
    return [out.r, out.g, out.b];
  };
}

export const coatColor = makeCoat;
