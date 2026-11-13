/*
 * GOBLINS: hunched, big-eared little brutes, in three kinds.
 *   club     the plain goblin: a ragged tunic and a spiked club
 *   thrower  a red bandana, a pouch of rocks, and a rock in its fist
 *   mage     a hooded cloak (ears poking out), and a staff with a mana crystal
 *
 * Built like the player (js/render/player-side.js): every frame is a set of
 * joints (knees, ankles, elbows, hands) plus a body bob / lean, limbs are 2px
 * strokes between joints, and one ink outline wraps the lot. The weapon
 * follows the front hand, and the ears flop a beat behind the body. All three
 * kinds share the body poses (idle, walk, alert, hurt, air); each adds its own
 * attack poses.
 *
 *   ERX.GoblinSprite.frame(pose, frame, facing, skin, kind) -> canvas (W x H), cached
 *   ERX.GoblinSprite.paint(pose, frame, skin, kind)          -> raw PixelBuffer, facing right
 *   ERX.GoblinSprite.point(kind, pose, frame, what)          -> { dx, dy } from ANCHOR, facing right
 *       what: 'hand' (where a held rock is) or 'tip' (the mage's crystal)
 *   ERX.GoblinSprite.rock(frame) / mana(frame) / bomb(lit)   -> projectile canvases
 *   ERX.GoblinSprite.ANCHOR  the pixel between the feet (facing right)
 *
 * Poses (all kinds): idle(2) walk(6) alert hurt air(2)
 *   club: windup(3) swing(3)   thrower: throw(3)   mage: cast(2) shoot drop
 * Grid: facing right, feet on row 23. The body is 22px tall, the same as you.
 */
(function (ERX) {
  'use strict';

  const PB = ERX.PixelBuffer, C = ERX.Color;
  const cache = new Map();
  const W = 36, H = 28, OX = 6, OY = 3;
  const INK = '#120c16';
  const SKIN = '#6aa84a';

  const WOOD = '#8e6034', WOOD_D = '#5a3a20', WOOD_L = '#b8844c';
  const CLOTH = '#7a5030', CLOTH_D = '#56361e', CLOTH_L = '#9a6a40';
  const PATCH = '#9a8a52', ROPE = '#b08a4a', POUCH = '#c89a62', POUCH_D = '#94683c';
  const METAL = '#d8dce8', METAL_D = '#8a8ea0';
  const EYE = '#ffe04a', PUPIL = '#1a0e10', MOUTH = '#3a1218', TOOTH = '#f2ead2';
  const ROCK = '#9a9aa8', ROCK_D = '#5e5e6c', ROCK_L = '#c8c8d4';
  const BAND = '#d23a3a', BAND_D = '#8a2020', BAND_L = '#ff7a6a';
  const CLOAK = '#34408a', CLOAK_D = '#222a5e', CLOAK_DD = '#161a40', CLOAK_L = '#4e5cb0', TRIM = '#d8b050';
  const MANA = '#c060ff', MANA_D = '#7a2ad0', MANA_L = '#f0c8ff';

  // ------------------------------------------------------------- poses
  // F = front (near) limb, B = back (far) limb. Each limb: [knee/elbow, ankle/hand].
  // club: the club's angle in degrees (0 = forward, 90 = straight down, -90 = up, 180 = back).
  // behind: the weapon arm is drawn behind the head (wound back over the shoulder).
  // rock: false once the thrower has let go. staff: the mage's staff angle (defaults upright).
  // glow: the mage's crystal flaring (1, 2). smear: a motion arc (1 club swing, 2 throw).
  const STAND = {
    bob: 0, lean: 0, ear: 0, face: 'grin',
    FL: [[10, 20], [10, 22]], BL: [[7, 20], [6, 22]],
    FA: [[12, 14], [13, 15]], BA: [[6, 14], [6, 16]],
    club: 6, behind: false, smear: 0, glow: 0,
  };
  const P = (o) => Object.assign({}, STAND, o);

  // body poses every goblin shares
  const BODY = {
    idle: [
      P({}),
      P({ bob: 1, ear: 1, club: 12 }),
    ],
    walk: [
      P({ bob: 1, ear: -1, FL: [[11, 19], [12, 22]], BL: [[6, 20], [4, 22]], FA: [[11, 14], [12, 15]], BA: [[8, 14], [9, 16]], club: 16 }),
      P({ bob: 0, ear: 0, FL: [[10, 20], [10, 22]], BL: [[7, 19], [6, 21]], FA: [[12, 14], [12, 15]], BA: [[7, 14], [8, 16]], club: 10 }),
      P({ bob: -1, ear: 1, FL: [[9, 20], [8, 22]], BL: [[9, 18], [9, 21]], FA: [[12, 14], [13, 15]], BA: [[6, 14], [6, 16]], club: 4 }),
      P({ bob: 1, ear: -1, BL: [[11, 19], [12, 22]], FL: [[6, 20], [4, 22]], FA: [[12, 14], [14, 15]], BA: [[6, 14], [5, 16]], club: 0 }),
      P({ bob: 0, ear: 0, BL: [[10, 20], [10, 22]], FL: [[7, 19], [6, 21]], FA: [[12, 14], [13, 15]], BA: [[6, 14], [6, 16]], club: 4 }),
      P({ bob: -1, ear: 1, BL: [[9, 20], [8, 22]], FL: [[9, 18], [9, 21]], FA: [[12, 14], [12, 15]], BA: [[7, 14], [8, 16]], club: 10 }),
    ],
    // spotted you: a startled hop, weapon up, ears pricked
    alert: [P({ bob: -1, lean: -1, ear: -1, face: 'snarl', FL: [[11, 19], [11, 21]], BL: [[7, 19], [6, 21]], FA: [[12, 11], [13, 8]], BA: [[5, 12], [4, 10]], club: -45 })],
    hurt: [P({ lean: -2, ear: 1, face: 'ouch', FL: [[10, 19], [11, 22]], BL: [[6, 19], [5, 22]], FA: [[12, 12], [14, 10]], BA: [[5, 12], [3, 10]], club: -30 })],
    air: [
      // rising: the ears trail down
      P({ bob: -1, ear: 1, FL: [[11, 18], [11, 21]], BL: [[7, 19], [6, 21]], FA: [[11, 13], [13, 14]], BA: [[6, 13], [4, 14]], club: 20 }),
      // falling: ears blown up, arms out
      P({ ear: -1, FL: [[11, 19], [12, 21]], BL: [[6, 19], [5, 22]], FA: [[12, 12], [14, 11]], BA: [[5, 12], [3, 11]], club: -20 }),
    ],
  };

  const POSES = {
    club: Object.assign({}, BODY, {
      windup: [
        // gathering: knees bend, the club comes up beside the head
        P({ bob: 1, lean: -1, face: 'snarl', FL: [[11, 20], [12, 22]], BL: [[6, 20], [4, 22]], FA: [[10, 11], [9, 8]], BA: [[8, 14], [10, 15]], club: -100, behind: true }),
        // wound right back and trembling (two frames a pixel apart)
        P({ bob: 1, lean: -2, ear: 1, face: 'snarl', FL: [[11, 20], [12, 22]], BL: [[6, 20], [4, 22]], FA: [[8, 11], [6, 9]], BA: [[9, 14], [11, 14]], club: -150, behind: true }),
        P({ bob: 1, lean: -2, ear: 0, face: 'snarl', FL: [[11, 20], [12, 22]], BL: [[6, 20], [4, 22]], FA: [[8, 11], [6, 8]], BA: [[9, 14], [11, 15]], club: -145, behind: true }),
      ],
      swing: [
        // the strike: lunging, the club whipping over at head height (with a smear)
        P({ lean: 2, face: 'snarl', FL: [[12, 19], [13, 22]], BL: [[6, 20], [3, 22]], FA: [[12, 11], [15, 12]], BA: [[6, 14], [4, 15]], club: 15, smear: 1 }),
        // impact: the club slammed into the ground in front
        P({ bob: 1, lean: 2, ear: 1, FL: [[12, 19], [13, 22]], BL: [[6, 20], [3, 22]], FA: [[12, 14], [14, 16]], BA: [[6, 14], [4, 16]], club: 50 }),
        // hauling it back up
        P({ lean: 1, FL: [[11, 19], [12, 22]], BL: [[6, 20], [4, 22]], FA: [[11, 14], [13, 16]], BA: [[6, 14], [5, 16]], club: 62 }),
      ],
    }),
    thrower: Object.assign({}, BODY, {
      throw: [
        // wound back, the rock cocked behind its head
        P({ bob: 1, lean: -1, ear: 1, face: 'snarl', FL: [[12, 20], [13, 22]], BL: [[6, 20], [4, 22]], FA: [[8, 10], [5, 8]], BA: [[11, 13], [13, 12]], behind: true }),
        // the release: arm whipped over and forward, hand open
        P({ lean: 2, face: 'snarl', FL: [[12, 19], [13, 22]], BL: [[6, 20], [3, 22]], FA: [[13, 11], [16, 10]], BA: [[6, 13], [4, 14]], rock: false, smear: 2 }),
        // follow-through
        P({ lean: 1, FL: [[11, 19], [12, 22]], BL: [[6, 20], [4, 22]], FA: [[13, 14], [15, 16]], BA: [[6, 14], [5, 16]], rock: false }),
      ],
    }),
    // the mage holds its staff out in front: the body poses, with the hand a little further forward
    mage: Object.assign(
      Object.fromEntries(Object.entries(BODY).map(([k, set]) => [k, set.map((p) => P(Object.assign({}, p, { FA: [[p.FA[0][0] + 1, p.FA[0][1]], [p.FA[1][0] + 2, p.FA[1][1]]] })))])),
      {
        // chanting: staff raised high, the crystal flaring (two frames: it pulses)
        cast: [
          P({ lean: -1, face: 'cast', FL: [[11, 20], [11, 22]], BL: [[7, 20], [5, 22]], FA: [[12, 12], [14, 11]], BA: [[9, 13], [11, 12]], staff: -88, glow: 1 }),
          P({ lean: -1, ear: 1, face: 'cast', FL: [[11, 20], [11, 22]], BL: [[7, 20], [5, 22]], FA: [[12, 12], [14, 10]], BA: [[9, 13], [11, 13]], staff: -86, glow: 2 }),
        ],
        // the bolt flies: staff thrust forward
        shoot: [P({ lean: 2, face: 'snarl', FL: [[12, 19], [13, 22]], BL: [[6, 20], [3, 22]], FA: [[13, 12], [16, 12]], BA: [[6, 14], [4, 15]], staff: -12, glow: 2 })],
        // crouched, setting a mana bomb down at its feet
        drop: [P({ bob: 2, lean: 1, face: 'snarl', FL: [[12, 21], [12, 22]], BL: [[5, 21], [4, 22]], FA: [[13, 15], [15, 17]], BA: [[10, 17], [12, 20]], staff: -72 })],
      },
    ),
  };
  const posesOf = (kind) => POSES[kind] || POSES.club;
  /** The mage's staff angle: upright, swaying a touch with the club angle the body poses carry. */
  const staffAngle = (p) => (p.staff !== undefined ? p.staff : -80 + (p.club - 8) * 0.25);
  const STAFF_TIP = 11;

  // The head, facing right. s skin, d shade, l light, b brow.
  // Eyes, nose and mouth are painted on top (they change with the face).
  const HEAD = [
    '...llll...',
    '..lsssss..',
    '.dsssssss.',
    'ddsssbbbb.',
    'ddssssss..',
    'ddsssssss.',
    '.dssssssd.',
    '.ddsssss..',
    '..ddsss...',
  ];
  // The near ear, relative to the head's top-left: a long leaf that grows out
  // of the side of the head (3px tall at the root) and tapers back and up to
  // a point. Everything left of x = -3 is the tip, which flops with p.ear.
  const EAR = [
    [-6, 0],
    [-5, 1], [-4, 1],
    [-4, 2], [-3, 2], [-2, 2], [-1, 2], [0, 2],
    [-3, 3], [-2, 3], [-1, 3], [0, 3], [1, 3], [2, 3], [3, 3],
    [-1, 4], [0, 4], [1, 4], [2, 4], [3, 4],
    [1, 5], [2, 5], [3, 5],
  ];
  const EAR_INNER = [[-2, 3], [-1, 3], [0, 3], [1, 4], [2, 4]];
  /**
   * The mage's hood, relative to the head's top-left: over the crown (a brim
   * jutting over the brow), down the back of the head and onto the shoulders,
   * leaving the face open from x = 4. Returns its colour there, or null.
   */
  function hoodAt(x, y) {
    const inHood = (y === -1 && x >= 2 && x <= 6) || (y === 0 && x >= 1 && x <= 7) || (y === 1 && x >= 0 && x <= 8) ||
      (y === 2 && x >= -1 && x <= 9) || (y >= 3 && y <= 8 && x >= -1 && x <= 3) || (y >= 9 && y <= 10 && x >= -2 && x <= 3);
    if (!inHood) return null;
    if ((y === 2 && x >= 3) || (x === 3 && y >= 3 && y <= 8)) return TRIM;   // a gold rim round the face
    if (x <= 0) return CLOAK_D;
    return y <= 0 ? CLOAK_L : CLOAK;
  }

  function paintPose(skin, p, kind) {
    const mage = kind === 'mage', thrower = kind === 'thrower';
    const b = new PB(W, H);
    const S = skin, SD = C.shade(skin, -0.28), SDD = C.shade(skin, -0.52), SL = C.shade(skin, 0.25);
    const INNER = C.mix(SD, '#c0504a', 0.45);

    const px = (x, y, col) => b.set(Math.round(x) + OX, Math.round(y) + OY, C.u32(col));
    const rect = (x, y, w, h, col) => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) px(x + xx, y + yy, col); };
    /** 2px-wide limb stroke between two grid points (same as the player's). */
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
    const shX = (y) => Math.round((lean * (17 - y)) / 5);
    const hipY = 17 + Math.max(0, bob);
    const shoulderY = 11 + bob;

    const armPts = (arm, back) => {
      const sh = [8 + (back ? -1 : 1) + shX(shoulderY), shoulderY + 1];
      const e = [arm[0][0] + shX(arm[0][1]), arm[0][1] + bob];
      const h = [arm[1][0] + shX(arm[1][1]), arm[1][1] + bob];
      return [sh, e, h];
    };
    const drawHand = (h, back) => { rect(h[0] - 1, h[1], 2, 2, back ? SD : S); if (!back) px(h[0], h[1], SL); };
    const drawArm = (arm, back) => {
      const [sh, e, h] = armPts(arm, back);
      // the mage's arms are in its cloak's sleeves
      const col = mage ? (back ? CLOAK_D : CLOAK) : back ? SD : S;
      if (!back) {   // a seam so the near arm reads against the body
        stroke(sh[0] - 1, sh[1], e[0] - 1, e[1], mage ? CLOAK_DD : SDD);
        stroke(e[0] - 1, e[1], h[0] - 1, h[1], mage ? CLOAK_D : SD);
      }
      stroke(sh[0], sh[1], e[0], e[1], col);
      stroke(e[0], e[1], h[0], h[1], col);
      drawHand(h, back);
    };
    const drawClub = () => {
      const [, , h] = armPts(p.FA, false);
      const a = (p.club * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
      const at = (t, o) => [h[0] + ca * t - sa * o, h[1] + 1 + sa * t + ca * o];
      // the handle
      for (let t = -1.5; t <= 3.5; t += 0.5) { const [x, y] = at(t, 0); px(x, y, WOOD_D); }
      // the knobbly head, light on one side, dark on the other
      for (let t = 3.5; t <= 7.5; t += 0.5) {
        const r = t < 4.5 ? 0.6 : t > 6.8 ? 0.9 : 1.3;
        for (let o = -r; o <= r + 0.01; o += 0.5) {
          const [x, y] = at(t, o);
          px(x, y, o < -0.4 ? WOOD_L : o > 0.4 ? WOOD_D : WOOD);
        }
      }
      // two nails hammered through it
      const n1 = at(6, -1.9), n2 = at(5, 1.9);
      px(n1[0], n1[1], METAL); px(n2[0], n2[1], METAL_D);
    };
    const drawRock = () => {
      if (p.rock === false) return;
      const [, , h] = armPts(p.FA, false);
      const x = h[0] + 1, y = h[1] - 1;
      rect(x, y, 3, 3, ROCK);
      px(x, y, ROCK_L); px(x + 1, y, ROCK_L);
      px(x + 2, y + 1, ROCK_D); px(x + 1, y + 2, ROCK_D); px(x + 2, y + 2, ROCK_D);
    };
    const drawStaff = () => {
      const [, , h] = armPts(p.FA, false);
      const a = (staffAngle(p) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
      const at = (t, o) => [h[0] + ca * t - sa * (o || 0), h[1] + 1 + sa * t + ca * (o || 0)];
      for (let t = -6; t <= STAFF_TIP - 2; t += 0.5) { const [x, y] = at(t); px(x, y, t < -3 ? WOOD_D : WOOD); }
      // two prongs cradling the crystal
      for (const o of [-1.4, 1.4]) { const [x, y] = at(STAFF_TIP - 1.6, o); px(x, y, WOOD_D); }
      // the crystal: a little diamond, lit from the top
      const [cx, cy] = at(STAFF_TIP).map(Math.round);
      px(cx, cy - 2, MANA_L);
      px(cx - 1, cy - 1, MANA); px(cx, cy - 1, MANA_L); px(cx + 1, cy - 1, MANA);
      px(cx - 1, cy, MANA_D); px(cx, cy, MANA); px(cx + 1, cy, MANA_D);
      px(cx, cy + 1, MANA_D);
    };
    const drawWeapon = () => (mage ? drawStaff() : thrower ? drawRock() : drawClub());
    const drawLeg = (leg, back) => {
      const [knee, ankle] = leg;
      const hip = [8 + (back ? -1 : 1), hipY];
      const col = back ? SD : S;
      stroke(hip[0], hip[1], knee[0], knee[1], col);
      stroke(knee[0], knee[1], ankle[0], ankle[1], col);
      // a big bare foot, toes forward, with a claw
      rect(ankle[0] - 1, ankle[1], 3, 1, col);
      rect(ankle[0] - 1, ankle[1] + 1, 4, 1, back ? SDD : SD);
      px(ankle[0] + 3, ankle[1] + 1, back ? '#b8b098' : TOOTH);
    };

    // ---------------- back layers ----------------
    const hy = shoulderY - 8, hx = 6 + shX(hy + 5);
    drawArm(p.BA, true);
    drawLeg(p.BL, true);
    drawLeg(p.FL, false);

    // ---------------- torso ----------------
    const T = (x, y, col) => px(x + shX(y), y, col);
    if (mage) {
      // a cloak from the shoulders to just above the ankles, flaring with the stride
      const ankles = [p.FL[1][0], p.BL[1][0]];
      const hemY = 21, hemF = Math.max(11, Math.max(...ankles) + 1), hemB = Math.min(5, Math.min(...ankles) - 1);
      for (let y = shoulderY; y <= hemY; y++) {
        const k = (y - shoulderY) / (hemY - shoulderY);
        const x0 = Math.round(6 - k * (6 - hemB)) - (y === shoulderY ? 0 : 1), x1 = Math.round(10 + k * (hemF - 10));
        for (let x = x0; x <= x1; x++) {
          let col = x <= x0 + 1 ? CLOAK_D : x === x1 ? CLOAK_L : CLOAK;
          if (y === hemY) col = TRIM;                                    // a gold hem
          else if (y > hipY && x === Math.round((x0 + x1) / 2)) col = CLOAK_D;   // a fold below the waist
          px(x + shX(y), y, col);
        }
      }
      for (let x = 5; x <= 11; x++) T(x, hipY - 1, x === 11 ? MANA_L : '#7a3a9a');   // a sash
    } else {
      // hunched back, round belly, a ragged tunic
      const xb = [7, 6, 5, 5, 5, 5, 5, 5];
      const xf = [10, 10, 10, 11, 11, 11, 10, 10];
      for (let y = shoulderY; y <= hipY; y++) {
        const r = Math.min(7, y - shoulderY), off = shX(y);
        for (let x = xb[r]; x <= xf[r]; x++) {
          let col = r === 0 ? S : CLOTH;                // bare neck, then the tunic
          if (x <= xb[r] + 1) col = r === 0 ? SD : CLOTH_D;   // back side in shadow
          else if (x === xf[r]) col = r === 0 ? SL : CLOTH_L; // belly / chest rim light
          px(x + off, y, col);
        }
      }
      // a patch on the belly, roughly stitched
      T(8, shoulderY + 3, PATCH); T(9, shoulderY + 3, PATCH); T(8, shoulderY + 4, PATCH); T(9, shoulderY + 4, C.shade(PATCH, -0.25));
      // rope belt, then the tunic's ragged hem over the hips
      for (let x = 5; x <= 11; x++) T(x, hipY - 1, x === 11 ? '#d8b060' : ROPE);
      for (let y = hipY; y <= hipY + 2; y++) {
        for (let x = 5; x <= 10; x++) {
          if (y === hipY + 2 && x % 2 === 0) continue;   // the ragged hem
          T(x, y, x <= 6 ? CLOTH_D : x === 10 ? CLOTH_L : CLOTH);
        }
      }
      if (thrower) {
        // a lumpy pouch of rocks on the back hip, one peeking out
        for (let y = hipY - 3; y <= hipY; y++) for (let x = 3; x <= 5; x++) T(x, y, x === 3 || y === hipY ? POUCH_D : POUCH);
        T(3, hipY - 3, CLOTH_D); T(4, hipY - 3, CLOTH_D); T(5, hipY - 3, CLOTH_D);   // the drawstring
        T(4, hipY - 4, ROCK_L); T(5, hipY - 4, ROCK);
      }
    }

    // a weapon wound back goes behind the head; otherwise the arm is in front
    if (p.behind) { drawWeapon(); drawArm(p.FA, false); }

    // ---------------- head ----------------
    HEAD.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        px(hx + x, hy + y, ch === 'd' ? SD : ch === 'l' ? SL : ch === 'b' ? SDD : S);
      }
    });
    if (mage) {
      // the hood over the crown and down the back, with a gold rim round the face
      for (let y = -1; y <= 10; y++) for (let x = -2; x <= 9; x++) { const col = hoodAt(x, y); if (col) px(hx + x, hy + y, col); }
    }
    if (thrower) {
      // a red bandana tied over the crown, knotted at the back
      for (let x = 2; x <= 7; x++) px(hx + x, hy, x <= 3 ? BAND_D : BAND);
      for (let x = 1; x <= 8; x++) px(hx + x, hy + 1, x <= 2 ? BAND_D : x >= 6 ? BAND_L : BAND);
      for (let x = 1; x <= 8; x++) px(hx + x, hy + 2, x <= 2 ? BAND_D : BAND);
      px(hx + 4, hy + 1, '#ffffff'); px(hx + 6, hy + 2, '#ffffff');   // spots
      px(hx, hy + 1, BAND_D); px(hx - 1, hy, BAND); px(hx - 2, hy - 1 + Math.max(0, p.ear), BAND_D);   // the knot and its tail
    }
    // the near ear: rim-lit on top, shaded underneath, pink-brown inside,
    // and a dark crease where it meets the face (it pokes out through the mage's hood)
    const ear = EAR.map(([x, y]) => [x, y + (x <= -4 ? p.ear : 0)]);
    const inEar = (x, y) => ear.some(([ex, ey]) => ex === x && ey === y);
    for (const [x, y] of ear) px(hx + x, hy + y, !inEar(x, y - 1) ? SL : !inEar(x, y + 1) ? SD : S);
    for (const [x, y] of EAR_INNER) px(hx + x, hy + y, INNER);
    if (!mage) { px(hx + 4, hy + 3, SD); px(hx + 4, hy + 4, SD); }
    // a long, hooked nose
    px(hx + 8, hy + 4, S); px(hx + 9, hy + 4, SL);
    px(hx + 9, hy + 5, S); px(hx + 10, hy + 5, SL); px(hx + 11, hy + 5, S);
    px(hx + 10, hy + 6, SD); px(hx + 11, hy + 6, SD);
    px(hx + 9, hy + 6, SDD);   // nostril
    // eyes + mouth
    const face = p.face;
    if (face === 'ouch') {
      px(hx + 6, hy + 4, SDD); px(hx + 7, hy + 4, SDD); px(hx + 6, hy + 3, SDD);
      px(hx + 6, hy + 7, MOUTH); px(hx + 7, hy + 7, MOUTH); px(hx + 6, hy + 8, MOUTH); px(hx + 7, hy + 8, MOUTH);
    } else {
      const glowEye = face === 'cast';
      px(hx + 6, hy + 4, glowEye ? MANA_L : EYE);
      px(hx + 7, hy + 4, glowEye ? '#ffffff' : face === 'snarl' ? '#c01a10' : PUPIL);
      if (face === 'snarl' || face === 'cast') {
        // mouth wide open: top fangs, dark gap, a bottom tusk
        px(hx + 4, hy + 7, SDD);
        for (let x = 5; x <= 8; x++) px(hx + x, hy + 7, MOUTH);
        px(hx + 6, hy + 7, TOOTH); px(hx + 8, hy + 7, TOOTH);
        px(hx + 6, hy + 8, MOUTH); px(hx + 7, hy + 8, TOOTH);
      } else {
        // a sly grin with one fang sticking up
        px(hx + 4, hy + 6, SDD);
        for (let x = 5; x <= 8; x++) px(hx + x, hy + 7, MOUTH);
        px(hx + 7, hy + 7, TOOTH);
      }
    }

    if (!p.behind) {
      drawWeapon();
      drawArm(p.FA, false);
      // the near hand grips over the handle
      const [, , h] = armPts(p.FA, false);
      drawHand(h, false);
    }

    b.outline(C.u32(INK));

    // ---------------- soft effects (after the outline) ----------------
    const soft = (x, y, col, a) => { const X = Math.round(x) + OX, Y = Math.round(y) + OY; if (!b.solid(X, Y)) b.set(X, Y, C.u32(col, a)); };
    // the swing smear: a pale arc where the club (or the throwing arm) just was
    if (p.smear) {
      const cx = 9 + shX(shoulderY), cy = shoulderY + 1;
      const [from, to, radii] = p.smear === 2 ? [-150, -25, [8, 9]] : [-80, 8, [11, 12, 13]];
      for (let deg = from; deg <= to; deg += 3) {
        const k = (deg - from) / (to - from), a = (deg * Math.PI) / 180;
        for (const r of radii) soft(cx + Math.cos(a) * r, cy + Math.sin(a) * r, '#ffffff', Math.round(30 + 150 * k * (r === radii[1] ? 1 : 0.55)));
      }
    }
    // the crystal flaring while the mage casts
    if (mage && p.glow) {
      const [, , h] = armPts(p.FA, false);
      const a = (staffAngle(p) * Math.PI) / 180;
      const cx = h[0] + Math.cos(a) * STAFF_TIP, cy = h[1] + 1 + Math.sin(a) * STAFF_TIP;
      for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
        const d = Math.hypot(x, y);
        if (d > 1.8 && d < 3.6) soft(cx + x, cy + y, MANA, p.glow === 2 ? 150 : 90);
      }
      if (p.glow === 2) for (const [x, y] of [[-4, -3], [4, -2], [-3, 4], [3, 4]]) soft(cx + x, cy + y, '#ffffff', 220);
    }
    return b;
  }

  function paint(pose, frame, skin, kind) {
    const set = posesOf(kind)[pose] || posesOf(kind).idle;
    return paintPose(skin || SKIN, set[(frame || 0) % set.length], kind || 'club');
  }

  // ---------------- projectiles ----------------
  /** A lumpy thrown rock, in 4 turns of a spin. */
  function rockBuf(f) {
    const shape = ['.##..', '####.', '#####', '.####', '..##.'];
    const b = new PB(7, 7);
    const rot = (x, y) => [[x, y], [4 - y, x], [4 - x, 4 - y], [y, 4 - x]][f % 4];
    shape.forEach((row, y) => {
      for (let x = 0; x < 5; x++) {
        if (row[x] !== '#') continue;
        const [rx, ry] = rot(x, y);   // the lumps turn; the light (top-left) stays put
        b.set(rx + 1, ry + 1, C.u32(rx + ry <= 3 ? ROCK_L : rx + ry >= 6 ? ROCK_D : ROCK));
      }
    });
    b.outline(C.u32(INK));
    return b;
  }
  /** A bolt of mana: a bright core in a purple glow (two flickering frames). */
  function manaBuf(f) {
    const b = new PB(7, 7);
    b.circle(3, 3, 2, C.u32(MANA));
    b.set(f ? 3 : 2, 2, C.u32('#ffffff')); b.set(f ? 2 : 3, 3, C.u32(MANA_L)); b.set(4, 4, C.u32(MANA_D));
    b.outline(C.u32(INK));
    return b;
  }
  /** A mana bomb: a dark orb with a glowing rune (lit = the rune flaring). */
  function bombBuf(lit) {
    const b = new PB(9, 9);
    b.circle(4, 4, 3, C.u32(lit ? MANA_D : CLOAK_D));
    for (const [x, y] of [[2, 2], [3, 2], [2, 3]]) b.set(x, y, C.u32(lit ? MANA : CLOAK_L));   // a glint
    // the rune: a little cross that glows
    const rune = lit ? MANA_L : MANA;
    for (const [x, y] of [[4, 3], [4, 4], [4, 5], [3, 4], [5, 4]]) b.set(x, y, C.u32(rune));
    if (lit) b.set(4, 4, C.u32('#ffffff'));
    b.outline(C.u32(INK));
    return b;
  }
  const canvasOf = (key, make) => { let cv = cache.get(key); if (!cv) { cv = make().toCanvas(); cache.set(key, cv); } return cv; };

  /** Where a held thing is for a pose, from ANCHOR (grid px, facing right). */
  function point(kind, pose, frame, what) {
    const set = posesOf(kind)[pose] || posesOf(kind).idle, p = set[(frame || 0) % set.length];
    const shX = (y) => Math.round((p.lean * (17 - y)) / 5);
    const h = [p.FA[1][0] + shX(p.FA[1][1]), p.FA[1][1] + p.bob];
    if (what === 'tip') {
      const a = (staffAngle(p) * Math.PI) / 180;
      return { dx: Math.round(h[0] + Math.cos(a) * STAFF_TIP) - 8, dy: Math.round(h[1] + 1 + Math.sin(a) * STAFF_TIP) - 23 };
    }
    return { dx: h[0] + 2 - 8, dy: h[1] - 23 };
  }

  const GoblinSprite = {
    W, H, SKIN, POSES, MANA, MANA_L, MANA_D, ROCK, CLOAK, CLOAK_L,
    ANCHOR: { x: OX + 8, y: OY + 23 },
    paint,
    point,

    frame(pose = 'idle', frame = 0, facing = 1, skin = SKIN, kind = 'club') {
      const set = posesOf(kind)[pose] || posesOf(kind).idle;
      const f = (frame || 0) % set.length;
      const key = [kind, pose, f, facing < 0 ? -1 : 1, skin].join(',');
      let cv = cache.get(key);
      if (!cv) {
        cv = paint(pose, f, skin, kind).toCanvas();
        if (facing < 0) cv = ERX.Sprites.mirror(cv);
        cache.set(key, cv);
      }
      return cv;
    },
    rock: (f) => canvasOf('rock' + (f % 4), () => rockBuf(f % 4)),
    mana: (f) => canvasOf('mana' + (f % 2), () => manaBuf(f % 2)),
    bomb: (lit) => canvasOf('bomb' + (lit ? 1 : 0), () => bombBuf(lit)),
  };

  ERX.GoblinSprite = GoblinSprite;
})(window.ERX = window.ERX || {});
