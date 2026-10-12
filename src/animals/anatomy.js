// Per-species shape tables for the smooth-surface models. All fractions are multiples of the
// species' base dimensions in species.js, so a change there still scales everything consistently.

/** Torso stations: [z along body (fraction of bodyLen), y centre (x bodyH), width (x bodyW), height (x bodyH)]. */
const TORSO_DEFAULT = [
  [-0.5, 0.06, 0.3, 0.42],
  [-0.43, 0.08, 0.8, 0.88],
  [-0.3, 0.05, 1.02, 1.02],
  [-0.08, -0.02, 0.9, 0.94],
  [0.16, -0.05, 0.96, 1.05],
  [0.3, 0.04, 0.9, 1.0], [0.43, 0.01, 0.80, 0.90],
];

const HEAD = {
  canine: [[0, 0.74, 0.8, 0], [0.18, 0.95, 0.95, 0], [0.38, 0.8, 0.82, -0.06], [0.58, 0.6, 0.66, -0.2], [0.85, 0.55, 0.55, -0.28], [1, 0.52, 0.5, -0.3]],
  horse: [[0, 0.82, 0.95, 0], [0.15, 1, 1.2, 0], [0.34, 0.84, 1.1, -0.1], [0.6, 0.72, 1.0, -0.3], [0.88, 0.8, 0.82, -0.44], [1, 0.8, 0.74, -0.46]],
  feline: [[0, 0.8, 0.82, 0], [0.2, 1, 0.95, 0], [0.42, 0.96, 0.8, -0.1], [0.62, 0.66, 0.58, -0.2], [0.84, 0.52, 0.45, -0.24], [1, 0.42, 0.36, -0.26]],
  deer: [[0, 0.8, 0.86, 0], [0.18, 1, 1, 0], [0.4, 0.7, 0.78, -0.1], [0.7, 0.46, 0.5, -0.28], [0.92, 0.4, 0.42, -0.35], [1, 0.38, 0.38, -0.36]],
  primate: [[0, 0.86, 0.86, 0], [0.3, 1, 1, 0], [0.6, 0.9, 0.86, -0.08], [0.85, 0.7, 0.62, -0.12], [1, 0.58, 0.5, -0.14]],
};

const LEG = {
  // [t from hip/shoulder (0) to the ground (1), lateral radius, fore-aft radius] in multiples of legR
  stocky: [[0, 1.7, 1.9], [0.2, 1.45, 1.7], [0.36, 1.1, 1.25], [0.46, 1.0, 1.05], [0.56, 0.9, 0.95], [0.82, 0.78, 0.84], [0.93, 0.95, 1.0], [1, 0.9, 0.95]],
  long: [[0, 1.8, 2.1], [0.18, 1.5, 1.9], [0.38, 1.05, 1.3], [0.47, 1.2, 1.2], [0.56, 0.78, 0.9], [0.84, 0.62, 0.72], [0.94, 0.88, 0.95], [1, 0.8, 0.85]],
  slim: [[0, 1.6, 1.8], [0.2, 1.3, 1.5], [0.4, 1.0, 1.15], [0.5, 1.0, 1.05], [0.6, 0.85, 0.9], [0.84, 0.75, 0.8], [0.94, 0.92, 0.95], [1, 0.85, 0.9]],
};

export const ANATOMY = {
  deer: { head: HEAD.deer, leg: LEG.long, torso: [[-0.5, 0.06, 0.3, 0.4], [-0.43, 0.08, 0.72, 0.84], [-0.3, 0.05, 0.92, 0.98], [-0.08, 0.02, 0.78, 0.82], [0.16, -0.02, 0.84, 0.98], [0.3, 0.04, 0.78, 0.94], [0.43, 0.01, 0.69, 0.85]], neckTaper: [1.3, 0.9, 0.72], hindZig: [-0.32, 0.6, -0.28], foreZig: [0.0, 0.0, 0.0], eye: { iris: '#4a3018', pupil: 'horizontal', sclera: '#2a1c14', r: 0.26, lat: 0.95, up: 0.2, yaw: 78, fwd: 0.12 } },
  tiger: { head: HEAD.feline, leg: LEG.stocky, torso: TORSO_DEFAULT, neckTaper: [1.5, 1.2, 1.05], hindZig: [-0.3, 0.55, -0.25], foreZig: [0.05, -0.05, 0.0], eye: { iris: '#c7a02a', pupil: 'round', sclera: '#2a1c14', r: 0.2, lat: 0.72, up: 0.42, yaw: 40, fwd: 0.32 } },
  cat: { head: HEAD.feline, leg: LEG.slim, torso: [[-0.5, 0.06, 0.3, 0.45], [-0.43, 0.08, 0.8, 0.88], [-0.3, 0.05, 0.98, 0.98], [-0.08, -0.04, 0.82, 0.88], [0.16, -0.04, 0.9, 1.0], [0.3, 0.04, 0.84, 0.96], [0.43, 0.01, 0.75, 0.86]], neckTaper: [1.3, 1.0, 0.9], hindZig: [-0.35, 0.65, -0.3], foreZig: [0.05, -0.05, 0.0], eye: { iris: '#8fb04a', pupil: 'slit', sclera: '#2a1c14', r: 0.19, lat: 0.72, up: 0.42, yaw: 38, fwd: 0.3 } },
  dog: { head: HEAD.canine, leg: LEG.slim, torso: TORSO_DEFAULT, neckTaper: [1.35, 1.05, 0.9], hindZig: [0.28, -0.5, 0.22], foreZig: [0.05, -0.05, 0.0], eye: { iris: '#5b3a1c', pupil: 'round', sclera: '#2a1c14', r: 0.22, lat: 0.74, up: 0.42, yaw: 42, fwd: 0.3 } },
  horse: { head: HEAD.horse, leg: LEG.long, torso: [[-0.5, 0.06, 0.3, 0.44], [-0.43, 0.1, 0.88, 0.92], [-0.28, 0.07, 1.04, 1.02], [-0.06, -0.02, 0.9, 0.96], [0.16, -0.06, 0.96, 1.08], [0.3, 0.05, 0.9, 1.0], [0.43, 0.02, 0.80, 0.90]], neckTaper: [1.5, 1.05, 0.8], hindZig: [-0.3, 0.55, -0.25], foreZig: [0.0, 0.0, 0.0], eye: { iris: '#3a2410', pupil: 'horizontal', sclera: '#1d140d', r: 0.3, lat: 0.95, up: 0.25, yaw: 80, fwd: 0.14 } },
  monkey: { head: HEAD.primate, leg: LEG.slim, torso: TORSO_DEFAULT, neckTaper: [1.3, 1.1, 1.0], hindZig: [-0.35, 0.6, -0.25], foreZig: [0.1, -0.1, 0.0], eye: { iris: '#6b4222', pupil: 'round', sclera: '#e9dcc9', r: 0.34, lat: 0.64, up: 0.3, yaw: 22, fwd: 0.4 } },
};
