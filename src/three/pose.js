import * as THREE from 'three';
import { CLUSTER_SLOTS, RING_CENTER_OFFSET, getMountPosition } from './clusterSlots.js';

// Pure pose maths shared by the live cluster and the exporters, so an exported rest
// pose or baked clip is placed exactly like what the viewport shows.

const _e = new THREE.Euler();

export function slotFor(index) {
  return CLUSTER_SLOTS[index % CLUSTER_SLOTS.length];
}

/** Master (whole-cluster) rotation about the peg. */
export function masterQuaternion(m, out = new THREE.Quaternion()) {
  _e.set(m.thetaX, m.thetaY, m.thetaZ, 'YXZ');
  return out.setFromEuler(_e);
}

/** Position of the split ring's centre relative to the peg. */
export function ringPosition(qMaster, out = new THREE.Vector3()) {
  return out.copy(RING_CENTER_OFFSET).applyQuaternion(qMaster);
}

/** Position of a charm branch's top jump ring relative to the peg. */
export function branchPosition(qMaster, slot, spread, out = new THREE.Vector3()) {
  return getMountPosition(slot, spread, out).add(RING_CENTER_OFFSET).applyQuaternion(qMaster);
}

/** Orientation of a charm branch: slot rest angles + master swing + the branch's own swing. */
export function branchQuaternion(m, b, slot, out = new THREE.Quaternion()) {
  _e.set(m.thetaX + slot.restPitch + b.thetaX, m.thetaY + slot.restYaw + b.thetaY, m.thetaZ + slot.restRoll + b.thetaZ, 'YXZ');
  return out.setFromEuler(_e);
}

/** Orientation of the charm relative to its bottom jump ring. */
export function pivotQuaternion(b, out = new THREE.Quaternion()) {
  _e.set(b.charmX, 0, b.charmZ, 'YXZ');
  return out.setFromEuler(_e);
}
