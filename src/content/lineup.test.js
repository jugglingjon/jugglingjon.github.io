import { describe, expect, it } from 'vitest';
import { channelNumbers, numberedProjects, slotOf } from './lineup.js';

describe('channelNumbers', () => {
  it('numbers a lineup in order from 1', () => {
    expect(channelNumbers([null, null, undefined])).toEqual([1, 2, 3]);
  });

  it('gives a show the number it asks for, and the rest the lowest numbers still free', () => {
    // Five projects, one on channel 8, then two test cards.
    expect(channelNumbers([null, null, null, null, null, 8, null, null])).toEqual([1, 2, 3, 4, 5, 8, 6, 7]);
    expect(channelNumbers([3, null, null, null])).toEqual([3, 1, 2, 4]);
  });
});

describe('numberedProjects', () => {
  it('puts your work in channel order, each with its number', () => {
    const a = { slug: 'a' };
    const b = { slug: 'b', channel: 2 };
    const c = { slug: 'c' };
    expect(numberedProjects([a, b, c])).toEqual([
      { project: a, number: 1 },
      { project: b, number: 2 },
      { project: c, number: 3 },
    ]);
    const d = { slug: 'd', channel: 1 };
    expect(numberedProjects([a, d]).map((e) => [e.project.slug, e.number])).toEqual([
      ['d', 1],
      ['a', 2],
    ]);
  });
});

describe('slotOf', () => {
  it('starts the evening with channel 1', () => {
    expect([slotOf(1), slotOf(8)]).toEqual([0, 7]);
  });
});
