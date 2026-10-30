/*
 * THE CAVE — the first playable area.
 *
 * Layout (in 16px tiles, left to right):
 *   wake chamber (bright, torches) -> corridor (first jumps) ->
 *   descent (darker, mushrooms + crystals) -> pitch-black tunnel ->
 *   ARENA (metal gates, braziers) -> exit tunnel -> road closed.
 *
 * The level is carved out of solid rock by code (see build()), so it is
 * easy to tweak: change the numbers in SECTIONS.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, PB = ERX.PixelBuffer, C = ERX.Color;
  const c32 = (h) => C.u32(h);
  const TS = 16;
  const AIR = 0, ROCK = 1, PLAT = 2, METAL = 3;

  const W = 232, H = 22;

  // x ranges are [x0, x1) in tiles; ceil/floor are the first open row and the ground row.
  const SECTIONS = [
    { name: 'wake', x0: 2, x1: 31, ceil: 7, floor: 19, bump: 2 },
    { name: 'corridor', x0: 31, x1: 38, ceil: 11, floor: 19, bump: 1 },
    { name: 'ledge', x0: 38, x1: 46, ceil: 11, floor: 17, bump: 1 },
    { name: 'ledge2', x0: 46, x1: 53, ceil: 11, floor: 18, bump: 1 },
    { name: 'corridor2', x0: 53, x1: 62, ceil: 11, floor: 19, bump: 1 },
    { name: 'descent', x0: 62, x1: 72, ceil: 11, floor: 19, bump: 2 },
    { name: 'step', x0: 72, x1: 80, ceil: 12, floor: 20, bump: 1 },
    { name: 'hollow', x0: 80, x1: 91, ceil: 11, floor: 21, bump: 2 },
    { name: 'rise', x0: 91, x1: 108, ceil: 13, floor: 19, bump: 1 },
    { name: 'tunnel', x0: 108, x1: 123, ceil: 16, floor: 19, bump: 0 },
    { name: 'arena', x0: 123, x1: 161, ceil: 4, floor: 19, bump: 1 },
    { name: 'exit', x0: 161, x1: 176, ceil: 15, floor: 19, bump: 0 },
    { name: 'gauntlet', x0: 176, x1: 212, ceil: 9, floor: 19, bump: 2 },
    { name: 'deeper', x0: 212, x1: 222, ceil: 15, floor: 19, bump: 0 },
    { name: 'drop', x0: 222, x1: 231, ceil: 15, floor: 21, bump: 1 },
  ];

  const PAL = {
    rock: ['#8a7e9c', '#6a6080', '#524866', '#3c344e', '#2a2438', '#1e1a2a'],
    moss: ['#7aa84a', '#4e8040'],
    metal: ['#a8b0c0', '#848ca0', '#5e6478', '#3e4254'],
    wood: ['#a8784a', '#7a5236', '#4a3022'],
    outline: '#120c1a',
    back: ['#211a2c', '#1b1525', '#15111d', '#272033'],
  };

  // A tiny hash for per-pixel texture noise (fast, deterministic).
  function hash(x, y, s) {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  class CaveLevel {
    constructor(seed) {
      this.seed = seed >>> 0;
      this.TS = TS;
      this.configure();
      this.pw = this.W * TS;
      this.ph = this.H * TS;
      this.tiles = new Uint8Array(this.W * this.H);
      this.dynamicSolid = new Set(); // "x,y" keys for gates etc.
      this.build();
    }

    /** Size, palette and sections. Subclasses (other areas) override this. */
    configure() {
      this.W = W;
      this.H = H;
      this.pal = PAL;
      this.sections = SECTIONS;
      this.id = 'cave';
    }

    tile(x, y) {
      if (x < 0 || y < 0 || x >= this.W || y >= this.H) return ROCK;
      return this.tiles[y * this.W + x];
    }
    setTile(x, y, v) {
      if (x >= 0 && y >= 0 && x < this.W && y < this.H) this.tiles[y * this.W + x] = v;
    }
    /** Carve open air in a rectangle of tiles [x0,x1) x [y0,y1). */
    air(x0, x1, y0, y1) { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) this.setTile(x, y, AIR); }
    solid(x0, x1, y0, y1) { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) this.setTile(x, y, ROCK); }
    plat(x0, x1, y) { for (let x = x0; x <= x1; x++) this.setTile(x, y, PLAT); }
    /** Fully solid (walls/floors), including dynamic solids like closed gates. */
    isSolid(x, y) {
      const t = this.tile(x, y);
      return t === ROCK || t === METAL || this.dynamicSolid.has(x + ',' + y);
    }
    isPlatform(x, y) {
      return this.tile(x, y) === PLAT;
    }

    section(name) {
      return this.sections.find((s) => s.name === name);
    }

    build() {
      const rng = new U.RNG(this.seed ^ 0xca7e);
      const noise = new U.Noise(this.seed ^ 0x51);
      this.tiles.fill(ROCK);
      // carve each section
      for (const s of this.sections) {
        for (let x = s.x0; x < s.x1; x++) {
          const ceil = s.ceil + Math.round((noise.n1(x * 0.35) - 0.5) * 2 * s.bump);
          for (let y = Math.max(1, ceil); y < s.floor; y++) this.setTile(x, y, AIR);
        }
      }
      // arena: metal floor + one-way platforms
      const ar = this.section('arena');
      for (let x = ar.x0; x < ar.x1; x++) this.setTile(x, ar.floor, METAL);
      const plat = (x0, x1, y) => { for (let x = x0; x <= x1; x++) this.setTile(x, y, PLAT); };
      // every platform is 2 tiles above what you jump from (jump height is ~3 tiles)
      plat(128, 134, 17);
      plat(148, 154, 17);
      plat(138, 144, 15);
      // platforms in the hollow (a way back up, plus mushrooms to light the way)
      plat(82, 85, 19);
      plat(86, 89, 17);
      // walls between the arena and the tunnels above the doorways
      for (let y = 1; y < 16; y++) { this.setTile(122, y, ROCK); this.setTile(161, y, ROCK); this.setTile(212, y, ROCK); }
      // the monster cavern past the arena
      plat(184, 188, 17);
      plat(196, 200, 17);
      plat(190, 194, 15);

      this.spawn = { x: 9 * TS, y: 19 * TS };
      this.arena = {
        x0: ar.x0 * TS, x1: ar.x1 * TS, floorY: ar.floor * TS,
        triggerX: 127 * TS,
        leftGate: { tx: 122, ty0: 16, ty1: 18 },
        rightGate: { tx: 161, ty0: 16, ty1: 18 },
        dummyX: 141.5 * TS,
        centerX: 141.5 * TS,
      };
      this.exitSpawn = { x: 164 * TS, y: 19 * TS };
      this.gauntlet = { x0: 176 * TS, x1: 212 * TS, gate: { tx: 212, ty0: 16, ty1: 18 }, spawn: { x: 178 * TS, y: 19 * TS } };
      this.transitionX = 229 * TS;
      // the first real monsters
      this.enemySpawns = [
        { type: 'slime', x: 183 * TS, zone: 'gauntlet' },
        { type: 'slime', x: 192 * TS, zone: 'gauntlet' },
        { type: 'bat', x: 188 * TS, zone: 'gauntlet' },
        { type: 'slime', x: 199 * TS, zone: 'gauntlet' },
        { type: 'bat', x: 203 * TS, zone: 'gauntlet' },
        { type: 'slime', x: 207 * TS, zone: 'gauntlet', variant: 'big' },
      ];

      // ---- decorations, lights, signs ----
      this.decor = [];
      this.lights = [];
      this.torches = [];
      this.braziers = [];
      this.signs = [];
      this.chalk = [];

      const torch = (tx, ty, sec) => {
        const t = { x: tx * TS + 8, y: ty * TS + 4, phase: rng.range(0, 10), lit: true, section: sec };
        this.torches.push(t);
        this.lights.push({ x: t.x, y: t.y, r: 78, color: '#ffb050', flicker: true, ref: t });
      };
      [5, 12, 19, 26].forEach((x) => torch(x, 15, 'wake'));
      [34, 43, 52, 60].forEach((x, i) => torch(x, i === 1 ? 13 : 15, 'corridor'));
      [68, 77].forEach((x) => torch(x, 15, 'descent'));
      [166, 172].forEach((x) => torch(x, 16, 'exit'));
      [179, 195, 209].forEach((x) => torch(x, 14, 'gauntlet'));
      [216, 224].forEach((x) => torch(x, 16, 'deeper'));

      [125, 133, 150, 158].forEach((x) => {
        const b = { x: x * TS + 8, y: 19 * TS, lit: false, phase: rng.range(0, 10) };
        this.braziers.push(b);
        this.lights.push({ x: b.x, y: b.y - 18, r: 120, color: '#ffb050', flicker: true, ref: b });
      });

      // glowing mushrooms & crystals in the darker parts
      const glow = (tx, kind) => {
        const groundY = this._groundBelow(tx, 8) * TS;
        const d = { kind, x: tx * TS + rng.int(2, 12), y: groundY, hue: kind === 'mushroom' ? rng.pick(['#5ae8e0', '#7ab0ff', '#b07aff']) : rng.pick(['#7af0e0', '#c87aff', '#7ab8ff']), size: rng.int(0, 2), phase: rng.range(0, 6) };
        this.decor.push(d);
        this.lights.push({ x: d.x, y: d.y - 6, r: kind === 'mushroom' ? 30 : 40, color: d.hue, flicker: false, pulse: true, ref: d });
      };
      [64, 70, 74, 79, 83, 87, 93, 99, 104, 112, 119].forEach((x, i) => glow(x, i % 3 === 1 ? 'crystal' : 'mushroom'));
      // the mushrooms on the hollow platforms
      this.decor.push({ kind: 'mushroom', x: 84 * TS, y: 19 * TS, hue: '#5ae8e0', size: 1, phase: 1 });
      this.lights.push({ x: 84 * TS, y: 19 * TS - 6, r: 30, color: '#5ae8e0', pulse: true });

      // stalactites, stalagmites, pebbles
      for (let x = 2; x < this.W - 2; x++) {
        if (rng.chance(0.28)) {
          const cy = this._ceilAbove(x, 18);
          if (cy > 0) this.decor.push({ kind: 'stalactite', x: x * TS + rng.int(2, 13), y: (cy + 1) * TS, len: rng.int(5, 16), w: rng.int(3, 6) });
        }
        if (rng.chance(0.18)) {
          const gy = this._groundBelow(x, 10);
          if (gy && !(x >= 123 && x < 161)) this.decor.push({ kind: rng.chance(0.5) ? 'stalagmite' : 'pebbles', x: x * TS + rng.int(2, 13), y: gy * TS, len: rng.int(4, 10), w: rng.int(3, 6) });
        }
      }

      // signs
      const sign = (tx, text) => this.signs.push({ x: tx * TS + 8, y: this._groundBelow(tx, 10) * TS, text, read: false });
      sign(16, 'WELCOME TO: A CAVE.\nPopulation: you. Probably.');
      sign(29, 'This way to: more cave.\n(The other way is also cave.)');
      sign(56, 'CAUTION: it gets darker ahead.\nThe torches quit. They were not paid.');
      sign(96, 'Turn back?\nThere is no back. (There is. But do not.)');
      sign(115, 'ARENA AHEAD.\nNo refunds. No exits. Very ominous.');
      sign(174, 'MONSTERS AHEAD.\nProbably friendly. (They are not.)');
      sign(217, 'THIS WAY: THE DEEP ENDS.\nBring snacks. And a reason.');

      // chalk hints scribbled on the walls ({action} = current keybind)
      this.chalk.push({ x: 4 * TS, y: 12 * TS, text: '{moveLeft} {moveRight} TO MOVE' });
      this.chalk.push({ x: 13 * TS, y: 10 * TS, text: '{use} TO READ SIGNS' });
      this.chalk.push({ x: 34 * TS, y: 13 * TS, text: '{jump} TO JUMP' });
      this.chalk.push({ x: 62 * TS, y: 13 * TS, text: '{dash} TO DASH' });
      this.chalk.push({ x: 81 * TS, y: 14 * TS, text: 'PLATFORMS: JUMP UP THROUGH THEM' });
      this.chalk.push({ x: 100 * TS, y: 15 * TS, text: 'HI :)' });
    }

    _groundBelow(tx, fromY) {
      for (let y = fromY; y < this.H; y++) if (this.isSolid(tx, y) && !this.isSolid(tx, y - 1)) return y;
      return 0;
    }
    _ceilAbove(tx, fromY) {
      for (let y = fromY; y > 0; y--) if (this.tile(tx, y) === AIR && this.isSolid(tx, y - 1)) return y - 1;
      return 0;
    }

    /** How dark the cave is (0 = bright, 1 = pitch black) at pixel x. */
    darknessAt(px, arenaLit) {
      const tx = px / TS;
      if (tx < 30) return 0.06;
      if (tx < 62) return U.lerp(0.12, 0.4, (tx - 30) / 32);
      if (tx < 108) return U.lerp(0.45, 0.86, (tx - 62) / 46);
      if (tx < 123) return 0.93;
      if (tx < 161) return arenaLit ? 0.04 : 0.96;
      if (tx < 176) return 0.4;
      if (tx < 212) return 0.32;
      return U.lerp(0.45, 0.7, (tx - 212) / 20);
    }

    // ------------------------------------------------------------ rendering
    /** Pre-render the whole tile map into one canvas. */
    renderTiles() {
      const pw = this.pw, ph = this.ph;
      const W = this.W, H = this.H, PAL = this.pal;
      const buf = new PB(pw, ph);
      // distance (in tiles) from each solid tile to the nearest air tile
      const dist = new Uint8Array(W * H).fill(255);
      const q = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!this.isSolid(x, y)) { dist[y * W + x] = 0; q.push(x, y); }
      for (let i = 0; i < q.length; i += 2) {
        const x = q[i], y = q[i + 1], d = dist[y * W + x];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          if (dist[ny * W + nx] > d + 1) { dist[ny * W + nx] = d + 1; q.push(nx, ny); }
        }
      }
      const R = PAL.rock.map(c32), M = PAL.moss.map(c32), MT = PAL.metal.map(c32), WD = PAL.wood.map(c32);
      const rockNoise = new U.Noise(this.seed ^ 0x70c);
      const ink = c32(PAL.outline);
      const sol = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) sol[i] = this.tiles[i] === ROCK || this.tiles[i] === METAL ? 1 : 0;
      const solidPx = (x, y) => {
        const tx = x >> 4, ty = y >> 4;
        return tx < 0 || ty < 0 || tx >= W || ty >= H ? true : sol[ty * W + tx] === 1;
      };
      for (let ty = 0; ty < H; ty++) {
        for (let tx = 0; tx < W; tx++) {
          const t = this.tile(tx, ty);
          if (t === AIR) continue;
          const ox = tx * TS, oy = ty * TS;
          if (t === PLAT) {
            for (let x = 0; x < TS; x++) {
              buf.set(ox + x, oy, x % 8 === 7 ? WD[2] : WD[0]);
              buf.set(ox + x, oy + 1, WD[1]);
              buf.set(ox + x, oy + 2, WD[1]);
              buf.set(ox + x, oy + 3, ink);
            }
            buf.set(ox + 3, oy + 4, WD[2]); buf.set(ox + 3, oy + 5, WD[2]);
            buf.set(ox + 12, oy + 4, WD[2]); buf.set(ox + 12, oy + 5, WD[2]);
            continue;
          }
          const depth = dist[ty * W + tx];
          for (let y = 0; y < TS; y++) {
            for (let x = 0; x < TS; x++) {
              const gx = ox + x, gy = oy + y;
              const airUp = !solidPx(gx, gy - 1), airDown = !solidPx(gx, gy + 1), airL = !solidPx(gx - 1, gy), airR = !solidPx(gx + 1, gy);
              if (airUp || airDown || airL || airR) { buf.set(gx, gy, ink); continue; }
              let col;
              if (t === METAL) {
                const py = y % 8, pxx = (x + (ty % 2) * 4) % 16;
                col = py === 0 ? MT[0] : py === 7 || pxx === 0 ? MT[3] : (pxx === 2 || pxx === 13) && py === 2 ? MT[0] : depth > 1 ? MT[2] : MT[1];
              } else {
                // smooth rock strata + a little grain (not TV static)
                const strata = rockNoise.fbm2(gx * 0.06, gy * 0.11, 2);
                const n = strata + (hash(gx >> 1, gy >> 1, this.seed) - 0.5) * 0.12;
                const deep = Math.min(depth, 4);
                let k = 1 + deep + (n > 0.62 ? -1 : n < 0.38 ? 1 : 0);
                // light top surfaces, dark undersides
                const up2 = !solidPx(gx, gy - 3), down2 = !solidPx(gx, gy + 3);
                if (up2) k = n > 0.5 ? 0 : 1;
                else if (down2) k = Math.max(k, 3);
                col = R[U.clamp(k, 0, R.length - 1)];
                // moss on floors in the bright early cave
                if (up2 && tx < (this.mossUntil || 62) && hash(gx, 7, this.seed) > 0.35 && !solidPx(gx, gy - 2)) col = M[n > 0.5 ? 0 : 1];
                // sparkling crystal veins (Deep Ends)
                if (PAL.vein && deep >= 1 && deep <= 2 && hash(gx >> 1, gy >> 1, this.seed + 9) > 0.996) col = c32(PAL.vein[Math.floor(hash(gx >> 3, gy >> 3, 5) * PAL.vein.length)]);
                // cracks
                if (deep <= 1 && hash(gx, gy, this.seed + 3) > 0.985) col = R[4];
              }
              buf.set(gx, gy, col);
            }
          }
        }
      }
      return buf.toCanvas();
    }

    /** Tileable cave back wall (drawn with parallax behind the tiles). */
    renderBackground() {
      const w = 256, h = this.ph;
      const buf = new PB(w, h);
      const B = this.pal.back.map(c32);
      const noise = new U.Noise(this.seed ^ 0xb4c);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const wx = (x / w) * Math.PI * 2;
          const tn = (noise.n2(Math.cos(wx) * 3 + 10, y * 0.05) + noise.n2(Math.sin(wx) * 3 + 20, y * 0.04)) / 2;
          const v = tn + (ERX.bayer(x, y) - 0.5) * 0.12;
          buf.data[y * w + x] = v > 0.62 ? B[3] : v > 0.45 ? B[0] : v > 0.3 ? B[1] : B[2];
        }
      }
      return buf.toCanvas();
    }
  }

  CaveLevel.TS = TS;
  CaveLevel.TILES = { AIR, ROCK, PLAT, METAL };
  ERX.CaveLevel = CaveLevel;
})(window.ERX = window.ERX || {});
