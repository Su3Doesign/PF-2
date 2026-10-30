import { useEffect, useRef, type ReactNode } from 'react';
import { gsap, reducedMotion, scrollState } from '../../lib/motion';

interface Props {
  children: ReactNode;
  /** Pixels per second at rest. Scrolling adds to it. */
  speed?: number;
  reverse?: boolean;
  className?: string;
}

/**
 * An endless strip. It drifts at rest, speeds up with the scroll, and turns round
 * when the scroll does.
 */
export default function Marquee({ children, speed = 60, reverse = false, className = '' }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const el = track.current!;
    let x = 0;
    let dir = reverse ? 1 : -1;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(root.current!);

    const tick = (_t: number, deltaMs: number) => {
      if (!visible) return;
      const v = scrollState.velocity;
      if (Math.abs(v) > 0.4) dir = Math.sign(v) * (reverse ? 1 : -1);
      const half = el.scrollWidth / 2;
      x += dir * (speed + Math.min(900, Math.abs(v) * 40)) * (deltaMs / 1000);
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      el.style.transform = `translate3d(${x}px,0,0)`;
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
    };
  }, [speed, reverse]);

  return (
    <div ref={root} className={`overflow-hidden ${className}`}>
      <div ref={track} className="flex w-max will-change-transform">
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
