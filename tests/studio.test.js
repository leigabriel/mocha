// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

const { createStudioStore } = await import('../src/studio/store.js');
const { createObject, parseDoc, sanitizeDoc, sanitizeObject, serializeDoc, defaultDoc } = await import('../src/studio/doc.js');
const { sampleObject } = await import('../src/studio/animation.js');
const { buildStudioScene } = await import('../src/studio/builder.js');
const { TEMPLATES } = await import('../src/studio/templates.js');
const { LIMITS } = await import('../src/studio/constants.js');

describe('studio document', () => {
  it('round-trips and sanitises', () => {
    const d = TEMPLATES[1].build();
    expect(parseDoc(serializeDoc(d)).objects.length).toBe(d.objects.length);
    expect(parseDoc('{oops')).toBeNull();
    const o = sanitizeObject({ type: 'nope', pos: ['x', 1e9, 2], scale: [0, 0, 0] });
    expect(o.type).toBe('box');
    expect(o.pos.every(Number.isFinite)).toBe(true);
  });
  it('keeps text params intact and drops bad parents', () => {
    const t = sanitizeObject({ type: 'text', params: { text: 'Mocha', font: 'inter' } });
    expect(t.params.text).toBe('Mocha');
    expect(t.params.font).toBe('inter');
    const d = sanitizeDoc({ ...defaultDoc(), objects: [{ id: 'a', type: 'box', parent: 'zzz' }, { id: 'b', type: 'box', parent: 'c' }, { id: 'c', type: 'box', parent: 'b' }] });
    expect(d.objects.every((o) => o.parent === null || d.objects.some((p) => p.id === o.parent))).toBe(true);
  });
  it('caps object count', () => {
    const d = sanitizeDoc({ ...defaultDoc(), objects: Array(LIMITS.maxObjects + 50).fill({ type: 'box' }) });
    expect(d.objects.length).toBeLessThanOrEqual(LIMITS.maxObjects);
  });
});

describe('studio store', () => {
  it('adds, undoes, groups, duplicates, removes', () => {
    const s = createStudioStore(sanitizeDoc({ ...defaultDoc(), objects: [] }));
    const a = s.add('box');
    const b = s.add('sphere');
    expect(s.getState().doc.objects.length).toBe(2);
    s.undo();
    expect(s.getState().doc.objects.length).toBe(1);
    s.redo();
    const g = s.group([a.id, b.id]);
    expect(s.getState().doc.objects.filter((o) => o.parent === g.id).length).toBe(2);
    s.duplicate([g.id]);
    expect(s.getState().doc.objects.length).toBe(6);
    s.remove([g.id]);
    expect(s.getState().doc.objects.length).toBe(3);
  });
  it('keyframes sort and interpolate', () => {
    const s = createStudioStore(sanitizeDoc({ ...defaultDoc(), objects: [] }));
    const a = s.add('box');
    s.addKey(a.id, 0);
    s.update(a.id, { pos: [4, 0, 0] });
    s.addKey(a.id, 2);
    const o = s.getState().doc.objects[0];
    expect(o.keys.map((k) => k.t)).toEqual([0, 2]);
    expect(sampleObject(o, 1).pos[0]).toBeCloseTo(2, 5);
    expect(sampleObject(o, 9).pos[0]).toBe(4);
    expect(sampleObject(createObject('box'), 1)).toBeNull();
  });
});

describe('studio scene', () => {
  it('builds every template with unique object nodes', () => {
    for (const t of TEMPLATES) {
      const { root, nodes, dispose } = buildStudioScene(t.build(), { editor: false });
      const names = [];
      root.traverse((n) => n.name && n.isGroup && names.push(n.name));
      expect(new Set(names).size).toBe(names.length);
      expect(nodes.size).toBeGreaterThan(0);
      dispose();
    }
  });
});
