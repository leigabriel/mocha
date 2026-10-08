import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { shapesBox } from './fonts.js';

/**
 * Parses an SVG logo into filled shapes grouped by fill colour. Y is flipped to point
 * up. Strokes and hidden paths are ignored, so a logo should be filled artwork.
 * Returns null when the file has no usable filled geometry.
 */
export function parseSvgShapes(svgText) {
  if (typeof svgText !== 'string' || !svgText.trim()) return null;
  let data;
  try {
    data = new SVGLoader().parse(svgText);
  } catch {
    return null;
  }
  const groups = new Map();
  for (const path of data.paths) {
    const style = path.userData?.style ?? {};
    if (style.fill === 'none' || style.visibility === 'hidden' || style.display === 'none') continue;
    const shapes = SVGLoader.createShapes(path);
    if (!shapes.length) continue;
    const hex = `#${(path.color ?? new THREE.Color(0x000000)).getHexString()}`;
    if (!groups.has(hex)) groups.set(hex, []);
    groups.get(hex).push(...shapes);
  }
  if (!groups.size) return null;

  // Flip Y (SVG is y-down) by mirroring every point, which also reverses winding.
  const flipped = new Map();
  for (const [hex, shapes] of groups) flipped.set(hex, shapes.map(flipShape));
  const all = [...flipped.values()].flat();
  const box = shapesBox(all);
  if (!Number.isFinite(box.min.x) || box.isEmpty()) return null;
  return { groups: flipped, box };
}

function flipShape(shape) {
  const flipPts = (pts) => pts.map((p) => new THREE.Vector2(p.x, -p.y)).reverse();
  const out = new THREE.Shape(flipPts(shape.getPoints(24)));
  out.holes = shape.holes.map((h) => new THREE.Path(flipPts(h.getPoints(24))));
  return out;
}
