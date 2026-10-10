import * as THREE from 'three';
import { SPECIES } from './species.js';
import { buildBird } from './bird.js';
import { buildQuadruped } from './quad.js';

/**
 * Builds one animal as a hierarchy of named pivot nodes (Root > Body > Neck > Head ...) with meshes
 * attached, so it can be animated with node animation clips and exported as glTF without skinning.
 * The model faces +Z, stands on y = 0 and is measured in metres.
 */
export function buildAnimal(id, { colors = {}, options = {}, size = 1 } = {}) {
  const spec = SPECIES[id];
  if (!spec) throw new Error(`Unknown animal: ${id}`);
  const palette = { ...spec.colors, ...colors };
  const opt = { ...spec.options, ...options };
  const root = new THREE.Group();
  root.name = `Mocha_${spec.label}`;
  const bones = new Map();
  const mats = new Map();
  const geos = [];

  const add = (parent, geo, mat, name, pos = [0, 0, 0], rot = [0, 0, 0]) => {
    geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const bone = (name, parent, pos = [0, 0, 0], rot = [0, 0, 0]) => {
    const b = new THREE.Bone();
    b.name = name;
    b.rotation.order = 'ZYX';
    b.position.set(...pos);
    b.rotation.set(...rot);
    parent.add(b);
    bones.set(name, b);
    return b;
  };


  const disposables = [];
  const skinnedParts = [];
  const ctx = {
    spec, palette, opt, root, bone, add,
    own: (o) => disposables.push(o),
    boneIndex: (b) => [...bones.values()].indexOf(b),
    skinned: (geo, mat, name) => skinnedParts.push({ geo, mat, name }),
  };
  const rig = spec.kind === 'quad' ? buildQuadruped(ctx) : buildBird(ctx);

  // birds are stood on the ground from their finished rest pose; quadrupeds are solved analytically
  root.updateMatrixWorld(true);
  if (skinnedParts.length) {
    const skeleton = new THREE.Skeleton([...bones.values()]);
    for (const { geo, mat, name } of skinnedParts) {
      geos.push(geo);
      const m = new THREE.SkinnedMesh(geo, mat);
      m.name = name;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      root.add(m);
      m.bind(skeleton, m.matrixWorld);
    }
  }
  const bounds = new THREE.Box3().setFromObject(root);

  root.scale.setScalar(size);
  const rest = new Map();
  for (const [name, b] of bones) rest.set(name, { pos: b.position.toArray(), rot: [b.rotation.x, b.rotation.y, b.rotation.z], scale: [1, 1, 1] });

  return {
    id,
    spec,
    root,
    bones,
    rest,
    bounds,
    info: rig,
    dispose() {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      disposables.forEach((d) => d.dispose?.());
    },
  };
}
