/*
 * THE DARK DEEPER: a shadow worm that swims through the rock under your feet.
 * Out of the ground it's a swaying column of rings (a violet seam glowing
 * round each one), a bulbous head with three cyan eyes, and a round lamprey
 * maw full of teeth that opens wide when it bites.
 *
 *   ERX.DeeperSprite.frame(h, mouth, lean, f, facing) -> canvas (W x H), cached
 *     h      how much of it is out of the ground (0..MAX): it's drawn standing on the canvas' bottom row
 *     mouth  0 shut, 1 open, 2 wide (biting)
 *     lean   -1..1, toward you (facing right = leaning right)
 *     f      wiggle frame 0..3
 *   ERX.DeeperSprite.ANCHOR  where its middle meets the ground (facing right)
 */
(function (ERX) {
  'use strict';

  const PB = ERX.PixelBuffer, C = ERX.Color;
  const cache = new Map();
  const W = 28, H = 38, CX = 13, MAX = 30;
  const BODY = '#3a2a62', DARK = '#21163c', RIM = '#6a54b0', GLOW = '#b46aff', CORE = '#f0dcff', EYE = '#7ae8ff';
  const TOOTH = '#ece4f8', THROAT = '#05020a', GUM = '#5a1e4a', INK = '#050308';

  function paint(h, mouth, lean, f) {
    const b = new PB(W, H);
    const px = (x, y, col) => b.set(Math.round(x), Math.round(y), C.u32(col));
    if (h <= 0) return b;
    const base = H - 1, top = base - h;                       // ground row, top of the head
    const swayAt = (k) => Math.sin(k * 3.1 + f * 1.57) * 1.3 + lean * k * 4;
    // ---- the body: rings from the ground up to the neck, a touch narrower as it rises
    const neck = top + 9;
    for (let y = base; y >= neck; y--) {
      const k = (base - y) / Math.max(1, h), cx = CX + swayAt(k), hw = 4.6 - k * 0.9;
      const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw), ring = (base - y) % 5 === 2;
      for (let x = x0; x <= x1; x++) {
        let col = x <= x0 + 1 ? DARK : x >= x1 - 1 ? RIM : BODY;
        if (ring) col = x === Math.round(cx) || x === Math.round(cx) + 1 ? CORE : x === x0 ? DARK : GLOW;   // the glowing seam, brightest in the middle
        px(x, y, col);
      }
      if ((base - y) % 5 === 4) px(x1 + 1, y, DARK);         // a little knobbly ridge along the back
    }
    // ---- the head: a bulb, lit on its front, darker behind
    const hk = (base - (top + 5)) / Math.max(1, h), hx = CX + swayAt(Math.min(1, hk)), hy = top + 5, rx = 6.2, ry = 5.4;
    for (let y = Math.floor(hy - ry - 1); y <= hy + ry + 1; y++) {
      for (let x = Math.floor(hx - rx - 1); x <= hx + rx + 1; x++) {
        const nx = (x - hx) / (rx + 0.5), ny = (y - hy) / (ry + 0.5);
        if (nx * nx + ny * ny > 1) continue;
        const l = nx * 0.6 - ny * 0.5;
        px(x, y, l > 0.45 ? RIM : l < -0.4 ? DARK : BODY);
      }
    }
    // three cyan eyes down the front of the head
    for (const [ex, ey] of [[3, -2], [4, 1], [2, 3]]) { px(hx + ex, hy + ey, '#e8ffff'); px(hx + ex - 1, hy + ey, EYE); }
    // ---- the maw on top: a dark round mouth ringed with teeth
    if (mouth > 0) {
      const mr = mouth > 1 ? 4.2 : 2.8, mx = hx + 1 + lean, my = hy - ry + 1.5 + (mouth > 1 ? 1 : 0);
      for (let y = Math.floor(my - mr - 1); y <= my + mr + 1; y++) {
        for (let x = Math.floor(mx - mr - 1); x <= mx + mr + 1; x++) {
          const d = Math.hypot((x - mx) * 0.85, y - my);
          if (d > mr + 0.4) continue;
          px(x, y, d < mr - 1.6 ? THROAT : d < mr - 0.6 ? GUM : (Math.round(x + y) % 2 ? TOOTH : GUM));   // teeth all the way round
        }
      }
    } else {
      // shut: a puckered ring on top
      px(hx + 1, top + 1, DARK); px(hx, top + 1, GUM); px(hx + 2, top + 1, GUM);
    }
    b.outline(C.u32(INK));
    // the glowing seams bleed a little light (soft, after the outline)
    for (let y = base; y >= neck; y--) {
      if ((base - y) % 5 !== 2) continue;
      const k = (base - y) / Math.max(1, h), cx = Math.round(CX + swayAt(k)), hw = Math.round(4.6 - k * 0.9) + 2;
      for (const x of [cx - hw, cx + hw + 1]) if (!b.solid(x, y)) b.set(x, y, C.u32(GLOW, 90));
    }
    return b;
  }

  const DeeperSprite = {
    W, H, MAX,
    ANCHOR: { x: CX, y: H - 1 },
    COLORS: { BODY, DARK, RIM, GLOW, EYE },
    paint,
    frame(h, mouth, lean, f, facing) {
      const hh = Math.max(0, Math.min(MAX, Math.round(h))), m = mouth || 0, ln = Math.round((lean || 0) * 2) / 2, ff = (f || 0) % 4;
      const key = [hh, m, ln, ff, facing < 0 ? -1 : 1].join(',');
      let cv = cache.get(key);
      if (!cv) {
        cv = paint(hh, m, ln, ff).toCanvas();
        if (facing < 0) cv = ERX.Sprites.mirror(cv);
        cache.set(key, cv);
        if (cache.size > 600) cache.delete(cache.keys().next().value);
      }
      return cv;
    },
  };

  ERX.DeeperSprite = DeeperSprite;
})(window.ERX = window.ERX || {});
