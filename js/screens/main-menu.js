/*
 * Main menu / title screen.
 *
 * Flow: logo drops in -> "PRESS ANY KEY" (this first input also unlocks
 * browser audio) -> PLAY / SETTINGS / HELP / CREDITS.
 * When a sub-screen opens, the logo and buttons slide out of the way so the
 * living world stays visible behind the panel.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, F = ERX.Font, T = ERX.UITheme;
  const { Button, FocusGroup } = ERX.UI;

  ERX.Session = ERX.Session || { playVisits: 0, escPresses: 0 };

  class MainMenuScreen extends ERX.Scenes.Screen {
    enter() {
      this.state = 'intro';
      this.stateT = 0;
      this.menuVis = 1;
      this.buttonsT = 0;
      this.logo = ERX.Assets.image('logo');
      this.splash = this._pickSplash();
      this.splashPop = 0;
      this.beat = { pulse: 0, count: 0 };
      this.jitter = { x: 0, y: 0 };
      this.shimmerT = 3;
      this.landed = false;

      this.group = new FocusGroup();
      this.buttons = [
        new Button({ label: 'PLAY', icon: 'play', onActivate: () => this.openPlay() }),
        new Button({ label: 'SETTINGS', icon: 'gear', onActivate: () => ERX.Scenes.push('settings') }),
        new Button({ label: 'HELP', icon: 'help', onActivate: () => ERX.Scenes.push('help') }),
        new Button({ label: 'CREDITS', icon: 'star', onActivate: () => ERX.Scenes.push('credits') }),
      ];
      this.group.set(this.buttons);

      if (this.logo) {
        this.shimmerCanvas = ERX.makeCanvas(this.logo.width, this.logo.height);
      }
    }

    openPlay() {
      ERX.Scenes.push('characters');
    }

    resume() {
      ERX.Input.typed = '';
      // a fresh splash line every time you come back to the menu
      this.splash = this._pickSplash();
      this.splashPop = 1;
    }

    /** Random splash line (never the same one twice in a row), with live tokens filled in. */
    _pickSplash() {
      const list = ERX.Data.splashes;
      let raw;
      do { raw = list[Math.floor(Math.random() * list.length)]; } while (list.length > 1 && raw === this._lastSplashRaw);
      this._lastSplashRaw = raw;
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0'), mm = String(now.getMinutes()).padStart(2, '0');
      const world = ERX.Backgrounds.current ? ERX.Backgrounds.current.name : 'SOMEWHERE';
      const track = ERX.MusicTracks && ERX.Backgrounds.current && ERX.MusicTracks[ERX.Backgrounds.current.music];
      return raw
        .replace(/\{time\}/g, hh + ':' + mm)
        .replace(/\{world\}/g, world)
        .replace(/\{year\}/g, String(now.getFullYear()))
        .replace(/\{song\}/g, track ? track.title : 'the music')
        .replace(/\{count\}/g, String(list.length))
        .replace(/\{rand\}/g, String(Math.floor(Math.random() * 900) + 100));
    }

    _anyInput(input) {
      return input.pressed.size > 0 || input.mouse.pressed[0] || input.mouse.pressed[2] || input.actions.length > 0;
    }

    _enterMenu() {
      this.state = 'menu';
      this.stateT = 0;
      this.buttonsT = 0;
      ERX.Audio.unlock();
      ERX.Audio.playSfx('start');
      ERX.FX.shake(1, 0.15);
    }

    update(dt, input, active) {
      this.stateT += dt;
      const isTop = ERX.Scenes.top() === this;
      this.menuVis = U.approach(this.menuVis, isTop ? 1 : 0, isTop ? 9 : 14, dt);

      // Logo landing thump.
      if (!this.landed && this.time > 0.95) {
        this.landed = true;
        ERX.FX.shake(2, 0.3);
        ERX.Audio.playSfx('logo');
      }

      if (this.state === 'intro') {
        if (active && this._anyInput(input)) this._enterMenu();
        else if (this.stateT > 1.4) { this.state = 'press'; this.stateT = 0; }
      } else if (this.state === 'press') {
        if (active && this._anyInput(input)) this._enterMenu();
      } else {
        this.buttonsT += dt;
        const ready = this.buttonsT > 0.45;
        this.group.update(dt, input, active && ready);
        if (active && ready) {
          if (input.hasAction('back')) this._escapeJoke();
          this._checkTyped(input);
        }
      }

      // beat-synced logo: pulse + tiny vibration on strong hits
      this.beat = ERX.Audio.beat();
      const shaky = ERX.Settings.get('video.screenShake');
      if (shaky && this.beat.pulse > 0.55) {
        this.jitter.x = Math.round((Math.random() * 2 - 1) * this.beat.pulse);
        this.jitter.y = Math.round((Math.random() * 2 - 1) * this.beat.pulse);
      } else {
        this.jitter.x = this.jitter.y = 0;
      }
      this.splashPop = Math.max(0, this.splashPop - dt * 3);

      // clicking the splash line rerolls it
      const sr = this._splashRect;
      if (active && sr && input.mouse.pressed[0] && input.mouse.x >= sr.x && input.mouse.x <= sr.x + sr.w && input.mouse.y >= sr.y && input.mouse.y <= sr.y + sr.h) {
        this.splash = this._pickSplash();
        this.splashPop = 1;
        ERX.Audio.playSfx('hover');
      }

      this.shimmerT -= dt;
      if (this.shimmerT < -1.2) this.shimmerT = 5 + Math.random() * 4;
    }

    _escapeJoke() {
      const jokes = ERX.Data.escapeJokes;
      const i = Math.min(ERX.Session.escPresses, jokes.length - 1);
      ERX.Session.escPresses++;
      ERX.Toast.show(jokes[i], { color: '#a8f0ff' });
      ERX.Audio.playSfx('deny');
      ERX.FX.shake(1.5, 0.2);
    }

    _checkTyped(input) {
      const typed = input.typed;
      if (!typed) return;
      // (shh)
      if (typed.endsWith('neonjam')) { input.typed = ''; ERX.NeonJam.toggle(); return; }
      if (typed.endsWith('theelementaladmin')) {
        input.typed = '';
        ERX.Admin.unlock();
        ERX.Audio.playSfx('star');
        ERX.Toast.show('ADMIN MODE UNLOCKED. With great power comes great testing.', { color: '#ff6a6a', duration: 4 });
        ERX.Scenes.push('admin', {});
        return;
      }
      for (const w of ERX.Data.elementWords) {
        if (typed.endsWith(w)) {
          const replies = ERX.Data.elementWordReplies;
          const msg = replies[Math.floor(Math.random() * replies.length)].replace(/\{w\}/g, w);
          ERX.Toast.show(msg, { color: '#ffd34d', duration: 3.5 });
          ERX.Audio.playSfx('deny');
          input.typed = '';
          return;
        }
      }
    }

    layout(W, H) {
      const logoH = this.logo ? this.logo.height : 60;
      const logoY = Math.max(4, Math.round(H * 0.025));
      const splashY = logoY + logoH + 2;
      const footerY = H - 12;
      const top = splashY + 22;
      const avail = footerY - 8 - top;
      const gap = avail > 100 ? 6 : 4;
      const bh = U.clamp(Math.floor((avail - gap * 3) / 4), 14, 19);
      const bw = Math.min(132, W - 40);
      const totalH = bh * 4 + gap * 3;
      const by = top + Math.max(0, Math.floor((avail - totalH) / 2.5));
      return { logoY, logoH, splashY, footerY, by, bh, bw, gap };
    }

    render(ctx) {
      const W = ERX.Display.width, H = ERX.Display.height;
      const L = this.layout(W, H);
      const vis = U.ease.outCubic(U.clamp(this.menuVis, 0, 1));
      const hide = 1 - vis;

      // ---- logo ----
      const drop = U.ease.outBounce(U.clamp(this.time / 1.1, 0, 1));
      const bob = Math.round(Math.sin(this.time * 1.4) * 1.5);
      const logoY = Math.round(L.logoY - (1 - drop) * (L.logoH + 30) + bob - hide * (L.logoH + 40));
      if (this.logo) {
        const lw = this.logo.width, lh = this.logo.height;
        const shimmering = this.shimmerT < 0 && this.shimmerT > -1.2 && !ERX.Settings.get('video.lowDetail');
        const src = shimmering ? this._shimmer() : this.logo;
        // Sway gently back and forth, and thump bigger on every beat. Drawn with
        // nearest-neighbour sampling straight onto the pixel grid, so it stays pixel art.
        const pulse = this.landed ? this.beat.pulse : 0, neon = ERX.NeonJam && ERX.NeonJam.on();
        const angle = Math.sin(this.time * 1.25) * 0.032 + (this.beat.count % 2 ? 1 : -1) * pulse * (neon ? 0.035 : 0.01);
        const s = 1 + pulse * (neon ? 0.1 : 0.04);
        ctx.save();
        ctx.translate(Math.round(W / 2) + this.jitter.x, logoY + Math.round(lh / 2) + this.jitter.y);
        ctx.rotate(angle);
        ctx.scale(s, s);
        if (neon) this._neonGlow(ctx, src, lw, lh, pulse);
        ctx.drawImage(src, -Math.round(lw / 2), -Math.round(lh / 2));
        ctx.restore();
      } else {
        this._fallbackTitle(ctx, W, logoY + 30);
      }

      // ---- splash line ----
      if (this.time > 1.2) {
        const sa = U.clamp((this.time - 1.2) / 0.4, 0, 1);
        const hop = Math.round(this.beat.pulse * 2 + this.splashPop * 3);
        const sy = Math.round(L.splashY + Math.sin(this.time * 3) * 1 - hop - hide * 30);
        const color = this.beat.pulse > 0.6 || this.splashPop > 0.5 ? '#fff6b0' : '#ffe45c';
        const lines = F.wrap(this.splash, Math.min(W - 24, 300)).slice(0, 2);
        let wmax = 0;
        lines.forEach((l, i) => {
          wmax = Math.max(wmax, F.measure(l));
          F.draw(ctx, l, W / 2, sy + i * 9, { color, outline: '#2a1a08', align: 'center', alpha: sa * vis });
        });
        this._splashRect = { x: W / 2 - wmax / 2 - 4, y: sy - 3, w: wmax + 8, h: lines.length * 9 + 6 };
      }

      // ---- press any key / buttons ----
      if (this.state === 'press' || (this.state === 'intro' && this.stateT > 1.1)) {
        const blink = Math.floor(this.time * 2.2) % 2 === 0;
        const py = L.by + Math.round(L.bh * 1.5);
        if (blink) F.draw(ctx, 'PRESS ANY KEY', W / 2, py, { scale: 2, color: '#ffffff', outline: '#07080f', shadow: '#2a3070', shadowOffset: 2, align: 'center' });
        F.draw(ctx, ERX.Touch.enabled ? '(or tap the screen. Hard.)' : '(or click, or poke a gamepad)', W / 2, py + 22, { color: '#dfe6ff', outline: '#07080f', align: 'center' });
      } else if (this.state === 'menu') {
        this.buttons.forEach((b, i) => {
          const t = U.clamp((this.buttonsT - i * 0.07) / 0.45, 0, 1);
          const enter = U.ease.outBack(t);
          const off = (1 - enter) * (H - L.by + 20) + hide * (W * 0.7 + i * 25);
          b.setRect(W / 2 - L.bw / 2 - (hide > 0 ? off : 0), L.by + i * (L.bh + L.gap) + (hide > 0 ? 0 : off), L.bw, L.bh);
        });
        if (vis > 0.02) this.group.render(ctx);
      }

      // ---- footer ----
      this._footer(ctx, W, H, L, vis);
    }

    _footer(ctx, W, H, L, vis) {
      const y = L.footerY;
      const o = { color: '#d4daf5', outline: '#07080f', alpha: Math.min(1, this.time / 1.5) * vis };
      F.draw(ctx, ERX.Config.VERSION, 6, y, o);
      const world = ERX.Backgrounds.current ? 'WORLD: ' + ERX.Backgrounds.current.name : '';
      F.draw(ctx, world, W - 6, y, Object.assign({}, o, { align: 'right' }));

      if (this.state === 'menu' && vis > 0.5) {
        const dev = ERX.Input.lastDevice;
        const hint = dev === 'gamepad' ? 'D-PAD MOVE   (A) SELECT   (B) BACK'
          : dev === 'mouse' ? 'CLICK TO SELECT'
          : dev === 'touch' ? 'TAP TO SELECT'
          : '↑↓ MOVE   ENTER SELECT   ESC BACK';
        const left = F.measure(ERX.Config.VERSION) + 16;
        const right = F.measure(world) + 16;
        const hw = F.measure(hint);
        const room = W - left - right;
        if (room >= hw) {
          const cx = U.clamp(W / 2, left + hw / 2, W - right - hw / 2);
          F.draw(ctx, hint, cx, y, Object.assign({}, o, { align: 'center', color: '#9aa3cf' }));
        }
      }
    }

    /** Neon Jam: the logo glows pink and cyan, the glow splitting apart on every beat. */
    _neonGlow(ctx, src, lw, lh, pulse) {
      if (!this._glowPink) { this._glowPink = ERX.Sprites.tint(this.logo, '#ff2ad4'); this._glowCyan = ERX.Sprites.tint(this.logo, '#2af0ff'); }
      const sp = 1 + Math.round(pulse * 3), x = -Math.round(lw / 2), y = -Math.round(lh / 2);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.5 * pulse;
      ctx.drawImage(this._glowPink, x - sp, y); ctx.drawImage(this._glowCyan, x + sp, y);
      ctx.globalAlpha *= 0.5; ctx.drawImage(this._glowPink, x, y - sp); ctx.drawImage(this._glowCyan, x, y + sp);
      ctx.restore();
    }

    /** Diagonal light sweep across the logo (composited off-screen). */
    _shimmer() {
      const cv = this.shimmerCanvas, c = cv.getContext('2d');
      const w = cv.width, h = cv.height;
      const p = -this.shimmerT / 1.2;
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, w, h);
      c.drawImage(this.logo, 0, 0);
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(255,255,255,0.55)';
      const sx = Math.round(-40 + p * (w + 80));
      for (let yy = 0; yy < h; yy++) {
        const off = Math.round(yy * 0.5);
        c.fillRect(sx - off, yy, 6, 1);
        c.fillRect(sx - off + 9, yy, 2, 1);
      }
      return cv;
    }

    /** Used only if the logo image is missing. */
    _fallbackTitle(ctx, W, y) {
      const E = ERX.Color.ELEMENTS;
      const word = 'ELEMENTAL';
      let x = W / 2 - F.measure(word, 4) / 2;
      for (let i = 0; i < word.length; i++) {
        x += F.draw(ctx, word[i], x, y, { scale: 4, color: E[i % E.length], outline: '#07080f', shadow: '#07080f', shadowOffset: 4 }) + 4;
      }
      F.draw(ctx, 'RETRIBUTION', W / 2, y + 34, { scale: 3, color: '#dde3f5', outline: '#07080f', shadow: '#07080f', shadowOffset: 3, align: 'center' });
      F.draw(ctx, 'X', W / 2, y + 62, { scale: 4, color: '#3aa0ff', outline: '#07080f', shadow: '#07080f', shadowOffset: 4, align: 'center' });
    }
  }

  ERX.Scenes.register('mainMenu', MainMenuScreen);
})(window.ERX = window.ERX || {});
