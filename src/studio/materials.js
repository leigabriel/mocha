import * as THREE from 'three';

/** Builds a physical material from the document's material block. */
export function makeMaterial(m) {
  const color = new THREE.Color(m.color);
  const common = { color, transparent: m.opacity < 1, opacity: m.opacity, side: THREE.DoubleSide };
  let mat;
  switch (m.preset) {
    case 'clay':
      mat = new THREE.MeshPhysicalMaterial({ ...common, roughness: Math.max(0.7, m.roughness), metalness: 0 });
      break;
    case 'metal':
      mat = new THREE.MeshPhysicalMaterial({ ...common, roughness: Math.min(0.5, m.roughness), metalness: 1 });
      break;
    case 'chrome':
      mat = new THREE.MeshPhysicalMaterial({ ...common, roughness: 0.04, metalness: 1, clearcoat: 0.3 });
      break;
    case 'glass':
      mat = new THREE.MeshPhysicalMaterial({ ...common, color: 0xffffff, roughness: Math.min(0.15, m.roughness), metalness: 0, transmission: 1, thickness: 0.4, ior: 1.5, attenuationColor: color, attenuationDistance: 1.5, clearcoat: 1, side: THREE.FrontSide });
      break;
    case 'frosted':
      mat = new THREE.MeshPhysicalMaterial({ ...common, color, roughness: 0.35, metalness: 0, transmission: 0.5, thickness: 0.4, ior: 1.45, clearcoat: 0.5, side: THREE.FrontSide });
      break;
    case 'softtouch':
      mat = new THREE.MeshPhysicalMaterial({ ...common, roughness: 0.75, metalness: 0, sheen: 0.7, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffffff), clearcoat: 0.1 });
      break;
    case 'emissive':
      mat = new THREE.MeshPhysicalMaterial({ ...common, roughness: 0.4, metalness: 0, emissive: color, emissiveIntensity: Math.max(1, m.emissiveIntensity) });
      break;
    case 'plastic':
    default:
      mat = new THREE.MeshPhysicalMaterial({ ...common, roughness: m.roughness, metalness: m.metalness, clearcoat: 0.6, clearcoatRoughness: 0.1 });
  }
  if (m.preset !== 'emissive' && m.emissive && m.emissive !== '#000000') {
    mat.emissive = new THREE.Color(m.emissive);
    mat.emissiveIntensity = m.emissiveIntensity;
  }
  const role = { plastic: 'gloss', clay: 'matte', metal: 'metal', chrome: 'chrome', glass: 'glass', frosted: 'frost', softtouch: 'soft', emissive: 'emissive' }[m.preset] ?? 'gloss';
  mat.name = `KS_${role}_${m.color.replace('#', '')}_${Math.round(m.roughness * 100)}`;
  return mat;
}
