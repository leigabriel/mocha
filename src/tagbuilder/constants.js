// Tag Builder constants. Every length in this module is in millimetres.

export const TAG_LIMITS = Object.freeze({
  maxTags: 6,
  w: [8, 90],
  h: [8, 120],
  d: [1.2, 12],
  r: [0, 30],
  textDepth: [0.2, 4],
  outline: [0, 4],
  textSize: [20, 100],
  textLength: 60,
  svgBytes: 150_000,
});

export const SHAPES = [
  { id: 'bar', label: 'Bar' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'pill', label: 'Pill' },
  { id: 'circle', label: 'Circle' },
  { id: 'hex', label: 'Hex' },
  { id: 'cube', label: 'Cube' },
  { id: 'none', label: 'Free cut' },
];

export const MATERIAL_IDS = ['acrylic', 'gloss', 'matte', 'rubber', 'metal'];
export const MATERIAL_LABELS = {
  acrylic: 'Clear acrylic',
  gloss: 'Glossy plastic',
  matte: 'Matte plastic',
  rubber: 'Soft rubber',
  metal: 'Anodized metal',
};

export const FONTS = [
  { id: 'inter', label: 'Inter Black', file: 'inter' },
  { id: 'bebas', label: 'Bebas Neue', file: 'bebas' },
  { id: 'fredoka', label: 'Fredoka', file: 'fredoka' },
  { id: 'silkscreen', label: 'Silkscreen', file: 'silkscreen' },
];

export const METALS = {
  steel: { color: '#dfe4ea', metalness: 1, roughness: 0.16 },
  gold: { color: '#e0b64a', metalness: 1, roughness: 0.2 },
  noir: { color: '#3d424d', metalness: 0.9, roughness: 0.3 },
  copper: { color: '#c9785a', metalness: 1, roughness: 0.22 },
};
export const METAL_IDS = Object.keys(METALS);

export const CARABINERS = {
  none: 'None',
  carabiner: 'Carabiner',
};

export const BACKGROUNDS = {
  sky: { label: 'Sky', top: '#4a7fb5', bottom: '#8fd0d8' },
  studio: { label: 'Studio', top: '#f4f4f2', bottom: '#cfd2d6' },
  dusk: { label: 'Dusk', top: '#2b2f4a', bottom: '#d98d7b' },
  dark: { label: 'Dark', top: '#16181d', bottom: '#2c3038' },
  clear: { label: 'Clear', top: null, bottom: null },
};

export const CHAIN_STEPS = [0, 1, 3, 5, 7]; // number of chain links for chain length 0..4
export const EXPORT_FORMATS = ['glb', 'gltf', 'obj', 'stl', 'ply', 'usdz', '3mf', 'blend'];

export const RING_YAW = (40 * Math.PI) / 180; // split ring turned towards the viewer
