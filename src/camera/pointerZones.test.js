import { describe, expect, it } from 'vitest';
import { locatePointer, remoteArea } from './pointerZones.js';

describe('pointer zones', () => {
  const W = 1600;
  const H = 1000;
  const at = (x, y) => locatePointer(x, y, W, H, 0.7);

  it('puts a centred square, 70% of the height, in the middle', () => {
    expect(remoteArea(W, H, 0.7)).toEqual({ left: 450, top: 150, width: 700, height: 700 });
  });

  it('narrows it to a box, as tall as before', () => {
    expect(remoteArea(W, H, 0.7, 0.5)).toEqual({ left: 625, top: 150, width: 350, height: 700 });
  });

  it('stretches it to the right only, the left edge staying put', () => {
    expect(remoteArea(W, H, 0.7, 0.5, 0.14)).toEqual({ left: 625, top: 150, width: 448, height: 700 });
    expect(locatePointer(1073, 500, W, H, 0.7, 0.5, 0.14)).toMatchObject({ inside: true, u: 1 });
    expect(locatePointer(1074, 500, W, H, 0.7, 0.5, 0.14).inside).toBe(false);
  });

  it('raises the bottom edge only', () => {
    expect(remoteArea(W, H, 0.7, 0.5, 0.14, 0.2)).toEqual({ left: 625, top: 150, width: 448, height: 560 });
    const at = (y) => locatePointer(800, y, W, H, 0.7, 0.5, 0.14, 0.2);
    expect(at(150)).toMatchObject({ inside: true, v: 1 });
    expect(at(710)).toMatchObject({ inside: true, v: -1 });
    expect(at(711)).toMatchObject({ inside: false, lookX: 0 });
    expect(at(1000).lookY).toBe(-1); // looking down from the new edge to the screen's
  });

  it('keeps a stretched box on a narrow screen', () => {
    const area = remoteArea(300, 900, 0.7, 0.5, 0.14);
    expect(area.left).toBeGreaterThanOrEqual(0);
    expect(area.left + area.width).toBeCloseTo(300, 6);
  });

  it('caps it at the width on a tall screen, keeping its shape', () => {
    expect(remoteArea(400, 900, 0.7)).toMatchObject({ width: 400, height: 400 });
    expect(remoteArea(300, 900, 0.7, 0.5)).toMatchObject({ width: 300, height: 600 });
  });

  it('maps the narrow box corner to corner too', () => {
    const at = (x, y) => locatePointer(x, y, W, H, 0.7, 0.5);
    expect(at(625, 150)).toMatchObject({ inside: true, u: -1, v: 1 });
    expect(at(975, 850)).toMatchObject({ inside: true, u: 1, v: -1 });
    expect(at(600, 500)).toMatchObject({ inside: false, lookY: 0 });
    expect(at(600, 500).lookX).toBeCloseTo(-0.04, 2);
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
