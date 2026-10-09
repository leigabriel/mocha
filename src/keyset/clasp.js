import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { carabinerGeometries } from '../tagbuilder/hardware.js';

/** U-shaped tube (glass or chrome loop) in the XY plane. Legs end at y = 0, the loop rises to y = height. */
export function uLoopGeometry({ width = 19, height = 40, wire = 2.3 } = {}) {
  const r = width / 2;
  const pts = [];
  pts.push(new THREE.Vector3(-r, 0, 0));
  pts.push(new THREE.Vector3(-r, (height - r) * 0.5, 0));
  pts.push(new THREE.Vector3(-r, height - r, 0));
  const arc = 24;
  for (let i = 1; i < arc; i++) {
    const a = Math.PI - (Math.PI * i) / arc;
    pts.push(new THREE.Vector3(Math.cos(a) * r, height - r + Math.sin(a) * r, 0));
  }
  pts.push(new THREE.Vector3(r, height - r, 0));
  pts.push(new THREE.Vector3(r, (height - r) * 0.5, 0));
  pts.push(new THREE.Vector3(r, 0, 0));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  return new THREE.TubeGeometry(curve, 90, wire, 14, false);
}

const plate = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 5, Math.min(r, w / 2 - 0.1, h / 2 - 0.1, d / 2 - 0.1));

/**
 * Glass / chrome loop clasp. Origin = the bottom of the lowest plate, so the split ring
 * can hang from y = 0. Returns { height, parts: [{ geometry, role, name }] } where role is
 * 'loop' (glass or chrome by design), 'metal' or 'ring'.
 */
export function loopClasp() {
  const parts = [];
  const tongueH = 4;
  const lowH = 6.5;
  const blockH = 12;
  const tongueY = tongueH / 2 + 0.6;
  const lowY = tongueY + tongueH / 2 + lowH / 2 - 1.2;
  const blockY = lowY + lowH / 2 + blockH / 2 - 1.4;
  const blockTop = blockY + blockH / 2;
  parts.push({ geometry: plate(9, tongueH, 4, 1.4).translate(0, tongueY, 0), role: 'metal', name: 'ClaspTongue' });
  parts.push({ geometry: plate(22, lowH, 5.5, 1.6).translate(0, lowY, 0), role: 'metal', name: 'ClaspSwivel' });
  parts.push({ geometry: plate(33, blockH, 7, 1.8).translate(0, blockY, 0), role: 'metal', name: 'ClaspBlock' });
  // small round eyelet on the block face, like the reference
  parts.push({ geometry: new THREE.TorusGeometry(2.3, 0.55, 12, 28).translate(-11.2, blockY, 3.6), role: 'metal', name: 'ClaspEyelet' });
  // the loop sits in the block: its legs end inside it
  const loop = uLoopGeometry({ width: 19, height: 42, wire: 2.3 });
  loop.translate(0, blockTop - 3, 0);
  parts.push({ geometry: loop, role: 'loop', name: 'ClaspLoop' });
  // chrome collars where the glass enters the block
  for (const sx of [-1, 1]) {
    parts.push({ geometry: new THREE.CylinderGeometry(2.9, 2.9, 2.2, 24).translate(sx * 9.5, blockTop + 0.2, 0), role: 'metal', name: 'ClaspCollar' });
  }
  return { height: blockTop - 3 + 42, parts };
}

/** Carabiner reuse from the Tag Builder, as plain parts. */
export function carabinerParts() {
  const { frame, gate, sleeve, hinge } = carabinerGeometries();
  return [
    { geometry: frame, role: 'loop', name: 'CarabinerFrame' },
    ...gate.map((g) => ({ geometry: g, role: 'metal', name: 'CarabinerGate' })),
    ...hinge.map((g) => ({ geometry: g, role: 'metal', name: 'CarabinerHinge' })),
    ...sleeve.map((g) => ({ geometry: g, role: 'metal', name: 'CarabinerSleeve' })),
  ];
}
