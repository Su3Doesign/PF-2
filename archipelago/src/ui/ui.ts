import gsap from 'gsap';
import { works, bySlug, images, profile, islands, islandOf, indexOf, asset, ISLAND_ORDER, type Work } from '../data';
import type { Beat } from '../core/story';
import { RAIL } from '../core/story';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface UIHooks {
  fly(vh: number): void;
  open(slug: string): void;
  close(): void;
  sound(on: boolean): void;
  calm(on: boolean): void;
  sfx(name: string): void;
  map(): void;
}

/** Everything in the DOM layer: HUD, rail, chapter type, labels, panel, menu, list, cursor. */
export class UI {
  chapterId = '';
  beatId = '';
  seen = new Set<string>();
  current: string | null = null;
  tagEls = new Map<string, HTMLElement>();
  pinEls = new Map<string, HTMLElement>();
  islandEls = new Map<string, HTMLElement>();
  private toastT = 0;
  private pullT: gsap.core.Timeline | null = null;
  cursor = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2, el: $('#cursor'), mode: '' };

  constructor(public hooks: UIHooks) {
    this.buildRail();
    this.buildMenu();
    this.buildList();
    this.buildLegend();
    this.buildFooter();
    this.buildIslandLabels();
    this.bindKeys();
    this.bindCursor();
    $('#menuBtn').addEventListener('click', () => this.toggleMenu());
    $('#listBtn').addEventListener('click', () => this.toggleList(true));
    $('#listClose').addEventListener('click', () => this.toggleList(false));
    $('#soundBtn').addEventListener('click', () => { const on = $('#soundBtn').getAttribute('aria-pressed') !== 'true'; this.setSound(on); hooks.sound(on); });
    $('#calmBtn').addEventListener('click', () => { const on = $('#calmBtn').getAttribute('aria-pressed') !== 'true'; $('#calmBtn').setAttribute('aria-pressed', String(on)); hooks.calm(on); });
    $('#menuMap').addEventListener('click', (e) => { e.preventDefault(); this.toggleMenu(false); hooks.map(); });
    $('#backTop').addEventListener('click', () => hooks.fly(0));
    $('#email').addEventListener('click', (e) => this.copyEmail(e));
  }

  // ------------------------------------------------------------------ rail
  private buildRail() {
    const rail = $('#rail');
    for (const r of RAIL) {
      const b = document.createElement('button');
      b.className = r.id === 'lighthouse' ? 'lh' : '';
      b.dataset.id = r.id;
      b.setAttribute('aria-label', `Fly to ${r.label}`);
      b.innerHTML = `<i></i><span class="mono">${r.label}</span>`;
      b.addEventListener('click', () => { this.hooks.sfx('whoosh'); this.hooks.fly(r.vh); });
      rail.appendChild(b);
    }
  }
  setRail(progress: number, chapter: string) {
    ($('#railFill') as HTMLElement).style.height = `${Math.round(progress * 100)}%`;
    for (const b of Array.from($('#rail').querySelectorAll('button'))) b.classList.toggle('on', (b as HTMLElement).dataset.id === chapter);
  }

  // ------------------------------------------------------------------ beats
  setBeat(b: Beat) {
    if (b.id === this.beatId) return;
    this.beatId = b.id;
    const ch = b.island && ['worlds', 'machines', 'monuments', 'brands'].includes(b.island) ? b.island : b.island === 'lighthouse' ? 'lighthouse' : b.island === 'map' ? 'map' : '';
    if (ch !== this.chapterId) this.setChapter(ch);
    this.setWorks(b.works ?? []);
    this.setPull(b.pull ?? '');
    const hint = $('#hint');
    hint.style.opacity = b.hint ? '1' : '0';
    if (b.hint) $('#hintText').textContent = b.hint;
    document.body.dataset.beat = b.id;
    document.body.classList.toggle('tower', b.island === 'brands');
  }

  private setChapter(id: string) {
    this.chapterId = id;
    const h = $('#chTitle'), sub = $('#chSub');
    const isl = islandOf(id);
    const title = isl ? isl.title : '';
    const s = isl ? `<b>${isl.n} / 04</b> — ${esc(isl.tools)}` : '';
    gsap.to(h.children.length ? h.children : {}, { yPercent: -105, duration: h.children.length ? 0.45 : 0, stagger: 0.02, ease: 'power2.in', onComplete: () => {
      h.innerHTML = title.toUpperCase().split('').map((c) => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join('');
      sub.innerHTML = s;
      if (title) gsap.fromTo(h.children, { yPercent: 105 }, { yPercent: 0, duration: reduce ? 0.2 : 0.8, stagger: 0.04, ease: 'expo.out' });
      gsap.fromTo(sub, { opacity: 0, y: 8 }, { opacity: title ? 1 : 0, y: 0, duration: 0.6, delay: 0.25 });
    } });
  }

  private setWorks(slugs: string[]) {
    const box = $('#works');
    const old = Array.from(box.children);
    if (old.length) gsap.to(old, { opacity: 0, x: 16, duration: 0.3, stagger: 0.03, onComplete: () => old.forEach((o) => o.remove()) });
    slugs.forEach((slug, i) => {
      const w = bySlug[slug]; if (!w) return;
      const b = document.createElement('button');
      b.dataset.slug = slug;
      b.className = this.seen.has(slug) ? 'seen' : '';
      b.innerHTML = `${w.isNew ? '<span class="new">NEW</span>' : ''}${w.live ? '<span class="live">LIVE ↗</span>' : ''}<span>${esc(w.title)}</span><span class="chk" aria-hidden="true"></span>`;
      b.setAttribute('aria-label', `${w.title}: ${w.line}`);
      b.addEventListener('click', () => this.hooks.open(slug));
      b.addEventListener('mouseenter', () => { this.hover(slug); this.hooks.sfx('tick'); });
      b.addEventListener('mouseleave', () => this.hover(null));
      box.appendChild(b);
      gsap.to(b, { opacity: 1, x: 0, duration: 0.7, delay: 0.25 + i * 0.06, ease: 'expo.out' });
      this.seen.add(slug);
      setTimeout(() => b.classList.add('seen'), 900 + i * 120);
    });
  }

  private setPull(text: string) {
    const el = $('#pull');
    this.pullT?.kill();
    if (!text) { const ws = el.querySelectorAll('.w'); if (ws.length) gsap.to(ws, { opacity: 0, filter: 'blur(8px)', duration: 0.4 }); return; }
    el.innerHTML = text.split(' ').map((w) => `<span class="w">${esc(w)}</span>`).join(' ');
    this.pullT = gsap.timeline().to(el.querySelectorAll('.w'), { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.9, stagger: 0.05, ease: 'power3.out' });
  }

  // ------------------------------------------------------------------ hero
  heroIn() {
    const h = $('#heroTitle');
    h.innerHTML = 'SUMANTH'.split('').map((c) => `<span>${c}</span>`).join('');
    gsap.to(h.children, { y: 0, yPercent: 0, duration: reduce ? 0.2 : 1.3, stagger: 0.06, ease: 'expo.out', delay: 0.2 });
    gsap.fromTo(h.children, { yPercent: 100 }, { yPercent: 0, duration: reduce ? 0.2 : 1.3, stagger: 0.06, ease: 'expo.out', delay: 0.2 });
    gsap.to('#heroTag', { opacity: 1, duration: 1.2, delay: 0.9 });
  }
  setHero(p: number) {
    const el = $('#hero');
    el.style.opacity = String(1 - Math.min(1, p * 1.6));
    el.style.transform = `translateY(${-p * 60}px)`;
    el.style.visibility = p > 0.9 ? 'hidden' : 'visible';
  }

  // ------------------------------------------------------------------ labels in the world
  private buildIslandLabels() {
    const box = $('#islandLabels');
    for (const id of ISLAND_ORDER) {
      const isl = islandOf(id)!;
      const el = document.createElement('div'); el.className = 'island-label';
      el.innerHTML = `<b>${isl.title}</b><i>${isl.n} · ${works.filter((w) => w.island === id).length} works</i>`;
      box.appendChild(el); this.islandEls.set(id, el);
    }
  }
  placeIslandLabel(id: string, x: number, y: number, a: number) {
    const el = this.islandEls.get(id); if (!el) return;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`; el.style.opacity = String(a);
  }

  tag(slug: string) {
    let el = this.tagEls.get(slug);
    if (!el) {
      const w = bySlug[slug];
      el = document.createElement('div'); el.className = 'tag3d';
      el.innerHTML = `<button><small>${w.isNew ? 'New · ' : ''}${w.live ? 'Live site ↗' : w.concept ? 'Concept' : 'Case study'}</small><b>${esc(w.title)}</b></button>`;
      const b = el.querySelector('button')!;
      b.addEventListener('click', () => this.hooks.open(slug));
      b.addEventListener('mouseenter', () => this.hover(slug));
      b.addEventListener('mouseleave', () => this.hover(null));
      $('#tags').appendChild(el); this.tagEls.set(slug, el);
    }
    return el;
  }
  placeTag(slug: string, x: number, y: number, on: boolean, hot: boolean) {
    const el = this.tag(slug);
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${(y - 22).toFixed(1)}px, 0)`;
    el.classList.toggle('on', on); el.classList.toggle('hot', hot);
    el.style.pointerEvents = on ? 'auto' : 'none';
  }
  hideTagsExcept(keep: Set<string>) { for (const [slug, el] of this.tagEls) if (!keep.has(slug)) { el.classList.remove('on'); el.style.pointerEvents = 'none'; } }

  // ------------------------------------------------------------------ hover preview
  hovered: string | null = null;
  private hoverTimer = 0;
  hover(slug: string | null) {
    if (slug === this.hovered) return;
    this.hovered = slug;
    clearTimeout(this.hoverTimer);
    const pv = $('#preview');
    pv.classList.remove('on');
    this.setCursor(slug ? (bySlug[slug]?.live ? 'hot' : 'hot') : '', slug ? 'OPEN' : '');
    for (const [s, el] of this.tagEls) el.classList.toggle('hot', s === slug);
    if (!slug) return;
    this.hoverTimer = window.setTimeout(() => {
      const w = bySlug[slug]; const im = images[slug];
      const src = im?.square ?? im?.thumb ?? im?.gallery[0]?.src;
      if (!src) return;
      (pv.querySelector('img') as HTMLImageElement).src = asset(src);
      pv.querySelector('b')!.textContent = w.title;
      pv.querySelector('small')!.textContent = w.line;
      pv.classList.add('on');
    }, 600);
  }

  // ------------------------------------------------------------------ project panel
  openPanel(slug: string) {
    const w = bySlug[slug]; if (!w) return;
    this.current = slug;
    const im = images[slug];
    const isl = islandOf(w.island);
    const list = works.filter((x) => x.island === w.island);
    const i = list.indexOf(w);
    const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
    const gallery = (im?.gallery ?? []).slice(0, 8);
    const live = w.live ? `<a class="btn launch" href="${esc(w.live)}" target="_blank" rel="noopener" data-cursor="ext">Launch live site <span aria-hidden="true">↗</span><span class="flare"></span><span class="sr-only">(opens in a new tab)</span></a>`
      : w.repo ? `<a class="btn launch" href="${esc(w.repo)}" target="_blank" rel="noopener" data-cursor="ext">View on GitHub ↗<span class="flare"></span><span class="sr-only">(opens in a new tab)</span></a>`
      : `<span class="btn locked" aria-disabled="true">🔒 Live site coming soon</span>`;
    $('#panelIn').innerHTML = `
      <button class="close" id="pClose" aria-label="Back to the voyage"></button>
      <p class="mono idx">${esc((isl?.title ?? 'Archive').toUpperCase())} — ${indexOf(w)}${w.floor ? ` · ${esc(w.floor)}` : ''}${w.isNew ? ' · <span style="color:var(--bone)">New, unposted</span>' : ''}</p>
      <h3 id="pTitle">${esc(w.title)}</h3>
      <p class="line">${esc(w.line)}</p>
      <ul class="chips">${[w.year, w.role, ...(w.tools ?? [])].filter(Boolean).map((t) => `<li>${esc(String(t))}</li>`).join('')}${w.concept ? '<li>Concept</li>' : ''}${w.client ? `<li>${esc(w.client)}</li>` : ''}</ul>
      ${gallery[0] ? `<figure><img src="${asset(gallery[0].src)}" width="${gallery[0].w}" height="${gallery[0].h}" alt="${esc(w.title)}" /></figure>` : ''}
      ${w.brief ? `<p class="brief">${esc(w.brief)}</p>` : ''}
      ${w.facts?.length ? `<div class="facts">${w.facts.map(([k, v]) => `<div><b>${esc(v)}</b><small>${esc(k)}</small></div>`).join('')}</div>` : ''}
      ${w.note ? `<p class="mono note">${esc(w.note)}</p>` : ''}
      ${im?.board?.length ? `<button class="board-cta" id="pBoard"><span class="mono">Know more about it</span><b>The full presentation</b><small class="mono">${im.board.length > 1 ? `${Math.round(im.board.reduce((a, t) => a + t.h, 0) / 100) / 10}k px · scroll it whole` : 'the full board'}</small><img src="${asset(im.board[0].src)}" alt="" loading="lazy" /></button>` : ''}
      <div class="actions">${live}<a class="btn ghost" href="work/${w.slug}/">Read the case study →</a></div>
      ${gallery.slice(1).map((g) => `<figure><img loading="lazy" src="${asset(g.src)}" width="${g.w}" height="${g.h}" alt="${esc(w.title)}" /></figure>`).join('')}
      <nav><button class="mono" id="pPrev">← ${esc(prev.title)}</button><button class="mono" id="pNext">${esc(next.title)} →</button></nav>`;
    const panel = $('#panel');
    panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false');
    panel.scrollTop = 0;
    $('#pClose').addEventListener('click', () => this.hooks.close());
    $('#pPrev').addEventListener('click', () => this.hooks.open(prev.slug));
    $('#pNext').addEventListener('click', () => this.hooks.open(next.slug));
    document.getElementById('pBoard')?.addEventListener('click', () => this.openBoard(slug));
    const launch = panel.querySelector('.launch');
    launch?.addEventListener('click', () => { launch.classList.remove('launch'); void (launch as HTMLElement).offsetWidth; launch.classList.add('launch'); this.hooks.sfx('open'); this.toast('Opened in a new tab'); });
    setTimeout(() => ($('#pClose') as HTMLElement).focus({ preventScroll: true }), 50);
    this.hover(null);
  }
  /** The stitched presentation, whole, in a scrolling column over everything. */
  openBoard(slug: string) {
    const w = bySlug[slug]; const tiles = images[slug]?.board; if (!w || !tiles?.length) return;
    const b = $('#board'); const col = $('#bCol');
    $('#bTitle').textContent = w.title;
    $('#bCount').textContent = `${tiles.length} ${tiles.length === 1 ? 'board' : 'panels'}`;
    col.innerHTML = tiles.map((t, i) => `<img src="${asset(t.src)}" width="${t.w}" height="${t.h}" alt="${esc(w.title)}, part ${i + 1}" ${i > 1 ? 'loading="lazy"' : ''} decoding="async" />`).join('');
    b.hidden = false; requestAnimationFrame(() => b.classList.add('open'));
    const sc = $('#bScroll'); sc.scrollTop = 0;
    const prog = $('#bProg');
    sc.onscroll = () => { prog.style.transform = `scaleX(${sc.scrollTop / Math.max(1, sc.scrollHeight - sc.clientHeight)})`; };
    ($('#bClose') as HTMLElement).onclick = () => this.closeBoard();
    ($('#bClose') as HTMLElement).focus({ preventScroll: true });
    this.hooks.sfx('open');
  }
  closeBoard() {
    const b = $('#board'); if (b.hidden) return false;
    b.classList.remove('open'); setTimeout(() => { b.hidden = true; $('#bCol').innerHTML = ''; }, 450);
    return true;
  }
  closePanel() {
    this.current = null;
    const panel = $('#panel'); panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true');
  }

  // ------------------------------------------------------------------ menu, list, legend, footer
  private buildMenu() {
    const ul = $('#menuIslands');
    for (const r of RAIL) {
      const li = document.createElement('li');
      const n = works.filter((w) => w.island === r.id).length;
      li.innerHTML = `<button class="mono">${r.label}<span>${n ? String(n).padStart(2, '0') : '—'}</span></button>`;
      li.querySelector('button')!.addEventListener('click', () => { this.toggleMenu(false); this.hooks.fly(r.vh); });
      ul.appendChild(li);
    }
    const links = $('#menuLinks');
    const all = [{ label: profile.email, href: `mailto:${profile.email}` }, ...profile.links, { label: 'Résumé (PDF)', href: profile.resume }];
    for (const l of all) { const li = document.createElement('li'); li.innerHTML = `<a class="mono" href="${esc(l.href)}" ${l.href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${esc(l.label)}<span>↗</span></a>`; links.appendChild(li); }
  }
  toggleMenu(force?: boolean) {
    const open = force ?? !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    const m = $('#menu'); if (open) m.hidden = false; else setTimeout(() => { if (!document.body.classList.contains('menu-open')) m.hidden = true; }, 600);
    $('#menuBtn').setAttribute('aria-expanded', String(open));
    $('#menuBtn').setAttribute('aria-label', open ? 'Close the menu' : 'Open the menu');
    if (open) gsap.fromTo('#menu ol li', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.06, ease: 'expo.out' });
    this.hooks.sfx('tick');
  }
  private buildList() {
    const t = $('#listTable');
    let html = '';
    for (const id of [...ISLAND_ORDER, 'archive'] as const) {
      const isl = islandOf(id);
      html += `<tr class="island"><td class="mono" colspan="4">${isl ? `${isl.n} / 04 — ${isl.title}` : 'Archive'}</td></tr>`;
      works.filter((w) => w.island === id).forEach((w, i) => {
        html += `<tr><td class="i mono">${String(i + 1).padStart(2, '0')}</td><td class="t"><button data-slug="${w.slug}">${esc(w.title)}</button></td><td class="l">${esc(w.line)}</td><td class="c mono">${w.isNew ? 'NEW · ' : ''}${w.live ? `<a href="${esc(w.live)}" target="_blank" rel="noopener">LIVE ↗</a>` : 'CASE STUDY'}</td></tr>`;
      });
    }
    t.innerHTML = html;
    t.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest('button[data-slug]') as HTMLElement | null; if (b) { this.toggleList(false); this.hooks.open(b.dataset.slug!); } });
  }
  toggleList(open: boolean) {
    document.body.classList.toggle('list-open', open);
    const l = $('#list'); if (open) { l.hidden = false; ($('#listClose') as HTMLElement).focus(); } else setTimeout(() => { if (!document.body.classList.contains('list-open')) l.hidden = true; }, 500);
  }
  private buildLegend() {
    const lg = $('#legend');
    let html = '';
    for (const id of [...ISLAND_ORDER, 'archive'] as const) {
      const isl = islandOf(id);
      html += `<h4 class="mono">${isl ? isl.title : 'Archive'}</h4>`;
      for (const w of works.filter((x) => x.island === id)) html += `<button data-slug="${w.slug}"><span>${esc(w.title)}</span>${w.live ? '<em>LIVE</em>' : w.isNew ? '<em>NEW</em>' : ''}</button>`;
    }
    lg.innerHTML = html;
    lg.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest('button[data-slug]') as HTMLElement | null; if (b) this.hooks.open(b.dataset.slug!); });
    lg.addEventListener('mouseover', (e) => { const b = (e.target as HTMLElement).closest('button[data-slug]') as HTMLElement | null; this.hover(b?.dataset.slug ?? null); });
  }
  pin(slug: string) {
    let el = this.pinEls.get(slug);
    if (!el) {
      el = document.createElement('div'); el.className = 'pin';
      el.innerHTML = `<button aria-label="${esc(bySlug[slug].title)}"><i></i></button><span>${esc(bySlug[slug].title)}</span>`;
      el.querySelector('button')!.addEventListener('click', () => this.hooks.open(slug));
      el.querySelector('button')!.addEventListener('mouseenter', () => { this.hooks.sfx('pin'); });
      $('#pins').appendChild(el); this.pinEls.set(slug, el);
    }
    return el;
  }
  private buildFooter() {
    const s = $('#socials');
    s.innerHTML = profile.links.map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label.toUpperCase())}</a>`).join('<i></i>');
    ($('#email') as HTMLAnchorElement).href = `mailto:${profile.email}`;
    $('#email').textContent = profile.email;
  }
  private async copyEmail(e: Event) {
    try { await navigator.clipboard.writeText(profile.email); this.toast('Copied — message in a bottle sent'); } catch { /* the mailto still opens */ }
    void e;
  }

  // ------------------------------------------------------------------ readouts
  showReadout(id: 'lap' | 'counter' | 'alt', on: boolean) { $(`#${id}`).classList.toggle('on', on); }
  setLap(seconds: number, speed: number) {
    const s = Math.floor(seconds), cs = Math.floor((seconds - s) * 100);
    $('#lapT').textContent = `00:${String(s).padStart(2, '0')}:${String(cs).padStart(2, '0')}`;
    $('#lapArc').setAttribute('stroke-dasharray', `${Math.round(speed * 260)} 400`);
  }
  setCounter(label: string, n: number, total?: number) {
    $('#counterK').textContent = label;
    $('#counterN').textContent = total ? `${n.toLocaleString('en-IN').padStart(4, '0')}` : String(n);
  }
  buildAlt(levels: { slug: string; level: string; vh: number }[]) {
    const ol = $('#altList'); ol.innerHTML = '';
    for (const l of [...levels].reverse()) {
      const li = document.createElement('li'); li.dataset.slug = l.slug;
      li.innerHTML = `<button>${esc(bySlug[l.slug]?.title ?? l.slug)}</button>`;
      li.querySelector('button')!.addEventListener('click', () => this.hooks.fly(l.vh));
      ol.appendChild(li);
    }
  }
  setAlt(metres: number, slug: string, level: string) {
    $('#altM').textContent = `${level} · ${String(Math.round(metres)).padStart(3, '0')} M`;
    const items = Array.from($('#altList').children) as HTMLElement[];
    const at = Math.max(0, items.findIndex((li) => li.dataset.slug === slug));
    items.forEach((li, i) => { li.classList.toggle('on', i === at); li.classList.toggle('near', Math.abs(i - at) <= 2); });
  }

  // ------------------------------------------------------------------ misc
  setSound(on: boolean) {
    $('#soundBtn').setAttribute('aria-pressed', String(on));
    $('#soundLbl').textContent = on ? 'Sound on' : 'Sound off';
    document.body.classList.toggle('sound-on', on);
  }
  toast(msg: string) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(this.toastT); this.toastT = window.setTimeout(() => t.classList.remove('on'), 2600);
  }
  showChart(on: boolean) { $('#chart').classList.toggle('on', on); document.body.classList.toggle('chart-on', on); }
  showFooter(on: boolean) { $('#footer').classList.toggle('on', on); }
  flash(a: number) { $('#flash').style.opacity = String(a); }

  private bindKeys() {
    addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return;
      if (e.key === 'Escape') { if (this.closeBoard()) return; if (this.current) this.hooks.close(); else if (document.body.classList.contains('list-open')) this.toggleList(false); else if (document.body.classList.contains('menu-open')) this.toggleMenu(false); }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'l') this.toggleList(!document.body.classList.contains('list-open'));
      if (k === 'm') this.hooks.map();
      if (k === 's') $('#soundBtn').click();
      if (['1', '2', '3', '4'].includes(k)) this.hooks.fly(RAIL[+k - 1].vh);
      if (this.current && (k === 'arrowright' || k === 'arrowleft')) ($(k === 'arrowright' ? '#pNext' : '#pPrev') as HTMLElement)?.click();
    });
  }

  // ------------------------------------------------------------------ cursor
  private bindCursor() {
    if (matchMedia('(pointer: coarse)').matches) return;
    document.body.classList.add('has-cursor');
    addEventListener('pointermove', (e) => { this.cursor.tx = e.clientX; this.cursor.ty = e.clientY; }, { passive: true });
    addEventListener('pointerover', (e) => {
      const t = e.target as HTMLElement;
      if (this.hovered) return;
      const ext = t.closest('[data-cursor="ext"], a[target="_blank"]');
      const link = t.closest('a, button');
      this.setCursor(ext ? 'ext' : link ? 'link' : '', ext ? '↗ LIVE' : '');
    });
  }
  setCursor(mode: string, label = '') {
    const c = this.cursor;
    if (mode === c.mode && !label) return;
    c.mode = mode;
    c.el.className = `cursor ${mode}`;
    (c.el.querySelector('.lbl') as HTMLElement).textContent = label;
  }
  tickCursor() {
    const c = this.cursor;
    c.x += (c.tx - c.x) * 0.22; c.y += (c.ty - c.y) * 0.22;
    c.el.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`;
    const pv = $('#preview');
    if (pv.classList.contains('on')) {
      const x = Math.min(innerWidth - 240, c.x + 26), y = Math.min(innerHeight - 290, c.y + 20);
      pv.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
  }

  // ------------------------------------------------------------------ preloader
  setLoad(p: number) {
    if (!document.getElementById('ldCount')) return;
    const n = Math.round(p * 100);
    $('#ldCount').textContent = `Charting ${String(n).padStart(3, '0')}`;
    const route = document.getElementById('ldRoute') as unknown as SVGPathElement;
    const L = route.getTotalLength();
    route.style.strokeDasharray = `3 6`;
    route.style.clipPath = `inset(0 ${100 - n}% 0 0)`;
    void L;
  }
  ready(onEnter: (sound: boolean) => void) {
    const ld = $('#loader');
    ld.classList.add('ready');
    $('#ldCount').textContent = 'Charted · 100';
    const go = (s: boolean) => { ld.classList.add('done'); onEnter(s); setTimeout(() => ld.remove(), 1400); };
    $('#enterSound').addEventListener('click', () => go(true), { once: true });
    $('#enterQuiet').addEventListener('click', () => go(false), { once: true });
    ($('#enterQuiet') as HTMLElement).focus({ preventScroll: true });
  }
}

export { islands };
