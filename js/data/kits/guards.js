/*
 * ELEMENT BLOCKS — what your block looks like, and the burst when it stops a hit.
 * One per element; no two look alike.
 *
 *   draw(ctx, G)          G = { A, x, bot, h, d, t, P, up, cx, cy, k }
 *                         x = the block's centre (in front of you), bot = your feet,
 *                         h = height, d = facing, t = time, P = colours, k = guard left 0..1
 *   hit(g, x, y, d, P)    sparks/shapes when a hit is blocked (x, y = impact point)
 *   sound                 the blocked-hit sound flavour (js/audio/game-audio.js blockHit)
 */
(function (ERX) {
  'use strict';

  const U = ERX.U;
  const R = (a, b) => a + Math.random() * (b - a);
  /** A quick particle. */
  const dot = (g, x, y, vx, vy, color, o) => g.fx.add(Object.assign({ x, y, vx, vy, life: 0.5, color, size: 1, fadeOut: 0.25 }, o));
  const spray = (g, x, y, d, n, cols, sp, o) => { for (let i = 0; i < n; i++) { const a = (d > 0 ? 0 : Math.PI) + R(-1.1, 1.1); dot(g, x, y, Math.cos(a) * R(sp * 0.4, sp), Math.sin(a) * R(sp * 0.4, sp), cols[i % cols.length], o); } };
  const ring = (g, x, y, n, cols, sp, o) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; dot(g, x, y, Math.cos(a) * sp, Math.sin(a) * sp, cols[i % cols.length], o); } };
  /** A short custom effect (drawn shapes rather than dots). */
  const shape = (g, def, o) => ERX.Abilities.api(g).spawn({ pal: o.pal, dmg: 0, dir: o.dir || 1, x: o.x, y: o.y }, def, o);

  /** Ellipse outline / fill that stays solid even when tall and thin. */
  const oval = (A, ctx, x, y, rx, ry, col) => { const n = Math.max(12, Math.round(Math.max(rx, ry) * 3)); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; A.px(ctx, x + Math.cos(a) * rx, y + Math.sin(a) * ry, 1, 1, col); } };
  const ovalFill = (A, ctx, x, y, rx, ry, col) => { for (let yy = -ry; yy <= ry; yy++) { const w = rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry))); A.px(ctx, x - w, y + yy, w * 2 + 1, 1, col); } };

  const G = {};

  G.fire = {
    sound: 'crackle',
    draw(ctx, { A, x, bot, h, t, P }) {
      for (let i = 0; i < 5; i++) { const fh = h * (0.6 + 0.4 * Math.abs(Math.sin(t * 9 + i * 1.7))), fx = x - 4 + i * 2; for (let yy = 0; yy < fh; yy++) { const q = yy / fh; A.px(ctx, fx + Math.sin(yy * 0.4 + t * 14 + i) * (1 + q * 2), bot - yy, 2, 1, q > 0.75 ? '#ffe08a' : q > 0.35 ? P.c : P.d); } }
      for (let i = 0; i < 3; i++) A.px(ctx, x - 3 + ((t * 30 + i * 11) % 7), bot - h - ((t * 40 + i * 9) % 10), 1, 1, '#ffd34d');
    },
    hit(g, x, y, d, P) { spray(g, x, y, d, 14, ['#ffd34d', P.c, '#ff8a3a'], 140, { ay: -60, life: 0.45 }); },
  };
  G.water = {
    sound: 'splash',
    draw(ctx, { A, x, bot, h, d, t, P }) {
      for (let yy = 0; yy < h; yy++) { const bend = Math.sin((yy / h) * Math.PI) * 4 * d; A.px(ctx, x + bend - 2, bot - h + yy, 4, 1, (yy + Math.floor(t * 30)) % 6 < 2 ? P.l : P.c); }
      for (let i = 0; i < 3; i++) A.px(ctx, x + 3 * d, bot - h + ((t * 60 + i * 10) % h), 1, 2, '#ffffff');
      A.px(ctx, x - 5, bot - 1, 10, 1, P.l);
    },
    hit(g, x, y, d, P) { for (let i = 0; i < 14; i++) dot(g, x, y, d * R(20, 110), R(-150, -40), i % 2 ? P.l : '#ffffff', { ay: 420, life: 0.6 }); },
  };
  G.wind = {
    sound: 'whoosh',
    draw(ctx, { A, x, bot, h, t, P }) {
      for (let b = 0; b < 5; b++) { const yy = bot - h + 3 + b * (h / 5), ph = t * 14 + b; for (let i = 0; i < 10; i++) { const a = ph + i * 0.63; if (Math.sin(a) > 0) A.px(ctx, x + Math.cos(a) * 6, yy + Math.sin(a) * 1.5, 1, 1, i % 3 ? P.c : '#ffffff'); } }
    },
    hit(g, x, y, d, P) { for (let i = 0; i < 8; i++) dot(g, x, y - 10 + i * 3, d * R(120, 220), 0, i % 2 ? P.c : '#ffffff', { len: 6, life: 0.3 }); },
  };
  G.earth = {
    sound: 'thud',
    draw(ctx, { A, x, bot, h, P }) {
      const w = 10; A.px(ctx, x - w / 2 - 1, bot - h, w + 2, h, '#2a1e12');
      for (let yy = 0; yy < h - 1; yy += 5) for (let xx = 0; xx < w; xx += 4) A.px(ctx, x - w / 2 + xx + ((yy / 5) % 2) * 2, bot - h + 1 + yy, 3, 4, (xx + yy) % 3 ? P.c : P.d);
      A.px(ctx, x - w / 2, bot - h, w, 1, P.l); A.px(ctx, x - w / 2 - 2, bot - 2, 3, 2, P.d); A.px(ctx, x + w / 2, bot - 2, 3, 2, P.d);
    },
    hit(g, x, y, d, P) { for (let i = 0; i < 10; i++) dot(g, x, y, d * R(30, 120), R(-140, -30), i % 2 ? P.c : P.d, { ay: 500, size: 2, life: 0.6 }); for (let i = 0; i < 6; i++) dot(g, x, y + 8, R(-30, 30), R(-20, 0), '#a89070', { size: 3, alpha: 0.5, life: 0.5 }); },
  };
  G.lightning = {
    sound: 'zap',
    draw(ctx, { A, x, bot, h, t, P }) {
      A.disc(ctx, x, bot - h, 2, '#ffffff'); A.disc(ctx, x, bot - 2, 2, '#ffffff');
      for (let k = 0; k < 2; k++) { let lx = x; const seed = Math.floor(t * 20) + k * 7; for (let yy = bot - h; yy < bot; yy += 4) { const nx = x + Math.sin(yy * 1.3 + seed * 2.1) * 3; A.line(ctx, lx, yy, nx, yy + 4, k ? P.c : '#ffffff'); lx = nx; } }
    },
    hit(g, x, y, d, P) { spray(g, x, y, d, 16, ['#ffffff', P.c], 200, { life: 0.25 }); },
  };
  G.ice = {
    sound: 'glass',
    draw(ctx, { A, x, bot, h, P }) {
      for (let yy = 0; yy < h; yy++) { const w = yy < 6 ? (yy / 6) * 8 : 8; A.px(ctx, x - w / 2, bot - h + yy, w, 1, yy % 7 === 0 ? P.l : P.c); }
      A.px(ctx, x - 2, bot - h + 6, 1, h - 10, '#ffffff'); A.px(ctx, x + 1, bot - h + 12, 1, 6, '#ffffff');
      for (let i = -6; i <= 6; i += 3) A.px(ctx, x + i, bot - 1 - Math.abs(i % 2), 2, 1, '#e8f8ff');
    },
    hit(g, x, y, d, P) { for (let i = 0; i < 10; i++) dot(g, x, y, d * R(40, 140), R(-120, 40), i % 2 ? '#ffffff' : P.l, { ay: 300, len: i % 3 ? 0 : 2, life: 0.5 }); },
  };
  G.nature = {
    sound: 'wood',
    draw(ctx, { A, x, bot, h, t, P }) {
      const sway = Math.sin(t * 3) * 1.5; A.px(ctx, x - 3, bot - h + 6, 6, h - 6, '#5a3a22'); A.px(ctx, x - 2, bot - h + 6, 2, h - 6, '#7a5236');
      for (let i = 0; i < 5; i++) A.disc(ctx, x + sway + Math.round(Math.sin(i * 2.1) * 4), bot - h + 2 + i * 4, 5, i % 2 ? P.c : P.d);
      A.px(ctx, x - 5, bot - 2, 3, 2, '#5a3a22'); A.px(ctx, x + 2, bot - 2, 3, 2, '#5a3a22');
      A.px(ctx, x + sway + 2, bot - h + 4, 2, 2, '#ff9ad0');
    },
    hit(g, x, y, d, P) { for (let i = 0; i < 10; i++) dot(g, x, y - 6, d * R(20, 90), R(-90, -20), i % 3 ? P.c : P.l, { ay: 80, wobble: 30, wobbleRate: 9, size: 2, life: 0.9 }); },
  };
  G.darkness = {
    sound: 'whoosh',
    draw(ctx, { A, x, bot, h, t, P }) {
      for (let k = 0; k < 4; k++) for (let yy = 0; yy < h; yy++) { const q = yy / h; A.px(ctx, x - 4 + k * 2.5 + Math.sin(q * 6 + t * 5 + k) * 2, bot - yy, 2, 1, (yy + k) % 3 ? '#05020a' : P.d); }
      if (Math.floor(t * 1.5) % 4) { A.px(ctx, x - 3, bot - h * 0.65, 2, 1, '#ff3a4a'); A.px(ctx, x + 1, bot - h * 0.65, 2, 1, '#ff3a4a'); }
    },
    hit(g, x, y, d, P) { for (let i = 0; i < 8; i++) dot(g, x, y, d * R(10, 70), R(-50, 20), i % 2 ? '#05020a' : P.d, { size: 3, grow: 3, life: 0.6, alpha: 0.8 }); },
  };
  G.shadow = {
    sound: 'whoosh',
    draw(ctx, { A, x, bot, d, t }) {
      ctx.save(); ctx.globalAlpha *= 0.9; ERX.PlayerSide.draw(ctx, ERX.KitHelp.ghost(A, 'block', d, '#6a6a8a'), x - d * 3 + 1, bot, d); ERX.PlayerSide.draw(ctx, ERX.KitHelp.ghost(A, 'block', d, '#22222e'), x - d * 3, bot, d); ctx.restore();
      if (Math.floor(t * 3) % 5) A.px(ctx, x - d * 1, bot - 19, 2, 1, '#6af0ff');
    },
    hit(g, x, y, d, P) {
      shape(g, { life: 0.35, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 0.6 * (1 - e.t / e.life), () => ERX.PlayerSide.draw(ctx, ERX.KitHelp.ghost(A, 'hurt', e.dir, '#22222e'), e.x + ox - e.dir * e.t * 40, e.y + oy + 14, e.dir)); } }, { x, y, pal: P, dir: d });
    },
  };
  G.light = {
    sound: 'chime',
    draw(ctx, { A, x, bot, h, t, P }) {
      const cy = bot - h / 2; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, b = a + Math.PI / 3; A.line(ctx, x + Math.cos(a) * 6, cy + Math.sin(a) * h / 2, x + Math.cos(b) * 6, cy + Math.sin(b) * h / 2, i % 2 ? P.c : '#ffffff'); }
      for (let i = 0; i < 8; i++) { const a = t * 2 + i * 0.785; A.px(ctx, x + Math.cos(a) * 9, cy + Math.sin(a) * (h / 2 + 3), 1, 1, P.l); }
      A.alpha(ctx, 0.25, () => A.px(ctx, x - 5, cy - h / 2 + 3, 10, h - 6, '#fff8e0'));
    },
    hit(g, x, y, d, P) { ring(g, x, y, 12, ['#ffffff', P.c], 120, { len: 0, life: 0.3 }); },
  };
  G.arcane = {
    sound: 'chime',
    draw(ctx, { A, x, bot, h, t, P }) {
      const cy = bot - h / 2; oval(A, ctx, x, cy, 4, h / 2, P.c); oval(A, ctx, x, cy, 3, h / 2 - 4, P.l);
      for (let i = 0; i < 5; i++) { const a = t * 3 + (i / 5) * Math.PI * 2; const rx = x + Math.cos(a) * 3, ry = cy + Math.sin(a) * (h / 2 - 2); A.px(ctx, rx, ry - 1, 1, 3, '#ffffff'); A.px(ctx, rx - 1, ry, 3, 1, '#ffffff'); }
    },
    hit(g, x, y, d, P) {
      for (let i = 0; i < 5; i++) shape(g, { life: 0.5, spawn(e) { e.vx = e.dir * R(40, 100); e.vy = R(-60, 30); }, update(e, dt) { e.x += e.vx * dt; e.y += e.vy * dt; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => { A.px(ctx, e.x + ox, e.y + oy - 2, 1, 5, e.pal.l); A.px(ctx, e.x + ox - 2, e.y + oy, 5, 1, e.pal.l); }); } }, { x, y, pal: P, dir: d });
    },
  };
  G.poison = {
    sound: 'squelch',
    draw(ctx, { A, x, bot, h, t, P }) {
      for (let yy = 0; yy < h; yy++) { const w = 4 + Math.sin(yy * 0.4 + t * 6) * 2; A.px(ctx, x - w / 2, bot - h + yy, w, 1, yy % 4 ? P.c : P.d); }
      for (let i = 0; i < 3; i++) { const r = (t * 1.5 + i / 3) % 1; A.ring(ctx, x, bot - r * h, 1 + r * 2, P.l); }
    },
    hit(g, x, y, d, P) { for (let i = 0; i < 12; i++) dot(g, x, y, d * R(20, 110), R(-110, 10), i % 2 ? P.c : P.l, { ay: 380, size: 2, life: 0.55 }); },
  };
  G.blood = {
    sound: 'squelch',
    draw(ctx, { A, x, bot, h, d, t, P }) {
      for (let yy = 0; yy < h; yy++) { const bend = Math.sin((yy / h) * Math.PI) * 3 * d; A.px(ctx, x + bend - 2, bot - h + yy, 4, 1, yy % 5 ? P.c : P.d); }
      for (let i = 0; i < 3; i++) { const dy = (t * 25 + i * 9) % 10; A.px(ctx, x - 1 + i, bot - h * 0.4 + dy, 1, 2, P.c); }
      A.px(ctx, x - 4, bot - 1, 8, 1, P.d);
    },
    hit(g, x, y, d, P) { for (let i = 0; i < 14; i++) dot(g, x, y, d * R(10, 120), R(-130, 10), i % 3 ? P.c : P.d, { ay: 500, life: 0.6 }); },
  };
  G.death = {
    sound: 'bone',
    draw(ctx, { A, x, bot, h, t }) {
      for (let yy = 4; yy < h; yy += 5) { A.px(ctx, x - 5, bot - yy, 10, 2, '#e8e4d8'); A.px(ctx, x - 6, bot - yy - 1, 2, 4, '#f0ece0'); A.px(ctx, x + 4, bot - yy - 1, 2, 4, '#f0ece0'); }
      A.px(ctx, x - 3, bot - h - 3, 6, 5, '#f0ece0'); A.px(ctx, x - 2, bot - h - 1, 1, 2, '#7aff9a'); A.px(ctx, x + 1, bot - h - 1, 1, 2, '#7aff9a');
      if (Math.floor(t * 4) % 2) A.px(ctx, x - 1, bot - h + 2, 2, 1, '#120c1a');
    },
    hit(g, x, y, d, P) {
      for (let i = 0; i < 4; i++) shape(g, { life: 0.6, spawn(e) { e.vx = e.dir * R(30, 90); e.vy = R(-150, -60); }, update(e, dt) { e.vy += 420 * dt; e.x += e.vx * dt; e.y += e.vy * dt; }, draw(e, ctx, ox, oy, A) { const a = e.t * 15, c = Math.cos(a) * 3, s = Math.sin(a) * 3; A.line(ctx, e.x + ox - c, e.y + oy - s, e.x + ox + c, e.y + oy + s, '#e8e4d8'); } }, { x, y, pal: P, dir: d });
    },
  };
  G.metal = {
    sound: 'clang',
    draw(ctx, { A, x, bot, h, t, P }) {
      const w = 9; A.px(ctx, x - w / 2 - 1, bot - h - 1, w + 2, h + 1, '#2a2e38'); A.px(ctx, x - w / 2, bot - h, w, h, '#8a90a0'); A.px(ctx, x - w / 2, bot - h, w, 1, '#c8d0e0');
      for (const yy of [3, h - 4]) for (const xx of [-3, 2]) A.px(ctx, x + xx, bot - h + yy, 1, 1, '#4a5060');
      const sh = (t * 30) % (h + 20) - 10; for (let i = 0; i < 4; i++) if (sh + i > 0 && sh + i < h) A.px(ctx, x - w / 2, bot - h + sh + i - i, w, 1, i === 1 ? '#ffffff' : '#c8d0e0');
    },
    hit(g, x, y, d, P) { spray(g, x, y, d, 14, ['#ffffff', '#ffd34d', '#ffb83a'], 220, { ay: 400, life: 0.35 }); },
  };
  G.sand = {
    sound: 'thud',
    draw(ctx, { A, x, bot, h, t, P }) {
      for (let i = 0; i < 40; i++) { const a = t * 8 + i * 0.7, yy = (i / 40) * h; A.px(ctx, x + Math.cos(a) * (3 + (i % 3)), bot - yy, 1, 1, i % 3 ? P.c : P.l); }
      for (let i = 0; i < 4; i++) A.px(ctx, x - 4 + i * 3, bot - ((t * 50 + i * 7) % h), 1, 1, P.d);
    },
    hit(g, x, y, d, P) { for (let i = 0; i < 16; i++) dot(g, x, y, d * R(10, 100), R(-80, 20), i % 2 ? P.c : P.l, { ay: 120, life: 0.6 }); },
  };
  G.magma = {
    sound: 'crackle',
    draw(ctx, { A, x, bot, h, t, P }) {
      const w = 9; A.px(ctx, x - w / 2, bot - h, w, h, '#1a1020'); A.px(ctx, x - w / 2, bot - h, 2, h, '#2a2030');
      let cx = x; for (let yy = 0; yy < h; yy += 3) { cx += ((yy * 7) % 5) - 2; cx = U.clamp(cx, x - 3, x + 3); A.px(ctx, cx, bot - h + yy, 1, 3, Math.sin(t * 6 + yy) > -0.3 ? P.c : P.core); }
      A.px(ctx, x - w / 2 + 2, bot - h + 2, 1, 4, '#5a4a6a');
    },
    hit(g, x, y, d, P) { for (let i = 0; i < 10; i++) dot(g, x, y, d * R(30, 110), R(-160, -40), i % 2 ? P.c : P.core, { ay: 450, size: 2, life: 0.7 }); },
  };
  G.storm = {
    sound: 'zap',
    draw(ctx, { A, x, bot, h, t, P }) {
      for (let i = 0; i < 5; i++) A.disc(ctx, x - 6 + i * 3, bot - h - 2 + (i % 2), 3, '#3a4a6a', '#5a6a8a');
      for (let i = 0; i < 8; i++) A.px(ctx, x - 5 + i * 1.4, bot - h + 3 + ((t * 120 + i * 13) % (h - 3)), 1, 3, '#8ab0e0');
      if (Math.floor(t * 7) % 4 === 0) { let lx = x; for (let yy = bot - h + 2; yy < bot; yy += 5) { const nx = x + Math.sin(yy + t * 30) * 3; A.line(ctx, lx, yy, nx, yy + 5, '#ffffff'); lx = nx; } }
    },
    hit(g, x, y, d, P) { spray(g, x, y, d, 10, ['#8ab0e0', '#ffffff'], 150, { ay: 300, life: 0.4 }); spray(g, x, y, d, 5, [P.l], 220, { life: 0.15 }); },
  };
  G.cosmic = {
    sound: 'chime',
    draw(ctx, { A, x, bot, h, t, P }) {
      const cy = bot - h / 2; ovalFill(A, ctx, x, cy, 6, h / 2, '#0a0820');
      for (let i = 0; i < 9; i++) if ((Math.floor(t * 5) + i) % 4) A.px(ctx, x - 4 + ((i * 5) % 9), cy - h / 2 + 3 + ((i * 7) % (h - 6)), 1, 1, i % 3 ? '#ffffff' : '#ffd34d');
      oval(A, ctx, x, cy, 6, h / 2, P.c);
    },
    hit(g, x, y, d, P) { for (let i = 0; i < 10; i++) dot(g, x, y, d * R(20, 120), R(-90, 90), i % 2 ? '#ffffff' : '#ffd34d', { blink: 30, life: 0.6 }); },
  };
  G.void = {
    sound: 'glitch',
    draw(ctx, { A, x, bot, h, t, P }) {
      const cy = bot - h / 2; ovalFill(A, ctx, x, cy, 7, h / 2 + 1, '#ffffff'); ovalFill(A, ctx, x, cy, 6, h / 2, '#000000');
      for (let i = 0; i < 6; i++) { const a = -t * 4 + i, rr = 10 + ((t * 20 + i * 3) % 6); A.px(ctx, x + Math.cos(a) * rr * 0.6, cy + Math.sin(a) * rr * 1.4, 1, 1, P.c); }
    },
    hit(g, x, y, d, P) {
      shape(g, { life: 0.35, draw(e, ctx, ox, oy, A) { const k = e.t / e.life; for (let i = 0; i < 10; i++) { const a = i * 0.63, r = 20 * (1 - k); A.px(ctx, e.x + ox + Math.cos(a) * r, e.y + oy + Math.sin(a) * r, 1, 1, i % 2 ? '#ffffff' : e.pal.c); } A.disc(ctx, e.x + ox, e.y + oy, Math.round(3 * (1 - k)) + 1, '#000000'); } }, { x, y, pal: P, dir: d });
    },
  };
  G.psychic = {
    sound: 'psi',
    draw(ctx, { A, x, bot, h, t, P }) {
      const cy = bot - h / 2; for (let i = 0; i < 3; i++) { const r = ((t * 1.5 + i / 3) % 1); A.alpha(ctx, 1 - r * 0.7, () => oval(A, ctx, x, cy, 2 + r * 5, 4 + r * h / 2, i % 2 ? P.c : P.l)); }
      A.px(ctx, x - 2, cy, 4, 2, '#ffffff'); A.px(ctx, x - 1, cy, 2, 2, P.d);
    },
    hit(g, x, y, d, P) { shape(g, { life: 0.4, draw(e, ctx, ox, oy, A) { const k = e.t / e.life; A.alpha(ctx, 1 - k, () => { oval(A, ctx, e.x + ox, e.y + oy, 4 + k * 20, 4 + k * 20, e.pal.c); oval(A, ctx, e.x + ox, e.y + oy, 2 + k * 12, 2 + k * 12, '#ffffff'); }); } }, { x, y, pal: P, dir: d }); },
  };
  G.crystal = {
    sound: 'glass',
    draw(ctx, { A, x, bot, h, t, P }) {
      const gem = (gx, gh, hi) => { for (let yy = 0; yy < gh; yy++) { const q = yy / gh, hw = q < 0.25 ? (q / 0.25) * 3 : 3; A.px(ctx, gx - hw, bot - gh + yy, hw, 1, hi ? '#ffffff' : P.l); A.px(ctx, gx, bot - gh + yy, hw, 1, P.c); } };
      gem(x - 3, h * 0.6, false); gem(x + 3, h * 0.75, false); gem(x, h, true);
      const cols = ['#ff5a5a', '#ffe95a', '#5fd84a', '#3aa0ff', '#c86aff']; A.px(ctx, x - 1, bot - h * 0.5 - ((t * 20) % 8), 1, 2, cols[Math.floor(t * 8) % 5]);
    },
    hit(g, x, y, d, P) { const cols = ['#ff5a5a', '#ffe95a', '#5fd84a', '#3aa0ff', '#c86aff', '#ffffff']; spray(g, x, y, d, 12, cols, 150, { ay: 250, life: 0.5 }); },
  };
  G.moon = {
    sound: 'chime',
    draw(ctx, { A, x, bot, h, d, t, P }) {
      // a solid crescent: inside the moon, outside the bite taken out of it
      const cy = bot - h / 2, r = h / 2, rx = 6;
      for (let yy = -r; yy <= r; yy++) for (let xx = -rx; xx <= rx; xx++) {
        const inMoon = (xx * xx) / (rx * rx) + (yy * yy) / (r * r) <= 1, bx = xx + d * 4, inBite = (bx * bx) / (rx * rx) + (yy * yy) / ((r - 1) * (r - 1)) <= 1;
        if (inMoon && !inBite) A.px(ctx, x + xx, cy + yy, 1, 1, xx * d < -rx + 2 ? '#ffffff' : P.c);
      }
      if (Math.floor(t * 2) % 2) A.px(ctx, x + d * 5, cy - r + 3, 1, 1, '#ffffff');
    },
    hit(g, x, y, d, P) { for (let i = 0; i < 10; i++) dot(g, x, y, d * R(10, 80), R(-80, 40), i % 2 ? '#ffffff' : P.c, { ay: -20, blink: 20, life: 0.7 }); },
  };
  G.solar = {
    sound: 'crackle',
    draw(ctx, { A, x, bot, h, t, P }) {
      const cy = bot - h / 2; for (let i = 0; i < 12; i++) { const a = t * 2 + (i / 12) * Math.PI * 2, l = 9 + Math.sin(t * 10 + i * 2) * 2; A.line(ctx, x + Math.cos(a) * 6, cy + Math.sin(a) * 8, x + Math.cos(a) * l, cy + Math.sin(a) * (l + 3), i % 2 ? P.c : P.l); }
      A.disc(ctx, x, cy, 6, P.c, '#fff8d0');
    },
    hit(g, x, y, d, P) { ring(g, x, y, 10, ['#ffffff', P.c, P.l], 110, { life: 0.35, ay: -40 }); spray(g, x, y, d, 6, ['#ffffff'], 200, { len: 4, life: 0.2 }); },
  };
  G.magnetism = {
    sound: 'clang',
    draw(ctx, { A, x, bot, h, d, t }) {
      const cy = bot - h / 2; for (let yy = -10; yy <= 10; yy++) { const xx = Math.sqrt(Math.max(0, 100 - yy * yy)) * 0.5; A.px(ctx, x - d * xx, cy + yy, 3, 1, yy < 0 ? '#ff4a6a' : '#4a6aff'); }
      A.px(ctx, x - 1, cy - 11, 4, 2, '#c8d0e0'); A.px(ctx, x - 1, cy + 10, 4, 2, '#c8d0e0');
      for (let k = 1; k <= 2; k++) for (let i = 0; i < 12; i++) { if ((i + Math.floor(t * 20)) % 3 === 0) continue; const yy = -10 + (i / 11) * 20; A.px(ctx, x + d * (3 + Math.sqrt(Math.max(0, 100 - yy * yy)) * 0.4 * k), cy + yy, 1, 1, '#c8ff4a'); }
    },
    hit(g, x, y, d, P) { for (let i = 0; i < 12; i++) dot(g, x, y, d * R(60, 180), R(-60, 60), '#8a90a0', { len: 2, life: 0.4 }); },
  };
  G.time = {
    sound: 'tick',
    draw(ctx, { A, x, bot, h, t, P }) {
      const cy = bot - h / 2, r = 7; A.disc(ctx, x, cy, r, '#2a2418'); oval(A, ctx, x, cy, r, r * 1.6, P.c); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; A.px(ctx, x + Math.cos(a) * (r - 1), cy + Math.sin(a) * (r - 1) * 1.6, 1, 1, i % 3 ? P.l : '#ffffff'); }
      const m = Math.floor(t * 4) * (Math.PI / 6); A.line(ctx, x, cy, x + Math.sin(m) * (r - 2), cy - Math.cos(m) * (r - 2) * 1.6, '#ffffff');
    },
    hit(g, x, y, d, P) {
      shape(g, { life: 0.5, draw(e, ctx, ox, oy, A) { const k = e.t / e.life; A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 8; i++) { const a = i * 0.785; A.px(ctx, e.x + ox + Math.cos(a) * (6 + k * 10), e.y + oy + Math.sin(a) * (6 + k * 10), 2, 2, i % 2 ? e.pal.c : '#ffffff'); } A.text(ctx, 'TICK', e.x + ox + e.dir * 6, e.y + oy - 12 - k * 6, e.pal.l); }); } }, { x, y, pal: P, dir: d });
    },
  };
  G.gravity = {
    sound: 'thud',
    draw(ctx, { A, x, bot, h, t, P }) {
      const cy = bot - h / 2; for (let i = 0; i < 3; i++) { const r = 1 - ((t * 1.2 + i / 3) % 1); oval(A, ctx, x, cy, 2 + r * 5, 3 + r * h / 2, P.c); }
      for (let i = 0; i < 4; i++) { const a = t * 3 + i * 1.57; A.px(ctx, x + Math.cos(a) * 7 - 1, cy + Math.sin(a) * (h / 2) - 1, 2, 2, '#6a5a8a'); }
    },
    hit(g, x, y, d, P) { for (let i = 0; i < 6; i++) dot(g, x + d * R(2, 10), y, d * R(5, 30), R(40, 120), '#6a5a8a', { ay: 900, size: 2, life: 0.4 }); ring(g, x, y + 10, 8, [P.c], 60, { life: 0.25 }); },
  };
  G.sound = {
    sound: 'boom',
    draw(ctx, { A, x, bot, h, t, P }) {
      for (let i = 0; i < 7; i++) { const bh = 4 + Math.abs(Math.sin(t * 12 + i * 1.3)) * (h - 4); A.px(ctx, x - 7 + i * 2, bot - bh, 1, bh, bh > h * 0.75 ? '#ffffff' : P.c); }
      for (let i = 0; i < 2; i++) { const r = (t * 2 + i / 2) % 1; A.alpha(ctx, 1 - r, () => A.arc(ctx, x, bot - h / 2, 6 + r * 6, 1, P.l, 1, -0.8, 0.8)); }
    },
    hit(g, x, y, d, P) { shape(g, { life: 0.4, draw(e, ctx, ox, oy, A) { const k = e.t / e.life; A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 3; i++) A.arc(ctx, e.x + ox, e.y + oy, 4 + k * 24 + i * 4, e.dir, e.pal.c, 1, -0.9, 0.9); A.shape(ctx, 'note', e.x + ox + e.dir * 8, e.y + oy - 8 - k * 10, 0, e.pal, 1, e.t); }); } }, { x, y, pal: P, dir: d }); },
  };
  G.mist = {
    sound: 'whoosh',
    draw(ctx, { A, x, bot, h, t }) {
      for (let i = 0; i < 6; i++) A.alpha(ctx, 0.55, () => A.disc(ctx, x + Math.sin(t * 2 + i * 1.7) * 2, bot - 4 - i * (h / 6), 4 + (i % 2), i % 2 ? '#dce4ec' : '#b8c4d0'));
    },
    hit(g, x, y, d, P) { for (let i = 0; i < 8; i++) dot(g, x, y, d * R(10, 60), R(-30, 30), '#dce4ec', { size: 3, grow: 5, alpha: 0.5, life: 0.7 }); },
  };
  G.spirit = {
    sound: 'whoosh',
    draw(ctx, { A, x, bot, h, d, t, P }) {
      const y = bot - h * 0.55 + Math.sin(t * 4) * 2; A.alpha(ctx, 0.7, () => { A.disc(ctx, x, y - 5, 5, P.c); A.px(ctx, x - 5, y - 5, 10, 10, P.c); for (let i = 0; i < 3; i++) A.px(ctx, x - 5 + i * 4 + (Math.floor(t * 8 + i) % 2), y + 5, 3, 2, P.c); A.px(ctx, x - 9, y - 2, 4, 2, P.c); A.px(ctx, x + 5, y - 2, 4, 2, P.c); });
      A.px(ctx, x - 2 + d, y - 6, 1, 2, '#120c1a'); A.px(ctx, x + 1 + d, y - 6, 1, 2, '#120c1a');
    },
    hit(g, x, y, d, P) { for (let i = 0; i < 6; i++) dot(g, x, y, d * R(10, 60), R(-90, -30), i % 2 ? P.l : '#ffffff', { size: 2, wobble: 40, wobbleRate: 10, life: 0.8 }); },
  };
  G.chaos = {
    sound: 'glitch',
    draw(ctx, Gd) {
      // chaos flickers between other elements' blocks
      const ids = Object.keys(G).filter((id) => id !== 'chaos'), id = ids[Math.floor(Gd.t * 5) % ids.length], el = ERX.Elements.get(id);
      const P = ERX.Abilities.palette(el, ERX.Kits[id], false);
      G[id].draw(ctx, Object.assign({}, Gd, { P }));
      const A = Gd.A; for (let i = 0; i < 4; i++) A.px(ctx, Gd.x - 6 + ((i * 5 + Math.floor(Gd.t * 30)) % 12), Gd.bot - Gd.h + ((i * 9 + Math.floor(Gd.t * 40)) % Gd.h), 6, 1, ERX.Abilities.toHex(ERX.Abilities.rainbowColor(Gd.t * 3 + i)));
    },
    hit(g, x, y, d, P) { const cols = []; for (let i = 0; i < 6; i++) cols.push(ERX.Abilities.toHex(ERX.Abilities.rainbowColor(i * 0.5))); spray(g, x, y, d, 16, cols, 170, { life: 0.4 }); },
  };

  ERX.Guards = G;
})(window.ERX = window.ERX || {});
