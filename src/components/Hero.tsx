import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, reducedMotion } from '../lib/motion';
import { projects } from '../data/projects';
import PortalAnchor from './portal/PortalAnchor';

export default function Hero({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (reducedMotion) return;
      // Hidden under the loader, then risen once it lifts.
      if (!ready) {
        gsap.set(q('.rise > span'), { yPercent: 105 });
        return;
      }
      gsap
        .timeline({ delay: 0.15 })
        .fromTo(q('.rise > span'), { yPercent: 105 }, { yPercent: 0, duration: 1.8, stagger: 0.12, ease: 'expo.out' })
        .from(q('[data-fade]'), { autoAlpha: 0, y: 16, duration: 1.6, stagger: 0.1 }, 0.5)
        .from(q('[data-back]'), { autoAlpha: 0, scale: 1.06, duration: 3, ease: 'power2.out' }, 0);

      // Layers drift at different speeds as the hero leaves: depth without a second canvas.
      gsap
        .timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 1.2 } })
        .to(q('[data-back]'), { yPercent: 38, ease: 'none' }, 0)
        .to(q('[data-front]'), { yPercent: -28, autoAlpha: 0.15, ease: 'none' }, 0)
        .to(q('[data-door]'), { yPercent: 12, ease: 'none' }, 0);
    },
    { scope: root, dependencies: [ready] },
  );

  return (
    <section id="top" ref={root} aria-labelledby="hero-title" className="relative min-h-[100svh] overflow-clip">
      <div
        data-back
        aria-hidden="true"
        className="display pointer-events-none absolute inset-x-0 top-[16vh] z-0 text-center text-[38vw] leading-none text-bone/[0.045] italic select-none before:content-['Doors'] md:top-[6vh] md:text-[30vw]"
      />

      <div data-door className="absolute inset-x-0 top-[8svh] z-[2] h-[40svh] md:inset-x-auto md:top-[10vh] md:right-[3vw] md:h-[80vh] md:w-[48vw]">
        <PortalAnchor className="h-full w-full" />
      </div>

      <div data-front className="pointer-events-none relative z-[3] flex min-h-[100svh] flex-col justify-end px-5 pt-28 pb-8 md:px-10 md:pb-12">
        <p data-fade className="label mb-6 max-w-[26rem] text-mute">
          Amidyala Sai Sumanth · 3D environment artist &amp; web designer · Hyderabad
        </p>
        <h1 id="hero-title" className="display max-w-[14ch] text-[clamp(3.1rem,8.6vw,9.5rem)]">
          <span className="rise">
            <span>I build worlds,</span>
          </span>
          <span className="rise">
            <span>
              then their <em className="text-[var(--accent)]">front doors.</em>
            </span>
          </span>
        </h1>
        <div className="mt-8 flex flex-col gap-6 md:mt-10 md:flex-row md:items-end md:justify-between">
          <p data-fade className="max-w-[34rem] text-[0.95rem] leading-relaxed text-mute md:text-base">
            {projects.length} finished websites. A forest you walk at night, an estate that draws itself as you drive it, a wedding you turn the
            pages of. Each one started as a place.
          </p>
          <p data-fade className="label flex items-center gap-3 text-mute">
            <span className="relative block h-10 w-px overflow-hidden bg-line">
              <span className="absolute inset-x-0 top-0 h-1/2 animate-[cue_2.4s_var(--ease-slow)_infinite] bg-bone motion-reduce:animate-none" />
            </span>
            Scroll to step through
          </p>
        </div>
      </div>
    </section>
  );
}
