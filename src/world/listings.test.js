import { describe, expect, it } from 'vitest';
import { HOW_TO_WATCH, PAGE, airTime, rowAt, rowLayout } from './listings.js';

describe('listings page', () => {
  const vAt = (y) => 1 - y / PAGE.height; // canvas y → texture v

  it('finds the row under a point, top to bottom', () => {
    const { top, rowHeight } = rowLayout(7);
    expect(rowAt(vAt(top + rowHeight * 0.5), 7)).toBe(0);
    expect(rowAt(vAt(top + rowHeight * 2.5), 7)).toBe(2);
    expect(rowAt(vAt(top + rowHeight * 6.9), 7)).toBe(6);
  });

  it('finds no row in the header, below the last listing, or off the page', () => {
    const { top, rowHeight } = rowLayout(7);
    expect(rowAt(vAt(top - 5), 7)).toBe(-1);
    expect(rowAt(vAt(top + rowHeight * 7 + 5), 7)).toBe(-1);
    expect(rowAt(1.2, 7)).toBe(-1);
  });

  it('squeezes the rows to fit a long lineup on the page', () => {
    const { top, rowHeight } = rowLayout(14);
    expect(rowHeight).toBeLessThan(PAGE.maxRow);
    expect(top + rowHeight * 14).toBeLessThanOrEqual(PAGE.height - PAGE.bottom + 1e-9);
  });

  it('runs the schedule from 7:00 in half hours', () => {
    expect([airTime(0), airTime(1), airTime(2), airTime(10)]).toEqual(['7:00', '7:30', '8:00', '12:00']);
  });
});

describe('how to watch', () => {
  it('says the same things by touch as with a mouse, in the same room on the page', () => {
    expect(HOW_TO_WATCH.touch).toHaveLength(HOW_TO_WATCH.pointer.length);
  });

  it("doesn't tell a touch screen to click or scroll", () => {
    for (const tip of HOW_TO_WATCH.touch) expect(tip).not.toMatch(/click|scroll|towards the edges/i);
  });
});
