import { useEffect, useRef, type MouseEvent } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, reducedMotion, scrollToTarget } from '../lib/motion';
import { profile } from '../data/projects';
import { about } from '../data/work';
import InViewVideo from './kit/InViewVideo';
import Roll from './kit/Roll';

const SECTIONS = [
  ['Index', '#top'],
  ['About', '#about'],
  ['Worlds', '#worlds'],
  ['Method', '#method'],
  ['Clients', '#clients'],
  ['Library', '#library'],
  ['Sites', '#shelf'],
  ['Commissions', '#commissions'],
  ['Contact', '#contact'],
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

/** The full-screen menu: every section in big type, the résumé one tap away, the desk on loop. */
export default function Menu({ open, onClose }: Props) {
  const root = useRef<HTMLDivElement>(null);

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
          .fromTo(q('[data-big]'), { yPercent: 110 }, { yPercent: 0, duration: 1.3 * d, stagger: 0.04, ease: 'expo.out' }, 0.45 * d)
          .fromTo(q('[data-in]'), { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1 * d, stagger: 0.05 }, 0.6 * d);
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
    window.setTimeout(() => scrollToTarget(href), 350);
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
      <div className="grid min-h-full gap-12 px-5 pt-28 pb-8 md:grid-cols-[1.3fr_1fr] md:px-10 md:pt-32">
        <nav aria-label="Menu sections">
          <ol>
            {SECTIONS.map(([name, href], i) => (
              <li key={href} className="overflow-hidden border-b border-line">
                <a href={href} onClick={(e) => go(e, href)} className="group flex items-baseline gap-5 py-1">
                  <span data-in className="label w-8 text-mute">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span data-big className="display block text-[clamp(2.4rem,5.6vw,5.8rem)] transition-colors duration-500 group-hover:text-[var(--accent)]">
                    <Roll text={name} />
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-6">
          <a
            data-in
            href={profile.resume}
            target="_blank"
            rel="noopener"
            className="group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] bg-[var(--accent)] p-7 text-ink md:min-h-[16rem]"
          >
            <span className="label">2026 · PDF · experience, education, tools</span>
            <span className="display mt-10 text-[clamp(3rem,6vw,5.6rem)]">
              <Roll text="Résumé ↗" />
            </span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>

          {about.desk && (
            <figure data-in className="flex items-center gap-5">
              <InViewVideo
                src={about.desk}
                poster="v1/assets/posters/desk-hero.webp"
                label="Sumanth's desk"
                className="aspect-[4/3] w-40 shrink-0 rounded-2xl object-cover"
              />
              <figcaption className="label leading-relaxed text-mute">
                {profile.city}
                <br />
                <span className="text-bone">Open to remote · open for commissions</span>
              </figcaption>
            </figure>
          )}

          <div data-in className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-line pt-6">
            <a href={`mailto:${profile.email}`} className="title text-lg">
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
