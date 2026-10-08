import * as THREE from 'three';
import { relax } from './builder.js';

/**
 * Tag Builder motion. One function, `poseAt`, sets every node of a built keychain for a
 * moment `t` of a loop, so the live view and the exported clips are exactly the same
 * motion. Every loop is periodic in its duration (first frame equals last frame).
 *
 * Rig: Mocha_Swing (tilts about the top of the keychain) > Mocha_Spin (turns about the
 * vertical axis) > content. Each hanging item also sways about the ring wire a little
 * behind the swing, and each tag twists on its chain. A contact pass after every pose
 * keeps neighbours from passing through each other.
 */

export const FPS = 30;
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

export const CLIPS = {
  swing: { name: 'Mocha_Swing', label: 'Swing', duration: 3.2 },
  spin: { name: 'Mocha_Spin_360', label: 'Spin 360°', duration: 3.6 },
  spinswing: { name: 'Mocha_Spin_Swing', label: 'Spin + Swing', duration: 4.0 },
};
export const CLIP_IDS = Object.keys(CLIPS);

const SWING_X = 0.09; // radians, tilt toward / away from the camera
const SWING_Z = 0.13; // radians, tilt side to side
const SWAY = { swing: 5 * DEG, spin: 2.5 * DEG, spinswing: 4 * DEG };
const TWIST = { swing: 9 * DEG, spin: 5 * DEG, spinswing: 7 * DEG };

const _e = new THREE.Euler();

/** Sets the rig and every hanging item for time `t` (seconds) of clip `kind`. */
export function poseAt(kc, kind, t) {
  const clip = CLIPS[kind];
  if (!clip) return;
  const { swing, spin } = kc.rig;
  const T = clip.duration;
  const phase = (TAU * t) / T;
  const w = 2 * phase; // two swing cycles per loop

  let tiltX;
  let tiltZ;
  let turn;
  if (kind === 'swing') {
    tiltX = SWING_X * Math.cos(w);
    tiltZ = SWING_Z * Math.sin(w);
    turn = 0.08 * Math.sin(phase);
  } else if (kind === 'spin') {
    turn = phase;
    tiltX = 0.035 * Math.sin(2 * phase);
    tiltZ = 0.035 * Math.cos(2 * phase);
  } else {
    turn = phase;
    tiltX = SWING_X * Math.cos(w);
    tiltZ = SWING_Z * Math.sin(w);
  }
  swing.rotation.set(tiltX, 0, tiltZ);
  spin.rotation.set(0, turn, 0);

  const n = kc.items.length;
  kc.items.forEach((b, i) => {
    const lag = (i / Math.max(1, n)) * 1.6 + 0.6;
    b.hang.rotation.x = b.restPitch + SWAY[kind] * Math.sin(w - lag);
    if (b.twist) {
      _e.set(0, b.restTwist + TWIST[kind] * Math.sin(w - lag * 1.3 + 1.1), 0);
      b.twist.rotation.copy(_e);
    }
  });
  relax(kc.items, kc.group);
}

/** Back to the built pose. */
export function poseRest(kc) {
  kc.rig.swing.rotation.set(0, 0, 0);
  kc.rig.spin.rotation.set(0, 0, 0);
  kc.items.forEach((b) => {
    b.hang.rotation.x = b.restPitch;
    if (b.twist) b.twist.rotation.set(0, b.restTwist, 0);
  });
  kc.group.updateMatrixWorld(true);
}

/** Samples one loop and returns a THREE.AnimationClip (rotation tracks only). */
export function bakeClip(kc, kind) {
  const clip = CLIPS[kind];
  const frames = Math.round(clip.duration * FPS);
  const times = [];
  const names = new Map(); // node -> quaternion values
  const nodes = [kc.rig.swing, kc.rig.spin, ...kc.items.map((b) => b.hang), ...kc.items.filter((b) => b.twist).map((b) => b.twist)];
  nodes.forEach((node) => names.set(node, []));

  for (let k = 0; k <= frames; k++) {
    const t = (k % frames) / FPS; // the last frame repeats frame 0
    times.push(k / FPS);
    poseAt(kc, kind, t);
    nodes.forEach((node) => {
      const q = node.quaternion;
      names.get(node).push(q.x, q.y, q.z, q.w);
    });
  }
  poseRest(kc);

  // keep each quaternion on the same hemisphere as the previous key so slerp takes the short way
  names.forEach((vals) => {
    for (let i = 4; i < vals.length; i += 4) {
      const dot = vals[i] * vals[i - 4] + vals[i + 1] * vals[i - 3] + vals[i + 2] * vals[i - 2] + vals[i + 3] * vals[i - 1];
      if (dot < 0) for (let j = 0; j < 4; j++) vals[i + j] *= -1;
    }
  });

  const tracks = [];
  names.forEach((vals, node) => tracks.push(new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`, times, vals)));
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}

export function bakeClips(kc, animType) {
  if (animType === 'both') return CLIP_IDS.map((id) => bakeClip(kc, id));
  if (CLIPS[animType]) return [bakeClip(kc, animType)];
  return [];
}
