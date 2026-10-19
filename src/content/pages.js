import { escapeHtml, renderCaseStudy } from './caseStudy.js';
import { pageMediaUrl } from './media.js';
import { airTime } from '../world/listings.js';
import { numberedProjects, slotOf } from './lineup.js';

// The static side of the site, written out at build time (see vitePlugin.js):
// a plain page per project at work/<slug>/, an index of them all at work/, a
// sitemap and robots.txt. They need no WebGL or JavaScript, so search engines,
// link previews and anyone whose browser can't run the TV still get the work,
// and each one links back into the TV, tuned to that show.

const absolute = (site, path) => new URL(path, site.url).href;
// A project's media, from work/index.html (one folder up from the project's).
const fromIndex = (project, path) => {
  const local = pageMediaUrl(path);
  return local === path && !path.startsWith('/') && !/^(https?:)?\/\//.test(path) ? `${project.slug}/${path}` : local.replace(/^\.\.\/\.\.\//, '../');
};

function head({ site, title, description, canonical, image, css, type = 'website' }) {
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${escapeHtml(site.title)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
${image ? `<meta property="og:image" content="${escapeHtml(image)}">\n<meta name="twitter:card" content="summary_large_image">` : '<meta name="twitter:card" content="summary">'}
${site.author ? `<meta name="author" content="${escapeHtml(site.author)}">` : ''}
<link rel="stylesheet" href="${css}">`;
}

function footer(site) {
  return `<footer class="page__footer">
  <p>${escapeHtml(site.title)}${site.author && site.author !== site.title ? ` · ${escapeHtml(site.author)}` : ''}</p>
  ${site.credits?.length ? `<ul>${site.credits.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>` : ''}
</footer>`;
}

// work/<slug>/index.html. Media paths are relative to that folder, which is
// where the project's media lives too.
export function renderProjectPage(project, { site, projects }) {
  const listed = numberedProjects(projects);
  const index = listed.findIndex((entry) => entry.project === project);
  const channel = listed[index].number;
  const canonical = absolute(site, `work/${project.slug}/`);
  const share = project.share ?? project.hero;
  const image = share && absolute(site, `work/${project.slug}/${pageMediaUrl(share)}`);
  const prev = listed[index - 1]?.project;
  const next = listed[index + 1]?.project;
  return `<!doctype html>
<html lang="en">
<head>
${head({ site, title: `${project.title ?? project.name} · ${site.title}`, description: project.summary ?? project.blurb ?? '', canonical, image, css: '../story.css', type: 'article' })}
</head>
<body class="page">
<header class="page__header">
  <a class="page__site" href="../../">${escapeHtml(site.title)}</a>
  <nav aria-label="Site"><a href="../">All work</a></nav>
</header>
<main class="page__main">
${renderCaseStudy(project, { url: pageMediaUrl, channel })}
<p class="page__watch"><a class="page__tv" href="../../?channel=${encodeURIComponent(project.slug)}">Watch it on the TV · CH ${String(channel).padStart(2, '0')}</a></p>
<nav class="page__pager" aria-label="More work">
  ${prev ? `<a rel="prev" href="../${prev.slug}/">← ${escapeHtml(prev.name)}</a>` : '<span></span>'}
  ${next ? `<a rel="next" href="../${next.slug}/">${escapeHtml(next.name)} →</a>` : '<span></span>'}
</nav>
</main>
${footer(site)}
</body>
</html>
`;
}

// work/index.html: tonight's listings, as a page.
export function renderWorkIndex(projects, { site }) {
  const canonical = absolute(site, 'work/');
  const rows = numberedProjects(projects)
    .map(({ project: p, number }) => {
      const thumb = p.hero ? `<img src="${escapeHtml(fromIndex(p, p.hero))}" alt="" loading="lazy" decoding="async">` : '';
      return `  <li class="listing">
    <a href="${p.slug}/">
      ${thumb}
      <span class="listing__channel">CH ${String(number).padStart(2, '0')}</span>
      <span class="listing__time">${airTime(slotOf(number))}</span>
      <span class="listing__name">${escapeHtml(p.name)}</span>
      <span class="listing__blurb">${escapeHtml(p.summary ?? p.blurb ?? '')}</span>
    </a>
  </li>`;
    })
    .join('\n');
  return `<!doctype html>
<html lang="en">
<head>
${head({ site, title: `All work · ${site.title}`, description: site.description, canonical, image: site.shareImage && absolute(site, site.shareImage), css: 'story.css' })}
</head>
<body class="page">
<header class="page__header">
  <a class="page__site" href="../">${escapeHtml(site.title)}</a>
  <nav aria-label="Site"><a href="../">Back to the TV</a></nav>
</header>
<main class="page__main">
<header class="story__masthead"><span class="story__kicker">Tonight</span></header>
<h1 class="story__title">${escapeHtml(site.tagline ?? 'All work')}</h1>
<p class="story__summary">${escapeHtml(site.description)}</p>
<ol class="listings">
${rows}
</ol>
</main>
${footer(site)}
</body>
</html>
`;
}

export function renderSitemap(projects, { site }) {
  const urls = ['', 'work/', ...projects.map((p) => `work/${p.slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${escapeHtml(absolute(site, u))}</loc></url>`).join('\n')}
</urlset>
`;
}

export const renderRobots = ({ site }) => `User-agent: *\nAllow: /\nSitemap: ${absolute(site, 'sitemap.xml')}\n`;

// For the TV's own page (index.html): its title and description, link
// previews, and plain links to every project, for crawlers, screen readers,
// keyboards and browsers without WebGL.
export function renderHomeHead({ site }) {
  return `<meta name="description" content="${escapeHtml(site.description)}">
<link rel="canonical" href="${escapeHtml(site.url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${escapeHtml(site.title)}">
<meta property="og:title" content="${escapeHtml(site.title)}">
<meta property="og:description" content="${escapeHtml(site.description)}">
<meta property="og:url" content="${escapeHtml(site.url)}">
${site.shareImage ? `<meta property="og:image" content="${escapeHtml(absolute(site, site.shareImage))}">\n<meta name="twitter:card" content="summary_large_image">` : ''}
<link rel="sitemap" type="application/xml" href="sitemap.xml">`;
}

export function renderWorkLinks(projects) {
  return `<nav class="work-links" aria-label="All work, as plain pages">
  <a class="work-links__skip" href="work/">Browse the work as plain pages</a>
  <ul>
${projects.map((p) => `    <li><a href="work/${p.slug}/">${escapeHtml(p.title ?? p.name)}</a></li>`).join('\n')}
  </ul>
</nav>`;
}
