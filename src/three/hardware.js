import * as THREE from 'three';
import { CONFIG, HARDWARE_MATS } from '../constants/index.js';

// Hardware geometry and materials are identical for every charm, so they are
// created once and shared. They live for the whole page and are never disposed.

const materials = new Map();
const geometries = new Map();

export function getHardwareMaterial(finish) {
  const key = HARDWARE_MATS[finish] ? finish : 'steel';
  let mat = materials.get(key);
  if (!mat) {
    const spec = HARDWARE_MATS[key];
    mat = new THREE.MeshStandardMaterial({
      color: spec.color,
      metalness: spec.metalness,
      roughness: spec.roughness,
    });
    mat.name = `Hardware_${key}`;
    materials.set(key, mat);
  }
  return mat;
}

function cached(key, build) {
  let geo = geometries.get(key);
  if (!geo) {
    geo = build();
    geometries.set(key, geo);
  }
  return geo;
}

function capDisc(radius, z, flip) {
  const geo = new THREE.CircleGeometry(radius, 12);
  if (flip) geo.rotateY(Math.PI);
  geo.translate(0, 0, z);
  return geo;
}

function buildSplitRingGeometry(radius, wireRadius) {
  const coils = 2.15;
  // Advance by slightly more than one wire diameter per turn so neighbouring
  // coils touch instead of passing through each other.
  const perTurn = wireRadius * 2.1;
  const totalZ = perTurn * coils;
  const steps = 96;
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = t * Math.PI * 2 * coils;
    points.push(
      new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, (t - 0.5) * totalZ)
    );
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const tube = new THREE.TubeGeometry(curve, 160, wireRadius, 12, false);

  // Cap both open ends so the mesh is closed.
  const start = curve.getPointAt(0);
  const end = curve.getPointAt(1);
  const startTan = curve.getTangentAt(0);
  const endTan = curve.getTangentAt(1);
  const capA = capDisc(wireRadius, 0, true);
  const capB = capDisc(wireRadius, 0, false);
  const qA = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), startTan.clone().negate());
  const qB = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), endTan);
  capA.applyQuaternion(qA).translate(start.x, start.y, start.z);
  capB.applyQuaternion(qB).translate(end.x, end.y, end.z);

  const merged = mergeGeometries([tube, capA, capB]);
  tube.dispose();
  capA.dispose();
  capB.dispose();
  return merged;
}

/** Minimal indexed-geometry merge (position, normal, uv). */
function mergeGeometries(list) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  let offset = 0;
  for (const g of list) {
    const pos = g.getAttribute('position');
    const nor = g.getAttribute('normal');
    const uv = g.getAttribute('uv');
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
    }
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) indices.push(g.index.getX(i) + offset);
    } else {
      for (let i = 0; i < pos.count; i++) indices.push(i + offset);
    }
    offset += pos.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  out.setIndex(indices);
  return out;
}

function buildStadiumGeometry() {
  const halfStraight = (CONFIG.linkOuterL - CONFIG.linkOuterW) / 2;
  const r = CONFIG.linkOuterW / 2 - CONFIG.linkWireR;
  const wireR = CONFIG.linkWireR;

  const arc1 = new THREE.EllipseCurve(0, halfStraight, r, r, 0, Math.PI, false, 0);
  const arc2 = new THREE.EllipseCurve(0, -halfStraight, r, r, Math.PI, 2 * Math.PI, false, 0);

  const points = [];
  arc1.getPoints(10).forEach((p) => points.push(new THREE.Vector3(p.x, p.y, 0)));
  points.push(new THREE.Vector3(-r, -halfStraight, 0));
  arc2.getPoints(10).forEach((p) => points.push(new THREE.Vector3(p.x, p.y, 0)));
  points.push(new THREE.Vector3(r, halfStraight, 0));

  const curve = new THREE.CatmullRomCurve3(points, true);
  return new THREE.TubeGeometry(curve, 36, wireR, 8, true);
}

export function createSplitRingMesh(mat) {
  const geo = cached('splitRing', () => buildSplitRingGeometry(CONFIG.masterRingRadius, CONFIG.masterRingWire));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'MasterSplitRing';
  return mesh;
}

export function createJumpRingMesh(mat) {
  const geo = cached('jumpRing', () => new THREE.TorusGeometry(CONFIG.jumpRingRadius, CONFIG.jumpRingWire, 10, 28));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'JumpRing';
  return mesh;
}

export function createStadiumLinkMesh(mat) {
  const geo = cached('stadiumLink', buildStadiumGeometry);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'StadiumCableLink';
  return mesh;
}

/** Swaps the shared finish material on every hardware mesh under `root`. */
export function applyFinish(root, finish) {
  const mat = getHardwareMaterial(finish);
  root.traverse((obj) => {
    if (obj.isMesh && obj.userData.hardware) obj.material = mat;
  });
}

/** Marks a hardware mesh so `applyFinish` can find it. */
export function markHardware(mesh) {
  mesh.userData.hardware = true;
  return mesh;
}
