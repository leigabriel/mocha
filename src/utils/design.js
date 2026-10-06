import { FINISHES, MAX_CHARMS, MAX_LINKS, MIN_LINKS, SPREAD_MAX, SPREAD_MIN } from '../constants/index.js';
import { clamp, extractFirstEmoji } from './helpers.js';

const STORAGE_KEY = 'mocha:design:v1';
const VERSION = 1;

export function defaultDesign() {
  return {
    finish: 'steel',
    spread: 1.0,
    bg: 'light',
    charms: [
      { emoji: '👾', thickness: 2, links: 4 },
      { emoji: '🥑', thickness: 2, links: 5 },
      { emoji: '🔥', thickness: 2, links: 4 },
    ],
  };
}

/** Validates untrusted input (URL hash, localStorage) into a safe design, or null. */
export function sanitizeDesign(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.c)) return null;

  const charms = [];
  for (const entry of raw.c) {
    if (charms.length >= MAX_CHARMS) break;
    if (!Array.isArray(entry)) continue;
    const [emojiRaw, thicknessRaw, linksRaw] = entry;
    const emoji = typeof emojiRaw === 'string' ? extractFirstEmoji(emojiRaw) : null;
    if (!emoji) continue;
    const thickness = [1, 2, 3].includes(thicknessRaw) ? thicknessRaw : 2;
    const links = clamp(Math.round(Number(linksRaw)) || MIN_LINKS, MIN_LINKS, MAX_LINKS);
    charms.push({ emoji, thickness, links });
  }
  if (charms.length === 0) return null;

  const spreadNum = Number(raw.s);
  return {
    charms,
    finish: FINISHES.includes(raw.f) ? raw.f : 'steel',
    spread: Number.isFinite(spreadNum) ? clamp(Math.round(spreadNum * 20) / 20, SPREAD_MIN, SPREAD_MAX) : 1.0,
    bg: raw.bg === 'dark' ? 'dark' : 'light',
  };
}

export function toCompact(design) {
  return {
    v: VERSION,
    f: design.finish,
    s: design.spread,
    bg: design.bg,
    c: design.charms.map((c) => [c.emoji, c.thickness, c.links]),
  };
}

export function serializeDesign(design) {
  return JSON.stringify(toCompact(design));
}

export function parseDesign(text) {
  try {
    return sanitizeDesign(JSON.parse(text));
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
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeDesign(design) {
  return toBase64Url(serializeDesign(design));
}

export function decodeDesign(encoded) {
  try {
    return parseDesign(fromBase64Url(encoded));
  } catch {
    return null;
  }
}

export function shareUrl(design, base = window.location) {
  return `${base.origin}${base.pathname}#d=${encodeDesign(design)}`;
}

export function readHashDesign(hash = window.location.hash) {
  const match = /^#d=([A-Za-z0-9_-]+)$/.exec(hash);
  return match ? decodeDesign(match[1]) : null;
}

export function writeHashDesign(design) {
  try {
    window.history.replaceState(null, '', `#d=${encodeDesign(design)}`);
  } catch {
    // history can be unavailable in sandboxed frames
  }
}

export function loadStoredDesign() {
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    return text ? parseDesign(text) : null;
  } catch {
    return null;
  }
}

export function saveStoredDesign(design) {
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeDesign(design));
  } catch {
    // storage may be full or blocked; persistence is best effort
  }
}
