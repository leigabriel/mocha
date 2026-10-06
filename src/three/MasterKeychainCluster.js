import * as THREE from 'three';
import { CONFIG, MAX_CHARMS } from '../constants/index.js';
import { clamp, wrapAngle } from '../utils/helpers.js';
import { ClusterCharmBranch } from './ClusterCharmBranch.js';
import { settleRest, stepItems } from './dynamics.js';
import { branchPosition, branchQuaternion, masterQuaternion, pivotQuaternion, ringPosition, slotFor } from './pose.js';
import { applyFinish, createSplitRingMesh, getHardwareMaterial, markHardware } from './hardware.js';
import {
  FIXED_DT,
  createBranchState,
  MAX_STEPS_PER_FRAME,
  branchIsResting,
  createMasterState,
  masterIsResting,
  stepMaster,
  zeroMaster,
} from './physics.js';

const DRAG_FOLLOW_RATE = 24; // 1/s, how tightly the cluster follows a dragged pointer
const _qMaster = new THREE.Quaternion();
const _qTmp = new THREE.Quaternion();
const _vTmp = new THREE.Vector3();
const _box = new THREE.Box3();
const _meshBox = new THREE.Box3();

export class MasterKeychainCluster {
  /**
   * @param {{ onToast?: (msg: string) => void, rng?: () => number }} options
   */
  constructor({ onToast = () => {}, rng = Math.random } = {}) {
    this.onToast = onToast;
    this.rng = rng;

    // The pivot sits on the peg the ring hangs from.
    this.anchorPos = new THREE.Vector3(0, 0.95, 0);
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'MasterKeychainCluster';
    this.rootGroup.position.copy(this.anchorPos);

    this.finish = 'steel';
    this.spread = 1.0;
    this.branches = [];

    this.ringMesh = markHardware(createSplitRingMesh(getHardwareMaterial(this.finish)));
    this.rootGroup.add(this.ringMesh);
    this.ringPick = new THREE.Mesh(
      new THREE.TorusGeometry(CONFIG.masterRingRadius, 0.05, 6, 24),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.ringPick.userData.pick = true;
    this.ringPick.userData.branch = null;
    this.ringPick.name = 'Pick_Ring';
    this.ringMesh.add(this.ringPick);

    this.sim = createMasterState();
    this.accumulator = 0;
    this.asleep = true;
    this.version = 0; // bumped whenever the rendered pose or structure changes

    this.isGrabbed = false;
    this.dragTarget = { x: 0, y: 0, z: 0 };

    this.restBounds = new THREE.Box3();
    this.assemblyBounds = new THREE.Box3();
    this.updateTransforms();
  }

  // ---------------------------------------------------------------- structure

  get hardwareMaterial() {
    return getHardwareMaterial(this.finish);
  }

  addCharm(emoji = '🥑', thickness = 2, chainLinks = 4) {
    if (this.branches.length >= MAX_CHARMS) {
      this.onToast(`MAX ${MAX_CHARMS} CHARMS IN CLUSTER`);
      return null;
    }
    const branch = new ClusterCharmBranch(this.branches.length, emoji, thickness, chainLinks);
    this.branches.push(branch);
    branch.build(this.hardwareMaterial);
    this.rootGroup.add(branch.branchGroup);
    this.structureChanged();
    return branch;
  }

  removeCharm(index) {
    if (this.branches.length <= 1) {
      this.onToast('MINIMUM 1 CHARM REQUIRED');
      return false;
    }
    const branch = this.branches[index];
    if (!branch) return false;
    branch.dispose();
    this.branches.splice(index, 1);
    this.branches.forEach((b, i) => b.rename(i));
    this.structureChanged();
    return true;
  }

  /** Applies emoji / thickness / chain-link changes to one charm and rebuilds it. */
  updateCharm(index, changes) {
    const branch = this.branches[index];
    if (!branch) return null;
    Object.assign(branch, changes);
    const charm = branch.build(this.hardwareMaterial);
    this.structureChanged();
    return charm;
  }

  /** Replaces every charm and the ring settings at once (undo/redo, share links). */
  loadDesign({ charms, finish, spread }) {
    this.branches.forEach((b) => b.dispose());
    this.branches = [];
    this.finish = finish;
    this.spread = spread;
    charms.slice(0, MAX_CHARMS).forEach((c, i) => {
      const branch = new ClusterCharmBranch(i, c.emoji, c.thickness, c.links);
      this.branches.push(branch);
      branch.build(this.hardwareMaterial);
      this.rootGroup.add(branch.branchGroup);
    });
    applyFinish(this.rootGroup, finish);
    this.recomputeRest();
    this.resetPose();
  }

  setFinish(finish) {
    this.finish = finish;
    applyFinish(this.rootGroup, finish);
    this.version++;
  }

  setSpread(spread) {
    this.spread = spread;
    this.structureChanged();
  }

  structureChanged() {
    this.recomputeRest();
    this.wake();
  }

  // ------------------------------------------------------------------ poses

  /** One rigid body per charm for the shared contact solver. */
  collisionItems() {
    return this.branches.map((b, i) => ({ sim: b.sim, slot: slotFor(i), lengths: b.lengths, geom: b.geom }));
  }

  /**
   * Finds the contact equilibrium (the pose the cluster hangs in when left alone, with
   * no two charms overlapping), stores it on each branch and frames the camera on it.
   */
  recomputeRest() {
    const rest = settleRest(this.collisionItems(), this.spread);
    this.branches.forEach((b, i) => (b.restSim = rest[i]));

    const savedMaster = { ...this.sim };
    const savedBranches = this.branches.map((b) => ({ ...b.sim }));
    zeroMaster(this.sim);
    this.branches.forEach((b) => Object.assign(b.sim, b.restSim));
    this.updateTransforms();

    this.assemblyBounds.copy(this.computeBounds());
    // The framing box also includes the peg the ring hangs from.
    this.restBounds.copy(this.assemblyBounds);
    this.restBounds.expandByPoint(_vTmp.copy(this.anchorPos).add(new THREE.Vector3(0, 0.06, 0)));

    Object.assign(this.sim, savedMaster);
    this.branches.forEach((b, i) => Object.assign(b.sim, savedBranches[i]));
    this.updateTransforms();
  }

  /** Puts every branch back on its settled rest pose. */
  applyRestPose() {
    zeroMaster(this.sim);
    this.branches.forEach((b) => Object.assign(b.sim, b.restSim ?? createBranchState()));
  }

  computeBounds() {
    _box.makeEmpty();
    this.rootGroup.updateMatrixWorld(true);
    this.rootGroup.traverse((obj) => {
      if (!obj.isMesh || obj.userData.pick) return;
      if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
      _meshBox.copy(obj.geometry.boundingBox).applyMatrix4(obj.matrixWorld);
      _box.union(_meshBox);
    });
    return _box.clone();
  }

  updateTransforms() {
    masterQuaternion(this.sim, _qMaster);

    // The ring swings about the peg, so its centre travels with the rotation.
    this.ringMesh.position.copy(ringPosition(_qMaster, _vTmp));
    this.ringMesh.quaternion.copy(_qMaster);

    this.branches.forEach((b, idx) => {
      const slot = slotFor(idx);
      b.branchGroup.position.copy(branchPosition(_qMaster, slot, this.spread, _vTmp));
      b.branchGroup.quaternion.copy(branchQuaternion(this.sim, b.sim, slot, _qTmp));
      b.charmPivot.quaternion.copy(pivotQuaternion(b.sim, _qTmp));
    });

    this.rootGroup.updateMatrixWorld(true);
    this.branches.forEach((b) => b.charmGroup?.getWorldPosition(b.worldCentroid));
    this.version++;
  }

  // ---------------------------------------------------------------- dynamics

  wake() {
    this.asleep = false;
  }

  isAwake() {
    return !this.asleep || this.isGrabbed;
  }

  /** Advances physics by `dt` seconds in fixed steps. Returns true if the pose changed. */
  update(dt) {
    if (!this.isAwake()) return false;
    this.accumulator = Math.min(this.accumulator + dt, FIXED_DT * MAX_STEPS_PER_FRAME);
    let stepped = false;
    while (this.accumulator >= FIXED_DT) {
      this.accumulator -= FIXED_DT;
      this.step(FIXED_DT);
      stepped = true;
    }
    if (!stepped) return false;

    if (!this.isGrabbed && masterIsResting(this.sim) && this.branches.every((b) => branchIsResting(b.sim, b.restSim))) {
      this.applyRestPose();
      this.asleep = true;
      this.updateTransforms();
    }
    return true;
  }

  step(dt) {
    const m = this.sim;
    if (this.isGrabbed) {
      const k = 1 - Math.exp(-DRAG_FOLLOW_RATE * dt);
      const px = m.thetaX;
      const pz = m.thetaZ;
      const py = m.thetaY;
      m.thetaX += (this.dragTarget.x - m.thetaX) * k;
      m.thetaZ += (this.dragTarget.z - m.thetaZ) * k;
      m.thetaY += (this.dragTarget.y - m.thetaY) * k;
      // Charms feel the motion of the cluster being dragged.
      m.omegaX = (m.thetaX - px) / dt;
      m.omegaZ = (m.thetaZ - pz) / dt;
      m.omegaY = (m.thetaY - py) / dt;
    } else {
      stepMaster(m, dt);
    }

    stepItems(m, this.collisionItems(), this.spread, dt);
    this.updateTransforms();
  }

  applyImpulse(force = 0.5) {
    const r = () => this.rng() - 0.5;
    this.sim.omegaX += (this.rng() - 0.4) * 4.8 * force;
    this.sim.omegaZ += r() * 5.8 * force;
    this.sim.omegaY += r() * 7.0 * force;
    this.branches.forEach((b) => {
      b.sim.omegaX += r() * 3.5 * force;
      b.sim.omegaZ += r() * 3.5 * force;
      b.sim.omegaY += r() * 4.5 * force;
    });
    this.wake();
  }

  /** Pushes the cluster sideways (-1 = left, +1 = right) or forward/back. */
  nudge(direction, axis = 'z') {
    if (axis === 'x') this.sim.omegaX += direction * 3.2;
    else this.sim.omegaZ += -direction * 3.2;
    this.wake();
  }

  applySpin(speed = 6.5) {
    this.sim.omegaY += (this.rng() > 0.5 ? 1 : -1) * speed;
    this.sim.omegaX += (this.rng() - 0.5) * 1.8;
    this.sim.omegaZ += (this.rng() - 0.5) * 1.8;
    this.wake();
  }

  resetPose() {
    this.applyRestPose();
    this.isGrabbed = false;
    this.asleep = true;
    this.accumulator = 0;
    this.updateTransforms();
  }

  // ------------------------------------------------------------------- grab

  beginGrab() {
    this.isGrabbed = true;
    this.dragTarget.x = this.sim.thetaX;
    this.dragTarget.y = this.sim.thetaY;
    this.dragTarget.z = this.sim.thetaZ;
    this.wake();
  }

  setDragTarget({ x, y, z }) {
    if (x !== undefined) this.dragTarget.x = clamp(x, -1.15, 1.15);
    if (z !== undefined) this.dragTarget.z = clamp(z, -1.15, 1.15);
    if (y !== undefined) this.dragTarget.y = y;
  }

  endGrab({ omegaX = 0, omegaY = 0, omegaZ = 0 } = {}) {
    if (!this.isGrabbed) return;
    this.isGrabbed = false;
    this.sim.thetaY = wrapAngle(this.sim.thetaY);
    this.sim.omegaX = clamp(omegaX, -7, 7);
    this.sim.omegaY = clamp(omegaY, -12, 12);
    this.sim.omegaZ = clamp(omegaZ, -7, 7);
    this.wake();
  }

  // ---------------------------------------------------------------- picking

  getPickTargets() {
    return [this.ringPick, ...this.branches.flatMap((b) => b.pickMeshes)];
  }

  dispose() {
    this.branches.forEach((b) => b.dispose());
    this.branches = [];
    this.ringPick.geometry.dispose();
    this.ringPick.material.dispose();
  }
}
