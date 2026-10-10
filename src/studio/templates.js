import { createObject, defaultDoc, sanitizeDoc } from './doc.js';

const obj = (type, over) => createObject(type, over);
const mat = (preset, color, extra = {}) => ({ preset, color, roughness: 0.35, metalness: 0, opacity: 1, emissive: '#000000', emissiveIntensity: 1, ...extra });

function doc(name, objects, world = {}) {
  return sanitizeDoc({ ...defaultDoc(), name, world: { ...defaultDoc().world, ...world }, objects });
}

export const TEMPLATES = [
  {
    id: 'empty',
    label: 'Empty scene',
    note: 'Just a grid and a light.',
    build: () => doc('Untitled', [obj('light:sun', { name: 'Sun', pos: [4, 6, 3] })]),
  },
  {
    id: 'starter',
    label: 'Starter',
    note: 'A cube, a sphere and a camera on a floor.',
    build: () => doc('Starter', [
      obj('plane', { name: 'Floor', pos: [0, 0, 0], params: { w: 14, h: 14 }, material: mat('clay', '#d9dce2') }),
      obj('box', { name: 'Cube', pos: [-1.2, 0.5, 0], material: mat('plastic', '#0b3dff') }),
      obj('sphere', { name: 'Sphere', pos: [1.2, 0.5, 0], material: mat('glass', '#9fd8ff') }),
      obj('light:sun', { name: 'Sun', pos: [4, 6, 3] }),
      obj('camera', { name: 'Camera', pos: [0, 2.2, 6.5], rot: [-12, 0, 0] }),
    ], { bg: 'light' }),
  },
  {
    id: 'keychain',
    label: 'Keychain',
    note: 'Chrome ring, glass tag and a soft-touch charm.',
    build: () => {
      const ring = obj('torus', { name: 'Ring', pos: [0, 2.6, 0], params: { radius: 0.5, tube: 0.05, seg: 64 }, material: mat('chrome', '#e9edf2') });
      const tag = obj('box', { name: 'Glass tag', pos: [0, 1.2, 0], params: { w: 0.9, h: 1.7, d: 0.1, radius: 0.08 }, material: mat('glass', '#f4e400') });
      const label = obj('text', { name: 'Label', pos: [0, 1.0, 0.07], params: { text: 'Mocha', font: 'inter', size: 0.3, depth: 0.05, bevel: 0.01 }, material: mat('plastic', '#ffffff'), rot: [0, 0, 90] });
      const charm = obj('heart', { name: 'Charm', pos: [1.1, 1.5, 0], params: { size: 0.8, depth: 0.28, bevel: 0.07 }, material: mat('softtouch', '#ff6aa8'), rot: [0, -20, 8] });
      return doc('Keychain', [ring, tag, label, charm,
        obj('light:spot', { name: 'Key light', pos: [2.5, 4, 3], rot: [-52, 28, 0], light: { color: '#ffffff', intensity: 220, angle: 38, castShadow: true } }),
        obj('light:point', { name: 'Rim light', pos: [-3, 2, -3], light: { color: '#bcd4ff', intensity: 60, angle: 40, castShadow: false } }),
        obj('camera', { name: 'Camera', pos: [0, 1.8, 6], rot: [-4, 0, 0] })], { bg: 'black', env: 1.2 });
    },
  },
  {
    id: 'podium',
    label: 'Product podium',
    note: 'Round podium with a glowing ring, ready for your model.',
    build: () => doc('Podium', [
      obj('cylinder', { name: 'Podium', pos: [0, 0.25, 0], params: { rTop: 1.6, rBottom: 1.7, h: 0.5, seg: 64 }, material: mat('softtouch', '#e7e8ea') }),
      obj('torus', { name: 'Glow ring', pos: [0, 0.52, 0], rot: [90, 0, 0], params: { radius: 1.5, tube: 0.03, seg: 96 }, material: mat('emissive', '#0b3dff', { emissiveIntensity: 3 }) }),
      obj('sphere', { name: 'Product', pos: [0, 1.4, 0], params: { radius: 0.8, seg: 64 }, material: mat('chrome', '#e9edf2') }),
      obj('light:spot', { name: 'Key light', pos: [3, 5, 3], rot: [-55, 35, 0], light: { color: '#ffffff', intensity: 260, angle: 35, castShadow: true } }),
      obj('camera', { name: 'Camera', pos: [0, 2, 6.5], rot: [-8, 0, 0] }),
    ], { bg: 'cobalt' }),
  },
];
