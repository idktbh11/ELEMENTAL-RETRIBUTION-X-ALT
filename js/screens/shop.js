/*
 * SHOPS (Normalton): Fenwick's food, Greta's armour, Holt's upgrades. A panel over the world:
 * what's for sale on the left, the details of whatever's picked on the right, your gold, BUY and BACK.
 *
 *   ERX.Scenes.push('shop', { game, kind: 'food' | 'armor' | 'upgrade', title, keeper: { name, color } })
 *
 *   up / down (or the mouse): pick      left / right: how many (food)      confirm / BUY: buy it
 *   back / BACK: done. Everything you buy is saved straight away.
 *
 * Armour you buy is worn at once if that slot's empty (or it beats what's in it); otherwise it goes in the bag.
 * Holt upgrades a piece a level at a time (+1 DEF a level, up to +3): js/data/armor.js has the prices.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, F = ERX.Font, T = ERX.UITheme;
  const { Button } = ERX.UI;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const ROW = 17;
  const SLOT_NAME = { head: 'HEAD', chest: 'CHEST', legs: 'LEGS', feet: 'FEET' };
  const TIER_NAME = { leather: 'LEATHER', chain: 'CHAINMAIL', iron: 'IRON' };

  /** What the keepers say: when you walk up, when you buy, when you can't. */
  const LINES = {
    food: {
      hello: ['Welcome to Fenwick\'s Goods! We are OPEN! For the first time in eleven years!', 'Food! Real food! Not coloured water! (The coloured water is on the top shelf.)', 'Hungry? Of course you are. You fell out of the sky. That is very hungry work.'],
      buy: ['Pleasure doing business!', 'An excellent choice. They are all excellent choices. I only stock excellent choices.', 'Eat it when you are hurt. Or when you are bored. I do not judge.', 'Ka-ching! I have always wanted to say that. KA-CHING!'],
      poor: ['You are a little short there, friend. Monsters drop gold. Go and be rude to one.', 'That is more gold than you have. I checked. I am very good at counting.'],
      full: ['Your bag is full! Eat something. I recommend food.'],
    },
    armor: {
      hello: ["Greta's Armory! Holt makes it, I sell it, you wear it. Nobody gets hurt. Ideally.", 'Leather, chain or iron? Leather is comfy. Iron is safe. Chain is... loud.', 'Mind the dummies. They bite. (They do not bite.)'],
      buy: ['Sold! Wear it in good health.', 'Looks better on you than on the dummy. Do not tell the dummy.', 'Lovely. Holt will be thrilled. He will not show it. But he will be.'],
      owned: ['You have already got one of those, love. I could sell you another. But I like you.'],
      poor: ['Not enough gold, love. Come back richer. Or come back with a very good story.', 'That one costs more than you have got. Have a look at the leather.'],
      full: ["Your bag's full. I sell armor, not cupboards."],
    },
    upgrade: {
      hello: ['*CLANG* ...Upgrades? Hand it over.', 'Bring me armor. I hit it. It gets better. That is the whole job.'],
      buy: ['*CLANG* *CLANG* *CLANG* ...There. Better than new.', 'Good as new. Better. Gooder.', '*CLANG* Done. Do not tell Greta I enjoyed that.'],
      max: ['Cannot make it any better than that. I tried. The anvil cried.'],
      poor: ['Upgrades cost gold. Iron does not grow on trees. (I checked.)'],
      box: ["...It's a box. You want me to upgrade a BOX. ...Fine. FINE."],
      none: ["You have got no armor on you. I can't upgrade your shirt. ...Well. I could. You would not like it."],
    },
  };

  class ShopScreen extends ERX.PanelScreen {
    enter(p) {
      this.game = p.game;
      this.kind = p.kind;
      this.titleText = p.title || 'SHOP';
      this.keeper = p.keeper || { name: 'SHOPKEEPER', color: '#ffd36a' };
      this.lines = LINES[this.kind] || LINES.food;
      this.c = ERX.Inventory.ensure(this.game.character);
      this.maxW = 404;
      this.maxH = 236;
      this.sel = 0;
      this.top = 0;
      this.qty = 1;
      this.t = 0;
      this.rects = [];
      this.hoverRow = -1;
      this.shake = 0;
      this.buyBtn = new Button({ label: 'BUY', sound: null, onActivate: () => this._buy() });
      this.backBtn = new Button({ label: 'BACK', icon: 'back', sound: null, onActivate: () => this.back() });
      this.focus = 'list';
      this._build();
      this._say(this.rows.length ? pick(this.lines.hello) : pick(this.lines.none || this.lines.hello));
    }
    back() {
      ERX.Saves.update(this.c);
      sfx('back');
      super.back();
    }
    _say(text, color) { this.msg = { text, color: color || T.text, t: 0 }; }

    /** The rows for sale: { id, it, price, ... }. Upgrades: every armour piece you've got. */
    _build() {
      const Inv = ERX.Inventory, I = ERX.Items, A = ERX.Armor, c = this.c;
      if (this.kind === 'food') this.rows = I.food.map((id) => ({ id, it: I.get(id), price: I.get(id).price }));
      else if (this.kind === 'armor') this.rows = A.shop('normalton').map((a) => ({ id: 'armor:' + a.id, it: I.get('armor:' + a.id), a, price: a.price }));
      else {
        this.rows = Inv.armorPieces(c).map((o) => {
          const it = I.get(o.id), P = A.parse(o.id.slice(6)), next = P.up < A.MAX_UP ? P.up + 1 : null;
          return { id: o.id, it, a: P.a, up: P.up, worn: o.worn, next, to: next ? 'armor:' + A.idAt(P.a, next) : null, price: next ? A.upCost(P.a, next) : null };
        });
      }
      this.sel = U.clamp(this.sel, 0, Math.max(0, this.rows.length - 1));
    }
    get row() { return this.rows[this.sel] || null; }

    /** How you stand with a row: 'worn' / 'owned' / 'max' / '' (it's for sale). */
    _status(r) {
      const Inv = ERX.Inventory, c = this.c;
      if (this.kind === 'armor') {
        const piece = Inv.armorPieces(c).find((o) => Inv.armorId(o.id) === r.a.id);
        return piece ? (piece.worn ? 'worn' : 'owned') : '';
      }
      if (this.kind === 'upgrade') return r.next ? '' : 'max';
      return '';
    }
    /** The most of this food you can buy right now (gold, and room in the bag). */
    _maxQty(r) {
      const gold = this.c.gold || 0;
      let n = Math.min(16, Math.floor(gold / r.price));
      while (n > 0 && !ERX.Inventory.fits(this.c, r.id, n)) n--;
      return Math.max(1, n);
    }

    _buy() {
      const r = this.row, c = this.c, Inv = ERX.Inventory, g = this.game;
      if (!r) { sfx('deny'); return; }
      const st = this._status(r);
      if (st === 'worn' || st === 'owned') { sfx('deny'); this.shake = 0.3; this._say(pick(this.lines.owned)); return; }
      if (st === 'max') { sfx('deny'); this.shake = 0.3; this._say(pick(this.lines.max)); return; }
      const n = this.kind === 'food' ? this.qty : 1, cost = r.price * n;
      if ((c.gold || 0) < cost) { sfx('deny'); this.shake = 0.3; this._say(pick(this.lines.poor), T.danger); return; }
      if (this.kind === 'food') {
        if (!Inv.fits(c, r.id, n)) { sfx('deny'); this.shake = 0.3; this._say(pick(this.lines.full), T.danger); return; }
        c.gold -= cost;
        Inv.add(c, r.id, n);
        sfx('buy');
        this._say(pick(this.lines.buy), T.good);
        this.qty = 1;
      } else if (this.kind === 'armor') {
        // into the bag... and straight on, if that slot's empty or it beats what's in it (the old piece takes its place in the bag)
        const wornId = c.equip[r.it.slot], worn = wornId && ERX.Items.get(wornId);
        const wear = !worn || worn.def < r.it.def;
        if (!Inv.fits(c, r.id)) { sfx('deny'); this.shake = 0.3; this._say(pick(this.lines.full), T.danger); return; }
        c.gold -= cost;
        Inv.add(c, r.id);
        if (wear) Inv.equip(c, r.id);
        this._say(pick(this.lines.buy) + (wear ? ' (You are wearing it.)' : ' (It is in your bag. What you have on is better.)'), T.good);
        sfx('buy');
      } else {
        c.gold -= cost;
        Inv.replace(c, r.id, r.to);
        sfx('upgrade');
        ERX.FX.shake(1, 0.15);
        this._say(r.a.id === 'cardboard' ? pick(this.lines.box) : pick(this.lines.buy), T.good);
        this._build();
      }
      this.bought = 0.5;
      ERX.Saves.update(c);
      if (g && g.player) g.floatText(g.player.cx, g.player.y - 8, '-' + cost + 'G', '#ffd34d');
    }

    update(dt, input, active) {
      this.t += dt;
      this.shake = Math.max(0, this.shake - dt);
      this.bought = Math.max(0, (this.bought || 0) - dt);
      if (this.msg) this.msg.t += dt;
      if (this.handleBack(input, active)) return;
      if (!active) return;
      const n = this.rows.length;
      for (const a of input.actions) {
        if (a === 'up' && n) { if (this.focus !== 'list') this.focus = 'list'; else this.sel = (this.sel - 1 + n) % n; this.qty = 1; sfx('move'); }
        else if (a === 'down' && n) { if (this.focus === 'list') { this.sel = (this.sel + 1) % n; this.qty = 1; } sfx('move'); }
        else if (a === 'left' || a === 'right') {
          const r = this.row;
          if (this.focus === 'list' && this.kind === 'food' && r) {
            const max = this._maxQty(r), q = this.qty + (a === 'right' ? 1 : -1);
            if (q >= 1 && q <= max) { this.qty = q; sfx('tick', { value: 40 + q * 4 }); } else sfx('deny');
          } else { this.focus = this.focus === 'back' ? 'buy' : 'back'; sfx('move'); }
        } else if (a === 'confirm') {
          if (this.focus === 'back') this.backBtn.activate();
          else this.buyBtn.activate();
        }
      }
      // the mouse: point at a row to pick it, the buttons to press them
      const m = input.mouse;
      this.hoverRow = -1;
      for (const r of this.rects) if (m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h) this.hoverRow = r.i;
      if (m.pressed[0] && this.hoverRow !== -1) { if (this.sel !== this.hoverRow) { this.sel = this.hoverRow; this.qty = 1; sfx('hover'); } this.focus = 'list'; }
      if (m.wheel && n > this._visible) this.top = U.clamp(this.top + Math.sign(m.wheel), 0, n - this._visible);
      for (const [b, f] of [[this.buyBtn, 'buy'], [this.backBtn, 'back']]) {
        if (m.moved && b.contains(m.x, m.y)) this.focus = f;
        if (m.pressed[0] && b.contains(m.x, m.y)) b.activate();
      }
      this.buyBtn.update(dt, this.focus === 'buy');
      this.backBtn.update(dt, this.focus === 'back');
    }

    render(ctx) {
      const W = ERX.Display.width, H = ERX.Display.height, c = this.c;
      this.drawDim(ctx, W, H);
      const p = this.panel(W, H);
      T.drawPanel(ctx, p.x, p.y, p.w, p.h, { accent: this.keeper.color });
      T.drawTitlePlate(ctx, p.x + p.w / 2, p.y - 10, this.titleText);
      // ---- the list
      const lx = p.x + 10, ly = p.y + 16, lw = Math.min(196, Math.round(p.w * 0.5)), foot = 44;
      const vis = Math.max(3, Math.floor((p.h - 16 - foot) / ROW));
      this._visible = vis;
      if (this.sel < this.top) this.top = this.sel;
      if (this.sel >= this.top + vis) this.top = this.sel - vis + 1;
      this.top = U.clamp(this.top, 0, Math.max(0, this.rows.length - vis));
      T.rect(ctx, lx - 1, ly - 1, lw + 2, vis * ROW + 2, T.ink);
      T.rect(ctx, lx, ly, lw, vis * ROW, T.panelDark);
      this.rects = [];
      if (!this.rows.length) F.wrap(this.kind === 'upgrade' ? 'Nothing to upgrade. (Greta sells armor, next door.)' : 'Sold out.', lw - 12).forEach((l, i) => F.draw(ctx, l, lx + 6, ly + 6 + i * 9, { color: T.textMute }));
      let lastTier = null;
      for (let k = 0; k < vis; k++) {
        const i = this.top + k, r = this.rows[i];
        if (!r) break;
        const y = ly + k * ROW, sel = i === this.sel, st = this._status(r), hov = i === this.hoverRow;
        this.rects.push({ x: lx, y, w: lw, h: ROW, i });
        if (sel) { T.rect(ctx, lx, y, lw, ROW, 'rgba(255,211,77,0.16)'); T.rect(ctx, lx, y, 2, ROW, T.gold); }
        else if (hov) T.rect(ctx, lx, y, lw, ROW, 'rgba(120,140,255,0.10)');
        if (this.kind === 'armor' && r.a.tier !== lastTier && k > 0) T.rect(ctx, lx + 4, y, lw - 8, 1, T.borderDark);
        lastTier = r.a && r.a.tier;
        r.it.draw(ctx, lx + 12, y + ROW / 2, this.t, 1);
        const dim = st === 'worn' || st === 'owned' || st === 'max';
        F.draw(ctx, r.it.name, lx + 24, y + 5, { color: dim ? T.textMute : sel ? T.gold : r.it.color || T.text });
        const right = st === 'worn' ? '{green}WORN{/}' : st === 'owned' ? 'OWNED' : st === 'max' ? 'MAX' : r.price + 'G';
        F.draw(ctx, right, lx + lw - 5, y + 5, { color: st ? T.textMute : (c.gold || 0) >= r.price ? '#ffd34d' : '#a87a4a', align: 'right' });
      }
      // a scroll bar, if there's more
      if (this.rows.length > vis) {
        const th = Math.max(8, Math.round((vis / this.rows.length) * vis * ROW)), ty = ly + Math.round((this.top / (this.rows.length - vis)) * (vis * ROW - th));
        T.rect(ctx, lx + lw + 2, ly, 2, vis * ROW, T.borderDark); T.rect(ctx, lx + lw + 2, ty, 2, th, T.borderLight);
      }
      // ---- the details
      const dx = lx + lw + 10, dw = p.x + p.w - 10 - dx, r = this.row;
      if (r) {
        const sh = this.shake > 0 ? Math.round(Math.sin(this.shake * 60) * 2) : 0;
        T.rect(ctx, dx + sh, ly, 44, 44, T.ink); T.rect(ctx, dx + 1 + sh, ly + 1, 42, 42, '#1b2250');
        r.it.draw(ctx, dx + 22 + sh, ly + 22, this.t, 2);
        const nx = dx + 50;
        let yy = ly + 2;
        F.wrap(r.it.name, dw - 52).slice(0, 2).forEach((l) => { F.draw(ctx, l, nx, yy, { color: r.it.color || T.text }); yy += 9; });
        F.draw(ctx, r.it.tag || '', nx, yy + 1, { color: '#8a7ab8' }); yy += 11;
        if (this.kind === 'armor' || this.kind === 'upgrade') F.draw(ctx, SLOT_NAME[r.it.slot] + (r.a.tier ? '  ' + TIER_NAME[r.a.tier] : ''), nx, yy, { color: T.textDim });
        else F.draw(ctx, 'IN YOUR BAG: ' + ERX.Inventory.count(c, r.id), nx, yy, { color: T.textDim });
        yy = ly + 50;
        const desc = F.wrap(r.it.desc || '', dw - 2);
        desc.slice(0, 4).forEach((l, i) => F.draw(ctx, l, dx, yy + i * 9, { color: T.textDim }));
        yy += Math.min(4, desc.length) * 9 + 5;
        // what it'd do for you
        if (this.kind === 'armor') {
          const wornId = c.equip[r.it.slot], worn = wornId && ERX.Items.get(wornId);
          if (this._status(r)) F.draw(ctx, this._status(r) === 'worn' ? 'YOU ARE WEARING THIS.' : 'IT IS IN YOUR BAG.', dx, yy, { color: T.good });
          else if (!worn) F.draw(ctx, 'NOTHING ON YOUR ' + SLOT_NAME[r.it.slot] + ' YET:  {green}+' + r.it.def + ' DEF{/}', dx, yy, { color: T.text });
          else { const d = r.it.def - worn.def; F.wrap('WEARING: ' + worn.name + '  (' + (d > 0 ? '{green}+' + d : d < 0 ? '{red}' + d : '{gold}+0') + ' DEF{/})', dw).slice(0, 2).forEach((l, i) => F.draw(ctx, l, dx, yy + i * 9, { color: T.text })); }
        } else if (this.kind === 'upgrade') {
          if (r.next) {
            F.draw(ctx, (r.up ? '+' + r.up : 'PLAIN') + '  ->  +' + r.next + '      DEF ' + r.it.def + '  ->  {green}' + (r.it.def + 1) + '{/}', dx, yy, { color: T.text });
            F.draw(ctx, r.worn ? 'WORN (' + SLOT_NAME[r.worn] + ')' : 'IN YOUR BAG', dx, yy + 10, { color: T.textMute });
          } else F.draw(ctx, 'FULLY UPGRADED. (+' + ERX.Armor.MAX_UP + ')', dx, yy, { color: T.gold });
        } else {
          F.draw(ctx, 'YOUR HP: ' + Math.ceil(this.game.player.hp) + ' / ' + this.game.player.maxHp, dx, yy, { color: T.text });
          F.wrap('Food in your bag heals you by itself when your HP gets low. (Or eat it from the bag: ' + ERX.keyText('{use}') + '.)', dw).slice(0, 3).forEach((l, i) => F.draw(ctx, l, dx, yy + 11 + i * 9, { color: T.textMute }));
        }
      }
      // ---- along the bottom: what the keeper says, your gold, BUY and BACK
      const by = p.y + p.h - 22;
      const ms = this.msg;
      if (ms) {
        const lines = F.wrap('{gold}' + this.keeper.name + ':{/} ' + ms.text, p.w - 20).slice(0, 2);
        const shown = Math.floor(ms.t * 70);
        let left = shown;
        lines.forEach((l, i) => { F.draw(ctx, this._cut(l, left), p.x + 10, by - 20 + i * 9, { color: ms.color }); left -= F.strip(l).length + 1; });
      }
      T.rect(ctx, p.x + 11, by + 4, 5, 5, T.ink); T.rect(ctx, p.x + 12, by + 5, 3, 3, '#ffd34d'); T.rect(ctx, p.x + 12, by + 5, 1, 1, '#fff6c0');
      F.draw(ctx, (c.gold || 0) + 'G', p.x + 19, by + 3, { color: this.bought > 0 && Math.floor(this.bought * 16) % 2 ? '#ffffff' : '#ffd34d', outline: T.ink });
      const label = !r ? 'BUY' : this.kind === 'upgrade' ? (r.next ? 'UPGRADE  ' + r.price + 'G' : 'MAXED') : this._status(r) ? 'OWNED' : this.kind === 'food' ? 'BUY  x' + this.qty + '  ' + r.price * this.qty + 'G' : 'BUY  ' + r.price + 'G';
      this.buyBtn.label = label;
      this.buyBtn.disabled = !r || !!this._status(r) || (c.gold || 0) < r.price * (this.kind === 'food' ? this.qty : 1);
      const bw = Math.min(128, Math.max(76, F.measure(label) + 26));
      this.backBtn.setRect(p.x + p.w - 10 - 60, by, 60, 16);
      this.buyBtn.setRect(p.x + p.w - 10 - 60 - 6 - bw, by, bw, 16);
      this.buyBtn.render(ctx, this.focus === 'buy' || (this.focus === 'list' && ERX.Input.lastDevice === 'keyboard'));
      this.backBtn.render(ctx, this.focus === 'back');
      if (this.kind === 'food' && r && this.focus === 'list') F.draw(ctx, '< >  HOW MANY', this.buyBtn.x - 6, by + 4, { color: T.textMute, align: 'right' });
    }
    /** The first n visible characters of a line (keeping its colours). */
    _cut(line, n) {
      if (n <= 0) return '';
      let out = '', vis = 0, last = 0, m;
      const re = /\{(\/|[a-z]+)\}/g;
      while ((m = re.exec(line))) {
        const seg = line.slice(last, m.index), take = Math.min(seg.length, n - vis);
        out += seg.slice(0, take); vis += take;
        if (vis >= n) return out;
        out += m[0]; last = re.lastIndex;
      }
      return out + line.slice(last, last + (n - vis));
    }
  }

  ERX.Scenes.register('shop', ShopScreen);
  ERX.ShopScreen = ShopScreen;
})(window.ERX = window.ERX || {});
