/*
 * Gameplay engine pieces: tile physics, camera, pixel-art lighting and the
 * cutscene/script runner. Generic — any future level can reuse them.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U;

  // ============================================================ PHYSICS
  /**
   * Axis-separated movement against a tile level. Body: { x, y, w, h, vx, vy }
   * (x/y = top-left, pixels). Sets body.onGround / hitWall / hitCeiling.
   * One-way platforms only stop bodies falling onto them from above.
   */
  const EPS = 0.001; // positions are fractional; never use "-1px" tile maths

  const Physics = {
    overlapsSolid(level, x, y, w, h) {
      const TS = level.TS;
      const x0 = Math.floor(x / TS), x1 = Math.floor((x + w - EPS) / TS);
      const y0 = Math.floor(y / TS), y1 = Math.floor((y + h - EPS) / TS);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (level.isSolid(tx, ty)) return true;
      return false;
    },

    move(level, b, dt) {
      // a big step (a slow frame, a slam) is split up so nothing tunnels into the floor
      const n = Math.ceil(Math.max(Math.abs(b.vx), Math.abs(b.vy)) * dt / (level.TS * 0.5));
      if (!(n > 1)) return this.step(level, b, dt);
      let wall = false, ceil = false;
      for (let i = 0; i < n; i++) { this.step(level, b, dt / n); wall = wall || b.hitWall; ceil = ceil || b.hitCeiling; }
      b.hitWall = wall; b.hitCeiling = ceil;
    },

    step(level, b, dt) {
      const TS = level.TS;
      b.hitWall = false;
      b.hitCeiling = false;
      // --- horizontal ---
      b.x += b.vx * dt;
      if (this.overlapsSolid(level, b.x, b.y, b.w, b.h)) {
        if (b.vx > 0) b.x = Math.floor((b.x + b.w - EPS) / TS) * TS - b.w;
        else if (b.vx < 0) b.x = (Math.floor(b.x / TS) + 1) * TS;
        // safety: if still stuck (e.g. a gate closed on us), push out sideways
        let guard = 0;
        while (this.overlapsSolid(level, b.x, b.y, b.w, b.h) && guard++ < 32) b.x += b.vx >= 0 ? -1 : 1;
        b.vx = 0;
        b.hitWall = true;
      }
      // --- vertical ---
      const prevBottom = b.y + b.h;
      b.y += b.vy * dt;
      b.onGround = false;
      b.onPlatform = false;
      const x0 = Math.floor(b.x / TS), x1 = Math.floor((b.x + b.w - EPS) / TS);
      if (b.vy >= 0) {
        const ty = Math.floor((b.y + b.h - EPS) / TS);
        for (let tx = x0; tx <= x1; tx++) {
          const solid = level.isSolid(tx, ty);
          const plat = !solid && level.isPlatform(tx, ty) && prevBottom <= ty * TS + 0.01;
          if (solid || plat) {
            b.y = ty * TS - b.h;
            b.vy = 0;
            b.onGround = true;
            b.onPlatform = plat;
            break;
          }
        }
      } else {
        const ty = Math.floor(b.y / TS);
        for (let tx = x0; tx <= x1; tx++) {
          if (level.isSolid(tx, ty)) {
            b.y = (ty + 1) * TS;
            b.vy = 0;
            b.hitCeiling = true;
            break;
          }
        }
      }
      // standing still: probe one pixel below so onGround stays true
      if (!b.onGround && b.vy === 0) {
        const ty = Math.floor((b.y + b.h) / TS);
        for (let tx = x0; tx <= x1; tx++) {
          if (level.isSolid(tx, ty) || (level.isPlatform(tx, ty) && Math.abs(b.y + b.h - ty * TS) < 0.5)) { b.onGround = true; break; }
        }
      }
    },

    rectsOverlap(a, b) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    },
  };

  // ============================================================= CAMERA
  class Camera {
    constructor() {
      this.x = 0; this.y = 0;
      this.vw = 480; this.vh = 270;
      this.focus = null;     // { x, y } scripted focus point (cutscenes)
      this.look = 0;
    }
    setView(vw, vh) { this.vw = vw; this.vh = vh; }
    snap(tx, ty, level) {
      this.x = tx - this.vw / 2;
      this.y = ty - this.vh / 2;
      this.clamp(level);
    }
    update(dt, target, level) {
      let tx, ty, rate;
      if (this.focus) {
        tx = this.focus.x; ty = this.focus.y; rate = 3;
      } else {
        this.look = U.approach(this.look, target.facing * 28, 2.5, dt);
        tx = target.cx + this.look;
        ty = target.y - 10;
        rate = 6;
      }
      this.x = U.approach(this.x, tx - this.vw / 2, rate, dt);
      this.y = U.approach(this.y, ty - this.vh * 0.55, rate * 0.8, dt);
      this.clamp(level);
    }
    clamp(level) {
      this.x = U.clamp(this.x, 0, Math.max(0, level.pw - this.vw));
      // taller than the level (very tall windows): centre it vertically
      this.y = level.ph <= this.vh ? (level.ph - this.vh) / 2 : U.clamp(this.y, 0, level.ph - this.vh);
    }
    get ix() { return Math.round(this.x); }
    get iy() { return Math.round(this.y); }
  }

  // =========================================================== LIGHTING
  /**
   * Darkness overlay with dithered light pools punched out of it. The
   * falloff uses ordered dithering, so light stays crisp pixel art.
   */
  class Lighting {
    constructor() {
      this.canvas = ERX.makeCanvas(16, 16);
      this.ctx = this.canvas.getContext('2d');
      this.sprites = new Map();
      this.glows = new Map();
    }
    _sprite(r) {
      r = Math.max(4, Math.round(r / 4) * 4);
      let s = this.sprites.get(r);
      if (!s) {
        const b = new ERX.PixelBuffer(r * 2 + 1, r * 2 + 1);
        const white = ERX.Color.u32('#ffffff');
        for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
          const d = Math.sqrt(x * x + y * y) / r;
          if (d > 1) continue;
          const level = d < 0.45 ? 1 : 1 - Math.pow((d - 0.45) / 0.55, 1.2);
          if (level >= 1 || ERX.bayer(x + r, y + r) < level) b.set(x + r, y + r, white);
        }
        s = b.toCanvas();
        this.sprites.set(r, s);
      }
      return s;
    }
    _glow(r, color) {
      r = Math.max(4, Math.round(r / 4) * 4);
      const key = r + color;
      let s = this.glows.get(key);
      if (!s) {
        const b = new ERX.PixelBuffer(r * 2 + 1, r * 2 + 1);
        ERX.Paint.glow(b, r, r, r, color, 0.5, 1.6);
        s = b.toCanvas();
        this.glows.set(key, s);
      }
      return s;
    }
    /** lights: [{x, y, r, color, intensity}] in world pixels. */
    render(ctx, cam, vw, vh, darkness, lights) {
      if (darkness <= 0.01) return;
      if (this.canvas.width !== vw || this.canvas.height !== vh) {
        this.canvas.width = vw; this.canvas.height = vh;
        this.ctx.imageSmoothingEnabled = false;
      }
      const c = this.ctx;
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
      c.clearRect(0, 0, vw, vh);
      c.fillStyle = 'rgba(6,4,14,' + darkness.toFixed(3) + ')';
      c.fillRect(0, 0, vw, vh);
      c.globalCompositeOperation = 'destination-out';
      for (const l of lights) {
        const sx = l.x - cam.ix, sy = l.y - cam.iy;
        if (sx < -l.r || sy < -l.r || sx > vw + l.r || sy > vh + l.r) continue;
        const s = this._sprite(l.r);
        c.globalAlpha = l.intensity !== undefined ? l.intensity : 1;
        c.drawImage(s, Math.round(sx - s.width / 2), Math.round(sy - s.height / 2));
      }
      c.globalAlpha = 1;
      ctx.drawImage(this.canvas, 0, 0);
      // coloured glow on top (warm torches, cold crystals)
      ctx.globalCompositeOperation = 'lighter';
      for (const l of lights) {
        if (!l.color) continue;
        const sx = l.x - cam.ix, sy = l.y - cam.iy;
        if (sx < -l.r || sy < -l.r || sx > vw + l.r || sy > vh + l.r) continue;
        const g = this._glow(l.r * 0.7, l.color);
        ctx.globalAlpha = 0.18 * Math.min(1, darkness * 1.5 + 0.2) * (l.intensity !== undefined ? l.intensity : 1);
        ctx.drawImage(g, Math.round(sx - g.width / 2), Math.round(sy - g.height / 2));
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // ============================================================= SCRIPT
  /**
   * Runs a generator function as a cutscene. The generator yields:
   *   a number          -> wait that many seconds
   *   a function(dt)    -> wait until it returns something other than
   *                        undefined/false; that value is sent back in
   * `yield*` helpers (say / choose / task) are built on these.
   */
  class Script {
    constructor(genFn, ...args) {
      this.gen = genFn(...args);
      this.done = false;
      this.t = 0;
      this._next(undefined);
    }
    _next(value) {
      let r;
      try {
        r = this.gen.next(value);
      } catch (e) {
        console.error('[ERX] script error', e);
        this.done = true;
        return;
      }
      if (r.done) { this.done = true; this.result = r.value; return; }
      this.cur = r.value;
      this.t = 0;
    }
    update(dt) {
      if (this.done) return;
      this.t += dt;
      const c = this.cur;
      if (typeof c === 'number') {
        if (this.t >= c) this._next(undefined);
      } else if (typeof c === 'function') {
        const v = c(dt);
        if (v !== undefined && v !== false) this._next(v);
      } else {
        this._next(undefined);
      }
    }
  }

  ERX.GameEngine = { Physics, Camera, Lighting, Script };
})(window.ERX = window.ERX || {});
