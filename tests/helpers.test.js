import { describe, expect, it } from 'vitest';
import { extractFirstEmoji, sRGBToLinear, wrapAngle } from '../src/utils/helpers.js';
import { EMOJI_DATABASE } from '../src/constants/index.js';

describe('extractFirstEmoji', () => {
  it('keeps ZWJ, flag and skin-tone sequences whole', () => {
    expect(extractFirstEmoji('🥷')).toBe('🥷');
    expect(extractFirstEmoji('❤️‍🔥 hi')).toBe('❤️‍🔥');
    expect(extractFirstEmoji('🏴‍☠️')).toBe('🏴‍☠️');
    expect(extractFirstEmoji('👍🏽')).toBe('👍🏽');
  });
  it('skips leading text and rejects non-emoji input', () => {
    expect(extractFirstEmoji('ab🐉')).toBe('🐉');
    expect(extractFirstEmoji('abc')).toBeNull();
    expect(extractFirstEmoji('   ')).toBeNull();
    expect(extractFirstEmoji(null)).toBeNull();
  });
  it('every preset is a single valid emoji', () => {
    for (const { char } of EMOJI_DATABASE) expect(extractFirstEmoji(char)).toBe(char);
  });
});

describe('colour and angle maths', () => {
  it('uses the exact sRGB transfer function', () => {
    expect(sRGBToLinear(0)).toBe(0);
    expect(sRGBToLinear(1)).toBeCloseTo(1, 6);
    expect(sRGBToLinear(0.5)).toBeCloseTo(0.2140, 3);
  });
  it('wraps angles into (-PI, PI]', () => {
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 6);
    expect(wrapAngle(-Math.PI * 2.5)).toBeCloseTo(-Math.PI / 2, 6);
  });
});
