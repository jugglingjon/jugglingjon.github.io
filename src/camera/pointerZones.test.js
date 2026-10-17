import { describe, expect, it } from 'vitest';
import { locatePointer, remoteArea } from './pointerZones.js';

describe('pointer zones', () => {
  const W = 1600;
  const H = 1000;
  const at = (x, y) => locatePointer(x, y, W, H, 0.7);

  it('puts a centred square, 70% of the height, in the middle', () => {
    expect(remoteArea(W, H, 0.7)).toEqual({ left: 450, top: 150, side: 700 });
  });

  it('caps the square at the width on a tall screen', () => {
    expect(remoteArea(400, 900, 0.7).side).toBe(400);
  });

  it('works the remote inside the square, mapped corner to corner', () => {
    expect(at(800, 500)).toMatchObject({ inside: true, u: 0, v: 0, lookX: 0, lookY: 0 });
    expect(at(450, 150)).toMatchObject({ inside: true, u: -1, v: 1 });
    expect(at(1150, 850)).toMatchObject({ inside: true, u: 1, v: -1 });
  });

  it('looks around outside it, from nothing at the square to full at the screen edge', () => {
    expect(at(1151, 500)).toMatchObject({ inside: false, lookY: 0 });
    expect(at(1151, 500).lookX).toBeCloseTo(0, 2);
    expect(at(1600, 500).lookX).toBe(1);
    expect(at(225, 500).lookX).toBe(-0.5);
    expect(at(800, 0)).toMatchObject({ inside: false, lookX: 0, lookY: 1 });
    expect(at(800, 1000).lookY).toBe(-1);
  });

  it('looks diagonally from a corner', () => {
    const corner = at(1600, 0);
    expect(corner.lookX).toBe(1);
    expect(corner.lookY).toBe(1);
  });

  it('never divides by zero when the square fills the width', () => {
    const p = locatePointer(0, 450, 400, 900, 0.7);
    expect(p.inside).toBe(true);
    expect(p.lookX).toBe(0);
  });
});
