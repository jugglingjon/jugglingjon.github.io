import { describe, expect, it } from 'vitest';
import { escapeHtml, paragraphs, renderCaseStudy } from './caseStudy.js';
import { mediaUrl, pageMediaUrl } from './media.js';
import { renderProjectPage, renderRobots, renderSitemap, renderWorkIndex, renderWorkLinks } from './pages.js';

const site = { title: 'Test Site', description: 'Work.', tagline: 'All of it', url: 'https://example.com/site/', credits: ['Thanks'] };
const project = (slug, extra = {}) => ({
  slug,
  name: slug.toUpperCase(),
  blurb: 'A blurb',
  title: `${slug} <b>title</b>`,
  summary: 'Summary & more.',
  story: 'First paragraph\nstill first.\n\nSecond <i>one</i>.',
  hero: 'hero.jpg',
  tv: { type: 'image', src: 'a.png' },
  ...extra,
});

describe('media paths', () => {
  const p = { slug: 'demo' };
  it('finds files in the project folder, from public/, or anywhere', () => {
    expect(mediaUrl(p, 'a.png', '/base/')).toBe('/base/work/demo/a.png');
    expect(mediaUrl(p, '/media/x.mp3', './')).toBe('./media/x.mp3');
    expect(mediaUrl(p, 'https://cdn.example/x.png')).toBe('https://cdn.example/x.png');
    expect(pageMediaUrl('a.png')).toBe('a.png');
    expect(pageMediaUrl('/media/x.mp3')).toBe('../../media/x.mp3');
  });
});

describe('the case study', () => {
  it('escapes text and turns blank lines into paragraphs', () => {
    expect(escapeHtml('<a href="x">&\'')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
    expect(paragraphs('one\ntwo\n\nthree')).toBe('<p>one two</p>\n<p>three</p>');
    const html = renderCaseStudy(project('demo'));
    expect(html).toContain('demo &lt;b&gt;title&lt;/b&gt;');
    expect(html).toContain('<p>Second &lt;i&gt;one&lt;/i&gt;.</p>');
    expect(html).not.toContain('<b>');
  });

  it('leaves out what a project hasn’t got', () => {
    const html = renderCaseStudy(project('demo'));
    for (const part of ['story__facts', 'story__gallery', 'story__links', 'story__video', 'story__placeholder']) expect(html).not.toContain(part);
  });

  it('opens outside links in a new tab, safely, and flags placeholders', () => {
    const html = renderCaseStudy(project('demo', { links: { live: 'https://x.test' }, placeholder: true }));
    expect(html).toContain('href="https://x.test" target="_blank" rel="noopener">Visit the live site</a>');
    expect(html).toContain('story__placeholder');
  });
});

describe('the static pages', () => {
  const projects = [project('one'), project('two', { share: 'card.jpg' }), project('three')];

  it('give each project a page with absolute link-preview URLs and relative media', () => {
    const html = renderProjectPage(projects[1], { site, projects });
    expect(html).toContain('<link rel="canonical" href="https://example.com/site/work/two/">');
    expect(html).toContain('<meta property="og:image" content="https://example.com/site/work/two/card.jpg">');
    expect(html).toContain('<img src="hero.jpg"');
    expect(html).toContain('href="../story.css"');
    expect(html).toContain('href="../../?channel=two"');
    expect(html).toContain('CH 02');
    expect(html).toContain('href="../one/">← ONE');
    expect(html).toContain('href="../three/">THREE →');
    expect(html).toContain('<title>two &lt;b&gt;title&lt;/b&gt; · Test Site</title>');
  });

  it('number and order the work by channel, with a project that asks for one on it', () => {
    const lineup = [project('one'), project('eight', { channel: 8 }), project('two')];
    const page = renderProjectPage(lineup[1], { site, projects: lineup });
    expect(page).toContain('CH 08');
    expect(page).toContain('10:30'); // its time slot follows its number
    expect(page).toContain('href="../two/">← TWO');
    expect(renderProjectPage(lineup[2], { site, projects: lineup })).toContain('CH 02');
    const index = renderWorkIndex(lineup, { site });
    expect(index.indexOf('href="two/"')).toBeLessThan(index.indexOf('href="eight/"'));
    expect(index).toContain('CH 08');
  });

  it('name the author in the footer, unless the site is already named after them', () => {
    expect(renderWorkIndex(projects, { site: { ...site, author: 'Jo Bloggs' } })).toContain('<p>Test Site · Jo Bloggs</p>');
    expect(renderWorkIndex(projects, { site: { ...site, title: 'Jo Bloggs', author: 'Jo Bloggs' } })).toContain('<p>Jo Bloggs</p>');
  });

  it('list every project on the index, with thumbnails from their folders', () => {
    const html = renderWorkIndex(projects, { site });
    for (const p of projects) expect(html).toContain(`href="${p.slug}/"`);
    expect(html).toContain('src="one/hero.jpg"');
  });

  it('write a sitemap, robots.txt and plain links for the TV page', () => {
    const sitemap = renderSitemap(projects, { site });
    expect(sitemap.match(/<loc>/g)).toHaveLength(2 + projects.length);
    expect(sitemap).toContain('<loc>https://example.com/site/work/three/</loc>');
    expect(renderRobots({ site })).toContain('Sitemap: https://example.com/site/sitemap.xml');
    expect(renderWorkLinks(projects)).toContain('<a href="work/one/">');
  });
});
