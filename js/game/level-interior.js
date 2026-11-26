/*
 * INSIDE NORMALTON: little rooms you walk into off the street (the doors: js/game/level-village.js).
 *
 *   inn      THE SLEEPY GOOSE, downstairs: Molly's bar, the fire, Gerald's portrait, old Tobias asleep at a table,
 *            and the stairs up
 *   innUp    upstairs, under the roof: the beds. Sleep in yours at night and you wake up in the morning, fully healed
 *   goods    FENWICK'S GOODS: food for the road (it heals you when you're low)
 *   armory   GRETA'S ARMOURY: armour, head to toe, leather to iron (Holt, next door at the smithy, upgrades it)
 *
 *   ERX.Interiors[id]      the level class for each room (the game screen loads them like any other level)
 *   level.spots             where you can do something: LEAVE, UPSTAIRS / DOWNSTAIRS, SLEEP (level.interact)
 *   level.sleeper           set while you're asleep in your bed (you're the lump under the quilt)
 *
 * Time keeps passing in here (g.worldTod, the same clock as outside): the windows show the sky,
 * and it's darker at night (the lamps and the fire light the room).
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, PB = ERX.PixelBuffer, C = ERX.Color;
  const TS = 16, H_TILES = 17, FLOOR_ROW = 14, CEIL_ROW = 3;
  const FL = FLOOR_ROW * TS, CEIL = CEIL_ROW * TS;
  const { ROCK } = ERX.CaveLevel.TILES;
  const W1 = ERX.World1Level, lightAt = W1.lightAt;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const INK = '#1a1424';
  const cc = new Map();
  const K = (h) => { let v = cc.get(h); if (v === undefined) { v = C.u32(h); cc.set(h, v); } return v; };
  const bayer = (x, y) => ERX.bayer(x, y);

  const WOOD = ['#d4a46a', '#b0804e', '#86583a', '#5a3a26'];
  const TIMBER = ['#6a4630', '#4e3222', '#3a2418'];
  const STONE = ['#b0a8a4', '#908884', '#6e6668', '#4c4650'];
  const IRON = ['#5a5a6a', '#3a3a48', '#24242e'];
  const BRASS = ['#ffe08a', '#d8a838', '#9a6a1a'];

  // ---------------------------------------------------------------- painting helpers (into a PixelBuffer)
  const S = (b, x, y, col) => b.set(Math.round(x), Math.round(y), K(col));
  const R = (b, x, y, w, h, col) => { if (w > 0 && h > 0) b.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), K(col)); };
  const L = (b, x0, y0, x1, y1, col) => b.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), K(col));
  const disc = (b, x, y, r, col) => b.circle(Math.round(x), Math.round(y), r, K(col));
  const oval = (b, x, y, rx, ry, col) => b.ellipse(Math.round(x), Math.round(y), rx, ry, K(col));
  /** Punch a hole (the sky shows through it: drawSky). */
  const hole = (b, x, y, w, h) => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) b.set(Math.round(x) + xx, Math.round(y) + yy, 0); };
  const textW = (s) => (ERX.Font && ERX.Font.measure ? ERX.Font.measure(s) : s.length * 5);
  /** A name board sized to its text (the text goes on once it's a canvas: out.texts). */
  function board(b, cx, y, text, bg, fg, out) {
    const w = textW(text) + 8, x = Math.round(cx - w / 2);
    R(b, x - 1, y - 1, w + 2, 11, INK); R(b, x, y, w, 9, bg); R(b, x, y, w, 1, C.shade(bg, 0.25));
    out.texts.push({ x: x + w / 2, y: y + 1, text, color: fg });
    return { x, w };
  }

  // ---- furniture
  function paintShell(b, room) {
    const x0 = 2 * TS, x1 = (room.W - 2) * TS, [wall, wallD] = room.wall, wy = FL - 42;
    for (let y = CEIL; y < FL; y++) for (let x = x0; x < x1; x++) {
      let col = wall;
      if (room.paper === 'stripes' && Math.floor((x - x0) / 7) % 2 === 0) col = C.shade(wall, -0.045);
      else if (room.paper === 'dots' && x % 9 === 4 && y % 9 === 4) col = wallD;
      if (y < CEIL + 8 && bayer(x, y) < 0.8 - (y - CEIL) * 0.1) col = wallD;          // in shadow under the ceiling
      const edge = Math.min(x - x0, x1 - 1 - x);
      if (edge < 7 && bayer(x, y) < (7 - edge) / 9) col = wallD;                       // ...and in the corners
      S(b, x, y, col);
    }
    for (const px of room.posts || []) { const X = Math.round(px * TS); R(b, X - 2, CEIL, 5, FL - CEIL, TIMBER[0]); R(b, X - 2, CEIL, 1, FL - CEIL, C.shade(TIMBER[0], 0.2)); R(b, X + 2, CEIL, 1, FL - CEIL, TIMBER[1]); }
    R(b, x0, CEIL, x1 - x0, 5, TIMBER[0]); R(b, x0, CEIL + 5, x1 - x0, 1, TIMBER[2]);
    // the wainscot: planks along the bottom of the wall, a rail on top
    for (let y = wy; y < FL; y++) for (let x = x0; x < x1; x++) { const k = (x - x0) % 12; S(b, x, y, k === 0 ? WOOD[3] : k === 1 ? WOOD[1] : y > FL - 5 ? WOOD[3] : y === wy ? WOOD[1] : WOOD[2]); }
    R(b, x0, wy - 2, x1 - x0, 3, WOOD[1]); R(b, x0, wy - 2, x1 - x0, 1, WOOD[0]); R(b, x0, wy + 1, x1 - x0, 1, WOOD[3]);
  }
  /** The way out: a plank door, a little window in it, a mat. X is its middle. */
  function paintDoor(b, X, out) {
    const dw = 22, dh = 40, dx = Math.round(X - dw / 2), dy = FL - dh;
    R(b, dx - 4, dy - 4, dw + 8, dh + 4, TIMBER[0]); R(b, dx - 4, dy - 4, dw + 8, 1, C.shade(TIMBER[0], 0.25)); R(b, dx - 1, dy - 1, dw + 2, dh + 1, INK);
    for (let y = dy; y < FL; y++) for (let x = dx; x < dx + dw; x++) { const k = (x - dx) % 6; S(b, x, y, k === 0 ? WOOD[3] : k === 1 ? WOOD[1] : WOOD[2]); }
    R(b, dx, dy + 12, dw, 1, WOOD[3]); R(b, dx, dy + 28, dw, 1, WOOD[3]);
    const wx = Math.round(X - 5), wy = dy + 5;
    R(b, wx - 1, wy - 1, 12, 9, INK); hole(b, wx, wy, 10, 7); R(b, wx + 5, wy, 1, 7, WOOD[3]);
    out.windows.push({ x: wx, y: wy, w: 10, h: 7, door: true });
    R(b, dx + dw - 5, dy + 21, 2, 3, BRASS[1]); S(b, dx + dw - 5, dy + 21, BRASS[0]);
    R(b, dx, dy + 6, 5, 2, IRON[1]); R(b, dx, dy + dh - 9, 5, 2, IRON[1]);
    for (let x = dx - 5; x < dx + dw + 5; x++) R(b, x, FL - 2, 1, 2, x % 3 ? '#9a3a3a' : '#c8a040');
  }
  /** A window onto the street (the sky shows through the glass: drawSky), curtains, a sill. */
  function paintWindow(b, X, y, w, h, out, o) {
    o = o || {};
    R(b, X - 3, y - 3, w + 6, h + 6, TIMBER[0]); R(b, X - 3, y - 3, w + 6, 1, C.shade(TIMBER[0], 0.25)); R(b, X - 1, y - 1, w + 2, h + 2, INK);
    hole(b, X, y, w, h);
    R(b, X + Math.floor(w / 2), y, 1, h, TIMBER[0]); R(b, X, y + Math.floor(h / 2), w, 1, TIMBER[0]);
    R(b, X - 5, y + h + 3, w + 10, 3, WOOD[1]); R(b, X - 5, y + h + 3, w + 10, 1, WOOD[0]); R(b, X - 5, y + h + 5, w + 10, 1, WOOD[3]);
    if (o.curtain) {
      const cu = o.curtain, cd = C.shade(cu, -0.25);
      R(b, X - 9, y - 6, w + 18, 2, IRON[1]);
      for (const sx of [X - 8, X + w + 1]) { for (let yy = 0; yy < h + 8; yy++) for (let xx = 0; xx < 7; xx++) S(b, sx + xx, y - 4 + yy, (xx + Math.floor(yy / 3)) % 3 === 0 ? cd : cu); R(b, sx, y + Math.round(h * 0.55), 7, 1, BRASS[1]); }
    }
    if (o.flowers) { R(b, X - 2, y + h + 6, w + 4, 4, '#c8603a'); for (let i = 0; i < w + 2; i += 2) { S(b, X - 1 + i, y + h + 5, '#3e9a3c'); S(b, X - 1 + i, y + h + 4, ['#ff6a8a', '#ffd34d', '#ffffff'][i % 3]); } }
    out.windows.push({ x: X, y, w, h });
  }
  function paintTable(b, X, o) {
    o = o || {};
    const w = o.w || 30, top = FL - 22;
    R(b, X - w / 2, top, w, 3, WOOD[1]); R(b, X - w / 2, top, w, 1, WOOD[0]); R(b, X - w / 2 + 1, top + 3, w - 2, 1, WOOD[3]);
    R(b, X - 2, top + 4, 4, 15, WOOD[2]); R(b, X - 1, top + 4, 1, 15, WOOD[1]);
    R(b, X - 8, FL - 3, 16, 3, WOOD[3]); R(b, X - 7, FL - 3, 14, 1, WOOD[2]);
    if (o.cloth) { for (let x = 0; x < w - 4; x++) S(b, X - w / 2 + 2 + x, top - 1, Math.floor(x / 3) % 2 ? '#f4ecdc' : o.cloth); for (let x = 0; x < w - 4; x += 3) S(b, X - w / 2 + 2 + x, top + 3, o.cloth); }
  }
  function paintStool(b, X) { R(b, X - 5, FL - 9, 10, 2, WOOD[1]); R(b, X - 5, FL - 9, 10, 1, WOOD[0]); for (const lx of [X - 4, X + 3]) R(b, lx, FL - 7, 1, 7, WOOD[3]); R(b, X - 4, FL - 4, 8, 1, WOOD[3]); }
  function paintMug(b, X, y) { R(b, X - 2, y - 5, 4, 5, '#e8dcc0'); R(b, X - 2, y - 5, 4, 1, '#ffffff'); S(b, X + 2, y - 4, '#c8b898'); S(b, X + 2, y - 2, '#c8b898'); R(b, X - 1, y - 4, 2, 1, '#f8f0e0'); }
  function paintBottle(b, X, y, col) { R(b, X - 1, y - 9, 3, 2, C.shade(col, -0.3)); R(b, X - 2, y - 7, 5, 7, col); S(b, X - 1, y - 6, C.shade(col, 0.45)); R(b, X - 2, y - 3, 5, 2, '#f4ecdc'); }
  function paintBarrel(b, X, y) { R(b, X - 6, y - 15, 13, 15, WOOD[2]); R(b, X - 5, y - 15, 2, 15, WOOD[1]); R(b, X + 4, y - 15, 2, 15, WOOD[3]); for (const yy of [y - 13, y - 4]) R(b, X - 6, yy, 13, 1, IRON[1]); R(b, X - 6, y - 15, 13, 1, WOOD[3]); }
  /** A keg on its side: the round end, staves, a tap. */
  function paintKeg(b, X, y, r) { disc(b, X, y, r + 1, INK); disc(b, X, y, r, WOOD[2]); disc(b, X, y, r - 2, WOOD[1]); disc(b, X, y, r - 4, WOOD[2]); for (let a = 0; a < 6; a++) L(b, X, y, X + Math.cos(a) * (r - 1), y + Math.sin(a) * (r - 1), WOOD[3]); disc(b, X, y, 1.5, IRON[1]); R(b, X - 1, y + r - 3, 3, 4, BRASS[1]); }
  function paintCrate(b, X, y, s) { R(b, X, y - s, s, s, WOOD[1]); R(b, X, y - s, s, 1, WOOD[0]); R(b, X, y - 1, s, 1, WOOD[3]); L(b, X + 1, y - 2, X + s - 2, y - s + 1, WOOD[2]); R(b, X, y - s, 1, s, WOOD[2]); R(b, X + s - 1, y - s, 1, s, WOOD[3]); }
  function paintShelf(b, x0, x1, y) { R(b, x0, y, x1 - x0, 3, WOOD[1]); R(b, x0, y, x1 - x0, 1, WOOD[0]); R(b, x0, y + 3, x1 - x0, 1, WOOD[3]); for (const bx of [x0 + 3, x1 - 5]) { R(b, bx, y + 4, 2, 5, IRON[1]); S(b, bx + 1, y + 8, IRON[0]); } }
  function paintCandle(b, X, y) { R(b, X - 1, y - 5, 3, 5, '#f4ecdc'); S(b, X, y - 6, '#3a2a22'); R(b, X - 2, y, 5, 1, BRASS[1]); }
  function paintLantern(b, X, y, out) {
    R(b, X, CEIL + 5, 1, y - CEIL - 8, IRON[1]);
    R(b, X - 3, y - 4, 7, 2, IRON[1]); R(b, X - 3, y - 2, 7, 8, IRON[2]); R(b, X - 2, y - 1, 5, 6, '#e8d8a0'); R(b, X - 1, y, 3, 4, '#fff4c8'); R(b, X - 3, y + 6, 7, 1, IRON[1]);
    out.flames.push({ x: X, y: y + 2, s: 0.5 });
  }
  /** A bed, side on: headboard at the left, a pillow, a patchwork quilt, the footboard. X is its middle. */
  function paintBed(b, X, quilt) {
    const hx = X - 24, fx = X + 22, mt = FL - 15;
    R(b, hx, FL - 30, 5, 30, WOOD[2]); R(b, hx, FL - 30, 5, 1, WOOD[0]); R(b, hx - 1, FL - 32, 7, 3, WOOD[1]); disc(b, hx + 2, FL - 33, 2, WOOD[1]);
    R(b, fx, FL - 21, 5, 21, WOOD[2]); R(b, fx, FL - 21, 5, 1, WOOD[0]); R(b, fx - 1, FL - 23, 7, 3, WOOD[1]);
    R(b, hx + 5, mt, fx - hx - 5, 7, '#f4ecdc'); R(b, hx + 5, mt + 7, fx - hx - 5, 3, WOOD[3]);
    for (const lx of [hx + 6, fx - 2]) R(b, lx, mt + 10, 2, FL - mt - 10, WOOD[3]);
    R(b, hx + 6, mt - 4, 12, 5, '#ffffff'); R(b, hx + 6, mt, 12, 1, '#d8d4e8');
    const qc = [quilt, C.shade(quilt, 0.25), '#ffd36a', C.shade(quilt, -0.2)];
    for (let y = 0; y < 8; y++) for (let x = 0; x < fx - hx - 18; x++) S(b, hx + 17 + x, mt - 2 + y, y === 7 ? C.shade(quilt, -0.35) : qc[(Math.floor(x / 5) + Math.floor(y / 4)) % 4]);
    for (let x = 0; x < fx - hx - 18; x += 5) S(b, hx + 17 + x, mt + 6, '#ffffff');
  }

  // ---------------------------------------------------------------- the rooms
  const ROOMS = {
    // ============================================== THE SLEEPY GOOSE, downstairs
    inn: {
      W: 34, title: 'THE SLEEPY GOOSE', sub: 'Best beds in Normalton. (Only beds in Normalton.)', music: 'sleepygoose',
      wall: ['#ecd8b4', '#d2bc94'], paper: 'stripes', posts: [9, 21.6, 31],
      door: 4, stairs: { x: 6.9, to: 'innUp', text: '{use} UPSTAIRS' }, from: 'inn',
      folk: [
        { id: 'molly', x: 26, mode: 'idle', facing: -1, step: 5 },
        { id: 'tobias', x: 12.1, mode: 'sit', facing: 1, sleepy: true },
      ],
      signs: [{ x: 19.5, text: 'GERALD\nBeloved goose of the Sleepy Goose.\nSlept in the window every afternoon.\nFlew off east one morning.\n(If found, please honk.)' }],
      paint(b, room, out) {
        paintDoor(b, room.door * TS, out);
        paintWindow(b, 160, 66, 22, 26, out, { curtain: '#8a4a7e' });
        // the stairs, up to the right and through the ceiling (a cupboard under them)
        const fx = 104, n = 11, run = 15, rise = 16;
        for (let i = 0; i < n; i++) {
          const x = fx + i * run, y = FL - (i + 1) * rise;
          for (let yy = y; yy < FL; yy++) for (let xx = x; xx < x + run; xx++) S(b, xx, yy, yy < y + 4 ? WOOD[1] : (xx + yy) % 9 === 0 ? TIMBER[2] : TIMBER[1]);
          R(b, x, y, run + 2, 2, WOOD[0]); R(b, x, y + 2, run + 2, 1, WOOD[3]);
        }
        L(b, fx, FL - 1, fx + n * run, FL - n * rise - 1, TIMBER[0]);
        // the cupboard under the stairs (BROOMS)
        R(b, fx + 34, FL - 30, 20, 30, INK); R(b, fx + 35, FL - 29, 18, 29, WOOD[2]); R(b, fx + 44, FL - 29, 1, 29, WOOD[3]); S(b, fx + 42, FL - 15, BRASS[0]); S(b, fx + 46, FL - 15, BRASS[0]);
        out.texts.push({ x: fx + 44, y: FL - 42, text: 'BROOMS', color: '#5a3a26' });
        // the banister, and the post at the bottom
        for (let i = 0; i <= n; i += 2) { const x = fx + 4 + i * run, y = FL - i * rise; R(b, x, y - 24, 2, 24, WOOD[2]); }
        L(b, fx + 4, FL - 26, fx + 4 + n * run, FL - 26 - n * rise, WOOD[0]); L(b, fx + 4, FL - 25, fx + 4 + n * run, FL - 25 - n * rise, WOOD[3]);
        R(b, fx - 2, FL - 32, 6, 32, WOOD[2]); R(b, fx - 2, FL - 32, 1, 32, WOOD[0]); disc(b, fx + 1, FL - 34, 3, WOOD[1]);
        R(b, fx + n * run - 6, 0, 46, CEIL, '#1a120e');      // the way up, through the ceiling
        // the fireplace: a stone chimney breast, a mantel, the hearth (the fire's drawn live)
        const cx = 312;
        for (let y = CEIL + 5; y < FL; y++) { const r = Math.floor(y / 6), ry = y % 6; for (let x = cx - 22; x < cx + 22; x++) S(b, x, y, (x + (r % 2) * 5) % 10 === 0 || ry === 5 ? STONE[3] : ry === 0 ? STONE[0] : x > cx + 14 ? STONE[2] : STONE[1]); }
        R(b, cx - 12, FL - 28, 24, 28, '#1e120e'); R(b, cx - 14, FL - 30, 28, 2, STONE[0]); R(b, cx - 10, FL - 26, 20, 22, '#2a1612');
        R(b, cx - 9, FL - 5, 18, 3, '#5a3020'); R(b, cx - 7, FL - 7, 14, 2, '#7a4428');   // logs
        R(b, cx - 26, FL - 3, 52, 3, STONE[0]);
        R(b, cx - 27, FL - 46, 54, 4, WOOD[1]); R(b, cx - 27, FL - 46, 54, 1, WOOD[0]); R(b, cx - 27, FL - 42, 54, 1, TIMBER[2]);
        paintCandle(b, cx - 20, FL - 46); paintCandle(b, cx + 21, FL - 46);
        out.flames.push({ x: cx - 20, y: FL - 52, s: 0.4 }, { x: cx + 21, y: FL - 52, s: 0.4 });
        // a little goose on the mantel
        R(b, cx - 6, FL - 51, 7, 4, '#f4f0e8'); R(b, cx, FL - 55, 2, 5, '#f4f0e8'); S(b, cx + 2, FL - 55, '#ff9a3a'); S(b, cx + 1, FL - 55, INK);
        out.fire = { x: cx, y: FL - 4, w: 18 };
        // Gerald, in a gold frame, over the fire
        const gx = cx - 15, gy = 98;
        R(b, gx - 2, gy - 2, 34, 40, BRASS[2]); R(b, gx - 1, gy - 1, 32, 38, BRASS[1]); R(b, gx - 1, gy - 1, 32, 1, BRASS[0]);
        for (let y = 0; y < 36; y++) R(b, gx, gy + y, 30, 1, C.mix('#6aa8c8', '#3a6a8a', y / 36));
        R(b, gx, gy + 28, 30, 8, '#5a9a4a');
        oval(b, gx + 14, gy + 22, 9, 6, '#f4f0e8'); oval(b, gx + 13, gy + 21, 7, 4, '#ffffff');
        R(b, gx + 20, gy + 7, 4, 14, '#f4f0e8'); oval(b, gx + 22, gy + 8, 3, 3, '#ffffff');
        R(b, gx + 25, gy + 8, 4, 2, '#ff9a3a'); S(b, gx + 23, gy + 7, INK);
        R(b, gx + 10, gy + 28, 1, 4, '#ff9a3a'); R(b, gx + 15, gy + 28, 1, 4, '#ff9a3a');
        R(b, gx - 2, gy + 40, 34, 10, BRASS[2]); R(b, gx - 1, gy + 41, 32, 8, BRASS[1]); out.texts.push({ x: gx + 15, y: gy + 41, text: 'GERALD', color: '#4a2a08' });
        // the bar: shelves of mugs and bottles behind it, the kegs, a board of what's on
        paintShelf(b, 362, 470, 150); paintShelf(b, 362, 470, 176);
        for (let x = 368; x < 466; x += 9) { if ((x / 9) % 3 < 1) paintBottle(b, x, 150, ['#3e8a4e', '#8a3a3a', '#3a5aa8'][(x / 9) % 3 | 0]); else paintMug(b, x, 150); }
        for (let x = 372; x < 466; x += 8) paintMug(b, x, 176);
        R(b, 368, 90, 68, 36, WOOD[3]); R(b, 370, 92, 64, 32, '#2a3a32');
        out.texts.push({ x: 402, y: 95, text: 'MILK 1G', color: '#f4f0e0' }, { x: 402, y: 104, text: 'MORE MILK 2G', color: '#f4f0e0' }, { x: 402, y: 113, text: 'NO MILK FREE', color: '#ffd34d' });
        paintKeg(b, 488, FL - 9, 9); paintKeg(b, 506, FL - 9, 8); paintKeg(b, 497, FL - 26, 8);
        // the tables (Tobias is asleep at the far one), stools, mugs, a candle each
        paintTable(b, 152, { cloth: '#8a4a7e' }); paintStool(b, 136); paintStool(b, 168); paintMug(b, 146, FL - 23); paintCandle(b, 156, FL - 23);
        paintTable(b, 214, { cloth: '#3e6a9a' }); paintStool(b, 228); paintMug(b, 208, FL - 23); paintMug(b, 220, FL - 23); paintCandle(b, 214, FL - 23);
        out.flames.push({ x: 156, y: FL - 29, s: 0.35 }, { x: 214, y: FL - 29, s: 0.35 });
        paintLantern(b, 84, 108, out); paintLantern(b, 416, 70, out); paintLantern(b, 262, 92, out);
        paintBarrel(b, 352, FL);
      },
      counter: { x0: 360, x1: 472, h: 11, top: '#b0804e', body: '#86583a', trim: '#8a4a7e', things: (c, ox, oy, t) => { mugAt(c, 380 + ox, FL - 11 + oy); mugAt(c, 444 + ox, FL - 11 + oy); bottleAt(c, 455 + ox, FL - 11 + oy, '#3e8a4e'); } },
      lights: [{ x: 84, y: 112, r: 70 }, { x: 416, y: 74, r: 96 }, { x: 262, y: 96, r: 76 }, { x: 156, y: FL - 28, r: 34 }, { x: 214, y: FL - 28, r: 34 }],
    },

    // ============================================== THE SLEEPY GOOSE, upstairs (under the roof)
    innUp: {
      W: 30, title: 'THE SLEEPY GOOSE', sub: 'Upstairs. Mind your head.', music: 'sleepygoose',
      wall: ['#e8dcc4', '#cfc0a4'], paper: 'dots', posts: [],
      door: null, stairs: { x: 4.6, to: 'inn', text: '{use} DOWNSTAIRS' }, from: 'inn',
      beds: [{ x: 17.2, yours: true }, { x: 23.6, guest: true }],
      folk: [],
      signs: [{ x: 13, text: 'THE SLEEPY GOOSE: HOUSE RULES\n1. Beds are for NIGHT TIME.\n2. Checkout: whenever.\n3. Breakfast: also whenever.\n4. Please do not fall through the roof.\n   - Molly' }],
      paint(b, room, out) {
        const x0 = 2 * TS, x1 = (room.W - 2) * TS;
        // the roof slopes down at both ends: rafters, and the dark underside of the roof
        for (let x = x0; x < x1; x++) {
          const k = Math.max(0, Math.max(132 - x, x - 348)) * 0.62, edge = CEIL + 5 + Math.round(k);
          for (let y = CEIL; y < Math.min(FL - 44, edge); y++) S(b, x, y, (x + y) % 16 === 0 ? TIMBER[1] : '#3a2a22');
          if (k > 0 && edge < FL - 44) { R(b, x, edge, 1, 3, TIMBER[0]); S(b, x, edge + 3, TIMBER[2]); }
        }
        for (const bx of [76, 404]) { R(b, bx - 2, CEIL, 5, 48, TIMBER[0]); R(b, bx - 2, CEIL, 1, 48, C.shade(TIMBER[0], 0.2)); }
        // the dormer window, in the middle
        R(b, 222, CEIL + 2, 36, 46, '#3a2a22'); paintWindow(b, 228, CEIL + 8, 24, 28, out, {});
        // the stairs down: a dark opening, steps going down into it, a railing in front
        const sx = 72;
        R(b, sx - 22, FL - 56, 44, 56, TIMBER[0]); R(b, sx - 20, FL - 54, 40, 54, '#120c0a');
        for (let i = 0; i < 6; i++) { const y = FL - 52 + i * 9, w = 34 - i * 4; R(b, sx - 17 + i * 2, y, w, 2, C.mix(WOOD[1], '#120c0a', i / 6)); R(b, sx - 17 + i * 2, y + 2, w, 1, C.mix(WOOD[3], '#120c0a', i / 6)); }
        R(b, sx - 22, FL - 26, 44, 2, WOOD[1]); R(b, sx - 22, FL - 26, 44, 1, WOOD[0]);
        for (let x = sx - 20; x <= sx + 18; x += 6) R(b, x, FL - 24, 2, 24, WOOD[2]);
        out.texts.push({ x: sx, y: FL - 66, text: 'DOWN', color: '#5a3a26' });
        // a wardrobe, a washstand with a jug, the rules on the wall
        R(b, 104, FL - 70, 34, 70, INK); R(b, 105, FL - 69, 32, 68, WOOD[2]); R(b, 105, FL - 69, 32, 2, WOOD[1]); R(b, 120, FL - 64, 1, 58, WOOD[3]);
        R(b, 108, FL - 62, 10, 50, WOOD[1]); R(b, 123, FL - 62, 10, 50, WOOD[1]); S(b, 118, FL - 36, BRASS[0]); S(b, 123, FL - 36, BRASS[0]); R(b, 103, FL - 72, 36, 3, WOOD[1]);
        R(b, 158, FL - 26, 24, 3, WOOD[1]); R(b, 160, FL - 23, 2, 23, WOOD[3]); R(b, 178, FL - 23, 2, 23, WOOD[3]);
        oval(b, 170, FL - 28, 8, 3, '#d8dce8'); oval(b, 170, FL - 29, 6, 1, '#8ab4d4'); R(b, 162, FL - 36, 5, 8, '#c8d0e0'); R(b, 161, FL - 34, 1, 4, '#c8d0e0');
        R(b, 162, FL - 70, 16, 22, BRASS[1]); R(b, 163, FL - 69, 14, 20, '#a8c8e0'); L(b, 165, FL - 52, 175, FL - 66, '#e8f4ff');
        R(b, 196, 118, 22, 26, '#f4f0e0'); for (let y = 122; y < 140; y += 3) R(b, 199, y, 16, 1, '#9a948a'); S(b, 207, 118, '#d83a3a');
        // the beds: yours, and someone else's (they're asleep)
        paintBed(b, room.beds[0].x * TS, '#8a4a7e');
        paintBed(b, room.beds[1].x * TS, '#3e6a9a');
        // a little table between them with a candle, a goose over your bed, a chest at the end
        R(b, 312, FL - 18, 16, 3, WOOD[1]); R(b, 314, FL - 15, 2, 15, WOOD[3]); R(b, 324, FL - 15, 2, 15, WOOD[3]); paintCandle(b, 320, FL - 18);
        out.flames.push({ x: 320, y: FL - 24, s: 0.4 });
        R(b, 266, 124, 18, 14, BRASS[2]); R(b, 267, 125, 16, 12, '#6aa8c8'); oval(b, 274, 133, 4, 2, '#ffffff'); R(b, 277, 128, 2, 5, '#ffffff'); S(b, 279, 128, '#ff9a3a');
        R(b, 412, FL - 14, 26, 14, WOOD[2]); R(b, 412, FL - 14, 26, 3, WOOD[1]); R(b, 412, FL - 9, 26, 1, IRON[1]); R(b, 424, FL - 11, 3, 4, BRASS[1]);
        paintLantern(b, 140, 96, out);
      },
      lights: [{ x: 320, y: FL - 22, r: 48 }, { x: 140, y: 100, r: 84 }],
    },

    // ============================================== FENWICK'S GOODS
    goods: {
      W: 30, title: "FENWICK'S GOODS", sub: 'Open! For the first time in eleven years.', music: 'normalton',
      wall: ['#dfe8d4', '#c2ceb8'], paper: 'stripes', posts: [8.6, 23.4],
      door: 4, from: 'goods',
      folk: [{ id: 'fenwick', x: 19.5, mode: 'idle', facing: -1, step: 5 }],
      signs: [{ x: 11.6, text: "TODAY'S SPECIALS:\nEverything!\n(It is all special.)\n(Please buy something.)\n(Please.)" }],
      paint(b, room, out) {
        paintDoor(b, room.door * TS, out);
        paintWindow(b, 98, 84, 20, 24, out, { flowers: true });
        // shelves of food: jars, loaves and cheeses, pies; a crate of apples on the floor
        paintShelf(b, 146, 250, 120); paintShelf(b, 146, 250, 148); paintShelf(b, 146, 250, 176);
        for (let x = 152; x < 246; x += 10) { const col = ['#c8503a', '#e8a030', '#6a9a3a', '#8a4a9a'][(x / 10 | 0) % 4]; R(b, x - 3, 110, 7, 10, '#e8eef0'); R(b, x - 2, 112, 5, 8, col); R(b, x - 3, 109, 7, 2, '#a8783a'); }
        for (let x = 154; x < 246; x += 14) { oval(b, x, 144, 6, 3, '#c8843a'); oval(b, x - 1, 143, 5, 2, '#f0b868'); S(b, x - 2, 142, '#a8682e'); S(b, x + 2, 142, '#a8682e'); }
        for (let x = 160; x < 246; x += 14) { disc(b, x, 168, 5, '#f0c040'); R(b, x - 5, 168, 11, 5, '#e0b030'); S(b, x - 2, 170, '#c8901a'); S(b, x + 2, 169, '#c8901a'); }
        for (let x = 156; x < 246; x += 16) { oval(b, x, 172, 7, 3, '#d8964a'); oval(b, x, 171, 6, 2, '#f4c27a'); R(b, x - 7, 173, 15, 3, '#a8b0c0'); }
        paintCrate(b, 150, FL, 18); for (let i = 0; i < 9; i++) { disc(b, 154 + (i % 5) * 3, FL - 19 - Math.floor(i / 5) * 2, 1.6, i % 2 ? '#e8483a' : '#d83a2a'); }
        paintCrate(b, 172, FL, 14); for (let i = 0; i < 6; i++) { disc(b, 175 + (i % 3) * 4, FL - 15 - Math.floor(i / 3) * 2, 1.8, '#5cb844'); }
        // hams hanging from the beam
        for (const hx of [170, 204, 238]) { R(b, hx, CEIL + 5, 1, 10, IRON[1]); oval(b, hx, CEIL + 22, 5, 7, '#b85a3a'); oval(b, hx - 1, CEIL + 21, 3, 5, '#d8805a'); R(b, hx - 1, CEIL + 14, 3, 2, '#f0ece0'); }
        // behind the counter: a name board, and a high shelf of "potions"
        board(b, 312, 60, "FENWICK'S GOODS", '#3a2a22', '#ffe08a', out);
        paintShelf(b, 280, 344, 120);
        ['#ff5a8a', '#5ad8ff', '#ffd34d', '#8aff6a', '#b87aff', '#ff8a3a'].forEach((col, i) => paintBottle(b, 286 + i * 10, 120, col));
        R(b, 290, 128, 44, 10, '#f4f0e0'); out.texts.push({ x: 312, y: 129, text: 'NOT REAL', color: '#d83a3a' });
        // a little stove with a pot of Nana Pip's stew on it, sacks of flour, a barrel
        const sx = 392;
        R(b, sx - 12, FL - 24, 24, 24, IRON[2]); R(b, sx - 12, FL - 24, 24, 2, IRON[0]); R(b, sx - 6, FL - 15, 12, 8, '#3a1a12'); R(b, sx - 5, FL - 12, 10, 4, '#ff7a2a');
        R(b, sx - 3, CEIL + 5, 6, FL - 24 - CEIL - 5, IRON[1]);
        R(b, sx - 9, FL - 34, 18, 10, '#5a5a6a'); R(b, sx - 10, FL - 35, 20, 2, '#7a7a8a'); R(b, sx - 7, FL - 34, 14, 2, '#a8642a');
        R(b, sx - 28, FL - 63, 56, 20, '#f4f0e0'); R(b, sx - 28, FL - 63, 56, 1, '#ffffff'); out.texts.push({ x: sx, y: FL - 61, text: "NANA PIP'S", color: '#8a3a2a' }, { x: sx, y: FL - 53, text: 'STEW', color: '#8a3a2a' });
        out.steam = { x: sx, y: FL - 36 };
        for (const [fx2, fh] of [[418, 18], [428, 15]]) { oval(b, fx2, FL - fh / 2, 6, fh / 2, '#e8dcc0'); R(b, fx2 - 3, FL - fh - 1, 6, 3, '#c8b898'); out.texts.push({ x: fx2, y: FL - fh / 2 - 3, text: 'F', color: '#a89878' }); }
        paintBarrel(b, 368, FL);
        paintLantern(b, 200, 78, out); paintLantern(b, 312, 84, out);
      },
      counter: { x0: 264, x1: 362, h: 11, top: '#b0804e', body: '#86583a', trim: '#3e8a4e', things: (c, ox, oy) => { scaleAt(c, 282 + ox, FL - 11 + oy); bellAt(c, 346 + ox, FL - 11 + oy); jarAt(c, 330 + ox, FL - 11 + oy); } },
      lights: [{ x: 200, y: 82, r: 92 }, { x: 312, y: 88, r: 92 }, { x: 392, y: FL - 12, r: 34, color: '#ff8a3a' }],
    },

    // ============================================== GRETA'S ARMOURY
    armory: {
      W: 30, title: "GRETA'S ARMORY", sub: 'Holt makes it. Greta sells it. You wear it.', music: 'normalton',
      wall: ['#d4ccc4', '#b8aea6'], paper: null, posts: [6.6, 16, 24.2],
      door: 4, from: 'armory',
      folk: [{ id: 'greta', x: 19.8, mode: 'idle', facing: -1, step: 5 }],
      signs: [{ x: 25.2, text: "GRETA'S ARMORY\nYou break it, you bought it.\nYou bought it, you break it.\n(That is the deal.)" }],
      mannequins: [{ x: 8.4, set: ['leather_cap', 'leather_tunic', 'leather_pants', 'leather_boots'] }, { x: 11.4, set: ['chain_coif', 'chain_shirt', 'chain_leggings', 'chain_boots'] }, { x: 14.4, set: ['iron_helm', 'iron_plate', 'iron_greaves', 'iron_boots'] }],
      paint(b, room, out) {
        paintDoor(b, room.door * TS, out);
        // stone along the bottom of the wall in here (it's a forge's shop): over the wainscot
        for (let y = FL - 42; y < FL; y++) { const r = Math.floor(y / 6), ry = y % 6; for (let x = 32; x < (room.W - 2) * TS; x++) S(b, x, y, (x + (r % 2) * 6) % 12 === 0 || ry === 5 ? STONE[3] : ry === 0 ? STONE[0] : STONE[1]); }
        R(b, 32, FL - 44, (room.W - 4) * TS, 2, TIMBER[0]);
        // shields on the wall over the armour stands
        const shield = (x, y, kind) => {
          if (kind === 0) { disc(b, x, y, 10, INK); disc(b, x, y, 9, WOOD[2]); disc(b, x, y, 7, WOOD[1]); disc(b, x, y, 3, IRON[0]); for (const a of [0, 1.57]) { L(b, x + Math.cos(a) * 8, y + Math.sin(a) * 8, x - Math.cos(a) * 8, y - Math.sin(a) * 8, IRON[1]); } }
          else { for (let yy = 0; yy < 22; yy++) { const hw = yy < 12 ? 9 : Math.round(9 * (1 - (yy - 12) / 10)); R(b, x - hw - 1, y - 10 + yy, hw * 2 + 3, 1, INK); R(b, x - hw, y - 10 + yy, hw * 2 + 1, 1, kind === 1 ? '#3a5ab8' : '#b83a3a'); } R(b, x - 1, y - 9, 3, 18, '#f4f0e0'); R(b, x - 7, y - 4, 15, 3, '#f4f0e0'); }
        };
        shield(134, 96, 0); shield(182, 98, 1); shield(230, 96, 2);
        // behind the counter: the name board, crossed swords, helmets on pegs
        board(b, 317, 58, "GRETA'S ARMORY", '#3a2a22', '#ffe08a', out);
        for (const [a, c2] of [[1, IRON[0]], [-1, IRON[0]]]) { L(b, 317 - a * 16, 76, 317 + a * 16, 108, '#c8d0e0'); L(b, 317 - a * 16 + 1, 76, 317 + a * 16 + 1, 108, c2); R(b, 317 + a * 12 - 3, 101, 7, 2, BRASS[1]); }
        disc(b, 317, 92, 4, BRASS[1]); disc(b, 317, 92, 2, BRASS[0]);
        for (const [hx, col] of [[288, '#a8743e'], [317, '#a4acbc'], [346, '#c4cad8']]) { R(b, hx - 1, 132, 2, 4, WOOD[3]); oval(b, hx, 142, 7, 6, INK); oval(b, hx, 142, 6, 5, col); R(b, hx - 7, 145, 15, 4, col); R(b, hx - 7, 147, 15, 2, C.shade(col, -0.3)); S(b, hx - 3, 139, C.shade(col, 0.4)); }
        // a rack of spears and swords, an anvil (for show), a window
        R(b, 396, FL - 12, 30, 3, WOOD[1]); R(b, 396, FL - 40, 30, 3, WOOD[1]);
        for (let i = 0; i < 5; i++) { const x = 400 + i * 6; R(b, x, FL - 58 + (i % 2) * 6, 1, 50, i % 2 ? WOOD[2] : '#c8d0e0'); if (i % 2 === 0) { R(b, x - 1, FL - 60, 3, 4, '#e8eef4'); } else R(b, x - 2, FL - 46, 5, 1, BRASS[1]); }
        paintWindow(b, 416, 84, 18, 24, out, {});
        paintLantern(b, 184, 70, out); paintLantern(b, 384, 74, out);
      },
      counter: { x0: 264, x1: 370, h: 11, top: '#8a8a9a', body: '#5a5a6a', trim: '#b83a3a', things: (c, ox, oy) => { helmAt(c, 284 + ox, FL - 11 + oy); hammerAt(c, 350 + ox, FL - 11 + oy); } },
      lights: [{ x: 184, y: 74, r: 96 }, { x: 384, y: 78, r: 96 }],
    },
  };

  // ---- small things on the counters (drawn live, on top of the counter)
  const rect = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
  function mugAt(c, x, y) { rect(c, x - 2, y - 5, 4, 5, '#e8dcc0'); rect(c, x - 2, y - 5, 4, 1, '#ffffff'); rect(c, x + 2, y - 4, 1, 3, '#c8b898'); }
  function bottleAt(c, x, y, col) { rect(c, x - 1, y - 10, 3, 3, C.shade(col, -0.3)); rect(c, x - 2, y - 7, 5, 7, col); rect(c, x - 1, y - 6, 1, 3, C.shade(col, 0.45)); }
  function scaleAt(c, x, y) { rect(c, x - 1, y - 12, 2, 12, BRASS[2]); rect(c, x - 9, y - 12, 18, 1, BRASS[1]); for (const dx of [-7, 7]) { rect(c, x + dx - 4, y - 6, 9, 2, BRASS[1]); rect(c, x + dx, y - 11, 1, 5, BRASS[2]); } rect(c, x - 4, y - 1, 8, 1, BRASS[2]); }
  function bellAt(c, x, y) { rect(c, x - 3, y - 4, 7, 3, BRASS[1]); rect(c, x - 2, y - 5, 5, 1, BRASS[0]); rect(c, x, y - 7, 1, 2, BRASS[2]); rect(c, x - 4, y - 1, 9, 1, '#3a3a48'); }
  function jarAt(c, x, y) { rect(c, x - 3, y - 8, 7, 8, 'rgba(220,240,255,0.7)'); rect(c, x - 3, y - 9, 7, 1, '#a8783a'); for (let i = 0; i < 5; i++) rect(c, x - 2 + (i % 3) * 2, y - 6 + Math.floor(i / 3) * 3, 1, 1, ['#ff5a8a', '#ffd34d', '#5ad8ff'][i % 3]); }
  function helmAt(c, x, y) { rect(c, x - 5, y - 8, 10, 6, '#c4cad8'); rect(c, x - 4, y - 9, 8, 1, '#e4e8f0'); rect(c, x - 6, y - 3, 12, 3, '#8a90a0'); rect(c, x + 2, y - 6, 1, 3, '#24242e'); }
  function hammerAt(c, x, y) { rect(c, x - 8, y - 3, 12, 2, '#86583a'); rect(c, x + 3, y - 6, 5, 6, '#5a5a6a'); rect(c, x + 3, y - 6, 5, 1, '#8a8a9a'); }

  /** Little flames: candles, lanterns, the fire. */
  function flame(c, x, y, t, s) {
    const h = Math.round((6 + Math.sin(t * 11) * 1.2 + Math.sin(t * 17.3) * 0.8) * s), w = Math.max(1, Math.round(3 * s));
    rect(c, x - Math.floor(w / 2), y - h + 1, w, h, '#ff9a3a');
    rect(c, x - Math.floor((w - 1) / 2), y - h + 2, Math.max(1, w - 1), Math.max(1, h - 2), '#ffd060');
    if (s >= 0.4) rect(c, x, y - h, 1, 1, '#fff4c8');
  }

  // ================================================================ the level
  class InteriorLevel extends ERX.CaveLevel {
    configure() {
      const room = ROOMS[this.roomId];
      this.room = room;
      this.W = room.W;
      this.H = H_TILES;
      this.pal = { rock: ['#5a3a26', '#4e3222', '#3a2418', '#2a1a12', '#1e140e', '#140c08'], moss: ['#6a4630', '#4e3222'], metal: ['#a8b0c0', '#848ca0', '#5e6478', '#3e4254'], wood: WOOD, outline: INK, back: ['#2a1a12', '#1e140e', '#140c08', '#0c0806'], decor: STONE };
      this.sections = [];
      this.id = this.roomId;
    }

    build() {
      const room = this.room;
      this.interior = true;
      this.interactFirst = true;     // (the way out, the stairs and the bed come before whoever's nearby: game-screen.js)
      this.title = room.title;
      this.sub = room.sub;
      this.music = room.music;
      this.from = room.from;          // the building this room's in (where you come out, on the street)
      this.tiles.fill(ROCK);
      this.air(2, this.W - 2, CEIL_ROW, FLOOR_ROW);
      if (this.roomId === 'inn') this.air(15, 18, 1, CEIL_ROW);   // the way up, through the ceiling (just to look at)
      this.floorY = FL;
      this.doorX = room.door ? Math.round(room.door * TS) : null;
      this.stairsX = room.stairs ? Math.round(room.stairs.x * TS) : null;
      this.spawn = { x: (this.doorX || this.stairsX || 4 * TS) + 18, y: FL };
      this.checkpoints = [this.spawn];
      this.decor = []; this.torches = []; this.braziers = []; this.chalk = []; this.enemySpawns = [];
      this.lights = (room.lights || []).map((l) => ({ x: l.x, y: l.y, r: l.r, color: l.color || '#ffc870', flicker: true, ref: { phase: l.x * 0.13 } }));
      this.signs = (room.signs || []).map((s) => ({ x: Math.round(s.x * TS), y: FL, text: s.text, custom: true, read: false }));
      const V = ERX.VillageLevel;
      // (whoever's behind a counter stands on a step back there: f.step px up, so you can see them over it)
      this.npcs = (room.folk || []).map((f) => Object.assign({ id: f.id, x: Math.round(f.x * TS), y: FL - (f.step || 0), facing: f.facing || -1, mode: f.mode || 'idle', range: null, speed: 0, sleepy: !!f.sleepy }, V ? { update: V.folkUpdate, draw: V.folkDraw } : {}));
      this.beds = (room.beds || []).map((bd) => ({ x: Math.round(bd.x * TS), yours: !!bd.yours, guest: !!bd.guest }));
      this.sleeper = null;
      // what you can do in here (interact)
      this.spots = [];
      if (this.doorX) this.spots.push({ x: this.doorX, text: '{use} LEAVE', h: 50, act: (g) => { sfx('doorOpen'); g.player.controls = false; g.travel('village', { at: 'door', door: this.from }, 'door'); } });
      if (room.stairs) this.spots.push({ x: this.stairsX, text: room.stairs.text, h: 50, act: (g) => { sfx('stairs'); g.player.controls = false; g.travel(room.stairs.to, { at: 'stairs' }, 'door'); } });
      for (const bd of this.beds) if (bd.yours) this.spots.push({ x: bd.x, text: '{use} SLEEP', h: 40, r: 22, act: (g) => g.runScript((gg) => ERX.Story.world.sleep(gg, bd)) });
      this.marks = { windows: [], flames: [], texts: [], fire: null, steam: null };
      this.dark = 0.2;
      this.embers = [];
      this.t = 0;
    }

    /** No sky in here: just a dark backdrop (the back wall covers it). */
    renderBackground() { return ERX.makeCanvas(16, 16); }
    fogAt() { return 0; }

    /** The floor (planks), the ceiling (beams) and the walls either side. */
    renderTiles() {
      const W = this.pw, H = this.ph, b = new PB(W, H);
      for (let ty = 0; ty < this.H; ty++) for (let tx = 0; tx < this.W; tx++) {
        if (!this.isSolid(tx, ty)) continue;
        for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
          const gx = tx * TS + x, gy = ty * TS + y;
          let col;
          if (ty >= FLOOR_ROW) {
            const d = gy - FL, row = Math.floor(d / 6), seam = (gx + row * 23) % 44 === 0;
            col = d === 0 ? '#e0b070' : d === 1 ? '#b8844a' : seam ? '#4a2e1c' : d % 6 === 0 ? '#5e3e24' : row % 2 ? '#8a5a36' : '#9a6a40';
            if (d > 12) col = C.shade(col, -0.25 - Math.min(0.4, (d - 12) * 0.02));
          } else if (ty < CEIL_ROW) {
            const d = CEIL - 1 - gy;
            col = d === 0 ? '#1e140e' : d === 1 ? '#6a4630' : gx % 48 < 7 ? (gx % 48 === 0 ? '#2a1a12' : '#5a3a26') : d % 8 === 0 ? '#2e1e14' : '#3e2a1c';
          } else {
            const left = tx < 2, edge = left ? 2 * TS - 1 - gx : gx - (this.W - 2) * TS;
            col = edge === 0 ? '#1e140e' : edge === 1 ? '#7a5236' : gy % 16 === 0 ? '#2e1e14' : (gy + (left ? 0 : 8)) % 32 < 2 ? '#4e3222' : '#3e2a1c';
          }
          b.data[gy * W + gx] = K(col);
        }
      }
      return b.toCanvas();
    }

    /** The room: its walls, windows, furniture... (the counter goes in front of the keeper: drawLive). */
    renderBackWall() {
      const b = new PB(this.pw, this.ph), out = this.marks;
      out.windows.length = 0; out.flames.length = 0; out.texts.length = 0;
      R(b, 0, 0, this.pw, this.ph, '#140c08');
      paintShell(b, this.room);
      this.room.paint(b, this.room, out);
      const cv = b.toCanvas(), ctx = cv.getContext('2d');
      if (ERX.Font && ERX.Font.draw) for (const t of out.texts) ERX.Font.draw(ctx, t.text, Math.round(t.x), Math.round(t.y), { color: t.color, align: 'center' });
      return cv;
    }
    renderFront() { return null; }

    /** The sky outside, through the windows (it's the same sky as the street's: the same clock). */
    drawSky(ctx, cam, vw, vh, g) {
      const Lt = this.L || lightAt(g.worldTod || 0.12), day = 1 - Lt.night;
      const top = C.mix(C.mix('#4f9cee', '#5a4a9a', Lt.dusk), '#0a1030', Lt.night), bot = C.mix(C.mix('#b4e2ff', '#ffa070', Lt.dusk), '#1a2a5a', Lt.night);
      for (const w of this.marks.windows) {
        const x = w.x - cam.ix, y = w.y - cam.iy;
        if (x + w.w < 0 || x > vw) continue;
        const gr = ctx.createLinearGradient(0, y, 0, y + w.h);
        gr.addColorStop(0, top); gr.addColorStop(1, bot);
        ctx.fillStyle = gr; ctx.fillRect(x, y, w.w, w.h);
        // the stars come out at night; a hill and the roofs across the street by day
        if (Lt.night > 0.3) { ctx.globalAlpha = Lt.night; ctx.fillStyle = '#ffffff'; for (let i = 0; i < Math.max(2, (w.w * w.h) / 60); i++) { const sx = (w.x * 7 + i * 37) % w.w, sy = (w.y * 3 + i * 23) % Math.max(1, w.h - 4); if (Math.sin(g.t * 2 + i * 3) > -0.4) ctx.fillRect(x + sx, y + sy, 1, 1); } ctx.globalAlpha = 1; }
        if (!w.door) { ctx.fillStyle = C.mix('#5cb844', '#14281e', Lt.night * 0.85 + Lt.dusk * 0.2); ctx.fillRect(x, y + w.h - Math.max(3, Math.round(w.h * 0.22)), w.w, Math.max(3, Math.round(w.h * 0.22))); }
        if (day > 0.5 && !w.door) { ctx.fillStyle = C.mix('#c8503e', '#3a2a2a', Lt.dusk * 0.5); ctx.fillRect(x + Math.round(w.w * 0.15), y + w.h - Math.round(w.h * 0.36), Math.max(3, Math.round(w.w * 0.3)), Math.round(w.h * 0.16)); }
      }
    }

    darknessAt() { const Lt = this.L || lightAt(0.12); return 0.14 + 0.36 * Lt.night + 0.06 * Lt.dusk; }

    update(dt, g) {
      this.t += dt;
      g.worldTod = ((g.worldTod === undefined ? 0.12 : g.worldTod) + dt / W1.DAY) % 1;
      this.L = lightAt(g.worldTod);
      ERX.World1 = ERX.World1 || {};
      ERX.World1.night = this.L.night;
      // the fire: it crackles, and spits embers up the chimney
      const fi = this.marks.fire;
      if (fi) {
        if (Math.random() < dt * 1.6 && Math.abs(g.player.cx - fi.x) < 220) sfx('fireCrackle', { minGap: 0.3, bus: 'ambience' });
        if (Math.random() < dt * 5) this.embers.push({ x: fi.x + (Math.random() - 0.5) * fi.w, y: fi.y - 6, vx: (Math.random() - 0.5) * 8, vy: -U.lerp(14, 30, Math.random()), t: 0, life: U.lerp(0.6, 1.3, Math.random()) });
      }
      for (const e of this.embers) { e.t += dt; e.x += e.vx * dt; e.y += e.vy * dt; }
      this.embers = this.embers.filter((e) => e.t < e.life);
      if (this.sleeper) this.sleeper.t += dt;
    }

    /** The counter (in front of whoever's behind it), the fire and the flames, the steam, the armour stands, sleepers. */
    drawLive(c, cam, g) {
      const ox = -cam.ix, oy = -cam.iy, t = g.t, Lt = this.L || lightAt(0.12), day = 1 - Lt.night;
      // sunbeams through the windows
      if (day > 0.2) {
        c.save(); c.globalAlpha = 0.06 * day * (1 - Lt.dusk * 0.5); c.fillStyle = C.mix('#fff4d8', '#ffb070', Lt.dusk);
        for (const w of this.marks.windows) {
          if (w.door) continue;
          const x = w.x + ox, y = w.y + oy, f = FL + oy;
          c.beginPath(); c.moveTo(x, y + w.h); c.lineTo(x + w.w, y + w.h); c.lineTo(x + w.w + 30, f); c.lineTo(x + 18, f); c.closePath(); c.fill();
        }
        c.restore();
      }
      // glass: a glint
      c.fillStyle = 'rgba(255,255,255,0.18)';
      for (const w of this.marks.windows) { const x = w.x + ox, y = w.y + oy; for (let i = 0; i < Math.min(w.w, w.h) - 2; i++) c.fillRect(x + 2 + i, y + w.h - 3 - i, 1, 1); }
      // the fire in the fireplace, and its embers
      const fi = this.marks.fire;
      if (fi) {
        const x = fi.x + ox, y = fi.y + oy;
        for (let i = 0; i < 7; i++) {
          const fx = x - 8 + i * 2.6, h = 6 + Math.round((Math.sin(t * 9 + i * 1.7) * 0.5 + 0.5) * 9 + Math.sin(t * 23 + i) * 1.5);
          rect(c, fx - 1, y - h, 3, h, '#d8401a'); rect(c, fx - 1, y - h + 3, 3, h - 3, '#ff8a2a'); if (h > 8) rect(c, fx, y - h + 6, 1, h - 7, '#ffd060');
        }
        rect(c, x - 7, y - 2, 14, 2, '#fff2a0');
        for (const e of this.embers) { c.globalAlpha = 1 - e.t / e.life; rect(c, e.x + ox, e.y + oy, 1, 1, e.t < 0.3 ? '#fff2a0' : '#ff8a3a'); }
        c.globalAlpha = 1;
      }
      for (const f of this.marks.flames) flame(c, f.x + ox, f.y + oy, t + f.x * 0.37, f.s);
      // steam off the stew
      const st = this.marks.steam;
      if (st) for (let i = 0; i < 4; i++) { const k = ((t * 0.6 + i / 4) % 1); c.globalAlpha = 0.45 * (1 - k); rect(c, st.x + ox + Math.sin(k * 6 + i) * 3 - 1, st.y + oy - k * 22, 2 + Math.round(k * 2), 2, '#ffffff'); }
      c.globalAlpha = 1;
      // the armour stands: wooden dummies wearing a set each
      if (this.room.mannequins && ERX.PlayerSide) for (const m of this.room.mannequins) this._mannequin(c, m, ox, oy);
      // the counter: in front of the keeper, behind you
      const k = this.room.counter;
      if (k) {
        const x0 = k.x0 + ox, w = k.x1 - k.x0, y = FL - k.h + oy;
        rect(c, x0 - 2, y - 1, w + 4, 4, INK); rect(c, x0 - 2, y, w + 4, 3, k.top); rect(c, x0 - 2, y, w + 4, 1, C.shade(k.top, 0.25));
        rect(c, x0, y + 3, w, k.h - 3, k.body);
        for (let px = x0 + 6; px < x0 + w - 6; px += 20) { rect(c, px, y + 6, 14, k.h - 9, C.shade(k.body, -0.18)); rect(c, px, y + 6, 14, 1, C.shade(k.body, 0.15)); }
        rect(c, x0, y + 3, w, 1, C.shade(k.body, -0.35)); rect(c, x0, FL - 2 + oy, w, 2, C.shade(k.body, -0.4));
        rect(c, x0, y + 4, w, 2, k.trim);
        if (k.things) k.things(c, ox, oy, t);
      }
      // the beds: someone in the guest bed (snoring), and you, if you're asleep
      for (const bd of this.beds) {
        const x = bd.x + ox, y = FL + oy;
        if (bd.guest || (bd.yours && this.sleeper)) {
          const bob = Math.sin(t * (bd.guest ? 1.6 : 1.2)) > 0 ? 1 : 0;
          rect(c, x - 6, y - 20 - bob, 22, 4 + bob, bd.guest ? '#5a8ac8' : '#a85a98');
          if (bd.guest) { rect(c, x - 17, y - 22, 8, 5, '#e8b890'); rect(c, x - 18, y - 24, 9, 3, '#d8d4e8'); rect(c, x - 20, y - 22, 2, 2, '#ffffff'); }
          else { const look = g.character.look, D = ERX.Data.character; rect(c, x - 17, y - 22, 8, 5, D.skins[look.skin].c); rect(c, x - 17, y - 23, 8, 3, D.hairColors[look.hairColor].c); }
          this._zzz(c, x - 10, y - 30, t + (bd.guest ? 0 : 1.3));
        }
      }
      for (const n of g.npcs) if (n.sleepy && !n.talking) this._zzz(c, Math.round(n.x) + ox + 4, Math.round(n.y) + oy - 30, t);
    }
    _zzz(c, x, y, t) {
      const F = ERX.Font;
      for (let i = 0; i < 3; i++) {
        const k = ((t * 0.45 + i / 3) % 1);
        if (F && F.draw) F.draw(c, 'z', Math.round(x + k * 8 + Math.sin(k * 5) * 2), Math.round(y - k * 14), { color: '#e8f0ff', alpha: Math.min(1, (1 - k) * 1.6) });
      }
    }
    _mannequin(c, m, ox, oy) {
      const PS = ERX.PlayerSide, I = ERX.Items, x = Math.round(m.x * TS) + ox, y = FL + oy;
      if (!m.look) {
        const part = (k) => m.set.map((id) => I.get('armor:' + id)).find((it) => it && it.slot === k);
        const h = part('head'), ch = part('chest'), lg = part('legs'), ft = part('feet');
        m.look = { id: 'dummy', gender: 0, skin: 0, hair: 8, hairColor: 0, eyes: 0, outfit: 0, outfitColor: 0, pants: 0, skinC: '#c89a68', eyeC: '#c89a68', outfitC: '#b0804e', pantsC: '#9a6a40', armor: ch && ch.look, helm: h && h.look, helmKind: h && h.tier, greaves: lg && lg.look, boots: ft && ft.look };
      }
      rect(c, x - 7, y - 3, 14, 3, WOOD[3]); rect(c, x - 6, y - 3, 12, 1, WOOD[2]);
      PS.draw(c, PS.frame(m.look, 'idle', 0, 1), x, y - 3, 1);
    }

    /** Lamps, candles and the fire (always on); daylight in through the windows. */
    liveLights(g) {
      const out = [], Lt = this.L || lightAt(0.12), day = 1 - Lt.night;
      const fi = this.marks.fire;
      if (fi) out.push({ x: fi.x, y: fi.y - 10, r: 104 * (0.95 + 0.05 * Math.sin(g.t * 7) + 0.03 * Math.sin(g.t * 19)), color: '#ff8a3a', intensity: 1 });
      if (day > 0.1) for (const w of this.marks.windows) out.push({ x: w.x + w.w / 2, y: w.y + w.h, r: w.door ? 30 : 64, color: '#fff4d8', intensity: day * (w.door ? 0.5 : 0.85) });
      return out;
    }

    /** LEAVE / UPSTAIRS / DOWNSTAIRS / SLEEP: whatever you're stood by. */
    interact(g) {
      const p = g.player;
      if (!p.onGround || this.sleeper) return null;
      for (const s of this.spots) if (Math.abs(p.cx - s.x) < (s.r || 13)) return { x: s.x, y: FL - (s.h || 50), text: s.text, act: s.act };
      return null;
    }
  }

  // one level class per room (the game screen makes levels with new Level(seed))
  const Interiors = {};
  for (const id of Object.keys(ROOMS)) Interiors[id] = class extends InteriorLevel { get roomId() { return id; } };
  ERX.Interiors = Interiors;
  ERX.InteriorLevel = InteriorLevel;
  InteriorLevel.ROOMS = ROOMS;
})(window.ERX = window.ERX || {});
