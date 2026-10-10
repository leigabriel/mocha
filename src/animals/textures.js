import * as THREE from 'three';
import { rng } from './parts.js';

// Procedural surface maps (colour, normal, roughness) painted on canvases. Every map is deterministic,
// tiles across the u (around-the-body) seam, and is embedded in the exported glTF.

const TAU = Math.PI * 2;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};
const mix = (a, b, t) => a + (b - a) * t;

function hash(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Value noise, periodic in x with `px` cells (so the u seam tiles). */
export function vnoise(x, y, seed = 1, px = 0) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const wrap = (i) => (px ? ((i % px) + px) % px : i);
  const a = hash(wrap(x0), y0, seed);
  const b = hash(wrap(x0 + 1), y0, seed);
  const c = hash(wrap(x0), y0 + 1, seed);
  const d = hash(wrap(x0 + 1), y0 + 1, seed);
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  return mix(mix(a, b, sx), mix(c, d, sx), sy);
}
export function fbm(x, y, seed = 1, px = 0, oct = 4) {
  let s = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    s += a * vnoise(x * f, y * f, seed + i * 17, px ? px * f : 0);
    a *= 0.5;
    f *= 2;
  }
  return s;
}
/** Cellular (Worley) distance for pebbles / scales; periodic in x. */
export function worley(x, y, seed = 1, px = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let best = 9;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = ix + i;
      const cy = iy + j;
      const wx = px ? ((cx % px) + px) % px : cx;
      const fx = cx + hash(wx, cy, seed);
      const fy = cy + hash(wx, cy, seed + 91);
      best = Math.min(best, Math.hypot(x - fx, y - fy));
    }
  }
  return best;
}

const hex = (c) => {
  const col = new THREE.Color(c);
  return [col.r, col.g, col.b];
};
const toSRGB = (l) => (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055);
// THREE.Color(hex) is already linear in r/g/b after colour management; convert back for the canvas.
const srgb = (c) => hex(c).map(toSRGB);

function canvasTexture(data, w, h, { srgb: isSrgb = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) return null;
  const img = g.createImageData(w, h);
  img.data.set(data);
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  if (isSrgb) t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;
  return t;
}

/** Builds colour / normal / roughness textures from a per-pixel painter. */
function bake(size, paint, { grain = null, normalStrength = 2.2, rough = [0.82, 0.95], seed = 1 } = {}) {
  const w = size;
  const h = size;
  const col = new Uint8ClampedArray(w * h * 4);
  const hgt = new Float32Array(w * h);
  const rg = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const o = (y * w + x) * 4;
      const p = paint(u, v);
      col[o] = clamp01(p[0]) * 255;
      col[o + 1] = clamp01(p[1]) * 255;
      col[o + 2] = clamp01(p[2]) * 255;
      col[o + 3] = 255;
      hgt[y * w + x] = grain ? grain(u, v, p) : 0.5;
    }
  }
  const nrm = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const xl = hgt[y * w + ((x + w - 1) % w)];
      const xr = hgt[y * w + ((x + 1) % w)];
      const yu = hgt[Math.max(0, y - 1) * w + x];
      const yd = hgt[Math.min(h - 1, y + 1) * w + x];
      const dx = (xl - xr) * normalStrength;
      const dy = (yu - yd) * normalStrength;
      const l = Math.hypot(dx, dy, 1);
      const o = (y * w + x) * 4;
      nrm[o] = (dx / l * 0.5 + 0.5) * 255;
      nrm[o + 1] = (dy / l * 0.5 + 0.5) * 255;
      nrm[o + 2] = (1 / l * 0.5 + 0.5) * 255;
      nrm[o + 3] = 255;
      const r = mix(rough[0], rough[1], clamp01(hgt[y * w + x]));
      rg[o] = 255; // occlusion channel (unused)
      rg[o + 1] = r * 255;
      rg[o + 2] = 0;
      rg[o + 3] = 255;
    }
  }
  void seed;
  return {
    map: canvasTexture(col, w, h, { srgb: true }),
    normalMap: canvasTexture(nrm, w, h),
    roughnessMap: canvasTexture(rg, w, h),
  };
}

// ------------------------------------------------------------------ fur and markings
/**
 * region: 'body' (torso + neck, u: 0.25 is the back, 0.75 the belly, v: rump -> head),
 *         'head' (v: back of skull -> nose), 'leg' (v: shoulder -> foot), 'tail' (v: root -> tip).
 * kind: marking family.
 */
export function furTextures({ region = 'body', kind = 'plain', coat, belly, dark, accent, size = 512, seed = 3, strand = 1, socks = false, spots = false, patch = false }) {
  const C = srgb(coat);
  const B = srgb(belly);
  const D = srgb(dark);
  const A = srgb(accent);
  const mixc = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
  const rnd = rng(seed * 31);
  const off = rnd() * 50;

  const paint = (u, v) => {
    const back = Math.sin(TAU * u); // +1 on the back, -1 on the belly
    const vent = smooth(-0.15, -0.75, back); // 0 on the back .. 1 underneath
    const side = Math.cos(TAU * u); // +1 left, -1 right
    let c = mixc(C, B, vent * (region === 'leg' ? 0.1 : region === 'tail' ? 0.3 : 1));
    // soft tonal drift so the coat never reads as one flat colour
    const drift = fbm(u * 6 + off, v * 5, seed, 6) - 0.5;
    const t2 = 1 + drift * 0.28;
    c = [c[0] * t2, c[1] * t2, c[2] * t2];
    if (back > 0.45) c = mixc(c, D, 0.1 * smooth(0.45, 1, back)); // darker saddle
    let mark = 0;
    let markCol = D;
    if (kind === 'tiger' || kind === 'tabby') {
      const bold = kind === 'tiger' ? 1 : 0.65;
      if (region === 'body') {
        const n = kind === 'tiger' ? 9 : 9;
        const warp = 0.22 * (fbm(u * 5, v * 7, seed + 4, 5) - 0.5) + 0.05 * Math.sin(TAU * u * 2 + v * 9);
        const f = (v * n + warp * 2) % 1;
        const band = smooth(0.05, 0.16, f) * (1 - smooth(0.3, 0.5, f));
        const fork = smooth(0.58, 0.66, f) * (1 - smooth(0.7, 0.78, f)) * smooth(0.2, 0.7, fbm(u * 8, v * 4, seed + 9, 8));
        const shape = smooth(-0.75, 0.15, back) * (v > 0.1 && v < 0.78 ? 1 : v <= 0.1 ? smooth(0.0, 0.1, v) : 1 - smooth(0.78, 0.92, v) * 0.7);
        mark = clamp01(band + fork * 0.7) * shape * bold;
      } else if (region === 'leg') {
        const outer = smooth(-0.2, 0.5, Math.abs(side));
        const f = (v * 7 + 0.3 * fbm(u * 4, v * 6, seed + 5, 4)) % 1;
        mark = smooth(0.1, 0.22, f) * (1 - smooth(0.3, 0.45, f)) * outer * smooth(0.0, 0.18, v) * (1 - smooth(0.62, 0.78, v)) * bold;
      } else if (region === 'tail') {
        const f = (v * 9) % 1;
        mark = (smooth(0.05, 0.15, f) * (1 - smooth(0.4, 0.55, f)) * (v < 0.88 ? 1 : 0) + smooth(0.88, 0.94, v)) * bold;
      } else if (region === 'head') {
        // forehead lines, cheek stripes, pale muzzle / chin / eye patches
        const fore = smooth(0.35, 0.9, back) * (1 - smooth(0.4, 0.55, v)) * smooth(0.05, 0.12, v);
        const lines = smooth(0.2, 0.32, Math.abs(Math.sin(TAU * u * 5 + fbm(u * 6, v * 4, seed, 6) * 4)));
        const cheek = smooth(0.15, 0.45, Math.abs(side)) * (1 - smooth(0.1, 0.5, vent)) * smooth(0.08, 0.2, v) * (1 - smooth(0.4, 0.55, v));
        const cl = smooth(0.4, 0.55, Math.abs(Math.sin(TAU * (v * 6 + u * 1.5))));
        mark = clamp01(fore * lines * 0.9 + cheek * cl * 0.8) * bold;
        const pale = smooth(0.7, 0.85, v) * 0.9 + smooth(0.3, 0.8, vent) * 0.8;
        c = mixc(c, A, clamp01(pale));
      }
    }
    if (spots && region === 'body') {
      const cells = 14;
      const d = worley(u * cells, v * cells * 1.6, seed + 11, cells);
      const dorsal = smooth(-0.55, 0.2, back);
      c = mixc(c, A, (1 - smooth(0.12, 0.2, d)) * dorsal * 0.9);
    }
    if (patch && region === 'body') {
      const blob = fbm(u * 3 + 1, v * 4, seed + 2, 3);
      const m = smooth(0.5, 0.58, blob + 0.35 * back - 0.25) * smooth(0.0, 0.5, back) * smooth(0.18, 0.3, v) * (1 - smooth(0.62, 0.74, v));
      c = mixc(c, D, m * 0.95);
      const chest = smooth(0.72, 0.88, v) * smooth(-0.2, -0.8, back);
      c = mixc(c, A, chest * 0.8);
    }
    if (kind === 'deer') {
      if (region === 'head') {
        const bridge = smooth(0.4, 0.9, back) * smooth(0.45, 0.7, v);
        c = mixc(c, D, bridge * 0.5);
        c = mixc(c, A, smooth(0.65, 0.85, v) * (1 - smooth(-0.2, 0.3, back)) * 0.8);
      }
      if (region === 'body') {
        c = mixc(c, A, smooth(0.78, 0.92, v) * smooth(-0.1, -0.9, back) * 0.9); // pale throat
        c = mixc(c, A, (1 - smooth(0.02, 0.1, v)) * smooth(0.0, 0.8, back) * 0.55); // rump patch
      }
    }
    if (kind === 'dog' && region === 'head') {
      c = mixc(c, B, smooth(0.5, 0.75, v) * 0.85);
      c = mixc(c, A, smooth(0.62, 0.85, v) * smooth(0.1, -0.6, back) * 0.7);
    }
    if (kind === 'horse') {
      if (region === 'head') c = mixc(c, D, smooth(0.78, 0.95, v) * 0.7);
      if (region === 'leg' && socks) c = mixc(c, D, smooth(0.52, 0.62, v));
    }
    if (kind === 'monkey' && region === 'head') {
      c = mixc(c, A, smooth(0.35, 0.5, v) * smooth(0.55, 0.0, Math.abs(side) * 0 + (back > 0.5 ? 1 : 0)) * 0.95);
    }
    if (mark > 0) c = mixc(c, markCol, clamp01(mark));
    // paler coat edge around the eyes / nose is left to geometry; add fine colour grain
    const speck = (vnoise(u * 220, v * 220, seed + 3, 220) - 0.5) * 0.08;
    return [c[0] + speck, c[1] + speck, c[2] + speck];
  };
  const grain = (u, v) => {
    // strands run along v: stretch noise in v, fine in u
    const s1 = vnoise(u * 360 * strand, v * 52, seed + 1, Math.round(360 * strand));
    const s2 = vnoise(u * 180 * strand, v * 26, seed + 2, Math.round(180 * strand));
    return 0.55 * s1 + 0.45 * s2;
  };
  return bake(size, paint, { grain, normalStrength: 3.2, rough: [0.78, 0.97], seed });
}

/** Leather / bare skin (noses, ear interiors, monkey face and palms, bird legs). */
export function skinTextures({ base, deep = null, wrinkle = 'fine', size = 256, seed = 5, scales = false }) {
  const B = srgb(base);
  const D = srgb(deep ?? base);
  const paint = (u, v) => {
    const f = fbm(u * 8, v * 8, seed, 8);
    const t = deep ? smooth(0.3, 0.8, f) * 0.6 : 0;
    const c = [mix(B[0], D[0], t), mix(B[1], D[1], t), mix(B[2], D[2], t)];
    const m = 0.92 + (vnoise(u * 100, v * 100, seed + 2, 100) - 0.5) * 0.14;
    return [c[0] * m, c[1] * m, c[2] * m];
  };
  const grain = (u, v) => {
    if (scales) {
      const d = worley(u * 10, v * 16, seed, 10);
      return smooth(0.05, 0.5, d);
    }
    if (wrinkle === 'pebble') return smooth(0.05, 0.42, worley(u * 22, v * 22, seed, 22));
    const crease = Math.abs(fbm(u * 14, v * 14, seed + 3, 14) - 0.5);
    return 0.4 + 0.6 * smooth(0.0, 0.12, crease) * 0.9 + 0.1 * vnoise(u * 90, v * 90, seed + 4, 90);
  };
  return bake(size, paint, { grain, normalStrength: wrinkle === 'pebble' || scales ? 3.5 : 1.6, rough: [0.38, 0.7], seed });
}

/** Hard keratin (hooves, claws, beaks, horns): streaks along v, glossier than fur. */
export function keratinTextures({ base, tip = null, size = 256, seed = 7, streak = 1, rough = [0.3, 0.6] }) {
  const B = srgb(base);
  const T = srgb(tip ?? base);
  const paint = (u, v) => {
    const s = vnoise(u * 70 * streak, v * 6, seed, Math.round(70 * streak));
    const c = mixcLocal(B, T, smooth(0.5, 1, v));
    const k = 0.9 + s * 0.18;
    return [c[0] * k, c[1] * k, c[2] * k];
  };
  const grain = (u, v) => 0.5 + 0.5 * vnoise(u * 70 * streak, v * 5, seed + 1, Math.round(70 * streak)) + 0.1 * Math.sin(v * 70);
  return bake(size, paint, { grain, normalStrength: 1.6, rough, seed });
}
const mixcLocal = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

/** Bone-like antler: pale, with long ridges and a darker burr at the base (v = 0). */
export function antlerTextures({ size = 256 }) {
  return keratinTextures({ base: '#b9a58a', tip: '#e6d8bd', size, seed: 11, streak: 0.7, rough: [0.55, 0.85] });
}

/** Feather barbs: v runs from the quill (0) to the tip (1); u across the vane. */
export function featherTextures({ base, edge = null, accent = null, size = 256, seed = 13, bars = false }) {
  const B = srgb(base);
  const E = srgb(edge ?? base);
  const A = srgb(accent ?? base);
  const paint = (u, v) => {
    const centre = Math.abs(u - 0.5) * 2; // 0 on the rachis, 1 at the vane edge
    const barb = vnoise(u * 90, v * 14, seed, 0);
    let c = mixcLocal(B, E, smooth(0.5, 1, v) * 0.7 + centre * 0.12);
    c = mixcLocal(c, A, accent ? smooth(0.75, 1, v) * 0.6 : 0);
    if (bars) c = mixcLocal(c, E, smooth(0.45, 0.55, Math.abs(Math.sin(v * 22))) * 0.45);
    const k = 0.9 + barb * 0.18;
    const shaft = 1 - smooth(0.0, 0.05, centre);
    return [mix(c[0] * k, 0.85, shaft * 0.5), mix(c[1] * k, 0.82, shaft * 0.5), mix(c[2] * k, 0.76, shaft * 0.5)];
  };
  const grain = (u, v) => {
    const centre = Math.abs(u - 0.5) * 2;
    const barb = Math.sin((u * 60 + v * 18 * (u < 0.5 ? -1 : 1)) * Math.PI * 2 * 0.5);
    return 0.5 + 0.28 * barb * (1 - smooth(0.0, 0.06, 1 - centre)) + (1 - smooth(0.0, 0.06, centre)) * 0.3;
  };
  return bake(size, paint, { grain, normalStrength: 2.4, rough: [0.62, 0.9], seed });
}

/** Eye texture mapped planar (x,y of the front hemisphere): sclera, iris, pupil, limbal ring. */
export function eyeTexture({ iris = '#6b4a22', pupil = 'round', sclera = '#3b2c24', size = 256, ring = '#1a120d' }) {
  const I = srgb(iris);
  const S = srgb(sclera);
  const R = srgb(ring);
  const w = size;
  const data = new Uint8ClampedArray(w * w * 4);
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x / w - 0.5) * 2;
      const ny = (y / w - 0.5) * 2;
      const r = Math.hypot(nx, ny);
      let c = S;
      const irisR = pupil === 'horizontal' ? 0.82 : 0.7;
      if (r < irisR) {
        const a = Math.atan2(ny, nx);
        const fib = 0.8 + 0.4 * vnoise(a * 9, r * 14, 4, 0);
        c = [I[0] * fib * mix(1.25, 0.65, smooth(0.15, irisR, r)), I[1] * fib * mix(1.25, 0.65, smooth(0.15, irisR, r)), I[2] * fib * mix(1.25, 0.65, smooth(0.15, irisR, r))];
        c = mixcLocal(c, R, smooth(irisR - 0.1, irisR, r));
        let inside;
        if (pupil === 'round') inside = r < 0.3;
        else if (pupil === 'slit') inside = Math.abs(nx) < 0.1 && Math.abs(ny) < 0.55;
        else if (pupil === 'horizontal') inside = Math.abs(ny) < 0.18 && Math.abs(nx) < 0.55;
        else inside = r < 0.24;
        if (inside) c = [0.01, 0.01, 0.012];
      }
      const o = (y * w + x) * 4;
      data[o] = clamp01(c[0]) * 255;
      data[o + 1] = clamp01(c[1]) * 255;
      data[o + 2] = clamp01(c[2]) * 255;
      data[o + 3] = 255;
    }
  }
  const t = canvasTexture(data, w, w, { srgb: true });
  t.wrapS = THREE.ClampToEdgeWrapping;
  return t;
}
