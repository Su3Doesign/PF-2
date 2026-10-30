import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { projects } from '../../data/projects';
import { anchors, portal, showListeners } from './bus';

interface Props {
  className?: string;
  /** Shown as a caption under the door: "Through the door: …". */
  caption?: boolean;
}

/** A place on the page for the door to stand. Drag it, or focus it and use the arrow keys. */
export default function PortalAnchor({ className = '', caption = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(-1);

  useEffect(() => {
    const el = ref.current!;
    anchors.add(el);
    showListeners.add(setIndex);
    return () => {
      anchors.delete(el);
      showListeners.delete(setIndex);
    };
  }, []);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    portal.api?.grab(e.clientX, e.clientY);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => portal.api?.drag(e.clientX, e.clientY);
  const up = () => portal.api?.release();

  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.6 : 0.25;
    const map: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -0.1],
      ArrowDown: [0, 0.1],
    };
    const d = map[e.key];
    if (!d) return;
    e.preventDefault();
    portal.api?.nudge(d[0], d[1]);
  };

  const shown = index >= 0 ? projects[index] : null;

  return (
    <div className={`relative ${className}`}>
      <div
        ref={ref}
        role="group"
        aria-roledescription="3D door"
        aria-label={`A door you can turn all the way round${shown ? `, showing ${shown.title}` : ''}. Drag it, or use the arrow keys.`}
        tabIndex={0}
        data-cursor="Drag"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
        className="absolute inset-0 touch-pan-y select-none rounded-[2rem]"
      >
        {shown && (
          <img
            src={shown.cover.src}
            alt=""
            className="arch portal-fallback absolute top-1/2 left-1/2 hidden aspect-[3/4.4] h-[78%] -translate-x-1/2 -translate-y-1/2 object-cover"
          />
        )}
      </div>
      {caption && (
        <p aria-live="polite" className="label pointer-events-none absolute right-0 bottom-0 left-0 hidden justify-center gap-2 text-mute md:flex">
          <span>Through the door</span>
          <span className="text-bone" style={{ color: shown?.tone }}>
            ●
          </span>
          <span className="text-bone">{shown?.title ?? '…'}</span>
        </p>
      )}
    </div>
  );
}
