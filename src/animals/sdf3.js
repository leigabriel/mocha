import * as THREE from 'three';

/**
 * A small digital-clay toolkit. A creature is described as a list of anatomical masses (ellipsoids and
 * tapered round cones) that are blended with a smooth minimum, plus carving shapes that cut grooves and
 * sockets. The blended signed-distance field is turned into one continuous, watertight surface with
 * surface nets, snapped onto the true surface and given smooth normals from the field gradient.
 */

const D2R = Math.PI / 180;

const smin = (a, b, k) => {
  if (k <= 0) return a < b ? a : b;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return (a < b ? a : b) - h * h * k * 0.25;
};
const smax = (a, b, k) => -smin(-a, -b, k);

export class Sculpt {
  constructor() {
    this.parts = [];
    this.tags = [];
    this.frame = null;
  }

  /** Subsequent parts are given in the local space of `matrix` (e.g. a head bone). Pass null to go back to world. */
  setFrame(matrix) {
    this.frame = matrix ? matrix.clone() : null;
    return this;
  }

  _push(p) {
    p.mirror = !!p.mirror;
    this.parts.push(p);
    return this;
  }

  /**
   * Ellipsoid mass. c = centre, r = radii, rot = euler degrees (XYZ), k = blend with what is already there,
   * mirror = also add the x-mirrored copy, sub = carve instead of add.
   */
  ellipsoid(c, r, { rot = [0, 0, 0], k = 0.02, mirror = false, sub = false, tag = null } = {}) {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rot[0] * D2R, rot[1] * D2R, rot[2] * D2R, 'XYZ'));
    let cc = c;
    if (this.frame) {
      const rotOnly = new THREE.Matrix4().extractRotation(this.frame);
      m.premultiply(rotOnly);
      cc = new THREE.Vector3(...c).applyMatrix4(this.frame).toArray();
    }
    const e = m.elements; // column-major
    const R = [e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10]]; // rows of M^T: world -> local
    const rm = Math.max(r[0], r[1], r[2]);
    const ident = Math.abs(e[1]) + Math.abs(e[2]) + Math.abs(e[4]) + Math.abs(e[6]) + Math.abs(e[8]) + Math.abs(e[9]) < 1e-6;
    return this._push({ t: 0, c: cc, r, R, k, sub, mirror, tag, rm, ax: !ident });
  }

  /** Tapered capsule from a (radius r1) to b (radius r2). s = optional x/y/z stretch about its middle. */
  cone(a, b, r1, r2, { k = 0.02, mirror = false, sub = false, s = null, tag = null } = {}) {
    if (this.frame) {
      a = new THREE.Vector3(...a).applyMatrix4(this.frame).toArray();
      b = new THREE.Vector3(...b).applyMatrix4(this.frame).toArray();
    }
    const ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l2 = ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2];
    const rr = r1 - r2;
    return this._push({ t: 1, a, b, r1, r2, ba, l2, rr, a2: l2 - rr * rr, il2: 1 / Math.max(1e-9, l2), k, sub, mirror, tag, s, c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2] });
  }

  /** A chain of cones through points pts (array of [x,y,z]) with radii rs. */
  chain(pts, rs, opts = {}) {
    for (let i = 0; i < pts.length - 1; i++) this.cone(pts[i], pts[i + 1], rs[i], rs[i + 1], opts);
    return this;
  }

  /** Finishes the part list: bounding boxes (inflated by the blend radius) for fast culling. */
  prepare() {
    for (const p of this.parts) {
      let lo;
      let hi;
      if (p.t === 0) {
        const m = p.ax ? [p.rm, p.rm, p.rm] : p.r;
        lo = [p.c[0] - m[0], p.c[1] - m[1], p.c[2] - m[2]];
        hi = [p.c[0] + m[0], p.c[1] + m[1], p.c[2] + m[2]];
      } else {
        const sm = p.s ? Math.max(...p.s) : 1;
        const R = Math.max(p.r1, p.r2) * sm;
        lo = [Math.min(p.a[0], p.b[0]) - R, Math.min(p.a[1], p.b[1]) - R, Math.min(p.a[2], p.b[2]) - R];
        hi = [Math.max(p.a[0], p.b[0]) + R, Math.max(p.a[1], p.b[1]) + R, Math.max(p.a[2], p.b[2]) + R];
      }
      p.lo = lo.map((v) => v - p.k);
      p.hi = hi.map((v) => v + p.k);
      if (p.mirror) {
        const mx = Math.max(Math.abs(p.lo[0]), Math.abs(p.hi[0]));
        p.lo[0] = -mx;
        p.hi[0] = mx;
      }
    }
    this.prepared = true;
    return this;
  }

  bounds(pad = 0.05) {
    if (!this.prepared) this.prepare();
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (const p of this.parts) {
      if (p.sub) continue;
      for (let i = 0; i < 3; i++) {
        lo[i] = Math.min(lo[i], p.lo[i]);
        hi[i] = Math.max(hi[i], p.hi[i]);
      }
    }
    return { lo: lo.map((v) => v - pad), hi: hi.map((v) => v + pad) };
  }
}

/** Distance of one part to a point (local to the part, mirror already applied). */
function partDist(p, x, y, z) {
  if (p.t === 0) {
    let lx = x - p.c[0];
    let ly = y - p.c[1];
    let lz = z - p.c[2];
    if (p.ax) {
      const R = p.R;
      const nx = R[0] * lx + R[1] * ly + R[2] * lz;
      const ny = R[3] * lx + R[4] * ly + R[5] * lz;
      const nz = R[6] * lx + R[7] * ly + R[8] * lz;
      lx = nx;
      ly = ny;
      lz = nz;
    }
    const rx = p.r[0];
    const ry = p.r[1];
    const rz = p.r[2];
    const ux = lx / rx;
    const uy = ly / ry;
    const uz = lz / rz;
    const k0 = Math.sqrt(ux * ux + uy * uy + uz * uz);
    const vx = ux / rx;
    const vy = uy / ry;
    const vz = uz / rz;
    const k1 = Math.sqrt(vx * vx + vy * vy + vz * vz);
    if (k1 < 1e-9) return -Math.min(rx, ry, rz);
    return (k0 * (k0 - 1)) / k1;
  }
  let px = x;
  let py = y;
  let pz = z;
  let sc = 1;
  if (p.s) {
    px = p.c[0] + (x - p.c[0]) / p.s[0];
    py = p.c[1] + (y - p.c[1]) / p.s[1];
    pz = p.c[2] + (z - p.c[2]) / p.s[2];
    sc = Math.min(p.s[0], p.s[1], p.s[2]);
  }
  const pa0 = px - p.a[0];
  const pa1 = py - p.a[1];
  const pa2 = pz - p.a[2];
  const ba = p.ba;
  const yy = pa0 * ba[0] + pa1 * ba[1] + pa2 * ba[2];
  const zz = yy - p.l2;
  const q0 = pa0 * p.l2 - ba[0] * yy;
  const q1 = pa1 * p.l2 - ba[1] * yy;
  const q2 = pa2 * p.l2 - ba[2] * yy;
  const x2 = q0 * q0 + q1 * q1 + q2 * q2;
  const y2 = yy * yy * p.l2;
  const z2 = zz * zz * p.l2;
  const kk = Math.sign(p.rr) * p.rr * p.rr * x2;
  let d;
  if (Math.sign(zz) * p.a2 * z2 > kk) d = Math.sqrt(x2 + z2) * p.il2 - p.r2;
  else if (Math.sign(yy) * p.a2 * y2 < kk) d = Math.sqrt(x2 + y2) * p.il2 - p.r1;
  else d = (Math.sqrt(x2 * p.a2 * p.il2) + yy * p.rr) * p.il2 - p.r1;
  return d * sc;
}

/** Evaluates the whole sculpt at one point, using only the parts in `list` (indices into sculpt.parts). */
function field(parts, list, x, y, z) {
  let d = 1e9;
  for (let n = 0; n < list.length; n++) {
    const p = parts[list[n]];
    const xx = p.mirror ? Math.abs(x) : x;
    if (xx < p.lo[0] || xx > p.hi[0] || y < p.lo[1] || y > p.hi[1] || z < p.lo[2] || z > p.hi[2]) continue;
    const pd = partDist(p, xx, y, z);
    d = p.sub ? smax(d, -pd, p.k) : smin(d, pd, p.k);
  }
  return d;
}

export function evaluator(sculpt) {
  if (!sculpt.prepared) sculpt.prepare();
  const all = sculpt.parts.map((_, i) => i);
  return (x, y, z) => field(sculpt.parts, all, x, y, z);
}

/**
 * Polygonises the sculpt with surface nets. `voxel` is the grid size in metres. Returns indexed triangles with
 * positions snapped onto the surface and smooth normals.
 */
export function polygonize(sculpt, { voxel = 0.01, pad = 0.04 } = {}) {
  if (!sculpt.prepared) sculpt.prepare();
  const parts = sculpt.parts;
  const bb = sculpt.bounds(pad);
  const ox = bb.lo[0];
  const oy = bb.lo[1];
  const oz = bb.lo[2];
  const nx = Math.ceil((bb.hi[0] - ox) / voxel) + 2;
  const ny = Math.ceil((bb.hi[1] - oy) / voxel) + 2;
  const nz = Math.ceil((bb.hi[2] - oz) / voxel) + 2;
  const grid = new Float32Array(nx * ny * nz);
  const T = 8;
  const BIG = 1;
  const diag = voxel * T * 0.5 * Math.sqrt(3);
  const GI = (i, j, k) => i + nx * (j + ny * k);

  // ---- sample the field tile by tile; tiles with no part nearby are simply "outside"
  const tx = Math.ceil((nx - 1) / T);
  const ty = Math.ceil((ny - 1) / T);
  const tz = Math.ceil((nz - 1) / T);
  grid.fill(BIG);
  for (let a = 0; a < tx; a++) {
    for (let b = 0; b < ty; b++) {
      for (let c = 0; c < tz; c++) {
        const x0 = ox + a * T * voxel;
        const y0 = oy + b * T * voxel;
        const z0 = oz + c * T * voxel;
        const x1 = x0 + T * voxel;
        const y1 = y0 + T * voxel;
        const z1 = z0 + T * voxel;
        const list = [];
        for (let n = 0; n < parts.length; n++) {
          const p = parts[n];
          if (x1 < p.lo[0] || x0 > p.hi[0] || y1 < p.lo[1] || y0 > p.hi[1] || z1 < p.lo[2] || z0 > p.hi[2]) continue;
          list.push(n);
        }
        if (!list.length) continue;
        const cd = field(parts, list, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        if (cd > diag * 1.7) {
          // far from every surface: leave as outside, but keep the sign information
          continue;
        }
        const iEnd = Math.min(nx - 1, (a + 1) * T);
        const jEnd = Math.min(ny - 1, (b + 1) * T);
        const kEnd = Math.min(nz - 1, (c + 1) * T);
        for (let k = c * T; k <= kEnd; k++) {
          for (let j = b * T; j <= jEnd; j++) {
            for (let i = a * T; i <= iEnd; i++) {
              grid[GI(i, j, k)] = field(parts, list, ox + i * voxel, oy + j * voxel, oz + k * voxel);
            }
          }
        }
      }
    }
  }

  // ---- surface nets
  const vmap = new Int32Array(nx * ny * nz).fill(-1);
  const pos = [];
  const cornerOff = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        let mask = 0;
        for (let n = 0; n < 8; n++) {
          const o = cornerOff[n];
          const v = grid[GI(i + o[0], j + o[1], k + o[2])];
          cv[n] = v;
          if (v < 0) mask |= 1 << n;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let cnt = 0;
        for (const [e0, e1] of edges) {
          const v0 = cv[e0];
          const v1 = cv[e1];
          if (v0 < 0 === v1 < 0) continue;
          const t = v0 / (v0 - v1);
          const a = cornerOff[e0];
          const b = cornerOff[e1];
          sx += a[0] + (b[0] - a[0]) * t;
          sy += a[1] + (b[1] - a[1]) * t;
          sz += a[2] + (b[2] - a[2]) * t;
          cnt++;
        }
        vmap[GI(i, j, k)] = pos.length / 3;
        pos.push(ox + (i + sx / cnt) * voxel, oy + (j + sy / cnt) * voxel, oz + (k + sz / cnt) * voxel);
      }
    }
  }

  const tris = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) tris.push(a, c, b, a, d, c);
    else tris.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++) {
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const v = grid[GI(i, j, k)];
        const inside = v < 0;
        if (grid[GI(i + 1, j, k)] < 0 !== inside) {
          quad(vmap[GI(i, j - 1, k - 1)], vmap[GI(i, j, k - 1)], vmap[GI(i, j, k)], vmap[GI(i, j - 1, k)], !inside);
        }
        if (grid[GI(i, j + 1, k)] < 0 !== inside) {
          quad(vmap[GI(i - 1, j, k - 1)], vmap[GI(i - 1, j, k)], vmap[GI(i, j, k)], vmap[GI(i, j, k - 1)], !inside);
        }
        if (grid[GI(i, j, k + 1)] < 0 !== inside) {
          quad(vmap[GI(i - 1, j - 1, k)], vmap[GI(i, j - 1, k)], vmap[GI(i, j, k)], vmap[GI(i - 1, j, k)], !inside);
        }
      }
    }
  }

  // ---- snap onto the true surface and take smooth normals from the gradient
  const all = parts.map((_, i) => i);
  const n = pos.length / 3;
  const positions = new Float32Array(n * 3);
  const normals = new Float32Array(n * 3);
  const h = voxel * 0.4;
  const f = (x, y, z) => field(parts, all, x, y, z);
  for (let v = 0; v < n; v++) {
    let x = pos[v * 3];
    let y = pos[v * 3 + 1];
    let z = pos[v * 3 + 2];
    let gx = 0;
    let gy = 0;
    let gz = 0;
    for (let it = 0; it < 2; it++) {
      const d = f(x, y, z);
      // tetrahedron gradient: 4 samples
      const a = f(x + h, y - h, z - h);
      const b = f(x - h, y - h, z + h);
      const c = f(x - h, y + h, z - h);
      const e = f(x + h, y + h, z + h);
      gx = a - b - c + e;
      gy = -a - b + c + e;
      gz = -a + b - c + e;
      const gl = Math.hypot(gx, gy, gz) || 1;
      gx /= gl;
      gy /= gl;
      gz /= gl;
      const step = Math.max(-voxel * 0.7, Math.min(voxel * 0.7, d));
      x -= gx * step;
      y -= gy * step;
      z -= gz * step;
    }
    positions[v * 3] = x;
    positions[v * 3 + 1] = y;
    positions[v * 3 + 2] = z;
    normals[v * 3] = gx;
    normals[v * 3 + 1] = gy;
    normals[v * 3 + 2] = gz;
  }
  // make the winding agree with the normals
  const index = new Uint32Array(tris.length);
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t];
    const b = tris[t + 1];
    const c = tris[t + 2];
    const ux = positions[b * 3] - positions[a * 3];
    const uy = positions[b * 3 + 1] - positions[a * 3 + 1];
    const uz = positions[b * 3 + 2] - positions[a * 3 + 2];
    const vx = positions[c * 3] - positions[a * 3];
    const vy = positions[c * 3 + 1] - positions[a * 3 + 1];
    const vz = positions[c * 3 + 2] - positions[a * 3 + 2];
    const fx = uy * vz - uz * vy;
    const fy = uz * vx - ux * vz;
    const fz = ux * vy - uy * vx;
    const dot = fx * (normals[a * 3] + normals[b * 3] + normals[c * 3]) + fy * (normals[a * 3 + 1] + normals[b * 3 + 1] + normals[c * 3 + 1]) + fz * (normals[a * 3 + 2] + normals[b * 3 + 2] + normals[c * 3 + 2]);
    if (dot >= 0) {
      index[t] = a;
      index[t + 1] = b;
      index[t + 2] = c;
    } else {
      index[t] = a;
      index[t + 1] = c;
      index[t + 2] = b;
    }
  }
  return { positions, normals, index, count: n, voxel, bounds: bb };
}

/** Builds a BufferGeometry from polygonize() output. */
export function toGeometry(mesh) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
  g.setIndex(new THREE.BufferAttribute(mesh.index, 1));
  return g;
}

/**
 * Per-triangle box projection UVs (tileable detail such as fur grain only needs a texture that repeats).
 * Vertices are split along projection seams, so the geometry becomes unindexed and is re-welded after.
 */
export function boxUV(geo, scale = 6) {
  const src = geo.index ? geo.toNonIndexed() : geo;
  const pos = src.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let t = 0; t < pos.count; t += 3) {
    const ax = pos.getX(t + 1) - pos.getX(t);
    const ay = pos.getY(t + 1) - pos.getY(t);
    const az = pos.getZ(t + 1) - pos.getZ(t);
    const bx = pos.getX(t + 2) - pos.getX(t);
    const by = pos.getY(t + 2) - pos.getY(t);
    const bz = pos.getZ(t + 2) - pos.getZ(t);
    const nx = Math.abs(ay * bz - az * by);
    const ny = Math.abs(az * bx - ax * bz);
    const nz = Math.abs(ax * by - ay * bx);
    for (let q = 0; q < 3; q++) {
      const x = pos.getX(t + q);
      const y = pos.getY(t + q);
      const z = pos.getZ(t + q);
      let u;
      let v;
      if (nx >= ny && nx >= nz) {
        u = z;
        v = y;
      } else if (ny >= nz) {
        u = x;
        v = z;
      } else {
        u = x;
        v = y;
      }
      uv[(t + q) * 2] = u * scale;
      uv[(t + q) * 2 + 1] = v * scale;
    }
  }
  src.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return src;
}
