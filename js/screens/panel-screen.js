/*
 * Base class for menu screens shown as a panel over the living world
 * (Settings, Help). The panel slides up on open and down on close; the
 * world behind is dimmed but keeps animating.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U;

  class PanelScreen extends ERX.Scenes.Screen {
    constructor(id) {
      super(id);
      this.appearDuration = 0.34;
      this.easeIn = (t) => U.ease.outCubic(t);
      this.maxW = 380;
      this.maxH = 252;
    }

    /** Panel rectangle including the slide offset. */
    panel(W, H) {
      const w = Math.min(W - 16, this.maxW);
      const h = Math.min(H - 18, this.maxH);
      const x = Math.round(W / 2 - w / 2);
      const restY = Math.round(H / 2 - h / 2) + 5;
      const slide = this.leaving ? (1 - this.appear) * (H - restY + 10) : (1 - U.ease.outBack(this.appearT)) * (H - restY + 10);
      return { x, y: Math.round(restY + slide), w, h };
    }

    /** True when a full-cover screen (creator, play...) sits fully on top of this panel. */
    isCovered() {
      const st = ERX.Scenes.stack;
      const i = st.indexOf(this);
      return st.slice(i + 1).some((s) => s.coversPanels && s.appearT >= 1 && !s.leaving);
    }

    drawDim(ctx, W, H) {
      ctx.fillStyle = 'rgba(5,6,16,' + (0.55 * this.appear).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    /** Standard back handling; subclasses call from update(). */
    handleBack(input, active) {
      if (active && input.hasAction('back')) {
        input.consumeAction('back');
        this.back();
        return true;
      }
      return false;
    }
  }

  ERX.PanelScreen = PanelScreen;
})(window.ERX = window.ERX || {});
