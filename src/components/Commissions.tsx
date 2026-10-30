import { useId, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, reducedMotion } from '../lib/motion';
import { commissionFor, commissions } from '../data/work';
import { profile } from '../data/projects';
import InViewVideo from './kit/InViewVideo';
import Magnetic from './kit/Magnetic';
import Roll from './kit/Roll';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface BlankProps {
  options: string[];
  index: number;
  name: string;
  /** Punctuation that sits tight against the last word, outside the dashed rule. */
  after?: string;
  onNext: () => void;
}

/** One blank in the sentence: tap it and its letters drop out and the next choice rises in. */
function Blank({ options, index, name, after, onNext }: BlankProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  const first = useRef(true);
  const word = options[index];
  const hint = useId();

  useGSAP(
    () => {
      if (first.current || reducedMotion) {
        first.current = false;
        return;
      }
      gsap.fromTo('[data-c]', { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.016, ease: 'expo.out' });
    },
    { dependencies: [word], scope: ref },
  );

  const next = () => {
    if (busy.current) return;
    if (reducedMotion) return onNext();
    busy.current = true;
    gsap.to(ref.current!.querySelectorAll('[data-c]'), {
      yPercent: -110,
      duration: 0.32,
      stagger: 0.008,
      ease: 'expo.in',
      onComplete: () => {
        busy.current = false;
        onNext();
      },
    });
  };

  return (
    <span className="whitespace-nowrap">
      <button
        ref={ref}
        type="button"
        onClick={next}
        data-cursor="Change"
        aria-describedby={hint}
        className="peer relative inline-block text-left whitespace-normal text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
      >
        <span className="sr-only">{word}</span>
        {word.split(' ').map((w, i) => (
          <span key={`${word}-${i}`} aria-hidden="true">
            {i > 0 && ' '}
            <span className="blank inline-block overflow-hidden pb-[0.12em] align-bottom [margin-bottom:-0.12em]">
              {[...w].map((c, j) => (
                <span key={j} data-c className="inline-block">
                  {c}
                </span>
              ))}
            </span>
          </span>
        ))}
        {after && <span className="text-bone">{after}</span>}
      </button>
      <span aria-hidden="true" className="label ml-[0.3em] align-top text-[0.62rem] text-mute tabular-nums transition-colors peer-hover:text-bone md:text-[0.7rem]">
        {index + 1}/{options.length}
      </span>
      <span id={hint} className="sr-only">
        Changes {name}. Choice {index + 1} of {options.length}.
      </span>
    </span>
  );
}

/**
 * Commissions as one sentence the visitor finishes, like writing a wish on an ema plaque.
 * Each blank cycles through what Sumanth takes on; what arrives and how long it takes follow
 * the first blank, and the button sends the finished sentence as an email.
 */
export default function Commissions() {
  const root = useRef<HTMLElement>(null);
  const [what, setWhat] = useState(1);
  const [forIndex, setFor] = useState(() => commissionFor.indexOf(commissions[1].usual));
  const c = commissions[what];
  const sentence = `I’d like ${c.what} for ${commissionFor[forIndex]}.`;

  useGSAP(
    () => {
      if (reducedMotion) return;
      const q = gsap.utils.selector(root);
      gsap.from(q('[data-line]'), {
        yPercent: 110,
        duration: 1.6,
        stagger: 0.1,
        ease: 'expo.out',
        scrollTrigger: { trigger: q('[data-sentence]')[0], start: 'top 82%' },
      });
      q('[data-in]').forEach((el) => gsap.from(el, { y: 50, autoAlpha: 0, duration: 1.6, scrollTrigger: { trigger: el, start: 'top 90%' } }));
    },
    { scope: root },
  );

  // When the first blank changes, what arrives rises in again.
  const firstDetail = useRef(true);
  useGSAP(
    () => {
      if (firstDetail.current || reducedMotion) {
        firstDetail.current = false;
        return;
      }
      gsap.fromTo('[data-detail]', { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, stagger: 0.06, ease: 'expo.out' });
    },
    { dependencies: [what], scope: root },
  );

  const nextWhat = () => {
    const n = (what + 1) % commissions.length;
    setWhat(n);
    setFor(commissionFor.indexOf(commissions[n].usual));
  };
  const nextFor = () => setFor((i) => (i + 1) % commissionFor.length);

  const mail = `mailto:${profile.email}?subject=${encodeURIComponent(`Commission: ${c.what}, for ${commissionFor[forIndex]}`)}&body=${encodeURIComponent(
    `Hi Sumanth,\n\n${sentence}\n\nWhat it's for, when it's needed, and anything you're already picturing:\n\n`,
  )}`;

  return (
    <section ref={root} id="commissions" aria-labelledby="commissions-title" className="relative z-[3] overflow-hidden bg-ink px-5 py-[18vh] md:px-10">
      {/* Drawn as generated content: it is decoration, not text to read or contrast-check. */}
      <span
        aria-hidden="true"
        lang="ja"
        data-k="絵馬"
        className="pointer-events-none absolute top-[14vh] right-4 text-[clamp(5rem,12vw,13rem)] leading-none font-bold text-bone/[0.05] [font-family:'Hiragino_Sans','Noto_Sans_JP','Noto_Sans_CJK_JP','Yu_Gothic',sans-serif] [writing-mode:vertical-rl] before:content-[attr(data-k)]"
      />
      <div className="label mb-12 flex flex-wrap justify-between gap-x-6 gap-y-2 text-mute">
        <h2 id="commissions-title">(08) Commissions</h2>
        <span>Open for commissions · 2026</span>
      </div>

      <p data-in className="label mb-10 max-w-[46ch] leading-relaxed text-mute">
        An ema is a plaque you write a wish on and leave at a shrine. Write yours: tap the coloured words until the sentence is right, then send it.
      </p>

      <p data-sentence className="title text-[clamp(2.2rem,10.4vw,7.6rem)] leading-[1.04] tracking-[-0.03em] md:text-[clamp(2.4rem,6.2vw,7.6rem)]">
        <span className="block overflow-hidden pb-[0.08em]">
          <span data-line className="block">
            I’d like <Blank options={commissions.map((o) => o.what)} index={what} name="what you’d like" onNext={nextWhat} />
          </span>
        </span>
        <span className="block overflow-hidden pb-[0.08em]">
          <span data-line className="block">
            for <Blank options={commissionFor} index={forIndex} name="what it’s for" after="." onNext={nextFor} />
          </span>
        </span>
      </p>
      <p className="sr-only" aria-live="polite">
        {sentence}
      </p>

      <div className="mt-20 grid gap-12 md:mt-28 md:grid-cols-12 md:gap-10">
        <figure data-in className="md:col-span-5">
          <div className="relative aspect-[5/4] overflow-hidden rounded-[1.75rem] bg-ink-2">
            {commissions.map((o, i) =>
              o.example.video && i === what ? (
                <InViewVideo
                  key={o.what}
                  src={o.example.src}
                  poster={o.example.poster}
                  label={o.example.caption}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : o.example.video ? null : (
                <img
                  key={o.what}
                  src={o.example.src}
                  alt={i === what ? o.example.caption : ''}
                  aria-hidden={i !== what}
                  loading="lazy"
                  decoding="async"
                  className={`absolute inset-0 h-full w-full object-cover transition-[opacity,scale] duration-1000 ease-[cubic-bezier(.16,1,.3,1)] ${i === what ? 'scale-100 opacity-100' : 'scale-110 opacity-0'}`}
                />
              ),
            )}
          </div>
          <figcaption className="label mt-4 flex gap-3 leading-relaxed text-mute">
            <span className="shrink-0 text-bone">Like this</span>
            <span data-detail>{c.example.caption}</span>
          </figcaption>
        </figure>

        <div className="flex flex-col md:col-span-6 md:col-start-7">
          <p className="label mb-5 text-mute">What arrives</p>
          <p data-detail className="title text-[clamp(1.4rem,2.2vw,2.1rem)] leading-[1.2]">
            {c.arrives.map((a, i) => (
              <span key={a}>
                {i > 0 && (
                  <span aria-hidden="true" className="mx-[0.35em] text-[var(--accent)]">
                    ／
                  </span>
                )}
                {i === 0 ? cap(a) : a}
                {i < c.arrives.length - 1 && <span className="sr-only">,</span>}
              </span>
            ))}
            .
          </p>

          <div className="mt-12 flex items-baseline gap-5 border-t border-line pt-6">
            <span className="label text-mute">Usually</span>
            <span data-detail className="display text-[clamp(2.2rem,4.4vw,4.8rem)]">
              {cap(c.time)}
            </span>
          </div>

          <div data-in className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-5 md:mt-auto md:pt-12">
            <Magnetic>
              <a href={mail} data-cursor="Send" className="label flex h-16 items-center rounded-full bg-[var(--accent)] px-8 text-ink">
                <Roll text="Send this sentence →" />
              </a>
            </Magnetic>
            <p className="label leading-relaxed text-mute">
              Or in your own words:
              <br />
              <a href={`mailto:${profile.email}`} className="text-bone underline decoration-line underline-offset-4 hover:decoration-bone">
                {profile.email}
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
