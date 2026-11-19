import { profile, about, doing, certificateCount, journey } from '../content.js';
import DocLink from './DocLink.jsx';
import { store } from '../lib/scroll.js';
import { useRepoCount } from '../lib/github.js';
import { ArrowIcon, DownloadIcon } from './Icons.jsx';
import avatarUrl from '../assets/avatar/vivek.webp';

const stats = (count) => [
  [count.text, 'Public repositories', count],
  [certificateCount, 'Certificates'],
  [journey.filter((j) => /intern/i.test(j.title)).length, 'Internships'],
  [1, 'Published paper']
];

export function Hero() {
  const count = useRepoCount();
  return (
    <section id="top" data-scene="top" className="scene scene--hero" aria-labelledby="hero-title">
      <div className="wrap split">
        {/* only visible when WebGL is not available; otherwise the picture is drawn in the 3D scene */}
        <div className="hero__fallback" aria-hidden="true"><img src={avatarUrl} alt="" width="1152" height="1365" loading="lazy" decoding="async" /></div>
        <div className="hero__copy panel-mobile">
          <h1 id="hero-title" className="hero__title">
            <span className="hero__name">{profile.name}</span>
            <span className="hero__headline">
              {profile.headline.map((line) => <span key={line}>{line}</span>)}
            </span>
          </h1>
          <p className="hero__tag">{profile.tagline}</p>
          <div className="hero__cta">
            <a className="btn btn--primary" href="#work">See my work <ArrowIcon /></a>
            <DocLink className="btn" file={profile.resume}><DownloadIcon /> Resume</DocLink>
            <DocLink className="btn" file={profile.cv}><DownloadIcon /> CV</DocLink>
          </div>
          <dl className="stats" aria-label="At a glance">
            {stats(count).map(([n, l, c]) => (
              <div key={l}>
                <dt>{l}</dt>
                <dd aria-busy={c?.status === 'loading' || undefined} title={c?.note || undefined}>{n}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <a className="scrollcue" href="#about" aria-label="Scroll to About"><span aria-hidden="true" /></a>
    </section>
  );
}

export function About() {
  return (
    <section id="about" data-scene="about" className="scene about" aria-labelledby="about-title">
      <div className="wrap split">
        <div className="about__art" data-slot="about" aria-hidden="true">
          <span className="about__pin">Mysore, Karnataka, India</span>
        </div>
        <div className="about__copy panel-mobile">
          <h2 id="about-title" className="h2">About me</h2>
          <p className="lede">{about.lead}</p>
          <p className="body">{about.body}</p>
          <dl className="facts">
            {about.facts.map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export function Doing() {
  const focus = (i) => () => { store.focus.doing = i; };
  return (
    <section id="doing" data-scene="doing" className="scene doing" aria-labelledby="doing-title">
      <div className="wrap">
        <div className="doing__top">
          <h2 id="doing-title" className="h2">What I do</h2>
          <div className="doing__art" data-slot="doing" aria-hidden="true" />
        </div>
        <ul className="do" onPointerLeave={focus(-1)} onBlur={focus(-1)}>
          {doing.map((d, i) => (
            <li key={d.id} className="do__card panel" data-i={i} onPointerEnter={focus(i)} onFocus={focus(i)}>
              <span className="do__dot" aria-hidden="true" />
              <h3>{d.title}</h3>
              <p>{d.text}</p>
              <ul className="chips" aria-label={`${d.title} tools`}>
                {d.chips.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
