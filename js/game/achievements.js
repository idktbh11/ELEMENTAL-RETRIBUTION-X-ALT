/*
 * ACHIEVEMENTS — earned once for the whole game (shared by every character
 * on this device), shown with a little banner.
 *
 *   ERX.Achievements.unlock('tutorial')   -> true the first time
 *   ERX.Achievements.has('tutorial')
 *
 * Add one: append to LIST, then call unlock() wherever it is earned.
 * They survive RESTART and new characters (the Voice remembers...).
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, F = ERX.Font, T = ERX.UITheme;

  const LIST = [
    { id: 'tutorial', name: 'Certified Button Presser', desc: 'Finish the tutorial. The Voice is so proud. (He is not.)' },
  ];
  const byId = Object.create(null);
  for (const a of LIST) byId[a.id] = a;

  const Achievements = {
    list: LIST,
    popups: [],

    get(id) { return byId[id] || null; },
    earned() {
      const e = ERX.Storage.load('achievements', []);
      return Array.isArray(e) ? e.filter((id) => byId[id]) : [];
    },
    has(id) { return this.earned().indexOf(id) !== -1; },

    unlock(id) {
      const a = byId[id];
      if (!a || this.has(id)) return false;
      ERX.Storage.save('achievements', this.earned().concat(id));
      this.popups.push({ a, t: 0, dur: 4.5 });
      ERX.Audio.playSfx('achievement');
      return true;
    },

    update(dt) {
      const p = this.popups[0];
      if (!p) return;
      p.t += dt;
      if (p.t >= p.dur) this.popups.shift();
    },

    /** Banner sliding down from the top, under the objective. */
    render(ctx, W) {
      const p = this.popups[0];
      if (!p) return;
      const a = p.a;
      const inK = U.ease.outBack(U.clamp(p.t / 0.4, 0, 1));
      const outK = U.clamp((p.dur - p.t) / 0.4, 0, 1);
      const w = Math.min(W - 20, Math.max(F.measure(a.name) * 1, F.measure(a.desc)) + 44), h = 34;
      const x = Math.round(W / 2 - w / 2), y = Math.round(50 + (inK - 1) * 80 - (1 - outK) * 80);   // below the HUD
      ctx.globalAlpha = outK;
      T.rect(ctx, x, y, w, h, T.ink);
      T.rect(ctx, x + 1, y + 1, w - 2, h - 2, '#2a2350');
      T.rect(ctx, x + 1, y + 1, w - 2, 1, '#ffd34d');
      // a little shine sweeping across
      const sx = x + Math.round(((p.t * 1.4) % 2) * w) - 20;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(Math.max(x + 1, sx), y + 2, Math.max(0, Math.min(14, x + w - 1 - sx)), h - 4);
      this._trophy(ctx, x + 8, y + 9, p.t);
      F.draw(ctx, 'ACHIEVEMENT UNLOCKED!', x + 32, y + 5, { color: '#ffd34d' });
      F.draw(ctx, a.name, x + 32, y + 14, { color: '#ffffff' });
      F.draw(ctx, a.desc, x + 32, y + 23, { color: '#b4bbdb' });
      ctx.globalAlpha = 1;
    },

    _trophy(ctx, x, y, t) {
      const R = (rx, ry, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + rx, y + ry, w, h); };
      const bounce = Math.round(Math.max(0, Math.sin(t * 6)) * -1);
      y += bounce;
      R(-1, -1, 18, 17, T.ink);
      R(1, 0, 14, 7, '#ffd34d'); R(3, 7, 10, 2, '#ffd34d'); R(6, 9, 4, 3, '#e8a820'); R(4, 12, 8, 3, '#c88a20');
      R(-1, 1, 2, 4, '#e8a820'); R(15, 1, 2, 4, '#e8a820');           // handles
      R(3, 1, 2, 4, '#fff6c0');                                        // shine
      if (Math.floor(t * 4) % 2) R(13, -2, 1, 1, '#ffffff');
    },
  };

  ERX.Achievements = Achievements;
})(window.ERX = window.ERX || {});
