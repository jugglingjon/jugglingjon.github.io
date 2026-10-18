import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { projects } from '../../content/projects.js';
import { site } from '../../content/site.js';
import { mediaFiles } from './media.js';

// Checks content/projects.js against what the TV, the listings and the pages
// can show, so a typo or a missing file fails here rather than on air.

const OSD = /^[A-Za-z0-9 \-.,:·/&!?+]+$/; // the on-screen display's font
const TYPES = { image: ['src'], slideshow: ['slides'], scroll: ['src'], video: ['src', 'poster'] };
const onDisk = (project, path) => (path.startsWith('/') ? `public${path}` : `public/work/${project.slug}/${path}`);

describe('site', () => {
  it('has a title, a description and a published URL ending in /', () => {
    expect(site.title).toBeTruthy();
    expect(site.description).toBeTruthy();
    expect(site.url).toMatch(/^https:\/\/.+\/$/);
  });
});

describe.each(projects.map((p) => [p.slug, p]))('%s', (slug, project) => {
  it('has a URL-safe slug of its own', () => {
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(projects.filter((p) => p.slug === slug)).toHaveLength(1);
  });

  it('has a channel name that fits the listings and the on-screen display', () => {
    expect(project.name.length).toBeLessThanOrEqual(18);
    expect(project.name).toMatch(OSD);
  });

  it('has a blurb that fits on one line of the listings, and a short summary', () => {
    expect(project.blurb.length).toBeLessThanOrEqual(32);
    expect(project.summary.length).toBeLessThanOrEqual(155);
    expect(project.title).toBeTruthy();
  });

  it('says what plays on its channel', () => {
    const needs = TYPES[project.tv?.type];
    expect(needs, `tv.type must be one of ${Object.keys(TYPES).join(', ')}`).toBeTruthy();
    for (const key of needs) expect(project.tv[key], `tv.${key}`).toBeTruthy();
    if (project.tv.slides) expect(project.tv.slides.length).toBeGreaterThan(0);
    if (project.tv.fit) expect(['cover', 'contain']).toContain(project.tv.fit);
  });

  it('has every media file it names', () => {
    const missing = mediaFiles(project).filter((path) => !/^(https?:)?\/\//.test(path) && !existsSync(onDisk(project, path)));
    expect(missing).toEqual([]);
  });

  it('describes its pictures for screen readers', () => {
    const { tv } = project;
    const stills = [tv.type === 'video' ? tv.poster : null, tv.src, ...(tv.slides ?? []), project.hero].filter((s) => s && !/\.(mp4|webm)$/.test(s));
    for (const src of stills) expect(project.alt?.[src] ?? project.gallery?.find((g) => g.src === src)?.alt, src).toBeTruthy();
    for (const g of project.gallery ?? []) expect(g.alt, g.src).toBeTruthy();
  });
});
