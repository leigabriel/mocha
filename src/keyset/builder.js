import * as THREE from 'three';
import { CARABINER, SPLIT_RING, splitRingGeometry } from '../tagbuilder/hardware.js';
import { buildChain, solveHang, pairOverlaps } from '../tagbuilder/builder.js';
import { RING, RING_YAW } from './constants.js';
import { buildCharm } from './charms.js';
import { carabinerParts, loopClasp } from './clasp.js';
import { makeCharmMaterial, makeGlassLoopMaterial, makeMetalMaterial } from './materials.js';

const DEG = Math.PI / 180;

/**
 * Builds the whole keychain set: clasp (glass loop, chrome loop, carabiner or none), the
 * split ring and the charms hanging from it on jump rings and optional chain links.
 * Same shape of result as the Tag Builder, so the viewer, animation and exporters are shared:
 * { group, parts, bounds, items, rig:{swing,spin}, report, dispose }.
 */
export function buildKeySet(design) {
  const owned = [];
  const cache = new Map();
  const ctx = {
    metal: makeMetalMaterial(design.metal),
    charmMaterial(kind, hex, thickness = 3) {
      const key = `${kind}|${hex}|${Math.round(thickness * 4)}`;
      if (!cache.has(key)) {
        const m = makeCharmMaterial(kind, hex, { thickness });
        cache.set(key, m);
        owned.push(m);
      }
      return cache.get(key);
    },
  };
  ctx.metal.userData.shared = true;
  owned.push(ctx.metal);

  const root = new THREE.Group();
  root.name = 'Mocha_KeySet';
  const mesh = (geometry, material, name) => {
    const m = new THREE.Mesh(geometry, material);
    m.name = name;
    return m;
  };

  // ------------------------------------------------------------- clasp
  const R = RING.R;
  let ringCenterY = 0;
  const hardware = new THREE.Group();
  hardware.name = 'Clasp';
  let loopMat = ctx.metal;
  if (design.clasp === 'glass') {
    loopMat = makeGlassLoopMaterial(design.glassTint);
    loopMat.userData.shared = true;
    owned.push(loopMat);
  }
  if (design.clasp === 'glass' || design.clasp === 'chrome') {
    const { parts } = loopClasp();
    for (const p of parts) hardware.add(mesh(p.geometry, p.role === 'loop' ? loopMat : ctx.metal, p.name));
    ringCenterY = 2.6 - R;
  } else if (design.clasp === 'carabiner') {
    for (const p of carabinerParts()) hardware.add(mesh(p.geometry, ctx.metal, p.name));
    ringCenterY = CARABINER.wire - (R - RING.wire);
  }
  root.add(hardware);

  const ringGroup = new THREE.Group();
  ringGroup.name = 'RingFrame';
  ringGroup.position.set(0, ringCenterY, 0);
  ringGroup.rotation.y = RING_YAW;
  for (const geo of splitRingGeometry({ R, wire: RING.wire, coils: RING.coils })) ringGroup.add(mesh(geo, ctx.metal, 'SplitRing'));
  root.add(ringGroup);

  // ------------------------------------------------------------ charms
  const charms = design.charms;
  const raw = charms.map((_, k) => k * 4.4);
  const mid = (raw[raw.length - 1] + raw[0]) / 2 || 0;
  const span = Math.max(1, (raw[raw.length - 1] ?? 0) - (raw[0] ?? 0));
  const squeeze = Math.min(1, (R * 1.15) / span);
  const parts = new Map();
  const bodies = [];

  charms.forEach((c, k) => {
    const s = (raw[k] - mid) * squeeze;
    const hang = new THREE.Group();
    hang.name = `Hang_${c.id}`;
    hang.position.set(s, -Math.sqrt(Math.max(1, R * R - s * s)), 0);
    // fan the jump rings outwards across the ring, like the reference
    const fan = charms.length > 1 ? (k / (charms.length - 1)) * 2 - 1 : 0;
    hang.rotation.z = fan * 34 * DEG;
    const chain = buildChain(c.chain, new THREE.Vector3(), ctx);
    hang.add(chain.group);
    const built = buildCharm(c, ctx);
    built.group.position.set(0, chain.holeY, 0);
    built.group.rotation.y = c.yaw * DEG - RING_YAW;
    hang.add(built.group);
    ringGroup.add(hang);
    parts.set(c.id, { group: built.group, hang });
    bodies.push({
      hang,
      boxes: [{ group: built.group, ...built.box }],
      kind: 'tag',
      id: c.id,
      twist: built.group,
      restTwist: built.group.rotation.y,
    });
  });

  if (bodies.length > 1) solveHang(bodies, root, ringGroup);
  bodies.forEach((b) => (b.restPitch = b.hang.rotation.x));

  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);

  // motion rig, identical to the Tag Builder: Swing > Spin > Content
  const pivot = new THREE.Vector3(0, bounds.max.y, 0);
  const swing = new THREE.Group();
  swing.name = 'Mocha_Swing';
  swing.position.copy(pivot);
  const spin = new THREE.Group();
  spin.name = 'Mocha_Spin';
  const content = new THREE.Group();
  content.name = 'Mocha_Content';
  content.position.copy(pivot).negate();
  [...root.children].forEach((ch) => content.add(ch));
  spin.add(content);
  swing.add(spin);
  root.add(swing);
  root.updateMatrixWorld(true);

  const report = {
    charms: parts.size,
    overlap: bodies.length > 1 ? pairOverlaps(bodies, root).reduce((m, h) => Math.max(m, h[2]), 0) : 0,
  };

  function dispose() {
    root.traverse((o) => {
      if (o.isMesh) o.geometry.dispose();
    });
    owned.forEach((m) => m.dispose());
  }
  return { group: root, parts, bounds, items: bodies, rig: { swing, spin }, report, dispose };
}

export { SPLIT_RING };
