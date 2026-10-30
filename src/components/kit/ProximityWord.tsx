import { useEffect, useRef } from 'react';
import { gsap, reducedMotion } from '../../lib/motion';

interface Props {
  word: string;
  className?: string;
  /** Weight far from the pointer, and right under it (Clash Display runs 200–700). */
  heavy?: number;
  light?: number;
  /** How far, in px, the pointer's pull reaches. */
  reach?: number;
}

/**
 * A word whose letters thin out to a hairline where the pointer passes, then fill back in
 * behind it, on Clash Display's weight axis.
 */
export default function ProximityWord({ word, className = '', heavy = 600, light = 200, reach = 300 }: Props) {
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;
    const letters = Array.from(root.current!.querySelectorAll<HTMLElement>('[data-l]'));
    const now = letters.map(() => heavy);
    const want = letters.map(() => heavy);
    let px = -9999;
    let py = -9999;
    let active = false;

    const move = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      active = true;
    };
    // Only measures while the pointer moves or letters are still settling.
    const tick = () => {
      if (!active) return;
      let busy = false;
      letters.forEach((l, i) => {
        const r = l.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        const t = Math.max(0, 1 - d / reach);
        want[i] = heavy - (heavy - light) * t * t * (3 - 2 * t);
        const next = now[i] + (want[i] - now[i]) * 0.12;
        if (Math.abs(next - now[i]) > 0.5) {
          now[i] = next;
          l.style.fontWeight = String(Math.round(next));
          busy = true;
        }
      });
      if (!busy) active = false;
    };
    window.addEventListener('pointermove', move, { passive: true });
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener('pointermove', move);
      gsap.ticker.remove(tick);
    };
  }, [heavy, light, reach]);

  return (
    <span ref={root} className={className} aria-label={word} role="img">
      {Array.from(word).map((c, i) => (
        <span key={i} data-l aria-hidden="true" className="inline-block" style={{ fontWeight: heavy }}>
          {c}
        </span>
      ))}
    </span>
  );
}
