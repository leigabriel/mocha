// Keychain Set constants. Every length in this module is in millimetres.

export const SET_LIMITS = Object.freeze({
  maxCharms: 6,
  w: [10, 70],
  h: [14, 110],
  d: [1.6, 9],
  r: [0, 20],
  textSize: [30, 100],
  textDepth: [0.1, 3],
  ribs: [0, 8],
  chain: [0, 3],
  textLength: 40,
  svgBytes: 150_000,
});

export const CHARM_STYLES = [
  { id: 'motel', label: 'Motel tag', w: 34, h: 62, d: 3.2 },
  { id: 'bar', label: 'Bar', w: 22, h: 84, d: 3.4 },
  { id: 'ribbed', label: 'Ribbed bar', w: 22, h: 84, d: 4.2 },
  { id: 'triangle', label: 'Triangle', w: 58, h: 52, d: 3.4 },
  { id: 'silhouette', label: 'Silhouette', w: 46, h: 40, d: 5.5 },
  { id: 'circle', label: 'Disc', w: 34, h: 34, d: 3.2 },
];
export const STYLE_IDS = CHARM_STYLES.map((s) => s.id);

export const SILHOUETTES = [
  { id: 'cat', label: 'Cat' },
  { id: 'heart', label: 'Heart' },
  { id: 'star', label: 'Star' },
  { id: 'bolt', label: 'Bolt' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'upload', label: 'Upload SVG' },
];
export const SILHOUETTE_IDS = SILHOUETTES.map((s) => s.id);

export const MATERIALS = [
  { id: 'glass', label: 'Tinted glass' },
  { id: 'frost', label: 'Frosted' },
  { id: 'gloss', label: 'Glossy' },
  { id: 'matte', label: 'Matte' },
  { id: 'soft', label: 'Soft touch' },
  { id: 'chrome', label: 'Chrome' },
];
export const MATERIAL_IDS = MATERIALS.map((m) => m.id);

export const TEXT_MODES = [
  { id: 'raised', label: 'Raised' },
  { id: 'print', label: 'Printed' },
  { id: 'none', label: 'None' },
];
export const TEXT_MODE_IDS = TEXT_MODES.map((m) => m.id);
export const TEXT_ROTATIONS = [
  { id: 'auto', label: 'Auto' },
  { id: '0', label: '0°' },
  { id: '90', label: '90°' },
  { id: '-90', label: '-90°' },
];

export const CLASPS = [
  { id: 'glass', label: 'Glass loop' },
  { id: 'chrome', label: 'Chrome loop' },
  { id: 'carabiner', label: 'Carabiner' },
  { id: 'none', label: 'Ring only' },
];
export const CLASP_IDS = CLASPS.map((c) => c.id);

export const METALS = {
  chrome: { label: 'Chrome', color: '#e9edf2', metalness: 1, roughness: 0.07 },
  steel: { label: 'Brushed', color: '#d3d8de', metalness: 1, roughness: 0.28 },
  gold: { label: 'Gold', color: '#e6bd55', metalness: 1, roughness: 0.14 },
  noir: { label: 'Gunmetal', color: '#454a54', metalness: 1, roughness: 0.2 },
};
export const METAL_IDS = Object.keys(METALS);

export const BACKDROPS = {
  black: { label: 'Black', top: '#050506', bottom: '#050506' },
  graphite: { label: 'Graphite', top: '#2b2e34', bottom: '#2b2e34' },
  studio: { label: 'Studio', top: '#e9eaec', bottom: '#e9eaec' },
  cobalt: { label: 'Cobalt', top: '#0b3dff', bottom: '#0b3dff' },
  clear: { label: 'Clear', top: null, bottom: null },
};
export const BACKDROP_IDS = Object.keys(BACKDROPS);

export const LIGHTING = {
  studio: { label: 'Studio', env: 1.9, key: 1.5 },
  soft: { label: 'Soft', env: 1.35, key: 0.8 },
  dramatic: { label: 'Dramatic', env: 2.6, key: 2.4 },
};
export const LIGHTING_IDS = Object.keys(LIGHTING);

export const RING = Object.freeze({ R: 13, wire: 0.9, coils: 2.15 });
export const RING_YAW = (22 * Math.PI) / 180;
export const HOLE_R = 1.7;
