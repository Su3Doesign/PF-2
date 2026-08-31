/* ══════════════════════════════════════════════════════════════
   thesumanth.com — app.js
   Data, DOM construction, and everything that moves.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  var IMG = 'assets/images/';
  var VID = 'assets/videos/';
  var POS = 'assets/posters/';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var small = window.innerWidth < 760;
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function seq(prefix, a, b, suffix, pad) {
    var out = [];
    for (var i = a; i <= b; i++) out.push(prefix + (pad && i < 10 ? '0' + i : i) + (suffix || '.webp'));
    return out;
  }
  function isVideo(p) { return /\.mp4$/i.test(p); }
  function stem(p) { return p.split('/').pop().replace(/\.[a-z0-9]+$/i, ''); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* ══ DATA ═══════════════════════════════════════════════════ */

  var WORLDS = [
    {
      id: 'roman-no-yoake', title: 'Rōman no Yoake', jp: '浪漫の夜明け',
      sub: 'Pagoda, first light, and a sea that has not started talking yet',
      year: '2025', kind: 'Personal',
      note: 'The hour before anything is awake. I wanted the fog to do the modelling — the pagoda barely earns its silhouette, the treeline dissolves, and the only hard edge in the frame is the sun clearing the ridge. Five renders, one sunrise, and roughly four hundred rejected sun angles.',
      tags: ['Maya', 'Arnold', 'Substance', 'After Effects', 'Fog volumes', '5 renders'],
      plate: IMG + 'japa-render-1.webp',
      alt: 'A pagoda above a misty treeline at sunrise',
      shots: [
        { src: IMG + 'japa-render-3.webp', label: 'Pink hour', span: 'shot--wide', ratio: 'frame--16x9' },
        { src: IMG + 'japa-render-5.webp', label: 'Eclipse', span: '', ratio: 'frame--16x9' },
        { src: VID + 'Japa-Turntable-1.mp4', label: 'Turntable', span: 'shot--half', ratio: 'frame--16x9' },
        { src: VID + 'Japa-Panningshot-2.mp4', label: 'Panning shot', span: 'shot--half', ratio: 'frame--16x9' },
        { src: IMG + 'japa-render-2.webp', label: 'Tower, night sea', span: 'shot--half', ratio: 'frame--16x9' },
        { src: IMG + 'japa-render-4.webp', label: 'Grass, moon', span: 'shot--half', ratio: 'frame--16x9' }
      ]
    },
    {
      id: 'fudo-myo-o', title: 'Fudō Myō-ō', jp: '不動明王',
      sub: 'A forest shrine at the hour the candles take over from the sun',
      year: '2025', kind: 'Personal',
      note: 'Built around a single practical light. Everything else in the scene is either reflecting that candle or hiding from it. The foxes have stopped expecting visitors but they still keep watch, and the moss has opinions about where the water goes.',
      tags: ['Maya', 'ZBrush', 'Arnold', 'Substance', 'Practical light', 'Turntable'],
      plate: IMG + 'fudomyo-render-1.webp',
      alt: 'A forest shrine lit by candlelight through the trees',
      shots: [
        { src: VID + 'Fudomyo-Turntable-1.mp4', label: 'Turntable', span: 'shot--wide', ratio: 'frame--16x9' },
        { src: IMG + 'fudomyo-render-mobile-1.webp', label: 'Vertical cut', span: '', ratio: 'frame--3x4' },
        { src: IMG + 'fudomyo-render-2.webp', label: 'The approach', span: 'shot--full', ratio: 'frame--16x9' }
      ]
    },
    {
      id: 'koi-pond', title: 'Koi Pond', jp: '錦鯉の池',
      sub: 'Bioluminescence, autumn, and light that comes from under the water',
      year: '2024', kind: 'Personal',
      note: 'The rule for this one: no light from above. Everything is lit from inside the water, so the caustics run the wrong way up the rocks and the leaves take their colour from below. Rendered twice — once in high summer, once after the maples turned.',
      tags: ['Maya', 'Arnold', 'Substance', 'Photoshop', 'Caustics', 'Two seasons'],
      plate: IMG + 'koipond-render-2.webp',
      alt: 'A glowing teal pond surrounded by rocks and palms at night',
      shots: [
        { src: IMG + 'koipond-render-1.webp', label: 'Shallows', span: 'shot--half', ratio: 'frame--16x9' },
        { src: IMG + 'koipond-render-4.webp', label: 'Overgrowth', span: 'shot--half', ratio: 'frame--16x9' },
        { src: IMG + 'koipond-render-5.webp', label: 'Wide, night', span: 'shot--wide', ratio: 'frame--16x9' },
        { src: IMG + 'koipond-render-3.webp', label: 'Autumn pass', span: '', ratio: 'frame--16x9' },
        { src: IMG + 'koipond-render-6.webp', label: 'Last light', span: 'shot--full', ratio: 'frame--16x9' }
      ]
    }
  ];

  var STEPS = [
    ['Reference', 'Look at the real thing for longer than is comfortable. Then keep looking.'],
    ['Blockout', 'Grey boxes, honest proportions. If it is boring in clay it will be boring in colour.'],
    ['Hard-surface', 'Edges that hold a highlight. Bevels you could run a thumb along.'],
    ['Sculpt', 'Wear where hands have been. Nothing in a lived world is factory-new.'],
    ['Texture', 'A working life: dust settles, paint chips, water always stains downward.'],
    ['Light', 'One key that tells the truth. Everything after it is support and flattery.'],
    ['Comp', 'Grade it, then remove half of what you just added.']
  ];

  var CLIENTS = [
    { name: 'Classic Partnership', group: 'Agency', role: 'Calendar campaigns · visual design', files: seq(IMG + 'tcp-calendarposts-', 1, 13) },
    { name: 'Midea Canada', group: 'Agency', role: 'Social overlays · PWHL · Pelonis', files: seq(IMG + 'midea-posts-', 1, 6).concat(seq(VID + 'midea-overlays-', 1, 8, '.mp4'), [IMG + 'midea-PWHL-banner.webp', IMG + 'midea-pelonis-banner-1.webp']) },
    { name: 'Eureka', group: 'Agency', role: 'Product social · reels', files: seq(IMG + 'midea-eureka-overlays-', 1, 4).concat(seq(VID + 'midea-eureka-', 1, 3, '.mp4')) },
    { name: 'Comfee', group: 'Agency', role: 'Social campaign', files: [IMG + 'midea-comfee-post-01.webp', IMG + 'midea-comfee-post-02.webp'].concat(seq(VID + 'midea-comfee-social-', 1, 2, '.mp4')) },
    { name: 'Home Depot Canada', group: 'Agency', role: 'RAC advertisements', files: seq(IMG + 'midea-rac-advertisements-', 1, 8, '.webp', true) },
    { name: 'KD Displays', group: 'Agency', role: 'Retail display content', files: seq(IMG + 'kddisplays-posts-', 1, 10).concat([VID + 'kddisplays-posts-1.mp4']) },
    { name: 'GC Burger', group: 'Agency', role: 'Campaign · five locations', files: seq(IMG + 'gcburger-campaign-', 1, 28) },
    { name: 'Investohome PR', group: 'Agency', role: 'Google ads · social · web', files: seq(IMG + 'investohome-googleads-banners-', 1, 5).concat(seq(IMG + 'investohome-socialads-banners-', 1, 5), seq(IMG + 'investohome-websitebanner-', 1, 4), [VID + 'investohome-outro-1.mp4']) },
    { name: 'Amaya Restaurant', group: 'Agency', role: 'Calendar posts · reel', files: seq(IMG + 'amayarestaurant-calendarposts-', 1, 5).concat([VID + 'amayarestaurant-reel-1.mp4']) },
    { name: 'VS Design Studio', group: 'Studio', role: 'Event & brand posts', files: seq(IMG + 'vsdesignstudio-posts-', 1, 4).concat([VID + 'vsdesignstudio-event-1.mp4']) },
    { name: 'nxtwave', group: 'Freelance', role: 'Slide system', files: seq(IMG + 'nxtwave-slide-', 1, 7) },
    { name: 'Tamada Media', group: 'Freelance', role: 'Branding', files: [IMG + 'tamadamedia-branding-1.webp', VID + 'tamadamedia-branding-2.mp4'] },
    { name: 'Lakshmi Bakers', group: 'Freelance', role: 'Identity · via Tamada Media', files: seq(IMG + 'tamadamedia-laxmibakery-', 1, 3) },
    { name: 'Inertia Productions', group: 'Freelance', role: 'Motion graphics', files: [VID + 'motiongraphicsmozilla-3.mp4', VID + 'motiongraphicsnews-1.mp4', VID + 'motiongraphicsnews-2.mp4'] },
    { name: 'LLT Overseas', group: 'Freelance', role: 'Illustration', files: [IMG + 'overseas-illustration-1.webp'] },
    { name: 'AZ Coffee', group: 'Freelance', role: 'Via Coalition Technologies · under NDA', files: [] }
  ];

  var STUDIES = [
    { src: IMG + '10.webp', nm: 'Nike Phantom', kind: 'Sport campaign', span: 'bento__cell--w3', ratio: 'frame--4x3', gl: true },
    { src: IMG + '1.webp', nm: 'Magma', kind: 'Beverage identity', span: 'bento__cell--w3', ratio: 'frame--4x3', gl: true },
    { src: IMG + '3.webp', nm: 'Magma', kind: 'Can · product viz', span: '', ratio: 'frame--3x4' },
    { src: IMG + '2.webp', nm: 'Magma', kind: 'Strawberry key art', span: '', ratio: 'frame--3x4' },
    { src: IMG + '12.webp', nm: 'Reebok', kind: 'Sport campaign', span: '', ratio: 'frame--3x4' },
    { src: IMG + '7.webp', nm: 'Messi × Ronaldo', kind: 'Match poster', span: '', ratio: 'frame--3x4' },
    { src: IMG + '16.webp', nm: 'Cloudbank', kind: 'Sky study', span: 'bento__cell--w4', ratio: 'frame--16x9', gl: true },
    { src: IMG + '8.webp', nm: 'Mustang', kind: 'Automotive', span: '', ratio: 'frame--16x9' },
    { src: IMG + '1 (2).webp', nm: 'Octavia', kind: 'Automotive · night', span: '', ratio: 'frame--3x4' },
    { src: IMG + '1 (10).webp', nm: 'Octavia', kind: 'Automotive · forest', span: '', ratio: 'frame--3x4' },
    { src: IMG + 'car-render-2.webp', nm: 'Supra', kind: 'Studio viz', span: '', ratio: 'frame--16x9' },
    { src: IMG + 'car-render-1.webp', nm: 'Supra', kind: 'Three-quarter', span: '', ratio: 'frame--16x9' },
    { src: IMG + 'car2-shadowmatte-1.webp', nm: 'Ferrari', kind: 'Shadow matte', span: '', ratio: 'frame--16x9' },
    { src: IMG + '11.webp', nm: 'Titan', kind: 'Product advert', span: '', ratio: 'frame--3x4' },
    { src: IMG + 'op-perfume-1.webp', nm: 'Perfume', kind: 'Fragrance key art', span: '', ratio: 'frame--3x4' },
    { src: IMG + '21.webp', nm: 'Nipura Luxe', kind: 'Jewellery · cool', span: '', ratio: 'frame--3x4' },
    { src: IMG + '22.webp', nm: 'Nipura Luxe', kind: 'Jewellery · warm', span: '', ratio: 'frame--3x4' },
    { src: IMG + 'cd.webp', nm: 'Nipura', kind: 'Seasonal post', span: '', ratio: 'frame--1x1' },
    { src: IMG + '15.webp', nm: 'FittR', kind: 'Food packaging', span: 'bento__cell--w3', ratio: 'frame--4x3' },
    { src: IMG + '4.webp', nm: 'Science Focus', kind: 'Editorial cover', span: 'bento__cell--w3', ratio: 'frame--4x3' },
    { src: IMG + '5.webp', nm: 'The Alchemist', kind: 'Cover · mockup', span: '', ratio: 'frame--4x3' },
    { src: IMG + '6.webp', nm: 'The Alchemist', kind: 'Title lockup', span: '', ratio: 'frame--16x9' },
    { src: IMG + '13.webp', nm: 'Yesteryay Land', kind: 'Event poster', span: '', ratio: 'frame--3x4' },
    { src: IMG + 'sensei-mugen.webp', nm: 'Sensei', kind: 'Character', span: '', ratio: 'frame--3x4' },
    { src: IMG + '9.webp', nm: 'The lamppost', kind: 'Illustration', span: '', ratio: 'frame--3x4' },
    { src: IMG + '14.webp', nm: 'Ship, dusk', kind: 'Illustration', span: '', ratio: 'frame--16x9' },
    { src: IMG + '18.webp', nm: 'Dead wood', kind: 'Matte illustration', span: '', ratio: 'frame--16x9' },
    { src: IMG + '17.webp', nm: 'Late room', kind: 'Interior light study', span: 'bento__cell--w3', ratio: 'frame--16x9', gl: true },
    { src: IMG + 'conceptdesign-2.webp', nm: 'Red tree', kind: 'Concept', span: 'bento__cell--w3', ratio: 'frame--16x9' },
    { src: IMG + 'conceptdesign-1.webp', nm: 'Moon field', kind: 'Concept', span: '', ratio: 'frame--16x9' },
    { src: IMG + 'cylinder-1.webp', nm: 'Hard-surface', kind: 'Practice', span: '', ratio: 'frame--16x9' },
    { src: IMG + 'conceptdesign-3.webp', nm: 'Clay pass', kind: 'Hard-surface', span: '', ratio: 'frame--16x9' },
    { src: IMG + 'cylinder-3.webp', nm: 'Extinguisher', kind: 'Texture study', span: '', ratio: 'frame--16x9' },
    { src: IMG + 'carousel_banner_full.webp', nm: 'Web carousel', kind: 'Banner system', span: 'bento__cell--w6', ratio: 'frame--auto' }
  ];

  /* ══ MEDIA ══════════════════════════════════════════════════ */

  var lazyIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var img = e.target;
      if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
      img.addEventListener('load', function () { img.classList.add('is-in'); }, { once: true });
      if (img.complete) img.classList.add('is-in');
      lazyIO.unobserve(img);
    });
  }, { rootMargin: '700px 0px' });

  var bucketIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      resolveBuckets(e.target);
      bucketIO.unobserve(e.target);
    });
  }, { rootMargin: '60px 0px', threshold: 0.05 });

  var vidIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        if (!v.src && v.dataset.src) v.src = v.dataset.src;
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      } else if (!v.paused) v.pause();
    });
  }, { threshold: 0.25 });

  function addBuckets(wrap, cols, rows) {
    if (reduced) return;
    var g = el('div', 'buckets');
    g.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';
    g.style.gridTemplateRows = 'repeat(' + rows + ',1fr)';
    g.dataset.cols = cols;
    for (var i = 0; i < cols * rows; i++) g.appendChild(document.createElement('i'));
    wrap.appendChild(g);
    bucketIO.observe(wrap);
  }
  function resolveBuckets(wrap) {
    var g = wrap.querySelector('.buckets');
    if (!g) return;
    var cols = parseInt(g.dataset.cols, 10) || 8;
    var tiles = Array.prototype.slice.call(g.children).map(function (t, i) {
      return { t: t, k: Math.floor(i / cols) * cols * 1.4 + (i % cols) + Math.random() * cols };
    }).sort(function (a, b) { return a.k - b.k; });
    var stepMs = Math.max(8, 560 / tiles.length);
    tiles.forEach(function (o, i) { setTimeout(function () { o.t.classList.add('gone'); }, i * stepMs); });
    setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, tiles.length * stepMs + 700);
  }

  function frame(src, o) {
    o = o || {};
    var wrap = el('div', 'frame ' + (o.ratio || 'frame--16x9'));
    if (o.gl) wrap.setAttribute('data-gl', src);
    if (isVideo(src)) {
      var v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('playsinline', ''); v.preload = 'none';
      v.poster = POS + stem(src) + '.jpg';
      v.dataset.src = src;
      wrap.appendChild(v);
      vidIO.observe(v);
    } else {
      var img = document.createElement('img');
      img.alt = o.alt || ''; img.loading = 'lazy'; img.decoding = 'async';
      img.dataset.src = src;
      wrap.appendChild(img);
      lazyIO.observe(img);
    }
    if (o.buckets && !o.gl) addBuckets(wrap, o.buckets[0], o.buckets[1]);
    return wrap;
  }

  function openable(node, label, fn) {
    node.setAttribute('role', 'button');
    node.setAttribute('tabindex', '0');
    node.setAttribute('aria-label', label);
    node.addEventListener('click', fn);
    node.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
    });
  }

  /* ══ WORLDS ═════════════════════════════════════════════════ */

  var worldsMount = document.getElementById('worldsMount');

  function buildStrip(world, host) {
    var strip = el('div', host ? 'case__shots' : 'strip');
    world.shots.forEach(function (s, i) {
      var fig = el('figure', 'shot ' + (s.span || ''));
      fig.appendChild(frame(s.src, { alt: world.title + ' — ' + s.label, ratio: s.ratio, buckets: [8, 5] }));
      fig.appendChild(el('span', 'shot__no', pad2(i + 1) + ' · ' + s.label.toUpperCase()));
      if (isVideo(s.src)) fig.appendChild(el('span', 'shot__play', '▶ LOOP'));
      openable(fig, 'Open ' + world.title + ' — ' + s.label, function () {
        openLB(world.shots.map(function (x) { return x.src; }), i, world.title);
      });
      hover(fig, 'OPEN');
      strip.appendChild(fig);
    });
    return strip;
  }

  WORLDS.forEach(function (w, wi) {
    var sec = el('article', 'world');
    sec.id = w.id;
    sec.setAttribute('data-wire', 'world.' + w.id);

    var plate = el('div', 'world__plate');
    plate.appendChild(frame(w.plate, { alt: w.alt, ratio: '', gl: true }));
    plate.appendChild(el('div', 'world__glow'));

    var cap = el('div', 'world__cap');
    cap.appendChild(el('div', '',
      '<span class="world__jp">' + w.jp + '</span>' +
      '<h3 class="world__title">' + w.title + '</h3>' +
      '<span class="world__open">OPEN CASE STUDY <i>→</i></span>'));
    cap.appendChild(el('div', 'world__meta',
      '<span>' + pad2(wi + 1) + ' / 03 · ' + w.kind + '</span><span>' + w.year + '</span>'));
    plate.appendChild(cap);
    openable(plate, 'Open case study: ' + w.title, function (e) { openCase(w); });
    hover(plate, 'CASE STUDY');
    sec.appendChild(plate);

    var body = el('div', 'world__body');
    body.appendChild(el('p', 'world__note reveal', '<em>' + w.sub + '.</em> ' + w.note));
    var tags = el('div', 'world__tags reveal');
    w.tags.forEach(function (t) { tags.appendChild(el('span', '', t)); });
    body.appendChild(tags);
    sec.appendChild(body);
    sec.appendChild(buildStrip(w));
    worldsMount.appendChild(sec);
  });

  /* ══ CASE STUDY LAYER ═══════════════════════════════════════ */

  var caseEl = document.getElementById('case');
  var caseScroll = document.getElementById('caseScroll');
  var caseReturn = null;

  function openCase(w) {
    caseReturn = document.activeElement;
    document.getElementById('caseJp').textContent = w.jp;
    document.getElementById('caseTitle').textContent = w.title;
    document.getElementById('caseSub').textContent = w.sub;
    document.getElementById('caseNote').textContent = w.note;
    var tags = document.getElementById('caseTags');
    tags.innerHTML = '';
    w.tags.forEach(function (t) { tags.appendChild(el('span', '', t)); });
    var shots = document.getElementById('caseShots');
    shots.innerHTML = '';
    var built = buildStrip(w, true);
    while (built.firstChild) shots.appendChild(built.firstChild);

    caseEl.hidden = false;
    caseScroll.scrollTop = 0;
    lock(true);
    var x = (lastPointer.x / window.innerWidth * 100).toFixed(1);
    var y = (lastPointer.y / window.innerHeight * 100).toFixed(1);
    if (hasGSAP && !reduced) {
      gsap.fromTo(caseEl,
        { clipPath: 'circle(0% at ' + x + '% ' + y + '%)' },
        { clipPath: 'circle(150% at ' + x + '% ' + y + '%)', duration: 1.05, ease: 'expo.inOut' });
      gsap.from(caseScroll.querySelectorAll('.case__head > div > *, .case__note, .case__tags span'), {
        y: 26, opacity: 0, duration: .8, stagger: .04, delay: .35, ease: 'expo.out'
      });
    } else {
      caseEl.style.clipPath = 'circle(150% at 50% 50%)';
    }
    document.getElementById('caseClose').focus();
  }

  function closeCase() {
    var done = function () { caseEl.hidden = true; lock(false); if (caseReturn && caseReturn.focus) caseReturn.focus(); };
    if (hasGSAP && !reduced) {
      gsap.to(caseEl, { clipPath: 'circle(0% at 50% 50%)', duration: .75, ease: 'expo.inOut', onComplete: done });
    } else done();
  }
  document.getElementById('caseClose').addEventListener('click', closeCase);

  /* ══ METHOD ═════════════════════════════════════════════════ */

  var methodTrack = document.getElementById('methodTrack');
  STEPS.forEach(function (s, i) {
    var li = el('li', 'step');
    li.innerHTML =
      '<span class="step__n">' + pad2(i + 1) + ' / 07</span>' +
      '<span class="step__name">' + s[0] + '</span>' +
      '<span class="step__txt">' + s[1] + '</span>';
    methodTrack.appendChild(li);
  });

  /* ══ CLIENTS ════════════════════════════════════════════════ */

  var soloList = document.getElementById('soloList');
  var wall = document.getElementById('clientWall');
  var soloName = document.getElementById('soloName');
  var soloRole = document.getElementById('soloRole');
  var soloClear = document.getElementById('soloClear');
  var soloed = null;

  CLIENTS.forEach(function (c, i) {
    var b = el('button', 'solo__item');
    b.type = 'button';
    b.innerHTML = '<span class="solo__dot"></span><span class="solo__nm">' + c.name + '</span>' +
      '<span class="solo__ct">' + (c.files.length ? pad2(c.files.length) : 'NDA') + '</span>';
    b.addEventListener('click', function () { setSolo(soloed === i ? null : i); });
    hover(b, 'SOLO');
    soloList.appendChild(b);
  });

  var cells = (function () {
    var buckets = CLIENTS.map(function (c, ci) {
      return c.files.map(function (f) { return { src: f, ci: ci, name: c.name }; });
    });
    var out = [], more = true, i = 0;
    while (more) {
      more = false;
      for (var b = 0; b < buckets.length; b++) if (buckets[b][i]) { out.push(buckets[b][i]); more = true; }
      i++;
    }
    return out;
  })();

  cells.forEach(function (cell) {
    var d = el('div', 'wall__cell');
    d.dataset.ci = String(cell.ci);
    d.appendChild(frame(cell.src, { alt: cell.name + ' — commercial work', ratio: 'frame--auto' }));
    d.appendChild(el('span', 'wall__tag', cell.name));
    openable(d, 'Open ' + cell.name + ' gallery', function () {
      var c = CLIENTS[cell.ci];
      openLB(c.files, c.files.indexOf(cell.src), c.name);
    });
    hover(d, 'VIEW');
    wall.appendChild(d);
  });

  function setSolo(idx) {
    soloed = idx;
    Array.prototype.forEach.call(soloList.children, function (b, i) {
      b.classList.toggle('is-solo', idx === i);
      b.classList.toggle('is-dim', idx !== null && idx !== i);
    });
    Array.prototype.forEach.call(wall.children, function (c) {
      c.classList.toggle('is-fade', idx !== null && c.dataset.ci !== String(idx));
    });
    if (idx === null) {
      soloName.textContent = 'ALL CLIENTS';
      soloRole.textContent = '2023 — 2025 · agency, studio & freelance';
      soloClear.hidden = true;
    } else {
      var c = CLIENTS[idx];
      soloName.textContent = c.name.toUpperCase();
      soloRole.textContent = c.group + ' · ' + c.role + (c.files.length ? '' : ' · no public assets');
      soloClear.hidden = false;
    }
  }
  soloClear.addEventListener('click', function () { setSolo(null); });

  /* ══ STUDIES ════════════════════════════════════════════════ */

  var studyGrid = document.getElementById('studyGrid');
  STUDIES.forEach(function (s, i) {
    var d = el('div', 'bento__cell ' + (s.span || ''));
    d.appendChild(frame(s.src, { alt: s.nm + ' — ' + s.kind, ratio: s.ratio, gl: s.gl && !small, buckets: [6, 4] }));
    d.appendChild(el('div', 'bento__cap',
      '<span class="bento__nm">' + s.nm + '</span><span class="bento__kind">' + s.kind + '</span>'));
    openable(d, 'Open ' + s.nm + ' — ' + s.kind, function () {
      openLB(STUDIES.map(function (x) { return x.src; }), i, s.nm + ' — ' + s.kind);
    });
    hover(d, 'OPEN');
    studyGrid.appendChild(d);
  });

  var deskMount = document.getElementById('deskMount');
  if (deskMount) deskMount.appendChild(frame(VID + 'desk-hero.mp4', { ratio: 'frame--16x9' }));

  /* ══ LIGHTBOX ═══════════════════════════════════════════════ */

  var lb = document.getElementById('lb');
  var lbStage = document.getElementById('lbStage');
  var lbTitle = document.getElementById('lbTitle');
  var lbCount = document.getElementById('lbCount');
  var lbList = [], lbIdx = 0, lbReturn = null;

  function openLB(list, idx, title) {
    lbReturn = document.activeElement;
    lbList = list.slice(); lbIdx = Math.max(0, idx);
    lbTitle.textContent = title;
    lb.hidden = false;
    lock(true);
    drawLB();
    document.getElementById('lbClose').focus();
    if (hasGSAP && !reduced) gsap.from(lb, { opacity: 0, duration: .35 });
  }
  function closeLB() {
    lb.hidden = true; lbStage.innerHTML = '';
    if (caseEl.hidden) lock(false);
    if (lbReturn && lbReturn.focus) lbReturn.focus();
  }
  function drawLB() {
    lbStage.innerHTML = '';
    var src = lbList[lbIdx];
    if (!src) return;
    var node;
    if (isVideo(src)) {
      node = document.createElement('video');
      node.src = src; node.controls = true; node.autoplay = true;
      node.loop = true; node.muted = true; node.playsInline = true;
    } else {
      node = document.createElement('img');
      node.src = src; node.alt = lbTitle.textContent;
    }
    lbStage.appendChild(node);
    lbCount.textContent = (lbIdx + 1) + ' / ' + lbList.length;
    if (hasGSAP && !reduced) gsap.from(node, { opacity: 0, scale: .98, duration: .5, ease: 'expo.out' });
  }
  function stepLB(d) { lbIdx = (lbIdx + d + lbList.length) % lbList.length; drawLB(); }

  document.getElementById('lbClose').addEventListener('click', closeLB);
  document.getElementById('lbPrev').addEventListener('click', function () { stepLB(-1); });
  document.getElementById('lbNext').addEventListener('click', function () { stepLB(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target === lbStage) closeLB(); });

  function lock(on) {
    document.body.classList.toggle('is-locked', on);
    if (window.__lenis) { on ? window.__lenis.stop() : window.__lenis.start(); }
  }

  /* ══ PASSES ═════════════════════════════════════════════════ */

  var passBtns = document.querySelectorAll('[data-pass-btn]');
  var currentPass = 'beauty', depthNodes = null;

  function setPass(p) {
    currentPass = p;
    document.documentElement.setAttribute('data-pass', p);
    Array.prototype.forEach.call(passBtns, function (b) {
      var on = b.dataset.passBtn === p;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (window.GL && window.GL.setPass) window.GL.setPass(p);
    if (p === 'depth') depthTick(); else clearDepth();
  }
  Array.prototype.forEach.call(passBtns, function (b) {
    b.addEventListener('click', function () { setPass(b.dataset.passBtn); });
  });
  function depthTick() {
    if (currentPass !== 'depth') return;
    if (!depthNodes) depthNodes = document.querySelectorAll('.frame');
    var h = window.innerHeight;
    Array.prototype.forEach.call(depthNodes, function (m) {
      var r = m.getBoundingClientRect();
      if (r.bottom < -200 || r.top > h + 200) return;
      var d = Math.abs((r.top + r.height / 2) - h / 2) / h;
      m.style.setProperty('--z', (1.25 - Math.min(1, d) * 1.05).toFixed(3));
    });
  }
  function clearDepth() {
    if (!depthNodes) return;
    Array.prototype.forEach.call(depthNodes, function (m) { m.style.removeProperty('--z'); });
  }

  /* ══ CURSOR + MAGNET ════════════════════════════════════════ */

  var cursor = document.getElementById('cursor');
  var cursorLabel = document.getElementById('cursorLabel');
  var lastPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  var cx = lastPointer.x, cy = lastPointer.y;

  function hover(node, label) {
    if (!fine) return;
    node.addEventListener('pointerenter', function () { cursor.classList.add('is-big'); cursorLabel.textContent = label; });
    node.addEventListener('pointerleave', function () { cursor.classList.remove('is-big'); cursorLabel.textContent = ''; });
  }
  window.addEventListener('pointermove', function (e) { lastPointer.x = e.clientX; lastPointer.y = e.clientY; }, { passive: true });
  if (fine) {
    (function loop() {
      cx += (lastPointer.x - cx) * .22; cy += (lastPointer.y - cy) * .22;
      cursor.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      requestAnimationFrame(loop);
    })();

    document.querySelectorAll('[data-magnet]').forEach(function (n) {
      n.addEventListener('pointermove', function (e) {
        var r = n.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        if (hasGSAP) gsap.to(n, { x: dx * .28, y: dy * .34, duration: .5, ease: 'power3.out' });
      });
      n.addEventListener('pointerleave', function () {
        if (hasGSAP) gsap.to(n, { x: 0, y: 0, duration: .7, ease: 'elastic.out(1,.4)' });
      });
    });
  }

  /* ══ SCRAMBLE ═══════════════════════════════════════════════ */

  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#*-+=';
  function scramble(node) {
    if (reduced) return;
    var final = node.dataset.final || node.textContent;
    node.dataset.final = final;
    if (node.dataset.busy === '1') return;
    node.dataset.busy = '1';
    var i = 0, t = 0;
    var id = setInterval(function () {
      t++;
      var out = '';
      for (var c = 0; c < final.length; c++) {
        if (final[c] === ' ') { out += ' '; continue; }
        out += c < i ? final[c] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      node.textContent = out;
      if (t % 2 === 0) i++;
      if (i > final.length) { clearInterval(id); node.textContent = final; node.dataset.busy = '0'; }
    }, 28);
  }
  document.querySelectorAll('[data-scramble]').forEach(function (n) {
    n.dataset.final = n.textContent;
    var host = n.closest('a,button') || n;
    host.addEventListener('pointerenter', function () { scramble(n); });
  });

  /* ══ TICKER ═════════════════════════════════════════════════ */

  var tickerRow = document.getElementById('tickerRow');
  var TICK = ['WORLDS, WORN-IN', 'LIGHT FIRST', 'BUILT IN HYDERABAD', 'MAYA · ARNOLD · SUBSTANCE',
    'OPEN FOR COMMISSIONS', '16 CLIENTS SHIPPED', '3 WORLDS BUILT'];
  (function fillTicker() {
    var html = '';
    for (var r = 0; r < 3; r++) {
      TICK.forEach(function (t) { html += '<span>' + t + ' <b>✦</b></span>'; });
    }
    tickerRow.innerHTML = html;
  })();

  /* ══ SPLIT ══════════════════════════════════════════════════ */

  function splitWords(node) {
    var out = [];
    (function walk(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (piece) {
            if (!piece) return;
            if (/^\s+$/.test(piece)) { frag.appendChild(document.createTextNode(' ')); return; }
            var m = el('span', 'w-mask'), w = el('span', 'w-word', piece);
            m.appendChild(w); frag.appendChild(m); out.push(w);
          });
          n.replaceChild(frag, c);
        } else if (c.nodeType === 1) walk(c);
      });
    })(node);
    return out;
  }
  function splitChars(node) {
    var text = node.textContent, out = [];
    node.textContent = '';
    text.split('').forEach(function (ch) {
      if (ch === ' ') { node.appendChild(document.createTextNode(' ')); return; }
      var m = el('span', 'w-mask'), c = el('span', 'w-char', ch);
      m.appendChild(c); node.appendChild(m); out.push(c);
    });
    return out;
  }

  /* ══ MENU ═══════════════════════════════════════════════════ */

  var menuBtn = document.getElementById('menuBtn');
  var indexPanel = document.getElementById('indexPanel');
  var peekImg = document.getElementById('peekImg');
  var peek = document.querySelector('.index__peek');
  var menuOpen = false;

  function toggleMenu(on) {
    menuOpen = on;
    menuBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
    document.body.classList.toggle('menu-open', on);
    if (on) {
      indexPanel.hidden = false;
      lock(true);
      if (hasGSAP && !reduced) {
        gsap.fromTo(indexPanel, { clipPath: 'inset(0 0 100% 0)' },
          { clipPath: 'inset(0 0 0% 0)', duration: .9, ease: 'expo.inOut' });
        gsap.from(indexPanel.querySelectorAll('.index__list a'),
          { y: 60, opacity: 0, duration: .8, stagger: .06, delay: .18, ease: 'expo.out' });
      } else indexPanel.style.clipPath = 'inset(0 0 0% 0)';
    } else {
      var done = function () { indexPanel.hidden = true; lock(false); };
      if (hasGSAP && !reduced) gsap.to(indexPanel, { clipPath: 'inset(0 0 100% 0)', duration: .7, ease: 'expo.inOut', onComplete: done });
      else done();
    }
  }
  menuBtn.addEventListener('click', function () { toggleMenu(!menuOpen); });
  indexPanel.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('pointerenter', function () {
      peekImg.src = a.dataset.peek;
      peek.classList.add('is-on');
    });
    a.addEventListener('pointerleave', function () { peek.classList.remove('is-on'); });
    a.addEventListener('click', function () { toggleMenu(false); });
  });
  setInterval(function () {
    var d = new Date(Date.now() + (330 + new Date().getTimezoneOffset()) * 60000);
    document.getElementById('indexClock').textContent =
      pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + ' IST';
  }, 1000);

  /* ══ KEYS ═══════════════════════════════════════════════════ */

  document.addEventListener('keydown', function (e) {
    if (!lb.hidden) {
      if (e.key === 'Escape') closeLB();
      if (e.key === 'ArrowRight') stepLB(1);
      if (e.key === 'ArrowLeft') stepLB(-1);
      return;
    }
    if (!caseEl.hidden && e.key === 'Escape') { closeCase(); return; }
    if (menuOpen && e.key === 'Escape') { toggleMenu(false); return; }
    var map = { '1': 'beauty', '2': 'clay', '3': 'wire', '4': 'depth' };
    if (map[e.key] && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) setPass(map[e.key]);
  });

  /* ══ SCROLL ═════════════════════════════════════════════════ */

  var lenis = null;
  if (!reduced && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true, touchMultiplier: 1.7 });
    window.__lenis = lenis;
    lenis.stop();
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
  }
  window.addEventListener('scroll', depthTick, { passive: true });

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var target = id === '#top' ? document.body : document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (menuOpen) toggleMenu(false);
      setTimeout(function () {
        if (lenis) lenis.scrollTo(target, { duration: 1.6 });
        else target.scrollIntoView({ behavior: 'smooth' });
      }, menuOpen ? 500 : 0);
    });
  });

  /* ══ MOTION ═════════════════════════════════════════════════ */

  function buildMotion() {
    if (!hasGSAP || reduced) return;
    document.body.classList.add('js-anim');

    document.querySelectorAll('[data-split]').forEach(function (n) {
      var words = splitWords(n);
      gsap.to(words, { y: 0, duration: 1.05, ease: 'expo.out', stagger: .035,
        scrollTrigger: { trigger: n, start: 'top 86%' } });
    });
    document.querySelectorAll('.reveal').forEach(function (n) {
      gsap.to(n, { opacity: 1, y: 0, duration: 1, ease: 'expo.out',
        scrollTrigger: { trigger: n, start: 'top 90%' } });
    });

    // method: pinned horizontal with a progress rail
    var track = document.getElementById('methodTrack');
    var prog = document.getElementById('methodProg');
    if (window.innerWidth > 760) {
      ScrollTrigger.create({
        trigger: '.method', start: 'top top',
        end: function () { return '+=' + (track.scrollWidth - window.innerWidth + 500); },
        pin: '.method__sticky', scrub: .55, anticipatePin: 1,
        onUpdate: function (self) {
          var max = Math.max(0, track.scrollWidth - window.innerWidth + 80);
          gsap.set(track, { x: -max * self.progress });
          gsap.set(prog, { scaleX: self.progress });
          var idx = Math.round(self.progress * (STEPS.length - 1));
          Array.prototype.forEach.call(track.children, function (li, i) { li.classList.toggle('is-on', i <= idx); });
        }
      });
    } else {
      Array.prototype.forEach.call(track.children, function (li) {
        ScrollTrigger.create({ trigger: li, start: 'top 80%', onEnter: function () { li.classList.add('is-on'); } });
      });
    }

    // ticker drifts, and shoves along with scroll velocity
    var tickX = 0, half = tickerRow.scrollWidth / 3;
    gsap.ticker.add(function () {
      tickX -= 0.65 + Math.abs(velocity()) * 22;
      if (half && tickX <= -half) tickX += half;
      gsap.set(tickerRow, { x: tickX });
    });

    // sections skew a touch with velocity — the classic, kept subtle
    var skewTargets = document.querySelectorAll('.wall, .bento, .strip');
    gsap.ticker.add(function () {
      var s = gsap.utils.clamp(-4, 4, velocity() * 90);
      gsap.set(skewTargets, { skewY: s * .35 });
    });

    setTimeout(function () { ScrollTrigger.refresh(); }, 700);
  }

  var lastY = window.scrollY, vel = 0;
  function velocity() { return vel; }
  (function velLoop() {
    var y = window.scrollY;
    vel += ((y - lastY) / Math.max(1, window.innerHeight) - vel) * .12;
    vel *= .92;
    lastY = y;
    requestAnimationFrame(velLoop);
  })();

  /* ══ HERO HUD ═══════════════════════════════════════════════ */

  var t0 = Date.now();
  setInterval(function () {
    var s = Math.floor((Date.now() - t0) / 1000);
    var f = document.getElementById('hudTime');
    if (f) f.textContent = '00:' + pad2(Math.floor(s / 60)) + ':' + pad2(s % 60);
  }, 1000);

  /* ══ BOOT ═══════════════════════════════════════════════════ */

  var boot = document.getElementById('boot');
  var bootGrid = document.getElementById('bootGrid');
  var bootPct = document.getElementById('bootPct');
  var bootTask = document.getElementById('bootTask');
  var bootRule = document.getElementById('bootRule');
  var TASKS = ['allocating buckets', 'loading textures', 'building BVH', 'sampling 128 / 512', 'denoising', 'beauty pass'];

  var tiles = [];
  for (var i = 0; i < 144; i++) { var t = document.createElement('i'); bootGrid.appendChild(t); tiles.push(t); }
  var order = tiles.map(function (t, i) {
    return { t: t, k: Math.floor(i / 16) * 16 * 1.5 + (i % 16) + Math.random() * 10 };
  }).sort(function (a, b) { return a.k - b.k; });

  var preload = [IMG + 'japa-render-1.webp', IMG + 'fudomyo-render-1.webp', IMG + 'koipond-render-2.webp'];
  var loaded = 0;
  preload.forEach(function (src) {
    var im = new Image();
    im.onload = im.onerror = function () { loaded++; };
    im.src = src;
  });

  var p = 0, start = performance.now(), done = false;
  (function tick() {
    var elapsed = (performance.now() - start) / 1000;
    var target = Math.min(100, elapsed / 2.4 * 62 + (loaded / preload.length) * 38);
    if (elapsed > 6) target = 100;
    p += (target - p) * .075;
    var shown = Math.min(100, Math.round(p));
    bootPct.textContent = String(shown).padStart(3, '0');
    bootTask.textContent = TASKS[Math.min(TASKS.length - 1, Math.floor(shown / 100 * TASKS.length))];
    bootRule.style.transform = 'scaleX(' + shown / 100 + ')';
    var n = Math.floor(shown / 100 * order.length);
    for (var i = 0; i < n; i++) order[i].t.classList.add('on');
    if (shown >= 100 && !done) { done = true; finish(); }
    else requestAnimationFrame(tick);
  })();

  function finish() {
    if (window.GL && window.GL.mount) { window.GL.mount(); window.GL.start(); }
    setTimeout(function () {
      var wipe = document.getElementById('wipe');
      var reveal = function () {
        boot.style.display = 'none';
        document.body.classList.remove('is-booting');
        if (lenis) lenis.start();
        heroIntro();
        buildMotion();
      };
      if (hasGSAP && !reduced) {
        var tl = gsap.timeline();
        tl.to(wipe, { scaleY: 1, duration: .55, ease: 'expo.inOut', transformOrigin: 'bottom' })
          .add(reveal)
          .set(wipe, { transformOrigin: 'top' })
          .to(wipe, { scaleY: 0, duration: .7, ease: 'expo.inOut' }, '+=0.05');
      } else reveal();
    }, 240);
  }

  function heroIntro() {
    if (!hasGSAP || reduced) return;
    var fam = document.getElementById('heroFamily');
    var chars = splitChars(fam);
    gsap.set(chars, { yPercent: 110 });
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(chars, { yPercent: 0, duration: 1.3, stagger: .05 }, .05)
      .from('.hero__given', { opacity: 0, x: -18, duration: 1 }, .3)
      .from('.hero__eyebrow span', { opacity: 0, y: 14, duration: .9, stagger: .08 }, .45)
      .from('.hero__line', { opacity: 0, y: 20, duration: 1 }, .65)
      .from('.hero__hud', { opacity: 0, x: 24, duration: .9 }, .8)
      .from('.ticker', { yPercent: 100, duration: .9 }, .8)
      .from('.topbar, .passbar, .hero__scroll', { opacity: 0, duration: .8, stagger: .06 }, .95);
    document.querySelectorAll('.hero__eyebrow [data-scramble]').forEach(function (n, i) {
      setTimeout(function () { scramble(n); }, 700 + i * 160);
    });
  }

  /* ══ ONE SMALL JOKE ═════════════════════════════════════════ */

  var propHint = document.getElementById('propHint');
  if (propHint) {
    propHint.addEventListener('click', function () {
      if (window.GL && window.GL.flyHat && window.GL.flyHat()) {
        propHint.textContent = 'HE WANTS IT BACK';
        setTimeout(function () { propHint.textContent = 'KNOCK THE HAT OFF'; }, 3000);
        return;
      }
      var img = new Image();
      img.src = IMG + 'manwiththestrawhat-flying.webp';
      img.alt = '';
      img.style.cssText = 'position:fixed;z-index:70;width:min(220px,30vw);left:50%;top:-25vh;translate:-50% 0;pointer-events:none';
      document.body.appendChild(img);
      if (hasGSAP) {
        gsap.to(img, { y: window.innerHeight * 1.4, rotate: 24, duration: 2.4, ease: 'power1.in',
          onComplete: function () { img.remove(); } });
      } else setTimeout(function () { img.remove(); }, 1800);
    });
  }
})();
