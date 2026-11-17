/*
 * THE WISP: a lost soul of the fog. A turquoise flame with a face: a white-hot
 * core, two hollow eyes, and a tail that curls up behind it like a flame.
 *
 *   ERX.WispSprite.frame(pose, frame, facing) -> canvas (W x H), cached
 *   ERX.WispSprite.CENTER  the middle of its head (facing right)
 *
 * Poses: float(4)  charge(2)  dash  hurt
 * Facing right = heading right, so the tail streams out behind it (to the left).
 */
(function (ERX) {
  'use strict';

  const PB = ERX.PixelBuffer, C = ERX.Color;
  const cache = new Map();
  const W = 28, H = 22, CX = 17, CY = 11;
  const EDGE = '#0e3a40';                       // outline: a deep teal rather than black, so it glows
  const DEEP = '#1e8a8a', TEAL = '#2ab8b0', TURQ = '#5ae8d8', PALE = '#b8fff4', CORE = '#ffffff';
  const EYE = '#0a2228';

  function paintWisp(pose, f) {
    const b = new PB(W, H);
    const px = (x, y, col) => b.set(Math.round(x), Math.round(y), C.u32(col));
    const dash = pose === 'dash', charge = pose === 'charge', hurt = pose === 'hurt';
    const r = charge ? 3.6 + (f ? 0.3 : 0) : hurt ? 4.6 : 4.2;   // the head (it pulls in tight while charging)
    const len = dash ? 15 : charge ? 7 : 12;                      // the tail
    const rise = dash ? 0.05 : charge ? 0.25 : 0.45;              // how much the tail curls up behind
    const wave = dash ? 0.4 : charge ? 0.8 : 1.3;
    const ph = (f * Math.PI) / 2 + (hurt ? 1 : 0);
    // the body: a head plus a tail of shrinking discs that wave like a flame
    const discs = [[CX, CY, r]];
    for (let i = 1; i <= len; i++) {
      const k = i / len;
      discs.push([CX - i * (dash ? 1 : 0.85), CY - i * rise + Math.sin(ph + i * 0.7) * wave * k, Math.max(0.5, r * (1 - k) * 0.95)]);
    }
    // shade it from the head's hot spot outwards: white core, pale, turquoise, teal, deep teal at the tip
    const hx = CX + 0.8, hy = CY - 0.8;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!discs.some(([dx, dy, rr]) => Math.hypot(x - dx, y - dy) <= rr + 0.35)) continue;
        const d = Math.hypot(x - hx, y - hy);
        px(x, y, d < r * 0.45 ? CORE : d < r * 0.8 ? PALE : d < r * 1.25 ? TURQ : d < r * 2.6 ? TEAL : DEEP);
      }
    }
    // the face: two hollow eyes on the leading side of the head
    if (hurt) {
      // squeezed shut: > <
      px(CX - 1, CY - 2, EYE); px(CX, CY - 1, EYE); px(CX - 1, CY, EYE);
      px(CX + 4, CY - 2, EYE); px(CX + 3, CY - 1, EYE); px(CX + 4, CY, EYE);
    } else {
      for (const ex of [CX, CX + 3]) { px(ex, CY - 1, EYE); px(ex, CY, EYE); }
      if (charge) { px(CX - 1, CY - 2, EYE); px(CX + 4, CY - 2, EYE); }       // narrowed: angry brows
      if (dash) { px(CX + 1, CY + 2, EYE); px(CX + 2, CY + 2, EYE); }         // a wail
    }
    b.outline(C.u32(EDGE));
    // charging: sparks of soul-light flicking off it (soft, after the outline)
    if (charge) {
      for (const [x, y] of f ? [[CX + 6, CY - 5], [CX - 4, CY - 6], [CX + 1, CY + 6]] : [[CX + 5, CY + 4], [CX - 2, CY - 7], [CX + 7, CY - 2]]) {
        if (!b.solid(x, y)) b.set(x, y, C.u32(PALE, 230));
      }
    }
    return b;
  }

  const POSES = { float: 4, charge: 2, dash: 1, hurt: 1 };

  const WispSprite = {
    W, H, POSES,
    CENTER: { x: CX, y: CY },
    COLORS: { DEEP, TEAL, TURQ, PALE, CORE },
    paint: (pose, frame) => paintWisp(pose, (frame || 0) % (POSES[pose] || 1)),

    frame(pose = 'float', frame = 0, facing = 1) {
      const n = POSES[pose] || 1, f = (frame || 0) % n;
      const key = [pose, f, facing < 0 ? -1 : 1].join(',');
      let cv = cache.get(key);
      if (!cv) {
        cv = paintWisp(POSES[pose] ? pose : 'float', f).toCanvas();
        if (facing < 0) cv = ERX.Sprites.mirror(cv);
        cache.set(key, cv);
      }
      return cv;
    },
  };

  ERX.WispSprite = WispSprite;
})(window.ERX = window.ERX || {});
