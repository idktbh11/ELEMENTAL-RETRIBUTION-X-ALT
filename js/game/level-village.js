/*
 * NORMALTON — a village in World 1 (where the lift out of the abyss drops you, from a great height).
 *
 * A perfectly normal village on a perfectly normal planet: a farm with a red barn and chickens,
 * cottages with flower boxes, the bakery, the general store, a cobbled square with a well and a
 * great old oak (and a crater in the middle, now: you), the SLEEPY GOOSE inn, the smithy... and at
 * the east gate, the road out of town, dug up and fenced off. Under construction. Guarded.
 * The west end's the other side of World 1's old cave: the cliff came down in a heap when the
 * cave did, and the path runs on over the rubble, back through the fog to the meadow.
 *
 *   VillageLevel extends World1Level: the same sky, sun, clouds and day/night (it's the same
 *   planet), so the sky fall (js/game/world-fall.js) works on it as it is. Its own ground,
 *   buildings, villagers and critters.
 *
 *   level.folk           where the villagers stand and what they do (their looks + lines: story-world.js)
 *   level.marks.doors    every front door: enter (a room inside: js/game/level-interior.js) or knock (who answers: story-world.js)
 *   level.gate           the east gate's doors: shut until the mayor has them opened (openGate), then open for good
 *   level.crater         where you came down (drawn in the square from then on)
 *   level.checkshotX     the village's Checkshot, in the square (drawn and used like World 1's: game-screen.js)
 *   VillageLevel.folkUpdate / folkDraw   the game screen calls these for each villager
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, PB = ERX.PixelBuffer, C = ERX.Color, P = ERX.Paint;
  const TS = 16;
  const { AIR, ROCK } = ERX.CaveLevel.TILES;
  const W1 = ERX.World1Level, lightAt = W1.lightAt;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const INK = '#1a1424';
  const cc = new Map();
  const K = (h) => { let v = cc.get(h); if (v === undefined) { v = C.u32(h); cc.set(h, v); } return v; };
  const bayer = (x, y) => ERX.bayer(x, y);

  // ---------------------------------------------------------------- palettes
  const GRASS = ['#b4f06a', '#86d84e', '#5cb844', '#3e9a3c', '#2c7a36'];
  const SOIL = ['#9a6a42', '#86583a', '#704830', '#5a3a28', '#462e22', '#36241c'];
  const ROAD = ['#d4b486', '#bc9a6a', '#a07e52', '#86663e'];
  const COBBLE = ['#d8d2c8', '#b4aca4', '#9a9290', '#787076', '#4a4450'];
  const CLIFF = ['#b4aca8', '#948c92', '#78727e', '#5c5866', '#44404e', '#302c3a'];
  const WALLS = [['#f4e8d0', '#dccaa8'], ['#eadfd4', '#cdbeb0'], ['#f2d9a8', '#d6ba84'], ['#dfe6ea', '#bcc6cc'], ['#f6e2da', '#dac2ba']];
  const ROOFS = ['#c8503e', '#4a6ab4', '#4e8e52', '#a06a3e', '#8a4a7e', '#d6743a'];
  const SHUTTERS = ['#4a7ab0', '#3e8a4e', '#b8483a', '#8a5a9a', '#c8902a'];
  const TIMBER = ['#6a4630', '#4e3222'];
  const STONE = ['#b0a8a4', '#908884', '#6e6668', '#4c4650'];
  const WOOD = ['#d4a46a', '#b0804e', '#86583a', '#5a3a26'];
  const IRON = ['#5a5a6a', '#3a3a48', '#24242e'];
  const TREE = { dark: '#2c7a36', mid: '#46a043', light: '#7cd055', hi: '#b8f070', trunk: '#8a5a38', trunkDark: '#5a3a28', outline: '#1a2a1e' };
  const TREE_BACK = { dark: '#3a7a5a', mid: '#4e9068', light: '#6aa87a', hi: '#8ac090', trunk: '#6a5a4a', trunkDark: '#4a4038', outline: null };
  const PINE_BACK = { dark: '#2e6a4a', mid: '#3e7e56', light: '#5a9a6a', trunk: '#5a4a3a' };
  const FLOWERS = ['#ff6a8a', '#ffd34d', '#ffffff', '#b87aff', '#ff9a3a', '#6ac8ff'];

  // ---------------------------------------------------------------- the layout (tiles)
  const MAP = {
    W: 132, surf: 27,
    west: 4, east: 128,         // the west end: the rubble of the old cave's cliff (World 1's over it); the east end: a cliff, solid from here
    farm: 21,                   // grass up to here (the farm), then the street
    square: [52, 78],           // the cobbled square
    gate: 113,                  // the east gate; past it the road is dug up (under construction)
    land: 65,                   // where you come down: the middle of the square
    checkshot: 67.6,            // the village's Checkshot, in the square (the game screen draws it)
    spawn: 60,                  // back from a save: here
    slime: 114.35,              // where the grumpy slime stands guard (in the east gateway, once it's open)
  };
  // the buildings: x (left wall, tiles), w (tiles) and how they look
  const BUILD = [
    { kind: 'barn', x: 6.5, w: 8 },
    // (enter: the room you walk into, js/game/level-interior.js; knock: who answers, story-world.js knock())
    { kind: 'house', x: 22.5, w: 6, floors: 1, wall: 0, roof: 1, shutter: 2, timber: true, door: 0.3, chimney: 0.72, flowers: true, knock: 'farm' },
    { kind: 'house', x: 29.5, w: 5.5, floors: 2, wall: 3, roof: 0, shutter: 0, door: 0.55, chimney: 0.24, knock: 'cat' },
    { kind: 'shop', x: 36, w: 7, floors: 2, wall: 2, roof: 3, shutter: 2, timber: true, door: 0.3, chimney: 0.76, sign: 'bread', awning: '#c84a3a', name: 'BAKERY', knock: 'bakery' },
    { kind: 'shop', x: 45, w: 6, floors: 1, wall: 4, roof: 2, shutter: 3, timber: true, door: 0.62, chimney: 0.25, sign: 'potion', awning: '#3e8a4e', name: 'GOODS', enter: 'goods' },
    { kind: 'shop', x: 79, w: 9.5, floors: 2, wall: 1, roof: 4, shutter: 4, timber: true, door: 0.5, chimney: 0.18, chimney2: 0.84, sign: 'mug', awning: '#8a4a7e', dormer: true, name: 'THE SLEEPY GOOSE', enter: 'inn' },
    { kind: 'smithy', x: 90.5, w: 6.5 },
    { kind: 'shop', x: 98.5, w: 5, floors: 1, wall: 3, roof: 5, shutter: 1, timber: true, door: 0.3, chimney: 0.72, sign: 'shield', awning: '#4a6ab4', name: 'ARMORY', enter: 'armory' },
    { kind: 'house', x: 104, w: 5, floors: 2, wall: 0, roof: 1, shutter: 3, door: 0.4, chimney: 0.66, flowers: true, knock: 'end' },
  ];
  // the villagers (their looks and what they say: story-world.js, VILLAGERS)
  const FOLK = [
    { id: 'clover', x: 18, mode: 'wander', range: [9, 22], speed: 16, facing: -1 },
    { id: 'rosa', x: 40.5, mode: 'idle', facing: 1 },
    { id: 'bramble', x: 60, mode: 'wander', range: [55, 65.5], speed: 12, facing: 1 },
    { id: 'pip', x: 74.6, mode: 'sit', facing: -1 },
    { id: 'holt', x: 93.2, mode: 'smith', facing: 1 },
    // (Fenwick's behind his counter, Molly's behind her bar, Greta's in her armory: level-interior.js)
    { id: 'timmy', x: 101, mode: 'wander', range: [95, 107.5], speed: 46, facing: 1 },
  ];

  // ---------------------------------------------------------------- painting helpers (into a PixelBuffer)
  const S = (b, x, y, col) => b.set(Math.round(x), Math.round(y), K(col));
  const R = (b, x, y, w, h, col) => { if (w > 0 && h > 0) b.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), K(col)); };
  const L = (b, x0, y0, x1, y1, col) => b.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), K(col));
  const disc = (b, x, y, r, col) => b.circle(Math.round(x), Math.round(y), r, K(col));
  const oval = (b, x, y, rx, ry, col) => b.ellipse(Math.round(x), Math.round(y), rx, ry, K(col));
  const blit = (b, src, x, yBottom) => { for (let yy = 0; yy < src.h; yy++) for (let xx = 0; xx < src.w; xx++) { const v = src.data[yy * src.w + xx]; if (v) b.set(Math.round(x - src.w / 2) + xx, Math.round(yBottom - src.h) + yy, v); } };
  const ICONS = {
    bread: ['..###..', '.#####.', '##.#.##', '#######', '#######', '.#####.'],
    mug: ['#####..', '#...###', '#...#.#', '#...###', '#...#..', '#####..'],
    potion: ['..##...', '..##...', '.####..', '######.', '######.', '.####..'],
    anvil: ['#######', '.#####.', '..###..', '..###..', '.#####.', '.......'],
    shield: ['#######', '###.###', '#.....#', '###.###', '.##.##.', '..#.#..', '...#...'],
  };

  const textW = (s) => (ERX.Font && ERX.Font.measure ? ERX.Font.measure(s) : s.length * 6);
  /** A name board sized to its text (the text itself goes on once the buffer's a canvas: out.texts). */
  function board(b, cx, y, text, bg, fg, out) {
    const w = textW(text) + 8, x = Math.round(cx - w / 2);
    R(b, x - 1, y - 1, w + 2, 11, INK); R(b, x, y, w, 9, bg); R(b, x, y, w, 1, C.shade(bg, 0.25));
    out.texts.push({ x: x + w / 2, y: y + 1, text, color: fg });
    return { x, w };
  }

  /** A window: shutters, a white frame, blue glass with a glint, a sill (and maybe a box of flowers). */
  function paintWindow(b, rng, x, y, w, h, shutter, flowers, out) {
    const sh = C.shade(shutter, -0.25);
    for (const sx of [x - 5, x + w + 1]) { R(b, sx, y - 1, 4, h + 2, shutter); for (let yy = y + 1; yy < y + h; yy += 2) R(b, sx, yy, 4, 1, sh); R(b, sx, y - 1, 1, h + 2, C.shade(shutter, 0.2)); }
    R(b, x - 1, y - 1, w + 2, h + 2, INK);
    R(b, x, y, w, h, '#f4f0e6');
    for (let yy = 1; yy < h - 1; yy++) R(b, x + 1, y + yy, w - 2, 1, C.mix('#b8dcf4', '#5a88c0', yy / (h - 2)));
    L(b, x + 2, y + h - 4, x + w - 4, y + 2, '#e8f6ff'); L(b, x + 3, y + h - 3, x + w - 3, y + 3, '#d0ecfc');
    R(b, x + Math.floor(w / 2), y, 1, h, '#f4f0e6'); R(b, x, y + Math.floor(h / 2), w, 1, '#f4f0e6');
    R(b, x - 2, y + h + 1, w + 4, 2, WOOD[1]); R(b, x - 2, y + h + 2, w + 4, 1, WOOD[3]);
    if (flowers && rng.next() < 0.75) {
      R(b, x - 1, y + h + 3, w + 2, 3, WOOD[2]); R(b, x - 1, y + h + 3, w + 2, 1, WOOD[1]);
      for (let i = -1; i <= w; i++) { S(b, x + i, y + h + 2, i % 2 ? '#3e9a3c' : '#5cb844'); if (rng.next() < 0.5) S(b, x + i, y + h + 1, rng.pick(FLOWERS)); }
    }
    out.windows.push({ x, y, w, h });
  }

  /**
   * A cottage or a shop, standing on the ground at gy (its foundation goes down into the ground), its walls X..X+W.
   * Returns where its windows, chimneys, lamp and door are (for the lights at night and the smoke).
   */
  function paintHouse(b, rng, X, gy, W, o, out) {
    const FH = 34, found = 4, wallH = FH * o.floors + found, top = gy - wallH;
    const [wall, shade] = WALLS[o.wall], roof = ROOFS[o.roof], shutter = SHUTTERS[o.shutter || 0];
    // walls: plaster, shadowed under the eaves and toward the right
    for (let y = top; y < gy - found; y++) for (let x = X; x < X + W; x++) {
      const k = (x - X) / W;
      S(b, x, y, (y < top + 3 && bayer(x, y) < 0.75) || (k > 0.82 && bayer(x, y) < (k - 0.82) * 3.5) ? shade : wall);
    }
    // the foundation: a course of stones
    for (let y = gy - found; y < gy + 3; y++) {
      const r = Math.floor((y - gy + found) / 2), ry = (y - gy + found) % 2;
      for (let x = X - 1; x <= X + W; x++) S(b, x, y, (x - X + 1 + (r % 2) * 3) % 6 === 0 ? STONE[3] : ry === 0 ? STONE[0] : STONE[1]);
    }
    // the timber frame
    if (o.timber) {
      const n = Math.max(2, Math.round(W / 28)), posts = [X, X + W - 3];
      for (let i = 1; i < n; i++) posts.push(X + Math.round((i * W) / n) - 1);
      for (const px of posts) { R(b, px, top, 3, wallH - found, TIMBER[0]); R(b, px + 2, top, 1, wallH - found, TIMBER[1]); }
      R(b, X, top, W, 2, TIMBER[0]); R(b, X, gy - found - 2, W, 2, TIMBER[0]);
      for (let f = 1; f < o.floors; f++) R(b, X, top + f * FH - 1, W, 3, TIMBER[0]);
      // braces in the end panels of each floor
      for (let f = 0; f < o.floors; f++) {
        const y0 = top + f * FH + 2, y1 = top + (f + 1) * FH - 2, pw = Math.round(W / n);
        L(b, X + 3, y1, X + Math.min(pw - 1, 14), y0 + 6, TIMBER[0]); L(b, X + 4, y1, X + Math.min(pw, 15), y0 + 6, TIMBER[1]);
        L(b, X + W - 4, y1, X + W - Math.min(pw, 15), y0 + 6, TIMBER[0]); L(b, X + W - 5, y1, X + W - Math.min(pw + 1, 16), y0 + 6, TIMBER[1]);
      }
    }
    // the door (arched), its step, and a lantern beside it
    const dw = 12, dh = 23, dx = Math.round(X + W * o.door - dw / 2), dy = gy - dh;
    R(b, dx - 1, dy, dw + 2, dh, INK); R(b, dx, dy - 1, dw, 1, INK); R(b, dx + 2, dy - 2, dw - 4, 1, INK);
    for (let y = dy; y < gy; y++) {
      const inset = y === dy ? 2 : 0;
      for (let x = dx + inset; x < dx + dw - inset; x++) S(b, x, y, (x - dx) % 4 === 3 ? WOOD[3] : (x - dx) % 4 === 0 ? WOOD[1] : WOOD[2]);
    }
    R(b, dx + 1, dy + 9, dw - 2, 1, WOOD[3]); R(b, dx + 1, dy + 16, dw - 2, 1, WOOD[3]);
    S(b, dx + dw - 3, dy + 12, '#ffd34d');
    R(b, dx - 2, gy - 1, dw + 4, 2, STONE[0]);
    const lx = o.door > 0.5 ? dx - 6 : dx + dw + 5, ly = dy + 2;
    R(b, lx - 1, ly - 2, 3, 1, IRON[1]); R(b, lx - 2, ly - 1, 5, 7, IRON[2]); R(b, lx - 1, ly, 3, 5, '#e8d8a0'); S(b, lx, ly + 1, '#fff4c8');
    out.lamps.push({ x: lx, y: ly + 2, r: 26 });
    out.doors.push({ x: dx + dw / 2, y: gy, enter: o.enter || null, knock: o.knock || null });
    // the windows (none where the door is)
    for (let f = 0; f < o.floors; f++) {
      const fy = gy - found - (f + 1) * FH, slots = Math.max(1, Math.floor((W - 6) / 26));
      for (let i = 0; i < slots; i++) {
        const cx = X + Math.round(((i + 0.5) * W) / slots);
        if (f === 0 && Math.abs(cx - (dx + dw / 2)) < 20) continue;
        paintWindow(b, rng, cx - 5, fy + 9, 11, 13, shutter, o.flowers || f === 0, out);
      }
    }
    // a shop: a striped awning over the door, a sign hanging from a bracket, a name board
    if (o.awning) {
      const ax = dx - 7, aw = dw + 14, ay = dy - 9;
      for (let y = 0; y < 6; y++) for (let x = 0; x < aw; x++) S(b, ax + x - Math.round((5 - y) * 0.4), ay + y, Math.floor((x + 1) / 4) % 2 ? '#f4ecdc' : o.awning);
      for (let x = 0; x < aw; x += 4) { S(b, ax + x, ay + 6, o.awning); S(b, ax + x + 1, ay + 6, o.awning); }
      R(b, ax - 3, ay - 1, aw + 2, 1, INK);
    }
    if (o.sign) {
      const sx = o.door > 0.5 ? dx - 17 : dx + dw + 10, sy = dy - 14;
      R(b, sx - 7, sy - 3, 15, 1, IRON[1]); R(b, o.door > 0.5 ? sx + 7 : sx - 8, sy - 4, 2, 3, IRON[1]);
      S(b, sx - 4, sy - 2, IRON[0]); S(b, sx + 4, sy - 2, IRON[0]);
      R(b, sx - 7, sy - 1, 15, 12, WOOD[2]); R(b, sx - 7, sy - 1, 15, 1, WOOD[0]); R(b, sx - 7, sy + 10, 15, 1, WOOD[3]);
      ICONS[o.sign].forEach((row, yy) => { for (let xx = 0; xx < row.length; xx++) if (row[xx] === '#') S(b, sx - 3 + xx, sy + 2 + yy, '#ffe08a'); });
    }
    if (o.name) board(b, X + W / 2, o.floors > 1 ? top + FH - 8 : top + 5, o.name, '#3a2a22', '#ffe08a', out);
    // the roof: rows of shingles, lit from the left, overhanging the walls
    const ov = 5, rx0 = X - ov, rw = W + ov * 2, rh = Math.round(rw * 0.37), rtop = top - rh;
    const rl = C.shade(roof, 0.16), rd = C.shade(roof, -0.3), rdd = C.shade(roof, -0.45);
    for (let r = 0; r < rh; r++) {
      const k = r / Math.max(1, rh - 1), y = rtop + r, l = Math.round(U.lerp(rw * 0.3, 0, k)), rr = Math.round(U.lerp(rw * 0.7, rw - 1, k));
      for (let x = l; x <= rr; x++) {
        const row = Math.floor(r / 3), sx = (x + (row % 2) * 3) % 6, left = x < rw * 0.5;
        let col = left ? rl : roof;
        if (r % 3 === 2) col = left ? rd : rdd;
        else if (sx === 0) col = left ? roof : rd;
        S(b, rx0 + x, y, x === l || x === rr ? INK : col);
      }
    }
    R(b, rx0 + Math.round(rw * 0.3), rtop - 1, Math.round(rw * 0.4) + 1, 1, INK);
    R(b, rx0 + Math.round(rw * 0.3) + 1, rtop, Math.round(rw * 0.4) - 1, 1, C.shade(roof, 0.3));
    R(b, rx0, top, rw, 1, INK); R(b, rx0 + 1, top + 1, rw - 2, 1, WOOD[3]);
    // a dormer window in the roof
    if (o.dormer) {
      const ddx = Math.round(X + W / 2), ddy = rtop + Math.round(rh * 0.42);
      R(b, ddx - 9, ddy - 2, 19, 17, INK); R(b, ddx - 8, ddy - 1, 17, 16, wall);
      paintWindow(b, rng, ddx - 4, ddy + 2, 9, 10, shutter, false, out);
      for (let r = 0; r < 7; r++) R(b, ddx - 10 + r, ddy - 3 - r, 21 - r * 2, 1, r === 6 ? INK : r % 2 ? rd : roof);
    }
    // chimneys (smoke comes out of them: drawLive)
    for (const cf of [o.chimney, o.chimney2]) {
      if (cf === undefined) continue;
      const cx = Math.round(rx0 + rw * cf), ctop = rtop - 7, cbot = rtop + Math.round(rh * 0.55);
      for (let y = ctop; y < cbot; y++) for (let x = cx - 3; x < cx + 4; x++) {
        const mortar = (y - ctop) % 3 === 0 || (x + Math.floor((y - ctop) / 3) % 2 * 2) % 4 === 0;
        S(b, x, y, x === cx - 3 ? STONE[0] : mortar ? STONE[3] : x > cx + 1 ? STONE[2] : STONE[1]);
      }
      R(b, cx - 4, ctop - 2, 9, 2, STONE[2]); R(b, cx - 4, ctop - 2, 9, 1, STONE[0]);
      out.chimneys.push({ x: cx, y: ctop - 3 });
    }
  }

  /** The red barn: plank walls, white trim, big X-braced doors, a hay loft, a gambrel roof and a rooster weathervane. */
  function paintBarn(b, rng, X, gy, W, out) {
    const wallH = 54, top = gy - wallH, RED = ['#c8483a', '#a83a30', '#86302a'];
    for (let y = top; y < gy + 3; y++) for (let x = X; x < X + W; x++) {
      const k = (x - X) % 6;
      S(b, x, y, k === 0 ? RED[2] : k === 1 ? RED[0] : y > gy - 8 && bayer(x, y) < 0.4 ? RED[2] : RED[1]);
    }
    for (const tx of [X, X + W - 3]) R(b, tx, top, 3, wallH, '#f0ece4');
    R(b, X, top, W, 3, '#f0ece4');
    // the big doors
    const dw = 34, dh = 36, dx = Math.round(X + W / 2 - dw / 2), dy = gy - dh;
    R(b, dx - 2, dy - 2, dw + 4, dh + 2, '#f0ece4');
    for (const hx of [dx, dx + dw / 2]) {
      R(b, hx, dy, dw / 2, dh, RED[1]);
      for (let x = hx; x < hx + dw / 2; x += 4) R(b, x, dy, 1, dh, RED[2]);
      R(b, hx, dy, dw / 2, 2, '#f0ece4'); R(b, hx, dy + dh - 2, dw / 2, 2, '#f0ece4'); R(b, hx, dy, 2, dh, '#f0ece4'); R(b, hx + dw / 2 - 2, dy, 2, dh, '#f0ece4');
      L(b, hx + 1, dy + 1, hx + dw / 2 - 2, dy + dh - 2, '#f0ece4'); L(b, hx + dw / 2 - 2, dy + 1, hx + 1, dy + dh - 2, '#f0ece4');
    }
    R(b, dx + dw / 2 - 1, dy, 1, dh, INK);
    // the hay loft
    const hx = Math.round(X + W / 2 - 8), hy = top + 5;
    R(b, hx - 2, hy - 2, 20, 14, '#f0ece4'); R(b, hx, hy, 16, 10, '#2a1a16');
    for (let i = 0; i < 16; i++) { const h = 2 + Math.round(Math.abs(Math.sin(i * 1.7)) * 3); R(b, hx + i, hy + 10 - h, 1, h, i % 3 ? '#e8c050' : '#c8a040'); }
    for (let i = 0; i < 5; i++) L(b, hx + 2 + i * 3, hy + 9, hx + 4 + i * 3 + (i % 2 ? 2 : -2), hy + 13, '#e8c050');
    // the gambrel roof: steep at the bottom, shallow at the top
    const ov = 6, ry = top, low = 14, high = 12, rw = W + ov * 2, rx = X - ov;
    for (let r = 0; r < low + high; r++) {
      const inset = r < low ? r * 0.55 : low * 0.55 + (r - low) * 2.1;
      const l = Math.round(inset), rr = Math.round(rw - 1 - inset), y = ry - r - 1;
      for (let x = l; x <= rr; x++) S(b, rx + x, y, x === l || x === rr ? INK : (r % 3 === 2) ? '#4a3a36' : x < rw / 2 ? '#7a5e52' : '#6a4e44');
    }
    const peakY = ry - low - high - 1, mx = Math.round(X + W / 2);
    R(b, rx, ry - 1, rw, 1, INK);
    // the weathervane: a little rooster on a pole
    R(b, mx, peakY - 12, 1, 12, IRON[1]); R(b, mx - 3, peakY - 7, 7, 1, IRON[1]);
    [[0, -16, 4, 2], [3, -18, 2, 2], [-2, -17, 2, 3], [4, -17, 1, 1], [-3, -18, 1, 3]].forEach(([ox, oy, w, h]) => R(b, mx + ox, peakY + oy, w, h, '#2a2430'));
    // hay bales stacked beside it
    for (const [hbx, hby] of [[X + W + 4, gy], [X + W + 19, gy], [X + W + 11, gy - 9]]) {
      R(b, hbx, hby - 9, 14, 9, '#e0b850'); R(b, hbx, hby - 9, 14, 1, '#f4d470');
      for (let i = 0; i < 14; i += 3) R(b, hbx + i, hby - 8, 1, 8, '#c89a3a');
      R(b, hbx + 4, hby - 9, 1, 9, '#8a6a2a'); R(b, hbx + 10, hby - 9, 1, 9, '#8a6a2a');
    }
    out.weathervane = { x: mx, y: peakY - 17 };
  }

  /** The smithy: an open workshop, a stone back wall, the forge (it glows: drawLive), a tall chimney, tools, the anvil. */
  function paintSmithy(b, rng, X, gy, W, out) {
    const top = gy - 46;
    for (let y = top; y < gy + 3; y++) {
      const r = Math.floor((y - top) / 4), ry = (y - top) % 4;
      for (let x = X + 2; x < X + W - 2; x++) S(b, x, y, (x + (r % 2) * 4) % 8 === 0 || ry === 3 ? STONE[3] : ry === 0 ? STONE[1] : STONE[2]);
    }
    // the forge: a stone hearth with a mouth of coals (the glow is drawn live), and its chimney up through the roof
    const fx = X + 10, fw = 26, fy = gy - 20;
    R(b, fx, fy, fw, 20, STONE[0]); R(b, fx, fy, fw, 2, STONE[1]); R(b, fx + 1, fy + 2, fw - 2, 18, STONE[1]);
    R(b, fx + 5, fy + 6, fw - 10, 9, '#1a0e0e');
    out.forge = { x: fx + fw / 2, y: fy + 12, w: fw - 12 };
    const cx = fx + 8, ctop = top - 30;
    for (let y = ctop; y < fy; y++) for (let x = cx; x < cx + 10; x++) S(b, x, y, (y % 3 === 0 || (x + Math.floor(y / 3) % 2 * 2) % 5 === 0) ? '#6a3a30' : x < cx + 3 ? '#b05a44' : '#94483a');
    R(b, cx - 1, ctop - 2, 12, 2, '#5a3028');
    out.chimneys.push({ x: cx + 5, y: ctop - 3, dark: true });
    // tools on the wall: hammers, tongs, horseshoes
    const tx = X + W - 30;
    for (let i = 0; i < 3; i++) { R(b, tx + i * 7, top + 12, 1, 10, WOOD[2]); R(b, tx + i * 7 - 2, top + 11, 5, 3, IRON[0]); }
    L(b, tx + 22, top + 12, tx + 24, top + 22, IRON[0]); L(b, tx + 25, top + 12, tx + 23, top + 22, IRON[0]);
    for (let i = 0; i < 2; i++) { const hx = X + 8 + i * 8, hy = top + 8; R(b, hx, hy, 5, 1, IRON[0]); R(b, hx, hy, 1, 4, IRON[0]); R(b, hx + 4, hy, 1, 4, IRON[0]); }
    // the roof: planks on two posts
    for (const px of [X, X + W - 3]) { R(b, px, top - 4, 3, gy - top + 6, WOOD[2]); R(b, px, top - 4, 1, gy - top + 6, WOOD[1]); }
    for (let r = 0; r < 7; r++) R(b, X - 5 + Math.round(r * 0.5), top - 4 - r, W + 10 - r, 1, r === 6 ? INK : r % 2 ? WOOD[3] : WOOD[2]);
    R(b, X - 6, top - 3, W + 12, 1, INK);
    // a water barrel
    const bx = X + W - 14;
    R(b, bx, gy - 12, 11, 12, WOOD[2]); R(b, bx, gy - 12, 11, 1, '#4a7ab0'); R(b, bx, gy - 10, 11, 1, IRON[1]); R(b, bx, gy - 4, 11, 1, IRON[1]); R(b, bx + 2, gy - 11, 1, 11, WOOD[1]);
    // the anvil, on its stump, where the smith works
    const ax = X + 52;
    R(b, ax - 3, gy - 6, 8, 6, WOOD[2]); R(b, ax - 3, gy - 6, 8, 1, WOOD[1]);
    R(b, ax - 6, gy - 11, 14, 3, IRON[0]); R(b, ax - 8, gy - 11, 3, 2, IRON[0]); R(b, ax - 3, gy - 8, 8, 2, IRON[1]); R(b, ax - 6, gy - 11, 14, 1, '#8a8a9a');
    out.anvil = { x: ax, y: gy - 11 };
  }

  /** The well: a ring of stones, two posts, a little roof, a crank and a bucket on a rope. */
  function paintWell(b, X, gy) {
    for (let y = gy - 16; y < gy + 2; y++) {
      const r = Math.floor((y - gy + 16) / 4), ry = (y - gy + 16) % 4;
      for (let x = X - 16; x <= X + 16; x++) S(b, x, y, (x + (r % 2) * 3) % 6 === 0 || ry === 3 ? STONE[3] : ry === 0 ? STONE[0] : x > X + 8 ? STONE[2] : STONE[1]);
    }
    R(b, X - 17, gy - 17, 35, 2, STONE[0]); R(b, X - 14, gy - 18, 29, 1, '#2a3a5a');
    for (const px of [X - 14, X + 12]) { R(b, px, gy - 44, 3, 28, WOOD[2]); R(b, px, gy - 44, 1, 28, WOOD[1]); }
    R(b, X - 14, gy - 40, 29, 2, WOOD[2]); R(b, X + 15, gy - 41, 2, 6, IRON[1]); R(b, X + 17, gy - 37, 3, 2, IRON[1]);
    R(b, X - 1, gy - 38, 1, 12, '#c8b08a');
    R(b, X - 4, gy - 27, 7, 6, WOOD[2]); R(b, X - 4, gy - 27, 7, 1, IRON[1]); R(b, X - 4, gy - 23, 7, 1, IRON[1]);
    for (let r = 0; r < 9; r++) R(b, X - 20 + r, gy - 45 - r, 41 - r * 2, 1, r === 8 ? INK : r % 3 === 2 ? '#86302a' : r % 2 ? '#a83a30' : '#c8483a');
  }

  /** A market stall: two posts, a counter piled with produce, a striped awning. */
  function paintStall(b, rng, X, gy, w, stripe, goods) {
    for (const px of [X, X + w - 2]) R(b, px, gy - 36, 2, 36, WOOD[2]);
    R(b, X - 1, gy - 15, w + 2, 4, WOOD[1]); R(b, X - 1, gy - 15, w + 2, 1, WOOD[0]);
    for (let x = X; x < X + w; x++) R(b, x, gy - 11, 1, 11, Math.floor((x - X) / 3) % 2 ? stripe : '#f4ecdc');
    // the goods
    for (let i = 0; i < 4; i++) {
      const gx = X + 4 + i * Math.round((w - 8) / 4), kind = goods[i % goods.length];
      R(b, gx - 1, gy - 19, 9, 4, WOOD[2]);
      for (let j = 0; j < 5; j++) {
        const px = gx + (j % 3) * 3, py = gy - 20 - Math.floor(j / 3) * 2;
        if (kind === 'apples') { disc(b, px, py, 1.4, j % 2 ? '#d83a3a' : '#e85a4a'); S(b, px, py - 1, '#ff9a8a'); }
        else if (kind === 'oranges') { disc(b, px, py, 1.4, '#f08a2a'); S(b, px, py - 1, '#ffc070'); }
        else if (kind === 'cabbage') { disc(b, px, py, 1.6, '#5cb844'); S(b, px - 1, py - 1, '#b4f06a'); }
        else if (kind === 'bread') { oval(b, px, py, 2, 1, '#c88a4a'); S(b, px - 1, py - 1, '#e8b070'); }
      }
    }
    // the awning
    for (let y = 0; y < 7; y++) for (let x = -3; x < w + 3; x++) S(b, X + x - Math.round((6 - y) * 0.5), gy - 43 + y, Math.floor((x + 3) / 4) % 2 ? '#f4ecdc' : stripe);
    for (let x = -3; x < w + 3; x += 4) R(b, X + x, gy - 36, 2, 1, stripe);
    R(b, X - 6, gy - 44, w + 9, 1, INK);
  }

  /** An iron lamp post (it lights up at night). */
  function paintLamp(b, X, gy, out) {
    R(b, X - 3, gy - 3, 7, 3, IRON[1]); R(b, X - 1, gy - 38, 2, 36, IRON[1]); R(b, X - 1, gy - 38, 1, 36, IRON[0]);
    R(b, X - 4, gy - 39, 9, 2, IRON[1]);
    R(b, X - 3, gy - 48, 7, 9, IRON[2]); R(b, X - 2, gy - 47, 5, 7, '#e8d8a0'); R(b, X - 1, gy - 46, 3, 4, '#fff4c8');
    R(b, X - 4, gy - 50, 9, 2, IRON[1]); S(b, X, gy - 51, IRON[1]);
    out.lamps.push({ x: X, y: gy - 44, r: 54, post: true });
  }

  /** A picket fence from x0 to x1. */
  function paintFence(b, x0, x1, gy, col) {
    const dark = C.shade(col, -0.3);
    R(b, x0, gy - 8, x1 - x0, 1, dark); R(b, x0, gy - 4, x1 - x0, 1, dark);
    for (let x = x0; x < x1; x += 5) { R(b, x, gy - 10, 2, 10, col); S(b, x, gy - 11, col); S(b, x + 1, gy - 10, dark); R(b, x + 1, gy - 9, 1, 9, dark); }
  }

  /** The notice board in the square: two posts, a little roof, papers pinned all over it. */
  function paintNotice(b, X, gy) {
    for (const px of [X - 12, X + 10]) R(b, px, gy - 30, 3, 30, WOOD[2]);
    R(b, X - 13, gy - 29, 27, 17, WOOD[3]); R(b, X - 12, gy - 28, 25, 15, WOOD[1]);
    for (const [px, py, w, h] of [[-10, -26, 7, 8], [-1, -27, 6, 6], [6, -25, 6, 9], [-2, -20, 7, 6]]) {
      R(b, X + px, gy + py, w, h, '#f4f0e0'); for (let i = 1; i < h - 1; i += 2) R(b, X + px + 1, gy + py + i, w - 2, 1, '#9a948a'); S(b, X + px + Math.floor(w / 2), gy + py, '#d83a3a');
    }
    for (let r = 0; r < 5; r++) R(b, X - 16 + r, gy - 31 - r, 33 - r * 2, 1, r === 4 ? INK : r % 2 ? '#7a4a36' : '#9a5a42');
  }

  /** A wooden bench. */
  function paintBench(b, X, gy) {
    R(b, X - 10, gy - 7, 21, 2, WOOD[1]); R(b, X - 10, gy - 7, 21, 1, WOOD[0]);
    R(b, X - 10, gy - 13, 21, 2, WOOD[1]); R(b, X - 9, gy - 13, 1, 6, WOOD[2]); R(b, X + 9, gy - 13, 1, 6, WOOD[2]);
    for (const lx of [X - 9, X + 8]) R(b, lx, gy - 5, 2, 5, WOOD[3]);
  }

  /** A barrel / a crate. */
  function paintBarrel(b, X, gy) { R(b, X - 5, gy - 13, 11, 13, WOOD[2]); R(b, X - 4, gy - 13, 2, 13, WOOD[1]); for (const y of [gy - 11, gy - 4]) R(b, X - 5, y, 11, 1, IRON[1]); R(b, X - 5, gy - 13, 11, 1, WOOD[3]); }
  function paintCrate(b, X, gy, s) { s = s || 10; R(b, X, gy - s, s, s, WOOD[1]); R(b, X, gy - s, s, 1, WOOD[0]); R(b, X, gy - 1, s, 1, WOOD[3]); L(b, X + 1, gy - 2, X + s - 2, gy - s + 1, WOOD[2]); R(b, X, gy - s, 1, s, WOOD[2]); R(b, X + s - 1, gy - s, 1, s, WOOD[3]); }

  /** The scarecrow, keeping an eye on the cabbages. */
  function paintScarecrow(b, X, gy) {
    R(b, X, gy - 34, 2, 34, WOOD[2]); R(b, X - 10, gy - 26, 22, 2, WOOD[2]);
    R(b, X - 5, gy - 27, 12, 11, '#4a6ab4'); R(b, X - 4, gy - 22, 3, 3, '#c8902a'); R(b, X + 3, gy - 25, 2, 2, '#b8483a');
    for (const sx of [-11, 12]) for (let i = 0; i < 3; i++) S(b, X + sx + (sx < 0 ? -i % 2 : i % 2), gy - 26 + i, '#e8c050');
    disc(b, X + 1, gy - 32, 4, '#d8b880'); S(b, X - 1, gy - 33, INK); S(b, X + 2, gy - 33, INK); R(b, X - 1, gy - 30, 4, 1, '#6a4a2a');
    R(b, X - 6, gy - 36, 15, 1, '#c8a040'); R(b, X - 3, gy - 39, 9, 3, '#e8c86a'); R(b, X - 3, gy - 37, 9, 1, '#c84a3a');
  }

  /** Cones, barriers, a dug-up road, a mound with a shovel in it, a site hut. (Not finished. Obviously.) */
  function paintConstruction(b, rng, X, gy, X1, out) {
    const barrier = (x) => { for (const lx of [x + 2, x + 20]) R(b, lx, gy - 14, 2, 14, '#f0ece4'); for (let xx = 0; xx < 24; xx++) for (let yy = 0; yy < 5; yy++) S(b, x + xx, gy - 15 + yy, Math.floor((xx + yy) / 3) % 2 ? '#f0ece4' : '#d83a2a'); R(b, x, gy - 16, 24, 1, INK); };
    const cone = (x) => { for (let yy = 0; yy < 11; yy++) { const hw = Math.round(yy * 0.4); R(b, x - hw, gy - 12 + yy, hw * 2 + 1, 1, yy === 4 || yy === 5 ? '#f4f0e8' : '#f07a2a'); } R(b, x - 5, gy - 2, 11, 2, '#c85a1a'); };
    // the gate: two posts and a crossbeam with the village's name on it
    for (const px of [X - 1, X + 40]) { R(b, px, gy - 52, 4, 54, WOOD[2]); R(b, px, gy - 52, 1, 54, WOOD[1]); }
    R(b, X - 6, gy - 54, 54, 4, WOOD[2]); R(b, X - 6, gy - 54, 54, 1, WOOD[0]);
    board(b, X + 21, gy - 48, 'NORMALTON', '#3a2a22', '#ffe08a', out);
    barrier(X + 50); cone(X + 80); cone(X + 88); barrier(X + 104);
    // a mound of dirt with a shovel stuck in it, a wheelbarrow, another cone
    const mx = X + 146;
    for (let yy = 0; yy < 12; yy++) { const hw = Math.round(Math.sqrt(1 - (yy / 12) ** 2) * 16); R(b, mx - hw, gy - yy, hw * 2, 1, yy > 9 ? SOIL[1] : yy > 5 ? SOIL[2] : SOIL[3]); }
    L(b, mx + 4, gy - 10, mx + 10, gy - 26, WOOD[2]); R(b, mx + 2, gy - 12, 5, 4, IRON[0]); R(b, mx + 9, gy - 28, 4, 1, WOOD[3]);
    const wx = X + 120; R(b, wx, gy - 10, 16, 6, '#5a8ab0'); R(b, wx, gy - 10, 16, 1, '#8ab4d4'); disc(b, wx + 3, gy - 3, 2.4, IRON[2]); L(b, wx + 15, gy - 9, wx + 22, gy - 6, WOOD[2]); L(b, wx + 12, gy - 4, wx + 12, gy - 1, IRON[1]);
    cone(X + 168);
    // the site hut
    const hx = X1 - 66;
    R(b, hx, gy - 34, 42, 34, '#d8b840'); for (let x = hx; x < hx + 42; x += 5) R(b, x, gy - 34, 1, 34, '#b89a30');
    R(b, hx - 2, gy - 37, 46, 3, '#6a6a7a'); R(b, hx + 5, gy - 22, 10, 22, WOOD[3]); R(b, hx + 24, gy - 22, 12, 8, '#2a3a5a'); R(b, hx + 24, gy - 22, 12, 1, '#8ab4d4');
    board(b, hx + 21, gy - 33, 'SITE', '#3a3a44', '#ffd34d', out);
    // ...and a portable toilet, because of course
    const tx = X1 - 18;
    R(b, tx, gy - 30, 14, 30, '#3a7ac8'); R(b, tx - 1, gy - 32, 16, 3, '#2a5a9a'); R(b, tx + 3, gy - 26, 8, 24, '#2a5a9a'); S(b, tx + 7, gy - 23, '#ffd34d'); S(b, tx + 8, gy - 22, '#ffd34d');
  }

  // ================================================================ the level
  class VillageLevel extends W1 {
    configure() {
      this.W = MAP.W;
      this.H = 30;
      this.pal = { rock: CLIFF, moss: ['#7ae05a', '#4ea840'], metal: ['#a8b0c0', '#848ca0', '#5e6478', '#3e4254'], wood: WOOD, outline: INK, back: ['#2a6ad8', '#4f9cee', '#b4e2ff', '#ffffff'], decor: STONE };
      this.sections = [];
      this.id = 'village';
    }

    build() {
      this.tiles.fill(AIR);
      this.surfRow = MAP.surf;
      for (let x = 0; x < this.W; x++) for (let y = this.surfRow; y < this.H; y++) this.setTile(x, y, ROCK);
      this.solid(MAP.east, this.W, 0, this.H);
      this.interactFirst = true;         // (its doors come before whoever's walking past them: game-screen.js)
      this.westX = Math.round(1.5 * TS);  // walk on past here (over the rubble), and you're back in World 1, by the old cave
      this.floorY = this.surfRow * TS;
      this.landX = MAP.land * TS + 8;
      this.spawn = { x: MAP.spawn * TS, y: this.floorY };
      this.checkpoints = [this.spawn];
      this.fallHeight = 3600;            // (World 1's own: the backdrop's clouds are laid out for it)
      this.cloudAlt = 1750;
      this.slimeX = MAP.slime * TS;
      this.checkshotX = Math.round(MAP.checkshot * TS);   // (a Checkshot: switch it on, and you can recall to the void from here, and come back)
      this.gateX = MAP.gate * TS;
      this.squareX = MAP.square.map((t) => t * TS);
      this.caveX = this.pw;              // (World 1's bits that look for these: nothing out here)
      this.fogStart = this.fogFull = 1e9;
      this.wispMarks = []; this.saidFog = true;
      this.decor = [];
      this.lights = [];
      this.torches = [];
      this.braziers = [];
      this.chalk = [];
      this.signs = [
        { x: 26 * TS, y: this.floorY, text: 'NORMALTON\nPopulation: 31.\nA perfectly normal village.\n(Please do not fall on it.)', read: false },
        { x: 5.4 * TS, y: this.floorY, text: '<-  THE MEADOW\nOver the rocks, through the fog.\n(There used to be a cave there.)', read: false },
        { x: 53.5 * TS, y: this.floorY, custom: true, text: 'NORMALTON NOTICE BOARD\n- LOST: one goose. Answers to "Gerald".\n- Bake sale Sunday. Bring buns.\n- New road east: OPENING SOON.\n- Please stop falling out of the sky.\n   - the Mayor', read: false },
        { x: 109.6 * TS, y: this.floorY, custom: true, text: 'ROAD CLOSED\nUnder construction.\nNo entry. No exceptions.\nNo, not even you.\n   - Management', read: false },
      ];
      this.folk = FOLK.map((f) => ({ id: f.id, x: f.x * TS, y: this.floorY, facing: f.facing, mode: f.mode, range: f.range ? f.range.map((t) => t * TS) : null, speed: f.speed || 0 }));
      this.npcs = this.folk.map((f) => Object.assign({}, f, { update: folkUpdate, draw: folkDraw }));
      this.npcs.push({ id: 'slime', name: 'GRUMPY SLIME', x: this.slimeX, y: this.floorY, facing: -1, hidden: true });
      this.enemySpawns = [];
      this.dark = 0;
      this.crater = null;
      this.grass = null;
      this.critters = [];
      this.marks = { windows: [], chimneys: [], lamps: [], doors: [], texts: [] };   // filled by renderBackWall
    }

    /**
     * From what you've done: the east gate's open if the mayor's had it opened. (Not World 1's prepare: no rubble here.)
     * The doors hang between the gate's posts (paintConstruction): x0..x1.
     */
    prepare(g) {
      const pr = (g.character && g.character.progress) || {};
      const X = this.gateX, open = !!(pr.gatesOpen || pr.mayorTalk);   // (the mayor's word is enough, even if you left before it swung open)
      this.gate = { x0: X + 3, x1: X + 40, open: open ? 1 : 0, bar: open ? 1 : 0, state: open ? 'open' : 'shut', t: 0 };
    }
    /** The mayor's word: the bar lifts, and the east gate swings open (it stays open from then on). */
    openGate() {
      const G = this.gate;
      if (!G || G.state !== 'shut') return;
      G.state = 'unbar'; G.t = 0;
      sfx('gateClang');
    }

    /** No fog in Normalton. (Just a perfectly normal amount of air.) */
    fogAt() { return 0; }
    /** You've just come down out of the sky (js/game/world-fall.js): that leaves a mark. */
    onLand(g, x) { this.crater = { x }; }

    /** What the ground is like at x: the farm's grass, the street, the cobbled square, the dug-up road past the gate. */
    zoneAt(x) {
      const t = x / TS;
      if (t < MAP.west) return 'rubble';
      if (t < MAP.farm || t >= MAP.east - 1) return 'grass';
      if (t >= MAP.square[0] && t < MAP.square[1]) return 'cobble';
      if (t >= MAP.gate + 2.5) return 'dug';
      return 'road';
    }

    /** The ground: grass and soil, the street's packed dirt, the square's cobbles, the dug-up road; cliffs at either end. */
    renderTiles() {
      const W = this.pw, H = this.ph, b = new PB(W, H), n = new U.Noise(0x7a11);
      const top = this.floorY, X0 = 0, X1 = MAP.east * TS;
      const soilAt = (x, y, d) => {
        const k = U.clamp((d - 7) / 40, 0, 0.999), band = Math.floor(k * (SOIL.length - 1) + bayer(x, y) * 0.9);
        let col = SOIL[Math.min(SOIL.length - 1, band)];
        const stone = n.n2(x * 0.22, y * 0.3);
        if (stone > 0.86) col = stone > 0.9 ? '#a8988a' : '#8a7a6c';
        else if (n.n2(x * 0.5, y * 0.05) > 0.88 && d < 22) col = '#5a3a22';
        return col;
      };
      for (let x = X0; x < X1; x++) {
        const zone = this.zoneAt(x), lip = zone === 'grass' ? Math.round((n.n1(x * 0.21) - 0.5) * 2) : 0;
        for (let y = top + lip; y < H; y++) {
          const d = y - top - lip;
          let col;
          if (zone === 'rubble' && d < 6 && n.n2(x * 0.16, y * 0.34) > 0.12 + (x / (MAP.west * TS)) * 0.3) { const v = n.n2(x * 0.45, y * 0.45); col = v > 0.66 ? CLIFF[0] : v > 0.4 ? CLIFF[1] : CLIFF[2]; }
          else if (zone === 'grass' || zone === 'rubble') col = d === 0 ? GRASS[0] : d < 3 ? GRASS[1] : d < 5 ? (bayer(x, y) < 0.6 ? GRASS[2] : GRASS[1]) : d < 7 ? (bayer(x, y) < 0.5 ? GRASS[3] : SOIL[0]) : soilAt(x, y, d);
          else if (zone === 'road') {
            col = d === 0 ? ROAD[0] : d < 3 ? ROAD[1] : d < 5 ? (bayer(x, y) < 0.55 ? ROAD[2] : ROAD[1]) : d < 7 ? (bayer(x, y) < 0.5 ? ROAD[3] : SOIL[0]) : soilAt(x, y, d);
            if (d > 0 && d < 5 && n.n2(x * 0.9, y * 0.9) > 0.78) col = n.n2(x * 1.3, y) > 0.5 ? '#e8d8b8' : '#8a7458';   // pebbles
          } else if (zone === 'cobble') {
            if (d < 8) {
              const row = Math.floor(d / 4), ry = d % 4, off = (row % 2) * 4, sx = (x + off) % 8, id = Math.floor((x + off) / 8) * 7 + row;
              col = ry === 3 || sx === 0 ? COBBLE[4] : ry === 0 || sx === 1 ? COBBLE[0] : ry === 2 && sx >= 6 ? COBBLE[3] : (id * 2654435761 >>> 0) % 3 === 0 ? COBBLE[2] : COBBLE[1];
            } else col = d < 10 ? (bayer(x, y) < 0.5 ? COBBLE[3] : SOIL[0]) : soilAt(x, y, d);
          } else {
            col = d < 2 ? (n.n2(x * 0.4, y * 0.6) > 0.5 ? SOIL[1] : SOIL[2]) : d < 6 ? (bayer(x, y) < 0.5 ? SOIL[2] : SOIL[3]) : soilAt(x, y, d);
          }
          b.data[y * W + x] = K(col);
        }
        // grass tufts poking up (in the grass, and at the edges of the street)
        const r = n.n1(x * 1.7 + 5);
        if (zone === 'grass' || zone === 'rubble') { if (r > 0.42) S(b, x, top + lip - 1, r > 0.7 ? GRASS[0] : GRASS[1]); if (r > 0.66) S(b, x, top + lip - 2, GRASS[0]); }
        else if (zone === 'dug' && r > 0.6) S(b, x, top - 1, SOIL[1]);
      }
      // the cliffs at either end: grey rock, mossy on top
      for (const [from, to, face] of [[X1, W, X1]]) {
        for (let x = from; x < to; x++) {
          const u = Math.abs(x - face), ctop = Math.round(top - (124 + 46 * (1 - Math.exp(-u / 30))) + (n.n1(x * 0.07 + 3) - 0.5) * 14);
          for (let y = Math.max(0, ctop); y < H; y++) {
            const dd = y - ctop, tex = n.n2(x * 0.09, y * 0.11);
            let i = u < 2 ? 1 : u < 6 ? 2 : 3;
            if (tex > 0.62) i -= 1; else if (tex < 0.32) i += 1;
            if (Math.sin(y * 0.35 + n.n1(x * 0.05) * 3) > 0.86) i += 1;
            b.data[y * W + x] = K(dd === 0 ? '#86d84e' : dd < 3 ? '#5cb844' : dd < 5 ? '#3e8a3c' : CLIFF[U.clamp(i, 0, 5)]);
          }
          if (ctop - 1 >= 0) b.data[(ctop - 1) * W + x] = K(INK);
        }
        for (let y = 0; y < top; y++) if (b.solid(face, y)) S(b, face - 1, y, INK);
      }
      // the crater-to-be? No: that's drawn live (it's not there until you make it)
      return b.toCanvas();
    }

    /** Behind the street: hedges and trees, the buildings, and everything in the square. */
    renderBackWall() {
      const W = this.pw, H = this.ph, b = new PB(W, H), rng = new U.RNG(0x40ad), gy = this.floorY, out = this.marks;
      out.windows.length = 0; out.chimneys.length = 0; out.lamps.length = 0; out.doors.length = 0; out.texts.length = 0;
      const T = (t) => Math.round(t * TS);
      // ---- far back: a soft row of trees and hedges right behind the village
      for (let x = T(MAP.west + 1); x < T(MAP.east - 1); x += rng.int(12, 22)) {
        const tr = rng.next() < 0.7 ? P.roundTree(rng, rng.int(7, 11), TREE_BACK) : P.pineTree(rng, rng.int(18, 28), PINE_BACK);
        blit(b, tr, x, gy - 2);
      }
      for (let x = T(MAP.west + 1); x < T(MAP.east - 1); x += 3) { const h = 6 + Math.round(Math.abs(Math.sin(x * 0.05)) * 4 + Math.sin(x * 0.31) * 1.5); R(b, x, gy - h, 3, h + 2, x % 6 ? '#3a7a46' : '#2e6a3c'); S(b, x + 1, gy - h, '#5a9a56'); }
      // ---- the west end: the other side of the old cave's cliff, come down in a heap (World 1's over it)
      const heap = [];
      for (let i = 0; i < 60; i++) {
        const u = rng.next(), x = u * T(MAP.west + 1.5), peak = 110 - u * 96, r = rng.int(5, 15);
        heap.push({ x, y: gy - rng.range(0, Math.max(0, peak - r)), r, mossy: rng.next() < 0.4 });
      }
      heap.sort((a, c) => a.y - c.y);
      for (const k of heap) { oval(b, k.x, k.y, k.r, Math.round(k.r * 0.75), CLIFF[3]); oval(b, k.x - 1, k.y - 1, k.r - 1, Math.round(k.r * 0.75) - 1, CLIFF[1]); oval(b, k.x - k.r * 0.3, k.y - k.r * 0.35, Math.round(k.r * 0.4), Math.round(k.r * 0.25), k.mossy ? '#7ab85a' : CLIFF[0]); }
      // ---- the farm: a field of cabbages and wheat behind a fence, the scarecrow, the barn
      for (const B of BUILD) {
        const X = T(B.x), Wd = T(B.w);
        if (B.kind === 'barn') paintBarn(b, rng, X, gy, Wd, out);
        else if (B.kind === 'smithy') paintSmithy(b, rng, X, gy, Wd, out);
        else paintHouse(b, rng, X, gy, Wd, B, out);
      }
      const f0 = T(15.5), f1 = T(21);
      for (let x = f0 + 4; x < f1 - 4; x += 7) { disc(b, x, gy - 4, 3.2, '#3e9a3c'); disc(b, x - 1, gy - 5, 2, '#86d84e'); S(b, x - 1, gy - 6, '#b4f06a'); }
      for (let x = f0 + 2; x < f1 - 2; x += 3) { const h = 12 + (x % 5); R(b, x, gy - h, 1, h - 4, '#c8a040'); R(b, x - 1, gy - h - 2, 2, 3, '#e8c86a'); }
      paintScarecrow(b, T(19.3), gy - 2);
      paintFence(b, T(15), T(22), gy, '#f0ece4');
      paintFence(b, T(4.5), T(6.3), gy, '#f0ece4');
      // ---- the market: two stalls between the bakery and the store, barrels and crates
      paintStall(b, rng, T(43.2), gy, 26, '#d8a020', ['apples', 'oranges', 'apples', 'cabbage']);
      paintBarrel(b, T(35.3), gy); paintCrate(b, T(51.1), gy, 10); paintCrate(b, T(51.4), gy - 10, 8);
      // ---- the square: the notice board, lamps, the well, flower beds, the great oak and its bench
      paintNotice(b, T(53.5), gy);
      paintLamp(b, T(55.5), gy, out); paintLamp(b, T(70.5), gy, out); paintLamp(b, T(77.2), gy, out); paintLamp(b, T(33.5), gy, out); paintLamp(b, T(97.7), gy, out);
      paintWell(b, T(58.3), gy);
      for (const fx of [T(62)]) { R(b, fx - 12, gy - 4, 25, 4, STONE[1]); R(b, fx - 12, gy - 4, 25, 1, STONE[0]); for (let i = 0; i < 18; i++) { const px = fx - 10 + rng.int(0, 20), py = gy - 5 - rng.int(0, 3); S(b, px, py + 1, '#3e9a3c'); S(b, px, py, rng.pick(FLOWERS)); } }
      blit(b, P.roundTree(rng, 27, TREE), T(73.2), gy + 1);
      paintBench(b, T(74.6), gy);
      // ---- by the inn: barrels; past the smithy: more crates
      paintBarrel(b, T(78.4), gy); paintBarrel(b, T(88.5), gy); paintCrate(b, T(97.2), gy, 9);
      paintFence(b, T(110.4), T(112.4), gy, '#c8a878');
      // ---- the east gate, and the road out: dug up, fenced off, coned. Under construction.
      paintConstruction(b, rng, T(MAP.gate), gy, T(MAP.east), out);
      // ---- the custom signs: a ROAD CLOSED board on legs
      const rs = T(109.6);
      for (const lx of [rs - 12, rs + 11]) R(b, lx, gy - 14, 2, 14, WOOD[2]);
      const rb = board(b, rs, gy - 25, 'CLOSED', '#d83a2a', '#ffffff', out);
      R(b, rb.x - 2, gy - 27, rb.w + 4, 1, '#f0ece4'); R(b, rb.x - 2, gy - 15, rb.w + 4, 1, '#f0ece4');
      b.outline(K(INK));
      const cv = b.toCanvas(), ctx = cv.getContext('2d');
      // the names on the signs and boards
      if (ERX.Font && ERX.Font.draw) for (const t of out.texts) ERX.Font.draw(ctx, t.text, Math.round(t.x), Math.round(t.y), { color: t.color, align: 'center' });
      return cv;
    }

    /** In front of you: grass tufts along the bottom (where there's grass) and flowers. */
    renderFront() {
      const W = this.pw, H = this.ph, b = new PB(W, H), rng = new U.RNG(0xf10e), gy = this.floorY + 2;
      for (let x = Math.round(0.6 * TS); x < MAP.west * TS; x += rng.int(18, 30)) { const r = rng.int(2, 4); b.ellipse(x, gy - r + 1, r + 1, r, K(CLIFF[3])); b.ellipse(x - 1, gy - r, r, r - 1, K(CLIFF[1])); }
      for (let x = MAP.west * TS + 4; x < MAP.east * TS - 4; x += rng.int(8, 22)) {
        const z = this.zoneAt(x);
        if (z !== 'grass' && rng.next() < 0.8) continue;
        const h = rng.int(3, 7);
        for (let i = 0; i < h + 3; i++) { const bx = x + rng.int(-3, 3), bh = rng.int(2, h); for (let yy = 0; yy < bh; yy++) S(b, bx + Math.round((yy / bh) * rng.range(-1, 1)), gy - yy, yy > bh - 2 ? GRASS[0] : GRASS[2]); }
        if (z === 'grass' && rng.next() < 0.4) S(b, x + rng.int(-2, 2), gy - h, rng.pick(FLOWERS));
      }
      return b.toCanvas();
    }

    // ---------------------------------------------------------- live bits
    buildLife() {
      const rng = new U.RNG(0x11fa), gy = this.floorY;
      this.grass = new P.Grass();
      for (let x = MAP.west * TS + 2; x < MAP.east * TS - 2; x += rng.int(1, 3)) {
        if (this.zoneAt(x) !== 'grass') { if (rng.next() < 0.93) continue; }
        this.grass.add(x, gy - 1, rng.int(2, 6), rng.pick(['#86d84e', '#5cb844', '#b4f06a', '#3e9a3c']), rng.range(0, 6));
      }
      const T = (t) => t * TS;
      // butterflies over the flowers, fireflies at night, the odd leaf off the oak
      for (let i = 0; i < 12; i++) this.critters.push({ kind: 'fly', x: rng.range(T(6), T(110)), y: gy - rng.range(10, 60), ph: rng.range(0, 6), c: rng.pick(['#ffd34d', '#ff8ad8', '#8ad8ff', '#ffffff']), vx: rng.range(-12, 12), x0: T(6), x1: T(110) });
      for (let i = 0; i < 36; i++) this.critters.push({ kind: 'glow', x: rng.range(T(5), T(112)), y: gy - rng.range(6, 80), ph: rng.range(0, 6) });
      for (let i = 0; i < 6; i++) this.critters.push({ kind: 'leaf', x: T(73.2) + rng.range(-30, 30), y: gy - rng.range(20, 90), ph: rng.range(0, 6), c: rng.pick(['#46a043', '#7cd055', '#c8a040']) });
      // chickens (they scatter when you run at them), a dog, a cat asleep on a windowsill
      for (const [x, lo, hi] of [[T(9), T(5), T(15)], [T(12), T(6), T(15)], [T(17.5), T(15.5), T(22)], [T(57), T(53), T(64)], [T(66), T(60), T(71)]]) this.critters.push({ kind: 'chicken', x, y: gy, lo, hi, dir: rng.chance(0.5) ? 1 : -1, ph: rng.range(0, 6), t: rng.range(0, 3), hop: 0, vy: 0, dy: 0 });
      this.critters.push({ kind: 'dog', x: T(87), y: gy, lo: T(79), hi: T(97), dir: 1, ph: 0, t: 0 });
      const sill = this.marks.windows.find((w) => w.x > T(29.5) && w.x < T(35) && w.y < gy - 40);
      if (sill) this.critters.push({ kind: 'cat', x: sill.x + sill.w / 2, y: sill.y + sill.h + 1, ph: 0 });
      this.smoke = [];
      this.smokeT = 0;
    }

    update(dt, g) {
      if (!this.grass) this.buildLife();
      g.worldTod = ((g.worldTod === undefined ? 0.12 : g.worldTod) + dt / W1.DAY) % 1;
      const Lt = lightAt(g.worldTod);
      this.L = Lt;
      this.dark = Math.min(0.5, Lt.night * 0.5 + Lt.dusk * 0.08);
      ERX.World1 = ERX.World1 || {};
      ERX.World1.night = Lt.night;
      const p = g.player;
      // the east gate: shut tight (nobody gets past), or opening (the bar comes up, the doors swing out)
      const G = this.gate;
      if (G) {
        G.t += dt;
        if (G.state === 'unbar') { G.bar = Math.min(1, G.t / 0.8); if (G.t >= 0.9) { G.state = 'opening'; G.t = 0; sfx('gateCreak'); } }
        else if (G.state === 'opening') {
          const k = Math.min(1, G.t / 2.4);
          G.open = k * k * (3 - 2 * k);
          if (k >= 1) { G.state = 'open'; G.open = 1; sfx('gateBoom'); ERX.FX.shake(2, 0.3); g.dust(G.x0 + 2, this.floorY, 8); g.dust(G.x1 - 2, this.floorY, 8); }
        }
        if (G.open < 0.6 && p.x + p.w > G.x0 + 1) { p.x = G.x0 + 1 - p.w; if (p.vx > 0) p.vx = 0; }
      }
      for (const c of this.critters) {
        c.ph += dt;
        if (c.kind === 'fly') { c.x += (c.vx + Math.sin(c.ph * 0.7) * 14) * dt; c.y += Math.sin(c.ph * 2.3) * 12 * dt; if (c.x < c.x0 || c.x > c.x1) c.vx = -c.vx; }
        else if (c.kind === 'glow') { c.x += Math.sin(c.ph * 0.6) * 6 * dt; c.y += Math.cos(c.ph * 0.9) * 5 * dt; }
        else if (c.kind === 'leaf') { c.y += 12 * dt; c.x += Math.sin(c.ph * 1.6) * 14 * dt; if (c.y > this.floorY - 2) { c.y = this.floorY - 96; c.x = 73.2 * TS + (Math.random() - 0.5) * 56; } }
        else if (c.kind === 'chicken' || c.kind === 'dog') {
          c.t -= dt;
          const near = p && Math.abs(p.cx - c.x) < 26 && Math.abs(p.feet - c.y) < 20 && c.kind === 'chicken';
          if (near && !(c.flee > 0)) { c.dir = Math.sign(c.x - p.cx) || 1; c.flee = 0.7; if (c.dy === 0) { c.vy = -70; sfx('chickenCluck', { minGap: 0.4 }); } }
          c.flee = Math.max(0, (c.flee || 0) - dt);
          if (c.t <= 0 && !c.flee) { c.t = U.lerp(1.2, 3.5, Math.random()); c.walk = Math.random() < 0.55; if (Math.random() < 0.5) c.dir = -c.dir; }
          const sp = c.flee ? 60 : c.walk ? (c.kind === 'dog' ? 22 : 12) : 0;
          c.x += c.dir * sp * dt;
          if (c.x < c.lo) { c.x = c.lo; c.dir = 1; } else if (c.x > c.hi) { c.x = c.hi; c.dir = -1; }
          if (c.vy || c.dy < 0) { c.vy += 500 * dt; c.dy = Math.min(0, c.dy + c.vy * dt); if (c.dy === 0) c.vy = 0; }
        }
      }
      // chimney smoke, curling up
      this.smokeT -= dt;
      if (this.smokeT <= 0) {
        this.smokeT = 0.32;
        for (const ch of this.marks.chimneys) this.smoke.push({ x: ch.x + (Math.random() - 0.5) * 2, y: ch.y, t: 0, life: U.lerp(2.4, 3.4, Math.random()), ph: Math.random() * 6, dark: ch.dark });
      }
      for (const s of this.smoke) { s.t += dt; s.y -= 9 * dt; s.x += (4 + Math.sin(s.t * 1.3 + s.ph) * 5) * dt; }
      this.smoke = this.smoke.filter((s) => s.t < s.life);
    }

    /** Grass, critters, chickens, the smoke, the forge's coals, the crater... and the windows lit at night. */
    drawLive(ctx, cam, g) {
      if (!this.grass) return;
      const t = g.t, ox = -cam.ix, oy = -cam.iy, Lt = this.L || lightAt(0.12), vw = cam.vw || g.view.width;
      const wind = (x, tt, ph) => Math.sin(tt * 1.6 + x * 0.05 + ph) * 1.2 + Math.sin(tt * 0.5 + x * 0.01) * 0.8;
      // the windows: dark glass by day, warm and yellow at night
      if (Lt.night > 0.05 || Lt.dusk > 0.4) {
        const a = Math.max(Lt.night, (Lt.dusk - 0.4) * 1.2) * 0.95;
        for (const w of this.marks.windows) {
          const x = w.x + ox, y = w.y + oy;
          if (x < -20 || x > vw + 20) continue;
          ctx.globalAlpha = a; ctx.fillStyle = '#ffc860'; ctx.fillRect(x + 1, y + 1, w.w - 2, w.h - 2);
          ctx.fillStyle = '#fff0b0'; ctx.fillRect(x + 2, y + 2, w.w - 5, w.h - 6);
          ctx.fillStyle = '#c8803a'; ctx.fillRect(x + Math.floor(w.w / 2), y, 1, w.h); ctx.fillRect(x, y + Math.floor(w.h / 2), w.w, 1);
        }
        ctx.globalAlpha = 1;
      }
      // the forge: coals glowing (brighter, then dimmer, as the bellows breathe)
      const fo = this.marks.forge;
      if (fo) {
        const x = fo.x + ox, y = fo.y + oy, k = 0.75 + 0.25 * Math.sin(t * 2.1);
        const gr = ctx.createRadialGradient(x, y, 1, x, y, 22);
        gr.addColorStop(0, C.rgba('#ff8a3a', 0.5 * k)); gr.addColorStop(1, C.rgba('#ff8a3a', 0));
        ctx.fillStyle = gr; ctx.fillRect(x - 22, y - 22, 44, 44);
        for (let i = 0; i < fo.w; i++) { const h = 2 + Math.round((Math.sin(t * 7 + i * 1.3) * 0.5 + 0.5) * 3 * k); ctx.fillStyle = i % 3 ? '#ff7a2a' : '#ffd060'; ctx.fillRect(Math.round(x - fo.w / 2 + i), Math.round(y + 2 - h), 1, h); }
        ctx.fillStyle = '#fff2a0'; ctx.fillRect(Math.round(x - 3), Math.round(y + 1), 6, 1);
      }
      // the crater (where you came down)
      if (this.crater) {
        const x = Math.round(this.crater.x) + ox, y = this.floorY + oy;
        if (x > -40 && x < vw + 40) {
          ctx.fillStyle = '#3a2a22'; ctx.fillRect(x - 20, y - 1, 41, 3); ctx.fillStyle = '#5a4030'; ctx.fillRect(x - 14, y - 2, 29, 1);
          ctx.fillStyle = '#1e1612'; ctx.fillRect(x - 12, y, 25, 2);
          for (const [dx, h] of [[-23, 2], [-19, 3], [18, 3], [22, 2], [-8, 1], [9, 1]]) { ctx.fillStyle = COBBLE[dx < 0 ? 1 : 2]; ctx.fillRect(x + dx, y - h, 3, h); ctx.fillStyle = COBBLE[0]; ctx.fillRect(x + dx, y - h, 3, 1); }
          ctx.fillStyle = '#2a201a'; for (const [dx, dy, l] of [[-26, 0, 6], [21, 1, 7], [-4, 2, 1]]) ctx.fillRect(x + dx, y + dy, l, 1);
        }
      }
      this.grass.render(ctx, t, ox, oy, wind);
      if (this.gate) this._drawGate(ctx, ox, oy, Lt);
      // smoke
      for (const s of this.smoke) {
        const k = s.t / s.life, r = 1 + k * 4, x = s.x + ox, y = s.y + oy;
        if (x < -10 || x > vw + 10) continue;
        ctx.globalAlpha = (1 - k) * (s.dark ? 0.5 : 0.42);
        ctx.fillStyle = s.dark ? '#5a5258' : '#eef0f4';
        ctx.fillRect(Math.round(x - r / 2), Math.round(y - r / 2), Math.round(r), Math.round(r));
      }
      ctx.globalAlpha = 1;
      // critters
      const A = ERX.Actors;
      for (const c of this.critters) {
        const x = Math.round(c.x + ox), y = Math.round(c.y + oy);
        if (x < -12 || x > vw + 12) continue;
        if (c.kind === 'fly' && Lt.night < 0.6) { const f = Math.floor(c.ph * 14) % 2; ctx.globalAlpha = 1 - Lt.night; ctx.fillStyle = c.c; ctx.fillRect(x - 1, y - f, 1, 1); ctx.fillRect(x + 1, y - f, 1, 1); ctx.fillStyle = '#2a1a10'; ctx.fillRect(x, y, 1, 1); ctx.globalAlpha = 1; }
        else if (c.kind === 'glow' && Lt.night > 0.15) { const a = Lt.night * (0.5 + 0.5 * Math.sin(c.ph * 2.2)); ctx.globalAlpha = a * 0.35; ctx.fillStyle = '#d8ff6a'; ctx.fillRect(x - 1, y - 1, 3, 3); ctx.globalAlpha = a; ctx.fillStyle = '#f4ffb0'; ctx.fillRect(x, y, 1, 1); ctx.globalAlpha = 1; }
        else if (c.kind === 'leaf') { ctx.fillStyle = c.c; ctx.fillRect(x, y, 2, 1); ctx.fillRect(x + (Math.sin(c.ph * 3) > 0 ? 1 : 0), y + 1, 1, 1); }
        else if ((c.kind === 'chicken' || c.kind === 'dog') && A) {
          const peck = c.kind === 'chicken' && !c.walk && !c.flee && Math.floor(c.ph * 3) % 2 === 0;
          const fr = A.animal(c.kind)[c.kind === 'dog' ? (c.walk ? Math.floor(c.ph * 6) % 2 : 0) : peck ? 1 : (c.walk || c.flee) && Math.floor(c.ph * 8) % 2 ? 1 : 0];
          const cv = c.dir < 0 ? fr.l : fr.r;
          ctx.drawImage(cv, x - Math.round(cv.width / 2), Math.round(y + (c.dy || 0) - cv.height + 1));
        } else if (c.kind === 'cat' && A) {
          const fr = A.animal('cat')[0];
          ctx.drawImage(fr.r, x - Math.round(fr.r.width / 2), y - fr.r.height);
          if (Math.floor(t * 0.8) % 3 === 0) { ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.7; ctx.fillRect(x + 4, y - fr.r.height - 3 - Math.floor((t * 2) % 3), 2, 1); ctx.globalAlpha = 1; }   // zzz
        }
      }
    }

    /** The east gate's doors: planks and iron bands, swinging out on their hinges (each door narrows to its post). */
    _drawGate(ctx, ox, oy, Lt) {
      const G = this.gate, gy = this.floorY + oy, h = 36, half = (G.x1 - G.x0) / 2;
      const tint = (col) => C.mix(col, '#1a2040', Lt ? Lt.night * 0.55 : 0);
      for (const side of [-1, 1]) {
        const hinge = side < 0 ? G.x0 : G.x1, w = Math.max(2, Math.round(half * Math.cos(G.open * Math.PI * 0.47)));
        const x = Math.round(side < 0 ? hinge + ox : hinge + ox - w);
        ctx.fillStyle = tint('#2a1a12'); ctx.fillRect(x - 1, gy - h - 1, w + 2, h + 1);
        for (let i = 0; i < w; i++) { const k = side < 0 ? i : w - 1 - i; ctx.fillStyle = tint(k % 6 === 0 ? WOOD[3] : k % 6 === 1 ? WOOD[1] : WOOD[2]); ctx.fillRect(x + i, gy - h, 1, h); }
        ctx.fillStyle = tint(IRON[1]); ctx.fillRect(x, gy - h + 7, w, 2); ctx.fillRect(x, gy - 12, w, 2);
        if (w > 6) { ctx.fillStyle = tint(IRON[0]); for (const yy of [gy - h + 7, gy - 12]) ctx.fillRect(side < 0 ? x + 1 : x + w - 3, yy, 2, 2); }
        ctx.fillStyle = tint(WOOD[0]); ctx.fillRect(x, gy - h, w, 1);
      }
      // the bar across them (it lifts first)
      if (G.bar < 1) {
        const by = gy - 22 - Math.round(G.bar * 12);
        ctx.fillStyle = tint('#2a1a12'); ctx.fillRect(G.x0 + ox - 3, by - 1, G.x1 - G.x0 + 6, 5);
        ctx.fillStyle = tint(WOOD[1]); ctx.fillRect(G.x0 + ox - 2, by, G.x1 - G.x0 + 4, 3);
        ctx.fillStyle = tint(WOOD[0]); ctx.fillRect(G.x0 + ox - 2, by, G.x1 - G.x0 + 4, 1);
      }
    }

    /** Front doors: in you go (the inn, the goods store, the armory), or knock and see who answers. */
    interact(g) {
      const p = g.player;
      if (!p.onGround) return null;
      for (const d of this.marks.doors) {
        if (Math.abs(p.cx - d.x) > 9 || !(d.enter || d.knock)) continue;
        if (d.enter) return { x: d.x, y: this.floorY - 34, text: '{use} ENTER', act: (gg) => { sfx('doorOpen'); gg.player.controls = false; gg.travel(d.enter, { at: 'door' }, 'door'); } };
        return { x: d.x, y: this.floorY - 34, text: '{use} KNOCK', act: (gg) => gg.runScript((g2) => ERX.Story.world.knock(g2, d.knock)) };
      }
      return null;
    }

    /** Lamps and windows at night, the forge always. */
    liveLights(g) {
      const out = [], Lt = this.L;
      const n = Lt ? Math.max(Lt.night, Lt.dusk * 0.5) : 0;
      if (n > 0.05) {
        for (const l of this.marks.lamps) out.push({ x: l.x, y: l.y, r: l.r * (0.96 + 0.04 * Math.sin(g.t * 6 + l.x)), color: '#ffc870', intensity: n });
        for (const w of this.marks.windows) out.push({ x: w.x + w.w / 2, y: w.y + w.h / 2, r: 18, color: '#ffb850', intensity: n * 0.8 });
      }
      if (this.marks.forge) out.push({ x: this.marks.forge.x, y: this.marks.forge.y, r: 46, color: '#ff8a3a', intensity: 0.85 });
      if (Lt && Lt.night >= 0.2) for (const c of this.critters) if (c.kind === 'glow') out.push({ x: c.x, y: c.y, r: 14, color: '#d8ff6a', intensity: Lt.night * (0.5 + 0.5 * Math.sin(c.ph * 2.2)) });
      return out;
    }
  }

  // ================================================================ the villagers
  const FOLK_REG = () => (ERX.Story && ERX.Story.deep && ERX.Story.deep.MINERS) || {};
  /** A villager's day: standing about, pottering up and down, sitting on the bench, hammering at the anvil. */
  function folkUpdate(n, dt, g) {
    const p = g.player, near = Math.abs(n.x - p.cx) < 46 && Math.abs(n.y - p.feet) < 30;
    n.bubbleT = Math.max(0, (n.bubbleT || 0) - dt);
    const x0 = n.x;
    if (n.goX != null) {
      const d = n.goX - n.x, sp = n.goSpeed || 40;
      if (Math.abs(d) < 2) { n.x = n.goX; n.goX = null; }
      else n.x += Math.sign(d) * Math.min(Math.abs(d), sp * dt);
    } else if (n.mode === 'wander' && !n.talking && !near && !n.stay) {
      n.pause = (n.pause === undefined ? Math.random() * 2 : n.pause) - dt;
      if (n.pause <= 0) {
        if (n.dest == null) n.dest = U.lerp(n.range[0], n.range[1], Math.random());
        const d = n.dest - n.x;
        if (Math.abs(d) < 2) { n.dest = null; n.pause = U.lerp(1.5, 4.5, Math.random()); }
        else n.x += Math.sign(d) * Math.min(Math.abs(d), n.speed * dt);
      }
    }
    const moved = n.x - x0;
    n.walking = Math.abs(moved) > 0.01;
    if (n.walking) { n.stride = (n.stride || 0) + Math.abs(moved) / (n.speed > 30 ? 4 : 3); n.facingNow = Math.sign(moved); }
    else if (near || n.talking || n.watch) n.facingNow = (n.watch != null ? n.watch : p.cx) < n.x ? -1 : 1;
    else n.facingNow = n.facing;
    // the smith's hammer: CLANG, sparks
    if (n.mode === 'smith' && !n.talking && !near && !n.walking) {
      const ph = n.t % 0.9, hit = ph >= 0.55 && ph < 0.6;
      if (hit && !n.struck) {
        n.struck = true;
        if (Math.abs(n.x - p.cx) < 260) sfx('anvil', { volume: 0.025, minGap: 0.2 });
        g.sparks(n.x + n.facingNow * 13, n.y - 12, 4, n.facingNow);
      } else if (!hit) n.struck = false;
    }
  }
  function folkDraw(c, cam, n, g) {
    const v = FOLK_REG()[n.id];
    if (!v) return;
    const PS = ERX.PlayerSide, facing = n.facingNow || n.facing || 1, far = Math.abs(n.x - g.player.cx) >= 46;
    let pose = 'idle', frame = Math.floor(n.t * 1.6) % 2;
    if (n.walking) { pose = 'run'; frame = Math.floor(n.stride || 0) % 6; }
    else if (n.mode === 'sit') { pose = 'sit'; frame = 0; }
    else if (n.mode === 'smith' && !n.talking && far) { const ph = n.t % 0.9; pose = 'attack'; frame = ph < 0.35 ? 0 : ph < 0.55 ? 1 : 2; }
    const x = Math.round(n.x) - cam.ix, y = Math.round(n.y) - cam.iy;
    PS.draw(c, PS.frame(n.look || v.look, pose, frame, facing), x, y, facing);
    if (pose === 'attack') {
      // the hammer in the smith's fist
      const hx = x + facing * (frame === 1 ? 13 : frame === 0 ? -3 : 10), hy = y - (frame === 0 ? 21 : 13);
      c.fillStyle = '#7a5236'; c.fillRect(Math.min(hx, hx + facing * 5), hy, 6, 1);
      c.fillStyle = '#8a8a9a'; c.fillRect(hx + facing * 5 - 1, hy - 2, 3, 4);
    }
    if (n.talking) c.drawImage(ERX.Actors.bubble('dots'), x - 4, y - 44);
    else if (n.bubbleT > 0) c.drawImage(ERX.Actors.bubble(n.bubble || 'bang'), x - 4, y - 44 - (n.bubbleT > 1.2 ? Math.round((n.bubbleT - 1.2) * 10) : 0));
  }

  VillageLevel.MAP = MAP;
  VillageLevel.folkUpdate = folkUpdate;
  VillageLevel.folkDraw = folkDraw;
  ERX.VillageLevel = VillageLevel;
})(window.ERX = window.ERX || {});
