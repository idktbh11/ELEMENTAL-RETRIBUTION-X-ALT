/*
 * KITS: NATURE, DARKNESS, SHADOW, LIGHT, ARCANE, POISON
 * (format: js/data/kits/_kit.js)
 */
(function (ERX) {
  'use strict';

  const K = ERX.Kits, H = ERX.KitHelp, U = ERX.U;
  const Phys = () => ERX.GameEngine.Physics;

  // =================================================================== NATURE
  const LEAF = { life: 0.9, update(e, dt) { e.x += (e.vx + Math.sin(e.t * 6) * 20) * dt; e.y += e.vy * dt; e.vy += 30 * dt; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => { A.px(ctx, e.x + ox, e.y + oy, 2, 1, e.pal.c); A.px(ctx, e.x + ox + 1, e.y + oy - 1, 1, 1, e.pal.l); }); } };
  const PETAL = { life: 1, update(e, dt) { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 60 * dt; e.vx *= 1 - dt; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => A.px(ctx, e.x + ox, e.y + oy, 2, 2, e.col || '#ff9ad0')); } };
  // a root/vine that grows from (x0, y0) towards (x1, y1) along a curve
  const ROOT_LINE = (ctx, A, x0, y0, x1, y1, k, w, P, bend, thorns) => {
    const n = Math.max(4, Math.round(Math.hypot(x1 - x0, y1 - y0) / 3));
    const m = Math.round(n * k);
    for (let i = 0; i <= m; i++) {
      const q = i / n, bx = U.lerp(x0, x1, q) + Math.sin(q * Math.PI) * bend, by = U.lerp(y0, y1, q) - Math.sin(q * Math.PI) * Math.abs(bend) * 0.4;
      const ww = Math.max(1, w * (1 - q * 0.6));
      A.px(ctx, bx - ww / 2, by - ww / 2, ww, ww, i % 3 ? P.c : P.d);
      if (thorns && i % 5 === 2) A.px(ctx, bx + ww / 2, by - ww, 1, 2, '#e8f0a0');
    }
  };
  K.nature = {
    status: 'poison', fx: 'leaves', block: ['Treant Wall', 'tree'], dash: ['Grassy Dash', 'trail'],
    m1: {
      name: 'Thorn Strike', dmg: 9, cd: 0.5, kind: 'custom', life: 0.55,
      desc: 'A grassy, curved thorn bursts out of the ground under the nearest enemy.',
      spawn(e, g, A) {
        H.at(e, A, 0); const ax = A.aim(e, 90); e.tx = ax !== null ? ax : e.x + e.dir * 30; e.gy = H.floor(A, e.tx); A.sfx('crash', { minGap: 0.05 });
        e.extra = e.up ? [e.tx + e.dir * 16] : [];
      },
      update(e, dt, g, A) {
        const k = Math.min(1, e.t / 0.1) * (e.t > 0.4 ? 1 - (e.t - 0.4) / 0.15 : 1), h = 30 * H.sc(e) * k;
        for (const x of [e.tx].concat(e.extra)) A.hit(e, { x: x - 6, y: e.gy - h, w: 12, h }, { kb: 1 });
      },
      draw(e, ctx, ox, oy, A) {
        const k = Math.min(1, e.t / 0.1) * (e.t > 0.4 ? 1 - (e.t - 0.4) / 0.15 : 1), h = 30 * H.sc(e) * k;
        for (const x0 of [e.tx].concat(e.extra)) {
          const x = x0 + ox, gy = e.gy + oy;
          for (let yy = 0; yy < h; yy++) { const q = yy / h, hw = 4 * (1 - q), cx = x + Math.sin(q * 2.2) * 4 * e.dir; A.px(ctx, cx - hw, gy - yy, hw * 2, 1, q > 0.85 ? e.pal.core : yy % 4 < 2 ? e.pal.c : e.pal.d); }
          for (const [dx, dy] of [[-5, 1], [5, 1], [-3, 3], [4, 4]]) A.px(ctx, x + dx, gy - dy, 2, 1, e.pal.l);   // grass tufts
        }
      },
    },
    s: [
      {
        name: 'Vine Lash', dmg: 14, cd: 4, mp: 4, kind: 'custom', life: 0.45,
        desc: 'A long thorny vine whips out and yanks the first enemy it hits towards you.',
        spawn(e, g, A) { A.sfx('swing'); },
        update(e, dt, g, A) {
          H.at(e, A, 6, -1);
          e.ext = Math.min(1, e.t / 0.15) * (1 - Math.max(0, (e.t - 0.3) / 0.15));
          const L = 84 * H.sc(e) * e.ext;
          A.hit(e, { x: e.dir > 0 ? e.x : e.x - L, y: e.y - 6, w: L, h: 12 }, { dir: e.dir, kb: 0, onHit(t) { if (!t.tutorial) t.vx = -e.dir * 220; } });
        },
        draw(e, ctx, ox, oy, A) { const L = 84 * H.sc(e) * (e.ext || 0); ROOT_LINE(ctx, A, e.x + ox, e.y + oy, e.x + ox + e.dir * L, e.y + oy, 1, 3, e.pal, Math.sin(e.t * 20) * 5, true); A.px(ctx, e.x + ox + e.dir * L, e.y + oy - 2, 3, 3, e.pal.l); },
      },
      {
        name: 'Spore Cloud', dmg: 3, cd: 8, mp: 7, kind: 'custom', life: 4,
        desc: 'Mushrooms sprout and puff out a cloud of poisonous spores.',
        spawn(e, g, A) { H.at(e, A, 46); e.gy = H.floor(A, e.x); A.sfx('pop'); },
        update(e, dt, g, A) { const R = 46 * H.sc(e); A.tick(e, { x: e.x - R, y: e.gy - R, w: R * 2, h: R }, 0.45, { kb: 0 }); },
        draw(e, ctx, ox, oy, A) {
          const R = 46 * H.sc(e), x = e.x + ox, gy = e.gy + oy, f = A.fade(e, 0.3, 0.5);
          A.alpha(ctx, f, () => {
            for (const dx of [-R * 0.6, 0, R * 0.55]) { A.px(ctx, x + dx - 1, gy - 6, 2, 6, '#e8e0c8'); A.disc(ctx, x + dx, gy - 7, 4, e.pal.c, e.pal.l); A.px(ctx, x + dx - 2, gy - 9, 1, 1, '#ffffff'); }
            for (let i = 0; i < 26; i++) { const yy = (i * 11 + e.t * 18) % R, xx = Math.sin(i * 1.7 + e.t) * R; A.alpha(ctx, 0.7 * (1 - yy / R), () => A.px(ctx, x + xx, gy - 8 - yy, 2, 2, i % 3 ? '#c8e070' : e.pal.l)); }
          });
        },
      },
      {
        name: 'Seed Barrage', dmg: 6, cd: 5, mp: 5, kind: 'custom', life: 0.01,
        desc: 'Spit a spray of seeds. Wherever they land, little thorns sprout.',
        spawn(e, g, A) {
          H.at(e, A, 8, -2); A.sfx('cast');
          const n = e.up ? 8 : 6;
          for (let i = 0; i < n; i++) A.spawn(e, H.proj((b, ctx, ox, oy, A) => { A.px(ctx, b.x + ox, b.y + oy, 2, 2, '#8a5a36'); A.px(ctx, b.x + ox + 1, b.y + oy - 1, 1, 1, b.pal.l); },
            { life: 1.2, r: 3, gravity: 260, onHit(b, A, why) { if (why !== 'wall') return; A.spawn(b, { life: 1.2, spawn(s) { s.gy = A.ground(s.x, s.y - 6); }, update(s, dt, g, A) { if (s.t < 0.9) A.hit(s, { x: s.x - 3, y: s.gy - 8, w: 6, h: 8 }, { kb: 0.4, mult: 0.6 }); }, draw(s, ctx, ox, oy, A) { const h = 8 * Math.min(1, s.t / 0.1) * (s.t > 0.9 ? (1.2 - s.t) / 0.3 : 1); A.tri(ctx, s.x + ox, s.gy + oy, 4, h, s.pal.c, s.pal.l); } }, { x: b.x, y: b.y }); } }),
          { vx: e.dir * A.rnd(120, 230), vy: A.rnd(-140, -40) });
        },
      },
      {
        name: 'Entangle', dmg: 10, cd: 7, mp: 6, kind: 'custom', life: 2,
        desc: 'Roots burst up and wrap around the nearest enemy, holding it in place.',
        spawn(e, g, A) {
          H.at(e, A, 0); const t = A.near(e.x, e.y, 130); e.target = t;
          e.tx = t ? A.center(t).x : e.x + e.dir * 50; e.gy = H.floor(A, e.tx); e.life *= e.up ? 1.4 : 1;
          if (t) { A.damage(e, t, 1, 0); if (t.applyStatus) { t.applyStatus('stagger', 0); if (t.status.stagger) t.status.stagger.t = e.life; } }
          A.sfx('crash');
        },
        update(e, dt, g, A) { if (e.target && !e.target.dead) { e.tx = A.center(e.target).x; e.target.vx = 0; } },
        draw(e, ctx, ox, oy, A) {
          const x = e.tx + ox, gy = e.gy + oy, k = Math.min(1, e.t / 0.25), f = A.fade(e, 0.05, 0.3);
          A.alpha(ctx, f, () => { for (let r = 0; r < 4; r++) { const sx = x + (r - 1.5) * 6; ROOT_LINE(ctx, A, sx, gy, x - (r - 1.5) * 3, gy - 20, k, 3, e.pal, (r % 2 ? 8 : -8), r % 2); } });
        },
      },
      {
        name: 'Regrowth', dmg: 0, cd: 12, mp: 8, kind: 'custom', life: 4,
        desc: 'Flowers bloom around you, healing you a little every second.',
        spawn(e, g, A) { A.sfx('star'); },
        update(e, dt, g, A) {
          const p = A.p; e.x = p.cx; e.gy = p.feet;
          e.ht = (e.ht || 0) + dt;
          if (e.ht > 0.5) { e.ht = 0; const h = e.up ? 6 : 4; p.hp = Math.min(p.maxHp, p.hp + h); A.g.floatText(p.cx, p.y - 6, '+' + h, '#7af0a0'); }
          if (Math.random() < dt * 4) A.spawn(e, PETAL, { x: p.cx + A.rnd(-10, 10), y: p.feet - 4, vx: A.rnd(-20, 20), vy: -50, col: e.pal.up ? e.pal.c : '#ff9ad0' });
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, gy = e.gy + oy, k = Math.min(1, e.t / 0.6);
          A.alpha(ctx, A.fade(e, 0.2, 0.5), () => { for (let i = 0; i < 6; i++) { const fx = x - 15 + i * 6, h = 3 + (i % 3) * 2 * k; A.px(ctx, fx, gy - h, 1, h, '#4e8040'); A.px(ctx, fx - 1, gy - h - 1, 3, 2, i % 2 ? '#ff9ad0' : '#ffd34d'); } });
        },
      },
    ],
    ult: {
      name: 'Worldroot Rampage', dmg: 22,
      desc: 'Enormous thorn-covered roots attack from every direction, then converge on the target and crush it in a botanical explosion.',
      charge: {
        pose: 'raiseBoth', lift: 0,
        draw(ctx, x, y, k, t, A, P) {
          for (let i = 0; i < 6; i++) { const sx = x - 22 + i * 9; ROOT_LINE(ctx, A, sx, y + 14, sx + Math.sin(i + t * 3) * 6, y + 14 - (14 + (i % 3) * 8) * k, 1, 3, P, (i % 2 ? 5 : -5), true); }
          for (let i = 0; i < 10; i++) { const a = t * 4 + i * 0.63, r = 20 + Math.sin(t * 3 + i) * 4; A.px(ctx, x + Math.cos(a) * r, y - 4 + Math.sin(a) * r * 0.6, 2, 1, i % 2 ? P.c : P.l); }
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 2.6,
          spawn(e) {
            const ts = H.nearby(A, p.cx, p.y, 260), main = ts[0] ? ts[0].c : { x: p.cx + e.dir * 80, y: p.y + 6 };
            e.main = main; e.roots = [];
            for (let i = 0; i < 10; i++) { const tg = ts[i % Math.max(1, ts.length)] ? ts[i % ts.length].c : main; const sx = tg.x + (i % 2 ? -1 : 1) * (30 + (i * 13) % 40); e.roots.push({ sx, sy: A.ground(sx, p.y + 2), tg, d: i * 0.07, bend: (i % 2 ? 1 : -1) * (14 + (i * 7) % 16) }); }
            A.sfx('crash'); A.shake(3, 1);
          },
          update(e, dt, g, A) {
            for (const r of e.roots) { const lt = e.t - r.d; r.k = U.clamp(lt / 0.2, 0, 1) * (lt > 1.2 ? Math.max(0, 1 - (lt - 1.2) / 0.2) : 1); if (r.k >= 1 && !r.hit) { r.hit = true; const t = A.near(r.tg.x, r.tg.y, 20); if (t) A.damage(e, t, 1, 0.5); A.sfx('crash', { minGap: 0.03 }); } }
            if (e.t > 1.6 && !e.boom) {
              e.boom = true; A.blast(e, e.main.x, e.main.y, 90 * H.sc(e), { dmg: e.dmg * 3.5 }); A.flash(0.4); A.shake(6, 0.4);
              for (let i = 0; i < 40; i++) A.spawn(e, PETAL, { x: e.main.x, y: e.main.y, vx: A.rnd(-200, 200), vy: A.rnd(-220, 40), col: i % 3 ? (e.pal.up ? e.pal.c : '#ff9ad0') : '#7ae05a' });
            }
          },
          draw(e, ctx, ox, oy, A) {
            for (const r of e.roots) if (r.k > 0) ROOT_LINE(ctx, A, r.sx + ox, r.sy + oy, r.tg.x + ox, r.tg.y + oy, r.k, 6 * H.sc(e), e.pal, r.bend, true);
            if (e.t > 1.2 && e.t < 1.6) { const k = (e.t - 1.2) / 0.4; for (const r of e.roots) A.alpha(ctx, k, () => A.disc(ctx, e.main.x + ox, e.main.y + oy, Math.round(4 + k * 10), e.pal.d, e.pal.c)); }
          },
        }, {});
      },
    },
  };

  // ================================================================= DARKNESS
  const EYES = (ctx, A, x, y, col) => { A.px(ctx, x - 3, y, 2, 1, col); A.px(ctx, x + 1, y, 2, 1, col); };
  const TENDRIL = (ctx, A, x0, y0, x1, y1, k, P, wob) => {
    const n = 16;
    for (let i = 0; i <= Math.round(n * k); i++) { const q = i / n, x = U.lerp(x0, x1, q) + Math.sin(q * 6 + wob) * 4, y = U.lerp(y0, y1, q), w = Math.max(1, 4 * (1 - q)); A.px(ctx, x - w / 2, y - w / 2, w, w, i % 2 ? P.d : '#05020a'); }
  };
  K.darkness = {
    status: 'blind', fx: 'gloom', block: ['Shadow Veil', 'veil'], dash: ['Dark Step', 'ghost'],
    m1: {
      name: 'Dark Scythe', dmg: 10, cd: 0.48, kind: 'custom', life: 0.3,
      desc: 'Sweep a scythe of solid darkness in a wide arc.',
      spawn(e, g, A) { A.sfx('swing'); },
      update(e, dt, g, A) { H.at(e, A, 0); const r = 32 * H.sc(e); A.hit(e, { x: e.dir > 0 ? e.x - 4 : e.x - r - 4, y: e.y - r, w: r + 8, h: r * 1.6 }, { dir: e.dir }); },
      draw(e, ctx, ox, oy, A) {
        const k = e.t / e.life, x = e.x + ox, y = e.y + oy, r = 32 * H.sc(e), d = e.dir;
        const a = U.lerp(-1.9, 1.1, U.ease.outCubic(Math.min(1, k * 1.4)));
        A.line(ctx, x, y, x + Math.cos(a) * r * d, y + Math.sin(a) * r, '#2a1a30', 2);
        for (let i = 0; i <= 14; i++) { const b = a + (i / 14) * 1.3, rr = r - i * 0.7; A.px(ctx, x + Math.cos(b) * rr * d, y + Math.sin(b) * rr, 2, 2, i < 3 ? e.pal.l : i % 2 ? e.pal.c : '#05020a'); }
        A.alpha(ctx, 0.45 * (1 - k), () => { for (let i = 0; i < 20; i++) { const b = -1.9 + (i / 20) * (a + 1.9), rr = r - (i % 3); A.px(ctx, x + Math.cos(b) * rr * d, y + Math.sin(b) * rr, 2, 2, '#05020a'); } });
        if (e.up) EYES(ctx, A, x + d * r * 0.5, y - r * 0.4, e.pal.c);
      },
    },
    s: [
      {
        name: 'Abyssal Orb', dmg: 18, cd: 5, mp: 6, kind: 'custom', life: 1.8,
        desc: 'A slow orb of the abyss that drags nearby enemies in, then implodes.',
        spawn(e, g, A) { H.at(e, A, 12, -2); e.vx = e.dir * 90; A.sfx('cast'); },
        update(e, dt, g, A) {
          e.x += e.vx * dt;
          for (const o of H.nearby(A, e.x, e.y, 60)) if (!o.t.tutorial) { o.t.vx = U.approach(o.t.vx, Math.sign(e.x - o.c.x) * 70, 5, dt); }
          const touch = A.targets().some((t) => Phys().rectsOverlap(t.box, { x: e.x - 6, y: e.y - 6, w: 12, h: 12 }));
          if (touch || A.solid(e.x, e.y) || e.t > 1.6) { A.blast(e, e.x, e.y, 40 * H.sc(e), { dmg: e.dmg * 1.3 }); e.dead = true; }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, r = Math.round(7 * H.sc(e));
          for (let i = 0; i < 16; i++) { const a = -e.t * 6 + i * 0.4, rr = r + 6 + (i % 4); A.px(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr, 1, 1, e.pal.c); }
          A.disc(ctx, x, y, r, e.pal.d); A.disc(ctx, x, y, r - 2, '#05020a'); EYES(ctx, A, x, y - 1, e.pal.c);
        },
      },
      {
        name: 'Night Veil', dmg: 3, cd: 8, mp: 7, kind: 'custom', life: 4,
        desc: 'A patch of true night. Enemies inside are blinded. Things with red eyes watch them.',
        spawn(e, g, A) { H.at(e, A, 52); e.gy = H.floor(A, e.x); A.sfx('whoosh'); },
        update(e, dt, g, A) { const R = 54 * H.sc(e); A.tick(e, { x: e.x - R, y: e.gy - R * 1.2, w: R * 2, h: R * 1.2 }, 0.45, { kb: 0 }); },
        draw(e, ctx, ox, oy, A) {
          const R = 54 * H.sc(e), x = e.x + ox, gy = e.gy + oy;
          A.alpha(ctx, A.fade(e, 0.3, 0.5) * 0.8, () => {
            for (let i = 0; i < 30; i++) { const xx = Math.sin(i * 2.1 + e.t * 0.7) * R, yy = (i * 7) % (R * 1.1); A.disc(ctx, x + xx, gy - yy, 5, i % 3 ? '#05020a' : e.pal.d); }
            for (let i = 0; i < 4; i++) if (Math.floor(e.t * 1.5 + i) % 3) EYES(ctx, A, x + Math.sin(i * 3) * R * 0.6, gy - 12 - i * 9, '#ff3a4a');
          });
        },
      },
      {
        name: 'Grasping Dark', dmg: 12, cd: 6, mp: 6, kind: 'custom', life: 0.9,
        desc: 'Clawed hands of shadow reach up out of the floor.',
        spawn(e, g, A) {
          H.at(e, A, 0); const ax = A.aim(e, 120), start = ax !== null ? Math.max(16, Math.abs(ax - e.x) - 20) : 26;
          e.hands = []; for (let i = 0; i < (e.up ? 5 : 3); i++) { const x = e.x + e.dir * (start + i * 20); e.hands.push({ x, gy: H.floor(A, x), d: i * 0.08 }); }
          A.sfx('whoosh');
        },
        update(e, dt, g, A) { for (const h of e.hands) { const lt = e.t - h.d; h.k = lt < 0 ? 0 : lt < 0.15 ? lt / 0.15 : lt < 0.55 ? 1 : Math.max(0, 1 - (lt - 0.55) / 0.2); if (h.k > 0.6) A.hit(e, { x: h.x - 6, y: h.gy - 28, w: 12, h: 28 }, { kb: 0.6 }); } },
        draw(e, ctx, ox, oy, A) {
          for (const h of e.hands) {
            if (!h.k) continue; const x = h.x + ox, gy = h.gy + oy, hh = 26 * h.k * H.sc(e);
            A.px(ctx, x - 2, gy - hh, 4, hh, '#05020a'); A.px(ctx, x - 1, gy - hh, 1, hh, e.pal.d);
            for (let f = -2; f <= 2; f++) { A.px(ctx, x + f * 2, gy - hh - 4 + Math.abs(f), 1, 4, '#05020a'); A.px(ctx, x + f * 2, gy - hh - 5 + Math.abs(f), 1, 1, e.pal.c); }
          }
        },
      },
      {
        name: 'Dread Tide', dmg: 12, cd: 6, mp: 6, kind: 'custom', life: 1.1,
        desc: 'A low tide of black ooze rolls forward, full of staring eyes.',
        spawn(e, g, A) { H.at(e, A, 8); e.gy = H.floor(A, e.x); e.vx = e.dir * 150; A.sfx('whoosh'); },
        update(e, dt, g, A) { e.x += e.vx * dt; e.gy = A.ground(e.x, e.gy - 16); if (A.solid(e.x + e.dir * 6, e.gy - 6)) { e.dead = true; return; } A.hit(e, { x: e.x - 20, y: e.gy - 14, w: 26, h: 14 }, { dir: e.dir, kb: 0.8 }); },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, gy = e.gy + oy, d = e.dir, s = H.sc(e);
          for (let i = 0; i < 30; i++) { const h = (4 + Math.sin(i * 0.8 + e.t * 12) * 2) * s * (i < 6 ? i / 6 : 1); A.px(ctx, x - d * i, gy - h, 1, h, i % 4 ? '#05020a' : e.pal.d); }
          for (let i = 0; i < 3; i++) EYES(ctx, A, x - d * (6 + i * 9), gy - 4, i % 2 ? e.pal.c : '#ff3a4a');
        },
      },
      {
        name: 'Shadow Bind', dmg: 10, cd: 6, mp: 5, kind: 'custom', life: 0.7,
        desc: 'A tendril shoots out, grabs the first enemy and drags it to you.',
        spawn(e, g, A) { A.sfx('whoosh'); },
        update(e, dt, g, A) {
          H.at(e, A, 6, -1);
          if (!e.grab) {
            e.L = Math.min(110 * H.sc(e), e.t * 500);
            A.hit(e, { x: e.dir > 0 ? e.x : e.x - e.L, y: e.y - 5, w: e.L, h: 10 }, { kb: 0, onHit(t) { e.grab = t; } });
          } else if (!e.grab.tutorial && !e.grab.dead) {
            const c = A.center(e.grab); e.L = Math.abs(c.x - e.x);
            if (e.L > 14) e.grab.vx = -e.dir * 260; else e.grab.vx = 0;
          }
        },
        draw(e, ctx, ox, oy, A) { TENDRIL(ctx, A, e.x + ox, e.y + oy, e.x + ox + e.dir * (e.L || 0), e.y + oy, 1, e.pal, e.t * 20); A.disc(ctx, e.x + ox + e.dir * (e.L || 0), e.y + oy, 2, e.pal.c); },
      },
    ],
    ult: {
      name: 'Endless Night', dmg: 22,
      desc: 'Shadows swallow the light. In total darkness, red-eyed claws tear into every enemy, then a black crescent ends the night.',
      charge: {
        pose: 'raiseBoth', lift: 0,
        draw(ctx, x, y, k, t, A, P) {
          A.alpha(ctx, 0.5 * k, () => A.px(ctx, x - 300, y - 200, 600, 400, '#05020a'));
          for (let i = 0; i < 8; i++) { const sx = x - 26 + i * 7.5; TENDRIL(ctx, A, sx, y + 14, sx + Math.sin(t * 3 + i) * 8, y + 14 - (16 + (i % 3) * 10) * k, 1, P, t * 5 + i); }
          if (k > 0.5) for (let i = 0; i < 5; i++) EYES(ctx, A, x - 30 + i * 15, y - 24 + Math.sin(i * 2) * 6, '#ff3a4a');
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3, layer: 'screen',
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 300).map((o) => o.t); e.claws = []; A.sfx('surge'); },
          update(e, dt, g, A) {
            e.ct = (e.ct || 0) - dt;
            if (e.t < 1.9 && e.ct <= 0 && e.ts.length) {
              e.ct = 0.12; const t = e.ts[Math.floor(Math.random() * e.ts.length)];
              if (t && !t.dead) { const c = A.center(t); A.damage(e, t, 0.45, 0.2); e.claws.push({ x: c.x, y: c.y, a: A.rnd(-1, 1), t: 0 }); A.sfx('swing', { minGap: 0.03 }); }
            }
            for (const c of e.claws) c.t += dt;
            if (e.t > 2 && !e.cres) { e.cres = true; A.spawn(e, { life: 0.8, spawn(c) { c.x = p.cx; c.y = p.y + 10; c.vx = c.dir * 320; A.sfx('shockwave'); }, update(c, dt, g, A) { c.x += c.vx * dt; A.hit(c, { x: c.x - 20, y: c.y - 40, w: 40, h: 80 }, { mult: 1.6, dir: c.dir }); }, draw(c, ctx, ox, oy, A) { A.alpha(ctx, A.fade(c, 0.05, 0.3), () => { A.arc(ctx, c.x + ox, c.y + oy, 40, c.dir, '#05020a', 8, -1.4, 1.4); A.arc(ctx, c.x + ox, c.y + oy, 38, c.dir, c.pal.c, 3, -1.3, 1.3); }); } }, {}); A.shake(5, 0.4); }
          },
          draw(e, ctx, ox, oy, A) {
            const dark = e.t < 2 ? Math.min(1, e.t * 4) * 0.85 : Math.max(0, 0.85 - (e.t - 2) * 1.5);
            A.alpha(ctx, dark, () => A.px(ctx, -10, -10, 2000, 2000, '#020104'));
            for (const t of e.ts) if (!t.dead && e.t < 2) { const c = A.center(t); EYES(ctx, A, c.x + ox, c.y + oy - 6, '#ff3a4a'); }
            for (const c of e.claws) if (c.t < 0.2) A.alpha(ctx, 1 - c.t / 0.2, () => { for (let i = -1; i <= 1; i++) A.line(ctx, c.x + ox - 10 + i * 4, c.y + oy - 10 + c.a * 4, c.x + ox + 10 + i * 4, c.y + oy + 10 - c.a * 4, i ? '#ff3a4a' : '#ffffff', 1); });
          },
        }, {});
      },
    },
  };

  // =================================================================== SHADOW
  const SMOKE = { life: 1, update(e, dt) { e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= 1 - dt * 2; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 0.6 * (1 - e.t / e.life), () => A.disc(ctx, e.x + ox, e.y + oy, Math.round(3 + e.t * 6), '#3a3a4a')); } };
  const STAR4 = (ctx, A, x, y, a, s, P) => { for (let k = 0; k < 4; k++) { const aa = a + (k * Math.PI) / 2; for (let r = 0; r < 5 * s; r++) A.px(ctx, x + Math.cos(aa) * r, y + Math.sin(aa) * r, 1, 1, r > 3 * s ? '#ffffff' : P.c); } A.px(ctx, x - 1, y - 1, 2, 2, '#22222e'); };
  K.shadow = {
    status: 'expose', fx: 'wisps', block: ['Shade Guard', 'veil'], dash: ['Shadow Dash', 'blink'],
    m1: {
      name: 'Shadow Stab', dmg: 8, cd: 0.42, kind: 'custom', life: 0.2,
      desc: 'Lunge forward and stab, leaving afterimages behind.',
      spawn(e, g, A) { const p = A.p; e.dir = p.facing; p.vx = e.dir * (40 * H.sc(e)) / 0.14; p.lungeT = 0.14; A.sfx('dash'); e.imgs = []; },
      update(e, dt, g, A) { const p = A.p; e.x = p.cx; e.y = p.y + 10; e.imgs.push({ x: p.cx, f: p.feet }); A.hit(e, { x: e.dir > 0 ? p.cx : p.cx - 20, y: p.y + 2, w: 20, h: 16 }, { dir: e.dir }); },
      draw(e, ctx, ox, oy, A) {
        
        e.imgs.slice(-3).forEach((im, i) => A.alpha(ctx, 0.25 + i * 0.15, () => H.drawGhost(ctx, A, 'attack', im.x + ox - e.dir * 4, im.f + oy, e.dir, e.pal.d)));
        A.line(ctx, e.x + ox + e.dir * 6, e.y + oy - 1, e.x + ox + e.dir * 18, e.y + oy - 1, e.up ? e.pal.c : '#c8c8d8', 1);
        A.px(ctx, e.x + ox + e.dir * 18, e.y + oy - 2, 2, 3, '#ffffff');
      },
    },
    s: [
      {
        name: 'Shadow Clone', dmg: 14, cd: 8, mp: 7, kind: 'custom', life: 0.5,
        desc: 'A shadow copy of you dashes ahead and cuts through everything.',
        spawn(e, g, A) { const p = A.p; e.dir = p.facing; e.x = p.cx; e.f = p.feet; e.sx = p.cx; A.sfx('dash'); },
        update(e, dt, g, A) { e.x = e.sx + e.dir * 140 * H.sc(e) * U.ease.outCubic(Math.min(1, e.t / 0.32)); A.hit(e, { x: e.x - 8, y: e.f - 22, w: 16, h: 22 }, { dir: e.dir }); },
        draw(e, ctx, ox, oy, A) { A.alpha(ctx, 0.85 * (1 - Math.max(0, e.t - 0.32) / 0.18), () => { H.drawGhost(ctx, A, 'dash', e.x + ox, e.f + oy, e.dir, '#22222e'); A.px(ctx, e.x + ox + e.dir * 2, e.f + oy - 19, 2, 1, e.pal.c); }); },
      },
      {
        name: 'Shadow Shuriken', dmg: 12, cd: 4, mp: 5, kind: 'custom', life: 1.4,
        desc: 'A spinning star of shadow that flies out and comes back.',
        spawn(e, g, A) { H.at(e, A, 8, -1); e.sx = e.x; A.sfx('whoosh'); },
        update(e, dt, g, A) {
          const p = A.p;
          if (e.t < 0.55) e.x = e.sx + e.dir * 130 * H.sc(e) * Math.sin((e.t / 0.55) * Math.PI / 2);
          else { if (!e.back) { e.back = true; e.hit.clear(); } e.x = U.approach(e.x, p.cx, 8, dt); e.y = U.approach(e.y, p.y + 10, 8, dt); if (Math.abs(e.x - p.cx) < 8) e.dead = true; }
          A.hit(e, { x: e.x - 6, y: e.y - 6, w: 12, h: 12 }, { kb: 0.6 });
        },
        draw(e, ctx, ox, oy, A) { STAR4(ctx, A, e.x + ox, e.y + oy, e.t * 22, H.sc(e), e.pal); },
      },
      {
        name: 'Umbral Step', dmg: 18, cd: 5, mp: 5, kind: 'custom', life: 0.35,
        desc: 'Melt into the floor and appear BEHIND the nearest enemy with a stab.',
        spawn(e, g, A) {
          const p = A.p, t = A.near(p.cx, p.y, 150);
          e.from = { x: p.cx, f: p.feet };
          if (t) {
            const c = A.center(t), side = c.x > p.cx ? 1 : -1, nx = c.x + side * 14 - p.w / 2;
            if (!Phys().overlapsSolid(g.level, nx, p.y, p.w, p.h)) { p.x = nx; p.facing = -side; }
            e.dir = p.facing; A.damage(e, t, 1, 0.5);
          }
          e.to = { x: p.cx, f: p.feet }; A.sfx('dash');
        },
        draw(e, ctx, ox, oy, A) {
          const k = e.t / e.life;
          for (const pt of [e.from, e.to]) A.alpha(ctx, 1 - k, () => { A.px(ctx, pt.x + ox - 10, pt.f + oy - 1, 20, 2, '#05020a'); for (let i = 0; i < 4; i++) A.px(ctx, pt.x + ox - 6 + i * 4, pt.f + oy - 3 - (i % 2) * 4 * (1 - k), 1, 3, e.pal.c); });
        },
      },
      {
        name: 'Smoke Bomb', dmg: 8, cd: 9, mp: 6, kind: 'custom', life: 3,
        desc: 'Throw down a smoke bomb. Enemies in the smoke lose sight of you.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx; e.gy = p.feet; A.sfx('pop'); for (let i = 0; i < 20; i++) A.spawn(e, SMOKE, { x: e.x, y: e.gy - 8, vx: A.rnd(-90, 90), vy: A.rnd(-50, 10), life: 1.5 }); },
        update(e, dt, g, A) {
          const R = 40 * H.sc(e);
          for (const o of H.nearby(A, e.x, e.gy - 10, R)) if (o.t.applyStatus && !o.t.status.blind) o.t.applyStatus('blind', e.potency);
          A.tick(e, { x: e.x - R, y: e.gy - R, w: R * 2, h: R }, 0.6, { kb: 0, mult: 0.5 });
          if (Math.random() < dt * 8) A.spawn(e, SMOKE, { x: e.x + A.rnd(-R, R), y: e.gy - A.rnd(4, 20), vx: A.rnd(-10, 10), vy: -6 });
        },
        draw(e, ctx, ox, oy, A) { A.alpha(ctx, A.fade(e, 0.1, 0.6) * 0.5, () => { for (let i = 0; i < 8; i++) A.disc(ctx, e.x + ox + Math.sin(i * 2 + e.t) * 26, e.gy + oy - 10 - (i % 3) * 7, 8, '#4a4a5a'); }); },
      },
      {
        name: 'Shadow Mark', dmg: 30, cd: 7, mp: 6, kind: 'custom', life: 2.2,
        desc: 'Throw a kunai. Whatever it sticks in explodes a moment later.',
        spawn(e, g, A) { H.at(e, A, 8, -1); e.vx = e.dir * 300; A.sfx('whoosh'); },
        update(e, dt, g, A) {
          if (!e.stuck) {
            e.x += e.vx * dt;
            const t = A.targets().find((t) => Phys().rectsOverlap(t.box, { x: e.x - 3, y: e.y - 3, w: 6, h: 6 }));
            if (t) { e.stuck = t; e.st = e.t; e.off = e.x - A.center(t).x; A.sfx('punchHit'); if (t.applyStatus) t.applyStatus('expose', e.potency); }
            else if (A.solid(e.x, e.y) || e.t > 0.8) e.dead = true;
          } else {
            if (!e.stuck.dead) { const c = A.center(e.stuck); e.x = c.x + e.off; e.y = c.y; }
            if (e.t - e.st > 1.2) { A.blast(e, e.x, e.y, 30 * H.sc(e)); e.dead = true; }
          }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, d = e.dir;
          A.line(ctx, x - d * 6, y, x, y, '#8a8aa0', 1); A.px(ctx, x, y - 1, 2, 3, '#c8c8d8'); A.px(ctx, x - d * 8, y - 1, 2, 3, e.pal.c);
          if (e.stuck) { const k = (e.t - e.st) / 1.2; A.alpha(ctx, 0.5 + 0.5 * Math.sin(k * 40), () => A.ring(ctx, x, y, 4 + k * 8, e.pal.c)); }
        },
      },
    ],
    ult: {
      name: 'Eclipse Execution', dmg: 22,
      desc: "Vanish into the enemy's own shadow, surround it with shadow clones that all strike at once, then emerge with one final slash.",
      charge: {
        pose: 'crouch', lift: 0,
        draw(ctx, x, y, k, t, A, P) {
          const w = 10 + k * 24;
          A.px(ctx, x - w, y + 11, w * 2, 3 + k * 2, '#05020a');
          A.alpha(ctx, k, () => A.px(ctx, x - 9, y + 14 - 14 * k, 18, 14 * k, '#05020a'));
          for (let i = 0; i < 8; i++) A.px(ctx, x - w + i * (w / 4), y + 10 - ((i + Math.floor(t * 12)) % 4), 1, 2, P.c);
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 1.6,
          spawn(e) {
            const t = A.near(p.cx, p.y, 260); e.tg = t; const c = t ? A.center(t) : { x: p.cx + e.dir * 60, y: p.y + 10 }; e.c = c;
            const nx = c.x - e.dir * 16 - p.w / 2; if (!Phys().overlapsSolid(A.g.level, nx, p.y, p.w, p.h)) p.x = nx; p.facing = e.dir;
            e.clones = [0, 1, 2, 3, 4].map((i) => { const a = -Math.PI + (i / 4) * Math.PI; return { x: c.x + Math.cos(a) * 34, y: c.y + Math.sin(a) * 20 - 4 }; });
            A.sfx('dash');
          },
          update(e, dt, g, A) {
            if (e.t > 0.45 && !e.strike) { e.strike = true; if (e.tg) for (let i = 0; i < 5; i++) A.damage(e, e.tg, 0.8, 0.1); A.shake(4, 0.3); A.sfx('swing'); A.flash(0.2); }
            if (e.t > 0.9 && !e.final) { e.final = true; A.hitR(e, e.c.x, e.c.y, 30, { mult: 3, kb: 2 }); A.shake(6, 0.4); A.sfx('shockwave'); }
          },
          draw(e, ctx, ox, oy, A) {
            
            if (e.t < 0.6) for (const cl of e.clones) {
              const k = Math.min(1, e.t / 0.45), x = U.lerp(cl.x, e.c.x, e.t > 0.45 ? 1 : k * k * 0.3), d = cl.x < e.c.x ? 1 : -1;
              A.alpha(ctx, Math.min(1, e.t * 6) * (e.t > 0.5 ? (0.6 - e.t) * 10 : 1), () => H.drawGhost(ctx, A, e.t > 0.4 ? 'attack' : 'idle', x + ox, cl.y + 12 + oy, d, '#22222e'));
              if (e.t > 0.4 && e.t < 0.5) A.line(ctx, cl.x + ox, cl.y + oy, e.c.x + ox, e.c.y + oy, e.pal.c, 1);
            }
            if (e.t > 0.9 && e.t < 1.3) { const k = (e.t - 0.9) / 0.4; A.alpha(ctx, 1 - k, () => { A.arc(ctx, e.c.x + ox, e.c.y + oy, 26 + k * 10, e.dir, '#05020a', 6, -1.5, 1.5); A.arc(ctx, e.c.x + ox, e.c.y + oy, 24 + k * 10, e.dir, e.pal.c, 2, -1.4, 1.4); }); }
          },
        }, {});
      },
    },
  };

  // ==================================================================== LIGHT
  const MOTE = { life: 0.8, update(e, dt) { e.y -= 40 * dt; e.x += Math.sin(e.t * 8 + e.ph) * 10 * dt; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => A.px(ctx, e.x + ox, e.y + oy, 1, 1, e.pal.l)); } };
  const RAYS = (ctx, A, x, y, r, n, a0, col) => { for (let i = 0; i < n; i++) { const a = a0 + (i / n) * Math.PI * 2; A.line(ctx, x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, x + Math.cos(a) * r, y + Math.sin(a) * r, col); } };
  K.light = {
    status: 'dazzle', fx: 'motes', block: ['Light Barrier', 'shield'], dash: ['Light Speed', 'blink'],
    m1: {
      name: 'Light Lance', dmg: 7, cd: 0.38, kind: 'custom', life: 0.22,
      desc: 'Thrust a spear of pure light that extends and retracts in a flash.',
      spawn(e, g, A) { A.sfx('cast', { minGap: 0.04 }); },
      update(e, dt, g, A) {
        H.at(e, A, 6, -1); const k = e.t < 0.08 ? e.t / 0.08 : 1 - (e.t - 0.08) / 0.14;
        e.L = 90 * H.sc(e) * Math.max(0, k);
        A.hit(e, { x: e.dir > 0 ? e.x : e.x - e.L, y: e.y - 3, w: e.L, h: 6 }, { dir: e.dir });
      },
      draw(e, ctx, ox, oy, A) {
        const x = e.x + ox, y = e.y + oy, L = e.L || 0, d = e.dir;
        A.px(ctx, d > 0 ? x : x - L, y - 1, L, 3, e.pal.c); A.px(ctx, d > 0 ? x : x - L, y, L, 1, '#ffffff');
        A.tri(ctx, x + d * L, y + 4, 6, 0, e.pal.l);
        for (let i = 0; i < 4; i++) A.px(ctx, x + d * (L - 2 - i * 2), y - 3 + i * 2, 3, 1, '#ffffff');
        if (e.up) A.glow(ctx, x + d * L, y, 4, e.pal.l, 0.4);
      },
    },
    s: [
      {
        name: 'Radiant Burst', dmg: 14, cd: 6, mp: 6, kind: 'custom', life: 0.45,
        desc: 'Explode with blinding rays of light in every direction.',
        spawn(e, g, A) { A.sfx('shockwave', { minGap: 0.1 }); A.flash(0.15); },
        update(e, dt, g, A) { const p = A.p; e.x = p.cx; e.y = p.y + 10; A.hitR(e, e.x, e.y, 64 * H.sc(e) * Math.min(1, e.t / 0.25), { kb: 1.2 }); },
        draw(e, ctx, ox, oy, A) { const R = 64 * H.sc(e) * Math.min(1, e.t / 0.25); A.alpha(ctx, 1 - e.t / e.life, () => { RAYS(ctx, A, e.x + ox, e.y + oy, R, 16, e.t, e.pal.c); RAYS(ctx, A, e.x + ox, e.y + oy, R * 0.7, 16, e.t + 0.2, '#ffffff'); }); },
      },
      {
        name: 'Holy Pillars', dmg: 14, cd: 5, mp: 6, kind: 'custom', life: 1.2,
        desc: 'Beams of holy light slam down from the heavens.',
        spawn(e, g, A) {
          H.at(e, A, 0); const ax = A.aim(e, 150), start = ax !== null ? Math.abs(ax - e.x) : 34;
          e.cols = []; for (let i = 0; i < (e.up ? 5 : 3); i++) { const x = e.x + e.dir * (start + (i - 1) * 34); const gy = H.floor(A, x); e.cols.push({ x, gy, top: H.sky(A, x, gy - 8), d: i * 0.1 }); }
        },
        update(e, dt, g, A) { for (const c of e.cols) { c.lt = e.t - c.d; if (c.lt > 0.25 && !c.b) { c.b = true; A.sfx('zap', { minGap: 0.04 }); A.shake(1.5, 0.1); } if (c.lt > 0.25 && c.lt < 0.6) A.hit(e, { x: c.x - 8, y: c.top, w: 16, h: c.gy - c.top }, { kb: 0.5 }); } },
        draw(e, ctx, ox, oy, A) {
          for (const c of e.cols) {
            if (!(c.lt > 0) || c.lt > 0.8) continue; const x = c.x + ox, gy = c.gy + oy, top = c.top + oy;
            if (c.lt < 0.25) { A.alpha(ctx, 0.4, () => A.px(ctx, x - 1, top, 2, gy - top, e.pal.l)); continue; }
            A.alpha(ctx, c.lt > 0.6 ? 1 - (c.lt - 0.6) / 0.2 : 1, () => { A.px(ctx, x - 7, top, 14, gy - top, e.pal.c); A.px(ctx, x - 3, top, 6, gy - top, '#ffffff'); RAYS(ctx, A, x, gy - 2, 14, 8, 0, e.pal.l); });
          }
        },
      },
      {
        name: 'Healing Light', dmg: 0, cd: 12, mp: 8, kind: 'custom', life: 0.9,
        desc: 'A warm column of light that restores your health.',
        spawn(e, g, A) { const p = A.p, amt = Math.round(30 * (e.up ? 1.6 : 1)); p.hp = Math.min(p.maxHp, p.hp + amt); A.g.floatText(p.cx, p.y - 10, '+' + amt + ' HP', '#7af0a0'); A.sfx('revive'); for (let i = 0; i < 14; i++) A.spawn(e, MOTE, { x: p.cx + A.rnd(-8, 8), y: p.feet - A.rnd(0, 20), ph: i }); },
        update(e, dt, g, A) { e.x = A.p.cx; e.f = A.p.feet; },
        draw(e, ctx, ox, oy, A) { A.alpha(ctx, (1 - e.t / e.life) * 0.5, () => { A.px(ctx, e.x + ox - 8, e.f + oy - 60, 16, 60, e.pal.l); A.px(ctx, e.x + ox - 3, e.f + oy - 60, 6, 60, '#ffffff'); }); },
      },
      {
        name: 'Blinding Flash', dmg: 8, cd: 6, mp: 5, kind: 'custom', life: 0.35,
        desc: 'A blinding flash in front of you that dazzles everything it touches.',
        spawn(e, g, A) {
          H.at(e, A, 4, -2); A.sfx('cast'); A.flash(0.12);
          for (const o of H.nearby(A, e.x, e.y, 90 * H.sc(e))) if ((o.c.x - e.x) * e.dir > -4) { A.damage(e, o.t, 1, 0.3); if (o.t.applyStatus) { o.t.applyStatus('dazzle', e.potency); if (o.t.status.dazzle) o.t.status.dazzle.t = 4; } }
        },
        draw(e, ctx, ox, oy, A) { const k = e.t / e.life, L = 90 * H.sc(e); A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 12; i++) { const a = -0.6 + i * 0.11; A.line(ctx, e.x + ox, e.y + oy, e.x + ox + Math.cos(a) * L * e.dir, e.y + oy + Math.sin(a) * L, i % 2 ? '#ffffff' : e.pal.l); } }); },
      },
      {
        name: 'Guardian Angel', dmg: 5, cd: 13, mp: 8, kind: 'custom', life: 6,
        desc: 'A winged guardian of light floats above you, firing light at enemies.',
        spawn(e, g, A) { A.sfx('star'); e.st = 0.5; },
        update(e, dt, g, A) {
          const p = A.p; e.x = U.approach(e.x, p.cx - p.facing * 10, 4, dt); e.y = U.approach(e.y, p.y - 18 + Math.sin(e.t * 3) * 3, 4, dt);
          e.st -= dt;
          if (e.st <= 0) { const t = A.near(e.x, e.y, 170); if (t) { e.st = e.up ? 0.4 : 0.6; const c = A.center(t), a = Math.atan2(c.y - e.y, c.x - e.x); A.spawn(e, H.proj((b, ctx, ox, oy, A) => { A.px(ctx, b.x + ox - 1, b.y + oy - 1, 3, 3, b.pal.c); A.px(ctx, b.x + ox, b.y + oy, 1, 1, '#ffffff'); }, { life: 0.8, r: 3 }), { vx: Math.cos(a) * 240, vy: Math.sin(a) * 240 }); A.sfx('tick', { value: 95, minGap: 0.05 }); } else e.st = 0.2; }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, flap = Math.sin(e.t * 8) * 2;
          A.alpha(ctx, A.fade(e, 0.3, 0.5), () => {
            A.ring(ctx, x, y - 7, 3, e.pal.c, 1);
            for (const s of [-1, 1]) for (let i = 0; i < 6; i++) A.px(ctx, x + s * (3 + i), y - 2 - (i < 3 ? i : 5 - i) - flap, 1, 3, i % 2 ? '#ffffff' : e.pal.l);
            A.px(ctx, x - 2, y - 4, 4, 7, '#fff8e0'); A.px(ctx, x - 1, y - 6, 2, 2, '#ffe0c0');
          });
        },
      },
    ],
    ult: {
      name: 'Divine Judgment', dmg: 7,
      desc: 'Rise into the air, gather an enormous sphere of light, and fire a concentrated beam straight through the battlefield.',
      charge: {
        pose: 'raiseBoth', lift: 30,
        draw(ctx, x, y, k, t, A, P) {
          const bx = x, by = y - 30, r = Math.round(3 + k * 15);
          A.glow(ctx, bx, by, r + 6, '#ffffff', 0.25); A.disc(ctx, bx, by, r, P.c, '#ffffff');
          RAYS(ctx, A, bx, by, r + 10 + Math.sin(t * 10) * 3, 12, t * 2, P.l);
          for (let i = 0; i < 10; i++) { const a = i * 0.63 + t * 4, d = 40 * (1 - ((t * 1.6 + i * 0.1) % 1)); A.px(ctx, bx + Math.cos(a) * d, by + Math.sin(a) * d, 1, 1, '#ffffff'); }
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 1.8,
          spawn(e) { A.sfx('surge'); A.sfx('zap'); A.flash(0.5); A.shake(5, 1.6); },
          update(e, dt, g, A) { e.x = p.cx + e.dir * 6; e.y = p.y + 8; const w = 26 * H.sc(e); A.tick(e, { x: e.dir > 0 ? e.x : e.x - 600, y: e.y - w / 2, w: 600, h: w }, 0.1, { kb: 0.3 }); p.vx = -e.dir * 20; },
          draw(e, ctx, ox, oy, A) {
            const w = 26 * H.sc(e) * (e.t > 1.5 ? (1.8 - e.t) / 0.3 : Math.min(1, e.t * 8)), x = e.x + ox, y = e.y + oy, L = 600;
            const x0 = e.dir > 0 ? x : x - L;
            A.px(ctx, x0, y - w / 2, L, w, e.pal.c); A.px(ctx, x0, y - w / 3, L, w * 0.66, e.pal.l); A.px(ctx, x0, y - w / 6, L, w / 3, '#ffffff');
            for (let i = 0; i < 20; i++) A.px(ctx, x + e.dir * ((i * 37 + e.t * 900) % L), y - w / 2 - 2 + (i % 2) * (w + 2), 6, 1, '#ffffff');
            A.disc(ctx, x, y, Math.round(w * 0.6), '#ffffff');
          },
        }, {});
      },
    },
  };

  // =================================================================== ARCANE
  const RUNE = (ctx, A, x, y, i, col) => { const g = [[0, -2, 0, 2], [-2, 0, 2, 0], [-2, -2, 2, 2], [2, -2, -2, 2]][i % 4]; A.line(ctx, x + g[0], y + g[1], x + g[2], y + g[3], col); A.px(ctx, x, y - 3, 1, 1, col); };
  const CIRCLE = (ctx, A, x, y, r, t, P, n) => { A.ring(ctx, x, y, r, P.c, r * 0.35); A.ring(ctx, x, y, r * 0.7, P.l, r * 0.25); for (let i = 0; i < (n || 6); i++) { const a = t + (i / (n || 6)) * Math.PI * 2; RUNE(ctx, A, x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.3, i, '#ffffff'); } };
  const ARC_BOLT = H.proj((b, ctx, ox, oy, A) => { A.disc(ctx, b.x + ox, b.y + oy, b.up ? 3 : 2, b.pal.c, '#ffffff'); RUNE(ctx, A, b.x + ox - b.vx * 0.03, b.y + oy - b.vy * 0.03, Math.floor(b.t * 10), b.pal.l); }, { life: 1.6, r: 3, homing: 7 });
  K.arcane = {
    status: 'mark', fx: 'runes', block: ['Rune Shield', 'shield'], dash: ['Blink', 'blink'],
    m1: {
      name: 'Arcane Missile', dmg: 7, cd: 0.45, kind: 'custom', life: 0.01,
      desc: 'A homing missile of raw magic trailing runes.',
      spawn(e, g, A) { H.at(e, A, 8, -1); A.sfx('cast', { minGap: 0.04 }); A.spawn(e, ARC_BOLT, { vx: e.dir * 200, vy: -20 }); if (e.up) A.spawn(e, ARC_BOLT, { vx: e.dir * 180, vy: 40 }); },
    },
    s: [
      {
        name: 'Rune Trap', dmg: 6, cd: 6, mp: 5, kind: 'custom', life: 7,
        desc: 'Draw a glowing rune on the floor. It explodes when an enemy steps on it.',
        spawn(e, g, A) { H.at(e, A, 30); e.gy = H.floor(A, e.x); A.sfx('cast'); },
        update(e, dt, g, A) { const R = 22 * H.sc(e); if (A.targets().some((t) => Phys().rectsOverlap(t.box, { x: e.x - R, y: e.gy - 10, w: R * 2, h: 10 }))) { A.blast(e, e.x, e.gy - 8, 40 * H.sc(e), { dmg: e.dmg * 5 }); e.dead = true; } },
        draw(e, ctx, ox, oy, A) { const R = 22 * H.sc(e); A.alpha(ctx, A.fade(e, 0.3, 0.5) * (0.7 + 0.3 * Math.sin(e.t * 5)), () => CIRCLE(ctx, A, e.x + ox, e.gy + oy - 2, R, e.t, e.pal, 5)); },
      },
      {
        name: 'Arcane Blast', dmg: 18, cd: 5, mp: 6, kind: 'custom', life: 1.4,
        desc: 'A big orb of magic. On impact it splits into three homing missiles.',
        spawn(e, g, A) { H.at(e, A, 10, -2); e.vx = e.dir * 170; A.sfx('cast'); },
        update(e, dt, g, A) {
          const r = H.fly(e, dt, A, { r: 7 });
          if (r || e.t > 1.3) { A.blast(e, e.x, e.y, 34 * H.sc(e)); for (let i = 0; i < 3; i++) A.spawn(e, ARC_BOLT, { vx: -e.dir * 100 + A.rnd(-50, 50), vy: -150 + i * 60, dmg: e.dmg * 0.4 }); e.dead = true; }
        },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, r = Math.round(6 * H.sc(e)); A.disc(ctx, x, y, r, e.pal.c, e.pal.l); for (let i = 0; i < 3; i++) RUNE(ctx, A, x + Math.cos(e.t * 8 + i * 2.1) * (r + 4), y + Math.sin(e.t * 8 + i * 2.1) * (r + 4), i, '#ffffff'); },
      },
      {
        name: 'Mana Surge', dmg: 0, cd: 14, mp: 0, kind: 'custom', life: 6,
        desc: 'Refill your mana and recharge your skills twice as fast for a while.',
        spawn(e, g, A) { const p = A.p; p.mp = p.maxMp; p.ab.buffs.mana = { t: e.life * (e.up ? 1.5 : 1), up: e.up, pal: e.pal }; A.g.floatText(p.cx, p.y - 10, 'MANA SURGE!', e.pal.l); A.sfx('star'); },
        update(e, dt, g, A) { e.x = A.p.cx; e.y = A.p.y + 10; if (!A.p.ab.buffs.mana) e.dead = true; },
        draw(e, ctx, ox, oy, A) { for (let i = 0; i < 4; i++) { const a = e.t * 3 + i * 1.57; RUNE(ctx, A, e.x + ox + Math.cos(a) * 14, e.y + oy + Math.sin(a) * 9, i, e.pal.l); } },
      },
      {
        name: 'Arcane Barrage', dmg: 4, cd: 7, mp: 7, kind: 'custom', life: 1,
        desc: 'Unleash a rapid stream of little homing bolts.',
        spawn(e, g, A) { A.sfx('cast'); },
        update(e, dt, g, A) { H.at(e, A, 8, -2); e.ft = (e.ft || 0) - dt; if (e.ft <= 0) { e.ft = e.up ? 0.07 : 0.1; A.spawn(e, ARC_BOLT, { vx: e.dir * 220, vy: A.rnd(-90, 90), life: 1.2 }); A.sfx('tick', { value: 80, minGap: 0.04 }); } },
        draw(e, ctx, ox, oy, A) { CIRCLE(ctx, A, e.x + ox + e.dir * 4, e.y + oy, 7, e.t * 6, e.pal, 4); },
      },
      {
        name: 'Spell Mirror', dmg: 6, cd: 10, mp: 6, kind: 'custom', life: 4,
        desc: 'A spinning hexagon of magic guards your front, erasing projectiles and hurting anything that touches it.',
        spawn(e, g, A) { A.sfx('star'); },
        update(e, dt, g, A) {
          H.at(e, A, 18, -2);
          for (const b of A.g.bolts) if (Math.abs(b.x - e.x) < 12 && Math.abs(b.y - e.y) < 14) { b.dead = true; A.puff(e, b.x, b.y, 4); A.sfx('tick', { value: 70, minGap: 0.05 }); }
          A.tick(e, { x: e.x - 10, y: e.y - 14, w: 22, h: 28 }, 0.4, { kb: 1.2 });
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, s = H.sc(e);
          A.alpha(ctx, A.fade(e, 0.2, 0.3), () => { for (let i = 0; i < 6; i++) { const a = e.t * 2 + (i / 6) * Math.PI * 2, b = a + Math.PI / 3; A.line(ctx, x + Math.cos(a) * 6 * s, y + Math.sin(a) * 14 * s, x + Math.cos(b) * 6 * s, y + Math.sin(b) * 14 * s, i % 2 ? e.pal.c : '#ffffff'); } RUNE(ctx, A, x, y, Math.floor(e.t * 4), e.pal.l); });
        },
      },
    ],
    ult: {
      name: 'Grand Arcanum', dmg: 20,
      desc: 'Massive magic circles surround the enemy, each firing a different devastating spell, then merge into one enormous arcane blast.',
      charge: {
        pose: 'raiseBoth', lift: 6,
        draw(ctx, x, y, k, t, A, P) { for (let i = 0; i < 3; i++) A.alpha(ctx, Math.min(1, k * 3 - i), () => CIRCLE(ctx, A, x, y - 4 + i * 2, 10 + i * 8 + k * 4, t * (i % 2 ? -2 : 2), P, 6)); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3,
          spawn(e) {
            const t = A.near(p.cx, p.y, 280); e.tg = t; e.c = t ? A.center(t) : { x: p.cx + e.dir * 90, y: p.y + 4 };
            e.circ = [[-40, -10], [40, -10], [-22, -40], [22, -40]].map(([dx, dy], i) => ({ x: e.c.x + dx, y: e.c.y + dy, i, fired: false }));
            A.sfx('star');
          },
          update(e, dt, g, A) {
            if (e.tg && !e.tg.dead) e.c = A.center(e.tg);
            for (const c of e.circ) if (!c.fired && e.t > 0.4 + c.i * 0.3) {
              c.fired = true; c.ft = e.t;
              const col = ['#ff6a3a', '#a8e8ff', '#ffd23a', '#c86aff'][c.i];
              if (e.tg) A.damage(e, e.tg, 0.8, 0.3);
              const st = ['burn', 'chill', 'shock', 'mark'][c.i]; if (e.tg && e.tg.applyStatus) e.tg.applyStatus(st, 0);
              A.sfx(['ignite', 'glassCrack', 'zap', 'cast'][c.i]); c.col = col;
            }
            if (e.t > 1.9 && !e.boom) { e.boom = true; A.blast(e, e.c.x, e.c.y - 10, 100 * H.sc(e), { dmg: e.dmg * 2.2 }); A.flash(0.5); A.shake(7, 0.5); }
          },
          draw(e, ctx, ox, oy, A) {
            const merge = U.clamp((e.t - 1.5) / 0.4, 0, 1);
            for (const c of e.circ) {
              if (e.t < 0.1 + c.i * 0.15) continue;
              const x = U.lerp(c.x, e.c.x, merge) + ox, y = U.lerp(c.y, e.c.y - 40, merge) + oy;
              if (e.t < 1.9) CIRCLE(ctx, A, x, y, 14 + merge * 10, e.t * (c.i % 2 ? 3 : -3), e.pal, 6);
              if (c.ft && e.t - c.ft < 0.2) { A.line(ctx, x, y, e.c.x + ox, e.c.y + oy, c.col, 3); A.line(ctx, x, y, e.c.x + ox, e.c.y + oy, '#ffffff', 1); }
            }
            if (merge > 0 && e.t < 1.95) CIRCLE(ctx, A, e.c.x + ox, e.c.y + oy - 40, 28 * merge, e.t * 5, e.pal, 8);
          },
        }, {});
      },
    },
  };

  // =================================================================== POISON
  const BUBBLE = { life: 0.6, update(e, dt) { e.y -= 18 * dt; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => A.ring(ctx, e.x + ox, e.y + oy, 1 + e.t * 3, e.pal.l)); } };
  const GLOB = (b, ctx, ox, oy, A) => { const r = b.up ? 3 : 2; A.disc(ctx, b.x + ox, b.y + oy, r, b.pal.c, b.pal.l); A.px(ctx, b.x + ox, b.y + oy + r, 1, 2, b.pal.c); };
  K.poison = {
    status: 'toxin', fx: 'bubbles', block: ['Toxic Bubble', 'bubble'], dash: ['Slime Trail', 'trail'],
    m1: {
      name: 'Venom Spit', dmg: 6, cd: 0.42, kind: 'custom', life: 0.01,
      desc: 'Spit an arcing glob of venom that leaves a little sizzling puddle.',
      spawn(e, g, A) {
        H.at(e, A, 8, -3); A.sfx('cast', { minGap: 0.04 });
        A.spawn(e, H.proj(GLOB, { life: 1.2, r: 4, gravity: 300, onHit(b, A) { A.spawn(b, { life: 1.2, spawn(s) { s.gy = A.ground(s.x, s.y - 8); }, update(s, dt, g, A) { A.tick(s, { x: s.x - 8, y: s.gy - 6, w: 16, h: 6 }, 0.4, { mult: 0.3, kb: 0 }); }, draw(s, ctx, ox, oy, A) { A.alpha(ctx, A.fade(s, 0.1, 0.4), () => { A.px(ctx, s.x + ox - 7, s.gy + oy - 2, 14, 2, s.pal.c); if (Math.floor(s.t * 6) % 2) A.px(ctx, s.x + ox - 3 + (s.t * 10) % 6, s.gy + oy - 4, 1, 1, s.pal.l); }); } }, { x: b.x, y: b.y }); } }), { vx: e.dir * 200, vy: -80 });
      },
    },
    s: [
      {
        name: 'Toxic Cloud', dmg: 3, cd: 8, mp: 7, kind: 'custom', life: 4,
        desc: 'A billowing cloud of toxic gas, bubbling as it drifts.',
        spawn(e, g, A) { H.at(e, A, 48); e.gy = H.floor(A, e.x); A.sfx('whoosh'); },
        update(e, dt, g, A) { const R = 50 * H.sc(e); e.x += e.dir * 8 * dt; A.tick(e, { x: e.x - R, y: e.gy - R, w: R * 2, h: R }, 0.45, { kb: 0 }); if (Math.random() < dt * 10) A.spawn(e, BUBBLE, { x: e.x + A.rnd(-R, R), y: e.gy - A.rnd(4, R) }); },
        draw(e, ctx, ox, oy, A) { const R = 50 * H.sc(e); A.alpha(ctx, A.fade(e, 0.3, 0.5) * 0.55, () => { for (let i = 0; i < 12; i++) A.disc(ctx, e.x + ox + Math.sin(i * 1.9 + e.t * 0.8) * R * 0.8, e.gy + oy - 10 - ((i * 9) % (R * 0.8)), 7 + (i % 3) * 2, i % 2 ? e.pal.c : e.pal.d); }); },
      },
      {
        name: 'Acid Rain', dmg: 6, cd: 7, mp: 7, kind: 'custom', life: 2,
        desc: 'A sickly cloud rains acid that sizzles on contact.',
        spawn(e, g, A) { H.at(e, A, 50); e.cy = A.p.y - 46; A.sfx('whoosh'); },
        update(e, dt, g, A) {
          e.dt2 = (e.dt2 || 0) - dt;
          if (e.dt2 <= 0 && e.t < 1.6) { e.dt2 = e.up ? 0.04 : 0.07; A.spawn(e, H.proj((d, ctx, ox, oy, A) => { A.px(ctx, d.x + ox, d.y + oy, 1, 3, d.pal.c); A.px(ctx, d.x + ox, d.y + oy + 2, 1, 1, d.pal.l); }, { life: 0.8, r: 2, onHit(d, A) { A.spawn(d, BUBBLE, { x: d.x, y: d.y - 2 }); } }), { x: e.x + A.rnd(-40, 40), y: e.cy + 6, vx: 0, vy: 280 }); }
        },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.cy + oy; A.alpha(ctx, A.fade(e, 0.2, 0.4), () => { for (const [dx, r] of [[-28, 8], [-12, 11], [6, 12], [24, 9]]) A.disc(ctx, x + dx, y, r, '#5a6a3a', '#8a9a5a'); }); },
      },
      {
        name: 'Sludge Pool', dmg: 3, cd: 8, mp: 6, kind: 'custom', life: 5,
        desc: 'A pool of bubbling sludge that slows and poisons whatever wades through it.',
        spawn(e, g, A) { H.at(e, A, 36); e.gy = H.floor(A, e.x); A.sfx('pop'); },
        update(e, dt, g, A) { const R = 44 * H.sc(e); for (const t of A.targets()) { if (t.tutorial) continue; const c = A.center(t); if (Math.abs(c.x - e.x) < R && Math.abs(t.box.y + t.box.h - e.gy) < 6) { t.vx *= 1 - dt * 6; if (t.applyStatus && !t.status.slow) t.applyStatus('slow', e.potency); } } A.tick(e, { x: e.x - R, y: e.gy - 8, w: R * 2, h: 8 }, 0.5, { kb: 0 }); },
        draw(e, ctx, ox, oy, A) { const R = 44 * H.sc(e), x = e.x + ox, gy = e.gy + oy; A.alpha(ctx, A.fade(e, 0.3, 0.5), () => { A.px(ctx, x - R, gy - 3, R * 2, 3, e.pal.d); A.px(ctx, x - R + 2, gy - 4, R * 2 - 4, 1, e.pal.c); for (let i = 0; i < 5; i++) { const bx = x - R + ((i * 23 + e.t * 9) % (R * 2)), r = (e.t * 2 + i) % 1; A.ring(ctx, bx, gy - 4 - r * 3, 1 + r * 2, e.pal.l); } }); },
      },
      {
        name: 'Viper Strike', dmg: 16, cd: 5, mp: 5, kind: 'custom', life: 1.1,
        desc: 'A serpent of venom slithers along the ground and bites the first thing it reaches.',
        spawn(e, g, A) { H.at(e, A, 8); e.gy = H.floor(A, e.x); e.trail = []; A.sfx('whoosh'); },
        update(e, dt, g, A) {
          e.x += e.dir * 190 * dt; e.gy = A.ground(e.x, e.gy - 16); e.y = e.gy - 4 + Math.sin(e.t * 22) * 3;
          e.trail.unshift({ x: e.x, y: e.y }); if (e.trail.length > 14) e.trail.pop();
          if (A.hit(e, { x: e.x - 5, y: e.gy - 14, w: 10, h: 14 }, { dir: e.dir, kb: 0.8 }) || A.solid(e.x + e.dir * 4, e.gy - 6)) { A.puff(e, e.x, e.y, 6); e.dead = true; }
        },
        draw(e, ctx, ox, oy, A) {
          e.trail.forEach((s, i) => A.px(ctx, s.x + ox - 1, s.y + oy - 1, 3 - i * 0.12, 3 - i * 0.12, i % 3 ? e.pal.c : e.pal.d));
          const h = e.trail[0]; if (h) { A.px(ctx, h.x + ox + e.dir * 1, h.y + oy - 3, 4, 4, e.pal.c); A.px(ctx, h.x + ox + e.dir * 3, h.y + oy - 2, 1, 1, '#ff3a3a'); A.px(ctx, h.x + ox + e.dir * 5, h.y + oy, 2, 1, '#ff6a6a'); }
        },
      },
      {
        name: 'Plague Spores', dmg: 6, cd: 9, mp: 7, kind: 'custom', life: 3,
        desc: 'Infect the nearest enemy. The infection keeps jumping to anything near it.',
        spawn(e, g, A) { const p = A.p, t = A.near(p.cx, p.y, 140); e.inf = t ? [t] : []; if (t) A.damage(e, t, 1, 0); e.links = []; A.sfx('cast'); },
        update(e, dt, g, A) {
          e.jt = (e.jt || 0) - dt;
          if (e.jt <= 0) {
            e.jt = 0.5; e.links = [];
            for (const s of e.inf.slice()) { if (s.dead) continue; const sc = A.center(s); for (const o of H.nearby(A, sc.x, sc.y, 70 * H.sc(e))) if (e.inf.indexOf(o.t) === -1) { e.inf.push(o.t); e.links.push({ a: sc, b: o.c, t: 0 }); } }
            for (const s of e.inf) if (!s.dead) A.damage(e, s, 0.5, 0);
          }
          for (const l of e.links) l.t += dt;
        },
        draw(e, ctx, ox, oy, A) {
          for (const s of e.inf) if (!s.dead) { const c = A.center(s); for (let i = 0; i < 3; i++) A.px(ctx, c.x + ox + Math.cos(e.t * 4 + i * 2) * 7, c.y + oy - 8 + Math.sin(e.t * 4 + i * 2) * 3, 2, 2, e.pal.c); }
          for (const l of e.links) if (l.t < 0.3) for (let i = 0; i <= 8; i++) A.px(ctx, U.lerp(l.a.x, l.b.x, i / 8) + ox, U.lerp(l.a.y, l.b.y, i / 8) + oy - Math.sin((i / 8) * Math.PI) * 8, 2, 2, e.pal.l);
        },
      },
    ],
    ult: {
      name: 'Venom Catastrophe', dmg: 18,
      desc: 'A massive flood of concentrated poison spreads across the ground, infecting every enemy, then violently detonates inside them.',
      charge: {
        pose: 'raiseBoth', lift: 0,
        draw(ctx, x, y, k, t, A, P) {
          const w = 12 + k * 30; A.px(ctx, x - w, y + 12, w * 2, 2 + k * 3, P.d); A.px(ctx, x - w + 2, y + 12, w * 2 - 4, 1, P.c);
          for (let i = 0; i < 10; i++) { const r = (t * 1.5 + i * 0.13) % 1; A.ring(ctx, x - w + ((i * 13) % (w * 2)), y + 10 - r * 22 * k, 1 + r * 2, P.l); }
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3,
          spawn(e) { e.x = p.cx; e.gy = p.feet; e.inf = new Set(); A.sfx('surge'); A.sfx('rumble', { dur: 1 }); },
          update(e, dt, g, A) {
            const R = 260 * Math.min(1, e.t / 0.8);
            for (const t of A.targets()) { const c = A.center(t); if (Math.abs(c.x - e.x) < R && !e.inf.has(t)) { e.inf.add(t); A.damage(e, t, 0.6, 0.2); if (t.applyStatus) { t.applyStatus('toxin', e.potency); t.applyStatus('toxin', e.potency); t.applyStatus('toxin', e.potency); } } }
            if (e.t > 1.8 && !e.boom) { e.boom = true; A.shake(7, 0.5); A.flash(0.3); for (const t of e.inf) if (!t.dead) { const c = A.center(t); A.blast(e, c.x, c.y, 34 * H.sc(e), { dmg: e.dmg * 1.8 }); } }
          },
          draw(e, ctx, ox, oy, A) {
            const R = 260 * Math.min(1, e.t / 0.8), x = e.x + ox, gy = e.gy + oy, f = e.t > 2.4 ? (3 - e.t) / 0.6 : 1;
            A.alpha(ctx, f, () => {
              for (let d = -R; d < R; d += 2) { const h = 6 + Math.sin(d * 0.2 + e.t * 10) * 3 + (Math.abs(d) > R - 12 ? 8 : 0); A.px(ctx, x + d, gy - h, 2, h, Math.abs(d) > R - 12 ? e.pal.l : (d / 2) % 5 ? e.pal.c : e.pal.d); }
              for (const t of e.inf) if (!t.dead && e.t < 1.8) { const c = A.center(t); A.alpha(ctx, 0.5 + 0.5 * Math.sin(e.t * 20), () => A.ring(ctx, c.x + ox, c.y + oy, 8, e.pal.l)); }
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

    // -------------------------------------------------------------- NATURE
    K.nature.m1Up = {
      name: 'Razor Leaves', dmg: 6, cd: 0.5, kind: 'custom', life: 0.75,
      desc: 'A whirlwind of razor-sharp leaves spins forward, slicing over and over and leaving poison in every cut.',
      spawn(e, g, A) { H.at(e, A, 12, -2); e.vx = e.dir * 135; A.sfx('whoosh', { minGap: 0.05 }); },
      update(e, dt, g, A) {
        const r = 14 * H.sc(e);
        e.x += e.vx * dt * 1.2;
        A.tickR(e, e.x, e.y, r, 0.12, { kb: 0.15, dir: e.dir });
        if (A.solid(e.x + e.dir * r * 0.5, e.y)) e.dead = true;
      },
      onEnd(e, A) { for (let i = 0; i < 12; i++) { const a = Math.random() * Math.PI * 2; A.spawn(e, LEAF, { x: e.x, y: e.y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70 - 20 }); } },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), x = e.x + ox, y = e.y + oy, r = 14 * s;
        A.alpha(ctx, A.fade(e, 0.06, 0.15), () => {
          A.alpha(ctx, 0.3, () => A.ring(ctx, x, y, r, P.c, r * 0.8, 2));
          for (let i = 0; i < 21; i++) {   // three rings of leaves, the middle one spinning the other way
            const lane = i % 3, rr = r * (0.4 + lane * 0.3), sp = (lane === 1 ? -1 : 1) * (9 + lane * 2), a = e.t * sp + i * 2.1;
            const lx = x + Math.cos(a) * rr, ly = y + Math.sin(a) * rr * 0.8, ta = a + (Math.PI / 2) * Math.sign(sp), cx = Math.cos(ta) * 3.2, cy = Math.sin(ta) * 3.2;
            A.line(ctx, lx - cx, ly - cy, lx + cx, ly + cy, P.d, 3);
            A.line(ctx, lx - cx, ly - cy, lx + cx, ly + cy, i % 2 ? P.c : P.l, 2);
            A.line(ctx, lx - cx * 0.6, ly - cy * 0.6, lx + cx * 0.6, ly + cy * 0.6, '#ffffff', 1);   // the shiny cutting edge
          }
          A.disc(ctx, x, y, Math.round(3 * s), P.d, P.c);
        });
      },
    };
    const BRAMBLE = {
      life: 0.75,
      spawn(e, g, A) { e.gy = A.ground(e.x, e.y - 4); e.h = (14 + Math.random() * 8) * H.sc(e); e.bend = A.rnd(-5, 5); },
      update(e, dt, g, A) { if (e.t > 0.06 && !e.done) { e.done = true; A.hit(e, { x: e.x - 5, y: e.gy - e.h, w: 10, h: e.h }, { kb: 0.5 }); } },
      draw(e, ctx, ox, oy, A) {
        const k = Math.min(1, e.t / 0.08), P = e.pal, x = e.x + ox, gy = e.gy + oy;
        A.alpha(ctx, Math.min(1, (e.life - e.t) / 0.2), () => {
          ROOT_LINE(ctx, A, x, gy, x + e.bend, gy - e.h, k, 3, P, e.bend * 0.6, true);
          ROOT_LINE(ctx, A, x + 2, gy, x + 2 - e.bend * 0.6, gy - e.h * 0.6, k, 2, P, -e.bend, true);
          if (k >= 1) { A.px(ctx, x + e.bend - 1, gy - e.h - 2, 3, 2, P.l); A.px(ctx, x + e.bend, gy - e.h - 3, 1, 1, '#ffffff'); }   // a bud on top
        });
      },
    };
    K.nature.dashUp = {
      name: 'Bramble Rush', dmg: 9, life: 0.4,
      desc: 'Thorny brambles burst out of the ground all along your path, right on your heels.',
      update(e, dt, g, A) {
        if (!H.dashing(e, A)) return;
        const q = H.end(e);
        if (e.lastX === undefined || Math.abs(q.x - e.lastX) >= 9) { e.lastX = q.x; A.spawn(e, BRAMBLE, { x: q.x - e.dir * 4, y: q.f }); }
      },
    };

    // ------------------------------------------------------------ DARKNESS
    K.darkness.m1Up = {
      name: 'Night Sickle', dmg: 10, cd: 0.5, kind: 'custom', life: 0.9,
      desc: 'Hurl a huge spinning sickle of darkness. It cuts on the way out, then comes back and cuts again.',
      spawn(e, g, A) { H.at(e, A, 10, -2); e.v = 330; A.sfx('swing'); },
      update(e, dt, g, A) {
        const p = A.p, s = H.sc(e);
        e.v -= 900 * dt;   // slows down, stops, then comes back to you
        if (e.v < 0 && !e.back) { e.back = true; e.hit.clear(); }
        if (!e.back) e.x += e.dir * e.v * dt * 1.2;
        else {
          const tx = p.cx, ty = p.y + 8, a = Math.atan2(ty - e.y, tx - e.x), sp = Math.min(380, -e.v * 1.2);
          e.x += Math.cos(a) * sp * dt; e.y += Math.sin(a) * sp * dt;
          if (Math.hypot(tx - e.x, ty - e.y) < 8) e.dead = true;
        }
        A.hitR(e, e.x, e.y, 13 * s, { kb: 0.6, dir: e.back ? -e.dir : e.dir });
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), x = e.x + ox, y = e.y + oy, R = 12 * s, rot = e.t * 26 * e.dir;
        A.glow(ctx, x, y, R * 0.7, P.d, 0.3);
        A.alpha(ctx, 0.3, () => A.ring(ctx, x, y, R, P.c));   // the blur of the spin
        for (let b = 0; b < 2; b++) {   // two curved blades
          const a0 = rot + b * Math.PI;
          for (let i = 0; i <= 14; i++) { const q = i / 14, a = a0 + q * 2.2, r = R * (0.25 + q * 0.75), w = Math.max(1, Math.round(3 * Math.sin(q * Math.PI))); A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, w, w, q > 0.8 ? '#ffffff' : i % 2 ? P.c : P.l); }
        }
        A.disc(ctx, x, y, Math.round(2 * s), '#05020a');
        A.ring(ctx, x, y, Math.round(2 * s) + 1, P.l);
      },
    };
    K.darkness.dashUp = {
      name: 'Gloom Gate', dmg: 14, life: 0.8,
      desc: 'Tear a dark gate open where you start and where you stop. A moment later, both of them erupt.',
      update(e, dt, g, A) {
        if (H.dashing(e, A)) return;
        if (!e.boom && H.since(e) > 0.25) {
          e.boom = true; const s = H.sc(e);
          for (const q of [e.pts[0], H.end(e)]) { A.hitR(e, q.x, q.y, 22 * s, { kb: 0.8 }); A.spawn(e, W().SHOCK, { x: q.x, y: q.y, r: 20 * s }); A.puff(e, q.x, q.y, 8, 2); }
          A.sfx('boom', { minGap: 0.05 }); A.shake(2, 0.15);
        }
      },
      draw(e, ctx, ox, oy, A) {
        if (!e.pts) return;
        const P = e.pal, s = H.sc(e), open = e.boom ? Math.max(0, 1 - (H.since(e) - 0.25) / 0.2) : Math.min(1, e.t / 0.1);
        if (open <= 0) return;
        for (const q of e.over ? [e.pts[0], H.end(e)] : [e.pts[0]]) {
          const x = q.x + ox, y = q.y + oy, r = 10 * s * open;
          A.disc(ctx, x, y, Math.max(1, Math.round(r)), '#05020a');
          A.ring(ctx, x, y, r, P.c, r * 1.3); A.ring(ctx, x, y, r + 2, P.d, (r + 2) * 1.3, 2);
          for (let i = 0; i < 6; i++) { const a = e.t * 4 + i * 1.05, l = r + 3 + Math.sin(e.t * 12 + i) * 2; A.line(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 1.3, x + Math.cos(a + 0.4) * l, y + Math.sin(a + 0.4) * l * 1.3, P.l, 1); }   // tendrils curling out
          if (e.over && !e.boom && Math.floor(e.t * 20) % 2) A.ring(ctx, x, y, r * 0.5, '#ffffff', r * 0.65);   // about to go off
        }
      },
    };

    // -------------------------------------------------------------- SHADOW
    K.shadow.m1Up = {
      name: 'Thousand Cuts', dmg: 3.5, cd: 0.55, kind: 'custom', life: 0.4,
      desc: 'A storm of shadow slashes rips through everything in front of you. It is actually six cuts. We counted.',
      spawn(e, g, A) { H.at(e, A, 0); e.cuts = []; e.n = 0; },
      update(e, dt, g, A) {
        H.at(e, A, 0);
        const s = H.sc(e), L = 46 * s;
        while (e.n < 6 && e.t >= e.n * 0.045) {
          const last = e.n === 5;
          e.cuts.push({ x: e.x + e.dir * (14 + Math.random() * (L - 24)), y: e.y + A.rnd(-6, 6), a: A.rnd(-1.2, 1.2) + (e.n % 2 ? Math.PI / 2 : 0), r: (last ? 18 : 11) * s, t: e.t, last });
          e.hit.clear();
          A.hit(e, { x: e.dir > 0 ? e.x : e.x - L, y: e.y - 14 * s, w: L, h: 28 * s }, { dir: e.dir, kb: last ? 0.8 : 0.1, mult: last ? 1.6 : 1 });
          A.sfx('swing', { minGap: 0.02 });
          e.n++;
        }
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal;
        for (const c of e.cuts) {
          const k = (e.t - c.t) / 0.14;
          if (k > 1) continue;
          const x = c.x + ox, y = c.y + oy, dx = Math.cos(c.a) * c.r, dy = Math.sin(c.a) * c.r, grow = Math.min(1, k * 3);
          A.alpha(ctx, 1 - k, () => {
            A.line(ctx, x - dx, y - dy, x - dx + dx * 2 * grow, y - dy + dy * 2 * grow, P.d, c.last ? 4 : 3);
            A.line(ctx, x - dx, y - dy, x - dx + dx * 2 * grow, y - dy + dy * 2 * grow, '#ffffff', 1);
            if (c.last) A.ring(ctx, x, y, c.r * (0.5 + k), P.c, c.r * (0.5 + k) * 0.6, 2);
          });
        }
      },
    };
    K.shadow.dashUp = {
      name: 'Decoy Shade', dmg: 15, life: 0.75,
      desc: 'Leave a shadow copy of yourself behind. Half a second later, it explodes. Rude, but effective.',
      spawn(e, g, A) { const p = A.p; e.dx = p.cx; e.df = p.feet; e.face = p.facing; },
      update(e, dt, g, A) {
        H.dashing(e, A);
        if (!e.boom && e.t > 0.5) {
          e.boom = true; const s = H.sc(e), y = e.df - 11;
          A.hitR(e, e.dx, y, 24 * s, { kb: 1 }); A.spawn(e, W().SHOCK, { x: e.dx, y, r: 22 * s });
          W().debris(A, e.dx, y, 12, [e.pal.d, e.pal.c, '#05020a'], 160);
          A.sfx('boom', { minGap: 0.05 }); A.shake(2, 0.14);
        }
      },
      draw(e, ctx, ox, oy, A) {
        if (e.boom) return;
        const P = e.pal, x = e.dx + ox, y = e.df + oy, warn = e.t > 0.32 && Math.floor(e.t * 24) % 2;
        A.alpha(ctx, 0.9, () => { H.drawGhost(ctx, A, 'idle', x - 1, y, e.face, P.l); H.drawGhost(ctx, A, 'idle', x + 1, y, e.face, P.l); H.drawGhost(ctx, A, 'idle', x, y, e.face, warn ? '#ffffff' : P.d); });
        for (let i = 0; i < 3; i++) A.px(ctx, x - 3 + i * 3, y - 24 - ((Math.floor(e.t * 10) + i) % 3) * 3, 1, 2, P.c);   // shadow smoke curling off it
      },
    };

    // --------------------------------------------------------------- LIGHT
    K.light.m1Up = {
      name: 'Trinity Ray', dmg: 12, cd: 0.5, kind: 'custom', life: 0.3,
      desc: 'Fire a ray of light that splits into three. Good luck dodging all of them.',
      spawn(e, g, A) {
        H.at(e, A, 6, -1);
        const s = H.sc(e), split = 40 * s, L = 120 * s, a0 = e.dir > 0 ? 0 : Math.PI;
        const cast = (x0, y0, a, len) => { let d = 0; while (d < len && !A.solid(x0 + Math.cos(a) * d, y0 + Math.sin(a) * d)) d += 4; return { x0, y0, a, len: Math.min(d, len) }; };
        const stem = cast(e.x, e.y, a0, split);
        e.rays = [stem];
        if (stem.len >= split) for (const da of [-0.32, 0, 0.32]) e.rays.push(cast(e.x + e.dir * split, e.y, a0 + da * e.dir, L - split));
        for (const r of e.rays) for (let d = 0; d <= r.len; d += 5) A.hitR(e, r.x0 + Math.cos(r.a) * d, r.y0 + Math.sin(r.a) * d, 5 * s, { dir: e.dir, kb: 0.5 });
        A.sfx('zap', { minGap: 0.04 });
      },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), k = e.t / e.life, w = Math.max(1, Math.round((1 - k) * 3 * s)), st = e.rays[0];
        for (const r of e.rays) W().beam(ctx, A, r.x0 + ox, r.y0 + oy, r.x0 + Math.cos(r.a) * r.len + ox, r.y0 + Math.sin(r.a) * r.len + oy, w, P.c, P.l);
        A.star(ctx, st.x0 + Math.cos(st.a) * st.len + ox, st.y0 + oy, Math.max(1, Math.round((1 - k) * 6 * s)), '#ffffff', P.l);   // the split point
        A.glow(ctx, st.x0 + ox, st.y0 + oy, Math.max(1, 6 * s * (1 - k)), P.l, 0.5);
      },
    };
    const PHOTON = H.proj((b, ctx, ox, oy, A) => { const x = b.x + ox, y = b.y + oy; A.line(ctx, x, y, x - b.vx * 0.02, y - b.vy * 0.02, b.pal.l, 1); A.px(ctx, x - 1, y - 1, 2, 2, '#ffffff'); }, { life: 0.6, r: 3, homing: 6, range: 120 });
    K.light.dashUp = {
      name: 'Photon Trail', dmg: 3, life: 0.6,
      desc: 'Shed sparks of light as you dash. A moment later they all shoot forward at whatever is in front of you.',
      update(e, dt, g, A) {
        if (H.dashing(e, A)) return;
        if (!e.fired && H.since(e) > 0.22) {
          e.fired = true; let i = 0;
          H.along(e, 7, (x, y) => { A.spawn(e, PHOTON, { x, y: y + Math.sin(i * 2.3) * 6, vx: e.dir * 260, vy: Math.sin(i * 1.7) * 30 }); i++; });
          A.sfx('zap', { minGap: 0.04 });
        }
      },
      draw(e, ctx, ox, oy, A) {
        if (!e.pts || e.fired) return;
        const P = e.pal; let i = 0;
        H.along(e, 7, (x, y) => { const yy = y + Math.sin(i * 2.3) * 6, tw = Math.floor(e.t * 20 + i) % 3; A.glow(ctx, x + ox, yy + oy, 3, P.l, 0.35); A.star(ctx, x + ox, yy + oy, tw ? 2 : 3, '#ffffff', P.l); i++; });
      },
    };

    // -------------------------------------------------------------- ARCANE
    K.arcane.m1Up = {
      name: 'Spellweave', dmg: 9, cd: 0.5, kind: 'custom', life: 0.55,
      desc: 'Two threads of magic weave forward through everything in their path, then tie themselves into a knot and explode.',
      spawn(e, g, A) { H.at(e, A, 8, -2); e.x0 = e.x; e.vx = e.dir * 230; },
      update(e, dt, g, A) {
        const s = H.sc(e);
        e.x += e.vx * dt * 1.2;
        A.hit(e, { x: e.x - 6, y: e.y - 10 * s, w: 12, h: 20 * s }, { dir: e.dir, kb: 0.3 });
        if (A.solid(e.x, e.y)) e.dead = true;
      },
      onEnd(e, A) { const s = H.sc(e); e.hit.clear(); A.hitR(e, e.x, e.y, 18 * s, { mult: 1.2, kb: 0.8 }); A.spawn(e, W().SHOCK, { x: e.x, y: e.y, r: 18 * s }); A.sfx('pop'); },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), y = e.y + oy, tail = Math.min(Math.abs(e.x - e.x0), 70 * s);
        for (let i = 0; i <= tail; i += 1.5) {   // the two threads, braided round each other
          const x = e.x - e.dir * i, amp = 8 * s * Math.min(1, i / 12), ph = x * 0.12 - e.t * 6, f = 1 - i / (70 * s);
          A.alpha(ctx, f, () => { A.px(ctx, x + ox, y + Math.sin(ph) * amp, 1, 2, P.c); A.px(ctx, x + ox, y - Math.sin(ph) * amp, 1, 2, P.l); });
        }
        A.glow(ctx, e.x + ox, y, 6 * s, P.c, 0.35);
        A.disc(ctx, e.x + ox, y, Math.round(2 * s), '#ffffff');
        for (let i = 0; i < 3; i++) if ((i + 1) * 14 * s < tail) RUNE(ctx, A, e.x + ox - e.dir * (i + 1) * 14 * s, y + (i % 2 ? 8 : -8) * s, i + Math.floor(e.t * 8), P.l);
      },
    };
    const GLYPH = {
      life: 2,
      update(e, dt, g, A) { if (e.go && !e.done) { e.done = e.t; A.hitR(e, e.x, e.y, 13 * H.sc(e), { kb: 0.6 }); A.sfx('pop', { minGap: 0.03 }); A.puff(e, e.x, e.y, 4); e.life = e.t + 0.25; } },
      draw(e, ctx, ox, oy, A) {
        const P = e.pal, s = H.sc(e), x = e.x + ox, y = e.y + oy;
        if (!e.done) { CIRCLE(ctx, A, x, y, 7 * s * Math.min(1, e.t / 0.1), e.t * 3, P, 4); return; }
        const k = (e.t - e.done) / 0.25, r = (7 + k * 10) * s;
        A.alpha(ctx, 1 - k, () => {
          A.ring(ctx, x, y, r, '#ffffff', r * 0.4); A.ring(ctx, x, y, r * 1.2, P.c, r * 0.5, 2);
          for (let i = 0; i < 4; i++) RUNE(ctx, A, x + Math.cos(i * 1.57 + k) * r, y + Math.sin(i * 1.57 + k) * r * 0.6, i, P.l);
        });
      },
    };
    K.arcane.dashUp = {
      name: 'Glyph Wake', dmg: 8, life: 1.2,
      desc: 'Leave glowing glyphs all along your path. Then they go off, one after another. Bang, bang, bang, bang.',
      update(e, dt, g, A) {
        e.glyphs = e.glyphs || [];
        if (H.dashing(e, A)) {
          const q = H.end(e);
          if (e.lastX === undefined || Math.abs(q.x - e.lastX) >= 12) { e.lastX = q.x; e.glyphs.push(A.spawn(e, GLYPH, { x: q.x, y: q.y + 2 })); }
          return;
        }
        e.glyphs.forEach((gl, i) => { if (H.since(e) > 0.15 + i * 0.07) gl.go = true; });
        if (e.glyphs.every((gl) => gl.done)) e.dead = true;
      },
    };

    // -------------------------------------------------------------- POISON
    const BLIGHT = H.proj(GLOB, { life: 0.45, r: 3, gravity: 220, onHit(b, A) { A.puff(b, b.x, b.y, 3); for (let i = 0; i < 2; i++) A.spawn(b, BUBBLE, { x: b.x + A.rnd(-3, 3), y: b.y }); } });
    K.poison.m1Up = {
      name: 'Blight Spray', dmg: 3.5, cd: 0.5, kind: 'custom', life: 0.01,
      desc: 'Spray a wide burst of venom like a very angry garden hose. Up close, every drop hits.',
      spawn(e, g, A) {
        H.at(e, A, 8, -1);
        for (let i = 0; i < 6; i++) { const a = (i - 2.5) * 0.15 + A.rnd(-0.04, 0.04), sp = A.rnd(230, 290); A.spawn(e, BLIGHT, { vx: Math.cos(a) * sp * e.dir, vy: Math.sin(a) * sp - 30 }); }
        A.sfx('swing');
      },
    };
    K.poison.dashUp = {
      name: 'Miasma Dash', dmg: 7, life: 1.4,
      desc: 'Dash through and leave a cloud of toxic gas hanging in the air behind you. Do not breathe in.',
      update(e, dt, g, A) {
        if (H.dashing(e, A)) return;
        if (!e.S) e.S = H.span(e);
        const s = H.sc(e), S = e.S, y = e.pts[0].y;
        if (e.t < e.life - 0.3) A.tick(e, { x: S.x0 - 10, y: y - 16 * s, w: S.x1 - S.x0 + 20, h: 30 * s }, 0.3, { kb: 0 });
        if (Math.random() < dt * 14) A.spawn(e, BUBBLE, { x: A.rnd(S.x0, S.x1), y: y + A.rnd(-8, 8) });
      },
      draw(e, ctx, ox, oy, A) {
        if (!e.pts) return;
        const P = e.pal, s = H.sc(e), out = Math.min(1, (e.life - e.t) / 0.4); let i = 0;
        H.along(e, 6, (x, y) => {
          const grow = U.clamp((e.t - i * 0.012) / 0.3, 0, 1), r = (5 + 3 * Math.sin(i * 1.7)) * s * (0.5 + grow * 0.6);
          A.alpha(ctx, 0.45 * out * grow, () => A.disc(ctx, x + ox + Math.sin(e.t * 3 + i) * 2, y + oy + Math.cos(e.t * 2 + i) * 3, Math.max(1, Math.round(r)), i % 2 ? P.c : P.d));
          if (i % 3 === 0) A.alpha(ctx, out * grow, () => A.px(ctx, x + ox, y + oy - r * 0.6 - ((e.t * 10 + i) % 4), 1, 2, P.l));   // fumes rising off it
          i++;
        });
      },
    };
  }
})(window.ERX = window.ERX || {});
