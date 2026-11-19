/*
 * Landing core: a small, illustrative booster-landing model.
 *
 * Not flight data and not a model of any real vehicle. It exists to show the idea from the
 * published survey: a feedback controller turns a position error into thrust and gimbal commands.
 *
 *   World units are metres and seconds in a scaled-down world (gravity is lower than Earth's so the
 *   descent is slow enough to watch).
 *   Lateral channel:  PID on the pad offset  -> commanded sideways acceleration
 *   Vertical channel: velocity tracking against a stopping-distance profile (landing burn)
 *   Thrust vector:    total thrust and gimbal angle are solved from the two commands
 */
(function (root) {
  'use strict';

  var G = 3.2;                 // gravity (scaled)
  var T_MAX = 2.7 * G;         // maximum thrust acceleration
  var WORLD_W = 100;           // world width in metres
  var PAD_HALF = 9;            // half-width of the landing pad
  var LOCK_ALT = 30;           // below this altitude the pad holds station, like a drone ship on final approach

  var GAINS = { kp: 0.8, ki: 0.03, kd: 1.7 };

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function create(worldH, rand, padX) {
    rand = rand || Math.random;
    var startX = clamp(padX + (rand() - 0.5) * 44, 14, WORLD_W - 14);
    return {
      x: startX, y: worldH * 0.97,
      vx: (rand() - 0.5) * 4, vy: -3,
      th: 0,               // body / thrust angle in radians, positive leans toward +x
      thr: 0,              // current thrust acceleration
      burn: false,
      ix: 0,               // integral of the lateral error
      t: 0,
      landed: false,
      result: null         // { onPad, speed, offset }
    };
  }

  function step(s, padX, dt) {
    if (s.landed) return s;
    var ex = padX - s.x;

    // Lateral PID, softened near the ground so the booster arrives upright
    var near = clamp(s.y / 18, 0.2, 1);
    s.ix = clamp(s.ix + ex * dt, -12, 12);
    var axCmd = clamp((GAINS.kp * ex + GAINS.ki * s.ix - GAINS.kd * s.vx) * near, -4, 4);

    // Ignite when the stopping distance (with a margin) reaches the current altitude
    var aBrake = 0.72 * (T_MAX - G);
    var stopDist = s.vy < 0 ? (s.vy * s.vy) / (2 * aBrake) : 0;
    if (!s.burn && s.y <= stopDist + 7) s.burn = true;

    var thCmd = 0, thrust = 0, axFin = 0;

    if (s.burn) {
      var aRef = 0.62 * (T_MAX - G);
      var vRef = -Math.max(0.9, Math.sqrt(2 * aRef * Math.max(s.y - 0.4, 0)));
      var ayCmd = clamp(G + 3.2 * (vRef - s.vy), 0.15 * G, 0.98 * T_MAX);
      var axLim = clamp(axCmd, -0.8 * ayCmd, 0.8 * ayCmd);
      thrust = Math.min(T_MAX, Math.hypot(axLim, ayCmd));
      thCmd = s.y < 1.5 ? 0 : Math.atan2(axLim, ayCmd);
    } else {
      // Before ignition the only steering authority is small (grid-fin style)
      axFin = clamp(axCmd, -2.2, 2.2);
      thCmd = clamp(axFin * 0.05, -0.1, 0.1);
    }

    // The body follows the commanded angle with a short lag
    s.th += (thCmd - s.th) * (1 - Math.exp(-dt / 0.18));
    s.thr = thrust;

    var ax = thrust * Math.sin(s.th) + axFin;
    var ay = thrust * Math.cos(s.th) - G;
    s.vx += ax * dt;
    s.vy += ay * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.t += dt;

    if (s.y <= 0) {
      s.y = 0;
      s.landed = true;
      s.thr = 0;
      var offset = Math.abs(s.x - padX);
      var speed = Math.abs(s.vy);
      s.result = { onPad: offset <= PAD_HALF && speed < 4.5, speed: speed, offset: offset };
    }
    return s;
  }

  var api = { G: G, T_MAX: T_MAX, WORLD_W: WORLD_W, PAD_HALF: PAD_HALF, LOCK_ALT: LOCK_ALT, GAINS: GAINS, create: create, step: step };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LandingCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
