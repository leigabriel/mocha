import * as THREE from 'three';
import { makeMaterial } from './materials.js';
import { primitiveGeometry } from './primitives.js';
import { lightKind, typeOf } from './doc.js';

const DEG = Math.PI / 180;

const applyTransform = (node, o) => {
  node.position.set(...o.pos);
  node.rotation.set(o.rot[0] * DEG, o.rot[1] * DEG, o.rot[2] * DEG, 'XYZ');
  node.scale.set(...o.scale);
};

/** Node names must be unique for glTF animation tracks. */
function uniqueNames(doc) {
  const seen = new Map();
  const out = new Map();
  for (const o of doc.objects) {
    const base = o.name.replace(/[^\w .-]/g, '_') || 'Object';
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.set(o.id, n === 0 ? base : `${base}_${n}`);
  }
  return out;
}

/**
 * Builds the three.js scene for a document. `editor` adds pick proxies and helpers for
 * lights and cameras; the export build has neither. Returns { root, nodes, dispose }.
 */
export function buildStudioScene(doc, { editor = false } = {}) {
  const root = new THREE.Group();
  root.name = 'Mocha_Studio';
  const nodes = new Map();
  const geometries = [];
  const materials = [];
  const names = uniqueNames(doc);

  for (const o of doc.objects) {
    const kind = typeOf(o);
    let node;
    if (kind === 'light') {
      const lk = lightKind(o);
      const c = new THREE.Color(o.light.color);
      if (lk === 'point') node = new THREE.PointLight(c, o.light.intensity, 0, 2);
      else if (lk === 'spot') node = new THREE.SpotLight(c, o.light.intensity, 0, o.light.angle * DEG, 0.4, 2);
      else node = new THREE.DirectionalLight(c, o.light.intensity);
      node.castShadow = o.light.castShadow && doc.world.shadows;
      if (node.shadow) {
        node.shadow.mapSize.set(1024, 1024);
        node.shadow.bias = -0.0004;
        if (lk === 'sun') Object.assign(node.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 40 });
      }
      if (lk !== 'point') {
        const target = new THREE.Object3D();
        target.position.set(0, 0, -1);
        node.add(target);
        node.target = target;
      }
    } else if (kind === 'camera') {
      node = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    } else if (kind === 'group') {
      node = new THREE.Group();
    } else {
      node = new THREE.Group();
      const geo = primitiveGeometry(o.type, o.params);
      if (geo) {
        geometries.push(geo);
        const mat = makeMaterial(o.material);
        materials.push(mat);
        const make = () => {
          const m = new THREE.Mesh(geo, mat);
          m.castShadow = true;
          m.receiveShadow = true;
          m.userData.id = o.id;
          return m;
        };
        let list = [make()];
        for (const md of o.mods) {
          if (md.type === 'array') {
            list = list.flatMap((m) => Array.from({ length: md.count }, (_, i) => {
              const c = i === 0 ? m : m.clone();
              c.position.add(new THREE.Vector3(...md.offset).multiplyScalar(i));
              return c;
            }));
          } else if (md.type === 'mirror') {
            list = list.flatMap((m) => {
              const c = m.clone();
              c.position[md.axis] *= -1;
              c.scale[md.axis] *= -1;
              return [m, c];
            });
          }
        }
        list.forEach((m, i) => {
          m.name = i === 0 ? names.get(o.id) : `${names.get(o.id)}_inst${i}`;
          node.add(m);
        });
      }
    }
    node.name = names.get(o.id);
    node.userData.id = o.id;
    applyTransform(node, o);
    node.visible = o.visible;
    nodes.set(o.id, node);

    if (editor && (kind === 'light' || kind === 'camera')) {
      const proxy = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 12, 8),
        new THREE.MeshBasicMaterial({ color: kind === 'light' ? 0xffd34a : 0x9fb4ff, wireframe: true, depthTest: false, transparent: true, opacity: 0.85 })
      );
      proxy.name = '__proxy';
      proxy.userData.id = o.id;
      proxy.userData.helper = true;
      proxy.renderOrder = 10;
      geometries.push(proxy.geometry);
      materials.push(proxy.material);
      node.add(proxy);
    }
  }

  // hierarchy
  for (const o of doc.objects) {
    const node = nodes.get(o.id);
    const parent = o.parent ? nodes.get(o.parent) : null;
    (parent ?? root).add(node);
  }
  root.updateMatrixWorld(true);

  function dispose() {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  }
  return { root, nodes, dispose };
}
