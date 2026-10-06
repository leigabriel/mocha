import * as THREE from 'three';
import { clamp } from '../utils/helpers.js';
import { makeOBB, obbPenetration } from './collision.js';
import { branchPosition, branchQuaternion, masterQuaternion, pivotQuaternion } from './pose.js';
import { FIXED_DT, createBranchState, createMasterState, stepBranch } from './physics.js';

// Charm-vs-charm contact for the hanging cluster. Each charm is a rigid slab on a
// pendulum, so a contact is resolved by swinging the two chains apart: the overlap
// is turned into small rotations of each branch about its mount point (position
// correction) and the closing speed is removed with an impulse (velocity correction).
//
// The same functions drive the live scene, the rest-pose solver and the animation
// baker, so what you see, what you reset to and what you export always agree.
//
// An "item" describes one branch:
//   { sim, slot, lengths, geom: { botY, drop, lug: Vector3, half: [hx, hy, hz] } }

const MAX_CORRECTION = 0.12; // radians per iteration, keeps a deep overlap from exploding
const MIN_ARM = 1e-3;

const _qm = new THREE.Quaternion();
const _qb = new THREE.Quaternion();
const _qc = new THREE.Quaternion();
const _qa = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _dv = new THREE.Vector3();
const _vi = new THREE.Vector3();
const _vj = new THREE.Vector3();
const _n = new THREE.Vector3();

const frames = [];

function ensureFrames(count) {
  while (frames.length < count) {
    frames.push({
      box: makeOBB(),
      mount: new THREE.Vector3(),
      arm: new THREE.Vector3(),
      ax: new THREE.Vector3(), // world axis of a pitch increment
      az: new THREE.Vector3(), // world axis of a roll increment
    });
  }
}

/** Fills `frame` with the charm's world-space box, mount point and increment axes. */
function computeFrame(master, item, spread, frame) {
  const { sim, slot, geom } = item;

  branchPosition(_qm, slot, spread, frame.mount);
  branchQuaternion(master, sim, slot, _qb);
  pivotQuaternion(sim, _qc);

  // Charm body centre in the branch frame: bottom ring, then the swinging charm.
  _v.set(0, geom.drop, 0).sub(geom.lug).applyQuaternion(_qc);
  _v.y += geom.botY;
  frame.box.c.copy(_v).applyQuaternion(_qb).add(frame.mount);

  _qa.multiplyQuaternions(_qb, _qc);
  for (let i = 0; i < 3; i++) {
    frame.box.a[i].set(i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0).applyQuaternion(_qa);
    frame.box.h[i] = geom.half[i];
  }
  frame.arm.subVectors(frame.box.c, frame.mount);

  // Euler order is YXZ: a pitch increment turns about the yawed X axis and a roll
  // increment about the yawed-and-pitched Z axis.
  const psi = master.thetaY + slot.restYaw + sim.thetaY;
  const th = master.thetaX + slot.restPitch + sim.thetaX;
  frame.ax.set(Math.cos(psi), 0, -Math.sin(psi));
  frame.az.set(Math.cos(th) * Math.sin(psi), -Math.sin(th), Math.cos(th) * Math.cos(psi));
}

/** Rotation increments (about the branch mount) that move the charm centre by `delta`. */
function displace(item, frame, delta, scale = 1) {
  const armSq = Math.max(frame.arm.lengthSq(), MIN_ARM * MIN_ARM);
  _w.crossVectors(frame.arm, delta).multiplyScalar(scale / armSq);
  item.sim.thetaX += clamp(_w.dot(frame.ax), -MAX_CORRECTION, MAX_CORRECTION);
  item.sim.thetaZ += clamp(_w.dot(frame.az), -MAX_CORRECTION, MAX_CORRECTION);
}

/** Linear velocity of the charm centre from the branch's angular velocity. */
function centreVelocity(item, frame, out) {
  _w.set(0, 0, 0)
    .addScaledVector(frame.ax, item.sim.omegaX)
    .addScaledVector(frame.az, item.sim.omegaZ);
  _w.y += item.sim.omegaY;
  return out.crossVectors(_w, frame.arm);
}

/** Changes the branch's angular velocity so the charm centre velocity changes by `dv`. */
function accelerate(item, frame, dv) {
  const armSq = Math.max(frame.arm.lengthSq(), MIN_ARM * MIN_ARM);
  _w.crossVectors(frame.arm, dv).multiplyScalar(1 / armSq);
  item.sim.omegaX += _w.dot(frame.ax);
  item.sim.omegaZ += _w.dot(frame.az);
}

/**
 * Pushes overlapping charms apart. Returns the deepest overlap found on the first
 * pass (scene units), so callers can measure how bad a pose was before correction.
 */
export function resolveContacts(master, items, spread, options = {}) {
  const { iterations = 4, slop = 0.0004, restitution = 0.15, velocity = true, bias = 0.8 } = options;
  const n = items.length;
  if (n < 2) return 0;
  ensureFrames(n);
  masterQuaternion(master, _qm);

  let worst = 0;
  for (let iter = 0; iter < iterations; iter++) {
    for (let k = 0; k < n; k++) computeFrame(master, items[k], spread, frames[k]);

    let touched = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const depth = obbPenetration(frames[i].box, frames[j].box, _n);
        if (iter === 0 && depth > worst) worst = depth;
        if (depth <= slop) continue;
        touched = true;

        const push = (depth - slop) * 0.5 * bias;
        _dv.copy(_n).multiplyScalar(-push);
        displace(items[i], frames[i], _dv);
        _dv.copy(_n).multiplyScalar(push);
        displace(items[j], frames[j], _dv);

        if (!velocity) continue;
        centreVelocity(items[i], frames[i], _vi);
        centreVelocity(items[j], frames[j], _vj);
        const closing = _vj.sub(_vi).dot(_n); // negative while the charms approach each other
        if (closing >= 0) continue;
        const e = closing < -0.4 ? restitution : 0;
        const impulse = -(1 + e) * closing * 0.5;
        _dv.copy(_n).multiplyScalar(-impulse);
        accelerate(items[i], frames[i], _dv);
        _dv.copy(_n).multiplyScalar(impulse);
        accelerate(items[j], frames[j], _dv);
      }
    }
    if (!touched) break;
  }
  return worst;
}

/** Deepest overlap between any two charms in the current pose (no correction applied). */
export function maxPenetration(master, items, spread) {
  const n = items.length;
  if (n < 2) return 0;
  ensureFrames(n);
  masterQuaternion(master, _qm);
  for (let k = 0; k < n; k++) computeFrame(master, items[k], spread, frames[k]);
  let worst = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      worst = Math.max(worst, obbPenetration(frames[i].box, frames[j].box, _n));
    }
  }
  return worst;
}

/** One fixed physics step for every branch, followed by contact resolution. */
export function stepItems(master, items, spread, dt, options = {}) {
  const { damping = 1 } = options;
  for (const item of items) stepBranch(item.sim, master, item.lengths, dt, damping);
  return resolveContacts(master, items, spread, options);
}

/**
 * Finds the pose the cluster hangs in when left alone: starts every chain straight,
 * lets gravity and the contacts settle it with heavy damping, then removes any left
 * over overlap. Returns one settled state per item (it does not touch `items`).
 */
export function settleRest(items, spread, steps = 600) {
  const master = createMasterState();
  const scratch = items.map((item) => ({ ...item, sim: createBranchState() }));
  for (let s = 0; s < steps; s++) stepItems(master, scratch, spread, FIXED_DT, { damping: 6 });
  for (let s = 0; s < 8; s++) resolveContacts(master, scratch, spread, { velocity: false, bias: 1, iterations: 6 });
  return scratch.map(({ sim }) => {
    sim.omegaX = sim.omegaY = sim.omegaZ = 0;
    sim.charmOmegaX = sim.charmOmegaZ = 0;
    return sim;
  });
}
