import { gsap } from 'gsap';

// What the picture does while the set changes state. Television decides *when*
// each stage runs; these decide *what it looks like*. Each returns a GSAP
// timeline animating the shared `fx` object, which SignalPass and
// ScreenMaterial layer on top of the tuned params every frame.

const CALM = { roll: 0, hsync: 0, snow: 0, brightness: 0, chroma: 1 };

// Sync loss: tearing, a brightness dip, the picture starting to roll, then snow.
export function loseSignal(fx, { rough = 1, dir = 1, reducedMotion = false } = {}) {
  const tl = gsap.timeline();
  if (reducedMotion) return tl.to(fx, { snow: 1, duration: 0.06 });
  return tl
    .to(fx, { hsync: 0.9 * rough, brightness: -0.18, duration: 0.1, ease: 'power1.in' }, 0)
    .to(fx, { roll: fx.roll + dir * 0.3, duration: 0.14, ease: 'power2.in' }, 0)
    .to(fx, { snow: 1, duration: 0.05 }, 0.1);
}

// Already between stations (surfing, or leaving a dead channel): snow straight back up.
export function rejoinSearch(fx, { reducedMotion = false } = {}) {
  return gsap.timeline().to(fx, { snow: 1, hsync: reducedMotion ? 0 : 0.8, duration: 0.05 });
}

// Lock on: the picture rolls in on a damped spring, sync settles, colour last.
export function acquireSignal(fx, { rough = 1, dir = 1, reducedMotion = false } = {}) {
  const tl = gsap.timeline();
  if (reducedMotion) {
    return tl.set(fx, { roll: 0, hsync: 0, brightness: 0, chroma: 1 }).to(fx, { snow: 0, duration: 0.12 });
  }
  const len = gsap.utils.random(0.85, 1.15);
  return tl
    .set(fx, { roll: dir * gsap.utils.random(0.35, 0.7), chroma: 0 }, 0)
    .to(fx, { snow: 0, duration: 0.16, ease: 'power1.out' }, 0)
    .to(fx, { roll: 0, duration: 0.5 * len * rough, ease: 'elastic.out(1, 0.45)' }, 0)
    .to(fx, { hsync: 0, brightness: 0, duration: 0.45 * len, ease: 'power2.out' }, 0.03)
    .to(fx, { chroma: 1, duration: 0.08 }, 0.22 * len);
}

// Nothing broadcasting here: settle into snow with weak sync and no colour.
export function deadAir(fx, { reducedMotion = false } = {}) {
  return gsap.timeline().to(fx, {
    snow: 0.94,
    hsync: reducedMotion ? 0 : 0.25,
    roll: 0,
    brightness: 0,
    chroma: 0,
    duration: 0.2,
  });
}

// Snap every tuner effect back to a clean picture.
export function calm(fx) {
  gsap.killTweensOf(fx, Object.keys(CALM).join(','));
  Object.assign(fx, CALM);
}

export function powerOn(fx) {
  gsap.killTweensOf(fx, 'power,afterglow,degauss');
  fx.afterglow = 0;
  // Line → full raster → slow warm-up, with the degauss coil wobbling the colours.
  return gsap
    .timeline()
    .to(fx, { power: 1, duration: 1.6, ease: 'power2.out' }, 0)
    .fromTo(fx, { degauss: 1 }, { degauss: 0, duration: 1.4, ease: 'power2.out' }, 0.35);
}

export function powerOff(fx) {
  gsap.killTweensOf(fx, 'power,afterglow,degauss');
  // Collapse to a line, then a dot that lingers on the phosphor.
  return gsap
    .timeline()
    .to(fx, { power: 0, degauss: 0, duration: 0.45, ease: 'power3.in' })
    .set(fx, { afterglow: 1 })
    .to(fx, { afterglow: 0, duration: 1.8, ease: 'power2.out' });
}

export function degauss(fx) {
  return gsap.fromTo(fx, { degauss: 1 }, { degauss: 0, duration: 1.5, ease: 'power3.out' });
}
