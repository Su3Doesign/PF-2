import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, reducedMotion, riseChars } from '../lib/motion';
import { studies } from '../data/work';
import { openLightbox } from '../lib/lightbox';

const COLS = 8;
const ROWS = 5;
const CELLS = COLS * ROWS;

// A fixed scatter so the canvas looks placed by hand but never moves between visits.
const jitter = (i: number, k: number) => (Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;

const items = studies.map((s, i) => ({ ...s, caption: `${s.name} · ${s.kind}`, i }));

/**
 * The thirty-nine studies on an endless canvas. Throw it in any direction; it wraps, leans
 * with the throw, drifts on its own when left alone, and opens any piece full size.
 */
export default function Library() {
  const root = useRef<HTMLElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const plane = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState({ w: 280, h: 330 });
  const s = useRef({ x: 0, y: 0, vx: 0, vy: 0, down: false, px: 0, py: 0, moved: 0, visible: false, touch: false });

  useGSAP(
    () => {
      const h = root.current!.querySelector('h2')!;
      riseChars(h, { scrollTrigger: { trigger: h, start: 'top 85%' } });
    },
    { scope: root },
  );

  useEffect(() => {
    const size = () => {
      const w = Math.max(200, Math.min(320, window.innerWidth / 5));
      setCell({ w, h: Math.round(w * 1.2) });
    };
    size();
    window.addEventListener('resize', size);
    return () => window.removeEventListener('resize', size);
  }, []);

  useEffect(() => {
    const st = s.current;
    const io = new IntersectionObserver(([e]) => (st.visible = e.isIntersecting));
    io.observe(view.current!);
    const W = cell.w * COLS;
    const H = cell.h * ROWS;
    const tick = () => {
      if (!st.visible) return;
      if (!st.down) {
        st.x += st.vx;
        st.y += st.vy;
        st.vx *= 0.94;
        st.vy *= 0.94;
        if (!reducedMotion && Math.abs(st.vx) < 0.3 && Math.abs(st.vy) < 0.3) {
          st.x -= 0.35;
          st.y -= 0.12;
        }
      }
      const x = ((st.x % W) + W) % W;
      const y = ((st.y % H) + H) % H;
      const lean = reducedMotion ? 0 : Math.max(-8, Math.min(8, st.vx * 0.35));
      const tilt = reducedMotion ? 0 : Math.max(-8, Math.min(8, -st.vy * 0.35));
      plane.current!.style.transform = `translate3d(${x - W}px, ${y - H}px, 0) rotateY(${lean}deg) rotateX(${tilt}deg)`;
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
    };
  }, [cell]);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    const st = s.current;
    Object.assign(st, { down: true, px: e.clientX, py: e.clientY, moved: 0, vx: 0, vy: 0, touch: e.pointerType === 'touch' });
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const st = s.current;
    if (!st.down) return;
    const dx = e.clientX - st.px;
    // On touch, vertical swipes belong to the page; only horizontal drags move the canvas.
    const dy = st.touch ? 0 : e.clientY - st.py;
    st.moved += Math.abs(dx) + Math.abs(dy);
    if (st.moved > 6) view.current!.setPointerCapture(e.pointerId);
    st.x += dx;
    st.y += dy;
    st.vx = dx;
    st.vy = dy;
    st.px = e.clientX;
    st.py = e.clientY;
  };
  const up = () => {
    s.current.down = false;
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, [number, number]> = { ArrowLeft: [14, 0], ArrowRight: [-14, 0], ArrowUp: [0, 14], ArrowDown: [0, -14] };
    const d = step[e.key];
    if (!d) return;
    e.preventDefault();
    s.current.vx = d[0];
    s.current.vy = d[1];
  };

  // The pattern is drawn three by three so the screen is always covered while it wraps.
  const tiles = Array.from({ length: 9 }).flatMap((_, copy) =>
    Array.from({ length: CELLS }).map((__, c) => {
      const item = items[c % items.length];
      const col = (copy % 3) * COLS + (c % COLS);
      const row = Math.floor(copy / 3) * ROWS + Math.floor(c / COLS);
      const fit = Math.min((cell.w * 0.8) / item.w, (cell.h * 0.78) / item.h);
      const w = item.w * fit;
      const h = item.h * fit;
      const left = col * cell.w + (cell.w - w) / 2 + jitter(c, 1) * cell.w * 0.08;
      const top = row * cell.h + (cell.h - h) / 2 + jitter(c, 2) * cell.h * 0.08;
      return { key: `${copy}-${c}`, item, left, top, w, h, real: copy === 4 && c < items.length };
    }),
  );

  return (
    <section ref={root} id="library" aria-labelledby="library-title" className="relative z-[3] bg-ink pt-[18vh]">
      <div className="px-5 md:px-10">
        <div className="label mb-10 flex justify-between gap-6 text-mute">
          <span>(06) The library</span>
          <span>{items.length} studies · drag in any direction</span>
        </div>
        <h2 id="library-title" className="display text-[clamp(2.9rem,10.4vw,11.5rem)]">
          <span className="block">Thirty-nine studies.</span>
          <span className="text-outline block text-[var(--accent)]">Throw it around.</span>
        </h2>
        <p className="mt-10 mb-14 max-w-[36rem] text-[1.08rem] leading-relaxed text-mute">
          Product viz, key art, cars, covers, characters, and the practice pieces that never make a reel: the clay passes,
          the wear passes, the grey ball that teaches the light.
        </p>
      </div>

      <div
        ref={view}
        tabIndex={0}
        role="region"
        aria-label="The library: drag, or use the arrow keys to move around"
        data-cursor="Drag"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
        className="relative h-[100svh] touch-pan-y overflow-hidden select-none [perspective:1600px]"
      >
        <div
          ref={plane}
          className="absolute top-0 left-0 will-change-transform [transform-style:preserve-3d]"
          style={{ width: cell.w * COLS * 3, height: cell.h * ROWS * 3 }}
        >
          {tiles.map((t) => (
            <button
              key={t.key}
              type="button"
              tabIndex={t.real ? 0 : -1}
              aria-hidden={t.real ? undefined : true}
              aria-label={t.real ? `Open ${t.item.caption}` : undefined}
              data-cursor="View"
              onClick={() => s.current.moved < 6 && openLightbox(items, t.item.i, 'The library')}
              onFocus={() => {
                // Bring a focused piece into view.
                const st = s.current;
                const r = view.current!.getBoundingClientRect();
                st.x = -(t.left - cell.w * COLS + t.w / 2) + r.width / 2;
                st.y = -(t.top - cell.h * ROWS + t.h / 2) + r.height / 2;
              }}
              className="group absolute overflow-hidden rounded-xl bg-ink-2 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)]"
              style={{ left: t.left, top: t.top, width: t.w, height: t.h }}
            >
              <img
                src={t.item.thumb}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className="h-full w-full object-cover transition-[scale,filter] duration-700 ease-[var(--ease-slow)] group-hover:scale-[1.07] group-hover:saturate-[1.15]"
              />
              <span className="label pointer-events-none absolute inset-x-2 bottom-2 translate-y-2 rounded-lg bg-ink/70 px-2.5 py-1.5 text-left text-bone opacity-0 backdrop-blur-md transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                {t.item.name}
                <span className="block text-mute">{t.item.kind}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink to-transparent" />
      </div>
    </section>
  );
}
