/*
 * SETTINGS — Audio, Video (VFX) and Controls tabs.
 * Every control is live: changes apply instantly and persist to storage.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, F = ERX.Font, T = ERX.UITheme;
  const { Button, Slider, Toggle, TabBar, KeybindRow, FocusGroup } = ERX.UI;
  const S = ERX.Settings;

  const TABS = ['AUDIO', 'VIDEO', 'CONTROLS'];

  class SettingsScreen extends ERX.PanelScreen {
    enter(params) {
      this.maxW = 390;
      this.maxH = 262;
      this.scroll = 0;
      this.scrollTarget = 0;
      this.group = new FocusGroup({ wrap: true });

      this.tabBar = new TabBar({ tabs: TABS, index: params.tab || 0, fixed: true, hint: 'Switch tabs with ← → (or Q / E, Tab, LB / RB).', onChange: () => this._buildTab(true) });
      this.backBtn = new Button({ label: 'BACK', icon: 'back', sound: null, fixed: true, hint: 'Return to the main menu. Your settings are saved automatically.', onActivate: () => this.back() });
      this.resetBtn = new Button({ label: 'RESET KEYS', icon: 'reset', fixed: true, hint: 'Restore every keybind to its default.', onActivate: () => this._resetKeys() });

      const slider = (label, path, hint) => new Slider({ label, hint, defaultValue: S.DEFAULTS.audio[path.split('.')[1]], get: () => S.get(path), set: (v) => S.set(path, v) });
      this.audioWidgets = [
        slider('MASTER VOLUME', 'audio.master', 'The volume of all volumes. ENTER toggles mute.'),
        slider('MUSIC VOLUME', 'audio.music', 'Original chiptune, performed live by tiny square waves.'),
        slider('SFX VOLUME', 'audio.sfx', 'Bleeps, bloops, footsteps of the future, and world ambience.'),
        new Button({ label: 'SOUND TEST', icon: 'speaker', compact: true, sound: null, hint: 'Plays a tiny victory jingle at the current volume. You earned it. Probably.', onActivate: () => { ERX.Audio.unlock(); ERX.Audio.playSfx('star'); } }),
      ];
      this.videoWidgets = [
        new Toggle({ label: 'LOW DETAIL MODE', hint: 'Fewer particles, no fog or light rays, smaller crowds, no camera sway. Your GPU says thanks.', get: () => S.get('video.lowDetail'), set: (v) => S.set('video.lowDetail', v) }),
        new Toggle({ label: 'SCREEN SHAKE', hint: 'For dramatic moments. Turn it off if the drama is too much.', get: () => S.get('video.screenShake'), set: (v) => { S.set('video.screenShake', v); if (v) ERX.FX.shake(2, 0.3); } }),
        new Toggle({ label: 'FULLSCREEN', hint: 'Bigger pixels. Same pixels, but bigger. (Shortcut: ALT + ENTER)', get: () => ERX.Display.isFullscreen(), set: (v) => ERX.Display.setFullscreen(v) }),
        new Toggle({ label: 'SHOW FPS', hint: 'Frames per second, top-left corner. For the curious.', get: () => S.get('video.showFps'), set: (v) => S.set('video.showFps', v) }),
      ];
      this.keyRows = ERX.Keybinds.ACTIONS.map((a) => new KeybindRow({
        action: a,
        hint: 'ENTER or click a slot, then press any key or mouse button. ESC cancels, DELETE clears.',
        onListen: (row, slot) => this._listen(row, slot),
      }));
      this.backBtn.navLeft = this.resetBtn;
      this.resetBtn.navRight = this.backBtn;

      this._buildTab(false);
    }

    _buildTab(fromTab) {
      const tab = this.tabBar.index;
      this.scroll = this.scrollTarget = 0;
      this.content = tab === 0 ? this.audioWidgets : tab === 1 ? this.videoWidgets : this.keyRows;
      const list = [this.tabBar].concat(this.content);
      if (tab === 2) list.push(this.resetBtn);
      list.push(this.backBtn);
      this.group.set(list, true);
      if (fromTab) this.group.focus(this.tabBar);
    }

    _listen(row, slot) {
      row.listeningSlot = slot;
      ERX.Audio.playSfx('listen');
      ERX.Input.beginCapture((code, reason) => {
        row.listeningSlot = -1;
        const id = row.action.id;
        if (reason === 'cancel') {
          ERX.Audio.playSfx('back');
          return;
        }
        if (reason === 'clear') {
          ERX.Keybinds.clear(id, slot);
          ERX.Audio.playSfx('toggleOff');
          return;
        }
        const res = ERX.Keybinds.assign(id, slot, code);
        if (!res.ok) {
          ERX.Toast.show(res.message, { color: '#ff8a6a' });
          ERX.Audio.playSfx('deny');
        } else if (res.message) {
          ERX.Toast.show(res.message, { color: '#ffd34d', duration: 4 });
          ERX.Audio.playSfx('swap');
          const other = this.keyRows.find((r) => r.action.id === res.swappedWith);
          if (other) other.highlight = 1;
          row.highlight = 1;
        } else {
          ERX.Audio.playSfx('bound');
          row.highlight = 0.6;
        }
      });
    }

    _resetKeys() {
      ERX.Keybinds.resetDefaults();
      this.keyRows.forEach((r) => { r.highlight = 0.8; });
      ERX.Toast.show('Keybinds restored to factory settings. Fresh out of the box.', { color: '#72e05a' });
    }

    exit() {
      ERX.Input.cancelCapture();
      S.flush();
    }

    update(dt, input, active) {
      if (active) {
        if (input.hasAction('nextTab') || input.hasAction('prevTab')) {
          this.tabBar.select(this.tabBar.index + (input.hasAction('nextTab') ? 1 : -1));
        }
        if (this.handleBack(input, active)) return;
        // DELETE clears the focused key slot directly
        const f = this.group.focused;
        if (input.hasAction('delete') && f instanceof KeybindRow) {
          ERX.Keybinds.clear(f.action.id, f.slot);
          ERX.Audio.playSfx('toggleOff');
        }
        if (input.mouse.wheel && this.tabBar.index === 2) this.scrollTarget += input.mouse.wheel * 16;
      }
      this.group.update(dt, input, active);
      this._keepFocusVisible();
      this.scroll = U.approach(this.scroll, this.scrollTarget, 16, dt);
    }

    _keepFocusVisible() {
      const L = this._lastLayout;
      if (!L || this.tabBar.index !== 2) return;
      const f = this.group.focused;
      const i = this.content.indexOf(f);
      const maxScroll = Math.max(0, this.content.length * L.rowStep - L.areaH);
      if (i !== -1) {
        const top = i * L.rowStep, bottom = top + L.rowH;
        if (top < this.scrollTarget) this.scrollTarget = top;
        if (bottom > this.scrollTarget + L.areaH) this.scrollTarget = bottom - L.areaH;
      }
      this.scrollTarget = U.clamp(this.scrollTarget, 0, maxScroll);
    }

    render(ctx) {
      const W = ERX.Display.width, H = ERX.Display.height;
      this.drawDim(ctx, W, H);
      const p = this.panel(W, H);
      T.drawPanel(ctx, p.x, p.y, p.w, p.h);
      T.drawTitlePlate(ctx, p.x + p.w / 2, p.y - 10, 'SETTINGS');

      const inner = { x: p.x + 14, w: p.w - 28 };
      this.tabBar.setRect(inner.x + 10, p.y + 18, inner.w - 20, 14);

      const bottomY = p.y + p.h - 24;
      const hintY = bottomY - 24;
      const areaY = p.y + 40;
      const tab = this.tabBar.index;

      if (tab === 2) {
        F.draw(ctx, 'ACTION', inner.x + 8, areaY, { color: T.textMute });
        const kw = Math.min(78, Math.floor(inner.w * 0.27));
        F.draw(ctx, 'PRIMARY', inner.x + inner.w - 12 - kw * 1.5 - 6, areaY, { color: T.textMute, align: 'center' });
        F.draw(ctx, 'ALTERNATE', inner.x + inner.w - 6 - kw / 2, areaY, { color: T.textMute, align: 'center' });
      }

      const listY = tab === 2 ? areaY + 11 : areaY + 4;
      const rowH = tab === 2 ? 14 : 18;
      const rowStep = rowH + (tab === 2 ? 0 : 4);
      const areaH = hintY - 4 - listY;
      this._lastLayout = { rowH, rowStep, areaH };

      // content rows (clipped + scrolled for the controls list)
      const off = Math.round(this.scroll);
      this.content.forEach((w, i) => {
        if (w.compact) w.setRect(p.x + p.w / 2 - 60, listY + i * rowStep - off + 4, 120, 16);
        else w.setRect(inner.x, listY + i * rowStep - off, inner.w, rowH);
      });
      this.group.clip = { x: inner.x, y: listY, w: inner.w, h: areaH };

      ctx.save();
      ctx.beginPath();
      ctx.rect(inner.x - 12, listY - 1, inner.w + 24, areaH + 2);
      ctx.clip();
      const f = this.group.focused;
      for (const w of this.content) if (w.y + w.h > listY - 2 && w.y < listY + areaH + 2) w.render(ctx, w === f);
      ctx.restore();

      // scroll indicators
      const maxScroll = Math.max(0, this.content.length * rowStep - areaH);
      if (maxScroll > 0) {
        const bob = Math.round(Math.sin(this.time * 6));
        if (this.scroll > 1) F.draw(ctx, '↑', inner.x + inner.w + 4, listY + bob, { color: T.gold });
        if (this.scroll < maxScroll - 1) F.draw(ctx, '↓', inner.x + inner.w + 4, listY + areaH - 8 - bob, { color: T.gold });
      }

      const infoY = listY + this.content.length * rowStep + 10;
      if (tab === 0) {
        if (ERX.Audio.disabled) {
          F.draw(ctx, 'Your browser has no Web Audio. Enjoy the silence.', p.x + p.w / 2, infoY, { color: T.danger, align: 'center' });
        } else {
          const id = ERX.Audio.music.currentId || ERX.Audio.music.wanted;
          const track = id && ERX.MusicTracks[id];
          if (track) {
            const bob = Math.round(Math.sin(this.time * 5) * 1.5);
            const label = 'NOW PLAYING: {gold}' + track.title + '{/}';
            const lw = F.measure(label);
            F.draw(ctx, '♥', p.x + p.w / 2 - lw / 2 - 10, infoY + bob, { color: ERX.UITheme.elementCycle(this.time, 0.5) });
            F.draw(ctx, label, p.x + p.w / 2, infoY, { color: T.textDim, align: 'center' });
          }
        }
      }
      if (tab === 1) {
        const D = ERX.Display;
        F.draw(ctx, 'INTERNAL RESOLUTION: {cyan}' + D.width + 'x' + D.height + '{/}  PIXEL SCALE: {cyan}' + D.scale + 'x{/}', p.x + p.w / 2, infoY, { color: T.textMute, align: 'center' });
        if (S.get('video.lowDetail')) F.draw(ctx, '{green}LOW DETAIL ON:{/} the world is running on a budget.', p.x + p.w / 2, infoY + 12, { color: T.textDim, align: 'center' });
      }

      this.tabBar.render(ctx, this.tabBar === f);

      // hint / warning line
      T.rect(ctx, inner.x, hintY - 3, inner.w, 1, T.borderDark);
      let hint = f && f.hint ? f.hint : '';
      let hintColor = T.textDim;
      if (tab === 2) {
        const unbound = ERX.Keybinds.unboundActions();
        if (unbound.length && !(f instanceof KeybindRow && f.listeningSlot !== -1)) {
          hint = 'Heads up: ' + unbound.map((a) => a.label.toUpperCase()).join(', ') + (unbound.length > 1 ? ' have' : ' has') + ' no key. Future you will be confused.';
          hintColor = T.danger;
        }
      }
      const lines = F.wrap(hint, inner.w - 8);
      lines.slice(0, 2).forEach((l, i) => F.draw(ctx, l, p.x + p.w / 2, hintY + i * 10, { color: hintColor, align: 'center' }));

      // bottom buttons
      if (tab === 2) {
        this.resetBtn.visible = true;
        this.resetBtn.setRect(p.x + p.w / 2 - 98, bottomY, 100, 16);
        this.backBtn.setRect(p.x + p.w / 2 + 8, bottomY, 90, 16);
        this.resetBtn.render(ctx, this.resetBtn === f);
      } else {
        this.resetBtn.visible = false;
        this.backBtn.setRect(p.x + p.w / 2 - 45, bottomY, 90, 16);
      }
      this.backBtn.render(ctx, this.backBtn === f);
    }
  }

  ERX.Scenes.register('settings', SettingsScreen);
})(window.ERX = window.ERX || {});
