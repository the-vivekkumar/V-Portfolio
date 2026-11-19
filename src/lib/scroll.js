// Shared, framework-free scroll state. The 3D scene reads it every frame; nothing here causes React renders.
const ease = (t) => t * t * (3 - 2 * t);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export const store = {
  sections: [],
  vh: 1,
  vw: 1,
  portrait: false,
  reduced: false,
  pointer: { x: 0, y: 0, px: 0, py: 0 }, // x,y in -1..1 (y up); px,py in CSS pixels
  ready: false,
  focus: { doing: -1, ach: -1 },   // which card the pointer is on (drives the 3D pieces next to them)
  cat: 'all',                      // selected certificate group
  journeyP: 0                      // 0..1 progress along the career timeline
};

export function measure() {
  const y = window.scrollY;
  store.vh = window.innerHeight;
  store.vw = window.innerWidth;
  store.portrait = store.vw / store.vh < 0.9 || store.vw < 760;
  store.sections = [...document.querySelectorAll('[data-scene]')].map((el) => {
    const r = el.getBoundingClientRect();
    return { id: el.dataset.scene, top: r.top + y, bottom: r.bottom + y };
  });
  store.ready = store.sections.length > 0;
}

/** Which scenes are "active" at document position c (the viewport centre), and how strongly. */
export function blendAt(c) {
  const s = store.sections;
  if (!s.length) return [];
  let i = s.findIndex((sec) => c >= sec.top && c < sec.bottom);
  if (i < 0) i = c < s[0].top ? 0 : s.length - 1;
  const band = Math.min(store.vh * 0.55, (s[i].bottom - s[i].top) * 0.9);
  const out = [];
  let own = 1;
  const dTop = c - s[i].top;
  const dBot = s[i].bottom - c;
  if (i > 0 && dTop < band / 2) {
    const w = ease(clamp(0.5 + dTop / band));
    own = Math.min(own, w);
    out.push({ id: s[i - 1].id, w: 1 - w });
  }
  if (i < s.length - 1 && dBot < band / 2) {
    const w = ease(clamp(0.5 + dBot / band));
    own = Math.min(own, w);
    out.push({ id: s[i + 1].id, w: 1 - w });
  }
  out.push({ id: s[i].id, w: own });
  return out;
}

/** 0..1 while the viewport centre travels through a section. */
export function progressOf(id, c) {
  const sec = store.sections.find((x) => x.id === id);
  if (!sec) return 0;
  return clamp((c - sec.top) / Math.max(sec.bottom - sec.top, 1));
}

export function setupPointer() {
  const onMove = (e) => {
    store.pointer.px = e.clientX;
    store.pointer.py = e.clientY;
    store.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    store.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onMove, { passive: true });
  return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerdown', onMove); };
}

export const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
