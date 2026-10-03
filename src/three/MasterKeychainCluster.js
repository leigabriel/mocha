import * as THREE from 'three';
import { CONFIG, HARDWARE_MATS } from '../constants/index.js';
import { createSplitRingMesh } from './meshBuilders.js';
import { ClusterCharmBranch } from './ClusterCharmBranch.js';
import { getClusterSlots } from './clusterSlots.js';

export class MasterKeychainCluster {
  constructor(showToastFn = null) {
    this.showToast = showToastFn || ((msg) => {
      if (typeof window.showToast === 'function') window.showToast(msg);
    });

    this.anchorPos = new THREE.Vector3(0, 0.98, 0);
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = "MasterKeychainCluster";
    this.rootGroup.position.copy(this.anchorPos);

    this.masterSplitRingMesh = null;
    this.branches = [];
    this.finish = 'steel';

    // Master Cluster Pendulum Physics (Cluster-wide swing & 360° spin)
    this.thetaX = 0; // Cluster tilt X
    this.thetaZ = 0; // Cluster tilt Z
    this.thetaY = 0; // Cluster 360° yaw spin
    this.omegaX = 0;
    this.omegaZ = 0;
    this.omegaY = 0;

    this.isGrabbed = false;
    this.dragTargetAngleX = 0;
    this.dragTargetAngleZ = 0;

    this.buildCluster();
  }

  buildCluster() {
    while (this.rootGroup.children.length > 0) {
      this.rootGroup.remove(this.rootGroup.children[0]);
    }

    const matSpec = HARDWARE_MATS[this.finish] || HARDWARE_MATS.steel;
    const hwMaterial = new THREE.MeshStandardMaterial({
      color: matSpec.color,
      metalness: matSpec.metalness,
      roughness: matSpec.roughness,
      transparent: false,
      opacity: 1.0,
      depthWrite: true,
    });

    // 1. One Central Shared Split Ring (Top Anchor)
    this.masterSplitRingMesh = createSplitRingMesh(hwMaterial, CONFIG.masterRingRadius, CONFIG.masterRingWire);
    this.rootGroup.add(this.masterSplitRingMesh);

    // 2. Individual Attached Charm Branches with 4-10 Chain Links
    this.branches.forEach((b) => {
      b.build(hwMaterial);
      this.rootGroup.add(b.branchGroup);
    });

    this.updateMeshTransforms();
  }

  addCharm(emoji = '🥑', thickness = 2, chainLinks = 4) {
    if (this.branches.length >= 5) {
      this.showToast('MAX 5 CHARMS IN CLUSTER');
      return null;
    }
    const index = this.branches.length;
    const branch = new ClusterCharmBranch(index, emoji, thickness, chainLinks);
    this.branches.push(branch);

    const matSpec = HARDWARE_MATS[this.finish] || HARDWARE_MATS.steel;
    const hwMaterial = new THREE.MeshStandardMaterial({
      color: matSpec.color,
      metalness: matSpec.metalness,
      roughness: matSpec.roughness,
      transparent: false,
      opacity: 1.0,
      depthWrite: true,
    });

    branch.build(hwMaterial);
    this.rootGroup.add(branch.branchGroup);
    this.applyImpulse(0.5);
    this.updateMeshTransforms();
    return branch;
  }

  removeCharm(index) {
    if (this.branches.length <= 1) {
      this.showToast('MINIMUM 1 CHARM REQUIRED');
      return false;
    }
    const branch = this.branches[index];
    this.rootGroup.remove(branch.branchGroup);
    this.branches.splice(index, 1);

    // Re-index remaining branches
    this.branches.forEach((b, i) => {
      b.index = i;
      b.branchGroup.name = `CharmBranch_${i}_${b.emoji}`;
    });

    this.applyImpulse(0.4);
    this.updateMeshTransforms();
    return true;
  }

  updatePhysics(dt) {
    // 1. Master Shared Split Ring Physics
    if (this.isGrabbed) {
      this.thetaX += (this.dragTargetAngleX - this.thetaX) * Math.min(1.0, dt * 24.0);
      this.thetaZ += (this.dragTargetAngleZ - this.thetaZ) * Math.min(1.0, dt * 24.0);
    } else {
      // Pendulum swing for the master cluster
      const effectiveL = CONFIG.masterRingRadius + 0.35;
      const gOverL = 24.0 / effectiveL;

      const accelX = -gOverL * Math.sin(this.thetaX) - 1.85 * this.omegaX;
      const accelZ = -gOverL * Math.sin(this.thetaZ) - 1.85 * this.omegaZ;
      
      // Gentle centering torque for 360° spin
      const restTorqueY = -1.25 * Math.sin(this.thetaY);
      const accelY = restTorqueY - 1.95 * this.omegaY;

      this.omegaX += accelX * dt;
      this.omegaZ += accelZ * dt;
      this.omegaY += accelY * dt;

      this.thetaX += this.omegaX * dt;
      this.thetaZ += this.omegaZ * dt;
      this.thetaY += this.omegaY * dt;

      // Asymptotic rest stabilizer: Completely eliminates vibration when untouched
      const vel = Math.abs(this.omegaX) + Math.abs(this.omegaZ) + Math.abs(this.omegaY);
      const disp = Math.abs(this.thetaX) + Math.abs(this.thetaZ) + Math.abs(this.thetaY % (Math.PI * 2));
      if (vel < 0.0018 && disp < 0.0012) {
        this.thetaX = 0; this.thetaZ = 0; this.thetaY = 0;
        this.omegaX = 0; this.omegaZ = 0; this.omegaY = 0;
      }
    }

    // 2. Individual Charm Physics
    const gChain = 32.0;
    this.branches.forEach((b) => {
      const accelX = -gChain * Math.sin(b.thetaX) - 4.0 * b.omegaX - this.omegaX * 1.8;
      const accelZ = -gChain * Math.sin(b.thetaZ) - 4.0 * b.omegaZ - this.omegaZ * 1.8;
      const accelY = -gChain * 0.4 * Math.sin(b.thetaY) - 3.6 * b.omegaY - this.omegaY * 0.9;

      b.omegaX += accelX * dt;
      b.omegaZ += accelZ * dt;
      b.omegaY += accelY * dt;

      b.thetaX += b.omegaX * dt;
      b.thetaZ += b.omegaZ * dt;
      b.thetaY += b.omegaY * dt;
    });

    // 3. Mutual Soft Repulsion
    const nBranches = this.branches.length;
    for (let i = 0; i < nBranches; i++) {
      for (let j = i + 1; j < nBranches; j++) {
        const b1 = this.branches[i];
        const b2 = this.branches[j];

        const dx = b1.worldCentroid.x - b2.worldCentroid.x;
        const dz = b1.worldCentroid.z - b2.worldCentroid.z;
        const distSq = dx * dx + dz * dz;
        const minDist = 0.32 * CONFIG.clusterSpread;

        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = (minDist - dist) / minDist;
          const pushX = (dx / dist) * overlap * 1.8;
          const pushZ = (dz / dist) * overlap * 1.8;

          b1.omegaZ += pushX * dt * 14.0;
          b2.omegaZ -= pushX * dt * 14.0;
          b1.omegaX -= pushZ * dt * 14.0;
          b2.omegaX += pushZ * dt * 14.0;
        }
      }
    }

    this.updateMeshTransforms();
  }

  updateMeshTransforms() {
    const _qMaster = new THREE.Quaternion();
    const _eMaster = new THREE.Euler(this.thetaX, this.thetaY, this.thetaZ, 'YXZ');
    _qMaster.setFromEuler(_eMaster);

    // 1. Shared Master Split Ring (Top Pivot)
    this.masterSplitRingMesh.position.set(0, 0, 0);
    this.masterSplitRingMesh.quaternion.copy(_qMaster);

    const spread = CONFIG.clusterSpread;
    const CLUSTER_SLOTS = getClusterSlots();

    // 2. Position Each Charm in the Fanned Cluster
    this.branches.forEach((b, idx) => {
      const slot = CLUSTER_SLOTS[idx % CLUSTER_SLOTS.length];

      // Top mount point on the shared split ring
      const ringPos = slot.ringOffset.clone();
      ringPos.x *= spread;
      ringPos.applyQuaternion(_qMaster);
      b.branchGroup.position.copy(ringPos);

      // Combined angles: Slot Fanned Angle + Master Rotation + Dynamic Secondary Inertia
      const totalYaw = this.thetaY + slot.restYaw + b.thetaY;
      const totalPitch = this.thetaX + slot.restPitch + b.thetaX;
      const totalRoll = this.thetaZ + slot.restRoll + b.thetaZ;

      const _eBranch = new THREE.Euler(totalPitch, totalYaw, totalRoll, 'YXZ');
      const _qBranch = new THREE.Quaternion().setFromEuler(_eBranch);
      b.branchGroup.quaternion.copy(_qBranch);

      // Keep track of world centroid for collision calculations
      if (b.charmGroup) {
        b.charmGroup.getWorldPosition(b.worldCentroid);
      }
    });
  }

  applyImpulse(force = 0.5) {
    this.omegaX += (Math.random() - 0.4) * 4.8 * force;
    this.omegaZ += (Math.random() - 0.5) * 5.8 * force;
    this.omegaY += (Math.random() - 0.5) * 7.0 * force;

    this.branches.forEach((b) => {
      b.omegaX += (Math.random() - 0.5) * 3.5 * force;
      b.omegaZ += (Math.random() - 0.5) * 3.5 * force;
      b.omegaY += (Math.random() - 0.5) * 4.5 * force;
    });
  }

  applySpin(speed = 6.5) {
    this.omegaY += (Math.random() > 0.5 ? 1 : -1) * speed;
    this.omegaX += (Math.random() - 0.5) * 1.8;
    this.omegaZ += (Math.random() - 0.5) * 1.8;
  }

  resetPose() {
    this.thetaX = 0; this.thetaZ = 0; this.thetaY = 0;
    this.omegaX = 0; this.omegaZ = 0; this.omegaY = 0;

    this.branches.forEach((b) => {
      b.thetaX = 0; b.thetaZ = 0; b.thetaY = 0;
      b.omegaX = 0; b.omegaZ = 0; b.omegaY = 0;
    });

    this.updateMeshTransforms();
  }
}
