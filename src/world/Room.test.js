import { describe, expect, it } from 'vitest';
import { lampLevel } from './Room.js';

describe('table lamp switch', () => {
  it('stays fully on, or fully off, once it has settled', () => {
    expect(lampLevel(true, Infinity)).toBe(1);
    expect(lampLevel(true, 0.2)).toBe(1);
    expect(lampLevel(false, 0.12)).toBe(0);
    expect(lampLevel(false, 5)).toBe(0);
  });

  it('catches with a stutter coming on', () => {
    expect(lampLevel(true, 0)).toBe(0);
    const dip = lampLevel(true, 0.07);
    expect(dip).toBeLessThan(lampLevel(true, 0.045));
    expect(dip).toBeLessThan(lampLevel(true, 0.1));
  });

  it('fades out going off', () => {
    expect(lampLevel(false, 0)).toBe(1);
    expect(lampLevel(false, 0.03)).toBeGreaterThan(lampLevel(false, 0.08));
  });
});
