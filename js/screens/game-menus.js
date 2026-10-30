/*
 * In-game menus: PAUSE, INVENTORY and the end-of-content panel.
 * (The skill tree is js/screens/skill-tree.js.)
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, F = ERX.Font, T = ERX.UITheme;
  const { Button, FocusGroup } = ERX.UI;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);

  // ================================================================ PAUSE
  class PauseScreen extends ERX.PanelScreen {
    enter(p) {
      this.game = p.game;
      this.maxW = 200;
      this.maxH = 182;
      const b = (label, icon, fn) => new Button({ label, icon, onActivate: fn });
      this.buttons = [
        b('RESUME', 'play', () => this.back()),
        b('SKILL TREE', 'star', () => ERX.Scenes.replace('skills', { game: this.game })),
        b('INVENTORY', 'keys', () => ERX.Scenes.replace('inventory', { game: this.game })),
        b('SETTINGS', 'gear', () => ERX.Scenes.push('settings')),
        b('RESTART', 'reset', () => this._restart()),
        b('QUIT TO MENU', 'back', () => this._quit()),
      ];
      // no restarting once you have your element: there's no going back
      if (this.game.awakened && this.game.awakened()) { this.buttons.splice(4, 1); this.maxH -= 24; }
      if (ERX.Admin.on()) { this.buttons.splice(this.buttons.length - 1, 0, b('ADMIN', 'gear', () => ERX.Scenes.push('admin', { game: this.game }))); this.maxH += 24; }
      this.group = new FocusGroup();
      this.group.set(this.buttons);
    }
    _restart() {
      ERX.Scenes.push('confirm', {
        title: 'RESTART?', message: 'Wipe ALL progress and start over in the cave? Level, XP, skills, gold, armor and your element are all reset. Only your looks survive.',
        yes: 'RESTART', no: 'CANCEL', danger: true,
        onYes: () => {
          const c = this.game.character;
          // a true fresh start: everything except name + looks
          c.progress = { stage: 'new' };
          c.level = 1;
          c.xp = 0;
          c.skills = { vitality: 0, focus: 0, agility: 0 };
          c.elementSkills = {};
          c.skillPoints = 0;
          c.gold = 0;
          ERX.Inventory.reset(c);
          delete c.element;
          ERX.Saves.update(c);
          ERX.Scenes.transition('dissolve', 0.9, () => {
            const s = ERX.Scenes.stack;
            while (s.length && s[s.length - 1].id !== 'game') s.pop().exit();
            const g = s.pop();
            if (g) g.exit();
            s.push(ERX.Scenes._create('game', { character: c }));
          });
        },
      });
    }
    _quit() {
      const s = ERX.Scenes.stack;
      ERX.Scenes.transition('dissolve', 0.9, () => {
        // remove the pause menu and the game, landing on the character list
        while (s.length && s[s.length - 1].id !== 'game') { const x = s.pop(); x.exit(); }
        const g = s.pop();
        if (g) g.exit();
        const top = ERX.Scenes.top();
        if (top) top.resume();
      });
    }
    update(dt, input, active) {
      if (this.handleBack(input, active)) return;
      this.group.update(dt, input, active);
    }
    render(ctx) {
      const W = ERX.Display.width, H = ERX.Display.height;
      this.drawDim(ctx, W, H);
      const p = this.panel(W, H);
      T.drawPanel(ctx, p.x, p.y, p.w, p.h);
      T.drawTitlePlate(ctx, p.x + p.w / 2, p.y - 10, 'PAUSED');
      this.buttons.forEach((b, i) => b.setRect(p.x + 18, p.y + 20 + i * 24, p.w - 36, 18));
      this.group.render(ctx);
    }
  }

  // ============================================================ INVENTORY
  // Minecraft-style: your armour and you on top, the bag (3 x 9) and the hotbar (9) underneath.
  //   click (or Enter / Space on the selected slot): pick up / put down / swap / stack
  //   right-click: grab half a stack, or put down just one
  //   Shift-click: send it between the bag and the hotbar (armour gets worn / taken off)
  //   1-9: swap with that hotbar slot. Hover (or select) something for the details.
  const CELL = 20;
  const ARMOR_SLOTS = ['head', 'chest', 'legs', 'feet'];
  // faint outlines in the empty armour slots (like the game this is shamelessly inspired by)
  const GHOST = {
    head: ['..######..', '.#......#.', '#........#', '#.######.#', '#.#....#.#', '###....###'],
    chest: ['.##....##.', '#..#..#..#', '#...##...#', '#........#', '.#......#.', '.#......#.', '.#......#.', '..######..'],
    legs: ['########', '#......#', '#..##..#', '#..##..#', '#..##..#', '#..##..#', '###..###'],
    feet: ['.##....##.', '.##....##.', '.##....##.', '###....###', '####..####'],
  };
  const drawGrid = (ctx, rows, cx, cy, col) => {
    ctx.fillStyle = col;
    const ox = Math.round(cx - rows[0].length / 2), oy = Math.round(cy - rows.length / 2);
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') ctx.fillRect(ox + x, oy + y, 1, 1); });
  };

  class InventoryScreen extends ERX.PanelScreen {
    enter(p) {
      this.game = p.game;
      this.maxW = 9 * CELL + 34;
      this.maxH = 226;
      this.c = ERX.Inventory.ensure(this.game.character);
      this.held = null;      // what's on the cursor: { id, n, from }
      this.sel = 9;          // the keyboard cursor: 0-35 (bag), 'head' / 'chest' / 'legs' / 'feet', or 'back'
      this.hover = null;     // the slot under the mouse
      this.slots = [];       // where each slot was drawn: { k, x, y }
      this.t = 0;
      this.backBtn = new Button({ label: 'BACK', icon: 'back', sound: null, onActivate: () => this.back() });
    }
    back() {
      this._putBack();
      ERX.Saves.update(this.c);
      super.back();
    }

    // ---- slots: numbers are the bag (0-8 = the hotbar), strings are armour
    _get(k) { if (typeof k === 'number') return this.c.inv[k]; const id = this.c.equip[k]; return id ? { id, n: 1 } : null; }
    _set(k, s) { if (typeof k === 'number') this.c.inv[k] = s && s.n > 0 ? s : null; else this.c.equip[k] = s ? s.id : null; }
    _fits(k, id) { if (typeof k === 'number') return true; const it = ERX.Items.get(id); return !!(it && it.slot === k); }
    _cap(k, id) { return typeof k === 'number' ? ERX.Inventory.max(id) : 1; }
    _changed() { ERX.Inventory.sync(this.c); }

    /** A click on slot k (right: the right mouse button; shift: Shift held). */
    _click(k, right, shift) {
      const cur = this._get(k), H = this.held;
      if (!H) {
        if (!cur) return;
        if (shift) { this._quick(k); return; }
        if (right && cur.n > 1) { const take = Math.ceil(cur.n / 2); this.held = { id: cur.id, n: take, from: k }; cur.n -= take; }   // grab half
        else { this.held = { id: cur.id, n: cur.n, from: k }; this._set(k, null); }
        sfx('select'); this._changed();
        return;
      }
      if (!this._fits(k, H.id)) { sfx('deny'); this._nope(k); return; }
      const cap = this._cap(k, H.id);
      if (!cur) {
        const n = Math.min(right ? 1 : H.n, cap);
        this._set(k, { id: H.id, n }); H.n -= n;
      } else if (cur.id === H.id && cur.n < cap) {
        const n = Math.min(right ? 1 : H.n, cap - cur.n);
        cur.n += n; H.n -= n;
      } else {
        // swap what's on the cursor with what's in the slot
        if (H.n > cap) { sfx('deny'); return; }
        this._set(k, { id: H.id, n: H.n });
        this.held = { id: cur.id, n: cur.n, from: k };
        sfx('select'); this._changed();
        return;
      }
      if (H.n <= 0) this.held = null;
      sfx('select'); this._changed();
    }
    /** Shift-click: armour gets worn (or taken off); everything else hops between the bag and the hotbar. */
    _quick(k) {
      const cur = this._get(k), inv = this.c.inv, it = cur && ERX.Items.get(cur.id);
      if (!cur) return;
      if (typeof k === 'string') {
        const i = this._free(9, 36) !== null ? this._free(9, 36) : this._free(0, 9);
        if (i === null) { sfx('deny'); return; }
        inv[i] = { id: cur.id, n: 1 }; this._set(k, null);
      } else if (it && it.slot && !this.c.equip[it.slot]) {
        this.c.equip[it.slot] = cur.id; inv[k] = null;
      } else {
        const [a, b] = k < 9 ? [9, 36] : [0, 9], cap = ERX.Inventory.max(cur.id);
        for (let i = a; i < b && cur.n > 0; i++) { const s = inv[i]; if (s && s.id === cur.id && s.n < cap) { const n = Math.min(cur.n, cap - s.n); s.n += n; cur.n -= n; } }
        if (cur.n > 0) { const i = this._free(a, b); if (i !== null) { inv[i] = { id: cur.id, n: cur.n }; cur.n = 0; } }
        if (cur.n <= 0) inv[k] = null;
        else if (cur.n === inv[k].n) { sfx('deny'); return; }
      }
      sfx('select'); this._changed();
    }
    _free(a, b) { for (let i = a; i < b; i++) if (!this.c.inv[i]) return i; return null; }
    /** 1-9: swap slot k with that hotbar slot. */
    _swapHot(k, h) {
      if (k === null || k === 'back' || k === h) return;
      const a = this._get(k), b = this.c.inv[h];
      if (typeof k === 'string' && b && !this._fits(k, b.id)) { sfx('deny'); this._nope(k); return; }
      if (typeof k === 'string' && b && b.n > 1) { sfx('deny'); return; }
      this._set(k, b ? { id: b.id, n: b.n } : null);
      this.c.inv[h] = a ? { id: a.id, n: a.n } : null;
      sfx('select'); this._changed();
    }
    /** Whatever's on the cursor goes back where it came from (or anywhere it fits). */
    _putBack() {
      const H = this.held;
      if (!H) return;
      this.held = null;
      const from = H.from, cur = from !== undefined ? this._get(from) : null;
      if (from !== undefined && !cur && this._fits(from, H.id)) this._set(from, { id: H.id, n: H.n });
      else if (cur && cur.id === H.id && typeof from === 'number' && cur.n + H.n <= ERX.Inventory.max(H.id)) cur.n += H.n;
      else ERX.Inventory._put(this.c, H.id, H.n);
      this._changed();
    }
    /** A little shake on a slot that refused something. */
    _nope(k) { this.shake = { k, t: 0.25 }; }

    update(dt, input, active) {
      this.t += dt;
      if (this.shake) { this.shake.t -= dt; if (this.shake.t <= 0) this.shake = null; }
      if (this.handleBack(input, active)) return;
      if (!active) return;
      if (ERX.Keybinds.wasPressed('inventory')) { this.back(); return; }
      const shift = input.down.has('ShiftLeft') || input.down.has('ShiftRight');
      for (const a of input.actions) {
        if (a === 'up' || a === 'down' || a === 'left' || a === 'right') this._move(a);
        else if (a === 'confirm') { if (this.sel === 'back') this.backBtn.activate(); else this._click(this.sel, false, shift); }
      }
      const m = input.mouse;
      this.hover = null;
      for (const s of this.slots) if (m.x >= s.x && m.x < s.x + CELL && m.y >= s.y && m.y < s.y + CELL) this.hover = s.k;
      if (m.moved && this.hover !== null) this.sel = this.hover;   // the keyboard cursor follows the mouse
      if (this.hover !== null && (m.pressed[0] || m.pressed[2])) this._click(this.hover, m.pressed[2], shift);
      for (let i = 1; i <= 9; i++) if (input.pressed.has('Digit' + i) || input.pressed.has('Numpad' + i)) this._swapHot(this.hover !== null ? this.hover : this.sel, i - 1);
      const b = this.backBtn;
      if (m.moved && b.contains(m.x, m.y)) this.sel = 'back';
      if (m.pressed[0] && b.contains(m.x, m.y)) b.activate();
      b.update(dt, this.sel === 'back');
    }
    /** Arrow keys / WASD: the nearest slot in that direction (down from the hotbar is the BACK button). */
    _move(dir) {
      if (this.sel === 'back') { if (dir === 'up') { this.sel = 4; sfx('move'); } return; }
      const cur = this.slots.find((s) => s.k === this.sel);
      if (!cur) { this.sel = 9; return; }
      let best = null, bd = Infinity;
      for (const s of this.slots) {
        if (s === cur) continue;
        const dx = s.x - cur.x, dy = s.y - cur.y;
        const ok = dir === 'left' ? dx < -2 : dir === 'right' ? dx > 2 : dir === 'up' ? dy < -2 : dy > 2;
        if (!ok) continue;
        const along = dir === 'left' || dir === 'right' ? Math.abs(dx) : Math.abs(dy), across = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
        const d = along + across * 3;
        if (d < bd) { bd = d; best = s; }
      }
      if (best) { this.sel = best.k; sfx('move'); }
      else if (dir === 'down') { this.sel = 'back'; sfx('move'); }
    }

    render(ctx) {
      const W = ERX.Display.width, H = ERX.Display.height, c = this.c;
      this.drawDim(ctx, W, H);
      const p = this.panel(W, H);
      T.drawPanel(ctx, p.x, p.y, p.w, p.h);
      T.drawTitlePlate(ctx, p.x + p.w / 2, p.y - 10, 'INVENTORY');
      const x0 = p.x + 17, top = p.y + 16;
      this.slots = [];
      // ---- armour
      ARMOR_SLOTS.forEach((k, i) => this._slot(ctx, k, x0, top + i * (CELL + 1)));
      // ---- you, looking at the cursor
      const bx = x0 + CELL + 4, bw = 58, bh = 4 * (CELL + 1) - 1;
      T.rect(ctx, bx, top, bw, bh, T.ink); T.rect(ctx, bx + 1, top + 1, bw - 2, bh - 2, '#0b0f24');
      T.rect(ctx, bx + 1, top + bh - 13, bw - 2, 12, '#11163a');
      const pl = this.game.player, PS = ERX.PlayerSide, m = ERX.Input.mouse;
      if (pl && PS) {
        const face = m.present && m.x < bx + bw / 2 ? -1 : 1, cv = PS.frame(pl.look, 'idle', Math.floor(this.t * 1.6) % 2, face);
        ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#000000'; ctx.fillRect(bx + bw / 2 - 11, top + bh - 9, 22, 3); ctx.restore();
        ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(bx + bw / 2, top + bh - 7); ctx.scale(2, 2); PS.draw(ctx, cv, 0, 0, face); ctx.restore();
      }
      // ---- who you are
      const ix = bx + bw + 6, el = ERX.Elements.get(c.element);
      F.draw(ctx, c.name, ix, top + 1, { color: '#ffffff' });
      F.draw(ctx, 'LEVEL ' + (c.level || 1), ix, top + 12, { color: T.textDim });
      if (el) { ERX.Symbols.element(ctx, el.id, ix + 4, top + 27, 1, { t: this.t }); F.draw(ctx, el.name.toUpperCase(), ix + 11, top + 24, { color: el.color }); }
      else F.draw(ctx, 'ELEMENT: ???', ix, top + 24, { color: T.textMute });
      const def = ERX.Inventory.defense(c);
      F.draw(ctx, 'DEF +' + def, ix, top + 38, { color: def ? '#a8e8ff' : T.textMute });
      F.draw(ctx, 'GOLD ' + (c.gold || 0) + 'G', ix, top + 50, { color: '#ffd34d' });
      if (!c.inv.some(Boolean) && !ARMOR_SLOTS.some((k) => c.equip[k])) F.wrap('Empty. You woke up in a cave. What did you expect, a sword?', 92).slice(0, 3).forEach((ln, i) => F.draw(ctx, ln, ix, top + 61 + i * 8, { color: T.textMute }));
      // ---- the bag, then the hotbar
      const gy = top + bh + 12;
      F.draw(ctx, 'BAG', x0, gy - 9, { color: T.gold });
      for (let r = 0; r < 3; r++) for (let q = 0; q < 9; q++) this._slot(ctx, 9 + r * 9 + q, x0 + q * CELL, gy + r * CELL);
      const hy = gy + 3 * CELL + 5;
      for (let q = 0; q < 9; q++) this._slot(ctx, q, x0 + q * CELL, hy);
      this.backBtn.setRect(p.x + p.w / 2 - 36, p.y + p.h - 21, 72, 15);
      this.backBtn.render(ctx, this.sel === 'back');
      // ---- what's on the cursor (follows the mouse, or sits over the selected slot)
      if (this.held) {
        const at = this.slots.find((s) => s.k === this.sel), kb = ERX.Input.lastDevice === 'keyboard' || !m.present;
        const hx = kb && at ? at.x + CELL / 2 + 3 : m.x, hy2 = kb && at ? at.y + CELL / 2 - 4 : m.y;
        const it = ERX.Items.get(this.held.id);
        if (it) it.draw(ctx, hx, hy2, this.t, 1);
        if (this.held.n > 1) F.draw(ctx, String(this.held.n), hx + 8, hy2 + 2, { color: '#ffffff', align: 'right', outline: T.ink });
      }
      // ---- the details of whatever you're pointing at
      // (on a touch screen there's no hovering, so you see the details of whatever you're carrying)
      const touch = ERX.Input.lastDevice === 'touch';
      if (this.held) { if (touch) this._tooltip(ctx, this.sel, this.held, W, H); }
      else {
        const tk = this.hover !== null ? this.hover : ERX.Input.lastDevice === 'keyboard' ? this.sel : null, ts = tk !== null && tk !== 'back' ? this._get(tk) : null;
        if (ts) this._tooltip(ctx, tk, ts, W, H);
      }
    }
    _slot(ctx, k, x, y) {
      const sh = this.shake && this.shake.k === k ? Math.round(Math.sin(this.shake.t * 60) * 2) : 0;
      x += sh;
      this.slots.push({ k, x: x - sh, y });
      const s = this._get(k), hot = typeof k === 'number' && k < 9;
      T.rect(ctx, x, y, CELL, CELL, T.ink);
      T.rect(ctx, x + 1, y + 1, CELL - 2, CELL - 2, hot ? '#1b2250' : '#151a3a');
      T.rect(ctx, x + 1, y + 1, CELL - 2, 1, '#0c1028'); T.rect(ctx, x + 1, y + 1, 1, CELL - 2, '#0c1028');   // set in, like a real slot
      T.rect(ctx, x + 1, y + CELL - 2, CELL - 2, 1, '#2a3368'); T.rect(ctx, x + CELL - 2, y + 1, 1, CELL - 2, '#2a3368');
      if (!s && typeof k === 'string') drawGrid(ctx, GHOST[k], x + CELL / 2, y + CELL / 2, '#2a3266');
      if (s) {
        const it = ERX.Items.get(s.id);
        if (it) it.draw(ctx, x + CELL / 2, y + CELL / 2, this.t, 1);
        if (s.n > 1) F.draw(ctx, String(s.n), x + CELL - 2, y + CELL - 8, { color: '#ffffff', align: 'right', outline: T.ink });
      }
      if (this.hover === k || this.sel === k) { ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2); }
      if (this.sel === k && ERX.Input.lastDevice !== 'mouse') { T.rect(ctx, x - 1, y - 1, CELL + 2, 1, T.gold); T.rect(ctx, x - 1, y + CELL, CELL + 2, 1, T.gold); T.rect(ctx, x - 1, y, 1, CELL, T.gold); T.rect(ctx, x + CELL, y, 1, CELL, T.gold); }
    }
    _tooltip(ctx, k, s, W, H) {
      const it = ERX.Items.get(s.id);
      if (!it) return;
      const worn = typeof k === 'string' && this.c.equip[k] === s.id;
      const lines = F.wrap(it.desc, 130).slice(0, 4);
      const tag = (it.tag || '') + (worn ? '  [WORN]' : '');
      const w = Math.max(F.measure(it.name), F.measure(tag), 130) + 10, h = 14 + (tag ? 9 : 0) + lines.length * 8 + 4;
      const at = this.slots.find((q) => q.k === k);
      let x = (at ? at.x + CELL + 4 : 0), y = at ? at.y - 2 : 0;
      if (x + w > W - 4) x = (at ? at.x : W) - w - 4;
      y = Math.max(4, Math.min(H - h - 4, y));
      // a dark purple box with a glowing edge
      ctx.fillStyle = '#100818'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#3a1a6a'; ctx.fillRect(x + 1, y + 1, w - 2, 1); ctx.fillRect(x + 1, y + h - 2, w - 2, 1); ctx.fillRect(x + 1, y + 1, 1, h - 2); ctx.fillRect(x + w - 2, y + 1, 1, h - 2);
      F.draw(ctx, it.name, x + 5, y + 4, { color: it.color || '#ffffff' });
      let ly = y + 14;
      if (tag) { F.draw(ctx, tag, x + 5, ly, { color: worn ? '#7af0a0' : '#8a7ab8' }); ly += 9; }
      lines.forEach((ln, i) => F.draw(ctx, ln, x + 5, ly + i * 8, { color: T.textDim }));
    }
  }

  // ========================================================== DEMO END
  class DemoEndScreen extends ERX.PanelScreen {
    enter(p) {
      this.game = p.game;
      this.p = p;
      this.maxW = 300;
      this.maxH = 180;
      this.stayBtn = new Button({ label: p.stay || 'KEEP EXPLORING', sound: null, onActivate: () => {
        sfx('back');
        if (this.game.state === 'reveal') this.game.leaveReveal();
        else if (this.game.state === 'elevator') this.game.leaveElevator();
        else this.game.player.x -= 24;
        ERX.Scenes.pop();
      } });
      this.menuBtn = new Button({ label: 'MAIN MENU', icon: 'back', onActivate: () => this._menu() });
      this.stayBtn.navRight = this.menuBtn;
      this.menuBtn.navLeft = this.stayBtn;
      this.group = new FocusGroup();
      this.group.set([this.stayBtn, this.menuBtn]);
      sfx('thud');
      ERX.FX.shake(2, 0.3);
    }
    _menu() {
      const s = ERX.Scenes.stack;
      ERX.Scenes.transition('dissolve', 1, () => {
        while (s.length > 1) { const x = s.pop(); x.exit(); }
        const top = ERX.Scenes.top();
        if (top) top.resume();
      });
    }
    update(dt, input, active) {
      if (active && input.hasAction('back')) { input.consumeAction('back'); this.stayBtn.activate(); return; }
      this.group.update(dt, input, active);
    }
    render(ctx) {
      const W = ERX.Display.width, H = ERX.Display.height;
      this.drawDim(ctx, W, H);
      const p = this.panel(W, H);
      T.drawPanel(ctx, p.x, p.y, p.w, p.h);
      T.drawTitlePlate(ctx, p.x + p.w / 2, p.y - 10, this.p.title || 'ROAD CLOSED');
      if (ERX.Slime) {
        const sl = ERX.Slime(this.time % 4 < 0.3 ? ERX.Color.ELEMENTS[Math.floor(this.time) % 6] : '#8a90b0', Math.floor(this.time * 2) % 2);
        ctx.drawImage(sl, Math.round(p.x + p.w / 2 - sl.width / 2), p.y + 18);
      }
      F.draw(ctx, 'Not here yet, be patient >:(', p.x + p.w / 2, p.y + 52, { scale: 1, color: '#ffffff', align: 'center', outline: T.ink });
      const lines = F.wrap(this.p.message || 'The rest of ELEMENTAL RETRIBUTION X is still being built. You reached the end of what exists. Impressive. Slightly sad.', p.w - 30);
      lines.forEach((l, i) => F.draw(ctx, l, p.x + p.w / 2, p.y + 68 + i * 10, { color: T.textDim, align: 'center' }));
      this.stayBtn.setRect(p.x + p.w / 2 - 124, p.y + p.h - 24, 118, 16);
      this.menuBtn.setRect(p.x + p.w / 2 + 6, p.y + p.h - 24, 118, 16);
      this.group.render(ctx);
    }
  }

  ERX.Scenes.register('pause', PauseScreen);
  ERX.Scenes.register('inventory', InventoryScreen);
  ERX.Scenes.register('demoEnd', DemoEndScreen);
})(window.ERX = window.ERX || {});
