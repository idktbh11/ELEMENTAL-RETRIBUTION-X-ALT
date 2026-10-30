/*
 * THE SKILL TREE — almost all of it is about your element.
 *
 *   ELEMENT TREE   M1 (always known) -> 5 skills -> the ULTIMATE (any 3 skills), plus
 *                  upgrades for every move (stronger + a whole new look),
 *                  an element BLOCK and DASH upgrade, and STATUS POTENCY.
 *   STATS          Vitality / Focus / Agility (the old branches, kept small).
 *
 * Skill points come from levelling up (+1 each level).
 * Element ranks live in character.elementSkills, stats in character.skills.
 */
(function (ERX) {
  'use strict';

  const F = ERX.Font, T = ERX.UITheme, C = ERX.Color;
  const { Button } = ERX.UI;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);

  const STATS = [
    { id: 'vitality', name: 'VITALITY', color: '#e0403a', icon: '♥', per: '+10 MAX HP' },
    { id: 'focus', name: 'FOCUS', color: '#3a8aff', icon: '★', per: '+5 MAX MP' },
    { id: 'agility', name: 'AGILITY', color: '#72e05a', icon: '→', per: '+6% SPEED, FASTER DASH' },
  ];

  // element tree layout: col 0..4, row 0..3 (row 0 at the top)
  const NODES = [
    { id: 'ult+', slot: 'ult', rank: 2, col: 3, row: 0, cost: 3, needs: ['ult'] },
    { id: 'ult', slot: 'ult', rank: 1, col: 2, row: 0, cost: 3, needs: [], needsAny: 3 },
    { id: 's1+', slot: 's1', rank: 2, col: 0, row: 1, cost: 2, needs: ['s1'] },
    { id: 's2+', slot: 's2', rank: 2, col: 1, row: 1, cost: 2, needs: ['s2'] },
    { id: 's3+', slot: 's3', rank: 2, col: 2, row: 1, cost: 2, needs: ['s3'] },
    { id: 's4+', slot: 's4', rank: 2, col: 3, row: 1, cost: 2, needs: ['s4'] },
    { id: 's5+', slot: 's5', rank: 2, col: 4, row: 1, cost: 2, needs: ['s5'] },
    { id: 's1', slot: 's1', rank: 1, col: 0, row: 2, cost: 1, needs: [] },
    { id: 's2', slot: 's2', rank: 1, col: 1, row: 2, cost: 1, needs: [] },
    { id: 's3', slot: 's3', rank: 1, col: 2, row: 2, cost: 2, needs: [] },
    { id: 's4', slot: 's4', rank: 1, col: 3, row: 2, cost: 2, needs: [] },
    { id: 's5', slot: 's5', rank: 1, col: 4, row: 2, cost: 3, needs: [] },
    { id: 'block+', slot: 'block', rank: 2, col: 0, row: 3, cost: 2, needs: [] },
    { id: 'potency', slot: 'potency', rank: 0, col: 1, row: 3, cost: 1, needs: [], max: 3 },
    { id: 'm1', slot: 'm1', rank: 1, col: 2, row: 3, cost: 0, needs: [] },
    { id: 'm1+', slot: 'm1', rank: 2, col: 3, row: 3, cost: 2, needs: [] },
    { id: 'dash+', slot: 'dash', rank: 2, col: 4, row: 3, cost: 2, needs: [] },
  ];
  const ICON = { m1: 'M1', s1: '1', s2: '2', s3: '3', s4: '4', s5: '5', ult: '★', block: '#', dash: '>>', potency: '%' };

  class SkillTreeScreen extends ERX.PanelScreen {
    enter(p) {
      this.game = p.game;
      this.c = this.game.character;
      this.c.elementSkills = this.c.elementSkills || {};
      this.maxW = 460;
      this.maxH = 270;
      this.flash = {};
      this.backBtn = new Button({ label: 'BACK', icon: 'back', sound: null, onActivate: () => this.back() });
      this.onBack = false;
      this.items = [];
      this.sel = this._el() ? 'm1+' : 'stat:vitality';   // (the tutorial wants a stat)
    }
    _el() { return this.game.element(); }
    _kit() { const el = this._el(); return el ? ERX.Abilities.kit(el.id) : null; }
    _rank(slot) {
      const s = this.c.elementSkills;
      if (slot === 'm1' || slot === 'block' || slot === 'dash') return Math.max(1, s[slot] || 0);
      return s[slot] || 0;
    }
    _owned(n) { return n.id === 'potency' ? this._rank('potency') >= 3 : this._rank(n.slot) >= n.rank; }
    _unlocked(n) {
      if (n.slot !== 'potency' && n.rank === 2 && this._rank(n.slot) < 1) return false;
      if (n.needsAny) return ['s1', 's2', 's3', 's4', 's5'].filter((id) => this._rank(id) >= 1).length >= n.needsAny;
      return n.needs.every((id) => this._rank(id) >= 1);
    }

    _buy(id) {
      const pts = this.c.skillPoints || 0;
      const deny = (msg) => { sfx('deny'); ERX.Toast.show(msg, { color: '#ff8a6a' }); };
      if (id.indexOf('stat:') === 0) {
        const br = STATS.find((b) => 'stat:' + b.id === id), lvl = this.c.skills[br.id] || 0;
        if (lvl >= 3) return deny(br.name + ' is maxed. Basically a rock now.');
        if (pts < 1) return deny('No skill points. Level up to earn more (+1 each level).');
        this.c.skillPoints = pts - 1;
        this.c.skills[br.id] = lvl + 1;
        ERX.Saves.update(this.c);
        this.game.player.applySkills();
        this.flash[id] = 1; sfx('star'); ERX.FX.shake(1, 0.15);
        ERX.Toast.show(br.name + ' ' + (lvl + 1) + ' learned! ' + br.per + '.', { color: br.color });
        return;
      }
      const kit = this._kit();
      if (!kit) return deny('ELEMENT SKILLS: locked until your element reveals itself. It is shy.');
      const n = NODES.find((x) => x.id === id);
      if (this._owned(n)) return deny(n.id === 'm1' ? 'You already know your basic attack. Obviously.' : 'Already learned. You are welcome.');
      if (!this._unlocked(n)) return deny(n.slot === 'ult' && n.rank === 1 ? 'Learn any 3 skills first.' : 'Learn the move below it first.');
      if (pts < n.cost) return deny('Needs ' + n.cost + ' skill point' + (n.cost > 1 ? 's' : '') + '. Level up to earn more.');
      this.c.skillPoints = pts - n.cost;
      this.c.elementSkills[n.slot] = n.id === 'potency' ? this._rank('potency') + 1 : n.rank;
      ERX.Saves.update(this.c);
      this.flash[id] = 1; sfx('star'); ERX.FX.shake(1, 0.15);
      ERX.Toast.show(this._name(n) + (n.rank === 2 ? ' UPGRADED!' : ' learned!'), { color: this._el().color });
    }

    _name(n) {
      const kit = this._kit();
      if (!kit) return '???';
      if (n.slot === 'block') return kit.block[0].toUpperCase() + '+';
      if (n.slot === 'dash') return kit.dashUp ? kit.dashUp.name.toUpperCase() : kit.dash[0].toUpperCase() + '+';
      if (n.slot === 'potency') return 'STATUS POTENCY';
      if (n.slot === 'm1' && n.rank === 2 && kit.m1Up) return kit.m1Up.name.toUpperCase();
      return ERX.Abilities.move(kit, n.slot).name.toUpperCase() + (n.rank === 2 ? '+' : '');
    }

    update(dt, input, active) {
      for (const k of Object.keys(this.flash)) this.flash[k] = Math.max(0, this.flash[k] - dt * 2);
      if (this.handleBack(input, active)) return;
      if (!active) return;
      if (ERX.Keybinds.wasPressed('skills')) { this.back(); return; }
      for (const a of input.actions) {
        if (this.onBack) {
          if (a === 'up') { this.onBack = false; sfx('move'); }
          else if (a === 'confirm') this.backBtn.activate();
          continue;
        }
        if (a === 'up' || a === 'down' || a === 'left' || a === 'right') this._move(a);
        if (a === 'confirm') this._buy(this.sel);
      }
      const m = input.mouse;
      for (const it of this.items) {
        const hit = m.x >= it.x && m.x < it.x + it.w && m.y >= it.y && m.y < it.y + it.h;
        if (hit && m.moved && (it.id !== this.sel || this.onBack)) { this.sel = it.id; this.onBack = false; sfx('hover'); }
        if (hit && m.pressed[0]) { this.sel = it.id; this.onBack = false; this._buy(it.id); }
      }
      const er = this.elementRect;
      if (er && !this._kit() && m.pressed[0] && m.x >= er.x && m.x < er.x + er.w && m.y >= er.y && m.y < er.y + er.h) this._buy('m1');
      const b = this.backBtn;
      if (m.moved && b.contains(m.x, m.y)) this.onBack = true;
      if (m.pressed[0] && b.contains(m.x, m.y)) b.activate();
      b.update(dt, this.onBack);
    }

    /** Arrow keys: jump to the nearest node in that direction. */
    _move(dir) {
      const cur = this.items.find((i) => i.id === this.sel);
      if (!cur) { this.sel = this.items[0] && this.items[0].id; return; }
      const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
      let best = null, bd = Infinity;
      for (const it of this.items) {
        if (it === cur) continue;
        const dx = it.x + it.w / 2 - cx, dy = it.y + it.h / 2 - cy;
        const ok = dir === 'left' ? dx < -2 : dir === 'right' ? dx > 2 : dir === 'up' ? dy < -2 : dy > 2;
        if (!ok) continue;
        const along = dir === 'left' || dir === 'right' ? Math.abs(dx) : Math.abs(dy), across = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
        const d = along + across * 2.5;
        if (d < bd) { bd = d; best = it; }
      }
      if (best) { this.sel = best.id; sfx('move'); }
      else if (dir === 'down') { this.onBack = true; sfx('move'); }
    }

    render(ctx) {
      const W = ERX.Display.width, H = ERX.Display.height;
      this.drawDim(ctx, W, H);
      const p = this.panel(W, H);
      T.drawPanel(ctx, p.x, p.y, p.w, p.h);
      T.drawTitlePlate(ctx, p.x + p.w / 2, p.y - 10, 'SKILL TREE');
      const pts = this.c.skillPoints || 0;
      F.draw(ctx, 'SKILL POINTS: ' + (pts > 0 ? '{gold}' : '{gray}') + pts + '{/}', p.x + 12, p.y + 12, { color: T.text });
      if (ERX.Admin.on() && ERX.Admin.data.skills !== 'normal') F.draw(ctx, '{red}ADMIN: ALL SKILLS ' + (ERX.Admin.data.skills === 'max' ? 'UPGRADED' : 'LEARNED') + '{/}', p.x + p.w - 12, p.y + 12, { color: T.text, align: 'right' });
      this.items = [];

      // ---- stats column ----
      const sx = p.x + 12, sy = p.y + 30;
      F.draw(ctx, 'STATS', sx + 24, sy, { color: T.gold, align: 'center' });
      STATS.forEach((br, i) => {
        const lvl = this.c.skills[br.id] || 0, id = 'stat:' + br.id;
        const x = sx, y = sy + 12 + i * 34, w = 48, h = 26;
        this.items.push({ id, x, y, w, h });
        const sel = !this.onBack && this.sel === id;
        T.rect(ctx, x - 1, y - 1, w + 2, h + 2, sel ? T.gold : T.ink);
        T.rect(ctx, x, y, w, h, lvl > 0 ? C.shade(br.color, -0.45) : '#161b3a');
        F.draw(ctx, br.icon + ' ' + br.name.slice(0, 5), x + w / 2, y + 4, { color: br.color, align: 'center' });
        for (let k = 0; k < 3; k++) T.rect(ctx, x + 9 + k * 11, y + 16, 8, 4, k < lvl ? br.color : '#2e3354');
        const fl = this.flash[id] || 0;
        if (fl > 0) { ctx.fillStyle = 'rgba(255,255,255,' + fl.toFixed(2) + ')'; ctx.fillRect(x, y, w, h); }
      });

      // ---- element tree ----
      const kit = this._kit(), el = this._el();
      const ax = p.x + 76, aw = p.w - 88, ay = p.y + 28, ah = p.h - 100;
      this.elementRect = { x: ax, y: ay, w: aw, h: ah };
      T.rect(ctx, ax, ay, aw, ah, '#0e1230');
      if (!kit) {
        ERX.Sprites.drawIcon(ctx, 'lock', ax + aw / 2 - 4, ay + ah / 2 - 16, '#c89aff', '#ffd34d');
        F.draw(ctx, 'ELEMENT: ???', ax + aw / 2, ay + ah / 2, { color: '#e0c8ff', align: 'center' });
        F.draw(ctx, 'Your element skills unlock when your element reveals itself.', ax + aw / 2, ay + ah / 2 + 12, { color: T.textMute, align: 'center' });
      } else {
        F.draw(ctx, '{el' + el.id + '}' + el.name.toUpperCase() + '{/} SKILLS', ax + 6, ay + 4, { color: T.text });
        const cw = aw / 5, rh = (ah - 14) / 4;
        const pos = (n) => ({ x: Math.round(ax + cw * n.col + cw / 2 - 13), y: Math.round(ay + 14 + rh * n.row + rh / 2 - 11) });
        // connections
        const link = (a, b, on) => { const pa = pos(a), pb = pos(b); const col = on ? el.color : '#2e3354'; T.rect(ctx, Math.min(pa.x, pb.x) + 13, pb.y + 11, Math.abs(pa.x - pb.x) + 1, 1, col); T.rect(ctx, pa.x + 13, Math.min(pa.y, pb.y) + 11, 1, Math.abs(pa.y - pb.y) + 1, col); };
        const N = (id) => NODES.find((n) => n.id === id);
        for (const id of ['block+', 'dash+', 'potency', 'm1+']) link(N('m1'), N(id), this._owned(N(id)));
        for (const s of ['s1', 's2', 's3', 's4', 's5']) { link(N('m1'), N(s), this._owned(N(s))); link(N(s), N(s + '+'), this._owned(N(s + '+'))); link(N(s + '+'), N('ult'), this._owned(N('ult'))); }
        link(N('ult'), N('ult+'), this._owned(N('ult+')));
        for (const n of NODES) {
          const { x, y } = pos(n), w = 26, h = 22;
          this.items.push({ id: n.id, x, y, w, h });
          const owned = this._owned(n), avail = !owned && this._unlocked(n), sel = !this.onBack && this.sel === n.id;
          const up = n.rank === 2;
          const col = up ? C.mix(el.color, '#ffffff', 0.35) : el.color;   // upgrades keep your colour
          T.rect(ctx, x - 1, y - 1, w + 2, h + 2, sel ? T.gold : n.slot === 'ult' ? '#ffd34d' : T.ink);
          T.rect(ctx, x, y, w, h, owned ? C.shade(col, -0.35) : avail ? '#2a3470' : '#161b3a');
          if (owned) T.rect(ctx, x, y, w, 2, col);
          F.draw(ctx, ICON[n.slot] + (up ? '+' : ''), x + w / 2, y + 7, { color: owned ? '#ffffff' : avail ? col : '#3e4470', align: 'center' });
          if (n.id === 'potency') for (let k = 0; k < 3; k++) T.rect(ctx, x + 5 + k * 6, y + h - 4, 4, 2, k < this._rank('potency') ? col : '#2e3354');
          if (avail && pts >= n.cost && Math.floor(this.time * 3) % 2 === 0) T.rect(ctx, x + w - 4, y + 1, 3, 3, T.gold);
          const fl = this.flash[n.id] || 0;
          if (fl > 0) { ctx.fillStyle = 'rgba(255,255,255,' + fl.toFixed(2) + ')'; ctx.fillRect(x, y, w, h); }
          // the move's name under its node
          if (n.rank !== 2 || n.slot === 'block' || n.slot === 'dash' || n.slot === 'm1') {
            const nm = n.slot === 'potency' ? 'STATUS' : n.slot === 'block' ? kit.block[0] : n.slot === 'dash' ? (kit.dashUp ? kit.dashUp.name : kit.dash[0]) : ERX.Abilities.move(kit, n.slot, n.rank === 2).name;
            F.draw(ctx, nm.length > 13 ? nm.slice(0, 12) + '.' : nm, x + w / 2, y + h + 3, { color: owned ? '#d4daf5' : '#5a6290', align: 'center' });
          }
        }
      }

      // ---- details of the selected node ----
      const dy = p.y + p.h - 66;
      T.rect(ctx, p.x + 10, dy, p.w - 20, 40, '#11163a');
      const lines = this._details();
      lines.forEach((l, i) => F.draw(ctx, l, p.x + 16, dy + 4 + i * 9, { color: i === 0 ? '#ffffff' : T.textDim }));
      this.backBtn.setRect(p.x + p.w / 2 - 40, p.y + p.h - 22, 80, 16);
      this.backBtn.render(ctx, this.onBack);
    }

    _details() {
      if (this.onBack) return ['Back to the game.'];
      if (this.sel.indexOf('stat:') === 0) {
        const br = STATS.find((b) => 'stat:' + b.id === this.sel), lvl = this.c.skills[br.id] || 0;
        return [br.name + '  ' + lvl + '/3', br.per + ' per level.', lvl >= 3 ? 'Maxed.' : 'Cost: 1 point.'];
      }
      const kit = this._kit(), el = this._el();
      if (!kit) return ['ELEMENT SKILLS', 'Locked until your element reveals itself.'];
      const n = NODES.find((x) => x.id === this.sel);
      const state = this._owned(n) ? '{green}LEARNED{/}' : this._unlocked(n) ? 'Cost: {gold}' + n.cost + ' point' + (n.cost > 1 ? 's' : '') + '{/}' : '{red}LOCKED{/} ' + (n.slot === 'ult' && n.rank === 1 ? '(learn any 3 skills)' : '(learn the move below)');
      const status = ERX.Abilities.STATUS[kit.status];
      if (n.slot === 'potency') return ['STATUS POTENCY  ' + this._rank('potency') + '/3   ' + state, 'Your attacks inflict ' + (status ? '{el' + el.id + '}' + status.name + '{/}' : 'random statuses') + '. Each rank: lasts longer, hurts more.'];
      if (n.slot === 'block') return [kit.block[0].toUpperCase() + ' (UPGRADE)   ' + state, 'Your block becomes ' + kit.block[0] + '. Upgraded: guard lasts longer', 'and attackers who hit it get ' + (status ? status.name : 'a random status') + '.'];
      if (n.slot === 'dash') { const du = kit.dashUp; if (du) return [du.name.toUpperCase() + ' (UPGRADED DASH)   ' + state, ...F.wrap(du.desc, 380).slice(0, 2)]; return [kit.dash[0].toUpperCase() + ' (UPGRADE)   ' + state, 'Your dash becomes ' + kit.dash[0] + '. Upgraded: faster, and it', 'damages + inflicts ' + (status ? status.name : 'a random status') + ' on anything you dash through.']; }
      const newM1 = n.slot === 'm1' && n.rank === 2 && kit.m1Up;
      const mv = ERX.Abilities.move(kit, n.slot, newM1), st = ERX.Abilities.stats(kit, n.slot, newM1);
      const head = mv.name.toUpperCase() + (newM1 ? ' (UPGRADED M1)' : n.rank === 2 ? ' (UPGRADE)' : '') + '   ' + state;
      if (newM1) return [head, ...F.wrap('Your M1 becomes a whole new move: ' + mv.desc, 380).slice(0, 2)];
      const desc = ERX.Abilities.describe(kit, n.slot, el.name);
      const nums = n.slot === 'ult' ? 'Key: ' + ERX.keyText('{ultimate}') : (n.slot === 'm1' ? 'Key: ' + ERX.keyText('{attack}') : 'Key: ' + ERX.keyText('{ability' + n.slot.slice(1) + '}') + '   Mana: ' + st.mp) + '   Cooldown: ' + st.cd + 's';
      if (n.rank === 2) return [head, 'Upgraded: much stronger, bigger, faster and more detailed. Same colours.', nums];
      return [head, desc + (status ? ' Inflicts ' + status.name + '.' : ''), nums];
    }
  }

  SkillTreeScreen.STATS = STATS;
  SkillTreeScreen.NODES = NODES;
  ERX.Scenes.register('skills', SkillTreeScreen);
  ERX.SkillTree = SkillTreeScreen;
})(window.ERX = window.ERX || {});
