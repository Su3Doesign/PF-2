import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, reducedMotion, riseChars } from '../lib/motion';
import { profile, projects } from '../data/projects';
import { counts } from '../data/work';
import Magnetic from './kit/Magnetic';
import Roll from './kit/Roll';

const LEDE =
  'Amidyala Sai Sumanth: brand and design systems, 3D worlds, and the websites that open them. Head of Marketing at CapQ in Hyderabad; before that, fifteen months with an agency in Toronto.';

function ResumeLink() {
  return (
    <span data-fade className="pointer-events-auto mt-5 flex shrink-0 items-center gap-6 md:mt-0">
      <Magnetic>
        <a
          href={profile.resume}
          target="_blank"
          rel="noopener"
          data-cursor="Résumé"
          className="label flex h-12 items-center gap-2 rounded-full border border-bone/30 px-6 text-bone backdrop-blur-sm transition-colors duration-500 hover:border-bone hover:bg-bone hover:text-ink"
        >
          <Roll text="Résumé ↗" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </Magnetic>
      <a href={profile.behance} target="_blank" rel="noopener" data-cursor="Behance" className="label py-3 text-bone/80 transition-colors hover:text-bone">
        <Roll text="Behance ↗" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </span>
  );
}
import PortalAnchor from './portal/PortalAnchor';

/**
 * Two giant words with the door standing between them. The words sit behind the WebGL
 * canvas, so the door really is in front of the type. Scrolling slides them apart like
 * a pair of doors while the door comes forward.
 */
export default function Hero({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (reducedMotion) return;
      if (!ready) {
        gsap.set(q('[data-word], [data-fade], [data-h1]'), { autoAlpha: 0 });
        return;
      }
      gsap.set(q('[data-word], [data-h1]'), { autoAlpha: 1 });
      riseChars(q('[data-word="front"]'), { yPercent: 120, rotate: 0, stagger: 0.05, duration: 1.9, delay: 0.05 });
      riseChars(q('[data-word="doors"]'), { yPercent: 120, rotate: 0, stagger: { each: 0.05, from: 'end' }, duration: 1.9, delay: 0.15 });
      riseChars(q('[data-h1]'), { yPercent: 110, rotate: 0, stagger: 0.012, duration: 1.4, delay: 0.5 });
      gsap.to(q('[data-fade]'), { autoAlpha: 1, duration: 1.4, stagger: 0.08, delay: 0.9, ease: 'power2.out' });

      gsap
        .timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 1.2 } })
        .to(q('[data-word="front"]'), { xPercent: -38, ease: 'none' }, 0)
        .to(q('[data-word="doors"]'), { xPercent: 38, ease: 'none' }, 0)
        .to(q('[data-door]'), { scale: 1.18, yPercent: 8, ease: 'none' }, 0)
        .to(q('[data-front]'), { autoAlpha: 0, yPercent: -20, ease: 'none' }, 0);
    },
    { scope: root, dependencies: [ready] },
  );

  return (
    <section
      id="top"
      ref={root}
      aria-labelledby="hero-title"
      className="relative h-[100svh] min-h-[620px] overflow-clip [--fs:min(27vw,30svh)] md:[--fs:min(23vw,36vh)]"
    >
      {/* Behind the canvas. --fs keeps both words inside the screen at any aspect ratio. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 select-none">
        <p data-word="front" className="display absolute top-[12svh] left-[2vw] text-[length:var(--fs)] md:top-[12vh]">
          Front
        </p>
        <p data-word="doors" className="display absolute right-[2vw] bottom-[31svh] text-[length:var(--fs)] text-[var(--accent)] md:bottom-[11vh]">
          Doors
        </p>
      </div>

      <div
        data-door
        className="absolute top-[9svh] left-1/2 z-[2] h-[62svh] w-[86vw] -translate-x-1/2 md:top-[8vh] md:h-[84vh] md:w-[34vw]"
      >
        <PortalAnchor className="h-full w-full" caption={false} />
      </div>

      <div data-front className="pointer-events-none absolute inset-0 z-[3]">
        <div data-fade className="label absolute inset-x-10 top-[4.9rem] hidden justify-between text-mute md:flex">
          <span>
            (Index) {counts.worlds} worlds · {counts.clients} clients · {counts.studies} studies · {projects.length} sites
          </span>
          <span>Brand · 3D · Web · Marketing</span>
          <span>17.38°N 78.48°E</span>
        </div>

        {/* On desktop the headline sits in the gap between the two giant words. */}
        <div className="absolute inset-x-5 bottom-6 md:inset-x-10 md:top-[calc(12vh+var(--fs)*0.86)] md:bottom-[calc(11vh+var(--fs)*0.86)] md:flex md:items-center md:justify-between">
          <h1 id="hero-title" data-h1 className="title max-w-[22ch] text-[clamp(1.6rem,2.3vw,2.4rem)]">
            I build worlds, then their <span className="text-[var(--accent)]">front doors.</span>
          </h1>
          <p data-fade className="label hidden text-bone md:block">
            Drag the door ↻ 360°
          </p>
          <div className="md:hidden">
            <p data-fade className="mt-4 max-w-[30rem] text-[0.95rem] leading-relaxed text-mute">{LEDE}</p>
            <ResumeLink />
          </div>
        </div>

        <div className="absolute inset-x-10 bottom-[2.6vh] hidden items-end justify-between gap-10 md:flex">
          <div className="flex items-end gap-8">
            <p data-fade className="max-w-[34rem] text-[0.95rem] leading-relaxed text-mute">
              {LEDE}
            </p>
            <ResumeLink />
          </div>
          <p data-fade className="label flex items-center gap-3 text-mute">
            <span className="relative block h-8 w-px overflow-hidden bg-line">
              <span className="absolute inset-x-0 top-0 h-1/2 animate-[cue_2.4s_var(--ease-slow)_infinite] bg-bone motion-reduce:animate-none" />
            </span>
            Scroll
          </p>
        </div>
      </div>
    </section>
  );
}
