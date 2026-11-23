/*
 * THE LIFT — the way out of the abyss (the big red button in the lift room: level-abyss.js,
 * story-world.js liftGo). A construction lift. Not finished. Obviously.
 *
 *   climb    it goes up. Steady. Humming. The depth counter ticks down.
 *   faster   ...it goes up faster. Then faster than that: the alarm goes, sparks scream off the
 *            rails, the cage rattles, the walls blur (black glass, purple rock, earth, roots...)
 *   blast    MUCH faster. Light pours down from the top of the shaft... and it doesn't stop at
 *            the top. BOOM. White. You're in the sky (js/game/world-fall.js, the 'village' fall).
 *
 *   g.liftRide = new ERX.LiftRide(g)    update(dt), render(ctx, W, H) (the whole screen), onDone(g)
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, C = ERX.Color, PB = ERX.PixelBuffer;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const T = { climb: 2.0, faster: 2.6, blast: 1.6 };
  const TOTAL = T.climb + T.faster + T.blast;
  const DEPTH = 4213;                // metres to the surface (the counter on the cage says so)
  const INK = '#120c18';
  // what the shaft's cut through, from the bottom up
  const STRATA = [
    { rock: ['#2c2440', '#201a2e', '#181422', '#100d18'], fleck: '#9a6aff' },   // the abyss: black glass, purple glints
    { rock: ['#3a3446', '#2c2836', '#221e2a', '#18161e'], fleck: '#6a9aff' },   // deep rock, blue crystals
    { rock: ['#6a4a34', '#5a3e2c', '#4a3224', '#38261c'], fleck: '#8a6a4a' },   // earth, stones, roots
    { rock: ['#8a7a6e', '#746658', '#5e5248', '#4a4038'], fleck: '#c8b8a0' },   // near the top: pale stone
  ];

  /** A strip of rock wall that tiles top to bottom (one per stratum). */
  function wallStrip(si, w, h) {
    const S = STRATA[si], b = new PB(w, h), n = new U.Noise(0x5aa7 + si * 17), K = (c) => C.u32(c);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = n.n2(x * 0.11, (y % h) * 0.11) * 0.7 + n.n2(x * 0.31, y * 0.31) * 0.3, block = Math.floor(v * 4.2);
      let col = S.rock[U.clamp(block, 0, 3)];
      if (Math.sin(y * 0.21 + n.n1(x * 0.07) * 4) > 0.93) col = S.rock[3];        // seams
      if (n.n2(x * 0.6, y * 0.6) > 0.93 && ERX.bayer(x, y) < 0.5) col = S.fleck;  // the odd fleck: crystal, stone
      if (si === 2 && n.n2(x * 0.05, y * 0.45) > 0.8) col = '#3a2418';             // roots
      b.set(x, y, K(col));
    }
    // make the seam between the top and bottom invisible: blend the last rows into the first
    for (let y = h - 6; y < h; y++) for (let x = 0; x < w; x++) if (ERX.bayer(x, y) < (y - (h - 6)) / 6) b.set(x, y, b.get(x, y - (h - 6)));
    return b.toCanvas();
  }

  class LiftRide {
    constructor(g) {
      this.g = g;
      this.t = 0; this.pt = 0; this.phase = 'climb';
      this.v = 120; this.scroll = 0; this.shakeK = 0.4;
      this.sparks = []; this.hum = 0; this.rattle = 0; this.alarm = 0; this.white = 0;
      this.strips = null;
      this.look = g.player.look || g.character.look;
      sfx('liftHum');
    }

    get depth() { return Math.max(0, Math.round(DEPTH * (1 - Math.pow(Math.min(1, this.t / (TOTAL - 0.35)), 2.3)))); }

    update(dt) {
      this.t += dt; this.pt += dt;
      if (this.phase === 'climb' && this.pt >= T.climb) { this.phase = 'faster'; this.pt = 0; sfx('liftLurch'); this.shakeK = 2; }
      else if (this.phase === 'faster' && this.pt >= T.faster) { this.phase = 'blast'; this.pt = 0; sfx('liftRoar'); }
      else if (this.phase === 'blast' && this.pt >= T.blast && !this.done) { this.done = true; sfx('liftBlast'); ERX.FX.shake(8, 0.6); if (this.onDone) this.onDone(this.g); return; }
      // speed: steady, then building, then absurd
      const target = this.phase === 'climb' ? 170 : this.phase === 'faster' ? U.lerp(260, 1100, Math.pow(this.pt / T.faster, 1.6)) : U.lerp(1100, 3200, this.pt / T.blast);
      this.v = U.approach(this.v, target, 3, dt);
      this.scroll += this.v * dt;
      this.shakeK = this.phase === 'climb' ? 0.4 : this.phase === 'faster' ? 0.8 + 2.4 * (this.pt / T.faster) : 3.2 + 4 * (this.pt / T.blast);
      this.white = this.phase === 'blast' ? Math.pow(this.pt / T.blast, 2.2) : 0;
      // the sounds of a lift going very, very wrong
      this.hum -= dt;
      if (this.hum <= 0) { this.hum = this.phase === 'climb' ? 0.55 : 0.3; sfx(this.phase === 'climb' ? 'liftHum' : 'liftRattle', { minGap: 0.1 }); }
      if (this.phase !== 'climb') {
        this.alarm -= dt;
        if (this.alarm <= 0) { this.alarm = 0.62; sfx('liftAlarm'); }
        // sparks off the rails
        const rate = this.phase === 'blast' ? 90 : 20 + 50 * (this.pt / T.faster);
        if (Math.random() < dt * rate * 0.1) sfx('liftSpark', { minGap: 0.07 });
        for (let i = 0; i < rate * dt; i++) { const side = Math.random() < 0.5 ? -1 : 1; this.sparks.push({ side, x: 0, y: 0, vx: side * U.lerp(40, 160, Math.random()), vy: U.lerp(60, 260, Math.random()), t: 0, life: U.lerp(0.2, 0.5, Math.random()) }); }
      }
      for (const s of this.sparks) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 300 * dt; }
      this.sparks = this.sparks.filter((s) => s.t < s.life);
    }

    render(ctx, W, H) {
      if (!this.strips) this.strips = STRATA.map((_, i) => wallStrip(i, 96, 192));
      const t = this.t, cx = Math.round(W / 2), shaftW = 136, wallW = Math.round(W / 2 - shaftW / 2);
      const sh = this.shakeK, jx = Math.round((Math.random() - 0.5) * 2 * sh), jy = Math.round((Math.random() - 0.5) * 2 * sh);
      ctx.save();
      ctx.fillStyle = '#07050c'; ctx.fillRect(0, 0, W, H);
      ctx.translate(jx, jy);
      // ---- the rock walls, scrolling down past you (and changing as you rise through the strata)
      const prog = 1 - this.depth / DEPTH, sf = prog * (STRATA.length - 1), si = Math.min(STRATA.length - 2, Math.floor(sf)), mixK = U.clamp(sf - si, 0, 1);
      for (const side of [0, 1]) {
        const x0 = side ? W - wallW : 0;
        ctx.save(); ctx.beginPath(); ctx.rect(x0 - 4, -10, wallW + 8, H + 20); ctx.clip();
        for (const [k, idx] of [[1, si], [mixK, si + 1]]) {
          if (k <= 0.01) continue;
          const s = this.strips[idx], sh2 = s.height, off = this.scroll % sh2;
          ctx.globalAlpha = k;
          for (let y = -sh2 + off; y < H + sh2; y += sh2) for (let x = x0 - (side ? 0 : 0); x < x0 + wallW; x += s.width) ctx.drawImage(s, x + side * 37, Math.round(y));
        }
        ctx.globalAlpha = 1;
        // the shaft's edge
        ctx.fillStyle = INK; ctx.fillRect(side ? x0 : x0 + wallW - 2, -10, 2, H + 20);
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(side ? x0 + 2 : x0 + wallW - 3, -10, 1, H + 20);
        ctx.restore();
      }
      // ---- inside the shaft: the back, the rails, girders and work lights whizzing past
      ctx.fillStyle = '#0c0a12'; ctx.fillRect(wallW, -10, shaftW, H + 20);
      const railX = [cx - 50, cx + 48];
      for (const rx of railX) {
        ctx.fillStyle = '#3a3a48'; ctx.fillRect(rx, -10, 3, H + 20); ctx.fillStyle = '#8a8a9a'; ctx.fillRect(rx, -10, 1, H + 20);
        ctx.fillStyle = '#c8c8d4'; for (let y = (this.scroll * 1) % 14 - 14; y < H; y += 14) ctx.fillRect(rx + 1, Math.round(y), 1, 1);
      }
      for (let y = (this.scroll % 150) - 150; y < H + 10; y += 150) {
        const gy = Math.round(y);
        ctx.fillStyle = INK; ctx.fillRect(wallW, gy - 1, shaftW, 6);
        for (let x = wallW; x < wallW + shaftW; x++) { ctx.fillStyle = Math.floor((x + gy) / 5) % 2 ? '#d8b020' : '#2a2a30'; ctx.fillRect(x, gy, 1, 4); }
      }
      for (let y = ((this.scroll + 75) % 260) - 260; y < H + 20; y += 260) {
        for (const lx of [wallW + 8, W - wallW - 12]) {
          const ly = Math.round(y);
          const gr = ctx.createRadialGradient(lx + 2, ly + 3, 1, lx + 2, ly + 3, 34);
          gr.addColorStop(0, 'rgba(255,216,120,0.45)'); gr.addColorStop(1, 'rgba(255,216,120,0)');
          ctx.fillStyle = gr; ctx.fillRect(lx - 32, ly - 30, 68, 68);
          ctx.fillStyle = INK; ctx.fillRect(lx - 1, ly - 1, 6, 8); ctx.fillStyle = '#ffe8a0'; ctx.fillRect(lx, ly, 4, 6); ctx.fillStyle = '#ffffff'; ctx.fillRect(lx + 1, ly + 1, 2, 3);
        }
      }
      // ---- speed: streaks of light, more and longer the faster you go
      const sp = U.clamp((this.v - 200) / 1600, 0, 1);
      if (sp > 0) {
        for (let i = 0; i < 34; i++) {
          const x = (i * 61 + 17) % W, len = 10 + sp * 90 + (i % 5) * 8, y = ((i * 97 + this.scroll * (0.8 + (i % 3) * 0.3)) % (H + len)) - len;
          ctx.globalAlpha = sp * (0.18 + (i % 4) * 0.08); ctx.fillStyle = i % 3 ? '#ffffff' : '#ffe8b0'; ctx.fillRect(x, Math.round(y), 1, Math.round(len));
        }
        ctx.globalAlpha = 1;
      }
      // ---- the cage, and you in it
      const fy = Math.round(H * 0.7), cw = 74, ch = 52, x0 = cx - cw / 2, y0 = fy - ch;
      ctx.fillStyle = '#3a3a48'; ctx.fillRect(cx - 12, -10, 1, y0 + 10); ctx.fillRect(cx + 11, -10, 1, y0 + 10);   // the cables
      ctx.fillStyle = 'rgba(40,40,56,0.85)'; ctx.fillRect(x0 + 3, y0 + 3, cw - 6, ch - 6);
      ctx.fillStyle = 'rgba(138,138,152,0.35)'; for (let x = x0 + 6; x < x0 + cw - 4; x += 6) ctx.fillRect(x, y0 + 4, 1, ch - 8); for (let y = y0 + 6; y < fy - 3; y += 6) ctx.fillRect(x0 + 4, y, cw - 8, 1);
      const PS = ERX.PlayerSide, pose = this.phase === 'climb' ? 'idle' : this.phase === 'faster' && this.pt < T.faster * 0.5 ? 'hurt' : 'crouch';
      PS.draw(ctx, PS.frame(this.look, pose, Math.floor(t * 1.6) % 2, -1), cx - 6, fy - 3, -1);
      // the frame: hazard-yellow posts, a top bar, the floor with its stripes; the gate's bars in front of you
      ctx.fillStyle = INK; ctx.fillRect(x0 - 1, y0 - 1, cw + 2, 5); ctx.fillRect(x0 - 1, fy - 3, cw + 2, 6); ctx.fillRect(x0 - 1, y0, 5, ch); ctx.fillRect(x0 + cw - 4, y0, 5, ch);
      ctx.fillStyle = '#d8b020'; ctx.fillRect(x0, y0, cw, 3); ctx.fillRect(x0, y0, 3, ch); ctx.fillRect(x0 + cw - 3, y0, 3, ch);
      for (let x = x0; x < x0 + cw; x++) { ctx.fillStyle = Math.floor((x - x0) / 4) % 2 ? '#d8b020' : '#2a2a30'; ctx.fillRect(x, fy - 2, 1, 4); }
      ctx.fillStyle = 'rgba(200,200,214,0.5)'; for (let x = x0 + 9; x < x0 + 30; x += 5) ctx.fillRect(x, y0 + 3, 1, ch - 6);
      // the control box on the post, its button still lit
      ctx.fillStyle = INK; ctx.fillRect(x0 + cw - 15, y0 + 20, 11, 10); ctx.fillStyle = '#8a8a98'; ctx.fillRect(x0 + cw - 14, y0 + 21, 9, 8);
      ctx.fillStyle = '#e83a2a'; ctx.fillRect(x0 + cw - 12, y0 + 23, 5, 4); ctx.fillStyle = '#ffb0a0'; ctx.fillRect(x0 + cw - 11, y0 + 23, 1, 1);
      // the alarm light on top: spinning red
      if (this.phase !== 'climb') {
        const on = Math.floor(t * 8) % 2 === 0, ax = cx, ay = y0 - 5;
        ctx.fillStyle = INK; ctx.fillRect(ax - 4, ay - 1, 9, 6); ctx.fillStyle = on ? '#ff3a2a' : '#8a1a14'; ctx.fillRect(ax - 3, ay, 7, 4);
        if (on) { const gr = ctx.createRadialGradient(ax, ay + 2, 1, ax, ay + 2, 60); gr.addColorStop(0, 'rgba(255,40,30,0.35)'); gr.addColorStop(1, 'rgba(255,40,30,0)'); ctx.fillStyle = gr; ctx.fillRect(ax - 60, ay - 58, 120, 120); }
      }
      // sparks screaming off the rails
      for (const s of this.sparks) {
        const bx = s.side < 0 ? x0 - 2 : x0 + cw + 1, k = 1 - s.t / s.life;
        ctx.globalAlpha = k; ctx.fillStyle = k > 0.6 ? '#ffffff' : k > 0.3 ? '#ffd060' : '#ff7a2a';
        ctx.fillRect(Math.round(bx + s.x), Math.round(fy - 6 + s.y), 2, 1); ctx.fillRect(Math.round(bx + s.x - s.vx * 0.02), Math.round(fy - 6 + s.y - s.vy * 0.02), 1, 1);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      // ---- over it all: red when the alarm flashes, light pouring down from the top of the shaft, then white
      if (this.phase === 'faster' && Math.floor(t * 8) % 2 === 0) { ctx.fillStyle = 'rgba(255,30,20,' + (0.06 + 0.08 * (this.pt / T.faster)).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
      if (this.phase === 'blast') {
        const k = this.pt / T.blast, gr = ctx.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, 'rgba(255,252,240,' + Math.min(1, 0.4 + k).toFixed(3) + ')'); gr.addColorStop(Math.max(0.05, 0.75 - k * 0.6), 'rgba(255,250,230,0)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      }
      if (this.white > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, this.white).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
      // ---- the depth counter on the cage's panel
      const F = ERX.Font, d = this.depth, txt = d > 0 ? 'DEPTH  -' + d.toLocaleString('en-US') + ' m' : 'SURFACE!!!', danger = this.phase !== 'climb';
      const tw = F.measure(txt) + 12, px = Math.round(W / 2 - tw / 2), py = H - 22;
      ctx.globalAlpha = 1 - Math.min(1, this.white * 1.4);
      ctx.fillStyle = INK; ctx.fillRect(px - 1, py - 1, tw + 2, 15); ctx.fillStyle = '#1e1a26'; ctx.fillRect(px, py, tw, 13);
      F.draw(ctx, txt, Math.round(W / 2), py + 3, { color: danger && Math.floor(t * 6) % 2 ? '#ff6a4a' : '#ffd34d', align: 'center' });
      ctx.globalAlpha = 1;
    }
  }

  LiftRide.T = T;
  LiftRide.DEPTH = DEPTH;
  ERX.LiftRide = LiftRide;
})(window.ERX = window.ERX || {});
