/*
 * PLAY — the official placeholder. There is no gameplay here on purpose.
 * A grumpy unassigned slime guards the construction site.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, F = ERX.Font, T = ERX.UITheme, PB = ERX.PixelBuffer, C = ERX.Color;
  const { Button, FocusGroup } = ERX.UI;
  const c32 = (h) => C.u32(h);

  /** Grumpy slime frames: 0 = normal, 1 = squash, 2 = stretch. */
  const slimeCache = new Map();
  function slime(color, frame) {
    const key = color + frame;
    if (slimeCache.has(key)) return slimeCache.get(key);
    const dims = [[22, 15], [26, 12], [18, 19]][frame];
    const [w, h] = dims;
    const b = new PB(w + 2, h + 4);
    const cx = (w + 2) / 2 - 0.5, base = h + 2;
    const body = c32(color), dark = c32(C.shade(color, -0.35)), light = c32(C.shade(color, 0.35));
    for (let y = 0; y < h; y++) {
      const t = y / (h - 1);
      const hw = (w / 2) * Math.sqrt(Math.max(0, 1 - Math.pow(1 - t, 2.2))) + (t > 0.7 ? 0.5 : 0);
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
        let col = body;
        if (y > h * 0.72 || x > cx + hw * 0.55) col = dark;
        b.set(x, base - h + y, col);
      }
    }
    // shine
    b.set(Math.round(cx - w * 0.25), base - h + 2, light);
    b.set(Math.round(cx - w * 0.25) + 1, base - h + 2, light);
    b.set(Math.round(cx - w * 0.25), base - h + 3, light);
    // angry eyes + eyebrows + frown
    const ey = base - Math.round(h * 0.55);
    const ink = c32('#120c14'), white = c32('#ffffff');
    for (const side of [-1, 1]) {
      const ex = Math.round(cx + side * 3);
      b.set(ex, ey, white); b.set(ex + 1, ey, white); b.set(ex, ey + 1, white); b.set(ex + 1, ey + 1, white);
      b.set(side < 0 ? ex + 1 : ex, ey + 1, ink);
      // eyebrows slant down toward the middle: >:(
      b.set(ex + (side < 0 ? -1 : 2), ey - 3, ink);
      b.set(ex + (side < 0 ? 0 : 1), ey - 2, ink);
      b.set(ex + (side < 0 ? 1 : 0), ey - 2, ink);
    }
    const my = ey + 3;
    b.set(Math.round(cx) - 1, my + 1, ink); b.set(Math.round(cx), my, ink); b.set(Math.round(cx) + 1, my + 1, ink);
    b.outline(ink);
    const cv = b.toCanvas();
    slimeCache.set(key, cv);
    return cv;
  }

  function makeSign() {
    const b = new PB(46, 34);
    const wood = c32('#9a6a44'), woodD = c32('#6a4630'), woodL = c32('#c08a5a'), ink = c32('#120c14');
    b.rect(10, 14, 3, 20, woodD);
    b.rect(33, 14, 3, 20, woodD);
    b.rect(1, 2, 44, 16, wood);
    for (let y = 2; y < 18; y += 4) b.rect(1, y, 44, 1, woodD);
    b.rect(1, 2, 44, 1, woodL);
    // caution stripes along the bottom edge
    for (let x = 1; x < 45; x++) b.set(x, 17, c32(Math.floor(x / 3) % 2 ? '#ffd34d' : '#1a1420'));
    b.outline(ink);
    return b.toCanvas();
  }

  function makeCone() {
    return ERX.Sprites.fromStrings([
      '...k...',
      '..kok..',
      '..kok..',
      '.kwwwk.',
      '.koook.',
      'kwwwwwk',
      'koooook',
      'kkkkkkk',
    ], { k: '#120c14', o: '#ff7a2a', w: '#f4f0e8' });
  }

  class PlayScreen extends ERX.Scenes.Screen {
    enter(params) {
      this.appearDuration = 0.01;
      this.coversPanels = true;
      this.character = (params && params.character) || null;
      this.visit = ++ERX.Session.playVisits;
      this.headline = ERX.Data.play.headline;
      const subs = ERX.Data.play.sublines;
      this.subline = subs[Math.min(this.visit - 1, subs.length - 1)];
      this.typed = 0;
      this.typeT = 0;
      this.done = false;
      this.angerT = 0;
      this.jumpT = 0;
      this.sign = makeSign();
      this.cone = makeCone();
      this.flashT = 2;
      this.flashColor = null;
      this.backBtn = new Button({ label: 'BACK', icon: 'back', sound: null, onActivate: () => this.back() });
      this.group = new FocusGroup();
      this.group.set([this.backBtn]);
    }

    back() {
      ERX.Audio.playSfx('back');
      ERX.Scenes.pop({ transition: 'dissolve', duration: 0.8 });
    }

    update(dt, input, active) {
      // typewriter
      const startDelay = 0.55;
      if (this.time > startDelay && this.typed < this.headline.length) {
        this.typeT += dt;
        const speed = this.headline.slice(this.typed).startsWith('>:(') ? 0.18 : 0.045;
        while (this.typeT > speed && this.typed < this.headline.length) {
          this.typeT -= speed;
          this.typed++;
          const ch = this.headline[this.typed - 1];
          if (ch !== ' ') ERX.Audio.playSfx('type', { minGap: 0.02 });
        }
        if (this.typed >= this.headline.length && !this.done) {
          this.done = true;
          this.angerT = 0.6;
          this.jumpT = 0.5;
          ERX.FX.shake(3, 0.35);
          ERX.Audio.playSfx('thud');
          if (this.subline.indexOf('★') !== -1) setTimeout(() => ERX.Audio.playSfx('star'), 700);
        }
      }
      this.angerT = Math.max(0, this.angerT - dt);
      this.jumpT = Math.max(0, this.jumpT - dt);

      // the slime occasionally tries on an element colour... then gives up
      this.flashT -= dt;
      if (this.flashT <= 0) {
        if (this.flashColor) { this.flashColor = null; this.flashT = U.lerp(3, 6, Math.random()); }
        else { this.flashColor = ERX.Color.ELEMENTS[Math.floor(Math.random() * 6)]; this.flashT = 0.35; }
      }

      if (active) {
        if (input.hasAction('back')) { input.consumeAction('back'); this.back(); return; }
        // skip the typewriter
        if (!this.done && (input.hasAction('confirm') || input.mouse.pressed[0]) && this.time > 0.6) {
          this.typed = this.headline.length - 1;
          input.consumeAction('confirm');
          return;
        }
      }
      this.group.update(dt, input, active && this.done);
    }

    render(ctx) {
      const W = ERX.Display.width, H = ERX.Display.height;
      ctx.fillStyle = 'rgba(5,6,16,0.8)';
      ctx.fillRect(0, 0, W, H);

      const t = this.time;
      const stageY = Math.round(H * 0.44);
      const cx = Math.round(W / 2);

      // ground strip
      const stageR = this.character ? 92 : 70;
      T.rect(ctx, cx - 70, stageY, 70 + stageR, 1, '#3a4783');
      for (let x = cx - 70; x < cx + stageR; x += 3) T.rect(ctx, x, stageY + 2, 1, 1, '#232b58');

      // your character, staring at the closed world
      if (this.character) {
        const look = this.character.look;
        const PS = ERX.PlayerSprite;
        const chx = cx + 74;
        const fr = this.done && this.angerT > 0 ? PS.frame(look, 'blink', 0) : PS.idleFrame(look, t);
        PS.draw(ctx, fr, chx, stageY, 1);
        if (this.done && this.angerT <= 0) ctx.drawImage(ERX.Actors.bubble(Math.floor(t / 2) % 2 ? 'what' : 'dots'), chx - 4, stageY - 41);
        F.draw(ctx, this.character.name, chx, stageY + 5, { color: '#d4daf5', align: 'center', outline: '#07080f' });
      }

      // sign
      const sx = cx - 52, sy = stageY - 33;
      ctx.drawImage(this.sign, sx, sy);
      F.draw(ctx, 'CLOSED', sx + 23, sy + 6, { color: '#2a1810', align: 'center' });
      ctx.drawImage(this.cone, cx + 36, stageY - 8);
      ctx.drawImage(this.cone, cx + 46, stageY - 8);

      // grumpy slime: idle bob, angry hop when the headline lands
      let frame = Math.floor(t * 2) % 2 === 0 ? 0 : 1;
      let hop = 0;
      if (this.jumpT > 0) {
        const k = 1 - this.jumpT / 0.5;
        hop = Math.round(Math.sin(k * Math.PI) * 10);
        frame = k < 0.2 || k > 0.85 ? 1 : 2;
      }
      const col = this.angerT > 0 ? '#e0504a' : this.flashColor || '#8a90b0';
      const sl = slime(col, frame);
      const slx = cx + 6 - Math.floor(sl.width / 2);
      ctx.drawImage(sl, slx, stageY - sl.height + 3 - hop);
      if (this.angerT > 0 && Math.floor(t * 10) % 2 === 0) {
        // anger vein
        F.draw(ctx, '#', slx + sl.width - 2, stageY - sl.height - 6 - hop, { color: '#ff4a4a' });
      }

      // headline (typed)
      const scale = F.measure(this.headline, 2) <= W - 24 ? 2 : 1;
      const text = this.headline.slice(0, this.typed);
      const fullW = F.measure(this.headline, scale);
      const hx = Math.round(cx - fullW / 2);
      const hy = Math.round(H * 0.56);
      const shakeX = this.angerT > 0 ? Math.round((Math.random() - 0.5) * 2) : 0;
      if (this.character) {
        const intro = this.character.name + ' tries to enter the world...';
        F.draw(ctx, intro, cx, hy - 14, { color: '#9aa3cf', align: 'center', alpha: U.clamp(t / 0.5, 0, 1) });
      }
      F.draw(ctx, text, hx + shakeX, hy, { scale, color: '#ffffff', outline: '#07080f', shadow: '#2a3070', shadowOffset: scale });
      if (!this.done && Math.floor(t * 4) % 2 === 0) {
        T.rect(ctx, hx + F.measure(text, scale) + 2, hy, scale * 4, 7 * scale, T.gold);
      }
      if (this.done) {
        const a = U.clamp((t - this.doneAt()) / 0.4, 0, 1);
        const lines = F.wrap(this.subline, Math.min(W - 40, 320));
        lines.forEach((l, i) => F.draw(ctx, l, cx, hy + 9 * scale + 10 + i * 10, { color: '#a8f0ff', align: 'center', alpha: a }));
        this.backBtn.setRect(cx - 45, Math.round(H * 0.78) + Math.round((1 - a) * 10), 90, 16);
        this.group.render(ctx);
        F.draw(ctx, 'ESC / ENTER TO GO BACK', cx, Math.round(H * 0.78) + 22, { color: T.textMute, align: 'center', alpha: a });
      }
    }

    doneAt() {
      if (this._doneAt === undefined && this.done) this._doneAt = this.time;
      return this._doneAt || 0;
    }
  }

  ERX.Scenes.register('play', PlayScreen);
  ERX.Slime = slime; // the grumpy slime also guards the end of the cave
})(window.ERX = window.ERX || {});
