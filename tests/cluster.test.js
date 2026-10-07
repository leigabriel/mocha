import { beforeAll, describe, expect, it } from 'vitest';

import * as THREE from 'three';
import { MM_PER_UNIT } from '../src/constants/index.js';
import { obbFromMesh, obbPenetration } from '../src/three/collision.js';
import { maxPenetration } from '../src/three/dynamics.js';
import { createMasterState } from '../src/three/physics.js';

let MasterKeychainCluster, chainElementAngle, simulateLoop, prepareClusterExportRoot;

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
  ({ simulateLoop, prepareClusterExportRoot } = await import('../src/three/exporters.js'));
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

// Real rendered geometry: the character meshes' own bounding boxes, in world space.
function worstOverlap(c) {
  c.rootGroup.updateMatrixWorld(true);
  const boxes = c.branches.map((b) => obbFromMesh(b.charmData.characterMesh));
  const n = [new THREE.Vector3()][0];
  let worst = 0;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) worst = Math.max(worst, obbPenetration(boxes[i], boxes[j], n));
  }
  return worst * MM_PER_UNIT; // millimetres
}

describe('charm collision', () => {
  const TOL_MM = 0.35;
  it('hangs with no overlap at rest for every charm count and thickness', () => {
    for (const thickness of [1, 2, 3]) {
      for (let n = 2; n <= 5; n++) {
        const c = new MasterKeychainCluster({ rng: seeded(3) });
        for (let i = 0; i < n; i++) c.addCharm('x', thickness, [4, 5, 4, 6, 7][i]);
        c.resetPose();
        expect(worstOverlap(c)).toBeLessThan(TOL_MM);
      }
    }
  });
  it('never lets charms pass through each other while swinging', () => {
    for (const n of [2, 3, 5]) {
      const c = make(n);
      let worst = 0;
      for (let round = 0; round < 6; round++) {
        c.applyImpulse(1);
        c.applySpin(8);
        for (let f = 0; f < 240; f++) {
          c.update(1 / 60);
          worst = Math.max(worst, worstOverlap(c));
        }
      }
      expect(worst).toBeLessThan(TOL_MM * 4);
    }
  });
  it('bakes clips without overlap', () => {
    for (const kind of ['swing', 'spin', 'spinswing']) {
      const c = make(5);
      const { record } = simulateLoop(c, kind);
      const items = c.collisionItems();
      let worst = 0;
      const m = createMasterState();
      for (const frame of record) {
        Object.assign(m, frame.master);
        items.forEach((it, i) => Object.assign(it.sim, frame.branches[i]));
        worst = Math.max(worst, maxPenetration(m, items, c.spread));
      }
      expect(worst * MM_PER_UNIT).toBeLessThan(TOL_MM);
    }
  });
  it('spin + swing turns exactly 360 degrees and swings in the world frame', () => {
    const c = make(3);
    const { record, frames, clip } = simulateLoop(c, 'spinswing');
    expect(clip.name).toBe('Mocha_Spin_Swing');
    // yaw advances evenly by 360/frames each frame, then the last frame wraps onto the first
    const step = (Math.PI * 2) / frames;
    for (let k = 1; k < frames; k++) expect(record[k].master.thetaY - record[k - 1].master.thetaY).toBeCloseTo(step, 6);
    expect(record[frames].master.thetaY).toBe(record[0].master.thetaY);
    // world tilt (undo the yaw) must still swing: both axes move by several degrees
    let maxX = 0, maxZ = 0;
    for (const { master: m } of record) {
      const wx = m.thetaX * Math.cos(m.thetaY) + m.thetaZ * Math.sin(m.thetaY);
      const wz = -m.thetaX * Math.sin(m.thetaY) + m.thetaZ * Math.cos(m.thetaY);
      maxX = Math.max(maxX, Math.abs(wx));
      maxZ = Math.max(maxZ, Math.abs(wz));
    }
    expect(maxX).toBeGreaterThan(0.08);
    expect(maxZ).toBeGreaterThan(0.12);
  });
  it('draws no selection box and exports no tint', () => {
    const c = make(3);
    c.branches[0].setHighlight('selected');
    let lines = 0;
    c.rootGroup.traverse((o) => { if (o.isLine || o.isLineSegments) lines++; });
    expect(lines).toBe(0);
    const root = prepareClusterExportRoot(c);
    root.traverse((o) => { if (o.isMesh) expect(o.material.emissive?.getHex() ?? 0).toBe(0); });
  });
});

describe('physics', () => {
  it('settles exactly on its rest pose for 1, 3 and 5 charms', () => {
    for (const n of [1, 3, 5]) {
      const c = make(n);
      c.wake();
      for (let f = 0; f < 600; f++) c.update(1 / 60);
      for (const b of c.branches) {
        expect(b.sim.thetaX).toBe(b.restSim.thetaX);
        expect(b.sim.thetaZ).toBe(b.restSim.thetaZ);
      }
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
    for (const kind of ['swing', 'spin', 'spinswing']) {
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
