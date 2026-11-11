/*
 * THE GOBLIN: a hunched, big-eared little brute with a spiked club.
 *
 * Built like the player (js/render/player-side.js): every frame is a set of
 * joints (knees, ankles, elbows, hands) plus a body bob / lean, limbs are 2px
 * strokes between joints, and one ink outline wraps the lot. The club follows
 * the front hand at an angle, and the ears flop a beat behind the body.
 *
 *   ERX.GoblinSprite.frame(pose, frame, facing, skin) -> canvas (W x H), cached
 *   ERX.GoblinSprite.paint(pose, frame, skin)          -> raw PixelBuffer, facing right
 *   ERX.GoblinSprite.ANCHOR  the pixel between the feet (facing right)
 *
 * Poses: idle(2) walk(6) alert windup(3) swing(3) hurt air(2)
 * Grid: facing right, feet on row 23. The art is 22px tall, the same as you.
 */
(function (ERX) {
  'use strict';

  const PB = ERX.PixelBuffer, C = ERX.Color;
  const cache = new Map();
  const W = 32, H = 26, OX = 6, OY = 1;
  const INK = '#120c16';
  const SKIN = '#6aa84a';

  const WOOD = '#8e6034', WOOD_D = '#5a3a20', WOOD_L = '#b8844c';
  const CLOTH = '#7a5030', CLOTH_D = '#56361e', CLOTH_L = '#9a6a40';
  const PATCH = '#9a8a52', ROPE = '#b08a4a';
  const METAL = '#d8dce8', METAL_D = '#8a8ea0';
  const EYE = '#ffe04a', PUPIL = '#1a0e10', MOUTH = '#3a1218', TOOTH = '#f2ead2';

  // ------------------------------------------------------------- poses
  // F = front (near) limb, B = back (far) limb. Each limb: [knee/elbow, ankle/hand].
  // club: angle in degrees (0 = forward, 90 = straight down, -90 = up, 180 = back).
  // behind: the club arm is drawn behind the head (wound back over the shoulder).
  const STAND = {
    bob: 0, lean: 0, ear: 0, face: 'grin',
    FL: [[10, 20], [10, 22]], BL: [[7, 20], [6, 22]],
    FA: [[12, 14], [13, 15]], BA: [[6, 14], [6, 16]],
    club: 6, behind: false, smear: 0,
  };
  const P = (o) => Object.assign({}, STAND, o);

  const POSES = {
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
    // spotted you: a startled hop, club up, ears pricked
    alert: [P({ bob: -1, lean: -1, ear: -1, face: 'snarl', FL: [[11, 19], [11, 21]], BL: [[7, 19], [6, 21]], FA: [[12, 11], [13, 8]], BA: [[5, 12], [4, 10]], club: -45 })],
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
    hurt: [P({ lean: -2, ear: 1, face: 'ouch', FL: [[10, 19], [11, 22]], BL: [[6, 19], [5, 22]], FA: [[12, 12], [14, 10]], BA: [[5, 12], [3, 10]], club: -30 })],
    air: [
      // rising: the ears trail down
      P({ bob: -1, ear: 1, FL: [[11, 18], [11, 21]], BL: [[7, 19], [6, 21]], FA: [[11, 13], [13, 14]], BA: [[6, 13], [4, 14]], club: 20 }),
      // falling: ears blown up, arms out
      P({ ear: -1, FL: [[11, 19], [12, 21]], BL: [[6, 19], [5, 22]], FA: [[12, 12], [14, 11]], BA: [[5, 12], [3, 11]], club: -20 }),
    ],
  };

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

  function paintPose(skin, p) {
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
    const drawArm = (arm, back) => {
      const [sh, e, h] = armPts(arm, back);
      const col = back ? SD : S;
      if (!back) { stroke(sh[0] - 1, sh[1], e[0] - 1, e[1], SDD); stroke(e[0] - 1, e[1], h[0] - 1, h[1], SD); }   // seam so the near arm reads
      stroke(sh[0], sh[1], e[0], e[1], col);
      stroke(e[0], e[1], h[0], h[1], col);
      rect(h[0] - 1, h[1], 2, 2, back ? SD : S);
      if (!back) px(h[0], h[1], SL);   // knuckle
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

    // ---------------- torso: hunched back, round belly, a ragged tunic ----------------
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
    const T = (x, y, col) => px(x + shX(y), y, col);
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

    // a club wound back goes behind the head; otherwise the arm is in front
    if (p.behind) { drawClub(); drawArm(p.FA, false); }

    // ---------------- head ----------------
    HEAD.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        px(hx + x, hy + y, ch === 'd' ? SD : ch === 'l' ? SL : ch === 'b' ? SDD : S);
      }
    });
    // the near ear: rim-lit on top, shaded underneath, pink-brown inside,
    // and a dark crease where it meets the face
    const ear = EAR.map(([x, y]) => [x, y + (x <= -4 ? p.ear : 0)]);
    const inEar = (x, y) => ear.some(([ex, ey]) => ex === x && ey === y);
    for (const [x, y] of ear) px(hx + x, hy + y, !inEar(x, y - 1) ? SL : !inEar(x, y + 1) ? SD : S);
    for (const [x, y] of EAR_INNER) px(hx + x, hy + y, INNER);
    px(hx + 4, hy + 3, SD); px(hx + 4, hy + 4, SD);
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
      px(hx + 6, hy + 4, EYE); px(hx + 7, hy + 4, face === 'snarl' ? '#c01a10' : PUPIL);
      if (face === 'snarl') {
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

    if (!p.behind) { drawClub(); drawArm(p.FA, false); }
    if (!p.behind) {
      // the near hand grips over the handle
      const [, , h] = armPts(p.FA, false);
      rect(h[0] - 1, h[1], 2, 2, S); px(h[0], h[1], SL);
    }

    b.outline(C.u32(INK));

    // the swing smear: a pale arc where the club just was (after the outline, so it stays soft)
    if (p.smear) {
      const cx = 9 + shX(shoulderY), cy = shoulderY + 1;
      for (let deg = -80; deg <= 8; deg += 3) {
        const k = (deg + 80) / 88, a = (deg * Math.PI) / 180;
        for (const r of [11, 12, 13]) {
          const x = Math.round(cx + Math.cos(a) * r) + OX, y = Math.round(cy + Math.sin(a) * r) + OY;
          if (!b.solid(x, y)) b.set(x, y, C.u32('#ffffff', Math.round(30 + 150 * k * (r === 12 ? 1 : 0.55))));
        }
      }
    }
    return b;
  }

  function paint(pose, frame, skin) {
    const set = POSES[pose] || POSES.idle;
    return paintPose(skin || SKIN, set[(frame || 0) % set.length]);
  }

  const GoblinSprite = {
    W, H, SKIN, POSES,
    ANCHOR: { x: OX + 8, y: OY + 23 },
    FRAMES: Object.fromEntries(Object.keys(POSES).map((k) => [k, POSES[k].length])),
    paint,

    frame(pose = 'idle', frame = 0, facing = 1, skin = SKIN) {
      const set = POSES[pose] || POSES.idle;
      const f = (frame || 0) % set.length;
      const key = [pose, f, facing < 0 ? -1 : 1, skin].join(',');
      let cv = cache.get(key);
      if (!cv) {
        cv = paint(pose, f, skin).toCanvas();
        if (facing < 0) cv = ERX.Sprites.mirror(cv);
        cache.set(key, cv);
      }
      return cv;
    },
  };

  ERX.GoblinSprite = GoblinSprite;
})(window.ERX = window.ERX || {});
