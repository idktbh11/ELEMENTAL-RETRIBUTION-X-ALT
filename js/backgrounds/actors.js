/*
 * Tiny pixel actors: procedurally-dressed people (with walk, talk, sit,
 * hammer and wave poses), animals and speech bubbles.
 *
 * These are scenery only — looping behaviours to make menu worlds feel
 * inhabited. No gameplay AI lives here.
 */
(function (ERX) {
  'use strict';

  const PB = ERX.PixelBuffer, C = ERX.Color;
  const c32 = (h) => C.u32(h);

  const SKINS = ['#f2c7a0', '#e0a77e', '#c07f58', '#8e5a3c', '#f6d8bc'];
  const HAIRS = ['#2a1d1a', '#5a3622', '#a8642e', '#e2c060', '#d8d4d0', '#6a2a2a', '#1f2440'];
  const CLOTHES = ['#b84a3a', '#3e6cb0', '#4a8a4a', '#8a5aa8', '#c89a3a', '#3a8a8a', '#a05a7a', '#6a6a7a', '#d07a3a'];
  const PANTS = ['#3a3048', '#4a3a2e', '#2e3a52', '#504440', '#3a4a3a'];

  /** Random appearance. */
  function randomLook(rng, o = {}) {
    const shirt = o.shirt || rng.pick(CLOTHES);
    return Object.assign({
      skin: rng.pick(SKINS),
      hair: rng.pick(HAIRS),
      hairStyle: rng.pick(['short', 'short', 'long', 'bald', 'hood', 'hat']),
      shirt,
      shirtDark: C.shade(shirt, -0.3),
      pants: rng.pick(PANTS),
      shoes: '#2a1e1e',
      hatColor: rng.pick(['#6a4a2e', '#3a3a52', '#8a2a2a', '#c8a050']),
      hoodColor: C.shade(shirt, -0.15),
      dress: rng.chance(0.3),
      apron: false,
      kid: false,
    }, o);
  }

  /**
   * Paint one frame of a person facing right into a 13x19 buffer.
   * The feet rest on row 15 and the body is centred on column 6
   * (see ANCHOR), for both the right- and left-facing versions.
   * pose: 'stand' | 'walk' | 'talk' | 'sit' | 'hammer' | 'wave'; frame: int
   */
  function paintPerson(L, pose, frame) {
    const b = new PB(13, 19);
    const S = c32(L.skin), H = c32(L.hair), SH = c32(L.shirt), SD = c32(L.shirtDark);
    const P = c32(L.pants), F = c32(L.shoes), E = c32('#1a1420');
    const ox = 3;
    const kid = L.kid ? 2 : 0;
    let oy = 3 + kid;
    // bob on passing frames while walking
    if (pose === 'walk' && frame % 2 === 1) oy -= 1;
    if (pose === 'sit') oy += 2;

    const set = (x, y, c) => b.set(ox + x, oy + y, c);
    const rect = (x, y, w, h, c) => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) set(x + xx, y + yy, c); };

    // --- legs / dress ---
    const legY = 9 - kid;
    if (pose === 'sit') {
      rect(1, legY, 5, 2, P);            // thighs forward
      rect(5, legY + 1, 2, 2, P);        // shins
      rect(5, legY + 3, 3, 1, F);
    } else if (L.dress) {
      const flare = pose === 'walk' && frame % 2 === 0 ? 1 : 0;
      rect(0 - flare, legY, 6 + flare * 2, 2, SD);
      rect(1, legY + 2, 4, 1, SD);
      if (pose === 'walk' && frame % 2 === 0) { set(0, legY + 3, F); set(5, legY + 3, F); }
      else { set(1, legY + 3, F); set(4, legY + 3, F); }
    } else if (pose === 'walk' && frame % 2 === 0) {
      const flip = frame === 2;
      // contact pose: legs apart
      rect(1, legY, 4, 1, P);
      rect(flip ? 4 : 0, legY + 1, 2, 2, P);
      rect(flip ? 0 : 4, legY + 1, 2, 2, c32(C.shade(L.pants, -0.25)));
      rect(-1 + (flip ? 5 : 0), legY + 3, 3, 1, F);
      rect(4 - (flip ? 5 : 0), legY + 3, 3, 1, F);
    } else {
      rect(1, legY, 4, 3, P);
      set(3, legY + 1, c32(C.shade(L.pants, -0.25)));
      set(3, legY + 2, c32(C.shade(L.pants, -0.25)));
      rect(1, legY + 3, 2, 1, F);
      rect(3, legY + 3, 3, 1, F);
    }

    // --- torso ---
    const torsoY = 4;
    rect(1, torsoY, 4, legY - torsoY, SH);
    rect(1, torsoY, 1, legY - torsoY, SD);
    if (L.apron) rect(3, torsoY + 1, 2, legY - torsoY + 1, c32('#d8cfc0'));

    // --- arm (near side) ---
    if (pose === 'hammer') {
      if (frame === 0) {
        // raised
        set(4, 4, SD); set(5, 3, SD); set(5, 2, S);
        rect(5, 0, 1, 2, c32('#6a4a30'));
        rect(4, -1, 3, 2, c32('#9aa0b0'));
      } else {
        set(4, 4, SD); set(5, 5, SD); set(6, 6, S);
        rect(6, 6, 2, 1, c32('#6a4a30'));
        rect(7, 5, 2, 3, c32('#9aa0b0'));
      }
    } else if (pose === 'wave' && frame % 2 === 0) {
      set(4, 4, SD); set(5, 3, SD); set(5, 2, S); set(6, 1, S);
    } else if (pose === 'wave') {
      set(4, 4, SD); set(5, 3, SD); set(5, 2, S); set(5, 1, S);
    } else if (pose === 'talk' && frame % 2 === 1) {
      set(4, 4, SD); set(5, 5, SD); set(6, 5, S);
    } else if (pose === 'walk') {
      const swing = frame === 0 ? 1 : frame === 2 ? -1 : 0;
      set(3, 4, SD); set(3 + (swing > 0 ? 1 : 0), 5, SD); set(3 + swing, 6, SD); set(3 + swing, 7, S);
    } else if (pose === 'sit') {
      set(3, 5, SD); set(4, 6, SD); set(5, 7, S);
    } else {
      set(3, 4, SD); set(3, 5, SD); set(3, 6, SD); set(3, 7, S);
    }

    // --- head ---
    rect(1, 0, 4, 4, S);
    set(3, 1, S);
    set(4, 1, E);                       // eye
    if (pose === 'talk' && frame % 2 === 1) set(4, 3, c32('#7a2a2a')); // open mouth
    switch (L.hairStyle) {
      case 'bald':
        set(1, 1, H);
        break;
      case 'long':
        rect(1, -1, 4, 1, H); rect(0, 0, 3, 1, H); set(0, 1, H); set(0, 2, H); set(0, 3, H); set(0, 4, H); set(1, 1, H); set(1, 2, H);
        break;
      case 'hood':
        rect(0, -1, 5, 1, c32(L.hoodColor)); rect(0, 0, 2, 4, c32(L.hoodColor)); set(2, 0, c32(L.hoodColor)); set(5, 0, c32(L.hoodColor));
        break;
      case 'hat':
        rect(-1, -1, 7, 1, c32(L.hatColor)); rect(1, -3, 4, 2, c32(L.hatColor)); rect(1, -1, 4, 1, c32(C.shade(L.hatColor, -0.3)));
        set(1, 0, H); set(1, 1, H);
        break;
      default:
        rect(1, -1, 4, 1, H); rect(1, 0, 2, 1, H); set(4, 0, H); set(1, 1, H);
    }
    b.outline(c32('#120c14'));
    return b.toCanvas();
  }

  /** Build all frames (both facings) for a look. */
  function makePerson(rng, o) {
    const look = o && o.look ? o.look : randomLook(rng, o || {});
    const frames = {};
    const POSES = { stand: 1, walk: 4, talk: 2, sit: 1, hammer: 2, wave: 2 };
    for (const pose of Object.keys(POSES)) {
      frames[pose] = [];
      for (let f = 0; f < POSES[pose]; f++) {
        const right = paintPerson(look, pose, f);
        frames[pose].push({ r: right, l: ERX.Sprites.mirror(right) });
      }
    }
    return { look, frames };
  }

  // ------------------------------------------------------------ animals
  const ANIMALS = {
    cat: {
      pal: { k: '#2a2430', e: '#e8d050', p: '#d88a9a' },
      frames: [
        ['.......k.k', '.......kkk', 'k......kek', 'k.....kkk.', '.kkkkkkk..', '..kk..kk..'],
        ['.......k.k', '.......kkk', '.......kek', 'kk....kkk.', '.kkkkkkk..', '..kk..kk..'],
      ],
    },
    chicken: {
      pal: { w: '#f4f0e8', r: '#d83a3a', o: '#f0a030', y: '#e0b040', g: '#c8c0b8' },
      frames: [
        ['...r.', '..ww.', 'g.wwo', 'gwww.', '.y.y.'],
        ['.....', '.....', 'g.ww.', 'gwwwr', '.y.yo'],
      ],
    },
    dog: {
      pal: { b: '#8a5a32', d: '#5a3a22', e: '#1a1010', n: '#1a1010' },
      frames: [
        ['......bb.', '.....bbbn', 'b....beb.', '.bbbbbbb.', '.bbbbbbb.', '.d.d..d.d'],
        ['......bb.', '.....bbbn', '.....beb.', 'bbbbbbbb.', '.bbbbbbb.', '.d.d..d.d'],
      ],
    },
  };
  const animalCache = new Map();
  function animal(kind) {
    if (!animalCache.has(kind)) {
      const A = ANIMALS[kind];
      animalCache.set(kind, A.frames.map((rows) => {
        const r = ERX.Sprites.fromStrings(rows, A.pal);
        return { r, l: ERX.Sprites.mirror(r) };
      }));
    }
    return animalCache.get(kind);
  }

  // ------------------------------------------------------ speech bubbles
  const ICONS = {
    dots: ['.......', '.......', '.#.#.#.', '.......'],
    bang: ['...#...', '...#...', '.......', '...#...'],
    what: ['..##...', '....#..', '...#...', '...#...'],
    heart: ['.##.##.', '.#####.', '..###..', '...#...'],
    note: ['...##..', '...#.#.', '.###...', '.##....'],
    coin: ['..###..', '.##.##.', '.##.##.', '..###..'],
  };
  const bubbleCache = new Map();
  function bubble(kind) {
    if (!bubbleCache.has(kind)) {
      const icon = ICONS[kind] || ICONS.dots;
      const rows = ['.wwwwwwww.', 'wwwwwwwwww'];
      for (const r of icon) rows.push('ww' + r.replace(/#/g, 'i').replace(/\./g, 'w').slice(0, 7) + 'w');
      rows.push('wwwwwwwwww', '.wwwwwwww.', '..ww......', '..w.......');
      const buf = new PB(10, rows.length);
      const colors = {
        w: c32('#ffffff'),
        i: c32(kind === 'heart' ? '#e83a5a' : kind === 'coin' ? '#d8a020' : kind === 'bang' ? '#d83a3a' : '#2a2440'),
      };
      rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (colors[r[x]]) buf.set(x, y, colors[r[x]]); });
      buf.outline(c32('#1a1420'));
      bubbleCache.set(kind, buf.toCanvas());
    }
    return bubbleCache.get(kind);
  }

  ERX.Actors = { ANCHOR: { x: 6, y: 15 }, randomLook, makePerson, animal, bubble, BUBBLES: Object.keys(ICONS) };
})(window.ERX = window.ERX || {});
