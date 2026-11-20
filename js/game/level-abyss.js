/*
 * THE ABYSS — where the floor of skulls drops you (js/game/abyss-fall.js).
 *
 * A vast cavern far under the Deeper Ends. You land on a great slab of black
 * rock hanging over a lake of BLACK LAVA (black crust, magenta-hot cracks);
 * stone pillars rise out of the lava into the dark, dark crystals growing on
 * them. Lots of space. Too much space. Almost as if something BIG is meant
 * to stand in it: walk out into the middle and six purple lights slam on,
 * a sigil on the wall flares, and a warning goes up: A BOSS ENEMY IS
 * APPROACHING (story-world.js: abyssBoss). It isn't. Not yet.
 *
 *   level.drawSky()     the cavern: far walls with lava falls, the pillars, the black lava lake
 *   level.drawLive()    the lamps, the sigil
 *   level.update()      lava bubbling; walking into the middle starts the boss intro
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
  // the six lamps (tiles): they light in pairs, from the far ends in
  const LAMPS = [8, 19, 30, 54, 65, 76];

  class AbyssLevel extends ERX.CaveLevel {
    configure() {
      this.W = 85;
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
      this.solid(0, 3, 0, this.H); this.solid(this.W - 3, this.W, 0, this.H);
      this.floorY = FLOOR * TS;
      this.underY = (FLOOR + 2) * TS;          // the slab's underside
      this.centerX = Math.round(this.W / 2) * TS;
      this.landX = 15 * TS;
      this.spawn = { x: 15 * TS, y: this.floorY };
      this.triggerX = this.centerX - 7 * TS;   // walk this far out and the lights come on
      this.slimeX = this.centerX - 2 * TS;     // ...and that's where the slime ends up standing
      this.checkpoints = [this.spawn];
      this.decor = [];
      this.lights = [];
      this.torches = [];
      this.braziers = [];
      this.signs = [];
      this.chalk = [];
      this.npcs = [{ id: 'slime', name: 'GRUMPY SLIME', x: this.slimeX, y: this.floorY, facing: -1, hidden: true }];
      this.enemySpawns = [];
      this.lamps = LAMPS.map((tx) => ({ x: tx * TS + 8, y: this.floorY, lit: false, t: 0, ph: rng.range(0, 6) }));
      this.lampOrder = [[0, 5], [1, 4], [2, 3]];
      this.lit = false;
      this.sigil = { x: this.centerX, y: this.floorY - 100, r: 56, t: -1 };
      for (let x = 4; x < this.W - 4; x++) if (rng.chance(0.25)) this.decor.push({ kind: 'pebbles', x: x * TS + rng.int(0, 12), y: this.floorY });
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

    /** The slab's underside: rough black rock hanging down over the lava, dark crystals hanging off it. */
    renderBackWall() {
      const b = new PB(this.pw, this.ph), rng = new U.RNG(this.seed ^ 0x51ab), y0 = this.underY;
      for (let x = 3 * TS; x < (this.W - 3) * TS; x++) {
        const d = Math.round(10 + 9 * Math.sin(x * 0.021) + 6 * Math.sin(x * 0.067 + 1) + 3 * Math.sin(x * 0.31));
        for (let y = 0; y < d; y++) b.set(x, y0 + y, c32(y < 3 ? PAL.rock[2] : y < d - 3 ? PAL.rock[3] : PAL.rock[4]));
      }
      for (let x = 3 * TS + rng.int(10, 30); x < (this.W - 4) * TS; x += rng.int(24, 60)) {
        const c = rng.pick(CRYSTALS), len = rng.int(6, 14);
        let top = y0;
        while (top < this.ph - 1 && b.solid(x, top + 1)) top++;
        for (let k = 0; k < len; k++) {
          const hw = Math.max(0, Math.round(1.8 * (1 - k / len)));
          for (let dx = -hw; dx <= hw; dx++) b.set(x + dx, top + k, c32(dx === -hw ? c.edge : k > len - 3 ? '#f0e4ff' : c.hue));
        }
      }
      b.outline(c32(INK));
      return b.toCanvas();
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

    liveLights(g) {
      const out = [];
      for (const L of this.lamps) if (L.lit) out.push({ x: L.x, y: L.y - 54, r: 118 * (0.96 + 0.04 * Math.sin(g.t * 7 + L.ph)), color: '#a050ff', intensity: 1 });
      if (this.sigil.t >= 0) out.push({ x: this.sigil.x, y: this.sigil.y, r: 84, color: '#b46aff', intensity: 0.7 * Math.min(1, this.sigil.t / 0.6) });
      if (this.backdrop && g && g.camera) for (const l of this.backdrop.lights(g.camera)) out.push(l);
      return out;
    }
  }

  AbyssLevel.LAMPS = LAMPS;
  ERX.AbyssArt = AbyssArt;
  ERX.AbyssLevel = AbyssLevel;
})(window.ERX = window.ERX || {});
