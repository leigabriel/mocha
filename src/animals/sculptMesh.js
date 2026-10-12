import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { boxUV, polygonize, toGeometry } from './sdf3.js';
import { skinTo } from './loft.js';

/**
 * Turns a sculpt into a finished skinned-ready geometry: surface nets, vertex colours from a painter,
 * bone weights from the nearest bone segments, and box-projected UVs for the fur grain.
 * colorFn(position, normal, index) -> [r, g, b] in linear space.
 */
export function finishSculpt(sculpt, { voxel, skin = null, colorFn = null, uvScale = 5, power = 3, maxInfluence = 4 } = {}) {
  const mesh = polygonize(sculpt, { voxel });
  let g = toGeometry(mesh);
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  if (colorFn) {
    const col = new Float32Array(pos.count * 3);
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      n.fromBufferAttribute(nor, i);
      const c = colorFn(p, n, i);
      col[i * 3] = c[0];
      col[i * 3 + 1] = c[1];
      col[i * 3 + 2] = c[2];
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  if (skin) skinTo(g, skin, { power, maxInfluence });
  g = boxUV(g, uvScale);
  g = mergeVertices(g, 1e-5);
  g.userData.voxel = voxel;
  return g;
}
