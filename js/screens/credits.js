/*
 * CREDITS — a classic auto-scrolling credits roll over the dimmed world.
 * Scroll manually with ↑↓ / wheel; it resumes rolling on its own.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, F = ERX.Font, T = ERX.UITheme;
  const { Button, FocusGroup } = ERX.UI;

  class CreditsScreen extends ERX.Scenes.Screen {
    enter() {
      this.appearDuration = 0.45;
      this.idle = 1.6;
      this._initialScroll = true;
      this.backBtn = new Button({ label: 'BACK', icon: 'back', sound: null, onActivate: () => this.back() });
      this.group = new FocusGroup();
      this.group.set([this.backBtn]);
      this._build();
    }

    _build() {
      const D = ERX.Data.credits;
      const fill = (s) => s.replace(/\{(\w+)\}/g, (m, k) => (D.people[k] !== undefined ? D.people[k] : m));
      const items = [];
      let y = 0;
      const logo = ERX.Assets.image('logo');
      for (const e of D.roll) {
        if (e.logo) {
          items.push({ y, logo });
          y += logo ? logo.height : 40;
        } else if (e.gap) {
          y += e.gap;
        } else if (e.heading) {
          items.push({ y, heading: e.heading });
          y += 14;
          for (const n of e.names) {
            items.push({ y, name: fill(n) });
            y += 11;
          }
          y += 12;
        } else if (e.note) {
          items.push({ y, note: fill(e.note) });
          y += 11;
        }
      }
      this.items = items;
      this.height = y;
    }

    update(dt, input, active) {
      if (active) {
        if (input.hasAction('back')) { input.consumeAction('back'); this.back(); return; }
        let manual = 0;
        for (const a of input.actions) {
          if (a === 'down') manual += 14;
          else if (a === 'up') manual -= 14;
        }
        manual += input.mouse.wheel * 18;
        if (manual) { this.scroll += manual; this.idle = 0; }
      }
      if (this._initialScroll) {
        // start with the logo already on screen
        this.scroll = (ERX.Display.height - 30) - 20;
        this._initialScroll = false;
      }
      this.idle += dt;
      if (this.idle > 2.5) this.scroll += dt * 16;
      const viewH = ERX.Display.height - 40;
      if (this.scroll > this.height) this.scroll = -viewH + 20;
      if (this.scroll < -viewH) this.scroll = -viewH;
      const filtered = { mouse: input.mouse, actions: input.actions.filter((a) => a === 'confirm') };
      this.group.update(dt, active ? filtered : input, active);
    }

    render(ctx) {
      const W = ERX.Display.width, H = ERX.Display.height;
      const a = this.appear;
      ctx.fillStyle = 'rgba(5,6,16,' + (0.72 * a).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);

      const top = 8, bottom = H - 30;
      const startY = bottom;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, top, W, bottom - top);
      ctx.clip();
      ctx.globalAlpha = a;
      const cx = Math.round(W / 2);
      for (const it of this.items) {
        const y = Math.round(startY + it.y - this.scroll);
        if (y < top - 130 || y > bottom + 10) continue;
        if (it.logo !== undefined) {
          if (it.logo) ctx.drawImage(it.logo, Math.round(cx - it.logo.width / 2), y);
          else F.draw(ctx, ERX.Config.TITLE, cx, y + 16, { scale: 2, color: T.gold, align: 'center' });
        } else if (it.heading) {
          F.draw(ctx, it.heading, cx, y, { color: T.gold, shadow: '#5a2d10', align: 'center' });
          const hw = F.measure(it.heading);
          T.rect(ctx, cx - hw / 2 - 14, y + 3, 8, 1, T.goldDark);
          T.rect(ctx, cx + hw / 2 + 6, y + 3, 8, 1, T.goldDark);
        } else if (it.name) {
          F.draw(ctx, it.name, cx, y, { color: '#ffffff', shadow: T.ink, align: 'center' });
        } else if (it.note) {
          F.draw(ctx, it.note, cx, y, { color: '#a8f0ff', shadow: T.ink, align: 'center' });
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      this.backBtn.setRect(W / 2 - 45, H - 24 + Math.round((1 - a) * 30), 90, 16);
      this.group.render(ctx);
      F.draw(ctx, '↑↓ SCROLL', 6, H - 19, { color: T.textMute, alpha: a });
    }
  }

  ERX.Scenes.register('credits', CreditsScreen);
})(window.ERX = window.ERX || {});
