import { clamp } from '../utils/helpers.js';
import {
  BACKGROUNDS,
  CHAIN_STEPS,
  FONTS,
  MATERIAL_IDS,
  METAL_IDS,
  SHAPES,
  TAG_LIMITS as L,
} from './constants.js';

const VERSION = 1;
const HEX = /^#[0-9a-f]{6}$/i;
const SHAPE_IDS = SHAPES.map((s) => s.id);

let uid = 0;
export const newId = () => `t${Date.now().toString(36)}${(uid++).toString(36)}`;

const color = (v, fallback) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fallback);
const num = (v, [lo, hi], fallback) => (Number.isFinite(Number(v)) ? clamp(Number(v), lo, hi) : fallback);
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);

export function defaultTag(overrides = {}) {
  return {
    id: newId(),
    shape: 'rounded',
    w: 30,
    h: 30,
    d: 4,
    r: 6,
    hole: true,
    color: '#f2f4f8',
    material: 'gloss',
    text: 'MOCHA',
    font: 'inter',
    textColor: '#0b3dff',
    textMaterial: 'gloss',
    textSize: 82,
    textDepth: 1,
    textRotate: 0,
    textSide: 'front',
    outline: 0,
    outlineColor: '#ff6a1a',
    outline2: 0,
    outline2Color: '#ffd4b8',
    svg: '',
    svgKeepColors: true,
    yaw: 0,
    ...overrides,
  };
}

export function defaultDesign() {
  return {
    v: VERSION,
    top: 'carabiner',
    carabinerColor: '#1f4fd8',
    gateColor: '#e8ecf2',
    sleeveColor: '#ff7a1a',
    metal: 'steel',
    keys: 2,
    chain: 2,
    bg: 'sky',
    tags: [
      defaultTag({
        shape: 'bar', w: 15, h: 62, d: 3, r: 2.5, material: 'acrylic', color: '#f4f6fa',
        text: 'SaaStanak', textColor: '#1c47c9', textRotate: -90, textSize: 92, textDepth: 1.1, yaw: 0,
      }),
      defaultTag({
        shape: 'cube', w: 12, h: 12, d: 9, r: 2.2, material: 'gloss', color: '#e8321e',
        text: 'abc', textColor: '#ffffff', textSize: 70, textDepth: 0.6, yaw: 12,
      }),
      defaultTag({
        shape: 'none', w: 26, h: 34, d: 3.2, material: 'gloss', color: '#ff7a2b',
        text: 'S', textColor: '#ff7a2b', textMaterial: 'gloss', textSize: 100, textDepth: 3.2, font: 'inter',
        outline: 1.4, outlineColor: '#e8591a', outline2: 1.4, outline2Color: '#ffb277', hole: true, yaw: -8,
      }),
    ],
  };
}

export function sanitizeTag(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const base = defaultTag();
  const svg = typeof raw.svg === 'string' && raw.svg.length <= L.svgBytes && /<svg[\s>]/i.test(raw.svg) ? raw.svg : '';
  return {
    id: typeof raw.id === 'string' && /^[\w-]{1,24}$/.test(raw.id) ? raw.id : newId(),
    shape: oneOf(raw.shape, SHAPE_IDS, base.shape),
    w: num(raw.w, L.w, base.w),
    h: num(raw.h, L.h, base.h),
    d: num(raw.d, L.d, base.d),
    r: num(raw.r, L.r, base.r),
    hole: raw.hole !== false,
    color: color(raw.color, base.color),
    material: oneOf(raw.material, MATERIAL_IDS, base.material),
    text: typeof raw.text === 'string' ? raw.text.slice(0, L.textLength) : '',
    font: typeof raw.font === 'string' && (FONTS.some((f) => f.id === raw.font) || /^custom-\w{1,12}$/.test(raw.font)) ? raw.font : base.font,
    textColor: color(raw.textColor, base.textColor),
    textMaterial: oneOf(raw.textMaterial, MATERIAL_IDS, base.textMaterial),
    textSize: num(raw.textSize, L.textSize, base.textSize),
    textDepth: num(raw.textDepth, L.textDepth, base.textDepth),
    textRotate: oneOf(Number(raw.textRotate), [0, 90, -90], 0),
    textSide: oneOf(raw.textSide, ['front', 'both'], 'front'),
    outline: num(raw.outline, L.outline, 0),
    outlineColor: color(raw.outlineColor, base.outlineColor),
    outline2: num(raw.outline2, L.outline, 0),
    outline2Color: color(raw.outline2Color, base.outline2Color),
    svg,
    svgKeepColors: raw.svgKeepColors !== false,
    yaw: num(raw.yaw, [-45, 45], 0),
  };
}

/** Validates untrusted input (URL hash, localStorage) into a safe design, or null. */
export function sanitizeTagDesign(raw) {
  if (!raw || typeof raw !== 'object' || raw.v !== VERSION || !Array.isArray(raw.tags)) return null;
  const tags = raw.tags.map(sanitizeTag).filter(Boolean).slice(0, L.maxTags);
  if (!tags.length) return null;
  const seen = new Set();
  tags.forEach((t) => {
    while (seen.has(t.id)) t.id = newId();
    seen.add(t.id);
  });
  return {
    v: VERSION,
    top: oneOf(raw.top, ['carabiner', 'none'], 'carabiner'),
    carabinerColor: color(raw.carabinerColor, '#1f4fd8'),
    gateColor: color(raw.gateColor, '#e8ecf2'),
    sleeveColor: color(raw.sleeveColor, '#ff7a1a'),
    metal: oneOf(raw.metal, METAL_IDS, 'steel'),
    keys: Math.round(num(raw.keys, [0, 3], 2)),
    chain: Math.round(num(raw.chain, [0, CHAIN_STEPS.length - 1], 1)),
    bg: oneOf(raw.bg, Object.keys(BACKGROUNDS), 'sky'),
    tags,
  };
}

export const serializeTagDesign = (d) => JSON.stringify(d);

export function parseTagDesign(text) {
  try {
    return sanitizeTagDesign(JSON.parse(text));
  } catch {
    return null;
  }
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export const encodeTagDesign = (d) => toBase64Url(serializeTagDesign(d));
export function decodeTagDesign(encoded) {
  try {
    return parseTagDesign(fromBase64Url(encoded));
  } catch {
    return null;
  }
}

export const tagShareUrl = (design, base = window.location) => `${base.origin}${base.pathname}#t=${encodeTagDesign(design)}`;

export function readHashTagDesign(hash = window.location.hash) {
  const match = /^#t=([A-Za-z0-9_-]+)$/.exec(hash);
  return match ? decodeTagDesign(match[1]) : null;
}
