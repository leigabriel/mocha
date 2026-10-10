import * as THREE from 'three';
import { SPECIES } from './species.js';
import { bladeGeometry, coneFwd, ellipsoid, limbBack, limbDown, limbFwd, limbUp, merge, overlapScales, rad, rng } from './parts.js';

/**
 * Builds one animal as a hierarchy of named pivot nodes (Root > Body > Neck > Head ...) with meshes
 * attached, so it can be animated with node animation clips and exported as glTF without skinning.
 * The model faces +Z, stands on y = 0 and is measured in metres.
 */
export function buildAnimal(id, { colors = {}, options = {}, size = 1 } = {}) {
  const spec = SPECIES[id];
  if (!spec) throw new Error(`Unknown animal: ${id}`);
  const palette = { ...spec.colors, ...colors };
  const opt = { ...spec.options, ...options };
  const root = new THREE.Group();
  root.name = `Mocha_${spec.label}`;
  const bones = new Map();
  const mats = new Map();
  const geos = [];

  const material = (role, color, { rough = 0.85, metal = 0, clearcoat = 0 } = {}) => {
    const key = `${role}_${color}`;
    if (!mats.has(key)) {
      const m = clearcoat
        ? new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: metal, clearcoat, clearcoatRoughness: 0.15 })
        : new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
      m.name = `${spec.id}_${role}`;
      mats.set(key, m);
    }
    return mats.get(key);
  };
  const add = (parent, geo, mat, name, pos = [0, 0, 0], rot = [0, 0, 0]) => {
    geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const bone = (name, parent, pos = [0, 0, 0], rot = [0, 0, 0]) => {
    const b = new THREE.Object3D();
    b.name = name;
    b.rotation.order = 'ZYX';
    b.position.set(...pos);
    b.rotation.set(...rot);
    parent.add(b);
    bones.set(name, b);
    return b;
  };

  const eyeMat = material('eye', '#0b0b0d', { rough: 0.15, clearcoat: 1 });
  const dark = material('dark', palette.dark, { rough: 0.6 });

  const rig = spec.kind === 'quad' ? quadruped(spec, palette, opt) : birdRig(spec, palette, opt);

  function quadruped(sp, c, o) {
    const rnd = rng(sp.id.length * 977 + 13);
    const coat = material('coat', c.coat);
    const belly = material('belly', c.belly);
    const accent = material('accent', c.accent);
    const skin = material('skin', '#c98f7a', { rough: 0.6 });
    const nose = material('nose', '#1d1416', { rough: 0.3, clearcoat: 0.6 });
    const hoofM = material('hoof', '#1e1814', { rough: 0.45 });
    const padM = material('pad', '#3a2a2e', { rough: 0.6 });
    const clawM = material('claw', '#e8e0d0', { rough: 0.4 });

    const footH = sp.foot === 'hoof' ? sp.legR * 1.7 : sp.legR * 1.0;
    const front = { upper: sp.upper * (sp.armBoost ?? 1), lower: sp.lower * (sp.armBoost ?? 1) };
    const hind = { upper: sp.upper, lower: sp.lower };
    const totalF = front.upper + front.lower;
    const totalH = hind.upper + hind.lower;
    const Hb = Math.max(totalF, totalH) + sp.bodyH * 0.3;

    const body = bone('Body', root, [0, Hb, 0]);
    add(body, ellipsoid(sp.bodyW, sp.bodyH, sp.bodyLen / 2, 28), coat, 'Torso');
    add(body, ellipsoid(sp.bodyW * 0.92, sp.bodyH * 0.8, sp.bodyLen * 0.46, 24), belly, 'Belly', [0, -sp.bodyH * 0.22, 0]);
    add(body, ellipsoid(sp.bodyW * 0.97, sp.bodyH * 0.97, sp.bodyLen * 0.2, 20), coat, 'Chest', [0, sp.bodyH * 0.02, sp.bodyLen * 0.3]);
    add(body, ellipsoid(sp.bodyW * 0.98, sp.bodyH * 0.98, sp.bodyLen * 0.22, 20), coat, 'Haunch', [0, sp.bodyH * 0.02, -sp.bodyLen * 0.3]);

    // markings that follow the body form
    if (o.stripes) {
      const arcs = [];
      const count = sp.id === 'tiger' ? 11 : 9;
      for (let i = 0; i < count; i++) {
        const z = sp.bodyLen * (-0.42 + (0.84 * i) / (count - 1));
        const f = Math.sqrt(Math.max(0.05, 1 - (z / (sp.bodyLen / 2)) ** 2));
        const th = (sp.id === 'tiger' ? 0.085 : 0.08) * (0.7 + rnd() * 0.7);
        const arc = Math.PI * (1.3 + rnd() * 0.35);
        const g = new THREE.TorusGeometry(1, th, 5, 18, arc);
        g.rotateZ(Math.PI / 2 - arc / 2 + (rnd() - 0.5) * 0.25);
        g.scale(sp.bodyW * f * 1.02, sp.bodyH * f * 1.02, sp.bodyLen * 0.032);
        g.translate(0, 0, z);
        arcs.push(g);
      }
      add(body, merge(arcs), dark, 'Stripes');
    }
    if (o.spots) {
      const dots = [];
      for (let i = 0; i < 26; i++) {
        const z = sp.bodyLen * (-0.4 + rnd() * 0.8);
        const f = Math.sqrt(Math.max(0.05, 1 - (z / (sp.bodyLen / 2)) ** 2));
        const a = Math.PI * (-0.05 + rnd() * 0.75) * (rnd() > 0.5 ? 1 : -1) + (rnd() > 0.5 ? 0 : Math.PI);
        const x = sp.bodyW * f * Math.cos(a) * 1.01;
        const y = sp.bodyH * f * Math.abs(Math.sin(a)) * 1.01;
        dots.push(new THREE.SphereGeometry(0.018 + rnd() * 0.012, 8, 6).scale(1, 1, 0.5).translate(x, y, z));
      }
      add(body, merge(dots), accent, 'Spots');
    }
    if (o.patch) add(body, ellipsoid(sp.bodyW * 0.95, sp.bodyH * 0.38, sp.bodyLen * 0.2, 14), dark, 'Saddle', [0, sp.bodyH * 0.74, -sp.bodyLen * 0.04]);

    // legs
    const legs = [['FL', 1, 1], ['FR', -1, 1], ['BL', 1, -1], ['BR', -1, -1]];
    for (const [L, sx, sz] of legs) {
      const dims = sz > 0 ? front : hind;
      const total = dims.upper + dims.lower;
      const ay = total - Hb;
      // attach so the paw reaches the ground
      const upper = bone(`${L}_Upper`, body, [sx * sp.bodyW * 0.62, ay, sz * sp.bodyLen * 0.33]);
      const r0 = sp.legR * (sz > 0 ? 1.35 : 1.5);
      add(upper, new THREE.SphereGeometry(r0, 14, 10), coat, `${L}_Joint`);
      add(upper, limbDown(r0, sp.legR * 0.85, dims.upper), coat, `${L}_UpperMesh`);
      if (sp.id === 'tiger' || sp.id === 'dog' || sp.id === 'horse') {
        add(upper, ellipsoid(sp.legR * 1.5, dims.upper * 0.4, sp.legR * (sz > 0 ? 1.6 : 1.9), 12), coat, `${L}_Muscle`, [0, -dims.upper * 0.28, sz > 0 ? 0.0 : -sp.legR * 0.2]);
      }
      const lower = bone(`${L}_Lower`, upper, [0, -dims.upper, 0]);
      const lowerLen = dims.lower - footH;
      const sock = o.socks ? dark : coat;
      add(lower, new THREE.SphereGeometry(sp.legR * 0.88, 12, 8), coat, `${L}_Knee`);
      add(lower, limbDown(sp.legR * 0.82, sp.legR * 0.62, lowerLen), sock, `${L}_LowerMesh`);
      const paw = bone(`${L}_Paw`, lower, [0, -lowerLen, 0]);
      if (sp.foot === 'hoof') {
        add(paw, new THREE.CylinderGeometry(sp.legR * 0.7, sp.legR * 0.95, footH, 12).translate(0, -footH / 2, 0), hoofM, `${L}_Hoof`);
        add(paw, new THREE.SphereGeometry(sp.legR * 0.7, 10, 8).scale(1, 0.6, 1), sock, `${L}_Fetlock`);
      } else if (sp.foot === 'hand') {
        add(paw, ellipsoid(sp.legR * 1.1, footH * 0.7, sp.legR * 2.1, 10), skin, `${L}_Palm`, [0, -footH * 0.4, sp.legR * 0.9]);
        for (let k = 0; k < 3; k++) add(paw, limbFwd(sp.legR * 0.3, sp.legR * 0.24, sp.legR * 1.8, 6), skin, `${L}_Finger${k}`, [(k - 1) * sp.legR * 0.65, -footH * 0.7, sp.legR * 2.1]);
      } else {
        add(paw, ellipsoid(sp.legR * 1.25, footH * 0.7, sp.legR * 1.9, 12), coat, `${L}_PawMesh`, [0, -footH * 0.45, sp.legR * 0.7]);
        add(paw, ellipsoid(sp.legR * 0.8, footH * 0.15, sp.legR * 1.1, 8), padM, `${L}_Pad`, [0, -footH * 0.95, sp.legR * 0.7]);
        if (sp.id === 'tiger' || sp.id === 'cat') for (let k = -1; k <= 1; k++) add(paw, coneFwd(sp.legR * 0.1, sp.legR * 0.55, 6), clawM, `${L}_Claw${k + 1}`, [k * sp.legR * 0.5, -footH * 0.55, sp.legR * 2.4]);
      }
      if (sp.id === 'tiger' && o.stripes) {
        const rings = [0.2, 0.45, 0.7].map((u) => new THREE.TorusGeometry(sp.legR * (1.3 - u * 0.4), sp.legR * 0.17, 5, 12).rotateX(Math.PI / 2).translate(0, -dims.upper * u, 0));
        add(upper, merge(rings), dark, `${L}_Stripes`);
      }
    }

    // neck, head
    const ang = rad(sp.neckAngle);
    const neck = bone('Neck', body, [0, sp.bodyH * 0.45, sp.bodyLen * 0.4], [ang, 0, 0]);
    add(neck, limbUp(sp.neckR * 1.25, sp.neckR * 0.85, sp.neckLen, 14), coat, 'NeckMesh');
    add(neck, new THREE.SphereGeometry(sp.neckR * 1.25, 12, 10), coat, 'NeckBase');
    const headDown = sp.id === 'horse' ? 0.55 : sp.id === 'deer' ? 0.35 : 0.1;
    const head = bone('Head', neck, [0, sp.neckLen, 0], [-ang + headDown, 0, 0]);
    const hz = sp.headLen * 0.28;
    add(head, ellipsoid(sp.headW, sp.headH, sp.headLen * 0.55, 20), coat, 'Skull', [0, 0, hz]);
    const sn = sp.snout;
    add(head, limbFwd(sp.headW * 0.62, sp.headW * 0.5, sn + sp.headLen * 0.2, 14).scale(1, sp.headH / sp.headW * 0.8, 1), id === 'monkey' ? skin : accent, 'Muzzle', [0, -sp.headH * 0.15, sp.headLen * 0.55 - sp.headLen * 0.2]);
    const tipZ = sp.headLen * 0.55 + sn + sp.headLen * 0.0;
    add(head, ellipsoid(sp.headW * 0.34, sp.headH * 0.26, sp.headW * 0.3, 10), nose, 'Nose', [0, -sp.headH * 0.05, tipZ - sp.headW * 0.1]);
    const jaw = bone('Jaw', head, [0, -sp.headH * 0.55, hz * 0.6]);
    add(jaw, limbFwd(sp.headW * 0.4, sp.headW * 0.3, sn + sp.headLen * 0.4, 10).scale(1, 0.55, 1), belly, 'JawMesh', [0, -sp.headH * 0.05, 0]);
    if (id === 'tiger' || id === 'dog' || id === 'cat') add(jaw, new THREE.TorusGeometry(sp.headW * 0.12, sp.headW * 0.03, 4, 8, Math.PI), clawM, 'Fang', [0, sp.headH * 0.12, sn + sp.headLen * 0.28]);
    if (id === 'monkey' || o.face) add(head, ellipsoid(sp.headW * 0.85, sp.headH * 0.8, sp.headLen * 0.3, 14), skin, 'Face', [0, -sp.headH * 0.1, hz + sp.headLen * 0.28]);
    for (const [E, sx] of [['EyeL', 1], ['EyeR', -1]]) {
      const eye = bone(E, head, [sx * sp.headW * (sp.id === 'deer' || sp.id === 'horse' ? 0.92 : 0.72), sp.headH * 0.32, hz + sp.headLen * (sp.id === 'deer' || sp.id === 'horse' ? 0.12 : 0.34)]);
      add(eye, new THREE.SphereGeometry(Math.max(0.008, sp.headW * 0.17), 12, 10), eyeMat, `${E}_Mesh`);
    }
    if (id === 'cat' || id === 'tiger' || id === 'dog') {
      const w = [];
      for (const sx of [1, -1]) for (let k = 0; k < 3; k++) w.push(limbFwd(0.0016, 0.0008, sp.headW * 1.1, 4).rotateY(sx * (0.7 + k * 0.28)).rotateX(-0.1 + k * 0.1).translate(sx * sp.headW * 0.4, -sp.headH * 0.12 - k * sp.headH * 0.08, hz + sp.headLen * 0.5));
      add(head, merge(w), id === 'dog' ? dark : accent, 'Whiskers');
    }
    for (const [E, sx] of [['EarL', 1], ['EarR', -1]]) {
      const lean = sp.ear === 'fold' ? 0.5 : sp.ear === 'long' ? 0.6 : 0.3;
      const ear = bone(E, head, [sx * sp.headW * 0.62, sp.headH * 0.82, hz - sp.headLen * 0.05], [0.0, 0, -sx * lean]);
      const L = sp.earLen;
      if (sp.ear === 'long') add(ear, ellipsoid(L * 0.28, L * 0.5, L * 0.1, 12), coat, `${E}_Mesh`, [0, L * 0.45, 0]);
      else if (sp.ear === 'point') add(ear, new THREE.ConeGeometry(L * 0.38, L, 8).scale(1, 1, 0.5).translate(0, L / 2, 0), coat, `${E}_Mesh`);
      else if (sp.ear === 'fold') {
        ear.rotation.z = sx * 0.2;
        add(ear, ellipsoid(L * 0.42, L * 0.55, L * 0.12, 12), id === 'dog' && o.patch ? dark : coat, `${E}_Mesh`, [sx * L * 0.25, -L * 0.45, 0], [0, 0, sx * 0.3]);
      } else add(ear, ellipsoid(L * 0.6, L * 0.55, L * 0.25, 12), id === 'monkey' ? skin : coat, `${E}_Mesh`, [0, L * 0.3, 0]);
    }
    if (o.antlers) {
      const main = (sx) => {
        const parts = [];
        const stem = (len, r, pos, rot) => parts.push(new THREE.CylinderGeometry(r * 0.6, r, len, 6).translate(0, len / 2, 0).rotateZ(rot[2]).rotateX(rot[0]).translate(...pos));
        stem(0.3, 0.014, [0, 0, 0], [-0.35, 0, -sx * 0.45]);
        stem(0.16, 0.01, [sx * 0.07, 0.17, -0.07], [0.5, 0, -sx * 0.5]);
        stem(0.2, 0.009, [sx * 0.1, 0.24, -0.1], [-0.5, 0, sx * 0.1]);
        stem(0.14, 0.008, [sx * 0.04, 0.12, -0.03], [0.9, 0, -sx * 0.1]);
        return merge(parts);
      };
      for (const [E, sx] of [['AntlerL', 1], ['AntlerR', -1]]) {
        const a = bone(E, head, [sx * sp.headW * 0.45, sp.headH * 0.85, hz - sp.headLen * 0.1]);
        add(a, main(sx), material('antler', '#cbbba0', { rough: 0.7 }), `${E}_Mesh`);
      }
    }
    if (o.mane) {
      const tufts = [];
      const n = 11;
      for (let i = 0; i < n; i++) {
        const y = sp.neckLen * (0.05 + (0.92 * i) / (n - 1));
        tufts.push(new THREE.ConeGeometry(0.035, 0.2, 6).scale(0.6, 1, 1.2).rotateX(Math.PI * 0.62).translate(0, y, -sp.neckR * 1.0));
      }
      add(neck, merge(tufts), dark, 'Mane');
      add(head, new THREE.ConeGeometry(0.03, 0.14, 6).rotateX(Math.PI * 0.35).translate(0, sp.headH * 0.8, hz + sp.headLen * 0.22), dark, 'Forelock');
    }

    // tail
    const kinds = {
      short: [[0.45, 0, 0]], rings: [[-0.18, 0, 0], [-0.22, 0, 0], [-0.25, 0, 0]], curve: [[0.95, 0, 0], [0.2, 0, 0], [-0.35, 0, 0]],
      curl: [[1.0, 0, 0], [0.55, 0, 0], [0.55, 0, 0], [0.6, 0, 0]], hair: [[-0.5, 0, 0], [-0.3, 0, 0], [-0.2, 0, 0]], prehensile: [[0.2, 0, 0], [0.45, 0, 0], [0.6, 0, 0], [0.8, 0, 0], [0.95, 0, 0], [1.1, 0, 0]],
    };
    const segs = kinds[sp.tailKind];
    const segLen = sp.tailLen / segs.length;
    let parent = body;
    segs.forEach((rot, i) => {
      const t = bone(`Tail${i + 1}`, parent, i === 0 ? [0, sp.bodyH * 0.3, -sp.bodyLen * 0.47] : [0, 0, -segLen], rot);
      const r0 = sp.tailR * (1 - i * 0.18);
      const r1 = sp.tailR * (1 - (i + 1) * 0.18 + (sp.tailKind === 'hair' || sp.tailKind === 'rings' ? 0.1 : 0));
      const tailMat = sp.tailKind === 'hair' ? dark : (i === segs.length - 1 && (sp.tailKind === 'rings' || sp.tailKind === 'curl') ? (sp.tailKind === 'rings' ? dark : accent) : coat);
      add(t, limbBack(r0, Math.max(0.004, r1), segLen * (sp.tailKind === 'hair' ? 1.04 : 1.04), 10), tailMat, `Tail${i + 1}_Mesh`);
      if (sp.tailKind === 'short') add(t, ellipsoid(sp.tailR * 1.2, sp.tailR * 0.5, segLen * 0.5, 10), accent, 'TailUnderside', [0, -sp.tailR * 0.5, -segLen * 0.5]);
      if (sp.tailKind === 'rings') add(t, new THREE.TorusGeometry(r0 * 1.02, r0 * 0.22, 5, 10).translate(0, 0, -segLen * 0.5), dark, `Tail${i + 1}_Ring`);
      if (sp.tailKind === 'hair') add(t, ellipsoid(sp.tailR * 1.7, sp.tailR * 1.2, segLen * 0.62, 10), dark, `Tail${i + 1}_Hair`, [0, -sp.tailR * 0.4, -segLen * 0.5]);
      parent = t;
    });
    return { Hb, legTotal: Math.max(totalF, totalH), kind: 'quad' };
  }

  function birdRig(sp, c, o) {
    const coat = material('coat', c.coat);
    const belly = material('belly', c.belly);
    const wingM = material('wing', c.wing);
    const accent = material('accent', c.accent);
    const beakM = material('beak', c.beak, { rough: 0.35, clearcoat: 0.5 });
    const skin = material('skin', c.skin, { rough: 0.55 });
    const clawM = material('claw', '#2a2420', { rough: 0.4 });
    const sheen = material('sheen', c.accent, { rough: 0.3, metal: 0.25, clearcoat: 0.8 });
    const p = rad(sp.pitch);
    const R = sp.bodyR;
    const totalLeg = sp.legLen;
    const Hb = totalLeg + R * 0.7;

    const body = bone('Body', root, [0, Hb, 0], [-p, 0, 0]);
    add(body, ellipsoid(R, R * 0.95, sp.bodyLen / 2, 28), coat, 'Torso');
    add(body, ellipsoid(R * 0.93, R * 0.8, sp.bodyLen * 0.44, 24), belly, 'Breast', [0, -R * 0.22, sp.bodyLen * 0.04]);
    const isOstrich = sp.id === 'ostrich';
    if (isOstrich) {
      const r = rng(5);
      const tufts = [];
      for (let i = 0; i < 70; i++) {
        const z = (r() - 0.55) * sp.bodyLen * 0.9;
        const f = Math.sqrt(Math.max(0.05, 1 - (z / (sp.bodyLen / 2)) ** 2));
        const a = Math.PI * (-0.1 + r() * 1.2);
        tufts.push(new THREE.ConeGeometry(0.035, 0.2 + r() * 0.12, 5).rotateX(-Math.PI / 2 - 0.35).translate(R * f * Math.cos(a), R * f * Math.sin(a), z));
      }
      add(body, merge(tufts), coat, 'LooseFeathers');
    } else {
      add(body, overlapScales(R, R * 0.95, sp.bodyLen / 2, { rows: 8, per: 12, size: R * 0.28, seed: 3 }), coat, 'Feathers');
    }

    // neck
    const [t1, t2] = [rad(sp.neckTilt[0]), rad(sp.neckTilt[1])];
    const nr = Math.max(0.012, sp.headR * (isOstrich ? 0.55 : 1.0));
    const neck1 = bone('Neck1', body, [0, R * 0.3, sp.bodyLen * 0.42], [t1 + p, 0, 0]);
    const nl = sp.neckLen / 2;
    const neckMat = isOstrich ? skin : coat;
    add(neck1, limbUp(nr * 1.7, nr * 1.25, nl, 12), neckMat, 'Neck1Mesh');
    add(neck1, new THREE.SphereGeometry(nr * 1.7, 12, 10), neckMat, 'NeckBase');
    const neck2 = bone('Neck2', neck1, [0, nl, 0], [t2 - t1, 0, 0]);
    add(neck2, limbUp(nr * 1.25, nr, nl, 12), neckMat, 'Neck2Mesh');
    if (o.sheen) add(neck2, new THREE.CylinderGeometry(nr * 1.16, nr * 1.2, nl * 0.6, 14, 1, true).translate(0, nl * 0.45, 0), sheen, 'NeckSheen');
    const head = bone('Head', neck2, [0, nl, 0], [-t2, 0, 0]);
    const H = sp.headR;
    add(head, new THREE.SphereGeometry(H, 18, 14), id === 'eagle' && o.whiteHead ? accent : (isOstrich ? skin : coat), 'Skull', [0, 0, 0]);
    // beak
    const b = sp.beak;
    const upper = coneFwd(Math.max(0.004, b.h * 0.6), b.len, 12).scale(1, isOstrich ? 0.4 : 1, 1);
    add(head, upper, beakM, 'BeakUpper', [0, -H * 0.05, H * 0.7]);
    if (b.hook) add(head, new THREE.ConeGeometry(b.h * 0.34, b.len * 0.5, 8).rotateX(Math.PI * 0.95), beakM, 'BeakHook', [0, -H * 0.05 - b.h * 0.38, H * 0.7 + b.len * 0.9]);
    const jaw = bone('Jaw', head, [0, -H * 0.3, H * 0.62]);
    add(jaw, coneFwd(Math.max(0.003, b.h * 0.4), b.len * 0.85, 10).scale(1, isOstrich ? 0.3 : 0.8, 1), beakM, 'BeakLower');
    if (id === 'parrot') add(head, new THREE.TorusGeometry(H * 0.32, H * 0.06, 6, 14), skin, 'EyeRingL', [H * 0.7, H * 0.15, H * 0.2], [0, Math.PI / 2, 0]);
    if (id === 'parrot') add(head, new THREE.TorusGeometry(H * 0.32, H * 0.06, 6, 14), skin, 'EyeRingR', [-H * 0.7, H * 0.15, H * 0.2], [0, Math.PI / 2, 0]);
    if (id === 'dove') add(head, ellipsoid(H * 0.25, H * 0.15, H * 0.3, 8), skin, 'Cere', [0, H * 0.1, H * 0.75]);
    for (const [E, sx] of [['EyeL', 1], ['EyeR', -1]]) {
      const eye = bone(E, head, [sx * H * 0.78, H * 0.22, H * (isOstrich ? 0.3 : 0.28)]);
      add(eye, new THREE.SphereGeometry(Math.max(0.006, H * (isOstrich ? 0.24 : 0.2)), 12, 10), eyeMat, `${E}_Mesh`);
      if (id === 'eagle') add(head, ellipsoid(H * 0.3, H * 0.08, H * 0.5, 8), dark, `${E}_Brow`, [sx * H * 0.7, H * 0.5, H * 0.3], [0, 0, 0]);
      if (isOstrich) add(head, new THREE.TorusGeometry(H * 0.28, H * 0.05, 5, 10, Math.PI), dark, `${E}_Lash`, [sx * H * 0.78, H * 0.4, H * 0.3], [0, Math.PI / 2, 0]);
    }

    // wings (rest = folded against the body, Z-fold); spread by animation
    const w = sp.wing;
    for (const [S, sd] of [['L', 1], ['R', -1]]) {
      const sh = bone(`Wing${S}_1`, body, [sd * R * 0.8, R * 0.5, sp.bodyLen * 0.08], [0, sd * rad(90), 0]);
      // the bird's left wing is on +x; a +90deg yaw turns +x towards the tail (mirrored for the right wing)
      add(sh, new THREE.SphereGeometry(R * 0.25, 10, 8), coat, `Wing${S}_Shoulder`);
      add(sh, bladeGeometry(w.l1, w.chord * 1.0, w.chord * 0.95, { sd, teeth: 0, depth: R * 0.18 }), isOstrich ? wingM : coat, `Wing${S}_UpperMesh`);
      const fo = bone(`Wing${S}_2`, sh, [sd * w.l1, 0, 0], [0, sd * rad(-170), 0]);
      add(fo, bladeGeometry(w.l2, w.chord * 0.95, w.chord * 0.85, { sd, teeth: 4, depth: 0.014 }), wingM, `Wing${S}_ForeMesh`);
      const ti = bone(`Wing${S}_3`, fo, [sd * w.l2, 0, 0], [0, sd * rad(170), 0]);
      add(ti, bladeGeometry(w.l3, w.chord * 0.85, w.chord * 0.4, { sd, teeth: 6, tip: true, depth: 0.012 }), id === 'eagle' || id === 'parrot' ? dark : wingM, `Wing${S}_TipMesh`);
    }

    // tail fan
    const tl = sp.tail;
    const tail = bone('Tail', body, [0, R * 0.1, -sp.bodyLen * 0.46], [p - 0.05, 0, 0]);
    const blades = [];
    for (let i = 0; i < tl.feathers; i++) {
      const a = (i - (tl.feathers - 1) / 2) * (tl.feathers > 3 ? 0.17 : 0.12);
      const len = tl.len * (1 - Math.abs(i - (tl.feathers - 1) / 2) * (id === 'parrot' ? 0.05 : 0.04));
      const g = bladeGeometry(len, tl.w / tl.feathers * 1.6, tl.w / tl.feathers * 1.2, { sd: 1, teeth: 0, depth: 0.008 }).rotateY(-Math.PI / 2);
      blades.push(g.rotateY(a));
    }
    add(tail, merge(blades), id === 'ostrich' ? accent : id === 'parrot' ? accent : coat, 'TailFeathers');
    // legs
    const th = totalLeg * (isOstrich ? 0.36 : 0.32);
    const sh = totalLeg * (isOstrich ? 0.46 : 0.46);
    const fh = Math.max(0.012, totalLeg - th - sh);
    const legMat = isOstrich ? skin : id === 'eagle' ? beakM : id === 'dove' ? skin : skin;
    for (const [S, sx] of [['L', 1], ['R', -1]]) {
      const thigh = bone(`Leg${S}_Thigh`, body, [sx * R * 0.5, -R * 0.55, -sp.bodyLen * 0.05], [p + 0.3, 0, 0]);
      add(thigh, ellipsoid(R * 0.38, th * 0.8, R * 0.42, 14), isOstrich ? skin : coat, `Leg${S}_Thigh_Mesh`, [0, -th * 0.35, 0]);
      const shin = bone(`Leg${S}_Shin`, thigh, [0, -th, 0], [-0.55, 0, 0]);
      add(shin, limbDown(Math.max(0.005, R * 0.11), Math.max(0.004, R * 0.075), sh, 8), legMat, `Leg${S}_ShinMesh`);
      add(shin, new THREE.SphereGeometry(Math.max(0.006, R * 0.12), 8, 6), legMat, `Leg${S}_Ankle`);
      const foot = bone(`Leg${S}_Foot`, shin, [0, -sh, 0], [0.25, 0, 0]);
      const toes = [];
      const tr = Math.max(0.004, R * 0.07);
      const toeLen = Math.max(0.03, fh * 1.4 + R * 0.35);
      const place = (ang, len, scale = 1) => {
        toes.push(limbFwd(tr * scale, tr * 0.6 * scale, len, 6).rotateY(ang));
      };
      if (sp.toes === 'zygo') { place(0.3, toeLen); place(-0.3, toeLen); place(Math.PI - 0.35, toeLen * 0.8); place(Math.PI + 0.35, toeLen * 0.8); }
      else if (sp.toes === 'two') { place(0.12, toeLen * 1.1, 2.4); place(-0.45, toeLen * 0.55, 1.5); }
      else { place(0.35, toeLen); place(0, toeLen * 1.1); place(-0.35, toeLen); place(Math.PI, toeLen * 0.7); }
      add(foot, merge(toes), legMat, `Leg${S}_Toes`, [0, -fh, 0]);
      if (sp.talons || sp.toes === 'two' || sp.toes === 'zygo') {
        const claws = [];
        const addClaw = (ang, len, big) => claws.push(new THREE.ConeGeometry(tr * (big ? 1.5 : 1), tr * (big ? 7 : 4), 6).rotateX(Math.PI * 0.7).translate(Math.sin(ang) * len, -tr * 1.2, Math.cos(ang) * len));
        if (sp.toes === 'two') { addClaw(0.12, toeLen * 1.1, true); }
        else if (sp.toes === 'zygo') { addClaw(0.3, toeLen); addClaw(-0.3, toeLen); }
        else { addClaw(0.35, toeLen, true); addClaw(0, toeLen * 1.1, true); addClaw(-0.35, toeLen, true); }
        add(foot, merge(claws), clawM, `Leg${S}_Claws`, [0, -fh, 0]);
      }
    }
    return { Hb, legTotal: totalLeg, kind: 'bird' };
  }

  // stand the finished rest pose on the ground
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const body = bones.get('Body');
  body.position.y -= box.min.y;
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);

  root.scale.setScalar(size);
  const rest = new Map();
  for (const [name, b] of bones) rest.set(name, { pos: b.position.toArray(), rot: [b.rotation.x, b.rotation.y, b.rotation.z], scale: [1, 1, 1] });

  return {
    id,
    spec,
    root,
    bones,
    rest,
    bounds,
    info: rig,
    dispose() {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}
