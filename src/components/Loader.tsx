import { useEffect, useRef } from 'react';
import { gsap, reducedMotion } from '../lib/motion';

interface Props {
  onDone: () => void;
}

const NAME = 'Sumanth';

/**
 * Counts to 100 against real work (fonts and the first door image), never faster than
 * 1.6 s, never longer than 4 s, then lifts like a shutter.
 */
export default function Loader({ onDone }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current!;
    const counter = { v: 0 };
    const ready = Promise.race([
      Promise.all([
        document.fonts.ready,
        new Promise<void>((res) => {
          const img = new Image();
          img.onload = img.onerror = () => res();
          img.src = 'work/overgrown-archive/cover.webp';
        }),
      ]),
      new Promise((res) => setTimeout(res, 4000)),
    ]);

    if (reducedMotion) {
      ready.then(() => gsap.to(el, { autoAlpha: 0, duration: 0.4, onComplete: onDone }));
      return;
    }

    const tl = gsap.timeline();
    tl.from(el.querySelectorAll('[data-letter]'), { yPercent: 110, duration: 1.6, stagger: 0.06, ease: 'expo.out' }, 0);
    tl.to(counter, {
      v: 82,
      duration: 1.6,
      ease: 'power2.out',
      onUpdate: () => {
        if (count.current) count.current.textContent = String(Math.round(counter.v)).padStart(3, '0');
      },
    }, 0);

    let cancelled = false;
    Promise.all([ready, tl.then()]).then(() => {
      if (cancelled) return;
      gsap
        .timeline({ onComplete: onDone })
        .to(counter, {
          v: 100,
          duration: 0.5,
          ease: 'power1.inOut',
          onUpdate: () => {
            if (count.current) count.current.textContent = String(Math.round(counter.v)).padStart(3, '0');
          },
        })
        .to(el.querySelectorAll('[data-letter]'), { yPercent: -110, duration: 1, stagger: 0.03, ease: 'expo.in' }, '+=0.1')
        .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 1.3, ease: 'expo.inOut' }, '-=0.35');
    });
    return () => {
      cancelled = true;
      tl.kill();
    };
  }, [onDone]);

  return (
    <div
      ref={root}
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink"
      style={{ clipPath: 'inset(0 0 0% 0)' }}
    >
      <p className="display flex overflow-hidden text-[clamp(4rem,14vw,12rem)] italic" aria-hidden="true">
        {NAME.split('').map((c, i) => (
          <span key={i} data-letter className="inline-block">
            {c}
          </span>
        ))}
      </p>
      <div className="label absolute right-6 bottom-6 left-6 flex items-end justify-between text-mute md:right-10 md:bottom-10 md:left-10">
        <span>
          <span ref={count} className="text-bone">
            000
          </span>{' '}
          / 100
        </span>
        <span>Opening the doors…</span>
      </div>
    </div>
  );
}
