// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { LIBRARY, GROUPS, byId } from '../src/stickers/library.js';
import { DEFAULT_STYLE, PRESETS, sanitizeStyle, sanitizeCustom, customToDef, makePack, parsePack, NEW_CUSTOM } from '../src/stickers/styles.js';
import { dieCut, stickerGeometry } from '../src/stickers/build.js';
import { area } from '../src/stickers/sdf.js';

beforeAll(() => {
  const noop = () => {};
  HTMLCanvasElement.prototype.getContext = function () {
    return new Proxy({ canvas: this, measureText: () => ({ width: 10 }), createPattern: () => ({}), createLinearGradient: () => ({ addColorStop: noop }) }, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
  };
});

const style = sanitizeStyle(DEFAULT_STYLE);

describe('sticker library', () => {
  it('has unique ids, known groups and 30+ designs', () => {
    expect(LIBRARY.length).toBeGreaterThanOrEqual(30);
    expect(new Set(LIBRARY.map((s) => s.id)).size).toBe(LIBRARY.length);
    const groups = new Set(GROUPS.map((g) => g.id));
    for (const s of LIBRARY) expect(groups.has(s.group)).toBe(true);
    expect(byId('slip')).toBeTruthy();
  });

  it('traces a die-cut for every design (outer loop + eyelets for tags)', () => {
    for (const d of LIBRARY) {
      const dc = dieCut(d, style);
      const outer = dc.cut.filter((l) => !l.hole);
      expect(outer.length, d.id).toBeGreaterThanOrEqual(1);
      expect(area(outer[0]), d.id).toBeGreaterThan(1);
      if (dc.hole) expect(dc.cut.some((l) => l.hole), d.id).toBe(true);
      // the cut line always encloses the art
      const sum = (loops) => loops.reduce((n, l) => n + area(l) * (l.hole ? -1 : 1), 0);
      expect(Math.abs(sum(dc.cut)), d.id).toBeGreaterThanOrEqual(Math.abs(sum(dc.art)) - 1e-6);
    }
  });

  it('builds closed geometry with outward side normals', () => {
    for (const id of ['fresh-hours', 'infectious', 'px-ghost']) {
      const d = byId(id);
      const dc = dieCut(d, style);
      const g = stickerGeometry(dc.cut, dc.bounds, style.thickness);
      expect(g.groups).toHaveLength(3);
      const p = g.getAttribute('position');
      const idx = g.getIndex();
      const side = g.groups[2];
      let outward = 0;
      let total = 0;
      for (let i = side.start; i < side.start + side.count; i += 3) {
        const [a, b, c] = [0, 1, 2].map((k) => idx.getX(i + k));
        const ab = [p.getX(b) - p.getX(a), p.getY(b) - p.getY(a), p.getZ(b) - p.getZ(a)];
        const ac = [p.getX(c) - p.getX(a), p.getY(c) - p.getY(a), p.getZ(c) - p.getZ(a)];
        const n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
        const na = g.getAttribute('normal');
        const dot = n[0] * na.getX(a) + n[1] * na.getY(a) + n[2] * na.getZ(a);
        total++;
        if (dot > 0) outward++;
      }
      expect(outward / total, id).toBeGreaterThan(0.95);
    }
  });
});

describe('pack style', () => {
  it('sanitises hostile input', () => {
    const s = sanitizeStyle({ name: 'x'.repeat(100), palette: { ink: 'red', a1: '#ABCDEF' }, font: 'nope', border: { width: 99, mode: 'zzz' }, finish: 5, thickness: -2, softness: 9 });
    expect(s.name.length).toBe(40);
    expect(s.palette.ink).toBe(DEFAULT_STYLE.palette.ink);
    expect(s.palette.a1).toBe('#abcdef');
    expect(s.font).toBe(DEFAULT_STYLE.font);
    expect(s.border.width).toBeLessThanOrEqual(0.8);
    expect(s.border.mode).toBe('solid');
    expect(s.thickness).toBeGreaterThan(0);
    expect(s.softness).toBeLessThanOrEqual(3);
  });

  it('round-trips a pack with custom stickers', () => {
    const c = sanitizeCustom({ ...NEW_CUSTOM, name: 'Mine', shape: 'tag', tpl: 'tag', w: 5, h: 8, cord: true });
    const pack = makePack({ ...PRESETS.pastel, name: 'Pastel pack' }, [c]);
    const back = parsePack(JSON.stringify(pack));
    expect(back.style.name).toBe('Pastel pack');
    expect(back.stickers[0].name).toBe('Mine');
    const dc = dieCut(customToDef(back.stickers[0]), back.style);
    expect(dc.hole).toBeTruthy();
    expect(() => parsePack('{"format":"x"}')).toThrow();
  });

  it('presets are valid styles', () => {
    for (const p of Object.values(PRESETS)) expect(sanitizeStyle(p).palette).toEqual(p.palette);
  });
});
