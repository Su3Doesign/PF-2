import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger, reducedMotion, riseChars, scrollState } from '../lib/motion';
import { bySlug, projects } from '../data/projects';
import { workHref } from '../lib/useHashRoute';
import PortalAnchor from './portal/PortalAnchor';
import Roll from './kit/Roll';

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
        ScrollTrigger.create({ trigger: grid.current, start: 'top top', end: 'bottom bottom', pin: stage.current, pinSpacing: false, anticipatePin: 1 });
      });

      riseChars(q('[data-heading]'), { scrollTrigger: { trigger: q('[data-heading]')[0], start: 'top 85%' } });
      if (!reducedMotion) {
        q('[data-rule]').forEach((el) => {
          riseChars(el.querySelector('h3')!, { scrollTrigger: { trigger: el, start: 'top 75%' }, stagger: 0.018 });
          gsap.from(el.querySelectorAll('[data-in]'), { y: 40, autoAlpha: 0, duration: 1.6, stagger: 0.12, scrollTrigger: { trigger: el, start: 'top 70%' } });
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
      <header className="relative z-[3] bg-ink px-5 pt-[16vh] pb-[10vh] md:px-10">
        <div className="label mb-10 flex justify-between gap-6 text-mute">
          <span>(03) How a door gets built</span>
          <span>Five rules</span>
        </div>
        <h2 id="method-title" data-heading className="display text-[clamp(2.9rem,10.4vw,11.5rem)]">
          <span className="block">Five rules,</span>
          <span className="text-outline block text-[var(--accent)]">every time.</span>
        </h2>
      </header>

      <div ref={grid} className="relative lg:grid lg:grid-cols-2">
        <div ref={stage} className="relative h-[72svh] overflow-hidden lg:h-screen">
          {/* Under the canvas: the door stands in front of the number. */}
          <p
            aria-hidden="true"
            className="display text-outline pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[clamp(14rem,30vw,32rem)] text-bone/25 tabular-nums select-none"
          >
            0{active + 1}
          </p>
          <div className="absolute inset-x-[8%] top-[8%] bottom-[16%] z-[2]">
            <PortalAnchor className="h-full w-full" caption={false} />
          </div>
          <div className="pointer-events-none absolute inset-x-5 bottom-6 z-[3] flex items-end justify-between gap-6 md:inset-x-10 md:bottom-9">
            <ol className="flex gap-1.5" aria-hidden="true">
              {RULES.map((r, i) => (
                <li
                  key={r.title}
                  className="h-1 w-8 rounded-full transition-colors duration-700"
                  style={{ background: i === active ? current.tone : 'rgb(239 234 227 / 0.16)' }}
                />
              ))}
            </ol>
            <p className="label text-right text-mute">
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
                <p data-in className="label mb-6 flex items-center gap-3 text-mute">
                  <span className="h-2 w-2 rounded-full" style={{ background: p.tone }} />
                  Rule {String(i + 1).padStart(2, '0')} / {String(RULES.length).padStart(2, '0')}
                </p>
                <h3 className="display mb-8 text-[clamp(2.4rem,4.6vw,5rem)]">{r.title}</h3>
                <p data-in className="max-w-[34rem] text-[1.06rem] leading-relaxed text-mute">
                  {r.body}
                </p>
                <a data-in href={workHref(p.slug)} data-cursor="Read" className="label mt-10 self-start py-2" style={{ color: p.tone }}>
                  <Roll text={`The story of ${p.title} →`} />
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
