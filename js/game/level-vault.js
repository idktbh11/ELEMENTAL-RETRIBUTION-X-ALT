/*
 * THE SEALED CHAMBER — where the elevator actually goes.
 *
 *   elevator -> short corridor -> the chamber (a pedestal with a glowing
 *   rainbow orb in a sealing container) -> a sealed door (nope)
 *
 * Built with the same tools as the cave (it extends CaveLevel).
 */
(function (ERX) {
  'use strict';

  const TS = 16;
  const { METAL } = ERX.CaveLevel.TILES;

  const PAL = {
    rock: ['#a49ab8', '#82789c', '#625a80', '#463f62', '#302a48', '#201c34'],
    moss: ['#a49ab8', '#82789c'],
    metal: ['#c8c0d8', '#a098b8', '#706890', '#4a4466'],
    wood: ['#b8844a', '#8a5a36', '#5a3a22'],
    outline: '#100c1c',
    back: ['#221c34', '#1c172c', '#151124', '#2a2340'],
    vein: ['#ff6a6a', '#ffd36a', '#6aff9a', '#6ac8ff', '#c86aff'],
  };

  class VaultLevel extends ERX.CaveLevel {
    configure() {
      this.W = 64;
      this.H = 20;
      this.pal = PAL;
      this.sections = [];
      this.id = 'vault';
      this.mossUntil = 0;
    }

    build() {
      this.tiles.fill(1);
      this.air(2, 12, 1, 16);        // elevator shaft (you arrive here)
      this.air(12, 22, 11, 16);      // corridor
      this.air(22, 60, 3, 16);       // the chamber
      for (let x = 22; x < 60; x++) this.setTile(x, 16, METAL);

      this.spawn = { x: 7 * TS, y: 16 * TS };
      this.elevator = { x: 7 * TS, floorY: 16 * TS, x0: 4 * TS, x1: 10 * TS };
      this.checkpoints = [{ x: 7 * TS, y: 16 * TS }];
      this.orb = { x: 45.5 * TS, floorY: 16 * TS };
      this.sealedDoorX = 59 * TS;

      this.decor = [];
      this.lights = [];
      this.torches = [];
      this.braziers = [];
      this.signs = [];
      this.chalk = [];
      this.npcs = [];
      this.enemySpawns = [];

      const lantern = (tx, ty) => {
        const t = { x: tx * TS + 8, y: ty * TS + 4, phase: tx, lit: true, lantern: true };
        this.torches.push(t);
        this.lights.push({ x: t.x, y: t.y, r: 60, color: '#ffc060', flicker: true, ref: t });
      };
      [21, 29, 37, 53].forEach((x) => lantern(x, x < 22 ? 12 : 9));
      [25, 33, 56].forEach((x) => this.decor.push({ kind: 'pillar', x: x * TS + 8, y: 16 * TS, h: 13 * TS }));
      this.decor.push({ kind: 'shaft', x: 3 * TS, x1: 11 * TS, y0: 1 * TS, y1: 16 * TS });
      this.decor.push({ kind: 'vaultdoor', x: 59 * TS, y: 16 * TS });
      this.decor.push({ kind: 'runes', x: 37 * TS, x1: 54 * TS, y: 6 * TS });

      this.chalk.push({ x: 13 * TS, y: 12 * TS, text: 'TURN BACK' });
      this.chalk.push({ x: 13 * TS, y: 12 * TS + 9, text: '(or don\'t, idc)' });
    }

    darknessAt() { return 0.5; }
  }

  ERX.VaultLevel = VaultLevel;
})(window.ERX = window.ERX || {});
