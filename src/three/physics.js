import { wrapAngle } from '../utils/helpers.js';

// Fixed-step pendulum physics shared by the live view and the animation baker, so
// the simulation is identical on 30 Hz and 144 Hz displays.

export const FIXED_DT = 1 / 120;
export const MAX_STEPS_PER_FRAME = 10;

const G_BRANCH = 11.0; // chain + charm pendulum "gravity" (length-aware)
const MASTER_OMEGA_SQ = 27.0; // whole-cluster swing on the peg
const MASTER_DAMPING = 1.85;
const ZETA = 0.35; // branch damping ratio, keeps feel constant across chain lengths

export const SLEEP_VEL = 0.012;
export const SLEEP_DISP = 0.004;
// Charms pressed together keep a tiny residual contact speed (about 1 mm/s), so branches
// sleep at a slightly looser speed than the master swing.
export const BRANCH_SLEEP_VEL = 0.04;
export const BRANCH_SLEEP_DISP = 0.012;

export function createMasterState() {
  return { thetaX: 0, thetaZ: 0, thetaY: 0, omegaX: 0, omegaZ: 0, omegaY: 0 };
}

export function createBranchState() {
  return {
    thetaX: 0, thetaZ: 0, thetaY: 0, omegaX: 0, omegaZ: 0, omegaY: 0,
    // charm swing relative to the bottom jump ring
    charmX: 0, charmZ: 0, charmOmegaX: 0, charmOmegaZ: 0,
  };
}

export function stepMaster(m, dt) {
  const accelX = -MASTER_OMEGA_SQ * Math.sin(m.thetaX) - MASTER_DAMPING * m.omegaX;
  const accelZ = -MASTER_OMEGA_SQ * Math.sin(m.thetaZ) - MASTER_DAMPING * m.omegaZ;
  const accelY = -1.25 * Math.sin(m.thetaY) - 1.95 * m.omegaY;

  m.omegaX += accelX * dt;
  m.omegaZ += accelZ * dt;
  m.omegaY += accelY * dt;
  m.thetaX += m.omegaX * dt;
  m.thetaZ += m.omegaZ * dt;
  m.thetaY = wrapAngle(m.thetaY + m.omegaY * dt);
}

/**
 * Advances one chain + charm pendulum.
 * `lengths.pivot` is the pivot-to-centre-of-mass distance of the chain + charm
 * assembly and `lengths.charm` the charm's pendulum length about the bottom ring.
 */
export function stepBranch(b, m, lengths, dt, dampingScale = 1) {
  const w2 = G_BRANCH / lengths.pivot;
  const damp = 2 * ZETA * Math.sqrt(w2) * dampingScale;

  const accelX = -w2 * Math.sin(b.thetaX) - damp * b.omegaX - 1.8 * m.omegaX;
  const accelZ = -w2 * Math.sin(b.thetaZ) - damp * b.omegaZ - 1.8 * m.omegaZ;
  const accelY = -w2 * 0.4 * Math.sin(b.thetaY) - 0.9 * damp * b.omegaY - 0.9 * m.omegaY;

  b.omegaX += accelX * dt;
  b.omegaZ += accelZ * dt;
  b.omegaY += accelY * dt;
  b.thetaX += b.omegaX * dt;
  b.thetaZ += b.omegaZ * dt;
  b.thetaY += b.omegaY * dt;

  // The charm lags behind the chain's acceleration, then swings back.
  const cw2 = G_BRANCH / lengths.charm;
  const cdamp = 2 * 0.28 * Math.sqrt(cw2) * dampingScale;
  const cAccX = -cw2 * Math.sin(b.charmX) - cdamp * b.charmOmegaX - 0.9 * accelX;
  const cAccZ = -cw2 * Math.sin(b.charmZ) - cdamp * b.charmOmegaZ - 0.9 * accelZ;
  b.charmOmegaX += cAccX * dt;
  b.charmOmegaZ += cAccZ * dt;
  b.charmX += b.charmOmegaX * dt;
  b.charmZ += b.charmOmegaZ * dt;
}

export function masterIsResting(m) {
  const vel = Math.abs(m.omegaX) + Math.abs(m.omegaZ) + Math.abs(m.omegaY);
  const disp = Math.abs(m.thetaX) + Math.abs(m.thetaZ) + Math.abs(m.thetaY);
  return vel < SLEEP_VEL && disp < SLEEP_DISP;
}

/**
 * A branch is at rest when it has stopped moving and sits on its rest pose (the contact
 * equilibrium, `rest`). Checking the position as well keeps it awake at a swing's turning point.
 */
export function branchIsResting(b, rest = createBranchState()) {
  const vel =
    Math.abs(b.omegaX) + Math.abs(b.omegaZ) + Math.abs(b.omegaY) +
    Math.abs(b.charmOmegaX) + Math.abs(b.charmOmegaZ);
  const disp =
    Math.abs(b.thetaX - rest.thetaX) + Math.abs(b.thetaZ - rest.thetaZ) + Math.abs(b.thetaY - rest.thetaY) +
    Math.abs(b.charmX - rest.charmX) + Math.abs(b.charmZ - rest.charmZ);
  return vel < BRANCH_SLEEP_VEL && disp < BRANCH_SLEEP_DISP;
}

export function zeroMaster(m) {
  Object.assign(m, createMasterState());
}

export function zeroBranch(b) {
  Object.assign(b, createBranchState());
}
