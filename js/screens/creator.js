/*
 * CHARACTER CREATOR — two steps:
 *   1. LOOK: gender, skin, hair, hair colour, eyes, outfit, outfit colour,
 *      pants, plus a permanently LOCKED element row (elements are never chosen).
 *   2. NAME: type a name. Element names get... a reaction.
 * Creating saves the character and returns to the character list.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, F = ERX.Font, T = ERX.UITheme, PS = ERX.PlayerSprite;
  const { Widget, Button, FocusGroup } = ERX.UI;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const D = () => ERX.Data.character;

  /** Left/right cycler for one appearance option. */
  class OptionRow extends Widget {
    constructor(o) {
      super(Object.assign({ label: '', options: () => [], get: () => 0, set: () => {}, onChange: null, clickActivates: false }, o));
    }
    _change(dir) {
      const n = this.options().length;
      this.set((this.get() + dir + n) % n);
      sfx('tick', { value: 30 + (this.get() / Math.max(1, n - 1)) * 60, minGap: 0.03 });
      if (this.onChange) this.onChange(this);
    }
    onNav(dir) { this._change(dir); return true; }
    activate() { this._change(1); }
    onPointerDown(mx) {
      const mid = this.x + this.labelW + (this.w - this.labelW) / 2;
      this._change(mx < mid && mx > this.x + this.labelW ? -1 : 1);
    }
    get labelW() { return Math.min(72, Math.floor(this.w * 0.4)); }
    render(ctx, focused) {
      const accent = T.elementCycle(this.time, 0.6);
      if (this.hover > 0.05) {
        ctx.fillStyle = 'rgba(80,100,200,' + (0.18 * this.hover).toFixed(3) + ')';
        ctx.fillRect(this.x, this.y, this.w, this.h);
        if (focused) T.rect(ctx, this.x, this.y, 2, this.h, accent);
      }
      const ty = this.y + Math.floor((this.h - 7) / 2);
      F.draw(ctx, this.label, this.x + 6, ty, { color: focused ? T.gold : T.text, shadow: T.ink });
      const opt = this.options()[this.get()];
      const vx0 = this.x + this.labelW, vx1 = this.x + this.w - 4;
      const bob = focused ? Math.round(Math.sin(this.time * 8)) : 0;
      F.draw(ctx, '<', vx0 - bob, ty, { color: focused ? accent : T.textMute });
      F.draw(ctx, '>', vx1 - 3 + bob, ty, { color: focused ? accent : T.textMute });
      const name = typeof opt === 'string' ? opt : opt.name;
      const cx = Math.round((vx0 + vx1) / 2);
      if (opt && opt.c) {
        const tw = F.measure(name);
        const sx = Math.round(cx - (tw + 12) / 2);
        T.rect(ctx, sx, ty - 1, 9, 9, T.ink);
        T.rect(ctx, sx + 1, ty, 7, 7, opt.c);
        T.rect(ctx, sx + 1, ty, 7, 1, ERX.Color.shade(opt.c, 0.3));
        F.draw(ctx, name.toUpperCase(), sx + 12, ty, { color: focused ? '#ffffff' : T.textDim });
      } else {
        F.draw(ctx, name.toUpperCase(), cx, ty, { color: focused ? '#ffffff' : T.textDim, align: 'center' });
      }
    }
  }

  /** The ELEMENT row. It is locked. It will always be locked. */
  class LockedRow extends OptionRow {
    _change() { if (this.onPoke) this.onPoke(this); }
    render(ctx, focused) {
      if (this.hover > 0.05) {
        ctx.fillStyle = 'rgba(200,60,60,' + (0.15 * this.hover).toFixed(3) + ')';
        ctx.fillRect(this.x, this.y, this.w, this.h);
        if (focused) T.rect(ctx, this.x, this.y, 2, this.h, T.danger);
      }
      const ty = this.y + Math.floor((this.h - 7) / 2);
      const jit = this.poked > 0 ? Math.round((Math.random() - 0.5) * 3) : 0;
      F.draw(ctx, this.label, this.x + 6, ty, { color: focused ? T.danger : T.textMute, shadow: T.ink });
      const cx = Math.round(this.x + this.labelW + (this.w - this.labelW) / 2) + jit;
      const txt = '??? LOCKED';
      const tw = F.measure(txt);
      ERX.Sprites.drawIcon(ctx, 'lock', cx - tw / 2 - 10, ty, focused ? T.danger : T.textMute, '#ffd34d');
      F.draw(ctx, txt, cx - tw / 2, ty, { color: focused ? T.danger : T.textMute });
    }
    update(dt, focused) { super.update(dt, focused); this.poked = Math.max(0, (this.poked || 0) - dt); }
  }

  /** Name text box. Typing goes here whenever the NAME step is open. */
  class TextBox extends Widget {
    constructor(o) { super(Object.assign({ value: '', placeholder: 'Type a name...', onSubmit: null, clickActivates: false }, o)); }  // a click/tap just focuses it (ENTER submits)
    activate() { if (this.onSubmit) this.onSubmit(); }
    render(ctx, focused) {
      const x = this.x, y = this.y, w = this.w, h = this.h;
      const shake = this.shake > 0 ? Math.round(Math.sin(this.time * 70) * 3 * this.shake) : 0;
      const edge = this.error > 0 ? T.danger : focused ? T.elementCycle(this.time, 0.6) : T.border;
      T.rect(ctx, x + 1 + shake, y, w - 2, h, T.ink);
      T.rect(ctx, x + shake, y + 1, w, h - 2, T.ink);
      T.rect(ctx, x + 1 + shake, y + 1, w - 2, h - 2, edge);
      T.rect(ctx, x + 2 + shake, y + 2, w - 4, h - 4, '#0b0e24');
      const scale = this.value && F.measure(this.value, 2) <= w - 14 ? 2 : 1;
      const ty = y + Math.floor((h - 7 * scale) / 2);
      if (this.value) {
        F.draw(ctx, this.value, x + 6 + shake, ty, { scale, color: '#ffffff', shadow: '#2a3070', shadowOffset: scale });
      } else {
        F.draw(ctx, this.placeholder, x + 6 + shake, y + Math.floor((h - 7) / 2), { color: T.textMute });
      }
      if (Math.floor(this.time * 2.5) % 2 === 0) {
        const cx = x + 7 + shake + (this.value ? F.measure(this.value, scale) + scale : -1);
        T.rect(ctx, cx, this.value ? ty : y + Math.floor((h - 7) / 2), scale, 7 * scale, T.gold);
      }
    }
    update(dt, focused) {
      super.update(dt, focused);
      this.shake = Math.max(0, (this.shake || 0) - dt * 2.5);
      this.error = Math.max(0, (this.error || 0) - dt);
    }
  }

  /** Decide how the game feels about a name. */
  function judgeName(name) {
    const d = D();
    const words = name.toLowerCase().split(/[^a-z]+/).filter(Boolean);
    const squashed = name.toLowerCase().replace(/[^a-z]/g, '');
    if (d.allowedNames.indexOf(squashed) !== -1) return {};
    const all = (ERX.Elements ? ERX.Elements.words() : []).concat(d.elementWords);
    // longest words first, so 'darkness' is reported instead of 'dark'
    all.sort((a, b) => b.length - a.length);
    for (const w of all) {
      for (const word of words.concat([squashed])) {
        const hit = word === w ||
          (word.startsWith(w) && (w.length >= 4 || word.length - w.length <= 4)) ||
          (w.length >= 4 && word.endsWith(w) && word.length - w.length <= 5);
        if (hit) return { element: w };
      }
    }
    if (d.specialNames[squashed]) return { special: d.specialNames[squashed] };
    return {};
  }

  function randomName() {
    const d = D();
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    for (let i = 0; i < 20; i++) {
      const usePrefix = Math.random() < 0.65;
      const n = (usePrefix ? pick(d.namePrefixes) + ' ' : '') + pick(d.nameCores) + pick(d.nameSuffixes);
      if (n.length <= d.MAX_NAME) return n;
    }
    return pick(d.nameCores);
  }

  class CreatorScreen extends ERX.PanelScreen {
    enter(p) {
      this.list = p.list || null;
      this.coversPanels = true;
      this.maxW = 430;
      this.maxH = 252;
      this.look = ERX.Saves.randomLook();
      this.state = 'look';
      this.stateT = 0;
      this.hop = 0;
      this.msg = null;
      this.insist = 0;
      this.celebrate = 0;
      this.pending = null;
      this.lockPokes = 0;

      const d = D();
      const hop = () => { this.hop = 1; };
      const row = (label, key, opts, hint) => new OptionRow({
        label, hint, options: () => opts, get: () => this.look[key], set: (v) => { this.look[key] = v; }, onChange: hop,
      });
      this.rows = [
        row('GENDER', 'gender', d.genders, 'Pick a body type. Every outfit and hairstyle works with both.'),
        row('SKIN', 'skin', d.skins, 'Skin tone. The last one is a bit... slimy.'),
        row('HAIR', 'hair', d.hairStyles, 'Hairstyle. Bald is also a hairstyle. A brave one.'),
        row('HAIR COLOR', 'hairColor', d.hairColors, 'Hair colour. Natural, or delightfully unnatural.'),
        row('EYES', 'eyes', d.eyeColors, 'Eye colour. Windows to the soul. Tiny pixel windows.'),
        row('OUTFIT', 'outfit', d.outfits, 'What your hero wears to save the world.'),
        row('OUTFIT COLOR', 'outfitColor', d.outfitColors, 'Fashion is an element too. (It is not.)'),
        row('PANTS', 'pants', d.pantsColors, 'Pants. Very important. Do not skip pants.'),
        new LockedRow({ label: 'ELEMENT', hint: 'Elements are assigned at random later. This row is just here to say no.', onPoke: (r) => this._pokeLock(r) }),
      ];
      this.randomBtn = new Button({ label: 'RANDOMIZE', icon: 'dice', sound: null, fixed: true, hint: 'Roll a completely random look. Embrace chaos.', onActivate: () => this._randomize() });
      this.backBtn = new Button({ label: 'BACK', icon: 'back', sound: null, fixed: true, hint: 'Return to the character list. This hero will be forgotten.', onActivate: () => this.back() });
      this.nextBtn = new Button({ label: 'NEXT', icon: 'play', fixed: true, hint: 'Looking good! Next: a name.', onActivate: () => this._toName() });
      this.backBtn.navRight = this.nextBtn;
      this.nextBtn.navLeft = this.backBtn;
      this.lookGroup = new FocusGroup();
      this.lookGroup.set(this.rows.concat([this.randomBtn, this.backBtn, this.nextBtn]));

      this.textBox = new TextBox({ hint: 'Type with your keyboard (on a phone: tap here). ENTER to create, ESC to go back.', onSubmit: () => this._submit() });
      this.randNameBtn = new Button({ label: 'RANDOM NAME', icon: 'dice', sound: null, hint: 'Out of ideas? Let the name generator suffer instead.', onActivate: () => this._randomName() });
      this.nameBackBtn = new Button({ label: 'BACK', icon: 'back', sound: null, fixed: true, hint: 'Back to the appearance options.', onActivate: () => this._toLook() });
      this.createBtn = new Button({ label: 'CREATE', icon: 'star', sound: null, fixed: true, hint: 'Bring this hero into existence.', onActivate: () => this._submit() });
      this.nameBackBtn.navRight = this.createBtn;
      this.createBtn.navLeft = this.nameBackBtn;
      this.nameGroup = new FocusGroup();
      this.nameGroup.set([this.textBox, this.randNameBtn, this.nameBackBtn, this.createBtn]);
    }

    get group() { return this.state === 'name' ? this.nameGroup : this.lookGroup; }

    exit() { ERX.Input.textMode = false; }

    back() {
      ERX.Input.textMode = false;
      super.back();
    }

    _pokeLock(r) {
      const jokes = D().lockedElementJokes;
      ERX.Toast.show(jokes[Math.min(this.lockPokes, jokes.length - 1)], { color: '#ff8a6a' });
      this.lockPokes++;
      r.poked = 0.4;
      sfx('deny', { minGap: 0.15 });
      ERX.FX.shake(1, 0.15);
    }

    _randomize() {
      this.look = ERX.Saves.randomLook();
      if (Math.random() < 0.08) this.look.skin = D().skins.length - 1; // rare slime skin
      this.hop = 1;
      sfx('star');
    }

    _toName() {
      this.state = 'name';
      this.stateT = 0;
      this.msg = null;
      ERX.Input.textMode = true;
      this.nameGroup.focus(this.textBox);
      sfx('tab');
    }

    _toLook() {
      this.state = 'look';
      this.stateT = 0;
      ERX.Input.textMode = false;
      this.lookGroup.focus(this.nextBtn);
    }

    _randomName() {
      this.textBox.value = randomName();
      this.msg = null;
      this.hop = 1;
      sfx('tick', { value: 70 });
    }

    _say(text, color) {
      this.msg = { text, color: color || T.gold, t: 0 };
    }

    _reject(text) {
      this._say(text, '#ff8a6a');
      this.textBox.shake = 1;
      this.textBox.error = 1.2;
      ERX.FX.shake(2.5, 0.3);
      sfx('thud');
    }

    _submit() {
      if (this.pending || this.celebrate) return;
      const d = D();
      const name = this.textBox.value.replace(/\s+/g, ' ').trim();
      this.textBox.value = name;
      if (!name) { this._reject(d.emptyName); return; }
      const verdict = judgeName(name);
      if (verdict.element) {
        this.insist++;
        if (this.insist >= 3) {
          // The game gives up... with a small adjustment.
          const forced = (d.insistPrefix + name).slice(0, d.MAX_NAME + d.insistPrefix.length);
          this._say(d.insistReplies[2], T.gold);
          ERX.FX.shake(1.5, 0.2);
          sfx('swap');
          this.pending = { name: forced, t: 1.4 };
          return;
        }
        const specific = d.elementReplies[verdict.element];
        const generic = d.genericElementReplies[Math.floor(Math.random() * d.genericElementReplies.length)];
        this._reject(this.insist === 2 ? d.insistReplies[1] : specific || generic);
        return;
      }
      if (verdict.special) this._say(verdict.special, T.good);
      this._create(name);
    }

    _create(name) {
      const c = ERX.Saves.create(name, this.look);
      this.created = c;
      this.celebrate = 1.3;
      this.textBox.value = name;
      sfx('start');
      if (this.list) this.list.pendingFocus = c.id;
    }

    update(dt, input, active) {
      this.stateT += dt;
      this.hop = Math.max(0, this.hop - dt * 4);
      if (this.msg) this.msg.t += dt;

      // the "Definitely Not ..." rename plays out, then the character is made
      if (this.pending) {
        this.pending.t -= dt;
        this.textBox.value = this.pending.name.slice(0, Math.min(this.pending.name.length, Math.ceil((1.4 - this.pending.t) * 30)));
        if (this.pending.t <= 0) {
          const n = this.pending.name;
          this.pending = null;
          this._create(n);
        }
        this.group.update(dt, input, false);
        return;
      }
      if (this.celebrate > 0) {
        this.celebrate -= dt;
        if (this.celebrate <= 0) {
          ERX.Toast.show(this.created.name + ' has joined the character list!', { color: '#72e05a' });
          ERX.Input.textMode = false;
          ERX.Scenes.pop();
        }
        this.group.update(dt, input, false);
        return;
      }

      if (active && this.state === 'name') {
        ERX.Input.textMode = true;
        const max = D().MAX_NAME;
        for (const ch of input.text) {
          if (ch === '\b') this.textBox.value = this.textBox.value.slice(0, -1);
          else if (/^[A-Za-z0-9 \-'._!?]$/.test(ch) && this.textBox.value.length < max) this.textBox.value += ch;
          else if (this.textBox.value.length >= max) { sfx('deny', { minGap: 0.2 }); continue; }
          else continue;
          sfx('type', { minGap: 0.02 });
          if (this.msg && this.msg.t > 0.5) this.msg = null;
        }
        if (input.hasAction('back')) { input.consumeAction('back'); sfx('back'); this._toLook(); return; }
      } else if (active && this.handleBack(input, active)) {
        return;
      }
      this.group.update(dt, input, active);
    }

    render(ctx) {
      const W = ERX.Display.width, H = ERX.Display.height;
      this.drawDim(ctx, W, H);
      const p = this.panel(W, H);
      T.drawPanel(ctx, p.x, p.y, p.w, p.h);
      T.drawTitlePlate(ctx, p.x + p.w / 2, p.y - 10, this.state === 'name' ? 'NAME YOUR HERO' : 'CREATE CHARACTER');

      const by = p.y + p.h - 23;
      const lx = p.x + 12;
      const lw = Math.max(96, Math.min(130, Math.floor(p.w * 0.32)));
      const rx = lx + lw + 10, rw = p.x + p.w - 12 - rx;
      const previewY = p.y + 18;
      const previewH = by - 24 - previewY;

      this._preview(ctx, lx, previewY, lw, previewH);
      const f = this.group.focused;

      if (this.state === 'look') {
        const rowH = 14, step = Math.min(16, Math.floor((by - 38 - (p.y + 18)) / this.rows.length));
        this.rows.forEach((r, i) => r.setRect(rx, p.y + 18 + i * step, rw, rowH));
        for (const r of this.rows) r.render(ctx, r === f);
        this.randomBtn.setRect(lx, by - 20, lw, 16);
        this.randomBtn.render(ctx, this.randomBtn === f);
        this.backBtn.setRect(lx, by, lw, 16);
        this.nextBtn.setRect(rx + rw - 104, by, 104, 16);
        this.backBtn.render(ctx, this.backBtn === f);
        this.nextBtn.render(ctx, this.nextBtn === f);
        const hint = f && f.hint ? f.hint : '';
        F.wrap(hint, rw - 4).slice(0, 2).forEach((l, i) => F.draw(ctx, l, rx + 2, by - 21 + i * 9, { color: T.textMute }));
      } else {
        const ty = p.y + 22;
        F.draw(ctx, 'WHAT IS YOUR NAME?', rx, ty, { color: T.gold, shadow: T.ink });
        this.textBox.setRect(rx, ty + 13, rw, 22);
        this.textBox.render(ctx, this.textBox === f);
        const max = D().MAX_NAME;
        const len = this.textBox.value.length;
        F.draw(ctx, len + '/' + max, rx + rw, ty + 38, { color: len >= max ? T.danger : T.textMute, align: 'right' });
        F.draw(ctx, 'Letters, numbers, spaces.', rx, ty + 38, { color: T.textMute });

        // the game's reaction
        if (this.msg) {
          const lines = F.wrap(this.msg.text, rw - 14);
          const mh = lines.length * 10 + 8;
          const my = ty + 52;
          const pop = U.ease.outBack(U.clamp(this.msg.t / 0.25, 0, 1));
          ctx.globalAlpha = pop;
          T.rect(ctx, rx + 1, my, rw - 2, mh, T.ink);
          T.rect(ctx, rx, my + 1, rw, mh - 2, T.ink);
          T.rect(ctx, rx + 1, my + 1, rw - 2, mh - 2, '#2a2350');
          T.rect(ctx, rx + 1, my + 1, 2, mh - 2, this.msg.color);
          lines.forEach((l, i) => F.draw(ctx, l, rx + 8, my + 5 + i * 10, { color: this.msg.color }));
          ctx.globalAlpha = 1;
        } else {
          const tips = ['Tip: element names cause... reactions.', 'Tip: the RANDOM NAME button never judges you.'];
          F.draw(ctx, tips[Math.floor(this.time / 4) % tips.length], rx, ty + 56, { color: T.textMute });
        }
        this.randNameBtn.setRect(rx, by - 20, Math.min(rw, 120), 16);
        this.randNameBtn.render(ctx, this.randNameBtn === f);
        this.nameBackBtn.setRect(lx, by, lw, 16);
        this.createBtn.setRect(rx + rw - 104, by, 104, 16);
        this.nameBackBtn.render(ctx, this.nameBackBtn === f);
        this.createBtn.render(ctx, this.createBtn === f);
      }
    }

    _preview(ctx, x, y, w, h) {
      // dark inset stage
      T.rect(ctx, x, y, w, h, T.ink);
      T.rect(ctx, x + 1, y + 1, w - 2, h - 2, '#0d1230');
      for (let i = 0; i < 6; i++) T.rect(ctx, x + 1, y + 1 + Math.floor((h - 2) * i / 6), w - 2, 1, i % 2 ? '#10163a' : '#0f1434');
      // light beam on the hero
      ctx.fillStyle = 'rgba(255,240,200,0.05)';
      ctx.fillRect(x + w / 2 - 22, y + 1, 44, h - 2);
      const scale = U.clamp(Math.floor((h - 26) / 26), 2, 5);
      const feetY = y + h - 12;
      // pedestal
      const pw = 18 * scale;
      T.rect(ctx, Math.round(x + w / 2 - pw / 2), feetY, pw, 4, '#3a4783');
      T.rect(ctx, Math.round(x + w / 2 - pw / 2), feetY, pw, 1, '#6070b8');
      T.rect(ctx, Math.round(x + w / 2 - pw / 2) + 2, feetY + 4, pw - 4, 3, '#232b58');
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(Math.round(x + w / 2 - 6 * scale), feetY - 1, 12 * scale, 2);

      let frame;
      if (this.celebrate > 0) frame = PS.frame(this.look, 'cheer', 0);
      else if (this.textBox.shake > 0.3) frame = PS.frame(this.look, 'blink', 0);
      else frame = PS.idleFrame(this.look, this.time);
      const hop = Math.round(Math.sin(this.hop * Math.PI) * 6) + (this.celebrate > 0 ? Math.round(Math.abs(Math.sin(this.celebrate * 9)) * 6) : 0);
      PS.draw(ctx, frame, x + w / 2, feetY - hop, scale);

      // name tag under the stage
      const tag = this.state === 'name' ? this.textBox.value : '';
      if (tag) F.draw(ctx, tag, x + w / 2, y + h - 9, { color: '#ffffff', align: 'center', outline: T.ink });
      if (this.celebrate > 0) {
        for (let i = 0; i < 8; i++) {
          const a = this.time * 3 + i * 0.785;
          const r = 14 + (1.3 - this.celebrate) * 30;
          ctx.fillStyle = ERX.Color.ELEMENTS[i % 6];
          ctx.fillRect(Math.round(x + w / 2 + Math.cos(a) * r), Math.round(feetY - 13 * scale + Math.sin(a) * r * 0.7), 2, 2);
        }
      }
    }
  }

  ERX.Scenes.register('creator', CreatorScreen);
  ERX.CharacterNames = { judgeName, randomName };
})(window.ERX = window.ERX || {});
