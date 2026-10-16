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
export function createPanelingTexture() {
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
  return colorTexture(canvas, [6, 1]);
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

// Equirectangular "photo" of the room behind the viewer, reflected by the
// screen glass and used as the scene environment. Layout matches Stage.js:
// the viewer sits at +z (u = 0.75); window is to their right, lamp to their left.
export function createEnvTexture() {
  const W = 1024;
  const H = 512;
  const [canvas, ctx] = makeCanvas(W, H);
  // u: 0.75 is straight behind the viewer; positive angle a (radians) towards +x.
  const ux = (a) => (0.75 - a / (Math.PI * 2)) * W;
  const vy = (v) => (1 - v) * H;

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#070605');
  g.addColorStop(0.3, '#120c08');
  g.addColorStop(0.49, '#21170f');
  g.addColorStop(0.52, '#140d08');
  g.addColorStop(1, '#090604');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Paneling seams on the walls.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (let x = 0; x < W; x += 22) ctx.fillRect(x, vy(0.72), 2, vy(0.5) - vy(0.72));

  // Couch behind the viewer.
  ctx.fillStyle = '#2c1a0e';
  ctx.beginPath();
  ctx.roundRect(ux(0.5), vy(0.5), ux(-0.5) - ux(0.5), vy(0.4) - vy(0.5), 12);
  ctx.fill();

  // The viewer: a dark silhouette faintly lit by the TV.
  ctx.fillStyle = '#10131a';
  ctx.beginPath();
  ctx.ellipse(ux(0), vy(0.475), 26, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(ux(0), vy(0.535), 9, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Window with venetian blinds and a neon sign glowing outside.
  const wx0 = ux(0.48);
  const wx1 = ux(0.3);
  const wy0 = vy(0.7);
  const wy1 = vy(0.53);
  const neon = ctx.createRadialGradient(wx0 + 10, wy1, 2, wx0 + 10, wy1, 90);
  neon.addColorStop(0, 'rgba(255, 60, 154, 0.9)');
  neon.addColorStop(1, 'rgba(255, 60, 154, 0)');
  ctx.fillStyle = '#7f97c4';
  ctx.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
  ctx.fillStyle = neon;
  ctx.fillRect(wx0 - 60, wy0, wx1 - wx0 + 80, wy1 - wy0 + 60);
  ctx.fillStyle = 'rgba(8, 6, 6, 0.8)';
  for (let y = wy0; y < wy1; y += 7) ctx.fillRect(wx0, y, wx1 - wx0, 3);

  // Lamp with a warm shade and a big soft glow.
  const lx = ux(-0.5);
  const ly = vy(0.57);
  const glow = ctx.createRadialGradient(lx, ly, 4, lx, ly, 120);
  glow.addColorStop(0, 'rgba(255, 196, 120, 0.55)');
  glow.addColorStop(1, 'rgba(255, 196, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(lx - 120, ly - 120, 240, 240);
  ctx.fillStyle = '#ffd59a';
  ctx.beginPath();
  ctx.moveTo(lx - 12, ly - 16);
  ctx.lineTo(lx + 12, ly - 16);
  ctx.lineTo(lx + 22, ly + 14);
  ctx.lineTo(lx - 22, ly + 14);
  ctx.closePath();
  ctx.fill();

  // Hallway light through a door left ajar.
  const dx = ux(-1.05);
  ctx.fillStyle = 'rgba(255, 220, 170, 0.8)';
  ctx.fillRect(dx, vy(0.68), 3, vy(0.42) - vy(0.68));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}
