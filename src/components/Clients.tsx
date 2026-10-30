import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, reducedMotion, riseChars } from '../lib/motion';
import { clients, counts, type Client } from '../data/work';
import { openLightbox } from '../lib/lightbox';
import { profile } from '../data/projects';

// Tiles grow with how much work there is to show.
const span = (n: number) =>
  n >= 13 ? 'col-span-2 row-span-2' : n >= 8 ? 'col-span-2' : n >= 4 ? 'row-span-2' : '';

// An order that gives the wall a rhythm of big and small.
const ORDER = [
  'Classic Partnership',
  'Midea Canada',
  'Eureka',
  'Comfee',
  'Home Depot Canada',
  'KD Displays',
  'GC Burger',
  'Investohome PR',
  'Amaya Restaurant',
  'VS Design Studio',
  'nxtwave',
  'Tamada Media',
  'Lakshmi Bakers',
  'Inertia Productions',
  'LLT Overseas',
  'AZ Coffee',
];

const films = clients.reduce((n, c) => n + c.files.filter((f) => f.type === 'video').length, 0);

/**
 * Sixteen clients as a wall. Each tile flips through that client's work while it is hovered
 * or focused, and opens the whole set, films included.
 */
export default function Clients() {
  const root = useRef<HTMLElement>(null);
  const list = ORDER.map((n) => clients.find((c) => c.name === n)!).filter(Boolean);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      riseChars(q('h2')[0], { scrollTrigger: { trigger: q('h2')[0], start: 'top 85%' } });
      if (reducedMotion) return;
      gsap.from(q('[data-tile]'), {
        y: 80,
        autoAlpha: 0,
        duration: 1.6,
        stagger: { each: 0.05, from: 'start' },
        scrollTrigger: { trigger: q('ul')[0], start: 'top 85%' },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="clients" aria-labelledby="clients-title" className="relative z-[3] bg-ink px-5 py-[18vh] md:px-10">
      <div className="label mb-10 flex justify-between gap-6 text-mute">
        <span>(05) Clients &amp; campaigns</span>
        <span>
          {counts.clients} clients · {counts.pieces} pieces · {films} films
        </span>
      </div>
      <h2 id="clients-title" className="display text-[clamp(2.9rem,10.4vw,11.5rem)]">
        <span className="block">Ships on</span>
        <span className="text-outline block text-[var(--accent)]">a Friday.</span>
      </h2>
      <p className="mt-10 max-w-[38rem] text-[1.08rem] leading-relaxed text-mute">
        The other half of the work: air conditioners, burgers, jewellery and bank ads, for agencies in Toronto and San Juan
        and studios at home. Hover a tile to flip through it; open it for everything.
      </p>

      <ul className="mt-16 grid grid-flow-dense auto-rows-[11rem] grid-cols-2 gap-3 md:auto-rows-[14rem] md:grid-cols-4 md:gap-4 xl:grid-cols-6">
        {list.map((c) => (
          <Tile key={c.name} client={c} />
        ))}
      </ul>

      <a
        href={profile.behance}
        target="_blank"
        rel="noopener"
        data-cursor="Behance"
        className="group mt-16 flex flex-col gap-4 border-y border-line py-8 md:flex-row md:items-baseline md:justify-between md:gap-10"
      >
        <span className="label text-mute">The long versions</span>
        <span className="title text-[clamp(1.7rem,3.6vw,3.6rem)] leading-[1.05] transition-colors duration-500 group-hover:text-[var(--accent)]">
          Full case studies, boards and credits <span className="whitespace-nowrap">on Behance ↗</span>
        </span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </section>
  );
}

function Tile({ client: c }: { client: Client }) {
  const [frame, setFrame] = useState(0);
  const [live, setLive] = useState(false);
  const timer = useRef(0);
  const frames = c.files.slice(0, 8);
  const reels = c.files.filter((f) => f.type === 'video').length;

  useEffect(() => {
    if (!live || reducedMotion || frames.length < 2) return;
    timer.current = window.setInterval(() => setFrame((f) => (f + 1) % frames.length), 700);
    return () => clearInterval(timer.current);
  }, [live, frames.length]);

  if (!c.files.length) {
    return (
      <li data-tile className={`${span(0)} relative overflow-hidden rounded-2xl border border-line`}>
        <div className="flex h-full flex-col justify-between bg-[repeating-linear-gradient(135deg,rgb(239_234_227/0.05)_0_2px,transparent_2px_12px)] p-4">
          <span className="label self-start rounded-full border border-line px-2.5 py-1 text-mute">Under NDA</span>
          <div>
            <p className="title text-[1.35rem]">{c.name}</p>
            <p className="label mt-1 text-faint">{c.role}</p>
          </div>
        </div>
      </li>
    );
  }

  const open = () =>
    openLightbox(
      c.files.map((f, i) => ({ ...f, caption: `${c.name} · ${i + 1} of ${c.files.length}` })),
      0,
      c.name,
    );

  return (
    <li data-tile className={span(c.files.length)}>
      <button
        type="button"
        onClick={open}
        onPointerEnter={() => setLive(true)}
        onPointerLeave={() => {
          setLive(false);
          setFrame(0);
        }}
        onFocus={() => setLive(true)}
        onBlur={() => setLive(false)}
        data-cursor="Open"
        className="group relative block h-full w-full overflow-hidden rounded-2xl bg-ink-2 text-left"
      >
        {frames.map((f, i) => (
          <img
            key={f.src}
            src={f.thumb}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-[opacity,scale] duration-[900ms] ease-[var(--ease-slow)] group-hover:scale-[1.06]"
            style={{ opacity: i === frame ? 1 : 0 }}
          />
        ))}
        <span className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-ink/30" />
        <span className="label absolute top-3 left-3 rounded-full bg-ink/55 px-2.5 py-1 text-bone backdrop-blur-md">{c.group}</span>
        <span className="label absolute top-3 right-3 rounded-full bg-ink/55 px-2.5 py-1 text-bone tabular-nums backdrop-blur-md">
          {c.files.length}
          {reels > 0 && <span className="text-[var(--accent)]"> · ▶ {reels}</span>}
        </span>
        <span className="absolute inset-x-4 bottom-4">
          <span className="title block text-[clamp(1.2rem,1.7vw,1.7rem)] transition-transform duration-700 ease-[var(--ease-slow)] group-hover:-translate-y-1">
            {c.name}
          </span>
          <span className="label mt-1 block text-bone/70">{c.role}</span>
        </span>
        {frames.length > 1 && (
          <span aria-hidden="true" className="absolute right-4 bottom-4 hidden gap-1 group-hover:flex">
            {frames.map((f, i) => (
              <span key={f.src} className={`h-1 w-3 rounded-full ${i === frame ? 'bg-bone' : 'bg-bone/25'}`} />
            ))}
          </span>
        )}
        <span className="sr-only">, {c.files.length} pieces. Open the gallery.</span>
      </button>
    </li>
  );
}
