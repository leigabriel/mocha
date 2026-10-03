import * as THREE from 'three';
import { CONFIG } from '../constants/index.js';
import { buildVoxelCharmMesh, createJumpRingMesh, createStadiumLinkMesh } from './meshBuilders.js';

export class ClusterCharmBranch {
  constructor(index, emoji = '👾', thickness = 2, chainLinks = 4) {
    this.index = index;
    this.emoji = emoji;
    this.thickness = thickness;
    this.chainLinks = chainLinks; // Configurable 4 to 10 links

    this.branchGroup = new THREE.Group();
    this.branchGroup.name = `CharmBranch_${index}_${emoji}`;

    this.hardwareGroup = new THREE.Group();
    this.hardwareGroup.name = `Hardware_${index}`;
    this.branchGroup.add(this.hardwareGroup);

    this.charmGroup = null;

    // Independent Physical Pendulum State for this specific charm
    this.thetaX = 0;
    this.thetaZ = 0;
    this.thetaY = 0;
    this.omegaX = 0;
    this.omegaZ = 0;
    this.omegaY = 0;

    // World centroid tracking for collision repulsion
    this.worldCentroid = new THREE.Vector3();
  }

  build(hwMaterial) {
    while (this.hardwareGroup.children.length > 0) {
      this.hardwareGroup.remove(this.hardwareGroup.children[0]);
    }
    if (this.charmGroup) {
      this.branchGroup.remove(this.charmGroup);
      this.charmGroup = null;
    }

    const _qTwist = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, -1, 0), Math.PI / 2);

    // 1. Top Mini Jump Ring (Passes directly over shared split ring wire)
    const topRing = createJumpRingMesh(hwMaterial);
    topRing.name = `TopRing_${this.index}`;
    topRing.position.set(0, 0, 0);
    topRing.quaternion.copy(_qTwist);
    this.hardwareGroup.add(topRing);

    // 2. Interlocking Cable Chain Links (4 to 10 links)
    let dropY = -CONFIG.jumpRingRadius * 0.95;
    for (let i = 0; i < this.chainLinks; i++) {
      const link = createStadiumLinkMesh(hwMaterial);
      link.name = `ChainLink_${this.index}_${i}`;
      link.position.set(0, dropY - (i + 0.5) * CONFIG.linkPitch, 0);
      
      // Alternate 90 degrees on every link for true mechanical interlocking
      if (i % 2 === 1) {
        link.quaternion.copy(_qTwist);
      }
      this.hardwareGroup.add(link);
    }

    dropY -= (this.chainLinks * CONFIG.linkPitch + CONFIG.jumpRingRadius * 0.2);

    // 3. Bottom Charm Jump Ring (Loops through molded lug)
    const botRing = createJumpRingMesh(hwMaterial);
    botRing.name = `BotRing_${this.index}`;
    botRing.position.set(0, dropY, 0);
    if (this.chainLinks % 2 === 0) {
      botRing.quaternion.copy(_qTwist);
    }
    this.hardwareGroup.add(botRing);

    dropY -= (CONFIG.jumpRingRadius * 1.25);

    // 4. Solid Voxel Charm Body & Lug (100% Solid & Fully Opaque)
    const charmData = buildVoxelCharmMesh(this.emoji, this.thickness);
    this.charmGroup = new THREE.Group();
    this.charmGroup.name = `ClusterCharm_${this.index}`;

    charmData.lugMesh.position.set(0, 0, 0);
    charmData.characterMesh.position.set(
      -charmData.lugOffset.x,
      -charmData.lugOffset.y,
      -charmData.lugOffset.z
    );

    this.charmGroup.add(charmData.lugMesh);
    this.charmGroup.add(charmData.characterMesh);
    this.charmGroup.position.set(0, dropY, 0);
    this.branchGroup.add(this.charmGroup);
  }
}
