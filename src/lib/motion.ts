import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);
gsap.defaults({ ease: 'expo.out', duration: 1.4 });

export { gsap, ScrollTrigger };

export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Values the WebGL door reads every frame. They live outside React on purpose:
 * scroll-driven numbers would otherwise re-render the tree 60 times a second.
 */
export const scrollState = {
  /** 0 at the top of the page, 1 at the bottom. */
  progress: 0,
  /** Lenis velocity, roughly pixels per frame. */
  velocity: 0,
  /** Index into `projects` the door should show, or -1 to let it cycle. */
  showing: -1,
  /** A project's tone the light leans toward while the process chapter is pinned. */
  tone: null as string | null,
};

let lenis: Lenis | null = null;

export function startSmoothScroll() {
  if (lenis || reducedMotion) {
    const onNative = () => updateProgress(window.scrollY, 0);
    window.addEventListener('scroll', onNative, { passive: true });
    return () => window.removeEventListener('scroll', onNative);
  }

  // Slow and heavy: a long duration with an exponential settle.
  lenis = new Lenis({
    duration: 1.5,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    wheelMultiplier: 0.85,
    touchMultiplier: 1.4,
  });

  lenis.on('scroll', (l: Lenis) => {
    ScrollTrigger.update();
    updateProgress(l.scroll, l.velocity);
  });

  const tick = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  return () => {
    gsap.ticker.remove(tick);
    lenis?.destroy();
    lenis = null;
  };
}

export function scrollToTarget(target: string | HTMLElement | number) {
  if (lenis) {
    lenis.scrollTo(target, { duration: 2, offset: 0 });
    return;
  }
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (typeof el === 'number') window.scrollTo({ top: el });
  else el?.scrollIntoView({ block: 'start' });
}

export function pauseScroll(paused: boolean) {
  if (!lenis) {
    document.documentElement.style.overflow = paused ? 'hidden' : '';
    return;
  }
  if (paused) lenis.stop();
  else lenis.start();
}

// UV violet at the top of the page, through ultraviolet magenta, to dawn at the end.
const STOPS: [number, [number, number, number]][] = [
  [0, [139, 107, 255]],
  [0.45, [178, 92, 255]],
  [0.8, [255, 122, 140]],
  [1, [255, 178, 107]],
];

export function accentAt(p: number): [number, number, number] {
  for (let i = 1; i < STOPS.length; i++) {
    const [b, cb] = STOPS[i];
    const [a, ca] = STOPS[i - 1];
    if (p <= b) {
      const t = (p - a) / (b - a);
      return [0, 1, 2].map((k) => Math.round(ca[k] + (cb[k] - ca[k]) * t)) as [number, number, number];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

let lastAccent = '';
function updateProgress(y: number, velocity: number) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollState.progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
  scrollState.velocity = velocity;
  const [r, g, b] = accentAt(scrollState.progress);
  const next = `rgb(${r} ${g} ${b})`;
  if (next !== lastAccent) {
    document.documentElement.style.setProperty('--accent', next);
    lastAccent = next;
  }
}
