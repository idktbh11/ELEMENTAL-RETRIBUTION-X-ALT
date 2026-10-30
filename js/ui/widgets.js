/*
 * UI widgets + FocusGroup.
 *
 * Every widget works identically with mouse, keyboard and gamepad:
 *   - FocusGroup moves focus with up/down (and left/right neighbours),
 *     mouse hover focuses, clicks/confirm activate.
 *   - Widgets with a horizontal value (sliders, toggles, tabs, key slots)
 *     consume left/right themselves.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U;
  const T = ERX.UITheme;
  const F = ERX.Font;
  const sfx = (name, o) => ERX.Audio.playSfx(name, o);

  class Widget {
    constructor(o = {}) {
      this.x = 0; this.y = 0; this.w = 100; this.h = 16;
      this.focusable = true;
      this.visible = true;
      this.clickActivates = true;
      this.hint = '';
      this.hover = 0;
      this.press = 0;
      this.flash = 0;
      this.time = 0;
      this.held = false;
      Object.assign(this, o);
    }
    setRect(x, y, w, h) {
      this.x = Math.round(x); this.y = Math.round(y);
      if (w !== undefined) this.w = Math.round(w);
      if (h !== undefined) this.h = Math.round(h);
      return this;
    }
    contains(px, py) {
      return px >= this.x && py >= this.y && px < this.x + this.w && py < this.y + this.h;
    }
    update(dt, focused) {
      this.time += dt;
      this.hover = U.approach(this.hover, focused ? 1 : 0, 20, dt);
      this.press = U.approach(this.press, this.held && focused ? 1 : 0, 35, dt);
      this.flash = Math.max(0, this.flash - dt * 4);
    }
    onNav() { return false; }
    activate() {}
    onPointerDown() {}
    onPointerDrag() {}
    onPointerUp() {}
    render() {}
  }

  class Button extends Widget {
    constructor(o) {
      super(Object.assign({ label: 'BUTTON', icon: null, sound: 'select', onActivate: null, accent: null }, o));
    }
    activate() {
      if (this.disabled) { sfx('deny'); return; }
      this.flash = 1;
      if (this.sound) sfx(this.sound);
      if (this.onActivate) this.onActivate(this);
    }
    render(ctx, focused) {
      T.drawButton(ctx, this.x, this.y, this.w, this.h, this.label, {
        hover: this.hover, press: this.press, flash: this.flash, focused, time: this.time,
        icon: this.icon, accent: this.accent || T.elementCycle(this.time, 0.8), disabled: this.disabled,
      });
    }
  }

  /** Shared row background used by settings rows. */
  function drawRowBack(ctx, w, focused, accent) {
    if (w.hover < 0.05) return;
    const a = w.hover;
    ctx.fillStyle = 'rgba(80,100,200,' + (0.18 * a).toFixed(3) + ')';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    if (focused) {
      ctx.fillStyle = accent;
      ctx.fillRect(w.x, w.y, 2, w.h);
    }
  }

  class Slider extends Widget {
    constructor(o) {
      super(Object.assign({ label: 'SLIDER', min: 0, max: 100, step: 5, get: () => 0, set: () => {}, clickActivates: false }, o));
      this.dragging = false;
    }
    get value() { return this.get(); }
    _barRect() {
      const bx = this.x + Math.round(this.w * 0.42);
      const bw = this.x + this.w - 30 - bx;
      return { bx, by: this.y + Math.floor(this.h / 2) - 3, bw, bh: 7 };
    }
    _setValue(v, sound) {
      v = U.clamp(Math.round(v / this.step) * this.step, this.min, this.max);
      if (v !== this.value) {
        this.set(v);
        if (sound) sfx('tick', { value: v, minGap: 0.04 });
      }
    }
    onNav(dir) {
      const before = this.value;
      this._setValue(before + dir * this.step, true);
      if (this.value === before) sfx('deny', { minGap: 0.2 });
      return true;
    }
    activate() {
      // Confirm on a slider jumps between mute and the default value.
      this._setValue(this.value > this.min ? this.min : (this.defaultValue || 80), true);
    }
    _fromPointer(mx) {
      const { bx, bw } = this._barRect();
      this._setValue(this.min + ((mx - bx) / bw) * (this.max - this.min), true);
    }
    onPointerDown(mx) { this.dragging = true; this._fromPointer(mx); }
    onPointerDrag(mx) { if (this.dragging) this._fromPointer(mx); }
    onPointerUp() { this.dragging = false; }
    render(ctx, focused) {
      const accent = T.elementCycle(this.time, 0.6);
      drawRowBack(ctx, this, focused, accent);
      const ty = this.y + Math.floor((this.h - 7) / 2);
      F.draw(ctx, this.label, this.x + 8, ty, { color: focused ? T.gold : T.text, shadow: T.ink });

      const { bx, by, bw, bh } = this._barRect();
      const t = (this.value - this.min) / (this.max - this.min);
      const fillW = Math.round((bw - 4) * t);
      T.rect(ctx, bx, by, bw, bh, T.ink);
      T.rect(ctx, bx + 1, by + 1, bw - 2, bh - 2, '#0b0e22');
      // segmented fill
      const fillColor = focused ? accent : '#5a6ad0';
      for (let sx = 0; sx < fillW; sx++) {
        if ((sx % 4) === 3) continue;
        T.rect(ctx, bx + 2 + sx, by + 2, 1, bh - 4, fillColor);
      }
      T.rect(ctx, bx + 2, by + 2, fillW, 1, 'rgba(255,255,255,0.35)');
      // knob
      const kx = bx + 2 + fillW - 2;
      T.rect(ctx, kx, by - 2, 5, bh + 4, T.ink);
      T.rect(ctx, kx + 1, by - 1, 3, bh + 2, focused ? '#ffffff' : '#c8cff5');
      T.rect(ctx, kx + 1, by + bh, 3, 1, '#7a84b8');
      // value
      const label = this.value === 0 ? 'MUTE' : String(this.value);
      F.draw(ctx, label, this.x + this.w - 6, ty, { color: this.value === 0 ? T.danger : focused ? '#ffffff' : T.textDim, align: 'right', shadow: T.ink });
    }
  }

  class Toggle extends Widget {
    constructor(o) {
      super(Object.assign({ label: 'TOGGLE', get: () => false, set: () => {} }, o));
      this.knob = this.get() ? 1 : 0;
    }
    activate() {
      const v = !this.get();
      this.set(v);
      sfx(v ? 'toggleOn' : 'toggleOff');
    }
    onNav(dir) {
      const want = dir > 0;
      if (this.get() !== want) this.activate();
      return true;
    }
    update(dt, focused) {
      super.update(dt, focused);
      this.knob = U.approach(this.knob, this.get() ? 1 : 0, 25, dt);
    }
    render(ctx, focused) {
      const accent = T.elementCycle(this.time, 0.6);
      drawRowBack(ctx, this, focused, accent);
      const ty = this.y + Math.floor((this.h - 7) / 2);
      F.draw(ctx, this.label, this.x + 8, ty, { color: focused ? T.gold : T.text, shadow: T.ink });
      const on = this.get();
      const sw = 26, sh = 11;
      const sx = this.x + this.w - sw - 30, sy = this.y + Math.floor((this.h - sh) / 2);
      T.rect(ctx, sx + 1, sy, sw - 2, sh, T.ink);
      T.rect(ctx, sx, sy + 1, sw, sh - 2, T.ink);
      T.rect(ctx, sx + 1, sy + 1, sw - 2, sh - 2, on ? '#2f7a3a' : '#3a2030');
      T.rect(ctx, sx + 1, sy + 1, sw - 2, 1, on ? '#4fb85a' : '#5a3048');
      const kx = Math.round(sx + 1 + this.knob * (sw - 12));
      T.rect(ctx, kx, sy + 1, 10, sh - 2, T.ink);
      T.rect(ctx, kx + 1, sy + 1, 8, sh - 3, focused ? '#ffffff' : '#d0d6f5');
      T.rect(ctx, kx + 1, sy + sh - 3, 8, 1, '#7a84b8');
      F.draw(ctx, on ? 'ON' : 'OFF', this.x + this.w - 6, ty, { color: on ? T.good : T.danger, align: 'right', shadow: T.ink });
    }
  }

  class TabBar extends Widget {
    constructor(o) {
      super(Object.assign({ tabs: [], index: 0, onChange: null, clickActivates: false }, o));
      this.slide = this.index;
    }
    _tabRect(i) {
      const n = this.tabs.length;
      const tw = Math.floor((this.w - (n - 1) * 3) / n);
      return { x: this.x + i * (tw + 3), w: tw };
    }
    select(i, sound = true) {
      i = (i + this.tabs.length) % this.tabs.length;
      if (i === this.index) return;
      this.index = i;
      if (sound) sfx('tab');
      if (this.onChange) this.onChange(i);
    }
    onNav(dir) { this.select(this.index + dir); return true; }
    activate() { this.select(this.index + 1); }
    onPointerDown(mx) {
      for (let i = 0; i < this.tabs.length; i++) {
        const r = this._tabRect(i);
        if (mx >= r.x && mx < r.x + r.w) this.select(i);
      }
    }
    update(dt, focused) {
      super.update(dt, focused);
      this.slide = U.approach(this.slide, this.index, 22, dt);
    }
    render(ctx, focused) {
      const accent = T.elementCycle(this.time, 0.6);
      for (let i = 0; i < this.tabs.length; i++) {
        const r = this._tabRect(i);
        const active = i === this.index;
        const y = this.y + (active ? 0 : 2);
        const h = this.h - (active ? 0 : 2);
        T.rect(ctx, r.x + 1, y, r.w - 2, h, T.ink);
        T.rect(ctx, r.x, y + 1, r.w, h - 1, T.ink);
        T.rect(ctx, r.x + 1, y + 1, r.w - 2, h - 1, active ? (focused ? accent : T.borderLight) : T.borderDark);
        T.rect(ctx, r.x + 2, y + 2, r.w - 4, h - 2, active ? '#2a3470' : '#161b3a');
        F.draw(ctx, this.tabs[i], r.x + r.w / 2, y + Math.floor((h - 7) / 2) + 1, {
          color: active ? (focused ? T.gold : '#ffffff') : T.textMute, align: 'center', shadow: T.ink,
        });
      }
      // underline marker that slides between tabs
      const a = this._tabRect(Math.floor(this.slide)), b = this._tabRect(Math.min(this.tabs.length - 1, Math.ceil(this.slide)));
      const f = this.slide - Math.floor(this.slide);
      const ux = Math.round(U.lerp(a.x, b.x, f)) + 4;
      T.rect(ctx, ux, this.y + this.h, a.w - 8, 1, focused ? accent : T.border);
      if (focused) {
        const bob = Math.round(Math.sin(this.time * 8) * 1.5 + 1.5);
        T.drawArrow(ctx, this.x - 8 - bob, this.y + Math.floor(this.h / 2) - 3, 1, accent);
        T.drawArrow(ctx, this.x + this.w + 4 + bob, this.y + Math.floor(this.h / 2) - 3, -1, accent);
      }
    }
  }

  class KeybindRow extends Widget {
    constructor(o) {
      super(Object.assign({ action: null, slot: 0, listeningSlot: -1, onListen: null, highlight: 0 }, o));
    }
    _slotRect(i) {
      const kw = Math.min(78, Math.floor(this.w * 0.27));
      const x = this.x + this.w - 6 - (2 - i) * (kw + 6) + 6;
      return { x, y: this.y + Math.floor((this.h - 13) / 2), w: kw };
    }
    onNav(dir) {
      const s = U.clamp(this.slot + dir, 0, 1);
      if (s !== this.slot) { this.slot = s; sfx('move'); }
      return true;
    }
    activate() {
      if (this.onListen) this.onListen(this, this.slot);
    }
    onPointerDown(mx) {
      for (let i = 0; i < 2; i++) {
        const r = this._slotRect(i);
        if (mx >= r.x - 3 && mx < r.x + r.w + 3) this.slot = i;
      }
    }
    update(dt, focused) {
      super.update(dt, focused);
      this.highlight = Math.max(0, this.highlight - dt * 1.5);
    }
    render(ctx, focused) {
      const accent = T.elementCycle(this.time, 0.6);
      drawRowBack(ctx, this, focused, accent);
      if (this.highlight > 0) {
        ctx.fillStyle = 'rgba(255,211,77,' + (this.highlight * 0.25).toFixed(3) + ')';
        ctx.fillRect(this.x, this.y, this.w, this.h);
      }
      const b = ERX.Keybinds.get(this.action.id);
      const unbound = !b[0] && !b[1];
      F.draw(ctx, this.action.label, this.x + 8, this.y + Math.floor((this.h - 7) / 2), {
        color: unbound ? T.danger : focused ? T.gold : T.text, shadow: T.ink,
      });
      for (let i = 0; i < 2; i++) {
        const r = this._slotRect(i);
        const listening = this.listeningSlot === i;
        const blink = Math.floor(this.time * 3) % 2 === 0;
        const label = listening ? (blink ? 'PRESS KEY' : '') : ERX.Keybinds.codeLabel(b[i]);
        T.drawKeyCap(ctx, r.x, r.y, r.w, label, {
          focused: focused && this.slot === i, listening, empty: !b[i] && !listening, accent,
        });
      }
    }
  }

  class FocusGroup {
    constructor(o = {}) {
      this.widgets = [];
      this.index = 0;
      this.wrap = o.wrap !== false;
      this.pressTarget = null;
      this.clip = null; // optional {x,y,w,h}: widgets outside are not clickable
      this.onFocusChange = o.onFocusChange || null;
    }

    set(widgets, keepIndex = true) {
      this.widgets = widgets;
      if (!keepIndex) this.index = 0;
      this.index = U.clamp(this.index, 0, Math.max(0, widgets.length - 1));
      if (widgets.length && !widgets[this.index].focusable) this._step(1, false);
    }

    get focused() {
      return this.widgets[this.index] || null;
    }

    focus(widget, sound = false) {
      const i = this.widgets.indexOf(widget);
      if (i !== -1 && i !== this.index) {
        this.index = i;
        if (sound) sfx('hover');
        if (this.onFocusChange) this.onFocusChange(widget);
      }
    }

    _step(dir, sound) {
      const n = this.widgets.length;
      if (!n) return;
      let i = this.index;
      for (let k = 0; k < n; k++) {
        i += dir;
        if (i < 0 || i >= n) {
          if (!this.wrap) return;
          i = (i + n) % n;
        }
        const w = this.widgets[i];
        if (w.focusable && w.visible) {
          if (i !== this.index) {
            this.index = i;
            if (sound) sfx('move');
            if (this.onFocusChange) this.onFocusChange(w);
          }
          return;
        }
      }
    }

    _visible(w) {
      if (!w.visible) return false;
      const c = this.clip;
      if (!c) return true;
      return w.y + w.h > c.y && w.y < c.y + c.h;
    }

    hit(x, y) {
      if (this.clip && (y < this.clip.y || y >= this.clip.y + this.clip.h)) {
        // Allow hits on widgets outside the clip area (e.g. a fixed footer).
        for (const w of this.widgets) if (w.fixed && w.visible && w.contains(x, y)) return w;
        return null;
      }
      for (const w of this.widgets) if (w.focusable && this._visible(w) && w.contains(x, y)) return w;
      return null;
    }

    update(dt, input, active = true) {
      if (active) {
        const m = input.mouse;
        if (m.moved) {
          const w = this.hit(m.x, m.y);
          if (w) this.focus(w, true);
        }
        if (m.pressed[0]) {
          const w = this.hit(m.x, m.y);
          if (w) {
            this.focus(w, false);
            this.pressTarget = w;
            w.held = true;
            w.onPointerDown(m.x, m.y);
          }
        }
        if (this.pressTarget && m.down[0]) this.pressTarget.onPointerDrag(m.x, m.y);
        if (m.released[0] && this.pressTarget) {
          const w = this.pressTarget;
          this.pressTarget = null;
          w.held = false;
          w.onPointerUp(m.x, m.y);
          if (w.clickActivates && w.contains(m.x, m.y)) w.activate('mouse');
        }

        for (const a of input.actions) {
          const f = this.focused;
          if (a === 'up') this._step(-1, true);
          else if (a === 'down') this._step(1, true);
          else if ((a === 'left' || a === 'right') && f) {
            const dir = a === 'left' ? -1 : 1;
            if (!f.onNav(dir)) {
              const n = dir < 0 ? f.navLeft : f.navRight;
              if (n) { this.focus(n, false); sfx('move'); }
            }
          } else if (a === 'confirm' && f) {
            f.activate('key');
          }
        }
      } else if (this.pressTarget) {
        this.pressTarget.held = false;
        this.pressTarget = null;
      }
      for (const w of this.widgets) w.update(dt, active && w === this.focused);
    }

    render(ctx) {
      for (const w of this.widgets) if (w.visible) w.render(ctx, w === this.focused);
    }
  }

  ERX.UI = { Widget, Button, Slider, Toggle, TabBar, KeybindRow, FocusGroup };
})(window.ERX = window.ERX || {});
