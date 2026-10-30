import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger, reducedMotion, riseChars, scrollState } from '../lib/motion';
import { reelIndexOfStep, steps } from '../data/work';
import { openLightbox } from '../lib/lightbox';
import PortalAnchor from './portal/PortalAnchor';
import Roll from './kit/Roll';

/**
 * The seven moves, in order. The door holds still on the left while they scroll past on the
 * right, and at each one it shows the piece of work where that move is easiest to see: the
 * clay pass at Blockout, the extinguisher at Texture, the late room at Light.
 */
export default function Process() {
  const root = useRef<HTMLElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const set = (i: number) => {
        scrollState.showing = reelIndexOfStep(i);
        scrollState.tone = null;
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
        onEnterBack: () => set(steps.length - 1),
        onLeave: clear,
        onLeaveBack: clear,
      });
      q('[data-rule]').forEach((el, i) => {
        ScrollTrigger.create({ trigger: el, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => s.isActive && set(i) });
      });

      // The door holds still on the left while the moves scroll past on the right.
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

  const current = steps[active];

  return (
    <section ref={root} id="method" aria-labelledby="method-title" className="relative">
      <header className="relative z-[3] bg-ink px-5 pt-[16vh] pb-[10vh] md:px-10">
        <div className="label mb-10 flex justify-between gap-6 text-mute">
          <span>(04) Method · 七手</span>
          <span>Reference → Comp</span>
        </div>
        <h2 id="method-title" data-heading className="display text-[clamp(2.9rem,10.4vw,11.5rem)]">
          <span className="block">Seven moves,</span>
          <span className="text-outline block text-[var(--accent)]">every single time.</span>
        </h2>
        <p className="mt-10 max-w-[34rem] text-[1.08rem] leading-relaxed text-mute">
          In order. Skipping one shows up in the render three weeks later.
        </p>
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
              {steps.map((s, i) => (
                <li
                  key={s.name}
                  className="h-1 w-6 rounded-full transition-colors duration-700"
                  style={{ background: i === active ? 'var(--accent)' : 'rgb(239 234 227 / 0.16)' }}
                />
              ))}
            </ol>
            <p className="label text-right text-mute">
              In the door
              <br />
              <span className="text-bone">{current.caption}</span>
            </p>
          </div>
        </div>

        <ol className="relative z-[3] px-5 md:px-10 lg:py-[26vh]">
          {steps.map((s, i) => (
            <li key={s.name} data-rule className="flex min-h-[64svh] flex-col justify-center border-t border-line py-14 lg:min-h-[78vh]">
              <p data-in className="label mb-6 flex items-center gap-3 text-mute">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                Move {String(i + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
              </p>
              <h3 className="display mb-8 text-[clamp(2.6rem,5vw,5.6rem)]">{s.name}</h3>
              <p data-in className="title max-w-[30rem] text-[clamp(1.25rem,1.9vw,1.7rem)] leading-snug text-bone/90">
                {s.text}
              </p>
              <button
                data-in
                type="button"
                onClick={() => openLightbox([{ ...s.media, caption: s.caption }], 0, s.name)}
                data-cursor="View"
                className="label mt-10 flex items-center gap-4 self-start text-mute hover:text-bone"
              >
                <img src={s.media.thumb} alt="" loading="lazy" className="h-14 w-20 rounded-lg object-cover lg:hidden" />
                <Roll text={`See it in ${s.caption} →`} />
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
