/*
 * ADMIN PANEL (hidden). Opened from the main menu by typing
 * "theelementaladmin", and from then on from the pause menu.
 *
 *   - pick any of the elements to play with (or "MY ELEMENT")
 *   - skills: NORMAL / ALL LEARNED / ALL UPGRADED
 *   - god mode, infinite mana, instant Ultimate
 *   - in a game: +10 skill points, warp to the Training Room
 */
(function (ERX) {
  'use strict';

  const F = ERX.Font, T = ERX.UITheme;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const A = () => ERX.Admin;

  class AdminScreen extends ERX.PanelScreen {
    enter(p) {
      this.game = p.game || null;
      this.maxW = 440;
      this.maxH = 268;
      this.sel = 0;
      this.items = [];
    }

    _options() {
      const d = A().data, g = this.game;
      const opts = [
        { id: 'skills', label: 'SKILLS: ' + { normal: 'NORMAL', base: 'ALL LEARNED', max: 'ALL UPGRADED' }[d.skills], act: () => A().set('skills', { normal: 'base', base: 'max', max: 'normal' }[d.skills]) },
        { id: 'god', label: 'GOD MODE: ' + (d.god ? 'ON' : 'OFF'), act: () => A().set('god', !d.god) },
        { id: 'mp', label: 'INFINITE MANA: ' + (d.infiniteMp ? 'ON' : 'OFF'), act: () => A().set('infiniteMp', !d.infiniteMp) },
        { id: 'ult', label: 'INSTANT ULT: ' + (d.instantUlt ? 'ON' : 'OFF'), act: () => A().set('instantUlt', !d.instantUlt) },
        { id: 'awk', label: 'INSTANT AWAKENING: ' + (d.instantAwk ? 'ON' : 'OFF'), act: () => A().set('instantAwk', !d.instantAwk) },
      ];
      if (g) {
        opts.push({ id: 'pts', label: '+10 SKILL POINTS', act: () => { g.character.skillPoints = (g.character.skillPoints || 0) + 10; ERX.Saves.update(g.character); ERX.Toast.show('+10 skill points. Admin powers.', { color: '#ffd34d' }); } });
        opts.push({ id: 'train', label: 'GO TO TRAINING ROOM', act: () => this._warp() });
        opts.push({ id: 'awaken', label: 'AWAKEN NOW', act: () => { const p = g.player; if (!g.element()) return; p.ab.awk = 100; this.back(); p.ab.awaken(); } });
      }
      opts.push({ id: 'off', label: 'TURN ADMIN OFF', act: () => { A().lock(); ERX.Toast.show('Admin mode off. Back to being a normal person.', { color: '#ff8a6a' }); this.back(); } });
      opts.push({ id: 'close', label: 'CLOSE', act: () => this.back() });
      return opts;
    }

    _warp() {
      const g = this.game;
      const s = ERX.Scenes.stack;
      ERX.Scenes.transition('dissolve', 0.8, () => {
        while (s.length && s[s.length - 1].id !== 'game') s.pop().exit();
        g.loadLevel('training', {});
      });
    }

    _activate(it) {
      sfx('select');
      if (it.type === 'el') {
        A().set('element', it.id);
        if (this.game && this.game.player.ab) { this.game.player.ab = new ERX.AbilityState(this.game.player); this.game.player._blockPal = null; this.game.player._dashPal = null; }
        const el = it.id && ERX.Elements.get(it.id);
        ERX.Toast.show(el ? 'Now testing: ' + el.name.toUpperCase() : 'Back to your own element.', { color: el ? el.color : '#ffffff' });
      } else it.act();
    }

    update(dt, input, active) {
      if (this.handleBack(input, active)) return;
      if (!active) return;
      for (const a of input.actions) {
        const cur = this.items[this.sel];
        if (!cur) break;
        if (a === 'confirm') { this._activate(cur); continue; }
        // grid navigation: nearest item in that direction
        const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
        let best = -1, bd = Infinity;
        this.items.forEach((it, i) => {
          if (i === this.sel) return;
          const dx = it.x + it.w / 2 - cx, dy = it.y + it.h / 2 - cy;
          const ok = a === 'left' ? dx < -2 && Math.abs(dy) < 4 : a === 'right' ? dx > 2 && Math.abs(dy) < 4 : a === 'up' ? dy < -2 : a === 'down' ? dy > 2 : false;
          if (!ok) return;
          const d = Math.abs(dx) * (a === 'up' || a === 'down' ? 2 : 1) + Math.abs(dy);
          if (d < bd) { bd = d; best = i; }
        });
        if (best >= 0) { this.sel = best; sfx('move'); }
      }
      const m = input.mouse;
      this.items.forEach((it, i) => {
        const hit = m.x >= it.x && m.x < it.x + it.w && m.y >= it.y && m.y < it.y + it.h;
        if (hit && m.moved && i !== this.sel) { this.sel = i; sfx('hover'); }
        if (hit && m.pressed[0]) { this.sel = i; this._activate(it); }
      });
    }

    render(ctx) {
      const W = ERX.Display.width, H = ERX.Display.height;
      this.drawDim(ctx, W, H);
      const p = this.panel(W, H);
      T.drawPanel(ctx, p.x, p.y, p.w, p.h, { accent: '#ff3a4a' });
      T.drawTitlePlate(ctx, p.x + p.w / 2, p.y - 10, 'ADMIN PANEL');
      F.draw(ctx, 'TEST ANY ELEMENT (your real one is never changed)', p.x + p.w / 2, p.y + 10, { color: '#ff8a8a', align: 'center' });
      this.items = [];
      const cur = A().data.element;
      // the element grid
      const list = [{ id: null, name: 'MY ELEMENT', color: '#ffffff' }].concat(ERX.Elements.list);
      const cols = 6, cw = Math.floor((p.w - 20) / cols), ch = 13;
      list.forEach((el, i) => {
        const x = p.x + 10 + (i % cols) * cw, y = p.y + 22 + Math.floor(i / cols) * (ch + 2);
        this.items.push({ type: 'el', id: el.id, x, y, w: cw - 2, h: ch });
        const sel = this.sel === this.items.length - 1, on = (cur || null) === el.id;
        T.rect(ctx, x, y, cw - 2, ch, sel ? T.gold : T.ink);
        T.rect(ctx, x + 1, y + 1, cw - 4, ch - 2, on ? ERX.Color.shade(el.color || '#ffffff', -0.4) : '#141a3a');
        F.draw(ctx, (on ? '★' : '') + el.name.toUpperCase(), x + (cw - 2) / 2, y + 3, { color: el.color, align: 'center' });
      });
      // the switches
      const opts = this._options();
      const oy = p.y + 22 + Math.ceil(list.length / cols) * (ch + 2) + 6;
      const ow = Math.floor((p.w - 20) / 4);
      opts.forEach((o, i) => {
        const x = p.x + 10 + (i % 4) * ow, y = oy + Math.floor(i / 4) * 17;
        this.items.push(Object.assign({ type: 'opt', x, y, w: ow - 4, h: 14 }, o));
        const sel = this.sel === this.items.length - 1;
        T.rect(ctx, x, y, ow - 4, 14, sel ? T.gold : T.ink);
        T.rect(ctx, x + 1, y + 1, ow - 6, 12, o.id === 'off' ? '#4a1018' : '#22285a');
        F.draw(ctx, o.label, x + (ow - 4) / 2, y + 4, { color: sel ? T.gold : '#ffffff', align: 'center' });
      });
      if (this.sel >= this.items.length) this.sel = 0;
      if (!this.game) F.draw(ctx, 'Start a game, then open this again from the PAUSE menu.', p.x + p.w / 2, p.y + p.h - 12, { color: T.textMute, align: 'center' });
    }
  }

  ERX.Scenes.register('admin', AdminScreen);
})(window.ERX = window.ERX || {});
