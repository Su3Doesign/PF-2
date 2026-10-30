import { useEffect, useRef } from 'react';
import { gsap, reducedMotion } from '../lib/motion';

/**
 * A dot that is the pointer and a ring that follows it slowly. Elements with
 * data-cursor="Label" swell the ring and print the label. Fine pointers only.
 */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;
    const html = document.documentElement;
    html.classList.add('has-cursor');

    const d = dot.current!;
    const r = ring.current!;
    gsap.set([d, r], { xPercent: -50, yPercent: -50, autoAlpha: 0 });
    const dx = gsap.quickTo(d, 'x', { duration: 0.08, ease: 'power3' });
    const dy = gsap.quickTo(d, 'y', { duration: 0.08, ease: 'power3' });
    const rx = gsap.quickTo(r, 'x', { duration: 0.7, ease: 'expo.out' });
    const ry = gsap.quickTo(r, 'y', { duration: 0.7, ease: 'expo.out' });

    let current: Element | null = null;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      gsap.to([d, r], { autoAlpha: 1, duration: 0.4, overwrite: 'auto' });
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);

      const t = (e.target as Element).closest('[data-cursor], a, button, [role="button"], input, textarea');
      if (t === current) return;
      current = t;
      const text = t?.getAttribute('data-cursor') ?? '';
      const typing = t?.matches('input, textarea');
      label.current!.textContent = text;
      gsap.to(r, {
        width: text ? 84 : t ? 48 : 34,
        height: text ? 84 : t ? 48 : 34,
        backgroundColor: text ? 'var(--accent)' : 'rgba(0,0,0,0)',
        borderColor: text ? 'var(--accent)' : 'rgba(236,231,223,0.45)',
        autoAlpha: typing ? 0 : 1,
        duration: 0.6,
        ease: 'expo.out',
      });
      gsap.to(d, { scale: text ? 0 : 1, autoAlpha: typing ? 0 : 1, duration: 0.4 });
    };
    const leave = () => gsap.to([d, r], { autoAlpha: 0, duration: 0.3 });
    const press = () => gsap.to(r, { scale: 0.85, duration: 0.3 });
    const lift = () => gsap.to(r, { scale: 1, duration: 0.9, ease: 'expo.out' });

    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    window.addEventListener('pointerdown', press);
    window.addEventListener('pointerup', lift);
    return () => {
      html.classList.remove('has-cursor');
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      window.removeEventListener('pointerdown', press);
      window.removeEventListener('pointerup', lift);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] hidden [@media(pointer:fine)]:block">
      <div
        ref={ring}
        className="fixed top-0 left-0 flex h-[34px] w-[34px] items-center justify-center rounded-full border border-bone/45 opacity-0"
      >
        <span ref={label} className="label text-[0.625rem] text-ink" />
      </div>
      <div ref={dot} className="fixed top-0 left-0 h-[6px] w-[6px] rounded-full bg-bone opacity-0 mix-blend-difference" />
    </div>
  );
}
