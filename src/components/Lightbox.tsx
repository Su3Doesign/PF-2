import { useEffect, useRef } from 'react';
import { gsap, reducedMotion } from '../lib/motion';
import { closeLightbox, stepLightbox, useLightbox } from '../lib/lightbox';
import Roll from './kit/Roll';

/** Full-screen viewer for any list of images and films. Arrows, swipe, Escape. */
export default function Lightbox() {
  const state = useLightbox();
  const open = Boolean(state);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const touch = useRef(0);

  useEffect(() => {
    if (!open || !root.current) return;
    const el = root.current;
    const before = document.activeElement as HTMLElement | null;
    el.querySelector<HTMLElement>('[data-close]')?.focus({ preventScroll: true });
    if (!reducedMotion) gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' });
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowRight') stepLightbox(1);
      else if (e.key === 'ArrowLeft') stepLightbox(-1);
      else if (e.key === 'Tab') {
        const f = el.querySelectorAll<HTMLElement>('button, video[controls]');
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      before?.focus?.({ preventScroll: true });
    };
    // Only opening moves focus; stepping through items leaves it where it is.
  }, [open]);

  // Each new item rises in.
  useEffect(() => {
    if (!state || reducedMotion || !stage.current) return;
    gsap.fromTo(stage.current, { y: 30, autoAlpha: 0, scale: 0.98 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.8, ease: 'expo.out' });
  }, [state]);

  if (!state) return null;
  const item = state.items[state.index];
  const many = state.items.length > 1;

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={`${state.title}: ${item.caption ?? item.label ?? item.name ?? ''}`}
      data-lenis-prevent
      className="fixed inset-0 z-[85] flex flex-col bg-ink/95 backdrop-blur-xl"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) stepLightbox(dx < 0 ? 1 : -1);
      }}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4 md:px-10">
        <p className="label text-mute">
          <span className="text-bone">{state.title}</span>
          {many && (
            <span className="ml-3 tabular-nums">
              {String(state.index + 1).padStart(2, '0')} / {String(state.items.length).padStart(2, '0')}
            </span>
          )}
        </p>
        <button data-close type="button" onClick={closeLightbox} className="label flex h-11 items-center rounded-full bg-bone px-5 text-ink">
          <Roll text="Close" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4 md:px-24">
        <div ref={stage} key={item.src} className="flex h-full w-full items-center justify-center">
          {item.type === 'video' ? (
            <video
              src={item.src}
              poster={item.poster}
              controls
              autoPlay
              muted
              loop
              playsInline
              className="max-h-full max-w-full rounded-xl"
            />
          ) : (
            <img src={item.src} alt={item.caption ?? item.label ?? item.name ?? ''} decoding="async" className="max-h-full max-w-full rounded-xl object-contain" />
          )}
        </div>
        {many && (
          <>
            <button
              type="button"
              onClick={() => stepLightbox(-1)}
              aria-label="Previous"
              className="absolute top-1/2 left-3 hidden h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-line text-lg text-bone transition-colors hover:border-bone hover:bg-bone hover:text-ink md:grid"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => stepLightbox(1)}
              aria-label="Next"
              className="absolute top-1/2 right-3 hidden h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-line text-lg text-bone transition-colors hover:border-bone hover:bg-bone hover:text-ink md:grid"
            >
              →
            </button>
          </>
        )}
      </div>

      <p className="label px-5 pb-5 text-center text-mute md:px-10" aria-live="polite">
        {item.caption ?? [item.label ?? item.name, item.kind].filter(Boolean).join(' · ')}
        {many && <span className="ml-3 hidden text-faint md:inline">← → to browse · Esc to close</span>}
      </p>
    </div>
  );
}
