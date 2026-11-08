import './styles/pages.css';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T | null;
const page = document.body.dataset.page;

// ---- the cursor (same as the voyage, lighter)
const cursor = $('#cursor');
if (cursor && matchMedia('(pointer: fine)').matches) {
  document.body.classList.add('has-cursor');
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
  addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  addEventListener('pointerover', (e) => {
    const t = e.target as HTMLElement;
    const ext = t.closest('a[target="_blank"]'); const link = t.closest('a, button');
    cursor.className = `cursor ${ext ? 'ext' : link ? 'link' : t.closest('input, textarea') ? 'text' : ''}`;
    (cursor.querySelector('.lbl') as HTMLElement).textContent = ext ? '↗ LIVE' : '';
  });
  const tick = () => { x += (tx - x) * 0.22; y += (ty - y) * 0.22; cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`; requestAnimationFrame(tick); };
  tick();
}

// ---- work index: filters, list/grid, the trailing thumbnail
if (page === 'work') {
  const rows = Array.from(document.querySelectorAll<HTMLLIElement>('#rows li'));
  const params = new URLSearchParams(location.search);
  let island = params.get('island') || 'all', live = params.get('live') === '1', fresh = params.get('new') === '1';
  const apply = () => {
    for (const li of rows) {
      const show = (island === 'all' || li.dataset.island === island) && (!live || li.dataset.live === '1') && (!fresh || li.dataset.new === '1');
      if (show && li.hidden) { li.hidden = false; li.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'cubic-bezier(0.22,1,0.36,1)' }); }
      else if (!show) li.hidden = true;
    }
    document.querySelectorAll<HTMLButtonElement>('[data-f]').forEach((b) => {
      const f = b.dataset.f!; b.setAttribute('aria-pressed', String(f === 'live' ? live : f === 'new' ? fresh : f === island));
    });
    const q = new URLSearchParams(); if (island !== 'all') q.set('island', island); if (live) q.set('live', '1'); if (fresh) q.set('new', '1');
    history.replaceState(null, '', `${location.pathname}${q.toString() ? `?${q}` : ''}`);
  };
  document.querySelectorAll<HTMLButtonElement>('[data-f]').forEach((b) => b.addEventListener('click', () => {
    const f = b.dataset.f!;
    if (f === 'live') live = !live; else if (f === 'new') fresh = !fresh; else island = f;
    apply();
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-v]').forEach((b) => b.addEventListener('click', () => {
    document.body.classList.toggle('grid-view', b.dataset.v === 'grid');
    document.querySelectorAll('[data-v]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
  }));
  apply();
  const trail = $('#trail')!;
  let tx = 0, ty = 0, x = 0, y = 0;
  for (const li of rows) {
    li.addEventListener('mouseenter', () => { if (document.body.classList.contains('grid-view') || !li.dataset.img) return; trail.style.backgroundImage = `url('${li.dataset.img}')`; trail.classList.add('on'); });
    li.addEventListener('mouseleave', () => trail.classList.remove('on'));
  }
  addEventListener('pointermove', (e) => { tx = e.clientX + 24; ty = e.clientY - 90; });
  const t = () => { x += (tx - x) * 0.14; y += (ty - y) * 0.14; trail.style.transform = `translate3d(${x}px, ${y}px, 0)${trail.classList.contains('on') ? '' : ' scale(.92)'}`; requestAnimationFrame(t); };
  t();
}

// ---- case study: the live site loads into its frame only when scrolled to
if (page === 'case') {
  const frame = $('.cs-live .frame');
  if (frame) {
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return; io.disconnect();
      const f = document.createElement('iframe');
      f.src = frame.dataset.src!; f.loading = 'lazy'; f.title = 'Live preview'; f.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      frame.appendChild(f);
      const fit = () => { f.style.transform = `scale(${frame.clientWidth / 1280})`; };
      fit(); addEventListener('resize', fit);
    }, { rootMargin: '200px' });
    io.observe(frame);
  }
}

// ---- about: local time in Hyderabad
if (page === 'about') {
  const c = $('#clock');
  const tick = () => { if (c) c.textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()); };
  tick(); setInterval(tick, 1000);
}

// ---- contact: the brief becomes a prefilled email (a form endpoint can be added later)
if (page === 'contact') {
  const pills = Array.from(document.querySelectorAll<HTMLButtonElement>('.pills button'));
  pills.forEach((p) => p.addEventListener('click', () => pills.forEach((o) => o.setAttribute('aria-pressed', String(o === p)))));
  const mail = $('#mail') as HTMLAnchorElement;
  mail?.addEventListener('click', () => { navigator.clipboard?.writeText(mail.textContent || '').catch(() => {}); });
  $('#brief')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target as HTMLFormElement; const d = new FormData(f);
    const kind = pills.find((p) => p.getAttribute('aria-pressed') === 'true')?.textContent ?? '';
    if (!f.checkValidity()) { $('#formNote')!.textContent = 'A name, an email and the idea, please.'; f.reportValidity(); return; }
    const body = `${d.get('msg')}\n\n— ${d.get('name')} (${d.get('email')})\nBudget: ${d.get('budget')}`;
    location.href = `mailto:${mail.textContent}?subject=${encodeURIComponent(`${kind} — from ${d.get('name')}`)}&body=${encodeURIComponent(body)}`;
    $('#formNote')!.textContent = 'Signal received. Your mail app should open now.';
  });
}

// ---- 404: a small boat on a dark sea; three oar strokes bring a lighthouse beam
if (page === '404') {
  const cv = $('#sea') as HTMLCanvasElement; const g = cv.getContext('2d')!;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
  size(); addEventListener('resize', size);
  let bx = 0.5, vx = 0, strokes = 0, beam = 0, last = 0, t0 = performance.now();
  const stars = Array.from({ length: 160 }, () => [Math.random(), Math.random() * 0.55, Math.random()]);
  addEventListener('pointerdown', (e) => { last = e.clientX; });
  addEventListener('pointerup', (e) => { const d = (e.clientX - last) / innerWidth; if (Math.abs(d) > 0.04) { vx += d * 0.06; strokes++; } });
  addEventListener('click', (e) => { if (beam > 0.9 && e.clientX > innerWidth * 0.75 && e.clientY < innerHeight * 0.6) location.href = './'; });
  const draw = (now: number) => {
    const t = (now - t0) / 1000; const W = cv.width, H = cv.height, hz = H * 0.62;
    g.fillStyle = '#05060d'; g.fillRect(0, 0, W, H);
    const sky = g.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, '#05060d'); sky.addColorStop(1, '#141b3a'); g.fillStyle = sky; g.fillRect(0, 0, W, hz);
    for (const [x, y, r] of stars) { g.fillStyle = `rgba(237,230,214,${0.25 + 0.5 * Math.abs(Math.sin(t * (1 + r * 3) + r * 40))})`; g.fillRect(x * W, y * H, dpr, dpr); }
    for (let i = 0; i < 46; i++) { const y = hz + (i / 46) ** 1.6 * (H - hz); g.strokeStyle = `rgba(201,168,106,${0.04 + i * 0.002})`; g.beginPath(); for (let x = 0; x <= W; x += 16 * dpr) { const yy = y + Math.sin(x * 0.004 / dpr + t * 0.8 + i) * (2 + i * 0.12) * dpr; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
    if (strokes >= 3) beam = Math.min(1, beam + 0.01);
    if (beam > 0) { const lx = W * 0.86, ly = hz - 26 * dpr; g.fillStyle = '#ede6d6'; g.fillRect(lx - 3 * dpr, ly, 6 * dpr, 24 * dpr); const a = Math.sin(t * 0.9) * 0.7 - 2.6; const grd = g.createRadialGradient(lx, ly, 0, lx, ly, W * 0.7); grd.addColorStop(0, `rgba(243,223,168,${0.5 * beam})`); grd.addColorStop(1, 'rgba(243,223,168,0)'); g.fillStyle = grd; g.beginPath(); g.moveTo(lx, ly); g.arc(lx, ly, W * 0.7, a - 0.08, a + 0.08); g.closePath(); g.fill(); g.fillStyle = `rgba(243,223,168,${beam})`; g.beginPath(); g.arc(lx, ly, 4 * dpr, 0, 7); g.fill(); }
    vx *= 0.985; bx = Math.min(0.9, Math.max(0.1, bx + vx)); const x = bx * W, y = hz + (H - hz) * 0.32 + Math.sin(t * 1.4) * 4 * dpr;
    g.save(); g.translate(x, y); g.rotate(Math.sin(t * 1.1) * 0.05);
    g.fillStyle = '#1b1c22'; g.beginPath(); g.moveTo(-46 * dpr, 0); g.quadraticCurveTo(0, 22 * dpr, 46 * dpr, 0); g.closePath(); g.fill();
    g.strokeStyle = '#8e713f'; g.lineWidth = dpr; g.stroke();
    g.fillStyle = '#ffb05a'; g.shadowColor = '#ffb05a'; g.shadowBlur = 24 * dpr; g.beginPath(); g.arc(0, -16 * dpr, 4 * dpr, 0, 7); g.fill(); g.shadowBlur = 0;
    g.restore();
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}
