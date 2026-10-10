import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { getFont, textToShapes } from '../tagbuilder/fonts.js';
import { parseSvgShapes } from '../tagbuilder/svg.js';

function extrudeShapes(shapes, depth, bevel) {
  const b = Math.min(bevel, depth / 2.2);
  const g = new THREE.ExtrudeGeometry(shapes, {
    depth: Math.max(0.001, depth - 2 * b),
    bevelEnabled: b > 0.0005,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: -b,
    bevelSegments: 4,
    curveSegments: 20,
  });
  g.translate(0, 0, -Math.max(0.001, depth - 2 * b) / 2);
  return g;
}

/** Centres geometry on its bounding box and scales its longest side to `size`. */
function fitCentred(g, size) {
  g.computeBoundingBox();
  const c = g.boundingBox.getCenter(new THREE.Vector3());
  const s = g.boundingBox.getSize(new THREE.Vector3());
  g.translate(-c.x, -c.y, -c.z);
  const k = size / Math.max(s.x, s.y, 1e-6);
  g.scale(k, k, 1);
  return g;
}

function starShape(points, outer, inner) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / points;
    const r = i % 2 === 0 ? outer : inner;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -1);
  s.bezierCurveTo(-0.4, -0.7, -1, -0.3, -1, 0.3);
  s.bezierCurveTo(-1, 0.8, -0.5, 1, 0, 0.55);
  s.bezierCurveTo(0.5, 1, 1, 0.8, 1, 0.3);
  s.bezierCurveTo(1, -0.3, 0.4, -0.7, 0, -1);
  return s;
}

/** Geometry for a primitive type with its params. Returns null when there is nothing to draw (e.g. empty text). */
export function primitiveGeometry(type, p) {
  switch (type) {
    case 'box':
      return new RoundedBoxGeometry(p.w, p.h, p.d, 5, Math.max(0.001, Math.min(p.radius, p.w / 2 - 0.001, p.h / 2 - 0.001, p.d / 2 - 0.001)));
    case 'sphere':
      return new THREE.SphereGeometry(p.radius, p.seg, Math.max(8, Math.round(p.seg / 2)));
    case 'cylinder':
    case 'cone':
      return new THREE.CylinderGeometry(p.rTop, p.rBottom, p.h, p.seg);
    case 'torus':
      return new THREE.TorusGeometry(p.radius, p.tube, 24, p.seg);
    case 'plane':
      return new THREE.PlaneGeometry(p.w, p.h).rotateX(-Math.PI / 2);
    case 'capsule':
      return new THREE.CapsuleGeometry(p.radius, p.length, 10, p.seg);
    case 'icosphere':
      return new THREE.IcosahedronGeometry(p.radius, p.detail);
    case 'star':
      return extrudeShapes([starShape(p.points, p.outer, Math.min(p.inner, p.outer * 0.95))], p.depth, p.bevel);
    case 'heart':
      return fitCentred(extrudeShapes([heartShape()], p.depth, p.bevel), p.size);
    case 'ring': {
      const s = new THREE.Shape();
      s.absarc(0, 0, p.outer, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, Math.min(p.inner, p.outer - 0.01), 0, Math.PI * 2, true);
      s.holes.push(hole);
      return extrudeShapes([s], p.depth, p.bevel);
    }
    case 'text': {
      const font = getFont(p.font) ?? getFont('inter');
      if (!font || !String(p.text).trim()) return null;
      const { shapes, box } = textToShapes(font, p.text, 10);
      if (!shapes.length || box.isEmpty()) return null;
      const g = extrudeShapes(shapes, p.depth / (p.size / 10), p.bevel / (p.size / 10));
      g.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, 0);
      g.scale(p.size / 10, p.size / 10, p.size / 10);
      return g;
    }
    case 'svg': {
      const svg = p.svg ? parseSvgShapes(p.svg) : null;
      if (!svg) return null;
      const side = Math.max(svg.box.max.x - svg.box.min.x, svg.box.max.y - svg.box.min.y, 1e-6);
      const k = p.size / side;
      const g = extrudeShapes([...svg.groups.values()].flat(), p.depth / k, p.bevel / k);
      g.computeBoundingBox();
      const c = g.boundingBox.getCenter(new THREE.Vector3());
      g.translate(-c.x, -c.y, 0);
      return g.scale(k, k, k);
    }
    default:
      return null;
  }
}
