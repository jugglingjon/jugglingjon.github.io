import * as THREE from 'three';

// Procedural canvas textures standing in for real assets until the Blender
// art pass (Phase 5). Seeded so they look identical on every load.

export function seededRandom(seed = 1) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext('2d')];
}

function colorTexture(canvas, repeat) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  return texture;
}

function drawGrain(ctx, width, height, { dark, light, vertical, seed, count = 160 }) {
  const rand = seededRandom(seed);
  const length = vertical ? height : width;
  const across = vertical ? width : height;
  for (let i = 0; i < count; i++) {
    const pos = rand() * across;
    const amp = 2 + rand() * 7;
    const freq = 0.004 + rand() * 0.01;
    const phase = rand() * Math.PI * 2;
    ctx.strokeStyle = rand() < 0.6 ? dark : light;
    ctx.globalAlpha = 0.06 + rand() * 0.22;
    ctx.lineWidth = 0.5 + rand() * 2.5;
    ctx.beginPath();
    for (let s = 0; s <= length; s += 8) {
      const off = pos + Math.sin(s * freq + phase) * amp + Math.sin(s * freq * 3.1 + phase * 2) * amp * 0.3;
      if (vertical) s === 0 ? ctx.moveTo(off, s) : ctx.lineTo(off, s);
      else s === 0 ? ctx.moveTo(s, off) : ctx.lineTo(s, off);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Faux woodgrain vinyl, the cabinet finish of every 80s TV.
export function createWoodTexture({ base = '#5e3a20', dark = '#2e1a0c', light = '#80522e', seed = 7, repeat } = {}) {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  drawGrain(ctx, 512, 512, { dark, light, vertical: false, seed });
  return colorTexture(canvas, repeat);
}

// Vertical wood paneling with V-grooves between planks.
export function createPanelingTexture(repeat = [6, 1]) {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#4a2e19';
  ctx.fillRect(0, 0, 512, 512);
  drawGrain(ctx, 512, 512, { dark: '#24140a', light: '#6b4426', vertical: true, seed: 3, count: 220 });
  const rand = seededRandom(11);
  for (let x = 0; x < 512; x += 64) {
    ctx.fillStyle = `rgba(255, 220, 170, ${0.05 + rand() * 0.04})`;
    ctx.fillRect(x + 4, 0, 60, 512);
    ctx.fillStyle = 'rgba(10, 5, 2, 0.85)';
    ctx.fillRect(x, 0, 3, 512);
  }
  return colorTexture(canvas, repeat);
}

// Brown-orange shag carpet.
export function createCarpetTexture() {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#4a2a14';
  ctx.fillRect(0, 0, 256, 256);
  const rand = seededRandom(5);
  const palette = ['#5a3418', '#6e4220', '#3b210f', '#7d4b22', '#2c180a', '#8a5528'];
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
    ctx.globalAlpha = 0.5 + rand() * 0.5;
    ctx.fillRect(rand() * 256, rand() * 256, 1 + rand() * 2, 1 + rand() * 3);
  }
  ctx.globalAlpha = 1;
  return colorTexture(canvas, [24, 24]);
}

// Slotted speaker grille.
export function createGrilleTexture() {
  const [canvas, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#2a221c';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#060404';
  for (let y = 6; y < 124; y += 8) ctx.fillRect(8, y, 112, 4);
  return colorTexture(canvas);
}

// VHF channel dial: silver ring with channel numbers.
export function createDialTexture() {
  const [canvas, ctx] = makeCanvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 40, 128, 128, 128);
  g.addColorStop(0, '#9a9690');
  g.addColorStop(0.9, '#d8d4cc');
  g.addColorStop(1, '#6d6964');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(128, 128, 126, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b1612';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let n = 2; n <= 13; n++) {
    const a = ((n - 2) / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.fillText(String(n), 128 + Math.cos(a) * 98, 128 + Math.sin(a) * 98);
  }
  return colorTexture(canvas);
}

// Chrome brand badge. "Lumatron" is a placeholder for the owner's own mark.
export function createBadgeTexture(text = 'LUMATRON') {
  const [canvas, ctx] = makeCanvas(512, 96);
  const g = ctx.createLinearGradient(0, 14, 0, 82);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, '#a9a9a9');
  g.addColorStop(0.55, '#7a7a7a');
  g.addColorStop(1, '#e6e6e6');
  ctx.fillStyle = g;
  ctx.font = 'italic 900 64px "Arial Black", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 50);
  return colorTexture(canvas);
}

// VCR clock, eternally blinking 12:00.
export function createVcrDisplayTexture() {
  const [canvas, ctx] = makeCanvas(256, 64);
  ctx.fillStyle = '#020403';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#5fffd2';
  ctx.shadowColor = '#5fffd2';
  ctx.shadowBlur = 10;
  ctx.font = 'bold 44px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('12:00', 128, 34);
  return colorTexture(canvas);
}

// VHS spine label.
export function createTapeLabelTexture(title, seed) {
  const [canvas, ctx] = makeCanvas(256, 32);
  const rand = seededRandom(seed);
  ctx.fillStyle = '#f1ece0';
  ctx.fillRect(0, 0, 256, 32);
  ctx.fillStyle = ['#c0392b', '#2c3e8f', '#1e7a46'][Math.floor(rand() * 3)];
  ctx.fillRect(0, 0, 18, 32);
  ctx.fillStyle = '#222';
  ctx.font = 'bold 17px "Courier New", monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 28, 17);
  return colorTexture(canvas);
}

// Fingerprints, dust and wipe streaks on the glass. Greyscale data texture.
export function createSmudgeTexture() {
  const [canvas, ctx] = makeCanvas(512, 384);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 512, 384);
  const rand = seededRandom(42);

  // Static-charged dust.
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.15 + rand() * 0.6})`;
    const s = rand() < 0.9 ? 1 : 2;
    ctx.fillRect(rand() * 512, rand() * 384, s, s);
  }

  // Cloth wipe arcs.
  ctx.filter = 'blur(3px)';
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.05 + rand() * 0.07})`;
    ctx.lineWidth = 10 + rand() * 30;
    ctx.beginPath();
    ctx.arc(rand() * 512, 384 + rand() * 300, 200 + rand() * 260, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  ctx.filter = 'none';

  // Fingerprints, mostly near the lower right where people point at the screen.
  for (let i = 0; i < 5; i++) {
    const cx = 300 + rand() * 190;
    const cy = 200 + rand() * 160;
    const rot = rand() * Math.PI;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.strokeStyle = `rgba(255,255,255,${0.12 + rand() * 0.12})`;
    ctx.lineWidth = 1;
    for (let r = 2; r < 16; r += 1.6) {
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.75, r, 0, rand() * 0.6, Math.PI * 2 - rand() * 0.6);
      ctx.stroke();
    }
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

// --- Room surfaces ---------------------------------------------------------

// Seventies wallpaper: staggered rings in mustard and rust.
export function createWallpaperTexture(repeat) {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#4f3b22';
  ctx.fillRect(0, 0, 256, 256);
  const rings = ['#7a5a2e', '#8c4a1e', '#3d2a17'];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const x = col * 64 + (row % 2 ? 32 : 0);
      const y = row * 64 + 32;
      rings.forEach((color, i) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(x, y, 26 - i * 8, 30 - i * 8, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
  }
  return colorTexture(canvas, repeat);
}

// Popcorn ceiling.
export function createCeilingTexture(repeat) {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#8a8174';
  ctx.fillRect(0, 0, 256, 256);
  const rand = seededRandom(31);
  for (let i = 0; i < 5000; i++) {
    const v = 100 + rand() * 60;
    ctx.fillStyle = `rgba(${v},${v - 6},${v - 14},0.6)`;
    ctx.fillRect(rand() * 256, rand() * 256, 1 + rand() * 2, 1 + rand() * 2);
  }
  return colorTexture(canvas, repeat);
}

// Rust corduroy for the couch.
export function createCorduroyTexture(repeat = [6, 3]) {
  const [canvas, ctx] = makeCanvas(64, 64);
  ctx.fillStyle = '#6e3a1c';
  ctx.fillRect(0, 0, 64, 64);
  for (let x = 0; x < 64; x += 4) {
    ctx.fillStyle = 'rgba(255, 190, 130, 0.14)';
    ctx.fillRect(x, 0, 2, 64);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(x + 3, 0, 1, 64);
  }
  return colorTexture(canvas, repeat);
}

// Rectangular rug: striped border around a diamond field.
export function createRugTexture() {
  const [canvas, ctx] = makeCanvas(512, 352);
  ctx.fillStyle = '#5a2f17';
  ctx.fillRect(0, 0, 512, 352);
  [['#c9822e', 10], ['#e8d2a6', 22], ['#8c3a17', 30]].forEach(([color, inset]) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.strokeRect(inset, inset, 512 - inset * 2, 352 - inset * 2);
  });
  ctx.save();
  ctx.beginPath();
  ctx.rect(40, 40, 432, 272);
  ctx.clip();
  for (let y = 40; y < 320; y += 56) {
    for (let x = 40 + ((y / 56) % 2) * 28; x < 480; x += 56) {
      ctx.fillStyle = (x + y) % 3 ? '#a4521f' : '#d69a3a';
      ctx.beginPath();
      ctx.moveTo(x, y - 22);
      ctx.lineTo(x + 22, y);
      ctx.lineTo(x, y + 22);
      ctx.lineTo(x - 22, y);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
  const rand = seededRandom(13);
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rand() * 0.2})`;
    ctx.fillRect(rand() * 512, rand() * 352, 1, 2);
  }
  return colorTexture(canvas);
}

// Lampshade fringe: hanging strands with gaps (alpha).
export function createFringeTexture() {
  const [canvas, ctx] = makeCanvas(256, 32);
  const rand = seededRandom(17);
  for (let x = 0; x < 256; x += 3) {
    ctx.fillStyle = '#e8c890';
    ctx.fillRect(x, 0, 2, 22 + rand() * 10);
  }
  return colorTexture(canvas, [6, 1]);
}

// --- Props -------------------------------------------------------------------

// A generic weekly TV listings magazine.
export function createMagazineTexture() {
  const [canvas, ctx] = makeCanvas(256, 360);
  ctx.fillStyle = '#f2ead8';
  ctx.fillRect(0, 0, 256, 360);
  ctx.fillStyle = '#c8281e';
  ctx.fillRect(0, 0, 256, 74);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic 900 50px "Arial Black", Arial, sans-serif';
  ctx.fillText('LISTINGS', 10, 56);
  ctx.fillStyle = '#1b1b1b';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText('YOUR WEEK ON THE DIAL · OCT 12–18', 12, 96);
  const g = ctx.createLinearGradient(0, 110, 0, 290);
  g.addColorStop(0, '#3b6fb0');
  g.addColorStop(1, '#e0a24a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(24, 110, 208, 170, 24);
  ctx.fill();
  ctx.fillStyle = '#1b1b1b';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText('Fall Preview!', 24, 312);
  ctx.font = '12px Georgia, serif';
  ctx.fillText('What to watch this season', 24, 330);
  ctx.fillStyle = '#c8281e';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillText('65¢', 206, 346);
  return colorTexture(canvas);
}

// Label wrapped around a beer can.
export function createCanTexture() {
  const [canvas, ctx] = makeCanvas(256, 128);
  ctx.fillStyle = '#d9a52c';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#9e1f1a';
  ctx.fillRect(0, 34, 256, 54);
  ctx.fillStyle = '#f6e7c1';
  ctx.font = 'italic 900 26px Georgia, serif';
  ctx.fillText('Golden Stag', 30, 70);
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillText('LAGER  BEER', 70, 84);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(0, 8, 256, 4);
  ctx.fillRect(0, 112, 256, 4);
  return colorTexture(canvas);
}

// A framed 80s sunset-grid poster.
export function createPrintTexture() {
  const [canvas, ctx] = makeCanvas(300, 400);
  ctx.fillStyle = '#efe6d6';
  ctx.fillRect(0, 0, 300, 400);
  ctx.save();
  ctx.beginPath();
  ctx.rect(24, 24, 252, 352);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, 24, 0, 250);
  sky.addColorStop(0, '#2a1450');
  sky.addColorStop(0.6, '#c2307a');
  sky.addColorStop(1, '#f6a04a');
  ctx.fillStyle = sky;
  ctx.fillRect(24, 24, 252, 226);
  ctx.fillStyle = '#ffd36a';
  ctx.beginPath();
  ctx.arc(150, 210, 70, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = sky;
  for (let i = 0; i < 6; i++) ctx.fillRect(80, 160 + i * 9 + i * i, 140, 2 + i);
  ctx.fillStyle = '#140a26';
  ctx.fillRect(24, 250, 252, 126);
  ctx.strokeStyle = '#ff3ea5';
  ctx.lineWidth = 2;
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(150 + i * 6, 250);
    ctx.lineTo(150 + i * 40, 376);
    ctx.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const y = 250 + Math.pow(i / 6, 2) * 126;
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(276, y);
    ctx.stroke();
  }
  ctx.restore();
  return colorTexture(canvas);
}

// --- Outside -----------------------------------------------------------------

// Vertical rain streaks and beads on the window (alpha, tiled vertically).
export function createRainTexture() {
  const [canvas, ctx] = makeCanvas(256, 512);
  const rand = seededRandom(23);
  for (let i = 0; i < 140; i++) {
    const x = rand() * 256;
    const y = rand() * 512;
    const len = 20 + rand() * 90;
    const g = ctx.createLinearGradient(0, y, 0, y + len);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, `rgba(255,255,255,${0.25 + rand() * 0.5})`);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, 1 + rand(), len);
  }
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.2 + rand() * 0.5})`;
    ctx.beginPath();
    ctx.arc(rand() * 256, rand() * 512, 0.6 + rand() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Across the street: night sky, building silhouettes, a few lit windows.
export function createNightTexture() {
  const [canvas, ctx] = makeCanvas(1024, 512);
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#05070f');
  sky.addColorStop(0.7, '#141a33');
  sky.addColorStop(1, '#2a1d2e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 512);
  const rand = seededRandom(29);
  let x = 0;
  while (x < 1024) {
    const w = 80 + rand() * 160;
    const top = 150 + rand() * 200;
    ctx.fillStyle = '#07080c';
    ctx.fillRect(x, top, w, 512 - top);
    for (let wy = top + 14; wy < 500; wy += 26) {
      for (let wx = x + 10; wx < x + w - 14; wx += 22) {
        if (rand() < 0.12) {
          ctx.fillStyle = rand() < 0.7 ? '#f2c27a' : '#8fb3e8';
          ctx.fillRect(wx, wy, 10, 14);
        }
      }
    }
    x += w + 6;
  }
  return colorTexture(canvas);
}

// The neon sign that lights the room through the blinds.
export function createNeonSignTexture() {
  const [canvas, ctx] = makeCanvas(512, 256);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.font = 'italic 900 112px "Arial Black", Arial, sans-serif';
  ctx.textAlign = 'center';
  for (const [blur, width, color] of [[30, 10, 'rgba(255, 60, 160, 0.9)'], [8, 6, '#ff5fb4'], [0, 2, '#ffe0f0']]) {
    ctx.shadowColor = '#ff3ca0';
    ctx.shadowBlur = blur;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.strokeText('MOTEL', 256, 130);
  }
  ctx.shadowBlur = 16;
  ctx.shadowColor = '#3ef0ff';
  ctx.strokeStyle = '#9ff8ff';
  ctx.lineWidth = 3;
  ctx.font = 'bold 40px Arial, sans-serif';
  ctx.strokeText('VACANCY', 256, 200);
  const texture = colorTexture(canvas);
  return texture;
}

// --- Reflections ---------------------------------------------------------------

// Equirectangular picture of the room as seen from the screen, reflected by
// the glass and used as the scene environment. Everything is placed by
// projecting real positions from the layout, so reflections line up with the
// room: the couch and the viewer behind you, the floor lamp over your
// shoulder, the window and its neon off to the right.
export function createEnvTexture({ origin, eye, couch, floorLamp, window: win, neonColor = '#ff3ca0' }) {
  const W = 1024;
  const H = 512;
  const [canvas, ctx] = makeCanvas(W, H);
  const at = (x, y, z) => {
    const d = new THREE.Vector3(x, y, z).sub(origin).normalize();
    return [(Math.atan2(d.z, d.x) / (Math.PI * 2) + 0.5) * W, (0.5 - Math.asin(d.y) / Math.PI) * H];
  };
  const poly = (points, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };
  const glow = ([x, y], radius, color) => {
    const g = ctx.createRadialGradient(x, y, 2, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };

  // Ceiling, wallpapered walls, carpet.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#070605');
  g.addColorStop(0.3, '#120c08');
  g.addColorStop(0.49, '#21170f');
  g.addColorStop(0.52, '#140d08');
  g.addColorStop(1, '#090604');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // The couch along the back of the room, and you on it, lit by the screen.
  const cz = couch.position.z - couch.depth / 2;
  const cx = couch.position.x;
  poly([at(cx - couch.width / 2, 0.85, cz), at(cx + couch.width / 2, 0.85, cz), at(cx + couch.width / 2, 0.1, cz), at(cx - couch.width / 2, 0.1, cz)], '#2c1a0e');
  const shoulders = [at(eye.x - 0.24, eye.y - 0.25, eye.z), at(eye.x + 0.24, eye.y - 0.25, eye.z), at(eye.x + 0.2, eye.y - 0.6, eye.z), at(eye.x - 0.2, eye.y - 0.6, eye.z)];
  poly(shoulders, '#10131a');
  const [hx, hy] = at(eye.x, eye.y, eye.z);
  const [hr] = at(eye.x + 0.1, eye.y, eye.z);
  ctx.fillStyle = '#10131a';
  ctx.beginPath();
  ctx.ellipse(hx, hy, Math.abs(hr - hx), Math.abs(hr - hx) * 1.25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Floor lamp over your left shoulder.
  const lamp = floorLamp.shade;
  glow(at(lamp.x, lamp.y, lamp.z), 110, 'rgba(255, 196, 120, 0.5)');
  poly([at(lamp.x - 0.15, lamp.y + 0.12, lamp.z), at(lamp.x + 0.15, lamp.y + 0.12, lamp.z), at(lamp.x + 0.22, lamp.y - 0.12, lamp.z), at(lamp.x - 0.22, lamp.y - 0.12, lamp.z)], '#ffd59a');

  // The window on the right wall: neon-pink blinds with dark slats.
  const z0 = win.z - win.width / 2;
  const z1 = win.z + win.width / 2;
  const y0 = win.y - win.height / 2;
  const y1 = win.y + win.height / 2;
  const corners = [at(win.x, y1, z0), at(win.x, y1, z1), at(win.x, y0, z1), at(win.x, y0, z0)];
  poly(corners, '#6d5b8f');
  const xs = corners.map(([x]) => x);
  const ys = corners.map(([, y]) => y);
  const center = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  glow(center, 140, neonColor);
  ctx.fillStyle = 'rgba(8, 6, 6, 0.8)';
  for (let y = Math.min(...ys); y < Math.max(...ys); y += 6) ctx.fillRect(Math.min(...xs), y, Math.max(...xs) - Math.min(...xs), 3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

// --- The viewer -----------------------------------------------------------------

// Red and black flannel for your shirt sleeve.
export function createFlannelTexture() {
  const [canvas, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#8a1f1a';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(20, 8, 8, 0.75)';
  ctx.fillRect(0, 40, 128, 36);
  ctx.fillRect(40, 0, 36, 128);
  ctx.fillStyle = 'rgba(20, 8, 8, 0.45)';
  ctx.fillRect(0, 96, 128, 8);
  ctx.fillRect(96, 0, 8, 128);
  ctx.fillStyle = 'rgba(240, 220, 190, 0.35)';
  ctx.fillRect(0, 20, 128, 2);
  ctx.fillRect(20, 0, 2, 128);
  const rand = seededRandom(83);
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rand() * 0.15})`;
    ctx.fillRect(rand() * 128, rand() * 128, 1, 2);
  }
  return colorTexture(canvas, [3, 4]);
}
