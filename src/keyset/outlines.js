import * as THREE from 'three';
import { roundedRect } from '../tagbuilder/shapes.js';
import { parseSvgShapes } from '../tagbuilder/svg.js';

/** Closed polygon with rounded corners (radius r), points in order. */
export function roundedPolygon(points, r) {
  const n = points.length;
  const s = new THREE.Shape();
  const corner = (i) => {
    const p = points[i];
    const a = points[(i + n - 1) % n];
    const b = points[(i + 1) % n];
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]);
    const db = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const k = Math.min(r, da * 0.45, db * 0.45);
    return {
      p,
      from: [p[0] + ((a[0] - p[0]) / da) * k, p[1] + ((a[1] - p[1]) / da) * k],
      to: [p[0] + ((b[0] - p[0]) / db) * k, p[1] + ((b[1] - p[1]) / db) * k],
    };
  };
  const cs = points.map((_, i) => corner(i));
  s.moveTo(cs[0].to[0], cs[0].to[1]);
  for (let i = 1; i <= n; i++) {
    const c = cs[i % n];
    s.lineTo(c.from[0], c.from[1]);
    s.quadraticCurveTo(c.p[0], c.p[1], c.to[0], c.to[1]);
  }
  s.closePath();
  return s;
}

function motelShape(w, h, r) {
  const rt = Math.min(r + 4, w / 2 - 0.1);
  const rb = Math.min(w / 2, h / 2 - 0.1);
  const x = w / 2;
  const y = h / 2;
  const s = new THREE.Shape();
  s.moveTo(-x + rt, y);
  s.lineTo(x - rt, y);
  s.absarc(x - rt, y - rt, rt, Math.PI / 2, 0, true);
  s.lineTo(x, -y + rb);
  s.absarc(x - rb, -y + rb, rb, 0, -Math.PI / 2, true);
  s.lineTo(-x + rb, -y);
  s.absarc(-x + rb, -y + rb, rb, -Math.PI / 2, -Math.PI, true);
  s.lineTo(-x, y - rt);
  s.absarc(-x + rt, y - rt, rt, Math.PI, Math.PI / 2, true);
  return s;
}

// Unit artwork in [-1, 1] on both axes, y up. Scaled to the charm box by `fitShape`.
function unitPath(kind) {
  const s = new THREE.Shape();
  switch (kind) {
    case 'cat':
      s.moveTo(0, -0.92);
      s.bezierCurveTo(0.62, -0.92, 1, -0.62, 1, -0.12);
      s.bezierCurveTo(1, 0.22, 0.9, 0.46, 0.84, 0.6);
      s.lineTo(0.8, 1);
      s.lineTo(0.3, 0.66);
      s.bezierCurveTo(0.2, 0.62, 0.1, 0.6, 0, 0.6);
      s.bezierCurveTo(-0.1, 0.6, -0.2, 0.62, -0.3, 0.66);
      s.lineTo(-0.8, 1);
      s.lineTo(-0.84, 0.6);
      s.bezierCurveTo(-0.9, 0.46, -1, 0.22, -1, -0.12);
      s.bezierCurveTo(-1, -0.62, -0.62, -0.92, 0, -0.92);
      break;
    case 'heart':
      s.moveTo(0, -1);
      s.bezierCurveTo(-0.4, -0.7, -1, -0.3, -1, 0.3);
      s.bezierCurveTo(-1, 0.8, -0.5, 1, 0, 0.55);
      s.bezierCurveTo(0.5, 1, 1, 0.8, 1, 0.3);
      s.bezierCurveTo(1, -0.3, 0.4, -0.7, 0, -1);
      break;
    case 'star': {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? 1 : 0.46;
        pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
      }
      return roundedPolygon(pts, 0.12);
    }
    case 'bolt':
      return roundedPolygon([[0.25, 1], [-0.6, -0.1], [-0.05, -0.1], [-0.3, -1], [0.65, 0.18], [0.08, 0.18]], 0.08);
    case 'cloud':
    default:
      s.moveTo(-0.72, -0.55);
      s.lineTo(0.72, -0.55);
      s.bezierCurveTo(1.05, -0.55, 1.05, 0.02, 0.76, 0.06);
      s.bezierCurveTo(0.86, 0.5, 0.42, 0.72, 0.2, 0.46);
      s.bezierCurveTo(0.08, 0.92, -0.5, 0.86, -0.46, 0.34);
      s.bezierCurveTo(-0.9, 0.5, -1.15, -0.12, -0.8, -0.2);
      s.bezierCurveTo(-1.1, -0.2, -1.05, -0.55, -0.72, -0.55);
  }
  return s;
}

function shapeBox(shapes) {
  const box = new THREE.Box2();
  for (const sh of shapes) for (const p of sh.getPoints(16)) box.expandByPoint(p);
  return box;
}

function transformShape(shape, fx, fy) {
  const map = (pts) => pts.map((p) => new THREE.Vector2(fx(p.x), fy(p.y)));
  const out = new THREE.Shape(map(shape.getPoints(24)));
  out.holes = shape.holes.map((h) => new THREE.Path(map(h.getPoints(24))));
  return out;
}

/** Scales shapes so their bounding box is exactly w by h, centred on the origin. */
export function fitShapes(shapes, w, h) {
  const box = shapeBox(shapes);
  const bw = box.max.x - box.min.x || 1;
  const bh = box.max.y - box.min.y || 1;
  const cx = (box.min.x + box.max.x) / 2;
  const cy = (box.min.y + box.max.y) / 2;
  return shapes.map((s) => transformShape(s, (x) => ((x - cx) / bw) * w, (y) => ((y - cy) / bh) * h));
}

/** Highest y of the shape within |x| < tol (where an eyelet ear can sit). */
export function topAtCentre(shapes, tol = 1.5) {
  let top = -Infinity;
  for (const s of shapes) for (const p of s.getPoints(32)) if (Math.abs(p.x) <= tol && p.y > top) top = p.y;
  return Number.isFinite(top) ? top : shapeBox(shapes).max.y;
}

/**
 * Outline of a charm, centred on its own box. Returns { shapes, holeY, eyelet } where
 * `holeY` is where the jump ring passes and `eyelet` is true when a separate ear is needed.
 */
export function charmOutline(c, inset) {
  const { w, h } = c;
  switch (c.style) {
    case 'bar':
    case 'ribbed':
      return { shapes: [roundedRect(w, h, Math.min(c.r, w / 2 - 0.1))], holeY: h / 2 - inset, eyelet: false, hole: true };
    case 'circle': {
      const s = new THREE.Shape();
      s.absellipse(0, 0, w / 2, h / 2, 0, Math.PI * 2, false, 0);
      return { shapes: [s], holeY: h / 2 - inset, eyelet: false, hole: true };
    }
    case 'triangle': {
      const pts = [[0, h / 2], [w / 2, -h / 2], [-w / 2, -h / 2]];
      return { shapes: [roundedPolygon(pts, Math.max(2, c.r))], holeY: h / 2 - inset - 5, eyelet: false, hole: true };
    }
    case 'silhouette': {
      let shapes;
      if (c.silhouette === 'upload') {
        const svg = c.svg ? parseSvgShapes(c.svg) : null;
        shapes = svg ? fitShapes([...svg.groups.values()].flat(), w, h) : null;
      }
      shapes = shapes ?? fitShapes([unitPath(c.silhouette === 'upload' ? 'cat' : c.silhouette)], w, h);
      return { shapes, holeY: topAtCentre(shapes) + 1.8, eyelet: true, hole: false };
    }
    case 'motel':
    default:
      return { shapes: [motelShape(w, h, c.r)], holeY: h / 2 - inset, eyelet: false, hole: true };
  }
}
