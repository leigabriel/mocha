import * as THREE from 'three';
import { PACK } from './constants.js';
import { cachedFace, cardFace, stampFace } from './faces.js';
import { cardGeometry, stampGeometry, stampOutline, stampSize } from './geometry.js';

const DEG = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;

function hash01(str, salt) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

function faceTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.userData.mimeType = 'image/jpeg'; // faces are opaque, so exports stay small
  return tex;
}

// ------------------------------------------------------------ paper grain
let normalCanvas = null;
/** Tiling normal map of fine paper fibres (height noise run through a Sobel filter). */
function paperNormalCanvas() {
  if (normalCanvas) return normalCanvas;
  const N = 256;
  const h = new Float32Array(N * N);
  let a = 99991;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < h.length; i++) h[i] = rnd();
  // two blur passes give soft fibres rather than pure static
  const blur = (src) => {
    const out = new Float32Array(src.length);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += src[((y + dy + N) % N) * N + ((x + dx + N) % N)];
        out[y * N + x] = s / 9;
      }
    }
    return out;
  };
  const soft = blur(blur(h));
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const l = soft[y * N + ((x - 1 + N) % N)];
      const r = soft[y * N + ((x + 1) % N)];
      const u = soft[((y - 1 + N) % N) * N + x];
      const d = soft[((y + 1) % N) * N + x];
      let nx = (l - r) * 14;
      let ny = (d - u) * 14;
      const len = Math.hypot(nx, ny, 1);
      nx /= len;
      ny /= len;
      const i = (y * N + x) * 4;
      img.data[i] = Math.round((nx * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round((1 / len) * 0.5 * 255 + 127.5);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  normalCanvas = c;
  return c;
}

function paperNormalTexture() {
  const tex = new THREE.CanvasTexture(paperNormalCanvas());
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 7);
  tex.userData.mimeType = 'image/png';
  return tex;
}

// ----------------------------------------------------- contact shadows
function shadowCanvas(shapeId, pitch) {
  const S = 160;
  const size = stampSize(shapeId, 1);
  const k = (S * 0.7) / Math.max(size.w, size.h);
  const pts = stampOutline(shapeId, size.w, size.h, pitch);
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.shadowColor = 'rgba(0,0,0,1)';
  g.shadowBlur = 12;
  g.shadowOffsetX = S * 2;
  g.fillStyle = '#000';
  g.beginPath();
  pts.forEach(([x, y], i) => {
    const px = S / 2 + x * k - S * 2;
    const py = S / 2 - y * k;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  });
  g.closePath();
  g.fill();
  return { canvas: c, extent: S / k }; // extent: how many mm the texture covers
}

// ---------------------------------------------------------------- bag
/** One sheet of the bag: gentle waves plus a few long diagonal creases that catch the light. */
function bagSheet(w, h, seed, wrinkle, mat) {
  const geo = new THREE.PlaneGeometry(w, h, 84, 104);
  const p = geo.attributes.position;
  const creases = [];
  let a = Math.floor(seed * 1000) + 7;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < 6; i++) {
    const th = (20 + rnd() * 50) * DEG * (rnd() < 0.5 ? -1 : 1);
    creases.push({ x: (rnd() - 0.5) * w, y: (rnd() - 0.5) * h, c: Math.cos(th), s: Math.sin(th), amp: (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.7), sig: 1.4 + rnd() * 2.2 });
  }
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const edge = Math.min(1, (w / 2 - Math.abs(x)) / 7, (h / 2 - Math.abs(y)) / 7);
    let z = Math.sin(x * 0.16 + seed) * Math.sin(y * 0.12 + seed * 2) * 0.35 + Math.sin(x * 0.5 + y * 0.28 + seed) * 0.07;
    for (const cr of creases) {
      const d = (x - cr.x) * cr.s - (y - cr.y) * cr.c; // distance to the crease line
      z += cr.amp * Math.exp(-(d * d) / (2 * cr.sig * cr.sig)) * 0.55;
    }
    p.setZ(i, z * wrinkle * Math.max(0, edge));
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

/** A heat-seal band: a flat strip with fine horizontal ridges. */
function ribbedBand(w, h, mat) {
  const geo = new THREE.PlaneGeometry(w, h, 4, 56);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, 0.11 * Math.sin((p.getY(i) / 0.62) * Math.PI * 2));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

function bagMaterials(design) {
  const shine = design.bagShine;
  // Alpha-blended film (not transmission): transmission samples a low-res opaque pass that
  // whitewashes/blotches over a transparent canvas and is poorly supported by GLB viewers.
  const clear = new THREE.MeshPhysicalMaterial({
    color: 0xeaf6ff,
    roughness: lerp(0.2, 0.03, shine),
    metalness: 0,
    transparent: true,
    opacity: lerp(0.1, 0.16, shine),
    depthWrite: false,
    ior: 1.46,
    clearcoat: lerp(0.5, 1, shine),
    clearcoatRoughness: lerp(0.2, 0.03, shine),
    envMapIntensity: lerp(2.2, 4.2, shine),
    side: THREE.DoubleSide,
  });
  const frosted = new THREE.MeshPhysicalMaterial({
    color: 0xf2f6fa,
    roughness: 0.45,
    metalness: 0,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    clearcoat: 0.4,
    clearcoatRoughness: 0.35,
    envMapIntensity: 1.6,
    side: THREE.DoubleSide,
  });
  clear.userData.shared = true;
  frosted.userData.shared = true;
  return { clear, frosted };
}

/**
 * Builds the whole pack. Layers, back to front: back bag sheet, stamps (in array order,
 * each with a soft contact shadow), front bag sheet, ribbed seal band and seams, header
 * card. Returns { group, parts, bounds, rig, dispose }.
 * `images` maps an image id to { canvas, w, h }.
 */
export function buildPack(design, images) {
  const owned = [];
  const own = (item) => {
    owned.push(item);
    return item;
  };
  const root = new THREE.Group();
  root.name = 'Mocha_StampPack';
  const spin = new THREE.Group();
  spin.name = 'Pack_Spin';
  const content = new THREE.Group();
  content.name = 'Pack_Content';
  spin.add(content);
  root.add(spin);

  const paper = new THREE.Color(design.paper);
  const backPaper = own(new THREE.MeshPhysicalMaterial({ color: paper.clone().multiplyScalar(0.96), roughness: 0.88, metalness: 0 }));
  const edgePaper = own(new THREE.MeshPhysicalMaterial({ color: paper.clone().multiplyScalar(0.9), roughness: 0.92, metalness: 0 }));
  backPaper.userData.shared = true;
  edgePaper.userData.shared = true;
  const grain = own(paperNormalTexture());

  const n = design.stamps.length;
  const zTop = 0.4 + n * PACK.zStep + 0.5;

  const shadowTextures = new Map();
  const shadowFor = (shapeId, pitch) => {
    if (!shadowTextures.has(shapeId)) {
      const { canvas, extent } = shadowCanvas(shapeId, pitch);
      const tex = own(new THREE.CanvasTexture(canvas));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.userData.mimeType = 'image/png';
      shadowTextures.set(shapeId, { tex, extent });
    }
    return shadowTextures.get(shapeId);
  };

  const parts = new Map();
  design.stamps.forEach((stamp, i) => {
    const { geometry } = stampGeometry(stamp.shape, stamp.scale, stamp.pitch);
    own(geometry);
    const img = images.get(stamp.imageId) ?? null;
    const key = JSON.stringify([stamp.shape, stamp.scale, stamp.border, stamp.look, stamp.ink, stamp.zoom, stamp.panX, stamp.panY, stamp.caption, stamp.imageId, img?.canvas?.width, design.paper]);
    const canvas = cachedFace(key, () => stampFace(stamp, img, design.paper));
    const map = own(faceTexture(canvas));
    const face = own(
      new THREE.MeshPhysicalMaterial({
        map,
        roughness: 0.55,
        metalness: 0,
        clearcoat: 0.22,
        clearcoatRoughness: 0.42,
        normalMap: grain,
        normalScale: new THREE.Vector2(0.22, 0.22),
      })
    );
    const mesh = new THREE.Mesh(geometry, [face, backPaper, edgePaper]);
    mesh.name = `Stamp_${stamp.id}`;
    mesh.userData.tagId = stamp.id;

    const holder = new THREE.Group();
    holder.name = `StampPos_${stamp.id}`;
    holder.position.set(stamp.x, stamp.y, 0.4 + i * PACK.zStep);
    holder.rotation.set((hash01(stamp.id, 1) - 0.5) * 0.014, (hash01(stamp.id, 2) - 0.5) * 0.014, stamp.rot * DEG);
    holder.add(mesh);

    // soft contact shadow just below the paper
    const { tex, extent } = shadowFor(stamp.shape, stamp.pitch);
    const sMat = own(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false }));
    sMat.userData.shared = true;
    const sGeo = own(new THREE.PlaneGeometry(extent * stamp.scale, extent * stamp.scale));
    const shadow = new THREE.Mesh(sGeo, sMat);
    shadow.name = `Shadow_${stamp.id}`;
    shadow.position.set(0.9, -1.1, -0.04);
    holder.add(shadow);
    content.add(holder);
    parts.set(stamp.id, mesh);
  });

  if (design.bag) {
    const bagH = PACK.bagY1 - PACK.bagY0;
    const { clear, frosted } = bagMaterials(design);
    own(clear);
    own(frosted);
    const wr = design.bagWrinkle;
    const cy = (PACK.bagY0 + PACK.bagY1) / 2;
    const front = bagSheet(PACK.W, bagH, 1.3, wr, clear);
    front.name = 'Bag_Front';
    front.position.set(0, cy, zTop + 0.5 * wr);
    const back = bagSheet(PACK.W, bagH, 4.1, wr, clear);
    back.name = 'Bag_Back';
    back.position.set(0, cy, -0.5 - 0.5 * wr);
    own(front.geometry);
    own(back.geometry);
    content.add(back, front);

    // seal band under the header card, on both sheets
    const bandH = 11;
    const bandY = PACK.bagY1 - 8.5;
    const mkBand = (name, z) => {
      const band = ribbedBand(PACK.W, bandH, frosted);
      band.name = name;
      band.position.set(0, bandY, z);
      own(band.geometry);
      return band;
    };
    content.add(mkBand('Bag_Seal', zTop + 0.7 * wr + 0.05), mkBand('Bag_SealBack', -0.7 - 0.5 * wr - 0.05));
    // side and bottom seams: thicker welded edges
    const seam = (name, w, h, x, y, z) => {
      const m = new THREE.Mesh(own(new THREE.PlaneGeometry(w, h)), frosted);
      m.name = name;
      m.position.set(x, y, z);
      return m;
    };
    const zf = zTop + 0.5 * wr + 0.04;
    const zb = -0.5 - 0.5 * wr - 0.04;
    const sideY = cy - 5.5;
    const sideH = bagH - 11;
    content.add(
      seam('Seam_L', 2.6, sideH, -PACK.W / 2 + 1.3, sideY, zf),
      seam('Seam_R', 2.6, sideH, PACK.W / 2 - 1.3, sideY, zf),
      seam('Seam_Bottom', PACK.W, 3, 0, PACK.bagY0 + 1.5, zf),
      seam('Seam_L_Back', 2.6, sideH, -PACK.W / 2 + 1.3, sideY, zb),
      seam('Seam_R_Back', 2.6, sideH, PACK.W / 2 - 1.3, sideY, zb),
      seam('Seam_Bottom_Back', PACK.W, 3, 0, PACK.bagY0 + 1.5, zb)
    );
  }

  if (design.card.show) {
    const c = design.card;
    const geo = own(cardGeometry(PACK.cardW, PACK.cardH, c.hole));
    const logo = images.get(c.logoId) ?? null;
    const icon = images.get(c.iconId) ?? null;
    const key = JSON.stringify(['card', c, logo?.id, icon?.id, logo?.canvas?.width, icon?.canvas?.width]);
    const map = own(faceTexture(cachedFace(key, () => cardFace(c, logo, icon))));
    const face = own(
      new THREE.MeshPhysicalMaterial({
        map,
        roughness: 0.5,
        metalness: 0,
        clearcoat: 0.45,
        clearcoatRoughness: 0.3,
        normalMap: grain,
        normalScale: new THREE.Vector2(0.12, 0.12),
      })
    );
    const back = own(new THREE.MeshPhysicalMaterial({ color: c.paper, roughness: 0.75 }));
    back.userData.shared = true;
    const mesh = new THREE.Mesh(geo, [face, back, back]);
    mesh.name = 'Header_Card';
    mesh.userData.tagId = 'card';
    mesh.position.set(0, PACK.cardCy, zTop + 1.4 * Math.max(1, design.bagWrinkle));
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
