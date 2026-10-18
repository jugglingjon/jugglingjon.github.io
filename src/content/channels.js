import * as THREE from 'three';
import { mediaUrl } from './media.js';

// What plays on each project's channel, built from its `tv` entry (see
// content/projects.js). Stills, slideshows and scrolling pages are drawn into
// a 4:3 frame, so the set sees every channel the same shape; video plays
// as it is. Media loads the first time you tune in (or when warm() gets to
// it), with a PLEASE STAND BY card meanwhile. A channel "airs" on the clock,
// like the real thing: tune away and back and the show has moved on.
//
// Each returns a source as the TV expects one (see src/lab/sources.js), plus
// the project it came from, its listings blurb and its music.

export const FRAME = { width: 1280, height: 960 };
export const BROWSER = { width: 1024, height: 768, bar: 44 };
const SCROLL_SPEED = 120; // page pixels a second
const HOLD = 2.5; // seconds at the top and the bottom of a page
const STEP = 5; // seconds a screen, stepping down a page with reduced motion
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

// Where to draw an image of `iw` × `ih` into `w` × `h`: `cover` crops round
// `focus` ([x, y], 0–1), `contain` fits it all in, letterboxed.
export function fitRect(iw, ih, w, h, fit = 'cover', focus = [0.5, 0.5]) {
  const scale = fit === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  if (fit === 'contain') return { sx: 0, sy: 0, sw: iw, sh: ih, dx: (w - dw) / 2, dy: (h - dh) / 2, dw, dh };
  const sw = w / scale;
  const sh = h / scale;
  return { sx: (iw - sw) * focus[0], sy: (ih - sh) * focus[1], sw, sh, dx: 0, dy: 0, dw: w, dh: h };
}

// The page's position (0 top … 1 bottom) at `time`: hold at the top, scroll
// down, hold, scroll back up, like someone showing a site. With reduced
// motion, step down a screen at a time instead.
export function scrollAt(time, travel, { reducedMotion = false, screen = 1 } = {}) {
  if (travel <= 0) return 0;
  if (reducedMotion) {
    const screens = Math.ceil(travel / screen) + 1;
    return Math.min(1, (Math.floor(time / STEP) % screens) * (screen / travel));
  }
  const move = travel / SCROLL_SPEED;
  const cycle = (HOLD + move) * 2;
  const t = time % cycle;
  const ease = (u) => u * u * (3 - 2 * u);
  if (t < HOLD) return 0;
  if (t < HOLD + move) return ease((t - HOLD) / move);
  if (t < HOLD * 2 + move) return 1;
  return 1 - ease((t - HOLD * 2 - move) / move);
}

// The slide on air at `time`.
export const slideAt = (time, count, seconds = 5) => Math.floor(time / seconds) % count;

function loadImage(url) {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = url;
  return image.decode().then(() => image);
}

function canvas(width, height) {
  const el = document.createElement('canvas');
  el.width = width;
  el.height = height;
  return [el, el.getContext('2d')];
}

// The card that's up while a channel's media loads (or if it can't).
function standBy(ctx, w, h, name, line = 'PLEASE STAND BY') {
  ctx.fillStyle = '#0d1a6b';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f2ede4';
  ctx.textAlign = 'center';
  ctx.font = `900 ${h * 0.09}px ${SANS}`;
  ctx.fillText(line, w / 2, h * 0.52);
  ctx.font = `700 ${h * 0.045}px ${SANS}`;
  ctx.fillText(name.toUpperCase(), w / 2, h * 0.64);
  ctx.textAlign = 'left';
}

function drawFitted(ctx, image, w, h, fit, focus) {
  const r = fitRect(image.naturalWidth, image.naturalHeight, w, h, fit, focus);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(image, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh);
}

// A channel drawn into a canvas: starts on the stand-by card.
function framed(project, width, height, base) {
  const [el, ctx] = canvas(width, height);
  standBy(ctx, width, height, project.name);
  const texture = new THREE.CanvasTexture(el);
  return {
    ctx,
    source: {
      name: project.name,
      texture,
      width,
      height,
      project,
      blurb: project.blurb,
      music: project.music && mediaUrl(project, project.music, base),
    },
  };
}

// Load once, on first use; a failed load leaves a card up saying so.
function lazily(source, ctx, width, height, load) {
  let loading = null;
  source.warm = () => {
    loading ??= load().catch((error) => {
      console.warn(`Couldn't load the media for ${source.name}.`, error);
      standBy(ctx, width, height, source.name, 'NO SIGNAL');
      source.texture.needsUpdate = true;
    });
    return loading;
  };
}

function imageChannel(project, base) {
  const { tv } = project;
  const { width, height } = FRAME;
  const { ctx, source } = framed(project, width, height, base);
  lazily(source, ctx, width, height, async () => {
    drawFitted(ctx, await loadImage(mediaUrl(project, tv.src, base)), width, height, tv.fit, tv.focus);
    source.texture.needsUpdate = true;
  });
  source.activate = source.warm;
  return source;
}

function slideshowChannel(project, base, settings) {
  const { tv } = project;
  const { width, height } = FRAME;
  const { ctx, source } = framed(project, width, height, base);
  let slides = null;
  let shown = -1;
  lazily(source, ctx, width, height, async () => {
    slides = await Promise.all(tv.slides.map((src) => loadImage(mediaUrl(project, src, base))));
  });
  source.activate = source.warm;
  source.update = (time) => {
    if (!slides) return;
    // With reduced motion, slides change half as often.
    const index = slideAt(time, slides.length, (tv.seconds ?? 5) * (settings.reducedMotion ? 2 : 1));
    if (index === shown) return;
    shown = index;
    drawFitted(ctx, slides[index], width, height, tv.fit, tv.focus);
    source.texture.needsUpdate = true;
  };
  return source;
}

// A tall full-page capture, shown in a browser window and scrolled.
function scrollChannel(project, base, settings) {
  const { tv } = project;
  const { width, height, bar } = BROWSER;
  const { ctx, source } = framed(project, width, height, base);
  const address = tv.url ?? project.links?.live?.replace(/^https?:\/\//, '') ?? '';
  let page = null;
  let last = -1;
  lazily(source, ctx, width, height, async () => {
    page = await loadImage(mediaUrl(project, tv.src, base));
  });
  source.activate = source.warm;
  source.update = (time) => {
    if (!page) return;
    const scale = width / page.naturalWidth;
    const view = (height - bar) / scale; // page pixels in view
    const travel = page.naturalHeight - view;
    const top = Math.round(scrollAt(time, travel, { reducedMotion: settings.reducedMotion, screen: view }) * Math.max(0, travel));
    if (top === last) return;
    last = top;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, bar, width, height - bar);
    ctx.drawImage(page, 0, top, page.naturalWidth, Math.min(view, page.naturalHeight), 0, bar, width, Math.min(view, page.naturalHeight) * scale);
    // The browser's title bar: traffic lights and the address.
    ctx.fillStyle = '#dcdcdc';
    ctx.fillRect(0, 0, width, bar);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(22 + i * 20, bar / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(300, 10, 424, 24, 12);
    ctx.fill();
    ctx.fillStyle = '#555';
    ctx.font = `13px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(address, width / 2, 27);
    ctx.textAlign = 'left';
    source.texture.needsUpdate = true;
  };
  return source;
}

// A video loop, with its poster up until it plays (and instead of it, with
// reduced motion).
function videoChannel(project, base, settings) {
  const { tv } = project;
  const { width, height } = FRAME;
  const { ctx, source } = framed(project, width, height, base);
  const poster = source.texture;
  const video = document.createElement('video');
  Object.assign(video, { muted: true, loop: true, playsInline: true, crossOrigin: 'anonymous', preload: 'none' });
  for (const src of [tv.src].flat()) {
    const el = document.createElement('source');
    el.src = mediaUrl(project, src, base);
    video.append(el);
  }
  const moving = new THREE.VideoTexture(video);
  const airOffset = Math.random() * 1000;
  Object.assign(source, { video, fit: tv.fit, focus: tv.focus });
  lazily(source, ctx, width, height, async () => {
    if (!tv.poster) return;
    drawFitted(ctx, await loadImage(mediaUrl(project, tv.poster, base)), width, height, 'cover');
    poster.needsUpdate = true;
  });
  const show = (texture, w, h) => {
    Object.assign(source, { texture, width: w, height: h });
    source.onResize?.();
  };
  video.addEventListener('playing', () => {
    if (!settings.reducedMotion) show(moving, video.videoWidth, video.videoHeight);
  });
  source.activate = () => {
    source.warm();
    if (settings.reducedMotion) return;
    video.preload = 'auto';
    const play = () => {
      if (Number.isFinite(video.duration)) video.currentTime = (performance.now() / 1000 + airOffset) % video.duration;
      video.play().catch(() => {});
    };
    if (video.readyState >= 1) return play();
    video.addEventListener('loadedmetadata', play, { once: true });
    video.load();
  };
  source.deactivate = () => {
    video.pause();
    show(poster, width, height);
  };
  return source;
}

const BUILDERS = { image: imageChannel, slideshow: slideshowChannel, scroll: scrollChannel, video: videoChannel };

// One source per project, in order. `settings.reducedMotion` is read live.
export function projectChannels(projects, { base = './', settings = { reducedMotion: false } } = {}) {
  return projects.map((project) => {
    const build = BUILDERS[project.tv?.type];
    if (!build) throw new Error(`${project.slug}: unknown tv type "${project.tv?.type}"`);
    return build(project, base, settings);
  });
}
