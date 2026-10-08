// Stamp Pack constants. Every length is in millimetres.

export const PACK_LIMITS = Object.freeze({
  maxStamps: 12,
  maxBytes: 10 * 1024 * 1024,
  texMax: 2048, // long side of a decoded image, in pixels
  scale: [0.5, 1.8],
  border: [0.6, 6],
  pitch: [1.8, 4.5],
  zoom: [1, 4],
  captionLength: 40,
  lineLength: 44,
});

export const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp,image/svg+xml,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp,.svg';
export const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i;

export const STAMP_SHAPES = [
  { id: 'portrait', label: 'Portrait', w: 38, h: 48 },
  { id: 'landscape', label: 'Landscape', w: 50, h: 38 },
  { id: 'square', label: 'Square', w: 42, h: 42 },
  { id: 'circle', label: 'Circle', w: 44, h: 44 },
  { id: 'wedge', label: 'Wedge', w: 58, h: 46 },
];
export const SHAPE_IDS = STAMP_SHAPES.map((s) => s.id);

export const LOOKS = [
  { id: 'original', label: 'Original' },
  { id: 'halftone', label: 'Halftone' },
  { id: 'duotone', label: 'Duotone' },
  { id: 'mono', label: 'Mono' },
];
export const LOOK_IDS = LOOKS.map((l) => l.id);

export const HEADER_FONTS = [
  { id: 'mono', label: 'Mono', css: '"SF Mono", ui-monospace, Menlo, Consolas, "Liberation Mono", "Courier New", monospace', weight: 700 },
  { id: 'serif', label: 'Serif', css: 'Georgia, "Times New Roman", "Liberation Serif", serif', weight: 700 },
  { id: 'sans', label: 'Sans', css: '"Helvetica Neue", Arial, "Liberation Sans", sans-serif', weight: 800 },
];
export const HEADER_FONT_IDS = HEADER_FONTS.map((f) => f.id);

export const BACKDROPS = {
  black: { label: 'Black', top: '#0a0a0b', bottom: '#0a0a0b' },
  charcoal: { label: 'Charcoal', top: '#2a2c31', bottom: '#15161a' },
  paper: { label: 'Paper', top: '#f1efe9', bottom: '#d9d6cd' },
  sage: { label: 'Sage', top: '#a9bba6', bottom: '#7e9680' },
  sky: { label: 'Sky', top: '#4a7fb5', bottom: '#8fd0d8' },
  clear: { label: 'Clear', top: null, bottom: null },
};

// Pack layout (mm). The card hangs above the bag; stamps lie between the bag sheets.
export const PACK = Object.freeze({
  W: 148,
  bagY0: -88,
  bagY1: 62,
  cardW: 150,
  cardH: 30,
  cardCy: 76,
  area: { x: 60, y0: -78, y1: 48 }, // where stamps may sit (centres)
  paperT: 0.2,
  zStep: 0.34,
});

export const FPS = 30;
