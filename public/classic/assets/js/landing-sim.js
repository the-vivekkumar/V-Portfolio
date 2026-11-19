/*
 * Hero landing simulation: renders the model in landing-core.js on a canvas.
 * The pad follows the pointer (or the arrow keys). It drifts on its own when nobody is steering,
 * and it holds station once the booster is below LOCK_ALT, like a drone ship on final approach.
 */
(function () {
  'use strict';

  var core = window.LandingCore;
  var canvas = document.getElementById('sim-canvas');
  if (!core || !canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var $ = function (id) { return document.getElementById(id); };
  var hud = { alt: $('hud-alt'), vel: $('hud-vel'), thr: $('hud-thr'), ang: $('hud-ang'), state: $('hud-state') };
  var replayBtn = $('sim-replay');
  var replayLabel = replayBtn ? replayBtn.querySelector('span') : null;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var W = 0, H = 0, dpr = 1, scale = 1, groundY = 0, worldH = 90;

  var lander = null;
  var padX = 50, padTarget = 50;
  var lastInput = -1e9;
  var clock = 0;
  var holdTimer = 0;
  var trail = [];
  var running = false, onScreen = true, rafId = 0, lastTs = 0, hudTs = 0;

  var DT = 1 / 120;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /* ---------- Sizing ---------- */
  function resize() {
    var r = canvas.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = W / core.WORLD_W;
    groundY = H - Math.max(34, H * 0.085);
    worldH = (groundY - 12) / scale;
    draw();
  }

  /* ---------- Lifecycle ---------- */
  function launch() {
    lander = core.create(worldH, Math.random, padX);
    trail.length = 0;
    holdTimer = 0;
    canvas.dataset.state = 'coast';
  }

  function settleInstantly() {
    // Used for reduced motion: show a finished landing instead of animating one
    padX = padTarget = 50;
    lander = core.create(worldH, function () { return 0.5; }, padX);
    var guard = 0;
    while (!lander.landed && guard++ < 20000) core.step(lander, padX, DT);
    canvas.dataset.state = 'landed';
    updateHud(true);
  }

  function start() {
    if (running) return;
    running = true;
    lastTs = 0;
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }
  function syncRunning() {
    if (reduceMotion.matches && !canvas.dataset.userStarted) return;
    if (onScreen && !document.hidden) start(); else stop();
  }

  /* ---------- Simulation loop ---------- */
  function frame(ts) {
    if (!running) return;
    var dt = lastTs ? Math.min((ts - lastTs) / 1000, 1 / 20) : 0;
    lastTs = ts;
    clock += dt;

    // Pad target: pointer or keys if recently used, otherwise a slow drift
    if (ts - lastInput > 3000) padTarget = 52 + 20 * Math.sin(clock * 0.35);

    if (lander) {
      var steps = Math.max(1, Math.round(dt / DT));
      for (var i = 0; i < steps; i++) {
        if (!lander.landed && lander.y > core.LOCK_ALT) {
          var d = padTarget - padX;
          padX += clamp(d, -5 * DT, 5 * DT);
        }
        core.step(lander, padX, DT);
      }
      if (!lander.landed) {
        canvas.dataset.state = lander.burn ? 'burn' : 'coast';
        var px = lander.x * scale, py = groundY - lander.y * scale;
        var last = trail[trail.length - 1];
        if (!last || Math.hypot(px - last[0], py - last[1]) > 3) {
          trail.push([px, py]);
          if (trail.length > 80) trail.shift();
        }
      } else {
        canvas.dataset.state = 'landed';
        holdTimer += dt;
        if (holdTimer > 2.8) launch();
      }
    }

    draw();
    if (ts - hudTs > 90) { updateHud(false); hudTs = ts; }
    rafId = requestAnimationFrame(frame);
  }

  /* ---------- HUD ---------- */
  function updateHud(force) {
    if (!lander || !hud.alt) return;
    hud.alt.textContent = Math.max(0, lander.y).toFixed(0) + ' m';
    hud.vel.textContent = Math.abs(lander.vy).toFixed(1) + ' m/s';
    hud.thr.textContent = Math.round((lander.thr / core.T_MAX) * 100) + '%';
    hud.ang.textContent = (lander.th * 57.2958).toFixed(1) + '°';
    var label = 'Coasting', tone = '';
    if (lander.landed) {
      label = lander.result && lander.result.onPad ? 'Touchdown' : 'Missed the pad';
      tone = lander.result && lander.result.onPad ? 'ok' : '';
    } else if (lander.burn) { label = 'Landing burn'; tone = 'burn'; }
    hud.state.textContent = label;
    hud.state.dataset.tone = tone;
  }

  /* ---------- Drawing ---------- */
  function draw() {
    if (!W) return;
    ctx.clearRect(0, 0, W, H);
    drawScale();
    drawGround();
    drawPad();
    drawTrail();
    if (lander) drawBooster();
    canvas.dataset.ready = '1';
  }

  function drawScale() {
    ctx.save();
    ctx.font = '11px "Instrument Sans", system-ui, sans-serif';
    ctx.textAlign = 'right';
    for (var a = 20; a < worldH; a += 20) {
      var y = groundY - a * scale;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      if (y > 56) {
        ctx.fillStyle = 'rgba(168,168,192,0.6)';
        ctx.fillText(a + ' m', W - 12, y - 5);
      }
    }
    // Altitude where the pad stops following
    var ly = groundY - core.LOCK_ALT * scale;
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(147,197,253,0.28)';
    ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(147,197,253,0.7)';
    ctx.textAlign = 'left';
    ctx.fillText('Pad holds position below this line', 14, ly - 6);
    ctx.restore();
  }

  function drawGround() {
    var g = ctx.createLinearGradient(0, groundY, 0, H);
    g.addColorStop(0, 'rgba(37, 99, 235,0.28)');
    g.addColorStop(1, 'rgba(37, 99, 235,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, groundY, W, H - groundY);
    var lg = ctx.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, 'rgba(37, 99, 235,0)');
    lg.addColorStop(0.5, 'rgba(96,165,250,0.9)');
    lg.addColorStop(1, 'rgba(37,99,235,0)');
    ctx.strokeStyle = lg;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, groundY + 0.5); ctx.lineTo(W, groundY + 0.5); ctx.stroke();
  }

  function drawPad() {
    var half = core.PAD_HALF * scale;
    var cx = padX * scale;
    var locked = lander && !lander.landed && lander.y <= core.LOCK_ALT;
    ctx.save();
    ctx.shadowColor = 'rgba(37, 99, 235,0.9)';
    ctx.shadowBlur = 22;
    var g = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
    g.addColorStop(0, '#2563eb'); g.addColorStop(1, '#2563eb');
    ctx.fillStyle = g;
    roundRect(cx - half, groundY, half * 2, 7, 3.5);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = locked ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    roundRect(cx - half, groundY, half * 2, 7, 3.5);
    ctx.stroke();
    // beacons
    var blink = 0.55 + 0.45 * Math.sin(clock * 6);
    ctx.fillStyle = 'rgba(134,239,172,' + blink.toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(cx - half + 7, groundY - 2, 2, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + half - 7, groundY - 2, 2, 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  function drawTrail() {
    if (trail.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (var i = 1; i < trail.length; i++) {
      var a = i / trail.length;
      ctx.strokeStyle = 'rgba(96,165,250,' + (a * 0.45).toFixed(3) + ')';
      ctx.lineWidth = 1 + a * 1.5;
      ctx.beginPath();
      ctx.moveTo(trail[i - 1][0], trail[i - 1][1]);
      ctx.lineTo(trail[i][0], trail[i][1]);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBooster() {
    var s = lander;
    var bw = Math.max(11, 3.4 * scale), bh = bw * 4.6;
    var px = s.x * scale, py = groundY - s.y * scale;
    var skirt = bw * 0.32;

    // Light thrown on the ground by the plume
    if (s.thr > 0.1 && s.y < 40) {
      var k = (1 - s.y / 40) * (s.thr / core.T_MAX);
      var rg = ctx.createRadialGradient(px, groundY, 2, px, groundY, 90);
      rg.addColorStop(0, 'rgba(255,179,107,' + (0.5 * k).toFixed(3) + ')');
      rg.addColorStop(1, 'rgba(255,179,107,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(px - 100, groundY - 100, 200, 110);
    }

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(s.th);

    // Flame (drawn first so the body overlaps its root)
    if (s.thr > 0.1) {
      var len = (10 + 58 * (s.thr / core.T_MAX)) * (0.9 + Math.random() * 0.2);
      var top = -skirt;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var fg = ctx.createLinearGradient(0, top, 0, top + len);
      fg.addColorStop(0, 'rgba(255,255,255,0.95)');
      fg.addColorStop(0.25, 'rgba(255,179,107,0.9)');
      fg.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(-bw * 0.3, top);
      ctx.quadraticCurveTo(-bw * 0.22, top + len * 0.55, 0, top + len);
      ctx.quadraticCurveTo(bw * 0.22, top + len * 0.55, bw * 0.3, top);
      ctx.closePath();
      ctx.fill();
      var gl = ctx.createRadialGradient(0, top, 1, 0, top, len * 0.8);
      gl.addColorStop(0, 'rgba(255,179,107,0.35)');
      gl.addColorStop(1, 'rgba(255,179,107,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(-len, top - len * 0.2, len * 2, len * 1.2);
      ctx.restore();
    }

    // Landing legs deploy low down
    var deploy = clamp((46 - s.y) / 14, 0, 1);
    var legOut = bw * (0.15 + 1.15 * deploy);
    ctx.strokeStyle = 'rgba(214,214,235,0.95)';
    ctx.lineWidth = Math.max(1.4, bw * 0.1);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-bw / 2, -bh * 0.16); ctx.lineTo(-bw / 2 - legOut, 0);
    ctx.moveTo(bw / 2, -bh * 0.16); ctx.lineTo(bw / 2 + legOut, 0);
    ctx.stroke();

    // Engine skirt
    ctx.fillStyle = '#1b1b2c';
    roundRect(-bw * 0.36, -skirt - 1, bw * 0.72, skirt + 1, 2);
    ctx.fill();

    // Body
    var bg = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    bg.addColorStop(0, '#8d9bff');
    bg.addColorStop(0.35, '#ffffff');
    bg.addColorStop(1, '#8f86b8');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-bw / 2, -skirt);
    ctx.lineTo(-bw / 2, -bh + bw / 2);
    ctx.arc(0, -bh + bw / 2, bw / 2, Math.PI, 0);
    ctx.lineTo(bw / 2, -skirt);
    ctx.closePath();
    ctx.fill();

    // Dark interstage band near the top
    ctx.fillStyle = 'rgba(20,20,40,0.82)';
    ctx.fillRect(-bw / 2, -bh * 0.86, bw, bh * 0.1);

    // Grid fins
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(-bw / 2 - bw * 0.42, -bh * 0.84, bw * 0.42, bw * 0.2);
    ctx.fillRect(bw / 2, -bh * 0.84, bw * 0.42, bw * 0.2);

    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- Input ---------- */
  function worldXFromEvent(e) {
    var r = canvas.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * core.WORLD_W;
  }
  canvas.addEventListener('pointermove', function (e) {
    padTarget = clamp(worldXFromEvent(e), 12, core.WORLD_W - 12);
    lastInput = performance.now();
  });
  canvas.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    padTarget = clamp(padTarget + (e.key === 'ArrowLeft' ? -10 : 10), 12, core.WORLD_W - 12);
    lastInput = performance.now();
  });

  if (replayBtn) {
    replayBtn.addEventListener('click', function () {
      if (reduceMotion.matches) canvas.dataset.userStarted = '1';
      launch();
      if (replayLabel) replayLabel.textContent = 'Relaunch';
      syncRunning();
      if (!running) draw();
    });
  }

  /* ---------- Boot ---------- */
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      syncRunning();
    }, { threshold: 0.05 }).observe(canvas);
  }
  document.addEventListener('visibilitychange', syncRunning);

  resize();
  if (reduceMotion.matches) {
    settleInstantly();
    if (replayLabel) replayLabel.textContent = 'Run simulation';
    draw();
  } else {
    launch();
    updateHud(true);
    syncRunning();
  }
})();
