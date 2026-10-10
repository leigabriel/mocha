import * as THREE from 'three';

const _v = new THREE.Vector3();

/** Smooth interpolation of a list of [t, value] knots (Catmull-Rom-ish via smoothstep blends). */
export function curve(knots) {
  const ks = knots.map(([t, v]) => [t, v]).sort((a, b) => a[0] - b[0]);
  return (t) => {
    if (t <= ks[0][0]) return ks[0][1];
    const last = ks[ks.length - 1];
    if (t >= last[0]) return last[1];
    let i = 0;
    while (t > ks[i + 1][0]) i++;
    const [t0, v0] = ks[i];
    const [t1, v1] = ks[i + 1];
    const u = (t - t0) / (t1 - t0);
    // use neighbours to get tangent continuity
    const pm = ks[Math.max(0, i - 1)];
    const pn = ks[Math.min(ks.length - 1, i + 2)];
    const m0 = i === 0 ? v1 - v0 : (v1 - pm[1]) / (t1 - pm[0]) * (t1 - t0);
    const m1 = i + 2 >= ks.length ? v1 - v0 : (pn[1] - v0) / (pn[0] - t0) * (t1 - t0);
    const u2 = u * u;
    const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m1;
  };
}

/**
 * Lofts an elliptical cross-section along a path (array of Vector3, already in final space).
 * rx(t) is the sideways radius, ry(t) the radius along the `up` direction, t in 0..1 along the path.
 * Ends are rounded off so no caps are needed. UV: u around the section, v along the path mapped into vRange (0..1 texture rows).
 */
export function loft(path, { rx, ry, segs = 20, rings = 40, up = [0, 1, 0], round = [0.08, 0.08], vRange = [0, 1], offset = null, twist = null } = {}) {
  const curveP = new THREE.CatmullRomCurve3(path, false, 'centripetal');
  const len = curveP.getLength();
  const pts = [];
  const tans = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    pts.push(curveP.getPointAt(t));
    tans.push(curveP.getTangentAt(t).normalize());
  }
  // parallel-transport frames
  const upV = new THREE.Vector3(...up).normalize();
  const frames = [];
  let N = upV.clone().addScaledVector(tans[0], -upV.dot(tans[0]));
  if (N.lengthSq() < 1e-6) N.set(1, 0, 0).addScaledVector(tans[0], -tans[0].x);
  N.normalize();
  for (let i = 0; i <= rings; i++) {
    if (i > 0) {
      const axis = _v.crossVectors(tans[i - 1], tans[i]);
      const s = axis.length();
      if (s > 1e-6) {
        axis.divideScalar(s);
        N.applyAxisAngle(axis, Math.asin(Math.min(1, s)));
      }
      N.addScaledVector(tans[i], -N.dot(tans[i])).normalize();
    }
    const B = new THREE.Vector3().crossVectors(tans[i], N).normalize();
    frames.push({ N: N.clone(), B });
  }
  const positions = [];
  const uvs = [];
  const index = [];
  const rr = (t) => {
    let m = 1;
    if (t < round[0]) m = Math.sqrt(Math.max(0, 1 - ((round[0] - t) / round[0]) ** 2));
    if (t > 1 - round[1]) m = Math.min(m, Math.sqrt(Math.max(0, 1 - ((t - (1 - round[1])) / round[1]) ** 2)));
    return Math.max(m, 0.02);
  };
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const m = rr(t);
    const ax = Math.max(1e-4, rx(t) * m);
    const ay = Math.max(1e-4, ry(t) * m);
    const { N: n, B: b } = frames[i];
    const o = offset ? offset(t) : 0;
    const tw = twist ? twist(t) : 0;
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2 + tw;
      const c = Math.cos(a);
      const s = Math.sin(a);
      // `o` shifts the section along N (e.g. belly hang)
      positions.push(pts[i].x + b.x * ax * c + n.x * (ay * s + o), pts[i].y + b.y * ax * c + n.y * (ay * s + o), pts[i].z + b.z * ax * c + n.z * (ay * s + o));
      uvs.push(j / segs, vRange[0] + t * (vRange[1] - vRange[0]));
    }
  }
  const row = segs + 1;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * row + j;
      const b = a + row;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  // weld the shading across the u seam
  const n = g.getAttribute('normal');
  for (let i = 0; i <= rings; i++) {
    const a = i * row;
    const b = a + segs;
    const x = n.getX(a) + n.getX(b);
    const y = n.getY(a) + n.getY(b);
    const z = n.getZ(a) + n.getZ(b);
    const l = Math.hypot(x, y, z) || 1;
    n.setXYZ(a, x / l, y / l, z / l);
    n.setXYZ(b, x / l, y / l, z / l);
  }
  g.userData.length = len;
  g.userData.rings = rings;
  g.userData.segs = segs;
  return g;
}

/** Maps a geometry's vertices into another space (e.g. a bone's world matrix) in place. */
export const place = (geo, matrix) => geo.applyMatrix4(matrix);

/** Smooth bone weights: each vertex follows the nearest bone segments (blended around joints). */
export function skinTo(geo, bones, { power = 3, maxInfluence = 4, floor = 0.02 } = {}) {
  // bones: [{ index, a: Vector3, b: Vector3 }]
  const pos = geo.getAttribute('position');
  const count = pos.count;
  const idx = new Uint16Array(count * 4);
  const wts = new Float32Array(count * 4);
  const ab = new THREE.Vector3();
  const ap = new THREE.Vector3();
  const w = new Array(bones.length);
  for (let v = 0; v < count; v++) {
    _v.fromBufferAttribute(pos, v);
    for (let k = 0; k < bones.length; k++) {
      const { a, b } = bones[k];
      ab.subVectors(b, a);
      ap.subVectors(_v, a);
      const l2 = ab.lengthSq() || 1e-9;
      const t = Math.min(1, Math.max(0, ap.dot(ab) / l2));
      const d = _v.distanceTo(ab.multiplyScalar(t).add(a));
      w[k] = { k, w: 1 / (d ** power + 1e-7) };
    }
    w.sort((x, y) => y.w - x.w);
    const top = w.slice(0, maxInfluence);
    const sum = top.reduce((s, e) => s + e.w, 0);
    let kept = 0;
    top.forEach((e, i) => {
      const val = e.w / sum;
      if (val < floor && i > 0) return;
      idx[v * 4 + kept] = bones[e.k].index;
      wts[v * 4 + kept] = val;
      kept++;
    });
    let s2 = 0;
    for (let i = 0; i < 4; i++) s2 += wts[v * 4 + i];
    for (let i = 0; i < 4; i++) wts[v * 4 + i] /= s2 || 1;
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wts, 4));
  return geo;
}
