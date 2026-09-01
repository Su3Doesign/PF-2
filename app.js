/* ══════════════════════════════════════════════════════════════
   app.js — pages, router, overlays, motion.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var D = window.DATA;
  var IMG = D.IMG, VID = D.VID, POS = D.POS;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  var main = document.getElementById('pageMain');
  var lenis = null, triggers = [], tickers = [];

  /* ══ helpers ═══════════════════════════════════════════════ */

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function isVideo(p) { return /\.mp4$/i.test(p); }
  function stem(p) { return p.split('/').pop().replace(/\.[a-z0-9]+$/i, ''); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* ══ the honest part of "protection" ═══════════════════════ */
  /* Everything the browser shows has already been downloaded. What
     this does: removes the two easy paths (right-click, drag-out),
     and — far more effective — renders the hero, the world plates
     and the whole archive through WebGL, where there is no <img>
     element to save and no source to inspect in the element panel.
     Full-resolution files are simply not on this server.          */

  var toast = null;
  function nope(msg) {
    if (!toast) { toast = el('div', 'toast'); document.body.appendChild(toast); }
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toast.classList.remove('is-on'); }, 2600);
  }
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    nope('Right-click is off. Want a full-res file? sumanth.richie25@icloud.com');
  });
  document.addEventListener('dragstart', function (e) {
    if (e.target && /^(IMG|VIDEO|CANVAS)$/.test(e.target.tagName)) e.preventDefault();
  });

  /* ══ media ═════════════════════════════════════════════════ */

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
    var ms = Math.max(8, 560 / tiles.length);
    tiles.forEach(function (o, i) { setTimeout(function () { o.t.classList.add('gone'); }, i * ms); });
    setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, tiles.length * ms + 700);
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
      v.setAttribute('draggable', 'false');
      wrap.appendChild(v);
      vidIO.observe(v);
    } else {
      var img = document.createElement('img');
      img.alt = o.alt || ''; img.loading = 'lazy'; img.decoding = 'async';
      img.dataset.src = src;
      img.setAttribute('draggable', 'false');
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

  /* ══ cursor ════════════════════════════════════════════════ */

  var cursor = document.getElementById('cursor');
  var cursorLabel = document.getElementById('cursorLabel');
  var mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  var cx = mouse.x, cy = mouse.y;

  window.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  if (fine) {
    (function loop() {
      cx += (mouse.x - cx) * .22; cy += (mouse.y - cy) * .22;
      cursor.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      requestAnimationFrame(loop);
    })();
  }
  function hover(node, label) {
    if (!fine) return;
    node.addEventListener('pointerenter', function () { cursor.classList.add('is-big'); cursorLabel.textContent = label; });
    node.addEventListener('pointerleave', function () { cursor.classList.remove('is-big'); cursorLabel.textContent = ''; });
  }
  function unhover() { cursor.classList.remove('is-big'); cursorLabel.textContent = ''; }

  /* ══ scramble ══════════════════════════════════════════════ */

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
        out += final[c] === ' ' ? ' ' : (c < i ? final[c] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
      }
      node.textContent = out;
      if (t % 2 === 0) i++;
      if (i > final.length) { clearInterval(id); node.textContent = final; node.dataset.busy = '0'; }
    }, 26);
  }
  function wireScramble(root) {
    (root || document).querySelectorAll('[data-scramble]').forEach(function (n) {
      if (n.dataset.wired) return;
      n.dataset.wired = '1';
      n.dataset.final = n.textContent;
      (n.closest('a,button') || n).addEventListener('pointerenter', function () { scramble(n); });
    });
  }

  /* ══ split ═════════════════════════════════════════════════ */

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

  /* ══ lightbox ══════════════════════════════════════════════ */

  var lb = document.getElementById('lb');
  var lbStage = document.getElementById('lbStage');
  var lbTitle = document.getElementById('lbTitle');
  var lbCount = document.getElementById('lbCount');
  var lbList = [], lbIdx = 0, lbBack = null;

  function openLB(list, idx, title) {
    lbBack = document.activeElement;
    lbList = list.slice(); lbIdx = Math.max(0, idx);
    lbTitle.textContent = title;
    lb.hidden = false;
    lock(true); unhover();
    drawLB();
    document.getElementById('lbClose').focus();
    if (hasGSAP && !reduced) gsap.from(lb, { opacity: 0, duration: .3 });
  }
  function closeLB() {
    lb.hidden = true; lbStage.innerHTML = '';
    if (!archiveOpen && indexPanel.hidden) lock(false);
    if (lbBack && lbBack.focus) lbBack.focus();
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
    node.setAttribute('draggable', 'false');
    lbStage.appendChild(node);
    lbCount.textContent = (lbIdx + 1) + ' / ' + lbList.length;
    if (hasGSAP && !reduced) gsap.from(node, { opacity: 0, scale: .97, duration: .5, ease: 'expo.out' });
  }
  function stepLB(d) { lbIdx = (lbIdx + d + lbList.length) % lbList.length; drawLB(); }
  document.getElementById('lbClose').addEventListener('click', closeLB);
  document.getElementById('lbPrev').addEventListener('click', function () { stepLB(-1); });
  document.getElementById('lbNext').addEventListener('click', function () { stepLB(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target === lbStage) closeLB(); });

  function lock(on) {
    document.body.classList.toggle('is-locked', on);
    if (lenis) { on ? lenis.stop() : lenis.start(); }
  }

  /* ══ the archive — infinite WebGL mosaic ═══════════════════ */

  var archive = document.getElementById('archive');
  var archiveStage = document.getElementById('archiveStage');
  var archiveLabel = document.getElementById('archiveLabel');
  var archiveChips = document.getElementById('archiveChips');
  var archiveOpen = false;

  (function buildChips() {
    var labels = ['ALL'];
    D.CLIENTS.forEach(function (c) { if (c.files.length) labels.push(c.name); });
    labels.push('Studies');
    labels.forEach(function (l, i) {
      var b = el('button', 'chip' + (i === 0 ? ' is-on' : ''), l.toUpperCase());
      b.addEventListener('click', function () {
        archiveChips.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        if (window.GL) window.GL.filterMosaic(l === 'ALL' ? null : l);
      });
      archiveChips.appendChild(b);
    });
  })();

  function openArchive() {
    if (archiveOpen) return;
    archiveOpen = true;
    archive.hidden = false;
    lock(true); unhover();
    document.body.classList.add('archive-open');
    if (window.GL) {
      var m = window.GL.mountMosaic(archiveStage, D.MOSAIC);
      if (m) {
        m.onHover = function (item) {
          if (!item) { archiveLabel.classList.remove('is-on'); return; }
          archiveLabel.classList.add('is-on');
          archiveLabel.querySelector('b').textContent = item.label;
          archiveLabel.querySelector('span').textContent = item.group;
        };
        m.onPick = function (item) {
          if (item.ci >= 0) {
            var c = D.CLIENTS[item.ci];
            openLB(c.files, c.files.indexOf(item.src), c.name);
          } else {
            openLB(D.STUDIES.map(function (s) { return s.src; }),
              D.STUDIES.map(function (s) { return s.src; }).indexOf(item.src), item.label);
          }
        };
        window.GL.nudgeMosaic(-14, -9);
      }
    }
    if (hasGSAP && !reduced) {
      gsap.fromTo(archive, { clipPath: 'inset(0 0 100% 0)' },
        { clipPath: 'inset(0 0 0% 0)', duration: .9, ease: 'expo.inOut' });
      gsap.from('.archive__ui > *', { y: 30, opacity: 0, duration: .8, stagger: .05, delay: .25, ease: 'expo.out' });
    }
  }
  function closeArchive() {
    if (!archiveOpen) return;
    var done = function () {
      archive.hidden = true; archiveOpen = false;
      document.body.classList.remove('archive-open');
      if (window.GL) window.GL.unmountMosaic();
      if (lb.hidden) lock(false);
    };
    if (hasGSAP && !reduced) gsap.to(archive, { clipPath: 'inset(0 0 100% 0)', duration: .7, ease: 'expo.inOut', onComplete: done });
    else done();
  }
  document.getElementById('archiveClose').addEventListener('click', closeArchive);
  archiveStage.addEventListener('pointermove', function (e) {
    archiveLabel.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
  });

  /* ══ index overlay ═════════════════════════════════════════ */

  var menuBtn = document.getElementById('menuBtn');
  var indexPanel = document.getElementById('indexPanel');
  var peekWrap = document.getElementById('indexPeek');
  var peekImg = document.getElementById('peekImg');
  var menuOpen = false, peekX, peekY;

  if (hasGSAP && fine) {
    peekX = gsap.quickTo(peekWrap, 'x', { duration: .7, ease: 'power3' });
    peekY = gsap.quickTo(peekWrap, 'y', { duration: .7, ease: 'power3' });
  }
  indexPanel.addEventListener('pointermove', function (e) {
    if (peekX) { peekX(e.clientX); peekY(e.clientY); }
  });

  var PEEK_IN = [
    { clipPath: 'inset(0 100% 0 0)', rotate: -6, scale: 1.15 },
    { clipPath: 'inset(100% 0 0 0)', rotate: 5, scale: 1.1 },
    { clipPath: 'inset(0 0 0 100%)', rotate: 8, scale: 1.2 },
    { clipPath: 'inset(0 0 100% 0)', rotate: -4, scale: 1.08 }
  ];

  function toggleMenu(on) {
    menuOpen = on;
    menuBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
    document.body.classList.toggle('menu-open', on);
    if (on) {
      indexPanel.hidden = false;
      lock(true); unhover();
      if (hasGSAP && !reduced) {
        gsap.fromTo(indexPanel, { clipPath: 'inset(0 0 100% 0)' },
          { clipPath: 'inset(0 0 0% 0)', duration: .9, ease: 'expo.inOut' });
        gsap.from(indexPanel.querySelectorAll('.index__row'),
          { yPercent: 110, opacity: 0, duration: .9, stagger: .055, delay: .15, ease: 'expo.out' });
      }
    } else {
      var done = function () { indexPanel.hidden = true; if (lb.hidden && !archiveOpen) lock(false); };
      if (hasGSAP && !reduced) gsap.to(indexPanel, { clipPath: 'inset(0 0 100% 0)', duration: .65, ease: 'expo.inOut', onComplete: done });
      else done();
    }
  }
  menuBtn.addEventListener('click', function () { toggleMenu(!menuOpen); });

  // index rows that point at a section rather than a world
  indexPanel.querySelectorAll('[data-goto]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var to = a.dataset.goto;
      toggleMenu(false);
      var jump = function () {
        if (to === 'archive') { openArchive(); return; }
        var t = document.getElementById(to);
        if (!t) return;
        if (lenis) lenis.scrollTo(t, { duration: 1.5 }); else t.scrollIntoView({ behavior: 'smooth' });
      };
      if (document.body.dataset.page === 'work' && to !== 'archive') {
        go('./', null, true);
        setTimeout(jump, 1700);
      } else setTimeout(jump, 480);
    });
  });

  indexPanel.querySelectorAll('.index__row').forEach(function (a, i) {
    a.addEventListener('pointerenter', function () {
      peekImg.src = a.dataset.peek;
      peekWrap.classList.add('is-on');
      if (hasGSAP && !reduced) {
        var from = PEEK_IN[i % PEEK_IN.length];
        gsap.fromTo(peekImg, { clipPath: from.clipPath, scale: from.scale, rotate: from.rotate },
          { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, rotate: 0, duration: .85, ease: 'expo.out' });
      }
    });
    a.addEventListener('pointerleave', function () { peekWrap.classList.remove('is-on'); });
  });

  setInterval(function () {
    var d = new Date(Date.now() + (330 + new Date().getTimezoneOffset()) * 60000);
    var c = document.getElementById('indexClock');
    if (c) c.textContent = pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + ' IST';
  }, 1000);

  /* ══ light rig ═════════════════════════════════════════════ */

  var rig = document.getElementById('rig');
  var rigPad = document.getElementById('rigPad');
  var rigPuck = document.getElementById('rigPuck');
  var rigRead = document.getElementById('rigRead');

  function applyLight(nx, ny) {
    nx = Math.max(-1, Math.min(1, nx));
    ny = Math.max(-1, Math.min(1, ny));
    rigPuck.style.left = ((nx + 1) / 2 * 100) + '%';
    rigPuck.style.top = ((1 - ny) / 2 * 100) + '%';
    var warm = window.GL && window.GL.setLight ? window.GL.setLight(nx, ny) : (nx + 1) / 2;
    // left of centre = tungsten and orange, right = daylight and cyan
    var k = Math.round(2200 + warm * 4600);
    rigRead.textContent = k + 'K · ' + (ny > 0 ? 'HIGH' : 'LOW');
    var h = warm < 0.5 ? 14 + warm * 2 * 16 : 30 + (warm - 0.5) * 2 * 165;
    var sat = warm < 0.5 ? 100 : 100 - (warm - 0.5) * 2 * 30;
    document.documentElement.style.setProperty('--key',
      'hsl(' + h.toFixed(0) + ',' + sat.toFixed(0) + '%,' + (warm < 0.5 ? 55 : 52) + '%)');
  }
  function rigFromEvent(e) {
    var r = rigPad.getBoundingClientRect();
    applyLight(((e.clientX - r.left) / r.width) * 2 - 1, (1 - (e.clientY - r.top) / r.height) * 2 - 1);
  }
  var rigDown = false;
  rigPad.addEventListener('pointerdown', function (e) { rigDown = true; rigPad.setPointerCapture(e.pointerId); rigFromEvent(e); });
  rigPad.addEventListener('pointermove', function (e) { if (rigDown) rigFromEvent(e); });
  window.addEventListener('pointerup', function () { rigDown = false; });
  rigPad.addEventListener('keydown', function (e) {
    var step = 0.12, nx = (parseFloat(rigPuck.style.left) / 50) - 1, ny = 1 - (parseFloat(rigPuck.style.top) / 50);
    if (e.key === 'ArrowLeft') applyLight(nx - step, ny);
    else if (e.key === 'ArrowRight') applyLight(nx + step, ny);
    else if (e.key === 'ArrowUp') applyLight(nx, ny + step);
    else if (e.key === 'ArrowDown') applyLight(nx, ny - step);
    else return;
    e.preventDefault();
  });
  applyLight(-0.45, 0.55);

  /* ══ keys ══════════════════════════════════════════════════ */

  document.addEventListener('keydown', function (e) {
    if (!lb.hidden) {
      if (e.key === 'Escape') closeLB();
      if (e.key === 'ArrowRight') stepLB(1);
      if (e.key === 'ArrowLeft') stepLB(-1);
      return;
    }
    if (archiveOpen && e.key === 'Escape') { closeArchive(); return; }
    if (menuOpen && e.key === 'Escape') { toggleMenu(false); return; }
    if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    if (e.key === 'a' || e.key === 'A') { archiveOpen ? closeArchive() : openArchive(); }
    if (e.key === 'w' || e.key === 'W') {
      if (window.GL && window.GL.toggleWire) {
        var on = window.GL.toggleWire();
        document.documentElement.classList.toggle('is-wire', on);
        nope(on ? 'Wireframe view — press W again' : 'Beauty pass');
      }
    }
  });

  /* ══ scroll ════════════════════════════════════════════════ */

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

  function scrollToTop() {
    if (lenis) lenis.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
  }

  /* ══ ROUTER ════════════════════════════════════════════════ */
  /* Pages are thin shells; <main> is rendered from DATA. So moving
     between worlds never reloads — the canvas keeps running and the
     two plates dissolve into each other.                          */

  var routing = false;

  function currentPlate() {
    var p = document.body.dataset.project;
    if (p) { var w = D.byId(p); if (w) return w.plate; }
    return D.WORLDS[0].plate;
  }

  function go(url, project, push) {
    if (routing) return;
    routing = true;
    var to = project ? D.byId(project) : null;
    var toPlate = to ? to.plate : D.WORLDS[0].plate;
    var fromPlate = currentPlate();

    var swap = function () {
      if (menuOpen) toggleMenu(false);
      if (archiveOpen) closeArchive();
      teardown();
      document.body.dataset.page = project ? 'work' : 'home';
      if (project) document.body.dataset.project = project; else delete document.body.dataset.project;
      document.title = to
        ? to.title + ' — Amidyala Sai Sumanth'
        : 'Amidyala Sai Sumanth — 3D Environment Artist & Visual Designer';
      if (push !== false) history.pushState({ project: project || null }, '', url);
      scrollToTop();
      render();
    };

    if (window.GL && window.GL.transition && !reduced) {
      document.body.classList.add('is-routing');
      window.GL.transition(fromPlate, toPlate, swap, function () {
        document.body.classList.remove('is-routing');
        routing = false;
      });
    } else { swap(); routing = false; }
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[data-link]') : null;
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    e.preventDefault();
    go(a.getAttribute('href'), a.dataset.project || null, true);
  });

  window.addEventListener('popstate', function (e) {
    var p = e.state && e.state.project ? e.state.project : null;
    go(p ? p + '.html' : './', p, false);
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a || a.dataset.goto || a.dataset.link !== undefined) return;
    var id = a.getAttribute('href');
    e.preventDefault();
    var t = id === '#top' ? document.body : document.querySelector(id);
    if (!t) return;
    if (lenis) lenis.scrollTo(t, { duration: 1.5 }); else t.scrollIntoView({ behavior: 'smooth' });
  });

  function teardown() {
    triggers.forEach(function (t) { t.kill && t.kill(); });
    triggers = [];
    tickers.forEach(function (f) { if (hasGSAP) gsap.ticker.remove(f); });
    tickers = [];
    if (hasGSAP) ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
    if (window.GL) window.GL.unmount();
    main.innerHTML = '';
  }

  /* ══ BUILDERS ══════════════════════════════════════════════ */

  function sectionHead(n, kicker, h, sub) {
    var d = el('div', 'section-head');
    d.appendChild(el('p', 'eyebrow', '<span class="eyebrow__n">' + n + '</span> <span data-scramble>' + kicker + '</span>'));
    d.appendChild(el('h2', 'section-head__h', h)).setAttribute('data-split', '');
    if (sub) d.appendChild(el('p', 'section-head__sub', sub));
    return d;
  }

  function buildHome() {
    var f = document.createDocumentFragment();

    /* hero */
    var hero = el('section', 'hero');
    hero.id = 'hero';
    hero.setAttribute('data-gl-glass', '');
    hero.innerHTML =
      '<div class="hero__plate" data-gl="' + D.WORLDS[0].plate + '">' +
      '<img src="' + D.WORLDS[0].plate + '" alt="' + D.WORLDS[0].alt + '" draggable="false" fetchpriority="high"></div>' +
      '<div class="hero__scrim"></div>' +
      '<div class="hero__type">' +
        '<p class="hero__eyebrow"><span data-scramble>3D ENVIRONMENT ARTIST</span>' +
        '<span data-scramble>VISUAL DESIGNER</span><span data-scramble>HYDERABAD</span></p>' +
        '<h1 class="hero__name"><span class="hero__given">Amidyala Sai</span>' +
        '<span class="hero__family" id="heroFamily">SUMANTH</span></h1>' +
        '<p class="hero__line">I build places that don\'t exist, then decide how the light behaves once it gets there.</p>' +
      '</div>' +
      '<div class="hero__hud"><div class="hud__row"><b>RENDERING</b><span>roman-no-yoake</span></div>' +
        '<div class="hud__row"><span>MAYA · ARNOLD</span><span>512 spp</span></div>' +
        '<div class="hud__row"><span>3840 × 2160</span><span id="hudTime">00:00:00</span></div>' +
        '<div class="hud__bar"><i id="hudFill"></i></div></div>' +
      '<a class="hero__scroll" href="#manifesto" data-magnet><span>SCROLL</span><i></i></a>' +
      '<div class="ticker"><div class="ticker__row" id="tickerRow"></div></div>';
    f.appendChild(hero);

    /* manifesto */
    var man = el('section', 'manifesto');
    man.id = 'manifesto';
    man.innerHTML =
      '<p class="eyebrow"><span class="eyebrow__n">00</span> <span data-scramble>THE PASS BEFORE THE BEAUTY PASS</span></p>' +
      '<h2 class="manifesto__head" data-split>Every frame here began as grey boxes and one light that had to justify itself.</h2>' +
      '<div class="manifesto__cols"><div class="manifesto__body">' +
        '<p class="lede">I\'m Sumanth. Half of my work is quiet — shrines, ponds, pagodas, held at the one hour they actually make sense.</p>' +
        '<p>The other half ships on a Friday for agencies in Toronto and San Juan: air conditioners, burgers, jewellery, bank ads. Both halves want the same thing from me. A place that looks kept. Light with somewhere to be.</p>' +
        '<p>Trained through the agency pipeline, raised on anime frames I paused for too long. The two don\'t argue. They argue with the work, and the work answers.</p>' +
      '</div><figure class="manifesto__clay">' +
        '<div class="frame frame--4x3" data-gl="' + IMG + '19.webp"><img data-src="' + IMG + '19.webp" draggable="false" alt="Grey primitive lighting study"></div>' +
        '<figcaption>18% grey, three primitives, one key. Where every scene starts — and what this site is painted in.</figcaption>' +
      '</figure></div>' +
      '<dl class="specs">' +
        '<div><dt>Based</dt><dd>Hyderabad, India · remote or on-site</dd></div>' +
        '<div><dt>Core</dt><dd>Maya · ZBrush · Substance · Arnold</dd></div>' +
        '<div><dt>Also</dt><dd>Unreal · After Effects · Photoshop · Illustrator</dd></div>' +
        '<div><dt>Works in</dt><dd>Environments · Product viz · Campaign design</dd></div>' +
        '<div><dt>Status</dt><dd class="is-live">Open — commission, full-time, collaboration</dd></div>' +
      '</dl>';
    f.appendChild(man);

    /* worlds */
    var worlds = el('section', 'worlds');
    worlds.id = 'worlds';
    worlds.appendChild(sectionHead('01', 'SELECTED WORLDS', 'Three places, built to be stood in.'));
    D.WORLDS.forEach(function (w, i) {
      var a = el('a', 'world');
      a.href = w.url;
      a.setAttribute('data-link', '');
      a.dataset.project = w.id;
      a.innerHTML =
        '<div class="world__plate"><div class="frame frame--plate" data-gl="' + w.plate + '">' +
        '<img data-src="' + w.plate + '" alt="' + w.alt + '" draggable="false"></div>' +
        '<div class="world__glow"></div>' +
        '<div class="world__cap"><div><span class="world__jp">' + w.jp + '</span>' +
        '<h3 class="world__title">' + w.title + '</h3>' +
        '<span class="world__open">ENTER <i>→</i></span></div>' +
        '<div class="world__meta"><span>' + pad2(i + 1) + ' / 0' + D.WORLDS.length + ' · ' + w.kind + '</span>' +
        '<span>' + w.year + '</span></div></div></div>' +
        '<p class="world__note reveal"><em>' + w.sub + '.</em> ' + w.note + '</p>';
      hover(a, 'ENTER');
      worlds.appendChild(a);
    });
    f.appendChild(worlds);

    /* method */
    var method = el('section', 'method');
    method.id = 'method';
    var steps = '';
    D.STEPS.forEach(function (s, i) {
      steps += '<li class="step"><span class="step__n">' + pad2(i + 1) + ' / 07</span>' +
        '<span class="step__name">' + s[0] + '</span><span class="step__txt">' + s[1] + '</span></li>';
    });
    method.innerHTML =
      '<div class="method__sticky"><div class="method__head">' +
      '<p class="eyebrow"><span class="eyebrow__n">02</span> <span data-scramble>METHOD</span></p>' +
      '<h2 class="method__h">Seven moves,<br>every single time.</h2>' +
      '<p class="method__sub">In order. Skipping one shows up in the render three weeks later.</p>' +
      '<div class="method__prog"><i id="methodProg"></i></div></div>' +
      '<ol class="method__track" id="methodTrack">' + steps + '</ol></div>';
    f.appendChild(method);

    /* archive door */
    var arc = el('section', 'door');
    arc.id = 'archive-door';
    arc.innerHTML =
      '<div class="door__in">' +
      '<p class="eyebrow"><span class="eyebrow__n">03</span> <span data-scramble>THE ARCHIVE</span></p>' +
      '<h2 class="door__h" data-split>164 pieces. Don\'t scroll them — drag them.</h2>' +
      '<p class="door__sub">Every campaign, poster, product render and study, on one endless surface. ' +
      'Throw it in any direction, filter by client, click anything to open it full size.</p>' +
      '<button class="door__btn" id="archiveOpen" data-magnet><span data-scramble>OPEN THE ARCHIVE</span><i>↗</i></button>' +
      '<p class="door__hint">or press <b>A</b> anywhere</p>' +
      '<div class="door__names" id="doorNames"></div></div>';
    f.appendChild(arc);

    /* commissions */
    var com = el('section', 'commissions');
    com.id = 'commissions';
    com.appendChild(sectionHead('04', 'COMMISSIONS', 'Buy the scope, not the hours.',
      'Every commission runs concept → blockout → look-dev → final. What changes is how much world you get.'));
    var stack = el('div', 'stack');
    [
      ['01', 'One Frame', 'Album art, key frames, cover stills.',
        ['1 hero render', '2 alternate angles', '2 light revisions', '10–14 days'], false],
      ['02', 'The World', 'Editorial, brand campaigns, visual development.',
        ['4–6 hero renders', 'Props, set dressing, full atmosphere', 'Turntable or parallax pass', 'Light revisions included', '3–5 weeks'], true],
      ['03', 'The Pipeline', 'Studios, agencies, films, product launches.',
        ['Full visual development', 'Animated turntables · pre-viz', 'Farm-ready hand-off, named and tidy', 'On call two months after delivery', '6–10 weeks'], false]
    ].forEach(function (t) {
      var a = el('article', 'tier' + (t[4] ? ' tier--flag' : ''));
      a.innerHTML = '<div class="tier__in"><div><p class="tier__n">' + t[0] + '</p>' +
        '<h3 class="tier__name">' + t[1] + '</h3><p class="tier__for">' + t[2] + '</p></div>' +
        '<ul>' + t[3].map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
        (t[4] ? '<span class="tier__flag">MOST COMMISSIONED</span>' : '') + '</div>';
      stack.appendChild(a);
    });
    com.appendChild(stack);
    f.appendChild(com);

    f.appendChild(buildContact());
    return f;
  }

  function buildContact() {
    var c = el('section', 'contact');
    c.id = 'contact';
    c.innerHTML =
      '<div class="contact__grid"><div class="contact__left">' +
      '<p class="eyebrow"><span class="eyebrow__n">05</span> <span data-scramble>CONTACT</span></p>' +
      '<h2 class="contact__h">SAY<br>HELLO</h2>' +
      '<a class="contact__mail" href="mailto:sumanth.richie25@icloud.com" data-magnet>sumanth.richie25@icloud.com</a>' +
      '<div class="contact__links">' +
      '<a href="https://behance.net/sumanthrichie" target="_blank" rel="noopener" data-magnet><span data-scramble>BEHANCE</span> <i>↗</i></a>' +
      '<a href="https://instagram.com/sumofDanth" target="_blank" rel="noopener" data-magnet><span data-scramble>INSTAGRAM</span> <i>↗</i></a>' +
      '<a href="https://su3doesign.github.io/Resume/" target="_blank" rel="noopener" data-magnet><span data-scramble>RÉSUMÉ</span> <i>↗</i></a>' +
      '</div></div>' +
      '<div class="contact__prop" data-gl-prop><button class="prop__hint" id="propHint" data-magnet>KNOCK THE HAT OFF</button></div>' +
      '</div>' +
      '<figure class="desk"><div id="deskMount"></div>' +
      '<figcaption>The desk it all leaves from — Hyderabad, most nights.</figcaption></figure>' +
      '<footer class="foot"><span>© 2026 Amidyala Sai Sumanth</span>' +
      '<span>Rendered in the browser · Three.js, GSAP, Lenis</span>' +
      '<a href="#top" data-magnet>BACK TO TOP ↑</a></footer>';
    return c;
  }

  function buildWork(id) {
    var w = D.byId(id) || D.WORLDS[0];
    var next = D.nextWorld(w.id);
    var f = document.createDocumentFragment();

    var hero = el('section', 'whero');
    hero.setAttribute('data-gl-glass', '');
    hero.innerHTML =
      '<div class="whero__plate" data-gl="' + w.plate + '">' +
      '<img src="' + w.plate + '" alt="' + w.alt + '" draggable="false" fetchpriority="high"></div>' +
      '<div class="hero__scrim"></div>' +
      '<div class="whero__type">' +
      '<a class="whero__back" href="./" data-link><i>←</i> <span data-scramble>ALL WORLDS</span></a>' +
      '<span class="whero__jp">' + w.jp + '</span>' +
      '<h1 class="whero__title" id="wheroTitle">' + w.title + '</h1>' +
      '<p class="whero__sub">' + w.sub + '</p>' +
      '<div class="whero__meta"><span>' + w.kind + '</span><span>' + w.year + '</span><span>' + w.place + '</span></div>' +
      '</div>' +
      '<a class="hero__scroll" href="#brief" data-magnet><span>READ</span><i></i></a>';
    f.appendChild(hero);

    var stats = el('section', 'wstats');
    stats.id = 'brief';
    var rows = '';
    w.stats.forEach(function (s) { rows += '<div><dt>' + s[0] + '</dt><dd>' + s[1] + '</dd></div>'; });
    stats.innerHTML = '<p class="wstats__note reveal">' + w.note + '</p><dl class="specs">' + rows + '</dl>' +
      '<div class="world__tags">' + w.tags.map(function (t) { return '<span>' + t + '</span>'; }).join('') + '</div>';
    f.appendChild(stats);

    w.chapters.forEach(function (ch, i) {
      var s = el('section', 'chapter');
      var media = '';
      ch.media.forEach(function (m, j) {
        media += '<figure class="chapter__fig' + (ch.media.length > 1 ? ' is-pair' : '') + '" data-src="' + m.src + '">' +
          '</figure>';
      });
      s.innerHTML =
        '<div class="chapter__text"><p class="eyebrow"><span class="eyebrow__n">' + pad2(i + 1) + '</span> ' +
        '<span data-scramble>' + ch.k + '</span></p>' +
        '<h2 class="chapter__h" data-split>' + ch.h + '</h2>' +
        '<p class="chapter__p reveal">' + ch.p + '</p></div>' +
        '<div class="chapter__media">' + media + '</div>';
      f.appendChild(s);

      // fill figures with real frames (needs DOM nodes, not strings)
      var figs = s.querySelectorAll('.chapter__fig');
      Array.prototype.forEach.call(figs, function (fig, j) {
        var m = ch.media[j];
        var isPair = ch.media.length > 1;
        fig.appendChild(frame(m.src, {
          alt: w.title + ' — ' + m.cap,
          ratio: /mobile|3x4/.test(m.src) ? 'frame--3x4' : 'frame--16x9',
          gl: !isPair && !isVideo(m.src),
          buckets: [8, 5]
        }));
        fig.appendChild(el('figcaption', '', m.cap));
        openable(fig, 'Open ' + m.cap, function () {
          var all = [];
          w.chapters.forEach(function (c2) { c2.media.forEach(function (mm) { all.push(mm.src); }); });
          openLB(all, all.indexOf(m.src), w.title);
        });
        hover(fig, 'OPEN');
      });
    });

    var nx = el('section', 'nextwork');
    nx.innerHTML =
      '<a class="nextwork__link" href="' + next.url + '" data-link data-project="' + next.id + '">' +
      '<span class="nextwork__k">NEXT WORLD</span>' +
      '<span class="nextwork__jp">' + next.jp + '</span>' +
      '<span class="nextwork__t" id="nextTitle">' + next.title + '</span>' +
      '<span class="nextwork__go">ENTER <i>→</i></span></a>';
    hover(nx.querySelector('a'), 'ENTER');
    f.appendChild(nx);

    f.appendChild(buildContact());
    return f;
  }

  /* ══ RENDER + MOTION ═══════════════════════════════════════ */

  function render() {
    var page = document.body.dataset.page || 'home';
    var project = document.body.dataset.project;
    main.appendChild(page === 'work' ? buildWork(project) : buildHome());

    var desk = document.getElementById('deskMount');
    if (desk) desk.appendChild(frame(VID + 'desk-hero.mp4', { ratio: 'frame--16x9' }));

    var tickerRow = document.getElementById('tickerRow');
    if (tickerRow) {
      var TICK = ['WORLDS, WORN-IN', 'LIGHT FIRST', 'BUILT IN HYDERABAD', 'MAYA · ARNOLD · SUBSTANCE',
        'OPEN FOR COMMISSIONS', '16 CLIENTS SHIPPED', '164 PIECES ARCHIVED'];
      var html = '';
      for (var r = 0; r < 3; r++) TICK.forEach(function (t) { html += '<span>' + t + ' <b>✦</b></span>'; });
      tickerRow.innerHTML = html;
    }

    var doorNames = document.getElementById('doorNames');
    if (doorNames) {
      D.CLIENTS.forEach(function (c) {
        var s = el('span', '', c.name);
        s.addEventListener('click', function () {
          openArchive();
          setTimeout(function () {
            if (window.GL) window.GL.filterMosaic(c.name);
            archiveChips.querySelectorAll('.chip').forEach(function (x) {
              x.classList.toggle('is-on', x.textContent === c.name.toUpperCase());
            });
          }, 500);
        });
        doorNames.appendChild(s);
      });
    }

    var openBtn = document.getElementById('archiveOpen');
    if (openBtn) openBtn.addEventListener('click', openArchive);

    var propHint = document.getElementById('propHint');
    if (propHint) propHint.addEventListener('click', function () {
      if (window.GL && window.GL.flyHat && window.GL.flyHat()) {
        propHint.textContent = 'HE WANTS IT BACK';
        setTimeout(function () { propHint.textContent = 'KNOCK THE HAT OFF'; }, 3000);
      }
    });

    wireScramble(main);
    if (window.GL) window.GL.mount(main);
    buildMotion();
  }

  function buildMotion() {
    magnets();
    if (!hasGSAP || reduced) return;
    document.body.classList.add('js-anim');

    main.querySelectorAll('[data-split]').forEach(function (n) {
      var words = splitWords(n);
      gsap.to(words, { y: 0, duration: 1.05, ease: 'expo.out', stagger: .035,
        scrollTrigger: { trigger: n, start: 'top 87%' } });
    });
    main.querySelectorAll('.reveal').forEach(function (n) {
      gsap.to(n, { opacity: 1, y: 0, duration: 1, ease: 'expo.out',
        scrollTrigger: { trigger: n, start: 'top 90%' } });
    });

    var track = document.getElementById('methodTrack');
    if (track && window.innerWidth > 760) {
      var prog = document.getElementById('methodProg');
      triggers.push(ScrollTrigger.create({
        trigger: '.method', start: 'top top',
        end: function () { return '+=' + (track.scrollWidth - window.innerWidth + 500); },
        pin: '.method__sticky', scrub: .55, anticipatePin: 1,
        onUpdate: function (self) {
          var max = Math.max(0, track.scrollWidth - window.innerWidth + 80);
          gsap.set(track, { x: -max * self.progress });
          gsap.set(prog, { scaleX: self.progress });
          var idx = Math.round(self.progress * (D.STEPS.length - 1));
          Array.prototype.forEach.call(track.children, function (li, i) { li.classList.toggle('is-on', i <= idx); });
        }
      }));
    } else if (track) {
      Array.prototype.forEach.call(track.children, function (li) {
        triggers.push(ScrollTrigger.create({ trigger: li, start: 'top 82%', onEnter: function () { li.classList.add('is-on'); } }));
      });
    }

    var tickerRow = document.getElementById('tickerRow');
    if (tickerRow) {
      var tickX = 0, half = tickerRow.scrollWidth / 3;
      var fn = function () {
        tickX -= 0.65 + Math.abs(vel) * 22;
        if (half && tickX <= -half) tickX += half;
        gsap.set(tickerRow, { x: tickX });
      };
      gsap.ticker.add(fn); tickers.push(fn);
    }

    var skew = main.querySelectorAll('.chapter__media, .stack');
    if (skew.length) {
      var sf = function () { gsap.set(skew, { skewY: gsap.utils.clamp(-3, 3, vel * 60) }); };
      gsap.ticker.add(sf); tickers.push(sf);
    }

    var heroFam = document.getElementById('heroFamily') || document.getElementById('wheroTitle');
    if (heroFam) {
      var chars = splitChars(heroFam);
      gsap.set(chars, { yPercent: 110 });
      gsap.to(chars, { yPercent: 0, duration: 1.25, stagger: .045, ease: 'expo.out', delay: .1 });
    }
    gsap.from(main.querySelectorAll('.hero__eyebrow span, .whero__meta span'),
      { opacity: 0, y: 14, duration: .9, stagger: .07, delay: .35, ease: 'expo.out' });
    gsap.from(main.querySelectorAll('.hero__line, .whero__sub'),
      { opacity: 0, y: 18, duration: 1, delay: .55, ease: 'expo.out' });

    setTimeout(function () { ScrollTrigger.refresh(); }, 600);
  }

  function magnets() {
    if (!fine || !hasGSAP) return;
    document.querySelectorAll('[data-magnet]').forEach(function (n) {
      if (n.dataset.mag) return;
      n.dataset.mag = '1';
      n.addEventListener('pointermove', function (e) {
        var r = n.getBoundingClientRect();
        gsap.to(n, { x: (e.clientX - (r.left + r.width / 2)) * .28,
          y: (e.clientY - (r.top + r.height / 2)) * .34, duration: .5, ease: 'power3.out' });
      });
      n.addEventListener('pointerleave', function () {
        gsap.to(n, { x: 0, y: 0, duration: .7, ease: 'elastic.out(1,.4)' });
      });
    });
  }

  var vel = 0, lastY = window.scrollY;
  (function velLoop() {
    var y = window.scrollY;
    vel += ((y - lastY) / Math.max(1, window.innerHeight) - vel) * .12;
    vel *= .92; lastY = y;
    requestAnimationFrame(velLoop);
  })();

  var t0 = Date.now();
  setInterval(function () {
    var f = document.getElementById('hudTime');
    if (!f) return;
    var s = Math.floor((Date.now() - t0) / 1000);
    f.textContent = '00:' + pad2(Math.floor(s / 60)) + ':' + pad2(s % 60);
  }, 1000);

  /* ══ BOOT ══════════════════════════════════════════════════ */

  var boot = document.getElementById('boot');
  var bootGrid = document.getElementById('bootGrid');
  var bootPct = document.getElementById('bootPct');
  var bootTask = document.getElementById('bootTask');
  var bootRule = document.getElementById('bootRule');
  var TASKS = ['allocating buckets', 'loading textures', 'building BVH', 'sampling 128 / 512', 'denoising', 'beauty pass'];

  var tiles = [];
  for (var i = 0; i < 144; i++) { var tl = document.createElement('i'); bootGrid.appendChild(tl); tiles.push(tl); }
  var order = tiles.map(function (t, i) {
    return { t: t, k: Math.floor(i / 16) * 16 * 1.5 + (i % 16) + Math.random() * 10 };
  }).sort(function (a, b) { return a.k - b.k; });

  var pre = [currentPlate(), D.WORLDS[1].plate], loaded = 0;
  pre.forEach(function (src) {
    var im = new Image();
    im.onload = im.onerror = function () { loaded++; };
    im.src = src;
  });

  var p = 0, startT = performance.now(), fin = false;
  (function tick() {
    var e = (performance.now() - startT) / 1000;
    var target = Math.min(100, e / 2.2 * 62 + (loaded / pre.length) * 38);
    if (e > 6) target = 100;
    p += (target - p) * .075;
    var shown = Math.min(100, Math.round(p));
    bootPct.textContent = String(shown).padStart(3, '0');
    bootTask.textContent = TASKS[Math.min(TASKS.length - 1, Math.floor(shown / 100 * TASKS.length))];
    bootRule.style.transform = 'scaleX(' + shown / 100 + ')';
    var n = Math.floor(shown / 100 * order.length);
    for (var i = 0; i < n; i++) order[i].t.classList.add('on');
    if (shown >= 100 && !fin) { fin = true; finish(); } else requestAnimationFrame(tick);
  })();

  function finish() {
    render();
    if (window.GL) window.GL.start();
    setTimeout(function () {
      var wipe = document.getElementById('wipe');
      var reveal = function () {
        boot.style.display = 'none';
        document.body.classList.remove('is-booting');
        if (lenis) lenis.start();
      };
      if (hasGSAP && !reduced) {
        gsap.timeline()
          .to(wipe, { scaleY: 1, duration: .5, ease: 'expo.inOut', transformOrigin: 'bottom' })
          .add(reveal)
          .set(wipe, { transformOrigin: 'top' })
          .to(wipe, { scaleY: 0, duration: .7, ease: 'expo.inOut' }, '+=0.05')
          .from('.topbar, .rig', { opacity: 0, y: -10, duration: .7, stagger: .06 }, '-=0.4');
      } else reveal();
    }, 200);
  }

  wireScramble(document);
})();
