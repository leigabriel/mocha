import { clamp } from '../utils/helpers.js';
import { BACKDROPS, HEADER_FONT_IDS, LOOK_IDS, PACK, PACK_LIMITS as L, SHAPE_IDS, STAMP_SHAPES } from './constants.js';

const HEX = /^#[0-9a-f]{6}$/i;
const color = (v, fallback) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fallback);
const num = (v, [lo, hi], fallback) => (Number.isFinite(Number(v)) ? clamp(Number(v), lo, hi) : fallback);
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);
const text = (v, max, fallback = '') => (typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').slice(0, max) : fallback);

let uid = 0;
export const newId = (p = 's') => `${p}${Date.now().toString(36)}${(uid++).toString(36)}`;

export const shapeInfo = (id) => STAMP_SHAPES.find((s) => s.id === id) ?? STAMP_SHAPES[0];

/** Small deterministic generator, so "Shuffle" is reproducible from the seed. */
export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function defaultStamp(overrides = {}) {
  return {
    id: newId(),
    imageId: '',
    shape: 'portrait',
    scale: 1,
    rot: 0,
    x: 0,
    y: 0,
    border: 2.4,
    pitch: 3,
    look: 'original',
    ink: '#d92f4e',
    zoom: 1,
    panX: 0,
    panY: 0,
    caption: '',
    ...overrides,
  };
}

export function defaultCard() {
  return {
    show: true,
    line1: 'ACME ATHLETICS, INC.',
    line2: 'POSTAGE STAMP COLLECTION',
    line3: 'CREATED BY YOUR NAME',
    font: 'mono',
    ink: '#d92f4e',
    paper: '#e6e7e9',
    hole: true,
    logoId: '',
    iconId: '',
  };
}

export function defaultDesign() {
  return {
    v: 1,
    seed: 7,
    paper: '#f8f5ee',
    bag: true,
    backdrop: 'black',
    card: defaultCard(),
    stamps: [],
  };
}

export function sanitizeStamp(raw = {}) {
  const d = defaultStamp();
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 40) : d.id,
    imageId: text(raw.imageId, 40),
    shape: oneOf(raw.shape, SHAPE_IDS, d.shape),
    scale: num(raw.scale, L.scale, 1),
    rot: num(raw.rot, [-180, 180], 0),
    x: num(raw.x, [-PACK.W / 2, PACK.W / 2], 0),
    y: num(raw.y, [PACK.bagY0, PACK.bagY1], 0),
    border: num(raw.border, L.border, d.border),
    pitch: num(raw.pitch, L.pitch, d.pitch),
    look: oneOf(raw.look, LOOK_IDS, 'original'),
    ink: color(raw.ink, d.ink),
    zoom: num(raw.zoom, L.zoom, 1),
    panX: num(raw.panX, [-1, 1], 0),
    panY: num(raw.panY, [-1, 1], 0),
    caption: text(raw.caption, L.captionLength),
  };
}

export function sanitizeCard(raw = {}) {
  const d = defaultCard();
  return {
    show: raw.show !== false,
    line1: text(raw.line1, L.lineLength, d.line1),
    line2: text(raw.line2, L.lineLength, d.line2),
    line3: text(raw.line3, L.lineLength, d.line3),
    font: oneOf(raw.font, HEADER_FONT_IDS, d.font),
    ink: color(raw.ink, d.ink),
    paper: color(raw.paper, d.paper),
    hole: raw.hole !== false,
    logoId: text(raw.logoId, 40),
    iconId: text(raw.iconId, 40),
  };
}

export function sanitizeDesign(raw = {}) {
  const d = defaultDesign();
  const seen = new Set();
  const stamps = (Array.isArray(raw.stamps) ? raw.stamps : [])
    .slice(0, L.maxStamps)
    .map(sanitizeStamp)
    .filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  return {
    v: 1,
    seed: Math.round(num(raw.seed, [1, 999999], d.seed)),
    paper: color(raw.paper, d.paper),
    bag: raw.bag !== false,
    backdrop: oneOf(raw.backdrop, Object.keys(BACKDROPS), d.backdrop),
    card: sanitizeCard(raw.card),
    stamps,
  };
}

/** Only the look-and-feel is saved between visits; uploaded pictures stay in the browser session. */
export function serializeSettings(design) {
  const { card, paper, bag, backdrop, seed } = design;
  return JSON.stringify({ v: 1, seed, paper, bag, backdrop, card: { ...card, logoId: '', iconId: '' } });
}

export function parseSettings(textValue) {
  try {
    const raw = JSON.parse(textValue);
    return raw && typeof raw === 'object' ? sanitizeDesign({ ...raw, stamps: [] }) : null;
  } catch {
    return null;
  }
}

/**
 * Loosely scatters the stamps over the pack: a jittered grid, random tilt, shuffled
 * order. Deterministic for a given seed. Returns new stamps with x, y, rot, scale set.
 */
export function scatter(stamps, seed) {
  const n = stamps.length;
  if (!n) return stamps;
  const rand = rng(seed * 7919 + n);
  const { x: ax, y0, y1 } = PACK.area;
  const W = ax * 2;
  const H = y1 - y0;
  const cols = Math.max(1, Math.ceil(Math.sqrt((n * W) / H)));
  const rows = Math.ceil(n / cols);
  const cw = W / cols;
  const ch = H / rows;
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([c, r]);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return stamps.map((s, i) => {
    const [c, r] = cells[i];
    const info = shapeInfo(s.shape);
    const fit = clamp((Math.min(cw / info.w, ch / info.h) * 1.35), 0.55, 1.15);
    const x = -ax + cw * (c + 0.5) + (rand() - 0.5) * cw * 0.35;
    const y = y1 - ch * (r + 0.5) + (rand() - 0.5) * ch * 0.35;
    const tilt = (6 + rand() * 18) * (rand() < 0.5 ? -1 : 1);
    return sanitizeStamp({ ...s, x, y, rot: tilt, scale: fit });
  });
}
