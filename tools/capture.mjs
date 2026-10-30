// Captures a site into public/work/<slug>/ as WebP: the first screen, then one shot per
// scroll fraction. Needs Playwright (npm i -D playwright) and sharp (npm i -D sharp).
//
//   node tools/capture.mjs <slug> <url> [fractions] [waitMs]
//   node tools/capture.mjs volta https://su3doesign.github.io/VOLTA/ 0,0.6 6000
//
// The first fraction is saved as cover.webp, the rest as shot-<n>.webp.

import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const [slug, url, fractions = '0,0.5', waitMs = '6000'] = process.argv.slice(2);
if (!slug || !url) {
  console.error('usage: node tools/capture.mjs <slug> <url> [fractions] [waitMs]');
  process.exit(1);
}

const out = `public/work/${slug}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(Number(waitMs));

for (const [i, f] of fractions.split(',').map(Number).entries()) {
  await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f);
  await page.waitForTimeout(2500);
  const png = await page.screenshot();
  const name = i === 0 ? 'cover' : `shot-${i}`;
  await sharp(png).webp({ quality: 80 }).toFile(`${out}/${name}.webp`);
  console.log('wrote', `${out}/${name}.webp`);
}
await browser.close();
