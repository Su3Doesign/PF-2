// A tiny registry between the DOM and the single WebGL canvas. Anchors are the
// elements the door should sit inside; listeners hear which project it is showing.

export interface PortalApi {
  grab(x: number, y: number): void;
  drag(x: number, y: number): void;
  release(): void;
  nudge(dx: number, dy: number): void;
}

export const anchors = new Set<HTMLElement>();
export const showListeners = new Set<(index: number) => void>();
export const portal: { api: PortalApi | null } = { api: null };

export function emitShowing(index: number) {
  showListeners.forEach((fn) => fn(index));
}
