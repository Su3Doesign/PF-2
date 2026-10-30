import { useEffect, useRef } from 'react';
import { portal } from './bus';

/**
 * The one WebGL canvas, fixed behind the page. three.js arrives in its own chunk after
 * first paint, so the headline never waits on it. No WebGL: html[data-webgl=off] and the
 * anchors show a still image in the arch instead.
 */
export default function PortalCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let disposed = false;
    let scene: { dispose(): void } | null = null;
    const probe = document.createElement('canvas');
    if (!probe.getContext('webgl2')) {
      document.documentElement.dataset.webgl = 'off';
      return;
    }
    import('./PortalScene')
      .then(({ PortalScene }) => {
        if (disposed || !ref.current) return;
        const s = new PortalScene(ref.current);
        scene = s;
        portal.api = s;
      })
      .catch(() => {
        document.documentElement.dataset.webgl = 'off';
      });
    return () => {
      disposed = true;
      portal.api = null;
      scene?.dispose();
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1] h-full w-full opacity-0" />;
}
