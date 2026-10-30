import { useEffect, useRef, type MouseEvent } from 'react';
import { scrollToTarget } from '../lib/motion';
import { profile } from '../data/projects';
import Roll from './kit/Roll';
import Magnetic from './kit/Magnetic';

const LINKS = [
  ['Worlds', '#worlds'],
  ['Clients', '#clients'],
  ['Library', '#library'],
  ['Sites', '#shelf'],
] as const;

const clock = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'Asia/Kolkata',
});

interface Props {
  onAsk: () => void;
  menuOpen: boolean;
  onMenu: () => void;
}

export default function Nav({ onAsk, menuOpen, onMenu }: Props) {
  const time = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      if (time.current) time.current.textContent = clock.format(new Date());
    };
    tick();
    const id = window.setInterval(tick, 1000);
    const progress = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    };
    progress();
    window.addEventListener('scroll', progress, { passive: true });
    return () => {
      clearInterval(id);
      window.removeEventListener('scroll', progress);
    };
  }, []);

  const go = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    if (href === '#ask') onAsk();
    else scrollToTarget(href);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-[72]">
      <div className="flex items-center justify-between gap-6 px-5 py-4 md:px-10 md:py-5">
        <a href="#top" onClick={(e) => go(e, '#top')} className="flex items-center gap-4 mix-blend-difference">
          <span className="display text-[1.35rem] tracking-[-0.03em]">Sumanth®</span>
          <span className="label hidden text-bone/60 lg:inline">Worlds &amp; websites</span>
        </a>

        <p className="label hidden items-center gap-2 text-bone/70 mix-blend-difference lg:flex" aria-label="Time in Hyderabad">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)] motion-reduce:animate-none" aria-hidden="true" />
          Open to remote · HYD <span ref={time} className="text-bone tabular-nums" />
        </p>

        <nav aria-label="Sections" className="flex items-center gap-2">
          {LINKS.map(([name, href]) => (
            <a key={href} href={href} onClick={(e) => go(e, href)} className="label hidden px-3 py-3 text-bone mix-blend-difference xl:inline-block">
              <Roll text={name} />
            </a>
          ))}
          <a
            href={profile.resume}
            target="_blank"
            rel="noopener"
            data-cursor="Résumé"
            className="label ml-1 hidden h-11 items-center rounded-full border border-bone/30 px-5 text-bone backdrop-blur-md transition-colors duration-500 hover:border-bone sm:flex"
          >
            <Roll text="Résumé ↗" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <Magnetic strength={0.25}>
            <button
              type="button"
              onClick={onMenu}
              aria-expanded={menuOpen}
              aria-controls="menu"
              className="label ml-2 flex h-11 items-center gap-3 rounded-full bg-bone pr-2 pl-5 text-ink"
            >
              <Roll text={menuOpen ? 'Close' : 'Menu'} />
              <span className="relative h-7 w-7 rounded-full bg-ink" aria-hidden="true">
                <span className={`absolute left-1/2 h-px w-3 -translate-x-1/2 bg-bone transition-all duration-500 ${menuOpen ? 'top-1/2 rotate-45' : 'top-[calc(50%-3px)]'}`} />
                <span className={`absolute left-1/2 h-px w-3 -translate-x-1/2 bg-bone transition-all duration-500 ${menuOpen ? 'top-1/2 -rotate-45' : 'top-[calc(50%+3px)]'}`} />
              </span>
            </button>
          </Magnetic>
        </nav>
      </div>
      <div ref={bar} className="h-px origin-left bg-[var(--accent)]" style={{ transform: 'scaleX(0)' }} />
    </header>
  );
}
