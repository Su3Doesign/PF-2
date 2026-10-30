import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, reducedMotion } from '../lib/motion';
import { projects, profile } from '../data/projects';
import { about, counts, worlds, studies } from '../data/work';
import InViewVideo from './kit/InViewVideo';
import Magnetic from './kit/Magnetic';
import Roll from './kit/Roll';

// Sumanth's own line, with a window onto the work set into it.
const PARTS: (string | { src: string })[] = [
  'I build places',
  { src: worlds[0].plate.thumb },
  "that don't exist, then decide how the light",
  { src: worlds[2].plate.thumb },
  'behaves once it gets',
  { src: studies.find((s) => s.name === 'Late room')!.thumb },
  'there.',
];

const STATS: [string, string][] = [
  ...about.numbers,
  [String(counts.clients), 'Clients'],
  [String(counts.studies), 'Studies'],
  [String(projects.length), 'Websites'],
];

/** Who is building: the line, the two halves of the work, the tools, the path so far. */
export default function Manifesto() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const q = gsap.utils.selector(root);
      const para = q('[data-para]')[0];
      gsap
        .timeline({ scrollTrigger: { trigger: para, start: 'top 80%', end: 'bottom 50%', scrub: 1 } })
        .fromTo(q('[data-word]'), { opacity: 0.1 }, { opacity: 1, ease: 'none', stagger: 0.05 }, 0)
        .fromTo(q('[data-pill]'), { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, ease: 'expo.out', stagger: 0.8, duration: 1 }, 0.2);

      q('[data-count]').forEach((el) => {
        const end = Number(el.dataset.count);
        const v = { n: 0 };
        gsap.to(v, {
          n: end,
          duration: 2.4,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 92%', once: true },
          onUpdate: () => (el.textContent = String(Math.round(v.n)).padStart(2, '0')),
        });
      });
      q('[data-in]').forEach((el) =>
        gsap.from(el, { y: 50, autoAlpha: 0, duration: 1.6, scrollTrigger: { trigger: el, start: 'top 88%' } }),
      );
    },
    { scope: root },
  );

  let n = 0;
  const words: ReactNode[] = [];
  PARTS.forEach((part) => {
    if (typeof part !== 'string') {
      words.push(
        <span
          key={`pill-${n++}`}
          data-pill
          aria-hidden="true"
          className="mx-[0.12em] inline-block h-[0.74em] w-[1.7em] origin-left translate-y-[0.06em] overflow-hidden rounded-full align-baseline"
        >
          <img src={part.src} alt="" loading="lazy" decoding="async" className="h-full w-full scale-125 object-cover" />
        </span>,
      );
      return;
    }
    part.split(' ').forEach((w) =>
      words.push(
        <span key={n++} data-word>
          {w}{' '}
        </span>,
      ),
    );
  });

  return (
    <section ref={root} id="about" aria-labelledby="about-title" className="relative z-[3] bg-ink px-5 py-[20vh] md:px-10">
      <div className="label mb-12 flex justify-between gap-6 text-mute">
        <span id="about-title">(02) Who’s building</span>
        <span>Hyderabad · 17.38°N 78.48°E</span>
      </div>
      <p data-para className="title max-w-[20ch] text-[clamp(2.2rem,5.4vw,6rem)] leading-[1.02]">
        {words}
      </p>

      <div className="mt-24 grid gap-14 md:grid-cols-12">
        <div className="space-y-6 md:col-span-5">
          <p data-in className="title text-[clamp(1.35rem,2vw,1.85rem)] leading-[1.18]">
            {about.statement}
          </p>
          {about.paragraphs.map((p) => (
            <p key={p} data-in className="text-[1.08rem] leading-[1.65] text-bone/80">
              {p}
            </p>
          ))}
          <div data-in className="flex flex-wrap gap-3 pt-4">
            <Magnetic>
              <a
                href={profile.resume}
                target="_blank"
                rel="noopener"
                data-cursor="Résumé"
                className="label flex h-14 items-center rounded-full bg-[var(--accent)] px-7 text-ink"
              >
                <Roll text="Full résumé ↗" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Magnetic>
            <Magnetic>
              <a
                href={profile.behance}
                target="_blank"
                rel="noopener"
                data-cursor="Behance"
                className="label flex h-14 items-center rounded-full border border-bone/30 px-7 text-bone transition-colors duration-500 hover:border-bone hover:bg-bone hover:text-ink"
              >
                <Roll text="Behance ↗" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Magnetic>
          </div>
        </div>

        <div className="md:col-span-6 md:col-start-7">
          <dl data-in className="border-t border-line">
            {Object.entries(about.tools).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[7rem_1fr] gap-4 border-b border-line py-5">
                <dt className="label pt-1 text-mute">{k}</dt>
                <dd className="title text-[clamp(1.1rem,1.6vw,1.45rem)] leading-snug">{v}</dd>
              </div>
            ))}
          </dl>

          {about.desk && (
            <figure data-in className="mt-10 flex items-center gap-5">
              <InViewVideo
                src={about.desk}
                poster="v1/assets/posters/desk-hero.webp"
                label="Sumanth's desk, at work"
                className="aspect-[4/3] w-44 shrink-0 rounded-2xl object-cover md:w-56"
              />
              <figcaption className="label leading-relaxed text-mute">
                The desk, on a Friday.
                <br />
                <span className="text-bone">Agencies in Toronto and San Juan.</span>
              </figcaption>
            </figure>
          )}
        </div>
      </div>

      <div className="mt-24">
        <p data-in className="label mb-6 text-mute">
          The path so far
        </p>
        <ol className="border-t border-line">
          {about.path.map(([role, where, detail]) => (
            <li key={role} data-in className="grid gap-2 border-b border-line py-6 md:grid-cols-[1.1fr_1fr_1.2fr] md:items-baseline md:gap-8">
              <span className="title text-[clamp(1.3rem,2vw,1.9rem)]">{role}</span>
              <span className="text-bone/80">{where}</span>
              <span className="label leading-relaxed text-mute">{detail}</span>
            </li>
          ))}
        </ol>
      </div>

      <dl className="mt-24 grid grid-cols-2 border-t border-line md:grid-cols-5">
        {STATS.map(([v, label], i) => {
          const n = /^\d+$/.test(v);
          return (
            <div key={label} data-in className={`flex flex-col gap-4 border-line pt-8 pb-4 md:px-5 ${i ? 'md:border-l' : 'md:pl-0'} ${i % 2 ? 'pl-5' : ''}`}>
              <dt className="label order-2 text-mute">{label}</dt>
              <dd className="display order-1 text-[clamp(3.4rem,6.6vw,7rem)] tabular-nums" data-count={n ? v : undefined}>
                {n ? v.padStart(2, '0') : v}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
