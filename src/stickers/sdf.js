/**
 * Tiny 2-D signed-distance toolkit. Shapes are functions (x, y) => distance (negative inside),
 * with +y pointing up and units in centimetres. Die-cut outlines are traced from them with
 * marching squares, and offsetting a shape by a border is just `f - width`.
 */

export const circle = (r) => (x, y) => Math.hypot(x, y) - r;

export const box = (w, h, r = 0) => (x, y) => {
  const qx = Math.abs(x) - w / 2 + r;
  const qy = Math.abs(y) - h / 2 + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};

export const ellipse = (rx, ry) => (x, y) => (Math.hypot(x / rx, y / ry) - 1) * Math.min(rx, ry);

/** Distance to a convex or concave polygon given as [[x, y], ...]. */
export const polygon = (pts) => (x, y) => {
  let d = (x - pts[0][0]) ** 2 + (y - pts[0][1]) ** 2;
  let s = 1;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i++) {
    const [ax, ay] = pts[j];
    const [bx, by] = pts[i];
    const ex = bx - ax;
    const ey = by - ay;
    const wx = x - ax;
    const wy = y - ay;
    const t = Math.min(1, Math.max(0, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1)));
    const px = wx - ex * t;
    const py = wy - ey * t;
    d = Math.min(d, px * px + py * py);
    const c1 = y >= ay;
    const c2 = y < by;
    const c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * Math.sqrt(d);
};

/** Rounded regular polygon / triangle etc. */
export const ngon = (n, r, corner = 0, rotation = Math.PI / 2) => {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = rotation + (i / n) * Math.PI * 2;
    pts.push([Math.cos(a) * (r - corner), Math.sin(a) * (r - corner)]);
  }
  const p = polygon(pts);
  return (x, y) => p(x, y) - corner;
};

/** A star with `n` points; `inner` is the inner/outer radius ratio. */
export const star = (n, r, inner = 0.5, corner = 0) => {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = Math.PI / 2 + (i / (n * 2)) * Math.PI * 2;
    const rr = (i % 2 ? r * inner : r) - corner;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  const p = polygon(pts);
  return (x, y) => p(x, y) - corner;
};

/** r(theta) based outline (approximate distance - fine for die-cut offsets). */
export const polar = (fn) => (x, y) => Math.hypot(x, y) - fn(Math.atan2(y, x));
export const flower = (petals, r, amp) => polar((a) => r + amp * Math.cos(petals * a));
export const scallop = (bumps, r, depth) => polar((a) => r - depth + depth * Math.abs(Math.cos((bumps * a) / 2)) ** 0.7);
export const wobble = (r, amps, seed = 1) => polar((a) => r * (1 + amps.reduce((s, k, i) => s + k * Math.sin((i + 2) * a + seed * (i + 1)), 0)));

export const move = (f, dx, dy) => (x, y) => f(x - dx, y - dy);
export const rotate = (f, a) => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return (x, y) => f(x * c + y * s, -x * s + y * c);
};
export const scale = (f, k) => (x, y) => f(x / k, y / k) * k;
export const stretch = (f, sx, sy) => (x, y) => f(x / sx, y / sy) * Math.min(sx, sy);
export const flipX = (f) => (x, y) => f(-x, y);
export const grow = (f, r) => (x, y) => f(x, y) - r;

export const union = (...fs) => (x, y) => {
  let m = Infinity;
  for (const f of fs) m = Math.min(m, f(x, y));
  return m;
};
export const smoothUnion = (k, ...fs) => (x, y) => {
  let m = fs[0](x, y);
  for (let i = 1; i < fs.length; i++) {
    const d = fs[i](x, y);
    const h = Math.max(k - Math.abs(m - d), 0) / k;
    m = Math.min(m, d) - h * h * k * 0.25;
  }
  return m;
};
export const subtract = (a, b) => (x, y) => Math.max(a(x, y), -b(x, y));
export const intersect = (a, b) => (x, y) => Math.max(a(x, y), b(x, y));

/** Pixel-art silhouette from rows of '#'/'.' (cell size in cm, centred): a union of run boxes. */
export function pixels(rows, cell) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const boxes = [];
  rows.forEach((row, cy) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== '#') {
        x++;
        continue;
      }
      let e = x;
      while (e < row.length && row[e] === '#') e++;
      boxes.push(box((e - x) * cell, cell, 0), ((x + e) / 2 - w / 2) * cell, (h / 2 - cy - 0.5) * cell);
      x = e;
    }
  });
  const list = [];
  for (let i = 0; i < boxes.length; i += 3) list.push(move(boxes[i], boxes[i + 1], boxes[i + 2]));
  return union(...list);
}

// ---------------------------------------------------------------- marching squares

const CASES = [
  [], ['B', 'L'], ['B', 'R'], ['L', 'R'], ['R', 'T'], null, ['B', 'T'], ['L', 'T'],
  ['L', 'T'], ['B', 'T'], null, ['R', 'T'], ['L', 'R'], ['B', 'R'], ['B', 'L'], [],
];

/**
 * Traces the zero (or `level`) contour of `f` over bounds [x0, y0, x1, y1].
 * Returns loops of [x, y] points: outer loops counter-clockwise, holes clockwise.
 */
export function sampleGrid(f, [x0, y0, x1, y1], step = 0.05) {
  const nx = Math.ceil((x1 - x0) / step);
  const ny = Math.ceil((y1 - y0) / step);
  const stride = nx + 1;
  const val = new Float32Array((nx + 1) * (ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) val[j * stride + i] = f(x0 + i * step, y0 + j * step);
  return { val, nx, ny, x0, y0, step };
}

export function traceContours(f, b, step = 0.05, level = 0) {
  return traceGrid(sampleGrid(f, b, step), level);
}

/** Contours of a sampled grid at `level` (inside = value < level). */
export function traceGrid({ val: raw, nx, ny, x0, y0, step }, level = 0) {
  const stride = nx + 1;
  const val = level === 0 ? raw : raw.map((v) => v - level);
  const V = (i, j) => val[j * stride + i];
  const pt = new Map();
  const adj = new Map();
  const edgePoint = (kind, i, j) => {
    const key = `${kind}${i},${j}`;
    if (!pt.has(key)) {
      const [ai, aj, bi, bj] = kind === 'h' ? [i, j, i + 1, j] : [i, j, i, j + 1];
      const a = V(ai, aj);
      const b = V(bi, bj);
      const t = a === b ? 0.5 : Math.min(1, Math.max(0, a / (a - b)));
      pt.set(key, [x0 + (ai + (bi - ai) * t) * step, y0 + (aj + (bj - aj) * t) * step]);
    }
    return key;
  };
  const link = (a, b) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push(b);
    adj.get(b).push(a);
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = V(i, j);
      const b = V(i + 1, j);
      const c = V(i + 1, j + 1);
      const d = V(i, j + 1);
      const idx = (a < 0 ? 1 : 0) | (b < 0 ? 2 : 0) | (c < 0 ? 4 : 0) | (d < 0 ? 8 : 0);
      if (idx === 0 || idx === 15) continue;
      const key = { B: () => edgePoint('h', i, j), T: () => edgePoint('h', i, j + 1), L: () => edgePoint('v', i, j), R: () => edgePoint('v', i + 1, j) };
      let segs;
      if (idx === 5 || idx === 10) {
        const centre = (a + b + c + d) / 4 < 0;
        if (idx === 5) segs = centre ? [['B', 'R'], ['L', 'T']] : [['B', 'L'], ['R', 'T']];
        else segs = centre ? [['B', 'L'], ['R', 'T']] : [['B', 'R'], ['L', 'T']];
      } else segs = [CASES[idx]];
      for (const [p, q] of segs) link(key[p](), key[q]());
    }
  }
  const seen = new Set();
  const loops = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let prev = null;
    let cur = start;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      loop.push(pt.get(cur));
      const next = adj.get(cur).find((n) => n !== prev && !seen.has(n)) ?? null;
      prev = cur;
      cur = next;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return orient(loops);
}

export function area(loop) {
  let s = 0;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i, i++) s += loop[j][0] * loop[i][1] - loop[i][0] * loop[j][1];
  return s / 2;
}

function inside(p, loop) {
  let c = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i, i++) {
    const [xi, yi] = loop[i];
    const [xj, yj] = loop[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Makes outer loops CCW and holes CW (a loop is a hole when an odd number of loops contain it). */
export function orient(loops) {
  return loops
    .filter((l) => Math.abs(area(l)) > 1e-4)
    .map((l, i, all) => {
      const depth = all.reduce((n, o, k) => (k !== i && inside(l[0], o) ? n + 1 : n), 0);
      const hole = depth % 2 === 1;
      const ccw = area(l) > 0;
      const out = hole === !ccw ? l : [...l].reverse();
      out.hole = hole;
      return out;
    });
}

/** Douglas-Peucker on a closed loop. */
export function simplify(loop, eps = 0.006) {
  if (loop.length < 8) return loop;
  const keep = new Array(loop.length).fill(false);
  keep[0] = true;
  // split at the farthest point from the first so a closed loop is handled as two open runs
  let far = 0;
  let fd = -1;
  for (let i = 1; i < loop.length; i++) {
    const d = (loop[i][0] - loop[0][0]) ** 2 + (loop[i][1] - loop[0][1]) ** 2;
    if (d > fd) {
      fd = d;
      far = i;
    }
  }
  keep[far] = true;
  const run = (a, b) => {
    const stack = [[a, b]];
    while (stack.length) {
      const [s, e] = stack.pop();
      if (e - s < 2) continue;
      const [ax, ay] = loop[s % loop.length];
      const [bx, by] = loop[e % loop.length];
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      let md = 0;
      let mi = -1;
      for (let i = s + 1; i < e; i++) {
        const [px, py] = loop[i % loop.length];
        const d = Math.abs((px - ax) * dy - (py - ay) * dx) / len;
        if (d > md) {
          md = d;
          mi = i;
        }
      }
      if (md > eps && mi >= 0) {
        keep[mi % loop.length] = true;
        stack.push([s, mi], [mi, e]);
      }
    }
  };
  run(0, far);
  run(far, loop.length);
  const out = loop.filter((_, i) => keep[i]);
  out.hole = loop.hole;
  return out;
}

/** Chaikin corner cutting (closed). */
export function smooth(loop, iterations = 1) {
  let l = loop;
  for (let it = 0; it < iterations; it++) {
    const n = [];
    for (let i = 0; i < l.length; i++) {
      const a = l[i];
      const b = l[(i + 1) % l.length];
      n.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    l = n;
  }
  l.hole = loop.hole;
  return l;
}

export function bounds(loops, pad = 0) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const l of loops) for (const [x, y] of l) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}
