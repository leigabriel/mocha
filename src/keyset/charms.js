import * as THREE from 'three';
import { FONTS } from '../tagbuilder/constants.js';
import { getFont, textToShapes } from '../tagbuilder/fonts.js';
import { roundedRect } from '../tagbuilder/shapes.js';
import { HOLE_R } from './constants.js';
import { charmOutline } from './outlines.js';

const DEG = Math.PI / 180;
const INSET = HOLE_R + 2.8;

const resolveFont = (id) => getFont(id) ?? FONTS.map((f) => getFont(f.id)).find(Boolean) ?? null;

function addHole(shape, cx, cy, radius) {
  const hole = new THREE.Path();
  hole.absarc(cx, cy, radius, 0, Math.PI * 2, true);
  shape.holes.push(hole);
}

function extrude(shapes, depth, bevel, segments = 4, curve = 12) {
  const b = Math.min(bevel, depth / 2.2);
  const g = new THREE.ExtrudeGeometry(shapes, {
    depth: Math.max(0.02, depth - 2 * b),
    bevelEnabled: b > 0.02,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: -b,
    bevelSegments: segments,
    curveSegments: curve,
  });
  g.translate(0, 0, -(Math.max(0.02, depth - 2 * b)) / 2);
  return g;
}

/** Extruded text fitted into a (cx, cy, w, h) area. Returns null when there is nothing to draw. */
function textGeometry(text, fontId, { cx, cy, w, h, rot, scale, z, depth }) {
  const font = resolveFont(fontId);
  if (!font || !String(text).trim()) return null;
  const { shapes, box } = textToShapes(font, String(text), 10);
  if (!shapes.length || box.isEmpty()) return null;
  const bw = box.max.x - box.min.x;
  const bh = box.max.y - box.min.y;
  const swap = Math.abs(rot) === 90;
  const s = Math.min(w / (swap ? bh : bw), h / (swap ? bw : bh)) * scale;
  const bevel = Math.min(0.18, depth / 4);
  const g = new THREE.ExtrudeGeometry(shapes, {
    depth: Math.max(0.03, depth - 2 * bevel),
    bevelEnabled: bevel > 0.02,
    bevelThickness: bevel,
    bevelSize: bevel / s,
    bevelOffset: -bevel / s,
    bevelSegments: 2,
    curveSegments: 6,
  });
  g.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, 0);
  g.scale(s, s, 1);
  if (rot) g.rotateZ(rot * DEG);
  g.translate(cx, cy, z);
  return g;
}

/** Splits the usable area of a charm into title / sub / number boxes. */
function textLayout(c, topY, bottomY, ribsH) {
  const vertical = c.style === 'bar' || c.style === 'ribbed';
  const rotMode = c.textRotate === 'auto' ? (vertical ? '-90' : '0') : c.textRotate;
  const rot = Number(rotMode);
  const lo = bottomY + ribsH;
  const len = topY - lo;
  const mid = (topY + lo) / 2;
  const width = c.style === 'triangle' ? c.w * 0.5 : c.style === 'circle' ? c.w * 0.74 : c.w * 0.84;
  if (Math.abs(rot) === 90) {
    // text runs along the body; title and number share the length, the sub line sits on the right
    return {
      rot,
      title: { cx: -0.06 * c.w, cy: lo + len * 0.4, w: len * 0.72, h: c.w * 0.62 },
      num: { cx: -0.06 * c.w, cy: lo + len * 0.9, w: len * 0.18, h: c.w * 0.55 },
      sub: { cx: c.w * 0.32, cy: mid, w: len * 0.8, h: c.w * 0.14 },
    };
  }
  const y = (f) => lo + len * f;
  const base = c.style === 'triangle' ? 0.34 : 0;
  return {
    rot,
    sub: { cx: 0, cy: y(0.8 - base * 0.3), w: width * 0.9, h: len * 0.07 },
    title: { cx: 0, cy: y(0.55 - base * 0.4), w: width, h: len * 0.22 },
    num: { cx: c.style === 'triangle' ? width * 0.45 : 0, cy: y(0.2 - base * 0.2), w: width * 0.55, h: len * 0.2 },
  };
}

/**
 * Builds one charm. The group origin is the point the jump ring passes through (the hole
 * centre) and the charm hangs below it, faces +Z. Returns { group, box, ring } where `box`
 * is the collision box in group space.
 */
export function buildCharm(c, ctx) {
  const group = new THREE.Group();
  group.name = `Charm_${c.id}`;
  group.userData.tagId = c.id;
  const inner = new THREE.Group();
  inner.name = 'Body';
  group.add(inner);
  const mesh = (geometry, material, name) => {
    const m = new THREE.Mesh(geometry, material);
    m.name = name;
    m.userData.tagId = c.id;
    inner.add(m);
    return m;
  };

  const bodyMat = ctx.charmMaterial(c.material, c.color, c.d);
  const out = charmOutline(c, INSET);
  let shapes = out.shapes;
  let holeY = out.holeY;
  const bevel = c.style === 'silhouette' ? Math.min(c.d / 2.1, 2.4) : Math.min(0.55, c.d / 4);
  const segments = c.style === 'silhouette' ? 5 : 3;
  if (out.hole) addHole(shapes[0], 0, holeY, HOLE_R);
  mesh(extrude(shapes, c.d, bevel, segments, 20), bodyMat, 'CharmBody');

  let top = c.h / 2;
  let bottom = -c.h / 2;
  if (out.eyelet) {
    // a small ear carries the ring for silhouettes
    const ear = new THREE.Shape();
    ear.absarc(0, holeY, HOLE_R + 2.1, 0, Math.PI * 2, false);
    addHole(ear, 0, holeY, HOLE_R);
    mesh(extrude([ear], Math.min(c.d, 3.4), 0.4, 2, 16), bodyMat, 'CharmEar');
    top = holeY + HOLE_R + 2.1;
    bottom = -c.h / 2;
  }
  const zFace = c.d / 2 - 0.02;
  let depthTop = 0;

  // ribs along the base (motel tags and bars)
  let ribsH = 0;
  if (c.ribs > 0 && c.style !== 'silhouette') {
    const pitch = 2.5;
    const bar = 1.15;
    const ribW = c.style === 'triangle' ? c.w * 0.3 : c.w * 0.64;
    const ribMat = bodyMat;
    const y0 = -c.h / 2 + (c.style === 'motel' ? 6 : 4.2);
    for (let i = 0; i < c.ribs; i++) {
      const g = extrude([roundedRect(ribW, bar, bar / 2)], 0.7, 0.2, 1, 4);
      g.translate(0, y0 + i * pitch, zFace + 0.1);
      mesh(g, ribMat, `Rib_${i}`);
      const gb = extrude([roundedRect(ribW, bar, bar / 2)], 0.7, 0.2, 1, 4);
      gb.translate(0, y0 + i * pitch, -zFace - 0.1);
      mesh(gb, ribMat, `RibBack_${i}`);
    }
    ribsH = c.ribs * pitch + 4;
    depthTop = 0.45;
  }

  // thin printed decoration: a ruler with a crosshair, or a ring
  if (c.ruler && c.style !== 'silhouette') {
    const printMat = ctx.charmMaterial('matte', c.textColor, 0.2);
    const line = (w, h, x, y, name) => {
      const g = extrude([roundedRect(w, h, Math.min(w, h) / 2)], 0.12, 0.03, 1, 3);
      g.translate(x, y, zFace + 0.05);
      mesh(g, printMat, name);
    };
    if (c.style === 'bar' || c.style === 'ribbed' || c.style === 'motel') {
      const x = c.w / 2 - 3.2;
      line(0.35, c.h * 0.58, x, top - 8 - c.h * 0.29, 'RulerSpine');
      for (let i = 0; i <= 8; i++) line(i % 4 === 0 ? 3 : 1.6, 0.3, x - (i % 4 === 0 ? 1.3 : 0.7), top - 8 - (c.h * 0.58 * i) / 8, `RulerTick_${i}`);
      const ring = new THREE.Shape();
      ring.absarc(0, 0, 3.4, 0, Math.PI * 2, false);
      addHole(ring, 0, 0, 3.05);
      const rg = extrude([ring], 0.12, 0.03, 1, 12);
      rg.translate(-c.w / 2 + 6, top - 12, zFace + 0.05);
      mesh(rg, printMat, 'RulerRing');
    } else {
      const ring = new THREE.Shape();
      const R = Math.min(c.w, c.h) * (c.style === 'triangle' ? 0.27 : 0.4);
      ring.absarc(0, 0, R, 0, Math.PI * 2, false);
      addHole(ring, 0, 0, R - 0.4);
      const rg = extrude([ring], 0.12, 0.03, 1, 12);
      rg.translate(0, c.style === 'triangle' ? -c.h * 0.12 : 0, zFace + 0.05);
      mesh(rg, printMat, 'RulerRing');
    }
  }

  // text
  if (c.textMode !== 'none' && c.style !== 'silhouette') {
    const layout = textLayout(c, holeY - HOLE_R - 2.2 > bottom ? holeY - HOLE_R - 2.4 : top - 2, bottom + 2, ribsH);
    const raised = c.textMode === 'raised';
    const depth = raised ? c.textDepth : 0.1;
    const textMat = raised ? ctx.charmMaterial(c.textMaterial, c.textColor, c.d) : ctx.charmMaterial('matte', c.textColor, 0.1);
    const k = c.textSize / 100;
    for (const key of ['title', 'sub', 'num']) {
      const g = textGeometry(c[key], c.font, { ...layout[key], rot: layout.rot, scale: k, z: zFace - 0.02, depth: depth + 0.04 });
      if (g) mesh(g, textMat, `Text_${key}`);
    }
    if (raised) depthTop = Math.max(depthTop, c.textDepth);
  }

  // cat details: eyes, nose and stripes embossed on the face
  if (c.style === 'silhouette' && c.silhouette === 'cat') {
    const detail = ctx.charmMaterial('soft', c.color, c.d);
    const sx = c.w / 2;
    const sy = c.h / 2;
    const dot = (x, y, rx, ry, name) => {
      const s = new THREE.Shape();
      s.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0);
      const g = extrude([s], 1.1, 0.35, 2, 10);
      g.translate(x, y, zFace + 0.2);
      mesh(g, detail, name);
    };
    dot(-sx * 0.38, sy * 0.02, sx * 0.1, sy * 0.13, 'CatEyeL');
    dot(sx * 0.38, sy * 0.02, sx * 0.1, sy * 0.13, 'CatEyeR');
    dot(0, -sy * 0.2, sx * 0.09, sy * 0.07, 'CatNose');
    for (let i = 0; i < 3; i++) {
      const g = extrude([roundedRect(sx * 0.08, sy * 0.2, sx * 0.04)], 0.9, 0.3, 2, 4);
      g.translate((i - 1) * sx * 0.22, sy * 0.48, zFace + 0.2);
      mesh(g, detail, `CatStripe_${i}`);
    }
    depthTop = 1.1;
  }

  inner.position.y = -holeY;
  const box = { cy: -holeY, hw: Math.min(c.w, 80) / 2, hh: Math.min(c.h, 120) / 2, hd: c.d / 2 + depthTop };
  return { group, box, holeY: 0 };
}
