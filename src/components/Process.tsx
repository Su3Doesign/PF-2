import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger, reducedMotion, scrollState } from '../lib/motion';
import { bySlug, projects } from '../data/projects';
import { workHref } from '../lib/useHashRoute';
import PortalAnchor from './portal/PortalAnchor';

const RULES = [
  {
    title: 'Find the rule',
    slug: 'flooded-rotunda',
    body: 'Every place I build keeps one rule. In the Flooded Rotunda it is that she turns to face whoever comes in, so she became the loading screen: she turns in chalk while the world downloads, then faces you.',
  },
  {
    title: 'Build the world first',
    slug: 'altair-estates',
    body: 'Altair Estates was a Blender build and a set of blueprint sheets before it had a URL. The site exports that world, with 808 trees and 2,141 lamps of it, instead of faking a new one.',
  },
  {
    title: 'Decide where the light goes',
    slug: 'ring-gate',
    body: 'The Ring Gate spends one day over the Ring, from dawn to the Hollow Sun. Light is the story and the scroll is the clock.',
  },
  {
    title: 'Make the wait part of it',
    slug: 'overgrown-archive',
    body: 'Loading is the first scene, never a spinner. In the forest, three quality tiers and a frame governor keep the walk smooth on an ordinary laptop.',
  },
  {
    title: 'Leave a door for everyone',
    slug: 'invitation-book',
    body: 'Real HTML behind every 3D stop, reduced motion respected, and a flat version when WebGL is missing. The invitation book turns its pages off the main thread so it stays smooth on modest phones.',
  },
];

export default function Process() {
  const root = useRef<HTMLElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const set = (i: number) => {
        const p = bySlug(RULES[i].slug)!;
        scrollState.showing = projects.indexOf(p);
        scrollState.tone = p.tone;
        setActive(i);
      };
      const clear = () => {
        scrollState.showing = -1;
        scrollState.tone = null;
      };

      ScrollTrigger.create({
        trigger: grid.current,
        start: 'top 60%',
        end: 'bottom 40%',
        onEnter: () => set(0),
        onEnterBack: () => set(RULES.length - 1),
        onLeave: clear,
        onLeaveBack: clear,
      });
      q('[data-rule]').forEach((el, i) => {
        ScrollTrigger.create({ trigger: el, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => s.isActive && set(i) });
      });

      // The door holds still on the left while the rules scroll past on the right.
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px)', () => {
        ScrollTrigger.create({
          trigger: grid.current,
          start: 'top top',
          end: 'bottom bottom',
          pin: stage.current,
          pinSpacing: false,
          anticipatePin: 1,
        });
      });

      if (!reducedMotion) {
        q('[data-rule]').forEach((el) => {
          gsap.from(el.querySelectorAll('[data-in]'), {
            y: 40,
            autoAlpha: 0,
            duration: 1.6,
            stagger: 0.12,
            scrollTrigger: { trigger: el, start: 'top 75%' },
          });
        });
      }
      return () => {
        mm.revert();
        clear();
      };
    },
    { scope: root },
  );

  const current = bySlug(RULES[active].slug)!;

  return (
    <section ref={root} id="method" aria-labelledby="method-title" className="relative">
      <header className="relative z-[3] px-5 pb-10 md:px-10">
        <p className="label mb-6 text-mute">( How a door gets built )</p>
        <h2 id="method-title" className="display max-w-[16ch] text-[clamp(2.6rem,6vw,6rem)]">
          Five rules, <em className="text-[var(--accent)]">every time.</em>
        </h2>
      </header>

      <div ref={grid} className="relative lg:grid lg:grid-cols-2">
        <div ref={stage} className="relative h-[68svh] lg:h-screen">
          <div className="absolute inset-x-[6%] top-[6%] bottom-[14%] z-[2]">
            <PortalAnchor className="h-full w-full" caption={false} />
          </div>
          <div className="pointer-events-none absolute inset-x-5 bottom-5 z-[3] flex items-end justify-between md:inset-x-10 md:bottom-8">
            <p className="display text-[clamp(4rem,9vw,8rem)] leading-none tabular-nums" aria-hidden="true">
              0{active + 1}
            </p>
            <p className="label max-w-[14rem] text-right text-mute">
              In the door
              <br />
              <span className="text-bone">{current.title}</span>
            </p>
          </div>
        </div>

        <ol className="relative z-[3] px-5 md:px-10 lg:py-[30vh]">
          {RULES.map((r, i) => {
            const p = bySlug(r.slug)!;
            return (
              <li key={r.title} data-rule className="flex min-h-[70svh] flex-col justify-center border-t border-line py-16 lg:min-h-[85vh]">
                <p data-in className="label mb-5 text-mute">
                  Rule {String(i + 1).padStart(2, '0')} / {String(RULES.length).padStart(2, '0')}
                </p>
                <h3 data-in className="display mb-6 text-[clamp(2.2rem,4vw,3.8rem)]">
                  {r.title}
                </h3>
                <p data-in className="max-w-[34rem] text-[1.05rem] leading-relaxed text-mute">
                  {r.body}
                </p>
                <a
                  data-in
                  href={workHref(p.slug)}
                  data-cursor="Read"
                  className="label link-sweep mt-8 self-start py-2 text-bone"
                  style={{ color: p.tone }}
                >
                  The story of {p.title} →
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
