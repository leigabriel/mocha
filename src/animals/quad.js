import * as THREE from 'three';
import { ANATOMY } from './anatomy.js';
import { curve, loft, skinTo } from './loft.js';
import { eyeTexture, furTextures, keratinTextures, antlerTextures, skinTextures } from './textures.js';
import { ellipsoid, merge, rad, rng } from './parts.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Builds a four-legged animal with smooth lofted surfaces skinned to the node rig. */
export function buildQuadruped(ctx) {
  const { spec: sp, palette: c, opt: o, root, bone, add, own } = ctx;
  const an = ANATOMY[sp.id];
  const id = sp.id;
  const rnd = rng(id.length * 131 + 7);

  const footH = sp.foot === 'hoof' ? sp.legR * 1.7 : sp.legR * 1.0;
  const front = { upper: sp.upper * (sp.armBoost ?? 1), lower: sp.lower * (sp.armBoost ?? 1) };
  const totalF = front.upper + front.lower;
  const [z0, z1] = an.hindZig;
  const fz = (totalF - footH) / (sp.upper * Math.cos(z0) + (sp.lower - footH) * Math.cos(z0 + z1));
  const hind = { upper: sp.upper * fz, lower: (sp.lower - footH) * fz + footH };
  const Hb = totalF + sp.bodyH * 0.3;

  // ------------------------------------------------------------------ bones
  const body = bone('Body', root, [0, Hb, 0]);
  const legDefs = [['FL', 1, 1], ['FR', -1, 1], ['BL', 1, -1], ['BR', -1, -1]];
  const legBones = {};
  for (const [L, sx, sz] of legDefs) {
    const d = sz > 0 ? front : hind;
    const zig = sz > 0 ? an.foreZig : an.hindZig;
    const upper = bone(`${L}_Upper`, body, [sx * sp.bodyW * 0.44, totalF - Hb, sz * sp.bodyLen * 0.33], [zig[0], 0, 0]);
    const lower = bone(`${L}_Lower`, upper, [0, -d.upper, 0], [zig[1], 0, 0]);
    const paw = bone(`${L}_Paw`, lower, [0, -(d.lower - footH), 0], [zig[2], 0, 0]);
    legBones[L] = { upper, lower, paw, sx, sz, d };
  }
  const ang = rad(sp.neckAngle);
  const neck = bone('Neck', body, [0, sp.bodyH * 0.45, sp.bodyLen * 0.4], [ang, 0, 0]);
  const headDown = id === 'horse' ? 0.55 : id === 'deer' ? 0.35 : 0.1;
  const head = bone('Head', neck, [0, sp.neckLen, 0], [-ang + headDown, 0, 0]);
  const HL = sp.headLen + sp.snout * 0.6;
  const hw = sp.headW;
  const hh = sp.headH;
  const jaw = bone('Jaw', head, [0, -hh * 0.6, HL * 0.22]);
  const eyes = [['EyeL', 1], ['EyeR', -1]].map(([n, sx]) => {
    const e = an.eye;
    return [bone(n, head, [sx * hw * e.side, hh * 0.3, HL * (0.1 + e.fwd * 0.9)]), sx];
  });
  const ears = [['EarL', 1], ['EarR', -1]].map(([n, sx]) => {
    const lean = sp.ear === 'fold' ? 0.5 : sp.ear === 'long' ? 0.6 : 0.3;
    return [bone(n, head, [sx * hw * 0.62, hh * 0.78, HL * 0.12], [0, 0, -sx * lean]), sx];
  });
  const tailKinds = {
    short: [[0.45, 0, 0]], rings: [[-0.18, 0, 0], [-0.22, 0, 0], [-0.25, 0, 0]], curve: [[0.95, 0, 0], [0.2, 0, 0], [-0.35, 0, 0]],
    curl: [[1.0, 0, 0], [0.55, 0, 0], [0.55, 0, 0], [0.6, 0, 0]], hair: [[-0.5, 0, 0], [-0.3, 0, 0], [-0.2, 0, 0]],
    prehensile: [[0.2, 0, 0], [0.45, 0, 0], [0.6, 0, 0], [0.8, 0, 0], [0.95, 0, 0], [1.1, 0, 0]],
  };
  const segs = tailKinds[sp.tailKind];
  const segLen = sp.tailLen / segs.length;
  const tailBones = [];
  let tp = body;
  segs.forEach((rot, i) => {
    tp = bone(`Tail${i + 1}`, tp, i === 0 ? [0, sp.bodyH * 0.3, -sp.bodyLen * 0.47] : [0, 0, -segLen], rot);
    tailBones.push(tp);
  });
  root.updateMatrixWorld(true);
  const W = (b, x = 0, y = 0, z = 0) => b.localToWorld(V(x, y, z));

  // ------------------------------------------------------------------ materials
  const coatKind = id === 'tiger' ? 'tiger' : id === 'cat' ? 'tabby' : id === 'deer' ? 'deer' : id === 'dog' ? 'dog' : id === 'horse' ? 'horse' : id === 'monkey' ? 'monkey' : 'plain';
  const fur = (region, size, extra = {}) => {
    const t = furTextures({ region, kind: coatKind, coat: c.coat, belly: c.belly, dark: c.dark, accent: c.accent, size, seed: id.length + region.length, socks: !!o.socks, spots: !!o.spots, patch: !!o.patch, ...extra });
    Object.values(t).forEach(own);
    const sheen = new THREE.Color(c.coat).lerp(new THREE.Color('#ffffff'), 0.55);
    const m = new THREE.MeshPhysicalMaterial({ ...t, roughness: 1, metalness: 0, sheen: 1, sheenRoughness: 0.75, sheenColor: sheen, normalScale: new THREE.Vector2(0.8, 0.8) });
    m.name = `${id}_fur_${region}`;
    own(m);
    return m;
  };
  const mBody = fur('body', 512);
  const mHead = fur('head', 512);
  const mLeg = fur('leg', 256);
  const mTail = fur('tail', 256);
  const mJaw = fur('tail', 256, { coat: c.belly, kind: 'plain' });
  const skinMat = (name, base, deep, wrinkle = 'pebble', rough = 0.45) => {
    const t = skinTextures({ base, deep, wrinkle, size: 256 });
    Object.values(t).forEach(own);
    const m = new THREE.MeshPhysicalMaterial({ ...t, roughness: 1, metalness: 0, clearcoat: 0.25, clearcoatRoughness: rough, normalScale: new THREE.Vector2(0.9, 0.9) });
    m.name = `${id}_${name}`;
    own(m);
    return m;
  };
  const pinkNose = id === 'tiger' || id === 'cat';
  const noseM = skinMat('nose', pinkNose ? '#c98b86' : '#241a1c', pinkNose ? '#b06f6c' : '#3a2a2c');
  const innerEarM = skinMat('ear_inner', id === 'monkey' ? '#b98c78' : '#d9a79c', '#a6786b', 'fine', 0.7);
  const faceSkin = skinMat('skin', id === 'monkey' ? '#c9a08a' : '#cf9b8b', '#a97a68', 'fine', 0.6);
  const hardMat = (name, base, tip, streak = 1, rough = [0.28, 0.6]) => {
    const t = keratinTextures({ base, tip, streak, rough, size: 256 });
    Object.values(t).forEach(own);
    const m = new THREE.MeshPhysicalMaterial({ ...t, roughness: 1, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.4 });
    m.name = `${id}_${name}`;
    own(m);
    return m;
  };
  const hoofM = hardMat('hoof', '#2a211b', '#3a2e26', 1.2);
  const clawM = hardMat('claw', '#cfc4ae', '#f1eadb', 1);
  const toothM = hardMat('teeth', '#e9e1cf', '#f6f0e0', 1, [0.25, 0.5]);
  const padM = skinMat('pad', '#35262a', '#4a373b', 'pebble', 0.5);
  const eyeCfg = an.eye;
  const eyeTex = eyeTexture({ iris: eyeCfg.iris, pupil: eyeCfg.pupil, sclera: eyeCfg.sclera, size: 256 });
  own(eyeTex);
  const eyeM = new THREE.MeshPhysicalMaterial({ map: eyeTex, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03, metalness: 0 });
  eyeM.name = `${id}_eye`;
  own(eyeM);
  const hairM = new THREE.MeshPhysicalMaterial({ color: c.dark, roughness: 0.8, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(c.dark).lerp(new THREE.Color('#ffffff'), 0.3) });
  hairM.name = `${id}_hair`;
  own(hairM);

  // ------------------------------------------------------------------ torso + neck (one skinned surface)
  const H = sp.bodyH;
  const Wd = sp.bodyW;
  const Lb = sp.bodyLen;
  const neckBase = W(neck);
  const neckTop = W(head);
  const neckMid = neckBase.clone().lerp(neckTop, 0.5);
  const baseR = Math.max(sp.neckR * an.neckTaper[0], Wd * 0.62);
  const chain = (list) => {
    let acc = 0;
    const ts = list.map((s, i) => {
      if (i > 0) acc += s.p.distanceTo(list[i - 1].p);
      return acc;
    });
    const tot = acc || 1;
    const t = ts.map((x) => x / tot);
    return { path: list.map((s) => s.p), rx: curve(list.map((s, i) => [t[i], s.rx])), ry: curve(list.map((s, i) => [t[i], s.ry])) };
  };
  const idxOf = (b) => ctx.boneIndex(b);
  const stations = an.torso.map(([zf, yo, wf, hf]) => ({ p: V(0, Hb + yo * H, zf * Lb), rx: Wd * wf, ry: H * hf }));
  const tc = chain(stations);
  const torsoGeo = loft(tc.path, { rx: tc.rx, ry: tc.ry, segs: 40, rings: 80, up: [0, 1, 0], round: [0.02, 0.06], vRange: [0, 0.78] });
  skinTo(torsoGeo, [
    { index: idxOf(body), a: V(0, Hb, -Lb * 0.5), b: V(0, Hb, Lb * 0.38) },
    { index: idxOf(neck), a: neckBase, b: neckTop },
  ], { power: 2.5 });
  ctx.skinned(torsoGeo, mBody, 'Torso');

  const nDir = neckTop.clone().sub(neckBase).normalize();
  const neckList = [
    { p: neckBase.clone().addScaledVector(nDir, -baseR * 1.3), rx: baseR * 0.7, ry: baseR * 0.8 },
    { p: neckBase.clone(), rx: baseR, ry: baseR * 1.12 },
    { p: neckMid, rx: sp.neckR * an.neckTaper[1], ry: sp.neckR * an.neckTaper[1] * 1.15 },
    { p: neckTop.clone(), rx: sp.neckR * an.neckTaper[2], ry: sp.neckR * an.neckTaper[2] * 1.1 },
    { p: neckTop.clone().addScaledVector(nDir, sp.neckR * 0.6), rx: sp.neckR * an.neckTaper[2] * 0.95, ry: sp.neckR * an.neckTaper[2] },
  ];
  const nc = chain(neckList);
  const neckGeo = loft(nc.path, { rx: nc.rx, ry: nc.ry, segs: 32, rings: 40, up: [0, 1, 0], round: [0.12, 0.0], vRange: [0.74, 1] });
  skinTo(neckGeo, [
    { index: idxOf(body), a: V(0, Hb, Lb * 0.1), b: neckBase },
    { index: idxOf(neck), a: neckBase, b: neckTop },
  ], { power: 3 });
  ctx.skinned(neckGeo, mBody, 'Neck');

  // ------------------------------------------------------------------ legs
  const legProf = an.leg;
  for (const [L] of legDefs) {
    const { upper, lower, paw, sx, sz, d } = legBones[L];
    const pU = W(upper);
    const pL = W(lower);
    const pP = W(paw);
    const top = pU.clone().add(V(-sx * sp.legR * 0.8, H * 0.5, sz < 0 ? -sp.legR * 0.2 : sp.legR * 0.3));
    const m1 = pU.clone().lerp(pL, 0.5);
    const m2 = pL.clone().lerp(pP, 0.45);
    const pts = [top, pU, m1, pL, m2, pP.clone().add(V(0, -0.001, 0))];
    let acc = 0;
    const ts = pts.map((p, i) => {
      if (i > 0) acc += p.distanceTo(pts[i - 1]);
      return acc;
    });
    const t = ts.map((x) => x / acc);
    const massTop = sz < 0 ? 1.25 : 1.1;
    const bulge = (t) => 1 + (massTop - 1) * Math.max(0, 1 - t / 0.34);
    const rx0 = curve(legProf.map(([u, a]) => [u, a * sp.legR]));
    const ry0 = curve(legProf.map(([u, , b]) => [u, b * sp.legR]));
    const rx = (t) => rx0(t) * bulge(t);
    const ry = (t) => ry0(t) * bulge(t);
    void t;
    const g = loft(pts, { rx, ry, segs: 18, rings: 36, up: [0, 0, 1], round: [0.1, 0.0] });
    skinTo(g, [
      { index: idxOf(body), a: pU.clone().add(V(0, sp.legR * 4, 0)), b: pU.clone().add(V(0, sp.legR * 1, 0)) },
      { index: idxOf(upper), a: pU, b: pL },
      { index: idxOf(lower), a: pL, b: pP },
    ], { power: 3 });
    ctx.skinned(g, mLeg, `${L}_Leg`);

    // feet
    if (sp.foot === 'hoof') {
      if (id === 'horse') {
        const hg = new THREE.CylinderGeometry(sp.legR * 0.86, sp.legR * 1.22, footH * 0.9, 20, 1).translate(0, -footH * 0.45, 0);
        add(paw, hg, hoofM, `${L}_Hoof`);
        add(paw, new THREE.TorusGeometry(sp.legR * 0.9, sp.legR * 0.2, 8, 20).rotateX(Math.PI / 2), hoofM, `${L}_Coronet`, [0, -footH * 0.02, 0]);
        add(paw, new THREE.CylinderGeometry(sp.legR * 1.1, sp.legR * 1.1, footH * 0.06, 20).translate(0, -footH * 0.93, 0), padM, `${L}_Sole`);
      } else {
        for (const k of [-1, 1]) {
          const hg = new THREE.CylinderGeometry(sp.legR * 0.35, sp.legR * 0.62, footH * 0.95, 12, 1).scale(1, 1, 1.5).translate(k * sp.legR * 0.42, -footH * 0.47, sp.legR * 0.15);
          add(paw, hg, hoofM, `${L}_Hoof${k > 0 ? 'A' : 'B'}`);
          add(paw, new THREE.SphereGeometry(sp.legR * 0.33, 8, 6), hoofM, `${L}_Dewclaw${k > 0 ? 'A' : 'B'}`, [k * sp.legR * 0.6, -footH * 0.15, -sp.legR * 0.75]);
        }
        add(paw, new THREE.SphereGeometry(sp.legR * 0.85, 12, 8).scale(1, 0.45, 1), mLeg, `${L}_Fetlock`, [0, -footH * 0.02, 0]);
      }
    } else if (sp.foot === 'hand') {
      const hand = (parent, sidesX) => {
        const palm = loft([V(0, -footH * 0.2, -sp.legR * 0.4), V(0, -footH * 0.7, sp.legR * 0.8), V(0, -footH * 0.9, sp.legR * 1.8)], { rx: () => sp.legR * 1.1, ry: curve([[0, sp.legR * 0.7], [1, sp.legR * 0.35]]), segs: 10, rings: 8, up: [0, 1, 0], round: [0.02, 0.2] });
        add(parent, palm, faceSkin, `${L}_Palm`);
        for (let k = 0; k < 4; k++) {
          const x = (k - 1.5) * sp.legR * 0.55;
          const fg = loft([V(x, -footH * 0.9, sp.legR * 1.6), V(x, -footH * 0.95, sp.legR * 2.4), V(x * 1.1, -footH * 0.8, sp.legR * 3.2)], { rx: curve([[0, sp.legR * 0.26], [1, sp.legR * 0.2]]), ry: curve([[0, sp.legR * 0.24], [1, sp.legR * 0.18]]), segs: 8, rings: 8, up: [0, 1, 0], round: [0.02, 0.4] });
          add(parent, fg, faceSkin, `${L}_Finger${k}`);
        }
        const tg = loft([V(sidesX * sp.legR * 0.9, -footH * 0.5, sp.legR * 0.3), V(sidesX * sp.legR * 1.5, -footH * 0.7, sp.legR * 1.0), V(sidesX * sp.legR * 1.7, -footH * 0.8, sp.legR * 1.6)], { rx: () => sp.legR * 0.27, ry: () => sp.legR * 0.23, segs: 8, rings: 6, up: [0, 1, 0], round: [0.02, 0.4] });
        add(parent, tg, faceSkin, `${L}_Thumb`);
      };
      hand(paw, sx);
    } else {
      // padded paw: ball of the foot, four toes, pads, and (dogs only) visible claws
      const pawLen = sp.legR * (id === 'tiger' ? 2.4 : 2.1);
      const pg = loft([V(0, footH * 0.35, 0), V(0, -footH * 0.35, sp.legR * 0.1), V(0, -footH * 0.8, pawLen * 0.35), V(0, -footH * 0.9, pawLen * 0.85)], {
        rx: curve([[0, sp.legR * 0.85], [0.5, sp.legR * 1.2], [1, sp.legR * 1.05]]), ry: curve([[0, sp.legR * 0.85], [0.5, footH * 0.5], [1, footH * 0.28]]), segs: 16, rings: 14, up: [1, 0, 0], round: [0.0, 0.3],
      });
      add(paw, pg, mLeg, `${L}_Paw`);
      for (let k = 0; k < 4; k++) {
        const x = (k - 1.5) * sp.legR * 0.46;
        const z = pawLen * (0.78 + (k === 1 || k === 2 ? 0.1 : 0));
        add(paw, ellipsoid(sp.legR * 0.26, footH * 0.3, sp.legR * 0.36, 10), mLeg, `${L}_Toe${k}`, [x, -footH * 0.68, z]);
        add(paw, ellipsoid(sp.legR * 0.16, footH * 0.06, sp.legR * 0.22, 8), padM, `${L}_ToePad${k}`, [x, -footH * 0.93, z]);
        if (id === 'dog') add(paw, new THREE.ConeGeometry(sp.legR * 0.12, sp.legR * 0.55, 6).rotateX(Math.PI * 0.62).translate(x, -footH * 0.7, z + sp.legR * 0.3), clawM, `${L}_Claw${k}`);
      }
      add(paw, ellipsoid(sp.legR * 0.62, footH * 0.06, sp.legR * 0.55, 10), padM, `${L}_Pad`, [0, -footH * 0.95, pawLen * 0.32]);
    }
    void d;
  }

  // ------------------------------------------------------------------ head
  const hp = an.head;
  const rxh = curve(hp.map(([t, a]) => [t, a * hw]));
  const ryh = curve(hp.map(([t, , b]) => [t, b * hh]));
  const yoh = curve(hp.map(([t, , , y]) => [t, y * hh]));
  const z0h = -HL * 0.12;
  const z1h = HL * 0.92;
  const hpath = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    hpath.push(V(0, yoh(t) * 0.6, z0h + (z1h - z0h) * t));
  }
  const hgeo = loft(hpath, { rx: rxh, ry: ryh, segs: 32, rings: 56, up: [0, 1, 0], round: [0.12, 0.1] });
  add(head, hgeo, mHead, 'Head');
  const noseZ = z1h - hw * 0.12;
  const noseY = yoh(0.97) * 0.6 + hh * 0.04;
  const nose = ellipsoid(hw * 0.3, hh * 0.22, hw * 0.26, 14);
  add(head, nose, noseM, 'Nose', [0, noseY, noseZ - hw * 0.08]);
  for (const sx of [-1, 1]) add(head, ellipsoid(hw * 0.07, hh * 0.1, hw * 0.07, 8), new THREE.MeshStandardMaterial({ color: '#0d0809', roughness: 0.4 }), `Nostril${sx > 0 ? 'L' : 'R'}`, [sx * hw * 0.12, noseY - hh * 0.02, noseZ + hw * 0.16]);
  // lower jaw
  const jg = loft([V(0, 0, 0), V(0, -hh * 0.04, HL * 0.3), V(0, -hh * 0.12, HL * 0.62)], {
    rx: curve([[0, hw * 0.6], [0.5, hw * 0.46], [1, hw * 0.34]]), ry: curve([[0, hh * 0.3], [0.5, hh * 0.24], [1, hh * 0.18]]), segs: 16, rings: 14, up: [0, 1, 0], round: [0.05, 0.15],
  });
  add(jaw, jg, mJaw, 'LowerJaw', [0, 0, 0]);
  add(jaw, ellipsoid(hw * 0.16, hh * 0.035, HL * 0.12, 10), new THREE.MeshStandardMaterial({ color: '#b95b66', roughness: 0.5 }), 'Tongue', [0, hh * 0.04, HL * 0.28]);
  if (id === 'tiger' || id === 'cat' || id === 'dog') {
    for (const sx of [-1, 1]) {
      add(head, new THREE.ConeGeometry(hw * 0.075, hh * 0.45, 8).translate(0, -hh * 0.22, 0), toothM, `UpperFang${sx > 0 ? 'L' : 'R'}`, [sx * hw * 0.24, yoh(0.82) * 0.6 - hh * 0.2, HL * 0.76]);
      add(jaw, new THREE.ConeGeometry(hw * 0.06, hh * 0.36, 8).translate(0, hh * 0.16, 0), toothM, `LowerFang${sx > 0 ? 'L' : 'R'}`, [sx * hw * 0.2, hh * 0.1, HL * 0.5]);
    }
  }
  // eyes with lids
  for (const [eb, sx] of eyes) {
    const r = Math.max(0.007, hw * eyeCfg.r * 1.15);
    const eg = new THREE.SphereGeometry(r, 24, 18);
    const pos = eg.getAttribute('position');
    const uv = eg.getAttribute('uv');
    for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2 * r), 0.5 - pos.getY(i) / (2 * r));
    const yaw = Math.atan2(eyeCfg.side, eyeCfg.fwd * 1.1);
    const m = add(eb, eg, eyeM, `${eb.name}_Ball`);
    m.rotation.y = sx * yaw;
    const lid = add(eb, new THREE.TorusGeometry(r * 1.02, r * 0.2, 8, 20), id === 'monkey' || id === 'cat' ? faceSkin : noseM, `${eb.name}_Lid`);
    lid.rotation.y = sx * yaw;
    lid.scale.set(1, 1, 0.7);
  }
  // whiskers and follicles
  if (id === 'cat' || id === 'tiger' || id === 'dog') {
    const wh = [];
    const nW = id === 'dog' ? 2 : 4;
    for (const sx of [1, -1]) {
      for (let k = 0; k < nW; k++) {
        const len = hw * (id === 'tiger' ? 2.8 : id === 'dog' ? 1.6 : 2.6) * (1 - k * 0.08);
        const row = k / Math.max(1, nW - 1);
        const path = [V(sx * hw * 0.34, 0, 0), V(sx * len * 0.55, hh * (0.06 - row * 0.1), len * 0.18), V(sx * len, hh * (0.0 - row * 0.28), len * 0.1 - len * 0.05)];
        wh.push(loft(path, { rx: curve([[0, hw * 0.022], [1, hw * 0.004]]), ry: curve([[0, hw * 0.022], [1, hw * 0.004]]), segs: 5, rings: 8, up: [0, 1, 0], round: [0, 0.1] }).translate(0, yoh(0.72) * 0.6 - hh * (0.04 + row * 0.12), HL * 0.74));
      }
    }
    add(head, merge(wh), new THREE.MeshStandardMaterial({ color: id === 'dog' ? '#2c2018' : '#f2ece0', roughness: 0.5 }), 'Whiskers');
    const dots = [];
    for (const sx of [1, -1]) for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) dots.push(new THREE.SphereGeometry(hw * 0.025, 5, 4).translate(sx * (hw * (0.3 + k * 0.08)), yoh(0.72) * 0.6 - hh * (0.04 + r * 0.07), HL * (0.72 + k * 0.02)));
    add(head, merge(dots), padM, 'WhiskerFollicles');
  }
  if (o.face || id === 'monkey') {
    const fg = loft([V(0, 0, HL * 0.28), V(0, -hh * 0.05, HL * 0.6), V(0, -hh * 0.12, HL * 0.86)], { rx: curve([[0, hw * 0.72], [1, hw * 0.52]]), ry: curve([[0, hh * 0.72], [1, hh * 0.46]]), segs: 24, rings: 14, up: [0, 1, 0], round: [0.0, 0.2] });
    fg.translate(0, 0, 0.001);
    add(head, fg, faceSkin, 'FaceSkin', [0, 0, hw * 0.04]);
  }

  // ears
  for (const [eb, sx] of ears) {
    const L = sp.earLen;
    const wcurve = sp.ear === 'long' ? [[0, 0.25], [0.3, 0.55], [0.7, 0.5], [1, 0.05]] : sp.ear === 'point' ? [[0, 0.45], [0.5, 0.3], [1, 0.02]] : sp.ear === 'fold' ? [[0, 0.3], [0.4, 0.55], [1, 0.3]] : [[0, 0.5], [0.5, 0.6], [1, 0.12]];
    const ep = sp.ear === 'fold'
      ? [V(0, 0, 0), V(sx * L * 0.25, -L * 0.2, 0), V(sx * L * 0.35, -L * 0.6, 0.0), V(sx * L * 0.3, -L * 1.0, 0.0)]
      : [V(0, 0, 0), V(0, L * 0.5, -L * 0.05), V(0, L, L * 0.02)];
    const wf = curve(wcurve.map(([t, v]) => [t, v * L * 0.5]));
    const thick = L * 0.06;
    const outer = loft(ep, { rx: wf, ry: () => thick, segs: 14, rings: 20, up: [0, 0, 1], round: [0.05, 0.12] });
    add(eb, outer, id === 'dog' && o.patch ? mLeg : mHead, `${eb.name}_Mesh`);
    if (sp.ear !== 'fold') {
      const inner = loft(ep, { rx: curve(wcurve.map(([t, v]) => [t, v * L * 0.36])), ry: () => thick * 0.5, segs: 12, rings: 14, up: [0, 0, 1], round: [0.1, 0.2] });
      inner.translate(0, L * 0.02, thick * 0.9);
      add(eb, inner, innerEarM, `${eb.name}_Inner`);
    }
  }

  // antlers
  if (o.antlers) {
    const antlerM = (() => {
      const t = antlerTextures({ size: 256 });
      Object.values(t).forEach(own);
      const m = new THREE.MeshPhysicalMaterial({ ...t, roughness: 1, metalness: 0, clearcoat: 0.15 });
      m.name = `${id}_antler`;
      own(m);
      return m;
    })();
    const tine = (pts, r0, r1) => loft(pts.map((p) => V(...p)), { rx: curve([[0, r0], [1, r1]]), ry: curve([[0, r0], [1, r1]]), segs: 8, rings: 18, up: [0, 0, 1], round: [0.02, 0.3] });
    for (const [n, sx] of [['AntlerL', 1], ['AntlerR', -1]]) {
      const ab = bone(n, head, [sx * hw * 0.42, hh * 0.86, HL * 0.02]);
      const parts = [
        tine([[0, 0, 0], [sx * 0.04, 0.12, -0.04], [sx * 0.08, 0.26, -0.06], [sx * 0.1, 0.38, -0.02]], 0.017, 0.007),
        tine([[sx * 0.05, 0.14, -0.045], [sx * 0.07, 0.2, 0.03], [sx * 0.08, 0.27, 0.1]], 0.009, 0.004),
        tine([[sx * 0.085, 0.29, -0.05], [sx * 0.1, 0.36, -0.1], [sx * 0.12, 0.43, -0.12]], 0.008, 0.003),
        tine([[sx * 0.1, 0.36, -0.03], [sx * 0.12, 0.45, 0.0], [sx * 0.14, 0.52, 0.02]], 0.007, 0.003),
        tine([[sx * 0.015, 0.03, 0.0], [sx * 0.03, 0.08, 0.06], [sx * 0.035, 0.12, 0.1]], 0.009, 0.004),
      ];
      add(ab, merge(parts), antlerM, `${n}_Mesh`);
      add(ab, new THREE.TorusGeometry(0.02, 0.006, 6, 14).rotateX(Math.PI / 2).translate(0, 0.012, 0), antlerM, `${n}_Burr`);
    }
  }

  // mane / forelock
  if (o.mane) {
    const strands = [];
    const n = 26;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const base = V((rnd() - 0.5) * 0.015, sp.neckLen * (0.05 + 0.92 * u), -sp.neckR * (1.05 - u * 0.2));
      const len = 0.14 + rnd() * 0.08;
      const lean = 0.5 + rnd() * 0.25;
      const g = loft([base, base.clone().add(V(0.02 * (rnd() - 0.5), len * 0.45, -len * lean * 0.6)), base.clone().add(V(0.03 * (rnd() - 0.5), len * 0.55, -len * lean * 1.1))], {
        rx: curve([[0, 0.016], [1, 0.003]]), ry: () => 0.004, segs: 6, rings: 8, up: [1, 0, 0], round: [0, 0.2],
      });
      strands.push(g);
    }
    add(neck, merge(strands), hairM, 'Mane');
    const fl = [];
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 0.012;
      fl.push(loft([V(x, hh * 0.85, HL * 0.12), V(x, hh * 0.85 + 0.03, HL * 0.28), V(x * 1.4, hh * 0.35, HL * 0.42)], { rx: curve([[0, 0.012], [1, 0.003]]), ry: () => 0.004, segs: 5, rings: 8, up: [1, 0, 0], round: [0, 0.2] }));
    }
    add(head, merge(fl), hairM, 'Forelock');
  }

  // ------------------------------------------------------------------ tail
  const tpts = [W(tailBones[0], 0, 0, sp.tailLen * 0.04)];
  tailBones.forEach((tb, i) => tpts.push(W(tb, 0, 0, -(i === 0 ? segLen : segLen))));
  const tailPts = [W(tailBones[0], 0, 0, 0.0), ...tailBones.map((tb) => W(tb, 0, 0, -segLen))];
  void tpts;
  const hair = sp.tailKind === 'hair';
  const tailR = (t) => sp.tailR * (hair ? mixf(1.3, 0.7, t) : mixf(1.25, id === 'monkey' || id === 'cat' ? 0.55 : 0.5, t));
  const tailGeo = loft(tailPts, { rx: tailR, ry: tailR, segs: 14, rings: 30, up: [0, 1, 0], round: [0.0, sp.tailKind === 'short' ? 0.4 : 0.12] });
  skinTo(tailGeo, tailBones.map((tb, i) => ({ index: idxOf(tb), a: tailPts[i], b: tailPts[i + 1] })), { power: 3 });
  ctx.skinned(tailGeo, hair ? hairM : mTail, 'Tail');
  if (hair) {
    // flowing tail hair: ribbons that follow the tail bones
    const rib = [];
    for (let i = 0; i < 26; i++) {
      const ang2 = (i / 26) * Math.PI * 2;
      const o2 = V(Math.cos(ang2) * sp.tailR * 0.9, Math.sin(ang2) * sp.tailR * 0.9, 0);
      const start = tailPts[0].clone().lerp(tailPts[1], 0.5).add(o2);
      const mid = tailPts[2].clone().add(o2.clone().multiplyScalar(1.4)).add(V((rnd() - 0.5) * 0.04, -0.1, 0));
      const end = tailPts[tailPts.length - 1].clone().add(o2.clone().multiplyScalar(1.7)).add(V((rnd() - 0.5) * 0.05, -0.22 - rnd() * 0.12, -0.04));
      const g = loft([start, mid, end], { rx: curve([[0, 0.014], [1, 0.004]]), ry: () => 0.004, segs: 5, rings: 12, up: [0, 0, 1], round: [0, 0.2] });
      skinTo(g, tailBones.map((tb, k) => ({ index: idxOf(tb), a: tailPts[k], b: tailPts[k + 1] })), { power: 2 });
      rib.push(g);
    }
    ctx.skinned(merge(rib), hairM, 'TailHair');
  }

  return { Hb, legTotal: totalF, kind: 'quad' };
}

const mixf = (a, b, t) => a + (b - a) * t;
