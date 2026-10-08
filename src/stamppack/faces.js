import { HEADER_FONTS, PACK } from './constants.js';
import { stampSize } from './geometry.js';

/** Paints the printed side of a stamp or the header card onto a canvas (1 px = 1 / ppm mm). */

const PPM = 16;
const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  return c;
}

/** Draws `img` covering the box with zoom and pan (pan -1..1 moves within the overflow). */
function drawCover(ctx, img, x, y, w, h, zoom, panX, panY) {
  const ar = img.width / img.height;
  let dw = w;
  let dh = w / ar;
  if (dh < h) {
    dh = h;
    dw = h * ar;
  }
  dw *= zoom;
  dh *= zoom;
  const ox = ((dw - w) / 2) * panX;
  const oy = ((dh - h) / 2) * panY;
  ctx.drawImage(img, x + (w - dw) / 2 - ox, y + (h - dh) / 2 - oy, dw, dh);
}

function lum(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function applyLook(ctx, w, h, look, ink, paper) {
  if (look === 'original') return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const [ir, ig, ib] = hexToRgb(ink);
  const [pr, pg, pb] = hexToRgb(paper);
  if (look === 'mono' || look === 'duotone') {
    for (let i = 0; i < d.length; i += 4) {
      let l = lum(d[i], d[i + 1], d[i + 2]);
      l = Math.min(1, Math.max(0, (l - 0.5) * 1.15 + 0.5));
      if (look === 'mono') {
        const g = Math.round(l * 255);
        d[i] = d[i + 1] = d[i + 2] = g;
      } else {
        d[i] = ir + (pr - ir) * l;
        d[i + 1] = ig + (pg - ig) * l;
        d[i + 2] = ib + (pb - ib) * l;
      }
    }
    ctx.putImageData(img, 0, 0);
    return;
  }
  // halftone: dots on the paper, dark = big
  const cell = Math.max(6, Math.round(PPM * 0.5));
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = ink;
  for (let cy = 0; cy < h; cy += cell) {
    for (let cx = 0; cx < w; cx += cell) {
      let sum = 0;
      let cnt = 0;
      for (let y = cy; y < Math.min(h, cy + cell); y += 2) {
        for (let x = cx; x < Math.min(w, cx + cell); x += 2) {
          const i = (y * w + x) * 4;
          sum += lum(d[i], d[i + 1], d[i + 2]);
          cnt++;
        }
      }
      const dark = 1 - sum / Math.max(1, cnt);
      const r = cell * 0.5 * Math.sqrt(Math.min(1, dark * 1.1));
      if (r > 0.4) {
        ctx.beginPath();
        ctx.arc(cx + cell / 2, cy + cell / 2, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function fitText(ctx, str, family, weight, maxW, maxPx) {
  let px = maxPx;
  ctx.font = `${weight} ${px}px ${family}`;
  const w = ctx.measureText(str).width;
  if (w > maxW) px = Math.max(6, (px * maxW) / w);
  ctx.font = `${weight} ${px}px ${family}`;
  return px;
}

function insetPolygon(shape, w, h, b) {
  const hw = w / 2;
  const hh = h / 2;
  if (shape === 'wedge') {
    // inset a triangle by moving each vertex towards the centroid
    const v = [[hw * 0.1, -hh], [hw, hh], [-hw, hh]];
    const cx = (v[0][0] + v[1][0] + v[2][0]) / 3;
    const cy = (v[0][1] + v[1][1] + v[2][1]) / 3;
    const k = 1 - (b * 2.6) / Math.min(w, h);
    return v.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
  }
  return [[-hw + b, -hh + b], [hw - b, -hh + b], [hw - b, hh - b], [-hw + b, hh - b]];
}

/** Printed face of one stamp. Returns a canvas covering the stamp's bounding box. */
export function stampFace(stamp, image, paper) {
  const { w, h } = stampSize(stamp.shape, stamp.scale);
  const W = w * PPM;
  const H = h * PPM;
  const out = canvas(W, H);
  const ctx = out.getContext('2d');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, out.width, out.height);
  const sx = out.width / w;
  const sy = out.height / h;
  const caption = stamp.caption.trim();
  const circle = stamp.shape === 'circle';
  const wedge = stamp.shape === 'wedge';
  const b = Math.max(stamp.border, circle && caption ? 5 : 0);
  const capH = caption && !circle && !wedge ? Math.max(4.4, h * 0.11) : 0;

  // picture window
  let path;
  let box;
  if (circle) {
    const R = Math.min(w, h) / 2 - b;
    box = { x: w / 2 - R, y: h / 2 - R, w: R * 2, h: R * 2 };
    path = () => ctx.arc((w / 2) * sx, (h / 2) * sy, R * sx, 0, Math.PI * 2);
  } else if (wedge) {
    const poly = insetPolygon('wedge', w, h, b).map(([x, y]) => [(x + w / 2) * sx, (h / 2 - y) * sy]);
    const xs = poly.map((p) => p[0]);
    const ys = poly.map((p) => p[1]);
    box = { x: Math.min(...xs) / sx, y: Math.min(...ys) / sy, w: (Math.max(...xs) - Math.min(...xs)) / sx, h: (Math.max(...ys) - Math.min(...ys)) / sy };
    path = () => {
      ctx.moveTo(poly[0][0], poly[0][1]);
      poly.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.closePath();
    };
  } else {
    box = { x: b, y: b, w: w - 2 * b, h: h - 2 * b - capH };
    path = () => ctx.rect(box.x * sx, box.y * sy, box.w * sx, box.h * sy);
  }

  const bw = Math.max(2, Math.round(box.w * sx));
  const bh = Math.max(2, Math.round(box.h * sy));
  const tmp = canvas(bw, bh);
  const t = tmp.getContext('2d', { willReadFrequently: true });
  t.fillStyle = paper;
  t.fillRect(0, 0, bw, bh);
  if (image) drawCover(t, image.canvas, 0, 0, bw, bh, stamp.zoom, stamp.panX, stamp.panY);
  applyLook(t, bw, bh, stamp.look, stamp.ink, paper);

  ctx.save();
  ctx.beginPath();
  path();
  ctx.clip();
  ctx.drawImage(tmp, box.x * sx, box.y * sy, bw, bh);
  ctx.restore();

  // thin keyline round the picture, like printed stamps
  ctx.save();
  ctx.beginPath();
  path();
  ctx.lineWidth = Math.max(1, sx * 0.12);
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.stroke();
  ctx.restore();

  if (caption) {
    ctx.fillStyle = stamp.ink;
    const family = HEADER_FONTS[1].css;
    if (circle) {
      const R = Math.min(w, h) / 2 - b / 2;
      const px = Math.min(sx * 2.6, (Math.PI * 2 * R * sx * 0.6) / Math.max(8, caption.length * 0.62));
      ctx.font = `700 ${px}px ${family}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const step = Math.min(0.2, (px * 0.62) / (R * sx));
      const total = step * (caption.length - 1);
      for (let i = 0; i < caption.length; i++) {
        const a = Math.PI / 2 + total / 2 - i * step; // along the bottom, reading left to right
        ctx.save();
        ctx.translate((w / 2) * sx + Math.cos(a) * R * sx, (h / 2) * sy + Math.sin(a) * R * sx);
        ctx.rotate(a - Math.PI / 2);
        ctx.fillText(caption[i], 0, 0);
        ctx.restore();
      }
    } else if (!wedge) {
      const px = fitText(ctx, caption, family, 700, (w - 2 * b) * sx, capH * sy * 0.78);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${px}px ${family}`;
      ctx.fillText(caption, (w / 2) * sx, (h - b - capH / 2 + 0.3) * sy);
    }
  }
  return out;
}

/** Printed face of the header card. */
export function cardFace(card, logo, icon) {
  const w = PACK.cardW;
  const h = PACK.cardH;
  const out = canvas(w * PPM, h * PPM);
  const ctx = out.getContext('2d');
  ctx.fillStyle = card.paper;
  ctx.fillRect(0, 0, out.width, out.height);
  // faint fold line under the hole, like a bag topper
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  ctx.fillRect(0, (h - 1.1) * PPM, out.width, PPM * 0.5);

  const font = HEADER_FONTS.find((f) => f.id === card.font) ?? HEADER_FONTS[0];
  const contain = (img, x, y, bw, bh) => {
    if (!img) return;
    const k = Math.min(bw / img.w, bh / img.h);
    const dw = img.w * k;
    const dh = img.h * k;
    ctx.drawImage(img.canvas, (x + (bw - dw) / 2) * PPM, (y + (bh - dh) / 2) * PPM, dw * PPM, dh * PPM);
  };
  const logoBox = { x: 6, y: 5, w: 34, h: 19 };
  if (logo) contain(logo, logoBox.x, logoBox.y, logoBox.w, logoBox.h);
  else {
    ctx.fillStyle = card.ink;
    ctx.globalAlpha = 0.14;
    ctx.fillRect(logoBox.x * PPM, logoBox.y * PPM, logoBox.w * PPM, logoBox.h * PPM);
    ctx.globalAlpha = 1;
  }
  contain(icon, w - 6 - 20, 5, 20, 19);

  const textX = 44;
  const maxW = w - textX - (icon ? 30 : 8);
  const lines = [card.line1, card.line2, card.line3].filter((l) => l.trim());
  const lineH = 6.2;
  const top = 9 + (3 - lines.length) * (lineH / 2);
  ctx.fillStyle = card.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, i) => {
    fitText(ctx, line.toUpperCase(), font.css, font.weight, maxW * PPM, lineH * 0.82 * PPM);
    ctx.fillText(line.toUpperCase(), textX * PPM, (top + (i + 1) * lineH - 1) * PPM);
  });
  return out;
}

/** Cache of painted faces so sliders stay fast: a face is only repainted when its inputs change. */
const cache = new Map();
export function cachedFace(key, paint) {
  if (cache.has(key)) {
    const v = cache.get(key);
    cache.delete(key);
    cache.set(key, v);
    return v;
  }
  const v = paint();
  cache.set(key, v);
  if (cache.size > 48) cache.delete(cache.keys().next().value);
  return v;
}
