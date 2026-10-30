import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, riseChars, scrollToTarget } from '../lib/motion';
import { profile } from '../data/projects';
import PortalAnchor from './portal/PortalAnchor';
import ProximityWord from './kit/ProximityWord';
import Magnetic from './kit/Magnetic';
import Roll from './kit/Roll';

export function AskInvite({ onAsk }: { onAsk: () => void }) {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const h = root.current!.querySelector('h2')!;
      riseChars(h, { scrollTrigger: { trigger: h, start: 'top 85%' } });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="ask" aria-labelledby="ask-invite" className="relative z-[3] border-t border-line bg-ink px-5 py-[18vh] md:px-10">
      <div className="label mb-10 flex justify-between gap-6 text-mute">
        <span>(09) Ask the archive</span>
        <span>Press / anywhere</span>
      </div>
      <h2 id="ask-invite" className="display text-[clamp(3rem,9vw,10rem)]">
        <span className="block">Don’t want</span>
        <span className="block">
          to scroll? <span className="text-[var(--accent)]">Ask.</span>
        </span>
      </h2>
      <button
        type="button"
        onClick={onAsk}
        data-cursor="Ask"
        className="group mt-14 flex w-full max-w-[52rem] items-center justify-between gap-4 rounded-[1.75rem] border border-line bg-ink-2 py-3 pr-3 pl-7 text-left transition-colors duration-700 hover:border-[var(--accent)]"
      >
        <span className="title text-[clamp(1.05rem,1.8vw,1.5rem)] font-medium text-faint transition-colors duration-700 group-hover:text-bone">
          Which clients have you worked with?
        </span>
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--accent)] text-xl text-ink" aria-hidden="true">
          ↑
        </span>
      </button>
    </section>
  );
}

const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });

export default function Contact() {
  const root = useRef<HTMLElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const [copied, setCopied] = useState(false);

  useGSAP(
    () => {
      const h = root.current!.querySelector('h2')!;
      riseChars(h, { scrollTrigger: { trigger: h, start: 'top 80%' }, stagger: 0.03 });
      gsap.from(root.current!.querySelectorAll('[data-in]'), {
        y: 40,
        autoAlpha: 0,
        duration: 1.6,
        stagger: 0.1,
        scrollTrigger: { trigger: h, start: 'top 60%' },
      });
    },
    { scope: root },
  );

  useEffect(() => {
    const tick = () => {
      if (time.current) time.current.textContent = clock.format(new Date());
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  };

  return (
    <footer ref={root} id="contact" aria-labelledby="contact-title" className="relative overflow-clip">
      <div className="relative min-h-[100svh]">
        <div className="absolute inset-x-0 top-[6vh] z-[2] h-[44vh] md:inset-x-auto md:top-[10vh] md:right-[3vw] md:h-[66vh] md:w-[34vw]">
          <PortalAnchor className="h-full w-full" caption={false} />
        </div>

        <div className="pointer-events-none relative z-[3] flex min-h-[100svh] flex-col justify-end px-5 pt-[54vh] pb-16 md:px-10 md:pt-40">
          <div className="label mb-10 flex flex-wrap justify-between gap-x-6 gap-y-2 text-mute md:max-w-[56vw]">
            <span>(10) The last door is yours</span>
            <span>
              Hyderabad · <span ref={time} />
            </span>
          </div>
          <h2 id="contact-title" className="display text-[clamp(3rem,8.4vw,9.5rem)]">
            <span className="block">Have a place</span>
            <span className="block">that needs</span>
            <span className="block text-[var(--accent)]">a door?</span>
          </h2>

          <div className="pointer-events-auto mt-14 flex flex-wrap items-center gap-3 md:gap-5">
            <a data-in href={`mailto:${profile.email}`} data-cursor="Write" className="basis-full md:basis-auto title text-[clamp(1.35rem,3.2vw,3rem)] font-medium">
              <Roll text={profile.email} />
            </a>
            <span data-in>
              <Magnetic>
                <button
                  type="button"
                  onClick={copy}
                  className="label h-12 rounded-full border border-line px-6 text-mute transition-colors duration-500 hover:border-bone hover:bg-bone hover:text-ink"
                >
                  <span aria-live="polite">{copied ? 'Copied ✓' : 'Copy email'}</span>
                </button>
              </Magnetic>
            </span>
            <span data-in>
              <Magnetic>
                <a
                  href={profile.resume}
                  target="_blank"
                  rel="noopener"
                  data-cursor="Résumé"
                  className="label flex h-12 items-center rounded-full bg-[var(--accent)] px-6 text-ink"
                >
                  <Roll text="Résumé ↗" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </Magnetic>
            </span>
            <span data-in>
              <Magnetic>
                <a
                  href={profile.behance}
                  target="_blank"
                  rel="noopener"
                  data-cursor="Behance"
                  className="label flex h-12 items-center rounded-full border border-bone/30 px-6 text-bone transition-colors duration-500 hover:border-bone hover:bg-bone hover:text-ink"
                >
                  <Roll text="Behance ↗" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </Magnetic>
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-[3] border-t border-line bg-ink">
        <div className="flex flex-col gap-6 px-5 pt-8 md:flex-row md:items-center md:justify-between md:px-10">
          <ul className="flex flex-wrap gap-x-7 gap-y-2">
            {profile.links.map(([name, href]) => (
              <li key={name}>
                <a href={href} target="_blank" rel="noopener" className="label py-2 text-bone">
                  <Roll text={`${name} ↗`} />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
            <li>
              <a href={profile.resume} target="_blank" rel="noopener" className="label py-2 text-[var(--accent)]">
                <Roll text="Résumé ↗" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a href="v1/" className="label py-2 text-bone">
                <Roll text="The first version" />
              </a>
            </li>
          </ul>
          <Magnetic>
            <button type="button" onClick={() => scrollToTarget('#top')} className="label flex h-12 items-center gap-2 rounded-full bg-bone px-6 text-ink">
              <Roll text="Back to the top ↑" />
            </button>
          </Magnetic>
        </div>

        <p className="display mt-6 -mb-[0.04em] overflow-hidden px-2 text-center text-[18.6vw] leading-[0.8] whitespace-nowrap select-none">
          <ProximityWord word="Sumanth" />
        </p>
        <p className="label flex justify-between px-5 pt-4 pb-6 text-faint md:px-10">
          <span>
            © {new Date().getFullYear()} {profile.name}
          </span>
          <span>Front doors · v3</span>
        </p>
      </div>
    </footer>
  );
}
