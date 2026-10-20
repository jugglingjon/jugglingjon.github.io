import { seededRandom } from './textures.js';

// The résumé on the paper plane's sheet (content/resume.js), typed onto a US
// letter page as if on a typewriter, and drawn on a canvas for the sheet's
// texture. Laying it out is kept apart from drawing it, so the tests can check
// it fits without a canvas: Courier is monospaced, every character 0.6 em.

export const PAGE = { width: 1700, height: 2200, margin: 140 }; // px: 8½ × 11 in at 200 dpi
export const RESUME_FONT = { family: 'Courier Prime', regular: 'courier-prime.woff2', bold: 'courier-prime-bold.woff2' };
const BODY = { largest: 42, smallest: 28 }; // px: the body type shrinks a step at a time to fit the page
const LEAD = 1.4; // line height, in ems
const INK = '#1b1915';
const STRIKE = 0.04; // how much heavier than the font the ribbon strikes, in ems: the page is seen shrunk to fit the view
const LINK_INK = '#1d3a8a';

export const monospace = (text, size) => text.length * size * 0.6;
export const fontOf = (size, bold = false) => `${bold ? 700 : 400} ${size}px "${RESUME_FONT.family}", "Courier New", monospace`;

export function loadResumeFonts(base) {
  if (typeof FontFace === 'undefined') return Promise.resolve();
  return Promise.all(
    [
      [RESUME_FONT.regular, '400'],
      [RESUME_FONT.bold, '700'],
    ].map(([file, weight]) => {
      const face = new FontFace(RESUME_FONT.family, `url(${base}fonts/${file})`, { weight });
      document.fonts.add(face);
      return face.load();
    }),
  ).catch((err) => console.warn("Couldn't load the résumé's typewriter font; it'll use Courier New.", err));
}

// Words into lines no wider than `width`.
function wrap(text, width, size, measure) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, size) > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

const bare = (url) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

// Where everything goes: `ops` to draw ({ text, x, y (baseline), size, bold,
// link?, align? } or { rule: [x1, x2, y] }), the `links` to click ({ x, y, w,
// h, url } in page pixels), the body size it settled on, and how far down the
// page it reaches. `projects` are content/projects.js, for the selected work.
export function layoutResume(resume, { projects = [], measure = monospace } = {}) {
  let laid;
  for (let body = BODY.largest; body >= BODY.smallest; body--) {
    laid = layoutAt(resume, projects, measure, body);
    if (laid.bottom <= PAGE.height - PAGE.margin) break;
  }
  return laid;
}

function layoutAt(resume, projects, measure, body) {
  const ops = [];
  const links = [];
  const left = PAGE.margin;
  const right = PAGE.width - PAGE.margin;
  const lead = body * LEAD;
  let y = PAGE.margin; // the top of the next line

  const put = (text, x, size, { bold = false, url, align } = {}) => {
    const baseline = y + size;
    ops.push({ text, x, y: baseline, size, bold, link: Boolean(url), align });
    if (url) {
      const w = measure(text, size);
      links.push({ x: align === 'right' ? x - w : x, y: baseline - size * 0.85, w, h: size * 1.15, url });
    }
  };
  const paragraph = (text, { indent = 0, hang = '' } = {}) => {
    const lines = wrap(text, right - left - indent - measure(hang, body), body, measure);
    lines.forEach((line, i) => {
      if (i === 0 && hang) put(hang, left + indent, body);
      put(line, left + indent + measure(hang, body), body);
      y += lead;
    });
  };
  // A bold line with something set flush right on it (dates); the bold part
  // wraps short of it if need be.
  const titled = (title, aside = '') => {
    const room = right - left - (aside ? measure(aside, body) + body : 0);
    const lines = wrap(title, room, body, measure);
    if (aside) put(aside, right, body, { align: 'right' });
    for (const line of lines) {
      put(line, left, body, { bold: true });
      y += lead;
    }
  };
  const heading = (text) => {
    y += body * 0.55;
    put(text.toUpperCase(), left, body, { bold: true });
    y += lead;
    ops.push({ rule: [left, left + measure(text, body), y - lead * 0.18] });
    y += body * 0.25;
  };

  // The heading: name, title, and how to get in touch, two to a row if they fit.
  const nameSize = Math.round(body * 2.15);
  put(resume.name.toUpperCase(), left, nameSize, { bold: true });
  y += nameSize * 1.25;
  put(resume.title, left, Math.round(body * 0.95));
  y += body * 1.75;
  const labelSize = Math.round(body * 0.78);
  const labelWidth = Math.max(...resume.links.map((l) => measure(l.label, labelSize))) + body * 0.6;
  const widest = Math.max(...resume.links.map((l) => labelWidth + measure(l.text, body)));
  const columns = widest <= (right - left) / 2 - body ? 2 : 1;
  resume.links.forEach((link, i) => {
    const x = left + (i % columns) * ((right - left) / 2);
    put(link.label.toUpperCase(), x, labelSize, { bold: true });
    put(link.text, x + labelWidth, body, { url: link.url });
    if ((i + 1) % columns === 0 || i === resume.links.length - 1) y += lead;
  });
  y += body * 0.4;
  ops.push({ rule: [left, right, y] });
  y += body * 0.5;

  heading('Profile');
  paragraph(resume.profile);

  heading('Experience');
  resume.experience.forEach((job, i) => {
    if (i) y += body * 0.45;
    titled(`${job.role}, ${job.company}`, job.dates);
    for (const point of job.points) paragraph(point, { hang: '- ' });
  });

  const work = resume.work.map((slug) => projects.find((p) => p.slug === slug)).filter(Boolean);
  if (work.length) {
    heading('Selected work');
    work.forEach((project, i) => {
      if (i) y += body * 0.3;
      titled(project.title);
      const url = project.links?.live;
      if (url) {
        put(bare(url), left + measure('  ', body), body, { url });
        y += lead;
      }
    });
  }

  heading('Skills');
  paragraph(resume.skills.join(' · '));

  heading('Education');
  resume.education.forEach((course) => titled(`${course.what}, ${course.where}`, course.dates));

  return { ops, links, body, bottom: y };
}

// Draw the page: the paper, the creases left by folding it (`creases` in
// sheet space, `sheet` its size in metres), the type, and a DRAFT stamp while
// it's a stand-in.
export function drawResume(ctx, laid, { creases = [], sheet, draft = false } = {}) {
  const { width, height } = PAGE;
  ctx.save();
  ctx.fillStyle = '#f2eee3';
  ctx.fillRect(0, 0, width, height);
  // A little tooth in the paper.
  const random = seededRandom(43);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = random() < 0.5 ? 'rgba(90, 70, 40, 0.05)' : 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(random() * width, random() * height, 1.5, 1.5);
  }
  // The creases, a shadow and a highlight each.
  if (sheet) {
    const px = ([x, y]) => [(x / sheet.width + 0.5) * width, (0.5 - y / sheet.height) * height];
    for (const [offset, colour] of [[1.5, 'rgba(70, 55, 30, 0.13)'], [-1.5, 'rgba(255, 255, 255, 0.5)']]) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (const crease of creases) {
        const [ax, ay] = px(crease.from);
        const [bx, by] = px(crease.to);
        ctx.moveTo(ax + offset, ay + offset);
        ctx.lineTo(bx + offset, by + offset);
      }
      ctx.stroke();
    }
  }

  ctx.textBaseline = 'alphabetic';
  for (const op of laid.ops) {
    if (op.rule) {
      ctx.fillStyle = INK;
      ctx.fillRect(op.rule[0], op.rule[2], op.rule[1] - op.rule[0], 2.5);
      continue;
    }
    ctx.font = fontOf(op.size, op.bold);
    ctx.textAlign = op.align ?? 'left';
    ctx.fillStyle = ctx.strokeStyle = op.link ? LINK_INK : INK;
    ctx.lineWidth = op.size * STRIKE;
    ctx.lineJoin = 'round';
    ctx.strokeText(op.text, op.x, op.y);
    ctx.fillText(op.text, op.x, op.y);
  }
  ctx.fillStyle = LINK_INK;
  for (const link of laid.links) ctx.fillRect(link.x, link.y + link.h * 0.92, link.w, 2.5);

  if (draft) {
    ctx.translate(width - PAGE.margin - 150, PAGE.margin + 70);
    ctx.rotate(-0.16);
    ctx.strokeStyle = 'rgba(190, 30, 30, 0.75)';
    ctx.fillStyle = 'rgba(190, 30, 30, 0.75)';
    ctx.lineWidth = 7;
    ctx.strokeRect(-150, -52, 300, 104);
    ctx.font = fontOf(70, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DRAFT', 0, 4);
  }
  ctx.restore();
}

// The link at a point on the page (px), or null.
export function linkAt(laid, x, y) {
  return laid.links.find((l) => x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h) ?? null;
}
