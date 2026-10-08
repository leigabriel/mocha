import * as THREE from 'three';

// Procedural hardware, all in millimetres. Every function returns plain geometries
// (or small groups) with no materials, so the builder decides colours and finishes.

export const SPLIT_RING = Object.freeze({ R: 12.5, wire: 0.9, coils: 2.15 });
export const JUMP_RING = Object.freeze({ Rt: 3.0, wire: 0.55 }); // Rt = radius to wire centre
export const CHAIN_LINK = Object.freeze({ hl: 4.3, hw: 2.45, wire: 0.6 }); // centre-line half length / half width
export const CARABINER = Object.freeze({ W: 30, H: 62, wire: 2.0 });

/** Double-coil split ring in the XY plane, centred on the origin. */
export function splitRingGeometry({ R, wire, coils } = SPLIT_RING) {
  const perTurn = wire * 2.1;
  const totalZ = perTurn * coils;
  const steps = 128;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2 * coils;
    pts.push(new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, (t - 0.5) * totalZ));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.TubeGeometry(curve, 180, wire, 12, false);
  const capA = new THREE.SphereGeometry(wire, 14, 10).translate(pts[0].x, pts[0].y, pts[0].z);
  const last = pts[pts.length - 1];
  const capB = new THREE.SphereGeometry(wire, 14, 10).translate(last.x, last.y, last.z);
  return [tube, capA, capB];
}

/** Round jump ring in the XY plane. */
export function jumpRingGeometry({ Rt, wire } = JUMP_RING) {
  return new THREE.TorusGeometry(Rt, wire, 10, 28);
}

/** Stadium-shaped chain link in the XY plane (long axis along Y). */
export function chainLinkGeometry({ hl, hw, wire } = CHAIN_LINK) {
  const pts = [];
  const straight = hl - hw;
  const arcSteps = 14;
  for (let i = 0; i <= arcSteps; i++) {
    const a = (i / arcSteps) * Math.PI;
    pts.push(new THREE.Vector3(Math.cos(a) * hw, straight + Math.sin(a) * hw, 0));
  }
  for (let i = 0; i <= arcSteps; i++) {
    const a = Math.PI + (i / arcSteps) * Math.PI;
    pts.push(new THREE.Vector3(Math.cos(a) * hw, -straight + Math.sin(a) * hw, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  return new THREE.TubeGeometry(curve, 56, wire, 8, true);
}

/**
 * Carabiner in the XY plane. Origin = centre of the bottom of the frame wire, +Y up.
 * Returns { frame, gate, sleeve: [geometries], hinge: [geometries] }.
 */
export function carabinerGeometries({ W, H, wire } = CARABINER) {
  const r = W / 2;
  const pts = [];
  const arc = (cx, cy, from, to, n) => {
    for (let i = 0; i <= n; i++) {
      const a = from + ((to - from) * i) / n;
      pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0));
    }
  };
  // hinge (right, low) -> round the bottom -> up the spine -> over the top -> gate tip
  arc(0, r, 0, -Math.PI / 2, 8);
  arc(0, r, -Math.PI / 2, -Math.PI, 8);
  pts.pop();
  for (let i = 0; i <= 4; i++) pts.push(new THREE.Vector3(-r, r + ((H - 2 * r) * i) / 4, 0));
  pts.pop();
  arc(0, H - r, Math.PI, Math.PI / 2, 8);
  arc(0, H - r, Math.PI / 2, 0.05, 8);
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const frame = new THREE.TubeGeometry(curve, 200, wire, 16, false);
  const tipPoint = pts[pts.length - 1];

  const gateTop = H - r - 1.2;
  const gateLen = gateTop - r;
  const gate = new THREE.CylinderGeometry(wire * 0.82, wire * 0.82, gateLen, 18).translate(r, r + gateLen / 2, 0);

  const sleeveLen = 12;
  const sleeveY = gateTop - sleeveLen / 2 - 0.4;
  const sleeve = [new THREE.CylinderGeometry(wire * 1.72, wire * 1.72, sleeveLen, 28).translate(r, sleeveY, 0)];
  for (let i = -2; i <= 2; i++) {
    sleeve.push(new THREE.TorusGeometry(wire * 1.74, 0.22, 8, 28).rotateX(Math.PI / 2).translate(r, sleeveY + i * 2.1, 0));
  }
  const hinge = [
    new THREE.SphereGeometry(wire * 1.05, 16, 12).translate(r, r, 0),
    new THREE.SphereGeometry(wire * 1.0, 16, 12).translate(tipPoint.x, tipPoint.y, 0),
  ];
  return { frame, gate: [gate], sleeve, hinge };
}

/**
 * Flat key with the hole at the origin, blade pointing down (-Y), faces along +Z.
 * `seed` varies the bitting so several keys look different.
 */
export function keyShape(seed = 0) {
  const bowR = 9.5;
  const bladeHalf = 4.25;
  const joinY = -Math.sqrt(bowR * bowR - bladeHalf * bladeHalf);
  const bladeLen = 33 + (seed % 3) * 2.5;
  const tipY = joinY - bladeLen;
  const startA = Math.atan2(joinY, bladeHalf);
  const shape = new THREE.Shape();
  shape.absarc(0, 0, bowR, startA, Math.PI - startA + 0, false);
  shape.lineTo(-bladeHalf, tipY + 1.2);
  shape.lineTo(-bladeHalf + 1.2, tipY);
  shape.lineTo(bladeHalf - 1.6, tipY);
  shape.lineTo(bladeHalf, tipY + 1.6);
  // teeth up the right edge
  const teeth = 6;
  const span = bladeLen - 6;
  for (let i = 0; i < teeth; i++) {
    const y0 = tipY + 4 + (span * i) / teeth;
    const y1 = tipY + 4 + (span * (i + 1)) / teeth;
    const depth = 0.7 + (((i * 7 + seed * 5) % 5) * 0.45);
    shape.lineTo(bladeHalf, y0);
    shape.lineTo(bladeHalf - depth, y0 + 0.5);
    shape.lineTo(bladeHalf - depth, y1 - 0.5);
    shape.lineTo(bladeHalf, y1);
  }
  shape.lineTo(bladeHalf, joinY);
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, 3.1, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return { shape, length: bowR - tipY, bowR };
}

export function keyGeometry(seed = 0, depth = 2.2) {
  const { shape } = keyShape(seed);
  const bevel = 0.45;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: depth - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 3,
    curveSegments: 32,
  });
  g.translate(0, 0, -(depth - 2 * bevel) / 2);
  return g;
}
