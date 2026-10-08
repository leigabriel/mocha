import * as THREE from 'three';
import * as opentype from 'opentype.js';

// Fonts are parsed with opentype.js and laid out glyph by glyph (no OpenType shaping),
// then turned into THREE.Shape outlines so text, SVG logos and tags share one pipeline.
// Layout is deliberately simple: advance widths plus kerning when the font has a kern table.

const parsed = new Map(); // id -> { font, label }
const pending = new Map();

export function registerFont(id, arrayBuffer, label = id) {
  const font = opentype.parse(arrayBuffer);
  parsed.set(id, { font, label });
  return font;
}

export const hasFont = (id) => parsed.has(id);
export const getFont = (id) => parsed.get(id)?.font ?? null;

/** Loads one of the bundled fonts (lazy, once). */
export function ensureFont(id) {
  if (parsed.has(id)) return Promise.resolve(parsed.get(id).font);
  if (!pending.has(id)) {
    pending.set(
      id,
      import('./fontUrls.js')
        .then(({ FONT_URLS }) => fetch(FONT_URLS[id]))
        .then((res) => {
          if (!res.ok) throw new Error(`font ${id}: ${res.status}`);
          return res.arrayBuffer();
        })
        .then((buf) => registerFont(id, buf))
        .finally(() => pending.delete(id))
    );
  }
  return pending.get(id);
}

function kerning(font, a, b) {
  try {
    return font.getKerningValue(a, b) || 0;
  } catch {
    return 0;
  }
}

function glyphShapes(glyph, x, size, dy = 0) {
  const path = glyph.getPath(x, 0, size);
  const sp = new THREE.ShapePath();
  for (const c of path.commands) {
    if (c.type === 'M') sp.moveTo(c.x, -c.y + dy);
    else if (c.type === 'L') sp.lineTo(c.x, -c.y + dy);
    else if (c.type === 'Q') sp.quadraticCurveTo(c.x1, -c.y1 + dy, c.x, -c.y + dy);
    else if (c.type === 'C') sp.bezierCurveTo(c.x1, -c.y1 + dy, c.x2, -c.y2 + dy, c.x, -c.y + dy);
  }
  return sp.toShapes(true);
}

/**
 * Lays out `text` (lines split on \n, centred) and returns its outline shapes plus the
 * bounding box, in units of `size` per em. Y is up.
 */
export function textToShapes(font, text, size = 10, lineHeight = 1.05) {
  const lines = String(text).split('\n').slice(0, 4);
  const scale = size / font.unitsPerEm;
  const rows = lines.map((line) => {
    let x = 0;
    const items = [];
    let prev = null;
    for (const ch of Array.from(line)) {
      const glyph = font.charToGlyph(ch);
      if (prev) x += kerning(font, prev, glyph) * scale;
      items.push({ glyph, x });
      x += glyph.advanceWidth * scale;
      prev = glyph;
    }
    return { items, width: x };
  });
  const maxW = Math.max(0, ...rows.map((r) => r.width));

  const shapes = [];
  rows.forEach((row, i) => {
    const offX = (maxW - row.width) / 2;
    const offY = -i * size * lineHeight;
    for (const { glyph, x } of row.items) {
      shapes.push(...glyphShapes(glyph, x + offX, size, offY));
    }
  });
  return { shapes, box: shapesBox(shapes) };
}

export function shapesBox(shapes) {
  const box = new THREE.Box2();
  for (const s of shapes) {
    for (const p of s.getPoints(12)) box.expandByPoint(p);
  }
  return box;
}
