/*
 * Player character sprite — front-facing, 16x24 pixels (+1px outline,
 * so 18x26 canvases), painted from an appearance ("look") object of indices
 * into ERX.Data.character palettes.
 *
 *   ERX.PlayerSprite.frame(look, 'idle', 0) -> canvas
 * Frames: idle 0-1 (breathing), blink 0, walk 0-3, cheer 0.
 * Feet sit on row 24 of the canvas; ANCHOR is the bottom centre.
 */
(function (ERX) {
  'use strict';

  const PB = ERX.PixelBuffer, C = ERX.Color;
  const c32 = (h) => C.u32(h);
  const cache = new Map();

  const OUTLINE = '#120c16';
  const SHOE = '#5a3a2a', SHOE_HI = '#7a523a';
  const WHITE = '#f4f2ff';

  function paint(look, pose, frame) {
    const D = ERX.Data.character;
    const b = new PB(18, 26);
    const skin = D.skins[look.skin].c;
    const skinD = C.shade(skin, -0.18);
    const hair = D.hairColors[look.hairColor].c;
    const hairD = C.shade(hair, -0.28), hairL = C.shade(hair, 0.22);
    const eye = D.eyeColors[look.eyes].c;
    const out = D.outfitColors[look.outfitColor].c;
    const outD = C.shade(out, -0.28), outL = C.shade(out, 0.2);
    const pants = D.pantsColors[look.pants].c;
    const pantsD = C.shade(pants, -0.25);
    const fem = look.gender === 1;

    // upper-body bob (breathing / walking) and per-leg lift while walking
    let bob = 0, liftL = 0, liftR = 0, armL = 0, armR = 0;
    if (pose === 'idle' && frame === 1) bob = 1;
    if (pose === 'walk') {
      bob = frame % 2 === 1 ? 1 : 0;
      if (frame === 0) { liftL = 1; armR = 1; }
      if (frame === 2) { liftR = 1; armL = 1; }
    }
    if (pose === 'cheer') { armL = -4; armR = -4; }

    const px = (x, y, col) => b.set(x + 1, y + 1, c32(col));
    const rect = (x, y, w, h, col) => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) px(x + xx, y + yy, col); };
    const U = (y) => y + bob; // upper-body y

    const hairStyle = look.hair;
    const outfit = look.outfit;

    // ---------- behind-the-body layers ----------
    if (hairStyle === 2) rect(3, U(4), 10, 11, hairD); // long hair behind
    if (hairStyle === 3) { rect(12, U(4), 2, 8, hairD); px(12, U(5), '#e8c050'); }
    if (hairStyle === 7) { // afro
      for (let y = -1; y <= 11; y++) for (let x = 1; x <= 14; x++) {
        const dx = x - 7.5, dy = y - 5;
        if (dx * dx + dy * dy <= 42) px(x, U(y), (x + y) % 3 === 0 ? hairD : hair);
      }
    }
    if (outfit === 1) rect(3, U(2), 10, 10, outD); // hoodie hood behind the head

    // ---------- legs + shoes ----------
    const legTop = 18;
    const legCol = outfit === 4 ? out : outfit === 5 ? pantsD : pants;
    const legColD = outfit === 4 ? outD : pantsD;
    if (outfit !== 2) {
      rect(5, legTop - liftL, 2, 4, legCol); px(6, legTop + 3 - liftL, legColD);
      rect(9, legTop - liftR, 2, 4, legCol); px(10, legTop + 3 - liftR, legColD);
      rect(7, legTop, 2, 1, legCol);
    }
    rect(4, 22 - liftL, 3, 2, SHOE); px(4, 22 - liftL, SHOE_HI);
    rect(9, 22 - liftR, 3, 2, SHOE); px(9, 22 - liftR, SHOE_HI);

    // ---------- arms (sleeve + hand) ----------
    const sleeve = outfit === 3 || outfit === 4 ? (outfit === 4 ? '#d8d0c0' : WHITE) : out;
    const sleeveD = C.shade(sleeve, -0.2);
    const arm = (x, dy, shade) => {
      if (dy < 0) { // raised (cheer)
        rect(x, U(8), 2, 5, shade ? sleeveD : sleeve);
        rect(x, U(6), 2, 2, skin);
        return;
      }
      rect(x, U(12) + dy, 2, 5, shade ? sleeveD : sleeve);
      rect(x, U(17) + dy, 2, 1, skin);
    };
    if (outfit === 2) { rect(1, U(13), 3, 4, out); rect(12, U(13), 3, 4, outD); }
    arm(2, armL, false);
    arm(12, armR, true);

    // ---------- torso ----------
    const tTop = U(12);
    const torso = (col) => {
      rect(4, tTop, 8, 6, col);
      if (!fem) { px(3, tTop, col); px(12, tTop, col); }
      if (fem) { px(4, tTop + 3, C.shade(col, -0.15)); px(11, tTop + 3, C.shade(col, -0.15)); }
      rect(11, tTop + 1, 1, 5, C.shade(col, -0.18));
    };
    switch (outfit) {
      case 0: // tunic
        torso(out);
        rect(4, legTop, 8, 1, out);
        rect(4, tTop + 4, 8, 1, '#6a4a2e'); px(7, tTop + 4, '#ffd34d');
        px(7, tTop, skin); px(8, tTop, skin); px(7, tTop + 1, skinD);
        break;
      case 1: // hoodie
        torso(out);
        rect(5, tTop + 3, 6, 2, outD);
        px(6, tTop + 1, WHITE); px(9, tTop + 1, WHITE); px(6, tTop + 2, WHITE);
        break;
      case 2: // robe
        rect(4, tTop, 8, 10 - bob, out);
        rect(3, legTop, 10, 4, out);
        rect(3, 21, 10, 1, outD);
        rect(4, tTop + 3, 8, 1, outL); px(8, tTop + 4, outL);
        rect(11, tTop + 1, 1, 8, outD);
        px(7, tTop, skin); px(8, tTop, skin);
        break;
      case 3: // vest over a shirt
        torso(WHITE);
        rect(4, tTop, 3, 6, out); rect(9, tTop, 3, 6, out);
        px(6, tTop + 2, '#ffd34d'); px(6, tTop + 4, '#ffd34d');
        rect(11, tTop + 1, 1, 5, outD);
        break;
      case 4: // overalls
        torso('#d8d0c0');
        rect(5, tTop + 2, 6, 4, out);
        px(5, tTop, out); px(5, tTop + 1, out); px(10, tTop, out); px(10, tTop + 1, out);
        px(5, tTop + 2, '#ffd34d'); px(10, tTop + 2, '#ffd34d');
        rect(5, legTop, 6, 1, out);
        break;
      case 5: // dress
        torso(out);
        rect(4, tTop + 5, 8, 1, out);
        rect(3, legTop, 10, 1, out);
        rect(3, legTop + 1, 10, 1, out);
        rect(2, legTop + 2, 12, 1, outD);
        rect(5, tTop + 2, 6, 1, outL);
        break;
      case 6: // adventurer: open jacket + scarf
        torso(out);
        rect(7, tTop + 1, 2, 5, '#3a3040');
        rect(4, tTop, 8, 1, outL);
        rect(5, U(11), 6, 2, '#c83a3a'); px(10, U(13), '#c83a3a'); px(10, U(14), '#9a2a2a');
        break;
    }

    // ---------- head ----------
    const hy = U(3);
    rect(4, hy, 8, 8, skin);
    b.set(1 + 4, 1 + hy, 0); b.set(1 + 11, 1 + hy, 0); b.set(1 + 4, 1 + hy + 7, 0); b.set(1 + 11, 1 + hy + 7, 0);
    rect(11, hy + 1, 1, 6, skinD);
    if (outfit !== 6) rect(7, U(11), 2, 1, skinD); // neck
    // eyes (iris toward the centre for a friendly look)
    if (pose === 'blink') {
      rect(5, hy + 4, 2, 1, C.shade(skin, -0.45));
      rect(9, hy + 4, 2, 1, C.shade(skin, -0.45));
    } else {
      px(5, hy + 3, WHITE); px(6, hy + 3, eye); px(5, hy + 4, WHITE); px(6, hy + 4, C.shade(eye, -0.45));
      px(10, hy + 3, WHITE); px(9, hy + 3, eye); px(10, hy + 4, WHITE); px(9, hy + 4, C.shade(eye, -0.45));
    }
    if (fem) { px(4, hy + 3, OUTLINE); px(11, hy + 3, OUTLINE); }
    // mouth (a grin while cheering)
    if (pose === 'cheer') { rect(7, hy + 6, 2, 1, '#7a2a2a'); px(6, hy + 5, C.shade(skin, -0.4)); px(9, hy + 5, C.shade(skin, -0.4)); }
    else { px(7, hy + 6, C.shade(skin, -0.35)); px(8, hy + 6, C.shade(skin, -0.35)); }
    if (fem) { px(5, hy + 5, C.mix(skin, '#ff7a8a', 0.35)); px(10, hy + 5, C.mix(skin, '#ff7a8a', 0.35)); }

    // ---------- hair (front) ----------
    const cap = () => {
      rect(5, hy - 1, 6, 1, hair);
      rect(4, hy, 8, 2, hair);
      px(4, hy + 2, hair); px(11, hy + 2, hairD);
      px(5, hy, hairL); px(6, hy, hairL); px(6, hy - 1, hairL);
      rect(11, hy, 1, 2, hairD);
    };
    switch (hairStyle) {
      case 0: cap(); break;
      case 1: cap(); px(5, hy - 2, hair); px(7, hy - 2, hair); px(7, hy - 3, hair); px(9, hy - 2, hair); px(10, hy - 3, hairD); px(10, hy - 2, hair); break;
      case 2: cap(); rect(3, hy + 1, 1, 7, hair); rect(12, hy + 1, 1, 7, hairD); px(5, hy + 2, hair); break;
      case 3: cap(); px(5, hy + 2, hair); break;
      case 4: cap(); rect(6, hy - 4, 4, 3, hair); b.set(1 + 6, 1 + hy - 4, 0); px(7, hy - 4, hairL); break;
      case 5: rect(6, hy - 3, 4, 4, hair); px(6, hy - 3, hairL); rect(9, hy - 3, 1, 4, hairD); break;
      case 6: cap(); px(5, hy + 2, hair); px(6, hy + 2, hair); px(8, hy + 2, hair); px(10, hy + 2, hair); px(4, hy + 3, hair); px(11, hy + 3, hairD); break;
      case 7: cap(); break;
      case 8: px(6, hy + 1, C.shade(skin, 0.35)); break;
    }
    b.outline(c32(OUTLINE));
    return b.toCanvas();
  }

  const PlayerSprite = {
    W: 18,
    H: 26,
    ANCHOR: { x: 9, y: 25 },

    frame(look, pose = 'idle', frame = 0) {
      const key = [look.gender, look.skin, look.hair, look.hairColor, look.eyes, look.outfit, look.outfitColor, look.pants, pose, frame].join(',');
      let cv = cache.get(key);
      if (!cv) {
        cv = paint(look, pose, frame);
        cache.set(key, cv);
        if (cache.size > 400) cache.delete(cache.keys().next().value);
      }
      return cv;
    },

    /** Idle animation helper: breathing with an occasional blink. */
    idleFrame(look, t, seed = 0) {
      const blink = (t + seed) % 3.7 < 0.13;
      if (blink) return this.frame(look, 'blink', 0);
      return this.frame(look, 'idle', Math.floor((t + seed) * 1.6) % 2);
    },

    /** Draw at an integer scale, bottom-centre anchored at (x, y). */
    draw(ctx, canvas, x, y, scale = 1) {
      const w = canvas.width * scale, h = canvas.height * scale;
      ctx.drawImage(canvas, Math.round(x - (this.ANCHOR.x + 0.5) * scale), Math.round(y - (this.ANCHOR.y + 1) * scale), w, h);
    },
  };

  ERX.PlayerSprite = PlayerSprite;
})(window.ERX = window.ERX || {});
