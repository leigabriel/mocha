import * as THREE from 'three';
import { CONFIG } from '../constants/index.js';

export function getClusterSlots() {
  return [
    // 0: Center Hero (front-facing, slightly lower, focal character)
    {
      ringOffset: new THREE.Vector3(0.00, -CONFIG.masterRingRadius + 0.015, 0.025),
      restYaw: 0.00,
      restPitch: 0.03,
      restRoll: 0.00,
      mass: 1.15
    },
    // 1: Left Flank (fanned out to left, slight depth recess, face angled inward)
    {
      ringOffset: new THREE.Vector3(-0.065, -CONFIG.masterRingRadius + 0.024, -0.015),
      restYaw: -0.46,
      restPitch: 0.02,
      restRoll: 0.05,
      mass: 1.00
    },
    // 2: Right Flank (fanned out to right, slight depth forward, face angled inward)
    {
      ringOffset: new THREE.Vector3(0.065, -CONFIG.masterRingRadius + 0.024, 0.015),
      restYaw: 0.46,
      restPitch: -0.02,
      restRoll: -0.05,
      mass: 1.02
    },
    // 3: Rear-Left Accent (tucked in background, peeking between center and left)
    {
      ringOffset: new THREE.Vector3(-0.030, -CONFIG.masterRingRadius + 0.018, -0.045),
      restYaw: -0.22,
      restPitch: 0.05,
      restRoll: 0.02,
      mass: 0.95
    },
    // 4: Front-Right Accent (tucked in foreground, peeking out front-right)
    {
      ringOffset: new THREE.Vector3(0.030, -CONFIG.masterRingRadius + 0.018, 0.045),
      restYaw: 0.24,
      restPitch: -0.04,
      restRoll: -0.03,
      mass: 0.98
    }
  ];
}
