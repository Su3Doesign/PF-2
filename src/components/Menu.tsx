import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, reducedMotion, scrollToTarget } from '../lib/motion';
import { profile, projects } from '../data/projects';
import { workHref } from '../lib/useHashRoute';
import Roll from './kit/Roll';

const SECTIONS = [
  ['Index', '#top'],
  ['Method', '#method'],
  ['Worlds', '#worlds'],
  ['Shelf', '#shelf'],
  ['Ask', '#ask'],
  ['Contact', '#contact'],
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  onAsk: () => void;
}

/**
 * The full-screen menu: sections in giant type on the left, every site on the right with
 * its picture opening in a frame as you hover the name.
 */
export default function Menu({ open, onClose, onAsk }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [peek, setPeek] = useState(0);

  useGSAP(
    () => {
      const el = root.current!;
      const q = gsap.utils.selector(el);
      const d = reducedMotion ? 0 : 1;
      if (open) {
        gsap.set(el, { display: 'block' });
        gsap
          .timeline()
          .fromTo(el, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1 * d, ease: 'expo.inOut' })
          .fromTo(q('[data-big]'), { yPercent: 110 }, { yPercent: 0, duration: 1.3 * d, stagger: 0.05, ease: 'expo.out' }, 0.45 * d)
          .fromTo(q('[data-in]'), { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1 * d, stagger: 0.03 }, 0.6 * d);
      } else if (el.style.display === 'block') {
        gsap.to(el, {
          clipPath: 'inset(100% 0% 0% 0%)',
          duration: 0.9 * d,
          ease: 'expo.inOut',
          onComplete: () => void gsap.set(el, { display: 'none' }),
        });
      }
    },
    { dependencies: [open] },
  );

  useEffect(() => {
    if (!open) return;
    const el = root.current!;
    el.querySelector<HTMLElement>('a, button')?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const f = el.querySelectorAll<HTMLElement>('a[href], button');
      if (e.shiftKey && document.activeElement === f[0]) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
        e.preventDefault();
        f[0].focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open, onClose]);

  const go = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    onClose();
    if (href === '#ask') window.setTimeout(onAsk, 500);
    else window.setTimeout(() => scrollToTarget(href), 350);
  };

  return (
    <div
      ref={root}
      id="menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      data-lenis-prevent
      className="fixed inset-0 z-[71] hidden overflow-y-auto bg-ink"
      style={{ clipPath: 'inset(0% 0% 100% 0%)' }}
    >
      <div className="grid min-h-full gap-12 px-5 pt-28 pb-8 md:grid-cols-[1.25fr_1fr] md:px-10 md:pt-32">
        <nav aria-label="Menu sections">
          <ol>
            {SECTIONS.map(([name, href], i) => (
              <li key={href} className="overflow-hidden border-b border-line">
                <a href={href} onClick={(e) => go(e, href)} className="group flex items-baseline gap-5 py-1">
                  <span data-in className="label w-8 text-mute">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span data-big className="display block text-[clamp(3rem,8.4vw,8.6rem)] transition-colors duration-500 group-hover:text-[var(--accent)]">
                    <Roll text={name} />
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-8">
          <div data-in className="relative hidden aspect-[16/10] overflow-hidden rounded-2xl bg-ink-2 md:block" aria-hidden="true">
            {projects.map((p, i) => (
              <img
                key={p.slug}
                src={p.cover.src}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-[clip-path,scale] duration-700 ease-[var(--ease-door)]"
                style={{ clipPath: i === peek ? 'inset(0% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)', scale: i === peek ? '1' : '1.15' }}
              />
            ))}
            <span className="label absolute bottom-4 left-4 rounded-full bg-ink/60 px-3 py-1.5 backdrop-blur-md">{projects[peek].title}</span>
          </div>
          <div>
            <p data-in className="label mb-4 text-mute">
              All {projects.length} sites
            </p>
            <ul className="columns-1 gap-8 sm:columns-2">
              {projects.map((p, i) => (
                <li key={p.slug} data-in className="break-inside-avoid">
                  <a
                    href={workHref(p.slug)}
                    onClick={onClose}
                    onPointerEnter={() => setPeek(i)}
                    onFocus={() => setPeek(i)}
                    className="title flex items-center gap-3 py-1.5 text-[1.05rem] font-medium text-mute transition-colors duration-300 hover:text-bone focus-visible:text-bone"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: p.tone }} aria-hidden="true" />
                    <Roll text={p.title} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div data-in className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-line pt-6">
            <a href={`mailto:${profile.email}`} className="title text-lg font-medium">
              <Roll text={profile.email} />
            </a>
            <ul className="flex gap-5">
              {profile.links.map(([name, href]) => (
                <li key={name}>
                  <a href={href} target="_blank" rel="noopener" className="label text-mute hover:text-bone">
                    <Roll text={name} />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
