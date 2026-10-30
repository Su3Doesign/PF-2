import { useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, reducedMotion } from '../lib/motion';
import { projects, type Project } from '../data/projects';
import { closeWork, workHref } from '../lib/useHashRoute';

const CHAPTERS = [
  ['The premise', 'premise'],
  ['The idea', 'idea'],
  ['What I built', 'built'],
  ['The hard part', 'hardPart'],
  ['Where it landed', 'outcome'],
] as const;

/**
 * A case study as a short story: premise, idea, what was built, the hard part, the
 * outcome. It is a dialog over the page with its own scroll, opened at #/work/<slug>.
 */
export default function CaseStudy({ project: p }: { project: Project }) {
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const next = projects[(projects.indexOf(p) + 1) % projects.length];

  // Focus, Escape, a minimal focus trap, and focus handed back on close.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus({ preventScroll: true });
    scroller.current?.scrollTo({ top: 0 });
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeWork();
      if (e.key !== 'Tab' || !root.current) return;
      const f = root.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      before?.focus?.({ preventScroll: true });
    };
  }, [p.slug]);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (reducedMotion) return;
      gsap.fromTo(root.current, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut' });
      gsap.fromTo(q('[data-cover]'), { scale: 1.25 }, { scale: 1, duration: 2.4, ease: 'expo.out', delay: 0.3 });
      gsap.fromTo(q('.rise > span'), { yPercent: 105 }, { yPercent: 0, duration: 1.6, stagger: 0.1, delay: 0.6 });

      const sc = scroller.current!;
      gsap.to(q('[data-cover]'), { yPercent: 18, ease: 'none', scrollTrigger: { scroller: sc, trigger: q('[data-hero]')[0], start: 'top top', end: 'bottom top', scrub: true } });
      q('[data-reveal]').forEach((el) =>
        gsap.from(el, { y: 48, autoAlpha: 0, duration: 1.6, scrollTrigger: { scroller: sc, trigger: el, start: 'top 85%' } }),
      );
      q('[data-shot]').forEach((el) =>
        gsap.fromTo(
          el,
          { clipPath: 'inset(12% 10% 12% 10% round 24px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 16px)', ease: 'none', scrollTrigger: { scroller: sc, trigger: el, start: 'top 95%', end: 'top 35%', scrub: 1 } },
        ),
      );
    },
    { scope: root, dependencies: [p.slug] },
  );

  const titleLines = p.title.split(/:\s/);

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cs-title"
      className="fixed inset-0 z-[75] bg-ink"
      style={{ ['--tone' as string]: p.tone }}
    >
      <div ref={scroller} data-lenis-prevent className="h-full overflow-y-auto overscroll-contain">
        <button
          ref={closeBtn}
          type="button"
          onClick={closeWork}
          className="label fixed top-4 right-4 z-10 rounded-full bg-bone px-5 py-3.5 text-ink md:top-6 md:right-8"
        >
          Close <span className="text-ink/70">Esc</span>
        </button>

        <div data-hero className="relative h-[100svh] overflow-clip">
          <img
            data-cover
            src={p.cover.src}
            alt={p.cover.alt}
            className="absolute inset-0 h-full w-full object-cover"
            width={1920}
            height={1080}
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/20" />
          <div className="absolute inset-x-5 bottom-10 md:inset-x-10 md:bottom-14">
            <p className="label mb-6 text-bone/80">
              <span style={{ color: p.tone }}>●</span> {p.kind === 'Self' ? 'Self-initiated' : p.kind} · {p.year} · {p.role}
            </p>
            <h2 id="cs-title" className="display text-[clamp(3rem,9vw,9rem)]">
              {titleLines.map((l, i) => (
                <span key={i} className="rise">
                  <span className={i ? 'italic' : ''}>{l}</span>
                </span>
              ))}
            </h2>
            <p className="mt-6 max-w-[36rem] text-lg leading-relaxed text-bone/85">{p.line}</p>
          </div>
        </div>

        <div className="mx-auto max-w-[78rem] px-5 md:px-10">
          <dl data-reveal className="grid grid-cols-2 gap-x-6 gap-y-10 border-b border-line py-14 md:grid-cols-4">
            {p.facts.map(([k, v]) => (
              <div key={k} className="flex flex-col-reverse gap-2">
                <dt className="label text-mute">{k}</dt>
                <dd className="display text-[clamp(1.8rem,3.4vw,3rem)] leading-none">{v}</dd>
              </div>
            ))}
          </dl>

          {CHAPTERS.map(([heading, key], i) => {
            const body = p.story[key];
            return (
              <section key={key} data-reveal className="grid gap-6 border-b border-line py-16 md:grid-cols-[14rem_1fr] md:py-24">
                <h3 className="label pt-2 text-mute">
                  <span style={{ color: p.tone }}>{String(i + 1).padStart(2, '0')}</span> {heading}
                </h3>
                {Array.isArray(body) ? (
                  <ul className="max-w-[44rem] space-y-5">
                    {body.map((b) => (
                      <li key={b} className="relative pl-7 text-lg leading-relaxed text-bone/85">
                        <span aria-hidden="true" className="absolute top-[0.7em] left-0 h-px w-4" style={{ background: p.tone }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`max-w-[44rem] leading-[1.35] ${i === 1 ? 'display text-[clamp(1.8rem,3.2vw,2.8rem)]' : 'text-xl text-bone/85'}`}>
                    {body}
                  </p>
                )}
              </section>
            );
          })}

          {p.gallery.length > 0 && (
            <section aria-label="Gallery" className="space-y-16 py-20 md:space-y-28">
              {p.gallery.map((g, i) => (
                <figure key={g.src} className={i % 2 ? 'md:ml-[16%]' : 'md:mr-[16%]'}>
                  <div data-shot className="overflow-hidden rounded-2xl bg-ink-2">
                    <img src={g.src} alt={g.alt} loading="lazy" decoding="async" width={1440} height={900} className="w-full" />
                  </div>
                  {g.caption && <figcaption className="label mt-4 max-w-[40rem] leading-relaxed normal-case tracking-normal text-mute">{g.caption}</figcaption>}
                </figure>
              ))}
            </section>
          )}

          <section data-reveal className="flex flex-col gap-10 border-t border-line py-16 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="label mb-4 text-mute">Built with</h3>
              <p className="display text-[clamp(1.6rem,3vw,2.6rem)]">{p.stack.join(' · ')}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={p.live}
                target="_blank"
                rel="noopener"
                data-cursor="Visit"
                className="label rounded-full px-7 py-4 text-ink"
                style={{ background: p.tone }}
              >
                Open the site ↗<span className="sr-only"> (opens in a new tab)</span>
              </a>
              {p.repo && (
                <a href={p.repo} target="_blank" rel="noopener" className="label rounded-full border border-bone/30 px-7 py-4 text-bone hover:border-bone">
                  Source ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </div>
          </section>
        </div>

        <a href={workHref(next.slug)} data-cursor="Next" className="group relative block h-[70svh] overflow-hidden">
          <img
            src={next.cover.src}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 transition-[scale,opacity] duration-[2s] ease-[var(--ease-slow)] group-hover:scale-100 group-hover:opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink to-transparent" />
          <div className="absolute inset-x-5 bottom-10 md:inset-x-10">
            <p className="label mb-4 text-mute">Next door</p>
            <p className="display text-[clamp(2.6rem,8vw,7.5rem)]">{next.title}</p>
          </div>
        </a>
      </div>
    </div>
  );
}
