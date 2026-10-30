import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, reducedMotion } from '../lib/motion';
import { featured, projects } from '../data/projects';

const TEXT =
  'Every site here began as a place: a drowned rotunda, a stone ring in the sea, an estate on a cliff, a forest at night. I build the place first, decide where the light goes, and only then build the way in, so the first scroll feels like stepping through a door.';

const STATS: [string, string][] = [
  [String(projects.length), 'finished sites'],
  [String(featured.length), 'worlds built before their sites'],
  [String(projects.filter((p) => p.kind === 'Client').length), 'client launches'],
  ['0', 'templates'],
];

export default function Manifesto() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const q = gsap.utils.selector(root);
      gsap.fromTo(
        q('[data-word]'),
        { opacity: 0.12 },
        {
          opacity: 1,
          ease: 'none',
          stagger: 0.05,
          scrollTrigger: { trigger: q('p')[0], start: 'top 78%', end: 'bottom 45%', scrub: 1 },
        },
      );
      q('[data-count]').forEach((el) => {
        const end = Number(el.dataset.count);
        const v = { n: 0 };
        gsap.to(v, {
          n: end,
          duration: 2.2,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          onUpdate: () => (el.textContent = String(Math.round(v.n)).padStart(2, '0')),
        });
      });
      gsap.from(q('[data-stat]'), {
        y: 30,
        autoAlpha: 0,
        duration: 1.6,
        stagger: 0.1,
        scrollTrigger: { trigger: q('dl')[0], start: 'top 88%' },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-label="Approach" className="relative z-[3] px-5 py-[22vh] md:px-10">
      <p className="label mb-10 text-mute">( The idea )</p>
      <p className="display max-w-[22ch] text-[clamp(2.2rem,5.4vw,5.6rem)] leading-[1.02]">
        {TEXT.split(' ').map((w, i) => (
          <span key={i} data-word className="inline">
            {w}{' '}
          </span>
        ))}
      </p>
      <dl className="mt-24 grid grid-cols-2 gap-x-6 gap-y-12 border-t border-line pt-10 md:grid-cols-4">
        {STATS.map(([n, label]) => (
          <div key={label} data-stat className="flex flex-col">
            <dt className="label order-2 mt-3 text-mute">{label}</dt>
            <dd className="display order-1 text-[clamp(3rem,6vw,5.5rem)] tabular-nums" data-count={n}>
              {n.padStart(2, '0')}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
