import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, reducedMotion } from '../lib/motion';
import { featured, type Project } from '../data/projects';
import { workHref } from '../lib/useHashRoute';

/**
 * The four worlds. Each image starts as a small arch-cornered card and opens to the
 * full screen as you scroll, while its title layers slide at different speeds.
 */
export default function Worlds() {
  return (
    <section id="worlds" aria-labelledby="worlds-title" className="relative z-[3] bg-ink">
      <header className="px-5 pt-[18vh] pb-[8vh] md:px-10">
        <p className="label mb-6 text-mute">( Worlds, then websites )</p>
        <h2 id="worlds-title" className="display max-w-[14ch] text-[clamp(2.6rem,6vw,6rem)]">
          Four worlds, <em className="text-[var(--accent)]">four doors.</em>
        </h2>
        <p className="mt-8 max-w-[32rem] leading-relaxed text-mute">
          These were built as places first, in Blender, Unreal and code. Then each one got a website that lets you walk in.
        </p>
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
      const small = window.innerWidth < 768 ? 'inset(14% 7% 14% 7% round 22px)' : 'inset(17% 31% 17% 31% round 28px)';
      gsap
        .timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: 1.4 },
        })
        .fromTo(q('[data-frame]'), { clipPath: small }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 0.55 }, 0)
        .fromTo(q('[data-img]'), { scale: 1.45 }, { scale: 1, duration: 1 }, 0)
        .fromTo(q('[data-t1]'), { xPercent: -6 }, { xPercent: 4, duration: 1 }, 0)
        .fromTo(q('[data-t2]'), { xPercent: 8 }, { xPercent: -6, duration: 1 }, 0)
        .fromTo(q('[data-num]'), { yPercent: 60 }, { yPercent: -80, duration: 1 }, 0)
        .fromTo(q('[data-shade]'), { opacity: 0 }, { opacity: 0.72, duration: 0.25 }, 0.5)
        .fromTo(q('[data-copy]'), { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.22, stagger: 0.04 }, 0.6);
    },
    { scope: root },
  );

  const [first, ...rest] = p.title.split(/:\s|\s(?=[^\s]+$)/);

  return (
    <article ref={root} aria-labelledby={`w-${p.slug}`} className="relative h-[240svh]">
      <div className="sticky top-0 h-[100svh] overflow-clip">
        <div data-frame className="absolute inset-0 will-change-[clip-path]" style={{ clipPath: 'inset(17% 31% 17% 31% round 28px)' }}>
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
          <div data-shade className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10 opacity-0" />
        </div>

        <p
          data-num
          aria-hidden="true"
          className="label pointer-events-none absolute top-[12vh] left-5 text-bone/70 md:left-10"
        >
          World {String(index + 1).padStart(2, '0')} / {String(featured.length).padStart(2, '0')} · {p.year}
        </p>

        <h3
          id={`w-${p.slug}`}
          className="display pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-5 text-[clamp(3rem,10vw,10.5rem)] leading-[0.88] [text-shadow:0_2px_40px_rgb(9_8_11/0.55)] md:px-10"
        >
          <span data-t1 className="block">
            {first}
          </span>
          {rest.length > 0 && (
            <span data-t2 className="block text-right italic">
              {rest.join(' ')}
            </span>
          )}
        </h3>

        <div className="absolute inset-x-5 bottom-8 flex flex-col gap-6 md:inset-x-10 md:bottom-12 md:flex-row md:items-end md:justify-between">
          <p data-copy className="max-w-[30rem] text-[1.05rem] leading-relaxed text-bone/90 opacity-0">
            {p.line}
          </p>
          <div data-copy className="flex flex-wrap gap-3 opacity-0">
            <a
              href={workHref(p.slug)}
              data-cursor="Read"
              className="label rounded-full bg-bone px-6 py-4 text-ink transition-colors duration-500 hover:bg-[var(--accent)]"
            >
              Read the story
            </a>
            <a
              href={p.live}
              target="_blank"
              rel="noopener"
              data-cursor="Visit"
              className="label rounded-full border border-bone/30 px-6 py-4 text-bone transition-colors duration-500 hover:border-bone"
            >
              Open the site ↗<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
