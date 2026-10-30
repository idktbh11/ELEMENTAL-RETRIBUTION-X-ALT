/*
 * Bitmap pixel font — hand-made 5x7 glyphs with lowercase descenders.
 * No browser fonts are ever used for game text.
 *
 * Inline colour markup:  "Your element is {gold}random{/}."
 * Named colours live in Font.COLORS; {/} returns to the base colour.
 */
(function (ERX) {
  'use strict';

  // Rows separated by spaces. '#' = pixel on. Glyphs taller than 7 rows hang
  // below the baseline (descenders). Width = longest row.
  const G = {
    'A': '.###. #...# #...# ##### #...# #...# #...#',
    'B': '####. #...# #...# ####. #...# #...# ####.',
    'C': '.###. #...# #.... #.... #.... #...# .###.',
    'D': '####. #...# #...# #...# #...# #...# ####.',
    'E': '##### #.... #.... ####. #.... #.... #####',
    'F': '##### #.... #.... ####. #.... #.... #....',
    'G': '.###. #...# #.... #.### #...# #...# .####',
    'H': '#...# #...# #...# ##### #...# #...# #...#',
    'I': '### .#. .#. .#. .#. .#. ###',
    'J': '..### ...#. ...#. ...#. #..#. #..#. .##..',
    'K': '#...# #..#. #.#.. ##... #.#.. #..#. #...#',
    'L': '#.... #.... #.... #.... #.... #.... #####',
    'M': '#...# ##.## #.#.# #.#.# #...# #...# #...#',
    'N': '#...# #...# ##..# #.#.# #..## #...# #...#',
    'O': '.###. #...# #...# #...# #...# #...# .###.',
    'P': '####. #...# #...# ####. #.... #.... #....',
    'Q': '.###. #...# #...# #...# #.#.# #..#. .##.#',
    'R': '####. #...# #...# ####. #.#.. #..#. #...#',
    'S': '.#### #.... #.... .###. ....# ....# ####.',
    'T': '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
    'U': '#...# #...# #...# #...# #...# #...# .###.',
    'V': '#...# #...# #...# #...# #...# .#.#. ..#..',
    'W': '#...# #...# #...# #.#.# #.#.# #.#.# .#.#.',
    'X': '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
    'Y': '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..',
    'Z': '##### ....# ...#. ..#.. .#... #.... #####',

    'a': '.... .... .##. ...# .### #..# .###',
    'b': '#... #... ###. #..# #..# #..# ###.',
    'c': '.... .... .### #... #... #... .###',
    'd': '...# ...# .### #..# #..# #..# .###',
    'e': '.... .... .##. #..# #### #... .###',
    'f': '.## #.. ### #.. #.. #.. #..',
    'g': '.... .... .### #..# #..# #..# .### ...# ###.',
    'h': '#... #... ###. #..# #..# #..# #..#',
    'i': '# . # # # # #',
    'j': '.# .. .# .# .# .# .# .# #.',
    'k': '#... #... #..# #.#. ##.. #.#. #..#',
    'l': '#. #. #. #. #. #. .#',
    'm': '..... ..... ####. #.#.# #.#.# #.#.# #.#.#',
    'n': '.... .... ###. #..# #..# #..# #..#',
    'o': '.... .... .##. #..# #..# #..# .##.',
    'p': '.... .... ###. #..# #..# #..# ###. #... #...',
    'q': '.... .... .### #..# #..# #..# .### ...# ...#',
    'r': '... ... #.# ##. #.. #.. #..',
    's': '.... .... .### #... .##. ...# ###.',
    't': '.#. .#. ### .#. .#. .#. ..#',
    'u': '.... .... #..# #..# #..# #..# .###',
    'v': '..... ..... #...# #...# #...# .#.#. ..#..',
    'w': '..... ..... #...# #...# #.#.# #.#.# .#.#.',
    'x': '.... .... #..# #..# .##. #..# #..#',
    'y': '.... .... #..# #..# #..# #..# .### ...# ###.',
    'z': '.... .... #### ...# .##. #... ####',

    '0': '.###. #...# #..## #.#.# ##..# #...# .###.',
    '1': '.#. ##. .#. .#. .#. .#. ###',
    '2': '.###. #...# ....# ...#. ..#.. .#... #####',
    '3': '####. ....# ....# .###. ....# ....# ####.',
    '4': '...#. ..##. .#.#. #..#. ##### ...#. ...#.',
    '5': '##### #.... ####. ....# ....# #...# .###.',
    '6': '.###. #.... #.... ####. #...# #...# .###.',
    '7': '##### ....# ...#. ..#.. .#... .#... .#...',
    '8': '.###. #...# #...# .###. #...# #...# .###.',
    '9': '.###. #...# #...# .#### ....# ....# .###.',

    ' ': '...',
    '.': '. . . . . . #',
    ',': '.. .. .. .. .. .. .# #.',
    '!': '# # # # # . #',
    '?': '.###. #...# ....# ...#. ..#.. ..... ..#..',
    ':': '. . . # . . #',
    ';': '.. .. .. .# .. .. .# #.',
    "'": '# # .',
    '"': '#.# #.# ...',
    '-': '... ... ... ###',
    '+': '... ... .#. ### .#.',
    '=': '... ... ### ... ###',
    '_': '.... .... .... .... .... .... ####',
    '/': '..# ..# .#. .#. .#. #.. #..',
    '\\': '#.. #.. .#. .#. .#. ..# ..#',
    '(': '.# #. #. #. #. #. .#',
    ')': '#. .# .# .# .# .# #.',
    '[': '## #. #. #. #. #. ##',
    ']': '## .# .# .# .# .# ##',
    '<': '... ..# .#. #.. .#. ..# ...',
    '>': '... #.. .#. ..# .#. #.. ...',
    '*': '... #.# .#. #.# ...',
    '#': '..... .#.#. ##### .#.#. ##### .#.#. .....',
    '%': '##..# ##..# ...#. ..#.. .#... #..## #..##',
    '&': '.##.. #..#. .##.. .#... #.#.# #..#. .##.#',
    '~': '..... ..... ..... .##.# #..#.',
    '^': '.#. #.# ...',
    '|': '# # # # # # #',
    '@': '.###. #...# #.### #.#.# #.### #.... .###.',
    '$': '..#.. .#### #.#.. .###. ..#.# ####. ..#..',
    '↑': '..#.. .###. #.#.# ..#.. ..#.. ..#.. .....',
    '↓': '..... ..#.. ..#.. ..#.. #.#.# .###. ..#..',
    '←': '..... ..#.. .#... ##### .#... ..#.. .....',
    '→': '..... ..#.. ...#. ##### ...#. ..#.. .....',
    '♥': '..... .#.#. ##### ##### .###. ..#.. .....',
    '★': '..#.. ..#.. ##### .###. .#.#. #...# .....',
    '•': '.. .. .. ## ## .. ..',
    '©': '.###. #...# #.#.# #.#.# #...# .###. .....',
  };

  const CELL_H = 9;
  const SPACING = 1;
  const glyphs = Object.create(null);
  let atlas = null;
  const tinted = new Map();

  function build() {
    let x = 0;
    const entries = [];
    for (const ch of Object.keys(G)) {
      const rows = G[ch].split(' ');
      const w = Math.max.apply(null, rows.map((r) => r.length));
      entries.push({ ch, rows, w, x });
      x += w + 1;
    }
    atlas = ERX.makeCanvas(x, CELL_H);
    const c = atlas.getContext('2d');
    c.fillStyle = '#ffffff';
    for (const e of entries) {
      e.rows.forEach((row, y) => {
        for (let i = 0; i < row.length; i++) if (row[i] === '#') c.fillRect(e.x + i, y, 1, 1);
      });
      glyphs[e.ch] = { x: e.x, w: e.w };
    }
  }

  function atlasFor(color) {
    let cv = tinted.get(color);
    if (!cv) {
      cv = ERX.makeCanvas(atlas.width, atlas.height);
      const c = cv.getContext('2d');
      c.drawImage(atlas, 0, 0);
      c.globalCompositeOperation = 'source-in';
      c.fillStyle = color;
      c.fillRect(0, 0, cv.width, cv.height);
      tinted.set(color, cv);
    }
    return cv;
  }

  function normalize(text) {
    return String(text)
      .replace(/[’‘]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[—–]/g, '-')
      .replace(/…/g, '...');
  }

  const TAG = /\{(\/|[a-z]+)\}/g;

  /** Split marked-up text into [{text, color}] runs. */
  function parse(text, base) {
    text = normalize(text);
    const runs = [];
    let color = base, last = 0, m;
    TAG.lastIndex = 0;
    while ((m = TAG.exec(text))) {
      if (m[1] !== '/' && !Font.COLORS[m[1]]) continue;
      if (m.index > last) runs.push({ text: text.slice(last, m.index), color });
      color = m[1] === '/' ? base : Font.COLORS[m[1]];
      last = TAG.lastIndex;
    }
    if (last < text.length) runs.push({ text: text.slice(last), color });
    return runs;
  }

  function glyphOf(ch) {
    return glyphs[ch] || glyphs['?'];
  }

  function rawWidth(str) {
    let w = 0;
    for (let i = 0; i < str.length; i++) w += glyphOf(str[i]).w + SPACING;
    return w;
  }

  function drawRuns(ctx, runs, x, y, scale, override) {
    let cx = x;
    for (const run of runs) {
      const src = atlasFor(override || run.color);
      for (let i = 0; i < run.text.length; i++) {
        const g = glyphOf(run.text[i]);
        if (run.text[i] !== ' ') ctx.drawImage(src, g.x, 0, g.w, CELL_H, cx, y, g.w * scale, CELL_H * scale);
        cx += (g.w + SPACING) * scale;
      }
    }
  }

  const Font = {
    LINE_HEIGHT: 10,
    CAP_HEIGHT: 7,
    COLORS: {
      white: '#ffffff',
      gold: '#ffd34d',
      red: '#ff6a4f',
      blue: '#59b4ff',
      green: '#72e05a',
      purple: '#bb7bff',
      yellow: '#ffe45c',
      cyan: '#a8f0ff',
      gray: '#8d93b3',
      dim: '#b4bbdb',
      pink: '#ff8fd0',
    },

    init() {
      if (!atlas) build();
    },

    strip(text) {
      return normalize(text).replace(TAG, (m, name) => (name === '/' || Font.COLORS[name] ? '' : m));
    },

    measure(text, scale = 1) {
      const s = Font.strip(text);
      if (!s.length) return 0;
      return (rawWidth(s) - SPACING) * scale;
    },

    /**
     * Draw text. Options: color, scale, align ('left'|'center'|'right'),
     * shadow (colour), outline (colour), alpha.
     * Returns the drawn width.
     */
    draw(ctx, text, x, y, o = {}) {
      const scale = o.scale || 1;
      const runs = parse(text, o.color || '#ffffff');
      const w = Font.measure(text, scale);
      if (o.align === 'center') x -= Math.floor(w / 2);
      else if (o.align === 'right') x -= w;
      x = Math.round(x);
      y = Math.round(y);
      const prevAlpha = ctx.globalAlpha;
      if (o.alpha !== undefined) ctx.globalAlpha = prevAlpha * o.alpha;
      if (o.outline) {
        const d = o.outlineSize || 1;
        for (let oy = -d; oy <= d; oy += d)
          for (let ox = -d; ox <= d; ox += d) if (ox || oy) drawRuns(ctx, runs, x + ox, y + oy, scale, o.outline);
      }
      if (o.shadow) {
        const s = o.shadowOffset || scale;
        drawRuns(ctx, runs, x, y + s, scale, o.shadow);
      }
      drawRuns(ctx, runs, x, y, scale, null);
      ctx.globalAlpha = prevAlpha;
      return w;
    },

    /** Word-wrap text to a pixel width. Colour markup carries across lines. */
    wrap(text, maxWidth, scale = 1) {
      const out = [];
      const paragraphs = normalize(text).split('\n');
      let activeTag = '';
      for (const para of paragraphs) {
        const words = para.split(' ');
        let line = activeTag;
        let lineHasWords = false;
        for (const word of words) {
          const candidate = lineHasWords ? line + ' ' + word : line + word;
          if (lineHasWords && Font.measure(candidate, scale) > maxWidth) {
            out.push(line);
            line = activeTag + word;
          } else {
            line = candidate;
          }
          lineHasWords = true;
          // Track colour state so the next line starts in the right colour.
          let m;
          TAG.lastIndex = 0;
          while ((m = TAG.exec(word))) {
            if (m[1] === '/') activeTag = '';
            else if (Font.COLORS[m[1]]) activeTag = '{' + m[1] + '}';
          }
        }
        out.push(line);
      }
      return out;
    },
  };

  ERX.Font = Font;
})(window.ERX = window.ERX || {});
