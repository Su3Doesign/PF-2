// Fetches the Fontshare variable fonts into public/fonts/ so the site serves them itself.
//
// The ITF Free Font License allows self-hosting on your own website, but not handing the
// font files to anyone else, so they are fetched at build time and never committed
// (public/fonts/ is in .gitignore). Runs before `npm run dev` and `npm run build`.

import { mkdir, writeFile, access } from 'node:fs/promises';

const OUT = new URL('../public/fonts/', import.meta.url);

// [Fontshare slug, file name, API variant]. Variant 1 is the upright variable font; a
// weight asks for that static cut. Outline type uses the static 600, whose contours don't
// overlap, so a text stroke doesn't draw lines inside the letters.
const FONTS = [
  ['clash-display', 'clash-display.woff2', '1'],
  ['clash-display', 'clash-display-600.woff2', '600'],
  ['satoshi', 'satoshi.woff2', '1'],
];

const exists = (url) =>
  access(url).then(
    () => true,
    () => false,
  );

await mkdir(OUT, { recursive: true });
let failed = false;

for (const [slug, file, variant] of FONTS) {
  const target = new URL(file, OUT);
  if (await exists(target)) continue;
  try {
    const css = await (await fetch(`https://api.fontshare.com/v2/css?f[]=${slug}@${variant}&display=swap`)).text();
    const src = css.match(/url\('([^']+\.woff2)'\)/)?.[1];
    if (!src) throw new Error('no woff2 in the Fontshare stylesheet');
    const res = await fetch(src.startsWith('//') ? `https:${src}` : src);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(target, Buffer.from(await res.arrayBuffer()));
    console.log(`fonts: fetched ${file}`);
  } catch (err) {
    failed = true;
    console.warn(`fonts: could not fetch ${slug} (${err.message}). The page will fall back to system fonts.`);
  }
}

// A deploy without its fonts is a broken deploy; locally, keep working offline.
if (failed && process.env.CI) process.exit(1);
