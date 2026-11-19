import { useState } from 'react';
import { paper, phases, techStack, certificates, certificateCount, achievements } from '../content.js';
import { CopyIcon, ExternalIcon } from './Icons.jsx';
import { store } from '../lib/scroll.js';

export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy') ? resolve() : reject(new Error('copy')); } catch (e) { reject(e); }
    document.body.removeChild(ta);
  });
}

/* ---------------------------------------------------------------- Research */
export function Research({ notify }) {
  const copy = () => copyText(paper.citation).then(() => notify('Citation copied'), () => notify('Copy failed. Select the citation and copy it by hand.'));
  return (
    <section id="research" data-scene="research" className="scene research" aria-labelledby="research-title">
      <div className="wrap research__grid">
        <div className="research__pad" aria-hidden="true" />
        <div className="research__main">
          <h2 id="research-title" className="h2">Research</h2>
          <p className="lede lede--sm">A published survey of how a Falcon 9 booster finds its way back and lands upright.</p>

          <article className="paper panel" aria-labelledby="paper-title">
            <div className="paper__lead">
              <p className="paper__badge">Published paper</p>
              <h3 id="paper-title" className="paper__title">{paper.title}</h3>
              <p className="paper__authors">{paper.authors}</p>
              <p className="paper__meta">{paper.journal}. {paper.issue}.</p>
              <p className="paper__meta">{paper.certificate}</p>
              <div className="paper__actions">
                <a className="btn btn--primary btn--sm" href={paper.doiUrl} target="_blank" rel="noopener noreferrer">
                  DOI {paper.doi} <ExternalIcon /><span className="sr-only"> (opens in a new tab)</span>
                </a>
                <button type="button" className="btn btn--sm" onClick={copy}><CopyIcon /> Copy citation</button>
              </div>
            </div>
            <div className="paper__more">
              <h4>What it covers</h4>
              <ul className="dlg__list">{paper.covers.map((c) => <li key={c}>{c}</li>)}</ul>
              <p className="paper__also">{paper.also}</p>
              <ul className="chips" aria-label="Keywords">{paper.keywords.map((k) => <li key={k}>{k}</li>)}</ul>
            </div>
          </article>

          <h3 className="h3">The landing in four phases</h3>
          <ol className="phases">
            {phases.map((ph, i) => (
              <li key={ph.name} className="phases__item panel" style={{ '--alt': `${[100, 72, 42, 14][i] ?? 50}%` }}>
                <span className="phases__bar" aria-hidden="true" />
                <span className="phases__alt">{ph.alt}</span>
                <h4>{ph.name}</h4>
                <p>{ph.text}</p>
                <p className="phases__sys">{ph.sys}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- Tech stack */
export function Tech() {
  const touch = window.matchMedia('(hover: none)').matches;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <section id="tech" data-scene="tech" className="tech" aria-labelledby="tech-title">
      <div className="tech__sticky">
        <div className="wrap">
          <h2 id="tech-title" className="h2 h2--center">My tech stack</h2>
          <p className="tech__hint">{still ? 'The tools I work with.' : touch ? 'Tap the pile.' : 'Move your pointer through the pile.'}</p>
        </div>
        <ul className="sr-only" aria-label="Technologies I use">
          {techStack.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- Certifications */
const CERT_COLORS = { data: '#60a5fa', software: '#22d3ee', security: '#7aa7ff', skills: '#5eead4', internships: '#fcd34d' };

export function Certifications() {
  const [cat, setCat] = useState('all');
  const pick = (id) => { setCat(id); store.cat = id; };
  return (
    <section id="certifications" data-scene="certifications" className="scene certs-sec" aria-labelledby="cert-title">
      <div className="wrap">
        <div className="certs__head">
          <div className="certs__intro">
            <h2 id="cert-title" className="h2">Certifications</h2>
            <p className="lede lede--sm">{certificateCount} certificates across data, software, security, skills and two internships.</p>
            <div className="filters" role="group" aria-label="Filter certificates by area">
              <button type="button" className="chip-btn" aria-pressed={cat === 'all'} onClick={() => pick('all')}>All <span className="chip-btn__n">{certificateCount}</span></button>
              {certificates.map((g) => (
                <button key={g.id} type="button" className="chip-btn" aria-pressed={cat === g.id} onClick={() => pick(g.id)} style={{ '--c': CERT_COLORS[g.id] }}>
                  <i className="chip-btn__dot" aria-hidden="true" />{g.label} <span className="chip-btn__n">{g.items.length}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="certs__art" data-slot="certs" aria-hidden="true" />
        </div>

        <div className={`certs${cat !== 'all' ? ' certs--one' : ''}`}>
          {certificates.map((g) => (
            <section key={g.id} className="certs__group" style={{ '--c': CERT_COLORS[g.id] }} hidden={cat !== 'all' && cat !== g.id} aria-labelledby={`cg-${g.id}`}>
              <h3 id={`cg-${g.id}`} className="h3"><i className="certs__dot" aria-hidden="true" />{g.label}</h3>
              <ul className="ledger">
                {g.items.map((c) => (
                  <li key={c.title} className="ledger__row">
                    <div>
                      <p className="ledger__title">{c.title}</p>
                      <p className="ledger__meta">{c.issuer}{c.detail ? `, ${c.detail}` : ''}</p>
                    </div>
                    <div className="ledger__end">
                      <time dateTime={c.iso}>{c.date}</time>
                      {c.verify && (
                        <a href={c.verify} target="_blank" rel="noopener noreferrer">
                          Verify <ExternalIcon width={14} height={14} /><span className="sr-only"> {c.title} (opens in a new tab)</span>
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Achievements */
const MEDAL = ['#60a5fa', '#22d3ee', '#fb7185'];

export function Achievements() {
  const focus = (i) => () => { store.focus.ach = i; };
  return (
    <section id="achievements" data-scene="achievements" className="scene ach-sec" aria-labelledby="ach-title">
      <div className="wrap ach__grid">
        <div className="ach__main">
          <h2 id="ach-title" className="h2">Achievements and activities</h2>
          <ul className="ach" onPointerLeave={focus(-1)} onBlur={focus(-1)}>
            {achievements.map((a, i) => (
              <li key={a.title} className="ach__card panel" style={{ '--c': MEDAL[i % 3] }} onPointerEnter={focus(i)} onFocus={focus(i)}>
                <h3>{a.title}</h3>
                <p>{a.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="ach__art" data-slot="ach" aria-hidden="true" />
      </div>
    </section>
  );
}
