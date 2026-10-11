import { box, circle, ellipse, flower, grow, intersect, move, ngon, pixels, polygon, rotate, scallop, smoothUnion, star, stretch, subtract, union, wobble } from './sdf.js';

/**
 * Die-cut silhouettes. Every maker takes the nominal size (w, h in cm) and returns
 * { sdf, hole? } with the shape centred on the origin, y up. `hole` is an eyelet { x, y, r }.
 */

const PIXEL_ART = {
  heart: ['.##..##.', '########', '########', '########', '.######.', '..####..', '...##...'],
  ghost: ['..####..', '.######.', '########', '##.##.##', '########', '########', '##.##.##'],
  cup: ['.#.#.#..', '........', '#######.', '#######.', '#######.', '#######.', '.#####..'],
  chair: ['#.......', '#.......', '#.......', '#######.', '#######.', '#.....#.', '#.....#.'],
  star: ['...##...', '...##...', '########', '.######.', '..####..', '.##..##.', '.#....#.'],
  face: ['.######.', '########', '#.####.#', '########', '########', '#.####.#', '.######.'],
};
export const PIXEL_NAMES = Object.keys(PIXEL_ART);

const MAKERS = {
  rect: (w, h, o) => ({ sdf: box(w, h, o.r ?? 0.5) }),
  pill: (w, h) => ({ sdf: box(w, h, Math.min(w, h) / 2) }),
  circle: (w, h) => ({ sdf: circle(Math.min(w, h) / 2) }),
  oval: (w, h) => ({ sdf: ellipse(w / 2, h / 2) }),
  badge: (w, h, o) => ({ sdf: scallop(o.n ?? 16, Math.min(w, h) / 2, o.depth ?? 0.22) }),
  seal: (w, h, o) => ({ sdf: star(o.n ?? 14, Math.min(w, h) / 2, 0.9, 0.12) }),
  flower: (w, h, o) => ({ sdf: flower(o.n ?? 5, Math.min(w, h) * 0.38, Math.min(w, h) * (o.amp ?? 0.1)) }),
  clover: (w, h) => {
    const r = Math.min(w, h) * 0.27;
    const d = r * 0.82;
    return { sdf: smoothUnion(0.5, move(circle(r), -d, 0), move(circle(r), d, 0), move(circle(r), 0, d), move(circle(r), 0, -d)) };
  },
  blob: (w, h, o) => ({ sdf: stretch(wobble(Math.min(w, h) * 0.46, o.amps ?? [0.06, 0.05, 0.04], o.seed ?? 2), w / Math.min(w, h), h / Math.min(w, h)) }),
  cloud: (w, h) => {
    const r = h * 0.26;
    return {
      sdf: smoothUnion(
        h * 0.12,
        box(w * 0.86, h * 0.5, h * 0.25),
        move(circle(r * 1.15), -w * 0.26, h * 0.2),
        move(circle(r * 1.5), w * 0.02, h * 0.22),
        move(circle(r * 1.05), w * 0.3, h * 0.17),
      ),
    };
  },
  bubble: (w, h, o) => {
    const bh = h * 0.8;
    const tail = polygon([[-w * 0.3, -bh / 2 + 0.2], [-w * 0.18, -bh / 2 + 0.2], [-w * (o.tail ?? 0.38), -h / 2]]);
    return { sdf: smoothUnion(0.35, move(box(w, bh, Math.min(bh * 0.45, 1.4)), 0, h / 2 - bh / 2), tail) };
  },
  oval_bubble: (w, h) => {
    const bh = h * 0.8;
    return { sdf: smoothUnion(0.3, move(ellipse(w / 2, bh / 2), 0, h / 2 - bh / 2), polygon([[-w * 0.22, -bh / 2 + 0.5], [-w * 0.05, -bh / 2 + 0.3], [-w * 0.3, -h / 2]])) };
  },
  tag: (w, h, o) => {
    const r = o.hole ?? 0.28;
    const c = Math.min(w, h) * 0.2;
    const body = polygon([[-w / 2, -h / 2 + 0.6], [-w / 2, h / 2 - c * 1.5], [-w / 2 + c, h / 2], [w / 2 - c, h / 2], [w / 2, h / 2 - c * 1.5], [w / 2, -h / 2 + 0.6]]);
    return { sdf: smoothUnion(0.5, body, move(box(w, 1.2, 0.5), 0, -h / 2 + 0.6)), hole: { x: 0, y: h / 2 - r - 0.55, r } };
  },
  fob: (w, h, o) => {
    const r = o.hole ?? 0.3;
    return { sdf: box(w, h, Math.min(w, h) * 0.34), hole: { x: 0, y: h / 2 - r - 0.7, r } };
  },
  loop: (w, h, o) => {
    const r = o.hole ?? 0.28;
    const top = Math.min(w, h) * 0.2;
    return { sdf: smoothUnion(0.6, move(circle(top + r * 0.4), 0, h / 2 - top - r * 0.4), box(w, h * 0.78, 0.7), polygon([[-w * 0.16, h * 0.3], [w * 0.16, h * 0.3], [0, h / 2 - r]]) ), hole: { x: 0, y: h / 2 - top - r * 0.4, r } };
  },
  triangle: (w, h) => ({ sdf: stretch(ngon(3, Math.min(w, h) * 0.62, 0.45), w / Math.min(w, h), h / Math.min(w, h)) }),
  diamond: (w, h) => ({ sdf: rotate(box(Math.min(w, h) * 0.72, Math.min(w, h) * 0.72, 0.55), Math.PI / 4) }),
  hex: (w, h) => ({ sdf: stretch(ngon(6, Math.min(w, h) / 2, 0.35, 0), w / Math.min(w, h), h / Math.min(w, h)) }),
  shield: (w, h) => ({ sdf: smoothUnion(0.8, move(box(w, h * 0.6, 0.5), 0, h * 0.2), move(ellipse(w / 2, h * 0.45), 0, -h * 0.05)) }),
  aframe: (w, h) => ({ sdf: smoothUnion(0.12, polygon([[-w * 0.38, h / 2], [w * 0.38, h / 2], [w / 2, -h / 2], [-w / 2, -h / 2]])) }),
  ticket: (w, h) => {
    const r = Math.min(w, h) * 0.12;
    return { sdf: subtract(subtract(box(w, h, 0.25), move(circle(r), -w / 2, 0)), move(circle(r), w / 2, 0)) };
  },
  dogear: (w, h) => ({ sdf: subtract(box(w, h, 0.3), polygon([[w / 2 + 1, h / 2 + 1], [w / 2 - w * 0.22 - 1, h / 2 + 1], [w / 2 + 1, h / 2 - w * 0.22 - 1]].map(([x, y]) => [x, y]))) }),
  wavy: (w, h, o) => {
    const b = box(w - (o.amp ?? 0.25) * 2, h - (o.amp ?? 0.25) * 2, 0.4);
    const k = ((o.freq ?? 7) * Math.PI * 2) / w;
    return { sdf: (x, y) => b(x, y) - (o.amp ?? 0.25) - (o.amp ?? 0.25) * Math.sin(x * k) * 0.8 - (o.amp ?? 0.25) * 0.6 * Math.sin(y * k * 1.3) };
  },
  drumstick: (w, h) => {
    const mr = w * 0.5;
    return {
      sdf: smoothUnion(
        w * 0.35,
        move(ellipse(mr, h * 0.33), 0, h * 0.17),
        move(box(w * 0.2, h * 0.5, w * 0.1), 0, -h * 0.12),
        move(circle(w * 0.13), -w * 0.1, -h * 0.4),
        move(circle(w * 0.13), w * 0.1, -h * 0.4),
      ),
    };
  },
  leaf: (w, h) => {
    const r = h * 0.78;
    const d = r - w / 2;
    return { sdf: rotate(intersect(move(circle(r), -d, 0), move(circle(r), d, 0)), Math.PI / 2) };
  },
  tear: (w, h) => ({ sdf: smoothUnion(0.5, move(circle(w / 2), 0, -h / 2 + w / 2), polygon([[-w * 0.3, -h / 2 + w * 0.7], [w * 0.3, -h / 2 + w * 0.7], [0, h / 2]])) }),
  bone: (w, h) => {
    const r = h * 0.3;
    return { sdf: smoothUnion(0.2, box(w - r * 2, h * 0.34, 0.1), move(circle(r), -w / 2 + r, h * 0.18), move(circle(r), -w / 2 + r, -h * 0.18), move(circle(r), w / 2 - r, h * 0.18), move(circle(r), w / 2 - r, -h * 0.18)) };
  },
  bean: (w, h) => ({ sdf: smoothUnion(0.8, move(ellipse(w * 0.32, h * 0.4), -w * 0.12, h * 0.05), move(circle(h * 0.32), w * 0.22, -h * 0.1), move(circle(h * 0.25), -w * 0.34, -h * 0.18)) }),
  burst: (w, h, o) => ({ sdf: star(o.n ?? 10, Math.min(w, h) / 2, 0.72, 0.18) }),
  pixel: (w, h, o) => {
    const rows = PIXEL_ART[o.art] ?? PIXEL_ART.heart;
    const cols = Math.max(...rows.map((r) => r.length));
    return { sdf: pixels(rows, Math.min(w / cols, h / rows.length)) };
  },
};

export const SHAPE_TYPES = Object.keys(MAKERS);

export function makeShape(type, w, h, opts = {}) {
  const maker = MAKERS[type] ?? MAKERS.rect;
  return maker(w, h, opts);
}

export { PIXEL_ART, grow, union };
