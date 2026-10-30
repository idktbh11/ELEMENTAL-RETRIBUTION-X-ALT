/*
 * Dialogue box: typewriter text with voice blips, per-character effects
 * (wave / shake), player choices, and INTERRUPTS — a choice that pops up
 * while someone is still talking, so you can cut them off.
 *
 *   dlg.say(speaker, text, { effect, interrupt: { label, alt, at } })
 *   dlg.choose([labels])
 *   dlg.result -> undefined while busy; then true | choice index | 'interrupt'
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, F = ERX.Font, T = ERX.UITheme;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);

  /** Replace {actionId} with the player's current key, e.g. {jump} -> [SPACE]. */
  function keyText(text) {
    return text.replace(/\{(\w+)\}/g, (m, id) => {
      if (ERX.Keybinds.action(id)) return '[' + (ERX.Touch && ERX.Touch.enabled && ERX.Touch.label(id) || ERX.Keybinds.label(id, 0)) + ']';
      return m;
    });
  }

  class Dialogue {
    constructor(o = {}) {
      this.position = o.position || 'bottom'; // 'top' keeps the action visible in gameplay
      this.active = false;
      this.result = undefined;
      this.t = 0;
    }

    say(speaker, text, o = {}) {
      this.active = true;
      this.mode = 'say';
      this.speaker = speaker;
      this.text = keyText(text);
      this.plain = F.strip(this.text);
      this.shown = 0;
      this.effect = o.effect !== undefined ? o.effect : speaker.effect || null;
      this.textColor = o.textColor || speaker.textColor || null;
      this.interrupt = o.interrupt ? Object.assign({ visible: false, index: 0, timer: 0 }, o.interrupt) : null;
      this.choices = null;
      this.result = undefined;
      this.blipT = 0;
      this.doneT = 0;
      this.speed = o.speed || speaker.speed || 38;
    }

    choose(labels, o = {}) {
      this.active = true;
      this.mode = 'choose';
      this.choices = labels.map((l) => keyText(l));
      this.choiceIndex = 0;
      this.choiceT = 0;
      this.result = undefined;
      this.prompt = o.prompt || null;
    }

    close() {
      this.active = false;
      this.choices = null;
      this.interrupt = null;
    }

    get typing() { return this.mode === 'say' && this.shown < this.plain.length; }

    update(dt, input) {
      if (!this.active) return;
      this.t += dt;
      if (this.mode === 'say') {
        if (this.shown < this.plain.length) {
          const before = Math.floor(this.shown);
          // pause briefly on punctuation for natural rhythm
          const ch = this.plain[before] || '';
          const slow = '.!?'.indexOf(ch) !== -1 ? 0.25 : ch === ',' ? 0.5 : 1;
          this.shown = Math.min(this.plain.length, this.shown + dt * this.speed * slow);
          const after = Math.floor(this.shown);
          if (after > before && this.speaker.voice) {
            this.blipT -= after - before;
            if (this.blipT <= 0 && this.plain[after - 1] !== ' ') {
              this.blipT = 2;
              sfx(this.effect === 'shake' ? 'voiceAngry' : this.speaker.voice, { pitch: this.speaker.pitch || 1, minGap: 0.03 });
            }
          }
        } else {
          this.doneT += dt;
        }
        const iv = this.interrupt;
        if (iv) {
          if (!iv.visible && this.shown / this.plain.length >= iv.at) { iv.visible = true; sfx('tab'); }
          if (iv.visible) {
            iv.timer += dt;
            for (const a of input.actions) {
              if (a === 'up' || a === 'down') { iv.index = 1 - iv.index; sfx('move'); }
            }
            const m = input.mouse;
            const hit = this._choiceHit(m.x, m.y);
            if (m.moved && hit !== -1 && hit !== iv.index) { iv.index = hit; sfx('hover'); }
            if (input.hasAction('confirm') || (m.pressed[0] && hit !== -1)) {
              if (m.pressed[0] && hit !== -1) iv.index = hit;
              sfx('select');
              if (iv.index === 0) { this.result = 'interrupt'; this.close(); return; }
              iv.visible = false; this.interrupt = null; // let them finish
              return;
            }
            // nobody interrupted in time: they finish talking
            if (!this.typing && this.doneT > 1.6) { this.interrupt = null; }
          }
          if (this.interrupt) return;
        }
        if (input.hasAction('confirm') || input.mouse.pressed[0]) {
          if (this.typing) { this.shown = this.plain.length; }
          else { sfx('move'); this.result = true; this.close(); }
        }
      } else if (this.mode === 'choose') {
        this.choiceT += dt;
        const n = this.choices.length;
        for (const a of input.actions) {
          if (a === 'up') { this.choiceIndex = (this.choiceIndex - 1 + n) % n; sfx('move'); }
          if (a === 'down') { this.choiceIndex = (this.choiceIndex + 1) % n; sfx('move'); }
        }
        const m = input.mouse;
        const hit = this._choiceHit(m.x, m.y);
        if (m.moved && hit !== -1 && hit !== this.choiceIndex) { this.choiceIndex = hit; sfx('hover'); }
        if (this.choiceT > 0.25 && (input.hasAction('confirm') || (m.pressed[0] && hit !== -1))) {
          if (m.pressed[0] && hit !== -1) this.choiceIndex = hit;
          sfx('select');
          this.result = this.choiceIndex;
          this.close();
        }
      }
    }

    _choiceHit(mx, my) {
      if (!this._choiceRects) return -1;
      for (let i = 0; i < this._choiceRects.length; i++) {
        const r = this._choiceRects[i];
        if (mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h) return i;
      }
      return -1;
    }

    _box(W, H) {
      const w = Math.min(W - 16, 440), h = 58;
      const y = this.position === 'top' ? 48 : H - h - 8;
      return { x: Math.round(W / 2 - w / 2), y, w, h };
    }

    render(ctx, W, H) {
      if (!this.active) { this._choiceRects = null; return; }
      const b = this._box(W, H);
      if (this.mode === 'say') {
        this._drawBox(ctx, b);
        // name plate
        const name = this.speaker.name;
        const nw = F.measure(name) + 14;
        T.rect(ctx, b.x + 8, b.y - 9, nw, 12, T.ink);
        T.rect(ctx, b.x + 9, b.y - 8, nw - 2, 10, this.speaker.plate || '#3a2a5a');
        F.draw(ctx, name, b.x + 15, b.y - 7, { color: this.speaker.color || '#ffffff', shadow: T.ink });
        this._drawText(ctx, b);
        if (!this.typing && !this.interrupt && Math.floor(this.t * 3) % 2 === 0) F.draw(ctx, '↓', b.x + b.w - 12, b.y + b.h - 12, { color: T.gold });
        if (this.interrupt && this.interrupt.visible) {
          const iv = this.interrupt;
          this._drawChoices(ctx, W, b, [iv.label, iv.alt || '(Let them finish.)'], iv.index, true);
        }
      } else {
        this._drawChoices(ctx, W, b, this.choices, this.choiceIndex, false);
      }
    }

    _drawBox(ctx, b) {
      T.drawPanel(ctx, b.x, b.y, b.w, b.h, { accent: this.speaker && this.speaker.color });
    }

    _drawText(ctx, b) {
      const lines = F.wrap(this.text, b.w - 24);
      let count = Math.floor(this.shown);
      let y = b.y + 10;
      for (const line of lines) {
        const plain = F.strip(line);
        const n = Math.min(plain.length, count);
        count -= plain.length + 1; // +1 for the space eaten by wrapping
        if (n <= 0 && count < 0) break;
        if (!this.effect) {
          // draw the visible part, keeping colour markup
          F.draw(ctx, this._sliceMarked(line, n), b.x + 12, y, { color: this.textColor || T.text });
        } else {
          let x = b.x + 12;
          for (let i = 0; i < n; i++) {
            const ch = plain[i];
            let dx = 0, dy = 0;
            if (this.effect === 'wave') dy = Math.round(Math.sin(this.t * 7 + i * 0.6) * 1.2);
            if (this.effect === 'shake') { dx = Math.round((Math.random() - 0.5) * 2); dy = Math.round((Math.random() - 0.5) * 2); }
            F.draw(ctx, ch, x + dx, y + dy, { color: this.effect === 'shake' && !this.textColor ? '#ff8a6a' : this.textColor || T.text, shadow: this.textColor ? '#0a2a2a' : null });
            x += F.measure(ch + 'a') - F.measure('a');
          }
        }
        y += 10;
        if (y > b.y + b.h - 10) break;
      }
    }

    /** First n visible characters of a marked-up line (tags preserved). */
    _sliceMarked(line, n) {
      let out = '', vis = 0;
      const re = /\{(\/|[a-z]+)\}/g;
      let last = 0, m;
      while ((m = re.exec(line))) {
        const seg = line.slice(last, m.index);
        const take = Math.min(seg.length, n - vis);
        out += seg.slice(0, take);
        vis += take;
        if (vis >= n) return out;
        out += m[0];
        last = re.lastIndex;
      }
      return out + line.slice(last, last + (n - vis));
    }

    _drawChoices(ctx, W, b, labels, index, isInterrupt) {
      const lw = Math.min(W - 24, Math.max.apply(null, labels.map((l) => F.measure(l))) + 30);
      const lh = 13;
      const h = labels.length * lh + 10 + (isInterrupt ? 10 : 0);
      const x = Math.round(b.x + b.w - lw);
      const y = this.position === 'top'
        ? Math.round(b.y + (this.mode === 'say' ? b.h + 6 : 0))
        : Math.round(b.y - h - (this.mode === 'say' ? 14 : 4));
      T.drawPanel(ctx, x, y, lw, h, { accent: isInterrupt ? T.danger : T.gold });
      let yy = y + 6;
      if (isInterrupt) {
        const timeLeft = this.typing ? 1 : Math.max(0, 1 - this.doneT / 1.6);
        F.draw(ctx, 'INTERRUPT?', x + 8, yy, { color: T.danger });
        T.rect(ctx, x + 64, yy + 2, Math.round((lw - 74) * timeLeft), 3, T.danger);
        yy += 10;
      }
      this._choiceRects = [];
      labels.forEach((l, i) => {
        const sel = i === index;
        this._choiceRects.push({ x: x + 4, y: yy - 2, w: lw - 8, h: lh });
        if (sel) T.rect(ctx, x + 4, yy - 2, lw - 8, lh - 1, 'rgba(255,211,77,0.15)');
        if (sel) T.drawArrow(ctx, x + 7 + Math.round(Math.sin(this.t * 8)), yy, 1, T.gold);
        F.draw(ctx, l, x + 16, yy + 1, { color: sel ? T.gold : T.text, shadow: T.ink });
        yy += lh;
      });
    }
  }

  ERX.Dialogue = Dialogue;
  ERX.keyText = keyText;
})(window.ERX = window.ERX || {});
