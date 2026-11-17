/*
 * THE OLD CAVE — behind the boarded-up mouth at the end of world 1's road.
 *
 *   in from the meadow -> a winding, torchlit tunnel (bats on the ceilings;
 *   fight them or duck past) -> a dip -> taller halls -> JAIL BARS across
 *   the way. Look through them and something with blue eyes tells you to
 *   LEAVE. Then the cave shakes, the floor gives way, and you fall
 *   (js/game/cave-fall.js) all the way down to THE DEEPER ENDS.
 *
 * Built with the cave's own tools (it extends CaveLevel): an old, warm-brown
 * rock palette, torches, a little moss where the daylight still reaches.
 *   level.drawLive()    the bars, the dark beyond them, the eyes, the cracks
 *   level.breakFloor()  the floor under you gives way (the story calls it)
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, PB = ERX.PixelBuffer, C = ERX.Color;
  const TS = 16;
  const { AIR, ROCK } = ERX.CaveLevel.TILES;

  const PAL = {
    rock: ['#a89480', '#857260', '#665646', '#4a3e34', '#342a24', '#221c18'],
    moss: ['#7a9a5a', '#5a7a44'],
    metal: ['#a8b0c0', '#848ca0', '#5e6478', '#3e4254'],
    wood: ['#a8784a', '#7a5236', '#4a3022'],
    outline: '#140e0c',
    back: ['#2e2420', '#241c18', '#1a1412', '#382c24'],
    decor: ['#9a8674', '#76644f', '#56483a', '#3a3028'],   // stalactites + pebbles: the same old brown rock
  };
  const FLOOR = 22;                 // the tunnel floor (tile row)
  const BARS = 126;                 // the column the bars stand in
  const IRON = { light: '#8a8494', mid: '#5e5a68', dark: '#3a3644', rust: '#8a5a3a', ink: '#120e14' };

  class OldCaveLevel extends ERX.CaveLevel {
    configure() {
      this.W = 140;
      this.H = 28;
      this.pal = PAL;
      this.sections = [];
      this.id = 'oldcave';
      this.mossUntil = 14;          // moss only where the daylight gets in
    }

    build() {
      const rng = new U.RNG(this.seed ^ 0x01dc);
      this.tiles.fill(ROCK);
      // ---- the tunnel ----
      this.air(1, 16, 15, FLOOR);           // just inside the mouth
      this.air(16, 40, 11, FLOOR);          // first hall
      this.air(40, 58, 11, FLOOR + 3);      // the dip...
      this.plat(52, 56, FLOOR + 1);         // ...and a ledge to climb out
      this.air(58, 82, 9, FLOOR);           // a tall hall (bats up high)
      this.air(82, 108, 12, FLOOR);
      this.air(108, BARS, 10, FLOOR);       // the last hall, up to the bars
      this.air(BARS, BARS + 1, 10, FLOOR);  // the bars themselves (solid, but you can see through them)
      this.air(BARS + 1, 138, 9, FLOOR);    // the dark beyond
      // bumpy ceilings, so it looks dug rather than drawn
      const noise = new U.Noise(this.seed ^ 0x77);
      for (let x = 2; x < 138; x++) {
        let top = 0;
        for (let y = 1; y < this.H; y++) if (this.tile(x, y) === AIR) { top = y; break; }
        if (!top || x === BARS) continue;
        const bump = Math.round(noise.n1(x * 0.3) * 2);
        for (let y = top; y < top + bump; y++) this.setTile(x, y, ROCK);
      }
      for (let y = 9; y < FLOOR; y++) this.dynamicSolid.add(BARS + ',' + y);   // the bars: you're not getting through

      this.floorY = FLOOR * TS;
      this.spawn = { x: 4 * TS, y: FLOOR * TS };
      this.checkpoints = [this.spawn, { x: 60 * TS, y: FLOOR * TS }, { x: 100 * TS, y: FLOOR * TS }];
      this.barsX = BARS * TS;
      this.eyes = { on: false, t: 0, x: (BARS + 4) * TS, y: FLOOR * TS - 34 };   // whoever's behind the bars: taller than you
      this.crack = null;
      this.quake = 0;

      // ---- torches, decorations ----
      this.decor = [];
      this.lights = [];
      this.torches = [];
      this.braziers = [];
      this.signs = [];
      this.chalk = [];
      this.npcs = [];
      const ground = (tx) => this._groundBelow(tx, 2) * TS;
      const torch = (tx) => {
        const t = { x: tx * TS + 8, y: ground(tx) - 3 * TS + 4, phase: rng.range(0, 10), lit: true };
        this.torches.push(t);
        this.lights.push({ x: t.x, y: t.y, r: 70, color: '#ffb050', flicker: true, ref: t });
      };
      [7, 19, 29, 38, 50, 64, 74, 86, 96, 105, 115, 122].forEach(torch);
      // a last bit of daylight from the mouth behind you
      this.lights.push({ x: 1 * TS, y: (FLOOR - 3) * TS, r: 90, color: '#fff0d0' });
      for (let x = 3; x < BARS; x++) {
        if (rng.chance(0.2)) { const cy = this._ceilAbove(x, FLOOR - 1); if (cy > 0) this.decor.push({ kind: 'stalactite', x: x * TS + rng.int(2, 13), y: (cy + 1) * TS, len: rng.int(5, 14), w: rng.int(3, 6) }); }
        if (rng.chance(0.12)) this.decor.push({ kind: 'pebbles', x: x * TS + rng.int(2, 13), y: ground(x) });
        if (rng.chance(0.06)) this.decor.push({ kind: 'stalagmite', x: x * TS + rng.int(3, 12), y: ground(x), len: rng.int(4, 9), w: rng.int(3, 5) });
      }
      // somebody mined here, a long time ago
      [[12, 'beam'], [34, 'beam'], [70, 'beam'], [92, 'beam']].forEach(([x]) => this.decor.push({ kind: 'beam', x: x * TS, y: ground(x), h: 5 * TS }));
      this.decor.push({ kind: 'crate', x: 14 * TS, y: ground(14) });
      this.decor.push({ kind: 'cart', x: 100 * TS, y: ground(100) });
      const sign = (tx, text) => this.signs.push({ x: tx * TS + 8, y: ground(tx), text, read: false });
      sign(9, 'YOU BROKE THE BOARDS.\nThe boards were there for a reason.');

      // bats, up on the ceilings: fight them, or keep your head down and go
      this.enemySpawns = [24, 33, 47, 62, 70, 79, 92, 104, 116].map((x) => ({ type: 'bat', x: x * TS }));
    }

    /** Slightly bright: daylight at the mouth, torches the rest of the way. */
    darknessAt(px) { return px < 12 * TS ? 0.22 : 0.4; }

    /** Cracks spread across the floor from x (they grow until the floor breaks). */
    startCracks(x) { this.crack = { x, t: 0, lines: this.makeCracks(x) }; }
    makeCracks(x) {
      const out = [];
      for (let i = 0; i < 6; i++) {
        const side = i % 2 ? 1 : -1, pts = [[x, this.floorY]];
        let px = x, py = this.floorY;
        for (let k = 0; k < 5; k++) { px += side * U.lerp(4, 9, Math.random()); py += U.lerp(-1, 2, Math.random()); pts.push([px, Math.max(this.floorY, py)]); }
        out.push(pts);
      }
      return out;
    }

    /** The floor under x gives way: a hole right through to the dark (the game screen starts the fall). */
    breakFloor(g, x) {
      const cx = Math.floor(x / TS);
      for (let tx = cx - 2; tx <= cx + 2; tx++) for (let ty = FLOOR; ty < this.H; ty++) this.setTile(tx, ty, AIR);
      g.tilesCanvas = this.renderTiles();
      this.crack = null;
      for (let i = 0; i < 40; i++) {
        g.fx.add({
          x: x + U.lerp(-36, 36, Math.random()), y: this.floorY + U.lerp(-2, 6, Math.random()), vx: U.lerp(-60, 60, Math.random()), vy: U.lerp(-140, 40, Math.random()), ay: 600,
          life: U.lerp(0.5, 1.1, Math.random()), color: PAL.rock[1 + Math.floor(Math.random() * 4)], size: Math.random() < 0.5 ? 2 : 1, fadeOut: 0.2,
        });
      }
      g.dust(x, this.floorY, 30);
    }

    update(dt, g) {
      if (this.eyes.on) this.eyes.t += dt;
      if (this.crack) this.crack.t += dt;
      // while the cave shakes, bits of the ceiling come down
      if (this.quake > 0) {
        this.quake = Math.max(0, this.quake - dt);
        if (Math.random() < dt * 22) {
          const x = g.camera.x + Math.random() * g.view.width, tx = Math.floor(x / TS), cy = this._ceilAbove(tx, FLOOR - 1);
          if (cy > 0) g.fx.add({ x, y: (cy + 1) * TS + 2, vx: U.lerp(-8, 8, Math.random()), vy: U.lerp(10, 40, Math.random()), ay: 500, life: 1.4, color: PAL.rock[1 + Math.floor(Math.random() * 3)], size: Math.random() < 0.35 ? 2 : 1, fadeOut: 0.3 });
        }
      }
    }

    /** Over the ground, under you: the dark past the bars, the bars, the eyes, the cracks. */
    drawLive(ctx, cam) {
      const ox = -cam.ix, oy = -cam.iy, bx = this.barsX + ox, top = 9 * TS + oy, floor = this.floorY + oy;
      if (bx > -60 && bx < cam.vw + 260) {
        // beyond the bars: black
        const gr = ctx.createLinearGradient(bx + 14, 0, bx + 70, 0);
        gr.addColorStop(0, 'rgba(4,2,6,0.55)'); gr.addColorStop(1, 'rgba(4,2,6,0.97)');
        ctx.fillStyle = gr; ctx.fillRect(bx + 14, top, 12 * TS, floor - top);
        this.drawEyes(ctx, ox, oy);
        this.drawBars(ctx, bx, top, floor);
      }
      if (this.crack) {
        const k = Math.min(1, this.crack.t / 1.1);
        ctx.fillStyle = '#0a0606';
        for (const pts of this.crack.lines) {
          const n = Math.max(1, Math.ceil(k * (pts.length - 1)));
          for (let i = 0; i < n; i++) {
            const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
            for (let s = 0; s <= steps; s++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * s) / steps) + ox, Math.round(y0 + ((y1 - y0) * s) / steps) + oy, 1, 2);
          }
        }
      }
    }

    /** Old iron bars, floor to ceiling: a frame, four bars, two straps, rust. */
    drawBars(ctx, bx, top, floor) {
      const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
      R(bx - 2, top, 20, 4, IRON.ink); R(bx - 1, top + 1, 18, 2, IRON.mid);                 // the beam across the top
      R(bx - 2, floor - 3, 20, 3, IRON.ink); R(bx - 1, floor - 2, 18, 1, IRON.dark);        // and the rail along the floor
      for (const dx of [1, 5, 9, 13]) {
        R(bx + dx - 1, top + 3, 4, floor - top - 5, IRON.ink);
        R(bx + dx, top + 3, 1, floor - top - 5, IRON.light);
        R(bx + dx + 1, top + 3, 1, floor - top - 5, IRON.dark);
        for (let y = top + 12; y < floor - 6; y += 23) R(bx + dx, y + ((dx * 7) % 9), 2, 2, IRON.rust);   // rust
      }
      for (const f of [0.34, 0.68]) {
        const y = top + (floor - top) * f;
        R(bx - 2, y - 1, 20, 4, IRON.ink); R(bx - 1, y, 18, 2, IRON.mid); R(bx - 1, y, 18, 1, IRON.light);
        for (const dx of [1, 9]) R(bx + dx, y + 1, 1, 1, IRON.ink);   // rivets
      }
    }

    /** Two blue eyes, opening in the dark (and blinking, now and then). */
    drawEyes(ctx, ox, oy) {
      const e = this.eyes;
      if (!e.on) return;
      const open = Math.min(1, e.t / 0.5) * (Math.floor(e.t * 10) % 37 === 0 ? 0 : 1);
      const x = Math.round(e.x + ox), y = Math.round(e.y + oy);
      const glow = ctx.createRadialGradient(x + 4, y, 1, x + 4, y, 26);
      glow.addColorStop(0, 'rgba(90,170,255,' + (0.45 * open).toFixed(3) + ')'); glow.addColorStop(1, 'rgba(90,170,255,0)');
      ctx.fillStyle = glow; ctx.fillRect(x - 24, y - 26, 56, 52);
      if (open <= 0) return;
      const h = Math.max(1, Math.round(open * 2));
      for (const dx of [0, 8]) {
        ctx.fillStyle = '#2a6aff'; ctx.fillRect(x + dx - 1, y - h + 1, 4, h);
        ctx.fillStyle = '#9ad8ff'; ctx.fillRect(x + dx, y - h + 1, 2, h);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x + dx, y, 1, 1);
      }
    }

    /** Their glow cuts through the dark. */
    liveLights() {
      const e = this.eyes;
      return e.on ? [{ x: e.x + 4, y: e.y, r: 30, color: '#5aaaff', intensity: Math.min(1, e.t / 0.5) }] : [];
    }
  }

  ERX.OldCaveLevel = OldCaveLevel;
})(window.ERX = window.ERX || {});
