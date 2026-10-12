import * as THREE from 'three';

const V = (x, y, z) => [x, y, z];
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Per-species body proportions; everything else comes from the rig's joints. */
export const BODY = {
  dog: { w: 0.62, withers: 0.86, rump: 0.78, elbow: 0.35, rib: 1.0, loin: 0.8, pel: 0.92, chestK: 0.97, arm: 1.0, thigh: 1.0, neck: [1.0, 0.8], neckBulk: 0.95, fore: 0.62, carpus: 0.45, meta: 0.4, gask: 0.7, hockPt: 0.5 },
};

/**
 * Adds the torso, neck and four legs of a quadruped to the sculpt `S` (world space, rest pose).
 * J = { FL, BL: { u, l, p } joint positions as [x,y,z] on the animal's left side } and the body frame numbers.
 */
export function addQuadBody(S, { id, sp, J, Hb, neckBase, neckTop, footH }) {
  const P = BODY[id];
  const L = sp.bodyLen;
  const W = sp.bodyW * P.w;
  const lr = sp.legR;
  const F = J.FL;
  const B = J.BL;
  const yS = F.u[1];
  const yH = B.u[1];
  const zS = F.u[2];
  const zH = B.u[2];
  const Hw = Hb + sp.bodyH * P.withers;
  const Hr = Hb + sp.bodyH * P.rump;
  const chestBottom = yS - sp.upper * P.elbow;
  const D = (Hw - chestBottom) * P.chestK;
  const ribC = chestBottom + D * 0.5;

  // ---- ribcage, loin, pelvis and the straight back line
  S.ellipsoid(V(0, ribC, 0.22 * L), V(W * P.rib, D * 0.52, 0.27 * L), { k: 0.05 });
  const topLoin = lerp(Hw, Hr, 0.55);
  const dl = D * 0.8;
  S.ellipsoid(V(0, topLoin - dl * 0.5, -0.05 * L), V(W * P.loin, dl * 0.5, 0.2 * L), { k: 0.05 });
  const dp = D * 0.9;
  S.ellipsoid(V(0, Hr - dp * 0.5, -0.33 * L), V(W * P.pel, dp * 0.5, 0.17 * L), { k: 0.05 });
  S.cone(V(0, Hw - 0.02, 0.24 * L), V(0, Hr - 0.02, -0.38 * L), W * 0.5, W * 0.5, { k: 0.04 });
  // brisket
  S.ellipsoid(V(0, chestBottom + D * 0.12, 0.34 * L), V(W * 0.62, D * 0.3, 0.13 * L), { k: 0.05 });

  // ---- neck, set into the shoulders and tapering to the skull
  const nMid = lerp3(neckBase, neckTop, 0.5);
  const nr0 = Math.max(W * P.neck[0], sp.neckR * 0.95);
  const nr1 = sp.neckR * P.neckBulk;
  S.cone(V(0, Hw - D * 0.28, 0.2 * L), neckBase, nr0 * 1.05, nr0, { k: 0.06 });
  S.cone(neckBase, nMid, nr0, nr1 * 1.02, { k: 0.05 });
  S.cone(nMid, neckTop, nr1 * 1.02, nr1 * P.neck[1], { k: 0.05 });

  // ---- front legs: shoulder blade, upper arm, forearm, carpus, metacarpus
  const sx = F.u[0];
  const toCarpus = F.l;
  const elbow = V(sx, yS - sp.upper * P.elbow * 0.35, zS - 0.04 * L);
  S.ellipsoid(V(W * 0.74, lerp(yS, Hw, 0.62), zS - 0.01 * L), V(W * 0.36, (Hw - yS) * 0.55, 0.095 * L), { rot: [-16, 0, -6], mirror: true, k: 0.05 });
  S.cone(V(W * 0.7, lerp(yS, Hw, 0.25), zS + 0.03 * L), elbow, lr * 1.6 * P.arm, lr * 1.25 * P.arm, { mirror: true, k: 0.05 });
  S.cone(elbow, toCarpus, lr * 1.2 * P.fore / 0.62, lr * 0.78, { mirror: true, k: 0.04, s: [0.85, 1, 1.12] });
  S.ellipsoid(add3(toCarpus, V(0, 0.004, -lr * 0.55)), V(lr * 0.55, lr * 0.75, lr * 0.7), { mirror: true, k: 0.02 });
  S.cone(toCarpus, add3(F.p, V(0, -footH * 0.25, 0)), lr * 0.78 * (P.carpus / 0.45), lr * 0.62, { mirror: true, k: 0.03, s: [0.85, 1, 1.1] });

  // ---- hind legs: haunch, thigh to the stifle, gaskin to the hock, then the metatarsus
  const hx = B.u[0];
  const hock = B.l;
  const hipTop = V(W * 0.8, Hr - dp * 0.2, zH - 0.02 * L);
  const stifle = add3(lerp3(B.u, hock, 0.45), V(0, -0.012, Math.hypot(hock[1] - B.u[1], hock[2] - B.u[2]) * 0.24));
  S.ellipsoid(V(W * 0.8, lerp(yH, Hr, 0.5), zH - 0.01 * L), V(W * 0.4, (Hr - yH) * 0.5, 0.095 * L), { mirror: true, k: 0.05 });
  S.cone(hipTop, stifle, W * 0.5 * P.thigh, lr * 1.6, { mirror: true, k: 0.06 });
  S.cone(stifle, hock, lr * 1.6, lr * P.gask * 1.25, { mirror: true, k: 0.05, s: [0.85, 1, 1.15] });
  S.ellipsoid(add3(hock, V(0, 0.012, -lr * 0.8)), V(lr * 0.5, lr * 0.85, lr * 0.9), { mirror: true, k: 0.03 });
  S.cone(hock, add3(B.p, V(0, -footH * 0.25, 0)), lr * 0.78, lr * 0.62, { mirror: true, k: 0.03, s: [0.85, 1, 1.1] });

  // ---- padded paws (cats, dogs): ball of the foot and four toes with grooves between them
  if (sp.foot === 'paw') {
    const pawLen = lr * (id === 'tiger' ? 2.4 : 2.1);
    for (const Q of [F, B]) {
      const p = Q.p;
      S.ellipsoid(add3(p, V(0, -footH * 0.5, pawLen * 0.28)), V(lr * 0.88, footH * 0.56, pawLen * 0.55), { mirror: true, k: 0.015 });
      for (let k = 0; k < 4; k++) {
        const x = (k - 1.5) * lr * 0.46;
        const z = pawLen * (0.78 + (k === 1 || k === 2 ? 0.1 : 0));
        S.ellipsoid(add3(p, V(Math.abs(x) + 0.0, -footH * 0.66, z)), V(lr * 0.26, footH * 0.34, lr * 0.4), { k: 0.004, mirror: true });
      }
      for (const gx of [0.23, 0.69]) {
        S.cone(add3(p, V(gx * lr * 0.9, -footH * 0.55, pawLen * 0.62)), add3(p, V(gx * lr * 0.92, -footH * 0.62, pawLen * 1.18)), lr * 0.035, lr * 0.03, { sub: true, mirror: true, k: 0.004 });
      }
    }
  }
  void THREE;
  void hx;
  void toCarpus;
  return { Hw, Hr, chestBottom, D, footH };
}
