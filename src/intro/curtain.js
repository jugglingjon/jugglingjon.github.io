// The curtain (in index.html, so the page is dark from the very first paint)
// holds the room back until it's ready: the models in, which would otherwise
// swap in over their stand-ins, the shaders compiled and a frame drawn. `cap`
// (ms from page load) bounds the wait, so a slow connection still gets in,
// with the stand-ins. Then the room fades up. Resolves once it has.

export const CURTAIN = { cap: 3000, fade: 1.2, reducedFade: 0.3 }; // ms; seconds

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const frames = (n) => new Promise((resolve) => {
  const tick = () => (--n <= 0 ? resolve() : requestAnimationFrame(tick));
  requestAnimationFrame(tick);
});

export async function liftCurtain(el, { loads = [], renderer, scene, camera, cap = CURTAIN.cap, reducedMotion = false }) {
  await Promise.race([Promise.allSettled(loads), wait(Math.max(0, cap - performance.now()))]);
  try {
    await renderer?.compileAsync?.(scene, camera); // compile every shader now, not mid-fade
  } catch {
    // Compiling ahead is only a nicety; the first frames compile anyway.
  }
  await frames(2);
  if (!el) return;
  el.classList.add('is-lifted');
  await wait(1000 * (reducedMotion ? CURTAIN.reducedFade : CURTAIN.fade));
  el.hidden = true;
}
