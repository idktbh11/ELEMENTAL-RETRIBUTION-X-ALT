/*
 * AWAKENED: COSMIC, VOID, PSYCHIC, CRYSTAL, MOON, SOLAR
 * (format: js/data/awakened/_awk.js)
 */
(function (ERX) {
  'use strict';

  const AW = ERX.Awakened, H = ERX.KitHelp, W = ERX.AwkHelp, U = ERX.U;
  const { J, IDLE, RUN } = W;
  const Phys = () => ERX.GameEngine.Physics;
  const dot = (g, x, y, vx, vy, color, o) => g.fx.add(Object.assign({ x, y, vx, vy, life: 0.5, color, size: 1, fadeOut: 0.3 }, o));
  // the size of the view on screen (it follows the window, so never assume 480x270)
  const view = (A) => A.g.view || { width: 480, height: 270 };
  const holdStun = (t, s) => { if (!t.applyStatus) return; t.applyStatus('stagger', 0); if (t.status.stagger) t.status.stagger.t = s; };
  // set an enemy's vertical speed for this frame, cancelling the gravity it's about to get
  const floatV = (t, vy, dt) => { t.vy = Math.min(400, vy - 900 * dt); };

  // ============================================================== COSMIC (starfield)
  const TWINK = { life: 0.7, draw(e, ctx, ox, oy, A) { const k = e.t / e.life; A.alpha(ctx, 1 - k, () => A.star(ctx, e.x + ox, e.y + oy, k < 0.4 ? 2 : 1, e.c || '#ffd34d', '#ffffff')); } };
  const twinkles = (A, e, x, y, n, sp) => { for (let i = 0; i < n; i++) A.spawn(e, Object.assign({}, TWINK, { update(s, dt) { s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 1 - dt * 2; s.vy *= 1 - dt * 2; } }), { x, y, vx: A.rnd(-1, 1) * (sp || 80), vy: A.rnd(-1, 1) * (sp || 80), c: i % 3 ? '#ffd34d' : '#9ab8ff' }); };
  const NEB = (ctx, A, x, y, r, t, a) => { A.alpha(ctx, a, () => { for (let i = 0; i < 6; i++) A.disc(ctx, x + Math.cos(t * 0.5 + i * 1.1) * r * 0.45, y + Math.sin(t * 0.5 + i * 1.1) * r * 0.25, Math.round(r * 0.4), ['#2a1a6a', '#4a2a9a', '#6a3aaa', '#2a4aaa', '#8a3a9a', '#1a2a6a'][i]); }); for (let i = 0; i < 14; i++) if ((Math.floor(t * 4) + i) % 3) A.px(ctx, x + Math.cos(i * 2.4) * r * ((i * 7) % 10) / 10, y + Math.sin(i * 1.7) * r * 0.5 * ((i * 3) % 10) / 10, 1, 1, i % 4 ? '#ffffff' : '#ffd34d'); };
  AW.cosmic = {
    color: '#4a6aff', up: '#ffd34d', status: 'starstruck', fx: 'stars', block: ['Nebula Shield', 'shield'],
    icons: ['supernovaSeed', 'wormhole', 'lion', 'pulsar', 'shootingStar'],
    look: { fx(ctx, F) { for (let i = 0; i < 4; i++) { const a = F.t * 1.3 + i * 1.57, x = F.x + Math.cos(a) * 12, y = F.y - 13 + Math.sin(a) * 5; F.A.star(ctx, x, y, 1, i % 2 ? '#ffd34d' : '#9ab8ff', '#ffffff'); } } },
    idle: {
      pose: (t) => IDLE.float(t, { lift: 5 }),
      fx(ctx, F) { const a = F.at('handF'), b = F.at('handB'), c = F.at('headTop'); for (const [p, q] of [[a, c], [c, b]]) F.A.alpha(ctx, 0.5 + 0.3 * Math.sin(F.t * 3), () => F.A.line(ctx, p.x, p.y, q.x, q.y - 3, '#9ab8ff')); for (const p of [a, b, { x: c.x, y: c.y - 3 }]) F.A.star(ctx, p.x, p.y, 1, '#ffd34d', '#ffffff'); },
    },
    run: {
      pose: (ph) => RUN.soar(ph),
      back(ctx, F) { for (let i = 1; i < 10; i++) F.A.alpha(ctx, 0.8 - i * 0.08, () => F.A.disc(ctx, F.x - F.d * (4 + i * 4), F.y - 12 + Math.sin(F.t * 12 + i) * 1.5, Math.max(1, 4 - i * 0.35), i < 3 ? '#ffffff' : i % 2 ? '#4a6aff' : '#9ab8ff')); },
      step(A, p, dt) { if (W.every(p, 'twink', 0.08, dt)) W.emit(A, TWINK, { x: p.cx - p.facing * A.rnd(10, 24), y: p.y + A.rnd(0, 18), c: Math.random() < 0.5 ? '#ffd34d' : '#ffffff' }); },
    },
    dash: {
      name: 'Warp Step', style: 'blink', dmg: 13, life: 1,
      spawn(e, g, A) { const p = A.p; e.sx = p.cx; e.sy = p.y + 10; A.sfx('orbDash'); },
      update(e, dt, g, A) { const p = A.p; if (p.dashT <= 0 && !e.out) { e.out = true; e.ex = p.cx; e.ey = p.y + 10; A.hitR(e, e.sx, e.sy, 16, { kb: 1 }); A.hitR(e, e.ex, e.ey, 16, { kb: 1 }); twinkles(A, e, e.sx, e.sy, 8, 90); twinkles(A, e, e.ex, e.ey, 8, 90); } },
      draw(e, ctx, ox, oy, A) { const k = e.t / e.life; for (const [x, y] of e.out ? [[e.sx, e.sy], [e.ex, e.ey]] : [[e.sx, e.sy]]) A.alpha(ctx, 1 - k, () => { A.ring(ctx, x + ox, y + oy, 3 + k * 10, '#9ab8ff', 8 + k * 6); A.ring(ctx, x + ox, y + oy, 2 + k * 6, '#ffffff', 6 + k * 4); }); },
    },
    guard: {
      name: 'Nebula Shield', sound: 'chime',
      draw(ctx, { A, x, bot, h, t }) { const cy = bot - h / 2; NEB(ctx, A, x, cy, h * 0.55, t, 0.85); for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1; A.star(ctx, x + Math.cos(a) * 4, cy + Math.sin(a) * h * 0.4, 1, '#ffd34d', '#ffffff'); } },
      hit(g, x, y, d) { for (let i = 0; i < 12; i++) dot(g, x, y, d * U.lerp(20, 120, Math.random()), U.lerp(-90, 90, Math.random()), i % 2 ? '#ffd34d' : '#9ab8ff', { blink: 30, life: 0.6 }); },
    },
    m1: {
      name: 'Nova Fist', dmg: 9, cd: 0.36, kind: 'custom', life: 0.3,
      desc: 'A punch that pops a small supernova where it lands, scattering stardust over everything nearby.',
      spawn(e, g, A) { A.sfx('punchHit', { minGap: 0.04 }); },
      update(e, dt, g, A) { H.at(e, A, 0); H.melee(e, A, 32 * H.sc(e), 22, { onHit(t) { if (!e.nova) { const c = A.center(t); e.nova = c; twinkles(A, e, c.x, c.y, 8, 90); } } }); if (e.nova && !e.popd) { e.popd = true; A.hitR(e, e.nova.x, e.nova.y, 16 * H.sc(e), { mult: 0.5, kb: 0.6 }); A.spawn(e, W.SHOCK, { x: e.nova.x, y: e.nova.y, r: 18, dmg: 0, life: 0.3 }); } },
      draw(e, ctx, ox, oy, A) {
        const k = e.t / e.life, d = e.dir, x = e.x + ox + d * (10 + 12 * Math.min(1, k * 4)), y = e.y + oy;
        A.alpha(ctx, 1 - k, () => {
          for (let i = 0; i < 5; i++) A.px(ctx, x - d * (i * 4 + 5) - (d > 0 ? 3 : 0), y - 4 + (i % 3) * 4, 3, 1, i % 2 ? '#9ab8ff' : '#ffffff');
          A.alpha(ctx, 0.4, () => A.disc(ctx, x, y, 6, '#4a6aff'));
          A.disc(ctx, x, y, 4, '#4a6aff', '#ffffff');
          if (e.nova) { const n = e.nova; A.star(ctx, n.x + ox, n.y + oy, Math.round(4 + k * 7), '#ffd34d', '#ffffff'); A.disc(ctx, n.x + ox, n.y + oy, Math.max(1, Math.round(5 * (1 - k))), '#ffffff'); }
        });
      },
    },
    s: [
      {
        name: 'Supernova Seed', dmg: 34, cd: 7, mp: 6, kind: 'custom', life: 1.8,
        desc: 'Plant a tiny star in front of you. It swells, flickers... and goes supernova.',
        spawn(e, g, A) { H.at(e, A, 34, -4); const ax = A.aim(e, 110); if (ax !== null) e.x = ax; A.sfx('star'); },
        update(e, dt, g, A) { if (e.t > 1.2 && !e.boom) { e.boom = true; A.hitR(e, e.x, e.y, 44 * H.sc(e), { kb: 1.6 }); A.sfx('boom'); A.flash(0.15); A.shake(4, 0.3); twinkles(A, e, e.x, e.y, 16, 160); } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy; if (!e.boom) { const k = e.t / 1.2, r = Math.round(1 + k * 6 + (k > 0.7 ? Math.sin(e.t * 50) * 1.5 : 0)); A.glow(ctx, x, y, r + 3, k > 0.7 ? '#ffffff' : '#ffd34d', 0.25 + k * 0.3); A.disc(ctx, x, y, Math.max(1, r), '#ffd34d', '#ffffff'); return; } const k = (e.t - 1.2) / 0.6, R = 44 * H.sc(e); A.alpha(ctx, 1 - k, () => { A.disc(ctx, x, y, Math.round(R * 0.4 * (1 - k)) + 1, '#ffffff'); A.ring(ctx, x, y, R * Math.min(1, k * 2), '#ffd34d', R * Math.min(1, k * 2)); A.ring(ctx, x, y, R * 0.7 * Math.min(1, k * 2), '#4a6aff', R * 0.7 * Math.min(1, k * 2)); }); },
      },
      {
        name: 'Wormhole', dmg: 18, cd: 9, mp: 7, kind: 'custom', life: 2.6,
        desc: 'Open a wormhole under the nearest enemy and another one high above it. In one end, out the other... and down.',
        spawn(e, g, A) { H.at(e, A, 44, -2); const ax = A.aim(e, 150); if (ax !== null) e.x = ax; e.y0 = H.floor(A, e.x) - 3; e.by = Math.max(H.sky(A, e.x, e.y0 - 20) + 14, e.y0 - 90); e.falls = []; A.sfx('hover'); },
        update(e, dt, g, A) {
          for (const o of H.nearby(A, e.x, e.y0, 70)) if (!o.t.tutorial && !o.t._warped) o.t.vx = U.approach(o.t.vx, Math.sign(e.x - o.c.x) * 120, 6, dt);
          // in through the bottom one...
          if (e.t > 0.25 && e.t < 2) A.hitR(e, e.x, e.y0, 24 * H.sc(e), { kb: 0, onHit(t) { if (t.applyStatus) t.applyStatus('starstruck', e.potency); A.sfx('orbDash', { minGap: 0.1 }); if (t.tutorial) return; t._warped = true; e.falls.push(t); const nx = e.x - t.box.w / 2, ny = e.by - t.box.h / 2; if (!Phys().overlapsSolid(g.level, nx, ny, t.box.w, t.box.h)) { t.x = nx; t.y = ny; t.vy = 120; } } });
          // ...out of the top one, and splat
          for (const t of e.falls) if (!t._landed && (t.onGround || t.dead)) { t._landed = true; if (!t.dead) { A.damage(e, t, 0.8, 0.3); A.puff(e, A.center(t).x, t.box.y + t.box.h, 6, 1.5); A.sfx('crash', { minGap: 0.08 }); } }
        },
        onEnd(e) { for (const t of e.falls) { delete t._warped; delete t._landed; } },
        draw(e, ctx, ox, oy, A) { const f = A.fade(e, 0.2, 0.4); for (const [y, col] of [[e.y0, '#4a6aff'], [e.by, '#ffd34d']]) A.alpha(ctx, f, () => { for (let i = 0; i < 3; i++) A.ring(ctx, e.x + ox, y + oy, 10 + i * 3 + Math.sin(e.t * 6 + i), i % 2 ? '#ffffff' : col, 4 + i * 2); A.ring(ctx, e.x + ox, y + oy, 8, '#05030f', 3); for (let i = 0; i < 6; i++) { const a = e.t * 5 + i * 1.05; A.px(ctx, e.x + ox + Math.cos(a) * 14, y + oy + Math.sin(a) * 5, 1, 1, '#ffd34d'); } }); },
      },
      {
        name: 'Constellation Lion', dmg: 26, cd: 8, mp: 7, kind: 'custom', life: 1.4,
        desc: 'Stars connect into the shape of a great lion. It roars to life and pounces on your enemy.',
        spawn(e, g, A) { H.at(e, A, 8, -6); const t = A.near(e.x, e.y, 180); e.tx = t ? A.center(t).x : e.x + e.dir * 90; e.ty = t ? A.center(t).y : e.y; A.sfx('star'); },
        update(e, dt, g, A) { const q = U.clamp((e.t - 0.45) / 0.45, 0, 1); e.lx = U.lerp(e.x, e.tx, q); e.ly = U.lerp(e.y, e.ty, q) - Math.sin(q * Math.PI) * 26; if (q >= 1 && !e.hitd) { e.hitd = true; A.hitR(e, e.tx, e.ty, 20, { kb: 1.4 }); A.sfx('crash'); twinkles(A, e, e.tx, e.ty, 10, 120); } },
        draw(e, ctx, ox, oy, A) { const x = (e.lx !== undefined ? e.lx : e.x) + ox, y = (e.ly !== undefined ? e.ly : e.y) + oy, d = e.dir, f = e.t > 1.1 ? 1 - (e.t - 1.1) / 0.3 : Math.min(1, e.t * 3); const pts = [[-10, 0], [-4, -3], [4, -4], [9, -8], [12, -4], [9, 0], [6, 6], [-6, 6], [-12, -4]].map(([px, py]) => [x + px * d, y + py]); A.alpha(ctx, f, () => { for (let i = 0; i < pts.length - 1; i++) A.line(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#9ab8ff'); A.line(ctx, pts[2][0], pts[2][1], pts[6][0], pts[6][1], '#9ab8ff'); for (const p2 of pts) A.star(ctx, p2[0], p2[1], 1, '#ffd34d', '#ffffff'); A.px(ctx, x + d * 10, y - 7, 1, 1, '#ffffff'); }); },
      },
      {
        name: 'Pulsar', dmg: 6, cd: 9, mp: 7, kind: 'custom', life: 1.6,
        desc: 'Become a pulsar: two beams of starlight sweep around you in full circles, twice.',
        spawn(e, g, A) { A.sfx('zap'); },
        update(e, dt, g, A) { const p = A.p; e.x = p.cx; e.y = p.y + 10; e.a = e.t * 8; const L = 80 * H.sc(e); for (const s of [0, Math.PI]) for (let r = 8; r < L; r += 10) A.tickR(e, e.x + Math.cos(e.a + s) * r, e.y + Math.sin(e.a + s) * r * 0.6, 7, 0.2, { kb: 0.3 }); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, L = 80 * H.sc(e), f = A.fade(e, 0.1, 0.3); A.alpha(ctx, f, () => { for (const s of [0, Math.PI]) { const a = (e.a || 0) + s; A.line(ctx, x, y, x + Math.cos(a) * L, y + Math.sin(a) * L * 0.6, '#9ab8ff', 3); A.line(ctx, x, y, x + Math.cos(a) * L, y + Math.sin(a) * L * 0.6, '#ffffff', 1); } A.disc(ctx, x, y, 4, '#ffffff'); }); },
      },
      {
        name: 'Shooting Star Dive', dmg: 30, cd: 7, mp: 6, kind: 'custom', life: 0.9,
        desc: 'Launch upward, then come screaming down onto the nearest enemy as a shooting star.',
        spawn(e, g, A) { const p = A.p; e.tg = A.near(p.cx, p.y, 180); p.vy = -300; p.vx = 0; A.sfx('jump'); },
        update(e, dt, g, A) { const p = A.p; if (e.t > 0.25 && !e.dive) { e.dive = true; const tx = e.tg && !e.tg.dead ? A.center(e.tg).x : p.cx + p.facing * 60; p.vx = U.clamp((tx - p.cx) / 0.25, -320, 320); p.vy = 460; p.dashGrace = 0.5; A.sfx('orbDash'); } if (e.dive && !e.land && p.onGround) { e.land = true; e.lt = e.t; e.lx = p.cx; e.lgy = p.feet; A.hitR(e, p.cx, p.feet - 8, 30 * H.sc(e), { kb: 1.6 }); A.sfx('crash'); A.shake(5, 0.3); twinkles(A, e, p.cx, p.feet - 6, 14, 150); } },
        draw(e, ctx, ox, oy, A) { const p = A.p; if (e.dive && !e.land) for (let i = 1; i < 8; i++) A.alpha(ctx, 0.7 - i * 0.08, () => A.disc(ctx, p.cx + ox - p.vx * 0.004 * i * 8, p.y + oy + 10 - p.vy * 0.004 * i * 8, Math.max(1, 6 - i * 0.7), i < 3 ? '#ffffff' : '#4a6aff')); if (e.land) { const k = Math.min(1, (e.t - e.lt) / 0.4); A.alpha(ctx, 1 - k, () => { A.ring(ctx, e.lx + ox, e.lgy + oy - 2, 6 + k * 30, '#ffd34d', 2 + k * 5); A.ring(ctx, e.lx + ox, e.lgy + oy - 2, 3 + k * 18, '#ffffff', 1 + k * 3); }); } },
      },
    ],
    ult: {
      name: 'Celestial Cataclysm', dmg: 10,
      desc: 'Rip open a cosmic rift in the sky. A vast nebula pours out, gathers the power of a thousand stars, and fires one colossal beam straight down.',
      charge: {
        pose: (t, k) => J({ FA: [[11, 10.4], [11.6, 6.4]], BA: [[5.4, 10.4], [4.6, 6.4]], bob: 0 }),
        lift: 10,
        draw(ctx, x, y, k, t, A, P) { const sy = y - 44, w = 10 + k * 50; A.px(ctx, x - w, sy - 1, w * 2, 2 + k * 3, '#05030f'); A.alpha(ctx, 0.9, () => A.px(ctx, x - w, sy - 2, w * 2, 1, '#9ab8ff')); NEB(ctx, A, x, sy - 10, 10 + k * 30, t, k * 0.8); A.alpha(ctx, 0.4 * k, () => A.px(ctx, x - 300, y - 200, 600, 400, '#05030f')); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.6, layer: 'screen',
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t); const c = e.ts[0] ? A.center(e.ts[0]) : { x: p.cx + e.dir * 100, y: p.y }; e.cx = c.x; e.gy = A.ground(c.x, p.y + 2); A.sfx('surge'); A.sfx('rumble', { dur: 3 }); },
          update(e, dt, g, A) {
            if (e.t < 1.4) for (const t of e.ts) if (!t.dead && !t.tutorial) t.vx = U.approach(t.vx, Math.sign(e.cx - A.center(t).x) * 60, 2, dt);
            if (e.t > 1.4 && e.t < 3) { if (!e.fire) { e.fire = true; A.sfx('boom'); A.flash(0.5); } const w = 70 * H.sc(e); A.tick(e, { x: e.cx - w / 2, y: A.top(), w, h: e.gy - A.top() + 4 }, 0.1, { mult: 1.4, kb: 0.4 }); A.shake(4, 0.05); }
            if (e.t > 3 && !e.boom) { e.boom = true; A.blast(e, e.cx, e.gy - 20, 90 * H.sc(e), { dmg: e.dmg * 4 }); twinkles(A, e, e.cx, e.gy - 20, 30, 200); }
          },
          draw(e, ctx, ox, oy, A) {
            const dark = e.t < 3.1 ? Math.min(1, e.t * 2) * 0.65 : Math.max(0, 0.65 - (e.t - 3.1) * 1.3);
            A.alpha(ctx, dark, () => A.px(ctx, -10, -10, 2000, 2000, '#05030f'));
            A.alpha(ctx, Math.min(1, dark * 1.5), () => { for (let i = 0; i < 70; i++) if ((Math.floor(e.t * 3) + i) % 4) A.px(ctx, (i * 97) % view(A).width, (i * 53) % view(A).height, 1, 1, i % 5 ? '#ffffff' : '#ffd34d'); });
            const x = e.cx + ox, top = A.top() + oy, gy = e.gy + oy, open = Math.min(1, e.t / 0.6);
            A.alpha(ctx, Math.min(1, dark * 1.6), () => { A.px(ctx, x - 120 * open, top + 18, 240 * open, 6, '#05030f'); A.px(ctx, x - 120 * open, top + 17, 240 * open, 1, '#9ab8ff'); A.px(ctx, x - 120 * open, top + 24, 240 * open, 1, '#9ab8ff'); NEB(ctx, A, x, top + 46, 40 + open * 50, e.t, 0.85); });
            if (e.t > 1 && e.t < 1.4) { const k = (e.t - 1) / 0.4; A.glow(ctx, x, top + 46, 6 + k * 24, '#ffffff', 0.3 + k * 0.4); }
            if (e.fire && e.t < 3.05) { const w = 70 * H.sc(e) * Math.min(1, (e.t - 1.4) * 6) * (e.t > 2.8 ? (3.05 - e.t) / 0.25 : 1) * (1 + Math.sin(e.t * 30) * 0.06); A.px(ctx, x - w / 2, top + 46, w, gy - top - 46, '#4a6aff'); A.px(ctx, x - w / 3, top + 46, w * 0.66, gy - top - 46, '#9ab8ff'); A.px(ctx, x - w / 8, top + 46, w / 4, gy - top - 46, '#ffffff'); A.alpha(ctx, 0.6, () => A.ring(ctx, x, gy - 2, w * 0.8, '#ffffff', 4)); }
          },
        }, {});
      },
    },
  };

  // ================================================================ VOID (indigo)
  const HOLE = (ctx, A, x, y, r, rim) => { A.disc(ctx, x, y, Math.max(1, Math.round(r)), '#000000'); A.ring(ctx, x, y, Math.max(1, r) + 1, rim || '#ffffff'); };
  const GLITCHBOX = (ctx, A, x, y, w, h, t) => { for (let i = 0; i < 5; i++) { const yy = y + ((i * 11 + Math.floor(t * 30) * 5) % Math.max(1, h)); A.px(ctx, x + ((i * 7 + Math.floor(t * 20)) % 5) - 2, yy, w, 1, i % 2 ? '#ffffff' : '#000000'); } };
  AW.void = {
    color: '#7a5aff', up: '#ffffff', status: 'erode', fx: 'void', block: ['Hollow Barrier', 'bubble'],
    icons: ['devour', 'realityCut', 'zeroPoint', 'silence', 'glitchSwarm'],
    look: { fx(ctx, F) { if (Math.floor(F.t * 8) % 11 === 0) { const c = F.at('chest'); GLITCHBOX(ctx, F.A, c.x - 6, c.y - 8, 12, 16, F.t); } } },
    idle: {
      // no breathing at all: just a slow, wrong-feeling drift
      pose: (t) => Object.assign(IDLE.still(t), { lift: 6 + Math.sin(t * 1.1) * 1.4 }), still: true,
      back(ctx, F) { const A = F.A, c = F.at('chest'); for (let i = 0; i < 3; i++) { const a = -0.6 + i * 0.6, n = 2 + Math.round((Math.sin(F.t * 1.7 + i * 2) + 1) * 1.5); let lx = c.x - F.d * 2, ly = c.y; for (let s = 0; s < n; s++) { const nx = lx - F.d * 4, ny = ly + Math.sin(a + s) * 3 - 2; A.line(ctx, lx, ly, nx, ny, s % 2 ? '#ffffff' : '#7a5aff'); lx = nx; ly = ny; } } },
    },
    run: {
      pose: (ph) => RUN.hover(ph, { lift: 6, lean: 0, arms: [[9.4, 14.6], [9.6, 17.4]], armsB: [[7, 14.6], [7, 17.4]] }),
      back(ctx, F) { for (let i = 1; i < 4; i++) F.A.alpha(ctx, 0.4 - i * 0.1, () => ERX.KitHelp.drawGhost(ctx, F.A, 'idle', F.x - F.d * i * 6, F.y, F.d, i % 2 ? '#000000' : '#7a5aff')); },
    },
    dash: {
      name: 'Null Step', style: 'blink', dmg: 14, life: 0.9,
      spawn(e, g, A) { const p = A.p; e.sx = p.cx; e.y0 = p.y; e.h = p.h; A.sfx('glassCrack'); },
      update(e, dt, g, A) { const p = A.p; if (p.dashT <= 0 && !e.out) { e.out = true; e.ex = p.cx; A.hit(e, { x: Math.min(e.sx, e.ex) - 12, y: e.y0, w: Math.abs(e.ex - e.sx) + 24, h: e.h }, { kb: 0.5, onHit(t) { if (t.applyStatus) t.applyStatus('erode', 0); } }); } },
      draw(e, ctx, ox, oy, A) { const ex = e.out ? e.ex : A.p.cx, k = e.t / e.life; A.alpha(ctx, 1 - k, () => { const x0 = Math.min(e.sx, ex) + ox - (e.out ? 12 : 0), w = Math.abs(ex - e.sx) + (e.out ? 24 : 0); A.px(ctx, x0, e.y0 + oy, w, e.h, '#000000'); A.px(ctx, x0, e.y0 + oy - 1, w, 1, '#ffffff'); A.px(ctx, x0, e.y0 + oy + e.h, w, 1, '#ffffff'); GLITCHBOX(ctx, A, x0, e.y0 + oy, w, e.h, e.t); }); },
    },
    guard: {
      name: 'Hollow Barrier', sound: 'glitch',
      draw(ctx, { A, x, bot, h, t }) { A.px(ctx, x - 5, bot - h, 10, h, '#000000'); A.px(ctx, x - 6, bot - h - 1, 12, 1, '#ffffff'); A.px(ctx, x - 6, bot, 12, 1, '#ffffff'); A.px(ctx, x - 6, bot - h, 1, h, '#ffffff'); A.px(ctx, x + 5, bot - h, 1, h, '#ffffff'); if (Math.floor(t * 10) % 3 === 0) GLITCHBOX(ctx, A, x - 5, bot - h, 10, h, t); },
      hit(g, x, y) { for (let i = 0; i < 10; i++) { const a = i * 0.63; dot(g, x + Math.cos(a) * 14, y + Math.sin(a) * 14, -Math.cos(a) * 60, -Math.sin(a) * 60, i % 2 ? '#ffffff' : '#7a5aff', { life: 0.25 }); } },
    },
    m1: {
      name: 'Null Strike', dmg: 9, cd: 0.36, kind: 'custom', life: 0.55,
      desc: 'Punch a hole in reality. The hole hangs there for a moment, then snaps shut and hits everything around it.',
      spawn(e, g, A) { H.at(e, A, 0); e.hx = e.x + e.dir * 20; e.hy = e.y; A.sfx('punchHit', { minGap: 0.04 }); },
      update(e, dt, g, A) { if (e.t < 0.1) H.melee(e, A, 30 * H.sc(e), 20); if (e.t > 0.4 && !e.snap) { e.snap = true; e.hit.clear(); A.hitR(e, e.hx, e.hy, 16 * H.sc(e), { mult: 0.6, kb: 0.3, onHit(t) { if (t.applyStatus) t.applyStatus('erode', 0); } }); A.spawn(e, W.SHOCK, { x: e.hx, y: e.hy, r: 16 * H.sc(e), dmg: 0, life: 0.25, c: '#7a5aff' }); A.sfx('glassCrack', { minGap: 0.04 }); } },
      draw(e, ctx, ox, oy, A) {
        if (e.t < 0.12) W.smear(ctx, A, e.x + ox, e.y + oy, 16 * H.sc(e), e.dir, (e.t / 0.12) * 0.7, '#7a5aff', 3, -1, 1);
        if (e.snap) return;
        const x = e.hx + ox, y = e.hy + oy, k = Math.min(1, e.t / 0.08), r = 8 * k * H.sc(e) * (1 + Math.sin(e.t * 40) * 0.08);
        A.alpha(ctx, 0.3, () => A.ring(ctx, x, y, r + 4, '#7a5aff'));
        for (let i = 0; i < 8; i++) { const a = -e.t * 9 + i * 0.785, rr = r + 3 + ((e.t * 20 + i) % 4); A.px(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr, 1, 1, i % 2 ? '#ffffff' : '#7a5aff'); }
        HOLE(ctx, A, x, y, r);
      },
    },
    s: [
      {
        name: 'Devouring Rift', dmg: 5, cd: 9, mp: 7, kind: 'custom', life: 3,
        desc: 'A rift of nothing opens and starts eating: it swallows projectiles and grows as it chews on enemies.',
        spawn(e, g, A) { H.at(e, A, 44, -4); const ax = A.aim(e, 120); if (ax !== null) e.x = ax; e.r = 5; A.sfx('surge'); },
        update(e, dt, g, A) { for (const b of A.g.bolts) if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 6) { b.dead = true; e.r = Math.min(16, e.r + 1); } for (const o of H.nearby(A, e.x, e.y, 60)) if (!o.t.tutorial) o.t.vx = U.approach(o.t.vx, Math.sign(e.x - o.c.x) * 50, 4, dt); if (A.tickR(e, e.x, e.y, e.r + 4, 0.25, { kb: 0 })) e.r = Math.min(16 * H.sc(e), e.r + 0.4); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, f = A.fade(e, 0.1, 0.3); A.alpha(ctx, f, () => { for (let i = 0; i < 10; i++) { const a = -e.t * 4 + i * 0.63, d = e.r + 4 + ((e.t * 20 + i * 3) % 8); A.px(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 1, 1, i % 2 ? '#ffffff' : '#7a5aff'); } HOLE(ctx, A, x, y, e.r * f); }); },
      },
      {
        name: 'Reality Cut', dmg: 30, cd: 7, mp: 6, kind: 'custom', life: 0.9,
        desc: 'Draw a single straight cut through the world in front of you. A heartbeat later, everything on the line splits.',
        spawn(e, g, A) { H.at(e, A, 4, -2); e.ang = A.rnd(-0.25, 0.25); A.sfx('swing'); },
        update(e, dt, g, A) { if (e.t > 0.4 && !e.split) { e.split = true; const L = 140 * H.sc(e), c = Math.cos(e.ang), s = Math.sin(e.ang); for (let r = 0; r < L; r += 8) A.hitR(e, e.x + c * r * e.dir, e.y + s * r, 6, { kb: 0.4 }); A.sfx('glassCrack'); A.shake(3, 0.2); } },
        draw(e, ctx, ox, oy, A) { const L = 140 * H.sc(e), c = Math.cos(e.ang), s = Math.sin(e.ang), x0 = e.x + ox, y0 = e.y + oy, x1 = x0 + c * L * e.dir, y1 = y0 + s * L; if (!e.split) { const k = Math.min(1, e.t / 0.1); A.line(ctx, x0, y0, U.lerp(x0, x1, k), U.lerp(y0, y1, k), '#ffffff'); return; } const k = (e.t - 0.4) / 0.5, gap = 1 + k * 4; A.alpha(ctx, 1 - k, () => { A.line(ctx, x0, y0 - gap, x1, y1 - gap, '#ffffff'); A.line(ctx, x0, y0 + gap, x1, y1 + gap, '#7a5aff'); A.line(ctx, x0, y0, x1, y1, '#000000', 2); }); },
      },
      {
        name: 'Zero Point', dmg: 32, cd: 10, mp: 7, kind: 'custom', life: 1.8,
        desc: 'Erase the nearest enemy from existence for a moment. When it comes back, it is not all there.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 170); e.tg = t; if (!t) { e.dead = true; return; } holdStun(t, 1.6); e.c = A.center(t); t._erased = true; A.sfx('glassCrack'); },
        update(e, dt, g, A) { if (!e.tg) return; if (e.t > 1.4 && !e.back) { e.back = true; delete e.tg._erased; A.damage(e, e.tg, 1, 0.6); if (e.tg.applyStatus) { e.tg.applyStatus('erode', e.potency); e.tg.applyStatus('erode', e.potency); } A.sfx('boom'); A.shake(3, 0.2); } },
        onEnd(e) { if (e.tg) delete e.tg._erased; },
        draw(e, ctx, ox, oy, A) { if (!e.tg) return; const b = e.tg.box, x = e.c.x + ox, y = e.c.y + oy; if (!e.back) { A.px(ctx, b.x + ox - 1, b.y + oy - 1, b.w + 2, b.h + 2, '#000000'); A.alpha(ctx, 0.8, () => { A.ring(ctx, x, y, 8 + Math.sin(e.t * 10) * 2, '#ffffff', 14); GLITCHBOX(ctx, A, b.x + ox, b.y + oy, b.w, b.h, e.t); }); } else { const k = (e.t - 1.4) / 0.4; A.alpha(ctx, 1 - k, () => A.ring(ctx, x, y, 6 + k * 16, '#7a5aff', 6 + k * 16)); } },
      },
      {
        name: 'Silence Field', dmg: 3, cd: 10, mp: 7, kind: 'custom', life: 4, noGlow: true,
        desc: 'A patch of the world loses all its colour. Inside, enemies slow to a crawl and slowly come apart.',
        spawn(e, g, A) { H.at(e, A, 46); e.gy = H.floor(A, e.x); A.sfx('hover'); },
        update(e, dt, g, A) { const R = 54 * H.sc(e); A.tick(e, { x: e.x - R, y: e.gy - R, w: R * 2, h: R }, 0.4, { kb: 0 }); for (const t of A.targets()) { const c = A.center(t); if (Math.abs(c.x - e.x) < R && !t.tutorial) { t.vx *= 1 - dt * 5; if (t.applyStatus && !t.status.erode) t.applyStatus('erode', 0); } } },
        draw(e, ctx, ox, oy, A) { const R = 54 * H.sc(e), x = e.x + ox, gy = e.gy + oy, f = A.fade(e, 0.3, 0.5); ctx.save(); ctx.globalAlpha *= f; ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(x - R, gy - R, R * 2, R); ctx.restore(); A.alpha(ctx, f, () => { A.px(ctx, x - R, gy - R, 1, R, '#ffffff'); A.px(ctx, x + R, gy - R, 1, R, '#ffffff'); for (let i = 0; i < 6; i++) A.px(ctx, x - R + ((i * 31 + e.t * 10) % (R * 2)), gy - ((i * 13) % R), 1, 1, '#7a5aff'); }); },
      },
      {
        name: 'Glitch Swarm', dmg: 5, cd: 8, mp: 6, kind: 'custom', life: 3,
        desc: 'Release a swarm of glitches that crawl over enemies deleting little bits of them... then all crash at once.',
        spawn(e, g, A) { H.at(e, A, 4, -4); e.bugs = []; for (let i = 0; i < (e.up ? 14 : 10); i++) e.bugs.push({ x: e.x, y: e.y, vx: e.dir * A.rnd(60, 140), vy: A.rnd(-60, 60), st: A.rnd(0, 0.4) }); A.sfx('recordScratch'); },
        update(e, dt, g, A) { for (const b of e.bugs) { const t = A.near(b.x, b.y, 200); if (t) { const c = A.center(t); b.vx += (c.x - b.x) * 5 * dt; b.vy += (c.y - b.y) * 5 * dt; } b.vx *= 1 - dt * 1.5; b.vy *= 1 - dt * 1.5; if (Math.random() < dt * 8) { b.x += A.rnd(-4, 4); b.y += A.rnd(-4, 4); } b.x += b.vx * dt; b.y += b.vy * dt; b.st -= dt; if (t && b.st <= 0 && Math.hypot(A.center(t).x - b.x, A.center(t).y - b.y) < 10) { b.st = 0.5; A.damage(e, t, 1, 0); if (t.applyStatus) t.applyStatus('erode', 0); } } },
        onEnd(e, A) { e.hit.clear(); for (const b of e.bugs) { A.hitR(e, b.x, b.y, 12, { mult: 1.2, kb: 0.3 }); A.spawn(e, W.SHOCK, { x: b.x, y: b.y, r: 10, dmg: 0, life: 0.22, c: '#7a5aff' }); } A.sfx('glassCrack'); A.shake(2, 0.15); },
        draw(e, ctx, ox, oy, A) { A.alpha(ctx, A.fade(e, 0.1, 0.4), () => { for (const b of e.bugs) { const on = Math.floor((e.t + b.st) * 12) % 2, x = b.x + ox, y = b.y + oy, j = (Math.floor(e.t * 30 + b.st * 10) % 3) - 1; A.px(ctx, x - 3 + j, y - 2, 5, 3, '#ff3a6a'); A.px(ctx, x - 1 - j, y - 1, 5, 3, '#3affea'); A.px(ctx, x - 2, y - 2, 5, 3, on ? '#000000' : '#ffffff'); A.px(ctx, x + 3, y, 2, 1, '#7a5aff'); } }); },
      },
    ],
    ult: {
      name: 'Absolute Nothing', dmg: 9,
      desc: 'A gigantic sphere of pure void swells over the battlefield, absorbing enemies, attacks and even pieces of the world. At full size it collapses... and explodes.',
      charge: {
        pose: (t, k) => J({ FA: [[11.4, 12.4], [12.6, 10]], BA: [[10.6, 12.6], [12, 10.4]], lean: 0, bob: 0 }),
        lift: 12,
        draw(ctx, x, y, k, t, A, P) { const hx = x + 6, hy = y - 4; for (let i = 0; i < 20; i++) { const a = i * 0.31 + t * 2, d = 8 + 34 * (1 - ((t * 1.3 + i / 20) % 1)); A.px(ctx, hx + Math.cos(a) * d, hy + Math.sin(a) * d, 1, 1, i % 2 ? '#ffffff' : '#7a5aff'); } HOLE(ctx, A, hx, hy, 1 + k * 8); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.8, layer: 'screen',
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t); const c = e.ts[0] ? A.center(e.ts[0]) : { x: p.cx + e.dir * 100, y: p.y }; e.cx = c.x; e.cy = c.y - 30; e.r = 4; e.bits = []; A.sfx('surge'); A.sfx('rumble', { dur: 3 }); },
          update(e, dt, g, A) {
            if (e.t < 2.4) {
              e.r = Math.min(70, e.r + dt * 34);
              for (const b of A.g.bolts) if (Math.hypot(b.x - e.cx, b.y - e.cy) < e.r * 2) b.dead = true;
              for (const t of e.ts) if (!t.dead && !t.tutorial) { const c = A.center(t); t.vx = U.clamp((e.cx - c.x) * 3, -160, 160); floatV(t, U.clamp((e.cy - c.y) * 3, -160, 160), dt); }
              A.tickR(e, e.cx, e.cy, e.r + 10, 0.2, { mult: 0.5, kb: 0, onHit(t) { if (t.applyStatus) t.applyStatus('erode', e.potency); } });
              if (Math.random() < dt * 30) { const a = Math.random() * Math.PI * 2, d = e.r * 2.6; e.bits.push({ x: e.cx + Math.cos(a) * d, y: e.cy + Math.sin(a) * d, t: 0 }); }
            } else if (e.t < 2.7) e.r = Math.max(2, e.r - dt * 220);
            else if (!e.boom) { e.boom = true; A.blast(e, e.cx, e.cy, 130 * H.sc(e), { dmg: e.dmg * 8 }); A.sfx('boom'); A.sfx('glassCrack'); A.flash(0.6); A.shake(14, 0.7); }
            for (const b of e.bits) { b.t += dt; b.x = U.approach(b.x, e.cx, 4, dt); b.y = U.approach(b.y, e.cy, 4, dt); }
            e.bits = e.bits.filter((b) => b.t < 0.8);
          },
          draw(e, ctx, ox, oy, A) {
            const x = e.cx + ox, y = e.cy + oy;
            if (!e.boom) {
              const k = Math.min(1, e.t / 0.4);
              ctx.save(); ctx.globalAlpha *= 0.6 * k; ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(-10, -10, 2000, 2000); ctx.restore();
              for (const b of e.bits) A.px(ctx, b.x + ox - 1, b.y + oy - 1, 3, 3, Math.floor(b.t * 20) % 2 ? '#ffffff' : '#7a5aff');
              for (let i = 0; i < 3; i++) A.ring(ctx, x, y, e.r + 4 + i * 4 + Math.sin(e.t * 8 + i) * 2, i % 2 ? '#7a5aff' : '#ffffff', e.r + 4 + i * 4);
              HOLE(ctx, A, x, y, e.r);
            } else { const k = (e.t - 2.7) / 1.1; A.alpha(ctx, 1 - k, () => { A.ring(ctx, x, y, 20 + k * 260, '#ffffff', 20 + k * 260, 2); A.ring(ctx, x, y, 10 + k * 200, '#7a5aff', 10 + k * 200, 2); for (let i = 0; i < 8; i++) A.px(ctx, -10, y - 100 + i * 26 + ((i * 7) % 5), 2000, 1, i % 2 ? '#ffffff' : '#000000'); }); }
          },
        }, {});
      },
    },
  };

  // ============================================================= PSYCHIC (rose)
  const RIP = (ctx, A, x, y, r, col) => { A.ring(ctx, x, y, r, col, r * 0.7); A.ring(ctx, x, y, r * 0.6, col, r * 0.42); };
  // a giant psychic fist punching towards d, knuckles at (x, y)
  const FIST = (ctx, A, x, y, d) => {
    const R = (lx, ly, w, h, c) => A.px(ctx, d > 0 ? x + lx : x - lx - w, y + ly, w, h, c);
    R(-28, -6, 12, 12, '#c84a9a');
    R(-18, -9, 16, 18, '#ff6ac8');
    for (let j = 0; j < 4; j++) { R(-4, -9 + j * 4.5, 5, 4, '#ff8ad8'); R(0, -9 + j * 4.5, 1, 4, '#ffc8e8'); }
    R(-14, -12, 8, 4, '#ff8ad8');
    R(-18, -9, 16, 1, '#ffffff');
  };
  const EYE = (ctx, A, x, y, s, t, col) => { for (let yy = -s; yy <= s; yy++) { const w = Math.round(s * 2 * Math.sqrt(Math.max(0, 1 - (yy * yy) / (s * s)))); A.px(ctx, x - w, y + yy, w * 2, 1, '#f8e8f0'); } A.disc(ctx, x + Math.sin(t * 2) * s * 0.4, y, Math.max(1, Math.round(s * 0.6)), col, '#ffffff'); A.disc(ctx, x + Math.sin(t * 2) * s * 0.4, y, Math.max(1, Math.round(s * 0.25)), '#05030a'); };
  AW.psychic = {
    color: '#ff6ac8', up: '#7affff', status: 'confuse', fx: 'ripples', block: ['Mind Shield', 'shield'],
    icons: ['mindCrush', 'hypno', 'precog', 'astral', 'neuralStorm'],
    look: { fx(ctx, F) { const h = F.at('headTop'), r = (F.t * 1.2) % 1; F.A.alpha(ctx, 0.6 * (1 - r), () => F.A.ring(ctx, h.x, h.y + 3, 3 + r * 8, '#ff6ac8', 2 + r * 4)); } },
    idle: {
      pose: (t) => IDLE.temple(t, { lift: 3 }),
      back(ctx, F) { for (let i = 0; i < 3; i++) { const a = F.t * 1.4 + i * 2.1, x = F.x + Math.cos(a) * 13, y = F.y - 14 + Math.sin(a * 1.3) * 6; F.A.px(ctx, x - 1, y - 1, 3, 2, '#7a6a5a'); F.A.alpha(ctx, 0.5, () => F.A.ring(ctx, x, y, 3, '#ff6ac8', 2)); } },
    },
    run: {
      pose: (ph) => RUN.hover(ph, { lift: 4, lean: 1, arms: [[11, 12.6], [10.4, 9.4]], armsB: [[6.6, 14.4], [5.4, 16.4]] }),
      back(ctx, F) { for (let i = 1; i < 5; i++) { const r = 3 + i * 3; F.A.alpha(ctx, 0.5 - i * 0.1, () => F.A.ring(ctx, F.x - F.d * i * 6, F.y - 12, r * 0.4, '#ff6ac8', r)); } },
    },
    dash: {
      name: 'Blink of Thought', style: 'blink', dmg: 12, life: 0.8,
      update(e, dt, g, A) { const p = A.p; if (p.dashT <= 0 && !e.out) { e.out = true; e.x2 = p.cx; e.y2 = p.y + 10; A.hitR(e, e.x2, e.y2, 26, { kb: 1.4, onHit(t) { if (t.applyStatus) t.applyStatus('confuse', 0); } }); A.sfx('shockwave', { minGap: 0.1 }); } },
      draw(e, ctx, ox, oy, A) { if (!e.out) return; const k = (e.t - 0.16) / 0.6; A.alpha(ctx, Math.max(0, 1 - k), () => { RIP(ctx, A, e.x2 + ox, e.y2 + oy, 4 + k * 24, '#ff6ac8'); RIP(ctx, A, e.x2 + ox, e.y2 + oy, 2 + k * 14, '#ffffff'); }); },
    },
    guard: {
      name: 'Mind Shield', sound: 'psi',
      draw(ctx, { A, x, bot, h, t }) { const cy = bot - h / 2; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, b2 = a + Math.PI / 3; A.line(ctx, x + Math.cos(a) * 6, cy + Math.sin(a) * h / 2, x + Math.cos(b2) * 6, cy + Math.sin(b2) * h / 2, '#ff6ac8'); } EYE(ctx, A, x, cy, 3, t, '#ff6ac8'); A.alpha(ctx, 0.25, () => A.px(ctx, x - 4, cy - h / 2 + 3, 8, h - 6, '#ffc8e8')); },
      hit(g, x, y, d) { for (let i = 0; i < 10; i++) { const a = i * 0.63; dot(g, x, y, Math.cos(a) * 90 + d * 30, Math.sin(a) * 90, i % 2 ? '#ff6ac8' : '#ffffff', { life: 0.35 }); } },
    },
    m1: {
      name: 'Psi Palm', dmg: 9, cd: 0.36, kind: 'custom', life: 0.35,
      desc: 'Thrust your palm: a wave of psychic force slams into whatever is in front of you.',
      spawn(e, g, A) { A.sfx('whoosh', { minGap: 0.04 }); },
      update(e, dt, g, A) { H.at(e, A, 0); H.melee(e, A, 36 * H.sc(e), 26, { kb: 1.6 }); },
      draw(e, ctx, ox, oy, A) {
        const k = e.t / e.life, d = e.dir, x = e.x + ox + d * (8 + 26 * k), y = e.y + oy;
        A.alpha(ctx, 1 - k, () => {
          A.alpha(ctx, 0.25, () => A.disc(ctx, x - d * 4, y, Math.round(8 + k * 6), '#ff6ac8'));
          for (let i = 0; i < 3; i++) { const r = 6 + k * 10 - i * 3; if (r > 1) A.arc(ctx, x - d * i * 5, y, r, d, i === 0 ? '#ffffff' : '#ff6ac8', i === 0 ? 2 : 3, -1.2, 1.2); }
          for (let i = 0; i < 4; i++) A.px(ctx, x - d * (10 + i * 5) - (d > 0 ? 4 : 0), y - 6 + i * 4, 4, 1, '#ffc8f0');
        });
      },
    },
    s: [
      {
        name: 'Mind Crush', dmg: 9, cd: 7, mp: 6, kind: 'custom', life: 1.4,
        desc: 'Seize the nearest enemy with two giant psychic hands and squeeze, harder and harder, until it pops and blasts everything near it.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 170); e.tg = t; if (!t) { e.dead = true; return; } holdStun(t, 1.3); A.sfx('hover'); },
        update(e, dt, g, A) { if (!e.tg || e.tg.dead) { e.dead = true; return; } e.ct = (e.ct || 0) - dt; if (e.t < 1 && e.ct <= 0) { e.ct = 0.2; A.damage(e, e.tg, 0.6, 0); } if (e.t > 1.05 && !e.pop) { e.pop = true; const c = A.center(e.tg); A.damage(e, e.tg, 2.5, 0.8); W.boom(A, e, c.x, c.y, 30 * H.sc(e), { mult: 1.2 }); A.sfx('crash'); } },
        draw(e, ctx, ox, oy, A) {
          if (!e.tg) return;
          const c = A.center(e.tg), x = c.x + ox, y = c.y + oy, sq = Math.min(1, e.t / 1);
          if (e.pop) { const k = (e.t - 1.05) / 0.35; A.alpha(ctx, 1 - k, () => RIP(ctx, A, x, y, 4 + k * 26, '#ffffff')); return; }
          A.alpha(ctx, 0.25 + sq * 0.2, () => A.disc(ctx, x, y, Math.round(12 - sq * 4), '#ff6ac8'));
          for (const s of [-1, 1]) {
            const hx = x + s * (22 - sq * 12) + Math.sin(e.t * 40) * sq;
            A.alpha(ctx, 0.35, () => A.disc(ctx, hx, y, 8, '#ff6ac8'));
            A.px(ctx, hx - 2, y - 7, 5, 14, '#ff6ac8'); A.px(ctx, hx - 2, y - 7, 5, 1, '#ffffff');
            for (let f = 0; f < 4; f++) A.px(ctx, s > 0 ? hx - 6 : hx + 3, y - 6 + f * 4, 4, 2, '#ffc8f0');
          }
          A.alpha(ctx, 0.6, () => RIP(ctx, A, x, y, 14 - sq * 7, '#ff6ac8'));
        },
      },
      {
        name: 'Hypnotic Spiral', dmg: 14, cd: 8, mp: 6, kind: 'custom', life: 1.6,
        desc: 'A big hypnotic spiral spins in front of you. Enemies stare into it, wander towards you, confused, and get blasted.',
        spawn(e, g, A) { H.at(e, A, 24, -4); A.sfx('hover'); },
        update(e, dt, g, A) { H.at(e, A, 24, -4); const R = 90 * H.sc(e); for (const o of H.nearby(A, e.x, e.y, R)) if ((o.c.x - e.x) * e.dir > -10) { if (!o.t.tutorial) o.t.vx = U.approach(o.t.vx, -e.dir * 40, 3, dt); if (o.t.applyStatus && !o.t.status.confuse) o.t.applyStatus('confuse', e.potency); } if (e.t > 1.2 && !e.blast) { e.blast = true; W.boom(A, e, e.x, e.y, 34 * H.sc(e)); A.sfx('shockwave'); } },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, f = A.fade(e, 0.1, 0.3), R = 22 * H.sc(e);
          A.alpha(ctx, f, () => {
            A.alpha(ctx, 0.2, () => A.disc(ctx, x, y, Math.round(R + 2), '#ff6ac8'));
            for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 70; i++) { const q = i / 70, a = -e.t * 8 + q * 14 + arm * Math.PI, r = q * R; A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, 2, 2, (i + arm) % 2 ? '#ff6ac8' : '#ffffff'); }
            if (e.blast) A.alpha(ctx, 1 - (e.t - 1.2) / 0.4, () => RIP(ctx, A, x, y, 4 + (e.t - 1.2) * 70, '#ff6ac8'));
          });
        },
      },
      {
        name: 'Precognition', dmg: 20, cd: 14, mp: 6, kind: 'custom', life: 4,
        desc: 'See a few seconds into the future. The next attack aimed at you simply misses, and you appear behind the attacker to counter.',
        spawn(e, g, A) { const p = A.p; e.armed = true; A.g.floatText(p.cx, p.y - 10, 'FORESIGHT', e.pal.l); A.sfx('star'); },
        update(e, dt, g, A) {
          const p = A.p; e.x = p.cx; e.y = p.y; if (!e.armed) return;
          p.dashGrace = Math.max(p.dashGrace, 0.05);
          // a shot about to hit you, or someone close enough to swing
          const bolt = A.g.bolts.find((b) => !b.dead && Math.abs(b.x - p.cx) < 18 && Math.abs(b.y - (p.y + 10)) < 16), near = A.near(p.cx, p.y + 10, 26);
          if (!bolt && !near) return;
          if (bolt) bolt.dead = true;
          e.armed = false; e.ct = e.t;
          const tg = near || A.near(p.cx, p.y + 10, 200);
          if (tg) { const c = A.center(tg), side = c.x > p.cx ? 1 : -1, nx = c.x + side * 14 - p.w / 2; if (!Phys().overlapsSolid(g.level, nx, p.y, p.w, p.h)) { p.x = nx; p.facing = -side; } A.damage(e, tg, 1, 1.4); if (tg.applyStatus) tg.applyStatus('confuse', e.potency); }
          A.g.floatText(p.cx, p.y - 14, 'SAW THAT COMING', '#ffffff'); A.sfx('punchHit'); A.flash(0.1);
        },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy; if (e.armed) { A.alpha(ctx, 0.4 + 0.2 * Math.sin(e.t * 8), () => H.drawGhost(ctx, A, 'idle', x + Math.sin(e.t * 3) * 3, A.p.feet + oy, A.p.facing, '#ff6ac8')); EYE(ctx, A, x, y - 8, 2, e.t, '#ff6ac8'); } else if (e.t - e.ct < 0.4) A.alpha(ctx, 1 - (e.t - e.ct) / 0.4, () => RIP(ctx, A, x, y + 10, 6 + (e.t - e.ct) * 40, '#ffffff')); },
      },
      {
        name: 'Astral Projection', dmg: 18, cd: 7, mp: 6, kind: 'custom', life: 1.4,
        desc: 'Your astral body leaves your real one, flies forward through every enemy, and snaps back.',
        spawn(e, g, A) { H.at(e, A, 0); e.sx = e.x; e.f = A.p.feet; A.sfx('whoosh'); },
        update(e, dt, g, A) { const L = 130 * H.sc(e), q = e.t < 0.6 ? W.easeOut(e.t / 0.6) : 1 - W.easeIn((e.t - 0.6) / 0.6); e.ax = e.sx + e.dir * L * q; if (e.t > 0.6 && !e.ret) { e.ret = true; e.hit.clear(); } A.hit(e, { x: e.ax - 7, y: e.f - 22, w: 14, h: 22 }, { kb: 0.5, onHit(t) { if (t.applyStatus) t.applyStatus('confuse', 0); } }); },
        draw(e, ctx, ox, oy, A) { const x = (e.ax || e.sx) + ox; A.alpha(ctx, 0.65, () => H.drawGhost(ctx, A, 'dash', x, e.f + oy, e.dir, '#ff9ae0')); A.alpha(ctx, 0.3, () => A.line(ctx, e.sx + ox, e.f + oy - 12, x, e.f + oy - 12, '#ff6ac8')); },
      },
      {
        name: 'Neural Storm', dmg: 8, cd: 9, mp: 7, kind: 'custom', life: 2,
        desc: 'Link up to five enemies with a web of psychic nerves. It pulses, again and again, frying them all.',
        spawn(e, g, A) { const p = A.p; e.ts = H.nearby(A, p.cx, p.y, 170).slice(0, e.up ? 6 : 5).map((o) => o.t); if (!e.ts.length) { e.dead = true; return; } A.sfx('zap'); },
        update(e, dt, g, A) { e.pt = (e.pt || 0) - dt; if (e.pt <= 0) { e.pt = 0.4; e.pulse = e.t; for (const t of e.ts) if (!t.dead) { A.damage(e, t, 1, 0); if (t.applyStatus) t.applyStatus('confuse', 0); } A.sfx('zap', { minGap: 0.05 }); } },
        draw(e, ctx, ox, oy, A) { const live = e.ts.filter((t) => !t.dead).map((t) => A.center(t)), p = A.p, src = { x: p.cx, y: p.y + 4 }, k = e.pulse !== undefined ? (e.t - e.pulse) / 0.4 : 1, f = A.fade(e, 0.1, 0.3); A.alpha(ctx, f, () => { let prev = src; for (const c of live) { for (let i = 0; i <= 10; i++) { const q = i / 10; A.px(ctx, U.lerp(prev.x, c.x, q) + ox + Math.sin(q * 9 + e.t * 10) * 2, U.lerp(prev.y, c.y, q) + oy, 1, 1, q < k ? '#ff6ac8' : '#ffffff'); } prev = c; } for (const c of live) A.alpha(ctx, 1 - k, () => RIP(ctx, A, c.x + ox, c.y + oy, 4 + k * 8, '#ffffff')); }); },
      },
    ],
    ult: {
      name: 'Godmind', dmg: 9,
      desc: 'An overwhelming psychic force lifts every enemy into the air and drags their minds into a psychic dimension, where giant manifestations of your power attack them... until the dimension collapses.',
      charge: {
        pose: (t, k) => J({ FA: [[11, 12.6], [10.4, 9.4]], BA: [[6.2, 12.6], [7, 9.6]], eyesClosed: k < 0.85 }),
        lift: 14,
        draw(ctx, x, y, k, t, A, P) { for (let i = 0; i < 5; i++) { const r = ((t * 40 + i * 12) % 60) * k; A.alpha(ctx, 1 - r / 60, () => RIP(ctx, A, x, y - 14, r, i % 2 ? P.c : '#ffffff')); } if (k > 0.6) EYE(ctx, A, x, y - 44, Math.round(3 + k * 6), t, P.c); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 4, layer: 'screen',
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t); for (const t of e.ts) holdStun(t, 3.4); e.fists = []; e.ft = 0; A.sfx('hover'); A.sfx('surge'); },
          update(e, dt, g, A) {
            for (const t of e.ts) if (!t.dead && !t.tutorial) { if (e.t < 0.8) { floatV(t, -90, dt); t.vx = 0; } else if (e.t < 3) { floatV(t, Math.sin(e.t * 3 + t.uid) * 14, dt); t.vx = 0; } }
            e.ft -= dt; for (const f of e.fists) f.t += dt;
            if (e.t > 0.9 && e.t < 2.9 && e.ft <= 0) { e.ft = 0.12; const live = e.ts.filter((t) => !t.dead), t = live[Math.floor(Math.random() * Math.max(1, live.length))]; if (t) { const c = A.center(t); A.damage(e, t, 0.7, 0); e.fists.push({ x: c.x, y: c.y, s: Math.random() < 0.5 ? 1 : -1, t: 0, eye: Math.random() < 0.3 }); A.sfx('punchHit', { minGap: 0.04 }); } }
            if (e.t > 3 && !e.boom) { e.boom = true; for (const t of e.ts) if (!t.dead) A.damage(e, t, 5, 1.2); A.sfx('boom'); A.flash(0.6); A.shake(12, 0.6); }
          },
          draw(e, ctx, ox, oy, A) {
            const dim = e.t < 3 ? Math.min(1, Math.max(0, e.t - 0.6) * 2.5) : Math.max(0, 1 - (e.t - 3) * 2);
            if (dim > 0) {
              A.alpha(ctx, dim * 0.85, () => A.px(ctx, -10, -10, 2000, 2000, '#2a0a2a'));
              // the psychic dimension: rings, eyes and shapes in every direction
              A.alpha(ctx, dim, () => { const V = view(A), cx = V.width / 2, cy = V.height / 2; for (let i = 0; i < 6; i++) { const r = ((e.t * 60 + i * 40) % (V.width / 2)); A.ring(ctx, cx, cy, r, i % 2 ? '#ff6ac8' : '#7affff', r * 0.6, 3); } for (let i = 0; i < 5; i++) EYE(ctx, A, (V.width * (i + 0.5)) / 5, i % 2 ? V.height - 50 : 40, 6, e.t + i, '#ff6ac8'); });
            }
            // the manifestations: giant fists flying in from the dark, and huge staring eyes
            for (const f of e.fists) if (f.t < 0.32) A.alpha(ctx, f.t < 0.12 ? 1 : 1 - (f.t - 0.12) / 0.2, () => { const x = f.x + ox, y = f.y + oy, k = W.easeIn(Math.min(1, f.t / 0.1)); if (f.eye) { EYE(ctx, A, x, y - 26, 7, e.t, '#7affff'); if (f.t > 0.06) A.line(ctx, x, y - 22, x, y, '#7affff', 2); } else FIST(ctx, A, x + f.s * (6 + 50 * (1 - k)), y, -f.s); if (f.t > 0.1) RIP(ctx, A, x, y, 4 + (f.t - 0.1) * 70, '#ffffff'); });
            for (const t of e.ts) if (!t.dead && e.t < 3) { const c = A.center(t); A.alpha(ctx, 0.6, () => RIP(ctx, A, c.x + ox, c.y + oy, 10 + Math.sin(e.t * 9) * 2, '#ff6ac8')); }
            if (e.boom) { const k = (e.t - 3) / 1; A.alpha(ctx, 1 - k, () => RIP(ctx, A, p.cx + ox, p.y + oy, 20 + k * 240, '#ffffff')); }
          },
        }, {});
      },
    },
  };

  // ============================================================== CRYSTAL (lilac)
  const RAINBOW = ['#ff5a5a', '#ffb83a', '#ffe95a', '#5fd84a', '#3aa0ff', '#c86aff'];
  const GEM = (ctx, A, x, y, w, h, col, hi) => { for (let yy = 0; yy < h; yy++) { const q = yy / h, hw = Math.max(0.5, (w / 2) * (q < 0.3 ? q / 0.3 : 1 - (q - 0.3) / 0.7 * 0.3)); A.px(ctx, x - hw, y - h + yy, hw, 1, hi ? '#ffffff' : '#e8d8ff'); A.px(ctx, x, y - h + yy, hw, 1, col); } A.px(ctx, x - 1, y - h + 1, 1, Math.max(1, h / 3), '#ffffff'); };
  const SHARD = (b, ctx, ox, oy, A) => { const x = b.x + ox, y = b.y + oy, a = Math.atan2(b.vy, b.vx), c = Math.cos(a), s = Math.sin(a); A.line(ctx, x - c * 4, y - s * 4, x + c * 3, y + s * 3, b.col || '#c8a0ff', 2); A.px(ctx, x + c * 3, y + s * 3, 1, 1, '#ffffff'); };
  AW.crystal = {
    color: '#c8a0ff', up: '#7af0e0', status: 'crystallize', fx: 'glints', block: ['Diamond Facet', 'wall'],
    icons: ['garden', 'gemGolem', 'prismCage', 'kaleido', 'embrace'],
    look: { fx(ctx, F) { const c = F.at('cheek'); F.A.px(ctx, c.x - F.d, c.y, 1, 1, RAINBOW[Math.floor(F.t * 6) % 6]); for (let i = 0; i < 3; i++) { const a = F.t * 1.8 + i * 2.1; GEM(ctx, F.A, F.x + Math.cos(a) * 12, F.y - 8 + Math.sin(a) * 5, 3, 5, '#c8a0ff', false); } } },
    idle: { pose: (t) => IDLE.hip(t) },
    run: {
      pose: (ph) => RUN.elegant(ph),
      step(A, p) { if (W.footfall(p)) W.emit(A, { life: 1, draw(e, ctx, ox, oy, A) { const k = Math.min(1, e.t / 0.12), f = e.t > 0.6 ? 1 - (e.t - 0.6) / 0.4 : 1; A.alpha(ctx, f, () => GEM(ctx, A, e.x + ox, e.y + oy, 4, 7 * k, e.c, false)); } }, { x: p.cx - p.facing * 4, y: p.feet, c: RAINBOW[Math.floor(Math.random() * 6)] }); },
    },
    dash: {
      name: 'Prism Shift', dmg: 12, life: 1.3,
      spawn(e) { e.cl = []; },
      update(e, dt, g, A) { const p = A.p; if (p.dashT > 0) { e.ct = (e.ct || 0) - dt; if (e.ct <= 0 && e.cl.length < 3) { e.ct = 0.05; e.cl.push({ x: p.cx, f: p.feet, d: p.facing }); } } else if (!e.lit && e.cl.length) { e.lit = true; e.lt = e.t; e.cl.push({ x: p.cx, f: p.feet, d: p.facing, end: true }, { x: p.cx + p.facing * 30, f: p.feet, d: p.facing, ray: true }); A.sfx('glassCrack', { minGap: 0.05 }); } if (e.lit && e.t - e.lt < 0.5) for (let i = 0; i < e.cl.length - 1; i++) { const a = e.cl[i], b = e.cl[i + 1]; A.tick(e, { x: Math.min(a.x, b.x), y: a.f - 16, w: Math.abs(b.x - a.x) + 2, h: 8 }, 0.25, { kb: 0.5 }); } },
      draw(e, ctx, ox, oy, A) { const f = A.fade(e, 0.02, 0.4); A.alpha(ctx, f, () => { for (const c of e.cl) if (c.ray) continue; else if (c.end) GEM(ctx, A, c.x + ox, c.f + oy - 8, 5, 8, '#c8a0ff', true); else A.alpha(ctx, 0.6, () => H.drawGhost(ctx, A, 'dash', c.x + ox, c.f + oy, c.d, '#c8a0ff')); if (e.lit) for (let i = 0; i < e.cl.length - 1; i++) { const a = e.cl[i], b = e.cl[i + 1]; for (let j = 0; j < 3; j++) A.line(ctx, a.x + ox, a.f + oy - 12 + j, b.x + ox, b.f + oy - 12 + j, RAINBOW[(j * 2 + i) % 6]); } }); },
    },
    guard: {
      name: 'Diamond Facet', sound: 'glass',
      draw(ctx, { A, x, bot, h, t }) { const cy = bot - h / 2; for (let yy = -h / 2; yy <= h / 2; yy++) { const w = 6 * (1 - Math.abs(yy) / (h / 2 + 1)); A.px(ctx, x - w, cy + yy, w, 1, '#e8d8ff'); A.px(ctx, x, cy + yy, w, 1, '#c8a0ff'); } A.line(ctx, x - 6, cy, x + 6, cy, '#ffffff'); A.line(ctx, x, cy - h / 2, x, cy + h / 2, '#ffffff'); const c = RAINBOW[Math.floor(t * 8) % 6]; A.px(ctx, x + 2, cy - 4 + ((t * 20) % 8), 1, 2, c); },
      hit(g, x, y, d) { for (let i = 0; i < 12; i++) dot(g, x, y, d * U.lerp(30, 150, Math.random()), U.lerp(-120, 50, Math.random()), RAINBOW[i % 6], { ay: 240, life: 0.5 }); },
    },
    m1: {
      name: 'Gem Edge', dmg: 9, cd: 0.36, kind: 'custom', life: 0.3,
      desc: 'Slash with a blade of living crystal, leaving rainbow streaks of refracted light in the air.',
      spawn(e, g, A) { A.sfx('glassCrack', { minGap: 0.05 }); },
      update(e, dt, g, A) { H.at(e, A, 0); H.melee(e, A, 32 * H.sc(e), 24); },
      draw(e, ctx, ox, oy, A) { const k = Math.min(1, e.t / 0.12), x = e.x + ox, y = e.y + oy, d = e.dir, R = 24 * H.sc(e); A.alpha(ctx, 1 - Math.max(0, e.t - 0.12) / 0.18, () => { for (let j = 0; j < 3; j++) A.arc(ctx, x, y, R - j, d, RAINBOW[(j * 2) % 6], 1, -1.2, U.lerp(-1.2, 1.2, k)); A.arc(ctx, x, y, R + 1, d, '#ffffff', 1, U.lerp(-1.2, 1.2, k) - 0.2, U.lerp(-1.2, 1.2, k)); }); },
    },
    s: [
      {
        name: 'Crystal Garden', dmg: 5, cd: 9, mp: 7, kind: 'custom', life: 4,
        desc: 'Crystals sprout across the ground ahead. Anything walking through them is cut and slowly crystallized.',
        spawn(e, g, A) { H.at(e, A, 46); e.gy = H.floor(A, e.x); e.cr = []; for (let i = 0; i < 9; i++) e.cr.push({ dx: (i - 4) * 9 + A.rnd(-2, 2), h: A.rnd(6, 13), d: i * 0.04, c: RAINBOW[i % 6] }); A.sfx('glassCrack'); },
        update(e, dt, g, A) { const R = 46 * H.sc(e); A.tick(e, { x: e.x - R, y: e.gy - 14, w: R * 2, h: 14 }, 0.45, { kb: 0.2, onHit(t) { if (t.applyStatus) t.applyStatus('crystallize', e.potency); } }); },
        draw(e, ctx, ox, oy, A) { const f = A.fade(e, 0.05, 0.5); A.alpha(ctx, f, () => { for (const c of e.cr) { const k = Math.min(1, Math.max(0, e.t - c.d) / 0.15); GEM(ctx, A, e.x + ox + c.dx * H.sc(e), e.gy + oy, 5, c.h * k * H.sc(e), c.c, false); } }); },
      },
      {
        name: 'Gem Golem', dmg: 14, cd: 12, mp: 8, kind: 'custom', life: 6,
        desc: 'A big golem of crystal clatters out of the ground and smashes anything near you. When it crumbles, it bursts.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx + p.facing * 16; e.gy = p.feet; e.d = p.facing; e.at = 0.6; A.sfx('glassCrack'); A.g.dust(e.x, e.gy, 6); },
        update(e, dt, g, A) {
          const t = A.near(e.x, e.gy - 14, 170); e.at -= dt; e.punch = Math.max(0, (e.punch || 0) - dt);
          if (!t) return;
          const c = A.center(t), dx = c.x - e.x; e.d = Math.sign(dx) || e.d;
          if (Math.abs(dx) > 18) { const nx = e.x + e.d * 70 * dt; if (!A.solid(nx + e.d * 8, e.gy - 6)) { e.x = nx; e.gy = A.ground(e.x, e.gy - 14); } e.walk = (e.walk || 0) + dt; }
          else if (e.at <= 0) { e.at = e.up ? 0.6 : 0.85; e.punch = 0.18; A.damage(e, t, 1, 1); A.blast(e, c.x, c.y, 16 * H.sc(e), { dmg: e.dmg * 0.5 }); A.spawn(e, W.SHOCK, { x: c.x, y: c.y, r: 16, dmg: 0, life: 0.25 }); A.sfx('glassCrack', { minGap: 0.05 }); }
        },
        onEnd(e, A) { W.boom(A, e, e.x, e.gy - 12, 30 * H.sc(e), { mult: 1.5 }); W.debris(A, e.x, e.gy - 12, 12, ['#c8a0ff', '#e8d8ff', '#ffffff'], 150); },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, gy = e.gy + oy, step = Math.floor((e.walk || 0) * 8) % 2, f = A.fade(e, 0.2, 0.4), rise = Math.min(1, e.t / 0.3), d = e.d;
          A.alpha(ctx, f, () => {
            ctx.save(); ctx.beginPath(); ctx.rect(x - 26, gy - 46, 52, 46); ctx.clip();
            const y = gy + (1 - rise) * 34, arm = e.punch ? 10 : 0;
            A.px(ctx, x - 7 + step, y - 8, 5, 8, '#a880e0'); A.px(ctx, x + 2 - step, y - 8, 5, 8, '#a880e0');
            GEM(ctx, A, x, y - 7, 20, 24, '#c8a0ff', false);
            A.px(ctx, x - 3, y - 24, 2, 2, '#ffffff'); A.px(ctx, x + 2, y - 24, 2, 2, '#ffffff');
            A.px(ctx, d > 0 ? x + 8 + arm : x - 15 - arm, y - 19, 7, 7, '#e8d8ff'); A.px(ctx, d > 0 ? x + 8 + arm : x - 15 - arm, y - 19, 7, 1, '#ffffff');
            A.px(ctx, d > 0 ? x - 13 : x + 8, y - 17, 5, 6, '#c8a0ff');
            ctx.restore();
          });
        },
      },
      {
        name: 'Prism Cage', dmg: 6, cd: 9, mp: 7, kind: 'custom', life: 1.6,
        desc: 'Four crystal walls slam up around the nearest enemy. Light ricochets around inside, hitting it again and again.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 160); e.tg = t; if (!t) { e.dead = true; return; } holdStun(t, 1.5); A.sfx('glassCrack'); },
        update(e, dt, g, A) { if (!e.tg || e.tg.dead) { e.dead = true; return; } e.ct = (e.ct || 0) - dt; if (e.t > 0.2 && e.ct <= 0) { e.ct = 0.12; A.damage(e, e.tg, 1, 0); } if (e.t > 1.3 && !e.sh) { e.sh = true; A.sfx('shatter'); for (let i = 0; i < 10; i++) A.spawn(e, H.proj(SHARD, { life: 0.5, r: 2 }), { x: A.center(e.tg).x, y: A.center(e.tg).y, vx: A.rnd(-160, 160), vy: A.rnd(-200, 40), col: RAINBOW[i % 6], dmg: e.dmg * 0.2 }); } },
        draw(e, ctx, ox, oy, A) { if (!e.tg || e.sh) return; const b = e.tg.box, x0 = b.x + ox - 4, x1 = b.x + b.w + ox + 4, y0 = b.y + oy - 4, y1 = b.y + b.h + oy, k = Math.min(1, e.t / 0.2); A.alpha(ctx, 0.75, () => { A.px(ctx, x0, y1 - (y1 - y0) * k, 2, (y1 - y0) * k, '#c8a0ff'); A.px(ctx, x1 - 2, y1 - (y1 - y0) * k, 2, (y1 - y0) * k, '#c8a0ff'); A.px(ctx, x0, y0, (x1 - x0) * k, 2, '#e8d8ff'); }); if (e.t > 0.2) { const seed = Math.floor(e.t * 16); for (let i = 0; i < 4; i++) { const ax = x0 + ((seed * 7 + i * 13) % (x1 - x0)), ay = y0 + ((seed * 3 + i * 11) % (y1 - y0)), bx = x0 + ((seed * 5 + i * 17) % (x1 - x0)), by = y0 + ((seed * 9 + i * 7) % (y1 - y0)); A.line(ctx, ax, ay, bx, by, RAINBOW[(seed + i) % 6]); } } },
      },
      {
        name: 'Kaleidoscope', dmg: 7, cd: 6, mp: 6, kind: 'custom', life: 0.5,
        desc: 'Blast a wide cone of rainbow crystal shards that splits and spins like a kaleidoscope.',
        spawn(e, g, A) { H.at(e, A, 6, -2); A.sfx('shatter'); const n = e.up ? 18 : 14; for (let i = 0; i < n; i++) { const a = U.lerp(-0.6, 0.6, i / (n - 1)); A.spawn(e, H.proj((b, ctx, ox, oy, A) => { A.alpha(ctx, 0.35, () => A.disc(ctx, b.x + ox, b.y + oy, 3, b.col)); SHARD(b, ctx, ox, oy, A); }, { life: 0.55, r: 4, tick(b, dt) { b.vy += Math.sin(b.t * 20 + b.ph) * 300 * dt; }, onHit(b, A) { A.spawn(b, W.SHOCK, { x: b.x, y: b.y, r: 8, dmg: 0, life: 0.2, c: b.col }); } }), { vx: Math.cos(a) * 290 * e.dir, vy: Math.sin(a) * 290, col: RAINBOW[i % 6], ph: i }); } },
        draw(e, ctx, ox, oy, A) { const k = e.t / e.life, x = e.x + ox, y = e.y + oy; A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 12; i++) { const a = i * 0.524 + e.t * 6, L = 10 + k * 14; A.line(ctx, x + Math.cos(a) * 3, y + Math.sin(a) * 3, x + Math.cos(a) * L, y + Math.sin(a) * L, RAINBOW[i % 6], i % 2 ? 1 : 2); } A.ring(ctx, x, y, 6 + k * 12, '#ffffff'); }); },
      },
      {
        name: 'Crystal Embrace', dmg: 16, cd: 8, mp: 6, kind: 'custom', life: 1.4,
        desc: 'Touch the nearest enemy and encase it in crystal. The next hit shatters it for huge damage.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 120); e.tg = t; if (!t) { e.dead = true; return; } A.damage(e, t, 0.5, 0); if (t.applyStatus) { t.applyStatus('encase', 0); if (t.status.encase) t.status.encase.t = 1.2; } A.sfx('glassCrack'); },
        update(e, dt, g, A) { if (!e.tg || e.tg.dead) { e.dead = true; return; } if (e.t > 1.1 && !e.sh) { e.sh = true; A.damage(e, e.tg, e.up ? 2.6 : 2, 1); A.sfx('shatter'); const c = A.center(e.tg); for (let i = 0; i < 12; i++) A.spawn(e, H.proj(SHARD, { life: 0.5, r: 2 }), { x: c.x, y: c.y, vx: A.rnd(-180, 180), vy: A.rnd(-220, 40), col: RAINBOW[i % 6], dmg: e.dmg * 0.2 }); } },
        draw(e, ctx, ox, oy, A) { if (!e.tg || e.sh) return; const b = e.tg.box, k = Math.min(1, e.t / 0.2); A.alpha(ctx, 0.8, () => GEM(ctx, A, b.x + b.w / 2 + ox, b.y + b.h + oy + 1, b.w + 10, (b.h + 12) * k, '#c8a0ff', false)); if (e.t > 0.8) for (let i = 0; i < Math.round((e.t - 0.8) * 20); i++) A.line(ctx, b.x + ox + (i * 5) % b.w, b.y + oy + (i * 7) % b.h, b.x + ox + ((i * 5) % b.w) + 3, b.y + oy + ((i * 7) % b.h) + 4, '#ffffff'); },
      },
    ],
    ult: {
      name: 'Prismatic World', dmg: 9,
      desc: 'A colossal crystal formation spreads across the battlefield. Giant spikes erupt from every direction, light bounces wildly between them, and the whole world shatters in a prismatic explosion.',
      charge: {
        pose: (t, k) => J({ lean: -1, FA: [[11.6, 14.6], [9.6, 16.2]], BA: [[5.4, 11], [3.6, 8.4]], bob: 0 }),
        lift: 6,
        draw(ctx, x, y, k, t, A, P) { for (let i = 0; i < 9; i++) { const dx = (i - 4) * 9, h = (8 + (4 - Math.abs(i - 4)) * 8) * U.clamp(k * 2 - Math.abs(i - 4) * 0.15, 0, 1); if (h > 0) GEM(ctx, A, x + dx, y + 14, 7, h, RAINBOW[i % 6], i === 4); } if (k > 0.5) RAINBOW.forEach((c, i) => { const a = -Math.PI / 2 + (i - 2.5) * 0.3 + Math.sin(t * 3) * 0.1; A.line(ctx, x, y - 20, x + Math.cos(a) * 50 * k, y - 20 + Math.sin(a) * 50 * k, c); }); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.8,
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t); e.sp = []; for (let i = 0; i < 16; i++) { const x = p.cx + (i - 7.5) * 30 + A.rnd(-8, 8); e.sp.push({ x, gy: A.ground(x, p.y + 2), h: A.rnd(50, 120), d: 0.1 + Math.abs(i - 7.5) * 0.04, c: RAINBOW[i % 6] }); } e.beams = []; e.bt = 0; A.sfx('glassCrack'); A.sfx('rumble', { dur: 2.6 }); },
          update(e, dt, g, A) {
            e.bt -= dt; for (const b of e.beams) b.t += dt;
            for (const s of e.sp) if (!s.hit && e.t > s.d + 0.1) { s.hit = true; A.hit(e, { x: s.x - 11, y: s.gy - s.h, w: 22, h: s.h }, { mult: 0.8, kb: 0, onHit(t) { if (t.applyStatus) t.applyStatus('launch', 0); } }); e.hit.clear(); A.sfx('glassCrack', { minGap: 0.05 }); }
            if (e.t > 0.8 && e.t < 2.8 && e.bt <= 0) { e.bt = 0.06; const a = e.sp[Math.floor(Math.random() * e.sp.length)], b = e.sp[Math.floor(Math.random() * e.sp.length)]; e.beams.push({ x0: a.x, y0: a.gy - a.h * 0.8, x1: b.x, y1: b.gy - b.h * 0.8, c: RAINBOW[Math.floor(Math.random() * 6)], t: 0 }); for (const t of e.ts) if (!t.dead) { const c = A.center(t); if (c.x > Math.min(a.x, b.x) && c.x < Math.max(a.x, b.x) && Math.random() < 0.5) A.damage(e, t, 0.4, 0); } A.sfx('zap', { minGap: 0.05 }); }
            if (e.t > 3 && !e.boom) { e.boom = true; for (const t of e.ts) if (!t.dead) A.damage(e, t, 6, 1.2); A.sfx('shatter'); A.sfx('boom'); A.flash(0.6); A.shake(12, 0.6); for (const s of e.sp) for (let i = 0; i < 5; i++) A.spawn(e, H.proj(SHARD, { life: 0.8, r: 2 }), { x: s.x, y: s.gy - s.h / 2, vx: A.rnd(-200, 200), vy: A.rnd(-260, 0), col: s.c, dmg: e.dmg * 0.2 }); }
          },
          draw(e, ctx, ox, oy, A) {
            if (!e.boom) for (const s of e.sp) { const k = U.clamp((e.t - s.d) / 0.15, 0, 1); if (k > 0) GEM(ctx, A, s.x + ox, s.gy + oy, 22, s.h * k, s.c, false); }
            for (const b of e.beams) if (b.t < 0.12) A.alpha(ctx, 1 - b.t / 0.12, () => { A.alpha(ctx, 0.4, () => A.line(ctx, b.x0 + ox, b.y0 + oy, b.x1 + ox, b.y1 + oy, b.c, 9)); A.line(ctx, b.x0 + ox, b.y0 + oy, b.x1 + ox, b.y1 + oy, b.c, 4); A.line(ctx, b.x0 + ox, b.y0 + oy, b.x1 + ox, b.y1 + oy, '#ffffff', 2); });
            if (e.boom) { const k = (e.t - 3) / 0.8; A.alpha(ctx, (1 - k) * 0.4, () => A.px(ctx, -10, -10, 2000, 2000, RAINBOW[Math.floor(e.t * 20) % 6])); A.alpha(ctx, Math.max(0, 1 - k), () => { for (let i = 0; i < 6; i++) { const r = 20 + k * (280 - i * 30); A.ring(ctx, p.cx + ox, p.feet + oy - 40, r, RAINBOW[i], r * 0.6, 2); } }); }
          },
        }, {});
      },
    },
  };

  // ================================================================ MOON (silver)
  const CRESCENT = (ctx, A, x, y, r, d, col, col2, a0) => { a0 = a0 || 0; for (let i = 0; i <= 24; i++) { const a = a0 + U.lerp(-1.7, 1.7, i / 24), w = Math.sin((i / 24) * Math.PI) * r * 0.45; for (let j = 0; j < w; j++) A.px(ctx, x + Math.cos(a) * (r - j) * d, y + Math.sin(a) * (r - j), 1, 1, j < 1 ? col2 : col); } };
  const MOTH = (ctx, A, x, y, t) => { const f = Math.floor(t * 14) % 2; A.px(ctx, x, y, 1, 2, '#c8c8e0'); A.px(ctx, x - 2, y - f, 2, 2, '#e8ecff'); A.px(ctx, x + 1, y - f, 2, 2, '#e8ecff'); A.alpha(ctx, 0.3, () => A.disc(ctx, x, y, 3, '#e0e4ff')); };
  AW.moon = {
    color: '#e0e4ff', up: '#ff6a8a', status: 'sleep', fx: 'moonbeams', block: ['Crescent Aegis', 'shield'],
    icons: ['tidePull', 'moths', 'nightDome', 'lunarCannon', 'waltz'],
    look: { back(ctx, F) { const h = F.at('headTop'); CRESCENT(ctx, F.A, h.x - F.d * 6, h.y + 4, 9, -F.d, '#c8ccf0', '#ffffff'); } },
    idle: { pose: (t) => IDLE.lazy(t), fx(ctx, F) { if (Math.floor(F.t * 0.5) % 2) { const m = F.at('mouth'); F.A.text(ctx, 'z', m.x + F.d * 6, m.y - 6 - ((F.t * 6) % 8), '#e0e4ff'); } } },
    run: {
      pose: (ph) => RUN.bound(ph),
      step(A, p, dt) { if (W.every(p, 'dust', 0.1, dt)) A.g.fx.add({ x: p.cx - p.facing * 4, y: p.y + 12, vx: -p.facing * 20, vy: -10, life: 0.6, color: '#e0e4ff', size: 1, fadeOut: 0.4 }); },
    },
    dash: {
      name: 'Moonwalk', dmg: 11, life: 1.3, flip: true,
      // facing backwards, gliding forwards: one heel up, the other foot sliding flat
      pose: (t) => { const s = Math.sin((0.3 - t) * 36), a = Math.max(0, s), b = Math.max(0, -s); return J({ lean: -1, FL: [[10 + a * 1.4, 19.2 + a * 0.3], [9.4 - s * 1.2, 22]], BL: [[7.4 + b * 1.4, 19.2 + b * 0.3], [6.6 + s * 1.2, 22]], FA: [[10.4, 14.6], [11.2, 17]], BA: [[6.4, 14.4], [5.4, 16.6]] }); },
      spawn(e) { e.marks = []; },
      update(e, dt, g, A) { const p = A.p; if (p.dashT > 0) { e.mt = (e.mt || 0) - dt; if (e.mt <= 0) { e.mt = 0.04; e.marks.push({ x: p.cx, gy: p.feet, t: e.t }); } A.hit(e, { x: p.x - 4, y: p.y, w: p.w + 8, h: p.h }, { kb: 0.6, onHit(t) { if (t.applyStatus) t.applyStatus('sleep', 0); } }); } for (const m of e.marks) if (e.t - m.t < 0.8) A.tick(e, { x: m.x - 4, y: m.gy - 10, w: 8, h: 10 }, 0.5, { mult: 0.3, kb: 0 }); },
      draw(e, ctx, ox, oy, A) { for (const m of e.marks) { const a = 1 - (e.t - m.t) / 0.8; if (a > 0) A.alpha(ctx, a, () => CRESCENT(ctx, A, m.x + ox, m.gy + oy - 6, 5, A.p.facing, '#c8ccf0', '#ffffff', Math.PI / 2)); } },
    },
    guard: {
      name: 'Crescent Aegis', sound: 'chime',
      draw(ctx, { A, x, bot, h, d, t }) { CRESCENT(ctx, A, x - d * 3, bot - h / 2, h / 2 + 1, d, '#c8ccf0', '#ffffff'); for (let i = 0; i < 3; i++) if ((Math.floor(t * 4) + i) % 3) A.star(ctx, x + d * 4, bot - h + 4 + i * 9, 1, '#ffffff', '#e0e4ff'); },
      hit(g, x, y, d) { for (let i = 0; i < 12; i++) dot(g, x, y, d * U.lerp(10, 90, Math.random()), U.lerp(-80, 40, Math.random()), i % 2 ? '#ffffff' : '#c8ccf0', { ay: -20, blink: 20, life: 0.7 }); },
    },
    m1: {
      name: 'Moonblade', dmg: 9, cd: 0.36, kind: 'custom', life: 0.3,
      desc: 'Big silver crescent sword strikes. Every third swing spins all the way around you.',
      spawn(e, g, A) { const p = A.p; p._mb = ((p._mb || 0) + 1) % 3; e.n = p._mb; A.sfx('swing', { minGap: 0.04 }); },
      update(e, dt, g, A) { H.at(e, A, 0); if (e.n === 0) A.hitR(e, e.x, e.y, 30 * H.sc(e), { mult: 1.5, kb: 1 }); else H.melee(e, A, 34 * H.sc(e), 26); },
      draw(e, ctx, ox, oy, A) {
        const k = Math.min(1, e.t / 0.14), x = e.x + ox, y = e.y + oy, d = e.dir, f = 1 - Math.max(0, e.t - 0.14) / 0.16;
        A.alpha(ctx, f, () => {
          if (e.n !== 0) { CRESCENT(ctx, A, x + d * 10, y + (e.n === 1 ? -2 : 2), 18 * H.sc(e) * k + 2, d, '#c8ccf0', '#ffffff', e.n === 1 ? -0.4 : 0.4); return; }
          const R = 26 * H.sc(e);
          for (let i = 0; i < 40; i++) { const q = i / 40; if (q > k) break; const a = q * Math.PI * 2 * d - Math.PI / 2; A.px(ctx, x + Math.cos(a) * R, y + Math.sin(a) * R * 0.6, 3, 2, i % 4 ? '#e0e4ff' : '#ffffff'); A.px(ctx, x + Math.cos(a) * (R - 3), y + Math.sin(a) * (R - 3) * 0.6, 1, 1, '#9aa0d0'); }
          A.alpha(ctx, 0.3, () => A.ring(ctx, x, y, R + 2, '#c8ccf0', (R + 2) * 0.6));
        });
      },
    },
    s: [
      {
        name: 'Tide Pull', dmg: 18, cd: 7, mp: 6, kind: 'custom', life: 1.2,
        desc: 'Pull on the tides like the moon does: enemies in front float up helplessly... then the pull lets go.',
        spawn(e, g, A) { H.at(e, A, 0); e.ts = H.nearby(A, e.x, e.y, 120 * H.sc(e)).filter((o) => (o.c.x - e.x) * e.dir > -6).map((o) => o.t); for (const t of e.ts) holdStun(t, 1.1); A.sfx('hover'); },
        update(e, dt, g, A) { for (const t of e.ts) { if (t.dead || t.tutorial) continue; if (e.t < 0.7) { floatV(t, -80, dt); t.vx = U.approach(t.vx, -e.dir * 20, 3, dt); } else t.vy = 400; } if (e.t > 0.85 && !e.drop) { e.drop = true; for (const t of e.ts) if (!t.dead) A.damage(e, t, 1, 0.3); A.sfx('crash'); A.shake(3, 0.2); } },
        draw(e, ctx, ox, oy, A) { const f = A.fade(e, 0.1, 0.3); A.alpha(ctx, f, () => { for (const t of e.ts) if (!t.dead) { const c = A.center(t); for (let i = 0; i < 3; i++) { const r = ((e.t * 2 + i / 3) % 1); A.ring(ctx, c.x + ox, c.y + oy + 14 - r * 20, 6 - r * 4, '#e0e4ff', 2); } } }); },
      },
      {
        name: 'Silver Moths', dmg: 6, cd: 9, mp: 7, kind: 'custom', life: 4,
        desc: 'A cloud of glowing silver moths flutters out. Wherever they land, enemies get very, very drowsy.',
        spawn(e, g, A) { H.at(e, A, 6, -6); e.mm = []; for (let i = 0; i < (e.up ? 10 : 7); i++) e.mm.push({ x: e.x, y: e.y, vx: e.dir * A.rnd(40, 90), vy: A.rnd(-40, 40), st: A.rnd(0, 0.5), ph: Math.random() * 6 }); A.sfx('star'); },
        update(e, dt, g, A) { for (const m of e.mm) { const t = A.near(m.x, m.y, 200); if (t) { const c = A.center(t); m.vx += (c.x - m.x) * 3 * dt; m.vy += (c.y - m.y - 6 + Math.sin(e.t * 4 + m.ph) * 10) * 3 * dt; } m.vx *= 1 - dt; m.vy *= 1 - dt; m.x += m.vx * dt; m.y += m.vy * dt + Math.sin(e.t * 8 + m.ph) * 10 * dt; m.st -= dt; if (t && m.st <= 0 && Math.hypot(A.center(t).x - m.x, A.center(t).y - m.y) < 10) { m.st = 0.8; A.damage(e, t, 1, 0); if (t.applyStatus && Math.random() < 0.4) t.applyStatus('sleep', e.potency); } } },
        draw(e, ctx, ox, oy, A) { A.alpha(ctx, A.fade(e, 0.1, 0.4), () => { for (const m of e.mm) MOTH(ctx, A, m.x + ox, m.y + oy, e.t + m.ph); }); },
      },
      {
        name: 'Night Dome', dmg: 4, cd: 14, mp: 8, kind: 'custom', life: 6,
        desc: 'Pull the night sky down around you. Inside the dome you hit harder, and enemies keep nodding off.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx; e.gy = p.feet; A.sfx('surge'); },
        update(e, dt, g, A) { const p = A.p, R = 60 * H.sc(e); if (Math.abs(p.cx - e.x) < R) p.ab.buffs.rage = { t: 0.2, up: e.up, pal: e.pal }; A.tick(e, { x: e.x - R, y: e.gy - R, w: R * 2, h: R }, 0.6, { kb: 0, onHit(t) { if (t.applyStatus && Math.random() < 0.25) t.applyStatus('sleep', e.potency); } }); },
        draw(e, ctx, ox, oy, A) { const R = 60 * H.sc(e), x = e.x + ox, gy = e.gy + oy, f = A.fade(e, 0.3, 0.5); A.alpha(ctx, f * 0.3, () => { for (let yy = 0; yy < R; yy++) { const w = Math.sqrt(R * R - yy * yy); A.px(ctx, x - w, gy - yy, w * 2, 1, '#10123a'); } }); A.alpha(ctx, f, () => { for (let a = Math.PI; a <= Math.PI * 2; a += 0.04) A.px(ctx, x + Math.cos(a) * R, gy + Math.sin(a) * R, 1, 1, '#c8ccf0'); for (let i = 0; i < 12; i++) if ((Math.floor(e.t * 3) + i) % 3) A.px(ctx, x - R + ((i * 29) % (R * 2)), gy - ((i * 17) % R), 1, 1, '#ffffff'); CRESCENT(ctx, A, x + R * 0.4, gy - R * 0.7, 5, 1, '#e0e4ff', '#ffffff'); }); },
      },
      {
        name: 'Lunar Cannon', dmg: 30, cd: 8, mp: 7, kind: 'custom', life: 2,
        desc: 'Gather moonlight into a big silver orb and fire it. It bursts into a spray of crescents.',
        spawn(e, g, A) { H.at(e, A, 10, -2); A.sfx('energyCharge'); },
        update(e, dt, g, A) { if (e.t < 0.4) { H.at(e, A, 10, -2); return; } if (!e.fired) { e.fired = true; e.vx = e.dir * 150; A.sfx('whoosh'); } e.x += e.vx * dt; const hit = A.targets().some((t) => Phys().rectsOverlap(t.box, { x: e.x - 7, y: e.y - 7, w: 14, h: 14 })); if (hit || A.solid(e.x, e.y) || e.t > 1.8) { A.blast(e, e.x, e.y, 30 * H.sc(e)); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; A.spawn(e, H.proj((b, ctx, ox, oy, A) => CRESCENT(ctx, A, b.x + ox, b.y + oy, 4, Math.sign(b.vx) || 1, '#c8ccf0', '#ffffff'), { life: 0.5, r: 3 }), { x: e.x, y: e.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, dmg: e.dmg * 0.25 }); } e.dead = true; } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, k = Math.min(1, e.t / 0.4), r = Math.round(2 + k * 6 * H.sc(e)); A.glow(ctx, x, y, r + 4, '#e0e4ff', 0.3); A.disc(ctx, x, y, r, '#e8ecff', '#ffffff'); A.disc(ctx, x - r * 0.3, y + r * 0.2, Math.max(1, Math.round(r * 0.25)), '#c8ccf0'); },
      },
      {
        name: 'Starlit Waltz', dmg: 12, cd: 7, mp: 6, kind: 'custom', life: 0.85,
        desc: 'Three graceful dancing steps forward, back and forward again, a big crescent slash on each... and a burst of starlight at the end.',
        spawn(e, g, A) { e.steps = 0; A.sfx('swing'); },
        update(e, dt, g, A) {
          const p = A.p, want = Math.min(3, Math.floor(e.t / 0.22) + 1);
          while (e.steps < want) { e.steps++; const d = e.steps === 2 ? -p.facing : p.facing; p.vx = d * 220; p.lungeT = 0.16; p.dashGrace = 0.2; e.hit.clear(); e.sd = d; e.st = e.t; A.sfx('swing', { minGap: 0.04 }); twinkles(A, e, p.cx, p.y + 10, 4, 60); }
          e.x = p.cx; e.y = p.y + 10;
          A.hit(e, { x: p.x - 12, y: p.y, w: p.w + 24, h: p.h }, { kb: 0.6, onHit(t) { if (t.applyStatus && e.steps === 3) t.applyStatus('sleep', 0); } });
          if (e.steps === 3 && !e.fin && e.t > e.st + 0.12) { e.fin = true; W.boom(A, e, p.cx + p.facing * 10, p.y + 10, 30 * H.sc(e)); twinkles(A, e, p.cx + p.facing * 10, p.y + 10, 10, 120); }
        },
        draw(e, ctx, ox, oy, A) { if (e.st === undefined) return; const k = Math.min(1, (e.t - e.st) / 0.22); A.alpha(ctx, 1 - k, () => { CRESCENT(ctx, A, e.x + ox + e.sd * 8, e.y + oy, 20 * H.sc(e), e.sd, '#c8ccf0', '#ffffff'); for (let i = 0; i < 5; i++) A.star(ctx, e.x + ox - e.sd * (6 + i * 6), e.y + oy - 8 + (i % 3) * 7, 2, i % 2 ? '#c8ccf0' : '#ffffff'); }); },
      },
    ],
    ult: {
      name: 'Lunar Apocalypse', dmg: 10,
      desc: 'A gigantic full moon rises and its gravity goes mad: enemies are dragged up towards it while crescent waves of moonlight slash across the battlefield. Then gravity reverses and slams them all into the ground.',
      charge: {
        pose: (t, k) => J({ lean: -1, FA: [[11, 10.6], [12, 7]], BA: [[5.6, 12], [4.4, 14.6]], bob: 0 }),
        lift: 10,
        draw(ctx, x, y, k, t, A, P) { const mx = x - 6, my = y - 34, r = Math.round(4 + k * 20); A.alpha(ctx, 0.45 * k, () => A.px(ctx, x - 300, y - 200, 600, 400, '#0a0c24')); A.glow(ctx, mx, my, r + 5, '#e0e4ff', 0.25); A.disc(ctx, mx, my, r, '#e8ecff', '#ffffff'); A.disc(ctx, mx - r * 0.3, my + r * 0.2, Math.max(1, Math.round(r * 0.2)), '#c8ccf0'); A.disc(ctx, mx + r * 0.35, my - r * 0.3, Math.max(1, Math.round(r * 0.14)), '#c8ccf0'); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.8, layer: 'screen',
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t); for (const t of e.ts) holdStun(t, 3.2); e.waves = []; e.wt = 0; e.slammed = new Set(); A.sfx('surge'); },
          update(e, dt, g, A) {
            e.wt -= dt; for (const w of e.waves) { w.t += dt; w.x += w.d * 340 * dt; }
            // the moon's pull drags everyone up... until gravity flips and slams them back down
            for (const t of e.ts) if (!t.dead && !t.tutorial) { if (e.t < 1.3) { floatV(t, -100, dt); t.vx *= 0.9; } else if (e.t < 2.4) floatV(t, Math.sin(e.t * 4 + t.uid) * 12, dt); else t.vy = 400; }
            if (e.t > 0.6 && e.t < 2.2 && e.wt <= 0) { e.wt = 0.3; const d = e.waves.length % 2 ? -1 : 1, y = p.y - 30 - (e.waves.length % 3) * 30; e.waves.push({ x: p.cx - d * 260, y, d, t: 0 }); e.hit.clear(); A.sfx('swing'); }
            for (const w of e.waves) if (w.t < 1.4) A.hit(e, { x: w.x - 20, y: w.y - 45, w: 40, h: 90 }, { mult: 0.9, kb: 0 });
            if (e.t > 2.4) for (const t of e.ts) if (!t.dead && !e.slammed.has(t) && (t.onGround || t.tutorial || e.t > 3.1)) {
              e.slammed.add(t); A.damage(e, t, 5, 0.4); const c = A.center(t); A.puff(e, c.x, t.box.y + t.box.h, 8, 2);
              if (!e.slam) { e.slam = e.t; A.sfx('crash'); A.sfx('boom'); A.shake(14, 0.6); A.flash(0.3); }
            }
          },
          draw(e, ctx, ox, oy, A) {
            const dark = e.t < 3 ? Math.min(1, e.t * 3) * 0.65 : Math.max(0, 0.65 - (e.t - 3) * 0.9);
            A.alpha(ctx, dark, () => A.px(ctx, -10, -10, 2000, 2000, '#0a0c24'));
            const mx = p.cx + ox, my = A.top() + oy + 50, r = 60 * Math.min(1, e.t / 0.6);
            A.alpha(ctx, Math.min(1, dark * 1.5), () => { A.glow(ctx, mx, my, r + 12, '#e0e4ff', 0.3); A.disc(ctx, mx, my, Math.round(r), '#e8ecff', '#ffffff'); for (const [dx, dy, rr] of [[-18, 10, 10], [20, -14, 8], [6, 24, 6], [-26, -18, 5]]) A.disc(ctx, mx + dx * (r / 60), my + dy * (r / 60), Math.max(1, Math.round(rr * (r / 60))), '#c8ccf0'); });
            for (const w of e.waves) if (w.t < 1.4) CRESCENT(ctx, A, w.x + ox, w.y + oy, 36, w.d, '#c8ccf0', '#ffffff');
            if (e.slam) { const k = (e.t - e.slam) / 1.1; A.alpha(ctx, 1 - k, () => A.px(ctx, -10, p.feet + oy - 3, 2000, 3 + k * 6, '#e0e4ff')); }
          },
        }, {});
      },
    },
  };

  // ================================================================ SOLAR (sunfire)
  const SUN = (ctx, A, x, y, r, t, c) => { A.glow(ctx, x, y, r + 4, c, 0.3); for (let i = 0; i < 12; i++) { const a = t * 2 + (i / 12) * Math.PI * 2, l = r + 3 + Math.sin(t * 10 + i * 2) * 2; A.line(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a) * l, y + Math.sin(a) * l, i % 2 ? c : '#ffe08a'); } A.disc(ctx, x, y, Math.max(1, Math.round(r)), c, '#fff8d0'); };
  const FLARE = { life: 0.5, update(e, dt) { e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= 1 - dt * 3; e.vy *= 1 - dt * 3; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => A.px(ctx, e.x + ox, e.y + oy, 2, 2, e.t < 0.2 ? '#ffffff' : '#ff9a1a')); } };
  AW.solar = {
    color: '#ff9a1a', up: '#ffffff', status: 'sunburn', fx: 'flares', block: ['Sunshield Corona', 'shield'],
    icons: ['prominence', 'dawn', 'heliostat', 'flareBurst', 'daybreak'],
    look: { back(ctx, F) { const c = F.at('headTop'), A = F.A; A.alpha(ctx, 0.35 + 0.1 * Math.sin(F.t * 3), () => { for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + F.t * 0.6; A.line(ctx, c.x - F.d * 2 + Math.cos(a) * 7, c.y + 4 + Math.sin(a) * 7, c.x - F.d * 2 + Math.cos(a) * 12, c.y + 4 + Math.sin(a) * 12, i % 2 ? '#ff9a1a' : '#ffe08a'); } }); } },
    idle: { pose: (t) => IDLE.spread(t, { lift: 2 }), fx(ctx, F) { for (const h of ['handF', 'handB']) { const p = F.at(h); F.A.glow(ctx, p.x, p.y, 2, '#ff9a1a', 0.4); F.A.px(ctx, p.x, p.y, 1, 1, '#ffffff'); } } },
    run: {
      pose: (ph) => RUN.blaze(ph),
      step(A, p, dt) { if (W.every(p, 'flare', 0.04, dt)) W.emit(A, FLARE, { x: p.cx - p.facing * 5, y: p.y + A.rnd(4, 18), vx: -p.facing * A.rnd(40, 100), vy: A.rnd(-30, 30) }); },
    },
    dash: {
      name: 'Sunflare Dash', dmg: 11, life: 1.6,
      spawn(e) { e.arcs = []; },
      update(e, dt, g, A) { const p = A.p; if (p.dashT > 0) { e.at = (e.at || 0) - dt; if (e.at <= 0) { e.at = 0.05; e.arcs.push({ x: p.cx, gy: p.feet, t: e.t }); } A.hit(e, { x: p.x - 4, y: p.y, w: p.w + 8, h: p.h }, { dir: p.facing, kb: 0.8 }); } for (const a of e.arcs) if (e.t - a.t < 1.2) A.tick(e, { x: a.x - 6, y: a.gy - 14, w: 12, h: 14 }, 0.4, { mult: 0.25, kb: 0 }); },
      draw(e, ctx, ox, oy, A) { for (const a of e.arcs) { const k = (e.t - a.t) / 1.2; if (k < 1) A.alpha(ctx, 1 - k, () => { for (let i = 0; i <= 10; i++) { const q = i / 10; A.px(ctx, a.x + ox - 6 + q * 12, a.gy + oy - Math.sin(q * Math.PI) * 12, 2, 1, i % 3 ? '#ff9a1a' : '#ffe08a'); } }); } },
    },
    guard: {
      name: 'Sunshield Corona', sound: 'crackle',
      draw(ctx, { A, x, bot, h, t }) { const cy = bot - h / 2; SUN(ctx, A, x, cy, 6, t, '#ff9a1a'); for (let i = 0; i < 2; i++) { const a = t * 2 + i * Math.PI; for (let j = 0; j <= 8; j++) { const q = j / 8, b = a + q * 2; A.px(ctx, x + Math.cos(b) * (8 + Math.sin(q * Math.PI) * 4), cy + Math.sin(b) * (12 + Math.sin(q * Math.PI) * 4), 1, 1, '#ffe08a'); } } },
      hit(g, x, y, d) { for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; dot(g, x, y, Math.cos(a) * 100, Math.sin(a) * 100 - 30, i % 2 ? '#ff9a1a' : '#ffffff', { life: 0.35, ay: -40 }); } },
    },
    m1: {
      name: 'Flare Punch', dmg: 9, cd: 0.34, kind: 'custom', life: 0.3,
      desc: 'Punches that crackle with solar flares. Every third one bursts like a small sun.',
      spawn(e, g, A) { const p = A.p; p._fp = ((p._fp || 0) + 1) % 3; e.n = p._fp; A.sfx(e.n === 0 ? 'ignite' : 'punchHit', { minGap: 0.04 }); },
      update(e, dt, g, A) { H.at(e, A, 0); if (e.n === 0) { A.hitR(e, e.x + e.dir * 20, e.y, 20 * H.sc(e), { mult: 1.6, kb: 1.2 }); if (!e.sh) { e.sh = true; A.spawn(e, W.SHOCK, { x: e.x + e.dir * 22, y: e.y, r: 22 * H.sc(e), dmg: 0, life: 0.3 }); A.shake(2, 0.1); } } else H.melee(e, A, 32 * H.sc(e), 22); },
      draw(e, ctx, ox, oy, A) {
        const k = e.t / e.life, d = e.dir, x = e.x + ox + d * (10 + 10 * Math.min(1, k * 4)), y = e.y + oy;
        A.alpha(ctx, 1 - k, () => {
          if (e.n === 0) { SUN(ctx, A, x + d * 8, y, 6 + k * 12, e.t, '#ff9a1a'); return; }
          A.alpha(ctx, 0.4, () => A.disc(ctx, x, y, 6, '#ff9a1a'));
          A.disc(ctx, x, y, 4, '#ff9a1a', '#ffffff');
          for (let i = 0; i < 6; i++) A.px(ctx, x - d * (5 + i * 4) - (d > 0 ? 3 : 0), y - 4 + (i % 3) * 4, 3, 1, i % 2 ? '#ffe08a' : '#ffffff');
        });
      },
    },
    s: [
      {
        name: 'Solar Prominence', dmg: 9, cd: 6, mp: 6, kind: 'custom', life: 1.2,
        desc: 'A loop of solar plasma rises out of the ground, arcs over, and crashes down ahead, burning all along its path.',
        spawn(e, g, A) { H.at(e, A, 4); e.gy = H.floor(A, e.x); A.sfx('ignite'); },
        update(e, dt, g, A) { const L = 100 * H.sc(e), k = Math.min(1, e.t / 0.4); for (let i = 0; i <= 10 * k; i++) { const q = i / 10, x = e.x + e.dir * q * L, y = e.gy - Math.sin(q * Math.PI) * 50; A.tickR(e, x, y, 8, 0.25, { kb: 0.4 }); } if (e.t > 0.4 && !e.crash) { e.crash = true; A.hitR(e, e.x + e.dir * L, e.gy - 8, 18, { mult: 1.6, kb: 1 }); A.sfx('crash'); } },
        draw(e, ctx, ox, oy, A) { const L = 100 * H.sc(e), k = Math.min(1, e.t / 0.4), f = e.t > 0.9 ? 1 - (e.t - 0.9) / 0.3 : 1; A.alpha(ctx, f, () => { for (let i = 0; i <= 60 * k; i++) { const q = i / 60, x = e.x + ox + e.dir * q * L, y = e.gy + oy - Math.sin(q * Math.PI) * 50 + Math.sin(i * 0.8 + e.t * 20) * 1.5; A.px(ctx, x - 1, y - 1, 3, 3, i % 4 ? '#ff9a1a' : '#ffe08a'); A.px(ctx, x, y, 1, 1, '#ffffff'); } }); },
      },
      {
        name: 'Dawn Breaker', dmg: 20, cd: 8, mp: 7, kind: 'custom', life: 1.6,
        desc: 'A little sun rises out of the ground in front of you, blinding and burning everything it rises past.',
        spawn(e, g, A) { H.at(e, A, 0); const ax = A.aim(e, 140); e.tx = ax !== null ? ax : e.x + e.dir * 50; e.gy = H.floor(A, e.tx); A.sfx('ignite'); },
        update(e, dt, g, A) { const q = Math.min(1, e.t / 1.2); e.sy = e.gy - q * 70; A.tickR(e, e.tx, e.sy, 14 * H.sc(e), 0.3, { kb: 0.3, onHit(t) { if (t.applyStatus) t.applyStatus('dazzle', 0); } }); },
        draw(e, ctx, ox, oy, A) { const x = e.tx + ox, gy = e.gy + oy, y = (e.sy !== undefined ? e.sy : e.gy) + oy, f = e.t > 1.3 ? 1 - (e.t - 1.3) / 0.3 : 1; A.alpha(ctx, f, () => { A.alpha(ctx, 0.4, () => { for (let i = 0; i < 9; i++) { const a = -Math.PI + (i / 8) * Math.PI; A.line(ctx, x, y, x + Math.cos(a) * 40, y + Math.sin(a) * 40, '#ffe08a'); } }); SUN(ctx, A, x, y, 9 * H.sc(e), e.t, '#ff9a1a'); A.px(ctx, x - 20, gy - 1, 40, 1, '#ff9a1a'); }); },
      },
      {
        name: 'Heliostat', dmg: 8, cd: 11, mp: 7, kind: 'custom', life: 5,
        desc: 'Deploy a mirror on a stand that catches the sunlight and focuses it into a burning ray on the nearest enemy.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx - p.facing * 12; e.gy = p.feet; e.top = H.sky(A, e.x, e.gy - 10); A.sfx('hitMetal'); },
        update(e, dt, g, A) { e.tg = A.near(e.x, e.gy - 18, 170); if (e.tg) A.tickR(e, A.center(e.tg).x, A.center(e.tg).y, 6, e.up ? 0.2 : 0.3, { kb: 0, onHit(t) { if (t.applyStatus) t.applyStatus('sunburn', 0); } }); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, gy = e.gy + oy, f = A.fade(e, 0.1, 0.4); A.alpha(ctx, f, () => { A.px(ctx, x, gy - 14, 1, 14, '#8a90a0'); A.px(ctx, x - 4, gy - 1, 9, 1, '#8a90a0'); A.px(ctx, x - 5, gy - 20, 11, 6, '#c8e0ff'); A.px(ctx, x - 5, gy - 20, 11, 1, '#ffffff'); A.alpha(ctx, 0.5, () => A.line(ctx, x - 30, e.top + oy, x, gy - 17, '#ffe08a')); if (e.tg && !e.tg.dead) { const c = A.center(e.tg); A.line(ctx, x, gy - 17, c.x + ox, c.y + oy, '#ff9a1a', 2); A.line(ctx, x, gy - 17, c.x + ox, c.y + oy, '#ffffff'); A.disc(ctx, c.x + ox, c.y + oy, 2, '#ffffff'); } }); },
      },
      {
        name: 'Flare Burst', dmg: 10, cd: 7, mp: 6, kind: 'custom', life: 1.6,
        desc: 'Eight solar flares shoot out in every direction, then curve back to you, burning everything twice.',
        spawn(e, g, A) { const p = A.p; e.fl = []; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; e.fl.push({ x: p.cx, y: p.y + 10, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, i }); } A.sfx('ignite'); },
        update(e, dt, g, A) { const p = A.p; for (const f of e.fl) { if (f.gone) continue; if (e.t > 0.45) { const a = Math.atan2(p.y + 10 - f.y, p.cx - f.x); f.vx = U.approach(f.vx, Math.cos(a) * 260, 6, dt); f.vy = U.approach(f.vy, Math.sin(a) * 260, 6, dt); if (Math.hypot(p.cx - f.x, p.y + 10 - f.y) < 8) f.gone = true; if (!e.back) { e.back = true; e.hit.clear(); } } f.x += f.vx * dt; f.y += f.vy * dt; A.hitR(e, f.x, f.y, 6, { kb: 0.4 }); } },
        draw(e, ctx, ox, oy, A) { for (const f of e.fl) if (!f.gone) { A.disc(ctx, f.x + ox, f.y + oy, 3, '#ff9a1a', '#ffffff'); A.px(ctx, f.x + ox - f.vx * 0.03, f.y + oy - f.vy * 0.03, 2, 2, '#ffe08a'); } },
      },
      {
        name: 'Daybreak', dmg: 12, cd: 13, mp: 8, kind: 'custom', life: 1,
        desc: 'The sky flashes like the first second of sunrise. Every enemy you can see is blinded and burnt.',
        spawn(e, g, A) { A.flash(0.6); A.sfx('revive'); for (const o of H.nearby(A, A.p.cx, A.p.y, 260)) { A.damage(e, o.t, 1, 0.3); if (o.t.applyStatus) { o.t.applyStatus('dazzle', e.potency); o.t.applyStatus('sunburn', e.potency); } } },
        update(e, dt, g, A) { e.x = A.p.cx; e.y = A.p.y; },
        draw(e, ctx, ox, oy, A) { const k = e.t / e.life; A.alpha(ctx, (1 - k) * 0.5, () => { for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; A.line(ctx, e.x + ox, e.y + oy, e.x + ox + Math.cos(a) * 300, e.y + oy + Math.sin(a) * 300, i % 2 ? '#ffe08a' : '#ffffff'); } }); },
      },
    ],
    ult: {
      name: 'Solar Apocalypse', dmg: 9,
      desc: 'Pull the power of the sun straight into your body. Massive flares erupt out of you, solar blasts rain over the battlefield, then all of it explodes outward at once.',
      charge: {
        pose: (t, k) => J({ FA: [[11.4, 13], [13.6, 11.8]], BA: [[5.2, 13], [3, 11.8]], bob: 0 }),
        lift: 24, keepLift: true,
        draw(ctx, x, y, k, t, A, P) { SUN(ctx, A, x, y - 2, 4 + k * 12, t, P.c); for (let i = 0; i < 12; i++) { const a = i * 0.52 + t * 3, d = 50 * (1 - ((t * 2 + i / 12) % 1)); A.px(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 2, 2, '#ffe08a'); } },
      },
      run(A, e0) {
        const p = A.p;
        const radiate = () => J({ FA: [[11.4, 13], [13.6, 11.8]], BA: [[5.2, 13], [3, 11.8]] });
        W.hold(A, radiate, 24, 4);
        A.spawn(e0, {
          life: 3.8,
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t); e.flares = []; e.bt = 0; A.sfx('ignite'); A.sfx('surge'); },
          update(e, dt, g, A) {
            const h = p.ultHold, sx = p.cx, sy = p.y + 10 - (h ? h.lift : 0);
            e.sx = sx; e.sy = sy; e.bt -= dt; for (const f of e.flares) f.t += dt;
            if (e.t < 2.6 && e.bt <= 0) { e.bt = 0.08; const live = e.ts.filter((t) => !t.dead), t = live[Math.floor(Math.random() * Math.max(1, live.length))]; const c = t ? A.center(t) : { x: sx + A.rnd(-200, 200), y: p.feet - A.rnd(0, 40) }; e.flares.push({ x0: sx, y0: sy, x1: c.x, y1: c.y, t: 0 }); A.hitR(e, c.x, c.y, 14, { mult: 0.8, kb: 0.4, once: false, every: 0.1, onHit(tg) { if (tg.applyStatus) tg.applyStatus('sunburn', 0); } }); A.sfx('ignite', { minGap: 0.05 }); }
            if (e.t > 2.8 && !e.boom) { e.boom = true; A.hitR(e, sx, sy, 300, { mult: 7, kb: 2 }); A.flash(0.6); A.shake(14, 0.7); A.sfx('boom'); }
            if (h) h.lift = e.t < 3 ? 24 : Math.max(0, 24 - (e.t - 3) * 70);
            if (e.t > 3.4 && h) W.release(A);
          },
          draw(e, ctx, ox, oy, A) {
            if (e.sx === undefined) return; const x = e.sx + ox, y = e.sy + oy;
            if (!e.boom) { SUN(ctx, A, x, y, 12 + Math.sin(e.t * 8) * 2, e.t, '#ff9a1a'); for (let i = 0; i < 6; i++) { const a = e.t * 1.5 + i * 1.047; for (let j = 0; j <= 10; j++) { const q = j / 10, b = a + q * 1.2; A.px(ctx, x + Math.cos(b) * (14 + Math.sin(q * Math.PI) * 18), y + Math.sin(b) * (14 + Math.sin(q * Math.PI) * 18), 2, 2, j % 3 ? '#ff9a1a' : '#ffe08a'); } } }
            for (const f of e.flares) if (f.t < 0.25) { const k = f.t / 0.25, mx = U.lerp(f.x0, f.x1, Math.min(1, k * 2)), my = U.lerp(f.y0, f.y1, Math.min(1, k * 2)); A.line(ctx, f.x0 + ox, f.y0 + oy, mx + ox, my + oy, '#ff9a1a', 2); if (k > 0.5) A.alpha(ctx, 1 - k, () => A.ring(ctx, f.x1 + ox, f.y1 + oy, 4 + (k - 0.5) * 30, '#ffe08a', 4 + (k - 0.5) * 30)); }
            if (e.boom) { const k = (e.t - 2.8) / 1; A.alpha(ctx, (1 - k) * 0.4, () => A.px(ctx, -10, -10, 2000, 2000, '#ffb84a')); A.alpha(ctx, 1 - k, () => { A.ring(ctx, x, y, 20 + k * 280, '#ffffff', 20 + k * 280, 2); A.ring(ctx, x, y, 10 + k * 230, '#ff9a1a', 10 + k * 230, 2); for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; A.line(ctx, x + Math.cos(a) * 20, y + Math.sin(a) * 20, x + Math.cos(a) * (40 + k * 260), y + Math.sin(a) * (40 + k * 260), i % 2 ? '#ff9a1a' : '#ffe08a', 2); } }); }
          },
        }, {});
      },
    },
  };
})(window.ERX = window.ERX || {});
