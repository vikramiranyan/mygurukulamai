import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  base: './',
  plugins: [react(), {
    name: 'hosted-ai-csp',
    transformIndexHtml(html) {
      const withCsp = html.replace(
        'https://tessdata.projectnaptha.com; worker-src',
        'https://tessdata.projectnaptha.com https://*.workers.dev https://*.pages.dev; worker-src',
      );
      const withExternalScripts = withCsp.replace(
        'https://accounts.google.com https://cdn.jsdelivr.net; style-src',
        'https://accounts.google.com https://cdn.jsdelivr.net https://unpkg.com; style-src',
      );
      const withGoogleStyles = withExternalScripts.replace(
        'https://fonts.googleapis.com; font',
        'https://fonts.googleapis.com https://accounts.google.com; font',
      );
      return withGoogleStyles
        .replace('<script src="https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.min.js" defer></script>', '')
        .replace(/<script src="\.\/(legal-links|immersive-3d-teacher-v2|immersive-learning|teacher-context|immersive-lifecycle|child-experience-polish)\.js" defer><\/script>/g, '');
    },
  }, cloudflare()],
  resolve: {
    alias: [
      { find: /^pdfjs-dist$/, replacement: '/src/timetable/pdfjsClient.ts' },
    ],
  },
});