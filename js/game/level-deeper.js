/*
 * THE DEEPER ENDS — where you land after the old cave's floor gives way.
 *
 *   the landing chamber (a hole in its ceiling: that's how you got here) ->
 *   the first gallery (floating ledges) -> the basin (a glowing pool) ->
 *   the second gallery -> THE CAVERN HALL (ledges climbing up in front of a
 *   great waterfall) -> the far chamber -> a tunnel -> THE TRIAL (six waves,
 *   then its great door opens) -> THE DARK (a pitch-black corridor: take the
 *   torch by the door. Its floor is skulls. Then it isn't a floor any more.)
 *
 * A mystical dark cave: black rock underfoot; floating slabs of dark stone
 * with crystals on top and crystals hanging under them; great crystal
 * formations along the back; and far behind, in the dark, more caves, with
 * stalactites, twinkling crystals and glowing waterfalls (see Cavern).
 * Monsters: dark slimes, vampires, zombies, dark deepers and bats
 * (js/game/enemies-deep.js). The trial, the torch and the bones are run by
 * js/game/deeper-trial.js. Built with the cave's tools (it extends CaveLevel).
 * The story for it is in story-world.js.
 *
 *   level.drawSky()     the caves far behind (the game screen calls it)
 *   level.drawLive()    motes of light, the trial's portals and door, the bones
 *   level.drawFog()     over you: the pool, the bones at your feet, the black past the door, your torch
 *   level.liveLights()  the monsters' glow, the waterfalls' light, the portals, your torch
 *   level.update()      splashes, the trial, the dark corridor
 *   level.interact()    take the torch
 *   level.collapse()    the floor of skulls gives way (the story calls it)
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, PB = ERX.PixelBuffer, C = ERX.Color;
  const TS = 16;
  const c32 = (h) => C.u32(h);
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);

  const PAL = {
    rock: ['#4a4260', '#363048', '#262236', '#1a1628', '#120f1c', '#0a0812'],
    moss: ['#5a3a8a', '#3e2a6a'],
    metal: ['#a8b0c0', '#848ca0', '#5e6478', '#3e4254'],
    wood: ['#6a6088', '#4a4266', '#2e2844'],
    outline: '#040306',
    back: ['#120e1e', '#0e0b18', '#0a0812', '#1a1428'],
    vein: ['#8a6aff', '#5a8aff', '#c86aff', '#4ac8e8'],   // glints of crystal in the rock itself
    decor: ['#4a4260', '#363048', '#262236', '#16121f'],  // stalactites: black rock, like the floor
  };
  /** Dark crystals: the stone is dark, the light it gives off isn't. */
  const CRYSTALS = [
    { hue: '#24184e', glow: '#9a7aff', edge: '#b49aff' },
    { hue: '#1a1a44', glow: '#6a9aff', edge: '#8ab4ff' },
    { hue: '#2e1440', glow: '#d07aff', edge: '#e09aff' },
    { hue: '#142638', glow: '#5ad8f0', edge: '#8ae8ff' },
  ];
  /** The floating ledges: slabs of dark stone. */
  const SLAB = { top: '#7a6e9a', hi: '#9a8ec0', stone: '#4a4266', dark: '#2e2844', seam: '#2a2440' };
  const FLOOR = 24;
  // floating ledges: [first tile, last tile, row]. You jump a little over 3 tiles, so going up,
  // each one is at most 3 rows above the one before, and overlaps it or starts right where it
  // ends (you jump up through them from below). Going down, anything goes.
  const LEDGES = [
    // the first gallery
    [34, 38, 21], [38, 43, 18], [44, 49, 15], [53, 57, 17], [60, 64, 20],
    // the second gallery
    [97, 101, 21], [101, 106, 18], [107, 112, 15], [116, 121, 17], [124, 127, 20],
    // the cavern hall: up and up, to a perch right in front of the great waterfall
    [133, 137, 21], [137, 142, 18], [143, 148, 15], [149, 153, 12], [157, 161, 16], [164, 167, 20],
    // the trial: a pyramid of slabs to fight from
    [216, 221, 21], [221, 225, 18], [226, 238, 15], [239, 243, 18], [243, 248, 21],
  ];
  // the pool in the basin (tiles): water from x0 to x1, this deep (px) over the floor
  const POOL = { x0: 70, x1: 92, floor: FLOOR + 3, depth: 7 };
  // THE TRIAL (js/game/deeper-trial.js runs it): a gate in the doorway behind you, the arena
  // (tiles [x0, x1)), the great door in its far wall, the torch on the wall by the door
  const TRIAL = { gateTx: 212, gateRows: [21, 23], x0: 213, x1: 252, doorTx: 252, doorRows: [20, 23], torchTx: 249 };
  // THE DARK: the corridor past the door. Its floor is bones from bonesFrom on; the floor gives way
  // between holeX0 and holeX1 once you're past triggerX (tiles)
  const CORR = { x0: 252, x1: 326, top: 20, bonesFrom: 262, triggerX: 300, holeX0: 294, holeX1: 310 };

  // ------------------------------------------------------------ the caves, far behind
  /**
   * Two layers of cave far behind the one you're in (they drift past slower
   * than you, so they feel far away): giant pillars and stalactites with
   * crystals twinkling in them, then nearer rock with ledges of dark crystals,
   * and glowing waterfalls pouring out of the rock into pools.
   * Each layer is placed so its floor shows just above the real floor, from
   * where the camera usually is (you, standing on the floor).
   */
  class Cavern {
    constructor(level, vw, vh) {
      this.vw = vw; this.vh = vh;
      const rng = new U.RNG(0xd33b);
      const range = Math.max(0, level.ph - vh);
      this.camY0 = U.clamp(level.floorY - 32 - vh * 0.55, 0, range);
      const floorScreen = level.floorY - this.camY0;
      const layer = (kx, ky, gap) => {
        const pad = Math.ceil(this.camY0 * ky) + 12;
        return { kx, ky, pad, w: Math.round(vw + Math.max(0, level.pw - vw) * kx + 40), h: Math.round(vh + (range - this.camY0) * ky + pad + 12), floor: Math.round(floorScreen - gap + pad) };
      };
      this.far = layer(0.12, 0.25, 40);
      this.mid = layer(0.3, 0.45, 16);
      // the waterfalls: behind the first gallery, the cavern hall (the big one) and the end
      const atTile = (L, tx) => Math.round(vw / 2 + (tx * TS - vw / 2) * L.kx + 20);
      this.falls = [{ tx: 47, w: 12, drop: 92 }, { tx: 151, w: 26, drop: 136 }, { tx: 187, w: 16, drop: 110 }]
        .map((f) => ({ x: atTile(this.mid, f.tx), w: f.w, top: this.mid.floor - f.drop }))
        .filter((f) => f.x < this.mid.w - 30);
      this.glowSpots = [];
      this.far.cv = this.paintFar(rng, this.far);
      this.mid.cv = this.paintMid(rng, this.mid);
      this.water = this.paintWater();
      this.mist = this.paintMist();
      this.glints = Array.from({ length: 90 }, () => ({ x: rng.range(0, this.far.w), y: rng.range(this.far.pad, this.far.floor - 6), ph: rng.range(0, 6), sp: rng.range(1, 3), c: rng.pick(['#8a6aff', '#5a8aff', '#c86aff', '#5ad8f0']) }));
      this.motes = Array.from({ length: 50 }, () => ({ x: rng.range(0, vw), y: rng.range(0, vh), sp: rng.range(4, 12), ph: rng.range(0, 6), c: rng.pick(['#b48aff', '#7ae8ff', '#d07aff']) }));
    }

    layerX(L, cam) { return Math.round(-cam.x * L.kx - 20); }
    layerY(L, cam) { return Math.round((this.camY0 - cam.y) * L.ky - L.pad); }

    /** The farthest cave: a ceiling with stalactites, giant pillars, a floor with stalagmites. Barely lit. */
    paintFar(rng, L) {
      const { w, h } = L, b = new PB(w, h);
      const ceil = L.pad + 6;
      const fill = '#0e0a1c', body = '#140e28', lit = '#1e1638', dark = '#0a0614';
      for (let x = 0; x < w; x++) {
        const c = Math.round(ceil + Math.sin(x * 0.04) * 4 + Math.sin(x * 0.13) * 2);
        for (let y = 0; y <= c; y++) b.set(x, y, c32(y === c ? lit : fill));
        const f = Math.round(L.floor + Math.sin(x * 0.05 + 1) * 3 + Math.sin(x * 0.19) * 1.5);
        for (let y = f; y < h; y++) b.set(x, y, c32(y === f ? lit : fill));
      }
      for (let i = 0; i < w / 85; i++) {
        const cx = i * 85 + rng.range(-25, 25), hw = rng.range(9, 22), ph = rng.range(0, 6);
        for (let y = ceil; y < L.floor + 4; y++) {
          const k = (y - ceil) / (L.floor - ceil), pinch = 0.65 + 0.35 * Math.abs(Math.cos(k * Math.PI)), wob = Math.sin(y * 0.02 + ph) * 3, half = hw * pinch;
          for (let x = Math.round(cx + wob - half); x <= Math.round(cx + wob + half); x++) b.set(x, y, c32(x < cx + wob - half + 2 ? lit : x > cx + wob + half - 3 ? dark : body));
        }
      }
      const spike = (x, y0, len, dir, col, edge) => { for (let i = 0; i < len; i++) { const hw = Math.max(0, Math.round(3 * (1 - i / len))); for (let dx = -hw; dx <= hw; dx++) b.set(x + dx, y0 + dir * i, c32(dx === -hw && hw > 0 ? edge : col)); } };
      for (let x = 0; x < w; x += rng.int(3, 8)) spike(x, ceil + 2, rng.int(6, 46), 1, '#120c22', lit);
      for (let x = 0; x < w; x += rng.int(6, 12)) spike(x, L.floor + 1, rng.int(5, 26), -1, '#110b20', lit);
      return b.toCanvas();
    }

    /** The nearer back cave: stalactites, pillars, ledges of dark crystals (glowing), the waterfalls' rock and pools. */
    paintMid(rng, L) {
      const { w, h } = L, b = new PB(w, h);
      const ROCK = c32('#1e1632'), LIT = c32('#2c2248'), DARK = c32('#120c20');
      const rock = (x, y, k) => b.set(x, y, k === 1 ? LIT : k === -1 ? DARK : ROCK);
      const nearFall = (x, m) => this.falls.some((f) => Math.abs(f.x - x) < f.w / 2 + m);
      const ceil = L.pad - 2;
      // a jagged ceiling, stalactites hanging off it
      for (let x = 0; x < w; x++) {
        const c = Math.round(ceil + Math.sin(x * 0.07) * 3 + Math.sin(x * 0.23) * 2);
        for (let y = 0; y <= c; y++) rock(x, y, y === c ? -1 : 0);
      }
      for (let x = 0; x < w; x += rng.int(4, 9)) {
        const len = rng.int(8, 34), hw0 = rng.range(2, 4.5), tip = rng.chance(0.25) ? rng.pick(CRYSTALS) : null;
        for (let i = 0; i < len; i++) {
          const hw = Math.max(0, Math.round(hw0 * (1 - i / len)));
          for (let dx = -hw; dx <= hw; dx++) {
            if (tip && i > len - 5) b.set(x + dx, ceil + i, c32(dx === -hw ? tip.edge : tip.hue));
            else rock(x + dx, ceil + i, dx === -hw ? 1 : dx === hw ? -1 : 0);
          }
        }
        if (tip) this.glowSpots.push({ x, y: ceil + len - 2, r: 20, c: tip.glow });
      }
      // pillars
      for (let i = 0; i < w / 150; i++) {
        const cx = i * 150 + rng.range(30, 120), hw = rng.range(7, 15), ph = rng.range(0, 6);
        if (nearFall(cx, hw + 30)) continue;     // keep the waterfalls clear
        for (let y = ceil; y < L.floor + 4; y++) {
          const wob = Math.sin(y * 0.03 + ph) * 2, half = hw * (0.8 + 0.2 * Math.sin(y * 0.05 + ph));
          for (let x = Math.round(cx + wob - half); x <= Math.round(cx + wob + half); x++) rock(x, y, x < cx + wob - half + 2 ? 1 : x > cx + wob + half - 2 ? -1 : 0);
        }
      }
      // a little cluster of dark crystals (and its soft glow: painted on at the end)
      const crystals = (cx, cy, n, size) => {
        const c = rng.pick(CRYSTALS);
        for (let i = 0; i < n; i++) {
          const sx = cx + (i - (n - 1) / 2) * 3 + rng.range(-1, 1), len = Math.round(size * rng.range(0.6, 1.2)), lean = rng.range(-0.25, 0.25);
          for (let k = 0; k < len; k++) {
            const hw = Math.max(0, Math.round(1.5 * (1 - k / len)));
            for (let dx = -hw; dx <= hw; dx++) b.set(Math.round(sx + dx + lean * k), Math.round(cy - k), c32(dx === -hw ? c.edge : k > len - 3 ? '#e8dcff' : c.hue));
          }
        }
        this.glowSpots.push({ x: cx, y: cy - size * 0.5, r: Math.round(size * 2.6), c: c.glow });
      };
      // rock ledges sticking out of the dark, crystals growing on them
      for (let i = 0; i < w / 95; i++) {
        const len = rng.range(30, 70), x0 = rng.range(0, w - len), y0 = rng.range(L.pad + 34, L.floor - 34);
        if (this.falls.some((f) => x0 < f.x + f.w / 2 + 20 && x0 + len > f.x - f.w / 2 - 20)) continue;
        for (let x = Math.round(x0); x < x0 + len; x++) {
          const k = (x - x0) / len, thick = Math.round(4 + 8 * Math.sin(k * Math.PI) + Math.sin(x * 0.7) * 1.5);
          for (let y = 0; y < thick; y++) rock(x, Math.round(y0) + y, y === 0 ? 1 : y > thick - 3 ? -1 : 0);
        }
        crystals(x0 + len * rng.range(0.25, 0.75), Math.round(y0), rng.int(3, 5), rng.range(6, 11));
      }
      // the floor, far off, crystals along it
      for (let x = 0; x < w; x++) {
        const top = Math.round(L.floor + Math.sin(x * 0.05) * 3 + Math.sin(x * 0.17) * 1.5);
        for (let y = top; y < h; y++) rock(x, y, y === top ? 1 : 0);
      }
      for (let x = rng.range(10, 40); x < w; x += rng.range(40, 90)) if (!nearFall(x, 30)) crystals(x, L.floor - 1, rng.int(3, 6), rng.range(8, 15));
      // the waterfalls: a crag of rock they pour out from, a pool they pour into
      for (const f of this.falls) {
        const hw = f.w / 2 + 9;
        for (let y = ceil; y <= f.top + 5; y++) {
          const k = (y - ceil) / Math.max(1, f.top + 5 - ceil), half = hw + 4 * Math.sin(k * Math.PI) - (y > f.top ? (y - f.top) * 1.5 : 0);
          for (let x = Math.round(f.x - half); x <= Math.round(f.x + half); x++) rock(x, y, x < f.x - half + 2 ? 1 : x > f.x + half - 2 ? -1 : 0);
        }
        b.ellipse(f.x, f.top + 3, f.w / 2 + 1, 2, c32('#05030a'));      // the dark mouth the water comes out of
        b.ellipse(f.x, L.floor, f.w * 1.5, 4, c32('#0e3a4a'));           // the pool
        b.ellipse(f.x, L.floor - 1, f.w * 1.4, 2, c32('#16566a'));
        b.hline(Math.round(f.x - f.w * 1.3), Math.round(f.x + f.w * 1.3), L.floor - 2, c32('#2a8aa0'));
      }
      // the crystals' glow: soft light spilling over the rock round them
      const cv = b.toCanvas(), c = cv.getContext('2d');
      for (const s of this.glowSpots) {
        const gl = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
        gl.addColorStop(0, C.rgba(s.c, 0.4)); gl.addColorStop(1, C.rgba(s.c, 0));
        c.fillStyle = gl; c.fillRect(Math.floor(s.x - s.r), Math.floor(s.y - s.r), Math.ceil(s.r * 2), Math.ceil(s.r * 2));
      }
      return cv;
    }

    /** A strip of falling water that tiles top to bottom: streaks of bright and dark teal. */
    paintWater() {
      const W = 32, H = 64, b = new PB(W, H), rng = new U.RNG(0x4a7e);
      const ph = Array.from({ length: W }, () => [rng.range(0, 6), rng.range(0, 6)]);
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
        const v = Math.sin((y / H) * Math.PI * 4 + ph[x][0]) + Math.sin((y / H) * Math.PI * 6 + ph[x][1]) * 0.5;
        b.set(x, y, c32(v > 1.05 ? '#d8fcff' : v > 0.25 ? '#6ae0f4' : v > -0.6 ? '#2aa8c8' : '#16708e'));
      }
      return b.toCanvas();
    }
    paintMist() {
      const cv = ERX.makeCanvas(40, 24), c = cv.getContext('2d');
      const g = c.createRadialGradient(20, 12, 1, 20, 12, 18);
      g.addColorStop(0, 'rgba(200,248,255,0.55)'); g.addColorStop(1, 'rgba(200,248,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, 40, 24);
      return cv;
    }

    draw(ctx, cam, vw, vh, t) {
      const gr = ctx.createLinearGradient(0, 0, 0, vh);
      gr.addColorStop(0, '#05030c'); gr.addColorStop(1, '#140c28');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, vw, vh);
      // the farthest cave, crystals twinkling in it
      const fx = this.layerX(this.far, cam), fy = this.layerY(this.far, cam);
      ctx.drawImage(this.far.cv, fx, fy);
      for (const g of this.glints) {
        const a = 0.5 + 0.5 * Math.sin(t * g.sp + g.ph);
        if (a < 0.35) continue;
        ctx.globalAlpha = a; ctx.fillStyle = g.c; ctx.fillRect(Math.round(g.x + fx), Math.round(g.y + fy), 1, 1);
      }
      ctx.globalAlpha = 1;
      // the nearer cave, and its waterfalls
      const mx = this.layerX(this.mid, cam), my = this.layerY(this.mid, cam);
      ctx.drawImage(this.mid.cv, mx, my);
      for (const f of this.falls) this.drawFall(ctx, f, mx, my, t, vw);
      // motes of light drifting up
      for (const m of this.motes) {
        const y = (((m.y - t * m.sp) % vh) + vh) % vh, x = (((m.x - cam.x * 0.6 + Math.sin(t * 0.8 + m.ph) * 6) % vw) + vw) % vw;
        ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2 + m.ph));
        ctx.fillStyle = m.c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
      ctx.globalAlpha = 1;
    }

    /** Glowing water pouring out of the rock, churning into the pool, mist rising off it. */
    drawFall(ctx, f, mx, my, t, vw) {
      const x = f.x + mx, top = f.top + my + 4, bottom = this.mid.floor + my - 1, W = f.w, x0 = Math.round(x - W / 2);
      if (x < -140 || x > vw + 140) return;
      const g = ctx.createRadialGradient(x, (top + bottom) / 2, 4, x, (top + bottom) / 2, Math.max(70, (bottom - top) * 0.6));
      g.addColorStop(0, 'rgba(90,216,240,0.22)'); g.addColorStop(1, 'rgba(90,216,240,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 170, top - 40, 340, bottom - top + 90);
      const off = Math.floor((t * 70) % 64);
      ctx.globalAlpha = 0.92;
      for (let y = top - off; y < bottom; y += 64) {
        const y0 = Math.max(top, y), y1 = Math.min(bottom, y + 64);
        if (y1 > y0) ctx.drawImage(this.water, 0, y0 - y, 32, y1 - y0, x0, y0, W, y1 - y0);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0e4a5e';
      ctx.fillRect(x0 - 1, top, 1, bottom - top); ctx.fillRect(x0 + W, top, 1, bottom - top);
      ctx.fillStyle = '#e8fcff';
      ctx.fillRect(x0, top, W, 1);                                     // the lip, where it spills out
      for (let i = 0; i < 7; i++) {
        const k = (t * 0.45 + i / 7) % 1, px = x + Math.sin(i * 2.3 + t * 0.7) * W * 0.9, py = bottom - k * 26;
        ctx.globalAlpha = (1 - k) * 0.55; ctx.drawImage(this.mist, Math.round(px - 20), Math.round(py - 12));
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#9af0ff';
      for (let i = 0; i < 9; i++) if (Math.sin(t * 3 + i * 1.7) > 0.4) ctx.fillRect(Math.round(x + (i - 4) * (W * 0.4 + 3)), bottom - 1 + (i % 3), 2, 1);
    }

    /** The waterfalls light the dark (world-space lights, wherever they are on screen right now). */
    lights(cam) {
      const out = [], mx = this.layerX(this.mid, cam), my = this.layerY(this.mid, cam);
      for (const f of this.falls) {
        const x = f.x + mx;
        if (x < -140 || x > this.vw + 140) continue;
        const top = f.top + my, bottom = this.mid.floor + my;
        for (const k of [0.1, 0.45, 0.8, 1]) out.push({ x: x + cam.x, y: top + (bottom - top) * k + cam.y, r: 52 + f.w * 1.4, color: '#5ad8f0', intensity: 0.8 });
      }
      return out;
    }
  }

  // ------------------------------------------------------------ the Deeper Ends
  class DeeperEndsLevel extends ERX.CaveLevel {
    configure() {
      this.W = 330;
      this.H = 30;
      this.pal = PAL;
      this.sections = [];
      this.id = 'deeper';
      this.mossUntil = -1;          // nothing grows down here
    }

    build() {
      const rng = new U.RNG(this.seed ^ 0xdee4);
      this.tiles.fill(1);
      // ---- carve it ----
      this.air(3, 30, 5, FLOOR);            // the landing chamber...
      this.air(14, 19, 0, 5);               // ...and the hole in its ceiling you fell through
      this.air(30, 70, 8, FLOOR);           // the first gallery
      this.air(70, 92, 10, FLOOR + 3);      // the basin (the pool)...
      this.plat(70, 73, FLOOR + 1); this.plat(88, 91, FLOOR + 1);   // ...with a step down at each side
      this.air(92, 130, 7, FLOOR);          // the second gallery
      this.air(130, 170, 3, FLOOR);         // THE CAVERN HALL: tall, the great waterfall behind it
      this.air(170, 200, 8, FLOOR);         // the far chamber
      this.air(200, 210, 14, FLOOR);        // a tunnel...
      this.air(210, TRIAL.x0, TRIAL.gateRows[0], FLOOR);     // ...a low doorway (the gate comes up out of its floor)...
      this.air(TRIAL.x0, TRIAL.x1, 6, FLOOR);                // ...THE TRIAL
      this.air(CORR.x0, CORR.x1, CORR.top, FLOOR);          // past its door: the dark corridor
      const noise = new U.Noise(this.seed ^ 0x55);
      const smooth = (x) => (x >= 13 && x <= 19) || (x >= 208 && x <= TRIAL.x0) || x >= TRIAL.x1 - 1;   // the hole over the landing, the doorway, the door and the corridor
      for (let x = 4; x < this.W - 2; x++) {
        if (smooth(x)) continue;
        let top = 0;
        for (let y = 1; y < this.H; y++) if (this.tile(x, y) === 0) { top = y; break; }
        if (!top) continue;
        const bump = Math.round(noise.n1(x * 0.27) * 2);
        for (let y = top; y < top + bump; y++) this.setTile(x, y, 1);
      }
      this.ledges = LEDGES.map(([x0, x1, y]) => ({ x0, x1, y }));
      for (const l of this.ledges) this.plat(l.x0, l.x1, l.y);
      this.pool = { x0: POOL.x0 * TS, x1: POOL.x1 * TS, y: POOL.floor * TS - POOL.depth, floor: POOL.floor * TS };

      this.floorY = FLOOR * TS;
      this.landX = 16.5 * TS;               // right under the hole
      this.spawn = { x: 22 * TS, y: FLOOR * TS };
      this.checkpoints = [this.spawn, ...[68, 94, 132, 172, 206].map((x) => ({ x: x * TS, y: FLOOR * TS }))];   // (+ one by the door, once the trial's done)

      // ---- crystals, torches ----
      this.decor = [];
      this.lights = [];
      this.torches = [];
      this.braziers = [];
      this.signs = [];
      this.chalk = [];
      this.npcs = [];
      const ground = (tx) => this._groundBelow(tx, 4) * TS;
      const crystal = (x, y, big) => {
        const c = rng.pick(CRYSTALS);
        const d = { kind: big ? 'bigcrystal' : 'crystal', x, y, hue: c.hue, size: rng.int(0, 2), phase: rng.range(0, 6) };
        this.decor.push(d);
        this.lights.push({ x: d.x, y: d.y - (big ? 16 : 7), r: big ? 96 : 54, color: c.glow, pulse: true, ref: d });
      };
      const torch = (tx) => {
        const t = { x: tx * TS + 8, y: ground(tx) - 3 * TS + 4, phase: rng.range(0, 10), lit: true };
        this.torches.push(t);
        this.lights.push({ x: t.x, y: t.y, r: 64, color: '#ffb050', flicker: true, ref: t });
        return t;
      };
      let n = 0;
      for (let tx = 5; tx < TRIAL.x1 - 2; tx += rng.int(2, 5)) {
        if (tx >= 13 && tx <= 20) continue;  // keep the landing spot clear
        if (tx >= POOL.x0 && tx < POOL.x1) continue;   // nothing grows in the pool
        if (tx >= 208 && tx <= TRIAL.x0 + 1) continue; // or in the doorway
        crystal(tx * TS + rng.int(2, 12), ground(tx), n++ % 3 === 0);
      }
      // dark crystals on every floating ledge (and hanging under it: renderBackWall)
      for (const l of this.ledges) {
        const span = l.x1 - l.x0 + 1;
        crystal(Math.round((l.x0 + span * 0.3) * TS), l.y * TS, false);
        if (span >= 5) crystal(Math.round((l.x0 + span * 0.75) * TS), l.y * TS, rng.chance(0.35));
        l.hangs = [0.28, 0.7].map((k) => ({ x: Math.round((l.x0 + span * k) * TS + rng.range(-3, 3)), len: rng.int(5, 9), c: rng.pick(CRYSTALS) }));
        for (const h of l.hangs) this.lights.push({ x: h.x, y: l.y * TS + 10 + h.len, r: 34, color: h.c.glow, pulse: true });
      }
      // great crystal formations growing up the back of the cave (not under the low ledges)
      this.formations = [];
      for (const tx of [25, 44, 56, 84, 106, 121, 143, 152, 162, 188, 203, 232]) {
        const c = rng.pick(CRYSTALS), f = { x: tx * TS + rng.int(0, 12), y: ground(tx), h: rng.int(26, 44), c, n: rng.int(4, 7) };
        this.formations.push(f);
        this.lights.push({ x: f.x, y: f.y - f.h * 0.5, r: 70, color: c.glow, pulse: true });
      }
      [9, 27, 49, 69, 79, 94, 112, 130, 141, 156, 170, 178, 192, 204, 215, 231].forEach(torch);
      for (let x = 4; x < TRIAL.x1; x++) {
        if (x >= 13 && x <= 19) continue;
        if (!rng.chance(0.2)) continue;
        const cy = this._ceilAbove(x, FLOOR - 1);
        if (cy > 0 && cy < TRIAL.gateRows[0] - 1) this.decor.push({ kind: 'stalactite', x: x * TS + rng.int(2, 13), y: (cy + 1) * TS, len: rng.int(5, 16), w: rng.int(3, 6) });
      }
      const sign = (tx, text) => this.signs.push({ x: tx * TS + 8, y: ground(tx), text, read: false });
      sign(207, 'THE TRIAL\nSix waves. No reward.\n(No XP. No gold. Just bragging rights.)');

      // ---- the last stretch: the trial, its door, the torch, the bones (js/game/deeper-trial.js) ----
      const T = ERX.DeeperTrial;
      this.trial = new T.Trial(this, TRIAL);
      this.torch = new T.Torch(this, torch(TRIAL.torchTx));      // the torch on the wall by the door: take it
      this.bones = new T.Bones(CORR.bonesFrom * TS, CORR.x1 * TS - 10, this.floorY, this.seed ^ 0xb0e5);
      this.dark = { collapsed: false };

      // motes of light drifting about the cave (drawLive)
      this.motes = Array.from({ length: 96 }, () => ({ x: rng.range(4, TRIAL.x1 - 1) * TS, y: rng.range(8, FLOOR - 1) * TS, ph: rng.range(0, 6), sp: rng.range(0.3, 0.9), c: rng.pick(CRYSTALS).glow }));

      // ---- what lives down here (js/game/enemies-deep.js) ----
      this.enemySpawns = [
        // the first gallery
        { type: 'darkSlime', x: 36 * TS }, { type: 'darkSlime', x: 47 * TS }, { type: 'bat', x: 53 * TS }, { type: 'deeper', x: 58 * TS },
        // the basin
        { type: 'zombie', x: 76 * TS }, { type: 'darkSlime', x: 81 * TS }, { type: 'zombie', x: 86 * TS },
        // the second gallery
        { type: 'deeper', x: 100 * TS }, { type: 'bat', x: 105 * TS }, { type: 'vampire', x: 110 * TS }, { type: 'bat', x: 117 * TS }, { type: 'darkSlime', x: 123 * TS },
        // the cavern hall
        { type: 'zombie', x: 137 * TS }, { type: 'bat', x: 144 * TS }, { type: 'deeper', x: 148 * TS }, { type: 'darkSlime', x: 153 * TS }, { type: 'vampire', x: 161 * TS },
      ];
    }

    /** Dark: the crystals, the torches and the waterfalls are the light. Past the trial's door: pitch black. */
    darknessAt(px) { return px > (CORR.x0 + 1.5) * TS ? 0.985 : 0.58; }

    /** Platforms down here are slabs of dark stone (the cave draws them as planks). */
    renderTiles() {
      const cv = super.renderTiles(), c = cv.getContext('2d'), rng = new U.RNG(this.seed ^ 0x51ab);
      const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      const runs = [];
      for (let ty = 0; ty < this.H; ty++) for (let tx = 0; tx < this.W; tx++) {
        if (!this.isPlatform(tx, ty) || this.isPlatform(tx - 1, ty)) continue;
        let tx1 = tx;
        while (this.isPlatform(tx1 + 1, ty)) tx1++;
        runs.push({ x0: tx, x1: tx1, y: ty });
      }
      for (const l of runs) {
        const x0 = l.x0 * TS, w = (l.x1 - l.x0 + 1) * TS, y = l.y * TS, x1 = x0 + w - 1;
        c.clearRect(x0, y, w, TS);
        px(x0 + 1, y, w - 2, 1, SLAB.top);                    // the top you walk on, catching the light
        px(x0, y + 1, w, 3, SLAB.stone);
        px(x0 + 1, y + 4, w - 2, 1, SLAB.dark);
        px(x0, y, 1, 1, PAL.outline); px(x1, y, 1, 1, PAL.outline);
        px(x0, y + 4, 1, 1, PAL.outline); px(x1, y + 4, 1, 1, PAL.outline);
        px(x0 + 1, y + 5, w - 2, 1, PAL.outline);
        // worn edges, cracks, crystal glints in the stone
        for (let x = x0 + 3; x < x1 - 2; x += rng.int(3, 7)) px(x, y, rng.int(1, 3), 1, SLAB.hi);
        for (let x = x0 + rng.int(4, 9); x < x1 - 3; x += rng.int(7, 13)) { px(x, y + 1, 1, 2, SLAB.seam); px(x + 1, y + 3, 1, 1, SLAB.seam); }
        for (let x = x0 + rng.int(3, 12); x < x1 - 2; x += rng.int(9, 18)) px(x, y + 2, 1, 1, rng.pick(CRYSTALS).edge);
      }
      return cv;
    }

    /** Just behind where you walk: rock and crystals hanging under the floating ledges, and great crystal formations. */
    renderBackWall() {
      const b = new PB(this.pw, this.ph), rng = new U.RNG(this.seed ^ 0xbacc);
      const crystalPx = (x, y, c, dx, hw, k, len) => b.set(Math.round(x), Math.round(y), c32(dx === -hw ? c.edge : k > len - 3 ? '#e8dcff' : dx === hw ? C.shade(c.hue, -0.3) : c.hue));
      for (const l of this.ledges) {
        // a jagged rock underside...
        const x0 = l.x0 * TS, x1 = (l.x1 + 1) * TS, y0 = l.y * TS + 4;
        const depth = (x) => { const k = (x - x0) / (x1 - x0); return Math.max(2, Math.round((3 + 7 * Math.sin(k * Math.PI)) * (0.75 + 0.25 * Math.sin(x * 1.3)))); };
        for (let x = x0 + 1; x < x1 - 1; x++) {
          const d = depth(x);
          for (let y = 0; y < d + 2; y++) b.set(x, y0 + y, c32(y < 3 ? '#3a3250' : y < d ? '#262036' : '#1a1628'));
        }
        // ...with dark crystals hanging off it, tips pointing down
        for (const h of l.hangs) {
          const top = y0 + depth(h.x) + 1;
          for (let k = 0; k < h.len; k++) {
            const hw = Math.max(0, Math.round(1.6 * (1 - k / h.len)));
            for (let dx = -hw; dx <= hw; dx++) crystalPx(h.x + dx, top + k, h.c, dx, hw, k, h.len);
          }
        }
      }
      for (const f of this.formations) {
        // a great cluster of dark crystals, tallest in the middle
        for (let i = 0; i < f.n; i++) {
          const k = i / (f.n - 1) - 0.5, len = Math.round(f.h * (1 - Math.abs(k) * 1.1) * rng.range(0.8, 1.1));
          if (len < 6) continue;
          const x = f.x + k * f.n * 5, lean = k * 0.5;
          for (let s = 0; s < len; s++) {
            const hw = Math.max(0, Math.round(2.6 * (1 - s / len)));
            for (let dx = -hw; dx <= hw; dx++) crystalPx(x + dx + lean * s, f.y - 1 - s, f.c, dx, hw, s, len);
          }
        }
      }
      // a few skulls piled in the trial's corners (a hint of what's coming)
      const art = ERX.DeeperTrial.boneArt;
      for (const [x, n] of [[(TRIAL.x0 + 0.4) * TS, 3], [(TRIAL.x1 - 1.4) * TS, 4]]) for (let i = 0; i < n; i++) b.blit(art(i % 3 === 2 ? 'bone' : 'skull'), Math.round(x + (i % 2) * 6 - 4), this.floorY - 9 - (i > 1 ? 5 : 0));
      // the dark corridor: catacomb walls, shelves cut into the stone with the dead laid out on them
      const cx0 = (CORR.x0 + 2) * TS, cx1 = CORR.x1 * TS, cy0 = CORR.top * TS, cy1 = FLOOR * TS;
      const STONE = ['#2a2236', '#1e1828', '#16121e', '#0a080e'].map(c32);
      const hash = (a, b2) => { const s = Math.sin(a * 127.1 + b2 * 311.7) * 43758.5453; return s - Math.floor(s); };
      for (let y = cy0; y < cy1; y++) {
        const row = Math.floor((y - cy0) / 10), by = (y - cy0) % 10;
        for (let x = cx0; x < cx1; x++) {
          const ox = x - cx0 + (row % 2) * 12, bx = ox % 24, block = hash(Math.floor(ox / 24), row);
          b.set(x, y, bx === 0 || by === 0 ? STONE[3] : by > 7 ? STONE[2] : block > 0.75 ? STONE[0] : STONE[1]);
        }
      }
      for (let x = cx0 + rng.int(4, 18); x < cx1 - 44; x += rng.int(40, 64)) {
        const w = 36, h = 10, y = cy0 + rng.int(12, 22);
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) b.set(x + xx, y + yy, c32(yy < 2 ? '#020103' : '#06050a'));
        if (rng.chance(0.6)) b.blit(art('skeleton'), x + 1, y + h - 8);          // one of them laid out on the shelf...
        else for (let sx = x + 1; sx < x + w - 8; sx += 8) b.blit(art('skull'), sx, y + h - 9);   // ...or a row of skulls
      }
      for (let x = cx0 + rng.int(20, 40); x < cx1 - 20; x += rng.int(30, 56)) {
        const y = cy0 + rng.int(2, 8);                                            // little skull niches, up high
        for (let yy = 0; yy < 10; yy++) for (let xx = 0; xx < 11; xx++) b.set(x + xx, y + yy, c32('#06050a'));
        b.blit(art(rng.chance(0.75) ? 'skull' : 'skullSide'), x + 1, y + 1);
      }
      b.outline(c32(PAL.outline));
      return b.toCanvas();
    }

    /** The caves far behind (see Cavern). g = the game screen. */
    drawSky(ctx, cam, vw, vh, g) {
      if (!this.cavern || this.cavern.vw !== vw || this.cavern.vh !== vh) this.cavern = new Cavern(this, vw, vh);
      this.cavern.draw(ctx, cam, vw, vh, g.t);
    }

    /** Behind you and the monsters: motes of light drifting about, the trial's portals and door, the bones. */
    drawLive(ctx, cam, g) {
      const t = g.t, vw = g.view.width, vh = g.view.height;
      for (const m of this.motes) {
        const x = Math.round(m.x + Math.sin(t * m.sp + m.ph) * 24) - cam.ix, y = Math.round(m.y + Math.sin(t * m.sp * 0.7 + m.ph * 2) * 14) - cam.iy;
        if (x < -2 || y < -2 || x > vw + 2 || y > vh + 2) continue;
        const a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.2 + m.ph));
        ctx.globalAlpha = a * 0.4; ctx.fillStyle = m.c; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
        ctx.globalAlpha = a; ctx.fillStyle = '#f0e8ff'; ctx.fillRect(x, y, 1, 1);
      }
      ctx.globalAlpha = 1;
      const view = { ix: cam.ix, iy: cam.iy, vw };
      this.trial.drawPortals(ctx, view);
      this.bones.draw(ctx, view, false);
      this.trial.drawDoor(ctx, view, t);
    }

    /** Over you: the pool, the bones at your feet, the black past the trial's door, the torch in your hand. */
    drawFog(ctx, cam, vw, vh, g) {
      const view = { ix: cam.ix, iy: cam.iy, vw };
      this.drawPool(ctx, cam, vw, vh, g);
      this.bones.draw(ctx, view, true);
      // past the door: black, unless you're in there (then it's the dark itself: darknessAt, and your torch)
      const x0 = (TRIAL.doorTx + 2) * TS, k = U.clamp((x0 + 8 - g.player.cx) / 40, 0, 1);
      if (k > 0) {
        const sx = Math.max(0, x0 - cam.ix), top = CORR.top * TS - cam.iy, h = (FLOOR - CORR.top) * TS + 2;
        if (sx < vw) { ctx.fillStyle = 'rgba(2,1,4,' + (0.97 * k).toFixed(3) + ')'; ctx.fillRect(sx, top, vw - sx, h); }
      }
      this.torch.draw(ctx, cam, g);
    }

    /** The pool in the basin: glowing water you wade through (drawn over you). */
    drawPool(ctx, cam, vw, vh, g) {
      const P = this.pool, t = g.t, x0 = P.x0 - cam.ix, x1 = P.x1 - cam.ix, y = P.y - cam.iy;
      if (x1 < 0 || x0 > vw || y > vh || y + POOL.depth < 0) return;
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#0e4a66'; ctx.fillRect(x0, y + 1, x1 - x0, POOL.depth - 1);
      ctx.globalAlpha = 0.6; ctx.fillStyle = '#2aa8c8';
      for (let x = x0; x < x1; x += 2) if (Math.sin(x * 0.4 + t * 2.4) + Math.sin(x * 0.13 - t * 1.3) > 0.7) ctx.fillRect(x, y + 2 + ((x >> 3) % 3), 2, 1);
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#7ae8ff';
      for (let x = x0; x < x1; x++) ctx.fillRect(x, y + (Math.sin(x * 0.35 + t * 3) > 0.6 ? 1 : 0), 1, 1);
      ctx.fillStyle = '#e8fcff';
      for (let i = 0; i < 12; i++) { const gx = x0 + ((i * 97 + Math.floor(t * 0.7 + i) * 41) % Math.max(1, x1 - x0)); if (Math.sin(t * 4 + i * 2.1) > 0.5) ctx.fillRect(gx, y, 2, 1); }
      // ripples round anything standing in it
      ctx.globalAlpha = 0.7; ctx.fillStyle = '#b8f4ff';
      const ring = (cx, w) => { const r = Math.round(w / 2 + 2 + ((t * 6) % 5)); ctx.fillRect(Math.round(cx) - cam.ix - r, y, 2, 1); ctx.fillRect(Math.round(cx) - cam.ix + r - 1, y, 2, 1); };
      const wet = (e) => e.cx > P.x0 && e.cx < P.x1 && e.y + e.h > P.y + 1;
      if (wet(g.player)) ring(g.player.cx, g.player.w);
      for (const e of g.enemies) if (!e.dead && !e.flying && wet(e)) ring(e.cx, e.w);
      ctx.globalAlpha = 1;
    }

    update(dt, g) {
      // the pool: a splash when you jump in, and when you wade through it
      const P = this.pool, p = g.player;
      const wet = p.cx > P.x0 && p.cx < P.x1 && p.feet > P.y + 1;
      if (wet && !this._wet && p.vy > 40) {
        sfx('waterSplash');
        for (let i = 0; i < 12; i++) g.fx.add({ x: p.cx + U.lerp(-5, 5, Math.random()), y: P.y, vx: U.lerp(-70, 70, Math.random()), vy: U.lerp(-170, -60, Math.random()), ay: 600, life: U.lerp(0.3, 0.6, Math.random()), color: i % 3 ? '#7ae8ff' : '#e8fcff', size: 1, fadeOut: 0.2 });
      }
      if (wet && Math.abs(p.vx) > 30 && Math.random() < dt * 12) g.fx.add({ x: p.cx - Math.sign(p.vx) * 4, y: P.y, vx: -p.vx * 0.2, vy: U.lerp(-80, -30, Math.random()), ay: 500, life: 0.3, color: '#9af0ff', size: 1, fadeOut: 0.15 });
      if (wet && Math.abs(p.vx) > 30) sfx('waterWade', { minGap: 0.32 });
      this._wet = wet;
      // the trial, then the dark
      this.trial.update(dt, g);
      this.updateDark(dt, g);
    }

    /** The dark corridor: you won't go in without a light; the floor is skulls; far along, it gives way. */
    updateDark(dt, g) {
      const D = this.dark, p = g.player, B = this.bones;
      B.update(dt);
      if (g.state !== 'play') return;
      if (!this.torch.held && p.cx > (CORR.x0 + 4) * TS) {
        p.x = (CORR.x0 + 4) * TS - p.w / 2;   // (the TAKE THE TORCH objective says why)
        if (p.vx > 0) p.vx = 0;
      }
      if (!D.collapsed && p.onGround && Math.abs(p.vx) > 25 && p.cx > B.x0 && p.cx < B.x1) sfx('boneStep', { minGap: 0.21 });   // crunch. crunch.
      if (g.script || D.collapsed) return;
      if (p.cx > CORR.triggerX * TS && p.onGround) { D.collapsed = true; g.runScript(ERX.Story.world.skullCollapse); }
    }

    /** The floor of skulls gives way under you: a hole right through, and everything on it goes down. */
    collapse(g) {
      const a = CORR.holeX0, b = CORR.holeX1, y0 = FLOOR * TS, h = this.ph - y0;
      for (let tx = a; tx < b; tx++) for (let ty = FLOOR; ty < this.H; ty++) this.setTile(tx, ty, 0);
      const tiles = g.tilesCanvas || this._tl;
      if (tiles) {
        // cut the hole out of the drawn floor (redrawing the whole level here would hitch)
        const c = tiles.getContext('2d');
        c.clearRect(a * TS, y0, (b - a) * TS, h);
        c.fillStyle = PAL.outline; c.fillRect(a * TS - 1, y0, 1, h); c.fillRect(b * TS, y0, 1, h);
      }
      this.bones.shake = 0;
      this.bones.collapse(a * TS - 2, b * TS + 2);
      for (let i = 0; i < 46; i++) {
        g.fx.add({
          x: U.lerp(a * TS, b * TS, Math.random()), y: this.floorY + U.lerp(-2, 10, Math.random()), vx: U.lerp(-40, 40, Math.random()), vy: U.lerp(-120, 40, Math.random()), ay: 700,
          life: U.lerp(0.6, 1.2, Math.random()), color: Math.random() < 0.5 ? PAL.rock[1 + Math.floor(Math.random() * 3)] : '#c8bc9a', size: Math.random() < 0.5 ? 2 : 1, fadeOut: 0.2,
        });
      }
      sfx('boneCollapse');
      g.shake(6, 0.6);
    }

    /** Things you can do here with {use}: take the torch off the wall, once the door's open. */
    interact(g) {
      const T = this.torch;
      if (!T.canTake(this.trial, g.player)) return null;
      return { x: T.wall.x, y: T.wall.y - 10, text: '{use} TAKE THE TORCH', act: (gg) => { T.take(gg); gg.completeObjective(); } };
    }

    /** The monsters' glow, the waterfalls' light (wherever they are on screen), the portals, the runes, your torch. */
    liveLights(g) {
      const out = [];
      if (g && g.enemies) for (const e of g.enemies) { const l = e.light && !e.dead ? e.light() : null; if (l) out.push(l); }
      if (this.cavern && g && g.camera) for (const l of this.cavern.lights(g.camera)) out.push(l);
      this.trial.lights(out);
      const tl = g && g.player ? this.torch.light(g) : null;
      if (tl) out.push(tl);
      return out;
    }
  }

  DeeperEndsLevel.LEDGES = LEDGES;
  DeeperEndsLevel.POOL = POOL;
  DeeperEndsLevel.TRIAL = TRIAL;
  DeeperEndsLevel.CORR = CORR;
  ERX.DeeperEndsLevel = DeeperEndsLevel;
})(window.ERX = window.ERX || {});
