import * as THREE from 'three';
import { METALS } from './constants.js';

/**
 * Physically based material presets. `thickness` (mm) feeds acrylic transmission so
 * light bends through thicker tags more.
 */
export function makeMaterial(kind, hex, { thickness = 3 } = {}) {
  const color = new THREE.Color(hex);
  let m;
  switch (kind) {
    case 'acrylic':
      m = new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.04,
        metalness: 0,
        transmission: 1,
        thickness,
        ior: 1.49,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        attenuationColor: color,
        attenuationDistance: 60,
        specularIntensity: 1,
      });
      break;
    case 'matte':
      m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.62, metalness: 0, sheen: 0.2 });
      break;
    case 'rubber':
      m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.88, metalness: 0, sheen: 0.6, sheenRoughness: 0.8, sheenColor: color });
      break;
    case 'metal':
      m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, metalness: 1, clearcoat: 0.3, clearcoatRoughness: 0.2 });
      break;
    case 'gloss':
    default:
      m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 });
  }
  m.name = `${kind}_${String(hex).replace('#', '')}`;
  return m;
}

export function makeMetal(id) {
  const spec = METALS[id] ?? METALS.steel;
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.color),
    metalness: spec.metalness,
    roughness: spec.roughness,
    clearcoat: 0.2,
    clearcoatRoughness: 0.2,
  });
  m.name = `Metal_${id}`;
  return m;
}

export function makeAnodized(hex) {
  const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex), metalness: 0.85, roughness: 0.32, clearcoat: 0.4, clearcoatRoughness: 0.25 });
  m.name = `Anodized_${String(hex).replace('#', '')}`;
  return m;
}
