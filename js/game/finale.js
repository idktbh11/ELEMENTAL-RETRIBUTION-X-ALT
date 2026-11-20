/*
 * THE FINALE — the Azure Zombie's last moments (js/game/boss-azure.js hands it over at zero health).
 *
 *   bars    black bars slide in, the music cuts, the world holds still
 *   roar    it roars, blue fire flaring up
 *   charge  ...and comes at you, in slow motion. Your eyes light up in your element's colour.
 *   kill    and you end it: every element has its own finisher (FINISHERS below). Fire burns
 *           it to ash, ice freezes it solid and blows it apart, poison melts it into a puddle...
 *   after   the dust settles, the bars slide away, and the story carries on (abyssAfter).
 *
 *   g.cutscene = new ERX.Finale(g, boss)    update(dt), drawWorld(ctx, cam) (over the lit world),
 *                                           drawScreen(ctx, W, H) (the bars)
 * A finisher: { name, pose (yours), dur, start(f), update(f, dt), draw(f, ctx, o) } where f is a Kill
 * (the boss's last frame, broken into pixels when it's time: f.shatter(fn)) and o the camera offset.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, C = ERX.Color;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const ES = () => ERX.ElementSfx;
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const TAU = Math.PI * 2;

  // ================================================================ drawing
  function px(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
  function line(ctx, x0, y0, x1, y1, col, w) { const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); for (let i = 0; i <= n; i++) px(ctx, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, w || 1, w || 1, col); }
  function ring(ctx, x, y, r, col, ry) { const n = Math.max(10, Math.round(r * 2.6)); for (let i = 0; i < n; i++) { const a = (i / n) * TAU; px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * (ry === undefined ? r : ry), 1, 1, col); } }
  function disc(ctx, x, y, r, col, ry) { ry = ry === undefined ? r : ry; for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) { const k = 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5)); if (k < 0) continue; const w = Math.floor((r + 0.5) * Math.sqrt(k)); px(ctx, x - w, y + dy, w * 2 + 1, 1, col); } }
  function glow(ctx, x, y, r, col, a) { if (r <= 0 || a <= 0) return; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, C.rgba(col, Math.min(1, a))); g.addColorStop(1, C.rgba(col, 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  /** A jagged bolt from (x0, y0) to (x1, y1). */
  function bolt(ctx, x0, y0, x1, y1, col, core, w) {
    const n = Math.max(4, Math.round(Math.hypot(x1 - x0, y1 - y0) / 9)), pts = [[x0, y0]];
    for (let i = 1; i < n; i++) { const k = i / n; pts.push([x0 + (x1 - x0) * k + R(-6, 6), y0 + (y1 - y0) * k + R(-2, 2)]); }
    pts.push([x1, y1]);
    for (let i = 0; i < pts.length - 1; i++) { line(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col, (w || 1) + 2); }
    for (let i = 0; i < pts.length - 1; i++) { line(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], core || '#ffffff', w || 1); }
  }
  /** A flame of any colours (outer, middle, core), about s px tall: full at the base, a swaying tip, a lick breaking off the top. */
  function flame(ctx, x, y, s, t, cols, ph) {
    if (s < 1) return;
    ph = ph || 0;
    x = Math.round(x); y = Math.round(y);
    const h = Math.max(3, Math.round(s * (1 + 0.16 * Math.sin(t * 17 + ph)))), mw = Math.max(1, s * 0.36);
    let tipX = x;
    for (let r = 0; r < h; r++) {
      const q = r / (h - 1);                                                     // 0 at the base, 1 at the tip
      const hw = Math.round(mw * (q < 0.25 ? 0.75 + q : Math.pow(1 - (q - 0.25) / 0.75, 1.2)));
      const sx = x + Math.round(Math.sin(t * 13 + ph * 2 + q * 2.5) * q * q * 1.8), yy = y - r;
      px(ctx, sx - hw - 1, yy, hw * 2 + 3, 1, cols[0]);
      px(ctx, sx - hw, yy, hw * 2 + 1, 1, cols[1]);
      if (hw >= 1 && q < 0.75) px(ctx, sx - hw + 1, yy, hw * 2 - 1, 1, cols[2]);
      tipX = sx;
    }
    if (Math.floor(t * 9 + ph * 5) % 4 < 2) px(ctx, tipX, y - h - 1 - (Math.floor(t * 9 + ph * 5) % 2), 1, 1, cols[1]);
  }
  /** A spiky star. */
  function star(ctx, x, y, r, col, core) { for (let i = -r; i <= r; i++) { px(ctx, x + i, y, 1, 1, Math.abs(i) < r / 2 ? core || col : col); px(ctx, x, y + i, 1, 1, Math.abs(i) < r / 2 ? core || col : col); } }
  const tintCache = new Map();
  function tinted(cv, col) { let m = tintCache.get(col); if (!m) tintCache.set(col, (m = new WeakMap())); let o = m.get(cv); if (!o) { o = ERX.Sprites.tint(cv, col); m.set(cv, o); } return o; }
  /** The top of the first solid tile at or below feet (at x): where something in the air comes down. */
  function groundBelow(L, x, feet) {
    const tx = Math.floor(x / 16);
    for (let ty = Math.floor((feet - 1) / 16); ty < L.H; ty++) if (L.isSolid(tx, ty)) return ty * 16;
    return feet;
  }
  const pixCache = new WeakMap();
  /** Every visible pixel of a canvas: [{ x, y, col }]. */
  function pixelsOf(cv) {
    let p = pixCache.get(cv);
    if (p) return p;
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    p = [];
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) { const i = (y * cv.width + x) * 4; if (d[i + 3] > 0) p.push({ x, y, col: '#' + ((1 << 24) | (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).slice(1) }); }
    pixCache.set(cv, p);
    return p;
  }

  // ================================================================ the kill: the boss's last frame, and its pieces
  class Kill {
    constructor(g, boss, el) {
      this.g = g; this.boss = boss; this.el = el;
      const c = el ? el.color : '#ffffff';
      this.pal = { c, l: C.mix(c, '#ffffff', 0.5), d: C.shade(c, -0.45), dk: el ? el.dark : '#444444' };
      const d = boss.drawnAt({ ix: 0, iy: 0 });
      this.spr = d;                                  // its last frame: { cv, x, y } (world)
      this.x = boss.cx; this.feet = boss.y + boss.h; this.top = boss.y; this.cy = boss.y + boss.h / 2;
      this.facing = boss.facing;
      const p = g.player;
      this.px = p.cx; this.py = p.y + 10; this.pfeet = p.feet; this.pfacing = p.facing;
      this.floor = this.feet;
      this.t = 0;
      this.show = true;                              // draw its body (the finisher can tint it, clip it, squash it...)
      this.tint = null; this.tintA = 0; this.alpha = 1; this.dx = 0; this.dy = 0; this.jitter = 0; this.squash = 0; this.clipTop = -1e9; this.clipBot = 1e9;
      this.bits = null;                              // its pixels, once it comes apart
      this.parts = [];                               // everything else flying about
      this.lights = [];
    }
    /** Break the body into its pixels; fn(bit, i, n) gives each one its motion. */
    shatter(fn) {
      const px0 = this.spr.x, py0 = this.spr.y, all = pixelsOf(this.spr.cv);
      this.bits = all.map((p, i) => {
        const b = { x: px0 + p.x + this.dx, y: py0 + p.y + this.dy, vx: 0, vy: 0, ax: 0, ay: 0, drag: 0, a: 1, fade: 0, col: p.col, s: 1, delay: 0, rx: p.x / this.spr.cv.width, ry: p.y / this.spr.cv.height };
        fn(b, i, all.length);
        return b;
      });
      this.show = false;
    }
    /** A particle: { x, y, vx, vy, ay, drag, life, col, s, kind: 'px' | 'star' | 'line' | 'shard' }. */
    part(o) { this.parts.push(Object.assign({ vx: 0, vy: 0, ay: 0, drag: 0, life: 1, t: 0, s: 1, kind: 'px' }, o)); }
    burst(x, y, n, cols, sp, life, o) {
      for (let i = 0; i < n; i++) { const a = R(0, TAU), v = R(0.3, 1) * sp; this.part(Object.assign({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: R(0.5, 1) * life, col: pick(cols), s: Math.random() < 0.3 ? 2 : 1 }, o || {})); }
    }
    update(dt) {
      this.t += dt;
      if (this.bits) for (const b of this.bits) {
        if (b.delay > 0) { b.delay -= dt; continue; }
        if (b.to) { b.vx += (b.to.x - b.x) * b.to.k * dt; b.vy += (b.to.y - b.y) * b.to.k * dt; }
        b.vx += b.ax * dt; b.vy += b.ay * dt;
        if (b.drag) { b.vx *= 1 - b.drag * dt; b.vy *= 1 - b.drag * dt; }
        if (!b.frozen) { b.x += b.vx * dt; b.y += b.vy * dt; }
        if (b.floor && b.y > this.floor - 1) { b.y = this.floor - 1; b.vy = 0; b.vx *= 0.8; }
        b.a = Math.max(0, b.a - b.fade * dt);
        if (b.toCol && b.a > 0) b.col = b.toCol;
      }
      for (const p of this.parts) { p.t += dt; p.vy += p.ay * dt; if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; } p.x += p.vx * dt; p.y += p.vy * dt; if (p.floor && p.y > this.floor - 1) { p.y = this.floor - 1; p.vy = 0; p.vx *= 0.7; } }
      this.parts = this.parts.filter((p) => p.t < p.life);
    }
    /** The body (its last frame), with whatever the finisher's doing to it. */
    drawBody(ctx, o) {
      if (!this.show || this.alpha <= 0) return;
      const s = this.spr, cv = s.cv, W = cv.width, H = cv.height;
      const jx = this.jitter ? Math.round(R(-this.jitter, this.jitter)) : 0, jy = this.jitter ? Math.round(R(-this.jitter, this.jitter) * 0.5) : 0;
      const x = Math.round(s.x + this.dx + o.x + jx), y = Math.round(s.y + this.dy + o.y + jy);
      const y0 = Math.max(0, Math.round(this.clipTop - s.y - this.dy)), y1 = Math.min(H, Math.round(this.clipBot - s.y - this.dy));
      if (y1 <= y0) return;
      const sq = U.clamp(this.squash, 0, 0.95), dh = (y1 - y0) * (1 - sq), dy = y + y0 + (y1 - y0) * sq;
      ctx.save();
      ctx.globalAlpha *= this.alpha;
      ctx.drawImage(cv, 0, y0, W, y1 - y0, x, Math.round(dy), W, Math.max(1, Math.round(dh)));
      if (this.tint && this.tintA > 0) { ctx.globalAlpha = this.alpha * Math.min(1, this.tintA); ctx.drawImage(tinted(cv, this.tint), 0, y0, W, y1 - y0, x, Math.round(dy), W, Math.max(1, Math.round(dh))); }
      ctx.restore();
    }
    drawBits(ctx, o) {
      if (!this.bits) return;
      for (const b of this.bits) { if (b.a <= 0 || b.delay > 0 && b.hideWait) continue; ctx.globalAlpha = Math.min(1, b.a); px(ctx, b.x + o.x, b.y + o.y, b.s, b.s, b.col); }
      ctx.globalAlpha = 1;
    }
    drawParts(ctx, o) {
      for (const p of this.parts) {
        const k = 1 - p.t / p.life, x = p.x + o.x, y = p.y + o.y;
        ctx.globalAlpha = Math.min(1, k * 1.5) * (p.a === undefined ? 1 : p.a);
        if (p.kind === 'star') star(ctx, Math.round(x), Math.round(y), Math.max(1, Math.round(p.s * k + 0.5)), p.col, '#ffffff');
        else if (p.kind === 'line') line(ctx, x, y, x - p.vx * 0.04, y - p.vy * 0.04, p.col);
        else if (p.kind === 'shard') { const a = p.t * (p.spin || 8); line(ctx, x - Math.cos(a) * p.s, y - Math.sin(a) * p.s, x + Math.cos(a) * p.s, y + Math.sin(a) * p.s, p.col, 1); }
        else px(ctx, x, y, p.s, p.s, p.col);
      }
      ctx.globalAlpha = 1;
    }
    /** The body's pixels as particles, in the body's own colours shifted toward col by k. */
    shiftBits(col, k) { if (this.bits) for (const b of this.bits) b.col = C.mix(b.col, col, k); }
  }

  // ================================================================ every element's finisher
  // (o = the camera offset { x, y }: world point (x, y) is drawn at (x + o.x, y + o.y))
  const F = {};

  F.fire = {
    name: 'INCINERATE', pose: 'push', dur: 2.6,
    start(f) { ES().boom('fire', 70); f.tint = '#140804'; },
    update(f, dt) {
      const t = f.t;
      f.tintA = Math.min(0.85, t / 1.0);
      if (t < 1.2 && Math.random() < dt * 60) f.part({ x: f.x + R(-9, 9), y: f.feet - R(0, 20), vx: R(-8, 8), vy: R(-80, -40), life: R(0.4, 0.8), col: pick(['#ff5a1a', '#ffb040', '#fff2a0']), s: 2 });
      if (t >= 1.0 && !f.bits) {
        ES().boom('fire', 90); sfx('ignite');
        f.shatter((b) => { b.vy = R(-50, -15); b.vx = R(-15, 15); b.drag = 0.5; b.fade = R(0.5, 1.2); b.delay = (1 - b.ry) * 0.5; b.col = pick(['#ff7a2a', '#ffb040', '#3a2a2a', '#5a4a4a']); });
      }
    },
    draw(f, ctx, o) {
      const t = f.t, k = Math.min(1, t / 0.4) * Math.max(0, Math.min(1, (2.2 - t) / 0.6));
      glow(ctx, f.x + o.x, f.cy + o.y, 44, '#ff6a1a', 0.45 * k);
      for (let i = 0; i < 7; i++) flame(ctx, f.x + o.x + (i - 3) * 4, f.feet + o.y, (10 + 14 * Math.sin(i * 1.7) ** 2) * k * Math.min(1, t * 3), t, ['#a8261a', '#ff7a2a', '#fff2a0'], i);
    },
  };

  F.water = {
    name: 'DROWN', pose: 'raise', dur: 2.4,
    start(f) { ES().boom('water', 50); },
    update(f, dt) {
      const t = f.t;
      f.dy = -Math.min(8, t * 10); f.tint = '#3aa0ff'; f.tintA = Math.min(0.5, t * 0.5);
      if (t < 1.4 && Math.random() < dt * 20) f.part({ x: f.x + R(-12, 12), y: f.cy + 10, vy: R(-40, -20), life: 0.7, col: '#bfe8ff' });
      if (t > 1.0 && t < 1.4) f.jitter = 2;
      if (t >= 1.4 && !f.bits) {
        ES().boom('water', 100); sfx('waterSplash');
        f.jitter = 0;
        f.shatter((b) => { const a = R(0, TAU), v = R(60, 150); b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v - 60; b.ay = 420; b.fade = 0.9; b.floor = true; b.col = C.mix(b.col, '#3aa0ff', 0.6); });
        f.burst(f.x, f.cy, 50, ['#3aa0ff', '#bfe8ff', '#ffffff'], 180, 1.2, { ay: 400 });
      }
    },
    draw(f, ctx, o) {
      const t = f.t;
      if (t < 1.4) {
        const r = t < 1.0 ? 6 + Math.min(1, t / 0.6) * 18 : 24 - (t - 1.0) * 30, cx = f.x + o.x, cy = f.cy + f.dy + o.y;
        ctx.globalAlpha = 0.35; disc(ctx, cx, cy, r, '#1a6ad8'); ctx.globalAlpha = 1;
        for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU; const rr = r + Math.sin(a * 5 + t * 8) * 1.5; px(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1, 1, i % 4 ? '#7ac8ff' : '#ffffff'); }
      } else ring(ctx, f.x + o.x, f.cy + o.y, (t - 1.4) * 90, '#bfe8ff');
    },
  };

  F.wind = {
    name: 'SHRED', pose: 'raise', dur: 2.6,
    start(f) { ES().ult('wind'); },
    update(f, dt) {
      const t = f.t;
      f.dy = -Math.min(14, t * 12); f.jitter = Math.min(2, t * 2);
      if (t >= 1.0 && !f.bits) {
        ES().boom('wind', 90);
        f.shatter((b) => { b.orb = { a: Math.atan2(b.y - f.cy, b.x - f.x), r: Math.hypot(b.x - f.x, b.y - f.cy) + 2, w: R(4, 8), up: R(20, 50) }; b.fade = 0.6; });
      }
      if (f.bits) for (const b of f.bits) { const q = b.orb; q.a += q.w * dt; q.r += 18 * dt; b.x = f.x + Math.cos(q.a) * q.r; b.y = f.cy + f.dy - (f.t - 1) * q.up + Math.sin(q.a) * q.r * 0.35; }
    },
    draw(f, ctx, o) {
      const t = f.t, k = Math.min(1, t / 0.5) * Math.max(0, Math.min(1, (2.4 - t) / 0.5));
      for (let j = 0; j < 4; j++) for (let i = 0; i < 26; i++) {
        const q = i / 26, a = q * TAU * 2 + t * 9 + j * 1.6, r = (6 + q * 18 + j * 2) * k;
        px(ctx, f.x + o.x + Math.cos(a) * r, f.feet + o.y - q * 40 - j * 2 + Math.sin(a) * r * 0.25, 1, 1, i % 3 ? '#c8f4ff' : '#ffffff');
      }
    },
  };

  F.earth = {
    name: 'ENTOMB', pose: 'push', dur: 2.6,
    start(f) { sfx('rumble', { dur: 0.6 }); ES().boom('earth', 50); },
    update(f, dt) {
      const t = f.t;
      if (t >= 0.62 && !f.closed) { f.closed = true; f.show = false; ES().boom('earth', 100); ERX.FX.shake(6, 0.4); f.burst(f.x, f.feet - 4, 30, ['#8a6a4a', '#b8864a', '#5a3e22'], 120, 1, { ay: 300, floor: true }); }
      if (t >= 1.7 && !f.crumbled) {
        f.crumbled = true; ES().boom('earth', 80);
        for (let i = 0; i < 60; i++) f.part({ x: f.x + R(-14, 14), y: f.feet - R(0, 32), vx: R(-60, 60), vy: R(-120, -20), ay: 500, life: R(0.8, 1.4), col: pick(['#8a6a4a', '#b8864a', '#5a3e22', '#3a2a18']), s: Math.random() < 0.5 ? 2 : 3, floor: true });
      }
    },
    draw(f, ctx, o) {
      const t = f.t; if (f.crumbled) return;
      const grow = Math.min(1, t / 0.4), shut = U.clamp((t - 0.4) / 0.22, 0, 1), H = 34 * grow;
      for (const s of [-1, 1]) {
        const x = f.x + o.x + s * (17 - 7 * shut), y = f.feet + o.y;
        px(ctx, x - 7, y - H, 14, H, '#5a3e22'); px(ctx, x - 6, y - H, 12, H, '#8a6a4a'); px(ctx, x - 6, y - H, s < 0 ? 3 : 12, 2, '#b8864a');
        for (let k = 0; k < H; k += 6) px(ctx, x - 6, y - k, 12, 1, '#5a3e22');
      }
      if (shut >= 1) for (let i = 0; i < Math.min(8, (t - 0.62) * 8); i++) line(ctx, f.x + o.x + R(-8, 8), f.feet + o.y - R(4, 30), f.x + o.x + R(-8, 8), f.feet + o.y - R(4, 30), '#2a1a0a');
    },
  };

  F.lightning = {
    name: 'SMITE', pose: 'raise', dur: 2.5,
    start(f) { f.strikes = []; },
    update(f, dt) {
      const t = f.t;
      if (t >= 0.3 && !f.struck) { f.struck = true; ES().ult('lightning'); ERX.FX.shake(6, 0.5); f.g.flashT = 0.25; f.strikes.push({ t: 0, x: f.x }); }
      if (t > 0.3 && t < 1.0) { f.tint = Math.floor(t * 20) % 2 ? '#ffffff' : '#101010'; f.tintA = 0.85; if (Math.random() < dt * 10) { f.strikes.push({ t: 0, x: f.x + R(-20, 20), small: true }); ES().hit('lightning', 12); } }
      if (t >= 1.0 && !f.bits) { ES().boom('lightning', 90); f.shatter((b) => { const a = R(0, TAU), v = R(80, 220); b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; b.drag = 2.5; b.fade = 1.4; b.col = pick(['#ffd23a', '#ffffff', '#fff08a', b.col]); }); }
      for (const s of f.strikes) s.t += dt;
      f.strikes = f.strikes.filter((s) => s.t < 0.25);
    },
    draw(f, ctx, o) {
      const t = f.t;
      if (t < 1.2) { ctx.globalAlpha = 0.5 * Math.min(1, t / 0.3); for (let i = 0; i < 6; i++) disc(ctx, f.x + o.x + (i - 2.5) * 16, o.y + f.top - 70 + Math.sin(i) * 4, 12, '#2a2a3a', 6); ctx.globalAlpha = 1; }
      for (const s of f.strikes) bolt(ctx, s.x + o.x + R(-3, 3), f.top - 80 + o.y, f.x + o.x, f.cy + o.y, s.small ? '#a87a10' : '#ffd23a', '#ffffff', s.small ? 1 : 2);
      if (t > 0.3 && t < 1.1) glow(ctx, f.x + o.x, f.cy + o.y, 40, '#fff08a', 0.5);
    },
  };

  F.ice = {
    name: 'SHATTER', pose: 'push', dur: 2.6,
    start(f) { ES().charge('ice'); f.crystals = []; },
    update(f, dt) {
      const t = f.t, k = Math.min(1, t / 1.0);
      f.tint = '#d8f4ff'; f.tintA = 0.75 * k;
      if (t < 1.0 && Math.random() < dt * 14) f.crystals.push({ x: f.x + R(-11, 11), y: f.feet - k * 26 + R(-2, 2), s: R(2, 5) });
      if (t > 1.2 && t < 1.55) f.jitter = 1;
      if (t >= 1.55 && !f.bits) {
        ES().boom('ice', 110); ERX.FX.shake(5, 0.3); f.g.flashT = 0.15; f.jitter = 0;
        f.shatter((b) => { const a = Math.atan2(b.y - f.cy, b.x - f.x) + R(-0.4, 0.4), v = R(90, 240); b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v - 40; b.ay = 380; b.fade = 0.8; b.floor = true; b.col = C.mix(b.col, '#bfefff', 0.7); });
        for (let i = 0; i < 26; i++) { const a = R(0, TAU), v = R(80, 200); f.part({ x: f.x, y: f.cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, ay: 350, life: R(0.8, 1.4), col: pick(['#ffffff', '#a8e8ff', '#7ac8ff']), s: R(2, 4), kind: 'shard', spin: R(-12, 12), floor: true }); }
      }
    },
    draw(f, ctx, o) {
      const t = f.t;
      if (!f.bits) {
        for (const c of f.crystals) { const x = c.x + o.x, y = c.y + o.y; line(ctx, x, y - c.s, x, y + c.s, '#ffffff'); line(ctx, x - c.s * 0.6, y, x + c.s * 0.6, y, '#a8e8ff'); }
        if (t > 1.0) {
          const x = f.x + o.x, y = f.feet + o.y, k = Math.min(1, (t - 1.0) / 0.3);
          ctx.globalAlpha = 0.35 * k; px(ctx, x - 13, y - 30, 26, 30, '#a8e8ff'); ctx.globalAlpha = 0.9 * k; px(ctx, x - 13, y - 30, 26, 1, '#ffffff'); px(ctx, x - 13, y - 30, 1, 30, '#ffffff'); ctx.globalAlpha = 1;
          if (t > 1.2) for (let i = 0; i < 6; i++) line(ctx, x + R(-10, 10), y - R(4, 28), x + R(-10, 10), y - R(4, 28), '#ffffff');
        }
      } else ring(ctx, f.x + o.x, f.cy + o.y, (t - 1.55) * 120, '#d8f4ff');
    },
  };

  F.nature = {
    name: 'OVERGROW', pose: 'raise', dur: 2.7,
    start(f) { ES().charge('nature'); f.vines = [0, 1, 2, 3].map((i) => ({ x: f.x + (i - 1.5) * 6, ph: i * 1.3, s: i % 2 ? 1 : -1 })); f.blooms = []; },
    update(f, dt) {
      const t = f.t;
      if (t > 0.8 && t < 1.5 && Math.random() < dt * 14) f.blooms.push({ x: f.x + R(-10, 10), y: f.feet - R(2, 24), col: pick(['#ff7ad8', '#ffe95a', '#ffffff', '#ff5a5a']) });
      if (t > 1.1) f.squash = Math.min(0.35, (t - 1.1) * 0.6);
      if (t > 1.5) { f.dy = (t - 1.5) * 30; f.clipBot = f.feet; }   // pulled down into the ground
      if (t > 1.5 && !f.sank) { f.sank = true; ES().boom('nature', 70); f.burst(f.x, f.feet - 6, 30, ['#5fd84a', '#2a7a2a', '#8ae06a'], 90, 1.2, { ay: 120 }); }
    },
    draw(f, ctx, o) {
      const t = f.t, grow = Math.min(1, t / 0.8), fade = Math.max(0, Math.min(1, (2.6 - t) / 0.6));
      ctx.globalAlpha = fade;
      for (const v of f.vines) for (let i = 0; i < 30 * grow; i++) { const q = i / 30; px(ctx, v.x + o.x + Math.sin(q * 9 + v.ph + t * 2) * (5 + q * 4) * v.s, f.feet + o.y - q * 30, 1, 1, i % 5 ? '#2a7a2a' : '#5fd84a'); }
      for (const b of f.blooms) { px(ctx, b.x + o.x - 1, b.y + o.y, 3, 1, b.col); px(ctx, b.x + o.x, b.y + o.y - 1, 1, 3, b.col); px(ctx, b.x + o.x, b.y + o.y, 1, 1, '#ffe95a'); }
      ctx.globalAlpha = 1;
    },
  };

  F.darkness = {
    name: 'CONSUME', pose: 'push', dur: 2.6,
    start(f) { ES().charge('darkness'); },
    update(f, dt) {
      const t = f.t;
      f.tint = '#0a0614'; f.tintA = Math.min(0.9, t * 0.8);
      if (t > 0.6) { f.dy = Math.min(40, (t - 0.6) * 30); f.clipBot = f.feet; }
      if (t > 0.6 && !f.pulled) { f.pulled = true; ES().ult('darkness'); }
      if (t > 1.9 && !f.closed) { f.closed = true; ES().boom('darkness', 60); f.burst(f.x, f.feet, 30, ['#5a4a8a', '#1e1630', '#2a2040'], 70, 1); }
    },
    draw(f, ctx, o) {
      const t = f.t, r = t < 1.9 ? Math.min(20, t * 34) : Math.max(0, 20 - (t - 1.9) * 50), x = f.x + o.x, y = f.feet + o.y;
      if (r > 0) { disc(ctx, x, y, r, '#000000', r * 0.3); ring(ctx, x, y, r, '#5a4a8a', r * 0.3); }
      if (t > 0.4 && t < 1.9) for (let j = 0; j < 5; j++) for (let i = 0; i < 26; i++) { const q = i / 26; px(ctx, x + (j - 2) * 5 + Math.sin(q * 8 + t * 6 + j) * 4, y - q * 30 * Math.min(1, (t - 0.4) * 2), 1, 1, i % 4 ? '#2a1e40' : '#5a4a8a'); }
    },
  };

  F.shadow = {
    name: 'THOUSAND CUTS', pose: 'dash', dur: 2.4,
    start(f) { f.cuts = []; ES().dash('shadow'); },
    update(f, dt) {
      const t = f.t;
      if (t < 0.8 && Math.random() < dt * 14) { f.cuts.push({ t: 0, a: R(-1.2, 1.2), y: f.cy + R(-8, 8) }); ES().hit('shadow', 10); }
      for (const c of f.cuts) c.t += dt;
      f.cuts = f.cuts.filter((c) => c.t < 0.15);
      if (t >= 1.1 && !f.bits) {
        ES().boom('shadow', 70);
        f.shatter((b) => { const slice = Math.floor((b.y - f.top) / 4); b.vx = (slice % 2 ? 1 : -1) * R(30, 50); b.drag = 1; b.fade = 0.7; b.delay = 0.1; b.col = C.mix(b.col, '#22222e', 0.3); });
      }
    },
    draw(f, ctx, o) {
      const t = f.t;
      if (t < 1.0) { ctx.globalAlpha = 0.6; const g = f.g; ERX.KitHelp && ERX.KitHelp.drawGhost(ctx, ERX.Abilities.api(g), 'attack', f.x + o.x - f.facing * 16, f.feet + o.y, f.facing, '#22222e'); ctx.globalAlpha = 1; }
      for (const c of f.cuts) { const k = c.t / 0.15, dx = Math.cos(c.a) * 18, dy = Math.sin(c.a) * 18; line(ctx, f.x + o.x - dx, c.y + o.y - dy, f.x + o.x + dx, c.y + o.y + dy, k < 0.5 ? '#ffffff' : '#6a6a8a'); }
    },
  };

  F.light = {
    name: 'JUDGMENT', pose: 'raise', dur: 2.6,
    start(f) { ES().charge('light'); },
    update(f, dt) {
      const t = f.t;
      if (t > 0.4) { f.tint = '#ffffff'; f.tintA = Math.min(0.9, (t - 0.4) * 1.5); }
      if (t > 0.4 && !f.hit) { f.hit = true; ES().ult('light'); f.g.flashT = 0.2; }
      if (t >= 1.2 && !f.bits) f.shatter((b) => { b.vy = R(-70, -25); b.vx = R(-8, 8); b.fade = 0.8; b.delay = b.ry * 0.4; b.col = pick(['#fff4c8', '#ffffff', '#ffd88a']); });
    },
    draw(f, ctx, o) {
      const t = f.t, grow = Math.min(1, t / 0.4), fade = Math.max(0, Math.min(1, (2.4 - t) / 0.6)), x = f.x + o.x, top = o.y + f.feet - 260;
      ctx.globalAlpha = 0.85 * fade;
      px(ctx, x - 12, top + 260 * (1 - grow), 24, 260 * grow, '#ffd88a'); px(ctx, x - 7, top + 260 * (1 - grow), 14, 260 * grow, '#fff4c8'); px(ctx, x - 3, top + 260 * (1 - grow), 6, 260 * grow, '#ffffff');
      ctx.globalAlpha = 1;
      glow(ctx, x, f.cy + o.y, 50, '#fff4c8', 0.5 * fade * grow);
    },
  };

  F.arcane = {
    name: 'UNRAVEL', pose: 'raise', dur: 2.7,
    start(f) { ES().charge('arcane'); },
    update(f, dt) {
      const t = f.t;
      if (t >= 0.8 && !f.bits) { ES().ult('arcane'); f.shatter((b, i) => { b.orb = { a: R(0, TAU), r: [10, 16, 22][i % 3], w: (i % 2 ? 1 : -1) * R(3, 6) }; b.col = C.mix(b.col, '#c86aff', 0.5); }); }
      if (f.bits && t < 1.7) for (const b of f.bits) { const q = b.orb; q.a += q.w * dt; const k = Math.min(1, (t - 0.8) * 3); b.x = U.lerp(b.x, f.x + Math.cos(q.a) * q.r, k * 0.3); b.y = U.lerp(b.y, f.cy + Math.sin(q.a) * q.r * 0.5, k * 0.3); }
      if (t >= 1.7 && !f.blown) { f.blown = true; ES().boom('arcane', 100); f.g.flashT = 0.15; for (const b of f.bits) { const a = R(0, TAU), v = R(80, 200); b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; b.drag = 2; b.fade = 1.2; } f.burst(f.x, f.cy, 30, ['#c86aff', '#ffffff', '#e8a8ff'], 160, 1, { kind: 'star', s: 2 }); }
    },
    draw(f, ctx, o) {
      const t = f.t, k = Math.min(1, t / 0.6) * (t < 1.7 ? 1 : Math.max(0, 1 - (t - 1.7) * 4)), x = f.x + o.x, y = f.cy + o.y;
      for (const [r, w] of [[10, 1.4], [16, -1], [22, 0.7]]) {
        ring(ctx, x, y, r * k, '#c86aff', r * k * 0.5);
        for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + t * w * 2; px(ctx, x + Math.cos(a) * r * k - 1, y + Math.sin(a) * r * k * 0.5 - 1, 3, 3, '#e8a8ff'); }
      }
    },
  };

  F.poison = {
    name: 'DISSOLVE', pose: 'push', dur: 2.8,
    start(f) { ES().charge('poison'); f.drips = []; },
    update(f, dt) {
      const t = f.t;
      f.tint = '#4a6a1a'; f.tintA = Math.min(0.7, t * 0.6);
      if (t > 0.5) { const k = Math.min(1, (t - 0.5) / 1.4); f.squash = k * 0.95; }   // it melts down into the pool
      if (t > 0.5 && t < 1.9 && Math.random() < dt * 30) f.part({ x: f.x + R(-8, 8), y: f.feet - R(0, 20) * (1 - f.squash), vy: R(20, 60), ay: 200, life: 0.6, col: pick(['#9ad83a', '#4a6a1a', '#c8f06a']), floor: true });
      if (Math.random() < dt * 14) f.part({ x: f.x + R(-14, 14), y: f.feet - 1, vy: R(-30, -10), life: 0.5, col: '#c8f06a' });
      if (t > 1.9 && !f.gone) { f.gone = true; f.show = false; ES().boom('poison', 60); f.burst(f.x, f.feet - 2, 20, ['#9ad83a', '#c8f06a'], 50, 1, { ay: -40 }); }
    },
    draw(f, ctx, o) {
      const t = f.t, r = Math.min(20, t * 30), x = f.x + o.x, y = f.feet + o.y;
      disc(ctx, x, y, r, '#4a6a1a', 3); disc(ctx, x, y - 1, r * 0.8, '#9ad83a', 1.5);
      for (let i = 0; i < 5; i++) { const q = (t * 1.5 + i / 5) % 1; ring(ctx, x + Math.sin(i * 2.3) * r * 0.6, y - 2 - q * 3, 1 + q * 2, '#c8f06a'); }
      if (t > 0.6) { const k = Math.min(1, (t - 0.6) / 0.5) * Math.max(0, Math.min(1, (2.8 - t) / 0.6)); for (let i = 0; i < 6; i++) glow(ctx, x + Math.sin(t * 0.8 + i * 1.9) * 12, y - 10 - i * 5 - (t - 0.6) * 6, 7 + i, '#9ad83a', 0.3 * k); }   // toxic fumes
    },
  };

  F.blood = {
    name: 'EXSANGUINATE', pose: 'raise', dur: 2.6,
    start(f) { ES().charge('blood'); },
    update(f, dt) {
      const t = f.t;
      if (t > 0.5) { f.tint = '#c8c0c0'; f.tintA = Math.min(0.85, (t - 0.5) * 0.9); }
      if (t > 0.5 && t < 1.4 && Math.random() < dt * 40) { const q = { x: f.x + R(-6, 6), y: f.cy + R(-8, 8) }; f.part({ x: q.x, y: q.y, vx: (f.px - q.x) * 1.4, vy: (f.py - q.y) * 1.4 - 30, ay: 60, life: 0.7, col: pick(['#c8283a', '#ff4a5a', '#5a0e18']) }); }
      if (t >= 1.45 && !f.bits) { ES().boom('blood', 70); f.shatter((b) => { b.vx = R(-20, 20); b.vy = R(-20, 10); b.ay = 300; b.fade = 0.7; b.floor = true; b.col = pick(['#8a8080', '#6a6060', '#a8a0a0']); }); }
    },
    draw(f, ctx, o) {
      const t = f.t, k = Math.min(1, t / 0.3) * (t < 1.6 ? 1 : Math.max(0, 1 - (t - 1.6) * 3));
      for (let i = 0; i < 7; i++) { const x = f.x + o.x + (i - 3) * 5, h = (14 + (i % 3) * 8) * k; for (let j = 0; j < h; j++) px(ctx, x - Math.max(0, Math.round(2 * (1 - j / h))), f.feet + o.y - j, Math.max(1, Math.round(4 * (1 - j / h))), 1, j > h - 3 ? '#ff6a7a' : '#8a1428'); }
    },
  };

  F.death = {
    name: 'REAP', pose: 'attack', dur: 2.8,
    start(f) { ES().charge('death'); },
    update(f, dt) {
      const t = f.t;
      if (t >= 0.6 && !f.reaped) { f.reaped = true; ES().ult('death'); f.g.flashT = 0.1; f.soul = 0; }
      if (f.reaped) { f.soul += dt; f.tint = '#8a8aa0'; f.tintA = Math.min(0.9, f.soul * 1.5); }
      if (t >= 1.5 && !f.bits) f.shatter((b) => { b.vx = R(-10, 10); b.vy = R(-5, 10); b.ay = 120; b.fade = 0.5; b.delay = (1 - b.ry) * 0.6; b.floor = true; b.col = pick(['#5a5a6a', '#3a3a48', '#8a8aa0']); });
    },
    draw(f, ctx, o) {
      const t = f.t, x = f.x + o.x, y = f.cy + o.y;
      if (t < 0.9) {
        // a great spectral scythe sweeps through
        const a = -2.4 + Math.min(1, t / 0.6) * 2.8, hx = x + Math.cos(a) * 30, hy = y + Math.sin(a) * 30 - 10;
        ctx.globalAlpha = Math.min(1, (0.9 - t) * 4);
        line(ctx, x - f.facing * 20, y - 30, hx, hy, '#5a5a6a', 2);
        for (let i = 0; i < 14; i++) { const q = i / 14, b = a + 1.6 - q * 1.6; px(ctx, hx + Math.cos(b) * (12 - q * 4), hy + Math.sin(b) * (12 - q * 4), 2, 2, i % 3 ? '#d8d8f0' : '#ffffff'); }
        ctx.globalAlpha = 1;
      }
      if (f.soul !== undefined && f.soul < 1.6) {
        // its soul, torn out and rising
        ctx.globalAlpha = Math.max(0, 0.6 - f.soul * 0.4);
        ctx.drawImage(tinted(f.spr.cv, '#c8f0ff'), Math.round(f.spr.x + o.x + Math.sin(f.soul * 6) * 2), Math.round(f.spr.y + o.y - f.soul * 40));
        ctx.globalAlpha = 1;
      }
    },
  };

  F.metal = {
    name: 'IMPALE', pose: 'push', dur: 2.6,
    start(f) { f.spears = []; },
    update(f, dt) {
      const t = f.t;
      if (t < 0.8 && f.spears.length < 5 && t > f.spears.length * 0.14) { f.spears.push({ x: f.x + (f.spears.length - 2) * 5, t: 0 }); ES().hit('metal', 14); }
      for (const s of f.spears) s.t += dt;
      if (t >= 1.05 && !f.slammed) { f.slammed = true; ES().boom('metal', 100); ERX.FX.shake(7, 0.4); f.show = false; f.burst(f.x, f.feet - 3, 40, ['#ffd34d', '#ffffff', '#b8c0d0'], 160, 0.8, { ay: 300, kind: 'line' }); }
    },
    draw(f, ctx, o) {
      const t = f.t, x = f.x + o.x;
      for (const s of f.spears) { const k = Math.min(1, s.t / 0.12), sx = s.x + o.x, y0 = f.feet + o.y - 90 + 80 * k; line(ctx, sx, y0 - 26, sx, y0, '#848ca0'); line(ctx, sx + 1, y0 - 26, sx + 1, y0, '#c8d0e0'); px(ctx, sx - 1, y0, 3, 2, '#ffffff'); }
      if (t > 0.8) {
        const k = Math.min(1, (t - 0.8) / 0.25), lift = t > 1.6 ? (t - 1.6) * 80 : 0, y = f.feet + o.y - 34 * (1 - k) - 40 * (1 - k) - lift - 20;
        if (t < 2.3) { px(ctx, x - 22, y, 44, 20, '#3e4254'); px(ctx, x - 21, y, 42, 2, '#c8d0e0'); px(ctx, x - 21, y + 2, 42, 16, '#848ca0'); for (const r of [-14, 0, 14]) px(ctx, x + r - 1, y + 8, 2, 2, '#ffd34d'); }
      }
    },
  };

  F.sand = {
    name: 'BURY', pose: 'raise', dur: 2.8,
    start(f) { ES().charge('sand'); },
    update(f, dt) {
      const t = f.t;
      if (Math.random() < dt * 60) f.part({ x: f.x - 60 + R(0, 20), y: f.cy + R(-20, 20), vx: R(160, 240), vy: R(-10, 10), life: 0.7, col: pick(['#e8c87a', '#c8a85a', '#f0d898']), kind: 'line' });
      if (t > 0.8) { f.tint = '#e8c87a'; f.tintA = Math.min(1, (t - 0.8) * 1.4); }
      if (t >= 1.4 && !f.bits) { ES().boom('sand', 60); f.shatter((b) => { b.vx = R(-6, 6); b.ay = 260; b.delay = (1 - b.ry) * 0.5; b.floor = true; b.col = pick(['#e8c87a', '#c8a85a', '#f0d898']); }); }
      if (t >= 2.0 && !f.blown) { f.blown = true; ES().dash('sand'); for (const b of f.bits) { b.floor = false; b.ay = 0; b.vx = R(120, 220); b.vy = R(-30, 0); b.fade = 1.2; b.delay = R(0, 0.3); } }
    },
    draw(f, ctx, o) { },
  };

  F.magma = {
    name: 'ERUPTION', pose: 'push', dur: 2.8,
    start(f) { sfx('rumble', { dur: 0.6 }); ERX.FX.shake(3, 0.6); },
    update(f, dt) {
      const t = f.t;
      if (t > 0.5) { f.dy = -Math.min(60, (t - 0.5) * 110); f.tint = '#5a0a0a'; f.tintA = Math.min(0.7, (t - 0.5)); }
      if (t > 0.5 && !f.erupted) { f.erupted = true; ES().ult('magma'); ERX.FX.shake(6, 0.6); }
      if (t > 0.5 && t < 1.6 && Math.random() < dt * 50) f.part({ x: f.x + R(-8, 8), y: f.feet - 2, vx: R(-60, 60), vy: R(-260, -120), ay: 500, life: 1, col: pick(['#ff7a1a', '#ffd23a', '#7a1a0a']), s: 2 });
      if (t >= 1.3 && !f.bits) { ES().boom('magma', 100); f.shatter((b) => { const a = R(-Math.PI, 0), v = R(80, 200); b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; b.ay = 420; b.fade = 0.7; b.floor = true; b.col = pick(['#ff7a1a', '#ffd23a', '#3a1a0a', '#7a1a0a']); }); }
    },
    draw(f, ctx, o) {
      const t = f.t, x = f.x + o.x, y = f.feet + o.y;
      if (t < 0.5) for (let i = 0; i < 6; i++) line(ctx, x, y, x + Math.cos(i) * 20 * t * 2, y + 1, '#ff7a1a');
      else if (t < 2.0) { const h = Math.min(70, (t - 0.5) * 140) * Math.max(0, Math.min(1, (2.0 - t) / 0.4)); px(ctx, x - 7, y - h, 14, h, '#7a1a0a'); px(ctx, x - 5, y - h, 10, h, '#ff7a1a'); px(ctx, x - 2, y - h, 4, h, '#ffd23a'); glow(ctx, x, y - h / 2, 40, '#ff7a1a', 0.4); }
    },
  };

  F.storm = {
    name: 'TEMPEST', pose: 'raise', dur: 2.8,
    start(f) { f.strikes = []; ES().charge('storm'); },
    update(f, dt) {
      const t = f.t;
      if (Math.random() < dt * 80) f.part({ x: f.x + R(-80, 80), y: f.top - 60, vx: -30, vy: 300, life: 0.3, col: '#7a90c0', kind: 'line' });
      if (t > 0.6 && t < 1.7 && Math.random() < dt * 5) { f.strikes.push({ t: 0, x: f.x + R(-6, 6) }); ES().hit('storm', 14); f.g.flashT = 0.06; }
      for (const s of f.strikes) s.t += dt;
      f.strikes = f.strikes.filter((s) => s.t < 0.2);
      f.jitter = t > 0.6 && t < 1.7 ? 2 : 0;
      if (t >= 1.7 && !f.bits) { ES().ult('storm'); f.shatter((b) => { b.orb = { a: Math.atan2(b.y - f.cy, b.x - f.x), r: Math.hypot(b.x - f.x, b.y - f.cy), w: R(6, 10) }; b.fade = 0.8; }); }
      if (f.bits) for (const b of f.bits) { const q = b.orb; q.a += q.w * dt; q.r += 30 * dt; b.x = f.x + Math.cos(q.a) * q.r; b.y = f.cy - (t - 1.7) * 40 + Math.sin(q.a) * q.r * 0.4; }
    },
    draw(f, ctx, o) {
      const t = f.t, x = f.x + o.x, k = Math.min(1, t / 0.6);
      ctx.globalAlpha = 0.6 * k; for (let i = 0; i < 8; i++) disc(ctx, x + (i - 3.5) * 14, f.top + o.y - 66 + Math.sin(i * 1.7) * 4, 11, '#2a3a6a', 6); ctx.globalAlpha = 1;
      if (t > 0.6 && t < 1.8) for (let j = 0; j < 3; j++) for (let i = 0; i < 20; i++) { const q = i / 20, a = q * TAU + t * 10 + j * 2; px(ctx, x + Math.cos(a) * (8 + q * 12), f.feet + o.y - q * 36 + Math.sin(a) * 3, 1, 1, '#c8d8ff'); }
      for (const s of f.strikes) bolt(ctx, s.x + o.x, f.top + o.y - 60, x, f.cy + o.y, '#6a8ac8', '#ffffff', 1);
    },
  };

  F.cosmic = {
    name: 'STARFALL', pose: 'raise', dur: 2.6,
    start(f) { f.mx = f.x + 160 * -f.pfacing; f.my = f.top - 160; ES().charge('cosmic'); },
    update(f, dt) {
      const t = f.t, k = Math.min(1, t / 0.8);
      if (t < 0.8 && Math.random() < dt * 60) f.part({ x: U.lerp(f.mx, f.x, k), y: U.lerp(f.my, f.cy, k), vx: R(-20, 20), vy: R(-20, 20), life: 0.6, col: pick(['#6a5aff', '#c8b8ff', '#ffffff']), kind: 'star', s: 2 });
      if (t >= 0.8 && !f.bits) { ES().boom('cosmic', 130); ERX.FX.shake(8, 0.5); f.g.flashT = 0.3; f.shatter((b) => { const a = R(0, TAU), v = R(100, 260); b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; b.drag = 1.5; b.fade = 0.9; b.col = pick(['#6a5aff', '#c8b8ff', '#ffffff', '#ffe08a']); }); f.burst(f.x, f.cy, 40, ['#ffffff', '#c8b8ff', '#ffe08a'], 200, 1.4, { kind: 'star', s: 3, drag: 1.5 }); }
    },
    draw(f, ctx, o) {
      const t = f.t;
      if (t < 0.8) { const k = t / 0.8, x = U.lerp(f.mx, f.x, k) + o.x, y = U.lerp(f.my, f.cy, k) + o.y; line(ctx, x, y, x + (f.mx - f.x) * 0.25, y + (f.my - f.cy) * 0.25, '#6a5aff', 3); disc(ctx, x, y, 6, '#3a2a8a'); disc(ctx, x - 1, y - 1, 4, '#c8b8ff'); glow(ctx, x, y, 30, '#6a5aff', 0.6); }
      else ring(ctx, f.x + o.x, f.cy + o.y, (t - 0.8) * 160, '#c8b8ff', (t - 0.8) * 60);
    },
  };

  F.void = {
    name: 'ERASE', pose: 'push', dur: 2.6,
    start(f) { ES().charge('void'); f.holes = []; },
    update(f, dt) {
      const t = f.t;
      f.jitter = t < 0.6 ? 1 : 0;
      if (t >= 0.6 && !f.bits) { ES().ult('void'); f.shatter((b) => { b.delay = R(0, 1.0); b.chunk = Math.floor(b.rx * 4) + Math.floor(b.ry * 5) * 4; b.hideWait = false; }); }
      if (f.bits) for (const b of f.bits) if (b.delay <= 0 && b.a > 0) { b.a = 0; if (Math.random() < 0.08) f.part({ x: b.x, y: b.y, vx: R(-10, 10), vy: R(-10, 10), life: 0.5, col: pick(['#a85cff', '#120820', '#ffffff']) }); }
      if (t > 1.7 && !f.sealed) { f.sealed = true; ES().boom('void', 50); }
    },
    draw(f, ctx, o) {
      const t = f.t, x = f.x + o.x, y = f.cy + o.y;
      if (t < 0.6 && f.show) for (let i = 0; i < 20; i++) px(ctx, f.spr.x + o.x + R(0, f.spr.cv.width), f.spr.y + o.y + R(0, f.spr.cv.height), 1, 1, pick(['#000000', '#a85cff']));
      if (t > 1.2 && t < 2.3) { const k = Math.min(1, (t - 1.2) / 0.3) * Math.max(0, Math.min(1, (2.3 - t) / 0.4)); for (let i = -12; i <= 12; i++) { const w = Math.max(0, Math.round((3 + Math.sin(i * 1.7) * 2) * k * (1 - Math.abs(i) / 13))); px(ctx, x - w + Math.sin(i * 0.9) * 2, y + i, w * 2 + 1, 1, '#000000'); px(ctx, x - w - 1 + Math.sin(i * 0.9) * 2, y + i, 1, 1, '#a85cff'); px(ctx, x + w + 1 + Math.sin(i * 0.9) * 2, y + i, 1, 1, '#a85cff'); } }
    },
  };

  F.psychic = {
    name: 'CRUSH', pose: 'push', dur: 2.4,
    start(f) { ES().charge('psychic'); },
    update(f, dt) {
      const t = f.t;
      f.dy = -Math.min(12, t * 20); f.tint = '#ff7ad8'; f.tintA = 0.3 + 0.2 * Math.sin(t * 20);
      if (t >= 0.6 && !f.bits) f.shatter((b) => { b.to = { x: f.x, y: f.cy - 12, k: 12 }; b.drag = 4; });
      f.jitter = t > 0.6 ? 1 : 0;
      if (t >= 1.4 && !f.popped) { f.popped = true; ES().boom('psychic', 100); f.g.flashT = 0.15; for (const b of f.bits) { b.to = null; const a = R(0, TAU), v = R(100, 240); b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; b.drag = 2; b.fade = 1.2; b.col = pick(['#ff7ad8', '#ffa0e0', '#ffffff']); } }
    },
    draw(f, ctx, o) {
      const t = f.t, x = f.x + o.x, y = f.cy + o.y - Math.min(12, t * 20);
      if (t < 1.4) for (let i = 0; i < 3; i++) ring(ctx, x, y, 22 - ((t * 30 + i * 7) % 20), '#ff7ad8', (22 - ((t * 30 + i * 7) % 20)) * 1.1);
      else ring(ctx, x, y, (t - 1.4) * 140, '#ffa0e0');
    },
  };

  F.crystal = {
    name: 'ENCASE', pose: 'raise', dur: 2.6,
    start(f) { ES().charge('crystal'); },
    update(f, dt) {
      const t = f.t;
      f.tint = '#7af0e0'; f.tintA = Math.min(0.6, t * 0.7);
      if (t >= 1.5 && !f.bits) {
        ES().boom('crystal', 110); f.g.flashT = 0.15;
        f.shatter((b) => { const a = R(0, TAU), v = R(90, 220); b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v - 40; b.ay = 300; b.fade = 0.9; b.col = pick(['#7af0e0', '#ffffff', '#ff9ad8', '#9ae0ff', '#ffe08a']); });
        for (let i = 0; i < 24; i++) { const a = R(0, TAU), v = R(70, 180); f.part({ x: f.x, y: f.cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, ay: 300, life: 1.2, col: pick(['#7af0e0', '#ff9ad8', '#ffe08a', '#9ae0ff']), s: R(3, 5), kind: 'shard', spin: R(-10, 10) }); }
      }
    },
    draw(f, ctx, o) {
      const t = f.t; if (t >= 1.5) return;
      const k = Math.min(1, t / 0.8), x = f.x + o.x, y = f.cy + o.y, W = 16 * k, H = 22 * k;
      const pts = [[x, y - H], [x + W, y - H * 0.3], [x + W * 0.7, y + H], [x - W * 0.7, y + H], [x - W, y - H * 0.3]];
      ctx.globalAlpha = 0.3; for (let yy = -H; yy < H; yy++) { const w = W * (1 - Math.abs(yy + H * 0.3) / (H * 1.3)); px(ctx, x - w, y + yy, w * 2, 1, '#7af0e0'); } ctx.globalAlpha = 1;
      for (let i = 0; i < pts.length; i++) line(ctx, pts[i][0], pts[i][1], pts[(i + 1) % pts.length][0], pts[(i + 1) % pts.length][1], i % 2 ? '#ffffff' : '#7af0e0');
      line(ctx, x, y - H, x, y + H, '#c8fff8');
      if (t > 0.8) for (let i = 0; i < 3; i++) { const q = (t * 2 + i / 3) % 1; line(ctx, x - W + q * W * 2, y - H, x - W + q * W * 2 - 4, y + H, pick(['#ff9ad8', '#9ae0ff', '#ffe08a'])); }
    },
  };

  F.moon = {
    name: 'ECLIPSE', pose: 'attack', dur: 2.6,
    start(f) { ES().charge('moon'); },
    update(f, dt) {
      const t = f.t;
      if (t >= 0.6 && !f.bits) {
        ES().ult('moon'); f.g.flashT = 0.12;
        // cut along a diagonal: each half slides its own way
        f.shatter((b) => { const side = (b.x - f.x) - (b.y - f.cy) * 0.8 > 0 ? 1 : -1; b.vx = side * R(18, 26); b.vy = side * -R(10, 16); b.drag = 0.6; b.fade = 0.55; b.delay = 0.15; b.col = C.mix(b.col, '#d8dcff', 0.25); });
      }
    },
    draw(f, ctx, o) {
      const t = f.t, x = f.x + o.x, y = f.cy + o.y;
      ctx.globalAlpha = 0.35 * Math.min(1, t * 2) * Math.max(0, Math.min(1, (2.4 - t) / 0.5)); px(ctx, x - 400, y - 300, 800, 600, '#05050f'); ctx.globalAlpha = 1;
      const mx = x - f.pfacing * 10, my = f.top + o.y - 50;
      disc(ctx, mx, my, 12, '#d8dcff'); disc(ctx, mx + 5, my - 3, 11, '#05050f');
      if (t > 0.5 && t < 0.9) { const k = (t - 0.5) / 0.4; for (let i = 0; i < 24; i++) { const q = i / 24, a = -0.9 + q * 1.8; px(ctx, x + Math.cos(a) * 26 * f.pfacing - f.pfacing * 14, y + Math.sin(a) * 26 - 4 + (k - 0.5) * 30, 2, 2, i % 3 ? '#d8dcff' : '#ffffff'); } }
    },
  };

  F.solar = {
    name: 'SUPERNOVA', pose: 'raise', dur: 2.6,
    start(f) { ES().charge('solar'); },
    update(f, dt) {
      const t = f.t;
      if (t > 0.8) { f.tint = '#fff2c8'; f.tintA = Math.min(1, (t - 0.8) * 2); }
      if (t >= 0.8 && !f.flared) { f.flared = true; ES().ult('solar'); f.g.flashT = 0.2; }
      if (t >= 1.4 && !f.bits) { ES().boom('solar', 110); f.g.flashT = 0.3; f.shatter((b) => { b.vy = R(-140, -50); b.vx = R(-60, 60); b.drag = 0.8; b.fade = 1.1; b.col = pick(['#ffb83a', '#fff2c8', '#ffffff', '#ff7a1a']); }); }
    },
    draw(f, ctx, o) {
      const t = f.t, x = f.x + o.x, sy = f.top + o.y - 40, r = Math.min(12, t * 16) * (t < 2.0 ? 1 : Math.max(0, 1 - (t - 2.0) * 3));
      glow(ctx, x, sy, r * 4, '#ffb83a', 0.5); disc(ctx, x, sy, r, '#ff7a1a'); disc(ctx, x, sy, r * 0.7, '#ffd23a'); disc(ctx, x, sy, r * 0.35, '#ffffff');
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + t; line(ctx, x + Math.cos(a) * r * 1.2, sy + Math.sin(a) * r * 1.2, x + Math.cos(a) * r * 1.7, sy + Math.sin(a) * r * 1.7, '#ffd23a'); }
      if (t > 0.8 && t < 1.6) { px(ctx, x - 9, sy, 18, f.feet - f.top + 40, '#ff7a1a'); px(ctx, x - 5, sy, 10, f.feet - f.top + 40, '#ffd23a'); px(ctx, x - 2, sy, 4, f.feet - f.top + 40, '#ffffff'); }
    },
  };

  F.magnetism = {
    name: 'POLARIZE', pose: 'push', dur: 2.6,
    start(f) { ES().charge('magnetism'); },
    update(f, dt) {
      const t = f.t;
      // torn in two: each half drawn to its magnet (where it sticks), then the field flips and they burst
      if (t >= 0.6 && !f.bits) { ES().ult('magnetism'); f.shatter((b) => { const side = b.x < f.x ? -1 : 1; b.side = side; b.to = { x: b.x + side * 14, y: b.y, k: 14 }; b.drag = 6; b.col = C.mix(b.col, side < 0 ? '#ff4a6a' : '#4a6aff', 0.6); }); }
      if (t >= 1.5 && !f.blown) { f.blown = true; ES().boom('magnetism', 80); for (const b of f.bits) { b.to = null; b.drag = 0; b.vx = -b.side * R(20, 70); b.vy = R(-90, 20); b.ay = 300; b.fade = 1.2; b.floor = true; } }
    },
    draw(f, ctx, o) {
      const t = f.t, k = Math.min(1, t / 0.4) * (t < 1.7 ? 1 : Math.max(0, 1 - (t - 1.7) * 3)), y = f.cy + o.y, M = 30;
      for (const s of [-1, 1]) {
        const x = f.x + o.x + s * M, col = s < 0 ? '#ff4a6a' : '#4a6aff';
        ctx.globalAlpha = k; px(ctx, x - 5, y - 8, 10, 4, col); px(ctx, x - 5, y + 4, 10, 4, col); px(ctx, x + (s < 0 ? -5 : 1), y - 8, 4, 16, col); px(ctx, x - 5, y - 8, 10, 1, '#ffffff'); ctx.globalAlpha = 1;
      }
      ctx.globalAlpha = 0.6 * k; for (let i = 0; i < 4; i++) { const h = 8 + i * 6; for (let q = 0; q <= 30; q++) { const xx = U.lerp(-M + 4, M - 4, q / 30); px(ctx, f.x + o.x + xx, y - Math.sqrt(Math.max(0, 1 - (xx / (M - 4)) ** 2)) * h * (i % 2 ? 1 : -1), 1, 1, q < 15 ? '#ff4a6a' : '#4a6aff'); } } ctx.globalAlpha = 1;
    },
  };

  F.time = {
    name: 'REWIND TO DUST', pose: 'raise', dur: 3.0,
    start(f) { ES().charge('time'); f.spin = 0; },
    update(f, dt) {
      const t = f.t;
      f.spin += dt * (2 + t * 10);
      if (t > 0.6) { f.tint = '#8a8a8a'; f.tintA = Math.min(0.8, (t - 0.6) * 0.8); f.squash = Math.min(0.2, (t - 0.6) * 0.2); }
      if (Math.floor(t * 8) !== Math.floor((t - dt) * 8) && t < 1.6) sfx('tick', { value: 70 });
      if (t >= 1.6 && !f.bits) { ES().ult('time'); f.shatter((b) => { b.vx = R(-12, 12); b.vy = R(-10, 6); b.ay = 160; b.col = pick(['#8a8a8a', '#a8a8a0', '#e8d08a']); }); }
      if (t >= 2.0 && !f.stopped) { f.stopped = true; for (const b of f.bits) { b.frozen = true; b.col = '#e8d08a'; } }          // time stops. the dust hangs there.
      if (t >= 2.5 && !f.gone) { f.gone = true; sfx('tick', { value: 20 }); for (const b of f.bits) b.a = 0; }
    },
    draw(f, ctx, o) {
      const t = f.t, x = f.x + o.x, y = f.cy + o.y, k = Math.min(1, t / 0.5) * (t < 2.4 ? 1 : Math.max(0, 1 - (t - 2.4) * 3));
      ctx.globalAlpha = 0.7 * k; ring(ctx, x, y, 24, '#e8d08a'); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; px(ctx, x + Math.cos(a) * 21, y + Math.sin(a) * 21, 1, 1, '#e8d08a'); }
      line(ctx, x, y, x + Math.cos(f.spin) * 18, y + Math.sin(f.spin) * 18, '#ffffff'); line(ctx, x, y, x + Math.cos(f.spin / 12) * 11, y + Math.sin(f.spin / 12) * 11, '#e8d08a', 2); ctx.globalAlpha = 1;
    },
  };

  F.gravity = {
    name: 'SINGULARITY', pose: 'push', dur: 2.6,
    start(f) { f.hx = f.x + f.facing * -2; f.hy = f.cy - 30; ES().charge('gravity'); },
    update(f, dt) {
      const t = f.t;
      if (t >= 0.4 && !f.bits) { ES().ult('gravity'); f.shatter((b, i) => { b.to = { x: f.hx, y: f.hy, k: 6 + (i % 5) }; b.delay = Math.hypot(b.x - f.hx, b.y - f.hy) * 0.01; }); }
      if (f.bits) for (const b of f.bits) if (b.delay <= 0 && Math.hypot(b.x - f.hx, b.y - f.hy) < 3) b.a = 0;
      if (t >= 1.8 && !f.collapsed) { f.collapsed = true; ES().boom('gravity', 90); f.g.flashT = 0.2; ERX.FX.shake(5, 0.3); }
    },
    draw(f, ctx, o) {
      const t = f.t, x = f.hx + o.x, y = f.hy + o.y, r = t < 1.8 ? Math.min(8, t * 16) : Math.max(0, 8 - (t - 1.8) * 40);
      if (r > 0) { glow(ctx, x, y, r * 4, '#7a6aa8', 0.6); ring(ctx, x, y, r * 2, '#c8b8ff', r * 0.6); disc(ctx, x, y, r, '#000000'); }
      else if (t < 2.3) ring(ctx, x, y, (t - 2.0) * 160, '#c8b8ff');
      if (f.bits) for (const b of f.bits) if (b.a > 0 && b.delay <= 0) line(ctx, b.x + o.x, b.y + o.y, b.x + o.x - b.vx * 0.03, b.y + o.y - b.vy * 0.03, b.col);
    },
  };

  F.sound = {
    name: 'RESONANCE', pose: 'clapOpen', dur: 2.5,
    start(f) { ES().charge('sound'); },
    update(f, dt) {
      const t = f.t;
      f.jitter = Math.min(3, t * 3);
      if (Math.floor(t * 5) !== Math.floor((t - dt) * 5) && t < 1.2) ES().hit('sound', 8);
      if (t >= 1.2 && !f.bits) { ES().ult('sound'); ERX.FX.shake(6, 0.3); f.jitter = 0; f.shatter((b) => { b.vx = Math.sign(b.x - f.px || 1) * R(120, 260) + R(-20, 20); b.vy = R(-40, 40); b.drag = 1.8; b.fade = 1; }); }
    },
    draw(f, ctx, o) {
      const t = f.t;
      for (let i = 0; i < 4; i++) { const q = (t * 1.6 + i / 4) % 1; if (t > 1.2 && q < 0.5) continue; const r = q * Math.abs(f.x - f.px) * 1.2; ctx.globalAlpha = 1 - q; for (let j = -6; j <= 6; j++) { const a = (j / 6) * 0.7; px(ctx, f.px + o.x + Math.cos(a) * r * Math.sign(f.x - f.px || 1), f.py + o.y + Math.sin(a) * r, 1, 1, '#5ae8a8'); } }
      ctx.globalAlpha = 1;
      if (t > 0.8 && t < 1.2) for (let i = 0; i < 5; i++) line(ctx, f.x + o.x + R(-8, 8), f.cy + o.y + R(-10, 10), f.x + o.x + R(-8, 8), f.cy + o.y + R(-10, 10), '#ffffff');
      if (t >= 1.2) ring(ctx, f.x + o.x, f.cy + o.y, (t - 1.2) * 150, '#5ae8a8', (t - 1.2) * 70);
    },
  };

  F.mist = {
    name: 'FADE', pose: 'raise', dur: 2.8,
    start(f) { ES().charge('mist'); f.puffs = Array.from({ length: 14 }, () => ({ x: f.x + R(-30, 30), y: f.cy + R(-14, 14), r: R(6, 12), v: R(-6, 6) })); },
    update(f, dt) {
      const t = f.t;
      for (const p of f.puffs) p.x += p.v * dt;
      f.alpha = t < 0.8 ? 1 : Math.max(0, 1 - (t - 0.8) / 0.6);
      if (t >= 0.9 && !f.bits) f.shatter((b) => { b.vx = R(8, 22) * (Math.random() < 0.5 ? -1 : 1); b.vy = R(-10, 2); b.fade = 0.6; b.delay = R(0, 0.5); b.col = pick(['#c8d4e0', '#dce4ec', '#a8b4c0']); });
    },
    draw(f, ctx, o) {
      const t = f.t, k = Math.min(1, t / 0.6) * Math.max(0, Math.min(1, (2.6 - t) / 0.6));
      for (const p of f.puffs) glow(ctx, p.x + o.x, p.y + o.y, p.r * 1.7, '#dce4ec', 0.4 * k);
    },
  };

  F.spirit = {
    name: 'SOUL REND', pose: 'raise', dur: 2.8,
    start(f) { ES().charge('spirit'); },
    update(f, dt) {
      const t = f.t;
      if (t > 0.6) { f.tint = '#6a7a7a'; f.tintA = Math.min(0.8, (t - 0.6)); }
      if (t >= 0.6 && !f.rent) { f.rent = true; ES().ult('spirit'); f.soul = 0; }
      if (f.rent) f.soul += dt;
      if (t >= 1.5 && !f.bits) f.shatter((b) => { b.vx = R(-8, 8); b.ay = 200; b.delay = (1 - b.ry) * 0.4; b.fade = 0.5; b.floor = true; b.col = pick(['#5a6a6a', '#3a4a4a', '#7a8a8a']); });
    },
    draw(f, ctx, o) {
      const t = f.t, x = f.x + o.x, y = f.feet + o.y, k = Math.min(1, t / 0.5) * (t < 1.6 ? 1 : Math.max(0, 1 - (t - 1.6) * 2));
      for (const s of [-1, 1]) for (let i = 0; i < 12 * k; i++) { const xx = x + s * 4 + Math.sin(i * 0.8 + t * 4) * 2; px(ctx, xx, y - i, 2, 1, i > 9 ? '#ffffff' : '#a8fff0'); if (i > 9) { px(ctx, xx - 2, y - i - 1, 1, 2, '#a8fff0'); px(ctx, xx + 3, y - i - 1, 1, 2, '#a8fff0'); } }
      if (f.soul !== undefined && f.soul < 1.8) { ctx.globalAlpha = Math.max(0, 0.75 - f.soul * 0.4); ctx.drawImage(tinted(f.spr.cv, '#a8fff0'), Math.round(f.spr.x + o.x + Math.sin(f.soul * 5) * 3), Math.round(f.spr.y + o.y - Math.min(1, f.soul) * 30 - f.soul * 10)); ctx.globalAlpha = 1; }
    },
  };

  F.chaos = {
    name: 'GLITCH', pose: 'raise', dur: 2.6,
    start(f) { ES().charge('chaos'); },
    update(f, dt) {
      const t = f.t;
      if (t < 1.2) { f.dx = Math.random() < 0.1 ? R(-30, 30) : f.dx * 0.8; f.tint = pick(['#ff3aa0', '#3affff', '#ffe95a', '#5aff7a']); f.tintA = Math.random() < 0.5 ? 0.6 : 0; if (Math.random() < dt * 6) { f.g.flashT = 0.05; sfx(pick(['zap', 'pop', 'tick', 'hover']), { value: R(10, 90) }); } }
      if (t >= 1.2 && !f.bits) { ES().ult('chaos'); sfx('partyHorn'); f.shatter((b) => { const a = R(0, TAU), v = R(60, 300); b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; b.ay = R(-200, 300); b.drag = 1; b.fade = 0.8; b.col = pick(['#ff3aa0', '#3affff', '#ffe95a', '#5aff7a', '#ff7a1a', '#ffffff']); b.s = Math.random() < 0.3 ? 2 : 1; }); }
    },
    draw(f, ctx, o) {
      const t = f.t;
      if (t < 1.2 && f.show) { ctx.globalAlpha = 0.5; ctx.drawImage(tinted(f.spr.cv, '#ff3aa0'), Math.round(f.spr.x + f.dx + o.x - 2), Math.round(f.spr.y + o.y)); ctx.drawImage(tinted(f.spr.cv, '#3affff'), Math.round(f.spr.x + f.dx + o.x + 2), Math.round(f.spr.y + o.y)); ctx.globalAlpha = 1; }
      if (t < 1.4) for (let i = 0; i < 4; i++) if (Math.random() < 0.4) { ctx.globalAlpha = 0.5; px(ctx, f.x + o.x + R(-60, 60), f.cy + o.y + R(-40, 40), R(4, 30), R(1, 4), pick(['#ff3aa0', '#3affff', '#ffe95a'])); ctx.globalAlpha = 1; }
    },
  };

  /** No element (yet)? A very big punch. */
  F.none = {
    name: 'KNOCKOUT', pose: 'attack', dur: 2.0,
    start(f) { sfx('punchHit'); },
    update(f, dt) {
      const t = f.t;
      if (t >= 0.3 && !f.bits) { sfx('crash'); ERX.FX.shake(6, 0.4); f.g.flashT = 0.2; f.shatter((b) => { b.vx = -f.pfacing * -R(80, 240); b.vy = R(-160, -40); b.ay = 400; b.fade = 0.8; b.floor = true; }); }
    },
    draw(f, ctx, o) { if (f.t > 0.25 && f.t < 0.5) ring(ctx, f.x + o.x, f.cy + o.y, (f.t - 0.25) * 120, '#ffffff'); },
  };

  // ================================================================ the cutscene
  const T = { bars: 0.6, roar: 1.4, charge: 2.1, after: 1.6 };
  const ROOM = 84;   // how far back the last hit knocks it (its slow charge closes about 38 of that)

  class Finale {
    constructor(g, boss) {
      this.g = g; this.boss = boss;
      this.el = g.element();
      this.fin = (this.el && F[this.el.id]) || F.none;
      this.phase = 'bars'; this.pt = 0; this.t = 0; this.bars = 0; this.eyes = 0; this.slow = 0;
      const p = g.player;
      p.controls = false; p.vx = 0; p.vy = 0; p.attackT = 0; p.dashT = 0; p.blocking = false;
      // (nothing frozen mid-way for the next six seconds: no hit-blink, no hurt pose, no half-finished moves)
      p.invulnT = 0; p.hurtT = 0; p.ultHold = null; p.cineLift = 0;
      if (p.hp <= 0) p.hp = 1;                       // the same instant it got you? You made it. Just.
      g.effects = []; g.shockwaves = [];
      p.facing = Math.sign(boss.cx - p.cx) || 1;
      p.cinePose = 'idle';
      boss.state = 'cut'; boss.vx = 0; boss.facing = -p.facing; boss.cutPose = null; boss.flash = 0; boss.status = {};
      if (boss.calm) boss.calm();                    // (its breath, the fire its feet left: out)
      for (const e of g.enemies) if (e !== boss && !e.dead && e.zone === 'azure') { e.dead = true; ERX.AzureBoss.embers(g, e.cx, e.cy, 8, 4); }
      g.bolts = [];
      g.hudAlpha = 0;
      g.bossBar = null;
      g.music(null);
      sfx('slowMo');
      this.dust = [];
      // that last hit knocks it back (it needs room to come at you): it skids to about ROOM away,
      // and if there's a wall behind it, you give a little ground too
      const lo = 4 * 16, hi = g.level.pw - 4 * 16, dir = Math.sign(boss.cx - p.cx) || 1;
      this.bossTo = boss.x; this.youTo = p.x;
      if (Math.abs(boss.cx - p.cx) < ROOM) {
        const bx = U.clamp(p.cx + dir * ROOM, lo, hi);
        this.bossTo = bx - boss.w / 2;
        const short = ROOM - Math.abs(bx - p.cx);
        if (short > 1) this.youTo = U.clamp(p.cx - dir * short, lo, hi) - p.w / 2;
      }
      // and if either of you was in the air (a leap, a jump), you both come down first
      this.bossFeet = groundBelow(g.level, this.bossTo + boss.w / 2, boss.y + boss.h);
      this.youFeet = groundBelow(g.level, this.youTo + p.w / 2, p.feet);
      this.fallV = [0, 0];
      // where the camera holds: between the two of you
      const mid = (this.bossTo + boss.w / 2 + this.youTo + p.w / 2) / 2;
      this.camX = U.clamp(mid - g.view.width / 2, 0, Math.max(0, g.level.pw - g.view.width));
    }
    enter(ph) {
      this.phase = ph; this.pt = 0;
      const g = this.g, b = this.boss;
      if (ph === 'roar') { b.cutPose = ERX.AzureBoss.APOSE.roar; b.phase = 2; sfx('azureRoar'); ERX.FX.shake(4, 1.2); }
      if (ph === 'charge') { sfx('heartbeat'); this.slow = 1; }
      if (ph === 'kill') {
        b.hidden = true;
        this.kill = new Kill(g, b, this.el);
        g.player.cinePose = this.fin.pose || 'raise';
        g.flashT = Math.max(g.flashT || 0, 0.12);
        this.fin.start(this.kill);
      }
      if (ph === 'after') { this.slow = 0; }
    }
    update(dt) {
      const g = this.g, b = this.boss, p = g.player;
      // (the killing hit can still spawn its impact after we've started, in that same frame: sweep once more)
      if (!this.swept) { this.swept = true; g.effects = []; g.shockwaves = []; }
      this.t += dt; this.pt += dt;
      g.camera.x += (this.camX - g.camera.x) * Math.min(1, dt * 3);
      if (this.phase === 'bars') {
        this.bars = Math.min(1, this.pt / T.bars);
        const k = Math.min(1, dt * 7), was = b.x;
        b.x += (this.bossTo - b.x) * k; p.x += (this.youTo - p.x) * k;
        [[b, this.bossFeet], [p, this.youFeet]].forEach(([e, gy], i) => { if (e.y + e.h < gy) { this.fallV[i] += 900 * dt; e.y = Math.min(gy - e.h, e.y + this.fallV[i] * dt); } });
        if (Math.abs(b.x - was) > 0.3 && Math.random() < dt * 30) this.dust.push({ x: b.cx, y: b.y + b.h - 1, vx: -b.facing * R(4, 12), vy: R(-10, -3), t: 0 });
        if (this.pt >= T.bars) {
          b.x = this.bossTo; p.x = this.youTo; b.y = this.bossFeet - b.h; p.y = this.youFeet - p.h; b.onGround = p.onGround = true; b.vy = 0;
          this.enter('roar');
        }
      }
      else if (this.phase === 'roar') { if (Math.random() < dt * 40) ERX.AzureBoss.embers(g, b.cx, b.y + 8, 1, 10); if (this.pt >= T.roar) this.enter('charge'); }
      else if (this.phase === 'charge') {
        // it comes at you... slowly. Very slowly. (It never gets there.)
        const gap = Math.abs(p.cx - b.cx);
        if (gap > 34) { b.x += b.facing * 18 * dt; b.stride += dt * 1.6; }
        b.cutPose = ERX.AzureBoss.APOSE.walk[Math.floor(b.stride) % 4];
        if (Math.random() < dt * 6) this.dust.push({ x: b.cx - b.facing * 4, y: b.y + b.h - 1, vx: -b.facing * 6, vy: -4, t: 0 });
        if (this.pt > 0.7 && this.eyes === 0) { this.eyes = 0.01; if (this.el) ES().charge(this.el.id); }
        if (Math.floor(this.pt * 1.1) !== Math.floor((this.pt - dt) * 1.1)) sfx('heartbeat');
        if (this.pt >= T.charge) this.enter('kill');
      } else if (this.phase === 'kill') {
        this.slow = Math.max(0, this.slow - dt * 3);
        this.fin.update(this.kill, dt);
        this.kill.update(dt);
        for (const l of this.kill.lights) l.t = (l.t || 0) + dt;
        if (this.pt >= this.fin.dur) this.enter('after');
      } else if (this.phase === 'after') {
        this.kill.update(dt);
        this.bars = Math.max(0, 1 - Math.max(0, this.pt - 0.6) / 0.8);
        this.eyes = Math.max(0, this.eyes - dt * 1.5);
        if (this.pt >= T.after) this.end();
      }
      if (this.eyes > 0 && this.phase !== 'after') this.eyes = Math.min(1, this.eyes + dt * 2);
      for (const d of this.dust) { d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; }
      this.dust = this.dust.filter((d) => d.t < 1.5);
    }
    end() {
      const g = this.g, p = g.player;
      g.cutscene = null;
      p.cinePose = null;
      this.boss.hidden = true;
      this.boss.finish();
      g.hudAlpha = 0.01;
      g.runScript(ERX.Story.world.abyssAfter);
    }
    /** Over the lit world: slow motion's tint, your glowing eyes, the finisher. */
    drawWorld(ctx, cam) {
      const g = this.g, p = g.player, vw = g.view.width, vh = g.view.height, o = { x: -cam.ix, y: -cam.iy };
      if (this.slow > 0) {
        ctx.globalAlpha = 0.32 * this.slow; ctx.fillStyle = '#0a1028'; ctx.fillRect(0, 0, vw, vh);
        const vg = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.25, vw / 2, vh / 2, vw * 0.65);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.globalAlpha = this.slow; ctx.fillStyle = vg; ctx.fillRect(0, 0, vw, vh);
        ctx.globalAlpha = 0.25 * this.slow; ctx.fillStyle = '#c8d8ff';
        for (let i = 0; i < 18; i++) { const y = (i * 37 + Math.floor(this.t * 30) * 7) % vh; ctx.fillRect((i * 97) % vw, y, 14 + (i % 4) * 6, 1); }   // slow motion streaks
        ctx.globalAlpha = 1;
      }
      for (const d of this.dust) { ctx.globalAlpha = 0.6 * (1 - d.t / 1.5); ctx.fillStyle = '#8a7e9c'; ctx.fillRect(Math.round(d.x + o.x), Math.round(d.y + o.y), 2, 2); }
      ctx.globalAlpha = 1;
      if (this.kill) {
        this.fin.draw(this.kill, ctx, o);
        this.kill.drawBody(ctx, o);
        this.kill.drawBits(ctx, o);
        this.kill.drawParts(ctx, o);
      }
      // your eyes, burning with your element
      if (this.eyes > 0) {
        const PS = ERX.PlayerSide, pose = p.cinePose || 'idle', pt = PS.points(PS.poseOf(pose, 0)).eye;
        const x = Math.round(p.cx + pt.dx * p.facing) + o.x, y = Math.round(p.feet - 1 + pt.dy) + o.y, col = this.el ? this.el.color : '#ffffff', k = this.eyes;
        glow(ctx, x, y, 10 * k, col, 0.7 * k);
        ctx.globalAlpha = k;
        px(ctx, x, y, 1, 1, '#ffffff');
        px(ctx, x - p.facing * 1, y, 1, 1, col);
        for (let i = 1; i <= 6; i++) { ctx.globalAlpha = k * (1 - i / 7); px(ctx, x - p.facing * (i + 1), y + (i > 3 ? -1 : 0), 1, 1, col); }   // a streak of light trailing off
        ctx.globalAlpha = 1;
      }
    }
    /** On the screen itself: the bars (and the move's name, as it lands). */
    drawScreen(ctx, W, H) {
      const bh = Math.round(this.bars * H * 0.12);
      if (bh > 0) { ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh); }
      if (this.phase === 'kill' && this.pt < 1.6) {
        const k = Math.min(1, this.pt / 0.2) * Math.min(1, (1.6 - this.pt) / 0.3);
        ERX.Font.draw(ctx, this.fin.name, W / 2, H - Math.max(bh, 12) + Math.round((bh - 9) / 2), { color: this.el ? this.el.color : '#ffffff', outline: '#000000', align: 'center', alpha: k });
      }
    }
    /** Light: the finisher's flashes, your eyes. */
    lights() {
      const out = [], p = this.g.player;
      if (this.eyes > 0) out.push({ x: p.cx + p.facing * 2, y: p.y + 6, r: 30 * this.eyes, color: this.el ? this.el.color : '#ffffff', intensity: this.eyes });
      if (this.kill) out.push({ x: this.kill.x, y: this.kill.cy, r: 70, color: this.el ? this.el.color : '#ffffff', intensity: Math.max(0, 1 - this.kill.t / (this.fin.dur + 1)) });
      return out;
    }
  }

  Finale.T = T;
  ERX.Finale = Finale;
  ERX.Finishers = F;
})(window.ERX = window.ERX || {});
