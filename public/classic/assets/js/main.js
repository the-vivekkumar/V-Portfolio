/* Page behaviour: navigation, descent gauge, scroll effects, filters, architecture explorer, copy buttons and the contact form. */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var hasIO = 'IntersectionObserver' in window;

  /* Footer year */
  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Toast ---------- */
  var toastEl = $('#toast'), toastTimer = 0;
  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  /* ---------- Mobile menu ---------- */
  var toggle = $('.nav__toggle'), sheet = $('#nav-sheet');
  function setMenu(open) {
    if (!toggle || !sheet) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    toggle.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
    sheet.hidden = !open;
  }
  if (toggle && sheet) {
    toggle.addEventListener('click', function () { setMenu(sheet.hidden); });
    sheet.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !sheet.hidden) { setMenu(false); toggle.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (!sheet.hidden && !e.target.closest('.nav')) setMenu(false);
    });
    window.matchMedia('(min-width: 1040px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });
  }

  /* ---------- Scroll progress ---------- */
  var bar = $('.progress span'), ticking = false;
  function onScroll() {
    if (ticking || !bar) return;
    ticking = true;
    requestAnimationFrame(function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(window.scrollY / max, 1) : 0).toFixed(4) + ')';
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Active section in the navigation and the gauge ---------- */
  var links = $$('.nav__links a');
  var gaugeItems = $$('#gauge li');
  function setActive(id) {
    links.forEach(function (a) {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    gaugeItems.forEach(function (li) { li.classList.toggle('on', li.getAttribute('data-for') === id); });
  }
  if (hasIO && links.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    $$('main section[id]').forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Descent gauge: ticks sit at each section's real position on the page ---------- */
  var gauge = $('#gauge');
  function scrollMax() { return Math.max(document.documentElement.scrollHeight - window.innerHeight, 1); }
  function layoutGauge() {
    if (!gauge) return;
    var max = scrollMax();
    gaugeItems.forEach(function (li) {
      var s = document.getElementById(li.getAttribute('data-for'));
      if (!s) return;
      var y = s.getBoundingClientRect().top + window.scrollY - 96;
      li.style.setProperty('--t', (Math.min(Math.max(y / max, 0), 1) * 100).toFixed(2) + '%');
    });
    syncGauge();
  }
  function syncGauge() {
    if (!gauge) return;
    gauge.style.setProperty('--p', (Math.min(window.scrollY / scrollMax(), 1) * 100).toFixed(2) + '%');
  }
  if (gauge) {
    window.addEventListener('scroll', syncGauge, { passive: true });
    window.addEventListener('resize', layoutGauge);
    window.addEventListener('load', layoutGauge);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutGauge);
    layoutGauge();
  }

  /* ---------- Reveal on scroll (one soft fade per section) ---------- */
  var revealTargets = $$('.reveal, .skill, .phases, .flow');
  if (hasIO) {
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); reveal.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach(function (el) { reveal.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('in'); });
  }
  $$('.phase').forEach(function (el, i) { el.style.setProperty('--p', i); });

  /* ---------- Pointer glow on glass panels ---------- */
  var glowFrame = 0;
  document.addEventListener('pointermove', function (e) {
    var el = e.target.closest && e.target.closest('.glass');
    if (!el || e.pointerType === 'touch') return;
    cancelAnimationFrame(glowFrame);
    glowFrame = requestAnimationFrame(function () {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }, { passive: true });

  /* ---------- Filters (projects and certifications share one helper) ---------- */
  function wireFilter(btnSel, attr, itemSel, tagAttr, emptyEl) {
    var btns = $$(btnSel), items = $$(itemSel);
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var f = btn.getAttribute(attr);
        btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        var shown = 0;
        items.forEach(function (item) {
          var match = f === 'all' || (item.getAttribute(tagAttr) || '').split(/\s+/).indexOf(f) !== -1;
          item.hidden = !match;
          if (match) shown++;
        });
        if (emptyEl) emptyEl.hidden = shown !== 0;
        layoutGauge();
      });
    });
  }
  wireFilter('.chip-btn[data-filter]', 'data-filter', '#project-list .project', 'data-tags', $('#project-empty'));
  wireFilter('.chip-btn[data-cfilter]', 'data-cfilter', '#cert-groups .cert-group', 'data-cat', null);

  /* ---------- Architecture explorer (J.A.R.V.I.S.) ---------- */
  var arch = $('#arch');
  if (arch) {
    var nodes = $$('.node', arch), panels = $$('[data-panel]', arch);
    var pick = function (id) {
      arch.setAttribute('data-active', id);
      nodes.forEach(function (n) { n.setAttribute('aria-pressed', String(n.getAttribute('data-node') === id)); });
      panels.forEach(function (p) { p.setAttribute('aria-hidden', String(p.getAttribute('data-panel') !== id)); });
    };
    nodes.forEach(function (n) { n.addEventListener('click', function () { pick(n.getAttribute('data-node')); }); });
    pick(arch.getAttribute('data-active') || 'ui');
  }

  /* ---------- Copy buttons ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (err) { reject(err); }
      document.body.removeChild(ta);
    });
  }
  $$('[data-copy], [data-copy-text]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var sel = btn.getAttribute('data-copy');
      var text = sel ? ($(sel) || {}).textContent : btn.getAttribute('data-copy-text');
      if (!text) return;
      copyText(text.trim()).then(
        function () { toast(btn.getAttribute('data-copied') || 'Copied'); },
        function () { toast('Copy failed. Select the text and copy it manually.'); }
      );
    });
  });

  /* ---------- Contact form ---------- */
  var form = $('#contact-form');
  if (form) {
    var endpoint = (form.getAttribute('data-endpoint') || '').trim();
    var toEmail = form.getAttribute('data-email');
    var status = $('#form-status');
    var hint = $('#form-hint');
    var submitBtn = $('button[type="submit"]', form);
    if (hint && endpoint) hint.textContent = 'Your message goes straight to my inbox.';

    var rules = {
      name: function (v) { return v.trim().length >= 2 ? '' : 'Enter your name.'; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address, like name@example.com.'; },
      message: function (v) { return v.trim().length >= 10 ? '' : 'Write a message of at least 10 characters.'; }
    };

    function check(name) {
      var input = form.elements[name];
      var err = $('#e-' + name);
      var msg = rules[name](input.value);
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg) input.setAttribute('aria-describedby', 'e-' + name); else input.removeAttribute('aria-describedby');
      err.textContent = msg; err.hidden = !msg;
      return !msg;
    }
    Object.keys(rules).forEach(function (name) {
      form.elements[name].addEventListener('blur', function () { check(name); });
      form.elements[name].addEventListener('input', function () {
        if (form.elements[name].getAttribute('aria-invalid') === 'true') check(name);
      });
    });

    function setStatus(text, tone) { status.textContent = text; status.dataset.tone = tone || ''; }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      Object.keys(rules).forEach(function (name) { if (!check(name) && !firstBad) firstBad = form.elements[name]; });
      if (firstBad) { firstBad.focus(); setStatus('Fix the highlighted fields and send again.', 'error'); return; }
      if (form.elements._gotcha.value) { setStatus('Message sent.', 'ok'); form.reset(); return; }

      var data = { name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), message: form.elements.message.value.trim() };

      if (!endpoint) {
        var subject = 'Portfolio message from ' + data.name;
        var body = data.message + '\n\n' + data.name + '\n' + data.email;
        window.location.href = 'mailto:' + toEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        setStatus('Your email app should open with the message ready. If it does not, write to ' + toEmail + '.', 'ok');
        return;
      }

      submitBtn.disabled = true;
      setStatus('Sending...', '');
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (!res.ok) throw new Error('Request failed');
        setStatus('Message sent. I will reply by email.', 'ok');
        form.reset();
      }).catch(function () {
        setStatus('The message did not send. Check your connection and try again, or email ' + toEmail + ' directly.', 'error');
      }).then(function () { submitBtn.disabled = false; });
    });
  }
})();
