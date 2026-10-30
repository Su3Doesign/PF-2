import type { CSSProperties } from 'react';

/**
 * Text that rolls up into a fresh copy of itself when its link or button is hovered or
 * focused. Pure CSS (see .roll in index.css); screen readers get the plain text.
 */
export default function Roll({ text, className = '' }: { text: string; className?: string }) {
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className={`roll ${className}`}>
        {Array.from(text).map((c, i) => (
          <span key={i} style={{ '--i': i } as CSSProperties}>
            {c}
          </span>
        ))}
      </span>
    </>
  );
}
