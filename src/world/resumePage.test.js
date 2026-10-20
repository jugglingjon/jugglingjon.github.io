import { describe, expect, it } from 'vitest';
import { resume } from '../../content/resume.js';
import { projects } from '../../content/projects.js';
import { PAGE, layoutResume, linkAt } from './resumePage.js';

const laid = layoutResume(resume, { projects });

describe('the résumé', () => {
  it('fits on its one page', () => {
    expect(laid.bottom).toBeLessThanOrEqual(PAGE.height - PAGE.margin);
    for (const op of laid.ops.filter((o) => o.text)) {
      const width = op.text.length * op.size * 0.6;
      const [from, to] = op.align === 'right' ? [op.x - width, op.x] : [op.x, op.x + width];
      expect(from, op.text).toBeGreaterThanOrEqual(PAGE.margin - 0.5);
      expect(to, op.text).toBeLessThanOrEqual(PAGE.width - PAGE.margin + 0.5);
    }
  });

  it('has links that go somewhere: a web address, or an email address', () => {
    expect(resume.links.length).toBeGreaterThan(0);
    for (const { label, text, url } of resume.links) {
      expect(label && text, url).toBeTruthy();
      expect(/^https:\/\/[^\s]+\.[^\s]+$/.test(url) || /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url), `${label}: ${url}`).toBe(true);
    }
  });

  it('lists selected work from the projects, each with its live site', () => {
    for (const slug of resume.work) {
      const project = projects.find((p) => p.slug === slug);
      expect(project, `content/projects.js has no "${slug}"`).toBeTruthy();
      expect(project.links?.live, `${slug} has no live link`).toMatch(/^https:\/\//);
    }
  });

  it('can click every link, and only where it is', () => {
    expect(laid.links).toHaveLength(resume.links.length + resume.work.length);
    for (const link of laid.links) {
      expect(linkAt(laid, link.x + link.w / 2, link.y + link.h / 2)).toBe(link);
      const others = laid.links.filter((l) => l !== link);
      expect(others.some((l) => l.x < link.x + link.w && link.x < l.x + l.w && l.y < link.y + link.h && link.y < l.y + l.h)).toBe(false);
    }
    expect(linkAt(laid, 5, 5)).toBe(null);
  });

  it('sets the type smaller to fit when there is more to say', () => {
    const longer = { ...resume, experience: [...resume.experience, ...resume.experience, ...resume.experience] };
    const squeezed = layoutResume(longer, { projects });
    expect(squeezed.body).toBeLessThan(laid.body);
    expect(squeezed.bottom).toBeLessThanOrEqual(PAGE.height - PAGE.margin);
  });
});
