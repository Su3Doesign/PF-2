// Imports the 3D and visual-design work from the PF-1 portfolio (thesumanth.com) into this
// site: the three personal worlds, the seven-step method, the sixteen clients, the thirty-nine
// studies, the commission tiers and the profile.
//
//   node tools/import-pf1.mjs [path/to/PF-1/src/data/content.json]
//
// Media paths are rewritten from PF-1's assets/... to v1/assets/..., the library this repository
// already serves for its first version. Copy any new files from PF-1's public/assets/ (images,
// videos, posters and thumbs/640) into public/v1/assets/ before running.

import { readFile, writeFile, access } from 'node:fs/promises';

const src = process.argv[2] ?? '../PF-1/src/data/content.json';
const data = JSON.parse(await readFile(src, 'utf8'));

const media = (m) => {
  if (!m) return m;
  const out = { ...m };
  for (const k of ['src', 'thumb', 'poster']) if (out[k]) out[k] = 'v1/' + out[k];
  return out;
};

const result = {
  profile: { ...data.profile, desk: data.profile.desk ? 'v1/' + data.profile.desk : undefined },
  worlds: data.worlds.map((w) => ({
    id: w.id,
    title: w.title,
    jp: w.jp,
    sub: w.sub,
    year: w.year,
    note: w.note,
    tags: w.tags,
    alt: w.alt,
    plate: media(w.plate),
    shots: w.shots.map(media),
  })),
  steps: data.steps.map(([name, text]) => ({ name, text })),
  clients: data.clients.map((c) => ({ ...c, files: c.files.map(media) })),
  studies: data.studies.map(media),
  tiers: data.tiers,
};

// Every referenced file must exist, or the page would show holes.
const missing = [];
const check = async (p) => p && (await access('public/' + p).catch(() => missing.push(p)));
for (const w of result.worlds) for (const m of [w.plate, ...w.shots]) await Promise.all([check(m.src), check(m.thumb), check(m.poster)]);
for (const c of result.clients) for (const m of c.files) await Promise.all([check(m.src), check(m.thumb), check(m.poster)]);
for (const m of result.studies) await Promise.all([check(m.src), check(m.thumb)]);
if (missing.length) {
  console.error(`import-pf1: ${missing.length} files missing under public/:\n  ` + missing.join('\n  '));
  process.exit(1);
}

await writeFile('src/data/pf1.json', JSON.stringify(result, null, 1) + '\n');
console.log(`import-pf1: ${result.worlds.length} worlds, ${result.clients.length} clients, ${result.studies.length} studies, ${result.steps.length} steps`);
