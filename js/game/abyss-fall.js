/*
 * THE FALL INTO THE ABYSS — the floor of skulls gives way (js/game/level-deeper.js: collapse).
 *
 *   drop  through the hole, the skulls going down with you; everything goes black
 *   fall  ~9.5 s down through a vast cavern: great pillars rushing up past you with
 *         dark crystals glowing on them, black lava pouring down the far walls, the
 *         bones and your torch tumbling along with you. Then, coming up from below:
 *         a lake of BLACK LAVA, pillars rising out of it, and a slab of rock over it...
 *   land  ...which arrives very quickly. Black.
 *   ...then the game takes you to THE ABYSS (js/game/level-abyss.js), where you land.
 *
 * Nothing hurts on the way down (you can steer: left / right). The same shape as
 * ERX.CaveFall: update(dt), renderWorld(ctx, cam), renderOverlay(ctx, vw, vh), onDone.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, C = ERX.Color;
  const K = () => ERX.Keybinds;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);

  const T = { drop: 0.9, fall: 9.5, land: 0.45 };
  const SHOW = 3.4;            // the lake comes into view this long before the end of the fall
  const INK = '#040306';
  const mix = (a, b, k) => C.mix(a, b, U.clamp(k, 0, 1));

  class AbyssFall {
    constructor(g) {
      this.g = g;
      this.phase = 'drop';
      this.pt = 0; this.t = 0;
      this.x = this.vw / 2; this.vx = 0;
      this.depth = 0;
      this.dropVy = 60;
      const A = ERX.AbyssArt, rng = new U.RNG(0xfa11);
      // the pillars you fall past: across the screen (0..1), how wide, how near (it scrolls by that much of your fall)
      this.pillars = [[0.04, 30, 0.35], [0.17, 44, 0.6], [0.3, 26, 0.3], [0.71, 30, 0.32], [0.84, 52, 0.75], [0.97, 34, 0.42], [-0.02, 70, 1.25], [1.04, 64, 1.2]].map(([fx, w, s], i) => ({
        fx, w, s, tile: A.pillarTile(w, 128, 77 + i * 13),
        clusters: Array.from({ length: 3 }, (_, k) => ({ y: k * 140 + rng.range(0, 100), side: rng.chance(0.5) ? -1 : 1, cv: A.clusterCv(rng.int(3, 5), Math.round(U.lerp(7, 16, s / 1.25)), rng.int(0, 2), 0, rng.int(1, 999)) })),
      }));
      this.pillars.sort((a, b) => a.s - b.s);   // far ones first
      // black lava pouring down the far walls
      this.lavaFalls = [0.1, 0.24, 0.46, 0.6, 0.78, 0.9].map((fx) => ({ fx, w: rng.int(8, 15), ph: rng.range(0, 6) }));
      this.glints = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random() * 400, ph: Math.random() * 6, c: rng.pick(['#9a6aff', '#c86aff', '#6a9aff']) }));
      // the skulls and bones that went down with you (screen space, drifting round you)
      const B = ERX.DeeperTrial;
      this.bones = Array.from({ length: 16 }, () => ({
        cv: B.boneCv(rng.pick(['skull', 'skull', 'skullBig', 'bone', 'jaw', 'ribs', 'skullSide']), rng.chance(0.5)),
        x: this.vw / 2 + rng.range(-120, 120), y: this.py + rng.range(-90, 70), vx: rng.range(-14, 14), vy: rng.range(-34, 44), ang: rng.range(0, 6), spin: rng.range(-5, 5),
      }));
      // ...and your torch, if you had it
      const torch = g.level && g.level.torch;
      this.torch = torch && torch.held ? { x: this.vw / 2 + 14, y: this.py - 6, vx: 6, vy: -16, ang: 0.5, spin: 3.2 } : null;
      if (torch) torch.held = false;
      this.specks = Array.from({ length: 50 }, () => ({ x: Math.random() * this.vw, y: Math.random() * this.vh, sp: 0.5 + Math.random(), len: 2 + Math.random() * 6 }));
      const p = g.player;
      p.controls = false; p.vx = 0; p.vy = 0; p.lying = false;
      g.state = 'skyfall';
      g.hudAlpha = 0;
      g.objective = null;
      ERX.Skyfall = { wind: 0.3, flap: 1 };          // the falling-wind sound (world-audio.js) listens to this
      ERX.Audio.setAmbience('skyfall');
      ERX.Audio.playMusic(null);
      ERX.FX.shake(5, 0.5);
    }

    get vw() { return this.g.view.width; }
    get vh() { return this.g.view.height; }
    /** Your height on screen (your middle). */
    get py() { return Math.round(this.vh * 0.36); }
    speed() { return U.lerp(240, 420, Math.min(1, this.pt / 5)); }
    /** How close the bottom is: 0 (out of sight) .. 1 (right under you), over the last `over` seconds of the fall. */
    near(over = SHOW) {
      if (this.phase === 'land') return 1;
      return this.phase === 'fall' ? U.clamp(1 - (T.fall - this.pt) / over, 0, 1) : 0;
    }
    /** Where the lake's surface is on screen: it's huge and far off, so it rises slowly into view... */
    lakeY() { const u = this.near(); return Math.round(this.vh + 10 - (this.vh + 10 - this.py - 40) * u); }
    /** ...and the slab over it is near, so it comes up fast, right at the end, to land on. */
    slabY() { const u = this.near(1.4); return Math.round(this.py + 14 + (this.vh + 90 - this.py - 14) * (1 - u) * (1 - u)); }

    enter(ph) {
      this.phase = ph;
      this.pt = 0;
      if (ph === 'fall') ERX.FX.shake(2, 0.3);
      if (ph === 'land') { ERX.FX.shake(6, 0.4); sfx('rockWhoosh'); }
    }

    update(dt) {
      const g = this.g, p = g.player;
      this.t += dt;
      this.pt += dt;
      if (this.pt >= T[this.phase]) {
        if (this.phase === 'drop') this.enter('fall');
        else if (this.phase === 'fall') this.enter('land');
        else return this.finish();
      }
      if (this.phase === 'drop') {
        // down through the hole (in the corridor itself), the camera following you in
        this.dropVy = Math.min(460, this.dropVy + 900 * dt);
        p.y += this.dropVy * dt;
        g.camera.y += this.dropVy * dt * 0.7;
        return;
      }
      // steering (nothing to dodge: just for the feel of it)
      const k = K(), want = (k.isDown('moveRight') ? 1 : 0) - (k.isDown('moveLeft') ? 1 : 0);
      this.vx = want && this.phase === 'fall' ? U.approach(this.vx, want * 120, 6, dt) : U.approach(this.vx, 0, 4, dt);
      this.x = U.clamp(this.x + this.vx * dt, this.vw * 0.2, this.vw * 0.8);
      if (Math.abs(this.vx) > 25) p.facing = Math.sign(this.vx);
      const sp = this.speed();
      this.depth += sp * dt;
      ERX.Skyfall.wind = this.phase === 'land' ? 0.4 : U.clamp(0.5 + this.pt / 10, 0, 1);
      for (const s of this.specks) { s.y -= sp * s.sp * dt; if (s.y < -10) { s.y = this.vh + Math.random() * 20; s.x = Math.random() * this.vw; } }
      for (const b of this.bones) { b.x += (b.vx - this.vx * 0.3) * dt; b.y += b.vy * dt; b.ang += b.spin * dt; }
      if (this.torch) { const o = this.torch; o.x += (o.vx - this.vx * 0.3) * dt; o.y += o.vy * dt; o.ang += o.spin * dt; }
      // the lava below starts to bubble and hiss as it comes up
      if (this.phase === 'fall' && this.near() > 0 && Math.random() < dt * 2) sfx('lavaBubble', { minGap: 0.3 });
    }

    finish() {
      const g = this.g;
      g.fall = null;
      g.state = 'black';           // hold on black while the abyss loads
      ERX.Skyfall = null;
      ERX.Audio.setAmbience(null);
      if (this.onDone) this.onDone(g);
    }

    // ---------------------------------------------------------- drawing
    /** In the corridor: you, tumbling down the hole. (After that it's all on the overlay.) */
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
      const t = this.t, near = this.near(), lake = this.lakeY(), slab = this.slabY();
      // the cavern: black above, a glow of hot magenta coming up from below as the lava gets closer
      const gr = ctx.createLinearGradient(0, 0, 0, vh);
      gr.addColorStop(0, '#020104'); gr.addColorStop(1, mix('#0a0410', '#3a0a2a', 0.25 + near * 0.75));
      ctx.fillStyle = gr; ctx.fillRect(0, 0, vw, vh);
      // the far walls: black lava pouring down them, crystals twinkling
      const far = this.depth * 0.12;
      for (const f of this.lavaFalls) {
        // a stream of black lava pouring down the far wall: a dark glow round it, hot edges, bright flecks rushing down it
        const x = Math.round(f.fx * vw), x0 = x - (f.w >> 1), h = Math.min(vh, lake);
        const gl = ctx.createLinearGradient(x0 - 10, 0, x0 + f.w + 10, 0);
        gl.addColorStop(0, 'rgba(160,30,90,0)'); gl.addColorStop(0.5, 'rgba(160,30,90,0.16)'); gl.addColorStop(1, 'rgba(160,30,90,0)');
        ctx.fillStyle = gl; ctx.fillRect(x0 - 10, 0, f.w + 20, h);
        ctx.fillStyle = '#070309'; ctx.fillRect(x0, 0, f.w, h);
        ctx.fillStyle = '#6a1446'; ctx.fillRect(x0, 0, 1, h); ctx.fillRect(x0 + f.w - 1, 0, 1, h);
        ctx.fillStyle = '#2a0820'; ctx.fillRect(x0 + 1, 0, 1, h); ctx.fillRect(x0 + f.w - 2, 0, 1, h);
        ctx.fillStyle = '#ff5aa0';
        for (let y = ((t * 110 - far + f.ph * 20) % 13 + 13) % 13; y < h; y += 13) ctx.fillRect(x0 + 2 + Math.round((Math.sin(y * 0.4 + f.ph) + 1) * ((f.w - 5) / 2)), Math.round(y), 1, 4);
      }
      for (const gl of this.glints) {
        const y = ((gl.y - far) % 400 + 400) % 400;
        if (y > vh || y > lake - 4) continue;
        const a = 0.5 + 0.5 * Math.sin(t * 2 + gl.ph);
        if (a < 0.4) continue;
        ctx.globalAlpha = a; ctx.fillStyle = gl.c; ctx.fillRect(Math.round(gl.x * vw), Math.round(y), 1, 1);
      }
      ctx.globalAlpha = 1;
      // the pillars, far ones first, rushing up past you (they stand in the lake: they stop at its surface)
      for (const p of this.pillars) {
        if (p.s > 1) continue;
        this.drawPillar(ctx, p, vw, Math.min(vh, lake), near);
      }
      // the lake, and the slab over it
      if (lake < vh) ERX.AbyssArt.drawLava(ctx, lake, vh, vw, this.depth * 0.05, t);
      if (slab < vh + 10) this.drawSlab(ctx, vw, vh, slab);
      // dust and ash rushing up past you
      ctx.fillStyle = '#b08aa0';
      for (const s of this.specks) { if (s.y > lake) continue; ctx.globalAlpha = 0.2 + s.sp * 0.2; ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, Math.round(s.len * (this.speed() / 280))); }
      ctx.globalAlpha = 1;
      // the bones, your torch, you
      for (const b of this.bones) this.drawSpun(ctx, b.cv, b.x, b.y, b.ang);
      if (this.torch) this.drawTorch(ctx, this.torch);
      this.drawYou(ctx);
      // the near pillars, whipping past in front of everything
      for (const p of this.pillars) if (p.s > 1) this.drawPillar(ctx, p, vw, Math.min(vh, lake), near);
      // the dark at the edges
      const vg = ctx.createRadialGradient(vw / 2, vh * 0.42, vh * 0.3, vw / 2, vh * 0.42, vw * 0.65);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, vw, vh);
      if (ph === 'fall' && this.pt < 0.45) { ctx.fillStyle = 'rgba(0,0,0,' + (1 - this.pt / 0.45).toFixed(3) + ')'; ctx.fillRect(0, 0, vw, vh); }   // out of the black
      if (ph === 'land') { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, this.pt / (T.land * 0.7)).toFixed(3) + ')'; ctx.fillRect(0, 0, vw, vh); }    // THUD (next: the abyss)
    }

    drawPillar(ctx, p, vw, bottom, near) {
      const w = p.w, x = Math.round(p.fx * vw - w / 2), off = ((this.depth * p.s) % 128 + 128) % 128;
      for (let y = -off; y < bottom; y += 128) {
        const hh = Math.min(128, bottom - y);
        if (hh > 0) ctx.drawImage(p.tile, 0, 0, w, hh, x, Math.round(y), w, hh);
      }
      // lit from below by the lava, more and more
      if (near > 0) {
        const rim = ctx.createLinearGradient(0, bottom - 120, 0, bottom);
        rim.addColorStop(0, 'rgba(200,50,120,0)'); rim.addColorStop(1, C.rgba('#c8327a', 0.45 * near));
        ctx.fillStyle = rim; ctx.fillRect(x + 1, bottom - 120, w - 2, 120);
      }
      // dark crystals growing out of it, coming up past you with it
      for (const c of p.clusters) {
        const y = ((c.y - this.depth * p.s) % 420 + 420) % 420 - 20;
        if (y > bottom) continue;
        ctx.drawImage(c.cv, c.side < 0 ? x - c.cv.width / 2 + 3 : x + w - c.cv.width / 2 - 3, Math.round(y - c.cv.height));
      }
      if (p.s > 1) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, 0, w, bottom); }   // the near ones: dark shapes, out of focus
    }

    /** The slab of rock you're about to land on: black rock, its underside hanging over the lake, six dark lamps on it. */
    drawSlab(ctx, vw, vh, top) {
      const x0 = Math.round(vw * 0.08), x1 = Math.round(vw * 0.92), y = Math.round(top);
      ctx.fillStyle = INK; ctx.fillRect(x0 - 1, y - 1, x1 - x0 + 2, 30);
      ctx.fillStyle = '#2c2440'; ctx.fillRect(x0, y, x1 - x0, 2);
      ctx.fillStyle = '#201a2e'; ctx.fillRect(x0, y + 2, x1 - x0, 12);
      ctx.fillStyle = '#181422'; ctx.fillRect(x0, y + 14, x1 - x0, 14);
      for (let x = x0; x < x1; x += 2) {
        const d = Math.round(8 + 6 * Math.sin(x * 0.05) + 3 * Math.sin(x * 0.31));
        ctx.fillStyle = '#100d18'; ctx.fillRect(x, y + 28, 2, d);
        ctx.fillStyle = INK; ctx.fillRect(x, y + 28 + d, 2, 1);
      }
      for (let i = 0; i < 6; i++) {
        const lx = Math.round(U.lerp(x0 + 24, x1 - 24, i / 5));
        ctx.fillStyle = INK; ctx.fillRect(lx - 3, y - 26, 7, 26);
        ctx.fillStyle = '#2c2440'; ctx.fillRect(lx - 2, y - 25, 5, 25);
        ctx.fillStyle = INK; ctx.fillRect(lx - 5, y - 30, 11, 5);
        ctx.fillStyle = '#1e1830'; ctx.fillRect(lx - 4, y - 29, 9, 3);
      }
    }

    drawSpun(ctx, cv, x, y, ang) {
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.rotate(ang);
      ctx.drawImage(cv, -Math.round(cv.width / 2), -Math.round(cv.height / 2));
      ctx.restore();
    }

    /** Your torch, tumbling down beside you (its flame streaming up). */
    drawTorch(ctx, o) {
      const x = Math.round(o.x), y = Math.round(o.y);
      const gl = ctx.createRadialGradient(x, y, 2, x, y, 46);
      gl.addColorStop(0, 'rgba(255,170,80,0.3)'); gl.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = gl; ctx.fillRect(x - 46, y - 46, 92, 92);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(o.ang);
      ctx.fillStyle = '#140c08'; ctx.fillRect(-1, -6, 3, 12);
      ctx.fillStyle = '#6a4630'; ctx.fillRect(0, -5, 1, 10);
      ctx.fillStyle = '#a07a50'; ctx.fillRect(0, -5, 1, 2);
      ctx.restore();
      const hx = x + Math.round(Math.sin(o.ang) * 6), hy = y - Math.round(Math.cos(o.ang) * 6);
      ERX.Props.drawFlame(ctx, hx, hy + 2, this.t * 1.6, 1);
    }

    drawYou(ctx) {
      const p = this.g.player, S = ERX.SkyFall, t = this.t;
      const j = this.pt < 1.6 && this.phase === 'fall' ? S.tumblePose(t) : S.fallPose(t, this.vx, this.phase !== 'fall');
      const ang = this.pt < 1.6 && this.phase === 'fall' ? t * 5 : U.clamp(this.vx / 300, -0.4, 0.4) + Math.sin(t * 1.7) * 0.05;
      S.drawBody(ctx, p.look, j, this.x, this.py + 11 + Math.sin(t * 2.3) * 1.5, p.facing, ang, 1);
    }
  }

  AbyssFall.T = T;
  ERX.AbyssFall = AbyssFall;
})(window.ERX = window.ERX || {});
