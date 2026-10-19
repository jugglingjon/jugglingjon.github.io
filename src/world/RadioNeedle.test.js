import { describe, expect, it } from 'vitest';
import { NEEDLE, RadioNeedle } from './RadioNeedle.js';

// The same "random" kicks every run.
function lcg(seed = 1) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

describe('RadioNeedle', () => {
  const run = (needle, seconds, playing, each = () => {}) => {
    for (let t = 0; t < seconds; t += 1 / 60) {
      needle.update(1 / 60, playing);
      each(needle.mesh.scale.y);
    }
  };

  it('stands at full height, as the needle, while the radio is off', () => {
    const needle = new RadioNeedle({ width: 0.01, height: 0.16 }, lcg());
    run(needle, 1, false);
    expect(needle.mesh.scale.y).toBe(1);
  });

  it('bounces between its floor and full height while the radio plays', () => {
    const needle = new RadioNeedle({ width: 0.01, height: 0.16 }, lcg());
    const heights = [];
    run(needle, 5, true, (h) => heights.push(h));
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(NEEDLE.floor);
    expect(Math.max(...heights)).toBeLessThanOrEqual(1);
    // It keeps moving: plenty of ups and downs, over most of its range.
    const late = heights.slice(60);
    expect(Math.max(...late) - Math.min(...late)).toBeGreaterThan(0.5);
    let turns = 0;
    for (let i = 2; i < late.length; i++) if ((late[i] - late[i - 1]) * (late[i - 1] - late[i - 2]) < 0) turns++;
    expect(turns).toBeGreaterThan(20); // a kick every 0.08–0.24 s, each one up and back down
  });

  it('kicks up quickly and drops back more slowly', () => {
    const needle = new RadioNeedle({ width: 0.01, height: 0.16 }, lcg(7));
    let rise = 0;
    let fall = 0;
    let last = 1;
    run(needle, 5, true, (h) => {
      rise = Math.max(rise, h - last);
      fall = Math.max(fall, last - h);
      last = h;
    });
    expect(fall).toBeCloseTo(NEEDLE.fall / 60, 6);
    expect(rise).toBeGreaterThan(fall * 3);
  });

  it('goes back to full height when switched off', () => {
    const needle = new RadioNeedle({ width: 0.01, height: 0.16 }, lcg());
    run(needle, 2, true);
    run(needle, 2, false);
    expect(needle.mesh.scale.y).toBeCloseTo(1, 3);
  });

  it('just drops to half height while it plays, for reduced motion', () => {
    const needle = new RadioNeedle({ width: 0.01, height: 0.16 }, lcg());
    needle.reducedMotion = true;
    const heights = [];
    run(needle, 3, true, (h) => heights.push(h));
    for (let i = 1; i < heights.length; i++) expect(heights[i]).toBeLessThanOrEqual(heights[i - 1]);
    expect(needle.mesh.scale.y).toBeCloseTo(0.5, 3);
  });

  it('stands up from the bottom of the bar', () => {
    const needle = new RadioNeedle({ width: 0.01, height: 0.16 });
    needle.mesh.geometry.computeBoundingBox();
    const { min, max } = needle.mesh.geometry.boundingBox;
    expect(min.y).toBeCloseTo(0, 6);
    expect(max.y).toBeCloseTo(0.16, 6);
  });
});
