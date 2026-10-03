import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { CONFIG } from '../constants/index.js';
import { downloadBlob } from '../utils/helpers.js';
import { getClusterSlots } from './clusterSlots.js';

/**
 * Bakes a coordinated natural pendulum swinging loop.
 * Loop duration: 3.2s (2 complete swing cycles for seamless periodic continuity).
 */
export function bakeSwingAnimation(cluster) {
  const duration = 3.2;
  const fps = 30;
  const totalFrames = Math.round(duration * fps);
  const times = [];
  for (let f = 0; f <= totalFrames; f++) {
    times.push(f / fps);
  }

  const freq = (Math.PI * 2 * 2) / duration;
  const yawFreq = (Math.PI * 2 * 1) / duration;
  const tracks = [];

  // 1. Master Split Ring Motion
  const masterQuats = [];
  const _eMaster = new THREE.Euler();
  const _qMaster = new THREE.Quaternion();

  for (let f = 0; f <= totalFrames; f++) {
    const t = times[f];
    const thetaX = 0.09 * Math.cos(freq * t);
    const thetaZ = 0.13 * Math.sin(freq * t);
    const thetaY = 0.08 * Math.sin(yawFreq * t);

    _eMaster.set(thetaX, thetaY, thetaZ, 'YXZ');
    _qMaster.setFromEuler(_eMaster);
    masterQuats.push(_qMaster.x, _qMaster.y, _qMaster.z, _qMaster.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack('MasterSplitRing.quaternion', times, masterQuats));

  // 2. Animate Each Fanned Charm Branch
  const spread = CONFIG.clusterSpread;
  const CLUSTER_SLOTS = getClusterSlots();

  cluster.branches.forEach((b, bIdx) => {
    const slot = CLUSTER_SLOTS[bIdx % CLUSTER_SLOTS.length];
    const branchPositions = [];
    const branchQuats = [];
    const nodeName = `CharmBranch_${b.index}`;

    for (let f = 0; f <= totalFrames; f++) {
      const t = times[f];
      const thetaX = 0.09 * Math.cos(freq * t);
      const thetaZ = 0.13 * Math.sin(freq * t);
      const thetaY = 0.08 * Math.sin(yawFreq * t);

      _eMaster.set(thetaX, thetaY, thetaZ, 'YXZ');
      _qMaster.setFromEuler(_eMaster);

      const ringPos = slot.ringOffset.clone();
      ringPos.x *= spread;
      ringPos.applyQuaternion(_qMaster);
      branchPositions.push(ringPos.x, ringPos.y, ringPos.z);

      const phaseLag = 0.35 + bIdx * 0.40;
      const secondarySwayX = 0.045 * Math.sin(freq * t - phaseLag);
      const secondarySwayZ = 0.045 * Math.cos(freq * t - phaseLag);

      const totalYaw = thetaY + slot.restYaw;
      const totalPitch = (thetaX * 0.75) + slot.restPitch + secondarySwayX;
      const totalRoll = (thetaZ * 0.75) + slot.restRoll + secondarySwayZ;

      const _eBranch = new THREE.Euler(totalPitch, totalYaw, totalRoll, 'YXZ');
      const _qBranch = new THREE.Quaternion().setFromEuler(_eBranch);
      branchQuats.push(_qBranch.x, _qBranch.y, _qBranch.z, _qBranch.w);
    }

    tracks.push(new THREE.VectorKeyframeTrack(`${nodeName}.position`, times, branchPositions));
    tracks.push(new THREE.QuaternionKeyframeTrack(`${nodeName}.quaternion`, times, branchQuats));
  });

  return new THREE.AnimationClip('Mocha_Swing_Physics', duration, tracks);
}

/**
 * Bakes a continuous 360° showcase turntable rotation loop.
 * Loop duration: 3.6s (complete 360° spin with subtle centrifugal charm fanning).
 */
export function bakeSpinAnimation(cluster) {
  const duration = 3.6;
  const fps = 30;
  const totalFrames = Math.round(duration * fps);
  const times = [];
  for (let f = 0; f <= totalFrames; f++) {
    times.push(f / fps);
  }

  const tracks = [];
  const masterQuats = [];
  const _eMaster = new THREE.Euler();
  const _qMaster = new THREE.Quaternion();

  for (let f = 0; f <= totalFrames; f++) {
    const t = times[f];
    const phi = (t / duration) * Math.PI * 2; // Complete 0 to 2pi rotation
    const wobbleX = 0.035 * Math.sin(phi * 2);
    const wobbleZ = 0.035 * Math.cos(phi * 2);

    _eMaster.set(wobbleX, phi, wobbleZ, 'YXZ');
    _qMaster.setFromEuler(_eMaster);
    masterQuats.push(_qMaster.x, _qMaster.y, _qMaster.z, _qMaster.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack('MasterSplitRing.quaternion', times, masterQuats));

  const spread = CONFIG.clusterSpread;
  const CLUSTER_SLOTS = getClusterSlots();

  cluster.branches.forEach((b, bIdx) => {
    const slot = CLUSTER_SLOTS[bIdx % CLUSTER_SLOTS.length];
    const branchPositions = [];
    const branchQuats = [];
    const nodeName = `CharmBranch_${b.index}`;

    for (let f = 0; f <= totalFrames; f++) {
      const t = times[f];
      const phi = (t / duration) * Math.PI * 2;
      const wobbleX = 0.035 * Math.sin(phi * 2);
      const wobbleZ = 0.035 * Math.cos(phi * 2);

      _eMaster.set(wobbleX, phi, wobbleZ, 'YXZ');
      _qMaster.setFromEuler(_eMaster);

      const ringPos = slot.ringOffset.clone();
      ringPos.x *= spread;
      ringPos.applyQuaternion(_qMaster);
      branchPositions.push(ringPos.x, ringPos.y, ringPos.z);

      // Centrifugal inertia gently pushes charms outward during 360° rotation
      const totalYaw = phi + slot.restYaw;
      const centrifugalFlare = 0.055;
      const totalPitch = (wobbleX * 0.5) + slot.restPitch;
      const totalRoll = (wobbleZ * 0.5) + slot.restRoll + centrifugalFlare;

      const _eBranch = new THREE.Euler(totalPitch, totalYaw, totalRoll, 'YXZ');
      const _qBranch = new THREE.Quaternion().setFromEuler(_eBranch);
      branchQuats.push(_qBranch.x, _qBranch.y, _qBranch.z, _qBranch.w);
    }

    tracks.push(new THREE.VectorKeyframeTrack(`${nodeName}.position`, times, branchPositions));
    tracks.push(new THREE.QuaternionKeyframeTrack(`${nodeName}.quaternion`, times, branchQuats));
  });

  return new THREE.AnimationClip('Mocha_Spin_360', duration, tracks);
}

/**
 * Prepares the export hierarchy.
 * When useLivePose is true, captures the exact interactive 3D pose from the active viewport.
 */
export function prepareClusterExportRoot(cluster, useLivePose = false) {
  const exportRoot = new THREE.Group();
  exportRoot.name = "Mocha_KeychainCluster";

  // 1. Master Split Ring
  const splitClone = cluster.masterSplitRingMesh.clone();
  splitClone.name = "MasterSplitRing";
  if (useLivePose) {
    splitClone.position.copy(cluster.masterSplitRingMesh.position);
    splitClone.quaternion.copy(cluster.masterSplitRingMesh.quaternion);
  } else {
    splitClone.position.set(0, 0, 0);
    splitClone.quaternion.set(0, 0, 0, 1);
  }
  exportRoot.add(splitClone);

  const spread = CONFIG.clusterSpread;
  const CLUSTER_SLOTS = getClusterSlots();

  // 2. Charm Branches with clean, standards-compliant ASCII node names
  cluster.branches.forEach((b, bIdx) => {
    const slot = CLUSTER_SLOTS[bIdx % CLUSTER_SLOTS.length];
    const branchGroup = new THREE.Group();
    branchGroup.name = `CharmBranch_${b.index}`;

    if (useLivePose) {
      branchGroup.position.copy(b.branchGroup.position);
      branchGroup.quaternion.copy(b.branchGroup.quaternion);
    } else {
      const ringPos = slot.ringOffset.clone();
      ringPos.x *= spread;
      branchGroup.position.copy(ringPos);

      const _eRest = new THREE.Euler(slot.restPitch, slot.restYaw, slot.restRoll, 'YXZ');
      branchGroup.quaternion.setFromEuler(_eRest);
    }

    const hwClone = b.hardwareGroup.clone(true);
    branchGroup.add(hwClone);

    if (b.charmGroup) {
      const charmClone = b.charmGroup.clone(true);
      branchGroup.add(charmClone);
    }

    exportRoot.add(branchGroup);
  });

  // Ensure all scene graph matrices and bounding boxes are computed before exporting
  exportRoot.updateMatrixWorld(true);
  return exportRoot;
}

/**
 * Resolves the animation clip(s) to embed based on user selection:
 * 'swing' | 'spin' | 'both'
 */
function getSelectedClips(masterCluster, animType) {
  if (animType === 'spin') {
    return [bakeSpinAnimation(masterCluster)];
  } else if (animType === 'both') {
    return [bakeSwingAnimation(masterCluster), bakeSpinAnimation(masterCluster)];
  }
  return [bakeSwingAnimation(masterCluster)];
}

export function exportGLB(masterCluster, showToast, animType = 'swing') {
  if (!masterCluster) return;
  const animLabel = animType === 'spin' ? 'SPIN 360°' : animType === 'both' ? 'SWING + SPIN' : 'SWING';
  showToast(`PACKING .GLB (${animLabel} ANIMATED)...`);

  const exportRoot = prepareClusterExportRoot(masterCluster, false);
  const animClips = getSelectedClips(masterCluster, animType);

  const exporter = new GLTFExporter();
  exporter.parse(
    exportRoot,
    (result) => {
      if (result instanceof ArrayBuffer) {
        const blob = new Blob([result], { type: 'model/gltf-binary' });
        downloadBlob(blob, `mocha_keychain_${animType}_${Date.now()}.glb`);
        showToast(`EXPORTED .GLB (${animLabel} ANIMATED)`);
      }
    },
    (err) => {
      console.error(err);
      showToast('GLB EXPORT FAILED');
    },
    {
      binary: true,
      animations: animClips,
      embedImages: true
    }
  );
}

export function exportGLTF(masterCluster, showToast, animType = 'swing') {
  if (!masterCluster) return;
  const animLabel = animType === 'spin' ? 'SPIN 360°' : animType === 'both' ? 'SWING + SPIN' : 'SWING';
  showToast(`PACKING .GLTF (${animLabel} ANIMATED)...`);

  const exportRoot = prepareClusterExportRoot(masterCluster, false);
  const animClips = getSelectedClips(masterCluster, animType);

  const exporter = new GLTFExporter();
  exporter.parse(
    exportRoot,
    (result) => {
      const output = JSON.stringify(result, null, 2);
      const blob = new Blob([output], { type: 'application/json' });
      downloadBlob(blob, `mocha_keychain_${animType}_${Date.now()}.gltf`);
      showToast(`EXPORTED .GLTF (${animLabel} ANIMATED)`);
    },
    (err) => {
      console.error(err);
      showToast('GLTF EXPORT FAILED');
    },
    {
      binary: false,
      animations: animClips,
      embedImages: true
    }
  );
}

export function exportOBJ(masterCluster, showToast) {
  if (!masterCluster) return;
  showToast('PACKING .OBJ (CURRENT 3D POSE)...');

  // Captures current live interactive 3D pose (WYSIWYG)
  const exportRoot = prepareClusterExportRoot(masterCluster, true);
  const exporter = new OBJExporter();
  const result = exporter.parse(exportRoot);
  const blob = new Blob([result], { type: 'text/plain' });
  downloadBlob(blob, `mocha_keychain_static_${Date.now()}.obj`);
  showToast('SAVED .OBJ (STATIC 3D GEOMETRY)');
}

export function captureSnapshot(renderer, scene, camera, showToast) {
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = `mocha_snapshot_${Date.now()}.png`;
  link.click();
  showToast('SNAPSHOT SAVED');
}
