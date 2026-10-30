/*
 * Basic monsters: SLIMES (hop at you) and BATS (hang from the ceiling, then
 * swoop). Both share one base class with health, knockback, a hit flash,
 * contact damage and a death burst that awards XP.
 *
 * Status effects (burn, chill, blind...) from element attacks live on every
 * enemy: see applyStatus(). think(dt) should aim at this.target(), not the
 * player directly, so blinded / confused monsters get it wrong.
 *
 * Add a new monster: extend Enemy, implement think(dt) + sprite(), register
 * it in ENEMY_TYPES.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, PB = ERX.PixelBuffer, C = ERX.Color;
  const { Physics } = ERX.GameEngine;
  const c32 = (h) => C.u32(h);
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const INK = '#120c16';
  const cache = new Map();
  let UID = 0;

  class Enemy {
    constructor(game, spawn) {
      this.game = game;
      this.spawn = spawn;
      this.zone = spawn.zone || null;
      this.vx = 0; this.vy = 0;
      this.facing = -1;
      this.dead = false;
      this.flash = 0;
      this.hurtT = 0;
      this.t = Math.random() * 10;
      this.uid = ++UID;
      this.status = {};
    }
    get cx() { return this.x + this.w / 2; }
    get cy() { return this.y + this.h / 2; }
    get box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

    hurt(dmg, dir, crit, kb) {
      if (this.dead) return;
      kb = kb === undefined ? 1 : kb;
      dmg = Math.max(1, Math.round(dmg * this.vuln()));
      if (this.status.sleep) delete this.status.sleep;     // a hit wakes you up
      this.hp -= dmg;
      this.flash = 1;
      this.hurtT = 0.25 * Math.min(1, kb + 0.3);
      if (!this.stunned()) {
        this.vx = dir * (crit ? 170 : 120) * this.knockback * kb;
        if (kb > 0.3) this.vy = -120 * this.knockback * Math.min(1, kb);
      }
      sfx('punchHit');
      sfx(this.hurtSfx, { minGap: 0.05 });
      this.game.floatText(this.cx, this.y - 6, (crit ? '-' + dmg + '!' : '-' + dmg), crit ? '#ffd34d' : '#ffffff');
      this.game.sparks(this.cx - dir * 4, this.cy, 4, dir);
      ERX.FX.shake(crit ? 1.5 : 1, 0.1);
      if (this.hp <= 0) this.die();
    }

    die() {
      this.dead = true;
      sfx(this.dieSfx);
      for (let i = 0; i < 14; i++) {
        this.game.fx.add({
          x: this.cx, y: this.cy, vx: U.lerp(-90, 90, Math.random()), vy: U.lerp(-150, -30, Math.random()), ay: 380,
          life: U.lerp(0.4, 0.8, Math.random()), color: Math.random() < 0.6 ? this.color : C.shade(this.color, 0.4), size: Math.random() < 0.4 ? 2 : 1, fadeOut: 0.3,
        });
      }
      this.game.onEnemyKilled(this);
    }

    /** Hurt the player on touch (blinded / stunned monsters miss). */
    contact() {
      const p = this.game.player;
      if (this.hurtT > 0 || p.invulnT > 0 || p.intangible || this.stunned() || this.isBlind()) return;
      if (Physics.rectsOverlap(this.box, { x: p.x, y: p.y, w: p.w, h: p.h })) p.takeHit(this.damage, this.cx, this);
    }

    // ------------------------------------------------------------ status
    _S(id) { return ERX.Abilities.STATUS[id]; }
    stunned() { for (const id in this.status) if (this._S(id).stun) return true; return false; }
    isBlind() { for (const id in this.status) if (this._S(id).blind) return true; return false; }
    isConfused() { for (const id in this.status) if (this._S(id).confuse) return true; return false; }
    slowMult() { let m = 1; for (const id in this.status) if (this._S(id).slow) m = Math.min(m, this._S(id).slow); return m; }
    vuln() { let m = 1; for (const id in this.status) if (this._S(id).vuln) m *= this._S(id).vuln; return m; }

    /** Inflict a status effect. potency 0..3 (skill tree) makes it last longer + hurt more. */
    applyStatus(id, potency) {
      const ST = ERX.Abilities.STATUS;
      if (id === 'random') { const ks = Object.keys(ST).filter((k) => !['timestop', 'freeze', 'encase'].includes(k)); id = ks[Math.floor(Math.random() * ks.length)]; }
      const S = ST[id];
      if (!S || this.dead) return;
      const k = 1 + 0.25 * (potency || 0);
      if (S.launch && !this.immovable) { this.vy = -S.launch; this.onGround = false; }
      const cur = this.status[id];
      if (cur) { cur.t = Math.max(cur.t, S.dur * k); cur.stacks = Math.min(S.stacks || 1, cur.stacks + 1); cur.k = Math.max(cur.k, k); }
      else {
        this.status[id] = { t: S.dur * k, k, stacks: 1, tick: 0.5 };
        this.game.floatText(this.cx, this.y - 16, S.name, S.color);
      }
      if (S.into && this.status[id].stacks >= S.stacks) {
        delete this.status[id];
        this.applyStatus(S.into, potency);
        return;
      }
      if (S.stun) this.vx = 0;
    }

    _updateStatus(dt) {
      for (const id of Object.keys(this.status)) {
        const st = this.status[id], S = this._S(id);
        st.t -= dt;
        if (S.dps) {
          st.tick -= dt;
          if (st.tick <= 0) {
            st.tick = 0.5;
            const d = Math.max(1, Math.round(S.dps * 0.5 * st.k * st.stacks));
            this.hp -= d;
            this.flash = Math.max(this.flash, 0.4);
            this.game.floatText(this.cx + U.lerp(-4, 4, Math.random()), this.y - 4, '-' + d, S.color);
            if (this.onStatusDamage) this.onStatusDamage(d);
            if (S.lifesteal) { const p = this.game.player; p.hp = Math.min(p.maxHp, p.hp + d * S.lifesteal); }
            if (this.hp <= 0) { this.die(); return; }
          }
        }
        if (S.fx && Math.random() < dt * 6 && ERX.Abilities) {
          ERX.Abilities.puff(this.game, this.cx, this.cy, S.fx, { c: S.color, l: C.mix(S.color, '#ffffff', 0.5), d: C.shade(S.color, -0.4), core: '#ffffff', fx: S.fx }, 1, 0.7);
        }
        if (st.t <= 0) delete this.status[id];
      }
    }

    /** Where this monster THINKS you are (blind: guessing, confused: backwards). */
    target() {
      const p = this.game.player;
      if (this.isBlind()) {
        const gx = this.cx + Math.sin(this.t * 0.9 + this.uid) * 70;
        return { cx: gx, y: this.y, feet: this.y + this.h };
      }
      if (this.isConfused()) return { cx: this.cx * 2 - p.cx, y: p.y, feet: p.feet };
      return p;
    }

    update(dt) {
      this.t += dt;
      this.flash = Math.max(0, this.flash - dt * 6);
      this.hurtT = Math.max(0, this.hurtT - dt);
      this._updateStatus(dt);
      if (this.dead) return;
      if (this.stunned()) this.stunnedPhysics(dt);
      else this.think(dt * this.slowMult());
      if (!this.dead) this.contact();
    }

    /** Frozen / asleep / shocked: no thinking, just gravity. */
    stunnedPhysics(dt) {
      if (this.flying && !this.status.launch) return;
      this.vx = U.approach(this.vx, 0, 400, dt);
      this.vy = Math.min(this.vy + 900 * dt, 400);
      Physics.move(this.game.level, this, dt);
    }

    render(ctx, cam) {
      if (this._erased) return;   // erased from existence for a moment (Void's Zero Point)
      const cv = this.sprite();
      const x = Math.round(this.cx - cv.width / 2) - cam.ix, y = Math.round(this.y + this.h - cv.height + this.drawOffset) - cam.iy;
      if (this._glitchUntil > this.game.t) glitchDraw(ctx, cv, x, y);   // glitched out (awakened Chaos)
      else ctx.drawImage(cv, x, y);
      if (this.flash > 0) {
        ctx.globalAlpha = this.flash;
        ctx.drawImage(whiteOf(cv), x, y);
        ctx.globalAlpha = 1;
      }
      // status: tint (frozen...), a row of coloured pips, stars when stunned
      const ids = Object.keys(this.status);
      if (ids.length) {
        for (const id of ids) {
          const S = this._S(id);
          if (S.tint) { ctx.globalAlpha = 0.55; ctx.drawImage(ERX.Sprites.tint(cv, S.tint), x, y); ctx.globalAlpha = 1; }
        }
        ids.slice(0, 5).forEach((id, i) => { ctx.fillStyle = INK; ctx.fillRect(x + i * 4 - 1, y - 9, 4, 4); ctx.fillStyle = this._S(id).color; ctx.fillRect(x + i * 4, y - 8, 2, 2); });
        if (this.stunned()) for (let i = 0; i < 3; i++) { const a = this.t * 6 + i * 2.1; ctx.fillStyle = '#ffd34d'; ctx.fillRect(Math.round(this.cx + Math.cos(a) * 6) - cam.ix, Math.round(this.y - 3 + Math.sin(a) * 2) - cam.iy, 1, 1); }
      }
      // tiny health bar once damaged
      if (this.hp < this.maxHp) {
        const bw = 14, bx = Math.round(this.cx - bw / 2) - cam.ix, by = y - 4;
        ctx.fillStyle = INK; ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
        ctx.fillStyle = '#3a1418'; ctx.fillRect(bx, by, bw, 2);
        ctx.fillStyle = '#e0403a'; ctx.fillRect(bx, by, Math.max(1, Math.round(bw * this.hp / this.maxHp)), 2);
      }
    }
  }

  /** A glitching sprite: colour-split ghosts and slices that jump sideways. */
  const tints = new WeakMap();
  function tintOf(cv, col) { let m = tints.get(cv); if (!m) { m = {}; tints.set(cv, m); } return m[col] || (m[col] = ERX.Sprites.tint(cv, col)); }
  function glitchDraw(ctx, cv, x, y) {
    const j = () => Math.round((Math.random() - 0.5) * 6);
    ctx.save(); ctx.globalAlpha *= 0.7; ctx.drawImage(tintOf(cv, '#ff2adf'), x - 2 + j() / 3, y); ctx.drawImage(tintOf(cv, '#2affff'), x + 2 + j() / 3, y); ctx.restore();
    for (let sy = 0; sy < cv.height; sy += 3) { const h = Math.min(3, cv.height - sy), dx = Math.random() < 0.35 ? j() : 0; ctx.drawImage(Math.random() < 0.08 ? tintOf(cv, '#ffffff') : cv, 0, sy, cv.width, h, x + dx, y + sy, cv.width, h); }
  }

  function whiteOf(cv) {
    let w = cache.get(cv);
    if (!w) { w = ERX.Sprites.tint(cv, '#ffffff'); cache.set(cv, w); }
    return w;
  }

  // =============================================================== SLIME
  function slimeSprite(color, frame, big) {
    const key = 'slime' + color + frame + big;
    if (cache.has(key)) return cache.get(key);
    const s = big ? 1.5 : 1;
    const dims = [[14, 10], [17, 8], [11, 13]][frame];
    const w = Math.round(dims[0] * s), h = Math.round(dims[1] * s);
    const b = new PB(w + 2, h + 3);
    const cx = (w + 2) / 2 - 0.5, base = h + 1;
    const body = c32(color), dark = c32(C.shade(color, -0.35)), light = c32(C.shade(color, 0.4));
    for (let y = 0; y < h; y++) {
      const t = y / (h - 1);
      const hw = (w / 2) * Math.sqrt(Math.max(0, 1 - Math.pow(1 - t, 2.2)));
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
        b.set(x, base - h + y, y > h * 0.7 || x > cx + hw * 0.5 ? dark : body);
      }
    }
    b.set(Math.round(cx - w * 0.25), base - h + 2, light);
    b.set(Math.round(cx - w * 0.25) + 1, base - h + 2, light);
    // eyes (looking slightly to the side) + a tiny frown
    const ey = base - Math.round(h * 0.55);
    for (const side of [-1, 1]) {
      const ex = Math.round(cx + side * 2.5 * s);
      b.set(ex, ey, c32('#ffffff')); b.set(ex, ey + 1, c32(INK));
      b.set(ex + side, ey - 1, c32(INK));
    }
    b.outline(c32(INK));
    const cv = b.toCanvas();
    cache.set(key, cv);
    return cv;
  }

  class Slime extends Enemy {
    constructor(game, spawn) {
      super(game, spawn);
      this.big = spawn.variant === 'big';
      this.w = this.big ? 18 : 12;
      this.h = this.big ? 13 : 9;
      this.x = spawn.x - this.w / 2;
      const gy = game.level._groundBelow(Math.floor(spawn.x / 16), 2) * 16;
      this.y = gy - this.h;
      this.maxHp = this.hp = this.big ? 42 : 18;
      this.damage = this.big ? 12 : 8;
      this.xp = this.big ? 25 : 10;
      this.gold = this.big ? 12 : 3;
      this.knockback = this.big ? 0.6 : 1;
      this.color = this.big ? '#a86aff' : (spawn.color || (game.level.id === 'deep' ? ['#5af0c0', '#ff8ad8', '#7ab8ff'][Math.floor(Math.random() * 3)] : '#6ad85a'));
      this.hopT = 0.5 + Math.random();
      this.squash = 0;
      this.drawOffset = 2;
      this.hurtSfx = 'slimeHurt';
      this.dieSfx = 'slimeDie';
    }
    think(dt) {
      const p = this.target();
      const dx = p.cx - this.cx, dy = p.feet - (this.y + this.h);
      const aggro = Math.abs(dx) < 150 && Math.abs(dy) < 70;
      if (this.onGround) {
        const f = 500 * dt;
        this.vx = Math.abs(this.vx) <= f ? 0 : this.vx - Math.sign(this.vx) * f;
        this.hopT -= dt;
        if (this.hopT <= 0 && this.hurtT <= 0) {
          if (aggro) {
            this.facing = Math.sign(dx) || 1;
            this.vy = this.big ? -190 : -225;
            this.vx = this.facing * (this.big ? 55 : 78);
            this.hopT = U.lerp(0.8, 1.3, Math.random());
          } else {
            this.facing = Math.random() < 0.5 ? -1 : 1;
            this.vy = -110;
            this.vx = this.facing * 30;
            this.hopT = U.lerp(1.8, 3, Math.random());
          }
          sfx('slimeHop', { minGap: 0.05 });
        }
      }
      const was = this.onGround;
      this.vy = Math.min(this.vy + 900 * dt, 400);
      Physics.move(this.game.level, this, dt);
      if (!was && this.onGround) this.squash = 0.15;
      this.squash = Math.max(0, this.squash - dt);
    }
    sprite() {
      let frame = 0;
      if (!this.onGround) frame = 2;
      else if (this.squash > 0 || (this.hopT < 0.15 && this.hurtT <= 0)) frame = 1;
      else if (Math.floor(this.t * 2) % 2) frame = 0;
      return slimeSprite(this.color, frame, this.big);
    }
  }

  // ================================================================= BAT
  const BAT_FRAMES = {
    up: ['..#........#..', '.###......###.', '#####.##.#####', '.###########..', '...#######....', '....#.##.#....'],
    down: ['..............', '......##......', '.....####.....', '###########.##', '.####.##.####.', '..#...##...#..'],
    hang: ['...##..##...', '...######...', '....####....', '...######...', '...######...', '....#..#....', '.....##.....'],
  };
  function batSprite(color, frame) {
    const key = 'bat' + color + frame;
    if (cache.has(key)) return cache.get(key);
    const rows = BAT_FRAMES[frame];
    const b = new PB(rows[0].length + 2, rows.length + 2);
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') b.set(x + 1, y + 1, c32(y < 2 && frame !== 'hang' ? C.shade(color, 0.2) : color)); });
    // red eyes
    const cx = Math.floor(b.w / 2);
    const ey = frame === 'hang' ? 4 : 3;
    b.set(cx - 1, ey, c32('#ff4a4a')); b.set(cx + 1, ey, c32('#ff4a4a'));
    b.outline(c32(INK));
    const cv = b.toCanvas();
    cache.set(key, cv);
    return cv;
  }

  class Bat extends Enemy {
    constructor(game, spawn) {
      super(game, spawn);
      this.w = 10; this.h = 7;
      const L = game.level;
      this.x = spawn.x - this.w / 2;
      // hang under the LOWEST bit of ceiling the bat spans (it straddles two
      // tile columns; using just one could start it inside rock, frozen forever)
      let ceil = 0;
      for (let tx = Math.floor(this.x / 16); tx <= Math.floor((this.x + this.w - 0.001) / 16); tx++) {
        ceil = Math.max(ceil, L._ceilAbove(tx, L._groundBelow(tx, 2) - 1));
      }
      this.homeY = (ceil + 1) * 16;
      this.y = this.homeY;
      this.unstick();
      this.maxHp = this.hp = 11;
      this.damage = 6;
      this.xp = 8;
      this.gold = 4;
      this.knockback = 1;
      this.color = game.level.id === 'deep' ? '#7a4aa8' : '#5a3a7a';
      this.state = 'hang';
      this.modeT = 0;
      this.drawOffset = 0;
      this.flying = true;
      this.hurtSfx = 'batHurt';
      this.dieSfx = 'batDie';
    }
    /** If we're somehow inside rock, hop to the nearest open spot. */
    unstick() {
      const L = this.game.level;
      if (!Physics.overlapsSolid(L, this.x, this.y, this.w, this.h)) return false;
      for (let r = 1; r <= 48; r++) {
        for (const [ox, oy] of [[0, r], [0, -r], [r, 0], [-r, 0], [r, r], [-r, r], [r, -r], [-r, -r]]) {
          if (!Physics.overlapsSolid(L, this.x + ox, this.y + oy, this.w, this.h)) { this.x += ox; this.y += oy; return true; }
        }
      }
      return false;
    }
    think(dt) {
      const p = this.target();
      const dx = p.cx - this.cx, dy = (p.y + 6) - this.cy;
      if (this.state === 'hang') {
        if (Math.abs(dx) < 120 && dy > 0 && dy < 200) { this.state = 'fly'; this.modeT = 0; sfx('batScreech', { minGap: 0.3 }); }
        return;
      }
      this.modeT += dt;
      let tvx, tvy;
      if (this.hurtT > 0) {
        tvx = this.vx; tvy = this.vy;
      } else if (this.state === 'fly') {
        // hover near the player with a lazy figure-eight, then dive
        tvx = U.clamp(dx * 1.4, -55, 55);
        tvy = U.clamp((dy - 34) * 1.6, -50, 50) + Math.sin(this.t * 5) * 30;
        if (this.modeT > 1.8 && Math.abs(dx) < 90) { this.state = 'dive'; this.modeT = 0; }
      } else if (this.state === 'dive') {
        const d = Math.hypot(dx, dy) || 1;
        tvx = (dx / d) * 120; tvy = (dy / d) * 120;
        if (this.modeT > 0.6) { this.state = 'retreat'; this.modeT = 0; }
      } else {
        tvx = -Math.sign(dx) * 40; tvy = -70;
        if (this.modeT > 0.8) { this.state = 'fly'; this.modeT = 0; }
      }
      this.vx = U.approach(this.vx, tvx, 5, dt);
      this.vy = U.approach(this.vy, tvy, 5, dt);
      if (Math.abs(this.vx) > 5) this.facing = Math.sign(this.vx);
      // fly, but never into rock
      const L = this.game.level;
      if (this.unstick()) { this.vx = 0; this.vy = 0; }
      const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
      if (!Physics.overlapsSolid(L, nx, this.y, this.w, this.h)) this.x = nx; else this.vx = -this.vx * 0.3;
      if (!Physics.overlapsSolid(L, this.x, ny, this.w, this.h)) this.y = ny; else this.vy = -this.vy * 0.3;
      if (Math.floor(this.t * 6) !== Math.floor((this.t - dt) * 6) && Math.floor(this.t * 6) % 2 === 0) sfx('batFlap', { minGap: 0.25 });
    }
    sprite() {
      if (this.state === 'hang') return batSprite(this.color, 'hang');
      return batSprite(this.color, Math.floor(this.t * 12) % 2 ? 'up' : 'down');
    }
  }

  const ENEMY_TYPES = { slime: Slime, bat: Bat };
  ERX.Enemies = {
    Enemy, Slime, Bat, TYPES: ENEMY_TYPES,
    create(game, spawn) {
      const T = ENEMY_TYPES[spawn.type];
      if (!T) return null;
      const e = new T(game, spawn);
      // carrying Chaos? The monsters push back harder (js/game/chaos-world.js)
      const d = ERX.ChaosWorld && spawn.type !== 'dummy' ? ERX.ChaosWorld.difficulty(game) : null;
      if (d && d.hp !== 1) { e.maxHp = Math.round(e.maxHp * d.hp); e.hp = e.maxHp; if (e.damage) e.damage = Math.round(e.damage * d.damage); }
      return e;
    },
  };
})(window.ERX = window.ERX || {});
