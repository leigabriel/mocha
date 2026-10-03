import * as THREE from 'three';
import { CONFIG } from '../constants/index.js';
import { sRGBToLinear } from '../utils/helpers.js';

export function buildVoxelCharmMesh(emojiChar, thicknessMode) {
  const RES = 160;
  const cvs = document.createElement('canvas');
  cvs.width = RES;
  cvs.height = RES;
  const ctx = cvs.getContext('2d', { willReadFrequently: true });

  ctx.clearRect(0, 0, RES, RES);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.floor(RES * 0.70)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif`;
  ctx.fillText(emojiChar, RES / 2, RES / 2 + RES * 0.02);

  const raw = ctx.getImageData(0, 0, RES, RES).data;

  let minX = RES, maxX = 0, minY = RES, maxY = 0;
  let hasAlpha = false;

  for (let y = 0; y < RES; y++) {
    for (let x = 0; x < RES; x++) {
      const a = raw[(y * RES + x) * 4 + 3];
      if (a > 32) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hasAlpha = true;
      }
    }
  }

  if (!hasAlpha) {
    minX = 20; maxX = 140; minY = 20; maxY = 140;
  }

  const boundW = maxX - minX + 1;
  const boundH = maxY - minY + 1;
  const GRID_MAX = 17;
  const gridW = boundW >= boundH ? GRID_MAX : Math.max(8, Math.round((boundW / boundH) * GRID_MAX));
  const gridH = boundH > boundW ? GRID_MAX : Math.max(8, Math.round((boundH / boundW) * GRID_MAX));

  const grid = [];
  const cellW = boundW / gridW;
  const cellH = boundH / gridH;

  for (let gy = 0; gy < gridH; gy++) {
    grid[gy] = [];
    for (let gx = 0; gx < gridW; gx++) {
      const sx = Math.floor(minX + gx * cellW);
      const ex = Math.min(RES, Math.floor(minX + (gx + 1) * cellW));
      const sy = Math.floor(minY + gy * cellH);
      const ey = Math.min(RES, Math.floor(minY + (gy + 1) * cellH));

      let rS = 0, gS = 0, bS = 0, aS = 0, count = 0;
      for (let py = sy; py < ey; py++) {
        for (let px = sx; px < ex; px++) {
          const idx = (py * RES + px) * 4;
          const a = raw[idx + 3] / 255;
          if (a > 0.14) {
            rS += (raw[idx] / 255) * a;
            gS += (raw[idx + 1] / 255) * a;
            bS += (raw[idx + 2] / 255) * a;
            aS += a;
            count++;
          }
        }
      }
      const totalPix = (ex - sx) * (ey - sy);
      if (count > 0 && (aS / totalPix) > 0.16) {
        grid[gy][gx] = {
          solid: true,
          r: sRGBToLinear(rS / aS),
          g: sRGBToLinear(gS / aS),
          b: sRGBToLinear(bS / aS),
        };
      } else {
        grid[gy][gx] = { solid: false };
      }
    }
  }

  const layers = [4, 6, 8][thicknessMode - 1];
  const scale = CONFIG.scaleVoxel;
  const totalDepth = layers * scale;
  const halfD = totalDepth / 2;

  let sumX = 0, totalSolid = 0;
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      if (grid[y][x].solid) {
        sumX += x;
        totalSolid++;
      }
    }
  }
  if (totalSolid === 0) {
    grid[Math.floor(gridH / 2)][Math.floor(gridW / 2)] = { solid: true, r: 0.9, g: 0.6, b: 0.2 };
    totalSolid = 1;
  }

  const avgCol = Math.round(sumX / totalSolid);
  let topY = -1, topX = avgCol, topCol = [0.9, 0.6, 0.2];

  for (let dx of [0, -1, 1, -2, 2, -3, 3, -4, 4]) {
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
  if (topY === -1) { topY = gridH - 1; topX = Math.floor(gridW / 2); }

  const positions = [];
  const normals = [];
  const colors = [];

  function addFace(p1, p2, p3, p4, norm, col) {
    positions.push(...p1, ...p2, ...p3);
    normals.push(...norm, ...norm, ...norm);
    colors.push(...col, ...col, ...col);

    positions.push(...p1, ...p3, ...p4);
    normals.push(...norm, ...norm, ...norm);
    colors.push(...col, ...col, ...col);
  }

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const cell = grid[y][x];
      if (!cell.solid) continue;

      const col = [cell.r, cell.g, cell.b];
      const cx = (x - gridW / 2 + 0.5) * scale;
      const cy = ((gridH - 1 - y) - gridH / 2 + 0.5) * scale;
      const hs = scale / 2;

      const v000 = [cx - hs, cy - hs, -halfD];
      const v100 = [cx + hs, cy - hs, -halfD];
      const v110 = [cx + hs, cy + hs, -halfD];
      const v010 = [cx - hs, cy + hs, -halfD];

      const v001 = [cx - hs, cy - hs, halfD];
      const v101 = [cx + hs, cy - hs, halfD];
      const v111 = [cx + hs, cy + hs, halfD];
      const v011 = [cx - hs, cy + hs, halfD];

      addFace(v001, v101, v111, v011, [0, 0, 1], col);
      addFace(v100, v000, v010, v110, [0, 0, -1], col);

      if (x === gridW - 1 || !grid[y][x + 1].solid) addFace(v101, v100, v110, v111, [1, 0, 0], col);
      if (x === 0 || !grid[y][x - 1].solid)         addFace(v000, v001, v011, v010, [-1, 0, 0], col);
      if (y === 0 || !grid[y - 1][x].solid)         addFace(v011, v111, v110, v010, [0, 1, 0], col);
      if (y === gridH - 1 || !grid[y + 1][x].solid) addFace(v000, v100, v101, v001, [0, -1, 0], col);
    }
  }

  const voxelGeo = new THREE.BufferGeometry();
  voxelGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  voxelGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  voxelGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  voxelGeo.computeVertexNormals();

  const plasticMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.38,
    metalness: 0.03,
    transparent: false,
    opacity: 1.0,
    depthWrite: true,
  });

  const characterMesh = new THREE.Mesh(voxelGeo, plasticMat);
  characterMesh.name = "CharacterVoxelMesh";
  characterMesh.castShadow = false;
  characterMesh.receiveShadow = false;

  // Reinforced Integrated Mounting Tab
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

  const lugDepth = Math.min(totalDepth * 0.65, 0.080);
  const lugGeo = new THREE.ExtrudeGeometry(lugShape, {
    depth: lugDepth,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 2,
    curveSegments: 20,
  });
  lugGeo.center();

  const lugMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(topCol[0], topCol[1], topCol[2]),
    roughness: 0.38,
    metalness: 0.03,
    transparent: false,
    opacity: 1.0,
    depthWrite: true,
  });

  const lugMesh = new THREE.Mesh(lugGeo, lugMat);
  lugMesh.name = "AttachmentLugMesh";
  lugMesh.position.set(lugX, lugCenterY, 0);
  lugMesh.castShadow = false;
  lugMesh.receiveShadow = false;

  return {
    characterMesh,
    lugMesh,
    lugOffset: new THREE.Vector3(lugX, lugCenterY, 0)
  };
}

export function createSplitRingMesh(mat, radius = CONFIG.masterRingRadius, wireRadius = CONFIG.masterRingWire) {
  const coils = 2.15;
  const pitch = 0.024;
  const steps = 64;
  const points = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = t * Math.PI * 2 * coils;
    points.push(new THREE.Vector3(
      Math.cos(theta) * radius,
      Math.sin(theta) * radius,
      (t - 0.5) * pitch
    ));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const tubeGeo = new THREE.TubeGeometry(curve, 56, wireRadius, 10, false);
  const mesh = new THREE.Mesh(tubeGeo, mat);
  mesh.name = "MasterSplitRing";
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

export function createJumpRingMesh(mat, radius = CONFIG.jumpRingRadius, wireRadius = CONFIG.jumpRingWire) {
  const ringGeo = new THREE.TorusGeometry(radius, wireRadius, 8, 20);
  const mesh = new THREE.Mesh(ringGeo, mat);
  mesh.name = "JumpRing";
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

export function createStadiumLinkMesh(mat) {
  const halfStraight = (CONFIG.linkOuterL - CONFIG.linkOuterW) / 2;
  const r = (CONFIG.linkOuterW / 2) - CONFIG.linkWireR;
  const wireR = CONFIG.linkWireR;

  const arc1 = new THREE.EllipseCurve(0, halfStraight, r, r, 0, Math.PI, false, 0);
  const arc2 = new THREE.EllipseCurve(0, -halfStraight, r, r, Math.PI, 2 * Math.PI, false, 0);

  const points = [];
  const arc1Pts = arc1.getPoints(8);
  arc1Pts.forEach(p => points.push(new THREE.Vector3(p.x, p.y, 0)));
  points.push(new THREE.Vector3(-r, -halfStraight, 0));
  const arc2Pts = arc2.getPoints(8);
  arc2Pts.forEach(p => points.push(new THREE.Vector3(p.x, p.y, 0)));
  points.push(new THREE.Vector3(r, halfStraight, 0));

  const curve = new THREE.CatmullRomCurve3(points, true);
  const geo = new THREE.TubeGeometry(curve, 24, wireR, 6, true);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "StadiumCableLink";
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}
