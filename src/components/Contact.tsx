import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, reducedMotion } from '../lib/motion';
import { profile } from '../data/projects';
import PortalAnchor from './portal/PortalAnchor';

export function AskInvite({ onAsk }: { onAsk: () => void }) {
  return (
    <section id="ask" aria-labelledby="ask-invite" className="relative z-[3] border-t border-line bg-ink px-5 py-[18vh] md:px-10">
      <p className="label mb-6 text-mute">( Ask the archive )</p>
      <h2 id="ask-invite" className="display max-w-[18ch] text-[clamp(2.4rem,5.4vw,5.4rem)]">
        Don’t want to scroll? <em className="text-[var(--accent)]">Just ask.</em>
      </h2>
      <button
        type="button"
        onClick={onAsk}
        data-cursor="Ask"
        className="group mt-12 flex w-full max-w-[44rem] items-center justify-between gap-4 rounded-2xl border border-line bg-ink-2 px-6 py-5 text-left transition-colors duration-700 hover:border-bone/40"
      >
        <span className="text-lg text-faint transition-colors duration-700 group-hover:text-mute">Which site has a 3D world behind it?</span>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-bone text-ink" aria-hidden="true">
          ↑
        </span>
      </button>
      <p className="label mt-4 text-faint">Opens a quiet chat panel · press / anywhere</p>
    </section>
  );
}

export default function Contact() {
  const root = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const q = gsap.utils.selector(root);
      gsap.from(q('.rise > span'), {
        yPercent: 105,
        duration: 1.8,
        stagger: 0.12,
        scrollTrigger: { trigger: root.current, start: 'top 70%' },
      });
    },
    { scope: root },
  );

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
    <footer ref={root} id="contact" aria-labelledby="contact-title" className="relative min-h-[100svh] overflow-clip bg-transparent">
      <div className="absolute inset-x-0 top-[6vh] z-[2] h-[46vh] md:inset-x-auto md:top-[10vh] md:right-[4vw] md:h-[62vh] md:w-[36vw]">
        <PortalAnchor className="h-full w-full" caption={false} />
      </div>

      <div className="pointer-events-none relative z-[3] flex min-h-[100svh] flex-col justify-end px-5 pt-[56vh] pb-8 md:px-10 md:pt-40 md:pb-10">
        <p className="label mb-8 text-mute">( The last door is yours )</p>
        <h2 id="contact-title" className="display max-w-[12ch] text-[clamp(3rem,8.5vw,9rem)]">
          <span className="rise">
            <span>Have a place</span>
          </span>
          <span className="rise">
            <span>
              that needs <em className="text-[var(--accent)]">a door?</em>
            </span>
          </span>
        </h2>

        <div className="pointer-events-auto mt-12 flex flex-col gap-6 md:flex-row md:items-center">
          <a href={`mailto:${profile.email}`} data-cursor="Write" className="display link-sweep self-start text-[clamp(1.6rem,3.6vw,3.2rem)] italic">
            {profile.email}
          </a>
          <button
            type="button"
            onClick={copy}
            className="label min-h-11 self-start rounded-full border border-line px-5 text-mute transition-colors duration-500 hover:border-bone hover:text-bone md:self-auto"
          >
            <span aria-live="polite">{copied ? 'Copied' : 'Copy email'}</span>
          </button>
        </div>

        <div className="pointer-events-auto mt-20 flex flex-col gap-6 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {profile.links.map(([name, href]) => (
              <li key={name}>
                <a href={href} target="_blank" rel="noopener" className="label link-sweep py-2 text-bone">
                  {name} ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
            <li>
              <a href="v1/" className="label link-sweep py-2 text-bone">
                The first version
              </a>
            </li>
          </ul>
          <p className="label text-faint">
            © {new Date().getFullYear()} {profile.name} · {profile.city}
          </p>
        </div>
      </div>
    </footer>
  );
}
