// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { FONTS } from '../src/tagbuilder/constants.js';
import { registerFont } from '../src/tagbuilder/fonts.js';
import { buildKeychain, pairOverlaps } from '../src/tagbuilder/builder.js';
import { bakeClip, poseAt, poseRest } from '../src/tagbuilder/animation.js';
import { decodeTagDesign, defaultDesign, defaultTag, encodeTagDesign, parseTagDesign, sanitizeTagDesign, serializeTagDesign } from '../src/tagbuilder/design.js';
import { SHAPES } from '../src/tagbuilder/constants.js';
import { buildOBJ, buildPLY, exportModel, meshHealth, prepareExportRoot } from '../src/tagbuilder/exporters.js';
import { parseSvgShapes } from '../src/tagbuilder/svg.js';

const FILES = {
  inter: '@fontsource/inter/files/inter-latin-900-normal.woff',
  bebas: '@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff',
  fredoka: '@fontsource/fredoka/files/fredoka-latin-600-normal.woff',
  silkscreen: '@fontsource/silkscreen/files/silkscreen-latin-700-normal.woff',
};

beforeAll(() => {
  for (const f of FONTS) {
    const buf = fs.readFileSync(path.resolve(import.meta.dirname + '/..', 'node_modules', FILES[f.id]));
    registerFont(f.id, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), f.label);
  }
});


const readBlob = (blob, as) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = () => rej(r.error);
  if (as === 'text') r.readAsText(blob); else r.readAsArrayBuffer(blob);
});
const tris = (g) => { let n = 0; g.traverse((o) => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return n; };

describe('design model', () => {
  it('sanitises hostile input into valid limits', () => {
    const d = sanitizeTagDesign({ v: 1, keys: 99, chain: -4, bg: 'nope', tags: [{ w: 9999, text: 'x'.repeat(500), color: 'red', shape: 'bogus' }] });
    expect(d.keys).toBeLessThanOrEqual(3);
    expect(d.chain).toBeGreaterThanOrEqual(0);
    expect(d.tags[0].w).toBeLessThanOrEqual(90);
    expect(d.tags[0].text.length).toBeLessThanOrEqual(60);
    expect(d.tags[0].color).toMatch(/^#[0-9a-f]{6}$/);
    expect(SHAPES.map((s) => s.id)).toContain(d.tags[0].shape);
  });
  it('round-trips through JSON and share links', () => {
    const d = defaultDesign();
    expect(parseTagDesign(serializeTagDesign(d))).toEqual(d);
    expect(decodeTagDesign(encodeTagDesign(d))).toEqual(d);
  });
  it('rejects garbage', () => {
    expect(parseTagDesign('not json')).toBeNull();
  });
});

describe('keychain builder', () => {
  it('builds the default design without overlap', () => {
    const kc = buildKeychain(defaultDesign());
    expect(tris(kc.group)).toBeGreaterThan(20000);
    expect(kc.report.overlap).toBe(0);
    expect(kc.parts.size).toBe(3);
    kc.dispose();
  });

  it.each([0, 1, 2, 3])('has no overlap with %i keys', (keys) => {
    const kc = buildKeychain({ ...defaultDesign(), keys });
    expect(kc.report.overlap).toBe(0);
    kc.dispose();
  });

  it.each(SHAPES.map((s) => s.id))('builds a %s tag', (shape) => {
    const d = sanitizeTagDesign({ v: 1, keys: 0, tags: [defaultTag({ shape, text: 'Aa' })] });
    const kc = buildKeychain(d);
    expect(kc.report.overlap).toBe(0);
    expect(tris(kc.group)).toBeGreaterThan(500);
    kc.dispose();
  });

  it('separates six tags and a key on a chain, and three tags with no chain or key', () => {
    for (let chain = 0; chain <= 4; chain++) {
      const count = chain === 0 ? 3 : 6;
      const d = sanitizeTagDesign({ v: 1, keys: chain === 0 ? 0 : 1, chain, tags: Array.from({ length: count }, (_, i) => defaultTag({ text: String(i), shape: SHAPES[i].id })) });
      const kc = buildKeychain(d);
      expect([chain, kc.report.overlap]).toEqual([chain, 0]);
      kc.dispose();
    }
  });

  it('builds without a carabiner and with empty text', () => {
    const kc = buildKeychain(sanitizeTagDesign({ v: 1, top: 'none', tags: [defaultTag({ text: '' })] }));
    expect(tris(kc.group)).toBeGreaterThan(0);
    kc.dispose();
  });
});

describe('svg logos', () => {
  it('parses filled shapes and groups them by colour', () => {
    const r = parseSvgShapes('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#ff0000"/><circle cx="5" cy="5" r="2" fill="#0000ff"/></svg>');
    expect(r.groups.size).toBe(2);
  });
  it('returns null for an SVG with nothing to extrude', () => {
    expect(parseSvgShapes('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).toBeNull();
  });
});

describe('exports', () => {
  const d = defaultDesign();
  it('writes valid GLB with millimetres converted to metres', async () => {
    const { blob, filename } = await exportModel('glb', d);
    expect(filename.endsWith('.glb')).toBe(true);
    const buf = new Uint8Array(await readBlob(blob));
    expect(String.fromCharCode(...buf.slice(0, 4))).toBe('glTF');
    expect(buf.length).toBeGreaterThan(100000);
  });
  it('writes OBJ, PLY, STL and the Blender script', async () => {
    const kc = prepareExportRoot(d, 1);
    expect(buildOBJ(kc.group)).toMatch(/^v /m);
    expect(buildPLY(kc.group)).toBeTruthy();
    kc.dispose();
    const stl = await exportModel('stl', d);
    expect(stl.blob.size).toBeGreaterThan(100000);
    const py = await exportModel('blend', d);
    const text = await readBlob(py.blob, 'text');
    expect(text).toContain('import bpy');
    expect(text).toContain('base64');
  });
  it('reports mesh health', () => {
    const kc = prepareExportRoot(d, 1);
    const h = meshHealth(kc.group);
    expect(h.parts).toBeGreaterThan(10);
    expect(h.triangles).toBeGreaterThan(20000);
    kc.dispose();
  });
});

describe('animation', () => {
  it.each(['swing', 'spin', 'spinswing'])('%s loops seamlessly and never overlaps', (kind) => {
    const kc = buildKeychain(defaultDesign());
    const clip = bakeClip(kc, kind);
    expect(clip.duration).toBeGreaterThan(3);
    const first = clip.tracks.find((t) => t.name === 'Mocha_Swing.quaternion');
    const times = first.times;
    expect(times.length).toBe(Math.round(clip.duration * 30) + 1);
    // last key equals first key up to sign (same rotation)
    for (const tr of clip.tracks) {
      const v = tr.values;
      const n = v.length;
      const dot = v[0] * v[n - 4] + v[1] * v[n - 3] + v[2] * v[n - 2] + v[3] * v[n - 1];
      expect(Math.abs(Math.abs(dot) - 1)).toBeLessThan(1e-6);
    }
    // sample frames: no two items interpenetrate
    let worst = 0;
    for (let k = 0; k < 120; k += 7) {
      poseAt(kc, kind, (k / 30) % clip.duration);
      worst = Math.max(worst, pairOverlaps(kc.items, kc.group).reduce((m, h) => Math.max(m, h[2]), 0));
    }
    expect(worst).toBeLessThan(0.3);
    kc.dispose();
  });

  it('returns to the rest pose', () => {
    const kc = buildKeychain(defaultDesign());
    const before = kc.items.map((b) => b.hang.rotation.x);
    poseAt(kc, 'spinswing', 1.3);
    poseRest(kc);
    expect(kc.items.map((b) => b.hang.rotation.x)).toEqual(before);
    expect(kc.rig.spin.rotation.y).toBe(0);
    kc.dispose();
  });

  it('embeds the chosen clips in the GLB', async () => {
    const { blob } = await exportModel('glb', defaultDesign(), { anim: 'both' });
    const buf = new Uint8Array(await readBlob(blob));
    const len = new DataView(buf.buffer).getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(buf.slice(20, 20 + len)));
    expect(json.animations.map((a) => a.name).sort()).toEqual(['Mocha_Spin_360', 'Mocha_Spin_Swing', 'Mocha_Swing']);
    const still = await exportModel('glb', defaultDesign(), { anim: 'none' });
    const b2 = new Uint8Array(await readBlob(still.blob));
    const l2 = new DataView(b2.buffer).getUint32(12, true);
    expect(JSON.parse(new TextDecoder().decode(b2.slice(20, 20 + l2))).animations).toBeUndefined();
  }, 30000);
});
