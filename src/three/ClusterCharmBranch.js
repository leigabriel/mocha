import * as THREE from 'three';
import { CONFIG } from '../constants/index.js';
import { acquireCharm } from './meshBuilders.js';
import { createJumpRingMesh, createStadiumLinkMesh, markHardware } from './hardware.js';
import { createBranchState } from './physics.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);

const selectedLineMat = new THREE.LineBasicMaterial({ color: 0x0034ff });
const hoverLineMat = new THREE.LineBasicMaterial({ color: 0xff9f1c });
const pickMat = new THREE.MeshBasicMaterial({ visible: false });

/**
 * Rotation about the chain axis for element `i` (0 = top ring, 1..n = links,
 * n + 1 = bottom ring). The twist is spread evenly so neighbours always interlock
 * at (close to) 90 degrees and the bottom ring ends up in the YZ plane, the plane
 * that threads through the charm lug's hole, for every link count.
 */
export function chainElementAngle(elementIndex, linkCount) {
  const steps = linkCount + 1;
  const k = Math.round(steps / 2);
  const step = (Math.PI * k) / steps;
  return Math.PI / 2 + step * elementIndex;
}

export class ClusterCharmBranch {
  constructor(index, emoji = '👾', thickness = 2, chainLinks = 4) {
    this.index = index;
    this.emoji = emoji;
    this.thickness = thickness;
    this.chainLinks = chainLinks;

    this.branchGroup = new THREE.Group();
    this.hardwareGroup = new THREE.Group();
    this.hardwareGroup.name = `Hardware_${index}`;
    this.branchGroup.add(this.hardwareGroup);

    this.charmPivot = new THREE.Group();
    this.charmGroup = null;
    this.outline = null;
    this.charmData = null;
    this.pickMeshes = [];

    this.sim = createBranchState();
    this.lengths = { pivot: 0.5, charm: 0.25 };
    this.worldCentroid = new THREE.Vector3();
    this.restCentroid = new THREE.Vector3();
    this.monochrome = false;

    this.rename(index);
  }

  rename(index) {
    this.index = index;
    this.branchGroup.name = `CharmBranch_${index}`;
    this.hardwareGroup.name = `Hardware_${index}`;
    this.charmPivot.name = `CharmPivot_${index}`;
    if (this.charmGroup) this.charmGroup.name = `ClusterCharm_${index}`;
  }

  clear() {
    for (const child of [...this.hardwareGroup.children]) this.hardwareGroup.remove(child);
    for (const pick of this.pickMeshes) {
      pick.parent?.remove(pick);
      pick.geometry.dispose();
    }
    this.pickMeshes = [];
    if (this.outline) {
      this.outline.parent?.remove(this.outline);
      this.outline.geometry.dispose();
      this.outline = null;
    }
    if (this.charmGroup) {
      this.charmPivot.remove(this.charmGroup);
      this.charmGroup = null;
    }
    this.branchGroup.remove(this.charmPivot);
    if (this.charmData) {
      this.charmData.release();
      this.charmData = null;
    }
  }

  build(hwMaterial) {
    const highlight = this.outline?.visible ? this.outline.material : null;
    this.clear();
    const n = this.chainLinks;
    const Rj = CONFIG.jumpRingRadius;

    // 1. Top jump ring (hangs on the master ring wire)
    const topRing = markHardware(createJumpRingMesh(hwMaterial));
    topRing.name = `TopRing_${this.index}`;
    topRing.quaternion.setFromAxisAngle(Y_AXIS, chainElementAngle(0, n));
    this.hardwareGroup.add(topRing);

    // 2. Interlocking chain links
    const topY = -Rj * 0.95;
    for (let i = 0; i < n; i++) {
      const link = markHardware(createStadiumLinkMesh(hwMaterial));
      link.name = `ChainLink_${this.index}_${i}`;
      link.position.set(0, topY - (i + 0.5) * CONFIG.linkPitch, 0);
      link.quaternion.setFromAxisAngle(Y_AXIS, chainElementAngle(i + 1, n));
      this.hardwareGroup.add(link);
    }

    // 3. Bottom jump ring (threads through the lug hole)
    const botY = topY - n * CONFIG.linkPitch - Rj * 0.2;
    const botRing = markHardware(createJumpRingMesh(hwMaterial));
    botRing.name = `BotRing_${this.index}`;
    botRing.position.set(0, botY, 0);
    botRing.quaternion.setFromAxisAngle(Y_AXIS, chainElementAngle(n + 1, n));
    this.hardwareGroup.add(botRing);

    // 4. Charm: pivots about the bottom ring, lug hole 1.25 ring radii below it
    const charm = acquireCharm(this.emoji, this.thickness);
    this.charmData = charm;
    this.monochrome = charm.monochrome;

    this.charmPivot.position.set(0, botY, 0);
    this.charmGroup = new THREE.Group();
    this.charmGroup.name = `ClusterCharm_${this.index}`;
    this.charmGroup.position.set(0, -Rj * 1.25, 0);
    charm.characterMesh.position.set(-charm.lugOffset.x, -charm.lugOffset.y, -charm.lugOffset.z);
    charm.lugMesh.position.set(0, 0, 0);
    this.charmGroup.add(charm.lugMesh, charm.characterMesh);
    this.charmPivot.add(this.charmGroup);
    this.branchGroup.add(this.charmPivot);

    // Selection / hover outline and generous pick volumes (not exported)
    const pad = 0.012;
    const box = new THREE.BoxGeometry(charm.size.x + pad, charm.size.y + pad, charm.size.z + pad);
    this.outline = new THREE.LineSegments(new THREE.EdgesGeometry(box), selectedLineMat);
    this.outline.name = `Outline_${this.index}`;
    this.outline.position.set(this.charmGroup.position.x - charm.lugOffset.x, this.charmGroup.position.y - charm.lugOffset.y, 0);
    this.outline.visible = false;
    this.charmPivot.add(this.outline);

    const charmPick = new THREE.Mesh(box, pickMat);
    charmPick.position.copy(this.outline.position);
    this.addPick(charmPick, this.charmPivot);

    const chainLength = -botY + Rj;
    const chainPick = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, chainLength, 8), pickMat);
    chainPick.position.set(0, -chainLength / 2 + Rj, 0);
    this.addPick(chainPick, this.branchGroup);

    if (highlight) {
      this.outline.material = highlight;
      this.outline.visible = true;
    }

    // Pendulum lengths follow the real chain and charm size, so longer chains swing slower.
    const charmArm = Rj * 1.25 + charm.lugOffset.y;
    this.lengths = { pivot: -botY + charmArm * 0.5, charm: Math.max(0.1, charmArm * 0.6) };
    return charm;
  }

  addPick(mesh, parent) {
    mesh.userData.pick = true;
    mesh.userData.branch = this;
    mesh.name = `Pick_${this.index}`;
    parent.add(mesh);
    this.pickMeshes.push(mesh);
  }

  /** mode: 'none' | 'hover' | 'selected' */
  setHighlight(mode) {
    if (!this.outline) return;
    this.outline.visible = mode !== 'none';
    this.outline.material = mode === 'hover' ? hoverLineMat : selectedLineMat;
  }

  dispose() {
    this.clear();
    this.branchGroup.parent?.remove(this.branchGroup);
  }
}
