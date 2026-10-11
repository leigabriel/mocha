import { barcode, disc, dots, fill, halftone, icon, qr, ringText, rrect, stack, stripes, text, waves } from './draw.js';

/**
 * Artwork templates. Each draws into a canvas whose (0, 0) is the top-left of the sticker's nominal
 * box (W x H pixels); anything beyond the box is still clipped to the die-cut. `S` carries the
 * resolved pack style: S.c(role|hex) -> colour, S.main -> headline font key.
 */

const lines = (v) => (Array.isArray(v) ? v : String(v ?? '').split('\n').filter(Boolean));

function deco(g, kind, x, y, w, h, S, color, alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  const u = Math.min(w, h);
  if (kind === 'dots') dots(g, x, y, w, h, u * 0.07, color, u * 0.012);
  else if (kind === 'halftone') halftone(g, x, y, w, h, u * 0.05, color, (a, b) => 1.1 - b * 1.3);
  else if (kind === 'stripes') stripes(g, x, y, w, h, [color, 'rgba(0,0,0,0)'], { angle: -0.6, size: u * 0.05 });
  else if (kind === 'waves') waves(g, x, y, w, h, color, { amp: u * 0.025, len: u * 0.16, lw: u * 0.012, gap: u * 0.06 });
  else if (kind === 'rainbow') stripes(g, x, y, w, h, [S.c('a1'), S.c('paper'), S.c('a3'), S.c('paper')], { angle: -0.5, size: u * 0.07 });
  g.restore();
}

export const TEMPLATES = {
  /** Round seal: ring text around a centre pictogram or word. */
  badge(g, W, H, S, p) {
    const u = Math.min(W, H);
    const cx = W / 2;
    const cy = H / 2;
    const bg = S.c(p.bg ?? 'paper');
    const fg = S.c(p.fg ?? 'ink');
    disc(g, cx, cy, u * 0.75, bg);
    deco(g, p.deco, 0, 0, W, H, S, S.c(p.decoColor ?? 'a1'), 0.35);
    disc(g, cx, cy, u * 0.46, null, fg, u * 0.012);
    if (p.rim) disc(g, cx, cy, u * 0.485, null, S.c(p.rim), u * 0.03);
    ringText(g, p.ring ?? '', cx, cy, u * 0.385, { size: u * 0.11, font: p.ringFont ?? S.main, color: fg, spacing: u * 0.012 });
    if (p.ring2) ringText(g, p.ring2, cx, cy, u * 0.385, { size: u * 0.085, font: 'mono', color: fg, start: Math.PI / 2, inside: true, span: Math.PI * 1.1, spacing: u * 0.01 });
    const inner = u * 0.5;
    if (p.icon) icon(g, p.icon, cx, cy - (p.text ? u * 0.05 : 0), p.text ? u * 0.28 : u * 0.34, S.c(p.iconColor ?? 'a1'), S.c(p.iconColor2 ?? bg));
    if (p.text) text(g, p.text, cx, cy + (p.icon ? u * 0.17 : 0), { size: u * (p.icon ? 0.1 : 0.2), font: S.main, color: fg, maxW: inner * 0.95 });
    if (p.cjk) text(g, p.cjk, cx, cy + u * 0.02, { size: u * 0.3, font: 'sans', color: S.c(p.cjkColor ?? 'a1'), maxW: inner });
    if (p.sub) text(g, p.sub, cx, cy + u * 0.3, { size: u * 0.05, font: 'mono', color: fg, maxW: inner * 0.8 });
  },

  /** Big stacked words on a colour field. */
  typo(g, W, H, S, p) {
    const u = Math.min(W, H);
    const bg = S.c(p.bg ?? 'a1');
    const fg = S.c(p.fg ?? 'ink');
    fill(g, bg, -W, -H, W * 3, H * 3);
    deco(g, p.deco, 0, 0, W, H, S, S.c(p.decoColor ?? 'paper'), p.decoAlpha ?? 0.5);
    const top = p.icon ? H * 0.44 : H * 0.2;
    const bottom = p.cap || p.cjk ? H * 0.74 : H * 0.8;
    if (p.icon) icon(g, p.icon, W / 2, H * 0.27, u * 0.36, S.c(p.iconColor ?? 'paper'), S.c(p.iconColor2 ?? 'ink'));
    const L = lines(p.lines);
    stack(g, L, W * 0.2, top, W * 0.6, bottom - top, { font: p.font ?? S.main, color: fg, gap: 0.04, stroke: p.outline ? S.c(p.outline) : null, strokeW: u * 0.03 });
    if (p.cap) text(g, p.cap, W / 2, H * 0.84, { size: u * 0.06, font: 'mono', color: fg, maxW: W * 0.6 });
    if (p.cjk) text(g, p.cjk, W / 2, H * 0.84, { size: u * 0.12, font: 'sans', color: S.c(p.cjkColor ?? 'paper'), maxW: W * 0.6 });
  },

  /** Paper label with a title band, small print and a code. */
  label(g, W, H, S, p) {
    const u = Math.min(W, H);
    const bg = S.c(p.bg ?? 'paper');
    const fg = S.c(p.fg ?? 'ink');
    fill(g, bg, -W, -H, W * 3, H * 3);
    const pad = u * 0.07;
    const band = S.c(p.band ?? 'ink');
    const bandH = H * (p.bandH ?? 0.3);
    fill(g, band, 0, 0, W, bandH);
    const bandFg = S.c(p.bandFg ?? 'paper');
    text(g, p.title ?? '', W / 2, bandH * 0.52, { size: bandH * 0.78, font: p.titleFont ?? S.main, color: bandFg, maxW: W - pad * 2 });
    if (p.cjk) text(g, p.cjk, W * 0.5, bandH + H * 0.12, { size: H * 0.16, font: 'sans', color: fg, maxW: W - pad * 2 });
    const L = lines(p.lines);
    L.forEach((l, i) => text(g, l, pad, bandH + H * (p.cjk ? 0.26 : 0.1) + i * H * 0.075, { size: H * 0.055, font: 'mono', color: fg, align: 'left', maxW: W * 0.62 }));
    if (p.code === 'qr') qr(g, W - pad - u * 0.3, H - pad - u * 0.3, u * 0.3, p.seed ?? 5, fg, bg);
    else if (p.code === 'bar') barcode(g, pad, H - pad - H * 0.16, W - pad * 2, H * 0.16, p.seed ?? 3, fg);
    if (p.sub) text(g, p.sub, pad, H - pad * 0.7, { size: H * 0.045, font: 'mono', color: fg, align: 'left', maxW: W - pad * 2 });
    if (p.stamp) text(g, p.stamp, W * 0.78, H * 0.55, { size: u * 0.16, font: S.main, color: S.c('a1'), rotate: -0.25, stroke: null });
  },

  /** Warning-style sign: framed pictogram with a caption. */
  sign(g, W, H, S, p) {
    const u = Math.min(W, H);
    const bg = S.c(p.bg ?? 'a2');
    const fg = S.c(p.fg ?? 'ink');
    fill(g, bg, -W, -H, W * 3, H * 3);
    if (p.shape === 'triangle') {
      const t = u * 0.1;
      g.save();
      g.beginPath();
      g.moveTo(W / 2, H * 0.1);
      g.lineTo(W * 0.92, H * 0.86);
      g.lineTo(W * 0.08, H * 0.86);
      g.closePath();
      g.lineWidth = t;
      g.lineJoin = 'round';
      g.strokeStyle = fg;
      g.stroke();
      g.restore();
      icon(g, p.icon ?? 'warning', W / 2, H * 0.58, u * 0.4, fg, bg);
      if (p.cap) text(g, p.cap, W / 2, H * 0.76, { size: u * 0.12, font: S.main, color: fg, maxW: W * 0.5 });
      return;
    }
    if (p.compact) {
      icon(g, p.icon ?? 'warning', W / 2, H * 0.36, u * (p.iconSize ?? 0.34), S.c(p.iconColor ?? p.fg ?? 'ink'), bg);
      if (p.cap) text(g, p.cap, W / 2, H * 0.62, { size: u * 0.1, font: S.main, color: fg, maxW: W * 0.46 });
      if (p.cjk) text(g, p.cjk, W / 2, H * 0.73, { size: u * 0.08, font: 'sans', color: fg, maxW: W * 0.4 });
      return;
    }
    const m = u * 0.06;
    g.lineWidth = u * 0.025;
    g.strokeStyle = fg;
    rrect(g, m, m, W - m * 2, H - m * 2, u * 0.12);
    g.stroke();
    icon(g, p.icon ?? 'warning', W / 2, H * (p.cap ? 0.4 : 0.5), u * (p.iconSize ?? 0.46), S.c(p.iconColor ?? p.fg ?? 'ink'), bg);
    if (p.cap) text(g, p.cap, W / 2, H * 0.74, { size: u * 0.14, font: S.main, color: fg, maxW: W * 0.78 });
    if (p.cjk) text(g, p.cjk, W / 2, H * 0.86, { size: u * 0.1, font: 'sans', color: fg, maxW: W * 0.7 });
    if (p.small) text(g, p.small, W / 2, H * 0.93, { size: u * 0.04, font: 'mono', color: fg, maxW: W * 0.8 });
  },

  /** Hang tag with an eyelet at the top (hole position is handled by the shape). */
  tag(g, W, H, S, p) {
    const u = Math.min(W, H);
    const bg = S.c(p.bg ?? 'paper');
    const fg = S.c(p.fg ?? 'ink');
    fill(g, bg, -W, -H, W * 3, H * 3);
    deco(g, p.deco, 0, H * 0.3, W, H * 0.7, S, S.c(p.decoColor ?? 'a1'), 0.5);
    const top = H * (p.top ?? 0.2);
    text(g, p.title ?? '', W / 2, top + H * 0.05, { size: H * 0.1, font: p.titleFont ?? S.main, color: fg, maxW: W * 0.82 });
    if (p.cjk) text(g, p.cjk, W / 2, top + H * 0.17, { size: H * 0.09, font: 'sans', color: S.c('a1'), maxW: W * 0.8 });
    const L = lines(p.lines);
    L.forEach((l, i) => text(g, l, W * 0.12, top + H * (p.cjk ? 0.27 : 0.2) + i * H * 0.07, { size: H * 0.05, font: 'mono', color: fg, align: 'left', maxW: W * 0.76 }));
    if (p.code === 'qr') qr(g, W / 2 - u * 0.17, H * 0.72, u * 0.34, p.seed ?? 8, fg, bg);
    else if (p.code === 'bar') barcode(g, W * 0.12, H * 0.8, W * 0.76, H * 0.1, p.seed ?? 4, fg);
    if (p.sub) text(g, p.sub, W / 2, H * 0.94, { size: H * 0.035, font: 'mono', color: fg, maxW: W * 0.8 });
  },

  /** Pixel-art sticker: the silhouette is the art, painted with colour bands and a tiny caption. */
  pixel(g, W, H, S, p) {
    const u = Math.min(W, H);
    const bg = S.c(p.bg ?? 'a1');
    const fg = S.c(p.fg ?? 'ink');
    fill(g, bg, -W, -H, W * 3, H * 3);
    stripes(g, 0, H * 0.55, W, H, [S.c(p.band ?? 'a3'), bg], { angle: 0, size: H * 0.09 });
    const eye = u * 0.09;
    if (p.face !== false) {
      for (const x of [0.36, 0.64]) disc(g, W * x, H * 0.42, eye, S.c('paper'));
      for (const x of [0.37, 0.65]) disc(g, W * x, H * 0.43, eye * 0.5, fg);
    }
    if (p.text) text(g, p.text, W / 2, H * 0.78, { size: u * 0.14, font: 'pixel', color: S.c(p.textColor ?? 'paper'), maxW: W * 0.8 });
  },

  /** Single pictogram on a colour field with curved caption. */
  icon(g, W, H, S, p) {
    const u = Math.min(W, H);
    const bg = S.c(p.bg ?? 'a3');
    fill(g, bg, -W, -H, W * 3, H * 3);
    deco(g, p.deco, 0, 0, W, H, S, S.c(p.decoColor ?? 'paper'), 0.4);
    icon(g, p.icon ?? 'star', W / 2, H * 0.44, u * (p.size ?? 0.5), S.c(p.iconColor ?? 'paper'), S.c(p.iconColor2 ?? bg));
    stack(g, lines(p.lines), W * 0.14, H * 0.7, W * 0.72, H * 0.2, { font: S.main, color: S.c(p.fg ?? 'paper') });
    if (p.cjk) text(g, p.cjk, W / 2, H * 0.12, { size: u * 0.12, font: 'sans', color: S.c(p.fg ?? 'paper'), maxW: W * 0.7 });
  },
};

export const TEMPLATE_NAMES = Object.keys(TEMPLATES);
