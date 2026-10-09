import { HEADER_FONTS, PACK } from './constants.js';
import { stampSize } from './geometry.js';

/** Paints the printed side of a stamp or the header card onto a canvas (1 px = 1 / ppm mm). */

const PPM = 24; // pixels per mm on stamps
const PPM_CARD = 20;
const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

let grainTile = null;
/** Fine paper grain: a small tile of light-grey noise multiplied over the print. */
function grainPattern(ctx) {
  if (!grainTile) {
    const c = document.createElement('canvas');
    c.width = c.height = 192;
    const g = c.getContext('2d');
    const img = g.createImageData(192, 192);
    let a = 1234567;
    const rnd = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 236 + Math.round(rnd() * 19);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    grainTile = c;
  }
  return ctx.createPattern(grainTile, 'repeat');
}

function addGrain(ctx, w, h, strength = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.55 * strength;
  ctx.fillStyle = grainPattern(ctx);
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

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
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
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
  // halftone: a 45 degree screen of round dots on the paper, dark = big
  const cell = Math.max(5, Math.round(PPM * 0.3));
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = ink;
  const cos = Math.SQRT1_2;
  const reach = Math.ceil((w + h) / cell);
  const half = Math.max(1, Math.floor(cell / 2));
  for (let v = -reach; v <= reach; v++) {
    for (let u = -reach; u <= reach; u++) {
      const x = (u - v) * cell * cos;
      const y = (u + v) * cell * cos;
      if (x < -cell || y < -cell || x > w + cell || y > h + cell) continue;
      let sum = 0;
      let cnt = 0;
      for (let yy = Math.max(0, Math.floor(y - half)); yy < Math.min(h, Math.ceil(y + half)); yy += 2) {
        for (let xx = Math.max(0, Math.floor(x - half)); xx < Math.min(w, Math.ceil(x + half)); xx += 2) {
          const i = (yy * w + xx) * 4;
          sum += lum(d[i], d[i + 1], d[i + 2]);
          cnt++;
        }
      }
      if (!cnt) continue;
      const dark = 1 - sum / cnt;
      const r = cell * 0.74 * Math.sqrt(Math.min(1, dark * 1.05));
      if (r > 0.5) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
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

  // the faintest keyline where the print meets the paper
  ctx.save();
  ctx.beginPath();
  path();
  ctx.lineWidth = Math.max(1, sx * 0.12);
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
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
  addGrain(ctx, out.width, out.height);
  return out;
}

/** Original placeholder mark: speed stripes and the initials of the first line. */
function placeholderLogo(ctx, x, y, w, h, ink, label, font) {
  ctx.save();
  ctx.fillStyle = ink;
  const skew = 0.32;
  const bars = [0.0, 0.2, 0.4];
  bars.forEach((o, i) => {
    const by = y + h * (0.12 + o);
    const bh = h * (0.13 - i * 0.012);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.02 + i * 2, by + bh);
    ctx.lineTo(x + w * 0.02 + i * 2 + bh * skew * 2, by);
    ctx.lineTo(x + w * (0.5 - i * 0.04), by);
    ctx.lineTo(x + w * (0.5 - i * 0.04) - bh * skew * 2, by + bh);
    ctx.closePath();
    ctx.fill();
  });
  const letters = (label.match(/[A-Za-z0-9]/g) ?? ['M']).slice(0, 2).join('').toUpperCase();
  ctx.font = `italic 900 ${h * 0.92}px ${font}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'right';
  ctx.fillText(letters, x + w, y + h * 0.9);
  ctx.restore();
}

/** Printed face of the header card. */
export function cardFace(card, logo, icon) {
  const w = PACK.cardW;
  const h = PACK.cardH;
  const P = PPM_CARD;
  const out = canvas(w * P, h * P);
  const ctx = out.getContext('2d');
  ctx.fillStyle = card.paper;
  ctx.fillRect(0, 0, out.width, out.height);
  // soft light falloff across the topper, like coated board
  const sheen = ctx.createLinearGradient(0, 0, 0, out.height);
  sheen.addColorStop(0, 'rgba(255,255,255,0.35)');
  sheen.addColorStop(0.55, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.05)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, out.width, out.height);

  // reinforcement ring round the hanging hole
  if (card.hole) {
    ctx.strokeStyle = 'rgba(0,0,0,0.13)';
    ctx.lineWidth = 0.25 * P;
    ctx.beginPath();
    ctx.arc((w / 2) * P, 5.2 * P, 2.9 * P, 0, Math.PI * 2);
    ctx.stroke();
  }

  // crimped fold line near the bottom edge: a highlight over a soft shadow
  const foldY = (h - 3.6) * P;
  const fold = ctx.createLinearGradient(0, foldY - 0.9 * P, 0, foldY + 1.6 * P);
  fold.addColorStop(0, 'rgba(0,0,0,0)');
  fold.addColorStop(0.35, 'rgba(0,0,0,0.11)');
  fold.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fold;
  ctx.fillRect(0, foldY - 0.9 * P, out.width, 2.5 * P);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(0, foldY - 0.9 * P, out.width, 0.22 * P);

  const font = HEADER_FONTS.find((f) => f.id === card.font) ?? HEADER_FONTS[0];
  const contain = (img, x, y, bw, bh) => {
    if (!img) return;
    const k = Math.min(bw / img.w, bh / img.h);
    const dw = img.w * k;
    const dh = img.h * k;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img.canvas, (x + (bw - dw) / 2) * P, (y + (bh - dh) / 2) * P, dw * P, dh * P);
  };
  const logoBox = { x: 6, y: 6.5, w: 34, h: 16 };
  if (logo) contain(logo, logoBox.x, logoBox.y, logoBox.w, logoBox.h);
  else placeholderLogo(ctx, logoBox.x * P, logoBox.y * P, logoBox.w * P, logoBox.h * P, card.ink, card.line1, font.css);
  contain(icon, w - 6 - 18, 6.5, 18, 16);

  const textX = 46;
  const maxW = w - textX - (icon ? 30 : 10);
  const lines = [card.line1, card.line2, card.line3].filter((l) => l.trim());
  const lineH = 6.4;
  const top = 8.2 + (3 - lines.length) * (lineH / 2);
  ctx.fillStyle = card.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, i) => {
    const text = line.toUpperCase();
    const px = fitText(ctx, text, font.css, font.weight, maxW * P, lineH * 0.8 * P);
    if ('letterSpacing' in ctx) {
      ctx.letterSpacing = `${px * 0.06}px`;
      // re-fit once the tracking is applied
      const w2 = ctx.measureText(text).width;
      if (w2 > maxW * P) ctx.font = `${font.weight} ${(px * maxW * P) / w2}px ${font.css}`;
    }
    ctx.fillText(text, textX * P, (top + (i + 1) * lineH - 1.2) * P);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  });
  addGrain(ctx, out.width, out.height, 0.6);
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
