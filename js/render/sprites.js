/*
 * Small hand-drawn sprites defined as text, plus helpers to turn
 * character grids into canvases. Used for UI icons and the cursor.
 */
(function (ERX) {
  'use strict';

  const Sprites = {
    /**
     * rows: array of strings; palette: { char: '#hex' }; '.' or ' ' = transparent.
     */
    fromStrings(rows, palette) {
      const h = rows.length;
      const w = Math.max.apply(null, rows.map((r) => r.length));
      const buf = new ERX.PixelBuffer(w, h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < rows[y].length; x++) {
          const ch = rows[y][x];
          if (ch === '.' || ch === ' ') continue;
          const c = palette[ch];
          if (c) buf.set(x, y, ERX.Color.u32(c));
        }
      }
      return buf.toCanvas();
    },

    mirror(canvas) {
      const cv = ERX.makeCanvas(canvas.width, canvas.height);
      const c = cv.getContext('2d');
      c.translate(canvas.width, 0);
      c.scale(-1, 1);
      c.drawImage(canvas, 0, 0);
      return cv;
    },

    /** Recolour a white-ish mask sprite with a flat colour. */
    tint(canvas, color) {
      const cv = ERX.makeCanvas(canvas.width, canvas.height);
      const c = cv.getContext('2d');
      c.drawImage(canvas, 0, 0);
      c.globalCompositeOperation = 'source-in';
      c.fillStyle = color;
      c.fillRect(0, 0, cv.width, cv.height);
      return cv;
    },

    icons: {},
    cursor: null,

    init() {
      const ICONS = {
        play: [
          '.#.......',
          '.##......',
          '.#w#.....',
          '.#ww#....',
          '.#www#...',
          '.#ww#....',
          '.#w#.....',
          '.##......',
          '.#.......',
        ],
        gear: [
          '...#.#...',
          '.#.###.#.',
          '..#####..',
          '.###w###.',
          '###w.w###',
          '.###w###.',
          '..#####..',
          '.#.###.#.',
          '...#.#...',
        ],
        help: [
          '..#####..',
          '.##...##.',
          '......##.',
          '.....##..',
          '....##...',
          '....##...',
          '.........',
          '....##...',
          '....##...',
        ],
        star: [
          '....#....',
          '....#....',
          '...#w#...',
          '####w####',
          '.#wwwww#.',
          '..#www#..',
          '..#w#w#..',
          '.##...##.',
          '.#.....#.',
        ],
        back: [
          '...#.....',
          '..##.....',
          '.#w#####.',
          '#wwwwwww#',
          '.#w#####.',
          '..##.....',
          '...#.....',
        ],
        reset: [
          '..####...',
          '.#....#.#',
          '#......##',
          '#.....###',
          '#........',
          '#.......#',
          '.#.....#.',
          '..#####..',
        ],
        speaker: [
          '....#....',
          '...##..#.',
          '###w#...#',
          '#ww.#.#.#',
          '###w#...#',
          '...##..#.',
          '....#....',
        ],
        eye: [
          '..#####..',
          '.#.....#.',
          '#..###..#',
          '#..#w#..#',
          '.#..#..#.',
          '..#####..',
        ],
        trash: [
          '..###..',
          '#######',
          '.......',
          '.#####.',
          '.#w#w#.',
          '.#w#w#.',
          '.#w#w#.',
          '..###..',
        ],
        dice: [
          '#######',
          '#w###w#',
          '#######',
          '###w###',
          '#######',
          '#w###w#',
          '#######',
        ],
        plus: [
          '..###..',
          '..#w#..',
          '###w###',
          '#wwwww#',
          '###w###',
          '..#w#..',
          '..###..',
        ],
        lock: [
          '..###..',
          '.#...#.',
          '.#...#.',
          '#######',
          '###w###',
          '###w###',
          '#######',
        ],
        keys: [
          '#########',
          '#.#.#.#.#',
          '#########',
          '#.#####.#',
          '#########',
        ],
      };
      for (const name of Object.keys(ICONS)) {
        // White mask; tinted at draw time. 'w' marks an inner highlight.
        this.icons[name] = {
          base: this.fromStrings(ICONS[name], { '#': '#ffffff' }),
          inner: this.fromStrings(ICONS[name], { 'w': '#ffffff' }),
          w: ICONS[name][0].length,
          h: ICONS[name].length,
        };
      }
      this._tintCache = new Map();

      this.cursor = this.fromStrings(
        [
          'k..........',
          'kk.........',
          'kwk........',
          'kwwk.......',
          'kwwwk......',
          'kwwwwk.....',
          'kwwwwwk....',
          'kwwwwwgk...',
          'kwwwwwggk..',
          'kwwwwkkkkk.',
          'kwwkwk.....',
          'kwk.kwk....',
          'kk..kwk....',
          'k....kwk...',
          '.....kk....',
        ],
        { k: '#0b0d1a', w: '#ffffff', g: '#b9c3ff' }
      );
    },

    /** Draw a tinted icon. `inner` colours the 'w' highlight pixels. */
    drawIcon(ctx, name, x, y, color, inner) {
      const icon = this.icons[name];
      if (!icon) return;
      const key = name + color + (inner || '');
      let pair = this._tintCache.get(key);
      if (!pair) {
        pair = [this.tint(icon.base, color), inner ? this.tint(icon.inner, inner) : null];
        this._tintCache.set(key, pair);
      }
      ctx.drawImage(pair[0], Math.round(x), Math.round(y));
      if (pair[1]) ctx.drawImage(pair[1], Math.round(x), Math.round(y));
    },
  };

  ERX.Sprites = Sprites;
})(window.ERX = window.ERX || {});
