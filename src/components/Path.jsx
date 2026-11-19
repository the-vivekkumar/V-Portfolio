import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { journey, projects, profile } from '../content.js';
import { ArrowIcon, ExternalIcon, GitHubIcon } from './Icons.jsx';
import { store } from '../lib/scroll.js';
import { useRepoCount } from '../lib/github.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ------------------------------------------------------------------ Career */
export function Journey() {
  const list = useRef();
  useEffect(() => {
    const ol = list.current;
    const items = [...ol.children];
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = ol.getBoundingClientRect();
      const mark = window.innerHeight * 0.58;
      const pr = clamp((mark - r.top) / r.height);
      store.journeyP = pr;
      ol.style.setProperty('--p', pr.toFixed(4));
      items.forEach((li) => li.classList.toggle('on', li.getBoundingClientRect().top < mark));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <section id="journey" data-scene="journey" className="scene journey" aria-labelledby="journey-title">
      <div className="wrap journey__grid">
        <div className="journey__side">
          <h2 id="journey-title" className="h2">Career and education</h2>
          <div className="journey__art" data-slot="journey" aria-hidden="true" />
        </div>
        <ol className="path" ref={list}>
          {journey.map((j) => (
            <li key={`${j.when}-${j.title}`} className="path__item">
              <div className="path__when">
                <strong>{j.when}</strong>
                <span>{j.range}</span>
              </div>
              <span className="path__dot" aria-hidden="true" />
              <div className="path__body panel">
                <p className="path__kind">{j.kind}</p>
                <h3>{j.title}</h3>
                <p className="path__where">{j.where}</p>
                {j.points && <ul className="path__points">{j.points.map((p) => <li key={p}>{p}</li>)}</ul>}
                {j.note && <p className="path__note">{j.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- Work */
function tilt(e) {
  if (e.pointerType === 'touch') return;
  const el = e.currentTarget, r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  el.style.setProperty('--ry', `${((x - 0.5) * 9).toFixed(2)}deg`);
  el.style.setProperty('--rx', `${((0.5 - y) * 7).toFixed(2)}deg`);
  el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
  el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
}
function untilt(e) { const el = e.currentTarget; el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }

function Card({ p, index, onOpen }) {
  return (
    <li className="pcard panel" data-id={p.id} style={{ '--c': ['#4f8cff', '#22d3ee', '#7aa7ff', '#38bdf8'][index % 4] }} onPointerMove={tilt} onPointerLeave={untilt}>
      <div className="pcard__top">
        <span className="pcard__num" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        {p.kind && <span className="pcard__badge">{p.kind === 'AI' ? 'AI project' : 'ML project'}</span>}
        <span className="pcard__lang">{p.lang}</span>
      </div>
      <h3 className="pcard__title">{p.title}</h3>
      <p className="pcard__lead">{p.lead}</p>
      <ol className="pcard__flow" aria-label={`${p.short} pipeline`}>
        {p.how.map(([name]) => <li key={name}>{name}</li>)}
      </ol>
      <ul className="chips" aria-label="Technologies">
        {p.tech.slice(0, 5).map((t) => <li key={t}>{t}</li>)}
        {p.tech.length > 5 && <li>+{p.tech.length - 5}</li>}
      </ul>
      <div className="pcard__actions">
        <button type="button" className="btn btn--sm pcard__open" onClick={() => onOpen(p.id)}>
          Project details <ArrowIcon />
        </button>
        <a className="btn btn--sm btn--primary" href={p.repo} target="_blank" rel="noopener noreferrer">
          <GitHubIcon /> GitHub<span className="sr-only"> repository for {p.title} (opens in a new tab)</span>
        </a>
      </div>
    </li>
  );
}

function ProjectDialog({ project, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const d = ref.current;
    if (project && !d.open) d.showModal();
    if (!project && d.open) d.close();
  }, [project]);
  const p = project;
  return (
    <dialog ref={ref} className="dlg" onClose={onClose} onClick={(e) => { if (e.target === ref.current) ref.current.close(); }} aria-labelledby="dlg-title">
      {p && (
        <div className="dlg__inner">
          <button type="button" className="dlg__close" onClick={() => ref.current.close()} aria-label="Close project details">Close</button>
          <h3 id="dlg-title" className="dlg__title">{p.title}</h3>
          <p className="dlg__obj">{p.objective}</p>

          <h4>How it works</h4>
          <ol className="dlg__steps">
            {p.how.map(([name, text]) => <li key={name}><strong>{name}</strong><span>{text}</span></li>)}
          </ol>
          {p.flow && <p className="dlg__flow">{p.flow}</p>}

          <h4>Features</h4>
          <ul className="dlg__list">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>

          <h4>Built with</h4>
          <ul className="chips">{p.tech.map((t) => <li key={t}>{t}</li>)}</ul>

          {p.repo && (
            <a className="btn btn--primary dlg__repo" href={p.repo} target="_blank" rel="noopener noreferrer">
              <GitHubIcon /> View on GitHub <ExternalIcon /><span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      )}
    </dialog>
  );
}

export function Work() {
  const sec = useRef(), sticky = useRef(), track = useRef();
  const dist = useRef(0);
  const [openId, setOpenId] = useState(null);
  const [pinned, setPinned] = useState(false);
  const count = useRepoCount();

  // Pin and scroll sideways only on wide screens and when motion is welcome.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)');
    const sync = () => setPinned(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useLayoutEffect(() => {
    const s = sec.current, t = track.current;
    if (!pinned) { s.style.height = ''; t.style.transform = ''; return undefined; }
    let raf = 0;
    const apply = () => {
      raf = 0;
      const span = s.offsetHeight - window.innerHeight;
      const p = span > 0 ? clamp(-s.getBoundingClientRect().top / span) : 0;
      t.style.transform = `translate3d(${(-p * dist.current).toFixed(1)}px,0,0)`;
      s.style.setProperty('--wp', p.toFixed(4));
    };
    const layout = () => {
      t.style.transform = 'none';
      dist.current = Math.max(0, t.scrollWidth - window.innerWidth);
      s.style.height = `${Math.round(dist.current * 1.05 + window.innerHeight)}px`;
      apply();
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    layout();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', layout);
    document.fonts?.ready.then(layout);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', layout); cancelAnimationFrame(raf); };
  }, [pinned]);

  // Keyboard: tabbing to a card that is off screen scrolls the page, not the clipped track.
  const onFocus = (e) => {
    if (!pinned) return;
    const st = sticky.current;
    st.scrollLeft = 0;
    const card = e.target.closest('.pcard');
    if (!card || !dist.current) return;
    const left = card.offsetLeft - parseFloat(getComputedStyle(track.current).paddingLeft);
    const span = sec.current.offsetHeight - window.innerHeight;
    const p = clamp(left / dist.current);
    window.scrollTo({ top: sec.current.offsetTop + p * span, behavior: 'auto' });
  };

  // The native dialog gives focus back to the button that opened it.
  const open = (id) => setOpenId(id);
  const close = () => setOpenId(null);

  return (
    <section id="work" data-scene="work" className={`work${pinned ? ' is-pinned' : ''}`} ref={sec} aria-labelledby="work-title">
      <div className="work__sticky" ref={sticky} onFocus={onFocus}>
        <div className="wrap work__head">
          <div className="work__title">
            <h2 id="work-title" className="h2">My work</h2>
            <p className="work__hint">Four featured projects. {pinned ? 'Keep scrolling to move through them.' : 'Open one for the full story.'}</p>
          </div>
          <div className="work__gh" aria-label="GitHub">
            <p className="work__count" title={count.note || undefined}>
              <strong aria-live="polite" aria-busy={count.status === 'loading' || undefined}>{count.text}</strong>
              <span>public repositories<br />on GitHub{count.asOf ? `, as of ${count.asOf}` : ''}</span>
            </p>
            <a className="btn btn--sm" href={profile.github} target="_blank" rel="noopener noreferrer">
              <GitHubIcon /> Explore all repositories<span className="sr-only"> (opens GitHub in a new tab)</span>
            </a>
          </div>
          {pinned && <span className="work__bar" aria-hidden="true"><i /></span>}
        </div>
        <ul className="work__track" ref={track}>
          {projects.map((p, i) => <Card key={p.id} p={p} index={i} onOpen={open} />)}
        </ul>
      </div>
      <ProjectDialog project={projects.find((p) => p.id === openId) || null} onClose={close} />
    </section>
  );
}
