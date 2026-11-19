import { useEffect, useState } from 'react';
import DocLink from './DocLink.jsx';
import { profile, navLinks } from '../content.js';
import { GitHubIcon, LinkedInIcon, MailIcon, MenuIcon, DownloadIcon } from './Icons.jsx';

// Which navigation item owns which scene.
const OWNER = {
  about: 'about', doing: 'about', journey: 'about',
  work: 'work', tech: 'work',
  research: 'research',
  certifications: 'certifications', achievements: 'certifications',
  contact: 'contact'
};

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const secs = [...document.querySelectorAll('[data-scene]')];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(OWNER[e.target.dataset.scene] || ''); }),
      { rootMargin: '-45% 0px -50% 0px' }
    );
    secs.forEach((s) => io.observe(s));
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onDoc = (e) => { if (!e.target.closest('.nav')) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onDoc);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('click', onDoc); };
  }, [open]);

  const close = () => setOpen(false);
  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="nav__bar">
        <a className="nav__brand" href="#top" aria-label="Vivek T K, back to the top">
          <span className="nav__mark" aria-hidden="true">V</span>
          <span className="nav__name">Vivek T K</span>
        </a>
        <nav className="nav__links" aria-label="Sections">
          {navLinks.map(([id, label]) => (
            <a key={id} href={`#${id}`} aria-current={active === id ? 'true' : undefined}>{label}</a>
          ))}
        </nav>
        <div className="nav__tools">
          <a className="nav__classic" href={profile.classic} title="Open the plain, text-first version of this site">Professional mode</a>
          <DocLink className="btn btn--sm" file={profile.resume}>Resume</DocLink>
          <button
            type="button" className="nav__toggle" aria-expanded={open} aria-controls="nav-sheet"
            aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((v) => !v)}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </div>
      <div className="nav__sheet" id="nav-sheet" hidden={!open}>
        {navLinks.map(([id, label]) => (
          <a key={id} href={`#${id}`} onClick={close} aria-current={active === id ? 'true' : undefined}>{label}</a>
        ))}
        <DocLink file={profile.resume} onClick={close}><DownloadIcon /> Download resume</DocLink>
        <DocLink file={profile.cv} onClick={close}><DownloadIcon /> Download CV</DocLink>
        <a href={profile.classic} onClick={close}>Professional mode</a>
      </div>
    </header>
  );
}

export function Rail() {
  return (
    <aside className="rail" aria-label="Social links">
      <a href={profile.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub (opens in a new tab)"><GitHubIcon /></a>
      <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn (opens in a new tab)"><LinkedInIcon /></a>
      <a href={`mailto:${profile.email}`} aria-label="Email"><MailIcon /></a>
      <span className="rail__line" aria-hidden="true" />
    </aside>
  );
}

/** A soft glowing dot that trails the mouse. Mouse and trackpad only. */
export function Orb() {
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return undefined;
    const el = document.querySelector('.orb');
    let x = -100, y = -100, tx = -100, ty = -100, raf = 0;
    const tick = () => {
      x += (tx - x) * 0.18; y += (ty - y) * 0.18;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    const move = (e) => { tx = e.clientX; ty = e.clientY; el.dataset.on = '1'; };
    const leave = () => { el.dataset.on = ''; };
    const hover = (e) => { el.dataset.big = e.target.closest('a, button, input, textarea, summary') ? '1' : ''; };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerover', hover, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerover', hover);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, []);
  return <div className="orb" aria-hidden="true" />;
}
