import * as THREE from 'three';
import { FPS } from './constants.js';

/**
 * Stamp Pack motion: a turntable spin and a gentle showcase sway. One function sets
 * the pose for a moment of the loop, so the live view and the exported clips match.
 * Every loop is periodic (the last frame equals the first).
 */

export const CLIPS = {
  spin: { name: 'Pack_Spin_360', label: 'Spin 360°', duration: 5 },
  sway: { name: 'Pack_Sway', label: 'Sway', duration: 4 },
};
export const CLIP_IDS = Object.keys(CLIPS);

const TAU = Math.PI * 2;

export function poseAt(kc, kind, t) {
  const clip = CLIPS[kind];
  if (!clip) return;
  const phase = (TAU * t) / clip.duration;
  if (kind === 'spin') kc.rig.spin.rotation.set(0.09 * Math.sin(phase * 2), phase, 0, 'XYZ');
  else kc.rig.spin.rotation.set(0.1 * Math.sin(phase * 2 + 1), 0.55 * Math.sin(phase), 0.03 * Math.sin(phase), 'XYZ');
}

export function poseRest(kc) {
  kc.rig.spin.rotation.set(0, 0, 0);
  kc.group.updateMatrixWorld(true);
}

export function bakeClip(kc, kind) {
  const clip = CLIPS[kind];
  const frames = Math.round(clip.duration * FPS);
  const times = [];
  const vals = [];
  for (let k = 0; k <= frames; k++) {
    poseAt(kc, kind, (k % frames) / FPS);
    times.push(k / FPS);
    const q = kc.rig.spin.quaternion;
    vals.push(q.x, q.y, q.z, q.w);
  }
  poseRest(kc);
  for (let i = 4; i < vals.length; i += 4) {
    const dot = vals[i] * vals[i - 4] + vals[i + 1] * vals[i - 3] + vals[i + 2] * vals[i - 2] + vals[i + 3] * vals[i - 1];
    if (dot < 0) for (let j = 0; j < 4; j++) vals[i + j] *= -1;
  }
  return new THREE.AnimationClip(clip.name, clip.duration, [new THREE.QuaternionKeyframeTrack('Pack_Spin.quaternion', times, vals)]);
}

export function bakeClips(kc, anim) {
  if (anim === 'both') return CLIP_IDS.map((id) => bakeClip(kc, id));
  return CLIPS[anim] ? [bakeClip(kc, anim)] : [];
}
