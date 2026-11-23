/*
 * THE ABYSS — where the floor of skulls drops you (js/game/abyss-fall.js).
 *
 * A vast cavern far under the Deeper Ends. You land on a great slab of black
 * rock hanging over a lake of BLACK LAVA (black crust, magenta-hot cracks);
 * stone pillars rise out of the lava into the dark, dark crystals growing on
 * them. Lots of space. Too much space. Almost as if something BIG is meant
 * to stand in it: walk out into the middle and six purple lights slam on,
 * a sigil on the wall flares, and a warning goes up: A BOSS ENEMY IS
 * APPROACHING (story-world.js: abyssBoss). The AZURE ZOMBIE (js/game/boss-azure.js).
 * Beat it and the seal on the passage through the far pillar breaks: through there,
 * a building site and a PROTOTYPE EXPRESS LIFT with a big red button (js/game/sky-launch.js).
 * (The view stops at that pillar until the seal's gone: camRight.)
 *
 *   level.drawSky()     the cavern: far walls with lava falls, the pillars, the black lava lake
 *   level.drawLive()    the lamps, the sigil, the lift (drawLift)
 *   level.update()      lava bubbling; walking into the middle starts the boss intro; the lift going up
 *   level.interact()    in the lift: PRESS THE BIG RED BUTTON
 *   level.liveLights()  the lamps, the sigil, the lava's glow
 *   level.lightLamp() / lightAll()
 *
 *   ERX.AbyssArt  the black lava, the pillars and the crystal clusters (the fall uses them too)
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, PB = ERX.PixelBuffer, C = ERX.Color;
  const TS = 16;
  const c32 = (h) => C.u32(h);
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const INK = '#040306';

  const PAL = {
    rock: ['#3e3450', '#2c2440', '#201a2e', '#181422', '#100d18', '#08060c'],   // obsidian: purple-black
    moss: ['#3a2a5a', '#2a1e44'],
    metal: ['#a8b0c0', '#848ca0', '#5e6478', '#3e4254'],
    wood: ['#4a4266', '#342e4c', '#1e1a2e'],
    outline: INK,
    back: ['#120e1e', '#0e0b18', '#0a0812', '#1a1428'],
    vein: ['#9a6aff', '#c86aff', '#ff6ab0'],
    decor: ['#3e3450', '#2c2440', '#201a2e', '#100d18'],
  };
  const CRYSTALS = [
    { hue: '#24184e', glow: '#9a7aff', edge: '#b49aff' },
    { hue: '#2e1440', glow: '#d07aff', edge: '#e09aff' },
    { hue: '#1a1a44', glow: '#6a9aff', edge: '#8ab4ff' },
  ];
  // black lava: the crust, and what glows through its cracks
  const LAVA = { crust: ['#040206', '#09050c', '#110914'], vein: ['#3e0c2c', '#8a1e56', '#ff4a94', '#ffc8e4'] };
  const PILLAR = ['#3a3048', '#2a2238', '#201a2c', '#141020'];

  // ============================================================ the art (the fall uses it too)
  const cache = new Map();
  const cached = (key, make) => { let v = cache.get(key); if (!v) { v = make(); cache.set(key, v); } return v; };

  /** Black lava that tiles both ways: plates of crust with hot cracks between them (squashed: a lake seen low). */
  function lavaTile(w, h, seed) {
    return cached('lava' + w + ',' + h + ',' + seed, () => {
      const rng = new U.RNG(seed), pts = Array.from({ length: Math.max(6, Math.round((w * h) / 240)) }, () => [rng.range(0, w), rng.range(0, h)]);
      const b = new PB(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let d1 = 1e9, d2 = 1e9;
        for (const [px, py] of pts) {
          let dx = Math.abs(x - px), dy = Math.abs(y - py);
          dx = Math.min(dx, w - dx); dy = Math.min(dy, h - dy);
          const d = Math.hypot(dx, dy * 1.9);
          if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
        }
        const e = d2 - d1;
        b.set(x, y, c32(e < 0.7 ? LAVA.vein[2] : e < 1.6 ? LAVA.vein[1] : e < 2.7 ? LAVA.vein[0] : d1 < 2.5 ? LAVA.crust[2] : (x * 3 + y * 5) % 11 === 0 ? LAVA.crust[1] : LAVA.crust[0]));
      }
      return b.toCanvas();
    });
  }

  /** A stone pillar's surface that tiles top to bottom: wavering sides, strata, cracks, a lit left edge. */
  function pillarTile(w, h, seed) {
    return cached('pillar' + w + ',' + h + ',' + seed, () => {
      const rng = new U.RNG(seed), b = new PB(w, h), P = (2 * Math.PI) / h, ph = [rng.range(0, 6), rng.range(0, 6), rng.range(0, 6)];
      const cracks = Array.from({ length: Math.round(h / 22) }, () => ({ x: rng.int(3, w - 4), y: rng.int(0, h - 1), len: rng.int(4, 10) }));
      for (let y = 0; y < h; y++) {
        const l = Math.round(2 + 1.5 * Math.sin(y * P * 2 + ph[0]) + Math.sin(y * P * 5 + ph[1]));
        const r = w - 1 - Math.round(2 + 1.5 * Math.sin(y * P * 3 + ph[2]) + Math.sin(y * P * 7 + ph[0]));
        const band = Math.sin(y * P * 6 + ph[1]) + 0.5 * Math.sin(y * P * 13 + ph[2]);
        for (let x = l; x <= r; x++) {
          const k = (x - l) / Math.max(1, r - l);
          let col = k < 0.13 ? PILLAR[0] : k > 0.76 ? PILLAR[3] : band > 0.95 ? PILLAR[1] : band < -1.05 ? PILLAR[3] : PILLAR[2];
          if (x === l || x === r) col = INK;
          b.set(x, y, c32(col));
        }
      }
      for (const c of cracks) for (let i = 0; i < c.len; i++) b.set(c.x + (i % 3 === 2 ? 1 : 0), (c.y + i) % h, c32(INK));
      return b.toCanvas();
    });
  }

  /** A cluster of dark crystals growing out of rock (n shards, about `size` tall, leaning `lean`), its glow soft around it. */
  function clusterCv(n, size, ci, lean, seed) {
    return cached('cl' + [n, size, ci, lean, seed].join(','), () => {
      const c = CRYSTALS[ci % CRYSTALS.length], W = n * 4 + size + 8, H = size + 6, b = new PB(W, H), rng = new U.RNG(seed);
      for (let i = 0; i < n; i++) {
        const sx = W / 2 + (i - (n - 1) / 2) * 3 + rng.range(-1, 1), len = Math.round(size * (1 - Math.abs(i - (n - 1) / 2) / n) * rng.range(0.75, 1.1)), ln = lean + rng.range(-0.25, 0.25);
        for (let k = 0; k < len; k++) {
          const hw = Math.max(0, Math.round(1.6 * (1 - k / len)));
          for (let dx = -hw; dx <= hw; dx++) b.set(Math.round(sx + dx + ln * k), H - 2 - k, c32(dx === -hw ? c.edge : k > len - 3 ? '#f0e4ff' : dx === hw ? C.shade(c.hue, -0.3) : c.hue));
        }
      }
      b.outline(c32(INK));
      const cv = b.toCanvas(), g = cv.getContext('2d');
      const gl = g.createRadialGradient(W / 2, H - size * 0.4, 0, W / 2, H - size * 0.4, size * 1.2);
      gl.addColorStop(0, C.rgba(c.glow, 0.3)); gl.addColorStop(1, C.rgba(c.glow, 0));
      g.globalCompositeOperation = 'destination-over';
      g.fillStyle = gl; g.fillRect(0, 0, W, H);
      return cv;
    });
  }

  /**
   * The black lava lake, from `top` (screen y) down to `bottom`, scrolled by `sx`: its crust, the cracks
   * glowing brighter and dimmer, a hot line where it meets the dark above, a haze of heat over it.
   */
  function drawLava(ctx, top, bottom, vw, sx, t) {
    if (top >= bottom) return;
    const tile = lavaTile(160, 48, 0x1a7a), tw = 160, th = 48;
    const ox = -(((sx % tw) + tw) % tw);
    const rows = (x0) => {
      for (let y = Math.round(top); y < bottom; y += th) {
        const hh = Math.min(th, Math.round(bottom - y));
        if (hh > 0) for (let x = x0; x < vw; x += tw) ctx.drawImage(tile, 0, 0, tw, hh, Math.round(x), y, tw, hh);
      }
    };
    rows(ox);
    // the cracks breathe: the same again on top, added in, fading in and out
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.12 + 0.12 * Math.sin(t * 1.3);
    rows(ox);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // where the lake meets the dark: a thin hot line, and a haze of heat above it
    const haze = ctx.createLinearGradient(0, top - 30, 0, top + 4);
    haze.addColorStop(0, 'rgba(160,30,90,0)'); haze.addColorStop(1, 'rgba(160,30,90,0.32)');
    ctx.fillStyle = haze; ctx.fillRect(0, top - 30, vw, 34);
    ctx.fillStyle = '#5a1440'; ctx.fillRect(0, Math.round(top), vw, 1);
    ctx.fillStyle = '#ff6aa8';
    for (let x = ((Math.round(-sx) % 9) + 9) % 9; x < vw; x += 9) if (Math.sin(x * 0.7 + t * 2.1) > 0.75) ctx.fillRect(x, Math.round(top), 3, 1);
  }

  const AbyssArt = { PAL, LAVA, PILLAR, CRYSTALS, lavaTile, pillarTile, clusterCv, drawLava };

  // ============================================================ the cavern, behind everything
  /**
   * Far walls with black lava pouring down them; a row of great pillars rising
   * out of the lake into the dark (crystals growing on them); the lake itself,
   * under the slab you're standing on; embers drifting up.
   */
  class AbyssBackdrop {
    constructor(level, vw, vh) {
      this.vw = vw; this.vh = vh;
      const rng = new U.RNG(0xab55);
      const range = Math.max(0, level.ph - vh);
      this.camY0 = U.clamp(level.floorY - 32 - vh * 0.55, 0, range);        // where the camera usually sits
      this.lakeY = level.underY + 14;                                        // the lake's surface, world y (just under the slab)
      this.farW = Math.round(vw + Math.max(0, level.pw - vw) * 0.1 + 60);
      this.midW = Math.round(vw + Math.max(0, level.pw - vw) * 0.32 + 80);
      this.falls = Array.from({ length: 5 }, (_, i) => ({ x: (i + 0.5) * (this.farW / 5) + rng.range(-30, 30), w: rng.int(5, 11), top: rng.range(-20, 60) }));
      this.pillars = [];
      for (let x = rng.range(10, 60); x < this.midW; x += rng.range(80, 150)) {
        const w = rng.int(26, 54);
        this.pillars.push({ x, w, tile: pillarTile(w, 128, rng.int(1, 9999)), clusters: Array.from({ length: rng.int(2, 4) }, () => ({ y: rng.range(30, 210), side: rng.chance(0.5) ? -1 : 1, cv: clusterCv(rng.int(3, 5), rng.int(8, 14), rng.int(0, 2), 0, rng.int(1, 999)) })) });
      }
      this.glints = Array.from({ length: 70 }, () => ({ x: rng.range(0, this.farW), y: rng.range(0, vh), ph: rng.range(0, 6), sp: rng.range(1, 3), c: rng.pick(['#9a6aff', '#c86aff', '#6a9aff']) }));
      this.embers = Array.from({ length: 46 }, () => ({ x: rng.range(0, vw), y: rng.range(0, vh), sp: rng.range(6, 18), ph: rng.range(0, 6) }));
    }
    lakeAt(cam) { return Math.round(this.lakeY - (cam.y * 0.85 + this.camY0 * 0.15)); }

    draw(ctx, cam, vw, vh, t) {
      const lake = this.lakeAt(cam);
      const gr = ctx.createLinearGradient(0, 0, 0, vh);
      gr.addColorStop(0, '#020104'); gr.addColorStop(0.7, '#0c0512'); gr.addColorStop(1, '#1e0820');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, vw, vh);
      // the far walls: black lava pouring down them, crystals glinting
      const fx = Math.round(-cam.x * 0.1 - 30);
      for (const f of this.falls) {
        const x = Math.round(f.x + fx);
        if (x < -20 || x > vw + 20) continue;
        const top = Math.round(f.top - cam.y * 0.08);
        ctx.fillStyle = '#060308'; ctx.fillRect(x - f.w / 2, top, f.w, lake - top);
        ctx.fillStyle = '#4a0e30';
        ctx.fillRect(x - f.w / 2, top, 1, lake - top); ctx.fillRect(x + f.w / 2 - 1, top, 1, lake - top);
        ctx.fillStyle = '#c83a7a';
        for (let y = top + ((t * 40) % 14); y < lake; y += 14) ctx.fillRect(x - f.w / 2 + 1 + Math.round((Math.sin(y * 0.3) + 1) * (f.w / 2 - 1)), Math.round(y), 1, 3);
      }
      for (const g of this.glints) {
        const a = 0.5 + 0.5 * Math.sin(t * g.sp + g.ph);
        if (a < 0.4) continue;
        const x = Math.round(g.x + fx), y = Math.round(g.y - cam.y * 0.08);
        if (y > lake - 4) continue;
        ctx.globalAlpha = a; ctx.fillStyle = g.c; ctx.fillRect(x, y, 1, 1);
      }
      ctx.globalAlpha = 1;
      // the pillars: up out of the lake, into the dark (lit from below, magenta)
      const mx = Math.round(-cam.x * 0.32 - 40);
      for (const p of this.pillars) {
        const x = Math.round(p.x + mx);
        if (x < -p.w - 30 || x > vw + 30) continue;
        const oy = Math.round(-cam.y * 0.3) % 128;
        for (let y = oy - 128; y < lake; y += 128) { const hh = Math.min(128, lake - y); if (hh > 0) ctx.drawImage(p.tile, 0, 0, p.w, hh, x, y, p.w, hh); }
        const rim = ctx.createLinearGradient(0, lake - 90, 0, lake);
        rim.addColorStop(0, 'rgba(200,50,120,0)'); rim.addColorStop(1, 'rgba(200,50,120,0.35)');
        ctx.fillStyle = rim; ctx.fillRect(x + 1, lake - 90, p.w - 2, 90);
        for (const c of p.clusters) {
          const cy = Math.round(c.y - cam.y * 0.3);
          if (cy > lake - 10) continue;
          ctx.drawImage(c.cv, c.side < 0 ? x - c.cv.width / 2 + 3 : x + p.w - c.cv.width / 2 - 3, cy - c.cv.height);
        }
      }
      // the lake
      AbyssArt.drawLava(ctx, lake, vh, vw, cam.x * 0.4, t);
      // embers drifting up off it
      for (const e of this.embers) {
        const y = (((e.y - t * e.sp) % vh) + vh) % vh, x = (((e.x - cam.x * 0.5 + Math.sin(t * 0.9 + e.ph) * 8) % vw) + vw) % vw;
        if (y > lake + 4) continue;
        ctx.globalAlpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * 3 + e.ph)) * Math.min(1, (y - lake + 160) / 160);
        ctx.fillStyle = e.ph > 3 ? '#ff6aa8' : '#d07aff'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
      ctx.globalAlpha = 1;
    }

    /** The lake glows: a row of lights along it (world space, wherever it is on screen now). */
    lights(cam) {
      const out = [], lake = this.lakeAt(cam);
      if (lake > this.vh + 40) return out;
      for (let x = ((-cam.x * 0.4) % 110 + 110) % 110 - 55; x < this.vw + 60; x += 110) out.push({ x: x + cam.x, y: lake + 18 + cam.y, r: 70, color: '#c8327a', intensity: 0.38 });
      return out;
    }
  }

  // ============================================================ the level
  const FLOOR = 26;
  const ARENA = 85;                        // the arena's width (tiles); past its far pillar, the lift room
  const ROOM = { x1: 99, top: FLOOR - 8 };   // the lift room (from ARENA to x1), and how high its ceiling is
  const SHAFT = { x0: 92, x1: 97 };          // the lift shaft, going up out of the room
  // the six lamps (tiles): they light in pairs, from the far ends in
  const LAMPS = [8, 19, 30, 54, 65, 76];

  class AbyssLevel extends ERX.CaveLevel {
    configure() {
      this.W = ROOM.x1 + 2;
      this.H = 34;
      this.pal = PAL;
      this.sections = [];
      this.id = 'abyss';
      this.mossUntil = -1;
    }

    build() {
      const rng = new U.RNG(this.seed ^ 0xab55);
      this.tiles.fill(0);
      // the slab you land on (two tiles thick, the whole way across), and a great pillar at each end
      this.solid(0, this.W, FLOOR, FLOOR + 2);
      this.solid(0, 3, 0, this.H); this.solid(ARENA - 3, ARENA, 0, this.H);
      // a passage into the far pillar: sealed (blue runes) until the boss is dead. Through it: the lift room
      this.air(ARENA - 3, ARENA, FLOOR - 3, FLOOR);
      this.passage = { tx: ARENA - 3, x: (ARENA - 3) * TS, top: (FLOOR - 3) * TS, sealed: true, breakT: -1 };
      // the lift room: cut into the rock past the pillar (a building site: timber props, work lights, cones),
      // and the lift's shaft going up out of it. The view stops at the pillar until the seal's broken.
      this.solid(ARENA, this.W, 0, this.H);
      this.air(ARENA, ROOM.x1, ROOM.top, FLOOR);
      this.air(SHAFT.x0, SHAFT.x1, 0, FLOOR);
      this.arenaX0 = 3 * TS; this.arenaX1 = (ARENA - 3) * TS;
      this.camRight = ARENA * TS;
      this.room = { x0: ARENA * TS, x1: ROOM.x1 * TS, top: ROOM.top * TS, shaft0: SHAFT.x0 * TS, shaft1: SHAFT.x1 * TS };
      this.lift = { x: ((SHAFT.x0 + SHAFT.x1) / 2) * TS, y: 0, vy: 0, state: 'idle', gate: 0, press: 0, t: 0 };
      this.setSeal(true);
      this.floorY = FLOOR * TS;
      this.underY = (FLOOR + 2) * TS;          // the slab's underside
      this.centerX = Math.round(ARENA / 2) * TS;
      this.landX = 15 * TS;
      this.spawn = { x: 15 * TS, y: this.floorY };
      this.triggerX = this.centerX - 7 * TS;   // walk this far out and the lights come on (and it comes)
      this.checkpoints = [this.spawn];
      this.decor = [];
      this.lights = [];
      this.torches = [];
      this.braziers = [];
      this.signs = [{ x: (ARENA + 2.6) * TS, y: FLOOR * TS, text: 'PROTOTYPE EXPRESS LIFT\nTakes you up to the surface.\nQuickly. Very quickly.\nNOT FINISHED. DO NOT USE.\n   - Management', read: false }];
      this.chalk = [];
      this.npcs = [];
      this.enemySpawns = [];
      this.lamps = LAMPS.map((tx) => ({ x: tx * TS + 8, y: this.floorY, lit: false, t: 0, ph: rng.range(0, 6) }));
      this.lampOrder = [[0, 5], [1, 4], [2, 3]];
      this.lit = false;
      this.sigil = { x: this.centerX, y: this.floorY - 100, r: 56, t: -1 };
      for (let x = 4; x < ARENA - 4; x++) if (rng.chance(0.25)) this.decor.push({ kind: 'pebbles', x: x * TS + rng.int(0, 12), y: this.floorY });
      this.bubbleT = 1;
    }

    /** Pitch dark, apart from the lake's glow... until the lights come on. */
    darknessAt() { return this.lit ? 0.5 : 0.9; }

    lightLamp(g, i) {
      const L = this.lamps[i];
      if (!L || L.lit) return;
      L.lit = true; L.t = 0;
      if (g) for (let k = 0; k < 16; k++) g.fx.add({ x: L.x + U.lerp(-4, 4, Math.random()), y: L.y - 52, vx: U.lerp(-40, 40, Math.random()), vy: U.lerp(-90, -10, Math.random()), life: U.lerp(0.4, 0.8, Math.random()), color: k % 3 ? '#b46aff' : '#f0dcff', size: Math.random() < 0.4 ? 2 : 1, fadeOut: 0.3 });
    }
    /** Back again: every light already on. */
    lightAll() {
      for (let i = 0; i < this.lamps.length; i++) { this.lamps[i].lit = true; this.lamps[i].t = 9; }
      this.lit = true;
      this.sigil.t = 9;
    }
    /** The far passage's seal: solid while it's there. */
    setSeal(on) {
      const P = this.passage;
      for (let ty = FLOOR - 3; ty < FLOOR; ty++) { const k = P.tx + ',' + ty; if (on) this.dynamicSolid.add(k); else this.dynamicSolid.delete(k); }
      P.sealed = on;
    }
    /** The boss is dead: the seal cracks and falls away. */
    unseal(g) {
      const P = this.passage;
      if (!P.sealed) return;
      this.setSeal(false);
      this.camRight = undefined;   // (and now you can see what's through there)
      P.breakT = 0;
      sfx('sealBreak');
      if (g) for (let i = 0; i < 30; i++) g.fx.add({ x: P.x + 2 + Math.random() * 4, y: P.top + Math.random() * 48, vx: U.lerp(-80, -10, Math.random()), vy: U.lerp(-60, 30, Math.random()), ay: 300, life: U.lerp(0.5, 1, Math.random()), color: Math.random() < 0.5 ? '#4a8aff' : '#c8e8ff', size: Math.random() < 0.4 ? 2 : 1, fadeOut: 0.3 });
    }
    /** Back again after the boss: lights on, the passage open (and guarded). */
    afterBoss() { this.lightAll(); this.setSeal(false); this.camRight = undefined; this.passage.breakT = 9; this.introDone = true; this.bossDone = true; }

    /** The slab's underside: rough black rock hanging down over the lava, dark crystals hanging off it. */
    renderBackWall() {
      const b = new PB(this.pw, this.ph), rng = new U.RNG(this.seed ^ 0x51ab), y0 = this.underY;
      for (let x = 3 * TS; x < (ARENA - 3) * TS; x++) {
        const d = Math.round(10 + 9 * Math.sin(x * 0.021) + 6 * Math.sin(x * 0.067 + 1) + 3 * Math.sin(x * 0.31));
        for (let y = 0; y < d; y++) b.set(x, y0 + y, c32(y < 3 ? PAL.rock[2] : y < d - 3 ? PAL.rock[3] : PAL.rock[4]));
      }
      for (let x = 3 * TS + rng.int(10, 30); x < (ARENA - 4) * TS; x += rng.int(24, 60)) {
        const c = rng.pick(CRYSTALS), len = rng.int(6, 14);
        let top = y0;
        while (top < this.ph - 1 && b.solid(x, top + 1)) top++;
        for (let k = 0; k < len; k++) {
          const hw = Math.max(0, Math.round(1.8 * (1 - k / len)));
          for (let dx = -hw; dx <= hw; dx++) b.set(x + dx, top + k, c32(dx === -hw ? c.edge : k > len - 3 ? '#f0e4ff' : c.hue));
        }
      }
      // the far passage: a tunnel into the pillar, black inside
      const P = this.passage;
      for (let y = P.top; y < this.floorY; y++) for (let x = P.x; x < ARENA * TS; x++) b.set(x, y, c32((x - P.x) < 3 ? '#0e0a16' : '#040208'));
      const marks = this.paintRoom(b, rng);
      b.outline(c32(INK));
      const cv = b.toCanvas(), ctx = cv.getContext('2d');
      if (ERX.Font && ERX.Font.draw) for (const m of marks) ERX.Font.draw(ctx, m.text, m.x, m.y, { color: m.color, align: 'center' });
      return cv;
    }

    /**
     * The lift room's back wall (into the back-wall buffer): rough rock, timber props, the shaft (its rails, hazard
     * stripes up both edges), two work lamps, and a building site's worth of clutter. Returns its signs' words.
     */
    paintRoom(b, rng) {
      const Rm = this.room, fy = this.floorY, n = new U.Noise(0x11f7), marks = [];
      const R = (x, y, w, h, col) => { if (w > 0 && h > 0) b.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), c32(col)); };
      for (let y = Rm.top; y < fy; y++) for (let x = Rm.x0; x < Rm.x1; x++) {
        const v = n.n2(x * 0.07, y * 0.11) * 0.75 + n.n2(x * 0.3, y * 0.3) * 0.25;
        b.set(x, y, c32(['#2e2640', '#261f36', '#1e182c', '#171222'][U.clamp(Math.floor(v * 4), 0, 3)]));
      }
      // the shaft: black, a rail up each side of its back wall, a crossbeam every so often
      for (let y = 0; y < fy; y++) for (let x = Rm.shaft0; x < Rm.shaft1; x++) b.set(x, y, c32(y % 72 < 4 ? '#3a3440' : '#0c0a12'));
      for (const rx of [Rm.shaft0 + 9, Rm.shaft1 - 12]) { R(rx, 0, 3, fy, '#3a3a48'); R(rx, 0, 1, fy, '#8a8a9a'); for (let y = 5; y < fy; y += 12) R(rx + 1, y, 1, 1, '#c8c8d4'); }
      for (const ex of [Rm.shaft0 - 4, Rm.shaft1]) for (let y = 0; y < fy; y++) R(ex, y, 4, 1, Math.floor((y + (ex > Rm.shaft0 ? 2 : 0)) / 4) % 2 ? '#d8b020' : '#1a1a20');
      // timber props and beams holding the ceiling up
      for (const px of [Rm.x0 + 10, Rm.shaft0 - 26, Rm.shaft1 + 16]) { R(px, Rm.top, 6, fy - Rm.top, '#6a4630'); R(px, Rm.top, 1, fy - Rm.top, '#8a5e40'); R(px + 5, Rm.top, 1, fy - Rm.top, '#4a3022'); }
      R(Rm.x0, Rm.top, Rm.shaft0 - 4 - Rm.x0, 6, '#6a4630'); R(Rm.x0, Rm.top + 5, Rm.shaft0 - 4 - Rm.x0, 1, '#4a3022');
      R(Rm.shaft1 + 4, Rm.top, Rm.x1 - Rm.shaft1 - 4, 6, '#6a4630'); R(Rm.shaft1 + 4, Rm.top + 5, Rm.x1 - Rm.shaft1 - 4, 1, '#4a3022');
      // the work lamps: little cages round bright bulbs, hanging off the beams
      this.roomLamps = [];
      for (const lx of [Rm.x0 + 40, Rm.shaft1 + 13]) {
        const ly = Rm.top + 14;
        R(lx, Rm.top + 6, 1, 6, '#3a3a48');
        R(lx - 3, ly - 2, 7, 9, '#1a1424'); R(lx - 2, ly - 1, 5, 7, '#ffe8a0'); R(lx - 1, ly, 3, 4, '#ffffff');
        for (const k of [-2, 0, 2]) R(lx + k, ly - 1, 1, 7, '#5a5a6a');
        this.roomLamps.push({ x: lx, y: ly + 3 });
      }
      // a board over the shaft
      const bx = (Rm.shaft0 + Rm.shaft1) / 2, by = Rm.top - 2, text = 'EXPRESS LIFT', w = (ERX.Font && ERX.Font.measure ? ERX.Font.measure(text) : 70) + 10;
      R(bx - w / 2 - 1, by - 1, w + 2, 12, '#1a1424'); R(bx - w / 2, by, w, 10, '#d8b020'); R(bx - w / 2, by, w, 1, '#f4d860');
      marks.push({ x: Math.round(bx), y: by + 2, text, color: '#1a1424' });
      // the clutter: cones, a toolbox, a bucket, a coil of rope, a spare hard hat, planks
      const cone = (x) => { for (let yy = 0; yy < 10; yy++) { const hw = Math.round(yy * 0.4); R(x - hw, fy - 11 + yy, hw * 2 + 1, 1, yy === 4 || yy === 5 ? '#f4f0e8' : '#f07a2a'); } R(x - 5, fy - 2, 11, 2, '#c85a1a'); };
      cone(Rm.x0 + 26); cone(Rm.x0 + 33); cone(Rm.x1 - 10);
      R(Rm.x0 + 52, fy - 7, 14, 7, '#c83a2a'); R(Rm.x0 + 52, fy - 7, 14, 1, '#e86a5a'); R(Rm.x0 + 56, fy - 10, 6, 3, '#3a3a44');
      R(Rm.shaft1 + 26, fy - 9, 9, 9, '#8a8a98'); R(Rm.shaft1 + 26, fy - 9, 9, 1, '#c8c8d4'); R(Rm.shaft1 + 27, fy - 12, 7, 1, '#5a5a6a');
      b.ellipse(Math.round(Rm.shaft1 + 44), fy - 3, 6, 3, c32('#a88a5a')); b.ellipse(Math.round(Rm.shaft1 + 44), fy - 3, 3, 1, c32('#6a5434'));
      R(Rm.x0 + 70, fy - 4, 8, 3, '#ffd34d'); R(Rm.x0 + 69, fy - 2, 10, 1, '#c89a2a');
      for (let i = 0; i < 3; i++) R(Rm.shaft0 - 52 + i * 2, fy - 3 - i * 3, 22, 3, i % 2 ? '#a8784a' : '#c89a64');
      return marks;
    }

    /** The lift: a cage of hazard-yellow girders on a steel floor, hanging on cables up the shaft; a gate; the button. */
    drawLift(ctx, cam, g) {
      const Lf = this.lift, ox = -cam.ix, oy = -cam.iy, vw = g.view.width;
      const cx = Math.round(Lf.x) + ox, fy = Math.round(this.floorY - Lf.y) + oy, cw = 60, ch = 46, x0 = cx - cw / 2, y0 = fy - ch;
      // the work lamps' warm light, pooling round them
      for (const l of this.roomLamps || []) {
        const lx = l.x + ox, ly = l.y + oy;
        if (lx < -90 || lx > vw + 90) continue;
        const gr = ctx.createRadialGradient(lx, ly, 2, lx, ly, 64);
        gr.addColorStop(0, 'rgba(255,214,140,0.26)'); gr.addColorStop(1, 'rgba(255,214,140,0)');
        ctx.fillStyle = gr; ctx.fillRect(lx - 64, ly - 64, 128, 128);
      }
      if (cx < -60 || cx > vw + 60) return;
      const r = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
      r(cx - 10, -10, 1, y0 + 10, '#4a4a58'); r(cx + 9, -10, 1, y0 + 10, '#4a4a58');                       // the cables
      r(x0 + 3, y0 + 3, cw - 6, ch - 6, 'rgba(24,22,32,0.55)');
      ctx.fillStyle = 'rgba(138,138,152,0.4)'; for (let x = x0 + 6; x < x0 + cw - 4; x += 6) ctx.fillRect(x, y0 + 4, 1, ch - 8); for (let y = y0 + 6; y < fy - 3; y += 6) ctx.fillRect(x0 + 4, y, cw - 8, 1);
      r(x0 - 1, y0 - 1, cw + 2, 5, '#120c18'); r(x0 - 1, y0, 5, ch, '#120c18'); r(x0 + cw - 4, y0, 5, ch, '#120c18');
      r(x0, y0, cw, 3, '#d8b020'); r(x0, y0, 3, ch, '#d8b020'); r(x0 + cw - 3, y0, 3, ch, '#d8b020'); r(x0, y0, cw, 1, '#f4d860');
      // the floor (striped along its front edge) and its underside
      r(x0 - 2, fy - 1, cw + 4, 6, '#120c18');
      for (let x = x0 - 1; x < x0 + cw + 1; x++) r(x, fy, 1, 3, Math.floor((x - x0) / 4) % 2 ? '#d8b020' : '#2a2a30');
      r(x0, fy + 3, cw, 2, '#3a3a48');
      // the gate: a grille that comes down over the way in
      const gh = Math.round((ch - 6) * Lf.gate);
      if (gh > 0) { r(x0 + 1, y0 + 3, 2, gh, '#8a8a98'); for (let y = y0 + 4; y < y0 + 3 + gh; y += 5) r(x0 - 3, y, 8, 1, '#8a8a98'); r(x0 - 3, y0 + 3 + gh - 1, 8, 2, '#5a5a6a'); }
      // the control box on the right-hand post: the BIG RED BUTTON (it glows; pressed, it's dark and pushed in)
      const bx = x0 + cw - 13, byy = y0 + 18, lit = Lf.state === 'idle' || Math.floor(Lf.t * 6) % 2 === 0;
      r(bx - 1, byy - 1, 13, 13, '#120c18'); r(bx, byy, 11, 11, '#8a8a98'); r(bx, byy, 11, 1, '#c8c8d4');
      r(bx + 2, byy + 3 + (Lf.press > 0 ? 1 : 0), 7, 5 - (Lf.press > 0 ? 1 : 0), Lf.state === 'idle' ? (Math.floor(Lf.t * 2) % 2 ? '#ff4a3a' : '#e8302a') : lit ? '#ff6a4a' : '#8a1a14');
      r(bx + 3, byy + 3 + (Lf.press > 0 ? 1 : 0), 2, 1, '#ffb0a0');
      r(bx + 1, byy + 9, 9, 1, '#f4f0e8');      // (a little label. It says DO NOT PRESS. Obviously.)
    }

    drawSky(ctx, cam, vw, vh, g) {
      if (!this.backdrop || this.backdrop.vw !== vw || this.backdrop.vh !== vh) this.backdrop = new AbyssBackdrop(this, vw, vh);
      this.backdrop.draw(ctx, cam, vw, vh, g.t);
    }

    /** Behind you: the sigil on the far wall, and the six lamps on their stone posts. */
    drawLive(ctx, cam, g) {
      const t = g.t, s = this.sigil, sx = s.x - cam.ix, sy = s.y - cam.iy;
      // the sigil: carved grooves in the dark, until the lights come on; then it burns
      const on = s.t >= 0 ? Math.min(1, s.t / 0.6) : 0;
      if (on > 0) {
        const gl = ctx.createRadialGradient(sx, sy, 4, sx, sy, s.r * 1.6);
        gl.addColorStop(0, C.rgba('#b46aff', 0.35 * on)); gl.addColorStop(1, C.rgba('#b46aff', 0));
        ctx.fillStyle = gl; ctx.fillRect(sx - s.r * 1.6, sy - s.r * 1.6, s.r * 3.2, s.r * 3.2);
      }
      const dot = (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
      const ring = (r, n, col, spin) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + spin; dot(sx + Math.cos(a) * r, sy + Math.sin(a) * r, col); } };
      ring(s.r, 160, on ? '#c88aff' : '#1a1428', 0);
      ring(s.r - 4, 140, on ? '#7a4ad0' : '#141020', 0);
      ring(s.r * 0.55, 90, on ? '#e8c8ff' : '#141020', on ? -t * 0.4 : 0);
      for (let i = 0; i < 12; i++) {
        // runes round the middle ring, turning slowly once lit
        const a = (i / 12) * Math.PI * 2 + (on ? t * 0.25 : 0), rx = sx + Math.cos(a) * (s.r - 13), ry = sy + Math.sin(a) * (s.r - 13);
        ctx.fillStyle = on ? (Math.floor(t * 4 + i) % 9 === 0 ? '#ffffff' : '#c88aff') : '#181224';
        ctx.fillRect(Math.round(rx) - 1, Math.round(ry) - 2, 1, 4); ctx.fillRect(Math.round(rx), Math.round(ry) - (i % 2 ? 2 : 0), 2, 1); ctx.fillRect(Math.round(rx) + 1, Math.round(ry), 1, 2);
      }
      // the eye in the middle, closed until it's lit
      ctx.fillStyle = on ? '#2a0e4a' : '#0c0a12'; ctx.fillRect(Math.round(sx) - 7, Math.round(sy) - 2, 15, 5);
      if (on) { ctx.fillStyle = '#e8c8ff'; ctx.fillRect(Math.round(sx) - 5, Math.round(sy), 11, 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 3, 3); }
      // ...and when something's summoned, the eye opens into a portal of blue fire
      const po = this.portal ? this.portal.k : 0;
      if (po > 0) {
        const r = Math.round(18 * po);
        const gl = ctx.createRadialGradient(sx, sy, 2, sx, sy, r * 2.4);
        gl.addColorStop(0, C.rgba('#4a8aff', 0.55 * po)); gl.addColorStop(1, C.rgba('#4a8aff', 0));
        ctx.fillStyle = gl; ctx.fillRect(sx - r * 2.4, sy - r * 2.4, r * 4.8, r * 4.8);
        // inside: blue fire, brightest in the middle (so whatever comes through is a dark shape against it)
        const disc = (rr, col) => { if (rr < 1) return; ctx.fillStyle = col; for (let yy = -rr; yy <= rr; yy++) { const w = Math.floor(Math.sqrt(rr * rr - yy * yy) + 0.35); ctx.fillRect(Math.round(sx) - w, Math.round(sy) + yy, w * 2 + 1, 1); } };
        disc(r, '#7ad0ff'); disc(r - 1, '#2a6aff'); disc(Math.round(r * 0.8), '#1a3aaa'); disc(Math.round(r * 0.62), '#3a7aff');
        disc(Math.round(r * 0.4 + Math.sin(t * 7) * 0.8), '#9ad8ff'); disc(Math.round(r * 0.18), '#e8faff');
        for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2 + t * (i % 2 ? 5 : -4), rr = r * (0.5 + 0.5 * ((i * 7) % 5) / 4); dot(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr, i % 4 ? '#bfe8ff' : '#ffffff'); }
      }
      // the far passage: dark inside; sealed, a lattice of blue runes across its mouth
      const P = this.passage, qx = P.x - cam.ix, qy = P.top - cam.iy, seal = P.sealed ? 1 : P.breakT >= 0 ? Math.max(0, 1 - P.breakT / 0.6) : 0;
      if (seal > 0 && qx > -20 && qx < g.view.width + 20) {
        ctx.globalAlpha = seal;
        for (let i = 0; i < 4; i++) { ctx.fillStyle = '#1a3aaa'; ctx.fillRect(qx + 1 + i * 4, qy, 2, 48); ctx.fillStyle = Math.floor(t * 3 + i) % 4 === 0 ? '#c8e8ff' : '#4a8aff'; ctx.fillRect(qx + 2 + i * 4, qy, 1, 48); }
        for (const yy of [10, 24, 38]) { ctx.fillStyle = '#4a8aff'; ctx.fillRect(qx, qy + yy, 16, 1); ctx.fillStyle = '#e8f4ff'; ctx.fillRect(qx + 6, qy + yy - 1, 3, 3); }
        ctx.globalAlpha = 1;
      }
      if (this.camRight === undefined) this.drawLift(ctx, cam, g);
      // the lamps: a stone post, a bowl of dark crystal on top; lit, a purple fire burns in it
      for (const L of this.lamps) {
        const x = Math.round(L.x) - cam.ix, y = Math.round(L.y) - cam.iy;
        if (x < -20 || x > g.view.width + 20) continue;
        ctx.fillStyle = INK; ctx.fillRect(x - 4, y - 44, 9, 44);
        ctx.fillStyle = PAL.rock[1]; ctx.fillRect(x - 3, y - 43, 7, 43);
        ctx.fillStyle = PAL.rock[0]; ctx.fillRect(x - 3, y - 43, 2, 43);
        ctx.fillStyle = PAL.rock[3]; ctx.fillRect(x + 2, y - 43, 2, 43);
        for (const by of [-34, -20, -8]) { ctx.fillStyle = INK; ctx.fillRect(x - 3, y + by, 7, 1); }
        ctx.fillStyle = INK; ctx.fillRect(x - 7, y - 50, 15, 7);
        ctx.fillStyle = L.lit ? '#3a1a6a' : '#1e1830'; ctx.fillRect(x - 6, y - 49, 13, 5);
        ctx.fillStyle = L.lit ? '#b46aff' : '#2e2448'; ctx.fillRect(x - 6, y - 49, 13, 1);
        if (L.lit) {
          // purple fire (it flares up as it comes on), in a halo of its own light
          const k = L.t < 0.3 ? 1.6 - L.t * 2 : 1, f = Math.floor(t * 10 + L.ph) % 3, h = Math.round((14 + f * 2) * k), top = y - 49 - h;
          const gl = ctx.createRadialGradient(x, y - 56, 2, x, y - 56, 28 * k);
          gl.addColorStop(0, 'rgba(180,106,255,0.5)'); gl.addColorStop(1, 'rgba(180,106,255,0)');
          ctx.fillStyle = gl; ctx.fillRect(x - 28 * k, y - 56 - 28 * k, 56 * k, 56 * k);
          ctx.fillStyle = '#4a149a'; ctx.fillRect(x - 5, top + 4, 11, h - 3);
          ctx.fillStyle = '#8a3af0'; ctx.fillRect(x - 4, top + 5 + (f === 1 ? 1 : 0), 9, h - 5);
          ctx.fillStyle = '#c890ff'; ctx.fillRect(x - 2, top + 7, 5, Math.max(1, h - 9));
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x, top + 9, 1, Math.max(1, h - 12));
          ctx.fillStyle = '#4a149a'; ctx.fillRect(x + (f - 1), top, 1, 5); ctx.fillRect(x - 3 + f, top + 2, 1, 3);
        }
      }
    }

    update(dt, g) {
      for (const L of this.lamps) if (L.lit) L.t += dt;
      if (this.sigil.t >= 0) this.sigil.t += dt;
      if (this.portal) this.portal.k = this.portal.open ? Math.min(1, this.portal.k + dt / 1.2) : Math.max(0, this.portal.k - dt / 0.6);
      if (this.passage.breakT >= 0) this.passage.breakT += dt;
      // the lift: its gate coming down, rising (carrying you up the shaft with it)
      const Lf = this.lift;
      Lf.t += dt;
      Lf.press = Math.max(0, Lf.press - dt * 2.5);
      if (Lf.state === 'closing') { Lf.gate = Math.min(1, Lf.gate + dt * 2.2); if (Lf.gate >= 1) Lf.state = 'shut'; }
      if (Lf.state === 'rising') { Lf.vy = Math.min(Lf.vy + 80 * dt, 240); Lf.y += Lf.vy * dt; }
      if (Lf.carry && g.player) { const pl = g.player; pl.y = this.floorY - Lf.y - pl.h; pl.vy = 0; pl.vx = 0; pl.onGround = true; }
      // the lava, far below: blorp
      this.bubbleT -= dt;
      if (this.bubbleT <= 0) { this.bubbleT = U.lerp(1.5, 4, Math.random()); sfx('lavaBubble', { minGap: 0.4 }); }
      // walk out into the middle of it...
      const p = g.player;
      if (!this.introDone && !g.script && g.state === 'play' && p.controls && p.cx > this.triggerX) {
        this.introDone = true;
        g.runScript(ERX.Story.world.abyssBoss);
      }
    }

    /** In the lift, by the button: press it. (Of course you're going to press it.) */
    interact(g) {
      const p = g.player, Lf = this.lift;
      if (!this.bossDone || Lf.state !== 'idle' || g.script) return null;
      if (Math.abs(p.cx - Lf.x) > 24 || Math.abs(p.feet - this.floorY) > 4) return null;
      return { x: Lf.x + 18, y: this.floorY - 56, text: '{use} PRESS THE BIG RED BUTTON', act: (gg) => gg.runScript(ERX.Story.world.liftGo) };
    }

    liveLights(g) {
      const out = [];
      for (const L of this.lamps) if (L.lit) out.push({ x: L.x, y: L.y - 54, r: 118 * (0.96 + 0.04 * Math.sin(g.t * 7 + L.ph)), color: '#a050ff', intensity: 1 });
      if (this.sigil.t >= 0) out.push({ x: this.sigil.x, y: this.sigil.y, r: 84, color: '#b46aff', intensity: 0.7 * Math.min(1, this.sigil.t / 0.6) });
      if (this.portal && this.portal.k > 0) out.push({ x: this.sigil.x, y: this.sigil.y, r: 70, color: '#4a8aff', intensity: this.portal.k });
      if (this.passage.sealed) out.push({ x: this.passage.x + 8, y: this.passage.top + 24, r: 40, color: '#4a8aff', intensity: 0.7 });
      if (this.camRight === undefined) {
        // the lift room's work lamps, and the big red button, glowing
        for (const l of this.roomLamps || []) out.push({ x: l.x, y: l.y, r: 78 * (0.97 + 0.03 * Math.sin(g.t * 13 + l.x)), color: '#ffd890', intensity: 0.95 });
        const Lf = this.lift;
        out.push({ x: Lf.x + 23, y: this.floorY - Lf.y - 22, r: 18, color: '#ff4a3a', intensity: Lf.state === 'idle' ? 0.6 + 0.3 * Math.sin(g.t * 6) : 0.4 });
      }
      if (g && g.enemies) for (const e of g.enemies) { const l = e.light && !e.dead && !e.hidden ? e.light() : null; if (l) out.push(l); }   // the boss and its minions burn blue
      if (this.backdrop && g && g.camera) for (const l of this.backdrop.lights(g.camera)) out.push(l);
      return out;
    }
  }

  AbyssLevel.LAMPS = LAMPS;
  ERX.AbyssArt = AbyssArt;
  ERX.AbyssLevel = AbyssLevel;
})(window.ERX = window.ERX || {});
