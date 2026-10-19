import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { METER, RadioMeter, segmentColour } from './RadioMeter.js';

// The same "random" kicks every run.
function lcg(seed = 1) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

const size = { width: 0.66, height: 0.17 };
const hueOf = (colour) => colour.getHSL({}).h;

// Which segments of row `r` are lit, read back from the mesh.
function litSegments(meter, r) {
  const colour = new THREE.Color();
  return Array.from({ length: METER.segments }, (_, i) => {
    meter.mesh.getColorAt(r * METER.segments + i, colour);
    const full = meter.colours[i];
    const brightness = Math.max(colour.r, colour.g, colour.b) / Math.max(full.r, full.g, full.b);
    expect([METER.lit, METER.unlit].some((b) => Math.abs(brightness - b) < 1e-6)).toBe(true);
    return brightness > METER.unlit + 1e-6;
  });
}

const run = (meter, seconds, playing, each = () => {}) => {
  for (let t = 0; t < seconds; t += 1 / 60) {
    meter.update(1 / 60, playing);
    each();
  }
};

describe('segmentColour', () => {
  it('runs green, through yellow, to red', () => {
    expect(hueOf(segmentColour(0.1))).toBeCloseTo(0.36, 2);
    expect(hueOf(segmentColour(0.5))).toBeCloseTo(0.36, 2);
    expect(hueOf(segmentColour(0.78))).toBeCloseTo(0.15, 2);
    expect(hueOf(segmentColour(0.95))).toBeCloseTo(0, 2);
  });
});

describe('RadioMeter', () => {
  it('lays out two rows of segments in its area, the low end on the left, the first row on top', () => {
    const meter = new RadioMeter(size);
    expect(meter.mesh.count).toBe(METER.rows * METER.segments);
    const at = new THREE.Matrix4();
    const p = (i) => new THREE.Vector3().setFromMatrixPosition((meter.mesh.getMatrixAt(i, at), at));
    expect(p(0).x).toBeLessThan(p(1).x);
    expect(p(0).y).toBeGreaterThan(p(METER.segments).y);
    meter.mesh.computeBoundingBox();
    const box = meter.mesh.boundingBox;
    expect(box.max.x - box.min.x).toBeLessThanOrEqual(size.width + 1e-9);
    expect(box.max.y - box.min.y).toBeCloseTo(size.height, 6);
    expect(hueOf(meter.colours[0])).toBeCloseTo(0.36, 2); // green at the bottom…
    expect(hueOf(meter.colours.at(-1))).toBeCloseTo(0, 2); // …red at the top
  });

  it('sits dark while the radio is off', () => {
    const meter = new RadioMeter(size, lcg());
    run(meter, 1, false);
    for (let r = 0; r < METER.rows; r++) expect(litSegments(meter, r).some(Boolean)).toBe(false);
  });

  it('bounces over most of its range while the radio plays, both rows together', () => {
    const meter = new RadioMeter(size, lcg());
    const counts = [];
    run(meter, 1, true);
    run(meter, 5, true, () => {
      const { lit } = meter.lit(0);
      counts.push(lit);
      expect(Math.abs(lit - meter.lit(1).lit)).toBeLessThanOrEqual(METER.segments * 0.25);
      // The lit segments run from the bottom up, without gaps.
      const row = litSegments(meter, 0);
      expect(row.slice(0, lit).every(Boolean)).toBe(true);
    });
    expect(Math.min(...counts)).toBeLessThanOrEqual(METER.segments * 0.25);
    expect(Math.max(...counts)).toBeGreaterThanOrEqual(METER.segments * 0.85);
    let turns = 0;
    for (let i = 2; i < counts.length; i++) if ((counts[i] - counts[i - 1]) * (counts[i - 1] - counts[i - 2]) < 0) turns++;
    expect(turns).toBeGreaterThan(20);
  });

  it('holds each peak a moment above the falling level', () => {
    const meter = new RadioMeter(size, lcg(3));
    let held = 0;
    run(meter, 5, true, () => {
      const { lit, peak } = meter.lit(0);
      if (peak >= lit + 2) {
        held++;
        expect(litSegments(meter, 0)[peak]).toBe(true);
        expect(litSegments(meter, 0)[peak - 1]).toBe(false);
      }
    });
    expect(held).toBeGreaterThan(30);
  });

  it('drops back to dark when switched off', () => {
    const meter = new RadioMeter(size, lcg());
    run(meter, 2, true);
    run(meter, 1.5, false);
    for (let r = 0; r < METER.rows; r++) expect(litSegments(meter, r).some(Boolean)).toBe(false);
  });

  it('lights to a steady level for reduced motion', () => {
    const meter = new RadioMeter(size, lcg());
    meter.reducedMotion = true;
    run(meter, 2, true);
    const settled = meter.lit(0);
    run(meter, 2, true, () => expect(meter.lit(0)).toEqual(settled));
    expect(settled.lit).toBe(Math.round(METER.steady * METER.segments));
  });
});
