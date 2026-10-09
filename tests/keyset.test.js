// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

const { buildKeySet } = await import('../src/keyset/builder.js');
const { defaultCharm, defaultDesign, generateDesign, parseDesign, sanitizeDesign, serializeDesign } = await import('../src/keyset/design.js');
const { charmOutline } = await import('../src/keyset/outlines.js');
const { blenderScene } = await import('../src/keyset/blenderScene.js');
const { CHARM_STYLES, SET_LIMITS } = await import('../src/keyset/constants.js');
const { bakeClip, CLIPS } = await import('../src/tagbuilder/animation.js');

const names = (kc) => {
  const out = [];
  kc.group.traverse((o) => o.name && out.push(o.name));
  return out;
};

describe('keychain set design', () => {
  it('round-trips and sanitises', () => {
    const d = defaultDesign();
    expect(parseDesign(serializeDesign(d))).toEqual(d);
    const bad = sanitizeDesign({ clasp: 'x', backdrop: 'y', charms: Array(20).fill({ style: 'nope', w: 9999, color: 'red' }) });
    expect(bad.charms.length).toBe(SET_LIMITS.maxCharms);
    expect(bad.charms[0].w).toBe(SET_LIMITS.w[1]);
    expect(bad.charms[0].color).toMatch(/^#[0-9a-f]{6}$/);
    expect(bad.clasp).toBe('glass');
    expect(parseDesign('{oops')).toBeNull();
  });
  it('generates valid, deterministic sets', () => {
    const a = generateDesign(7);
    expect(generateDesign(7).charms.map((c) => c.style)).toEqual(a.charms.map((c) => c.style));
    expect(a.charms.length).toBeGreaterThanOrEqual(3);
    expect(sanitizeDesign(a).charms.length).toBe(a.charms.length);
  });
});

describe('keychain set model', () => {
  it('has an outline for every style', () => {
    for (const s of CHARM_STYLES) {
      const o = charmOutline(defaultCharm({ style: s.id }), 4.5);
      expect(o.shapes.length).toBeGreaterThan(0);
      expect(Number.isFinite(o.holeY)).toBe(true);
    }
  });
  it('builds the reference set without overlaps', () => {
    const kc = buildKeySet(defaultDesign());
    expect(kc.report.charms).toBe(5);
    expect(kc.report.overlap).toBeLessThan(0.1);
    const n = names(kc);
    for (const part of ['ClaspLoop', 'ClaspBlock', 'SplitRing', 'Mocha_Spin', 'Mocha_Swing']) expect(n).toContain(part);
    expect(kc.bounds.isEmpty()).toBe(false);
    kc.dispose();
  });
  it('builds every clasp and style', () => {
    for (const clasp of ['glass', 'chrome', 'carabiner', 'none']) {
      const d = defaultDesign();
      d.clasp = clasp;
      const kc = buildKeySet(sanitizeDesign(d));
      expect(kc.group.children.length).toBeGreaterThan(0);
      kc.dispose();
    }
    const d = sanitizeDesign({ charms: CHARM_STYLES.map((s) => defaultCharm({ style: s.id, ribs: 3, ruler: true })) });
    const kc = buildKeySet(d);
    expect(kc.report.charms).toBe(6);
    kc.dispose();
  });
  it('tags every charm mesh for picking and loops animations', () => {
    const kc = buildKeySet(defaultDesign());
    const ids = new Set(kc.items.map((b) => b.id));
    let tagged = 0;
    kc.group.traverse((o) => { if (o.isMesh && ids.has(o.userData.tagId)) tagged++; });
    expect(tagged).toBeGreaterThan(10);
    const clip = bakeClip(kc, 'spin');
    expect(clip).toBeInstanceOf(THREE.AnimationClip);
    expect(clip.duration).toBe(CLIPS.spin.duration);
    kc.dispose();
  });
});

describe('blender scene', () => {
  it('embeds the model and the render setup', () => {
    const glb = new Uint8Array([103, 108, 84, 70, 2, 0, 0, 0]).buffer;
    const py = blenderScene(defaultDesign(), glb, new THREE.Box3(new THREE.Vector3(-20, -90, -10), new THREE.Vector3(20, 40, 10)), { quality: 'ultra' });
    expect(py).toContain('GLB_BASE64');
    expect(py).toContain('SAMPLES = 1024');
    expect(py).toContain('CYCLES');
    expect(py).toContain('transmission_bounces');
    expect(py).toContain('Strip_L');
    expect(blenderScene(defaultDesign(), glb, new THREE.Box3(), { quality: 'draft' })).toContain('SAMPLES = 48');
  });
});
