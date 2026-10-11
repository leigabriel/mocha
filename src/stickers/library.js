/**
 * Built-in sticker designs (all original, free to use). `shape` picks a die-cut silhouette and
 * size in cm; `tpl` + `p` pick the artwork template and its parameters. Colour params are palette
 * roles (ink, paper, a1..a4) so every design re-skins with the pack style.
 */
const S = (id, name, group, shape, tpl, p = {}, extra = {}) => ({ id, name, group, shape, tpl, p, ...extra });

export const GROUPS = [
  { id: 'type', label: 'Type blobs' },
  { id: 'badge', label: 'Badges' },
  { id: 'tag', label: 'Tags & labels' },
  { id: 'sign', label: 'Signs' },
  { id: 'pixel', label: 'Pixel' },
  { id: 'shape', label: 'Shapes' },
];

export const LIBRARY = [
  // ------------------------------------------------------------------ type blobs
  S('meat-market', 'Meat Market', 'type', { type: 'cloud', w: 7.5, h: 6 }, 'typo', { bg: 'paper', icon: 'steak', iconColor: 'a1', iconColor2: 'paper', lines: ['MEAT', 'MEAT', 'MEAT'], cap: 'EXHIBITION №3', fg: 'ink' }),
  S('dumpling', 'Dumpling Gee', 'type', { type: 'cloud', w: 7.5, h: 5.6 }, 'typo', { bg: 'ink', fg: 'paper', icon: 'dumpling', iconColor: 'paper', iconColor2: 'ink', lines: ['GEE', 'DUMPLING'], cjk: '饺子' }),
  S('fabrica', 'Fabrica Shop', 'type', { type: 'oval', w: 8, h: 4.6 }, 'typo', { bg: 'paper', fg: 'a3', lines: ['FABRICA', 'SHOP!'], deco: 'stripes', decoColor: 'a3', decoAlpha: 0.18, cap: 'SINCE 1998 · STREET 44' }),
  S('jeans', 'Jeans + Basics', 'type', { type: 'flower', w: 7.2, h: 7.2, n: 6, amp: 0.09 }, 'typo', { bg: 'paper', fg: 'ink', lines: ['JEANS', '+ BASICS'], cap: 'WEAR · LOVE · REPEAT', deco: 'dots', decoColor: 'a1' }),
  S('big-heart', 'Big Heart', 'type', { type: 'blob', w: 7.5, h: 4.6, seed: 4 }, 'typo', { bg: 'a1', fg: 'paper', outline: 'ink', lines: ['BIG', 'HEART'], font: 'sans' }),
  S('be-kind', 'Be Kind', 'type', { type: 'wavy', w: 7.5, h: 5, amp: 0.22, freq: 6 }, 'typo', { bg: 'paper', fg: 'ink', lines: ['BE KIND'], deco: 'rainbow', cap: 'ALWAYS · EVERYWHERE' }),
  S('garden', 'Garden Lab', 'type', { type: 'flower', w: 7.2, h: 7.2, n: 5, amp: 0.12 }, 'typo', { bg: 'a4', fg: 'paper', icon: 'eye', iconColor: 'ink', iconColor2: 'paper', lines: ['GARDEN', 'LAB'], deco: 'halftone', decoColor: 'ink', decoAlpha: 0.25 }),
  S('clover-luck', 'Lucky Clover', 'type', { type: 'clover', w: 7, h: 7 }, 'typo', { bg: 'a2', fg: 'ink', icon: 'star', iconColor: 'paper', iconColor2: 'ink', lines: ['LUCKY', 'DAY'] }),
  // ------------------------------------------------------------------ badges
  S('coffee-house', 'Coffee House', 'badge', { type: 'circle', w: 7, h: 7 }, 'badge', { bg: 'paper', fg: 'ink', ring: 'ALWAYS BREWING · COFFEE HOUSE · ', ring2: 'SMALL BATCH', icon: 'cup', iconColor: 'a1', sub: 'EST. 2023' }),
  S('ointment', 'Ointment', 'badge', { type: 'circle', w: 6.6, h: 6.6 }, 'badge', { bg: 'paper', fg: 'ink', ring: 'MEDICATED OINTMENT · 30 g · ', cjk: '薬用', cjkColor: 'a1', rim: 'a1', sub: 'FOR EXTERNAL USE' }),
  S('nitro', 'Nitro Coffee', 'badge', { type: 'badge', w: 7, h: 7, n: 18 }, 'badge', { bg: 'ink', fg: 'paper', ring: 'NITRO COFFEE · COLD BREW · ', icon: 'drop', iconColor: 'a2', iconColor2: 'ink', text: '№ 7' }),
  S('tree-of-eden', 'Tree of Eden', 'badge', { type: 'hex', w: 7, h: 7 }, 'typo', { bg: 'ink', fg: 'paper', icon: 'sprout', iconColor: 'paper', lines: ['TREE OF', 'EDEN'], cap: '#2958' }),
  S('juice', '100% Juice', 'badge', { type: 'seal', w: 7, h: 7, n: 16 }, 'typo', { bg: 'a2', fg: 'ink', lines: ['100%', 'JUICE'], cjk: '果汁', cjkColor: 'a1', cap: 'NO SUGAR ADDED' }),
  S('sundae', 'Sundae Club', 'badge', { type: 'badge', w: 7, h: 7, n: 12 }, 'badge', { bg: 'a3', fg: 'paper', ring: 'SUNDAE CLUB · ONE SCOOP · ', icon: 'heart', iconColor: 'paper', iconColor2: 'a3', rim: 'paper' }),
  S('moon-co', 'Moon Co.', 'badge', { type: 'circle', w: 6.4, h: 6.4 }, 'badge', { bg: 'a4', fg: 'paper', ring: 'GOOD NIGHT · MOON CO. · ', icon: 'moon', iconColor: 'paper', iconColor2: 'a4', deco: 'dots', decoColor: 'paper' }),
  // ------------------------------------------------------------------ tags & labels
  S('fresh-hours', 'Fresh Hours', 'tag', { type: 'tag', w: 5.2, h: 8.6 }, 'tag', { bg: 'paper', fg: 'ink', title: 'FRESH HOURS', lines: ['MON–FRI  7:00–18:00', 'SAT       8:00–16:00', 'SUN       CLOSED'], code: 'qr', sub: 'SCAN FOR MENU', top: 0.2 }, { cord: true }),
  S('key-fob', 'Key Fob', 'tag', { type: 'fob', w: 4.8, h: 8.2 }, 'tag', { bg: 'paper', fg: 'ink', title: 'KEYS', lines: ['PHONE', 'COFFEE', 'WALLET'], deco: 'stripes', decoColor: 'a1', sub: 'IF FOUND PLEASE RETURN', top: 0.22 }, { cord: true }),
  S('foundry', 'The Foundry', 'tag', { type: 'loop', w: 5.6, h: 7.4 }, 'tag', { bg: 'a2', fg: 'ink', title: 'THE FOUNDRY', cjk: '工房', lines: ['DESIGNERS · MAKERS', 'EST. 2019'], code: 'bar', top: 0.3 }, { cord: true }),
  S('warning-label', 'Warning', 'tag', { type: 'rect', w: 6.4, h: 7.8, r: 0.4 }, 'sign', { bg: 'paper', fg: 'ink', icon: 'flame', iconColor: 'ink', iconColor2: 'paper', cap: 'WARNING', cjk: '注意', small: 'FLAMMABLE · KEEP AWAY FROM HEAT', iconSize: 0.42 }),
  S('worker', 'Worker 12', 'tag', { type: 'dogear', w: 7.4, h: 4.6 }, 'label', { bg: 'paper', fg: 'ink', title: 'WORKER-12', cjk: '劳动者', lines: ['SHIFT A / LINE 4', 'BADGE 0012-9'], code: 'bar', band: 'ink' }),
  S('tigerose', 'Tigerose', 'tag', { type: 'ticket', w: 4.6, h: 8.4 }, 'tag', { bg: 'ink', fg: 'paper', title: 'TIGEROSE', cjk: '虎薔薇', lines: ['ADMIT ONE', 'NIGHT SHOW', 'SEAT 12-F'], code: 'qr', top: 0.12 }),
  S('milano-label', 'Milano', 'tag', { type: 'dogear', w: 7.4, h: 4.2 }, 'label', { bg: 'ink', fg: 'paper', band: 'a2', bandFg: 'ink', title: 'MILANO', lines: ['EXPRESS · 2.4 KG', 'PRIORITY'], code: 'bar' }),
  S('admit-one', 'Admit One', 'tag', { type: 'ticket', w: 8, h: 4 }, 'label', { bg: 'a2', fg: 'ink', band: 'ink', title: 'ADMIT ONE', lines: ['GENERAL ENTRY', 'ROW — SEAT —'], code: 'bar' }),
  // ------------------------------------------------------------------ signs
  S('slip', 'Slip', 'sign', { type: 'triangle', w: 7.4, h: 6.6 }, 'sign', { bg: 'a1', fg: 'ink', shape: 'triangle', icon: 'slip', cap: '' }),
  S('infectious', 'Infectious', 'sign', { type: 'diamond', w: 8, h: 8 }, 'sign', { bg: 'a2', fg: 'ink', icon: 'biohazard', cap: 'INFECTIOUS', cjk: '感染性', iconSize: 0.34, compact: true }),
  S('radiation', 'Radiation', 'sign', { type: 'triangle', w: 7.4, h: 6.6 }, 'sign', { bg: 'a2', fg: 'ink', shape: 'triangle', icon: 'radiation', cap: '' }),
  S('rapid-tax', 'Rapid Tax', 'sign', { type: 'aframe', w: 5.6, h: 7.6 }, 'label', { bg: 'paper', fg: 'ink', band: 'ink', title: 'TAX', lines: ['RAPID SERVICE', 'DIVORCE · BANKRUPTCY', 'OPEN 52 WEEKS'], code: 'none' }),
  S('work-along', 'Work Along', 'sign', { type: 'aframe', w: 5.8, h: 7.4 }, 'typo', { bg: 'paper', fg: 'ink', lines: ['BRING YOUR', 'WORK ALONG'], cap: 'ALWAYS OPEN', deco: 'waves', decoColor: 'a3', decoAlpha: 0.6 }),
  S('hazard-bolt', 'High Voltage', 'sign', { type: 'diamond', w: 7.6, h: 7.6 }, 'sign', { bg: 'a2', fg: 'ink', icon: 'bolt', cap: 'VOLTAGE', iconSize: 0.34, compact: true }),
  // ------------------------------------------------------------------ pixel
  S('px-heart', 'Pixel Heart', 'pixel', { type: 'pixel', w: 7, h: 6.2, art: 'heart' }, 'pixel', { bg: 'a1', band: 'a4', text: 'LOVE', face: false }),
  S('px-ghost', 'Pixel Ghost', 'pixel', { type: 'pixel', w: 6.6, h: 6.6, art: 'ghost' }, 'pixel', { bg: 'paper', band: 'a3', textColor: 'ink', text: 'BOO' }),
  S('px-cup', 'Pixel Café', 'pixel', { type: 'pixel', w: 7, h: 6.4, art: 'cup' }, 'pixel', { bg: 'a2', band: 'a1', textColor: 'ink', text: 'CAFE', face: false }),
  S('px-chair', 'Pixel Chair', 'pixel', { type: 'pixel', w: 6.4, h: 6.4, art: 'chair' }, 'pixel', { bg: 'a2', band: 'ink', text: 'SIT', face: false }),
  S('px-star', 'Pixel Star', 'pixel', { type: 'pixel', w: 6.8, h: 6.4, art: 'star' }, 'pixel', { bg: 'a2', band: 'a1', textColor: 'ink', text: 'STAR' }),
  // ------------------------------------------------------------------ shapes
  S('drumstick', 'Drumstick', 'shape', { type: 'drumstick', w: 4.4, h: 7.4 }, 'typo', { bg: 'a4', fg: 'paper', icon: 'drumstick', iconColor: 'paper', iconColor2: 'a4', lines: ['YUM'] }),
  S('leaf-tea', 'Leaf Tea', 'shape', { type: 'leaf', w: 4.6, h: 7.6 }, 'icon', { bg: 'a2', icon: 'leaf', iconColor: 'ink', iconColor2: 'a2', lines: ['TEA'], fg: 'ink' }),
  S('drop', 'Water Drop', 'shape', { type: 'tear', w: 5.2, h: 7.6 }, 'icon', { bg: 'a3', icon: 'drop', iconColor: 'paper', lines: ['H₂O'], fg: 'paper' }),
  S('dog-bone', 'Dog Treat', 'shape', { type: 'bone', w: 8, h: 4.2 }, 'typo', { bg: 'paper', fg: 'ink', lines: ['GOOD DOG'], cap: 'TREAT · 1 PIECE', deco: 'dots', decoColor: 'a1' }),
  S('bean', 'Coffee Bean', 'shape', { type: 'bean', w: 7.2, h: 6 }, 'icon', { bg: 'ink', icon: 'bean', iconColor: 'a1', iconColor2: 'ink', lines: ['COFFEE'], fg: 'paper' }),
  S('shield', 'Safe Shield', 'shape', { type: 'shield', w: 6.2, h: 7.6 }, 'icon', { bg: 'a3', icon: 'star', iconColor: 'a2', lines: ['SAFE'], fg: 'paper' }),
  S('burst-new', 'New!', 'shape', { type: 'burst', w: 7, h: 7, n: 12 }, 'typo', { bg: 'a1', fg: 'paper', outline: 'ink', lines: ['NEW!'], font: 'sans' }),
  S('speech-hi', 'Say Hi', 'shape', { type: 'bubble', w: 7.6, h: 5.6 }, 'typo', { bg: 'paper', fg: 'ink', lines: ['HELLO', 'THERE'], deco: 'rainbow', decoAlpha: 0.0 }),
  S('oval-chat', 'Chat Bubble', 'shape', { type: 'oval_bubble', w: 7.4, h: 5.4 }, 'typo', { bg: 'a2', fg: 'ink', lines: ['THE PLAIN', 'SWEETS'], cap: 'SINCE ALWAYS' }),
  S('smile', 'Smile', 'shape', { type: 'blob', w: 6.4, h: 6.4, seed: 7 }, 'icon', { bg: 'a2', icon: 'smile', iconColor: 'ink', iconColor2: 'a2', lines: ['KEEP', 'SMILING'], fg: 'ink' }),
];

export const byId = (id) => LIBRARY.find((s) => s.id === id) ?? null;
