/*
 * ELEMENT ABILITIES — the engine behind every element's moves.
 *
 *   KINDS      how each kind of move behaves + looks (slash, spikes, orb...)
 *   STATUS     status effects (burn, chill, poison, blind...)
 *   AbilityState   one per player: cooldowns, Ultimate charge, buffs
 *
 * The moves themselves live in js/data/kits/*.js. A move is an object:
 *   { name, kind, p, dmg, cd, mp, desc, draw(e, ctx, ox, oy, A), tick(e, dt, A), onEnd(e, A) }
 * `kind` picks a built-in behaviour (or 'custom' with its own spawn/update);
 * every move brings its OWN draw function, so no two moves look alike.
 * `A` (Abilities.api) is the toolkit moves use: drawing, hitting, spawning.
 * An UPGRADED move keeps its element's colours but is stronger, bigger, faster (shorter cooldown, quicker
 * projectiles) and more detailed (its own glow layer, a trail, bursts on hit). Upgrading the M1 swaps it for
 * the kit's m1Up - a whole new move - and upgrading the dash adds the kit's dashUp.
 * Ultimates play a cutscene first (js/game/ultimate.js), then run.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, C = ERX.Color;
  const { Physics } = ERX.GameEngine;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const SLOTS = ['m1', 's1', 's2', 's3', 's4', 's5', 'ult'];

  // =============================================================== STATUS
  // dur (s), dps, slow (speed multiplier), stun, blind, confuse, vuln (damage
  // taken multiplier), stacks (+ `into` when full), launch (knock-up).
  const STATUS = {
    burn: { name: 'BURN', color: '#ff7a3a', dur: 3, dps: 3, fx: 'embers' },
    scorch: { name: 'SCORCH', color: '#ff5a1a', dur: 3, dps: 4.5, fx: 'cinders' },
    sunburn: { name: 'SUNBURN', color: '#ffd34d', dur: 3, dps: 3, vuln: 1.1, fx: 'flares' },
    poison: { name: 'POISON', color: '#7ae05a', dur: 5, dps: 1.5, stacks: 3, fx: 'bubbles' },
    toxin: { name: 'TOXIN', color: '#b0e060', dur: 5, dps: 1.6, stacks: 5, fx: 'bubbles' },
    bleed: { name: 'BLEED', color: '#e0303a', dur: 3, dps: 2.5, lifesteal: 0.5, fx: 'drips' },
    haunt: { name: 'HAUNTED', color: '#a8fff0', dur: 4, dps: 2, fx: 'souls' },
    erode: { name: 'ERODE', color: '#a85cff', dur: 4, dps: 1.5, vuln: 1.2, fx: 'void' },
    doom: { name: 'DOOM', color: '#9ab0a0', dur: 5, dps: 1, vuln: 1.25, fx: 'ashes' },
    chill: { name: 'CHILL', color: '#a8e8ff', dur: 2.5, slow: 0.5, stacks: 3, into: 'freeze', fx: 'snow' },
    crystallize: { name: 'CRYSTAL', color: '#7af0e0', dur: 3, slow: 0.7, stacks: 3, into: 'encase', fx: 'glints' },
    freeze: { name: 'FROZEN', color: '#d8f4ff', dur: 1.6, stun: true, tint: '#a8e8ff' },
    encase: { name: 'ENCASED', color: '#7af0e0', dur: 1.6, stun: true, tint: '#7af0e0' },
    timestop: { name: 'TIME STOP', color: '#c8d8ff', dur: 4, stun: true, tint: '#8a90b0' },
    shock: { name: 'SHOCK', color: '#ffd23a', dur: 0.5, stun: true, fx: 'sparks' },
    stagger: { name: 'STAGGER', color: '#c8a070', dur: 0.6, stun: true },
    sleep: { name: 'ASLEEP', color: '#d8dcff', dur: 3.5, stun: true, wake: true, fx: 'zzz' },
    deafen: { name: 'DEAFENED', color: '#5ae8a8', dur: 2.5, confuse: true, fx: 'notes' },
    confuse: { name: 'CONFUSED', color: '#ff7ad8', dur: 3, confuse: true, fx: 'ripples' },
    starstruck: { name: 'STARSTRUCK', color: '#ffd34d', dur: 2.5, confuse: true, fx: 'stars' },
    blind: { name: 'BLIND', color: '#8a7ab8', dur: 3, blind: true, fx: 'gloom' },
    dazzle: { name: 'DAZZLED', color: '#fff4c8', dur: 2.5, blind: true, fx: 'motes' },
    wet: { name: 'SOAKED', color: '#3aa0ff', dur: 3.5, slow: 0.75, fx: 'droplets' },
    slow: { name: 'SLOWED', color: '#e8d08a', dur: 3, slow: 0.45 },
    heavy: { name: 'HEAVY', color: '#9a8ad0', dur: 3, slow: 0.5 },
    magnetize: { name: 'MAGNETIZED', color: '#ff4a6a', dur: 3, slow: 0.7, vuln: 1.1 },
    expose: { name: 'EXPOSED', color: '#b0b0c8', dur: 4, vuln: 1.35 },
    mark: { name: 'MARKED', color: '#c86aff', dur: 5, vuln: 1.3 },
    shatter: { name: 'SHATTERED', color: '#c8d0e0', dur: 4, vuln: 1.3 },
    launch: { name: 'AIRBORNE', color: '#9ae8ff', dur: 0.8, launch: 230 },
  };
  const RANDOM_STATUS = Object.keys(STATUS).filter((k) => k !== 'timestop' && k !== 'freeze' && k !== 'encase');

  // ===================================================== MOVE DEFAULTS
  // m1 = basic attack numbers; s = as a skill. dmg is per hit (per tick for zones).
  const DEF = {
    slash: { m1: { dmg: 8, cd: 0.36 } }, whip: { m1: { dmg: 8, cd: 0.4 }, s: { dmg: 14, cd: 4, mp: 4 } },
    fist: { m1: { dmg: 9, cd: 0.42 } }, lunge: { m1: { dmg: 8, cd: 0.42 } }, zap: { m1: { dmg: 7, cd: 0.36 } },
    scythe: { m1: { dmg: 10, cd: 0.48 } }, pulse: { m1: { dmg: 7, cd: 0.4 }, s: { dmg: 12, cd: 4, mp: 4 } },
    random: { m1: { dmg: 8, cd: 0.42 } },
    volley: { m1: { dmg: 4, cd: 0.42 }, s: { dmg: 6, cd: 4, mp: 5 } },
    spikes: { m1: { dmg: 9, cd: 0.5 }, s: { dmg: 12, cd: 5, mp: 6 } },
    orb: { s: { dmg: 18, cd: 4, mp: 5 } }, pillar: { s: { dmg: 14, cd: 5, mp: 6 } }, wave: { s: { dmg: 14, cd: 5, mp: 6 } },
    burst: { s: { dmg: 14, cd: 6, mp: 6 } }, rain: { s: { dmg: 8, cd: 7, mp: 7 } }, zone: { s: { dmg: 3, cd: 8, mp: 7 } },
    vortex: { s: { dmg: 3, cd: 8, mp: 8 } }, chain: { s: { dmg: 14, cd: 5, mp: 6 } }, strike: { s: { dmg: 16, cd: 6, mp: 7 } },
    boomerang: { s: { dmg: 12, cd: 4, mp: 5 } }, blink: { s: { dmg: 14, cd: 4, mp: 4 } }, heal: { s: { dmg: 0, cd: 12, mp: 8 } },
    buff: { s: { dmg: 0, cd: 14, mp: 8 } }, turret: { s: { dmg: 5, cd: 12, mp: 8 } }, clone: { s: { dmg: 14, cd: 8, mp: 7 } },
    orbit: { s: { dmg: 6, cd: 10, mp: 7 } }, drain: { s: { dmg: 4, cd: 8, mp: 6 } }, meteor: { s: { dmg: 30, cd: 8, mp: 8 } },
    slam: { s: { dmg: 24, cd: 6, mp: 6 } }, beam: { s: { dmg: 4, cd: 6, mp: 7 } }, aura: { s: { dmg: 3, cd: 10, mp: 7 } },
    wild: { s: { dmg: 0, cd: 6, mp: 6 } },
  };

  // auto descriptions (per kind) — {E} = element name
  const DESC = {
    slash: 'Swing a crescent of {E} that flies forward.', whip: 'Lash out with a whip of {E}.', fist: 'Throw a punch of solid {E}.',
    lunge: 'Lunge forward and stab.', zap: 'Fire an instant bolt of {E}.', scythe: 'Sweep a scythe in a wide arc.',
    pulse: 'Send out rings of {E} that pass through enemies.', random: 'A different attack every swing. Good luck.',
    volley: 'Launch a volley of {E}.', spikes: 'Spikes of {E} burst out of the ground.', orb: 'Hurl an orb of {E} that explodes.',
    pillar: 'Pillars of {E} erupt in front of you.', wave: 'A wave of {E} rolls along the ground.', burst: 'Explode with {E} all around you.',
    rain: '{E} rains down from above.', zone: 'Leave a lingering field of {E}.', vortex: 'A vortex of {E} drags enemies in.',
    chain: 'Lightning that jumps from enemy to enemy.', strike: 'Call bolts down from the sky.', boomerang: 'Throw it out... and it comes back.',
    blink: 'Teleport forward and blast where you land.', heal: 'Restore your health.', buff: 'Power yourself up for a while.',
    turret: 'Summon a turret that fires at enemies.', clone: 'A clone of you dashes through enemies.', orbit: 'Things orbit you and hit what they touch.',
    drain: 'Drain life from enemies to heal yourself.', meteor: 'Drop a meteor from the sky.', slam: 'Crush the ground from above.',
    beam: 'Fire a continuous beam.', aura: 'Surround yourself with burning {E}.', wild: 'Cast a random skill from ANOTHER element.',
  };

  // ============================================================== HELPERS
  function rainbowColor(t) { return 'hsl(' + Math.round(((t * 120) % 360 + 360) % 360) + ',95%,62%)'; }
  function toHex(css) {   // tiny hsl -> hex for Color helpers
    const m = /hsl\((\d+),(\d+)%,(\d+)%\)/.exec(css);
    if (!m) return css;
    const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100;
    const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, '0'); };
    return '#' + f(0) + f(8) + f(4);
  }

  /**
   * Colours for an element's moves. Upgrading never changes the colour (up = the same colours, a brighter core):
   * upgraded moves are bigger, stronger, faster and more detailed instead.
   */
  function palette(el, kit, up) {
    let base = kit.color || el.color;                 // awakened kits bring their own colour
    if (kit === KITS_CHAOS()) base = toHex(rainbowColor(Math.random() * 3));
    return { c: base, d: C.shade(base, -0.45), l: C.mix(base, '#ffffff', 0.5), core: up ? '#ffffff' : C.mix(base, '#ffffff', 0.25), up: !!up, fx: kit.fx };
  }
  function KITS_CHAOS() { return ERX.Kits.chaos; }

  /** First solid/platform surface at or below y. */
  function groundAt(level, x, y) {
    const tx = Math.floor(x / 16);
    for (let ty = Math.max(0, Math.floor(y / 16)); ty < level.H; ty++) {
      if (level.isSolid(tx, ty) || level.isPlatform(tx, ty)) return ty * 16;
    }
    return y;
  }
  const solidAt = (level, x, y) => level.isSolid(Math.floor(x / 16), Math.floor(y / 16));

  /** Particles in an element's style. */
  function puff(game, x, y, fx, pal, n, spread) {
    spread = spread || 1;
    for (let i = 0; i < n; i++) {
      const p = { x: x + rnd(-3, 3) * spread, y: y + rnd(-3, 3) * spread, vx: rnd(-30, 30) * spread, vy: rnd(-30, 30) * spread, life: rnd(0.3, 0.7), color: Math.random() < 0.6 ? pal.c : pal.l, size: Math.random() < 0.3 ? 2 : 1, fadeOut: 0.3 };
      switch (fx) {
        case 'embers': case 'cinders': case 'flares': p.vy = rnd(-60, -20); p.color = Math.random() < 0.5 ? pal.c : (pal.up ? '#ffffff' : '#ffd34d'); break;
        case 'snow': p.vy = rnd(-10, 20); p.color = Math.random() < 0.5 ? '#ffffff' : pal.l; p.wobble = 8; p.wobbleRate = 3; break;
        case 'leaves': p.vy = rnd(-20, 30); p.ay = 40; p.color = Math.random() < 0.5 ? pal.c : C.shade(pal.c, -0.25); p.wobble = 10; p.wobbleRate = 4; p.size = 2; break;
        case 'sparks': p.vx *= 3; p.vy *= 3; p.life = rnd(0.1, 0.3); p.color = Math.random() < 0.5 ? '#ffffff' : pal.c; break;
        case 'bubbles': case 'droplets': p.vy = rnd(-40, -10); p.size = Math.random() < 0.5 ? 2 : 1; break;
        case 'drips': p.vy = rnd(0, 30); p.ay = 300; break;
        case 'gloom': case 'void': p.color = Math.random() < 0.6 ? pal.d : pal.c; p.size = 2; p.grow = 2; p.life = rnd(0.4, 0.8); break;
        case 'stars': p.color = Math.random() < 0.5 ? '#ffffff' : pal.c; p.life = rnd(0.3, 0.9); break;
        case 'fog': p.color = Math.random() < 0.5 ? '#e0e8f0' : pal.l; p.size = 2; p.grow = 3; p.vx *= 0.4; p.vy *= 0.4; p.life = rnd(0.6, 1.1); break;
        case 'souls': case 'wisps': p.vy = rnd(-40, -15); p.wobble = 6; p.wobbleRate = 5; break;
        case 'chaos': p.color = toHex(rainbowColor(Math.random() * 3)); break;
        default: break;
      }
      game.fx.add(p);
    }
  }

  // ============================================================== TARGETS
  /** Everything the player's moves can hit: monsters, training dummies, the tutorial dummy. */
  function targets(game) {
    const out = [];
    for (const e of game.enemies) if (!e.dead && !e.down) out.push(e);
    if (game.dummy && game.dummy.spawnT > 0.3) {
      const d = game.dummy;
      out.push({ uid: 'tut-dummy', box: d.box, get cx() { return d.box.x + d.box.w / 2; }, get cy() { return d.box.y + d.box.h / 2; }, tutorial: d });
    }
    return out;
  }
  const centerOf = (t) => ({ x: t.box.x + t.box.w / 2, y: t.box.y + t.box.h / 2 });
  /** Auto-aim: x of the nearest target in front within `range`, else null. */
  function aimX(game, x, dir, range) {
    let best = null, bd = range;
    for (const t of targets(game)) { const c = centerOf(t), d = (c.x - x) * dir; if (d > 4 && d < bd) { bd = d; best = c.x; } }
    return best;
  }

  /** Damage one target with a move (applies status, builds Ultimate charge). splash: this hit is itself a splash (it won't splash again). */
  function damage(game, tg, dmg, dir, e, kb, splash) {
    dmg = Math.max(1, Math.round(dmg));
    if (e.el && ERX.ElementSfx && !splash) ERX.ElementSfx.hit(e.el, dmg, !!e.isAwk, !!e.isUlt);
    const p = game.player;
    if (tg.tutorial) { tg.tutorial.hit(dmg, dir, false); return; }
    const crit = e.up && Math.random() < 0.15;
    tg.hurt(crit ? Math.round(dmg * 1.5) : dmg, dir, crit, kb === undefined ? (e.kb !== undefined ? e.kb : 1) : kb);
    if (!tg.dead && e.status && tg.applyStatus) tg.applyStatus(e.status, e.potency || 0);
    if (e.pal) hitFx(game, tg, dmg, e, splash);
    if (e.isAwk) awkJuice(game, tg, dmg, e);
    if (e.isAwk && !e.isUlt && !splash) awkSplash(game, tg, dmg, e);
    if (p.ab) {
      p.ab.ult = Math.min(100, p.ab.ult + (e.isUlt ? 0 : dmg * 0.55));
      // the Awakening meter fills more slowly (and not while you're already awakened)
      if (!p.ab.awakened() && !e.isUlt && game.element && game.element() && ERX.Awakening.unlocked(game)) p.ab.awk = Math.min(100, p.ab.awk + dmg * ERX.Awakening.FILL);
    }
  }

  /** Awakened hits land harder: sparks in your colours, a jolt, a freeze-frame on big ones, an impact frame on an Ultimate's finisher. */
  function awkJuice(game, tg, dmg, e) {
    const c = centerOf(tg), col = (e.pal && e.pal.l) || '#ffffff', n = Math.min(12, 3 + Math.round(dmg / 6)), now = game.t || 0;
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * (80 + dmg * 2); game.fx.add({ x: c.x, y: c.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 0.25 + Math.random() * 0.25, color: i % 3 ? col : '#ffffff', size: dmg > 25 && i % 4 === 0 ? 2 : 1, fadeOut: 0.2 }); }
    // (rate-limited, so a stream of small hits never turns into a stutter)
    if (dmg >= 8 && now - (game._awkJolt || -9) > 0.1) { game._awkJolt = now; ERX.FX.shake(Math.min(3.5, 0.6 + dmg / 25), 0.1); }
    if (e.isUlt ? dmg >= 30 && now - (game._awkStop || -9) > 0.35 : dmg >= 14 && now - (game._awkStop || -9) > 0.18) { game._awkStop = now; game.hitStop = Math.max(game.hitStop || 0, e.isUlt ? Math.min(0.08, 0.03 + dmg / 2000) : Math.min(0.06, 0.025 + dmg / 1500)); }
    if (e.isUlt && dmg >= 45 && now - (game._awkImpact || -9) > 1 && game.impact) { game._awkImpact = now; game.impact(0.09); }
  }

  // ------------------------------------------------- making hits land
  /** A flash, a ring and a burst of streaks wherever an element move connects. */
  const HITFX = {
    life: 0.22,
    draw(e, ctx, ox, oy, A) {
      const k = e.t / e.life, x = e.x + ox, y = e.y + oy, R = e.r;
      if (e.t < 0.05) A.disc(ctx, x, y, Math.max(1, Math.round(R * 0.55)), '#ffffff');
      A.alpha(ctx, 1 - k, () => {
        A.ring(ctx, x, y, R * (0.4 + k), e.pal.l, R * (0.4 + k));
        for (let i = 0; i < 6; i++) { const a = e.a0 + i * 1.047, r0 = R * 0.5 * (1 + k), r1 = R * (0.9 + k); A.line(ctx, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, i % 2 ? e.pal.c : '#ffffff'); }
      });
    },
  };
  function hitFx(game, tg, dmg, e, splash) {
    const now = game.t || 0;
    if (now - (tg._hfx || -9) < 0.06) return;
    tg._hfx = now;
    const c = centerOf(tg), r = Math.min(18, (e.isAwk ? 7 : 5) + dmg / 6) * (splash ? 0.7 : 1);
    if ((e.isAwk || e.up) && !e.isUlt) puff(game, c.x, c.y, e.pal.fx, e.pal, splash ? 3 : e.isAwk ? 6 : 4, 1.3);
    add(game, HITFX, { x: c.x + (Math.random() - 0.5) * 6, y: c.y + (Math.random() - 0.5) * 6, pal: e.pal, r, a0: Math.random() * 6, isAwk: e.isAwk && !e.isUlt, juice: true });
  }
  /** A quick ring showing a splash spreading out. */
  const SPLASHFX = { life: 0.28, draw(e, ctx, ox, oy, A) { const k = e.t / e.life; A.alpha(ctx, 1 - k, () => { A.ring(ctx, e.x + ox, e.y + oy, e.r * (0.3 + k * 0.7), e.pal.c, e.r * (0.3 + k * 0.7) * 0.6, 2); A.ring(ctx, e.x + ox, e.y + oy, e.r * (0.2 + k * 0.6), '#ffffff', e.r * (0.2 + k * 0.6) * 0.6, 3); }); } };
  /** Awakened moves are built for crowds: every hit splashes onto everything near what it hit. */
  function awkSplash(game, tg, dmg, e) {
    const c = centerOf(tg), R = 34 * (e.up ? 1.3 : 1), now = e.t || 0;
    if (!e._splash) e._splash = new Map();
    let any = false;
    for (const o of targets(game)) {
      if (o === tg || o.tutorial || o.dead) continue;
      const oc = centerOf(o);
      if (Math.hypot(oc.x - c.x, oc.y - c.y) > R) continue;
      const last = e._splash.get(o.uid);
      if (last !== undefined && now - last < 0.25) continue;
      e._splash.set(o.uid, now); any = true;
      damage(game, o, dmg * 0.45, oc.x >= c.x ? 1 : -1, e, 0.5, true);
    }
    if (any) add(game, SPLASHFX, { x: c.x, y: c.y, pal: e.pal, r: R, isAwk: true, juice: true });
  }
  /** The burst at the end of an awakened M1 combo. */
  const FINISHFX = { life: 0.35, draw(e, ctx, ox, oy, A) { const k = e.t / e.life, x = e.x + ox, y = e.y + oy; A.alpha(ctx, 1 - k, () => { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + e.t * 3, r0 = 4 + k * 10, r1 = 12 + k * 34; A.line(ctx, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, i % 2 ? e.pal.c : '#ffffff', i % 3 ? 1 : 2); } A.star(ctx, x, y, Math.round(3 + (1 - k) * 4), '#ffffff', e.pal.l); }); } };

  /** Hit every target `test` accepts. once: each target only once per effect; otherwise every `every` seconds. */
  function hitWhere(game, e, test, o) {
    o = o || {};
    let any = false;
    for (const tg of targets(game)) {
      if (!test(tg.box, tg)) continue;
      if (o.once !== false) { if (e.hit.has(tg.uid)) continue; e.hit.add(tg.uid); }
      else { const last = e.hitT.get(tg.uid); if (last !== undefined && e.t - last < (o.every || 0.4)) continue; e.hitT.set(tg.uid, e.t); }
      const c = centerOf(tg);
      damage(game, tg, e.dmg * (o.mult || 1), o.dir || (c.x >= e.x ? 1 : -1), e, o.kb);
      if (o.onHit) o.onHit(tg);
      any = true;
    }
    return any;
  }
  const inBox = (bx) => (b) => Physics.rectsOverlap(b, bx);
  const inCircle = (x, y, r) => (b) => {
    const cx = U.clamp(x, b.x, b.x + b.w), cy = U.clamp(y, b.y, b.y + b.h);
    return (cx - x) * (cx - x) + (cy - y) * (cy - y) <= r * r;
  };
  function nearest(game, x, y, range, exclude) {
    let best = null, bd = range;
    for (const t of targets(game)) {
      if (exclude && exclude.has(t.uid)) continue;
      const c = centerOf(t), d = Math.hypot(c.x - x, c.y - y);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  // ============================================================ DRAWING
  function px(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
  function ring(ctx, x, y, r, col, ry, step) {
    ry = ry || r; step = step || 1;
    const n = Math.max(8, Math.round(r * 2.4 / step));
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * ry, 1, 1, col); }
  }
  /** A filled pixel circle (col2: a highlight on its upper-left), drawn as one span per row. */
  function disc(ctx, x, y, r, col, col2) {
    const n = Math.floor(2 * r + 1e-9), R2 = r * r, I2 = (r - 1.5) * (r - 1.5);
    for (let yy = -r; yy <= r; yy++) {
      const yy2 = yy * yy, ins = (i, lim) => { const xx = -r + i; return xx * xx + yy2 <= lim; };
      // the span of i (xx = -r + i) inside the circle: estimate with sqrt, then settle exactly
      const span = (lim) => {
        const w = Math.sqrt(Math.max(0, lim - yy2));
        let a = Math.max(0, Math.ceil(r - w)), b = Math.min(n, Math.floor(r + w));
        while (a > 0 && ins(a - 1, lim)) a--;
        while (a <= b && !ins(a, lim)) a++;
        while (b < n && ins(b + 1, lim)) b++;
        while (b >= a && !ins(b, lim)) b--;
        return [a, b];
      };
      const [a, b] = span(R2);
      if (a > b) continue;
      let h0 = 1, h1 = 0;
      if (col2) {
        const [c, d] = span(I2);
        let e = Math.ceil(r - yy) - 1;              // last i with xx + yy < 0
        while (e + 1 <= n && -r + (e + 1) + yy < 0) e++;
        while (e >= 0 && !(-r + e + yy < 0)) e--;
        h0 = Math.max(a, c); h1 = Math.min(b, d, e);
      }
      if (h0 > h1) { px(ctx, x - r + a, y + yy, b - a + 1, 1, col); continue; }
      if (h0 > a) px(ctx, x - r + a, y + yy, h0 - a, 1, col);
      px(ctx, x - r + h0, y + yy, h1 - h0 + 1, 1, col2);
      if (b > h1) px(ctx, x - r + h1 + 1, y + yy, b - h1, 1, col);
    }
  }
  function jag(ctx, x0, y0, x1, y1, col, amp, w) {
    const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 7));
    let lx = x0, ly = y0;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const nx = U.lerp(x0, x1, t) + (i < n ? rnd(-amp, amp) : 0), ny = U.lerp(y0, y1, t) + (i < n ? rnd(-amp, amp) : 0);
      line(ctx, lx, ly, nx, ny, col, w);
      lx = nx; ly = ny;
    }
  }
  function line(ctx, x0, y0, x1, y1, col, w) {
    w = w || 1;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) px(ctx, U.lerp(x0, x1, i / n) - (w - 1) / 2, U.lerp(y0, y1, i / n) - (w - 1) / 2, w, w, col);
  }
  /** A crescent arc facing `dir`. */
  function arc(ctx, x, y, r, dir, col, thick, a0, a1) {
    a0 = a0 === undefined ? -1.2 : a0; a1 = a1 === undefined ? 1.2 : a1;
    const n = Math.max(10, Math.round(r * 2.6));
    for (let i = 0; i <= n; i++) {
      const a = U.lerp(a0, a1, i / n);
      const k = Math.sin((i / n) * Math.PI);
      const th = Math.max(1, Math.round(thick * k));
      for (let t = 0; t < th; t++) px(ctx, x + Math.cos(a) * (r - t) * dir, y + Math.sin(a) * (r - t), 1, 1, col);
    }
  }
  /** Projectile shapes. */
  function shape(ctx, s, x, y, ang, pal, sc, t) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const P = (lx, ly, col, w) => px(ctx, x + (lx * ca - ly * sa) * sc, y + (lx * sa + ly * ca) * sc, w || Math.max(1, sc), w || Math.max(1, sc), col);
    switch (s) {
      case 'shard': case 'crystal':
        for (let i = -4; i <= 4; i++) { const w = s === 'crystal' ? 2 - Math.abs(i) / 3 : 1.5 - Math.abs(i) / 4; for (let j = -Math.floor(w); j <= Math.floor(w); j++) P(i, j, j === 0 ? pal.l : pal.c); }
        P(4, 0, '#ffffff'); break;
      case 'blade': for (let i = -3; i <= 3; i++) P(Math.abs(i) * -0.7, i, i === 0 ? '#ffffff' : pal.l); break;
      case 'needle': for (let i = -5; i <= 5; i++) P(i, 0, i > 2 ? '#ffffff' : pal.c); break;
      case 'bubble': ring(ctx, x, y, 3 * sc, pal.l); px(ctx, x - sc, y - 2 * sc, sc, sc, '#ffffff'); break;
      case 'seed': P(0, 0, '#8a5a36', 2); P(1, 0, pal.c); break;
      case 'glob': disc(ctx, x, y, Math.round(2.5 * sc), pal.c, pal.l); break;
      case 'missile': case 'wisp': disc(ctx, x, y, Math.round(2 * sc), pal.c, pal.core); px(ctx, x - 1, y - 1, 1, 1, '#ffffff'); break;
      case 'star': for (const [lx, ly] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) P(lx, ly, lx === 0 && ly === 0 ? '#ffffff' : pal.c); break;
      case 'scrap': { const a2 = t * 15; for (const [lx, ly] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) px(ctx, x + (lx * Math.cos(a2) - ly * Math.sin(a2)) * 1.5 * sc, y + (lx * Math.sin(a2) + ly * Math.cos(a2)) * 1.5 * sc, sc, sc, lx === 0 ? '#ffffff' : pal.c); break; }
      case 'note': px(ctx, x, y - 4 * sc, sc, 5 * sc, pal.c); disc(ctx, x - sc, y + sc, Math.round(1.5 * sc), pal.c); px(ctx, x, y - 4 * sc, 2 * sc, sc, pal.c); break;
      case 'drop': case 'acid': px(ctx, x, y, sc, 3 * sc, s === 'acid' ? pal.c : pal.l); px(ctx, x, y + 2 * sc, sc, sc, '#ffffff'); break;
      case 'sand': for (let i = 0; i < 4; i++) px(ctx, x + rnd(-2, 2), y + rnd(-2, 2), 1, 1, i % 2 ? pal.c : pal.l); break;
      case 'meteor': disc(ctx, x, y, Math.round(3 * sc), pal.c, pal.core); px(ctx, x - sc, y - sc, sc, sc, '#ffffff'); break;
      case 'chaos': px(ctx, x - sc, y - sc, 2 * sc, 2 * sc, toHex(rainbowColor(t * 3 + x * 0.01))); break;
      case 'shuriken': { const a2 = t * 20; for (let k = 0; k < 4; k++) { const aa = a2 + (k * Math.PI) / 2; for (let r = 0; r < 4; r++) px(ctx, x + Math.cos(aa) * r * sc, y + Math.sin(aa) * r * sc, sc, sc, r > 2 ? '#ffffff' : pal.c); } break; }
      case 'saw': ring(ctx, x, y, 4 * sc, pal.c); ring(ctx, x, y, 2 * sc, pal.l); { const a2 = t * 25; for (let k = 0; k < 8; k++) { const aa = a2 + (k * Math.PI) / 4; px(ctx, x + Math.cos(aa) * 5 * sc, y + Math.sin(aa) * 5 * sc, sc, sc, '#ffffff'); } } break;
      case 'moon': { const a2 = t * 14; for (let i = 0; i <= 10; i++) { const aa = a2 + U.lerp(-1.6, 1.6, i / 10); for (let r = 3; r <= 5; r++) px(ctx, x + Math.cos(aa) * r * sc, y + Math.sin(aa) * r * sc, sc, sc, r === 5 ? '#ffffff' : pal.c); } break; }
      case 'ghost': disc(ctx, x, y, Math.round(3 * sc), C.mix(pal.c, '#ffffff', 0.4)); px(ctx, x - sc, y - sc, 1, 1, '#120c1a'); px(ctx, x + sc, y - sc, 1, 1, '#120c1a'); break;
      default: disc(ctx, x, y, Math.round(2 * sc), pal.c, pal.l);
    }
  }

  // ============================================================== EFFECTS
  let EUID = 0;
  class Effect {
    /** kind: a KINDS name, or a custom definition { spawn, update, draw, life }. */
    constructor(game, kind, o) {
      Object.assign(this, { x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, dir: 1, layer: 'front', dmg: 0, kb: 1, p: {} }, o);
      this.game = game;
      if (typeof kind === 'string') { this.kind = kind; this.k = KINDS[kind]; }
      else { this.kind = 'custom'; this.k = kind; if (kind.life !== undefined && (!o || o.life === undefined)) this.life = kind.life; if (kind.layer) this.layer = kind.layer; }
      this.hit = new Set();
      this.hitT = new Map();
      this.id = ++EUID;
      this.A = api(game);
      if (this.k.spawn) this.k.spawn(this, game, this.A);
    }
    update(dt) {
      this.t += dt;
      if (this.k.update) this.k.update(this, dt, this.game, this.A);
      if ((this.isAwk || this.up) && !this.isUlt && !this.juice && this.pal && dt > 0) {
        if (this._lx !== undefined && Math.hypot(this.x - this._lx, this.y - this._ly) > 150 * dt && Math.random() < dt * 45) puff(this.game, this.x, this.y, this.pal.fx, this.pal, 1, 0.5);
        this._lx = this.x; this._ly = this.y;
      }
      if (this.tick) this.tick(this, dt, this.A);
      if (this.t >= this.life) this.dead = true;
      if (this.dead && !this.ended) { this.ended = true; if (this.onEnd) this.onEnd(this, this.A); if (this.k.onEnd) this.k.onEnd(this, this.A); }
    }
    render(ctx, cam) {
      const fn = this.draw || this.k.draw;
      if (fn) fn(this, ctx, -cam.ix, -cam.iy, this.A);
      else if (this.k.render) this.k.render(this, ctx, -cam.ix, -cam.iy, this.game);
    }
  }

  /** Spawn an effect; most kinds then just do their thing. */
  function add(game, kind, o) { const e = new Effect(game, kind, o); game.effects.push(e); return e; }

  // ============================================================== THE TOOLKIT
  /** What moves get as `A`: drawing helpers + hitting + spawning, bound to a game. */
  function api(game) {
    if (game._abApi) return game._abApi;
    const A = {
      g: game,
      get p() { return game.player; },
      rnd, U, C, sfx,
      // drawing
      px, line, ring, disc, arc, jag, shape,
      tri(ctx, x, y, w, h, col, col2) { for (let i = 0; i < Math.abs(h); i++) { const k = i / Math.abs(h), hw = (w / 2) * (1 - k); px(ctx, x - hw, y - (h > 0 ? i : -i), hw * 2, 1, col2 && k > 0.75 ? col2 : col); } },
      star(ctx, x, y, r, col, col2) { for (let i = -r; i <= r; i++) { px(ctx, x + i, y, 1, 1, Math.abs(i) < r / 2 && col2 ? col2 : col); px(ctx, x, y + i, 1, 1, Math.abs(i) < r / 2 && col2 ? col2 : col); } for (let i = -r / 2; i <= r / 2; i++) { px(ctx, x + i, y + i, 1, 1, col); px(ctx, x + i, y - i, 1, 1, col); } },
      glow(ctx, x, y, r, col, a) { ctx.save(); ctx.globalAlpha = (a === undefined ? 0.35 : a); disc(ctx, x, y, Math.round(r), col); ctx.globalAlpha *= 0.6; disc(ctx, x, y, Math.round(r * 1.5), col); ctx.restore(); },
      alpha(ctx, a, fn) { const o = ctx.globalAlpha; ctx.globalAlpha = o * Math.max(0, Math.min(1, a)); fn(); ctx.globalAlpha = o; },
      text(ctx, s2, x, y, col) { ERX.Font.draw(ctx, s2, Math.round(x), Math.round(y), { color: col, align: 'center', outline: '#120c1a' }); },
      fade(e, inT, outT) { return Math.max(0, Math.min(1, e.t / (inT || 0.08), (e.life - e.t) / (outT || 0.15))); },
      // world
      ground(x, y) { return groundAt(game.level, x, y); },
      solid(x, y) { return solidAt(game.level, x, y); },
      near(x, y, range, ex) { return nearest(game, x, y, range, ex); },
      aim(e, range) { return aimX(game, e.x, e.dir, range); },
      targets() { return targets(game); },
      center: centerOf,
      top() { return game.camera.iy - 10; },
      // hitting (once per target per effect, or every `every` s)
      hit(e, box, o) { return hitWhere(game, e, inBox(box), o); },
      hitR(e, x, y, r, o) { return hitWhere(game, e, inCircle(x, y, r), o); },
      tick(e, box, every, o) { return hitWhere(game, e, inBox(box), Object.assign({ once: false, every: every || 0.4 }, o)); },
      tickR(e, x, y, r, every, o) { return hitWhere(game, e, inCircle(x, y, r), Object.assign({ once: false, every: every || 0.4 }, o)); },
      damage(e, t, mult, kb) { damage(game, t, e.dmg * (mult || 1), centerOf(t).x >= e.x ? 1 : -1, e, kb); },
      // spawning (sub-effects inherit the move's colours / damage / status)
      spawn(e, def, o) { return add(game, def, Object.assign({ pal: e.pal, dmg: e.dmg, status: e.status, potency: e.potency, up: e.up, isUlt: e.isUlt, isAwk: e.isAwk, el: e.el, dir: e.dir, x: e.x, y: e.y }, o)); },
      proj(e, o) { return proj(game, e, o.x === undefined ? e.x : o.x, o.y === undefined ? e.y : o.y, o.vx || 0, o.vy || 0, o); },
      blast(e, x, y, r, o) { return blast(game, e, x, y, r, o); },
      puff(e, x, y, n, spread) { puff(game, x, y, e.pal.fx, e.pal, n || 4, spread); },
      shake(a, d) { ERX.FX.shake(a, d); },
      flash(t) { game.flashT = Math.max(game.flashT || 0, t); },
    };
    game._abApi = A;
    return A;
  }
  function blast(game, from, x, y, r, opts) {
    if (from.el && ERX.ElementSfx) ERX.ElementSfx.boom(from.el, r, !!from.isAwk, !!from.isUlt);
    return add(game, 'blastfx', Object.assign({ x, y, r, life: 0.35, pal: from.pal, dmg: from.dmg, status: from.status, potency: from.potency, up: from.up, isUlt: from.isUlt, isAwk: from.isAwk, el: from.el, fx: from.pal.fx }, opts || {}));
  }
  /** A projectile (volley pieces, rain, turret shots...). */
  function proj(game, from, x, y, vx, vy, o) {
    return add(game, 'proj', Object.assign({ x, y, vx, vy, life: 1.2, pal: from.pal, dmg: from.dmg, status: from.status, potency: from.potency, up: from.up, isUlt: from.isUlt, isAwk: from.isAwk, el: from.el, shape: 'orb', scale: from.up ? 1.5 : 1 }, o || {}));
  }

  const KINDS = {
    // ------------------------------------------------ projectile (generic)
    proj: {
      update(e, dt, g) {
        if (e.homing) {
          const tg = nearest(g, e.x, e.y, 160);
          if (tg) { const c = centerOf(tg); const a = Math.atan2(c.y - e.y, c.x - e.x); const sp = Math.hypot(e.vx, e.vy); const cur = Math.atan2(e.vy, e.vx); let da = a - cur; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; const na = cur + U.clamp(da, -e.homing * dt, e.homing * dt); e.vx = Math.cos(na) * sp; e.vy = Math.sin(na) * sp; }
        }
        if (e.gravity) e.vy += e.gravity * dt;
        e.x += e.vx * dt; e.y += e.vy * dt;
        const s = 4 * e.scale;
        const hitAny = hitWhere(g, e, inBox({ x: e.x - s, y: e.y - s, w: s * 2, h: s * 2 }), { dir: Math.sign(e.vx) || e.dir, kb: e.kb });
        if (Math.random() < dt * 30) puff(g, e.x, e.y, e.pal.fx, e.pal, 1, 0.5);
        if ((hitAny && !e.pierce) || solidAt(g.level, e.x, e.y)) {
          e.dead = true;
          puff(g, e.x, e.y, e.pal.fx, e.pal, 5);
          if (e.boom) blast(g, e, e.x, e.y, e.boom);
        }
      },
      render(e, ctx, ox, oy) { shape(ctx, e.shape, e.x + ox, e.y + oy, Math.atan2(e.vy, e.vx), e.pal, e.scale, e.t); },
    },
    // ------------------------------------------------ explosion
    blastfx: {
      spawn(e, g) { sfx('boom', { minGap: 0.05 }); ERX.FX.shake(e.r > 60 ? 3 : 1.5, 0.2); puff(g, e.x, e.y, e.fx, e.pal, Math.min(30, 8 + e.r / 3), e.r / 12); },
      update(e, dt, g) { const r = e.r * Math.min(1, e.t / 0.15); hitWhere(g, e, inCircle(e.x, e.y, r), { kb: 1.4 }); },
      render(e, ctx, ox, oy) {
        const k = e.t / e.life, r = e.r * Math.min(1, e.t / 0.15);
        ctx.globalAlpha = 1 - k;
        disc(ctx, e.x + ox, e.y + oy, Math.max(1, Math.round(r * 0.5 * (1 - k))), e.pal.core);
        ring(ctx, e.x + ox, e.y + oy, r, e.pal.c); ring(ctx, e.x + ox, e.y + oy, r * 0.8, e.pal.l);
        ctx.globalAlpha = 1;
      },
    },
    // ------------------------------------------------ crescent slash
    slash: {
      spawn(e, g) { e.vx = e.dir * e.p.speed; e.size = e.p.size * (e.up ? 1.45 : 1); e.life = e.p.life || 0.35; sfx('swing'); },
      update(e, dt, g) {
        e.x += e.vx * dt;
        if (e.p.style === 'clock') { e.x = g.player.cx + e.dir * 24; e.y = g.player.y + 10; }
        const s = e.size;
        hitWhere(g, e, inBox({ x: e.x - s * 0.7, y: e.y - s, w: s * 1.4, h: s * 2 }), { dir: e.dir });
        if (solidAt(g.level, e.x + e.dir * s * 0.5, e.y)) e.vx = 0;
        if (Math.random() < dt * 40) puff(g, e.x, e.y + rnd(-s, s), e.pal.fx, e.pal, 1, 0.6);
      },
      render(e, ctx, ox, oy) {
        const x = e.x + ox, y = e.y + oy, s = e.size, d = e.dir, P = e.pal, st = e.p.style;
        const fade = 1 - Math.max(0, (e.t - e.life * 0.6) / (e.life * 0.4));
        ctx.globalAlpha = fade * (st === 'wind' || st === 'mist' ? 0.75 : 1);
        if (st === 'moon') { for (let yy = -s; yy <= s; yy++) for (let xx = -s; xx <= s; xx++) { const a = xx * xx + yy * yy <= s * s, b = (xx + d * s * 0.45) ** 2 + yy * yy <= (s * 0.85) ** 2; if (a && !b) px(ctx, x + xx, y + yy, 1, 1, xx * d > s * 0.5 ? '#ffffff' : P.c); } }
        else if (st === 'rift') { for (let i = -s; i <= s; i++) { const w = Math.round((1 - Math.abs(i) / s) * 4 + 1); px(ctx, x - w / 2 + rnd(-1, 1), y + i, w, 1, P.d); px(ctx, x - w / 2 - 1, y + i, 1, 1, P.c); px(ctx, x + w / 2, y + i, 1, 1, P.c); } }
        else if (st === 'clock') { ring(ctx, x, y, s, P.c); ring(ctx, x, y, s - 2, P.d); const a = e.t * 28; line(ctx, x, y, x + Math.cos(a) * s, y + Math.sin(a) * s, P.l, 2); line(ctx, x, y, x + Math.cos(a * 0.3) * s * 0.6, y + Math.sin(a * 0.3) * s * 0.6, '#ffffff', 2); for (let k = 0; k < 12; k++) px(ctx, x + Math.cos(k * 0.52) * (s - 1), y + Math.sin(k * 0.52) * (s - 1), 1, 1, '#ffffff'); }
        else {
          const thick = st === 'wind' ? 2 : st === 'steel' ? 5 : 4;
          arc(ctx, x, y, s, d, P.d, thick + 1);
          arc(ctx, x, y, s - 1, d, P.c, thick);
          arc(ctx, x, y, s - 2, d, st === 'steel' ? '#ffffff' : P.l, Math.max(1, thick - 2));
          if (st === 'flame') for (let i = 0; i < 6; i++) { const a = rnd(-1.1, 1.1); px(ctx, x + Math.cos(a) * (s + rnd(0, 4)) * d, y + Math.sin(a) * s - rnd(0, 3), 1, 2, Math.random() < 0.5 ? '#ffd34d' : P.c); }
          if (st === 'sand' || st === 'mist') for (let i = 0; i < 10; i++) { const a = rnd(-1.2, 1.2); px(ctx, x + Math.cos(a) * rnd(s - 4, s + 2) * d, y + Math.sin(a) * s, st === 'mist' ? 2 : 1, st === 'mist' ? 2 : 1, P.l); }
          if (st === 'storm') jag(ctx, x - d * 4, y - s, x + d * 2, y + s, '#ffffff', 2, 1);
          if (e.up) arc(ctx, x - d * 7, y, s * 0.7, d, P.core, 2);   // upgraded: a second slash
        }
        ctx.globalAlpha = 1;
      },
    },
    // ------------------------------------------------ whip / lash
    whip: {
      spawn(e) { e.len = e.p.length * (e.up ? 1.5 : 1); e.life = 0.32; sfx('swing'); },
      update(e, dt, g) {
        const p = g.player;
        e.x = p.cx + e.dir * 6; e.y = p.y + 9;
        const ext = Math.min(1, e.t / 0.12) * (1 - Math.max(0, (e.t - 0.2) / 0.12));
        e.ext = ext;
        const L = e.len * ext;
        hitWhere(g, e, inBox({ x: e.dir > 0 ? e.x : e.x - L, y: e.y - 6, w: L, h: 12 }), { dir: e.dir });
      },
      render(e, ctx, ox, oy) {
        const L = e.len * (e.ext || 0), n = Math.max(2, Math.round(L / 2));
        for (let i = 0; i <= n; i++) {
          const k = i / n, x = e.x + ox + e.dir * L * k, y = e.y + oy + Math.sin(k * 9 - e.t * 30) * 3 * k;
          px(ctx, x, y, 2, 2, i % 4 === 0 ? e.pal.l : e.pal.c);
          if (e.p.style === 'vine' && i % 5 === 2) px(ctx, x, y - 2, 1, 1, '#c8a070');
          if (e.p.style === 'water' && Math.random() < 0.2) px(ctx, x, y - 2, 1, 1, '#ffffff');
        }
        if (e.up) px(ctx, e.x + ox + e.dir * L - 1, e.y + oy - 1, 3, 3, e.pal.core);
      },
    },
    // ------------------------------------------------ thrown fist
    fist: {
      spawn(e) { e.vx = e.dir * 300; e.life = 0.2; e.size = e.p.size * (e.up ? 1.5 : 1); sfx('punchHit', { minGap: 0.05 }); },
      update(e, dt, g) { e.vx *= 1 - dt * 6; e.x += e.vx * dt; const s = e.size; hitWhere(g, e, inBox({ x: e.x - s, y: e.y - s, w: s * 2, h: s * 2 }), { dir: e.dir, kb: 1.6 }); },
      render(e, ctx, ox, oy) {
        const s = Math.round(e.size), x = e.x + ox, y = e.y + oy;
        px(ctx, x - s, y - s * 0.7, s * 2, s * 1.4, e.pal.d); px(ctx, x - s + 1, y - s * 0.7 + 1, s * 2 - 2, s * 1.4 - 2, e.pal.c);
        for (let i = 0; i < 3; i++) px(ctx, x + e.dir * (s - 2), y - s * 0.5 + i * (s * 0.45), 2, 1, e.pal.d);
        if (e.p.style === 'magma') for (let i = 0; i < 3; i++) px(ctx, x + rnd(-s, s), y + rnd(-s * 0.6, s * 0.6), 1, 1, '#ffd34d');
        if (e.up) px(ctx, x - 2, y - 2, 4, 4, e.pal.core);
      },
    },
    // ------------------------------------------------ lunge (you move)
    lunge: {
      spawn(e, g) { const p = g.player; p.vx = e.dir * (e.p.distance * (e.up ? 1.5 : 1)) / 0.14; p.lungeT = 0.14; e.life = 0.18; sfx('dash'); },
      update(e, dt, g) { const p = g.player; e.x = p.cx; e.y = p.y + 10; hitWhere(g, e, inBox({ x: e.dir > 0 ? p.cx : p.cx - 18, y: p.y + 2, w: 18, h: 16 }), { dir: e.dir }); puff(g, p.cx, p.y + 10, e.pal.fx, e.pal, 1); },
      render(e, ctx, ox, oy) { for (let i = 0; i < 4; i++) px(ctx, e.x + ox - e.dir * (6 + i * 5), e.y + oy - 4 + i * 3, 8, 1, e.pal.c); px(ctx, e.x + ox + e.dir * 10, e.y + oy - 1, 6, 2, e.up ? e.pal.core : e.pal.l); },
    },
    // ------------------------------------------------ instant bolt / beam
    zap: {
      spawn(e, g) {
        e.life = 0.16; const L = e.p.length * (e.up ? 1.5 : 1);
        let end = L; for (let d = 4; d <= L; d += 4) if (solidAt(g.level, e.x + e.dir * d, e.y)) { end = d; break; }
        e.len = end;
        hitWhere(g, e, inBox({ x: e.dir > 0 ? e.x : e.x - end, y: e.y - (e.up ? 6 : 4), w: end, h: e.up ? 12 : 8 }), { dir: e.dir });
        sfx(e.p.style === 'lightning' ? 'zap' : 'cast', { minGap: 0.04 });
        puff(g, e.x + e.dir * end, e.y, e.pal.fx, e.pal, 4);
      },
      render(e, ctx, ox, oy) {
        const x0 = e.x + ox, y0 = e.y + oy, x1 = x0 + e.dir * e.len;
        if (e.p.style === 'lightning') { jag(ctx, x0, y0, x1, y0, e.pal.c, 4, 2); jag(ctx, x0, y0, x1, y0, '#ffffff', 2, 1); if (e.up) jag(ctx, x0, y0, x1, y0 + rnd(-4, 4), e.pal.l, 6, 1); }
        else { const w = e.up ? 5 : 3; px(ctx, Math.min(x0, x1), y0 - w / 2 - 1, Math.abs(x1 - x0), w + 2, e.pal.c); px(ctx, Math.min(x0, x1), y0 - 1, Math.abs(x1 - x0), 2, '#ffffff'); }
      },
    },
    // ------------------------------------------------ scythe sweep
    scythe: {
      spawn(e) { e.r = e.p.radius * (e.up ? 1.4 : 1); e.life = e.p.spin ? 0.5 : 0.3; sfx('swing'); },
      update(e, dt, g) {
        const p = g.player; e.x = p.cx; e.y = p.y + 10;
        const r = e.r;
        if (e.p.spin) hitWhere(g, e, inCircle(e.x, e.y, r), {});
        else hitWhere(g, e, inBox({ x: e.dir > 0 ? e.x - 4 : e.x - r - 4, y: e.y - r, w: r + 8, h: r * 1.6 }), { dir: e.dir });
      },
      render(e, ctx, ox, oy) {
        const k = e.t / e.life, x = e.x + ox, y = e.y + oy, r = e.r;
        const a = e.p.spin ? k * Math.PI * 4 : U.lerp(-1.9, 1.1, U.ease.outCubic(Math.min(1, k * 1.4)));
        const bx = x + Math.cos(a) * r * e.dir, by = y + Math.sin(a) * r;
        line(ctx, x, y, bx, by, '#3a2a30', 2);   // the handle
        for (let i = 0; i <= 12; i++) {           // the curved blade
          const b = a + (i / 12) * 1.2 * (e.p.spin ? 1 : 1);
          const rr = r - i * 0.6;
          px(ctx, x + Math.cos(b) * rr * e.dir, y + Math.sin(b) * rr, 2, 2, i < 3 ? '#ffffff' : e.pal.c);
        }
        ctx.globalAlpha = 0.5 * (1 - k);
        arc(ctx, x, y, r, e.dir, e.pal.l, 2, e.p.spin ? -3.14 : -1.9, e.p.spin ? 3.14 : a);
        ctx.globalAlpha = 1;
      },
    },
    // ------------------------------------------------ pulse rings
    pulse: {
      spawn(e) { e.range = e.p.range * (e.up ? 1.4 : 1); e.life = 0.4; e.size = (e.p.size || 14) * (e.up ? 1.3 : 1); sfx('cast', { minGap: 0.04 }); },
      update(e, dt, g) { const d = (e.t / e.life) * e.range; e.cx2 = e.x + e.dir * d; hitWhere(g, e, inBox({ x: e.cx2 - 8, y: e.y - e.size, w: 16, h: e.size * 2 }), { dir: e.dir }); },
      render(e, ctx, ox, oy) {
        const k = e.t / e.life;
        for (let i = 0; i < (e.up ? 4 : 3); i++) {
          const kk = Math.max(0, k - i * 0.12);
          if (kk <= 0) continue;
          ctx.globalAlpha = 1 - kk;
          arc(ctx, e.x + ox + e.dir * kk * e.range, e.y + oy, e.size * (0.6 + kk * 0.5), e.dir, i === 0 ? e.pal.l : e.pal.c, 2);
        }
        ctx.globalAlpha = 1;
      },
    },
    // ------------------------------------------------ volley
    volley: {
      spawn(e, g) {
        const n = e.p.count + (e.up ? (e.p.count >= 3 ? 2 : 1) : 0);
        const spread = e.p.spread || 0;
        for (let i = 0; i < n; i++) {
          const a = n === 1 ? 0 : -spread / 2 + (spread * i) / (n - 1);
          const ang = e.dir > 0 ? a : Math.PI - a;
          const sp = e.p.speed;
          proj(g, e, e.x, e.y, Math.cos(ang) * sp, Math.sin(ang) * sp - (e.p.gravity ? 60 : 0), { shape: e.p.shape, gravity: e.p.gravity, homing: e.p.homing, life: e.p.life || (e.p.homing ? 2 : 1.1), dir: e.dir, kb: 0.6 });
        }
        e.life = 0; sfx('cast', { minGap: 0.04 });
      },
    },
    // ------------------------------------------------ ground spikes
    spikes: {
      spawn(e, g) {
        const n = e.p.count + (e.up ? (e.p.count === 1 ? 1 : 2) : 0);
        const sp = e.p.spacing || 22;
        const aimed = e.p.aim ? aimX(g, e.x, e.dir, e.p.aim) : null;
        const start = aimed !== null ? Math.abs(aimed - e.x) : (e.p.start || 24);
        e.spikes = [];
        for (let i = 0; i < n; i++) {
          const x = e.x + e.dir * (start + i * (sp || 16));
          e.spikes.push({ x, y: groundAt(g.level, x, e.y - 6), delay: i * (e.p.delay || 0.07), h: e.p.height * (e.up ? 1.35 : 1) * rnd(0.85, 1.1) });
        }
        e.life = (n - 1) * (e.p.delay || 0.07) + 0.6;
        sfx('crash', { minGap: 0.05 });
      },
      update(e, dt, g) {
        for (const s of e.spikes) {
          const lt = e.t - s.delay; if (lt < 0) continue;
          s.k = lt < 0.12 ? lt / 0.12 : lt < 0.38 ? 1 : Math.max(0, 1 - (lt - 0.38) / 0.15);
          if (lt < 0.38 && !s.puffed) { s.puffed = true; puff(g, s.x, s.y, e.pal.fx, e.pal, 4); g.dust(s.x, s.y, 3); }
          if (s.k > 0.4) hitWhere(g, e, inBox({ x: s.x - 6, y: s.y - s.h * s.k, w: 12, h: s.h * s.k }), { dir: e.dir, kb: 1.2 });
        }
      },
      render(e, ctx, ox, oy) {
        const st = e.p.style;
        for (const s of e.spikes) {
          if (!s.k) continue;
          const h = s.h * s.k, x = s.x + ox, y = s.y + oy;
          const w = st === 'hand' ? 8 : st === 'crystal' ? 10 : 9;
          for (let yy = 0; yy < h; yy++) {
            const k = yy / h, hw = Math.max(0.5, (w / 2) * (1 - k * (st === 'hand' ? 0.3 : 0.95)));
            const col = k > 0.85 ? (e.up ? e.pal.core : e.pal.l) : (Math.floor(yy / 3) % 2 && st !== 'crystal') ? e.pal.d : e.pal.c;
            px(ctx, x - hw, y - yy, hw * 2, 1, col);
          }
          if (st === 'thorn') for (let yy = 4; yy < h - 4; yy += 6) { px(ctx, x + 3 - (yy % 12 ? 0 : 7), y - yy, 2, 1, '#e8f0a0'); }
          if (st === 'hand') { for (let f = -2; f <= 2; f++) px(ctx, x + f * 2, y - h - 3 + Math.abs(f), 1, 3, e.pal.c); }
          if (st === 'bone') { px(ctx, x - 3, y - h, 6, 2, '#f0ece0'); }
          if (st === 'crystal' || st === 'ice') px(ctx, x - 1, y - h * 0.8, 1, h * 0.5, '#ffffff');
        }
      },
    },
    // ------------------------------------------------ exploding orb
    orb: {
      spawn(e) { e.vx = e.dir * e.p.speed; e.vy = e.p.gravity ? -80 : 0; e.life = e.p.fuse || 1.6; e.r = e.p.radius * (e.up ? 1.4 : 1); e.size = e.p.style === 'boulder' || e.p.style === 'magma' ? 6 : 5; if (e.up) e.size += 2; sfx('cast'); },
      update(e, dt, g) {
        if (e.p.gravity) e.vy += e.p.gravity * dt;
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (e.p.shards && Math.floor(e.t / 0.25) !== Math.floor((e.t - dt) / 0.25)) {
          for (let i = 0; i < 2; i++) { const a = rnd(0, Math.PI * 2); proj(g, e, e.x, e.y, Math.cos(a) * 160, Math.sin(a) * 160, { shape: 'shard', dmg: e.dmg * 0.3, life: 0.5 }); }
        }
        if (Math.random() < dt * 40) puff(g, e.x, e.y, e.pal.fx, e.pal, 1);
        const s = e.size;
        const touch = !e.p.fuse && targets(g).some((t) => Physics.rectsOverlap(t.box, { x: e.x - s, y: e.y - s, w: s * 2, h: s * 2 }));
        if (touch || solidAt(g.level, e.x, e.y + (e.p.gravity ? s : 0)) || e.t >= e.life - 0.01) {
          if (e.p.fuse && solidAt(g.level, e.x, e.y + s)) { e.vx = 0; e.vy = 0; if (e.t < e.life - 0.02) return; }
          e.dead = true;
          blast(g, e, e.x, e.y, e.r);
        }
      },
      render(e, ctx, ox, oy) {
        const x = e.x + ox, y = e.y + oy, s = e.size, st = e.p.style;
        if (st === 'boulder') { disc(ctx, x, y, s, e.pal.d, e.pal.c); px(ctx, x - 2, y - 2, 2, 1, e.pal.l); return; }
        if (st === 'void' || st === 'dark') { disc(ctx, x, y, s + 1, e.pal.c); disc(ctx, x, y, s - 1, '#05020a'); ring(ctx, x, y, s + 2 + Math.sin(e.t * 20), e.pal.l); return; }
        if (st === 'time') { disc(ctx, x, y, s, e.pal.c, e.pal.l); const a = e.t * 6; line(ctx, x, y, x + Math.cos(a) * s, y + Math.sin(a) * s, '#120c1a'); if (Math.floor(e.t * 6) % 2) px(ctx, x - 1, y - s - 3, 2, 2, '#ff5a5a'); return; }
        disc(ctx, x, y, s, e.pal.c, e.pal.core);
        ring(ctx, x, y, s + 1 + Math.sin(e.t * 25) * 0.8, e.pal.l);
        if (e.up) ring(ctx, x, y, s + 4, e.pal.core);
      },
    },
    // ------------------------------------------------ erupting pillars
    pillar: {
      spawn(e, g) {
        const n = e.p.count + (e.up ? 2 : 0), sp = e.p.spacing || 30;
        const aimed = e.p.aim ? aimX(g, e.x, e.dir, e.p.aim) : null;
        if (aimed !== null) e.p = Object.assign({}, e.p, { start: Math.abs(aimed - e.x) });
        e.cols = [];
        for (let i = 0; i < n; i++) { const x = e.x + e.dir * ((e.p.start || 22) + i * sp); e.cols.push({ x, y: groundAt(g.level, x, e.y - 6), delay: i * (e.p.delay || 0.1) }); }
        e.h = e.p.height * (e.up ? 1.25 : 1); e.w = (e.p.width || 16) * (e.up ? 1.4 : 1);
        e.life = (n - 1) * (e.p.delay || 0.1) + 0.8;
      },
      update(e, dt, g) {
        for (const c of e.cols) {
          const lt = e.t - c.delay; if (lt < 0) continue;
          c.on = lt > 0.25 && lt < 0.7;
          if (c.on && !c.boomed) { c.boomed = true; sfx(e.p.sky ? 'zap' : 'boom', { minGap: 0.05 }); puff(g, c.x, c.y, e.pal.fx, e.pal, 6, 2); ERX.FX.shake(1.5, 0.12); }
          if (c.on) hitWhere(g, e, inBox({ x: c.x - e.w / 2, y: c.y - e.h, w: e.w, h: e.h }), { kb: 0.8 });
          c.lt = lt;
        }
      },
      render(e, ctx, ox, oy) {
        for (const c of e.cols) {
          if (c.lt === undefined || c.lt < 0) continue;
          const x = c.x + ox, y = c.y + oy;
          if (c.lt < 0.25) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(c.lt * 60); px(ctx, x - e.w / 2, y - 2, e.w, 2, e.pal.l); ctx.globalAlpha = 1; continue; }
          if (c.lt > 0.8) continue;
          const k = Math.min(1, (c.lt - 0.25) / 0.08), fade = c.lt > 0.6 ? 1 - (c.lt - 0.6) / 0.2 : 1;
          const h = e.h * k;
          ctx.globalAlpha = fade;
          const fiery = e.p.style === 'fire' || e.p.style === 'magma' || e.p.style === 'sun';
          if (fiery) {
            for (let yy = 0; yy < h; yy += 2) {
              const k2 = yy / h, wob = Math.sin(yy * 0.3 + c.lt * 30) * 2, hw = (e.w / 2) * (k2 > 0.8 ? (1 - k2) * 5 : 1) + wob * 0.5;
              px(ctx, x - hw + wob, y - yy - 2, hw * 2, 2, e.pal.c);
              px(ctx, x - hw * 0.5 + wob, y - yy - 2, hw, 2, e.pal.l);
            }
          } else {
            px(ctx, x - e.w / 2, y - h, e.w, h, e.pal.c);
            px(ctx, x - e.w / 4, y - h, e.w / 2, h, e.pal.l);
          }
          px(ctx, x - 1, y - h, 2, h, e.pal.core);
          for (let i = 0; i < 4; i++) px(ctx, x + rnd(-e.w / 2, e.w / 2), y - rnd(0, h), 1, 3, '#ffffff');
          ctx.globalAlpha = 1;
        }
      },
    },
    // ------------------------------------------------ ground wave
    wave: {
      spawn(e, g) { e.vx = e.dir * e.p.speed; e.life = e.p.life || 1; e.h = e.p.height * (e.up ? 1.4 : 1); e.gy = groundAt(g.level, e.x, e.y - 6); sfx('rumble', { dur: 0.6, minGap: 0.3 }); },
      update(e, dt, g) {
        e.x += e.vx * dt;
        if (solidAt(g.level, e.x + e.dir * 6, e.gy - 4)) { e.dead = true; return; }
        e.gy = groundAt(g.level, e.x, e.gy - 20);
        const hw = Math.max(10, e.h / 2.5);
        hitWhere(g, e, inBox({ x: e.x - hw, y: e.gy - e.h, w: hw * 2, h: e.h }), { dir: e.dir, kb: 1.3 });
        if (Math.random() < dt * 30) puff(g, e.x, e.gy - e.h * 0.5, e.pal.fx, e.pal, 1, 1.5);
      },
      render(e, ctx, ox, oy) {
        const x = e.x + ox, y = e.gy + oy, st = e.p.style;
        const cols = Math.max(14, Math.round(e.h / 2.5));   // bigger waves are wider too
        for (let i = 0; i < cols; i++) {
          const k = i / cols, hh = e.h * Math.sin(k * Math.PI) * (st === 'water' ? 1 : 0.9) * (st === 'water' ? (1 - k * 0.35) : 1);
          const xx = x - e.dir * (i * 2 - cols);
          px(ctx, xx, y - hh, 2, hh, i % 3 ? e.pal.c : e.pal.d);
          px(ctx, xx, y - hh, 2, 2, st === 'water' ? '#ffffff' : e.pal.l);
        }
        if (e.up) for (let i = 0; i < 5; i++) px(ctx, x + rnd(-10, 10), y - rnd(0, e.h), 2, 2, e.pal.core);
      },
    },
    // ------------------------------------------------ radial burst
    burst: {
      spawn(e, g) { e.R = e.p.radius * (e.up ? 1.35 : 1); e.life = 0.4; if (e.p.status) e.status = e.p.status; sfx('shockwave', { minGap: 0.1 }); ERX.FX.shake(e.R > 100 ? 4 : 2, 0.25); puff(g, e.x, e.y, e.pal.fx, e.pal, 16, 2.5); },
      update(e, dt, g) { const r = e.R * Math.min(1, e.t / 0.25); e.x = g.player.cx; e.y = g.player.y + 10; hitWhere(g, e, inCircle(e.x, e.y, r), { kb: e.p.knock ? e.p.knock / 120 : 1.3 }); },
      render(e, ctx, ox, oy) {
        const k = Math.min(1, e.t / 0.25), r = e.R * k;
        ctx.globalAlpha = 1 - e.t / e.life;
        ring(ctx, e.x + ox, e.y + oy, r, e.pal.c); ring(ctx, e.x + ox, e.y + oy, r - 2, e.pal.l); if (e.up) ring(ctx, e.x + ox, e.y + oy, r * 0.7, e.pal.core);
        ctx.globalAlpha = 1;
      },
    },
    // ------------------------------------------------ rain from above
    rain: {
      spawn(e, g) { e.n = e.p.count + (e.up ? 6 : 0); e.made = 0; e.life = 1.4; e.top = g.camera.iy - 10; e.w = e.p.width || 140; sfx('cast'); },
      update(e, dt, g) {
        const want = Math.min(e.n, Math.floor((e.t / 1.0) * e.n));
        while (e.made < want) {
          e.made++;
          const x = e.x + e.dir * 40 + rnd(-e.w / 2, e.w / 2) + e.dir * e.w * 0.25;
          const sh = e.p.shape;
          proj(g, e, x, e.top, sh === 'meteor' ? -e.dir * 40 : 0, sh === 'meteor' ? 260 : 320, { shape: sh, life: 1.6, boom: sh === 'meteor' ? (e.up ? 30 : 22) : 0, pierce: false, kb: 0.5, scale: e.up ? 1.6 : 1.2 });
        }
      },
    },
    // ------------------------------------------------ lightning strikes from the sky
    strike: {
      spawn(e, g) {
        const n = e.p.count + (e.up ? 2 : 0), range = e.p.range;
        const tg = targets(g).map((t) => ({ t, c: centerOf(t) })).filter((o) => Math.abs(o.c.x - e.x) < range).sort((a, b) => Math.abs(a.c.x - e.x) - Math.abs(b.c.x - e.x));
        e.bolts = [];
        for (let i = 0; i < n; i++) {
          const x = tg[i] ? tg[i].c.x : e.x + e.dir * rnd(30, range);
          e.bolts.push({ x, y: groundAt(g.level, x, (tg[i] ? tg[i].c.y : e.y) - 6), delay: i * 0.09 });
        }
        e.top = g.camera.iy - 10; e.life = n * 0.09 + 0.5;
      },
      update(e, dt, g) {
        for (const b of e.bolts) {
          const lt = e.t - b.delay; b.lt = lt;
          if (lt > 0.2 && !b.done) { b.done = true; sfx('zap', { minGap: 0.03 }); ERX.FX.shake(2, 0.12); puff(g, b.x, b.y, 'sparks', e.pal, 8); hitWhere(g, e, inBox({ x: b.x - 7, y: e.top, w: 14, h: b.y - e.top }), { kb: 0.6, once: false, every: 0 }); }
        }
      },
      render(e, ctx, ox, oy) {
        for (const b of e.bolts) {
          if (b.lt === undefined || b.lt < 0) continue;
          if (b.lt < 0.2) { if (Math.floor(b.lt * 30) % 2) px(ctx, b.x + ox - 4, b.y + oy - 2, 8, 2, e.pal.l); continue; }
          if (b.lt > 0.4) continue;
          jag(ctx, b.x + ox, e.top + oy, b.x + ox, b.y + oy, e.pal.c, 5, 3);
          jag(ctx, b.x + ox, e.top + oy, b.x + ox, b.y + oy, '#ffffff', 3, 1);
        }
      },
    },
    // ------------------------------------------------ lingering zone
    zone: {
      spawn(e, g) { e.cx2 = e.x + e.dir * (e.p.trap ? 30 : 50); e.gy = groundAt(g.level, e.cx2, e.y - 6); e.R = e.p.radius * (e.up ? 1.35 : 1); e.life = e.p.life * (e.up ? 1.3 : 1); e.kb = 0.1; sfx('cast'); },
      update(e, dt, g) {
        const cy = e.gy - e.R * 0.5;
        if (e.p.trap) {
          if (!e.sprung && targets(g).some((t) => inCircle(e.cx2, cy, e.R)(t.box))) { e.sprung = true; e.dead = true; blast(g, e, e.cx2, cy, e.R * 1.5, { dmg: e.dmg * 6 }); }
          return;
        }
        hitWhere(g, e, (b) => inCircle(e.cx2, cy, e.R)(b), { once: false, every: 0.45 });
        if (Math.random() < dt * 20) puff(g, e.cx2 + rnd(-e.R, e.R), cy + rnd(-e.R * 0.5, e.R * 0.5), e.pal.fx, e.pal, 1);
      },
      render(e, ctx, ox, oy) {
        const x = e.cx2 + ox, y = e.gy + oy, R = e.R, st = e.p.style;
        const fade = Math.min(1, e.t / 0.3, (e.life - e.t) / 0.4);
        ctx.globalAlpha = fade * 0.85;
        if (st === 'lava' || st === 'quicksand') { for (let xx = -R; xx <= R; xx += 2) { const h = 3 + Math.sin(xx * 0.4 + e.t * 6); px(ctx, x + xx, y - h, 2, h, Math.random() < 0.1 ? '#ffd34d' : (xx % 4 ? e.pal.c : e.pal.d)); } }
        else if (st === 'rune') { ring(ctx, x, y - 3, R, e.pal.c, R * 0.3); ring(ctx, x, y - 3, R * 0.6, e.pal.l, R * 0.18); for (let k = 0; k < 6; k++) { const a = k + e.t * 2; px(ctx, x + Math.cos(a) * R * 0.8, y - 3 + Math.sin(a) * R * 0.24, 2, 2, '#ffffff'); } }
        else if (st === 'time') { ring(ctx, x, y - R * 0.5, R, e.pal.c); ring(ctx, x, y - R * 0.5, R - 3, e.pal.d); const a = e.t * 3; line(ctx, x, y - R * 0.5, x + Math.cos(a) * R * 0.8, y - R * 0.5 + Math.sin(a) * R * 0.8, e.pal.l, 2); }
        else {
          for (let i = 0; i < 24; i++) {
            const a = i * 2.4 + e.t * (st === 'snow' ? 3 : 1), r = (i % 5) / 5 * R;
            const xx = x + Math.cos(a) * r, yy = y - R * 0.5 + Math.sin(a) * r * 0.5;
            px(ctx, xx, yy, st === 'dark' || st === 'fog' || st === 'toxic' || st === 'spores' ? 4 : 2, st === 'dark' || st === 'fog' ? 4 : 2, i % 3 ? e.pal.c : e.pal.l);
          }
          if (st === 'grave') for (let k = 0; k < 4; k++) { const hx = x - R + (k + 0.5) * (R / 2), hh = 6 + Math.sin(e.t * 6 + k) * 4; px(ctx, hx, y - hh, 2, hh, e.pal.c); }
          if (st === 'lullaby' && Math.floor(e.t * 3) % 2) F().draw(ctx, 'z', x + rnd(-R, R), y - R, { color: '#d8dcff' });
        }
        ctx.globalAlpha = 1;
      },
    },
    // ------------------------------------------------ pulling vortex
    vortex: {
      spawn(e, g) { e.cx2 = e.x + e.dir * 50; e.R = e.p.radius * (e.up ? 1.35 : 1); e.gy = groundAt(g.level, e.cx2, e.y - 6); e.life = e.p.life * (e.up ? 1.25 : 1); e.kb = 0; sfx('whoosh', { minGap: 0.2 }); },
      update(e, dt, g) {
        if (e.p.speed) { const nx = e.cx2 + e.dir * e.p.speed * dt; if (!solidAt(g.level, nx, e.gy - 8)) e.cx2 = nx; e.gy = groundAt(g.level, e.cx2, e.gy - 20); }
        const cy = e.gy - e.R * 0.7, pull = (e.p.pull || 90) * (e.up ? 1.3 : 1);
        for (const t of targets(g)) {
          if (t.tutorial) continue;
          const c = centerOf(t), dx = e.cx2 - c.x, dy = cy - c.y, d = Math.hypot(dx, dy);
          if (d < e.R * 1.8 && d > 3) { t.vx = U.approach(t.vx, (dx / d) * pull, 6, dt); if (t.flying || !t.onGround) t.vy = U.approach(t.vy, (dy / d) * pull, 6, dt); }
        }
        hitWhere(g, e, (b) => inCircle(e.cx2, cy, e.R)(b), { once: false, every: 0.4 });
      },
      render(e, ctx, ox, oy) {
        const x = e.cx2 + ox, y = e.gy + oy, R = e.R;
        const fade = Math.min(1, e.t / 0.3, (e.life - e.t) / 0.4);
        ctx.globalAlpha = fade;
        for (let i = 0; i < 40; i++) {
          const k = i / 40, a = k * 18 + e.t * 9, r = R * (0.3 + k * 0.7) * (e.p.style === 'void' || e.p.style === 'gravity' ? 1 - k * 0.4 : 1);
          const yy = e.p.style === 'void' || e.p.style === 'gravity' || e.p.style === 'magnet' ? y - R * 0.7 + Math.sin(a) * r * 0.6 : y - k * R * 1.6;
          px(ctx, x + Math.cos(a) * r * (e.p.style === 'wind' || e.p.style === 'sand' || e.p.style === 'storm' || e.p.style === 'water' ? 0.4 + k * 0.6 : 1), yy, 2, 2, i % 4 === 0 ? e.pal.l : e.pal.c);
        }
        if (e.p.style === 'void') disc(ctx, x, y - R * 0.7, Math.round(R * 0.25), '#000000');
        if (e.up) ring(ctx, x, y - R * 0.7, R * 0.4 + Math.sin(e.t * 10) * 2, e.pal.core);
        ctx.globalAlpha = 1;
      },
    },
    // ------------------------------------------------ chain lightning
    chain: {
      spawn(e, g) {
        const jumps = e.p.jumps + (e.up ? 2 : 0), range = e.p.range;
        const pts = [{ x: e.x, y: e.y }], used = new Set();
        let from = { x: e.x, y: e.y };
        for (let i = 0; i < jumps; i++) {
          const t = nearest(g, from.x, from.y, i === 0 ? range : range * 0.8, used);
          if (!t) break;
          used.add(t.uid);
          const c = centerOf(t); pts.push(c); from = c;
          damage(g, t, e.dmg * (1 - i * 0.08), c.x >= e.x ? 1 : -1, e, 0.4);
        }
        if (pts.length === 1) pts.push({ x: e.x + e.dir * 50, y: e.y + rnd(-6, 6) });
        e.pts = pts; e.life = 0.3; sfx('zap');
      },
      render(e, ctx, ox, oy) {
        for (let i = 1; i < e.pts.length; i++) {
          const a = e.pts[i - 1], b = e.pts[i];
          jag(ctx, a.x + ox, a.y + oy, b.x + ox, b.y + oy, e.p.style === 'spirit' ? e.pal.l : e.pal.c, 4, 2);
          jag(ctx, a.x + ox, a.y + oy, b.x + ox, b.y + oy, '#ffffff', 2, 1);
        }
      },
    },
    // ------------------------------------------------ boomerang
    boomerang: {
      spawn(e) { e.d = e.p.back ? -e.dir : e.dir; e.range = e.p.range * (e.up ? 1.3 : 1); e.life = 1.4; e.sx = e.x; sfx('whoosh', { minGap: 0.05 }); },
      update(e, dt, g) {
        const p = g.player, half = 0.55;
        if (e.t < half) e.x = e.sx + e.d * e.range * Math.sin((e.t / half) * Math.PI / 2);
        else { e.x = U.approach(e.x, p.cx, 8, dt); e.y = U.approach(e.y, p.y + 10, 8, dt); if (e.t > half && !e.back) { e.back = true; e.hit.clear(); } if (Math.abs(e.x - p.cx) < 8 && e.t > 0.8) e.dead = true; }
        const s = e.up ? 8 : 6;
        hitWhere(g, e, inBox({ x: e.x - s, y: e.y - s, w: s * 2, h: s * 2 }), { kb: 0.6 });
        if (Math.random() < dt * 20) puff(g, e.x, e.y, e.pal.fx, e.pal, 1);
      },
      render(e, ctx, ox, oy) { shape(ctx, e.p.shape, e.x + ox, e.y + oy, 0, e.pal, e.up ? 1.5 : 1.1, e.t); },
    },
    // ------------------------------------------------ teleport strike
    blink: {
      spawn(e, g) {
        const p = g.player, D = e.p.distance * (e.up ? 1.3 : 1);
        let d = 0; while (d < D && !Physics.overlapsSolid(g.level, p.x + e.dir * (d + 4), p.y, p.w, p.h)) d += 4;
        e.from = { x: p.cx, y: p.y + 10 };
        puff(g, p.cx, p.y + 10, e.pal.fx, e.pal, 10, 1.5);
        p.x += e.dir * d; p.vx = 0;
        e.to = { x: p.cx, y: p.y + 10 };
        hitWhere(g, e, inBox({ x: Math.min(e.from.x, e.to.x), y: p.y, w: Math.abs(e.to.x - e.from.x) + 1, h: p.h }), {});
        blast(g, e, e.to.x, e.to.y, e.p.radius * (e.up ? 1.3 : 1));
        e.life = 0.25; sfx('dash');
      },
      render(e, ctx, ox, oy) { ctx.globalAlpha = 1 - e.t / e.life; line(ctx, e.from.x + ox, e.from.y + oy, e.to.x + ox, e.to.y + oy, e.pal.l, 2); ctx.globalAlpha = 1; },
    },
    // ------------------------------------------------ heal
    heal: {
      spawn(e, g) {
        const p = g.player, amt = Math.round(e.p.hp * (e.up ? 1.6 : 1));
        p.hp = Math.min(p.maxHp, p.hp + amt);
        g.floatText(p.cx, p.y - 10, (e.p.rewind ? 'REWIND +' : '+') + amt + ' HP', '#7af0a0');
        e.life = 0.8; sfx('revive');
      },
      update(e, dt, g) { const p = g.player; if (Math.random() < dt * 40) g.fx.add({ x: p.cx + rnd(-8, 8), y: p.feet, vx: 0, vy: rnd(-60, -30), life: 0.6, color: Math.random() < 0.5 ? '#7af0a0' : e.pal.l, size: 1, fadeOut: 0.3 }); },
      render(e, ctx, ox, oy, g) { const p = g.player; ctx.globalAlpha = 1 - e.t / e.life; ring(ctx, p.cx + ox, p.feet + oy - 2, 10 + e.t * 20, e.p.rewind ? e.pal.c : '#7af0a0', 3); ctx.globalAlpha = 1; },
    },
    // ------------------------------------------------ buff
    buff: {
      spawn(e, g) { const p = g.player; const life = e.p.life * (e.up ? 1.5 : 1); p.ab.buffs[e.p.buff] = { t: life, up: e.up, pal: e.pal }; if (e.p.buff === 'mana') p.mp = p.maxMp; g.floatText(p.cx, p.y - 10, { rage: 'RAGE!', armor: 'IRON SKIN!', mana: 'MANA SURGE!' }[e.p.buff], e.pal.l); e.life = 0; sfx('star'); },
    },
    // ------------------------------------------------ turret
    turret: {
      spawn(e, g) { const p = g.player; e.x = p.cx - e.dir * 14 + (e.p.offset || 0); e.gy = groundAt(g.level, e.x, p.y); e.life = e.p.life * (e.up ? 1.4 : 1); e.shotT = 0.3; sfx('pop'); },
      update(e, dt, g) {
        e.shotT -= dt;
        if (e.shotT <= 0) {
          const tg = nearest(g, e.x, e.gy - 14, 200);
          if (tg) { e.shotT = e.up ? 0.35 : 0.55; const c = centerOf(tg); const a = Math.atan2(c.y - (e.gy - 14), c.x - e.x); proj(g, e, e.x, e.gy - 14, Math.cos(a) * 260, Math.sin(a) * 260, { shape: 'crystal', life: 0.9, scale: e.up ? 1.3 : 1 }); sfx('tick', { value: 90, minGap: 0.05 }); }
          else e.shotT = 0.2;
        }
      },
      render(e, ctx, ox, oy) {
        const x = e.x + ox, y = e.gy + oy, h = e.up ? 20 : 16;
        for (let yy = 0; yy < h; yy++) { const hw = Math.max(1, 4 - Math.abs(yy - h * 0.6) / 3); px(ctx, x - hw, y - yy, hw * 2, 1, yy > h * 0.7 ? e.pal.l : e.pal.c); }
        px(ctx, x - 1, y - h + 2, 2, 4, '#ffffff');
      },
    },
    // ------------------------------------------------ dashing clone
    clone: {
      spawn(e, g) { const p = g.player; e.d = e.p.back ? -e.dir : e.dir; e.x = p.cx; e.y = p.feet; e.sx = p.cx; e.life = 0.45; e.look = p.look; sfx('dash'); },
      update(e, dt, g) { e.x = e.sx + e.d * e.p.distance * (e.up ? 1.3 : 1) * U.ease.outCubic(Math.min(1, e.t / 0.3)); hitWhere(g, e, inBox({ x: e.x - 8, y: e.y - 22, w: 16, h: 22 }), { dir: e.d }); },
      render(e, ctx, ox, oy) {
        const PS = ERX.PlayerSide;
        const cv = ERX.Sprites.tint(PS.frame(e.look, 'dash', 1, e.d), e.pal.d);
        ctx.globalAlpha = 0.8 * (1 - Math.max(0, e.t - 0.3) / 0.15);
        PS.draw(ctx, cv, e.x + ox, e.y + oy, e.d);
        for (let i = 0; i < 3; i++) px(ctx, e.x + ox - e.d * (8 + i * 6), e.y + oy - 18 + i * 6, 6, 1, e.pal.c);
        ctx.globalAlpha = 1;
      },
    },
    // ------------------------------------------------ orbiting things
    orbit: {
      spawn(e) { e.n = e.p.count + (e.up ? 2 : 0); e.life = e.p.life; sfx('star'); },
      update(e, dt, g) {
        const p = g.player, R = e.p.radius * (e.up ? 1.25 : 1);
        e.pos = [];
        for (let i = 0; i < e.n; i++) { const a = e.t * 3 + (i / e.n) * Math.PI * 2; e.pos.push({ x: p.cx + Math.cos(a) * R, y: p.y + 10 + Math.sin(a) * R * 0.6 }); }
        for (const o of e.pos) hitWhere(g, e, inCircle(o.x, o.y, 6), { once: false, every: 0.5, kb: 0.3 });
      },
      render(e, ctx, ox, oy) { if (e.pos) for (const o of e.pos) shape(ctx, e.p.shape || 'star', o.x + ox, o.y + oy, 0, e.pal, e.up ? 1.5 : 1.1, e.t); },
    },
    // ------------------------------------------------ life drain
    drain: {
      spawn(e) { e.life = e.p.life * (e.up ? 1.3 : 1); e.kb = 0; sfx('surge', { minGap: 0.2 }); },
      update(e, dt, g) {
        const p = g.player; e.x = p.cx; e.y = p.y + 10;
        const list = e.p.all ? targets(g).filter((t) => Math.hypot(centerOf(t).x - e.x, centerOf(t).y - e.y) < e.p.range) : [nearest(g, e.x, e.y, e.p.range)].filter(Boolean);
        e.links = list.map(centerOf);
        for (const t of list) {
          if (e.hitT.get(t.uid) !== undefined && e.t - e.hitT.get(t.uid) < 0.3) continue;
          e.hitT.set(t.uid, e.t);
          damage(g, t, e.dmg, 1, e, 0);
          p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.round(e.dmg * 0.6)));
        }
      },
      render(e, ctx, ox, oy) {
        for (const c of e.links || []) {
          const n = 16;
          for (let i = 0; i <= n; i++) { const k = i / n; px(ctx, U.lerp(c.x, e.x, k) + ox, U.lerp(c.y, e.y, k) + oy + Math.sin(k * 10 + e.t * 20) * 2, 2, 2, i % 3 ? e.pal.c : e.pal.l); }
        }
      },
    },
    // ------------------------------------------------ meteor
    meteor: {
      spawn(e, g) { const ax = e.p.offset ? null : aimX(g, e.x, e.dir, 170); e.tx = ax !== null ? ax : e.x + e.dir * (90 + (e.p.offset || 0)); e.ty = groundAt(g.level, e.tx, e.y - 6); e.sx = e.tx - e.dir * 120; e.sy = g.camera.iy - 30; e.life = 0.75; e.R = e.p.radius * (e.up ? 1.3 : 1); sfx('orbDash'); },
      update(e, dt, g) { if (e.t >= 0.6 && !e.boomed) { e.boomed = true; blast(g, e, e.tx, e.ty - 6, e.R); g.flashT = Math.max(g.flashT || 0, 0.15); } },
      render(e, ctx, ox, oy) {
        if (e.boomed) return;
        const k = Math.min(1, e.t / 0.6), x = U.lerp(e.sx, e.tx, k) + ox, y = U.lerp(e.sy, e.ty, k) + oy;
        const r = Math.round(e.R * 0.22) + 3;
        for (let i = 1; i < 8; i++) disc(ctx, x - (e.tx - e.sx) * 0.02 * i, y - (e.ty - e.sy) * 0.02 * i, Math.max(1, r - i), i % 2 ? e.pal.c : e.pal.l);
        disc(ctx, x, y, r, e.p.style === 'sun' ? '#ffe08a' : e.pal.d, e.pal.c);
        px(ctx, x - r * 0.4, y - r * 0.4, 2, 2, '#ffffff');
      },
    },
    // ------------------------------------------------ slam from above
    slam: {
      spawn(e, g) { const ax = aimX(g, e.x, e.dir, 140); e.tx = ax !== null ? ax : e.x + e.dir * 60; e.ty = groundAt(g.level, e.tx, e.y - 6); e.w = e.p.width * (e.up ? 1.4 : 1); e.life = 0.7; e.top = g.camera.iy; sfx('whoosh'); },
      update(e, dt, g) { if (e.t >= 0.3 && !e.boomed) { e.boomed = true; sfx('crash'); ERX.FX.shake(4, 0.3); g.dust(e.tx, e.ty, 14); hitWhere(g, e, inBox({ x: e.tx - e.w / 2, y: e.ty - 60, w: e.w, h: 60 }), { kb: 1.5 }); puff(g, e.tx, e.ty, e.pal.fx, e.pal, 14, 3); } },
      render(e, ctx, ox, oy) {
        const k = Math.min(1, e.t / 0.3), y = U.lerp(e.top, e.ty, k * k);
        const fade = e.t > 0.45 ? 1 - (e.t - 0.45) / 0.25 : 1;
        ctx.globalAlpha = fade * (e.t < 0.3 ? 0.7 : 1);
        if (e.p.style === 'sound') { for (let i = 0; i < 4; i++) arc(ctx, e.tx + ox, y + oy - 10 + i * 4, e.w / 2 - i * 3, 1, i % 2 ? e.pal.c : e.pal.l, 2, -3.14, 0); }
        else { px(ctx, e.tx - e.w / 2 + ox, y - 14 + oy, e.w, 14, e.pal.d); px(ctx, e.tx - e.w / 2 + ox, y - 14 + oy, e.w, 3, e.pal.c); px(ctx, e.tx - e.w / 2 + ox, y - 2 + oy, e.w, 2, e.pal.l); }
        if (e.boomed) ring(ctx, e.tx + ox, e.ty + oy - 2, (e.t - 0.3) * 160, e.pal.l, (e.t - 0.3) * 30);
        ctx.globalAlpha = 1;
      },
    },
    // ------------------------------------------------ continuous beam
    beam: {
      spawn(e) { e.life = e.p.life * (e.up ? 1.3 : 1); e.kb = 0.2; sfx('surge', { minGap: 0.2 }); },
      update(e, dt, g) {
        const p = g.player; e.dir = p.facing; e.x = p.cx + e.dir * 8; e.y = p.y + 9;
        let L = e.p.length; for (let d = 4; d <= e.p.length; d += 4) if (solidAt(g.level, e.x + e.dir * d, e.y)) { L = d; break; }
        e.L = L;
        hitWhere(g, e, inBox({ x: e.dir > 0 ? e.x : e.x - L, y: e.y - 4, w: L, h: 8 }), { once: false, every: 0.15 });
      },
      render(e, ctx, ox, oy) {
        const x0 = e.x + ox, y = e.y + oy, L = e.L || 0, w = e.up ? 7 : 5;
        for (let i = 0; i < L; i += 2) { const hue = (i * 4 + e.t * 400) % 360; px(ctx, x0 + e.dir * i, y - w / 2, 2, w, e.up ? 'hsl(' + hue + ',90%,70%)' : (i % 6 < 3 ? e.pal.c : e.pal.l)); }
        px(ctx, Math.min(x0, x0 + e.dir * L), y - 1, L, 2, '#ffffff');
      },
    },
    // ------------------------------------------------ burning aura
    aura: {
      spawn(e) { e.life = e.p.life * (e.up ? 1.3 : 1); e.kb = 0.3; sfx('ignite'); },
      update(e, dt, g) { const p = g.player; e.x = p.cx; e.y = p.y + 10; const R = e.p.radius * (e.up ? 1.3 : 1); hitWhere(g, e, inCircle(e.x, e.y, R), { once: false, every: 0.5 }); if (Math.random() < dt * 30) puff(g, e.x + rnd(-R, R), e.y + rnd(-R * 0.6, R * 0.6), e.pal.fx, e.pal, 1); },
      render(e, ctx, ox, oy) { const R = e.p.radius * (e.up ? 1.3 : 1); ctx.globalAlpha = 0.6; ring(ctx, e.x + ox, e.y + oy, R + Math.sin(e.t * 8) * 2, e.pal.c, R * 0.7); ring(ctx, e.x + ox, e.y + oy, R - 3, e.pal.l, (R - 3) * 0.7); ctx.globalAlpha = 1; },
    },
    // ------------------------------------------------ ultimate extras
    overlay: { spawn(e) { e.layer = 'screen'; }, render(e, ctx) { /* drawn by the game over the whole view */ } },
    timestop: {
      spawn(e, g) {
        e.life = e.p.life * (e.up ? 1.4 : 1); e.layer = 'screen'; e.overlayColor = '#8a90b0';
        for (const t of targets(g)) if (t.applyStatus) { t.applyStatus('timestop', 0); if (t.status.timestop) t.status.timestop.t = e.life; }
        sfx('ding'); g.flashT = 0.3;
      },
    },
    moonrise: {
      spawn(e, g) { e.life = 3; e.layer = 'screen'; for (const t of targets(g)) if (t.applyStatus) t.applyStatus('sleep', 2); sfx('ding'); },
    },
    // chaos: a different basic attack every swing
    random: {
      spawn(e, g) {
        const opts = [['slash', { style: 'flame', speed: 220, size: 13 }], ['volley', { shape: 'shard', count: 3, spread: 0.3, speed: 250 }], ['spikes', { style: 'crystal', count: 2, spacing: 20, height: 28 }], ['zap', { style: 'lightning', length: 80 }], ['pulse', { style: 'psychic', range: 80 }], ['scythe', { style: 'dark', radius: 24 }]];
        const [kind, p] = opts[Math.floor(Math.random() * opts.length)];
        add(g, kind, Object.assign({}, e.base, { p, pal: Object.assign({}, e.pal, { c: toHex(rainbowColor(Math.random() * 3)) }), status: RANDOM_STATUS[Math.floor(Math.random() * RANDOM_STATUS.length)] }));
        e.life = 0;
      },
    },
  };
  // (lazy font accessor for zone text)
  const F = () => ERX.Font;

  // =========================================================== CASTING
  const Abilities = {
    STATUS, KINDS, SLOTS, DEF,

    kit(id) { return (ERX.Kits || {})[id] || null; },
    move(kit, slot, up) {
      if (!kit) return null;
      if (slot === 'm1') return (up && kit.m1Up) || kit.m1;
      if (slot === 'ult') return kit.ult;
      return kit.s[+slot.slice(1) - 1];
    },
    /** Numbers for a move (dmg / cooldown / mana). */
    stats(kit, slot, up) {
      const mv = this.move(kit, slot, up);
      if (slot === 'ult') return { dmg: mv.dmg || 30, cd: 1, mp: 0 };
      const d = DEF[mv.kind] || {};
      const base = (slot === 'm1' ? d.m1 : d.s) || d.s || d.m1 || { dmg: slot === 'm1' ? 8 : 14, cd: slot === 'm1' ? 0.42 : 5, mp: 6 };
      return { dmg: mv.dmg || base.dmg, cd: mv.cd || base.cd, mp: slot === 'm1' ? 0 : (mv.mp || base.mp || 6) };
    },
    describe(kit, slot, elName, up) {
      const mv = this.move(kit, slot, up);
      if (slot === 'ult') return mv.desc || 'ULTIMATE. Fill the meter by dealing damage, then unleash ' + mv.name + '.';
      return (mv.desc || DESC[mv.kind] || '').replace('{E}', elName.toLowerCase());
    },
    /** Spawn a move's effect (kind behaviour + the move's own look and hooks). */
    castMove(game, mv, o) {
      const p = game.player;
      const opts = Object.assign({ x: p.cx + p.facing * 10, y: p.y + 10, dir: p.facing, p: mv.p || {}, draw: mv.draw, tick: mv.tick, onEnd: mv.onEnd, drawShape: mv.drawShape }, o);
      if (mv.kind === 'custom') return add(game, { spawn: mv.spawn, update: mv.update, draw: mv.draw, life: mv.life || 1, layer: mv.layer, noGlow: mv.noGlow }, opts);
      if (!KINDS[mv.kind]) return null;
      return add(game, mv.kind, opts);
    },
    api,

    /** Rank of a slot: 0 locked, 1 learned, 2 upgraded (admin can override). */
    rank(game, slot) {
      const A = ERX.Admin;
      if (A && A.on() && A.data.skills !== 'normal') {
        if (slot === 'potency') return A.data.skills === 'max' ? 3 : 0;
        return A.data.skills === 'max' ? 2 : 1;
      }
      const s = game.character.elementSkills || {};
      if (slot === 'm1' || slot === 'block' || slot === 'dash') return Math.max(1, s[slot] || 0);
      return s[slot] || 0;
    },

    /** Cast a raw kind (used by a few sub-effects). */
    castKind(game, kind, params, o) {
      const p = game.player;
      const opts = Object.assign({ x: p.cx + p.facing * 10, y: p.y + 10, dir: p.facing, p: params || {} }, o);
      if (kind === 'overlay') { add(game, 'overlay', Object.assign(opts, { life: params.life, overlayColor: params.color, overlayAlpha: params.alpha, layer: 'screen' })); return; }
      if (kind === 'random') opts.base = Object.assign({}, opts);
      if (!KINDS[kind]) return;
      add(game, kind, opts);
    },
  };

  // ======================================================== PER PLAYER
  class AbilityState {
    constructor(player) {
      this.player = player;
      this.cd = { m1: 0, s1: 0, s2: 0, s3: 0, s4: 0, s5: 0, ult: 0 };
      this.cdMax = {};   // the full cooldown each slot started from (upgraded moves have their own)
      this.ult = 0;
      this.buffs = {};
      this.awk = 0;          // the Awakening meter (0..100)
      this.awakenT = 0;      // seconds of Awakening left
    }
    awakened() { return this.awakenT > 0; }
    /** Press the Awakening button. */
    awaken() {
      const g = this.game();
      if (!ERX.Awakening.ready(this.player)) {
        if (!this.awakened() && this.el() && ERX.Awakening.unlocked(g)) { sfx('deny', { minGap: 0.25 }); g.floatText(this.player.cx, this.player.y - 8, 'AWAKENING NOT READY', '#ff8a6a'); }
        return false;
      }
      return ERX.Awakening.start(g);
    }
    game() { return this.player.game; }
    el() { return this.game().element(); }
    /** Your moveset right now: the awakened one while you're awakened. */
    kit() { const el = this.el(); if (!el) return null; return (this.awakened() && ERX.Awakening.kit(el.id)) || Abilities.kit(el.id); }

    update(dt) {
      const fast = this.buffs.mana ? 2 : 1;
      for (const k of SLOTS) this.cd[k] = Math.max(0, this.cd[k] - dt * fast);
      for (const b of Object.keys(this.buffs)) { this.buffs[b].t -= dt; if (this.buffs[b].t <= 0) delete this.buffs[b]; }
      if (this.awakenT > 0) { this.awakenT -= dt; if (this.awakenT <= 0) ERX.Awakening.end(this.game()); }
      if (ERX.Admin && ERX.Admin.on() && ERX.Admin.data.instantAwk && !this.awakened()) this.awk = 100;
      if (ERX.Admin && ERX.Admin.on() && ERX.Admin.data.instantUlt) this.ult = 100;
    }

    /** 1 -> 0 as a slot comes off cooldown (for the cooldown sweeps on the HUD and touch buttons). */
    cdFrac(slot) { const max = this.cdMax[slot] || 1; return this.cd[slot] > 0 ? Math.min(1, this.cd[slot] / max) : 0; }

    ready(slot) {
      const g = this.game(), kit = this.kit();
      if (!kit) return 'none';
      if (Abilities.rank(g, slot) < 1) return 'locked';
      if (this.cd[slot] > 0) return 'cooldown';
      if (slot === 'ult') return this.ult >= 100 ? 'ok' : 'charge';
      const mp = Abilities.stats(kit, slot).mp;
      if (!(ERX.Admin && ERX.Admin.on() && ERX.Admin.data.infiniteMp) && this.player.mp < mp) return 'mana';
      return 'ok';
    }

    /** Try to use a slot. Returns true if it went off. */
    cast(slot) {
      const g = this.game(), p = this.player, kit = this.kit(), el = this.el();
      const r = this.ready(slot);
      if (r !== 'ok') {
        if (slot !== 'm1' && r !== 'cooldown') {
          sfx('deny', { minGap: 0.25 });
          g.floatText(p.cx, p.y - 8, { locked: 'NOT LEARNED', mana: 'NO MANA', charge: 'ULT NOT READY', none: 'NO ELEMENT' }[r] || '', '#ff8a6a');
        }
        return false;
      }
      const up = Abilities.rank(g, slot) >= 2;
      const pal = palette(el, kit, up);
      const st = Abilities.stats(kit, slot, up);
      const lvl = 1 + 0.06 * (p.level - 1);
      const rage = this.buffs.rage ? (this.buffs.rage.up ? 1.7 : 1.5) : 1;
      const potency = Abilities.rank(g, 'potency');
      const base = { pal, up, status: kit.status, potency, dmg: st.dmg * lvl * (up ? 1.6 : 1) * rage, isAwk: this.awakened(), el: el.id };
      this.cd[slot] = this.cdMax[slot] = st.cd * (up && slot !== 'ult' ? 0.85 : 1);   // upgraded: faster
      if (slot !== 'ult' && !(ERX.Admin && ERX.Admin.on() && ERX.Admin.data.infiniteMp)) p.mp -= st.mp;
      if (slot === 'ult') {
        this.ult = 0;
        // the cutscene plays first, then the ultimate fires (js/game/ultimate.js)
        ERX.Ultimate.start(g, el, kit, Object.assign({}, base, { dmg: st.dmg * lvl * (up ? 1.5 : 1) * rage, isUlt: true }), { awakened: this.awakened() });
        return true;
      }
      const mv = Abilities.move(kit, slot, up);
      Abilities.castMove(g, mv, base);
      if (ERX.ElementSfx) ERX.ElementSfx.move(el.id, slot, this.awakened());   // it sounds like your element
      if (slot === 'm1' && this.awakened()) {
        const now = g.t || 0;
        this._m1n = now - (this._m1t || -9) > 1.2 ? 1 : (this._m1n || 0) + 1; this._m1t = now;
        if (this._m1n % 3 === 0) { const fx = p.cx + p.facing * 22, fy = p.y + 10; blast(g, base, fx, fy, 38 * (up ? 1.4 : 1), { dmg: base.dmg * 1.6 }); add(g, FINISHFX, Object.assign({}, base, { x: fx, y: fy, dir: p.facing })); ERX.FX.shake(2.5, 0.12); }
      }
      if (slot !== 'm1') g.floatText(p.cx, p.y - 12, mv.name.toUpperCase(), pal.l);
      return true;
    }

    /** Damage taken multiplier (Iron Skin). */
    defense() { return this.buffs.armor ? (this.buffs.armor.up ? 0.35 : 0.5) : 1; }
  }

  // ===================================================== BLOCK + DASH LOOKS
  /** Your element's block, drawn in front of you. guard: 0..1 left. */
  function renderBlock(ctx, p, cam, flash) {
    const g = p.game, el = g.element(), awk = p.ab && p.ab.awakened() && ERX.Awakening.kit(el.id), kit = el && (awk || Abilities.kit(el.id));
    if (!kit) return false;
    const up = Abilities.rank(g, 'block') >= 2;
    const pal = p._blockPal && p._blockPal.up === up && p._blockPal.el === el.id && p._blockPal.awk === !!awk ? p._blockPal : (p._blockPal = Object.assign(palette(el, kit, up), { el: el.id, awk: !!awk }));
    const st = kit.block[1], d = p.facing, t = p.animT;
    const x = Math.round(p.cx + d * 11) - cam.ix, top = Math.round(p.y - 4) - cam.iy, h = 28 + (up ? 6 : 0), bot = Math.round(p.feet) - cam.iy;
    const crack = 1 - (p.guard / p.guardMax);
    ctx.save();
    if (flash > 0) ctx.globalAlpha = 1;
    const guard = awk ? awk.guard : ERX.Guards && ERX.Guards[el.id];
    if (guard) {
      // every element has its own block (js/data/kits/guards.js)
      guard.draw(ctx, { A: api(g), x, bot, h, d, t, P: pal, up, cx: Math.round(p.cx) - cam.ix, cy: Math.round(p.y + 10) - cam.iy, k: p.guard / p.guardMax });
      if (up) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 6); ring(ctx, x, bot - h / 2, 9, pal.l, h / 2 + 3); ctx.globalAlpha = 1; }
    } else switch (st) {
      case 'wall': {
        const w = up ? 9 : 7;
        px(ctx, x - w / 2 - 1, bot - h - 1, w + 2, h + 1, '#120c1a');
        for (let yy = 0; yy < h; yy++) px(ctx, x - w / 2, bot - h + yy, w, 1, Math.floor(yy / 4) % 2 ? pal.c : pal.d);
        px(ctx, x - w / 2, bot - h, w, 2, pal.l);
        if (el.id === 'ice' || el.id === 'crystal') px(ctx, x - 1, bot - h + 3, 1, h - 6, '#ffffff');
        if (el.id === 'death') for (let yy = 3; yy < h; yy += 7) px(ctx, x - w / 2, bot - h + yy, w, 2, '#f0ece0');
        break;
      }
      case 'tree': {
        px(ctx, x - 3, bot - h, 6, h, '#5a3a22'); px(ctx, x - 2, bot - h, 2, h, '#7a5236');
        for (let i = 0; i < 4; i++) disc(ctx, x + Math.round(Math.sin(i * 2.1) * 4), bot - h - 2 + i * 4, up ? 6 : 5, i % 2 ? pal.c : C.shade(pal.c, -0.25));
        break;
      }
      case 'bubble': {
        ctx.globalAlpha = 0.5;
        ring(ctx, Math.round(p.cx) - cam.ix, Math.round(p.y + 10) - cam.iy, up ? 19 : 16, pal.c, up ? 17 : 14);
        ring(ctx, Math.round(p.cx) - cam.ix, Math.round(p.y + 10) - cam.iy, up ? 17 : 14, pal.l, up ? 15 : 12);
        ctx.globalAlpha = 1;
        px(ctx, Math.round(p.cx) - cam.ix - 6, Math.round(p.y) - cam.iy, 2, 2, '#ffffff');
        break;
      }
      case 'veil': {
        for (let yy = 0; yy < h; yy++) { const wob = Math.round(Math.sin(yy * 0.5 + t * 8) * 2); ctx.globalAlpha = 0.4 + 0.4 * ((yy + Math.floor(t * 20)) % 3 === 0 ? 1 : 0); px(ctx, x + wob - 2, bot - h + yy, 4, 1, yy % 3 ? pal.d : pal.c); }
        ctx.globalAlpha = 1;
        break;
      }
      case 'swirl': {
        for (let i = 0; i < 26; i++) { const a = i * 0.7 + t * 12, yy = (i / 26) * h; px(ctx, x + Math.cos(a) * 4, bot - h + yy, 2, 1, i % 3 ? pal.c : '#ffffff'); }
        break;
      }
      default: { // energy shield arc
        for (let i = 0; i < h; i++) {
          const bend = Math.round(Math.sin((i / (h - 1)) * Math.PI) * (up ? 5 : 3)) * d;
          px(ctx, x + bend, top + i, up ? 3 : 2, 1, (i + Math.floor(t * 14)) % 4 === 0 ? '#ffffff' : pal.c);
          px(ctx, x + bend - d * 2, top + i, 1, 1, pal.l);
        }
        if (el.id === 'chaos') for (let i = 0; i < h; i += 3) px(ctx, x, top + i, 2, 2, toHex(rainbowColor(t + i * 0.05)));
      }
    }
    // cracks as the guard wears down
    if (crack > 0.35) for (let i = 0; i < Math.round(crack * 6); i++) px(ctx, x + rnd(-3, 3), bot - rnd(4, h), 1, 2, '#120c1a');
    if (flash > 0) { ctx.globalAlpha = flash * 0.8; px(ctx, x - 5, bot - h, 10, h, '#ffffff'); }
    ctx.restore();
    return true;
  }

  /** Particles while dashing (your element's dash). */
  function dashFx(game, p) {
    const el = game.element(), kit = el && Abilities.kit(el.id);
    if (!kit) return;
    const up = Abilities.rank(game, 'dash') >= 2;
    if (!p._dashPal || p._dashPal.up !== up || p._dashPal.el !== el.id) p._dashPal = Object.assign(palette(el, kit, up), { el: el.id });
    puff(game, p.cx - p.facing * 4, p.y + rnd(2, p.h - 2), kit.fx, p._dashPal, up ? 3 : 2, 0.8);
  }

  /**
   * The awakened glow. Awakened moves (not Ultimates) are drawn onto a layer of their own, which then goes on
   * screen with a soft bloom in your awakened colour (shrunk twice to blur it, tinted, stretched back) and a
   * one-pixel thickening, so every stroke reads bolder than the same move un-awakened.
   */
  function makeGlow(test, bloom, thick) { return {
    cv: null,
    /** Should this effect go on this glow layer? */
    wants(fx) { return test(fx) && !fx.noGlow && !(fx.k && fx.k.noGlow) && fx.layer !== 'screen'; },
    /** A cleared layer the size of the view. */
    begin(w, h) {
      if (!this.cv) { this.cv = ERX.makeCanvas(w, h); this.mid = ERX.makeCanvas(1, 1); this.sm = ERX.makeCanvas(1, 1); }
      if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; this.mid.width = Math.ceil(w / 2); this.mid.height = Math.ceil(h / 2); this.sm.width = Math.ceil(w / 4); this.sm.height = Math.ceil(h / 4); }
      const c = this.cv.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, w, h); c.imageSmoothingEnabled = false;
      return c;
    },
    /** Put the layer on `ctx`: bloom first, then the thickening, then the layer itself. */
    end(ctx, col) {
      const { cv, mid, sm } = this, w = cv.width, h = cv.height, m = mid.getContext('2d'), s = sm.getContext('2d');
      m.clearRect(0, 0, mid.width, mid.height); m.imageSmoothingEnabled = true; m.drawImage(cv, 0, 0, mid.width, mid.height);
      s.globalCompositeOperation = 'source-over'; s.clearRect(0, 0, sm.width, sm.height); s.imageSmoothingEnabled = true; s.drawImage(mid, 0, 0, sm.width, sm.height);
      s.globalCompositeOperation = 'source-in'; s.fillStyle = col; s.fillRect(0, 0, sm.width, sm.height); s.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.imageSmoothingEnabled = true; ctx.globalAlpha = bloom; ctx.drawImage(sm, 0, 0, w, h); if (bloom > 0.7) ctx.drawImage(sm, -1, -1, w + 2, h + 2);
      ctx.imageSmoothingEnabled = false; ctx.globalAlpha = thick;
      ctx.drawImage(cv, 1, 0); ctx.drawImage(cv, -1, 0); ctx.drawImage(cv, 0, 1); ctx.drawImage(cv, 0, -1);
      ctx.globalAlpha = 1; ctx.drawImage(cv, 0, 0);
      ctx.restore();
    },
  }; }
  const Glow = makeGlow((fx) => !!fx.isAwk && !fx.isUlt, 0.85, 0.4);
  /** Upgraded (un-awakened) moves: the same treatment, lighter, so every stroke looks richer than the basic move. */
  const Bright = makeGlow((fx) => !!fx.up && !!fx.el && !fx.isAwk && !fx.isUlt, 0.35, 0.4);

  /** Un-awakened element moves get a lighter version: their own layer, thickened by one pixel (no bloom). */
  const Bold = {
    cv: null,
    wants(fx) { return !!fx.el && !fx.isAwk && !fx.isUlt && !fx.up && !fx.noGlow && !(fx.k && fx.k.noGlow) && fx.layer !== 'screen'; },
    begin(w, h) {
      if (!this.cv) this.cv = ERX.makeCanvas(w, h);
      if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
      const c = this.cv.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, w, h); c.imageSmoothingEnabled = false;
      return c;
    },
    end(ctx) {
      const cv = this.cv;
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 0.3;
      ctx.drawImage(cv, 1, 0); ctx.drawImage(cv, -1, 0); ctx.drawImage(cv, 0, 1); ctx.drawImage(cv, 0, -1);
      ctx.globalAlpha = 1; ctx.drawImage(cv, 0, 0);
      ctx.restore();
    },
  };

  /** Ultimate overlays that cover the whole view (tints, time stop, the full moon). */
  Abilities.renderScreen = function (ctx, e, vw, vh) {
    const fade = Math.min(1, e.t / 0.3, Math.max(0, (e.life - e.t) / 0.5));
    if (e.kind === 'overlay' || e.kind === 'timestop') {
      ctx.globalAlpha = fade * (e.overlayAlpha || 0.4);
      ctx.fillStyle = e.overlayColor || '#000000';
      ctx.fillRect(0, 0, vw, vh);
      ctx.globalAlpha = 1;
    }
    if (e.kind === 'timestop') {
      const cx = Math.round(vw / 2), cy = Math.round(vh * 0.32), r = 30;
      ctx.globalAlpha = fade;
      ring(ctx, cx, cy, r, '#ffffff'); ring(ctx, cx, cy, r - 3, e.pal.c);
      line(ctx, cx, cy, cx, cy - r + 6, '#ffffff', 2); line(ctx, cx, cy, cx + 12, cy, '#ffffff', 2);
      ctx.globalAlpha = 1;
    }
    if (e.kind === 'moonrise') {
      const k = Math.min(1, e.t / 1), cx = Math.round(vw * 0.5), cy = Math.round(vh * (0.55 - 0.3 * k)), r = 26;
      ctx.globalAlpha = fade;
      disc(ctx, cx, cy, r + 3, C.mix(e.pal.c, '#000000', 0.3));
      disc(ctx, cx, cy, r, e.pal.up ? e.pal.c : '#f0f0ff', '#ffffff');
      for (const [mx, my, mr] of [[-8, -5, 4], [6, 6, 5], [9, -9, 3]]) disc(ctx, cx + mx, cy + my, mr, C.mix(e.pal.up ? e.pal.c : '#f0f0ff', '#8a8ab0', 0.4));
      ctx.globalAlpha = 1;
    }
  };

  Abilities.palette = palette;
  Abilities.renderBlock = renderBlock;
  Abilities.dashFx = dashFx;
  Abilities.puff = puff;
  Abilities.damage = damage;
  Abilities.hitWhere = hitWhere;
  Abilities.targets = targets;
  Abilities.toHex = toHex;
  Abilities.rainbowColor = rainbowColor;
  Abilities.Glow = Glow;
  Abilities.Bright = Bright;
  Abilities.Bold = Bold;
  ERX.Abilities = Abilities;
  ERX.AbilityState = AbilityState;
})(window.ERX = window.ERX || {});
