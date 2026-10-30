/*
 * KITS: BLOOD, DEATH, METAL, SAND, MAGMA, STORM
 * (format: js/data/kits/_kit.js)
 */
(function (ERX) {
  'use strict';

  const K = ERX.Kits, H = ERX.KitHelp, U = ERX.U;
  const Phys = () => ERX.GameEngine.Physics;
  const heal = (A, n, col) => { const p = A.p; n = Math.round(n); if (n <= 0 || p.hp >= p.maxHp) return; p.hp = Math.min(p.maxHp, p.hp + n); A.g.floatText(p.cx, p.y - 6, '+' + n, col || '#7af0a0'); };

  // ==================================================================== BLOOD
  const DRIP = { life: 0.7, update(e, dt) { e.vy += 400 * dt; e.x += e.vx * dt; e.y += e.vy * dt; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => A.px(ctx, e.x + ox, e.y + oy, 1, 2, e.pal.c)); } };
  const splat = (A, e, x, y, n) => { for (let i = 0; i < n; i++) A.spawn(e, DRIP, { x, y, vx: A.rnd(-90, 90), vy: A.rnd(-160, -20) }); };
  K.blood = {
    status: 'bleed', fx: 'drips', block: ['Blood Shield', 'shield'], dash: ['Crimson Rush', 'trail'],
    m1: {
      name: 'Blood Claw', dmg: 8, cd: 0.4, kind: 'custom', life: 0.25,
      desc: 'Three claws of hardened blood rake whatever is in front of you.',
      spawn(e, g, A) { A.sfx('swing'); },
      update(e, dt, g, A) { H.at(e, A, 0); H.melee(e, A, 30 * H.sc(e), 24); },
      draw(e, ctx, ox, oy, A) {
        const k = Math.min(1, e.t / 0.12), x = e.x + ox, y = e.y + oy, d = e.dir, L = 26 * H.sc(e);
        A.alpha(ctx, 1 - Math.max(0, e.t - 0.12) / 0.13, () => {
          for (let i = 0; i < 3; i++) { const y0 = y - 10 + i * 7, x0 = x + d * 4; A.line(ctx, x0, y0 - 4, x0 + d * L * k, y0 + 6 * k, e.pal.d, 3); A.line(ctx, x0, y0 - 4, x0 + d * L * k, y0 + 6 * k, i === 1 && e.up ? e.pal.up : e.pal.c, 1); }
        });
      },
    },
    s: [
      {
        name: 'Blood Spear', dmg: 16, cd: 4, mp: 5, kind: 'custom', life: 1,
        desc: 'Harden your blood into a long spear and hurl it. It goes through everything.',
        spawn(e, g, A) { H.at(e, A, 8, -2); e.vx = e.dir * 330; A.sfx('whoosh'); },
        update(e, dt, g, A) { const r = H.fly(e, dt, A, { r: 4, pierce: true, kb: 0.8 }); if (r === 'wall') { splat(A, e, e.x, e.y, 8); e.dead = true; } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, d = e.dir, L = 22 * H.sc(e); A.line(ctx, x - d * L, y, x, y, e.pal.d, 2); A.line(ctx, x - d * L, y, x, y, e.pal.c, 1); A.tri(ctx, x + d * 3, y + 3, 5, 0, e.pal.l); A.px(ctx, x + d * 2 - 1, y - 2, 3, 5, e.pal.l); A.px(ctx, x + d * 4, y, 2, 1, '#ffffff'); },
      },
      {
        name: 'Blood Orbs', dmg: 10, cd: 6, mp: 6, kind: 'custom', life: 3,
        desc: 'Three orbs of blood circle you, then launch themselves at enemies one by one.',
        spawn(e, g, A) { e.orbs = [0, 1, 2].concat(e.up ? [3, 4] : []).map((i) => ({ a: i * 2.1, out: null })); A.sfx('cast'); },
        update(e, dt, g, A) {
          const p = A.p;
          e.lt = (e.lt || 0) - dt;
          for (const o of e.orbs) {
            if (o.gone) continue;
            if (!o.out) { o.a += dt * 5; o.x = p.cx + Math.cos(o.a) * 14; o.y = p.y + 10 + Math.sin(o.a) * 9; if (e.t > 0.4 && e.lt <= 0) { const t = A.near(o.x, o.y, 170); if (t) { o.out = t; e.lt = 0.18; A.sfx('whoosh', { minGap: 0.05 }); } } }
            else { const c = A.center(o.out); const a = Math.atan2(c.y - o.y, c.x - o.x); o.x += Math.cos(a) * 280 * dt; o.y += Math.sin(a) * 280 * dt; if (Math.hypot(c.x - o.x, c.y - o.y) < 8 || o.out.dead) { if (!o.out.dead) A.damage(e, o.out, 1, 0.5); splat(A, e, o.x, o.y, 6); o.gone = true; } }
          }
          if (e.orbs.every((o) => o.gone)) e.dead = true;
        },
        draw(e, ctx, ox, oy, A) { for (const o of e.orbs) if (!o.gone && o.x !== undefined) { A.disc(ctx, o.x + ox, o.y + oy, 3, e.pal.c, e.pal.l); A.px(ctx, o.x + ox - 1, o.y + oy - 2, 1, 1, '#ffffff'); } },
      },
      {
        name: 'Hemorrhage', dmg: 26, cd: 7, mp: 6, kind: 'custom', life: 1.4,
        desc: 'Curse the nearest enemy. A second later its blood bursts out of it in spikes.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 150); e.tg = t; if (!t) { e.dead = true; return; } A.sfx('cast'); },
        update(e, dt, g, A) {
          if (!e.tg || e.tg.dead) { e.dead = true; return; }
          const c = A.center(e.tg); e.x = c.x; e.y = c.y;
          if (e.t > 0.9 && !e.pop) { e.pop = true; A.damage(e, e.tg, 1, 0.6); if (e.tg.applyStatus) { e.tg.applyStatus('bleed', e.potency); e.tg.applyStatus('bleed', e.potency); } A.hitR(e, c.x, c.y, 26 * H.sc(e), { mult: 0.5 }); splat(A, e, c.x, c.y, 16); A.sfx('crash'); A.shake(2, 0.2); }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy;
          if (!e.pop) { const k = e.t / 0.9; A.alpha(ctx, 0.5 + 0.5 * Math.sin(e.t * 30), () => { A.ring(ctx, x, y, 12 - k * 6, e.pal.c); for (let i = 0; i < 3; i++) A.px(ctx, x - 4 + i * 4, y - 12 - (i % 2) * 2, 1, 2, e.pal.l); }); return; }
          const k = (e.t - 0.9) / 0.5, R = 22 * H.sc(e);
          A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; A.line(ctx, x, y, x + Math.cos(a) * R * Math.min(1, k * 4), y + Math.sin(a) * R * Math.min(1, k * 4), i % 2 ? e.pal.c : e.pal.d, 2); } });
        },
      },
      {
        name: 'Blood Siphon', dmg: 4, cd: 9, mp: 6, kind: 'custom', life: 2,
        desc: 'A stream of blood flows from the nearest enemy into you, healing you as it drains.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 140); e.tg = t; if (!t) { e.dead = true; return; } A.sfx('surge'); },
        update(e, dt, g, A) {
          const p = A.p; if (!e.tg || e.tg.dead || Math.abs(A.center(e.tg).x - p.cx) > 170) { e.dead = true; return; }
          e.dtk = (e.dtk || 0) - dt;
          if (e.dtk <= 0) { e.dtk = 0.25; A.damage(e, e.tg, 1, 0); heal(A, e.dmg * (e.up ? 0.8 : 0.5) * (e.isUlt ? 0 : 1)); }
        },
        draw(e, ctx, ox, oy, A) {
          if (!e.tg) return; const p = A.p, c = A.center(e.tg), x0 = c.x + ox, y0 = c.y + oy, x1 = p.cx + ox, y1 = p.y + 10 + oy;
          for (let i = 0; i <= 20; i++) { const q = i / 20, w = Math.sin(q * 12 - e.t * 14) * 3; A.px(ctx, U.lerp(x0, x1, q), U.lerp(y0, y1, q) + w - Math.sin(q * Math.PI) * 10, 2, 2, i % 3 ? e.pal.c : e.pal.l); }
          for (let i = 0; i < 4; i++) { const q = (e.t * 1.6 + i / 4) % 1; A.disc(ctx, U.lerp(x0, x1, q), U.lerp(y0, y1, q) - Math.sin(q * Math.PI) * 10, 2, e.pal.l); }
        },
      },
      {
        name: 'Blood Frenzy', dmg: 0, cd: 16, mp: 0, kind: 'custom', life: 6,
        desc: 'Spend some of your own health to hit MUCH harder for a while. Worth it. Probably.',
        spawn(e, g, A) { const p = A.p, cost = Math.round(p.maxHp * 0.12); p.hp = Math.max(1, p.hp - cost); A.g.floatText(p.cx, p.y - 6, '-' + cost, '#ff4a4a'); p.ab.buffs.rage = { t: e.life * (e.up ? 1.4 : 1), up: e.up, pal: e.pal }; A.g.floatText(p.cx, p.y - 16, 'FRENZY!', e.pal.l); A.sfx('ignite'); splat(A, e, p.cx, p.y + 8, 12); },
        update(e, dt, g, A) { const p = A.p; e.x = p.cx; e.f = p.feet; if (!p.ab.buffs.rage) e.dead = true; if (Math.random() < dt * 8) A.spawn(e, DRIP, { x: p.cx + A.rnd(-6, 6), y: p.y + A.rnd(4, 20), vx: 0, vy: -60 }); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, f = e.f + oy; A.alpha(ctx, 0.35 + 0.15 * Math.sin(e.t * 10), () => { for (let i = 0; i < 6; i++) A.px(ctx, x - 9 + i * 3.5, f - 24 - Math.abs(Math.sin(e.t * 6 + i)) * 6, 2, 24, i % 2 ? e.pal.c : e.pal.d); }); },
      },
    ],
    ult: {
      name: 'Crimson Massacre', dmg: 14,
      desc: 'Rip the blood out of every enemy nearby, forge it into a giant crimson blade, and carve through the battlefield again and again.',
      charge: {
        pose: 'raise', lift: 10,
        draw(ctx, x, y, k, t, A, P) {
          const hx = x + 2, hy = y - 18;
          for (let i = 0; i < 14; i++) { const a = t * 6 + i * 0.45, r = (1 - k) * 30 + 6 + Math.sin(i) * 2; A.px(ctx, hx + Math.cos(a) * r, hy + Math.sin(a) * r * 0.7, 2, 2, i % 3 ? P.c : P.l); }
          A.disc(ctx, hx, hy, Math.round(2 + k * 6), P.d, P.c);
          for (let i = 0; i < 4; i++) A.px(ctx, hx - 3 + i * 2, hy + 6 + ((t * 30 + i * 5) % 14), 1, 2, P.c);
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 2.6,
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 260).map((o) => o.t); for (const t of e.ts) { A.damage(e, t, 1, 0); if (t.applyStatus) t.applyStatus('bleed', e.potency); } e.ang = -1.6; A.sfx('surge'); e.swing = 0; },
          update(e, dt, g, A) {
            e.x = p.cx; e.y = p.y + 8;
            // three huge sweeps: forward, back, then a final overhead
            const T = [[0.4, 0.75], [0.85, 1.2], [1.4, 1.9]];
            e.blade = null;
            T.forEach(([a, b], i) => {
              if (e.t >= a && e.t < b) {
                const q = U.ease.inOutQuad((e.t - a) / (b - a)), d = i === 1 ? -e.dir : e.dir;
                e.blade = { a: i === 2 ? U.lerp(-2.6, 0.9, q) : U.lerp(-1.4, 1.4, q), d, i };
                if (e.swing !== i + 1) { e.swing = i + 1; e.hit.clear(); A.sfx('swing'); A.shake(3, 0.2); }
                const R = (i === 2 ? 130 : 100) * H.sc(e);
                A.hit(e, { x: d > 0 ? e.x : e.x - R, y: e.y - R * 0.8, w: R, h: R * 1.2 }, { mult: i === 2 ? 4 : 2, kb: 1.2, dir: d });
              }
            });
            if (e.t > 1.9 && !e.fin) { e.fin = true; splat(A, e, e.x + e.dir * 60, e.y, 30); A.shake(6, 0.4); A.flash(0.3); }
          },
          draw(e, ctx, ox, oy, A) {
            // blood rising out of every enemy into you
            if (e.t < 0.45) for (const t of e.ts) if (!t.dead) { const c = A.center(t); for (let i = 0; i < 6; i++) { const q = ((e.t * 3 + i / 6) % 1); A.px(ctx, U.lerp(c.x, p.cx, q) + ox, U.lerp(c.y, p.y, q) + oy - Math.sin(q * Math.PI) * 20, 2, 2, e.pal.c); } }
            if (!e.blade) return;
            const b = e.blade, R = (b.i === 2 ? 130 : 100) * H.sc(e), x = e.x + ox, y = e.y + oy;
            for (let r = 8; r < R; r += 1.5) { const w = r > R - 18 ? (R - r) / 6 : 3; A.px(ctx, x + Math.cos(b.a) * r * b.d, y + Math.sin(b.a) * r, w + 1, w + 1, r > R * 0.4 ? e.pal.c : e.pal.d); }
            A.alpha(ctx, 0.4, () => { for (let k = 1; k < 6; k++) { const a = b.a - k * 0.12; A.arc(ctx, x, y, R - 6, b.d, e.pal.c, 2, a, a + 0.1); } });
            A.line(ctx, x, y, x + Math.cos(b.a) * R * b.d, y + Math.sin(b.a) * R, e.pal.l, 1);
          },
        }, {});
      },
    },
  };

  // ==================================================================== DEATH
  const SKULL = (ctx, A, x, y, col, eye) => { A.px(ctx, x - 3, y - 3, 6, 5, col); A.px(ctx, x - 2, y + 2, 4, 2, col); A.px(ctx, x - 2, y - 1, 1, 2, eye || '#120c1a'); A.px(ctx, x + 1, y - 1, 1, 2, eye || '#120c1a'); A.px(ctx, x - 1, y + 2, 1, 1, '#120c1a'); A.px(ctx, x + 1, y + 2, 1, 1, '#120c1a'); };
  const BONE = (ctx, A, x, y, a, L, col) => { const c = Math.cos(a) * L / 2, s = Math.sin(a) * L / 2; A.line(ctx, x - c, y - s, x + c, y + s, col, 1); for (const q of [-1, 1]) A.px(ctx, x + q * c - 1, y + q * s - 1, 3, 3, col); };
  const SOUL = { life: 1.2, update(e, dt, g, A) { const p = A.p, tx = p.cx, ty = p.y + 8, a = Math.atan2(ty - e.y, tx - e.x); e.vx = U.approach(e.vx, Math.cos(a) * 200, 4, dt); e.vy = U.approach(e.vy, Math.sin(a) * 200, 4, dt); e.x += e.vx * dt; e.y += e.vy * dt; if (Math.hypot(tx - e.x, ty - e.y) < 6) e.dead = true; }, draw(e, ctx, ox, oy, A) { A.disc(ctx, e.x + ox, e.y + oy, 2, e.pal.l); A.px(ctx, e.x + ox - e.vx * 0.02, e.y + oy - e.vy * 0.02, 2, 2, e.pal.c); } };
  K.death = {
    status: 'doom', fx: 'ashes', block: ['Bone Wall', 'wall'], dash: ['Phantom Step', 'ghost'],
    m1: {
      name: 'Bone Toss', dmg: 8, cd: 0.42, kind: 'custom', life: 0.01,
      desc: 'Throw a spinning bone. Someone needed it. Not anymore.',
      spawn(e, g, A) {
        H.at(e, A, 6, -4); A.sfx('swing', { minGap: 0.04 });
        const mk = (vy) => A.spawn(e, H.proj((b, ctx, ox, oy, A) => BONE(ctx, A, b.x + ox, b.y + oy, b.t * 18, b.up ? 10 : 8, '#e8e4d8'), { life: 1, r: 4, gravity: 220 }), { vx: e.dir * 220, vy });
        mk(-90); if (e.up) mk(-160);
      },
    },
    s: [
      {
        name: 'Bone Prison', dmg: 14, cd: 7, mp: 6, kind: 'custom', life: 1.6,
        desc: 'A ribcage of bones bursts out of the ground around the nearest enemy and traps it.',
        spawn(e, g, A) {
          const t = A.near(A.p.cx, A.p.y, 150); e.tg = t; H.at(e, A, 0);
          e.tx = t ? A.center(t).x : e.x + e.dir * 40; e.gy = H.floor(A, e.tx); A.sfx('crash');
          if (t) { A.damage(e, t, 1, 0); if (t.applyStatus) { t.applyStatus('stagger', 0); if (t.status.stagger) t.status.stagger.t = e.up ? 1.6 : 1.1; } }
        },
        update(e, dt, g, A) { if (e.t > 1.2 && !e.snap) { e.snap = true; if (e.tg && !e.tg.dead) A.damage(e, e.tg, 0.8, 0.8); A.sfx('shatter'); } },
        draw(e, ctx, ox, oy, A) {
          const x = e.tx + ox, gy = e.gy + oy, k = Math.min(1, e.t / 0.15), f = e.snap ? 1 - (e.t - 1.2) / 0.4 : 1;
          A.alpha(ctx, f, () => { for (let i = 0; i < 5; i++) { const s = i - 2, h = (22 - Math.abs(s) * 2) * k; for (let yy = 0; yy < h; yy++) { const curl = Math.sin((yy / 22) * Math.PI * 0.9) * (s === 0 ? 0 : -Math.sign(s) * 4); A.px(ctx, x + s * 6 + curl, gy - yy, 2, 1, yy % 5 ? '#e8e4d8' : '#b8b4a8'); } } });
        },
      },
      {
        name: 'Soul Harvest', dmg: 12, cd: 8, mp: 6, kind: 'custom', life: 1.4,
        desc: 'Tear a bit of soul out of every nearby enemy. Each one heals you.',
        spawn(e, g, A) {
          const p = A.p; e.x = p.cx; e.y = p.y + 10; let n = 0;
          for (const o of H.nearby(A, p.cx, p.y, 100 * H.sc(e))) { A.damage(e, o.t, 1, 0); A.spawn(e, SOUL, { x: o.c.x, y: o.c.y, vx: A.rnd(-40, 40), vy: -80 }); n++; }
          heal(A, n * (e.up ? 8 : 5)); A.sfx('surge');
        },
        draw(e, ctx, ox, oy, A) { const R = 100 * H.sc(e) * Math.min(1, e.t / 0.3); A.alpha(ctx, 1 - e.t / e.life, () => { A.ring(ctx, e.x + ox, e.y + oy, R, e.pal.c, R * 0.4, 2); A.ring(ctx, e.x + ox, e.y + oy, R * 0.6, e.pal.l, R * 0.25, 3); }); },
      },
      {
        name: 'Raise Dead', dmg: 8, cd: 12, mp: 8, kind: 'custom', life: 5,
        desc: 'Two skeletons claw out of the ground and fight for you. They do not get paid.',
        spawn(e, g, A) { const p = A.p; e.sk = (e.up ? [-1, 1, 2] : [-1, 1]).map((s, i) => { const x = p.cx + s * 16; return { x, gy: A.ground(x, p.y + 2), d: p.facing, at: 0, i }; }); A.sfx('crash'); },
        update(e, dt, g, A) {
          for (const s of e.sk) {
            if (e.t < 0.4) continue;
            const t = A.near(s.x, s.gy - 10, 200);
            s.at -= dt;
            if (t) { const c = A.center(t), dx = c.x - s.x; s.d = Math.sign(dx) || s.d; if (Math.abs(dx) > 12) { const nx = s.x + s.d * 60 * dt; if (!A.solid(nx + s.d * 4, s.gy - 6)) { s.x = nx; s.gy = A.ground(s.x, s.gy - 12); } s.walk = (s.walk || 0) + dt; } else if (s.at <= 0) { s.at = 0.6; s.swing = 0.2; A.damage(e, t, 1, 0.4); A.sfx('punchHit', { minGap: 0.05 }); } }
            if (s.swing) s.swing = Math.max(0, s.swing - dt);
          }
        },
        draw(e, ctx, ox, oy, A) {
          for (const s of e.sk) {
            const rise = Math.min(1, e.t / 0.4), x = s.x + ox, gy = s.gy + oy, sink = (1 - rise) * 16 + (e.t > e.life - 0.4 ? (e.t - e.life + 0.4) * 40 : 0);
            ctx.save(); ctx.beginPath(); ctx.rect(x - 12, gy - 30, 24, 30); ctx.clip();
            const y = gy + sink, step = Math.floor((s.walk || 0) * 8) % 2;
            A.px(ctx, x - 2 + step, y - 6, 1, 6, '#e8e4d8'); A.px(ctx, x + 1 - step, y - 6, 1, 6, '#e8e4d8');
            A.px(ctx, x - 1, y - 14, 2, 8, '#e8e4d8'); for (let r = 0; r < 3; r++) A.px(ctx, x - 3, y - 13 + r * 2, 6, 1, '#d8d4c8');
            SKULL(ctx, A, x, y - 18, '#f0ece0', e.pal.l);
            const ang = s.swing ? -0.5 + (0.2 - s.swing) * 10 : 0.6;
            A.line(ctx, x + s.d * 2, y - 12, x + s.d * (2 + Math.cos(ang) * 9), y - 12 + Math.sin(ang) * 9, '#b8b4a8', 1);
            ctx.restore();
          }
        },
      },
      {
        name: 'Death Mark', dmg: 40, cd: 9, mp: 7, kind: 'custom', life: 3.2,
        desc: 'Mark the nearest enemy with a countdown skull. At zero... well.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 170); e.tg = t; if (!t) { e.dead = true; return; } if (t.applyStatus) t.applyStatus('doom', e.potency); A.sfx('cast'); e.last = 3; },
        update(e, dt, g, A) {
          if (!e.tg || e.tg.dead) { e.dead = true; return; }
          const n = Math.ceil(3 - e.t); if (n !== e.last && n > 0) { e.last = n; A.sfx('tick', { value: 60 }); }
          if (e.t >= 3 && !e.boom) { e.boom = true; const c = A.center(e.tg); A.damage(e, e.tg, e.up ? 1.5 : 1, 1); A.blast(e, c.x, c.y, 26, { dmg: e.dmg * 0.3 }); A.shake(4, 0.3); }
        },
        draw(e, ctx, ox, oy, A) {
          if (!e.tg || e.tg.dead) return; const c = A.center(e.tg), x = c.x + ox, y = e.tg.box.y + oy - 12;
          if (!e.boom) { SKULL(ctx, A, x, y, '#e8e4d8', e.pal.l); A.text(ctx, String(Math.max(1, Math.ceil(3 - e.t))), x, y - 12, e.pal.l); }
          else A.alpha(ctx, 1 - (e.t - 3) / 0.2, () => SKULL(ctx, A, x, y - (e.t - 3) * 40, e.pal.c));
        },
      },
      {
        name: 'Wither Aura', dmg: 4, cd: 11, mp: 7, kind: 'custom', life: 4,
        desc: 'Everything near you starts to decay. Flowers die. Enemies too.',
        spawn(e, g, A) { A.sfx('whoosh'); },
        update(e, dt, g, A) { const p = A.p, R = 46 * H.sc(e); e.x = p.cx; e.y = p.y + 10; A.tickR(e, e.x, e.y, R, 0.4, { kb: 0 }); for (const o of H.nearby(A, e.x, e.y, R)) if (o.t.applyStatus && !o.t.status.slow) o.t.applyStatus('slow', 0); },
        draw(e, ctx, ox, oy, A) {
          const R = 46 * H.sc(e), x = e.x + ox, y = e.y + oy;
          A.alpha(ctx, A.fade(e, 0.3, 0.4), () => {
            A.ring(ctx, x, y, R, e.pal.d, R * 0.5, 2);
            for (let i = 0; i < 18; i++) { const a = -e.t * 1.5 + i * 0.35, r = R * (0.5 + 0.5 * ((i * 7) % 10) / 10); A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5 - ((e.t * 20 + i * 3) % 12), 1, 1, i % 3 ? '#8a8a8a' : e.pal.c); }
          });
        },
      },
    ],
    ult: {
      name: "Reaper's End", dmg: 30,
      desc: 'A colossal Reaper rises behind you and swings its scythe across the whole battlefield. Weakened enemies do not get back up.',
      charge: {
        pose: 'raiseBoth', lift: 0,
        draw(ctx, x, y, k, t, A, P) {
          const bx = x - 6, by = y + 14, h = 50 * k;
          A.alpha(ctx, 0.75 * k, () => {
            A.tri(ctx, bx, by, 34, h, '#120c1a', '#1a1a24');
            SKULL(ctx, A, bx, by - h - 2, '#d8d4c8', P.l);
            A.line(ctx, bx + 12, by - h * 0.7, bx + 16, by, '#5a4a3a', 1);
            A.arc(ctx, bx + 12, by - h * 0.7, 12, -1, '#c8c8d8', 2, -1.6, 0.2);
          });
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 2.2,
          spawn(e) { e.x = p.cx - e.dir * 10; e.gy = p.feet; A.sfx('surge'); },
          update(e, dt, g, A) {
            if (e.t > 0.55 && e.t < 1.1) {
              const q = (e.t - 0.55) / 0.55, R = 240;
              A.hit(e, { x: e.dir > 0 ? e.x : e.x - R, y: e.gy - 90, w: R, h: 90 }, { mult: 5, kb: 1.5, onHit(t) { if (t.applyStatus) t.applyStatus('doom', e.potency); if (t.hp !== undefined && t.maxHp && t.hp < t.maxHp * 0.25 && !t.tutorial) { A.damage(e, t, 99, 0); A.g.floatText(A.center(t).x, t.box.y - 10, 'REAPED', e.pal.l); } } });
              if (!e.sw) { e.sw = true; A.sfx('shockwave'); A.shake(6, 0.5); A.flash(0.2); }
            }
          },
          draw(e, ctx, ox, oy, A) {
            const x = e.x + ox, gy = e.gy + oy, rise = Math.min(1, e.t / 0.4), fade = e.t > 1.6 ? 1 - (e.t - 1.6) / 0.6 : 1, h = 110 * rise, d = e.dir;
            A.alpha(ctx, 0.85 * fade, () => {
              A.tri(ctx, x, gy, 70, h, '#0a0a12', '#1a1a24');
              for (let i = 0; i < 8; i++) A.px(ctx, x - 30 + i * 8, gy - 4 - ((i * 5) % 7), 3, 6, '#0a0a12');
              SKULL(ctx, A, x, gy - h - 4, '#d8d4c8', e.pal.l); SKULL(ctx, A, x + 1, gy - h - 4, '#d8d4c8', e.pal.l);
              // the scythe: raised, then the sweep
              const q = U.clamp((e.t - 0.45) / 0.65, 0, 1), a = U.lerp(-2.4, 0.9, U.ease.inOutCubic(q));
              const hx = x + d * 18, hy = gy - h * 0.65, L = 120;
              const tx = hx + Math.cos(a) * L * d, ty = hy + Math.sin(a) * L;
              A.line(ctx, hx - Math.cos(a) * 20 * d, hy - Math.sin(a) * 20, tx, ty, '#5a4a3a', 3);
              for (let i = 0; i < 40; i++) { const b = a + Math.PI / 2 + (i / 40) * 1.2, r = 60 - i * 0.6; A.px(ctx, tx + Math.cos(b) * r * d * 0.9 - Math.cos(a) * 4 * d, ty + Math.sin(b) * r * 0.9, 3, 3, i < 4 ? '#ffffff' : i % 3 ? '#c8c8d8' : e.pal.c); }
              if (q > 0 && q < 1) A.alpha(ctx, 0.4, () => A.arc(ctx, hx, hy, L + 30, d, e.pal.c, 4, -2.4, a));
            });
          },
        }, {});
      },
    },
  };

  // ==================================================================== METAL
  const GEAR = (ctx, A, x, y, r, a, col, col2) => { A.disc(ctx, x, y, r, col); A.disc(ctx, x, y, Math.max(1, Math.round(r / 3)), col2); for (let i = 0; i < 8; i++) { const b = a + (i / 8) * Math.PI * 2; A.px(ctx, x + Math.cos(b) * (r + 1) - 1, y + Math.sin(b) * (r + 1) - 1, 2, 2, col); } };
  const SPARK = { life: 0.3, update(e, dt) { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 300 * dt; }, draw(e, ctx, ox, oy, A) { A.px(ctx, e.x + ox, e.y + oy, 1, 1, e.t < 0.15 ? '#ffffff' : '#ffd34d'); } };
  const sparks = (A, e, x, y, n) => { for (let i = 0; i < n; i++) A.spawn(e, SPARK, { x, y, vx: A.rnd(-120, 120), vy: A.rnd(-140, 20) }); };
  K.metal = {
    status: 'shatter', fx: 'filings', block: ['Steel Wall', 'wall'], dash: ['Bullet Dash', 'ghost'],
    m1: {
      name: 'Steel Cleaver', dmg: 11, cd: 0.55, kind: 'custom', life: 0.3,
      desc: 'A huge steel cleaver forms in your hand and chops straight down.',
      spawn(e, g, A) { A.sfx('swing'); },
      update(e, dt, g, A) { H.at(e, A, 0); if (e.t > 0.08) { H.melee(e, A, 34 * H.sc(e), 30); if (!e.clang && e.t > 0.12) { e.clang = true; A.sfx('hitMetal', { minGap: 0.05 }); } } },
      draw(e, ctx, ox, oy, A) {
        const k = U.ease.outCubic(Math.min(1, e.t / 0.14)), a = U.lerp(-2.2, 0.5, k), x = e.x + ox, y = e.y + oy - 4, d = e.dir, L = 28 * H.sc(e);
        const tx = x + Math.cos(a) * L * d, ty = y + Math.sin(a) * L;
        A.line(ctx, x, y, x + Math.cos(a) * 5 * d, y + Math.sin(a) * 5, '#5a4030', 2);
        for (let i = 5; i < L; i++) { const bx = x + Math.cos(a) * i * d, by = y + Math.sin(a) * i; const nx = -Math.sin(a) * d, ny = Math.cos(a); for (let w = 0; w < 6; w++) A.px(ctx, bx + nx * w, by + ny * w, 1, 1, w === 0 ? '#ffffff' : w < 3 ? e.pal.l : e.pal.c); }
        if (e.up) A.line(ctx, x + Math.cos(a) * 6 * d, y + Math.sin(a) * 6, tx, ty, e.pal.up, 1);
      },
    },
    s: [
      {
        name: 'Razor Discs', dmg: 9, cd: 5, mp: 5, kind: 'custom', life: 0.01,
        desc: 'Throw spinning saw blades that bounce along the floor.',
        spawn(e, g, A) {
          H.at(e, A, 8, 2); A.sfx('swing');
          const disc = { life: 1.6, update(b, dt, g, A) { b.vy += 500 * dt; b.x += b.vx * dt; const ny = b.y + b.vy * dt; const gy = A.ground(b.x, b.y - 4); if (ny + 4 > gy && b.vy > 0) { b.y = gy - 4; b.vy = -b.vy * 0.6; sparks(A, b, b.x, gy, 2); } else b.y = ny; if (A.solid(b.x + Math.sign(b.vx) * 5, b.y)) b.vx = -b.vx; A.hit(b, { x: b.x - 5, y: b.y - 5, w: 10, h: 10 }, { kb: 0.5 }); }, draw(b, ctx, ox, oy, A) { GEAR(ctx, A, b.x + ox, b.y + oy, b.up ? 4 : 3, b.t * 30, '#c8d0e0', '#4a5060'); } };
          for (let i = 0; i < (e.up ? 3 : 2); i++) A.spawn(e, disc, { vx: e.dir * (170 + i * 40), vy: -60 - i * 50 });
        },
      },
      {
        name: 'Wrecking Ball', dmg: 22, cd: 7, mp: 6, kind: 'custom', life: 0.8,
        desc: 'Swing a huge iron ball on a chain in a massive arc. Very rude.',
        spawn(e, g, A) { A.sfx('whoosh'); },
        update(e, dt, g, A) {
          H.at(e, A, 0, -16); const q = U.ease.inOutQuad(Math.min(1, e.t / 0.55)), a = U.lerp(-2.6, 0.6, q), L = 44 * H.sc(e);
          e.bx = e.x + Math.cos(a) * L * e.dir; e.by = e.y + Math.sin(a) * L + 14; e.a = a;
          if (A.hitR(e, e.bx, e.by, 9 * H.sc(e), { kb: 2.5, dir: e.dir })) { A.sfx('anvil'); A.shake(3, 0.2); sparks(A, e, e.bx, e.by, 8); }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, bx = e.bx + ox, by = e.by + oy, r = Math.round(7 * H.sc(e));
          for (let i = 0; i <= 10; i++) A.px(ctx, U.lerp(x, bx, i / 10) - 1, U.lerp(y, by, i / 10) - 1, 2, 2, i % 2 ? '#8a90a0' : '#4a5060');
          A.alpha(ctx, 0.3, () => A.arc(ctx, x, y + 14, 44 * H.sc(e), e.dir, '#c8d0e0', 3, -2.6, e.a));
          A.disc(ctx, bx, by, r, '#4a5060', '#8a90a0'); A.px(ctx, bx - 2, by - 3, 2, 2, '#ffffff');
        },
      },
      {
        name: 'Arm Cannon', dmg: 24, cd: 6, mp: 6, kind: 'custom', life: 0.35,
        desc: 'Your arm turns into a cannon. The cannon goes BOOM. You go backwards.',
        spawn(e, g, A) {
          H.at(e, A, 10, 0); const p = A.p; p.vx = -e.dir * 120; A.sfx('boom'); A.shake(2, 0.15);
          A.spawn(e, H.proj((b, ctx, ox, oy, A) => { A.disc(ctx, b.x + ox, b.y + oy, b.up ? 4 : 3, '#2a2e38', '#6a7080'); A.px(ctx, b.x + ox - b.vx * 0.02, b.y + oy, 3, 1, '#ffd34d'); }, { life: 1, r: 4, gravity: 60, boom: 24, kb: 2 }), { vx: e.dir * 380, vy: -10 });
        },
        update(e, dt, g, A) { H.at(e, A, 0, 0); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, d = e.dir; A.px(ctx, d > 0 ? x + 2 : x - 14, y - 3, 12, 6, '#6a7080'); A.px(ctx, d > 0 ? x + 2 : x - 14, y - 3, 12, 1, '#c8d0e0'); A.px(ctx, x + d * 14 - 1, y - 4, 2, 8, '#4a5060'); if (e.t < 0.1) A.disc(ctx, x + d * 18, y, 4, '#ffd34d', '#ffffff'); },
      },
      {
        name: 'Bear Trap', dmg: 30, cd: 8, mp: 5, kind: 'custom', life: 10,
        desc: 'Set a steel trap. The next enemy to step on it gets SNAPPED and stuck.',
        spawn(e, g, A) { H.at(e, A, 26); e.gy = H.floor(A, e.x); A.sfx('hitMetal'); },
        update(e, dt, g, A) {
          if (!e.snapT) { const t = A.targets().find((t) => Phys().rectsOverlap(t.box, { x: e.x - 7, y: e.gy - 6, w: 14, h: 6 })); if (t) { e.snapT = e.t; A.damage(e, t, e.up ? 1.4 : 1, 0); if (t.applyStatus) { t.applyStatus('stagger', 0); if (t.status.stagger) t.status.stagger.t = 1.5; t.applyStatus('shatter', e.potency); } A.sfx('anvil'); sparks(A, e, e.x, e.gy - 4, 6); } }
          else if (e.t - e.snapT > 1.5) e.dead = true;
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, gy = e.gy + oy, shut = e.snapT ? Math.min(1, (e.t - e.snapT) / 0.05) : 0;
          A.px(ctx, x - 7, gy - 1, 14, 1, '#4a5060'); A.px(ctx, x - 1, gy - 2, 2, 1, '#8a90a0');
          for (const s of [-1, 1]) { const a = U.lerp(0, Math.PI / 2, shut); for (let i = 0; i < 7; i++) { const px2 = x + s * Math.cos(a) * i, py = gy - 1 - Math.sin(a) * i; A.px(ctx, px2, py, 1, 1, '#c8d0e0'); if (i % 2) A.px(ctx, px2, py - 1 - (shut ? 0 : 1), 1, 1, '#ffffff'); } }
        },
      },
      {
        name: 'Iron Skin', dmg: 0, cd: 15, mp: 6, kind: 'custom', life: 6,
        desc: 'Coat yourself in iron plates. You take half damage. You also clank.',
        spawn(e, g, A) { const p = A.p; p.ab.buffs.armor = { t: e.life * (e.up ? 1.4 : 1), up: e.up, pal: e.pal }; A.g.floatText(p.cx, p.y - 10, 'IRON SKIN!', e.pal.l); A.sfx('anvil'); },
        update(e, dt, g, A) { const p = A.p; e.x = p.cx; e.f = p.feet; if (!p.ab.buffs.armor) e.dead = true; },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, f = e.f + oy, k = Math.min(1, e.t / 0.3);
          for (let i = 0; i < 6; i++) { const yy = f - 4 - i * 3.5, w = 12 - Math.abs(i - 3); A.alpha(ctx, 0.55 * k, () => { A.px(ctx, x - w / 2, yy, w, 2, i % 2 ? '#8a90a0' : '#c8d0e0'); A.px(ctx, x - w / 2, yy, 1, 1, '#ffffff'); }); }
          if (Math.floor(e.t * 3) % 2 === 0) A.px(ctx, x - 5 + ((e.t * 40) % 10), f - 20, 1, 1, '#ffffff');
        },
      },
    ],
    ult: {
      name: 'Iron Colossus', dmg: 30,
      desc: 'A towering iron colossus assembles out of scrap behind you, crushes the ground with both fists, then launches one titanic punch.',
      charge: {
        pose: 'raiseBoth', lift: 0,
        draw(ctx, x, y, k, t, A, P) {
          for (let i = 0; i < 14; i++) { const q = Math.min(1, k * 1.5 - i * 0.04); if (q <= 0) continue; const a = i * 2.4, r0 = 70, sx = x + Math.cos(a) * r0, sy = y + Math.sin(a) * r0 * 0.6, tx = x - 12 + (i % 4) * 8, ty = y - 30 + Math.floor(i / 4) * 9; GEAR(ctx, A, U.lerp(sx, tx, q), U.lerp(sy, ty, q), 2, t * 10 + i, i % 2 ? '#8a90a0' : '#c8d0e0', '#4a5060'); }
          if (k > 0.6) { A.px(ctx, x - 6, y - 36, 3, 2, '#ff3a3a'); A.px(ctx, x + 3, y - 36, 3, 2, '#ff3a3a'); }
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 2.8,
          spawn(e) { e.x = p.cx - e.dir * 24; e.gy = p.feet; A.sfx('anvil'); A.shake(3, 0.3); },
          update(e, dt, g, A) {
            const slam = (at, n) => { if (e.t > at && !e['s' + n]) { e['s' + n] = true; e.hit.clear(); A.hit(e, { x: e.x - 90, y: e.gy - 30, w: 180, h: 30 }, { mult: 1, kb: 1 }); A.sfx('crash'); A.shake(6, 0.3); sparks(A, e, e.x + e.dir * 30, e.gy, 12); } };
            slam(0.55, 1); slam(1.0, 2);
            if (e.t > 1.6 && !e.punch) { e.punch = true; e.hit.clear(); A.sfx('boom'); A.shake(9, 0.5); A.flash(0.3); }
            if (e.punch && e.t < 2.1) { const R = 260; A.hit(e, { x: e.dir > 0 ? e.x : e.x - R, y: e.gy - 70, w: R, h: 70 }, { mult: 2.5, kb: 3, dir: e.dir }); }
          },
          draw(e, ctx, ox, oy, A) {
            const x = e.x + ox, gy = e.gy + oy, rise = Math.min(1, e.t / 0.35), fade = e.t > 2.3 ? 1 - (e.t - 2.3) / 0.5 : 1, d = e.dir, H0 = 96 * rise;
            const M = '#6a7080', M2 = '#8a90a0', M3 = '#c8d0e0';
            A.alpha(ctx, fade, () => {
              A.px(ctx, x - 16, gy - 30 * rise, 12, 30 * rise, M); A.px(ctx, x + 4, gy - 30 * rise, 12, 30 * rise, M);
              A.px(ctx, x - 22, gy - H0 + 26, 44, H0 - 56 > 0 ? 40 : 0, M2); A.px(ctx, x - 22, gy - H0 + 26, 44, 2, M3);
              for (let i = 0; i < 4; i++) A.px(ctx, x - 18 + i * 11, gy - H0 + 34, 2, 2, '#4a5060');
              A.px(ctx, x - 9, gy - H0 + 8, 18, 18, M2); A.px(ctx, x - 6, gy - H0 + 15, 4, 2, '#ff3a3a'); A.px(ctx, x + 2, gy - H0 + 15, 4, 2, '#ff3a3a');
              // arms: slam, slam, then the big punch forward
              const armUp = (t0) => { const q = (e.t - t0 + 0.3) / 0.3; return q < 0 ? 0 : q < 1 ? q : Math.max(0, 1 - (q - 1) * 4); };
              const up = Math.max(armUp(0.55), armUp(1.0));
              for (const s of [-1, 1]) {
                const sx = x + s * 26, sy = gy - H0 + 30;
                let fx2 = sx + s * 4, fy = U.lerp(gy - 10, sy - 30, up);
                if (s === d && e.t > 1.3) { const q = U.clamp((e.t - 1.3) / 0.3, 0, 1), out = e.t > 1.6 ? Math.min(1, (e.t - 1.6) / 0.08) : 0; fx2 = sx + d * (U.lerp(-10, 0, q) + out * 120); fy = sy + 6; }
                A.line(ctx, sx, sy, fx2, fy, M, 6);
                A.px(ctx, fx2 - 8, fy - 8, 16, 16, M2); A.px(ctx, fx2 - 8, fy - 8, 16, 2, M3);
              }
              if (e.punch && e.t < 2) { const q = (e.t - 1.6) / 0.4; A.alpha(ctx, 1 - q, () => { for (let i = 0; i < 6; i++) A.line(ctx, x + d * 40, gy - H0 + 36 - 10 + i * 4, x + d * (60 + q * 220), gy - H0 + 36 - 10 + i * 4, i % 2 ? '#ffffff' : M3, 1); }); }
            });
          },
        }, {});
      },
    },
  };

  // ===================================================================== SAND
  const GRAIN = { life: 0.6, update(e, dt) { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 120 * dt; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => A.px(ctx, e.x + ox, e.y + oy, 1, 1, e.c || e.pal.c)); } };
  const SCARAB = (ctx, A, x, y, d, t, P) => { A.px(ctx, x - 2, y - 2, 4, 3, '#2a5a6a'); A.px(ctx, x - 1, y - 2, 2, 1, '#5ac8d8'); A.px(ctx, x + d * 2, y - 1, 1, 1, '#1a2a30'); const l = Math.floor(t * 20) % 2; A.px(ctx, x - 2, y + 1 - l, 1, 1, '#1a2a30'); A.px(ctx, x + 1, y + l, 1, 1, '#1a2a30'); };
  K.sand = {
    status: 'slow', fx: 'dust', block: ['Sand Wall', 'wall'], dash: ['Dust Devil', 'ghost'],
    m1: {
      name: 'Sand Blast', dmg: 3, cd: 0.45, kind: 'custom', life: 0.3,
      desc: 'Fling a spray of coarse sand. It gets everywhere.',
      spawn(e, g, A) { H.at(e, A, 6, -1); A.sfx('whoosh', { minGap: 0.04 }); for (let i = 0; i < 18; i++) A.spawn(e, GRAIN, { vx: e.dir * A.rnd(120, 220), vy: A.rnd(-60, 40), life: 0.35, c: i % 3 ? e.pal.c : e.pal.l }); },
      update(e, dt, g, A) { const L = 46 * H.sc(e), k = Math.min(1, e.t / 0.15); A.hit(e, { x: e.dir > 0 ? e.x : e.x - L * k, y: e.y - 8 - 6 * k, w: L * k, h: 16 + 12 * k }, { kb: 0.4, mult: e.up ? 4 : 3 }); },
      draw(e, ctx, ox, oy, A) { const L = 46 * H.sc(e) * Math.min(1, e.t / 0.15); A.alpha(ctx, 0.35 * (1 - e.t / e.life), () => { for (let i = 0; i < L; i += 3) A.px(ctx, e.x + ox + e.dir * i, e.y + oy - i * 0.3, 3, i * 0.6 + 2, e.pal.c); }); },
    },
    s: [
      {
        name: 'Quicksand', dmg: 3, cd: 8, mp: 6, kind: 'custom', life: 4.5,
        desc: 'The floor turns into quicksand. Enemies sink, slow right down and choke on it.',
        spawn(e, g, A) { H.at(e, A, 40); e.gy = H.floor(A, e.x); A.sfx('rumble', { dur: 0.6 }); },
        update(e, dt, g, A) { const R = 40 * H.sc(e); for (const t of A.targets()) { if (t.tutorial) continue; const c = A.center(t); if (Math.abs(c.x - e.x) < R && Math.abs(t.box.y + t.box.h - e.gy) < 8) { t.vx *= 1 - dt * 8; if (t.applyStatus) t.applyStatus('slow', e.potency); } } A.tick(e, { x: e.x - R, y: e.gy - 10, w: R * 2, h: 10 }, 0.5, { kb: 0 }); },
        draw(e, ctx, ox, oy, A) {
          const R = 40 * H.sc(e), x = e.x + ox, gy = e.gy + oy;
          A.alpha(ctx, A.fade(e, 0.3, 0.5), () => { for (let i = -R; i < R; i += 2) { const sw = Math.sin(i * 0.15 + e.t * 3) * 1.5; A.px(ctx, x + i, gy - 2 + sw, 2, 2 - sw, (i / 2 + Math.floor(e.t * 4)) % 4 ? e.pal.c : e.pal.d); } for (let i = 0; i < 3; i++) { const a = e.t * 2 + i * 2.1; A.px(ctx, x + Math.cos(a) * R * 0.6, gy - 1, 3, 1, e.pal.d); } });
        },
      },
      {
        name: 'Sand Coffin', dmg: 32, cd: 8, mp: 7, kind: 'custom', life: 1.5,
        desc: 'Sand wraps the nearest enemy up like a mummy, then squeezes. Hard.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 150); e.tg = t; if (!t) { e.dead = true; return; } A.sfx('whoosh'); if (t.applyStatus) { t.applyStatus('stagger', 0); if (t.status.stagger) t.status.stagger.t = 1.2; } },
        update(e, dt, g, A) { if (!e.tg || e.tg.dead) { e.dead = true; return; } if (e.t > 1.1 && !e.crush) { e.crush = true; A.damage(e, e.tg, 1, 0.3); A.sfx('crash'); A.shake(3, 0.2); const c = A.center(e.tg); for (let i = 0; i < 20; i++) A.spawn(e, GRAIN, { x: c.x, y: c.y, vx: A.rnd(-120, 120), vy: A.rnd(-140, 0) }); } },
        draw(e, ctx, ox, oy, A) {
          if (!e.tg || e.crush) return; const b = e.tg.box, x = b.x + ox - 2, y = b.y + oy - 2, w = b.w + 4, h = b.h + 4, k = Math.min(1, e.t / 0.6), sq = e.t > 0.9 ? (e.t - 0.9) * 8 : 0;
          const hh = h * k; A.px(ctx, x + sq, y + h - hh, w - sq * 2, hh, e.pal.c);
          for (let yy = 0; yy < hh; yy += 3) A.px(ctx, x + sq, y + h - yy - 1, w - sq * 2, 1, e.pal.d);
          for (let i = 0; i < 6; i++) { const a = e.t * 10 + i; A.px(ctx, x + w / 2 + Math.cos(a) * (w / 2 + 3), y + h - hh + ((i * 5) % Math.max(1, hh)), 1, 1, e.pal.l); }
        },
      },
      {
        name: 'Scarab Swarm', dmg: 5, cd: 8, mp: 6, kind: 'custom', life: 3.5,
        desc: 'A swarm of scarab beetles pours out of the sand and nibbles everything.',
        spawn(e, g, A) { const p = A.p; e.bugs = []; for (let i = 0; i < (e.up ? 9 : 6); i++) { const x = p.cx + p.facing * (6 + i * 3); e.bugs.push({ x, gy: A.ground(x, p.y + 2), d: p.facing, sp: A.rnd(70, 110), bt: A.rnd(0, 0.3) }); } A.sfx('pop'); },
        update(e, dt, g, A) {
          for (const b of e.bugs) {
            const t = A.near(b.x, b.gy - 6, 220); b.bt -= dt;
            if (t) { const c = A.center(t), dx = c.x - b.x; b.d = Math.sign(dx) || b.d; if (Math.abs(dx) > 4) { const nx = b.x + b.d * b.sp * dt; if (!A.solid(nx, b.gy - 3)) { b.x = nx; b.gy = A.ground(b.x, b.gy - 8); } } if (Math.abs(dx) < 10 && b.bt <= 0) { b.bt = 0.5; A.damage(e, t, 1, 0); } }
            else b.x += b.d * 30 * dt;
          }
        },
        draw(e, ctx, ox, oy, A) { A.alpha(ctx, A.fade(e, 0.1, 0.3), () => { for (const b of e.bugs) SCARAB(ctx, A, b.x + ox, b.gy + oy - 1, b.d, e.t + b.sp, e.pal); }); },
      },
      {
        name: 'Desert Mirage', dmg: 18, cd: 10, mp: 6, kind: 'custom', life: 3,
        desc: 'Leave a sand copy of yourself behind. Enemies near it get confused, then it explodes into a sand cloud.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx; e.f = p.feet; e.face = p.facing; A.sfx('whoosh'); },
        update(e, dt, g, A) {
          for (const o of H.nearby(A, e.x, e.f - 12, 70)) if (o.t.applyStatus && !o.t.status.confuse) o.t.applyStatus('confuse', 0);
          if (e.t > 2.6 && !e.pop) { e.pop = true; A.blast(e, e.x, e.f - 12, 40 * H.sc(e)); for (let i = 0; i < 26; i++) A.spawn(e, GRAIN, { x: e.x, y: e.f - 12, vx: A.rnd(-150, 150), vy: A.rnd(-160, 20) }); }
        },
        draw(e, ctx, ox, oy, A) { if (e.pop) return; const sh = Math.sin(e.t * 25) * (e.t > 2.2 ? 1 : 0); A.alpha(ctx, 0.75 + Math.sin(e.t * 4) * 0.15, () => H.drawGhost(ctx, A, 'idle', e.x + ox + sh, e.f + oy, e.face, e.pal.c)); for (let i = 0; i < 3; i++) A.px(ctx, e.x + ox - 4 + i * 4, e.f + oy - ((e.t * 10 + i * 4) % 20), 1, 1, e.pal.l); },
      },
      {
        name: 'Sandstorm', dmg: 3, cd: 10, mp: 7, kind: 'custom', life: 4,
        desc: 'Whip up a sandstorm around you. Enemies inside are sand-blasted and blinded.',
        spawn(e, g, A) { A.sfx('rumble', { dur: 1 }); },
        update(e, dt, g, A) { const p = A.p, R = 58 * H.sc(e); e.x = p.cx; e.y = p.y + 6; A.tickR(e, e.x, e.y, R, 0.35, { kb: 0.3 }); for (const o of H.nearby(A, e.x, e.y, R)) if (o.t.applyStatus && !o.t.status.blind) o.t.applyStatus('blind', 0); },
        draw(e, ctx, ox, oy, A) {
          const R = 58 * H.sc(e), x = e.x + ox, y = e.y + oy;
          A.alpha(ctx, A.fade(e, 0.3, 0.5), () => {
            A.alpha(ctx, 0.25, () => A.disc(ctx, x, y, Math.round(R * 0.8), e.pal.d));
            for (let i = 0; i < 70; i++) { const a = e.t * (3 + (i % 3)) + i * 0.9, r = R * (0.2 + ((i * 37) % 80) / 100); A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5, 2, 1, i % 4 ? e.pal.c : e.pal.l); }
          });
        },
      },
    ],
    ult: {
      name: 'Desert Execution', dmg: 26,
      desc: 'A wall of sand swallows the battlefield, giant sand hands rise and crush every enemy, then the desert collapses inward.',
      charge: {
        pose: 'raiseBoth', lift: 4,
        draw(ctx, x, y, k, t, A, P) {
          for (let i = 0; i < 60; i++) { const a = t * 5 + i * 0.6, h = (i / 60) * 50 * k, r = 6 + (i / 60) * 26; A.px(ctx, x + Math.cos(a) * r, y + 14 - h + Math.sin(a) * 3, 2, 1, i % 3 ? P.c : P.l); }
          A.alpha(ctx, 0.3 * k, () => A.px(ctx, x - 40, y + 10, 80, 4, P.d));
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3,
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 280).map((o) => o.t); e.hands = e.ts.map((t) => ({ t, x: A.center(t).x, gy: A.ground(A.center(t).x, t.box.y + 2) })); if (!e.hands.length) { const x = p.cx + e.dir * 80; e.hands.push({ t: null, x, gy: A.ground(x, p.y + 2) }); } A.sfx('rumble', { dur: 2 }); A.shake(2, 2.4); for (const t of e.ts) if (t.applyStatus) { t.applyStatus('stagger', 0); if (t.status.stagger) t.status.stagger.t = 1.6; } },
          update(e, dt, g, A) {
            if (e.t > 1.1 && !e.crush) { e.crush = true; for (const h of e.hands) if (h.t && !h.t.dead) A.damage(e, h.t, 1.5, 0.2); A.sfx('crash'); A.shake(6, 0.4); }
            if (e.t > 1.9 && !e.boom) { e.boom = true; for (const h of e.hands) A.blast(e, h.x, h.gy - 14, 50 * H.sc(e), { dmg: e.dmg * 1.6 }); A.flash(0.3); A.shake(8, 0.5); }
          },
          draw(e, ctx, ox, oy, A) {
            // the sand wall rolling across the screen
            const wq = U.clamp(e.t / 0.6, 0, 1), fade = e.t > 2.2 ? 1 - (e.t - 2.2) / 0.8 : 1;
            A.alpha(ctx, 0.35 * fade, () => { const W = 700, x0 = p.cx + ox - e.dir * 350; for (let i = 0; i < W * wq; i += 3) A.px(ctx, x0 + e.dir * i, -10, 3, 400, (i / 3) % 3 ? e.pal.c : e.pal.d); });
            for (const h of e.hands) {
              const x = h.x + ox, gy = h.gy + oy, rise = U.clamp((e.t - 0.3) / 0.4, 0, 1), close = U.clamp((e.t - 0.8) / 0.3, 0, 1), sink = e.t > 1.9 ? (e.t - 1.9) * 60 : 0;
              if (e.boom && sink > 40) continue;
              for (const s of [-1, 1]) {
                const hx = x + s * U.lerp(26, 8, close), top = gy - 42 * rise + sink;
                A.px(ctx, hx - 5, top + 10, 10, Math.max(0, gy - top - 10), e.pal.c);
                for (let f = 0; f < 4; f++) { const fx = hx - s * 2 + (f - 1.5) * 3 * -s; A.px(ctx, fx, top - (f === 0 ? 2 : 6) + close * f, 2, 12, f % 2 ? e.pal.l : e.pal.c); }
                A.px(ctx, hx - 5, top + 10, 10, 1, e.pal.l);
              }
            }
          },
        }, {});
      },
    },
  };

  // ==================================================================== MAGMA
  const BLOB = { life: 1.4, update(e, dt, g, A) { e.vy += 420 * dt; e.x += e.vx * dt; e.y += e.vy * dt; if (A.solid(e.x, e.y)) { e.dead = true; A.puff(e, e.x, e.y - 2, 3); } }, draw(e, ctx, ox, oy, A) { A.disc(ctx, e.x + ox, e.y + oy, e.r || 2, e.pal.c, e.pal.core); } };
  const blobs = (A, e, x, y, n, sp) => { for (let i = 0; i < n; i++) A.spawn(e, BLOB, { x, y, vx: A.rnd(-1, 1) * (sp || 90), vy: A.rnd(-260, -120), r: Math.random() < 0.3 ? 3 : 2 }); };
  const CRUST = (ctx, A, x, y, w, h, P, t) => { A.px(ctx, x, y, w, h, '#2a1410'); for (let i = 0; i < w; i += 4) A.px(ctx, x + i + ((i * 7) % 3), y + ((i * 3) % Math.max(1, h)), 2, 1, Math.sin(t * 6 + i) > 0 ? P.c : P.core); };
  K.magma = {
    status: 'scorch', fx: 'cinders', block: ['Obsidian Wall', 'wall'], dash: ['Lava Rush', 'trail'],
    m1: {
      name: 'Magma Fist', dmg: 11, cd: 0.5, kind: 'custom', life: 0.25,
      desc: 'A heavy molten punch that splashes lava on impact.',
      spawn(e, g, A) { const p = A.p; e.dir = p.facing; p.vx = e.dir * 60; A.sfx('swing'); },
      update(e, dt, g, A) { H.at(e, A, 0); if (H.melee(e, A, 32 * H.sc(e), 18, { kb: 1.4 })) { A.sfx('punchHit'); blobs(A, e, e.x + e.dir * 18, e.y, e.up ? 6 : 3, 60); } },
      draw(e, ctx, ox, oy, A) {
        const k = e.t < 0.08 ? e.t / 0.08 : 1 - (e.t - 0.08) / 0.17, x = e.x + ox + e.dir * (6 + 14 * k * H.sc(e)), y = e.y + oy, s = H.sc(e);
        A.disc(ctx, x, y, Math.round(5 * s), '#2a1410', e.pal.c); A.px(ctx, x - 2, y - 2, 3, 1, e.pal.core); A.px(ctx, x + e.dir * 2, y + 1, 2, 2, e.pal.core);
        A.alpha(ctx, 0.5, () => A.line(ctx, x - e.dir * 12, y, x - e.dir * 4, y, e.pal.c, 3));
      },
    },
    s: [
      {
        name: 'Lava Geyser', dmg: 18, cd: 5, mp: 6, kind: 'custom', life: 1.2,
        desc: 'The ground under the nearest enemy cracks open and blasts a geyser of lava upward.',
        spawn(e, g, A) { H.at(e, A, 0); const ax = A.aim(e, 150); e.tx = ax !== null ? ax : e.x + e.dir * 60; e.gy = H.floor(A, e.tx); A.sfx('rumble', { dur: 0.4 }); },
        update(e, dt, g, A) { if (e.t > 0.35) { if (!e.go) { e.go = true; A.sfx('ignite'); A.shake(2.5, 0.25); blobs(A, e, e.tx, e.gy - 40, 8, 70); } const h = 60 * H.sc(e) * Math.min(1, (e.t - 0.35) / 0.1); A.hit(e, { x: e.tx - 8, y: e.gy - h, w: 16, h }, { kb: 0, onHit(t) { if (t.applyStatus) t.applyStatus('launch', 0); } }); } },
        draw(e, ctx, ox, oy, A) {
          const x = e.tx + ox, gy = e.gy + oy;
          if (e.t < 0.35) { for (let i = -10; i <= 10; i += 2) A.px(ctx, x + i, gy - 1, 1, 1, Math.random() < 0.5 ? e.pal.c : '#2a1410'); return; }
          const h = 60 * H.sc(e) * Math.min(1, (e.t - 0.35) / 0.1), f = e.t > 0.9 ? 1 - (e.t - 0.9) / 0.3 : 1, w = 7 * H.sc(e);
          A.alpha(ctx, f, () => { for (let yy = 0; yy < h; yy++) { const ww = w + Math.sin(yy * 0.4 + e.t * 30) * 2; A.px(ctx, x - ww, gy - yy, ww * 2, 1, yy % 6 < 3 ? e.pal.c : e.pal.core); } A.disc(ctx, x, gy - h, Math.round(w + 2), e.pal.c, e.pal.core); });
        },
      },
      {
        name: 'Molten Boulder', dmg: 20, cd: 6, mp: 6, kind: 'custom', life: 1.8,
        desc: 'A huge ball of molten rock rolls along the ground, leaving a trail of fire.',
        spawn(e, g, A) { H.at(e, A, 10); e.gy = H.floor(A, e.x); e.vx = e.dir * 150; e.trail = []; A.sfx('rumble', { dur: 0.8 }); },
        update(e, dt, g, A) {
          const r = 8 * H.sc(e); e.x += e.vx * dt; e.gy = A.ground(e.x, e.gy - 16);
          if (A.solid(e.x + e.dir * r, e.gy - r)) { A.blast(e, e.x, e.gy - r, 30); e.dead = true; return; }
          A.hit(e, { x: e.x - r, y: e.gy - r * 2, w: r * 2, h: r * 2 }, { kb: 1.6, dir: e.dir });
          if (!e.trail.length || Math.abs(e.trail[e.trail.length - 1].x - e.x) > 6) e.trail.push({ x: e.x, gy: e.gy, t: e.t });
          for (const s of e.trail) if (e.t - s.t < 1) A.tick(e, { x: s.x - 3, y: s.gy - 6, w: 6, h: 6 }, 0.5, { mult: 0.2, kb: 0 });
        },
        draw(e, ctx, ox, oy, A) {
          for (const s of e.trail) { const a = 1 - (e.t - s.t); if (a > 0) A.alpha(ctx, a, () => { A.px(ctx, s.x + ox - 3, s.gy + oy - 1, 6, 1, e.pal.c); A.px(ctx, s.x + ox - 1, s.gy + oy - 3 - Math.random() * 2, 2, 2, e.pal.core); }); }
          const r = Math.round(8 * H.sc(e)), x = e.x + ox, y = e.gy + oy - r, rot = e.x / r;
          A.disc(ctx, x, y, r, '#3a1a10'); for (let i = 0; i < 5; i++) { const a = rot + i * 1.26; A.line(ctx, x, y, x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r - 1), i % 2 ? e.pal.c : e.pal.core); }
        },
      },
      {
        name: 'Lava Pool', dmg: 4, cd: 8, mp: 7, kind: 'custom', life: 4,
        desc: 'Melt the floor ahead into bubbling lava.',
        spawn(e, g, A) { H.at(e, A, 44); e.gy = H.floor(A, e.x); A.sfx('ignite'); },
        update(e, dt, g, A) { const R = 40 * H.sc(e); A.tick(e, { x: e.x - R, y: e.gy - 8, w: R * 2, h: 8 }, 0.4, { kb: 0.2 }); if (Math.random() < dt * 4) blobs(A, e, e.x + A.rnd(-R, R), e.gy - 3, 1, 20); },
        draw(e, ctx, ox, oy, A) { const R = 40 * H.sc(e), x = e.x + ox, gy = e.gy + oy; A.alpha(ctx, A.fade(e, 0.3, 0.5), () => { CRUST(ctx, A, x - R - 3, gy - 1, R * 2 + 6, 1, e.pal, e.t); for (let i = -R; i < R; i += 2) A.px(ctx, x + i, gy - 3 + Math.sin(i * 0.3 + e.t * 4), 2, 3, (i / 2) % 3 ? e.pal.c : e.pal.core); }); },
      },
      {
        name: 'Fissure', dmg: 16, cd: 7, mp: 6, kind: 'custom', life: 1.1,
        desc: 'Stomp the ground. A crack races out both ways, then lava bursts out of it.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx; e.gy = p.feet; A.sfx('crash'); A.shake(3, 0.2); },
        update(e, dt, g, A) {
          const L = 110 * H.sc(e) * Math.min(1, e.t / 0.35); e.L = L;
          if (e.t > 0.45) { if (!e.burst) { e.burst = true; A.sfx('ignite'); A.shake(3, 0.3); } A.hit(e, { x: e.x - L, y: e.gy - 22, w: L * 2, h: 22 }, { kb: 0.8 }); }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, gy = e.gy + oy, L = e.L || 0;
          for (const s of [-1, 1]) for (let i = 0; i < L; i += 2) { const j = ((i * 13) % 5) - 2; A.px(ctx, x + s * i, gy - 1 + (j > 0 ? 0 : 0), 2, 1, e.burst ? e.pal.core : '#2a1410'); if (i % 8 === 0) A.px(ctx, x + s * i, gy - 1 - Math.abs(j), 1, Math.abs(j) + 1, '#2a1410'); }
          if (e.burst) { const q = (e.t - 0.45) / 0.65; A.alpha(ctx, 1 - q, () => { for (let i = 4; i < L; i += 10) for (const s of [-1, 1]) { const h = (12 + ((i * 7) % 10)) * Math.min(1, q * 5) * H.sc(e); A.px(ctx, x + s * i - 2, gy - h, 4, h, e.pal.c); A.px(ctx, x + s * i - 1, gy - h, 2, 2, e.pal.core); } }); }
        },
      },
      {
        name: 'Obsidian Shards', dmg: 7, cd: 5, mp: 5, kind: 'custom', life: 0.01,
        desc: 'Cool lava into razor-sharp black glass and fire it in a fan.',
        spawn(e, g, A) {
          H.at(e, A, 8, -2); A.sfx('glassCrack');
          const n = e.up ? 7 : 5;
          for (let i = 0; i < n; i++) { const a = U.lerp(-0.35, 0.35, i / (n - 1)); A.spawn(e, H.proj((b, ctx, ox, oy, A) => { const x = b.x + ox, y = b.y + oy, d = Math.sign(b.vx); A.tri(ctx, x, y, 3, 0, '#1a1020'); A.line(ctx, x - d * 5, y - b.vy * 0.015, x + d * 2, y + b.vy * 0.005, '#2a2030', 2); A.px(ctx, x + d, y - 1, 1, 1, b.pal.c); }, { life: 0.8, r: 3 }), { vx: Math.cos(a) * 300 * e.dir, vy: Math.sin(a) * 300 }); }
        },
      },
    ],
    ult: {
      name: 'Volcanic Judgment', dmg: 14,
      desc: 'Rip a volcano out of the ground. It erupts, raining molten boulders across the battlefield, then floods the ground with lava.',
      charge: {
        pose: 'crouch', lift: 0,
        draw(ctx, x, y, k, t, A, P) {
          for (const s of [-1, 1]) for (let i = 0; i < 40 * k; i += 2) A.px(ctx, x + s * i, y + 12 - ((i * 7) % 3), 2, 1, Math.sin(t * 10 + i) > 0 ? P.c : P.core);
          A.alpha(ctx, k, () => { for (let i = 0; i < 6; i++) A.disc(ctx, x - 15 + i * 6, y + 10 - Math.abs(Math.sin(t * 8 + i)) * 10 * k, 2, P.c, P.core); });
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.2,
          spawn(e) { const t = A.near(p.cx, p.y, 200); e.vx2 = t ? A.center(t).x : p.cx + e.dir * 90; e.gy = A.ground(e.vx2, p.y + 2); A.sfx('rumble', { dur: 2.5 }); A.shake(3, 3); e.rt = 0; },
          update(e, dt, g, A) {
            if (e.t > 0.5 && !e.erupt) { e.erupt = true; A.blast(e, e.vx2, e.gy - 20, 50, { dmg: e.dmg * 2 }); A.sfx('boom'); A.flash(0.3); }
            e.rt -= dt;
            if (e.erupt && e.t < 2.2 && e.rt <= 0) {
              e.rt = 0.09;
              A.spawn(e, { life: 2, spawn(b) { b.vy = A.rnd(-320, -220); b.vx = A.rnd(-140, 140); }, update(b, dt, g, A) { b.vy += 380 * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (A.solid(b.x, b.y + 4) && b.vy > 0) { A.blast(b, b.x, b.y, 22, { dmg: b.dmg }); b.dead = true; } }, draw(b, ctx, ox, oy, A) { A.px(ctx, b.x + ox - b.vx * 0.03, b.y + oy - b.vy * 0.03, 2, 2, b.pal.c); A.disc(ctx, b.x + ox, b.y + oy, 4, '#3a1a10', b.pal.c); A.px(ctx, b.x + ox - 1, b.y + oy - 1, 2, 2, b.pal.core); } }, { x: e.vx2 + A.rnd(-6, 6), y: e.gy - 40 });
            }
            if (e.t > 2.2) { const R = 200 * Math.min(1, (e.t - 2.2) / 0.3); A.tick(e, { x: e.vx2 - R, y: e.gy - 10, w: R * 2, h: 10 }, 0.25, { mult: 0.6, kb: 0.3 }); }
          },
          draw(e, ctx, ox, oy, A) {
            const x = e.vx2 + ox, gy = e.gy + oy, rise = U.clamp(e.t / 0.5, 0, 1), sink = e.t > 2.6 ? (e.t - 2.6) * 100 : 0, h = 46 * rise - sink;
            if (h > 0) { for (let yy = 0; yy < h; yy++) { const w = 40 - (yy / 46) * 26; A.px(ctx, x - w, gy - yy, w * 2, 1, yy % 7 === 0 ? '#4a2418' : '#3a1a10'); } if (e.erupt) { A.disc(ctx, x, gy - h, 10, e.pal.c, e.pal.core); for (let i = 0; i < 4; i++) A.px(ctx, x - 10 + i * 6, gy - h + 4 + ((e.t * 40 + i * 9) % (h - 4)), 3, 4, e.pal.c); } }
            if (e.t > 2.2) { const R = 200 * Math.min(1, (e.t - 2.2) / 0.3), f = e.t > 2.9 ? 1 - (e.t - 2.9) / 0.3 : 1; A.alpha(ctx, f, () => { for (let i = -R; i < R; i += 2) A.px(ctx, x + i, gy - 4 + Math.sin(i * 0.2 + e.t * 8), 2, 4, (i / 2) % 4 ? e.pal.c : e.pal.core); }); }
          },
        }, {});
      },
    },
  };

  // ==================================================================== STORM
  const CLOUD = (ctx, A, x, y, w, col, col2) => { for (let i = 0; i < 5; i++) A.disc(ctx, x - w / 2 + (i / 4) * w, y + (i % 2) * 2, Math.round(w / 5 + (i % 2 ? 1 : 3)), col, col2); };
  const BOLT = (ctx, A, x, y0, y1, P, seed) => { let lx = x; for (let yy = y0; yy < y1; yy += 6) { const nx = x + Math.sin(yy * 0.37 + seed) * 5; A.line(ctx, lx, yy, nx, yy + 6, '#ffffff', 2); A.line(ctx, lx + 1, yy, nx + 1, yy + 6, P.l, 1); lx = nx; } };
  const RAIN = (ctx, A, x, y, w, h, t, col, slant) => { for (let i = 0; i < w / 3; i++) { const rx = x + i * 3 + ((i * 17) % 5), ry = y + ((t * 300 + i * 23) % h); A.px(ctx, rx + (slant || 0), ry, 1, 3, col); } };
  K.storm = {
    status: 'shock', fx: 'rain', block: ['Storm Wall', 'swirl'], dash: ['Squall', 'ghost'],
    m1: {
      name: 'Storm Bolt', dmg: 7, cd: 0.4, kind: 'custom', life: 0.01,
      desc: 'Fire a crackling ball of rain and lightning that zigzags forward.',
      spawn(e, g, A) {
        H.at(e, A, 8, -1); A.sfx('zap', { minGap: 0.04 });
        A.spawn(e, H.proj((b, ctx, ox, oy, A) => { const x = b.x + ox, y = b.y + oy; A.disc(ctx, x, y, b.up ? 3 : 2, b.pal.c, '#ffffff'); A.px(ctx, x - Math.sign(b.vx) * 4, y + Math.sin(b.t * 50) * 3, 2, 1, '#ffffff'); A.px(ctx, x - Math.sign(b.vx) * 6, y - 1, 1, 2, b.pal.l); }, { life: 1, r: 4, tick(b, dt) { b.vy = Math.sin(b.t * 30) * 120; } }), { vx: e.dir * 240 });
      },
    },
    s: [
      {
        name: 'Hail Barrage', dmg: 6, cd: 6, mp: 6, kind: 'custom', life: 1.4,
        desc: 'Hailstones the size of fists come down sideways on the wind.',
        spawn(e, g, A) { H.at(e, A, 0); const ax = A.aim(e, 150); e.tx = ax !== null ? ax : e.x + e.dir * 70; e.top = H.sky(A, e.tx, A.p.y); A.sfx('whoosh'); },
        update(e, dt, g, A) {
          e.ht = (e.ht || 0) - dt;
          if (e.ht <= 0 && e.t < 1.1) { e.ht = e.up ? 0.05 : 0.08; A.spawn(e, H.proj((b, ctx, ox, oy, A) => { A.px(ctx, b.x + ox - 1, b.y + oy - 1, 3, 3, '#e8f4ff'); A.px(ctx, b.x + ox - 1, b.y + oy - 1, 1, 1, '#ffffff'); A.alpha(ctx, 0.4, () => A.line(ctx, b.x + ox, b.y + oy, b.x + ox - b.vx * 0.04, b.y + oy - b.vy * 0.04, '#c8e0ff')); }, { life: 1.2, r: 3, onHit(b, A) { H.sparks(A, b.x, b.y, 3, '#e8f4ff', 50); } }), { x: e.tx - e.dir * 60 + A.rnd(-30, 30), y: e.top, vx: e.dir * 120, vy: 260 }); }
        },
        draw(e, ctx, ox, oy, A) { A.alpha(ctx, A.fade(e, 0.2, 0.4) * 0.8, () => CLOUD(ctx, A, e.tx - e.dir * 50 + ox, e.top + oy, 60, '#4a5a7a', '#6a7a9a')); },
      },
      {
        name: 'Thundercloud', dmg: 9, cd: 9, mp: 7, kind: 'custom', life: 4,
        desc: 'A grumpy little thundercloud follows the nearest enemy around and zaps it.',
        spawn(e, g, A) { e.x = A.p.cx; e.y = A.p.y - 20; e.zt = 0.5; A.sfx('cast'); },
        update(e, dt, g, A) {
          const t = A.near(e.x, e.y + 30, 260);
          if (t) { const c = A.center(t); e.x = U.approach(e.x, c.x, 3, dt); e.y = U.approach(e.y, t.box.y - 30, 3, dt); }
          e.zt -= dt; e.zap = Math.max(0, (e.zap || 0) - dt);
          if (e.zt <= 0 && t && Math.abs(A.center(t).x - e.x) < 12) { e.zt = e.up ? 0.5 : 0.8; e.zap = 0.12; e.zy = A.center(t).y; A.damage(e, t, 1, 0.2); A.sfx('zap', { minGap: 0.05 }); }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy + Math.sin(e.t * 3) * 2;
          A.alpha(ctx, A.fade(e, 0.2, 0.3), () => { CLOUD(ctx, A, x, y, 26, '#3a4a6a', '#5a6a8a'); A.px(ctx, x - 5, y, 2, 1, '#ffffff'); A.px(ctx, x + 3, y, 2, 1, '#ffffff'); A.px(ctx, x - 5, y - 1, 2, 1, '#1a2030'); A.px(ctx, x + 3, y - 1, 2, 1, '#1a2030'); RAIN(ctx, A, x - 8, y + 4, 16, 14, e.t, e.pal.l); });
          if (e.zap) BOLT(ctx, A, x, y + 4, e.zy + oy, e.pal, e.t * 50);
        },
      },
      {
        name: 'Gale Force', dmg: 10, cd: 6, mp: 5, kind: 'custom', life: 0.6,
        desc: 'A howling blast of wind and rain that throws enemies across the room.',
        spawn(e, g, A) { H.at(e, A, 4); A.sfx('whoosh'); A.shake(2, 0.3); },
        update(e, dt, g, A) { H.at(e, A, 4); const L = 120 * H.sc(e); A.hit(e, { x: e.dir > 0 ? e.x : e.x - L, y: e.y - 22, w: L, h: 40 }, { kb: 3.2, dir: e.dir, onHit(t) { if (t.applyStatus) t.applyStatus('wet', 0); } }); },
        draw(e, ctx, ox, oy, A) { const L = 120 * H.sc(e), x = e.x + ox, y = e.y + oy; A.alpha(ctx, 1 - e.t / e.life, () => { for (let i = 0; i < 26; i++) { const yy = y - 22 + ((i * 7) % 40), off = ((e.t * 500 + i * 41) % L); A.line(ctx, x + e.dir * off, yy, x + e.dir * (off + 10 + (i % 3) * 6), yy + 1, i % 3 ? '#c8e0ff' : e.pal.c); } }); },
      },
      {
        name: 'Downpour', dmg: 12, cd: 9, mp: 7, kind: 'custom', life: 3.5,
        desc: 'A heavy rain soaks everything ahead. Lightning loves soaked things.',
        spawn(e, g, A) { H.at(e, A, 50); e.gy = H.floor(A, e.x); e.top = H.sky(A, e.x, A.p.y); e.st = 0.6; A.sfx('whoosh'); },
        update(e, dt, g, A) {
          const R = 50 * H.sc(e), inside = A.targets().filter((t) => Math.abs(A.center(t).x - e.x) < R && t.box.y + t.box.h > e.top);
          for (const t of inside) if (t.applyStatus && !t.status.wet) t.applyStatus('wet', 0);
          e.st -= dt; e.bolt = Math.max(0, (e.bolt || 0) - dt);
          if (e.st <= 0 && inside.length) { e.st = 0.7; const t = inside[Math.floor(Math.random() * inside.length)]; e.bx = A.center(t).x; e.by = A.center(t).y; e.bolt = 0.12; A.damage(e, t, 1, 0.3); A.sfx('zap', { minGap: 0.05 }); }
        },
        draw(e, ctx, ox, oy, A) {
          const R = 50 * H.sc(e), x = e.x + ox, top = e.top + oy, gy = e.gy + oy;
          A.alpha(ctx, A.fade(e, 0.3, 0.4), () => { CLOUD(ctx, A, x, top + 4, R * 2, '#3a4a6a', '#5a6a8a'); A.alpha(ctx, 0.7, () => RAIN(ctx, A, x - R, top + 10, R * 2, gy - top - 10, e.t, '#8ab0e0', 0)); for (let i = 0; i < 4; i++) A.ring(ctx, x - R + ((i * 29 + e.t * 30) % (R * 2)), gy - 1, 1 + ((e.t * 3 + i) % 1) * 3, '#8ab0e0', 1); });
          if (e.bolt) BOLT(ctx, A, e.bx + ox, top + 8, e.by + oy, e.pal, e.t * 40);
        },
      },
      {
        name: 'Eye of the Storm', dmg: 6, cd: 11, mp: 7, kind: 'custom', life: 4,
        desc: 'You become the calm centre. A ring of wind, rain and lightning circles you, shredding anything it touches.',
        spawn(e, g, A) { A.sfx('rumble', { dur: 0.8 }); },
        update(e, dt, g, A) {
          const p = A.p; e.x = p.cx; e.y = p.y + 8; const R = 40 * H.sc(e);
          for (const t of A.targets()) { const c = A.center(t), d = Math.hypot(c.x - e.x, c.y - e.y); if (Math.abs(d - R) < 14) { const last = e.hitT.get(t.uid); if (last === undefined || e.t - last > 0.35) { e.hitT.set(t.uid, e.t); A.damage(e, t, 1, 0.6); } } }
        },
        draw(e, ctx, ox, oy, A) {
          const R = 40 * H.sc(e), x = e.x + ox, y = e.y + oy;
          A.alpha(ctx, A.fade(e, 0.3, 0.4), () => {
            for (let i = 0; i < 40; i++) { const a = e.t * 5 + i * 0.157, r = R + Math.sin(i * 3 + e.t * 4) * 4; A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, 2, 1, i % 4 ? '#c8e0ff' : e.pal.c); A.px(ctx, x + Math.cos(a + 0.05) * (r - 6), y + Math.sin(a + 0.05) * (r - 6) * 0.6, 1, 2, '#8ab0e0'); }
            const z = Math.floor(e.t * 6) % 6, a = z * 1.05; A.jag(ctx, x + Math.cos(a) * R, y + Math.sin(a) * R * 0.6, x + Math.cos(a + 0.6) * R, y + Math.sin(a + 0.6) * R * 0.6, '#ffffff', 3, 1);
          });
        },
      },
    ],
    ult: {
      name: 'Tempest Barrage', dmg: 9,
      desc: 'The sky turns black. A hurricane of wind, rain and hail engulfs the battlefield while lightning hammers every enemy, ending in one colossal thunderbolt.',
      charge: {
        pose: 'raiseBoth', lift: 14,
        draw(ctx, x, y, k, t, A, P) {
          A.alpha(ctx, 0.5 * k, () => A.px(ctx, x - 300, y - 200, 600, 400, '#101828'));
          CLOUD(ctx, A, x, y - 46, 30 + k * 50, '#2a3a5a', '#4a5a7a');
          A.alpha(ctx, 0.7, () => RAIN(ctx, A, x - 40, y - 40, 80, 70, t, '#8ab0e0', 2));
          if (Math.floor(t * 8) % 3 === 0) BOLT(ctx, A, x + Math.sin(t * 9) * 30, y - 42, y + 14, P, t * 30);
          for (let i = 0; i < 16; i++) { const a = t * 6 + i * 0.4, r = 20 + (i % 4) * 4; A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.4, 2, 1, '#c8e0ff'); }
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.4, layer: 'screen',
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 320).map((o) => o.t); e.bolts = []; e.bt = 0; A.sfx('rumble', { dur: 3 }); A.sfx('whoosh'); },
          update(e, dt, g, A) {
            e.bt -= dt;
            for (const b of e.bolts) b.t += dt;
            const live = e.ts.filter((t) => !t.dead);
            if (e.t < 2.3) {
              for (const t of live) if (!t.tutorial) t.vx = U.approach(t.vx, Math.sin(e.t * 3) * 90, 3, dt);
              A.tickR(e, p.cx, p.y, 320, 0.3, { mult: 0.3, kb: 0 });
              if (e.bt <= 0 && live.length) { e.bt = 0.15; const t = live[Math.floor(Math.random() * live.length)], c = A.center(t); A.damage(e, t, 0.8, 0.2); e.bolts.push({ x: c.x, y: c.y, t: 0, s: Math.random() * 9 }); A.sfx('zap', { minGap: 0.04 }); }
            }
            if (e.t > 2.4 && !e.fin) { e.fin = true; const c = live[0] ? A.center(live[0]) : { x: p.cx + e.dir * 80, y: p.y + 10 }; e.fx2 = c; A.blast(e, c.x, c.y, 80 * H.sc(e), { dmg: e.dmg * 4 }); A.sfx('boom'); A.flash(0.6); A.shake(10, 0.6); }
          },
          draw(e, ctx, ox, oy, A) {
            const dark = e.t < 2.6 ? Math.min(1, e.t * 3) * 0.6 : Math.max(0, 0.6 - (e.t - 2.6) * 1);
            A.alpha(ctx, dark, () => A.px(ctx, -10, -10, 2000, 2000, '#0a1020'));
            const top = A.top() + oy + 14;
            A.alpha(ctx, Math.min(1, dark * 2), () => {
              for (let i = 0; i < 12; i++) CLOUD(ctx, A, p.cx + ox - 300 + i * 54 + Math.sin(e.t + i) * 6, top, 60, '#1a2440', '#2a3a5a');
              RAIN(ctx, A, p.cx + ox - 320, top, 640, 260, e.t, '#8ab0e0', 6);
              for (let i = 0; i < 30; i++) { const yy = top + ((i * 31) % 220), xx = ((e.t * 400 + i * 53) % 640) - 320; A.line(ctx, p.cx + ox + xx, yy, p.cx + ox + xx + 14, yy + 2, '#c8e0ff'); }
            });
            for (const b of e.bolts) if (b.t < 0.12) BOLT(ctx, A, b.x + ox, top, b.y + oy, e.pal, b.s);
            if (e.fin && e.t < 2.8) { const c = e.fx2, w = 14 * (1 - (e.t - 2.4) / 0.4); A.px(ctx, c.x + ox - w / 2, top, w, c.y + oy - top, '#ffffff'); A.px(ctx, c.x + ox - w, top, 2, c.y + oy - top, e.pal.l); }
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

    // --------------------------------------------------------------- BLOOD
    const NEEDLE = H.proj((b, ctx, ox, oy, A) => {
      const x = b.x + ox, y = b.y + oy, a = Math.atan2(b.vy, b.vx), c = Math.cos(a), sn = Math.sin(a);
      A.line(ctx, x - c * 5, y - sn * 5, x + c * 2, y + sn * 2, b.pal.c, 1); A.px(ctx, x + c * 2, y + sn * 2, 1, 1, '#ffffff');
    }, { life: 0.4, r: 3, onHit(b, A, r) { if (r === 'hit') heal(A, Math.max(1, b.dmg * 0.15), '#ff6a7a'); splat(A, b, b.x, b.y, 3); } });
    K.blood.m1Up = {
      name: 'Needle Orb', dmg: 9, cd: 0.5, kind: 'custom', life: 0.4,
      desc: 'Throw an orb of blood that bursts into a ring of needles. Every needle that hits gives you a little life back.',
      spawn(e, g, A) { H.at(e, A, 10, -2); e.vx = e.dir * 200; e.vy = 0; },
      update(e, dt, g, A) { if (H.fly(e, dt, A, { r: 6, kb: 0.4 })) e.dead = true; },
      onEnd(e, A) {
        const s = H.sc(e);
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; spare(A.spawn(e, NEEDLE, { x: e.x, y: e.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, dmg: e.dmg * 0.55 }), e); }
        splat(A, e, e.x, e.y, 6); A.sfx('pop'); A.spawn(e, W().SHOCK, { x: e.x, y: e.y, r: 14 * s });
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), x = e.x + ox, y = e.y + oy, r = Math.round(5 * s * (1 + Math.sin(e.t * 40) * 0.12));
        A.glow(ctx, x, y, r + 3, P.c, 0.3);
        A.disc(ctx, x, y, r, P.d);
        A.disc(ctx, x, y, r - 1, P.c, P.l);
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + e.t * 6; A.line(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2), '#ffffff', 1); }   // needles poking out, ready to fly
        A.px(ctx, x - r * 0.4, y - r * 0.5, 2, 1, '#ffffff');
        for (let i = 0; i < 3; i++) A.px(ctx, x - e.dir * (r + 2 + i * 3), y + 1 + (i % 2), 1, 2, P.c);   // drips behind
      },
    };
    K.blood.dashUp = {
      name: 'Sanguine Rush', dmg: 12, life: 0.5,
      desc: 'Dash through enemies with blades of blood. Every one you cut heals you.',
      update(e, dt, g, A) {
        if (!H.dashing(e, A)) return;
        H.dashBody(e, A, { kb: 0.5, onHit: (t) => { heal(A, 2 + e.dmg * 0.2, '#ff6a7a'); const c = A.center(t); splat(A, e, c.x, c.y, 4); (e.cuts = e.cuts || []).push({ x: c.x, y: c.y, t: e.t }); } });
      },
      draw(e, ctx, ox, oy, A) {
        if (!e.pts) return;
        const P = e.pal, s = H.sc(e), k = e.over ? Math.max(0, 1 - H.since(e) / 0.3) : 1;
        if (k > 0) A.alpha(ctx, k, () => {   // a crimson streak behind you
          let i = 0;
          H.along(e, 3, (x, y, f, u) => { const w = Math.sin(u * Math.PI) * 6 * s; A.px(ctx, x + ox, y + oy - w, 2, 1, P.c); A.px(ctx, x + ox, y + oy + w, 2, 1, P.d); if (i++ % 4 === 0) A.px(ctx, x + ox, y + oy - w + 1, 1, 1, '#ffffff'); });
        });
        if (e.cuts) for (const c of e.cuts) {   // claw marks on whatever you cut
          const q = (e.t - c.t) / 0.3;
          if (q < 1) A.alpha(ctx, 1 - q, () => { for (let j = -1; j <= 1; j++) A.line(ctx, c.x + ox - 7 + j * 3, c.y + oy - 8, c.x + ox + 5 + j * 3, c.y + oy + 8, j ? P.c : '#ffffff', 2); });
        }
      },
    };

    // --------------------------------------------------------------- DEATH
    const CHOMPER = H.proj((b, ctx, ox, oy, A) => {
      const x = b.x + ox, y = b.y + oy, s = H.sc(b), P = b.pal, jaw = Math.floor(b.t * 16) % 2;
      A.disc(ctx, x, y - 1, Math.round(3.5 * s), P.l, '#ffffff');
      A.px(ctx, x - 2.5 * s, y + 1.5 * s + (jaw ? 2 : 0), 5 * s, 2 * s, P.l);   // the jaw, chattering
      for (let i = 0; i < 3; i++) A.px(ctx, x - 2 * s + i * 2 * s, y + 1.5 * s + (jaw ? 2 : 0), 1, 1, P.d);   // teeth
      A.px(ctx, x - 2 * s, y - 1.5 * s, Math.max(1, s), 1.5 * s, P.d); A.px(ctx, x + 0.8 * s, y - 1.5 * s, Math.max(1, s), 1.5 * s, P.d);   // eye sockets
      A.px(ctx, x - 1.6 * s, y - 1.2 * s, 1, 1, P.c); A.px(ctx, x + 1.2 * s, y - 1.2 * s, 1, 1, P.c);   // ...with a glow in them
    }, { life: 1.1, r: 5, homing: 5, range: 170 });
    K.death.m1Up = {
      name: 'Skull Barrage', dmg: 6, cd: 0.5, kind: 'custom', life: 0.2,
      desc: 'Three chattering skulls fly out, hunt down the nearest enemy and bite. They are very hungry. They have no stomachs.',
      spawn(e, g, A) { H.at(e, A, 8, -2); e.n = 0; },
      update(e, dt, g, A) {
        while (e.n < 3 && e.t >= e.n * 0.06) { const a = (e.n - 1) * 0.5; A.spawn(e, CHOMPER, { vx: Math.cos(a) * 190 * e.dir, vy: Math.sin(a) * 190 }); A.sfx('swing', { minGap: 0.03 }); e.n++; }
      },
    };
    K.death.dashUp = {
      name: 'Grave Step', dmg: 16, life: 0.55,
      desc: 'Step through, and a giant reaper\'s scythe sweeps through everything you just passed.',
      update(e, dt, g, A) {
        if (H.dashing(e, A)) return;
        if (!e.swing) { e.swing = e.t; const q = H.end(e), s = H.sc(e), S = H.span(e); A.hit(e, { x: S.x0 - 12, y: q.y - 26 * s, w: S.x1 - S.x0 + 24, h: 42 * s }, { kb: 0.9, dir: -e.dir }); A.sfx('swing'); A.shake(1.8, 0.1); }
      },
      draw(e, ctx, ox, oy, A) {
        if (!e.swing) return;
        const k = (e.t - e.swing) / 0.3;
        if (k > 1) return;
        const P = e.pal, s = H.sc(e), S = H.span(e), q = H.end(e), cx = (S.x0 + S.x1) / 2 + ox, cy = q.y + oy - 4, R = Math.max(22 * s, (S.x1 - S.x0) / 2 + 12), d = -e.dir;
        A.alpha(ctx, 1 - k * k, () => {
          W().smear(ctx, A, cx, cy, R, d, Math.min(1, k * 1.4), P.l, 5, -1.9, 1.3);
          // the scythe at the head of the swing: a long handle and a hooked blade
          const a = U.lerp(-1.9, 1.3, Math.min(1, k * 1.7)), hx = cx + Math.cos(a) * R * d, hy = cy + Math.sin(a) * R;
          A.line(ctx, cx + Math.cos(a) * R * 0.2 * d, cy + Math.sin(a) * R * 0.2, hx, hy, P.d, 2);
          for (let i = 0; i <= 8; i++) { const b = a + Math.PI / 2 + i * 0.16, r = (10 - i) * s * 0.9; A.px(ctx, hx + Math.cos(b) * r * d, hy + Math.sin(b) * r, 2, 2, i < 2 ? '#ffffff' : P.l); }
        });
      },
    };

    // --------------------------------------------------------------- METAL
    K.metal.m1Up = {
      name: 'Hookshot', dmg: 11, cd: 0.55, kind: 'custom', life: 0.7,
      desc: 'Fire a hook on a steel chain. It grabs the first thing it hits and drags it right over to you. Get over here.',
      spawn(e, g, A) { H.at(e, A, 4, -1); e.hx = e.x; e.ext = 0; A.sfx('swing'); },
      update(e, dt, g, A) {
        H.at(e, A, 4, -1);
        const s = H.sc(e), L = 90 * s;
        if (!e.got) {
          if (!e.back) { e.ext += 330 * 1.2 * dt; if (e.ext >= L) e.back = true; }
          else { e.ext -= 420 * dt; if (e.ext <= 0) { e.dead = true; return; } }
          e.hx = e.x + e.dir * e.ext;
          if (!e.back) {
            if (A.solid(e.hx, e.y)) e.back = true;
            const t = A.near(e.hx, e.y, 8 * s);
            if (t) { e.got = t; A.damage(e, t, 1, 0); A.sfx('hitMetal', { minGap: 0.05 }); sparks(A, e, e.hx, e.y, 6); }
          }
          return;
        }
        const t = e.got, c = A.center(t), dx = e.x + e.dir * 14 - c.x, step = Math.sign(dx) * Math.min(Math.abs(dx), 360 * dt);
        if (!e.done && (t.dead || Math.abs(dx) < 3 || !H.shove(A, t, step, 0))) { e.done = true; e.life = e.t + 0.12; if (!t.dead) A.damage(e, t, 0.5, 0.6); }
        e.hx = A.center(t).x;
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), x0 = e.x + ox, y = e.y + oy, x1 = e.hx + ox, d = e.dir, n = Math.abs(x1 - x0);
        for (let i = 0; i < n; i += 4) {   // chain links: one flat (with a hole), one edge-on
          const x = x0 + d * i - (d < 0 ? 4 : 0);
          if ((i / 4) % 2) { A.px(ctx, x, y - 2, 5, 4, P.d); A.px(ctx, x + 1, y - 1, 3, 2, '#120c1a'); A.px(ctx, x, y - 2, 5, 1, P.l); }
          else A.px(ctx, x, y - 1, 5, 2, P.c);
        }
        A.line(ctx, x1, y, x1 + d * 4 * s, y, P.l, 2);   // the hook
        A.line(ctx, x1 + d * 4 * s, y, x1 + d * 4 * s, y + 4 * s, P.l, 2);
        A.line(ctx, x1 + d * 4 * s, y + 4 * s, x1 + d * s, y + 3 * s, '#ffffff', 1);
        A.px(ctx, x1 + d * 4 * s, y - 1, 1, 1, '#ffffff');
      },
    };
    K.metal.dashUp = {
      name: 'Steel Ram', dmg: 14, life: 0.45,
      desc: 'A steel battering ram forms in front of you. Anything you dash into gets sent flying.',
      update(e, dt, g, A) {
        if (H.dashing(e, A)) { H.dashBody(e, A, { kb: 2.4, onHit: (t) => { const c = A.center(t); sparks(A, e, c.x, c.y, 8); A.sfx('hitMetal', { minGap: 0.05 }); A.shake(2, 0.1); } }); return; }
        if (!e.clang) { e.clang = true; const q = H.end(e); A.spawn(e, W().SHOCK, { x: q.x + e.dir * 10, y: q.y, r: 14 * H.sc(e), flat: 1.3 }); }
      },
      draw(e, ctx, ox, oy, A) {
        if (!e.pts || e.over) return;
        const P = e.pal, s = H.sc(e), p = A.p, d = p.facing, x = p.cx + d * 6 + ox, y = p.y + 10 + oy, L = Math.round(12 * s);
        for (let i = 0; i < L; i++) { const h = (L - i) * 1.3; A.px(ctx, x + d * i, y - h / 2 - 1, 1, h + 2, P.d); A.px(ctx, x + d * i, y - h / 2, 1, h, i > L - 3 ? '#ffffff' : i % 3 ? P.c : P.l); }   // a wedge of steel, dark-edged so it shows up against anything
        A.line(ctx, x, y - L * 0.65, x + d * L, y, '#ffffff', 1);
        for (const side of [-1, 1]) A.arc(ctx, x - d * 2 * s, y + side * 5 * s, 4 * s, -d, side < 0 ? P.l : P.c, 2, side < 0 ? -1.6 : -0.2, side < 0 ? 0.2 : 1.6);   // horns curling back
        A.alpha(ctx, 0.5, () => { for (let i = 0; i < 4; i++) A.px(ctx, x - d * (14 + i * 5), y - 8 + i * 5, 6, 1, '#ffffff'); });   // speed streaks
      },
    };

    // ---------------------------------------------------------------- SAND
    K.sand.m1Up = {
      name: 'Dune Wave', dmg: 13, cd: 0.55, kind: 'custom', life: 0.6,
      desc: 'Raise a rolling wave of sand that surges along the ground and tosses everything it reaches into the air.',
      spawn(e, g, A) { H.at(e, A, 10); e.gy = H.floor(A, e.x); e.vx = e.dir * 180; A.sfx('rumble', { dur: 0.4, minGap: 0.2 }); },
      update(e, dt, g, A) {
        const s = H.sc(e), h = 18 * s;
        e.x += e.vx * dt * 1.2;
        const gy = A.ground(e.x, e.gy - 12);
        if (Math.abs(gy - e.gy) < 20) e.gy = gy;
        A.hit(e, { x: e.x - 8 * s, y: e.gy - h, w: 16 * s, h }, { dir: e.dir, kb: 0.4, onHit: (t) => H.launch(t, 230) });
        if (Math.random() < dt * 40) A.spawn(e, GRAIN, { x: e.x + A.rnd(-4, 4), y: e.gy - h * A.rnd(0.6, 1), vx: e.dir * A.rnd(20, 80), vy: A.rnd(-90, -30) });
        if (A.solid(e.x + e.dir * 6, e.gy - 6)) e.dead = true;
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), d = e.dir, gy = e.gy + oy, x = e.x + ox;
        A.alpha(ctx, A.fade(e, 0.06, 0.12), () => {
          for (let i = -18; i <= 6; i++) {   // the wave: tall at the front, with a long low tail
            const u = i <= 0 ? 1 + i / 18 : 1 - i / 6, h = Math.max(1, u * u * 18 * s * (0.9 + 0.1 * Math.sin(e.t * 20 + i)));
            const wx = x + d * i * s;
            A.px(ctx, wx, gy - h, Math.ceil(s), h, i % 3 ? P.c : P.d);
            if (u > 0.5) A.px(ctx, wx, gy - h, Math.ceil(s), 1, P.l);
          }
          for (let i = 0; i < 5; i++) A.px(ctx, x + d * (2 + i * 1.5) * s, gy - 18 * s + i * 2 * s + Math.sin(e.t * 25 + i), 1, 1, '#ffffff');   // spray off the crest
        });
      },
    };
    K.sand.dashUp = {
      name: 'Sandblaster', dmg: 11, life: 1.1,
      desc: 'Kick off in a jet of sand that blasts anything behind you, and leave a choking dust cloud where you were.',
      update(e, dt, g, A) {
        const p = A.p, s = H.sc(e);
        if (H.dashing(e, A)) {
          const d = p.facing, L = 44 * s;
          A.hit(e, { x: d > 0 ? p.cx - L : p.cx, y: p.y + 2, w: L, h: p.h }, { dir: -d, kb: 1.2 });
          for (let i = 0; i < 3; i++) A.spawn(e, GRAIN, { x: p.cx - d * 4, y: p.feet - A.rnd(2, 14), vx: -d * A.rnd(150, 260), vy: A.rnd(-40, 20), life: 0.4 });
          return;
        }
        const o = e.pts[0];
        if (e.t < e.life - 0.25) A.tick(e, { x: o.x - 20 * s, y: o.f - 26 * s, w: 40 * s, h: 26 * s }, 0.4, { mult: 0.4, kb: 0 });
      },
      draw(e, ctx, ox, oy, A) {
        if (!e.pts) return;
        const P = e.pal, s = H.sc(e), o = e.pts[0], out = Math.min(1, (e.life - e.t) / 0.3), grow = Math.min(1, e.t / 0.25);
        for (let i = 0; i < 7; i++) {   // the dust cloud
          const a = i * 0.9 + e.t * 0.8, r = (6 + (i % 3) * 2) * s * (0.5 + grow * 0.5), cx = o.x + Math.cos(a) * 12 * s * grow, cy = o.f - 10 * s + Math.sin(a) * 6 * s;
          A.alpha(ctx, 0.4 * out, () => A.disc(ctx, cx + ox, cy + oy, Math.round(r), i % 2 ? P.c : P.d));
        }
      },
    };

    // --------------------------------------------------------------- MAGMA
    const LAVA_BOMB = {
      life: 1.5,
      update(e, dt, g, A) {
        e.vy += 600 * dt; e.x += e.vx * dt; e.y += e.vy * dt;
        if (Math.random() < dt * 30) A.spawn(e, BLOB, { x: e.x, y: e.y, vx: A.rnd(-20, 20), vy: A.rnd(-40, 0), r: 1 });
        const touch = A.targets().some((t) => { const b = t.box; return e.x > b.x - 3 && e.x < b.x + b.w + 3 && e.y > b.y - 3 && e.y < b.y + b.h + 3; });
        if (touch || A.solid(e.x, e.y + 2)) e.dead = true;
      },
      onEnd(e, A) { A.blast(e, e.x, e.y - 2, 16 * H.sc(e)); blobs(A, e, e.x, e.y - 4, 3, 70); },
      draw(e, ctx, ox, oy, A) {
        const x = e.x + ox, y = e.y + oy, s = H.sc(e), P = e.pal, r = Math.round(3 * s);
        A.glow(ctx, x, y, r + 1, P.c, 0.3); A.disc(ctx, x, y, r, '#2a1410'); A.disc(ctx, x, y, r - 1, P.c, P.core); A.px(ctx, x - 1, y - 1, 1, 1, '#ffffff');
      },
    };
    K.magma.m1Up = {
      name: 'Lava Mortar', dmg: 10, cd: 0.55, kind: 'custom', life: 0.2,
      desc: 'Lob three lava bombs, each one further than the last. They splash on landing, so maybe stand back.',
      spawn(e, g, A) { H.at(e, A, 6, -4); e.n = 0; A.sfx('cast', { minGap: 0.05 }); },
      update(e, dt, g, A) {
        const s = H.sc(e), T = 0.42;
        while (e.n < 3 && e.t >= e.n * 0.07) { A.spawn(e, LAVA_BOMB, { x: e.x, y: e.y, vx: (e.dir * (38 + e.n * 32) * s) / T, vy: -0.5 * 600 * T }); e.n++; }
      },
    };
    K.magma.dashUp = {
      name: 'Magma Wake', dmg: 6, life: 1.6,
      desc: 'Leave a river of lava behind you. Anything that walks through it is going to have a very bad time.',
      update(e, dt, g, A) {
        if (H.dashing(e, A)) return;
        if (!e.S) { e.S = H.span(e); e.S.x0 -= 4; e.S.x1 += 4; e.gy = A.ground((e.S.x0 + e.S.x1) / 2, e.S.f - 2); }
        const S = e.S;
        if (e.t < e.life - 0.3) A.tick(e, { x: S.x0, y: e.gy - 10, w: S.x1 - S.x0, h: 12 }, 0.35, { kb: 0 });
        if (Math.random() < dt * 10) A.spawn(e, BLOB, { x: A.rnd(S.x0, S.x1), y: e.gy - 2, vx: A.rnd(-20, 20), vy: A.rnd(-120, -60), r: 1 });
      },
      draw(e, ctx, ox, oy, A) {
        if (!e.S) { if (e.pts && !e.over) { const p = A.p; A.glow(ctx, p.cx + ox, p.feet + oy - 2, 6, e.pal.c, 0.4); } return; }
        const P = e.pal, S = e.S, gy = e.gy + oy, w = S.x1 - S.x0;
        A.alpha(ctx, Math.min(1, (e.life - e.t) / 0.4), () => {
          A.px(ctx, S.x0 + ox, gy - 3, w, 3, P.d);
          for (let x = 0; x < w; x += 2) { const h = 1 + Math.max(0, Math.sin(x * 0.5 + e.t * 6)) * 2; A.px(ctx, S.x0 + ox + x, gy - 2 - h, 2, h, x % 4 ? P.c : P.core); }
          for (let x = 3; x < w; x += 11) { const b = (e.t * 2 + x * 0.13) % 1; A.ring(ctx, S.x0 + ox + x, gy - 3 - b * 3, 1 + b * 2, P.l); }   // bubbles popping
        });
      },
    };

    // --------------------------------------------------------------- STORM
    K.storm.m1Up = {
      name: 'Storm Drill', dmg: 4, cd: 0.5, kind: 'custom', life: 0.6,
      desc: 'A sideways tornado of wind, rain and lightning drills straight through everything, then ends in a thunderclap.',
      spawn(e, g, A) { H.at(e, A, 14, -2); e.vx = e.dir * 150; e.seed = Math.random() * 9; A.sfx('whoosh', { minGap: 0.05 }); },
      update(e, dt, g, A) {
        const s = H.sc(e), L = 30 * s;
        e.x += e.vx * dt * 1.2;
        A.tick(e, { x: e.dir > 0 ? e.x - L : e.x, y: e.y - 9 * s, w: L, h: 18 * s }, 0.1, { dir: e.dir, kb: 0.15 });
        if (A.solid(e.x, e.y)) e.dead = true;
      },
      onEnd(e, A) { const s = H.sc(e); A.hitR(e, e.x, e.y, 18 * s, { mult: 2, kb: 0.9 }); A.spawn(e, W().SHOCK, { x: e.x, y: e.y, r: 18 * s }); A.sfx('zap'); A.shake(1.8, 0.12); },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), d = e.dir, L = 30 * s, x = e.x + ox, y = e.y + oy;
        A.alpha(ctx, A.fade(e, 0.06, 0.08), () => {
          for (let i = 0; i < 30; i++) {   // the funnel: wide at the back, a point at the front
            const q = i / 30, r = 9 * s * (1 - q * 0.85), a = e.t * 30 - i * 0.6, xx = x - d * L * (1 - q);
            A.px(ctx, xx, y + Math.sin(a) * r, 2, 1, i % 3 ? P.c : P.l);
            A.px(ctx, xx, y - Math.sin(a) * r * 0.6, 1, 1, P.d);
          }
          for (let i = 0; i < 6; i++) A.px(ctx, x - d * ((e.t * 200 + i * 9) % L), y + ((i * 7) % 13) - 6, 1, 2, '#ffffff');   // rain whipping round
          W().bolt(ctx, A, x - d * L * 0.8, y + Math.sin(e.t * 40) * 4, x, y, P.l, e.seed + Math.floor(e.t * 20), 1);   // lightning inside it
        });
      },
    };
    K.storm.dashUp = {
      name: 'Storm Chaser', dmg: 15, life: 0.75,
      desc: 'A storm cloud chases you across the sky. When you stop, it brings down a huge bolt of lightning right in front of you.',
      update(e, dt, g, A) {
        if (H.dashing(e, A)) return;
        if (!e.bolt && H.since(e) > 0.12) {
          const q = H.end(e), s = H.sc(e), x = q.x + e.dir * 14;
          e.bolt = e.t; e.bx = x; e.cy = q.y - 34 * s; e.gy = A.ground(x, q.y); e.top = Math.max(H.sky(A, x, e.gy - 8), e.cy);
          A.hit(e, { x: x - 10 * s, y: e.top, w: 20 * s, h: e.gy - e.top }, { kb: 0.6 });
          A.hitR(e, x, e.gy - 4, 18 * s, { kb: 0.8 });
          A.sfx('zap'); A.shake(2.5, 0.15); A.flash(0.05); H.sparks(A, x, e.gy - 2, 12, e.pal.l, 110);
        }
      },
      draw(e, ctx, ox, oy, A) {
        if (!e.pts) return;
        const P = e.pal, s = H.sc(e), q = e.over ? H.end(e) : { x: A.p.cx, y: A.p.y + 10 };
        const cx = (e.bolt ? e.bx : q.x) + ox, cy = (e.bolt ? e.cy : q.y - 34 * s) + oy, out = e.bolt ? Math.max(0, 1 - (e.t - e.bolt) / 0.35) : 1;
        A.alpha(ctx, out, () => {
          const w = 15 * s;
          for (let i = 0; i < 6; i++) { const bx = cx - w + (i / 5) * w * 2, r = Math.round((i % 2 ? 5 : 7) * s * (1 - Math.abs(i - 2.5) * 0.08)); A.disc(ctx, bx, cy - 1 - (i % 2) * 2, r, P.d); }
          for (let i = 0; i < 4; i++) { const bx = cx - w * 0.7 + (i / 3) * w * 1.4; A.disc(ctx, bx, cy - 4 * s - (i % 2) * 2, Math.round(4.5 * s), P.c); }
          A.px(ctx, cx - w - 2, cy + 2, w * 2 + 4, 4, P.d);
          for (let i = 0; i < 5; i++) A.px(ctx, cx - w * 0.6 + i * w * 0.3, cy - 8 * s - (i % 2), 3, 1, P.l);   // light catching the top
          RAIN(ctx, A, cx - 12 * s, cy + 6, 24 * s, 18, e.t, P.l, 0);
          if (e.bolt && e.t - e.bolt < 0.18) { W().bolt(ctx, A, e.bx + ox, cy + 4, e.bx + ox, e.gy + oy, P.c, e.bolt * 10, Math.round(3 * s)); A.ring(ctx, e.bx + ox, e.gy + oy - 2, 14 * s, '#ffffff', 4 * s); }
          else if (!e.bolt && Math.floor(e.t * 20) % 3 === 0) W().bolt(ctx, A, cx - 5, cy + 2, cx + 6, cy + 9, '#ffffff', e.t, 1);   // flickering inside the cloud
        });
      },
    };
  }
})(window.ERX = window.ERX || {});
