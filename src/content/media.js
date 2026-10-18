// Where a project's media lives. In content/projects.js a plain file name is
// in the project's own folder (public/work/<slug>/), a path starting with /
// is from public/, and a full URL is left as it is.

const ABSOLUTE = /^(https?:)?\/\/|^data:|^blob:/;

// For the app, under `base` (Vite's BASE_URL, e.g. './' or '/').
export function mediaUrl(project, path, base = './') {
  if (!path || ABSOLUTE.test(path)) return path;
  if (path.startsWith('/')) return `${base}${path.slice(1)}`;
  return `${base}work/${project.slug}/${path}`;
}

// For a project's own page, which sits in that same folder (work/<slug>/).
export function pageMediaUrl(path) {
  if (!path || ABSOLUTE.test(path)) return path;
  if (path.startsWith('/')) return `../..${path}`;
  return path;
}

// Every file a project names, as written (for checking they're all there).
export function mediaFiles(project) {
  const { tv = {}, video, gallery = [] } = project;
  return [
    tv.src,
    ...(tv.slides ?? []),
    tv.poster,
    project.music,
    project.hero,
    project.share,
    ...gallery.map((g) => g.src),
    video?.src,
    video?.poster,
  ]
    .flat()
    .filter(Boolean);
}
