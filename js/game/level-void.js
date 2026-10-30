/*
 * THE VOID — where you land after the reveal. Space in every direction and
 * no floor. (There is a floor. It's invisible. Don't think about it.)
 *
 * THE HQ — the Voice's headquarters, floating somewhere in the void. Desks,
 * a couch, staff of questionable usefulness, and Brenda's armour counter.
 *
 * ERX.Worlds.build(element) paints the 7 worlds you have to save. They are
 * different for every element (colours + surface types come from it).
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, PB = ERX.PixelBuffer, C = ERX.Color;
  const c32 = (h) => C.u32(h);
  const TS = 16;
  const { AIR, ROCK } = ERX.CaveLevel.TILES;

  const PAL = {
    rock: ['#8a7e9c', '#6a6080', '#524866', '#3c344e', '#2a2438', '#1e1a2a'],
    moss: ['#8a7e9c', '#6a6080'],
    metal: ['#a8b0c0', '#848ca0', '#5e6478', '#3e4254'],
    wood: ['#a8784a', '#7a5236', '#4a3022'],
    outline: '#120c1a',
    back: ['#0a0818', '#07061a', '#05040f', '#120a2a'],
  };

  const blank = (w, h) => ERX.makeCanvas(w, h);

  // ================================================================= VOID
  class VoidLevel extends ERX.CaveLevel {
    configure() {
      this.W = 150;
      this.H = 24;
      this.pal = PAL;
      this.sections = [];
      this.id = 'void';
    }

    build() {
      this.tiles.fill(AIR);
      // the invisible floor + invisible walls at both ends
      for (let x = 0; x < this.W; x++) for (let y = 18; y < this.H; y++) this.setTile(x, y, ROCK);
      for (let y = 0; y < this.H; y++) for (const x of [0, 1, this.W - 2, this.W - 1]) this.setTile(x, y, ROCK);

      this.floorY = 18 * TS;
      this.spawn = { x: 14 * TS, y: this.floorY };
      this.figureX = 66 * TS;     // where the Voice stands, staring at the horizon
      this.jumpX = 80 * TS;       // the jump point under world 1
      this.doorX = 96 * TS;       // the HQ door (appears later)
      this.checkpoints = [this.spawn];

      this.decor = [];
      this.lights = [];
      this.torches = [];
      this.braziers = [];
      this.signs = [{ x: 26 * TS + 8, y: this.floorY, text: 'THE VOID.\nPlease do not touch the nothing.', read: false }];
      this.chalk = [];
      this.npcs = [];
      this.enemySpawns = [];
    }

    darknessAt() { return 0; }
    renderTiles() { return blank(this.pw, this.ph); }   // the floor is invisible. obviously.

    /** Deep space: mostly dark, soft nebula clouds, lots of stars. Wide enough to never repeat. */
    renderBackground() {
      const w = Math.round(this.pw * 0.2) + 900, h = this.ph;
      const buf = new PB(w, h);
      const noise = new U.Noise(0x5eed);
      const purple = ['#05040f', '#08061a', '#0e0a26', '#160e36', '#201246', '#2c1656'].map(c32);
      const blue = ['#08102a', '#0c1838', '#122248'].map(c32);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const n = noise.fbm2(x * 0.006, y * 0.009, 4);
          const m = noise.fbm2(x * 0.004 + 50, y * 0.006 + 20, 3);
          const d = (ERX.bayer(x, y) - 0.5) * 0.06;
          let col = purple[U.clamp(Math.floor((n + d - 0.42) * 22), 0, purple.length - 1)];
          if (m + d > 0.58 && n < 0.56) col = blue[U.clamp(Math.floor((m + d - 0.58) * 25), 0, blue.length - 1)];
          buf.data[y * w + x] = col;
        }
      }
      const rng = new U.RNG(77);
      for (let i = 0; i < (w * h) / 70; i++) {
        const x = rng.int(0, w - 1), y = rng.int(0, h - 1);
        buf.set(x, y, c32(rng.chance(0.15) ? '#ffe8a0' : rng.chance(0.3) ? '#a8b8ff' : '#ffffff'));
        if (rng.chance(0.04)) { buf.set(x - 1, y, c32('#6a70b0')); buf.set(x + 1, y, c32('#6a70b0')); buf.set(x, y - 1, c32('#6a70b0')); buf.set(x, y + 1, c32('#6a70b0')); }
      }
      return buf.toCanvas();
    }
  }

  // ================================================================== HQ
  const HQ_PEOPLE = [
    { id: 'dot', x: 11.25 },
    { id: 'kev', x: 17 },
    { id: 'brenda', x: 23.75 },
    { id: 'steve', x: 32, pose: 'sit' },
    { id: 'atlas', x: 38 },
    { id: 'guide', x: 46 },
    { id: 'ron', x: 52, pose: 'punch' },
  ];

  class HqLevel extends ERX.CaveLevel {
    configure() {
      this.W = 64;
      this.H = 18;
      this.pal = PAL;
      this.sections = [];
      this.id = 'hq';
    }

    build() {
      this.tiles.fill(ROCK);
      this.air(2, this.W - 2, 4, 15);
      this.floorY = 15 * TS;
      this.spawn = { x: 6 * TS, y: this.floorY };
      this.exit = { x: 4 * TS + 8, y: this.floorY };
      this.trainingDoor = { x: 60 * TS + 8, y: this.floorY };
      this.checkpoints = [this.spawn];
      this.people = HQ_PEOPLE.map((p) => Object.assign({}, p, { x: Math.round(p.x * TS + 8), y: this.floorY }));

      this.decor = [];
      this.torches = [];
      this.braziers = [];
      this.signs = [];
      this.chalk = [];
      this.npcs = [];
      this.enemySpawns = [];
      this.lights = [];
      for (const lx of [8, 18, 28, 38, 48, 58]) this.lights.push({ x: lx * TS + 8, y: 4 * TS + 10, r: 90, color: '#ffd8a0', flicker: false });
      this.lights.push({ x: 4 * TS + 8, y: 12 * TS, r: 40, color: '#b07aff', flicker: false, pulse: true, ref: { phase: 0 } });
    }

    darknessAt() { return 0.18; }

    renderBackground() { return blank(16, 16); }

    /** Ceiling, side walls and a wooden floor. */
    renderTiles() {
      const buf = new PB(this.pw, this.ph);
      const ink = c32('#120c1a');
      for (let ty = 0; ty < this.H; ty++) for (let tx = 0; tx < this.W; tx++) {
        if (!this.isSolid(tx, ty)) continue;
        for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
          const gx = tx * TS + x, gy = ty * TS + y;
          let col;
          if (ty >= 15) {
            // floor planks
            const row = Math.floor((gy - 15 * TS) / 6);
            const seam = (gx + row * 23) % 40 === 0;
            col = gy === 15 * TS ? '#d8a868' : gy === 15 * TS + 1 ? '#b8844a' : seam ? '#5a3a22' : (gy - 15 * TS) % 6 === 0 ? '#6a4628' : row % 2 ? '#8a5a36' : '#9a6a40';
            if (gy > 15 * TS + 10) col = C.shade(col, -0.35);
          } else if (ty < 4) {
            col = gy === 4 * TS - 1 ? '#120c1a' : gy === 4 * TS - 2 ? '#5a4a7a' : (gx % 64 < 6) ? '#2a2040' : '#1c1630';
          } else {
            col = (tx < 2 ? gx === 2 * TS - 1 : gx === (this.W - 2) * TS) ? '#120c1a' : (gy % 24 === 0) ? '#2a2040' : '#3a2e54';
          }
          buf.data[gy * this.pw + gx] = c32(col);
        }
      }
      void ink;
      return buf.toCanvas();
    }

    /** The back wall: windows onto space, posters, furniture. Drawn 1:1 behind everything. */
    renderBackWall() {
      const cv = blank(this.pw, this.ph);
      const ctx = cv.getContext('2d');
      const F = ERX.Font;
      const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
      const top = 4 * TS, fl = this.floorY;
      // wallpaper + wainscot
      R(2 * TS, top, (this.W - 4) * TS, fl - top, '#2a2240');
      for (let x = 2 * TS; x < (this.W - 2) * TS; x += 12) R(x, top, 1, fl - top, '#30284a');
      R(2 * TS, fl - 40, (this.W - 4) * TS, 40, '#3a2a4a');
      R(2 * TS, fl - 41, (this.W - 4) * TS, 2, '#5a4a6a');
      for (let x = 2 * TS; x < (this.W - 2) * TS; x += 24) R(x, fl - 38, 1, 36, '#2e2040');
      R(2 * TS, fl - 3, (this.W - 4) * TS, 3, '#1c1428');

      // round windows onto space
      const rng = new U.RNG(4);
      for (const wx of [7.5, 19.5, 33.5, 52.5]) {
        const cx = Math.round(wx * TS), cy = top + 46, r = 22;
        for (let y = -r - 3; y <= r + 3; y++) for (let x = -r - 3; x <= r + 3; x++) {
          const d = Math.sqrt(x * x + y * y);
          if (d <= r) R(cx + x, cy + y, 1, 1, y < -r * 0.3 ? '#0a0818' : '#120a2a');
          else if (d <= r + 3) R(cx + x, cy + y, 1, 1, d <= r + 1 ? '#c89a50' : '#7a5a2a');
        }
        for (let i = 0; i < 18; i++) {
          const a = rng.range(0, Math.PI * 2), d = rng.range(0, r - 2);
          R(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1, 1, rng.chance(0.3) ? '#a8b8ff' : '#ffffff');
        }
        R(cx - r, cy, r * 2, 1, '#7a5a2a'); R(cx, cy - r, 1, r * 2, '#7a5a2a');
      }

      // the big neon sign
      F.draw(ctx, 'HERO HQ', 26 * TS, top + 10, { scale: 2, color: '#ff8ad8', outline: '#3a0a3a', align: 'center' });
      F.draw(ctx, '(EST. ???)', 26 * TS, top + 28, { color: '#c89aff', align: 'center' });
      // posters
      const poster = (x, y, lines, col) => {
        R(x - 1, y - 1, 52, 32, '#120c1a'); R(x, y, 50, 30, col);
        lines.forEach((l, i) => F.draw(ctx, l, x + 25, y + 4 + i * 8, { color: '#120c1a', align: 'center' }));
      };
      poster(14 * TS, top + 70, ['DESTROY', 'PILLARS.', 'HYDRATE.'], '#ffd36a');
      poster(41 * TS, top + 70, ['EMPLOYEE', 'OF THE', 'MONTH: ?'], '#8ad8ff');

      // exit door (back to the void)
      const dx = 4 * TS + 8;
      R(dx - 13, fl - 46, 26, 46, '#120c1a'); R(dx - 11, fl - 44, 22, 44, '#4a2a7a');
      R(dx - 9, fl - 42, 18, 40, '#120a2a');
      for (let i = 0; i < 10; i++) R(dx - 8 + rng.int(0, 15), fl - 41 + rng.int(0, 37), 1, 1, '#ffffff');
      F.draw(ctx, 'EXIT', dx, fl - 56, { color: '#7af0a0', align: 'center' });

      // coffee machine (Kev's station)
      R(18 * TS - 1, fl - 33, 14, 33, '#120c1a'); R(18 * TS, fl - 32, 12, 32, '#5e6478'); R(18 * TS + 3, fl - 26, 6, 6, '#1c1428'); R(18 * TS + 4, fl - 30, 4, 2, '#ff6a4f');

      // armour on stands (behind Brenda's counter)
      const stand = (x, col) => {
        R(x, fl - 52, 1, 30, '#5e6478');
        R(x - 5, fl - 50, 11, 12, '#120c1a'); R(x - 4, fl - 49, 9, 10, col); R(x - 2, fl - 48, 2, 3, C.shade(col, 0.4));
        R(x - 6, fl - 51, 4, 3, col); R(x + 3, fl - 51, 4, 3, col);
        R(x - 2, fl - 56, 5, 5, '#120c1a'); R(x - 1, fl - 55, 3, 3, '#3a2e54');
      };
      stand(21 * TS, '#c8a070'); stand(26 * TS + 6, '#a8b0c0'); stand(27 * TS + 14, '#ffd34d');

      // couch (Steve's)
      R(30 * TS, fl - 22, 54, 22, '#120c1a'); R(30 * TS + 1, fl - 21, 52, 14, '#8a3a5a'); R(30 * TS + 1, fl - 9, 52, 7, '#6a2a44');
      R(30 * TS - 2, fl - 16, 6, 16, '#6a2a44'); R(30 * TS + 50, fl - 16, 6, 16, '#6a2a44');

      // Dr. Atlas' map of the worlds
      R(36 * TS, top + 56, 64, 44, '#120c1a'); R(36 * TS + 1, top + 57, 62, 42, '#1c2348');
      for (let i = 0; i < 7; i++) {
        const mx = 36 * TS + 8 + (i % 4) * 15, my = top + 66 + Math.floor(i / 4) * 18;
        R(mx - 3, my - 3, 7, 7, '#120c1a'); R(mx - 2, my - 2, 5, 5, i === 0 ? '#7af0a0' : '#5a5e7a');
      }
      F.draw(ctx, 'WORLDS', 36 * TS + 32, top + 92, { color: '#a8f0ff', align: 'center' });
      // vending machine
      R(41 * TS + 4, fl - 44, 22, 44, '#120c1a'); R(41 * TS + 5, fl - 43, 20, 42, '#c83a3a');
      R(41 * TS + 7, fl - 40, 12, 24, '#1c1428');
      for (let i = 0; i < 6; i++) R(41 * TS + 8 + (i % 3) * 4, fl - 38 + Math.floor(i / 3) * 10, 3, 6, ['#ffd36a', '#7af0e0', '#ff8ad8'][i % 3]);

      // the plant that bites
      R(48 * TS, fl - 12, 10, 12, '#120c1a'); R(48 * TS + 1, fl - 11, 8, 11, '#a85a36');
      for (const [lx, ly] of [[-4, -20], [6, -24], [12, -18], [2, -28], [-2, -14]]) { R(48 * TS + lx, fl + ly, 6, 4, '#3a8a3a'); R(48 * TS + lx + 1, fl + ly, 2, 1, '#6ad86a'); }
      R(48 * TS + 3, fl - 26, 4, 2, '#ff3a4a'); // ...teeth?

      // weights rack (Big Ron)
      R(54 * TS - 2, fl - 26, 30, 2, '#5e6478');
      for (const wx of [54 * TS, 54 * TS + 22]) { R(wx - 2, fl - 30, 6, 10, '#120c1a'); R(wx - 1, fl - 29, 4, 8, '#3a3e54'); }
      R(54 * TS - 4, fl - 24, 2, 24, '#5e6478'); R(54 * TS + 28, fl - 24, 2, 24, '#5e6478');
      // the training room door
      const tx = 60 * TS + 8;
      R(tx - 14, fl - 48, 28, 48, '#120c1a'); R(tx - 12, fl - 46, 24, 46, '#7a5236'); R(tx - 10, fl - 44, 20, 42, '#5a3a22');
      R(tx + 6, fl - 24, 2, 3, '#ffd34d');
      R(tx - 30, fl - 66, 60, 13, '#120c1a'); R(tx - 29, fl - 65, 58, 11, '#c83a3a');
      F.draw(ctx, 'TRAINING ROOM', tx, fl - 63, { color: '#ffffff', align: 'center' });
      return cv;
    }

    /** Desks + counters, drawn IN FRONT of the people standing behind them. */
    renderFront() {
      const cv = blank(this.pw, this.ph);
      const ctx = cv.getContext('2d');
      const F = ERX.Font;
      const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
      const fl = this.floorY;
      const desk = (x0, w, h, col, colTop) => { R(x0 - 1, fl - h - 1, w + 2, h + 1, '#120c1a'); R(x0, fl - h, w, h, col); R(x0, fl - h, w, 2, colTop); R(x0, fl - 2, w, 2, C.shade(col, -0.35)); };
      desk(10 * TS, 40, 11, '#6a4a7a', '#a87ab8');
      F.draw(ctx, 'HELLO', 10 * TS + 20, fl - 9, { color: '#ffd36a', align: 'center' });
      desk(22 * TS, 56, 11, '#7a5236', '#b8844a');
      F.draw(ctx, 'ARMOR', 22 * TS + 28, fl - 9, { color: '#ffd34d', align: 'center' });
      desk(44 * TS, 60, 11, '#4a2a7a', '#c89aff');
      R(44 * TS + 6, fl - 21, 18, 10, '#120c1a'); R(44 * TS + 7, fl - 20, 16, 8, '#2a3a6a'); R(44 * TS + 9, fl - 18, 12, 4, '#7af0e0');
      R(44 * TS + 40, fl - 14, 12, 3, '#f4f0ff'); R(44 * TS + 42, fl - 16, 10, 2, '#d8d0ec');
      F.draw(ctx, 'THE BOSS', 44 * TS + 30, fl - 9, { color: '#ffd34d', align: 'center' });
      return cv;
    }
  }

  // ============================================================== WORLDS
  // where the 7 worlds hang in the sky: dx = offset from world 1 (fraction of
  // the view width; world 1 hangs right above the jump point), fy = height
  const SPOTS = [
    { dx: 0, fy: 0.24, r: 18 },
    { dx: -0.72, fy: 0.2, r: 12 },
    { dx: -0.58, fy: 0.42, r: 10 },
    { dx: -0.44, fy: 0.15, r: 14 },
    { dx: -0.29, fy: 0.38, r: 11 },
    { dx: -0.15, fy: 0.13, r: 9 },
    { dx: 0.14, fy: 0.42, r: 10 },
  ];
  // ------------------------------------------------------------ world themes
  // Every element paints its worlds in its own style (fire = burning worlds, ice =
  // frozen ones...). World 1 is ALWAYS an ordinary, normal-looking world: it's where
  // every hero starts (it still has a Julforic Pillar, though).
  //
  // A theme: feats = 4 surface styles, pals = 3 palettes [base, accent, glow],
  // extras = things around the planet. The 6 element worlds mix these, so no two match.
  //   surface codes: 0 base, 1 accent, 2 glow (lit by itself), 3 bright, 4 dark, 5 black
  const NORMAL = { feat: 'earthlike', pal: ['#1a5ab0', '#4ab84a', '#ffffff'], extra: 'clouds' };
  const THEMES = {
    fire: { feats: ['lava', 'ember', 'storm', 'cracks'], pals: [['#4a1410', '#ff5a1a', '#ffd34d'], ['#7a2010', '#ff9a3a', '#fff0a0'], ['#2a0e0e', '#c83018', '#ff7a2a']], extras: ['flames', '', 'flames', 'ring'] },
    water: { feats: ['ocean', 'islands', 'storm', 'swirl'], pals: [['#1a4aa8', '#3aa0ff', '#e8f8ff'], ['#0e2a6a', '#2a7ad8', '#7af0ff'], ['#1a6a9a', '#4ac8e8', '#ffffff']], extras: ['clouds', '', 'ring', 'clouds'] },
    wind: { feats: ['storm', 'swirl', 'bands', 'fog'], pals: [['#5aa0c0', '#e8f8ff', '#ffffff'], ['#3a8ab0', '#9ae8ff', '#ffffff'], ['#a8d8e8', '#ffffff', '#c8f4ff']], extras: ['clouds', 'ring', '', 'clouds'] },
    earth: { feats: ['rock', 'canyon', 'craters', 'plates'], pals: [['#5a3e22', '#b8864a', '#e8c87a'], ['#3a2a1a', '#8a6a3a', '#c8a070'], ['#6a5a3a', '#a89070', '#5fd84a']], extras: ['', 'moons', 'ring', ''] },
    lightning: { feats: ['veins', 'storm', 'cracks', 'swirl'], pals: [['#2a2a4a', '#ffd23a', '#ffffff'], ['#1a1a30', '#fff08a', '#ffd23a'], ['#4a3a10', '#ffd23a', '#ffffff']], extras: ['aura', '', 'ring', 'aura'] },
    ice: { feats: ['ice', 'glacier', 'craters', 'ocean'], pals: [['#a8e8ff', '#ffffff', '#e8f8ff'], ['#4a8ac8', '#a8e8ff', '#ffffff'], ['#d8f4ff', '#7ab8e8', '#ffffff']], extras: ['', 'spikes', 'ring', 'clouds'] },
    nature: { feats: ['forest', 'jungle', 'islands', 'swirl'], pals: [['#2a7a2a', '#5fd84a', '#ff9ad0'], ['#1a4a1a', '#8ae06a', '#ffd34d'], ['#3a6a2a', '#a8e070', '#ffffff']], extras: ['clouds', '', 'moons', 'clouds'] },
    darkness: { feats: ['dark', 'swirl', 'cracks', 'fog'], pals: [['#1e1630', '#3a3060', '#ff3a4a'], ['#0e0a18', '#5a4a8a', '#c86aff'], ['#2a1a40', '#120c1a', '#ff3a4a']], extras: ['aura', '', 'ring', ''] },
    shadow: { feats: ['fog', 'dark', 'bands', 'craters'], pals: [['#22222e', '#4a4a5e', '#6af0ff'], ['#14141c', '#6a6a8a', '#ffffff'], ['#30303e', '#1a1a24', '#6af0ff']], extras: ['', 'aura', '', 'ring'] },
    light: { feats: ['sun', 'ripples', 'bands', 'crystal'], pals: [['#e8d8a0', '#ffffff', '#ffd34d'], ['#c8b070', '#fff8e0', '#ffffff'], ['#ffe8a0', '#c8a84a', '#ffffff']], extras: ['aura', 'ring', 'aura', ''] },
    arcane: { feats: ['galaxy', 'ripples', 'crystal', 'veins'], pals: [['#5a2a8a', '#c86aff', '#5affc8'], ['#2a1450', '#a84aff', '#ffffff'], ['#7a3aaa', '#e0a8ff', '#5affc8']], extras: ['ring', 'aura', '', 'ring'] },
    poison: { feats: ['toxic', 'jungle', 'bands', 'cracks'], pals: [['#4a6a1a', '#9ad83a', '#d8ff6a'], ['#2a3a10', '#6aa82a', '#d84aff'], ['#5a5a1a', '#b0e060', '#ffffff']], extras: ['clouds', '', 'ring', 'aura'] },
    blood: { feats: ['blood', 'veins', 'ocean', 'craters'], pals: [['#5a0e18', '#c8283a', '#ff6a7a'], ['#2a0408', '#8a1020', '#ff3a4a'], ['#7a1a2a', '#e0404a', '#ffd0d0']], extras: ['', 'aura', 'ring', ''] },
    death: { feats: ['ash', 'craters', 'cracks', 'fog'], pals: [['#3a3a44', '#8a8aa0', '#7aff9a'], ['#1a1a24', '#5a5a6a', '#7aff9a'], ['#4a4a50', '#c8c8d0', '#9ab0a0']], extras: ['aura', '', 'ring', ''] },
    metal: { feats: ['plates', 'bands', 'craters', 'crystal'], pals: [['#4a5060', '#b8c0d0', '#ffd34d'], ['#2a2e38', '#8a90a0', '#ffffff'], ['#6a7080', '#e8ecf4', '#ff7a4a']], extras: ['ring', '', 'moons', 'ring'] },
    sand: { feats: ['dunes', 'canyon', 'craters', 'storm'], pals: [['#a0803a', '#e8c87a', '#fff0c0'], ['#c89a4a', '#f0d898', '#ffffff'], ['#7a5a2a', '#d8b060', '#ff7a4a']], extras: ['', 'ring', '', 'clouds'] },
    magma: { feats: ['lava', 'cracks', 'rock', 'ember'], pals: [['#2a1410', '#ff7a1a', '#ffe95a'], ['#3a1a10', '#c84010', '#ffd34d'], ['#1a1010', '#ff5a1a', '#ffffff']], extras: ['', 'flames', 'ring', ''] },
    storm: { feats: ['storm', 'swirl', 'veins', 'fog'], pals: [['#2a3a6a', '#6a8ac8', '#ffffff'], ['#1a2440', '#4a5a7a', '#7affd8'], ['#3a4a7a', '#8ab0e0', '#ffd23a']], extras: ['clouds', 'aura', 'clouds', 'ring'] },
    cosmic: { feats: ['galaxy', 'swirl', 'craters', 'bands'], pals: [['#1a1050', '#6a5aff', '#ffd34d'], ['#0a0820', '#3a2aa8', '#ffffff'], ['#2a1a6a', '#a89aff', '#ff7ad8']], extras: ['ring', 'aura', 'moons', 'ring'] },
    void: { feats: ['hole', 'dark', 'ripples', 'cracks'], pals: [['#120820', '#a85cff', '#ffffff'], ['#05030a', '#5a3a8a', '#a85cff'], ['#1a0a2a', '#2a1440', '#ffffff']], extras: ['ring', 'aura', '', 'aura'] },
    psychic: { feats: ['ripples', 'swirl', 'veins', 'fog'], pals: [['#8a2a7a', '#ff7ad8', '#7affff'], ['#5a1a50', '#ffa0e0', '#ffffff'], ['#a84a9a', '#ffd0f0', '#7affff']], extras: ['aura', 'ring', '', 'aura'] },
    crystal: { feats: ['crystal', 'glacier', 'craters', 'veins'], pals: [['#2a8a9a', '#7af0e0', '#ffffff'], ['#1a5a6a', '#a0fff0', '#ff7ad8'], ['#4aa8b0', '#e0fffa', '#ffffff']], extras: ['spikes', 'ring', 'spikes', ''] },
    moon: { feats: ['craters', 'fog', 'bands', 'ripples'], pals: [['#5a5e9a', '#d8dcff', '#ffffff'], ['#3a3e6a', '#a8acd8', '#ff6a8a'], ['#8a8ec0', '#ffffff', '#d8dcff']], extras: ['', 'moons', 'ring', 'aura'] },
    solar: { feats: ['sun', 'ember', 'bands', 'swirl'], pals: [['#c8601a', '#ffb83a', '#fff0a0'], ['#a8401a', '#ffd34d', '#ffffff'], ['#e08020', '#ffe08a', '#ffffff']], extras: ['flames', 'aura', 'flames', 'ring'] },
    magnetism: { feats: ['magnet', 'bands', 'ripples', 'plates'], pals: [['#3a4aa8', '#ff4a6a', '#c8ff4a'], ['#2a3a8a', '#ff6a8a', '#ffffff'], ['#5a2a6a', '#4a6aff', '#c8ff4a']], extras: ['ring', 'aura', 'ring', ''] },
    time: { feats: ['clock', 'ripples', 'bands', 'dunes'], pals: [['#7a6a3a', '#e8d08a', '#ffffff'], ['#4a3a1a', '#c8a85a', '#7ab8ff'], ['#a8904a', '#fff0c0', '#ffffff']], extras: ['ring', '', 'ring', 'aura'] },
    gravity: { feats: ['swirl', 'craters', 'ripples', 'bands'], pals: [['#2a2240', '#7a6aa8', '#ff5aff'], ['#1a1430', '#5a4a8a', '#ffffff'], ['#3a3060', '#a89ad0', '#ff5aff']], extras: ['ring', 'moons', 'ring', 'aura'] },
    sound: { feats: ['ripples', 'bands', 'veins', 'storm'], pals: [['#1a7a5a', '#5ae8a8', '#ffffff'], ['#0e4a3a', '#3ac888', '#ff7ad8'], ['#2a9a7a', '#a0ffd8', '#ffffff']], extras: ['aura', 'ring', '', 'aura'] },
    mist: { feats: ['fog', 'storm', 'ocean', 'swirl'], pals: [['#6a7a8a', '#c8d4e0', '#ffffff'], ['#4a5a6a', '#a8b8c8', '#9a7aff'], ['#8a9aaa', '#e8f0f8', '#ffffff']], extras: ['clouds', 'clouds', '', 'aura'] },
    spirit: { feats: ['ghost', 'fog', 'ripples', 'swirl'], pals: [['#3a9a9a', '#a8fff0', '#ffffff'], ['#1a5a5a', '#6ae0d0', '#ffd34d'], ['#5ab0b0', '#e0fffa', '#ffffff']], extras: ['aura', '', 'aura', 'ring'] },
  };
  const CHAOS_COLS = ['#ff3aa0', '#3affe8', '#ffe93a', '#7a3aff', '#3aff6a', '#ff7a1a', '#3a7aff'];

  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /** What each surface looks like: returns a surface code for one pixel. */
  function surfaceAt(feat, nx, ny, x, y, noise, craters) {
    const fbm = (s, o) => noise.fbm2(nx * s + (o || 3), ny * s + (o || 3), 3);
    const d = Math.sqrt(nx * nx + ny * ny);
    switch (feat) {
      case 'earthlike': { const f = fbm(2.2); return Math.abs(ny) > 0.82 ? 3 : f > 0.52 ? (f > 0.62 ? 4 : 1) : 0; }
      case 'ocean': { const w = Math.sin((ny * 6 + (fbm(2) - 0.5) * 2) * Math.PI); return w > 0.93 ? 3 : w > 0.55 ? 1 : 0; }
      case 'islands': { const f = fbm(2.6); return f > 0.66 ? 4 : f > 0.57 ? 1 : 0; }
      case 'lava': { const f = fbm(2.2, 9); return Math.abs(f - 0.5) < 0.05 ? 2 : f > 0.68 ? 1 : 0; }
      case 'ember': { const f = fbm(2); return noise.n2(nx * 6 + 1, ny * 6 + 1) > 0.74 ? 2 : f > 0.55 ? 1 : 0; }
      case 'cracks': { const f = fbm(3.2, 5); return Math.abs(f - 0.5) < 0.035 ? 2 : Math.sin(ny * 9) > 0.6 ? 1 : 0; }
      case 'storm': { const w = Math.sin((ny * 7 + (noise.n2(nx * 2, ny * 2) - 0.5) * 3) * Math.PI); return w > 0.9 ? 3 : w > 0.3 ? 1 : 0; }
      case 'swirl': { const a = Math.atan2(ny, nx) + d * 4.5; return d < 0.14 ? 4 : Math.sin(a * 2) > 0.3 ? 1 : 0; }
      case 'bands': { const w = Math.sin(ny * 5 * Math.PI); return Math.abs(w) < 0.12 ? 4 : w > 0 ? 1 : 0; }
      case 'fog': { const f = fbm(1.6); return f > 0.62 ? 3 : f > 0.5 ? 1 : 0; }
      case 'rock': { for (const c of craters) { const q = (nx - c.x) ** 2 + (ny - c.y) ** 2; if (q < c.r * c.r) return q > c.r * c.r * 0.55 ? 1 : 4; } return fbm(2.4) > 0.6 ? 1 : 0; }
      case 'canyon': return Math.abs(Math.sin((nx * 3 + fbm(2) * 2) * Math.PI)) < 0.15 ? 4 : fbm(2.5, 7) > 0.55 ? 1 : 0;
      case 'craters': { for (const c of craters) { const q = (nx - c.x) ** 2 + (ny - c.y) ** 2; if (q < c.r * c.r) return q > c.r * c.r * 0.6 ? 3 : 4; } return fbm(3) > 0.6 ? 1 : 0; }
      case 'plates': { const gx = ((x % 5) + 5) % 5, gy = ((y % 5) + 5) % 5; return gx === 0 || gy === 0 ? 4 : gx === 2 && gy === 2 ? 3 : (Math.floor(x / 5) + Math.floor(y / 5)) % 2 ? 1 : 0; }
      case 'dunes': { const w = Math.sin((ny * 8 + Math.sin(nx * 6) * 0.6) * Math.PI); return w > 0.9 ? 3 : w > 0.35 ? 1 : 0; }
      case 'veins': { const f = fbm(4, 2); return Math.abs(f - 0.5) < 0.03 ? 2 : fbm(2) > 0.6 ? 1 : 0; }
      case 'dark': return noise.n2(nx * 9 + 4, ny * 9 + 4) > 0.86 ? 2 : fbm(2) > 0.6 ? 1 : 0;
      case 'crystal': { const a = Math.floor((nx + ny) * 3), b = Math.floor((nx - ny) * 3); const ex = Math.abs(((nx + ny) * 3) - Math.round((nx + ny) * 3)) < 0.08; return ex ? 3 : (a + b) % 2 === 0 ? 1 : 0; }
      case 'toxic': return noise.n2(nx * 8 + 2, ny * 8 + 2) > 0.8 ? 2 : fbm(2) > 0.55 ? 1 : 0;
      case 'jungle': { const f = fbm(2.4); return noise.n2(nx * 9, ny * 9) > 0.88 ? 2 : f > 0.6 ? 4 : f > 0.45 ? 1 : 0; }
      case 'forest': { const f = fbm(3, 6); return f > 0.62 ? 4 : f > 0.48 ? 1 : noise.n2(nx * 10, ny * 10) > 0.9 ? 2 : 0; }
      case 'blood': { const f = fbm(2.2, 4); return f > 0.7 ? 2 : Math.abs(f - 0.5) < 0.06 ? 1 : 0; }
      case 'ash': { const f = fbm(3, 8); return Math.abs(f - 0.5) < 0.03 ? 2 : fbm(2) > 0.55 ? 1 : 0; }
      case 'galaxy': { const a = Math.atan2(ny, nx) + d * 5; return noise.n2(nx * 11, ny * 11) > 0.88 ? 2 : d < 0.18 ? 3 : Math.sin(a * 2) > 0.5 ? 1 : 0; }
      case 'hole': return d < 0.42 ? 5 : d < 0.52 ? 2 : Math.sin(Math.atan2(ny, nx) * 3 + d * 8) > 0.4 ? 1 : 0;
      case 'ripples': { const e = Math.sqrt((nx + 0.3) ** 2 + (ny + 0.2) ** 2), w = Math.sin(e * 12 * Math.PI / 2); return w > 0.85 ? 3 : w > 0.3 ? 1 : 0; }
      case 'sun': return fbm(2.4) > 0.62 ? 1 : 2;
      case 'magnet': return Math.abs(Math.sin(ny * 6)) < 0.15 ? 2 : nx < 0 ? 0 : 1;
      case 'clock': { const a = Math.atan2(ny, nx); if (d > 0.62 && d < 0.72) return 3; if (d > 0.74 && Math.abs(Math.sin(a * 6)) < 0.18) return 3; if ((Math.abs(nx) < 0.06 && ny < 0 && ny > -0.5) || (Math.abs(ny) < 0.06 && nx > 0 && nx < 0.38)) return 2; return d < 0.62 ? 1 : 0; }
      case 'ghost': { const f = fbm(2, 5); return noise.n2(nx * 7, ny * 7) > 0.82 ? 2 : f > 0.55 ? 1 : 0; }
      default: return noise.n2(nx * 3, ny * 3) > 0.6 ? 1 : 0;
    }
  }

  /**
   * Paint one world. spec: { r, base, accent, glow, feat, extra, seed, glitch }.
   * extra: '' | clouds | flames | aura | ring | moons | spikes
   */
  function paintPlanet(spec, locked) {
    const { r, feat, extra, seed } = spec;
    const pad = extra === 'ring' ? Math.round(r * 0.8) : extra === 'moons' ? Math.round(r * 0.6) + 3 : extra === 'flames' || extra === 'spikes' ? Math.round(r * 0.5) + 2 : extra === 'aura' ? 4 : 2;
    const size = r * 2 + 1 + pad * 2;
    const buf = new PB(size, size);
    const noise = new U.Noise(seed);
    const rng = new U.RNG(seed);
    const craters = [];
    for (let i = 0; i < 6; i++) craters.push({ x: rng.range(-0.7, 0.7), y: rng.range(-0.7, 0.7), r: rng.range(0.12, 0.3) });
    const o = r + pad;
    const shades = (col) => [C.shade(col, 0.35), col, C.shade(col, -0.3), C.shade(col, -0.55)];
    const A = shades(spec.base), B = shades(spec.accent), L = shades(C.mix(spec.accent, '#ffffff', 0.6));
    const glow = spec.glow, dark = C.shade(spec.base, -0.65);
    const put = (x, y, col) => buf.set(o + x, o + y, c32(locked ? C.mix(C.shade(col, -0.3), '#2a2a4a', 0.3) : col));
    const lightAt = (x, y) => { const nx = x / r, ny = y / r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)); return U.clamp(-nx * 0.5 - ny * 0.5 + nz * 0.7, 0, 1.2); };
    // rings (behind)
    const ringBack = [], ringFront = [];
    if (extra === 'ring') for (let a = 0; a < Math.PI * 2; a += 0.01) for (const k of [1.35, 1.45, 1.55]) {
      const x = Math.round(Math.cos(a) * r * k), y = Math.round(Math.sin(a) * r * k * 0.28 - Math.cos(a) * r * 0.12);
      (Math.sin(a) < 0 ? ringBack : ringFront).push([x, y, k === 1.45 ? 0 : 1]);
    }
    for (const [x, y, k] of ringBack) put(x, y, B[k + 1]);
    // flames / an aura / crystal spikes, behind the planet
    if (extra === 'flames') for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + rng.range(-0.1, 0.1), len = rng.range(2, r * 0.5);
      for (let q = 0; q < len; q++) { const w = Math.max(0, 1.6 * (1 - q / len)); for (let s = -w; s <= w; s++) put(Math.round(Math.cos(a) * (r + q) - Math.sin(a) * s), Math.round(Math.sin(a) * (r + q) + Math.cos(a) * s), q / len > 0.55 ? glow : spec.accent); }
    }
    if (extra === 'aura') for (let a = 0; a < Math.PI * 2; a += 0.04) { const rr = r + 2 + (Math.round(a * 25) % 2); put(Math.round(Math.cos(a) * rr), Math.round(Math.sin(a) * rr), Math.round(a * 25) % 3 ? glow : spec.accent); }
    if (extra === 'spikes') for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3, len = r * rng.range(0.3, 0.5);
      for (let q = 0; q < len + 3; q++) { const w = Math.max(0, 2 * (1 - q / (len + 3))); for (let s = -w; s <= w; s++) put(Math.round(Math.cos(a) * (r - 3 + q) - Math.sin(a) * s), Math.round(Math.sin(a) * (r - 3 + q) + Math.cos(a) * s), s < 0 ? L[0] : B[1]); }
    }
    // the planet itself
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d2 = x * x + y * y;
      if (d2 > r * r) continue;
      const nx = x / r, ny = y / r;
      const light = lightAt(x, y);
      let code = surfaceAt(feat, nx, ny, x, y, noise, craters);
      if (extra === 'clouds' && code !== 2 && noise.fbm2(nx * 2.6 + 40, ny * 5 + 40, 2) > 0.65) code = 3;
      const lv = light + (ERX.bayer(x + o, y + o) - 0.5) * 0.25;
      const k = lv > 0.95 ? 0 : lv > 0.55 ? 1 : lv > 0.2 ? 2 : 3;
      let col = code === 2 ? (lv > 0.9 ? C.mix(glow, '#ffffff', 0.4) : glow) : code === 5 ? '#05030a' : code === 4 ? (k < 2 ? C.shade(dark, 0.2) : dark) : (code === 3 ? L : code === 1 ? B : A)[k];
      if (code !== 2 && code !== 5 && d2 > (r - 1) * (r - 1) && nx + ny < 0) col = C.shade(col, 0.3);   // lit atmosphere rim
      if (spec.glitch && ((y + seed) % 7 === 0)) col = CHAOS_COLS[(Math.abs(x) + seed) % CHAOS_COLS.length];   // reality tearing
      put(spec.glitch && ((y + seed) % 5 === 0) ? x + 2 : x, y, col);
    }
    for (const [x, y, k] of ringFront) put(x, y, B[k]);
    // a little moon
    if (extra === 'moons') {
      const mr = Math.max(2, Math.round(r * 0.25)), mx = r + Math.round(pad * 0.5), my = -Math.round(r * 0.55);
      for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) if (x * x + y * y <= mr * mr) put(mx + x, my + y, x + y < 0 ? L[1] : B[2]);
    }
    buf.outline(c32('#05040f'));
    return buf.toCanvas();
  }

  /** The look of world i for an element. */
  function worldSpec(el, i, s, seed) {
    if (i === 0 || !el) return Object.assign({ r: s.r, seed: 1337 + i * 97 }, NORMAL,   // world 1 is the same planet for every hero
      { base: NORMAL.pal[0], accent: NORMAL.pal[1], glow: NORMAL.pal[2] });   // world 1: always normal
    const j = i - 1;
    if (el.id === 'chaos') {
      // Chaos worlds borrow other elements' styles, in clashing colours, with reality tearing through them
      const ids = Object.keys(THEMES), th = THEMES[ids[(seed + i * 7) % ids.length]];
      return { r: s.r, seed: seed + i * 97, feat: th.feats[j % 4], extra: th.extras[j % th.extras.length], base: CHAOS_COLS[i % 7], accent: CHAOS_COLS[(i + 3) % 7], glow: '#ffffff', glitch: true };
    }
    const th = THEMES[el.id];
    if (!th) return Object.assign({ r: s.r, seed: seed + i * 97 }, NORMAL, { base: el.color, accent: el.world.tint, glow: '#ffffff' });
    const p = th.pals[j % th.pals.length];
    return { r: s.r, seed: seed + i * 97, feat: th.feats[j % th.feats.length], extra: th.extras[(j + Math.floor(j / 4)) % th.extras.length], base: p[0], accent: p[1], glow: p[2] };
  }

  ERX.Worlds = {
    THEMES, NORMAL,
    /** The 7 worlds for an element (same element, same worlds; different element, different worlds). */
    build(el) {
      const seed = hashStr(el ? el.id : 'none');
      return SPOTS.map((s, i) => {
        const spec = worldSpec(el, i, s, seed);
        return Object.assign({}, s, { i, surface: spec.feat, spec, cv: paintPlanet(spec, false), cvLocked: paintPlanet(spec, true) });
      });
    },
  };

  VoidLevel.TS = TS;
  ERX.VoidLevel = VoidLevel;
  ERX.HqLevel = HqLevel;
})(window.ERX = window.ERX || {});
