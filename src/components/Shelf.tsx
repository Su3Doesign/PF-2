import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useGSAP } from '@gsap/react';
import { projects, type Kind, type Project } from '../data/projects';
import { workHref } from '../lib/useHashRoute';
import { gsap, reducedMotion, riseChars } from '../lib/motion';

const FILTERS: ('All' | Kind)[] = ['All', 'World', 'Client', 'Concept', 'Self'];
const KIND_LABEL: Record<Kind, string> = { World: 'World', Client: 'Client', Concept: 'Concept', Self: 'Self-initiated' };
const COPIES = 3;

/**
 * Every site, two ways. The rail is a native horizontal scroller with CSS scroll-snap,
 * made endless by rendering the list three times and quietly re-centring when it settles.
 * The index is a list of big rows whose preview image follows the pointer.
 */
export default function Shelf() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [view, setView] = useState<'rail' | 'index'>('rail');
  const list = useMemo(() => projects.filter((p) => filter === 'All' || p.kind === filter), [filter]);
  const head = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const h = head.current!.querySelector('h2')!;
      riseChars(h, { scrollTrigger: { trigger: h, start: 'top 85%' } });
    },
    { scope: head },
  );

  return (
    <section id="shelf" aria-labelledby="shelf-title" className="relative z-[3] bg-ink py-[16vh]">
      <header ref={head} className="px-5 md:px-10">
        <div className="label mb-10 flex justify-between gap-6 text-mute">
          <span>(05) The whole shelf</span>
          <span>{projects.length} sites, nothing half-finished</span>
        </div>
        <h2 id="shelf-title" className="display text-[clamp(2.9rem,10.4vw,11.5rem)]">
          <span className="block">Everything</span>
          <span className="text-outline block text-[var(--accent)]">that shipped.</span>
        </h2>
        <div className="mt-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter the sites">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className="label min-h-11 rounded-full border border-line px-5 text-mute transition-colors duration-500 hover:border-bone/50 hover:text-bone aria-pressed:border-bone aria-pressed:bg-bone aria-pressed:text-ink"
              >
                {f === 'All' ? `All ${projects.length}` : f}
              </button>
            ))}
          </div>
          <div className="flex rounded-full border border-line p-1" role="group" aria-label="View">
            {(['rail', 'index'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className="label min-h-10 rounded-full px-5 text-mute transition-colors duration-500 aria-pressed:bg-[var(--accent)] aria-pressed:text-ink"
              >
                {v === 'rail' ? 'Rail' : 'Index'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {view === 'rail' ? <Rail list={list} /> : <IndexList list={list} />}
    </section>
  );
}

function Rail({ list }: { list: Project[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef({ on: false, x: 0, left: 0, moved: 0 });
  const loop = list.length > 2;

  const setWidth = useCallback(() => {
    const el = rail.current;
    if (!el || !loop) return 0;
    return el.scrollWidth / COPIES;
  }, [loop]);

  // Park in the middle copy whenever the list changes.
  useLayoutEffect(() => {
    const el = rail.current;
    if (el) el.scrollLeft = setWidth();
  }, [list, setWidth]);

  useEffect(() => {
    const el = rail.current!;
    let raf = 0;
    let settle = 0;

    const parallax = () => {
      const mid = el.getBoundingClientRect().left + el.clientWidth / 2;
      el.querySelectorAll<HTMLElement>('[data-card]').forEach((c) => {
        const r = c.getBoundingClientRect();
        if (r.right < -200 || r.left > innerWidth + 200) return;
        c.style.setProperty('--shift', (((r.left + r.width / 2 - mid) / el.clientWidth) * -9).toFixed(2) + '%');
      });
    };
    const recentre = () => {
      const w = setWidth();
      if (!w || drag.current.on) return;
      if (el.scrollLeft < w * 0.5) el.scrollLeft += w;
      else if (el.scrollLeft > w * 1.5) el.scrollLeft -= w;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(parallax);
      clearTimeout(settle);
      settle = window.setTimeout(recentre, 140);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('scrollend', recentre);
    parallax();
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('scrollend', recentre);
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [setWidth]);

  const step = (dir: number) => {
    const el = rail.current!;
    const card = el.querySelector<HTMLElement>('[data-card]');
    el.scrollBy({ left: dir * (card ? card.offsetWidth + 24 : 400), behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  // Mouse drag; touch and trackpads already scroll natively.
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag.current = { on: true, x: e.clientX, left: rail.current!.scrollLeft, moved: 0 };
    rail.current!.style.scrollSnapType = 'none';
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.on) return;
    const dx = e.clientX - d.x;
    d.moved = Math.max(d.moved, Math.abs(dx));
    if (d.moved > 4) rail.current!.setPointerCapture(e.pointerId);
    rail.current!.scrollLeft = d.left - dx * 1.2;
  };
  const up = () => {
    if (!drag.current.on) return;
    drag.current.on = false;
    rail.current!.style.scrollSnapType = '';
  };

  const copies = loop ? COPIES : 1;

  return (
    <>
      <div
        ref={rail}
        tabIndex={0}
        role="region"
        aria-label="Sites, scroll sideways"
        data-cursor="Drag"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClickCapture={(e) => {
          if (drag.current.moved > 6) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.moved = 0;
          }
        }}
        className="no-scrollbar mt-14 flex snap-x snap-mandatory gap-6 overflow-x-auto overscroll-x-contain scroll-px-5 px-5 select-none md:scroll-px-10 md:px-10"
      >
        {Array.from({ length: copies }).flatMap((_, copy) =>
          list.map((p, i) => {
            const clone = copy !== Math.floor(copies / 2);
            return (
              <article key={`${copy}-${p.slug}`} data-card aria-hidden={clone || undefined} className="group w-[min(84vw,36rem)] shrink-0 snap-start">
                <a href={workHref(p.slug)} tabIndex={clone ? -1 : undefined} data-cursor="Open" draggable={false} className="block">
                  <div data-skew className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-ink-2">
                    <img
                      src={p.cover.src}
                      alt={clone ? '' : p.cover.alt}
                      width={1440}
                      height={900}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      className="h-full w-full scale-[1.14] object-cover transition-[scale,filter] duration-[1.6s] ease-[var(--ease-slow)] [translate:var(--shift,0)_0] group-hover:scale-[1.22] group-hover:saturate-[1.2]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
                    <span className="label absolute top-4 left-4 flex items-center gap-2 rounded-full bg-ink/55 px-3 py-1.5 text-bone backdrop-blur-md">
                      <span className="h-2 w-2 rounded-full" style={{ background: p.tone, boxShadow: `0 0 12px ${p.tone}` }} aria-hidden="true" />
                      {KIND_LABEL[p.kind]}
                    </span>
                    <span className="display absolute right-5 bottom-3 text-[4.5rem] leading-none text-bone/90 tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="title mt-6 text-[1.7rem] leading-tight">{p.title}</h3>
                  <p className="mt-3 line-clamp-2 max-w-[30rem] text-[0.98rem] leading-relaxed text-mute">{p.line}</p>
                  <p className="label mt-4 text-faint">{p.stack.slice(0, 3).join(' · ')}</p>
                </a>
              </article>
            );
          }),
        )}
      </div>

      <div className="mt-10 flex items-center justify-between px-5 md:px-10">
        <p className="label text-mute">
          {list.length} {list.length === 1 ? 'site' : 'sites'} · drag, swipe or use the arrows
        </p>
        <div className="flex gap-2">
          {[-1, 1].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => step(d)}
              aria-label={d < 0 ? 'Previous site' : 'Next site'}
              className="grid h-14 w-14 place-items-center rounded-full border border-line text-lg text-bone transition-colors duration-500 hover:border-bone hover:bg-bone hover:text-ink"
            >
              {d < 0 ? '←' : '→'}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function IndexList({ list }: { list: Project[] }) {
  const root = useRef<HTMLOListElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const place = useRef<(x: number, y: number) => void>(() => {});
  const [hover, setHover] = useState(-1);

  useEffect(() => {
    if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;
    const el = preview.current!;
    const x = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'expo.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'expo.out' });
    const rot = gsap.quickTo(el, 'rotate', { duration: 1, ease: 'expo.out' });
    let last = 0;
    const move = (e: globalThis.PointerEvent) => {
      x(e.clientX);
      y(e.clientY);
      rot(Math.max(-12, Math.min(12, (e.clientX - last) * 0.6)));
      last = e.clientX;
    };
    // While hidden, jump straight to the pointer instead of flying in from the corner.
    place.current = (px, py) => {
      if (Number(gsap.getProperty(el, 'opacity')) < 0.05) gsap.set(el, { x: px, y: py });
      last = px;
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  useEffect(() => {
    const el = preview.current;
    if (!el) return;
    gsap.to(el, { scale: hover >= 0 ? 1 : 0.6, autoAlpha: hover >= 0 ? 1 : 0, duration: 0.7, ease: 'expo.out' });
  }, [hover]);

  return (
    <div className="relative mt-14 px-5 md:px-10" onPointerLeave={() => setHover(-1)}>
      <ol ref={root} className="border-b border-line">
        {list.map((p, i) => (
          <li key={p.slug}>
            <a
              href={workHref(p.slug)}
              data-cursor="Open"
              onPointerEnter={(e) => {
                place.current(e.clientX, e.clientY);
                setHover(i);
              }}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(-1)}
              className="group relative grid grid-cols-[2.5rem_1fr] items-center gap-x-4 overflow-hidden border-t border-line py-6 md:grid-cols-[4rem_1fr_16rem_9rem] md:py-8"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 origin-bottom scale-y-0 transition-transform duration-700 ease-[var(--ease-door)] group-hover:scale-y-100 group-focus-visible:scale-y-100"
                style={{ background: p.tone }}
              />
              <span className="label relative text-mute transition-colors duration-500 group-hover:text-ink">{String(i + 1).padStart(2, '0')}</span>
              <span className="display relative text-[clamp(1.7rem,4.2vw,4.6rem)] transition-[translate,color] duration-700 ease-[var(--ease-slow)] group-hover:translate-x-4 group-hover:text-ink">
                {p.title}
              </span>
              <span className="label relative col-start-2 mt-3 text-mute transition-colors duration-500 group-hover:text-ink md:col-start-auto md:mt-0">
                {p.stack.slice(0, 2).join(' · ')}
              </span>
              <span className="label relative col-start-2 mt-1 text-mute transition-colors duration-500 group-hover:text-ink md:col-start-auto md:mt-0 md:text-right">
                {KIND_LABEL[p.kind]} · {p.year}
              </span>
            </a>
          </li>
        ))}
      </ol>

      <div
        ref={preview}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[65] hidden aspect-[4/3] w-[24rem] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl opacity-0 shadow-2xl [@media(pointer:fine)]:block"
      >
        {list.map((p, i) => (
          <img
            key={p.slug}
            src={p.cover.src}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-[clip-path,scale] duration-700 ease-[var(--ease-door)]"
            style={{ clipPath: i === hover ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)', scale: i === hover ? '1' : '1.2' }}
          />
        ))}
      </div>
    </div>
  );
}
