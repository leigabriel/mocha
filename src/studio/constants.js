// 3D Studio constants. One scene unit is one metre in exports.

export const LIMITS = Object.freeze({ maxObjects: 300, nameLength: 40, svgBytes: 150_000, maxKeys: 60, maxArray: 40 });

export const PRIMITIVES = [
  { id: 'box', label: 'Cube', group: 'Mesh', icon: 'ThreeDCube', params: { w: 1, h: 1, d: 1, radius: 0.06 } },
  { id: 'sphere', label: 'Sphere', group: 'Mesh', icon: 'Planet', params: { radius: 0.5, seg: 48 } },
  { id: 'cylinder', label: 'Cylinder', group: 'Mesh', icon: 'Box', params: { rTop: 0.5, rBottom: 0.5, h: 1, seg: 48 } },
  { id: 'cone', label: 'Cone', group: 'Mesh', icon: 'Triangle', params: { rTop: 0, rBottom: 0.5, h: 1, seg: 48 } },
  { id: 'torus', label: 'Torus', group: 'Mesh', icon: 'Refresh', params: { radius: 0.5, tube: 0.18, seg: 64 } },
  { id: 'plane', label: 'Plane', group: 'Mesh', icon: 'Grid', params: { w: 2, h: 2 } },
  { id: 'capsule', label: 'Capsule', group: 'Mesh', icon: 'Lightning', params: { radius: 0.3, length: 0.8, seg: 24 } },
  { id: 'icosphere', label: 'Ico sphere', group: 'Mesh', icon: 'Atom', params: { radius: 0.5, detail: 1 } },
  { id: 'star', label: 'Star', group: 'Shape', icon: 'MagicStar', params: { points: 5, outer: 0.5, inner: 0.22, depth: 0.2, bevel: 0.03 } },
  { id: 'heart', label: 'Heart', group: 'Shape', icon: 'Heart', params: { size: 1, depth: 0.25, bevel: 0.05 } },
  { id: 'ring', label: 'Ring', group: 'Shape', icon: 'Target', params: { outer: 0.5, inner: 0.32, depth: 0.12, bevel: 0.02 } },
  { id: 'text', label: 'Text', group: 'Shape', icon: 'Text', params: { text: 'Mocha', font: 'inter', size: 0.5, depth: 0.15, bevel: 0.015 } },
  { id: 'svg', label: 'SVG extrude', group: 'Shape', icon: 'Shapes', params: { svg: '', size: 1, depth: 0.15, bevel: 0.01 } },
];
export const PRIMITIVE_IDS = PRIMITIVES.map((p) => p.id);
export const primitiveInfo = (id) => PRIMITIVES.find((p) => p.id === id);

export const LIGHTS = [
  { id: 'point', label: 'Point light', icon: 'Lightbulb', intensity: 60, distance: 0 },
  { id: 'spot', label: 'Spot light', icon: 'Lamp', intensity: 120, distance: 0 },
  { id: 'sun', label: 'Sun light', icon: 'Sun', intensity: 3, distance: 0 },
];
export const LIGHT_IDS = LIGHTS.map((l) => l.id);

export const OBJECT_TYPES = [...PRIMITIVE_IDS, ...LIGHT_IDS.map((l) => `light:${l}`), 'camera', 'group'];

export const MATERIAL_PRESETS = [
  { id: 'plastic', label: 'Plastic' },
  { id: 'clay', label: 'Clay' },
  { id: 'metal', label: 'Metal' },
  { id: 'chrome', label: 'Chrome' },
  { id: 'glass', label: 'Glass' },
  { id: 'frosted', label: 'Frosted' },
  { id: 'softtouch', label: 'Soft touch' },
  { id: 'emissive', label: 'Glow' },
];
export const MATERIAL_PRESET_IDS = MATERIAL_PRESETS.map((m) => m.id);

export const TOOLS = ['select', 'move', 'rotate', 'scale'];
export const SHADING = [
  { id: 'material', label: 'Material' },
  { id: 'solid', label: 'Solid' },
  { id: 'wire', label: 'Wireframe' },
];

export const BACKGROUNDS = {
  dark: { label: 'Dark', color: '#1b1c1f' },
  black: { label: 'Black', color: '#050506' },
  grey: { label: 'Grey', color: '#4a4d54' },
  light: { label: 'Light', color: '#e7e8ea' },
  cobalt: { label: 'Cobalt', color: '#0b3dff' },
};

export const EASINGS = ['linear', 'ease', 'ease-in', 'ease-out'];
export const FPS = 30;
export const SNAP = Object.freeze({ move: 0.25, rotate: 15, scale: 0.1 });
