import * as THREE from 'three';
import { PACK } from './constants.js';
import { cachedFace, cardFace, stampFace } from './faces.js';
import { cardGeometry, stampGeometry } from './geometry.js';

const DEG = Math.PI / 180;

function faceTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.userData.mimeType = 'image/jpeg'; // faces are opaque, so exports stay small
  return tex;
}

/** One sheet of a bag: a gently wrinkled transparent plane. */
function bagSheet(w, h, seed, mat) {
  const geo = new THREE.PlaneGeometry(w, h, 36, 48);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const edge = Math.min(1, (w / 2 - Math.abs(x)) / 8, (h / 2 - Math.abs(y)) / 8);
    const z = (Math.sin(x * 0.21 + seed) * Math.sin(y * 0.17 + seed * 2) * 0.5 + Math.sin(x * 0.55 + y * 0.31 + seed) * 0.12) * Math.max(0, edge);
    p.setZ(i, z);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

/**
 * Builds the whole pack. Layers, back to front: back bag sheet, stamps (in array order),
 * front bag sheet, header card. Returns { group, parts, bounds, rig, dispose }.
 * `images` maps an image id to { canvas, w, h }.
 */
export function buildPack(design, images) {
  const owned = [];
  const own = (...items) => {
    owned.push(...items);
    return items[0];
  };
  const root = new THREE.Group();
  root.name = 'Mocha_StampPack';
  const spin = new THREE.Group();
  spin.name = 'Pack_Spin';
  const content = new THREE.Group();
  content.name = 'Pack_Content';
  spin.add(content);
  root.add(spin);

  const paperMat = own(new THREE.MeshStandardMaterial({ color: design.paper, roughness: 0.92, metalness: 0 }));
  paperMat.userData.shared = true;
  const n = design.stamps.length;
  const zTop = 0.4 + n * PACK.zStep + 0.5;

  const parts = new Map();
  design.stamps.forEach((stamp, i) => {
    const { geometry } = stampGeometry(stamp.shape, stamp.scale, stamp.pitch);
    own(geometry);
    const img = images.get(stamp.imageId) ?? null;
    const key = JSON.stringify([stamp.shape, stamp.scale, stamp.border, stamp.look, stamp.ink, stamp.zoom, stamp.panX, stamp.panY, stamp.caption, stamp.imageId, img?.canvas?.width, design.paper]);
    const canvas = cachedFace(key, () => stampFace(stamp, img, design.paper));
    const map = faceTexture(canvas);
    const face = own(new THREE.MeshStandardMaterial({ map, roughness: 0.78, metalness: 0 }));
    owned.push(map);
    const mesh = new THREE.Mesh(geometry, [face, paperMat, paperMat]);
    mesh.name = `Stamp_${stamp.id}`;
    mesh.userData.tagId = stamp.id;
    const holder = new THREE.Group();
    holder.name = `StampPos_${stamp.id}`;
    holder.position.set(stamp.x, stamp.y, 0.4 + i * PACK.zStep);
    holder.rotation.z = stamp.rot * DEG;
    holder.add(mesh);
    content.add(holder);
    parts.set(stamp.id, mesh);
  });

  if (design.bag) {
    const bagH = PACK.bagY1 - PACK.bagY0;
    const bagMat = own(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.05,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    bagMat.userData.shared = true;
    const sealMat = own(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }));
    sealMat.userData.shared = true;
    const cy = (PACK.bagY0 + PACK.bagY1) / 2;
    const front = bagSheet(PACK.W, bagH, 1.3, bagMat);
    front.name = 'Bag_Front';
    front.position.set(0, cy, zTop);
    const back = bagSheet(PACK.W, bagH, 4.1, bagMat);
    back.name = 'Bag_Back';
    back.position.set(0, cy, -0.5);
    own(front.geometry, back.geometry);
    const seal = new THREE.Mesh(new THREE.PlaneGeometry(PACK.W, 3.2), sealMat);
    seal.name = 'Bag_Seal';
    seal.position.set(0, PACK.bagY1 - 9, zTop + 0.05);
    own(seal.geometry);
    const sealBack = seal.clone();
    sealBack.name = 'Bag_SealBack';
    sealBack.position.z = -0.55;
    content.add(back, front, seal, sealBack);
  }

  if (design.card.show) {
    const c = design.card;
    const geo = own(cardGeometry(PACK.cardW, PACK.cardH, c.hole));
    const logo = images.get(c.logoId) ?? null;
    const icon = images.get(c.iconId) ?? null;
    const key = JSON.stringify(['card', c, logo?.id, icon?.id, logo?.canvas?.width, icon?.canvas?.width]);
    const map = faceTexture(cachedFace(key, () => cardFace(c, logo, icon)));
    owned.push(map);
    const face = own(new THREE.MeshStandardMaterial({ map, roughness: 0.7, metalness: 0 }));
    const back = own(new THREE.MeshStandardMaterial({ color: c.paper, roughness: 0.8 }));
    back.userData.shared = true;
    const mesh = new THREE.Mesh(geo, [face, back, back]);
    mesh.name = 'Header_Card';
    mesh.userData.tagId = 'card';
    mesh.position.set(0, PACK.cardCy, zTop + 0.9);
    content.add(mesh);
    parts.set('card', mesh);
  }

  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);

  function dispose() {
    owned.forEach((o) => o.dispose?.());
  }
  return { group: root, parts, bounds, rig: { spin }, dispose, report: { stamps: n } };
}
