import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, reducedMotion } from '../lib/motion';
import { bySlug, featured, projects } from '../data/projects';

// The sentence, with a little window onto each world set into the line beside its name.
const PARTS: (string | { slug: string })[] = [
  'Every site here began as a place:',
  { slug: 'flooded-rotunda' },
  'a drowned rotunda,',
  { slug: 'ring-gate' },
  'a stone ring in the sea,',
  { slug: 'altair-estates' },
  'an estate on a cliff,',
  { slug: 'overgrown-archive' },
  'a forest at night. I build the place first, decide where the light goes, then build the way in, so the first scroll feels like stepping through a door.',
];

const STATS: [string, string][] = [
  [String(projects.length), 'Finished sites'],
  [String(featured.length), 'Worlds built before their sites'],
  [String(projects.filter((p) => p.kind === 'Client').length), 'Client launches'],
  ['0', 'Templates'],
];

export default function Manifesto() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const q = gsap.utils.selector(root);
      const para = q('[data-para]')[0];
      gsap
        .timeline({ scrollTrigger: { trigger: para, start: 'top 80%', end: 'bottom 45%', scrub: 1 } })
        .fromTo(q('[data-word]'), { opacity: 0.1 }, { opacity: 1, ease: 'none', stagger: 0.05 }, 0)
        .fromTo(q('[data-pill]'), { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, ease: 'expo.out', stagger: 0.6, duration: 1 }, 0.3);

      q('[data-count]').forEach((el) => {
        const end = Number(el.dataset.count);
        const v = { n: 0 };
        gsap.to(v, {
          n: end,
          duration: 2.4,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          onUpdate: () => (el.textContent = String(Math.round(v.n)).padStart(2, '0')),
        });
      });
      gsap.from(q('[data-stat]'), { yPercent: 40, autoAlpha: 0, duration: 1.6, stagger: 0.1, scrollTrigger: { trigger: q('dl')[0], start: 'top 90%' } });
    },
    { scope: root },
  );

  let n = 0;
  const words: ReactNode[] = [];
  PARTS.forEach((part) => {
    if (typeof part !== 'string') {
      const p = bySlug(part.slug)!;
      words.push(
        <span
          key={`pill-${part.slug}`}
          data-pill
          aria-hidden="true"
          className="mx-[0.12em] inline-block h-[0.74em] w-[1.7em] origin-left translate-y-[0.06em] overflow-hidden rounded-full align-baseline"
        >
          <img src={p.cover.src} alt="" loading="lazy" decoding="async" className="h-full w-full scale-125 object-cover" />
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
    <section ref={root} aria-labelledby="idea-title" className="relative z-[3] bg-ink px-5 py-[20vh] md:px-10">
      <div className="label mb-12 flex justify-between text-mute">
        <span id="idea-title">(02) The idea</span>
        <span>Worlds → websites</span>
      </div>
      <p data-para className="title max-w-[22ch] text-[clamp(2.1rem,5vw,5.6rem)] leading-[1.02] md:max-w-[24ch]">
        {words}
      </p>
      <dl className="mt-28 grid grid-cols-2 border-t border-line md:grid-cols-4">
        {STATS.map(([v, label], i) => (
          <div key={label} data-stat className={`flex flex-col gap-4 border-line pt-8 pb-4 md:px-6 ${i ? 'md:border-l' : 'md:pl-0'} ${i % 2 ? 'pl-5' : ''}`}>
            <dt className="label order-2 text-mute">{label}</dt>
            <dd className="display order-1 text-[clamp(4rem,9vw,9rem)] tabular-nums" data-count={v}>
              {v.padStart(2, '0')}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
