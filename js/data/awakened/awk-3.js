/*
 * AWAKENED: BLOOD, DEATH, METAL, SAND, MAGMA, STORM
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
  const heal = (A, n) => { const p = A.p; n = Math.round(n); if (n <= 0 || p.hp >= p.maxHp) return; p.hp = Math.min(p.maxHp, p.hp + n); A.g.floatText(p.cx, p.y - 6, '+' + n, '#7af0a0'); };

  // ================================================================ BLOOD (crimson)
  const BDROP = { life: 0.7, update(e, dt) { e.vy += 420 * dt; e.x += e.vx * dt; e.y += e.vy * dt; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => A.px(ctx, e.x + ox, e.y + oy, 1, 2, e.t < 0.1 ? '#ff8a8a' : '#c8102a')); } };
  const bleedSpray = (A, e, x, y, n) => { for (let i = 0; i < n; i++) A.spawn(e, BDROP, { x, y, vx: A.rnd(-100, 100), vy: A.rnd(-180, -20) }); };
  AW.blood = {
    color: '#ff2a2a', up: '#ffd0d0', status: 'bleed', fx: 'drips', block: ['Hemoglobin Shell', 'shield'],
    icons: ['bite', 'bloodMoon', 'pact', 'whips', 'exsanguinate'],
    look: { fx(ctx, F) { const e = F.at('eye'); F.A.px(ctx, e.x, e.y, 1, 2, '#ff2a2a'); for (let i = 0; i < 3; i++) { const a = F.t * 2.5 + i * 2.1, x = F.x + Math.cos(a) * 10, y = F.y - 13 + Math.sin(a) * 6; F.A.disc(ctx, x, y, 1, '#c8102a', '#ff6a6a'); } } },
    idle: { pose: (t) => IDLE.claws(t), fx(ctx, F) { for (const h of ['handF', 'handB']) { const p = F.at(h); for (let i = 0; i < 3; i++) F.A.px(ctx, p.x - 1 + i, p.y - 2, 1, 2, '#ff2a2a'); } } },
    run: {
      pose: (ph) => RUN.feral(ph),
      step(A, p, dt) { if (W.every(p, 'drop', 0.06, dt)) W.emit(A, BDROP, { x: p.cx - p.facing * 4, y: p.y + 10, vx: -p.facing * A.rnd(20, 60), vy: A.rnd(-60, 0) }); },
    },
    dash: {
      name: 'Crimson Flash', dmg: 12, life: 1.5,
      spawn(e) { e.marks = []; e.healed = new Set(); },
      update(e, dt, g, A) { const p = A.p; if (p.dashT > 0) { if (Math.random() < 0.5) e.marks.push({ x: p.cx, y: p.y + 4 + Math.random() * 14, t: e.t }); A.hit(e, { x: p.x - 4, y: p.y, w: p.w + 8, h: p.h }, { dir: p.facing, kb: 0.6, onHit(t) { if (!e.healed.has(t.uid)) { e.healed.add(t.uid); heal(A, 3); } } }); } for (const m of e.marks) if (e.t - m.t < 1) A.tickR(e, m.x, m.y, 5, 0.6, { mult: 0.25, kb: 0 }); },
      draw(e, ctx, ox, oy, A) { for (const m of e.marks) { const a = 1 - (e.t - m.t); if (a > 0) A.alpha(ctx, a, () => { A.line(ctx, m.x + ox - 4, m.y + oy - 3, m.x + ox + 4, m.y + oy + 3, '#ff2a2a', 2); A.px(ctx, m.x + ox, m.y + oy + 2 + (e.t - m.t) * 8, 1, 2, '#c8102a'); }); } },
    },
    guard: {
      name: 'Hemoglobin Shell', sound: 'squelch',
      draw(ctx, { A, x, bot, h, t }) { const cy = bot - h / 2, beat = Math.max(0, Math.sin(t * 7)) ** 6; for (let yy = -h / 2; yy <= h / 2; yy++) { const w = (5 + beat * 1.5) * Math.sqrt(Math.max(0, 1 - (yy * yy) / (h * h / 4))); A.px(ctx, x - w, cy + yy, w * 2, 1, yy % 4 ? '#a8102a' : '#ff2a2a'); } for (let i = 0; i < 3; i++) A.line(ctx, x, cy, x + Math.cos(i * 2.1 + 0.4) * 5, cy + Math.sin(i * 2.1 + 0.4) * 10, '#ff6a6a'); A.px(ctx, x - 1, cy - 1, 2, 2, '#ffd0d0'); },
      hit(g, x, y, d) { for (let i = 0; i < 16; i++) dot(g, x, y, d * U.lerp(10, 120, Math.random()), U.lerp(-150, 10, Math.random()), i % 3 ? '#c8102a' : '#ff6a6a', { ay: 500 }); },
    },
    m1: {
      name: 'Hemoblade', dmg: 9, cd: 0.34, kind: 'custom', life: 0.28,
      desc: 'Your blood hardens into a long sword: slash, slash, then a piercing thrust.',
      spawn(e, g, A) { const p = A.p; p._hemo = ((p._hemo || 0) + 1) % 3; e.n = p._hemo; A.sfx('swing', { minGap: 0.04 }); },
      update(e, dt, g, A) { H.at(e, A, 0); if (e.n === 0) { const L = 50 * H.sc(e); A.hit(e, { x: e.dir > 0 ? e.x : e.x - L, y: e.y - 5, w: L, h: 10 }, { mult: 1.5, kb: 1, onHit(t) { const c = A.center(t); bleedSpray(A, e, c.x, c.y, 6); } }); } else H.melee(e, A, 32 * H.sc(e), 24); },
      draw(e, ctx, ox, oy, A) {
        const k = Math.min(1, e.t / 0.1), x = e.x + ox, y = e.y + oy, d = e.dir, f = 1 - Math.max(0, e.t - 0.1) / 0.18;
        A.alpha(ctx, f, () => {
          if (e.n !== 0) { W.smear(ctx, A, x, y, 24 * H.sc(e), d, k * 0.75, '#ff2a2a', 4, e.n === 1 ? -1.3 : 1.3, e.n === 1 ? 1.1 : -1.1); return; }
          const L = 50 * H.sc(e) * k;
          W.beam(ctx, A, x + d * 4, y, x + d * L, y, 2, '#a8102a', '#ff6a6a');
          for (let i = 0; i < 4; i++) A.px(ctx, x + d * (L + i), y - (3 - i), 1, (3 - i) * 2 + 1, '#ffd0d0');
          for (let i = 0; i < 4; i++) A.px(ctx, x + d * L * (0.3 + i * 0.18), y + 3 + ((e.t * 80 + i * 3) % 6), 1, 2, '#c8102a');
        });
      },
    },
    s: [
      {
        name: 'Vampiric Bite', dmg: 26, cd: 6, mp: 5, kind: 'custom', life: 0.5,
        desc: 'Lunge at the nearest enemy and sink your fangs in, bursting blood over everything near it. Half of the damage comes back to you as health.',
        spawn(e, g, A) {
          const p = A.p, t = A.near(p.cx, p.y, 120); e.tg = t;
          if (!t) { e.dead = true; return; }
          const c = A.center(t), side = c.x > p.cx ? 1 : -1, nx = c.x - side * 10 - p.w / 2;
          if (!Phys().overlapsSolid(g.level, nx, p.y, p.w, p.h)) p.x = nx;
          p.facing = side; e.dir = side;
          A.damage(e, t, 1, 0.3); heal(A, e.dmg * (e.up ? 0.7 : 0.5)); bleedSpray(A, e, c.x, c.y, 14);
          if (t.applyStatus) t.applyStatus('bleed', e.potency);
          A.blast(e, c.x, c.y, 24 * H.sc(e), { dmg: e.dmg * 0.5 }); A.spawn(e, W.SHOCK, { x: c.x, y: c.y, r: 22, dmg: 0, c: '#ff2a2a' }); A.shake(3, 0.15);
          A.sfx('punchHit'); e.c = c;
        },
        draw(e, ctx, ox, oy, A) {
          if (!e.c) return;
          const k = e.t / e.life, x = e.c.x + ox, y = e.c.y + oy - 4, close = Math.min(1, k * 6), p = A.p;
          A.alpha(ctx, 1 - k, () => {
            for (const fx of [-4, 4]) { A.tri(ctx, x + fx, y - 9 + close * 5, 4, -8, '#ffffff'); A.tri(ctx, x + fx, y + 9 - close * 5, 4, 8, '#ffffff'); }
            for (let i = 0; i < 8; i++) { const q = (k * 2 + i / 8) % 1, sx = U.lerp(e.c.x, p.cx, q) + ox, sy = U.lerp(e.c.y, p.y + 10, q) + oy - Math.sin(q * Math.PI) * 10; A.px(ctx, sx - 1, sy - 1, 2, 2, i % 2 ? '#ff2a2a' : '#a8102a'); }
          });
        },
      },
      {
        name: 'Blood Moon Orb', dmg: 16, cd: 6, mp: 6, kind: 'custom', life: 1.6,
        desc: 'Hurl a heavy crimson orb. When it bursts, a ring of blood spikes explodes out of it.',
        spawn(e, g, A) { H.at(e, A, 10, -4); e.vx = e.dir * 170; e.vy = -80; A.sfx('cast'); },
        update(e, dt, g, A) { e.vy += 260 * dt; e.x += e.vx * dt; e.y += e.vy * dt; const hit = A.targets().some((t) => Phys().rectsOverlap(t.box, { x: e.x - 6, y: e.y - 6, w: 12, h: 12 })); if (hit || A.solid(e.x, e.y + 4) || e.t > 1.4) { A.hitR(e, e.x, e.y, 34 * H.sc(e), { kb: 1.2 }); bleedSpray(A, e, e.x, e.y, 14); A.sfx('crash'); A.spawn(e, { life: 0.5, draw(s, ctx, ox, oy, A) { const k = s.t / s.life, R = 34 * H.sc(s); A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; A.line(ctx, s.x + ox + Math.cos(a) * 4, s.y + oy + Math.sin(a) * 4, s.x + ox + Math.cos(a) * R * Math.min(1, k * 4), s.y + oy + Math.sin(a) * R * Math.min(1, k * 4), i % 2 ? '#ff2a2a' : '#a8102a', 2); } }); } }, { x: e.x, y: e.y }); e.dead = true; } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, r = Math.round(6 * H.sc(e)); A.glow(ctx, x, y, r + 3, '#ff2a2a', 0.3); A.disc(ctx, x, y, r, '#a8102a', '#ff6a6a'); A.px(ctx, x - 2, y - 2, 2, 2, '#ffd0d0'); },
      },
      {
        name: 'Blood Pact', dmg: 16, cd: 18, mp: 0, kind: 'custom', life: 1,
        desc: 'Pay with your own blood: lose some health in a crimson nova that hurts everything around you, refill all your mana and reset your other skills.',
        spawn(e, g, A) {
          const p = A.p, cost = Math.round(p.maxHp * (e.up ? 0.1 : 0.15));
          p.hp = Math.max(1, p.hp - cost); p.mp = p.maxMp; for (const s of ['s1', 's2', 's4', 's5']) p.ab.cd[s] = 0;
          A.g.floatText(p.cx, p.y - 6, '-' + cost + ' HP', '#ff4a4a'); A.g.floatText(p.cx, p.y - 16, 'PACT SEALED', e.pal.l); A.sfx('surge');
          bleedSpray(A, e, p.cx, p.y + 10, 24); W.boom(A, e, p.cx, p.y + 10, 40 * H.sc(e));
        },
        update(e, dt, g, A) { e.x = A.p.cx; e.y = A.p.y + 10; },
        draw(e, ctx, ox, oy, A) {
          const k = e.t / e.life, x = e.x + ox, y = e.y + oy;
          A.alpha(ctx, 1 - k, () => {
            for (let i = 0; i < 2; i++) A.ring(ctx, x, y + 12, 8 + k * 26 - i * 3, i ? '#a8102a' : '#ff2a2a', (8 + k * 26 - i * 3) * 0.35);
            for (let i = 0; i < 5; i++) { const a = i * 1.257 + e.t * 2, px = x + Math.cos(a) * 14, py = y + 12 + Math.sin(a) * 5; A.px(ctx, px - 1, py - 18 * Math.min(1, k * 4), 2, 18 * Math.min(1, k * 4), '#c8102a'); A.px(ctx, px - 1, py - 18 * Math.min(1, k * 4), 2, 1, '#ffd0d0'); }
          });
        },
      },
      {
        name: 'Crimson Whips', dmg: 7, cd: 5, mp: 5, kind: 'custom', life: 0.6,
        desc: 'Two whips of blood lash out in a crossing X, over and over, cracking at the tips.',
        spawn(e, g, A) { A.sfx('swing'); },
        update(e, dt, g, A) { H.at(e, A, 0); const L = 54 * H.sc(e); A.tick(e, { x: e.dir > 0 ? e.x : e.x - L, y: e.y - 17, w: L, h: 34 }, 0.12, { kb: 0.3 }); },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, L = 54 * H.sc(e), d = e.dir;
          A.alpha(ctx, A.fade(e, 0.03, 0.12), () => {
            for (const s of [-1, 1]) {
              const ph = e.t * 18 + (s > 0 ? 0 : Math.PI); let lx = x, ly = y;
              for (let i = 1; i <= 20; i++) { const q = i / 20, wx = x + d * q * L, wy = y + s * (q - 0.5) * 30 + Math.sin(ph + q * 6) * 5 * q; A.line(ctx, lx, ly, wx, wy, '#a8102a', Math.max(1, Math.round(3 - q * 2))); A.px(ctx, wx, wy, 1, 1, i % 3 ? '#ff2a2a' : '#ff8a8a'); lx = wx; ly = wy; }
              if (Math.floor(e.t * 16) % 2) A.star(ctx, lx, ly, 3, '#ffd0d0', '#ff2a2a');
            }
          });
        },
      },
      {
        name: 'Exsanguinate', dmg: 22, cd: 10, mp: 7, kind: 'custom', life: 1.8,
        desc: 'Rip the blood out of every nearby enemy into one huge sphere above your head... then throw it.',
        spawn(e, g, A) { const p = A.p; e.ts = H.nearby(A, p.cx, p.y, 120 * H.sc(e)).map((o) => o.t); for (const t of e.ts) { A.damage(e, t, 0.5, 0); if (t.applyStatus) t.applyStatus('bleed', e.potency); } e.r = 4 + e.ts.length * 2; A.sfx('surge'); },
        update(e, dt, g, A) { const p = A.p; if (e.t < 0.7) { e.x = p.cx; e.y = p.y - 16; return; } if (!e.thrown) { e.thrown = true; e.dir = p.facing; e.vx = e.dir * 220; A.sfx('whoosh'); } e.x += e.vx * dt; const hit = A.targets().some((t) => Phys().rectsOverlap(t.box, { x: e.x - e.r, y: e.y - e.r, w: e.r * 2, h: e.r * 2 })); if (hit || A.solid(e.x, e.y) || e.t > 1.7) { A.blast(e, e.x, e.y, (18 + e.r * 2) * H.sc(e), { dmg: e.dmg * (1 + e.ts.length * 0.3) }); bleedSpray(A, e, e.x, e.y, 20); e.dead = true; } },
        draw(e, ctx, ox, oy, A) { if (e.t < 0.7) for (const t of e.ts) if (!t.dead) { const c = A.center(t); for (let i = 0; i < 5; i++) { const q = (e.t * 2 + i / 5) % 1; A.px(ctx, U.lerp(c.x, A.p.cx, q) + ox, U.lerp(c.y, A.p.y - 16, q) + oy - Math.sin(q * Math.PI) * 14, 2, 2, '#ff2a2a'); } } const r = Math.round(e.r * Math.min(1, e.t / 0.5) + Math.sin(e.t * 10)); if (r > 0) { A.disc(ctx, e.x + ox, e.y + oy, r, '#a8102a', '#ff6a6a'); A.px(ctx, e.x + ox - r / 2, e.y + oy - r / 2, 2, 2, '#ffd0d0'); } },
      },
    ],
    ult: {
      name: 'Crimson Behemoth', dmg: 12,
      desc: 'Gather an ocean of blood into a monstrous warrior. It charges across the battlefield crushing everything, forms blood weapons from its body, then collapses into a sphere that explodes into countless spikes.',
      charge: {
        pose: (t, k) => J({ bob: 1, lean: 1, FA: [[11.4, 12], [13, 9 + Math.sin(t * 8)]], BA: [[5.6, 12], [3.8, 9 - Math.sin(t * 8)]], FL: [[10.8, 19.4], [11.6, 22]], BL: [[5.6, 19.4], [4.8, 22]] }),
        lift: 0,
        draw(ctx, x, y, k, t, A, P) { for (let i = 0; i < 24; i++) { const a = t * 3 + i * 0.26, r = 40 * (1 - k) + 10; A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, 2, 2, i % 3 ? '#c8102a' : '#ff6a6a'); } A.alpha(ctx, k, () => { A.disc(ctx, x - 20, y - 20, Math.round(6 + k * 10), '#a8102a'); A.px(ctx, x - 24, y - 24, 3, 2, '#ffd34d'); A.px(ctx, x - 18, y - 24, 3, 2, '#ffd34d'); }); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.9,
          spawn(e) { e.bx = p.cx - e.dir * 20; e.gy = p.feet; e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t); e.drips = []; A.sfx('surge'); A.sfx('rumble', { dur: 2.6 }); },
          update(e, dt, g, A) {
            for (const d of e.drips) { d.t += dt; d.vy += 500 * dt; d.x += d.vx * dt; d.y += d.vy * dt; }
            e.drips = e.drips.filter((d) => d.t < 1.2);
            // the behemoth charges, stomping, swinging its blood axe
            if (e.t > 0.4 && e.t < 2.3) {
              e.bx += e.dir * 160 * dt; e.gy = A.ground(e.bx, e.gy - 30);
              A.tick(e, { x: e.bx - 34, y: e.gy - 130, w: 68, h: 130 }, 0.2, { mult: 0.8, kb: 1.4, dir: e.dir });
              e.stomp = (e.stomp || 0) - dt; if (e.stomp <= 0) { e.stomp = 0.32; A.shake(4, 0.12); A.sfx('thud', { minGap: 0.1 }); }
              e.swing = (e.swing || 0) - dt; if (e.swing <= 0) { e.swing = 0.5; e.sw = e.t; A.hit(e, { x: e.dir > 0 ? e.bx : e.bx - 110, y: e.gy - 140, w: 110, h: 140 }, { mult: 1.8, kb: 1.2 }); e.hit.clear(); A.sfx('swing'); }
              if (Math.random() < dt * 20) e.drips.push({ x: e.bx + A.rnd(-30, 30), y: e.gy - A.rnd(30, 120), vx: A.rnd(-20, 20), vy: 0, t: 0 });
            }
            // ...collapses into a sphere of blood... which explodes into countless spikes
            if (e.t > 2.65 && !e.boom) { e.boom = e.t; A.blast(e, e.bx, e.gy - 50, 140 * H.sc(e), { dmg: e.dmg * 7 }); A.sfx('crash'); A.sfx('boom'); A.flash(0.35); A.shake(14, 0.6); bleedSpray(A, e, e.bx, e.gy - 50, 60); for (let i = 0; i < 40; i++) e.drips.push({ x: e.bx, y: e.gy - 50, vx: A.rnd(-260, 260), vy: A.rnd(-300, -40), t: 0 }); }
          },
          draw(e, ctx, ox, oy, A) {
            const x = e.bx + ox, gy = e.gy + oy, d = e.dir, rise = Math.min(1, e.t / 0.45);
            A.alpha(ctx, 0.25 * Math.min(1, e.t * 3) * (e.boom ? Math.max(0, 1 - (e.t - e.boom)) : 1), () => A.px(ctx, -10, -10, 2000, 2000, '#3a0008'));
            if (e.t < 2.45) {
              const H0 = 130 * rise, step = Math.sin(e.t * 9) * 5, cr = e.t > 2.35 ? (e.t - 2.35) * 10 : 0;
              A.alpha(ctx, 1 - cr, () => {
                A.px(ctx, x - 26, gy - 44 * rise, 18, 44 * rise, '#8a0a20'); A.px(ctx, x + 8, gy - 44 * rise + step, 18, 44 * rise - step, '#8a0a20');
                A.px(ctx, x - 34, gy - H0 + 30, 68, Math.max(0, H0 - 72), '#c8102a'); A.px(ctx, x - 34, gy - H0 + 30, 68, 4, '#ff6a6a');
                A.px(ctx, x - 20, gy - H0 + 44, 16, 14, '#a80a22'); A.px(ctx, x + 4, gy - H0 + 44, 16, 14, '#a80a22');
                for (let i = 0; i < 3; i++) A.px(ctx, x - 12, gy - H0 + 64 + i * 10, 24, 6, '#a80a22');
                // the head: horned, with blazing eyes and a mouthful of teeth
                A.disc(ctx, x + d * 4, gy - H0 + 16, 18, '#a8102a', '#e83a4a'); A.px(ctx, x + d * 9 - 2, gy - H0 + 11, 6, 3, '#ffd34d'); A.px(ctx, x - d * 1 - 3, gy - H0 + 11, 5, 3, '#ffd34d');
                A.tri(ctx, x - 14, gy - H0 + 2, 6, 14, '#ff6a6a', '#ffffff'); A.tri(ctx, x + 14, gy - H0 + 2, 6, 14, '#ff6a6a', '#ffffff');
                for (let i = -8; i <= 8; i += 4) A.tri(ctx, x + d * 4 + i, gy - H0 + 26, 3, -5, '#ffe8e8');
                // one arm hanging, and a blood axe grown out of the other
                A.line(ctx, x - d * 30, gy - H0 + 40, x - d * 40, gy - H0 + 86, '#a8102a', 10);
                const sk = e.sw ? Math.min(1, (e.t - e.sw) / 0.25) : 1, a = U.lerp(-2.2, 0.9, sk), hx = x + d * 30, hy = gy - H0 + 40;
                const ax = hx + Math.cos(a) * 60 * d, ay = hy + Math.sin(a) * 60;
                A.line(ctx, hx, hy, ax, ay, '#a8102a', 6); A.disc(ctx, ax, ay, 14, '#ff2a2a', '#ffd0d0'); A.disc(ctx, ax - d * 6, ay, 9, '#a8102a');
                if (e.sw && e.t - e.sw < 0.2) A.alpha(ctx, 1 - (e.t - e.sw) / 0.2, () => A.arc(ctx, hx, hy, 62, d, '#ff6a6a', 3, -2.2, 0.9));
              });
            } else if (!e.boom) { const k = (e.t - 2.45) / 0.2; A.disc(ctx, x, gy - 50, Math.round(40 - k * 10), '#a8102a', '#ff6a6a'); A.ring(ctx, x, gy - 50, 44 - k * 10, '#ffffff'); }
            else { const k = (e.t - e.boom) / 1.2; A.alpha(ctx, Math.max(0, 1 - k), () => { for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, R = 30 + k * (i % 2 ? 170 : 120); A.line(ctx, x + Math.cos(a) * 14, gy - 50 + Math.sin(a) * 14, x + Math.cos(a) * R, gy - 50 + Math.sin(a) * R, i % 2 ? '#ff2a2a' : '#a8102a', i % 3 ? 2 : 3); } A.ring(ctx, x, gy - 50, 20 + k * 200, '#ff6a6a', (20 + k * 200) * 0.6, 2); }); }
            for (const dp of e.drips) A.px(ctx, dp.x + ox, dp.y + oy, 2, 3, dp.t < 0.4 ? '#ff2a2a' : '#a8102a');
          },
        }, {});
      },
    },
  };

  // ============================================================== DEATH (spectral)
  const SKULL = (ctx, A, x, y, col, eye) => { A.px(ctx, x - 3, y - 3, 6, 5, col); A.px(ctx, x - 2, y + 2, 4, 2, col); A.px(ctx, x - 2, y - 1, 1, 2, eye || '#05030a'); A.px(ctx, x + 1, y - 1, 1, 2, eye || '#05030a'); };
  const WISP = { life: 1, update(e, dt, g, A) { const p = A.p, a = Math.atan2(p.y + 8 - e.y, p.cx - e.x); e.vx = U.approach(e.vx, Math.cos(a) * 220, 4, dt); e.vy = U.approach(e.vy, Math.sin(a) * 220, 4, dt); e.x += e.vx * dt; e.y += e.vy * dt; if (Math.hypot(p.cx - e.x, p.y + 8 - e.y) < 6) { e.dead = true; if (e.heal) { p.hp = Math.min(p.maxHp, p.hp + e.heal); A.g.floatText(p.cx, p.y - 6, '+' + e.heal, '#7af0a0'); } } }, draw(e, ctx, ox, oy, A) { A.disc(ctx, e.x + ox, e.y + oy, 2, '#c8ffd8'); A.px(ctx, e.x + ox - e.vx * 0.02, e.y + oy - e.vy * 0.02, 2, 1, '#7aff9a'); } };
  const SCYTHE = (ctx, A, hx, hy, a, d, L, col) => { const tx = hx + Math.cos(a) * L * d, ty = hy + Math.sin(a) * L; A.line(ctx, hx - Math.cos(a) * 4 * d, hy - Math.sin(a) * 4, tx, ty, '#3a2e24', 1); for (let i = 0; i < 12; i++) { const b = a + Math.PI / 2 + (i / 12) * 1.2, r = 10 - i * 0.6; A.px(ctx, tx + Math.cos(b) * r * d * 0.9, ty + Math.sin(b) * r * 0.9, 1, 1, i < 2 ? '#ffffff' : col); } };
  AW.death = {
    color: '#d8e0f0', up: '#7aff9a', status: 'doom', fx: 'ashes', block: ['Ossuary Wall', 'wall'],
    icons: ['coffinDrop', 'banshee', 'tombstones', 'door', 'reap'],
    look: { fx(ctx, F) { const e = F.at('eye'); F.A.px(ctx, e.x, e.y, 1, 1, '#7aff9a'); F.A.alpha(ctx, 0.4, () => F.A.disc(ctx, e.x, e.y, 2, '#7aff9a')); } },
    idle: {
      pose: (t) => IDLE.shoulder(t),
      fx(ctx, F) { const h = F.at('handF'); SCYTHE(ctx, F.A, h.x, h.y, -2.4, -F.d, 22, '#d8e0f0'); },
      back(ctx, F) { for (let i = 0; i < 4; i++) { const k = (F.t * 0.4 + i / 4) % 1; F.A.alpha(ctx, 0.6 * (1 - k), () => F.A.px(ctx, F.x - 6 + i * 4, F.ground - 2 - k * 20, 1, 1, '#8a8aa0')); } },
    },
    run: {
      pose: (ph) => RUN.glide(ph),
      fx(ctx, F) { const h = F.at('handF'); SCYTHE(ctx, F.A, h.x, h.y, 2.5, F.d, 20, '#d8e0f0'); },
      back(ctx, F) { for (let i = 0; i < 8; i++) F.A.alpha(ctx, 0.5 - i * 0.06, () => F.A.px(ctx, F.x - F.d * (5 + i * 3), F.y - 6 + Math.sin(F.t * 8 + i) * 3, 3, 4, '#2a2a34')); },
    },
    dash: {
      name: 'Phantom Passage', dmg: 10, life: 1,
      update(e, dt, g, A) { const p = A.p; if (p.dashT > 0) A.hit(e, { x: p.x - 6, y: p.y, w: p.w + 12, h: p.h }, { kb: 0.2, onHit(t) { if (t.applyStatus) { t.applyStatus('doom', 0); t.applyStatus('chill', 0); } } }); },
      draw(e, ctx, ox, oy, A) { const p = A.p; if (p.dashT > 0) A.alpha(ctx, 0.5, () => { H.drawGhost(ctx, A, 'dash', p.cx + ox - p.facing * 6, p.feet + oy, p.facing, '#c8ffd8'); SKULL(ctx, A, p.cx + ox + p.facing * 4, p.y + oy - 2, '#d8e0f0', '#7aff9a'); }); },
    },
    guard: {
      name: 'Ossuary Wall', sound: 'bone',
      draw(ctx, { A, x, bot, h, t }) { for (let yy = 0; yy < h; yy += 7) for (let xx = -1; xx <= 1; xx++) SKULL(ctx, A, x + xx * 6, bot - yy - 4, '#e8e4d8', Math.sin(t * 6 + yy + xx) > 0 ? '#7aff9a' : '#05030a'); },
      hit(g, x, y, d) { for (let i = 0; i < 10; i++) dot(g, x, y, d * U.lerp(20, 100, Math.random()), U.lerp(-140, -40, Math.random()), i % 2 ? '#e8e4d8' : '#7aff9a', { ay: 420, size: 2 }); },
    },
    m1: {
      name: 'Soul Scythe', dmg: 10, cd: 0.42, kind: 'custom', life: 0.3,
      desc: 'Swing a spectral scythe. Each hit tears a little soul out of the enemy, which floats back and heals you.',
      spawn(e, g, A) { A.sfx('swing', { minGap: 0.04 }); },
      update(e, dt, g, A) { H.at(e, A, 0); const r = 34 * H.sc(e); A.hit(e, { x: e.dir > 0 ? e.x - 4 : e.x - r - 4, y: e.y - r, w: r + 8, h: r * 1.6 }, { dir: e.dir, onHit(t) { const c = A.center(t); A.spawn(e, WISP, { x: c.x, y: c.y, vx: A.rnd(-40, 40), vy: -80, heal: e.up ? 2 : 1 }); } }); },
      draw(e, ctx, ox, oy, A) { const k = e.t / e.life, a = U.lerp(-2, 1.2, W.easeOut(Math.min(1, k * 1.4))); SCYTHE(ctx, A, e.x + ox, e.y + oy, a, e.dir, 30 * H.sc(e), '#d8e0f0'); A.alpha(ctx, 0.35 * (1 - k), () => A.arc(ctx, e.x + ox, e.y + oy, 30 * H.sc(e), e.dir, '#7aff9a', 2, -2, a)); },
    },
    s: [
      {
        name: 'Coffin Drop', dmg: 30, cd: 7, mp: 6, kind: 'custom', life: 1.4,
        desc: 'A coffin falls out of the sky onto your enemy. The lid creaks open... skeletal hands wave.',
        spawn(e, g, A) { H.at(e, A, 0); const ax = A.aim(e, 160); e.tx = ax !== null ? ax : e.x + e.dir * 60; e.gy = H.floor(A, e.tx); e.top = H.sky(A, e.tx, e.gy - 10); A.sfx('whoosh'); },
        update(e, dt, g, A) { if (e.t > 0.35 && !e.land) { e.land = true; A.hit(e, { x: e.tx - 10, y: e.gy - 30, w: 20, h: 30 }, { kb: 0.4, onHit(t) { if (t.applyStatus) t.applyStatus('doom', e.potency); } }); A.sfx('crash'); A.shake(4, 0.25); } },
        draw(e, ctx, ox, oy, A) { const x = e.tx + ox, gy = e.gy + oy, q = Math.min(1, e.t / 0.35), y = U.lerp(e.top + oy - 30, gy, W.easeIn(q)), f = e.t > 1.1 ? 1 - (e.t - 1.1) / 0.3 : 1; A.alpha(ctx, f, () => { A.px(ctx, x - 6, y - 26, 12, 26, '#4a3424'); A.px(ctx, x - 7, y - 20, 14, 8, '#4a3424'); A.px(ctx, x - 1, y - 22, 2, 8, '#c8a84a'); A.px(ctx, x - 3, y - 19, 6, 2, '#c8a84a'); if (e.land && e.t > 0.6) { const open = Math.min(1, (e.t - 0.6) / 0.2); A.px(ctx, x - 6 - open * 8, y - 28, 12, 3, '#5a4434'); for (let i = 0; i < 2; i++) { const hx = x - 3 + i * 6, wv = Math.sin(e.t * 12 + i * 2) * 2; A.px(ctx, hx, y - 30 - open * 4 + wv, 1, 6, '#e8e4d8'); A.px(ctx, hx - 1, y - 31 - open * 4 + wv, 3, 1, '#e8e4d8'); } } }); },
      },
      {
        name: 'Banshee Wail', dmg: 14, cd: 8, mp: 6, kind: 'custom', life: 1,
        desc: 'A banshee rises behind you and wails. The cone of her scream terrifies and hurts everything in front.',
        spawn(e, g, A) { H.at(e, A, 0, -6); A.sfx('screech'); },
        update(e, dt, g, A) { H.at(e, A, 0, -6); if (e.t > 0.2) { const L = 90 * H.sc(e); A.hit(e, { x: e.dir > 0 ? e.x : e.x - L, y: e.y - 24, w: L, h: 44 }, { kb: 1, onHit(t) { if (t.applyStatus) { t.applyStatus('confuse', e.potency); t.applyStatus('doom', e.potency); } } }); } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox - e.dir * 6, y = e.y + oy - 8, f = A.fade(e, 0.1, 0.3); A.alpha(ctx, f * 0.8, () => { A.disc(ctx, x, y, 6, '#c8ffd8'); A.px(ctx, x - 6, y, 12, 14, '#c8ffd8'); for (let i = 0; i < 4; i++) A.px(ctx, x - 6 + i * 3 + (Math.floor(e.t * 10) % 2), y + 14, 2, 2, '#c8ffd8'); A.px(ctx, x - 3, y - 2, 2, 3, '#05030a'); A.px(ctx, x + 1, y - 2, 2, 3, '#05030a'); A.px(ctx, x - 1, y + 2, 3, 4, '#05030a'); }); if (e.t > 0.2) for (let i = 0; i < 4; i++) { const r = ((e.t * 140 + i * 22) % (90 * H.sc(e))); A.alpha(ctx, f * (1 - r / 90), () => A.arc(ctx, x, y + 6, r, e.dir, '#c8ffd8', 1, -0.5, 0.5)); } },
      },
      {
        name: 'Tombstone Topple', dmg: 18, cd: 7, mp: 6, kind: 'custom', life: 1.4,
        desc: 'A row of tombstones rises... then they topple over like dominoes onto everything in front.',
        spawn(e, g, A) { H.at(e, A, 0); e.stones = []; for (let i = 0; i < (e.up ? 6 : 5); i++) { const x = e.x + e.dir * (14 + i * 14); e.stones.push({ x, gy: H.floor(A, x), d: 0.3 + i * 0.1, hit: false }); } A.sfx('crash'); },
        update(e, dt, g, A) { for (const s of e.stones) { const lt = e.t - s.d; if (lt > 0.15 && !s.hit) { s.hit = true; A.hit(e, { x: s.x - 2, y: s.gy - 16, w: e.dir * 18 > 0 ? 18 : -18, h: 16 }, { kb: 0.6 }); A.hit(e, { x: Math.min(s.x, s.x + e.dir * 18), y: s.gy - 16, w: 18, h: 16 }, { kb: 0.6 }); e.hit.clear(); A.sfx('crash', { minGap: 0.05 }); } } },
        draw(e, ctx, ox, oy, A) { const f = e.t > 1.1 ? 1 - (e.t - 1.1) / 0.3 : 1; A.alpha(ctx, f, () => { for (const s of e.stones) { const rise = Math.min(1, e.t / 0.25), lt = e.t - s.d, a = lt < 0 ? 0 : Math.min(1, lt / 0.15) * (Math.PI / 2) * e.dir, x = s.x + ox, gy = s.gy + oy; for (let r = 0; r < 14 * rise; r++) { const px = x + Math.sin(a) * r, py = gy - Math.cos(a) * r; A.px(ctx, px - 3, py, 7, 1, r > 11 ? '#a8a8b8' : '#8a8a98'); } if (Math.abs(a) < 0.3) A.px(ctx, x - 1, gy - 10, 3, 1, '#4a4a58'); } }); },
      },
      {
        name: "Death's Door", dmg: 26, cd: 10, mp: 7, kind: 'custom', life: 1.8,
        desc: 'A dark door creaks open in front of you. Enemies are dragged inside, and it SLAMS shut.',
        spawn(e, g, A) { H.at(e, A, 46); const ax = A.aim(e, 120); if (ax !== null) e.x = ax; e.gy = H.floor(A, e.x); A.sfx('doorOpen' in ERX.SfxBank ? 'doorOpen' : 'whoosh'); },
        update(e, dt, g, A) { if (e.t > 0.3 && e.t < 1.2) for (const o of H.nearby(A, e.x, e.gy - 14, 80)) if (!o.t.tutorial) o.t.vx = U.approach(o.t.vx, Math.sign(e.x - o.c.x) * 150, 6, dt); if (e.t > 1.2 && !e.slam) { e.slam = true; A.hitR(e, e.x, e.gy - 14, 26 * H.sc(e), { kb: 0.2, onHit(t) { if (t.applyStatus) t.applyStatus('doom', e.potency); } }); A.sfx('gateClang'); A.shake(5, 0.3); } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, gy = e.gy + oy, rise = Math.min(1, e.t / 0.3), open = e.slam ? Math.max(0, 1 - (e.t - 1.2) / 0.06) : Math.min(1, (e.t - 0.2) / 0.3), f = e.t > 1.5 ? 1 - (e.t - 1.5) / 0.3 : 1; A.alpha(ctx, f, () => { const h = 30 * rise; A.px(ctx, x - 9, gy - h - 2, 18, h + 2, '#2a2a34'); A.px(ctx, x - 8, gy - h, 16, h, '#05030a'); if (open > 0) for (let i = 0; i < 6; i++) A.px(ctx, x - 6 + ((e.t * 30 + i * 5) % 12), gy - h + 4 + (i * 5) % (h - 6), 1, 1, '#7aff9a'); const dw = Math.round(16 * (1 - open)); A.px(ctx, x - 8, gy - h, Math.max(1, dw), h, '#4a3424'); A.px(ctx, x - 8 + Math.max(1, dw) - 2, gy - h / 2, 1, 2, '#c8a84a'); }); },
      },
      {
        name: 'Reap', dmg: 20, cd: 9, mp: 6, kind: 'custom', life: 0.9,
        desc: 'A spectral scythe sweeps through everything nearby. Enemies already close to death do not get up.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx; e.y = p.y + 8; A.sfx('shockwave'); for (const o of H.nearby(A, e.x, e.y, 80 * H.sc(e))) { const t = o.t; if (!t.tutorial && t.maxHp && t.hp < t.maxHp * (e.up ? 0.3 : 0.2)) { A.damage(e, t, 99, 0); A.g.floatText(o.c.x, t.box.y - 10, 'REAPED', '#7aff9a'); } else A.damage(e, t, 1, 0.8); } },
        draw(e, ctx, ox, oy, A) { const k = e.t / e.life, R = 80 * H.sc(e); A.alpha(ctx, 1 - k, () => { const a = U.lerp(-Math.PI, Math.PI, W.easeOut(Math.min(1, k * 2))); SCYTHE(ctx, A, e.x + ox, e.y + oy, a, 1, R * 0.6, '#d8e0f0'); A.ring(ctx, e.x + ox, e.y + oy, R * Math.min(1, k * 2), '#7aff9a', R * 0.4 * Math.min(1, k * 2)); }); },
      },
    ],
    ult: {
      name: 'Requiem of the Dead', dmg: 9,
      desc: 'Open a gateway to the realm of the dead. A spectral army floods the battlefield, then a gigantic skeletal entity rises and brings everything down.',
      charge: {
        pose: (t, k) => J({ FA: [[11.4, 12], [13.6, 10.4]], BA: [[5.4, 12.6], [3.4, 11]], bob: 0 }),
        lift: 0,
        draw(ctx, x, y, k, t, A, P) { const gx = x + 24, gy = y + 14, h = 40 * k; A.px(ctx, gx - 12, gy - h, 24, h, '#05030a'); A.alpha(ctx, 0.8, () => { A.px(ctx, gx - 14, gy - h - 2, 28, 2, '#7aff9a'); A.px(ctx, gx - 14, gy - h, 2, h, '#7aff9a'); A.px(ctx, gx + 12, gy - h, 2, h, '#7aff9a'); }); for (let i = 0; i < 6; i++) A.px(ctx, gx - 10 + ((t * 30 + i * 7) % 20), gy - ((t * 40 + i * 11) % Math.max(1, h)), 1, 2, '#c8ffd8'); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 4.2,
          spawn(e) { e.gx = p.cx + e.dir * 26; e.gy = p.feet; e.army = []; for (let i = 0; i < 30; i++) e.army.push({ x: e.gx, y: e.gy - 4 - (i % 3) * 8, sp: A.rnd(150, 240), d: i * 0.045, ph: Math.random() * 6, fly: i % 4 === 0 }); e.souls = []; e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t); A.sfx('surge'); A.sfx('rumble', { dur: 3.4 }); },
          update(e, dt, g, A) {
            // the army of the dead floods out of the gate
            for (const s of e.army) { if (e.t < s.d || e.t > 2.4) continue; s.x += e.dir * s.sp * dt; if (s.fly) s.y = e.gy - 40 - Math.sin(e.t * 4 + s.ph) * 20; A.tick(e, { x: s.x - 7, y: s.y - 16, w: 14, h: 22 }, 0.3, { mult: 0.6, kb: 0.5, onHit(t) { if (t.applyStatus) t.applyStatus('doom', e.potency); } }); }
            for (const s of e.souls) { s.t += dt; s.y -= 60 * dt; s.x += Math.sin(s.t * 6 + s.ph) * 20 * dt; }
            e.souls = e.souls.filter((s) => s.t < 1.6);
            if (e.sx2 === undefined && e.t > 1.6) { const c = e.ts.filter((t) => !t.dead)[0]; e.sx2 = c ? A.center(c).x : p.cx + e.dir * 110; }
            // ...and the giant brings its scythe down
            if (e.t > 2.8 && !e.slam) { e.slam = e.t; A.hit(e, { x: e.sx2 - 80, y: e.gy - 200, w: 160, h: 200 }, { mult: 7, kb: 1.8 }); A.sfx('crash'); A.sfx('boom'); A.flash(0.4); A.shake(16, 0.7); for (let i = 0; i < 24; i++) e.souls.push({ x: e.sx2 + A.rnd(-60, 60), y: e.gy - A.rnd(0, 40), t: 0, ph: Math.random() * 6 }); }
          },
          draw(e, ctx, ox, oy, A) {
            const gx = e.gx + ox, gy = e.gy + oy, f = e.t > 3.7 ? 1 - (e.t - 3.7) / 0.5 : 1;
            A.alpha(ctx, f * 0.5, () => A.px(ctx, -10, -10, 2000, 2000, '#04120a'));
            // the gateway to the realm of the dead, a green vortex turning inside it
            A.alpha(ctx, f, () => { A.px(ctx, gx - 22, gy - 70, 44, 70, '#05030a'); for (let i = 0; i < 30; i++) { const a = e.t * 4 + i * 0.6, r = (i % 10) * 2; A.px(ctx, gx + Math.cos(a) * r, gy - 35 + Math.sin(a) * r * 1.4, 1, 1, i % 3 ? '#3aff7a' : '#c8ffd8'); } A.px(ctx, gx - 24, gy - 72, 48, 3, '#7aff9a'); A.px(ctx, gx - 24, gy - 72, 3, 72, '#7aff9a'); A.px(ctx, gx + 21, gy - 72, 3, 72, '#7aff9a'); });
            for (const s of e.army) {
              if (e.t < s.d || e.t > 2.4) continue;
              const x = s.x + ox, y = s.y + oy + Math.sin(e.t * 12 + s.ph) * 1.5;
              A.alpha(ctx, 0.8 * f, () => { if (s.fly) { SKULL(ctx, A, x, y, '#c8ffd8', '#7aff9a'); for (let i = 1; i < 4; i++) A.alpha(ctx, 0.5 - i * 0.12, () => A.px(ctx, x - e.dir * i * 4, y + 1, 3, 2, '#7aff9a')); } else { SKULL(ctx, A, x, y - 12, '#c8ffd8', '#7aff9a'); A.px(ctx, x - 1, y - 8, 2, 8, '#c8ffd8'); A.px(ctx, x - 3, y - 6, 6, 1, '#c8ffd8'); A.line(ctx, x + e.dir * 3, y - 10, x + e.dir * 10, y - 18, '#e8e4d8'); } });
            }
            // the giant: a skeleton the size of a building rises, raises its scythe... and brings it down
            const rise = U.clamp((e.t - 1.6) / 0.8, 0, 1);
            if (rise > 0 && e.sx2 !== undefined) {
              const cx = e.sx2 + ox, top = gy - 220 * rise, sw = e.slam ? 1 : U.clamp((e.t - 2.4) / 0.4, 0, 1), d = e.dir;
              A.alpha(ctx, f * 0.92, () => {
                A.disc(ctx, cx, top + 40, 40, '#e8e4d8', '#ffffff'); A.px(ctx, cx - 22, top + 30, 14, 16, '#05030a'); A.px(ctx, cx + 8, top + 30, 14, 16, '#05030a');
                W.flame(ctx, A, cx - 15, top + 42, 10, e.t, ['#3aff7a', '#7aff9a', '#ffffff']); W.flame(ctx, A, cx + 15, top + 42, 10, e.t, ['#3aff7a', '#7aff9a', '#ffffff']);
                for (let i = -16; i <= 16; i += 5) A.px(ctx, cx + i, top + 72, 4, 9, '#e8e4d8');
                A.px(ctx, cx - 3, top + 82, 6, 130, '#c8c4b8');
                for (let r = 0; r < 6; r++) A.px(ctx, cx - 34, top + 96 + r * 12, 68, 4, '#c8c4b8');
                const a = U.lerp(-2.4, 0.5, W.easeIn(sw)), sx = cx + d * 36, sy = top + 96, L = 120, ex = sx + Math.cos(a) * L * d, ey = sy + Math.sin(a) * L;
                A.line(ctx, cx + d * 30, top + 92, sx, sy, '#e8e4d8', 6); A.line(ctx, sx, sy, ex, ey, '#5a4a3a', 4);
                const nx = -Math.sin(a) * d, ny = Math.cos(a);
                for (let i = 0; i < 6; i++) A.line(ctx, ex, ey, ex + nx * (44 - i * 6) - Math.cos(a) * d * i * 5, ey + ny * (44 - i * 6) - Math.sin(a) * i * 5, i ? '#c8ffd8' : '#ffffff', 3);
              });
            }
            for (const s of e.souls) A.alpha(ctx, 1 - s.t / 1.6, () => { A.disc(ctx, s.x + ox, s.y + oy, 3, '#7aff9a', '#e8ffe8'); A.px(ctx, s.x + ox - 1, s.y + oy + 3, 2, 3, '#3aff7a'); });
            if (e.slam) { const k = (e.t - e.slam) / 0.9, x = e.sx2 + ox; A.alpha(ctx, Math.max(0, 1 - k), () => { A.px(ctx, x - 6 * (1 - k), gy - 220, 12 * (1 - k) + 1, 220, '#c8ffd8'); A.ring(ctx, x, gy - 4, 20 + k * 200, '#7aff9a', (20 + k * 200) * 0.3, 2); A.ring(ctx, x, gy - 4, 10 + k * 150, '#ffffff', (10 + k * 150) * 0.3, 2); }); }
          },
        }, {});
      },
    },
  };

  // ============================================================== METAL (steel)
  const SPARK = { life: 0.3, update(e, dt) { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 300 * dt; }, draw(e, ctx, ox, oy, A) { A.px(ctx, e.x + ox, e.y + oy, 1, 1, e.t < 0.15 ? '#ffffff' : '#ffd34d'); } };
  const sparks = (A, e, x, y, n) => { for (let i = 0; i < n; i++) A.spawn(e, SPARK, { x, y, vx: A.rnd(-130, 130), vy: A.rnd(-150, 20) }); };
  const BLADE = (ctx, A, x, y, a, d, L, col) => { const nx = -Math.sin(a) * d, ny = Math.cos(a); for (let i = 3; i < L; i++) { const bx = x + Math.cos(a) * i * d, by = y + Math.sin(a) * i; A.px(ctx, bx, by, 1, 1, '#ffffff'); A.px(ctx, bx + nx, by + ny, 1, 1, col); A.px(ctx, bx + nx * 2, by + ny * 2, 1, 1, '#6a7080'); } A.line(ctx, x - Math.cos(a) * 3 * d, y - Math.sin(a) * 3, x + Math.cos(a) * 3 * d, y + Math.sin(a) * 3, '#3a2e24', 2); };
  AW.metal = {
    color: '#9ab8e0', up: '#ffd34d', status: 'shatter', fx: 'filings', block: ['Tower Shield', 'wall'],
    icons: ['gatling', 'carousel', 'drill', 'grenade', 'anvil'],
    look: { fx(ctx, F) { if (Math.floor(F.t * 3) % 4 === 0) { const c = F.at('chest'); F.A.px(ctx, c.x + F.d * 2, c.y - 2 + ((F.t * 20) % 4), 1, 1, '#ffffff'); } } },
    idle: { pose: (t) => IDLE.blade(t), fx(ctx, F) { const h = F.at('handF'); BLADE(ctx, F.A, h.x, h.y, 0.35, F.d, 16, '#9ab8e0'); } },
    run: {
      pose: (ph) => RUN.march(ph),
      step(A, p) { if (W.footfall(p)) { A.sfx('hitMetal', { minGap: 0.15 }); for (let i = 0; i < 2; i++) W.emit(A, SPARK, { x: p.cx - p.facing * 2, y: p.feet - 1, vx: A.rnd(-60, 60), vy: A.rnd(-80, -20) }); } },
    },
    dash: {
      name: 'Rocket Boost', dmg: 13, life: 1.2,
      spawn(e) { e.puffs = []; },
      update(e, dt, g, A) { const p = A.p; if (p.dashT > 0) { A.hit(e, { x: p.x - 4, y: p.y, w: p.w + 8, h: p.h }, { dir: p.facing, kb: 1.6 }); e.puffs.push({ x: p.cx - p.facing * 6, y: p.y + 12, t: e.t }); A.tick(e, { x: p.cx - p.facing * 14 - 5, y: p.y + 6, w: 10, h: 10 }, 0.2, { mult: 0.4, kb: 0 }); } },
      draw(e, ctx, ox, oy, A) { const p = A.p; for (const pf of e.puffs) { const k = e.t - pf.t; if (k < 0.8) A.alpha(ctx, 0.5 * (1 - k / 0.8), () => A.disc(ctx, pf.x + ox, pf.y + oy - k * 8, Math.round(2 + k * 6), '#6a6a78')); } if (p.dashT > 0) { const x = p.cx + ox - p.facing * 7, y = p.y + oy + 10; A.px(ctx, x - 2, y - 4, 4, 8, '#6a7080'); for (let i = 0; i < 3; i++) A.px(ctx, x - p.facing * (4 + i * 3), y - 1 + Math.sin(e.t * 50 + i), 3, 2, i ? '#ff8a2a' : '#ffffff'); } },
    },
    guard: {
      name: 'Tower Shield', sound: 'clang',
      draw(ctx, { A, x, bot, h }) { const w = 12; A.px(ctx, x - w / 2 - 1, bot - h - 3, w + 2, h + 3, '#2a2e38'); A.px(ctx, x - w / 2, bot - h - 2, w, h + 2, '#8a98b0'); A.px(ctx, x - w / 2, bot - h - 2, w, 2, '#c8d8f0'); A.px(ctx, x - w / 2, bot - h - 2, 2, h + 2, '#c8d8f0'); for (const yy of [2, h - 2]) for (const xx of [-4, 3]) A.px(ctx, x + xx, bot - h + yy, 1, 1, '#4a5060'); A.px(ctx, x - 1, bot - h + 6, 2, h - 12, '#ffd34d'); A.px(ctx, x - 4, bot - h / 2 - 1, 8, 2, '#ffd34d'); },
      hit(g, x, y, d) { for (let i = 0; i < 16; i++) dot(g, x, y, d * U.lerp(40, 240, Math.random()), U.lerp(-140, 40, Math.random()), i % 3 ? '#ffd34d' : '#ffffff', { ay: 420, life: 0.35 }); },
    },
    m1: {
      name: 'Chainblade', dmg: 9, cd: 0.4, kind: 'custom', life: 0.36,
      desc: 'Whip out a heavy bladed chain that lashes forward and snaps back.',
      spawn(e, g, A) { A.sfx('swing', { minGap: 0.04 }); },
      update(e, dt, g, A) { H.at(e, A, 4, -1); const k = e.t < 0.14 ? e.t / 0.14 : Math.max(0, 1 - (e.t - 0.14) / 0.22), L = 58 * H.sc(e) * k; e.L = L; A.hit(e, { x: e.dir > 0 ? e.x + L - 12 : e.x - L, y: e.y - 7, w: 12, h: 14 }, { kb: 0.6, onHit(t) { const c = A.center(t); sparks(A, e, c.x, c.y, 4); } }); },
      draw(e, ctx, ox, oy, A) {
        const x = e.x + ox, y = e.y + oy, L = e.L || 0, d = e.dir;
        for (let i = 0; i < L; i += 4) { const wy = y + Math.sin(i * 0.3 + e.t * 30) * (1 - i / Math.max(1, L)) * 3, lx = x + d * i - (d < 0 ? 3 : 0); A.px(ctx, lx, wy - 1, 3, 3, (i / 4) % 2 ? '#6a7080' : '#c8d8f0'); A.px(ctx, lx + 1, wy, 1, 1, '#2a2a3a'); }
        BLADE(ctx, A, x + d * L, y, 0, d, 14, '#9ab8e0');
        if (e.t > 0.1 && e.t < 0.22) W.smear(ctx, A, x + d * (L - 6), y, 12, d, (e.t - 0.1) / 0.12, '#c8d8f0', 3, -1.4, 1.4);
      },
    },
    s: [
      {
        name: 'Gatling Arm', dmg: 4, cd: 7, mp: 6, kind: 'custom', life: 1.1,
        desc: 'Your arm becomes a big spinning gatling gun. BRRRRRRT.',
        spawn(e, g, A) { e.n = 0; A.sfx('energyCharge'); },
        update(e, dt, g, A) {
          H.at(e, A, 10, 0); const p = A.p; p.vx *= 0.5;
          if (e.t <= 0.15) return;
          const want = Math.floor((e.t - 0.15) / (e.up ? 0.04 : 0.055)) + 1;
          while (e.n < want) {
            e.n++;
            A.spawn(e, H.proj((b, ctx, ox, oy, A) => { const x = b.x + ox, y = b.y + oy, d = Math.sign(b.vx) || 1; A.alpha(ctx, 0.4, () => A.px(ctx, d > 0 ? x - 10 : x + 1, y - 1, 10, 3, '#ffd34d')); A.px(ctx, d > 0 ? x - 8 : x + 1, y, 8, 1, '#ffd34d'); A.px(ctx, x, y, 2, 1, '#ffffff'); }, { life: 0.6, r: 3, onHit(b, A) { sparks(A, b, b.x, b.y, 2); } }), { x: e.x + e.dir * 22, y: e.y + A.rnd(-1.5, 1.5), vx: e.dir * 440, vy: A.rnd(-22, 22) });
            A.g.fx.add({ x: e.x + e.dir * 4, y: e.y - 3, vx: -e.dir * A.rnd(30, 80), vy: A.rnd(-120, -60), ay: 400, life: 0.5, color: '#ffd34d', size: 1, fadeOut: 0.2 });
            A.sfx('tick', { value: 120, minGap: 0.03 }); sparks(A, e, e.x + e.dir * 22, e.y, 1);
          }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, d = e.dir, spin = Math.floor(e.t * 40);
          A.px(ctx, d > 0 ? x - 6 : x - 10, y - 4, 16, 8, '#4a5060'); A.px(ctx, d > 0 ? x - 6 : x - 10, y - 4, 16, 1, '#8a98b0');
          for (let i = 0; i < 3; i++) A.px(ctx, d > 0 ? x + 10 : x - 20, y - 3 + ((i + spin) % 3) * 2.5, 10, 1, i === 0 ? '#ffffff' : '#c8d8f0');
          if (e.t > 0.15 && spin % 2) { A.disc(ctx, x + d * 22, y, 4, '#ffd34d', '#ffffff'); for (let i = 0; i < 4; i++) { const a = (i - 1.5) * 0.5; A.line(ctx, x + d * 24, y, x + d * (24 + Math.cos(a) * 8), y + Math.sin(a) * 8, '#ffe95a'); } }
        },
      },
      {
        name: 'Blade Carousel', dmg: 12, cd: 8, mp: 7, kind: 'custom', life: 1.6,
        desc: 'Six swords spin around you in a carousel, then launch outward one by one.',
        spawn(e, g, A) { e.sw = [0, 1, 2, 3, 4, 5].map((i) => ({ i, a: (i / 6) * Math.PI * 2 })); A.sfx('hitMetal'); },
        update(e, dt, g, A) { const p = A.p; e.cx = p.cx; e.cy = p.y + 10; for (const s of e.sw) { if (s.gone) continue; if (!s.vx) { s.a += dt * 7; s.x = e.cx + Math.cos(s.a) * 16; s.y = e.cy + Math.sin(s.a) * 10; A.tickR(e, s.x, s.y, 5, 0.3, { mult: 0.4, kb: 0.4 }); if (e.t > 0.6 + s.i * 0.08) { s.vx = Math.cos(s.a) * 300; s.vy = Math.sin(s.a) * 300; A.sfx('whoosh', { minGap: 0.04 }); } } else { s.x += s.vx * dt; s.y += s.vy * dt; const t = A.targets().find((t) => Phys().rectsOverlap(t.box, { x: s.x - 3, y: s.y - 3, w: 6, h: 6 })); if (t) { A.damage(e, t, 1, 0.5); s.gone = true; sparks(A, e, s.x, s.y, 3); } else if (A.solid(s.x, s.y)) s.gone = true; } } },
        draw(e, ctx, ox, oy, A) { for (const s of e.sw) if (!s.gone && s.x !== undefined) { const a = s.vx ? Math.atan2(s.vy, s.vx) : s.a + Math.PI / 2; BLADE(ctx, A, s.x + ox, s.y + oy, a, 1, 10, '#9ab8e0'); } },
      },
      {
        name: 'Drill Charge', dmg: 6, cd: 7, mp: 6, kind: 'custom', life: 0.65,
        desc: 'Your arm becomes a huge drill. Charge forward grinding through everything in the way, then blow it all apart.',
        spawn(e, g, A) { const p = A.p; e.dir = p.facing; p.vx = e.dir * 220; p.lungeT = 0.55; p.dashGrace = 0.6; A.sfx('rumble', { dur: 0.6 }); },
        update(e, dt, g, A) {
          const p = A.p; e.x = p.cx + e.dir * 12; e.y = p.y + 10;
          A.tick(e, { x: e.dir > 0 ? e.x - 4 : e.x - 18, y: e.y - 8, w: 22, h: 16 }, 0.08, { kb: 0.4, dir: e.dir });
          if (Math.random() < dt * 40) sparks(A, e, e.x + e.dir * 14, e.y, 1);
          if (e.t > 0.55 && !e.end) { e.end = true; W.boom(A, e, e.x + e.dir * 14, e.y, 26 * H.sc(e), { mult: 2.5 }); sparks(A, e, e.x + e.dir * 14, e.y, 10); }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, d = e.dir, s = H.sc(e), n = 18 * s, rot = Math.floor(e.t * 50);
          for (let i = 0; i < n; i++) { const w = Math.max(1, 7 * s - i * 0.38); A.px(ctx, x + d * i, y - w, 1, w * 2, (i + rot) % 4 < 2 ? '#8a98b0' : '#c8d8f0'); if ((i + rot) % 4 === 0) A.px(ctx, x + d * i, y - w, 1, 1, '#ffffff'); }
          A.px(ctx, x + d * n, y, 1, 1, '#ffffff');
          for (let i = 0; i < 4; i++) A.px(ctx, x - d * (4 + i * 5) - (d > 0 ? 4 : 0), y - 6 + ((e.t * 90 + i * 7) % 12), 4, 1, '#c8d8f0');
        },
      },
      {
        name: 'Shrapnel Grenade', dmg: 8, cd: 7, mp: 6, kind: 'custom', life: 0.01,
        desc: 'Lob a grenade. It bounces once... then blows up in a spray of razor shrapnel.',
        spawn(e, g, A) {
          H.at(e, A, 6, -6); A.sfx('swing');
          A.spawn(e, {
            life: 1.6,
            spawn(b) { b.vx = b.dir * 150; b.vy = -170; b.b = 0; },
            update(b, dt, g, A) {
              b.vy += 420 * dt; b.x += b.vx * dt;
              const ny = b.y + b.vy * dt, gy = A.ground(b.x, b.y - 4);
              if (ny + 2 > gy && b.vy > 0) { b.y = gy - 2; b.vy = -b.vy * 0.5; b.vx *= 0.7; b.b++; A.sfx('hitMetal', { minGap: 0.05 }); } else b.y = ny;
              if (A.targets().some((t) => Phys().rectsOverlap(t.box, { x: b.x - 3, y: b.y - 3, w: 6, h: 6 }))) b.b = 2;   // it also goes off on contact
              if (b.b < 2 && b.t <= 1.2) return;
              W.boom(A, b, b.x, b.y - 4, 34 * H.sc(b), { mult: 1.6 });
              const n = b.up ? 18 : 14;
              for (let i = 0; i < n; i++) { const a = -Math.PI + (i / (n - 1)) * Math.PI; A.spawn(b, H.proj((s, ctx, ox, oy, A) => { A.px(ctx, s.x + ox - 1, s.y + oy - 1, 3, 2, '#c8d8f0'); A.px(ctx, s.x + ox, s.y + oy - 1, 1, 1, '#ffffff'); }, { life: 0.5, r: 3 }), { x: b.x, y: b.y - 4, vx: Math.cos(a) * 270, vy: Math.sin(a) * 270 }); }
              b.dead = true;
            },
            draw(b, ctx, ox, oy, A) { A.disc(ctx, b.x + ox, b.y + oy, 4, '#4a5a3a', '#6a7a5a'); A.px(ctx, b.x + ox - 1, b.y + oy - 5, 3, 1, '#c8d8f0'); if (Math.floor(b.t * 12) % 2) { A.px(ctx, b.x + ox, b.y + oy - 6, 1, 1, '#ff3a3a'); A.alpha(ctx, 0.5, () => A.disc(ctx, b.x + ox, b.y + oy - 6, 2, '#ff3a3a')); } },
          }, {});
        },
      },
      {
        name: 'Anvil Drop', dmg: 40, cd: 9, mp: 7, kind: 'custom', life: 1.2,
        desc: 'A giant anvil falls out of nowhere onto the nearest enemy. Classic.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 170); H.at(e, A, 0); e.tx = t ? A.center(t).x : e.x + e.dir * 60; e.gy = H.floor(A, e.tx); e.top = H.sky(A, e.tx, e.gy - 10); A.sfx('whoosh'); },
        update(e, dt, g, A) { if (e.t > 0.4 && !e.land) { e.land = true; A.hit(e, { x: e.tx - 12, y: e.gy - 20, w: 24, h: 20 }, { kb: 0.2, onHit(t) { holdStun(t, 0.9); if (t.applyStatus) t.applyStatus('shatter', e.potency); } }); A.sfx('anvil'); A.shake(6, 0.3); sparks(A, e, e.tx, e.gy - 2, 10); } },
        draw(e, ctx, ox, oy, A) { const x = e.tx + ox, gy = e.gy + oy, q = Math.min(1, e.t / 0.4), y = U.lerp(e.top + oy - 20, gy, W.easeIn(q)), sq = e.land ? Math.max(0, 1 - (e.t - 0.4) / 0.1) * 2 : 0, f = e.t > 0.9 ? 1 - (e.t - 0.9) / 0.3 : 1; A.alpha(ctx, f, () => { A.px(ctx, x - 12, y - 6 + sq, 24, 6 - sq, '#3a3e48'); A.px(ctx, x - 6, y - 12, 12, 6, '#4a5060'); A.px(ctx, x - 14, y - 18, 28, 6, '#5a6070'); A.px(ctx, x - 14, y - 18, 28, 1, '#8a98b0'); A.tri(ctx, x + 18, y - 15, 8, 0, '#5a6070'); if (!e.land) for (let i = 0; i < 3; i++) A.px(ctx, x - 8 + i * 8, y - 30 - i * 3, 1, 8, '#ffffff'); }); },
      },
    ],
    ult: {
      name: 'Iron Dominion', dmg: 10,
      desc: 'Every piece of metal nearby flies to you and forms an enormous war machine. It unleashes countless weapons, then turns its whole body into one devastating attack.',
      charge: {
        pose: (t, k) => J({ FA: [[11, 13.6], [13, 14.4]], BA: [[5.6, 13.6], [3.6, 14.4]], bob: 1, FL: [[10.6, 19.4], [11.4, 22]], BL: [[5.8, 19.4], [5, 22]] }),
        lift: 0,
        draw(ctx, x, y, k, t, A, P) { for (let i = 0; i < 18; i++) { const q = U.clamp(k * 1.6 - i * 0.04, 0, 1), a = i * 2.4, sx = x + Math.cos(a) * 80, sy = y + Math.sin(a) * 50, tx = x - 16 + (i % 6) * 6, ty = y - 20 + Math.floor(i / 6) * 9; const px = U.lerp(sx, tx, q), py = U.lerp(sy, ty, q); A.px(ctx, px - 2, py - 1, 4, 3, i % 2 ? '#8a98b0' : '#c8d8f0'); } if (k > 0.7) { A.px(ctx, x - 8, y - 30, 4, 2, '#ff3a3a'); A.px(ctx, x + 4, y - 30, 4, 2, '#ff3a3a'); } },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.6,
          spawn(e) { e.mx = p.cx; e.gy = p.feet; e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t); e.st = 0; A.sfx('anvil'); A.shake(3, 0.3); },
          update(e, dt, g, A) {
            e.st -= dt;
            if (e.t > 0.4 && e.t < 2.2 && e.st <= 0) { e.st = 0.07; const live = e.ts.filter((t) => !t.dead), t = live[Math.floor(Math.random() * Math.max(1, live.length))]; const c = t ? A.center(t) : { x: e.mx + e.dir * A.rnd(60, 200), y: e.gy - 20 }; const a = Math.atan2(c.y - (e.gy - 60), c.x - e.mx); A.spawn(e, H.proj((b, ctx, ox, oy, A) => { const an = Math.atan2(b.vy, b.vx); BLADE(ctx, A, b.x + ox, b.y + oy, an, 1, b.kind ? 8 : 5, '#9ab8e0'); }, { life: 1, r: 4 }), { x: e.mx, y: e.gy - 60, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, kind: Math.random() < 0.5, dmg: e.dmg * 0.8 }); A.sfx('whoosh', { minGap: 0.04 }); }
            if (e.t > 2.4 && !e.beam) { e.beam = true; e.hit.clear(); A.sfx('boom'); A.flash(0.4); A.shake(12, 0.6); }
            if (e.beam && e.t < 3.0) { const L = 460; A.tick(e, { x: e.dir > 0 ? e.mx : e.mx - L, y: e.gy - 80, w: L, h: 50 }, 0.1, { mult: 1.8, kb: 1.2 }); }
          },
          draw(e, ctx, ox, oy, A) {
            const x = e.mx + ox, gy = e.gy + oy, d = e.dir, rise = Math.min(1, e.t / 0.4), f = e.t > 3.2 ? 1 - (e.t - 3.2) / 0.4 : 1;
            A.alpha(ctx, f, () => {
              // the war machine: legs, a hull, a cannon arm
              A.px(ctx, x - 24, gy - 30 * rise, 12, 30 * rise, '#5a6070'); A.px(ctx, x + 12, gy - 30 * rise, 12, 30 * rise, '#5a6070');
              A.px(ctx, x - 30, gy - 90 * rise, 60, 60 * rise, '#6a7488'); A.px(ctx, x - 30, gy - 90 * rise, 60, 3, '#c8d8f0');
              for (let i = 0; i < 5; i++) A.px(ctx, x - 26 + i * 12, gy - 80 * rise, 2, 2, '#2a2e38');
              A.px(ctx, x - 10, gy - 104 * rise, 20, 14, '#8a98b0'); A.px(ctx, x - 6, gy - 99 * rise, 4, 2, '#ff3a3a'); A.px(ctx, x + 2, gy - 99 * rise, 4, 2, '#ff3a3a');
              const cx = x + d * 30, cy = gy - 64;
              A.px(ctx, d > 0 ? cx : cx - 34, cy - 7, 34, 14, '#4a5060'); A.px(ctx, d > 0 ? cx : cx - 34, cy - 7, 34, 2, '#8a98b0');
              if (e.beam && e.t < 3.0) { const w = 40 * (1 - (e.t - 2.4) / 0.6) + 6, L = Math.max(460, view(A).width); A.px(ctx, d > 0 ? cx + 34 : cx - 34 - L, cy - w / 2, L, w, '#9ab8e0'); A.px(ctx, d > 0 ? cx + 34 : cx - 34 - L, cy - w / 4, L, w / 2, '#ffffff'); A.disc(ctx, cx + d * 34, cy, Math.round(w * 0.6), '#ffffff'); }
              for (let i = 0; i < 4; i++) A.px(ctx, x - 20 + i * 12, gy - 112 * rise - ((e.t * 40 + i * 9) % 10), 2, 4, '#9ab8e0');
            });
          },
        }, {});
      },
    },
  };

  // ================================================================ SAND (gold)
  const GRAIN = { life: 0.7, update(e, dt) { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 140 * dt; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => A.px(ctx, e.x + ox, e.y + oy, 1, 1, e.c || '#ffb84a')); } };
  const grains = (A, e, x, y, n, sp) => { for (let i = 0; i < n; i++) A.spawn(e, GRAIN, { x, y, vx: A.rnd(-1, 1) * (sp || 100), vy: A.rnd(-140, 10), c: i % 3 ? '#ffb84a' : '#fff0c0' }); };
  AW.sand = {
    color: '#ffb84a', up: '#ff6a3a', status: 'slow', fx: 'dust', block: ['Sand Golem Hand', 'wall'],
    icons: ['worm', 'sphinx', 'desertSpears', 'scorpion', 'burrow'],
    look: { fx(ctx, F) { const e = F.at('eye'); F.A.px(ctx, e.x, e.y, 1, 1, '#ffd84a'); for (let i = 0; i < 8; i++) { const a = F.t * 3 + i * 0.8; F.A.px(ctx, F.x + Math.cos(a) * (8 + (i % 3)), F.y - 4 - i * 2.4, 1, 1, i % 2 ? '#ffb84a' : '#fff0c0'); } } },
    idle: { pose: (t) => IDLE.regal(t) },
    run: {
      pose: (ph) => RUN.floatSit(ph, { lift: 5 }),
      back(ctx, F) { const A = F.A; for (let i = -10; i <= 10; i++) { const h = 3 + Math.sin(F.t * 9 + i) * 1.2; A.px(ctx, F.x + i, F.y + 1, 1, h, i % 3 ? '#ffb84a' : '#c88a2a'); } for (let i = 0; i < 6; i++) A.px(ctx, F.x - F.d * (12 + ((F.t * 50 + i * 5) % 16)), F.y + 2 + (i % 3), 1, 1, '#fff0c0'); },
    },
    dash: {
      name: 'Dust Devil Dash', dmg: 10, life: 1.6,
      spawn(e) { e.pts = []; },
      update(e, dt, g, A) { const p = A.p; if (p.dashT > 0) { e.pts.push({ x: p.cx, gy: p.feet, t: e.t }); A.hit(e, { x: p.x - 6, y: p.y, w: p.w + 12, h: p.h }, { kb: 0.8, onHit(t) { if (t.applyStatus) t.applyStatus('blind', 0); } }); } for (const s of e.pts) for (const t of A.targets()) { const c = A.center(t); if (Math.abs(c.x - s.x) < 6 && e.t - s.t < 1.2 && t.applyStatus && !t.status.slow) t.applyStatus('slow', 0); } },
      draw(e, ctx, ox, oy, A) { const p = A.p; if (p.dashT > 0) for (let i = 0; i < 24; i++) { const a = e.t * 30 + i * 0.5, yy = p.feet + oy - (i / 24) * 26; A.px(ctx, p.cx + ox + Math.cos(a) * (2 + i * 0.3), yy, 1, 1, i % 2 ? '#ffb84a' : '#fff0c0'); } for (const s of e.pts) { const a = 1 - (e.t - s.t) / 1.2; if (a > 0) A.alpha(ctx, a * 0.6, () => A.px(ctx, s.x + ox - 3, s.gy + oy - 1, 6, 1, '#c88a2a')); } },
    },
    guard: {
      name: 'Sand Golem Hand', sound: 'thud',
      draw(ctx, { A, x, bot, h, d, t }) { const top = bot - h - 4; A.px(ctx, x - 6, top + 10, 12, h - 6, '#c88a2a'); for (let f = 0; f < 4; f++) A.px(ctx, x - 6 + f * 3, top + (f === 0 || f === 3 ? 4 : 0), 2, 12, f % 2 ? '#ffb84a' : '#e0a040'); A.px(ctx, x + d * 6, top + 12, 3, 6, '#e0a040'); for (let i = 0; i < 5; i++) A.px(ctx, x - 6 + ((t * 30 + i * 5) % 12), bot - ((t * 40 + i * 7) % h), 1, 1, '#fff0c0'); },
      hit(g, x, y, d) { for (let i = 0; i < 16; i++) dot(g, x, y, d * U.lerp(10, 110, Math.random()), U.lerp(-90, 20, Math.random()), i % 2 ? '#ffb84a' : '#fff0c0', { ay: 140, life: 0.6 }); },
    },
    m1: {
      name: 'Sand Scimitar', dmg: 9, cd: 0.36, kind: 'custom', life: 0.3,
      desc: 'Slash with a big curved blade of hardened sand that crumbles into a cloud of grit.',
      spawn(e, g, A) { A.sfx('swing', { minGap: 0.04 }); const p = A.p; grains(A, e, p.cx + p.facing * 18, p.y + 10, 4, 60); },
      update(e, dt, g, A) { H.at(e, A, 0); H.melee(e, A, 34 * H.sc(e), 26, { onHit(t) { const c = A.center(t); grains(A, e, c.x, c.y, 6); } }); },
      draw(e, ctx, ox, oy, A) {
        const k = Math.min(1, e.t / 0.12), x = e.x + ox, y = e.y + oy, d = e.dir, R = 24 * H.sc(e);
        A.alpha(ctx, 1 - Math.max(0, e.t - 0.12) / 0.18, () => {
          W.smear(ctx, A, x, y, R, d, k * 0.8, '#ffb84a', 5, -1.6, 1.0);
          for (let i = 0; i < 8; i++) { const b = U.lerp(-1.6, 1.0, i / 8), r = R + 2 + (i % 3); if (i / 8 < k) A.px(ctx, x + Math.cos(b) * r * d, y + Math.sin(b) * r + ((e.t * 60 + i * 3) % 5), 1, 1, '#fff0c0'); }
        });
      },
    },
    s: [
      {
        name: 'Sand Wyrm', dmg: 28, cd: 7, mp: 6, kind: 'custom', life: 1.4,
        desc: 'A giant sand worm bursts out of the ground beneath your enemies, arcs through the air, and dives back under.',
        spawn(e, g, A) { H.at(e, A, 0); const ax = A.aim(e, 160); e.tx = ax !== null ? ax : e.x + e.dir * 60; e.gy = H.floor(A, e.tx); e.body = []; A.sfx('rumble', { dur: 0.6 }); },
        update(e, dt, g, A) { if (e.t > 0.35 && e.t < 1.15) { const q = (e.t - 0.35) / 0.8, x = e.tx + e.dir * q * 54, y = e.gy - 8 - Math.sin(q * Math.PI) * 44; e.body.unshift({ x, y }); if (e.body.length > 18) e.body.pop(); A.hitR(e, x, y, 12, { kb: 0.4, onHit(t) { if (t.applyStatus) t.applyStatus('launch', 0); } }); if (!e.burst) { e.burst = true; grains(A, e, e.tx, e.gy - 2, 20, 140); A.sfx('crash'); } } },
        draw(e, ctx, ox, oy, A) { if (e.t < 0.35) { for (let i = -12; i <= 12; i += 2) A.px(ctx, e.tx + ox + i, e.gy + oy - 1 - Math.abs(Math.sin(e.t * 20 + i)) * 2, 2, 1, '#c88a2a'); return; } e.body.forEach((s, i) => { const r = Math.max(2, 9 - i * 0.3); A.disc(ctx, s.x + ox, s.y + oy, Math.round(r), i % 2 ? '#c88a2a' : '#e0a040'); if (i % 3 === 0) A.px(ctx, s.x + ox - r, s.y + oy, r * 2, 1, '#8a5a1a'); }); const h = e.body[0]; if (h && e.t < 1.15) { for (let i = -2; i <= 2; i++) A.px(ctx, h.x + ox + i * 3, h.y + oy - 9, 2, 3, '#fff0c0'); A.disc(ctx, h.x + ox, h.y + oy - 2, 4, '#5a2a0a'); } },
      },
      {
        name: 'Sphinx Gaze', dmg: 18, cd: 10, mp: 7, kind: 'custom', life: 1.6,
        desc: 'The head of a great sphinx rises from the sand. Anything that meets its stare is frozen in place.',
        spawn(e, g, A) { H.at(e, A, 0); A.sfx('rumble', { dur: 0.6 }); },
        update(e, dt, g, A) { if (e.t > 0.6 && !e.gaze) { e.gaze = true; A.sfx('surge'); const L = 120 * H.sc(e); for (const o of H.nearby(A, e.x, e.y, L)) if ((o.c.x - e.x) * e.dir > 0) { A.damage(e, o.t, 1, 0); holdStun(o.t, e.up ? 2.2 : 1.6); if (o.t.applyStatus) o.t.applyStatus('slow', e.potency); } } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox - e.dir * 6, gy = A.p.feet + oy, rise = Math.min(1, e.t / 0.5), f = A.fade(e, 0.1, 0.4), top = gy - 40 * rise; A.alpha(ctx, f, () => { A.px(ctx, x - 14, top, 28, 40 * rise, '#e0a040'); A.px(ctx, x - 18, top + 4, 6, 28 * rise, '#3a6aff'); A.px(ctx, x + 12, top + 4, 6, 28 * rise, '#3a6aff'); for (let i = 0; i < 6; i++) A.px(ctx, x - 18, top + 4 + i * 5, 36, 1, '#ffd84a'); A.px(ctx, x - 8, top + 14, 5, 2, '#05030a'); A.px(ctx, x + 3, top + 14, 5, 2, '#05030a'); if (e.gaze) { A.px(ctx, x - 7, top + 14, 3, 2, '#ffffff'); A.px(ctx, x + 4, top + 14, 3, 2, '#ffffff'); const k = (e.t - 0.6) / 1; A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 2; i++) A.line(ctx, x + e.dir * 4, top + 15, x + e.dir * 130, top + 10 + i * 10, '#ffd84a'); }); } }); },
      },
      {
        name: 'Desert Spears', dmg: 12, cd: 6, mp: 6, kind: 'custom', life: 1,
        desc: 'Spears of compressed sand shoot diagonally out of the ground one after another, aimed at your enemy.',
        spawn(e, g, A) { H.at(e, A, 0); e.sp = []; for (let i = 0; i < (e.up ? 6 : 5); i++) { const x = e.x + e.dir * (10 + i * 15); e.sp.push({ x, gy: H.floor(A, x), d: i * 0.07 }); } A.sfx('crash'); },
        update(e, dt, g, A) { for (const s of e.sp) { const lt = e.t - s.d; if (lt > 0.05 && !s.hit) { s.hit = true; A.hit(e, { x: Math.min(s.x, s.x + e.dir * 12), y: s.gy - 26, w: 12, h: 26 }, { kb: 0.8 }); e.hit.clear(); } } },
        draw(e, ctx, ox, oy, A) { for (const s of e.sp) { const lt = e.t - s.d; if (lt < 0) continue; const k = lt < 0.1 ? lt / 0.1 : Math.max(0, 1 - (lt - 0.4) / 0.2), x = s.x + ox, gy = s.gy + oy, L = 28 * k * H.sc(e); A.line(ctx, x, gy, x + e.dir * L * 0.45, gy - L, '#e0a040', 2); A.tri(ctx, x + e.dir * L * 0.45, gy - L, 3, 4, '#fff0c0'); } },
      },
      {
        name: 'Scorpion Strike', dmg: 24, cd: 7, mp: 6, kind: 'custom', life: 1,
        desc: 'A giant scorpion tail lashes up out of the sand and stings the nearest enemy, poisoning it.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 150); e.tg = t; H.at(e, A, 0); e.tx = t ? A.center(t).x : e.x + e.dir * 40; e.ty = t ? A.center(t).y : e.y; e.bx = e.tx - e.dir * 22; e.gy = H.floor(A, e.bx); A.sfx('rumble', { dur: 0.4 }); },
        update(e, dt, g, A) { if (e.t > 0.4 && !e.sting) { e.sting = true; if (e.tg && !e.tg.dead) { A.damage(e, e.tg, 1, 0.4); if (e.tg.applyStatus) { e.tg.applyStatus('poison', e.potency); holdStun(e.tg, 0.5); } } A.sfx('punchHit'); } },
        draw(e, ctx, ox, oy, A) { const bx = e.bx + ox, gy = e.gy + oy, k = e.t < 0.4 ? W.easeOut(e.t / 0.4) : Math.max(0, 1 - (e.t - 0.6) / 0.4); if (k <= 0) return; const tx = U.lerp(bx, e.tx + ox, k), ty = U.lerp(gy - 12, e.ty + oy, k), cx = bx - e.dir * 6, cy = gy - 34 * k; for (let i = 0; i <= 8; i++) { const q = i / 8, x = (1 - q) * (1 - q) * bx + 2 * (1 - q) * q * cx + q * q * tx, y = (1 - q) * (1 - q) * gy + 2 * (1 - q) * q * cy + q * q * ty; A.disc(ctx, x, y, Math.max(2, Math.round(4 - q * 2)), '#c88a2a', '#e0a040'); } A.tri(ctx, tx + e.dir * 2, ty + 3, 4, 6, '#5a2a0a'); A.px(ctx, tx + e.dir * 2, ty + 2, 1, 1, '#9ad83a'); },
      },
      {
        name: 'Burrow Strike', dmg: 22, cd: 8, mp: 6, kind: 'custom', life: 0.9,
        desc: 'Dive into the sand, tunnel under the nearest enemy and burst out in a geyser of sand with an uppercut.',
        spawn(e, g, A) { const p = A.p, t = A.near(p.cx, p.y, 170); e.from = p.cx; e.gy = p.feet; e.tg = t; grains(A, e, p.cx, p.feet - 2, 12); A.sfx('rumble', { dur: 0.3 }); p.dashGrace = 0.6; },
        update(e, dt, g, A) {
          const p = A.p;
          if (e.t <= 0.35 || e.up2) return;
          e.up2 = true;
          if (e.tg && !e.tg.dead) { const c = A.center(e.tg), nx = c.x - p.w / 2; if (!Phys().overlapsSolid(g.level, nx, p.y, p.w, p.h)) p.x = nx; }
          p.vy = -280; grains(A, e, p.cx, p.feet - 2, 22, 160);
          A.hitR(e, p.cx, p.y + 10, 22 * H.sc(e), { kb: 0.4, onHit(t) { if (t.applyStatus) t.applyStatus('launch', 0); } });
          W.boom(A, e, p.cx, p.feet - 6, 30 * H.sc(e), { mult: 0.6, flat: 0.5 });
          A.sfx('crash'); e.to = p.cx;
        },
        draw(e, ctx, ox, oy, A) {
          const gy = e.gy + oy;
          if (!e.up2) { const k = Math.min(1, e.t / 0.35), tx = e.tg && !e.tg.dead ? A.center(e.tg).x : e.from, mx = U.lerp(e.from, tx, k) + ox; A.px(ctx, mx - 8, gy - 3, 16, 3, '#c88a2a'); A.px(ctx, mx - 5, gy - 5, 10, 2, '#ffb84a'); for (let i = 0; i < 6; i++) A.px(ctx, mx - 7 + i * 3, gy - 6 - Math.abs(Math.sin(e.t * 30 + i)) * 4, 1, 1, '#fff0c0'); return; }
          const k = (e.t - 0.35) / 0.55, x = e.to + ox, h = 50 * H.sc(e) * Math.min(1, k * 6);
          A.alpha(ctx, 1 - k, () => { for (let yy = 0; yy < h; yy++) { const w = 6 + (yy / Math.max(1, h)) * 6 + Math.sin(yy * 0.5 + e.t * 30) * 1.5; A.px(ctx, x - w, gy - yy, w * 2, 1, (yy + Math.floor(e.t * 50)) % 5 < 2 ? '#fff0c0' : '#ffb84a'); } });
        },
      },
    ],
    ult: {
      name: 'Eternal Desert', dmg: 9,
      desc: 'A colossal desert storm buries the battlefield. Sand twisters, giant sand creatures and blades of compressed sand attack together, then the whole storm collapses onto your enemy.',
      charge: {
        pose: (t, k) => J({ lean: -1, FA: [[11, 11.4], [12.6, 8.4]], BA: [[5.4, 11.4], [3.8, 8.4]], bob: 0 }),
        lift: 4,
        draw(ctx, x, y, k, t, A, P) { for (let i = 0; i < 80; i++) { const q = i / 80, a = t * 5 + i * 0.5, r = 6 + q * 46 * k, yy = y + 14 - q * 50 * k; A.px(ctx, x + Math.cos(a) * r, yy + Math.sin(a) * r * 0.2, 2, 1, i % 3 ? '#ffb84a' : '#fff0c0'); } A.alpha(ctx, 0.3 * k, () => A.px(ctx, x - 300, y - 200, 600, 400, '#c88a2a')); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 4, layer: 'screen',
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t); const c = e.ts[0] ? A.center(e.ts[0]) : { x: p.cx + e.dir * 100, y: p.y }; e.cx = c.x; e.gy = A.ground(c.x, p.y + 2); e.tw = [-1, 1].map((s) => ({ x: c.x + s * 120, s })); e.st = 0; e.blades = []; e.dust = []; A.sfx('rumble', { dur: 3.4 }); A.sfx('whoosh'); },
          update(e, dt, g, A) {
            e.st -= dt; for (const b of e.blades) b.t += dt;
            for (const d of e.dust) { d.t += dt; d.vy += 300 * dt; d.x += d.vx * dt; d.y += d.vy * dt; }
            e.dust = e.dust.filter((d) => d.t < 1.4);
            // two great twisters closing in
            for (const t of e.tw) { t.x = U.approach(t.x, e.cx + t.s * 34, 0.8, dt); A.tick(e, { x: t.x - 24, y: e.gy - 140, w: 48, h: 140 }, 0.2, { mult: 0.5, kb: 0 }); }
            // blades of compressed sand slicing across the whole storm
            if (e.t > 0.4 && e.t < 2.7 && e.st <= 0) { e.st = 0.1; const y = e.gy - A.rnd(10, 70), d = Math.random() < 0.5 ? 1 : -1; e.blades.push({ y, d, t: 0 }); A.hit(e, { x: p.cx - 320, y: y - 5, w: 640, h: 10 }, { mult: 0.6, kb: 0.2 }); e.hit.clear(); }
            for (const t of e.ts) if (!t.dead && t.applyStatus && !t.status.blind) t.applyStatus('blind', 0);
            // a colossal sand wyrm bursts up under them
            if (e.t > 1 && !e.wyrm) { e.wyrm = e.t; A.hitR(e, e.cx, e.gy - 30, 40, { mult: 2, kb: 1 }); e.hit.clear(); A.sfx('crash'); A.shake(8, 0.4); for (let i = 0; i < 30; i++) e.dust.push({ x: e.cx + A.rnd(-20, 20), y: e.gy, vx: A.rnd(-160, 160), vy: A.rnd(-260, -60), t: 0 }); }
            // ...and the whole storm collapses onto them
            if (e.t > 2.9 && !e.boom) { e.boom = e.t; A.blast(e, e.cx, e.gy - 30, 140 * H.sc(e), { dmg: e.dmg * 8 }); A.flash(0.35); A.shake(14, 0.6); A.sfx('crash'); A.sfx('boom'); for (let i = 0; i < 50; i++) e.dust.push({ x: e.cx, y: e.gy - 10, vx: A.rnd(-300, 300), vy: A.rnd(-300, -40), t: 0 }); }
          },
          draw(e, ctx, ox, oy, A) {
            const V = view(A), f = e.t > 3.4 ? 1 - (e.t - 3.4) / 0.6 : Math.min(1, e.t * 3), gy = e.gy + oy;
            A.alpha(ctx, 0.5 * f, () => A.px(ctx, -10, -10, 2000, 2000, '#c88a2a'));
            // the storm: sand screaming across the whole screen
            A.alpha(ctx, f, () => { for (let i = 0; i < 160; i++) { const yy = -10 + ((i * 37) % (V.height + 20)), xx = ((e.t * 420 + i * 67) % (V.width + 200)) - 100; A.px(ctx, xx, yy, 8 + (i % 3) * 4, 1, i % 3 ? '#ffb84a' : '#fff0c0'); } });
            for (const t of e.tw) { const x = t.x + ox; A.alpha(ctx, f, () => { A.alpha(ctx, 0.3, () => { for (let yy = 0; yy < 140; yy += 2) { const r = 6 + (yy / 140) * 26; A.px(ctx, x - r, gy - yy, r * 2, 1, '#c88a2a'); } }); for (let i = 0; i < 120; i++) { const q = i / 120, a = e.t * 9 + i * 0.6, r = 6 + q * 26; A.px(ctx, x + Math.cos(a) * r, gy - q * 140, 3, 1, i % 3 ? '#e0a040' : '#fff0c0'); } }); }
            for (const b of e.blades) if (b.t < 0.22) A.alpha(ctx, f * (1 - b.t / 0.22), () => { const x0 = b.d > 0 ? -10 + b.t * 3600 : V.width + 10 - b.t * 3600 - 80; A.px(ctx, x0, b.y + oy - 2, 80, 4, '#fff0c0'); A.px(ctx, x0, b.y + oy - 1, 80, 2, '#ffffff'); });
            // the wyrm
            if (e.wyrm && !e.boom) {
              const k = Math.min(1, (e.t - e.wyrm) / 0.35), x = e.cx + ox, top = gy - 160 * k + Math.sin(e.t * 3) * 6;
              A.alpha(ctx, f * 0.95, () => {
                for (let yy = top + 30; yy < gy; yy += 3) { const w = 26 + Math.sin(yy * 0.08 + e.t * 4) * 3; A.px(ctx, x - w / 2 + Math.sin(yy * 0.05 + e.t * 3) * 6, yy, w, 3, (Math.floor(yy / 3) % 4) ? '#c88a2a' : '#e0a040'); }
                A.disc(ctx, x, top + 22, 20, '#c88a2a', '#e0a040');
                const open = 8 + Math.sin(e.t * 14) * 4;
                A.px(ctx, x - 20, top + 6 - open, 40, 10, '#a86a1a'); A.px(ctx, x - 20, top + 28 + open, 40, 8, '#a86a1a');
                for (let i = -16; i <= 16; i += 5) { A.tri(ctx, x + i, top + 16 - open, 3, -6, '#fff0c0'); A.tri(ctx, x + i, top + 28 + open, 3, 6, '#fff0c0'); }
                A.px(ctx, x - 10, top + 2 - open, 4, 3, '#ff3a2a'); A.px(ctx, x + 6, top + 2 - open, 4, 3, '#ff3a2a');
              });
            }
            for (const d of e.dust) A.alpha(ctx, 1 - d.t / 1.4, () => A.px(ctx, d.x + ox, d.y + oy, 2, 2, d.t < 0.3 ? '#fff0c0' : '#c88a2a'));
            if (e.boom) { const k = (e.t - e.boom) / 1.1; A.alpha(ctx, Math.max(0, 1 - k), () => { A.disc(ctx, e.cx + ox, gy - 30, Math.round(20 + k * 60), '#e0a040', '#fff0c0'); A.ring(ctx, e.cx + ox, gy - 30, 20 + k * 200, '#ffb84a', (20 + k * 200) * 0.5, 2); A.ring(ctx, e.cx + ox, gy - 30, 10 + k * 150, '#ffffff', (10 + k * 150) * 0.5, 2); }); }
          },
        }, {});
      },
    },
  };

  // ============================================================= MAGMA (core)
  const LAVA = { life: 1.2, update(e, dt, g, A) { e.vy += 420 * dt; e.x += e.vx * dt; e.y += e.vy * dt; if (A.solid(e.x, e.y)) { e.dead = true; A.puff(e, e.x, e.y - 2, 2); } }, draw(e, ctx, ox, oy, A) { A.disc(ctx, e.x + ox, e.y + oy, e.r || 2, '#ff4a1a', '#ffe95a'); } };
  const lavaBurst = (A, e, x, y, n, sp) => { for (let i = 0; i < n; i++) A.spawn(e, LAVA, { x, y, vx: A.rnd(-1, 1) * (sp || 90), vy: A.rnd(-260, -100), r: Math.random() < 0.3 ? 3 : 2 }); };
  AW.magma = {
    color: '#ff4a1a', up: '#ffe95a', status: 'scorch', fx: 'cinders', block: ['Magma Dome', 'bubble'],
    icons: ['pyroclast', 'caldera', 'moltenArmor', 'magmaSlime', 'heatwave'],
    look: { fx(ctx, F) { const c = F.at('chest'); if (Math.floor(F.t * 6) % 3 === 0) F.A.px(ctx, c.x - F.d, c.y, 1, 2, '#ffe95a'); F.A.alpha(ctx, 0.2, () => { for (let i = 0; i < 3; i++) F.A.px(ctx, F.x - 6 + i * 6 + Math.sin(F.t * 6 + i) * 1.5, F.y - 28 - ((F.t * 20 + i * 5) % 8), 2, 3, '#ffb84a'); }); } },
    idle: { pose: (t) => IDLE.press(t), fx(ctx, F) { for (const h of ['handF', 'handB']) { const p = F.at(h); F.A.px(ctx, p.x - 1, p.y, 3, 2, '#ff4a1a'); F.A.px(ctx, p.x, p.y, 1, 1, '#ffe95a'); if (Math.sin(F.t * 4 + (h === 'handF' ? 0 : 3)) > 0.8) F.A.px(ctx, p.x, p.y + 3 + ((F.t * 30) % 5), 1, 2, '#ff8a2a'); } } },
    run: {
      pose: (ph) => RUN.charge(ph),
      step(A, p) { if (W.footfall(p)) W.emit(A, { life: 1.8, draw(e, ctx, ox, oy, A) { const k = e.t / e.life; A.px(ctx, e.x + ox - 2, e.y + oy - 1, 5, 1, k < 0.5 ? '#ffe95a' : k < 0.8 ? '#ff4a1a' : '#5a1a0a'); } }, { x: p.cx - p.facing * 2, y: p.feet }); },
    },
    dash: {
      name: 'Meteor Rush', dmg: 14, life: 0.9,
      update(e, dt, g, A) { const p = A.p; if (p.dashT > 0) { A.hit(e, { x: p.x - 4, y: p.y, w: p.w + 8, h: p.h }, { dir: p.facing, kb: 1.2 }); } else if (!e.crash) { e.crash = true; e.cx = p.cx + p.facing * 6; e.gy = p.feet; A.hitR(e, e.cx, e.gy - 6, 20, { kb: 1.4, mult: 1.2 }); lavaBurst(A, e, e.cx, e.gy - 4, 8, 90); A.sfx('crash'); A.shake(3, 0.2); } },
      draw(e, ctx, ox, oy, A) { const p = A.p; if (p.dashT > 0) { const x = p.cx + ox, y = p.y + oy + 10; A.alpha(ctx, 0.7, () => A.disc(ctx, x, y, 9, '#ff4a1a')); for (let i = 1; i < 6; i++) A.alpha(ctx, 0.6 - i * 0.1, () => A.disc(ctx, x - p.facing * i * 5, y, Math.max(1, 8 - i), i % 2 ? '#ffe95a' : '#ff8a2a')); } else if (e.crash) { const k = (e.t - 0.16) / 0.7; A.alpha(ctx, Math.max(0, 1 - k), () => { A.px(ctx, e.cx + ox - 10, e.gy + oy - 2, 20, 2, '#ff4a1a'); A.ring(ctx, e.cx + ox, e.gy + oy - 3, 4 + k * 16, '#ffe95a', 2 + k * 3); }); } },
    },
    guard: {
      name: 'Magma Dome', sound: 'crackle',
      draw(ctx, { A, x, bot, h, t }) { const cy = bot - h / 2; for (let yy = -h / 2; yy <= h / 2; yy++) { const w = 7 * Math.sqrt(Math.max(0, 1 - (yy * yy) / (h * h / 4))); A.px(ctx, x - w, cy + yy, w * 2, 1, (yy + Math.floor(t * 10)) % 5 ? '#ff4a1a' : '#ffe95a'); } for (let i = 0; i < 3; i++) { const r = (t * 1.6 + i / 3) % 1; A.disc(ctx, x - 3 + i * 3, cy + h / 2 - r * h, 1, '#ffe95a'); } A.alpha(ctx, 0.4, () => A.px(ctx, x - 2, cy - h / 2 + 2, 2, h - 4, '#ffffff')); },
      hit(g, x, y, d) { for (let i = 0; i < 12; i++) dot(g, x, y, d * U.lerp(30, 120, Math.random()), U.lerp(-170, -40, Math.random()), i % 2 ? '#ff4a1a' : '#ffe95a', { ay: 460, size: 2, life: 0.7 }); },
    },
    m1: {
      name: 'Magma Kick', dmg: 10, cd: 0.38, kind: 'custom', life: 0.28,
      desc: 'A molten kick combo: low kick, high kick, then an axe kick that splashes lava across the ground.',
      spawn(e, g, A) { const p = A.p; p._mkick = ((p._mkick || 0) + 1) % 3; e.n = p._mkick; A.sfx(e.n === 0 ? 'crash' : 'swing', { minGap: 0.04 }); if (e.n === 0) { const fx = p.cx + p.facing * 20; lavaBurst(A, e, fx, p.feet - 2, 6, 80); A.spawn(e, W.SHOCK, { x: fx, y: p.feet - 2, r: 18, flat: 0.45, dmg: 0 }); A.shake(2, 0.1); } },
      update(e, dt, g, A) { H.at(e, A, 0); const y = e.n === 1 ? 6 : e.n === 2 ? -8 : 0, L = 34 * H.sc(e); A.hit(e, { x: e.dir > 0 ? e.x : e.x - L, y: e.y + y - 11, w: L, h: 22 }, { mult: e.n === 0 ? 1.6 : 1, kb: e.n === 0 ? 1.4 : 0.6, onHit(t) { if (e.n === 0) { const c = A.center(t); lavaBurst(A, e, c.x, c.y, 5, 60); } } }); },
      draw(e, ctx, ox, oy, A) {
        const k = Math.min(1, e.t / 0.1), x = e.x + ox, y = e.y + oy, d = e.dir, f = 1 - Math.max(0, e.t - 0.1) / 0.18;
        A.alpha(ctx, f, () => {
          if (e.n === 1) W.smear(ctx, A, x, y + 6, 22, d, k * 0.8, '#ff4a1a', 4, 0.2, 1.1);
          else if (e.n === 2) W.smear(ctx, A, x, y - 4, 24, d, k * 0.8, '#ff8a2a', 4, -1.4, -0.1);
          else { W.smear(ctx, A, x, y - 10, 28, d, k * 0.8, '#ffe95a', 6, -1.8, 0.9); A.disc(ctx, x + d * 20, y + 8, Math.max(1, Math.round(5 * k)), '#ff4a1a', '#ffe95a'); }
        });
      },
    },
    s: [
      {
        name: 'Pyroclastic Flow', dmg: 10, cd: 7, mp: 6, kind: 'custom', life: 1.6,
        desc: 'A boiling avalanche of ash and lava races along the ground away from you.',
        spawn(e, g, A) { H.at(e, A, 10); e.gy = H.floor(A, e.x); A.sfx('rumble', { dur: 1 }); },
        update(e, dt, g, A) { e.x += e.dir * 210 * dt; e.gy = A.ground(e.x, e.gy - 20); if (A.solid(e.x + e.dir * 8, e.gy - 10)) e.t = Math.max(e.t, e.life - 0.3); A.tick(e, { x: e.x - 24, y: e.gy - 22, w: 30, h: 22 }, 0.18, { kb: 0.8, dir: e.dir }); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, gy = e.gy + oy, f = A.fade(e, 0.05, 0.3); A.alpha(ctx, f, () => { for (let i = 0; i < 8; i++) A.disc(ctx, x - e.dir * i * 4 + Math.sin(e.t * 10 + i) * 2, gy - 6 - (i % 3) * 5 - Math.abs(Math.sin(e.t * 6 + i)) * 4, 6 - (i % 3), i % 2 ? '#4a3a34' : '#6a5a54'); for (let i = 0; i < 10; i++) A.px(ctx, x - e.dir * i * 3, gy - 2 - (i % 2), 3, 2, i % 3 ? '#ff4a1a' : '#ffe95a'); }); },
      },
      {
        name: 'Caldera', dmg: 22, cd: 8, mp: 7, kind: 'custom', life: 1.2,
        desc: 'Stomp: a ring of lava erupts out of the ground at a distance around you, catching everything nearby.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx; e.gy = p.feet; A.sfx('crash'); A.shake(3, 0.2); },
        update(e, dt, g, A) { if (e.t > 0.35 && !e.go) { e.go = true; const R = 50 * H.sc(e); for (const s of [-1, 1]) A.hit(e, { x: e.x + s * R - 16, y: e.gy - 40, w: 32, h: 40 }, { kb: 0.4, onHit(t) { if (t.applyStatus) t.applyStatus('launch', 0); } }); A.hitR(e, e.x, e.gy - 10, R * 0.8, { mult: 0.4, kb: 0.4 }); A.sfx('boom'); A.shake(4, 0.3); for (const s of [-1, 1]) lavaBurst(A, e, e.x + s * R, e.gy - 30, 6, 60); } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, gy = e.gy + oy, R = 50 * H.sc(e); if (!e.go) { const k = e.t / 0.35; for (let i = -R; i <= R; i += 3) if (Math.abs(i) > R * (1 - k)) A.px(ctx, x + i, gy - 1, 2, 1, '#ff4a1a'); return; } const k = (e.t - 0.35) / 0.85; A.alpha(ctx, 1 - k, () => { for (const s of [-1, 1]) for (let j = -2; j <= 2; j++) { const h = (36 - Math.abs(j) * 8) * Math.min(1, k * 5) * H.sc(e); A.px(ctx, x + s * R + j * 5 - 2, gy - h, 4, h, j % 2 ? '#ff4a1a' : '#ffe95a'); } A.px(ctx, x - R, gy - 1, R * 2, 1, '#5a1a0a'); }); },
      },
      {
        name: 'Molten Armor', dmg: 4, cd: 15, mp: 6, kind: 'custom', life: 6,
        desc: 'Erupt into a coat of molten rock: the eruption scorches everything near you, you take less damage, and anything that touches you burns.',
        spawn(e, g, A) { const p = A.p; p.ab.buffs.armor = { t: e.life * (e.up ? 1.3 : 1), up: e.up, pal: e.pal }; A.g.floatText(p.cx, p.y - 10, 'MOLTEN ARMOR', e.pal.l); A.sfx('ignite'); W.boom(A, e, p.cx, p.y + 12, 38 * H.sc(e), { mult: 3.5 }); lavaBurst(A, e, p.cx, p.y + 10, 10, 120); },
        update(e, dt, g, A) { const p = A.p; e.x = p.cx; e.y = p.y; if (!p.ab.buffs.armor) { e.dead = true; return; } A.tick(e, { x: p.x - 4, y: p.y, w: p.w + 8, h: p.h }, 0.4, { kb: 0.6 }); },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy;
          A.alpha(ctx, 0.25 + 0.1 * Math.sin(e.t * 8), () => A.disc(ctx, x, y + 11, 13, '#ff4a1a'));
          for (let i = 0; i < 7; i++) { const yy = y + 2 + i * 3, w = 12 - Math.abs(i - 3); A.alpha(ctx, 0.6, () => A.px(ctx, x - w / 2, yy, w, 2, i % 2 ? '#3a1a10' : '#5a2a1a')); if ((i + Math.floor(e.t * 6)) % 3 === 0) A.px(ctx, x - w / 2 + 2, yy, 3, 1, '#ffe95a'); }
          for (let i = 0; i < 4; i++) { const fx = x - 6 + i * 4, fh = 3 + Math.abs(Math.sin(e.t * 9 + i * 2)) * 4; A.px(ctx, fx, y + 2 - fh, 1, fh, i % 2 ? '#ff8a2a' : '#ffe95a'); }
        },
      },
      {
        name: 'Magma Slime', dmg: 26, cd: 10, mp: 7, kind: 'custom', life: 4,
        desc: 'Spawn a little slime of living magma. It hops at the nearest enemy and explodes. It is very proud of itself.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx + p.facing * 10; e.gy = p.feet; e.vy = 0; e.y = 0; e.ht = 0.2; A.sfx('slimeHop' in ERX.SfxBank ? 'slimeHop' : 'pop'); },
        update(e, dt, g, A) {
          const t = A.near(e.x, e.gy - 6, 220); e.ht -= dt;
          // each hop is aimed to land on the target (no leapfrogging over it)
          if (e.y >= 0 && e.ht <= 0) { e.vy = -180; e.y = -0.01; e.ht = 0.35; e.hvx = t ? U.clamp((A.center(t).x - e.x) / 0.6, -90, 90) : (A.p.facing || 1) * 60; A.sfx('slimeHop', { minGap: 0.1 }); }
          if (e.y < 0) { e.vy += 600 * dt; e.y = Math.min(0, e.y + e.vy * dt); const nx = e.x + (e.hvx || 0) * dt; if (!A.solid(nx, e.gy - 6)) e.x = nx; e.gy = A.ground(e.x, e.gy - 16); }
          if (t && Phys().rectsOverlap(t.box, { x: e.x - 5, y: e.gy + e.y - 8, w: 10, h: 8 })) { A.blast(e, e.x, e.gy - 6, 30 * H.sc(e)); lavaBurst(A, e, e.x, e.gy - 6, 10, 100); e.dead = true; }
        },
        onEnd(e, A) { if (!e.boomed) { A.puff(e, e.x, e.gy - 4, 6); } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.gy + oy + e.y, sq = e.y >= 0 ? 1 : 0; A.px(ctx, x - 5, y - 7 + sq, 10, 7 - sq, '#ff4a1a'); A.px(ctx, x - 4, y - 8 + sq, 8, 1, '#ff8a2a'); A.px(ctx, x - 3, y - 6, 2, 2, '#ffffff'); A.px(ctx, x + 1, y - 6, 2, 2, '#ffffff'); A.px(ctx, x - 2, y - 5, 1, 1, '#05030a'); A.px(ctx, x + 2, y - 5, 1, 1, '#05030a'); A.px(ctx, x - 3, y - 7, 1, 1, '#ffe95a'); },
      },
      {
        name: 'Heat Wave', dmg: 14, cd: 7, mp: 6, kind: 'custom', life: 0.8,
        desc: 'Release a wave of searing heat. The air ripples, everything nearby is scorched and blown back.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx; e.y = p.y + 10; A.sfx('ignite'); A.hitR(e, e.x, e.y, 64 * H.sc(e), { kb: 1.6, onHit(t) { if (t.applyStatus) { t.applyStatus('scorch', e.potency); t.applyStatus('scorch', e.potency); } } }); },
        draw(e, ctx, ox, oy, A) { const k = e.t / e.life, R = 64 * H.sc(e) * Math.min(1, k * 2), x = e.x + ox, y = e.y + oy; A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 3; i++) { const r = R - i * 8; if (r > 0) for (let a = 0; a < Math.PI * 2; a += 0.08) A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7 + Math.sin(a * 8 + e.t * 30) * 1.5, 1, 1, i === 0 ? '#ffe95a' : '#ff8a2a'); } }); },
      },
    ],
    ult: {
      name: 'Core Eruption', dmg: 9,
      desc: 'Tear the ground open down to the planet\'s core. Rivers of magma pour out everywhere, volcanic blasts tear through the battlefield, then one colossal eruption launches skyward.',
      charge: {
        pose: (t, k) => J({ bob: 2, lean: 1, FA: [[11.6, 15.6], [13.4, 19]], BA: [[6, 15.6], [5, 19]], FL: [[11, 19.8], [12, 22]], BL: [[5.4, 19.8], [4.4, 22]], fist: true }),
        lift: 0,
        draw(ctx, x, y, k, t, A, P) { for (const s of [-1, 1]) { let lx = x; for (let i = 0; i < 50 * k; i += 4) { const nx = x + s * i, ny = y + 13 + Math.sin(i * 0.4) * 1.5; A.line(ctx, lx, y + 13, nx, ny, Math.sin(t * 10 + i) > 0 ? '#ffe95a' : '#ff4a1a'); lx = nx; } } A.alpha(ctx, k, () => { for (let i = 0; i < 6; i++) A.disc(ctx, x - 16 + i * 6, y + 12 - Math.abs(Math.sin(t * 7 + i)) * 12 * k, 2, '#ff4a1a', '#ffe95a'); }); A.alpha(ctx, 0.25 * k, () => A.px(ctx, x - 300, y - 200, 600, 400, '#5a1a0a')); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.8,
          spawn(e) { e.x = p.cx; e.gy = p.feet; e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t); const c = e.ts[0] ? A.center(e.ts[0]) : { x: p.cx + e.dir * 100, y: p.y }; e.cx = c.x; e.vents = []; e.bt = 0; A.sfx('rumble', { dur: 3.4 }); A.shake(3, 3); },
          update(e, dt, g, A) {
            e.bt -= dt; for (const v of e.vents) v.t += dt;
            if (e.t > 0.3 && e.t < 3) A.tick(e, { x: p.cx - 320, y: e.gy - 8, w: 640, h: 8 }, 0.3, { mult: 0.35, kb: 0 });
            if (e.t > 0.5 && e.t < 2.4 && e.bt <= 0) { e.bt = 0.15; const live = e.ts.filter((t) => !t.dead), t = live[Math.floor(Math.random() * Math.max(1, live.length))]; const x = t ? A.center(t).x + A.rnd(-12, 12) : p.cx + A.rnd(-240, 240); const gy = A.ground(x, e.gy - 30); e.vents.push({ x, gy, t: 0 }); A.hit(e, { x: x - 12, y: gy - 60, w: 24, h: 60 }, { mult: 0.9, kb: 0.4 }); e.hit.clear(); lavaBurst(A, e, x, gy - 30, 5, 70); A.sfx('boom', { minGap: 0.06 }); }
            if (e.t > 2.6 && !e.fin) { e.fin = true; A.hit(e, { x: e.cx - 50, y: A.top() - 20, w: 100, h: e.gy - A.top() + 20 }, { mult: 7, kb: 0, onHit(t) { if (t.applyStatus) t.applyStatus('launch', 0); } }); A.flash(0.4); A.shake(14, 0.7); A.sfx('boom'); lavaBurst(A, e, e.cx, e.gy - 60, 30, 160); }
          },
          draw(e, ctx, ox, oy, A) {
            const gy = e.gy + oy, f = e.t > 3.3 ? 1 - (e.t - 3.3) / 0.5 : 1;
            A.alpha(ctx, 0.3 * f, () => A.px(ctx, -10, -10, 2000, 2000, '#3a0a04'));
            A.alpha(ctx, f, () => { for (let i = -320; i < 320; i += 2) { const h = 2 + Math.abs(Math.sin(i * 0.07 + e.t * 3)) * 3; A.px(ctx, p.cx + ox + i, gy - h, 2, h, (i / 2 + Math.floor(e.t * 8)) % 5 ? '#ff4a1a' : '#ffe95a'); } });
            for (const v of e.vents) if (v.t < 0.6) A.alpha(ctx, 1 - v.t / 0.6, () => { const h = 60 * Math.min(1, v.t * 6); A.px(ctx, v.x + ox - 6, v.gy + oy - h, 12, h, '#ff4a1a'); A.px(ctx, v.x + ox - 2, v.gy + oy - h, 4, h, '#ffe95a'); A.disc(ctx, v.x + ox, v.gy + oy - h, 7, '#ff8a2a'); });
            if (e.fin) { const k = (e.t - 2.6) / 1.2, top = A.top() + oy; A.alpha(ctx, 1 - k, () => { const w = 60 * (1 - k * 0.5); A.px(ctx, e.cx + ox - w / 2, top, w, gy - top, '#ff4a1a'); A.px(ctx, e.cx + ox - w / 4, top, w / 2, gy - top, '#ffe95a'); A.px(ctx, e.cx + ox - w / 10, top, w / 5, gy - top, '#ffffff'); }); }
          },
        }, {});
      },
    },
  };

  // ============================================================ STORM (tempest)
  const BOLT = (ctx, A, x, y0, y1, col, seed) => { let lx = x; for (let yy = y0; yy < y1; yy += 6) { const nx = x + Math.sin(yy * 0.37 + seed) * 5; A.line(ctx, lx, yy, nx, yy + 6, '#ffffff', 2); A.line(ctx, lx + 1, yy, nx + 1, yy + 6, col, 1); lx = nx; } };
  const CLOUD = (ctx, A, x, y, w, col, col2) => { for (let i = 0; i < 5; i++) A.disc(ctx, x - w / 2 + (i / 4) * w, y + (i % 2) * 2, Math.round(w / 5 + (i % 2 ? 1 : 3)), col, col2); };
  AW.storm = {
    color: '#6a8aff', up: '#ffe94a', status: 'shock', fx: 'rain', block: ['Cyclone Bulwark', 'swirl'],
    icons: ['spiral', 'waterspout', 'surfer', 'shear', 'thunderhead'],
    look: { fx(ctx, F) { const h = F.at('headTop'); CLOUD(ctx, F.A, h.x, h.y - 8, 14, '#3a4a7a', '#5a6a9a'); for (let i = 0; i < 4; i++) F.A.px(ctx, h.x - 6 + i * 4, h.y - 4 + ((F.t * 60 + i * 5) % 10), 1, 2, '#8ab0e0'); if (Math.floor(F.t * 5) % 7 === 0) BOLT(ctx, F.A, h.x + 2, h.y - 6, h.y + 4, '#ffe94a', F.t * 30); } },
    idle: { pose: (t) => IDLE.sky(t), fx(ctx, F) { for (const s of ['handF', 'handB']) { const p = F.at(s); if (Math.random() < 0.3) F.A.px(ctx, p.x + Math.round(Math.random() * 4 - 2), p.y - 2, 1, 1, '#ffe94a'); } } },
    run: {
      pose: (ph) => RUN.ride(ph, { lift: 6 }),
      back(ctx, F) { CLOUD(ctx, F.A, F.x, F.y + 3, 22, '#3a4a7a', '#6a7aaa'); for (let i = 0; i < 5; i++) F.A.px(ctx, F.x - 8 + i * 4, F.y + 6 + ((F.t * 90 + i * 7) % 10), 1, 3, '#8ab0e0'); },
    },
    dash: {
      name: 'Squall Line', dmg: 11, life: 1.4,
      spawn(e) { e.marks = []; },
      update(e, dt, g, A) { const p = A.p; if (p.dashT > 0) { e.mt = (e.mt || 0) - dt; if (e.mt <= 0) { e.mt = 0.04; e.marks.push({ x: p.cx, gy: p.feet, t: e.t, b: false }); } A.hit(e, { x: p.x - 4, y: p.y, w: p.w + 8, h: p.h }, { dir: p.facing, kb: 1 }); } e.marks.forEach((m, i) => { if (!m.b && e.t > 0.25 + i * 0.07) { m.b = true; A.hitR(e, m.x, m.gy - 12, 10, { mult: 0.6, kb: 0.3, once: false, every: 9 }); A.sfx('zap', { minGap: 0.05 }); } }); },
      draw(e, ctx, ox, oy, A) { const top = A.top() + oy; e.marks.forEach((m, i) => { const bt = e.t - (0.25 + i * 0.07); if (bt > 0 && bt < 0.12) BOLT(ctx, A, m.x + ox, top, m.gy + oy, e.pal.c, m.x); else if (bt <= 0) A.alpha(ctx, 0.5, () => A.px(ctx, m.x + ox - 1, m.gy + oy - 1, 3, 1, '#8ab0e0')); }); },
    },
    guard: {
      name: 'Cyclone Bulwark', sound: 'zap',
      draw(ctx, { A, x, bot, h, t }) { for (let r = 0; r < 3; r++) for (let i = 0; i < 20; i++) { const a = t * (10 + r * 4) + i * 0.31, yy = bot - h + (i / 20) * h; A.px(ctx, x + Math.cos(a) * (3 + r * 2), yy, 1, 2, r === 1 ? '#8ab0e0' : '#6a8aff'); } if (Math.floor(t * 9) % 3 === 0) BOLT(ctx, A, x + 4, bot - h, bot, '#ffe94a', t * 40); },
      hit(g, x, y, d) { for (let i = 0; i < 12; i++) dot(g, x, y, d * U.lerp(40, 160, Math.random()), U.lerp(-80, 80, Math.random()), i % 3 ? '#8ab0e0' : '#ffe94a', { ay: 200, life: 0.35 }); },
    },
    m1: {
      name: 'Squall Fist', dmg: 9, cd: 0.36, kind: 'custom', life: 0.3,
      desc: 'A punch wrapped in wind and rain that cracks with lightning on impact, arcing into whatever stands nearby.',
      spawn(e, g, A) { A.sfx('punchHit', { minGap: 0.04 }); },
      update(e, dt, g, A) { H.at(e, A, 0); H.melee(e, A, 32 * H.sc(e), 22, { kb: 1.2, onHit(t) { if (!e.cr) { e.cr = A.center(t); A.sfx('zap', { minGap: 0.05 }); } } }); if (e.cr && !e.arced) { e.arced = true; A.hitR(e, e.cr.x, e.cr.y, 18 * H.sc(e), { mult: 0.4, kb: 0.4 }); } },
      draw(e, ctx, ox, oy, A) {
        const k = e.t / e.life, d = e.dir, x = e.x + ox + d * (10 + 14 * Math.min(1, k * 4)), y = e.y + oy;
        A.alpha(ctx, 1 - k, () => {
          for (let i = 0; i < 8; i++) A.px(ctx, x - d * (i * 4 + 6) - (d > 0 ? 5 : 0), y - 6 + (i % 4) * 4, 5, 1, i % 2 ? '#c8e0ff' : '#ffffff');
          A.alpha(ctx, 0.4, () => A.disc(ctx, x, y, 7, '#6a8aff'));
          A.disc(ctx, x, y, 4, '#6a8aff', '#ffffff');
          for (let i = 0; i < 5; i++) A.px(ctx, x - 6 + i * 3, y - 10 + ((e.t * 120 + i * 7) % 18), 1, 3, '#8ab0ff');
          if (e.cr) { BOLT(ctx, A, e.cr.x + ox, e.cr.y + oy - 26, e.cr.y + oy + 6, '#ffe94a', e.t * 40); A.disc(ctx, e.cr.x + ox, e.cr.y + oy, Math.round(6 * (1 - k)) + 1, '#ffe94a', '#ffffff'); }
        });
      },
    },
    s: [
      {
        name: 'Hurricane Spiral', dmg: 7, cd: 8, mp: 7, kind: 'custom', life: 1.4,
        desc: 'Spiral arms of wind, rain and lightning spin outward from you, shredding everything around.',
        spawn(e, g, A) { A.sfx('whoosh'); },
        update(e, dt, g, A) { const p = A.p; e.x = p.cx; e.y = p.y + 10; const R = 70 * H.sc(e) * Math.min(1, e.t / 0.6); A.tickR(e, e.x, e.y, R, 0.2, { kb: 0.5 }); },
        draw(e, ctx, ox, oy, A) { const R = 70 * H.sc(e) * Math.min(1, e.t / 0.6), x = e.x + ox, y = e.y + oy, f = A.fade(e, 0.1, 0.4); A.alpha(ctx, f, () => { for (let arm = 0; arm < 3; arm++) for (let i = 0; i < 30; i++) { const q = i / 30, a = e.t * 6 + arm * 2.094 + q * 4, r = q * R; A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.55, 2, 1, i % 5 === 0 ? '#ffe94a' : arm % 2 ? '#8ab0e0' : '#6a8aff'); } }); },
      },
      {
        name: 'Waterspout', dmg: 8, cd: 8, mp: 7, kind: 'custom', life: 2.2,
        desc: 'A spinning column of water and lightning wanders forward, lifting and zapping anything it swallows.',
        spawn(e, g, A) { H.at(e, A, 24); e.gy = H.floor(A, e.x); A.sfx('whoosh'); },
        update(e, dt, g, A) { e.x += e.dir * 50 * dt; e.gy = A.ground(e.x, e.gy - 16); A.tick(e, { x: e.x - 10, y: e.gy - 70, w: 20, h: 70 }, 0.22, { kb: 0, onHit(t) { if (!t.tutorial) t.vy = -160; if (t.applyStatus) { t.applyStatus('wet', 0); t.applyStatus('shock', 0); } } }); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, gy = e.gy + oy, f = A.fade(e, 0.2, 0.4); A.alpha(ctx, f, () => { for (let i = 0; i < 60; i++) { const q = i / 60, a = e.t * 12 + i * 0.6, r = 3 + q * 9; A.px(ctx, x + Math.cos(a) * r, gy - q * 70, 2, 1, i % 4 ? '#3a8aff' : '#c8e0ff'); } if (Math.floor(e.t * 8) % 3 === 0) BOLT(ctx, A, x, gy - 70, gy, '#ffe94a', e.t * 20); }); },
      },
      {
        name: 'Storm Surfer', dmg: 14, cd: 7, mp: 6, kind: 'custom', life: 0.6,
        desc: 'Ride a crackling wave forward, crashing through everything in your path.',
        spawn(e, g, A) { const p = A.p; e.dir = p.facing; p.vx = e.dir * 260; p.lungeT = 0.5; p.dashGrace = 0.55; A.sfx('whoosh'); },
        update(e, dt, g, A) { const p = A.p; e.x = p.cx; e.gy = p.feet; A.hit(e, { x: p.x - 10, y: p.y, w: p.w + 20, h: p.h }, { kb: 1.4, dir: e.dir, onHit(t) { if (t.applyStatus) t.applyStatus('shock', 0); } }); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, gy = e.gy + oy, d = e.dir; for (let i = -14; i <= 4; i++) { const h = Math.max(0, 8 - Math.abs(i + 5) * 0.5) + Math.sin(e.t * 20 + i) * 1; A.px(ctx, x + i * d, gy - h, 1, h + 1, i % 3 ? '#3a8aff' : '#6a8aff'); } if (Math.floor(e.t * 14) % 2) BOLT(ctx, A, x - d * 8, gy - 14, gy, '#ffe94a', e.t * 30); },
      },
      {
        name: 'Wind Shear', dmg: 16, cd: 6, mp: 6, kind: 'custom', life: 1,
        desc: 'Two big crossing blades of wind, edged with lightning, scissor forward through your enemies.',
        spawn(e, g, A) { H.at(e, A, 8, -2); e.sx = e.x; A.sfx('swing'); },
        update(e, dt, g, A) { e.cx = e.sx + e.dir * 230 * e.t; const sep = Math.sin(e.t * 9) * 16; e.y1 = e.y - sep; e.y2 = e.y + sep; for (const yy of [e.y1, e.y2]) A.hit(e, { x: e.cx - 12, y: yy - 7, w: 24, h: 14 }, { kb: 0.6 }); if (A.solid(e.cx, e.y)) e.dead = true; },
        draw(e, ctx, ox, oy, A) {
          if (e.cx === undefined) return;
          const d = e.dir;
          for (const yy of [e.y1, e.y2]) {
            const x = e.cx + ox, y = yy + oy;
            W.smear(ctx, A, x, y, 14, d, 0.55, '#c8e0ff', 4, -1.2, 1.2);
            A.arc(ctx, x + d * 2, y, 12, d, '#ffe94a', 1, -0.9, 0.9);
            for (let i = 1; i < 4; i++) A.alpha(ctx, 0.5 - i * 0.12, () => A.px(ctx, x - d * (i * 7 + 4) - (d > 0 ? 6 : 0), y + Math.sin(e.t * 30 + i) * 2, 6, 1, '#c8e0ff'));
          }
        },
      },
      {
        name: 'Thunderhead', dmg: 12, cd: 14, mp: 7, kind: 'custom', life: 6,
        desc: 'A huge thundercloud gathers over your head and follows you, striking the nearest enemy again and again.',
        spawn(e, g, A) { e.st = 0.6; A.sfx('rumble', { dur: 0.6 }); },
        update(e, dt, g, A) { const p = A.p; e.x = p.cx; e.y = p.y - 26; e.st -= dt; e.bolt = Math.max(0, (e.bolt || 0) - dt); if (e.st <= 0) { const t = A.near(e.x, p.y, 150); e.st = t ? (e.up ? 0.55 : 0.8) : 0.2; if (t) { const c = A.center(t); e.bx = c.x; e.by = c.y; e.bolt = 0.12; A.damage(e, t, 1, 0.3); if (t.applyStatus) t.applyStatus('shock', 0); A.sfx('zap', { minGap: 0.05 }); } } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy; A.alpha(ctx, A.fade(e, 0.3, 0.5), () => { CLOUD(ctx, A, x, y, 36, '#2a3a6a', '#4a5a8a'); if (e.bolt) { A.line(ctx, x, y + 4, e.bx + ox, e.by + oy, '#ffffff', 2); A.line(ctx, x + 1, y + 4, e.bx + ox + 1, e.by + oy, '#ffe94a'); } }); },
      },
    ],
    ult: {
      name: 'Apocalypse Tempest', dmg: 8,
      desc: 'A supernatural storm of hurricanes, tornadoes, lightning and giant waves erupts all at once, growing until the whole battlefield is swallowed by the tempest.',
      charge: {
        pose: (t, k) => J({ FA: [[11, 11.4], [12.6, 8.6 + Math.sin(t * 9)]], BA: [[5.4, 11.4], [3.8, 8.6 - Math.sin(t * 9)]], bob: 0 }),
        lift: 16,
        draw(ctx, x, y, k, t, A, P) { CLOUD(ctx, A, x, y - 44, 30 + k * 70, '#1a2440', '#3a4a7a'); for (let i = 0; i < 30; i++) { const a = t * 7 + i * 0.4, r = 10 + (i % 5) * 6 * k; A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.4, 2, 1, '#8ab0e0'); } if (Math.floor(t * 9) % 3 === 0) BOLT(ctx, A, x + Math.sin(t * 7) * 30, y - 40, y + 14, '#ffe94a', t * 40); A.alpha(ctx, 0.5 * k, () => A.px(ctx, x - 300, y - 200, 600, 400, '#0a1020')); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 4.2, layer: 'screen',
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 340).map((o) => o.t); e.cx = p.cx + e.dir * 60; e.gy = p.feet; e.tornados = [-1, 1].map((s) => ({ x: p.cx + s * 170, s })); e.bolts = []; e.bt = 0; A.sfx('rumble', { dur: 3.8 }); A.sfx('whoosh'); },
          update(e, dt, g, A) {
            e.bt -= dt; for (const b of e.bolts) b.t += dt;
            const grow = Math.min(1, e.t / 3);
            // the tornadoes grind in towards each other...
            for (const tn of e.tornados) { tn.x = U.approach(tn.x, e.cx + tn.s * 40 * (1 - grow), 0.6, dt); A.tick(e, { x: tn.x - 26, y: e.gy - 170, w: 52, h: 170 }, 0.2, { mult: 0.5, kb: 0 }); }
            for (const t of e.ts) if (!t.dead && !t.tutorial) t.vx = U.approach(t.vx, Math.sin(e.t * 2 + t.uid) * 120, 3, dt);
            A.tick(e, { x: p.cx - 320, y: e.gy - 200, w: 640, h: 200 }, 0.3, { mult: 0.25 + grow * 0.25, kb: 0 });
            // ...lightning everywhere...
            if (e.t < 3.2 && e.bt <= 0) { e.bt = 0.08; const live = e.ts.filter((t) => !t.dead), t = live[Math.floor(Math.random() * Math.max(1, live.length))]; const x = t ? A.center(t).x : p.cx + A.rnd(-240, 240), gy = A.ground(x, e.gy - 40); e.bolts.push({ x, gy, t: 0, s: Math.random() * 99, w: Math.random() < 0.3 ? 4 : 2 }); A.hitR(e, x, gy - 20, 16, { mult: 0.7, kb: 0.3, once: false, every: 0.12 }); A.sfx('zap', { minGap: 0.04 }); if (Math.random() < 0.25) A.flash(0.06); }
            // ...a giant wave...
            if (e.t > 2 && !e.wave) { e.wave = true; e.wx = p.cx - e.dir * 200; e.hit.clear(); A.sfx('crash'); }
            if (e.wave && e.t < 3.4) { e.wx += e.dir * 320 * dt; A.hit(e, { x: e.dir > 0 ? e.wx - 50 : e.wx, y: e.gy - 110, w: 50, h: 110 }, { mult: 2.5, kb: 2.4, dir: e.dir }); }
            // ...and then everything comes together in one final strike
            if (e.t > 3.3 && !e.fin) { e.fin = e.t; e.hit.clear(); A.blast(e, e.cx, e.gy - 40, 150 * H.sc(e), { dmg: e.dmg * 8 }); A.flash(0.8); A.shake(16, 0.7); A.sfx('boom'); A.sfx('zap', { minGap: 0 }); }
          },
          draw(e, ctx, ox, oy, A) {
            const V = view(A), grow = Math.min(1, e.t / 3), dark = e.t < 3.5 ? Math.min(1, e.t * 2) * (0.5 + grow * 0.25) : Math.max(0, 0.75 - (e.t - 3.5) * 1.1);
            A.alpha(ctx, dark, () => A.px(ctx, -10, -10, 2000, 2000, '#060a18'));
            const top = A.top() + oy, gy = e.gy + oy;
            A.alpha(ctx, Math.min(1, dark * 1.5), () => {
              for (let i = 0; i < 18; i++) CLOUD(ctx, A, p.cx + ox - 420 + i * 48 + Math.sin(e.t + i) * 8, top + 12 + (i % 2) * 5, 60, '#141c34', '#2a3a5a');
              // driving rain
              for (let i = 0; i < 140; i++) { const xx = ((i * 53 + e.t * 500) % (V.width + 100)) - 50, yy = ((i * 31 + e.t * 520) % (V.height + 20)) - 10; A.line(ctx, xx, yy, xx + 6, yy + 9, i % 4 ? '#8ab0e0' : '#c8e0ff'); }
              // the tornadoes
              for (const tn of e.tornados) { const x = tn.x + ox; A.alpha(ctx, 0.3, () => { for (let yy = 0; yy < 170; yy += 2) { const r = 6 + (yy / 170) * (26 + grow * 14); A.px(ctx, x - r, gy - yy, r * 2, 1, '#3a4a8a'); } }); for (let i = 0; i < 150; i++) { const q = i / 150, a = e.t * 10 + i * 0.5, r = 6 + q * (26 + grow * 14); A.px(ctx, x + Math.cos(a) * r, gy - q * 170, 3, 1, i % 4 ? '#6a8aff' : '#c8e0ff'); } }
              // the wave
              if (e.wave && e.t < 3.6) { const x = e.wx + ox, d = e.dir; for (let i = 0; i < 70; i++) { const h = 110 * Math.sin(Math.min(1, i / 55) * Math.PI / 2); A.px(ctx, x - d * i, gy - h, 1, h, i % 5 ? '#1a4aaa' : '#3a8aff'); } for (let i = 0; i < 18; i++) A.px(ctx, x - d * 3 + Math.sin(e.t * 20 + i) * 4, gy - 110 + i * 6, 3, 2, '#ffffff'); }
            });
            for (const b of e.bolts) if (b.t < 0.1) W.bolt(ctx, A, b.x + ox, top + 22, b.x + ox, b.gy + oy, '#ffe94a', b.s, b.w);
            if (e.fin) { const k = (e.t - e.fin) / 0.9, x = e.cx + ox; A.alpha(ctx, Math.max(0, 1 - k), () => { W.bolt(ctx, A, x, top, x, gy - 4, '#ffe94a', e.t * 30, Math.max(3, 26 * (1 - k))); A.ring(ctx, x, gy - 40, 20 + k * 220, '#c8e0ff', (20 + k * 220) * 0.6, 2); A.ring(ctx, x, gy - 40, 10 + k * 160, '#ffe94a', (10 + k * 160) * 0.6, 2); }); }
          },
        }, {});
      },
    },
  };
})(window.ERX = window.ERX || {});
