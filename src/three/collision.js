import * as THREE from 'three';

// Oriented-bounding-box (OBB) collision between charms, using the separating axis
// theorem. Pure maths on plain vectors so the live scene, the animation baker and
// the tests all run the exact same code.

export function makeOBB() {
  return {
    c: new THREE.Vector3(),
    a: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)],
    h: [0, 0, 0],
  };
}

/** Builds an OBB from a mesh's rendered bounds and its world matrix (matrices must be current). */
export function obbFromMesh(mesh, out = makeOBB()) {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const bb = mesh.geometry.boundingBox;
  out.c.set((bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2);
  out.c.applyMatrix4(mesh.matrixWorld);
  const e = mesh.matrixWorld.elements;
  for (let i = 0; i < 3; i++) out.a[i].set(e[i * 4], e[i * 4 + 1], e[i * 4 + 2]).normalize();
  out.h[0] = (bb.max.x - bb.min.x) / 2;
  out.h[1] = (bb.max.y - bb.min.y) / 2;
  out.h[2] = (bb.max.z - bb.min.z) / 2;
  return out;
}

const EPS = 1e-6;
const EDGE_BIAS = 1.05; // prefer face normals over edge-edge normals when depths are close
const _axis = new THREE.Vector3();
const _d = new THREE.Vector3();
const _best = new THREE.Vector3();

function projectedRadius(box, axis) {
  return (
    box.h[0] * Math.abs(box.a[0].dot(axis)) +
    box.h[1] * Math.abs(box.a[1].dot(axis)) +
    box.h[2] * Math.abs(box.a[2].dot(axis))
  );
}

/**
 * Tests two OBBs. Returns the penetration depth (0 when separated) and writes the
 * unit contact normal, pointing from `A` towards `B`, into `normalOut`.
 */
export function obbPenetration(A, B, normalOut) {
  _d.subVectors(B.c, A.c);
  let minDepth = Infinity;
  let minBiased = Infinity;

  const test = (axis, isEdge) => {
    const len = axis.length();
    if (len < EPS) return true; // parallel edges: no information from this axis
    axis.multiplyScalar(1 / len);
    const dist = _d.dot(axis);
    const depth = projectedRadius(A, axis) + projectedRadius(B, axis) - Math.abs(dist);
    if (depth <= 0) return false; // found a separating axis
    const biased = isEdge ? depth * EDGE_BIAS : depth;
    if (biased < minBiased) {
      minBiased = biased;
      minDepth = depth;
      _best.copy(axis);
      if (dist < 0) _best.negate();
    }
    return true;
  };

  for (let i = 0; i < 3; i++) if (!test(_axis.copy(A.a[i]), false)) return 0;
  for (let i = 0; i < 3; i++) if (!test(_axis.copy(B.a[i]), false)) return 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (!test(_axis.crossVectors(A.a[i], B.a[j]), true)) return 0;
    }
  }

  normalOut.copy(_best);
  return minDepth;
}
