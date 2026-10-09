import { clamp } from '../utils/helpers.js';
import {
  BACKDROP_IDS,
  CHARM_STYLES,
  CLASP_IDS,
  LIGHTING_IDS,
  MATERIAL_IDS,
  METAL_IDS,
  SET_LIMITS as L,
  SILHOUETTE_IDS,
  STYLE_IDS,
  TEXT_MODE_IDS,
} from './constants.js';
import { FONTS } from '../tagbuilder/constants.js';

const VERSION = 1;
const HEX = /^#[0-9a-f]{6}$/i;
const FONT_IDS = FONTS.map((f) => f.id);

let uid = 0;
export const newId = () => `c${Date.now().toString(36)}${(uid++).toString(36)}`;

const color = (v, fallback) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fallback);
const num = (v, [lo, hi], fallback) => (Number.isFinite(Number(v)) ? clamp(Number(v), lo, hi) : fallback);
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);
const text = (v, fallback, max = L.textLength) => (typeof v === 'string' ? v.slice(0, max) : fallback);
export const styleInfo = (id) => CHARM_STYLES.find((s) => s.id === id) ?? CHARM_STYLES[0];

export function defaultCharm(overrides = {}) {
  const style = overrides.style ?? 'motel';
  const info = styleInfo(style);
  return {
    id: newId(),
    style,
    w: info.w,
    h: info.h,
    d: info.d,
    r: 6,
    color: '#f2f3f5',
    material: 'gloss',
    title: '',
    sub: '',
    num: '',
    font: 'inter',
    textColor: '#111111',
    textMode: 'raised',
    textMaterial: 'gloss',
    textSize: 82,
    textDepth: 0.8,
    textRotate: 'auto',
    ribs: 0,
    ruler: false,
    silhouette: 'cat',
    svg: '',
    chain: 0,
    yaw: 0,
    ...overrides,
  };
}

/** The reference set: glass loop, yellow triangle, motel tag, clear ribbed bar, soft bar, cat. */
export function defaultDesign() {
  return {
    v: VERSION,
    clasp: 'glass',
    glassTint: '#dbe9ee',
    metal: 'chrome',
    backdrop: 'black',
    lighting: 'studio',
    charms: [
      defaultCharm({
        style: 'triangle', w: 56, h: 50, d: 3.4, r: 5, material: 'glass', color: '#f4e400',
        title: 'motion', sub: 'wildy riftian', num: '01', textColor: '#ffffff', textMaterial: 'gloss', textSize: 70, ruler: true, chain: 0, yaw: -10,
      }),
      defaultCharm({
        style: 'motel', w: 33, h: 62, d: 3.2, material: 'gloss', color: '#f1f2f4',
        title: 'Branding', sub: 'brand works', num: '02', textColor: '#111111', ribs: 3, chain: 1, yaw: 6,
      }),
      defaultCharm({
        style: 'ribbed', w: 22, h: 82, d: 4.2, material: 'frost', color: '#dfe9ef',
        title: 'Editorial', num: '03', textColor: '#f5f9fb', textMaterial: 'frost', textDepth: 1.1, ribs: 4, ruler: true, chain: 2, yaw: -4,
      }),
      defaultCharm({
        style: 'bar', w: 22, h: 84, d: 3.6, material: 'soft', color: '#e6e8ea',
        title: 'Photo', textColor: '#e6e8ea', textMaterial: 'soft', textDepth: 1.3, textSize: 90, chain: 1, yaw: 8,
      }),
      defaultCharm({
        style: 'silhouette', silhouette: 'cat', w: 44, h: 40, d: 6, material: 'soft', color: '#f4e21a', chain: 0, yaw: -6,
      }),
    ],
  };
}

export function sanitizeCharm(raw) {
  const base = defaultCharm({ id: typeof raw?.id === 'string' && raw.id ? raw.id.slice(0, 40) : newId(), style: oneOf(raw?.style, STYLE_IDS, 'motel') });
  const r = raw ?? {};
  return {
    id: base.id,
    style: base.style,
    w: num(r.w, L.w, base.w),
    h: num(r.h, L.h, base.h),
    d: num(r.d, L.d, base.d),
    r: num(r.r, L.r, base.r),
    color: color(r.color, base.color),
    material: oneOf(r.material, MATERIAL_IDS, base.material),
    title: text(r.title, base.title),
    sub: text(r.sub, base.sub),
    num: text(r.num, base.num, 8),
    font: oneOf(r.font, FONT_IDS, base.font),
    textColor: color(r.textColor, base.textColor),
    textMode: oneOf(r.textMode, TEXT_MODE_IDS, base.textMode),
    textMaterial: oneOf(r.textMaterial, MATERIAL_IDS, base.textMaterial),
    textSize: num(r.textSize, L.textSize, base.textSize),
    textDepth: num(r.textDepth, L.textDepth, base.textDepth),
    textRotate: oneOf(String(r.textRotate), ['auto', '0', '90', '-90'], 'auto'),
    ribs: Math.round(num(r.ribs, L.ribs, base.ribs)),
    ruler: r.ruler === true,
    silhouette: oneOf(r.silhouette, SILHOUETTE_IDS, base.silhouette),
    svg: typeof r.svg === 'string' && r.svg.length <= L.svgBytes ? r.svg : '',
    chain: Math.round(num(r.chain, L.chain, base.chain)),
    yaw: num(r.yaw, [-45, 45], 0),
  };
}

export function sanitizeDesign(raw) {
  const d = defaultDesign();
  const r = raw ?? {};
  const charms = Array.isArray(r.charms) ? r.charms.slice(0, L.maxCharms).map(sanitizeCharm) : d.charms;
  return {
    v: VERSION,
    clasp: oneOf(r.clasp, CLASP_IDS, d.clasp),
    glassTint: color(r.glassTint, d.glassTint),
    metal: oneOf(r.metal, METAL_IDS, d.metal),
    backdrop: oneOf(r.backdrop, BACKDROP_IDS, d.backdrop),
    lighting: oneOf(r.lighting, LIGHTING_IDS, d.lighting),
    charms,
  };
}

export const serializeDesign = (d) => JSON.stringify(d);

export function parseDesign(textValue) {
  if (typeof textValue !== 'string' || !textValue) return null;
  try {
    return sanitizeDesign(JSON.parse(textValue));
  } catch {
    return null;
  }
}

// ------------------------------------------------------------- generator

const PALETTES = [
  { body: ['#f4e400', '#ffffff', '#111111'], accent: '#ffffff' },
  { body: ['#ff5a36', '#f6efe6', '#1b2a49'], accent: '#ffffff' },
  { body: ['#7ad0ff', '#ffffff', '#102a43'], accent: '#0b3dff' },
  { body: ['#b6f26b', '#f4f4f0', '#1d2a14'], accent: '#111111' },
  { body: ['#ff8fc7', '#fff2f8', '#40102b'], accent: '#ffffff' },
  { body: ['#c9b6ff', '#f1ecff', '#241a45'], accent: '#ffffff' },
];
const WORDS = ['motion', 'Branding', 'Editorial', 'Photo', 'Studio', 'Atlas', 'Pixel', 'Archive', 'Grid', 'Signal', 'Type', 'Moodboard', 'Print', 'Layout'];
const SUBS = ['brand works', 'visual works', 'collection', 'issue', 'selected', 'edition'];

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh random set. Deterministic for a seed, always passes `sanitizeDesign`. */
export function generateDesign(seed = Date.now()) {
  const rnd = mulberry(seed);
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const pal = pick(PALETTES);
  const count = 3 + Math.floor(rnd() * 3);
  const styles = ['triangle', 'motel', 'ribbed', 'bar', 'silhouette', 'circle'];
  const used = [];
  const charms = [];
  for (let i = 0; i < count; i++) {
    let style = pick(styles);
    for (let tries = 0; tries < 6 && used.includes(style); tries++) style = pick(styles);
    used.push(style);
    const body = pick(pal.body);
    const dark = body === pal.body[2];
    const clear = style === 'triangle' || style === 'ribbed' || style === 'circle';
    charms.push(
      defaultCharm({
        style,
        material: style === 'silhouette' ? 'soft' : clear && !dark ? pick(['glass', 'frost']) : pick(['gloss', 'soft', 'matte']),
        color: body,
        textColor: dark ? '#ffffff' : pick([pal.accent, '#111111']),
        title: style === 'silhouette' ? '' : pick(WORDS),
        sub: pick(SUBS),
        num: `0${i + 1}`,
        ribs: style === 'motel' ? 3 : style === 'ribbed' ? 4 : 0,
        ruler: clear && rnd() > 0.4,
        silhouette: pick(['cat', 'heart', 'star', 'bolt', 'cloud']),
        chain: [0, 1, 2, 1, 0, 1][i],
        yaw: Math.round((rnd() - 0.5) * 24),
      })
    );
  }
  return sanitizeDesign({
    ...defaultDesign(),
    clasp: pick(['glass', 'glass', 'chrome']),
    glassTint: pick(['#dbe9ee', '#e4f1ff', '#f3e9d8']),
    metal: pick(['chrome', 'chrome', 'steel', 'gold']),
    charms,
  });
}
