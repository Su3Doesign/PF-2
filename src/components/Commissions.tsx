import { useRef, type PointerEvent } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, reducedMotion, riseChars } from '../lib/motion';
import { tiers } from '../data/work';
import { profile } from '../data/projects';
import Roll from './kit/Roll';

/** The three ways to commission work, hung like ema plaques that tilt toward the pointer. */
export default function Commissions() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      riseChars(q('h2')[0], { scrollTrigger: { trigger: q('h2')[0], start: 'top 85%' } });
      if (reducedMotion) return;
      gsap.from(q('[data-card]'), {
        yPercent: 30,
        rotate: (i: number) => (i - 1) * 4,
        autoAlpha: 0,
        duration: 1.8,
        stagger: 0.12,
        scrollTrigger: { trigger: q('ol')[0], start: 'top 85%' },
      });
    },
    { scope: root },
  );

  const tilt = (e: PointerEvent<HTMLElement>) => {
    if (reducedMotion || e.pointerType !== 'mouse') return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    gsap.to(el, {
      rotateY: ((e.clientX - r.left) / r.width - 0.5) * 12,
      rotateX: -((e.clientY - r.top) / r.height - 0.5) * 12,
      duration: 0.8,
      ease: 'expo.out',
    });
  };
  const rest = (e: PointerEvent<HTMLElement>) => gsap.to(e.currentTarget, { rotateX: 0, rotateY: 0, duration: 1.2, ease: 'expo.out' });

  return (
    <section ref={root} id="commissions" aria-labelledby="commissions-title" className="relative z-[3] overflow-hidden bg-ink px-5 py-[18vh] md:px-10">
      <p
        aria-hidden="true"
        lang="ja"
        className="pointer-events-none absolute top-[14vh] right-4 text-[clamp(5rem,12vw,13rem)] leading-none font-bold text-bone/[0.05] [font-family:'Hiragino_Sans','Noto_Sans_JP','Yu_Gothic',sans-serif] [writing-mode:vertical-rl]"
      >
        絵馬
      </p>
      <div className="label mb-10 flex justify-between gap-6 text-mute">
        <span>(08) Commissions</span>
        <span>Open for commissions</span>
      </div>
      <h2 id="commissions-title" className="display text-[clamp(2.9rem,10.4vw,11.5rem)]">
        <span className="block">Three ways</span>
        <span className="text-outline block text-[var(--accent)]">to start.</span>
      </h2>

      <ol className="mt-16 grid gap-5 [perspective:1400px] md:grid-cols-3">
        {tiers.map((t) => {
          const flag = Boolean(t.flag);
          return (
            <li
              key={t.n}
              data-card
              onPointerMove={tilt}
              onPointerLeave={rest}
              className={`relative flex flex-col rounded-[1.75rem] border p-7 will-change-transform md:p-8 ${flag ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_10%,var(--color-ink-2))] md:-translate-y-6' : 'border-line bg-ink-2'}`}
            >
              <span aria-hidden="true" className="absolute -top-3 left-1/2 h-6 w-px bg-line" />
              <div className="flex items-start justify-between gap-4">
                <span className="display text-[4rem] leading-none text-bone/90 tabular-nums">{t.n}</span>
                {flag && <span className="label rounded-full bg-[var(--accent)] px-3 py-1.5 text-ink">{t.flag}</span>}
              </div>
              <h3 className="title mt-8 text-[clamp(1.8rem,2.6vw,2.4rem)]">{t.name}</h3>
              <p className="mt-2 text-mute">{t.for}</p>
              <ul className="mt-8 flex-1 space-y-3 border-t border-line pt-6">
                {t.items.map((it) => (
                  <li key={it} className="flex gap-3 text-[0.98rem] text-bone/85">
                    <span aria-hidden="true" className="mt-[0.6em] h-px w-3 shrink-0 bg-[var(--accent)]" />
                    {it}
                  </li>
                ))}
              </ul>
              <a
                href={`mailto:${profile.email}?subject=${encodeURIComponent(`Commission: ${t.name}`)}`}
                data-cursor="Write"
                className={`label mt-8 flex h-14 items-center justify-center rounded-full ${flag ? 'bg-[var(--accent)] text-ink' : 'border border-bone/30 text-bone hover:border-bone'}`}
              >
                <Roll text={`Start ${t.name.toLowerCase()} →`} />
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
