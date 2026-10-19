import * as THREE from 'three';

// The clock radio's level meter, in its tuning dial's window (the dial is
// painted out of the model's texture): two rows of LED segments, green
// through yellow to red, like a tape deck's. Switched off, they sit dark.
// While the radio plays, both rows light up to a level that kicks up at
// random every tenth of a second or so and drops back between kicks, and the
// top segment lit hangs on a moment before it follows (peak hold). It doesn't
// follow the music (the station is compressed so hard its level hardly
// moves); it just shows the radio's on. With reduced motion the rows light to
// a steady level instead.

export const METER = {
  segments: 20, // in each row
  rows: 2,
  kick: [0.5, 1], // how high each kick sends the level (0 … 1)
  spread: 0.15, // how far apart the two rows land on a kick, at most (a share of it)
  gap: [0.08, 0.22], // seconds between kicks
  rise: 0.015, // how fast the level jumps to a kick (time constant, seconds)
  fall: 1.8, // how fast it drops between kicks, and when switched off (full scale a second)
  floor: 0.1, // the lowest it drops while playing
  hold: 0.5, // how long a peak hangs on, in seconds
  steady: 0.6, // the level with reduced motion
  lit: 0.8, // a lit segment's brightness (linear; LEDs skip the tone mapping, so they keep their colour)
  unlit: 0.025, // an unlit one's
};

// Hue along the meter: green for over half of it, then yellow, then red.
const HUES = [
  [0, 0.36],
  [0.55, 0.36],
  [0.78, 0.15],
  [0.86, 0],
  [1, 0],
];

// A segment's colour at `t` along the meter (0 … 1), at full brightness.
export function segmentColour(t, out = new THREE.Color()) {
  let k = 1;
  while (k < HUES.length - 1 && t > HUES[k][0]) k++;
  const [t0, h0] = HUES[k - 1];
  const [t1, h1] = HUES[k];
  return out.setHSL(THREE.MathUtils.lerp(h0, h1, THREE.MathUtils.clamp((t - t0) / (t1 - t0), 0, 1)), 1, 0.5);
}

const lerp = ([a, b], t) => a + (b - a) * t;
const colour = new THREE.Color();
const at = new THREE.Matrix4();

export class RadioMeter {
  // Rows of segments filling `width` × `height`, centred on its origin and
  // facing +z, the low end at −x, the first row on top.
  constructor({ width, height }, rand = Math.random) {
    const { segments, rows } = METER;
    const pitch = width / segments;
    const rowHeight = height / (rows + (rows - 1) / 2); // half a row between rows
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(pitch * 0.62, rowHeight), new THREE.MeshBasicMaterial({ toneMapped: false }), rows * segments);
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < segments; i++) {
        at.makeTranslation(-width / 2 + pitch * (i + 0.5), height / 2 - rowHeight / 2 - r * rowHeight * 1.5, 0);
        this.mesh.setMatrixAt(r * segments + i, at);
      }
    }
    this.colours = Array.from({ length: segments }, (_, i) => segmentColour((i + 0.5) / segments));
    this.rand = rand;
    this.reducedMotion = false;
    this.levels = new Array(rows).fill(0);
    this.peaks = new Array(rows).fill(0);
    this.kicks = new Array(rows).fill(0); // where the last kick is sending each row (0 once it's there)
    this.held = new Array(rows).fill(0); // how long each peak has left to hang on
    this.wait = 0; // until the next kick
    this.shown = Array.from({ length: rows }, () => ({ lit: -1, peak: -1 }));
    this.paint();
  }

  update(dt, playing) {
    const m = METER;
    const bouncing = playing && !this.reducedMotion;
    if (bouncing && (this.wait -= dt) <= 0) {
      const kick = lerp(m.kick, this.rand());
      this.kicks = this.kicks.map(() => kick * (1 - m.spread * this.rand()));
      this.wait = lerp(m.gap, this.rand());
    }
    for (let r = 0; r < m.rows; r++) {
      let level = this.levels[r];
      if (!playing) level = Math.max(0, level - m.fall * dt);
      else if (this.reducedMotion) level += (m.steady - level) * (1 - Math.exp(-dt / 0.2));
      else if (this.kicks[r] > level) {
        level += (this.kicks[r] - level) * (1 - Math.exp(-dt / m.rise));
        if (this.kicks[r] - level < 0.01) this.kicks[r] = 0;
      } else {
        this.kicks[r] = 0;
        level = Math.max(m.floor, level - m.fall * dt);
      }
      this.levels[r] = level;
      if (level >= this.peaks[r] || this.reducedMotion) {
        this.peaks[r] = level;
        this.held[r] = m.hold;
      } else if ((this.held[r] -= dt) <= 0) this.peaks[r] = Math.max(level, this.peaks[r] - m.fall * dt);
    }
    this.paint();
  }

  // How many segments of row `r` are lit, and which one is its peak (−1 for none).
  lit(r) {
    const n = METER.segments;
    return { lit: Math.round(this.levels[r] * n), peak: Math.min(n, Math.round(this.peaks[r] * n)) - 1 };
  }

  // Light the segments, where they've changed.
  paint() {
    const { segments, rows } = METER;
    let changed = false;
    for (let r = 0; r < rows; r++) {
      const now = this.lit(r);
      const was = this.shown[r];
      if (now.lit === was.lit && now.peak === was.peak) continue;
      for (let i = 0; i < segments; i++) {
        const on = i < now.lit || i === now.peak;
        this.mesh.setColorAt(r * segments + i, colour.copy(this.colours[i]).multiplyScalar(on ? METER.lit : METER.unlit));
      }
      this.shown[r] = now;
      changed = true;
    }
    if (changed) this.mesh.instanceColor.needsUpdate = true;
  }
}
