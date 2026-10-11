// Prebuilt models for the 3D Studio. Each one is a small group of ordinary scene objects, so every part
// stays editable (move it, recolour it, change its shape). Everything stands on y = 0 and is about 1 m tall.

const mat = (preset, color, extra = {}) => ({ preset, color, roughness: 0.55, metalness: 0, opacity: 1, emissive: '#000000', emissiveIntensity: 1, ...extra });
const clay = (c) => mat('clay', c, { roughness: 0.85 });
const gloss = (c) => mat('plastic', c, { roughness: 0.25 });
const soft = (c) => mat('softtouch', c);

/** part(type, name, pos, params, material, extra) → a scene object whose parent is the model's group. */
const part = (type, name, pos, params, material, extra = {}) => ({ type, name, pos, params, material, ...extra });

const tree = (trunk, leaf, shades) => [
  part('cylinder', 'Trunk', [0, 0.2, 0], { rTop: 0.07, rBottom: 0.1, h: 0.4, seg: 6 }, clay(trunk)),
  part('cone', 'Foliage low', [0, 0.62, 0], { rTop: 0, rBottom: 0.46, h: 0.62, seg: 6 }, clay(shades[0] ?? leaf)),
  part('cone', 'Foliage mid', [0, 0.98, 0], { rTop: 0, rBottom: 0.36, h: 0.55, seg: 6 }, clay(shades[1] ?? leaf)),
  part('cone', 'Foliage top', [0, 1.3, 0], { rTop: 0, rBottom: 0.24, h: 0.5, seg: 6 }, clay(shades[2] ?? leaf)),
];

export const LIBRARY_GROUPS = [
  { id: 'nature', label: 'Nature' },
  { id: 'animals', label: 'Animals' },
  { id: 'props', label: 'Props' },
  { id: 'keychains', label: 'Keychains' },
  { id: 'stickers', label: 'Stickers' },
];

export const LIBRARY = [
  // ------------------------------------------------------------------ nature
  {
    id: 'pine', group: 'nature', label: 'Low-poly pine', color: '#2f9e5b', icon: 'cone',
    build: () => tree('#7a4a2a', '#2f9e5b', ['#1f7d49', '#2f9e5b', '#46b872']),
  },
  {
    id: 'round-tree', group: 'nature', label: 'Low-poly tree', color: '#58b947', icon: 'sphere',
    build: () => [
      part('cylinder', 'Trunk', [0, 0.3, 0], { rTop: 0.07, rBottom: 0.11, h: 0.6, seg: 6 }, clay('#7a4a2a')),
      part('icosphere', 'Crown', [0, 0.95, 0], { radius: 0.5, detail: 1 }, clay('#58b947')),
      part('icosphere', 'Crown side', [0.3, 0.8, 0.12], { radius: 0.3, detail: 1 }, clay('#6fcb58')),
      part('icosphere', 'Crown back', [-0.28, 0.85, -0.1], { radius: 0.3, detail: 1 }, clay('#48a63a')),
    ],
  },
  {
    id: 'rock', group: 'nature', label: 'Rock', color: '#9aa0aa', icon: 'icosphere',
    build: () => [
      part('icosphere', 'Rock', [0, 0.22, 0], { radius: 0.4, detail: 0 }, clay('#9aa0aa'), { scale: [1.2, 0.75, 1] }),
      part('icosphere', 'Rock small', [0.5, 0.1, 0.15], { radius: 0.18, detail: 0 }, clay('#868c96'), { scale: [1.1, 0.8, 1] }),
    ],
  },
  {
    id: 'cloud', group: 'nature', label: 'Cloud', color: '#ffffff', icon: 'sphere',
    build: () => [
      part('sphere', 'Puff', [0, 0.9, 0], { radius: 0.3, seg: 32 }, soft('#ffffff')),
      part('sphere', 'Puff L', [-0.32, 0.8, 0], { radius: 0.22, seg: 32 }, soft('#ffffff')),
      part('sphere', 'Puff R', [0.34, 0.8, 0], { radius: 0.24, seg: 32 }, soft('#ffffff')),
      part('capsule', 'Base', [0, 0.72, 0], { radius: 0.17, length: 0.7, seg: 24 }, soft('#ffffff'), { rot: [0, 0, 90] }),
    ],
  },
  {
    id: 'mushroom', group: 'nature', label: 'Mushroom', color: '#e0432f', icon: 'sphere',
    build: () => [
      part('cylinder', 'Stem', [0, 0.22, 0], { rTop: 0.12, rBottom: 0.16, h: 0.44, seg: 24 }, soft('#f3ead8')),
      part('sphere', 'Cap', [0, 0.46, 0], { radius: 0.4, seg: 32 }, gloss('#e0432f'), { scale: [1, 0.62, 1] }),
      part('sphere', 'Dot A', [0.16, 0.7, 0.14], { radius: 0.06, seg: 16 }, soft('#ffffff')),
      part('sphere', 'Dot B', [-0.2, 0.64, 0.12], { radius: 0.05, seg: 16 }, soft('#ffffff')),
      part('sphere', 'Dot C', [0.02, 0.72, -0.2], { radius: 0.055, seg: 16 }, soft('#ffffff')),
    ],
  },
  {
    id: 'flower', group: 'nature', label: 'Flower', color: '#ff6aa8', icon: 'heart',
    build: () => {
      const petals = Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return part('sphere', `Petal ${i + 1}`, [Math.cos(a) * 0.17, 0.95, Math.sin(a) * 0.17], { radius: 0.12, seg: 20 }, soft('#ff6aa8'), { scale: [1, 0.5, 1] });
      });
      return [
        part('cylinder', 'Stem', [0, 0.45, 0], { rTop: 0.02, rBottom: 0.025, h: 0.9, seg: 12 }, clay('#3fa34d')),
        part('sphere', 'Leaf', [0.1, 0.3, 0], { radius: 0.1, seg: 16 }, clay('#3fa34d'), { scale: [1.8, 0.35, 0.9], rot: [0, 0, 25] }),
        ...petals,
        part('sphere', 'Centre', [0, 0.97, 0], { radius: 0.1, seg: 20 }, gloss('#ffd23f')),
      ];
    },
  },
  {
    id: 'cactus', group: 'nature', label: 'Cactus', color: '#3fa34d', icon: 'capsule',
    build: () => [
      part('cylinder', 'Pot', [0, 0.14, 0], { rTop: 0.26, rBottom: 0.2, h: 0.28, seg: 24 }, clay('#d9825b')),
      part('capsule', 'Body', [0, 0.65, 0], { radius: 0.17, length: 0.5, seg: 24 }, soft('#3fa34d')),
      part('capsule', 'Arm', [0.26, 0.62, 0], { radius: 0.07, length: 0.22, seg: 16 }, soft('#3fa34d')),
      part('capsule', 'Arm up', [0.26, 0.82, 0], { radius: 0.07, length: 0.2, seg: 16 }, soft('#3fa34d')),
    ],
  },

  // ----------------------------------------------------------------- animals
  {
    id: 'fox', group: 'animals', label: 'Low-poly fox', color: '#f08a3c', icon: 'cone',
    build: () => [
      part('box', 'Body', [0, 0.42, 0], { w: 0.34, h: 0.3, d: 0.7, radius: 0.05 }, clay('#f08a3c')),
      part('box', 'Chest', [0, 0.38, 0.28], { w: 0.28, h: 0.24, d: 0.2, radius: 0.04 }, clay('#fff3e3')),
      part('box', 'Head', [0, 0.7, 0.42], { w: 0.3, h: 0.26, d: 0.26, radius: 0.05 }, clay('#f08a3c')),
      part('cone', 'Snout', [0, 0.66, 0.6], { rTop: 0, rBottom: 0.1, h: 0.2, seg: 4 }, clay('#fff3e3'), { rot: [90, 45, 0] }),
      part('sphere', 'Nose', [0, 0.66, 0.7], { radius: 0.03, seg: 12 }, gloss('#1d1d22')),
      part('cone', 'Ear L', [-0.1, 0.9, 0.4], { rTop: 0, rBottom: 0.07, h: 0.18, seg: 4 }, clay('#f08a3c')),
      part('cone', 'Ear R', [0.1, 0.9, 0.4], { rTop: 0, rBottom: 0.07, h: 0.18, seg: 4 }, clay('#f08a3c')),
      part('sphere', 'Eye L', [-0.08, 0.74, 0.55], { radius: 0.025, seg: 12 }, gloss('#1d1d22')),
      part('sphere', 'Eye R', [0.08, 0.74, 0.55], { radius: 0.025, seg: 12 }, gloss('#1d1d22')),
      ...[[-0.1, 0.3], [0.1, 0.3], [-0.1, -0.3], [0.1, -0.3]].map(([x, z], i) => part('box', `Leg ${i + 1}`, [x, 0.14, z], { w: 0.09, h: 0.28, d: 0.09, radius: 0.02 }, clay('#3a2a24'))),
      part('capsule', 'Tail', [0, 0.5, -0.55], { radius: 0.09, length: 0.3, seg: 16 }, clay('#f08a3c'), { rot: [-65, 0, 0] }),
      part('sphere', 'Tail tip', [0, 0.6, -0.74], { radius: 0.09, seg: 16 }, clay('#fff3e3')),
    ],
  },
  {
    id: 'cat', group: 'animals', label: 'Cat', color: '#8d8f98', icon: 'cone',
    build: () => [
      part('capsule', 'Body', [0, 0.32, 0], { radius: 0.18, length: 0.34, seg: 24 }, soft('#8d8f98'), { rot: [90, 0, 0] }),
      part('sphere', 'Head', [0, 0.62, 0.32], { radius: 0.2, seg: 32 }, soft('#8d8f98')),
      part('cone', 'Ear L', [-0.12, 0.82, 0.32], { rTop: 0, rBottom: 0.07, h: 0.13, seg: 4 }, soft('#8d8f98'), { rot: [0, 45, 10] }),
      part('cone', 'Ear R', [0.12, 0.82, 0.32], { rTop: 0, rBottom: 0.07, h: 0.13, seg: 4 }, soft('#8d8f98'), { rot: [0, 45, -10] }),
      part('sphere', 'Eye L', [-0.075, 0.65, 0.5], { radius: 0.03, seg: 16 }, gloss('#7ed957')),
      part('sphere', 'Eye R', [0.075, 0.65, 0.5], { radius: 0.03, seg: 16 }, gloss('#7ed957')),
      part('sphere', 'Nose', [0, 0.6, 0.52], { radius: 0.018, seg: 12 }, gloss('#ff9db6')),
      ...[[-0.1, 0.2], [0.1, 0.2], [-0.1, -0.2], [0.1, -0.2]].map(([x, z], i) => part('capsule', `Leg ${i + 1}`, [x, 0.1, z], { radius: 0.05, length: 0.1, seg: 12 }, soft('#7c7e87'))),
      part('capsule', 'Tail', [0, 0.45, -0.38], { radius: 0.04, length: 0.4, seg: 12 }, soft('#8d8f98'), { rot: [-35, 0, 0] }),
    ],
  },
  {
    id: 'bird', group: 'animals', label: 'Little bird', color: '#3d8bff', icon: 'sphere',
    build: () => [
      part('sphere', 'Body', [0, 0.38, 0], { radius: 0.32, seg: 32 }, soft('#3d8bff'), { scale: [1, 0.95, 1.1] }),
      part('sphere', 'Belly', [0, 0.32, 0.12], { radius: 0.24, seg: 32 }, soft('#f4f7ff'), { scale: [0.95, 0.9, 0.9] }),
      part('cone', 'Beak', [0, 0.45, 0.4], { rTop: 0, rBottom: 0.06, h: 0.16, seg: 4 }, gloss('#ffb627'), { rot: [90, 45, 0] }),
      part('sphere', 'Eye L', [-0.12, 0.54, 0.26], { radius: 0.035, seg: 12 }, gloss('#14141a')),
      part('sphere', 'Eye R', [0.12, 0.54, 0.26], { radius: 0.035, seg: 12 }, gloss('#14141a')),
      part('sphere', 'Wing L', [-0.3, 0.38, -0.02], { radius: 0.14, seg: 20 }, soft('#2a6fe0'), { scale: [0.4, 1, 1.3] }),
      part('sphere', 'Wing R', [0.3, 0.38, -0.02], { radius: 0.14, seg: 20 }, soft('#2a6fe0'), { scale: [0.4, 1, 1.3] }),
      part('cone', 'Tail', [0, 0.28, -0.4], { rTop: 0, rBottom: 0.1, h: 0.24, seg: 4 }, soft('#2a6fe0'), { rot: [-100, 45, 0] }),
      part('cylinder', 'Foot L', [-0.08, 0.04, 0.02], { rTop: 0.012, rBottom: 0.012, h: 0.08, seg: 8 }, gloss('#ffb627')),
      part('cylinder', 'Foot R', [0.08, 0.04, 0.02], { rTop: 0.012, rBottom: 0.012, h: 0.08, seg: 8 }, gloss('#ffb627')),
    ],
  },
  {
    id: 'penguin', group: 'animals', label: 'Penguin', color: '#2b2f3a', icon: 'sphere',
    build: () => [
      part('sphere', 'Body', [0, 0.42, 0], { radius: 0.34, seg: 32 }, soft('#2b2f3a'), { scale: [1, 1.25, 0.9] }),
      part('sphere', 'Belly', [0, 0.38, 0.1], { radius: 0.27, seg: 32 }, soft('#f6f7fb'), { scale: [0.9, 1.2, 0.7] }),
      part('sphere', 'Head', [0, 0.86, 0], { radius: 0.2, seg: 32 }, soft('#2b2f3a')),
      part('cone', 'Beak', [0, 0.84, 0.2], { rTop: 0, rBottom: 0.05, h: 0.12, seg: 4 }, gloss('#ff9b2f'), { rot: [90, 45, 0] }),
      part('sphere', 'Eye L', [-0.075, 0.9, 0.16], { radius: 0.028, seg: 12 }, gloss('#ffffff')),
      part('sphere', 'Eye R', [0.075, 0.9, 0.16], { radius: 0.028, seg: 12 }, gloss('#ffffff')),
      part('sphere', 'Flipper L', [-0.34, 0.45, 0], { radius: 0.1, seg: 16 }, soft('#2b2f3a'), { scale: [0.3, 1.5, 0.8], rot: [0, 0, 15] }),
      part('sphere', 'Flipper R', [0.34, 0.45, 0], { radius: 0.1, seg: 16 }, soft('#2b2f3a'), { scale: [0.3, 1.5, 0.8], rot: [0, 0, -15] }),
      part('sphere', 'Foot L', [-0.12, 0.03, 0.1], { radius: 0.09, seg: 16 }, gloss('#ff9b2f'), { scale: [1, 0.35, 1.4] }),
      part('sphere', 'Foot R', [0.12, 0.03, 0.1], { radius: 0.09, seg: 16 }, gloss('#ff9b2f'), { scale: [1, 0.35, 1.4] }),
    ],
  },
  {
    id: 'bunny', group: 'animals', label: 'Bunny', color: '#f4eee6', icon: 'capsule',
    build: () => [
      part('sphere', 'Body', [0, 0.3, 0], { radius: 0.3, seg: 32 }, soft('#f4eee6'), { scale: [1, 1, 1.1] }),
      part('sphere', 'Head', [0, 0.68, 0.16], { radius: 0.2, seg: 32 }, soft('#f4eee6')),
      part('capsule', 'Ear L', [-0.08, 1.0, 0.14], { radius: 0.05, length: 0.26, seg: 16 }, soft('#f4eee6'), { rot: [0, 0, 8] }),
      part('capsule', 'Ear R', [0.08, 1.0, 0.14], { radius: 0.05, length: 0.26, seg: 16 }, soft('#f4eee6'), { rot: [0, 0, -8] }),
      part('capsule', 'Inner L', [-0.08, 1.0, 0.18], { radius: 0.025, length: 0.2, seg: 12 }, soft('#ffb3c8'), { rot: [0, 0, 8] }),
      part('capsule', 'Inner R', [0.08, 1.0, 0.18], { radius: 0.025, length: 0.2, seg: 12 }, soft('#ffb3c8'), { rot: [0, 0, -8] }),
      part('sphere', 'Eye L', [-0.07, 0.72, 0.34], { radius: 0.026, seg: 12 }, gloss('#14141a')),
      part('sphere', 'Eye R', [0.07, 0.72, 0.34], { radius: 0.026, seg: 12 }, gloss('#14141a')),
      part('sphere', 'Nose', [0, 0.67, 0.36], { radius: 0.02, seg: 12 }, gloss('#ff8fb0')),
      part('sphere', 'Tail', [0, 0.28, -0.34], { radius: 0.09, seg: 16 }, soft('#ffffff')),
    ],
  },
  {
    id: 'whale', group: 'animals', label: 'Whale', color: '#4aa3ff', icon: 'capsule',
    build: () => [
      part('capsule', 'Body', [0, 0.4, 0], { radius: 0.3, length: 0.5, seg: 32 }, soft('#4aa3ff'), { rot: [90, 0, 0] }),
      part('sphere', 'Belly', [0, 0.3, 0.05], { radius: 0.28, seg: 32 }, soft('#e7f3ff'), { scale: [0.95, 0.6, 2] }),
      part('cone', 'Tail', [0, 0.62, -0.62], { rTop: 0, rBottom: 0.16, h: 0.3, seg: 4 }, soft('#4aa3ff'), { rot: [-50, 45, 0] }),
      part('sphere', 'Eye L', [-0.22, 0.5, 0.42], { radius: 0.03, seg: 12 }, gloss('#14141a')),
      part('sphere', 'Eye R', [0.22, 0.5, 0.42], { radius: 0.03, seg: 12 }, gloss('#14141a')),
      part('sphere', 'Spout', [0, 0.8, 0.3], { radius: 0.05, seg: 12 }, gloss('#bfe3ff')),
    ],
  },

  // ------------------------------------------------------------------- props
  {
    id: 'house', group: 'props', label: 'Low-poly house', color: '#e86b4f', icon: 'box',
    build: () => [
      part('box', 'Walls', [0, 0.3, 0], { w: 0.9, h: 0.6, d: 0.7, radius: 0.01 }, clay('#f3e7d3')),
      part('cone', 'Roof', [0, 0.8, 0], { rTop: 0, rBottom: 0.7, h: 0.4, seg: 4 }, clay('#e86b4f'), { rot: [0, 45, 0], scale: [1, 1, 0.8] }),
      part('box', 'Door', [0, 0.18, 0.36], { w: 0.18, h: 0.36, d: 0.03, radius: 0.01 }, clay('#7a4a2a')),
      part('box', 'Window L', [-0.28, 0.35, 0.36], { w: 0.16, h: 0.16, d: 0.03, radius: 0.01 }, gloss('#9fd8ff')),
      part('box', 'Window R', [0.28, 0.35, 0.36], { w: 0.16, h: 0.16, d: 0.03, radius: 0.01 }, gloss('#9fd8ff')),
      part('box', 'Chimney', [0.28, 0.92, -0.1], { w: 0.12, h: 0.3, d: 0.12, radius: 0.01 }, clay('#9a5a45')),
    ],
  },
  {
    id: 'mug', group: 'props', label: 'Coffee mug', color: '#0034ff', icon: 'cylinder',
    build: () => [
      part('cylinder', 'Mug', [0, 0.25, 0], { rTop: 0.2, rBottom: 0.18, h: 0.5, seg: 48 }, gloss('#0034ff')),
      part('cylinder', 'Coffee', [0, 0.47, 0], { rTop: 0.17, rBottom: 0.17, h: 0.02, seg: 48 }, gloss('#4a2c1a')),
      part('torus', 'Handle', [0.22, 0.26, 0], { radius: 0.11, tube: 0.025, seg: 32 }, gloss('#0034ff')),
    ],
  },
  {
    id: 'lamp', group: 'props', label: 'Desk lamp', color: '#ffcf4a', icon: 'cone',
    build: () => [
      part('cylinder', 'Base', [0, 0.025, 0], { rTop: 0.2, rBottom: 0.22, h: 0.05, seg: 48 }, gloss('#2b2f3a')),
      part('cylinder', 'Arm', [0, 0.4, 0], { rTop: 0.02, rBottom: 0.02, h: 0.7, seg: 12 }, mat('metal', '#c9ced6', { roughness: 0.3 })),
      part('cone', 'Shade', [0, 0.82, 0], { rTop: 0.06, rBottom: 0.24, h: 0.3, seg: 32 }, gloss('#ffcf4a'), { rot: [180, 0, 0] }),
      part('sphere', 'Bulb', [0, 0.72, 0], { radius: 0.07, seg: 20 }, mat('emissive', '#fff2b0', { emissiveIntensity: 3 })),
    ],
  },
  {
    id: 'crystal', group: 'props', label: 'Crystal', color: '#6ad8ff', icon: 'cone',
    build: () => [
      part('cone', 'Crystal top', [0, 0.78, 0], { rTop: 0, rBottom: 0.24, h: 0.44, seg: 6 }, mat('frosted', '#6ad8ff')),
      part('cone', 'Crystal bottom', [0, 0.28, 0], { rTop: 0, rBottom: 0.24, h: 0.56, seg: 6 }, mat('frosted', '#6ad8ff'), { rot: [180, 0, 0] }),
      part('cone', 'Shard', [0.3, 0.2, 0.06], { rTop: 0, rBottom: 0.09, h: 0.36, seg: 6 }, mat('frosted', '#8fe6ff'), { rot: [0, 0, -20] }),
    ],
  },
  {
    id: 'podium', group: 'props', label: 'Podium', color: '#e7e8ea', icon: 'cylinder',
    build: () => [
      part('cylinder', 'Podium', [0, 0.15, 0], { rTop: 0.8, rBottom: 0.85, h: 0.3, seg: 64 }, soft('#e7e8ea')),
      part('torus', 'Glow ring', [0, 0.31, 0], { radius: 0.74, tube: 0.015, seg: 96 }, mat('emissive', '#0034ff', { emissiveIntensity: 3 }), { rot: [90, 0, 0] }),
    ],
  },
  {
    id: 'robot', group: 'props', label: 'Robot', color: '#c9ced6', icon: 'box',
    build: () => [
      part('box', 'Body', [0, 0.42, 0], { w: 0.42, h: 0.42, d: 0.3, radius: 0.06 }, gloss('#c9ced6')),
      part('box', 'Head', [0, 0.86, 0], { w: 0.36, h: 0.3, d: 0.3, radius: 0.07 }, gloss('#e7eaf0')),
      part('sphere', 'Eye L', [-0.09, 0.88, 0.15], { radius: 0.04, seg: 16 }, mat('emissive', '#6ad8ff', { emissiveIntensity: 3 })),
      part('sphere', 'Eye R', [0.09, 0.88, 0.15], { radius: 0.04, seg: 16 }, mat('emissive', '#6ad8ff', { emissiveIntensity: 3 })),
      part('cylinder', 'Antenna', [0, 1.08, 0], { rTop: 0.01, rBottom: 0.01, h: 0.14, seg: 8 }, gloss('#2b2f3a')),
      part('sphere', 'Antenna tip', [0, 1.16, 0], { radius: 0.03, seg: 12 }, gloss('#ff4d4d')),
      part('capsule', 'Arm L', [-0.3, 0.44, 0], { radius: 0.045, length: 0.24, seg: 12 }, gloss('#8d93a0')),
      part('capsule', 'Arm R', [0.3, 0.44, 0], { radius: 0.045, length: 0.24, seg: 12 }, gloss('#8d93a0')),
      part('box', 'Leg L', [-0.1, 0.1, 0], { w: 0.12, h: 0.2, d: 0.14, radius: 0.03 }, gloss('#8d93a0')),
      part('box', 'Leg R', [0.1, 0.1, 0], { w: 0.12, h: 0.2, d: 0.14, radius: 0.03 }, gloss('#8d93a0')),
    ],
  },

  // -------------------------------------------------------------- keychains
  {
    id: 'kc-tag', group: 'keychains', label: 'Glass tag keychain', color: '#f4e400', icon: 'ring',
    build: () => [
      part('torus', 'Ring', [0, 1.5, 0], { radius: 0.3, tube: 0.03, seg: 64 }, mat('chrome', '#e9edf2')),
      part('box', 'Glass tag', [0, 0.78, 0], { w: 0.55, h: 1, d: 0.07, radius: 0.05 }, mat('glass', '#f4e400')),
      part('ring', 'Eyelet', [0, 1.2, 0.04], { outer: 0.06, inner: 0.035, depth: 0.02, bevel: 0.004 }, mat('chrome', '#e9edf2')),
      part('text', 'Label', [0, 0.7, 0.05], { text: 'Mocha', font: 'inter', size: 0.2, depth: 0.03, bevel: 0.008 }, gloss('#14141a'), { rot: [0, 0, 90] }),
    ],
  },
  {
    id: 'kc-heart', group: 'keychains', label: 'Heart charm', color: '#ff6aa8', icon: 'heart',
    build: () => [
      part('torus', 'Ring', [0, 1.35, 0], { radius: 0.26, tube: 0.025, seg: 64 }, mat('chrome', '#e9edf2')),
      part('ring', 'Clasp', [0, 1.05, 0], { outer: 0.09, inner: 0.06, depth: 0.04, bevel: 0.008 }, mat('chrome', '#e9edf2'), { rot: [0, 90, 0] }),
      part('heart', 'Heart', [0, 0.62, 0], { size: 0.8, depth: 0.2, bevel: 0.05 }, soft('#ff6aa8')),
    ],
  },
  {
    id: 'kc-star', group: 'keychains', label: 'Star charm', color: '#ffd23f', icon: 'star',
    build: () => [
      part('torus', 'Ring', [0, 1.35, 0], { radius: 0.26, tube: 0.025, seg: 64 }, mat('chrome', '#e9edf2')),
      part('ring', 'Clasp', [0, 1.05, 0], { outer: 0.09, inner: 0.06, depth: 0.04, bevel: 0.008 }, mat('chrome', '#e9edf2'), { rot: [0, 90, 0] }),
      part('star', 'Star', [0, 0.62, 0], { points: 5, outer: 0.42, inner: 0.19, depth: 0.2, bevel: 0.04 }, gloss('#ffd23f')),
    ],
  },
  {
    id: 'kc-pill', group: 'keychains', label: 'Acrylic bar', color: '#0034ff', icon: 'box',
    build: () => [
      part('torus', 'Ring', [0, 1.3, 0], { radius: 0.26, tube: 0.025, seg: 64 }, mat('chrome', '#e9edf2')),
      part('box', 'Bar', [0, 0.65, 0], { w: 0.4, h: 1.0, d: 0.06, radius: 0.03 }, gloss('#0034ff')),
      part('text', 'Label', [0, 0.65, 0.04], { text: 'MOCHA', font: 'inter', size: 0.2, depth: 0.02, bevel: 0.006 }, gloss('#ffffff'), { rot: [0, 0, 90] }),
    ],
  },

  // ---------------------------------------------------------------- stickers
  {
    id: 'st-star', group: 'stickers', label: 'Star sticker', color: '#ffd23f', icon: 'star',
    build: () => [
      part('star', 'Die-cut border', [0, 0.55, 0], { points: 5, outer: 0.56, inner: 0.27, depth: 0.03, bevel: 0.008 }, soft('#ffffff')),
      part('star', 'Art', [0, 0.55, 0.02], { points: 5, outer: 0.48, inner: 0.22, depth: 0.02, bevel: 0.006 }, gloss('#ffd23f')),
    ],
  },
  {
    id: 'st-heart', group: 'stickers', label: 'Heart sticker', color: '#ff4d7d', icon: 'heart',
    build: () => [
      part('heart', 'Die-cut border', [0, 0.55, 0], { size: 1.1, depth: 0.03, bevel: 0.008 }, soft('#ffffff')),
      part('heart', 'Art', [0, 0.55, 0.02], { size: 0.95, depth: 0.02, bevel: 0.006 }, gloss('#ff4d7d')),
    ],
  },
  {
    id: 'st-round', group: 'stickers', label: 'Round badge', color: '#0034ff', icon: 'ring',
    build: () => [
      part('cylinder', 'Die-cut border', [0, 0.55, 0], { rTop: 0.56, rBottom: 0.56, h: 0.03, seg: 64 }, soft('#ffffff'), { rot: [90, 0, 0] }),
      part('cylinder', 'Art', [0, 0.55, 0.02], { rTop: 0.48, rBottom: 0.48, h: 0.02, seg: 64 }, gloss('#0034ff'), { rot: [90, 0, 0] }),
      part('text', 'Label', [0, 0.55, 0.05], { text: 'MOCHA', font: 'inter', size: 0.2, depth: 0.02, bevel: 0.004 }, gloss('#ffffff')),
    ],
  },
  {
    id: 'st-label', group: 'stickers', label: 'Label sticker', color: '#7ed957', icon: 'box',
    build: () => [
      part('box', 'Die-cut border', [0, 0.45, 0], { w: 1.3, h: 0.6, d: 0.03, radius: 0.15 }, soft('#ffffff')),
      part('box', 'Art', [0, 0.45, 0.02], { w: 1.2, h: 0.5, d: 0.02, radius: 0.12 }, gloss('#7ed957')),
      part('text', 'Label', [0, 0.45, 0.05], { text: 'HELLO', font: 'inter', size: 0.28, depth: 0.02, bevel: 0.004 }, gloss('#14141a')),
    ],
  },
];

export const libraryItem = (id) => LIBRARY.find((m) => m.id === id) ?? null;
