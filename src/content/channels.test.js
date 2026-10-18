import { describe, expect, it } from 'vitest';
import { fitRect, scrollAt, slideAt } from './channels.js';

describe('fitRect', () => {
  it('covers a 4:3 frame with a wide image, cropping the sides round the focus', () => {
    const r = fitRect(1920, 1080, 1280, 960);
    expect(r).toMatchObject({ dx: 0, dy: 0, dw: 1280, dh: 960, sy: 0, sh: 1080 });
    expect(r.sw).toBeCloseTo(1440, 6);
    expect(r.sx).toBeCloseTo(240, 6); // centred
    expect(fitRect(1920, 1080, 1280, 960, 'cover', [0, 0.5]).sx).toBe(0); // left edge
  });

  it('fits a tall image inside it, letterboxed, with contain', () => {
    const r = fitRect(1000, 2000, 1280, 960, 'contain');
    expect(r).toMatchObject({ sx: 0, sy: 0, sw: 1000, sh: 2000, dy: 0, dh: 960, dw: 480 });
    expect(r.dx).toBe(400);
  });

  it('leaves a 4:3 image as it is', () => {
    expect(fitRect(1024, 768, 1280, 960)).toMatchObject({ sx: 0, sy: 0, sw: 1024, sh: 768, dw: 1280, dh: 960 });
  });
});

describe('scrollAt', () => {
  const travel = 1200; // 10 s at 120 px/s
  it('holds at the top, scrolls down, holds at the bottom, and comes back up', () => {
    expect(scrollAt(1, travel)).toBe(0);
    expect(scrollAt(2.5 + 5, travel)).toBeCloseTo(0.5, 6);
    expect(scrollAt(2.5 + 10 + 1, travel)).toBe(1);
    expect(scrollAt(2.5 + 10 + 2.5 + 5, travel)).toBeCloseTo(0.5, 6);
    expect(scrollAt(25 + 1, travel)).toBe(0); // round again: 2.5 s holds and 10 s each way
  });

  it('only ever moves down then up, smoothly', () => {
    let last = 0;
    for (let t = 0; t <= 12.5; t += 0.1) {
      const s = scrollAt(t, travel);
      expect(s).toBeGreaterThanOrEqual(last - 1e-9);
      expect(s - last).toBeLessThan(0.03);
      last = s;
    }
  });

  it('steps down a screen at a time with reduced motion', () => {
    const options = { reducedMotion: true, screen: 600 };
    expect([0, 5, 10, 15].map((t) => scrollAt(t + 0.1, travel, options))).toEqual([0, 0.5, 1, 0]);
  });

  it('stays put on a page shorter than the window', () => {
    expect(scrollAt(10, 0)).toBe(0);
  });
});

describe('slideAt', () => {
  it('moves to the next slide every few seconds, round and round', () => {
    expect([0, 4.9, 5, 10, 15, 16].map((t) => slideAt(t, 3, 5))).toEqual([0, 0, 1, 2, 0, 0]);
  });
});
