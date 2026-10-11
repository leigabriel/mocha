import { fontCss } from './fonts.js';

/** Small canvas drawing kit used by the sticker artwork. Coordinates are plain pixels (y down). */

export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const fill = (g, color, x, y, w, h) => {
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
};

export function rrect(g, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + k, y);
  g.arcTo(x + w, y, x + w, y + h, k);
  g.arcTo(x + w, y + h, x, y + h, k);
  g.arcTo(x, y + h, x, y, k);
  g.arcTo(x, y, x + w, y, k);
  g.closePath();
}

export function disc(g, cx, cy, r, color, stroke = null, lw = 0) {
  g.beginPath();
  g.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2);
  if (color) {
    g.fillStyle = color;
    g.fill();
  }
  if (stroke) {
    g.lineWidth = lw;
    g.strokeStyle = stroke;
    g.stroke();
  }
}

/** Draws text fitted to a box: the size shrinks until the line fits maxW. */
export function text(g, str, x, y, { size = 40, font = 'sans', color = '#000', align = 'center', maxW = Infinity, base = 'middle', spacing = 0, stroke = null, strokeW = 0, rotate = 0 } = {}) {
  if (!str) return;
  g.save();
  g.translate(x, y);
  if (rotate) g.rotate(rotate);
  g.textAlign = align;
  g.textBaseline = base;
  if ('letterSpacing' in g) g.letterSpacing = `${spacing}px`;
  let s = size;
  g.font = fontCss(font, s);
  const w = g.measureText(str).width;
  if (w > maxW && maxW > 0) {
    s = Math.max(4, (s * maxW) / w);
    g.font = fontCss(font, s);
  }
  if (stroke) {
    g.lineJoin = 'round';
    g.lineWidth = strokeW || s * 0.12;
    g.strokeStyle = stroke;
    g.strokeText(str, 0, 0);
  }
  g.fillStyle = color;
  g.fillText(str, 0, 0);
  g.restore();
}

/** Stacks lines so the whole block fits the box (each line sized to the box width). */
export function stack(g, lines, x, y, w, h, opts = {}) {
  const gap = opts.gap ?? 0.06;
  const n = lines.length;
  const lh = h / (n + gap * (n - 1));
  lines.forEach((l, i) => text(g, l, x + w / 2, y + lh * (i + 0.5) + lh * gap * i, { ...opts, size: lh * (opts.fillH ?? 1), maxW: w }));
}

export function ringText(g, str, cx, cy, r, { size = 30, font = 'sans', color = '#000', start = -Math.PI / 2, span = Math.PI * 2, inside = false, spacing = 0 } = {}) {
  if (!str) return;
  g.save();
  g.font = fontCss(font, size);
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const chars = [...str];
  const widths = chars.map((c) => g.measureText(c).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) || chars.length * size * 0.6;
  const scale = Math.min(1, (r * span) / total);
  let a = start - (total * scale) / r / 2 * (span < Math.PI * 2 - 0.01 ? 1 : 0);
  if (span >= Math.PI * 2 - 0.01) a = start;
  chars.forEach((c, i) => {
    const wd = (widths[i] || size * 0.6) * scale;
    const mid = a + wd / r / 2;
    g.save();
    g.translate(cx + Math.cos(mid) * r, cy + Math.sin(mid) * r);
    g.rotate(mid + (inside ? -Math.PI / 2 : Math.PI / 2));
    g.scale(scale, 1);
    g.fillText(c, 0, 0);
    g.restore();
    a += wd / r;
  });
  g.restore();
}

export function barcode(g, x, y, w, h, seed, color = '#000') {
  const r = rng(seed);
  g.fillStyle = color;
  let cx = x;
  const unit = Math.max(1, w / 64);
  while (cx < x + w - unit) {
    const bar = unit * (1 + Math.floor(r() * 3));
    if (r() > 0.42) g.fillRect(cx, y, Math.min(bar, x + w - cx), h);
    cx += bar + unit * (r() > 0.6 ? 2 : 1);
  }
}

export function qr(g, x, y, s, seed, color = '#000', bg = '#fff') {
  const n = 21;
  const c = s / n;
  const r = rng(seed);
  fill(g, bg, x - c, y - c, s + c * 2, s + c * 2);
  g.fillStyle = color;
  const finder = (fx, fy) => {
    g.fillRect(x + fx * c, y + fy * c, 7 * c, 7 * c);
    fill(g, bg, x + (fx + 1) * c, y + (fy + 1) * c, 5 * c, 5 * c);
    g.fillStyle = color;
    g.fillRect(x + (fx + 2) * c, y + (fy + 2) * c, 3 * c, 3 * c);
  };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const inF = (i < 8 && j < 8) || (i > n - 9 && j < 8) || (i < 8 && j > n - 9);
    if (!inF && r() > 0.52) g.fillRect(x + i * c, y + j * c, c, c);
  }
  finder(0, 0);
  finder(n - 7, 0);
  finder(0, n - 7);
}

export function stripes(g, x, y, w, h, colors, { angle = 0, size = 20 } = {}) {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.translate(x + w / 2, y + h / 2);
  g.rotate(angle);
  const span = Math.hypot(w, h);
  for (let p = -span, i = 0; p < span; p += size, i++) fill(g, colors[i % colors.length], p, -span, size, span * 2);
  g.restore();
}

export function halftone(g, x, y, w, h, step, color, fade = (u, v) => 1 - v) {
  g.fillStyle = color;
  for (let j = 0, row = 0; y + j * step < y + h; j++, row++) {
    for (let i = 0; x + i * step < x + w; i++) {
      const u = (i * step) / w;
      const v = (j * step) / h;
      const r = (step / 2) * Math.max(0, Math.min(1, fade(u, v))) * 1.05;
      if (r < 0.4) continue;
      g.beginPath();
      g.arc(x + i * step + (row % 2 ? step / 2 : 0), y + j * step, r, 0, Math.PI * 2);
      g.fill();
    }
  }
}

export function dots(g, x, y, w, h, step, color, r) {
  g.fillStyle = color;
  for (let j = step / 2; j < h; j += step) for (let i = step / 2; i < w; i += step) {
    g.beginPath();
    g.arc(x + i, y + j, r, 0, Math.PI * 2);
    g.fill();
  }
}

export function waves(g, x, y, w, h, color, { amp = 8, len = 40, lw = 5, gap = 18 } = {}) {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.strokeStyle = color;
  g.lineWidth = lw;
  for (let yy = y; yy < y + h + amp; yy += gap) {
    g.beginPath();
    for (let xx = x; xx <= x + w + 2; xx += 4) g.lineTo(xx, yy + Math.sin(((xx - x) / len) * Math.PI * 2) * amp);
    g.stroke();
  }
  g.restore();
}

function poly(g, pts, color) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fillStyle = color;
  g.fill();
}

export const ICONS = ['cup', 'bolt', 'heart', 'star', 'eye', 'drop', 'leaf', 'flame', 'warning', 'radiation', 'biohazard', 'slip', 'sprout', 'sun', 'smile', 'arrow', 'steak', 'dumpling', 'chair', 'key', 'bean', 'bird', 'drumstick', 'moon'];

/** Flat pictograms drawn into a (cx, cy) box of `s` pixels. c1 is the main colour, c2 the detail. */
export function icon(g, name, cx, cy, s, c1 = '#000', c2 = '#fff') {
  g.save();
  g.translate(cx, cy);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const r = s / 2;
  switch (name) {
    case 'cup': {
      rrect(g, -r * 0.7, -r * 0.35, r * 1.3, r * 1.0, r * 0.3);
      g.fillStyle = c1;
      g.fill();
      g.beginPath();
      g.arc(r * 0.62, r * 0.12, r * 0.3, -Math.PI / 2, Math.PI / 2);
      g.lineWidth = r * 0.16;
      g.strokeStyle = c1;
      g.stroke();
      g.strokeStyle = c1;
      g.lineWidth = r * 0.1;
      for (const x of [-0.35, 0, 0.35]) {
        g.beginPath();
        g.moveTo(x * r, -r * 0.5);
        g.quadraticCurveTo((x + 0.15) * r, -r * 0.7, x * r, -r * 0.95);
        g.stroke();
      }
      break;
    }
    case 'bolt':
      poly(g, [[r * 0.15, -r], [-r * 0.6, r * 0.12], [-r * 0.05, r * 0.12], [-r * 0.2, r], [r * 0.6, -r * 0.2], [r * 0.05, -r * 0.2]], c1);
      break;
    case 'heart':
      g.beginPath();
      g.moveTo(0, r * 0.85);
      g.bezierCurveTo(-r * 1.3, -r * 0.1, -r * 0.65, -r * 0.95, 0, -r * 0.35);
      g.bezierCurveTo(r * 0.65, -r * 0.95, r * 1.3, -r * 0.1, 0, r * 0.85);
      g.fillStyle = c1;
      g.fill();
      break;
    case 'star': {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.42 : r;
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      }
      poly(g, pts, c1);
      break;
    }
    case 'eye':
      g.beginPath();
      g.moveTo(-r, 0);
      g.quadraticCurveTo(0, -r * 1.1, r, 0);
      g.quadraticCurveTo(0, r * 1.1, -r, 0);
      g.fillStyle = c1;
      g.fill();
      disc(g, 0, 0, r * 0.42, c2);
      disc(g, 0, 0, r * 0.2, c1);
      break;
    case 'drop':
      g.beginPath();
      g.moveTo(0, -r);
      g.bezierCurveTo(r * 0.9, -r * 0.1, r * 0.8, r * 0.9, 0, r * 0.9);
      g.bezierCurveTo(-r * 0.8, r * 0.9, -r * 0.9, -r * 0.1, 0, -r);
      g.fillStyle = c1;
      g.fill();
      break;
    case 'leaf':
      g.beginPath();
      g.moveTo(-r * 0.8, r * 0.8);
      g.bezierCurveTo(-r * 1.0, -r * 0.5, r * 0.2, -r * 1.0, r * 0.9, -r * 0.9);
      g.bezierCurveTo(r * 1.0, -r * 0.1, r * 0.4, r * 0.9, -r * 0.8, r * 0.8);
      g.fillStyle = c1;
      g.fill();
      g.strokeStyle = c2;
      g.lineWidth = r * 0.08;
      g.beginPath();
      g.moveTo(-r * 0.8, r * 0.8);
      g.quadraticCurveTo(0, 0, r * 0.7, -r * 0.7);
      g.stroke();
      break;
    case 'flame':
      g.beginPath();
      g.moveTo(0, -r);
      g.bezierCurveTo(r * 0.2, -r * 0.4, r * 0.9, -r * 0.3, r * 0.7, r * 0.3);
      g.bezierCurveTo(r * 0.6, r * 0.95, -r * 0.6, r * 0.95, -r * 0.7, r * 0.3);
      g.bezierCurveTo(-r * 0.75, -r * 0.1, -r * 0.3, -r * 0.2, 0, -r);
      g.fillStyle = c1;
      g.fill();
      g.beginPath();
      g.moveTo(0, r * 0.15);
      g.bezierCurveTo(r * 0.35, r * 0.3, r * 0.3, r * 0.75, 0, r * 0.75);
      g.bezierCurveTo(-r * 0.3, r * 0.75, -r * 0.3, r * 0.3, 0, r * 0.15);
      g.fillStyle = c2;
      g.fill();
      break;
    case 'warning':
      rrect(g, -r * 0.1, -r * 0.8, r * 0.2, r * 1.0, r * 0.1);
      g.fillStyle = c1;
      g.fill();
      disc(g, 0, r * 0.52, r * 0.13, c1);
      break;
    case 'radiation':
      disc(g, 0, 0, r * 0.16, c1);
      for (let k = 0; k < 3; k++) {
        const a0 = -Math.PI / 2 + (k * 2 * Math.PI) / 3 - Math.PI / 6;
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, r, a0, a0 + Math.PI / 3);
        g.closePath();
        g.fillStyle = c1;
        g.fill();
      }
      disc(g, 0, 0, r * 0.28, c2);
      disc(g, 0, 0, r * 0.15, c1);
      break;
    case 'biohazard':
      for (let k = 0; k < 3; k++) {
        const a = -Math.PI / 2 + (k * 2 * Math.PI) / 3;
        g.beginPath();
        g.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.5, 0, Math.PI * 2);
        g.lineWidth = r * 0.18;
        g.strokeStyle = c1;
        g.stroke();
      }
      disc(g, 0, 0, r * 0.2, c1);
      break;
    case 'slip':
      g.strokeStyle = c1;
      g.fillStyle = c1;
      g.lineWidth = r * 0.2;
      disc(g, -r * 0.35, -r * 0.7, r * 0.2, c1);
      g.beginPath();
      g.moveTo(-r * 0.2, -r * 0.35);
      g.lineTo(r * 0.15, 0);
      g.lineTo(r * 0.7, r * 0.05);
      g.moveTo(r * 0.15, 0);
      g.lineTo(-r * 0.05, r * 0.55);
      g.moveTo(-r * 0.2, -r * 0.35);
      g.lineTo(-r * 0.7, -r * 0.1);
      g.stroke();
      g.beginPath();
      g.moveTo(-r * 0.9, r * 0.8);
      g.lineTo(r * 0.9, r * 0.45);
      g.lineWidth = r * 0.12;
      g.stroke();
      break;
    case 'sprout':
      g.strokeStyle = c1;
      g.lineWidth = r * 0.12;
      g.beginPath();
      g.moveTo(0, r * 0.9);
      g.lineTo(0, -r * 0.2);
      g.stroke();
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.moveTo(0, -r * 0.1);
        g.bezierCurveTo(sx * r * 0.2, -r * 0.9, sx * r * 0.95, -r * 0.8, sx * r * 0.9, -r * 0.25);
        g.bezierCurveTo(sx * r * 0.5, -r * 0.05, sx * r * 0.2, -r * 0.1, 0, -r * 0.1);
        g.fillStyle = c1;
        g.fill();
      }
      break;
    case 'sun':
      disc(g, 0, 0, r * 0.45, c1);
      g.strokeStyle = c1;
      g.lineWidth = r * 0.14;
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        g.beginPath();
        g.moveTo(Math.cos(a) * r * 0.65, Math.sin(a) * r * 0.65);
        g.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
        g.stroke();
      }
      break;
    case 'moon':
      g.beginPath();
      g.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      g.fillStyle = c1;
      g.fill();
      disc(g, r * 0.4, -r * 0.2, r * 0.7, c2);
      break;
    case 'smile':
      disc(g, 0, 0, r * 0.95, c1);
      disc(g, -r * 0.32, -r * 0.2, r * 0.12, c2);
      disc(g, r * 0.32, -r * 0.2, r * 0.12, c2);
      g.beginPath();
      g.arc(0, r * 0.05, r * 0.5, 0.15 * Math.PI, 0.85 * Math.PI);
      g.strokeStyle = c2;
      g.lineWidth = r * 0.12;
      g.stroke();
      break;
    case 'arrow':
      poly(g, [[-r, -r * 0.25], [r * 0.2, -r * 0.25], [r * 0.2, -r * 0.7], [r, 0], [r * 0.2, r * 0.7], [r * 0.2, r * 0.25], [-r, r * 0.25]], c1);
      break;
    case 'steak':
      g.beginPath();
      g.moveTo(-r * 0.9, -r * 0.1);
      g.bezierCurveTo(-r * 1.0, -r * 0.8, r * 0.3, -r * 0.95, r * 0.8, -r * 0.45);
      g.bezierCurveTo(r * 1.1, 0, r * 0.8, r * 0.8, r * 0.1, r * 0.75);
      g.bezierCurveTo(-r * 0.7, r * 0.8, -r * 0.8, r * 0.4, -r * 0.9, -r * 0.1);
      g.fillStyle = c1;
      g.fill();
      g.strokeStyle = c2;
      g.lineWidth = r * 0.09;
      for (const [a, b, c, d] of [[-0.5, -0.4, 0, -0.2], [0, 0.1, 0.5, -0.05], [-0.3, 0.3, 0.2, 0.35]]) {
        g.beginPath();
        g.moveTo(a * r, b * r);
        g.quadraticCurveTo(((a + c) / 2) * r, ((b + d) / 2 - 0.2) * r, c * r, d * r);
        g.stroke();
      }
      break;
    case 'dumpling':
      g.beginPath();
      g.moveTo(-r, r * 0.35);
      g.bezierCurveTo(-r, -r * 0.8, r, -r * 0.8, r, r * 0.35);
      g.quadraticCurveTo(0, r * 0.95, -r, r * 0.35);
      g.fillStyle = c1;
      g.fill();
      g.strokeStyle = c2;
      g.lineWidth = r * 0.08;
      for (let k = -2; k <= 2; k++) {
        g.beginPath();
        g.moveTo(k * r * 0.28, -r * 0.45 + Math.abs(k) * r * 0.1);
        g.lineTo(k * r * 0.22, -r * 0.1 + Math.abs(k) * r * 0.1);
        g.stroke();
      }
      break;
    case 'chair':
      g.strokeStyle = c1;
      g.lineWidth = r * 0.2;
      g.beginPath();
      g.moveTo(-r * 0.5, -r * 0.9);
      g.lineTo(-r * 0.5, r * 0.9);
      g.moveTo(-r * 0.5, r * 0.05);
      g.lineTo(r * 0.6, r * 0.05);
      g.lineTo(r * 0.6, r * 0.9);
      g.stroke();
      break;
    case 'key':
      disc(g, -r * 0.45, 0, r * 0.38, null, c1, r * 0.2);
      g.strokeStyle = c1;
      g.lineWidth = r * 0.2;
      g.beginPath();
      g.moveTo(-r * 0.1, 0);
      g.lineTo(r * 0.9, 0);
      g.moveTo(r * 0.55, 0);
      g.lineTo(r * 0.55, r * 0.35);
      g.moveTo(r * 0.85, 0);
      g.lineTo(r * 0.85, r * 0.35);
      g.stroke();
      break;
    case 'bean':
      g.beginPath();
      g.ellipse(0, 0, r * 0.6, r * 0.9, Math.PI / 5, 0, Math.PI * 2);
      g.fillStyle = c1;
      g.fill();
      g.strokeStyle = c2;
      g.lineWidth = r * 0.12;
      g.beginPath();
      g.moveTo(-r * 0.3, -r * 0.65);
      g.bezierCurveTo(r * 0.3, -r * 0.2, -r * 0.3, r * 0.2, r * 0.3, r * 0.65);
      g.stroke();
      break;
    case 'bird':
      g.beginPath();
      g.ellipse(0, r * 0.1, r * 0.8, r * 0.5, -0.1, 0, Math.PI * 2);
      g.fillStyle = c1;
      g.fill();
      disc(g, r * 0.7, -r * 0.3, r * 0.3, c1);
      poly(g, [[r * 0.95, -r * 0.35], [r * 1.25, -r * 0.25], [r * 0.95, -r * 0.15]], c2);
      poly(g, [[-r * 0.7, 0], [-r * 1.2, -r * 0.35], [-r * 1.0, r * 0.25]], c1);
      disc(g, r * 0.76, -r * 0.36, r * 0.05, c2);
      break;
    case 'drumstick':
      g.beginPath();
      g.ellipse(-r * 0.15, -r * 0.2, r * 0.7, r * 0.55, -Math.PI / 4, 0, Math.PI * 2);
      g.fillStyle = c1;
      g.fill();
      g.strokeStyle = c2;
      g.lineWidth = r * 0.2;
      g.beginPath();
      g.moveTo(r * 0.25, r * 0.2);
      g.lineTo(r * 0.8, r * 0.75);
      g.stroke();
      disc(g, r * 0.95, r * 0.55, r * 0.17, c2);
      disc(g, r * 0.6, r * 0.95, r * 0.17, c2);
      break;
    default:
      disc(g, 0, 0, r * 0.8, c1);
  }
  g.restore();
}

export { poly };
