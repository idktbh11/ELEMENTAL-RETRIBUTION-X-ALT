/*
 * ENTERING A WORLD — every world, every time.
 *
 *   2 s of black -> a galaxy portal tears open at the top and you drop out
 *   of it -> falling through the void -> it gets brighter... and brighter...
 *   -> the light cracks -> it SHATTERS -> you're in the world's sky, falling.
 *   ~13 s of falling: dodge whatever comes at you (left / right, dash for a
 *   quick swerve), punch down through the sea of clouds halfway, the whole
 *   world below you -> you hit the ground (a shockwave in your element's
 *   style), and 1.3 s later you get back up.
 *
 *   g.fall = new ERX.SkyFall(g, worldNumber)
 *   update(dt)            drives the camera + you (the game skips its own)
 *   renderWorld(ctx, cam) you + whatever is flying at you (world space)
 *   renderOverlay(...)    the void, the light, the cracks, wind, cloud fog
 *
 * Each world says what flies at you in WORLDS below (World 1: geese, birds
 * and paper planes above the clouds; hot-air balloons and kites below).
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, C = ERX.Color;
  const K = () => ERX.Keybinds;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);

  const WORLDS = {
    1: { name: 'WORLD 1', sub: 'A perfectly normal planet. Suspiciously normal.', level: 'world1', high: ['geese', 'bird', 'plane', 'bird'], low: ['balloon', 'kite', 'bird', 'plane', 'balloon'] },
  };

  // how long each part lasts (seconds)
  const T = { black: 2, portal: 1.6, voidFall: 3.2, bright: 1.7, crack: 1.1, shatter: 0.6, sky: 13, land: 1.3, rise: 0.4 };
  const ORDER = ['black', 'portal', 'voidFall', 'bright', 'crack', 'shatter', 'sky', 'land', 'rise'];
  const VMIN = 120, TAU = 1.5;       // fall speed: starts at VMIN and builds to terminal velocity
  const fallDist = (t, vmax) => VMIN * t + (vmax - VMIN) * (t - TAU * (1 - Math.exp(-t / TAU)));
  const vmaxFor = (H, dur) => VMIN + (H - VMIN * dur) / (dur - TAU * (1 - Math.exp(-dur / TAU)));

  // ------------------------------------------------------------ your body
  /**
   * Freefall, skydiver style: arms spread wide (hands out past your head, so your face stays clear), legs apart
   * and bent at the knee, everything fluttering in the wind. You lean into a dodge: the arm on that side
   * dips and the other one rises, your legs trail the other way.
   */
  function fallPose(t, vx, scream) {
    const w = (sp, ph) => Math.sin(t * sp + ph), lean = U.clamp(vx / 70, -1.6, 1.6), bank = lean * 0.9;
    return {
      bob: 0, lean: Math.round(lean * 0.8),
      FA: [[12.4 + lean * 0.3, 11.2 + bank * 0.5 + w(6.5, 1) * 0.4], [15.2 + lean * 0.4 + w(8, 0.4) * 0.4, 9.6 + bank + w(9.5, 1.3) * 0.7]],
      BA: [[4.2 + lean * 0.3, 11.2 - bank * 0.5 + w(6.5, 2.2) * 0.4], [1.4 + lean * 0.4 + w(8, 2.6) * 0.4, 9.6 - bank + w(9.5, 2.9) * 0.7]],
      FL: [[11 - lean * 0.4 + w(3.2, 0) * 0.5, 18.6 + w(4.1, 0.4) * 0.4], [12.8 - lean * 0.8 + w(3.2, 0.7) * 0.8, 21 + w(4.6, 1.1) * 0.5]],
      BL: [[5.4 - lean * 0.4 + w(3.2, 2) * 0.5, 18.9 + w(4.1, 2.3) * 0.4], [3.6 - lean * 0.8 + w(3.2, 2.7) * 0.8, 21.5 + w(4.6, 3.1) * 0.5]],
      wind: true, windPh: Math.floor(t * 16) % 4, mouthOpen: !!scream,
    };
  }
  /** Knocked into a spin: limbs everywhere. */
  function tumblePose(t) {
    const w = (sp, ph) => Math.sin(t * sp + ph);
    return { bob: 0, lean: 0, FA: [[12, 12 + w(20, 0)], [14 + w(17, 1), 9 + w(23, 2) * 2]], BA: [[4, 12 + w(19, 1)], [2 + w(21, 2), 10 + w(18, 3) * 2]], FL: [[11, 17 + w(15, 1)], [13, 19 + w(16, 2)]], BL: [[5, 18 + w(14, 2)], [3, 20 + w(17, 3)]], wind: true, windPh: Math.floor(t * 20) % 4, mouthOpen: true, eyesClosed: true };
  }
  const lerpPt = (a, b, k) => [U.lerp(a[0], b[0], k), U.lerp(a[1], b[1], k)];
  const lerpJ = (a, b, k) => Object.assign({}, b, { bob: U.lerp(a.bob || 0, b.bob || 0, k), lean: U.lerp(a.lean || 0, b.lean || 0, k), FL: [lerpPt(a.FL[0], b.FL[0], k), lerpPt(a.FL[1], b.FL[1], k)], BL: [lerpPt(a.BL[0], b.BL[0], k), lerpPt(a.BL[1], b.BL[1], k)], FA: [lerpPt(a.FA[0], b.FA[0], k), lerpPt(a.FA[1], b.FA[1], k)], BA: [lerpPt(a.BA[0], b.BA[0], k), lerpPt(a.BA[1], b.BA[1], k)] });

  /** Draw you from a joint set, rotated by `ang` around your middle, feet anchor at (x, y), scaled by s. */
  function drawBody(ctx, look, joints, x, y, facing, ang, s) {
    const cv = ERX.PlayerSide.frameJoints(look, joints, facing);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y - 12 * (s || 1)));
    if (ang) ctx.rotate(ang);
    if (s && s !== 1) ctx.scale(s, s);
    ERX.PlayerSide.draw(ctx, cv, 0, 12, facing);
    ctx.restore();
  }

  // ------------------------------------------------------------ what flies at you
  /** Tiny sprites from rectangles [dx, dy, w, h, colour], drawn facing right (dir mirrors them). */
  function spr(ctx, x, y, dir, rects) { for (const r of rects) { ctx.fillStyle = r[4]; ctx.fillRect(Math.round(dir > 0 ? x + r[0] : x - r[0] - r[2]), Math.round(y + r[1]), r[2], r[3]); } }
  const BIRD = [
    [[-2, 0, 5, 2, '#3a3448'], [2, -1, 2, 2, '#3a3448'], [4, 0, 1, 1, '#ffb030'], [-4, 0, 2, 1, '#3a3448'], [-1, -3, 2, 1, '#4a4458'], [0, -2, 2, 1, '#4a4458']],
    [[-2, 0, 5, 2, '#3a3448'], [2, -1, 2, 2, '#3a3448'], [4, 0, 1, 1, '#ffb030'], [-4, 0, 2, 1, '#3a3448'], [-4, -1, 7, 1, '#4a4458']],
    [[-2, 0, 5, 2, '#3a3448'], [2, -1, 2, 2, '#3a3448'], [4, 0, 1, 1, '#ffb030'], [-4, 0, 2, 1, '#3a3448'], [-1, 2, 2, 1, '#4a4458'], [0, 3, 1, 1, '#4a4458']],
  ];
  const GOOSE = [
    [[-4, 0, 8, 3, '#8a7a6a'], [-4, 2, 7, 1, '#e8e0d4'], [4, -2, 2, 3, '#2a2420'], [5, -3, 2, 2, '#2a2420'], [7, -2, 2, 1, '#ffa030'], [-6, 0, 2, 2, '#2a2420'], [-2, -4, 4, 2, '#6a5a4a'], [-1, -6, 2, 2, '#6a5a4a']],
    [[-4, 0, 8, 3, '#8a7a6a'], [-4, 2, 7, 1, '#e8e0d4'], [4, -2, 2, 3, '#2a2420'], [5, -3, 2, 2, '#2a2420'], [7, -2, 2, 1, '#ffa030'], [-6, 0, 2, 2, '#2a2420'], [-7, -1, 12, 1, '#6a5a4a']],
    [[-4, 0, 8, 3, '#8a7a6a'], [-4, 2, 7, 1, '#e8e0d4'], [4, -2, 2, 3, '#2a2420'], [5, -3, 2, 2, '#2a2420'], [7, -2, 2, 1, '#ffa030'], [-6, 0, 2, 2, '#2a2420'], [-2, 3, 4, 2, '#6a5a4a'], [-1, 5, 2, 1, '#6a5a4a']],
  ];
  const PLANE = [[-6, 0, 12, 1, '#ffffff'], [-4, -1, 8, 1, '#eef2fa'], [-5, 1, 8, 1, '#c8d0e0'], [-1, -2, 3, 1, '#ffffff'], [-6, 2, 4, 1, '#aab4c8']];
  const STRIPES = [['#ff5a5a', '#ffd34d', '#ff5a5a', '#5ab0ff'], ['#7ad85a', '#ffffff', '#7ad85a', '#ff8ad8'], ['#b87aff', '#ffd34d', '#ff9a3a', '#b87aff'], ['#5ab0ff', '#ffffff', '#ff5a5a', '#ffffff']];
  const KITES = [['#ff4a6a', '#ffd34d'], ['#5ab0ff', '#ffffff'], ['#7ad85a', '#ff9a3a'], ['#b87aff', '#6af0d8']];

  function drawObstacle(ctx, o, x, y) {
    if (o.kind === 'bird' || o.kind === 'goose') {
      const f = o.gone ? 2 : Math.floor(o.t * (o.kind === 'goose' ? 8 : 12) + o.ph) % 3;
      spr(ctx, x, y, o.dir, (o.kind === 'goose' ? GOOSE : BIRD)[f === 2 ? 1 : f === 1 ? 2 : 0]);
    } else if (o.kind === 'plane') {
      ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(Math.sin(o.t * 3) * 0.08 + (o.gone ? o.t * 9 : 0)); spr(ctx, 0, 0, o.dir, PLANE); ctx.restore();
      ctx.globalAlpha = 0.3; ctx.fillStyle = '#ffffff'; for (let i = 1; i < 5; i++) ctx.fillRect(Math.round(x - o.dir * (7 + i * 4)), Math.round(y + 1 + i * 0.6), 2, 1); ctx.globalAlpha = 1;
    } else if (o.kind === 'balloon') {
      const sw = Math.sin(o.t * 1.4 + o.ph) * 1.5, S = STRIPES[o.pal], R = 13, Ry = 15;
      for (let yy = -Ry; yy <= Ry; yy++) {
        const k = yy / Ry, hw = Math.round(Math.sqrt(Math.max(0, 1 - k * k)) * R * (yy > 0 ? 1 - k * 0.35 : 1));
        for (let xx = -hw; xx <= hw; xx++) {
          let col = S[Math.floor((xx + R) / 6.5) % S.length];
          if (xx > hw * 0.55) col = C.shade(col, -0.25); else if (xx < -hw * 0.5 && yy < 0) col = C.shade(col, 0.2);
          ctx.fillStyle = col; ctx.fillRect(Math.round(x + xx + sw), Math.round(y + yy), 1, 1);
        }
      }
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x - 7 + sw), Math.round(y - 9), 2, 3);
      ctx.fillStyle = '#5a4030';
      for (const sx of [-5, 5]) for (let i = 0; i < 7; i++) ctx.fillRect(Math.round(x + sw + sx * (1 - i / 9)), Math.round(y + Ry - 1 + i), 1, 1);
      ctx.fillStyle = '#8a5a30'; ctx.fillRect(Math.round(x + sw - 4), Math.round(y + Ry + 6), 8, 5); ctx.fillStyle = '#6a4020'; ctx.fillRect(Math.round(x + sw - 4), Math.round(y + Ry + 6), 8, 1);
      ctx.fillStyle = '#f0c8a0'; ctx.fillRect(Math.round(x + sw - 1), Math.round(y + Ry + 3), 3, 3); ctx.fillStyle = '#3a2a5a'; ctx.fillRect(Math.round(x + sw - 1), Math.round(y + Ry + 2), 3, 1);
      if (o.wave) { const a = Math.sin(o.t * 14) > 0 ? -1 : 0; ctx.fillStyle = '#f0c8a0'; ctx.fillRect(Math.round(x + sw + 3), Math.round(y + Ry + 2 + a), 1, 3); }
      if (o.alarm > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x + sw), Math.round(y + Ry - 6), 1, 3); ctx.fillRect(Math.round(x + sw), Math.round(y + Ry - 2), 1, 1); }
    } else if (o.kind === 'kite') {
      const bob = Math.sin(o.t * 2 + o.ph) * 2, [c1, c2] = KITES[o.pal], X = Math.round(x), Y = Math.round(y + bob);
      ctx.globalAlpha = 0.45; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X + 0.5, Y + 2.5); ctx.quadraticCurveTo(X - o.dir * 30, Y + 60, X - o.dir * 50, Y + 260); ctx.stroke(); ctx.globalAlpha = 1;
      for (let yy = -9; yy <= 9; yy++) { const hw = Math.round(yy < -1 ? ((yy + 9) / 8) * 6 : ((9 - yy) / 10) * 6); for (let xx = -hw; xx <= hw; xx++) { ctx.fillStyle = (xx < 0) === (yy < -1) ? c1 : c2; ctx.fillRect(X + xx, Y + yy, 1, 1); } }
      ctx.fillStyle = '#6a4a30'; ctx.fillRect(X, Y - 9, 1, 19); ctx.fillRect(X - 6, Y - 1, 13, 1);
      let tx = X, ty = Y + 9;
      for (let i = 1; i <= 14; i++) { const nx = X + Math.sin(o.t * 5 + i * 0.6) * (i * 0.5), ny = Y + 9 + i * 2; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(nx), Math.round(ny), 1, 1); if (i % 5 === 0) { ctx.fillStyle = c1; ctx.fillRect(Math.round(nx) - 2, Math.round(ny), 2, 1); ctx.fillRect(Math.round(nx) + 1, Math.round(ny), 2, 1); } tx = nx; ty = ny; }
      void tx; void ty;
    }
  }

  // ------------------------------------------------------------ landing in your element's style
  const rainbow = (t) => ERX.Abilities.rainbowColor(t);
  /** A ring whose colour runs all the way round the rainbow. */
  const rainbowRing = (ctx, A, x, y, r, flat, t) => { const n = Math.max(12, Math.round(r * 2.4)); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * flat, 1, 1, rainbow((i / n) * 3 + t * 4)); } };
  /** The crater + shockwave when you hit the ground: your element's colours and its own flourish. */
  const LANDFX = {
    life: 2.2,
    spawn(e) {
      e.bits = [];
      for (let i = 0; i < (e.chaos ? 46 : 26); i++) { const a = -Math.PI * (0.05 + Math.random() * 0.9), sp = 60 + Math.random() * (e.chaos ? 280 : 200); e.bits.push({ x: e.x, y: e.y - 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: Math.random() < (e.chaos ? 0.45 : 0.3) ? 2 : 1 }); }
      if (e.chaos) { e.cracks = []; for (let i = 0; i < 7; i++) { const sd = i % 2 ? 1 : -1, L = 18 + Math.random() * 26, pts = [[0, 0]]; for (let k = 1; k <= 4; k++) pts.push([sd * (L * k) / 4 + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2]); e.cracks.push(pts); } }   // Chaos splits the ground
    },
    update(e, dt) { for (const b of e.bits) { b.vy += 420 * dt; b.x += b.vx * dt; b.y = Math.min(e.y, b.y + b.vy * dt); } },
    draw(e, ctx, ox, oy, A) {
      const k = Math.min(1, e.t / 0.6), x = e.x + ox, y = e.y + oy, P = e.pal, fx = e.fx, t = e.t;
      // the crater stays a while (Chaos leaves a bigger one, and splits the ground around it)
      const cw = e.chaos ? 32 : 22;
      A.alpha(ctx, Math.min(1, (e.life - t) / 0.8), () => {
        A.px(ctx, x - cw, y - 1, cw * 2, e.chaos ? 3 : 2, '#3a2a20'); A.px(ctx, x - cw * 0.64, y - 2, cw * 1.28, 1, '#5a4030');
        for (let i = -3; i <= 3; i++) A.px(ctx, x + i * (e.chaos ? 11 : 8), y - 3 - Math.abs(Math.sin(i * 1.7)) * (e.chaos ? 5 : 3), 3, 2, '#7a5a3a');
        if (e.cracks) for (const c of e.cracks) for (let i = 1; i < c.length; i++) A.line(ctx, x + c[i - 1][0], y + c[i - 1][1], x + c[i][0], y + c[i][1], t < 0.5 ? rainbow(i + t * 6) : '#2a1a14', 1);
      });
      if (t < 0.8) {
        const q = 1 - Math.pow(1 - Math.min(1, t / 0.8), 3);
        A.alpha(ctx, 1 - t / 0.8, () => {
          const R = e.chaos ? 150 : 120;
          for (let w = 0; w < 3; w++) A.ring(ctx, x, y - 2, 8 + q * R - w * 2, w ? P.c : '#ffffff', (8 + q * R - w * 2) * 0.22);
          A.ring(ctx, x, y - 2, 4 + q * 70, P.l, (4 + q * 70) * 0.3, 2);
          if (e.chaos) { rainbowRing(ctx, A, x, y - 2, 9 + q * R, 0.22, t); rainbowRing(ctx, A, x, y - 2, 10 + q * R, 0.22, t + 0.3); rainbowRing(ctx, A, x, y - 2, 5 + q * 70, 0.3, t + 0.6); }
        });
      }
      A.alpha(ctx, 1 - k, () => {
        if (fx === 'embers' || fx === 'cinders' || fx === 'flares') for (let i = -6; i <= 6; i++) { const fh = Math.round((10 + Math.abs(Math.sin(i * 2.1 + t * 9)) * 16) * (1 - Math.abs(i) / 8)), fx0 = x + i * 9 * (0.5 + k); for (let r = 0; r < fh; r++) { const q = r / fh, wd = Math.max(1, Math.round((1 - q) * 4)), sway = Math.sin(t * 14 + i + q * 4) * q * 2; A.px(ctx, fx0 - wd / 2 + sway, y - r, wd, 1, q < 0.18 ? '#ffffff' : q < 0.45 ? P.l : q < 0.8 ? P.c : C.shade(P.c, -0.3)); } }
        else if (fx === 'snow') for (let i = -5; i <= 5; i++) { if (!i) continue; const h = (16 - Math.abs(i) * 2) * Math.min(1, t * 6); A.tri(ctx, x + i * 10 * (0.6 + k * 0.6), y, 6, h, P.l, '#ffffff'); }
        else if (fx === 'sparks') for (let i = 0; i < 6; i++) { const a = -Math.PI * (0.1 + i * 0.16), L = 30 + k * 40; A.jag(ctx, x, y - 4, x + Math.cos(a) * L, y - 4 + Math.sin(a) * L * 0.8, i % 2 ? '#ffffff' : P.c, 3, 1); }
        else if (fx === 'droplets' || fx === 'bubbles') for (let i = 0; i < 14; i++) { const a = -Math.PI * (0.08 + i * 0.06), r = 20 + k * 50; A.disc(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9, 2, i % 2 ? P.c : '#ffffff'); }
        else if (fx === 'gusts') for (let i = 0; i < 8; i++) { const r = 14 + k * 70 + i * 3; A.arc(ctx, x, y - 6, r, i % 2 ? 1 : -1, i % 3 ? P.c : '#ffffff', 1, -0.9, 0.3); }
        else if (fx === 'leaves') for (let i = 0; i < 12; i++) { const a = -Math.PI * (0.08 + i * 0.07), r = 16 + k * 46; A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9, 2, 2, ['#ff6a8a', '#ffd34d', '#ffffff', P.c][i % 4]); }
        else if (fx === 'stars') for (let i = 0; i < 9; i++) { const a = -Math.PI * (0.08 + i * 0.1), r = 18 + k * 50; A.star(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, 2, '#ffffff', P.c); }
        else if (fx === 'gloom' || fx === 'void') A.alpha(ctx, 0.7, () => A.disc(ctx, x, y - 6, Math.round(26 * (1 - k)) + 2, '#05020a'));
        else if (fx === 'chaos') for (let i = 0; i < 12; i++) { const a = -Math.PI * (0.06 + i * 0.075), r = 18 + k * 64; A.star(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9, 2, '#ffffff', rainbow(i / 4 + t * 3)); }
      });
      for (const b of e.bits) A.alpha(ctx, Math.max(0, 1 - t / 1.2), () => A.px(ctx, b.x + ox, b.y + oy, b.s, b.s, e.chaos ? (b.s > 1 ? rainbow(b.vx * 0.01) : '#7a5a3a') : b.s > 1 ? P.c : '#7a5a3a'));
    },
  };

  // ------------------------------------------------------------ the sequence
  class SkyFall {
    constructor(g, n) {
      this.g = g;
      this.def = WORLDS[n] || WORLDS[1];
      this.n = n;
      this.phase = 'black';
      this.pt = 0;          // time in this phase
      this.t = 0;           // total
      const L = g.level, vw = g.view.width, vh = g.view.height;
      this.H = L.fallHeight || 3600;
      this.vmax = vmaxFor(this.H, T.sky);
      this.x = L.landX;
      this.vx = 0;
      this.dashT = 0; this.dashCd = 0;
      this.alt = this.H;
      this.obs = [];
      this.spawnT = 1.4;
      this.hitT = 0; this.invT = 0; this.spin = 0;
      this.sx = 0;          // your sideways drift during the void part (screen px)
      this.inCloud = false;
      // the void: stars, nebula, the cracks and the shards (all made once)
      this.stars = Array.from({ length: 140 }, () => ({ x: Math.random() * vw, y: Math.random() * vh, z: 0.2 + Math.random() * 0.8 }));
      this.neb = Array.from({ length: 6 }, (_, i) => ({ x: Math.random() * vw, y: Math.random() * vh * 2, r: 50 + Math.random() * 90, c: ['#5a2a9a', '#2a3a9a', '#2a7a8a', '#8a2a7a'][i % 4] }));
      this.streaks = Array.from({ length: 30 }, () => ({ x: Math.random() * vw, y: Math.random() * vh, len: 4 + Math.random() * 9, sp: 0.6 + Math.random() * 0.8 }));
      this.cracks = this.makeCracks(vw, vh);
      this.shards = this.makeShards(vw, vh);
      this.puffs = [];
      const p = g.player;
      p.controls = false; p.vx = 0; p.vy = 0; p.lying = false;
      g.state = 'skyfall';
      g.hudAlpha = 0;
      g.objective = null;
      ERX.Skyfall = { wind: 0, flap: 1 };
      ERX.Audio.cutMusic();
      ERX.Audio.setAmbience(null);
      this.place();
    }

    get vw() { return this.g.view.width; }
    get vh() { return this.g.view.height; }

    /** Jagged cracks spreading out from a handful of points (grow with k = 0..1). */
    makeCracks(vw, vh) {
      const out = [], cx = vw / 2, cy = vh * 0.52;
      // the main break: spokes from the middle, then rings joining them
      const spokes = 13, R = Math.hypot(vw, vh);
      const ang = Array.from({ length: spokes }, (_, i) => (i / spokes) * Math.PI * 2 + (Math.random() - 0.5) * 0.3);
      ang.forEach((a, i) => { const pts = [[cx, cy]]; let r = 0; while (r < R) { r += 10 + Math.random() * 16; const aa = a + (Math.random() - 0.5) * 0.08; pts.push([cx + Math.cos(aa) * r, cy + Math.sin(aa) * r]); } out.push({ pts, at: i / spokes * 0.3, w: 2 }); });
      for (const rr of [26, 58, 104, 170]) for (let i = 0; i < spokes; i++) { if (Math.random() < 0.25) continue; const a0 = ang[i], a1 = ang[(i + 1) % spokes] + (i === spokes - 1 ? Math.PI * 2 : 0), r0 = rr * (0.85 + Math.random() * 0.3), r1 = rr * (0.85 + Math.random() * 0.3); out.push({ pts: [[cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0], [cx + Math.cos((a0 + a1) / 2) * (r0 + r1) * 0.47, cy + Math.sin((a0 + a1) / 2) * (r0 + r1) * 0.47], [cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1]], at: 0.25 + rr / 400, w: 1 }); }
      return out;
    }
    /** The light breaking into shards: a jittered triangle mesh over the whole view. */
    makeShards(vw, vh) {
      const cols = 9, rows = 6, P = [];
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { const edge = i === 0 || j === 0 || i === cols || j === rows; P.push([(i / cols) * vw + (edge ? 0 : (Math.random() - 0.5) * vw / cols * 0.8), (j / rows) * vh + (edge ? 0 : (Math.random() - 0.5) * vh / rows * 0.8)]); }
      const at = (i, j) => P[j * (cols + 1) + i], out = [], cx = vw / 2, cy = vh * 0.45;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        for (const tri of [[at(i, j), at(i + 1, j), at(i, j + 1)], [at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]]) {
          const mx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, my = (tri[0][1] + tri[1][1] + tri[2][1]) / 3, a = Math.atan2(my - cy, mx - cx), sp = 180 + Math.random() * 260;
          out.push({ tri, mx, my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 60, rot: (Math.random() - 0.5) * 6 });
        }
      }
      return out;
    }

    /** Put you (and the camera) where the fall says. */
    place() {
      const g = this.g, L = g.level, p = g.player, vw = this.vw, vh = this.vh;
      p.placeAt(this.x, L.floorY - Math.max(0, this.alt));
      const cam = g.camera;
      cam.x = U.clamp(U.lerp(cam.x, p.cx - vw / 2, 0.12), 0, Math.max(0, L.pw - vw));
      if (this.phase === 'black' || this.phase === 'portal' || this.phase === 'voidFall' || this.phase === 'bright' || this.phase === 'crack') cam.x = U.clamp(p.cx - vw / 2, 0, Math.max(0, L.pw - vw));
      cam.y = Math.min(p.y - vh * 0.32, L.ph - vh);
    }

    next() {
      const i = ORDER.indexOf(this.phase);
      this.phase = ORDER[i + 1];
      this.pt = 0;
      this.enter(this.phase);
    }

    enter(ph) {
      const g = this.g;
      if (ph === 'portal') { sfx('portalOpen'); ERX.Audio.playMusic('skyfall'); }
      if (ph === 'voidFall') { sfx('portalDrop'); ERX.Audio.setAmbience('skyfall'); }
      if (ph === 'bright') sfx('brightRise');
      if (ph === 'shatter') { sfx('lightShatter'); ERX.FX.shake(4, 0.4); g.flashT = 0.3; }
      if (ph === 'sky') this.title = 0;
      if (ph === 'land') this.land();
      if (ph === 'sky') ERX.FX.shake(2, 0.3);
      if (ph === 'rise') sfx('getUp');
    }

    update(dt) {
      const g = this.g;
      this.t += dt;
      this.pt += dt;
      if (this.pt >= T[this.phase]) { if (this.phase === 'rise') return this.finish(); if (this.phase !== 'sky') this.next(); }
      const S = ERX.Skyfall;
      // ---- steering (the void part only drifts you a little; in the sky you really move)
      const k = K(), left = k.isDown('moveLeft'), right = k.isDown('moveRight'), inSky = this.phase === 'sky';
      if (this.phase === 'voidFall' || this.phase === 'bright' || inSky) {
        const want = (right ? 1 : 0) - (left ? 1 : 0);
        this.dashCd = Math.max(0, this.dashCd - dt); this.dashT = Math.max(0, this.dashT - dt);
        if (inSky && k.wasPressed('dash') && this.dashCd <= 0 && want) { this.dashT = 0.2; this.dashCd = 0.7; this.vx = want * 280; sfx('dash'); }
        if (this.dashT <= 0) this.vx = want ? U.approach(this.vx, want * 135, 7, dt) : U.approach(this.vx, 0, 4, dt);
        if (inSky) {
          const L = g.level;
          this.x += this.vx * dt;
          const lo = Math.max(L.landX - 170, this.vw / 2 - 40), hi = Math.min(L.landX + 170, L.pw - this.vw / 2 + 40);
          if (this.x < lo) { this.x = lo; this.vx = Math.max(0, this.vx); } else if (this.x > hi) { this.x = hi; this.vx = Math.min(0, this.vx); }
        } else this.sx = U.clamp(this.sx + this.vx * dt * 0.5, -this.vw * 0.3, this.vw * 0.3);
        if (Math.abs(this.vx) > 25) g.player.facing = Math.sign(this.vx);
      }
      this.invT = Math.max(0, this.invT - dt);
      this.spin = Math.max(0, this.spin - dt * 1.7);
      // ---- the wind, for the sound
      if (this.phase === 'portal') S.wind = 0.15;
      else if (this.phase === 'voidFall') S.wind = 0.35;
      else if (this.phase === 'bright' || this.phase === 'crack') S.wind = 0.45 + this.pt * 0.1;
      else if (inSky) S.wind = this.inCloud ? 0.35 : U.clamp(0.4 + (this.speed() / this.vmax) * 0.6, 0, 1);
      // ---- falling through the sky
      if (inSky) {
        this.alt = Math.max(0, this.H - fallDist(this.pt, this.vmax));
        const ca = g.level.cloudAlt || 1750, inC = this.alt < ca + 10 && this.alt > ca - 160;
        if (inC && !this.inCloud) { sfx('cloudPuff'); for (let i = 0; i < 10; i++) this.puffs.push({ x: Math.random() * this.vw, y: this.vh + Math.random() * 120, r: 30 + Math.random() * 50 }); }
        this.inCloud = inC;
        this.updateObstacles(dt);
        if (this.alt <= 0) this.next();
      }
      // wind streaks + cloud puffs (screen space)
      const sp = this.phase === 'sky' ? this.speed() : this.phase === 'voidFall' ? 240 : this.phase === 'bright' ? 360 : 120;
      for (const s of this.streaks) { s.y -= sp * s.sp * dt * 1.6; if (s.y < -s.len) { s.y = this.vh + Math.random() * 30; s.x = Math.random() * this.vw; } }
      for (const s of this.stars) { s.y -= sp * s.z * dt * 1.2; if (s.y < -20) { s.y = this.vh + Math.random() * 20; s.x = Math.random() * this.vw; } }
      for (const n of this.neb) { n.y -= sp * 0.15 * dt; if (n.y < -n.r) { n.y = this.vh + n.r; n.x = Math.random() * this.vw; } }
      for (const pf of this.puffs) pf.y -= sp * 1.3 * dt;
      this.puffs = this.puffs.filter((pf) => pf.y > -pf.r * 2);
      if (this.phase === 'crack') { const i = Math.floor(this.pt / (T.crack / 3)); if (i !== this._ci && i < 3) { this._ci = i; sfx('lightCrack', { i }); ERX.FX.shake(1 + i, 0.15); } }
      if (this.phase !== 'land' && this.phase !== 'rise') this.place();
    }

    speed() { const t = this.pt; return VMIN + (this.vmax - VMIN) * (1 - Math.exp(-t / TAU)); }

    // ---------------------------------------------------------- obstacles
    updateObstacles(dt) {
      const g = this.g, p = g.player, cam = g.camera, vh = this.vh, L = g.level, ca = L.cloudAlt || 1750;
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.alt > 420 && Math.abs(this.alt - (ca - 70)) > 200) {
        this.spawnT = U.lerp(0.75, 1.2, Math.random());
        const list = this.alt > ca ? this.def.high : this.def.low;
        this.spawn(list[Math.floor(Math.random() * list.length)], cam.y + vh + 40 + Math.random() * 40);
      }
      const box = { x: p.x + 1, y: p.y + 2, w: p.w - 2, h: p.h - 4 };
      for (const o of this.obs) {
        o.t += dt;
        if (o.gone) { o.vy += 300 * dt; o.alarm = 0; }
        o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.kind === 'bird' || o.kind === 'goose') o.y += Math.sin(o.t * 3 + o.ph) * 8 * dt;
        if (o.kind === 'balloon') { o.alarm = Math.max(0, o.alarm - dt); if (!o.gone && Math.abs(o.y - p.y) < 70 && Math.abs(o.x - p.cx) < 40 && !o.warned) { o.warned = true; o.alarm = 0.8; o.wave = true; } }
        if (o.gone || this.invT > 0) continue;
        const hb = o.hb;
        const hit = box.x < o.x + hb.x + hb.w && box.x + box.w > o.x + hb.x && box.y < o.y + hb.y + hb.h && box.y + box.h > o.y + hb.y;
        if (hit) this.hit(o);
      }
      this.obs = this.obs.filter((o) => o.y > cam.y - 140 && o.y < cam.y + vh + 400 && o.x > -400 && o.x < L.pw + 400);
    }

    spawn(kind, y) {
      const p = this.g.player, vw = this.vw, cam = this.g.camera;
      const side = Math.random() < 0.5 ? -1 : 1, aim = p.cx + (Math.random() - 0.5) * 60;
      const add = (o) => { o.t = 0; o.ph = Math.random() * 6; o.vy = o.vy || 0; this.obs.push(o); return o; };
      if (kind === 'bird' || kind === 'geese') {
        const goose = kind === 'geese', n = goose ? 5 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 3);
        const dir = -side, sp = goose ? U.lerp(55, 75, Math.random()) : U.lerp(65, 95, Math.random());
        const x0 = side < 0 ? cam.x - 30 : cam.x + vw + 30, lead = Math.abs(aim - x0) / sp;   // they cross your path as they reach your height
        for (let i = 0; i < n; i++) {
          const ox = goose ? -dir * Math.abs(i - (n - 1) / 2) * 9 : (Math.random() - 0.5) * 24, oy = goose ? Math.abs(i - (n - 1) / 2) * 6 : (Math.random() - 0.5) * 20;
          add({ kind: goose ? 'goose' : 'bird', x: x0 + ox, y: y + oy + lead * 0, vx: dir * sp, dir, hb: goose ? { x: -5, y: -3, w: 11, h: 6 } : { x: -3, y: -2, w: 7, h: 5 } });
        }
        if (goose) sfx('birdSquawk', { minGap: 0.5 });
      } else if (kind === 'plane') {
        const dir = -side;
        add({ kind: 'plane', x: side < 0 ? cam.x - 20 : cam.x + vw + 20, y, vx: dir * U.lerp(110, 150, Math.random()), vy: U.lerp(-40, 10, Math.random()), dir, hb: { x: -6, y: -2, w: 12, h: 5 } });
      } else if (kind === 'balloon') {
        add({ kind: 'balloon', x: U.clamp(aim, cam.x + 20, cam.x + vw - 20), y, vx: (Math.random() - 0.5) * 20, vy: -22, dir: 1, pal: Math.floor(Math.random() * STRIPES.length), alarm: 0, hb: { x: -12, y: -14, w: 24, h: 38 } });
      } else if (kind === 'kite') {
        const dir = Math.random() < 0.5 ? -1 : 1;
        add({ kind: 'kite', x: U.clamp(aim, cam.x + 16, cam.x + vw - 16), y, vx: dir * U.lerp(8, 22, Math.random()), dir, pal: Math.floor(Math.random() * KITES.length), hb: { x: -6, y: -9, w: 12, h: 18 } });
      }
    }

    hit(o) {
      const g = this.g, p = g.player;
      this.invT = 1.1; this.spin = 1;
      const dmg = Math.max(1, Math.round(p.maxHp * SkyFall.hitShare(g.element())));
      p.hp = Math.max(1, p.hp - dmg);
      g.floats.push({ x: p.cx, y: p.y - 6, text: '-' + dmg, color: '#ff6a5a', t: 0, dur: 0.9, rise: -30 });
      this.vx = (p.cx < o.x ? -1 : 1) * 160;
      sfx('skyBonk'); ERX.FX.shake(3, 0.2); g.flashT = Math.max(g.flashT || 0, 0.08);
      o.gone = true;
      if (o.kind === 'bird' || o.kind === 'goose') { sfx('birdSquawk'); for (let i = 0; i < 8; i++) g.fx.add({ x: o.x, y: o.y, vx: U.lerp(-60, 60, Math.random()), vy: U.lerp(-80, 20, Math.random()), ay: 60, life: 1, color: Math.random() < 0.5 ? '#e8e0d4' : '#4a4458', size: 1, fadeOut: 0.4, wobble: 12, wobbleRate: 6 }); }
      if (o.kind === 'balloon') { sfx('balloonBoing'); o.gone = false; o.vx = -this.vx * 0.3; o.vy = -60; this.vx *= 1.4; }
      if (o.kind === 'kite') { o.vx = this.vx * -0.5; }
    }

    // ---------------------------------------------------------- landing
    land() {
      const g = this.g, p = g.player, L = g.level, el = g.element();
      this.alt = 0;
      this.place();
      const x = p.cx, y = L.floorY, chaos = !!el && el.id === 'chaos';
      ERX.FX.shake(chaos ? 11 : 8, chaos ? 0.7 : 0.5);
      if (g.impact) g.impact(chaos ? 0.11 : 0.07);
      g.flashT = Math.max(g.flashT || 0, chaos ? 0.2 : 0.12);
      sfx('landSlam');
      if (chaos) sfx('crash');
      if (el && ERX.ElementSfx) ERX.ElementSfx.boom(el.id, chaos ? 160 : 120, false);
      g.dust(x, y, chaos ? 40 : 26);
      if (el) {
        const kit = ERX.Abilities.kit(el.id), A = ERX.Abilities.api(g);
        const pal = chaos ? { c: '#ffffff', l: '#ffffff', d: '#c8c8e0', core: '#ffffff', fx: 'chaos' } : ERX.Abilities.palette(el, kit, false);
        const from = { pal, dmg: 0, status: null, potency: 0, up: false, isUlt: false, el: el.id };
        A.spawn(from, LANDFX, Object.assign({ x, y, fx: pal.fx || kit.fx }, chaos ? { chaos: true, life: 3 } : {}));
        A.spawn(from, ERX.AwkHelp.SHOCK, { x, y: y - 3, r: chaos ? 84 : 60, flat: 0.32, life: chaos ? 0.6 : 0.5 });
        ERX.Abilities.puff(g, x, y - 4, pal.fx || kit.fx, pal, chaos ? 52 : 36, chaos ? 4 : 3);
      }
      this.obs.length = 0;
      ERX.Skyfall.wind = 0;
      ERX.Audio.setAmbience(L.ambience || null);
      ERX.Audio.cutMusic();
      ERX.Audio.playMusic('skyfallEnd');
    }

    finish() {
      const g = this.g, p = g.player;
      g.fall = null;
      g.state = 'play';
      p.controls = true;
      p.vx = 0; p.vy = 0;
      ERX.Skyfall = null;
      if (this.onDone) this.onDone(g);
    }

    // ---------------------------------------------------------- drawing
    /** You (and what's flying at you) in the world. */
    renderWorld(ctx, cam) {
      const g = this.g, p = g.player, ox = -cam.ix, oy = -cam.iy;
      for (const o of this.obs) drawObstacle(ctx, o, o.x + ox, o.y + oy);
      if (this.phase !== 'sky' && this.phase !== 'shatter' && this.phase !== 'land' && this.phase !== 'rise') return;
      const t = this.t, x = p.cx + ox, y = p.feet + oy;
      if (this.phase === 'land' || this.phase === 'rise') {
        const W = ERX.AwkHelp, kneel = W.IDLE.kneel(t);
        const j = this.phase === 'land' ? kneel : lerpJ(kneel, ERX.PlayerSide.STAND, W.ease(this.pt / T.rise));
        drawBody(ctx, p.look, j, x, y, p.facing, 0, 1);
        return;
      }
      if (this.invT > 0 && Math.floor(this.invT * 14) % 2 === 0) return;
      const tumbling = this.spin > 0, j = tumbling ? tumblePose(t) : fallPose(t, this.vx, this.alt < 260);
      const ang = tumbling ? (1 - this.spin) * Math.PI * 2 * Math.sign(this.vx || 1) : U.clamp(this.vx / 300, -0.4, 0.4) + Math.sin(t * 1.7) * 0.05;
      drawBody(ctx, p.look, j, x, y + Math.sin(t * 2.3) * 1.5, p.facing, ang, 1);
    }

    /** Everything that goes over the world: the void, the light, the cracks, the wind, the clouds. */
    renderOverlay(ctx, vw, vh) {
      const ph = this.phase, k = Math.min(1, this.pt / T[ph]), t = this.t;
      if (ph === 'black') { ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, vw, vh); return; }
      const voidPart = ph === 'portal' || ph === 'voidFall' || ph === 'bright' || ph === 'crack';
      if (voidPart) {
        this.drawVoid(ctx, vw, vh, t, ph === 'portal' ? 0.3 : 1);
        if (ph === 'portal') this.drawPortal(ctx, vw, vh, Math.min(1, this.pt / 0.9), t, 1);
        if (ph === 'voidFall') this.drawPortal(ctx, vw, vh, 1 - k * 0.8, t, 1 - k, -k * vh * 0.5);
        // you, falling
        const drop = ph === 'portal' ? U.clamp((this.pt - 0.85) / 0.75, 0, 1) : 1;
        if (drop > 0) {
          const x = vw / 2 + this.sx, y = U.lerp(vh * 0.13, vh * 0.52, ph === 'portal' ? 1 - Math.pow(1 - drop, 2) : 1) + Math.sin(t * 2.1) * 3;
          drawBody(ctx, this.g.player.look, fallPose(t, this.vx, ph === 'portal'), x, y, this.g.player.facing, U.clamp(this.vx / 300, -0.4, 0.4) + Math.sin(t * 1.3) * 0.08, ph === 'portal' ? 0.4 + drop * 0.6 : 1);
        }
        this.drawStreaks(ctx, vw, vh, ph === 'bright' ? 0.5 + k * 0.5 : 0.35, '#e8d8ff', ph === 'bright' ? 1 + k * 3 : 1);
        if (ph === 'bright' || ph === 'crack') {
          // light pouring up from below, until there's nothing but white
          const a = ph === 'bright' ? Math.pow(k, 0.8) : 1;
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const up = ctx.createLinearGradient(0, vh, 0, 0);
          up.addColorStop(0, 'rgba(255,250,235,' + Math.min(1, a * 1.6).toFixed(3) + ')'); up.addColorStop(1, 'rgba(220,210,255,' + (a * 0.6).toFixed(3) + ')');
          ctx.fillStyle = up; ctx.fillRect(0, 0, vw, vh);
          ctx.restore();
          const gr = ctx.createRadialGradient(vw / 2, vh * 0.6, 10, vw / 2, vh * 0.6, vw * 0.7);
          gr.addColorStop(0, 'rgba(255,255,255,' + Math.min(1, a * 1.4).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,252,244,' + Math.min(1, a * a * 1.1).toFixed(3) + ')');
          ctx.fillStyle = gr; ctx.fillRect(0, 0, vw, vh);
        }
        if (ph === 'crack') this.drawCracks(ctx, k);
        return;
      }
      if (ph === 'shatter') this.drawShards(ctx, vw, vh, k);
      if (ph === 'sky') {
        if (this.pt < 0.35) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - this.pt / 0.35).toFixed(3) + ')'; ctx.fillRect(0, 0, vw, vh); }
        this.drawStreaks(ctx, vw, vh, 0.12 + (this.speed() / this.vmax) * 0.14, '#ffffff', 0.7 + this.speed() / 500);
        // inside the clouds: white everywhere, puffs streaming past
        const ca = this.g.level.cloudAlt || 1750, d = Math.abs(this.alt - (ca - 70)), fog = U.clamp(1 - d / 120, 0, 1);
        if (fog > 0) { ctx.fillStyle = 'rgba(240,246,255,' + (fog * 0.88).toFixed(3) + ')'; ctx.fillRect(0, 0, vw, vh); }
        for (const pf of this.puffs) { const gr = ctx.createRadialGradient(pf.x, pf.y, 2, pf.x, pf.y, pf.r); gr.addColorStop(0, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.fillRect(pf.x - pf.r, pf.y - pf.r, pf.r * 2, pf.r * 2); }
        if (this.invT > 0.9) { ctx.fillStyle = 'rgba(255,60,40,' + ((this.invT - 0.9) * 1.2).toFixed(3) + ')'; ctx.fillRect(0, 0, vw, vh); }
        // the world's title card, while you take in the view
        const tk = U.clamp(Math.min((this.pt - 0.5) / 0.6, (4.4 - this.pt) / 0.8), 0, 1);
        if (tk > 0) {
          const F = ERX.Font, cy = Math.round(vh * 0.07);
          ctx.globalAlpha = tk;
          F.draw(ctx, this.def.name, Math.round(vw / 2), cy, { scale: 3, color: '#ffffff', outline: '#1a1424', shadow: '#2a4a9a', shadowOffset: 2, align: 'center' });
          F.draw(ctx, this.def.sub, Math.round(vw / 2), cy + 26, { color: '#eef4ff', outline: '#1a1424', align: 'center' });
          ctx.globalAlpha = 1;
        }
        // how to dodge, for the first few seconds
        const hk = U.clamp(Math.min((this.pt - 1) / 0.4, (5.5 - this.pt) / 0.6), 0, 1);
        if (hk > 0) { ctx.globalAlpha = hk; ERX.Font.draw(ctx, ERX.keyText('{moveLeft} {moveRight} DODGE     {dash} SWERVE'), Math.round(vw / 2), vh - 20, { color: '#ffd34d', outline: '#1a1424', align: 'center' }); ctx.globalAlpha = 1; }
      }
    }

    drawVoid(ctx, vw, vh, t, starA) {
      const gr = ctx.createLinearGradient(0, 0, 0, vh);
      gr.addColorStop(0, '#05030f'); gr.addColorStop(0.6, '#0e0828'); gr.addColorStop(1, '#1a0e3a');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, vw, vh);
      for (const n of this.neb) { const g2 = ctx.createRadialGradient(n.x, n.y, 4, n.x, n.y, n.r); g2.addColorStop(0, C.rgba(n.c, 0.28)); g2.addColorStop(1, C.rgba(n.c, 0)); ctx.fillStyle = g2; ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2); }
      ctx.fillStyle = '#ffffff';
      for (const s of this.stars) { ctx.globalAlpha = starA * (0.4 + s.z * 0.6); ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, Math.max(1, Math.round(s.z * 4))); }
      ctx.globalAlpha = 1;
    }

    /** A galaxy portal: a spinning spiral of stars inside a glowing rim. */
    drawPortal(ctx, vw, vh, open, t, alpha, dy) {
      if (open <= 0 || alpha <= 0) return;
      const cx = vw / 2, cy = vh * 0.12 + (dy || 0), R = vw * 0.2 * open, Ry = R * 0.5;
      ctx.save(); ctx.globalAlpha = alpha;
      const g2 = ctx.createRadialGradient(cx, cy, 2, cx, cy, R * 1.6);
      g2.addColorStop(0, 'rgba(255,240,255,0.9)'); g2.addColorStop(0.25, 'rgba(200,120,255,0.55)'); g2.addColorStop(0.6, 'rgba(80,60,200,0.25)'); g2.addColorStop(1, 'rgba(40,20,120,0)');
      ctx.fillStyle = g2; ctx.fillRect(cx - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2);
      for (let arm = 0; arm < 3; arm++) for (let i = 0; i < 70; i++) {
        const q = i / 70, a = t * 1.6 + arm * (Math.PI * 2 / 3) + q * 5.5, r = Math.pow(q, 0.8) * R;
        ctx.fillStyle = q < 0.15 ? '#ffffff' : q < 0.5 ? (i % 2 ? '#ffb8f0' : '#e0c8ff') : (i % 3 ? '#8a6aff' : '#5ac8ff');
        ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.5), q < 0.5 ? 2 : 1, q < 0.5 ? 2 : 1);
      }
      ctx.strokeStyle = 'rgba(220,200,255,0.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, cy, R + 2, Ry + 1, 0, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 16; i++) { const a = -t * 2 + i * 0.39; ctx.fillStyle = i % 2 ? '#ffffff' : '#c89aff'; ctx.fillRect(Math.round(cx + Math.cos(a) * (R + 3)), Math.round(cy + Math.sin(a) * (Ry + 2)), 1, 1); }
      ctx.restore();
    }

    drawStreaks(ctx, vw, vh, a, col, stretch) {
      ctx.fillStyle = col;
      for (const s of this.streaks) { ctx.globalAlpha = a * (0.4 + s.sp * 0.5); ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, Math.round(s.len * (stretch || 1))); }
      ctx.globalAlpha = 1;
    }

    drawCracks(ctx, k) {
      ctx.lineCap = 'square';
      for (const c of this.cracks) {
        const q = U.clamp((k - c.at * 0.6) / 0.5, 0, 1), n = Math.floor(c.pts.length * q);
        if (n < 2) continue;
        for (const [w, col] of [[(c.w || 1) + 2, 'rgba(170,200,255,0.45)'], [c.w || 1, '#6a8ad8'], [1, '#ffffff']]) {
          ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(c.pts[0][0], c.pts[0][1]);
          for (let i = 1; i < n; i++) ctx.lineTo(c.pts[i][0], c.pts[i][1]);
          ctx.stroke();
        }
      }
    }

    drawShards(ctx, vw, vh, k) {
      const e = k * T.shatter;
      for (const s of this.shards) {
        ctx.save();
        ctx.translate(s.mx + s.vx * e, s.my + s.vy * e + 200 * e * e);
        ctx.rotate(s.rot * e);
        ctx.globalAlpha = Math.max(0, 1 - k * 1.1);
        ctx.fillStyle = '#fffaf0';
        ctx.beginPath();
        ctx.moveTo(s.tri[0][0] - s.mx, s.tri[0][1] - s.my); ctx.lineTo(s.tri[1][0] - s.mx, s.tri[1][1] - s.my); ctx.lineTo(s.tri[2][0] - s.mx, s.tri[2][1] - s.my);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#a8c8ff'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      }
    }
  }

  SkyFall.WORLDS = WORLDS;
  SkyFall.LANDFX = LANDFX;
  /** How much of your health a bonk in the sky takes (Chaos: slightly more). */
  SkyFall.hitShare = (el) => (el && el.id === 'chaos' ? 0.085 : 0.06);
  SkyFall.T = T;
  SkyFall.fallPose = fallPose;
  ERX.SkyFall = SkyFall;
})(window.ERX = window.ERX || {});
