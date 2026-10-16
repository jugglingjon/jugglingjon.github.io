import { gsap } from 'gsap';

// Transitions animate the shared `fx` object; SignalPass and ScreenMaterial layer
// fx on top of the tuned params every frame. Phase 2 grows the channel change
// into a full ChannelManager (audio, remote LED, input queueing).

let channelTimeline = null;

export function channelChange(fx, onSwap) {
  // Pressing again mid-change means the viewer is surfing: stay in the snow,
  // swap straight away, and only lock the new picture once they pause.
  const surfing = channelTimeline?.isActive() ?? false;
  channelTimeline?.kill();

  const rough = Math.random() < 0.2 ? 1.5 : 1;
  const dir = Math.random() < 0.5 ? -1 : 1;
  const len = gsap.utils.random(0.85, 1.15);
  const tl = gsap.timeline();
  let swapAt;
  let acquireAt;

  if (surfing) {
    tl.to(fx, { snow: 1, hsync: 0.8, duration: 0.05 }, 0);
    swapAt = 0.05;
    acquireAt = 0.3;
  } else {
    // Sync loss: tearing, a brightness dip, and the picture starting to roll.
    tl.to(fx, { hsync: 0.9 * rough, brightness: -0.18, duration: 0.1 * len, ease: 'power1.in' }, 0.06)
      .to(fx, { roll: fx.roll + dir * 0.3, duration: 0.14 * len, ease: 'power2.in' }, 0.06)
      .to(fx, { snow: 1, duration: 0.05 }, 0.16 * len);
    swapAt = 0.2 * len;
    acquireAt = 0.32 * len;
  }

  tl.call(() => {
    fx.chroma = 0;
    onSwap();
  }, null, swapAt);

  // Acquire: the new picture rolls in on a damped spring, colour locks in late.
  tl.set(fx, { roll: dir * gsap.utils.random(0.35, 0.7) }, acquireAt)
    .to(fx, { snow: 0, duration: 0.16, ease: 'power1.out' }, acquireAt)
    .to(fx, { roll: 0, duration: 0.5 * len * rough, ease: 'elastic.out(1, 0.45)' }, acquireAt)
    .to(fx, { hsync: 0, brightness: 0, duration: 0.45 * len, ease: 'power2.out' }, acquireAt + 0.03)
    .to(fx, { chroma: 1, duration: 0.08 }, acquireAt + 0.22 * len);

  channelTimeline = tl;
  return tl;
}

export function powerOn(fx) {
  gsap.killTweensOf(fx, 'power,afterglow,degauss');
  fx.afterglow = 0;
  // Line → full raster → slow warm-up, with the degauss coil wobbling the colours.
  return gsap.timeline()
    .to(fx, { power: 1, duration: 1.6, ease: 'power2.out' }, 0)
    .fromTo(fx, { degauss: 1 }, { degauss: 0, duration: 1.4, ease: 'power2.out' }, 0.35);
}

export function powerOff(fx) {
  gsap.killTweensOf(fx, 'power,afterglow,degauss');
  // Collapse to a line, then a dot that lingers on the phosphor.
  return gsap.timeline()
    .to(fx, { power: 0, degauss: 0, duration: 0.45, ease: 'power3.in' })
    .set(fx, { afterglow: 1 })
    .to(fx, { afterglow: 0, duration: 1.8, ease: 'power2.out' });
}

export function degauss(fx) {
  return gsap.fromTo(fx, { degauss: 1 }, { degauss: 0, duration: 1.5, ease: 'power3.out' });
}
