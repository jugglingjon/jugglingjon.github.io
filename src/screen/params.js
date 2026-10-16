// Tunable look of the TV. `signal` feeds Stage A, `display` and `glass` feed Stage B.
// The lab GUI edits these live; presets are partial overrides of DEFAULTS.

export const DEFAULTS = {
  signal: {
    roll: 0,
    rollSpeed: 0,
    rollBar: 1,
    hsync: 0,
    jitter: 0.0006,
    wobble: 0.0005,
    snow: 0,
    noise: 0.04,
    brightness: 0,
    contrast: 1.05,
    saturation: 0.95,
    hue: 0,
    bleed: 1.2,
    chromaShift: 0.8,
    ghost: 0.05,
    ghostOffset: 0.012,
    breathing: 0.015,
    persistence: 0.35,
  },
  display: {
    emission: 1.4,
    barrel: 0.04,
    overscan: 0.04,
    cornerRadius: 0.1,
    scanlines: 240,
    scanlineStrength: 0.55,
    beamSpread: 0.14,
    maskType: 1,
    maskStrength: 0.35,
    maskTriads: 300,
    convergenceX: 0.0008,
    convergenceY: 0.0002,
    halation: 0.18,
    halationLod: 3.5,
    vignette: 0.3,
    edgeShadow: 0.5,
    flicker: 0.012,
  },
  glass: {
    tint: '#0e1412',
    reflection: 1.8,
    roughness: 0.06,
    smudge: 0.6,
    envIntensity: 1,
  },
  source: {
    fit: 'cover',
    focusX: 0.5,
    focusY: 0.5,
  },
};

export const PRESETS = {
  '80s living room': {},
  'Clean Trinitron': {
    signal: { noise: 0.015, bleed: 0.6, chromaShift: 0.3, ghost: 0, jitter: 0.0002, wobble: 0, breathing: 0.008 },
    display: { barrel: 0.02, maskType: 1, maskStrength: 0.25, scanlineStrength: 0.45, convergenceX: 0.0003, convergenceY: 0 },
    glass: { reflection: 1.3, smudge: 0.2 },
  },
  'Worn-out rental': {
    signal: {
      noise: 0.1, bleed: 2.5, chromaShift: 2, ghost: 0.15, ghostOffset: 0.02, jitter: 0.0015, wobble: 0.0015,
      saturation: 0.8, hue: 0.08, breathing: 0.04, persistence: 0.45,
    },
    display: { convergenceX: 0.002, convergenceY: 0.0008, flicker: 0.03, vignette: 0.45, emission: 1.25 },
    glass: { smudge: 1 },
  },
  'Arcade monitor': {
    signal: { noise: 0.02, bleed: 0.4, chromaShift: 0.2, ghost: 0, saturation: 1.15, contrast: 1.1 },
    display: { scanlineStrength: 0.85, beamSpread: 0.2, maskType: 2, maskStrength: 0.5, halation: 0.3, emission: 1.6 },
  },
};

// Values animated by transitions (channel change, power, degauss) and layered on
// top of the tuned params, so a transition never overwrites what the lab set.
export function createFx() {
  return { roll: 0, hsync: 0, snow: 0, brightness: 0, chroma: 1, degauss: 0, power: 0, afterglow: 0 };
}

export function cloneDefaults() {
  return structuredClone(DEFAULTS);
}

export function applyPreset(params, name) {
  const fresh = cloneDefaults();
  const preset = PRESETS[name] ?? {};
  for (const group of Object.keys(fresh)) {
    if (group === 'source') continue;
    Object.assign(params[group], fresh[group], preset[group]);
  }
}
