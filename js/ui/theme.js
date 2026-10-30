/*
 * UI theme — palette plus procedural pixel-art drawing for panels,
 * buttons, plates and key caps. All shapes are drawn with whole-pixel
 * rectangles, so they stay crisp at every scale.
 */
(function (ERX) {
  'use strict';

  const T = {
    ink: '#07080f',
    panel: '#141a35',
    panelLight: '#1c2348',
    panelDark: '#0d1126',
    border: '#3a4783',
    borderLight: '#6070b8',
    borderDark: '#232b58',
    text: '#e9ecff',
    textDim: '#9aa3cf',
    textMute: '#646c98',
    gold: '#ffd34d',
    goldDark: '#c48a1e',
    danger: '#ff6a4f',
    good: '#72e05a',
    shadow: 'rgba(3,4,12,0.55)',
  };

  /** Colour cycling through the six elemental colours (decorative). */
  T.elementCycle = function (time, speed = 1) {
    const E = ERX.Color.ELEMENTS;
    const f = (time * speed) % E.length;
    const i = Math.floor(f);
    return ERX.Color.mix(E[i], E[(i + 1) % E.length], f - i);
  };

  function rect(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  }
  T.rect = rect;

  /** Bevelled panel with corner gems. */
  T.drawPanel = function (ctx, x, y, w, h, o = {}) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    // drop shadow
    ctx.fillStyle = T.shadow;
    ctx.fillRect(x + 2, y + 3, w, h);
    // outline (chamfered corners)
    rect(ctx, x + 1, y, w - 2, h, T.ink);
    rect(ctx, x, y + 1, w, h - 2, T.ink);
    // border bevel
    rect(ctx, x + 1, y + 1, w - 2, h - 2, o.border || T.border);
    rect(ctx, x + 2, y + 1, w - 4, 1, T.borderLight);
    rect(ctx, x + 1, y + 2, 1, h - 4, T.borderLight);
    rect(ctx, x + 2, y + h - 2, w - 4, 1, T.borderDark);
    rect(ctx, x + w - 2, y + 2, 1, h - 4, T.borderDark);
    // inner fill
    rect(ctx, x + 3, y + 3, w - 6, h - 6, T.ink);
    rect(ctx, x + 4, y + 4, w - 8, h - 8, o.fill || T.panel);
    rect(ctx, x + 4, y + 4, w - 8, 1, T.panelLight);
    // subtle dither texture along the bottom of the fill
    ctx.fillStyle = T.panelDark;
    for (let yy = y + h - 10; yy < y + h - 4; yy++)
      for (let xx = x + 4 + ((yy & 1) * 1); xx < x + w - 4; xx += 2 + ((y + h - yy) > 6 ? 2 : 0)) ctx.fillRect(xx, yy, 1, 1);
    // corner gems
    const gem = o.accent || T.gold;
    const gems = [[x + 1, y + 1], [x + w - 4, y + 1], [x + 1, y + h - 4], [x + w - 4, y + h - 4]];
    for (const [gx, gy] of gems) {
      rect(ctx, gx + 1, gy, 1, 3, T.ink);
      rect(ctx, gx, gy + 1, 3, 1, T.ink);
      rect(ctx, gx + 1, gy + 1, 1, 1, gem);
    }
  };

  /** Header plate with title text (2x pixel font). */
  T.drawTitlePlate = function (ctx, cx, y, title, o = {}) {
    const F = ERX.Font;
    const tw = F.measure(title, 2);
    const w = tw + 24, h = 22;
    const x = Math.round(cx - w / 2);
    rect(ctx, x + 1, y, w - 2, h, T.ink);
    rect(ctx, x, y + 1, w, h - 2, T.ink);
    rect(ctx, x + 1, y + 1, w - 2, h - 2, T.goldDark);
    rect(ctx, x + 2, y + 1, w - 4, 1, T.gold);
    rect(ctx, x + 2, y + 2, w - 4, h - 4, '#2a2148');
    rect(ctx, x + 2, y + 2, w - 4, 1, '#3d3266');
    // little side diamonds
    for (const sx of [x - 5, x + w + 1]) {
      rect(ctx, sx + 1, y + 8, 2, 6, T.ink);
      rect(ctx, sx, y + 9, 4, 4, T.ink);
      rect(ctx, sx + 1, y + 10, 2, 2, o.accent || T.gold);
    }
    F.draw(ctx, title, cx, y + 4, { scale: 2, color: T.gold, shadow: '#5a2d10', shadowOffset: 2, align: 'center' });
    return h;
  };

  /**
   * Pixel button. state: { hover 0..1, press 0..1, flash 0..1, focused,
   * accent, disabled, icon }.
   */
  T.drawButton = function (ctx, x, y, w, h, label, s = {}) {
    const F = ERX.Font;
    const hover = s.hover || 0;
    const press = s.press || 0;
    const lift = Math.round(hover * 1) - Math.round(press * 2);
    x = Math.round(x);
    const baseY = Math.round(y);
    y = baseY - lift;
    const accent = s.accent || T.gold;

    // drop shadow stays on the 'ground' while the button lifts
    ctx.fillStyle = T.shadow;
    ctx.fillRect(x + 2, baseY + 2, w - 1, h - 1);

    const body = s.disabled ? '#1a1d30' : hover > 0.5 ? '#2b3670' : '#1d2550';
    const top = s.disabled ? '#24283e' : hover > 0.5 ? '#46559e' : '#323e7c';
    const bottom = hover > 0.5 ? '#1a2150' : '#121838';
    const border = s.disabled ? '#2e3350' : hover > 0.5 ? accent : T.border;

    rect(ctx, x + 1, y, w - 2, h, T.ink);
    rect(ctx, x, y + 1, w, h - 2, T.ink);
    rect(ctx, x + 1, y + 1, w - 2, h - 2, border);
    rect(ctx, x + 2, y + 2, w - 4, h - 4, body);
    rect(ctx, x + 2, y + 2, w - 4, 1, top);
    rect(ctx, x + 2, y + h - 3, w - 4, 1, bottom);

    // shimmer sweep when hovered
    if (hover > 0.5 && !s.disabled) {
      const sweep = ((s.time || 0) * 70) % (w + 30) - 15;
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      for (let i = 0; i < h - 4; i++) {
        const sx = Math.round(x + sweep - i * 0.6);
        const cx0 = Math.max(x + 2, sx), cx1 = Math.min(x + w - 2, sx + 5);
        if (cx1 > cx0) ctx.fillRect(cx0, y + 2 + i, cx1 - cx0, 1);
      }
    }

    // flash on activate
    if (s.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (s.flash * 0.6).toFixed(3) + ')';
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    }

    const textColor = s.disabled ? T.textMute : hover > 0.5 ? T.gold : T.text;
    const ty = y + Math.floor((h - 7) / 2);
    if (s.icon) {
      const iw = ERX.Sprites.icons[s.icon].w;
      const ih = ERX.Sprites.icons[s.icon].h;
      const total = iw + 5 + F.measure(label);
      const ix = Math.round(x + w / 2 - total / 2);
      const iy = y + Math.floor((h - ih) / 2);
      ERX.Sprites.drawIcon(ctx, s.icon, ix, iy + 1, T.ink);
      ERX.Sprites.drawIcon(ctx, s.icon, ix, iy, hover > 0.5 ? accent : T.textDim, hover > 0.5 ? '#ffffff' : null);
      F.draw(ctx, label, ix + iw + 5, ty, { color: textColor, shadow: T.ink });
    } else {
      F.draw(ctx, label, x + w / 2, ty, { color: textColor, shadow: T.ink, align: 'center' });
    }

    // selection arrows that bob beside the focused button
    if (s.focused && hover > 0.05) {
      const bob = Math.round(Math.sin((s.time || 0) * 8) * 1.5 + 1.5);
      const a = Math.round(hover * 255);
      if (a > 20) {
        const ax = x - 7 - bob, bx = x + w + 3 + bob, ay = y + Math.floor(h / 2) - 3;
        drawArrow(ctx, ax, ay, 1, accent);
        drawArrow(ctx, bx, ay, -1, accent);
      }
    }
  };

  function drawArrow(ctx, x, y, dir, color) {
    // 4x7 chevron, outlined
    const rows = dir > 0 ? ['#...', '##..', '###.', '####', '###.', '##..', '#...'] : ['...#', '..##', '.###', '####', '.###', '..##', '...#'];
    ctx.fillStyle = T.ink;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) if (rows[r][c] === '#') ctx.fillRect(x + c, y + r + 1, 1, 1);
    ctx.fillStyle = color;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) if (rows[r][c] === '#') ctx.fillRect(x + c, y + r, 1, 1);
  }
  T.drawArrow = drawArrow;

  /** Small key cap used in the controls menu and footer hints. */
  T.drawKeyCap = function (ctx, x, y, w, label, o = {}) {
    const h = 13;
    x = Math.round(x); y = Math.round(y);
    const face = o.listening ? '#4a2a10' : o.focused ? '#2e3a7a' : o.empty ? '#1a1426' : '#222a58';
    const edge = o.listening ? T.gold : o.focused ? (o.accent || T.gold) : o.empty ? '#5a2a3a' : T.border;
    rect(ctx, x + 1, y, w - 2, h, T.ink);
    rect(ctx, x, y + 1, w, h - 2, T.ink);
    rect(ctx, x + 1, y + 1, w - 2, h - 2, edge);
    rect(ctx, x + 2, y + 1, w - 4, h - 4, face);
    rect(ctx, x + 2, y + h - 3, w - 4, 1, T.ink);
    const color = o.listening ? T.gold : o.empty ? '#b05a6a' : o.focused ? '#ffffff' : T.text;
    ERX.Font.draw(ctx, label, x + w / 2, y + 2, { color, align: 'center' });
    return h;
  };

  ERX.UITheme = T;
})(window.ERX = window.ERX || {});
