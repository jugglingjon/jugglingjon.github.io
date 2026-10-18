import { describe, expect, it } from 'vitest';
import { QualityWatch, WATCH } from './PostFX.js';

describe('QualityWatch (auto quality)', () => {
  const run = (watch, fps, seconds, hidden = false) => {
    for (let t = 0; t < seconds; t += 1 / fps) watch.track(1 / fps, hidden);
    return watch.tier;
  };

  it('keeps the tier at a smooth frame rate', () => {
    expect(run(new QualityWatch('high'), 60, 30)).toBe('high');
  });

  it('waits out the warm-up, then steps down a tier at a time', () => {
    const watch = new QualityWatch('high');
    expect(run(watch, 20, WATCH.warmup + WATCH.window * 0.5)).toBe('high');
    expect(run(watch, 20, WATCH.window)).toBe('medium');
    expect(run(watch, 20, WATCH.window + 0.1)).toBe('low');
    expect(run(watch, 20, 60)).toBe('low'); // and no further
  });

  it('never climbs back up', () => {
    const watch = new QualityWatch('high');
    run(watch, 20, WATCH.warmup + WATCH.window + 0.1);
    expect(run(watch, 120, 60)).toBe('medium');
  });

  it("doesn't count a hidden tab or a long pause", () => {
    const watch = new QualityWatch('high');
    run(watch, 10, 30, true);
    watch.track(30); // back from the background
    expect(run(watch, 60, 10)).toBe('high');
  });

  it('counts genuinely slow frames, even a second long', () => {
    expect(run(new QualityWatch('high'), 0.8, 30)).not.toBe('high');
  });
});
