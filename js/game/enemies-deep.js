/*
 * THE DEEPER ENDS' MONSTERS (the basic ones live in js/game/enemies.js):
 *
 *   DARK SLIMES   hop at you like any slime, eyes glowing in the dark; a big one
 *                 splits into two little ones when it dies
 *   VAMPIRES      glide after you, wind up, then lunge for a bite that heals them.
 *                 Hit one and it bursts into a cloud of bats and re-forms behind you
 *   ZOMBIES       shamble at you, arms out, and grab. Knock one down and it lies
 *                 there... then gets back up (once), at half health
 *   DARK DEEPERS  swim through the floor after you (watch for the ridge of earth and
 *                 the glowing cracks), stop, and the ground flares: then they burst
 *                 out of it, bite, and sink again. You can't hit them underground.
 *
 * Vampires and zombies are built on the player's own puppet (js/render/player-side.js,
 * with their own colours), so they move like you do. Everything here glows a little
 * (light()), which the Deeper Ends' lighting picks up.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, C = ERX.Color;
  const { Physics } = ERX.GameEngine;
  const E = ERX.Enemies, Enemy = E.Enemy, Slime = E.Slime;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const TS = 16;
  const toward = (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));
  const ground = (L, x) => L._groundBelow(Math.floor(x / TS), 2) * TS;

  /** The little health bar (once it's hurt) and status pips, for monsters that draw themselves. */
  function drawBars(ctx, e, cx, top) {
    if (e.hp < e.maxHp) {
      const bw = 14, bx = Math.round(cx - bw / 2), by = Math.round(top) - 4;
      ctx.fillStyle = E.INK; ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
      ctx.fillStyle = '#3a1418'; ctx.fillRect(bx, by, bw, 2);
      ctx.fillStyle = '#e0403a'; ctx.fillRect(bx, by, Math.max(1, Math.round((bw * e.hp) / e.maxHp)), 2);
    }
    Object.keys(e.status).slice(0, 5).forEach((id, i) => {
      const x = Math.round(cx) - 9 + i * 4, y = Math.round(top) - 10;
      ctx.fillStyle = E.INK; ctx.fillRect(x - 1, y - 1, 4, 4);
      ctx.fillStyle = e._S(id).color; ctx.fillRect(x, y, 2, 2);
    });
  }
  /** A monster built on the player puppet: the body (a named pose ['run', 2], or a joint set), feet on (x, y). */
  function drawPuppet(ctx, e, look, pose, facing, x, y, lying) {
    const PS = ERX.PlayerSide;
    const cv = Array.isArray(pose) ? PS.frame(look, pose[0], pose[1], facing) : PS.frameJoints(look, pose, facing);
    PS.draw(ctx, cv, x, y, facing, lying);
    if (e.flash > 0) { const a = ctx.globalAlpha; ctx.globalAlpha = a * e.flash; PS.draw(ctx, E.whiteOf(cv), x, y, facing, lying); ctx.globalAlpha = a; }
    return cv;
  }

  // ============================================================ DARK SLIME
  class DarkSlime extends Slime {
    constructor(game, spawn) {
      super(game, spawn);
      this.mini = spawn.variant === 'mini';
      this.big = false;
      this.color = '#33245a';
      if (this.mini) {
        this.w = 8; this.h = 6;
        this.x = spawn.x - this.w / 2;
        this.y = (spawn.y !== undefined ? spawn.y : ground(game.level, spawn.x)) - this.h;
        this.maxHp = this.hp = 6; this.damage = 4; this.xp = 3; this.gold = 1;
        this.knockback = 1.2;
        this.drawOffset = 1;
        this.grace = 0.3;                     // just split off: the hit that split its parent can't land on it too
      } else {
        this.w = 12; this.h = 9;
        this.maxHp = this.hp = 22; this.damage = 7; this.xp = 12; this.gold = 4;
      }
      this.hurtSfx = 'darkSlimeHurt';
    }
    update(dt) { this.grace = Math.max(0, (this.grace || 0) - dt); super.update(dt); }
    hurt(dmg, dir, crit, kb) { if (!(this.grace > 0)) super.hurt(dmg, dir, crit, kb); }
    sprite() {
      let frame = 0;
      if (!this.onGround) frame = 2;
      else if (this.squash > 0 || (this.hopT < 0.15 && this.hurtT <= 0)) frame = 1;
      return E.slimeSprite(this.color, frame, false, { eye: '#ff5ae0', rim: '#8a5ad8', scale: this.mini ? 0.62 : 1 });
    }
    /** ...and a big one splits in two. */
    die() {
      super.die();
      if (this.mini) return;
      sfx('darkSlimeSplit');
      for (const side of [-1, 1]) {
        const m = E.create(this.game, { type: 'darkSlime', variant: 'mini', x: this.cx + side * 5, y: this.y + this.h, zone: this.zone, noReward: this.noReward });
        m.vx = side * 70; m.vy = -170; m.onGround = false; m.hopT = 0.7;
        this.game.enemies.push(m);
      }
    }
    light() { return { x: this.cx, y: this.cy, r: this.mini ? 14 : 22, color: '#ff5ae0', intensity: 0.7 }; }
  }

  // ============================================================== VAMPIRE
  const VAMP_LOOK = {
    gender: 0, skin: 0, hair: 0, hairColor: 0, eyes: 7, outfit: 6, outfitColor: 0, pants: 0,
    skinC: '#d8d2e8', hairC: '#1a1424', eyeC: '#ff2a3a', outfitC: '#24162a', pantsC: '#16101c', id: 'vampire',
  };
  const VAMP = {
    see: [170, 70], walk: 38, reach: 26, close: 14,
    windup: 0.45, lunge: 0.24, lungeSpeed: 170, recover: 0.45, cooldown: 1.1,
    mist: 1.1, reform: 0.4, mistCd: 4.5, bite: 18, behind: 44,
  };
  class Vampire extends Enemy {
    constructor(game, spawn) {
      super(game, spawn);
      this.w = 10; this.h = 22;
      this.x = spawn.x - this.w / 2;
      this.y = ground(game.level, spawn.x) - this.h;
      this.maxHp = this.hp = 34; this.damage = 7; this.xp = 26; this.gold = 12;
      this.knockback = 0.7;
      this.color = '#4a1a2a';
      this.hurtSfx = 'vampireHurt'; this.dieSfx = 'vampireDie';
      this.state = 'idle'; this.stateT = 0;
      this.cooldown = 0.6; this.mistCd = 1.5;
      this.alpha = 1; this.stride = 0; this.bats = []; this.bit = false;
    }
    setState(s) { this.state = s; this.stateT = 0; }
    get misty() { return this.state === 'mist'; }
    hurt(dmg, dir, crit, kb) {
      if (this.misty) return;                 // you can't hit a cloud of bats
      super.hurt(dmg, dir, crit, kb);
      if (!this.dead && this.mistCd <= 0 && this.state !== 'reform' && !this.stunned()) this.toMist();   // ...and that's what it becomes
    }
    applyStatus(id, potency) { if (!this.misty) super.applyStatus(id, potency); }
    contact() { if (!this.misty && this.state !== 'reform') super.contact(); }

    think(dt) {
      const p = this.target(), dx = p.cx - this.cx, dy = p.feet - (this.y + this.h);
      const sees = Math.abs(dx) < VAMP.see[0] && Math.abs(dy) < VAMP.see[1];
      this.stateT += dt;
      this.cooldown = Math.max(0, this.cooldown - dt);
      this.mistCd = Math.max(0, this.mistCd - dt);
      let want = 0;
      switch (this.state) {
        case 'idle':
          if (sees) { this.setState('stalk'); sfx('vampireHiss', { minGap: 0.5 }); }
          break;
        case 'stalk':
          if (!sees) { this.setState('idle'); break; }
          this.facing = Math.sign(dx) || this.facing;
          if (Math.abs(dx) < VAMP.reach && Math.abs(dy) < 20 && this.cooldown <= 0 && this.hurtT <= 0 && this.onGround) { this.setState('windup'); sfx('vampireHiss', { minGap: 0.3 }); break; }
          if (Math.abs(dx) > 110 && this.mistCd <= 0) { this.toMist(); break; }   // a long way off: close the gap as a swarm
          if (Math.abs(dx) > VAMP.close) want = this.facing * VAMP.walk;
          break;
        case 'windup':
          if (this.stateT >= VAMP.windup) { this.setState('lunge'); this.bit = false; this.vx = this.facing * VAMP.lungeSpeed; sfx('vampireBite'); }
          break;
        case 'lunge':
          this.biteAt();
          if (this.stateT >= VAMP.lunge) this.setState('recover');
          break;
        case 'recover':
          if (this.stateT >= VAMP.recover) { this.setState('stalk'); this.cooldown = VAMP.cooldown; }
          break;
        case 'mist':
          this.updateSwarm(dt);
          if (this.stateT >= VAMP.mist) this.reform();
          return;                                // no body to move
        case 'reform':
          this.alpha = Math.min(1, this.stateT / VAMP.reform);
          this.facing = Math.sign(dx) || this.facing;
          if (this.stateT >= VAMP.reform) { this.setState('stalk'); this.cooldown = 0.4; this.alpha = 1; }
          break;
      }
      if (this.onGround) {
        const atYou = this.facing * dx < VAMP.close && this.vx * this.facing > 0;   // the lunge has reached you: stop there, don't fly through you
        if (atYou) this.vx = 0;
        else if (this.state === 'lunge') this.vx = toward(this.vx, 0, 260 * dt);
        else this.vx = toward(this.vx, this.hurtT > 0 ? 0 : want, 600 * dt);
      }
      const x0 = this.x;
      this.vy = Math.min(this.vy + 900 * dt, 400);
      Physics.move(this.game.level, this, dt);
      if (this.onGround) this.stride += Math.abs(this.x - x0) / 5.5;
    }

    /** The bite: once per lunge. It drinks what it takes. */
    biteAt() {
      if (this.bit) return;
      const pl = this.game.player, box = { x: this.facing > 0 ? this.cx : this.cx - VAMP.bite, y: this.y + 2, w: VAMP.bite, h: 14 };
      if (!Physics.rectsOverlap(box, { x: pl.x, y: pl.y, w: pl.w, h: pl.h })) return;
      this.bit = true;
      if (pl.takeHit(this.damage, this.cx, this) === 'hit') {
        const healed = Math.min(this.damage, this.maxHp - this.hp);
        this.hp += healed;
        if (healed > 0) this.game.floatText(this.cx, this.y - 10, '+' + healed, '#ff5a6a');
        sfx('vampireDrain');
      }
    }

    /** Burst into bats, which fly round to a spot behind you (or in front, if there's no floor behind). */
    toMist() {
      const L = this.game.level, pl = this.game.player, feet = pl.onGround ? pl.feet : this.y + this.h;
      const floorAt = (x) => { const tx = Math.floor(x / TS), ty = Math.floor((feet - 1) / TS); return !L.isSolid(tx, ty) && !L.isSolid(tx, ty - 1) && (L.isSolid(tx, ty + 1) || L.isPlatform(tx, ty + 1)); };
      const behind = pl.cx - (pl.facing || 1) * VAMP.behind, ahead = pl.cx + (pl.facing || 1) * VAMP.behind;
      const tx = floorAt(behind) ? behind : floorAt(ahead) ? ahead : this.cx;
      this.from = { x: this.cx, y: this.cy };
      this.to = { x: tx, y: tx === this.cx ? this.cy : feet - 11, feet: tx === this.cx ? this.y + this.h : feet };
      this.bats = Array.from({ length: 6 }, (_, i) => ({ ph: Math.random() * 6, ox: U.lerp(-10, 10, Math.random()), oy: U.lerp(-10, 10, Math.random()), arc: (i % 2 ? 1 : -1) * U.lerp(18, 40, Math.random()), x: this.cx, y: this.cy }));
      this.setState('mist');
      this.mistCd = VAMP.mistCd;
      this.hurtT = 0;
      this.vx = 0;
      sfx('batSwarm');
    }
    updateSwarm() {
      const k = Math.min(1, this.stateT / VAMP.mist), e = k * k * (3 - 2 * k);
      for (const b of this.bats) {
        b.x = U.lerp(this.from.x, this.to.x, e) + b.ox * Math.sin(k * Math.PI) + Math.sin(this.stateT * 9 + b.ph) * 4;
        b.y = U.lerp(this.from.y, this.to.y, e) - Math.sin(k * Math.PI) * b.arc + b.oy * Math.sin(k * Math.PI) + Math.cos(this.stateT * 11 + b.ph) * 3;
      }
    }
    reform() {
      this.x = this.to.x - this.w / 2;
      this.y = this.to.feet - this.h;
      this.vx = 0; this.vy = 0;
      this.alpha = 0;
      this.setState('reform');
      sfx('batSwarm', { minGap: 0.1 });
    }

    pose() {
      if (this.hurtT > 0) return ['hurt', 0];
      if (this.state === 'windup') return ['attack', 0];
      if (this.state === 'lunge') return ['attack', 1];
      if (this.state === 'recover') return ['attack', 2];
      if (!this.onGround) return ['fall', 0];
      if (Math.abs(this.vx) > 8) return ['run', Math.floor(this.stride) % 6];
      return ['idle', Math.floor(this.t * 1.6) % 2];
    }

    render(ctx, cam) {
      if (this._erased) return;
      if (this.misty) {
        // a swirl of bats
        for (const b of this.bats) {
          const cv = E.batSprite('#3e3060', Math.floor(this.t * 14 + b.ph) % 2 ? 'up' : 'down');
          ctx.drawImage(cv, Math.round(b.x - cv.width / 2) - cam.ix, Math.round(b.y - cv.height / 2) - cam.iy);
        }
        return;
      }
      const x = Math.round(this.cx) - cam.ix, y = Math.round(this.y + this.h) - cam.iy, pose = this.pose();
      ctx.save();
      ctx.globalAlpha = this.alpha;
      this.drawCape(ctx, x, y);
      drawPuppet(ctx, this, VAMP_LOOK, pose, this.facing, x, y);
      // fangs
      const pt = ERX.PlayerSide.points(ERX.PlayerSide.poseOf(pose[0], pose[1])).mouth;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + this.facing * pt.dx - (this.facing < 0 ? 1 : 0), y + pt.dy + 1, 1, 1);
      ctx.restore();
      drawBars(ctx, this, x, y - 26);
    }
    /** A long black cape, red inside, hanging behind it (it flares out when it moves, and stands up at the collar). */
    drawCape(ctx, x, y) {
      const d = -this.facing, moving = Math.abs(this.vx) > 8;
      const flare = this.state === 'lunge' ? 6 : moving ? 3 + (Math.floor(this.stride) % 2) : 1 + Math.round(Math.sin(this.t * 2) * 0.6);
      const span = (yy, near, far, col) => { const a = x + d * near, b = x + d * far; ctx.fillStyle = col; ctx.fillRect(Math.min(a, b), yy, Math.abs(b - a) + 1, 1); };
      for (let r = 0; r <= 12; r++) {
        const yy = y - 14 + r, k = r / 12, far = Math.round(4 + k * (1 + flare));
        span(yy, -1, far + 1, E.INK);                                 // the edge
        span(yy, 0, far, r >= 10 ? '#8a1a2a' : '#1c1022');           // black, with the red lining showing at the hem
        if (r < 10) span(yy, far, far, '#3a1a30');                    // a fold catching the light
      }
      span(y - 2, -1, Math.round(6 + flare) + 1, E.INK);
      // the high collar: two points standing up behind the head
      for (const [near, top] of [[2, 18], [4, 17]]) { ctx.fillStyle = E.INK; ctx.fillRect(x + d * near - 1, y - top - 1, 3, 4); ctx.fillStyle = '#8a1a2a'; ctx.fillRect(x + d * near, y - top, 1, 3); }
    }
    light() { return this.misty ? null : { x: this.cx + this.facing * 2, y: this.y + 5, r: 16, color: '#ff2a3a', intensity: 0.75 * this.alpha }; }
  }

  // =============================================================== ZOMBIE
  const ZOMBIE_LOOK = {
    gender: 0, skin: 2, hair: 1, hairColor: 0, eyes: 5, outfit: 0, outfitColor: 0, pants: 0,
    skinC: '#8a9a78', hairC: '#3a3226', eyeC: '#e8e04a', outfitC: '#5a4a38', pantsC: '#3a3a48', id: 'zombie',
  };
  const ZJ = (o) => Object.assign({}, ERX.PlayerSide.STAND, o);
  const ZPOSE = {
    // arms straight out in front, a stiff, dragging shuffle
    shamble: [
      ZJ({ lean: 1, FA: [[12, 12], [15, 12]], BA: [[11, 13], [14, 13]], FL: [[10, 19], [11, 22]], BL: [[7, 19], [6, 22]] }),
      ZJ({ lean: 1, bob: 1, FA: [[12, 13], [15, 13]], BA: [[11, 13], [14, 14]], FL: [[9, 19], [9, 22]], BL: [[8, 19], [8, 22]] }),
      ZJ({ lean: 1, FA: [[12, 12], [15, 11]], BA: [[11, 13], [14, 12]], FL: [[8, 19], [7, 22]], BL: [[9, 19], [10, 22]] }),
      ZJ({ lean: 1, bob: 1, FA: [[12, 13], [15, 13]], BA: [[11, 13], [14, 14]], FL: [[9, 19], [9, 22]], BL: [[8, 19], [8, 22]] }),
    ],
    idle: [ZJ({ lean: 1, FA: [[11, 13], [13, 15]], BA: [[10, 14], [12, 16]] }), ZJ({ lean: 1, bob: 1, FA: [[11, 14], [13, 16]], BA: [[10, 15], [12, 17]] })],
    raise: [ZJ({ lean: -1, FA: [[11, 10], [13, 7]], BA: [[10, 10], [12, 7]], FL: [[10, 19], [11, 22]], BL: [[7, 19], [5, 22]], mouthOpen: true })],
    grab: [ZJ({ lean: 2, FA: [[13, 13], [16, 15]], BA: [[12, 13], [15, 15]], FL: [[11, 19], [12, 22]], BL: [[6, 19], [4, 22]], mouthOpen: true })],
  };
  const ZOMB = { see: [140, 60], walk: 20, reach: 22, close: 13, windup: 0.55, grab: 0.25, recover: 0.5, cooldown: 1.0, down: 2.4, rise: 0.7, arm: 16 };
  class Zombie extends Enemy {
    constructor(game, spawn) {
      super(game, spawn);
      this.w = 10; this.h = 22;
      this.x = spawn.x - this.w / 2;
      this.y = ground(game.level, spawn.x) - this.h;
      this.maxHp = this.hp = 44; this.damage = 8; this.xp = 22; this.gold = 8;
      this.knockback = 0.5;
      this.color = '#6a7a5a';
      this.hurtSfx = 'zombieHurt'; this.dieSfx = 'zombieDie';
      this.state = 'wander'; this.stateT = 0;
      this.cooldown = 0; this.stride = 0; this.risen = false; this.grabbed = false;
      this.wanderT = U.lerp(1, 3, Math.random());
      this.groanT = U.lerp(1, 4, Math.random());
      this.facing = Math.random() < 0.5 ? -1 : 1;
    }
    setState(s) { this.state = s; this.stateT = 0; }
    get downed() { return this.state === 'down' || this.state === 'rise'; }
    hurt(dmg, dir, crit, kb) { if (!this.downed) super.hurt(dmg, dir, crit, kb); }
    contact() { if (!this.downed) super.contact(); }
    /** The first time it "dies", it just falls down. It'll be back. */
    die() {
      if (!this.risen) {
        this.risen = true;
        this.hp = 1;
        this.vx = 0;
        this.setState('down');
        sfx('zombieFall');
        this.game.dust(this.cx, this.y + this.h, 10);
        return;
      }
      super.die();
    }

    think(dt) {
      this.stateT += dt;
      this.cooldown = Math.max(0, this.cooldown - dt);
      const p = this.target(), dx = p.cx - this.cx, dy = p.feet - (this.y + this.h);
      const sees = Math.abs(dx) < ZOMB.see[0] && Math.abs(dy) < ZOMB.see[1];
      let want = 0;
      if (this.state === 'down') {
        if (this.stateT >= ZOMB.down) { this.setState('rise'); sfx('zombieRise'); }
      } else if (this.state === 'rise') {
        if (this.stateT >= ZOMB.rise) {
          this.setState('shamble');
          this.hp = Math.round(this.maxHp * 0.5);
          this.game.floatText(this.cx, this.y - 8, 'IT GOT BACK UP!', '#c8e08a');
        }
      } else if (this.hurtT <= 0) {
        if (sees) {
          this.groanT -= dt;
          if (this.groanT <= 0) { this.groanT = U.lerp(2.5, 5, Math.random()); sfx('zombieGroan', { minGap: 0.8 }); }
        }
        switch (this.state) {
          case 'wander':
            if (sees) { this.setState('shamble'); sfx('zombieGroan', { minGap: 0.8 }); break; }
            this.wanderT -= dt;
            if (this.wanderT <= 0) { this.wanderT = U.lerp(2, 4, Math.random()); this.facing = -this.facing; }
            want = this.facing * ZOMB.walk * 0.5;
            break;
          case 'shamble':
            if (!sees) { this.setState('wander'); break; }
            this.facing = Math.sign(dx) || this.facing;
            if (Math.abs(dx) < ZOMB.reach && Math.abs(dy) < 18 && this.cooldown <= 0 && this.onGround) { this.setState('windup'); break; }
            if (Math.abs(dx) > ZOMB.close) want = this.facing * ZOMB.walk;
            break;
          case 'windup':
            if (this.stateT >= ZOMB.windup) { this.setState('grab'); this.grabbed = false; this.vx = this.facing * 70; sfx('zombieGrab'); }
            break;
          case 'grab':
            this.grabAt();
            if (this.stateT >= ZOMB.grab) this.setState('recover');
            break;
          case 'recover':
            if (this.stateT >= ZOMB.recover) { this.setState('shamble'); this.cooldown = ZOMB.cooldown; }
            break;
        }
      } else if (this.state === 'windup' || this.state === 'grab') {
        this.setState('shamble');          // a hit knocks it out of the grab
        this.cooldown = Math.max(this.cooldown, 0.6);
      }
      const atYou = this.facing * dx < ZOMB.close && this.vx * this.facing > 0;   // the grab has reached you: stop there, don't walk into you
      if (this.onGround) this.vx = atYou ? toward(this.vx, 0, 3000 * dt) : toward(this.vx, this.downed || this.hurtT > 0 ? 0 : want, (this.state === 'grab' ? 200 : 500) * dt);
      const x0 = this.x;
      this.vy = Math.min(this.vy + 900 * dt, 400);
      Physics.move(this.game.level, this, dt);
      if (this.onGround) this.stride += Math.abs(this.x - x0) / 4;
      if (this.hitWall && this.state === 'wander') this.facing = -this.facing;
    }
    grabAt() {
      if (this.grabbed) return;
      const pl = this.game.player, box = { x: this.facing > 0 ? this.cx : this.cx - ZOMB.arm, y: this.y + 4, w: ZOMB.arm, h: 12 };
      if (Physics.rectsOverlap(box, { x: pl.x, y: pl.y, w: pl.w, h: pl.h })) { this.grabbed = true; pl.takeHit(this.damage, this.cx, this); }
    }

    render(ctx, cam) {
      if (this._erased) return;
      const x = Math.round(this.cx) - cam.ix, y = Math.round(this.y + this.h) - cam.iy;
      let pose;
      if (this.state === 'down') pose = ['lie', 0];
      else if (this.state === 'rise') pose = this.stateT < ZOMB.rise * 0.5 ? ['lie', 0] : ['crouch', 0];
      else if (this.hurtT > 0) pose = ['hurt', 0];
      else if (this.state === 'windup') pose = ZPOSE.raise[0];
      else if (this.state === 'grab' || this.state === 'recover') pose = ZPOSE.grab[0];
      else if (!this.onGround) pose = ['fall', 0];
      else if (Math.abs(this.vx) > 4) pose = ZPOSE.shamble[Math.floor(this.stride) % 4];
      else pose = ZPOSE.idle[Math.floor(this.t * 1.2) % 2];
      drawPuppet(ctx, this, ZOMBIE_LOOK, pose, this.facing, x, y, Array.isArray(pose) && pose[0] === 'lie');
      if (!this.downed) drawBars(ctx, this, x, y - 26);
    }
    light() { return this.downed ? null : { x: this.cx + this.facing * 2, y: this.y + 5, r: 12, color: '#e8e04a', intensity: 0.45 }; }
  }

  // ========================================================== DARK DEEPER
  const DEEP = { see: [200, 60], swim: 58, track: 3.2, rumble: 0.7, emerge: 0.16, up: 1.3, sink: 0.45, rest: 0.8, bite: [0.35, 0.6], reach: 18, range: 14 };
  class DarkDeeper extends Enemy {
    constructor(game, spawn) {
      super(game, spawn);
      const L = game.level;
      this.w = 12; this.h = 4;
      this.floorY = ground(L, spawn.x);
      this.gx = spawn.x;                    // where it is, along the floor
      this.x = this.gx - this.w / 2; this.y = this.floorY + 400;
      this.maxHp = this.hp = 26; this.damage = 8; this.xp = 20; this.gold = 9;
      this.knockback = 0; this.immovable = true; this.flying = true;
      this.rooted = true;    // (no gravity, but it grows out of the floor: its hit area stands on the floor too)
      this.color = '#3a2a5a';
      this.hurtSfx = 'deeperHurt'; this.dieSfx = 'deeperDie';
      this.state = 'burrow'; this.stateT = 0; this.trackT = 0; this.height = 0; this.bitten = false;
      // the stretch of floor it can swim along: its own patch (it stops at gaps and walls, too)
      const row = Math.round(this.floorY / TS), tx0 = Math.floor(spawn.x / TS);
      const open = (tx) => Math.abs(tx - tx0) <= DEEP.range && L.isSolid(tx, row) && !L.isSolid(tx, row - 1) && !L.isSolid(tx, row - 2);
      let a = tx0, b = tx0;
      while (open(a - 1)) a--;
      while (open(b + 1)) b++;
      this.minX = a * TS + 8; this.maxX = (b + 1) * TS - 8;
    }
    setState(s) { this.state = s; this.stateT = 0; }
    get under() { return this.state === 'burrow' || this.state === 'rumble' || this.state === 'rest'; }
    hurt(dmg, dir, crit, kb) { if (!this.under) super.hurt(dmg, dir, crit, kb); }   // it's under the floor: nothing reaches it
    applyStatus(id, potency) { if (!this.under) super.applyStatus(id, potency); }
    stunnedPhysics() {}

    think(dt) {
      const p = this.target(), dx = p.cx - this.gx, dy = p.feet - this.floorY;
      const near = Math.abs(dx) < DEEP.see[0] && Math.abs(dy) < DEEP.see[1];
      this.stateT += dt;
      const MAX = ERX.DeeperSprite.MAX;
      switch (this.state) {
        case 'burrow':
          if (near) {
            // swimming after you, under the floor
            this.trackT += dt;
            const was = this.gx;
            this.gx = U.clamp(this.gx + Math.sign(dx) * DEEP.swim * dt, this.minX, this.maxX);
            const stuck = Math.abs(this.gx - was) < 0.01 && Math.abs(dx) > 6;   // at the end of its floor: you're out of reach
            if (Math.abs(dx) < 6 || this.trackT > DEEP.track || (stuck && this.trackT > 1)) { this.setState('rumble'); this.trackT = 0; sfx('deeperRumble'); }
          } else this.gx = U.clamp(this.gx + Math.sin(this.t * 0.7) * 12 * dt, this.minX, this.maxX);
          break;
        case 'rumble':
          if (this.stateT >= DEEP.rumble) {
            this.setState('emerge');
            this.facing = Math.sign(dx) || this.facing;
            this.bitten = false;
            sfx('deeperBurst');
            ERX.FX.shake(2, 0.2);
            for (let i = 0; i < 16; i++) {
              this.game.fx.add({
                x: this.gx + U.lerp(-8, 8, Math.random()), y: this.floorY - 1, vx: U.lerp(-80, 80, Math.random()), vy: U.lerp(-200, -60, Math.random()), ay: 520,
                life: U.lerp(0.4, 0.8, Math.random()), color: i % 3 ? '#2a2440' : '#b46aff', size: Math.random() < 0.4 ? 2 : 1, fadeOut: 0.2,
              });
            }
          }
          break;
        case 'emerge':
          this.height = MAX * Math.min(1, this.stateT / DEEP.emerge);
          if (this.stateT >= DEEP.emerge) this.setState('up');
          break;
        case 'up':
          this.height = MAX;
          this.facing = Math.sign(dx) || this.facing;
          if (this.biting) this.biteAt();
          if (this.stateT >= DEEP.up) { this.setState('sink'); sfx('deeperSink'); }
          break;
        case 'sink':
          this.height = MAX * (1 - Math.min(1, this.stateT / DEEP.sink));
          if (this.stateT >= DEEP.sink) { this.setState('rest'); this.height = 0; }
          break;
        case 'rest':
          if (this.stateT >= DEEP.rest) this.setState('burrow');
          break;
      }
      // its body: whatever's out of the ground (nothing, while it's under)
      this.x = this.gx - this.w / 2;
      if (this.under || this.height < 2) { this.y = this.floorY + 400; this.h = 4; }
      else { this.h = this.height; this.y = this.floorY - this.height; }
    }
    get biting() { return this.state === 'up' && this.stateT > DEEP.bite[0] && this.stateT < DEEP.bite[1]; }
    biteAt() {
      if (this.bitten) return;
      const pl = this.game.player, top = this.floorY - ERX.DeeperSprite.MAX;
      const box = { x: this.facing > 0 ? this.gx : this.gx - DEEP.reach, y: top, w: DEEP.reach, h: 14 };
      if (Physics.rectsOverlap(box, { x: pl.x, y: pl.y, w: pl.w, h: pl.h })) { this.bitten = true; pl.takeHit(this.damage, this.gx, this); }
    }

    render(ctx, cam) {
      if (this._erased) return;
      const x = Math.round(this.gx) - cam.ix, fy = Math.round(this.floorY) - cam.iy, t = this.t, G = ERX.DeeperSprite.COLORS;
      if (this.state === 'burrow' || this.state === 'rest') {
        // a ridge of loose earth sliding along, a few cracks glowing through
        for (let i = -3; i <= 3; i++) {
          const hh = Math.max(0, Math.round(2.4 - Math.abs(i) * 0.7 + Math.sin(t * 14 + i) * 0.6));
          if (hh) { ctx.fillStyle = '#16121f'; ctx.fillRect(x + i * 2 - 1, fy - hh - 1, 3, hh + 1); ctx.fillStyle = '#363048'; ctx.fillRect(x + i * 2, fy - hh, 1, 1); }
        }
        ctx.fillStyle = G.GLOW;
        for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 7 + i * 2)); ctx.fillRect(x + Math.round(Math.sin(t * 5 + i * 2.1) * 6), fy, 1, 1); }
        ctx.globalAlpha = 1;
      } else if (this.state === 'rumble') {
        // the ground cracks and glows where it's about to come up
        const k = Math.min(1, this.stateT / DEEP.rumble), r = 10 + k * 16;
        const gl = ctx.createRadialGradient(x, fy, 1, x, fy, r);
        gl.addColorStop(0, C.rgba(G.GLOW, 0.55 * k)); gl.addColorStop(1, C.rgba(G.GLOW, 0));
        ctx.fillStyle = gl; ctx.fillRect(x - r, fy - r, r * 2, r * 2);
        ctx.fillStyle = '#e8d0ff';
        for (const [dir, len] of [[-1, 0.7], [1, 1], [-1, 0.45], [1, 0.55]]) for (let i = 1; i <= Math.round((4 + k * 12) * len); i++) ctx.fillRect(x + dir * i, fy + (i % 3 === 0 ? 1 : 0), 1, 1);
        ctx.fillStyle = '#2a2440';
        for (let i = 0; i < 4; i++) ctx.fillRect(x - 6 + i * 4, fy - 2 - Math.round(Math.abs(Math.sin(t * 20 + i)) * 3 * k), 2, 2);   // pebbles jumping
      }
      if (!this.under && this.height > 0.5) {
        const DS = ERX.DeeperSprite, mouth = this.state === 'up' ? (this.biting ? 2 : 1) : 0;
        const cv = DS.frame(this.height, mouth, this.biting ? 1 : 0, Math.floor(t * 6) % 4, this.facing);
        const ax = this.facing < 0 ? DS.W - 1 - DS.ANCHOR.x : DS.ANCHOR.x, X = x - ax, Y = fy - DS.H;
        ctx.drawImage(cv, X, Y);
        if (this.flash > 0) { ctx.globalAlpha = this.flash; ctx.drawImage(E.whiteOf(cv), X, Y); ctx.globalAlpha = 1; }
        drawBars(ctx, this, x, fy - this.height - 4);
      }
    }
    light() {
      if (this.state === 'rumble') return { x: this.gx, y: this.floorY - 2, r: 36, color: '#b46aff', intensity: Math.min(1, this.stateT / DEEP.rumble) };
      if (this.under) return { x: this.gx, y: this.floorY - 1, r: 10, color: '#b46aff', intensity: 0.5 };
      return { x: this.gx, y: this.floorY - this.height + 6, r: 34, color: '#7ae8ff', intensity: 0.85 };
    }
  }

  Object.assign(E.TYPES, { darkSlime: DarkSlime, vampire: Vampire, zombie: Zombie, deeper: DarkDeeper });
  Object.assign(E, { DarkSlime, Vampire, Zombie, DarkDeeper, VAMP_LOOK, ZOMBIE_LOOK });
})(window.ERX = window.ERX || {});
