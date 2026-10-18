import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Builds the static side of the site from content/ (see pages.js): a page per
// project at work/<slug>/, the index at work/, sitemap.xml and robots.txt, and
// the TV page's title, description, link previews and plain links. The dev
// server serves the same pages straight from the content, so edits show up on
// a refresh.

const ROOT = new URL('../../', import.meta.url);
const CSS = fileURLToPath(new URL('./story.css', import.meta.url));
const MODULES = ['/content/projects.js', '/content/site.js', '/src/content/pages.js'];

const fromDisk = (path) => import(pathToFileURL(fileURLToPath(new URL(`.${path}`, ROOT))).href);

async function content(load) {
  const [{ projects }, { site }, pages] = await Promise.all(MODULES.map(load));
  return { projects, site, pages };
}

// What a request under the site root is, if it's one of ours.
async function page(path, load) {
  const { projects, site, pages } = await content(load);
  if (path === '/work/story.css') return { type: 'text/css', body: readFileSync(CSS, 'utf8') };
  if (path === '/work' || path === '/work/' || path === '/work/index.html') return { redirect: path === '/work' && '/work/', type: 'text/html', body: pages.renderWorkIndex(projects, { site }) };
  if (path === '/sitemap.xml') return { type: 'application/xml', body: pages.renderSitemap(projects, { site }) };
  if (path === '/robots.txt') return { type: 'text/plain', body: pages.renderRobots({ site }) };
  const match = path.match(/^\/work\/([^/]+)(\/|\/index\.html)?$/);
  const project = match && projects.find((p) => p.slug === match[1]);
  if (!project) return null;
  // Its media paths are relative to its folder, so it needs the trailing slash.
  if (!match[2]) return { redirect: `${path}/` };
  return { type: 'text/html', body: pages.renderProjectPage(project, { site, projects }) };
}

export function workPages() {
  let server = null;
  const load = (path) => (server ? server.ssrLoadModule(path) : fromDisk(path));
  return {
    name: 'work-pages',

    configureServer(dev) {
      server = dev;
      dev.middlewares.use(async (req, res, next) => {
        try {
          const found = await page(decodeURIComponent((req.url ?? '').split('?')[0]), load);
          if (!found) return next();
          if (found.redirect) {
            res.writeHead(301, { Location: found.redirect });
            return res.end();
          }
          res.setHeader('Content-Type', `${found.type}; charset=utf-8`);
          res.end(found.body);
        } catch (error) {
          next(error);
        }
      });
    },

    async transformIndexHtml(html) {
      const { projects, site, pages } = await content(load);
      const escape = (await load('/src/content/caseStudy.js')).escapeHtml;
      return html
        .replace(/<title>[^<]*<\/title>/, `<title>${escape(site.title)} · ${escape(site.tagline)}</title>`)
        .replace('<!-- site:head -->', pages.renderHomeHead({ site }))
        .replace('<!-- site:links -->', pages.renderWorkLinks(projects));
    },

    async generateBundle() {
      const { projects, site, pages } = await content(load);
      const emit = (fileName, source) => this.emitFile({ type: 'asset', fileName, source });
      for (const project of projects) emit(`work/${project.slug}/index.html`, pages.renderProjectPage(project, { site, projects }));
      emit('work/index.html', pages.renderWorkIndex(projects, { site }));
      emit('work/story.css', readFileSync(CSS, 'utf8'));
      emit('sitemap.xml', pages.renderSitemap(projects, { site }));
      emit('robots.txt', pages.renderRobots({ site }));
    },
  };
}
