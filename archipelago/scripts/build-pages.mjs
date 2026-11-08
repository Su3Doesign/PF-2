// Writes the static pages from src/data: the work index, one case study per work, about,
// contact and the 404, plus the crawlable portfolio inside index.html, sitemap and robots.
// Run before dev and build (npm run pages).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/works.json'), 'utf8'));
const images = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/images.json'), 'utf8'));
const SITE = process.env.SITE_URL || 'https://www.thesumanth.com/archipelago/';
const BASE = process.env.SITE_BASE || '/archipelago/';
const { profile, islands, works } = data;
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ORDER = ['worlds', 'machines', 'monuments', 'brands', 'archive'];
const islandTitle = (id) => islands.find((i) => i.id === id)?.title ?? 'Archive';
const islandN = (id) => islands.find((i) => i.id === id)?.n ?? '05';
const sorted = ORDER.flatMap((id) => works.filter((w) => w.island === id));
const write = (rel, html) => { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
const img = (slug) => images[slug] ?? { cover: null, thumb: null, gallery: [] };
const status = (w) => (w.live ? 'Live site ↗' : w.repo ? 'GitHub ↗' : w.concept ? 'Concept' : 'Case study');

const head = (title, desc, rel, extra = '') => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<meta name="theme-color" content="#05060d" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<link rel="icon" href="${rel}favicon.svg" type="image/svg+xml" />
${extra}
</head>`;
const hud = (rel, active = '') => `
<div class="survey" aria-hidden="true"></div>
<div class="hud">
  <a class="wordmark" href="${rel}">SUMANTH</a>
  <div class="top-right" style="right: var(--inset)">
    <a class="mono" href="${rel}"${active === 'voyage' ? ' aria-current="page"' : ''}>The voyage</a>
    <a class="mono" href="${rel}work/"${active === 'work' ? ' aria-current="page"' : ''}>Work</a>
    <a class="mono" href="${rel}about/"${active === 'about' ? ' aria-current="page"' : ''}>About</a>
    <a class="mono" href="${rel}contact/"${active === 'contact' ? ' aria-current="page"' : ''}>Contact</a>
  </div>
</div>
<div class="cursor" id="cursor" aria-hidden="true"><span class="ring"></span><span class="dot"></span><span class="lbl"></span></div>`;
const foot = (rel) => `
<footer class="mono" style="position:relative;z-index:1;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:30px var(--inset);border-top:1px solid rgba(201,168,106,.2);color:var(--bone-500)">
  <span>© 2026 Sumanth Richie · Hyderabad · IN</span>
  <span><a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a> · ${profile.links.map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join(' · ')}</span>
</footer>
<script type="module" src="/src/pages.ts"></script>
</body>
</html>`;

// ------------------------------------------------------------------ work index
{
  const rel = '../';
  const counts = Object.fromEntries(ORDER.map((id) => [id, works.filter((w) => w.island === id).length]));
  const html = `${head('Work — Sumanth Richie', `${works.length} works across four islands: Worlds, Machines, Monuments and Brands.`, rel)}
<body class="page" data-page="work">
${hud(rel, 'work')}
<main>
  <p class="mono kick">${works.length} works · 4 islands · ${works.filter((w) => w.live).length} live sites · ${works.filter((w) => w.isNew).length} new</p>
  <h1 class="mega">Work</h1>
  <div class="filters" role="toolbar" aria-label="Filter the work">
    <button aria-pressed="true" data-f="all">All</button>
    ${ORDER.map((id) => `<button aria-pressed="false" data-f="${id}">${islandTitle(id)} <span style="opacity:.6">${counts[id]}</span></button>`).join('')}
    <span class="sep"></span>
    <button aria-pressed="false" data-f="live">Live sites only</button>
    <button aria-pressed="false" data-f="new">New</button>
    <span class="views"><button aria-pressed="true" data-v="list">List</button><button aria-pressed="false" data-v="grid">Grid</button></span>
  </div>
  <ol class="rows" id="rows">
    ${sorted.map((w, i) => `<li data-island="${w.island}" data-live="${w.live ? 1 : 0}" data-new="${w.isNew ? 1 : 0}" data-img="${img(w.slug).thumb ? rel + img(w.slug).thumb : ''}"><a href="${w.slug}/"><span class="im" style="background-image:url('${img(w.slug).square ? rel + img(w.slug).square : rel + (img(w.slug).gallery[0]?.src ?? '')}')"></span><span class="n mono">${String(i + 1).padStart(2, '0')}</span><span class="t">${esc(w.title)}</span><span class="l">${esc(w.line)}</span><span class="s mono">${w.isNew ? 'New · ' : ''}${status(w)} · ${islandTitle(w.island)}</span></a></li>`).join('\n    ')}
  </ol>
  <div class="trail" id="trail" aria-hidden="true"></div>
</main>
${foot(rel)}`;
  write('work/index.html', html);
}

// ------------------------------------------------------------------ case studies
sorted.forEach((w, i) => {
  const rel = '../../';
  const im = img(w.slug);
  const list = works.filter((x) => x.island === w.island);
  const next = list[(list.indexOf(w) + 1) % list.length];
  const hero = im.gallery[0];
  const rest = im.gallery.slice(1);
  const desc = `${w.title}: ${w.line}`;
  const html = `${head(`${w.title} — Sumanth Richie`, desc, rel, hero ? `<meta property="og:image" content="${SITE}${hero.src}" />` : '')}
<body class="page" data-page="case">
${hud(rel, 'work')}
<main>
  <section class="cs-hero">
    ${hero ? `<img src="${rel}${hero.src}" width="${hero.w}" height="${hero.h}" alt="${esc(w.title)}" fetchpriority="high" />` : ''}
    <div class="cap">
      <p class="mono kick">${esc(islandTitle(w.island).toUpperCase())} — ${String(list.indexOf(w) + 1).padStart(2, '0')}${w.year ? ` · ${w.year}` : ''}${w.role ? ` · ${esc(w.role)}` : ''}${w.isNew ? ' · New' : ''}</p>
      <h1>${esc(w.title)}</h1>
    </div>
  </section>
  <div class="cs-bar">
    ${w.live ? `<a class="btn" href="${esc(w.live)}" target="_blank" rel="noopener">Launch live site ↗<span class="sr-only"> (opens in a new tab)</span></a>` : w.repo ? `<a class="btn" href="${esc(w.repo)}" target="_blank" rel="noopener">View on GitHub ↗</a>` : '<span class="btn locked">🔒 Live site coming soon</span>'}
    <a class="btn ghost" href="${rel}?to=${w.slug}">See it on the voyage</a>
    <a class="btn ghost" href="../">All work</a>
  </div>
  <section class="cs-brief">
    <p class="serif">${esc(w.line)}</p>
    <div>${w.brief ? `<p>${esc(w.brief)}</p>` : `<p>${esc(w.line)}</p>`}${w.note ? `<p class="mono" style="color:var(--gold)">${esc(w.note)}</p>` : ''}${w.client ? `<p class="mono">Made at ${esc(w.client)}</p>` : ''}${w.concept ? '<p class="mono" style="color:var(--bone-500)">Concept project. Fictional brand, no affiliation.</p>' : ''}</div>
  </section>
  ${rest.length ? `<section aria-label="The build"><p class="mono kick">The build</p><div class="cs-strip">${rest.map((g, k) => `<figure><img loading="lazy" src="${rel}${g.src}" width="${g.w}" height="${g.h}" alt="${esc(w.title)}, plate ${k + 2}" /><figcaption class="mono">${String(k + 2).padStart(2, '0')}</figcaption></figure>`).join('')}</div></section>` : ''}
  ${w.live ? `<section class="cs-live"><p class="mono kick">Live in the browser</p><div class="frame" data-src="${esc(w.live)}"></div><p class="mono url">${esc(w.live.replace(/^https?:\/\//, ''))}</p></section>` : ''}
  ${w.facts?.length ? `<section class="cs-facts" aria-label="The numbers">${w.facts.map(([k, v]) => `<div><b>${esc(v)}</b><span class="mono">${esc(k)}</span></div>`).join('')}</section>` : ''}
  <section class="cs-credits">
    <div><h3 class="mono">Role</h3><p>${esc(w.role ?? 'Design')}</p></div>
    <div><h3 class="mono">Tools</h3><p>${esc((w.tools ?? []).join(' · '))}</p></div>
    <div><h3 class="mono">Credits</h3><p>Design & build: Sumanth Richie</p></div>
  </section>
  <a class="cs-next" href="../${next.slug}/"><p class="mono kick">Next on ${esc(islandTitle(next.island))}</p><span class="mega">${esc(next.title)}</span></a>
</main>
${foot(rel)}`;
  write(`work/${w.slug}/index.html`, html);
});

// ------------------------------------------------------------------ about
{
  const rel = '../';
  const tools = ['Blender', 'Cycles', 'Unreal Engine 5', 'Maya', 'ZBrush', 'Substance Painter', 'Three.js', 'GLSL', 'GSAP', 'Lenis', 'Web Audio', 'Astro', 'React', 'TypeScript', 'Illustrator', 'Photoshop', 'Figma', 'Nuke', 'DaVinci Resolve'];
  const html = `${head('About — Sumanth Richie', profile.tagline, rel)}
<body class="page" data-page="about">
${hud(rel, 'about')}
<main>
  <p class="mono kick">Hyderabad · IN · <span class="clock" id="clock">--:--</span> IST</p>
  <h1 class="mega">Sumanth</h1>
  <p class="lede">${esc(profile.tagline)}</p>
  <section class="about-grid">
    <div><h3>Designer</h3><p>Brand systems, campaigns and packaging: GC Burger's five stores, Midea Canada, KERB, REM, Mitti, Maruneta. One rule per brand, carried onto every surface.</p></div>
    <div><h3>3D artist</h3><p>Worlds built whole and lit for one hour: the Ring Gate, the Flooded Rotunda, the Castle on the Crag, Fudō Myō-ō, Koi Pond, Rōman no Yoake. Blender, Maya, ZBrush, Unreal.</p></div>
    <div><h3>Creative developer</h3><p>Sites where the work is the interface: Hyperion, Coachwork, Altair Estates, Parian, Halden, Vanta, Lotus. Three.js, GLSL and a lot of patience with frame budgets.</p></div>
  </section>
  <p class="mono kick">By day</p>
  <p class="lede" style="font-size:clamp(22px,2.2vw,32px)">${esc(profile.day)}: the brand, the site, the expos and the MSME outreach.</p>
  <p class="mono kick" style="margin-top:70px">Toolbelt</p>
  <ul class="toolbelt">${tools.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
  <p class="mono kick" style="margin-top:70px">The route so far</p>
  <ol class="route">
    <li><b>Graphic designer</b><span>Freelance and agency: studios, bakeries, an ed-tech pitch.</span></li>
    <li><b>The Classic Partnership, Toronto</b><span>Midea Canada, GC Burger, Investohome, KD Displays, Amaya, 2024–2025.</span></li>
    <li><b>Worlds and websites</b><span>Unreal, Blender and three.js: the islands on this map, 2025–2026.</span></li>
    <li><b>CapQ, Hyderabad</b><span>Head of Marketing, 2026.</span></li>
  </ol>
  <div class="actions"><a class="btn" href="${esc(profile.resume)}" target="_blank" rel="noopener">Download CV ↗</a><a class="btn ghost" href="${rel}contact/">Say hello</a></div>
</main>
${foot(rel)}`;
  write('about/index.html', html);
}

// ------------------------------------------------------------------ contact
{
  const rel = '../';
  const html = `${head('Contact — Sumanth Richie', 'Let us chart the next one.', rel)}
<body class="page" data-page="contact">
${hud(rel, 'contact')}
<main>
  <p class="mono kick">End of the map</p>
  <h1 class="mega" style="font-size:clamp(56px,10vw,170px)">Let's chart<br/>the next one.</h1>
  <section class="contact">
    <div>
      <a class="big" href="mailto:${esc(profile.email)}" id="mail">${esc(profile.email)}</a>
      <p class="mono" style="margin-top:14px;color:var(--bone-500)">Click copies it too.</p>
      <ul class="toolbelt" style="margin-top:30px">${profile.links.map((l) => `<li><a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a></li>`).join('')}</ul>
    </div>
    <form id="brief" novalidate>
      <div><p class="mono" style="color:var(--gold);margin:0 0 10px">I'd like</p><div class="pills" role="group" aria-label="Project type">${['A brand', 'A 3D world', 'A website', 'Something else'].map((t, i) => `<button type="button" aria-pressed="${i === 0}">${t}</button>`).join('')}</div></div>
      <label>Your name<input name="name" autocomplete="name" required /></label>
      <label>Your email<input name="email" type="email" autocomplete="email" required /></label>
      <label>Budget<select name="budget"><option>Not sure yet</option><option>Under ₹1L</option><option>₹1L – ₹5L</option><option>₹5L+</option><option>USD, let's talk</option></select></label>
      <label>The idea<textarea name="msg" rows="5" required></textarea></label>
      <div><button class="btn" type="submit">Send the signal</button></div>
      <p class="mono" id="formNote" style="color:var(--bone-500)" aria-live="polite"></p>
    </form>
  </section>
</main>
${foot(rel)}`;
  write('contact/index.html', html);
}

// ------------------------------------------------------------------ 404
{
  const html = `${head('Off the map — Sumanth Richie', 'Error 404: this island is not on the map.', '', `<base href="${BASE}" />`)}
<body class="page" data-page="404">
<div class="off"><canvas id="sea" aria-hidden="true"></canvas>
  <div class="msg"><p class="mono" style="color:var(--gold)">Error 404 — off the map. Coordinates unknown.</p><h1>This island isn't on the map.</h1><p class="mono" style="color:var(--bone-500)">Drag to row. A lighthouse will find you.</p><p style="margin-top:22px"><a class="btn" href="./">Take me home</a> <a class="btn ghost" href="work/">All work</a></p></div>
</div>
<script type="module" src="/src/pages.ts"></script>
</body></html>`;
  write('404.html', html);
}

// ------------------------------------------------------------------ the crawlable portfolio inside index.html
{
  const f = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(f, 'utf8');
  const block = `<!-- works:start -->
  <div class="static" id="static">
    <h1 class="sr-only">Sumanth Richie — designer, 3D artist and creative developer</h1>
    <p>${esc(profile.tagline)} <a href="work/">Every work as a list</a> · <a href="about/">About</a> · <a href="contact/">Contact</a> · <a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a></p>
    ${ORDER.map((id) => `<section aria-labelledby="s-${id}"><h2 id="s-${id}">${islandTitle(id)}</h2>${works.filter((w) => w.island === id).map((w) => `<article><img loading="lazy" src="${img(w.slug).thumb ?? ''}" alt="" width="200" height="125" /><div><h3><a href="work/${w.slug}/">${esc(w.title)}</a></h3><p>${esc(w.line)}</p><p class="mono">${(w.tools ?? []).map(esc).join(' · ')}${w.live ? ` · <a href="${esc(w.live)}" target="_blank" rel="noopener">Live site ↗<span class="sr-only"> (opens in a new tab)</span></a>` : ''}</p></div></article>`).join('')}</section>`).join('\n    ')}
  </div>
  <!-- works:end -->`;
  html = html.replace(/<!-- works:start -->[\s\S]*<!-- works:end -->/, block);
  fs.writeFileSync(f, html);
}

// ------------------------------------------------------------------ sitemap, robots
{
  const urls = ['', 'work/', 'about/', 'contact/', ...sorted.map((w) => `work/${w.slug}/`)];
  write('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  write('public/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
}
console.log(`pages: ${sorted.length} case studies, work index, about, contact, 404`);
