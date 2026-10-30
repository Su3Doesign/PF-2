import { useSyncExternalStore } from 'react';
import type { Media } from '../data/work';

export interface LightboxItem extends Media {
  caption?: string;
}

interface State {
  items: LightboxItem[];
  index: number;
  title: string;
}

// One lightbox for the whole page; any section opens it with its own list of media.
let state: State | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function openLightbox(items: LightboxItem[], index: number, title: string) {
  if (!items.length) return;
  state = { items, index, title };
  emit();
}

export function closeLightbox() {
  state = null;
  emit();
}

export function stepLightbox(by: number) {
  if (!state) return;
  state = { ...state, index: (state.index + by + state.items.length) % state.items.length };
  emit();
}

export function useLightbox() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}
