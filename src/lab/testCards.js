import { seededRandom } from '../world/textures.js';

// Placeholder "projects" drawn on canvas, so the lab works with zero assets.
// Swap for real screenshots and screen recordings in Phase 6.

const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext('2d')];
}

function pill(ctx, x, y, w, h, fill, label, color, font) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function card(ctx, x, y, w, h, fill, r = 14) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
  return y + lineHeight;
}

// Restaurant brand site: dark, neon, big type.
export function drawNeonBurger() {
  const [canvas, ctx] = makeCanvas(1024, 768);
  ctx.fillStyle = '#150b22';
  ctx.fillRect(0, 0, 1024, 768);
  ctx.strokeStyle = 'rgba(255, 62, 165, 0.08)';
  for (let x = 0; x < 1024; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 768);
    ctx.stroke();
  }

  ctx.fillStyle = '#ff3ea5';
  ctx.font = `800 26px ${SANS}`;
  ctx.fillText('NEON BURGER CO.', 56, 64);
  ctx.fillStyle = '#d9d2e9';
  ctx.font = `600 16px ${SANS}`;
  ['MENU', 'LOCATIONS', 'STORY'].forEach((t, i) => ctx.fillText(t, 540 + i * 110, 60));
  pill(ctx, 880, 36, 100, 36, '#ff3ea5', 'ORDER', '#150b22', `800 15px ${SANS}`);

  ctx.font = `900 92px ${SANS}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('SMASHED.', 56, 250);
  ctx.fillText('STACKED.', 56, 345);
  const grad = ctx.createLinearGradient(56, 0, 520, 0);
  grad.addColorStop(0, '#ff3ea5');
  grad.addColorStop(1, '#3ef0ff');
  ctx.fillStyle = grad;
  ctx.fillText('GLOWING.', 56, 440);
  ctx.fillStyle = '#a99cc0';
  ctx.font = `400 22px ${SANS}`;
  ctx.fillText('Late-night burgers, griddled under neon since 1984.', 56, 495);
  pill(ctx, 56, 530, 230, 58, '#3ef0ff', 'FIND A GRILL  →', '#150b22', `800 18px ${SANS}`);

  // Burger illustration.
  const glow = ctx.createRadialGradient(770, 340, 20, 770, 340, 250);
  glow.addColorStop(0, 'rgba(255, 122, 47, 0.55)');
  glow.addColorStop(1, 'rgba(255, 122, 47, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(500, 80, 540, 540);
  ctx.fillStyle = '#e0923a';
  ctx.beginPath();
  ctx.roundRect(600, 400, 340, 58, 22);
  ctx.fill();
  ctx.fillStyle = '#5a2d1a';
  ctx.beginPath();
  ctx.roundRect(590, 342, 360, 64, 30);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(596, 326, 350, 22);
  for (let x = 620; x < 930; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, 346);
    ctx.lineTo(x + 30, 346);
    ctx.lineTo(x + 15, 378);
    ctx.fill();
  }
  ctx.fillStyle = '#6bd35a';
  ctx.beginPath();
  ctx.moveTo(585, 330);
  for (let x = 585; x <= 955; x += 20) ctx.lineTo(x, 316 + (x % 40 === 5 ? 18 : 4));
  ctx.lineTo(955, 300);
  ctx.lineTo(585, 300);
  ctx.fill();
  ctx.fillStyle = '#f2a541';
  ctx.beginPath();
  ctx.ellipse(770, 304, 182, 120, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff3d6';
  const rand = seededRandom(9);
  for (let i = 0; i < 18; i++) {
    const a = Math.PI + 0.25 + rand() * (Math.PI - 0.5);
    const r = 40 + rand() * 120;
    ctx.beginPath();
    ctx.ellipse(770 + Math.cos(a) * r * 1.3, 300 + Math.sin(a) * r * 0.8, 7, 4, rand(), 0, Math.PI * 2);
    ctx.fill();
  }

  const items = [['DOUBLE SMASH', '$4.85'], ['NEON FRIES', '$1.95'], ['MIDNIGHT SHAKE', '$2.50']];
  items.forEach(([name, price], i) => {
    const x = 56 + i * 312;
    card(ctx, x, 630, 290, 100, '#22143a', 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 20px ${SANS}`;
    ctx.fillText(name, x + 24, 672);
    ctx.fillStyle = '#ff3ea5';
    ctx.font = `700 18px ${SANS}`;
    ctx.fillText(price, x + 24, 704);
  });
  return canvas;
}

// SaaS analytics dashboard: light UI, charts, lots of fine detail.
export function drawDashboard() {
  const [canvas, ctx] = makeCanvas(1024, 768);
  const rand = seededRandom(21);
  ctx.fillStyle = '#eef1f7';
  ctx.fillRect(0, 0, 1024, 768);

  ctx.fillStyle = '#1b2140';
  ctx.fillRect(0, 0, 200, 768);
  ctx.strokeStyle = '#7c8cff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(44, 46, 14, 7, -0.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 24px ${SANS}`;
  ctx.fillText('ORBIT', 68, 55);
  ['Overview', 'Audience', 'Revenue', 'Reports', 'Settings'].forEach((t, i) => {
    if (i === 0) card(ctx, 16, 104 + i * 48, 168, 38, '#2f3a6b', 10);
    ctx.fillStyle = i === 0 ? '#ffffff' : '#9aa3c7';
    ctx.font = `600 16px ${SANS}`;
    ctx.fillText(t, 36, 129 + i * 48);
  });

  ctx.fillStyle = '#1b2140';
  ctx.font = `800 30px ${SANS}`;
  ctx.fillText('Overview', 232, 62);
  pill(ctx, 860, 36, 132, 34, '#ffffff', 'Last 30 days ▾', '#1b2140', `600 14px ${SANS}`);

  const kpis = [['ACTIVE USERS', '48.2K', '+12.4%'], ['SESSIONS', '131K', '+8.1%'], ['CONVERSION', '3.92%', '+0.6%'], ['REVENUE', '$86.4K', '+18.9%']];
  kpis.forEach(([label, value, delta], i) => {
    const x = 232 + i * 192;
    card(ctx, x, 96, 176, 104, '#ffffff', 12);
    ctx.fillStyle = '#8a91ad';
    ctx.font = `700 12px ${SANS}`;
    ctx.fillText(label, x + 18, 126);
    ctx.fillStyle = '#1b2140';
    ctx.font = `800 32px ${SANS}`;
    ctx.fillText(value, x + 18, 166);
    ctx.fillStyle = '#1fa971';
    ctx.font = `700 14px ${SANS}`;
    ctx.fillText(delta, x + 18, 188);
  });

  card(ctx, 232, 216, 528, 300, '#ffffff', 12);
  ctx.fillStyle = '#1b2140';
  ctx.font = `700 18px ${SANS}`;
  ctx.fillText('Sessions', 256, 250);
  ctx.strokeStyle = '#e6e9f2';
  ctx.lineWidth = 1;
  for (let y = 280; y <= 480; y += 40) {
    ctx.beginPath();
    ctx.moveTo(256, y);
    ctx.lineTo(736, y);
    ctx.stroke();
  }
  const series = (phase, amp, base) => {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      pts.push([256 + i * 20, base - Math.sin(i * 0.45 + phase) * amp - i * 3 - Math.sin(i * 1.7) * 10]);
    }
    return pts;
  };
  const blue = series(0, 40, 440);
  const fill = ctx.createLinearGradient(0, 300, 0, 480);
  fill.addColorStop(0, 'rgba(75, 107, 251, 0.35)');
  fill.addColorStop(1, 'rgba(75, 107, 251, 0)');
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(256, 480);
  blue.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(736, 480);
  ctx.fill();
  for (const [pts, color] of [[blue, '#4b6bfb'], [series(1.6, 25, 470), '#b14bfb']]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }

  card(ctx, 776, 216, 216, 300, '#ffffff', 12);
  ctx.fillStyle = '#1b2140';
  ctx.font = `700 18px ${SANS}`;
  ctx.fillText('Channels', 800, 250);
  const slices = [[0.42, '#4b6bfb'], [0.27, '#b14bfb'], [0.18, '#1fa971'], [0.13, '#ffb020']];
  let start = -Math.PI / 2;
  ctx.lineWidth = 26;
  for (const [share, color] of slices) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(884, 380, 70, start, start + share * Math.PI * 2 - 0.04);
    ctx.stroke();
    start += share * Math.PI * 2;
  }
  ctx.fillStyle = '#1b2140';
  ctx.font = `800 24px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('131K', 884, 389);
  ctx.textAlign = 'left';

  card(ctx, 232, 532, 760, 208, '#ffffff', 12);
  ctx.fillStyle = '#1b2140';
  ctx.font = `700 18px ${SANS}`;
  ctx.fillText('Revenue by week', 256, 566);
  for (let i = 0; i < 26; i++) {
    const h = 30 + rand() * 110 + i * 1.5;
    ctx.fillStyle = i === 25 ? '#4b6bfb' : '#c7d0fb';
    ctx.beginPath();
    ctx.roundRect(260 + i * 28, 716 - h, 18, h, 4);
    ctx.fill();
  }
  return canvas;
}

const FILLER =
  'We drove north until the road ran out, then kept going on gravel. The plan was simple: no maps, no ' +
  'schedule, one camera and whatever the weather allowed. What we found instead was a string of small ' +
  'towns that never made it onto a postcard, and people who were happy to tell us why.';

function scenicPhoto(ctx, x, y, w, h, palette, seed) {
  const rand = seededRandom(seed);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, palette.skyTop);
  sky.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = palette.sun;
  ctx.beginPath();
  ctx.arc(x + w * (0.3 + rand() * 0.4), y + h * 0.42, h * 0.12, 0, Math.PI * 2);
  ctx.fill();
  palette.layers.forEach((color, layer) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    const baseY = y + h * (0.5 + layer * 0.14);
    for (let px = 0; px <= w; px += w / 12) {
      ctx.lineTo(x + px, baseY - rand() * h * 0.22);
    }
    ctx.lineTo(x + w, y + h);
    ctx.fill();
  });
  ctx.restore();
}

// Editorial travel site, rendered as a tall page and "screen recorded" by
// scrolling a browser viewport over it. Exercises motion through the CRT.
export function createScrollRecording() {
  const [page, ctx] = makeCanvas(1024, 2800);
  ctx.fillStyle = '#f3ecdf';
  ctx.fillRect(0, 0, 1024, 2800);

  ctx.fillStyle = '#2b211c';
  ctx.font = `700 64px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText('Field Notes', 512, 150);
  ctx.font = `600 13px ${SANS}`;
  ctx.fillStyle = '#8a7666';
  ctx.fillText('TRAVEL   ·   PHOTOGRAPHY   ·   ESSAYS   ·   SHOP', 512, 186);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#2b211c';
  ctx.fillRect(64, 206, 896, 2);

  const dusk = { skyTop: '#f6a35c', skyBottom: '#fbe0b2', sun: '#fff4d1', layers: ['#7a5672', '#4d3456', '#2c1f36'] };
  const forest = { skyTop: '#9cc7d9', skyBottom: '#e9f1e4', sun: '#fffbea', layers: ['#5f8a66', '#3c6648', '#1f3d2b'] };
  const night = { skyTop: '#121a3a', skyBottom: '#3c2f63', sun: '#f4f0d0', layers: ['#2b2550', '#1c1838', '#0e0c1e'] };

  let y = 240;
  const sections = [
    ['The Long Way Round', dusk, 11],
    ['Into the Pines', forest, 23],
    ['After Dark in Ashford', night, 37],
  ];
  sections.forEach(([title, palette, seed], i) => {
    scenicPhoto(ctx, 64, y, 896, 460, palette, seed);
    y += 530;
    ctx.fillStyle = '#2b211c';
    ctx.font = `700 50px ${SERIF}`;
    ctx.fillText(title, 64, y);
    y += 40;
    ctx.fillStyle = '#7a6656';
    ctx.font = `italic 22px ${SERIF}`;
    ctx.fillText(`Part ${i + 1} · photographs and words`, 64, y);
    y += 46;
    ctx.fillStyle = '#3b302a';
    ctx.font = `20px ${SERIF}`;
    y = wrapText(ctx, FILLER, 64, y, 560, 32);
    if (i === 0) {
      ctx.fillStyle = '#b4522b';
      ctx.font = `italic 700 30px ${SERIF}`;
      wrapText(ctx, '“Nobody comes up here on purpose. That’s the point.”', 680, y - 120, 280, 40);
    }
    y += 50;
  });

  const [frame, fctx] = makeCanvas(1024, 768);
  const maxScroll = page.height - (frame.height - 44);
  let lastScroll = -1;

  return {
    canvas: frame,
    update(time) {
      // Hold, scroll down, hold, scroll back up, like someone demoing a site.
      const phase = (time % 18) / 18;
      const ease = (t) => t * t * (3 - 2 * t);
      let s;
      if (phase < 0.1) s = 0;
      else if (phase < 0.45) s = ease((phase - 0.1) / 0.35);
      else if (phase < 0.55) s = 1;
      else if (phase < 0.9) s = 1 - ease((phase - 0.55) / 0.35);
      else s = 0;
      const scroll = Math.round(s * maxScroll);
      if (scroll === lastScroll) return false;
      lastScroll = scroll;

      fctx.drawImage(page, 0, scroll, 1024, 724, 0, 44, 1024, 724);
      fctx.fillStyle = '#dcdcdc';
      fctx.fillRect(0, 0, 1024, 44);
      ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
        fctx.fillStyle = c;
        fctx.beginPath();
        fctx.arc(22 + i * 20, 22, 6, 0, Math.PI * 2);
        fctx.fill();
      });
      card(fctx, 300, 10, 424, 24, '#ffffff', 12);
      fctx.fillStyle = '#555';
      fctx.font = `13px ${SANS}`;
      fctx.fillText('fieldnotes.example/stories', 450, 27);
      return true;
    },
  };
}

// SMPTE colour bars with an ident box.
export function drawColorBars() {
  const [canvas, ctx] = makeCanvas(640, 480);
  const bar = 640 / 7;
  ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.floor(i * bar), 0, Math.ceil(bar), 320);
  });
  ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.floor(i * bar), 320, Math.ceil(bar), 40);
  });
  const wide = bar * 1.25;
  [['#00214c', wide], ['#ffffff', wide], ['#32006a', wide], ['#131313', bar * 1.5], ['#090909', bar / 3], ['#131313', bar / 3], ['#1d1d1d', bar / 3], ['#131313', bar]].reduce(
    (x, [c, w]) => {
      ctx.fillStyle = c;
      ctx.fillRect(Math.floor(x), 360, Math.ceil(w) + 1, 120);
      return x + w;
    },
    0,
  );
  ctx.fillStyle = '#000';
  ctx.fillRect(200, 130, 240, 60);
  ctx.fillStyle = '#fff';
  ctx.font = `700 22px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('RETRO PORTFOLIO', 320, 160);
  ctx.font = `600 13px ${SANS}`;
  ctx.fillText('TEST TRANSMISSION', 320, 180);
  return canvas;
}

// Resolution chart for tuning scanlines, mask and moiré.
export function drawResolutionChart() {
  const [canvas, ctx] = makeCanvas(1024, 768);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 1024, 768);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  for (let r = 16; r < 300; r += 8) {
    ctx.beginPath();
    ctx.arc(512, 330, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  // Horizontal and vertical line gratings, coarse to single-pixel.
  [8, 6, 4, 3, 2, 1].forEach((gap, i) => {
    for (let k = 0; k < 8; k++) ctx.fillRect(40 + i * 28, 80 + k * gap * 2, 20, gap);
    for (let k = 0; k < 8; k++) ctx.fillRect(840 + k * gap * 2, 80 + i * 36, gap, 24);
  });
  for (let i = 0; i < 11; i++) {
    const v = Math.round((i / 10) * 255);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(112 + i * 72, 660, 72, 60);
  }
  const hue = ctx.createLinearGradient(112, 0, 904, 0);
  for (let i = 0; i <= 6; i++) hue.addColorStop(i / 6, `hsl(${i * 60}, 100%, 50%)`);
  ctx.fillStyle = hue;
  ctx.fillRect(112, 640, 792, 18);
  ctx.fillStyle = '#fff';
  [12, 16, 22, 30].forEach((size, i) => {
    ctx.font = `700 ${size}px ${SANS}`;
    ctx.fillText('THE QUICK BROWN FOX', 40, 420 + i * 48);
  });
  return canvas;
}
