import { describe, expect, it } from 'vitest';
import { glowResponse } from './TVGlow.js';

describe('glowResponse', () => {
  it('leaves dark pictures close to linear', () => {
    expect(glowResponse(0.065) / (0.065 * 0.18)).toBeGreaterThan(0.8);
  });

  it('keeps a white screen to a few times a dark one, not ten', () => {
    const ratio = glowResponse(0.7) / glowResponse(0.065);
    expect(ratio).toBeGreaterThan(2);
    expect(ratio).toBeLessThan(4);
  });

  it('only ever gets brighter as the picture does', () => {
    let last = -1;
    for (let l = 0; l <= 1; l += 0.05) {
      expect(glowResponse(l)).toBeGreaterThan(last);
      last = glowResponse(l);
    }
  });
});
