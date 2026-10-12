import { Sculpt } from './sdf3.js';

/**
 * Head plans for the sculpted quadrupeds. Everything is in head-bone space (z forward, y up, origin where
 * the neck meets the skull) and measured in units of `h`, the head length from occiput to nose tip.
 * Each plan gives landmarks (for eyes, ears, nose, jaw pivot) and `build(S)` which adds the skull, muzzle,
 * cheeks, brows and the carved sockets / nostrils / mouth line to a Sculpt. `jaw(J)` sculpts the lower jaw
 * separately (it moves with the jaw bone).
 */

const sc = (v, h) => v.map((x) => x * h);

const PLANS = {
  dog: (h) => {
    const m = (a) => sc(a, h);
    return {
      eye: m([0.1, 0.085, 0.4]), eyeR: 0.042 * h, ear: m([0.125, 0.2, 0.08]), nose: m([0, 0.0, 0.94]), noseR: m([0.075, 0.055, 0.06]),
      jaw: m([0, -0.075, 0.12]), fang: m([0.075, -0.08, 0.74]).concat([0.012 * h]),
      build(S) {
        // skull and brow
        S.ellipsoid(m([0, 0.06, 0.2]), m([0.215, 0.2, 0.25]), { k: 0.05 * h });
        S.ellipsoid(m([0, 0.1, 0.34]), m([0.17, 0.11, 0.16]), { k: 0.05 * h });
        S.ellipsoid(m([0.085, 0.135, 0.37]), m([0.065, 0.04, 0.075]), { mirror: true, k: 0.03 * h });
        // sagittal crest and occiput
        S.ellipsoid(m([0, 0.17, 0.06]), m([0.06, 0.05, 0.14]), { k: 0.04 * h });
        // cheeks / jaw muscle
        S.ellipsoid(m([0.125, -0.035, 0.17]), m([0.09, 0.12, 0.15]), { mirror: true, k: 0.05 * h });
        // throat underside
        S.ellipsoid(m([0, -0.075, 0.17]), m([0.15, 0.1, 0.18]), { k: 0.05 * h });
        // muzzle: broad at the base, tapering to the nose
        S.cone(m([0, 0.0, 0.4]), m([0, -0.03, 0.8]), 0.145 * h, 0.105 * h, { k: 0.06 * h, s: [1, 0.88, 1] });
        S.cone(m([0, 0.075, 0.4]), m([0, 0.03, 0.9]), 0.065 * h, 0.052 * h, { k: 0.03 * h });
        // upper lips (flews)
        S.ellipsoid(m([0.08, -0.055, 0.64]), m([0.07, 0.07, 0.17]), { mirror: true, k: 0.03 * h });
        S.ellipsoid(m([0, 0.0, 0.9]), m([0.085, 0.062, 0.07]), { k: 0.03 * h });
        // carve: eye sockets, nostrils, mouth line
        S.ellipsoid(m([0.105, 0.09, 0.405]), m([0.042, 0.04, 0.042]), { sub: true, mirror: true, k: 0.02 * h });
        S.ellipsoid(m([0.036, 0.0, 0.96]), m([0.022, 0.016, 0.03]), { sub: true, mirror: true, k: 0.015 * h });
        S.cone(m([0.085, -0.055, 0.9]), m([0.115, -0.07, 0.46]), 0.006 * h, 0.006 * h, { sub: true, mirror: true, k: 0.01 * h });
      },
      jawParts(S) {
        S.ellipsoid(m([0.09, -0.1, 0.16]), m([0.055, 0.075, 0.14]), { mirror: true, k: 0.04 * h });
        S.cone(m([0.06, -0.09, 0.3]), m([0.04, -0.075, 0.76]), 0.075 * h, 0.06 * h, { mirror: true, k: 0.04 * h });
        S.ellipsoid(m([0, -0.075, 0.8]), m([0.065, 0.055, 0.07]), { k: 0.03 * h });
      },
    };
  },
};

export const hasHeadPlan = (id) => !!PLANS[id];
export const headPlan = (id, h) => PLANS[id](h);
export const jawSculpt = (id, h, pivot, frame) => {
  const S = new Sculpt();
  S.setFrame(frame);
  PLANS[id](h).jawParts(S);
  void pivot;
  return S;
};
