import { useEffect, useSyncExternalStore } from 'react';
import { profile } from '../content.js';

// The real number of public repositories on Vivek's GitHub profile, read live from GitHub's public API.
// While it loads the page shows a placeholder; if GitHub cannot be reached it shows the last number checked
// against GitHub (profile.repoFallback) together with the date it was checked, instead of inventing a number.
const USER = (profile.github.match(/github\.com\/([^/?#]+)/) || [])[1] || 'the-vivekkumar';
const KEY = `gh-public-repos:${USER}`;
const MAX_AGE = 30 * 60 * 1000;

let state = { status: 'loading', count: null };
let started = false;
const subs = new Set();
const set = (next) => { state = next; subs.forEach((f) => f()); };

function cached() {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY));
    if (v && Number.isInteger(v.n) && v.n >= 0) return v;
  } catch { /* storage can be blocked */ }
  return null;
}

function load() {
  if (started) return;
  started = true;
  const c = cached();
  if (c && Date.now() - c.t < MAX_AGE) { set({ status: 'ready', count: c.n }); return; }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  fetch(`https://api.github.com/users/${USER}`, { headers: { Accept: 'application/vnd.github+json' }, signal: ctl.signal })
    .then((r) => { if (!r.ok) throw new Error(`GitHub answered ${r.status}`); return r.json(); })
    .then((d) => {
      if (!Number.isInteger(d.public_repos) || d.public_repos < 0) throw new Error('Unexpected answer');
      try { sessionStorage.setItem(KEY, JSON.stringify({ n: d.public_repos, t: Date.now() })); } catch { /* ignore */ }
      set({ status: 'ready', count: d.public_repos });
    })
    .catch(() => set(c ? { status: 'ready', count: c.n } : { status: 'error', count: null }))
    .finally(() => clearTimeout(timer));
}

const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
const snapshot = () => state;

const asOf = () => new Date(`${profile.repoFallback.checked}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

// { status: 'loading' | 'ready' | 'error', text, note, asOf }
export function useRepoCount() {
  useEffect(load, []);
  const s = useSyncExternalStore(subscribe, snapshot, snapshot);
  if (s.status === 'ready') return { status: s.status, text: String(s.count), note: '', asOf: '' };
  if (s.status === 'error') {
    return { status: s.status, text: String(profile.repoFallback.count), note: `The live count could not be loaded. This is the number on GitHub on ${asOf()}.`, asOf: asOf() };
  }
  return { status: s.status, text: '\u2026', note: 'Loading the live count', asOf: '' };
}
