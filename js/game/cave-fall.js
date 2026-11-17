/*
 * THE CAVE-IN — the old cave's floor gives way and you fall. A long way.
 *
 *   drop  through the hole in the floor; everything goes black
 *   fall  ~11 s down a dark shaft: steer left / right (dash to swerve) round
 *         rocks falling faster than you (a red "!" flashes at the top where
 *         each one is about to come from) and bats flapping up past you.
 *         Dark crystals start to glint in the walls the deeper you go.
 *   dark  the last of the light runs out: nothing but shadow
 *   ...then the game takes you to THE DEEPER ENDS, where you land.
 *
 * The music is the tutorial's "something terrible is coming" track ('boss').
 *
 *   g.fall = new ERX.CaveFall(g); g.fall.onDone = (g) => ...
 * The same shape as ERX.SkyFall (js/game/world-fall.js), so the game screen
 * runs it the same way: update(dt), renderWorld(ctx, cam), renderOverlay(ctx, vw, vh).
 * Bonks hurt (a share of your health, like the sky fall) but never knock you out.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, C = ERX.Color, PB = ERX.PixelBuffer;
  const K = () => ERX.Keybinds;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);

  const T = { drop: 0.9, fall: 11, dark: 1.8 };
  const ROCK = ['#8a7e74', '#6a5e54', '#4a4038', '#2e2824'];
  const WALL = ['#5a4a40', '#463a32', '#342a24', '#241c18'];
  const GLINTS = ['#8a6aff', '#5a8aff', '#c86aff', '#4ac8e8'];   // the Deeper Ends' crystals, showing through
  const INK = '#0c0806';
  const cache = new Map();
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const mix = (a, b, k) => C.mix(a, b, U.clamp(k, 0, 1));

  /** A tumbling rock of radius s (4 turns of a spin): a lumpy disc, lit from the top-left. */
  function rockCv(s, f) {
    const key = s + ',' + f;
    if (cache.has(key)) return cache.get(key);
    const n = s * 2 + 3, b = new PB(n, n), c = (n - 1) / 2, rng = new U.RNG(s * 31 + 7);
    const bumps = Array.from({ length: 7 }, () => rng.range(0.78, 1.05));
    const rot = (f * Math.PI) / 2;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const dx = x - c, dy = y - c, r = Math.hypot(dx, dy);
        const a = (((Math.atan2(dy, dx) - rot) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (r > s * bumps[Math.floor((a / (Math.PI * 2)) * 7) % 7]) continue;
        const lit = -dx - dy;   // light from the top-left (it doesn't spin with the rock)
        b.set(x, y, C.u32(lit > s * 0.6 ? ROCK[0] : lit > -s * 0.2 ? ROCK[1] : lit > -s * 0.9 ? ROCK[2] : ROCK[3]));
      }
    }
    b.outline(C.u32(INK));
    const cv = b.toCanvas();
    cache.set(key, cv);
    return cv;
  }

  class CaveFall {
    constructor(g) {
      this.g = g;
      this.phase = 'drop';
      this.pt = 0;                 // time in this phase
      this.t = 0;                  // total
      this.x = this.vw / 2;        // you, across the shaft (screen px)
      this.vx = 0; this.dashT = 0; this.dashCd = 0;
      this.depth = 0;              // how far you've fallen (the walls scroll past by it)
      this.dropVy = 60;
      this.obs = [];               // rocks + bats
      this.warn = [];              // "a rock is coming here" markers
      this.spawnT = 1.1;
      this.invT = 0; this.spin = 0;
      this.pops = [];              // damage numbers (screen space)
      this.specks = Array.from({ length: 46 }, () => ({ x: Math.random() * this.vw, y: Math.random() * this.vh, sp: 0.5 + Math.random(), len: 2 + Math.random() * 6 }));
      const p = g.player;
      p.controls = false; p.vx = 0; p.vy = 0; p.lying = false;
      g.state = 'skyfall';
      g.hudAlpha = 0;
      g.objective = null;
      ERX.Skyfall = { wind: 0.3, flap: 1 };         // the falling-wind sound (world-audio.js) listens to this
      ERX.Audio.setAmbience('skyfall');
      ERX.Audio.playMusic('boss');                   // the tutorial's "something terrible is coming"
      sfx('crash');
      ERX.FX.shake(5, 0.5);
    }

    get vw() { return this.g.view.width; }
    get vh() { return this.g.view.height; }
    /** Your height on screen (your middle). */
    get py() { return Math.round(this.vh * 0.36); }
    speed() { return U.lerp(200, 360, Math.min(1, this.pt / 6)); }
    /** How far the left / right wall sticks out at a depth (screen px from that edge). */
    wallL(d) { return this.vw * 0.17 + Math.sin(d * 0.004) * 16 + Math.sin(d * 0.011 + 1) * 9; }
    wallR(d) { return this.vw * 0.17 + Math.sin(d * 0.005 + 2) * 16 + Math.sin(d * 0.013 + 4) * 9; }

    enter(ph) {
      this.phase = ph;
      this.pt = 0;
      if (ph === 'fall') ERX.FX.shake(2, 0.3);
      if (ph === 'dark') ERX.Audio.cutMusic();
    }

    update(dt) {
      const g = this.g, p = g.player;
      this.t += dt;
      this.pt += dt;
      if (this.pt >= T[this.phase]) {
        if (this.phase === 'drop') this.enter('fall');
        else if (this.phase === 'fall') this.enter('dark');
        else return this.finish();
      }
      if (this.phase === 'drop') {
        // through the hole (in the cave itself), the camera following you down into it
        this.dropVy = Math.min(460, this.dropVy + 900 * dt);
        p.y += this.dropVy * dt;
        g.camera.y += this.dropVy * dt * 0.7;
        return;
      }
      // ---- steering (as in the sky: left / right, dash to swerve)
      const k = K(), want = (k.isDown('moveRight') ? 1 : 0) - (k.isDown('moveLeft') ? 1 : 0);
      if (this.phase === 'fall') {
        this.dashCd = Math.max(0, this.dashCd - dt); this.dashT = Math.max(0, this.dashT - dt);
        if (k.wasPressed('dash') && this.dashCd <= 0 && want) { this.dashT = 0.2; this.dashCd = 0.7; this.vx = want * 280; sfx('dash'); }
        if (this.dashT <= 0) this.vx = want ? U.approach(this.vx, want * 135, 7, dt) : U.approach(this.vx, 0, 4, dt);
      } else this.vx = U.approach(this.vx, 0, 3, dt);
      this.x += this.vx * dt;
      const d = this.depth + this.py, lo = this.wallL(d) + 10, hi = this.vw - this.wallR(d) - 10;
      if (this.x < lo) { this.x = lo; this.vx = Math.max(0, this.vx); } else if (this.x > hi) { this.x = hi; this.vx = Math.min(0, this.vx); }
      if (Math.abs(this.vx) > 25) p.facing = Math.sign(this.vx);
      this.invT = Math.max(0, this.invT - dt);
      this.spin = Math.max(0, this.spin - dt * 1.7);
      // ---- falling
      const sp = this.speed();
      this.depth += sp * dt;
      ERX.Skyfall.wind = this.phase === 'dark' ? Math.max(0, 1 - this.pt / T.dark) * 0.8 : U.clamp(0.45 + this.pt / 12, 0, 0.95);
      for (const s of this.specks) { s.y -= sp * s.sp * dt; if (s.y < -10) { s.y = this.vh + Math.random() * 20; s.x = Math.random() * this.vw; } }
      for (const pp of this.pops) pp.t += dt;
      this.pops = this.pops.filter((pp) => pp.t < 0.9);
      this.updateObstacles(dt, sp);
    }

    // ---------------------------------------------------------- what's in the way
    updateObstacles(dt, sp) {
      const vh = this.vh, py = this.py;
      if (this.phase === 'fall') {
        this.spawnT -= dt;
        if (this.spawnT <= 0 && this.pt < T.fall - 1.4) {
          const late = Math.min(1, this.pt / T.fall);
          this.spawnT = U.lerp(0.7, 0.36, late) + Math.random() * 0.25;   // busier the deeper you go
          if (Math.random() < 0.55) this.warnRock(); else this.spawnBat(sp);
        }
      }
      // a warning, then the rock it warned about
      for (const w of this.warn) {
        w.t -= dt;
        if (w.t <= 0) {
          w.done = true;
          this.obs.push({ kind: 'rock', x: w.x, y: -w.s * 2 - 4, vx: U.lerp(-18, 18, Math.random()), vy: U.lerp(200, 260, Math.random()), s: w.s, t: 0 });
          sfx('rockWhoosh', { minGap: 0.1 });
        }
      }
      this.warn = this.warn.filter((w) => !w.done);
      for (const o of this.obs) {
        o.t += dt;
        if (o.kind === 'bat' && !o.gone) {
          // flapping up past you, swerving toward you a little on the way
          const steer = o.y > py ? U.clamp((this.x - o.x) * 0.7, -45, 45) : 0;
          o.x += (o.vx + Math.sin(o.t * 6 + o.ph) * 28 + steer) * dt;
        } else o.x += o.vx * dt;
        o.y += o.vy * dt;
        if (o.gone) { o.vy += 300 * dt; continue; }
        if (this.invT > 0 || this.phase !== 'fall') continue;
        const hx = o.kind === 'bat' ? 5 : o.s, hy = o.kind === 'bat' ? 4 : o.s;
        if (Math.abs(o.x - this.x) < 4 + hx && Math.abs(o.y - py) < 9 + hy) this.hit(o);
      }
      this.obs = this.obs.filter((o) => o.y > -60 && o.y < vh + 70);
    }

    /** A rock's coming: flash a warning at the top of the screen, somewhere near you. */
    warnRock() {
      const lo = this.wallL(this.depth) + 16, hi = this.vw - this.wallR(this.depth) - 16;
      this.warn.push({ x: U.clamp(this.x + U.lerp(-40, 40, Math.random()), lo, hi), t: 0.7, s: Math.floor(U.lerp(4, 8, Math.random())) });   // aimed at you, roughly
      sfx('rockWarn', { minGap: 0.15 });
    }

    spawnBat(sp) {
      const d = this.depth + this.vh, lo = this.wallL(d) + 12, hi = this.vw - this.wallR(d) - 12;
      this.obs.push({ kind: 'bat', x: U.lerp(lo, hi, Math.random()), y: this.vh + 16, vx: U.lerp(-25, 25, Math.random()), vy: -sp * U.lerp(0.55, 0.8, Math.random()), t: 0, ph: Math.random() * 6 });
      sfx('batScreech', { minGap: 0.4 });
    }

    hit(o) {
      const g = this.g, p = g.player;
      this.invT = 1.1; this.spin = 1;
      const dmg = Math.max(1, Math.round(p.maxHp * ERX.SkyFall.hitShare(g.element())));
      p.hp = Math.max(1, p.hp - dmg);                  // it hurts, but it won't knock you out
      this.pops.push({ x: this.x, y: this.py - 14, text: '-' + dmg, t: 0 });
      this.vx = (this.x < o.x ? -1 : 1) * 160;
      sfx('skyBonk');
      ERX.FX.shake(3, 0.2);
      o.gone = true;
      if (o.kind === 'bat') { sfx('batHurt'); o.vy = -this.speed() * 1.2; o.vx = -this.vx * 0.5; }
      else { sfx('rockClack'); o.vy *= 0.5; o.vx = -this.vx * 0.4; }
    }

    finish() {
      const g = this.g;
      g.fall = null;
      g.state = 'black';           // hold on black while the next place loads
      ERX.Skyfall = null;
      ERX.Audio.setAmbience(null);
      if (this.onDone) this.onDone(g);
    }

    // ---------------------------------------------------------- drawing
    /** In the cave: you, tumbling through the hole. (After that it's all on the overlay.) */
    renderWorld(ctx, cam) {
      if (this.phase !== 'drop') return;
      const g = this.g, p = g.player, S = ERX.SkyFall;
      S.drawBody(ctx, p.look, S.tumblePose(this.t), p.cx - cam.ix, p.feet - cam.iy, p.facing, this.t * 3, 1);
    }

    renderOverlay(ctx, vw, vh) {
      const ph = this.phase;
      if (ph === 'drop') {
        const a = U.clamp((this.pt - 0.35) / 0.45, 0, 1);   // swallowed by the dark
        if (a > 0) { ctx.fillStyle = 'rgba(0,0,0,' + a.toFixed(3) + ')'; ctx.fillRect(0, 0, vw, vh); }
        return;
      }
      const deep = ph === 'dark' ? 1 : U.clamp(this.pt / T.fall, 0, 1);   // 0 near the top .. 1 at the bottom
      // the shaft: dim brown up near the hole, black further down
      const gr = ctx.createLinearGradient(0, 0, 0, vh);
      gr.addColorStop(0, mix('#2a2018', '#08050a', deep));
      gr.addColorStop(1, mix('#140e0a', '#020103', deep));
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, vw, vh);
      // the far wall, slipping past slower (bands of darker rock)
      for (let y = 0; y < vh; y += 6) {
        const h = hash(Math.floor((this.depth * 0.45 + y) / 18));
        if (h < 0.6) continue;
        ctx.globalAlpha = (h - 0.6) * 0.5 * (1 - deep * 0.6);
        ctx.fillStyle = '#3a2e26';
        ctx.fillRect(0, y - ((this.depth * 0.45) % 6), vw, 4);
      }
      ctx.globalAlpha = 1;
      // the light from the hole above, fading as you fall
      const la = Math.max(0, 0.22 - deep * 0.5);
      if (la > 0) { const lg = ctx.createLinearGradient(0, 0, 0, vh * 0.7); lg.addColorStop(0, 'rgba(255,220,170,' + la.toFixed(3) + ')'); lg.addColorStop(1, 'rgba(255,220,170,0)'); ctx.fillStyle = lg; ctx.fillRect(vw * 0.25, 0, vw * 0.5, vh * 0.7); }
      // dust rushing up past you
      ctx.fillStyle = '#a8988a';
      for (const s of this.specks) { ctx.globalAlpha = 0.25 + s.sp * 0.2; ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, Math.round(s.len * (this.speed() / 260))); }
      ctx.globalAlpha = 1;
      this.drawWalls(ctx, vw, vh, deep);
      for (const w of this.warn) this.drawWarning(ctx, w);
      for (const o of this.obs) this.drawObstacle(ctx, o);
      this.drawYou(ctx);
      // the dark closing in from the edges, more and more
      const vg = ctx.createRadialGradient(vw / 2, vh * 0.4, vh * 0.25, vw / 2, vh * 0.4, vw * 0.62);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,' + (0.45 + deep * 0.4).toFixed(3) + ')');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, vw, vh);
      // hurt: a red flash; damage numbers
      if (this.invT > 0.9) { ctx.fillStyle = 'rgba(255,60,40,' + ((this.invT - 0.9) * 1.2).toFixed(3) + ')'; ctx.fillRect(0, 0, vw, vh); }
      const F = ERX.Font;
      for (const pp of this.pops) F.draw(ctx, pp.text, Math.round(pp.x), Math.round(pp.y - pp.t * 20), { color: '#ff6a5a', outline: '#120c16', align: 'center', alpha: 1 - pp.t / 0.9 });
      // how to dodge, for the first few seconds
      if (ph === 'fall') {
        const hk = U.clamp(Math.min((this.pt - 0.6) / 0.4, (4.6 - this.pt) / 0.6), 0, 1);
        if (hk > 0) { ctx.globalAlpha = hk; F.draw(ctx, ERX.keyText('{moveLeft} {moveRight} DODGE     {dash} SWERVE'), Math.round(vw / 2), vh - 20, { color: '#ffd34d', outline: '#1a1424', align: 'center' }); ctx.globalAlpha = 1; }
        if (this.pt < 0.45) { ctx.fillStyle = 'rgba(0,0,0,' + (1 - this.pt / 0.45).toFixed(3) + ')'; ctx.fillRect(0, 0, vw, vh); }   // out of the black
      }
      // ...into the shadows
      if (ph === 'dark') { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, this.pt / (T.dark * 0.8)).toFixed(3) + ')'; ctx.fillRect(0, 0, vw, vh); }
    }

    /** The shaft's walls: rock rushing up past you, with dark crystals glinting out of it the deeper you go. */
    drawWalls(ctx, vw, vh, deep) {
      for (let y = 0; y < vh; y += 2) {
        const d = this.depth + y, xl = Math.round(this.wallL(d)), xr = Math.round(vw - this.wallR(d));
        const band = Math.floor(d / 9), shade = (b) => WALL[Math.min(3, Math.floor(hash(b) * 2.4 + deep * 1.4))];
        ctx.fillStyle = shade(band); ctx.fillRect(0, y, xl - 3, 2);
        ctx.fillStyle = shade(band + 999); ctx.fillRect(xr + 3, y, vw - xr - 3, 2);
        ctx.fillStyle = WALL[0]; ctx.fillRect(xl - 3, y, 2, 2); ctx.fillRect(xr + 1, y, 2, 2);   // the lit lip
        ctx.fillStyle = INK; ctx.fillRect(xl - 1, y, 1, 2); ctx.fillRect(xr, y, 1, 2);           // and its edge
      }
      // crystal glints, more of them the further down you are
      for (let i = Math.floor(this.depth / 23) - 1; i <= Math.floor((this.depth + vh) / 23) + 1; i++) {
        if (hash(i) > deep * 0.75) continue;
        const y = i * 23 - this.depth, left = hash(i + 0.5) < 0.5, d = this.depth + y;
        const x = left ? this.wallL(d) - 3 - hash(i + 0.3) * 14 : vw - this.wallR(d) + 3 + hash(i + 0.3) * 14, col = GLINTS[Math.floor(hash(i + 0.7) * 4)];
        const gl = ctx.createRadialGradient(x, y, 1, x, y, 10);
        gl.addColorStop(0, C.rgba(col, 0.45)); gl.addColorStop(1, C.rgba(col, 0));
        ctx.fillStyle = gl; ctx.fillRect(x - 10, y - 10, 20, 20);
        ctx.fillStyle = col; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 2, 2, 4);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 2, 1, 1);
      }
    }

    /** A red "!" at the top of the screen where a rock is about to come from (blinking faster as it gets close). */
    drawWarning(ctx, w) {
      if (Math.floor(w.t * (w.t < 0.3 ? 16 : 8)) % 2) return;
      const x = Math.round(w.x), y = 6;
      ctx.fillStyle = INK;
      for (let r = 0; r < 9; r++) ctx.fillRect(x - Math.ceil(r / 2) - 1, y + r, Math.ceil(r / 2) * 2 + 3, 1);
      ctx.fillStyle = '#ff4a3a';
      for (let r = 1; r < 8; r++) ctx.fillRect(x - Math.ceil(r / 2) + (r > 1 ? 0 : 0), y + r, Math.ceil(r / 2) * 2 + 1, 1);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y + 3, 1, 2); ctx.fillRect(x, y + 6, 1, 1);
    }

    drawObstacle(ctx, o) {
      if (o.kind === 'rock') {
        const cv = rockCv(o.s, Math.floor(o.t * 8) % 4);
        ctx.drawImage(cv, Math.round(o.x - cv.width / 2), Math.round(o.y - cv.height / 2));
        // a streak of dust behind it
        ctx.globalAlpha = 0.3; ctx.fillStyle = '#a8988a'; ctx.fillRect(Math.round(o.x) - 1, Math.round(o.y - o.s - 10), 2, 7); ctx.globalAlpha = 1;
      } else {
        const cv = ERX.Enemies.batSprite('#5a3a7a', Math.floor(o.t * 12 + o.ph) % 2 ? 'up' : 'down');
        ctx.drawImage(cv, Math.round(o.x - cv.width / 2), Math.round(o.y - cv.height / 2));
      }
    }

    drawYou(ctx) {
      if (this.invT > 0 && Math.floor(this.invT * 14) % 2 === 0) return;
      const p = this.g.player, S = ERX.SkyFall, t = this.t;
      const tumbling = this.spin > 0, j = tumbling ? S.tumblePose(t) : S.fallPose(t, this.vx, this.pt < 1.5 || this.phase === 'dark');
      const ang = tumbling ? (1 - this.spin) * Math.PI * 2 * Math.sign(this.vx || 1) : U.clamp(this.vx / 300, -0.4, 0.4) + Math.sin(t * 1.7) * 0.05;
      S.drawBody(ctx, p.look, j, this.x, this.py + 11 + Math.sin(t * 2.3) * 1.5, p.facing, ang, 1);
    }
  }

  CaveFall.T = T;
  ERX.CaveFall = CaveFall;
})(window.ERX = window.ERX || {});
