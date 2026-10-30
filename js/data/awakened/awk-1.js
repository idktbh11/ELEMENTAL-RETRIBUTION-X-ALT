/*
 * AWAKENED: FIRE, WATER, WIND, EARTH, LIGHTNING, ICE
 * (format: js/data/awakened/_awk.js)
 */
(function (ERX) {
  'use strict';

  const AW = ERX.Awakened, H = ERX.KitHelp, W = ERX.AwkHelp, U = ERX.U;
  const { J, IDLE, RUN } = W;
  const Phys = () => ERX.GameEngine.Physics;
  const dot = (g, x, y, vx, vy, color, o) => g.fx.add(Object.assign({ x, y, vx, vy, life: 0.5, color, size: 1, fadeOut: 0.3 }, o));

  // ================================================================ FIRE (azure)
  const BLUE_LICK = { life: 0.45, update(e, dt) { e.y -= 30 * dt; e.x += Math.sin(e.t * 20 + e.ph) * 6 * dt; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => { A.px(ctx, e.x + ox, e.y + oy - 2, 1, 3, e.pal.c); A.px(ctx, e.x + ox, e.y + oy - 3, 1, 1, '#ffffff'); }); } };
  const BLUE_FIELD = { life: 2.6, update(e, dt, g, A) { A.tick(e, { x: e.x - e.r, y: e.gy - 12, w: e.r * 2, h: 12 }, 0.35, { mult: 0.3, kb: 0 }); if (Math.random() < dt * e.r * 0.5) A.spawn(e, BLUE_LICK, { x: e.x + A.rnd(-e.r, e.r), y: e.gy - 1, ph: Math.random() * 6 }); }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, A.fade(e, 0.15, 0.6), () => { for (let x = -e.r; x < e.r; x += 2) { const h = 2 + Math.abs(Math.sin(x * 0.6 + e.t * 11)) * 5; A.px(ctx, e.x + x + ox, e.gy + oy - h, 2, h, (x / 2) % 3 ? e.pal.c : '#e8f8ff'); } }); } };
  const SUN = (ctx, A, x, y, r, t, P) => {
    A.glow(ctx, x, y, r + 6, P.c, 0.22);
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2 + t * 1.5, l = r + 3 + Math.abs(Math.sin(t * 7 + i * 1.7)) * r * 0.45; A.line(ctx, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, x + Math.cos(a) * l, y + Math.sin(a) * l, i % 2 ? P.c : '#e8f8ff', 2); }
    A.disc(ctx, x, y, Math.round(r), P.c, '#ffffff'); A.disc(ctx, x - r * 0.25, y - r * 0.25, Math.max(1, Math.round(r * 0.45)), '#ffffff');
  };
  const AZURE = ['#1a5aff', '#3ab0ff', '#e8f8ff'];
  /** One azure meteor: streaks from (sx, sy) down to (tx, gy) in `fall` seconds, then craters. big: the last, huge one. */
  const METEOR = {
    update(m, dt, g, A) {
      const q = Math.min(1, m.t / m.fall);
      m.mx = U.lerp(m.sx, m.tx, q); m.my = U.lerp(m.sy, m.gy, q);
      if (q < 1 || m.b) return;
      m.b = true; m.bt = m.t;
      const r = (m.big ? 34 : 17) * H.sc(m);
      if (m.big) W.boom(A, m, m.tx, m.gy - 6, r, { mult: 2.2, flat: 0.55 });
      else { A.hitR(m, m.tx, m.gy - 5, r, { kb: 0.8 }); A.spawn(m, W.SHOCK, { x: m.tx, y: m.gy - 2, r, flat: 0.45, dmg: 0 }); A.shake(1.5, 0.08); if (ERX.ElementSfx) ERX.ElementSfx.boom(m.el, r, true); }
      W.debris(A, m.tx, m.gy - 2, m.big ? 16 : 6, AZURE.concat(['#ffffff']), m.big ? 190 : 120);
      for (let i = 0; i < (m.big ? 10 : 4); i++) A.spawn(m, BLUE_LICK, { x: m.tx + A.rnd(-r * 0.6, r * 0.6), y: m.gy - 1, ph: i, dmg: 0 });
    },
    draw(m, ctx, ox, oy, A) {
      if (m.b) { const k = (m.t - m.bt) / 0.4; A.alpha(ctx, 1 - k, () => { A.disc(ctx, m.tx + ox, m.gy + oy - 1, Math.max(1, Math.round(m.R * 1.8 * (1 - k))), '#3ab0ff', '#e8f8ff'); A.px(ctx, m.tx + ox - m.R * 2, m.gy + oy - 1, m.R * 4, 1, '#e8f8ff'); }); return; }
      if (m.mx === undefined) return;
      const x = m.mx + ox, y = m.my + oy, dx = m.tx - m.sx, dy = m.gy - m.sy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, tl = m.R * 7;
      W.beam(ctx, A, x - ux * tl, y - uy * tl, x, y, 1, m.pal.c, m.pal.l);
      W.beam(ctx, A, x - ux * tl * 0.5, y - uy * tl * 0.5, x, y, Math.max(1, m.R * 0.7), m.pal.c, m.pal.l);
      A.glow(ctx, x, y, m.R + 3, m.pal.c, 0.35);
      A.disc(ctx, x, y, Math.max(1, Math.round(m.R)), m.pal.c, '#ffffff');
      A.disc(ctx, x, y, Math.max(1, Math.round(m.R * 0.45)), '#ffffff');
    },
  };
  AW.fire = {
    color: '#3ab0ff', up: '#f0fbff', status: 'scorch', fx: 'embers', block: ['Azure Inferno Wall', 'shield'],
    icons: ['lanceA', 'fuse', 'meteorShower', 'eruption', 'dragon'],
    // ---- the look: the left eye burns with azure flame, the whole time ----
    look: { fx(ctx, F) { const e = F.at('eye'), A = F.A; A.alpha(ctx, 0.3, () => A.disc(ctx, e.x, e.y - 3, 4, '#3ab0ff')); for (let i = 0; i < 3; i++) W.flame(ctx, A, e.x - F.d * (i - 1), e.y + 1, 9 + Math.round(Math.sin(F.t * 9 + i * 2) * 2) - Math.abs(i - 1) * 3, F.t + i, AZURE); W.eye(ctx, A, F, '#3ab0ff', true); } },
    idle: {
      pose: (t) => IDLE.menace(t, { lean: 1, fist: true }),
      fx(ctx, F) {
        // smouldering hands + embers drifting off
        for (const h of ['handF', 'handB']) { const p = F.at(h); W.flame(ctx, F.A, p.x, p.y, 3 + Math.round(Math.abs(Math.sin(F.t * 7 + (h === 'handF' ? 0 : 2))) * 2), F.t, AZURE); }
        W.aura(ctx, F.A, F, '#3ab0ff', 8, 0.5);
      },
    },
    run: {
      pose: (ph) => RUN.ninja(ph),
      step(A, p) { if (W.footfall(p)) W.emit(A, BLUE_LICK, { x: p.cx - p.facing * 3, y: p.feet, ph: Math.random() * 6 }); },
      back(ctx, F) { for (let i = 1; i < 6; i++) F.A.alpha(ctx, 0.5 - i * 0.08, () => F.A.px(ctx, F.x - F.d * (i * 4 + 2), F.y - 10 + Math.sin(F.t * 30 + i) * 2, 3, 1, i % 2 ? '#3ab0ff' : '#e8f8ff')); },
    },
    dash: {
      name: 'Azure Flash Step', dmg: 10, life: 2,
      spawn(e) { e.pts = []; },
      update(e, dt, g, A) {
        const p = A.p;
        if (p.dashT > 0) { e.pts.push({ x: p.cx, gy: p.feet, t: e.t }); A.hit(e, { x: p.x - 4, y: p.y, w: p.w + 8, h: p.h }, { dir: p.facing, kb: 0.8 }); }
        for (const s of e.pts) if (e.t - s.t < 1.4) A.tick(e, { x: s.x - 3, y: s.gy - 8, w: 6, h: 8 }, 0.45, { mult: 0.25, kb: 0 });
      },
      draw(e, ctx, ox, oy, A) { for (const s of e.pts) { const a = 1 - (e.t - s.t) / 1.4; if (a > 0) A.alpha(ctx, a, () => W.flame(ctx, A, s.x + ox, s.gy + oy, 4 + Math.round(Math.abs(Math.sin(e.t * 12 + s.x)) * 4), e.t + s.x, AZURE)); } },
    },
    guard: {
      name: 'Azure Inferno Wall', sound: 'crackle',
      draw(ctx, { A, x, bot, h, t }) { for (let i = 0; i < 7; i++) { const fh = h * (0.5 + 0.5 * Math.abs(Math.sin(t * 8 + i * 1.3))); W.flame(ctx, A, x - 6 + i * 2, bot, Math.round(fh), t + i, AZURE); } },
      hit(g, x, y, d) { for (let i = 0; i < 16; i++) dot(g, x, y, d * U.lerp(20, 140, Math.random()), U.lerp(-160, -20, Math.random()), i % 3 ? '#3ab0ff' : '#ffffff', { ay: -80 }); },
    },
    m1: {
      name: 'Azure Claw', dmg: 9, cd: 0.34, kind: 'custom', life: 0.3,
      desc: 'Three-hit combo of azure claw swipes. Every third swipe erupts into a pillar of blue fire.',
      spawn(e, g, A) { const p = A.p; p._azure = ((p._azure || 0) + 1) % 3; e.n = p._azure; A.sfx(e.n === 0 ? 'ignite' : 'swing'); },
      update(e, dt, g, A) {
        H.at(e, A, 0);
        if (e.n !== 0) H.melee(e, A, 30 * H.sc(e), 22);
        else { const x = e.x + e.dir * 20, gy = H.floor(A, x); e.px = x; e.gy = gy; A.hit(e, { x: x - 7, y: gy - 40, w: 14, h: 40 }, { mult: 1.8, kb: 0, onHit(t) { if (t.applyStatus) t.applyStatus('launch', 0); } }); }
      },
      draw(e, ctx, ox, oy, A) {
        const k = Math.min(1, e.t / 0.12), x = e.x + ox, y = e.y + oy, d = e.dir;
        if (e.n !== 0) { A.alpha(ctx, 1 - Math.max(0, e.t - 0.12) / 0.18, () => { for (let i = 0; i < 3; i++) { const yy = y - 8 + i * 6 + (e.n === 2 ? -4 : 0); A.line(ctx, x + d * 4, yy - 3, x + d * (6 + 24 * k), yy + 4 * (e.n === 1 ? 1 : -1), i === 1 ? '#ffffff' : e.pal.c, 2); } }); return; }
        const h = 40 * H.sc(e) * Math.min(1, e.t / 0.08), f = 1 - Math.max(0, e.t - 0.15) / 0.15;
        A.alpha(ctx, f, () => { for (let i = 0; i < 4; i++) W.flame(ctx, A, e.px + ox - 4 + i * 2.6, e.gy + oy, Math.round(h * (0.7 + 0.3 * Math.sin(i * 2 + e.t * 30))), e.t + i, AZURE); });
      },
    },
    s: [
      {
        name: 'Starfire Lance', dmg: 30, cd: 5, mp: 6, kind: 'custom', life: 2,
        desc: 'Hurl a lance of azure fire. It pins itself into the first enemy, burns brighter, then detonates.',
        spawn(e, g, A) { H.at(e, A, 8, -2); e.vx = e.dir * 360; A.sfx('whoosh'); },
        update(e, dt, g, A) {
          if (!e.stuck) {
            e.x += e.vx * dt;
            const t = A.targets().find((t) => Phys().rectsOverlap(t.box, { x: e.x - 3, y: e.y - 3, w: 6, h: 6 }));
            if (t) { e.stuck = t; e.st = e.t; e.off = e.x - A.center(t).x; A.damage(e, t, 0.3, 0.2); A.sfx('ignite'); }
            else if (A.solid(e.x, e.y) || e.t > 0.9) { e.stuck = true; e.st = e.t; e.off = 0; }
          } else {
            if (e.stuck !== true && !e.stuck.dead) { const c = A.center(e.stuck); e.x = c.x + e.off; e.y = c.y; }
            if (e.t - e.st > 0.65 && !e.boom) { e.boom = true; A.blast(e, e.x, e.y, 36 * H.sc(e)); A.shake(3, 0.2); e.dead = true; }
          }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, d = e.dir, L = 20 * H.sc(e), glow = e.stuck ? (e.t - e.st) / 0.65 : 0;
          A.glow(ctx, x, y, 4 + glow * 6, e.pal.c, 0.3);
          A.line(ctx, x - d * L, y, x + d * 3, y, e.pal.c, 2); A.line(ctx, x - d * L, y, x + d * 3, y, '#ffffff', 1);
          for (let i = 0; i < 4; i++) A.px(ctx, x - d * (L + 2 + i * 3), y + Math.sin(e.t * 40 + i) * 2, 2, 1, i % 2 ? e.pal.c : e.pal.l);
          A.tri(ctx, x + d * 4, y + 2, 5, 0, '#ffffff');
        },
      },
      {
        name: 'Wildfire Fuse', dmg: 9, cd: 7, mp: 6, kind: 'custom', life: 1.6,
        desc: 'Lines of blue fire race along the ground in both directions... then flare up all at once.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx; e.gy = p.feet; A.sfx('ignite'); },
        update(e, dt, g, A) {
          e.L = Math.min(130 * H.sc(e), e.t * 260);
          if (e.t < 0.7) A.tick(e, { x: e.x - e.L, y: e.gy - 6, w: e.L * 2, h: 6 }, 0.3, { mult: 0.5, kb: 0 });
          if (e.t > 0.7 && !e.flare) { e.flare = true; e.hit.clear(); A.sfx('crash'); A.shake(3, 0.25); }
          if (e.flare && e.t < 1.0) A.hit(e, { x: e.x - e.L, y: e.gy - 30, w: e.L * 2, h: 30 }, { mult: 2.2, kb: 0.6 });
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, gy = e.gy + oy, L = e.L || 0;
          for (const s of [-1, 1]) {
            for (let i = 0; i < L; i += 2) A.px(ctx, x + s * i, gy - 1, 2, 1, (i + Math.floor(e.t * 40)) % 6 < 3 ? e.pal.c : '#e8f8ff');
            A.disc(ctx, x + s * L, gy - 2, 2, '#ffffff');
            if (e.flare) { const k = (e.t - 0.7) / 0.9; A.alpha(ctx, 1 - k, () => { for (let i = 3; i < L; i += 7) W.flame(ctx, A, x + s * i, gy, Math.round((14 + (i * 5) % 12) * Math.min(1, k * 6)), e.t + i, AZURE); }); }
          }
        },
      },
      {
        name: 'Azure Meteor Shower', dmg: 12, cd: 8, mp: 7, kind: 'custom', life: 1.6,
        desc: 'Blue meteors streak down across a wide area, each one cratering the ground. The last one is HUGE.',
        spawn(e, g, A) { H.at(e, A, 0); const ax = A.aim(e, 170); e.cx2 = ax !== null ? ax : e.x + e.dir * 80; e.top = H.sky(A, e.cx2, A.p.y - 20); e.n = 0; A.sfx('orbDash'); },
        update(e, dt, g, A) {
          const total = e.up ? 11 : 8, want = Math.min(total, Math.floor(e.t / 0.11) + 1);
          while (e.n < want) {
            e.n++;
            const big = e.n === total, tx = big ? e.cx2 : e.cx2 + A.rnd(-55, 55), fall = big ? 0.42 : 0.3;
            A.spawn(e, METEOR, { sx: tx - e.dir * (big ? 90 : 60), sy: e.top, tx, gy: A.ground(tx, A.p.y), R: (big ? 7 : 3.5) * H.sc(e), fall, big, life: fall + 0.4 });
          }
        },
      },
      {
        name: 'Starburst Eruption', dmg: 20, cd: 7, mp: 6, kind: 'custom', life: 1,
        desc: 'Crouch, then erupt into a column of azure fire that blasts you upward. Embers rain back down.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx; e.gy = p.feet; p.vy = -280; A.sfx('ignite'); A.shake(3, 0.2); A.hitR(e, e.x, e.gy - 14, 26 * H.sc(e), { kb: 1.4, onHit(t) { if (t.applyStatus) t.applyStatus('launch', 0); } }); for (let i = 0; i < 14; i++) A.spawn(e, BLUE_LICK, { x: e.x + A.rnd(-20, 20), y: e.gy - A.rnd(0, 40), ph: i, life: 0.8 }); },
        update(e, dt, g, A) { if (e.t > 0.4 && !e.rain) { e.rain = true; for (let i = 0; i < 8; i++) A.spawn(e, H.proj((b, ctx, ox, oy, A) => { A.px(ctx, b.x + ox, b.y + oy, 2, 2, b.pal.c); A.px(ctx, b.x + ox, b.y + oy - 2, 1, 2, '#ffffff'); }, { life: 1, r: 3, gravity: 300 }), { x: e.x + A.rnd(-8, 8), y: e.gy - 50, vx: A.rnd(-90, 90), vy: A.rnd(-120, -40), dmg: e.dmg * 0.3 }); } },
        draw(e, ctx, ox, oy, A) { const k = e.t / 0.5; if (k > 1) return; A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 5; i++) W.flame(ctx, A, e.x + ox - 6 + i * 3, e.gy + oy, Math.round((40 + i % 2 * 10) * H.sc(e) * Math.min(1, k * 4)), e.t + i, AZURE); A.ring(ctx, e.x + ox, e.gy + oy - 2, 6 + k * 26, '#ffffff', 2 + k * 4); }); },
      },
      {
        name: "Dragon's Breath", dmg: 14, cd: 8, mp: 7, kind: 'custom', life: 1.6,
        desc: 'A serpentine dragon of azure fire winds forward through every enemy in its path.',
        spawn(e, g, A) { H.at(e, A, 8, -4); e.body = []; e.hx = e.x; e.hy = e.y; A.sfx('ignite'); },
        update(e, dt, g, A) {
          e.hx += e.dir * 190 * dt; e.hy = e.y + Math.sin(e.t * 9) * 12;
          e.body.unshift({ x: e.hx, y: e.hy }); if (e.body.length > 22) e.body.pop();
          A.tickR(e, e.hx, e.hy, 9 * H.sc(e), 0.3, { kb: 0.6 });
          if (A.solid(e.hx + e.dir * 6, e.hy)) e.t = Math.max(e.t, e.life - 0.3);
        },
        draw(e, ctx, ox, oy, A) {
          e.body.forEach((s, i) => { const r = Math.max(1, (6 - i * 0.22) * H.sc(e)); A.alpha(ctx, 1 - i / 26, () => A.disc(ctx, s.x + ox, s.y + oy, Math.round(r), i % 3 ? e.pal.c : '#1a5aff', i < 3 ? '#ffffff' : null)); if (i % 4 === 2) A.px(ctx, s.x + ox, s.y + oy - r - 2, 1, 2, '#e8f8ff'); });
          const h = e.body[0]; if (!h) return; const d = e.dir, x = h.x + ox, y = h.y + oy;
          A.px(ctx, x + d * 2, y - 5, 2, 3, '#e8f8ff'); A.px(ctx, x + d * 5, y - 2, 4, 2, e.pal.c); A.px(ctx, x + d * 5, y + 1, 4, 1, '#1a5aff'); A.px(ctx, x + d * 3, y - 2, 1, 1, '#ffffff');
          W.flame(ctx, A, x + d * 9, y, 3, e.t, AZURE);
        },
      },
    ],
    ult: {
      name: 'Starfall Inferno', dmg: 46,
      desc: 'Summon the literal sun above the battlefield, then hurl it down. The whole area goes up in azure fire.',
      charge: {
        pose: (t, k) => J({ FA: [[10.8, 10], [11.4, 5.6]], BA: [[6, 13.4], [4.4, 15.4]], FL: [[10, 18.6], [10.6, 21.2]], BL: [[7, 19.2], [6, 21.8]] }),
        lift: 30, keepLift: true,
        draw(ctx, x, y, k, t, A, P) {
          const sx = x + 4, sy = y - 26 - k * 10, r = 3 + k * 16;
          for (let i = 0; i < 14; i++) { const a = i * 0.45 + t * 3, d = 40 * (1 - ((t * 1.4 + i / 14) % 1)); A.px(ctx, sx + Math.cos(a) * d, sy + Math.sin(a) * d, 1, 1, '#e8f8ff'); }
          SUN(ctx, A, sx, sy, r, t, P);
        },
      },
      run(A, e0) {
        const p = A.p;
        const throwPose = (t) => t < 0.35 ? J({ FA: [[10.8, 10], [11.4, 5.6]], BA: [[6, 13.4], [4.4, 15.4]], FL: [[10, 18.6], [10.6, 21.2]], BL: [[7, 19.2], [6, 21.8]] }) : J({ lean: 2, FA: [[12, 13], [14.6, 15.4]], BA: [[6, 12.6], [3.8, 11]], FL: [[10.4, 18.8], [11, 21.6]], BL: [[6.6, 19.2], [5.4, 21.6]] });
        W.hold(A, throwPose, 30, 3);
        A.spawn(e0, {
          life: 3.2,
          spawn(e) { const t = A.near(p.cx, p.y, 280); e.tx = t ? A.center(t).x : p.cx + e.dir * 100; e.gy = A.ground(e.tx, p.y + 2); e.sx = p.cx + e.dir * 4; e.sy = Math.max(A.top() + 34, p.y - 80); A.sfx('surge'); },
          update(e, dt, g, A) {
            const h = p.ultHold;
            if (e.t < 0.35) { e.mx = e.sx; e.my = e.sy; e.r = 26 + Math.sin(e.t * 20) * 1.5; }
            else if (e.t < 1.15) { const q = W.easeIn((e.t - 0.35) / 0.8); e.mx = U.lerp(e.sx, e.tx, q); e.my = U.lerp(e.sy, e.gy - 26, q); e.r = 26 + q * 14; A.shake(1 + q * 3, 0.05); }
            else if (!e.boom) {
              e.boom = true; A.blast(e, e.tx, e.gy - 20, 170 * H.sc(e), { dmg: e.dmg * 3 }); A.flash(0.45); A.shake(12, 0.8); A.sfx('boom');
              for (let i = -3; i <= 3; i++) A.spawn(e, BLUE_FIELD, { x: e.tx + i * 34, gy: A.ground(e.tx + i * 34, e.gy - 30), r: 18, life: 2.4 });
            }
            if (h) h.lift = e.t < 1.2 ? 30 : Math.max(0, 30 - (e.t - 1.2) * 70);
            if (e.t > 1.7 && h) W.release(A);
          },
          draw(e, ctx, ox, oy, A) {
            if (!e.boom) {
              const x = e.mx + ox, y = e.my + oy;
              if (e.t > 0.35) for (let i = 1; i < 10; i++) A.alpha(ctx, 0.5 - i * 0.05, () => A.disc(ctx, x - (e.tx - e.sx) * 0.04 * i, y - (e.gy - e.sy) * 0.04 * i, Math.round(e.r * (1 - i * 0.07)), i % 2 ? e.pal.c : '#1a5aff'));
              SUN(ctx, A, x, y, e.r, e.t, e.pal);
            } else {
              const k = (e.t - 1.15) / 2.05, x = e.tx + ox, y = e.gy + oy - 10;
              A.alpha(ctx, Math.max(0, 0.35 - k), () => A.px(ctx, -10, -10, 2000, 2000, '#3ab0ff'));
              A.alpha(ctx, 1 - k, () => { A.disc(ctx, x, y, Math.round(30 + k * 40), e.pal.c, '#ffffff'); A.ring(ctx, x, y, 40 + k * 190, '#ffffff', (40 + k * 190) * 0.45, 2); A.ring(ctx, x, y, 30 + k * 160, e.pal.c, (30 + k * 160) * 0.45, 2); });
            }
          },
        }, {});
      },
    },
  };

  // ================================================================ WATER (abyss)
  const SPLASH = { life: 0.5, update(e, dt) { e.vy += 420 * dt; e.x += e.vx * dt; e.y += e.vy * dt; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => A.px(ctx, e.x + ox, e.y + oy, 1, 2, e.t < 0.15 ? '#ffffff' : e.pal.l)); } };
  const splash = (A, e, x, y, n, sp) => { for (let i = 0; i < n; i++) A.spawn(e, SPLASH, { x, y, vx: A.rnd(-1, 1) * (sp || 90), vy: A.rnd(-200, -60) }); };
  AW.water = {
    color: '#1a5aff', up: '#7affff', status: 'wet', fx: 'droplets', block: ['Abyssal Wall', 'wall'],
    icons: ['trident', 'shark', 'current', 'jelly', 'whale'],
    look: { fx(ctx, F) { for (let i = 0; i < 3; i++) { const a = F.t * 2.2 + i * 2.1, x = F.x + Math.cos(a) * 9, y = F.y - 12 + Math.sin(a) * 4; F.A.px(ctx, x, y, 1, 2, i % 2 ? '#7ad0ff' : '#ffffff'); } } },
    idle: {
      pose: (t) => IDLE.flow(t),
      fx(ctx, F) { const a = F.at('handF'), b = F.at('handB'); for (let i = 0; i <= 12; i++) { const q = i / 12; F.A.px(ctx, U.lerp(b.x, a.x, q), U.lerp(b.y, a.y, q) - Math.sin(q * Math.PI) * 8 + Math.sin(F.t * 4 + q * 6) * 1.5, 1, 1, i % 3 ? '#3a8aff' : '#c8f0ff'); } },
    },
    run: {
      pose: (ph) => RUN.surf(ph),
      back(ctx, F) {
        const x = F.x, y = F.y + 1, d = F.d, A = F.A;
        // the wave you ride
        for (let i = -14; i <= 6; i++) { const h = Math.max(0, 6 - Math.abs(i + 4) * 0.4) + Math.sin(F.t * 12 + i) * 0.8; A.px(ctx, x + i * d, y - h + 2, 1, h + 3, i % 3 ? '#1a5aff' : '#3a8aff'); }
        for (let i = 0; i < 6; i++) A.px(ctx, x - d * (12 + i * 3), y - 3 - Math.abs(Math.sin(F.t * 10 + i)) * 4, 1, 1, '#ffffff');
        A.px(ctx, x - 9, y, 18, 1, '#e8f8ff');
      },
      step(A, p, dt) { if (W.every(p, 'spray', 0.06, dt)) W.emit(A, SPLASH, { x: p.cx - p.facing * 10, y: p.feet, vx: -p.facing * A.rnd(20, 80), vy: A.rnd(-120, -40) }); },
    },
    dash: {
      name: 'Riptide Surge', dmg: 12, life: 1.6,
      spawn(e) { e.pts = []; },
      update(e, dt, g, A) { const p = A.p; if (p.dashT > 0) { e.pts.push({ x: p.cx, gy: p.feet, t: e.t }); A.hit(e, { x: p.x - 6, y: p.y, w: p.w + 12, h: p.h }, { dir: p.facing, kb: 1.6 }); if (!e.sp) { e.sp = true; } } else if (!e.end) { e.end = true; splash(A, e, p.cx, p.y + 12, 14, 120); A.hitR(e, p.cx, p.y + 12, 22, { mult: 0.8, kb: 1 }); } for (const s of e.pts) for (const t of A.targets()) { const c = A.center(t); if (Math.abs(c.x - s.x) < 4 && e.t - s.t < 1.2 && t.applyStatus && !t.status.wet) t.applyStatus('wet', 0); } },
      draw(e, ctx, ox, oy, A) { const p = A.p; if (p.dashT > 0) { for (let i = 0; i < 8; i++) A.alpha(ctx, 0.8, () => A.disc(ctx, p.cx + ox - p.facing * i * 3, p.y + oy + 8 + Math.sin(e.t * 40 + i) * 3, Math.max(1, 6 - i * 0.6), i % 2 ? e.pal.c : '#c8f0ff')); } for (const s of e.pts) { const a = 1 - (e.t - s.t) / 1.2; if (a > 0) A.alpha(ctx, a * 0.7, () => A.px(ctx, s.x + ox - 3, s.gy + oy - 1, 6, 1, e.pal.l)); } },
    },
    guard: {
      name: 'Abyssal Wall', sound: 'splash',
      draw(ctx, { A, x, bot, h, t, P }) {
        for (let yy = 0; yy < h; yy++) { const w = 4 + Math.sin(yy * 0.3 + t * 5) * 1.5; A.px(ctx, x - w / 2, bot - yy, w, 1, (yy + Math.floor(t * 24)) % 5 === 0 ? '#c8f0ff' : yy % 2 ? P.c : '#0e2a8a'); }
        const fy = bot - ((t * 20) % h); A.px(ctx, x - 2, fy, 3, 1, '#ffd34d'); A.px(ctx, x + 1, fy - 1, 1, 1, '#ffd34d');   // a little fish swims by
      },
      hit(g, x, y, d) { for (let i = 0; i < 18; i++) dot(g, x, y, d * U.lerp(0, 120, Math.random()), U.lerp(-170, -30, Math.random()), i % 2 ? '#3a8aff' : '#ffffff', { ay: 420 }); },
    },
    m1: {
      name: 'Riptide Palm', dmg: 9, cd: 0.38, kind: 'custom', life: 0.38,
      desc: 'A palm strike that fires a spinning ring of pressurised water. It plows through enemies and bursts at the end.',
      spawn(e, g, A) { H.at(e, A, 10, -1); e.vx = e.dir * 240; splash(A, e, e.x, e.y, 5, 70); A.sfx('swing', { minGap: 0.04 }); },
      update(e, dt, g, A) { e.x += e.vx * dt; const r = 9 * H.sc(e); if (A.hit(e, { x: e.x - 5, y: e.y - r, w: 10, h: r * 2 }, { kb: 1.2 })) splash(A, e, e.x, e.y, 4, 80); if (A.solid(e.x, e.y)) e.dead = true; },
      onEnd(e, A) { splash(A, e, e.x, e.y, 8, 100); A.spawn(e, W.SHOCK, { x: e.x, y: e.y, r: 12 * H.sc(e), flat: 1.4, dmg: 0, life: 0.25 }); },
      draw(e, ctx, ox, oy, A) {
        const x = e.x + ox, y = e.y + oy, r = 9 * H.sc(e), rx = r * 0.45, d = e.dir;
        A.alpha(ctx, A.fade(e, 0.03, 0.08), () => {
          A.alpha(ctx, 0.35, () => { for (let yy = -r; yy <= r; yy++) { const w = Math.sqrt(Math.max(0, 1 - (yy / r) * (yy / r))) * rx; A.px(ctx, x - w, y + yy, w * 2 + 1, 1, e.pal.c); } });
          for (let i = 1; i < 5; i++) A.alpha(ctx, 0.5 - i * 0.1, () => A.ring(ctx, x - d * i * 5, y, Math.max(1, rx - i * 0.5), e.pal.l, Math.max(1, r - i)));
          for (let w = 0; w < 2; w++) A.ring(ctx, x, y, rx - w, w ? e.pal.c : '#c8f0ff', r - w);
          for (let i = 0; i < 6; i++) { const a = e.t * 28 + i * 1.05; A.px(ctx, x + Math.cos(a) * rx, y + Math.sin(a) * r, 2, 1, '#ffffff'); }
        });
      },
    },
    s: [
      {
        name: 'Trident Hurl', dmg: 24, cd: 5, mp: 6, kind: 'custom', life: 1.4,
        desc: 'Throw a trident of solid water. It skewers everything in a line and bursts into a towering geyser where it lands.',
        spawn(e, g, A) { H.at(e, A, 8, -3); e.vx = e.dir * 330; A.sfx('whoosh'); },
        update(e, dt, g, A) {
          const r = H.fly(e, dt, A, { r: 5, pierce: true, kb: 0.6 });
          if (r !== 'wall' && e.t <= 0.8) return;
          const gy = A.ground(e.x - e.dir * 4, e.y), w = 11 * H.sc(e), GH = 56 * H.sc(e);
          A.spawn(e, {
            life: 0.8,
            spawn(s) { s.gy = gy; A.sfx('crash'); A.shake(3, 0.2); A.spawn(s, W.SHOCK, { x: s.x, y: gy - 2, r: 26 * H.sc(s), flat: 0.4, dmg: 0 }); splash(A, s, s.x, gy - 4, 14, 130); if (ERX.ElementSfx) ERX.ElementSfx.boom(s.el, 30, true); },
            update(s, dt, g, A) { if (s.t < 0.45) A.hit(s, { x: s.x - w, y: s.gy - GH, w: w * 2, h: GH }, { kb: 0, onHit(t) { if (t.applyStatus) t.applyStatus('launch', 0); } }); if (s.t < 0.5 && Math.random() < dt * 30) splash(A, s, s.x + A.rnd(-w, w), s.gy - A.rnd(10, GH), 1, 60); },
            draw(s, ctx, ox, oy, A) {
              const h = GH * Math.min(1, s.t / 0.08), f = 1 - Math.max(0, s.t - 0.45) / 0.35, x = s.x + ox, gy2 = s.gy + oy;
              A.alpha(ctx, f, () => {
                for (let yy = 0; yy < h; yy++) { const ww = w * (0.55 + 0.45 * (yy / GH)) + Math.sin(yy * 0.4 + s.t * 30) * 1.5; A.px(ctx, x - ww, gy2 - yy, ww * 2, 1, (yy + Math.floor(s.t * 60)) % 6 < 2 ? s.pal.l : s.pal.c); }
                A.px(ctx, x - 1, gy2 - h, 3, h, '#e8f8ff');
                for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.4, rr = 6 + Math.sin(s.t * 20 + i) * 2; A.disc(ctx, x + Math.cos(a) * rr * 1.5, gy2 - h + Math.sin(a) * rr * 0.8, 2, i % 2 ? s.pal.l : '#ffffff'); }
              });
            },
          }, { x: e.x - e.dir * 4 });
          e.dead = true;
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, d = e.dir, L = 26 * H.sc(e);
          W.beam(ctx, A, x - d * L, y, x, y, 2, e.pal.c, '#c8f0ff');
          for (const dy of [-5, 0, 5]) { W.beam(ctx, A, x, y + dy, x + d * 8, y + dy, 1, e.pal.c, '#c8f0ff'); A.px(ctx, x + d * 9, y + dy, 2, 1, '#ffffff'); }
          W.beam(ctx, A, x, y - 5, x, y + 5, 1, e.pal.c, '#c8f0ff');
          for (let i = 0; i < 5; i++) A.alpha(ctx, 0.7 - i * 0.12, () => A.px(ctx, x - d * (L + 3 + i * 4), y + Math.sin(e.t * 40 + i) * 2, 3, 1, i % 2 ? e.pal.c : '#c8f0ff'));
        },
      },
      {
        name: 'Shark Fin', dmg: 26, cd: 6, mp: 6, kind: 'custom', life: 1.5,
        desc: 'A fin of water cuts along the ground towards the nearest enemy... then a shark bursts out and bites everything around it.',
        spawn(e, g, A) { H.at(e, A, 10); e.gy = H.floor(A, e.x); e.tg = A.near(e.x, e.y, 200); e.mv = e.dir; A.sfx('whoosh'); },
        update(e, dt, g, A) {
          if (e.bite) return;
          const tx = e.tg && !e.tg.dead ? A.center(e.tg).x : e.x + e.dir * 200;
          e.mv = Math.sign(tx - e.x) || e.mv; e.x += e.mv * 210 * dt; e.gy = A.ground(e.x, e.gy - 12);
          if (Math.random() < dt * 25) splash(A, e, e.x - e.mv * 4, e.gy - 2, 1, 50);
          if (Math.abs(tx - e.x) < 6 || e.t > 0.9) {
            const s = H.sc(e);
            e.bite = e.t; A.sfx('crash'); A.shake(4, 0.25);
            A.hit(e, { x: e.x - 20 * s, y: e.gy - 40 * s, w: 40 * s, h: 40 * s }, { kb: 1.2, onHit(t) { if (t.applyStatus) t.applyStatus('launch', 0); } });
            A.spawn(e, W.SHOCK, { x: e.x, y: e.gy - 3, r: 26 * s, flat: 0.45, dmg: 0 }); splash(A, e, e.x, e.gy - 2, 20, 150);
          }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, gy = e.gy + oy, s = H.sc(e), d = e.mv;
          if (!e.bite) { A.tri(ctx, x, gy, 12 * s, 14 * s, e.pal.c, '#c8f0ff'); A.px(ctx, x - 1, gy - 14 * s, 2, 3, '#ffffff'); for (let i = 1; i < 9; i++) A.alpha(ctx, 1 - i / 9, () => A.px(ctx, x - d * i * 4 - 1, gy - 1 - Math.abs(Math.sin(e.t * 20 + i)) * 2, 3, 2, i % 2 ? '#c8f0ff' : '#ffffff')); return; }
          const k = (e.t - e.bite) / 0.55;
          if (k > 1) return;
          const y = gy - 6 - Math.sin(Math.min(1, k) * Math.PI) * 30 * s, R = Math.round(10 * s), jaw = Math.max(0, Math.sin(Math.min(1, k * 1.6) * Math.PI)) * 5 * s, body = d > 0 ? x - R * 2.2 : x;
          A.alpha(ctx, 1 - Math.max(0, k - 0.65) / 0.35, () => {
            A.px(ctx, body, y - R * 0.5, R * 2.2, R, e.pal.c);
            A.px(ctx, body, y + R * 0.1, R * 2.2, R * 0.4, '#e8f8ff');
            A.disc(ctx, x, y, R, e.pal.c, '#3a8aff');
            A.tri(ctx, x - d * R * 0.8, y - R * 0.45, 9 * s, 9 * s, e.pal.c);
            A.tri(ctx, x - d * R * 2.6, y + 7 * s, 9 * s, 14 * s, e.pal.c, '#3a8aff');
            A.px(ctx, x + d * R * 0.35, y - R * 0.45, 2, 2, '#05030a');
            A.px(ctx, d > 0 ? x : x - R - 1, y - 1 - jaw * 0.5, R + 1, jaw + 2, '#0e1a4a');
            for (let i = 0; i < 4; i++) { const tx = x + d * (R * 0.2 + i * 2.5); A.px(ctx, tx, y - 1 - jaw * 0.5, 1, 2, '#ffffff'); A.px(ctx, tx, y + jaw * 0.5, 1, 2, '#ffffff'); }
          });
        },
      },
      {
        name: 'Abyssal Current', dmg: 6, cd: 8, mp: 6, kind: 'custom', life: 2.5,
        desc: 'Open a raging current ahead that drags enemies along and slams them into walls.',
        spawn(e, g, A) { H.at(e, A, 50); e.gy = H.floor(A, e.x); A.sfx('whoosh'); },
        update(e, dt, g, A) { const R = 60 * H.sc(e); for (const t of A.targets()) { if (t.tutorial) continue; const c = A.center(t); if (Math.abs(c.x - e.x) < R && Math.abs(c.y - (e.gy - 12)) < 24) { t.vx = U.approach(t.vx, e.dir * 220, 6, dt); if (A.solid(c.x + e.dir * (t.box.w / 2 + 3), c.y) && !t._slam) { t._slam = true; A.damage(e, t, 3, 0.5); A.sfx('crash', { minGap: 0.1 }); A.shake(3, 0.2); A.spawn(e, W.SHOCK, { x: c.x + e.dir * 6, y: c.y, r: 22, flat: 1.3, dmg: 0 }); splash(A, e, c.x, c.y, 10, 120); } } } A.tick(e, { x: e.x - R, y: e.gy - 26, w: R * 2, h: 26 }, 0.4, { kb: 0 }); },
        onEnd(e, A) { for (const t of A.targets()) delete t._slam; },
        draw(e, ctx, ox, oy, A) {
          const R = 60 * H.sc(e), x = e.x + ox, gy = e.gy + oy, f = A.fade(e, 0.2, 0.4), d = e.dir, top = (xx) => 18 + Math.sin(xx * 0.08 - e.t * 9 * d) * 4 + Math.sin(xx * 0.21 + e.t * 5) * 2;
          A.alpha(ctx, f * 0.35, () => { for (let xx = -R; xx < R; xx += 2) { const h = top(xx); A.px(ctx, x + xx, gy - h, 2, h, e.pal.c); } });
          A.alpha(ctx, f, () => {
            for (let xx = -R; xx < R; xx += 2) A.px(ctx, x + xx, gy - top(xx), 2, 1, (xx + Math.floor(e.t * 40)) % 8 < 3 ? '#ffffff' : '#c8f0ff');
            for (let i = 0; i < 22; i++) { const xx = ((i * 23 + e.t * 300 * d) % (R * 2) + R * 2) % (R * 2) - R, yy = gy - 3 - (i * 7) % 16; A.line(ctx, x + xx, yy, x + xx + d * 10, yy + Math.sin(i + e.t * 9), i % 3 ? e.pal.l : '#ffffff'); }
            for (let i = 0; i < 8; i++) { const yy = gy - ((e.t * 30 + i * 11) % 18), xx = ((i * 37 + e.t * 120 * d) % (R * 2) + R * 2) % (R * 2) - R; A.ring(ctx, x + xx, yy, 1, '#e8f8ff'); }
          });
        },
      },
      {
        name: 'Jellyfish Swarm', dmg: 9, cd: 8, mp: 6, kind: 'custom', life: 4,
        desc: 'Three glowing jellyfish drift towards enemies and sting them with soaking shocks.',
        spawn(e, g, A) { H.at(e, A, 8, -6); e.jj = [0, 1, 2].concat(e.up ? [3] : []).map((i) => ({ x: e.x, y: e.y - i * 4, ph: i * 2, st: 0.4 + i * 0.2 })); A.sfx('pop'); },
        update(e, dt, g, A) { for (const j of e.jj) { const t = A.near(j.x, j.y, 200); if (t) { const c = A.center(t); j.x = U.approach(j.x, c.x, 1.4, dt); j.y = U.approach(j.y, c.y - 6 + Math.sin(e.t * 3 + j.ph) * 6, 1.4, dt); } else j.y += Math.sin(e.t * 2 + j.ph) * 10 * dt; j.st -= dt; if (j.st <= 0 && t && Math.hypot(A.center(t).x - j.x, A.center(t).y - j.y) < 18) { j.st = 0.7; j.zap = 0.12; A.damage(e, t, 1, 0); if (t.applyStatus) { t.applyStatus('wet', 0); t.applyStatus('shock', 0); } A.sfx('zap', { minGap: 0.05 }); } j.zap = Math.max(0, (j.zap || 0) - dt); } },
        draw(e, ctx, ox, oy, A) { A.alpha(ctx, A.fade(e, 0.2, 0.4), () => { for (const j of e.jj) { const x = j.x + ox, y = j.y + oy, pulse = Math.sin(e.t * 6 + j.ph); A.glow(ctx, x, y, 6, '#ff7ad8', 0.15 + (j.zap ? 0.3 : 0)); for (let yy = -3; yy <= 0; yy++) { const w = Math.round(Math.sqrt(16 - yy * yy) * (1 + pulse * 0.1)); A.px(ctx, x - w, y + yy, w * 2, 1, yy === -3 ? '#ffd0f0' : '#ff9ad0'); } for (let i = 0; i < 4; i++) A.px(ctx, x - 3 + i * 2, y + 1 + Math.abs(Math.sin(e.t * 5 + i)) * 2, 1, 4, '#ffb0e0'); } }); },
      },
      {
        name: 'Whale Tail', dmg: 34, cd: 9, mp: 8, kind: 'custom', life: 1.4,
        desc: 'A spectral whale swims through the air above you and slams its tail down on the enemy, flooding the ground around it.',
        spawn(e, g, A) { H.at(e, A, 0); const ax = A.aim(e, 160); e.tx = ax !== null ? ax : e.x + e.dir * 70; e.gy = H.floor(A, e.tx); e.top = H.sky(A, e.tx, A.p.y - 10) + 10; A.sfx('surge'); },
        update(e, dt, g, A) { if (e.t > 0.75 && !e.slam) { e.slam = true; const s = H.sc(e); A.hit(e, { x: e.tx - 32 * s, y: e.gy - 60, w: 64 * s, h: 60 }, { kb: 1.5 }); W.boom(A, e, e.tx, e.gy - 6, 30 * s, { mult: 0.5, flat: 0.5 }); A.sfx('crash'); A.shake(6, 0.35); splash(A, e, e.tx, e.gy - 2, 26, 170); } },
        draw(e, ctx, ox, oy, A) {
          const s = H.sc(e), q = Math.min(1, e.t / 0.75), d = e.dir, L = 56 * s, wx = e.tx - d * (110 - q * 80) * s + ox, wy = e.top + 6 + oy + Math.sin(q * Math.PI) * 10;
          A.alpha(ctx, (e.slam ? 1 - (e.t - 0.75) / 0.65 : Math.min(1, e.t * 4)) * 0.85, () => {
            for (let i = 0; i < L; i++) { const q2 = i / L, r = Math.sin(Math.pow(q2, 0.7) * Math.PI) * 11 * s + 1; A.px(ctx, wx - d * i, wy - r * 0.7, 1, r * 1.5, (i + Math.floor(e.t * 20)) % 9 ? '#2a6aff' : '#7ad0ff'); A.px(ctx, wx - d * i, wy + r * 0.8 - 1, 1, 1, '#c8f0ff'); }
            A.px(ctx, wx - d * 8 * s, wy - 4, 2, 2, '#ffffff');
            A.tri(ctx, wx - d * 20 * s, wy + 12 * s, 7 * s, 6 * s, '#3a8aff');
            const tx = wx - d * L, ty = e.slam ? e.gy + oy - 10 : wy + Math.sin(e.t * 6) * 5;
            W.beam(ctx, A, tx, wy, tx - d * 4, ty, 3 * s, '#3a8aff', '#7ad0ff');
            for (let i = -12; i <= 12; i++) A.px(ctx, tx - d * 4 + i * s, ty + Math.abs(i) * 0.35 * s - 2, 1, 4, Math.abs(i) > 9 ? '#c8f0ff' : '#3a8aff');
          });
          if (e.slam) { const k = (e.t - 0.75) / 0.65; A.alpha(ctx, 1 - k, () => { for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) A.tri(ctx, e.tx + ox + sd * (10 + k * 70 * s + i * 4), e.gy + oy, 8, 6 + (2 - i) * 3, i ? '#3a8aff' : '#c8f0ff'); }); }
        },
      },
    ],
    ult: {
      name: "Leviathan's Wrath", dmg: 18,
      desc: 'An ocean comes crashing down from above. A spectral Leviathan tears out of it, then a colossal tsunami sweeps everything away.',
      charge: {
        pose: (t, k) => J({ FA: [[11, 10.6], [12.4, 7]], BA: [[5.4, 10.6], [4, 7]], bob: 1 }),
        lift: 6,
        draw(ctx, x, y, k, t, A, P) {
          const sy = y - 40, w = 10 + k * 60;
          A.alpha(ctx, 0.85, () => { for (let i = -w; i <= w; i += 2) { const h = 6 + k * 12 + Math.sin(i * 0.2 + t * 6) * 3; A.px(ctx, x + i, sy - h / 2, 2, h, (i / 2) % 4 ? P.c : '#0e2a8a'); } });
          for (let i = 0; i < 10; i++) A.px(ctx, x - w + ((i * 37 + t * 60) % (w * 2)), sy + 6 + ((t * 40 + i * 9) % 30), 1, 3, '#c8f0ff');
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 4.2,
          spawn(e) { e.x = p.cx; e.top = A.top(); e.gy = p.feet; e.lev = []; e.spray = []; A.sfx('surge'); A.sfx('rumble', { dur: 3.6 }); },
          update(e, dt, g, A) {
            const splash = (x, y, n, sp) => { for (let i = 0; i < n; i++) e.spray.push({ x, y, vx: A.rnd(-1, 1) * sp, vy: -A.rnd(0.3, 1) * sp * 1.4, t: 0, s: Math.random() < 0.3 ? 2 : 1 }); };
            for (const s of e.spray) { s.t += dt; s.vy += 500 * dt; s.x += s.vx * dt; s.y += s.vy * dt; }
            e.spray = e.spray.filter((s) => s.t < 1.4);
            // 1) the ocean falls out of the sky
            if (e.t > 0.5 && !e.fall) { e.fall = true; A.hitR(e, e.x + e.dir * 60, e.gy - 40, 170, { mult: 1.5, kb: 0.5, onHit(t) { if (t.applyStatus) t.applyStatus('wet', 0); } }); A.sfx('crash'); A.shake(10, 0.6); e.hit.clear(); for (let i = -6; i <= 6; i++) splash(e.x + i * 30, e.gy - 2, 6, 160); }
            // 2) the Leviathan breaches: out of the water, one huge arc over the battlefield, and back under
            if (e.t > 0.9 && e.t < 2.3) {
              const q = (e.t - 0.9) / 1.4;
              e.hx = U.lerp(p.cx - e.dir * 160, p.cx + e.dir * 360, q); e.hy = e.gy + 10 - Math.sin(q * Math.PI) * 110;
              e.lev.unshift({ x: e.hx, y: e.hy }); if (e.lev.length > 56) e.lev.pop();
              A.tickR(e, e.hx, e.hy, 30, 0.2, { mult: 0.9, kb: 0.8 });
              if (!e.breach) { e.breach = true; splash(e.hx, e.gy, 30, 220); A.sfx('crash'); }
              if (!e.dive && q > 0.94) { e.dive = true; splash(e.hx, e.gy, 30, 220); A.shake(8, 0.4); A.sfx('crash'); }
            }
            // 3) the tsunami
            if (e.t > 2.3) {
              if (!e.wave) { e.wave = true; e.hit.clear(); e.wx = p.cx - e.dir * 60; A.sfx('crash'); A.sfx('rumble', { dur: 1.5 }); }
              e.wx += e.dir * 320 * dt; A.hit(e, { x: e.dir > 0 ? e.wx - 70 : e.wx, y: e.gy - 150, w: 70, h: 150 }, { mult: 3.4, kb: 3, dir: e.dir });
              if (Math.random() < dt * 30) splash(e.wx, e.gy - 140, 3, 120);
              A.shake(3, 0.05);
            }
          },
          draw(e, ctx, ox, oy, A) {
            const gy = e.gy + oy, d = e.dir;
            // the ocean coming down
            if (e.t < 1.2) { const q = Math.min(1, e.t / 0.5), y = U.lerp(e.top + oy - 80, gy - 50, q * q); A.alpha(ctx, e.fall ? Math.max(0, 1 - (e.t - 0.5) / 0.7) : 0.92, () => { for (let i = -260; i < 260; i += 3) A.px(ctx, e.x + ox + i, y - 40 + Math.sin(i * 0.1 + e.t * 8) * 5, 3, 80, (i / 3) % 5 ? e.pal.c : '#0e2a8a'); for (let i = -260; i < 260; i += 7) A.px(ctx, e.x + ox + i, y - 42 + Math.sin(i * 0.1 + e.t * 8) * 5, 4, 2, '#c8f0ff'); }); }
            // the Leviathan: a long body with fins all down its back, and a head that is mostly jaws
            for (let i = e.lev.length - 1; i >= 0; i--) { const s = e.lev[i], r = Math.max(3, 26 - i * 0.42); A.alpha(ctx, 0.88, () => A.disc(ctx, s.x + ox, s.y + oy, Math.round(r), i % 4 ? '#2a6aff' : '#5ab0ff', '#9ad8ff')); if (i % 4 === 0 && i > 2) A.tri(ctx, s.x + ox, s.y + oy - r + 2, 8, Math.max(2, 10 - i * 0.12), '#7ad0ff', '#ffffff'); }
            if (e.lev[0] && e.t < 2.3) {
              const h = e.lev[0], x = h.x + ox, y = h.y + oy, open = 6 + Math.sin(e.t * 12) * 4;
              for (let i = 0; i < 30; i++) { const w = Math.max(1, 14 - i * 0.45); A.px(ctx, x + d * (10 + i), y - open - w, 1, w, i % 5 ? '#3a8aff' : '#1a4aaa'); A.px(ctx, x + d * (10 + i), y + open, 1, w * 0.8, i % 5 ? '#2a6aff' : '#1a4aaa'); if (i % 3 === 0) { A.px(ctx, x + d * (10 + i), y - open, 1, 3, '#ffffff'); A.px(ctx, x + d * (10 + i), y + open - 2, 1, 2, '#ffffff'); } }
              A.disc(ctx, x + d * 14, y - open - 8, 3, '#ff3a4a', '#ffffff');
            }
            // the tsunami, with its crest curling over
            if (e.wave) {
              const x = e.wx + ox;
              for (let i = 0; i < 90; i++) { const h = 150 * Math.sin(Math.min(1, i / 70) * Math.PI / 2); A.px(ctx, x - d * i, gy - h, 1, h, i % 6 ? e.pal.c : '#0e2a8a'); }
              for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 1.2; A.px(ctx, x + d * Math.sin(a) * 18 - d * 6, gy - 132 - Math.cos(a) * 18, 3, 3, i % 3 ? '#e8f8ff' : '#ffffff'); }
              for (let i = 0; i < 24; i++) A.px(ctx, x - d * 4 + Math.sin(e.t * 20 + i) * 5, gy - 150 + i * 6, 3, 2, '#ffffff');
            }
            for (const s of e.spray) A.alpha(ctx, 1 - s.t / 1.4, () => A.px(ctx, s.x + ox, s.y + oy, s.s, s.s, s.s > 1 ? '#ffffff' : '#9ad8ff'));
          },
        }, {});
      },
    },
  };

  // ================================================================= WIND (jade)
  const GUST = { life: 0.4, update(e, dt) { e.x += e.vx * dt; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => A.px(ctx, e.x + ox, e.y + oy, e.len || 6, 1, e.c || e.pal.l)); } };
  AW.wind = {
    color: '#2affc8', up: '#ffffff', status: 'launch', fx: 'gusts', block: ['Gale Shroud', 'swirl'],
    icons: ['splitter', 'pressure', 'feathers', 'downburst', 'airPrison'],
    look: { fx(ctx, F) { for (let i = 0; i < 3; i++) { const y = F.y - 6 - i * 7, x = F.x - F.d * (8 + ((F.t * 40 + i * 9) % 12)); F.A.alpha(ctx, 0.6, () => F.A.px(ctx, x, y, 4, 1, '#c8fff0')); } } },
    idle: {
      pose: (t) => Object.assign(IDLE.crossed(t, { lean: 0 }), { lift: 3 + Math.sin(t * 2) * 1.5 }),
      back(ctx, F) { const A = F.A; for (let i = 0; i < 16; i++) { const a = F.t * 4 + i * 0.4; A.px(ctx, F.x + Math.cos(a) * 9, F.ground - 1 + Math.sin(a) * 1.5, 1, 1, i % 3 ? '#2affc8' : '#ffffff'); } },
    },
    run: {
      pose: (ph) => RUN.airplane(ph),
      step(A, p, dt) { if (W.every(p, 'gust', 0.05, dt)) W.emit(A, GUST, { x: p.cx - p.facing * 6, y: p.y + A.rnd(2, 20), vx: -p.facing * 80, len: A.rnd(4, 9) }); },
    },
    dash: {
      name: 'Zephyr Slip', dmg: 9, life: 1.2,
      spawn(e) { e.blades = []; },
      update(e, dt, g, A) { const p = A.p; if (p.dashT > 0) { e.bt = (e.bt || 0) - dt; if (e.bt <= 0) { e.bt = 0.04; e.blades.push({ x: p.cx, y: p.y + 10, t: e.t }); } A.hit(e, { x: p.x - 4, y: p.y, w: p.w + 8, h: p.h }, { dir: p.facing, kb: 0.5 }); } for (const b of e.blades) if (e.t - b.t > 0.15 && e.t - b.t < 0.5) A.tickR(e, b.x, b.y, 8, 0.5, { mult: 0.6, kb: 0.3 }); },
      draw(e, ctx, ox, oy, A) { for (const b of e.blades) { const k = (e.t - b.t) / 0.5; if (k > 1) continue; A.alpha(ctx, 1 - k, () => { const a = e.t * 20 + b.x; for (let i = 0; i < 2; i++) A.arc(ctx, b.x + ox, b.y + oy, 6 + k * 4, i ? 1 : -1, e.pal.c, 1, a, a + 1.2); }); } },
    },
    guard: {
      name: 'Gale Shroud', sound: 'whoosh',
      draw(ctx, { A, x, bot, h, t }) { for (let i = 0; i < 40; i++) { const a = t * 14 + i * 0.5, yy = bot - (i / 40) * h; A.px(ctx, x + Math.cos(a) * (3 + (i % 3)), yy, 2, 1, i % 4 ? '#2affc8' : '#ffffff'); } },
      hit(g, x, y, d) { for (let i = 0; i < 12; i++) g.fx.add({ x, y: y - 10 + i * 2, vx: d * U.lerp(120, 240, Math.random()), vy: 0, life: 0.3, color: i % 2 ? '#2affc8' : '#ffffff', len: 6 }); },
    },
    m1: {
      name: 'Vacuum Palm', dmg: 8, cd: 0.36, kind: 'custom', life: 0.6,
      desc: 'Thrust your palm and fire a bullet of compressed air that bends the light around it, then bursts on impact.',
      spawn(e, g, A) { H.at(e, A, 10, -1); e.vx = e.dir * 320; A.sfx('whoosh', { minGap: 0.04 }); for (let i = 0; i < 6; i++) A.spawn(e, GUST, { x: e.x, y: e.y + A.rnd(-6, 6), vx: e.dir * A.rnd(60, 160), len: A.rnd(4, 8), c: i % 2 ? '#ffffff' : e.pal.l, dmg: 0 }); },
      update(e, dt, g, A) { const r = H.fly(e, dt, A, { r: 6, kb: 1.4 }); if (r) { A.hitR(e, e.x, e.y, 16 * H.sc(e), { mult: 0.5, kb: 1 }); A.spawn(e, W.SHOCK, { x: e.x, y: e.y, r: 16 * H.sc(e), dmg: 0, life: 0.3 }); A.puff(e, e.x, e.y, 6); e.dead = true; } },
      draw(e, ctx, ox, oy, A) {
        const x = e.x + ox, y = e.y + oy, s = H.sc(e), r = (5 + Math.sin(e.t * 50) * 0.8) * s, d = e.dir;
        for (let i = 1; i < 6; i++) A.alpha(ctx, 0.55 - i * 0.08, () => A.px(ctx, x - d * (i * 6 + 4) - (d > 0 ? 6 : 0), y - r + ((i * 5) % Math.max(1, Math.round(r * 2))), 6, 1, i % 2 ? '#ffffff' : e.pal.l));
        A.alpha(ctx, 0.3, () => A.disc(ctx, x, y, Math.round(r + 2), e.pal.c));
        A.ring(ctx, x, y, r, e.pal.c, r * 1.15); A.ring(ctx, x, y, r - 1, e.pal.l, (r - 1) * 1.15); A.ring(ctx, x, y, Math.max(1, r - 3), '#ffffff', Math.max(1, r - 2));
        A.disc(ctx, x, y, Math.max(1, Math.round(r * 0.35)), '#ffffff');
      },
    },
    s: [
      {
        name: 'Sky Splitter', dmg: 20, cd: 5, mp: 6, kind: 'custom', life: 0.6,
        desc: 'A huge vertical crescent of wind sweeps up, then crashes down in front of you and blasts outward along the ground.',
        spawn(e, g, A) { H.at(e, A, 26); e.gy = H.floor(A, e.x); A.sfx('swing'); },
        update(e, dt, g, A) { const h = 70 * H.sc(e), w = 32 * H.sc(e); A.hit(e, { x: e.x - w / 2, y: e.gy - h, w, h }, { kb: 1, onHit(t) { if (t.applyStatus) t.applyStatus('launch', 0); } }); if (e.t > 0.3 && !e.down) { e.down = true; e.hit.clear(); A.sfx('swing'); W.boom(A, e, e.x, e.gy - 4, 30 * H.sc(e), { mult: 0.5, flat: 0.4 }); } if (e.down) A.hit(e, { x: e.x - w / 2, y: e.gy - h, w, h }, { kb: 1.4, mult: 0.8 }); },
        draw(e, ctx, ox, oy, A) {
          const h = 70 * H.sc(e), x = e.x + ox, gy = e.gy + oy, up = e.t < 0.3, k = up ? e.t / 0.3 : (e.t - 0.3) / 0.3, d = e.dir;
          A.alpha(ctx, 1 - (up ? 0 : k * 0.85), () => {
            const reach = up ? k : 1, n = 40;
            for (let i = 0; i <= n; i++) {
              const q = i / n;
              if (q > reach) break;
              const yy = gy - q * h, bulge = Math.sin(q * Math.PI) * 14 * H.sc(e) * (up ? 1 : 1 - k * 0.6), th = Math.max(1, Math.round(Math.sin(q * Math.PI) * 7)), xx = x + d * bulge;
              A.px(ctx, d > 0 ? xx - th : xx, yy, th, 2, e.pal.c); A.px(ctx, d > 0 ? xx : xx - 1, yy, 1, 2, '#ffffff');
            }
            if (!up) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) A.px(ctx, x + s * (8 + k * 46 + i * 5) - 3, gy - 3 - i * 2, 6, 1, i ? e.pal.c : '#ffffff');
          });
        },
      },
      {
        name: 'Pressure Bomb', dmg: 28, cd: 7, mp: 6, kind: 'custom', life: 1.2,
        desc: 'Squeeze the air into a tiny sphere. It implodes, sucking enemies in, then BLASTS them away.',
        spawn(e, g, A) { H.at(e, A, 40, -4); const ax = A.aim(e, 120); if (ax !== null) e.x = ax; A.sfx('hover'); },
        update(e, dt, g, A) { if (e.t < 0.7) for (const o of H.nearby(A, e.x, e.y, 70)) if (!o.t.tutorial) o.t.vx = U.approach(o.t.vx, Math.sign(e.x - o.c.x) * 140, 6, dt); if (e.t > 0.7 && !e.boom) { e.boom = true; A.hitR(e, e.x, e.y, 46 * H.sc(e), { kb: 3 }); A.sfx('shockwave'); A.shake(4, 0.3); } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy; if (!e.boom) { const k = e.t / 0.7; for (let i = 0; i < 3; i++) A.ring(ctx, x, y, 30 * (1 - ((k + i / 3) % 1)) + 2, i % 2 ? e.pal.c : '#ffffff'); A.disc(ctx, x, y, Math.round(2 + k * 2), '#ffffff'); return; } const k = (e.t - 0.7) / 0.5; A.alpha(ctx, 1 - k, () => { A.ring(ctx, x, y, 8 + k * 46, e.pal.c, 8 + k * 46, 2); for (let i = 0; i < 12; i++) { const a = i * 0.52; A.line(ctx, x + Math.cos(a) * (6 + k * 30), y + Math.sin(a) * (6 + k * 30), x + Math.cos(a) * (14 + k * 46), y + Math.sin(a) * (14 + k * 46), '#ffffff'); } }); },
      },
      {
        name: 'Tempest Feathers', dmg: 7, cd: 5, mp: 5, kind: 'custom', life: 0.01,
        desc: 'A wide fan of razor-sharp feathers made of wind, curving towards your enemies.',
        spawn(e, g, A) {
          H.at(e, A, 6, -3); A.sfx('whoosh');
          const n = e.up ? 11 : 8;
          for (let i = 0; i < n; i++) {
            const a = U.lerp(-0.8, 0.8, i / (n - 1));
            A.spawn(e, H.proj((b, ctx, ox, oy, A) => {
              const x = b.x + ox, y = b.y + oy, an = Math.atan2(b.vy, b.vx), c = Math.cos(an), s = Math.sin(an);
              W.beam(ctx, A, x - c * 7, y - s * 7, x + c * 4, y + s * 4, 1, b.pal.c, b.pal.l);
              for (let k = 1; k < 6; k++) { const bx = x - c * k * 1.5, by = y - s * k * 1.5, sp = 1.5 + k * 0.45; A.px(ctx, bx - s * sp, by + c * sp, 1, 1, k % 2 ? '#ffffff' : b.pal.l); A.px(ctx, bx + s * sp, by - c * sp, 1, 1, k % 2 ? b.pal.l : '#ffffff'); }
            }, { life: 1, r: 4, homing: 4.5, onHit(b, A) { A.spawn(b, W.SHOCK, { x: b.x, y: b.y, r: 9, dmg: 0, life: 0.22 }); } }), { vx: Math.cos(a) * 270 * e.dir, vy: Math.sin(a) * 270 });
          }
        },
      },
      {
        name: 'Downburst', dmg: 24, cd: 7, mp: 6, kind: 'custom', life: 0.8,
        desc: 'A column of air hammers straight down from the sky, crushing enemies and blasting everything around it aside.',
        spawn(e, g, A) { H.at(e, A, 0); const ax = A.aim(e, 140); e.tx = ax !== null ? ax : e.x + e.dir * 60; e.gy = H.floor(A, e.tx); e.top = H.sky(A, e.tx, e.gy - 8); A.sfx('whoosh'); },
        update(e, dt, g, A) { if (e.t > 0.2 && !e.hitd) { e.hitd = true; A.hit(e, { x: e.tx - 16, y: e.top, w: 32, h: e.gy - e.top }, { kb: 0.2, onHit(t) { if (!t.tutorial) t.vy = 400; } }); W.boom(A, e, e.tx, e.gy - 6, 50 * H.sc(e), { mult: 0.5, flat: 0.4 }); A.sfx('shockwave'); A.g.dust(e.tx, e.gy, 10); } },
        draw(e, ctx, ox, oy, A) {
          const x = e.tx + ox, gy = e.gy + oy, top = e.top + oy, k = e.t / e.life, pre = Math.min(1, e.t / 0.2);
          A.alpha(ctx, (1 - k) * 0.25, () => A.px(ctx, x - 16 * pre, top, 32 * pre, gy - top, e.pal.c));
          A.alpha(ctx, 1 - k, () => {
            for (let i = 0; i < 18; i++) { const xx = x - 14 + ((i * 7) % 28), yy = top + ((e.t * 650 + i * 31) % Math.max(1, gy - top)); A.px(ctx, xx, yy, i % 4 ? 1 : 2, 12, i % 3 ? e.pal.c : '#ffffff'); }
            if (e.hitd) for (const s of [-1, 1]) for (let i = 0; i < 4; i++) A.px(ctx, x + s * (14 + k * 56 + i * 3) - 3, gy - 2 - i, 6, 1, i ? e.pal.l : '#ffffff');
          });
        },
      },
      {
        name: 'Air Prison', dmg: 8, cd: 9, mp: 7, kind: 'custom', life: 2,
        desc: 'Wrap the nearest enemy in a cage of spinning wind blades that drags its friends in too. Every turn slices. Then it bursts.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 160); e.tg = t; if (!t) { e.dead = true; return; } if (t.applyStatus) { t.applyStatus('stagger', 0); if (t.status.stagger) t.status.stagger.t = e.life; } A.sfx('whoosh'); },
        update(e, dt, g, A) {
          if (!e.tg || e.tg.dead) { e.dead = true; return; }
          if (!e.tg.tutorial) e.tg.vx = 0;
          const c = A.center(e.tg);
          for (const o of H.nearby(A, c.x, c.y, 70)) if (o.t !== e.tg && !o.t.tutorial) o.t.vx = U.approach(o.t.vx, Math.sign(c.x - o.c.x) * 90, 5, dt);
          A.tickR(e, c.x, c.y, 20 * H.sc(e), 0.25, { kb: 0 });
          e.ct = (e.ct || 0) - dt; if (e.ct <= 0) { e.ct = 0.25; A.sfx('swing', { minGap: 0.05 }); }
        },
        onEnd(e, A) { if (!e.tg || e.tg.dead) return; const c = A.center(e.tg); W.boom(A, e, c.x, c.y, 30 * H.sc(e), { mult: 1.6 }); },
        draw(e, ctx, ox, oy, A) {
          if (!e.tg) return;
          const c = A.center(e.tg), x = c.x + ox, y = c.y + oy, R = 18 * H.sc(e);
          A.alpha(ctx, A.fade(e, 0.1, 0.3), () => {
            A.alpha(ctx, 0.25, () => A.disc(ctx, x, y, Math.round(R), e.pal.c));
            for (let i = 0; i < 5; i++) { const a = e.t * 10 + i * 1.257; W.smear(ctx, A, x, y, R - (i % 2) * 3, 1, 0.55, i % 2 ? e.pal.c : e.pal.l, 3, a, a + 1.1); }
            for (let i = 0; i < 10; i++) { const a = -e.t * 7 + i * 0.63, rr = R + 3 + Math.sin(e.t * 9 + i) * 2; A.px(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.9, 2, 1, '#ffffff'); }
          });
        },
      },
    ],
    ult: {
      name: 'Celestial Cyclone', dmg: 8,
      desc: 'An enormous cyclone stretches from the battlefield into the heavens. Giant wind blades and air cannons tear through everything inside it.',
      charge: {
        pose: (t, k) => J({ FA: [[11.4, 13.4], [13.8, 12.8 + Math.sin(t * 18)]], BA: [[5, 13.4], [2.6, 12.8 - Math.sin(t * 18)]], FL: [[9.6, 19.4], [9, 22.4]], BL: [[7, 19.4], [6.6, 22.4]] }),
        lift: 12,
        draw(ctx, x, y, k, t, A, P) { for (let i = 0; i < 40; i++) { const q = i / 40, a = t * 10 + i * 0.7, r = 4 + q * 34 * k, yy = y + 14 - q * 60 * k; A.px(ctx, x + Math.cos(a) * r, yy + Math.sin(a) * r * 0.25, 2, 1, i % 3 ? P.c : '#ffffff'); } },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.8,
          spawn(e) {
            const t = A.near(p.cx, p.y, 260); e.cx = t ? A.center(t).x : p.cx + e.dir * 90; e.gy = A.ground(e.cx, p.y + 2);
            e.bt = 0; e.ct = 0.6; e.R = 0; e.blades = []; e.shots = []; e.junk = [];
            for (let i = 0; i < 44; i++) e.junk.push({ q: Math.random(), a: Math.random() * 6, s: Math.random() < 0.3 ? 2 : 1, star: i % 3 === 0 });
            A.sfx('rumble', { dur: 3.4 }); A.sfx('whoosh');
          },
          update(e, dt, g, A) {
            const R = e.R = 80 * Math.min(1, e.t / 0.5);
            for (const o of H.nearby(A, e.cx, e.gy - 30, 190)) if (!o.t.tutorial) { o.t.vx = U.approach(o.t.vx, Math.sign(e.cx - o.c.x) * 170, 5, dt); if (Math.abs(o.c.x - e.cx) < R) o.t.vy = -140; }
            A.tick(e, { x: e.cx - R, y: A.top(), w: R * 2, h: e.gy - A.top() }, 0.16, { mult: 0.45, kb: 0 });
            for (const j of e.junk) { j.q = (j.q + dt * 0.35) % 1; j.a += dt * (6 + j.q * 4); }
            // giant wind blades slicing through the whole cyclone
            e.bt -= dt; for (const b of e.blades) b.t += dt;
            if (e.t < 3 && e.bt <= 0) { e.bt = 0.1; const y = e.gy - A.rnd(10, 150); e.blades.push({ y, d: Math.random() < 0.5 ? 1 : -1, t: 0 }); A.hit(e, { x: e.cx - R - 20, y: y - 8, w: R * 2 + 40, h: 16 }, { mult: 0.6 }); e.hit.clear(); A.sfx('swing', { minGap: 0.05 }); }
            // ...and air cannons blasting out of it
            e.ct -= dt; if (e.t < 3 && e.ct <= 0) { e.ct = 0.45; e.shots.push({ x: e.cx, y: e.gy - A.rnd(12, 60), d: Math.random() < 0.5 ? 1 : -1, t: 0 }); A.sfx('shockwave', { minGap: 0.1 }); }
            for (const s of e.shots) { s.t += dt; s.x += s.d * 360 * dt; A.hitR(e, s.x, s.y, 14, { mult: 1, kb: 1.4, dir: s.d }); }
            if (e.t > 3 && !e.fin) { e.fin = e.t; e.hit.clear(); A.blast(e, e.cx, e.gy - 50, 130 * H.sc(e), { dmg: e.dmg * 6 }); A.shake(12, 0.5); A.flash(0.4); A.sfx('boom'); }
          },
          draw(e, ctx, ox, oy, A) {
            const x = e.cx + ox, gy = e.gy + oy, top = A.top() + oy, R = e.R, f = e.t > 3.3 ? (3.8 - e.t) / 0.5 : 1;
            // wind streaming in from everywhere
            A.alpha(ctx, 0.5 * f, () => { for (let i = 0; i < 26; i++) { const side = i % 2 ? 1 : -1, ph = (e.t * 1.6 + i / 26) % 1; A.px(ctx, x + side * (300 - ph * 280), gy - ((i * 37) % 200), 14, 1, '#e8fff8'); } });
            A.alpha(ctx, f, () => {
              // the funnel: layer on layer of spinning wind, wide up in the heavens and thin at the ground
              A.alpha(ctx, 0.22, () => { for (let yy = top; yy < gy; yy += 2) { const r = R * (0.25 + ((gy - yy) / (gy - top)) * 1.3); A.px(ctx, x - r, yy, r * 2, 1, e.pal.c); } });
              for (let i = 0; i < 260; i++) { const q = i / 260, yy = gy - q * (gy - top), r = R * (0.25 + q * 1.3), a = e.t * 9 + i * 0.37; A.px(ctx, x + Math.cos(a) * r, yy + Math.sin(a) * 2, 3, 1, i % 4 ? e.pal.c : '#ffffff'); }
              // rubble and stars dragged up into the heavens
              for (const j of e.junk) { const yy = gy - j.q * (gy - top), jx = x + Math.cos(j.a) * R * (0.25 + j.q * 1.3) * 0.9; if (j.star) A.star(ctx, jx, yy, 1, '#ffd34d', '#ffffff'); else A.px(ctx, jx, yy, j.s + 1, j.s, '#8a7a6a'); }
              for (const b of e.blades) if (b.t < 0.25) A.alpha(ctx, 1 - b.t / 0.25, () => { A.arc(ctx, x, b.y + oy, R + 22, b.d, '#ffffff', 3, -0.7, 0.7); A.arc(ctx, x, b.y + oy, R + 16, b.d, e.pal.c, 2, -0.6, 0.6); });
              for (const s of e.shots) if (s.t < 0.9) { A.ring(ctx, s.x + ox, s.y + oy, 7, '#ffffff', 10); A.ring(ctx, s.x + ox - s.d * 8, s.y + oy, 5, e.pal.c, 8); }
            });
            // the cyclone bursting apart
            if (e.fin) { const k = (e.t - e.fin) / 0.8; A.alpha(ctx, Math.max(0, 1 - k), () => { for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; A.line(ctx, x + Math.cos(a) * (10 + k * 60), gy - 50 + Math.sin(a) * (10 + k * 60), x + Math.cos(a) * (30 + k * 200), gy - 50 + Math.sin(a) * (30 + k * 200), i % 2 ? '#ffffff' : e.pal.c, 2); } A.ring(ctx, x, gy - 50, 20 + k * 220, '#ffffff', (20 + k * 220) * 0.6, 2); }); }
          },
        }, {});
      },
    },
  };

  // =============================================================== EARTH (amber)
  const PEBBLE = { life: 0.9, update(e, dt) { e.vy += 500 * dt; e.x += e.vx * dt; e.y += e.vy * dt; }, draw(e, ctx, ox, oy, A) { A.px(ctx, e.x + ox, e.y + oy, e.s || 2, e.s || 2, e.c || e.pal.d); } };
  const pebbles = (A, e, x, y, n) => { for (let i = 0; i < n; i++) A.spawn(e, PEBBLE, { x, y, vx: A.rnd(-90, 90), vy: A.rnd(-220, -60), s: Math.random() < 0.3 ? 3 : 2, c: Math.random() < 0.5 ? '#8a6a3a' : '#5a3e22' }); };
  const ROCK = (ctx, A, x, y, w, h, P) => { A.px(ctx, x - w / 2, y - h, w, h, '#6a4e2a'); A.px(ctx, x - w / 2, y - h, w, 2, P.c); A.px(ctx, x - w / 2, y - h, 2, h, '#8a6a3a'); for (let i = 3; i < h; i += 5) A.px(ctx, x - w / 2 + 2, y - h + i, w - 4, 1, '#4a3418'); };
  AW.earth = {
    color: '#e0a040', up: '#ffe8a0', status: 'shatter', fx: 'pebbles', block: ['Bedrock Bastion', 'wall'],
    icons: ['golem', 'mountain', 'boulderRoll', 'faultJaws', 'cluster'],
    look: { back(ctx, F) { for (let i = 0; i < 3; i++) { const a = F.t * 1.2 + i * 2.1, x = F.x + Math.cos(a) * 11, y = F.y - 14 + Math.sin(a) * 3; F.A.px(ctx, x - 1, y - 1, 3, 2, '#8a6a3a'); F.A.px(ctx, x - 1, y - 1, 3, 1, '#e0a040'); } } },
    idle: { pose: (t) => IDLE.crossed(t, { lean: 0 }), fx(ctx, F) { if (Math.sin(F.t * 1.4) > 0.97) F.A.px(ctx, F.x - 6 + ((F.t * 50) % 12), F.ground - 1, 1, 1, '#a89070'); } },
    run: {
      pose: (ph) => RUN.sprint(ph),
      step(A, p) { if (W.footfall(p)) { A.g.dust(p.cx, p.feet, 3); W.emit(A, { life: 0.8, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => { A.px(ctx, e.x + ox - 3, e.y + oy - 1, 2, 1, '#4a3418'); A.px(ctx, e.x + ox, e.y + oy - 1, 3, 1, '#4a3418'); A.px(ctx, e.x + ox - 1, e.y + oy - 2, 1, 1, '#4a3418'); }); } }, { x: p.cx - p.facing * 2, y: p.feet }); } },
    },
    dash: {
      name: 'Landslide Rush', dmg: 13, life: 0.9,
      update(e, dt, g, A) { const p = A.p; if (p.dashT > 0) { A.hit(e, { x: p.x - 4, y: p.y, w: p.w + 8, h: p.h }, { dir: p.facing, kb: 2 }); if (Math.random() < 0.6) pebbles(A, e, p.cx - p.facing * 4, p.feet - 2, 1); } else if (!e.end) { e.end = true; A.hitR(e, p.cx + p.facing * 8, p.feet - 6, 18, { mult: 0.8, kb: 1.2 }); pebbles(A, e, p.cx + p.facing * 8, p.feet - 4, 8); A.sfx('crash', { minGap: 0.1 }); A.shake(2, 0.15); } },
      draw(e, ctx, ox, oy, A) { const p = A.p; if (p.dashT > 0) { const x = p.cx + ox + p.facing * 5, y = p.y + oy + 4; A.px(ctx, x - 1, y, 4, 16, '#8a6a3a'); A.px(ctx, x - 1, y, 4, 2, e.pal.c); } },
    },
    guard: {
      name: 'Bedrock Bastion', sound: 'thud',
      draw(ctx, { A, x, bot, h, P }) { ROCK(ctx, A, x, bot, 12, h + 2, P); A.px(ctx, x - 6, bot - h - 2, 4, 2, '#5a8a3a'); A.px(ctx, x + 2, bot - h, 3, 1, '#5a8a3a'); },
      hit(g, x, y, d) { for (let i = 0; i < 12; i++) dot(g, x, y, d * U.lerp(20, 120, Math.random()), U.lerp(-150, -30, Math.random()), i % 2 ? '#8a6a3a' : '#e0a040', { ay: 520, size: 2 }); },
    },
    m1: {
      name: 'Tectonic Fist', dmg: 12, cd: 0.48, kind: 'custom', life: 0.32,
      desc: 'A heavy punch that cracks the ground and sprays a cone of rock shrapnel.',
      spawn(e, g, A) { H.at(e, A, 0); A.sfx('punchHit', { minGap: 0.05 }); e.gy = H.floor(A, e.x + e.dir * 18); pebbles(A, e, e.x + e.dir * 16, e.y + 4, e.up ? 9 : 6); A.spawn(e, W.SHOCK, { x: e.x + e.dir * 18, y: e.y, r: 14 * H.sc(e), dmg: 0, life: 0.25 }); A.g.dust(e.x + e.dir * 18, e.gy, 4); },
      update(e, dt, g, A) { H.at(e, A, 0); const L = 34 * H.sc(e); A.hit(e, { x: e.dir > 0 ? e.x : e.x - L, y: e.y - 10, w: L, h: 22 }, { kb: 1.4 }); },
      draw(e, ctx, ox, oy, A) {
        const k = e.t / e.life, x = e.x + ox, y = e.y + oy, d = e.dir, L = 34 * H.sc(e), gy = e.gy + oy;
        A.alpha(ctx, 1 - k, () => {
          W.smear(ctx, A, x + d * 4, y, 16 * H.sc(e), d, Math.min(1, k * 3), '#8a6a3a', 4, -1.0, 0.9);
          for (let i = 0; i < 9; i++) { const a = -0.45 + i * 0.11, r = L * Math.min(1, k * 4) * (0.8 + (i % 3) * 0.1), px = x + Math.cos(a) * r * d, py = y + Math.sin(a) * r; A.px(ctx, px, py, 3, 3, i % 2 ? '#8a6a3a' : e.pal.c); A.px(ctx, px, py, 3, 1, '#c8a870'); }
          const cl = L * Math.min(1, k * 5);
          for (let i = 0; i < cl; i += 3) A.px(ctx, x + d * (8 + i) - (d < 0 ? 3 : 0), gy - 1 - ((i * 7) % 3 === 0 ? 1 : 0), 3, 1, '#120a04');
          A.disc(ctx, x + d * 12, y, 5, '#8a6a3a', e.pal.c);
        });
      },
    },
    s: [
      {
        name: 'Golem Arm', dmg: 28, cd: 6, mp: 6, kind: 'custom', life: 1,
        desc: 'A giant stone arm bursts out of the ground beside you and throws a punch.',
        spawn(e, g, A) { const p = A.p; e.dir = p.facing; e.x = p.cx + e.dir * 10; e.gy = p.feet; A.sfx('crash'); A.shake(2, 0.2); },
        update(e, dt, g, A) { if (e.t > 0.3 && e.t < 0.5) { const L = 70 * H.sc(e); A.hit(e, { x: e.dir > 0 ? e.x : e.x - L, y: e.gy - 34, w: L, h: 22 }, { kb: 2.4, dir: e.dir }); if (!e.pw) { e.pw = true; A.sfx('punchHit'); A.shake(3, 0.2); } } },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, gy = e.gy + oy, rise = Math.min(1, e.t / 0.25), out = e.t > 0.3 ? Math.min(1, (e.t - 0.3) / 0.1) : 0, back = e.t > 0.7 ? (e.t - 0.7) / 0.3 : 0, d = e.dir, L = 70 * H.sc(e) * out * (1 - back);
          A.alpha(ctx, 1 - back, () => { ROCK(ctx, A, x, gy, 10, 26 * rise, e.pal); for (let i = 0; i < L; i += 2) A.px(ctx, x + d * i, gy - 30 - (i % 4 === 0 ? 1 : 0), 2, 8, i % 6 ? '#6a4e2a' : '#8a6a3a'); A.px(ctx, x + d * L - 5, gy - 34, 10, 14, '#8a6a3a'); A.px(ctx, x + d * L - 5, gy - 34, 10, 2, e.pal.c); });
        },
      },
      {
        name: 'Mountain Pillar', dmg: 22, cd: 7, mp: 6, kind: 'custom', life: 1.6,
        desc: 'A towering pillar of stone erupts under the enemy, launching it... then crumbles into a rain of rocks.',
        spawn(e, g, A) { H.at(e, A, 0); const ax = A.aim(e, 150); e.tx = ax !== null ? ax : e.x + e.dir * 50; e.gy = H.floor(A, e.tx); A.sfx('crash'); },
        update(e, dt, g, A) { const h = 60 * H.sc(e) * Math.min(1, e.t / 0.12); if (e.t < 0.9) A.hit(e, { x: e.tx - 9, y: e.gy - h, w: 18, h }, { kb: 0, onHit(t) { if (t.applyStatus) t.applyStatus('launch', 0); } }); if (e.t > 0.9 && !e.crumble) { e.crumble = true; A.sfx('crash'); for (let i = 0; i < 10; i++) A.spawn(e, H.proj((b, ctx, ox, oy, A) => { A.px(ctx, b.x + ox - 2, b.y + oy - 2, 4, 4, '#6a4e2a'); A.px(ctx, b.x + ox - 2, b.y + oy - 2, 4, 1, b.pal.c); }, { life: 1, r: 3, gravity: 500 }), { x: e.tx + A.rnd(-6, 6), y: e.gy - A.rnd(20, 60), vx: A.rnd(-80, 80), vy: A.rnd(-120, -20), dmg: e.dmg * 0.3 }); } },
        draw(e, ctx, ox, oy, A) { if (e.crumble) return; const h = 60 * H.sc(e) * Math.min(1, e.t / 0.12); ROCK(ctx, A, e.tx + ox, e.gy + oy, 16, h, e.pal); A.tri(ctx, e.tx + ox, e.gy + oy - h, 16, 6, '#8a6a3a'); },
      },
      {
        name: 'Boulder Roll', dmg: 20, cd: 7, mp: 6, kind: 'custom', life: 0.7,
        desc: 'Curl up inside a boulder and roll forward, flattening everything you hit.',
        spawn(e, g, A) { const p = A.p; e.dir = p.facing; p.vx = e.dir * 260; p.lungeT = 0.55; p.dashGrace = 0.6; A.sfx('rumble', { dur: 0.6 }); },
        update(e, dt, g, A) { const p = A.p; e.x = p.cx; e.y = p.y + 11; A.hitR(e, e.x, e.y, 14 * H.sc(e), { kb: 2.2, dir: e.dir }); if (Math.random() < dt * 20) A.g.dust(p.cx - e.dir * 8, p.feet, 1); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, r = Math.round(12 * H.sc(e)), rot = e.x / r; A.disc(ctx, x, y, r, '#6a4e2a', '#8a6a3a'); for (let i = 0; i < 4; i++) { const a = rot + i * 1.57; A.line(ctx, x, y, x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2), '#4a3418'); } A.ring(ctx, x, y, r, e.pal.c); },
      },
      {
        name: 'Fault Jaws', dmg: 30, cd: 8, mp: 7, kind: 'custom', life: 1.2,
        desc: 'Slash the ground open into a long chasm. Then the earth slams shut on whatever is inside, like jaws.',
        spawn(e, g, A) { H.at(e, A, 50); e.gy = H.floor(A, e.x); A.sfx('crash'); A.shake(2, 0.2); },
        update(e, dt, g, A) { const L = 55 * H.sc(e); if (e.t < 0.6) for (const t of A.targets()) { const c = A.center(t); if (Math.abs(c.x - e.x) < L && !t.tutorial) t.vx *= 0.8; } if (e.t > 0.6 && !e.snap) { e.snap = true; A.hit(e, { x: e.x - L, y: e.gy - 26, w: L * 2, h: 30 }, { kb: 0.3, onHit(t) { if (t.applyStatus) t.applyStatus('stagger', 0); } }); A.sfx('crash'); A.shake(5, 0.3); } },
        draw(e, ctx, ox, oy, A) { const L = 55 * H.sc(e), x = e.x + ox, gy = e.gy + oy, open = e.t < 0.6 ? Math.min(1, e.t / 0.25) : Math.max(0, 1 - (e.t - 0.6) / 0.06), f = e.t > 0.9 ? 1 - (e.t - 0.9) / 0.3 : 1; A.alpha(ctx, f, () => { A.px(ctx, x - L, gy - 1, L * 2, Math.round(1 + open * 3), '#120a04'); for (const s of [-1, 1]) for (let i = -L; i < L; i += 6) A.tri(ctx, x + i + 3, gy - (s < 0 ? 0 : 1), 5, s * -(4 + open * 6), s < 0 ? '#8a6a3a' : '#6a4e2a'); }); },
      },
      {
        name: 'Cluster Boulder', dmg: 14, cd: 6, mp: 6, kind: 'custom', life: 2,
        desc: 'Hurl a huge boulder. Mid-flight it bursts into five smaller rocks that rain down.',
        spawn(e, g, A) { H.at(e, A, 8, -6); e.vx = e.dir * 170; e.vy = -200; A.sfx('swing'); },
        update(e, dt, g, A) { e.vy += 420 * dt; e.x += e.vx * dt; e.y += e.vy * dt; if ((e.vy > 0 && !e.split) || A.solid(e.x, e.y)) { e.split = true; A.sfx('crash'); for (let i = 0; i < (e.up ? 7 : 5); i++) A.spawn(e, H.proj((b, ctx, ox, oy, A) => { A.px(ctx, b.x + ox - 2, b.y + oy - 2, 5, 4, '#6a4e2a'); A.px(ctx, b.x + ox - 2, b.y + oy - 2, 5, 1, b.pal.c); }, { life: 1.4, r: 4, gravity: 420, boom: 16 }), { x: e.x, y: e.y, vx: e.vx * 0.6 + (i - 2) * 40, vy: -40 }); e.dead = true; } },
        draw(e, ctx, ox, oy, A) { ROCK(ctx, A, e.x + ox, e.y + oy + 6, 12, 12, e.pal); },
      },
    ],
    ult: {
      name: 'Continental Ruin', dmg: 50,
      desc: 'Tear a whole chunk of the land into the sky — mountains and all — then slam it back down on everything below.',
      charge: {
        pose: (t, k) => J({ bob: 1, FA: [[11.4, 10.4], [12.6, 6.4]], BA: [[5, 10.4], [3.8, 6.4]], FL: [[10.6, 19.4], [11.6, 22]], BL: [[5.6, 19.4], [4.6, 22]] }),
        lift: 0,
        draw(ctx, x, y, k, t, A, P) { const base = y + 14, h = k * 60; for (let i = -30; i <= 30; i += 3) { const hh = h * (0.5 + 0.5 * Math.abs(Math.sin(i * 0.15))); A.px(ctx, x + i, base - hh - 20 * k, 3, Math.max(1, hh * 0.3), (i / 3) % 2 ? '#6a4e2a' : '#8a6a3a'); } for (let i = 0; i < 4; i++) A.tri(ctx, x - 18 + i * 12, base - 20 * k - h * 0.6, 10, 10 * k, '#a8885a', '#ffffff'); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.2,
          spawn(e) { const t = A.near(p.cx, p.y, 260); e.tx = t ? A.center(t).x : p.cx + e.dir * 100; e.gy = A.ground(e.tx, p.y + 2); e.top = A.top(); A.sfx('rumble', { dur: 2.4 }); A.shake(3, 1.4); },
          update(e, dt, g, A) {
            if (e.t < 1.2) { e.my = U.lerp(e.top + 30, e.top + 60, W.ease(e.t / 1.2)); }
            else if (e.t < 1.6) { const q = W.easeIn((e.t - 1.2) / 0.4); e.my = U.lerp(e.top + 60, e.gy - 30, q); }
            else if (!e.boom) { e.boom = true; e.my = e.gy - 30; A.hit(e, { x: e.tx - 150, y: e.gy - 80, w: 300, h: 80 }, { mult: 3, kb: 1.5 }); A.sfx('boom'); A.sfx('crash'); A.flash(0.4); A.shake(14, 0.8); for (let i = 0; i < 30; i++) A.spawn(e, PEBBLE, { x: e.tx + A.rnd(-150, 150), y: e.gy - 20, vx: A.rnd(-160, 160), vy: A.rnd(-320, -80), s: 3, c: i % 2 ? '#8a6a3a' : '#6a4e2a' }); }
          },
          draw(e, ctx, ox, oy, A) {
            const x = e.tx + ox, y = e.my + oy, f = e.t > 2.6 ? 1 - (e.t - 2.6) / 0.6 : 1;
            A.alpha(ctx, f, () => {
              A.px(ctx, x - 150, y, 300, 26, '#5a3e22'); A.px(ctx, x - 150, y, 300, 3, '#8a6a3a');
              for (let i = -150; i < 150; i += 6) A.tri(ctx, x + i + 3, y + 26, 6, -(8 + (Math.abs(i * 7) % 18)), '#4a3418');
              [[-110, 40], [-60, 62], [-10, 48], [50, 70], [110, 44]].forEach(([dx, h]) => { A.tri(ctx, x + dx, y + 1, 60, h, '#6a4e2a', '#ffffff'); A.tri(ctx, x + dx - 6, y + 1, 30, h * 0.7, '#8a6a3a'); });
              if (e.boom) { const k = (e.t - 1.6) / 1; A.alpha(ctx, 1 - k, () => { A.px(ctx, x - 170 - k * 60, e.gy + oy - 3, 340 + k * 120, 3, '#120a04'); A.ring(ctx, x, e.gy + oy - 6, 60 + k * 180, '#e0a040', (60 + k * 180) * 0.2, 2); }); }
            });
          },
        }, {});
      },
    },
  };

  // =========================================================== LIGHTNING (violet)
  const ZAP = (ctx, A, x0, y0, x1, y1, col, seed) => { const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 6)); let lx = x0, ly = y0; for (let i = 1; i <= n; i++) { const q = i / n, nx = U.lerp(x0, x1, q) + (i < n ? Math.sin(seed * 7 + i * 3.1) * 4 : 0), ny = U.lerp(y0, y1, q) + (i < n ? Math.cos(seed * 5 + i * 2.3) * 4 : 0); A.line(ctx, lx, ly, nx, ny, '#ffffff', 2); A.line(ctx, lx + 1, ly, nx + 1, ny, col, 1); lx = nx; ly = ny; } };
  AW.lightning = {
    color: '#b06aff', up: '#ffd23a', status: 'shock', fx: 'sparks', block: ['Tesla Cage', 'shield'],
    icons: ['plasma', 'hammer', 'rod', 'overcharge', 'net'],
    look: { fx(ctx, F) { if (Math.floor(F.t * 7) % 3 === 0) { const a = F.at('handF'), b = F.at('headTop'); ZAP(ctx, F.A, a.x, a.y, b.x + F.d * 2, b.y + 4, '#b06aff', Math.floor(F.t * 7)); } } },
    idle: { pose: (t) => IDLE.fists(t), fx(ctx, F) { for (const h of ['handF', 'handB']) { const p = F.at(h); if (Math.random() < 0.5) F.A.px(ctx, p.x + Math.round(Math.random() * 4 - 2), p.y + Math.round(Math.random() * 4 - 2), 1, 1, Math.random() < 0.5 ? '#ffffff' : '#b06aff'); } } },
    run: {
      pose: (ph) => RUN.dart(ph),
      back(ctx, F) { const A = F.A, seed = Math.floor(F.t * 14); for (let k = 0; k < 2; k++) { const y = F.y - 8 - k * 7; A.alpha(ctx, 0.75, () => ZAP(ctx, A, F.x - F.d * 4, y, F.x - F.d * (22 + k * 6), y + (k ? 3 : -2), k ? '#ffd23a' : '#b06aff', seed + k)); } },
      step(A, p, dt) { if (W.every(p, 'spark', 0.05, dt)) A.g.fx.add({ x: p.cx - p.facing * 6, y: p.y + Math.random() * p.h, vx: -p.facing * 60, vy: A.rnd(-40, 40), life: 0.2, color: Math.random() < 0.5 ? '#ffffff' : '#b06aff', size: 1, fadeOut: 0.1 }); },
    },
    dash: {
      name: 'Flash Bolt', style: 'blink', dmg: 14, life: 1.2,
      spawn(e, g, A) { const p = A.p; e.sx = p.cx; e.sy = p.y + 10; A.sfx('zap'); },
      update(e, dt, g, A) { const p = A.p; if (p.dashT <= 0 && !e.done) { e.done = true; e.ex = p.cx; e.ey = p.y + 10; A.hit(e, { x: Math.min(e.sx, e.ex) - 4, y: e.sy - 12, w: Math.abs(e.ex - e.sx) + 8, h: 24 }, { kb: 0.8 }); A.hitR(e, e.ex + p.facing * 8, e.ey, 18, { kb: 1, mult: 0.8 }); A.sfx('zap'); } if (e.done) A.tick(e, { x: Math.min(e.sx, e.ex), y: e.sy - 3, w: Math.abs(e.ex - e.sx), h: 6 }, 0.35, { mult: 0.25, kb: 0 }); },
      draw(e, ctx, ox, oy, A) { if (!e.done) return; const k = (e.t - 0.16) / 1; A.alpha(ctx, Math.max(0, 1 - k), () => ZAP(ctx, A, e.sx + ox, e.sy + oy, e.ex + ox, e.ey + oy, e.pal.c, Math.floor(e.t * 20))); },
    },
    guard: {
      name: 'Tesla Cage', sound: 'zap',
      draw(ctx, { A, x, bot, h, t }) { const cy = bot - h / 2; for (let i = 0; i < 4; i++) ZAP(ctx, A, x, cy - h / 2, x + Math.sin(t * 9 + i) * 6, cy + h / 2, i % 2 ? '#b06aff' : '#ffd23a', Math.floor(t * 18) + i); A.disc(ctx, x, cy - h / 2, 2, '#ffffff'); },
      hit(g, x, y, d) { for (let i = 0; i < 14; i++) g.fx.add({ x, y, vx: d * U.lerp(60, 220, Math.random()), vy: U.lerp(-80, 80, Math.random()), life: 0.2, color: i % 2 ? '#b06aff' : '#ffffff', size: 1, fadeOut: 0.1 }); },
    },
    m1: {
      name: 'Thunder Jab', dmg: 8, cd: 0.32, kind: 'custom', life: 0.22,
      desc: 'A lightning-fast jab. The bolt off your fist forks into up to two more enemies.',
      spawn(e, g, A) { H.at(e, A, 0); A.sfx('zap', { minGap: 0.04 }); e.links = []; const first = A.near(e.x + e.dir * 24, e.y, 30); if (first) { A.damage(e, first, 1, 0.4); let from = A.center(first); const used = new Set([first.uid]); e.links.push([{ x: e.x + e.dir * 8, y: e.y }, from]); for (let i = 0; i < (e.up ? 3 : 2); i++) { const n = A.near(from.x, from.y, 60, used); if (!n) break; used.add(n.uid); const c = A.center(n); A.damage(e, n, 0.6, 0.2); e.links.push([from, c]); from = c; } } else e.links.push([{ x: e.x + e.dir * 8, y: e.y }, { x: e.x + e.dir * 30, y: e.y }]); },
      draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => e.links.forEach(([a, b], i) => ZAP(ctx, A, a.x + ox, a.y + oy, b.x + ox, b.y + oy, e.pal.c, i + Math.floor(e.t * 30)))); },
    },
    s: [
      {
        name: 'Plasma Spear', dmg: 22, cd: 5, mp: 6, kind: 'custom', life: 2.4,
        desc: 'Throw a spear of plasma. It leaves an electrified line in the air that keeps zapping.',
        spawn(e, g, A) { H.at(e, A, 8, -2); e.sx = e.x; e.vx = e.dir * 380; A.sfx('zap'); },
        update(e, dt, g, A) { if (!e.stop) { const r = H.fly(e, dt, A, { r: 4, pierce: true, kb: 0.6 }); if (r === 'wall' || e.t > 0.6) { e.stop = true; e.ex = e.x; } } else A.tick(e, { x: Math.min(e.sx, e.ex), y: e.y - 3, w: Math.abs(e.ex - e.sx), h: 6 }, 0.3, { mult: 0.3, kb: 0 }); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, d = e.dir, f = A.fade(e, 0.02, 0.5); A.alpha(ctx, f * 0.8, () => ZAP(ctx, A, e.sx + ox, y, x, y, e.pal.c, Math.floor(e.t * 15))); if (!e.stop) { A.line(ctx, x - d * 16, y, x + d * 4, y, '#ffffff', 2); A.glow(ctx, x, y, 4, e.pal.c, 0.4); } },
      },
      {
        name: 'Thunder God Hammer', dmg: 32, cd: 8, mp: 7, kind: 'custom', life: 0.9,
        desc: 'Summon a giant hammer of lightning and bring it down. The shockwave races both ways.',
        spawn(e, g, A) { H.at(e, A, 24); e.gy = H.floor(A, e.x); A.sfx('zap'); },
        update(e, dt, g, A) { if (e.t > 0.3 && !e.slam) { e.slam = true; A.hit(e, { x: e.x - 14, y: e.gy - 40, w: 28, h: 40 }, { kb: 1.4 }); A.sfx('crash'); A.sfx('zap'); A.shake(5, 0.3); A.flash(0.15); e.hit.clear(); } if (e.slam) { const L = 80 * H.sc(e) * Math.min(1, (e.t - 0.3) / 0.3); A.hit(e, { x: e.x - L, y: e.gy - 12, w: L * 2, h: 12 }, { mult: 0.6, kb: 0.8 }); } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, gy = e.gy + oy, a = e.t < 0.3 ? U.lerp(-2.4, 0, W.easeIn(e.t / 0.3)) : 0, hx = x - e.dir * 4 + Math.sin(a) * 30 * e.dir, hy = gy - 40 + (1 - Math.cos(a)) * -10; A.alpha(ctx, e.slam ? 1 - (e.t - 0.3) / 0.6 : 1, () => { A.line(ctx, x - e.dir * 4, gy - 8, hx, hy, '#ffd23a', 2); A.px(ctx, hx - 9, hy - 6, 18, 12, e.pal.c); A.px(ctx, hx - 9, hy - 6, 18, 2, '#ffffff'); ZAP(ctx, A, hx - 9, hy, hx + 9, hy, '#ffffff', Math.floor(e.t * 20)); if (e.slam) { const L = 80 * H.sc(e) * Math.min(1, (e.t - 0.3) / 0.3); for (const s of [-1, 1]) ZAP(ctx, A, x, gy - 3, x + s * L, gy - 3, e.pal.c, Math.floor(e.t * 25) + s); } }); },
      },
      {
        name: 'Lightning Rod', dmg: 10, cd: 10, mp: 7, kind: 'custom', life: 5,
        desc: 'Plant a lightning rod. Bolts keep striking it and arcing into anything nearby.',
        spawn(e, g, A) { H.at(e, A, 20); e.gy = H.floor(A, e.x); e.top = H.sky(A, e.x, e.gy - 10); e.st = 0.4; A.sfx('hitMetal'); },
        update(e, dt, g, A) { e.st -= dt; e.zap = Math.max(0, (e.zap || 0) - dt); if (e.st <= 0) { e.st = e.up ? 0.5 : 0.8; e.zap = 0.12; e.arcs = H.nearby(A, e.x, e.gy - 20, 70).slice(0, 3).map((o) => { A.damage(e, o.t, 1, 0.2); return o.c; }); A.sfx('zap', { minGap: 0.05 }); } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, gy = e.gy + oy, top = e.top + oy; A.alpha(ctx, A.fade(e, 0.1, 0.4), () => { A.px(ctx, x - 1, gy - 24, 2, 24, '#8a90a0'); A.px(ctx, x - 1, gy - 26, 2, 2, '#ffffff'); if (e.zap) { ZAP(ctx, A, x, top, x, gy - 26, e.pal.c, Math.floor(e.t * 20)); for (const c of e.arcs || []) ZAP(ctx, A, x, gy - 24, c.x + ox, c.y + oy, e.pal.c, c.x); } }); },
      },
      {
        name: 'Overcharge', dmg: 14, cd: 16, mp: 6, kind: 'custom', life: 6,
        desc: 'Supercharge yourself with a thunderclap: you hit much harder, and violet lightning lashes out at anything nearby.',
        spawn(e, g, A) { const p = A.p; p.ab.buffs.rage = { t: e.life * (e.up ? 1.4 : 1), up: e.up, pal: e.pal }; A.g.floatText(p.cx, p.y - 10, 'OVERCHARGED!', e.pal.l); A.sfx('zap'); A.flash(0.12); W.boom(A, e, p.cx, p.y + 12, 44 * H.sc(e), { mult: 1.4 }); e.zt = 0.4; },
        update(e, dt, g, A) {
          const p = A.p; e.x = p.cx; e.y = p.y;
          if (!p.ab.buffs.rage) { e.dead = true; return; }
          e.zt -= dt; e.arc = Math.max(0, (e.arc || 0) - dt);
          if (e.zt <= 0) { e.zt = 0.55; const t = A.near(p.cx, p.y + 10, 90); if (t) { const c = A.center(t); e.ax = c.x; e.ay = c.y; e.arc = 0.12; e.seed = Math.random() * 9; A.damage(e, t, 0.5, 0.3); if (t.applyStatus) t.applyStatus('shock', 0); } }
        },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy; if (e.arc > 0) W.bolt(ctx, A, x, y + 10, e.ax + ox, e.ay + oy, e.pal.c, e.seed, 1); if (Math.floor(e.t * 12) % 2) return; ZAP(ctx, A, x - 8, y - 4, x + 8, y + 22, e.pal.c, Math.floor(e.t * 12)); ZAP(ctx, A, x + 8, y, x - 6, y + 20, '#ffd23a', Math.floor(e.t * 12) + 3); },
      },
      {
        name: 'Storm Net', dmg: 10, cd: 8, mp: 7, kind: 'custom', life: 1.8,
        desc: 'Three crackling orbs fly out in a triangle. Everything inside the net of lightning between them gets fried.',
        spawn(e, g, A) { H.at(e, A, 8, -2); e.cx2 = e.x; e.cy2 = e.y; A.sfx('zap'); },
        update(e, dt, g, A) { e.cx2 += e.dir * 120 * dt; const r = 22 * H.sc(e) * Math.min(1, e.t / 0.3); e.pts = [0, 1, 2].map((i) => { const a = e.t * 3 + i * 2.094; return { x: e.cx2 + Math.cos(a) * r, y: e.cy2 + Math.sin(a) * r }; }); A.tickR(e, e.cx2, e.cy2, r, 0.25, { kb: 0.3 }); if (A.solid(e.cx2, e.cy2)) e.t = Math.max(e.t, e.life - 0.2); },
        draw(e, ctx, ox, oy, A) { if (!e.pts) return; A.alpha(ctx, A.fade(e, 0.1, 0.3), () => { for (let i = 0; i < 3; i++) { const a = e.pts[i], b = e.pts[(i + 1) % 3]; ZAP(ctx, A, a.x + ox, a.y + oy, b.x + ox, b.y + oy, e.pal.c, i + Math.floor(e.t * 20)); } for (const q of e.pts) A.disc(ctx, q.x + ox, q.y + oy, 2, '#ffffff'); }); },
      },
    ],
    ult: {
      name: "Heaven's Thunder", dmg: 9,
      desc: 'A colossal storm gathers overhead. Lightning bolts rain down without end, until one final gigantic bolt obliterates everything.',
      charge: {
        pose: (t, k) => J({ FA: [[10.6, 10.4], [11, 6]], BA: [[6.4, 14], [6, 16.6]], fist: true }),
        lift: 4,
        draw(ctx, x, y, k, t, A, P) { const sy = y - 44; for (let i = 0; i < 9; i++) A.disc(ctx, x - 40 + i * 10, sy + (i % 2) * 3, Math.round(6 + k * 4), '#2a1a4a', '#4a3a6a'); if (Math.floor(t * 10) % 3 === 0) ZAP(ctx, A, x + 2, sy + 6, x + 2, y - 16, P.c, Math.floor(t * 10)); A.alpha(ctx, 0.4 * k, () => A.px(ctx, x - 300, y - 200, 600, 400, '#120a20')); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.8, layer: 'screen',
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t); e.bolts = []; e.bt = 0; e.sparks = []; A.sfx('rumble', { dur: 3.4 }); },
          update(e, dt, g, A) {
            e.bt -= dt; for (const b of e.bolts) b.t += dt;
            for (const s of e.sparks) { s.t += dt; s.vy += 400 * dt; s.x += s.vx * dt; s.y += s.vy * dt; }
            e.sparks = e.sparks.filter((s) => s.t < 0.6);
            const live = e.ts.filter((t) => !t.dead);
            // bolt after bolt after bolt
            if (e.t < 2.6 && e.bt <= 0) {
              e.bt = 0.06;
              const t = live.length && Math.random() < 0.65 ? live[Math.floor(Math.random() * live.length)] : null;
              const x = t ? A.center(t).x + A.rnd(-6, 6) : p.cx + A.rnd(-240, 240), gy = A.ground(x, p.y - 40);
              e.bolts.push({ x, gy, t: 0, s: Math.random() * 99, w: Math.random() < 0.25 ? 4 : 2 });
              A.hitR(e, x, gy - 20, 18, { mult: 0.6, kb: 0.3, once: false, every: 0.15 });
              for (let i = 0; i < 6; i++) e.sparks.push({ x, y: gy - 2, vx: A.rnd(-120, 120), vy: A.rnd(-200, -60), t: 0 });
              A.sfx('zap', { minGap: 0.03 });
              if (Math.random() < 0.3) A.flash(0.08);
            }
            // ...and then the one that ends it
            if (e.t > 2.75 && !e.fin) {
              e.fin = e.t; const c = live[0] ? A.center(live[0]) : { x: p.cx + e.dir * 80, y: p.y + 10 }; e.fx2 = c; e.gy2 = A.ground(c.x, c.y - 10);
              A.blast(e, c.x, c.y, 120 * H.sc(e), { dmg: e.dmg * 7 }); A.sfx('boom'); A.sfx('zap', { minGap: 0 }); A.flash(0.9); A.shake(16, 0.8);
              for (let i = 0; i < 40; i++) e.sparks.push({ x: c.x, y: e.gy2 - 2, vx: A.rnd(-300, 300), vy: A.rnd(-360, -80), t: 0 });
            }
          },
          draw(e, ctx, ox, oy, A) {
            const dark = e.t < 3 ? Math.min(1, e.t * 3) * 0.65 : Math.max(0, 0.65 - (e.t - 3));
            A.alpha(ctx, dark, () => A.px(ctx, -10, -10, 2000, 2000, '#0e0618'));
            const top = A.top() + oy;
            // the storm overhead
            A.alpha(ctx, Math.min(1, dark * 1.6), () => { for (let i = 0; i < 18; i++) A.disc(ctx, p.cx + ox - 400 + i * 48, top + 14 + (i % 2) * 6, 26, '#1e1030', '#3a2a5a'); });
            for (const b of e.bolts) if (b.t < 0.12) { W.bolt(ctx, A, b.x + ox, top + 24, b.x + ox, b.gy + oy, e.pal.c, b.s, b.w); A.alpha(ctx, 0.7, () => A.ring(ctx, b.x + ox, b.gy + oy - 2, 8 + b.t * 60, '#ffffff', 3)); }
            for (const s of e.sparks) A.px(ctx, s.x + ox, s.y + oy, 1, 1, s.t < 0.2 ? '#ffffff' : e.pal.l);
            if (e.fin && e.t < e.fin + 0.6) {
              const k = (e.t - e.fin) / 0.6, c = e.fx2, w = 34 * (1 - k) + 4, gy = e.gy2 + oy, x = c.x + ox;
              A.alpha(ctx, 0.4, () => A.px(ctx, x - w * 1.6, top, w * 3.2, gy - top, e.pal.c));
              W.bolt(ctx, A, x, top, x, gy, e.pal.c, e.t * 40, w);
              A.px(ctx, x - w / 3, top, w * 0.66, gy - top, '#ffffff');
              A.alpha(ctx, 1 - k, () => { A.ring(ctx, x, gy - 2, 10 + k * 160, '#ffffff', (10 + k * 160) * 0.3, 2); A.ring(ctx, x, gy - 2, 6 + k * 120, e.pal.c, (6 + k * 120) * 0.3, 2); });
            }
          },
        }, {});
      },
    },
  };

  // ================================================================ ICE (frost)
  const SHARDS = (A, e, x, y, n, sp) => { for (let i = 0; i < n; i++) A.spawn(e, { life: 0.7, update(s, dt) { s.vy += 380 * dt; s.x += s.vx * dt; s.y += s.vy * dt; }, draw(s, ctx, ox, oy, A) { A.alpha(ctx, 1 - s.t / s.life, () => { A.line(ctx, s.x + ox, s.y + oy, s.x + ox + s.vx * 0.015, s.y + oy + s.vy * 0.015, '#e8f8ff'); A.px(ctx, s.x + ox, s.y + oy, 1, 1, '#ffffff'); }); } }, { x, y, vx: A.rnd(-1, 1) * (sp || 120), vy: A.rnd(-200, 20) }); };
  /** Ice spikes bursting up at every point in `pts` ([x, groundY] pairs), hitting everything along them. */
  const ICE_ROW = {
    life: 0.75,
    update(s, dt, g, A) {
      if (s.t >= 0.25 || !s.pts.length) return;
      const xs = s.pts.map((q) => q[0]), x0 = Math.min(...xs) - 6, x1 = Math.max(...xs) + 6, gy = s.pts[0][1];
      A.hit(s, { x: x0, y: gy - 28, w: x1 - x0, h: 28 }, { kb: 0.4, onHit(t) { if (t.applyStatus) { t.applyStatus('chill', 0); t.applyStatus('launch', 0); } } });
    },
    draw(s, ctx, ox, oy, A) {
      const k = Math.min(1, s.t / 0.1), f = 1 - Math.max(0, s.t - 0.45) / 0.3;
      A.alpha(ctx, f, () => s.pts.forEach(([x, gy], i) => { const h = (14 + (i * 7) % 10) * k * H.sc(s); A.tri(ctx, x + ox, gy + oy, 7, h, '#a8e0ff', '#ffffff'); A.px(ctx, x + ox - 1, gy + oy - h * 0.8, 1, h * 0.6, '#ffffff'); }));
    },
  };
  AW.ice = {
    color: '#c8f0ff', up: '#7ab8ff', status: 'chill', fx: 'snow', block: ['Frozen Fortress', 'wall'],
    icons: ['glacier', 'domain', 'wolf', 'skater', 'snowball'],
    look: {
      fx(ctx, F) {
        // ice crystals on your cheek
        const c = F.at('cheek'), A = F.A;
        A.px(ctx, c.x - F.d, c.y, 1, 1, '#ffffff'); A.px(ctx, c.x, c.y - 1, 1, 1, '#c8f0ff'); A.px(ctx, c.x - F.d * 2, c.y + 1, 1, 1, '#a8e0ff'); A.px(ctx, c.x - F.d, c.y - 2, 1, 1, '#e8f8ff');
      },
    },
    idle: {
      pose: (t) => IDLE.pockets(t),
      fx(ctx, F) { const m = F.at('mouth'), k = (F.t * 0.6) % 1; if (k < 0.5) F.A.alpha(ctx, 0.5 * (1 - k * 2), () => F.A.disc(ctx, m.x + F.d * (2 + k * 8), m.y - k * 4, Math.round(1 + k * 3), '#e8f8ff')); },   // frosty breath
    },
    run: {
      pose: (ph) => RUN.skate(ph * 0.6, { pockets: true }),
      back(ctx, F) { F.A.px(ctx, F.x - F.d * 18, F.ground - 1, 22, 1, '#c8f0ff'); for (let i = 0; i < 4; i++) F.A.px(ctx, F.x - F.d * (6 + i * 5), F.ground - 1, 2, 1, '#ffffff'); },
      step(A, p, dt) { if (W.every(p, 'ice', 0.05, dt)) W.emit(A, { life: 1.4, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => { A.px(ctx, e.x + ox - 4, e.y + oy - 1, 8, 1, '#c8f0ff'); A.px(ctx, e.x + ox - 1, e.y + oy - 1, 2, 1, '#ffffff'); }); } }, { x: p.cx, y: p.feet }); },
    },
    dash: {
      name: 'Glacial Afterimage', dmg: 14, life: 1.1,
      spawn(e, g, A) { const p = A.p; e.sx = p.cx; e.sf = p.feet; e.face = p.facing; A.sfx('glassCrack'); },
      update(e, dt, g, A) {
        if (e.t > 0.55 && !e.shatter) {
          // the statue shatters: real shards of ice fly out, mostly the way you dashed
          e.shatter = true; A.hitR(e, e.sx, e.sf - 12, 22, { kb: 1, onHit(t) { if (t.applyStatus) t.applyStatus('chill', 0); } }); SHARDS(A, e, e.sx, e.sf - 12, 10, 150); A.sfx('shatter');
          for (let i = 0; i < 7; i++) { const a = U.lerp(-0.6, 0.6, i / 6) + (e.face > 0 ? 0 : Math.PI); A.spawn(e, H.proj((b, ctx, ox, oy, A) => { const an = Math.atan2(b.vy, b.vx); A.line(ctx, b.x + ox - Math.cos(an) * 4, b.y + oy - Math.sin(an) * 4, b.x + ox, b.y + oy, '#c8f0ff', 2); A.px(ctx, b.x + ox, b.y + oy, 1, 1, '#ffffff'); }, { life: 0.6, r: 3 }), { x: e.sx, y: e.sf - 12, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, dmg: e.dmg * 0.6 }); }
        }
      },
      draw(e, ctx, ox, oy, A) { if (e.shatter) return; const cr = e.t / 0.55; A.alpha(ctx, 0.85, () => ERX.KitHelp.drawGhost(ctx, A, 'dash', e.sx + ox, e.sf + oy, e.face, '#a8e0ff')); if (cr > 0.4) for (let i = 0; i < Math.round(cr * 6); i++) A.line(ctx, e.sx + ox - 3 + i, e.sf + oy - 20 + i * 3, e.sx + ox + 2 - i, e.sf + oy - 14 + i * 2, '#ffffff'); },
    },
    guard: {
      name: 'Frozen Fortress', sound: 'glass',
      draw(ctx, { A, x, bot, h, t }) { const w = 11; for (let yy = 0; yy < h + 4; yy++) A.px(ctx, x - w / 2, bot - yy, w, 1, yy % 6 === 0 ? '#ffffff' : yy % 2 ? '#a8e0ff' : '#c8f0ff'); for (let i = 0; i < 3; i++) A.tri(ctx, x - 4 + i * 4, bot - h - 4, 4, 5, '#e8f8ff'); A.alpha(ctx, 0.4, () => A.px(ctx, x - w / 2 - 2, bot - 4, w + 4, 4, '#ffffff')); A.px(ctx, x - 3, bot - h + ((t * 30) % h), 1, 6, '#ffffff'); },
      hit(g, x, y, d) { for (let i = 0; i < 14; i++) dot(g, x, y, d * U.lerp(20, 120, Math.random()), U.lerp(-120, 30, Math.random()), i % 2 ? '#ffffff' : '#a8e0ff', { ay: 260, len: i % 3 ? 0 : 2 }); },
    },
    m1: {
      name: 'Frost Fang', dmg: 9, cd: 0.36, kind: 'custom', life: 0.6,
      desc: 'Slash with an ice dagger. The slash freezes in the air for a moment, then shatters and hits everything around it again.',
      spawn(e, g, A) { H.at(e, A, 0); e.sx = e.x; e.sy = e.y; A.sfx('swing', { minGap: 0.04 }); },
      update(e, dt, g, A) { const R = 32 * H.sc(e), box = { x: e.dir > 0 ? e.sx : e.sx - R, y: e.sy - 14, w: R, h: 28 }; if (e.t < 0.12) A.hit(e, box, { kb: 0.4 }); if (e.t > 0.4 && !e.sh) { e.sh = true; e.hit.clear(); A.hit(e, box, { mult: 0.7, kb: 0.8, onHit(t) { if (t.applyStatus) t.applyStatus('chill', 0); } }); SHARDS(A, e, e.sx + e.dir * 16, e.sy, 10, 110); A.spawn(e, W.SHOCK, { x: e.sx + e.dir * 16, y: e.sy, r: 20 * H.sc(e), dmg: 0, life: 0.3 }); A.sfx('glassCrack', { minGap: 0.04 }); } },
      draw(e, ctx, ox, oy, A) {
        if (e.sh) return;
        const R = 26 * H.sc(e), x = e.sx + ox, y = e.sy + oy, d = e.dir;
        if (e.t < 0.12) { W.smear(ctx, A, x, y, R, d, (e.t / 0.12) * 0.6, e.pal.c, 6, -1.2, 1.2); return; }
        // the slash hangs frozen in the air, cracking
        const f = (e.t - 0.12) / 0.28;
        A.arc(ctx, x, y, R, d, '#c8f0ff', 6, -1.2, 1.2); A.arc(ctx, x, y, R, d, '#ffffff', 2, -1.2, 1.2);
        for (let i = 0; i < 5; i++) { const a = -1 + i * 0.5, cx = x + Math.cos(a) * (R - 2) * d, cy = y + Math.sin(a) * (R - 2); if (f > i * 0.18) A.line(ctx, cx, cy, cx - d * 3, cy + (i % 2 ? 3 : -3), '#5ab0ff'); }
        if (Math.floor(e.t * 30) % 3 === 0) A.star(ctx, x + Math.cos(-0.5) * R * d, y - R * 0.45, 2, '#ffffff');
      },
    },
    s: [
      {
        name: 'Glacier Spear', dmg: 26, cd: 6, mp: 6, kind: 'custom', life: 1.4,
        desc: 'Throw a massive icicle spear. Whatever it hits is frozen solid inside a pillar of ice.',
        spawn(e, g, A) { H.at(e, A, 8, -2); e.vx = e.dir * 320; A.sfx('whoosh'); },
        update(e, dt, g, A) { const r = H.fly(e, dt, A, { r: 4 }); if (r === 'hit') { const t = A.near(e.x, e.y, 20); if (t && t.applyStatus) { t.applyStatus('freeze', 0); } A.spawn(e, { life: 1.6, spawn(s) { s.gy = A.ground(s.x, s.y); A.sfx('glassCrack'); }, draw(s, ctx, ox, oy, A) { const f = A.fade(s, 0.05, 0.3); A.alpha(ctx, f * 0.75, () => { A.px(ctx, s.x + ox - 8, s.gy + oy - 30, 16, 30, '#a8e0ff'); A.px(ctx, s.x + ox - 6, s.gy + oy - 30, 2, 30, '#ffffff'); A.tri(ctx, s.x + ox, s.gy + oy - 30, 16, 6, '#c8f0ff'); }); } }, { x: e.x }); e.dead = true; } else if (r === 'wall') { SHARDS(A, e, e.x, e.y, 8); e.dead = true; } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, d = e.dir; A.tri(ctx, x + d * 6, y + 2, 4, 0, '#ffffff'); for (let i = 0; i < 18; i++) A.px(ctx, x - d * i, y - 2 + Math.round(i / 9), 1, 4 - Math.round(i / 6), i % 3 ? '#a8e0ff' : '#ffffff'); },
      },
      {
        name: 'Frozen Domain', dmg: 3, cd: 9, mp: 7, kind: 'custom', life: 4,
        desc: 'Freeze the ground into a slick ice rink. Enemies slide helplessly and get colder and colder.',
        spawn(e, g, A) { H.at(e, A, 30); e.gy = H.floor(A, e.x); A.sfx('glassCrack'); },
        update(e, dt, g, A) { const R = 60 * H.sc(e); for (const t of A.targets()) { if (t.tutorial) continue; const c = A.center(t); if (Math.abs(c.x - e.x) < R && Math.abs(t.box.y + t.box.h - e.gy) < 6) { t.vx = U.approach(t.vx, Math.sin(e.t * 2 + t.uid) * 80, 2, dt); if (t.applyStatus && Math.random() < dt * 1.2) t.applyStatus('chill', e.potency); } } A.tick(e, { x: e.x - R, y: e.gy - 8, w: R * 2, h: 8 }, 0.5, { kb: 0 }); },
        draw(e, ctx, ox, oy, A) { const R = 60 * H.sc(e), x = e.x + ox, gy = e.gy + oy; A.alpha(ctx, A.fade(e, 0.2, 0.5), () => { A.px(ctx, x - R, gy - 2, R * 2, 2, '#c8f0ff'); A.px(ctx, x - R, gy - 2, R * 2, 1, '#ffffff'); for (let i = 0; i < 6; i++) { const sx = x - R + ((i * 31 + e.t * 40) % (R * 2)); A.px(ctx, sx, gy - 2, 3, 1, '#ffffff'); } for (let i = 0; i < 8; i++) A.px(ctx, x - R + (i * 17) % (R * 2), gy - 4 - ((e.t * 15 + i * 5) % 14), 1, 1, '#e8f8ff'); }); },
      },
      {
        name: 'Frost Wolf', dmg: 18, cd: 9, mp: 7, kind: 'custom', life: 3,
        desc: 'Summon a great wolf of living ice that sprints at the nearest enemy, bites, freezes as it goes... and shatters in a frozen blast.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx; e.gy = p.feet; e.d = p.facing; e.bites = 0; A.sfx('glassCrack'); },
        update(e, dt, g, A) {
          const t = A.near(e.x, e.gy - 8, 220), max = e.up ? 4 : 3;
          e.bt = Math.max(0, (e.bt || 0) - dt);
          if (t && !e.gone) {
            const c = A.center(t), dx = c.x - e.x;
            e.d = Math.sign(dx) || e.d;
            if (Math.abs(dx) > 12) { const nx = e.x + e.d * 230 * dt; if (!A.solid(nx + e.d * 8, e.gy - 6)) { e.x = nx; e.gy = A.ground(e.x, e.gy - 14); } e.run = (e.run || 0) + dt; if (Math.random() < dt * 18) SHARDS(A, e, e.x - e.d * 8, e.gy - 2, 1, 30); }
            else if (e.bt <= 0 && e.bites < max) { e.bt = 0.42; e.bites++; e.snap = 0.15; A.damage(e, t, 1, 0.5); if (t.applyStatus) t.applyStatus('chill', e.potency); A.sfx('punchHit', { minGap: 0.05 }); A.spawn(e, W.SHOCK, { x: c.x, y: c.y, r: 14 * H.sc(e), dmg: 0, life: 0.25 }); SHARDS(A, e, c.x, c.y, 5); }
          }
          if (e.bites >= max && !e.gone) { e.gone = true; e.t = Math.max(e.t, e.life - 0.3); SHARDS(A, e, e.x, e.gy - 6, 14); W.boom(A, e, e.x + e.d * 10, e.gy - 10, 30 * H.sc(e), { mult: 1.2 }); }
          e.snap = Math.max(0, (e.snap || 0) - dt);
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, gy = e.gy + oy, d = e.d, s = 1.7, leg = Math.floor((e.run || 0) * 14) % 2;
          const P = (dx, dy, w, h, c) => A.px(ctx, d > 0 ? x + dx * s : x - (dx + w) * s, gy + dy * s, w * s, h * s, c);
          A.alpha(ctx, A.fade(e, 0.15, 0.3) * 0.95, () => {
            A.alpha(ctx, 0.3, () => A.disc(ctx, x, gy - 7 * s, Math.round(9 * s), e.pal.c));
            P(-7, -9, 13, 5, '#a8e0ff'); P(-7, -9, 13, 1, '#ffffff'); P(-6, -5, 11, 1, '#5ab0ff');
            P(5, -12, 5, 5, '#c8f0ff'); P(9, -10, 3, 2 + (e.snap ? 1 : 0), '#c8f0ff'); P(7, -11, 1, 1, '#1a5aff');
            P(5, -14, 2, 2, '#ffffff'); P(8, -14, 1, 2, '#ffffff');
            P(-11, -11, 4, 1, '#e8f8ff'); P(-13, -12, 2, 1, '#ffffff');
            for (const lx of [-5, -2, 2, 5]) P(lx, -4, 1, 4 - (lx > 0 ? leg : 1 - leg), '#a8e0ff');
            if (e.snap) for (let i = 0; i < 3; i++) P(12 + i, -12 + i * 2, 1, 1, '#ffffff');
          });
        },
      },
      {
        name: 'Ice Skater Slash', dmg: 16, cd: 6, mp: 5, kind: 'custom', life: 0.8,
        desc: 'Skate forward at high speed on a ribbon of fresh ice, slashing everything you pass... then the ribbon erupts into ice spikes.',
        spawn(e, g, A) { const p = A.p; e.dir = p.facing; p.vx = e.dir * 300; p.lungeT = 0.4; p.dashGrace = 0.45; e.trail = []; A.sfx('swing'); },
        update(e, dt, g, A) {
          const p = A.p;
          if (e.t < 0.42) { e.trail.push({ x: p.cx, gy: p.feet, t: e.t }); A.hit(e, { x: p.x - 6, y: p.y, w: p.w + 12, h: p.h }, { kb: 1, dir: e.dir, onHit(t) { if (t.applyStatus) t.applyStatus('chill', 0); } }); }
          else if (!e.spk) { e.spk = true; A.spawn(e, ICE_ROW, { pts: e.trail.filter((s, i) => i % 3 === 0).map((s) => [s.x, s.gy]) }); A.sfx('glassCrack'); A.shake(3, 0.2); }
        },
        draw(e, ctx, ox, oy, A) {
          for (const s of e.trail) { const a = 1 - (e.t - s.t) / 0.5; if (a > 0) A.alpha(ctx, a, () => { A.px(ctx, s.x + ox - 3, s.gy + oy - 1, 6, 1, '#c8f0ff'); A.px(ctx, s.x + ox, s.gy + oy - 6 - (s.x % 7), 1, 1, '#ffffff'); }); }
          const p = A.p;
          if (e.t < 0.42) W.smear(ctx, A, p.cx + ox + e.dir * 2, p.y + oy + 11, 16, e.dir, (e.t % 0.14) / 0.14, e.pal.c, 4, -1.4, 1.4);
        },
      },
      {
        name: 'Snowball Avalanche', dmg: 12, cd: 8, mp: 6, kind: 'custom', life: 2.4,
        desc: 'Roll a snowball forward. It picks up snow and gets BIGGER... and hits harder the bigger it gets.',
        spawn(e, g, A) { H.at(e, A, 10); e.gy = H.floor(A, e.x); e.r = 4; A.sfx('pop'); },
        update(e, dt, g, A) { e.x += e.dir * 140 * dt; e.gy = A.ground(e.x, e.gy - 20); e.r = Math.min(e.up ? 22 : 18, e.r + dt * 9); if (A.solid(e.x + e.dir * e.r, e.gy - e.r)) { A.blast(e, e.x, e.gy - e.r, e.r * 2, { dmg: e.dmg * (1 + e.r / 8) }); SHARDS(A, e, e.x, e.gy - e.r, 14); e.dead = true; return; } A.hit(e, { x: e.x - e.r, y: e.gy - e.r * 2, w: e.r * 2, h: e.r * 2 }, { mult: 1 + e.r / 10, kb: 1 + e.r / 10, dir: e.dir }); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.gy + oy - e.r, r = Math.round(e.r), rot = e.x / Math.max(3, r); A.disc(ctx, x, y, r, '#e8f8ff', '#ffffff'); for (let i = 0; i < 3; i++) { const a = rot + i * 2.1; A.px(ctx, x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, 2, 1, '#a8e0ff'); } A.px(ctx, x - r, e.gy + oy - 1, r * 2, 1, '#c8f0ff'); },
      },
    ],
    ult: {
      name: 'Absolute Zero', dmg: 34,
      desc: 'A wave of overwhelming cold freezes the whole battlefield solid... then the frozen world shatters into enormous ice fragments.',
      charge: {
        pose: (t, k) => J({ bob: 1, FA: [[11, 13.6], [13, 14.6]], BA: [[5.6, 13.6], [3.6, 14.6]], FL: [[10.6, 19.4], [11.4, 22]], BL: [[5.8, 19.4], [5, 22]], eyesClosed: k < 0.8 }),
        lift: 0,
        draw(ctx, x, y, k, t, A, P) { const r = k * 60; A.alpha(ctx, 0.5 * k, () => A.ring(ctx, x, y, r, '#ffffff', r * 0.7, 2)); for (let i = 0; i < 20; i++) { const a = i * 0.31 + t, d = 30 * (1 - ((t * 0.8 + i / 20) % 1)); A.star(ctx, x + Math.cos(a) * d * 1.6, y + Math.sin(a) * d, 1, '#e8f8ff', '#ffffff'); } A.alpha(ctx, 0.35 * k, () => A.px(ctx, x - 300, y - 200, 600, 400, '#c8f0ff')); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.2, layer: 'screen',
          spawn(e) { e.x = p.cx; e.y = p.y + 10; e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t); e.frags = []; A.sfx('glassCrack'); A.sfx('rumble', { dur: 1.4 }); },
          update(e, dt, g, A) {
            if (e.t < 0.5) for (const t of e.ts) if (!t.dead && Math.abs(A.center(t).x - e.x) < 340 * (e.t / 0.5) && t.applyStatus && !t.status.freeze) { t.applyStatus('freeze', 0); if (t.status.freeze) t.status.freeze.t = 2; A.damage(e, t, 0.6, 0); }
            if (e.t > 1.6 && !e.sh) { e.sh = true; A.sfx('shatter'); A.sfx('boom'); A.flash(0.5); A.shake(10, 0.6); for (const t of e.ts) if (!t.dead) A.damage(e, t, 3, 1.2); for (let i = 0; i < 40; i++) e.frags.push({ x: e.x + A.rnd(-320, 320), y: e.y + A.rnd(-120, 40), vx: A.rnd(-160, 160), vy: A.rnd(-260, -60), r: A.rnd(3, 9), a: A.rnd(0, 6) }); }
            for (const f of e.frags) { f.vy += 400 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.a += dt * 6; }
          },
          draw(e, ctx, ox, oy, A) {
            const ice = e.t < 1.6 ? Math.min(1, e.t / 0.5) : Math.max(0, 1 - (e.t - 1.6) / 0.4);
            A.alpha(ctx, ice * 0.5, () => A.px(ctx, -10, -10, 2000, 2000, '#c8f0ff'));
            if (!e.sh) { for (const t of e.ts) if (!t.dead) { const b = t.box; A.alpha(ctx, ice * 0.85, () => { A.px(ctx, b.x + ox - 4, b.y + oy - 6, b.w + 8, b.h + 6, '#a8e0ff'); A.px(ctx, b.x + ox - 2, b.y + oy - 6, 2, b.h + 6, '#ffffff'); A.tri(ctx, b.x + b.w / 2 + ox, b.y + oy - 6, b.w + 8, 8, '#e8f8ff'); }); } A.alpha(ctx, ice, () => { const r = 340 * Math.min(1, e.t / 0.5); A.ring(ctx, e.x + ox, e.y + oy, r, '#ffffff', r * 0.35, 2); }); }
            if (e.t > 1.3 && !e.sh) { const k = (e.t - 1.3) / 0.3; for (let i = 0; i < 10 * k; i++) A.line(ctx, e.x + ox - 200 + i * 40, -10, e.x + ox - 180 + i * 37 + (i % 3) * 20, 400, '#ffffff'); }
            for (const f of e.frags) { const c = Math.cos(f.a) * f.r, s = Math.sin(f.a) * f.r; A.tri(ctx, f.x + ox + c * 0.2, f.y + oy + s * 0.2, f.r, f.r * 1.4, '#a8e0ff', '#ffffff'); }
          },
        }, {});
      },
    },
  };
})(window.ERX = window.ERX || {});
