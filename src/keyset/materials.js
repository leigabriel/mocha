import * as THREE from 'three';
import { METALS } from './constants.js';

/**
 * Material presets. The name is `KS_<role>_<hex>` so the Blender script can swap each one
 * for a node-based Cycles material with the same colour.
 */
export function makeCharmMaterial(kind, hex, { thickness = 3, tint = null } = {}) {
  const color = new THREE.Color(hex);
  let m;
  switch (kind) {
    case 'glass':
      m = new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.04,
        metalness: 0,
        transmission: 0.62,
        thickness: Math.max(1.5, thickness),
        ior: 1.5,
        attenuationColor: color,
        attenuationDistance: 8,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        specularIntensity: 1,
        envMapIntensity: 1.3,
      });
      break;
    case 'frost':
      m = new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.3,
        metalness: 0,
        transmission: 0.42,
        thickness: Math.max(1.5, thickness),
        ior: 1.45,
        attenuationColor: color,
        attenuationDistance: 14,
        clearcoat: 0.6,
        clearcoatRoughness: 0.18,
      });
      break;
    case 'matte':
      m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, metalness: 0, sheen: 0.2, sheenColor: color });
      break;
    case 'soft':
      m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.72, metalness: 0, sheen: 0.7, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xffffff), clearcoat: 0.12, clearcoatRoughness: 0.5 });
      break;
    case 'chrome':
      m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.06, metalness: 1, clearcoat: 0.2, clearcoatRoughness: 0.05 });
      break;
    case 'gloss':
    default:
      m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04 });
  }
  m.name = `KS_${kind}_${String(tint ?? hex).replace('#', '')}`;
  m.userData.role = kind;
  m.userData.hex = hex;
  return m;
}

export function makeMetalMaterial(id) {
  const spec = METALS[id] ?? METALS.chrome;
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.color),
    metalness: spec.metalness,
    roughness: spec.roughness,
    clearcoat: 0.15,
    clearcoatRoughness: 0.05,
  });
  m.name = `KS_metal_${spec.color.replace('#', '')}`;
  m.userData.role = 'metal';
  m.userData.hex = spec.color;
  m.userData.roughness = spec.roughness;
  return m;
}

export function makeGlassLoopMaterial(hex) {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.02,
    metalness: 0,
    transmission: 1,
    thickness: 4,
    ior: 1.5,
    attenuationColor: new THREE.Color(hex),
    attenuationDistance: 18,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 2.4,
  });
  m.name = `KS_glass_${hex.replace('#', '')}`;
  m.userData.role = 'glass';
  m.userData.hex = hex;
  return m;
}
