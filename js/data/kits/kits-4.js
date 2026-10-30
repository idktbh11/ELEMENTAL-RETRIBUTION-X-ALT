/*
 * KITS: COSMIC, VOID, PSYCHIC, CRYSTAL, MOON, SOLAR
 * (format: js/data/kits/_kit.js)
 */
(function (ERX) {
  'use strict';

  const K = ERX.Kits, H = ERX.KitHelp, U = ERX.U;
  const Phys = () => ERX.GameEngine.Physics;
  const holdStun = (t, s) => { if (!t.applyStatus) return; t.applyStatus('stagger', 0); if (t.status.stagger) t.status.stagger.t = s; };

  // =================================================================== COSMIC
  const TWINKLE = { life: 0.6, draw(e, ctx, ox, oy, A) { const k = e.t / e.life; A.alpha(ctx, 1 - k, () => A.star(ctx, e.x + ox, e.y + oy, k < 0.5 ? 2 : 1, e.pal.l, '#ffffff')); } };
  const STARFIELD = (ctx, A, x, y, w, h, t, n) => { for (let i = 0; i < n; i++) { const sx = x + ((i * 97) % w), sy = y + ((i * 57) % h); if ((Math.floor(t * 6) + i) % 5) A.px(ctx, sx, sy, 1, 1, i % 7 ? '#ffffff' : '#ffd34d'); } };
  const PLANET = (ctx, A, x, y, r, col, ring) => { A.disc(ctx, x, y, r, col, '#ffffff'); if (ring) A.ring(ctx, x, y, r + 3, '#e8d08a', 1); };
  K.cosmic = {
    status: 'starstruck', fx: 'stars', block: ['Star Shield', 'shield'], dash: ['Comet Dash', 'ghost'],
    m1: {
      name: 'Star Shot', dmg: 7, cd: 0.4, kind: 'custom', life: 0.01,
      desc: 'Flick a little star. It leaves a trail of sparkles.',
      spawn(e, g, A) { H.at(e, A, 8, -1); A.sfx('star', { minGap: 0.04 }); A.spawn(e, H.proj((b, ctx, ox, oy, A) => { A.star(ctx, b.x + ox, b.y + oy, b.up ? 3 : 2, b.pal.c, '#ffffff'); }, { life: 1, r: 4, tick(b, dt, A) { if (Math.random() < dt * 30) A.spawn(b, TWINKLE, { x: b.x - Math.sign(b.vx) * 4, y: b.y + A.rnd(-2, 2) }); } }), { vx: e.dir * 250 }); },
    },
    s: [
      {
        name: 'Meteor', dmg: 30, cd: 6, mp: 6, kind: 'custom', life: 0.9,
        desc: 'Call down a meteor from space. Diagonally. With style.',
        spawn(e, g, A) { H.at(e, A, 0); const ax = A.aim(e, 170); e.tx = ax !== null ? ax : e.x + e.dir * 80; e.gy = H.floor(A, e.tx); e.sx = e.tx - e.dir * 110; e.sy = H.sky(A, e.sx, A.p.y - 10); A.sfx('orbDash'); },
        update(e, dt, g, A) { const q = Math.min(1, e.t / 0.5); e.mx = U.lerp(e.sx, e.tx, q * q); e.my = U.lerp(e.sy, e.gy - 6, q * q); if (q >= 1 && !e.boom) { e.boom = true; A.blast(e, e.tx, e.gy - 8, 34 * H.sc(e)); A.shake(4, 0.3); for (let i = 0; i < 6; i++) A.spawn(e, TWINKLE, { x: e.tx + A.rnd(-20, 20), y: e.gy - A.rnd(4, 20) }); } },
        draw(e, ctx, ox, oy, A) {
          if (e.boom) return; const x = e.mx + ox, y = e.my + oy, r = Math.round(6 * H.sc(e)), d = e.dir;
          for (let i = 0; i < 14; i++) A.alpha(ctx, 1 - i / 14, () => A.disc(ctx, x - d * i * 3, y - i * 3, Math.max(1, r - i / 2), i < 4 ? '#ffffff' : e.pal.c));
          A.disc(ctx, x, y, r, '#5a4a6a', '#8a7a9a'); A.px(ctx, x - 2, y - 1, 2, 2, '#3a2a4a');
        },
      },
      {
        name: 'Constellation', dmg: 14, cd: 6, mp: 6, kind: 'custom', life: 1.3,
        desc: 'Place stars in the air ahead of you, then connect the dots. The lines hurt.',
        spawn(e, g, A) { H.at(e, A, 0); const n = e.up ? 6 : 5; e.pts = []; for (let i = 0; i < n; i++) e.pts.push({ x: e.x + e.dir * (20 + i * 22), y: e.y - 6 + ((i * 37) % 5 - 2) * 7 }); A.sfx('star'); },
        update(e, dt, g, A) { if (e.t > 0.5) { if (!e.lit) { e.lit = true; A.sfx('zap'); } for (let i = 0; i < e.pts.length - 1; i++) { const a = e.pts[i], b = e.pts[i + 1]; A.hit(e, { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) - 6, w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) + 12 }, { kb: 0.6 }); } } },
        draw(e, ctx, ox, oy, A) {
          const n = e.pts.length, f = e.t > 1 ? 1 - (e.t - 1) / 0.3 : 1;
          A.alpha(ctx, f, () => {
            e.pts.forEach((p, i) => { if (e.t > i * 0.08) A.star(ctx, p.x + ox, p.y + oy, 3, e.pal.c, '#ffffff'); });
            if (e.t > 0.5) { const k = Math.min(1, (e.t - 0.5) / 0.2) * (n - 1); for (let i = 0; i < Math.ceil(k); i++) { const a = e.pts[i], b = e.pts[i + 1], q = Math.min(1, k - i); A.line(ctx, a.x + ox, a.y + oy, U.lerp(a.x, b.x, q) + ox, U.lerp(a.y, b.y, q) + oy, i % 2 ? '#ffffff' : e.pal.l, 1); } }
          });
        },
      },
      {
        name: 'Nebula', dmg: 3, cd: 8, mp: 7, kind: 'custom', life: 4,
        desc: 'A swirling cloud of cosmic dust. Enemies inside see stars. Literally.',
        spawn(e, g, A) { H.at(e, A, 50, -6); A.sfx('whoosh'); },
        update(e, dt, g, A) { const R = 46 * H.sc(e); A.tickR(e, e.x, e.y, R, 0.45, { kb: 0 }); },
        draw(e, ctx, ox, oy, A) {
          const R = 46 * H.sc(e), x = e.x + ox, y = e.y + oy, f = A.fade(e, 0.3, 0.5);
          A.alpha(ctx, f * 0.5, () => { A.disc(ctx, x, y, Math.round(R * 0.9), e.pal.d); for (let i = 0; i < 5; i++) A.disc(ctx, x + Math.cos(e.t * 0.6 + i * 1.3) * R * 0.5, y + Math.sin(e.t * 0.6 + i * 1.3) * R * 0.3, Math.round(R * 0.35), i % 2 ? e.pal.c : '#ff7ad8'); });
          A.alpha(ctx, f, () => { for (let i = 0; i < 18; i++) { const a = e.t * 0.8 + i * 0.35, r = R * ((i * 13) % 10) / 10; if ((Math.floor(e.t * 5) + i) % 4) A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, 1, 1, '#ffffff'); } });
        },
      },
      {
        name: 'Comet Rush', dmg: 16, cd: 6, mp: 5, kind: 'custom', life: 0.32,
        desc: 'Turn into a comet and blast forward through everything in your path.',
        spawn(e, g, A) { const p = A.p; e.dir = p.facing; p.vx = e.dir * (120 * H.sc(e)) / 0.22; p.lungeT = 0.22; p.dashGrace = 0.3; A.sfx('orbDash'); e.trail = []; },
        update(e, dt, g, A) { const p = A.p; e.x = p.cx; e.y = p.y + 10; e.trail.unshift({ x: e.x, y: e.y }); if (e.trail.length > 12) e.trail.pop(); A.hit(e, { x: p.cx - 10, y: p.y, w: 20, h: 22 }, { kb: 1.4, dir: e.dir }); },
        draw(e, ctx, ox, oy, A) { e.trail.forEach((t, i) => A.alpha(ctx, 1 - i / 12, () => A.disc(ctx, t.x + ox, t.y + oy, Math.max(1, 7 - i / 2), i < 3 ? '#ffffff' : e.pal.c))); },
      },
      {
        name: 'Orbiting Planets', dmg: 8, cd: 11, mp: 7, kind: 'custom', life: 5,
        desc: 'Tiny planets orbit you and bonk anything that gets close.',
        spawn(e, g, A) { A.sfx('star'); e.pl = [['#c86a3a', false], ['#3aa0ff', false], ['#e8c87a', true]].concat(e.up ? [['#7ae05a', false]] : []); },
        update(e, dt, g, A) { const p = A.p; e.x = p.cx; e.y = p.y + 10; e.pl.forEach((pl, i) => { const a = e.t * 3 + (i / e.pl.length) * Math.PI * 2, px2 = e.x + Math.cos(a) * 26, py = e.y + Math.sin(a) * 12; A.tickR(e, px2, py, 6, 0.4, { kb: 1 }); }); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy; A.alpha(ctx, A.fade(e, 0.2, 0.3), () => { A.alpha(ctx, 0.3, () => A.ring(ctx, x, y, 26, e.pal.l, 12, 2)); e.pl.forEach((pl, i) => { const a = e.t * 3 + (i / e.pl.length) * Math.PI * 2; PLANET(ctx, A, x + Math.cos(a) * 26, y + Math.sin(a) * 12, 3, pl[0], pl[1]); }); }); },
      },
    ],
    ult: {
      name: 'Celestial Impact', dmg: 40,
      desc: 'Tear open the sky to outer space and pull down an enormous meteor. It hits. Everything is a crater now.',
      charge: {
        pose: 'raise', lift: 8,
        draw(ctx, x, y, k, t, A, P) {
          const sx = x + 4, sy = y - 44, r = 6 + k * 26;
          A.alpha(ctx, k, () => { A.disc(ctx, sx, sy, Math.round(r), '#05030f'); STARFIELD(ctx, A, sx - r, sy - r, r * 2, r * 2, t, 20); A.ring(ctx, sx, sy, r, P.c); A.ring(ctx, sx, sy, r + 2, P.l); });
          const pts = [[-20, -10], [-8, -26], [10, -20], [22, -6]]; pts.forEach(([dx, dy], i) => { if (k > i * 0.2) { A.star(ctx, x + dx, y + dy, 2, P.l, '#ffffff'); if (i) A.line(ctx, x + pts[i - 1][0], y + pts[i - 1][1], x + dx, y + dy, P.c); } });
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 2.6,
          spawn(e) { const t = A.near(p.cx, p.y, 260); e.tx = t ? A.center(t).x : p.cx + e.dir * 100; e.gy = A.ground(e.tx, p.y + 2); e.top = A.top(); A.sfx('orbDash'); A.sfx('rumble', { dur: 1.2 }); },
          update(e, dt, g, A) {
            if (e.t > 1 && !e.boom) { e.boom = true; A.blast(e, e.tx, e.gy - 20, 120 * H.sc(e), { dmg: e.dmg * 3 }); A.flash(0.6); A.shake(12, 0.7); A.sfx('boom'); for (let i = 0; i < 20; i++) A.spawn(e, TWINKLE, { x: e.tx + A.rnd(-90, 90), y: e.gy - A.rnd(0, 80), life: 1 }); }
            if (e.t < 1) A.shake(1 + e.t * 3, 0.1);
          },
          draw(e, ctx, ox, oy, A) {
            const tx = e.tx + ox, gy = e.gy + oy;
            if (!e.boom) {
              const q = e.t, mx = U.lerp(tx - e.dir * 160, tx, q * q), my = U.lerp(e.top + oy - 40, gy - 30, q * q), r = 30;
              A.alpha(ctx, 0.5 * q, () => A.ring(ctx, tx, gy - 2, 40 * q, e.pal.c, 6 * q));
              for (let i = 0; i < 20; i++) A.alpha(ctx, 1 - i / 20, () => A.disc(ctx, mx - e.dir * i * 6, my - i * 7, Math.max(2, r - i), i < 5 ? '#ffffff' : i < 10 ? e.pal.l : e.pal.c));
              A.disc(ctx, mx, my, r, '#4a3a5a', '#7a6a8a'); A.disc(ctx, mx - 8, my + 4, 5, '#3a2a4a'); A.disc(ctx, mx + 9, my - 6, 4, '#3a2a4a');
            } else {
              const k = (e.t - 1) / 1.6;
              A.alpha(ctx, 1 - k, () => { A.px(ctx, tx - 70, gy - 3, 140, 3, '#3a2a4a'); A.ring(ctx, tx, gy - 10, 40 + k * 140, '#ffffff', 10 + k * 30); A.ring(ctx, tx, gy - 10, 30 + k * 120, e.pal.c, 8 + k * 26); });
            }
          },
        }, {});
      },
    },
  };

  // ===================================================================== VOID
  const GLITCH = (ctx, A, x, y, w, h, t) => { for (let i = 0; i < 6; i++) { const yy = y + ((i * 13 + Math.floor(t * 30) * 7) % Math.max(1, h)); A.px(ctx, x + ((i * 7 + Math.floor(t * 20)) % 5) - 2, yy, w, 1, i % 2 ? '#ffffff' : '#a85cff'); } };
  const TEAR = (ctx, A, x, y, h, open, P) => { const w = Math.max(1, Math.round(open)); for (let yy = -h; yy <= h; yy++) { const q = 1 - Math.abs(yy) / h, ww = Math.max(1, Math.round(w * Math.sqrt(q))); A.px(ctx, x - ww - 1, y + yy, 1, 1, '#ffffff'); A.px(ctx, x + ww, y + yy, 1, 1, '#ffffff'); A.px(ctx, x - ww, y + yy, ww * 2, 1, '#000000'); if (yy % 5 === 0) A.px(ctx, x - ww - 2, y + yy, 1, 1, P.c); } };
  K.void = {
    status: 'erode', fx: 'void', block: ['Null Sphere', 'bubble'], dash: ['Phase Shift', 'blink'],
    m1: {
      name: 'Void Rend', dmg: 9, cd: 0.45, kind: 'custom', life: 0.28,
      desc: 'Rip a tear in reality right in front of you. Reality does not like that.',
      spawn(e, g, A) { H.at(e, A, 24, -2); A.sfx('whoosh', { minGap: 0.04 }); },
      update(e, dt, g, A) { const h = 16 * H.sc(e); A.hit(e, { x: e.x - 7, y: e.y - h, w: 14, h: h * 2 }, { kb: 0.4 }); },
      draw(e, ctx, ox, oy, A) { const k = e.t < 0.08 ? e.t / 0.08 : 1 - (e.t - 0.08) / 0.2; TEAR(ctx, A, e.x + ox, e.y + oy, Math.round(16 * H.sc(e)), 5 * k * H.sc(e), e.pal); },
    },
    s: [
      {
        name: 'Rift Tear', dmg: 4, cd: 7, mp: 6, kind: 'custom', life: 2.5,
        desc: 'Open a tall rift in space where your enemy stands. It slowly eats them.',
        spawn(e, g, A) { H.at(e, A, 0); const ax = A.aim(e, 140); e.x = ax !== null ? ax : e.x + e.dir * 50; e.gy = H.floor(A, e.x); e.y = e.gy - 20; A.sfx('surge'); },
        update(e, dt, g, A) { const h = 22 * H.sc(e); A.tick(e, { x: e.x - 10, y: e.y - h, w: 20, h: h * 2 }, 0.25, { kb: 0 }); for (const o of H.nearby(A, e.x, e.y, 50)) if (!o.t.tutorial) o.t.vx = U.approach(o.t.vx, Math.sign(e.x - o.c.x) * 40, 6, dt); },
        draw(e, ctx, ox, oy, A) { const k = Math.min(1, e.t / 0.2) * Math.min(1, (e.life - e.t) / 0.2); TEAR(ctx, A, e.x + ox, e.y + oy, Math.round(22 * H.sc(e)), 7 * k * H.sc(e), e.pal); GLITCH(ctx, A, e.x + ox - 10, e.y + oy - 22, 4, 44, e.t); },
      },
      {
        name: 'Erase', dmg: 22, cd: 6, mp: 6, kind: 'custom', life: 0.45,
        desc: 'Delete a strip of the world in front of you. It comes back. Enemies in it... partly.',
        spawn(e, g, A) { H.at(e, A, 4, -2); A.sfx('zap'); const L = 130 * H.sc(e); A.hit(e, { x: e.dir > 0 ? e.x : e.x - L, y: e.y - 8, w: L, h: 16 }, { kb: 0.2 }); },
        draw(e, ctx, ox, oy, A) {
          const L = 130 * H.sc(e), x0 = e.dir > 0 ? e.x + ox : e.x + ox - L, y = e.y + oy, k = e.t / e.life, h = 16 * (1 - k * k);
          A.px(ctx, x0, y - h / 2, L, h, '#000000'); A.px(ctx, x0, y - h / 2 - 1, L, 1, '#ffffff'); A.px(ctx, x0, y + h / 2, L, 1, '#ffffff');
          if (k < 0.5) GLITCH(ctx, A, x0, y - 8, L, 16, e.t);
        },
      },
      {
        name: 'Phase Walk', dmg: 14, cd: 6, mp: 5, kind: 'custom', life: 0.5,
        desc: 'Step out of reality and walk straight through enemies. They feel it. You do not.',
        spawn(e, g, A) { const p = A.p; e.dir = p.facing; p.vx = e.dir * (110 * H.sc(e)) / 0.3; p.lungeT = 0.3; p.dashGrace = 0.5; e.marks = []; A.sfx('dash'); },
        update(e, dt, g, A) { const p = A.p; if (e.t < 0.3) { e.marks.push({ x: p.cx, f: p.feet, t: e.t }); A.hit(e, { x: p.cx - 8, y: p.y, w: 16, h: 22 }, { kb: 0.2, onHit(t) { if (t.applyStatus) t.applyStatus('erode', e.potency); } }); } },
        draw(e, ctx, ox, oy, A) { for (const m of e.marks) { const a = 1 - (e.t - m.t) / 0.4; if (a > 0 && Math.round(m.t * 60) % 3 === 0) A.alpha(ctx, a, () => H.drawGhost(ctx, A, 'dash', m.x + ox, m.f + oy, e.dir, '#000000')); } },
      },
      {
        name: 'Annihilation Point', dmg: 30, cd: 8, mp: 7, kind: 'custom', life: 1.5,
        desc: 'Drop a single point of absolute nothing. It grows. Then everything near it stops existing for a moment.',
        spawn(e, g, A) { H.at(e, A, 40, -6); const ax = A.aim(e, 120); if (ax !== null) e.x = ax; A.sfx('cast'); },
        update(e, dt, g, A) { if (e.t > 0.9 && !e.pop) { e.pop = true; A.hitR(e, e.x, e.y, 34 * H.sc(e), { kb: 1.4 }); A.sfx('shockwave'); A.shake(4, 0.3); A.flash(0.15); } },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, R = 34 * H.sc(e);
          if (!e.pop) { const r = Math.max(1, Math.round(R * Math.pow(e.t / 0.9, 3))); A.disc(ctx, x, y, r, '#000000'); A.ring(ctx, x, y, r + 1, '#ffffff'); if (r < 3) A.px(ctx, x, y, 1, 1, '#ffffff'); for (let i = 0; i < 8; i++) { const a = i * 0.8 + e.t * 2, d = r + 10 - ((e.t * 30 + i * 3) % 10); A.px(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 1, 1, e.pal.c); } }
          else { const k = (e.t - 0.9) / 0.6; A.alpha(ctx, 1 - k, () => { A.ring(ctx, x, y, R + k * 20, '#ffffff', (R + k * 20) * 0.25); A.ring(ctx, x, y, R + k * 14, e.pal.c, (R + k * 14) * 0.25); }); }
        },
      },
      {
        name: 'Unmake', dmg: 18, cd: 9, mp: 6, kind: 'custom', life: 0.9,
        desc: 'Point at the nearest enemy and start un-making it. It is very confused about where its edges went.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 170); e.tg = t; if (!t) { e.dead = true; return; } A.damage(e, t, 1, 0); if (t.applyStatus) for (let i = 0; i < (e.up ? 4 : 3); i++) t.applyStatus('erode', e.potency); A.sfx('glassCrack'); },
        draw(e, ctx, ox, oy, A) {
          if (!e.tg || e.tg.dead) return; const b = e.tg.box, k = e.t / e.life;
          A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 10; i++) { const yy = b.y + ((i * 7 + Math.floor(e.t * 40)) % b.h); A.px(ctx, b.x + ox + ((i * 3) % 5) - 2 + (i % 2 ? 4 : -4), yy + oy, b.w, 1, i % 2 ? '#000000' : '#ffffff'); } A.ring(ctx, b.x + b.w / 2 + ox, b.y + b.h / 2 + oy, 14 - k * 10, e.pal.c); });
        },
      },
    ],
    ult: {
      name: 'Nullification', dmg: 40,
      desc: 'Open the void itself. Colour drains out of the world, everything nearby is erased from existence, and reality snaps back a moment later.',
      charge: {
        pose: 'clap', lift: 12,
        draw(ctx, x, y, k, t, A, P) {
          const r = Math.round(2 + k * 12), cx = x + 3, cy = y - 2;
          A.alpha(ctx, 0.5 * k, () => A.px(ctx, x - 300, y - 200, 600, 400, '#1a1a1a'));
          for (let i = 0; i < 24; i++) { const a = i * 0.26 + t, d = r + 30 * (1 - ((t * 1.5 + i / 24) % 1)); A.px(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1, 1, i % 3 ? '#ffffff' : P.c); }
          A.disc(ctx, cx, cy, r, '#000000'); A.ring(ctx, cx, cy, r + 1, '#ffffff');
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 2.6, layer: 'screen',
          spawn(e) { e.x = p.cx; e.y = p.y + 10; e.ts = H.nearby(A, e.x, e.y, 220).map((o) => o.t); A.sfx('surge'); },
          update(e, dt, g, A) {
            if (e.t > 0.3 && e.t < 1.6) A.tickR(e, e.x, e.y, 220 * Math.min(1, (e.t - 0.3) / 0.4), 0.2, { mult: 0.25, kb: 0, onHit(t) { if (t.applyStatus) t.applyStatus('erode', e.potency); } });
            if (e.t > 1.6 && !e.snap) { e.snap = true; for (const t of e.ts) if (!t.dead) A.damage(e, t, 2.5, 1); A.sfx('glassCrack'); A.sfx('boom'); A.flash(0.6); A.shake(9, 0.5); }
          },
          draw(e, ctx, ox, oy, A) {
            const x = e.x + ox, y = e.y + oy;
            // the world goes grey and inverted
            if (e.t < 1.65) { const k = Math.min(1, e.t / 0.3); ctx.save(); ctx.globalAlpha = k; ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(-10, -10, 2000, 2000); ctx.globalCompositeOperation = 'difference'; ctx.globalAlpha = k * 0.85; ctx.fillStyle = '#ffffff'; ctx.fillRect(-10, -10, 2000, 2000); ctx.restore(); }
            const R = 220 * Math.min(1, Math.max(0, e.t - 0.3) / 0.4);
            if (e.t < 1.6 && R > 0) { A.ring(ctx, x, y, R, '#000000', R * 0.6, 1); for (const t of e.ts) if (!t.dead) { const b = t.box; GLITCH(ctx, A, b.x + ox, b.y + oy, b.w, b.h, e.t); } }
            if (e.snap) { const k = (e.t - 1.6) / 1; A.alpha(ctx, 1 - k, () => { A.ring(ctx, x, y, 30 + k * 260, '#ffffff', (30 + k * 260) * 0.6, 2); for (let i = 0; i < 14; i++) { const yy = y - 120 + i * 18; A.px(ctx, x - 300, yy + ((i * 7) % 5), 600, 1, i % 2 ? '#ffffff' : e.pal.c); } }); }
          },
        }, {});
      },
    },
  };

  // ================================================================== PSYCHIC
  const RIPPLE = (ctx, A, x, y, r, col) => { A.ring(ctx, x, y, r, col, r * 0.7); A.ring(ctx, x, y, r * 0.6, col, r * 0.42); };
  const THOUGHTS = ['did i leave the oven on', 'what is my purpose', 'i forgot why i came in here', 'is cereal a soup', 'my mum is calling', 'wait who am i', 'i should drink water', 'that one embarrassing thing from 2009'];
  K.psychic = {
    status: 'confuse', fx: 'ripples', block: ['Psi Barrier', 'shield'], dash: ['Teleport', 'blink'],
    m1: {
      name: 'Mind Spike', dmg: 7, cd: 0.4, kind: 'custom', life: 0.01,
      desc: 'Fire a pulse of pure thought. It looks like ripples. It feels like a brain freeze.',
      spawn(e, g, A) { H.at(e, A, 8, -1); A.sfx('cast', { minGap: 0.04 }); A.spawn(e, H.proj((b, ctx, ox, oy, A) => { const r = 3 + Math.sin(b.t * 30) * 1.5; RIPPLE(ctx, A, b.x + ox, b.y + oy, r * H.sc(b), b.pal.c); A.px(ctx, b.x + ox, b.y + oy, 1, 1, '#ffffff'); }, { life: 0.9, r: 5 }), { vx: e.dir * 230 }); },
    },
    s: [
      {
        name: 'Telekinesis', dmg: 22, cd: 6, mp: 6, kind: 'custom', life: 1.1,
        desc: 'Lift the nearest enemy into the air with your mind... then SLAM it into the floor.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 160); e.tg = t; if (!t) { e.dead = true; return; } holdStun(t, 1.1); e.oy0 = t.y; A.sfx('hover'); },
        update(e, dt, g, A) {
          const t = e.tg; if (!t || t.dead) { e.dead = true; return; }
          if (t.tutorial) { if (e.t > 0.75 && !e.slam) { e.slam = true; A.damage(e, t, 1, 0); } return; }
          if (e.t < 0.65) { t.vy = -60; t.vx = 0; }
          else if (!e.slam) { t.vy = 600; if (e.t > 0.75) { e.slam = true; A.damage(e, t, 1, 0.2); A.sfx('crash'); A.shake(4, 0.25); } }
        },
        draw(e, ctx, ox, oy, A) { if (!e.tg) return; const c = A.center(e.tg); A.alpha(ctx, e.slam ? 1 - (e.t - 0.75) / 0.35 : 0.8, () => { RIPPLE(ctx, A, c.x + ox, c.y + oy, 12 + Math.sin(e.t * 20) * 2, e.pal.c); A.line(ctx, A.p.cx + ox + A.p.facing * 4, A.p.y + oy + 6, c.x + ox, c.y + oy, e.pal.l); }); },
      },
      {
        name: 'Psi Blades', dmg: 10, cd: 5, mp: 5, kind: 'custom', life: 1.6,
        desc: 'Three glowing blades appear above you, then fly at enemies one after another.',
        spawn(e, g, A) { e.bl = [-1, 0, 1].map((s, i) => ({ s, i })); A.sfx('cast'); },
        update(e, dt, g, A) {
          const p = A.p;
          for (const b of e.bl) {
            if (b.gone) continue;
            if (!b.vx) { b.x = p.cx + b.s * 10; b.y = p.y - 6 - Math.abs(b.s) * -3; if (e.t > 0.3 + b.i * 0.12) { const t = A.near(b.x, b.y, 180), c = t ? A.center(t) : { x: b.x + p.facing * 100, y: b.y + 10 }, a = Math.atan2(c.y - b.y, c.x - b.x); b.vx = Math.cos(a) * 320; b.vy = Math.sin(a) * 320; A.sfx('whoosh', { minGap: 0.04 }); } }
            else { b.x += b.vx * dt; b.y += b.vy * dt; const hit = A.targets().find((t) => Phys().rectsOverlap(t.box, { x: b.x - 3, y: b.y - 3, w: 6, h: 6 })); if (hit) { A.damage(e, hit, 1, 0.5); b.gone = true; } else if (A.solid(b.x, b.y)) b.gone = true; }
          }
        },
        draw(e, ctx, ox, oy, A) { for (const b of e.bl) if (!b.gone && b.x !== undefined) { const a = b.vx ? Math.atan2(b.vy, b.vx) : -Math.PI / 2, c = Math.cos(a), s = Math.sin(a), x = b.x + ox, y = b.y + oy; A.line(ctx, x - c * 6, y - s * 6, x + c * 5, y + s * 5, e.pal.c, 2); A.line(ctx, x - c * 4, y - s * 4, x + c * 6, y + s * 6, '#ffffff', 1); } },
      },
      {
        name: 'Mind Blast', dmg: 12, cd: 6, mp: 6, kind: 'custom', life: 0.5,
        desc: 'A wave of psychic noise blasts out in front of you. Everything it hits gets confused.',
        spawn(e, g, A) { H.at(e, A, 4, -2); A.sfx('shockwave'); },
        update(e, dt, g, A) { const R = 80 * H.sc(e) * Math.min(1, e.t / 0.3); A.hit(e, { x: e.dir > 0 ? e.x : e.x - R, y: e.y - R * 0.5, w: R, h: R }, { kb: 1, onHit(t) { if (t.applyStatus) t.applyStatus('confuse', e.potency); } }); },
        draw(e, ctx, ox, oy, A) { const R = 80 * H.sc(e) * Math.min(1, e.t / 0.3), x = e.x + ox, y = e.y + oy; A.alpha(ctx, 1 - e.t / e.life, () => { for (let i = 0; i < 4; i++) { const r = R - i * 12; if (r > 0) A.arc(ctx, x, y, r, e.dir, i % 2 ? e.pal.c : e.pal.up || '#ffffff', 1, -0.9, 0.9); } }); },
      },
      {
        name: 'Intrusive Thought', dmg: 20, cd: 8, mp: 6, kind: 'custom', life: 2,
        desc: 'Put a random intrusive thought into the nearest enemy\'s head. It stops fighting to think about it.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 170); e.tg = t; if (!t) { e.dead = true; return; } e.txt = THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)]; holdStun(t, e.up ? 2 : 1.4); if (t.applyStatus) t.applyStatus('confuse', e.potency); A.sfx('pop'); },
        update(e, dt, g, A) { if (!e.tg || e.tg.dead) { e.dead = true; return; } if (e.t > 1.1 && !e.pop) { e.pop = true; A.damage(e, e.tg, 1, 0.3); A.sfx('pop'); } },
        draw(e, ctx, ox, oy, A) {
          if (!e.tg || e.pop) return; const c = A.center(e.tg), x = c.x + ox, y = e.tg.box.y + oy - 18, w = ERX.Font.measure ? ERX.Font.measure(e.txt) + 8 : e.txt.length * 4 + 8;
          A.px(ctx, x - w / 2, y - 8, w, 11, '#ffffff'); A.px(ctx, x - w / 2 - 1, y - 7, 1, 9, '#ffffff'); A.px(ctx, x + w / 2, y - 7, 1, 9, '#ffffff');
          A.px(ctx, x - 3, y + 5, 3, 2, '#ffffff'); A.px(ctx, x - 5, y + 9, 2, 2, '#ffffff');
          ERX.Font.draw(ctx, e.txt, Math.round(x), Math.round(y - 6), { color: '#3a1a3a', align: 'center' });
        },
      },
      {
        name: 'Debris Storm', dmg: 8, cd: 8, mp: 7, kind: 'custom', life: 1.6,
        desc: 'Rip chunks of floor up with your mind and fling them at your enemies.',
        spawn(e, g, A) { const p = A.p; e.rocks = []; for (let i = 0; i < (e.up ? 6 : 4); i++) { const x = p.cx + (i - 1.5) * 10; e.rocks.push({ x, y: A.ground(x, p.y + 2), gy: A.ground(x, p.y + 2), i }); } A.sfx('crash'); },
        update(e, dt, g, A) {
          const p = A.p;
          for (const r of e.rocks) {
            if (r.gone) continue;
            if (!r.vx) { r.y = U.approach(r.y, p.y - 10 - (r.i % 2) * 6, 8, dt); if (e.t > 0.4 + r.i * 0.1) { const t = A.near(r.x, r.y, 200), c = t ? A.center(t) : { x: r.x + p.facing * 100, y: r.y }, a = Math.atan2(c.y - r.y, c.x - r.x); r.vx = Math.cos(a) * 280; r.vy = Math.sin(a) * 280; A.sfx('whoosh', { minGap: 0.04 }); } }
            else { r.x += r.vx * dt; r.y += r.vy * dt; const hit = A.targets().find((t) => Phys().rectsOverlap(t.box, { x: r.x - 4, y: r.y - 4, w: 8, h: 8 })); if (hit) { A.damage(e, hit, 1, 0.6); r.gone = true; A.puff(e, r.x, r.y, 4); } else if (A.solid(r.x, r.y)) { r.gone = true; A.puff(e, r.x, r.y, 4); } }
          }
        },
        draw(e, ctx, ox, oy, A) { for (const r of e.rocks) if (!r.gone) { const x = r.x + ox, y = r.y + oy; A.px(ctx, x - 3, y - 3, 7, 6, '#7a6a5a'); A.px(ctx, x - 3, y - 3, 7, 1, '#9a8a7a'); if (!r.vx) A.alpha(ctx, 0.6, () => A.ring(ctx, x, y, 6, e.pal.c, 3)); } },
      },
    ],
    ult: {
      name: 'Cerebral Collapse', dmg: 24,
      desc: 'Seize every enemy with your mind, lift them high, crush them together in mid-air, then hurl the whole mess into the ground.',
      charge: {
        pose: 'raiseBoth', lift: 6,
        draw(ctx, x, y, k, t, A, P) {
          for (let i = 0; i < 4; i++) { const r = ((t * 40 + i * 12) % 48) * k; A.alpha(ctx, 1 - r / 48, () => RIPPLE(ctx, A, x, y - 14, r, i % 2 ? P.c : '#ffffff')); }
          for (let i = 0; i < 6; i++) { const a = t * 2 + i, d = 26; A.px(ctx, x + Math.cos(a) * d - 2, y + 8 - k * 18 + Math.sin(a * 2) * 4, 4, 3, '#7a6a5a'); }
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 2.6,
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 260).map((o) => o.t); const c = e.ts[0] ? A.center(e.ts[0]) : { x: p.cx + e.dir * 80, y: p.y }; e.mx = c.x; e.my = p.y - 50; for (const t of e.ts) holdStun(t, 2.2); A.sfx('hover'); },
          update(e, dt, g, A) {
            for (const t of e.ts) {
              if (t.dead || t.tutorial) continue; const c = A.center(t);
              if (e.t < 0.6) { t.vy = -120; t.vx = 0; }
              else if (e.t < 1.4) { t.vx = (e.mx - c.x) * 6; t.vy = (e.my - c.y) * 6; }
              else if (e.t < 1.7) { t.vx = 0; t.vy = 700; }
            }
            if (e.t > 1.2 && !e.crush) { e.crush = true; for (const t of e.ts) if (!t.dead) A.damage(e, t, 2, 0); A.sfx('crash'); A.shake(5, 0.3); }
            if (e.t > 1.6 && !e.slam) { e.slam = true; for (const t of e.ts) if (!t.dead) A.damage(e, t, 3, 0.4); A.sfx('boom'); A.shake(10, 0.5); A.flash(0.4); }
          },
          draw(e, ctx, ox, oy, A) {
            for (const t of e.ts) if (!t.dead && e.t < 1.7) { const c = A.center(t); RIPPLE(ctx, A, c.x + ox, c.y + oy, 12 + Math.sin(e.t * 18) * 2, e.pal.c); A.alpha(ctx, 0.5, () => A.line(ctx, p.cx + ox, p.y + oy, c.x + ox, c.y + oy, e.pal.l)); }
            if (e.t > 1.1 && e.t < 1.5) A.alpha(ctx, (1.5 - e.t) / 0.4, () => RIPPLE(ctx, A, e.mx + ox, e.my + oy, 10 + (e.t - 1.1) * 80, '#ffffff'));
            if (e.slam) { const k = (e.t - 1.6) / 1; A.alpha(ctx, 1 - k, () => { const gy = A.ground(e.mx, e.my) + oy; A.ring(ctx, e.mx + ox, gy, 20 + k * 120, e.pal.c, (20 + k * 120) * 0.2, 1); A.ring(ctx, e.mx + ox, gy, 10 + k * 90, '#ffffff', (10 + k * 90) * 0.2, 1); }); }
          },
        }, {});
      },
    },
  };

  // ================================================================== CRYSTAL
  const GEM = (ctx, A, x, y, w, h, P, hi) => { for (let yy = 0; yy < h; yy++) { const q = yy / h, hw = Math.max(0.5, (w / 2) * (q < 0.3 ? q / 0.3 : 1 - (q - 0.3) / 0.7 * 0.3)); A.px(ctx, x - hw, y - h + yy, hw, 1, hi ? '#ffffff' : P.l); A.px(ctx, x, y - h + yy, hw, 1, P.c); } A.px(ctx, x - 1, y - h + 1, 1, Math.max(1, h / 3), '#ffffff'); };
  const PRISM = ['#ff5a5a', '#ffb83a', '#ffe95a', '#5fd84a', '#3aa0ff', '#c86aff'];
  const SHARD = (b, ctx, ox, oy, A) => { const x = b.x + ox, y = b.y + oy, a = Math.atan2(b.vy, b.vx), c = Math.cos(a), s = Math.sin(a); A.line(ctx, x - c * 4, y - s * 4, x + c * 3, y + s * 3, b.pal.c, 2); A.px(ctx, x + c * 3, y + s * 3, 1, 1, '#ffffff'); };
  K.crystal = {
    status: 'crystallize', fx: 'glints', block: ['Crystal Wall', 'wall'], dash: ['Prism Dash', 'ghost'],
    m1: {
      name: 'Crystal Shard', dmg: 7, cd: 0.4, kind: 'custom', life: 0.01,
      desc: 'Flick a spinning diamond of crystal.',
      spawn(e, g, A) { H.at(e, A, 8, -1); A.sfx('glassCrack', { minGap: 0.05 }); A.spawn(e, H.proj((b, ctx, ox, oy, A) => { const x = b.x + ox, y = b.y + oy, s = Math.abs(Math.cos(b.t * 20)) * (b.up ? 4 : 3) + 1; A.px(ctx, x - s / 2, y - 3, s, 6, b.pal.c); A.px(ctx, x - s / 2, y - 3, Math.max(1, s / 2), 3, '#ffffff'); }, { life: 1, r: 4 }), { vx: e.dir * 260 }); },
    },
    s: [
      {
        name: 'Crystal Spire', dmg: 20, cd: 5, mp: 6, kind: 'custom', life: 1.2,
        desc: 'A cluster of huge crystals erupts under the nearest enemy.',
        spawn(e, g, A) { H.at(e, A, 0); const ax = A.aim(e, 150); e.tx = ax !== null ? ax : e.x + e.dir * 50; e.gy = H.floor(A, e.tx); A.sfx('glassCrack'); },
        update(e, dt, g, A) { const k = Math.min(1, e.t / 0.12), h = 40 * H.sc(e) * k; if (e.t < 0.8) A.hit(e, { x: e.tx - 12, y: e.gy - h, w: 24, h }, { kb: 0.8, onHit(t) { if (t.applyStatus) t.applyStatus('launch', 0); } }); if (e.t > 0.9 && !e.sh) { e.sh = true; A.sfx('shatter'); for (let i = 0; i < 6; i++) A.spawn(e, H.proj(SHARD, { life: 0.5, r: 2 }), { x: e.tx, y: e.gy - 20, vx: A.rnd(-150, 150), vy: A.rnd(-200, -40), dmg: e.dmg * 0.25 }); } },
        draw(e, ctx, ox, oy, A) { if (e.sh) return; const k = Math.min(1, e.t / 0.12), s = H.sc(e), x = e.tx + ox, gy = e.gy + oy; GEM(ctx, A, x - 9, gy, 8, 24 * k * s, e.pal); GEM(ctx, A, x + 9, gy, 8, 28 * k * s, e.pal); GEM(ctx, A, x, gy, 12, 40 * k * s, e.pal); },
      },
      {
        name: 'Prism Beam', dmg: 12, cd: 6, mp: 6, kind: 'custom', life: 0.6,
        desc: 'Shoot light through a crystal prism. It splits into a rainbow of three beams.',
        spawn(e, g, A) { H.at(e, A, 20, -2); A.sfx('zap'); },
        update(e, dt, g, A) { H.at(e, A, 20, -2); const L = 110 * H.sc(e); for (const a of [-0.22, 0, 0.22]) { const tx = e.x + Math.cos(a) * L * e.dir, ty = e.y + Math.sin(a) * L; A.hit(e, { x: Math.min(e.x, tx), y: Math.min(e.y, ty) - 3, w: Math.abs(tx - e.x), h: Math.abs(ty - e.y) + 6 }, { kb: 0.5 }); } },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, L = 110 * H.sc(e), f = 1 - Math.max(0, e.t - 0.4) / 0.2, p = A.p;
          A.alpha(ctx, f, () => {
            A.line(ctx, p.cx + ox + e.dir * 4, y, x, y, '#ffffff', 1);
            [-0.22, 0, 0.22].forEach((a, i) => { for (let j = 0; j < 2; j++) A.line(ctx, x, y + j, x + Math.cos(a) * L * e.dir, y + Math.sin(a) * L + j, PRISM[i * 2 + j], 1); });
            A.tri(ctx, x, y + 4, 8, 9, e.pal.c, '#ffffff');
          });
        },
      },
      {
        name: 'Shard Nova', dmg: 8, cd: 7, mp: 6, kind: 'custom', life: 0.4,
        desc: 'Crystals grow all over you, then explode outward in every direction.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx; e.y = p.y + 10; A.sfx('glassCrack'); },
        update(e, dt, g, A) { if (e.t > 0.25 && !e.go) { e.go = true; A.sfx('shatter'); const n = e.up ? 16 : 12; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; A.spawn(e, H.proj(SHARD, { life: 0.6, r: 3 }), { x: e.x, y: e.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240 }); } } },
        draw(e, ctx, ox, oy, A) { if (e.go) return; const k = e.t / 0.25, x = e.x + ox, y = e.y + oy; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, d = 6 + k * 6; A.line(ctx, x + Math.cos(a) * 4, y + Math.sin(a) * 6, x + Math.cos(a) * d, y + Math.sin(a) * d * 1.3, i % 2 ? e.pal.c : '#ffffff', 2); } },
      },
      {
        name: 'Crystal Turret', dmg: 6, cd: 11, mp: 7, kind: 'custom', life: 5,
        desc: 'Grow a crystal that shoots refracted light at anything nearby.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx - p.facing * 14; e.gy = A.ground(e.x, p.y + 2); e.st = 0.4; A.sfx('glassCrack'); },
        update(e, dt, g, A) {
          e.st -= dt; e.beam = Math.max(0, (e.beam || 0) - dt);
          if (e.st <= 0) { const t = A.near(e.x, e.gy - 16, 160); if (t) { e.st = e.up ? 0.45 : 0.7; const c = A.center(t); e.bt = c; e.beam = 0.1; e.col = PRISM[Math.floor(Math.random() * PRISM.length)]; A.damage(e, t, 1, 0.2); A.sfx('tick', { value: 100, minGap: 0.05 }); } else e.st = 0.2; }
        },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, gy = e.gy + oy, k = Math.min(1, e.t / 0.3); A.alpha(ctx, A.fade(e, 0.1, 0.4), () => { GEM(ctx, A, x, gy, 10, 22 * k, e.pal); if (e.beam && e.bt) { A.line(ctx, x, gy - 18, e.bt.x + ox, e.bt.y + oy, e.col, 2); A.line(ctx, x, gy - 18, e.bt.x + ox, e.bt.y + oy, '#ffffff', 1); } }); },
      },
      {
        name: 'Geode Bomb', dmg: 16, cd: 6, mp: 6, kind: 'custom', life: 0.01,
        desc: 'Lob a dull rock. It cracks open on landing and a ring of crystal spikes bursts out.',
        spawn(e, g, A) {
          H.at(e, A, 8, -4); A.sfx('swing');
          A.spawn(e, H.proj((b, ctx, ox, oy, A) => { A.disc(ctx, b.x + ox, b.y + oy, 4, '#6a6a7a', '#8a8a9a'); A.px(ctx, b.x + ox - 1, b.y + oy, 2, 1, b.pal.c); }, { life: 1.6, r: 4, gravity: 340, onHit(b, A) {
            A.spawn(b, { life: 0.8, spawn(s) { s.gy = A.ground(s.x, s.y - 8); A.sfx('glassCrack'); }, update(s, dt, g, A) { const R = 34 * H.sc(s); if (s.t < 0.5) A.hit(s, { x: s.x - R, y: s.gy - 18, w: R * 2, h: 18 }, { kb: 1 }); }, draw(s, ctx, ox, oy, A) { const R = 34 * H.sc(s), k = Math.min(1, s.t / 0.1), f = s.t > 0.5 ? 1 - (s.t - 0.5) / 0.3 : 1; A.alpha(ctx, f, () => { A.disc(ctx, s.x + ox, s.gy + oy - 3, 4, '#6a6a7a', s.pal.c); for (let i = -3; i <= 3; i++) GEM(ctx, A, s.x + ox + (i / 3) * R, s.gy + oy, 6, (16 - Math.abs(i) * 3) * k, s.pal, i === 0); }); } }, { x: b.x, y: b.y });
          } }), { vx: e.dir * 170, vy: -170 });
        },
      },
    ],
    ult: {
      name: 'Prismatic Cataclysm', dmg: 16,
      desc: 'Giant crystals erupt and encase every enemy. Light refracts through them into a storm of rainbow beams, then they all shatter at once.',
      charge: {
        pose: 'raiseBoth', lift: 0,
        draw(ctx, x, y, k, t, A, P) {
          for (let i = 0; i < 7; i++) { const dx = (i - 3) * 8, h = (10 + (3 - Math.abs(i - 3)) * 8) * Math.min(1, k * 2 - Math.abs(i - 3) * 0.15); if (h > 0) GEM(ctx, A, x + dx, y + 14, 7, h, P, i === 3); }
          if (k > 0.5) PRISM.forEach((c, i) => { const a = -Math.PI / 2 + (i - 2.5) * 0.25 + Math.sin(t * 3) * 0.1; A.line(ctx, x, y - 14, x + Math.cos(a) * 40 * k, y - 14 + Math.sin(a) * 40 * k, c, 1); });
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 2.6,
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 260).map((o) => o.t); if (!e.ts.length) e.fake = { x: p.cx + e.dir * 80, y: p.y + 10 }; for (const t of e.ts) { holdStun(t, 1.9); if (t.applyStatus) t.applyStatus('encase', 0); } A.sfx('glassCrack'); A.shake(3, 0.3); e.beams = []; e.bt = 0; },
          update(e, dt, g, A) {
            e.bt -= dt; for (const b of e.beams) b.t += dt;
            const live = e.ts.filter((t) => !t.dead);
            if (e.t > 0.4 && e.t < 1.6 && e.bt <= 0) { e.bt = 0.07; const t = live[Math.floor(Math.random() * Math.max(1, live.length))]; const c = t ? A.center(t) : e.fake; const a = Math.random() * Math.PI * 2; e.beams.push({ x0: c.x + Math.cos(a) * 200, y0: c.y + Math.sin(a) * 120, x1: c.x, y1: c.y, col: PRISM[e.beams.length % 6], t: 0 }); if (t) A.damage(e, t, 0.5, 0); A.sfx('zap', { minGap: 0.05 }); }
            if (e.t > 1.7 && !e.sh) { e.sh = true; A.sfx('shatter'); A.flash(0.5); A.shake(8, 0.5); for (const t of live) { const c = A.center(t); A.blast(e, c.x, c.y, 40 * H.sc(e), { dmg: e.dmg * 3 }); for (let i = 0; i < 10; i++) A.spawn(e, H.proj(SHARD, { life: 0.6, r: 2 }), { x: c.x, y: c.y, vx: A.rnd(-200, 200), vy: A.rnd(-240, 60), dmg: 0 }); } }
          },
          draw(e, ctx, ox, oy, A) {
            if (!e.sh) for (const t of e.ts) if (!t.dead) { const b = t.box, k = Math.min(1, e.t / 0.2); GEM(ctx, A, b.x + b.w / 2 + ox, b.y + b.h + oy + 2, b.w + 14, (b.h + 16) * k, e.pal); }
            for (const b of e.beams) if (b.t < 0.15) A.alpha(ctx, 1 - b.t / 0.15, () => { A.line(ctx, b.x0 + ox, b.y0 + oy, b.x1 + ox, b.y1 + oy, b.col, 2); A.line(ctx, b.x0 + ox, b.y0 + oy, b.x1 + ox, b.y1 + oy, '#ffffff', 1); });
          },
        }, {});
      },
    },
  };

  // ===================================================================== MOON
  const CRESCENT = (ctx, A, x, y, r, d, col, col2, a0) => { a0 = a0 || 0; for (let i = 0; i <= 24; i++) { const a = a0 + U.lerp(-1.7, 1.7, i / 24), w = Math.sin((i / 24) * Math.PI) * r * 0.45; for (let j = 0; j < w; j++) A.px(ctx, x + Math.cos(a) * (r - j) * d, y + Math.sin(a) * (r - j), 1, 1, j < 1 ? col2 : col); } };
  const ZZZ = { life: 1.2, update(e, dt) { e.y -= 16 * dt; e.x += Math.sin(e.t * 4) * 8 * dt; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => ERX.Font.draw(ctx, 'z', Math.round(e.x + ox), Math.round(e.y + oy), { color: e.pal.l })); } };
  K.moon = {
    status: 'sleep', fx: 'moonbeams', block: ['Lunar Ward', 'shield'], dash: ['Moonwalk', 'ghost'],
    m1: {
      name: 'Crescent Wave', dmg: 7, cd: 0.42, kind: 'custom', life: 0.01,
      desc: 'Throw a thin silver crescent that cuts through the air.',
      spawn(e, g, A) { H.at(e, A, 8, -1); A.sfx('swing', { minGap: 0.04 }); A.spawn(e, H.proj((b, ctx, ox, oy, A) => CRESCENT(ctx, A, b.x + ox, b.y + oy, b.up ? 9 : 7, Math.sign(b.vx), b.pal.c, '#ffffff'), { life: 0.8, r: 6, pierce: true }), { vx: e.dir * 240 }); },
    },
    s: [
      {
        name: 'Moonbeam', dmg: 12, cd: 6, mp: 6, kind: 'custom', life: 1.4,
        desc: 'A soft beam of moonlight falls on the nearest enemy. It gets very, very sleepy.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 170); e.tg = t; H.at(e, A, 0); e.tx = t ? A.center(t).x : e.x + e.dir * 60; e.gy = H.floor(A, e.tx); e.top = H.sky(A, e.tx, e.gy - 8); A.sfx('star'); },
        update(e, dt, g, A) { if (e.t > 0.4 && !e.done) { e.done = true; A.hit(e, { x: e.tx - 10, y: e.top, w: 20, h: e.gy - e.top }, { kb: 0, onHit(t) { if (t.applyStatus) t.applyStatus('sleep', e.potency); for (let i = 0; i < 3; i++) A.spawn(e, ZZZ, { x: A.center(t).x + i * 3, y: t.box.y - i * 5 }); } }); } },
        draw(e, ctx, ox, oy, A) { const x = e.tx + ox, top = e.top + oy, gy = e.gy + oy, w = e.t < 0.4 ? 2 : 10 * H.sc(e), f = A.fade(e, 0.1, 0.5); A.alpha(ctx, f * 0.6, () => { A.px(ctx, x - w, top, w * 2, gy - top, e.pal.c); A.px(ctx, x - w / 3, top, w / 1.5, gy - top, '#ffffff'); }); A.alpha(ctx, f, () => A.ring(ctx, x, gy - 1, w + 4, e.pal.l, 2)); },
      },
      {
        name: 'Lunar Phases', dmg: 9, cd: 8, mp: 6, kind: 'custom', life: 2.2,
        desc: 'The four phases of the moon orbit you, then fire one by one: new, half, gibbous, FULL.',
        spawn(e, g, A) { A.sfx('star'); e.ph = [0, 1, 2, 3].map((i) => ({ i })); },
        update(e, dt, g, A) {
          const p = A.p;
          for (const m of e.ph) {
            if (m.gone) continue;
            if (!m.vx) { const a = e.t * 4 + m.i * Math.PI / 2; m.x = p.cx + Math.cos(a) * 18; m.y = p.y + 8 + Math.sin(a) * 10; if (e.t > 0.6 + m.i * 0.2) { const t = A.near(m.x, m.y, 200), c = t ? A.center(t) : { x: m.x + p.facing * 100, y: m.y }, a2 = Math.atan2(c.y - m.y, c.x - m.x); m.vx = Math.cos(a2) * 260; m.vy = Math.sin(a2) * 260; A.sfx('whoosh', { minGap: 0.04 }); } }
            else { m.x += m.vx * dt; m.y += m.vy * dt; const hit = A.targets().find((t) => Phys().rectsOverlap(t.box, { x: m.x - 4, y: m.y - 4, w: 8, h: 8 })); if (hit) { A.damage(e, hit, 0.6 + m.i * 0.4, 0.4); if (m.i === 3 && hit.applyStatus) hit.applyStatus('sleep', e.potency); m.gone = true; } else if (A.solid(m.x, m.y)) m.gone = true; }
          }
        },
        draw(e, ctx, ox, oy, A) { for (const m of e.ph) if (!m.gone && m.x !== undefined) { const x = m.x + ox, y = m.y + oy; A.disc(ctx, x, y, 4, '#2a2e4a'); if (m.i === 3) A.disc(ctx, x, y, 4, e.pal.c, '#ffffff'); else if (m.i > 0) for (let yy = -4; yy <= 4; yy++) { const w = Math.round(Math.sqrt(16 - yy * yy)); const lit = m.i === 1 ? w : Math.round(w * 1.6); A.px(ctx, x + w - Math.min(lit, w * 2), y + yy, Math.min(lit, w * 2), 1, e.pal.c); } else A.ring(ctx, x, y, 4, e.pal.d); } },
      },
      {
        name: 'Dream Haze', dmg: 2, cd: 10, mp: 7, kind: 'custom', life: 4,
        desc: 'A sleepy purple haze. Anything that stays in it for too long nods off.',
        spawn(e, g, A) { H.at(e, A, 46); e.gy = H.floor(A, e.x); e.in = new Map(); A.sfx('whoosh'); },
        update(e, dt, g, A) {
          const R = 44 * H.sc(e); A.tick(e, { x: e.x - R, y: e.gy - R, w: R * 2, h: R }, 0.5, { kb: 0 });
          for (const t of A.targets()) { const c = A.center(t), inside = Math.abs(c.x - e.x) < R && c.y > e.gy - R; const v = inside ? (e.in.get(t.uid) || 0) + dt : 0; e.in.set(t.uid, v); if (v > 1.2 && t.applyStatus && !t.status.sleep) { t.applyStatus('sleep', e.potency); e.in.set(t.uid, -3); A.spawn(e, ZZZ, { x: c.x, y: t.box.y }); } }
        },
        draw(e, ctx, ox, oy, A) { const R = 44 * H.sc(e), x = e.x + ox, gy = e.gy + oy; A.alpha(ctx, A.fade(e, 0.3, 0.5) * 0.45, () => { for (let i = 0; i < 9; i++) A.disc(ctx, x + Math.sin(i * 2.3 + e.t * 0.5) * R * 0.8, gy - 8 - ((i * 11) % (R * 0.8)), 8 + (i % 3) * 2, i % 2 ? '#8a7ab8' : e.pal.c); }); if (Math.floor(e.t * 2) % 2) A.text(ctx, 'z', x + Math.sin(e.t) * 10, gy - R * 0.6, e.pal.l); },
      },
      {
        name: 'Lunar Leap', dmg: 22, cd: 7, mp: 6, kind: 'custom', life: 1.4,
        desc: 'Jump like gravity is moon-gravity, then crash down with a crescent shockwave.',
        spawn(e, g, A) { const p = A.p; p.vy = -330; p.vx = p.facing * 90; e.dir = p.facing; A.sfx('jump'); e.air = true; },
        update(e, dt, g, A) {
          const p = A.p;
          if (e.t > 0.3 && !e.down) { e.down = true; p.vy = 420; }
          if (e.down && !e.land && p.onGround) { e.land = true; e.lt = e.t; e.x = p.cx; e.gy = p.feet; A.hitR(e, e.x, e.gy - 6, 46 * H.sc(e), { kb: 1.4, onHit(t) { if (t.applyStatus) t.applyStatus('launch', 0); } }); A.sfx('crash'); A.shake(4, 0.25); }
          if (e.land && e.t - e.lt > 0.5) e.dead = true;
        },
        draw(e, ctx, ox, oy, A) {
          const p = A.p;
          if (!e.land) { A.alpha(ctx, 0.5, () => CRESCENT(ctx, A, p.cx + ox, p.y + oy + 10, 14, p.facing, e.pal.c, '#ffffff', Math.PI / 2)); return; }
          const k = (e.t - e.lt) / 0.5, R = 46 * H.sc(e) * Math.min(1, k * 3);
          A.alpha(ctx, 1 - k, () => { for (const s of [-1, 1]) CRESCENT(ctx, A, e.x + ox + s * R * 0.7, e.gy + oy - 6, 10, s, e.pal.c, '#ffffff'); A.px(ctx, e.x + ox - R, e.gy + oy - 1, R * 2, 1, e.pal.l); });
        },
      },
      {
        name: 'Silver Arrow', dmg: 24, cd: 6, mp: 6, kind: 'custom', life: 1,
        desc: 'Draw a bow of moonlight and fire a silver arrow that pierces everything in a line.',
        spawn(e, g, A) { H.at(e, A, 6, -2); e.vx = e.dir * 420; A.sfx('whoosh'); },
        update(e, dt, g, A) { if (e.t < 0.2) { H.at(e, A, 6, -2); return; } if (!e.fired) { e.fired = true; A.sfx('zap'); } const r = H.fly(e, dt, A, { r: 3, pierce: true, kb: 0.7 }); if (r === 'wall') e.dead = true; },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, d = e.dir;
          if (!e.fired) { A.arc(ctx, x - d * 6, y, 10, d, e.pal.c, 1, -1.2, 1.2); A.line(ctx, x - d * 2, y - 9, x - d * (2 + e.t * 30), y, '#ffffff'); A.line(ctx, x - d * (2 + e.t * 30), y, x - d * 2, y + 9, '#ffffff'); A.line(ctx, x - d * (2 + e.t * 30), y, x + d * 8, y, e.pal.l); return; }
          A.line(ctx, x - d * 14, y, x, y, e.pal.l, 1); A.tri(ctx, x + d * 2, y + 2, 4, 0, '#ffffff'); A.px(ctx, x + d, y - 2, 2, 5, '#ffffff'); A.px(ctx, x - d * 14, y - 2, 2, 5, e.pal.c);
          A.alpha(ctx, 0.4, () => A.line(ctx, x - d * 50, y, x - d * 14, y, e.pal.c));
        },
      },
    ],
    ult: {
      name: 'Lunar Execution', dmg: 26,
      desc: 'Night falls instantly and an enormous full moon rises. You leap up into its light and come down with a single gigantic crescent slash.',
      charge: {
        pose: 'raise', lift: 24,
        draw(ctx, x, y, k, t, A, P) {
          A.alpha(ctx, 0.5 * k, () => A.px(ctx, x - 300, y - 200, 600, 400, '#0a0c24'));
          const mx = x - 10, my = y - 30, r = Math.round(6 + k * 22);
          A.glow(ctx, mx, my, r + 4, P.c, 0.25); A.disc(ctx, mx, my, r, '#e8ecff', '#ffffff'); A.disc(ctx, mx - r * 0.3, my + r * 0.2, Math.max(1, Math.round(r * 0.18)), '#c8ccf0'); A.disc(ctx, mx + r * 0.35, my - r * 0.3, Math.max(1, Math.round(r * 0.12)), '#c8ccf0');
          CRESCENT(ctx, A, x + 4, y - 18, 8 + k * 6, 1, P.c, '#ffffff', -Math.PI / 2);
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 2.4, layer: 'screen',
          spawn(e) { const t = A.near(p.cx, p.y, 260); e.tg = t; e.c = t ? A.center(t) : { x: p.cx + e.dir * 90, y: p.y + 10 }; e.gy = A.ground(e.c.x, p.y + 2); e.sx = p.cx; A.sfx('surge'); },
          update(e, dt, g, A) {
            if (e.t > 0.7 && !e.slash) { e.slash = true; const nx = e.c.x + e.dir * 20 - p.w / 2; if (!Phys().overlapsSolid(A.g.level, nx, p.y, p.w, p.h)) p.x = nx; A.hit(e, { x: Math.min(e.sx, e.c.x) - 30, y: e.gy - 120, w: Math.abs(e.c.x - e.sx) + 60, h: 120 }, { mult: 4, kb: 2, onHit(t) { if (t.applyStatus) t.applyStatus('sleep', e.potency); } }); A.sfx('shockwave'); A.flash(0.4); A.shake(8, 0.5); }
          },
          draw(e, ctx, ox, oy, A) {
            const dark = e.t < 1.6 ? Math.min(1, e.t * 4) * 0.7 : Math.max(0, 0.7 - (e.t - 1.6) * 1);
            A.alpha(ctx, dark, () => A.px(ctx, -10, -10, 2000, 2000, '#0a0c24'));
            const top = A.top() + oy, mx = e.c.x + ox - e.dir * 40, my = top + 60 + 30 * (1 - Math.min(1, e.t / 0.6)), r = 46;
            A.alpha(ctx, Math.min(1, dark * 1.5), () => { A.glow(ctx, mx, my, r + 10, '#d8dcff', 0.25); A.disc(ctx, mx, my, r, '#e8ecff', '#ffffff'); A.disc(ctx, mx - 14, my + 8, 8, '#c8ccf0'); A.disc(ctx, mx + 16, my - 12, 6, '#c8ccf0'); A.disc(ctx, mx + 6, my + 20, 5, '#c8ccf0'); });
            if (e.t < 0.7) { const q = e.t / 0.7; A.alpha(ctx, 0.8, () => H.drawGhost(ctx, A, 'jump', U.lerp(e.sx, mx - ox, q * 0.6) + ox, U.lerp(p.feet, my - oy + 40, Math.sin(q * Math.PI / 2)) + oy, e.dir, '#ffffff')); }
            if (e.slash && e.t < 1.4) { const k = (e.t - 0.7) / 0.7; A.alpha(ctx, 1 - k, () => { CRESCENT(ctx, A, e.c.x + ox, e.gy + oy - 50, 70 + k * 10, e.dir, e.pal.c, '#ffffff', 0.3); CRESCENT(ctx, A, e.c.x + ox, e.gy + oy - 50, 56 + k * 10, e.dir, '#ffffff', '#ffffff', 0.3); }); }
          },
        }, {});
      },
    },
  };

  // ==================================================================== SOLAR
  const SUN = (ctx, A, x, y, r, t, P) => { A.glow(ctx, x, y, r + 3, P.c, 0.3); for (let i = 0; i < 12; i++) { const a = t * 2 + (i / 12) * Math.PI * 2, l = r + 3 + Math.sin(t * 10 + i * 2) * 2; A.line(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a) * l, y + Math.sin(a) * l, i % 2 ? P.c : P.l); } A.disc(ctx, x, y, r, P.c, '#fff8d0'); };
  const FLARE = { life: 0.5, update(e, dt) { e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= 1 - dt * 3; e.vy *= 1 - dt * 3; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => A.px(ctx, e.x + ox, e.y + oy, 2, 2, e.t < 0.2 ? '#ffffff' : e.pal.c)); } };
  K.solar = {
    status: 'sunburn', fx: 'flares', block: ['Sun Shield', 'shield'], dash: ['Solar Dash', 'trail'],
    m1: {
      name: 'Solar Disc', dmg: 8, cd: 0.42, kind: 'custom', life: 0.01,
      desc: 'Throw a spinning disc of sunlight. Hot. Very hot. Do not catch it.',
      spawn(e, g, A) { H.at(e, A, 8, -1); A.sfx('ignite', { minGap: 0.05 }); A.spawn(e, H.proj((b, ctx, ox, oy, A) => { const x = b.x + ox, y = b.y + oy, w = Math.abs(Math.cos(b.t * 18)) * 4 + 2, s = H.sc(b); A.alpha(ctx, 0.5, () => A.px(ctx, x - w * s, y - 1, w * 2 * s, 2, b.pal.l)); A.px(ctx, x - w / 2 * s, y - 3 * s, w * s, 6 * s, b.pal.c); A.px(ctx, x - 1, y - 1, 2, 2, '#ffffff'); }, { life: 0.9, r: 4 }), { vx: e.dir * 250 }); },
    },
    s: [
      {
        name: 'Sunbeam Sweep', dmg: 6, cd: 6, mp: 6, kind: 'custom', life: 0.8,
        desc: 'A blazing beam sweeps from the sky down across the floor in front of you.',
        spawn(e, g, A) { H.at(e, A, 4, -4); A.sfx('zap'); },
        update(e, dt, g, A) { H.at(e, A, 4, -4); const q = Math.min(1, e.t / 0.6), a = U.lerp(-1.1, 0.5, q), L = 110 * H.sc(e); e.a = a; for (let r = 8; r < L; r += 6) A.tickR(e, e.x + Math.cos(a) * r * e.dir, e.y + Math.sin(a) * r, 8, 0.15, { kb: 0.2 }); },
        draw(e, ctx, ox, oy, A) { const L = 110 * H.sc(e), x = e.x + ox, y = e.y + oy, a = e.a || -1.1, tx = x + Math.cos(a) * L * e.dir, ty = y + Math.sin(a) * L; A.line(ctx, x, y, tx, ty, e.pal.c, 5); A.line(ctx, x, y, tx, ty, e.pal.l, 3); A.line(ctx, x, y, tx, ty, '#ffffff', 1); A.disc(ctx, x, y, 4, '#ffffff'); },
      },
      {
        name: 'Corona', dmg: 10, cd: 8, mp: 6, kind: 'custom', life: 2,
        desc: 'Flames of the sun\'s corona flare out around you in pulses.',
        spawn(e, g, A) { A.sfx('ignite'); },
        update(e, dt, g, A) { const p = A.p; e.x = p.cx; e.y = p.y + 10; const ph = (e.t * 2.5) % 1; if (ph < 0.25) A.tickR(e, e.x, e.y, 22 + ph * 4 * 24 * H.sc(e), 0.38, { kb: 0.9 }); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, ph = (e.t * 2.5) % 1, R = 22 + Math.min(1, ph * 4) * 24 * H.sc(e); A.alpha(ctx, A.fade(e, 0.1, 0.3), () => { A.alpha(ctx, 1 - ph, () => { for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2 + e.t, l = R + Math.sin(i * 3 + e.t * 9) * 4; A.line(ctx, x + Math.cos(a) * (R - 6), y + Math.sin(a) * (R - 6), x + Math.cos(a) * l, y + Math.sin(a) * l, i % 2 ? e.pal.c : e.pal.l, 2); } }); A.ring(ctx, x, y, 18, e.pal.l); }); },
      },
      {
        name: 'Solar Wind', dmg: 10, cd: 6, mp: 5, kind: 'custom', life: 0.7,
        desc: 'A stream of charged particles from the sun blows enemies away and gives them sunburn.',
        spawn(e, g, A) { H.at(e, A, 4, -2); A.sfx('whoosh'); for (let i = 0; i < 30; i++) A.spawn(e, FLARE, { x: e.x, y: e.y + A.rnd(-16, 16), vx: e.dir * A.rnd(200, 360), vy: A.rnd(-30, 30), life: 0.5 }); },
        update(e, dt, g, A) { const L = 110 * H.sc(e); A.hit(e, { x: e.dir > 0 ? e.x : e.x - L, y: e.y - 18, w: L, h: 36 }, { kb: 2.4, dir: e.dir }); },
        draw(e, ctx, ox, oy, A) { const L = 110 * H.sc(e); A.alpha(ctx, 0.3 * (1 - e.t / e.life), () => { for (let i = 0; i < 6; i++) A.px(ctx, e.dir > 0 ? e.x + ox : e.x + ox - L, e.y + oy - 16 + i * 6 + Math.sin(e.t * 20 + i) * 2, L, 1, i % 2 ? e.pal.c : e.pal.l); }); },
      },
      {
        name: 'Sunspot', dmg: 28, cd: 7, mp: 6, kind: 'custom', life: 1.4,
        desc: 'A dark spot appears on the floor. A moment later a solar flare erupts out of it.',
        spawn(e, g, A) { H.at(e, A, 0); const ax = A.aim(e, 150); e.tx = ax !== null ? ax : e.x + e.dir * 60; e.gy = H.floor(A, e.tx); A.sfx('tick', { value: 50 }); },
        update(e, dt, g, A) { if (e.t > 0.6 && !e.go) { e.go = true; A.hitR(e, e.tx, e.gy - 20, 30 * H.sc(e), { kb: 1.4, onHit(t) { if (t.applyStatus) t.applyStatus('launch', 0); } }); A.sfx('ignite'); A.shake(3, 0.3); for (let i = 0; i < 20; i++) { const a = -Math.PI / 2 + A.rnd(-0.6, 0.6); A.spawn(e, FLARE, { x: e.tx, y: e.gy - 2, vx: Math.cos(a) * A.rnd(100, 250), vy: Math.sin(a) * A.rnd(100, 250) }); } } },
        draw(e, ctx, ox, oy, A) {
          const x = e.tx + ox, gy = e.gy + oy;
          if (!e.go) { const r = 4 + (e.t / 0.6) * 8; A.alpha(ctx, 0.8, () => { A.px(ctx, x - r, gy - 1, r * 2, 2, '#3a1a0a'); A.px(ctx, x - r * 0.5, gy - 1, r, 1, '#1a0a00'); }); return; }
          const k = (e.t - 0.6) / 0.8, h = 70 * H.sc(e) * Math.min(1, k * 5);
          A.alpha(ctx, 1 - k, () => { for (let yy = 0; yy < h; yy++) { const w = 8 * (1 - yy / h) * H.sc(e) + 2, sx = Math.sin(yy * 0.12 + e.t * 10) * 4; A.px(ctx, x - w + sx, gy - yy, w * 2, 1, yy % 5 < 2 ? e.pal.l : e.pal.c); } });
        },
      },
      {
        name: 'Mini Sun', dmg: 5, cd: 12, mp: 7, kind: 'custom', life: 4,
        desc: 'Summon a tiny sun that follows the nearest enemy and slowly cooks it.',
        spawn(e, g, A) { e.x = A.p.cx; e.y = A.p.y - 10; A.sfx('ignite'); },
        update(e, dt, g, A) { const t = A.near(e.x, e.y, 260); if (t) { const c = A.center(t); e.x = U.approach(e.x, c.x, 3, dt); e.y = U.approach(e.y, t.box.y - 16, 3, dt); } A.tickR(e, e.x, e.y + 14, 18 * H.sc(e), 0.3, { kb: 0 }); if (Math.random() < dt * 10) A.spawn(e, FLARE, { x: e.x, y: e.y, vx: A.rnd(-40, 40), vy: A.rnd(-40, 40) }); },
        draw(e, ctx, ox, oy, A) { A.alpha(ctx, A.fade(e, 0.2, 0.4), () => { SUN(ctx, A, e.x + ox, e.y + oy, Math.round(5 * H.sc(e)), e.t, e.pal); A.alpha(ctx, 0.25, () => A.tri(ctx, e.x + ox, e.y + oy + 30, 30 * H.sc(e), 26, e.pal.l)); }); },
      },
    ],
    ult: {
      name: 'Solar Flare', dmg: 30,
      desc: 'Rise into the sky and become a miniature sun, then release a colossal solar flare that scorches the entire battlefield.',
      charge: {
        pose: 'raiseBoth', lift: 32,
        draw(ctx, x, y, k, t, A, P) { SUN(ctx, A, x, y - 2, Math.round(6 + k * 16), t, P); for (let i = 0; i < 8; i++) { const a = i * 0.8 + t * 3, d = 50 * (1 - ((t * 2 + i / 8) % 1)); A.px(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 2, 2, P.l); } },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 2.2, layer: 'screen',
          spawn(e) { e.x = p.cx; e.y = p.y + 10; A.sfx('boom'); A.sfx('ignite'); A.flash(0.8); A.shake(10, 0.8); },
          update(e, dt, g, A) {
            const R = 320 * Math.min(1, e.t / 0.6);
            A.hitR(e, e.x, e.y, R, { mult: 3, kb: 2, onHit(t) { if (t.applyStatus) { t.applyStatus('sunburn', e.potency); t.applyStatus('dazzle', 0); } } });
            if (e.t > 0.6) A.tickR(e, e.x, e.y, 320, 0.3, { mult: 0.3, kb: 0 });
          },
          draw(e, ctx, ox, oy, A) {
            const x = e.x + ox, y = e.y + oy, R = 320 * Math.min(1, e.t / 0.6), f = e.t > 1.4 ? 1 - (e.t - 1.4) / 0.8 : 1;
            A.alpha(ctx, f * 0.35, () => A.px(ctx, -10, -10, 2000, 2000, '#ffd070'));
            A.alpha(ctx, f, () => {
              for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2 + e.t * 0.5, l = R * (0.7 + 0.3 * Math.sin(i * 5 + e.t * 8)); A.line(ctx, x + Math.cos(a) * 20, y + Math.sin(a) * 20, x + Math.cos(a) * l, y + Math.sin(a) * l, i % 2 ? e.pal.c : e.pal.l, 3); }
              A.ring(ctx, x, y, R, '#ffffff', R, 2); A.ring(ctx, x, y, R * 0.9, e.pal.c, R * 0.9, 2);
              SUN(ctx, A, x, y, 20 * (1 - e.t / 2.2) + 4, e.t, e.pal);
            });
          },
        }, {});
      },
    },
  };

  // ============================================================ UPGRADED M1s + DASHES
  // (see kits-1.js: M1+ swaps in m1Up, DASH+ adds dashUp; same colours, just bigger, faster, stronger, more detailed)
  {
    const W = () => ERX.AwkHelp;
    /** Children spawned where something was just hit shouldn't hit that same thing again straight away. */
    const spare = (child, from) => { for (const id of from.hit) child.hit.add(id); for (const id of from.hitT.keys()) child.hit.add(id); return child; };

    // -------------------------------------------------------------- COSMIC
    K.cosmic.m1Up = {
      name: 'Spiral Galaxy', dmg: 4, cd: 0.55, kind: 'custom', life: 0.8,
      desc: 'Throw a tiny spinning galaxy. Its arms drag enemies in and grind them up, and it ends in a burst of stars.',
      spawn(e, g, A) { H.at(e, A, 14, -3); e.vx = e.dir * 100; },
      update(e, dt, g, A) {
        const s = H.sc(e), R = 16 * s;
        e.x += e.vx * dt * 1.2;
        A.tickR(e, e.x, e.y, R, 0.15, { kb: 0 });
        for (const o of H.nearby(A, e.x, e.y, R * 1.6)) H.shove(A, o.t, Math.sign(e.x - o.c.x) * Math.min(Math.abs(e.x - o.c.x), 40 * dt), 0);
        if (A.solid(e.x, e.y)) e.dead = true;
      },
      onEnd(e, A) {
        const s = H.sc(e);
        e.hit.clear(); A.hitR(e, e.x, e.y, 18 * s, { mult: 1.2, kb: 0.8 });
        for (let i = 0; i < 8; i++) A.spawn(e, TWINKLE, { x: e.x + A.rnd(-14, 14), y: e.y + A.rnd(-10, 10) });
        A.sfx('pop');
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), x = e.x + ox, y = e.y + oy, R = 16 * s, rot = e.t * 5 * e.dir;
        A.alpha(ctx, A.fade(e, 0.1, 0.12), () => {
          A.glow(ctx, x, y, R * 0.35, P.c, 0.14);
          for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 26; i++) {   // two spiral arms, dusted with stars
            const q = i / 26, a = rot + arm * Math.PI + q * 3.6, r = R * q;
            A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.55, q < 0.3 ? 2 : 1, 1, q < 0.25 ? '#ffffff' : i % 3 ? P.c : P.l);
            if (i % 5 === 0) A.px(ctx, x + Math.cos(a + 0.2) * r, y + Math.sin(a + 0.2) * r * 0.55 - 1, 1, 1, '#ffffff');
          }
          A.disc(ctx, x, y, Math.round(2 * s), '#ffffff');
        });
      },
    };
    const STARDROP = {
      life: 1.2,
      spawn(e, g, A) { e.gy = A.ground(e.x, e.ty - 4); e.y = e.ty - 60; e.vy = 260; },
      update(e, dt, g, A) {
        if (e.t < e.delay) return;
        e.vy += 600 * dt; e.y += e.vy * dt;
        if (e.y >= e.gy - 3) { A.hitR(e, e.x, e.gy - 6, 10 * H.sc(e), { kb: 0.5 }); A.spawn(e, TWINKLE, { x: e.x, y: e.gy - 4 }); H.sparks(A, e.x, e.gy - 2, 5, e.pal.l, 60); e.dead = true; }
      },
      draw(e, ctx, ox, oy, A) {
        if (e.t < e.delay) return;
        const x = e.x + ox, y = e.y + oy, s = H.sc(e);
        A.line(ctx, x, y, x - 2, y - 12, e.pal.c, 1); A.line(ctx, x, y, x - 1, y - 6, e.pal.l, 1);
        A.star(ctx, x, y, Math.round(2 * s), '#ffffff', e.pal.l);
      },
    };
    K.cosmic.dashUp = {
      name: 'Stardust Trail', dmg: 6, life: 0.3,
      desc: 'Leave a trail of stardust behind you. A moment later, little stars come raining down all along it.',
      update(e, dt, g, A) {
        if (H.dashing(e, A)) { if (Math.random() < 0.6) { const q = H.end(e); A.spawn(e, TWINKLE, { x: q.x + A.rnd(-3, 3), y: q.y + A.rnd(-8, 8) }); } return; }
        if (!e.rained) { e.rained = true; let i = 0; H.along(e, 9, (x, y, f) => { A.spawn(e, STARDROP, { x: x + A.rnd(-2, 2), ty: f, delay: 0.05 + i * 0.05 }); i++; }); }
      },
    };

    // ---------------------------------------------------------------- VOID
    K.void.m1Up = {
      name: 'Oblivion Lance', dmg: 13, cd: 0.5, kind: 'custom', life: 0.32,
      desc: 'Thrust a lance of pure nothing straight ahead. Whatever it touches gets a little bit erased.',
      spawn(e, g, A) {
        H.at(e, A, 6, -1);
        const s = H.sc(e), L = 110 * s;
        let d = 0;
        while (d < L && !A.solid(e.x + e.dir * d, e.y)) d += 4;
        e.len = Math.min(d, L);
        A.hit(e, { x: e.dir > 0 ? e.x : e.x - e.len, y: e.y - 6 * s, w: e.len, h: 12 * s }, { dir: e.dir, kb: 0.6 });
        A.sfx('zap', { minGap: 0.04 });
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), x0 = e.x + ox, y = e.y + oy, x1 = x0 + e.dir * e.len, k = e.t / e.life;
        const w = Math.max(1, Math.round((k < 0.2 ? 1 : 1 - (k - 0.2) / 0.8) * 5 * s));
        A.line(ctx, x0, y, x1, y, '#ffffff', w + 2);   // a white edge round a line of nothing
        A.line(ctx, x0, y, x1, y, '#05020a', w);
        for (let i = 0; i < e.len; i += 5) if ((i * 7 + Math.floor(e.t * 40)) % 4 === 0) A.px(ctx, x0 + e.dir * i, y + (((i * 13) % 5) - 2) * s, 2, 1, P.c);   // static crawling along it
        GLITCH(ctx, A, x1 - 3, y - 6 * s, 6, 12 * s, e.t);
        TEAR(ctx, A, x1, y, Math.max(2, Math.round(7 * s * (1 - k * 0.6))), 2 * s * (1 - k), P);
      },
    };
    K.void.dashUp = {
      name: 'Reality Zipper', dmg: 14, life: 0.8,
      desc: 'Your dash unzips reality. Then it zips itself back up, catching anything stuck in the gap. Ow.',
      update(e, dt, g, A) {
        if (H.dashing(e, A)) return;
        if (!e.S) { e.S = H.span(e); e.zy = e.pts[0].y; }
        const S = e.S, k = U.clamp((H.since(e) - 0.18) / 0.25, 0, 1);
        e.zk = k; e.zx = e.dir > 0 ? S.x0 + (S.x1 - S.x0) * k : S.x1 - (S.x1 - S.x0) * k;
        if (k > 0 && k < 1) A.hitR(e, e.zx, e.zy, 12 * H.sc(e), { kb: 0.4 });
        if (k >= 1 && !e.snap) { e.snap = true; A.sfx('pop'); A.shake(1.5, 0.1); }
      },
      draw(e, ctx, ox, oy, A) {
        if (!e.pts) return;
        const P = e.pal, s = H.sc(e), out = e.snap ? Math.max(0, 1 - (H.since(e) - 0.43) / 0.2) : 1;
        if (out <= 0) return;
        const S = e.S || H.span(e), y = (e.zy !== undefined ? e.zy : e.pts[0].y) + oy;
        A.alpha(ctx, out, () => {
          for (let x = Math.floor(S.x0); x <= S.x1; x += 2) {   // two rows of teeth, open (with nothing between them) until the pull goes past
            const closed = e.zx === undefined ? !e.over : e.dir > 0 ? x < e.zx : x > e.zx, gap = closed ? 0 : 3 * s, odd = (x / 2) % 2 ? 1 : 0;
            if (!closed) A.px(ctx, x + ox, y - gap, 2, gap * 2, '#05020a');
            A.px(ctx, x + ox, y - gap - 2 + odd, 2, 2, P.c);
            A.px(ctx, x + ox, y + gap + odd, 2, 2, P.l);
          }
          if (e.zx !== undefined && e.zk < 1) { const zx = e.zx + ox; A.px(ctx, zx - 2, y - 3, 4, 6, '#ffffff'); A.px(ctx, zx - 1, y + 3, 2, 4, P.c); }   // the zipper pull
        });
      },
    };

    // ------------------------------------------------------------- PSYCHIC
    K.psychic.m1Up = {
      name: 'Migraine', dmg: 6, cd: 0.5, kind: 'custom', life: 0.45,
      desc: 'Squeeze the head of the nearest enemy with your mind. Three times. They will need a lie down.',
      spawn(e, g, A) {
        H.at(e, A, 0, -2);
        const o = H.nearby(A, e.x, e.y, 120 * H.sc(e)).find((n) => (n.c.x - e.x) * e.dir > -4);
        e.tg = o ? o.t : null; e.fx = e.x + e.dir * 50; e.fy = e.y; e.n = 0;
      },
      update(e, dt, g, A) {
        if (e.tg && !e.tg.dead) { const b = e.tg.box; e.fx = b.x + b.w / 2; e.fy = b.y + 3; }
        while (e.n < 3 && e.t >= 0.1 + e.n * 0.12) { e.hit.clear(); A.hitR(e, e.fx, e.fy + 4, 10 * H.sc(e), { kb: 0.1 }); A.sfx('zap', { minGap: 0.03 }); e.n++; }
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), x = e.fx + ox, y = e.fy + oy, ph = Math.max(0, (e.t - 0.1) % 0.12) / 0.12, R = (10 - ph * 5) * s;
        A.alpha(ctx, A.fade(e, 0.05, 0.1), () => {
          A.ring(ctx, x, y, R, P.c, R * 0.45); A.ring(ctx, x, y, R + 1, P.l, (R + 1) * 0.45, 2);   // the ring squeezing their head
          for (let i = 0; i < 6; i++) { const a = e.t * 9 + i * 1.05; A.line(ctx, x + Math.cos(a) * R, y + Math.sin(a) * R * 0.45, x + Math.cos(a) * (R + 4 * s), y + Math.sin(a) * (R + 4 * s) * 0.45, '#ffffff', 1); }
          for (let i = 0; i < 10; i++) { const q = i / 10; A.px(ctx, U.lerp(e.x + ox, x, q), U.lerp(e.y + oy, y, q) + Math.sin(q * 12 - e.t * 30) * 2, 1, 1, i % 2 ? P.l : P.c); }   // a thread of thought from you to them
          if (e.n >= 1) A.text(ctx, '!!!'.slice(0, e.n), x, y - 14 * s, P.l);
        });
      },
    };
    K.psychic.dashUp = {
      name: 'Mind Skip', dmg: 11, life: 0.9,
      desc: 'Skip straight through their minds. Everyone you pass forgets what they were doing, and the end of the dash ripples outward.',
      update(e, dt, g, A) {
        if (H.dashing(e, A)) { H.dashBody(e, A, { kb: 0.3, mult: 0.6, onHit: (t) => { (e.bubbles = e.bubbles || []).push({ t: e.t, tg: t, s: e.bubbles.length ? '?' : THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)] }); } }); return; }
        if (!e.rip) { e.rip = e.t; const q = H.end(e); e.hit.clear(); A.hitR(e, q.x, q.y, 22 * H.sc(e), { kb: 1 }); }
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e);
        if (e.rip) { const k = (e.t - e.rip) / 0.35, q = H.end(e); if (k < 1) A.alpha(ctx, 1 - k, () => { RIPPLE(ctx, A, q.x + ox, q.y + oy, (6 + k * 18) * s, P.c); RIPPLE(ctx, A, q.x + ox, q.y + oy, (3 + k * 12) * s, P.l); }); }
        if (e.bubbles) for (const b of e.bubbles) { const k = (e.t - b.t) / 0.9, bx = b.tg.box; if (k < 1) A.alpha(ctx, Math.min(1, (1 - k) * 3), () => A.text(ctx, b.s, bx.x + bx.w / 2 + ox, bx.y - 8 + oy - k * 8, P.l)); }
      },
    };

    // ------------------------------------------------------------- CRYSTAL
    const SPLINTER = H.proj(SHARD, { life: 0.35, r: 3 });
    K.crystal.m1Up = {
      name: 'Shatter Spike', dmg: 6, cd: 0.5, kind: 'custom', life: 0.9,
      desc: 'Fire a spike of crystal. It drills into the first thing it hits, then shatters into shards. Ouch, then OUCH.',
      spawn(e, g, A) { H.at(e, A, 8, -1); e.vx = e.dir * 300; A.sfx('swing'); },
      update(e, dt, g, A) {
        if (!e.stuck) {
          e.x += e.vx * dt * 1.2;
          const t = A.near(e.x, e.y, 6 * H.sc(e));
          if (t) { e.stuck = t; e.st = e.t; const c = A.center(t); e.dx = e.x - c.x; e.dy = e.y - c.y; e.hit.add(t.uid); }
          else if (A.solid(e.x, e.y) || e.t > 0.45) e.dead = true;
          return;
        }
        const t = e.stuck;
        if (!t.dead) { const c = A.center(t); e.x = c.x + e.dx; e.y = c.y + e.dy; }
        const n = Math.min(3, Math.floor((e.t - e.st) / 0.1) + 1);
        if (n > (e.n || 0) && !t.dead) { e.n = n; A.damage(e, t, 1, 0.05); H.sparks(A, e.x, e.y, 3, e.pal.l, 50); }
        if (e.t - e.st > 0.32 || t.dead) e.dead = true;
      },
      onEnd(e, A) {
        if (!e.stuck) return;
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; spare(A.spawn(e, SPLINTER, { x: e.x, y: e.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, dmg: e.dmg * 0.8 }), e); }
        A.sfx('pop'); A.spawn(e, W().SHOCK, { x: e.x, y: e.y, r: 12 * H.sc(e) });
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), x = e.x + ox, y = e.y + oy, d = e.dir, spin = e.stuck ? (e.t - e.st) * 50 : 0, L = Math.round(9 * s), wob = Math.sin(spin) * 1.5;
        for (let i = 0; i < L; i++) { const h = Math.max(1, (1 - i / L) * 4 * s); A.px(ctx, x - d * (L - i) + (d < 0 ? -1 : 0), y - h / 2 + wob * (i / L), 1, h, i > L * 0.7 ? '#ffffff' : i % 2 ? P.c : P.l); }   // a long faceted spike, rattling as it drills
        A.px(ctx, x - d * L, y - 2 * s, 1, 4 * s, P.d);
        if (e.stuck) A.ring(ctx, x, y, 3 + Math.abs(Math.sin(spin)) * 3, P.l);
      },
    };
    K.crystal.dashUp = {
      name: 'Gem Graft', dmg: 12, life: 0.9,
      desc: 'Anything you dash through sprouts a crystal. Half a second later, every crystal shatters at once.',
      update(e, dt, g, A) {
        e.gems = e.gems || [];
        if (H.dashing(e, A)) H.dashBody(e, A, { kb: 0.2, mult: 0.4, onHit: (t) => { const c = A.center(t); e.gems.push({ t, dx: A.rnd(-3, 3), dy: A.rnd(-6, 0), at: e.t, x: c.x, y: c.y }); } });
        for (const gm of e.gems) {
          if (!gm.t.dead) { const c = A.center(gm.t); gm.x = c.x + gm.dx; gm.y = c.y + gm.dy; }
          if (!gm.pop && e.t - gm.at > 0.45) { gm.pop = e.t; if (!gm.t.dead) A.damage(e, gm.t, 1.2, 0.6); H.sparks(A, gm.x, gm.y, 10, e.pal.l, 110); A.sfx('pop', { minGap: 0.03 }); }
        }
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e);
        if (e.gems) for (const gm of e.gems) {
          const x = gm.x + ox, y = gm.y + oy;
          if (!gm.pop) { const k = Math.min(1, (e.t - gm.at) / 0.12), sh = e.t - gm.at > 0.3 && Math.floor(e.t * 30) % 2 ? 1 : 0; GEM(ctx, A, x + sh, y + 4, 7 * s * k, 12 * s * k, P, true); continue; }
          const k = (e.t - gm.pop) / 0.25;
          if (k < 1) A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 6; i++) { const a = i * 1.05, r = (3 + k * 14) * s; A.tri(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, 3, 4, P.c, '#ffffff'); } });
        }
        if (e.pts && !e.over) { const p = A.p; for (let i = 0; i < 4; i++) A.star(ctx, p.cx - e.dir * (6 + i * 6) + ox, p.y + 6 + (i % 2) * 8 + oy, 1, i % 2 ? P.l : '#ffffff'); }   // glints in your wake
      },
    };

    // ---------------------------------------------------------------- MOON
    K.moon.m1Up = {
      name: 'Moon Bounce', dmg: 8, cd: 0.5, kind: 'custom', life: 1.2,
      desc: 'Bounce a little moon along the ground. Every time it lands, a ring of moonlight sends everything nearby to sleep.',
      spawn(e, g, A) { H.at(e, A, 8, -4); e.vx = e.dir * 120; e.vy = -150; e.b = 0; e.rings = []; },
      update(e, dt, g, A) {
        if (e.gone) return;
        const s = H.sc(e), r = 5 * s;
        e.vy += 700 * dt; e.x += e.vx * dt * 1.2; e.y += e.vy * dt;
        if (A.solid(e.x + e.dir * r, e.y)) { e.gone = true; e.life = e.t + 0.3; return; }
        const gy = A.ground(e.x, e.y - r);
        if (e.vy > 0 && e.y + r >= gy) {
          e.y = gy - r; e.vy = -210; e.b++;
          e.hit.clear(); A.hitR(e, e.x, gy - 6, 15 * s, { kb: 0.3 });
          e.rings.push({ x: e.x, y: gy - 1, t: e.t });
          A.sfx('pop', { minGap: 0.03 });
          if (e.b >= 3) { e.gone = true; e.life = e.t + 0.35; return; }
        }
        A.hitR(e, e.x, e.y, r, { kb: 0.3 });
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), r = Math.round(5 * s);
        for (const rg of e.rings) { const k = (e.t - rg.t) / 0.35; if (k < 1) A.alpha(ctx, 1 - k, () => { const R = (4 + k * 14) * s; A.ring(ctx, rg.x + ox, rg.y + oy, R, '#ffffff', R * 0.3); A.ring(ctx, rg.x + ox, rg.y + oy, R * 0.7, P.l, R * 0.21); }); }
        if (e.gone) return;
        const x = e.x + ox, y = e.y + oy;
        A.glow(ctx, x, y, r + 1, P.l, 0.12);
        A.disc(ctx, x, y, r + 1, P.d);
        A.disc(ctx, x, y, r, P.l, '#ffffff');
        A.disc(ctx, x + Math.round(r * 0.35) * e.dir, y, Math.max(1, r - 1), P.c);   // the shadowed side, so it's a crescent
        A.px(ctx, x - r * 0.4, y - r * 0.2, 2, 2, P.d); A.px(ctx, x + r * 0.1, y + r * 0.4, 1, 1, P.d);   // craters
        for (let i = 0; i < 3; i++) A.px(ctx, x - e.dir * (r + 2 + i * 3), y - Math.sign(e.vy) * i * 2, 1, 1, P.l);   // a little trail
      },
    };
    K.moon.dashUp = {
      name: 'Dreamwalk', dmg: 13, life: 0.6,
      desc: 'Drift through like you are sleepwalking, then a huge crescent moon swings round and sends everything in front of you to sleep.',
      update(e, dt, g, A) {
        if (H.dashing(e, A)) { if (Math.random() < 0.4) { const q = H.end(e); A.spawn(e, ZZZ, { x: q.x - e.dir * 6, y: q.y - 8 }); } return; }
        if (!e.swing) { e.swing = e.t; const q = H.end(e), s = H.sc(e); A.hitR(e, q.x + e.dir * 16 * s, q.y, 22 * s, { kb: 0.5 }); A.sfx('swing'); }
      },
      draw(e, ctx, ox, oy, A) {
        if (!e.swing) return;
        const k = (e.t - e.swing) / 0.35;
        if (k > 1) return;
        const P = e.pal, s = H.sc(e), q = H.end(e);
        const x = q.x + e.dir * 8 * s + ox, y = q.y + oy, R = 22 * s * (0.6 + k * 0.4), sw = (k - 0.5) * 1.4;
        A.alpha(ctx, 1 - k * k, () => {
          A.arc(ctx, x, y, R, e.dir, P.c, Math.round(R * 0.42), -1.6 + sw, 1.6 + sw);
          A.arc(ctx, x, y, R, e.dir, P.l, Math.round(R * 0.28), -1.5 + sw, 1.5 + sw);
          A.arc(ctx, x, y, R, e.dir, '#ffffff', 1, -1.4 + sw, 1.4 + sw);
          for (let i = 0; i < 3; i++) A.star(ctx, x + e.dir * (R + 4) * Math.cos(sw + i - 1), y + (R + 4) * Math.sin(sw + i - 1), 1, '#ffffff');   // a few stars in its wake
        });
      },
    };

    // --------------------------------------------------------------- SOLAR
    K.solar.m1Up = {
      name: 'Sunspear', dmg: 12, cd: 0.55, kind: 'custom', life: 0.5,
      desc: 'Hurl a spear of pure sunlight. It explodes into a solar flare on whatever it hits.',
      spawn(e, g, A) { H.at(e, A, 6, -3); e.vx = e.dir * 320; e.vy = -20; A.sfx('cast', { minGap: 0.05 }); },
      update(e, dt, g, A) { e.vy += 60 * dt; if (H.fly(e, dt, A, { r: 5, kb: 0.4 })) e.dead = true; },
      onEnd(e, A) {
        A.blast(e, e.x, e.y, 24 * H.sc(e), { dmg: e.dmg * 0.8 });
        for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, sp = A.rnd(60, 160); A.spawn(e, FLARE, { x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp }); }
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), x = e.x + ox, y = e.y + oy, a = Math.atan2(e.vy, e.vx), c = Math.cos(a), sn = Math.sin(a), L = 14 * s;
        A.glow(ctx, x, y, 6 * s, P.c, 0.3);
        A.line(ctx, x - c * L, y - sn * L, x, y, P.c, 3); A.line(ctx, x - c * L, y - sn * L, x, y, '#ffffff', 1);   // the shaft
        A.line(ctx, x, y, x + c * 6 * s, y + sn * 6 * s, '#ffffff', 2);   // the head: a bright leaf-shaped point
        A.line(ctx, x + c - sn * 3 * s, y + sn + c * 3 * s, x + c * 6 * s, y + sn * 6 * s, P.l, 1);
        A.line(ctx, x + c + sn * 3 * s, y + sn - c * 3 * s, x + c * 6 * s, y + sn * 6 * s, P.l, 1);
        for (let i = 0; i < 4; i++) A.px(ctx, x - c * (L + 3 + i * 3) + Math.sin(e.t * 50 + i) * 1.5, y - sn * (L + 3 + i * 3), 2, 1, i % 2 ? P.l : P.c);   // sparks off the back
      },
    };
    K.solar.dashUp = {
      name: 'Flashpoint', dmg: 12, life: 1,
      desc: 'Go off like a flashbulb as you dash: everything near your starting point is blinded, and you leave a burning streak of sunlight.',
      spawn(e, g, A) { const p = A.p, s = H.sc(e); e.fx = p.cx; e.fy = p.y + 10; A.hitR(e, e.fx, e.fy, 24 * s, { kb: 0.6, onHit: (t) => H.inflict(e, t, 'dazzle') }); A.flash(0.06); A.sfx('zap', { minGap: 0.05 }); },
      update(e, dt, g, A) {
        if (H.dashing(e, A)) return;
        if (!e.S) e.S = H.span(e);
        const S = e.S, y = e.pts[0].y, s = H.sc(e);
        if (e.t < e.life - 0.25) A.tick(e, { x: S.x0, y: y - 6 * s, w: S.x1 - S.x0, h: 12 * s }, 0.3, { mult: 0.35, kb: 0 });
        if (Math.random() < dt * 20) A.spawn(e, FLARE, { x: A.rnd(S.x0, S.x1), y: y + A.rnd(-3, 3), vx: A.rnd(-20, 20), vy: A.rnd(-50, -10) });
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), k = Math.min(1, e.t / 0.25);
        if (k < 1) A.alpha(ctx, 1 - k, () => { SUN(ctx, A, e.fx + ox, e.fy + oy, Math.round((6 + k * 18) * s), e.t, P); A.ring(ctx, e.fx + ox, e.fy + oy, (10 + k * 20) * s, '#ffffff'); });
        if (!e.pts || e.pts.length < 2) return;
        let i = 0;
        A.alpha(ctx, Math.min(1, (e.life - e.t) / 0.3), () => H.along(e, 2, (x, y) => { const w = 2 + Math.sin(i * 0.7 + e.t * 20) * 1.2; A.px(ctx, x + ox, y + oy - w / 2, 2, w, i % 3 ? P.c : P.l); if (i % 4 === 0) A.px(ctx, x + ox, y + oy, 1, 1, '#ffffff'); i++; }));
      },
    };
  }
})(window.ERX = window.ERX || {});
