import { defineConfig } from 'vite';
import { workPages } from './src/content/vitePlugin.js';

export default defineConfig({
  // Relative asset paths so the build runs from any folder on a plain PHP host.
  base: './',
  plugins: [workPages()], // the static pages for each project, from content/
  build: {
    target: 'es2022',
    // three.js alone is ~700 kB minified; the lab ships as a single chunk for now.
    chunkSizeWarningLimit: 1200,
  },
});
