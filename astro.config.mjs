import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Change this to your real domain before deploying — it powers canonical URLs,
  // Open Graph tags and the sitemap.
  site: 'https://mohamed.example',

  output: 'static',

  build: {
    inlineStylesheets: 'auto',
  },

  devToolbar: {
    enabled: false,
  },

  vite: {
    build: {
      cssMinify: 'lightningcss',
    },
  },
});
