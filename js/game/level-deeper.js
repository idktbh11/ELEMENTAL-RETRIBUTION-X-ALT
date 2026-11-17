/*
 * THE DEEPER ENDS — where you land after the old cave's floor gives way.
 *
 *   the landing chamber (a hole in its ceiling: that's how you got here) ->
 *   long dark galleries -> a basin -> more galleries -> the grumpy slime,
 *   guarding the bit that isn't finished. Again.
 *
 * Dark, black rock underfoot, and dark crystals everywhere that light the
 * place up (purple, blue, violet, teal), with a few torches. Built with the
 * cave's tools (it extends CaveLevel). The story for it is in story-world.js.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U;
  const TS = 16;

  const PAL = {
    rock: ['#4a4260', '#363048', '#262236', '#1a1628', '#120f1c', '#0a0812'],
    moss: ['#5a3a8a', '#3e2a6a'],
    metal: ['#a8b0c0', '#848ca0', '#5e6478', '#3e4254'],
    wood: ['#8a6a4a', '#5e4632', '#3a2a1e'],
    outline: '#040306',
    back: ['#120e1e', '#0e0b18', '#0a0812', '#1a1428'],
    vein: ['#8a6aff', '#5a8aff', '#c86aff', '#4ac8e8'],   // glints of crystal in the rock itself
    decor: ['#4a4260', '#363048', '#262236', '#16121f'],  // stalactites: black rock, like the floor
  };
  /** Dark crystals: the stone is dark, the light it gives off isn't. */
  const CRYSTALS = [
    { hue: '#24184e', glow: '#9a7aff' },
    { hue: '#1a1a44', glow: '#6a9aff' },
    { hue: '#2e1440', glow: '#d07aff' },
    { hue: '#142638', glow: '#5ad8f0' },
  ];
  const FLOOR = 24;

  class DeeperEndsLevel extends ERX.CaveLevel {
    configure() {
      this.W = 150;
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
      this.air(30, 66, 12, FLOOR);          // gallery
      this.air(66, 88, 12, FLOOR + 3);      // the basin...
      this.plat(66, 69, FLOOR + 1); this.plat(84, 87, FLOOR + 1);   // ...with a step at each side
      this.air(88, 126, 10, FLOOR);         // a long gallery
      this.air(126, 146, 8, FLOOR);         // the end chamber (the slime's post)
      const noise = new U.Noise(this.seed ^ 0x55);
      for (let x = 4; x < 146; x++) {
        if (x >= 13 && x <= 19) continue;   // leave the hole above the landing alone
        let top = 0;
        for (let y = 1; y < this.H; y++) if (this.tile(x, y) === 0) { top = y; break; }
        if (!top) continue;
        const bump = Math.round(noise.n1(x * 0.27) * 2);
        for (let y = top; y < top + bump; y++) this.setTile(x, y, 1);
      }

      this.floorY = FLOOR * TS;
      this.landX = 16.5 * TS;               // right under the hole
      this.spawn = { x: 22 * TS, y: FLOOR * TS };
      this.checkpoints = [this.spawn, { x: 96 * TS, y: FLOOR * TS }];
      this.slimeX = 134 * TS;               // where the grumpy slime stands guard

      // ---- crystals, torches ----
      this.decor = [];
      this.lights = [];
      this.torches = [];
      this.braziers = [];
      this.signs = [];
      this.chalk = [];
      this.npcs = [];
      const ground = (tx) => this._groundBelow(tx, 4) * TS;
      const crystal = (tx, big) => {
        const c = rng.pick(CRYSTALS);
        const d = { kind: big ? 'bigcrystal' : 'crystal', x: tx * TS + rng.int(2, 12), y: ground(tx), hue: c.hue, size: rng.int(0, 2), phase: rng.range(0, 6) };
        this.decor.push(d);
        this.lights.push({ x: d.x, y: d.y - (big ? 16 : 7), r: big ? 96 : 54, color: c.glow, pulse: true, ref: d });
      };
      const torch = (tx) => {
        const t = { x: tx * TS + 8, y: ground(tx) - 3 * TS + 4, phase: rng.range(0, 10), lit: true };
        this.torches.push(t);
        this.lights.push({ x: t.x, y: t.y, r: 64, color: '#ffb050', flicker: true, ref: t });
      };
      let n = 0;
      for (let tx = 5; tx < 145; tx += rng.int(2, 5)) {
        if (tx >= 13 && tx <= 20) continue;  // keep the landing spot clear
        crystal(tx, n++ % 3 === 0);
      }
      [9, 27, 49, 79, 104, 128, 142].forEach(torch);
      for (let x = 4; x < 146; x++) {
        if (x >= 13 && x <= 19) continue;
        if (!rng.chance(0.2)) continue;
        const cy = this._ceilAbove(x, FLOOR - 1);
        if (cy > 0) this.decor.push({ kind: 'stalactite', x: x * TS + rng.int(2, 13), y: (cy + 1) * TS, len: rng.int(5, 16), w: rng.int(3, 6) });
      }
      const sign = (tx, text) => this.signs.push({ x: tx * TS + 8, y: ground(tx), text, read: false });
      sign(129, 'THE DEEPER ENDS\nCLOSED FOR CONSTRUCTION.\n(Ask the slime. Do NOT ask the slime.)');

      // the grumpy slime, at its post (the story drops it in first, when you fall in)
      this.npcs.push({ id: 'slime', name: 'GRUMPY SLIME', x: this.slimeX, y: this.floorY, facing: -1, guard: true });
      this.enemySpawns = [];
    }

    /** Dark: the crystals and the torches are the light. */
    darknessAt() { return 0.58; }
  }

  ERX.DeeperEndsLevel = DeeperEndsLevel;
})(window.ERX = window.ERX || {});
