import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { ScrollTrigger, pauseScroll, startSmoothScroll } from './lib/motion';
import { useWorkSlug } from './lib/useHashRoute';
import { bySlug } from './data/projects';
import Loader from './components/Loader';
import Cursor from './components/Cursor';
import Nav from './components/Nav';
import Menu from './components/Menu';
import Hero from './components/Hero';
import Bands from './components/Bands';
import Manifesto from './components/Manifesto';
import Process from './components/Process';
import Worlds from './components/Worlds';
import Shelf from './components/Shelf';
import Contact, { AskInvite } from './components/Contact';
import PortalCanvas from './components/portal/PortalCanvas';

// Only needed once someone opens them.
const CaseStudy = lazy(() => import('./components/CaseStudy'));
const Ask = lazy(() => import('./components/Ask'));

export default function App() {
  const [ready, setReady] = useState(false);
  const [asking, setAsking] = useState(false);
  const [askMounted, setAskMounted] = useState(false);
  const [menu, setMenu] = useState(false);
  const slug = useWorkSlug();
  const project = slug ? bySlug(slug) : undefined;
  const done = useCallback(() => setReady(true), []);
  const covered = Boolean(project) || menu;

  useEffect(() => startSmoothScroll(), []);

  useEffect(() => {
    pauseScroll(!ready || covered);
  }, [ready, covered]);

  useEffect(() => {
    if (ready) ScrollTrigger.refresh();
  }, [ready]);

  // Opening a case study from the menu closes the menu.
  useEffect(() => {
    if (project) setMenu(false);
  }, [project]);

  const openAsk = useCallback(() => {
    setAskMounted(true);
    setAsking(true);
  }, []);
  const closeAsk = useCallback(() => setAsking(false), []);
  const toggleMenu = useCallback(() => setMenu((m) => !m), []);
  const closeMenu = useCallback(() => setMenu(false), []);

  // "/" opens the chat from anywhere that isn't a text field.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === '/' && !t.closest('input, textarea, [contenteditable]')) {
        e.preventDefault();
        openAsk();
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [openAsk]);

  return (
    <>
      <a
        href="#worlds"
        className="label fixed top-3 left-3 z-[100] -translate-y-24 rounded-full bg-bone px-4 py-3 text-ink focus:translate-y-0"
      >
        Skip to the work
      </a>
      {!ready && <Loader onDone={done} />}
      <PortalCanvas />
      <Cursor />
      <Nav onAsk={openAsk} menuOpen={menu} onMenu={toggleMenu} />
      <Menu open={menu} onClose={closeMenu} onAsk={openAsk} />

      <main inert={covered}>
        <Hero ready={ready} />
        <Bands />
        <Manifesto />
        <Process />
        <Worlds />
        <Shelf />
        <AskInvite onAsk={openAsk} />
      </main>
      <div inert={covered}>
        <Contact />
      </div>

      <Suspense fallback={null}>
        {project && <CaseStudy key={project.slug} project={project} />}
        {askMounted && <Ask open={asking} onClose={closeAsk} />}
      </Suspense>
      <div className="grain" aria-hidden="true" />
    </>
  );
}
