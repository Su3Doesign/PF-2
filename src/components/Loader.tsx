import { useEffect, useRef } from 'react';
import { gsap, reducedMotion } from '../lib/motion';

interface Props {
  onDone: () => void;
}

const STATUS = ['Loading worlds', 'Lighting the door', 'Opening'];
// The arch's outline, in a 120 × 176 box: the door the page opens through.
const ARCH = 'M8 172 V60 A52 52 0 0 1 112 60 V172';

/**
 * Counts to 100 against real work (fonts and the first door image), never faster than
 * 1.8 s, never longer than 4.5 s. Meanwhile an arch draws itself; then the screen splits
 * down the middle and opens like a pair of doors.
 */
export default function Loader({ onDone }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const status = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current!;
    const q = gsap.utils.selector(el);
    const counter = { v: 0 };
    const paint = () => {
      if (count.current) count.current.textContent = String(Math.round(counter.v)).padStart(3, '0');
      const path = el.querySelector<SVGPathElement>('[data-arch]');
      if (path) path.style.strokeDashoffset = String(1 - counter.v / 100);
    };
    const ready = Promise.race([
      Promise.all([
        document.fonts.ready,
        new Promise<void>((res) => {
          const img = new Image();
          img.onload = img.onerror = () => res();
          img.src = 'work/overgrown-archive/cover.webp';
        }),
      ]),
      new Promise((res) => setTimeout(res, 4500)),
    ]);

    if (reducedMotion) {
      ready.then(() => gsap.to(el, { autoAlpha: 0, duration: 0.4, onComplete: onDone }));
      return;
    }

    const say = (i: number) => gsap.to(status.current, { duration: 0.9, scrambleText: { text: STATUS[i], chars: 'upperCase', speed: 0.5 } });
    const intro = gsap.timeline();
    intro
      .from(q('[data-rise]'), { yPercent: 110, duration: 1.4, stagger: 0.08, ease: 'expo.out' }, 0)
      .add(() => void say(0), 0.2)
      .to(counter, { v: 72, duration: 1.8, ease: 'power2.out', onUpdate: paint }, 0)
      .add(() => void say(1), 1.1);

    let cancelled = false;
    Promise.all([ready, intro.then()]).then(() => {
      if (cancelled) return;
      say(2);
      gsap
        .timeline({ onComplete: onDone })
        .to(counter, { v: 100, duration: 0.7, ease: 'power2.inOut', onUpdate: paint })
        .to(q('[data-seam]'), { scaleY: 1, opacity: 1, duration: 0.6, ease: 'expo.out' }, '-=0.2')
        .to(q('[data-rise]'), { yPercent: -110, duration: 0.9, stagger: 0.04, ease: 'expo.in' }, '<')
        .to(q('[data-arch-wrap]'), { scale: 1.6, opacity: 0, duration: 1, ease: 'expo.in' }, '<')
        .to(q('[data-half="l"]'), { xPercent: -100, duration: 1.5, ease: 'expo.inOut' }, '-=0.3')
        .to(q('[data-half="r"]'), { xPercent: 100, duration: 1.5, ease: 'expo.inOut' }, '<')
        .to(q('[data-seam]'), { opacity: 0, duration: 0.4 }, '<0.2');
    });
    return () => {
      cancelled = true;
      intro.kill();
    };
  }, [onDone]);

  return (
    <div ref={root} role="status" aria-label="Loading" className="fixed inset-0 z-[80] overflow-hidden">
      <div data-half="l" className="absolute inset-y-0 left-0 w-1/2 bg-ink" />
      <div data-half="r" className="absolute inset-y-0 right-0 w-1/2 bg-ink" />
      <div
        data-seam
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 scale-y-0 bg-[var(--accent)] opacity-0 shadow-[0_0_24px_4px_var(--accent)]"
      />

      <div className="absolute inset-0 flex flex-col justify-between p-5 md:p-10" aria-hidden="true">
        <div className="label flex justify-between overflow-hidden text-mute">
          <span data-rise className="block">
            Sumanth® — Front doors
          </span>
          <span data-rise className="block text-bone">
            <span ref={status}>&nbsp;</span>
          </span>
        </div>

        <div data-arch-wrap className="absolute top-1/2 left-1/2 w-[22vmin] -translate-x-1/2 -translate-y-1/2">
          <svg viewBox="0 0 120 176" className="w-full overflow-visible">
            <path d={ARCH} fill="none" stroke="rgb(239 234 227 / 0.12)" strokeWidth="1.5" />
            <path
              data-arch
              d={ARCH}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset="1"
              style={{ filter: 'drop-shadow(0 0 8px var(--accent))' }}
            />
          </svg>
        </div>

        <div className="flex items-end justify-between overflow-hidden">
          <span data-rise className="display block text-[clamp(5rem,24vw,22rem)] leading-[0.78] tabular-nums">
            <span ref={count}>000</span>
          </span>
          <span data-rise className="label block pb-2 text-mute">
            Worlds first
            <br />
            Websites second
          </span>
        </div>
      </div>
    </div>
  );
}
