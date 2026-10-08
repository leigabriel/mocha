import * as THREE from 'three';

/** Closed rounded-rectangle contour centred on the origin (w by h, corner radius r). */
export function roundedRect(w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2 - 0.01, h / 2 - 0.01));
  const x = -w / 2;
  const y = -h / 2;
  const s = new THREE.Shape();
  if (rr < 0.01) {
    s.moveTo(x, y).lineTo(x + w, y).lineTo(x + w, y + h).lineTo(x, y + h).closePath();
    return s;
  }
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.absarc(x + w - rr, y + rr, rr, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - rr);
  s.absarc(x + w - rr, y + h - rr, rr, 0, Math.PI / 2, false);
  s.lineTo(x + rr, y + h);
  s.absarc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + rr);
  s.absarc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5, false);
  return s;
}

function hexagon(w, h, r) {
  const s = new THREE.Shape();
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    pts.push([Math.cos(a) * (w / 2), Math.sin(a) * (h / 2)]);
  }
  // soften the corners a little by pulling points towards the neighbours
  const k = Math.min(0.35, r / Math.max(w, h));
  const out = [];
  for (let i = 0; i < 6; i++) {
    const p = pts[i];
    const n = pts[(i + 1) % 6];
    const q = pts[(i + 5) % 6];
    out.push([p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]);
    out.push([p[0] + (n[0] - p[0]) * k, p[1] + (n[1] - p[1]) * k]);
  }
  s.moveTo(out[0][0], out[0][1]);
  for (let i = 1; i < out.length; i++) s.lineTo(out[i][0], out[i][1]);
  s.closePath();
  return s;
}

/** Tag outline for a shape id, centred on the origin. */
export function outlineShape(kind, w, h, r) {
  switch (kind) {
    case 'pill':
      return roundedRect(w, h, Math.min(w, h) / 2);
    case 'circle': {
      const s = new THREE.Shape();
      s.absellipse(0, 0, w / 2, h / 2, 0, Math.PI * 2, false, 0);
      return s;
    }
    case 'hex':
      return hexagon(w, h, r);
    case 'bar':
    case 'rounded':
    default:
      return roundedRect(w, h, kind === 'bar' ? Math.min(r, 3) : r);
  }
}

/** Adds a round hole (for the jump ring) to a shape. */
export function addHole(shape, cx, cy, radius) {
  const hole = new THREE.Path();
  hole.absarc(cx, cy, radius, 0, Math.PI * 2, true);
  shape.holes.push(hole);
}
