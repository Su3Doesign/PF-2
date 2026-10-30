import { useSyncExternalStore } from 'react';

// Case studies live at #/work/<slug>, so the site needs no server rewrites on GitHub Pages.
const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useWorkSlug() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  const match = hash.match(/^#\/work\/([\w-]+)/);
  return match ? match[1] : null;
}

export const workHref = (slug: string) => `#/work/${slug}`;

export function closeWork() {
  // Drop the hash without adding a history entry or jumping to the top.
  history.pushState(null, '', window.location.pathname + window.location.search);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
