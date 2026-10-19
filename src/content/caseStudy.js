import { airTime } from '../world/listings.js';
import { slotOf } from './lineup.js';

// The story behind a show: one article, used both in the app (the TV Guide
// overlay that INFO brings up) and on the project's own page. `url` resolves
// the project's media for wherever it's shown.

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);

// Plain text with blank lines between paragraphs → <p>s.
export function paragraphs(text = '') {
  return text
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p.replace(/\s*\n\s*/g, ' '))}</p>`)
    .join('\n');
}

const LINK_LABELS = { live: 'Visit the live site', repo: 'See the code', case: 'Read the write-up', video: 'Watch the video' };
const linkLabel = (key) => LINK_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);

function sources(list, url) {
  return [list]
    .flat()
    .map((src) => `<source src="${escapeHtml(url(src))}" type="video/${src.endsWith('.webm') ? 'webm' : 'mp4'}">`)
    .join('');
}

// `channel` is the show's channel number (which sets its time slot too).
export function renderCaseStudy(project, { url = (path) => path, channel = null, headingId = `story-${project.slug}` } = {}) {
  const p = project;
  const facts = [
    ['Role', p.role],
    ['Client', p.client],
    ['Year', p.year],
    ['Credits', p.credits?.join(' · ')],
  ].filter(([, value]) => value);
  const alt = (src) => p.alt?.[src] ?? p.gallery?.find((g) => g.src === src)?.alt ?? '';
  return `<article class="story" aria-labelledby="${headingId}">
  <header class="story__masthead">
    ${channel ? `<span class="story__channel">CH ${String(channel).padStart(2, '0')}</span>
    <span class="story__time">${airTime(slotOf(channel))}</span>` : ''}
    <span class="story__kicker">Tonight’s feature</span>
  </header>
  ${p.placeholder ? '<p class="story__placeholder">Placeholder content: replace it in content/projects.js</p>' : ''}
  <h1 class="story__title" id="${headingId}">${escapeHtml(p.title ?? p.name)}</h1>
  ${p.summary ? `<p class="story__summary">${escapeHtml(p.summary)}</p>` : ''}
  ${p.hero ? `<figure class="story__hero"><img src="${escapeHtml(url(p.hero))}" alt="${escapeHtml(alt(p.hero))}" decoding="async"></figure>` : ''}
  ${
    facts.length || p.tech?.length
      ? `<dl class="story__facts">
    ${facts.map(([term, value]) => `<div><dt>${term}</dt><dd>${escapeHtml(value)}</dd></div>`).join('\n    ')}
    ${p.tech?.length ? `<div><dt>Made with</dt><dd><ul class="story__tags">${p.tech.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul></dd></div>` : ''}
  </dl>`
      : ''
  }
  <div class="story__body">
${paragraphs(p.story)}
  </div>
  ${
    p.video
      ? `<figure class="story__video"><video controls playsinline preload="none"${p.video.poster ? ` poster="${escapeHtml(url(p.video.poster))}"` : ''}>${sources(p.video.src, url)}</video></figure>`
      : ''
  }
  ${
    p.gallery?.length
      ? `<ul class="story__gallery">
    ${p.gallery
      .map(
        (g) =>
          `<li><figure><img src="${escapeHtml(url(g.src))}" alt="${escapeHtml(g.alt ?? '')}" loading="lazy" decoding="async">${g.caption ? `<figcaption>${escapeHtml(g.caption)}</figcaption>` : ''}</figure></li>`,
      )
      .join('\n    ')}
  </ul>`
      : ''
  }
  ${
    p.links && Object.keys(p.links).length
      ? `<ul class="story__links">
    ${Object.entries(p.links)
      .map(([key, href]) => `<li><a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(linkLabel(key))}</a></li>`)
      .join('\n    ')}
  </ul>`
      : ''
  }
</article>`;
}
