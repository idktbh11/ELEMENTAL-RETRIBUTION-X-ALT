/*
 * CHAOS WORLD — when you carry Chaos, the world around you bends more than it
 * does for any other element:
 *   - shards of colour drift through the air
 *   - every few seconds reality glitches (the screen tears sideways for a moment)
 *   - a faint, shifting rainbow tint over everything
 *   - the 7 worlds look stranger (js/game/level-void.js)
 *   - monsters are tougher (HARDER below; applied in ERX.Enemies.create)
 * Only after the reveal, i.e. once you actually have an element.
 */
(function (ERX) {
  'use strict';

  const HARDER = { hp: 1.25, damage: 1.2 };
  const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  const rainbow = (t) => 'hsl(' + Math.round(((t * 120) % 360 + 360) % 360) + ',95%,65%)';

  const ChaosWorld = {
    HARDER,
    /** Is the player carrying Chaos right now? */
    on(g) { const el = g && g.element && g.element(); return !!el && el.id === 'chaos'; },

    /** Stat multipliers for monsters (1 for everyone else). */
    difficulty(g) { return ChaosWorld.on(g) ? HARDER : { hp: 1, damage: 1 }; },

    /** Drawn over the world view (screen space). */
    render(c, g, vw, vh) {
      if (!ChaosWorld.on(g) || g.cine) return;
      const t = g.t;
      c.save();
      // a faint rainbow wash, slowly shifting
      c.globalAlpha = 0.045;
      c.fillStyle = rainbow(t * 0.15);
      c.fillRect(0, 0, vw, vh);
      // drifting shards of colour
      for (let i = 0; i < 22; i++) {
        const sp = 6 + hash(i) * 14, x = (hash(i + 7) * vw + t * sp * (i % 2 ? 1 : -1)) % vw, y = (hash(i + 3) * vh - t * (4 + hash(i + 9) * 8)) % vh;
        const xx = Math.round(x < 0 ? x + vw : x), yy = Math.round(y < 0 ? y + vh : y);
        c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 3 + i);
        c.fillStyle = rainbow(t * 0.5 + i * 0.4);
        const s = i % 5 === 0 ? 2 : 1;
        c.fillRect(xx, yy, s, s);
        if (i % 4 === 0) c.fillRect(xx + 2, yy, 1, 1);
      }
      // every few seconds: a glitch. The view tears into slices that slip sideways.
      const period = 4.7, win = Math.floor(t / period), local = t - win * period - hash(win) * 2;
      if (local > 0 && local < 0.16) {
        c.globalAlpha = 1;
        const src = c.canvas;
        for (let i = 0; i < 5; i++) {
          const sy = Math.floor(hash(win * 13 + i) * vh), sh = 3 + Math.floor(hash(win * 7 + i) * 10), dx = Math.round((hash(win * 3 + i) - 0.5) * 14);
          c.drawImage(src, 0, sy, vw, sh, dx, sy, vw, sh);
          c.globalAlpha = 0.25;
          c.fillStyle = i % 2 ? '#ff3aa0' : '#3affe8';
          c.fillRect(0, sy, vw, 1);
          c.globalAlpha = 1;
        }
      }
      c.restore();
    },
  };

  ERX.ChaosWorld = ChaosWorld;
})(window.ERX = window.ERX || {});
