import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gsap } from 'gsap';
import { createFx } from '../screen/params.js';
import { Remote } from './Remote.js';
import { Television, VOLUME_STEPS } from './Television.js';

// Drive GSAP by hand so every test controls time exactly.
gsap.ticker.remove(gsap.updateRoot);
let clock = 0;
function advance(seconds) {
  const end = clock + seconds;
  while (clock < end - 1e-9) {
    clock = Math.min(end, clock + 1 / 60);
    gsap.updateRoot(clock);
  }
}

const LINEUP = [
  { number: 2, name: 'Two' },
  { number: 3, name: 'Three' },
  { number: 5, name: 'Five' },
];

function setup(options = {}) {
  const fx = createFx();
  const osd = { setChannel: vi.fn(), setCaption: vi.fn(), setVolume: vi.fn(), setMute: vi.fn(), clear: vi.fn() };
  const tv = new Television({ fx, osd, lineup: LINEUP, ...options });
  const events = [];
  for (const type of ['power', 'tune', 'swap', 'phase', 'relay', 'volume']) {
    tv.addEventListener(type, (e) => events.push({ type, ...e.detail }));
  }
  const of = (type) => events.filter((e) => e.type === type);
  return { fx, osd, tv, events, of };
}

function poweredOn(options) {
  const ctx = setup(options);
  ctx.tv.receive('power');
  advance(2);
  ctx.events.length = 0;
  vi.clearAllMocks();
  return ctx;
}

describe('power', () => {
  it('starts off and ignores everything but the power button', () => {
    const { tv, events } = setup();
    tv.receive('ch+');
    tv.receive('vol+');
    tv.receive('7');
    advance(2);
    expect(tv.phase).toBe('off');
    expect(tv.number).toBe(2);
    expect(events).toHaveLength(0);
  });

  it('powers on locked to the current channel, OSD after warm-up', () => {
    const { tv, fx, osd, of } = setup();
    tv.receive('power');
    expect(tv.phase).toBe('locked');
    expect(of('swap').map((e) => e.number)).toEqual([2]);
    expect(osd.setChannel).not.toHaveBeenCalled();
    advance(2);
    expect(fx.power).toBe(1);
    expect(osd.setChannel).toHaveBeenCalledWith(2);
    expect(osd.setCaption).toHaveBeenCalledWith('Two');
  });

  it('powering off mid-change cancels the tuner and calms the picture', () => {
    const { tv, fx, osd } = poweredOn();
    tv.receive('ch+');
    advance(0.12);
    expect(fx.snow).toBeGreaterThan(0);
    tv.receive('power');
    expect(tv.phase).toBe('off');
    expect(fx.snow).toBe(0);
    expect(osd.clear).toHaveBeenCalled();
    advance(3);
    expect(fx.power).toBe(0);
    expect(tv.phase).toBe('off');
  });
});

describe('tuning', () => {
  let ctx;
  beforeEach(() => {
    ctx = poweredOn();
  });

  it('changes channel through loss, snow and lock', () => {
    const { tv, fx, osd, of } = ctx;
    tv.receive('ch+');
    expect(tv.number).toBe(3);
    expect(osd.setChannel).toHaveBeenCalledWith(3);
    advance(0.18);
    expect(tv.phase).toBe('searching');
    expect(fx).toMatchObject({ snow: 1, chroma: 0 });
    advance(2);
    expect(of('phase').map((e) => e.phase)).toEqual(['losing', 'searching', 'acquiring', 'locked']);
    expect(fx).toMatchObject({ snow: 0, hsync: 0, roll: 0, chroma: 1, brightness: 0 });
    expect(osd.setCaption).toHaveBeenLastCalledWith('Three');
    expect(of('relay')).toHaveLength(1);
  });

  it('skips unprogrammed numbers and wraps around', () => {
    const { tv } = ctx;
    tv.receive('ch-');
    expect(tv.number).toBe(5);
    tv.receive('ch+');
    expect(tv.number).toBe(2);
    tv.receive('ch+');
    tv.receive('ch+');
    expect(tv.number).toBe(5);
  });

  it('coalesces fast surfing into a single lock on the final channel', () => {
    const { tv, of } = ctx;
    tv.receive('ch+'); // → 3, losing
    advance(0.05);
    tv.receive('ch+'); // → 5, still losing
    advance(0.2); // searching on 5
    tv.receive('ch+'); // → 2, swaps under the snow
    advance(0.1);
    expect(tv.phase).toBe('searching');
    advance(2);
    expect(tv.phase).toBe('locked');
    expect(tv.number).toBe(2);
    expect(of('swap').map((e) => e.number)).toEqual([5, 2]);
    expect(of('phase').filter((e) => e.phase === 'acquiring')).toHaveLength(1);
  });

  it('a press while the picture locks drops back into the snow', () => {
    const { tv, fx } = ctx;
    tv.receive('ch+');
    advance(0.3);
    expect(tv.phase).toBe('acquiring');
    tv.receive('ch+');
    advance(0.06);
    expect(fx.snow).toBe(1);
    advance(2);
    expect(tv.phase).toBe('locked');
    expect(tv.number).toBe(5);
  });

  it('number buttons tune straight away, 0 being channel 10', () => {
    const { tv, osd } = ctx;
    tv.receive('3');
    expect(tv.number).toBe(3);
    expect(tv.phase).toBe('losing');
    expect(osd.setChannel).toHaveBeenLastCalledWith(3);
    advance(2);
    expect(tv.phase).toBe('locked');
    tv.receive('0');
    expect(tv.number).toBe(10);
  });

  it('number presses while changing surf like CH ▲/▼', () => {
    const { tv, of } = ctx;
    tv.receive('3');
    advance(0.05);
    tv.receive('5');
    advance(2);
    expect(tv.number).toBe(5);
    expect(tv.phase).toBe('locked');
    expect(of('phase').filter((e) => e.phase === 'acquiring')).toHaveLength(1);
  });

  it('tunes an empty number to dead air, and CH ▲ leaves it', () => {
    const { tv, fx, of } = ctx;
    tv.receive('4');
    advance(2);
    expect(tv.phase).toBe('dead');
    expect(fx.snow).toBeCloseTo(0.94);
    expect(of('swap').at(-1)).toMatchObject({ number: 4, channel: null });
    tv.receive('ch+');
    advance(2);
    expect(tv.number).toBe(5);
    expect(tv.phase).toBe('locked');
    expect(fx.snow).toBe(0);
  });

  it('recall flips between the last two channels', () => {
    const { tv } = ctx;
    tv.receive('ch+');
    advance(2);
    tv.receive('recall');
    advance(2);
    expect(tv.number).toBe(2);
    tv.receive('recall');
    advance(2);
    expect(tv.number).toBe(3);
  });

  it('pressing the current channel only re-shows the OSD', () => {
    const { tv, osd, of } = ctx;
    tv.receive('2');
    expect(tv.phase).toBe('locked');
    expect(osd.setChannel).toHaveBeenLastCalledWith(2);
    expect(of('tune')).toHaveLength(0);
  });
});

describe('volume', () => {
  it('steps, clamps, mutes, and unmutes on a volume press', () => {
    const { tv, osd, of } = poweredOn();
    tv.receive('vol+');
    expect(tv.volume).toBe(9);
    expect(osd.setVolume).toHaveBeenLastCalledWith(9, VOLUME_STEPS);
    for (let i = 0; i < 30; i++) tv.receive('vol+');
    expect(tv.volume).toBe(VOLUME_STEPS);
    tv.receive('mute');
    expect(tv.muted).toBe(true);
    expect(osd.setMute).toHaveBeenLastCalledWith(true);
    tv.receive('vol-');
    expect(tv.muted).toBe(false);
    expect(tv.volume).toBe(VOLUME_STEPS - 1);
    expect(of('volume').at(-1)).toMatchObject({ level: VOLUME_STEPS - 1, muted: false });
  });
});

describe('reduced motion', () => {
  it('changes channel without roll or tearing', () => {
    const { tv, fx } = poweredOn({ reducedMotion: true });
    let roll = 0;
    let hsync = 0;
    tv.receive('ch+');
    for (let i = 0; i < 120; i++) {
      advance(1 / 60);
      roll = Math.max(roll, Math.abs(fx.roll));
      hsync = Math.max(hsync, fx.hsync);
    }
    expect(tv.phase).toBe('locked');
    expect(roll).toBe(0);
    expect(hsync).toBe(0);
  });
});

describe('remote', () => {
  it('blinks at once but the TV reacts after the IR latency', () => {
    const { tv } = setup();
    const remote = new Remote(tv, { latency: 0.06 });
    const presses = [];
    remote.addEventListener('press', (e) => presses.push(e.detail.button));
    remote.press('power');
    expect(presses).toEqual(['power']);
    expect(tv.on).toBe(false);
    advance(0.1);
    expect(tv.on).toBe(true);
  });

  it('ignores buttons it does not have', () => {
    const { tv } = setup();
    const remote = new Remote(tv);
    const presses = [];
    remote.addEventListener('press', (e) => presses.push(e.detail.button));
    remote.press('eject');
    advance(0.2);
    expect(presses).toEqual([]);
  });
});
