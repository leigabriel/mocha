import { ICONS } from './draw.js';
import { FONTS } from './fonts.js';
import { SHAPE_TYPES, PIXEL_NAMES } from './shapes.js';
import { TEMPLATE_NAMES } from './templates.js';

export const ROLES = ['ink', 'paper', 'a1', 'a2', 'a3', 'a4'];
export const ROLE_LABELS = { ink: 'Ink', paper: 'Paper', a1: 'Accent 1', a2: 'Accent 2', a3: 'Accent 3', a4: 'Accent 4' };
export const FINISHES = {
  gloss: { label: 'Gloss', note: 'Glossy laminate.' },
  matte: { label: 'Matte', note: 'Soft matte vinyl.' },
  holo: { label: 'Holo', note: 'Rainbow iridescent film.' },
  foil: { label: 'Foil', note: 'Brushed metallic foil.' },
};
export const BORDER_MODES = {
  solid: { label: 'Solid' },
  double: { label: 'Double' },
  none: { label: 'None' },
};

export const PRESETS = {
  zine: { name: 'Zine', palette: { ink: '#111111', paper: '#f6f2e7', a1: '#ff4f9a', a2: '#c6f23a', a3: '#2f66ff', a4: '#ff7a1a' }, font: 'display', border: { width: 0.3, color: '#ffffff', mode: 'solid' }, finish: 'gloss' },
  pastel: { name: 'Pastel', palette: { ink: '#3b3350', paper: '#fff8ef', a1: '#ffb3c7', a2: '#c9f0d4', a3: '#b7c8ff', a4: '#ffd9a0' }, font: 'rounded', border: { width: 0.32, color: '#ffffff', mode: 'solid' }, finish: 'matte' },
  mono: { name: 'Mono', palette: { ink: '#0d0d0d', paper: '#f2f2f2', a1: '#8a8a8a', a2: '#cfcfcf', a3: '#4a4a4a', a4: '#ffffff' }, font: 'sans', border: { width: 0.25, color: '#ffffff', mode: 'double' }, finish: 'matte' },
  neon: { name: 'Neon', palette: { ink: '#0b0b17', paper: '#f4f0ff', a1: '#ff2bd6', a2: '#27ffb0', a3: '#3d5bff', a4: '#fff23a' }, font: 'sans', border: { width: 0.28, color: '#ffffff', mode: 'solid' }, finish: 'holo' },
  kraft: { name: 'Kraft', palette: { ink: '#2b1d12', paper: '#ecdcc0', a1: '#c4482f', a2: '#8fa860', a3: '#3b6a7a', a4: '#d9a441' }, font: 'mono', border: { width: 0.3, color: '#f3e8d0', mode: 'double' }, finish: 'matte' },
  sunset: { name: 'Sunset', palette: { ink: '#2a1230', paper: '#fff1e0', a1: '#ff5d73', a2: '#ffc857', a3: '#7a4cff', a4: '#ff8a3d' }, font: 'rounded', border: { width: 0.3, color: '#fff8f0', mode: 'solid' }, finish: 'gloss' },
};

export const DEFAULT_STYLE = {
  ...PRESETS.zine,
  name: 'My pack',
  thickness: 0.06,
  softness: 1,
  cord: true,
  cordColor: '#111111',
  grain: 0.15,
};

const HEX = /^#[0-9a-f]{6}$/i;
const num = (v, lo, hi, d) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : d);
const hex = (v, d) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : d);
const str = (v, max, d = '') => (typeof v === 'string' ? [...v].filter((ch) => ch.charCodeAt(0) >= 32 || ch === '\n').join('').slice(0, max) : d);

/** Accepts anything (e.g. an imported file) and returns a complete, in-range pack style. */
export function sanitizeStyle(raw = {}) {
  const b = DEFAULT_STYLE;
  const r = raw && typeof raw === 'object' ? raw : {};
  const pal = {};
  for (const k of ROLES) pal[k] = hex(r.palette?.[k], b.palette[k]);
  return {
    name: str(r.name, 40, b.name) || b.name,
    palette: pal,
    font: FONTS[r.font] ? r.font : b.font,
    border: {
      width: num(r.border?.width, 0, 0.8, b.border.width),
      color: hex(r.border?.color, b.border.color),
      mode: BORDER_MODES[r.border?.mode] ? r.border.mode : b.border.mode,
    },
    finish: FINISHES[r.finish] ? r.finish : b.finish,
    thickness: num(r.thickness, 0.02, 0.3, b.thickness),
    softness: Math.round(num(r.softness, 0, 3, b.softness)),
    cord: r.cord === undefined ? b.cord : !!r.cord,
    cordColor: hex(r.cordColor, b.cordColor),
    grain: num(r.grain, 0, 0.6, b.grain),
  };
}

/** What the artwork templates see: colour lookup by role or hex, plus the headline font. */
export function resolveStyle(style) {
  const pal = style.palette;
  return {
    pal,
    main: style.font,
    c: (v) => (typeof v === 'string' && v.startsWith('#') ? v : pal[v] ?? pal.ink),
  };
}

// ------------------------------------------------------------------ custom stickers

export const CUSTOM_SHAPES = ['rect', 'pill', 'circle', 'oval', 'badge', 'seal', 'flower', 'clover', 'blob', 'cloud', 'bubble', 'tag', 'fob', 'loop', 'triangle', 'diamond', 'hex', 'shield', 'aframe', 'ticket', 'dogear', 'wavy', 'leaf', 'tear', 'bone', 'bean', 'burst', 'pixel'].filter((t) => SHAPE_TYPES.includes(t));
export const CUSTOM_TEMPLATES = ['typo', 'badge', 'label', 'sign', 'tag', 'pixel', 'icon'].filter((t) => TEMPLATE_NAMES.includes(t));
const DECOS = ['none', 'dots', 'halftone', 'stripes', 'waves', 'rainbow'];
export const CUSTOM_DECOS = DECOS;
export const CUSTOM_ICONS = ICONS;

export const NEW_CUSTOM = {
  name: 'My sticker',
  shape: 'cloud',
  w: 7,
  h: 5.5,
  tpl: 'typo',
  bg: 'a1',
  fg: 'ink',
  title: 'HELLO\nWORLD',
  sub: 'MADE WITH MOCHA',
  icon: 'star',
  deco: 'dots',
  code: 'none',
  cord: false,
  pixel: 'heart',
};

let counter = 0;
export function sanitizeCustom(raw = {}) {
  const d = NEW_CUSTOM;
  const r = raw && typeof raw === 'object' ? raw : {};
  const role = (v, dflt) => (ROLES.includes(v) ? v : hex(v, null) ?? dflt);
  return {
    id: /^custom-[a-z0-9]{3,12}$/.test(r.id) ? r.id : `custom-${Date.now().toString(36)}${(counter++).toString(36)}`,
    name: str(r.name, 40, d.name) || d.name,
    shape: CUSTOM_SHAPES.includes(r.shape) ? r.shape : d.shape,
    w: num(r.w, 2.5, 14, d.w),
    h: num(r.h, 2.5, 14, d.h),
    tpl: CUSTOM_TEMPLATES.includes(r.tpl) ? r.tpl : d.tpl,
    bg: role(r.bg, d.bg),
    fg: role(r.fg, d.fg),
    title: str(r.title, 60, d.title),
    sub: str(r.sub, 60, d.sub),
    icon: ICONS.includes(r.icon) ? r.icon : d.icon,
    deco: DECOS.includes(r.deco) ? r.deco : d.deco,
    code: ['none', 'qr', 'bar'].includes(r.code) ? r.code : d.code,
    cord: !!r.cord,
    pixel: PIXEL_NAMES.includes(r.pixel) ? r.pixel : d.pixel,
  };
}

/** Turns a custom-sticker record into a library-style definition. */
export function customToDef(c) {
  const lines = c.title.split('\n').map((s) => s.trim()).filter(Boolean);
  const deco = c.deco === 'none' ? undefined : c.deco;
  const base = { bg: c.bg, fg: c.fg, deco, decoColor: c.fg };
  const shape = { type: c.shape, w: c.w, h: c.h, art: c.pixel };
  let p;
  switch (c.tpl) {
    case 'badge': p = { ...base, ring: `${lines.join(' ')} · `.toUpperCase().repeat(2), icon: c.icon, iconColor: c.fg === 'ink' ? 'a1' : c.fg, sub: c.sub }; break;
    case 'label': p = { ...base, title: lines[0] ?? '', lines: [...lines.slice(1), c.sub].filter(Boolean), code: c.code }; break;
    case 'sign': p = { ...base, icon: c.icon, cap: lines[0] ?? '', small: c.sub }; break;
    case 'tag': p = { ...base, title: lines[0] ?? '', lines: [...lines.slice(1), c.sub].filter(Boolean), code: c.code }; break;
    case 'pixel': p = { ...base, text: lines[0] ?? '' }; break;
    case 'icon': p = { ...base, icon: c.icon, lines, iconColor: c.fg }; break;
    default: p = { ...base, lines, cap: c.sub, icon: c.icon === 'star' ? undefined : c.icon, iconColor: c.fg === 'ink' ? 'paper' : 'ink' };
  }
  return { id: c.id, name: c.name, group: 'mine', shape, tpl: c.tpl, p, cord: c.cord, custom: true };
}

// ------------------------------------------------------------------ packs

export const PACK_FORMAT = 'mocha-sticker-pack';

export function makePack(style, customs) {
  return { format: PACK_FORMAT, version: 1, style: sanitizeStyle(style), stickers: customs.map(sanitizeCustom) };
}

export function parsePack(text) {
  const data = JSON.parse(text);
  if (!data || data.format !== PACK_FORMAT) throw new Error('Not a Mocha sticker pack');
  return { style: sanitizeStyle(data.style), stickers: (Array.isArray(data.stickers) ? data.stickers : []).slice(0, 60).map(sanitizeCustom) };
}
