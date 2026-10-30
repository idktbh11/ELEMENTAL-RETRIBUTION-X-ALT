/*
 * THE TRAINING ROOM (a door in the HQ) — a gym full of dummies for trying
 * out your element's abilities. Every dummy shows its damage-per-second.
 *
 *   NORMAL    stands there. Endless HP (resets).
 *   ATTACKS   throws bolts at you. Practise blocking (it breaks after 5).
 *   BLOCKS    blocks hits from the front. Break its guard, or get behind it.
 *   COUNTERS  hit it and it hits back after a beat. Dash or block!
 *   1 HP      one hit and it's down (gets back up).
 *   TANK      2000 HP. Heals to full if you leave it alone.
 *   RUNNER    runs back and forth. Practise aiming.
 *
 * Dummies give no XP or gold (nice try).
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, PB = ERX.PixelBuffer, C = ERX.Color;
  const { Physics } = ERX.GameEngine;
  const { Enemy } = ERX.Enemies;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const c32 = (h) => C.u32(h);
  const TS = 16;
  const { ROCK } = ERX.CaveLevel.TILES;

  const KINDS = {
    normal: { label: 'NORMAL', color: '#c8a070', hp: 400 },
    attacker: { label: 'ATTACKS', color: '#e0503a', hp: 400 },
    blocker: { label: 'BLOCKS', color: '#5a8ad8', hp: 400 },
    counter: { label: 'COUNTERS', color: '#c86aff', hp: 400 },
    onehp: { label: '1 HP', color: '#7ae05a', hp: 1 },
    tank: { label: 'TANK', color: '#8a8aa8', hp: 2000 },
    runner: { label: 'RUNNER', color: '#ffd34d', hp: 400 },
  };

  const cache = new Map();
  function dummySprite(color, state) {
    const key = color + state;
    if (cache.has(key)) return cache.get(key);
    const b = new PB(16, 26);
    const P = (x, y, w, h, col) => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) b.set(x + xx, y + yy, c32(col)); };
    if (state === 'down') {
      P(1, 21, 14, 4, color); P(1, 21, 14, 1, C.shade(color, 0.3)); P(12, 19, 4, 4, '#e8d8a0');
    } else {
      P(7, 18, 2, 7, '#7a5236');             // post
      P(3, 24, 10, 2, '#5a3a22');            // base
      P(3, 8, 10, 11, color);                // body
      P(3, 8, 10, 1, C.shade(color, 0.35));
      P(3, 18, 10, 1, C.shade(color, -0.35));
      P(6, 11, 4, 4, '#ffffff'); P(7, 12, 2, 2, '#e0403a');   // target
      P(4, 1, 8, 7, '#e8d8a0');              // straw head
      P(5, 3, 1, 1, '#120c1a'); P(10, 3, 1, 1, '#120c1a');
      P(6, 6, 4, 1, state === 'hit' ? '#120c1a' : '#b89a60');
      if (state === 'block') { P(12, 7, 3, 14, '#a8b0c0'); P(12, 7, 3, 1, '#ffffff'); }
      if (state === 'windup') { P(0, 9, 3, 3, '#e8d8a0'); P(13, 9, 3, 3, '#e8d8a0'); }
    }
    b.outline(c32('#120c1a'));
    const cv = b.toCanvas();
    cache.set(key, cv);
    return cv;
  }

  class TrainingDummy extends Enemy {
    constructor(game, spawn) {
      super(game, spawn);
      this.kind = spawn.variant || 'normal';
      const K = KINDS[this.kind];
      this.label = K.label;
      this.color = K.color;
      this.w = 12; this.h = 22;
      this.x = spawn.x - this.w / 2;
      this.y = (spawn.y || game.level.floorY) - this.h;
      this.home = spawn.x;
      this.maxHp = this.hp = K.hp;
      this.xp = 0; this.gold = 0;
      this.damage = 8;
      this.knockback = 0;
      this.immovable = this.kind !== 'runner';
      this.facing = -1;
      this.guardMax = 5; this.guard = 5;
      this.atkT = 1.5;
      this.counterT = 0;
      this.strikeT = 0;
      this.downT = 0;
      this.log = [];
      this.total = 0;              // everything ever dealt to it (tests)
      this.lastHit = -99;
      this.hurtSfx = 'hitMetal';
      this.dieSfx = 'pop';
      this.drawOffset = 0;
    }

    get dps() {
      const now = this.t;
      this.log = this.log.filter((l) => now - l.t < 3);
      return Math.round(this.log.reduce((s, l) => s + l.d, 0) / 3);
    }

    hurt(dmg, dir, crit, kb) {
      if (this.down) return;
      // the blocker blocks anything from the front while its guard holds
      if (this.kind === 'blocker' && this.guard > 0 && !this.stunned() && Math.sign(-dir) === this.facing) {
        this.guard--;
        this.flash = 0.5;
        sfx('block', { minGap: 0.05 });
        if (this.guard <= 0) {
          this.game.floatText(this.cx, this.y - 14, 'GUARD BREAK!', '#ff6a4f');
          sfx('shatter');
          this.applyStatus('stagger', 0);
          this.status.stagger.t = 2.5;
          this.guardBackT = 2.6;
        } else this.game.floatText(this.cx, this.y - 6, 'BLOCKED', '#a8b0c0');
        return;
      }
      const before = this.hp;
      super.hurt(dmg, dir, crit, 0);
      const d = Math.max(0, before - Math.max(this.hp, 0));
      this.log.push({ t: this.t, d });
      this.total += d;
      this.lastHit = this.t;
      if (this.kind === 'counter' && this.counterT <= 0 && this.strikeT <= 0) this.counterT = 0.45;
    }

    /** Damage-over-time counts too (DPS meter, and the tank won't heal mid-burn). */
    onStatusDamage(d) { this.log.push({ t: this.t, d }); this.total += d; this.lastHit = this.t; }

    /** Dummies don't die. They reset (or lie down for a sec, if they're the 1 HP one). */
    die() {
      if (this.kind === 'onehp') {
        this.down = true;
        this.downT = 1.2;
        this.status = {};
        sfx('pop');
        this.game.floatText(this.cx, this.y - 10, 'K.O.!', '#7ae05a');
      } else {
        this.hp = this.maxHp;
        this.game.floatText(this.cx, this.y - 16, 'RESET', '#ffd34d');
      }
    }

    update(dt) {
      if (this.down) {
        this.t += dt;
        this.downT -= dt;
        if (this.downT <= 0) { this.down = false; this.hp = this.maxHp; this.flash = 1; }
        return;
      }
      super.update(dt);
    }

    contact() { /* dummies only hurt you on purpose */ }

    think(dt) {
      const p = this.target();
      if (this.kind !== 'runner') this.facing = p.cx < this.cx ? -1 : 1;
      if (this.guardBackT > 0) { this.guardBackT -= dt; if (this.guardBackT <= 0) this.guard = this.guardMax; }
      if (this.kind === 'tank' && this.t - this.lastHit > 4 && this.hp < this.maxHp) { this.hp = this.maxHp; this.game.floatText(this.cx, this.y - 16, 'HEALED', '#7af0a0'); }
      if (this.kind === 'attacker') {
        this.atkT -= dt;
        const real = this.game.player;
        if (this.atkT <= 0 && Math.abs(real.cx - this.cx) < 240) {
          this.atkT = 1.6;
          this.game.addBolt(this.cx + this.facing * 8, this.y + 10, this.facing * 150);
          sfx('bolt', { minGap: 0.1 });
        }
      }
      if (this.kind === 'counter') {
        if (this.counterT > 0) {
          this.counterT -= dt;
          if (this.counterT <= 0) {
            this.strikeT = 0.25;
            sfx('swing');
            const real = this.game.player;
            const inFront = (real.cx - this.cx) * this.facing > 0 && Math.abs(real.cx - this.cx) < 30 && Math.abs(real.feet - (this.y + this.h)) < 24;
            if (inFront && !this.isBlind()) real.takeHit(10, this.cx, this);
          }
        }
        this.strikeT = Math.max(0, this.strikeT - dt);
      }
      if (this.kind === 'runner') {
        if (Math.abs(this.cx - this.home) > 56) this.facing = this.cx > this.home ? -1 : 1;
        this.vx = U.approach(this.vx, this.facing * 70, 400, dt);
      } else {
        this.vx = U.approach(this.vx, 0, 600, dt);
      }
      this.vy = Math.min(this.vy + 900 * dt, 400);
      Physics.move(this.game.level, this, dt);
    }

    sprite() {
      if (this.down) return dummySprite(this.color, 'down');
      if (this.kind === 'blocker' && this.guard > 0 && !this.stunned()) return this._face(dummySprite(this.color, 'block'));
      if (this.counterT > 0) return dummySprite(this.color, 'windup');
      return dummySprite(this.color, this.flash > 0.5 ? 'hit' : 'idle');
    }
    _face(cv) { return this.facing < 0 ? (this._mir || (this._mir = new Map())).get(cv) || this._mirror(cv) : cv; }
    _mirror(cv) { const m = ERX.Sprites.mirror(cv); this._mir.set(cv, m); return m; }

    render(ctx, cam) {
      super.render(ctx, cam);
      const F = ERX.Font;
      const x = Math.round(this.cx) - cam.ix, y = Math.round(this.y) - cam.iy;
      // the counter's warning + strike
      if (this.counterT > 0) F.draw(ctx, '!', x, y - 22, { color: '#ff6a4f', outline: '#120c1a', align: 'center', scale: 2 });
      if (this.strikeT > 0) { ctx.fillStyle = '#ffffff'; for (let i = 0; i < 8; i++) ctx.fillRect(x + this.facing * (10 + i * 2), y + 8 + Math.round(Math.sin(i) * 3), 2, 1); }
      // blocker guard pips
      if (this.kind === 'blocker') for (let i = 0; i < this.guardMax; i++) { ctx.fillStyle = '#120c1a'; ctx.fillRect(x - 10 + i * 4, y - 14, 3, 3); ctx.fillStyle = i < this.guard ? '#a8d0ff' : '#3a3e58'; ctx.fillRect(x - 9 + i * 4, y - 13, 1, 1); }
      // tank: a proper health bar
      if (this.kind === 'tank') {
        const bw = 30, bx = x - bw / 2, by = y - 12;
        ctx.fillStyle = '#120c1a'; ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
        ctx.fillStyle = '#3a1418'; ctx.fillRect(bx, by, bw, 3);
        ctx.fillStyle = '#e0403a'; ctx.fillRect(bx, by, Math.round(bw * Math.max(0, this.hp) / this.maxHp), 3);
        F.draw(ctx, Math.max(0, Math.ceil(this.hp)) + '', x, by - 9, { color: '#ffb0a0', outline: '#120c1a', align: 'center' });
      }
      const d = this.dps;
      if (d > 0) F.draw(ctx, 'DPS ' + d, x, y + this.h + 4, { color: '#ffd34d', outline: '#120c1a', align: 'center' });
    }
  }
  ERX.Enemies.TYPES.dummy = TrainingDummy;

  // ============================================================ THE ROOM
  const SPOTS = [['normal', 14], ['attacker', 23], ['blocker', 32], ['counter', 41], ['onehp', 50], ['tank', 58], ['runner', 66]];

  class TrainingLevel extends ERX.CaveLevel {
    configure() { this.W = 74; this.H = 18; this.pal = ERX.HqLevel.prototype.pal || {}; this.sections = []; this.id = 'training'; }
    build() {
      this.tiles.fill(ROCK);
      this.air(2, this.W - 2, 4, 15);
      this.floorY = 15 * TS;
      this.spawn = { x: 7 * TS, y: this.floorY };
      this.exit = { x: 4 * TS + 8, y: this.floorY };
      this.checkpoints = [this.spawn];
      this.enemySpawns = SPOTS.map(([variant, tx]) => ({ type: 'dummy', variant, x: tx * TS + 8, y: this.floorY }));
      this.decor = []; this.torches = []; this.braziers = []; this.signs = []; this.npcs = [];
      this.lights = [];
      for (let lx = 8; lx < this.W - 2; lx += 10) this.lights.push({ x: lx * TS + 8, y: 4 * TS + 10, r: 100, color: '#ffe8c0', flicker: false });
      this.chalk = [
        { x: 3 * TS, y: 10 * TS, text: 'ABILITIES: {ability1} {ability2} {ability3} {ability4} {ability5}' },
        { x: 3 * TS, y: 10 * TS + 10, text: 'ULTIMATE: {ultimate}  (fill the meter first)' },
      ];
    }
    darknessAt() { return 0.12; }
    renderBackground() { return ERX.makeCanvas(16, 16); }
    renderTiles() { return ERX.HqLevel.prototype.renderTiles.call(this); }
    renderBackWall() {
      const cv = ERX.makeCanvas(this.pw, this.ph), ctx = cv.getContext('2d'), F = ERX.Font;
      const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
      const top = 4 * TS, fl = this.floorY;
      // padded gym walls
      R(2 * TS, top, (this.W - 4) * TS, fl - top, '#2c2a40');
      for (let x = 2 * TS; x < (this.W - 2) * TS; x += 24) { R(x, top, 1, fl - top, '#22203a'); R(x + 1, top, 1, fl - top, '#383654'); }
      R(2 * TS, fl - 30, (this.W - 4) * TS, 30, '#3a2030');
      for (let x = 2 * TS; x < (this.W - 2) * TS; x += 16) R(x, fl - 30, 8, 30, '#4a2840');
      R(2 * TS, fl - 31, (this.W - 4) * TS, 2, '#c83a3a');
      F.draw(ctx, 'TRAINING ROOM', this.pw / 2, top + 8, { scale: 2, color: '#ff6a4f', outline: '#3a0a0a', align: 'center' });
      F.draw(ctx, 'HIT STUFF. LEARN STUFF.', this.pw / 2, top + 26, { color: '#ffd8c0', align: 'center' });
      // a label over every dummy
      for (const [variant, tx] of SPOTS) {
        const K = KINDS[variant], x = tx * TS + 8;
        R(x - 22, top + 50, 44, 12, '#120c1a'); R(x - 21, top + 51, 42, 10, K.color);
        F.draw(ctx, K.label, x, top + 53, { color: '#120c1a', align: 'center' });
        R(x - 1, top + 62, 2, 18, '#5e6478');
      }
      // exit
      const dx = 4 * TS + 8;
      R(dx - 13, fl - 46, 26, 46, '#120c1a'); R(dx - 11, fl - 44, 22, 44, '#7a5236'); R(dx - 9, fl - 42, 18, 40, '#5a3a22');
      F.draw(ctx, 'HQ', dx, fl - 56, { color: '#7af0a0', align: 'center' });
      return cv;
    }
  }

  ERX.TrainingLevel = TrainingLevel;
  ERX.Training = { KINDS };
})(window.ERX = window.ERX || {});
