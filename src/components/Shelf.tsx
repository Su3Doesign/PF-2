import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { projects, type Kind } from '../data/projects';
import { workHref } from '../lib/useHashRoute';
import { reducedMotion } from '../lib/motion';

const FILTERS: ('All' | Kind)[] = ['All', 'World', 'Client', 'Concept', 'Self'];
const KIND_LABEL: Record<Kind, string> = { World: 'World', Client: 'Client', Concept: 'Concept', Self: 'Self-initiated' };
const COPIES = 3;

/**
 * Every site on one shelf. A native horizontal scroller with CSS scroll-snap, so
 * trackpads, touch and keyboards behave as they should. It is "infinite" because the
 * list is rendered three times and the scroll position is quietly moved back into the
 * middle copy whenever it settles in an outer one.
 */
export default function Shelf() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const list = useMemo(() => projects.filter((p) => filter === 'All' || p.kind === filter), [filter]);
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
    if (!el) return;
    el.scrollLeft = setWidth();
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
        c.style.setProperty('--shift', (((r.left + r.width / 2 - mid) / el.clientWidth) * -8).toFixed(2) + '%');
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
    const el = rail.current!;
    drag.current = { on: true, x: e.clientX, left: el.scrollLeft, moved: 0 };
    el.style.scrollSnapType = 'none';
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
    const el = rail.current!;
    el.style.scrollSnapType = '';
  };

  const copies = loop ? COPIES : 1;

  return (
    <section id="shelf" aria-labelledby="shelf-title" className="relative z-[3] bg-ink py-[16vh]">
      <header className="flex flex-col gap-8 px-5 md:flex-row md:items-end md:justify-between md:px-10">
        <div>
          <p className="label mb-6 text-mute">( The whole shelf )</p>
          <h2 id="shelf-title" className="display text-[clamp(2.6rem,6vw,6rem)]">
            Everything <em className="text-[var(--accent)]">that shipped.</em>
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter the shelf">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className="label min-h-11 rounded-full border border-line px-4 text-mute transition-colors duration-500 hover:text-bone aria-pressed:border-bone aria-pressed:bg-bone aria-pressed:text-ink"
            >
              {f === 'All' ? `All ${projects.length}` : f}
            </button>
          ))}
        </div>
      </header>

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
              <article
                key={`${copy}-${p.slug}`}
                data-card
                aria-hidden={clone || undefined}
                className="group w-[min(84vw,34rem)] shrink-0 snap-start"
              >
                <a
                  href={workHref(p.slug)}
                  tabIndex={clone ? -1 : undefined}
                  data-cursor="Open"
                  draggable={false}
                  className="block"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-ink-2">
                    <img
                      src={p.cover.src}
                      alt={clone ? '' : p.cover.alt}
                      width={1440}
                      height={900}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      className="h-full w-full scale-[1.12] object-cover transition-[scale] duration-[1.6s] ease-[var(--ease-slow)] [translate:var(--shift,0)_0] group-hover:scale-[1.2]"
                    />
                    <span
                      className="absolute top-4 left-4 h-2.5 w-2.5 rounded-full shadow-[0_0_18px_currentColor]"
                      style={{ background: p.tone, color: p.tone }}
                      aria-hidden="true"
                    />
                    <span className="label absolute top-3.5 right-4 rounded-full bg-ink/60 px-3 py-1 text-bone backdrop-blur-md">
                      {KIND_LABEL[p.kind]}
                    </span>
                  </div>
                  <div className="mt-5 flex items-baseline justify-between gap-4">
                    <h3 className="display text-[1.9rem] leading-tight">{p.title}</h3>
                    <span className="label shrink-0 text-mute tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 max-w-[26rem] text-[0.95rem] leading-relaxed text-mute">{p.line}</p>
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
              className="grid h-12 w-12 place-items-center rounded-full border border-line text-bone transition-colors duration-500 hover:border-bone"
            >
              {d < 0 ? '←' : '→'}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
