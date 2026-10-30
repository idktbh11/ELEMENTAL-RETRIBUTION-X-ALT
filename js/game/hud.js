/*
 * Gameplay HUD: portrait + name, HP / MP bars, element (??? until revealed), objectives,
 * boss bar, warning banner, the Voice's side comments, interact prompts.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, F = ERX.Font, T = ERX.UITheme;

  function bar(ctx, x, y, w, h, frac, col, dark) {
    T.rect(ctx, x - 1, y - 1, w + 2, h + 2, T.ink);
    T.rect(ctx, x, y, w, h, '#1a1428');
    const fw = Math.round(w * U.clamp(frac, 0, 1));
    T.rect(ctx, x, y, fw, h, col);
    T.rect(ctx, x, y, fw, 1, ERX.Color.shade(col, 0.35));
    T.rect(ctx, x, y + h - 1, fw, 1, dark);
    for (let sx = x + 6; sx < x + w; sx += 6) T.rect(ctx, sx, y, 1, h, 'rgba(0,0,0,0.25)');
  }

  /**
   * Bottom-left: the ABILITY WHEEL. Your element's symbol in the middle is also the
   * Ultimate meter (it fills with energy, then glows when it's ready); the five
   * skills circle around it, each showing what the move looks like (js/render/symbols.js).
   */
  const WHEEL = { r0: 14, r: 9, ring: 30 };
  function wheelLayout(H) {
    const cx = 41, cy = H - 22;
    return { cx, cy, slots: ['s1', 's2', 's3', 's4', 's5'].map((slot, i) => { const a = Math.PI + (i / 4) * Math.PI; return { slot, x: Math.round(cx + Math.cos(a) * WHEEL.ring), y: Math.round(cy + Math.sin(a) * WHEEL.ring) }; }) };
  }
  function disc(ctx, x, y, r, col) { ctx.beginPath(); ctx.arc(x + 0.5, y + 0.5, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); }
  function circle(ctx, x, y, r, col, w) { ctx.beginPath(); ctx.arc(x + 0.5, y + 0.5, r, 0, Math.PI * 2); ctx.strokeStyle = col; ctx.lineWidth = w || 1; ctx.stroke(); }
  /** The Awakening ring around the middle: fills as you fight, drains while you're awakened. */
  function renderAwakening(ctx, g, cx, cy, r, ak, el) {
    const ab = g.player.ab, t = g.t, kit = ERX.Awakening.kit(el.id);
    if (!kit) return;
    if (!ERX.Awakening.unlocked(g) && !ab.awakened() && ab.awk <= 0) return;   // not earned yet: no ring at all
    const awkCol = kit.color, C = ERX.Color;
    const frac = ak ? ab.awakenT / ERX.Awakening.TIME : ab.awk / 100, ready = !ak && ab.awk >= 100;
    ctx.save();
    // the track
    ctx.beginPath(); ctx.arc(cx + 0.5, cy + 0.5, r, 0, Math.PI * 2); ctx.strokeStyle = "rgba(10,8,24,0.75)"; ctx.lineWidth = 2; ctx.stroke();
    // the fill (a pixel-dotted arc, clockwise from the top)
    const n = Math.round(r * 6.3), m = Math.round(n * U.clamp(frac, 0, 1));
    for (let i = 0; i < m; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2, x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
      ctx.fillStyle = ready || ak ? (Math.floor(t * 12 + i * 0.3) % 5 === 0 ? '#ffffff' : awkCol) : C.shade(awkCol, -0.2);
      ctx.fillRect(x, y, 1, 1);
    }
    if (ready) {
      // it's ready: the ring pulses and throws sparks
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t * 8);
      ctx.beginPath(); ctx.arc(cx + 0.5, cy + 0.5, r + 1, 0, Math.PI * 2); ctx.strokeStyle = awkCol; ctx.lineWidth = 1; ctx.stroke();
      ctx.globalAlpha = 1;
      for (let i = 0; i < 4; i++) { const a = -t * 4 + i * 1.57; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(cx + Math.cos(a) * (r + 2)), Math.round(cy + Math.sin(a) * (r + 2)), 1, 1); }
      F.draw(ctx, 'AWAKEN!', cx, cy - r - 46, { color: Math.floor(t * 4) % 2 ? '#ffffff' : awkCol, outline: T.ink, align: 'center' });
    } else if (ak) {
      F.draw(ctx, 'AWAKENED ' + Math.ceil(ab.awakenT) + 's', cx, cy - r - 46, { color: awkCol, outline: T.ink, align: 'center' });
    }
    ctx.restore();
  }

  function renderAbilities(ctx, W, H, g) {
    const p = g.player, ab = p.ab, el = g.element(), Sy = ERX.Symbols, t = g.t;
    const L = wheelLayout(H), C = ERX.Color;
    // awakened: the wheel switches to the awakened moves, in the awakened colour
    const ak = p.awk ? p.awk() : null, col = ak ? ak.color : el.color;
    ctx.save();
    // ---- the five skills ----
    for (const s of L.slots) {
      const r = ab.ready(s.slot), locked = r === 'locked';
      disc(ctx, s.x, s.y, WHEEL.r + 1, T.ink);
      disc(ctx, s.x, s.y, WHEEL.r, locked ? '#12142a' : C.shade(col, -0.72));
      Sy.move(ctx, el.id, s.slot, s.x, s.y, 1, { dim: locked, t, awakened: !!ak, color: ak ? col : null });
      if (!locked && ab.cd[s.slot] > 0) {
        const k = ab.cdFrac(s.slot);
        ctx.beginPath(); ctx.moveTo(s.x + 0.5, s.y + 0.5); ctx.arc(s.x + 0.5, s.y + 0.5, WHEEL.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.closePath();
        ctx.fillStyle = 'rgba(5,4,12,0.62)'; ctx.fill();
      }
      circle(ctx, s.x, s.y, WHEEL.r, locked ? '#2a2e4a' : r === 'mana' ? '#3a8aff' : ab.cd[s.slot] > 0 ? C.shade(col, -0.35) : col);
      if (ak && !locked) circle(ctx, s.x, s.y, WHEEL.r + 1, C.mix(col, '#ffffff', 0.3 + 0.2 * Math.sin(t * 5 + s.x)));
    }
    // ---- the middle: element symbol = Ultimate meter ----
    const { cx, cy } = L, R0 = WHEEL.r0, k = U.clamp(ab.ult / 100, 0, 1), full = k >= 1;
    const ultLocked = ERX.Abilities.rank(g, 'ult') < 1;
    disc(ctx, cx, cy, R0 + 2, T.ink);
    disc(ctx, cx, cy, R0, '#0c0a18');
    if (k > 0) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx + 0.5, cy + 0.5, R0, 0, Math.PI * 2); ctx.clip();
      const top = cy + R0 - Math.round(2 * R0 * k);
      ctx.globalAlpha = full ? 0.55 + 0.15 * Math.sin(t * 6) : 0.45;
      ctx.fillStyle = C.shade(col, -0.25);
      ctx.fillRect(cx - R0, top, R0 * 2 + 1, R0 * 2);
      // the energy's surface ripples
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = C.mix(col, '#ffffff', 0.35);
      if (!full) for (let x = -R0; x <= R0; x++) ctx.fillRect(cx + x, top + Math.round(Math.sin(x * 0.6 + t * 6)), 1, 1);
      ctx.restore();
    }
    Sy.element(ctx, el.id, cx, cy, 2, { dim: ultLocked, glow: full && !ultLocked ? 0.55 + 0.45 * Math.sin(t * 7) : 0, t, color: ak ? col : null });
    if (full && !ultLocked) {
      circle(ctx, cx, cy, R0 + 1, Math.floor(t * 6) % 2 ? '#ffffff' : col, 2);
      for (let i = 0; i < 6; i++) { const a = t * 3 + (i / 6) * Math.PI * 2; T.rect(ctx, Math.round(cx + Math.cos(a) * (R0 + 4)), Math.round(cy + Math.sin(a) * (R0 + 4)), 1, 1, i % 2 ? '#ffffff' : col); }
    } else circle(ctx, cx, cy, R0, ultLocked ? '#2a2e4a' : C.mix(col, '#ffffff', 0.15));
    renderAwakening(ctx, g, cx, cy, R0 + 5, ak, el);
    ctx.restore();
  }

  function render(ctx, W, H, g) {
    const p = g.player;
    const a = g.hudAlpha;
    if (a <= 0.01) return;
    ctx.globalAlpha = a;

    // ---- portrait + bars ----
    const x = 6, y = 6;
    T.rect(ctx, x, y, 24, 30, T.ink);
    T.rect(ctx, x + 1, y + 1, 22, 28, '#1c2348');
    const face = ERX.PlayerSprite.idleFrame(g.character.look, g.t);
    ERX.PlayerSprite.draw(ctx, face, x + 12, y + 28, 1);
    const nameW = F.draw(ctx, g.character.name, x + 30, y + 1, { color: '#ffffff', outline: T.ink });
    F.draw(ctx, 'LV ' + p.level, x + 36 + nameW, y + 1, { color: '#ffd34d', outline: T.ink });
    const need = ERX.Player.xpFor(p.level);
    T.rect(ctx, x + 30, y + 34, 70, 2, T.ink);
    T.rect(ctx, x + 30, y + 34, Math.round(70 * U.clamp(p.xp / need, 0, 1)), 2, '#a8f0ff');
    // gold
    T.rect(ctx, x + 1, y + 34, 5, 5, T.ink); T.rect(ctx, x + 2, y + 35, 3, 3, '#ffd34d'); T.rect(ctx, x + 2, y + 35, 1, 1, '#fff6c0');
    F.draw(ctx, (g.character.gold || 0) + 'G', x + 8, y + 33, { color: '#ffd34d', outline: T.ink });
    bar(ctx, x + 30, y + 11, 70, 5, g.hpShown / p.maxHp, '#e0403a', '#8a1e1e');
    F.draw(ctx, Math.ceil(p.hp) + '/' + p.maxHp, x + 104, y + 10, { color: '#ffb0a0', outline: T.ink });
    bar(ctx, x + 30, y + 19, 50, 4, p.mp / p.maxMp, '#3a8aff', '#1a3a8a');
    F.draw(ctx, Math.ceil(p.mp) + '/' + p.maxMp, x + 84, y + 17, { color: '#a8d0ff', outline: T.ink });
    const pulse = 0.6 + 0.4 * Math.sin(g.t * 3);
    const el = g.element ? g.element() : ERX.Elements.get(g.character.element);
    if (el) F.draw(ctx, 'ELEMENT: {el' + el.id + '}' + el.name.toUpperCase() + '{/}', x + 30, y + 26, { color: '#d4daf5', outline: T.ink });
    else F.draw(ctx, 'ELEMENT: ???', x + 30, y + 26, { color: ERX.Color.mix('#8a7ab0', '#d8b0ff', pulse), outline: T.ink });

    // ---- element abilities ----
    if (p.kit && p.kit() && !(ERX.Touch && ERX.Touch.visible())) renderAbilities(ctx, W, H, g);
    if (ERX.Admin && ERX.Admin.on() && ERX.Admin.data.element) F.draw(ctx, '{red}ADMIN{/}', x + 104, y + 26, { color: T.text, outline: T.ink });

    // ---- objective ----
    if (g.objective) {
      const o = g.objective;
      const label = ERX.keyText(o.label);
      let txt = label;
      if (o.progress) {
        const v = Math.min(o.goal, o.progress());
        if (o.goal > 1) txt += '  ' + Math.floor(v) + '/' + o.goal;
      }
      const done = o.doneT > 0;
      const w = F.measure(txt) + 22;
      const ox = Math.round(W / 2 - w / 2), oy = 6 + Math.round((1 - U.ease.outBack(U.clamp(o.t / 0.3, 0, 1))) * -20);
      T.rect(ctx, ox, oy, w, 14, T.ink);
      T.rect(ctx, ox + 1, oy + 1, w - 2, 12, done ? '#2a5a2a' : '#2a2350');
      T.rect(ctx, ox + 1, oy + 1, 2, 12, done ? T.good : T.gold);
      F.draw(ctx, (done ? '★ ' : '') + txt, ox + 9, oy + 4, { color: done ? '#c8ffb0' : '#ffffff' });
      if (o.progress && o.goal === 1 && !done) {
        const v = U.clamp(o.progress(), 0, 1);
        if (v > 0 && v < 1) T.rect(ctx, ox + 1, oy + 13, Math.round((w - 2) * v), 1, T.gold);
      }
    }

    // ---- boss warning + fake boss bar ----
    if (g.warning) {
      const flash = Math.floor(g.t * 5) % 2 === 0;
      T.rect(ctx, 0, Math.round(H * 0.18), W, 22, flash ? 'rgba(180,20,30,0.75)' : 'rgba(90,10,20,0.75)');
      for (let sx = -20 + Math.floor(g.t * 40) % 20; sx < W; sx += 20) {
        T.rect(ctx, sx, Math.round(H * 0.18), 10, 2, '#ffd34d');
        T.rect(ctx, sx + 10, Math.round(H * 0.18) + 20, 10, 2, '#ffd34d');
      }
      F.draw(ctx, '!! WARNING !!', W / 2, Math.round(H * 0.18) + 3, { scale: 1, color: '#ffffff', outline: '#3a0008', align: 'center' });
      F.draw(ctx, 'A TERRIFYING FOE APPROACHES', W / 2, Math.round(H * 0.18) + 12, { color: '#ffd0d0', outline: '#3a0008', align: 'center' });
    }
    if (g.bossBar) {
      const bw = Math.min(W - 60, 220), bx = Math.round(W / 2 - bw / 2), by = H - 30;
      if (!g.dialogue.active) {
        F.draw(ctx, g.bossBar.name, W / 2, by - 18, { scale: 1, color: '#ffd34d', outline: T.ink, align: 'center' });
        F.draw(ctx, g.bossBar.sub, W / 2, by - 9, { color: '#d4daf5', outline: T.ink, align: 'center' });
        bar(ctx, bx, by + 2, bw, 5, 1, '#c8d0e0', '#5e6478');
        F.draw(ctx, 'HP: YES', W / 2, by + 10, { color: T.textDim, outline: T.ink, align: 'center' });
      }
    }

    // ---- the Voice's side comments ----
    if (g.barkMsg) {
      const b = g.barkMsg;
      const k = U.clamp(Math.min(b.t / 0.2, (b.dur - b.t) / 0.3), 0, 1);
      const txt = ERX.keyText(b.text);
      const w = F.measure('???: ' + txt) + 14;
      const bx = Math.round(W - w - 8), by = H - 22;
      ctx.globalAlpha = a * k;
      T.rect(ctx, bx, by, w, 14, T.ink);
      T.rect(ctx, bx + 1, by + 1, w - 2, 12, '#2a1840');
      F.draw(ctx, '{purple}???:{/} ' + txt, bx + 7, by + 4, { color: '#e8dcff' });
      ctx.globalAlpha = a;
    }

    // ---- area banner ----
    if (g.banner) {
      const b = g.banner;
      const k = U.clamp(Math.min(b.t / 0.6, (b.dur - b.t) / 0.8), 0, 1);
      ctx.globalAlpha = a * k;
      F.draw(ctx, b.title, W / 2, Math.round(H * 0.3), { scale: 2, color: '#ffffff', outline: T.ink, shadow: '#2a3070', shadowOffset: 2, align: 'center' });
      F.draw(ctx, b.sub, W / 2, Math.round(H * 0.3) + 22, { color: '#c8d0f0', outline: T.ink, align: 'center' });
      ctx.globalAlpha = a;
    }

    // ---- interact prompt ----
    if (g.prompt && !g.dialogue.active) {
      const sx = Math.round((g.prompt.x - g.camera.x) * g.zoom), sy = Math.round((g.prompt.y - g.camera.y) * g.zoom) - 12 + Math.round(Math.sin(g.t * 5));
      const txt = ERX.keyText(g.prompt.text);
      const w = F.measure(txt) + 8;
      T.rect(ctx, sx - w / 2, sy - 1, w, 11, T.ink);
      T.rect(ctx, sx - w / 2 + 1, sy, w - 2, 9, '#2a2350');
      F.draw(ctx, txt, sx, sy + 1, { color: T.gold, align: 'center' });
    }
    ctx.globalAlpha = 1;
  }

  ERX.HUD = { render, wheelLayout };
})(window.ERX = window.ERX || {});
