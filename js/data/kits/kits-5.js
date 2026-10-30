/*
 * KITS: MAGNETISM, TIME, GRAVITY, SOUND, MIST, SPIRIT, CHAOS
 * (format: js/data/kits/_kit.js)
 *
 * Chaos is the only element that borrows other elements' moves.
 */
(function (ERX) {
  'use strict';

  const K = ERX.Kits, H = ERX.KitHelp, U = ERX.U;
  const Phys = () => ERX.GameEngine.Physics;
  const holdStun = (t, s) => { if (!t.applyStatus) return; t.applyStatus('stagger', 0); if (t.status.stagger) t.status.stagger.t = s; };
  const pull = (t, x, sp, dt, rate) => { if (!t.tutorial) t.vx = U.approach(t.vx, Math.sign(x - (t.box.x + t.box.w / 2)) * sp, rate || 6, dt); };

  // ================================================================ MAGNETISM
  const RED = '#ff4a6a', BLUE = '#4a6aff';
  const FIELD = (ctx, A, x0, y0, x1, y1, t, n, col) => { for (let k = 1; k <= n; k++) { const bow = k * 6; for (let i = 0; i <= 16; i++) { const q = i / 16; if ((i + Math.floor(t * 20)) % 3 === 0) continue; A.px(ctx, U.lerp(x0, x1, q), U.lerp(y0, y1, q) - Math.sin(q * Math.PI) * bow, 1, 1, col); } } };
  K.magnetism = {
    status: 'magnetize', fx: 'field', block: ['Magnetic Field', 'shield'], dash: ['Rail Dash', 'ghost'],
    m1: {
      name: 'Polarity Shot', dmg: 7, cd: 0.4, kind: 'custom', life: 0.01,
      desc: 'Fire a magnetic bolt. It alternates red and blue. The enemies alternate between ow and OW.',
      spawn(e, g, A) {
        H.at(e, A, 8, -1); const p = A.p; p._pol = !p._pol; const col = p._pol ? RED : BLUE; A.sfx('zap', { minGap: 0.04 });
        A.spawn(e, H.proj((b, ctx, ox, oy, A) => { const x = b.x + ox, y = b.y + oy; A.px(ctx, x - 3, y - 2, 6, 4, b.col); A.px(ctx, x - 3, y - 2, 6, 1, '#ffffff'); A.px(ctx, x + (b.vx > 0 ? -3 : 2), y - 2, 1, 4, '#c8d0e0'); A.ring(ctx, x, y, 5 + Math.sin(b.t * 30), b.col); }, { life: 0.9, r: 4 }), { vx: e.dir * 250, col });
      },
    },
    s: [
      {
        name: 'Magnet Pull', dmg: 10, cd: 5, mp: 5, kind: 'custom', life: 0.6,
        desc: 'Yank every enemy in front of you straight towards you.',
        spawn(e, g, A) { H.at(e, A, 0); A.sfx('hover'); for (const o of H.nearby(A, e.x, e.y, 150 * H.sc(e))) if ((o.c.x - e.x) * e.dir > 0) { A.damage(e, o.t, 1, 0); if (!o.t.tutorial) o.t.vx = -e.dir * 320; } },
        update(e, dt, g, A) { H.at(e, A, 0); },
        draw(e, ctx, ox, oy, A) { const L = 150 * H.sc(e), x = e.x + ox, y = e.y + oy; A.alpha(ctx, 1 - e.t / e.life, () => { for (let i = 0; i < 4; i++) { const q = 1 - ((e.t * 3 + i / 4) % 1); A.arc(ctx, x, y, 10 + q * L, e.dir, i % 2 ? RED : BLUE, 1, -0.5, 0.5); } }); },
      },
      {
        name: 'Repulse', dmg: 14, cd: 6, mp: 6, kind: 'custom', life: 0.4,
        desc: 'Flip your polarity and blast everything around you away.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx; e.y = p.y + 10; A.sfx('shockwave'); A.hitR(e, e.x, e.y, 56 * H.sc(e), { kb: 3 }); },
        draw(e, ctx, ox, oy, A) { const k = e.t / e.life, R = 56 * H.sc(e) * k, x = e.x + ox, y = e.y + oy; A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; A.line(ctx, x + Math.cos(a) * R * 0.5, y + Math.sin(a) * R * 0.5, x + Math.cos(a) * R, y + Math.sin(a) * R, i % 2 ? RED : BLUE); } A.ring(ctx, x, y, R, '#ffffff'); }); },
      },
      {
        name: 'Railgun', dmg: 34, cd: 7, mp: 7, kind: 'custom', life: 0.7,
        desc: 'Charge for a moment, then fire a magnetic slug so fast it goes through EVERYTHING.',
        spawn(e, g, A) { A.sfx('energyCharge'); },
        update(e, dt, g, A) { H.at(e, A, 8, -1); if (e.t > 0.35 && !e.fire) { e.fire = true; A.sfx('zap'); A.shake(3, 0.2); A.p.vx = -e.dir * 90; const L = 400; A.hit(e, { x: e.dir > 0 ? e.x : e.x - L, y: e.y - 4, w: L, h: 8 }, { kb: 2 }); } },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, d = e.dir;
          if (!e.fire) { const k = e.t / 0.35; for (let i = 0; i < 4; i++) A.ring(ctx, x + d * (4 + i * 6), y, 5 - k * 2, i % 2 ? RED : BLUE, 7 - k * 3); return; }
          const k = (e.t - 0.35) / 0.35, w = 5 * (1 - k) * H.sc(e);
          A.px(ctx, d > 0 ? x : x - 400, y - w / 2, 400, Math.max(1, w), '#c8ff4a'); A.px(ctx, d > 0 ? x : x - 400, y - 0.5, 400, 1, '#ffffff');
          for (let i = 0; i < 12; i++) A.alpha(ctx, 1 - k, () => A.ring(ctx, x + d * (10 + i * 30), y, 3 + k * 6, i % 2 ? RED : BLUE, 6 + k * 8));
        },
      },
      {
        name: 'Magnetic Mine', dmg: 26, cd: 8, mp: 6, kind: 'custom', life: 1.8,
        desc: 'Throw a magnet down. It drags enemies in close... then explodes.',
        spawn(e, g, A) { H.at(e, A, 40); const ax = A.aim(e, 110); if (ax !== null) e.x = ax; e.gy = H.floor(A, e.x); A.sfx('hitMetal'); },
        update(e, dt, g, A) { for (const o of H.nearby(A, e.x, e.gy - 10, 90)) pull(o.t, e.x, 90, dt); if (e.t > 1.4 && !e.boom) { e.boom = true; A.blast(e, e.x, e.gy - 8, 40 * H.sc(e)); for (const o of H.nearby(A, e.x, e.gy, 50)) if (o.t.applyStatus) o.t.applyStatus('magnetize', e.potency); e.dead = true; } },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, gy = e.gy + oy;
          A.px(ctx, x - 5, gy - 6, 4, 6, RED); A.px(ctx, x + 1, gy - 6, 4, 6, BLUE); A.px(ctx, x - 5, gy - 8, 10, 2, '#c8d0e0');
          for (let i = 0; i < 3; i++) { const r = 80 * (1 - ((e.t * 1.2 + i / 3) % 1)); A.alpha(ctx, 0.5, () => A.ring(ctx, x, gy - 4, r, i % 2 ? RED : BLUE, r * 0.4, 3)); }
          if (e.t > 1 && Math.floor(e.t * 16) % 2) A.px(ctx, x - 1, gy - 10, 2, 2, '#ffffff');
        },
      },
      {
        name: 'Polarity Swap', dmg: 24, cd: 8, mp: 6, kind: 'custom', life: 1,
        desc: 'Give the two nearest enemies opposite charges. They slam into each other. Hard.',
        spawn(e, g, A) {
          const p = A.p, ts = H.nearby(A, p.cx, p.y, 200).slice(0, 2).map((o) => o.t); e.ts = ts; A.sfx('hover');
          if (ts.length === 1) { e.solo = true; }
          if (!ts.length) e.dead = true;
        },
        update(e, dt, g, A) {
          if (e.solo) { const t = e.ts[0]; if (!t || t.dead) { e.dead = true; return; } if (e.t > 0.4 && !e.hitDone) { e.hitDone = true; A.damage(e, t, 1, 0.6); A.sfx('anvil'); } return; }
          const [a, b] = e.ts; if (!a || !b || a.dead || b.dead) return;
          const ca = A.center(a), cb = A.center(b);
          if (!e.hitDone) { pull(a, cb.x, 260, dt, 10); pull(b, ca.x, 260, dt, 10); if (Math.abs(ca.x - cb.x) < 18 || e.t > 0.5) { e.hitDone = true; e.cx = (ca.x + cb.x) / 2; e.cy = (ca.y + cb.y) / 2; A.damage(e, a, 1, 0.3); A.damage(e, b, 1, 0.3); A.sfx('anvil'); A.shake(4, 0.25); } }
        },
        draw(e, ctx, ox, oy, A) {
          e.ts.forEach((t, i) => { if (t.dead) return; const c = A.center(t); A.alpha(ctx, e.hitDone ? 1 - e.t : 1, () => { A.ring(ctx, c.x + ox, c.y + oy, 8, i ? BLUE : RED); A.text(ctx, i ? '-' : '+', c.x + ox, t.box.y + oy - 12, i ? BLUE : RED); }); });
          if (!e.hitDone && e.ts.length === 2 && !e.ts[0].dead && !e.ts[1].dead) { const a = A.center(e.ts[0]), b = A.center(e.ts[1]); FIELD(ctx, A, a.x + ox, a.y + oy, b.x + ox, b.y + oy, e.t, 2, '#c8ff4a'); }
        },
      },
    ],
    ult: {
      name: 'Magnetic Annihilation', dmg: 28,
      desc: 'Drag every enemy and every scrap of metal into one giant magnetic sphere, crush it tighter and tighter, then flip the poles and blow it apart.',
      charge: {
        pose: 'raiseBoth', lift: 8,
        draw(ctx, x, y, k, t, A, P) {
          const lx = x - 14, rx = x + 14, hy = y - 20;
          A.disc(ctx, lx, hy, Math.round(2 + k * 4), RED, '#ffffff'); A.disc(ctx, rx, hy, Math.round(2 + k * 4), BLUE, '#ffffff');
          FIELD(ctx, A, lx, hy, rx, hy, t, Math.round(1 + k * 4), '#c8ff4a'); FIELD(ctx, A, lx, hy, rx, hy + 0.01, -t, Math.round(k * 3), P.l);
          for (let i = 0; i < 8; i++) { const a = i * 0.8, d = 60 * (1 - ((t * 1.5 + i / 8) % 1)); A.px(ctx, x + Math.cos(a) * d - 1, hy + Math.sin(a) * d * 0.6, 3, 2, '#8a90a0'); }
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 2.8,
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 280).map((o) => o.t); const c = e.ts[0] ? A.center(e.ts[0]) : { x: p.cx + e.dir * 90, y: p.y }; e.cx = c.x; e.cy = c.y - 20; e.scrap = []; for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, d = A.rnd(120, 260); e.scrap.push({ x: e.cx + Math.cos(a) * d, y: e.cy + Math.sin(a) * d * 0.6, s: A.rnd(2, 4) }); } for (const t of e.ts) holdStun(t, 2.2); A.sfx('hover'); A.sfx('rumble', { dur: 2 }); },
          update(e, dt, g, A) {
            if (e.t < 1.7) { for (const s of e.scrap) { s.x = U.approach(s.x, e.cx + Math.sin(s.s * 9 + e.t * 6) * 10 * (1.7 - e.t), 3, dt); s.y = U.approach(s.y, e.cy + Math.cos(s.s * 7 + e.t * 6) * 10 * (1.7 - e.t), 3, dt); } for (const t of e.ts) if (!t.dead && !t.tutorial) { const c = A.center(t); t.vx = (e.cx - c.x) * 4; t.vy = (e.cy - c.y) * 4; } A.tickR(e, e.cx, e.cy, 40, 0.25, { mult: 0.4, kb: 0 }); }
            if (e.t > 1.7 && !e.boom) { e.boom = true; A.blast(e, e.cx, e.cy, 110 * H.sc(e), { dmg: e.dmg * 3 }); A.flash(0.5); A.shake(10, 0.6); A.sfx('boom'); for (const s of e.scrap) { const a = Math.atan2(s.y - e.cy, s.x - e.cx) + A.rnd(-0.3, 0.3); s.vx = Math.cos(a) * A.rnd(200, 400); s.vy = Math.sin(a) * A.rnd(200, 400); } for (const t of e.ts) if (t.applyStatus) t.applyStatus('magnetize', e.potency); }
            if (e.boom) for (const s of e.scrap) { s.x += s.vx * dt; s.y += s.vy * dt; }
          },
          draw(e, ctx, ox, oy, A) {
            const x = e.cx + ox, y = e.cy + oy;
            if (!e.boom) { const r = Math.round(30 - e.t * 10); A.alpha(ctx, 0.6, () => { A.ring(ctx, x, y, r, RED, r, 2); A.ring(ctx, x, y, r + 3, BLUE, r + 3, 2); }); FIELD(ctx, A, x - r - 20, y, x + r + 20, y, e.t, 3, '#c8ff4a'); }
            for (const s of e.scrap) A.px(ctx, s.x + ox - s.s / 2, s.y + oy - s.s / 2, s.s, s.s, s.s > 3 ? '#c8d0e0' : '#8a90a0');
            if (e.boom) { const k = (e.t - 1.7) / 1.1; A.alpha(ctx, 1 - k, () => { A.ring(ctx, x, y, 20 + k * 200, RED, 20 + k * 200, 2); A.ring(ctx, x, y, 10 + k * 170, BLUE, 10 + k * 170, 2); }); }
          },
        }, {});
      },
    },
  };

  // ===================================================================== TIME
  const CLOCK = (ctx, A, x, y, r, t, P, fast) => { A.disc(ctx, x, y, r, '#2a2418'); A.ring(ctx, x, y, r, P.c); A.ring(ctx, x, y, r - 1, P.d); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; A.px(ctx, x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2), 1, 1, i % 3 ? P.l : '#ffffff'); } const m = t * (fast || 1) * 6, h = m / 12; A.line(ctx, x, y, x + Math.cos(m - Math.PI / 2) * (r - 3), y + Math.sin(m - Math.PI / 2) * (r - 3), '#ffffff'); A.line(ctx, x, y, x + Math.cos(h - Math.PI / 2) * (r - 5), y + Math.sin(h - Math.PI / 2) * (r - 5), P.l); };
  K.time = {
    status: 'slow', fx: 'clock', block: ['Stasis Field', 'bubble'], dash: ['Time Skip', 'blink'],
    m1: {
      name: 'Clock Hand', dmg: 9, cd: 0.45, kind: 'custom', life: 0.25,
      desc: 'Swing a giant clock hand from twelve to three. Tick.',
      spawn(e, g, A) { A.sfx('tick', { value: 70, minGap: 0.04 }); },
      update(e, dt, g, A) { H.at(e, A, 0, -2); const q = U.ease.outCubic(Math.min(1, e.t / 0.15)), a = U.lerp(-Math.PI / 2, 0.3, q), L = 30 * H.sc(e); e.a = a; A.hit(e, { x: Math.min(e.x, e.x + Math.cos(a) * L * e.dir) - 3, y: Math.min(e.y, e.y + Math.sin(a) * L) - 3, w: Math.abs(Math.cos(a) * L) + 6, h: Math.abs(Math.sin(a) * L) + 6 }, { kb: 0.7 }); },
      draw(e, ctx, ox, oy, A) {
        const x = e.x + ox, y = e.y + oy, a = e.a || -1.5, L = 30 * H.sc(e), d = e.dir, tx = x + Math.cos(a) * L * d, ty = y + Math.sin(a) * L;
        A.alpha(ctx, 0.35, () => A.arc(ctx, x, y, L, d, e.pal.c, 2, -Math.PI / 2, a));
        A.line(ctx, x, y, tx, ty, e.pal.d, 3); A.line(ctx, x, y, tx, ty, e.pal.c, 1);
        A.tri(ctx, tx, ty, 6, 0, e.pal.l); A.disc(ctx, x, y, 2, '#ffffff');
      },
    },
    s: [
      {
        name: 'Stasis Bubble', dmg: 10, cd: 9, mp: 7, kind: 'custom', life: 2.6,
        desc: 'Trap the area around the nearest enemy in a bubble where time has stopped.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 160); H.at(e, A, 50); if (t) { const c = A.center(t); e.x = c.x; e.y = c.y; } A.sfx('tick', { value: 40 }); for (const o of H.nearby(A, e.x, e.y, 34 * H.sc(e))) { A.damage(e, o.t, 1, 0); if (o.t.applyStatus) { o.t.applyStatus('timestop', 0); if (o.t.status.timestop) o.t.status.timestop.t = e.up ? 2.6 : 1.8; } } },
        draw(e, ctx, ox, oy, A) { const R = 34 * H.sc(e), x = e.x + ox, y = e.y + oy, f = A.fade(e, 0.15, 0.4); A.alpha(ctx, f * 0.25, () => A.disc(ctx, x, y, Math.round(R), '#8a90b0')); A.alpha(ctx, f, () => { A.ring(ctx, x, y, R, e.pal.l); CLOCK(ctx, A, x, y - R - 8, 6, 0, e.pal); }); },
      },
      {
        name: 'Rewind', dmg: 0, cd: 14, mp: 6, kind: 'custom', life: 2,
        desc: 'Drop a time marker. Two seconds later you snap back to it, and any health you lost since then comes back too.',
        spawn(e, g, A) { const p = A.p; e.mx = p.x; e.my = p.y; e.f = p.feet; e.cx2 = p.cx; e.hp0 = p.hp; A.sfx('tick', { value: 60 }); },
        update(e, dt, g, A) { const n = Math.ceil(2 - e.t); if (n !== e.n) { e.n = n; A.sfx('tick', { value: 60 + n * 10 }); } },
        onEnd(e, A) { const p = A.p; if (!Phys().overlapsSolid(A.g.level, e.mx, e.my, p.w, p.h)) { p.x = e.mx; p.y = e.my; p.vx = 0; p.vy = 0; } if (p.hp < e.hp0) { const n = Math.round((e.hp0 - p.hp) * (e.up ? 1 : 0.75)); p.hp = Math.min(p.maxHp, p.hp + n); A.g.floatText(p.cx, p.y - 6, '+' + n, '#7af0a0'); } A.sfx('whoosh'); A.flash(0.1); },
        draw(e, ctx, ox, oy, A) { const x = e.cx2 + ox, f = e.f + oy; A.alpha(ctx, 0.5, () => H.drawGhost(ctx, A, 'idle', x, f, 1, e.pal.c)); CLOCK(ctx, A, x, f - 34, 6, -e.t * 4, e.pal, 3); },
      },
      {
        name: 'Accelerate', dmg: 0, cd: 18, mp: 5, kind: 'custom', life: 0.8,
        desc: 'Fast-forward your own timeline. Every other skill comes off cooldown much sooner.',
        spawn(e, g, A) { const ab = A.p.ab; for (const s of ['s1', 's2', 's3', 's4', 's5']) if (ab.cd[s] > 0 && s !== 's3') ab.cd[s] *= e.up ? 0.15 : 0.35; A.g.floatText(A.p.cx, A.p.y - 10, 'FAST FORWARD!', e.pal.l); A.sfx('levelUp'); },
        update(e, dt, g, A) { e.x = A.p.cx; e.y = A.p.y + 10; },
        draw(e, ctx, ox, oy, A) { const k = e.t / e.life; A.alpha(ctx, 1 - k, () => { CLOCK(ctx, A, e.x + ox, e.y + oy - 26, 8, e.t * 20, e.pal, 8); for (let i = 0; i < 2; i++) { const xx = e.x + ox - 6 + i * 6; A.tri(ctx, xx, e.y + oy - 40, 0, 0, e.pal.l); A.px(ctx, xx, e.y + oy - 42, 1, 5, e.pal.l); A.px(ctx, xx + 1, e.y + oy - 41, 1, 3, e.pal.l); A.px(ctx, xx + 2, e.y + oy - 40, 1, 1, e.pal.l); } }); },
      },
      {
        name: 'Rapid Aging', dmg: 5, cd: 8, mp: 6, kind: 'custom', life: 3,
        desc: 'Speed up the nearest enemy\'s personal timeline. It gets old FAST. Its back hurts.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 170); e.tg = t; if (!t) { e.dead = true; return; } if (t.applyStatus) t.applyStatus('slow', e.potency); A.sfx('tick'); },
        update(e, dt, g, A) { if (!e.tg || e.tg.dead) { e.dead = true; return; } e.at = (e.at || 0) - dt; if (e.at <= 0) { e.at = 0.3; A.damage(e, e.tg, 1, 0); } },
        draw(e, ctx, ox, oy, A) { if (!e.tg || e.tg.dead) return; const c = A.center(e.tg), b = e.tg.box; CLOCK(ctx, A, c.x + ox, b.y + oy - 12, 6, e.t * 6, e.pal, 30); A.alpha(ctx, 0.35, () => A.px(ctx, b.x + ox, b.y + oy, b.w, Math.min(b.h, 3 + e.t * 3), '#e8e8e8')); A.text(ctx, String(Math.floor(e.t * 20) + 1) + 'Y', c.x + ox + 12, b.y + oy - 20, e.pal.l); },
      },
      {
        name: 'Echo Slash', dmg: 16, cd: 5, mp: 5, kind: 'custom', life: 0.9,
        desc: 'Slash once. Then the same slash happens again a moment later, from the past.',
        spawn(e, g, A) { H.at(e, A, 0); e.sx = e.x; e.sy = e.y; A.sfx('swing'); },
        update(e, dt, g, A) {
          const R = 34 * H.sc(e), box = { x: e.dir > 0 ? e.sx : e.sx - R, y: e.sy - 16, w: R, h: 32 };
          if (e.t < 0.15) A.hit(e, box, { kb: 0.3 });
          if (e.t > 0.55 && !e.echo) { e.echo = true; e.hit.clear(); A.sfx('swing'); A.sfx('tick', { value: 90 }); }
          if (e.echo && e.t < 0.7) A.hit(e, box, { mult: 1.2, kb: 1 });
        },
        draw(e, ctx, ox, oy, A) {
          const R = 34 * H.sc(e), x = e.sx + ox, y = e.sy + oy;
          const sl = (t0, col, al) => { const q = (e.t - t0) / 0.15; if (q < 0 || q > 1.6) return; A.alpha(ctx, al * (1 - Math.max(0, q - 1) / 0.6), () => A.arc(ctx, x, y, R * 0.8, e.dir, col, 3, -1.2, U.lerp(-1.2, 1.2, Math.min(1, q)))); };
          sl(0, e.pal.c, 1);
          if (e.t > 0.15 && e.t < 0.55) A.alpha(ctx, 0.4, () => { A.arc(ctx, x, y, R * 0.8, e.dir, e.pal.l, 1, -1.2, 1.2); CLOCK(ctx, A, x + e.dir * R * 0.5, y - 20, 5, -e.t * 10, e.pal); });
          sl(0.55, e.pal.l, 0.9);
        },
      },
    ],
    ult: {
      name: 'Chrono Overkill', dmg: 6,
      desc: 'Stop time completely. In the frozen moment you strike every enemy dozens of times... then time starts again and every single hit lands at once.',
      charge: {
        pose: 'raise', lift: 6,
        draw(ctx, x, y, k, t, A, P) {
          const r = Math.round(10 + k * 22); A.alpha(ctx, 0.85, () => CLOCK(ctx, A, x - 2, y - 6, r, t, P, 2 + k * 40));
          for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 - t * 2; A.px(ctx, x - 2 + Math.cos(a) * (r + 6), y - 6 + Math.sin(a) * (r + 6), 1, 1, P.l); }
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.2, layer: 'screen',
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 300).map((o) => o.t); e.marks = []; e.n = 0; e.sx = p.x; e.sy = p.y; for (const t of e.ts) { if (t.applyStatus) { t.applyStatus('timestop', 0); if (t.status.timestop) t.status.timestop.t = 2.4; } } A.sfx('tick', { value: 30 }); e.st = 0; },
          update(e, dt, g, A) {
            e.st -= dt;
            if (e.t < 1.8 && e.st <= 0 && e.ts.length) { e.st = 0.05; const t = e.ts[e.n % e.ts.length]; e.n++; if (!t.dead) { const c = A.center(t); e.marks.push({ x: c.x + A.rnd(-10, 10), y: c.y + A.rnd(-10, 10), a: A.rnd(0, Math.PI), t: e.t }); e.px = c.x + A.rnd(-20, 20); A.sfx('swing', { minGap: 0.03 }); } }
            if (e.t > 1.9 && !e.go) { e.go = true; e.n2 = e.marks.length; for (const t of e.ts) if (!t.dead) { const hits = e.marks.filter(() => true).length / Math.max(1, e.ts.length); A.damage(e, t, Math.min(40, hits) * 0.9, 2); } A.sfx('boom'); A.sfx('glassCrack'); A.flash(0.6); A.shake(10, 0.6); }
          },
          draw(e, ctx, ox, oy, A) {
            if (!e.go) { ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = Math.min(1, e.t * 4); ctx.fillStyle = '#808080'; ctx.fillRect(-10, -10, 2000, 2000); ctx.restore(); A.alpha(ctx, 0.25, () => A.px(ctx, -10, -10, 2000, 2000, '#e8d08a')); }
            for (const m of e.marks) { const fresh = e.t - m.t < 0.08; if (e.go && e.t - 1.9 > 0.3) continue; A.alpha(ctx, e.go ? 1 - (e.t - 1.9) / 0.3 : fresh ? 1 : 0.6, () => { const c = Math.cos(m.a) * 9, s = Math.sin(m.a) * 9; A.line(ctx, m.x + ox - c, m.y + oy - s, m.x + ox + c, m.y + oy + s, fresh ? '#ffffff' : e.pal.c, 1); }); }
            if (!e.go && e.px !== undefined) A.alpha(ctx, 0.7, () => H.drawGhost(ctx, A, 'attack', e.px + ox, p.feet + oy, Math.random() < 0.5 ? 1 : -1, e.pal.l));
            if (!e.go) { const top = A.top() + oy + 30, cx = p.cx + ox; CLOCK(ctx, A, cx, top, 14, 0, e.pal); }
          },
        }, {});
      },
    },
  };

  // ================================================================== GRAVITY
  const WARP = (ctx, A, x, y, r, t, col) => { for (let i = 0; i < 3; i++) { const rr = r * (1 - ((t * 1.5 + i / 3) % 1)); A.ring(ctx, x, y, rr, col, rr * 0.35, 2); } };
  const ROCK = (ctx, A, x, y, s) => { A.px(ctx, x - s, y - s, s * 2, s * 2 - 1, '#6a5a8a'); A.px(ctx, x - s, y - s, s * 2, 1, '#8a7ab0'); };
  K.gravity = {
    status: 'heavy', fx: 'rocks', block: ['Gravity Shield', 'bubble'], dash: ['Gravity Shift', 'ghost'],
    m1: {
      name: 'Gravity Pulse', dmg: 9, cd: 0.45, kind: 'custom', life: 0.01,
      desc: 'Throw a tiny, very dense ball. It is heavier than it looks. It falls fast.',
      spawn(e, g, A) { H.at(e, A, 8, -3); A.sfx('swing', { minGap: 0.04 }); A.spawn(e, H.proj((b, ctx, ox, oy, A) => { A.disc(ctx, b.x + ox, b.y + oy, b.up ? 3 : 2, b.pal.d, b.pal.c); A.ring(ctx, b.x + ox, b.y + oy, 4 + Math.sin(b.t * 20), b.pal.l); }, { life: 1, r: 4, gravity: 520, boom: 12 }), { vx: e.dir * 210, vy: -110 }); },
    },
    s: [
      {
        name: 'Crush', dmg: 24, cd: 6, mp: 6, kind: 'custom', life: 0.8,
        desc: 'Multiply the gravity on the nearest enemy by a thousand for half a second. It gets flatter.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 160); e.tg = t; if (!t) { e.dead = true; return; } holdStun(t, 0.7); A.sfx('rumble', { dur: 0.4 }); },
        update(e, dt, g, A) { const t = e.tg; if (!t || t.dead) { e.dead = true; return; } if (!t.tutorial) t.vy = 500; if (e.t > 0.35 && !e.hitDone) { e.hitDone = true; A.damage(e, t, 1, 0); if (t.applyStatus) t.applyStatus('heavy', e.potency); A.sfx('crash'); A.shake(4, 0.25); } },
        draw(e, ctx, ox, oy, A) { const t = e.tg; if (!t) return; const b = t.box, x = b.x + b.w / 2 + ox, top = A.top() + oy; A.alpha(ctx, 1 - e.t / e.life, () => { for (let i = -2; i <= 2; i++) { const yy = top + ((e.t * 600 + i * 40) % (b.y - top + oy + 1)); A.px(ctx, x + i * 5, yy, 1, 10, e.pal.l); } A.px(ctx, b.x + ox - 4, b.y + oy - 2, b.w + 8, 2, e.pal.c); if (e.hitDone) A.px(ctx, b.x + ox - 8, b.y + b.h + oy - 1, b.w + 16, 1, e.pal.l); }); },
      },
      {
        name: 'Levitate', dmg: 14, cd: 7, mp: 6, kind: 'custom', life: 1.4,
        desc: 'Turn gravity off in front of you. Enemies float up helplessly... then it comes back on.',
        spawn(e, g, A) { H.at(e, A, 46); e.gy = H.floor(A, e.x); e.ts = H.nearby(A, e.x, e.gy - 10, 46 * H.sc(e)).map((o) => o.t); for (const t of e.ts) holdStun(t, 1.2); A.sfx('hover'); },
        update(e, dt, g, A) { for (const t of e.ts) { if (t.dead || t.tutorial) continue; if (e.t < 0.8) { t.vy = -70; t.vx *= 0.9; } else t.vy = 520; } if (e.t > 1 && !e.drop) { e.drop = true; for (const t of e.ts) if (!t.dead) A.damage(e, t, 1, 0.2); A.sfx('crash'); A.shake(3, 0.2); } },
        draw(e, ctx, ox, oy, A) { const R = 46 * H.sc(e), x = e.x + ox, gy = e.gy + oy; A.alpha(ctx, A.fade(e, 0.1, 0.3) * 0.6, () => { for (let i = 0; i < 14; i++) { const xx = x - R + ((i * 13) % (R * 2)), yy = gy - ((e.t * 40 + i * 9) % 60); A.px(ctx, xx, yy, 1, 3, e.pal.l); } A.px(ctx, x - R, gy - 1, R * 2, 1, e.pal.c); }); },
      },
      {
        name: 'Inversion', dmg: 26, cd: 8, mp: 7, kind: 'custom', life: 1.4,
        desc: 'Flip gravity upside down for the enemies in front of you. They fall UP into the ceiling. Then back down.',
        spawn(e, g, A) { H.at(e, A, 4); e.ts = H.nearby(A, e.x, e.y, 110 * H.sc(e)).filter((o) => (o.c.x - e.x) * e.dir > -6).map((o) => o.t); for (const t of e.ts) holdStun(t, 1.3); A.sfx('whoosh'); },
        update(e, dt, g, A) {
          for (const t of e.ts) { if (t.dead || t.tutorial) continue; t.vy = e.t < 0.6 ? -420 : 480; t.vx = 0; }
          if (e.t > 0.45 && !e.up1) { e.up1 = true; for (const t of e.ts) if (!t.dead) A.damage(e, t, 0.5, 0); A.sfx('crash'); }
          if (e.t > 1 && !e.dn) { e.dn = true; for (const t of e.ts) if (!t.dead) A.damage(e, t, 0.7, 0.2); A.sfx('crash'); A.shake(4, 0.25); }
        },
        draw(e, ctx, ox, oy, A) { for (const t of e.ts) if (!t.dead) { const c = A.center(t); const up = e.t < 0.6; for (let i = 0; i < 3; i++) A.tri(ctx, c.x + ox - 6 + i * 6, c.y + oy + (up ? -14 : 14), 4, up ? 4 : -4, e.pal.l); } },
      },
      {
        name: 'Gravity Bomb', dmg: 10, cd: 8, mp: 6, kind: 'custom', life: 3,
        desc: 'Plant a dense orb. It pulses, slamming everything near it into the ground over and over.',
        spawn(e, g, A) { H.at(e, A, 36); const ax = A.aim(e, 110); if (ax !== null) e.x = ax; e.gy = H.floor(A, e.x); e.pt = 0.4; A.sfx('hitMetal'); },
        update(e, dt, g, A) { e.pt -= dt; if (e.pt <= 0) { e.pt = e.up ? 0.5 : 0.7; e.pulse = e.t; A.hitR(e, e.x, e.gy - 6, 40 * H.sc(e), { kb: 0, onHit(t) { if (!t.tutorial) t.vy = 300; if (t.applyStatus) t.applyStatus('heavy', e.potency); } }); e.hit.clear(); A.sfx('thud', { minGap: 0.1 }); A.shake(1.5, 0.1); } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, gy = e.gy + oy - 6; A.alpha(ctx, A.fade(e, 0.1, 0.3), () => { A.disc(ctx, x, gy, 5, '#1a1428', e.pal.c); if (e.pulse !== undefined) { const k = (e.t - e.pulse) / 0.4; if (k < 1) A.alpha(ctx, 1 - k, () => A.ring(ctx, x, gy, 6 + k * 34 * H.sc(e), e.pal.l, (6 + k * 34 * H.sc(e)) * 0.4, 1)); } }); },
      },
      {
        name: 'Event Horizon', dmg: 5, cd: 11, mp: 7, kind: 'custom', life: 4,
        desc: 'A ring of crushing gravity surrounds you. Enemies inside slow to a crawl and get squished.',
        spawn(e, g, A) { A.sfx('rumble', { dur: 0.6 }); },
        update(e, dt, g, A) { const p = A.p, R = 50 * H.sc(e); e.x = p.cx; e.y = p.y + 10; A.tickR(e, e.x, e.y, R, 0.4, { kb: 0 }); for (const o of H.nearby(A, e.x, e.y, R)) { if (o.t.applyStatus && !o.t.status.heavy) o.t.applyStatus('heavy', e.potency); if (!o.t.tutorial) o.t.vx *= 1 - dt * 6; } },
        draw(e, ctx, ox, oy, A) { const R = 50 * H.sc(e), x = e.x + ox, y = e.y + oy; A.alpha(ctx, A.fade(e, 0.3, 0.4), () => { WARP(ctx, A, x, y, R, e.t, e.pal.c); A.ring(ctx, x, y, R, e.pal.l, R * 0.35); for (let i = 0; i < 5; i++) { const a = e.t * 2 + i * 1.26; ROCK(ctx, A, x + Math.cos(a) * R * 0.8, y + Math.sin(a) * R * 0.28, 1); } }); },
      },
    ],
    ult: {
      name: 'Gravity Singularity', dmg: 22,
      desc: 'Open a singularity above the battlefield. Everything gets sucked into it and crushed, then you dive in and strike the collapse.',
      charge: {
        pose: 'raise', lift: 12,
        draw(ctx, x, y, k, t, A, P) {
          const sx = x + 4, sy = y - 32; WARP(ctx, A, sx, sy, 10 + k * 34, t, P.c);
          A.disc(ctx, sx, sy, Math.round(1 + k * 6), '#000000'); A.ring(ctx, sx, sy, 2 + k * 6, P.l);
          for (let i = 0; i < 10; i++) { const a = i * 0.63, d = 50 * (1 - ((t + i / 10) % 1) * k); ROCK(ctx, A, sx + Math.cos(a + t) * d, y + 14 - (1 - d / 50) * 46, 1 + (i % 2)); }
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3,
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 300).map((o) => o.t); const c = e.ts[0] ? A.center(e.ts[0]) : { x: p.cx + e.dir * 90, y: p.y }; e.cx = c.x; e.cy = c.y - 40; for (const t of e.ts) holdStun(t, 2.4); e.rocks = []; for (let i = 0; i < 24; i++) e.rocks.push({ x: e.cx + A.rnd(-200, 200), y: A.ground(e.cx, p.y + 2) - 2, s: 1 + (i % 3) }); A.sfx('rumble', { dur: 2.4 }); A.shake(3, 2); },
          update(e, dt, g, A) {
            if (e.t < 1.8) { for (const t of e.ts) if (!t.dead && !t.tutorial) { const c = A.center(t); t.vx = (e.cx - c.x) * 3; t.vy = (e.cy - c.y) * 3; } for (const r of e.rocks) { r.x = U.approach(r.x, e.cx, 1.5, dt); r.y = U.approach(r.y, e.cy, 1.5, dt); } A.tickR(e, e.cx, e.cy, 30, 0.2, { mult: 0.4, kb: 0, onHit(t) { if (t.applyStatus) t.applyStatus('heavy', e.potency); } }); }
            if (e.t > 1.8 && !e.strike) { e.strike = true; const nx = e.cx - p.w / 2, ny = e.cy - p.h / 2; if (!Phys().overlapsSolid(A.g.level, nx, ny, p.w, p.h)) { p.x = nx; p.y = ny; } A.blast(e, e.cx, e.cy, 90 * H.sc(e), { dmg: e.dmg * 4 }); A.sfx('boom'); A.flash(0.5); A.shake(10, 0.5); }
          },
          draw(e, ctx, ox, oy, A) {
            const x = e.cx + ox, y = e.cy + oy;
            if (!e.strike) { const r = Math.round(6 + e.t * 8); WARP(ctx, A, x, y, 120, e.t, e.pal.c); A.disc(ctx, x, y, r + 3, e.pal.d); A.disc(ctx, x, y, r, '#000000'); A.ring(ctx, x, y, r + 1, '#ffffff'); for (let i = 0; i < 20; i++) { const a = e.t * 6 + i * 0.31; A.px(ctx, x + Math.cos(a) * (r + 6 + (i % 4) * 3), y + Math.sin(a) * (r + 6 + (i % 4) * 3) * 0.4, 1, 1, e.pal.l); } }
            for (const r of e.rocks) if (!e.strike) ROCK(ctx, A, r.x + ox, r.y + oy, r.s);
            if (e.strike) { const k = (e.t - 1.8) / 1.2; A.alpha(ctx, 1 - k, () => { A.ring(ctx, x, y, 10 + k * 160, e.pal.c, (10 + k * 160) * 0.5, 1); A.ring(ctx, x, y, 6 + k * 120, '#ffffff', (6 + k * 120) * 0.5, 1); }); }
          },
        }, {});
      },
    },
  };

  // ==================================================================== SOUND
  const NOTE = { life: 1, update(e, dt) { e.x += e.vx * dt; e.y += e.vy * dt; e.vy -= 10 * dt; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => A.shape(ctx, 'note', e.x + ox, e.y + oy, 0, e.pal, 1, e.t)); } };
  const WAVES = (ctx, A, x, y, r, d, n, col) => { for (let i = 0; i < n; i++) A.arc(ctx, x, y, r + i * 4, d, col, 1, -0.7, 0.7); };
  K.sound = {
    status: 'deafen', fx: 'notes', block: ['Sound Barrier', 'shield'], dash: ['Sonic Boom', 'ghost'],
    m1: {
      name: 'Sonic Pulse', dmg: 7, cd: 0.38, kind: 'custom', life: 0.01,
      desc: 'Fire a pulse of sound. It goes ))) and then it goes OW.',
      spawn(e, g, A) { H.at(e, A, 8, -1); A.sfx('tick', { value: 110, minGap: 0.04 }); A.spawn(e, H.proj((b, ctx, ox, oy, A) => WAVES(ctx, A, b.x + ox - Math.sign(b.vx) * 6, b.y + oy, 4 + b.t * 10, Math.sign(b.vx), b.up ? 3 : 2, b.pal.c), { life: 0.6, r: 6, pierce: true }), { vx: e.dir * 280 }); },
    },
    s: [
      {
        name: 'Sonic Clap', dmg: 14, cd: 5, mp: 5, kind: 'custom', life: 0.4,
        desc: 'Clap so hard it makes a shockwave. Your hands sting. Theirs too, somehow.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx + p.facing * 6; e.y = p.y + 9; A.sfx('clap'); A.sfx('shockwave'); A.hitR(e, e.x, e.y, 46 * H.sc(e), { kb: 1.6 }); A.shake(2, 0.15); },
        draw(e, ctx, ox, oy, A) { const k = e.t / e.life, R = 46 * H.sc(e) * k, x = e.x + ox, y = e.y + oy; A.alpha(ctx, 1 - k, () => { A.ring(ctx, x, y, R, e.pal.c); A.ring(ctx, x, y, R * 0.7, '#ffffff'); A.ring(ctx, x, y, R * 0.4, e.pal.l); A.text(ctx, 'CLAP', x, y - 20 - k * 10, '#ffffff'); }); },
      },
      {
        name: 'Bass Drop', dmg: 9, cd: 9, mp: 7, kind: 'custom', life: 3.2,
        desc: 'A giant speaker falls from the sky and drops the bass. Every beat hits.',
        spawn(e, g, A) { H.at(e, A, 40); e.gy = H.floor(A, e.x); e.top = H.sky(A, e.x, A.p.y - 10); A.sfx('whoosh'); e.bt = 0.5; },
        update(e, dt, g, A) {
          if (e.t > 0.3 && !e.land) { e.land = true; A.hitR(e, e.x, e.gy - 10, 16, { mult: 1.5 }); e.hit.clear(); A.sfx('crash'); A.shake(3, 0.2); }
          if (e.land) { e.bt -= dt; if (e.bt <= 0) { e.bt = 0.42; e.beat = e.t; A.hitR(e, e.x, e.gy - 10, 54 * H.sc(e), { kb: 0.8 }); e.hit.clear(); A.sfx('thud', { minGap: 0.1 }); A.shake(2, 0.1); } }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, gy = e.gy + oy, y = e.land ? gy : U.lerp(e.top + oy, gy, (e.t / 0.3) * (e.t / 0.3)), b = e.beat !== undefined ? Math.max(0, 1 - (e.t - e.beat) / 0.15) : 0;
          A.px(ctx, x - 9, y - 26, 18, 26, '#2a2a30'); A.px(ctx, x - 9, y - 26, 18, 1, '#5a5a60');
          A.disc(ctx, x, y - 9, Math.round(5 + b), '#1a1a1e', '#4a4a50'); A.disc(ctx, x, y - 9, 2, e.pal.c); A.disc(ctx, x, y - 21, 2, '#4a4a50');
          if (e.beat !== undefined) { const k = (e.t - e.beat) / 0.4; if (k < 1) A.alpha(ctx, 1 - k, () => { A.ring(ctx, x, y - 10, 10 + k * 46 * H.sc(e), e.pal.c, (10 + k * 46 * H.sc(e)) * 0.5); }); }
          if (e.land && Math.floor(e.t * 5) % 2) A.text(ctx, 'WUB', x + 14, y - 32, e.pal.l);
        },
      },
      {
        name: 'Echo Bounce', dmg: 12, cd: 6, mp: 6, kind: 'custom', life: 2,
        desc: 'A ball of sound that bounces from enemy to enemy, echoing louder every time.',
        spawn(e, g, A) { H.at(e, A, 8, -1); e.cur = A.near(e.x, e.y, 170); e.n = 0; e.max = e.up ? 6 : 4; e.done = new Set(); A.sfx('pop'); if (!e.cur) e.vx = e.dir * 200; },
        update(e, dt, g, A) {
          if (!e.cur) { e.x += (e.vx || 0) * dt; if (A.solid(e.x, e.y)) e.dead = true; return; }
          if (e.cur.dead) { e.dead = true; return; }
          const c = A.center(e.cur), a = Math.atan2(c.y - e.y, c.x - e.x); e.x += Math.cos(a) * 300 * dt; e.y += Math.sin(a) * 300 * dt;
          if (Math.hypot(c.x - e.x, c.y - e.y) < 6) { A.damage(e, e.cur, 1 + e.n * 0.25, 0.3); A.sfx('tick', { value: 80 + e.n * 15 }); e.n++; e.done.add(e.cur.uid); const nx = A.near(e.x, e.y, 120, e.done) || (e.done.size > 1 ? A.near(e.x, e.y, 120, new Set([e.cur.uid])) : null); if (!nx || e.n >= e.max) { e.dead = true; return; } e.cur = nx; }
        },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, r = 3 + (e.n || 0); A.disc(ctx, x, y, 2, '#ffffff'); A.ring(ctx, x, y, r + Math.sin(e.t * 30), e.pal.c); A.ring(ctx, x, y, r + 3, e.pal.l); },
      },
      {
        name: 'Siren Song', dmg: 4, cd: 10, mp: 7, kind: 'custom', life: 3,
        desc: 'Sing a hypnotic song. Enemies stop, sway, and slowly walk towards you, entranced.',
        spawn(e, g, A) { A.sfx('star'); },
        update(e, dt, g, A) {
          const p = A.p, R = 110 * H.sc(e); e.x = p.cx; e.y = p.y + 4;
          for (const o of H.nearby(A, e.x, e.y, R)) { pull(o.t, e.x, 30, dt, 3); if (o.t.applyStatus && !o.t.status.deafen) o.t.applyStatus('deafen', e.potency); }
          A.tickR(e, e.x, e.y, R, 0.5, { kb: 0 });
          if (Math.random() < dt * 8) A.spawn(e, NOTE, { x: e.x + A.rnd(-6, 6), y: e.y - 6, vx: A.rnd(-50, 50), vy: -30 });
        },
        draw(e, ctx, ox, oy, A) { const R = 110 * H.sc(e); A.alpha(ctx, A.fade(e, 0.2, 0.4) * 0.35, () => { for (let i = 0; i < 3; i++) { const r = R * ((e.t * 0.8 + i / 3) % 1); A.ring(ctx, e.x + ox, e.y + oy, r, e.pal.c, r * 0.4, 2); } }); },
      },
      {
        name: 'Scream', dmg: 6, cd: 7, mp: 6, kind: 'custom', life: 0.9,
        desc: 'Just... scream. Really loud. The letters are a weapon now.',
        spawn(e, g, A) { H.at(e, A, 6, -4); A.sfx('screech'); e.ls = []; for (let i = 0; i < 8; i++) e.ls.push({ x: e.x, y: e.y + A.rnd(-8, 8), vx: e.dir * A.rnd(160, 260), vy: A.rnd(-30, 30), d: i * 0.06, ch: i === 7 ? '!' : 'A' }); },
        update(e, dt, g, A) {
          const p = A.p; p.vx *= 0.5;
          for (const l of e.ls) { if (e.t < l.d) continue; l.x += l.vx * dt; l.y += l.vy * dt; const hit = A.targets().find((t) => Phys().rectsOverlap(t.box, { x: l.x - 4, y: l.y - 4, w: 8, h: 8 })); if (hit && !l.hitIds) { l.hitIds = true; A.damage(e, hit, 1, 0.5); if (hit.applyStatus) hit.applyStatus('deafen', e.potency); } }
        },
        draw(e, ctx, ox, oy, A) { for (const l of e.ls) if (e.t >= l.d) { const s = 1 + Math.min(2, (e.t - l.d) * 4) * (e.up ? 1.3 : 1); ERX.Font.draw(ctx, l.ch, Math.round(l.x + ox), Math.round(l.y + oy - 4 * s), { color: e.pal.c, outline: '#120c1a', scale: Math.round(s), align: 'center' }); } },
      },
    ],
    ult: {
      name: 'World Shatter', dmg: 20,
      desc: 'Take one huge breath and release a sound so loud the world itself cracks like glass, then shatters.',
      charge: {
        pose: 'raiseBoth', lift: 4,
        draw(ctx, x, y, k, t, A, P) {
          for (let i = 0; i < 5; i++) { const r = 50 * (1 - ((t * 1.4 + i / 5) % 1)); A.alpha(ctx, k * (1 - r / 60), () => A.ring(ctx, x + 2, y - 8, r, i % 2 ? P.c : '#ffffff')); }
          for (let i = 0; i < 6; i++) { const a = i * 1.05 + t, d = 40 * (1 - ((t * 1.2 + i / 6) % 1)); A.shape(ctx, 'note', x + Math.cos(a) * d, y - 8 + Math.sin(a) * d * 0.6, 0, P, 1, t); }
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 2.8, layer: 'screen',
          spawn(e) { e.x = p.cx; e.y = p.y + 4; A.sfx('screech'); A.sfx('shockwave'); A.shake(6, 1.4); e.cracks = []; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + Math.random() * 0.3, pts = [[0, 0]]; let cx = 0, cy = 0; for (let j = 0; j < 8; j++) { cx += Math.cos(a + A.rnd(-0.5, 0.5)) * 30; cy += Math.sin(a + A.rnd(-0.5, 0.5)) * 30; pts.push([cx, cy]); } e.cracks.push(pts); } },
          update(e, dt, g, A) {
            if (e.t < 1.4) A.tickR(e, e.x, e.y, 300 * Math.min(1, e.t / 0.6), 0.2, { mult: 0.5, kb: 0.4, onHit(t) { if (t.applyStatus) t.applyStatus('deafen', e.potency); } });
            if (e.t > 1.5 && !e.sh) { e.sh = true; e.hit.clear(); A.hitR(e, e.x, e.y, 300, { mult: 4, kb: 2 }); A.sfx('shatter'); A.sfx('boom'); A.flash(0.5); A.shake(10, 0.5); }
          },
          draw(e, ctx, ox, oy, A) {
            const x = e.x + ox, y = e.y + oy;
            if (e.t < 1.5) for (let i = 0; i < 6; i++) { const r = ((e.t * 260 + i * 50) % 300); A.alpha(ctx, 1 - r / 300, () => A.ring(ctx, x, y, r, i % 2 ? e.pal.c : '#ffffff', r * 0.6, 2)); }
            const ck = U.clamp(e.t / 1.4, 0, 1);
            if (!e.sh) for (const c of e.cracks) { const n = Math.ceil(ck * (c.length - 1)); for (let j = 0; j < n; j++) A.line(ctx, x + c[j][0], y + c[j][1] * 0.7, x + c[j + 1][0], y + c[j + 1][1] * 0.7, '#ffffff', 1); }
            else { const k = (e.t - 1.5) / 1.3; for (let i = 0; i < 40; i++) { const a = i * 0.9, d = k * (80 + (i * 37) % 200), s = 6 - (i % 4); A.alpha(ctx, 1 - k, () => { A.tri(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7 + k * k * 80, s * 2, s * (i % 2 ? 1 : -1), i % 3 ? e.pal.l : '#ffffff'); }); } }
          },
        }, {});
      },
    },
  };

  // ===================================================================== MIST
  const FOG = (ctx, A, x, y, r, col, a) => A.alpha(ctx, a, () => A.disc(ctx, x, y, Math.round(r), col));
  const PUFF = { life: 1, update(e, dt) { e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= 1 - dt; }, draw(e, ctx, ox, oy, A) { FOG(ctx, A, e.x + ox, e.y + oy, 3 + e.t * 6, '#dce4ec', 0.5 * (1 - e.t / e.life)); } };
  K.mist = {
    status: 'blind', fx: 'fog', block: ['Mist Veil', 'veil'], dash: ['Vanish', 'blink'],
    m1: {
      name: 'Mist Needles', dmg: 3, cd: 0.42, kind: 'custom', life: 0.15,
      desc: 'Condense the air into three thin needles of water and flick them.',
      spawn(e, g, A) { H.at(e, A, 8, -1); A.sfx('whoosh', { minGap: 0.04 }); e.n = 0; },
      update(e, dt, g, A) { const want = Math.min(3, Math.floor(e.t / 0.05) + 1); while (e.n < want) { e.n++; A.spawn(e, H.proj((b, ctx, ox, oy, A) => { A.line(ctx, b.x + ox - Math.sign(b.vx) * 6, b.y + oy, b.x + ox, b.y + oy, b.pal.l); A.px(ctx, b.x + ox, b.y + oy, 1, 1, '#ffffff'); }, { life: 0.6, r: 3 }), { x: A.p.cx + e.dir * 8, y: A.p.y + 9 + (e.n - 2) * 3, vx: e.dir * 320, dmg: e.dmg * (e.up ? 1.3 : 1) }); } },
    },
    s: [
      {
        name: 'Fog Bank', dmg: 3, cd: 8, mp: 6, kind: 'custom', life: 4,
        desc: 'Roll out a thick bank of fog. Enemies inside can\'t see a thing.',
        spawn(e, g, A) { H.at(e, A, 50); e.gy = H.floor(A, e.x); A.sfx('whoosh'); },
        update(e, dt, g, A) { const R = 54 * H.sc(e); A.tick(e, { x: e.x - R, y: e.gy - R, w: R * 2, h: R }, 0.5, { kb: 0 }); },
        draw(e, ctx, ox, oy, A) { const R = 54 * H.sc(e), x = e.x + ox, gy = e.gy + oy, f = A.fade(e, 0.4, 0.6); for (let i = 0; i < 14; i++) FOG(ctx, A, x + Math.sin(i * 2.7 + e.t * 0.6) * R * 0.85, gy - 6 - ((i * 7) % (R * 0.8)), 8 + (i % 4) * 2, i % 3 ? '#dce4ec' : '#b8c4d0', 0.5 * f); },
      },
      {
        name: 'Mist Lance', dmg: 20, cd: 5, mp: 5, kind: 'custom', life: 1,
        desc: 'Squeeze the mist into a spear of vapour. When it hits, it bursts back into blinding fog.',
        spawn(e, g, A) { H.at(e, A, 8, -1); e.vx = e.dir * 280; A.sfx('whoosh'); },
        update(e, dt, g, A) { const r = H.fly(e, dt, A, { r: 4 }); if (r) { for (let i = 0; i < 12; i++) A.spawn(e, PUFF, { x: e.x, y: e.y, vx: A.rnd(-70, 70), vy: A.rnd(-50, 20) }); for (const o of H.nearby(A, e.x, e.y, 30)) if (o.t.applyStatus) o.t.applyStatus('blind', e.potency); e.dead = true; } if (Math.random() < dt * 25) A.spawn(e, PUFF, { x: e.x, y: e.y, vx: 0, vy: -10, life: 0.4 }); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, d = e.dir, L = 18 * H.sc(e); A.alpha(ctx, 0.8, () => { A.line(ctx, x - d * L, y, x, y, '#b8c4d0', 3); A.line(ctx, x - d * L, y, x, y, '#ffffff', 1); }); A.tri(ctx, x + d * 2, y + 2, 4, 0, '#ffffff'); },
      },
      {
        name: 'Haze Step', dmg: 10, cd: 5, mp: 4, kind: 'custom', life: 0.6,
        desc: 'Dissolve into mist and reappear a little way ahead. Anything you drift through is blinded.',
        spawn(e, g, A) {
          const p = A.p; e.dir = p.facing; e.fx = p.cx; e.f = p.feet; const D = 70 * H.sc(e);
          let nx = p.x; for (let d = D; d > 0; d -= 4) { const tx = p.x + e.dir * d; if (!Phys().overlapsSolid(g.level, tx, p.y, p.w, p.h)) { nx = tx; break; } }
          const x0 = Math.min(p.x, nx), x1 = Math.max(p.x, nx) + p.w; A.hit(e, { x: x0, y: p.y, w: x1 - x0, h: p.h }, { kb: 0.3, onHit(t) { if (t.applyStatus) t.applyStatus('blind', e.potency); } });
          p.x = nx; p.dashGrace = 0.3; e.tx = p.cx; A.sfx('whoosh');
          for (let i = 0; i < 10; i++) A.spawn(e, PUFF, { x: U.lerp(e.fx, e.tx, i / 9), y: e.f - 10 + A.rnd(-5, 5), vx: 0, vy: -8 });
        },
        draw(e, ctx, ox, oy, A) { const k = e.t / e.life; A.alpha(ctx, 0.5 * (1 - k), () => H.drawGhost(ctx, A, 'idle', e.fx + ox, e.f + oy, e.dir, '#dce4ec')); },
      },
      {
        name: 'Dew Mines', dmg: 14, cd: 8, mp: 6, kind: 'custom', life: 6,
        desc: 'Leave a few floating droplets in the air. They pop into freezing mist when touched.',
        spawn(e, g, A) { const p = A.p; e.drops = []; for (let i = 0; i < (e.up ? 5 : 3); i++) e.drops.push({ x: p.cx + p.facing * (24 + i * 22), y: p.y + 4 + (i % 2) * 8 }); A.sfx('pop'); },
        update(e, dt, g, A) { for (const d of e.drops) { if (d.gone) continue; const t = A.targets().find((t) => Phys().rectsOverlap(t.box, { x: d.x - 5, y: d.y - 5, w: 10, h: 10 })); if (t) { d.gone = true; A.damage(e, t, 1, 0.3); if (t.applyStatus) t.applyStatus('chill', e.potency); A.sfx('pop'); for (let i = 0; i < 8; i++) A.spawn(e, PUFF, { x: d.x, y: d.y, vx: A.rnd(-60, 60), vy: A.rnd(-60, 30) }); } } if (e.drops.every((d) => d.gone)) e.dead = true; },
        draw(e, ctx, ox, oy, A) { for (const d of e.drops) if (!d.gone) { const y = d.y + oy + Math.sin(e.t * 3 + d.x) * 2; A.disc(ctx, d.x + ox, y, 2, '#b8e0ff', '#ffffff'); A.alpha(ctx, 0.3, () => A.ring(ctx, d.x + ox, y, 4, '#dce4ec')); } },
      },
      {
        name: 'Condensation', dmg: 30, cd: 8, mp: 7, kind: 'custom', life: 1.3,
        desc: 'Mist swirls around the nearest enemy, then condenses all at once into a crushing ball of water.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 160); e.tg = t; if (!t) { e.dead = true; return; } holdStun(t, 1); A.sfx('whoosh'); },
        update(e, dt, g, A) { if (!e.tg || e.tg.dead) { e.dead = true; return; } if (e.t > 0.8 && !e.pop) { e.pop = true; A.damage(e, e.tg, 1, 0.5); if (e.tg.applyStatus) e.tg.applyStatus('wet', 0); A.sfx('crash'); } },
        draw(e, ctx, ox, oy, A) {
          if (!e.tg) return; const c = A.center(e.tg), x = c.x + ox, y = c.y + oy;
          if (!e.pop) { const k = e.t / 0.8, r = 30 * (1 - k * k) + 8; for (let i = 0; i < 16; i++) { const a = e.t * 6 + i * 0.4; FOG(ctx, A, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, 4, '#dce4ec', 0.5); } if (k > 0.6) A.alpha(ctx, (k - 0.6) / 0.4, () => A.disc(ctx, x, y, 10, '#3aa0ff', '#a8e0ff')); }
          else { const k = (e.t - 0.8) / 0.5; A.alpha(ctx, 1 - k, () => { A.disc(ctx, x, y, Math.round(10 - k * 6), '#3aa0ff', '#a8e0ff'); for (let i = 0; i < 10; i++) { const a = i * 0.63; A.px(ctx, x + Math.cos(a) * k * 24, y + Math.sin(a) * k * 24, 2, 2, '#a8e0ff'); } }); }
        },
      },
    ],
    ult: {
      name: 'Phantom Execution', dmg: 12,
      desc: 'Fog swallows the whole battlefield. A colossal serpent made of mist slithers through every enemy, then rears up and crashes down for the execution.',
      charge: {
        pose: 'raiseBoth', lift: 0,
        draw(ctx, x, y, k, t, A, P) {
          for (let i = 0; i < 18; i++) { const a = t * 1.5 + i * 0.35, r = 10 + i * 2 * k; FOG(ctx, A, x + Math.cos(a) * r, y + 8 + Math.sin(a) * r * 0.4 - i * k, 5, i % 3 ? '#dce4ec' : '#b8c4d0', 0.55); }
          if (k > 0.5) { A.px(ctx, x - 9, y - 30, 2, 2, P.c); A.px(ctx, x + 7, y - 30, 2, 2, P.c); }
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.2, layer: 'screen',
          spawn(e) {
            e.ts = H.nearby(A, p.cx, p.y, 300).map((o) => o.t);
            const pts = [{ x: p.cx - e.dir * 40, y: p.y }].concat(e.ts.map((t) => A.center(t))); if (pts.length < 2) pts.push({ x: p.cx + e.dir * 140, y: p.y + 6 });
            e.path = pts; e.trail = []; A.sfx('whoosh'); A.sfx('rumble', { dur: 2.5 });
          },
          update(e, dt, g, A) {
            const n = e.path.length - 1, q = U.clamp(e.t / 1.6, 0, 1) * n, i = Math.min(n - 1, Math.floor(q)), f = q - i, a = e.path[i], b = e.path[i + 1];
            if (e.t < 1.6) { e.hx = U.lerp(a.x, b.x, f); e.hy = U.lerp(a.y, b.y, f) + Math.sin(e.t * 12) * 10; e.trail.unshift({ x: e.hx, y: e.hy }); if (e.trail.length > 40) e.trail.pop(); A.hitR(e, e.hx, e.hy, 14, { mult: 1.5, kb: 0.4, onHit(t) { if (t.applyStatus) t.applyStatus('blind', e.potency); } }); }
            const last = e.path[e.path.length - 1];
            if (e.t > 1.6 && e.t < 2.1) { e.hx = last.x; e.hy = last.y - 70 * Math.sin(((e.t - 1.6) / 0.5) * Math.PI / 2); e.trail.unshift({ x: e.hx, y: e.hy }); e.trail.pop(); }
            if (e.t > 2.1 && !e.exe) { e.exe = true; e.hit.clear(); A.blast(e, last.x, last.y, 60 * H.sc(e), { dmg: e.dmg * 6 }); A.sfx('crash'); A.flash(0.4); A.shake(9, 0.5); }
          },
          draw(e, ctx, ox, oy, A) {
            const fog = e.t < 2.4 ? Math.min(1, e.t * 3) * 0.55 : Math.max(0, 0.55 - (e.t - 2.4) * 0.7);
            A.alpha(ctx, fog, () => A.px(ctx, -10, -10, 2000, 2000, '#c8d4e0'));
            if (!e.exe) {
              e.trail.forEach((s, i) => { const r = Math.max(2, 9 - i * 0.18); FOG(ctx, A, s.x + ox, s.y + oy, r, i % 4 ? '#f0f4f8' : '#b8c4d0', 0.8 * (1 - i / 44)); });
              if (e.hx !== undefined) { const x = e.hx + ox, y = e.hy + oy; FOG(ctx, A, x, y, 11, '#ffffff', 0.9); A.px(ctx, x - 5, y - 3, 3, 2, e.pal.c); A.px(ctx, x + 3, y - 3, 3, 2, e.pal.c); A.px(ctx, x - 4, y + 5, 8, 1, '#8a9aa8'); }
            } else { const k = (e.t - 2.1) / 1.1, last = e.path[e.path.length - 1]; A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 20; i++) { const a = i * 0.31; FOG(ctx, A, last.x + ox + Math.cos(a) * k * 90, last.y + oy + Math.sin(a) * k * 40, 8, '#f0f4f8', 0.7); } }); }
          },
        }, {});
      },
    },
  };

  // =================================================================== SPIRIT
  const GHOST = (ctx, A, x, y, s, col, t) => { const w = 4 * s, h = 6 * s; A.disc(ctx, x, y - h / 2, Math.round(w), col); A.px(ctx, x - w, y - h / 2, w * 2, h, col); for (let i = 0; i < 3; i++) A.px(ctx, x - w + i * (w * 2 / 3) + (Math.floor(t * 8 + i) % 2), y + h / 2, Math.max(1, w * 2 / 3 - 1), 2, col); A.px(ctx, x - w / 2 - 1, y - h / 2, 1 * Math.max(1, s), 2 * Math.max(1, s), '#120c1a'); A.px(ctx, x + w / 2, y - h / 2, 1 * Math.max(1, s), 2 * Math.max(1, s), '#120c1a'); };
  const WISP = (b, ctx, ox, oy, A) => { A.disc(ctx, b.x + ox, b.y + oy, 2, b.pal.l, '#ffffff'); A.alpha(ctx, 0.5, () => A.px(ctx, b.x + ox - b.vx * 0.03 - 1, b.y + oy - b.vy * 0.03 - 1, 2, 2, b.pal.c)); };
  K.spirit = {
    status: 'haunt', fx: 'souls', block: ['Ghost Guard', 'veil'], dash: ['Ghost Walk', 'blink'],
    m1: {
      name: 'Spirit Palm', dmg: 9, cd: 0.45, kind: 'custom', life: 0.3,
      desc: 'Thrust your palm. A big ghostly hand shoves forward with it.',
      spawn(e, g, A) { A.sfx('whoosh', { minGap: 0.04 }); },
      update(e, dt, g, A) { H.at(e, A, 0); const k = Math.min(1, e.t / 0.12), L = 30 * H.sc(e) * k; e.L = L; A.hit(e, { x: e.dir > 0 ? e.x : e.x - L - 6, y: e.y - 9, w: L + 6, h: 18 }, { kb: 1.4 }); },
      draw(e, ctx, ox, oy, A) {
        const x = e.x + ox + e.dir * (e.L || 0), y = e.y + oy, s = H.sc(e), f = 1 - Math.max(0, e.t - 0.15) / 0.15;
        A.alpha(ctx, 0.75 * f, () => { A.px(ctx, x - (e.dir > 0 ? 4 : 0) * s, y - 6 * s, 4 * s, 12 * s, e.pal.c); for (let i = 0; i < 4; i++) A.px(ctx, x + e.dir * 4 * s - (e.dir > 0 ? 0 : 4 * s), y - 6 * s + i * 3 * s, 4 * s, 2 * s, e.pal.l); A.px(ctx, x - e.dir * 2 * s, y - 8 * s, 2 * s, 4 * s, e.pal.l); });
        A.alpha(ctx, 0.3 * f, () => A.line(ctx, e.x + ox, y, x, y, e.pal.c, 4));
      },
    },
    s: [
      {
        name: 'Wisp Swarm', dmg: 5, cd: 6, mp: 6, kind: 'custom', life: 0.01,
        desc: 'Release a swarm of little spirit wisps that hunt down enemies on their own.',
        spawn(e, g, A) { H.at(e, A, 4, -4); A.sfx('star'); for (let i = 0; i < (e.up ? 8 : 6); i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.4; A.spawn(e, H.proj(WISP, { life: 2, r: 3, homing: 8, range: 220 }), { vx: Math.cos(a) * 120 + e.dir * 40, vy: Math.sin(a) * 120 }); } },
      },
      {
        name: 'Possession', dmg: 8, cd: 10, mp: 7, kind: 'custom', life: 3,
        desc: 'Send your spirit into the nearest enemy. It flails around, hurts itself, and attacks its friends.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 160); e.tg = t; if (!t) { e.dead = true; return; } if (t.applyStatus) { t.applyStatus('confuse', e.potency); if (t.status.confuse) t.status.confuse.t = e.life; } A.sfx('surge'); },
        update(e, dt, g, A) { if (!e.tg || e.tg.dead) { e.dead = true; return; } e.pt = (e.pt || 0) - dt; if (e.pt <= 0) { e.pt = 0.5; A.damage(e, e.tg, 1, 0); const c = A.center(e.tg); for (const o of H.nearby(A, c.x, c.y, 40)) if (o.t !== e.tg) A.damage(e, o.t, 1, 0.5); } },
        draw(e, ctx, ox, oy, A) { if (!e.tg || e.tg.dead) return; const c = A.center(e.tg), b = e.tg.box; A.alpha(ctx, 0.5 + 0.2 * Math.sin(e.t * 10), () => GHOST(ctx, A, c.x + ox + Math.sin(e.t * 7) * 2, b.y + oy - 2, 1, e.pal.c, e.t)); },
      },
      {
        name: 'Spirit Totem', dmg: 6, cd: 12, mp: 7, kind: 'custom', life: 6,
        desc: 'Plant a totem of the ancestors. It heals you when you\'re close and zaps enemies with spirit bolts.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx; e.gy = p.feet; e.st = 0.5; e.ht = 0; A.sfx('crash'); },
        update(e, dt, g, A) {
          const p = A.p; e.ht -= dt; if (e.ht <= 0 && Math.abs(p.cx - e.x) < 40) { e.ht = 0.8; if (p.hp < p.maxHp) { const n = e.up ? 4 : 3; p.hp = Math.min(p.maxHp, p.hp + n); A.g.floatText(p.cx, p.y - 6, '+' + n, '#7af0a0'); } }
          e.st -= dt; if (e.st <= 0) { const t = A.near(e.x, e.gy - 20, 150); e.st = t ? 0.7 : 0.2; if (t) { const c = A.center(t), a = Math.atan2(c.y - (e.gy - 22), c.x - e.x); A.spawn(e, H.proj(WISP, { life: 1, r: 3, homing: 4 }), { x: e.x, y: e.gy - 22, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200 }); } }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, gy = e.gy + oy, k = Math.min(1, e.t / 0.3), h = 24 * k;
          A.alpha(ctx, A.fade(e, 0.05, 0.4), () => { A.px(ctx, x - 3, gy - h, 6, h, '#7a5a3a'); for (let i = 0; i < 3; i++) { A.px(ctx, x - 4, gy - h + i * 8, 8, 2, '#5a3a2a'); A.px(ctx, x - 2, gy - h + 3 + i * 8, 1, 1, e.pal.l); A.px(ctx, x + 1, gy - h + 3 + i * 8, 1, 1, e.pal.l); } A.px(ctx, x - 6, gy - h + 1, 12, 1, '#5a3a2a'); A.alpha(ctx, 0.25 + 0.15 * Math.sin(e.t * 4), () => A.ring(ctx, x, gy - 2, 40, e.pal.c, 5)); });
        },
      },
      {
        name: 'Spirit Chains', dmg: 12, cd: 8, mp: 6, kind: 'custom', life: 2,
        desc: 'Ghostly chains burst from the ground and bind up to three enemies in place.',
        spawn(e, g, A) { e.ts = H.nearby(A, A.p.cx, A.p.y, 150).slice(0, e.up ? 4 : 3).map((o) => o.t); if (!e.ts.length) { e.dead = true; return; } for (const t of e.ts) { A.damage(e, t, 1, 0); holdStun(t, e.up ? 2 : 1.5); } A.sfx('hitMetal'); },
        draw(e, ctx, ox, oy, A) { const f = A.fade(e, 0.1, 0.4); for (const t of e.ts) if (!t.dead) { const b = t.box, c = A.center(t), gy = b.y + b.h + oy; A.alpha(ctx, f * 0.85, () => { for (const s of [-1, 1]) { const x0 = c.x + ox + s * 14; for (let i = 0; i <= 8; i++) { const q = i / 8; A.ring(ctx, U.lerp(x0, c.x + ox, q), U.lerp(gy, c.y + oy, q), 1.5, i % 2 ? e.pal.c : e.pal.l, 1); } } A.px(ctx, b.x + ox - 1, c.y + oy, b.w + 2, 1, e.pal.l); }); } },
      },
      {
        name: 'Spirit Bomb', dmg: 36, cd: 9, mp: 8, kind: 'custom', life: 2,
        desc: 'Gather spirit energy from all around into a big glowing orb above your head, then throw it.',
        spawn(e, g, A) { A.sfx('energyCharge'); },
        update(e, dt, g, A) {
          const p = A.p;
          if (e.t < 0.6) { e.x = p.cx; e.y = p.y - 14; return; }
          if (!e.thrown) { e.thrown = true; e.dir = p.facing; e.vx = e.dir * 170; e.vy = 30; A.sfx('whoosh'); }
          e.x += e.vx * dt; e.y += e.vy * dt;
          const touch = A.targets().some((t) => Phys().rectsOverlap(t.box, { x: e.x - 8, y: e.y - 8, w: 16, h: 16 }));
          if (touch || A.solid(e.x, e.y) || e.t > 1.9) { A.blast(e, e.x, e.y, 46 * H.sc(e)); e.dead = true; }
        },
        draw(e, ctx, ox, oy, A) { const k = Math.min(1, e.t / 0.6), r = Math.round((3 + k * 7) * H.sc(e)), x = e.x + ox, y = e.y + oy; A.glow(ctx, x, y, r + 3, e.pal.c, 0.3); A.disc(ctx, x, y, r, e.pal.c, '#ffffff'); if (e.t < 0.6) for (let i = 0; i < 8; i++) { const a = i * 0.8 + e.t * 3, d = 40 * (1 - ((e.t * 2 + i / 8) % 1)); A.px(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 2, 2, e.pal.l); } },
      },
    ],
    ult: {
      name: 'Soul Army', dmg: 12,
      desc: 'Call up an army of spirit warriors from the ground. They charge across the battlefield and trample everything in their way.',
      charge: {
        pose: 'raiseBoth', lift: 0,
        draw(ctx, x, y, k, t, A, P) {
          for (let i = 0; i < 8; i++) { const sx = x - 40 + i * 11 + (i >= 4 ? 4 : -4), rise = U.clamp(k * 2 - i * 0.12, 0, 1); A.alpha(ctx, 0.75 * rise, () => GHOST(ctx, A, sx, y + 14 - rise * 14 - (i % 2) * 4, 1, i % 2 ? P.c : P.l, t + i)); }
          A.alpha(ctx, 0.3 * k, () => A.ring(ctx, x, y + 14, 46, P.c, 6));
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 2.8,
          spawn(e) { e.sold = []; for (let i = 0; i < 14; i++) e.sold.push({ x: p.cx - e.dir * (20 + (i % 7) * 14), y: p.feet - 4 - Math.floor(i / 7) * 10, sp: A.rnd(220, 280), ph: Math.random() * 6 }); A.sfx('surge'); A.sfx('rumble', { dur: 2 }); A.shake(2, 2.2); },
          update(e, dt, g, A) { for (const s of e.sold) { if (e.t < 0.3) continue; s.x += e.dir * s.sp * dt; A.tick(e, { x: s.x - 8, y: s.y - 20, w: 16, h: 30 }, 0.35, { kb: 1.2, dir: e.dir, onHit(t) { if (t.applyStatus) t.applyStatus('haunt', e.potency); } }); } if (e.t > 2 && !e.fin) { e.fin = true; A.flash(0.3); A.sfx('boom'); } },
          draw(e, ctx, ox, oy, A) {
            const f = e.t > 2.2 ? 1 - (e.t - 2.2) / 0.6 : Math.min(1, e.t * 4);
            for (const s of e.sold) { const x = s.x + ox, y = s.y + oy + Math.sin(e.t * 14 + s.ph) * 2; A.alpha(ctx, 0.8 * f, () => { GHOST(ctx, A, x, y - 6, 1.5, e.pal.c, e.t + s.ph); A.line(ctx, x + e.dir * 4, y - 14, x + e.dir * 14, y - 22, '#e8f8f4', 1); A.px(ctx, x - 3, y - 18, 6, 2, e.pal.l); }); A.alpha(ctx, 0.3 * f, () => A.px(ctx, x - e.dir * 20, y - 8, 14, 1, e.pal.l)); }
          },
        }, {});
      },
    },
  };

  // ==================================================================== CHAOS
  // Chaos is the only element that mixes the others: every move borrows from them.
  const OTHERS = () => ERX.Elements.list.map((el) => el.id).filter((id) => id !== 'chaos' && ERX.Kits[id] && ERX.Kits[id].m1);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const RANDOM_ST = () => pick(['burn', 'chill', 'shock', 'poison', 'bleed', 'blind', 'confuse', 'slow', 'heavy', 'wet', 'expose', 'mark', 'doom', 'haunt', 'starstruck', 'sleep', 'deafen', 'magnetize', 'erode', 'scorch', 'sunburn', 'crystallize']);
  /** Cast another element's move (m1 or one of its skills) with that element's colours. */
  function borrow(e, g, A, which, scale) {
    const id = pick(OTHERS()), kit = ERX.Kits[id], el = ERX.Elements.get(id);
    const mv = which === 'm1' ? kit.m1 : kit.s[Math.floor(Math.random() * kit.s.length)];
    if (!mv.dmg && which !== 'm1') return borrow(e, g, A, which, scale);       // never borrow a heal/buff
    const pal = ERX.Abilities.palette(el, kit, e.up);
    ERX.Abilities.castMove(g, mv, { pal, up: e.up, potency: e.potency, status: Math.random() < 0.5 ? kit.status : RANDOM_ST(), dmg: (mv.dmg || 8) * (scale || 1) * (e.dmg / 10) });
    return { id, mv, el };
  }
  const GLITCHY = (ctx, A, x, y, w, h, t) => { for (let i = 0; i < 8; i++) { const yy = y + ((i * 11 + Math.floor(t * 40) * 3) % Math.max(1, h)); A.px(ctx, x + ((i * 5 + Math.floor(t * 30)) % 7) - 3, yy, w, 1, ERX.Abilities.toHex(ERX.Abilities.rainbowColor(t * 3 + i))); } };
  // Chaos's own beam: white, with a rainbow edge. Everything it touches gets random status effects (n of them, all different).
  const EFFECTS = () => Object.keys(ERX.Abilities.STATUS).filter((k) => k !== 'timestop' && k !== 'freeze' && k !== 'encase');
  function randomEffects(e, t, n) {
    if (!t.applyStatus || t.dead) return;
    const pool = EFFECTS();
    for (let i = 0; i < n && pool.length; i++) t.applyStatus(pool.splice(Math.floor(Math.random() * pool.length), 1)[0], e.potency || 0);
  }
  const RAINBOW = (t) => ERX.Abilities.rainbowColor(t);
  /** o: n (effects per hit), w (thickness), len (reach), speed (how fast it shoots out). */
  function chaosRay(o) {
    return {
      spawn(e, g, A) { H.at(e, A, 6, -1); e.status = null; e.len = 0; e.pal = Object.assign({}, e.pal, { c: '#ffffff', l: '#ffffff', d: '#c8c8e0' }); A.sfx('zap', { minGap: 0.04 }); },
      update(e, dt, g, A) {
        H.at(e, A, 6, -1);   // the beam stays in your hand
        if (!e.full) {
          const to = Math.min(o.len, e.len + o.speed * dt);
          for (let d = e.len; d <= to; d += 3) if (A.solid(e.x + e.dir * d, e.y)) { e.full = true; e.len = d; break; }
          if (!e.full) { e.len = to; e.full = to >= o.len; }
        }
        const w = o.w + 2;
        A.hit(e, { x: e.dir > 0 ? e.x : e.x - e.len, y: e.y - w, w: e.len, h: w * 2 }, { dir: e.dir, kb: 0.4, onHit: (t) => randomEffects(e, t, o.n) });
      },
      draw(e, ctx, ox, oy, A) {
        const k = e.t / e.life, w = Math.max(1, Math.round(o.w * (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4))), x0 = e.x + ox, y = e.y + oy, d = e.dir, L = e.len;
        A.alpha(ctx, 0.22, () => A.line(ctx, x0, y, x0 + d * L, y, '#ffffff', w + 6));   // a soft white glow
        for (let i = 0; i <= L; i += 2) {   // the rainbow edge, rippling along it
          const wob = Math.sin(i * 0.3 - e.t * 40) * 0.6;
          A.px(ctx, x0 + d * i, y - Math.ceil(w / 2) - 1 + wob, 2, 1, RAINBOW(e.t * 6 + i * 0.05));
          A.px(ctx, x0 + d * i, y + Math.floor(w / 2) + 1 - wob, 2, 1, RAINBOW(e.t * 6 + i * 0.05 + 1.5));
        }
        A.line(ctx, x0, y, x0 + d * L, y, '#ffffff', w);   // the white core
        A.disc(ctx, x0, y, Math.round(w * 0.8) + 1, '#ffffff');
        if (!e.full || k < 0.5) A.star(ctx, x0 + d * L, y, w + 2, '#ffffff', RAINBOW(e.t * 9));   // its head
        for (let i = 0; i < 4 + o.n * 2; i++) { const q = (i * 0.37 + e.t * 3) % 1; A.px(ctx, x0 + d * L * q, y + Math.sin(i * 7 + e.t * 30) * (w + 3), 1, 1, RAINBOW(i + e.t * 5)); }   // sparks of every colour shaken loose
      },
    };
  }
  K.chaos = {
    status: 'random', fx: 'chaos', block: ['Chaos Ward', 'shield'], dash: ['Glitch Dash', 'blink'],
    m1: Object.assign({
      name: 'Chaos Ray', dmg: 9, cd: 0.42, kind: 'custom', life: 0.32,
      desc: 'Fire a white beam with a rainbow edge. Whatever it hits gets one random effect. Fire? Sleep? Who knows. Not you.',
    }, chaosRay({ n: 1, w: 3, len: 120, speed: 900 })),
    s: [
      {
        name: 'Roulette', dmg: 10, cd: 4, mp: 5, kind: 'custom', life: 0.6,
        desc: 'Spin the wheel. You get a random skill from a random element.',
        spawn(e, g, A) { const r = borrow(e, g, A, 's', 1.2); e.lbl = r.el.name.toUpperCase() + ': ' + r.mv.name.toUpperCase(); e.col = r.el.color; A.sfx('ding'); },
        update(e, dt, g, A) { e.x = A.p.cx; e.y = A.p.y; },
        draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => A.text(ctx, e.lbl, e.x + ox, e.y + oy - 22, e.col)); },
      },
      {
        name: 'Fusion', dmg: 10, cd: 7, mp: 7, kind: 'custom', life: 0.6,
        desc: 'Two random skills from two random elements, at the same time. Nobody is ready for this. Least of all you.',
        spawn(e, g, A) { const a = borrow(e, g, A, 's', 1), b = borrow(e, g, A, 's', 1); e.lbl = a.el.name.toUpperCase() + ' + ' + b.el.name.toUpperCase(); e.ca = a.el.color; e.cb = b.el.color; A.sfx('ding'); A.flash(0.1); },
        update(e, dt, g, A) { e.x = A.p.cx; e.y = A.p.y; },
        draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => A.text(ctx, e.lbl, e.x + ox, e.y + oy - 22, Math.floor(e.t * 10) % 2 ? e.ca : e.cb)); },
      },
      {
        name: 'Glitch', dmg: 14, cd: 6, mp: 5, kind: 'custom', life: 0.7,
        desc: 'Glitch out of reality and back in somewhere nearby. Everything near both spots gets a random status.',
        spawn(e, g, A) {
          const p = A.p; e.a = { x: p.cx, y: p.y + 10 };
          for (let tries = 0; tries < 12; tries++) { const nx = p.x + A.rnd(-80, 80); if (!Phys().overlapsSolid(g.level, nx, p.y, p.w, p.h)) { p.x = nx; break; } }
          e.b = { x: p.cx, y: p.y + 10 }; p.dashGrace = 0.3; A.sfx('recordScratch');
          for (const pt of [e.a, e.b]) for (const o of H.nearby(A, pt.x, pt.y, 40)) { A.damage(e, o.t, 1, 0.5); if (o.t.applyStatus) o.t.applyStatus(RANDOM_ST(), e.potency); }
        },
        draw(e, ctx, ox, oy, A) { const k = e.t / e.life; A.alpha(ctx, 1 - k, () => { for (const pt of [e.a, e.b]) GLITCHY(ctx, A, pt.x + ox - 16, pt.y + oy - 20, 32, 40, e.t); }); },
      },
      {
        name: 'Reality Shuffle', dmg: 12, cd: 9, mp: 7, kind: 'custom', life: 0.6,
        desc: 'Shuffle every nearby enemy\'s position like a deck of cards. Each one gets a different status.',
        spawn(e, g, A) {
          const ts = H.nearby(A, A.p.cx, A.p.y, 160).map((o) => o.t).filter((t) => !t.tutorial); e.pts = ts.map((t) => A.center(t));
          const xs = ts.map((t) => t.x).sort(() => Math.random() - 0.5);
          ts.forEach((t, i) => { if (!Phys().overlapsSolid(g.level, xs[i], t.y, t.w || t.box.w, t.h || t.box.h)) t.x = xs[i]; A.damage(e, t, 1, 0); if (t.applyStatus) t.applyStatus(RANDOM_ST(), e.potency); });
          for (const t of H.nearby(A, A.p.cx, A.p.y, 160).map((o) => o.t).filter((t) => t.tutorial)) { A.damage(e, t, 1, 0); if (t.applyStatus) t.applyStatus(RANDOM_ST(), e.potency); e.pts.push(A.center(t)); }
          A.sfx('recordScratch'); A.flash(0.15);
        },
        draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => { for (const p2 of e.pts) { A.text(ctx, '?', p2.x + ox, p2.y + oy - 24, ERX.Abilities.toHex(ERX.Abilities.rainbowColor(e.t * 5 + p2.x))); GLITCHY(ctx, A, p2.x + ox - 10, p2.y + oy - 12, 20, 24, e.t); } }); },
      },
      {
        name: 'Pandemonium', dmg: 10, cd: 10, mp: 8, kind: 'custom', life: 1,
        desc: 'Fire off a rapid burst of random basic attacks from random elements. Pure noise.',
        spawn(e, g, A) { e.n = 0; A.sfx('recordScratch'); },
        update(e, dt, g, A) { const want = Math.min(e.up ? 8 : 6, Math.floor(e.t / 0.12) + 1); while (e.n < want) { e.n++; const p = A.p; const f = p.facing; if (e.n % 2 === 0) p.facing = -f; borrow(e, g, A, 'm1', 0.9); p.facing = f; } },
      },
    ],
    ult: {
      name: 'Absolute Anomaly', dmg: 24,
      desc: 'Reality breaks completely. Three random Ultimates from three random elements go off one after another. Nobody knows what happens. Especially you.',
      charge: {
        pose: 'raiseBoth', lift: 16,
        draw(ctx, x, y, k, t, A, P) {
          const ids = OTHERS();
          for (let i = 0; i < 12; i++) { const el = ERX.Elements.get(ids[(i * 5 + Math.floor(t * 6)) % ids.length]); const a = t * 3 + (i / 12) * Math.PI * 2, r = 10 + k * 24; A.disc(ctx, x + Math.cos(a) * r, y - 4 + Math.sin(a) * r * 0.7, 2, el.color, '#ffffff'); }
          GLITCHY(ctx, A, x - 30, y - 30, 60 * k, 50, t);
        },
      },
      run(A, e0) {
        const ids = OTHERS().slice().sort(() => Math.random() - 0.5).slice(0, 3);
        A.g.floatText(A.p.cx, A.p.y - 20, ids.map((id) => ERX.Elements.get(id).name.toUpperCase()).join(' + ') + '!', '#ffffff');
        A.sfx('recordScratch');
        A.spawn(e0, {
          life: 2.4,
          spawn(e) { e.fired = 0; },
          update(e, dt, g, A) {
            while (e.fired < ids.length && e.t >= e.fired * 0.7) {
              const id = ids[e.fired++], kit = ERX.Kits[id], el = ERX.Elements.get(id);
              const sub = Object.assign({}, e0, { pal: ERX.Abilities.palette(el, kit, e0.up), status: kit.status, dmg: kit.ult.dmg * (e0.dmg / 24) * 0.6, hit: new Set(), hitT: new Map() });
              kit.ult.run(A, sub, el); A.flash(0.2);
            }
          },
          draw(e, ctx, ox, oy, A) { if (Math.floor(e.t * 10) % 3 === 0) GLITCHY(ctx, A, A.p.cx + ox - 60, A.p.y + oy - 30, 120, 60, e.t); },
        }, {});
      },
    },
  };

  K.chaos.randomEffects = randomEffects;   // (awakened Chaos's pillar hands them out too)

  // ============================================================ UPGRADED M1s + DASHES
  // (see kits-1.js: M1+ swaps in m1Up, DASH+ adds dashUp; same colours, just bigger, faster, stronger, more detailed)
  {
    const W = () => ERX.AwkHelp;

    // ----------------------------------------------------------- MAGNETISM
    K.magnetism.m1Up = {
      name: 'Horseshoe Magnet', dmg: 9, cd: 0.55, kind: 'custom', life: 1.1,
      desc: 'Throw a giant horseshoe magnet. It sticks where it lands, drags everything nearby into a pile, then blasts the pile apart.',
      spawn(e, g, A) { H.at(e, A, 6, -4); e.vx = e.dir * 190; e.vy = -140; A.sfx('swing'); },
      update(e, dt, g, A) {
        const s = H.sc(e);
        if (!e.stuck) {
          e.vy += 600 * dt; e.x += e.vx * dt * 1.2; e.y += e.vy * dt;
          const t = A.near(e.x, e.y, 7 * s);
          if (t) A.damage(e, t, 0.6, 0.1);
          if (t || A.solid(e.x, e.y + 5) || e.t > 0.6) { e.stuck = e.t; e.life = e.t + 0.6; A.sfx('hitMetal', { minGap: 0.05 }); }
          return;
        }
        if (e.t - e.stuck < 0.45) { for (const o of H.nearby(A, e.x, e.y, 52 * s)) H.shove(A, o.t, Math.sign(e.x - o.c.x) * Math.min(Math.abs(e.x - o.c.x), 100 * dt), 0); }
        else if (!e.boom) { e.boom = true; e.hit.clear(); A.hitR(e, e.x, e.y, 24 * s, { kb: 1.5 }); A.spawn(e, W().SHOCK, { x: e.x, y: e.y, r: 22 * s }); A.shake(2, 0.12); A.sfx('boom', { minGap: 0.05 }); }
      },
      draw(e, ctx, ox, oy, A) {
        if (e.boom) return;
        const P = e.pal, s = H.sc(e), x = e.x + ox, y = e.y + oy, r = 6 * s, rot = e.stuck ? 0 : e.t * 18;
        if (e.stuck) {
          const k = e.t - e.stuck;
          for (const o of H.nearby(A, e.x, e.y, 52 * s)) FIELD(ctx, A, x, y, o.c.x + ox, o.c.y + oy, e.t, 2, P.l);
          A.alpha(ctx, 0.5, () => A.ring(ctx, x, y, 52 * s * (1 - ((k * 2.2) % 1)), P.c, 52 * s * (1 - ((k * 2.2) % 1)) * 0.6));   // the pull, rippling inwards
        }
        // the horseshoe: a thick U with a red arm and a blue arm
        for (let i = 0; i <= 12; i++) { const a = rot + Math.PI * (i / 12), hx = x + Math.cos(a) * r, hy = y + Math.sin(a) * r; A.px(ctx, hx - 1, hy - 1, 3, 3, P.d); A.px(ctx, hx - 1, hy - 1, 2, 2, P.c); }
        const ux = Math.sin(rot), uy = -Math.cos(rot);
        for (const side of [0, 1]) { const a = rot + side * Math.PI, ex = x + Math.cos(a) * r, ey = y + Math.sin(a) * r; A.line(ctx, ex, ey, ex + ux * 4 * s, ey + uy * 4 * s, side ? BLUE : RED, 3); A.px(ctx, ex + ux * 4 * s - 1, ey + uy * 4 * s - 1, 3, 2, '#ffffff'); }
      },
    };
    K.magnetism.dashUp = {
      name: 'Mag Drag', dmg: 14, life: 0.55,
      desc: 'Turn into a magnet mid-dash. Everything nearby gets dragged along after you, then clamped hard when you stop.',
      update(e, dt, g, A) {
        const p = A.p, s = H.sc(e);
        if (H.dashing(e, A)) { for (const o of H.nearby(A, p.cx, p.y + 10, 50 * s)) H.shove(A, o.t, Math.sign(p.cx - o.c.x) * Math.min(Math.abs(p.cx - o.c.x), 200 * dt) + p.facing * 150 * dt, 0); return; }
        if (!e.clamp) { e.clamp = e.t; const q = H.end(e); A.hitR(e, q.x, q.y, 28 * s, { kb: 1.3 }); A.spawn(e, W().SHOCK, { x: q.x, y: q.y, r: 24 * s }); A.sfx('hitMetal', { minGap: 0.05 }); A.shake(2, 0.12); }
      },
      draw(e, ctx, ox, oy, A) {
        if (!e.pts) return;
        const P = e.pal, s = H.sc(e);
        if (!e.over) {
          const p = A.p, x = p.cx + ox, y = p.y + 10 + oy;
          for (const o of H.nearby(A, p.cx, p.y + 10, 50 * s)) FIELD(ctx, A, x, y, o.c.x + ox, o.c.y + oy, e.t, 2, P.l);
          A.ring(ctx, x, y, 8 * s, RED, 10 * s, 2); A.ring(ctx, x, y, 6 * s, BLUE, 8 * s, 2);
          return;
        }
        const k = (e.t - e.clamp) / 0.3;
        if (k > 1) return;
        const q = H.end(e);
        A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 8; i++) { const a = i * 0.785 + k * 2, r = (6 + k * 20) * s; A.line(ctx, q.x + ox + Math.cos(a) * r * 0.5, q.y + oy + Math.sin(a) * r * 0.5, q.x + ox + Math.cos(a) * r, q.y + oy + Math.sin(a) * r, i % 2 ? RED : BLUE, 2); } });
      },
    };

    // ---------------------------------------------------------------- TIME
    K.time.m1Up = {
      name: 'Full Circle', dmg: 9, cd: 0.55, kind: 'custom', life: 0.5,
      desc: 'A giant clock hand sweeps all the way round you. Twice. Nobody is safe from the passage of time.',
      spawn(e, g, A) { H.at(e, A, 0, -2); e.lap = 0; e.a = -Math.PI / 2; A.sfx('swing'); },
      update(e, dt, g, A) {
        H.at(e, A, 0, -2);
        const s = H.sc(e), R = 34 * s, k = Math.min(1, e.t / 0.42), lap = Math.floor(k * 2);
        e.a = -Math.PI / 2 + k * Math.PI * 4 * e.dir;
        if (lap > e.lap && lap < 2) { e.lap = lap; e.hit.clear(); A.sfx('swing', { minGap: 0.02 }); }
        if (k < 1) for (let r = 6; r <= R; r += 6) A.hitR(e, e.x + Math.cos(e.a) * r, e.y + Math.sin(e.a) * r, 5 * s, { kb: 0.6 });
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), R = 34 * s, x = e.x + ox, y = e.y + oy, a = e.a;
        A.alpha(ctx, A.fade(e, 0.05, 0.1), () => {
          A.alpha(ctx, 0.35, () => A.ring(ctx, x, y, R, P.c));   // a clock face round you
          for (let i = 0; i < 12; i++) { const b = (i / 12) * Math.PI * 2, big = i % 3 === 0; A.px(ctx, x + Math.cos(b) * R - (big ? 1 : 0), y + Math.sin(b) * R - (big ? 1 : 0), big ? 2 : 1, big ? 2 : 1, big ? '#ffffff' : P.l); }
          for (let j = 1; j <= 6; j++) { const b = a - e.dir * j * 0.12; A.alpha(ctx, 0.5 * (1 - j / 7), () => A.line(ctx, x, y, x + Math.cos(b) * R, y + Math.sin(b) * R, P.c, 2)); }   // the sweep behind the hand
          const hx = x + Math.cos(a) * R, hy = y + Math.sin(a) * R;
          A.line(ctx, x, y, hx, hy, P.d, 4); A.line(ctx, x, y, hx, hy, P.l, 2);
          for (const da of [-0.5, 0.5]) A.line(ctx, hx, hy, hx - Math.cos(a + da) * 6 * s, hy - Math.sin(a + da) * 6 * s, '#ffffff', 2);   // the arrow tip
          A.disc(ctx, x, y, Math.round(2 * s), '#ffffff');
        });
      },
    };
    K.time.dashUp = {
      name: 'Instant Replay', dmg: 14, life: 0.95,
      desc: 'Half a second after you dash, a ghost of you replays it. Same path, same hits. Time is a flat circle.',
      update(e, dt, g, A) {
        H.dashing(e, A);
        const rt = e.t - 0.5;
        e.ghost = false;
        if (rt < 0 || !e.over) return;
        const q = e.pts.find((p2) => p2.t >= rt) || H.end(e);
        e.gx = q.x; e.gf = q.f; e.ghost = rt <= H.end(e).t + 0.05;
        if (e.ghost) A.hit(e, { x: q.x - 9, y: q.f - 22, w: 18, h: 22 }, { dir: e.dir, kb: 0.9 });
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e);
        if (e.over && e.t < 0.5) { const o = e.pts[0]; A.alpha(ctx, Math.min(1, (e.t - 0.16) / 0.1), () => CLOCK(ctx, A, o.x + ox, o.y - 20 + oy, Math.round(5 * s), -e.t * 6, P, 8)); }   // winding back...
        if (!e.ghost) return;
        A.alpha(ctx, 0.4, () => H.drawGhost(ctx, A, 'dash', e.gx - e.dir * 6 + ox, e.gf + oy, e.dir, P.c));
        A.alpha(ctx, 0.75, () => H.drawGhost(ctx, A, 'dash', e.gx + ox, e.gf + oy, e.dir, P.l));
        A.text(ctx, '> REPLAY', e.gx + ox, e.gf - 34 + oy, P.l);
      },
    };

    // ------------------------------------------------------------- GRAVITY
    K.gravity.m1Up = {
      name: 'Gravity Wave', dmg: 7, cd: 0.5, kind: 'custom', life: 0.75,
      desc: 'Send out a ripple in space itself. Everything it passes through gets heavier, slower and slammed into the floor.',
      spawn(e, g, A) { H.at(e, A, 12, -2); e.vx = e.dir * 120; },
      update(e, dt, g, A) {
        const s = H.sc(e);
        e.x += e.vx * dt * 1.2;
        A.tick(e, { x: e.x - 7 * s, y: e.y - 18 * s, w: 14 * s, h: 36 * s }, 0.2, { kb: 0.1, onHit: (t) => { if (!t.tutorial && !t.immovable) t.vy = Math.max(t.vy || 0, 220); } });
        if (A.solid(e.x, e.y)) e.dead = true;
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), x = e.x + ox, y = e.y + oy;
        A.alpha(ctx, A.fade(e, 0.08, 0.15), () => {
          for (let i = 0; i < 4; i++) {   // ripples peeling off behind it
            const ph = (e.t * 3 + i / 4) % 1, rx = (3 + ph * 8) * s, ry = (8 + ph * 14) * s, rxx = x - e.dir * ph * 10 * s;
            A.alpha(ctx, 1 - ph, () => { A.ring(ctx, rxx, y, rx, P.l, ry); A.ring(ctx, rxx, y, rx + 1, P.c, ry + 1); A.ring(ctx, rxx, y, Math.max(1, rx - 1), '#ffffff', Math.max(1, ry - 1), 2); });
          }
          A.glow(ctx, x, y, 5 * s, P.d, 0.3);
          for (let gx = -2; gx <= 2; gx++) for (let gy = -3; gy <= 3; gy++) {   // space bending: a grid of dots pulled towards the middle
            const dx = gx * 5 * s, dy = gy * 5 * s, pull = 1 - (Math.min(1, (6 * s) / Math.max(1, Math.hypot(dx, dy))) * 0.5);
            A.px(ctx, x + dx * pull, y + dy * pull, 1, 1, P.d);
          }
          A.disc(ctx, x, y, Math.round(2 * s), '#05020a'); A.ring(ctx, x, y, Math.round(2 * s) + 1, P.l);
        });
      },
    };
    const SATELLITE = H.proj((b, ctx, ox, oy, A) => ROCK(ctx, A, b.x + ox, b.y + oy, b.up ? 3 : 2), { life: 0.45, r: 4 });
    K.gravity.dashUp = {
      name: 'Satellite Rush', dmg: 10, life: 0.4,
      desc: 'Dash with rocks orbiting round you like moons. When you stop, they all fly off in every direction.',
      update(e, dt, g, A) {
        const p = A.p, s = H.sc(e), R = 14 * s;
        if (H.dashing(e, A)) { for (let i = 0; i < 4; i++) { const a = e.t * 18 + i * 1.57; A.tickR(e, p.cx + Math.cos(a) * R, p.y + 10 + Math.sin(a) * R * 0.6, 5 * s, 0.2, { kb: 0.5 }); } return; }
        if (!e.thrown) {
          e.thrown = true; const q = H.end(e);
          for (let i = 0; i < 4; i++) { const a = e.t * 18 + i * 1.57; A.spawn(e, SATELLITE, { x: q.x + Math.cos(a) * R, y: q.y + Math.sin(a) * R * 0.6, vx: Math.cos(a) * 240, vy: Math.sin(a) * 160 - 40, dmg: e.dmg * 0.8 }); }
          A.sfx('whoosh');
        }
      },
      draw(e, ctx, ox, oy, A) {
        if (!e.pts || e.over) return;
        const p = A.p, s = H.sc(e), R = 14 * s, x = p.cx + ox, y = p.y + 10 + oy;
        A.alpha(ctx, 0.3, () => A.ring(ctx, x, y, R, e.pal.c, R * 0.6));
        for (let i = 0; i < 4; i++) { const a = e.t * 18 + i * 1.57; ROCK(ctx, A, x + Math.cos(a) * R, y + Math.sin(a) * R * 0.6, Math.round(2 * s)); }
      },
    };

    // --------------------------------------------------------------- SOUND
    K.sound.m1Up = {
      name: 'Tuning Fork', dmg: 6, cd: 0.5, kind: 'custom', life: 0.5,
      desc: 'Slam a giant tuning fork into the ground. It hums so hard that three rings of sound roll out of it. Mmmmmmm.',
      spawn(e, g, A) { H.at(e, A, 0); e.fx = e.x + e.dir * 22 * H.sc(e); e.gy = H.floor(A, e.fx); e.n = 0; },
      update(e, dt, g, A) {
        const s = H.sc(e);
        while (e.n < 3 && e.t >= 0.08 + e.n * 0.1) {
          e.hit.clear(); A.hitR(e, e.fx, e.gy - 8, (16 + e.n * 10) * s, { kb: 0.4 + e.n * 0.2 });
          A.sfx(e.n ? 'sndPing' : 'clap', { minGap: 0.03 }); if (!e.n) A.shake(1.5, 0.1);
          e.n++;
        }
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), x = e.fx + ox, gy = e.gy + oy, drop = Math.min(1, e.t / 0.08), hum = e.t > 0.08 ? Math.sin(e.t * 90) * 1.2 : 0;
        const top = gy - (1 - drop) * 30 - 26 * s;
        A.alpha(ctx, A.fade(e, 0.02, 0.12), () => {
          A.line(ctx, x, top + 18 * s, x, gy, P.d, 3);   // the fork: a handle and two buzzing prongs
          for (const side of [-1, 1]) A.line(ctx, x + side * (3 * s + hum), top, x + side * 3 * s, top + 18 * s, P.l, 2);
          A.line(ctx, x - 3 * s, top + 18 * s, x + 3 * s, top + 18 * s, P.c, 2);
          A.px(ctx, x - 3 * s - 1 + hum, top, 2, 2, '#ffffff');
          for (let i = 0; i < e.n; i++) { const k = (e.t - 0.08 - i * 0.1) / 0.3; if (k >= 0 && k < 1) A.alpha(ctx, 1 - k, () => { const R = (16 + i * 10) * s * (0.4 + k * 0.6); A.ring(ctx, x, gy - 6, R, P.c, R * 0.4); A.ring(ctx, x, gy - 6, R * 0.8, '#ffffff', R * 0.32, 2); }); }
        });
      },
    };
    K.sound.dashUp = {
      name: 'Doppler Rush', dmg: 12, life: 0.5,
      desc: 'Move so fast the sound bunches up in front of you, then let it all go at once. NEEEEOWWW. BOOM.',
      update(e, dt, g, A) {
        if (H.dashing(e, A)) { H.dashBody(e, A, { kb: 0.3, mult: 0.5 }); return; }
        if (!e.burst) { e.burst = e.t; const q = H.end(e), s = H.sc(e), L = 44 * s; e.hit.clear(); A.hit(e, { x: e.dir > 0 ? q.x : q.x - L, y: q.y - 14 * s, w: L, h: 28 * s }, { dir: e.dir, kb: 1.5 }); A.sfx('sndBass', { minGap: 0.05 }); A.shake(2, 0.12); }
      },
      draw(e, ctx, ox, oy, A) {
        if (!e.pts) return;
        const P = e.pal, s = H.sc(e);
        if (!e.over) { const p = A.p; for (let i = 0; i < 4; i++) A.arc(ctx, p.cx + ox + e.dir * (6 + i * 2), p.y + 10 + oy, 8 * s + i, e.dir, i % 2 ? P.l : '#ffffff', 1, -0.9, 0.9); return; }   // the sound piling up in front of you
        const k = (e.t - e.burst) / 0.3;
        if (k > 1) return;
        const q = H.end(e);
        A.alpha(ctx, 1 - k, () => WAVES(ctx, A, q.x + ox + e.dir * k * 30 * s, q.y + oy, (6 + k * 10) * s, e.dir, 4, P.c));
      },
    };

    // ---------------------------------------------------------------- MIST
    K.mist.m1Up = {
      name: 'Shroud Sweep', dmg: 12, cd: 0.5, kind: 'custom', life: 0.5,
      desc: 'Sweep a tall curtain of cold mist forward. It cuts through everything it passes and leaves them blind.',
      spawn(e, g, A) { H.at(e, A, 8, -2); e.vx = e.dir * 200; },
      update(e, dt, g, A) {
        const s = H.sc(e), h = 22 * s;
        e.x += e.vx * dt * 1.2;
        A.hit(e, { x: e.x - 5 * s, y: e.y - h, w: 10 * s, h: h * 1.6 }, { dir: e.dir, kb: 0.4 });
        if (Math.random() < dt * 20) A.spawn(e, PUFF, { x: e.x - e.dir * 4, y: e.y + A.rnd(-h, h * 0.5), vx: -e.dir * 20, vy: A.rnd(-8, 8), life: 0.6 });
        if (A.solid(e.x, e.y)) e.dead = true;
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), h = 22 * s, x = e.x + ox, y = e.y + oy;
        A.alpha(ctx, A.fade(e, 0.05, 0.15), () => {
          for (let yy = -h; yy <= h * 0.6; yy++) {   // a wavy sheet of mist, curving back at the ends, with droplets glinting on its edge
            const bend = Math.sin(yy * 0.25 + e.t * 18) * 2 * s - (yy / h) * (yy / h) * e.dir * 4 * s, w = 4 * s * (1 - Math.abs(yy) / (h * 1.2));
            A.alpha(ctx, 0.55, () => A.px(ctx, x + bend - e.dir * w, y + yy, w, 1, P.c));
            A.px(ctx, x + bend, y + yy, 1, 1, (Math.floor(yy) + Math.floor(e.t * 30)) % 7 === 0 ? '#ffffff' : P.l);
          }
        });
      },
    };
    K.mist.dashUp = {
      name: 'Whiteout', dmg: 11, life: 1.1,
      desc: 'Vanish into a bank of fog that billows out along your path and blinds anything caught inside it.',
      update(e, dt, g, A) {
        if (H.dashing(e, A) || e.S) return;
        e.S = H.span(e);
        const S = e.S, s = H.sc(e), y = e.pts[0].y;
        A.hit(e, { x: S.x0 - 14, y: y - 18 * s, w: S.x1 - S.x0 + 28, h: 32 * s }, { kb: 0.3 });
      },
      draw(e, ctx, ox, oy, A) {
        if (!e.pts) return;
        const P = e.pal, s = H.sc(e), out = Math.min(1, (e.life - e.t) / 0.5); let i = 0;
        H.along(e, 7, (x, y) => {
          const grow = U.clamp((e.t - i * 0.015) / 0.3, 0, 1), r = (7 + 3 * Math.sin(i * 2.1)) * s * (0.4 + grow * 0.7);
          FOG(ctx, A, x + ox + Math.sin(e.t * 2 + i) * 3, y + oy + Math.cos(e.t * 1.5 + i * 1.3) * 4, r, i % 2 ? '#e8eef4' : P.l, 0.55 * out * grow);
          i++;
        });
      },
    };

    // -------------------------------------------------------------- SPIRIT
    K.spirit.m1Up = {
      name: 'Fox Spirit', dmg: 12, cd: 0.5, kind: 'custom', life: 0.6,
      desc: 'Call a ghostly fox that bounds forward and runs straight through every enemy in its way. Good fox.',
      spawn(e, g, A) { H.at(e, A, 8); e.gy = H.floor(A, e.x); e.vx = e.dir * 230; A.sfx('whoosh', { minGap: 0.05 }); },
      update(e, dt, g, A) {
        const s = H.sc(e);
        e.x += e.vx * dt * 1.2;
        const gy = A.ground(e.x, e.gy - 16);
        if (Math.abs(gy - e.gy) < 24) e.gy = gy;
        e.y = e.gy - 6 * s - Math.abs(Math.sin(e.t * 16)) * 5;   // bounding along
        A.hit(e, { x: e.x - 8 * s, y: e.y - 6 * s, w: 16 * s, h: 12 * s }, { dir: e.dir, kb: 0.6 });
        if (A.solid(e.x + e.dir * 6, e.y)) e.dead = true;
      },
      onEnd(e, A) { A.puff(e, e.x, e.y, 8, 1.4); },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), d = e.dir, x = e.x + ox, y = e.y + oy, run = Math.sin(e.t * 32);
        A.alpha(ctx, A.fade(e, 0.05, 0.12) * 0.9, () => {
          A.glow(ctx, x, y, 6 * s, P.c, 0.1);
          A.px(ctx, x - 5.5 * s, y - 2.5 * s, 11 * s, 5 * s, P.d);   // a dark outline round the body
          A.disc(ctx, x + d * 6 * s, y - 2 * s, Math.round(3 * s), P.d);
          for (let i = 0; i < 8; i++) { const q = i / 8, tx = x - d * (5 + i * 1.6) * s, ty = y - 1 - Math.sin(q * Math.PI) * 4 * s + Math.sin(e.t * 20 + i) * q * 2; A.disc(ctx, tx, ty, Math.max(1, Math.round((2.2 - q * 1.2) * s)), i > 5 ? '#ffffff' : P.l); }   // a big curl of a tail
          A.px(ctx, x - 5 * s, y - 2 * s, 10 * s, 4 * s, P.l);   // body
          A.px(ctx, x - 5 * s, y + s, 10 * s, 1, P.c);
          A.disc(ctx, x + d * 6 * s, y - 2 * s, Math.round(2.5 * s), P.l);   // head, ears, snout, eye
          A.tri(ctx, x + d * 5 * s, y - 4 * s, 3 * s, 4 * s, P.l, '#ffffff'); A.tri(ctx, x + d * 7.5 * s, y - 4 * s, 3 * s, 4 * s, P.l, '#ffffff');
          A.px(ctx, x + d * 9 * s - (d < 0 ? 1 : 0), y - s, 2, 1, P.c);
          A.px(ctx, x + d * 6.5 * s, y - 3 * s, 1, 1, P.d);
          for (let i = 0; i < 4; i++) { const lx = x + (i < 2 ? d * 3 : -d * 3) * s + (i % 2 ? 1 : -1) * run * 2 * s; A.line(ctx, lx, y + 2 * s, lx + (i % 2 ? -1 : 1) * run * 1.5, y + 5 * s, P.l, 1); }   // legs
        });
      },
    };
    const STAMPEDER = {
      life: 0.5,
      update(e, dt, g, A) {
        const p = A.p;
        if (!e.free && p.dashT > 0) { e.x = p.cx + e.off; e.y = p.y + 10 + e.oy; } else { e.free = true; e.x += e.dir * 260 * dt; }
        A.hitR(e, e.x, e.y, 7 * H.sc(e), { dir: e.dir, kb: 0.5 });
      },
      draw(e, ctx, ox, oy, A) {
        const f = Math.min(1, (e.life - e.t) / 0.2), s = H.sc(e);
        for (let i = 3; i >= 1; i--) A.alpha(ctx, 0.12 * f, () => GHOST(ctx, A, e.x + ox - e.dir * i * 6, e.y + oy, s * 0.8, e.pal.c, e.t));
        const by = e.y + oy + Math.sin(e.t * 20 + e.off) * 2;
        A.alpha(ctx, 0.9 * f, () => { GHOST(ctx, A, e.x + ox, by + 1, s * 0.95, e.pal.d, e.t); GHOST(ctx, A, e.x + ox, by, s * 0.9, e.pal.l, e.t); });
      },
    };
    K.spirit.dashUp = {
      name: 'Spirit Stampede', dmg: 5, life: 0.2,
      desc: 'Three spirits charge alongside you, and they keep on charging after you stop. Get out of the way.',
      spawn(e, g, A) { for (let i = 0; i < 3; i++) A.spawn(e, STAMPEDER, { off: e.dir * (4 + i * 6), oy: (i - 1) * 9 }); A.sfx('whoosh', { minGap: 0.05 }); },
    };

    // --------------------------------------------------------------- CHAOS
    K.chaos.m1Up = Object.assign({
      name: 'Chaos Ray XL', dmg: 12, cd: 0.45, kind: 'custom', life: 0.42,
      desc: 'The same beam, only bigger, faster and further. Everything it hits gets TWO random effects.',
    }, chaosRay({ n: 2, w: 5, len: 190, speed: 1500 }));
    K.chaos.dashUp = {
      name: 'Blue Screen', dmg: 12, life: 0.01,
      desc: 'Your dash crashes into a random element\'s upgraded dash. Please do not turn off your character.',
      spawn(e, g, A) {
        const id = pick(OTHERS().filter((k) => ERX.Kits[k].dashUp)), kit = ERX.Kits[id], d = kit.dashUp;
        A.spawn(e, { spawn: d.spawn, update: d.update, draw: d.draw, onEnd: d.onEnd, life: d.life || 0.6, layer: d.layer }, { pal: ERX.Abilities.palette(ERX.Elements.get(id), kit, true), status: Math.random() < 0.5 ? kit.status : RANDOM_ST(), dmg: (d.dmg || 10) * (e.dmg / 12) });
      },
    };
  }
})(window.ERX = window.ERX || {});
