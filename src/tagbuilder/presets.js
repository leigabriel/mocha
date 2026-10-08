import { defaultDesign, defaultTag, sanitizeTagDesign } from './design.js';

const make = (raw) => sanitizeTagDesign({ v: 1, ...raw });

export const PRESETS = [
  {
    id: 'reference',
    label: 'Carabiner + keys',
    build: () => defaultDesign(),
  },
  {
    id: 'name',
    label: 'Name tag',
    build: () =>
      make({
        top: 'none', keys: 0, chain: 1, bg: 'studio', metal: 'steel',
        tags: [
          defaultTag({ shape: 'pill', w: 54, h: 20, d: 3.5, material: 'gloss', color: '#101828', text: 'LEI', font: 'inter', textColor: '#ffffff', textSize: 78, textDepth: 1, yaw: 0 }),
        ],
      }),
  },
  {
    id: 'trio',
    label: 'Colour trio',
    build: () =>
      make({
        top: 'carabiner', carabinerColor: '#e8321e', gateColor: '#e8ecf2', sleeveColor: '#101828', keys: 1, chain: 2, bg: 'dusk', metal: 'gold',
        tags: [
          defaultTag({ shape: 'hex', w: 30, h: 30, d: 4, r: 4, material: 'matte', color: '#ffd23f', text: 'A', font: 'fredoka', textColor: '#101828', textSize: 70, textDepth: 1 }),
          defaultTag({ shape: 'circle', w: 28, h: 28, d: 4, material: 'acrylic', color: '#bfe3ff', text: 'B', font: 'bebas', textColor: '#0b3dff', textSize: 70, textDepth: 1.2 }),
          defaultTag({ shape: 'rounded', w: 28, h: 28, d: 4, r: 8, material: 'rubber', color: '#ff5d8f', text: 'C', font: 'silkscreen', textColor: '#ffffff', textSize: 60, textDepth: 1, textSide: 'both' }),
        ],
      }),
  },
];
