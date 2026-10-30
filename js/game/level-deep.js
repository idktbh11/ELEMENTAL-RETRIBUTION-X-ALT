/*
 * THE DEEP ENDS — the deeper, bigger, surprisingly colourful part of the cave.
 *
 *   entry drop -> crystal cavern -> MINING CAMP (miners) -> the climb ->
 *   bridge over the chasm -> crystal hall -> THE ELEVATOR
 *
 * Built with the same tools as the cave (it extends CaveLevel), with its own
 * palette and layout.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U;
  const TS = 16;

  const PAL = {
    rock: ['#8aa0d0', '#6a80b8', '#50609a', '#3a467a', '#2a3260', '#1c2244'],
    moss: ['#6af0c0', '#38c890'],
    metal: ['#a8b0c0', '#848ca0', '#5e6478', '#3e4254'],
    wood: ['#b8844a', '#8a5a36', '#5a3a22'],
    outline: '#0e1020',
    back: ['#1c2244', '#18193a', '#121430', '#24284e'],
    vein: ['#ff8ad8', '#6af0e0', '#ffd36a', '#b88aff'],
  };

  const CRYSTAL_COLORS = ['#ff7ad8', '#5af0e0', '#ffd36a', '#b07aff', '#7ab8ff'];

  class DeepEndsLevel extends ERX.CaveLevel {
    configure() {
      this.W = 240;
      this.H = 36;
      this.pal = PAL;
      this.sections = [];
      this.id = 'deep';
      this.mossUntil = Infinity;
    }

    build() {
      const rng = new U.RNG(this.seed ^ 0xdee9);
      this.tiles.fill(1);
      // ---- carve the layout ----
      this.air(2, 14, 4, 12);          // entry ledge (you drop in from above)
      this.air(10, 60, 10, 26);        // crystal cavern
      this.solid(12, 18, 15, 16);      // stepping ledges down
      this.solid(20, 26, 19, 20);
      this.air(60, 100, 14, 26);       // mining camp
      this.air(100, 124, 8, 26);       // the climb
      this.air(124, 160, 6, 16);       // upper gallery
      this.air(160, 190, 6, 33);       // the chasm (with a bridge)
      this.air(190, 226, 4, 16);       // crystal hall
      this.air(226, 238, 1, 16);       // elevator shaft
      // bumpy ceilings for a natural look
      const noise = new U.Noise(this.seed ^ 0x77);
      for (let x = 10; x < 238; x++) {
        let top = 0;
        for (let y = 1; y < this.H; y++) if (this.tile(x, y) === 0) { top = y; break; }
        if (!top || (x >= 226)) continue;
        const bump = Math.round(noise.n1(x * 0.3) * 2);
        for (let y = top; y < top + bump; y++) this.setTile(x, y, 1);
      }
      // camp scaffolding + the climb + the bridge
      this.plat(64, 72, 24); this.plat(76, 84, 24); this.plat(69, 79, 22);
      this.plat(102, 106, 24); this.plat(108, 112, 22); this.plat(114, 118, 20); this.plat(120, 123, 18);
      this.plat(160, 189, 16);
      this.plat(196, 200, 14); this.plat(206, 210, 14);

      this.spawn = { x: 6 * TS, y: 12 * TS };
      this.checkpoints = [{ x: 6 * TS, y: 12 * TS }, { x: 62 * TS, y: 26 * TS }, { x: 126 * TS, y: 16 * TS }, { x: 192 * TS, y: 16 * TS }];
      this.elevator = { x: 231.5 * TS, floorY: 16 * TS, x0: 228 * TS, x1: 235 * TS };

      // ---- lights & decorations ----
      this.decor = [];
      this.lights = [];
      this.torches = [];
      this.braziers = [];
      this.signs = [];
      this.chalk = [];
      this.npcs = [];

      const ground = (tx, from) => this._groundBelow(tx, from || 2) * TS;
      const crystal = (tx, big) => {
        const hue = rng.pick(CRYSTAL_COLORS);
        const d = { kind: big ? 'bigcrystal' : 'crystal', x: tx * TS + rng.int(2, 12), y: ground(tx, big ? 4 : 8), hue, size: rng.int(0, 2), phase: rng.range(0, 6) };
        this.decor.push(d);
        this.lights.push({ x: d.x, y: d.y - (big ? 14 : 6), r: big ? 70 : 38, color: hue, pulse: true, ref: d });
      };
      const shroom = (tx) => {
        const hue = rng.pick(['#5ae8e0', '#7ab0ff', '#ff8ad8', '#b0ff7a']);
        const d = { kind: 'mushroom', x: tx * TS + rng.int(2, 12), y: ground(tx, 8), hue, size: rng.int(0, 2), phase: rng.range(0, 6) };
        this.decor.push(d);
        this.lights.push({ x: d.x, y: d.y - 6, r: 30, color: hue, pulse: true, ref: d });
      };
      const lantern = (tx, ty) => {
        const t = { x: tx * TS + 8, y: ty * TS + 4, phase: rng.range(0, 10), lit: true, lantern: true };
        this.torches.push(t);
        this.lights.push({ x: t.x, y: t.y, r: 70, color: '#ffc060', flicker: true, ref: t });
      };
      [16, 24, 31, 38, 44, 52, 57].forEach((x, i) => crystal(x, i % 3 === 0));
      [13, 20, 28, 35, 41, 48, 55, 106, 115, 133, 141, 150, 166, 176, 186, 197, 213, 221].forEach(shroom);
      [128, 137, 146, 155, 193, 201, 209, 217, 223].forEach((x, i) => crystal(x, i % 2 === 0));
      [62, 70, 80, 92].forEach((x) => lantern(x, 21));
      lantern(78, 19);
      [229, 234].forEach((x) => lantern(x, 11));

      // hanging glow vines
      for (let x = 10; x < 226; x += rng.int(3, 7)) {
        const cy = this._ceilAbove(x, 30);
        if (cy > 0 && rng.chance(0.55)) {
          const d = { kind: 'vine', x: x * TS + rng.int(2, 13), y: (cy + 1) * TS, len: rng.int(6, 22), hue: rng.pick(['#6af0c0', '#8affa0', '#ff9ad8']) };
          this.decor.push(d);
          if (rng.chance(0.4)) this.lights.push({ x: d.x, y: d.y + d.len, r: 22, color: d.hue, pulse: true });
        }
      }
      // stalactites
      for (let x = 10; x < 226; x++) {
        if (!rng.chance(0.18)) continue;
        const cy = this._ceilAbove(x, 30);
        if (cy > 0) this.decor.push({ kind: 'stalactite', x: x * TS + rng.int(2, 13), y: (cy + 1) * TS, len: rng.int(5, 14), w: rng.int(3, 6) });
      }
      // the mining camp: support beams, rails, a mine cart, crates
      [63, 74, 86, 97].forEach((x) => this.decor.push({ kind: 'beam', x: x * TS, y: 26 * TS, h: 11 * TS }));
      this.decor.push({ kind: 'rails', x: 60 * TS, x1: 100 * TS, y: 26 * TS });
      this.decor.push({ kind: 'cart', x: 89 * TS, y: 26 * TS });
      [[66, 26], [67, 26], [83, 26], [94, 26]].forEach(([x, y]) => this.decor.push({ kind: 'crate', x: x * TS, y: y * TS }));
      // the elevator shaft frame
      this.decor.push({ kind: 'shaft', x: 227 * TS, x1: 237 * TS, y0: 1 * TS, y1: 16 * TS });

      // miners (talk to them with USE)
      this.npcs.push({ id: 'gus', name: 'MINER GUS', x: 70 * TS, y: 26 * TS, pose: 'mine', facing: -1 });
      this.npcs.push({ id: 'pebbles', name: 'MINER PEBBLES', x: 81 * TS, y: 26 * TS, pose: 'stand', facing: 1 });
      this.npcs.push({ id: 'marge', name: 'OLD MARGE', x: 74 * TS, y: 22 * TS, pose: 'sit', facing: 1 });

      // signs
      const sign = (tx, text) => this.signs.push({ x: tx * TS + 8, y: ground(tx, 2), text, read: false });
      sign(8, 'WELCOME TO THE DEEP ENDS.\nPlease keep your limbs inside the cave.');
      sign(59, 'MINING CAMP.\nNo running. No screaming. Hard hats optional.');
      sign(125, 'BRIDGE AHEAD.\nBuilt by professionals. (Two of them. On a Tuesday.)');
      sign(224, 'ELEVATOR.\nYes, in a cave. No, nobody knows why.');

      // chalk
      this.chalk.push({ x: 26 * TS, y: 13 * TS, text: 'KILL MONSTERS = LEVEL UP' });
      this.chalk.push({ x: 104 * TS, y: 13 * TS, text: 'UP THE PLATFORMS ↑' });

      // monsters
      this.enemySpawns = [
        { type: 'slime', x: 30 * TS }, { type: 'bat', x: 36 * TS }, { type: 'slime', x: 46 * TS }, { type: 'bat', x: 52 * TS },
        { type: 'slime', x: 109 * TS }, { type: 'bat', x: 116 * TS }, { type: 'slime', x: 132 * TS }, { type: 'slime', x: 145 * TS, variant: 'big' },
        { type: 'bat', x: 152 * TS }, { type: 'bat', x: 170 * TS }, { type: 'bat', x: 182 * TS },
        { type: 'slime', x: 198 * TS }, { type: 'bat', x: 204 * TS }, { type: 'slime', x: 214 * TS, variant: 'big' }, { type: 'slime', x: 219 * TS },
      ];
    }

    /** The Deep Ends are bright. Weirdly bright. */
    darknessAt(px) {
      const tx = px / TS;
      if (tx < 60) return 0.28;
      if (tx < 100) return 0.18;
      if (tx < 160) return 0.3;
      if (tx < 190) return 0.38;
      return 0.24;
    }
  }

  ERX.DeepEndsLevel = DeepEndsLevel;
})(window.ERX = window.ERX || {});
