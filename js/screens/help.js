/*
 * HELP — a scrollable, slightly unhinged manual.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, F = ERX.Font, T = ERX.UITheme;
  const { Button, FocusGroup } = ERX.UI;

  class HelpScreen extends ERX.PanelScreen {
    enter() {
      this.maxW = 410;
      this.maxH = 262;
      this.scroll = 0;
      this.scrollTarget = 0;
      this.lines = null;
      this.wrapWidth = 0;
      this.dragging = false;
      this.backBtn = new Button({ label: 'BACK', icon: 'back', sound: null, onActivate: () => this.back() });
      this.group = new FocusGroup();
      this.group.set([this.backBtn]);
    }

    _layoutText(width) {
      if (this.lines && this.wrapWidth === width) return;
      this.wrapWidth = width;
      const lines = [];
      ERX.Data.help.forEach((sec, si) => {
        if (si > 0) lines.push({ gap: 8 });
        lines.push({ heading: sec.title, color: ERX.Color.ELEMENTS[si % ERX.Color.ELEMENTS.length] });
        lines.push({ gap: 3 });
        for (const para of sec.body) {
          for (const l of F.wrap(para, width)) lines.push({ text: l });
          lines.push({ gap: 4 });
        }
      });
      let y = 0;
      for (const l of lines) {
        l.y = y;
        y += l.gap !== undefined ? l.gap : l.heading ? 11 : 10;
      }
      this.lines = lines;
      this.contentH = y;
    }

    update(dt, input, active) {
      if (active) {
        if (this.handleBack(input, active)) return;
        const step = 12;
        for (const a of input.actions) {
          if (a === 'down') this.scrollTarget += step;
          else if (a === 'up') this.scrollTarget -= step;
          else if (a === 'pageDown') this.scrollTarget += this.viewH - 20;
          else if (a === 'pageUp') this.scrollTarget -= this.viewH - 20;
          else if (a === 'home') this.scrollTarget = 0;
          else if (a === 'end') this.scrollTarget = 1e9;
        }
        if (input.mouse.wheel) this.scrollTarget += input.mouse.wheel * 20;
        // drag the scrollbar thumb (or anywhere on the track)
        const m = input.mouse, sb = this.scrollbar;
        if (sb && m.pressed[0] && m.x >= sb.x - 3 && m.x <= sb.x + sb.w + 3 && m.y >= sb.y && m.y <= sb.y + sb.h) this.dragging = true;
        if (!m.down[0]) this.dragging = false;
        if (this.dragging && sb) {
          const k = U.clamp((m.y - sb.y - sb.thumbH / 2) / Math.max(1, sb.h - sb.thumbH), 0, 1);
          this.scrollTarget = k * this.maxScroll;
          this.scroll = this.scrollTarget;
        }
      }
      this.scrollTarget = U.clamp(this.scrollTarget, 0, this.maxScroll || 0);
      this.scroll = U.approach(this.scroll, this.scrollTarget, 18, dt);
      // up/down scroll the text here, so don't let them move button focus
      const filtered = { mouse: input.mouse, actions: input.actions.filter((a) => a === 'confirm') };
      this.group.update(dt, active ? filtered : input, active);
    }

    render(ctx) {
      const W = ERX.Display.width, H = ERX.Display.height;
      this.drawDim(ctx, W, H);
      const p = this.panel(W, H);
      T.drawPanel(ctx, p.x, p.y, p.w, p.h);
      T.drawTitlePlate(ctx, p.x + p.w / 2, p.y - 10, 'HELP');

      const view = { x: p.x + 16, y: p.y + 18, w: p.w - 40, h: p.h - 18 - 30 };
      this.viewH = view.h;
      this._layoutText(view.w - 4);
      this.maxScroll = Math.max(0, this.contentH - view.h + 6);

      ctx.save();
      ctx.beginPath();
      ctx.rect(view.x - 4, view.y, view.w + 8, view.h);
      ctx.clip();
      const off = Math.round(this.scroll);
      for (const l of this.lines) {
        const y = view.y + 2 + l.y - off;
        if (y < view.y - 12 || y > view.y + view.h + 2) continue;
        if (l.heading) {
          T.rect(ctx, view.x, y + 2, 3, 3, l.color);
          T.rect(ctx, view.x + 1, y + 1, 1, 5, l.color);
          T.rect(ctx, view.x - 1, y + 3, 5, 1, l.color);
          F.draw(ctx, l.heading, view.x + 8, y, { color: T.gold, shadow: T.ink });
          T.rect(ctx, view.x + 10 + F.measure(l.heading), y + 3, Math.max(0, view.w - F.measure(l.heading) - 12), 1, T.borderDark);
        } else if (l.text !== undefined) {
          F.draw(ctx, l.text, view.x + 4, y, { color: T.text });
        }
      }
      ctx.restore();

      // scrollbar
      const sb = { x: p.x + p.w - 18, y: view.y, w: 4, h: view.h };
      const thumbH = Math.max(14, Math.round((view.h / Math.max(view.h, this.contentH)) * sb.h));
      sb.thumbH = thumbH;
      this.scrollbar = sb;
      T.rect(ctx, sb.x, sb.y, sb.w, sb.h, T.ink);
      const ty = sb.y + Math.round((this.maxScroll ? this.scroll / this.maxScroll : 0) * (sb.h - thumbH));
      T.rect(ctx, sb.x, ty, sb.w, thumbH, this.dragging ? T.gold : T.borderLight);
      T.rect(ctx, sb.x, ty, 1, thumbH, '#8a98e0');

      // footer
      const by = p.y + p.h - 24;
      F.draw(ctx, '↑↓ / WHEEL SCROLL', p.x + 18, by + 4, { color: T.textMute });
      const pct = this.maxScroll ? Math.round((this.scroll / this.maxScroll) * 100) : 100;
      F.draw(ctx, pct + '%', p.x + p.w - 18, by + 4, { color: T.textMute, align: 'right' });
      this.backBtn.setRect(p.x + p.w / 2 - 45, by, 90, 16);
      this.group.render(ctx);
    }
  }

  ERX.Scenes.register('help', HelpScreen);
})(window.ERX = window.ERX || {});
