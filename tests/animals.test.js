// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { ANIMAL_IDS, SPECIES, clipsFor } from '../src/animals/species.js';
import { parseDescription } from '../src/animals/descriptions.js';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function () {
    const data = new Uint8ClampedArray(this.width * this.height * 4);
    const noop = () => {};
    return new Proxy({ canvas: this, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }), putImageData: noop, createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }), measureText: () => ({ width: 0 }), _d: data }, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
  };
});

describe('animals', () => {
  it('has ten species with valid clips', () => {
    expect(ANIMAL_IDS).toHaveLength(10);
    for (const id of ANIMAL_IDS) {
      const c = clipsFor(id);
      expect(c).toEqual(expect.arrayContaining(['idle', 'walk', 'run', 'eat', 'sleep']));
      expect(c.includes('fly')).toBe(!!SPECIES[id].canFly);
    }
  });

  it('builds every animal and its clips target existing bones', async () => {
    const { buildAnimal } = await import('../src/animals/builder.js');
    const { buildClips } = await import('../src/animals/clips.js');
    for (const id of ANIMAL_IDS) {
      const rig = buildAnimal(id);
      const clips = Object.values(buildClips(rig));
      expect(clips.length).toBe(clipsFor(id).length);
      const names = new Set();
      rig.root.traverse((o) => names.add(o.name));
      for (const clip of clips) {
        expect(clip.duration).toBeGreaterThan(0);
        for (const t of clip.tracks) expect(names.has(t.name.split('.')[0])).toBe(true);
      }
      rig.dispose?.();
    }
  }, 120000);

  it('parses a description', () => {
    const d = parseDescription('# Deer\n\nA text.\n\n## Colours\n- brown');
    expect(d).toBeTruthy();
  });
});
