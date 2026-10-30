/*
 * THE VOICE, in person: a lanky figure in a starry purple hooded cloak.
 *
 *   ERX.FigureSprite.frame(expr, pose, frame, facing, front) -> canvas (26x34)
 *   ERX.FigureSprite.draw(ctx, cv, x, y)   feet (cloak hem) on (x, y)
 *
 * expr: neutral shock angry sigh unamused smug nervous
 * pose: idle point cast walk(2 frames) fallen (on the floor, pointing at you)
 * front = true draws him facing the camera (the middle of a slow turn).
 */
(function (ERX) {
  'use strict';

  const PB = ERX.PixelBuffer, C = ERX.Color;
  const c32 = (h) => C.u32(h);
  const cache = new Map();
  const W = 26, H = 34;
  const INK = '#120c1c';
  const ROBE = '#4a2a7a', ROBE_D = '#2e1a50', ROBE_L = '#6a44a0', TRIM = '#c89aff';
  const SKIN = '#ecdcf4', SKIN_D = '#c8b0d8';
  const EYE = '#2a1a40', WHITE = '#ffffff';

  function paint(expr, pose, frame, front) {
    const b = new PB(W, H);
    const px = (x, y, col) => b.set(Math.round(x), Math.round(y), c32(col));
    const rect = (x, y, w, h, col) => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) px(x + xx, y + yy, col); };
    const cx = front ? 13 : 12;          // body centre
    const fallen = pose === 'fallen' && !front;
    const bob = pose === 'walk' ? frame % 2 : fallen ? 8 : 0;   // fallen: sitting on the floor

    // ---- shoes peeking out under the hem ----
    const step = pose === 'walk' ? (frame % 2 ? 1 : -1) : 0;
    if (fallen) { rect(cx + 8, 31, 3, 2, '#2a1a30'); rect(cx + 10, 30, 3, 2, '#3a2440'); }   // legs out in front
    else { rect(cx - 4 + step, 31, 3, 2, '#2a1a30'); rect(cx + 1 - step, 31, 3, 2, '#3a2440'); }

    // ---- the cloak ----
    for (let y = 13 + bob; y <= 31; y++) {
      const hw = Math.round(4 + (y - 13) * 0.24);
      for (let x = cx - hw; x <= cx + hw; x++) {
        let col = ROBE;
        if (front) col = x === cx - hw ? ROBE_D : x === cx + hw ? ROBE_L : ROBE;
        else col = x <= cx - hw + 2 ? ROBE_D : x === cx + hw ? ROBE_L : ROBE;
        if (y >= 30) col = TRIM;
        px(x, y, col);
      }
    }
    // opening down the front + gold clasp
    const ox = front ? cx : cx + 2;
    for (let y = 16 + bob; y < 30; y++) px(ox, y, ROBE_D);
    px(ox, 14 + bob, '#ffd34d'); px(ox, 15 + bob, '#c89a20');
    // little stars on the cloak
    for (const [sx, sy] of [[-3, 18], [2, 22], [-5, 26], [4, 27], [-1, 25]]) px(cx + sx, sy + bob, '#ffe08a');

    // ---- arms ----
    const sleeve = (x0, y0, x1, y1, back) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) {
        const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
        rect(x - 1, y - 1, 3, 3, back ? ROBE_D : ROBE_L);
      }
      rect(x1 - 1, y1 - 1, 3, 1, TRIM);
    };
    const sh = 14 + bob;
    if (front) {
      sleeve(cx - 5, sh, cx - 6, 23, true); rect(cx - 7, 24, 2, 2, SKIN_D);
      if (pose === 'cast') { sleeve(cx + 5, sh, cx + 7, 7, false); rect(cx + 6, 4, 3, 3, SKIN); }
      else { sleeve(cx + 5, sh, cx + 6, 23, false); rect(cx + 5, 24, 2, 2, SKIN); }
    } else {
      if (fallen) sleeve(cx - 3, sh, cx - 6, 30, true);            // propped up on one hand
      else sleeve(cx - 3, sh, cx - 4, 22, true);
      if (fallen) {
        sleeve(cx + 3, sh + 1, cx + 9, sh - 3, false);              // ...pointing at you, shaking
        rect(cx + 10, sh - 4, 2, 3, SKIN); rect(cx + 12, sh - 5, 2, 1, SKIN);
      } else if (pose === 'point') {
        sleeve(cx + 3, sh + 1, cx + 9, sh + 1, false);
        rect(cx + 10, sh, 2, 3, SKIN); rect(cx + 12, sh, 2, 1, SKIN);      // the pointing finger
      } else if (pose === 'cast') {
        sleeve(cx + 3, sh, cx + 6, 7, false);
        rect(cx + 5, 4, 3, 3, SKIN);
      } else {
        const swing = pose === 'walk' ? (frame % 2 ? 1 : -1) : 0;
        sleeve(cx + 3, sh, cx + 4 + swing, 22, false);
        rect(cx + 3 + swing, 23, 2, 2, SKIN);
      }
    }

    // ---- the hood + face ----
    const hx = front ? cx : cx + 1, hy = 8 + bob;
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) {
      if (x * x + y * y > 38) continue;
      px(hx + x, hy + y, x < -3 ? ROBE_D : ROBE);
    }
    // the floppy pointed tip at the back of the hood
    if (!front) { px(hx - 6, hy - 5, ROBE_D); px(hx - 7, hy - 6, ROBE_D); px(hx - 8, hy - 6, ROBE_D); px(hx - 8, hy - 5, '#ffd34d'); }
    else { px(hx, hy - 7, ROBE_D); px(hx + 1, hy - 8, ROBE_D); px(hx + 2, hy - 8, '#ffd34d'); }
    const fx = front ? hx : hx + 2;      // face centre
    const angry = expr === 'angry', shock = expr === 'shock';
    const skin = angry ? '#ff9a9a' : shock ? '#f8f0ff' : SKIN;
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
      if ((x * x) / 12 + (y * y) / 17 > 1) continue;
      px(fx + x, hy + 1 + y, skin);
    }
    // hood rim
    for (let y = -4; y <= 5; y++) { px(fx - 5, hy + 1 + y, TRIM); if (front) px(fx + 5, hy + 1 + y, TRIM); }
    // white fringe of hair
    for (let x = -3; x <= 3; x++) px(fx + x, hy - 3, '#f4f0ff');
    px(fx - 2, hy - 2, '#f4f0ff'); px(fx + 1, hy - 2, '#d8d0ec');

    // ---- the face ----
    const e1 = fx - 2, e2 = fx + 2, ey = hy + 1, my = hy + 4;
    const eyes = (col) => { px(e1, ey, col); px(e1, ey - 1, col); px(e2, ey, col); px(e2, ey - 1, col); };
    switch (expr) {
      case 'shock':
        for (const ex of [e1, e2]) { rect(ex - 1, ey - 2, 2, 3, WHITE); px(ex, ey - 1, EYE); }
        rect(fx, my - 1, 2, 2, '#5a1a2a');
        px(fx + 4, hy - 2, '#8ad8ff'); px(fx + 4, hy - 1, '#5ab0e8');    // sweat drop
        break;
      case 'angry':
        px(e1, ey, EYE); px(e2, ey, EYE);
        px(e1 - 1, ey - 2, EYE); px(e1, ey - 1, EYE);                  // brows angled in
        px(e2 + 1, ey - 2, EYE); px(e2, ey - 1, EYE);
        px(fx - 1, my, EYE); px(fx, my - 1, EYE); px(fx + 1, my, EYE); px(fx + 2, my - 1, EYE);
        // the comic "anger vein" on the hood
        for (const [vx, vy] of [[0, 0], [1, 1], [2, 0], [0, 2], [2, 2]]) px(hx - 5 + vx, hy - 4 + vy, '#ff3a4a');
        break;
      case 'sigh':
        px(e1 - 1, ey, EYE); px(e1, ey, EYE); px(e2, ey, EYE); px(e2 + 1, ey, EYE);
        px(fx + 1, my, '#7a4a6a');
        break;
      case 'unamused':
        px(e1 - 1, ey - 1, EYE); px(e1, ey - 1, EYE); px(e1, ey, EYE);
        px(e2, ey - 1, EYE); px(e2 + 1, ey - 1, EYE); px(e2, ey, EYE);
        for (let x = -1; x <= 2; x++) px(fx + x, my, EYE);
        break;
      case 'smug':
        px(e1 - 1, ey, EYE); px(e1, ey - 1, EYE); px(e1 + 1, ey, EYE);
        px(e2 - 1, ey, EYE); px(e2, ey - 1, EYE); px(e2 + 1, ey, EYE);
        px(fx - 1, my - 1, EYE); px(fx, my, EYE); px(fx + 1, my, EYE); px(fx + 2, my - 1, EYE);
        break;
      case 'nervous':
        eyes(EYE);
        px(fx - 1, my, EYE); px(fx, my - 1, EYE); px(fx + 1, my, EYE); px(fx + 2, my - 1, EYE);
        px(fx + 4, hy - 2, '#8ad8ff'); px(fx + 4, hy - 1, '#5ab0e8');
        break;
      default:
        eyes(EYE);
        px(fx, my, SKIN_D); px(fx + 1, my, SKIN_D);
    }
    b.outline(c32(INK));
    return b;
  }

  const FigureSprite = {
    W, H,
    frame(expr = 'neutral', pose = 'idle', frame = 0, facing = 1, front = false) {
      const key = [expr, pose, pose === 'walk' ? frame % 2 : 0, front ? 0 : facing, front].join(',');
      let cv = cache.get(key);
      if (!cv) {
        cv = paint(expr, pose, frame, front).toCanvas();
        if (!front && facing < 0) cv = ERX.Sprites.mirror(cv);
        cache.set(key, cv);
      }
      return cv;
    },
    /** Feet (the cloak's hem) on (x, y). */
    draw(ctx, cv, x, y) {
      ctx.drawImage(cv, Math.round(x - cv.width / 2), Math.round(y - H + 1));
    },
    /** Where his raised hand is (for the energy key), relative to his feet. */
    hand(facing) { return { x: facing * 5, y: -H + 6 }; },
  };

  ERX.FigureSprite = FigureSprite;
})(window.ERX = window.ERX || {});
