import { useEffect, useRef } from 'react';
import { reducedMotion } from '../../lib/motion';

interface Props {
  src: string;
  poster?: string;
  className?: string;
  label?: string;
}

/**
 * A muted loop that only downloads when it comes near the screen and only plays while it is
 * on it. Under reduced motion it stays on its poster frame.
 */
export default function InViewVideo({ src, poster, className = '', label }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current!;
    if (reducedMotion) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!v.src) v.src = src;
          v.play().catch(() => {});
        } else v.pause();
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [src]);

  return <video ref={ref} poster={poster} muted loop playsInline preload="none" aria-label={label} className={className} />;
}
