/*
 * Reusable yes/no dialog.
 *   ERX.Scenes.push('confirm', { title, message, yes, no, danger, onYes, onNo })
 * Focus starts on the safe option; ESC always means "no".
 */
(function (ERX) {
  'use strict';

  const F = ERX.Font, T = ERX.UITheme;
  const { Button, FocusGroup } = ERX.UI;

  class ConfirmScreen extends ERX.PanelScreen {
    enter(p) {
      this.p = p;
      this.maxW = 240;
      this.maxH = 112;
      this.appearDuration = 0.25;
      this.noBtn = new Button({ label: p.no || 'NO', sound: null, onActivate: () => this._close(false) });
      this.yesBtn = new Button({ label: p.yes || 'YES', sound: null, accent: p.danger ? T.danger : null, onActivate: () => this._close(true) });
      this.noBtn.navRight = this.yesBtn;
      this.yesBtn.navLeft = this.noBtn;
      this.group = new FocusGroup();
      this.group.set([this.noBtn, this.yesBtn]);
      this.done = false;
    }

    _close(yes) {
      if (this.done) return;
      this.done = true;
      ERX.Audio.playSfx(yes ? (this.p.danger ? 'thud' : 'select') : 'back');
      ERX.Scenes.pop();
      const cb = yes ? this.p.onYes : this.p.onNo;
      if (cb) cb();
    }

    update(dt, input, active) {
      if (active && input.hasAction('back')) { input.consumeAction('back'); this._close(false); return; }
      this.group.update(dt, input, active && !this.done);
    }

    panel(W, H) {
      const w = Math.min(W - 24, this.maxW);
      const lines = F.wrap(this.p.message || '', w - 28);
      const h = Math.min(H - 20, 58 + lines.length * 10);
      const x = Math.round(W / 2 - w / 2);
      const k = this.appear;
      const y = Math.round(H / 2 - h / 2 + (1 - k) * 20);
      return { x, y, w, h, lines };
    }

    render(ctx) {
      const W = ERX.Display.width, H = ERX.Display.height;
      this.drawDim(ctx, W, H);
      const p = this.panel(W, H);
      ctx.globalAlpha = this.appear;
      T.drawPanel(ctx, p.x, p.y, p.w, p.h, { accent: this.p.danger ? T.danger : T.gold });
      F.draw(ctx, this.p.title || 'ARE YOU SURE?', p.x + p.w / 2, p.y + 9, { color: this.p.danger ? T.danger : T.gold, shadow: T.ink, align: 'center' });
      p.lines.forEach((l, i) => F.draw(ctx, l, p.x + p.w / 2, p.y + 23 + i * 10, { color: T.text, align: 'center' }));
      const by = p.y + p.h - 23;
      this.noBtn.setRect(p.x + p.w / 2 - 88, by, 80, 16);
      this.yesBtn.setRect(p.x + p.w / 2 + 8, by, 80, 16);
      this.group.render(ctx);
      ctx.globalAlpha = 1;
    }
  }

  ERX.Scenes.register('confirm', ConfirmScreen);
})(window.ERX = window.ERX || {});
