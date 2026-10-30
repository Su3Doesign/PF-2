import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, reducedMotion, riseChars } from '../lib/motion';
import { featured, type Project } from '../data/projects';
import { workHref } from '../lib/useHashRoute';
import Roll from './kit/Roll';
import Magnetic from './kit/Magnetic';

/**
 * The four worlds. Each image starts as a small card and opens to the full screen as
 * you scroll, while its title lines slide apart and lean with the scroll speed.
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
          <span>(04) Worlds, then websites</span>
          <span>Built in Blender, Unreal and code</span>
        </div>
        <h2 id="worlds-title" className="display text-[clamp(2.9rem,10.4vw,11.5rem)]">
          <span className="block">Four worlds,</span>
          <span className="text-outline block text-[var(--accent)]">four doors.</span>
        </h2>
      </header>
      {featured.map((p, i) => (
        <World key={p.slug} project={p} index={i} />
      ))}
    </section>
  );
}

function World({ project: p, index }: { project: Project; index: number }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (reducedMotion) {
        gsap.set(q('[data-frame]'), { clipPath: 'inset(0% 0% 0% 0% round 0px)' });
        gsap.set(q('[data-shade]'), { opacity: 0.7 });
        return;
      }
      const small = window.innerWidth < 768 ? 'inset(16% 8% 16% 8% round 24px)' : 'inset(20% 32% 20% 32% round 32px)';
      riseChars(q('[data-t]'), { scrollTrigger: { trigger: root.current, start: 'top 60%' }, stagger: 0.03 });
      gsap
        .timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: 1.4 },
        })
        .fromTo(q('[data-frame]'), { clipPath: small }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 0.55 }, 0)
        .fromTo(q('[data-img]'), { scale: 1.5 }, { scale: 1, duration: 1 }, 0)
        .fromTo(q('[data-t1]'), { xPercent: -8 }, { xPercent: 6, duration: 1 }, 0)
        .fromTo(q('[data-t2]'), { xPercent: 10 }, { xPercent: -6, duration: 1 }, 0)
        .fromTo(q('[data-num]'), { yPercent: 40 }, { yPercent: -60, duration: 1 }, 0)
        .fromTo(q('[data-shade]'), { opacity: 0 }, { opacity: 0.75, duration: 0.25 }, 0.5)
        .fromTo(q('[data-copy]'), { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.22, stagger: 0.04 }, 0.62);
    },
    { scope: root },
  );

  const [first, ...rest] = p.title.split(/:\s|\s(?=[^\s]+$)/);
  // Clash Display's caps run about 0.68 em per letter: size the title so its longest line fits.
  const longest = Math.max(first.length, rest.join(' ').length);
  const size = `min(12vw, ${(90 / (longest * 0.68)).toFixed(2)}vw, 13rem)`;

  return (
    <article ref={root} aria-labelledby={`w-${p.slug}`} className="relative h-[250svh]">
      <div className="sticky top-0 h-[100svh] overflow-clip">
        <div data-frame className="absolute inset-0 will-change-[clip-path]" style={{ clipPath: 'inset(20% 32% 20% 32% round 32px)' }}>
          <img
            data-img
            src={p.cover.src}
            alt={p.cover.alt}
            width={1920}
            height={1080}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover will-change-transform"
          />
          <div data-shade className="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-ink/10 opacity-0" />
        </div>

        <p
          data-num
          aria-hidden="true"
          className="display text-outline-bone pointer-events-none absolute top-[11vh] right-5 text-[clamp(5rem,12vw,13rem)] opacity-60 md:right-10"
        >
          0{index + 1}
        </p>
        <p className="label pointer-events-none absolute top-[13vh] left-5 text-bone/75 md:left-10">
          World {String(index + 1).padStart(2, '0')} / {String(featured.length).padStart(2, '0')} · {p.year} · {p.role}
        </p>

        <h3
          id={`w-${p.slug}`}
          data-skew
          className="display pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-5 [text-shadow:0_4px_60px_rgb(10_9_12/0.5)] md:px-10"
          style={{ fontSize: size }}
        >
          <span data-t1 className="block">
            <span data-t className="block">
              {first}
            </span>
          </span>
          {rest.length > 0 && (
            <span data-t2 className="block text-right" style={{ color: p.tone }}>
              <span data-t className="block">
                {rest.join(' ')}
              </span>
            </span>
          )}
        </h3>

        <div className="absolute inset-x-5 bottom-8 flex flex-col gap-6 md:inset-x-10 md:bottom-12 md:flex-row md:items-end md:justify-between">
          <p data-copy className="title max-w-[30rem] text-[clamp(1.15rem,1.6vw,1.5rem)] leading-snug font-medium text-bone/90 opacity-0">
            {p.line}
          </p>
          <div data-copy className="flex flex-wrap gap-3 opacity-0">
            <Magnetic>
              <a
                href={workHref(p.slug)}
                data-cursor="Read"
                className="label flex h-14 items-center rounded-full bg-bone px-7 text-ink transition-colors duration-500 hover:bg-[var(--accent)]"
              >
                <Roll text="Read the story" />
              </a>
            </Magnetic>
            <Magnetic>
              <a
                href={p.live}
                target="_blank"
                rel="noopener"
                data-cursor="Visit"
                className="label flex h-14 items-center rounded-full border border-bone/30 px-7 text-bone backdrop-blur-sm transition-colors duration-500 hover:border-bone"
              >
                <Roll text="Open the site ↗" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Magnetic>
          </div>
        </div>
      </div>
    </article>
  );
}
