import { useEffect, useRef, type MouseEvent } from 'react';
import { scrollToTarget } from '../lib/motion';

const LINKS = [
  ['Worlds', '#worlds'],
  ['Shelf', '#shelf'],
  ['Ask', '#ask'],
  ['Contact', '#contact'],
] as const;

const clock = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'Asia/Kolkata',
});

export default function Nav({ onAsk }: { onAsk: () => void }) {
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
    <header className="fixed inset-x-0 top-0 z-[70] mix-blend-difference">
      <div className="flex items-center justify-between gap-6 px-5 py-4 md:px-10 md:py-6">
        <a href="#top" onClick={(e) => go(e, '#top')} className="flex items-baseline gap-3">
          <span className="display text-2xl italic">Sumanth</span>
          <span className="label hidden text-mute sm:inline">Front doors · 13 sites</span>
        </a>
        <nav aria-label="Sections" className="flex items-center gap-1 md:gap-2">
          {LINKS.map(([name, href]) => (
            <a
              key={href}
              href={href}
              onClick={(e) => go(e, href)}
              className="label link-sweep hidden px-2 py-3 text-bone sm:inline-block"
            >
              {name}
            </a>
          ))}
          <a href="#contact" onClick={(e) => go(e, '#contact')} className="label px-2 py-3 text-bone sm:hidden">
            Contact
          </a>
          <span className="label hidden pl-4 text-mute lg:inline" aria-label="Time in Hyderabad">
            HYD <span ref={time} className="text-bone tabular-nums" />
          </span>
        </nav>
      </div>
      <div ref={bar} className="h-px origin-left bg-bone/60" style={{ transform: 'scaleX(0)' }} />
    </header>
  );
}
