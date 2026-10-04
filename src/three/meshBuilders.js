import * as THREE from 'three';
import { CONFIG, MM_PER_UNIT, THICKNESS_MM } from '../constants/index.js';
import { sRGBToLinear } from '../utils/helpers.js';

const RES = 160;
const GRID_MAX = 17;
const MIN_GRID = 3;
const CACHE_LIMIT = 24;

const EMOJI_FONT =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';

// key -> entry. Map iteration order doubles as LRU order.
const cache = new Map();

/** Single code points with text presentation get U+FE0F so fonts draw the colour glyph. */
function toEmojiPresentation(glyph) {
  const points = Array.from(glyph);
  if (points.length === 1 && /\p{Emoji}/u.test(glyph) && !/\p{Emoji_Presentation}/u.test(glyph)) {
    return glyph + '️';
  }
  return glyph;
}

function rasterize(emojiChar) {
  const cvs = document.createElement('canvas');
  cvs.width = RES;
  cvs.height = RES;
  const ctx = cvs.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, RES, RES);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.floor(RES * 0.7)}px ${EMOJI_FONT}`;
  ctx.fillText(toEmojiPresentation(emojiChar), RES / 2, RES / 2 + RES * 0.02);
  return ctx.getImageData(0, 0, RES, RES).data;
}

/** True when every visible pixel is near-black/grey, i.e. the font had no colour glyph. */
function looksMonochrome(raw) {
  let seen = 0;
  for (let i = 0; i < raw.length; i += 4) {
    if (raw[i + 3] < 200) continue;
    seen++;
    const r = raw[i];
    const g = raw[i + 1];
    const b = raw[i + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) > 14 || Math.max(r, g, b) > 70) return false;
  }
  return seen > 0;
}

function buildGrid(raw) {
  let minX = RES;
  let maxX = 0;
  let minY = RES;
  let maxY = 0;
  let hasAlpha = false;
  for (let y = 0; y < RES; y++) {
    for (let x = 0; x < RES; x++) {
      if (raw[(y * RES + x) * 4 + 3] > 32) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hasAlpha = true;
      }
    }
  }
  if (!hasAlpha) {
    minX = 20;
    maxX = 140;
    minY = 20;
    maxY = 140;
  }

  const boundW = maxX - minX + 1;
  const boundH = maxY - minY + 1;
  const gridW = boundW >= boundH ? GRID_MAX : Math.max(MIN_GRID, Math.round((boundW / boundH) * GRID_MAX));
  const gridH = boundH > boundW ? GRID_MAX : Math.max(MIN_GRID, Math.round((boundH / boundW) * GRID_MAX));
  const cellW = boundW / gridW;
  const cellH = boundH / gridH;

  const grid = [];
  for (let gy = 0; gy < gridH; gy++) {
    grid[gy] = [];
    for (let gx = 0; gx < gridW; gx++) {
      const sx = Math.floor(minX + gx * cellW);
      const ex = Math.min(RES, Math.max(sx + 1, Math.floor(minX + (gx + 1) * cellW)));
      const sy = Math.floor(minY + gy * cellH);
      const ey = Math.min(RES, Math.max(sy + 1, Math.floor(minY + (gy + 1) * cellH)));

      // Average in linear light, weighted by alpha.
      let rS = 0;
      let gS = 0;
      let bS = 0;
      let aS = 0;
      let count = 0;
      for (let py = sy; py < ey; py++) {
        for (let px = sx; px < ex; px++) {
          const idx = (py * RES + px) * 4;
          const a = raw[idx + 3] / 255;
          if (a > 0.14) {
            rS += sRGBToLinear(raw[idx] / 255) * a;
            gS += sRGBToLinear(raw[idx + 1] / 255) * a;
            bS += sRGBToLinear(raw[idx + 2] / 255) * a;
            aS += a;
            count++;
          }
        }
      }
      const totalPix = (ex - sx) * (ey - sy);
      grid[gy][gx] =
        count > 0 && aS / totalPix > 0.16
          ? { solid: true, r: rS / aS, g: gS / aS, b: bS / aS }
          : { solid: false };
    }
  }
  return { grid, gridW, gridH };
}

function buildEntry(emojiChar, thicknessMode) {
  const raw = rasterize(emojiChar);
  const monochrome = looksMonochrome(raw);
  const { grid, gridW, gridH } = buildGrid(raw);

  const scale = CONFIG.scaleVoxel;
  const totalDepth = (THICKNESS_MM[thicknessMode] ?? THICKNESS_MM[2]) / MM_PER_UNIT;
  const halfD = totalDepth / 2;

  let sumX = 0;
  let totalSolid = 0;
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      if (grid[y][x].solid) {
        sumX += x;
        totalSolid++;
      }
    }
  }
  if (totalSolid === 0) {
    grid[Math.floor(gridH / 2)][Math.floor(gridW / 2)] = { solid: true, r: 0.8, g: 0.35, b: 0.03 };
    totalSolid = 1;
    sumX = Math.floor(gridW / 2);
  }

  // Pick the topmost solid cell near the horizontal centre of mass for the lug.
  const avgCol = Math.round(sumX / totalSolid);
  let topY = -1;
  let topX = avgCol;
  let topCol = [0.8, 0.35, 0.03];
  for (const dx of [0, -1, 1, -2, 2, -3, 3, -4, 4]) {
    const testX = THREE.MathUtils.clamp(avgCol + dx, 0, gridW - 1);
    for (let y = 0; y < gridH; y++) {
      if (grid[y][testX].solid) {
        topY = gridH - 1 - y;
        topX = testX;
        topCol = [grid[y][testX].r, grid[y][testX].g, grid[y][testX].b];
        break;
      }
    }
    if (topY !== -1) break;
  }
  if (topY === -1) {
    topY = gridH - 1;
    topX = Math.floor(gridW / 2);
  }

  const positions = [];
  const colors = [];
  const addFace = (p1, p2, p3, p4, col) => {
    positions.push(...p1, ...p2, ...p3, ...p1, ...p3, ...p4);
    for (let i = 0; i < 6; i++) colors.push(...col);
  };

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const cell = grid[y][x];
      if (!cell.solid) continue;
      const col = [cell.r, cell.g, cell.b];
      const cx = (x - gridW / 2 + 0.5) * scale;
      const cy = (gridH - 1 - y - gridH / 2 + 0.5) * scale;
      const hs = scale / 2;

      const v000 = [cx - hs, cy - hs, -halfD];
      const v100 = [cx + hs, cy - hs, -halfD];
      const v110 = [cx + hs, cy + hs, -halfD];
      const v010 = [cx - hs, cy + hs, -halfD];
      const v001 = [cx - hs, cy - hs, halfD];
      const v101 = [cx + hs, cy - hs, halfD];
      const v111 = [cx + hs, cy + hs, halfD];
      const v011 = [cx - hs, cy + hs, halfD];

      addFace(v001, v101, v111, v011, col);
      addFace(v100, v000, v010, v110, col);
      if (x === gridW - 1 || !grid[y][x + 1].solid) addFace(v101, v100, v110, v111, col);
      if (x === 0 || !grid[y][x - 1].solid) addFace(v000, v001, v011, v010, col);
      if (y === 0 || !grid[y - 1][x].solid) addFace(v011, v111, v110, v010, col);
      if (y === gridH - 1 || !grid[y + 1][x].solid) addFace(v000, v100, v101, v001, col);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const plasticMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.03 });

  // Integrated mounting tab
  const lugX = (topX - gridW / 2 + 0.5) * scale;
  const lugBaseY = (topY - gridH / 2 + 1.0) * scale;
  const lugCenterY = lugBaseY + CONFIG.lugHoleRadius + 0.008;
  const outerR = CONFIG.lugHoleRadius + CONFIG.lugWall;

  const lugShape = new THREE.Shape();
  lugShape.moveTo(-outerR, -outerR * 0.85);
  lugShape.lineTo(outerR, -outerR * 0.85);
  lugShape.lineTo(outerR, 0);
  lugShape.absarc(0, 0, outerR, 0, Math.PI, false);
  lugShape.lineTo(-outerR, 0);
  lugShape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, CONFIG.lugHoleRadius, 0, Math.PI * 2, true);
  lugShape.holes.push(hole);

  const lugGeometry = new THREE.ExtrudeGeometry(lugShape, {
    depth: Math.min(totalDepth * 0.65, 0.08),
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 2,
    curveSegments: 20,
  });
  lugGeometry.center();

  const lugMat = new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.03 });
  lugMat.color.setRGB(topCol[0], topCol[1], topCol[2]);

  return {
    key: `${emojiChar}|${thicknessMode}`,
    refs: 0,
    geometry,
    lugGeometry,
    plasticMat,
    lugMat,
    lugOffset: new THREE.Vector3(lugX, lugCenterY, 0),
    size: new THREE.Vector3(gridW * scale, gridH * scale, totalDepth),
    monochrome,
  };
}

function disposeEntry(entry) {
  entry.geometry.dispose();
  entry.lugGeometry.dispose();
  entry.plasticMat.dispose();
  entry.lugMat.dispose();
}

function evict() {
  if (cache.size <= CACHE_LIMIT) return;
  for (const [key, entry] of cache) {
    if (cache.size <= CACHE_LIMIT) break;
    if (entry.refs === 0) {
      disposeEntry(entry);
      cache.delete(key);
    }
  }
}

/**
 * Returns fresh meshes for the charm sharing cached geometry. Call `release()` when
 * the meshes are discarded so unused geometry can be freed.
 */
export function acquireCharm(emojiChar, thicknessMode) {
  const key = `${emojiChar}|${thicknessMode}`;
  let entry = cache.get(key);
  if (entry) {
    cache.delete(key);
    cache.set(key, entry); // refresh LRU position
  } else {
    entry = buildEntry(emojiChar, thicknessMode);
    cache.set(key, entry);
  }
  entry.refs++;
  evict();

  const characterMesh = new THREE.Mesh(entry.geometry, entry.plasticMat);
  characterMesh.name = 'CharacterVoxelMesh';
  const lugMesh = new THREE.Mesh(entry.lugGeometry, entry.lugMat);
  lugMesh.name = 'AttachmentLugMesh';
  lugMesh.position.copy(entry.lugOffset);

  let released = false;
  return {
    characterMesh,
    lugMesh,
    lugOffset: entry.lugOffset.clone(),
    size: entry.size.clone(),
    monochrome: entry.monochrome,
    release() {
      if (released) return;
      released = true;
      entry.refs--;
      evict();
    },
  };
}
