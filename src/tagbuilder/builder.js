import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { obbPenetration, makeOBB } from '../three/collision.js';
import { CHAIN_STEPS, FONTS, RING_YAW } from './constants.js';
import { getFont, textToShapes } from './fonts.js';
import {
  CARABINER,
  CHAIN_LINK,
  JUMP_RING,
  SPLIT_RING,
  carabinerGeometries,
  chainLinkGeometry,
  jumpRingGeometry,
  keyGeometry,
  keyShape,
  splitRingGeometry,
} from './hardware.js';
import { makeAnodized, makeMaterial, makeMetal } from './materials.js';
import { addHole, outlineShape } from './shapes.js';
import { parseSvgShapes } from './svg.js';

const HOLE_R = 1.7; // tag hole radius
const EYELET = { Rt: 2.5, wire: 0.85 };
const DEG = Math.PI / 180;

const mesh = (geometry, material, name, tagId) => {
  const m = new THREE.Mesh(geometry, material);
  m.name = name;
  if (tagId) m.userData.tagId = tagId;
  m.castShadow = false;
  return m;
};

function resolveFont(id) {
  return getFont(id) ?? FONTS.map((f) => getFont(f.id)).find(Boolean) ?? null;
}

// ------------------------------------------------------------- relief (text / logo)

/**
 * Builds the raised artwork (text or SVG logo, plus optional outline rings) that sits
 * in a `areaW` by `areaH` box. `z0` is the bottom of the artwork and `depth` its height.
 * Returns { parts: [{ geometry, material, name }], box } where box is the final extent.
 */
function buildRelief(tag, { areaW, areaH, z0, depth, mirror = false, materials }) {
  const svg = tag.svg ? parseSvgShapes(tag.svg) : null;
  const groups = []; // { shapes, hex }
  let sourceBox;
  if (svg) {
    for (const [hex, shapes] of svg.groups) groups.push({ shapes, hex: tag.svgKeepColors ? hex : tag.textColor });
    sourceBox = svg.box;
  } else {
    const font = resolveFont(tag.font);
    if (!font || !tag.text.trim()) return null;
    const { shapes, box } = textToShapes(font, tag.text, 10);
    if (!shapes.length || box.isEmpty()) return null;
    groups.push({ shapes, hex: tag.textColor });
    sourceBox = box;
  }

  const rot = tag.textRotate;
  const bw = sourceBox.max.x - sourceBox.min.x;
  const bh = sourceBox.max.y - sourceBox.min.y;
  const swap = rot !== 0;
  const outlineTotal = tag.outline + tag.outline2;
  const fitW = Math.max(1, areaW - outlineTotal * 2);
  const fitH = Math.max(1, areaH - outlineTotal * 2);
  const s = Math.min(fitW / (swap ? bh : bw), fitH / (swap ? bw : bh)) * (tag.textSize / 100);
  const cx = (sourceBox.min.x + sourceBox.max.x) / 2;
  const cy = (sourceBox.min.y + sourceBox.max.y) / 2;

  const bevel = Math.min(0.25, depth / 4);
  const place = (geometry) => {
    geometry.translate(-cx, -cy, 0);
    geometry.scale(s, s, 1);
    if (rot) geometry.rotateZ(rot * DEG);
    if (mirror) geometry.rotateY(Math.PI);
    return geometry;
  };
  const z = (zBottom, height) => (mirror ? -(zBottom + height) : zBottom);

  const parts = [];
  const ring = (width, height, zBottom, hex, name) => {
    const all = groups.flatMap((g) => g.shapes);
    const g = new THREE.ExtrudeGeometry(all, {
      depth: Math.max(0.05, height),
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: width / s,
      bevelOffset: 0,
      bevelSegments: 1,
      curveSegments: 4,
    });
    place(g);
    g.translate(0, 0, z(zBottom, height));
    parts.push({ geometry: g, material: materials.relief(tag.textMaterial, hex), name });
  };
  if (tag.outline2 > 0) ring(tag.outline + tag.outline2, depth * 0.55, z0, tag.outline2Color, 'ArtOutline2');
  if (tag.outline > 0) ring(tag.outline, depth * 0.78, z0, tag.outlineColor, 'ArtOutline');

  groups.forEach(({ shapes, hex }, i) => {
    const g = new THREE.ExtrudeGeometry(shapes, {
      depth: Math.max(0.05, depth - 2 * bevel),
      bevelEnabled: bevel > 0.02,
      bevelThickness: bevel,
      bevelSize: bevel / s,
      bevelOffset: -bevel / s,
      bevelSegments: 2,
      curveSegments: 6,
    });
    place(g);
    g.translate(0, 0, z(z0 + bevel, depth - 2 * bevel));
    parts.push({ geometry: g, material: materials.relief(tag.textMaterial, hex), name: i === 0 ? 'ArtMain' : `ArtMain_${i}` });
  });

  const extent = (swap ? bh : bw) * s;
  const extentH = (swap ? bw : bh) * s;
  return { parts, width: extent + outlineTotal * 2, height: extentH + outlineTotal * 2 };
}

// ------------------------------------------------------------------ one tag

function buildTag(tag, ctx) {
  const group = new THREE.Group();
  group.name = `Tag_${tag.id}`;
  group.userData.tagId = tag.id;
  const mats = ctx.tagMaterials(tag);
  const add = (geometry, material, name) => {
    const m = mesh(geometry, material, name, tag.id);
    group.add(m);
    return m;
  };

  const bevel = Math.min(0.55, tag.d / 4);
  let box; // body box in group space: { cy, hw, hh, hd }

  if (tag.shape === 'none') {
    const relief = buildRelief({ ...tag, textRotate: tag.textRotate }, {
      areaW: tag.w,
      areaH: tag.h,
      z0: -tag.d / 2,
      depth: tag.d,
      materials: mats,
    });
    // The artwork is the tag. Nothing to show without text or a logo, so fall back to a
    // small placeholder disc that keeps the part selectable.
    const w = relief?.width ?? 12;
    const h = relief?.height ?? 12;
    if (relief) {
      for (const p of relief.parts) add(p.geometry, p.material, p.name);
    } else {
      add(new THREE.CylinderGeometry(6, 6, tag.d, 32).rotateX(Math.PI / 2), mats.body(tag.material, tag.color), 'TagBody');
    }
    // eyelet ear overlapping the top of the artwork
    const earY = h / 2 + 0.2;
    const ear = new THREE.Shape();
    ear.absarc(0, 0, HOLE_R + 2.0, 0, Math.PI * 2, false);
    addHole(ear, 0, 0, HOLE_R);
    const earGeo = new THREE.ExtrudeGeometry(ear, {
      depth: Math.min(tag.d, 3) - 0.4,
      bevelEnabled: true,
      bevelThickness: 0.2,
      bevelSize: 0.2,
      bevelOffset: -0.2,
      bevelSegments: 2,
      curveSegments: 32,
    });
    earGeo.translate(0, earY, -(Math.min(tag.d, 3) - 0.4) / 2);
    add(earGeo, mats.body(tag.material, tag.color), 'TagEar');
    group.children.forEach((c) => c.position.y -= earY);
    box = { cy: -earY, hw: w / 2, hh: h / 2 + HOLE_R, hd: tag.d / 2 };
    return { group, box, holeY: 0 };
  }

  if (tag.shape === 'cube') {
    const eyeBottom = EYELET.Rt + EYELET.wire - 0.9;
    const cy = -(eyeBottom + tag.h / 2);
    const body = add(new RoundedBoxGeometry(tag.w, tag.h, tag.d, 6, Math.min(tag.r, tag.w / 2 - 0.1, tag.h / 2 - 0.1, tag.d / 2 - 0.1)), mats.body(tag.material, tag.color), 'TagBody');
    body.position.y = cy;
    const eyelet = add(new THREE.TorusGeometry(EYELET.Rt, EYELET.wire, 14, 36), mats.metal, 'TagEyelet');
    eyelet.position.set(0, 0, 0);
    box = { cy, hw: tag.w / 2, hh: tag.h / 2 + EYELET.Rt, hd: tag.d / 2 };
    const front = buildRelief(tag, { areaW: tag.w * 0.86, areaH: tag.h * 0.86, z0: tag.d / 2 - 0.05, depth: tag.textDepth + 0.05, materials: mats });
    if (front) for (const p of front.parts) { const m = add(p.geometry, p.material, p.name); m.position.y = cy; }
    if (tag.textSide === 'both') {
      const back = buildRelief(tag, { areaW: tag.w * 0.86, areaH: tag.h * 0.86, z0: tag.d / 2 - 0.05, depth: tag.textDepth + 0.05, mirror: true, materials: mats });
      if (back) for (const p of back.parts) { const m = add(p.geometry, p.material, p.name + 'Back'); m.position.y = cy; }
    }
    box.hd += tag.textDepth;
    return { group, box, holeY: 0 };
  }

  // flat tag: outline + extruded body + optional hole
  const inset = HOLE_R + 2.6;
  const cy = -(tag.h / 2 - inset);
  const shape = outlineShape(tag.shape, tag.w, tag.h, tag.r);
  if (tag.hole) addHole(shape, 0, tag.h / 2 - inset, HOLE_R);
  const bodyGeo = new THREE.ExtrudeGeometry(shape, {
    depth: tag.d - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 4,
    curveSegments: 32,
  });
  bodyGeo.translate(0, 0, -(tag.d - 2 * bevel) / 2);
  const body = add(bodyGeo, mats.body(tag.material, tag.color), 'TagBody');
  body.position.y = cy;

  // artwork keeps clear of the hole: use the area below it
  const areaTop = tag.hole ? tag.h / 2 - inset - HOLE_R - 1.2 : tag.h / 2 - 1.5;
  const areaBottom = -tag.h / 2 + 1.5;
  const areaH = Math.max(2, areaTop - areaBottom - 0.0);
  const areaCy = (areaTop + areaBottom) / 2;
  const areaW = tag.w * (tag.shape === 'circle' || tag.shape === 'hex' ? 0.72 : 0.9);
  const zBase = tag.d / 2 - 0.05;
  const make = (mirror) => buildRelief(tag, { areaW, areaH, z0: zBase, depth: tag.textDepth + 0.05, mirror, materials: mats });
  const front = make(false);
  if (front) for (const p of front.parts) { const m = add(p.geometry, p.material, p.name); m.position.y = cy + areaCy; }
  if (tag.textSide === 'both') {
    const back = make(true);
    if (back) for (const p of back.parts) { const m = add(p.geometry, p.material, p.name + 'Back'); m.position.y = cy + areaCy; }
  }
  box = { cy, hw: tag.w / 2, hh: tag.h / 2, hd: tag.d / 2 + (front ? tag.textDepth : 0) };
  return { group, box, holeY: 0 };
}

// ------------------------------------------------------------- hardware parts

function buildCarabiner(design, ctx) {
  const g = new THREE.Group();
  g.name = 'Carabiner';
  const { frame, gate, sleeve, hinge } = carabinerGeometries();
  const frameMat = makeAnodized(design.carabinerColor);
  const gateMat = makeAnodized(design.gateColor);
  const sleeveMat = makeAnodized(design.sleeveColor);
  ctx.own(frameMat, gateMat, sleeveMat);
  g.add(mesh(frame, frameMat, 'CarabinerFrame'));
  gate.forEach((geo) => g.add(mesh(geo, gateMat, 'CarabinerGate')));
  hinge.forEach((geo) => g.add(mesh(geo, frameMat, 'CarabinerHinge')));
  sleeve.forEach((geo) => g.add(mesh(geo, sleeveMat, 'CarabinerSleeve')));
  return g;
}

function ringFrame(design, ctx) {
  const g = new THREE.Group();
  g.name = 'SplitRing';
  for (const geo of splitRingGeometry()) g.add(mesh(geo, ctx.metal, 'SplitRing'));
  return g;
}

/**
 * A chain hanging from the split ring wire at local `anchor` (ring frame, wire centre).
 * Elements alternate between planes normal to u (local x) and v (local z). Returns the
 * group and the position where the tag/key hangs.
 */
function buildChain(links, anchor, ctx) {
  const g = new THREE.Group();
  g.name = 'Chain';
  const { Rt, wire: wj } = JUMP_RING;
  const wr = SPLIT_RING.wire;
  const elements = [];
  // first jump ring hangs on the split ring wire
  let y = anchor.y + wr - (Rt - wj);
  const ring0 = mesh(jumpRingGeometry(), ctx.metal, 'JumpRing');
  ring0.rotation.y = Math.PI / 2; // plane normal along u
  ring0.position.set(0, y, 0);
  g.add(ring0);
  elements.push({ h: Rt, y });
  let lastRing = { y, isRing: true };
  for (let i = 0; i < links; i++) {
    const prev = elements[elements.length - 1];
    const ny = prev.y - (prev.h + CHAIN_LINK.hl - 2 * CHAIN_LINK.wire);
    const link = mesh(chainLinkGeometry(), ctx.metal, `ChainLink_${i}`);
    link.rotation.y = i % 2 === 0 ? 0 : Math.PI / 2; // v-plane first, then u-plane
    link.position.set(0, ny, 0);
    g.add(link);
    elements.push({ h: CHAIN_LINK.hl, y: ny });
  }
  if (links > 0) {
    const prev = elements[elements.length - 1];
    const ny = prev.y - (prev.h + Rt - 2 * wj);
    const ring = mesh(jumpRingGeometry(), ctx.metal, 'JumpRingEnd');
    ring.rotation.y = Math.PI / 2;
    ring.position.set(0, ny, 0);
    g.add(ring);
    lastRing = { y: ny };
  }
  // the item's hole sits on the bottom inner surface of the last ring
  const holeY = lastRing.y - Rt + wj;
  return { group: g, holeY, length: anchor.y - holeY };
}

// ---------------------------------------------------------------- the keychain

/**
 * Builds the whole keychain. Returns { group, parts, bounds, report }.
 * `parts` maps a tag id to { group, materials } so the viewer can highlight and pick.
 */
export function buildKeychain(design) {
  const owned = [];
  const ctx = {
    own: (...mats) => owned.push(...mats),
    metal: makeMetal(design.metal),
    tagMaterials(tag) {
      const cache = new Map();
      const get = (kind, hex) => {
        const key = `${kind}|${hex}`;
        if (!cache.has(key)) {
          const m = makeMaterial(kind, hex, { thickness: tag.d });
          cache.set(key, m);
          owned.push(m);
        }
        return cache.get(key);
      };
      return { body: get, relief: get, metal: ctx.metal };
    },
  };
  ctx.metal.userData.shared = true;
  owned.push(ctx.metal);

  const root = new THREE.Group();
  root.name = 'Mocha_TagKeychain';

  // carabiner (optional) + split ring
  const ringRadius = SPLIT_RING.R;
  let ringCenterY;
  if (design.top === 'carabiner') {
    const cara = buildCarabiner(design, ctx);
    root.add(cara);
    ringCenterY = CARABINER.wire - (ringRadius - SPLIT_RING.wire);
  } else {
    ringCenterY = 0;
  }
  const ringGroup = new THREE.Group();
  ringGroup.name = 'RingFrame';
  ringGroup.position.set(0, ringCenterY, 0);
  ringGroup.rotation.y = RING_YAW;
  ringGroup.add(ringFrame(design, ctx));
  root.add(ringGroup);

  // items hang from the bottom of the ring
  const links = CHAIN_STEPS[design.chain] ?? 1;
  const items = [];
  design.tags.forEach((tag) => items.push({ kind: 'tag', tag }));
  for (let i = 0; i < design.keys; i++) items.push({ kind: 'key', index: i });
  // keys on the left, tags to the right
  items.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'key' ? -1 : 1));

  // pivot positions along the bottom of the ring: keys on the left, a small gap, then tags
  const gapAt = items.findIndex((it) => it.kind === 'tag');
  const raw = items.map((_, k) => k * 4.2 + (k >= gapAt && gapAt > 0 ? 3 : 0));
  const mid = (raw[raw.length - 1] + raw[0]) / 2;
  const span = Math.max(1, raw[raw.length - 1] - raw[0]);
  const squeeze = Math.min(1, 15 / span);
  const slotX = raw.map((x) => (x - mid) * squeeze);
  const parts = new Map();
  const bodies = []; // for collision

  items.forEach((item, k) => {
    const s = slotX[k];
    const anchor = new THREE.Vector3(s, -Math.sqrt(ringRadius * ringRadius - s * s), 0);
    const hang = new THREE.Group();
    hang.position.copy(anchor);
    hang.name = item.kind === 'tag' ? `Hang_${item.tag.id}` : `Hang_Key_${item.index}`;
    const local = new THREE.Group(); // everything below is authored relative to the anchor
    // alternate tags hang from a longer chain so neighbours sit at different heights
    const tagIndex = items.slice(0, k).filter((it) => it.kind === 'tag').length;
    // (with no chain at all, every other tag still gets one link so crowded rings can separate)
    const extra = item.kind !== 'tag' ? 0 : links > 0 ? (tagIndex % (design.tags.length > 3 ? 3 : 2)) * 2 : [0, 1, 3][tagIndex % 3];
    const chain = buildChain(item.kind === 'key' ? 0 : Math.min(7, links + extra), new THREE.Vector3(), ctx);
    local.add(chain.group);

    let box;
    if (item.kind === 'tag') {
      const built = buildTag(item.tag, ctx);
      built.group.position.set(0, chain.holeY, 0);
      built.group.rotation.y = item.tag.yaw * DEG - RING_YAW;
      local.add(built.group);
      box = [{ group: built.group, ...built.box }];
      parts.set(item.tag.id, { group: built.group, hang });
    } else {
      const keyGroup = new THREE.Group();
      keyGroup.name = `Key_${item.index}`;
      const keyMat = ctx.metal;
      keyGroup.add(mesh(keyGeometry(item.index), keyMat, 'KeyBody'));
      // the key hangs straight on the ring wire (no chain), hole axis along the wire
      keyGroup.position.set(0, SPLIT_RING.wire - 3.1, 0);
      keyGroup.rotation.y = Math.PI / 2;
      const { length, bowR } = keyShape(item.index);
      local.add(keyGroup);
      // a key is a round bow plus a narrow blade, so it gets two boxes
      box = [
        { group: keyGroup, cy: 0, hw: bowR * 0.82, hh: bowR * 0.82, hd: 1.1 },
        { group: keyGroup, cy: -(length - bowR) / 2 - bowR * 0.3, hw: 4.2, hh: (length - bowR) / 2 - bowR * 0.1, hd: 1.1 },
      ];
    }
    hang.add(local);
    ringGroup.add(hang);
    bodies.push({ hang, boxes: box, kind: item.kind, id: item.tag?.id });
  });

  solveHang(bodies, root, ringGroup);

  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const report = { overlap: maxOverlap(bodies, root), parts: parts.size };

  function dispose() {
    root.traverse((o) => {
      if (o.isMesh) o.geometry.dispose();
    });
    owned.forEach((m) => m.dispose());
  }
  return { group: root, parts, bounds, report, dispose, items: bodies };
}

// --------------------------------------------------------------- hang solver

const _a = makeOBB();
const _b = makeOBB();
const _n = new THREE.Vector3();

function obbOf(box, out) {
  const { group, cy = 0, hw, hh, hd } = box;
  group.updateWorldMatrix(true, false);
  out.c.set(0, cy, 0).applyMatrix4(group.matrixWorld);
  const e = group.matrixWorld.elements;
  for (let i = 0; i < 3; i++) out.a[i].set(e[i * 4], e[i * 4 + 1], e[i * 4 + 2]).normalize();
  out.h[0] = hw * 0.94;
  out.h[1] = hh * 0.94;
  out.h[2] = hd;
  return out;
}

const _a2 = makeOBB();
const _b2 = makeOBB();
const _n2 = new THREE.Vector3();

/** Deepest overlap between two bodies (each one or more boxes); fills the A and B boxes and the normal. */
function bodyPenetration(bi, bj, outA, outB, outN) {
  let best = 0;
  for (const boxA of bi.boxes) {
    for (const boxB of bj.boxes) {
      const depth = obbPenetration(obbOf(boxA, _a2), obbOf(boxB, _b2), _n2);
      if (depth > best) {
        best = depth;
        outN.copy(_n2);
        outA.c.copy(_a2.c);
        outB.c.copy(_b2.c);
      }
    }
  }
  return best;
}

export function pairOverlaps(bodies, root) {
  root.updateMatrixWorld(true);
  const hits = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const depth = bodyPenetration(bodies[i], bodies[j], _a, _b, _n);
      if (depth > 0.05) hits.push([i, j, depth]);
    }
  }
  return hits;
}

function maxOverlap(bodies, root) {
  return pairOverlaps(bodies, root).reduce((m, h) => Math.max(m, h[2]), 0);
}

const _axis = new THREE.Vector3(1, 0, 0);
const _pivot = new THREE.Vector3();
const _r = new THREE.Vector3();
const _d = new THREE.Vector3();
const MAX_PITCH = 52 * DEG;

/**
 * Items on one ring would overlap, so the chains swing apart. Starts from a small fan
 * (position k swings (k - centre) * 4 degrees about the ring wire) and then turns every
 * overlapping pair away from each other about that wire until nothing intersects. A
 * contact moves a body by rotating its chain, exactly like the charm solver. Deterministic.
 */
function solveHang(bodies, root, ringGroup) {
  const centre = (bodies.length - 1) / 2;
  ringGroup.updateMatrixWorld(true);
  _axis.set(1, 0, 0).applyQuaternion(ringGroup.getWorldQuaternion(new THREE.Quaternion())).normalize();
  // try wider and wider fans until the contact pass leaves nothing intersecting
  for (const fan of [6, 8, 10, 12, 14, 16]) {
    bodies.forEach((b, i) => (b.hang.rotation.x = (i - centre) * fan * DEG));
    if (relax(bodies, root)) return;
  }
}

function relax(bodies, root) {
  for (let iter = 0; iter < 200; iter++) {
    root.updateMatrixWorld(true);
    let touched = false;
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const depth = bodyPenetration(bodies[i], bodies[j], _a, _b, _n);
        if (depth <= 0.03) continue;
        touched = true;
        const push = (depth + 0.03) * 0.6;
        [[i, _a, -1], [j, _b, 1]].forEach(([k, box, sign]) => {
          const hang = bodies[k].hang;
          hang.getWorldPosition(_pivot);
          _r.subVectors(box.c, _pivot);
          _r.addScaledVector(_axis, -_r.dot(_axis));
          const len2 = _r.lengthSq();
          if (len2 < 1) return;
          _d.copy(_n).multiplyScalar(sign * push);
          const dTheta = _r.clone().cross(_d).dot(_axis) / len2;
          hang.rotation.x = THREE.MathUtils.clamp(hang.rotation.x + dTheta, -MAX_PITCH, MAX_PITCH);
        });
      }
    }
    if (!touched) return true;
  }
  return pairOverlaps(bodies, root).length === 0;
}
