/*
 * Basic monsters: SLIMES (hop at you), BATS (hang from the ceiling, then
 * swoop), GOBLINS (club goblins wind up and swing; throwers hurl rocks; mages
 * fire mana bolts and drop mana bombs) and SPEWERS (rooted plants that lob
 * seeds). They share one base class with health, knockback,
 * a hit flash, contact damage and a death burst that awards XP. Anything a
 * monster throws is a Projectile (see below).
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
      // centred on the body, unless the sprite names the pixel between its feet (anchorX, drawn facing right)
      const ax = this.anchorX === undefined ? cv.width / 2 : this.facing < 0 ? cv.width - 1 - this.anchorX : this.anchorX;
      const x = Math.round(this.cx - ax) - cam.ix, y = Math.round(this.y + this.h - cv.height + this.drawOffset) - cam.iy;
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

  // ================================================================= GOBLIN
  // A hunched little brute with a spiked club (the art: js/render/goblin-sprite.js).
  // It wanders about; when it spots you it hops and cackles, stomps over,
  // winds the club back (your cue to back off, block or dash) and swings.
  const GOB = {
    walk: 46, wander: 20,              // px/s
    see: [150, 70],                    // spots you inside this box (px either side, up/down)
    forget: 1.6,                       // gives up after losing sight of you this long (s)
    reach: 22, reachY: 18,             // starts a swing when you're this close (centre to centre)
    close: 14,                         // stops walking this close (just short of bumping into you)
    clubReach: 18,                     // how far in front the club hits
    alert: 0.45, windup: 0.42, swing: 0.14, recover: 0.4, cooldown: 0.8,
    stagger: 0.5,                      // after you interrupt a wind-up, it can't swing again for this long
    lunge: 105,                        // the step forward on the swing (px/s)
  };
  /** Move v toward target by at most step (linear, unlike U.approach). */
  const toward = (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));

  class Goblin extends Enemy {
    constructor(game, spawn) {
      super(game, spawn);
      this.w = 12;
      this.h = 22;
      this.x = spawn.x - this.w / 2;
      const gy = game.level._groundBelow(Math.floor(spawn.x / 16), 2) * 16;
      this.y = gy - this.h;
      this.maxHp = this.hp = 20;
      this.damage = 6;
      this.xp = 12;
      this.gold = 4;
      this.knockback = 1;
      this.kind = 'club';                        // which goblin it is (the art: club | thrower | mage)
      this.skin = spawn.color || ERX.GoblinSprite.SKIN;
      this.color = this.skin;                    // the death burst
      this.anchorX = ERX.GoblinSprite.ANCHOR.x;  // drawn from the feet, so turning round doesn't jump a pixel
      this.drawOffset = 1;
      this.hurtSfx = 'goblinHurt';
      this.dieSfx = 'goblinDie';
      this.state = 'wander';                     // wander | alert | chase, then each kind's own attack states
      this.stateT = 0;
      this.facing = Math.random() < 0.5 ? -1 : 1;
      this.wanderWalk = true;
      this.wanderT = U.lerp(0.6, 1.6, Math.random());
      this.lostT = 0;
      this.cooldown = 0;
      this.stride = 0;                           // the walk cycle, driven by distance covered (no moonwalking)
      this.swingHit = false;
      this.homeX = this.cx;                      // where it lives: the ones that back away never stray far from here
    }

    setState(s) { this.state = s; this.stateT = 0; }

    think(dt) {
      const p = this.target();
      const dx = p.cx - this.cx, dy = p.feet - (this.y + this.h);
      const sees = Math.abs(dx) < GOB.see[0] && Math.abs(dy) < GOB.see[1];
      this.stateT += dt;
      this.cooldown = Math.max(0, this.cooldown - dt);
      this.tick(dt);
      let want = 0;                              // the speed it's trying to walk at
      if (this.hurtT > 0) {
        // knocked about: whatever it was doing is cancelled (a hit breaks a wind-up),
        // and it needs a moment to gather itself before trying again
        if (this.state !== 'wander' && this.state !== 'chase') { this.setState('chase'); this.cooldown = Math.max(this.cooldown, GOB.stagger); }
      } else if (this.state === 'wander') {
        if (sees) this.notice(dx);
        else want = this.wander(dt);
      } else if (this.state === 'alert') {
        this.facing = Math.sign(dx) || this.facing;
        if (this.stateT >= GOB.alert) this.setState('chase');
      } else {
        this.lostT = sees ? 0 : this.lostT + dt;
        if (this.state === 'chase' && this.lostT > GOB.forget) { this.setState('wander'); this.wanderWalk = false; this.wanderT = 1; }
        else want = this.fight(dt, p, dx, dy);
      }
      // footwork: speed up / slow down toward what it wants (a lunge slides out slowly)
      if (this.onGround) this.vx = toward(this.vx, this.hurtT > 0 ? 0 : want, (this.hurtT > 0 ? 500 : this.state === 'swing' ? 240 : 700) * dt);
      const x0 = this.x;
      this.vy = Math.min(this.vy + 900 * dt, 400);
      Physics.move(this.game.level, this, dt);
      // one walk frame per 2.8px, so planted feet don't slide (backing away runs the cycle backwards)
      if (this.onGround) this.stride += ((this.x - x0) * this.facing) / 2.8;
      if (this.hitWall && this.state === 'wander') this.facing = -this.facing;   // bumped into something: turn round
    }

    /** Upkeep every frame, whatever it's doing (the mage's bomb timer). */
    tick() {}

    /** Pottering about: walk a bit, stop and look around, then head back the other way. */
    wander(dt) {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderWalk = !this.wanderWalk;
        if (this.wanderWalk) this.facing = -this.facing;
        this.wanderT = this.wanderWalk ? U.lerp(1.2, 2.6, Math.random()) : U.lerp(0.6, 1.4, Math.random());
      }
      return this.wanderWalk ? this.facing * GOB.wander : 0;
    }

    /** The club goblin's fight: walk up, wind up, swing. Returns the speed it wants. */
    fight(dt, p, dx, dy) {
      switch (this.state) {
        case 'chase':
          this.facing = Math.sign(dx) || this.facing;
          if (Math.abs(dx) < GOB.reach && Math.abs(dy) < GOB.reachY && this.cooldown <= 0 && this.onGround) { this.setState('windup'); return 0; }
          return Math.abs(dx) > GOB.close ? this.facing * GOB.walk : 0;   // right up close it just glowers
        case 'windup':
          if (this.stateT >= GOB.windup) {
            this.setState('swing');
            this.swingHit = false;
            this.vx = this.roomAhead() ? this.facing * GOB.lunge : 0;
            sfx('goblinSwing');
          }
          return 0;
        case 'swing':
          if (!this.roomAhead()) this.vx = 0;   // the lunge stops short of you rather than barging through
          this.swingAt();
          if (this.stateT >= GOB.swing) { this.setState('recover'); this.slam(); }
          return 0;
        case 'recover':
          if (this.stateT >= GOB.recover) { this.setState('chase'); this.cooldown = GOB.cooldown; }
          return 0;
      }
      return 0;
    }

    /** Spotted you: a startled hop, a cackle and a "!". */
    notice(dx) {
      this.setState('alert');
      this.facing = Math.sign(dx) || this.facing;
      this.lostT = 0;
      if (this.onGround) this.vy = -150;
      sfx('goblinAlert', { minGap: 0.2 });
      this.game.floatText(this.cx, this.y - 6, '!', '#ffd34d');
    }

    /** Is there space to lunge forward without bumping into you? */
    roomAhead() { return (this.game.player.cx - this.cx) * this.facing >= GOB.close - 1; }

    /** Can it back away from you without straying too far from home? */
    roomBehind(leash) { return Math.abs(this.cx - this.facing * 6 - this.homeX) <= leash; }

    /** The club's arc in front of it. Hits once per swing (a block or a dash still saves you). */
    swingAt() {
      if (this.swingHit) return;
      const pl = this.game.player;
      const box = { x: this.facing > 0 ? this.cx : this.cx - GOB.clubReach, y: this.y + 2, w: GOB.clubReach, h: this.h - 4 };
      if (Physics.rectsOverlap(box, { x: pl.x, y: pl.y, w: pl.w, h: pl.h })) {
        this.swingHit = true;
        pl.takeHit(this.damage, this.cx, this);
      }
    }

    /** The club hits the dirt: a thud and a puff of dust where it lands. */
    slam() {
      const x = this.cx + this.facing * 11, y = this.y + this.h - 1;
      for (let i = 0; i < 6; i++) {
        this.game.fx.add({
          x: x + U.lerp(-3, 3, Math.random()), y, vx: U.lerp(-40, 40, Math.random()) + this.facing * 15, vy: U.lerp(-60, -20, Math.random()), ay: 200,
          life: U.lerp(0.25, 0.45, Math.random()), color: Math.random() < 0.5 ? '#c8b48a' : '#a08a64', size: Math.random() < 0.3 ? 2 : 1, fadeOut: 0.2,
        });
      }
      sfx('goblinThud', { minGap: 0.05 });
    }

    /** [pose, frame] for whatever it's doing; each kind adds its attack poses in attackPose(). */
    pose() {
      if (this.stunned()) return ['idle', 0];                                // frozen / asleep: stock still
      if (this.hurtT > 0) return ['hurt', 0];
      if (this.state === 'alert') return ['alert', 0];
      if (!this.onGround) return ['air', this.vy < 0 ? 0 : 1];
      const atk = this.attackPose();
      if (atk) return atk;
      if (Math.abs(this.vx) > 6) return ['walk', ((Math.floor(this.stride) % 6) + 6) % 6];
      return ['idle', Math.floor(this.t * 1.6) % 2];
    }
    attackPose() {
      const s = this.state;
      if (s === 'windup') return ['windup', this.stateT < 0.12 ? 0 : 1 + (Math.floor(this.stateT * 16) % 2)];   // raise it, then tremble
      if (s === 'swing') return ['swing', 0];
      if (s === 'recover') return ['swing', this.stateT < 0.16 ? 1 : 2];     // club in the dirt, then hauled back up
      return null;
    }

    sprite() {
      const [pose, f] = this.pose();
      return ERX.GoblinSprite.frame(pose, f, this.facing, this.skin, this.kind);
    }
  }

  // ======================================================== GOBLIN THROWER
  // A goblin with a pouch of rocks instead of a club (red bandana, a rock in its
  // fist). It walks into throwing range, cocks its arm back (your cue) and hurls
  // a rock in a fast, flat arc at where you are. Crowd it and it backs off to
  // throw again, but it never strays far from home.
  const THROW = {
    near: 56, far: 130,                // likes to stand between these distances from you
    leash: 90,                         // won't back off further than this from where it started
    backoff: 34,                       // backpedalling speed (px/s)
    aim: 0.38, release: 0.12, recover: 0.35, cooldown: [1.2, 1.8],
    gravity: 520, pace: 200, flight: [0.25, 0.7],   // a rock's flight time: distance / pace, kept inside these bounds (s)
  };
  /** A rock in flight: tumbling, with a puff of dust behind it. */
  function rockLook(ctx, x, y, s) {
    ctx.fillStyle = '#c8c8d4';
    ctx.globalAlpha = 0.35;
    ctx.fillRect(Math.round(x - s.vx * 0.02) - 1, Math.round(y - s.vy * 0.02), 2, 1);
    ctx.globalAlpha = 1;
    ctx.drawImage(ERX.GoblinSprite.rock(Math.floor(s.t * 16)), x - 3, y - 3);
  }

  class GoblinThrower extends Goblin {
    constructor(game, spawn) {
      super(game, spawn);
      this.kind = 'thrower';
      this.maxHp = this.hp = 16;
      this.damage = 5;                   // a rock (or a shove if you walk into it)
      this.xp = 14;
      this.gold = 5;
    }

    fight(dt, p, dx, dy) {
      const dist = Math.abs(dx);
      switch (this.state) {
        case 'chase':
          this.facing = Math.sign(dx) || this.facing;
          if (this.cooldown <= 0 && this.onGround && dist < THROW.far + 20 && Math.abs(dy) < 60) { this.setState('aim'); return 0; }
          if (dist > THROW.far) return this.facing * GOB.walk;                                         // come closer
          if (dist < THROW.near && this.roomBehind(THROW.leash)) return -this.facing * THROW.backoff;   // too close: back off, eyes on you
          return 0;
        case 'aim':
          this.facing = Math.sign(dx) || this.facing;
          if (this.stateT >= THROW.aim) { this.throwRock(p); this.setState('release'); }
          return 0;
        case 'release':
          if (this.stateT >= THROW.release) this.setState('recover');
          return 0;
        case 'recover':
          if (this.stateT >= THROW.recover) { this.setState('chase'); this.cooldown = U.lerp(THROW.cooldown[0], THROW.cooldown[1], Math.random()); }
          return 0;
      }
      return 0;
    }

    /** Let fly: a rock in a flat arc that comes down where you are right now. */
    throwRock(p) {
      const G = ERX.GoblinSprite, h = G.point('thrower', 'throw', 1, 'hand');
      const x = this.cx + this.facing * h.dx, y = this.y + this.h - 1 + h.dy;
      const tx = p.cx, ty = (p.y + p.feet) / 2;
      const T = U.clamp(Math.abs(tx - x) / THROW.pace, THROW.flight[0], THROW.flight[1]);
      this.game.addProjectile(new Projectile(this.game, {
        x, y, vx: (tx - x) / T, vy: (ty - y) / T - 0.5 * THROW.gravity * T, gravity: THROW.gravity,
        r: 3, damage: this.damage, life: 3, source: this, look: rockLook, color: G.ROCK, popSfx: 'rockClack',
      }));
      sfx('goblinThrow');
    }

    attackPose() {
      const s = this.state;
      if (s === 'aim') return ['throw', 0];          // arm cocked back
      if (s === 'release') return ['throw', 1];      // let go
      if (s === 'recover') return ['throw', 2];      // follow-through
      return null;
    }
  }

  // ========================================================== GOBLIN MAGE
  // A goblin in a hooded cloak with a crystal staff. It keeps its distance and
  // chants (the crystal flares: your cue) before firing a bolt of mana straight
  // at you. Get close and it drops a mana bomb at its feet and backs away; the
  // bomb's blast ring glows on the ground while it flashes faster, then it bursts.
  const MAGE = {
    near: 64, far: 140, leash: 90,     // keeps between these distances from you, near home
    walk: 36, backoff: 36,
    cast: 0.55, shoot: 0.15, recover: 0.4, cooldown: [1.5, 2.1],
    boltSpeed: 150,
    bombNear: 42, drop: 0.3, flee: 0.7, fleeSpeed: 60, bombCooldown: 3.2,
    fuse: 1.3, blast: 30,
  };
  /** A mana bolt in flight: a fading purple trail behind the flickering orb. */
  function manaLook(ctx, x, y, s) {
    const G = ERX.GoblinSprite;
    ctx.fillStyle = G.MANA;
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = 0.5 / i;
      ctx.fillRect(Math.round(x - s.vx * 0.018 * i) - 1, Math.round(y - s.vy * 0.018 * i) - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(G.mana(Math.floor(s.t * 14)), x - 3, y - 3);
  }

  class GoblinMage extends Goblin {
    constructor(game, spawn) {
      super(game, spawn);
      this.kind = 'mage';
      this.maxHp = this.hp = 14;
      this.damage = 6;                   // a bolt (or a staff-bonk if you walk into it)
      this.xp = 18;
      this.gold = 8;
      this.color = ERX.GoblinSprite.CLOAK_L;   // the death burst: bits of cloak
      this.bombCd = 0;
    }

    tick(dt) { this.bombCd = Math.max(0, this.bombCd - dt); }

    fight(dt, p, dx, dy) {
      const dist = Math.abs(dx);
      switch (this.state) {
        case 'chase':
          this.facing = Math.sign(dx) || this.facing;
          if (dist < MAGE.bombNear && this.bombCd <= 0 && this.onGround) { this.setState('drop'); return 0; }
          if (this.cooldown <= 0 && this.onGround && dist < MAGE.far + 10 && Math.abs(dy) < 70) { this.setState('cast'); sfx('mageCast', { minGap: 0.1 }); return 0; }
          if (dist > MAGE.far) return this.facing * MAGE.walk;
          if (dist < MAGE.near && this.roomBehind(MAGE.leash)) return -this.facing * MAGE.backoff;
          return 0;
        case 'cast':
          this.facing = Math.sign(dx) || this.facing;   // it keeps you in its sights while it chants
          if (Math.random() < dt * 16) this.sparkle();
          if (this.stateT >= MAGE.cast) { this.shootBolt(p); this.setState('shoot'); }
          return 0;
        case 'shoot':
          if (this.stateT >= MAGE.shoot) this.setState('recover');
          return 0;
        case 'recover':
          if (this.stateT >= MAGE.recover) { this.setState('chase'); this.cooldown = U.lerp(MAGE.cooldown[0], MAGE.cooldown[1], Math.random()); }
          return 0;
        case 'drop':
          if (this.stateT >= MAGE.drop) { this.dropBomb(); this.setState('flee'); }
          return 0;
        case 'flee':
          // backs away from you (and its bomb), still watching you
          if (this.stateT >= MAGE.flee) { this.setState('chase'); this.cooldown = Math.max(this.cooldown, 0.4); return 0; }
          return this.roomBehind(MAGE.leash + 30) ? -this.facing * MAGE.fleeSpeed : 0;
      }
      return 0;
    }

    /** Where its crystal is in a pose (world px). */
    tip(pose, frame) {
      const t = ERX.GoblinSprite.point('mage', pose, frame, 'tip');
      return { x: this.cx + this.facing * t.dx, y: this.y + this.h - 1 + t.dy };
    }

    sparkle() {
      const G = ERX.GoblinSprite, t = this.tip('cast', 1);
      this.game.fx.add({
        x: t.x + U.lerp(-3, 3, Math.random()), y: t.y + U.lerp(-3, 3, Math.random()), vx: U.lerp(-15, 15, Math.random()), vy: U.lerp(-35, -10, Math.random()), ay: 0,
        life: 0.35, color: Math.random() < 0.5 ? G.MANA : G.MANA_L, size: 1, fadeOut: 0.25,
      });
    }

    /** A bolt of mana, straight at where you are right now. */
    shootBolt(p) {
      const G = ERX.GoblinSprite, t = this.tip('shoot', 0);
      const tx = p.cx, ty = (p.y + p.feet) / 2, d = Math.hypot(tx - t.x, ty - t.y) || 1;
      this.game.addProjectile(new Projectile(this.game, {
        x: t.x, y: t.y, vx: ((tx - t.x) / d) * MAGE.boltSpeed, vy: ((ty - t.y) / d) * MAGE.boltSpeed,
        r: 3, damage: this.damage, life: 2.4, source: this, look: manaLook, color: G.MANA, popSfx: 'manaFizz',
      }));
      sfx('mageBolt');
    }

    /** Set a mana bomb down at its feet. */
    dropBomb() {
      this.game.addProjectile(new ManaBomb(this.game, this.cx + this.facing * 4, this.y + this.h, {
        fuse: MAGE.fuse, r: MAGE.blast, damage: Math.round(this.damage * 1.4), source: this,
      }));
      this.bombCd = MAGE.bombCooldown;
      sfx('manaDrop');
    }

    attackPose() {
      const s = this.state;
      if (s === 'cast') return ['cast', Math.floor(this.stateT * 10) % 2];   // the crystal pulses
      if (s === 'shoot' || (s === 'recover' && this.stateT < 0.15)) return ['shoot', 0];
      if (s === 'drop') return ['drop', 0];
      return null;                                                            // fleeing: it backs off on its feet
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

  // ========================================================== PROJECTILES
  /**
   * Anything a monster spits or throws at you. It flies (with gravity, if it
   * has any), bursts on walls and floors, and hits you once. Blocking while
   * facing the way it came from, or dashing straight through it, saves you.
   * Projectiles live in the game's bolt list (game.addProjectile), so the
   * game screen updates and draws them and clears them with the level.
   *
   *   new Projectile(game, { x, y, vx, vy, gravity, r, damage, life, source, look, color, popSfx })
   *   look(ctx, x, y, projectile) draws it at screen (x, y); color tints its burst; popSfx is the burst's sound.
   */
  class Projectile {
    constructor(game, o) {
      this.game = game;
      this.x = o.x; this.y = o.y;
      this.vx = o.vx || 0; this.vy = o.vy || 0;
      this.gravity = o.gravity || 0;
      this.r = o.r || 3;                 // hit radius
      this.damage = o.damage || 5;
      this.life = o.life || 4;
      this.source = o.source || null;    // who fired it (an upgraded block bites back at them)
      this.look = o.look || null;
      this.color = o.color || '#ffffff';
      this.popSfx = o.popSfx || 'pelletPop';
      this.t = 0;
      this.dead = false;
    }

    update(dt, game) {
      if (this.dead) return;
      this.t += dt;
      this.vy = Math.min(this.vy + this.gravity * dt, 500);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.t > this.life) { this.pop('time'); return; }
      const TS = game.level.TS || 16;
      if (game.level.isSolid(Math.floor(this.x / TS), Math.floor(this.y / TS))) {
        this.x -= this.vx * dt; this.y -= this.vy * dt;   // burst on the surface, not inside it
        this.pop('wall');
        return;
      }
      const p = game.player;
      if (p.intangible) return;          // dashing straight through it
      const nx = U.clamp(this.x, p.x, p.x + p.w), ny = U.clamp(this.y, p.y, p.y + p.h);
      if ((this.x - nx) * (this.x - nx) + (this.y - ny) * (this.y - ny) > this.r * this.r) return;
      // "from" the way it came, so a block facing the shooter stops it
      const res = p.takeHit(this.damage, this.x - Math.sign(this.vx || 1) * 24, this.source);
      if (res === 'hit' || res === 'blocked') this.pop(res);
    }

    /** Burst into a little splash ('hit' | 'blocked' | 'wall' | 'time'). */
    pop(why) {
      this.dead = true;
      const g = this.game, n = why === 'time' ? 3 : 7;
      for (let i = 0; i < n; i++) {
        g.fx.add({
          x: this.x, y: this.y, vx: U.lerp(-70, 70, Math.random()) - this.vx * 0.15, vy: U.lerp(-110, -20, Math.random()), ay: 420,
          life: U.lerp(0.2, 0.4, Math.random()), color: Math.random() < 0.6 ? this.color : C.shade(this.color, -0.35), size: Math.random() < 0.3 ? 2 : 1, fadeOut: 0.15,
        });
      }
      if (why === 'blocked') g.sparks(this.x, this.y, 5, -Math.sign(this.vx || 1));
      sfx(this.popSfx, { minGap: 0.04 });
    }

    render(ctx, cam) {
      if (this.look) this.look(ctx, Math.round(this.x) - cam.ix, Math.round(this.y) - cam.iy, this);
    }
  }

  /**
   * A mana bomb sitting on the ground (goblin mages drop them). Its blast ring
   * glows on the ground so you can see how far to get, and it flashes faster
   * and faster until it bursts. Get clear, jump over the blast, dash through
   * it, or block facing it. It lives in the bolt list, like a projectile.
   */
  class ManaBomb {
    constructor(game, x, y, o) {
      this.game = game;
      this.x = x; this.y = y;            // y: the ground it sits on
      this.fuse = o.fuse || 1.3;
      this.r = o.r || 30;
      this.damage = o.damage || 8;
      this.source = o.source || null;
      this.t = 0;
      this.boomT = -1;
      this.nextTick = 0;
      this.dead = false;
    }

    update(dt, game) {
      this.t += dt;
      if (this.boomT >= 0) { this.boomT += dt; if (this.boomT > 0.3) this.dead = true; return; }
      if (this.t >= this.nextTick) {
        // tick... tick.. tick.tick.tick
        sfx('manaTick', { minGap: 0.03 });
        this.nextTick = this.t + Math.max(0.08, 0.35 * (1 - this.t / this.fuse));
      }
      if (this.t >= this.fuse) this.explode(game);
    }

    explode(game) {
      this.boomT = 0;
      const p = game.player, cy = this.y - 5;
      if (!p.intangible) {
        const nx = U.clamp(this.x, p.x, p.x + p.w), ny = U.clamp(cy, p.y, p.y + p.h);
        if ((this.x - nx) * (this.x - nx) + (cy - ny) * (cy - ny) <= this.r * this.r) p.takeHit(this.damage, this.x, this.source);
      }
      const G = ERX.GoblinSprite;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        game.fx.add({
          x: this.x, y: cy, vx: Math.cos(a) * U.lerp(60, 140, Math.random()), vy: Math.sin(a) * U.lerp(40, 110, Math.random()) - 30, ay: 120,
          life: U.lerp(0.25, 0.5, Math.random()), color: i % 3 ? G.MANA : G.MANA_L, size: Math.random() < 0.4 ? 2 : 1, fadeOut: 0.2,
        });
      }
      ERX.FX.shake(1.5, 0.15);
      sfx('manaBoom');
    }

    render(ctx, cam) {
      const G = ERX.GoblinSprite, x = Math.round(this.x) - cam.ix, y = Math.round(this.y) - cam.iy;
      if (this.boomT >= 0) {
        // the burst: a ring racing out to the edge of the blast, fading
        const k = this.boomT / 0.3, r = this.r * (0.4 + 0.6 * k);
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = G.MANA_L;
        for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; ctx.fillRect(Math.round(x + Math.cos(a) * r) - 1, Math.round(y - 5 + Math.sin(a) * r) - 1, 2, 2); }
        ctx.globalAlpha = 1;
        return;
      }
      const left = 1 - this.t / this.fuse;
      const lit = Math.floor(this.t / Math.max(0.06, 0.3 * left)) % 2 === 0;   // blinking faster as the fuse runs down
      // the blast ring on the ground: a flat ellipse of dots, brighter the closer it is to going off
      ctx.fillStyle = G.MANA;
      ctx.globalAlpha = 0.25 + 0.55 * (1 - left);
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; ctx.fillRect(Math.round(x + Math.cos(a) * this.r), Math.round(y - 1 + Math.sin(a) * 3), 1, 1); }
      ctx.globalAlpha = 1;
      ctx.drawImage(G.bomb(lit), x - 4, y - 9);
    }
  }

  // ============================================================== SPEWER
  // A rooted plant that lobs seeds at you (the art: js/render/spewer-sprite.js).
  // Asleep until you come close; then it wakes, turns to track you, swells up
  // and glows (your cue to move) and spits a seed that arcs down to where you
  // were standing. Walk out from under it, block it, or dash through it.
  // Hitting it while it charges makes it swallow the shot.
  const SPEW = {
    wake: [140, 90],                   // wakes when you're inside this box (px either side, up/down)
    sleep: [230, 140], doze: 3,        // dozes off after you've been outside this box this long (s)
    range: 170,                        // shoots when you're closer than this
    wakeTime: 0.5, firstShot: 0.5, charge: 0.6, spit: 0.12, recoil: 0.3, cooldown: 1.3, flinch: 0.7,
    gravity: 380,                      // the seeds' arc
    flight: [0.4, 1.05], pace: 130,    // a seed's flight time: distance / pace, kept inside these bounds (s)
  };

  /** A seed in flight: a short fading trail, then the spinning seed. */
  function seedLook(ctx, x, y, s) {
    const SP = ERX.SpewerSprite;
    ctx.fillStyle = SP.SEED;
    for (let i = 1; i <= 2; i++) {
      ctx.globalAlpha = 0.45 / i;
      ctx.fillRect(Math.round(x - s.vx * 0.022 * i) - 1, Math.round(y - s.vy * 0.022 * i) - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(SP.pellet(Math.floor(s.t * 12)), x - 3, y - 3);
  }

  class Spewer extends Enemy {
    constructor(game, spawn) {
      super(game, spawn);
      this.w = 12;
      this.h = 20;
      this.x = spawn.x - this.w / 2;
      const gy = game.level._groundBelow(Math.floor(spawn.x / 16), 2) * 16;
      this.y = gy - this.h;
      this.maxHp = this.hp = 16;
      this.damage = 5;                   // its seeds, and its bite if you walk into it
      this.xp = 14;
      this.gold = 5;
      this.knockback = 0;                // rooted: hits don't shove it...
      this.immovable = true;             // ...and nothing pulls or launches it
      this.color = '#9a3a8a';            // the death burst
      this.anchorX = ERX.SpewerSprite.ANCHOR.x;
      this.drawOffset = 1;
      this.hurtSfx = 'spewerHurt';
      this.dieSfx = 'spewerDie';
      this.state = 'dormant';            // dormant | wake | idle | charge | spit | recoil
      this.stateT = 0;
      this.cooldown = 0;
      this.awayT = 0;
      this.facing = spawn.facing || (Math.random() < 0.5 ? -1 : 1);
    }

    setState(s) { this.state = s; this.stateT = 0; }

    /** Where seeds leave its mouth (world px). */
    mouth() {
      const M = ERX.SpewerSprite.MOUTH;
      return { x: this.cx + this.facing * M.dx, y: this.y + this.h - 1 + M.dy };
    }

    think(dt) {
      const p = this.target();
      const dx = p.cx - this.cx, dy = (p.y + p.feet) / 2 - (this.y + 6);
      const near = (box) => Math.abs(dx) < box[0] && Math.abs(dy) < box[1];
      this.stateT += dt;
      this.cooldown = Math.max(0, this.cooldown - dt);

      if (this.hurtT > 0) {
        // a hit wakes it up, and one mid-charge makes it swallow the shot
        if (this.state === 'dormant') this.wakeUp(dx);
        else if (this.state === 'charge') { this.setState('idle'); this.cooldown = SPEW.flinch; }
      }
      switch (this.state) {
        case 'dormant':
          if (near(SPEW.wake)) this.wakeUp(dx);
          break;
        case 'wake':
          if (this.stateT >= SPEW.wakeTime) { this.setState('idle'); this.cooldown = Math.max(this.cooldown, SPEW.firstShot); }
          break;
        case 'idle':
          this.facing = Math.sign(dx) || this.facing;
          this.awayT = near(SPEW.sleep) ? 0 : this.awayT + dt;
          if (this.awayT > SPEW.doze) { this.setState('dormant'); this.awayT = 0; break; }
          if (this.cooldown <= 0 && this.hurtT <= 0 && Math.abs(dx) < SPEW.range && Math.abs(dy) < SPEW.wake[1]) {
            this.setState('charge');
            sfx('spewerCharge', { minGap: 0.1 });
          }
          break;
        case 'charge': {
          this.facing = Math.sign(dx) || this.facing;   // the bulb keeps turning to follow you
          if (Math.random() < dt * 14) {
            // sparks of sap leaking from the lips
            const m = this.mouth();
            this.game.fx.add({ x: m.x + U.lerp(-1, 1, Math.random()), y: m.y + U.lerp(-1, 1, Math.random()), vx: U.lerp(-10, 10, Math.random()), vy: U.lerp(-30, -10, Math.random()), ay: 0, life: 0.3, color: Math.random() < 0.5 ? ERX.SpewerSprite.SEED : ERX.SpewerSprite.SEED_L, size: 1, fadeOut: 0.2 });
          }
          if (this.stateT >= SPEW.charge) { this.fire(p); this.setState('spit'); }
          break;
        }
        case 'spit':
          if (this.stateT >= SPEW.spit) this.setState('recoil');
          break;
        case 'recoil':
          if (this.stateT >= SPEW.recoil) { this.setState('idle'); this.cooldown = SPEW.cooldown; }
          break;
      }
      // rooted to the spot: only gravity moves it (so it still settles on the ground)
      this.vx = 0;
      this.vy = Math.min(this.vy + 900 * dt, 400);
      Physics.move(this.game.level, this, dt);
    }

    wakeUp(dx) {
      this.setState('wake');
      this.facing = Math.sign(dx) || this.facing;
      sfx('spewerWake', { minGap: 0.2 });
    }

    /** Spit a seed in an arc that comes down where you are right now (not where you're going). */
    fire(p) {
      const SP = ERX.SpewerSprite, m = this.mouth();
      const tx = p.cx, ty = (p.y + p.feet) / 2;
      const T = U.clamp(Math.abs(tx - m.x) / SPEW.pace, SPEW.flight[0], SPEW.flight[1]);
      const vx = (tx - m.x) / T, vy = (ty - m.y) / T - 0.5 * SPEW.gravity * T;
      this.game.addProjectile(new Projectile(this.game, {
        x: m.x, y: m.y, vx, vy, gravity: SPEW.gravity, r: 3, damage: this.damage, life: 3, source: this, look: seedLook, color: SP.SEED,
      }));
      for (let i = 0; i < 4; i++) {
        this.game.fx.add({ x: m.x, y: m.y, vx: this.facing * U.lerp(30, 90, Math.random()), vy: U.lerp(-40, 20, Math.random()), ay: 300, life: U.lerp(0.15, 0.3, Math.random()), color: i % 2 ? SP.SEED : '#e85a7a', size: 1, fadeOut: 0.1 });
      }
      sfx('spewerSpit');
    }

    sprite() {
      const s = this.state;
      let pose = 'idle', f = Math.floor(this.t * 3) % 4;
      if (this.hurtT > 0) { pose = 'hurt'; f = 0; }
      else if (s === 'dormant') { pose = 'dormant'; f = Math.floor(this.t * 1.2) % 2; }
      else if (this.stunned()) f = 0;                                         // frozen / asleep: stock still
      else if (s === 'wake') { pose = 'wake'; f = 0; }
      else if (s === 'charge') { pose = 'charge'; f = Math.floor(this.stateT * 18) % 2; }   // swollen and shivering
      else if (s === 'spit') { pose = 'spit'; f = 0; }
      else if (s === 'recoil') { pose = 'spit'; f = 1; }
      return ERX.SpewerSprite.frame(pose, f, this.facing);
    }
  }

  const ENEMY_TYPES = { slime: Slime, bat: Bat, goblin: Goblin, goblinThrower: GoblinThrower, goblinMage: GoblinMage, spewer: Spewer };
  ERX.Enemies = {
    Enemy, Slime, Bat, Goblin, GoblinThrower, GoblinMage, Spewer, Projectile, ManaBomb, TYPES: ENEMY_TYPES,
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
