/*
 * THE AZURE ZOMBIE — the abyss's boss (js/game/level-abyss.js; the story: story-world.js abyssBoss).
 *
 * Summoned out of the sigil on the arena's back wall, it doesn't look like much: a
 * zombie, a bit blue round the eyes. Then its hands go up in blue fire.
 *
 *   PHASE 1   relentless: it never stops coming, and it has a lot of ways to hurt you. It picks
 *             by how far away you are (MOVES), never the same thing twice running if it can
 *             help it, and some moves lead into others:
 *               BLUE CLAWS     close: three swipes of blue fire
 *               AZURE BREATH   close: head back, then a stream of blue fire (back off, or get behind it)
 *               RAMPAGE        far: it digs in and charges until something stops it (jump it, dash
 *                              through it). If that's a wall, it's dazed: hit it while it's seeing stars
 *               VOLLEY         far: three blue fireballs lobbed at you, one after another
 *               GEYSERS        anywhere: fists down, and the floor bursts into fire where you stand (move!)
 *               LEAP SLAM      mid: down on top of you, fire racing along the floor both ways (then: geysers?)
 *               BACKSTEP       close: it springs out of your reach, then charges, throws, or erupts the floor
 *   PHASE 2   (half health) it roars, the fire climbs up its arms and over its shoulders, every
 *             wind-up gets quicker, and it adds: a fourth claw (an overhead smash), two charges in a
 *             row, five fireballs, whole rows of geysers, FLAME RAIN (it howls at the ceiling and fire
 *             comes down where you stand), and AZURE MINIONS: tiny zombies with the same blue fire,
 *             the same claws, the same leaping slams (a couple of hits each).
 *
 * A boss shrugs off stuns and launches, and barely flinches. Bring it to zero and it doesn't
 * die: the game screen hands it to the finale (js/game/finale.js), which kills it properly.
 * If you go down mid-fight, it starts over (full health) when you get back up.
 *
 *   ERX.Enemies.TYPES.azure / azureMinion      ERX.AzureBoss = { blueFlame, AZURE_LOOK, ... }
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, C = ERX.Color, PB = ERX.PixelBuffer;
  const { Physics } = ERX.GameEngine;
  const E = ERX.Enemies, Enemy = E.Enemy;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const toward = (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));
  const overlap = (a, p) => Physics.rectsOverlap(a, { x: p.x, y: p.y, w: p.w, h: p.h });

  // ================================================================ blue fire
  const BLUE = { edge: '#1a2a8a', mid: '#2a6aff', hot: '#7ad0ff', core: '#e8faff', ember: '#9ae0ff' };
  /**
   * A blue flame licking up from (x, y), about s px tall: full at the base, tapering to a tip
   * that sways, white-hot in the middle, and every so often a lick of fire breaking off the top.
   */
  function blueFlame(ctx, x, y, s, t, ph) {
    if (s < 1) return;
    ph = ph || 0;
    x = Math.round(x); y = Math.round(y);
    const h = Math.max(3, Math.round(s * (1 + 0.16 * Math.sin(t * 17 + ph)))), mw = Math.max(1, s * 0.36);
    let tipX = x;
    for (let r = 0; r < h; r++) {
      const q = r / (h - 1);                                                     // 0 at the base, 1 at the tip
      const hw = Math.round(mw * (q < 0.25 ? 0.75 + q : Math.pow(1 - (q - 0.25) / 0.75, 1.2)));
      const sx = x + Math.round(Math.sin(t * 13 + ph * 2 + q * 2.5) * q * q * 1.8), yy = y - r;
      ctx.fillStyle = BLUE.edge; ctx.fillRect(sx - hw - 1, yy, hw * 2 + 3, 1);
      ctx.fillStyle = BLUE.mid; ctx.fillRect(sx - hw, yy, hw * 2 + 1, 1);
      if (hw >= 1 && q < 0.8) { ctx.fillStyle = BLUE.hot; ctx.fillRect(sx - hw + 1, yy, hw * 2 - 1, 1); }
      if (hw >= 1 && q < 0.5) { ctx.fillStyle = BLUE.core; ctx.fillRect(sx - (hw >= 3 ? 1 : 0), yy, hw >= 3 ? 3 : 1, 1); }
      tipX = sx;
    }
    if (Math.floor(t * 9 + ph * 5) % 4 < 2) { ctx.fillStyle = BLUE.hot; ctx.fillRect(tipX, y - h - 1 - (Math.floor(t * 9 + ph * 5) % 2), 1, 1); }
  }
  /** A filled pixel circle. */
  function ball(ctx, x, y, r, col) {
    x = Math.round(x); y = Math.round(y); ctx.fillStyle = col;
    if (r < 1) { ctx.fillRect(x, y, 1, 1); return; }
    for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35); ctx.fillRect(x - w, y + dy, w * 2 + 1, 1); }
  }
  /** A soft blue glow (under a flame, round a fireball). */
  function blueGlow(ctx, x, y, r, a) {
    if (r <= 0 || a <= 0) return;
    const gl = ctx.createRadialGradient(x, y, 0, x, y, r);
    gl.addColorStop(0, C.rgba(BLUE.mid, a)); gl.addColorStop(1, C.rgba(BLUE.mid, 0));
    ctx.fillStyle = gl; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  /** Blue embers drifting up. */
  function embers(g, x, y, n, spread) {
    for (let i = 0; i < n; i++) g.fx.add({ x: x + U.lerp(-spread, spread, Math.random()), y: y + U.lerp(-spread, spread, Math.random()) * 0.5, vx: U.lerp(-15, 15, Math.random()), vy: U.lerp(-60, -20, Math.random()), life: U.lerp(0.4, 0.9, Math.random()), color: Math.random() < 0.5 ? BLUE.ember : BLUE.mid, size: 1, fadeOut: 0.3 });
  }
  const tintCache = new Map();
  function tinted(cv, col) { let m = tintCache.get(col); if (!m) tintCache.set(col, (m = new WeakMap())); let o = m.get(cv); if (!o) { o = ERX.Sprites.tint(cv, col); m.set(cv, o); } return o; }

  // ================================================================ the Azure Zombie
  const AZURE_LOOK = {
    gender: 0, skin: 2, hair: 1, hairColor: 0, eyes: 5, outfit: 0, outfitColor: 0, pants: 0,
    skinC: '#7d9488', hairC: '#22283a', eyeC: '#4ad8ff', outfitC: '#3a3448', pantsC: '#24242e', id: 'azure',
  };
  const ZJ = (o) => Object.assign({}, ERX.PlayerSide.STAND, o);
  const APOSE = {
    // slumped, arms dangling: not very scary yet
    idle: [ZJ({ lean: 1, bob: 1, FA: [[10, 14], [11, 17]], BA: [[9, 14], [10, 17]] }), ZJ({ lean: 1, bob: 1, FA: [[10, 14], [12, 17]], BA: [[9, 15], [10, 18]] })],
    walk: [
      ZJ({ lean: 2, FA: [[12, 12], [15, 12]], BA: [[11, 13], [14, 13]], FL: [[11, 19], [12, 22]], BL: [[6, 19], [5, 22]] }),
      ZJ({ lean: 2, bob: 1, FA: [[12, 13], [15, 13]], BA: [[11, 13], [14, 14]], FL: [[9, 19], [9, 22]], BL: [[8, 19], [8, 22]] }),
      ZJ({ lean: 2, FA: [[12, 12], [15, 11]], BA: [[11, 13], [14, 12]], FL: [[7, 19], [6, 22]], BL: [[10, 19], [11, 22]] }),
      ZJ({ lean: 2, bob: 1, FA: [[12, 13], [15, 13]], BA: [[11, 13], [14, 14]], FL: [[9, 19], [9, 22]], BL: [[8, 19], [8, 22]] }),
    ],
    clawWind: ZJ({ lean: -1, FA: [[8, 10], [5, 7]], BA: [[10, 13], [13, 14]], FL: [[10, 19], [11, 22]], BL: [[6, 19], [5, 22]], mouthOpen: true }),
    clawSwipe: ZJ({ lean: 2, FA: [[13, 12], [17, 14]], BA: [[11, 14], [12, 17]], FL: [[11, 19], [12, 22]], BL: [[6, 19], [4, 22]], mouthOpen: true }),
    clawSwipe2: ZJ({ lean: 2, FA: [[12, 14], [15, 17]], BA: [[13, 11], [16, 9]], FL: [[11, 19], [12, 22]], BL: [[6, 19], [4, 22]], mouthOpen: true }),
    crouch: ZJ({ bob: 3, lean: 1, FL: [[12, 20], [12, 22]], BL: [[5, 20], [4, 22]], FA: [[11, 14], [13, 16]], BA: [[6, 14], [4, 16]] }),
    leap: ZJ({ bob: -1, lean: 1, FL: [[11, 17], [11, 20]], BL: [[6, 18], [5, 21]], FA: [[11, 9], [12, 5]], BA: [[6, 9], [5, 5]], mouthOpen: true }),
    slam: ZJ({ bob: 3, lean: 2, FL: [[12, 20], [13, 22]], BL: [[5, 20], [3, 22]], FA: [[13, 17], [15, 21]], BA: [[11, 17], [12, 21]], mouthOpen: true }),
    throwWind: ZJ({ lean: -2, FA: [[6, 11], [3, 9]], BA: [[10, 14], [12, 15]], FL: [[10, 19], [11, 22]], BL: [[6, 19], [5, 22]] }),
    throw: ZJ({ lean: 2, FA: [[12, 11], [15, 9]], BA: [[8, 14], [6, 16]], FL: [[11, 19], [12, 22]], BL: [[6, 19], [4, 22]], mouthOpen: true }),
    summon: ZJ({ lean: -1, FA: [[11, 9], [14, 6]], BA: [[6, 9], [3, 6]], mouthOpen: true }),
    roar: ZJ({ lean: -2, bob: -1, FA: [[12, 12], [15, 10]], BA: [[5, 12], [2, 10]], FL: [[11, 19], [12, 22]], BL: [[6, 19], [4, 22]], mouthOpen: true }),
    // its hands catch fire: it straightens up and holds them out in front of it, fists clenched
    ignite: ZJ({ lean: 0, FA: [[12, 13], [15, 11]], BA: [[10, 14], [13, 12]] }),
    throw2: ZJ({ lean: 2, FA: [[9, 14], [7, 16]], BA: [[12, 11], [15, 9]], FL: [[11, 19], [12, 22]], BL: [[6, 19], [4, 22]], mouthOpen: true }),
    // its head goes back, its chest swells: something's coming up...
    breathWind: ZJ({ lean: -3, FA: [[10, 13], [12, 15]], BA: [[7, 13], [5, 15]], FL: [[10, 19], [11, 22]], BL: [[6, 19], [5, 22]], mouthOpen: true }),
    // ...and out it comes: leaning into a stream of blue fire
    breath: ZJ({ lean: 2, FA: [[11, 14], [12, 17]], BA: [[7, 14], [4, 16]], FL: [[12, 19], [13, 22]], BL: [[6, 19], [3, 22]], mouthOpen: true }),
    // digging in to charge: low, arms back, scraping the floor
    chargeWind: ZJ({ bob: 3, lean: 3, FA: [[8, 14], [5, 16]], BA: [[7, 14], [4, 15]], FL: [[12, 20], [13, 22]], BL: [[5, 20], [3, 22]], mouthOpen: true }),
    // dazed (it ran into a wall): hunched over, arms hanging, swaying
    dazed: [
      ZJ({ lean: 3, bob: 2, FA: [[10, 15], [10, 19]], BA: [[8, 15], [8, 19]], FL: [[10, 20], [11, 22]], BL: [[6, 20], [5, 22]], eyesClosed: true }),
      ZJ({ lean: 2, bob: 2, FA: [[10, 15], [11, 19]], BA: [[8, 15], [7, 19]], FL: [[10, 20], [11, 22]], BL: [[6, 20], [5, 22]], eyesClosed: true }),
    ],
    // both fists up... (the geysers, the overhead smash) ...and down into the floor
    raise: ZJ({ lean: -1, bob: -1, FA: [[11, 8], [12, 4]], BA: [[7, 8], [6, 4]], mouthOpen: true }),
    pound: ZJ({ bob: 3, lean: 3, FA: [[13, 16], [15, 20]], BA: [[11, 16], [13, 20]], FL: [[12, 20], [13, 22]], BL: [[5, 20], [3, 22]], mouthOpen: true }),
    // howling at the ceiling (and the ceiling answers: the rain)
    howl: ZJ({ lean: -3, bob: -1, FA: [[12, 9], [14, 5]], BA: [[6, 9], [3, 5]], mouthOpen: true }),
  };
  // the charge: a flat-out sprint, head down, claws out in front
  APOSE.run = [0, 1, 2, 3, 4, 5].map((i) => Object.assign({}, ERX.PlayerSide.poseOf('run', i), { lean: 3, mouthOpen: true, FA: [[12, 12], [16, 11 + (i % 2)]], BA: [[11, 13], [15, 14 - (i % 2)]] }));
  const AZ = {
    hp: 800, walk: 52, walk2: 64,
    claw: { reach: 26, wind: 0.32, gap: 0.16, dmg: [9, 9, 12, 15], recover: 0.5 },
    breath: { wind: 0.6, dur: 1.2, reach: 58, dmg: 7, recover: 0.5 },
    charge: { wind: 0.75, wind2: 0.42, speed: 270, speed2: 320, dmg: 14, max: 800, dazed: 1.3, dazed2: 0.8 },
    volley: { wind: 0.45, n: 3, n2: 5, gap: 0.2, speed: 205, dmg: 9, recover: 0.5 },
    geyser: { wind: 0.55, warn: 0.7, dmg: 12, n: 3, n2: 5, gap: 0.42, recover: 0.6 },
    leap: { prep: 0.34, vy: -330, slam: 14, wave: 10, recover: 0.55 },
    rain: { wind: 0.9, n: 10, gap: 0.22, warn: 0.75, dmg: 10, recover: 0.6 },
    summon: { every: 9, max: 4, wind: 1.0 },
    rest: 0.6, rest2: 0.35,     // the breather between moves (phase 1, phase 2)
    phase2: 0.5,
  };
  // what it can do, and from how far away ([min, max] px from you): how likely (w), how long before it'll do it again (cd, s).
  // It never picks the same thing twice running if it can help it; some moves lead into others (see pick / queue).
  const MOVES = [
    { id: 'claw', min: 0, max: 32, w: 5, cd: 0 },
    { id: 'breath', min: 0, max: 62, w: 3, cd: 5 },
    { id: 'geysers', min: 0, max: 9999, w: 2.5, cd: 7 },
    { id: 'hop', min: 0, max: 40, w: 1.6, cd: 7 },
    { id: 'charge', min: 70, max: 9999, w: 3, cd: 6 },
    { id: 'volley', min: 90, max: 9999, w: 3, cd: 5 },
    { id: 'leap', min: 80, max: 220, w: 1.2, cd: 8 },
    { id: 'rain', min: 0, max: 9999, w: 2.5, cd: 13, p2: true },
  ];

  class AzureZombie extends Enemy {
    constructor(game, spawn) {
      super(game, spawn);
      this.boss = true;                   // (its own health: none of the extra every other monster gets)
      this.w = 10; this.h = 22;
      this.x = spawn.x - this.w / 2;
      this.y = (spawn.y !== undefined ? spawn.y : game.level.floorY) - this.h;
      this.maxHp = this.hp = AZ.hp; this.damage = 9; this.xp = 400; this.gold = 150;
      this.knockback = 0.08; this.immovable = true;
      this.color = '#4a7aff';
      this.hurtSfx = 'azureHurt'; this.dieSfx = 'azureRoar';
      this.state = 'portal'; this.stateT = 0;
      this.phase = 1; this.active = false; this.ignite = 0; this.igniting = false; this.alpha = 0;
      this.cool = 1; this.summonT = 0; this.combo = 0; this.stride = 0; this.facing = -1;
      this.cds = {}; this.last = null; this.queue = null; this.n = 0; this.chargeN = 0;   // per-move cooldowns, what it did last, what it'll do next
      this.puffs = []; this.trail = [];   // its breath of fire; the fire its feet leave on a charge
      this.deaths = game.deaths || 0;
      this.home = spawn.x;
    }
    setState(s) { this.state = s; this.stateT = 0; }
    get walkSpeed() { return this.phase === 2 ? AZ.walk2 : AZ.walk; }
    get pace() { return this.phase === 2 ? 0.8 : 1; }   // phase 2: every wind-up a bit quicker
    minions() { return this.game.enemies.filter((e) => e.zone === 'azure' && !e.dead); }
    /** The stretch of floor it can put things on (inside the walls). */
    span() { return [4 * 16 + 8, this.game.level.pw - 4 * 16 - 8]; }

    /** The fight starts (story-world.js: abyssBoss, once its health bar is down). */
    begin() { this.active = true; this.setState('chase'); this.cool = 0.6; this.summonT = 0; }

    hurt(dmg, dir, crit) {
      if (!this.active || this.state === 'roar' || this.state === 'cut') return;
      // dazed (it ran headlong into a wall): wide open, and every hit lands harder
      const dazed = this.state === 'dazed';
      super.hurt(dazed ? dmg * 1.5 : dmg, dir, crit || dazed, 0.2);    // (it barely flinches)
    }
    applyStatus(id, potency) {
      const S = ERX.Abilities && ERX.Abilities.STATUS && ERX.Abilities.STATUS[id];
      if (!this.active || this.state === 'cut' || (S && (S.stun || S.launch))) return;   // stuns and launches don't take
      super.applyStatus(id, potency);
    }
    contact() { if (this.active && this.state !== 'roar' && this.state !== 'cut' && this.state !== 'dazed') super.contact(); }
    stunnedPhysics(dt) { this.think(dt); }
    /** At zero it doesn't just fall over: the finale (js/game/finale.js) finishes it. */
    die() {
      if (this.finale) return;
      if (this.game.state === 'dead') { this.hp = 1; return; }   // not while you're down (a burn ticking it out): it starts over when you're up
      this.finale = true;
      this.hp = 0;
      this.game.startBossFinale(this);
    }
    /** The finale's done with it: gone (and that's worth something). */
    finish() {
      this.dead = true;
      this.game.onEnemyKilled(this);
    }
    /** Its own fire, out (the breath, the trail): the finale's taking over. */
    calm() { this.puffs = []; this.trail = []; }
    /** You went down mid-fight and got back up: it starts over. */
    restart() {
      const g = this.game;
      this.deaths = g.deaths || 0;
      this.hp = this.maxHp; this.phase = 1; this.cool = 1.4; this.summonT = 0; this.status = {};
      this.cds = {}; this.last = null; this.queue = null; this.chargeN = 0; this.calm();
      this.x = this.home - this.w / 2; this.y = g.level.floorY - this.h; this.vx = this.vy = 0;
      for (const e of g.enemies) if (e.zone === 'azure') e.dead = true;
      g.bolts = g.bolts.filter((b) => !b.azure);
      this.setState('chase');
      embers(g, this.cx, this.y + 10, 20, 10);
      sfx('azureRoar');
    }
    /** Back to stalking you, after a breather. */
    done(rest) { this.setState('chase'); this.cool = rest !== undefined ? rest : this.phase === 2 ? AZ.rest2 : AZ.rest; }

    /** What next? Something that works from where it is, isn't cooling down, and (if it can help it) isn't what it just did. */
    pick(adx) {
      if (this.queue) { const q = this.queue; this.queue = null; this.start(q); return; }
      if (this.phase === 2 && this.summonT <= 0 && this.minions().length < AZ.summon.max) { this.start('summon'); return; }
      const opts = MOVES.filter((m) => (!m.p2 || this.phase === 2) && adx >= m.min && adx <= m.max && !(this.cds[m.id] > 0));
      if (!opts.length) return;    // nothing from here: keep coming
      const ws = opts.map((m) => m.w * (m.id === this.last ? 0.25 : 1));
      let r = Math.random() * ws.reduce((a, b) => a + b, 0);
      for (let i = 0; i < opts.length; i++) { r -= ws[i]; if (r <= 0) { this.start(opts[i].id); return; } }
      this.start(opts[opts.length - 1].id);
    }
    start(id) {
      const m = MOVES.find((x) => x.id === id);
      if (m) this.cds[id] = m.cd * (this.phase === 2 ? 0.75 : 1);
      this.last = id; this.n = 0; this.vx = 0;
      switch (id) {
        case 'claw': this.combo = 0; this.setState('clawWind'); break;
        case 'breath': this.setState('breathWind'); sfx('azureInhale'); break;
        case 'charge': this.chargeN = 0; this.setState('chargeWind'); sfx('azureSnarl'); break;
        case 'volley': this.setState('volleyWind'); sfx('azureKindle'); break;
        case 'geysers': this.setState('geyserWind'); sfx('azureSnarl'); break;
        case 'leap': this.setState('leapPrep'); break;
        case 'hop': this.setState('hopPrep'); break;
        case 'rain': this.setState('rainWind'); sfx('azureHowl'); ERX.FX.shake(3, 1.1); break;
        case 'summon': {
          const [lo, hi] = this.span(), k = this.minions().length;
          this.spots = [-1, 1, Math.random() < 0.5 ? -2 : 2].slice(0, k > 1 ? 2 : 3).map((s) => U.clamp(this.cx + s * 34, lo, hi));
          this.setState('summonWind'); sfx('azureSummon');
          break;
        }
      }
    }

    think(dt) {
      const g = this.game, p = this.target(), dx = p.cx - this.cx, adx = Math.abs(dx), feet = this.y + this.h, pace = this.pace;
      this.stateT += dt;
      this.cool = Math.max(0, this.cool - dt);
      for (const k in this.cds) this.cds[k] -= dt;
      this.updateFire(dt);
      if (this.igniting && this.ignite < 1) { this.ignite = Math.min(1, this.ignite + dt / 0.8); if (Math.random() < dt * 30) embers(g, this.cx, this.y + 12, 1, 8); }
      if (this.state === 'portal') { this.alpha = Math.min(1, this.stateT / 1.2); return; }   // taking shape in the sigil
      this.alpha = Math.min(1, this.alpha + dt * 3);                                          // (out of it, all there)
      if (this.state === 'cut') { this.vx = 0; return; }                                     // the finale's moving it now
      if (this.active && g.state === 'dead') { this.vx = toward(this.vx, 0, 600 * dt); this.move(dt); return; }   // you're down: it waits
      if (this.active && (g.deaths || 0) !== this.deaths) { this.restart(); return; }         // ...and you're back up: again
      let want = 0;
      const face = () => { if (dx) this.facing = Math.sign(dx); };
      switch (this.state) {
        case 'drop':
          if (this.onGround) { this.setState('stand'); sfx('crash'); ERX.FX.shake(3, 0.3); g.dust(this.cx, feet, 18); }
          break;
        case 'stand':
          face();
          break;
        case 'chase':
          face();
          if (adx > 14) want = this.facing * this.walkSpeed;
          if (this.cool <= 0 && this.onGround) this.pick(adx);
          break;

        // ---- BLUE CLAWS: three swipes (phase 2: and then both fists come down, sending fire racing both ways)
        case 'clawWind':
          if (this.stateT >= AZ.claw.wind * pace) this.swipe();
          break;
        case 'claw': {
          const smash = this.combo === 3, R = AZ.claw.reach + (smash ? 6 : 0);
          if (!this.swung && this.stateT < 0.12) {
            const box = { x: this.facing > 0 ? this.cx - 2 : this.cx - R + 2, y: this.y + (smash ? -2 : 1), w: R, h: smash ? 24 : 18 };
            if (overlap(box, g.player) && g.player.takeHit(AZ.claw.dmg[this.combo], this.cx, this) === 'hit') this.swung = true;
          }
          if (smash && !this.smashed && this.stateT >= 0.06) {
            this.smashed = true;
            sfx('azureSlam'); ERX.FX.shake(3, 0.25); g.dust(this.cx + this.facing * 12, feet, 10);
            for (const dir of [-1, 1]) g.addProjectile(new AzureWave(g, { x: this.cx + this.facing * 12 + dir * 4, y: feet, dir, damage: 8, speed: 150, h: 9, life: 0.7, source: this }));
          }
          if (this.stateT >= AZ.claw.gap * pace + 0.12) {
            this.combo++;
            if (this.combo < (this.phase === 2 ? 4 : 3)) { face(); this.swipe(); }
            else this.setState('clawRecover');
          }
          break;
        }
        case 'clawRecover':
          if (this.stateT >= AZ.claw.recover * pace) { this.done(); if (this.phase === 2 && Math.random() < 0.4) this.queue = 'breath'; }
          break;

        // ---- AZURE BREATH: its head goes back... then a stream of blue fire, right in your face
        case 'breathWind':
          if (this.stateT < 0.1) face();
          if (this.stateT >= AZ.breath.wind * pace) { this.setState('breath'); sfx('azureBreath'); }
          break;
        case 'breath':
          want = this.facing * 10;         // (leaning into it)
          this.breathe(dt);
          if (this.stateT >= AZ.breath.dur) this.setState('breathEnd');
          break;
        case 'breathEnd':
          if (this.stateT >= AZ.breath.recover * pace) this.done();
          break;

        // ---- BACKSTEP: it springs back out of your reach... to come at you another way (a charge, a volley, the geysers)
        case 'hopPrep':
          face();
          if (this.stateT >= 0.18 * pace) {
            this.vy = -250; this.vx = -this.facing * 150; this.onGround = false;
            this.setState('hopAir'); sfx('azureLeap'); g.dust(this.cx, feet, 6);
          }
          break;
        case 'hopAir':
          if (this.onGround && this.stateT > 0.1) {
            g.dust(this.cx, feet, 8); sfx('azureStomp');
            this.queue = ['charge', 'volley', 'geysers'][Math.floor(Math.random() * 3)];
            this.done(0.15);
          }
          break;

        // ---- RAMPAGE: it digs in... and charges, head down, until something stops it (usually a wall: then it's dazed)
        case 'chargeWind':
          if (this.stateT < 0.12) face();
          if (Math.random() < dt * 16) g.dust(this.cx - this.facing * 6, feet, 2);
          if (this.stateT >= (this.chargeN ? AZ.charge.wind2 : AZ.charge.wind) * pace) { this.setState('charge'); this.from = this.x; this.hitYou = false; sfx('azureCharge'); }
          break;
        case 'charge': {
          const sp = this.phase === 2 ? AZ.charge.speed2 : AZ.charge.speed, x0 = this.x, pl = g.player;
          this.vx = this.facing * sp;
          this.move(dt);
          if (Math.floor(this.stateT * 9) !== Math.floor((this.stateT - dt) * 9)) { sfx('azureStomp', { minGap: 0.05 }); g.dust(this.cx, feet, 3); }
          const lastT = this.trail[this.trail.length - 1];
          if (!lastT || Math.abs(lastT.x - this.cx) > 10) this.trail.push({ x: this.cx - this.facing * 3, y: feet, t: 0, ph: Math.random() * 6 });
          if (!this.hitYou && !pl.intangible && overlap(this.body, pl) && pl.takeHit(AZ.charge.dmg, this.cx - this.facing * 12, this) === 'hit') this.hitYou = true;
          if (Math.abs(this.x - x0) < sp * dt * 0.4) {
            // WHAM: straight into the wall. It bounces off, and it's seeing stars
            this.setState('dazed'); this.vx = -this.facing * 70; this.vy = -90; this.onGround = false;
            sfx('azureWallHit'); ERX.FX.shake(5, 0.45); g.dust(this.cx + this.facing * 6, feet - 10, 16); embers(g, this.cx + this.facing * 6, this.y + 8, 14, 8);
          } else if (Math.abs(this.x - this.from) > AZ.charge.max) { this.setState('skid'); sfx('azureSkid'); }
          return;   // (it's moved already)
        }
        case 'skid':
          if (Math.random() < dt * 30) g.dust(this.cx, feet, 2);
          this.vx = toward(this.vx, 0, 700 * dt);
          if (this.stateT >= 0.45) this.afterCharge();
          this.move(dt);
          return;
        case 'dazed':
          if (this.onGround) this.vx = toward(this.vx, 0, 400 * dt);
          if (this.stateT >= (this.phase === 2 ? AZ.charge.dazed2 : AZ.charge.dazed)) this.afterCharge();
          this.move(dt);
          return;

        // ---- FIREBALL VOLLEY: a ball of blue fire grows in its hand... then three, one after another (phase 2: five)
        case 'volleyWind':
          face();
          if (this.stateT >= AZ.volley.wind * pace) this.setState('volley');
          break;
        case 'volley': {
          face();
          const count = this.phase === 2 ? AZ.volley.n2 : AZ.volley.n;
          if (this.n < count && this.stateT >= this.n * AZ.volley.gap * pace) { this.throwOne(p); this.n++; }
          if (this.n >= count && this.stateT >= count * AZ.volley.gap * pace + 0.1) this.setState('volleyEnd');
          break;
        }
        case 'volleyEnd':
          if (this.stateT >= AZ.volley.recover * pace) { this.done(); if (this.phase === 2 && Math.random() < 0.35) this.queue = 'leap'; }
          break;

        // ---- AZURE GEYSERS: fists up, fists DOWN... and the floor bursts into blue fire where you stand
        //      (one after another, following you; phase 2, sometimes: a whole row at once, every other one first)
        case 'geyserWind':
          face();
          if (this.stateT >= AZ.geyser.wind * pace) {
            this.setState('geyserSlam');
            this.n = 0;
            sfx('azureSlam'); ERX.FX.shake(3, 0.3); g.dust(this.cx + this.facing * 8, feet, 12);
            this.rows = this.phase === 2 && Math.random() < 0.55;
            if (this.rows) this.geyserRows(p);
          }
          break;
        case 'geyserSlam':
          if (!this.rows) {
            const count = this.phase === 2 ? AZ.geyser.n2 : AZ.geyser.n;
            if (this.n < count && this.stateT >= this.n * AZ.geyser.gap * pace) { this.geyserAt(p.cx, 0); this.n++; }
            if (this.n >= count && this.stateT >= count * AZ.geyser.gap * pace + 0.3) this.setState('geyserEnd');
          } else if (this.stateT >= 1.3) this.setState('geyserEnd');
          break;
        case 'geyserEnd':
          if (this.stateT >= AZ.geyser.recover * pace) this.done();
          break;

        // ---- LEAP SLAM: up, and down on top of you; fire races along the floor both ways (and sometimes: geysers)
        case 'leapPrep':
          face();
          if (this.stateT >= AZ.leap.prep * pace) {
            const air = (2 * -AZ.leap.vy) / 900;
            this.vy = AZ.leap.vy; this.vx = U.clamp(dx / air, -220, 220); this.onGround = false;
            this.setState('leapAir'); sfx('azureLeap'); embers(g, this.cx, feet, 8, 6);
          }
          break;
        case 'leapAir':
          if (this.onGround && this.stateT > 0.1) this.slam(AZ.leap.slam, AZ.leap.wave, 1);
          break;
        case 'slamRecover':
          if (this.stateT >= AZ.leap.recover * pace) { this.done(); if (Math.random() < 0.5) this.queue = 'geysers'; }
          break;

        // ---- BLUE FLAME RAIN (phase 2): it howls at the ceiling, and fire comes down where you're standing
        case 'rainWind':
          if (Math.random() < dt * 40) embers(g, this.cx, this.y + 4, 1, 8);
          if (this.stateT >= AZ.rain.wind) { this.setState('rain'); this.n = 0; }
          break;
        case 'rain': {
          if (this.n < AZ.rain.n && this.stateT >= this.n * AZ.rain.gap) {
            const [lo, hi] = this.span(), x = this.n === 0 ? p.cx : U.clamp(p.cx + U.lerp(-90, 90, Math.random()), lo, hi);
            g.addProjectile(new AzureMeteor(g, { x, y: g.level.floorY, warn: AZ.rain.warn, damage: AZ.rain.dmg, source: this }));
            if (this.n % 3 === 0) sfx('azureMeteor', { minGap: 0.1 });
            this.n++;
          }
          if (Math.random() < dt * 30) embers(g, this.cx, this.y + 2, 1, 6);
          if (this.n >= AZ.rain.n && this.stateT >= AZ.rain.n * AZ.rain.gap + 0.4) this.setState('rainEnd');
          break;
        }
        case 'rainEnd':
          if (this.stateT >= AZ.rain.recover) this.done();
          break;

        // ---- MINIONS (phase 2): up out of the floor, in blue fire
        case 'summonWind':
          if (Math.random() < dt * 40) for (const sx of this.spots) embers(g, sx, g.level.floorY - 2, 1, 6);
          if (this.stateT >= AZ.summon.wind) {
            for (const sx of this.spots) {
              const mn = E.create(g, { type: 'azureMinion', x: sx, zone: 'azure', noReward: true });
              if (mn) { mn.facing = Math.sign(p.cx - sx) || 1; g.enemies.push(mn); }
              embers(g, sx, g.level.floorY - 4, 10, 6);
            }
            sfx('minionPop');
            this.summonT = AZ.summon.every; this.done(0.5);
          }
          break;
        // ---- half health: it roars, the fire climbs, and it gets serious
        case 'roar':
          if (Math.random() < dt * 60) embers(g, this.cx, this.y + 10, 1, 12);
          if (this.stateT >= 1.8) { this.phase = 2; this.summonT = 0.6; this.done(0.3); }
          break;
      }
      if (this.phase === 2 && this.state !== 'summonWind' && this.state !== 'roar') this.summonT -= dt;
      if (this.active && this.phase === 1 && this.hp <= this.maxHp * AZ.phase2 && this.onGround && /^(chase|clawRecover|slamRecover|volleyEnd|breathEnd|geyserEnd)$/.test(this.state)) {
        this.setState('roar'); this.vx = 0; this.queue = null; sfx('azureRoar'); ERX.FX.shake(4, 1.4); g.flashT = 0.12;
      }
      if (this.onGround && this.state !== 'leapAir') this.vx = toward(this.vx, want, (this.state === 'claw' ? 500 : 700) * dt);
      this.move(dt);
    }
    move(dt) {
      const x0 = this.x;
      this.vy = Math.min(this.vy + 900 * dt, 420);
      Physics.move(this.game.level, this, dt);
      if (this.onGround) this.stride += Math.abs(this.x - x0) / 4.5;
    }
    /** One swipe of the claw combo (the 4th, in phase 2: the overhead smash). */
    swipe() {
      this.setState('claw'); this.swung = false; this.smashed = false;
      sfx('azureClaw');
      this.vx = this.facing * (this.combo === 3 ? 40 : 90);
    }
    /** After a charge (into a wall, or skidding to a stop): in phase 2 it turns round and goes again, once. */
    afterCharge() {
      this.chargeN++;
      if (this.phase === 2 && this.chargeN < 2) {
        const p = this.target();
        this.facing = Math.sign(p.cx - this.cx) || -this.facing;
        this.setState('chargeWind'); sfx('azureSnarl');
      } else this.done();
    }
    /** One fireball of the volley, lobbed to come down on you (alternating hands). */
    throwOne(p) {
      const g = this.game, h = this.point(this.n % 2 ? 'handB' : 'handF'), sx = h.x + this.facing * 2, sy = h.y - 2;
      const tx = p.cx + U.lerp(-10, 10, Math.random()), ty = p.y + 12, T = U.clamp(Math.abs(tx - sx) / AZ.volley.speed, 0.28, 1.1);
      // (the fireball's gravity is 120: aim so the arc lands on you)
      g.addProjectile(new AzureFireball(g, { x: sx, y: sy, vx: (tx - sx) / T, vy: (ty - sy - 60 * T * T) / T, damage: AZ.volley.dmg, source: this }));
      sfx('azureFireball', { minGap: 0.05 });
    }
    geyserAt(x, delay) {
      const g = this.game;
      g.addProjectile(new AzureGeyser(g, { x, y: g.level.floorY, warn: AZ.geyser.warn, delay, damage: AZ.geyser.dmg, source: this }));
    }
    /** A row of geysers across the floor round you: every other one first (stand in a gap)... then the rest (move!). */
    geyserRows(p) {
      const [lo, hi] = this.span();
      for (let i = -5; i <= 5; i++) {
        const x = p.cx + i * 40;
        if (x >= lo && x <= hi) this.geyserAt(x, (Math.abs(i) % 2) * 0.8);
      }
    }
    /** A stream of blue fire from its mouth: what it touches, it burns. */
    breathe(dt) {
      const g = this.game, pl = g.player, m = this.point('mouth'), f = this.facing, T = AZ.breath.dur;
      const k = Math.min(1, this.stateT / 0.2) * Math.min(1, Math.max(0, (T - this.stateT) / 0.2));
      if (Math.random() < k) for (let i = 0; i < 2; i++) this.puffs.push({ x: m.x + f * 2, y: m.y + 1, vx: f * U.lerp(120, 180, Math.random()), vy: U.lerp(-18, 26, Math.random()), t: 0, life: U.lerp(0.28, 0.4, Math.random()), s: U.lerp(1, 2.2, Math.random()) });
      const reach = AZ.breath.reach * k;
      if (reach > 4 && !pl.intangible && Physics.rectsOverlap({ x: f > 0 ? m.x : m.x - reach, y: m.y - 9, w: reach, h: 20 }, { x: pl.x, y: pl.y, w: pl.w, h: pl.h })) pl.takeHit(AZ.breath.dmg, this.cx, this);
    }
    updateFire(dt) {
      for (const pf of this.puffs) { pf.t += dt; pf.x += pf.vx * dt; pf.y += pf.vy * dt; pf.vx *= 1 - 1.5 * dt; pf.vy -= 30 * dt; }
      this.puffs = this.puffs.filter((pf) => pf.t < pf.life);
      for (const tr of this.trail) tr.t += dt;
      this.trail = this.trail.filter((tr) => tr.t < 1);
    }
    /** Coming down hard: hurts anything close, and sends blue fire racing along the floor both ways. */
    slam(dmg, waveDmg, size) {
      const g = this.game, p = g.player, feet = this.y + this.h;
      this.setState('slamRecover'); this.vx = 0;
      sfx('azureSlam'); ERX.FX.shake(4 * size, 0.35); g.dust(this.cx, feet, 22);
      embers(g, this.cx, feet - 4, 16, 14);
      if (Math.abs(p.cx - this.cx) < 34 * size && Math.abs(p.feet - feet) < 26) p.takeHit(dmg, this.cx, this);
      for (const dir of [-1, 1]) g.addProjectile(new AzureWave(g, { x: this.cx + dir * 8, y: feet, dir, damage: waveDmg, speed: 175, h: 12 * size, source: this }));
    }

    poseNow() {
      switch (this.state) {
        case 'portal': return APOSE.idle[0];
        case 'drop': return this.onGround ? APOSE.crouch : ['fall', 0];
        case 'stand': return this.igniting ? APOSE.ignite : APOSE.idle[Math.floor(this.t * 1.4) % 2];
        case 'chase': return Math.abs(this.vx) > 6 ? APOSE.walk[Math.floor(this.stride) % 4] : APOSE.idle[Math.floor(this.t * 1.4) % 2];
        case 'clawWind': return APOSE.clawWind;
        case 'claw': return this.combo === 3 ? (this.stateT < 0.05 ? APOSE.raise : APOSE.pound) : this.combo % 2 ? APOSE.clawSwipe2 : APOSE.clawSwipe;
        case 'clawRecover': return this.combo >= 4 ? APOSE.pound : APOSE.clawSwipe;
        case 'breathWind': return APOSE.breathWind;
        case 'breath': case 'breathEnd': return APOSE.breath;
        case 'chargeWind': return APOSE.chargeWind;
        case 'charge': return APOSE.run[Math.floor(this.stateT * 14) % APOSE.run.length];
        case 'skid': return APOSE.crouch;
        case 'dazed': return APOSE.dazed[Math.floor(this.stateT * 3) % 2];
        case 'volleyWind': return APOSE.throwWind;
        case 'volley': { const gap = AZ.volley.gap * this.pace; return (this.stateT % gap) / gap < 0.55 ? (this.n % 2 ? APOSE.throw : APOSE.throw2) : APOSE.throwWind; }
        case 'volleyEnd': return APOSE.throw;
        case 'geyserWind': return APOSE.raise;
        case 'geyserSlam': case 'geyserEnd': return APOSE.pound;
        case 'leapPrep': case 'hopPrep': return APOSE.crouch;
        case 'hopAir': return APOSE.leap;
        case 'leapAir': return APOSE.leap;
        case 'slamRecover': return APOSE.slam;
        case 'rainWind': case 'rain': return APOSE.howl;
        case 'rainEnd': return APOSE.idle[0];
        case 'summonWind': return APOSE.summon;
        case 'roar': return APOSE.roar;
        case 'cut': return this.cutPose || APOSE.roar;
        default: return APOSE.idle[0];
      }
    }
    jointsNow() { const p = this.poseNow(); return Array.isArray(p) ? ERX.PlayerSide.poseOf(p[0], p[1]) : p; }
    frameNow() {
      const PS = ERX.PlayerSide, p = this.poseNow();
      return Array.isArray(p) ? PS.frame(AZURE_LOOK, p[0], p[1], this.facing) : PS.frameJoints(AZURE_LOOK, p, this.facing);
    }
    /** Where (on the screen) it's drawn: its canvas and top-left corner (the finale breaks it into pixels). */
    drawnAt(cam) {
      const PS = ERX.PlayerSide, cv = this.frameNow(), ax = this.facing < 0 ? cv.width - 1 - PS.ANCHOR.x : PS.ANCHOR.x;
      return { cv, x: Math.round(this.cx) - cam.ix - ax, y: Math.round(this.y + this.h) - cam.iy - PS.ANCHOR.y - 1 };
    }
    /** A point of the puppet (eye, mouth, handF, handB...) in world coordinates. */
    point(name) {
      const pt = ERX.PlayerSide.points(this.jointsNow())[name];
      return { x: this.cx + pt.dx * this.facing, y: this.y + this.h - 1 + pt.dy };
    }

    render(ctx, cam) {
      if (this.hidden || this._erased) return;
      const t = this.t, ox = -cam.ix, oy = -cam.iy;
      // the fire its feet left on a charge (under it)
      for (const tr of this.trail) blueFlame(ctx, tr.x + ox, tr.y + oy, 7 * (1 - tr.t), t + tr.ph, tr.ph);
      const d = this.drawnAt(cam);
      ctx.save();
      ctx.globalAlpha *= this.alpha;
      if (this.state === 'portal') ctx.drawImage(tinted(d.cv, '#05030c'), d.x, d.y);   // a dark shape in the circle
      else {
        ctx.drawImage(d.cv, d.x, d.y);
        // out of the light of the portal, it comes into its own colours
        if (this.state === 'drop' && this.stateT < 0.35) { ctx.globalAlpha = this.alpha * (1 - this.stateT / 0.35); ctx.drawImage(tinted(d.cv, '#05030c'), d.x, d.y); }
      }
      if (this.flash > 0 && this.state !== 'portal') { ctx.globalAlpha = this.alpha * this.flash; ctx.drawImage(E.whiteOf(d.cv), d.x, d.y); }
      ctx.restore();
      ctx.save();
      ctx.globalAlpha *= this.alpha;
      // its eyes: blue, and glowing (white, for a blink, as it digs in to charge)
      const eye = this.point('eye'), ex = Math.round(eye.x) + ox, ey = Math.round(eye.y) + oy;
      ctx.fillStyle = this.state === 'chargeWind' && Math.floor(this.stateT * 10) % 2 === 0 ? '#ffffff' : BLUE.hot; ctx.fillRect(ex, ey, 1, 1);
      if (this.ignite > 0.5 || this.state === 'portal') { ctx.globalAlpha *= 0.5; ctx.fillStyle = BLUE.mid; ctx.fillRect(ex - this.facing, ey, 1, 1); ctx.fillRect(ex + this.facing * 2, ey, 2, 1); }
      ctx.restore();
      // blue fire in its hands (and, in phase 2, up its arms and over its shoulders)
      if (this.ignite > 0 && this.state !== 'portal') {
        const s = (this.phase === 2 ? 8 : 6) * this.ignite * (this.state === 'chargeWind' || this.state === 'rainWind' ? 1.3 : 1);
        for (const [hand, ph] of [['handB', 1.7], ['handF', 0]]) { const h = this.point(hand); blueGlow(ctx, h.x + ox, h.y + oy - s * 0.3, s * 1.5, 0.35 * this.ignite); blueFlame(ctx, h.x + ox, h.y + oy + 1, s, t, ph); }
        if (this.phase === 2 || this.state === 'roar') {
          const k = this.state === 'roar' ? Math.min(1, this.stateT / 0.6) : 1, top = this.point('headTop'), chest = this.point('chest');
          blueFlame(ctx, top.x + ox - this.facing, top.y + oy + 2, 6 * k, t, 2.4);
          blueFlame(ctx, chest.x + ox - this.facing * 4, chest.y + oy - 1, 5 * k, t, 3.1);
          blueFlame(ctx, chest.x + ox + this.facing * 3, chest.y + oy - 2, 4 * k, t, 4.2);
        }
      }
      // the claw: an arc of blue fire, swept through
      if (this.state === 'claw' && this.combo < 3 && this.stateT < 0.16) {
        const k = this.stateT / 0.16, sx = this.cx + this.facing * 4 + ox, sy = this.y + 9 + oy, dirA = this.combo % 2 ? -1 : 1;
        for (let i = 0; i < 12; i++) {
          const q = i / 11, a = (-1.2 + q * 2.4 * Math.min(1, k * 1.5)) * dirA, r = 14 + (this.combo === 2 ? 6 : 0);
          const x = sx + Math.cos(a) * r * this.facing, y = sy + Math.sin(a) * r;
          ctx.globalAlpha = (1 - k) * (0.4 + q * 0.6);
          ctx.fillStyle = q > 0.7 ? BLUE.core : q > 0.35 ? BLUE.hot : BLUE.mid;
          ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
        }
        ctx.globalAlpha = 1;
      }
      // the breath: its mouth glows as it draws breath (sparks sucked in)... then the stream itself
      if (this.state === 'breathWind') {
        const m = this.point('mouth'), k = Math.min(1, this.stateT / (AZ.breath.wind * this.pace));
        blueGlow(ctx, m.x + ox, m.y + oy, 6 + 12 * k, 0.85 * k);
        ball(ctx, m.x + ox, m.y + oy, Math.round(2 * k), BLUE.hot);
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + t * 8, r = 10 * (1 - ((t * 2 + i / 6) % 1)); ctx.fillStyle = BLUE.hot; ctx.fillRect(Math.round(m.x + ox + Math.cos(a) * r), Math.round(m.y + oy + Math.sin(a) * r), 1, 1); }
        ctx.fillStyle = BLUE.core; ctx.fillRect(Math.round(m.x) + ox, Math.round(m.y) + oy, 1, 1);
      }
      if (this.puffs.length) {
        const P = this.puffs.map((pf) => { const q = pf.t / pf.life; return { x: pf.x + ox, y: pf.y + oy, q, r: Math.max(1, Math.round(pf.s * (1 + q * 2.2))) }; });
        for (const s of P) ball(ctx, s.x, s.y, s.r + 1, BLUE.edge);
        for (const s of P) ball(ctx, s.x, s.y, s.r, s.q < 0.5 ? BLUE.hot : BLUE.mid);
        for (const s of P) if (s.q < 0.3) ball(ctx, s.x, s.y, Math.max(0, s.r - 1), BLUE.core);
      }
      // dazed: little blue stars round its head
      if (this.state === 'dazed') {
        const h = this.point('headTop');
        for (let i = 0; i < 3; i++) { const a = t * 7 + i * 2.1; ctx.fillStyle = i ? BLUE.hot : BLUE.core; ctx.fillRect(Math.round(h.x + ox + Math.cos(a) * 7), Math.round(h.y + oy - 2 + Math.sin(a) * 2), 2, 1); }
      }
      // a fireball taking shape in its hand
      if (this.state === 'volleyWind') {
        const h = this.point('handF'), k = Math.min(1, this.stateT / (AZ.volley.wind * this.pace));
        blueGlow(ctx, h.x + ox, h.y + oy - 1, 6 + 6 * k, 0.5);
        ball(ctx, h.x + ox, h.y + oy - 2, 1 + Math.round(2 * k), BLUE.mid); ball(ctx, h.x + ox, h.y + oy - 2, Math.round(k), BLUE.core);
      }
      // calling up minions: blue fire swirling on the floor where they'll come up
      if (this.state === 'summonWind' && this.spots) {
        const k = Math.min(1, this.stateT / AZ.summon.wind), fy = this.game.level.floorY + oy;
        for (const sx of this.spots) {
          for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + t * 6; ctx.fillStyle = i % 3 ? BLUE.mid : BLUE.core; ctx.fillRect(Math.round(sx + ox + Math.cos(a) * 7 * k), Math.round(fy - 1 + Math.sin(a) * 2 * k), 1, 1); }
          blueFlame(ctx, sx + ox, fy, 7 * k, t, sx);
        }
      }
    }
    light() {
      if (this.state === 'portal') return { x: this.cx, y: this.y + 6, r: 26, color: '#4a8aff', intensity: 0.6 * this.alpha };
      return { x: this.cx, y: this.y + 10, r: 34 + 40 * this.ignite + (this.phase === 2 ? 16 : 0) + (this.puffs.length ? 20 : 0), color: '#4a8aff', intensity: 0.5 + 0.4 * this.ignite };
    }
  }

  // ================================================================ AZURE MINIONS
  // tiny zombies, the same blue fire: claws, leaping slams, the odd fireball. 12 x 14, painted by hand.
  const MINI = { walk: 66, reach: 14, wind: 0.26, recover: 0.5, dmg: 5, leapV: -250, slam: 6, wave: 5 };
  const MCOL = { skin: '#7d9488', skinD: '#5a6e62', eye: '#4ad8ff', rag: '#3a3448', ragD: '#28243a', pants: '#24242e', hair: '#22283a' };
  const miniCache = new Map();
  /** frame: walk0 | walk1 | wind | swipe | hop. Returns { cv, hand: [x, y] } (facing right; feet on the bottom row). */
  function miniSprite(frame, facing) {
    const key = frame + facing;
    let s = miniCache.get(key);
    if (s) return s;
    const b = new PB(13, 15), px = (x, y, col) => b.set(x, y, C.u32(col));
    // legs
    const legs = { walk0: [[7, 8], [4, 3]], walk1: [[6, 6], [5, 5]], wind: [[7, 7], [4, 4]], swipe: [[8, 9], [4, 3]], hop: [[7, 8], [4, 3]] }[frame];
    for (const [top, bot] of legs) { for (let y = 10; y <= 12; y++) px(Math.round(U.lerp(top, bot, (y - 10) / 3)), y, MCOL.pants); px(bot, 13, '#14141c'); }
    if (frame === 'hop') { px(7, 13, MCOL.pants); px(4, 13, MCOL.pants); }
    // the back arm (behind the body, darker)
    const back = { walk0: [[8, 8], [10, 8]], walk1: [[8, 8], [10, 9]], wind: [[8, 8], [9, 9]], swipe: [[7, 8], [8, 9]], hop: [[4, 5], [3, 4]] }[frame];
    for (const [x, y] of back) px(x, y, MCOL.skinD);
    // body (rags)
    for (let y = 6; y <= 9; y++) for (let x = 4; x <= 7; x++) px(x, y, x === 4 || y === 9 ? MCOL.ragD : MCOL.rag);
    px(5, 9, MCOL.skinD);                                                    // a tear in the rags
    // head
    for (let y = 1; y <= 5; y++) for (let x = 3; x <= 8; x++) { if (y === 1 && (x === 3 || x === 8)) continue; px(x, y, x === 3 ? MCOL.skinD : MCOL.skin); }
    for (const [x, y] of [[4, 1], [5, 1], [6, 1], [3, 2], [4, 0]]) px(x, y, MCOL.hair);
    px(7, 3, MCOL.eye); px(6, 3, '#0c0a14'); px(7, 5, '#0c0a14'); px(8, 5, '#0c0a14');
    // the front arm, out at you (the hand is where its fire burns)
    const arm = { walk0: [[8, 7], [9, 7], [10, 7]], walk1: [[8, 7], [9, 7], [10, 8]], wind: [[8, 6], [8, 5], [8, 4]], swipe: [[8, 8], [9, 9], [10, 10]], hop: [[8, 5], [9, 4]] }[frame];
    for (const [x, y] of arm) px(x, y, MCOL.skin);
    const hand = { walk0: [11, 7], walk1: [11, 8], wind: [9, 3], swipe: [11, 11], hop: [10, 3] }[frame];
    px(hand[0], hand[1], MCOL.skin);
    b.outline(C.u32('#08060c'));
    let cv = b.toCanvas();
    if (facing < 0) cv = ERX.Sprites.mirror(cv);
    s = { cv, hand: facing < 0 ? [12 - hand[0], hand[1]] : hand };
    miniCache.set(key, s);
    return s;
  }

  class AzureMinion extends Enemy {
    constructor(game, spawn) {
      super(game, spawn);
      this.w = 8; this.h = 13;
      this.x = spawn.x - this.w / 2;
      this.y = (spawn.y !== undefined ? spawn.y : game.level.floorY) - this.h;
      this.maxHp = this.hp = 12; this.damage = 4; this.xp = 0; this.gold = 0;
      this.fixedHp = true;     // (tiny: a couple of hits, none of the extra the other monsters get)
      this.knockback = 1;
      this.color = '#4a7aff';
      this.hurtSfx = 'minionHurt'; this.dieSfx = 'minionDie';
      this.state = 'rise'; this.stateT = 0; this.cool = 0.4; this.stride = 0;
      this.drawOffset = 1; this.anchorX = 6;
    }
    setState(s) { this.state = s; this.stateT = 0; }
    think(dt) {
      const g = this.game, p = this.target(), dx = p.cx - this.cx, adx = Math.abs(dx);
      this.stateT += dt;
      this.cool = Math.max(0, this.cool - dt);
      let want = 0;
      switch (this.state) {
        case 'rise': if (this.stateT > 0.45) this.setState('chase'); break;
        case 'chase':
          if (dx) this.facing = Math.sign(dx);
          if (adx > 10) want = this.facing * MINI.walk;
          if (this.cool > 0 || !this.onGround || this.hurtT > 0) break;
          if (adx < MINI.reach + 2) this.setState('wind');
          else if (adx > 50 && adx < 130 && Math.random() < 0.012) this.setState('hopPrep');
          else if (adx >= 130 && Math.random() < 0.006) {
            g.addProjectile(new AzureFireball(g, { x: this.cx + this.facing * 4, y: this.y + 4, vx: this.facing * 150, vy: -30, damage: 5, r: 3, small: true, source: this }));
            sfx('azureFireball', { minGap: 0.2 }); this.cool = 1.4;
          }
          break;
        case 'wind': if (this.stateT >= MINI.wind) { this.setState('swipe'); this.hit = false; sfx('minionClaw', { minGap: 0.05 }); this.vx = this.facing * 70; } break;
        case 'swipe':
          if (!this.hit) { const box = { x: this.facing > 0 ? this.cx : this.cx - MINI.reach, y: this.y + 2, w: MINI.reach, h: 11 }; if (overlap(box, g.player) && g.player.takeHit(MINI.dmg, this.cx, this) === 'hit') this.hit = true; }
          if (this.stateT >= 0.14) this.setState('recover');
          break;
        case 'recover': if (this.stateT >= MINI.recover) { this.setState('chase'); this.cool = 0.4; } break;
        case 'hopPrep':
          if (this.stateT >= 0.22) { const air = (2 * -MINI.leapV) / 900; this.vy = MINI.leapV; this.vx = U.clamp(dx / air, -160, 160); this.onGround = false; this.setState('hop'); }
          break;
        case 'hop':
          if (this.onGround && this.stateT > 0.1) {
            // a little slam, a little wave of fire each way (just like the big one)
            sfx('azureSlam', { minGap: 0.15 }); g.dust(this.cx, this.y + this.h, 8);
            if (Math.abs(p.cx - this.cx) < 16 && Math.abs(p.feet - (this.y + this.h)) < 18) p.takeHit(MINI.slam, this.cx, this);
            for (const dir of [-1, 1]) g.addProjectile(new AzureWave(g, { x: this.cx + dir * 5, y: this.y + this.h, dir, damage: MINI.wave, speed: 130, h: 7, life: 0.5, source: this }));
            this.setState('recover'); this.vx = 0;
          }
          break;
      }
      if (this.onGround && this.state !== 'hop') this.vx = toward(this.vx, this.hurtT > 0 ? 0 : want, 600 * dt);
      const x0 = this.x;
      this.vy = Math.min(this.vy + 900 * dt, 420);
      Physics.move(g.level, this, dt);
      if (this.onGround) this.stride += Math.abs(this.x - x0) / 3;
    }
    frame() {
      if (this.state === 'wind') return 'wind';
      if (this.state === 'swipe' || this.state === 'recover') return 'swipe';
      if (this.state === 'hop' || this.state === 'hopPrep' || !this.onGround) return 'hop';
      return Math.floor(this.stride) % 2 ? 'walk1' : 'walk0';
    }
    sprite() { return miniSprite(this.frame(), this.facing).cv; }
    render(ctx, cam) {
      if (this._erased) return;
      const rise = this.state === 'rise' ? Math.min(1, this.stateT / 0.45) : 1;
      if (rise < 1) {
        // climbing up out of a pool of blue fire
        const s = miniSprite('walk1', this.facing), x = Math.round(this.cx - 6) - cam.ix, y = Math.round(this.y + this.h - 14 + this.drawOffset) - cam.iy, hh = Math.max(1, Math.round(15 * rise));
        ctx.drawImage(s.cv, 0, 0, 13, hh, x, y + 15 - hh, 13, hh);
        blueFlame(ctx, this.cx - cam.ix, this.y + this.h - cam.iy, 8 * (1 - rise) + 2, this.t, this.uid);
        return;
      }
      super.render(ctx, cam);
      const s = miniSprite(this.frame(), this.facing), x = Math.round(this.cx - (this.facing < 0 ? 12 - this.anchorX : this.anchorX)) - cam.ix, y = Math.round(this.y + this.h - 15 + this.drawOffset) - cam.iy;
      blueFlame(ctx, x + s.hand[0], y + s.hand[1] + 1, this.state === 'swipe' || this.state === 'wind' ? 5 : 4, this.t, this.uid);
      ctx.fillStyle = BLUE.core; ctx.fillRect(x + (this.facing < 0 ? 5 : 7), y + 3, 1, 1);   // its eye, glowing
    }
    light() { return { x: this.cx, y: this.y + 5, r: 18, color: '#4a8aff', intensity: 0.6 }; }
  }

  // ================================================================ blue fire, thrown
  class AzureFireball {
    constructor(game, o) {
      this.game = game; this.azure = true;
      this.x = o.x; this.y = o.y; this.vx = o.vx; this.vy = o.vy;
      this.r = o.r || 4; this.damage = o.damage || 10; this.source = o.source || null; this.small = !!o.small;
      this.t = 0; this.dead = false; this.trail = [];
    }
    update(dt, game) {
      if (this.dead) return;
      this.t += dt;
      this.vy = Math.min(this.vy + 120 * dt, 400);
      this.trail.unshift(this.x, this.y); if (this.trail.length > 10) this.trail.length = 10;
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.t > 3) return this.pop();
      const L = game.level;
      if (L.isSolid(Math.floor(this.x / 16), Math.floor(this.y / 16))) { this.x -= this.vx * dt; this.y -= this.vy * dt; return this.pop(); }
      const p = game.player;
      if (p.intangible) return;
      const nx = U.clamp(this.x, p.x, p.x + p.w), ny = U.clamp(this.y, p.y, p.y + p.h);
      if ((this.x - nx) ** 2 + (this.y - ny) ** 2 > this.r * this.r) return;
      const res = p.takeHit(this.damage, this.x - Math.sign(this.vx || 1) * 24, this.source);
      if (res === 'hit' || res === 'blocked') this.pop();
    }
    pop() {
      this.dead = true;
      sfx('azureBurst', { minGap: 0.05 });
      embers(this.game, this.x, this.y, this.small ? 6 : 12, 4);
    }
    render(ctx, cam) {
      const ox = -cam.ix, oy = -cam.iy, r = this.r;
      for (let i = this.trail.length - 2; i >= 0; i -= 2) { const k = 1 - i / this.trail.length; ctx.globalAlpha = 0.5 * k; ctx.fillStyle = BLUE.mid; ctx.fillRect(Math.round(this.trail[i] + ox) - 1, Math.round(this.trail[i + 1] + oy) - 1, 2, 2); }
      ctx.globalAlpha = 1;
      const x = Math.round(this.x + ox), y = Math.round(this.y + oy), sp = Math.hypot(this.vx, this.vy) || 1, ux = this.vx / sp, uy = this.vy / sp;
      blueGlow(ctx, x, y, r * 3, 0.4);
      // fire streaming out behind it
      for (let i = 4; i >= 1; i--) {
        const k = 1 - i / 5, wob = Math.sin(this.t * 22 + i * 1.7) * 0.9;
        ball(ctx, x - ux * i * r * 0.75 - uy * wob, y - uy * i * r * 0.75 + ux * wob, Math.max(1, Math.round(r * k)), i > 2 ? BLUE.edge : BLUE.mid);
      }
      ball(ctx, x, y, r, BLUE.edge); ball(ctx, x, y, r - 1, BLUE.mid); ball(ctx, x, y, Math.max(1, r - 2), BLUE.hot);
      ctx.fillStyle = BLUE.core; ctx.fillRect(x - (r > 3 ? 1 : 0), y - (r > 3 ? 1 : 0), r > 3 ? 2 : 1, r > 3 ? 2 : 1);
    }
  }
  /** Blue fire racing along the floor (jump it). */
  class AzureWave {
    constructor(game, o) {
      this.game = game; this.azure = true;
      this.x = o.x; this.y = o.y; this.dir = o.dir; this.speed = o.speed || 170; this.damage = o.damage || 10; this.h = o.h || 12;
      this.life = o.life || 1.3; this.source = o.source || null; this.t = 0; this.dead = false; this.hit = false;
    }
    update(dt, game) {
      if (this.dead) return;
      this.t += dt;
      this.x += this.dir * this.speed * dt;
      const L = game.level, tx = Math.floor((this.x + this.dir * 4) / 16), ty = Math.floor((this.y - 2) / 16);
      if (this.t > this.life || L.isSolid(tx, ty) || !L.isSolid(tx, Math.floor((this.y + 2) / 16))) { this.dead = true; embers(game, this.x, this.y - 4, 5, 4); return; }
      if (Math.random() < dt * 30) embers(game, this.x, this.y - 3, 1, 3);
      const p = game.player;
      if (this.hit || p.intangible) return;
      const h = this.h * Math.min(1, this.t / 0.12);
      if (Math.abs(p.cx - this.x) < 6 && p.feet > this.y - h && p.y < this.y) {
        const res = p.takeHit(this.damage, this.x - this.dir * 24, this.source);
        if (res === 'hit' || res === 'blocked') this.hit = true;
      }
    }
    render(ctx, cam) {
      const x = this.x - cam.ix, y = this.y - cam.iy, k = Math.min(1, this.t / 0.12) * Math.min(1, (this.life - this.t) / 0.25);
      for (let i = 0; i < 4; i++) blueFlame(ctx, x - this.dir * i * 3, y, this.h * k * (1 - i * 0.2), this.t + i, i * 1.3);
    }
  }

  /**
   * A geyser of blue fire, up out of the floor. First the floor cracks and glows where it's coming (warn s:
   * get out of there), then a column of fire, taller than you are. o: { x, y (the floor), warn, delay, damage }
   */
  class AzureGeyser {
    constructor(game, o) {
      this.game = game; this.azure = true;
      this.x = o.x; this.y = o.y; this.warn = o.warn || 0.7; this.damage = o.damage || 12; this.h = o.h || 46; this.w = o.w || 12;
      this.source = o.source || null; this.t = -(o.delay || 0); this.dead = false; this.hit = false; this.up = false;
    }
    update(dt, game) {
      if (this.dead) return;
      this.t += dt;
      if (this.t < 0) return;
      if (!this.up && this.t >= this.warn) { this.up = true; sfx('azureGeyser', { minGap: 0.05 }); ERX.FX.shake(1.5, 0.12); embers(game, this.x, this.y - 6, 10, 5); }
      if (!this.up) { if (Math.random() < dt * 18) embers(game, this.x, this.y - 2, 1, 5); return; }
      const e = this.t - this.warn;
      if (e > 0.55) { this.dead = true; return; }
      const p = game.player;
      if (this.hit || p.intangible || e > 0.42) return;
      const top = this.y - this.h * Math.min(1, e / 0.07);
      if (Math.abs(p.cx - this.x) < this.w / 2 + p.w / 2 - 2 && p.feet > top + 2 && p.y < this.y) {
        const r = p.takeHit(this.damage, this.x, this.source);
        if (r === 'hit' || r === 'blocked') this.hit = true;
      }
    }
    render(ctx, cam) {
      if (this.t < 0) return;
      const x = Math.round(this.x) - cam.ix, y = Math.round(this.y) - cam.iy, t = this.t, hw = Math.round(this.w / 2);
      if (!this.up) {
        // the floor cracks and glows where it's coming up (brighter, wider, the closer it gets)
        const k = t / this.warn, w = Math.round(3 + k * (hw + 2));
        blueGlow(ctx, x, y - 3, 8 + k * 12, 0.3 + 0.4 * k);
        ctx.fillStyle = BLUE.edge; ctx.fillRect(x - w - 1, y - 2, w * 2 + 3, 3);
        ctx.fillStyle = Math.floor(t * 14) % 2 ? BLUE.hot : BLUE.mid; ctx.fillRect(x - w, y - 1, w * 2 + 1, 1);
        if (k > 0.25) for (const fx of [-w + 1, 0, w - 1]) blueFlame(ctx, x + fx, y, 2 + 5 * k, t, this.x + fx);
        return;
      }
      const e = t - this.warn, fade = e > 0.4 ? Math.max(0, 1 - (e - 0.4) / 0.15) : 1, h = Math.round(this.h * Math.min(1, e / 0.07) * fade);
      if (h < 1) return;
      blueGlow(ctx, x, y - h / 2, this.h * 0.7, 0.45 * fade);
      // the column: a dark edge, blue, hot blue, a white core... with ragged sides and flames licking off the top
      ctx.fillStyle = BLUE.edge; ctx.fillRect(x - hw - 1, y - h, hw * 2 + 3, h);
      ctx.fillStyle = BLUE.mid; ctx.fillRect(x - hw, y - h, hw * 2 + 1, h);
      ctx.fillStyle = BLUE.hot; ctx.fillRect(x - hw + 2, y - h + 2, Math.max(1, hw * 2 - 3), Math.max(0, h - 2));
      ctx.fillStyle = BLUE.core; ctx.fillRect(x - 1, y - h + 4, 3, Math.max(0, h - 6));
      for (let yy = 0; yy < h; yy += 3) { const s = Math.sin(t * 30 + yy * 0.7); ctx.fillStyle = s > 0 ? BLUE.mid : BLUE.edge; ctx.fillRect(s > 0 ? x + hw + 1 : x - hw - 2, y - yy - 2, 1, 2); }
      blueFlame(ctx, x - 3, y - h + 2, 8 * fade, t, 1); blueFlame(ctx, x + 3, y - h + 2, 7 * fade, t, 2.3); blueFlame(ctx, x, y - h, 11 * fade, t, 0.7);
      if (e < 0.12) { ctx.fillStyle = BLUE.core; ctx.fillRect(x - hw - 4, y - 2, hw * 2 + 9, 2); }   // the burst at its foot
    }
  }
  /**
   * The rain: a ring closes in on the floor where it'll land (warn s), and the last part of that, a ball of
   * blue fire comes screaming down out of the dark. o: { x, y (the floor), warn, damage }
   */
  class AzureMeteor {
    constructor(game, o) {
      this.game = game; this.azure = true;
      this.x = o.x; this.y = o.y; this.warn = o.warn || 0.75; this.fall = 0.32; this.drop = 170; this.damage = o.damage || 10;
      this.source = o.source || null; this.t = 0; this.dead = false; this.boomed = false;
    }
    update(dt, game) {
      if (this.dead) return;
      this.t += dt;
      if (!this.boomed && this.t >= this.warn) {
        this.boomed = true;
        sfx('azureBurst', { minGap: 0.04 }); ERX.FX.shake(1.5, 0.1); embers(game, this.x, this.y - 4, 12, 6); game.dust(this.x, this.y, 6);
        const p = game.player;
        if (!p.intangible && Math.abs(p.cx - this.x) < 13 && p.feet > this.y - 26 && p.y < this.y) p.takeHit(this.damage, this.x, this.source);
      }
      if (this.t > this.warn + 0.35) this.dead = true;
    }
    render(ctx, cam) {
      const x = Math.round(this.x) - cam.ix, y = Math.round(this.y) - cam.iy, t = this.t;
      if (!this.boomed) {
        const k = Math.min(1, t / this.warn), rx = 14 - 6 * k;
        blueGlow(ctx, x, y - 1, 8 + 6 * k, 0.2 + 0.3 * k);
        ctx.globalAlpha = 0.5 + 0.5 * k;
        for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + t * 3; ctx.fillStyle = i % 2 ? BLUE.mid : BLUE.hot; ctx.fillRect(Math.round(x + Math.cos(a) * rx), Math.round(y - 1 + Math.sin(a) * rx * 0.25), 1, 1); }
        ctx.globalAlpha = 1;
        const ft = t - (this.warn - this.fall);
        if (ft > 0) {
          const by = Math.round(y - this.drop * (1 - ft / this.fall));
          for (let i = 5; i >= 1; i--) ball(ctx, x, by - i * 5, Math.max(1, Math.round(4 - i * 0.6)), i > 2 ? BLUE.edge : BLUE.mid);
          blueGlow(ctx, x, by, 12, 0.4);
          ball(ctx, x, by, 4, BLUE.edge); ball(ctx, x, by, 3, BLUE.mid); ball(ctx, x, by, 2, BLUE.hot);
          ctx.fillStyle = BLUE.core; ctx.fillRect(x - 1, by - 1, 2, 2);
        }
        return;
      }
      const k = (t - this.warn) / 0.35;
      blueGlow(ctx, x, y - 6, 18 * (1 - k * 0.5), 0.5 * (1 - k));
      blueFlame(ctx, x - 4, y, 9 * (1 - k), t, 1); blueFlame(ctx, x + 4, y, 8 * (1 - k), t, 2); blueFlame(ctx, x, y, 12 * (1 - k), t, 3);
    }
  }

  Object.assign(E.TYPES, { azure: AzureZombie, azureMinion: AzureMinion });
  Object.assign(E, { AzureZombie, AzureMinion });
  ERX.AzureBoss = { AZURE_LOOK, APOSE, AZ, MOVES, BLUE, blueFlame, embers, AzureZombie, AzureMinion, AzureFireball, AzureWave, AzureGeyser, AzureMeteor, miniSprite };
})(window.ERX = window.ERX || {});
