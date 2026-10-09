// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

// jsdom has no canvas: give the builder's procedural textures a stub 2D context
HTMLCanvasElement.prototype.getContext = function getContext() {
  const w = this.width || 1;
  const h = this.height || 1;
  const noop = () => {};
  return new Proxy({ canvas: this }, {
    get: (t, k) => {
      if (k in t) return t[k];
      if (k === 'createImageData' || k === 'getImageData') return () => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop: noop });
      return noop;
    },
    set: (t, k, v) => { t[k] = v; return true; },
  });
};
HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';

vi.mock('../src/stamppack/faces.js', () => ({
  cachedFace: (_k, paint) => paint(),
  stampFace: () => document.createElement('canvas'),
  cardFace: () => document.createElement('canvas'),
}));

const { buildPack } = await import('../src/stamppack/builder.js');
const { bakeClip, bakeClips, CLIPS, poseAt, poseRest } = await import('../src/stamppack/animation.js');
const { baseOutline, perforateCircle, perforatePolygon, stampGeometry, cardGeometry } = await import('../src/stamppack/geometry.js');
const { defaultDesign, defaultStamp, parseSettings, sanitizeDesign, scatter, serializeSettings } = await import('../src/stamppack/design.js');
const { PACK, PACK_LIMITS, SHAPE_IDS } = await import('../src/stamppack/constants.js');

const area = (pts) => pts.reduce((s, [x, y], i) => {
  const [nx, ny] = pts[(i + 1) % pts.length];
  return s + (x * ny - nx * y) / 2;
}, 0);

describe('perforated outlines', () => {
  it('rectangle outline is counter-clockwise and smaller than the plain rectangle', () => {
    const pts = perforatePolygon(baseOutline('portrait', 38, 48), 3, 0.9);
    expect(area(pts)).toBeGreaterThan(0);
    expect(area(pts)).toBeLessThan(38 * 48);
    expect(area(pts)).toBeGreaterThan(38 * 48 * 0.9);
    expect(pts.length).toBeGreaterThan(200);
  });
  it('wedge and circle are counter-clockwise too', () => {
    expect(area(perforatePolygon(baseOutline('wedge', 58, 46), 3, 0.9))).toBeGreaterThan(0);
    expect(area(perforateCircle(22, 3, 0.9))).toBeGreaterThan(0);
  });
  it.each(SHAPE_IDS)('%s builds a geometry with three material groups and unit UVs', (shape) => {
    const { geometry, size } = stampGeometry(shape, 1, 3);
    expect(geometry.groups.map((g) => g.materialIndex)).toEqual([0, 1, 2]);
    expect(geometry.groups[0].count).toBeGreaterThan(0);
    expect(geometry.groups[2].count).toBeGreaterThan(0);
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      expect(uv.getX(i)).toBeGreaterThanOrEqual(-1e-6);
      expect(uv.getX(i)).toBeLessThanOrEqual(1 + 1e-6);
    }
    geometry.computeBoundingBox();
    const b = geometry.boundingBox;
    expect(b.max.x - b.min.x).toBeLessThanOrEqual(size.w + 0.1);
  });
  it('card geometry has a hole when asked', () => {
    const solid = cardGeometry(150, 30, false).attributes.position.count;
    const holed = cardGeometry(150, 30, true).attributes.position.count;
    expect(holed).toBeGreaterThan(solid);
  });
});

describe('design', () => {
  it('sanitises hostile input', () => {
    const d = sanitizeDesign({ seed: -5, paper: 'nope', backdrop: 'x', card: { line1: 'a'.repeat(500), font: 'comic' }, stamps: Array.from({ length: 40 }, () => ({ shape: 'bogus', scale: 99, caption: 'c'.repeat(300) })) });
    expect(d.stamps.length).toBeLessThanOrEqual(PACK_LIMITS.maxStamps);
    expect(d.stamps[0].scale).toBeLessThanOrEqual(PACK_LIMITS.scale[1]);
    expect(SHAPE_IDS).toContain(d.stamps[0].shape);
    expect(d.card.line1.length).toBeLessThanOrEqual(PACK_LIMITS.lineLength);
    expect(d.paper).toMatch(/^#[0-9a-f]{6}$/);
  });
  it('saves settings but not the pictures', () => {
    const d = defaultDesign();
    d.card.logoId = 'i1';
    const back = parseSettings(serializeSettings(d));
    expect(back.card.logoId).toBe('');
    expect(back.stamps).toEqual([]);
    expect(parseSettings('garbage')).toBeNull();
  });
  it('scatter is deterministic, stays in the pack and tilts', () => {
    const stamps = Array.from({ length: 6 }, (_, i) => defaultStamp({ id: `s${i}`, shape: SHAPE_IDS[i % 5] }));
    const a = scatter(stamps, 11);
    const b = scatter(stamps, 11);
    expect(a).toEqual(b);
    expect(scatter(stamps, 12)).not.toEqual(a);
    for (const s of a) {
      expect(Math.abs(s.x)).toBeLessThanOrEqual(PACK.W / 2);
      expect(s.y).toBeGreaterThanOrEqual(PACK.bagY0);
      expect(Math.abs(s.rot)).toBeGreaterThan(1);
    }
  });
});

describe('pack builder', () => {
  const design = () => {
    const stamps = scatter(Array.from({ length: 5 }, (_, i) => defaultStamp({ id: `s${i}`, imageId: `i${i}`, shape: SHAPE_IDS[i] })), 3);
    return sanitizeDesign({ ...defaultDesign(), stamps });
  };
  it('builds stamps, bag and card and pins stamp order to height', () => {
    const kc = buildPack(design(), new Map());
    expect(kc.parts.size).toBe(6); // 5 stamps + card
    const names = [];
    kc.group.traverse((o) => o.name && names.push(o.name));
    expect(names).toEqual(expect.arrayContaining(['Pack_Spin', 'Bag_Front', 'Bag_Back', 'Header_Card']));
    const zs = [0, 1, 2, 3, 4].map((i) => kc.group.getObjectByName('StampPos_s' + i).position.z);
    expect([...zs].sort((a, b) => a - b)).toEqual(zs);
    expect(Number.isFinite(kc.bounds.min.x)).toBe(true);
    kc.dispose();
  });
  it('can drop the bag and the card', () => {
    const d = design();
    d.bag = false;
    d.card.show = false;
    const kc = buildPack(d, new Map());
    expect(kc.group.getObjectByName('Bag_Front')).toBeUndefined();
    expect(kc.parts.has('card')).toBe(false);
    kc.dispose();
  });
  it('handles an empty pack', () => {
    const kc = buildPack(defaultDesign(), new Map());
    expect(kc.report.stamps).toBe(0);
    kc.dispose();
  });
});

describe('pack animation', () => {
  it.each(Object.keys(CLIPS))('%s loops seamlessly', (kind) => {
    const kc = buildPack(sanitizeDesign({ ...defaultDesign() }), new Map());
    const clip = bakeClip(kc, kind);
    expect(clip.tracks.length).toBe(1);
    const v = clip.tracks[0].values;
    const n = v.length;
    const dot = v[0] * v[n - 4] + v[1] * v[n - 3] + v[2] * v[n - 2] + v[3] * v[n - 1];
    expect(Math.abs(Math.abs(dot) - 1)).toBeLessThan(1e-6);
    expect(clip.tracks[0].times.length).toBe(Math.round(clip.duration * 30) + 1);
    kc.dispose();
  });
  it('spin turns a full 360 degrees and rest restores the pose', () => {
    const kc = buildPack(defaultDesign(), new Map());
    poseAt(kc, 'spin', CLIPS.spin.duration / 2);
    expect(Math.abs(kc.rig.spin.rotation.y)).toBeCloseTo(Math.PI, 5);
    poseRest(kc);
    expect(kc.rig.spin.rotation.y).toBe(0);
    expect(bakeClips(kc, 'none')).toEqual([]);
    expect(bakeClips(kc, 'both').length).toBe(2);
    kc.dispose();
  });
  it('is a THREE.AnimationClip', () => {
    const kc = buildPack(defaultDesign(), new Map());
    expect(bakeClip(kc, 'spin')).toBeInstanceOf(THREE.AnimationClip);
    kc.dispose();
  });
});
