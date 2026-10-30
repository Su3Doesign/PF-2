import { useRef, type CSSProperties } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, reducedMotion, riseChars } from '../lib/motion';
import { worlds, type World as WorldT } from '../data/work';
import { openLightbox } from '../lib/lightbox';
import InViewVideo from './kit/InViewVideo';
import Magnetic from './kit/Magnetic';
import Roll from './kit/Roll';

const COUNT = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'][worlds.length] ?? String(worlds.length);

/**
 * The personal worlds, each held at its own hour and lit in its own colour. The plate
 * opens from a card to the full screen; the world's name in kanji runs down the side; after
 * it, a strip of the renders and turntables, each opening full size.
 */
export default function Worlds() {
  const head = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const h = head.current!.querySelector('h2')!;
      riseChars(h, { scrollTrigger: { trigger: h, start: 'top 85%' } });
    },
    { scope: head },
  );

  return (
    <section id="worlds" aria-labelledby="worlds-title" className="relative z-[3] bg-ink">
      <header ref={head} className="px-5 pt-[18vh] pb-[10vh] md:px-10">
        <div className="label mb-10 flex justify-between gap-6 text-mute">
          <span>(03) Worlds</span>
          <span>{worlds.map((w) => w.hour).join(' · ')}</span>
        </div>
        <h2 id="worlds-title" className="display text-[clamp(2.9rem,10.4vw,11.5rem)]">
          <span className="block">{COUNT} worlds,</span>
          <span className="text-outline block text-[var(--accent)]">{COUNT.toLowerCase()} hours.</span>
        </h2>
        <p className="mt-10 max-w-[34rem] text-[1.08rem] leading-relaxed text-mute">
          Quiet places, each held at the one hour it actually makes sense. The first three built in Maya and ZBrush, textured in
          Substance and rendered in Arnold; the castle generated from code for Unreal Engine 5.
        </p>
      </header>
      {worlds.map((w, i) => (
        <World key={w.id} world={w} index={i} />
      ))}
    </section>
  );
}

function World({ world: w, index }: { world: WorldT; index: number }) {
  const root = useRef<HTMLElement>(null);
  const reel = [
    { ...w.plate, label: 'Key frame', caption: `${w.title} · key frame` },
    ...w.shots.map((s) => ({ ...s, caption: `${w.title} · ${s.label}` })),
  ];
  const open = (i: number) => openLightbox(reel, i, w.title);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (reducedMotion) {
        gsap.set(q('[data-frame]'), { clipPath: 'inset(0% 0% 0% 0% round 0px)' });
        gsap.set(q('[data-shade]'), { opacity: 0.75 });
        return;
      }
      const small = window.innerWidth < 768 ? 'inset(16% 8% 16% 8% round 24px)' : 'inset(20% 32% 20% 32% round 32px)';
      riseChars(q('[data-t]'), { scrollTrigger: { trigger: root.current, start: 'top 60%' }, stagger: 0.03 });
      gsap
        .timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: q('[data-pin]')[0], start: 'top top', end: 'bottom bottom', scrub: 1.4 },
        })
        .fromTo(q('[data-frame]'), { clipPath: small }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 0.55 }, 0)
        .fromTo(q('[data-img]'), { scale: 1.5 }, { scale: 1, duration: 1 }, 0)
        .fromTo(q('[data-kanji]'), { yPercent: 18 }, { yPercent: -18, duration: 1 }, 0)
        .fromTo(q('[data-hour]'), { yPercent: 40 }, { yPercent: -60, duration: 1 }, 0)
        .fromTo(q('[data-shade]'), { opacity: 0 }, { opacity: 0.75, duration: 0.25 }, 0.5)
        .fromTo(q('[data-copy]'), { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.22, stagger: 0.04 }, 0.62);
      gsap.from(q('[data-shot]'), {
        x: 120,
        autoAlpha: 0,
        duration: 1.6,
        stagger: 0.08,
        scrollTrigger: { trigger: q('[data-strip]')[0], start: 'top 85%' },
      });
    },
    { scope: root },
  );

  // Clash Display's caps run about 0.68 em per letter: size the title so it fits on one line.
  const size = `min(11vw, ${(88 / (w.title.length * 0.68)).toFixed(2)}vw, 12rem)`;

  return (
    <article ref={root} aria-labelledby={`w-${w.id}`} style={{ '--tone': w.tone } as CSSProperties}>
      <div data-pin className="relative h-[250svh]">
        <div className="sticky top-0 h-[100svh] overflow-clip">
          <button
            type="button"
            data-frame
            onClick={() => open(0)}
            data-cursor="View"
            aria-label={`Open ${w.title} full size`}
            className="absolute inset-0 block will-change-[clip-path]"
            style={{ clipPath: 'inset(20% 32% 20% 32% round 32px)' }}
          >
            <img
              data-img
              src={w.plate.src}
              alt={w.alt}
              width={w.plate.w}
              height={w.plate.h}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover will-change-transform"
            />
            <span data-shade className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/5 opacity-0" />
          </button>

          <p
            data-kanji
            aria-hidden="true"
            lang="ja"
            className="pointer-events-none absolute top-[12vh] right-3 text-[clamp(3.6rem,9vw,9.5rem)] leading-[1] font-bold text-[var(--tone)] [font-family:'Hiragino_Sans','Hiragino_Kaku_Gothic_ProN','Noto_Sans_JP','Noto_Sans_CJK_JP','Yu_Gothic','Meiryo',sans-serif] [text-shadow:0_6px_40px_rgb(10_9_12/0.5)] [writing-mode:vertical-rl] md:right-8"
          >
            {w.jp}
          </p>

          <div data-hour className="pointer-events-none absolute top-[12vh] left-5 md:left-10">
            <p className="display text-outline-bone text-[clamp(3rem,7vw,7.5rem)] tabular-nums opacity-80">{w.hour}</p>
            <p className="label mt-3 text-bone/75">
              World {String(index + 1).padStart(2, '0')} / {String(worlds.length).padStart(2, '0')} · {w.year}
            </p>
          </div>

          <h3
            id={`w-${w.id}`}
            data-skew
            className="display pointer-events-none absolute inset-x-0 top-[34%] -translate-y-1/2 px-5 [text-shadow:0_4px_60px_rgb(10_9_12/0.55)] md:top-1/2 md:px-10"
            style={{ fontSize: size }}
          >
            <span data-t className="block">
              {w.title}
            </span>
          </h3>

          <div className="pointer-events-none absolute inset-x-5 bottom-8 flex flex-col gap-6 md:inset-x-10 md:bottom-12 md:flex-row md:items-end md:justify-between">
            <div data-copy className="max-w-[36rem] opacity-0">
              <p className="title text-[clamp(1.2rem,1.7vw,1.6rem)] leading-snug text-[var(--tone)]">{w.sub}</p>
              <p className="mt-4 line-clamp-4 text-[1rem] leading-relaxed text-bone/85 md:line-clamp-none">{w.note}</p>
            </div>
            <div data-copy className="pointer-events-auto flex flex-col items-start gap-4 opacity-0 md:items-end">
              <ul className="flex max-w-[26rem] flex-wrap gap-2 md:justify-end" aria-label="Made with">
                {w.tags.map((t) => (
                  <li key={t} className="label rounded-full border border-bone/25 px-3 py-1.5 text-bone/80 backdrop-blur-sm">
                    {t}
                  </li>
                ))}
              </ul>
              <Magnetic>
                <button
                  type="button"
                  onClick={() => open(0)}
                  data-cursor="View"
                  className="label flex h-14 items-center rounded-full px-7 text-ink"
                  style={{ background: w.tone }}
                >
                  <Roll text={`Open the reel · ${reel.length}`} />
                </button>
              </Magnetic>
            </div>
          </div>
        </div>
      </div>

      <div className="relative bg-[radial-gradient(60%_80%_at_20%_0%,color-mix(in_oklab,var(--tone)_14%,transparent),transparent)] pt-6 pb-24">
        <p className="label mb-6 flex justify-between px-5 text-mute md:px-10">
          <span>
            Reel · <span className="text-bone">{w.title}</span>
          </span>
          <span>Drag or scroll sideways →</span>
        </p>
        <ul data-strip className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-px-5 px-5 md:scroll-px-10 md:px-10">
          {reel.map((m, i) => (
            <li key={m.src} data-shot className="shrink-0 snap-start">
              <button
                type="button"
                onClick={() => open(i)}
                data-cursor={m.type === 'video' ? 'Play' : 'View'}
                className="group relative block h-[38svh] overflow-hidden rounded-2xl bg-ink-2 md:h-[48vh]"
                style={{ aspectRatio: `${m.w} / ${m.h}` }}
              >
                {m.type === 'video' ? (
                  <InViewVideo src={m.src} poster={m.poster} label={m.caption} className="h-full w-full object-cover" />
                ) : (
                  <img
                    src={m.thumb}
                    srcSet={`${m.thumb} 640w, ${m.src} ${m.w}w`}
                    sizes="(min-width: 768px) 60vw, 85vw"
                    alt={m.caption}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-[scale] duration-[1.4s] ease-[var(--ease-slow)] group-hover:scale-[1.06]" />
                )}
                <span className="label absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-ink/60 px-3 py-1.5 text-bone backdrop-blur-md">
                  {m.type === 'video' && <span aria-hidden="true">▶</span>}
                  {m.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
