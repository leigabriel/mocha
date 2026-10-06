import * as THREE from 'three';
import { CONFIG } from '../constants/index.js';

/**
 * Where each charm hangs on the master ring. `x`/`z` are offsets on the ring wire
 * (x is multiplied by the cluster spread); the vertical position follows the ring's
 * curvature, see `getMountPosition`.
 */
export const CLUSTER_SLOTS = Object.freeze([
  // 0: centre hero, frontmost so it is never hidden
  { x: 0.0, z: 0.035, restYaw: 0.0, restPitch: 0.03, restRoll: 0.0 },
  // 1: left flank, turned slightly outward, behind the hero
  { x: -0.24, z: -0.02, restYaw: -0.3, restPitch: 0.02, restRoll: 0.05 },
  // 2: right flank
  { x: 0.24, z: -0.02, restYaw: 0.3, restPitch: -0.02, restRoll: -0.05 },
  // 3: rear-left accent, peeks out between hero and left flank
  { x: -0.09, z: -0.04, restYaw: -0.15, restPitch: 0.05, restRoll: 0.02 },
  // 4: rear-right accent
  { x: 0.09, z: -0.04, restYaw: 0.15, restPitch: -0.04, restRoll: -0.03 },
]);

// A jump ring hangs from the ring wire: the wire centre sits this far above the
// jump ring's origin (ring radius - ring wire - master wire).
const MOUNT_DROP = CONFIG.jumpRingRadius - CONFIG.jumpRingWire - CONFIG.masterRingWire;

/** Offset from the master ring's centre to where a slot's jump ring hangs. */
export function getMountPosition(slot, spread, out = new THREE.Vector3()) {
  const R = CONFIG.masterRingRadius;
  const maxX = R * 0.92;
  const x = THREE.MathUtils.clamp(slot.x * spread, -maxX, maxX);
  return out.set(x, -Math.sqrt(R * R - x * x) - MOUNT_DROP, slot.z);
}

/** Ring centre relative to the pivot (the peg the ring hangs from). */
export const RING_CENTER_OFFSET = Object.freeze(
  new THREE.Vector3(0, CONFIG.pegRadius + CONFIG.masterRingWire - CONFIG.masterRingRadius, 0)
);
