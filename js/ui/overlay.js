/*
 * Global overlay systems: toast messages, pixel mouse cursor, screen shake
 * and the FPS counter.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U;
  const F = ERX.Font;

  // ------------------------------------------------------------ Toasts
  const Toast = {
    items: [],

    show(text, o = {}) {
      // Don't stack identical messages.
      const dup = this.items.find((i) => i.text === text && i.t < i.dur - 0.4);
      if (dup) { dup.t = Math.min(dup.t, 0.3); return; }
      this.items.push({ text, color: o.color || '#ffffff', t: 0, dur: o.duration || 3 });
      if (this.items.length > 3) this.items.shift();
    },

    update(dt) {
      for (const it of this.items) it.t += dt;
      this.items = this.items.filter((it) => it.t < it.dur);
    },

    render(ctx, W, H) {
      let y = H - 36;
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        const lines = F.wrap(it.text, Math.min(W - 48, 300));
        const w = Math.max.apply(null, lines.map((l) => F.measure(l))) + 16;
        const h = lines.length * 10 + 8;
        const appear = U.ease.outBack(U.clamp(it.t / 0.25, 0, 1));
        const fade = U.clamp((it.dur - it.t) / 0.35, 0, 1);
        const x = Math.round(W / 2 - w / 2);
        const yy = Math.round(y - h + (1 - appear) * 12);
        ctx.globalAlpha = fade;
        ctx.fillStyle = '#07080f';
        ctx.fillRect(x + 1, yy, w - 2, h);
        ctx.fillRect(x, yy + 1, w, h - 2);
        ctx.fillStyle = '#2a2350';
        ctx.fillRect(x + 1, yy + 1, w - 2, h - 2);
        ctx.fillStyle = it.color;
        ctx.fillRect(x + 1, yy + 1, 2, h - 2);
        ctx.fillStyle = '#3c3470';
        ctx.fillRect(x + 3, yy + 1, w - 4, 1);
        lines.forEach((l, li) => F.draw(ctx, l, x + 9, yy + 5 + li * 10, { color: it.color, shadow: '#07080f' }));
        ctx.globalAlpha = 1;
        y = yy - 4;
      }
    },
  };

  // ------------------------------------------------------------ Cursor
  const Cursor = {
    idle: 0,
    update(dt, input) {
      if (input.mouse.moved) this.idle = 0;
      else this.idle += dt;
    },
    render(ctx, input) {
      const m = input.mouse;
      if (!m.present || input.lastDevice !== 'mouse' || this.idle > 4) return;
      const press = m.down[0] ? 1 : 0;
      ctx.drawImage(ERX.Sprites.cursor, Math.floor(m.x), Math.floor(m.y) + press);
    },
  };

  // ------------------------------------------------------- Screen shake
  const FX = {
    amp: 0,
    time: 0,
    duration: 0,
    x: 0,
    y: 0,
    shake(amp = 2, duration = 0.25) {
      if (!ERX.Settings.get('video.screenShake')) return;
      this.amp = Math.max(this.amp, amp);
      this.duration = Math.max(this.duration - this.time, duration);
      this.time = 0;
    },
    update(dt) {
      if (this.amp <= 0) { this.x = this.y = 0; return; }
      this.time += dt;
      const k = 1 - this.time / this.duration;
      if (k <= 0) { this.amp = 0; this.x = this.y = 0; return; }
      const a = this.amp * k;
      this.x = Math.round((Math.random() * 2 - 1) * a);
      this.y = Math.round((Math.random() * 2 - 1) * a);
    },
  };

  // ------------------------------------------------------- FPS counter
  const Fps = {
    frames: 0, acc: 0, value: 60,
    update(dt) {
      this.frames++;
      this.acc += dt;
      if (this.acc >= 0.5) {
        this.value = Math.round(this.frames / this.acc);
        this.frames = 0;
        this.acc = 0;
      }
    },
    render(ctx) {
      if (!ERX.Settings.get('video.showFps')) return;
      const txt = this.value + ' FPS' + (ERX.Settings.get('video.lowDetail') ? '  LOW DETAIL' : '');
      const w = F.measure(txt) + 6;
      ctx.fillStyle = 'rgba(7,8,15,0.7)';
      ctx.fillRect(2, 2, w, 11);
      F.draw(ctx, txt, 5, 4, { color: this.value >= 50 ? '#72e05a' : this.value >= 30 ? '#ffd34d' : '#ff6a4f' });
    },
  };

  ERX.Toast = Toast;
  ERX.Cursor = Cursor;
  ERX.FX = FX;
  ERX.Fps = Fps;
})(window.ERX = window.ERX || {});
