import { useRef, useState } from 'react';
import DocLink from './DocLink.jsx';
import { profile } from '../content.js';
import { copyText } from './Proof.jsx';
import { ArrowIcon, CopyIcon, DownloadIcon, GitHubIcon, LinkedInIcon } from './Icons.jsx';

const rules = {
  name: (v) => (v.trim().length >= 2 ? '' : 'Enter your name.'),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address, like name@example.com.'),
  message: (v) => (v.trim().length >= 10 ? '' : 'Write a message of at least 10 characters.')
};

export function Contact({ notify }) {
  const [vals, setVals] = useState({ name: '', email: '', message: '' });
  const [errs, setErrs] = useState({});
  const [status, setStatus] = useState({ text: '', tone: '' });
  const form = useRef();

  const check = (name, v = vals[name]) => {
    const msg = rules[name](v);
    setErrs((e) => ({ ...e, [name]: msg }));
    return !msg;
  };
  const set = (name) => (e) => {
    const v = e.target.value;
    setVals((s) => ({ ...s, [name]: v }));
    if (errs[name]) check(name, v);
  };

  const submit = (e) => {
    e.preventDefault();
    const names = Object.keys(rules);
    const results = names.map((n) => check(n));
    const bad = names[results.indexOf(false)];
    if (bad) {
      form.current.elements[bad].focus();
      setStatus({ text: 'Fix the highlighted fields and send again.', tone: 'error' });
      return;
    }
    if (form.current.elements._gotcha.value) { setStatus({ text: 'Message sent.', tone: 'ok' }); return; }
    const subject = `Portfolio message from ${vals.name.trim()}`;
    const body = `${vals.message.trim()}\n\n${vals.name.trim()}\n${vals.email.trim()}`;
    window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setStatus({ text: `Your email app should open with the message ready. If it does not, write to ${profile.email}.`, tone: 'ok' });
  };

  const copyMail = () => copyText(profile.email).then(() => notify('Email address copied'), () => notify('Copy failed. Select the address and copy it by hand.'));

  const field = (name, label, props = {}) => (
    <div className="field">
      <label htmlFor={`f-${name}`}>{label}</label>
      {name === 'message'
        ? <textarea id={`f-${name}`} name={name} rows={5} value={vals[name]} onChange={set(name)} onBlur={() => check(name)} aria-invalid={errs[name] ? 'true' : 'false'} aria-describedby={errs[name] ? `e-${name}` : undefined} {...props} />
        : <input id={`f-${name}`} name={name} value={vals[name]} onChange={set(name)} onBlur={() => check(name)} aria-invalid={errs[name] ? 'true' : 'false'} aria-describedby={errs[name] ? `e-${name}` : undefined} {...props} />}
      {errs[name] ? <p className="field__err" id={`e-${name}`}>{errs[name]}</p> : null}
    </div>
  );

  return (
    <section id="contact" data-scene="contact" className="scene scene--contact" aria-labelledby="contact-title">
      <div className="wrap contact__grid">
        <div className="contact__main">
          <h2 id="contact-title" className="h2">Let's talk</h2>
          <p className="lede lede--sm">Open to internships, research collaboration and interesting problems. Write to me and I will reply by email.</p>

          <div className="contact__mail panel">
            <a className="contact__addr" href={`mailto:${profile.email}`}>{profile.email}</a>
            <button type="button" className="btn btn--sm" onClick={copyMail}><CopyIcon /> Copy</button>
          </div>
          <div className="contact__links">
            <a className="btn btn--sm" href={profile.linkedin} target="_blank" rel="noopener noreferrer"><LinkedInIcon width={16} height={16} /> LinkedIn<span className="sr-only"> (opens in a new tab)</span></a>
            <a className="btn btn--sm" href={profile.github} target="_blank" rel="noopener noreferrer"><GitHubIcon width={16} height={16} /> GitHub<span className="sr-only"> (opens in a new tab)</span></a>
            <DocLink className="btn btn--sm" file={profile.resume}><DownloadIcon /> Resume</DocLink>
            <DocLink className="btn btn--sm" file={profile.cv}><DownloadIcon /> CV</DocLink>
          </div>

          <form className="form panel" ref={form} onSubmit={submit} noValidate>
            <div className="form__pair">
              {field('name', 'Your name', { autoComplete: 'name' })}
              {field('email', 'Your email', { type: 'email', autoComplete: 'email', inputMode: 'email' })}
            </div>
            {field('message', 'Message')}
            <input className="hp" type="text" name="_gotcha" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <div className="form__row">
              <button type="submit" className="btn btn--primary">Send message <ArrowIcon /></button>
              <p className="form__status" role="status" data-tone={status.tone}>{status.text}</p>
            </div>
            <p className="form__hint">This opens your email app with the message ready to send.</p>
          </form>
        </div>
        <div className="contact__art" data-slot="contact" aria-hidden="true" />
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <p>&copy; {new Date().getFullYear()} {profile.name}. Built with React and three.js.</p>
      <p><a href={profile.classic}>Professional mode</a> shows the same content as plain, fast-loading text.</p>
    </footer>
  );
}
