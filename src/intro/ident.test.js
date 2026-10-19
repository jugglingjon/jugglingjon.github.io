import { describe, expect, it } from 'vitest';
import { BEATS, IDENT, identState } from './ident.js';

describe('identState', () => {
  it('starts dark and empty', () => {
    const s = identState(0);
    expect(s.glow).toBe(0);
    expect(s.triangle).toBe(0);
    expect(s.alpha).toBe(0);
    expect(s.neon).toBe(0);
    expect(s.glint).toBe(null);
  });

  it('flies the name in from the distance, trailing ghosts, and lands it with a flash', () => {
    const mid = identState((BEATS.zoom[0] + BEATS.zoom[1]) / 2);
    expect(mid.scale).toBeGreaterThan(0.05);
    expect(mid.scale).toBeLessThan(1);
    expect(mid.ghosts).toBe(true);
    const landed = identState(BEATS.zoom[1]);
    expect(landed.scale).toBe(1);
    expect(landed.ghosts).toBe(false);
    expect(identState(BEATS.flash[0]).flash).toBe(1);
    expect(identState(BEATS.flash[1]).flash).toBe(0);
  });

  it('runs a glint across the chrome once it has landed', () => {
    expect(identState(BEATS.glint[0] - 0.01).glint).toBe(null);
    const g = identState((BEATS.glint[0] + BEATS.glint[1]) / 2).glint;
    expect(g).toBeGreaterThan(0);
    expect(g).toBeLessThan(1);
    expect(identState(BEATS.glint[1] + 0.01).glint).toBe(null);
  });

  it('strikes the neon on with a stutter, then keeps it lit', () => {
    const lit = [];
    for (let t = BEATS.neon[0]; t < BEATS.neon[1]; t += 1 / 60) lit.push(identState(t).neon > 0);
    const switches = lit.filter((on, i) => i > 0 && on !== lit[i - 1]).length;
    expect(switches).toBeGreaterThanOrEqual(4);
    for (let t = BEATS.neon[1]; t < IDENT.seconds; t += 0.1) expect(identState(t).neon).toBeGreaterThan(0.5);
  });

  it('has everything in place well before it ends', () => {
    const last = Math.max(...Object.values(BEATS).map(([, to]) => to));
    expect(IDENT.seconds - last).toBeGreaterThanOrEqual(2.5); // time to take it in
    const s = identState(IDENT.seconds - 0.1);
    expect([s.glow, s.triangle, s.scale, s.alpha]).toEqual([1, 1, 1, 1]);
  });

  it('rolls the grid towards you', () => {
    expect(identState(2).grid).toBeGreaterThan(identState(1).grid);
  });

  it('holds the finished card still for reduced motion', () => {
    for (const t of [0, 1, 3, 6]) {
      expect(identState(t, true)).toEqual({ glow: 1, triangle: 1, scale: 1, alpha: 1, ghosts: false, flash: 0, glint: null, neon: 1, grid: 0 });
    }
  });
});
