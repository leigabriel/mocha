import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { MM_PER_UNIT } from '../constants/index.js';
import { downloadBlob } from '../utils/helpers.js';
import { resolveContacts, stepItems } from './dynamics.js';
import { createBranchState, createMasterState } from './physics.js';
import { branchPosition, branchQuaternion, masterQuaternion, pivotQuaternion, ringPosition, slotFor } from './pose.js';

const FPS = 30;
const SIM_DT = 1 / 240;
const WARMUP_PERIODS = 5;
const CLOSE_FRAMES = 9; // frames blended back onto frame 0 so the loop is seamless

export const ANIMATION_LABELS = { swing: 'SWING', spin: 'SPIN 360°', both: 'SWING + SPIN' };

// ------------------------------------------------------------------ baking

const SWING_DURATION = 3.2;
const SPIN_DURATION = 3.6;

/** Scripted master motion for each clip; branches and charms are then *simulated*. */
function swingMaster(t, out) {
  const w = (Math.PI * 2 * 2) / SWING_DURATION;
  const wy = (Math.PI * 2) / SWING_DURATION;
  out.thetaX = 0.09 * Math.cos(w * t);
  out.thetaZ = 0.13 * Math.sin(w * t);
  out.thetaY = 0.08 * Math.sin(wy * t);
  out.omegaX = -0.09 * w * Math.sin(w * t);
  out.omegaZ = 0.13 * w * Math.cos(w * t);
  out.omegaY = 0.08 * wy * Math.cos(wy * t);
}

function spinMaster(t, out) {
  const w = (Math.PI * 2) / SPIN_DURATION;
  const phi = w * t;
  out.thetaX = 0.035 * Math.sin(2 * phi);
  out.thetaZ = 0.035 * Math.cos(2 * phi);
  out.thetaY = phi;
  out.omegaX = 0.035 * 2 * w * Math.cos(2 * phi);
  out.omegaZ = -0.035 * 2 * w * Math.sin(2 * phi);
  out.omegaY = w;
}

const CLIPS = {
  swing: { name: 'Mocha_Swing', duration: SWING_DURATION, master: swingMaster },
  spin: { name: 'Mocha_Spin_360', duration: SPIN_DURATION, master: spinMaster },
};

const FIELDS = ['thetaX', 'thetaZ', 'thetaY', 'charmX', 'charmZ'];
const MASTER_FIELDS = ['thetaX', 'thetaZ', 'thetaY'];

/**
 * Runs the same pendulum equations as the live view (same chain lengths, same
 * charm sizes) under the scripted master motion, warms up to the periodic steady
 * state and records one loop. Returns per-frame master and branch angles.
 */
export function simulateLoop(cluster, kind) {
  const clip = CLIPS[kind];
  const frames = Math.round(clip.duration * FPS);
  const master = createMasterState();
  const states = cluster.branches.map((b) => ({ ...createBranchState(), ...b.restSim }));
  const items = cluster.branches.map((b, i) => ({ sim: states[i], slot: slotFor(i), lengths: b.lengths, geom: b.geom }));

  const advanceTo = (from, to) => {
    for (let t = from; t < to - 1e-9; t += SIM_DT) {
      clip.master(t + SIM_DT, master);
      stepItems(master, items, cluster.spread, SIM_DT);
    }
  };

  // Warm up on whole periods so frame 0 is already in steady state.
  advanceTo(0, clip.duration * WARMUP_PERIODS);

  const record = [];
  for (let k = 0; k <= frames; k++) {
    const t = k / FPS;
    if (k > 0) advanceTo((k - 1) / FPS, t);
    clip.master(t, master);
    record.push({
      master: Object.fromEntries(MASTER_FIELDS.map((f) => [f, master[f]])),
      branches: states.map((s) => Object.fromEntries(FIELDS.map((f) => [f, s[f]]))),
    });
  }

  // Blend the tail back onto the first frame for a seamless loop.
  const first = record[0];
  for (let k = frames - CLOSE_FRAMES + 1; k <= frames; k++) {
    const w = (k - (frames - CLOSE_FRAMES)) / CLOSE_FRAMES;
    const s = w * w * (3 - 2 * w);
    const frame = record[k];
    frame.branches.forEach((b, i) => FIELDS.forEach((f) => (b[f] += (first.branches[i][f] - b[f]) * s)));
    // The scripted master already loops; keep its last frame exactly equal to the first.
    if (k === frames) MASTER_FIELDS.forEach((f) => (frame.master[f] = first.master[f]));
  }

  // The blend above can nudge charms into each other, so every frame gets a final
  // position-only pass: the exported clip never has two charms overlapping.
  const scratch = states.map((s) => ({ ...s }));
  const scratchItems = items.map((item, i) => ({ ...item, sim: scratch[i] }));
  const scratchMaster = createMasterState();
  for (const frame of record) {
    Object.assign(scratchMaster, frame.master);
    frame.branches.forEach((b, i) => Object.assign(scratch[i], b));
    for (let pass = 0; pass < 6; pass++) {
      resolveContacts(scratchMaster, scratchItems, cluster.spread, { velocity: false, bias: 1, iterations: 6 });
    }
    frame.branches.forEach((b, i) => FIELDS.forEach((f) => (b[f] = scratch[i][f])));
  }

  return { clip, frames, record };
}

export function bakeAnimation(cluster, kind) {
  const { clip, frames, record } = simulateLoop(cluster, kind);
  const times = Array.from({ length: frames + 1 }, (_, k) => k / FPS);
  const tracks = [];
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();

  const ringQuats = [];
  const ringPos = [];
  record.forEach(({ master }) => {
    const qm = masterQuaternion(master, new THREE.Quaternion());
    ringQuats.push(qm.x, qm.y, qm.z, qm.w);
    ringPosition(qm, v);
    ringPos.push(v.x, v.y, v.z);
  });
  tracks.push(new THREE.VectorKeyframeTrack('MasterSplitRing.position', times, ringPos));
  tracks.push(new THREE.QuaternionKeyframeTrack('MasterSplitRing.quaternion', times, ringQuats));

  cluster.branches.forEach((b, i) => {
    const slot = slotFor(i);
    const pos = [];
    const quats = [];
    const pivotQuats = [];
    record.forEach(({ master, branches }) => {
      const qm = masterQuaternion(master, new THREE.Quaternion());
      branchPosition(qm, slot, cluster.spread, v);
      pos.push(v.x, v.y, v.z);
      branchQuaternion(master, branches[i], slot, q);
      quats.push(q.x, q.y, q.z, q.w);
      pivotQuaternion(branches[i], q);
      pivotQuats.push(q.x, q.y, q.z, q.w);
    });
    tracks.push(new THREE.VectorKeyframeTrack(`CharmBranch_${b.index}.position`, times, pos));
    tracks.push(new THREE.QuaternionKeyframeTrack(`CharmBranch_${b.index}.quaternion`, times, quats));
    tracks.push(new THREE.QuaternionKeyframeTrack(`CharmPivot_${b.index}.quaternion`, times, pivotQuats));
  });

  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}

function getClips(cluster, animType) {
  if (animType === 'both') return [bakeAnimation(cluster, 'swing'), bakeAnimation(cluster, 'spin')];
  return [bakeAnimation(cluster, animType === 'spin' ? 'spin' : 'swing')];
}

// ------------------------------------------------------------ export scene

/** Exports never carry the viewport's hover/selection tint. */
function stripHighlight(node) {
  node.traverse((obj) => {
    if (!obj.isMesh || !obj.material?.emissive || obj.material.emissive.getHex() === 0) return;
    obj.material = obj.material.clone();
    obj.material.emissive.setHex(0x000000);
    obj.material.emissiveIntensity = 1;
  });
}

/**
 * Builds the export hierarchy. `live` copies the current interactive pose; otherwise
 * the cluster is posed at rest (so animation clips start from a clean pose).
 * `unitScale` converts scene units (OBJ: millimetres, glTF: metres).
 */
export function prepareClusterExportRoot(cluster, { live = false, unitScale = 1 } = {}) {
  const root = new THREE.Group();
  root.name = 'Mocha_KeychainCluster';
  root.scale.setScalar(unitScale);

  const master = live ? cluster.sim : createMasterState();
  const qm = masterQuaternion(master, new THREE.Quaternion());

  const ring = cluster.ringMesh.clone(false);
  ring.name = 'MasterSplitRing';
  ring.position.copy(ringPosition(qm, new THREE.Vector3()));
  ring.quaternion.copy(qm);
  root.add(ring);

  cluster.branches.forEach((b, i) => {
    const slot = slotFor(i);
    const bs = live ? b.sim : b.restSim;

    const group = new THREE.Group();
    group.name = `CharmBranch_${b.index}`;
    group.position.copy(branchPosition(qm, slot, cluster.spread, new THREE.Vector3()));
    group.quaternion.copy(branchQuaternion(master, bs, slot, new THREE.Quaternion()));
    group.add(b.hardwareGroup.clone(true));

    const pivot = new THREE.Group();
    pivot.name = `CharmPivot_${b.index}`;
    pivot.position.copy(b.charmPivot.position);
    pivot.quaternion.copy(pivotQuaternion(bs, new THREE.Quaternion()));
    pivot.add(b.charmGroup.clone(true));
    stripHighlight(pivot);
    group.add(pivot);

    root.add(group);
  });

  root.updateMatrixWorld(true);
  return root;
}

// ------------------------------------------------------------------ exports

const stamp = () => Date.now();

function parseGLTF(root, clips, binary) {
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(root, resolve, reject, { binary, animations: clips });
  });
}

export async function exportGLB(cluster, onToast, animType = 'swing') {
  if (!cluster) return;
  const label = ANIMATION_LABELS[animType] ?? ANIMATION_LABELS.swing;
  onToast(`PACKING .GLB (${label})...`);
  try {
    const root = prepareClusterExportRoot(cluster, { unitScale: MM_PER_UNIT / 1000 });
    const result = await parseGLTF(root, getClips(cluster, animType), true);
    if (!(result instanceof ArrayBuffer)) throw new Error('GLTFExporter did not return a binary buffer');
    downloadBlob(new Blob([result], { type: 'model/gltf-binary' }), `mocha_keychain_${animType}_${stamp()}.glb`);
    onToast(`EXPORTED .GLB (${label})`);
  } catch (err) {
    console.error(err);
    onToast('GLB EXPORT FAILED');
  }
}

export async function exportGLTF(cluster, onToast, animType = 'swing') {
  if (!cluster) return;
  const label = ANIMATION_LABELS[animType] ?? ANIMATION_LABELS.swing;
  onToast(`PACKING .GLTF (${label})...`);
  try {
    const root = prepareClusterExportRoot(cluster, { unitScale: MM_PER_UNIT / 1000 });
    const result = await parseGLTF(root, getClips(cluster, animType), false);
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `mocha_keychain_${animType}_${stamp()}.gltf`);
    onToast(`EXPORTED .GLTF (${label})`);
  } catch (err) {
    console.error(err);
    onToast('GLTF EXPORT FAILED');
  }
}

/** Static geometry of the current pose, in millimetres. */
export function exportOBJ(cluster, onToast) {
  if (!cluster) return;
  onToast('PACKING .OBJ (CURRENT POSE, MM)...');
  try {
    const root = prepareClusterExportRoot(cluster, { live: true, unitScale: MM_PER_UNIT });
    const result = new OBJExporter().parse(root);
    downloadBlob(new Blob([result], { type: 'text/plain' }), `mocha_keychain_static_${stamp()}.obj`);
    onToast('SAVED .OBJ (MILLIMETRES)');
  } catch (err) {
    console.error(err);
    onToast('OBJ EXPORT FAILED');
  }
}
