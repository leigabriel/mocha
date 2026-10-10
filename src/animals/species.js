// The ten animals from the description library. Dimensions are metres for an adult; colours and
// features follow the "Body and Surface" / "Modeling and Materials" notes of each description.

export const ANIMAL_IDS = ['deer', 'parrot', 'dove', 'eagle', 'tiger', 'ostrich', 'cat', 'dog', 'monkey', 'horse'];

export const CLIP_LIST = [
  { id: 'idle', label: 'Idle', duration: 4, speed: 0 },
  { id: 'walk', label: 'Walk', duration: 1.2, speed: 1 },
  { id: 'run', label: 'Run', duration: 0.6, speed: 3.2 },
  { id: 'eat', label: 'Eat', duration: 3, speed: 0 },
  { id: 'fly', label: 'Fly', duration: 0.6, speed: 5 },
  { id: 'sleep', label: 'Sleep', duration: 5, speed: 0 },
];

const quad = (o) => ({ kind: 'quad', ...o });
const bird = (o) => ({ kind: 'bird', ...o });

export const SPECIES = {
  deer: quad({
    id: 'deer', label: 'Deer', blurb: 'Slender, long-legged, antlered grazer.',
    bodyLen: 1.1, bodyW: 0.2, bodyH: 0.27, upper: 0.4, lower: 0.42, legR: 0.04, foot: 'hoof',
    neckLen: 0.5, neckAngle: 38, neckR: 0.088, headLen: 0.22, headW: 0.075, headH: 0.085, snout: 0.13, ear: 'long', earLen: 0.14,
    tailLen: 0.12, tailR: 0.04, tailKind: 'short', colors: { coat: '#a8673a', belly: '#eadcc4', accent: '#e9dcc6', dark: '#2b2118' },
    options: { antlers: true, spots: false },
  }),
  tiger: quad({
    id: 'tiger', label: 'Tiger', blurb: 'Muscular striped big cat.',
    bodyLen: 1.65, bodyW: 0.23, bodyH: 0.29, upper: 0.4, lower: 0.38, legR: 0.085, foot: 'paw',
    neckLen: 0.32, neckAngle: 30, neckR: 0.14, headLen: 0.34, headW: 0.19, headH: 0.17, snout: 0.1, ear: 'round', earLen: 0.07,
    tailLen: 0.95, tailR: 0.055, tailKind: 'rings', colors: { coat: '#e2791d', belly: '#f4e8d6', accent: '#f6efe3', dark: '#17110d' },
    options: { stripes: true },
  }),
  cat: quad({
    id: 'cat', label: 'Cat', blurb: 'Small, agile, whiskered feline.',
    bodyLen: 0.46, bodyW: 0.09, bodyH: 0.11, upper: 0.11, lower: 0.12, legR: 0.026, foot: 'paw',
    neckLen: 0.09, neckAngle: 40, neckR: 0.05, headLen: 0.13, headW: 0.1, headH: 0.09, snout: 0.035, ear: 'point', earLen: 0.065,
    tailLen: 0.42, tailR: 0.022, tailKind: 'curve', colors: { coat: '#c98a45', belly: '#f1e2c8', accent: '#f1e2c8', dark: '#3a2a1c' },
    options: { stripes: true },
  }),
  dog: quad({
    id: 'dog', label: 'Dog', blurb: 'Muzzle, floppy ears, wagging tail.',
    bodyLen: 0.72, bodyW: 0.13, bodyH: 0.16, upper: 0.2, lower: 0.2, legR: 0.035, foot: 'paw',
    neckLen: 0.17, neckAngle: 48, neckR: 0.07, headLen: 0.2, headW: 0.1, headH: 0.1, snout: 0.1, ear: 'fold', earLen: 0.12,
    tailLen: 0.36, tailR: 0.028, tailKind: 'curl', colors: { coat: '#b57c46', belly: '#e9d2ad', accent: '#f4ead8', dark: '#2a1d14' },
    options: { patch: true },
  }),
  horse: quad({
    id: 'horse', label: 'Horse', blurb: 'Tall, powerful, with mane and tail.',
    bodyLen: 1.7, bodyW: 0.26, bodyH: 0.38, upper: 0.44, lower: 0.56, legR: 0.066, foot: 'hoof',
    neckLen: 0.72, neckAngle: 50, neckR: 0.145, headLen: 0.5, headW: 0.11, headH: 0.13, snout: 0.2, ear: 'point', earLen: 0.13,
    tailLen: 0.75, tailR: 0.05, tailKind: 'hair', colors: { coat: '#7b4a28', belly: '#6e4223', accent: '#1d1511', dark: '#1d1511' },
    options: { mane: true, socks: true },
  }),
  monkey: quad({
    id: 'monkey', label: 'Monkey', blurb: 'Grasping hands, long prehensile tail.',
    bodyLen: 0.46, bodyW: 0.1, bodyH: 0.12, upper: 0.1, lower: 0.1, legR: 0.026, foot: 'hand', armBoost: 1.3,
    neckLen: 0.07, neckAngle: 55, neckR: 0.05, headLen: 0.1, headW: 0.075, headH: 0.075, snout: 0.03, ear: 'round', earLen: 0.035,
    tailLen: 0.62, tailR: 0.02, tailKind: 'prehensile', colors: { coat: '#7a5a3a', belly: '#b99a74', accent: '#d9b494', dark: '#2a1d14' },
    options: { face: true },
  }),
  parrot: bird({
    id: 'parrot', label: 'Parrot', blurb: 'Hooked beak, vivid plumage, gripping toes.', canFly: true,
    bodyLen: 0.3, bodyR: 0.085, pitch: 52, legLen: 0.08, neckLen: 0.07, neckTilt: [30, 10], headR: 0.055, beak: { len: 0.05, h: 0.04, hook: true },
    wing: { l1: 0.09, l2: 0.1, l3: 0.12, chord: 0.085 }, tail: { len: 0.32, w: 0.05, feathers: 3 }, toes: 'zygo',
    colors: { coat: '#d62a2a', belly: '#e8433a', wing: '#1f5fd1', accent: '#f6c61a', beak: '#e8e2d4', skin: '#f2efe8', dark: '#1a1a1a' },
    options: {},
  }),
  dove: bird({
    id: 'dove', label: 'Dove', blurb: 'Soft, rounded, small-headed bird.', canFly: true,
    bodyLen: 0.27, bodyR: 0.075, pitch: 22, legLen: 0.05, neckLen: 0.05, neckTilt: [35, -10], headR: 0.036, beak: { len: 0.026, h: 0.014, hook: false },
    wing: { l1: 0.08, l2: 0.09, l3: 0.11, chord: 0.07 }, tail: { len: 0.17, w: 0.06, feathers: 5 }, toes: 'anis',
    colors: { coat: '#a8a49c', belly: '#d9d2c6', wing: '#8f8b84', accent: '#7bb89b', beak: '#3d3a38', skin: '#d9718a', dark: '#2a2624' },
    options: { sheen: true },
  }),
  eagle: bird({
    id: 'eagle', label: 'Eagle', blurb: 'Broad wings, hooked beak, curved talons.', canFly: true,
    bodyLen: 0.72, bodyR: 0.13, pitch: 28, legLen: 0.2, neckLen: 0.1, neckTilt: [28, -10], headR: 0.07, beak: { len: 0.085, h: 0.065, hook: true },
    wing: { l1: 0.34, l2: 0.38, l3: 0.34, chord: 0.24 }, tail: { len: 0.34, w: 0.16, feathers: 7 }, toes: 'anis', talons: true,
    colors: { coat: '#4a3220', belly: '#5b3f29', wing: '#3a2616', accent: '#f4f1ea', beak: '#e6b422', skin: '#e6b422', dark: '#15100b' },
    options: { whiteHead: true },
  }),
  ostrich: bird({
    id: 'ostrich', label: 'Ostrich', blurb: 'Flightless, long neck and legs, two toes.', canFly: false,
    bodyLen: 0.85, bodyR: 0.3, pitch: 14, legLen: 1.15, neckLen: 0.95, neckTilt: [8, -4], headR: 0.07, beak: { len: 0.1, h: 0.04, hook: false },
    wing: { l1: 0.16, l2: 0.2, l3: 0.2, chord: 0.2 }, tail: { len: 0.35, w: 0.3, feathers: 7 }, toes: 'two',
    colors: { coat: '#1a1a1c', belly: '#242427', wing: '#f4f1ea', accent: '#f4f1ea', beak: '#d9c7a8', skin: '#d9a39a', dark: '#111' },
    options: {},
  }),
};

export const FLYERS = ANIMAL_IDS.filter((id) => SPECIES[id].canFly);
export const clipsFor = (id) => CLIP_LIST.filter((c) => c.id !== 'fly' || SPECIES[id]?.canFly).map((c) => c.id);
