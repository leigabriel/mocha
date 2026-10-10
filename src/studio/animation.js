import * as THREE from 'three';
import { FPS } from './constants.js';

const DEG = Math.PI / 180;
const ease = {
  linear: (u) => u,
  ease: (u) => u * u * (3 - 2 * u),
  'ease-in': (u) => u * u,
  'ease-out': (u) => 1 - (1 - u) * (1 - u),
};
const _e = new THREE.Euler();

/** Transform of `o` at time `t` (seconds) from its keyframes; null when it has fewer than two keys. */
export function sampleObject(o, t) {
  const ks = o.keys;
  if (!ks || ks.length < 2) return null;
  if (t <= ks[0].t) return { pos: ks[0].pos, quat: quatOf(ks[0].rot), scale: ks[0].scale };
  const last = ks[ks.length - 1];
  if (t >= last.t) return { pos: last.pos, quat: quatOf(last.rot), scale: last.scale };
  let i = 0;
  while (i < ks.length - 2 && t > ks[i + 1].t) i++;
  const a = ks[i];
  const b = ks[i + 1];
  const u = (ease[b.ease] ?? ease.ease)((t - a.t) / Math.max(1e-6, b.t - a.t));
  const mix = (x, y) => x.map((v, k) => v + (y[k] - v) * u);
  return { pos: mix(a.pos, b.pos), quat: quatOf(a.rot).slerp(quatOf(b.rot), u), scale: mix(a.scale, b.scale) };
}

function quatOf(rotDeg) {
  _e.set(rotDeg[0] * DEG, rotDeg[1] * DEG, rotDeg[2] * DEG, 'XYZ');
  return new THREE.Quaternion().setFromEuler(_e);
}

/** Poses every keyed node at time `t`. `nodes` maps object id to Object3D. */
export function applyTime(doc, nodes, t) {
  for (const o of doc.objects) {
    const s = sampleObject(o, t);
    const node = nodes.get(o.id);
    if (!s || !node) continue;
    node.position.set(...s.pos);
    node.quaternion.copy(s.quat);
    node.scale.set(...s.scale);
  }
}

/** Back to the document's own transforms. */
export function poseRest(doc, nodes) {
  for (const o of doc.objects) {
    const node = nodes.get(o.id);
    if (!node) continue;
    node.position.set(...o.pos);
    _e.set(o.rot[0] * DEG, o.rot[1] * DEG, o.rot[2] * DEG, 'XYZ');
    node.quaternion.setFromEuler(_e);
    node.scale.set(...o.scale);
  }
}

/** One baked AnimationClip (30 fps) for every keyed object. Returns null when nothing is animated. */
export function buildClip(doc, nodes) {
  const T = doc.time.duration;
  const frames = Math.max(2, Math.round(T * FPS));
  const tracks = [];
  for (const o of doc.objects) {
    if (o.keys.length < 2) continue;
    const node = nodes.get(o.id);
    if (!node) continue;
    const times = [];
    const pos = [];
    const rot = [];
    const scl = [];
    for (let k = 0; k <= frames; k++) {
      const t = (k / frames) * T;
      const s = sampleObject(o, t);
      times.push(t);
      pos.push(...s.pos);
      rot.push(s.quat.x, s.quat.y, s.quat.z, s.quat.w);
      scl.push(...s.scale);
    }
    for (let i = 4; i < rot.length; i += 4) {
      const dot = rot[i] * rot[i - 4] + rot[i + 1] * rot[i - 3] + rot[i + 2] * rot[i - 2] + rot[i + 3] * rot[i - 1];
      if (dot < 0) for (let j = 0; j < 4; j++) rot[i + j] *= -1;
    }
    tracks.push(
      new THREE.VectorKeyframeTrack(`${node.name}.position`, times, pos),
      new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`, times, rot),
      new THREE.VectorKeyframeTrack(`${node.name}.scale`, times, scl)
    );
  }
  return tracks.length ? new THREE.AnimationClip('Mocha_Studio', T, tracks) : null;
}
