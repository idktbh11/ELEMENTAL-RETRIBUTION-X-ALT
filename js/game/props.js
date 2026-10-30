/*
 * World props and entities: torches, braziers, signs, cave decorations,
 * metal arena gates, the TRAINING DUMMY and its bolts.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, PB = ERX.PixelBuffer, C = ERX.Color;
  const c32 = (h) => C.u32(h);
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const INK = '#120c1a';

  // ------------------------------------------------------ static decor
  /** Pre-render stalactites, mushrooms, crystals, sign posts and sconces. */
  function renderDecor(level) {
    const buf = new PB(level.pw, level.ph);
    const R = ['#8a7e9c', '#6a6080', '#4a4060', '#2e2840'].map(c32);
    const ink = c32(INK);
    for (const d of level.decor) {
      const x = Math.round(d.x), y = Math.round(d.y);
      if (d.kind === 'stalactite') {
        for (let i = 0; i < d.len; i++) {
          const hw = Math.max(0, Math.round((d.w / 2) * (1 - i / d.len)));
          for (let dx = -hw; dx <= hw; dx++) buf.set(x + dx, y + i, dx < 0 ? R[1] : dx === 0 ? R[2] : R[3]);
        }
      } else if (d.kind === 'stalagmite') {
        for (let i = 0; i < d.len; i++) {
          const hw = Math.max(0, Math.round((d.w / 2) * (1 - i / d.len)));
          for (let dx = -hw; dx <= hw; dx++) buf.set(x + dx, y - 1 - i, dx < 0 ? R[0] : dx === 0 ? R[1] : R[2]);
        }
      } else if (d.kind === 'pebbles') {
        buf.ellipse(x, y - 1, 2, 1, R[1]); buf.set(x - 1, y - 2, R[0]);
        buf.ellipse(x + 4, y - 1, 1, 1, R[2]);
      } else if (d.kind === 'mushroom') {
        const s = 2 + d.size;
        buf.rect(x, y - s - 1, 1, s + 1, c32('#d8d0c0'));
        buf.ellipse(x, y - s - 2, s, Math.max(1, s - 1), c32(d.hue));
        buf.hline(x - s + 1, x + s - 1, y - s - 1, c32(C.shade(d.hue, -0.3)));
        buf.set(x - 1, y - s - 3, c32('#ffffff'));
        if (d.size > 0) { buf.rect(x + 4, y - 3, 1, 3, c32('#d8d0c0')); buf.ellipse(x + 4, y - 4, 2, 1, c32(d.hue)); }
      } else if (d.kind === 'crystal') {
        const shard = (sx, h, w) => {
          for (let i = 0; i < h; i++) {
            const hw = Math.round(w * (i < h * 0.7 ? 1 : (h - i) / (h * 0.3)));
            for (let dx = -hw; dx <= hw; dx++) buf.set(sx + dx, y - 1 - i, c32(dx < 0 ? C.shade(d.hue, 0.35) : dx === 0 ? d.hue : C.shade(d.hue, -0.3)));
          }
        };
        shard(x, 9 + d.size * 3, 1); shard(x - 3, 6, 1); shard(x + 3, 5 + d.size, 1);
      }
    }
    for (const d of level.decor) {
      const x = Math.round(d.x), y = Math.round(d.y);
      if (d.kind === 'bigcrystal') {
        const shard = (sx, h, w, lean) => {
          for (let i = 0; i < h; i++) {
            const hw = Math.max(0, Math.round(w * (i < h * 0.75 ? 1 : (h - i) / (h * 0.25))));
            const off = Math.round((i / h) * lean);
            for (let dx = -hw; dx <= hw; dx++) buf.set(sx + dx + off, y - 1 - i, c32(dx < 0 ? C.shade(d.hue, 0.4) : dx === 0 ? C.shade(d.hue, 0.15) : C.shade(d.hue, -0.3)));
          }
        };
        shard(x, 26 + d.size * 4, 3, 0); shard(x - 7, 15, 2, -4); shard(x + 7, 17 + d.size * 2, 2, 4); shard(x + 3, 9, 1, 2);
      } else if (d.kind === 'vine') {
        for (let i = 0; i < d.len; i++) {
          const wob = Math.round(Math.sin(i * 0.5 + x) * 1);
          buf.set(x + wob, y + i, c32(i % 4 === 3 ? d.hue : '#2a7a5a'));
          if (i % 5 === 2) buf.set(x + wob + 1, y + i, c32('#3aa070'));
        }
        buf.set(x, y + d.len, c32(d.hue)); buf.set(x + 1, y + d.len, c32(d.hue));
      } else if (d.kind === 'beam') {
        buf.rect(x, y - d.h, 4, d.h, c32('#7a5236')); buf.rect(x, y - d.h, 1, d.h, c32('#a8784a'));
        buf.rect(x - 10, y - d.h, 24, 3, c32('#7a5236')); buf.rect(x - 10, y - d.h, 24, 1, c32('#a8784a'));
      } else if (d.kind === 'rails') {
        for (let rx = x; rx < d.x1; rx++) {
          buf.set(rx, y - 2, c32('#9aa0b0'));
          if (rx % 6 === 0) buf.rect(rx, y - 1, 3, 1, c32('#6a4630'));
        }
      } else if (d.kind === 'cart') {
        buf.rect(x - 9, y - 12, 18, 9, c32('#6a6e80')); buf.rect(x - 9, y - 12, 18, 1, c32('#9aa0b0'));
        buf.rect(x - 7, y - 14, 14, 3, c32('#8a7e9c')); buf.circle(x - 3, y - 15, 2, c32('#ffd36a')); buf.circle(x + 3, y - 15, 2, c32('#5af0e0'));
        buf.circle(x - 5, y - 3, 2, c32('#3e4254')); buf.circle(x + 5, y - 3, 2, c32('#3e4254'));
      } else if (d.kind === 'crate') {
        buf.rect(x, y - 12, 12, 12, c32('#9a6a44')); buf.rect(x, y - 12, 12, 1, c32('#c08a5a'));
        buf.line(x, y - 12, x + 11, y - 1, c32('#6a4630')); buf.line(x + 11, y - 12, x, y - 1, c32('#6a4630'));
      } else if (d.kind === 'pillar') {
        // carved stone column with a capital and a base
        buf.rect(x - 5, y - d.h, 10, d.h, c32('#625a80'));
        buf.rect(x - 5, y - d.h, 2, d.h, c32('#82789c'));
        buf.rect(x + 3, y - d.h, 2, d.h, c32('#463f62'));
        for (let py = y - d.h + 10; py < y - 8; py += 14) buf.rect(x - 2, py, 1, 8, c32('#463f62'));
        buf.rect(x - 8, y - d.h, 16, 4, c32('#82789c')); buf.rect(x - 8, y - d.h + 3, 16, 1, c32('#463f62'));
        buf.rect(x - 8, y - 5, 16, 5, c32('#82789c')); buf.rect(x - 8, y - 5, 16, 1, c32('#a49ab8'));
      } else if (d.kind === 'vaultdoor') {
        // a huge round sealed door. It is not opening. Not today.
        buf.rect(x - 2, y - 76, 18, 76, c32('#4a4466'));
        buf.circle(x + 6, y - 38, 30, c32('#706890'));
        buf.circle(x + 6, y - 38, 26, c32('#4a4466'));
        buf.circle(x + 6, y - 38, 22, c32('#a098b8'));
        buf.circle(x + 6, y - 38, 8, c32('#4a4466'));
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          buf.line(x + 6 + Math.round(Math.cos(a) * 9), y - 38 + Math.round(Math.sin(a) * 9), x + 6 + Math.round(Math.cos(a) * 20), y - 38 + Math.round(Math.sin(a) * 20), c32('#706890'));
        }
        buf.circle(x + 6, y - 38, 3, c32('#ffd36a'));
      } else if (d.kind === 'runes') {
        // a row of faintly glowing rainbow glyphs
        const cols = ['#ff6a6a', '#ffd36a', '#6aff9a', '#6ac8ff', '#c86aff'];
        for (let rx = x, i = 0; rx < d.x1; rx += 12, i++) {
          const col = c32(cols[i % cols.length]);
          const g = (i * 7919) % 5;
          buf.rect(rx, y, 1, 7, col);
          if (g & 1) buf.rect(rx, y, 5, 1, col); else buf.rect(rx, y + 6, 5, 1, col);
          if (g & 2) buf.rect(rx + 4, y + 2, 1, 5, col); else buf.rect(rx + 2, y + 3, 3, 1, col);
          if (g === 4) buf.set(rx + 2, y - 2, col);
        }
      } else if (d.kind === 'shaft') {
        for (let sy = d.y0; sy < d.y1; sy += 24) { buf.rect(x, sy, d.x1 - x, 2, c32('#5e6478')); buf.rect(x, sy, d.x1 - x, 1, c32('#848ca0')); }
        buf.rect(x, d.y0, 3, d.y1 - d.y0, c32('#5e6478')); buf.rect(d.x1 - 3, d.y0, 3, d.y1 - d.y0, c32('#5e6478'));
        buf.rect(x + 1, d.y0, 1, d.y1 - d.y0, c32('#848ca0'));
      }
    }
    // torch sconces (or hanging lanterns)
    for (const t of level.torches) {
      if (t.lantern) {
        buf.rect(Math.round(t.x), Math.round(t.y) - 8, 1, 6, c32('#5e6478'));
        buf.rect(Math.round(t.x) - 3, Math.round(t.y) - 3, 7, 9, c32('#3e4254'));
        buf.rect(Math.round(t.x) - 2, Math.round(t.y) - 2, 5, 7, c32('#ffd88a'));
        continue;
      }
      buf.rect(Math.round(t.x) - 1, Math.round(t.y) + 2, 3, 7, c32('#4a3a30'));
      buf.rect(Math.round(t.x) - 2, Math.round(t.y) + 1, 5, 2, c32('#6a5040'));
    }
    // brazier stands
    for (const b of level.braziers) {
      const x = Math.round(b.x), y = Math.round(b.y);
      buf.rect(x - 1, y - 12, 3, 12, c32('#5e6478'));
      buf.rect(x - 4, y - 2, 9, 2, c32('#3e4254'));
      buf.rect(x - 6, y - 16, 13, 4, c32('#848ca0'));
      buf.rect(x - 5, y - 13, 11, 1, c32('#3e4254'));
    }
    // sign posts
    for (const s of level.signs) {
      const x = Math.round(s.x), y = Math.round(s.y);
      buf.rect(x - 1, y - 10, 2, 10, c32('#6a4630'));
      buf.rect(x - 7, y - 18, 14, 9, c32('#a8784a'));
      buf.hline(x - 7, x + 6, y - 18, c32('#c8985a'));
      buf.hline(x - 7, x + 6, y - 14, c32('#7a5236'));
      for (let i = 0; i < 3; i++) buf.hline(x - 5, x + 2 - i * 2, y - 16 + i * 2, c32('#4a3022'));
    }
    buf.outline(ink);
    return buf.toCanvas();
  }

  function drawFlame(ctx, x, y, t, size = 1) {
    const f = Math.floor(t * 10) % 3;
    const h = Math.round((5 + f) * size), w = Math.round(2 * size);
    ctx.fillStyle = '#ff6a2a';
    ctx.fillRect(x - w, y - h + 2, w * 2 + 1, h - 1);
    ctx.fillStyle = '#ffb040';
    ctx.fillRect(x - w + 1, y - h + 3 + (f === 1 ? 1 : 0), w * 2 - 1, h - 3);
    ctx.fillStyle = '#fff2a0';
    ctx.fillRect(x, y - h + 4, 1, Math.max(1, h - 5));
    ctx.fillStyle = '#ff6a2a';
    ctx.fillRect(x + (f - 1), y - h, 1, 2);
  }

  // -------------------------------------------------------------- gates
  /** Metal fence that rises out of the floor to seal a doorway. */
  class Gate {
    constructor(level, def) {
      this.level = level;
      this.tx = def.tx; this.ty0 = def.ty0; this.ty1 = def.ty1;
      this.amount = 0;   // 0 = open (in the floor), 1 = closed
      this.target = 0;
    }
    close() { this.target = 1; }
    open() { this.target = 0; this._setSolid(false); }
    snap(closed) { this.amount = this.target = closed ? 1 : 0; this._setSolid(closed); }
    _setSolid(on) {
      for (let ty = this.ty0; ty <= this.ty1; ty++) {
        const k = this.tx + ',' + ty;
        if (on) this.level.dynamicSolid.add(k); else this.level.dynamicSolid.delete(k);
      }
    }
    update(dt) {
      if (this.amount === this.target) return;
      const was = this.amount;
      this.amount = this.target > this.amount ? Math.min(1, this.amount + dt * 3.2) : Math.max(0, this.amount - dt * 1.4);
      if (Math.floor(was * 6) !== Math.floor(this.amount * 6)) sfx('gateRattle', { minGap: 0.05 });
      if (this.amount === 1 && was < 1) { this._setSolid(true); sfx('gateClang'); ERX.FX.shake(3, 0.25); }
      if (this.amount === 0 && was > 0) sfx('gateClang');
    }
    render(ctx, cam) {
      if (this.amount <= 0) return;
      const TS = this.level.TS;
      const x = this.tx * TS - cam.ix, bottom = (this.ty1 + 1) * TS - cam.iy;
      const fullH = (this.ty1 - this.ty0 + 1) * TS;
      const h = Math.round(fullH * this.amount);
      const top = bottom - h;
      for (let i = 0; i < 4; i++) {
        const bx = x + 1 + i * 4;
        ctx.fillStyle = INK; ctx.fillRect(bx - 1, top, 3, h);
        ctx.fillStyle = '#9aa2b4'; ctx.fillRect(bx, top + 1, 1, h - 1);
        ctx.fillStyle = '#5e6478'; ctx.fillRect(bx + 1, top + 1, 1, h - 1);
        // spikes
        ctx.fillStyle = INK; ctx.fillRect(bx - 1, top - 2, 3, 2);
        ctx.fillStyle = '#c8d0e0'; ctx.fillRect(bx, top - 3, 1, 2);
      }
      for (const fy of [0.18, 0.6]) {
        const yy = top + Math.round(h * fy);
        ctx.fillStyle = INK; ctx.fillRect(x, yy - 1, TS, 4);
        ctx.fillStyle = '#848ca0'; ctx.fillRect(x, yy, TS, 2);
        ctx.fillStyle = '#ffd34d'; ctx.fillRect(x + 3, yy, 1, 1); ctx.fillRect(x + 12, yy, 1, 1);
      }
    }
  }

  // -------------------------------------------------------------- dummy
  function makeDummySprite() {
    const b = new PB(24, 42);
    const M = ['#c8d0e0', '#9aa2b4', '#6a7084', '#454a5c'].map(c32);
    // base plate + pole
    b.rect(5, 39, 14, 3, M[3]); b.rect(6, 38, 12, 1, M[2]);
    b.rect(11, 22, 2, 17, M[2]); b.rect(11, 22, 1, 17, M[1]);
    // arms (crossbar)
    b.rect(1, 17, 22, 3, M[2]); b.rect(1, 17, 22, 1, M[0]);
    b.rect(0, 16, 2, 5, M[3]); b.rect(22, 16, 2, 5, M[3]);
    // body barrel
    b.rect(6, 14, 12, 11, M[1]); b.rect(6, 14, 3, 11, M[0]); b.rect(15, 14, 3, 11, M[2]);
    b.hline(6, 17, 18, M[3]);
    b.set(8, 16, c32('#ffd34d')); b.set(15, 16, c32('#ffd34d')); b.set(8, 22, c32('#ffd34d')); b.set(15, 22, c32('#ffd34d'));
    // target painted on the chest
    b.circle(12, 20, 2, c32('#d83a3a')); b.set(12, 20, c32('#ffffff'));
    // head
    b.circle(12, 7, 6, M[1]);
    b.circle(10, 5, 3, M[0]);
    b.rect(11, 12, 3, 2, M[2]);
    // painted silly face
    b.set(10, 7, c32(INK)); b.set(14, 7, c32(INK));
    b.hline(10, 14, 10, c32(INK)); b.set(9, 9, c32(INK)); b.set(15, 9, c32(INK));
    b.outline(c32(INK));
    return b.toCanvas();
  }

  class Dummy {
    constructor(game, x, groundY) {
      this.game = game;
      this.x = x; this.groundY = groundY;
      this.sprite = makeDummySprite();
      this.angle = 0; this.angVel = 0;
      this.flash = 0;
      this.hits = 0;
      this.spawnT = 0;
      this.shooting = false;
      this.shootT = 1.2;
      this.bounceY = 0;
    }
    get box() { return { x: this.x - 10, y: this.groundY - 40, w: 20, h: 40 }; }
    hit(dmg, dir, crit) {
      this.angVel += dir * (crit ? 7 : 4.5);
      this.flash = 1;
      this.hits++;
      sfx('hitMetal');
      ERX.FX.shake(crit ? 2 : 1, 0.12);
      this.game.floatText(this.x + U.lerp(-4, 4, Math.random()), this.groundY - 44, (crit ? '-' + dmg + '!' : '-' + dmg), crit ? '#ffd34d' : '#ffffff');
      this.game.sparks(this.x - dir * 6, this.groundY - 22, 6, dir);
    }
    update(dt) {
      this.spawnT += dt;
      // springy wobble
      this.angVel += -this.angle * 60 * dt - this.angVel * 5 * dt;
      this.angle += this.angVel * dt;
      this.flash = Math.max(0, this.flash - dt * 6);
      if (this.shooting) {
        this.shootT -= dt;
        if (this.shootT <= 0) {
          this.shootT = 1.7;
          const p = this.game.player;
          const dir = p.cx < this.x ? -1 : 1;
          this.game.addBolt(this.x + dir * 12, this.groundY - 20, dir * 115);
          this.angVel -= dir * 2.5;
          sfx('bolt');
        }
      }
    }
    /** Drawn as horizontal slices sheared by the wobble, so it stays pixel-crisp. */
    render(ctx, cam) {
      const s = this.sprite;
      const pop = U.clamp(this.spawnT / 0.25, 0, 1);
      const scaleY = U.ease.outBack(pop);
      const bx = Math.round(this.x - s.width / 2) - cam.ix, by = this.groundY - cam.iy;
      const h = Math.round(s.height * scaleY);
      for (let row = 0; row < h; row++) {
        const srcRow = Math.floor((row / Math.max(1, h)) * s.height);
        const fromBase = h - row;
        const off = Math.round(Math.sin(this.angle) * fromBase * 0.6);
        ctx.drawImage(s, 0, srcRow, s.width, 1, bx + off, by - h + row, s.width, 1);
      }
      if (this.flash > 0) {
        ctx.globalAlpha = this.flash * 0.6;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx + 4, by - h + 2, s.width - 8, h - 6);
        ctx.globalAlpha = 1;
      }
    }
  }

  // --------------------------------------------------------------- bolts
  class Bolt {
    constructor(x, y, vx) {
      this.x = x; this.y = y; this.vx = vx; this.vy = 0;
      this.t = 0; this.dead = false; this.deflected = false;
    }
    update(dt, game) {
      this.t += dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.deflected) this.vy += 500 * dt;
      if (this.t > 6 || game.level.isSolid(Math.floor(this.x / 16), Math.floor(this.y / 16))) { this.dead = true; return; }
      if (this.deflected) return;
      const p = game.player;
      if (!p.intangible && Math.abs(this.x - p.cx) < 7 && this.y > p.y && this.y < p.feet) {
        const r = p.takeHit(6, this.x - this.vx);
        if (r === 'blocked') {
          this.deflected = true;
          this.vx = -this.vx * 0.5;
          this.vy = -200;
          game.sparks(this.x, this.y, 5, Math.sign(this.vx));
          game.onBolt('blocked');
        } else if (r === 'hit') {
          this.dead = true;
          game.onBolt('hit');
        }
      }
    }
    render(ctx, cam) {
      const x = Math.round(this.x) - cam.ix, y = Math.round(this.y) - cam.iy;
      const f = Math.floor(this.t * 14) % 2;
      ctx.fillStyle = INK;
      ctx.fillRect(x - 3, y - 3, 6, 6);
      ctx.fillStyle = '#c8d0e0';
      ctx.fillRect(x - 2, y - 2, 4, 4);
      ctx.fillStyle = '#5e6478';
      if (f) ctx.fillRect(x - 1, y - 1, 2, 2); else { ctx.fillRect(x - 2, y, 4, 1); ctx.fillRect(x, y - 2, 1, 4); }
    }
  }

  // ------------------------------------------------------------- THE ORB
  /** A rainbow colour that cycles over time. */
  function rainbow(t, off) { return 'hsl(' + Math.round(((t * 90 + (off || 0)) % 360 + 360) % 360) + ',100%,62%)'; }

  /**
   * The glowing rainbow orb in its sealing container.
   * state: 'sealed' -> 'shaking' (cracks grow) -> 'free' (container shattered,
   * orb floats) -> 'dash' (flies into the player) -> 'gone'.
   */
  class Orb {
    constructor(game, x, floorY, broken) {
      this.game = game;
      this.baseX = x;
      this.floorY = floorY;
      this.x = x;
      this.y = floorY - 21;
      this.t = 0;
      this.state = broken ? 'gone' : 'sealed';
      this.broken = !!broken;
      this.shake = 0;
      this.crack = 0;
      this.trail = [];
      this.shards = [];
    }
    get glowY() { return this.y; }
    update(dt) {
      this.t += dt;
      if (this.state === 'sealed' || this.state === 'shaking') this.y = this.floorY - 21 + Math.round(Math.sin(this.t * 2) * 1);
      if (this.state === 'free') {
        this.x = U.approach(this.x, this.baseX, 3, dt);
        this.y = U.approach(this.y, this.floorY - 40 + Math.sin(this.t * 3) * 3, 3, dt);
      }
      if (this.state === 'dash') {
        const p = this.game.player;
        const tx = p.cx, ty = p.y + 9;
        const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
        const sp = 620 * dt;
        this.trail.push({ x: this.x, y: this.y, t: 0.35, c: rainbow(this.t, this.trail.length * 25) });
        if (d <= sp + 2) { this.x = tx; this.y = ty; this.state = 'gone'; this.hit = true; }
        else { this.x += (dx / d) * sp; this.y += (dy / d) * sp; }
      }
      for (const tr of this.trail) tr.t -= dt;
      this.trail = this.trail.filter((tr) => tr.t > 0);
      for (const s of this.shards) {
        if (s.rest) continue;
        s.vy += 600 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.spin * dt;
        if (s.y >= this.floorY - 1) { s.y = this.floorY - 1; s.vy *= -0.3; s.vx *= 0.5; if (Math.abs(s.vy) < 20) s.rest = true; }
      }
    }
    /** The glass shatters outward. */
    shatter() {
      this.broken = true;
      this.state = 'free';
      for (let i = 0; i < 26; i++) {
        this.shards.push({ x: this.baseX + U.lerp(-9, 9, Math.random()), y: this.floorY - U.lerp(6, 30, Math.random()), vx: U.lerp(-220, 220, Math.random()), vy: U.lerp(-260, -40, Math.random()), rot: 0, spin: U.lerp(-10, 10, Math.random()), len: 1 + Math.floor(Math.random() * 3) });
      }
    }
    render(c, cam) {
      const ox = -cam.ix, oy = -cam.iy;
      const jx = this.shake > 0 ? Math.round((Math.random() - 0.5) * 2 * this.shake) : 0;
      const jy = this.shake > 0 ? Math.round((Math.random() - 0.5) * this.shake) : 0;
      const bx = Math.round(this.baseX) + ox, fy = Math.round(this.floorY) + oy;
      // pedestal + container caps
      c.fillStyle = INK; c.fillRect(bx - 13, fy - 5, 26, 5);
      c.fillStyle = '#706890'; c.fillRect(bx - 12, fy - 4, 24, 3);
      c.fillStyle = '#a098b8'; c.fillRect(bx - 12, fy - 4, 24, 1);
      const cx0 = bx - 10 + jx, top = fy - 38 + jy;
      c.fillStyle = INK; c.fillRect(cx0 - 1, fy - 9 + jy, 22, 5);
      c.fillStyle = '#c8c0d8'; c.fillRect(cx0, fy - 8 + jy, 20, 3);
      c.fillStyle = INK; c.fillRect(cx0 - 1, top - 1, 22, 5);
      c.fillStyle = '#c8c0d8'; c.fillRect(cx0, top, 20, 3);
      c.fillStyle = '#ffd36a'; c.fillRect(cx0 + 9, top - 3, 2, 2);
      // the orb itself (with trail)
      for (const tr of this.trail) {
        c.globalAlpha = tr.t / 0.35;
        c.fillStyle = tr.c;
        c.fillRect(Math.round(tr.x) + ox - 2, Math.round(tr.y) + oy - 2, 5, 5);
      }
      c.globalAlpha = 1;
      if (this.state !== 'gone') {
        const ox2 = Math.round(this.x) + ox + (this.state === 'free' ? jx : jx), oy2 = Math.round(this.y) + oy + jy;
        const r = 6;
        // dithered glow halo
        c.fillStyle = rainbow(this.t, 180);
        for (let yy = -r - 4; yy <= r + 4; yy++) for (let xx = -r - 4; xx <= r + 4; xx++) {
          const d2 = xx * xx + yy * yy;
          if (d2 > r * r && d2 <= (r + 4) * (r + 4) && ((xx + yy + Math.floor(this.t * 8)) & 1) === 0) c.fillRect(ox2 + xx, oy2 + yy, 1, 1);
        }
        for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
          const d2 = xx * xx + yy * yy;
          if (d2 > r * r) continue;
          c.fillStyle = d2 > (r - 1) * (r - 1) ? INK : rainbow(this.t, (xx + yy) * 14);
          c.fillRect(ox2 + xx, oy2 + yy, 1, 1);
        }
        c.fillStyle = '#ffffff'; c.fillRect(ox2 - 3, oy2 - 3, 2, 2); c.fillRect(ox2 - 1, oy2 - 4, 1, 1);
      }
      // glass (intact, cracking or broken stubs)
      if (!this.broken) {
        c.fillStyle = 'rgba(190,220,255,0.18)'; c.fillRect(cx0 + 1, top + 4, 18, fy - 9 - top - 4 + jy);
        c.fillStyle = 'rgba(220,240,255,0.7)';
        c.fillRect(cx0, top + 4, 1, fy - 13 - top); c.fillRect(cx0 + 19, top + 4, 1, fy - 13 - top);
        c.fillRect(cx0 + 4, top + 6, 1, 8); c.fillRect(cx0 + 5, top + 15, 1, 3);
        if (this.crack > 0) {
          c.fillStyle = '#ffffff';
          const n = Math.ceil(this.crack * 6);
          for (let i = 0; i < n; i++) {
            let px = cx0 + 3 + ((i * 7) % 15), py = top + 6 + ((i * 11) % 22);
            for (let k = 0; k < 6; k++) { c.fillRect(px, py, 1, 1); px += (k + i) % 2 ? 1 : -1; py += 1; }
          }
        }
      } else {
        c.fillStyle = 'rgba(220,240,255,0.8)';
        for (const [sx, h] of [[1, 4], [4, 2], [15, 3], [18, 5]]) { c.fillRect(cx0 + sx, fy - 9 - h + jy, 1, h); c.fillRect(cx0 + sx, top + 4, 1, Math.max(1, h - 1)); }
      }
      c.fillStyle = 'rgba(220,240,255,0.85)';
      for (const s of this.shards) {
        const sx = Math.round(s.x) + ox, sy = Math.round(s.y) + oy;
        if (Math.abs(Math.cos(s.rot)) > 0.5) c.fillRect(sx, sy, s.len, 1); else c.fillRect(sx, sy - s.len + 1, 1, s.len);
      }
    }
  }

  /** An expanding shockwave ring. */
  class Shockwave {
    constructor(x, y, maxR, dur) { this.x = x; this.y = y; this.maxR = maxR; this.dur = dur; this.t = 0; }
    get done() { return this.t >= this.dur; }
    update(dt) { this.t += dt; }
    render(c, cam) {
      const k = Math.min(1, this.t / this.dur);
      const r = Math.round(this.maxR * (1 - Math.pow(1 - k, 3)));
      const n = Math.max(24, Math.round(r * 3));
      c.globalAlpha = 1 - k;
      for (let ring = 0; ring < 3; ring++) {
        const rr = r - ring * 3;
        if (rr <= 0) continue;
        c.fillStyle = ring === 0 ? '#ffffff' : rainbow(this.t * 3, ring * 120);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          c.fillRect(Math.round(this.x + Math.cos(a) * rr) - cam.ix, Math.round(this.y + Math.sin(a) * rr * 0.8) - cam.iy, 2, 2);
        }
      }
      c.globalAlpha = 1;
    }
  }

  ERX.Props = { renderDecor, drawFlame, Gate, Dummy, Bolt, Orb, Shockwave, rainbow };
})(window.ERX = window.ERX || {});
