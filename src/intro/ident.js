import * as THREE from 'three';
import { FRAME } from '../content/channels.js';
import { SIGNAL_WIDTH } from '../screen/SignalPass.js';
import { seededRandom } from '../world/textures.js';

// The station ident the set comes on to, once a visit: JONATHAN CRONIN in 80s
// chrome over a starfield and a neon grid rolling towards you, a neon triangle
// drawing itself behind, and "Interactive Portfolio" flickering on in neon
// script underneath. It's drawn on a canvas like the test cards, so the TV
// gives it its scanlines, glow and curved glass.

export const IDENT = {
  name: 'JONATHAN CRONIN',
  tagline: 'Interactive Portfolio',
  seconds: 5.5, // on air before the set switches itself off
};

// The fonts (public/fonts, both SIL Open Font License).
const CHROME_FONT = { family: 'Exo 2', file: 'exo2-black-italic.woff2', style: 'italic', weight: '900' };
const NEON_FONT = { family: 'Mr Dafoe', file: 'mr-dafoe.woff2', style: 'normal', weight: '400' };

// When things happen, in seconds from the start: [from, to].
export const BEATS = {
  glow: [0, 1.2], // the horizon glow, stars and grid come up
  triangle: [0.3, 1.5], // the neon triangle draws itself
  zoom: [0.9, 1.75], // the name flies in from the distance
  flash: [1.75, 2.05], // and lands with a flash
  glint: [2.05, 2.85], // a glint runs across the chrome
  neon: [2.5, 3.1], // the script flickers on
};

// The neon's flicker as it strikes: [seconds after it starts, lit].
const STRIKE = [
  [0, true],
  [0.05, false],
  [0.11, true],
  [0.16, false],
  [0.3, true],
  [0.35, false],
  [0.48, true],
];

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const progress = (t, [from, to]) => clamp01((t - from) / (to - from));
const easeOut = (t) => 1 - (1 - t) ** 3;

// Whether the neon is lit at `t`, and how bright: struck on with a stutter,
// then a faint hum, with a rare dip.
function neonAt(t) {
  const s = t - BEATS.neon[0];
  if (s < 0) return 0;
  let lit = false;
  for (const [at, on] of STRIKE) if (s >= at) lit = on;
  if (!lit) return 0;
  const tick = Math.floor(t * 14);
  const dip = Math.sin(tick * 12.9898) * 43758.5453;
  return dip - Math.floor(dip) > 0.96 ? 0.6 : 1;
}

// Everything the ident shows at `t` seconds. With reduced motion it's the
// finished card, holding still.
export function identState(t, reducedMotion = false) {
  if (reducedMotion) return { glow: 1, triangle: 1, scale: 1, alpha: 1, ghosts: false, flash: 0, glint: null, neon: 1, grid: 0 };
  const zoom = progress(t, BEATS.zoom);
  const glint = progress(t, BEATS.glint);
  return {
    glow: easeOut(progress(t, BEATS.glow)),
    triangle: easeOut(progress(t, BEATS.triangle)),
    scale: 0.05 + 0.95 * easeOut(zoom),
    alpha: clamp01(zoom * 4),
    ghosts: zoom > 0 && zoom < 1, // motion trails while it's flying in
    flash: t >= BEATS.flash[0] ? 1 - progress(t, BEATS.flash) : 0,
    glint: glint > 0 && glint < 1 ? glint : null,
    neon: neonAt(t),
    grid: t * 0.7, // grid lines rolled towards you
  };
}

// Load the fonts (from `base`, the site's base URL) so the canvas can use them.
export function loadIdentFonts(base) {
  if (typeof FontFace === 'undefined') return Promise.resolve();
  return Promise.all(
    [CHROME_FONT, NEON_FONT].map((f) => {
      const face = new FontFace(f.family, `url(${base}fonts/${f.file})`, { style: f.style, weight: f.weight });
      document.fonts.add(face);
      return face.load();
    }),
  ).catch((err) => console.warn("Couldn't load the ident's fonts; it'll use fallbacks.", err));
}

// Laid out at the channels' size (FRAME, 1280 × 960), but drawn at the 640 ×
// 480 the TV shows every channel at (SignalPass): a quarter of the pixels to
// fill and upload, for the same picture. Blurs don't scale with the canvas,
// so they're scaled by hand (blur). Redrawn at a broadcast's 30 frames a
// second, not every frame; and what doesn't change (the sky, the grid's
// lines, the finished triangle) is drawn once and laid in.
const W = FRAME.width;
const H = FRAME.height;
const SCALE = SIGNAL_WIDTH / W;
const FPS = 30;
const blur = (px) => px * SCALE;
const HORIZON = H * 0.62;
const NAME_Y = H * 0.45; // the name's baseline
const NEON_Y = H * 0.58;
const fontOf = (f, px) => `${f.style} ${f.weight} ${px}px "${f.family}", sans-serif`;

function layer(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext('2d')];
}

// The name in chrome: a deep extrusion, a dark outline, a sky-to-sunset face
// with a hard horizon through the middle, and a bright edge. Drawn once.
function chromeName() {
  const [measure, m] = layer(1, 1);
  m.font = fontOf(CHROME_FONT, 100);
  const px = Math.round((100 * W * 0.78) / m.measureText(IDENT.name).width);
  const [canvas, ctx] = layer(W, Math.round(px * 1.8));
  const x = W / 2;
  const y = Math.round(px * 1.2);
  ctx.font = fontOf(CHROME_FONT, px);
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  const top = y - ctx.measureText(IDENT.name).actualBoundingBoxAscent;

  for (let i = 12; i > 0; i--) {
    ctx.fillStyle = `rgb(${26 + i * 3}, ${8 + i}, ${48 + i * 4})`;
    ctx.fillText(IDENT.name, x + i * 0.5, y + i * 0.9);
  }
  ctx.lineWidth = px * 0.09;
  ctx.strokeStyle = '#140726';
  ctx.strokeText(IDENT.name, x, y);

  const face = ctx.createLinearGradient(0, top, 0, y);
  face.addColorStop(0, '#f4fbff');
  face.addColorStop(0.28, '#7cc8ff');
  face.addColorStop(0.49, '#e9f7ff');
  face.addColorStop(0.5, '#25123f');
  face.addColorStop(0.58, '#55247f');
  face.addColorStop(0.82, '#df66d4');
  face.addColorStop(1, '#ffd8f3');
  ctx.fillStyle = face;
  ctx.fillText(IDENT.name, x, y);
  ctx.lineWidth = Math.max(1.5, px * 0.018);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.strokeText(IDENT.name, x, y);
  measure.width = 0;
  // And with its purple glow baked in, for the frames without the landing
  // flash; and the flash's white burst of glow, laid in as it flares.
  const [glowing, g] = layer(canvas.width, canvas.height);
  g.shadowColor = 'rgba(180, 110, 255, 0.55)';
  g.shadowBlur = 30;
  g.drawImage(canvas, 0, 0);
  const [burst, b] = layer(canvas.width, canvas.height);
  b.shadowColor = '#ffffff';
  b.shadowBlur = 60;
  b.drawImage(canvas, 0, 0);
  return { canvas, glowing, burst, y, ascent: y - top };
}

// The tagline as a neon sign, lit and unlit (the dark tube shows when it's off).
function neonTagline() {
  const [measure, m] = layer(1, 1);
  m.font = fontOf(NEON_FONT, 100);
  const px = Math.round((100 * W * 0.56) / m.measureText(IDENT.tagline).width);
  const [lit, l] = layer(W, Math.round(px * 2));
  const [unlit, u] = layer(W, Math.round(px * 2));
  const x = W / 2;
  const y = Math.round(px * 1.15);
  for (const c of [l, u]) {
    c.font = fontOf(NEON_FONT, px);
    c.textAlign = 'center';
    c.lineJoin = 'round';
  }
  u.fillStyle = 'rgba(110, 35, 100, 0.55)';
  u.fillText(IDENT.tagline, x, y);
  l.shadowColor = '#ff2bd6';
  for (const blur of [px * 0.45, px * 0.2]) {
    l.shadowBlur = blur;
    l.fillStyle = '#ff6fe2';
    l.fillText(IDENT.tagline, x, y);
  }
  l.shadowBlur = px * 0.06;
  l.shadowColor = '#ffffff';
  l.lineWidth = Math.max(1.5, px * 0.025);
  l.strokeStyle = '#fff2fc';
  l.strokeText(IDENT.tagline, x, y);
  measure.width = 0;
  return { lit, unlit, y };
}

function stars(rand) {
  return Array.from({ length: 260 }, () => ({
    x: rand() * W,
    y: rand() * HORIZON,
    r: rand() < 0.08 ? 1.6 : 0.8,
    speed: 0.6 + rand() * 2,
    phase: rand() * Math.PI * 2,
  }));
}

// A layer the size of the drawn picture, set up to draw in FRAME's units.
function scaledLayer() {
  const [canvas, ctx] = layer(W * SCALE, H * SCALE);
  ctx.scale(SCALE, SCALE);
  return [canvas, ctx];
}

// What doesn't change, drawn once at full strength (each frame lays it in as
// strongly as the ident has faded up): the sky's glow, the floor's lines to
// the vanishing point, and one glowing cross line to stamp across the floor.
const LINE = 40; // the cross line's strip, tall enough for its glow
function backdrop() {
  // A red-violet glow rising off the horizon, and a soft column of light.
  const [sky, k] = scaledLayer();
  k.save();
  k.translate(W / 2, HORIZON);
  k.scale(1.9, 0.62);
  const glow = k.createRadialGradient(0, 0, 0, 0, 0, 430);
  glow.addColorStop(0, 'rgba(255, 70, 120, 0.62)');
  glow.addColorStop(0.45, 'rgba(170, 30, 120, 0.3)');
  glow.addColorStop(1, 'rgba(60, 0, 60, 0)');
  k.fillStyle = glow;
  k.fillRect(-W, -H, W * 2, H * 2);
  k.restore();
  k.save();
  k.translate(W / 2, HORIZON);
  k.scale(0.32, 1.5);
  const beam = k.createRadialGradient(0, 0, 0, 0, 0, 420);
  beam.addColorStop(0, 'rgba(255, 90, 120, 0.26)');
  beam.addColorStop(1, 'rgba(255, 90, 120, 0)');
  k.fillStyle = beam;
  k.fillRect(-W * 2, -H, W * 4, H);
  k.restore();
  k.clearRect(0, HORIZON, W, H - HORIZON); // the floor covers it

  // The floor: lines running to a vanishing point on the horizon, fading out
  // into the distance.
  const [floor, f] = scaledLayer();
  f.beginPath();
  f.rect(0, HORIZON, W, H - HORIZON);
  f.clip();
  f.shadowColor = '#6b4bff';
  f.shadowBlur = blur(10);
  const fade = f.createLinearGradient(0, HORIZON, 0, H);
  fade.addColorStop(0, 'rgba(138, 107, 255, 0)');
  fade.addColorStop(0.3, 'rgba(138, 107, 255, 0.75)');
  fade.addColorStop(1, 'rgba(170, 140, 255, 1)');
  f.strokeStyle = fade;
  f.lineWidth = 2;
  for (let k = -16; k <= 16; k++) {
    f.beginPath();
    f.moveTo(W / 2, HORIZON);
    f.lineTo(W / 2 + k * 150, H + 40);
    f.stroke();
  }

  const [line, l] = layer(W * SCALE, LINE * SCALE);
  l.scale(SCALE, SCALE);
  l.shadowColor = '#6b4bff';
  l.shadowBlur = blur(10);
  l.strokeStyle = 'rgb(160, 130, 255)';
  l.lineWidth = 2;
  l.beginPath();
  l.moveTo(0, LINE / 2);
  l.lineTo(W, LINE / 2);
  l.stroke();
  return { sky, floor, line };
}

// How strong the floor's lines are at height y: none at the horizon, most of
// the way up a third of the way down, full at the bottom.
function floorFade(y) {
  const u = (y - HORIZON) / (H - HORIZON);
  return u < 0.3 ? (u / 0.3) * 0.75 : 0.75 + ((u - 0.3) / 0.7) * 0.25;
}

function drawSky(ctx, s, sky, time, back) {
  ctx.fillStyle = '#04010a';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8e4ff';
  for (const star of sky) {
    ctx.globalAlpha = s.glow * (0.35 + 0.65 * Math.abs(Math.sin(time * star.speed + star.phase)));
    ctx.fillRect(star.x, star.y, star.r * 2, star.r * 2);
  }
  ctx.globalAlpha = s.glow;
  ctx.drawImage(back.sky, 0, 0, W, H);
  ctx.globalAlpha = 1;
}

// The floor: lines running to a vanishing point on the horizon, and cross
// lines rolling towards you, fading out into the distance.
function drawGrid(ctx, s, back) {
  ctx.fillStyle = '#05010e';
  ctx.fillRect(0, HORIZON, W, H - HORIZON);
  ctx.globalAlpha = s.glow;
  ctx.drawImage(back.floor, 0, 0, W, H);
  const roll = s.grid % 1;
  for (let i = 0; i < 18; i++) {
    const z = i + 1 - roll;
    if (z <= 0.2) continue;
    const y = HORIZON + (H - HORIZON) / z;
    if (y > H + 2) continue;
    ctx.globalAlpha = s.glow * floorFade(y) * clamp01((y - HORIZON) / 70);
    ctx.drawImage(back.line, 0, y - LINE / 2, W, LINE);
  }
  ctx.globalAlpha = 1;
}

// An upside-down neon triangle behind the name, drawing itself in. Its lines
// break off around the name (`gap`, the name's band), so their glow doesn't
// bleed through the letters.
function drawTriangle(ctx, s, gap) {
  if (s.triangle <= 0) return;
  const pts = [
    [W * 0.2, H * 0.17],
    [W * 0.8, H * 0.17],
    [W * 0.5, H * 0.8],
  ];
  const side = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const length = side(pts[0], pts[1]) + side(pts[1], pts[2]) + side(pts[2], pts[0]);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.rect(0, gap.top, W, gap.bottom - gap.top);
  ctx.clip('evenodd');
  const stroke = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
  stroke.addColorStop(0, '#ff4fd8');
  stroke.addColorStop(1, '#4fd2ff');
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#b04fff';
  ctx.shadowBlur = blur(26);
  ctx.setLineDash([length * s.triangle, length]);
  ctx.beginPath();
  ctx.moveTo(...pts[0]);
  ctx.lineTo(...pts[1]);
  ctx.lineTo(...pts[2]);
  ctx.closePath();
  ctx.globalAlpha = 0.85;
  ctx.stroke();
  ctx.restore();
}

function drawName(ctx, s, name, glint) {
  if (s.alpha <= 0) return;
  const at = (image, scale, alpha) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, NAME_Y);
    ctx.scale(scale, scale);
    ctx.drawImage(image, -W / 2, -name.y);
    ctx.restore();
  };
  if (s.ghosts) [0.35, 0.2, 0.1].forEach((a, i) => at(name.canvas, s.scale * (1 - 0.1 * (i + 1)), s.alpha * a));
  if (s.flash > 0) {
    // Landing: a white burst of glow round it.
    at(name.burst, s.scale, s.alpha * s.flash);
    at(name.canvas, s.scale, s.alpha);
  } else at(name.glowing, s.scale, s.alpha);

  if (s.glint !== null) {
    // A bright band, sloped, swept across the chrome and clipped to it (on
    // a scratch layer at the size it's drawn, half the lettering's).
    const { width, height } = name.canvas;
    const g = glint.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, glint.width, glint.height);
    g.globalCompositeOperation = 'source-over';
    g.drawImage(name.canvas, 0, 0, glint.width, glint.height);
    g.globalCompositeOperation = 'source-in';
    const x = -W * 0.2 + s.glint * W * 1.4;
    const band = g.createLinearGradient(x - 70, 0, x + 70, 0);
    band.addColorStop(0, 'rgba(255, 255, 255, 0)');
    band.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
    band.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = band;
    g.setTransform(SCALE, 0, -0.5 * SCALE, SCALE, height * 0.25 * SCALE, 0);
    g.fillRect(0, 0, width * 2, height);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(glint, 0, NAME_Y - name.y, width, height);
    ctx.restore();
  }
}

function drawNeon(ctx, s, neon) {
  ctx.save();
  ctx.translate(W / 2, NEON_Y);
  ctx.rotate(-0.06);
  ctx.globalAlpha = s.glow; // the dark tube shows as the room behind it lights up
  ctx.drawImage(neon.unlit, -W / 2, -neon.y);
  if (s.neon > 0) {
    ctx.globalAlpha = s.neon;
    ctx.drawImage(neon.lit, -W / 2, -neon.y);
  }
  ctx.restore();
}

// The ident as a source the TV can show (see src/lab/sources.js). Its clock
// starts when it comes on screen.
export function createIdent({ reducedMotion = false } = {}) {
  const [canvas, ctx] = scaledLayer();
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false; // the TV shows it at its own size: no smaller copies (rebuilt each upload)
  texture.minFilter = THREE.LinearFilter;
  const sky = stars(seededRandom(19));
  let art = null; // the name and tagline, drawn once the fonts are in
  let back = null; // what doesn't change (backdrop)
  let triangle = null; // the triangle, once it's drawn itself in
  let start = null;
  let drawnAt = null;

  function draw(s, time) {
    if (!art) {
      const name = chromeName();
      art = { name, neon: neonTagline(), glint: layer(name.canvas.width * SCALE, name.canvas.height * SCALE)[0] };
    }
    back ??= backdrop();
    const gap = { top: NAME_Y - art.name.ascent - 26, bottom: NAME_Y + 34 };
    drawSky(ctx, s, sky, time, back);
    drawGrid(ctx, s, back);
    if (s.triangle < 1) drawTriangle(ctx, s, gap);
    else {
      if (!triangle) {
        const [done, t] = scaledLayer();
        drawTriangle(t, s, gap);
        triangle = done;
      }
      ctx.drawImage(triangle, 0, 0, W, H);
    }
    drawName(ctx, s, art.name, art.glint);
    drawNeon(ctx, s, art.neon);
    if (s.flash > 0) {
      ctx.fillStyle = `rgba(255, 240, 255, ${0.22 * s.flash})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  return {
    name: 'Station ident',
    texture,
    width: W,
    height: H,
    // Make and draw everything once, ahead of time (behind the loading
    // curtain, once the fonts are in), so the first frames on air don't stall.
    prepare() {
      for (const t of [1.9, 2.4, 4]) draw(identState(t, reducedMotion), t);
    },
    activate() {
      start = null;
      drawnAt = null;
    },
    update(time) {
      start ??= time;
      // A broadcast's frame rate; and with reduced motion it's a still.
      if (drawnAt !== null && (reducedMotion || time - drawnAt < 1 / FPS - 1e-6)) return;
      drawnAt = time;
      draw(identState(time - start, reducedMotion), reducedMotion ? 0 : time - start);
      texture.needsUpdate = true;
    },
  };
}
