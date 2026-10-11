import * as THREE from 'three';
import { curve, loft, skinTo } from './loft.js';
import { coverLoft, featherCard, placeFeather } from './feathers.js';
import { eyeTexture, featherTextures, furTextures, keratinTextures, skinTextures } from './textures.js';
import { ellipsoid, merge, rad, rng } from './parts.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Builds a bird: smooth body, feathered neck/head, individually layered wing and tail feathers. */
export function buildBird(ctx) {
  const { spec: sp, palette: c, opt: o, root, bone, add, own } = ctx;
  const id = sp.id;
  const rnd = rng(id.length * 53 + 5);
  const p = rad(sp.pitch);
  const R = sp.bodyR;
  const Lb = sp.bodyLen;
  const ostrich = id === 'ostrich';
  const Hb = sp.legLen + R * 0.7;

  // ------------------------------------------------------------------ bones (same names as before)
  const body = bone('Body', root, [0, Hb, 0], [-p, 0, 0]);
  const [t1, t2] = [rad(sp.neckTilt[0]), rad(sp.neckTilt[1])];
  const nl = sp.neckLen / 2;
  const neck1 = bone('Neck1', body, [0, R * 0.3, Lb * 0.42], [t1 + p, 0, 0]);
  const neck2 = bone('Neck2', neck1, [0, nl, 0], [t2 - t1, 0, 0]);
  const head = bone('Head', neck2, [0, nl, 0], [-t2, 0, 0]);
  const H = sp.headR;
  const bk = sp.beak;
  const jaw = bone('Jaw', head, [0, -H * 0.3, H * 0.62]);
  const eyes = [['EyeL', 1], ['EyeR', -1]].map(([n, sx]) => [bone(n, head, [sx * H * 0.78, H * 0.22, H * (ostrich ? 0.3 : 0.28)]), sx]);
  const w = sp.wing;
  const wings = {};
  for (const [S, sd] of [['L', 1], ['R', -1]]) {
    const w1 = bone(`Wing${S}_1`, body, [sd * R * 0.8, R * 0.5, Lb * 0.08], [0, sd * rad(90), 0]);
    const w2 = bone(`Wing${S}_2`, w1, [sd * w.l1, 0, 0], [0, sd * rad(-170), 0]);
    const w3 = bone(`Wing${S}_3`, w2, [sd * w.l2, 0, 0], [0, sd * rad(170), 0]);
    wings[S] = { w1, w2, w3, sd };
  }
  const tail = bone('Tail', body, [0, R * 0.1, -Lb * 0.46], [p - 0.05, 0, 0]);
  const th = sp.legLen * (ostrich ? 0.36 : 0.32);
  const sh = sp.legLen * 0.46;
  const fh = Math.max(0.012, sp.legLen - th - sh);
  const legs = {};
  for (const [S, sx] of [['L', 1], ['R', -1]]) {
    const thigh = bone(`Leg${S}_Thigh`, body, [sx * R * 0.5, -R * 0.55, -Lb * 0.05], [p + 0.3, 0, 0]);
    const shin = bone(`Leg${S}_Shin`, thigh, [0, -th, 0], [-0.55, 0, 0]);
    const foot = bone(`Leg${S}_Foot`, shin, [0, -sh, 0], [0.25, 0, 0]);
    legs[S] = { thigh, shin, foot, sx };
  }

  // stand on the ground: measure the toe tips in the rest pose and drop the body
  root.updateMatrixWorld(true);
  let lowest = Infinity;
  for (const S of ['L', 'R']) lowest = Math.min(lowest, legs[S].foot.localToWorld(V(0, -fh, 0)).y);
  body.position.y -= lowest;
  root.updateMatrixWorld(true);
  const W = (b, x = 0, y = 0, z = 0) => b.localToWorld(V(x, y, z));
  const idxOf = (b) => ctx.boneIndex(b);

  // ------------------------------------------------------------------ materials
  const mk = (name, tex, extra = {}) => {
    Object.values(tex).forEach(own);
    const m = new THREE.MeshPhysicalMaterial({ ...tex, roughness: 1, metalness: 0, side: THREE.DoubleSide, ...extra });
    m.name = `${id}_${name}`;
    own(m);
    return m;
  };
  const feather = (name, base, edge, extra = {}, texExtra = {}) => mk(name, featherTextures({ base, edge, size: 256, seed: name.length * 7 + id.length, ...texExtra }), { sheen: 0.4, sheenRoughness: 0.7, sheenColor: new THREE.Color(base).lerp(new THREE.Color('#ffffff'), 0.5), normalScale: new THREE.Vector2(0.9, 0.9), ...extra });
  const headWhite = id === 'eagle' && o.whiteHead;
  const mCoat = feather('feather_body', c.coat, new THREE.Color(c.coat).multiplyScalar(0.7).getStyle(), {}, { bars: id === 'eagle' || id === 'dove' });
  const mBelly = feather('feather_belly', c.belly, new THREE.Color(c.belly).multiplyScalar(0.85).getStyle());
  const mWing = feather('feather_wing', c.wing, new THREE.Color(c.wing).multiplyScalar(0.55).getStyle(), {}, { bars: id === 'eagle' || id === 'dove' });
  const mFlight = feather('feather_flight', id === 'parrot' ? c.accent : c.wing, c.dark, {}, { bars: id === 'eagle' });
  const mTail = feather('feather_tail', headWhite ? c.accent : id === 'parrot' ? c.accent : c.coat, new THREE.Color(c.dark).getStyle(), {}, { bars: false });
  const mHead = feather('feather_head', headWhite ? c.accent : c.coat, new THREE.Color(headWhite ? c.accent : c.coat).multiplyScalar(0.75).getStyle());
  const sheenM = o.sheen ? feather('feather_sheen', c.accent, c.accent, { metalness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0 }) : null;
  const skinTex = (name, base, deep, scales, size = 256) => mk(name, skinTextures({ base, deep, wrinkle: scales ? 'pebble' : 'fine', scales, size }), { clearcoat: 0.2, clearcoatRoughness: 0.6, side: THREE.FrontSide });
  const mLeg = skinTex('leg', c.skin, new THREE.Color(c.skin).multiplyScalar(0.7).getStyle(), true);
  const mHeadSkin = skinTex('head_skin', ostrich ? c.skin : c.skin, new THREE.Color(c.skin).multiplyScalar(0.8).getStyle(), false);
  const beakTex = keratinTextures({ base: c.beak, tip: new THREE.Color(c.beak).multiplyScalar(0.8).getStyle(), size: 256, streak: 0.8, rough: [0.3, 0.55] });
  const mBeak = mk('beak', beakTex, { clearcoat: 0.45, clearcoatRoughness: 0.35, side: THREE.FrontSide });
  const clawTex = keratinTextures({ base: '#2a2420', tip: '#15110e', size: 256, streak: 1.2, rough: [0.3, 0.5] });
  const mClaw = mk('claw', clawTex, { clearcoat: 0.4, side: THREE.FrontSide });
  const eyeCol = { parrot: '#c46a1a', dove: '#c9582a', eagle: '#e0a21c', ostrich: '#3a2a1c' }[id];
  const eTex = eyeTexture({ iris: eyeCol, pupil: 'round', sclera: ostrich ? '#6a5a4a' : '#2a1c14', size: 256 });
  own(eTex);
  const eyeM = new THREE.MeshPhysicalMaterial({ map: eTex, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03 });
  eyeM.name = `${id}_eye`;
  own(eyeM);
  const furBase = (kind) => furTextures({ region: 'tail', kind: 'plain', coat: kind, belly: kind, dark: c.dark, accent: kind, size: 256, seed: 3 });
  const mUnder = mk('under', furBase(c.coat), { side: THREE.FrontSide, normalScale: new THREE.Vector2(0.5, 0.5) });

  // ------------------------------------------------------------------ body (rigid under Body)
  const bodyPath = [V(0, 0, -Lb * 0.52), V(0, 0, -Lb * 0.3), V(0, 0, 0), V(0, 0.01, Lb * 0.26), V(0, 0.02, Lb * 0.52)];
  const bodyShape = id === 'ostrich'
    ? { rx: [[0, 0.3], [0.2, 0.85], [0.5, 1.0], [0.8, 0.9], [1, 0.45]], ry: [[0, 0.3], [0.2, 0.85], [0.5, 1.0], [0.8, 0.92], [1, 0.5]] }
    : { rx: [[0, 0.22], [0.2, 0.7], [0.5, 1.0], [0.78, 0.95], [1, 0.5]], ry: [[0, 0.2], [0.2, 0.68], [0.5, 0.98], [0.78, 1.0], [1, 0.52]] };
  const bodyGeo = loft(bodyPath, { rx: curve(bodyShape.rx.map(([t, v]) => [t, v * R])), ry: curve(bodyShape.ry.map(([t, v]) => [t, v * R * 0.97])), segs: 36, rings: 40, up: [0, 1, 0], round: [0.03, 0.06] });
  add(body, bodyGeo, mUnder, 'BodyCore');
  // feather coat: dorsal rows in the body colour, ventral rows in the belly colour
  const coat = (skipFn, mat, name, opts) => {
    const g = coverLoft(bodyGeo, { skip: skipFn, ...opts });
    if (g) add(body, g, mat, name);
  };
  const size = ostrich ? 1.0 : 1;
  const fl = R * (ostrich ? 0.55 : 0.46) * size;
  const fw = R * (ostrich ? 0.5 : 0.4) * size;
  const dorsal = (t, u) => Math.sin(u * Math.PI * 2) < -0.05;
  coat(dorsal, mCoat, 'FeathersBack', { stepRings: ostrich ? 3 : 2, per: ostrich ? 14 : 22, len: fl, width: fw, tilt: ostrich ? 0.05 : 0.05, dir: -1, seed: 3, jitter: 0.12, cardOpts: { curl: 0.15, bow: 0.03 } });
  coat((t, u) => !dorsal(t, u), mBelly, 'FeathersBelly', { stepRings: 2, per: ostrich ? 10 : 22, len: fl * 0.9, width: fw, tilt: 0.04, dir: -1, seed: 9, jitter: 0.12, cardOpts: { curl: 0.15, bow: 0.03 } });

  // ------------------------------------------------------------------ neck (skinned across Neck1/Neck2)
  const n0 = W(neck1);
  const n1 = W(neck2);
  const n2 = W(head);
  const nr = Math.max(0.012, H * (ostrich ? 0.5 : 0.95));
  const neckPts = [n0.clone().lerp(n1, -0.25), n0, n1, n2.clone().lerp(n1, -0.0)];
  neckPts.push(n2.clone().addScaledVector(n2.clone().sub(n1).normalize(), H * 0.4));
  const neckGeo = loft(neckPts, { rx: curve([[0, nr * 2.0], [0.3, nr * 1.5], [0.7, nr * 1.15], [1, nr * 0.95]]), ry: curve([[0, nr * 2.0], [0.3, nr * 1.5], [0.7, nr * 1.15], [1, nr * 0.95]]), segs: 20, rings: 40, up: [0, 0, 1], round: [0.02, 0.0] });
  const neckBones = [
    { index: idxOf(body), a: n0.clone().lerp(n1, -0.4), b: n0 },
    { index: idxOf(neck1), a: n0, b: n1 },
    { index: idxOf(neck2), a: n1, b: n2 },
  ];
  skinTo(neckGeo, neckBones, { power: 3 });
  ctx.skinned(neckGeo, ostrich ? mHeadSkin : mUnder, 'Neck');
  if (!ostrich) {
    const nf = coverLoft(neckGeo, { stepRings: 2, per: 12, len: nr * 0.9, width: nr * 0.9, tilt: 0.05, dir: -1, seed: 21, jitter: 0.12, cardOpts: { curl: 0.15, bow: 0.03 }, skip: (t) => t > 0.97 });
    if (nf) {
      skinTo(nf, neckBones, { power: 3 });
      ctx.skinned(nf, headWhite ? mHead : mCoat, 'NeckFeathers');
    }
    if (sheenM) {
      const nsg = coverLoft(neckGeo, { stepRings: 2, per: 12, len: nr * 0.9, width: nr * 0.9, tilt: 0.07, dir: -1, seed: 5, jitter: 0.12, cardOpts: { curl: 0.15, bow: 0.03 }, skip: (t) => t < 0.55 || t > 0.95 });
      if (nsg) {
        skinTo(nsg, neckBones, { power: 3 });
        ctx.skinned(nsg, sheenM, 'NeckSheen');
      }
    }
  } else {
    // sparse neck down on the ostrich
    const nd = coverLoft(neckGeo, { stepRings: 4, per: 8, len: nr * 0.9, width: nr * 0.6, tilt: 0.25, dir: -1, seed: 31, jitter: 0.5, skip: (t) => t > 0.9 || t < 0.04 });
    if (nd) {
      skinTo(nd, neckBones, { power: 3 });
      ctx.skinned(nd, mBody2(c.dark), 'NeckDown');
    }
  }
  function mBody2(col) {
    return feather('feather_down', col, col);
  }

  // ------------------------------------------------------------------ head (rigid under Head)
  const hGeo = loft([V(0, 0, -H * 0.9), V(0, 0, -H * 0.2), V(0, 0, H * 0.5), V(0, -H * 0.05, H * 0.95)], {
    rx: curve([[0, H * 0.7], [0.3, H * 1.0], [0.75, H * 0.8], [1, H * 0.5]]), ry: curve([[0, H * 0.72], [0.3, H * 1.0], [0.75, H * 0.82], [1, H * 0.5]]),
    segs: 24, rings: 24, up: [0, 1, 0], round: [0.06, 0.1],
  });
  add(head, hGeo, ostrich ? mHeadSkin : mUnder, 'Skull');
  if (!ostrich) {
    const hf = coverLoft(hGeo, { stepRings: 2, per: 12, len: H * 0.55, width: H * 0.6, tilt: 0.05, dir: -1, seed: 41, jitter: 0.12, cardOpts: { curl: 0.15, bow: 0.03 }, skip: (t) => t > 0.8 });
    if (hf) add(head, hf, mHead, 'HeadFeathers');
  }
  // beak: lofted, curved for hooked species
  const beakPath = (len, drop, yo = 0) => [V(0, yo, 0), V(0, yo - drop * 0.1, len * 0.4), V(0, yo - drop * 0.4, len * 0.78), V(0, yo - drop, len * 0.98)];
  const upper = loft(beakPath(bk.len, bk.hook ? bk.h * 0.55 : bk.h * 0.05), {
    rx: curve([[0, bk.h * (ostrich ? 0.9 : 0.55)], [0.6, bk.h * (ostrich ? 0.7 : 0.4)], [1, bk.h * (ostrich ? 0.5 : 0.1)]]), ry: curve([[0, bk.h * (ostrich ? 0.28 : 0.55)], [0.6, bk.h * (ostrich ? 0.2 : 0.45)], [1, bk.h * (ostrich ? 0.14 : 0.1)]]),
    segs: 14, rings: 16, up: [0, 1, 0], round: [0.02, 0.18],
  });
  add(head, upper, mBeak, 'BeakUpper', [0, -H * 0.02, H * 0.72]);
  const lower = loft(beakPath(bk.len * 0.85, bk.hook ? bk.h * 0.15 : 0), {
    rx: curve([[0, bk.h * (ostrich ? 0.8 : 0.42)], [1, bk.h * (ostrich ? 0.4 : 0.1)]]), ry: curve([[0, bk.h * (ostrich ? 0.2 : 0.32)], [1, bk.h * 0.08]]), segs: 12, rings: 12, up: [0, 1, 0], round: [0.02, 0.2],
  });
  add(jaw, lower, mBeak, 'BeakLower', [0, 0, 0]);
  if (id === 'parrot' || id === 'dove' || id === 'eagle') add(head, ellipsoid(H * 0.34, H * 0.2, H * 0.3, 10), id === 'dove' ? mHeadSkin : mBeak, 'Cere', [0, H * 0.1, H * 0.78]);
  // eyes with lids
  for (const [eb, sx] of eyes) {
    const r = Math.max(0.006, H * (ostrich ? 0.26 : 0.22));
    const eg = new THREE.SphereGeometry(r, 20, 16);
    const pos = eg.getAttribute('position');
    const uv = eg.getAttribute('uv');
    for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2 * r), 0.5 - pos.getY(i) / (2 * r));
    const m = add(eb, eg, eyeM, `${eb.name}_Ball`);
    m.rotation.y = sx * 1.0;
    const lid = add(eb, new THREE.TorusGeometry(r * 1.05, r * 0.2, 6, 16), id === 'parrot' ? mHeadSkin : mClaw, `${eb.name}_Lid`);
    lid.rotation.y = sx * 1.0;
    lid.scale.set(1, 1, 0.7);
    if (id === 'parrot') add(eb, new THREE.TorusGeometry(r * 1.9, r * 0.45, 6, 18), mHeadSkin, `${eb.name}_Ring`).rotation.y = sx * 1.0;
    if (id === 'eagle') add(head, ellipsoid(H * 0.34, H * 0.1, H * 0.55, 8), mClaw, `${eb.name}_Brow`, [sx * H * 0.7, H * 0.5, H * 0.3]);
  }

  // ------------------------------------------------------------------ wings
  const card = featherCard({ len: 1, width: 1, curl: 0.12, bow: 0.08, rows: 8, cols: 4 });
  const pcard = featherCard({ len: 1, width: 1, curl: 0.1, bow: 0.1, rows: 10, cols: 4, tip: 'point' });
  const flight = (S, sd, bn, items, mat, name) => {
    const list = items.map(({ pos, dir, len, wid, roll }) => {
      const g = card.clone();
      g.scale(wid, len, len);
      return placeFeather(g, pos, dir, V(0, 1, 0), 1, roll ?? 0);
    });
    if (list.length) add(bn, merge(list), mat, `Wing${S}_${name}`);
    void sd;
  };
  for (const S of ['L', 'R']) {
    const { w1, w2, w3, sd } = wings[S];
    const dirOut = (deg) => V(Math.cos(rad(deg)) * sd, 0, -Math.sin(rad(deg))).normalize();
    // arm: leather leading edge + short coverts
    add(w1, loft([V(0, 0, 0), V(sd * w.l1 * 0.5, 0, 0), V(sd * w.l1, 0, 0)], { rx: curve([[0, R * 0.2], [1, R * 0.14]]), ry: curve([[0, R * 0.18], [1, R * 0.12]]), segs: 10, rings: 10, up: [0, 1, 0], round: [0.05, 0.1] }), mUnder, `Wing${S}_Arm`);
    const cov1 = [];
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 6; k++) {
        const x = sd * w.l1 * ((k + 0.4 * r) / 6);
        cov1.push({ pos: V(x, 0.003 * (r + 1), -w.chord * (0.05 + r * 0.12)), dir: dirOut(-100 + (rnd() - 0.5) * 8).setX(sd * 0.1 * (rnd() - 0.4)).setZ(-1), len: w.chord * (0.45 + r * 0.18), wid: w.chord * 0.34, roll: (rnd() - 0.5) * 0.2 });
      }
    }
    flight(S, sd, w1, cov1, mCoat, 'CovertsArm');
    // forearm: secondaries along the trailing edge, with coverts over them
    const sec = [];
    const nS = ostrich ? 10 : 9;
    for (let k = 0; k < nS; k++) {
      const u = k / (nS - 1);
      sec.push({ pos: V(sd * w.l2 * u, -0.002 * k, -w.chord * 0.2), dir: V(sd * (0.18 - 0.28 * u + 0.1), 0, -1).normalize(), len: w.chord * (1.05 - 0.12 * u) * (ostrich ? 1.1 : 1), wid: Math.max(0.02, w.l2 / nS * 2.4), roll: (rnd() - 0.5) * 0.12 });
    }
    flight(S, sd, w2, sec, mFlight, 'Secondaries');
    const cov2 = [];
    for (let r = 0; r < 2; r++) {
      for (let k = 0; k < 8; k++) cov2.push({ pos: V(sd * w.l2 * (k / 8 + r * 0.03), 0.006 + r * 0.002, -w.chord * (0.05 + r * 0.16)), dir: V(sd * 0.1, 0, -1), len: w.chord * (0.5 + r * 0.2), wid: w.l2 / 8 * 1.6, roll: (rnd() - 0.5) * 0.15 });
    }
    flight(S, sd, w2, cov2, mWing, 'CovertsFore');
    // hand: primaries fanned out along the wing tip, each one separate
    const prim = [];
    const nP = ostrich ? 9 : 10;
    for (let k = 0; k < nP; k++) {
      const u = k / (nP - 1);
      const ang = 8 + u * 62;
      const d = dirOut(ang);
      prim.push({ pos: V(sd * w.l3 * (0.12 + 0.5 * u), -0.004 * k, -w.chord * 0.12 * u), dir: d, len: (w.l3 * 1.05 + w.chord * 0.35) * (1 - u * 0.42), wid: Math.max(0.018, w.chord * 0.3), roll: (rnd() - 0.5) * 0.1 });
    }
    {
      const list = prim.map(({ pos, dir, len, wid, roll }) => {
        const g = pcard.clone();
        g.scale(wid, len, len);
        return placeFeather(g, pos, dir, V(0, 1, 0), 1, roll);
      });
      add(w3, merge(list), mFlight, `Wing${S}_Primaries`);
    }
    const cov3 = [];
    for (let k = 0; k < 7; k++) cov3.push({ pos: V(sd * w.l3 * (k / 7 * 0.7), 0.007, -w.chord * 0.04), dir: dirOut(25 + k * 4), len: w.chord * 0.55, wid: w.chord * 0.2, roll: 0 });
    flight(S, sd, w3, cov3, mWing, 'CovertsHand');
  }

  // ------------------------------------------------------------------ tail fan
  {
    const tl = sp.tail;
    const list = [];
    for (let i = 0; i < tl.feathers; i++) {
      const u = tl.feathers === 1 ? 0 : i / (tl.feathers - 1) - 0.5;
      const ang = u * (tl.feathers > 3 ? 0.9 : 0.6);
      const dir = V(Math.sin(ang), 0, -Math.cos(ang));
      const len = tl.len * (1 - Math.abs(u) * (id === 'parrot' ? 0.15 : 0.18));
      const wid = Math.max(0.02, (tl.w / tl.feathers) * 1.9);
      const g = card.clone();
      g.scale(wid, len, len);
      list.push(placeFeather(g, V(u * tl.w * 0.15, 0.002 * i, 0), dir, V(0, 1, 0), 1, 0));
    }
    add(tail, merge(list), mTail, 'TailFeathers');
    // under-tail coverts
    const cov = [];
    for (let i = 0; i < 6; i++) {
      const u = i / 5 - 0.5;
      const g = card.clone();
      g.scale(R * 0.4, tl.len * 0.4, tl.len * 0.4);
      cov.push(placeFeather(g, V(u * R * 0.5, 0.012, R * 0.1), V(u * 0.3, 0, -1), V(0, 1, 0), 1, 0));
    }
    add(tail, merge(cov), mCoat, 'TailCoverts');
  }

  // ------------------------------------------------------------------ legs and feet
  for (const S of ['L', 'R']) {
    const { thigh, shin, foot, sx } = legs[S];
    const a = W(thigh);
    const b = W(shin);
    const cpos = W(foot);
    const toe0 = W(foot, 0, -fh, 0);
    const lp = [a.clone().add(V(0, R * 0.3, 0)), a, b, cpos, toe0];
    const tr = Math.max(0.005, R * 0.1);
    const lg = loft(lp, {
      rx: curve([[0, R * 0.42], [0.25, R * (ostrich ? 0.3 : 0.38)], [0.38, tr * (ostrich ? 3.2 : 1.6)], [0.5, tr * (ostrich ? 2.2 : 1.25)], [0.55, tr * 1.1], [0.78, tr * 1.15], [1, tr * 1.0]]),
      ry: curve([[0, R * 0.44], [0.25, R * (ostrich ? 0.32 : 0.4)], [0.38, tr * (ostrich ? 3.4 : 1.7)], [0.5, tr * (ostrich ? 2.4 : 1.3)], [0.55, tr * 1.1], [0.78, tr * 1.1], [1, tr * 0.95]]),
      segs: 14, rings: 30, up: [0, 0, 1], round: [0.06, 0.0],
    });
    skinTo(lg, [{ index: idxOf(body), a: a.clone().add(V(0, R * 0.6, 0)), b: a }, { index: idxOf(thigh), a, b }, { index: idxOf(shin), a: b, b: cpos }, { index: idxOf(foot), a: cpos, b: toe0 }], { power: 3 });
    ctx.skinned(lg, mLeg, `Leg${S}_Skinned`);
    // thigh plumage (ostrich thighs are bare)
    if (!ostrich) {
      const tg = coverLoft(lg, { stepRings: 2, per: 10, len: R * 0.7, width: R * 0.45, tilt: 0.3, dir: -1, seed: 71, skip: (t) => t > 0.3 });
      if (tg) {
        skinTo(tg, [{ index: idxOf(body), a: a.clone().add(V(0, R * 0.6, 0)), b: a }, { index: idxOf(thigh), a, b }, { index: idxOf(shin), a: b, b: cpos }, { index: idxOf(foot), a: cpos, b: toe0 }], { power: 3 });
        ctx.skinned(tg, mBelly, `Leg${S}_Plumage`);
      }
    }
    // toes + claws
    const toeLen = Math.max(0.03, fh * 1.4 + R * 0.35);
    const toes = [];
    const claws = [];
    const place = (ang, len, scale, big) => {
      const rr = tr * scale;
      const path = [V(0, 0, 0), V(Math.sin(ang) * len * 0.5, -rr * 0.2, Math.cos(ang) * len * 0.5), V(Math.sin(ang) * len, -rr * 0.7, Math.cos(ang) * len)];
      toes.push(loft(path, { rx: curve([[0, rr * 1.25], [1, rr * 0.75]]), ry: curve([[0, rr * 1.1], [1, rr * 0.65]]), segs: 8, rings: 10, up: [0, 1, 0], round: [0.05, 0.25] }));
      const ex = Math.sin(ang) * len;
      const ez = Math.cos(ang) * len;
      const cl = rr * (big ? 5.5 : sp.talons ? 5 : 3);
      const cp = [V(ex, -rr * 0.7, ez), V(ex + Math.sin(ang) * cl * 0.55, -rr * 0.9 - cl * 0.1, ez + Math.cos(ang) * cl * 0.55), V(ex + Math.sin(ang) * cl * 0.75, -rr * 0.7 - cl * 0.7, ez + Math.cos(ang) * cl * 0.75)];
      claws.push(loft(cp, { rx: curve([[0, rr * (big ? 0.95 : 0.7)], [1, rr * 0.05]]), ry: curve([[0, rr * (big ? 0.95 : 0.7)], [1, rr * 0.05]]), segs: 6, rings: 8, up: [1, 0, 0], round: [0.0, 0.05] }));
    };
    if (sp.toes === 'zygo') { place(0.25, toeLen, 1.0); place(-0.25, toeLen, 1.0); place(Math.PI - 0.3, toeLen * 0.8, 1.0); place(Math.PI + 0.3, toeLen * 0.8, 1.0); }
    else if (sp.toes === 'two') { place(0.12, toeLen * 1.3, 2.4, true); place(-0.5, toeLen * 0.7, 1.6, false); }
    else { place(0.38, toeLen, 1.0, sp.talons); place(0, toeLen * 1.1, 1.0, sp.talons); place(-0.38, toeLen, 1.0, sp.talons); place(Math.PI, toeLen * 0.7, 1.0, sp.talons); }
    add(foot, merge(toes), mLeg, `Leg${S}_Toes`, [0, -fh, 0]);
    add(foot, merge(claws), mClaw, `Leg${S}_Claws`, [0, -fh, 0]);
    void sx;
  }
  return { Hb, legTotal: sp.legLen, kind: 'bird' };
}
