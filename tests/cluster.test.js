import { beforeAll, describe, expect, it } from 'vitest';

let MasterKeychainCluster, chainElementAngle, simulateLoop;

beforeAll(async () => {
  // Minimal canvas so the emoji rasteriser runs under node.
  globalThis.document = {
    createElement: () => ({
      width: 0, height: 0,
      getContext: () => ({
        clearRect() {}, fillText() {},
        getImageData: (x, y, w, h) => {
          const data = new Uint8ClampedArray(w * h * 4);
          for (let i = 0; i < w * h; i++) { const px = i % w, py = Math.floor(i / w); if (px > 40 && px < 120 && py > 40 && py < 120) { data[i*4]=200; data[i*4+1]=60; data[i*4+2]=40; data[i*4+3]=255; } }
          return { data };
        },
      }),
    }),
  };
  ({ MasterKeychainCluster } = await import('../src/three/MasterKeychainCluster.js'));
  ({ chainElementAngle } = await import('../src/three/ClusterCharmBranch.js'));
  ({ simulateLoop } = await import('../src/three/exporters.js'));
});

function seeded(seed = 1) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function make(n, links = [4, 5, 4, 6, 7]) {
  const c = new MasterKeychainCluster({ rng: seeded() });
  for (let i = 0; i < n; i++) c.addCharm('x', 2, links[i]);
  c.resetPose();
  return c;
}

describe('chain geometry', () => {
  it('threads the bottom ring through the lug plane (YZ) for every link count', () => {
    for (let n = 4; n <= 10; n++) {
      const bottom = ((chainElementAngle(n + 1, n) % Math.PI) + Math.PI) % Math.PI;
      expect(bottom).toBeCloseTo(Math.PI / 2, 6);
    }
  });
  it('interlocks every neighbouring pair at 80 to 110 degrees', () => {
    for (let n = 4; n <= 10; n++) {
      for (let i = 0; i <= n; i++) {
        const d = (((chainElementAngle(i + 1, n) - chainElementAngle(i, n)) * 180) / Math.PI) % 180;
        expect(d).toBeGreaterThan(80);
        expect(d).toBeLessThan(110);
      }
    }
  });
});

describe('physics', () => {
  it('rests exactly at the rest pose for 1, 3 and 5 charms', () => {
    for (const n of [1, 3, 5]) {
      const c = make(n);
      c.wake();
      for (let f = 0; f < 600; f++) c.update(1 / 60);
      for (const b of c.branches) expect(Math.abs(b.sim.thetaX) + Math.abs(b.sim.thetaZ)).toBe(0);
      expect(c.asleep).toBe(true);
    }
  });
  it('longer chains swing slower', () => {
    const period = (links) => {
      const c = new MasterKeychainCluster({ rng: seeded() });
      c.addCharm('x', 2, links); c.resetPose();
      c.branches[0].sim.thetaZ = 0.3; c.wake();
      let t = 0, prev = 0.3; const crossings = [];
      for (let f = 0; f < 1200; f++) { c.update(1 / 120); t += 1 / 120; const cur = c.branches[0].sim.thetaZ; if (prev > 0 && cur <= 0) crossings.push(t); prev = cur; }
      return crossings[1] - crossings[0];
    };
    expect(period(10)).toBeGreaterThan(period(4) * 1.2);
  });
  it('is frame-rate independent (30 / 60 / 144 Hz agree within 3%)', () => {
    const run = (hz) => {
      const c = make(3); c.sim.omegaZ = 4; c.sim.omegaY = 6; c.wake();
      for (let f = 0; f < hz; f++) c.update(1 / hz);
      return [c.sim.thetaZ, c.branches[0].sim.thetaZ];
    };
    const base = run(60);
    for (const hz of [30, 144]) run(hz).forEach((v, i) => expect(Math.abs(v - base[i])).toBeLessThan(0.03));
  });
  it('wakes on impulse and goes back to sleep', () => {
    const c = make(3);
    expect(c.asleep).toBe(true);
    c.applyImpulse(1);
    expect(c.asleep).toBe(false);
    for (let f = 0; f < 60 * 60 && !c.asleep; f++) c.update(1 / 60);
    expect(c.asleep).toBe(true);
  });
  it('loadDesign replaces every charm and keeps the rest pose stable', () => {
    const c = make(2);
    c.loadDesign({ charms: [{ emoji: 'a', thickness: 1, links: 6 }, { emoji: 'b', thickness: 3, links: 10 }, { emoji: 'c', thickness: 2, links: 4 }], finish: 'gold', spread: 1.2 });
    expect(c.branches.map((b) => b.chainLinks)).toEqual([6, 10, 4]);
    expect(c.finish).toBe('gold');
    expect(c.asleep).toBe(true);
  });
});

describe('model', () => {
  it('split ring coils do not overlap (advance >= wire diameter per turn)', async () => {
    const { CONFIG } = await import('../src/constants/index.js');
    const c = make(1);
    const geo = c.ringMesh.geometry; geo.computeBoundingBox();
    const depth = geo.boundingBox.max.z - geo.boundingBox.min.z;
    expect(depth).toBeGreaterThan(CONFIG.masterRingWire * 2 * 2.1);
  });
  it('bounds are finite and the ring top fits the framing box', () => {
    const c = make(3);
    expect(Number.isFinite(c.restBounds.min.y) && Number.isFinite(c.restBounds.max.y)).toBe(true);
    expect(c.restBounds.max.y).toBeGreaterThan(c.anchorPos.y);
  });
  it('baked loops close seamlessly and use finite angles', () => {
    const c = make(3);
    for (const kind of ['swing', 'spin']) {
      const { record, frames } = simulateLoop(c, kind);
      const a = record[0], b = record[frames];
      expect(Math.abs(a.master.thetaX - b.master.thetaX)).toBeLessThan(1e-9);
      a.branches.forEach((br, i) => ['thetaX', 'thetaZ', 'charmX', 'charmZ'].forEach((f) => {
        expect(Math.abs(br[f] - b.branches[i][f])).toBeLessThan(1e-9);
        expect(Number.isFinite(br[f])).toBe(true);
      }));
    }
  });
});
