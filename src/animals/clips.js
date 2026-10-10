import * as THREE from 'three';
import { CLIP_LIST, SPECIES, clipsFor } from './species.js';
import { rad } from './parts.js';

const FPS = 30;
const TAU = Math.PI * 2;
const sin = Math.sin;
const cos = Math.cos;

/** Periodic bump centred at `c` (0..1) with width `w`. */
const bump = (t, c, w) => {
  let d = Math.abs(((t - c + 0.5) % 1 + 1) % 1 - 0.5);
  d /= w;
  return Math.exp(-d * d);
};
const smooth = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
/** 0 at the cycle ends, 1 through the middle: reach down, hold, come back up. */
const hold = (t, a = 0.16, b = 0.8, c = 0.95) => smooth(0, a, t) * (1 - smooth(b, c, t));

export const durationFor = (id, clip) => {
  const base = CLIP_LIST.find((c) => c.id === clip).duration;
  if (clip === 'fly') return { parrot: 0.45, dove: 0.5, eagle: 1.0 }[id] ?? base;
  if (clip === 'walk' || clip === 'run') {
    const s = SPECIES[id];
    const big = s.kind === 'quad' ? (s.upper + s.lower) / 0.5 : s.legLen / 0.25;
    const k = Math.min(1.8, Math.max(0.7, Math.sqrt(big)));
    return Math.round(base * k * 20) / 20;
  }
  return base;
};

function quadPoses(rig) {
  const sp = rig.spec;
  const L = rig.info.legTotal;
  const Hb = rig.info.Hb;
  const wag = sp.id === 'dog' ? 2.2 : sp.id === 'cat' ? 1.4 : 1;
  const feet = ['FL', 'FR', 'BL', 'BR'];
  const legs = (c, phases, A, B, rear = 0.8) => {
    feet.forEach((n, i) => {
      const u = c.t + phases[n];
      const s = sin(TAU * u);
      const flex = Math.max(0, -cos(TAU * u));
      const k = n[0] === 'B' ? rear : 1;
      c.r(`${n}_Upper`, A * k * s, 0, 0);
      c.r(`${n}_Lower`, B * flex * (n[0] === 'B' ? 0.8 : 1), 0, 0);
      c.r(`${n}_Paw`, -0.5 * B * flex + 0.12 * s, 0, 0);
      void i;
    });
  };
  const eyes = (c, closed) => {
    for (const e of ['EyeL', 'EyeR']) c.s(e, 1, closed ?? 1, 1);
  };
  const reach = (() => {
    const h0 = Hb + sp.bodyH * 0.45;
    const a = rad(sp.neckAngle);
    const target = Math.min(1, Math.max(-1, (h0 - 0.04 - sp.headLen * 0.3) / Math.max(0.05, sp.neckLen)));
    return Math.min(1.75, Math.max(0.35, Math.acos(target) - a));
  })();

  return {
    idle: (c) => {
      const b = sin(c.ph);
      c.s('Body', 1 + 0.012 * b, 1 + 0.02 * b, 1);
      c.r('Neck', 0.025 * b, 0.0, 0);
      c.r('Head', 0.03 * sin(c.ph + 0.6), 0.32 * sin(c.ph) + 0.12 * sin(2 * c.ph + 1), 0.04 * sin(c.ph));
      c.r('Body', 0, 0, 0.01 * sin(c.ph));
      c.r('Tail1', 0.05 * sin(2 * c.ph), 0.22 * wag * sin(2 * c.ph), 0);
      c.r('Tail2', 0, 0.28 * wag * sin(2 * c.ph - 0.8), 0);
      c.r('Tail3', 0, 0.3 * wag * sin(2 * c.ph - 1.6), 0);
      c.r('EarL', 0, 0, 0.5 * bump(c.t, 0.55, 0.035));
      c.r('EarR', 0, 0, -0.5 * bump(c.t, 0.3, 0.035));
      const blink = 1 - 0.92 * Math.max(bump(c.t, 0.18, 0.012), bump(c.t, 0.72, 0.012));
      eyes(c, blink);
      c.r('Jaw', 0.02 * (1 + b), 0, 0);
    },
    walk: (c) => {
      legs(c, { FL: 0, BR: 0.25, FR: 0.5, BL: 0.75 }, 0.5, 0.95);
      c.p('Body', 0, 0.018 * L * sin(4 * Math.PI * c.t + 0.4), 0);
      c.r('Body', 0.02 * sin(4 * Math.PI * c.t), 0.07 * sin(TAU * c.t), 0.045 * sin(TAU * c.t + 1.2));
      c.r('Neck', 0.07 * sin(4 * Math.PI * c.t + 1.4), 0.04 * sin(TAU * c.t), 0);
      c.r('Head', -0.05 * sin(4 * Math.PI * c.t + 1.6), 0, 0);
      c.r('Tail1', 0.05 * sin(4 * Math.PI * c.t), 0.2 * wag * sin(TAU * c.t + 0.5), 0);
      c.r('Tail2', 0, 0.25 * wag * sin(TAU * c.t - 0.3), 0);
      c.r('Tail3', 0, 0.28 * wag * sin(TAU * c.t - 1.1), 0);
      c.r('EarL', 0, 0, 0.06 * sin(TAU * c.t * 2));
      c.r('EarR', 0, 0, -0.06 * sin(TAU * c.t * 2 + 1));
    },
    run: (c) => {
      legs(c, { FL: 0, FR: 0.07, BL: 0.5, BR: 0.57 }, 0.95, 1.5, 0.95);
      const g = TAU * c.t;
      c.p('Body', 0, L * 0.09 * (0.5 + 0.5 * cos(g * 2 - 0.3)) - L * 0.04, 0);
      c.r('Body', 0.13 * sin(g + 1.2), 0.03 * sin(g), 0.03 * sin(g));
      c.r('Neck', -0.18 + 0.12 * sin(g + 2.2), 0, 0);
      c.r('Head', 0.1 * sin(g + 2.8), 0, 0);
      c.r('Tail1', 0.35 + 0.1 * sin(g + 1), 0.08 * sin(g), 0);
      c.r('Tail2', 0.15 * sin(g + 0.4), 0.1 * sin(g - 0.6), 0);
      c.r('Tail3', 0.2 * sin(g - 0.2), 0.12 * sin(g - 1.2), 0);
      c.r('EarL', -0.5, 0, 0.1);
      c.r('EarR', -0.5, 0, -0.1);
      c.r('Jaw', 0.14 + 0.1 * sin(g * 2), 0, 0);
    },
    eat: (c) => {
      const e = hold(c.t);
      const chew = Math.max(0, hold(c.t, 0.3, 0.72, 0.8)) * Math.abs(sin(TAU * c.t * 4));
      c.r('Neck', reach * e, 0.1 * e * sin(TAU * c.t * 2), 0);
      c.r('Head', 0.55 * e, 0.0, 0.05 * e * sin(TAU * c.t * 4));
      c.r('Jaw', 0.3 * chew + 0.04, 0, 0);
      c.r('Body', 0.05 * e, 0, 0);
      c.r('FL_Upper', -0.18 * e, 0, 0);
      c.r('FL_Lower', 0.4 * e, 0, 0);
      c.r('FR_Upper', 0.06 * e, 0, 0);
      c.r('EarL', 0.1, 0, 0.35 * bump(c.t, 0.4, 0.04));
      c.r('EarR', 0.1, 0, -0.35 * bump(c.t, 0.65, 0.04));
      c.r('Tail1', 0, 0.3 * wag * sin(TAU * c.t * 3), 0);
      c.r('Tail2', 0, 0.35 * wag * sin(TAU * c.t * 3 - 0.8), 0);
      c.s('Body', 1, 1 + 0.01 * sin(TAU * c.t * 3), 1);
    },
    sleep: (c) => {
      const b = sin(c.ph);
      c.p('Body', 0, -(Hb - sp.bodyH * 0.9), 0);
      c.s('Body', 1 + 0.02 * b, 1 + 0.035 * b, 1);
      for (const n of ['FL', 'FR']) {
        c.r(`${n}_Upper`, -1.15, 0, n === 'FL' ? -0.15 : 0.15);
        c.r(`${n}_Lower`, 2.1, 0, 0);
        c.r(`${n}_Paw`, -0.9, 0, 0);
      }
      for (const n of ['BL', 'BR']) {
        c.r(`${n}_Upper`, -1.25, 0, n === 'BL' ? -0.3 : 0.3);
        c.r(`${n}_Lower`, 2.3, 0, 0);
        c.r(`${n}_Paw`, -0.9, 0, 0);
      }
      c.r('Neck', 0.55 + 0.01 * b, 0.0, 0);
      c.r('Head', 0.35, 0.55, 0.3);
      c.r('Jaw', 0.03, 0, 0);
      c.r('EarL', 0.2, 0, 0.3);
      c.r('EarR', 0.2, 0, -0.3);
      c.r('Tail1', 0, 0.9, 0);
      c.r('Tail2', 0, 0.9, 0);
      c.r('Tail3', 0, 0.7, 0);
      eyes(c, 0.06);
    },
  };
}

function birdPoses(rig) {
  const sp = rig.spec;
  const R = sp.bodyR;
  const L = sp.legLen;
  const big = sp.id === 'ostrich';
  const wingBones = [['L', 1], ['R', -1]];
  const spread = (c, s, flap = 0, lag = 0, fold = 0) => {
    for (const [S, sd] of wingBones) {
      c.r(`Wing${S}_1`, 0, sd * rad(-90) * s, sd * flap);
      c.r(`Wing${S}_2`, 0, sd * (rad(170) * s + fold), sd * lag * 0.6);
      c.r(`Wing${S}_3`, 0, sd * rad(-170) * s, sd * lag);
    }
  };
  const eyes = (c, v) => {
    for (const e of ['EyeL', 'EyeR']) c.s(e, 1, v, 1);
  };
  const legs = (c, A, B) => {
    for (const [S, ph] of [['L', 0], ['R', 0.5]]) {
      const u = c.t + ph;
      const s = sin(TAU * u);
      const flex = Math.max(0, -cos(TAU * u));
      c.r(`Leg${S}_Thigh`, A * s, 0, 0);
      c.r(`Leg${S}_Shin`, B * flex, 0, 0);
      c.r(`Leg${S}_Foot`, -0.7 * B * flex + 0.15 * s, 0, 0);
    }
  };
  const peckBumps = (t) => Math.max(bump(t, 0.16, 0.05), bump(t, 0.44, 0.05), bump(t, 0.72, 0.05));

  return {
    idle: (c) => {
      const b = sin(c.ph);
      c.s('Body', 1 + 0.015 * b, 1 + 0.02 * b, 1);
      c.r('Neck1', 0.03 * b, 0.2 * sin(c.ph), 0.03 * sin(c.ph + 1));
      c.r('Neck2', 0.04 * sin(2 * c.ph), 0.25 * sin(c.ph + 0.6), 0.1 * sin(c.ph));
      c.r('Head', 0.05 * sin(2 * c.ph + 1), 0.1 * sin(c.ph + 1), 0.18 * sin(c.ph + 2));
      c.r('Tail', 0.06 * sin(2 * c.ph), 0.1 * sin(c.ph), 0);
      for (const [S, sd] of wingBones) c.r(`Wing${S}_1`, 0, 0, sd * 0.1 * bump(c.t, S === 'L' ? 0.5 : 0.55, 0.04));
      eyes(c, 1 - 0.92 * Math.max(bump(c.t, 0.25, 0.015), bump(c.t, 0.78, 0.015)));
      c.r('Jaw', 0.04 * (1 + b), 0, 0);
    },
    walk: (c) => {
      const g = TAU * c.t;
      legs(c, big ? 0.55 : 0.45, big ? 0.9 : 0.8);
      c.p('Body', 0, 0.015 * (L + R) * sin(2 * g + 0.4), 0);
      c.r('Body', 0.02 * sin(2 * g), 0.04 * sin(g), 0.05 * sin(g + 1.4));
      c.r('Neck1', 0.1 * sin(2 * g + 1), 0.03 * sin(g), 0);
      c.r('Neck2', -0.12 * sin(2 * g + 1.4), 0, 0);
      c.r('Head', 0.05 * sin(2 * g + 2), 0, 0);
      c.r('Tail', 0.07 * sin(2 * g + 0.5), 0.05 * sin(g), 0);
      if (big) spread(c, 0.05, 0.05 * sin(g), 0);
    },
    run: (c) => {
      const g = TAU * c.t;
      legs(c, big ? 0.85 : 0.75, big ? 1.4 : 1.2);
      c.p('Body', 0, (L + R) * 0.05 * (0.5 + 0.5 * cos(2 * g - 0.3)), 0);
      c.r('Body', 0.22 + 0.05 * sin(2 * g), 0.03 * sin(g), 0.04 * sin(g));
      c.r('Neck1', -0.2 + 0.08 * sin(2 * g + 1), 0, 0);
      c.r('Neck2', 0.06 * sin(2 * g + 1.6), 0, 0);
      c.r('Head', -0.1, 0, 0);
      c.r('Tail', 0.15 + 0.08 * sin(2 * g), 0.08 * sin(g), 0);
      spread(c, big ? 0.55 : 0.22, 0.28 * sin(2 * g) + (big ? 0.15 : 0.05), 0.1 * sin(2 * g - 1));
      c.r('Jaw', 0.1, 0, 0);
    },
    eat: (c) => {
      const pk = peckBumps(c.t);
      const dip = big ? 1.6 : 1.0;
      c.r('Body', (big ? 0.25 : 0.4) * pk, 0, 0);
      c.r('Neck1', dip * pk + 0.15 * hold(c.t), 0, 0);
      c.r('Neck2', 0.7 * pk, 0.2 * sin(TAU * c.t) * (1 - pk), 0);
      c.r('Head', 0.35 * pk, 0, 0.1 * sin(TAU * c.t * 2) * (1 - pk));
      c.r('Jaw', 0.5 * pk * 0.6 + 0.02, 0, 0);
      for (const S of ['L', 'R']) {
        c.r(`Leg${S}_Thigh`, -0.12 * pk, 0, 0);
        c.r(`Leg${S}_Shin`, 0.15 * pk, 0, 0);
      }
      c.r('Tail', 0.18 * pk, 0.05 * sin(TAU * c.t * 2), 0);
      eyes(c, 1 - 0.9 * bump(c.t, 0.9, 0.015));
    },
    fly: (c) => {
      const g = c.ph;
      const slow = sp.id === 'eagle';
      const amp = slow ? 0.7 : 0.85;
      const flap = amp * sin(g) + 0.12 * sin(2 * g + 0.5);
      const lag = 0.5 * sin(g - 1.1);
      spread(c, 1, flap, lag * 1.1, 0.5 * Math.max(0, sin(g)));
      c.p('Root', 0, (rig.bounds.max.y - rig.bounds.min.y) * 0.45 + 0.04 * cos(g) * (L + R), 0);
      c.r('Body', 0.08 * sin(g + 0.4) + 0.18, 0, 0.02 * sin(g));
      c.r('Neck1', 0.55, 0.02 * sin(g), 0);
      c.r('Neck2', -0.1 + 0.03 * sin(g), 0, 0);
      c.r('Head', -0.45, 0, 0);
      for (const S of ['L', 'R']) {
        c.r(`Leg${S}_Thigh`, slow ? 0.35 : 0.9, 0, 0);
        c.r(`Leg${S}_Shin`, slow ? 0.1 : 0.7, 0, 0);
        c.r(`Leg${S}_Foot`, slow ? -0.2 : -0.5, 0, 0);
      }
      c.r('Tail', 0.12 * sin(g - 0.6) - 0.05, 0, 0);
      c.s('Tail', 1.35, 1, 1);
      c.r('Jaw', 0.03, 0, 0);
    },
    sleep: (c) => {
      const b = sin(c.ph);
      c.p('Body', 0, -(L * 0.78), 0);
      c.s('Body', 1 + 0.025 * b, 1 + 0.04 * b, 1);
      for (const S of ['L', 'R']) {
        c.r(`Leg${S}_Thigh`, -1.35 - 0.3, 0, 0);
        c.r(`Leg${S}_Shin`, 2.4 + 0.6, 0, 0);
        c.r(`Leg${S}_Foot`, -1.1, 0, 0);
      }
      const k = big ? 0.55 : 1;
      c.r('Neck1', 0.35 * k, 1.35 * k, 0);
      c.r('Neck2', 0.6, 1.2, 0);
      c.r('Head', 0.1, 0.9, 0.5);
      c.r('Jaw', 0.0, 0, 0);
      c.r('Tail', -0.1, 0, 0);
      eyes(c, 0.05);
    },
  };
}

/** Builds one baked, looping AnimationClip per available action for a rig (30 fps). */
export function buildClips(rig, ids = clipsFor(rig.id)) {
  const poses = rig.spec.kind === 'quad' ? quadPoses(rig) : birdPoses(rig);
  const out = {};
  for (const id of ids) {
    const fn = poses[id];
    if (!fn) continue;
    out[id] = bake(rig, id, durationFor(rig.id, id), fn);
  }
  return out;
}

function bake(rig, name, T, fn) {
  const n = Math.max(2, Math.round(T * FPS));
  const frames = [];
  for (let f = 0; f <= n; f++) {
    const rot = new Map();
    const pos = new Map();
    const scl = new Map();
    const add = (map, key, v) => {
      const cur = map.get(key) ?? [0, 0, 0];
      map.set(key, [cur[0] + v[0], cur[1] + v[1], cur[2] + v[2]]);
    };
    const mul = (key, v) => {
      const cur = scl.get(key) ?? [1, 1, 1];
      scl.set(key, [cur[0] * v[0], cur[1] * v[1], cur[2] * v[2]]);
    };
    const t = f / n;
    fn({
      t,
      ph: TAU * t,
      r: (b, x, y, z) => rig.bones.has(b) && add(rot, b, [x, y, z]),
      p: (b, x, y, z) => (b === 'Root' || rig.bones.has(b)) && add(pos, b, [x, y, z]),
      s: (b, x, y, z) => rig.bones.has(b) && mul(b, [x, y, z]),
    });
    frames.push({ rot, pos, scl });
  }
  const times = frames.map((_, i) => (i / n) * T);
  const names = (k) => [...new Set(frames.flatMap((fr) => [...fr[k].keys()]))];
  const tracks = [];
  const e = new THREE.Euler();
  const q = new THREE.Quaternion();
  const prev = new THREE.Quaternion();
  for (const b of names('rot')) {
    const rest = rig.rest.get(b).rot;
    const vals = [];
    frames.forEach((fr, i) => {
      const d = fr.rot.get(b) ?? [0, 0, 0];
      e.set(rest[0] + d[0], rest[1] + d[1], rest[2] + d[2], 'ZYX');
      q.setFromEuler(e);
      if (i > 0 && q.dot(prev) < 0) q.set(-q.x, -q.y, -q.z, -q.w);
      prev.copy(q);
      vals.push(q.x, q.y, q.z, q.w);
    });
    tracks.push(new THREE.QuaternionKeyframeTrack(`${b}.quaternion`, times, vals));
  }
  for (const b of names('pos')) {
    const rest = b === 'Root' ? [0, 0, 0] : rig.rest.get(b).pos;
    const vals = frames.flatMap((fr) => {
      const d = fr.pos.get(b) ?? [0, 0, 0];
      return [rest[0] + d[0], rest[1] + d[1], rest[2] + d[2]];
    });
    tracks.push(new THREE.VectorKeyframeTrack(`${b === 'Root' ? rig.root.name : b}.position`, times, vals));
  }
  for (const b of names('scl')) {
    const vals = frames.flatMap((fr) => fr.scl.get(b) ?? [1, 1, 1]);
    tracks.push(new THREE.VectorKeyframeTrack(`${b}.scale`, times, vals));
  }
  const clip = new THREE.AnimationClip(`${rig.root.name}_${name[0].toUpperCase()}${name.slice(1)}`, T, tracks);
  clip.userData = { id: name, fps: FPS };
  return clip;
}
