import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { measure, setupPointer, store } from './lib/scroll.js';
import Nav, { Rail, Orb } from './components/Nav.jsx';
import { Hero, About, Doing } from './components/Intro.jsx';
import { Journey, Work } from './components/Path.jsx';
import { Research, Tech, Certifications, Achievements } from './components/Proof.jsx';
import { Contact, Footer } from './components/Contact.jsx';
import './styles/main.css';

const Scene3D = lazy(() => import('./three/Scene3D.jsx'));

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

export default function App() {
  const [webgl, setWebgl] = useState(() => hasWebGL());
  const [toast, setToast] = useState('');
  const timer = useRef(0);
  const notify = useCallback((msg, ms = 2400) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), ms);
  }, []);

  useEffect(() => {
    const on = (e) => notify(e.detail.message, e.detail.ms);
    window.addEventListener('site:notice', on);
    return () => window.removeEventListener('site:notice', on);
  }, [notify]);

  useEffect(() => {
    document.documentElement.classList.toggle('no3d', !webgl);
  }, [webgl]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => { store.reduced = mq.matches; };
    sync();
    mq.addEventListener('change', sync);

    let raf = 0;
    const m = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('resize', m);
    const ro = new ResizeObserver(m);
    ro.observe(document.body);
    document.fonts?.ready.then(m);
    const t = setTimeout(measure, 400);
    const off = setupPointer();
    return () => {
      mq.removeEventListener('change', sync);
      window.removeEventListener('resize', m);
      ro.disconnect(); off(); clearTimeout(t); cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      {webgl && (
        <Suspense fallback={null}>
          <Scene3D onFail={() => setWebgl(false)} />
        </Suspense>
      )}
      <Orb />
      <Nav />
      <Rail />
      <main id="main">
        <Hero />
        <About />
        <Doing />
        <Journey />
        <Work />
        <Research notify={notify} />
        <Tech />
        <Certifications />
        <Achievements />
        <Contact notify={notify} />
      </main>
      <Footer />
      <div className="toast" role="status" aria-live="polite" data-show={toast ? '1' : ''}>{toast}</div>
    </>
  );
}
