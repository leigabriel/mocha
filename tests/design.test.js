import { describe, expect, it } from 'vitest';
import { decodeDesign, defaultDesign, encodeDesign, parseDesign, sanitizeDesign, serializeDesign } from '../src/utils/design.js';
import { DesignHistory } from '../src/utils/history.js';

describe('design serialisation', () => {
  it('round-trips through the URL-safe encoding, emoji included', () => {
    const d = { ...defaultDesign(), finish: 'gold', spread: 1.2, bg: 'dark' };
    d.charms[0].emoji = '❤️‍🔥';
    const encoded = encodeDesign(d);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeDesign(encoded)).toEqual(d);
  });
  it('clamps and filters untrusted input', () => {
    const d = sanitizeDesign({ f: 'chrome', s: 99, bg: 'x', c: [['🐉', 9, 99], ['abc', 2, 4], 'bad', ['🥑', 1, 1]].concat(Array(10).fill(['🔥', 2, 5])) });
    expect(d.finish).toBe('steel');
    expect(d.spread).toBe(1.35);
    expect(d.bg).toBe('light');
    expect(d.charms[0]).toEqual({ emoji: '🐉', thickness: 2, links: 10 });
    expect(d.charms[1]).toEqual({ emoji: '🥑', thickness: 1, links: 4 });
    expect(d.charms.length).toBe(5);
  });
  it('rejects garbage', () => {
    expect(parseDesign('nope')).toBeNull();
    expect(decodeDesign('!!!')).toBeNull();
    expect(sanitizeDesign({ c: [] })).toBeNull();
    expect(sanitizeDesign(null)).toBeNull();
    expect(parseDesign(serializeDesign(defaultDesign()))).toEqual(defaultDesign());
  });
});

describe('DesignHistory', () => {
  it('undoes, redoes and drops the redo branch on a new edit', () => {
    const h = new DesignHistory();
    h.push('a'); h.push('b'); h.push('c');
    expect(h.undo()).toBe('b');
    expect(h.undo()).toBe('a');
    expect(h.canUndo).toBe(false);
    expect(h.redo()).toBe('b');
    h.push('x');
    expect(h.canRedo).toBe(false);
    expect(h.current).toBe('x');
  });
  it('ignores duplicates and respects its limit', () => {
    const h = new DesignHistory(3);
    expect(h.push('a')).toBe(true);
    expect(h.push('a')).toBe(false);
    ['b', 'c', 'd'].forEach((s) => h.push(s));
    expect(h.stack).toEqual(['b', 'c', 'd']);
  });
});
