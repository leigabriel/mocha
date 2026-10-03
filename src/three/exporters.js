import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { CONFIG } from '../constants/index.js';
import { downloadBlob } from '../utils/helpers.js';
import { getClusterSlots } from './clusterSlots.js';

export function bakeClusterAnimation(cluster) {
  const duration = 3.2; // Seamless 3.2s loop
  const fps = 30;
  const totalFrames = Math.round(duration * fps);
  const times = [];
  for (let f = 0; f <= totalFrames; f++) {
    times.push(f / fps);
  }

  const freq = (Math.PI * 2 * 2) / duration; // 2 complete swing cycles
  const tracks = [];

  // 1. Shared Master Split Ring Animation Track
  const masterQuats = [];
  const _eMaster = new THREE.Euler();
  const _qMaster = new THREE.Quaternion();

  for (let f = 0; f <= totalFrames; f++) {
    const t = times[f];
    const thetaX = 0.12 * Math.cos(freq * t);
    const thetaZ = 0.16 * Math.sin(freq * t);
    const thetaY = 0.15 * Math.sin(freq * 0.5 * t);

    _eMaster.set(thetaX, thetaY, thetaZ, 'YXZ');
    _qMaster.setFromEuler(_eMaster);
    masterQuats.push(_qMaster.x, _qMaster.y, _qMaster.z, _qMaster.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack('MasterSplitRing.quaternion', times, masterQuats));

  // 2. Animate Each Fanned Charm Branch in the Cluster
  const spread = CONFIG.clusterSpread;
  const CLUSTER_SLOTS = getClusterSlots();
  cluster.branches.forEach((b, bIdx) => {
    const slot = CLUSTER_SLOTS[bIdx % CLUSTER_SLOTS.length];
    const branchPositions = [];
    const branchQuats = [];

    for (let f = 0; f <= totalFrames; f++) {
      const t = times[f];
      const thetaX = 0.12 * Math.cos(freq * t);
      const thetaZ = 0.16 * Math.sin(freq * t);
      const thetaY = 0.15 * Math.sin(freq * 0.5 * t);

      _eMaster.set(thetaX, thetaY, thetaZ, 'YXZ');
      _qMaster.setFromEuler(_eMaster);

      const ringPos = slot.ringOffset.clone();
      ringPos.x *= spread;
      ringPos.applyQuaternion(_qMaster);
      branchPositions.push(ringPos.x, ringPos.y, ringPos.z);

      const localPhase = bIdx * 0.55;
      const localSwayX = 0.035 * Math.sin(freq * t + localPhase);
      const localSwayZ = 0.035 * Math.cos(freq * t + localPhase);

      const totalYaw = thetaY + slot.restYaw;
      const totalPitch = thetaX + slot.restPitch + localSwayX;
      const totalRoll = thetaZ + slot.restRoll + localSwayZ;

      const _eBranch = new THREE.Euler(totalPitch, totalYaw, totalRoll, 'YXZ');
      const _qBranch = new THREE.Quaternion().setFromEuler(_eBranch);
      branchQuats.push(_qBranch.x, _qBranch.y, _qBranch.z, _qBranch.w);
    }

    tracks.push(new THREE.VectorKeyframeTrack(`CharmBranch_${b.index}_${b.emoji}.position`, times, branchPositions));
    tracks.push(new THREE.QuaternionKeyframeTrack(`CharmBranch_${b.index}_${b.emoji}.quaternion`, times, branchQuats));
  });

  return new THREE.AnimationClip('Keychain_Cluster_Swing_Physics', duration, tracks);
}

export function prepareClusterExportRoot(cluster) {
  const exportRoot = new THREE.Group();
  exportRoot.name = "KeychainCluster_WildyRiftianStyle";

  // 1. Master Split Ring
  const splitClone = cluster.masterSplitRingMesh.clone();
  splitClone.name = "MasterSplitRing";
  splitClone.position.set(0, 0, 0);
  splitClone.quaternion.set(0, 0, 0, 1);
  exportRoot.add(splitClone);

  const spread = CONFIG.clusterSpread;
  const CLUSTER_SLOTS = getClusterSlots();

  // 2. Each Charm Branch in Rest Pose
  cluster.branches.forEach((b, bIdx) => {
    const slot = CLUSTER_SLOTS[bIdx % CLUSTER_SLOTS.length];
    const branchGroup = new THREE.Group();
    branchGroup.name = `CharmBranch_${b.index}_${b.emoji}`;

    const ringPos = slot.ringOffset.clone();
    ringPos.x *= spread;
    branchGroup.position.copy(ringPos);

    const _eRest = new THREE.Euler(slot.restPitch, slot.restYaw, slot.restRoll, 'YXZ');
    branchGroup.quaternion.setFromEuler(_eRest);

    const hwClone = b.hardwareGroup.clone(true);
    branchGroup.add(hwClone);

    if (b.charmGroup) {
      const charmClone = b.charmGroup.clone(true);
      branchGroup.add(charmClone);
    }

    exportRoot.add(branchGroup);
  });

  return exportRoot;
}

export function exportGLB(masterCluster, showToast) {
  if (!masterCluster) return;
  showToast('PACKING FULL CLUSTER .GLB (ANIMATED)...');

  const exportRoot = prepareClusterExportRoot(masterCluster);
  const animClip = bakeClusterAnimation(masterCluster);

  const exporter = new GLTFExporter();
  exporter.parse(
    exportRoot,
    (result) => {
      if (result instanceof ArrayBuffer) {
        const blob = new Blob([result], { type: 'model/gltf-binary' });
        downloadBlob(blob, `keychain_cluster_chain_animated_${Date.now()}.glb`);
        showToast('CLUSTER .GLB EXPORT COMPLETE');
      }
    },
    (err) => {
      console.error(err);
      showToast('GLB EXPORT FAILED');
    },
    {
      binary: true,
      animations: [animClip],
      embedImages: true
    }
  );
}

export function exportGLTF(masterCluster, showToast) {
  if (!masterCluster) return;
  showToast('PACKING FULL CLUSTER .GLTF (ANIMATED)...');

  const exportRoot = prepareClusterExportRoot(masterCluster);
  const animClip = bakeClusterAnimation(masterCluster);

  const exporter = new GLTFExporter();
  exporter.parse(
    exportRoot,
    (result) => {
      const output = JSON.stringify(result, null, 2);
      const blob = new Blob([output], { type: 'application/json' });
      downloadBlob(blob, `keychain_cluster_chain_animated_${Date.now()}.gltf`);
      showToast('CLUSTER .GLTF EXPORT COMPLETE');
    },
    (err) => {
      console.error(err);
      showToast('GLTF EXPORT FAILED');
    },
    {
      binary: false,
      animations: [animClip],
      embedImages: true
    }
  );
}

export function exportOBJ(masterCluster, showToast) {
  if (!masterCluster) return;
  showToast('PACKING FULL CLUSTER .OBJ (STATIC)...');

  const exportRoot = prepareClusterExportRoot(masterCluster);
  const exporter = new OBJExporter();
  const result = exporter.parse(exportRoot);
  const blob = new Blob([result], { type: 'text/plain' });
  downloadBlob(blob, `keychain_cluster_chain_static_${Date.now()}.obj`);
  showToast('CLUSTER .OBJ EXPORT COMPLETE');
}

export function captureSnapshot(renderer, scene, camera, showToast) {
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = `keychain_cluster_${Date.now()}.png`;
  link.click();
  showToast('SNAPSHOT SAVED');
}
