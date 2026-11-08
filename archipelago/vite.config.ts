import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';

// Every HTML page is an entry: the voyage, the work index, one page per work (written by
// scripts/build-pages.mjs), about, contact and the 404.
const pages: Record<string, string> = { index: resolve(__dirname, 'index.html') };
for (const p of ['about', 'contact', 'work']) {
  const f = resolve(__dirname, p, 'index.html');
  if (existsSync(f)) pages[p] = f;
}
if (existsSync(resolve(__dirname, '404.html'))) pages['404'] = resolve(__dirname, '404.html');
const workDir = resolve(__dirname, 'work');
if (existsSync(workDir)) {
  for (const slug of readdirSync(workDir, { withFileTypes: true })) {
    if (!slug.isDirectory()) continue;
    const f = resolve(workDir, slug.name, 'index.html');
    if (existsSync(f)) pages[`work-${slug.name}`] = f;
  }
}

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
    rollupOptions: { input: pages },
  },
  server: { host: true },
});
