/*
 * AWAKENED: MAGNETISM, TIME, GRAVITY, SOUND, MIST, SPIRIT, CHAOS
 * (format: js/data/awakened/_awk.js)
 * Chaos is the only element allowed to borrow other elements' awakened moves.
 */
(function (ERX) {
  'use strict';

  const AW = ERX.Awakened, H = ERX.KitHelp, W = ERX.AwkHelp, U = ERX.U;
  const { J, IDLE, RUN } = W;
  const Phys = () => ERX.GameEngine.Physics;
  const dot = (g, x, y, vx, vy, color, o) => g.fx.add(Object.assign({ x, y, vx, vy, life: 0.5, color, size: 1, fadeOut: 0.3 }, o));
  const holdStun = (t, s) => { if (!t.applyStatus) return; t.applyStatus('stagger', 0); if (t.status.stagger) t.status.stagger.t = s; };
  // set an enemy's vertical speed for this frame, cancelling the gravity it's about to get
  const floatV = (t, vy, dt) => { t.vy = Math.min(400, vy - 900 * dt); };
  // the size of the view on screen (it follows the window, so never assume 480x270)
  const view = (A) => A.g.view || { width: 480, height: 270 };
  const movable = (t) => !t.tutorial && !t.immovable;
  // draw a shape facing d: lx is measured forwards from (x, y)
  const facer = (ctx, A, x, y, d) => (lx, ly, w, h, c) => A.px(ctx, d > 0 ? x + lx : x - lx - w, y + ly, w, h, c);

  // ========================================================= MAGNETISM (north red / south blue)
  const NORTH = '#ff3a4a', SOUTH = '#3a7aff';
  const SCRAP = (ctx, A, x, y, kind, a) => {
    const c = Math.cos(a), s = Math.sin(a);
    switch (kind % 5) {
      case 0: A.px(ctx, x - 1, y - 1, 3, 3, '#9aa4b8'); A.px(ctx, x, y, 1, 1, '#2a2e3a'); break;                                          // nut
      case 1: A.line(ctx, x - c * 3, y - s * 3, x + c * 3, y + s * 3, '#c8d0dc'); A.px(ctx, x + c * 3, y + s * 3, 1, 1, '#ffffff'); break;   // bolt
      case 2: A.ring(ctx, x, y, 2, '#8a94a8'); A.px(ctx, x, y, 1, 1, '#c8d0dc'); break;                                                  // gear
      case 3: A.line(ctx, x - c * 4, y - s * 4, x + c * 4, y + s * 4, '#6a7488', 2); break;                                             // plate
      default: A.line(ctx, x - c * 5, y - s * 5, x + c * 4, y + s * 4, '#d8e0ea'); A.px(ctx, x - c * 5, y - s * 5, 1, 1, '#8a5a36');       // a whole sword
    }
  };
  // the big stuff the Singularity drags in
  const JUNK = (ctx, A, x, y, kind, a) => {
    const c = Math.cos(a), s = Math.sin(a);
    switch (kind % 4) {
      case 0: A.px(ctx, x - 5, y - 3, 10, 6, '#5a6478'); A.px(ctx, x - 5, y - 3, 10, 1, '#aab4c8'); A.px(ctx, x - 3, y - 1, 3, 2, '#2a2e3a'); A.ring(ctx, x + 3, y + 3, 2, '#1a1e28'); break;   // a machine
      case 1: A.ring(ctx, x, y, 4, '#8a94a8'); for (let i = 0; i < 6; i++) { const b = a + i * 1.05; A.px(ctx, x + Math.cos(b) * 5, y + Math.sin(b) * 5, 1, 1, '#c8d0dc'); } break;      // a big gear
      case 2: A.line(ctx, x - c * 7, y - s * 7, x + c * 7, y + s * 7, '#7a8498', 2); A.px(ctx, x + c * 7 - 1, y + s * 7 - 1, 2, 2, '#c8d0dc'); break;                                   // a pipe
      default: A.line(ctx, x - c * 7, y - s * 7, x + c * 6, y + s * 6, '#e8eef6'); A.line(ctx, x - c * 4 - s * 2, y - s * 4 + c * 2, x - c * 4 + s * 2, y - s * 4 - c * 2, '#8a5a36');  // a sword
    }
  };
  // a field line from a to b, bowed, with marching dashes
  const FIELD = (ctx, A, x0, y0, x1, y1, bow, t, col) => {
    const n = Math.max(6, Math.round(Math.hypot(x1 - x0, y1 - y0) / 2)), mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + bow;
    for (let i = 0; i <= n; i++) {
      if ((i + Math.floor(t * 12)) % 3 === 0) continue;
      const q = i / n, a = (1 - q) * (1 - q), b = 2 * (1 - q) * q, c = q * q;
      A.px(ctx, a * x0 + b * mx + c * x1, a * y0 + b * my + c * y1, 1, 1, col);
    }
  };
  AW.magnetism = {
    color: SOUTH, up: NORTH, status: 'magnetize', fx: 'field', block: ['Scrap Wall', 'wall'],
    icons: ['scrapStorm', 'lodestone', 'magSaw', 'polarRift', 'ferro'],
    look: { fx(ctx, F) { const a = F.at('handF'), b = F.at('handB'); F.A.px(ctx, a.x, a.y, 1, 1, NORTH); F.A.px(ctx, b.x, b.y, 1, 1, SOUTH); } },
    idle: {
      pose: (t) => IDLE.palms(t),
      fx(ctx, F) {
        const A = F.A, a = F.at('handF'), b = F.at('handB');
        for (let i = 0; i < 3; i++) FIELD(ctx, A, a.x, a.y, b.x, b.y, (i - 1) * 5 + Math.sin(F.t * 2 + i) * 1.5, F.t + i * 0.3, i === 1 ? '#ffffff' : i ? NORTH : SOUTH);
        const cx = (a.x + b.x) / 2 + F.d * 8;
        for (let i = 0; i < 4; i++) { const ang = F.t * 1.6 + i * 1.57; SCRAP(ctx, A, cx + Math.cos(ang) * 6, a.y - 2 + Math.sin(ang) * 3, i, F.t * 2 + i); }
      },
    },
    run: {
      pose: (ph) => RUN.maglev(ph),
      back(ctx, F) { const A = F.A, y = F.ground + 1; for (let i = 0; i < 18; i++) if ((i + Math.floor(F.t * 20)) % 4) A.px(ctx, F.x - F.d * (i * 2 - 4), y, 1, 1, i % 2 ? NORTH : SOUTH); A.alpha(ctx, 0.5, () => FIELD(ctx, A, F.x - F.d * 10, F.ground - 2, F.x + F.d * 4, F.ground - 2, 3, F.t, '#ffffff')); },
      step(A, p, dt) { if (W.every(p, 'spark', 0.07, dt)) A.g.fx.add({ x: p.cx - p.facing * 3, y: p.feet - 1, vx: -p.facing * A.rnd(20, 60), vy: A.rnd(-40, -10), life: 0.3, color: Math.random() < 0.5 ? NORTH : SOUTH, size: 1, fadeOut: 0.2 }); },
    },
    dash: {
      name: 'Polar Slingshot', dmg: 13, life: 0.9,
      spawn(e, g, A) { const p = A.p; e.sx = p.cx; e.y0 = p.y + 10; A.sfx('gateClang', { minGap: 0.05 }); },
      update(e, dt, g, A) {
        const p = A.p; e.ex = p.cx;
        if (p.dashT > 0) { for (const o of H.nearby(A, p.cx + p.facing * 14, p.y + 10, 26)) if (movable(o.t)) o.t.vx = p.vx; }
        else if (!e.out) { e.out = e.t; A.hit(e, { x: Math.min(e.sx, e.ex) - 10, y: p.y, w: Math.abs(e.ex - e.sx) + 20, h: p.h }, { kb: 1.2, onHit(t) { if (t.applyStatus) t.applyStatus('magnetize', 0); } }); A.sfx('hitMetal'); A.shake(2, 0.1); }
      },
      draw(e, ctx, ox, oy, A) { const k = e.out ? Math.min(1, (e.t - e.out) / 0.6) : 0, ex = e.ex !== undefined ? e.ex : e.sx; A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 3; i++) FIELD(ctx, A, e.sx + ox, e.y0 + oy, ex + ox, e.y0 + oy, (i - 1) * 8, e.t + i * 0.2, i === 1 ? '#ffffff' : i ? NORTH : SOUTH); A.disc(ctx, e.sx + ox, e.y0 + oy, 3, SOUTH, '#ffffff'); A.disc(ctx, ex + ox, e.y0 + oy, 3, NORTH, '#ffffff'); }); },
    },
    guard: {
      name: 'Scrap Wall', sound: 'clang',
      draw(ctx, { A, x, bot, h, t }) { for (let i = 0; i < 7; i++) { const yy = bot - 3 - i * (h / 7); SCRAP(ctx, A, x + Math.sin(t * 9 + i * 2) * 0.6 + (i % 2 ? 1 : -1), yy, i + 3, i * 0.9 + Math.sin(t * 3 + i) * 0.2); } FIELD(ctx, A, x - 4, bot - h, x - 4, bot, -3, t, SOUTH); FIELD(ctx, A, x + 4, bot - h, x + 4, bot, 3, t, NORTH); },
      hit(g, x, y, d) { for (let i = 0; i < 10; i++) dot(g, x, y, d * U.lerp(30, 140, Math.random()), U.lerp(-140, 20, Math.random()), i % 3 ? '#9aa4b8' : '#ffffff', { ay: 300, life: 0.6 }); },
    },
    m1: {
      name: 'Iron Gauntlet', dmg: 9, cd: 0.36, kind: 'custom', life: 0.3,
      desc: 'Iron filings snap onto your fist as a huge gauntlet. Every other punch drags the enemy back in.',
      spawn(e, g, A) { const p = A.p; p._ig = ((p._ig || 0) + 1) % 2; e.n = p._ig; A.sfx('punchHit', { minGap: 0.04 }); },
      update(e, dt, g, A) { H.at(e, A, 0); H.melee(e, A, 36 * H.sc(e), 24, { onHit(t) { const c = A.center(t); A.spawn(e, W.SHOCK, { x: c.x, y: c.y, r: 12, dmg: 0, life: 0.2, c: e.n === 0 ? SOUTH : NORTH }); if (e.n === 0 && movable(t)) { t.vx = -e.dir * 120; e.pull = c; } } }); },
      draw(e, ctx, ox, oy, A) {
        const k = e.t / e.life, r = Math.min(1, k * 5), d = e.dir, x = e.x + ox + d * (6 + 16 * r), y = e.y + oy;
        A.alpha(ctx, 1 - k, () => {
          A.alpha(ctx, 0.3, () => A.disc(ctx, x, y, 9, e.n === 0 ? SOUTH : NORTH));
          A.px(ctx, x - 6, y - 6, 12, 12, '#8a94a8'); A.px(ctx, x - 6, y - 6, 12, 2, '#d8e0ea'); A.px(ctx, x - 6, y + 4, 12, 2, '#5a6478');
          for (let i = 0; i < 3; i++) A.px(ctx, d > 0 ? x + 6 : x - 8, y - 5 + i * 4, 2, 2, '#ffffff');
          for (let i = 0; i < 10; i++) { const a = e.t * 20 + i * 0.63, rr = 9 + (i % 3) * 2; A.px(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7, 1, 1, i % 2 ? NORTH : SOUTH); }
          if (e.pull) A.line(ctx, x, y, e.pull.x + ox, e.pull.y + oy, SOUTH);
        });
      },
    },
    s: [
      {
        name: 'Scrap Storm', dmg: 8, cd: 7, mp: 6, kind: 'custom', life: 0.6,
        desc: 'Rip every loose bit of metal off the floor, spin it around you in a storm... then fire the lot at your enemies.',
        spawn(e, g, A) { A.sfx('gateClang'); e.n = e.up ? 16 : 12; },
        update(e, dt, g, A) { const p = A.p; e.x = p.cx; e.y = p.y + 10; },
        onEnd(e, A) { for (let i = 0; i < e.n; i++) { const a = (i / e.n) * Math.PI * 2 + e.t * 9; A.spawn(e, H.proj((b, ctx, ox, oy, A) => { A.alpha(ctx, 0.3, () => A.disc(ctx, b.x + ox, b.y + oy, 3, b.kind % 2 ? NORTH : SOUTH)); SCRAP(ctx, A, b.x + ox, b.y + oy, b.kind, b.t * 18); }, { life: 1, r: 5, homing: 6, onHit(b, A) { A.spawn(b, W.SHOCK, { x: b.x, y: b.y, r: 9, dmg: 0, life: 0.2 }); } }), { x: e.x + Math.cos(a) * 20, y: e.y + Math.sin(a) * 11, vx: Math.cos(a) * 160 + e.dir * 90, vy: Math.sin(a) * 120 - 40, kind: i }); } A.sfx('whoosh'); A.shake(2, 0.1); },
        draw(e, ctx, ox, oy, A) { const r = 20 * Math.min(1, e.t * 4), x = e.x + ox, y = e.y + oy; A.alpha(ctx, 0.25, () => A.ring(ctx, x, y, r + 2, NORTH, (r + 2) * 0.55)); for (let i = 0; i < e.n; i++) { const a = (i / e.n) * Math.PI * 2 + e.t * 9; SCRAP(ctx, A, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.55, i, a); if (i % 3 === 0) A.px(ctx, x + Math.cos(a - 0.3) * r, y + Math.sin(a - 0.3) * r * 0.55, 1, 1, i % 2 ? NORTH : SOUTH); } },
      },
      {
        name: 'Lodestone', dmg: 12, cd: 9, mp: 7, kind: 'custom', life: 2.4,
        desc: 'Throw a supercharged lodestone. It sticks to the first enemy it hits, then everything nearby comes crashing into it... and it blows.',
        spawn(e, g, A) { H.at(e, A, 6, -4); e.vx = e.dir * 220; e.vy = -60; e.cl = new Set(); A.sfx('whoosh'); },
        update(e, dt, g, A) {
          if (!e.tg) {
            e.vy += 300 * dt; e.x += e.vx * dt; e.y += e.vy * dt;
            const t = A.targets().find((o) => Phys().rectsOverlap(o.box, { x: e.x - 5, y: e.y - 5, w: 10, h: 10 }));
            if (t) { e.tg = t; e.st = e.t; A.damage(e, t, 1, 0.2); A.sfx('hitMetal'); }
            else if (A.solid(e.x, e.y) || e.t > 1) { e.dead = true; A.puff(e, e.x, e.y, 4); }
            return;
          }
          if (e.tg.dead) { e.dead = true; return; }
          const c = A.center(e.tg); e.x = c.x; e.y = c.y;
          if (e.t - e.st < 0.9) {
            for (const o of H.nearby(A, c.x, c.y, 100 * H.sc(e))) {
              if (o.t === e.tg || e.cl.has(o.t)) continue;
              if (movable(o.t)) o.t.vx = U.approach(o.t.vx, Math.sign(c.x - o.c.x) * 260, 10, dt);
              if (Math.abs(o.c.x - c.x) < 16) { e.cl.add(o.t); A.damage(e, o.t, 1.5, 0.6); A.damage(e, e.tg, 0.8, 0); A.spawn(e, W.SHOCK, { x: (o.c.x + c.x) / 2, y: c.y, r: 14, dmg: 0, life: 0.25 }); A.sfx('crash', { minGap: 0.06 }); A.shake(2, 0.1); }
            }
          } else if (!e.pop) { e.pop = e.t; W.boom(A, e, c.x, c.y, 30 * H.sc(e), { mult: 1.4 }); }
          if (e.pop && e.t - e.pop > 0.3) e.dead = true;
        },
        draw(e, ctx, ox, oy, A) {
          if (e.pop) return;
          const x = e.x + ox, y = e.y + oy;
          A.alpha(ctx, 0.3, () => A.disc(ctx, x, y, 7, '#8a8498'));
          A.disc(ctx, x, y, 5, '#4a4458', '#8a8498'); A.px(ctx, x - 5, y - 1, 2, 3, NORTH); A.px(ctx, x + 4, y - 1, 2, 3, SOUTH);
          if (!e.tg) return;
          for (let i = 0; i < 14; i++) { const a = i * 0.45 + e.t * 3, r = 40 - ((e.t * 50 + i * 9) % 34); A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, 2, 1, i % 2 ? NORTH : SOUTH); }
          for (const s of [-1, 1]) A.ring(ctx, x + s * 8, y, 8, s > 0 ? SOUTH : NORTH, 5, 2);
        },
      },
      {
        name: 'Mag Saw', dmg: 8, cd: 6, mp: 6, kind: 'custom', life: 1.25,
        desc: 'Spin iron filings into a big screaming saw blade. It flies out, grinds through everything, and comes back to you.',
        spawn(e, g, A) { H.at(e, A, 8, -2); e.sx = e.x; A.sfx('whoosh'); },
        update(e, dt, g, A) { const p = A.p, L = 110 * H.sc(e), q = e.t < 0.6 ? W.easeOut(e.t / 0.6) : 1 - W.easeIn((e.t - 0.6) / 0.6); e.x = U.lerp(p.cx, e.sx + e.dir * L, q); e.y = p.y + 8; A.tickR(e, e.x, e.y, 13 * H.sc(e), 0.1, { kb: 0.2 }); if (Math.random() < dt * 20) A.g.fx.add({ x: e.x, y: e.y + 4, vx: A.rnd(-80, 80), vy: A.rnd(-120, -20), ay: 300, life: 0.3, color: Math.random() < 0.5 ? '#ffd34d' : '#ffffff', size: 1 }); },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, r = 10 * H.sc(e);
          A.alpha(ctx, 0.25, () => A.disc(ctx, x, y, Math.round(r + 2), '#9aa4b8'));
          for (let i = 0; i < 16; i++) { const a = e.t * 30 + i * 0.393; A.line(ctx, x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3), x + Math.cos(a + 0.2) * (r + 1), y + Math.sin(a + 0.2) * (r + 1), i % 4 ? '#9aa4b8' : '#ffffff'); }
          A.ring(ctx, x, y, r - 3, '#6a7488'); A.disc(ctx, x, y, 3, '#4a4458', '#c8d0dc'); A.px(ctx, x - 1, y - 1, 1, 1, NORTH); A.px(ctx, x + 1, y + 1, 1, 1, SOUTH);
        },
      },
      {
        name: 'Polar Rift', dmg: 6, cd: 9, mp: 7, kind: 'custom', life: 1.8,
        desc: 'A north pole and a south pole slam into the air on either side of your enemy. The field between them crushes... then the poles snap together.',
        spawn(e, g, A) { H.at(e, A, 50); const ax = A.aim(e, 140); if (ax !== null) e.x = ax; e.gy = H.floor(A, e.x); e.cy = e.gy - 14; e.w = 34 * H.sc(e); e.cw = e.w; A.sfx('gateClang'); },
        update(e, dt, g, A) {
          e.cw = e.t < 1.3 ? e.w : e.w * Math.max(0, 1 - (e.t - 1.3) / 0.15);
          if (e.t < 1.3) A.tick(e, { x: e.x - e.w, y: e.cy - 16, w: e.w * 2, h: 30 }, 0.2, { kb: 0, onHit(t) { if (t.applyStatus) t.applyStatus('magnetize', 0); } });
          else if (!e.snap && e.cw <= 1) { e.snap = e.t; e.hit.clear(); A.hitR(e, e.x, e.cy, 20 * H.sc(e), { mult: 3.5, kb: 1.4 }); A.sfx('anvil'); A.shake(4, 0.25); A.flash(0.1); }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.cy + oy, w = e.cw, k = Math.min(1, e.t / 0.15), f = A.fade(e, 0.05, 0.3);
          A.alpha(ctx, f, () => {
            const xl = x - w, xr = x + w;
            for (let i = 0; i < 5; i++) FIELD(ctx, A, xl, y, xr, y, (i - 2) * 6 * k, e.t + i * 0.1, i === 2 ? '#ffffff' : i < 2 ? SOUTH : NORTH);
            for (const [px, col] of [[xl, SOUTH], [xr, NORTH]]) { A.px(ctx, px - 3, y - 8 * k, 6, 16 * k, col); A.px(ctx, px - 3, y - 8 * k, 6, 2, '#ffffff'); }
            if (e.snap) { const q = (e.t - e.snap) / 0.35; A.alpha(ctx, 1 - q, () => A.ring(ctx, x, y, 4 + q * 26, '#ffffff', 4 + q * 26)); }
          });
        },
      },
      {
        name: 'Ferrofluid', dmg: 9, cd: 8, mp: 6, kind: 'custom', life: 1.9,
        desc: 'Spill a pool of black magnetic fluid across the floor. Spikes ripple out of it in waves, following the field.',
        spawn(e, g, A) { H.at(e, A, 10); e.gy = H.floor(A, e.x); e.L = 90 * H.sc(e); A.sfx('hover'); },
        update(e, dt, g, A) {
          for (let w = 0; w < 3; w++) {
            const t0 = 0.25 + w * 0.4, q = (e.t - t0) / 0.4;
            if (e.t > t0 && !e['w' + w]) { e['w' + w] = true; e.hit.clear(); A.sfx('glassCrack', { minGap: 0.1 }); }
            if (q > 0 && q < 1) { const x = e.x + e.dir * e.L * q; A.hit(e, { x: x - 8, y: e.gy - 16, w: 16, h: 16 }, { kb: 0.6, onHit(t) { if (t.applyStatus) t.applyStatus('magnetize', 0); } }); }
          }
        },
        draw(e, ctx, ox, oy, A) {
          const f = A.fade(e, 0.2, 0.4), x0 = e.x + ox, gy = e.gy + oy, L = e.L * Math.min(1, e.t / 0.25);
          A.alpha(ctx, f, () => {
            A.px(ctx, e.dir > 0 ? x0 : x0 - L, gy - 1, L, 2, '#0a0a12');
            for (let w = 0; w < 3; w++) {
              const q = (e.t - 0.25 - w * 0.4) / 0.4; if (q <= 0 || q > 1.3) continue;
              for (let i = 0; i <= 10; i++) { const h = Math.max(0, 1 - Math.abs(i / 10 - q) * 6) * 13; if (h >= 1) A.tri(ctx, x0 + e.dir * e.L * (i / 10), gy, 4, h, '#14141e', '#8a94a8'); }
            }
          });
        },
      },
    ],
    ult: {
      name: 'Magnetic Singularity', dmg: 9,
      desc: 'A colossal magnetic field rips every piece of metal in sight towards one point: swords, gears, pipes, whole machines, spinning into a sphere of junk... which crushes itself down and explodes.',
      charge: {
        pose: () => J({ lean: 1, FL: [[10.6, 19], [11.4, 22]], BL: [[6, 19], [5, 22]], FA: [[12, 12.6], [14.6, 11.6]], BA: [[11.4, 12.8], [14, 12.6]] }),
        lift: 8,
        draw(ctx, x, y, k, t, A) { const hx = x + 14, hy = y - 2; for (let i = 0; i < 16; i++) { const a = i * 0.39 + t, d = 10 + 50 * (1 - ((t * 0.9 + i / 16) % 1)); SCRAP(ctx, A, hx + Math.cos(a) * d, hy + Math.sin(a) * d * 0.6, i, a * 3); } for (let i = 0; i < 3; i++) A.ring(ctx, hx, hy, 4 + i * 6 + k * 6, i % 2 ? NORTH : SOUTH, (4 + i * 6 + k * 6) * 0.6); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.8, layer: 'screen',
          spawn(e) {
            e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t);
            const c = e.ts[0] ? A.center(e.ts[0]) : { x: p.cx + e.dir * 90, y: p.y }; e.cx = c.x; e.cy = c.y - 34; e.R = 1;
            e.junk = []; for (let i = 0; i < 72; i++) e.junk.push({ a: Math.random() * Math.PI * 2, d: 300 + Math.random() * 160, r: 46 + Math.random() * 40, kind: i, spin: A.rnd(-6, 6), big: i % 3 === 0 });
            A.sfx('surge'); A.sfx('rumble', { dur: 3 });
          },
          update(e, dt, g, A) {
            e.R = e.t < 2.2 ? 1 : e.t < 2.6 ? 1 - ((e.t - 2.2) / 0.4) * 0.85 : 0.15;
            for (const j of e.junk) { if (!e.boom) { j.d = U.approach(j.d, j.r * e.R, 3, dt); j.a += dt * (1.5 + (1 - e.R) * 6); } else { j.vy += 400 * dt; j.x += j.vx * dt; j.y += j.vy * dt; } }
            if (e.t < 2.6) {
              for (const t of e.ts) if (!t.dead && !t.tutorial) { const c = A.center(t); t.vx = U.clamp((e.cx - c.x) * 3, -150, 150); floatV(t, U.clamp((e.cy - c.y) * 3, -150, 150), dt); }
              A.tickR(e, e.cx, e.cy, 60 * e.R + 10, 0.2, { mult: 0.6, kb: 0, onHit(t) { if (t.applyStatus) t.applyStatus('magnetize', e.potency); } });
              for (const b of A.g.bolts) if (Math.hypot(b.x - e.cx, b.y - e.cy) < 120) b.dead = true;
            } else if (!e.boom) {
              e.boom = true; A.blast(e, e.cx, e.cy, 120 * H.sc(e), { dmg: e.dmg * 7 }); A.sfx('boom'); A.sfx('gateClang'); A.flash(0.5); A.shake(14, 0.7);
              for (const j of e.junk) { j.x = e.cx + Math.cos(j.a) * j.d; j.y = e.cy + Math.sin(j.a) * j.d * 0.7; j.vx = Math.cos(j.a) * A.rnd(200, 360); j.vy = Math.sin(j.a) * A.rnd(200, 360) - 80; }
            }
          },
          draw(e, ctx, ox, oy, A) {
            const x = e.cx + ox, y = e.cy + oy;
            if (!e.boom) {
              A.alpha(ctx, 0.35 * Math.min(1, e.t / 0.5), () => A.px(ctx, -10, -10, 2000, 2000, '#060a1a'));
              for (let i = 0; i < 6; i++) { const r = 240 - ((e.t * 70 + i * 40) % 240); A.alpha(ctx, 0.5 * (1 - r / 240), () => A.ring(ctx, x, y, r, i % 2 ? NORTH : SOUTH, r * 0.6, 3)); }
              // field lines pouring in from every edge
              for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + e.t * 0.3; FIELD(ctx, A, x + Math.cos(a) * 320, y + Math.sin(a) * 220, x, y, Math.sin(a * 3) * 40, e.t + i * 0.2, i % 2 ? NORTH : SOUTH); }
              const core = 1 - e.R; A.glow(ctx, x, y, 10 + core * 16, '#ffffff', 0.4 + core * 0.3); A.disc(ctx, x, y, Math.round(3 + core * 7), '#c8e0ff', '#ffffff');
              for (const j of e.junk) {
                const jx = x + Math.cos(j.a) * j.d, jy = y + Math.sin(j.a) * j.d * 0.7, ang = j.a * 2 + j.spin * e.t;
                if (j.big) JUNK(ctx, A, jx, jy, j.kind, ang); else SCRAP(ctx, A, jx, jy, j.kind, ang);
              }
            } else {
              const k = (e.t - 2.6) / 1.2;
              A.alpha(ctx, 1 - k, () => { A.ring(ctx, x, y, 20 + k * 260, '#ffffff', (20 + k * 260) * 0.7, 2); A.ring(ctx, x, y, 10 + k * 200, NORTH, (10 + k * 200) * 0.7, 2); A.ring(ctx, x, y, 5 + k * 150, SOUTH, (5 + k * 150) * 0.7, 2); });
              for (const j of e.junk) (j.big ? JUNK : SCRAP)(ctx, A, j.x + ox, j.y + oy, j.kind, j.spin * e.t * 3);
            }
          },
        }, {});
      },
    },
  };

  // ================================================================ TIME (frozen cyan, gold)
  const TC = '#5ad8ff', GOLD = '#ffd84a';
  const CLOCK = (ctx, A, x, y, r, a1, a2, col, face) => {
    if (face) A.disc(ctx, x, y, Math.round(r), face);
    A.ring(ctx, x, y, r, col);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; A.px(ctx, x + Math.cos(a) * (r - 1.5), y + Math.sin(a) * (r - 1.5), 1, 1, i % 3 ? col : '#ffffff'); }
    A.line(ctx, x, y, x + Math.cos(a1) * r * 0.55, y + Math.sin(a1) * r * 0.55, '#ffffff');
    A.line(ctx, x, y, x + Math.cos(a2) * r * 0.85, y + Math.sin(a2) * r * 0.85, col);
  };
  const GEAR = (ctx, A, x, y, r, a, col, hi) => { A.disc(ctx, x, y, Math.max(1, Math.round(r - 1)), col); for (let i = 0; i < 8; i++) { const b = a + (i / 8) * Math.PI * 2; A.px(ctx, x + Math.cos(b) * r - 1, y + Math.sin(b) * r - 1, 2, 2, col); } A.disc(ctx, x, y, Math.max(1, Math.round(r * 0.35)), hi || '#ffffff'); };
  const UP = -Math.PI / 2;
  AW.time = {
    color: TC, up: GOLD, status: 'slow', fx: 'clock', block: ['Pause Field', 'bubble'],
    icons: ['pendulum', 'hourglassTrap', 'timeBomb', 'gears', 'clockDrop'],
    look: { back(ctx, F) { const c = F.at('headTop'); CLOCK(ctx, F.A, c.x - F.d * 9, c.y + 2, 4, UP + F.t * 0.5, UP + Math.floor(F.t * 6) * (Math.PI / 30), TC, '#0a1a2a'); } },
    idle: {
      pose: (t) => IDLE.watch(t),
      fx(ctx, F) { const h = F.at('handF'), k = F.t % 1; if (k < 0.35) F.A.alpha(ctx, 1 - k / 0.35, () => F.A.ring(ctx, h.x, h.y, 2 + k * 14, TC)); F.A.px(ctx, h.x, h.y, 1, 1, GOLD); },
    },
    run: {
      pose: (ph) => RUN.brisk(ph),
      // clockwork skates
      fx(ctx, F) { for (const f of ['footF', 'footB']) { const q = F.at(f); GEAR(ctx, F.A, q.x, q.y + 1, 2, F.t * 14 * F.d, '#a8802a', GOLD); } },
      back(ctx, F) { for (let i = 1; i < 4; i++) F.A.alpha(ctx, 0.35 - i * 0.08, () => CLOCK(ctx, F.A, F.x - F.d * (6 + i * 7), F.y - 12, 4, F.t * 4, F.t * 9 + i, TC, null)); },
    },
    dash: {
      name: 'Delayed Cut', dmg: 15, life: 1.2,
      spawn(e) { e.marks = []; },
      update(e, dt, g, A) {
        const p = A.p;
        if (p.dashT > 0) { for (const t of A.targets()) if (!e.marks.some((m) => m.t === t) && Phys().rectsOverlap(t.box, { x: p.x - 10, y: p.y, w: p.w + 20, h: p.h })) { e.marks.push({ t }); if (t.applyStatus) t.applyStatus('slow', 0); A.sfx('tick', { minGap: 0.05 }); } }
        else if (!e.end) e.end = e.t;
        // the hits arrive half a second late, all at once
        for (const m of e.marks) if (!m.done && e.end && e.t - e.end > 0.45) { m.done = true; if (!m.t.dead) { A.damage(e, m.t, 1, 0.8); A.sfx('swing', { minGap: 0.05 }); } }
      },
      draw(e, ctx, ox, oy, A) {
        for (const m of e.marks) {
          if (m.t.dead) continue;
          const c = A.center(m.t), x = c.x + ox, y = c.y + oy - 16;
          if (!m.done) CLOCK(ctx, A, x, y, 5, UP, UP + (e.end ? Math.min(1, (e.t - e.end) / 0.45) : 0) * Math.PI * 2, TC, '#0a1a2a');
          else { const k = Math.min(1, (e.t - e.end - 0.45) / 0.25); A.alpha(ctx, 1 - k, () => { A.line(ctx, x - 8, y + 6, x + 8, y + 22, '#ffffff', 2); A.line(ctx, x + 8, y + 6, x - 8, y + 22, TC, 2); }); }
        }
      },
    },
    guard: {
      name: 'Pause Field', sound: 'tick',
      draw(ctx, { A, x, bot, h, t }) { const cy = bot - h / 2, r = Math.round(h / 2); A.alpha(ctx, 0.35, () => A.disc(ctx, x, cy, r, '#0a2a3a')); CLOCK(ctx, A, x, cy, r, UP, UP + Math.floor(t * 2) * 0.1, TC, null); A.alpha(ctx, 0.6, () => { A.px(ctx, x - 3, cy - 4, 2, 8, '#ffffff'); A.px(ctx, x + 1, cy - 4, 2, 8, '#ffffff'); }); },
      hit(g, x, y) { for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; dot(g, x + Math.cos(a) * 10, y + Math.sin(a) * 10, Math.cos(a) * 20, Math.sin(a) * 20, i % 3 ? TC : '#ffffff', { life: 0.6 }); } },
    },
    m1: {
      name: 'Tick-Tock', dmg: 9, cd: 0.34, kind: 'custom', life: 0.28,
      desc: 'Tick: a quick jab with a giant clock hand. Tock: a wide sweeping swing. Tick. Tock.',
      spawn(e, g, A) { const p = A.p; p._tt = ((p._tt || 0) + 1) % 2; e.n = p._tt; A.sfx(e.n ? 'tick' : 'swing', { minGap: 0.04 }); },
      update(e, dt, g, A) { H.at(e, A, 0); if (e.n === 1) H.melee(e, A, 38 * H.sc(e), 16); else H.melee(e, A, 32 * H.sc(e), 30, { mult: 1.2 }); },
      draw(e, ctx, ox, oy, A) {
        const x = e.x + ox, y = e.y + oy, d = e.dir, k = Math.min(1, e.t / 0.1), f = 1 - Math.max(0, e.t - 0.1) / 0.18;
        A.alpha(ctx, f, () => {
          if (e.n === 1) { const L = 36 * H.sc(e) * k; W.beam(ctx, A, x, y, x + d * L, y, 2, TC, '#c8f4ff'); for (let i = 0; i < 4; i++) A.px(ctx, x + d * (L + i), y - (3 - i), 1, (3 - i) * 2 + 1, GOLD); A.px(ctx, x + d * L * 0.5 - 1, y - 4, 2, 8, '#ffffff'); }
          else { W.smear(ctx, A, x, y, 24 * H.sc(e), d, k * 0.75, TC, 5, -1.4, 1.4); CLOCK(ctx, A, x + d * 6, y, 6, UP, UP + k * 6, GOLD, null); }
        });
      },
    },
    s: [
      {
        name: 'Pendulum', dmg: 14, cd: 7, mp: 6, kind: 'custom', life: 1.6,
        desc: 'A giant clock pendulum swings down in front of you, back and forth, twice. Time is relentless.',
        spawn(e, g, A) { H.at(e, A, 30); e.px = e.x; e.top = Math.max(H.sky(A, e.x, e.y - 10), e.y - 70); e.swing = 0; A.sfx('swing'); },
        update(e, dt, g, A) {
          const L = A.p.y + 18 - e.top, a = Math.sin(e.t * 4.2) * 1.1, side = Math.cos(e.t * 4.2) >= 0 ? 1 : -1;
          e.bx = e.px + Math.sin(a) * L; e.by = e.top + Math.cos(a) * L;
          if (side !== e.swing) { e.swing = side; e.hit.clear(); A.sfx('tick', { minGap: 0.1 }); }
          A.hitR(e, e.bx, e.by, 12 * H.sc(e), { kb: 1, dir: side });
        },
        draw(e, ctx, ox, oy, A) { if (e.bx === undefined) return; const f = A.fade(e, 0.15, 0.3), x0 = e.px + ox, y0 = e.top + oy, x1 = e.bx + ox, y1 = e.by + oy; A.alpha(ctx, f, () => { A.line(ctx, x0, y0, x1, y1, '#c8a040', 2); A.disc(ctx, x1, y1, Math.round(9 * H.sc(e)), '#c8a040', GOLD); A.disc(ctx, x1, y1, Math.round(4 * H.sc(e)), TC); A.px(ctx, x0 - 3, y0 - 1, 7, 2, '#8a6a2a'); }); },
      },
      {
        name: 'Hourglass', dmg: 34, cd: 10, mp: 7, kind: 'custom', life: 1.6,
        desc: 'Trap the nearest enemy inside a giant hourglass. When the sand runs out, so does its luck.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 160); e.tg = t; if (!t) { e.dead = true; return; } if (t.applyStatus) { t.applyStatus('timestop', 0); if (t.status.timestop) t.status.timestop.t = 1.2; } A.sfx('hover'); },
        update(e, dt, g, A) { if (!e.tg || e.tg.dead) { e.dead = true; return; } if (e.t > 1.15 && !e.sh) { e.sh = e.t; if (e.tg.status && e.tg.status.timestop) delete e.tg.status.timestop; A.damage(e, e.tg, 1, 1); A.sfx('shatter'); A.shake(3, 0.2); } },
        draw(e, ctx, ox, oy, A) {
          if (!e.tg) return;
          const b = e.tg.box, x = b.x + b.w / 2 + ox, bot = b.y + b.h + oy, h = b.h + 10, top = bot - h, w = b.w / 2 + 6, mid = top + h / 2;
          if (e.sh) { const k = (e.t - e.sh) / 0.45; A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 10; i++) { const a = i * 0.63; A.px(ctx, x + Math.cos(a) * (6 + k * 26), mid + Math.sin(a) * (6 + k * 26), 2, 2, i % 2 ? '#e8f8ff' : GOLD); } }); return; }
          const k = Math.min(1, e.t / 1.15);
          A.px(ctx, x - w - 1, top - 2, w * 2 + 2, 2, '#c8a040'); A.px(ctx, x - w - 1, bot, w * 2 + 2, 2, '#c8a040');
          A.alpha(ctx, 0.3, () => A.px(ctx, x - w, top, w * 2, h, '#c8f0ff'));
          for (const s of [-1, 1]) { A.line(ctx, x + s * w, top, x + s * 2, mid, '#e8f8ff'); A.line(ctx, x + s * 2, mid, x + s * w, bot, '#e8f8ff'); }
          const hw = (w - 2) * (1 - k); A.px(ctx, x - hw, top + (h / 2) * k, hw * 2 + 1, Math.max(1, (h / 2) * (1 - k)), GOLD);
          A.px(ctx, x, mid, 1, h / 2, GOLD);
          A.px(ctx, x - (w - 2) * k, bot - (h / 2) * k, (w - 2) * 2 * k + 1, Math.max(1, (h / 2) * k), GOLD);
        },
      },
      {
        name: 'Time Bomb', dmg: 40, cd: 9, mp: 7, kind: 'custom', life: 1.9,
        desc: 'Stick a ticking alarm clock on the nearest enemy. 3... 2... 1... RING.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 170); e.tg = t; if (!t) { e.dead = true; return; } e.last = A.center(t); if (t.applyStatus) t.applyStatus('slow', e.potency); A.sfx('hitMetal'); },
        update(e, dt, g, A) {
          if (!e.tg) return;
          if (!e.tg.dead) e.last = A.center(e.tg);
          const n = 3 - Math.floor(e.t / 0.45);
          if (n !== e.n && n > 0) { e.n = n; A.sfx('tick'); }
          if (e.t > 1.35 && !e.boom) { e.boom = e.t; A.blast(e, e.last.x, e.last.y, 34 * H.sc(e)); A.sfx('ding'); A.sfx('boom'); A.shake(5, 0.3); }
        },
        draw(e, ctx, ox, oy, A) {
          if (!e.tg || e.boom) return;
          const c = e.last, s = e.t > 0.9 ? Math.sin(e.t * 60) : 0, x = c.x + ox + s, y = c.y + oy - 2;
          A.disc(ctx, x, y, 5, '#c84a3a', '#ff7a6a'); A.disc(ctx, x, y, 3, '#f8f0e0'); A.px(ctx, x - 4, y - 7, 2, 2, GOLD); A.px(ctx, x + 3, y - 7, 2, 2, GOLD);
          A.line(ctx, x, y, x, y - 2, '#120c1a'); A.line(ctx, x, y, x + Math.cos(e.t * 4) * 2, y + Math.sin(e.t * 4) * 2, '#c84a3a');
          if (e.n) A.text(ctx, String(e.n), x, y - 18, '#ffffff');
        },
      },
      {
        name: 'Gear Grinder', dmg: 5, cd: 7, mp: 6, kind: 'custom', life: 1.6,
        desc: 'Two huge clockwork gears roll out along the ground, grinding up everything in their way.',
        spawn(e, g, A) { H.at(e, A, 12); e.gy = H.floor(A, e.x); e.gs = [{ x: e.x, r: 9 }, { x: e.x - e.dir * 15, r: 6 }]; A.sfx('hitMetal'); },
        update(e, dt, g, A) { for (const q of e.gs) { const r = q.r * H.sc(e), nx = q.x + e.dir * 110 * dt; if (!A.solid(nx + e.dir * r, e.gy - r)) q.x = nx; A.tickR(e, q.x, e.gy - r, r + 2, 0.15, { kb: 0.3 }); } },
        draw(e, ctx, ox, oy, A) { A.alpha(ctx, A.fade(e, 0.1, 0.3), () => { for (const q of e.gs) { const r = q.r * H.sc(e); GEAR(ctx, A, q.x + ox, e.gy + oy - r, r, (e.t * 110 / r) * e.dir, '#c8a040', TC); } }); },
      },
      {
        name: 'Grandfather Clock', dmg: 30, cd: 9, mp: 7, kind: 'custom', life: 1.6,
        desc: 'A grandfather clock falls out of nowhere onto the nearest enemy. BONG. Everything nearby slows down.',
        spawn(e, g, A) { H.at(e, A, 40); const t = A.near(A.p.cx, A.p.y, 170); if (t) e.x = A.center(t).x; e.gy = H.floor(A, e.x); e.y = Math.max(H.sky(A, e.x, e.gy - 30), e.gy - 140); e.vy = 0; A.sfx('whoosh'); },
        update(e, dt, g, A) {
          if (e.land) return;
          e.vy += 900 * dt; e.y = Math.min(e.gy, e.y + e.vy * dt);
          if (e.y >= e.gy) { e.land = e.t; A.hit(e, { x: e.x - 8, y: e.gy - 30, w: 16, h: 30 }, { kb: 0.6 }); A.hitR(e, e.x, e.gy - 6, 44 * H.sc(e), { mult: 0.4, kb: 0.3, onHit(t) { if (t.applyStatus) t.applyStatus('slow', e.potency); } }); A.sfx('crash'); A.sfx('ding'); A.shake(5, 0.3); }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy;
          A.alpha(ctx, A.fade(e, 0.05, 0.35), () => { A.px(ctx, x - 7, y - 30, 14, 30, '#6a3a1a'); A.px(ctx, x - 8, y - 32, 16, 3, '#8a5a2a'); A.px(ctx, x - 7, y - 30, 14, 1, '#a8703a'); CLOCK(ctx, A, x, y - 23, 5, UP + e.t, UP + e.t * 6, '#c8a040', '#f8f0e0'); A.px(ctx, x - 3, y - 14, 6, 11, '#2a1408'); const sw = Math.sin(e.t * 6) * 2; A.line(ctx, x, y - 14, x + sw, y - 6, GOLD); A.px(ctx, x + sw - 1, y - 7, 3, 3, GOLD); });
          if (e.land) { const k = (e.t - e.land) / 0.5, r = 6 + k * 44 * H.sc(e); if (k < 1) A.alpha(ctx, 1 - k, () => A.ring(ctx, x, e.gy + oy - 6, r, TC, r * 0.3)); }
        },
      },
    ],
    ult: {
      name: 'Zero Hour', dmg: 10,
      desc: 'Stop time. Everything freezes except you: walk up to your enemies and line up your attacks. When time starts again, every single one lands at once.',
      charge: {
        pose: () => J({ FA: [[11, 12], [11.4, 7.6]], BA: [[6, 13.6], [3, 13.6]] }),
        lift: 6,
        draw(ctx, x, y, k, t, A) { const r = 10 + k * 30, sp = (1 - k) * 30 + 1; A.alpha(ctx, 0.25 + 0.4 * k, () => CLOCK(ctx, A, x, y - 14, r, UP + t * sp * 0.08, UP + t * sp, TC, '#06121c')); if (k > 0.95) A.alpha(ctx, 0.5, () => A.px(ctx, x - 300, y - 200, 600, 400, '#c8d8ff')); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 4.6, layer: 'screen',
          spawn(e) {
            e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t);
            for (const t of e.ts) if (t.applyStatus) { t.applyStatus('timestop', 0); if (t.status.timestop) t.status.timestop.t = 3.1; }
            for (const b of A.g.bolts) { b._v = [b.vx, b.vy]; b.vx = 0; b.vy = 0; }
            // hits already waiting next to the closest few: even standing still, these land
            e.marks = e.ts.slice(0, 4).map((t, i) => ({ t, x: A.center(t).x + (i % 2 ? 14 : -14), f: t.box.y + t.box.h, d: i % 2 ? -1 : 1, auto: true }));
            A.sfx('time');
          },
          update(e, dt, g, A) {
            if (e.t < 3) {
              // walk through the frozen moment, lining up a hit on everything you pass
              for (const t of e.ts) if (!t.dead && !e.marks.some((m) => m.t === t && !m.auto) && Math.abs(A.center(t).x - p.cx) < 34 && Math.abs(A.center(t).y - (p.y + 10)) < 30) { e.marks.push({ t, x: p.cx, f: p.feet, d: p.facing }); A.sfx('tick', { minGap: 0.08 }); }
              for (const b of A.g.bolts) if (!b._v) { b._v = [b.vx, b.vy]; b.vx = 0; b.vy = 0; }
            } else if (!e.go) {
              e.go = e.t; A.flash(0.4); A.sfx('boom');
              for (const t of e.ts) if (t.status && t.status.timestop) delete t.status.timestop;
              for (const b of A.g.bolts) if (b._v) { b.vx = b._v[0]; b.vy = b._v[1]; delete b._v; }
            }
            if (e.go) {
              // ...and time starts again: every hit in one chain
              const n = Math.floor((e.t - e.go) / 0.07);
              for (let i = 0; i < Math.min(n + 1, e.marks.length); i++) { const m = e.marks[i]; if (m.done) continue; m.done = e.t; if (!m.t.dead) { A.damage(e, m.t, m.auto ? 3 : 2.2, 0.6); A.shake(3, 0.08); A.sfx('punchHit', { minGap: 0.03 }); } }
              if (!e.fin && e.t - e.go > e.marks.length * 0.07 + 0.25) { e.fin = true; for (const t of e.ts) if (!t.dead) A.damage(e, t, 2.5, 1); A.sfx('crash'); A.shake(8, 0.4); }
            }
          },
          onEnd(e) { for (const b of A.g.bolts) if (b._v) { b.vx = b._v[0]; b.vy = b._v[1]; delete b._v; } for (const t of e.ts) if (t.status && t.status.timestop) delete t.status.timestop; },
          draw(e, ctx, ox, oy, A) {
            const frozen = !e.go, k = frozen ? Math.min(1, e.t / 0.3) : Math.max(0, 1 - (e.t - e.go) / 0.4);
            if (k > 0) {
              ctx.save(); ctx.globalAlpha *= 0.6 * k; ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(-10, -10, 2000, 2000); ctx.restore();
              A.alpha(ctx, 0.16 * k, () => A.px(ctx, -10, -10, 2000, 2000, TC));
            }
            // you're the only thing still in colour
            if (frozen) { p.render(ctx, { ix: -ox, iy: -oy }); const cx = view(A).width / 2; CLOCK(ctx, A, cx, 26, 14, UP, UP, TC, '#06121c'); A.text(ctx, (3 - Math.min(2.99, e.t)).toFixed(1), cx, 46, '#ffffff'); }
            for (const m of e.marks) {
              if (m.t.dead && !m.done) continue;
              const c = A.center(m.t), cx = c.x + ox, cy = c.y + oy;
              if (!m.done) { A.alpha(ctx, 0.55, () => H.drawGhost(ctx, A, 'attack', m.x + ox, m.f + oy, m.d, TC)); A.alpha(ctx, 0.7, () => A.line(ctx, m.x + ox + m.d * 6, m.f + oy - 12, cx, cy, '#ffffff')); }
              else { const q = (e.t - m.done) / 0.25; if (q < 1) A.alpha(ctx, 1 - q, () => { A.line(ctx, cx - 10, cy - 10, cx + 10, cy + 10, '#ffffff', 2); A.line(ctx, cx + 10, cy - 10, cx - 10, cy + 10, TC, 2); A.ring(ctx, cx, cy, 4 + q * 16, '#ffffff'); }); }
            }
          },
        }, {});
      },
    },
  };

  // ============================================================ GRAVITY (event-horizon orange)
  const GO = '#ff6a3a', GV = '#a04aff';
  const ROCK = (ctx, A, x, y, s, c) => { A.px(ctx, x - s, y - s + 1, s * 2, s * 2 - 1, c || '#6a5a6a'); A.px(ctx, x - s + 1, y - s, s * 2 - 2, 1, '#9a8a9a'); };
  // a black hole with its accretion disc (the near half passes in front)
  const BH = (ctx, A, x, y, r, t, tilt) => {
    tilt = tilt || 0.3;
    for (let i = 0; i < 3; i++) { const rr = r * (1.5 + i * 0.35); A.ring(ctx, x, y, rr, i % 2 ? GO : '#ffd8a0', rr * tilt, 2); }
    A.disc(ctx, x, y, Math.max(1, Math.round(r)), '#000000');
    A.ring(ctx, x, y, r + 1, GO);
    for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI, rr = r * 1.6; A.px(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr * tilt, 2, 1, (i + Math.floor(t * 20)) % 3 ? GO : '#ffffff'); }
  };
  AW.gravity = {
    color: GO, up: GV, status: 'heavy', fx: 'rocks', block: ['Gravity Lens', 'bubble'],
    icons: ['planetoid', 'tidalLock', 'gravSpears', 'orbitalRing', 'collapse'],
    look: { back(ctx, F) { for (let i = 0; i < 4; i++) { const k = (F.t * 0.4 + i / 4) % 1; F.A.alpha(ctx, Math.sin(k * Math.PI), () => ROCK(ctx, F.A, F.x + Math.sin(i * 2.1) * 10, F.ground - 2 - k * 20, i % 2 ? 1 : 1.5, '#5a4a5a')); } } },
    idle: {
      // the superhero landing: one knee down, fist in the floor, floor cracked
      pose: (t) => IDLE.kneel(t),
      fx(ctx, F) { const h = F.at('handF'), A = F.A, gy = F.ground; for (let i = 0; i < 4; i++) { const s = i % 2 ? 1 : -1; A.line(ctx, h.x, gy, h.x + s * (3 + i * 2), gy + 1 + (i > 1 ? 1 : 0), '#2a1a2a'); } A.alpha(ctx, 0.35 + 0.15 * Math.sin(F.t * 2), () => A.ring(ctx, h.x, gy, 8, GO, 2)); },
    },
    run: {
      pose: (ph) => RUN.heavy(ph),
      step(A, p) { if (W.footfall(p)) { A.g.dust(p.cx, p.feet, 4); W.emit(A, { life: 0.7, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => { A.line(ctx, e.x + ox - 4, e.y + oy, e.x + ox + 4, e.y + oy, '#2a1a2a'); A.px(ctx, e.x + ox - 1, e.y + oy - 1, 2, 1, '#2a1a2a'); }); } }, { x: p.cx, y: p.feet }); } },
    },
    dash: {
      name: 'Gravity Slide', dmg: 14, life: 0.9,
      spawn(e, g, A) { A.sfx('hover', { minGap: 0.1 }); },
      update(e, dt, g, A) {
        const p = A.p;
        if (p.dashT > 0) { e.hx = p.cx + p.facing * 26; e.hy = p.y + 10; for (const o of H.nearby(A, p.cx, p.y + 10, 40)) if (movable(o.t)) o.t.vx = U.approach(o.t.vx, p.vx, 8, dt); }
        else if (!e.pop) { e.pop = e.t; if (e.hx === undefined) { e.hx = p.cx + p.facing * 26; e.hy = p.y + 10; } A.hitR(e, e.hx, e.hy, 24, { kb: 1.2, onHit(t) { if (t.applyStatus) t.applyStatus('heavy', 0); } }); A.sfx('thud', { minGap: 0.1 }); A.shake(2, 0.1); }
      },
      draw(e, ctx, ox, oy, A) {
        if (e.hx === undefined) return;
        const x = e.hx + ox, y = e.hy + oy;
        if (!e.pop) { BH(ctx, A, x, y, 3, e.t, 0.35); for (let i = 0; i < 6; i++) { const a = i * 1.05 + e.t * 8, r = 16 - ((e.t * 60 + i * 5) % 16); A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, 1, 1, GO); } }
        else { const k = (e.t - e.pop) / 0.4; if (k < 1) A.alpha(ctx, 1 - k, () => { A.ring(ctx, x, y, 3 + k * 24, GO, 3 + k * 24); A.ring(ctx, x, y, 2 + k * 16, '#ffffff', (2 + k * 16) * 0.5); }); }
      },
    },
    guard: {
      name: 'Gravity Lens', sound: 'boom',
      draw(ctx, { A, x, bot, h, t }) { const cy = bot - h / 2; for (let i = 0; i < 4; i++) { const r = 16 - ((t * 10 + i * 4) % 16); A.alpha(ctx, 0.3 + 0.5 * (1 - r / 16), () => A.ring(ctx, x, cy, r, i % 2 ? GO : GV, r * 1.3)); } A.disc(ctx, x, cy, 2, '#000000'); },
      hit(g, x, y) { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; dot(g, x + Math.cos(a) * 16, y + Math.sin(a) * 16, -Math.cos(a) * 70, -Math.sin(a) * 70, i % 2 ? GO : '#6a5a6a', { life: 0.25 }); } },
    },
    m1: {
      name: 'Heavy Fist', dmg: 9, cd: 0.38, kind: 'custom', life: 0.3,
      desc: 'Punches that weigh about a ton each. Every third one drops a little gravity well that drags enemies in, then pops.',
      spawn(e, g, A) {
        const p = A.p; p._hf = ((p._hf || 0) + 1) % 3; e.n = p._hf; A.sfx(e.n === 0 ? 'thud' : 'punchHit', { minGap: 0.04 });
        if (e.n !== 0) return;
        A.spawn(e, {
          life: 0.7,
          update(w, dt, g, A) { for (const o of H.nearby(A, w.x, w.y, 56)) if (movable(o.t)) o.t.vx = U.approach(o.t.vx, Math.sign(w.x - o.c.x) * 120, 6, dt); },
          onEnd(w, A) { A.hitR(w, w.x, w.y, 22 * H.sc(w), { mult: 0.8, kb: 0.8 }); A.spawn(w, W.SHOCK, { x: w.x, y: w.y, r: 22, dmg: 0, life: 0.3, c: GV }); },
          draw(w, ctx, ox, oy, A) { const k = w.t / w.life; BH(ctx, A, w.x + ox, w.y + oy, 3 + Math.sin(k * Math.PI) * 4, w.t, 0.3); A.alpha(ctx, 0.6 * (1 - k), () => A.ring(ctx, w.x + ox, w.y + oy, 22 - k * 16, GO, (22 - k * 16) * 0.5)); },
        }, { x: p.cx + p.facing * 26, y: p.y + 12 });
      },
      update(e, dt, g, A) { H.at(e, A, 0); if (e.n === 0) A.hitR(e, e.x + e.dir * 18, e.y + 4, 18 * H.sc(e), { mult: 1.6, kb: 0.4, onHit(t) { if (t.applyStatus) t.applyStatus('heavy', 0); } }); else H.melee(e, A, 32 * H.sc(e), 22, { kb: 0.6, onHit(t) { if (movable(t)) t.vy = Math.max(t.vy, 200); } }); },
      draw(e, ctx, ox, oy, A) {
        const k = e.t / e.life, d = e.dir, x = e.x + ox + d * (10 + 12 * Math.min(1, k * 4)), y = e.y + oy;
        A.alpha(ctx, 1 - k, () => {
          A.alpha(ctx, 0.35, () => A.disc(ctx, x, y, 7, GV));
          A.disc(ctx, x, y, 5, '#4a3a4a', '#8a7a8a');
          for (let i = 0; i < 5; i++) A.px(ctx, x - 4 + i * 2, y + 6 + ((e.t * 60 + i * 4) % 8), 1, 3, i % 2 ? GO : GV);
          if (e.n === 0) A.ring(ctx, x + d * 8, y + 4, 4 + k * 18, GO, (4 + k * 18) * 0.5);
        });
      },
    },
    s: [
      {
        name: 'Planetoid', dmg: 30, cd: 8, mp: 7, kind: 'custom', life: 2,
        desc: 'Pull a little planet out of the ground (it even has a ring), hold it over your head, and throw it.',
        spawn(e, g, A) { A.sfx('rumble', { dur: 0.4 }); },
        update(e, dt, g, A) {
          const p = A.p;
          if (e.t < 0.45) { e.x = p.cx; e.y = p.y - 12 - e.t * 10; e.dir = p.facing; return; }
          if (!e.thrown) { e.thrown = true; e.vx = e.dir * 200; e.vy = -110; A.sfx('whoosh'); }
          e.vy += 420 * dt; e.x += e.vx * dt; e.y += e.vy * dt;
          const R = 7 * H.sc(e), hit = A.targets().some((t) => Phys().rectsOverlap(t.box, { x: e.x - R, y: e.y - R, w: R * 2, h: R * 2 }));
          if (hit || A.solid(e.x, e.y + R) || e.t > 1.9) { A.blast(e, e.x, e.y, 32 * H.sc(e)); A.shake(5, 0.3); A.sfx('crash'); e.dead = true; }
        },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, r = Math.max(1, Math.round(7 * H.sc(e) * Math.min(1, e.t / 0.3))); A.ring(ctx, x, y, r + 5, '#c8a8d8', (r + 5) * 0.3); A.disc(ctx, x, y, r, '#6a5a8a', '#9a8aba'); A.px(ctx, x - r / 2, y - 1, 2, 2, '#4a3a6a'); for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI; A.px(ctx, x + Math.cos(a) * (r + 5), y + Math.sin(a) * (r + 5) * 0.3, 1, 1, '#e8d8f8'); } },
      },
      {
        name: 'Tidal Lock', dmg: 8, cd: 9, mp: 7, kind: 'custom', life: 2.6,
        desc: 'Lock the nearest enemy into orbit around you. It gets dragged wherever you go, crushed the whole time and smashed into anything it passes, until you slam it down.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 140); e.tg = t; if (!t) { e.dead = true; return; } holdStun(t, 2.5); A.sfx('hover'); },
        update(e, dt, g, A) {
          const p = A.p, t = e.tg; if (!t || t.dead) { e.dead = true; return; }
          e.ct = (e.ct || 0) - dt;
          if (e.t < 2.2) {
            if (movable(t)) { const a = e.t * 2.4, tx = p.cx + Math.cos(a) * 30 - t.box.w / 2, ty = p.y + 4 + Math.sin(a) * 10 - t.box.h / 2; t.vx = U.clamp((tx - t.x) * 8, -260, 260); floatV(t, U.clamp((ty - t.y) * 8, -260, 260), dt); }
            if (e.ct <= 0) { e.ct = 0.45; A.damage(e, t, 1, 0); }
            const c = A.center(t); A.tickR(e, c.x, c.y, 14, 0.35, { kb: 0.8 });
          } else if (!e.slam) { e.slam = true; if (movable(t)) t.vy = 400; A.damage(e, t, 2.5, 0.4); const c = A.center(t); W.boom(A, e, c.x, c.y + 6, 30 * H.sc(e)); A.sfx('crash'); }
        },
        draw(e, ctx, ox, oy, A) {
          if (!e.tg) return;
          const p = A.p, c = A.center(e.tg);
          A.alpha(ctx, A.fade(e, 0.1, 0.3), () => {
            A.alpha(ctx, 0.25, () => A.ring(ctx, p.cx + ox, p.y + 14 + oy, 30, GV, 10, 2));
            let lx = p.cx + ox, ly = p.y + 10 + oy;
            for (let i = 1; i <= 14; i++) { const q = i / 14, nx = U.lerp(p.cx, c.x, q) + ox, ny = U.lerp(p.y + 10, c.y, q) + oy + Math.sin(q * Math.PI * 3 + e.t * 12) * 3; A.line(ctx, lx, ly, nx, ny, i % 2 ? GO : GV, 2); lx = nx; ly = ny; }
            A.alpha(ctx, 0.3, () => A.disc(ctx, c.x + ox, c.y + oy, 12, GV));
            for (let r = 0; r < 2; r++) A.ring(ctx, c.x + ox, c.y + oy, 10 + r * 4 + Math.sin(e.t * 8 + r), r ? GV : GO, 4 + r * 2);
          });
        },
      },
      {
        name: 'Graviton Spears', dmg: 13, cd: 7, mp: 6, kind: 'custom', life: 1.4,
        desc: 'Spears of crushed gravity fall out of the sky in a line in front of you, one after another.',
        spawn(e, g, A) { H.at(e, A, 0); e.sp = []; for (let i = 0; i < (e.up ? 6 : 5); i++) { const x = e.x + e.dir * (24 + i * 18), gy = H.floor(A, x); e.sp.push({ x, gy, top: Math.max(H.sky(A, x, gy - 20), gy - 120), d: i * 0.1 }); } A.sfx('hover'); },
        update(e, dt, g, A) { for (const s of e.sp) if (!s.hit && e.t > s.d + 0.18) { s.hit = true; A.hit(e, { x: s.x - 6, y: s.gy - 26, w: 12, h: 26 }, { kb: 0.3, onHit(t) { if (t.applyStatus) t.applyStatus('heavy', e.potency); } }); e.hit.clear(); A.sfx('thud', { minGap: 0.05 }); } },
        draw(e, ctx, ox, oy, A) {
          for (const s of e.sp) {
            if (e.t < s.d) continue;
            const q = Math.min(1, (e.t - s.d) / 0.18), f = e.t > s.d + 0.7 ? Math.max(0, 1 - (e.t - s.d - 0.7) / 0.3) : 1, x = s.x + ox, tip = U.lerp(s.top, s.gy + 2, q) + oy;
            A.alpha(ctx, f, () => { A.line(ctx, x, tip - 22, x, tip - 4, GV, 3); A.line(ctx, x, tip - 22, x, tip - 4, '#e0c8ff'); A.tri(ctx, x, tip - 5, 6, -6, GV, '#ffffff'); if (q < 1) A.alpha(ctx, 0.4, () => A.line(ctx, x, s.top + oy, x, tip - 22, GV)); else A.alpha(ctx, 0.6, () => A.ring(ctx, x, s.gy + oy, 6, GO, 2)); });
          }
        },
      },
      {
        name: 'Orbital Ring', dmg: 6, cd: 10, mp: 7, kind: 'custom', life: 3.2,
        desc: 'Give yourself a planetary ring: a wide band of rubble that orbits you and smashes anything it passes.',
        spawn(e, g, A) { e.n = e.up ? 20 : 16; A.sfx('rumble', { dur: 0.5 }); },
        update(e, dt, g, A) { const p = A.p, R = 40 * H.sc(e); e.x = p.cx; e.y = p.y + 10; for (let i = 0; i < e.n; i++) { const a = e.t * 2.2 + (i / e.n) * Math.PI * 2; A.tickR(e, e.x + Math.cos(a) * R, e.y + Math.sin(a) * R * 0.25, 7, 0.3, { kb: 0.4 }); } },
        draw(e, ctx, ox, oy, A) {
          const R = 40 * H.sc(e) * Math.min(1, e.t / 0.3), f = A.fade(e, 0.3, 0.4), x = e.x + ox, y = e.y + oy;
          A.alpha(ctx, f, () => {
            A.alpha(ctx, 0.25, () => { A.ring(ctx, x, y, R, '#c8a8d8', R * 0.25); A.ring(ctx, x, y, R - 3, '#8a6a9a', (R - 3) * 0.25); });
            for (let i = 0; i < e.n; i++) { const a = e.t * 2.2 + (i / e.n) * Math.PI * 2, rx = x + Math.cos(a) * R, ry = y + Math.sin(a) * R * 0.25; ROCK(ctx, A, rx, ry, i % 3 ? 2 : 3, i % 2 ? '#6a5a6a' : '#8a6a5a'); A.alpha(ctx, 0.4, () => A.px(ctx, rx - Math.sin(a) * 4, ry, 2, 1, '#c8a8d8')); }
          });
        },
      },
      {
        name: 'Collapse', dmg: 5, cd: 9, mp: 7, kind: 'custom', life: 1.8,
        desc: 'Multiply gravity by ten in a patch of ground ahead. It caves in and pins everything inside... then rebounds and throws them all up.',
        spawn(e, g, A) { H.at(e, A, 44); const ax = A.aim(e, 120); if (ax !== null) e.x = ax; e.gy = H.floor(A, e.x); e.R = 34 * H.sc(e); A.sfx('rumble', { dur: 1.2 }); },
        update(e, dt, g, A) {
          const box = { x: e.x - e.R, y: e.gy - 30, w: e.R * 2, h: 30 };
          if (e.t < 1.3) A.tick(e, box, 0.15, { kb: 0, onHit(t) { if (t.applyStatus) { t.applyStatus('heavy', 0); holdStun(t, 0.3); } } });
          else if (!e.reb) { e.reb = e.t; e.hit.clear(); A.hit(e, box, { mult: 3, kb: 0.4, onHit(t) { if (t.applyStatus) t.applyStatus('launch', 0); } }); A.sfx('boom'); A.shake(5, 0.3); }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, gy = e.gy + oy, R = e.R;
          A.alpha(ctx, A.fade(e, 0.1, 0.4), () => {
            const d = e.t < 1.3 ? Math.min(1, e.t / 0.3) * 5 : Math.max(0, 5 - (e.t - 1.3) * 30);
            A.px(ctx, x - R, gy, R * 2, Math.max(1, d), '#14081a');
            for (let i = 0; i < 7; i++) { const xx = x - R + (i / 6) * R * 2; A.line(ctx, xx, gy - 30, xx, gy - 30 + ((e.t * 120 + i * 9) % 30), GV); }
            A.alpha(ctx, 0.25, () => A.px(ctx, x - R, gy - 30, R * 2, 30, GV));
            if (e.reb) { const k = (e.t - e.reb) / 0.5; A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 7; i++) A.line(ctx, x - R + (i / 6) * R * 2, gy, x - R + (i / 6) * R * 2, gy - 10 - k * 40, GO); }); }
          });
        },
      },
    ],
    ult: {
      name: 'Planetfall', dmg: 10, cinema: false,
      desc: 'Tear a hole in the sky. A black hole pours out, swallows the light, rips up the ground and drags every enemy into the air... then it collapses into a single point, and the whole world goes off like a bomb.',
      charge: {
        pose: () => J({ lean: -1, bob: 1, FL: [[10.6, 19.4], [11.6, 22]], BL: [[6, 19.4], [5, 22]], FA: [[11.6, 11], [13, 7]], BA: [[5.6, 11], [4, 7]], fist: true }),
        lift: 2,
        draw(ctx, x, y, k, t, A) { A.alpha(ctx, 0.5 * k, () => A.px(ctx, x - 300, y - 200, 600, 400, '#05020a')); BH(ctx, A, x, y - 44, 2 + k * 18, t, 0.3); for (let i = 0; i < 14; i++) { const kk = (t * 0.8 + i / 14) % 1; A.alpha(ctx, 1 - kk, () => ROCK(ctx, A, x - 40 + i * 6, y + 20 - kk * 64 * k, i % 3 ? 1 : 2)); } },
      },
      // a whole cinematic: the sky tears, the hole opens, everything gets dragged in, it collapses... PLANETFALL
      run(A, e0) {
        const p = A.p, T1 = 0.7, T2 = 3.2, T3 = 3.85, BOOM = 4.05;
        W.hold(A, (t) => J({ lean: t < BOOM ? -1 : 2, FL: [[10.6, 19], [11.6, 22]], BL: [[6, 19], [5, 22]], FA: t < BOOM ? [[11.6, 10.6], [13.2, 6.6]] : [[12.4, 13], [15.4, 12.6]], BA: t < BOOM ? [[5.6, 10.6], [4, 6.6]] : [[11.6, 13.2], [14.6, 13]], fist: t > BOOM }), 3, 6.4);
        A.spawn(e0, {
          life: 6.6, layer: 'screen',
          spawn(e) {
            e.ts = H.nearby(A, p.cx, p.y, 380).map((o) => o.t);
            const c = e.ts[0] ? A.center(e.ts[0]) : { x: p.cx + e.dir * 100, y: p.y };
            e.cx = U.lerp(p.cx, c.x, 0.65); e.cy = Math.max(A.top() + 64, p.y - 96); e.r = 0;
            e.rocks = []; e.debris = []; e.rt = 0;
            A.sfx('bhTear'); A.sfx('bhOpen', { dur: T3 - 0.15 }); A.sfx('rumble', { dur: 4 });
          },
          update(e, dt, g, A) {
            const t = e.t, ease = W.ease;
            // the camera: letterbox in, a slow push towards the hole, a hard push at the collapse... and it snaps back at the blast
            const push = ease(Math.max(0, t - T2) / (BOOM - T2));
            const zoom = t < BOOM ? 1 + 0.22 * ease(t / T2) + 0.5 * push : 1 + 0.18 * Math.max(0, 1 - (t - BOOM) / 0.3);
            const fx = U.lerp((p.cx + e.cx) / 2, e.cx, t < BOOM ? push : 0), fy = U.lerp(p.y - 10, e.cy, t < BOOM ? 0.35 + 0.65 * push : 0.3);
            e.cam = g.ultCam = { x: fx, y: fy, zoom, bars: t < 0.5 ? t / 0.5 : t > 5.9 ? Math.max(0, 1 - (t - 5.9) / 0.6) : 1, t: g.t };
            // the hole: a tear, then it opens and grows... and collapses into a point
            e.r = t < T1 ? 0 : t < T2 ? 4 + 70 * W.easeOut((t - T1) / (T2 - T1)) : t < T3 ? 1 + 73 * (1 - W.easeIn((t - T2) / (T3 - T2))) : t < BOOM ? 1 : 0;
            if (t > T1 && t < T3) {
              // drag everything in: enemies spiral up into the air, shots bend in, the ground itself gets ripped up
              const pull = Math.min(1, (t - T1) / 1.2);
              for (const tg of e.ts) if (!tg.dead && !tg.tutorial) { const c = A.center(tg), a = Math.atan2(e.cy - c.y, e.cx - c.x), sp = Math.min(190, Math.hypot(e.cx - c.x, e.cy - c.y) * 1.8) * pull; tg.vx = Math.cos(a) * sp - Math.sin(a) * 50 * pull; floatV(tg, Math.sin(a) * sp + Math.cos(a) * 50 * pull, dt); }
              A.tickR(e, e.cx, e.cy, 260, 0.25, { mult: 0.6, kb: 0, onHit(tt) { if (tt.applyStatus) tt.applyStatus('heavy', e.potency); } });
              for (const b of A.g.bolts) { b.vx = U.approach(b.vx, (e.cx - b.x) * 3, 5, dt); b.vy = U.approach(b.vy, (e.cy - b.y) * 3, 5, dt); if (Math.hypot(b.x - e.cx, b.y - e.cy) < e.r + 6) b.dead = true; }
              e.rt -= dt; if (e.rt <= 0) { e.rt = 0.025; const x = e.cx + A.rnd(-280, 280); e.rocks.push({ x, y: A.ground(x, p.y + 2), s: Math.random() < 0.25 ? 2.5 + Math.random() * 3 : 1 + Math.random() * 1.2, t: 0, c: Math.random() < 0.5 ? '#5a4a5a' : '#7a5a4a' }); }
              A.shake(1 + 4 * pull, 0.06);
            }
            for (const k of e.rocks) { k.t += dt; const a = Math.atan2(e.cy - k.y, e.cx - k.x), sp = 40 + 300 * Math.min(1, k.t / 1.1); k.x += (Math.cos(a) - Math.sin(a) * 0.7) * sp * dt; k.y += (Math.sin(a) + Math.cos(a) * 0.7) * sp * dt; }
            e.rocks = e.rocks.filter((k) => Math.hypot(k.x - e.cx, k.y - e.cy) > Math.max(4, e.r * 0.9) && k.t < 4);
            // ...the silence before it goes
            if (t > T2 && !e.col) { e.col = true; A.sfx('bhCollapse'); }
            if (t > T3 && !e.hush) { e.hush = true; A.sfx('bhPoint'); }
            // PLANETFALL
            if (t > BOOM && !e.boom) {
              e.boom = true;
              A.hitR(e, e.cx, e.cy, 480, { mult: 16, kb: 2.5, onHit(tt) { if (tt.applyStatus) tt.applyStatus('launch', 0); } });
              if (g.impact) g.impact(0.16);
              A.flash(1); A.shake(24, 1.2);
              A.sfx('bhBoom'); A.sfx('crash'); A.sfx('rumble', { dur: 1.8 });
              for (let i = 0; i < 80; i++) { const a = Math.random() * Math.PI * 2, sp = A.rnd(160, 560); e.debris.push({ x: e.cx, y: e.cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, s: Math.random() < 0.3 ? 2 + Math.random() * 3 : 1, c: [GO, '#ffd8a0', '#5a4a5a', '#ffffff', GV][i % 5] }); }
            }
            for (const k of e.debris) { k.vy += 380 * dt; k.x += k.vx * dt; k.y += k.vy * dt; }
            if (t > 5.9 && A.p.ultHold) W.release(A);
          },
          onEnd(e) { if (A.g.ultCam === e.cam) A.g.ultCam = null; if (A.p.ultHold) W.release(A); },
          draw(e, ctx, ox, oy, A) {
            const t = e.t, x = e.cx + ox, y = e.cy + oy, V = view(A);
            // the light drains out of the world
            const dark = t < BOOM ? Math.min(0.94, 0.3 + t * 0.15 + (t > T3 ? (t - T3) * 3 : 0)) : Math.max(0, 0.6 - (t - BOOM) * 0.3);
            A.alpha(ctx, dark, () => A.px(ctx, -10, -10, 2000, 2000, '#05020a'));
            // the sky tears open
            if (t < T1 + 0.2) { const k = Math.min(1, t / T1); A.alpha(ctx, Math.min(1, (T1 + 0.2 - t) * 5), () => { A.jag(ctx, x - 50 * k, y, x + 50 * k, y, '#ffd8a0', 5, 3); A.jag(ctx, x - 46 * k, y, x + 46 * k, y, '#000000', 4, 2); }); }
            if (!e.boom) {
              // space bending in towards it
              for (let i = 0; i < 6; i++) { const rr = 200 - ((t * 80 + i * 34) % 200); A.alpha(ctx, 0.55 * (1 - rr / 200), () => A.ring(ctx, x, y, rr + e.r, i % 2 ? GV : GO, (rr + e.r) * 0.8, 2)); }
              // light being torn into it
              for (let i = 0; i < 16; i++) { const a = i * 0.39 + t * 2, d = (30 + e.r * 2.8) * (1 - ((t * 1.4 + i / 16) % 1)); A.line(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.55, x + Math.cos(a) * (d + 10), y + Math.sin(a) * (d + 10) * 0.55, i % 2 ? '#ffd8a0' : GO, 2); }
              for (const k of e.rocks) ROCK(ctx, A, k.x + ox, k.y + oy, k.s, k.c);
              if (e.r > 0.5) BH(ctx, A, x, y, e.r, t, 0.28);
              // the single point it all collapsed into
              if (t > T3) { const k = (t - T3) / (BOOM - T3); A.glow(ctx, x, y, 2 + k * 8, '#ffffff', 0.5 + k * 0.5); A.px(ctx, x - 1, y - 1, 3, 3, '#ffffff'); }
            } else {
              const k = Math.min(1, (t - BOOM) / (e.life - BOOM));
              A.alpha(ctx, Math.max(0, 1 - k * 3), () => A.disc(ctx, x, y, Math.round(20 + k * 340), '#ffffff', '#fff4e0'));
              for (let i = 0; i < 5; i++) { const rr = 10 + k * (V.width * 1.3 - i * 70); A.alpha(ctx, 1 - k, () => A.ring(ctx, x, y, rr, [GO, '#ffffff', GV, '#ffd8a0', GO][i], rr * 0.72, 2)); }
              A.alpha(ctx, 1 - k, () => { for (const d2 of e.debris) A.px(ctx, d2.x + ox - d2.s / 2, d2.y + oy - d2.s / 2, d2.s, d2.s, d2.c); });
              // the ground ripples out from under it
              const gy = p.feet + oy; A.alpha(ctx, Math.max(0, 1 - k * 2), () => { for (let i = 0; i < 3; i++) { const w = k * V.width * (1.4 - i * 0.3); A.px(ctx, x - w, gy - 2 - i, w * 2, 1, i ? GO : '#ffffff'); } });
            }
          },
        }, {});
      },
    },
  };

  // ================================================================= SOUND (neon magenta)
  const SN = '#ff3ad0', SC = '#3affe0';
  const NOTE = (ctx, A, x, y, c) => { A.px(ctx, x, y - 4, 1, 5, c); A.px(ctx, x - 2, y, 2, 2, c); A.px(ctx, x + 1, y - 4, 2, 1, c); };
  const WAVE = (ctx, A, x, y, r, d, c, spread) => A.arc(ctx, x, y, r, d, c, 1, -(spread || 0.9), spread || 0.9);
  const EQ = (ctx, A, x, y, n, t, h, cols) => { for (let i = 0; i < n; i++) { const v = Math.abs(Math.sin(t * (5 + i * 1.3) + i * 2)) * h + 1; A.px(ctx, x + i * 2, y - v, 1, v, cols[i % cols.length]); } };
  AW.sound = {
    color: SN, up: SC, status: 'deafen', fx: 'notes', block: ['Noise Wall', 'shield'],
    icons: ['subwoofer', 'drumline', 'feedback', 'resonance', 'micDrop'],
    // awakened sound wears headphones. obviously.
    look: { fx(ctx, F) { const A = F.A, e = F.at('eye'), h = F.at('headTop'), ex = e.x - F.d * 4; A.line(ctx, ex, e.y - 2, h.x - F.d, h.y - 1, '#2a2a3a'); A.line(ctx, h.x - F.d, h.y - 1, h.x + F.d * 3, h.y, '#2a2a3a'); A.px(ctx, ex - 1, e.y - 1, 3, 3, SN); A.px(ctx, ex, e.y, 1, 1, SC); } },
    idle: {
      pose: (t) => IDLE.headbang(t),
      fx(ctx, F) { EQ(ctx, F.A, F.x + F.d * 12 - 4, F.ground, 5, F.t, 6, [SN, SC, '#ffffff']); const k = (F.t * 0.7) % 1, h = F.at('headTop'); F.A.alpha(ctx, 1 - k, () => NOTE(ctx, F.A, h.x - F.d * 6 + Math.sin(k * 6) * 2, h.y - k * 14, k < 0.5 ? SN : SC)); },
    },
    run: {
      pose: (ph) => RUN.groove(ph),
      back(ctx, F) { for (let i = 1; i < 6; i++) F.A.alpha(ctx, 0.8 - i * 0.14, () => NOTE(ctx, F.A, F.x - F.d * i * 5, F.y - 10 - Math.sin(F.t * 8 + i) * 3, i % 2 ? SN : SC)); },
    },
    dash: {
      name: 'Echo Dash', dmg: 10, life: 1.1,
      spawn(e) { e.ec = []; },
      update(e, dt, g, A) {
        const p = A.p;
        if (p.dashT > 0) { e.et = (e.et || 0) - dt; if (e.et <= 0 && e.ec.length < 3) { e.et = 0.05; e.ec.push({ x: p.cx, f: p.feet, d: p.facing }); } }
        else if (!e.endAt) { e.endAt = e.t; e.ec.push({ x: p.cx, f: p.feet, d: p.facing }); }
        // each echo goes off in turn, like an echo should
        e.ec.forEach((c, i) => { if (!c.boom && e.endAt && e.t - e.endAt > 0.08 * i) { c.boom = e.t; e.hit.clear(); A.hitR(e, c.x, c.f - 11, 18, { kb: 0.6, onHit(t) { if (t.applyStatus) t.applyStatus('deafen', 0); } }); A.sfx('sndPing', { n: [0, 2, 4, 5][i % 4], minGap: 0 }); } });   // an arpeggio
      },
      draw(e, ctx, ox, oy, A) { for (const c of e.ec) { const x = c.x + ox, y = c.f + oy - 11; if (!c.boom) A.alpha(ctx, 0.5, () => H.drawGhost(ctx, A, 'dash', x, c.f + oy, c.d, SN)); else { const k = (e.t - c.boom) / 0.35; if (k < 1) A.alpha(ctx, 1 - k, () => { A.ring(ctx, x, y, 4 + k * 16, SN); A.ring(ctx, x, y, 2 + k * 10, SC); }); } } },
    },
    guard: {
      name: 'Noise Wall', sound: 'boom',
      draw(ctx, { A, x, bot, h, t }) { for (let i = 0; i < 5; i++) { const v = (Math.abs(Math.sin(t * (8 + i * 2) + i)) * 0.5 + 0.5) * h; A.px(ctx, x - 4 + i * 2, bot - v, 1, v, [SN, SC, '#ffffff', SC, SN][i]); } },
      hit(g, x, y, d) { ERX.Audio.playSfx('sndStab'); for (let i = 0; i < 8; i++) dot(g, x, y, d * U.lerp(30, 120, Math.random()), U.lerp(-100, 40, Math.random()), i % 2 ? SN : SC, { life: 0.5, size: 2 }); },
    },
    m1: {
      name: 'Power Chord', dmg: 9, cd: 0.36, kind: 'custom', life: 0.32,
      desc: 'Every swing plays the next note of a riff: keep attacking and you are literally shredding. The third strum is a full power chord.',
      spawn(e, g, A) {
        const p = A.p; p._pc = ((p._pc || 0) + 1) % 3; e.n = p._pc;
        if (e.n === 0) { p._chord = ((p._chord || 0) + 1) % 4; A.sfx('sndChord', { n: [0, 2, 1, 3][p._chord], minGap: 0 }); }
        else { A.sfx('sndNote', { i: p._riff || 0, minGap: 0 }); p._riff = (p._riff || 0) + 1; }
      },
      update(e, dt, g, A) { const big = e.n === 0; H.at(e, A, 0); H.melee(e, A, (big ? 48 : 36) * H.sc(e), big ? 32 : 20, { mult: big ? 1.5 : 1, kb: big ? 1.4 : 0.6, onHit(t) { if (big && t.applyStatus) t.applyStatus('deafen', 0); } }); if (big && !e.sh) { e.sh = true; A.spawn(e, W.SHOCK, { x: e.x + e.dir * 22, y: e.y, r: 24 * H.sc(e), dmg: 0, life: 0.3, c: SN }); A.shake(2, 0.1); } },
      draw(e, ctx, ox, oy, A) {
        const k = e.t / e.life, x = e.x + ox, y = e.y + oy, d = e.dir, n = e.n === 0 ? 4 : 2;
        A.alpha(ctx, 1 - k, () => {
          for (let i = 0; i < n; i++) A.arc(ctx, x + d * (6 + k * 34 + i * 6), y, 7 + k * 10 + i * 3, d, i % 2 ? SC : SN, 3, -1, 1);
          if (e.n === 0) { NOTE(ctx, A, x + d * (10 + k * 22), y - 9 - k * 8, '#ffffff'); NOTE(ctx, A, x + d * (18 + k * 26), y - 4 - k * 12, SC); }
          else NOTE(ctx, A, x + d * (12 + k * 18), y - 6 - k * 8, e.n === 1 ? SN : SC);
        });
      },
    },
    s: [
      {
        name: 'Subwoofer', dmg: 6, cd: 10, mp: 7, kind: 'custom', life: 3.6,
        desc: 'Drop a giant speaker. It pumps out a bass line so heavy that every beat knocks enemies around.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx + p.facing * 18; e.gy = p.feet; e.bt = 0.3; e.beats = []; A.sfx('sndStab', { minGap: 0 }); },
        update(e, dt, g, A) { e.bt -= dt; for (const b of e.beats) b.t += dt; if (e.bt <= 0 && e.t < 3.3) { e.bt = e.up ? 0.3 : 0.38; e.beats.push({ t: 0 }); e.hit.clear(); A.hitR(e, e.x, e.gy - 8, 42 * H.sc(e), { kb: 0.5, onHit(t) { if (t.applyStatus) t.applyStatus('deafen', 0); } }); A.sfx('sndBass', { i: e.beats.length - 1, minGap: 0 }); } },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, gy = e.gy + oy, last = e.beats[e.beats.length - 1], pump = last && last.t < 0.08 ? 1 : 0;
          A.alpha(ctx, A.fade(e, 0.1, 0.3), () => {
            A.px(ctx, x - 7, gy - 18 - pump, 14, 18 + pump, '#1a1a24'); A.px(ctx, x - 7, gy - 18 - pump, 14, 1, '#4a4a5a'); A.ring(ctx, x, gy - 11, 5 + pump, '#4a4a5a'); A.disc(ctx, x, gy - 11, 3 + pump, '#2a2a34', '#6a6a7a'); A.px(ctx, x - 4, gy - 3, 2, 1, SN);
            for (const b of e.beats) if (b.t < 0.4) { const r = 6 + b.t * 100 * H.sc(e); A.alpha(ctx, 1 - b.t / 0.4, () => A.ring(ctx, x, gy - 8, r, b.t < 0.1 ? '#ffffff' : SN, r * 0.5)); }
          });
        },
      },
      {
        name: 'Drumline', dmg: 12, cd: 7, mp: 6, kind: 'custom', life: 1.2,
        desc: 'Four booming drum beats march across the ground in front of you. Ba-dum. Ba-dum.',
        spawn(e, g, A) { H.at(e, A, 0); e.beats = []; for (let i = 0; i < 4; i++) { const x = e.x + e.dir * (20 + i * 24 * H.sc(e)); e.beats.push({ x, gy: H.floor(A, x), at: 0.1 + i * 0.16 }); } },
        update(e, dt, g, A) { e.beats.forEach((b, i) => { if (!b.done && e.t > b.at) { b.done = true; e.hit.clear(); A.hitR(e, b.x, b.gy - 8, 16 * H.sc(e), { kb: 0.8, onHit(t) { if (t.applyStatus) t.applyStatus('deafen', 0); } }); A.sfx('sndDrum', { i, minGap: 0 }); A.shake(1.5, 0.08); } }); },
        draw(e, ctx, ox, oy, A) { for (const b of e.beats) { if (!b.done) continue; const k = (e.t - b.at) / 0.4; if (k > 1) continue; const x = b.x + ox, gy = b.gy + oy; A.alpha(ctx, 1 - k, () => { A.px(ctx, x - 5, gy - 6, 10, 6, '#c84a3a'); A.px(ctx, x - 5, gy - 7, 10, 1, '#f8f0e0'); A.line(ctx, x - 5, gy - 6, x + 5, gy, '#ffd34d'); A.line(ctx, x + 5, gy - 6, x - 5, gy, '#ffd34d'); A.ring(ctx, x, gy - 4, 4 + k * 18, SN, (4 + k * 18) * 0.4); }); } },
      },
      {
        name: 'Feedback Loop', dmg: 5, cd: 9, mp: 7, kind: 'custom', life: 2.2,
        desc: 'Plug the two closest enemies into each other. The feedback squeal is awful, it really, really hurts... and then the amp blows.',
        spawn(e, g, A) { const p = A.p; e.ts = H.nearby(A, p.cx, p.y, 160).slice(0, 2).map((o) => o.t); if (!e.ts.length) { e.dead = true; return; } A.sfx('sndFeedback'); },
        update(e, dt, g, A) { e.ct = (e.ct || 0) - dt; if (e.ct <= 0) { e.ct = 0.2; for (const t of e.ts) if (!t.dead) { A.damage(e, t, 1, 0); if (t.applyStatus) t.applyStatus('deafen', 0); } } },
        onEnd(e, A) { for (const t of e.ts || []) if (!t.dead) { const c = A.center(t); W.boom(A, e, c.x, c.y, 24 * H.sc(e), { mult: 2 }); } },
        draw(e, ctx, ox, oy, A) {
          const p = A.p, pts = e.ts.length > 1 ? e.ts.map((t) => A.center(t)) : [{ x: p.cx, y: p.y + 6 }, A.center(e.ts[0])], a = pts[0], b = pts[1];
          A.alpha(ctx, A.fade(e, 0.1, 0.3), () => {
            let lx = a.x + ox, ly = a.y + oy;
            for (let i = 1; i <= 28; i++) { const q = i / 28, w = Math.sin(q * 30 + e.t * 40) * 4 * Math.sin(q * Math.PI), nx = U.lerp(a.x, b.x, q) + ox, ny = U.lerp(a.y, b.y, q) + oy + w; A.line(ctx, lx, ly, nx, ny, i % 2 ? SN : SC, 2); lx = nx; ly = ny; }
            for (const c of pts) for (let r = 0; r < 3; r++) A.arc(ctx, c.x + ox, c.y + oy, 6 + r * 4 + Math.sin(e.t * 20 + r) * 2, 1, r % 2 ? SC : SN, 2, -3.1, 3.1);
          });
        },
      },
      {
        name: 'Resonant Frequency', dmg: 6, cd: 9, mp: 7, kind: 'custom', life: 1.9,
        desc: 'Find the exact note your enemy vibrates at, and play it. Louder. LOUDER. Until it shatters, and takes its friends with it.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 170); e.tg = t; if (!t) { e.dead = true; return; } holdStun(t, 1.6); A.sfx('hover'); },
        update(e, dt, g, A) { if (!e.tg || e.tg.dead) { e.dead = true; return; } e.ct = (e.ct || 0) - dt; if (e.t < 1.5 && e.ct <= 0) { e.ct = 0.25; A.damage(e, e.tg, 0.5 + e.t, 0); A.sfx('sndRise', { i: e.ri = (e.ri === undefined ? 0 : e.ri + 1), minGap: 0 }); } if (e.t > 1.5 && !e.sh) { e.sh = e.t; const c = A.center(e.tg); A.damage(e, e.tg, 4, 1); W.boom(A, e, c.x, c.y, 32 * H.sc(e), { mult: 1.5 }); A.sfx('sndShatter'); A.sfx('shatter'); } },
        draw(e, ctx, ox, oy, A) {
          if (!e.tg) return;
          const c = A.center(e.tg), x = c.x + ox, y = c.y + oy, amp = 1 + e.t * 2;
          if (!e.sh) { for (let i = 0; i < 3; i++) for (let j = 0; j < 14; j++) A.px(ctx, x - 20 + j * 3, y - 12 + i * 12 + Math.sin(j + e.t * 40) * amp * 0.6, 2, 1, i === 1 ? SC : SN); for (let r = 0; r < 3; r++) A.alpha(ctx, 0.5, () => A.ring(ctx, x + Math.sin(e.t * 60 + r) * amp * 0.4, y, 8 + r * 5 + amp, r % 2 ? SC : '#ffffff', 10 + r * 5 + amp)); return; }
          const k = (e.t - e.sh) / 0.4;
          A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 12; i++) { const a = i * 0.52; A.line(ctx, x + Math.cos(a) * (4 + k * 10), y + Math.sin(a) * (4 + k * 10), x + Math.cos(a) * (8 + k * 30), y + Math.sin(a) * (8 + k * 30), i % 2 ? SN : SC, 2); } });
        },
      },
      {
        name: 'Mic Drop', dmg: 34, cd: 10, mp: 7, kind: 'custom', life: 1.6,
        desc: 'Toss the microphone in the air and walk away. When it hits the floor: BOOM. Everyone nearby is deafened.',
        spawn(e, g, A) { H.at(e, A, 26, -6); const ax = A.aim(e, 100); if (ax !== null) e.x = ax; e.gy = H.floor(A, e.x); e.vy = -170; e.my = e.y; A.sfx('whoosh'); },
        update(e, dt, g, A) { if (e.land) return; e.vy += 520 * dt; e.my += e.vy * dt; if (e.my >= e.gy - 3) { e.land = e.t; e.my = e.gy - 3; A.hitR(e, e.x, e.gy - 8, 42 * H.sc(e), { kb: 1.4, onHit(t) { if (t.applyStatus) t.applyStatus('deafen', e.potency); } }); A.sfx('sndMicDrop'); A.sfx('boom'); A.shake(6, 0.35); A.flash(0.12); } },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.my + oy;
          if (!e.land || e.t - e.land < 0.6) { const a = e.land ? 1.4 : e.t * 12; A.line(ctx, x - Math.cos(a) * 4, y - Math.sin(a) * 4, x + Math.cos(a) * 3, y + Math.sin(a) * 3, '#3a3a4a', 2); A.disc(ctx, x - Math.cos(a) * 4, y - Math.sin(a) * 4, 2, '#8a8a9a', '#c8c8d8'); }
          if (e.land) { const k = (e.t - e.land) / 0.6; if (k < 1) A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 3; i++) { const r = 6 + k * (42 - i * 10) * H.sc(e); A.ring(ctx, x, e.gy + oy - 6, r, i % 2 ? SC : SN, r * 0.5); } }); }
        },
      },
    ],
    ult: {
      name: 'World Resonance', dmg: 9,
      desc: 'Hit the one note the whole world vibrates at. A colossal soundwave rolls out, everything shakes, two giant waves smash together... and one concentrated blast shatters everything in front of you.',
      charge: {
        pose: () => J({ lean: -2, FL: [[10.6, 19], [11.6, 22]], BL: [[5.6, 19], [4.6, 22]], FA: [[11.6, 12.4], [14, 10]], BA: [[5, 12.4], [2.6, 10]], mouthOpen: true }),
        lift: 4,
        draw(ctx, x, y, k, t, A) { for (let i = 0; i < 6; i++) { const r = ((t * 70 + i * 14) % 80) * k; A.alpha(ctx, 1 - r / 80, () => A.ring(ctx, x, y - 14, r, i % 2 ? SN : SC, r * 0.8, 2)); } EQ(ctx, A, x - 30, y + 14, 30, t, 4 + k * 22, [SN, SC, '#ffffff']); },
      },
      run(A, e0) {
        const p = A.p, d = p.facing;
        W.hold(A, () => J({ lean: -2, FL: [[10.6, 19], [11.6, 22]], BL: [[5.6, 19], [4.6, 22]], FA: [[12, 12.6], [15, 12.4]], BA: [[11, 12.8], [14.4, 12.8]], mouthOpen: true }), 0, 4);
        A.spawn(e0, {
          life: 3.9, layer: 'screen',
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t); for (const t of e.ts) holdStun(t, 3.4); A.sfx('sndUlt', { part: 'intro', minGap: 0 }); A.sfx('rumble', { dur: 3.4 }); },
          update(e, dt, g, A) {
            if (e.t < 1) A.tickR(e, p.cx, p.y + 10, e.t * 300, 0.5, { mult: 0.6, kb: 0, onHit(t) { if (t.applyStatus) t.applyStatus('deafen', e.potency); } });
            if (e.t > 0.4 && e.t < 3) A.shake(1.5 + e.t, 0.05);
            // the song: a beat and a riff under the build-up (eighth notes at 150 BPM)...
            if (e.t > 0.4 && e.t < 2.1) { const s = Math.floor((e.t - 0.4) / 0.2); if (s !== e.ms) { e.ms = s; A.sfx('sndUlt', { part: 'beat', i: s, minGap: 0 }); } }
            if (e.t > 1.1 && e.t < 2.1) { const k = (e.t - 1.1) / 0.9; e.wl = p.cx - 260 + k * 260; e.wr = p.cx + 260 - k * 260; for (const x of [e.wl, e.wr]) A.tick(e, { x: x - 16, y: A.top(), w: 32, h: 600 }, 0.3, { mult: 0.7, kb: 0 }); }
            if (e.t > 2.1 && !e.clash) { e.clash = e.t; A.hitR(e, p.cx, p.y + 10, 300, { mult: 2, kb: 0 }); A.flash(0.25); A.sfx('sndUlt', { part: 'clash', minGap: 0 }); A.sfx('boom'); }
            if (e.t > 3.4 && !e.fin) { e.fin = true; A.sfx('sndUlt', { part: 'end', minGap: 0 }); }
            if (e.t > 2.6 && e.t < 3.4) { if (!e.beam) { e.beam = true; A.sfx('sndUlt', { part: 'scream', minGap: 0 }); A.flash(0.4); } A.tick(e, { x: d > 0 ? p.cx : p.cx - 400, y: p.y - 6, w: 400, h: 34 }, 0.12, { mult: 1.3, kb: 0.3 }); }
            if (e.t > 3.5 && p.ultHold) W.release(A);
          },
          draw(e, ctx, ox, oy, A) {
            const px = p.cx + ox, py = p.y + 10 + oy, dark = e.t < 3.4 ? Math.min(1, e.t * 2) * 0.5 : Math.max(0, 0.5 - (e.t - 3.4));
            A.alpha(ctx, dark, () => A.px(ctx, -10, -10, 2000, 2000, '#14061a'));
            if (e.t < 1.2) { const r = e.t * 300; A.alpha(ctx, 1 - e.t / 1.2, () => { A.ring(ctx, px, py, r, SN, r * 0.7, 2); A.ring(ctx, px, py, r * 0.9, SC, r * 0.63, 2); }); }
            // the whole world vibrating
            if (e.t > 0.4 && e.t < 3.4) A.alpha(ctx, 0.3, () => { for (let i = 0; i < 12; i++) A.px(ctx, -10, (i * 23 + Math.floor(e.t * 60) * 3) % view(A).height, 2000, 1, i % 2 ? SN : SC); });
            if (e.wl !== undefined && e.t < 2.2) for (const [x, dd] of [[e.wl, 1], [e.wr, -1]]) for (let i = 0; i < 4; i++) WAVE(ctx, A, x + ox - dd * i * 8, py - 30, 80 + i * 6, dd, i % 2 ? SC : SN, 1.2);
            if (e.clash && e.t < e.clash + 0.5) { const k = (e.t - e.clash) / 0.5; A.alpha(ctx, 1 - k, () => A.ring(ctx, px, py - 20, 10 + k * 120, '#ffffff', 10 + k * 120, 2)); }
            if (e.beam && e.t < 3.45) {
              const w = 34 * (1 + Math.sin(e.t * 50) * 0.08), x0 = px + d * 8, L = view(A).width;
              for (let i = 0; i < 4; i++) A.px(ctx, d > 0 ? x0 : x0 - L, py - w / 2 + i * (w / 8), L, w - i * (w / 4), [SN, SC, '#ffffff', '#ffffff'][i]);
              for (let i = 0; i < 6; i++) WAVE(ctx, A, x0 + d * ((e.t * 400 + i * 80) % L), py, 20, d, '#ffffff', 1.2);
            }
          },
        }, {});
      },
    },
  };

  // ================================================================= MIST (spectral blue)
  const MB = '#9ab0ff', MW = '#e0f0ff';
  const PUFF = (ctx, A, x, y, r, c, a) => A.alpha(ctx, a === undefined ? 0.5 : a, () => A.disc(ctx, x, y, Math.max(1, Math.round(r)), c || MW));
  const FACE = (ctx, A, x, y, s, scream) => { A.px(ctx, x - s, y - s, 1, 1, '#1a1a2a'); A.px(ctx, x + s - 1, y - s, 1, 1, '#1a1a2a'); A.px(ctx, x - 1, y + (scream ? 0 : 1), 2, scream ? 3 : 1, '#1a1a2a'); };
  const PHANTOM = (ctx, A, x, y, d, kind, t) => {
    const R = facer(ctx, A, x, y, d);
    if (kind === 0) {   // a ghost wolf
      R(-10, -3, 12, 6, MB); R(2, -6, 6, 5, MW); R(3, -8, 1, 2, MW); R(6, -8, 1, 2, MW); R(8, -4, 2, 2, MW); R(6, -5, 1, 1, '#1a1a2a'); R(-14, -4, 4, 2, MW);
      for (let i = 0; i < 2; i++) R(-8 + i * 7, 3, 2, 4 + Math.round(Math.sin(t * 20 + i)), MB);
    } else if (kind === 1) {   // a raven
      const fl = Math.sin(t * 25) > 0 ? -3 : 2; R(-3, -2, 7, 4, MB); R(4, -3, 3, 3, MW); R(7, -2, 2, 1, '#e0d080'); R(-1, -2 + fl, 6, 2, MW); R(-6, -1 + fl, 5, 1, MB);
    } else {   // a hooded wraith
      R(-5, -10, 10, 14, MB); R(-4, -9, 8, 3, MW); R(1, -7, 1, 1, '#1a1a2a'); R(-2, -7, 1, 1, '#1a1a2a'); R(5, -2, 4, 1, MW); R(5, 0, 4, 1, MW); for (let i = 0; i < 3; i++) R(-5 + i * 4, 4, 2, 2 + (i % 2), MB);
    }
  };
  const BEAST = (ctx, A, x, gy, d, t) => {
    const R = facer(ctx, A, x, gy, d), st = Math.round(Math.sin(t * 18) * 3);
    A.alpha(ctx, 0.8, () => {
      R(-70, -60, 70, 44, MB); R(-60, -66, 50, 8, MW);
      R(-6, -78, 40, 36, MW); R(30, -60, 18, 14, MW); R(30, -48, 16, 4, MB);
      for (let i = 0; i < 4; i++) R(32 + i * 4, -47, 2, 3, '#ffffff');
      R(2, -92, 8, 14, MW); R(18, -92, 8, 14, MW); R(14, -70, 5, 4, '#1a1a2a'); R(15, -69, 2, 2, '#ffffff');
      R(-62, -16, 10, 16 + st, MB); R(-28, -16, 10, 16 - st, MB); R(-12, -20, 10, 20 + st, MB);
      for (let i = 0; i < 6; i++) R(-70 - i * 12, -50 + Math.round(Math.sin(t * 10 + i) * 6), 12, 6, i % 2 ? MW : MB);
    });
  };
  AW.mist = {
    color: MB, up: MW, status: 'blind', fx: 'fog', block: ['Phantom Veil', 'veil'],
    icons: ['fogHands', 'wisp', 'mistSerpent', 'wailWall', 'dissolve'],
    look: { fx(ctx, F) { const e = F.at('eye'); F.A.alpha(ctx, 0.5 + 0.3 * Math.sin(F.t * 3), () => F.A.disc(ctx, e.x, e.y, 1, MW)); } },
    idle: {
      // no legs any more: just a tail of mist
      pose: (t) => Object.assign(IDLE.spread(t, { noLegs: true }), { lift: 6 + Math.sin(t * 1.5) * 1.5 }),
      back(ctx, F) { for (let i = 0; i < 7; i++) { const k = (F.t * 0.6 + i / 7) % 1; PUFF(ctx, F.A, F.x + Math.sin(i * 1.7 + F.t * 1.3) * (3 + k * 5), F.y - 6 + k * 10, 3 - k * 2, i % 2 ? MW : MB, 0.55 * (1 - k)); } },
    },
    run: {
      pose: (ph) => Object.assign(RUN.hover(ph, { lift: 6, lean: 1 }), { noLegs: true }),
      back(ctx, F) { for (let i = 0; i < 9; i++) PUFF(ctx, F.A, F.x - F.d * (2 + i * 4), F.y - 6 + Math.sin(F.t * 6 + i) * 1.5, Math.max(1, 4 - i * 0.4), i % 2 ? MW : MB, 0.5 - i * 0.05); },
    },
    dash: {
      name: 'Mist Form', style: 'blink', dmg: 5, life: 0.9,
      spawn(e, g, A) { const p = A.p; e.sx = p.cx; e.y0 = p.y + 12; e.cx = p.cx; A.sfx('whoosh', { minGap: 0.05 }); },
      update(e, dt, g, A) {
        const p = A.p; e.cx = p.dashT > 0 ? p.cx : U.approach(e.cx, p.cx, 20, dt);
        if (!e.out || e.t - e.out < 0.15) A.tickR(e, e.cx, e.y0, 14, 0.08, { kb: 0, onHit(t) { if (t.applyStatus) t.applyStatus('blind', 0); } });
        if (p.dashT <= 0 && !e.out) { e.out = e.t; A.puff(e, p.cx, p.y + 10, 8, 1.5); }
      },
      draw(e, ctx, ox, oy, A) { const f = e.out ? Math.max(0, 1 - (e.t - e.out) / 0.4) : 1; for (let i = 0; i < 8; i++) { const a = e.t * 5 + i * 0.8; PUFF(ctx, A, e.cx + ox + Math.cos(a) * 5 - (e.cx - e.sx) * 0.1 * (i / 8), e.y0 + oy + Math.sin(a) * 4, 4 + (i % 3) * 2, i % 2 ? MW : MB, 0.45 * f); } if (!e.out) FACE(ctx, A, e.cx + ox, e.y0 + oy - 2, 2, true); },
    },
    guard: {
      name: 'Phantom Veil', sound: 'whoosh',
      draw(ctx, { A, x, bot, h, t, k }) { const top = bot - h; for (let yy = 0; yy < h; yy++) { const w = 9 + Math.sin(yy * 0.4 + t * 5) * 2; A.alpha(ctx, 0.55 - (yy / h) * 0.3, () => A.px(ctx, x - w / 2, top + yy, w, 1, yy % 3 ? MW : MB)); } FACE(ctx, A, x, top + 6, 2, k < 0.5); },
      hit(g, x, y, d) { for (let i = 0; i < 12; i++) dot(g, x, y, d * U.lerp(10, 90, Math.random()), U.lerp(-60, 60, Math.random()), i % 2 ? MW : MB, { life: 0.7, size: 2, fadeOut: 0.6 }); },
    },
    m1: {
      name: 'Wraith Claw', dmg: 9, cd: 0.34, kind: 'custom', life: 0.3,
      desc: 'Your arm stretches into a long claw of mist and rakes whatever is in front of you.',
      spawn(e, g, A) { const p = A.p; p._wc = ((p._wc || 0) + 1) % 2; e.n = p._wc; A.sfx('swing', { minGap: 0.04 }); },
      update(e, dt, g, A) { H.at(e, A, 0); H.melee(e, A, 38 * H.sc(e), 26, { onHit(t) { const c = A.center(t); A.spawn(e, W.SHOCK, { x: c.x, y: c.y, r: 12, dmg: 0, life: 0.22, c: MB }); } }); },
      draw(e, ctx, ox, oy, A) {
        const k = Math.min(1, e.t / 0.1), f = 1 - Math.max(0, e.t - 0.1) / 0.2, x = e.x + ox, y = e.y + oy, d = e.dir, s = e.n ? 1 : -1, L = 34 * H.sc(e);
        A.alpha(ctx, f, () => {
          for (let i = 0; i < 4; i++) PUFF(ctx, A, x + d * (8 + i * 9) * k, y + Math.sin(e.t * 20 + i) * 3, 4 - i * 0.5, MW, 0.35);
          for (let i = 0; i < 4; i++) { const y0 = y - 12 + i * 6; A.line(ctx, x + d * 8, y0 - s * 5, x + d * (8 + L * k), y0 + s * 5, i === 1 || i === 2 ? '#ffffff' : MB, 2); }
        });
      },
    },
    s: [
      {
        name: 'Fog Hands', dmg: 10, cd: 8, mp: 7, kind: 'custom', life: 1.6,
        desc: 'Hands made of fog rise out of the ground under your enemies, grab them, and squeeze.',
        spawn(e, g, A) {
          const p = A.p, ts = H.nearby(A, p.cx, p.y, 150).filter((o) => (o.c.x - p.cx) * p.facing > -10).slice(0, e.up ? 4 : 3);
          e.hands = ts.length ? ts.map((o) => ({ x: o.c.x, gy: H.floor(A, o.c.x) })) : [0, 1, 2].map((i) => { const x = p.cx + p.facing * (30 + i * 22); return { x, gy: H.floor(A, x) }; });
          A.sfx('hover');
        },
        update(e, dt, g, A) {
          if (e.t > 0.3 && !e.grab) { e.grab = true; for (const h of e.hands) A.hit(e, { x: h.x - 8, y: h.gy - 24, w: 16, h: 24 }, { kb: 0, onHit(t) { holdStun(t, 0.9); if (t.applyStatus) t.applyStatus('blind', 0); } }); }
          if (e.t > 1.1 && !e.sq) { e.sq = true; e.hit.clear(); for (const h of e.hands) A.hit(e, { x: h.x - 8, y: h.gy - 24, w: 16, h: 24 }, { mult: 1.6, kb: 0.4 }); A.sfx('crash'); }
        },
        draw(e, ctx, ox, oy, A) {
          const rise = W.easeOut(Math.min(1, e.t / 0.3)), close = e.t > 0.3 ? Math.min(1, (e.t - 0.3) / 0.15) : 0, f = A.fade(e, 0.05, 0.35);
          for (const h of e.hands) { const x = h.x + ox, gy = h.gy + oy, top = gy - 22 * rise; A.alpha(ctx, f * 0.85, () => { A.px(ctx, x - 3, top + 8, 6, gy - top - 8, MB); for (let i = 0; i < 4; i++) { const fx = x - 6 + i * 4; A.line(ctx, fx, top + 8, fx + close * (i < 2 ? 3 : -3), top + (i % 3 ? 0 : 2), MW, 2); } PUFF(ctx, A, x, gy, 6, MW, 0.4); }); }
        },
      },
      {
        name: "Will-o'-Wisp", dmg: 16, cd: 8, mp: 6, kind: 'custom', life: 2.2,
        desc: 'Three little lights drift out. Enemies cannot help following them... right up until they explode.',
        spawn(e, g, A) { H.at(e, A, 6, -6); e.ws = [-0.4, 0, 0.4].map((a) => ({ x: e.x, y: e.y, vx: Math.cos(a) * 70 * e.dir, vy: Math.sin(a) * 70, ph: Math.random() * 6 })); A.sfx('star'); },
        update(e, dt, g, A) {
          for (const w of e.ws) {
            if (w.gone) continue;
            const t = A.near(w.x, w.y, 160);
            if (t) {
              const c = A.center(t); w.vx = U.approach(w.vx, (c.x - w.x) * 2, 2, dt); w.vy = U.approach(w.vy, (c.y - w.y) * 2, 2, dt);
              for (const o of H.nearby(A, w.x, w.y, 70)) { if (movable(o.t)) o.t.vx = U.approach(o.t.vx, Math.sign(w.x - o.c.x) * 50, 3, dt); if (o.t.applyStatus && !o.t.status.confuse) o.t.applyStatus('confuse', 0); }
            }
            w.x += w.vx * dt; w.y += w.vy * dt + Math.sin(e.t * 5 + w.ph) * 12 * dt;
            if ((t && Math.hypot(A.center(t).x - w.x, A.center(t).y - w.y) < 8) || e.t > 1.9) { w.gone = e.t; A.hitR(e, w.x, w.y, 18 * H.sc(e), { kb: 0.8, onHit(tt) { if (tt.applyStatus) tt.applyStatus('blind', 0); } }); e.hit.clear(); A.sfx('pop', { minGap: 0.05 }); }
          }
        },
        draw(e, ctx, ox, oy, A) { for (const w of e.ws) { const x = w.x + ox, y = w.y + oy; if (!w.gone) { A.glow(ctx, x, y, 3, MW, 0.3 + 0.15 * Math.sin(e.t * 8 + w.ph)); A.disc(ctx, x, y, 2, MB, '#ffffff'); } else { const k = (e.t - w.gone) / 0.35; if (k < 1) A.alpha(ctx, 1 - k, () => A.ring(ctx, x, y, 3 + k * 18 * H.sc(e), MW)); } } },
      },
      {
        name: 'Mist Serpent', dmg: 5, cd: 8, mp: 7, kind: 'custom', life: 2.4,
        desc: 'A big serpent of living fog slithers along the ground to the nearest enemy, coils around it and squeezes... then bursts.',
        spawn(e, g, A) { H.at(e, A, 8); e.gy = H.floor(A, e.x); e.hx = e.x; e.hy = e.gy - 5; e.trail = []; A.sfx('hover'); },
        update(e, dt, g, A) {
          const t = e.tg && !e.tg.dead ? e.tg : (e.tg = A.near(e.hx, e.hy, 200));
          if (!e.coil) {
            const tx = t ? A.center(t).x : e.hx + e.dir * 60;
            e.hx += U.clamp(tx - e.hx, -160 * dt, 160 * dt); e.hy = e.gy - 5 + Math.sin(e.t * 12) * 2;
            if (t && Math.abs(tx - e.hx) < 4) { e.coil = e.t; holdStun(t, 1.2); }
          } else if (t) {
            const c = A.center(t), a = (e.t - e.coil) * 9; e.hx = c.x + Math.cos(a) * 11; e.hy = c.y + Math.sin(a) * 11;
            e.ct = (e.ct || 0) - dt; if (e.t < 2.2 && e.ct <= 0) { e.ct = 0.18; A.damage(e, t, 1, 0); }
          }
          e.trail.unshift({ x: e.hx, y: e.hy }); if (e.trail.length > 18) e.trail.pop();
        },
        onEnd(e, A) { const h = e.trail[0]; if (h) W.boom(A, e, h.x, h.y, 28 * H.sc(e), { mult: 2 }); },
        draw(e, ctx, ox, oy, A) {
          A.alpha(ctx, A.fade(e, 0.1, 0.4), () => {
            for (let i = e.trail.length - 1; i >= 0; i--) { const s = e.trail[i]; PUFF(ctx, A, s.x + ox, s.y + oy, Math.max(1.5, 6 - i * 0.28), i % 2 ? MW : MB, 0.7); }
            const h = e.trail[0];
            if (h) { A.px(ctx, h.x + ox - 2, h.y + oy - 2, 2, 1, '#ff3a6a'); A.px(ctx, h.x + ox + 1, h.y + oy - 2, 2, 1, '#ff3a6a'); A.px(ctx, h.x + ox - 1, h.y + oy + 2, 1, 2, '#ffffff'); A.px(ctx, h.x + ox + 1, h.y + oy + 2, 1, 2, '#ffffff'); }
          });
        },
      },
      {
        name: 'Wailing Wall', dmg: 16, cd: 8, mp: 7, kind: 'custom', life: 1.4,
        desc: 'A wall of fog full of screaming faces surges forwards, shoving enemies back and leaving them blind.',
        spawn(e, g, A) { H.at(e, A, 10); e.gy = H.floor(A, e.x); A.sfx('whoosh'); },
        update(e, dt, g, A) { e.x += e.dir * 150 * dt; if (A.solid(e.x + e.dir * 6, e.gy - 12)) e.life = Math.min(e.life, e.t + 0.3); A.hit(e, { x: e.x - 8, y: e.gy - 40, w: 16, h: 40 }, { kb: 2.2, dir: e.dir, onHit(t) { if (t.applyStatus) t.applyStatus('blind', e.potency); } }); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, gy = e.gy + oy; A.alpha(ctx, A.fade(e, 0.1, 0.3), () => { for (let i = 0; i < 8; i++) PUFF(ctx, A, x + Math.sin(e.t * 6 + i) * 2, gy - 4 - i * 5, 6, i % 2 ? MW : MB, 0.55); for (let i = 0; i < 3; i++) FACE(ctx, A, x + e.dir * 2, gy - 10 - i * 12, 2, Math.sin(e.t * 10 + i) > 0); }); },
      },
      {
        name: 'Dissolve', dmg: 6, cd: 10, mp: 7, kind: 'custom', life: 1.6,
        desc: 'Fall apart into mist right where you stand. Nothing can touch you, and anything standing in you chokes on it. Then you pull yourself back together, hard.',
        spawn(e, g, A) { A.sfx('whoosh'); },
        update(e, dt, g, A) {
          const p = A.p; e.x = p.cx; e.y = p.y + 10;
          if (e.t < 1.3) { p.dashGrace = Math.max(p.dashGrace || 0, 0.05); p.vanishT = 0.05; A.tickR(e, e.x, e.y, 26 * H.sc(e), 0.2, { kb: 0, onHit(t) { if (t.applyStatus) t.applyStatus('blind', 0); } }); }
          else if (!e.re) { e.re = e.t; e.hit.clear(); A.hitR(e, e.x, e.y, 30 * H.sc(e), { mult: 2.5, kb: 1.5 }); A.sfx('crash'); A.puff(e, e.x, e.y, 10, 2); }
        },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, R = 26 * H.sc(e); if (!e.re) for (let i = 0; i < 12; i++) { const a = e.t * 2 + i * 0.52, r = R * (0.4 + (0.5 * ((i * 7) % 10)) / 10); PUFF(ctx, A, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, 4, i % 2 ? MW : MB, 0.45); } else { const k = (e.t - e.re) / 0.3, r = R * (1 - k) + 4; A.alpha(ctx, 1 - k, () => A.ring(ctx, x, y, r, MW, r * 0.7)); } },
      },
    ],
    ult: {
      name: 'Phantom Realm', dmg: 9,
      desc: 'A supernatural mist swallows the battlefield. Phantoms crawl out of it and attack from every direction... then the whole fog pulls together into one gigantic spectral beast, and it charges.',
      charge: {
        pose: (t, k) => J({ FA: [[11.6, 12.4], [14, 10]], BA: [[5, 12.4], [2.6, 10]], noLegs: true, mouthOpen: k > 0.7 }),
        lift: 10,
        draw(ctx, x, y, k, t, A) { for (let i = 0; i < 16; i++) { const s = i % 2 ? 1 : -1, dd = 200 * (1 - k) + 20 + ((i * 13) % 40); PUFF(ctx, A, x + s * dd, y - 25 + ((i * 17) % 30), 8, i % 3 ? MW : MB, 0.35 * k + 0.1); } if (k > 0.5) for (let i = 0; i < 6; i++) { const ex = x + (i - 2.5) * 22, ey = y - 30 + (i % 2) * 12; A.px(ctx, ex - 2, ey, 1, 1, '#ffffff'); A.px(ctx, ex + 2, ey, 1, 1, '#ffffff'); } },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 4, layer: 'screen',
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t); e.ph = []; e.pt = 0; e.dir = p.facing; A.sfx('mist'); },
          update(e, dt, g, A) {
            e.pt -= dt; for (const f of e.ph) f.t += dt;
            // phantoms out of the fog, from every side
            if (e.t > 0.5 && e.t < 2.3 && e.pt <= 0) { e.pt = 0.11; const live = e.ts.filter((t) => !t.dead), t = live[Math.floor(Math.random() * live.length)]; if (t) { const c = A.center(t), s = Math.random() < 0.5 ? 1 : -1; e.ph.push({ tg: t, x: c.x + s * 70, y: c.y - A.rnd(-10, 40), s, kind: Math.floor(Math.random() * 3), t: 0 }); } }
            for (const f of e.ph) if (!f.hit && f.t > 0.25) { f.hit = true; if (!f.tg.dead) { A.damage(e, f.tg, 0.8, 0); if (f.tg.applyStatus) f.tg.applyStatus('blind', 0); A.sfx('swing', { minGap: 0.04 }); } }
            // ...then the fog becomes one beast, and it charges straight through
            if (e.t > 2.6 && e.t < 3.5) { e.bx = p.cx - e.dir * 240 + e.dir * ((e.t - 2.6) / 0.9) * 600; A.tick(e, { x: e.bx - 40, y: A.top(), w: 80, h: 600 }, 0.5, { mult: 4, kb: 1.5, dir: e.dir }); if (!e.roar) { e.roar = true; A.sfx('boom'); A.sfx('screech'); A.shake(10, 0.8); } }
          },
          draw(e, ctx, ox, oy, A) {
            const fog = e.t < 3.6 ? Math.min(1, e.t * 1.5) : Math.max(0, 1 - (e.t - 3.6) * 2.5);
            A.alpha(ctx, 0.45 * fog, () => A.px(ctx, -10, -10, 2000, 2000, '#1a2030'));
            const V = view(A), n = Math.round(V.width / 16); A.alpha(ctx, fog, () => { for (let i = 0; i < n; i++) PUFF(ctx, A, ((i * 53 + e.t * (10 + (i % 5) * 6)) % (V.width + 40)) - 20, V.height * 0.55 + ((i * 37) % (V.height * 0.45)), 10 + (i % 4) * 3, i % 3 ? MW : MB, 0.22); });
            for (const f of e.ph) { if (f.t > 0.5) continue; const q = W.easeIn(Math.min(1, f.t / 0.25)), c = f.tg.dead ? { x: f.x, y: f.y } : A.center(f.tg); A.alpha(ctx, f.t < 0.25 ? 0.85 : 0.85 * (1 - (f.t - 0.25) / 0.25), () => PHANTOM(ctx, A, U.lerp(f.x, c.x, q) + ox, U.lerp(f.y, c.y, q) + oy, -f.s, f.kind, e.t)); }
            if (e.bx !== undefined && e.t < 3.6) BEAST(ctx, A, e.bx + ox, p.feet + oy, e.dir, e.t);
          },
        }, {});
      },
    },
  };

  // ================================================================ SPIRIT (ghost-fire green)
  const SP = '#7aff4a', SPL = '#d8ffb0';
  const SOUL = (ctx, A, x, y, t, s) => { s = s || 1; A.disc(ctx, x, y, Math.max(1, Math.round(2 * s)), SP, SPL); for (let i = 0; i < 3 * s; i++) A.px(ctx, x + Math.sin(t * 9 + i) * s, y - 2 * s - i, 1, 1, i % 2 ? SPL : SP); };
  const STAG = (ctx, A, x, gy, d, t) => {
    const R = facer(ctx, A, x, gy, d), st = Math.round(Math.sin(t * 22));
    R(-10, -16, 14, 7, SP); R(3, -20, 5, 6, SPL); R(7, -18, 3, 2, SPL); R(-12, -15, 2, 2, SPL);
    R(-9, -9, 2, 9 + st, SP); R(-4, -9, 2, 9 - st, SP); R(0, -9, 2, 9 + st, SP);
    for (const [lx, ly] of [[4, -22], [3, -25], [6, -26], [1, -27], [7, -29]]) R(lx, ly, 1, 3, '#ffffff');
    R(5, -19, 1, 1, '#1a3a1a');
  };
  // the one colossal warrior the whole legion merges into; sw: 0 sword raised -> 1 swung down
  const GIANT = (ctx, A, x, gy, d, k, sw) => {
    const s = W.easeOut(k) * 1.8, R = (lx, ly, w, h, c) => A.px(ctx, d > 0 ? x + lx * s : x - lx * s - w * s, gy + ly * s, w * s, h * s, c);
    A.alpha(ctx, 0.65 * k, () => { R(-14, -80, 28, 44, SP); R(-12, -102, 24, 22, SPL); R(-14, -104, 28, 4, SP); R(-2, -112, 4, 8, SPL); R(2, -94, 4, 3, '#ffffff'); R(-12, -36, 10, 36, SP); R(2, -36, 10, 36, SP); R(-24, -78, 10, 30, SPL); });
    const a = U.lerp(-2.2, 0.6, W.easeIn(sw)), sx = x + d * 12 * s, sy = gy - 76 * s, L = 110 * s, ex = sx + d * Math.cos(a) * L, ey = sy + Math.sin(a) * L;
    A.alpha(ctx, 0.75 * k, () => { A.line(ctx, sx, sy, ex, ey, SPL, Math.max(1, Math.round(5 * s))); A.line(ctx, sx, sy, ex, ey, '#ffffff', 1); });
  };
  AW.spirit = {
    color: SP, up: SPL, status: 'haunt', fx: 'souls', block: ['Ancestral Shield', 'shield'],
    icons: ['stag', 'lanterns', 'guardian', 'spiritDrain', 'spiritArrows'],
    // your own spirit hangs just behind you
    look: { back(ctx, F) { F.A.alpha(ctx, 0.22 + 0.08 * Math.sin(F.t * 2), () => H.drawGhost(ctx, F.A, 'idle', F.x - F.d * 4, F.y - 6 + Math.sin(F.t * 1.5) * 1.5, F.d, SP)); } },
    idle: {
      pose: (t) => IDLE.limp(t, { lift: 6 }),
      fx(ctx, F) { for (let i = 0; i < 3; i++) { const a = F.t * 1.2 + i * 2.1; SOUL(ctx, F.A, F.x + Math.cos(a) * 12, F.y - 12 + Math.sin(a) * 5, F.t + i, 1); } },
    },
    run: {
      pose: (ph) => RUN.hover(ph, { lift: 5, lean: 2, arms: [[7, 14], [4.4, 16.4]], armsB: [[6.4, 14], [3.6, 16]] }),
      back(ctx, F) { for (let i = 1; i < 7; i++) F.A.alpha(ctx, 0.8 - i * 0.11, () => SOUL(ctx, F.A, F.x - F.d * i * 5, F.y - 10 + Math.sin(F.t * 7 + i) * 2, F.t + i, Math.max(0.5, 1 - i * 0.1))); },
    },
    dash: {
      name: 'Soul Rush', dmg: 13, life: 0.8,
      spawn(e, g, A) { const p = A.p; e.sx = p.cx; e.f = p.feet; e.d = p.facing; A.sfx('whoosh', { minGap: 0.05 }); },
      update(e, dt, g, A) {
        const p = A.p;
        if (p.dashT > 0) { e.gx = p.cx + p.facing * 8; e.f = p.feet; }
        else { if (!e.out) { e.out = e.t; e.ex = p.cx; } e.gx = e.ex + e.d * 30 * W.easeOut(Math.min(1, (e.t - e.out) / 0.15)); }   // your spirit keeps going
        A.hit(e, { x: e.gx - 7, y: e.f - 22, w: 14, h: 22 }, { kb: 1, onHit(t) { if (t.applyStatus) t.applyStatus('haunt', 0); } });
      },
      draw(e, ctx, ox, oy, A) { if (e.gx === undefined) return; const k = e.out ? Math.min(1, (e.t - e.out) / 0.6) : 0; A.alpha(ctx, 0.6 * (1 - k), () => H.drawGhost(ctx, A, 'dash', e.gx + ox, e.f + oy, e.d, SP)); for (let i = 0; i < 5; i++) A.alpha(ctx, (1 - k) * (0.6 - i * 0.1), () => SOUL(ctx, A, U.lerp(e.sx, e.gx, i / 5) + ox, e.f + oy - 12 + Math.sin(e.t * 9 + i) * 2, e.t + i, 1)); },
    },
    guard: {
      name: 'Ancestral Shield', sound: 'wood',
      draw(ctx, { A, x, bot, h, t }) { const cy = bot - h / 2, r = Math.round(h / 2 - 1); A.alpha(ctx, 0.75, () => { A.disc(ctx, x, cy, r, '#2a5a2a', '#3a7a3a'); A.ring(ctx, x, cy, r, SP); A.ring(ctx, x, cy, r - 3, SPL); }); SOUL(ctx, A, x, cy, t, 1.2); },
      hit(g, x, y, d) { for (let i = 0; i < 10; i++) dot(g, x, y, d * U.lerp(20, 100, Math.random()), U.lerp(-120, 0, Math.random()), i % 2 ? SP : SPL, { ay: -60, life: 0.6 }); },
    },
    m1: {
      name: 'Ancestor Strike', dmg: 9, cd: 0.38, kind: 'custom', life: 0.32,
      desc: 'Every time you strike, the spirit of an ancestor behind you thrusts a spear past your shoulder.',
      spawn(e, g, A) { A.sfx('swing', { minGap: 0.04 }); },
      update(e, dt, g, A) { H.at(e, A, 0); H.melee(e, A, 44 * H.sc(e), 12, { kb: 0.8 }); },
      draw(e, ctx, ox, oy, A) { const p = A.p, k = Math.min(1, e.t / 0.1), f = 1 - Math.max(0, e.t - 0.12) / 0.2, d = e.dir, x = e.x + ox, y = e.y + oy, L = 44 * H.sc(e) * k; A.alpha(ctx, f, () => { A.alpha(ctx, 0.45, () => H.drawGhost(ctx, A, 'attack', x - d * 6, p.feet + oy - 4, d, SP)); A.line(ctx, x - d * 4, y - 4, x + d * L, y - 1, SPL); A.line(ctx, x + d * L, y - 3, x + d * (L + 4), y - 1, '#ffffff'); A.line(ctx, x + d * L, y + 1, x + d * (L + 4), y - 1, '#ffffff'); }); },
    },
    s: [
      {
        name: 'Spirit Stag', dmg: 22, cd: 7, mp: 6, kind: 'custom', life: 1.3,
        desc: 'A great spectral stag bursts out of you and charges straight ahead, antlers first, through everything.',
        spawn(e, g, A) { H.at(e, A, 0); e.gy = H.floor(A, e.x); A.sfx('whoosh'); },
        update(e, dt, g, A) { e.x += e.dir * 210 * dt; A.hit(e, { x: e.x - 10, y: e.gy - 24, w: 20, h: 24 }, { kb: 1.6, dir: e.dir, onHit(t) { if (t.applyStatus) t.applyStatus('haunt', 0); } }); if (A.solid(e.x + e.dir * 10, e.gy - 10)) e.life = Math.min(e.life, e.t + 0.2); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, gy = e.gy + oy, f = A.fade(e, 0.1, 0.3); A.alpha(ctx, 0.75 * f, () => STAG(ctx, A, x, gy, e.dir, e.t)); for (let i = 1; i < 5; i++) A.alpha(ctx, f * (0.5 - i * 0.1), () => SOUL(ctx, A, x - e.dir * i * 7, gy - 12, e.t + i, 1)); },
      },
      {
        name: 'Lantern Procession', dmg: 12, cd: 8, mp: 6, kind: 'custom', life: 2.6,
        desc: 'A line of big floating spirit lanterns drifts out in front of you. Anything that touches one gets a face full of ghost fire.',
        spawn(e, g, A) { H.at(e, A, 8, -6); e.ls = []; for (let i = 0; i < (e.up ? 8 : 6); i++) e.ls.push({ d: i * 0.16, ph: i }); A.sfx('star'); },
        update(e, dt, g, A) {
          for (const l of e.ls) {
            if (l.gone || e.t < l.d) continue;
            const q = e.t - l.d; l.x = e.x + e.dir * q * 70; l.y = e.y - 4 + Math.sin(q * 4 + l.ph) * 8;
            const t = A.targets().find((o) => Phys().rectsOverlap(o.box, { x: l.x - 5, y: l.y - 6, w: 10, h: 12 }));
            if (t || q > 2.2) { l.gone = e.t; if (t) { A.damage(e, t, 1, 0.4); A.blast(e, l.x, l.y, 18 * H.sc(e), { dmg: e.dmg * 0.5 }); A.spawn(e, W.SHOCK, { x: l.x, y: l.y, r: 16, dmg: 0, life: 0.25, c: SP }); if (t.applyStatus) t.applyStatus('haunt', e.potency); A.sfx('ignite', { minGap: 0.05 }); } }
          }
        },
        draw(e, ctx, ox, oy, A) {
          for (const l of e.ls) {
            if (l.x === undefined) continue;
            const x = l.x + ox, y = l.y + oy;
            if (l.gone) { const k = (e.t - l.gone) / 0.3; if (k < 1) A.alpha(ctx, 1 - k, () => A.ring(ctx, x, y, 3 + k * 14, SP)); continue; }
            A.glow(ctx, x, y, 7, SP, 0.3);
            A.px(ctx, x - 4, y - 5, 8, 10, '#c8e8a0'); A.px(ctx, x - 4, y - 6, 8, 2, '#5a3a1a'); A.px(ctx, x - 4, y + 4, 8, 1, '#5a3a1a');
            A.px(ctx, x - 2, y - 3, 4, 6, SP); A.px(ctx, x - 1, y - 2 - (Math.floor(e.t * 12 + l.ph) % 2), 2, 3, SPL); A.px(ctx, x, y - 9, 1, 3, '#5a3a1a');
          }
        },
      },
      {
        name: 'Guardian Spirit', dmg: 18, cd: 13, mp: 8, kind: 'custom', life: 5,
        desc: 'A towering guardian spirit rises up behind you and stays a while. Anything that gets too close gets flattened by its fist.',
        spawn(e, g, A) { e.at = 0.3; e.slam = 0; A.sfx('spirit'); },
        update(e, dt, g, A) {
          const p = A.p; e.x = p.cx - p.facing * 10; e.f = p.feet; e.d = p.facing; e.at -= dt; e.slam = Math.max(0, e.slam - dt);
          const t = A.near(p.cx + p.facing * 20, p.y + 10, 50 * H.sc(e));
          if (t && e.at <= 0 && e.t > 0.3) { e.at = e.up ? 0.6 : 0.85; e.slam = 0.25; e.sx = A.center(t).x; e.hit.clear(); A.hitR(e, e.sx, A.center(t).y, 16 * H.sc(e), { kb: 1.2, onHit(tt) { if (tt.applyStatus) tt.applyStatus('haunt', 0); } }); A.sfx('thud', { minGap: 0.1 }); A.shake(2, 0.1); }
        },
        draw(e, ctx, ox, oy, A) {
          if (e.x === undefined) return;
          const x = e.x + ox, f = e.f + oy, rise = Math.min(1, e.t / 0.4), fa = A.fade(e, 0.3, 0.5), R = facer(ctx, A, x, f - 40 * (1 - rise), e.d);
          A.alpha(ctx, 0.5 * fa, () => { R(-8, -44, 16, 24, SP); R(-6, -54, 12, 10, SPL); R(-3, -50, 2, 2, '#ffffff'); R(2, -50, 2, 2, '#ffffff'); R(-10, -46, 20, 3, SPL); for (let i = 0; i < 4; i++) R(-6 + i * 3, -20 + (i % 2) * 2, 3, 6, SP); });
          if (e.slam > 0 && e.sx !== undefined) { const k = 1 - e.slam / 0.25, fx = e.sx + ox, fy = U.lerp(f - 50, f - 10, W.easeIn(Math.min(1, k * 2))); A.alpha(ctx, 0.7 * fa, () => { A.px(ctx, fx - 6, fy - 6, 12, 12, SPL); A.px(ctx, fx - 6, fy - 6, 12, 2, '#ffffff'); }); }
        },
      },
      {
        name: 'Spirit Drain', dmg: 26, cd: 10, mp: 7, kind: 'custom', life: 1.4,
        desc: 'Reach out and pull the spirit halfway out of the nearest enemy. When it snaps back it bursts, hurting everything near it, and it heals you a little.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 150); e.tg = t; if (!t) { e.dead = true; return; } holdStun(t, 1.1); A.sfx('hover'); },
        update(e, dt, g, A) {
          if (!e.tg || e.tg.dead || e.done || e.t < 0.9) return;
          e.done = true; const c = A.center(e.tg); A.damage(e, e.tg, 1, 0.3); W.boom(A, e, c.x, c.y, 26 * H.sc(e), { mult: 0.6 });
          const p = A.p; if (p.maxHp) { const heal = Math.round(p.maxHp * (e.up ? 0.08 : 0.05)); p.hp = Math.min(p.maxHp, p.hp + heal); A.g.floatText(p.cx, p.y - 8, '+' + heal, SP); }
          A.sfx('revive');
        },
        draw(e, ctx, ox, oy, A) {
          if (!e.tg || e.tg.dead) return;
          const p = A.p, c = A.center(e.tg), sx = U.lerp(c.x, p.cx, W.easeIn(Math.min(1, e.t / 0.9)) * 0.6), f = e.done ? Math.max(0, 1 - (e.t - 0.9) / 0.4) : 1, gx = sx + ox, gy = c.y + oy;
          A.alpha(ctx, f, () => {
            A.alpha(ctx, 0.65, () => { A.disc(ctx, gx, gy - 2, 6, SP, SPL); A.px(ctx, gx - 6, gy - 2, 12, 6, SP); for (let i = 0; i < 4; i++) A.px(ctx, gx - 6 + i * 3, gy + 4 + ((i + Math.floor(e.t * 10)) % 2), 3, 2, SP); });
            A.px(ctx, gx - 3, gy - 3, 2, 2, '#1a3a1a'); A.px(ctx, gx + 2, gy - 3, 2, 2, '#1a3a1a'); A.px(ctx, gx - 1, gy + 1, 3, 1, '#1a3a1a');
            let lx = c.x + ox, ly = gy;
            for (let i = 1; i <= 10; i++) { const q = i / 10, nx = U.lerp(c.x, sx, q) + ox, ny = gy + Math.sin(q * 8 + e.t * 10) * 2; A.line(ctx, lx, ly, nx, ny, SP, 2); lx = nx; ly = ny; }
            for (let i = 0; i < 6; i++) { const q = (e.t * 2 + i / 6) % 1; A.px(ctx, U.lerp(sx, p.cx, q) + ox - 1, U.lerp(c.y, p.y + 10, q) + oy - 1, 2, 2, SPL); }
          });
        },
      },
      {
        name: 'Spirit Arrows', dmg: 8, cd: 8, mp: 7, kind: 'custom', life: 1.8,
        desc: 'An ancestral archer appears in the air above you and looses a volley of spirit arrows onto the enemies ahead.',
        spawn(e, g, A) { const p = A.p; e.ax = p.cx - p.facing * 6; e.ay = Math.max(H.sky(A, p.cx, p.y) + 10, p.y - 34); e.d = p.facing; e.n = 0; A.sfx('star'); },
        update(e, dt, g, A) {
          if (e.t < 0.3 + e.n * 0.1 || e.n >= (e.up ? 8 : 6)) return;
          e.n++;
          const t = A.near(e.ax + e.d * 60, A.p.y, 180), tx = t ? A.center(t).x + A.rnd(-8, 8) : e.ax + e.d * A.rnd(40, 120), ty = t ? A.center(t).y : A.p.y + 10, T = 0.45, G = 300;
          A.spawn(e, H.proj((b, ctx, ox, oy, A) => { const a = Math.atan2(b.vy, b.vx), c = Math.cos(a), s = Math.sin(a); A.line(ctx, b.x + ox - c * 6, b.y + oy - s * 6, b.x + ox, b.y + oy, SPL); A.px(ctx, b.x + ox, b.y + oy, 1, 1, '#ffffff'); A.px(ctx, b.x + ox - c * 6, b.y + oy - s * 6, 1, 1, SP); }, { life: 0.8, r: 3, gravity: G }), { x: e.ax, y: e.ay, vx: (tx - e.ax) / T, vy: (ty - e.ay) / T - 0.5 * G * T });
          A.sfx('swing', { minGap: 0.05 });
        },
        draw(e, ctx, ox, oy, A) { const x = e.ax + ox, y = e.ay + oy; A.alpha(ctx, 0.55 * A.fade(e, 0.2, 0.4), () => { H.drawGhost(ctx, A, 'attack', x, y + 11, e.d, SP); for (let i = 0; i <= 10; i++) { const a = U.lerp(-1.2, 1.2, i / 10); A.px(ctx, x + e.d * (6 + Math.cos(a) * 6), y - 2 + Math.sin(a) * 8, 1, 1, SPL); } }); },
      },
    ],
    ult: {
      name: 'Eternal Legion', dmg: 9,
      desc: 'Call every spirit that ever fought beside you. An army of ghost warriors and spirit beasts charges across the battlefield... then they all merge into one colossal spirit warrior, who swings once.',
      charge: {
        pose: (t, k) => (k < 0.6 ? J({ FA: [[10.6, 13.6], [7.6, 13.4]], BA: [[6.2, 13.6], [9.4, 13]], eyesClosed: true }) : J({ FA: [[11.6, 12.4], [14, 10]], BA: [[5, 12.4], [2.6, 10]] })),
        lift: 8,
        draw(ctx, x, y, k, t, A) { for (let i = 0; i < 14; i++) { const kk = (t * 0.9 + i / 14) % 1; A.alpha(ctx, (1 - kk) * k, () => SOUL(ctx, A, x + Math.sin(i * 2.4) * 18, y + 14 - kk * 60, t + i, 1.2)); } A.alpha(ctx, 0.25 * k, () => { for (let i = 0; i < 7; i++) H.drawGhost(ctx, A, 'idle', x - 60 + i * 20, y + 22 - (i % 2) * 4, 1, SP); }); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 4.2, layer: 'screen',
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t); e.dir = p.facing; e.army = []; for (let i = 0; i < 26; i++) e.army.push({ off: i * 18 + Math.random() * 10, row: i % 3, beast: i % 4 === 3 }); A.sfx('spirit'); A.sfx('rumble', { dur: 2.4 }); },
          update(e, dt, g, A) {
            if (e.t < 2.2) { e.front = p.cx - e.dir * 260 + e.dir * e.t * 300; A.tick(e, { x: e.dir > 0 ? e.front - 60 : e.front, y: A.top(), w: 60, h: 600 }, 0.25, { mult: 0.8, kb: 0.6, dir: e.dir, onHit(t) { if (t.applyStatus) t.applyStatus('haunt', e.potency); } }); }
            if (e.t > 2.3 && !e.giant) { e.giant = e.t; A.sfx('surge'); }
            if (e.giant && e.t - e.giant > 0.9 && !e.swing) { e.swing = e.t; A.hitR(e, p.cx + e.dir * 80, p.feet - 20, 220, { mult: 7, kb: 2 }); A.sfx('boom'); A.flash(0.5); A.shake(16, 0.7); }
          },
          draw(e, ctx, ox, oy, A) {
            const dark = e.t < 3.8 ? Math.min(1, e.t * 2) * 0.5 : Math.max(0, 0.5 - (e.t - 3.8) * 1.2), gy = p.feet + oy;
            A.alpha(ctx, dark, () => A.px(ctx, -10, -10, 2000, 2000, '#061408'));
            if (e.t < 2.4 && e.front !== undefined) for (const s of e.army) { const x = e.front - e.dir * s.off + ox, y = gy - s.row * 6, a = (0.7 - s.row * 0.15) * Math.min(1, (2.4 - e.t) * 4); A.alpha(ctx, a, () => (s.beast ? STAG(ctx, A, x, y, e.dir, e.t + s.off) : H.drawGhost(ctx, A, 'run', x, y, e.dir, s.row ? SPL : SP))); }
            if (e.giant) GIANT(ctx, A, p.cx + ox - e.dir * 30, gy, e.dir, Math.min(1, (e.t - e.giant) / 0.6), e.swing ? Math.min(1, (e.t - e.swing) / 0.2) : 0);
            if (e.swing) { const q = (e.t - e.swing) / 0.8; if (q < 1) A.alpha(ctx, 1 - q, () => { for (let i = 0; i < 3; i++) A.arc(ctx, p.cx + ox + e.dir * 40, gy - 40, 90 + i * 10, e.dir, i ? SP : '#ffffff', 3, -1.4, 1.0); }); }
          },
        }, {});
      },
    },
  };

  // =============================================================== CHAOS (everything at once)
  const RB = ['#ff5a5a', '#ffb83a', '#ffe95a', '#5fd84a', '#3aa0ff', '#c86aff'];
  const rb = (t) => RB[((Math.floor(t * 12) % 6) + 6) % 6];
  const others = () => ERX.Elements.list.map((x) => x.id).filter((id) => id !== 'chaos' && ERX.Awakened[id]);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const hue = (h) => 'hsl(' + Math.round(((h % 360) + 360) % 360) + ', 100%, 62%)';
  // awakened Chaos is a white entity with a shifting rainbow outline
  const whites = new WeakMap();
  let rimCv = null;
  const whiteOf = (cv) => { let w = whites.get(cv); if (!w) { w = ERX.Sprites.tint(cv, '#ffffff'); whites.set(cv, w); } return w; };
  function chaosBody(ctx, cv, x, y, facing, t) {
    const PS = ERX.PlayerSide;
    if (!rimCv || rimCv.width !== cv.width || rimCv.height !== cv.height) rimCv = ERX.makeCanvas(cv.width, cv.height);
    const c = rimCv.getContext('2d');
    c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, rimCv.width, rimCv.height); c.drawImage(cv, 0, 0);
    c.globalCompositeOperation = 'source-in';
    const gr = c.createLinearGradient(0, 0, rimCv.width, rimCv.height);
    for (let i = 0; i <= 6; i++) gr.addColorStop(i / 6, hue(t * 160 + i * 60));
    c.fillStyle = gr; c.fillRect(0, 0, rimCv.width, rimCv.height);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) PS.draw(ctx, rimCv, x + dx, y + dy, facing);
    PS.draw(ctx, whiteOf(cv), x, y, facing);
  }
  const GLITCH = (ctx, A, x, y, w, h, t) => { for (let i = 0; i < 6; i++) A.px(ctx, x + ((i * 5 + Math.floor(t * 30) * 3) % 7) - 3, y + ((i * 13 + Math.floor(t * 40) * 7) % Math.max(1, Math.round(h))), w, 1 + (i % 2), RB[(i + Math.floor(t * 20)) % 6]); };
  const BURST = (ctx, A, x, gy, kind, k, t) => A.alpha(ctx, 1 - k, () => {
    switch (kind) {
      case 0: for (let i = 0; i < 8; i++) W.flame(ctx, A, x - 7 + i * 2, gy, 8 + Math.sin(i * 3) * 4 + k * 10, t, ['#ff4a1a', '#ff9a1a', '#ffe95a']); break;            // fire
      case 1: for (let i = -2; i <= 2; i++) A.tri(ctx, x + i * 5, gy, 5, (16 - Math.abs(i) * 4) * Math.min(1, k * 4 + 0.2), '#a8e8ff', '#ffffff'); break;          // ice
      case 2: A.jag(ctx, x + A.rnd(-6, 6), gy - 60, x, gy, '#ffe95a', 4, 2); A.jag(ctx, x + A.rnd(-6, 6), gy - 60, x, gy, '#ffffff', 3, 1); break;               // lightning
      case 3: for (let i = 0; i < 5; i++) A.disc(ctx, x + Math.sin(i * 2 + t * 4) * 8, gy - 6 - i * 5 - k * 10, 3 + (i % 2), '#7ae05a', '#c8ff9a'); break;     // poison
      default: A.disc(ctx, x, gy - 14, Math.round(4 + k * 10), '#000000'); A.ring(ctx, x, gy - 14, 5 + k * 10, '#c86aff');                                        // void
    }
  });
  const CHICKEN = (ctx, A, x, gy, d, t) => {
    const R = facer(ctx, A, x, gy, d), b = Math.floor(t * 8) % 2;
    R(-4, -8 - b, 8, 6, '#f8f4e8'); R(1, -12 - b, 4, 5, '#f8f4e8'); R(5, -10 - b, 2, 1, '#ffb83a'); R(2, -14 - b, 2, 2, '#e8303a'); R(3, -11 - b, 1, 1, '#120c1a'); R(-6, -7 - b, 2, 3, '#e8e0d0'); R(-2, -2, 1, 2, '#ffb83a'); R(1, -2, 1, 2, '#ffb83a');
  };
  const BURST_STATUS = ['burn', 'chill', 'shock', 'poison', 'erode'];
  // ---- Reality Collapse (the awakened Ultimate): its poses, the X of light, star eyes, rainbow rings, and everything at once
  const TUCK = { FL: [[11.2, 17.6], [9.6, 19.8]], BL: [[8.4, 17.8], [6.6, 20]] };
  const AIR = { FL: [[10, 19], [9.6, 22]], BL: [[7.2, 19], [6.6, 21.8]] };
  /** Arms crossed over the chest in an X (forearms crossing in front of you), trembling harder as the power builds. */
  const xArms = (t, k, legs) => { const sh = Math.sin(t * 60) * 0.4 * (k || 0); return J(Object.assign({ bob: 1, FL: [[10.4, 19], [11.2, 22]], BL: [[6, 19], [5.2, 22]], FA: [[11.8 + sh, 14.6], [9.2, 10.4 + sh]], BA: [[11 - sh, 14.2], [12.2, 10 - sh]], fist: true }, legs || {})); };
  /** The roar: chest out, head back, arms flexed out at your sides, mouth wide open. */
  const roarPose = (t) => { const sh = Math.sin(t * 70) * 0.4; return J(Object.assign({ lean: -2, FA: [[10.8 + sh, 13.4], [12.8, 15.6 + sh]], BA: [[5.6 - sh, 13.4], [3.6, 15.2 - sh]], fist: true, mouthOpen: true }, AIR)); };
  /** A white-hot X over your crossed arms, edged in shifting colours. */
  const xLight = (ctx, A, x, y, L, t) => { for (const sg of [-1, 1]) { A.line(ctx, x - L, y - L * sg, x + L, y + L * sg, hue(t * 300 + (sg > 0 ? 0 : 180)), 3); A.line(ctx, x - L, y - L * sg, x + L, y + L * sg, '#ffffff', 1); } };
  /** An eye burning like a star: a white four-point star with a rainbow outline. */
  const STAR_EYE = (ctx, A, x, y, t) => {
    const L = Math.round(5 + Math.sin(t * 22) * 1.5);
    A.glow(ctx, x, y, 4, '#ffffff', 0.45);
    for (let i = -L - 1; i <= L + 1; i++) { const c = hue(t * 420 + i * 40); A.px(ctx, x + i, y - 1, 1, 3, c); A.px(ctx, x - 1, y + i, 3, 1, c); }
    for (let i = -L; i <= L; i++) { A.px(ctx, x + i, y, 1, 1, '#ffffff'); A.px(ctx, x, y + i, 1, 1, '#ffffff'); }
    A.px(ctx, x - 1, y - 1, 3, 3, '#ffffff');
  };
  /** A ring whose colour runs all the way round the rainbow (flat: squash it). */
  const rainbowRing = (ctx, A, x, y, r, t, flat) => { const n = Math.max(12, Math.round(r * 2.4)); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * (flat || 1), 1, 1, hue((i / n) * 360 + t * 300)); } };
  // moves that would yank you around mid-roar (lunges, teleports, buffs, cameras) sit this one out
  const MOVES_YOU = /p\.x\s*=|p\.x\s*\+=|p\.y\s*=|p\.y\s*\+=|placeAt|lungeT|p\.vx\s*=|p\.vy\s*=|dashT|ultHold|\.hold\(|buffs\.|invulnT|vanishT|ultCam|cinePose/;
  const safe = (m) => !!m && !MOVES_YOU.test(String(m.spawn) + String(m.update) + String(m.run));
  const hits = (m) => safe(m) && (m.dmg || 0) > 0;
  /** Everything at once: other elements' Ultimates (a few, spaced out), awakened skills and attacks, ordinary skills and attacks. */
  function unleash(A, e, e0) {
    const p = A.p, P = ERX.Abilities.palette, id = pick(others()), el = ERX.Elements.get(id);
    const at = { x: p.cx + p.facing * 10, y: p.y + 10, dir: p.facing };
    const say = (txt, c) => e.names.push({ s: txt, c, t: e.t });
    if (e.ults < 3 && e.t - e.lastUlt > 1.15) {
      const kit = ERX.Kits[id];
      if (safe(kit.ult)) {
        e.ults++; e.lastUlt = e.t; e.count.ult++;
        kit.ult.run(A, Object.assign({}, e0, at, { pal: P(el, kit, false), status: kit.status, dmg: (kit.ult.dmg || 24) * (e0.dmg / 9) * 0.45, isUlt: true, hit: new Set(), hitT: new Map(), t: 0 }), el);
        say(kit.ult.name.toUpperCase() + '!', el.color);
        return;
      }
    }
    const roll = Math.random();
    if (roll < 0.45) {
      const ak = ERX.Awakened[id], def = roll < 0.35 ? pick(ak.s.filter(hits)) : ak.m1;
      if (!hits(def)) return;
      A.spawn(e0, def, Object.assign({}, at, { pal: P(el, ak, false), status: ak.status, dmg: (def.dmg || 10) * (e0.dmg / 9) * 0.5, isAwk: true, isUlt: true }));
      say(def.name.toUpperCase(), ak.color); e.count.awk++;
    } else {
      const kit = ERX.Kits[id], mv = roll < 0.85 ? pick(kit.s.filter(hits)) : kit.m1;
      if (!hits(mv)) return;
      ERX.Abilities.castMove(A.g, mv, Object.assign({}, at, { pal: P(el, kit, false), up: false, potency: e0.potency, status: kit.status, dmg: (mv.dmg || 8) * (e0.dmg / 9) * 0.5, el: 'chaos', isUlt: true }));
      say(mv.name.toUpperCase(), el.color); e.count.skill++;
    }
  }
  AW.chaos = {
    color: '#ffffff', up: 'rainbow', status: 'random', fx: 'chaos', block: ['Paradox Ward', 'shield'],
    icons: ['fission', 'probability', 'realityTear', 'transmute', 'butterfly'],
    look: {
      body(ctx, cv, x, y, facing, F) { chaosBody(ctx, cv, x, y, facing, F.t); },
      fx(ctx, F) {
        const A = F.A, e = F.at('eye');
        // a rainbow flame where the left eye should be (like awakened fire's, only wronger)
        W.flame(ctx, A, e.x - F.d, e.y, 6 + Math.sin(F.t * 9) * 2, F.t, [hue(F.t * 200), hue(F.t * 200 + 70), '#ffffff']);
        A.px(ctx, e.x, e.y, 1, 1, '#120c1a');
        for (let i = 0; i < 3; i++) { const a = F.t * 2 + i * 2.1; A.px(ctx, F.x + Math.cos(a) * 12, F.y - 12 + Math.sin(a * 1.3) * 7, 1, 1, hue(F.t * 120 + i * 120)); }
        if (Math.floor(F.t * 7) % 11 === 0) GLITCH(ctx, A, F.x - 8, F.y - 24, 16, 24, F.t);   // reality hiccups around you
      },
    },
    idle: {
      // a menacing stance, like awakened fire's... that twitches and glitches every so often
      pose: (t) => { const j = IDLE.menace(t, { lean: 1, fist: true }); if (Math.sin(t * 5.3) > 0.96) { j.lean = -2; j.bob = 2; } return j; },
      back(ctx, F) { for (let i = 0; i < 6; i++) { const k = (F.t * 0.7 + i / 6) % 1; F.A.alpha(ctx, 1 - k, () => F.A.px(ctx, F.x + Math.sin(i * 2.4 + F.t) * 9, F.y - 2 - k * 28, 1, 1, hue(F.t * 150 + i * 60))); } },
    },
    run: {
      // Chaos doesn't run. It floats.
      pose: (ph) => RUN.hover(ph, { lift: 7, lean: 3, arms: [[7.6, 14], [5, 15.8]], armsB: [[6.8, 14], [4.4, 15.4]] }),
      back(ctx, F) { for (let i = 1; i < 10; i++) F.A.alpha(ctx, 0.75 - i * 0.07, () => F.A.px(ctx, F.x - F.d * (2 + i * 4), F.y - 14 + Math.sin(F.t * 10 + i) * 3, 3, 2, hue(F.t * 200 + i * 36))); },
      step(A, p, dt) { if (W.every(p, 'cglitch', 0.09, dt)) A.g.fx.add({ x: p.cx - p.facing * 6, y: p.y + A.rnd(2, 20), vx: -p.facing * A.rnd(20, 60), vy: A.rnd(-20, 20), life: 0.4, color: RB[Math.floor(Math.random() * 6)], size: 2, fadeOut: 0.3 }); },
    },
    dash: {
      name: 'Glitch Step', style: 'blink', dmg: 14, life: 1.8,
      spawn(e, g, A) { const p = A.p; e.sx = p.cx; e.f = p.feet; e.d = p.facing; e.y0 = p.y; e.glitched = []; A.sfx('recordScratch', { minGap: 0.1 }); },
      update(e, dt, g, A) {
        const p = A.p;
        if (!e.out) e.ex = p.cx;
        // everything you pass through glitches out...
        if (!e.out || e.t - e.out < 0.1) A.hit(e, { x: Math.min(e.sx, e.ex) - 10, y: e.y0, w: Math.abs(e.ex - e.sx) + 20, h: p.h }, { kb: 0.3, onHit(t) { t._glitchUntil = g.t + 1.8; holdStun(t, 1.1); if (t.applyStatus) t.applyStatus('random', 0); e.glitched.push(t); } });
        if (p.dashT <= 0 && !e.out) { e.out = e.t; A.sfx('zap'); }
        // ...and keeps breaking a little more while it stays broken
        e.gt = (e.gt || 0) - dt; if (e.out && e.gt <= 0) { e.gt = 0.3; for (const t of e.glitched) if (!t.dead && t._glitchUntil > g.t) A.damage(e, t, 0.25, 0); }
      },
      draw(e, ctx, ox, oy, A) {
        const ex = e.ex !== undefined ? e.ex : e.sx, k = e.out ? Math.min(1, (e.t - e.out) / 0.5) : 0;
        // where you were: a colour-split afterimage tearing apart
        A.alpha(ctx, 0.6 * (1 - Math.min(1, e.t / 0.5)), () => { H.drawGhost(ctx, A, 'dash', e.sx + ox - 2, e.f + oy, e.d, '#ff2adf'); H.drawGhost(ctx, A, 'dash', e.sx + ox + 2, e.f + oy, e.d, '#2affff'); });
        // the path you took: broken pixels and colour bars
        A.alpha(ctx, 1 - k, () => { const x0 = Math.min(e.sx, ex) + ox, w = Math.max(1, Math.round(Math.abs(ex - e.sx))); for (let i = 0; i < 12; i++) A.px(ctx, x0 + ((i * 37 + Math.floor(e.t * 30) * 11) % w), e.y0 + oy + ((i * 13 + Math.floor(e.t * 20) * 5) % 22), 2 + (i % 4), 1 + (i % 2), RB[(i + Math.floor(e.t * 15)) % 6]); });
        if (e.out) A.alpha(ctx, 1 - k, () => GLITCH(ctx, A, ex + ox - 10, e.y0 + oy, 20, 22, e.t));
      },
    },
    guard: {
      name: 'Paradox Ward', sound: 'glitch',
      // one hand held out; the ward in front of it keeps flicking between other elements' blocks
      pose: () => J({ FL: [[10, 19], [10.6, 22]], BL: [[6.6, 19], [6.2, 22]], FA: [[12.4, 13.2], [15.2, 12.8]], BA: [[6.6, 14.4], [6.2, 16.8]] }),
      draw(ctx, G) { const ids = others(); ERX.Awakened[ids[Math.floor(G.t * 2) % ids.length]].guard.draw(ctx, G); if ((G.t * 2) % 1 < 0.15) GLITCH(ctx, G.A, G.x - 6, G.bot - G.h, 12, G.h, G.t); },
      hit(g, x, y, d, P) { ERX.Awakened[pick(others())].guard.hit(g, x, y, d, P); },
    },
    m1: {
      name: 'Chaos Pillar', dmg: 11, cd: 0.38, kind: 'custom', life: 0.42,
      desc: 'The same white beam, but it erupts out of the ground right under whatever you are looking at. Three random effects. Each.',
      spawn(e, g, A) {
        const p = A.p, o = H.nearby(A, p.cx, p.y + 10, 170).find((n) => (n.c.x - p.cx) * p.facing > -6);
        e.dir = p.facing; e.status = null; e.pal = Object.assign({}, e.pal, { c: '#ffffff', l: '#ffffff' });
        e.x = o ? o.c.x : p.cx + p.facing * 48;
        e.gy = A.ground(e.x, o ? o.t.box.y + o.t.box.h - 4 : p.y + p.h - 4);
        e.top = Math.max(H.sky(A, e.x, e.gy - 8), e.gy - 110);
        A.sfx('zap', { minGap: 0.04 });
      },
      update(e, dt, g, A) {
        if (e.t < 0.06 || e.erupt) return;
        e.erupt = true;
        const w = 7 * H.sc(e);
        A.hit(e, { x: e.x - w, y: e.top, w: w * 2, h: e.gy - e.top }, { kb: 0.5, onHit: (t) => { ERX.Kits.chaos.randomEffects(e, t, 3); H.launch(t, 160); } });
        A.shake(2, 0.1); W.debris(A, e.x, e.gy - 2, 10, RB, 170);
      },
      draw(e, ctx, ox, oy, A) {
        const x = e.x + ox, gy = e.gy + oy, top = e.top + oy, t = e.t, sc = H.sc(e);
        if (t < 0.06) { rainbowRing(ctx, A, x, gy - 1, 4 + (t / 0.06) * 8, t * 10, 0.3); A.px(ctx, x - 1, gy - 3, 2, 3, '#ffffff'); return; }   // the ground splits open first
        const k = (t - 0.06) / (e.life - 0.06), rise = Math.min(1, (t - 0.06) / 0.07), w = Math.max(1, Math.round(6 * sc * (k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45))), y1 = gy - (gy - top) * rise;
        A.alpha(ctx, 0.25, () => A.px(ctx, x - w - 4, y1, w * 2 + 8, gy - y1, '#ffffff'));
        for (let yy = y1; yy < gy; yy += 2) {   // the rainbow edges, flowing upwards
          const wob = Math.sin(yy * 0.3 + t * 40) * 0.7;
          A.px(ctx, x - w - 1 + wob, yy, 1, 2, hue(yy * 6 - t * 900));
          A.px(ctx, x + w - wob, yy, 1, 2, hue(yy * 6 - t * 900 + 180));
        }
        A.px(ctx, x - w + 1, y1, w * 2 - 2, gy - y1, '#ffffff');   // the white core
        rainbowRing(ctx, A, x, gy - 1, w + 6 + k * 10, t * 4, 0.3);   // where it bursts out of the ground
        if (rise < 1 || k < 0.4) A.star(ctx, x, y1, w + 2, '#ffffff', hue(t * 600));
        for (let i = 0; i < 8; i++) { const q = (i * 0.37 + t * 4) % 1; A.px(ctx, x + Math.sin(i * 5 + t * 30) * (w + 4), gy - (gy - y1) * q, 1, 1, hue(i * 45 + t * 300)); }
      },
    },
    s: [
      {
        name: 'Fission', dmg: 16, cd: 8, mp: 7, kind: 'custom', life: 0.4,
        desc: 'Split one attack into two: two random awakened skills from two other elements, cast at the same time.',
        spawn(e, g, A) {
          const ids = others(), a = pick(ids), b = pick(ids.filter((id) => id !== a)), names = [];
          for (const id of [a, b]) { const def = ERX.Awakened[id].s[Math.floor(Math.random() * 5)]; names.push(def.name); A.spawn(e, def, { dmg: e.dmg * (def.dmg / 16) }); }
          A.g.floatText(A.p.cx, A.p.y - 12, names.join(' + '), '#ffffff'); A.sfx('chaos');
        },
        draw(e, ctx, ox, oy, A) { const p = A.p, r = 6 + e.t * 40; A.alpha(ctx, 1 - e.t / e.life, () => { for (let i = 0; i < 6; i++) A.ring(ctx, p.cx + ox, p.y + 10 + oy, r + i, RB[i], r + i); }); },
      },
      {
        name: 'Probability Beam', dmg: 6, cd: 7, mp: 6, kind: 'custom', life: 0.9,
        desc: 'Fire a beam that cannot decide which element it is. Every few pixels it changes its mind, and so does what it does to you.',
        spawn(e, g, A) { H.at(e, A, 6, -2); A.sfx('zap'); },
        update(e, dt, g, A) { H.at(e, A, 6, -2); const L = 150 * H.sc(e), n = 6; for (let i = 0; i < n; i++) { const x0 = e.x + e.dir * (i / n) * L; A.tick(e, { x: e.dir > 0 ? x0 : x0 - L / n, y: e.y - 5, w: L / n, h: 10 }, 0.15, { kb: 0.2, onHit(t) { if (t.applyStatus) t.applyStatus('random', 0); } }); } },
        draw(e, ctx, ox, oy, A) { const L = 150 * H.sc(e), n = 6; A.alpha(ctx, A.fade(e, 0.05, 0.2), () => { for (let i = 0; i < n; i++) { const x0 = e.x + ox + e.dir * (i / n) * L, xs = e.dir > 0 ? x0 : x0 - L / n, w = 6 + Math.sin(e.t * 40 + i) * 2; A.px(ctx, xs, e.y + oy - w / 2, L / n, w, RB[(i + Math.floor(e.t * 15)) % 6]); A.px(ctx, xs, e.y + oy - 1, L / n, 2, '#ffffff'); } }); },
      },
      {
        name: 'Reality Tear', dmg: 9, cd: 9, mp: 7, kind: 'custom', life: 2.4,
        desc: 'Rip a hole in the floor of reality. Random bits of other elements come spewing out of it: fire, ice, lightning, worse.',
        spawn(e, g, A) { H.at(e, A, 40); const ax = A.aim(e, 120); if (ax !== null) e.x = ax; e.gy = H.floor(A, e.x); e.bt = 0; e.bursts = []; A.sfx('glassCrack'); },
        update(e, dt, g, A) {
          e.bt -= dt; for (const b of e.bursts) b.t += dt;
          if (e.t < 2 && e.bt <= 0) { e.bt = 0.16; const kind = Math.floor(Math.random() * 5), x = e.x + A.rnd(-30, 30); e.bursts.push({ x, kind, t: 0 }); e.hit.clear(); A.hit(e, { x: x - 10, y: e.gy - 40, w: 20, h: 40 }, { kb: 0.4, onHit(t) { if (t.applyStatus) t.applyStatus(BURST_STATUS[kind], 0); } }); }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, gy = e.gy + oy;
          A.alpha(ctx, A.fade(e, 0.1, 0.3), () => { for (let i = 0; i < 14; i++) { const h = 2 + Math.abs(Math.sin(i * 2.7 + e.t * 3)) * 3; A.px(ctx, x - 30 + i * 4.6, gy - h / 2, 4, h, '#000000'); A.px(ctx, x - 30 + i * 4.6, gy - h / 2 - 1, 4, 1, rb(e.t + i * 0.1)); } });
          for (const b of e.bursts) if (b.t < 0.4) BURST(ctx, A, b.x + ox, gy, b.kind, b.t / 0.4, e.t);
        },
      },
      {
        name: 'Transmute', dmg: 30, cd: 11, mp: 7, kind: 'custom', life: 1.9,
        desc: 'Turn the nearest enemy into a chicken. It is helpless, confused, and everything hurts it more. Then it turns back. Explosively.',
        spawn(e, g, A) {
          const t = A.near(A.p.cx, A.p.y, 160); e.tg = t; if (!t) { e.dead = true; return; }
          const c = A.center(t); t._erased = true; holdStun(t, 1.5); if (t.applyStatus) t.applyStatus('expose', e.potency);
          A.damage(e, t, 0.3, 0); A.puff(e, c.x, c.y, 10, 2); A.spawn(e, W.SHOCK, { x: c.x, y: c.y, r: 20, dmg: 0, life: 0.3, c: RB[Math.floor(Math.random() * 6)] });
          A.g.floatText(c.x, t.box.y - 8, 'BAWK', '#ffffff'); A.sfx('pop');
        },
        update(e, dt, g, A) { if (!e.tg) return; if (e.tg.dead) { delete e.tg._erased; e.dead = true; return; } if (e.t > 1.4 && !e.back) { e.back = true; delete e.tg._erased; const c = A.center(e.tg); A.damage(e, e.tg, 1, 0.8); W.boom(A, e, c.x, c.y, 30 * H.sc(e), { mult: 0.6 }); A.puff(e, c.x, c.y, 10, 2); A.sfx('pop'); } },
        onEnd(e) { if (e.tg) delete e.tg._erased; },
        draw(e, ctx, ox, oy, A) { if (!e.tg || e.back) return; const b = e.tg.box; CHICKEN(ctx, A, b.x + b.w / 2 + ox, b.y + b.h + oy, Math.sin(e.t * 3) > 0 ? 1 : -1, e.t); },
      },
      {
        name: 'Butterfly Effect', dmg: 46, cd: 12, mp: 8, kind: 'custom', life: 2.2,
        desc: 'Release one tiny rainbow butterfly. It flaps its wings once near an enemy, and causes a catastrophe.',
        spawn(e, g, A) { H.at(e, A, 4, -8); e.tg = A.near(e.x, e.y, 200); e.bx = e.x; e.by = e.y; A.sfx('star'); },
        update(e, dt, g, A) {
          if (e.boom) return;
          const c = e.tg && !e.tg.dead ? A.center(e.tg) : { x: e.bx + e.dir * 40, y: e.by };
          e.bx = U.approach(e.bx, c.x, 2.5, dt); e.by = U.approach(e.by, c.y - 10, 2.5, dt) + Math.sin(e.t * 9) * 0.6;
          if (e.t > 1.1) { e.boom = e.t; e.kind = Math.floor(Math.random() * 5); e.cx = c.x; e.cy = c.y; A.blast(e, c.x, c.y, 46 * H.sc(e)); A.sfx('boom'); A.flash(0.3); A.shake(8, 0.4); }
        },
        draw(e, ctx, ox, oy, A) {
          if (!e.boom) { const x = e.bx + ox, y = e.by + oy, fl = Math.sin(e.t * 30) > 0 ? 2 : 1; A.px(ctx, x - fl - 1, y - 2, fl, 3, rb(e.t)); A.px(ctx, x + 1, y - 2, fl, 3, rb(e.t + 0.3)); A.px(ctx, x, y - 2, 1, 4, '#120c1a'); return; }
          const k = (e.t - e.boom) / 1.1;
          for (let i = 0; i < 4; i++) { const r = 6 + k * (60 - i * 8); A.alpha(ctx, 1 - k, () => A.ring(ctx, e.cx + ox, e.cy + oy, r, RB[(i + Math.floor(e.t * 20)) % 6], r)); }
          BURST(ctx, A, e.cx + ox, e.cy + oy + 14, e.kind, Math.min(1, k * 1.5), e.t);
        },
      },
    ],
    ult: {
      name: 'Reality Collapse', dmg: 9, cinema: false,
      desc: 'Cross your arms, leap into the air and drink in every colour there is... then ROAR. A white shockwave tears out of you, your eyes burn like stars, and every element\'s moves go off at once (Ultimates, awakened skills, ordinary skills) for as long as the roar lasts.',
      charge: {
        // arms crossed over your chest in an X, shaking harder as the colours pour in
        pose: (t, k) => xArms(t, k),
        lift: 2,
        draw(ctx, x, y, k, t, A, P, cine) {
          const d = cine ? cine.g.player.facing : 1, cx = x + d * 3, cy = y - 1;
          // every colour there is, streaming in from all around
          for (let i = 0; i < 28; i++) {
            const q = (t * 1.6 + i / 28) % 1, a = i * 2.39 + t * 0.6, r = (1 - q) * (30 + (i % 4) * 9);
            A.alpha(ctx, q * (0.35 + k * 0.65), () => A.line(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, cx + Math.cos(a) * (r + 5), cy + Math.sin(a) * (r + 5) * 0.8, hue(i * 55 + t * 200), 1));
          }
          xLight(ctx, A, cx, cy, 3 + k * 6, t);
          A.glow(ctx, cx, cy, 3 + k * 6, '#ffffff', 0.2 + k * 0.3);
          if (Math.floor(t * 9) % 4 === 0) GLITCH(ctx, A, x - 30, y - 34, 60, 50, t);
        },
      },
      // a whole cinematic: jump, charge in the air, ROAR, and then everything at once until the roar runs out
      run(A, e0) {
        const p = A.p, g = A.g, JUMP = 0.45, ROAR = 1.75, STOP = 6.15, END = 6.6;
        const y0 = p.y;
        let top = 46;
        while (top > 0 && Phys().overlapsSolid(g.level, p.x, y0 - top, p.w, p.h)) top -= 2;   // (not into the ceiling)
        W.hold(A, (t) => (t >= ROAR && t < STOP ? roarPose(t) : xArms(t, 1, t < 0.35 ? TUCK : AIR)), 0, END + 0.3).safe = true;   // (nothing can hit you while it plays)
        A.sfx('jump'); A.sfx('whoosh');
        A.spawn(e0, {
          life: END, layer: 'screen',
          spawn(e) { e.next = 0; e.ults = 0; e.lastUlt = -9; e.tears = []; e.st = 0; e.names = []; e.count = { ult: 0, awk: 0, skill: 0 }; e.realityCollapse = true; },
          update(e, dt, g2, A2) {
            const t = e.t;
            // up you go, and up you stay
            if (!e.landed) { p.y = y0 - (t < JUMP ? top * W.easeOut(t / JUMP) : top + Math.sin((t - JUMP) * 2.2) * 2); p.vx = 0; p.vy = 0; }
            // the camera: bars in, push in on you while you charge, pull back out for the chaos
            const zoom = t < ROAR ? 1 + 0.6 * W.ease(t / ROAR) : t < ROAR + 0.3 ? 1.6 - 0.48 * W.easeOut((t - ROAR) / 0.3) : 1.12 + 0.02 * Math.sin(t * 3);
            e.cam = g.ultCam = { x: p.cx, y: p.y + 6, zoom, bars: t < 0.4 ? t / 0.4 : t > END - 0.45 ? Math.max(0, (END - t) / 0.45) : 1, t: g.t };
            if (t > JUMP && !e.rise) { e.rise = true; A2.sfx('chaosRise', { dur: ROAR - JUMP }); }
            // THE ROAR
            if (t >= ROAR && !e.roared) {
              e.roared = true;
              A2.sfx('chaosRoar', { dur: STOP - ROAR + 0.35 }); A2.sfx('boom');
              A2.hitR(e, p.cx, p.y + 10, 300, { mult: 4, kb: 1.8, onHit: (tt) => H.launch(tt, 180) });
              if (g.impact) g.impact(0.1);
              A2.flash(0.3); A2.shake(12, 0.6);
            }
            if (e.roared && !e.landed) {
              A2.shake(1.6, 0.05);   // the whole world shakes while you roar
              // ...and everything happens at once
              e.next -= dt;
              if (t > ROAR + 0.15 && t < STOP - 0.1 && e.next <= 0) { e.next = A2.rnd(0.16, 0.28); unleash(A2, e, e0); }
              // random effects on anything in sight
              e.st -= dt;
              if (e.st <= 0) { e.st = 0.45; const o = pick(H.nearby(A2, p.cx, p.y, 320)); if (o) ERX.Kits.chaos.randomEffects(e, o.t, 1); }
              if (Math.random() < dt * 4) e.tears.push({ x: A2.rnd(20, view(A2).width - 20), y: A2.rnd(30, view(A2).height - 70), a: A2.rnd(-0.8, 0.8), L: A2.rnd(30, 90), t: 0 });
            }
            for (const r of e.tears) r.t += dt;
            // ...then it stops, and you're simply back on the ground
            if (t >= STOP && !e.landed) {
              e.landed = true;
              e.blink = { x: p.cx, y: p.feet, t };
              p.placeAt(p.cx, A2.ground(p.cx, p.y + p.h - 2));
              W.release(A2);
              A2.sfx('chaosBlink'); A2.shake(4, 0.2); g.dust(p.cx, p.feet, 12);
            }
          },
          onEnd(e) {
            if (g.ultCam === e.cam) g.ultCam = null;
            if (!e.landed) p.placeAt(p.cx, A.ground(p.cx, p.y + p.h - 2));
            if (A.p.ultHold) W.release(A);
          },
          draw(e, ctx, ox, oy, A2) {
            const t = e.t, V = view(A2), x = Math.round(p.cx) + ox, y = Math.round(p.y) + 10 + oy, d = p.facing;
            // charging in the air: every colour there is pouring into you, and the X of light over your arms
            if (t > JUMP * 0.6 && t < ROAR) {
              const k = Math.min(1, (t - JUMP * 0.6) / (ROAR - JUMP * 0.6));
              for (let i = 0; i < 44; i++) {
                const q = (t * 1.3 + i / 44) % 1, a = i * 2.399, R = (1 - q) * (60 + (i % 5) * 18) * (0.5 + k), sx = x + Math.cos(a) * R, sy = y + Math.sin(a) * R * 0.85;
                A2.alpha(ctx, q * k, () => A2.line(ctx, sx, sy, sx - Math.cos(a) * 7, sy - Math.sin(a) * 6, hue(i * 37 + t * 240), q > 0.8 ? 2 : 1));
              }
              xLight(ctx, A2, x + d * 3, y - 1, 4 + k * 5, t);
              A2.glow(ctx, x + d * 2, y - 1, 4 + k * 9, '#ffffff', 0.15 + k * 0.35);
            }
            if (!e.roared) return;
            // the shockwave: white, with a rainbow edge
            const q = (t - ROAR) / 0.8;
            if (q < 1) A2.alpha(ctx, 1 - q, () => {
              const r = 10 + W.easeOut(q) * 300;
              for (let w = 0; w < 4; w++) A2.ring(ctx, x, y, Math.max(1, r - w), '#ffffff', Math.max(1, r - w));
              rainbowRing(ctx, A2, x, y, r + 1, t); rainbowRing(ctx, A2, x, y, r + 2, t + 0.4);
              if (q < 0.15) A2.alpha(ctx, 1 - q / 0.15, () => A2.disc(ctx, x, y, Math.round(14 + q * 80), '#ffffff'));
            });
            if (!e.landed) {
              // the roar itself: rings of sound pouring out of your mouth
              const j = roarPose(t), pts = ERX.PlayerSide.points(j), mx = x + pts.mouth.dx * d, my = Math.round(p.feet) + oy + pts.mouth.dy;
              for (let i = 0; i < 4; i++) { const k2 = (t * 2.6 + i / 4) % 1, r2 = 4 + k2 * 40; A2.alpha(ctx, 1 - k2, () => A2.arc(ctx, mx, my, r2, d, i % 2 ? '#ffffff' : hue(t * 300 + i * 90), 1, -0.75, 0.75)); }
              // eyes burning like stars
              STAR_EYE(ctx, A2, x + pts.eye.dx * d, Math.round(p.feet) + oy + pts.eye.dy, t);
              // reality coming apart at the edges
              A2.alpha(ctx, 0.07, () => A2.px(ctx, -10, -10, 2000, 2000, rb(t * 0.6)));
              if (Math.floor(t * 12) % 9 === 0) { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.globalAlpha *= 0.3; ctx.fillStyle = '#ffffff'; ctx.fillRect(-10, -10, 2000, 2000); ctx.restore(); }
              for (const r of e.tears) if (r.t < 1.4) {
                const c = Math.cos(r.a), s = Math.sin(r.a), op = Math.min(1, r.t * 4) * (r.t > 1.1 ? (1.4 - r.t) / 0.3 : 1);
                A2.alpha(ctx, op, () => { A2.line(ctx, r.x - (c * r.L) / 2, r.y - (s * r.L) / 2, r.x + (c * r.L) / 2, r.y + (s * r.L) / 2, '#000000', 3); A2.line(ctx, r.x - (c * r.L) / 2, r.y - (s * r.L) / 2 - 2, r.x + (c * r.L) / 2, r.y + (s * r.L) / 2 - 2, hue(r.x + t * 200), 1); });
              }
              if (Math.floor(t * 10) % 7 === 0) GLITCH(ctx, A2, -10, 0, V.width + 20, V.height, t);
              e.names = e.names.filter((n) => t - n.t < 1).slice(-3);
              e.names.forEach((n, i) => A2.alpha(ctx, Math.min(1, (1 - (t - n.t)) * 3), () => A2.text(ctx, n.s, x, y - 34 - i * 9 - (t - n.t) * 10, n.c)));
            }
            // where you were a moment ago, glitching away
            if (e.blink) {
              const k3 = (t - e.blink.t) / 0.4;
              if (k3 < 1) A2.alpha(ctx, 1 - k3, () => {
                H.drawGhost(ctx, A2, 'idle', e.blink.x + ox - 2 - k3 * 4, e.blink.y + oy, d, '#ff2adf');
                H.drawGhost(ctx, A2, 'idle', e.blink.x + ox + 2 + k3 * 4, e.blink.y + oy, d, '#2affff');
                GLITCH(ctx, A2, e.blink.x + ox - 10, e.blink.y + oy - 24, 20, 24, t);
                A2.ring(ctx, x, Math.round(p.feet) + oy - 2, 6 + k3 * 30, '#ffffff', (6 + k3 * 30) * 0.25);
                rainbowRing(ctx, A2, x, Math.round(p.feet) + oy - 2, 7 + k3 * 30, t, 0.25);
              });
            }
          },
        }, {});
      },
    },
  };
})(window.ERX = window.ERX || {});
