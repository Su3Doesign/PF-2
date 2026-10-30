import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, reducedMotion, scrollToTarget } from '../lib/motion';
import { ask, usesModel, type Turn } from '../lib/ask';

const SUGGESTIONS = ['Show me the 3D worlds', 'Which clients have you worked with?', 'How do commissions work?', 'Where can I see your résumé?'];

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * A quiet chat panel: no avatars, no bubbles for the answers, one input. Answers come
 * from the case studies on this site unless a model endpoint is configured.
 */
export default function Ask({ open, onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useGSAP(
    () => {
      if (!panel.current) return;
      const dur = reducedMotion ? 0 : 1;
      if (open) {
        gsap.set(panel.current, { display: 'flex' });
        gsap.fromTo(panel.current, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: dur, ease: 'expo.inOut' });
        // Opacity, not visibility: the input has to stay focusable while it fades in.
        gsap.fromTo(panel.current.querySelectorAll('[data-in]'), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: dur * 1.2, stagger: 0.06, delay: dur * 0.5 });
        input.current?.focus({ preventScroll: true });
      } else {
        gsap.to(panel.current, { clipPath: 'inset(0 0 0 100%)', duration: dur * 0.8, ease: 'expo.inOut', onComplete: () => void gsap.set(panel.current, { display: 'none' }) });
      }
    },
    { dependencies: [open] },
  );

  useEffect(() => {
    if (!open) return;
    const key = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open, onClose]);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [turns, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const history: Turn[] = [...turns, { role: 'user', text: q }];
    setTurns(history);
    setDraft('');
    setBusy(true);
    const [reply] = await Promise.all([ask(history), new Promise((r) => setTimeout(r, reducedMotion ? 0 : 650))]);
    setTurns((t) => [...t, { role: 'assistant', text: reply.text, links: reply.links }]);
    setBusy(false);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };
  const enter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(draft);
    }
  };

  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby="ask-title"
      data-lenis-prevent
      className="fixed inset-y-0 right-0 z-[78] hidden w-full flex-col border-l border-line bg-ink/95 backdrop-blur-xl sm:w-[28rem]"
      style={{ clipPath: 'inset(0 0 0 100%)' }}
    >
      <header data-in className="flex items-center justify-between border-b border-line px-6 py-5">
        <h2 id="ask-title" className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_14px_var(--accent)]" aria-hidden="true" />
          <span className="title text-2xl">Ask the archive</span>
        </h2>
        <button type="button" onClick={onClose} className="label -mr-2 min-h-11 px-3 text-mute hover:text-bone">
          Close
        </button>
      </header>

      <div ref={log} className="flex-1 overflow-y-auto overscroll-contain px-6 py-8" aria-live="polite">
        {turns.length === 0 && (
          <div data-in>
            <p className="title text-[2rem] leading-[1.05]">What would you like to know about the work?</p>
            <ul className="mt-8 space-y-2">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => send(s)}
                    className="w-full rounded-xl border border-line px-4 py-3 text-left text-[0.95rem] text-mute transition-colors duration-500 hover:border-bone/40 hover:text-bone"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ol className="space-y-8">
          {turns.map((t, i) =>
            t.role === 'user' ? (
              <li key={i} className="ml-10 rounded-2xl rounded-br-md bg-ink-3 px-4 py-3 text-[0.95rem] leading-relaxed">
                <span className="sr-only">You: </span>
                {t.text}
              </li>
            ) : (
              <li key={i} className="text-[0.98rem] leading-relaxed whitespace-pre-line text-bone/90">
                <span className="sr-only">Answer: </span>
                {t.text}
                {t.links && t.links.length > 0 && (
                  <span className="mt-4 flex flex-wrap gap-2">
                    {t.links.map((l) => (
                      <a
                        key={l.href}
                        href={l.href}
                        target={l.external ? '_blank' : undefined}
                        rel={l.external ? 'noopener' : undefined}
                        onClick={(e) => {
                          if (l.external) return;
                          onClose();
                          // Sections scroll smoothly; case studies open through the hash route.
                          if (!l.href.startsWith('#/')) {
                            e.preventDefault();
                            window.setTimeout(() => scrollToTarget(l.href), 500);
                          }
                        }}
                        className="label rounded-full border border-line px-3 py-2 text-mute hover:border-bone/50 hover:text-bone"
                      >
                        <span style={{ color: l.tone ?? 'var(--accent)' }}>●</span> {l.label}
                        {l.external && ' ↗'}
                      </a>
                    ))}
                  </span>
                )}
              </li>
            ),
          )}
          {busy && (
            <li className="flex gap-1.5 py-2" aria-label="Thinking">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-mute motion-reduce:animate-none"
                  style={{ animationDelay: `${d * 160}ms` }}
                />
              ))}
            </li>
          )}
        </ol>
      </div>

      <form data-in onSubmit={submit} className="border-t border-line p-4">
        <label htmlFor="ask-input" className="sr-only">
          Your question
        </label>
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-ink-2 p-2 focus-within:border-bone/40">
          <textarea
            id="ask-input"
            ref={input}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={enter}
            placeholder="Ask about a project, a tool, a client…"
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[0.98rem] text-bone placeholder:text-faint focus:outline-none"
            style={{ fieldSizing: 'content' } as CSSProperties}
          />
          <button
            type="submit"
            disabled={!draft.trim() || busy}
            aria-label="Send"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-bone text-ink transition-opacity duration-300 disabled:opacity-25"
          >
            ↑
          </button>
        </div>
        <p className="label mt-3 px-1 normal-case tracking-normal text-faint">
          {usesModel ? 'Answers are written by a model from the case studies on this site.' : 'Answers come straight from the case studies on this site.'}
        </p>
      </form>
    </div>
  );
}
