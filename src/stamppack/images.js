import { IMAGE_EXT, PACK_LIMITS } from './constants.js';
import { newId } from './design.js';

export function isImageFile(file) {
  return /^image\//.test(file.type) || IMAGE_EXT.test(file.name || '');
}

/**
 * Decodes an uploaded picture into a canvas no larger than PACK_LIMITS.texMax. Works for
 * JPG, PNG, WebP, GIF (first frame), AVIF, BMP and SVG. Everything stays in the browser.
 */
export async function loadImageFile(file) {
  if (!isImageFile(file)) throw new Error('That is not an image file');
  if (file.size > PACK_LIMITS.maxBytes) throw new Error('Image is over 10 MB');
  const svg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name || '');
  let source = null;
  let w = 0;
  let h = 0;
  let url = '';
  if (!svg && typeof createImageBitmap === 'function') {
    try {
      source = await createImageBitmap(file, { imageOrientation: 'from-image' });
      w = source.width;
      h = source.height;
    } catch {
      source = null;
    }
  }
  if (!source) {
    url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('This image format cannot be read by the browser'));
        img.src = url;
      });
      source = img;
      w = img.naturalWidth || (svg ? 1024 : 0);
      h = img.naturalHeight || (svg ? 1024 : 0);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  if (!w || !h) throw new Error('The image has no size');
  const k = Math.min(1, PACK_LIMITS.texMax / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * k));
  const ch = Math.max(1, Math.round(h * k));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  canvas.getContext('2d').drawImage(source, 0, 0, cw, ch);
  source.close?.();
  return { id: newId('i'), name: file.name || 'image', w: cw, h: ch, canvas, thumb: makeThumb(canvas) };
}

export function makeThumb(canvas, size = 96) {
  const k = Math.min(1, size / Math.max(canvas.width, canvas.height));
  const t = document.createElement('canvas');
  t.width = Math.max(1, Math.round(canvas.width * k));
  t.height = Math.max(1, Math.round(canvas.height * k));
  t.getContext('2d').drawImage(canvas, 0, 0, t.width, t.height);
  return t.toDataURL('image/png');
}

/** Original sample pictures (drawn here, no outside artwork) so the tab is never empty. */
export function sampleImages() {
  const make = (name, w, h, paint) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    paint(canvas.getContext('2d'), w, h);
    return { id: newId('i'), name, w, h, canvas, thumb: makeThumb(canvas) };
  };
  return [
    make('Track lanes', 900, 700, (c, w, h) => {
      c.fillStyle = '#f4f1e8';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#1f9d55';
      c.lineWidth = 34;
      for (let i = 0; i < 6; i++) {
        c.beginPath();
        c.ellipse(w * 0.62, h * 0.62, 150 + i * 62, 120 + i * 50, 0, Math.PI, Math.PI * 2.0);
        c.stroke();
      }
      c.fillStyle = '#1f9d55';
      c.font = '900 280px Arial Black, Arial, sans-serif';
      c.fillText('AB', w * 0.3, h * 0.92);
    }),
    make('Sunburst', 800, 1000, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#ffb347');
      g.addColorStop(1, '#ff5e62');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,0.22)';
      for (let i = 0; i < 18; i++) {
        c.beginPath();
        c.moveTo(w / 2, h * 0.58);
        c.arc(w / 2, h * 0.58, 1200, (i * Math.PI) / 9, (i * Math.PI) / 9 + Math.PI / 18);
        c.fill();
      }
      c.fillStyle = '#fff6df';
      c.beginPath();
      c.arc(w / 2, h * 0.58, 190, 0, Math.PI * 2);
      c.fill();
    }),
    make('Blue stripes', 900, 700, (c, w, h) => {
      c.fillStyle = '#f2f4fa';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#2c55c7';
      c.lineWidth = 26;
      for (let i = 0; i < 9; i++) {
        c.beginPath();
        c.moveTo(-50, 120 + i * 62);
        c.bezierCurveTo(w * 0.35, 20 + i * 62, w * 0.6, 260 + i * 62, w + 50, 100 + i * 62);
        c.stroke();
      }
    }),
    make('Mountains', 800, 900, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#6fb1d9');
      g.addColorStop(1, '#e8f1e4');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
      const ridge = (color, base, amp, seed) => {
        c.fillStyle = color;
        c.beginPath();
        c.moveTo(0, h);
        for (let x = 0; x <= w; x += 20) c.lineTo(x, base - Math.abs(Math.sin(x * 0.011 + seed)) * amp - Math.sin(x * 0.03 + seed) * 18);
        c.lineTo(w, h);
        c.fill();
      };
      ridge('#5b7fa6', 560, 240, 1);
      ridge('#3f6b52', 680, 190, 3);
      ridge('#244a38', 800, 130, 5);
    }),
    make('Dots', 800, 800, (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      const g = c.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.5, w * 0.55);
      g.addColorStop(0, '#000000');
      g.addColorStop(1, '#ffffff');
      c.fillStyle = g;
      c.beginPath();
      c.arc(w / 2, h / 2, w * 0.4, 0, Math.PI * 2);
      c.fill();
    }),
  ];
}
