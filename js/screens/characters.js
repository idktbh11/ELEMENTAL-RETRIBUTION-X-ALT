/*
 * SELECT CHARACTER — list of saved characters (Terraria-style).
 * Each row: portrait, name, stats, and PLAY / DELETE buttons.
 * Bottom: BACK and NEW.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, F = ERX.Font, T = ERX.UITheme, PS = ERX.PlayerSprite;
  const { Widget, Button, FocusGroup } = ERX.UI;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);

  function fmtDate(ms) {
    const d = new Date(ms);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /** One saved character. slot 0 = PLAY, slot 1 = DELETE. */
  class CharacterRow extends Widget {
    constructor(o) {
      super(Object.assign({ character: null, slot: 0, onPlay: null, onDelete: null, highlight: 0 }, o));
    }
    _btn(i) {
      const bw = 18, bh = 14;
      return { x: this.x + this.w - 6 - (2 - i) * (bw + 4) + 4, y: this.y + Math.floor((this.h - bh) / 2), w: bw, h: bh };
    }
    _slotAt(mx, my) {
      for (let i = 0; i < 2; i++) {
        const r = this._btn(i);
        if (mx >= r.x - 1 && mx < r.x + r.w + 1 && my >= r.y - 2 && my < r.y + r.h + 2) return i;
      }
      return -1;
    }
    onNav(dir) {
      const s = U.clamp(this.slot + dir, 0, 1);
      if (s !== this.slot) { this.slot = s; sfx('move'); }
      return true;
    }
    onPointerDown(mx, my) {
      const s = this._slotAt(mx, my);
      this.slot = s === -1 ? 0 : s;
    }
    activate() {
      this.flash = 1;
      if (this.slot === 1) { if (this.onDelete) this.onDelete(this); }
      else if (this.onPlay) this.onPlay(this);
    }
    update(dt, focused) {
      super.update(dt, focused);
      this.highlight = Math.max(0, this.highlight - dt * 0.8);
      const m = ERX.Input.mouse;
      if (focused && m.moved) {
        const s = this._slotAt(m.x, m.y);
        if (s !== -1 && s !== this.slot) { this.slot = s; sfx('hover'); }
      }
    }
    render(ctx, focused) {
      const c = this.character;
      const accent = T.elementCycle(this.time, 0.6);
      const x = this.x, y = this.y, w = this.w, h = this.h;
      // row frame
      T.rect(ctx, x + 1, y, w - 2, h, T.ink);
      T.rect(ctx, x, y + 1, w, h - 2, T.ink);
      T.rect(ctx, x + 1, y + 1, w - 2, h - 2, focused ? accent : T.borderDark);
      T.rect(ctx, x + 2, y + 2, w - 4, h - 4, focused ? '#232c62' : '#182046');
      T.rect(ctx, x + 2, y + 2, w - 4, 1, focused ? '#34408a' : '#222a58');
      if (this.highlight > 0) {
        ctx.fillStyle = 'rgba(255,211,77,' + (this.highlight * 0.3).toFixed(3) + ')';
        ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      }
      if (this.flash > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + (this.flash * 0.4).toFixed(3) + ')';
        ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      }
      // portrait
      const px = x + 4, py = y + 3, pw = 22, ph = h - 6;
      T.rect(ctx, px, py, pw, ph, T.ink);
      T.rect(ctx, px + 1, py + 1, pw - 2, ph - 2, '#0e1330');
      const frame = focused ? PS.idleFrame(c.look, this.time, c.created % 7) : PS.frame(c.look, 'idle', 0);
      PS.draw(ctx, frame, px + pw / 2, py + ph - 1, 1);
      // text
      const tx = px + pw + 6;
      F.draw(ctx, c.name, tx, y + 5, { color: focused ? T.gold : '#ffffff', shadow: T.ink });
      const el = ERX.Elements.get(c.element);
      const elText = el ? '{el' + el.id + '}' + el.name.toUpperCase() + '{/}' : '{purple}???{/}';
      const stats = w >= 320 ? '{red}♥{/} 100 HP   {cyan}★{/} 20 MP   ELEMENT: ' + elText : '{red}♥{/} 100  {cyan}★{/} 20  ELEMENT: ' + elText;
      F.draw(ctx, stats, tx, y + 16, { color: T.textDim });
      const right = this._btn(0).x - 6;
      F.draw(ctx, 'LV ' + (c.level || 1), right, y + 5, { color: T.textMute, align: 'right' });
      // buttons
      for (let i = 0; i < 2; i++) {
        const r = this._btn(i);
        const sel = focused && this.slot === i;
        const col = sel ? (i === 1 ? T.danger : T.good) : T.border;
        T.rect(ctx, r.x + 1, r.y, r.w - 2, r.h, T.ink);
        T.rect(ctx, r.x, r.y + 1, r.w, r.h - 2, T.ink);
        T.rect(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, col);
        T.rect(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, sel ? '#2b3670' : '#1d2550');
        const icon = i === 0 ? 'play' : 'trash';
        const ic = ERX.Sprites.icons[icon];
        ERX.Sprites.drawIcon(ctx, icon, r.x + Math.floor((r.w - ic.w) / 2), r.y + Math.floor((r.h - ic.h) / 2), sel ? (i === 1 ? '#ff8a6a' : '#9cf07a') : T.textDim, sel ? '#ffffff' : null);
      }
    }
  }

  class CharactersScreen extends ERX.PanelScreen {
    enter() {
      this.maxW = 360;
      this.maxH = 252;
      this.scroll = 0;
      this.scrollTarget = 0;
      ERX.Saves.load();
      this.group = new FocusGroup({ wrap: true });
      this.backBtn = new Button({ label: 'BACK', icon: 'back', sound: null, fixed: true, onActivate: () => this.back() });
      this.newBtn = new Button({ label: 'NEW', icon: 'plus', fixed: true, onActivate: () => this._new() });
      this.backBtn.navRight = this.newBtn;
      this.newBtn.navLeft = this.backBtn;
      this._buildRows();
      // with no characters yet, jump straight to NEW
      if (!this.rows.length) this.group.focus(this.newBtn);
    }

    _buildRows(focusId) {
      this.rows = ERX.Saves.characters.map((c) => new CharacterRow({
        character: c,
        onPlay: (row) => this._play(row.character),
        onDelete: (row) => this._confirmDelete(row.character),
      }));
      this.group.set(this.rows.concat([this.backBtn, this.newBtn]), false);
      if (focusId) {
        const r = this.rows.find((x) => x.character.id === focusId);
        if (r) { this.group.focus(r); r.highlight = 1; }
      }
    }

    /** Called by the creator after a character is made. */
    resume() {
      if (this.pendingFocus) {
        this._buildRows(this.pendingFocus);
        this.pendingFocus = null;
      }
    }

    _new() {
      if (ERX.Saves.full) {
        ERX.Toast.show('The character list is full (' + ERX.Data.character.MAX_CHARACTERS + '). Delete someone. Choose wisely.', { color: '#ff8a6a' });
        sfx('deny');
        return;
      }
      ERX.Scenes.push('creator', { list: this });
    }

    _play(c) {
      ERX.Saves.touch(c.id);
      ERX.Scenes.push('game', { character: c }, { transition: 'dissolve', duration: 1.0 });
    }

    _confirmDelete(c) {
      sfx('deny');
      ERX.Scenes.push('confirm', {
        title: 'DELETE CHARACTER?',
        message: 'Delete ' + c.name + ' forever? They had so much potential. Probably.',
        yes: 'DELETE', no: 'KEEP', danger: true,
        onYes: () => {
          ERX.Saves.remove(c.id);
          this._buildRows();
          if (!this.rows.length) this.group.focus(this.newBtn);
          ERX.Toast.show(c.name + ' has been deleted. They will be missed. Slightly.', { color: '#ff8a6a' });
          ERX.FX.shake(2, 0.25);
        },
      });
    }

    update(dt, input, active) {
      if (this.handleBack(input, active)) return;
      if (active) {
        // DELETE key on a focused row asks to delete it
        const f = this.group.focused;
        if (input.hasAction('delete') && f instanceof CharacterRow) { f.slot = 1; f.activate(); return; }
        if (input.mouse.wheel) this.scrollTarget += input.mouse.wheel * 20;
      }
      this.group.update(dt, input, active);
      this._keepVisible();
      this.scroll = U.approach(this.scroll, this.scrollTarget, 16, dt);
    }

    _keepVisible() {
      const L = this._layout;
      if (!L) return;
      const i = this.rows.indexOf(this.group.focused);
      const maxScroll = Math.max(0, this.rows.length * L.step - L.areaH + 2);
      if (i !== -1) {
        const top = i * L.step, bottom = top + L.rowH;
        if (top < this.scrollTarget) this.scrollTarget = top;
        if (bottom > this.scrollTarget + L.areaH) this.scrollTarget = bottom - L.areaH;
      }
      this.scrollTarget = U.clamp(this.scrollTarget, 0, maxScroll);
    }

    render(ctx) {
      if (this.isCovered()) return;
      const W = ERX.Display.width, H = ERX.Display.height;
      this.drawDim(ctx, W, H);
      const p = this.panel(W, H);
      T.drawPanel(ctx, p.x, p.y, p.w, p.h);
      T.drawTitlePlate(ctx, p.x + p.w / 2, p.y - 10, 'SELECT CHARACTER');

      const listX = p.x + 12, listW = p.w - 24;
      const listY = p.y + 18;
      const bottomY = p.y + p.h - 24;
      const areaH = bottomY - 18 - listY;
      const rowH = 30, step = 33;
      this._layout = { rowH, step, areaH };

      // inset list background
      T.rect(ctx, listX - 2, listY - 2, listW + 4, areaH + 4, T.ink);
      T.rect(ctx, listX - 1, listY - 1, listW + 2, areaH + 2, '#0d1128');

      const off = Math.round(this.scroll);
      this.rows.forEach((r, i) => r.setRect(listX + 2, listY + 2 + i * step - off, listW - 4, rowH));
      this.group.clip = { x: listX, y: listY, w: listW, h: areaH };
      ctx.save();
      ctx.beginPath();
      ctx.rect(listX - 1, listY - 1, listW + 2, areaH + 2);
      ctx.clip();
      const f = this.group.focused;
      for (const r of this.rows) if (r.y + r.h > listY && r.y < listY + areaH) r.render(ctx, r === f);
      ctx.restore();

      if (!this.rows.length) {
        const cy = listY + areaH / 2 - 14;
        F.draw(ctx, 'No characters yet.', p.x + p.w / 2, cy, { color: T.textDim, align: 'center' });
        F.draw(ctx, 'Press {gold}NEW{/} to make one. They do not bite.', p.x + p.w / 2, cy + 12, { color: T.textMute, align: 'center' });
        F.draw(ctx, '(Probably.)', p.x + p.w / 2, cy + 24, { color: T.textMute, align: 'center' });
      }
      const maxScroll = Math.max(0, this.rows.length * step - areaH + 2);
      if (maxScroll > 0) {
        const bob = Math.round(Math.sin(this.time * 6));
        if (this.scroll > 1) F.draw(ctx, '↑', listX + listW + 3, listY + bob, { color: T.gold });
        if (this.scroll < maxScroll - 1) F.draw(ctx, '↓', listX + listW + 3, listY + areaH - 8 - bob, { color: T.gold });
      }

      // info line
      const count = ERX.Saves.characters.length + ' / ' + ERX.Data.character.MAX_CHARACTERS + ' CHARACTERS';
      F.draw(ctx, count, listX, bottomY - 13, { color: T.textMute });
      if (f instanceof CharacterRow) {
        const hint = f.slot === 1 ? 'Delete this character (asks first)' : 'Play as ' + f.character.name;
        F.draw(ctx, hint, listX + listW, bottomY - 13, { color: f.slot === 1 ? T.danger : T.textDim, align: 'right' });
      }

      const bw = Math.min(140, Math.floor((p.w - 36) / 2));
      this.backBtn.setRect(p.x + p.w / 2 - bw - 4, bottomY, bw, 16);
      this.newBtn.setRect(p.x + p.w / 2 + 4, bottomY, bw, 16);
      this.newBtn.label = ERX.Saves.full ? 'FULL' : 'NEW';
      this.backBtn.render(ctx, this.backBtn === f);
      this.newBtn.render(ctx, this.newBtn === f);
    }
  }

  ERX.Scenes.register('characters', CharactersScreen);
})(window.ERX = window.ERX || {});
