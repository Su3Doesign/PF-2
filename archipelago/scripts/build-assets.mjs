// Asset pipeline for The Archipelago.
//
// Models: Sumanth's production GLBs from the project repositories, re-packed lighter for
// the voyage (textures capped, meshopt geometry). Images: renders, boards and Behance
// packs, cropped into one cover, one thumbnail and a gallery per work.
//
//   SU3_REPOS=/path/to/repo/clones DRIVE=/path/to/drive/download node scripts/build-assets.mjs
//
// DRIVE must hold the loose IMG_* boards and p/NN/ (the Behance-Upload-Drafts folders,
// renamed to their two-digit number).

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, simplify, weld, textureCompress, draco, quantize, reorder, meshopt } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPOS = process.env.SU3_REPOS || '/home/user/su3doesign';
const DRIVE = process.env.DRIVE || '/tmp/drive';
const PF2 = path.resolve(ROOT, '..', 'public');
const ONLY = process.argv.slice(2);
const want = (k) => !ONLY.length || ONLY.includes(k);
const out = (...p) => { const f = path.join(ROOT, ...p); fs.mkdirSync(path.dirname(f), { recursive: true }); return f; };

// ------------------------------------------------------------------ models
if (want('models')) {
  await MeshoptSimplifier.ready; await MeshoptEncoder.ready; await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder,
  });
  const MODELS = [
    { id: 'hyperion', file: 'hyperion-site/models/hyperion.glb', tex: 1024, ratio: 0.26, comp: 'meshopt' },
    { id: 'f1', file: 'hyperion-site/models/f1.glb', tex: 1024, ratio: 0.2, comp: 'meshopt' },
    { id: 'agera', file: 'Coachwork/issues/02-koenigsegg-agera/model.glb', tex: 1024, ratio: 0.5 },
    { id: 'helmet', file: 'vanta-flightworks/model.glb', tex: 1024, ratio: 1 },
    { id: 'camera', file: 'halden-portrait-studio/model.glb', tex: 1024, ratio: 1 },
    { id: 'head', file: 'parian-atelie/model.glb', tex: 1024, ratio: 1 },
    { id: 'gate', file: 'Tirthavel/assets/model/gate.glb', tex: 1024, ratio: 0.6 },
  ];
  const meta = {};
  for (const m of MODELS) {
    const src = path.join(REPOS, m.file);
    if (!fs.existsSync(src)) { console.warn('missing', src); continue; }
    const doc = await io.read(src);
    for (const e of doc.getRoot().listExtensionsUsed()) if (e.extensionName === 'KHR_draco_mesh_compression') e.dispose();
    await doc.transform(
      dedup(), prune(),
      textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [m.tex, m.tex], quality: 74 }),
      ...(m.ratio < 1 ? [weld({ tolerance: 0.00005 }), simplify({ simplifier: MeshoptSimplifier, ratio: m.ratio, error: 0.0008 })] : []),
      ...(m.comp === 'meshopt'
        ? [quantize({ quantizePosition: 14, quantizeNormal: 8, quantizeTexcoord: 12 }), reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'high' })]
        : [draco({ method: 'edgebreaker', quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 })]),
    );
    const f = out('public/models', `${m.id}.glb`);
    await io.write(f, doc);
    meta[m.id] = { bytes: fs.statSync(f).size };
    console.log(m.id.padEnd(9), (fs.statSync(src).size / 1048576).toFixed(2), '->', (fs.statSync(f).size / 1048576).toFixed(2), 'MB');
  }
  fs.writeFileSync(out('src/data/models.json'), JSON.stringify(meta, null, 1));
}

// ------------------------------------------------------------------ images
// Each entry: [slug, cover, ...gallery]. A source is a path, or [path, segIndex, segHeight]
// to crop one panel out of a tall board.
const P = (n, f) => path.join(DRIVE, 'p', n, f);
const D = (f) => path.join(DRIVE, f);
const R = (f) => path.join(REPOS, f);
const V = (f) => path.join(PF2, 'v1/assets/images', f);
const W = (f) => path.join(PF2, 'work', f);
const seg = (f, i, h = 500) => [D(f), i, h];
const IMAGES = [
  // Machines
  ['hyperion', R('hyperion-site/renders/hyperion/hero-2400.webp'), R('hyperion-site/renders/hyperion/side-1600.webp'), R('hyperion-site/renders/hyperion/cockpit-1600.webp'), R('hyperion-site/renders/hyperion/exploded-1600.webp'), R('hyperion-site/renders/hyperion/engine-1600.webp'), P('39', 'images/01.jpg'), P('39', 'images/02.jpg')],
  ['hyperion-case', P('42', 'images/01.jpg'), P('42', 'images/02.jpg')],
  ['alpine', R('hyperion-site/renders/f1/hero-2400.webp'), R('hyperion-site/renders/f1/side-1600.webp'), R('hyperion-site/renders/f1/exploded-1600.webp'), R('hyperion-site/renders/f1/cockpit-1600.webp'), R('hyperion-site/renders/f1/wheel-1600.webp'), P('40', 'images/02.jpg')],
  ['coachwork', P('43', 'images/01.jpg'), R('Coachwork/case-study/img/drive-agera.jpg'), R('Coachwork/case-study/img/garage-chiron.jpg'), R('Coachwork/case-study/img/rims-five-cars.jpg'), P('41', 'images/01.jpg'), P('41', 'images/02.jpg'), P('43', 'images/02.jpg')],
  ['vanta', P('37', 'images/01.jpg'), P('37', 'images/02.jpg')],
  // Monuments
  ['parian', P('38', 'images/01.jpg'), P('38', 'images/02.jpg')],
  ['halden', P('36', 'images/01.jpg')],
  ['altair', W('altair-estates/cover.webp'), W('altair-estates/house.webp'), W('altair-estates/canal.webp'), W('altair-estates/fountain.webp'), W('altair-estates/blueprint.webp'), P('35', 'images/02.jpg')],
  ['sculpting', P('17', 'images/01.jpg'), P('17', 'images/02.jpg')],
  ['clock', P('08', 'images/01.jpg'), P('08', 'images/02.jpg')],
  ['extinguisher', P('09', 'images/01.jpg'), P('09', 'images/02.jpg')],
  ['interiors', P('18', 'images/02.jpg'), P('18', 'images/01.jpg')],
  // Worlds
  ['ringgate', W('ring-gate/cover.webp'), W('ring-gate/site.webp'), W('ring-gate/door.webp'), W('ring-gate/island.webp'), W('ring-gate/seawall.webp'), P('29', 'images/02.jpg')],
  ['rotunda', W('flooded-rotunda/cover.webp'), W('flooded-rotunda/keeper.webp'), W('flooded-rotunda/shafts.webp'), W('flooded-rotunda/site.webp'), W('flooded-rotunda/page.webp')],
  ['overgrown', W('overgrown-archive/cover.webp'), W('overgrown-archive/worlds.webp'), W('overgrown-archive/method.webp'), W('overgrown-archive/clients.webp'), W('overgrown-archive/sea.webp')],
  ['castle', path.join(PF2, 'worlds/castle/09-grand-orbit.webp'), ...['07-astronomy-tower', '03-lake-sunset', '08-station-night', '15-covered-bridge', '02-boats-night'].map((n) => path.join(PF2, `worlds/castle/${n}.webp`))],
  ['koi', P('20', 'images/01.jpg'), P('20', 'images/02.jpg'), V('koipond-render-2.webp'), V('koipond-render-3.webp'), V('koipond-render-4.webp')],
  ['fudo', P('06', 'images/01.jpg'), P('06', 'images/02.jpg'), V('fudomyo-render-1.webp'), V('fudomyo-render-2.webp')],
  ['roman', P('10', 'images/01.jpg'), P('10', 'images/02.jpg'), V('japa-render-1.webp'), V('japa-render-2.webp'), V('japa-render-3.webp')],
  ['caves', P('07', 'images/01.jpg'), P('07', 'images/02.jpg')],
  // Brands: the tower
  ['gcburger', P('32', 'images/01.jpg'), P('32', 'images/02.jpg'), ...[5, 1, 9, 12, 16, 20, 24].map((n) => V(`gcburger-campaign-${n}.webp`))],
  ['kerb', P('44', 'images/01.png'), P('44', 'cover-808x632.jpg')],
  ['lotus', W('lotus-constructions/cover.webp'), W('lotus-constructions/render.webp'), W('lotus-constructions/structure.webp'), P('30', 'images/02.jpg')],
  ['capq', W('capq/cover.webp'), W('capq/form.webp'), P('28', 'images/02.jpg')],
  ['magma', P('19', 'images/02.jpg'), P('19', 'images/01.jpg'), P('19', 'cover-808x632.jpg')],
  ['rem', P('45', 'images/rem-ig-01.png'), ...['rem-ig-02', 'rem-ig-06', 'rem-ig-04', 'rem-ig-05', 'rem-ig-07', 'rem-ig-08', 'rem-sheet-01'].map((n) => P('45', `images/${n}.png`))],
  ['deccan', seg('IMG_2336.JPG', 0), ...[5, 7, 13, 15, 19, 21].map((i) => seg('IMG_2336.JPG', i))],
  ['lagrange', seg('IMG_2330.JPG', 0, 1000), ...[7, 23, 24, 26, 29, 19].map((i) => seg('IMG_2330.JPG', i, 1000))],
  ['maruneta', seg('IMG_2331.JPG', 0), ...[5, 7, 20, 22, 25, 27].map((i) => seg('IMG_2331.JPG', i))],
  ['rujuvu', seg('IMG_2332.JPG', 0), ...[5, 8, 14, 22, 23, 24].map((i) => seg('IMG_2332.JPG', i))],
  ['bsnl', seg('IMG_2335.JPG', 0), ...[10, 14, 25, 26, 28, 35].map((i) => seg('IMG_2335.JPG', i))],
  ['kosh', seg('IMG_2337.JPG', 0), ...[1, 4, 9, 16, 20, 21].map((i) => seg('IMG_2337.JPG', i))],
  ['photon', seg('IMG_2339.JPG', 0), ...[5, 11, 15, 20, 23, 24].map((i) => seg('IMG_2339.JPG', i))],
  ['mitti', D('IMG_5739.PNG'), ...[0, 4, 6, 12, 13, 14, 19].map((i) => seg('IMG_2340.JPG', i))],
  ['three-houses', P('25', 'images/01.jpg'), P('25', 'images/02.jpg')],
  ['midea', P('31', 'images/01.jpg'), P('31', 'images/02.jpg')],
  ['investohome', P('27', 'images/01.jpg'), P('27', 'images/02.jpg')],
  ['brand-systems', P('24', 'images/01.jpg'), P('24', 'images/02.jpg')],
  ['shelf-table', P('26', 'images/01.jpg'), P('26', 'images/02.jpg')],
  // Archive
  ['front-doors', P('05', 'images/01.jpg'), P('05', 'images/02.jpg')],
  ['photo-manipulation', P('01', 'images/01.jpg'), P('01', 'images/02.jpeg')],
  ['digital-art', P('02', 'images/01.jpeg')],
  ['illustrations', P('03', 'images/01.jpeg'), P('03', 'images/02.jpeg')],
  ['magazine', P('04', 'images/01.jpeg')],
  ['advertisements', P('11', 'images/01.jpeg'), P('11', 'images/02.jpeg')],
  ['compositing', P('13', 'images/01.jpg'), P('13', 'images/02.jpg')],
  ['graphic-designs', P('21', 'images/01.png')],
  ['ebook', P('22', 'cover-808x632.jpg')],
  // About: the personal identity
  ['self', D('IMG_5741.PNG'), D('IMG_2095.JPG'), D('IMG_2094.JPG')],
];

async function load(src) {
  if (Array.isArray(src)) {
    const [f, i, h] = src; const m = await sharp(f).metadata();
    const top = i * h; const height = Math.min(h, m.height - top);
    return sharp(await sharp(f, { limitInputPixels: false }).extract({ left: 0, top, width: m.width, height }).toBuffer());
  }
  return sharp(src, { limitInputPixels: false });
}

if (want('images')) {
  const meta = {};
  for (const [slug, cover, ...gallery] of IMAGES) {
    const dir = `img/work/${slug}`;
    meta[slug] = { cover: null, thumb: null, gallery: [] };
    const okc = Array.isArray(cover) ? fs.existsSync(cover[0]) : fs.existsSync(cover);
    if (!okc) { console.warn('missing cover', slug, cover); continue; }
    const isTall = async (s) => { const m = await (await load(s)).metadata(); return m.height / m.width > 2.2; };
    // Tall boards (the S-3 grids) are not cropped into covers; they stay whole in the gallery.
    if (!(await isTall(cover))) {
      await (await load(cover)).resize(1600, 1000, { fit: 'cover', position: 'attention' }).webp({ quality: 80 }).toFile(out('public', dir, 'cover.webp'));
      await (await load(cover)).resize(640, 400, { fit: 'cover', position: 'attention' }).webp({ quality: 74 }).toFile(out('public', dir, 'thumb.webp'));
      await (await load(cover)).resize(1024, 1024, { fit: 'cover', position: 'attention' }).webp({ quality: 78 }).toFile(out('public', dir, 'square.webp'));
      meta[slug].cover = `${dir}/cover.webp`; meta[slug].thumb = `${dir}/thumb.webp`; meta[slug].square = `${dir}/square.webp`;
    }
    const all = [cover, ...gallery];
    for (const [i, g] of all.entries()) {
      const ok = Array.isArray(g) ? fs.existsSync(g[0]) : fs.existsSync(g);
      if (!ok) { console.warn('missing', slug, g); continue; }
      const img = await load(g); const m = await img.metadata();
      const tall = m.height / m.width > 2.2;
      const w = Math.min(tall ? 900 : 1600, m.width);
      const name = `${dir}/g${i + 1}.webp`;
      const info = await (await load(g)).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out('public', name));
      meta[slug].gallery.push({ src: name, w: info.width, h: info.height });
    }
  }
  fs.writeFileSync(out('src/data/images.json'), JSON.stringify(meta, null, 1));
  console.log('images:', Object.keys(meta).length, 'works');
}

// ------------------------------------------------------------------ fonts
if (want('fonts')) {
  const NM = path.join(ROOT, 'node_modules');
  const FONTS = [
    '@fontsource/antonio/files/antonio-latin-200-normal.woff2',
    '@fontsource/antonio/files/antonio-latin-300-normal.woff2',
    '@fontsource/antonio/files/antonio-latin-500-normal.woff2',
    '@fontsource/antonio/files/antonio-latin-ext-300-normal.woff2',
    '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2',
    '@fontsource-variable/geist/files/geist-latin-ext-wght-normal.woff2',
    '@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2',
    '@fontsource/instrument-serif/files/instrument-serif-latin-ext-400-italic.woff2',
    '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2',
    '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-ext-400-normal.woff2',
  ];
  fs.rmSync(path.join(ROOT, 'public/fonts'), { recursive: true, force: true });
  for (const f of FONTS) {
    const s = path.join(NM, f);
    if (fs.existsSync(s)) fs.copyFileSync(s, out('public/fonts', path.basename(f)));
    else console.warn('font missing', f);
  }
  console.log('fonts copied');
}
