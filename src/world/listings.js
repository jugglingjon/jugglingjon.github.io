// The listings magazine's inside spread, drawn on canvases at the magazine's
// proportions (13.5 × 19 cm). The left page welcomes you to the week; the
// right page lists every channel in the lineup, the one on now is marked, and
// the row under the pointer lights up.

export const PAGE = { width: 768, height: 1080, top: 214, bottom: 70, maxRow: 104 };

const PAPER = '#f2ead8';
const INK = '#1b1b1b';
const RED = '#c8281e';
const SOFT = '#6b6255';

// Row layout for `count` listings: where the first starts and each one's height.
export function rowLayout(count) {
  const rowHeight = Math.min(PAGE.maxRow, (PAGE.height - PAGE.top - PAGE.bottom) / Math.max(count, 1));
  return { top: PAGE.top, rowHeight };
}

// Which listing a point on the right-hand page is over, from its texture
// coordinate v (0 at the bottom edge, 1 at the top), or −1 for none.
export function rowAt(v, count) {
  const { top, rowHeight } = rowLayout(count);
  const row = Math.floor(((1 - v) * PAGE.height - top) / rowHeight);
  return row >= 0 && row < count ? row : -1;
}

// Prime time, half an hour a show.
export function airTime(index) {
  const minutes = 19 * 60 + index * 30;
  const hour = Math.floor(minutes / 60) % 12 || 12;
  return `${hour}:${String(minutes % 60).padStart(2, '0')}`;
}

function wrap(ctx, text, x, y, width, lineHeight) {
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = word;
    } else {
      line = next;
    }
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineHeight;
}

function fit(ctx, text, width) {
  if (ctx.measureText(text).width <= width) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1);
  return `${cut}…`;
}

// Right-hand page: tonight's listings. `lineup` is [{ number, name, source }],
// `current` the channel on now, `hover` the row under the pointer (or −1).
export function drawListings(ctx, { lineup, current, hover = -1 }) {
  const { width: W, height: H } = PAGE;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = RED;
  ctx.fillRect(0, 0, W, 132);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic 900 78px "Arial Black", Arial, sans-serif';
  ctx.fillText('TONIGHT', 34, 100);
  ctx.fillStyle = INK;
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.fillText('Pick a show and your set tunes right in', 36, 182);

  const { top, rowHeight } = rowLayout(lineup.length);
  lineup.forEach((channel, i) => {
    const y = top + i * rowHeight;
    if (i === hover) {
      ctx.fillStyle = '#ffc53d';
      ctx.fillRect(18, y + 4, W - 36, rowHeight - 8);
      ctx.fillStyle = RED;
      ctx.fillRect(18, y + 4, 8, rowHeight - 8);
    }
    ctx.strokeStyle = 'rgba(27, 27, 27, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, y + rowHeight);
    ctx.lineTo(W - 30, y + rowHeight);
    ctx.stroke();

    // Channel number in a black tab, then the time.
    const mid = y + rowHeight / 2;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.roundRect(34, mid - 30, 74, 60, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(channel.number), 71, mid + 14);
    ctx.textAlign = 'left';
    ctx.fillStyle = SOFT;
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillText(airTime(i), 126, mid - 10);

    const live = channel.number === current;
    const textX = 230;
    const textWidth = W - textX - (live ? 150 : 40);
    ctx.fillStyle = INK;
    ctx.font = `bold ${Math.min(38, rowHeight * 0.36)}px Georgia, serif`;
    ctx.fillText(fit(ctx, channel.name, textWidth), textX, mid - 4);
    ctx.fillStyle = SOFT;
    ctx.font = `${Math.min(24, rowHeight * 0.24)}px Georgia, serif`;
    ctx.fillText(fit(ctx, channel.source?.blurb ?? 'Tune in to find out', textWidth), textX, mid + 30);
    if (live) {
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.roundRect(W - 150, mid - 22, 116, 44, 22);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ON NOW', W - 92, mid + 8);
      ctx.textAlign = 'left';
    }
  });

  ctx.fillStyle = SOFT;
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText('LISTINGS · YOUR WEEK ON THE DIAL', 34, H - 30);
  ctx.textAlign = 'right';
  ctx.fillText('9', W - 34, H - 30);
  ctx.textAlign = 'left';
}

// Left-hand page: the week's welcome, how to watch, and an ad.
export function drawWelcome(ctx) {
  const { width: W, height: H } = PAGE;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = RED;
  ctx.font = 'italic 900 34px "Arial Black", Arial, sans-serif';
  ctx.fillText('LISTINGS', 40, 70);
  ctx.fillStyle = INK;
  ctx.fillRect(40, 88, W - 80, 4);

  ctx.font = 'bold 60px Georgia, serif';
  let y = wrap(ctx, 'A portfolio, one channel at a time', 40, 170, W - 80, 66);
  ctx.font = '28px Georgia, serif';
  ctx.fillStyle = '#3a342c';
  y = wrap(
    ctx,
    'Every channel on this set is a project. Flip through with CH ▲ ▼, punch in a number, or pick a show from tonight’s listings and the set tunes straight to it.',
    40,
    y + 20,
    W - 80,
    40,
  );

  // How to watch.
  const boxTop = y + 24;
  ctx.fillStyle = '#e6dcc4';
  ctx.fillRect(40, boxTop, W - 80, 326);
  ctx.fillStyle = RED;
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.fillText('HOW TO WATCH', 64, boxTop + 48);
  ctx.fillStyle = INK;
  ctx.font = '25px Arial, sans-serif';
  [
    'Middle of the screen: aim your thumb, click to press',
    'Towards the edges: look around the room',
    'Scroll: lean in for a closer look',
    'Glowing outline: click it and see what happens',
    'INFO on the remote (or I): the story behind the show',
  ].forEach((tip, i) => {
    ctx.fillText('•', 64, boxTop + 96 + i * 46);
    ctx.fillText(fit(ctx, tip, W - 160), 92, boxTop + 96 + i * 46);
  });

  // An ad for the set you're watching.
  const adTop = Math.min(boxTop + 358, H - 230);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(40, adTop, W - 80, 190);
  ctx.fillStyle = INK;
  ctx.font = 'italic 900 48px "Arial Black", Arial, sans-serif';
  ctx.fillText('LUMATRON', 70, adTop + 70);
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillText('The picture that pulls you in.', 72, adTop + 112);
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillText('19" COLOR · WOODGRAIN CABINET · ASK YOUR DEALER', 72, adTop + 158);

  ctx.fillStyle = SOFT;
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText('8', 40, H - 30);
}
