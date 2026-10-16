import * as THREE from 'three';
import { SIGNAL_WIDTH, SIGNAL_HEIGHT } from './SignalPass.js';

// 5×7 bitmap font, one 5-bit row per entry (bit 4 = leftmost pixel).
const GLYPHS = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1c, 0x12, 0x11, 0x11, 0x11, 0x12, 0x1c],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x11, 0x0a, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  0: [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  1: [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  2: [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  3: [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  4: [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  5: [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  6: [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  7: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  8: [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  9: [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '-': [0, 0, 0, 0x1f, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  '·': [0, 0, 0, 0x0c, 0x0c, 0, 0],
  '/': [0, 0x01, 0x02, 0x04, 0x08, 0x10, 0],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  '?': [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  "'": [0x0c, 0x04, 0x08, 0, 0, 0, 0],
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
};

const OSD_GREEN = '#5dff6a';
// Keep text inside the title-safe area: the bezel and overscan crop the edges.
const SAFE_X = 84;
const SAFE_Y = 64;

const TIMED = ['channel', 'caption', 'volume'];

// The TV's own on-screen display, drawn into a transparent canvas the size of
// the signal: a green channel number (or a half-typed "CH 1-"), a closed-caption
// style lower third, a volume bar and a MUTE flag. Like a real set, elements
// pop on and off rather than fading; each has its own timer.
export class OSD {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = SIGNAL_WIDTH;
    this.canvas.height = SIGNAL_HEIGHT;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;

    this.layers = { channel: null, caption: null, volume: null, mute: false };
    this.timers = { channel: 0, caption: 0, volume: 0 };
    this.pinned = false;
    this.dirty = true;
  }

  // A number shows as "CH 05"; a string (number entry, "1-") shows as given.
  setChannel(label, hold = 3) {
    this.set('channel', typeof label === 'number' ? String(label).padStart(2, '0') : label, hold);
  }

  setCaption(text, hold = 3) {
    this.set('caption', text || null, hold);
  }

  setVolume(level, max, hold = 2) {
    this.set('volume', { level, max }, hold);
  }

  setMute(on) {
    this.layers.mute = on;
    this.dirty = true;
  }

  clear() {
    this.layers = { channel: null, caption: null, volume: null, mute: false };
    this.dirty = true;
  }

  set(layer, value, hold) {
    this.layers[layer] = value;
    this.timers[layer] = hold;
    this.dirty = true;
  }

  // Returns the OSD opacity for the signal pass.
  update(dt) {
    if (!this.pinned) {
      for (const layer of TIMED) {
        if (this.layers[layer] !== null && (this.timers[layer] -= dt) <= 0) {
          this.layers[layer] = null;
          this.dirty = true;
        }
      }
    }
    if (this.dirty) this.draw();
    return 1;
  }

  draw() {
    const { ctx, canvas, layers } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.dirty = false;

    if (layers.channel !== null) {
      const label = `CH ${layers.channel}`;
      drawText(ctx, label, canvas.width - SAFE_X - measure(label, 6), SAFE_Y, 6, OSD_GREEN, '#000');
    }

    if (layers.mute) drawText(ctx, 'MUTE', SAFE_X, SAFE_Y, 4, OSD_GREEN, '#000');

    const bottom = canvas.height - SAFE_Y - 37; // top of the bottom text line
    if (layers.volume) {
      // The bar takes the bottom line; the caption waits underneath it.
      const { level, max } = layers.volume;
      const barWidth = max * 12 - 4;
      const x = (canvas.width - (measure('VOLUME', 3) + 18 + barWidth)) / 2;
      drawText(ctx, 'VOLUME', x, bottom, 3, OSD_GREEN, '#000');
      const bx = x + measure('VOLUME', 3) + 18;
      for (let i = 0; i < max; i++) {
        const h = i < level ? 21 : 5;
        ctx.fillStyle = '#000';
        ctx.fillRect(bx + i * 12 - 2, bottom + 21 - h - 2, 12, h + 4);
        ctx.fillStyle = OSD_GREEN;
        ctx.fillRect(bx + i * 12, bottom + 21 - h, 8, h);
      }
    } else if (layers.caption) {
      const text = layers.caption.toUpperCase();
      const width = Math.min(measure(text, 3), canvas.width - SAFE_X * 2);
      const x = Math.max(SAFE_X, (canvas.width - width) / 2);
      ctx.fillStyle = '#000';
      ctx.fillRect(x - 9, bottom - 9, width + 18, 39);
      drawText(ctx, text, x, bottom, 3, '#f4f4f0', null);
    }

    this.texture.needsUpdate = true;
  }
}

function measure(text, scale) {
  return text.length * 6 * scale - scale;
}

function drawText(ctx, text, x, y, scale, color, outline) {
  const pixels = [];
  [...text.toUpperCase()].forEach((char, i) => {
    const rows = GLYPHS[char] ?? GLYPHS['?'];
    const gx = x + i * 6 * scale;
    rows.forEach((bits, row) => {
      for (let col = 0; col < 5; col++) {
        if (bits & (0x10 >> col)) pixels.push([gx + col * scale, y + row * scale]);
      }
    });
  });

  // Real OSDs edge characters in black so they read over any picture.
  if (outline) {
    ctx.fillStyle = outline;
    const o = Math.max(2, scale / 2);
    pixels.forEach(([px, py]) => ctx.fillRect(px - o, py - o, scale + o * 2, scale + o * 2));
  }
  ctx.fillStyle = color;
  pixels.forEach(([px, py]) => ctx.fillRect(px, py, scale, scale));
}
