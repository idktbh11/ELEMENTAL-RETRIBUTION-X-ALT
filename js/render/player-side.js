/*
 * Side-view player sprite for gameplay, built from the same "look" as the
 * front-facing menu sprite (js/render/player-sprite.js).
 *
 * The character is a little pixel puppet: every frame is a set of joint
 * positions (shoulders, elbows, hands, hips, knees, ankles) plus a body
 * lean/bob, and limbs are drawn as 2px strokes between joints. That keeps
 * the animation readable and lets every outfit/hair combo animate for free.
 *
 *   ERX.PlayerSide.frame(look, pose, frame, facing) -> canvas (26x29)
 *   ERX.PlayerSide.frameJoints(look, joints, facing) -> canvas for ANY joint set
 *     (the smooth, blended awakened animations: see js/game/awakening.js)
 *   ERX.PlayerSide.points(joints) -> where the eye / cheek / hands / feet are,
 *     relative to the feet anchor, facing right (flip dx when facing left)
 * Extra joint flags: hideHands (hands in pockets), noLegs (lower body hidden),
 *   wind (freefall: hair, ponytails and scarves blow straight up; windPh 0..3 animates them).
 * Poses: idle(2) run(6) jump fall attack(3) block dash(3) hurt lie
 *        + ultimate cutscene poses: clapOpen clap raise raiseBoth push crouch
 * Feet rest on canvas row 25; ANCHOR is the point between the feet.
 */
(function (ERX) {
  'use strict';

  const PB = ERX.PixelBuffer, C = ERX.Color;
  const c32 = (h) => C.u32(h);
  const cache = new Map();
  const OUTLINE = '#120c16';
  const WHITE = '#f4f2ff';
  const OX = 5, OY = 2;

  // ------------------------------------------------------------- poses
  // Coordinates are in a 16x24 grid, character facing right, feet on row 23.
  // F = front (near) limb, B = back (far) limb. Each limb: [knee/elbow, ankle/hand].
  const STAND = {
    bob: 0, lean: 0,
    FL: [[9, 19], [9, 22]], BL: [[7, 19], [7, 22]],
    FA: [[9, 14], [9, 16]], BA: [[7, 14], [7, 16]],
  };
  const P = (o) => Object.assign({}, STAND, o);

  const POSES = {
    idle: [P({ FA: [[10, 14], [10, 16]] }), P({ bob: 1, FA: [[10, 14], [10, 16]], BA: [[7, 15], [7, 17]] })],
    run: [
      P({ bob: 0, lean: 1, FL: [[11, 18], [13, 21]], BL: [[6, 19], [4, 21]], FA: [[7, 13], [5, 15]], BA: [[10, 13], [12, 12]] }),
      P({ bob: 1, lean: 1, FL: [[10, 19], [10, 22]], BL: [[6, 18], [4, 19]], FA: [[8, 14], [7, 16]], BA: [[9, 14], [10, 15]] }),
      P({ bob: -1, lean: 1, FL: [[9, 19], [8, 22]], BL: [[10, 17], [9, 20]], FA: [[10, 13], [12, 12]], BA: [[7, 13], [5, 15]] }),
      P({ bob: 0, lean: 1, BL: [[11, 18], [13, 21]], FL: [[6, 19], [4, 21]], BA: [[7, 13], [5, 15]], FA: [[10, 13], [12, 12]] }),
      P({ bob: 1, lean: 1, BL: [[10, 19], [10, 22]], FL: [[6, 18], [4, 19]], BA: [[8, 14], [7, 16]], FA: [[9, 14], [10, 15]] }),
      P({ bob: -1, lean: 1, BL: [[9, 19], [8, 22]], FL: [[10, 17], [9, 20]], BA: [[10, 13], [12, 12]], FA: [[7, 13], [5, 15]] }),
    ],
    jump: [P({ bob: -1, FL: [[11, 17], [11, 20]], BL: [[7, 19], [6, 22]], FA: [[10, 10], [11, 8]], BA: [[6, 13], [5, 15]] })],
    fall: [P({ FL: [[10, 19], [11, 21]], BL: [[6, 19], [5, 22]], FA: [[11, 11], [13, 9]], BA: [[5, 11], [3, 9]] })],
    attack: [
      P({ lean: -1, FL: [[10, 19], [11, 22]], BL: [[6, 19], [5, 22]], FA: [[6, 12], [4, 12]], BA: [[9, 14], [10, 15]] }),
      P({ lean: 1, FL: [[11, 19], [12, 22]], BL: [[6, 19], [5, 22]], FA: [[12, 11], [15, 11]], BA: [[6, 13], [5, 15]], fist: true }),
      P({ lean: 0, FL: [[10, 19], [11, 22]], BL: [[6, 19], [5, 22]], FA: [[11, 12], [13, 12]], BA: [[7, 14], [6, 16]] }),
    ],
    block: [P({ lean: -1, FL: [[10, 19], [11, 22]], BL: [[6, 19], [5, 22]], FA: [[11, 13], [11, 9]], BA: [[9, 13], [10, 11]], guard: true })],
    dash: [
      P({ bob: 2, lean: 1, FL: [[10, 19], [11, 22]], BL: [[6, 20], [4, 22]], FA: [[6, 14], [4, 15]], BA: [[6, 14], [4, 16]] }),
      P({ bob: 1, lean: 3, FL: [[12, 18], [14, 20]], BL: [[5, 18], [2, 19]], FA: [[6, 12], [3, 13]], BA: [[6, 13], [3, 15]], whip: 1 }),
      P({ bob: 1, lean: 3, FL: [[12, 18], [14, 21]], BL: [[5, 19], [2, 20]], FA: [[6, 13], [3, 14]], BA: [[6, 12], [3, 13]], whip: 2 }),
    ],
    sit: [P({ bob: 3, FL: [[12, 19], [12, 22]], BL: [[10, 19], [10, 22]], FA: [[10, 16], [12, 18]], BA: [[7, 16], [9, 18]] })],
    // ---- ultimate cutscene ----
    clapOpen: [P({ FA: [[11, 13], [14, 12]], BA: [[5, 13], [2, 12]] })],
    clap: [P({ lean: 1, FA: [[10, 13], [12, 12]], BA: [[9, 13], [11, 12]] })],
    raise: [P({ FA: [[10, 9], [10, 5]], BA: [[6, 14], [5, 16]] })],
    raiseBoth: [P({ FA: [[11, 9], [12, 5]], BA: [[5, 9], [4, 5]] })],
    push: [P({ lean: 2, FL: [[11, 19], [12, 22]], BL: [[6, 19], [4, 22]], FA: [[12, 12], [15, 12]], BA: [[11, 12], [14, 13]] })],
    crouch: [P({ bob: 2, FL: [[12, 20], [12, 22]], BL: [[5, 20], [4, 22]], FA: [[11, 14], [13, 15]], BA: [[6, 14], [4, 16]] })],
    hurt: [P({ lean: -2, FL: [[10, 19], [11, 22]], BL: [[6, 19], [5, 22]], FA: [[11, 10], [12, 8]], BA: [[5, 11], [3, 9]], eyesClosed: true, mouthOpen: true })],
  };

  function paint(look, pose, frame) {
    const set = POSES[pose] || POSES.idle;
    return paintPose(look, set[frame % set.length]);
  }

  function paintPose(look, p) {
    const D = ERX.Data.character;
    const b = new PB(26, 29);

    const skin = D.skins[look.skin].c, skinD = C.shade(skin, -0.2), skinL = C.shade(skin, 0.15);
    const hair = D.hairColors[look.hairColor].c, hairD = C.shade(hair, -0.3), hairL = C.shade(hair, 0.25);
    const eye = D.eyeColors[look.eyes].c;
    const out = D.outfitColors[look.outfitColor].c, outD = C.shade(out, -0.3), outL = C.shade(out, 0.22);
    const pants = D.pantsColors[look.pants].c, pantsD = C.shade(pants, -0.32);
    const outfit = look.outfit, hs = look.hair, fem = look.gender === 1;

    const px = (x, y, col) => b.set(Math.round(x) + OX, Math.round(y) + OY, c32(col));
    const rect = (x, y, w, h, col) => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) px(x + xx, y + yy, col); };
    /** 2px-wide limb stroke between two grid points. */
    const stroke = (x0, y0, x1, y1, col) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) {
        const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
        rect(x - 1, y, 2, 1, col);
        if (Math.abs(x1 - x0) > Math.abs(y1 - y0)) rect(x - 1, y - 1, 2, 1, col);
      }
    };

    const bob = p.bob, lean = p.lean;
    // upper body is sheared by the lean: shoulders move more than hips
    const shX = (y) => Math.round((lean * (16 - y)) / 5);
    const hipY = 16 + Math.max(0, bob);
    const shoulderY = 11 + bob;
    const sx = 8 + shX(shoulderY);

    // sleeves: short-sleeved outfits show forearm skin
    const shortSleeve = outfit === 0 || outfit === 3 || outfit === 4 || outfit === 5;
    const sleeve = outfit === 3 ? WHITE : outfit === 4 ? '#d8d0c0' : out;

    const drawArm = (arm, back) => {
      const [elbow, hand] = arm;
      const sh = [sx + (back ? -1 : 0), shoulderY + 1];
      const e = [elbow[0] + shX(elbow[1]), elbow[1] + bob];
      const h = [hand[0] + shX(hand[1]), hand[1] + bob];
      const s = back ? C.shade(sleeve, -0.3) : sleeve;
      // a dark seam behind the near arm so it reads against the torso
      if (!back) { stroke(sh[0] - 1, sh[1], e[0] - 1, e[1], C.shade(sleeve, -0.45)); stroke(e[0] - 1, e[1], h[0] - 1, h[1], shortSleeve ? skinD : C.shade(sleeve, -0.45)); }
      stroke(sh[0], sh[1], e[0], e[1], s);
      stroke(e[0], e[1], h[0], h[1], shortSleeve ? (back ? skinD : skin) : s);
      const fist = !back && p.fist;
      if (p.hideHands) { px(h[0], h[1] + 1, C.shade(sleeve, -0.5)); return; }
      rect(h[0] - 1, h[1], fist ? 3 : 2, fist ? 3 : 2, back ? skinD : skin);
      if (fist) px(h[0] + 1, h[1], skinL);
    };
    const drawLeg = (leg, back) => {
      const [knee, ankle] = leg;
      const hip = [8 + (back ? -1 : 1), hipY];
      const col = outfit === 4 ? (back ? outD : out) : back ? pantsD : pants;
      stroke(hip[0], hip[1], knee[0], knee[1], col);
      stroke(knee[0], knee[1], ankle[0], ankle[1], col);
      // shoe, toe pointing forward
      const sc = back ? '#3e281e' : '#5a3a2a';
      rect(ankle[0] - 1, ankle[1], 3, 2, sc);
      px(ankle[0] + 1, ankle[1] + 1, back ? '#2a1a14' : '#3e281e');
      if (!back) px(ankle[0] - 1, ankle[1], '#7a523a');
    };

    // ---------------- back layers ----------------
    const hy = shoulderY - 8;           // head top (chin rests on the shoulders)
    const hx = 4 + shX(hy + 4);         // head left
    // hair that hangs behind the body (or, falling, streams straight up)
    const wph = p.windPh || 0, wob = (i) => ((i + wph) % 4 === 0 ? -1 : (i + wph) % 4 === 2 ? 1 : 0);
    if (hs === 2) { if (p.wind) for (let y = 0; y < 9; y++) rect(hx - 1 + wob(y >> 1), hy - 7 + y, 4, 1, hairD); else rect(hx - 1, hy + 2, 4, 10, hairD); }
    if (hs === 3) { if (p.wind) { rect(hx - 1, hy - 3, 3, 3, hairD); for (let y = 0; y < 5; y++) rect(hx - 1 + wob(y), hy - 4 - y, 2, 1, hairD); px(hx, hy - 1, '#ffd34d'); } else { const w = p.whip || 0; rect(hx - 3 - w, hy + 2, 4, 2, hairD); rect(hx - 3 - w * 2, hy + 4, 2, 4 - w, hairD); px(hx, hy + 2, '#ffd34d'); } }
    if (hs === 7) {
      for (let y = -2; y <= 9; y++) for (let x = -2; x <= 10; x++) {
        const dx = x - 3.8, dy = y - 3.5;
        if (dx * dx + dy * dy <= 36) px(hx + x, hy + y, (x * 3 + y) % 4 === 0 ? hairD : hair);
      }
    }
    if (outfit === 1) rect(hx - 1, hy + 2, 4, 8, outD); // hood
    if (outfit === 6) { if (p.wind) { for (let y = 0; y < 6; y++) rect(sx - 4 + wob(y), shoulderY - 1 - y, 2, 1, '#9a2a2a'); } else { const w = p.whip || 0; rect(sx - 5 - w, shoulderY + 1, 4, 2, '#9a2a2a'); px(sx - 6 - w * 2, shoulderY + 3, '#9a2a2a'); } } // scarf tail

    drawArm(p.BA, true);
    if (!p.noLegs) { drawLeg(p.BL, true); drawLeg(p.FL, false); }

    // ---------------- torso ----------------
    for (let y = shoulderY; y <= hipY; y++) {
      const off = shX(y);
      const narrow = fem && y === shoulderY + 3 ? 1 : 0;
      for (let x = 5 + narrow; x <= 10 - narrow; x++) {
        let col = out;
        if (x <= 6) col = outD;                         // back side in shadow
        else if (x === 10 - narrow) col = outL;          // front rim light
        if (y === shoulderY && (x === 5 || x === 10)) continue; // rounded shoulders
        px(x + off, y, col);
      }
    }
    const T = (x, y, col) => px(x + shX(y), y, col);
    switch (outfit) {
      case 0: // tunic: belt + hem over the hips
        for (let x = 5; x <= 10; x++) T(x, hipY - 1, '#6a4a2e');
        T(9, hipY - 1, '#ffd34d');
        for (let x = 5; x <= 10; x++) T(x, hipY + 1, x <= 6 ? outD : out);
        T(9, shoulderY, skin); T(8, shoulderY, skinD);
        break;
      case 1: // hoodie: pocket + drawstring
        for (let x = 7; x <= 9; x++) { T(x, hipY - 2, outD); T(x, hipY - 1, outD); }
        T(10, shoulderY + 1, WHITE); T(10, shoulderY + 2, WHITE);
        break;
      case 2: // robe: long skirt + sash
        for (let y = hipY; y <= 21; y++) for (let x = 4; x <= 11; x++) px(x + shX(y), y, x <= 5 ? outD : x === 11 ? outL : out);
        for (let x = 5; x <= 10; x++) T(x, shoulderY + 3, outL);
        break;
      case 3: // vest over a shirt: white front
        for (let y = shoulderY; y <= hipY; y++) { T(9, y, WHITE); T(10, y, '#d8d4e8'); }
        T(8, shoulderY + 2, '#ffd34d'); T(8, shoulderY + 4, '#ffd34d');
        break;
      case 4: // overalls: shirt shoulders, bib
        for (let x = 5; x <= 10; x++) { T(x, shoulderY, '#d8d0c0'); T(x, shoulderY + 1, '#c8c0b0'); }
        T(9, shoulderY, out); T(9, shoulderY + 1, out); T(9, shoulderY + 2, '#ffd34d');
        break;
      case 5: // dress: flared skirt
        for (let y = hipY - 1; y <= 19; y++) {
          const w = Math.min(3, y - hipY + 2);
          for (let x = 5 - w; x <= 10 + w; x++) px(x + shX(y), y, x <= 6 - w ? outD : y === 19 ? outD : out);
        }
        break;
      case 6: // adventurer: open jacket over dark shirt + scarf
        for (let y = shoulderY + 1; y <= hipY; y++) { T(9, y, '#3a3040'); T(10, y, '#4a3e52'); }
        for (let x = 6; x <= 10; x++) { T(x, shoulderY, '#c83a3a'); T(x, shoulderY - 1, '#c83a3a'); }
        T(10, shoulderY, '#e85a5a');
        break;
    }

    // armour (bought at the HQ): a chest plate + shoulder pad over the outfit
    if (look.armor) {
      const A = look.armor, AD = C.shade(A, -0.35), AL = C.shade(A, 0.35);
      for (let y = shoulderY; y <= hipY - 1; y++) for (let x = 5; x <= 10; x++) {
        if (y === shoulderY && (x === 5 || x === 10)) continue;
        T(x, y, x <= 6 ? AD : x === 10 ? AL : y === hipY - 1 ? AD : A);
      }
      T(8, shoulderY + 2, AL); T(9, shoulderY + 1, AL);
      for (let x = 7; x <= 10; x++) T(x, shoulderY - 1, x === 10 ? AL : A);
    }
    drawArm(p.FA, false);
    if (p.guard) { // forearm guard flash line
      const g = p.FA[1];
      px(g[0] + 1 + shX(g[1]), g[1] + bob, WHITE);
    }

    // ---------------- head ----------------
    const HEAD = ['.XXXXXX.', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXXX', '..XXXXX.'];
    HEAD.forEach((row, y) => { for (let x = 0; x < 8; x++) if (row[x] === 'X') px(hx + x, hy + y, x === 0 ? skinD : skin); });
    px(hx + 2, hy + 4, C.shade(skin, -0.12));               // ear
    if (p.eyesClosed) {
      px(hx + 5, hy + 4, C.shade(skin, -0.5)); px(hx + 6, hy + 4, C.shade(skin, -0.5));
    } else {
      px(hx + 5, hy + 3, WHITE); px(hx + 5, hy + 4, WHITE);
      px(hx + 6, hy + 3, eye); px(hx + 6, hy + 4, C.shade(eye, -0.5));
    }
    if (fem) { px(hx + 7, hy + 3, OUTLINE); px(hx + 5, hy + 5, C.mix(skin, '#ff7a8a', 0.4)); }
    if (p.mouthOpen) { px(hx + 6, hy + 6, '#7a2a2a'); px(hx + 7, hy + 6, '#7a2a2a'); }
    else px(hx + 7, hy + 6, C.shade(skin, -0.3));

    // ---------------- hair (on top) ----------------
    const H = (x, y, col) => px(hx + x, hy + y, col || hair);
    const cap = () => {
      for (let x = 1; x <= 6; x++) H(x, -1);
      for (let x = 0; x <= 7; x++) { H(x, 0); H(x, 1); }
      for (let y = 2; y <= 3; y++) for (let x = 0; x <= 2; x++) H(x, y, x === 0 ? hairD : hair);
      H(7, 2); H(6, 2);                       // fringe
      H(2, -1, hairL); H(3, -1, hairL); H(3, 0, hairL);
      H(-1, 1, hairD); H(-1, 2, hairD);
    };
    switch (hs) {
      case 0: cap(); break;
      case 1: cap(); H(1, -2); H(2, -3, hairD); H(3, -2); H(4, -3); H(5, -2); H(6, -2, hairD); H(-1, 0); H(-2, 0, hairD); break;
      case 2: cap(); H(0, 4, hairD); H(0, 5, hairD); H(1, 4); break;
      case 3: cap(); break;
      case 4: cap(); for (let y = -3; y <= -1; y++) for (let x = -1; x <= 1; x++) H(x, y, y === -3 && x === 1 ? hairL : hair); break;
      case 5: for (let y = -3; y <= 0; y++) for (let x = 2; x <= 6; x++) H(x, y, y === -3 ? hairL : x === 2 ? hairD : hair); H(1, 1, skinD); break;
      case 6: cap(); H(7, 3); H(6, 3); H(0, 4, hairD); H(1, 4); H(5, 2); break;
      case 7: cap(); break;
      case 8: px(hx + 3, hy + 1, C.shade(skin, 0.35)); break;
    }
    // freefall: the rest of the hair gets blown up off your head too
    if (p.wind && hs !== 8 && hs !== 5) {
      [[1, -2], [2, -3], [3, -2], [4, -3], [5, -2], [6, -2]].forEach(([x, y], i) => { H(x + wob(i), y, i % 2 ? hairL : hair); if ((i + wph) % 2) H(x + wob(i + 1), y - 1, hairD); });
    }
    // optional headwear (NPCs): a miner's hard hat with a headlamp
    if (look.hat === 'hard') {
      for (let x = 0; x <= 7; x++) { H(x, -2, '#e8c040'); H(x, -1, '#e8c040'); H(x, 0, x < 3 ? '#f8e070' : '#d8a830'); }
      for (let x = 1; x <= 6; x++) H(x, -3, '#e8c040');
      H(2, -3, '#fff0a0');
      for (let x = -1; x <= 8; x++) H(x, 1, '#b88a20');
      H(7, -1, '#ffffff'); H(8, -1, '#fff6b0');
    }
    b.outline(c32(OUTLINE));
    return b;
  }

  /** Rotate a buffer 90 degrees clockwise (exact for pixel art) — lying down. */
  function rotate90(buf) {
    const r = new PB(buf.h, buf.w);
    for (let y = 0; y < buf.h; y++) for (let x = 0; x < buf.w; x++) r.data[x * r.w + (buf.h - 1 - y)] = buf.data[y * buf.w + x];
    return r;
  }

  /** Round a joint set so it can be painted (and cached by its exact pixels). */
  function roundJoints(j) {
    const r = (pt) => [Math.round(pt[0]), Math.round(pt[1])];
    return Object.assign({}, STAND, j, {
      bob: Math.round(j.bob || 0), lean: Math.round(j.lean || 0),
      FL: [r(j.FL[0]), r(j.FL[1])], BL: [r(j.BL[0]), r(j.BL[1])], FA: [r(j.FA[0]), r(j.FA[1])], BA: [r(j.BA[0]), r(j.BA[1])],
    });
  }
  const jointKey = (p) => [p.bob, p.lean, p.FL, p.BL, p.FA, p.BA, p.fist ? 1 : 0, p.hideHands ? 1 : 0, p.noLegs ? 1 : 0, p.eyesClosed ? 1 : 0, p.mouthOpen ? 1 : 0, p.guard ? 1 : 0, p.wind ? 1 + (p.windPh || 0) : 0].join('|');

  const PlayerSide = {
    W: 26, H: 29,
    STAND, POSES,
    /** The joint set behind a named pose frame. */
    poseOf(pose, frame) { const set = POSES[pose === 'walk' ? 'run' : pose] || POSES.idle; return set[(frame || 0) % set.length]; },

    /** A frame for any joint set (floats are rounded; cached by the rounded pixels). */
    frameJoints(look, joints, facing = 1) {
      const p = roundJoints(joints);
      const key = ['J', look.gender, look.skin, look.hair, look.hairColor, look.eyes, look.outfit, look.outfitColor, look.pants, look.hat || '', look.armor || '', jointKey(p), facing].join(',');
      let cv = cache.get(key);
      if (!cv) {
        cv = paintPose(look, p).toCanvas();
        if (facing < 0) cv = ERX.Sprites.mirror(cv);
        cache.set(key, cv);
        if (cache.size > 2400) cache.delete(cache.keys().next().value);
      }
      return cv;
    },

    /**
     * Body points for a joint set, relative to the feet anchor (grid px, facing right):
     * eye, cheek, headTop, chest, handF, handB, footF, footB.
     */
    points(j) {
      const p = roundJoints(j);
      const shX = (y) => Math.round((p.lean * (16 - y)) / 5);
      const shoulderY = 11 + p.bob, hy = shoulderY - 8, hx = 4 + shX(hy + 4);
      const ax = 8, ay = 23;
      const pt = (x, y) => ({ dx: x - ax, dy: y - ay });
      const hand = (h) => pt(h[0] + shX(h[1]), h[1] + p.bob);
      return {
        eye: pt(hx + 6, hy + 3), cheek: pt(hx + 6, hy + 5), headTop: pt(hx + 4, hy - 1), mouth: pt(hx + 7, hy + 6),
        chest: pt(8 + shX(shoulderY + 3), shoulderY + 3), handF: hand(p.FA[1]), handB: hand(p.BA[1]),
        footF: pt(p.FL[1][0], p.FL[1][1] + 1), footB: pt(p.BL[1][0], p.BL[1][1] + 1),
      };
    },
    ANCHOR: { x: OX + 8, y: OY + 23 },
    FRAMES: Object.fromEntries(Object.keys(POSES).map((k) => [k, POSES[k].length])),

    frame(look, pose = 'idle', frame = 0, facing = 1) {
      if (pose === 'walk') pose = 'run';
      const key = [look.gender, look.skin, look.hair, look.hairColor, look.eyes, look.outfit, look.outfitColor, look.pants, look.hat || '', look.armor || '', pose, frame, facing].join(',');
      let cv = cache.get(key);
      if (!cv) {
        const buf = pose === 'lie' ? rotate90(paint(look, 'hurt', 0)) : paint(look, pose, frame);
        cv = buf.toCanvas();
        if (facing < 0) cv = ERX.Sprites.mirror(cv);
        cache.set(key, cv);
        if (cache.size > 800) cache.delete(cache.keys().next().value);
      }
      return cv;
    },

    /** Draw so the feet (or the body, when lying) sit on (x, y). */
    draw(ctx, cv, x, y, facing = 1, lying = false) {
      if (lying) {
        ctx.drawImage(cv, Math.round(x - cv.width / 2), Math.round(y - cv.height + 7));
        return;
      }
      const ax = facing < 0 ? cv.width - 1 - this.ANCHOR.x : this.ANCHOR.x;
      ctx.drawImage(cv, Math.round(x - ax), Math.round(y - this.ANCHOR.y - 1));
    },
  };

  ERX.PlayerSide = PlayerSide;
})(window.ERX = window.ERX || {});
