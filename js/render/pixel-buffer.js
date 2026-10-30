/*
 * PixelBuffer — a raw 32-bit pixel surface used to procedurally paint
 * pixel art (no anti-aliasing, ever). Paint into it, then call toCanvas()
 * once and draw the resulting canvas every frame.
 *
 * All colour arguments are packed uint32 values (see ERX.Color.u32) or
 * '#rrggbb' strings (converted on the fly — slower, fine for setup code).
 */
(function (ERX) {
  'use strict';

  // 4x4 ordered-dither (Bayer) thresholds in 0..1.
  const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  // 8x8 Bayer for finer transitions (screen dissolves).
  const BAYER8 = (() => {
    const m = [
      0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
      12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
      3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
      15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
    ];
    return m.map((v) => (v + 0.5) / 64);
  })();

  ERX.bayer = (x, y) => BAYER4[((y & 3) << 2) | (x & 3)];
  ERX.bayer8 = (x, y) => BAYER8[((y & 7) << 3) | (x & 7)];

  const col = (c) => (typeof c === 'number' ? c : ERX.Color.u32(c));

  class PixelBuffer {
    constructor(w, h) {
      this.w = Math.max(1, w | 0);
      this.h = Math.max(1, h | 0);
      this.data = new Uint32Array(this.w * this.h);
    }

    set(x, y, c) {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      this.data[y * this.w + x] = c;
    }

    get(x, y) {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
      return this.data[y * this.w + x];
    }

    /** True if the pixel is non-transparent. */
    solid(x, y) {
      return (this.get(x, y) >>> 24) !== 0;
    }

    fill(c) {
      this.data.fill(col(c));
    }

    rect(x, y, w, h, c) {
      c = col(c);
      const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0);
      const x1 = Math.min(this.w, (x + w) | 0), y1 = Math.min(this.h, (y + h) | 0);
      for (let yy = y0; yy < y1; yy++) {
        const row = yy * this.w;
        for (let xx = x0; xx < x1; xx++) this.data[row + xx] = c;
      }
    }

    hline(x0, x1, y, c) {
      c = col(c);
      y |= 0;
      if (y < 0 || y >= this.h) return;
      if (x0 > x1) { const t = x0; x0 = x1; x1 = t; }
      x0 = Math.max(0, x0 | 0); x1 = Math.min(this.w - 1, x1 | 0);
      const row = y * this.w;
      for (let x = x0; x <= x1; x++) this.data[row + x] = c;
    }

    vline(x, y0, y1, c) {
      c = col(c);
      for (let y = Math.min(y0, y1) | 0; y <= Math.max(y0, y1); y++) this.set(x, y, c);
    }

    /** Filled pixel-art circle (slightly fattened so small circles look round). */
    circle(cx, cy, r, c) {
      c = col(c);
      cx = Math.round(cx); cy = Math.round(cy);
      const rr = (r + 0.5) * (r + 0.5);
      const ri = Math.ceil(r);
      for (let dy = -ri; dy <= ri; dy++) {
        const span = Math.floor(Math.sqrt(Math.max(0, rr - dy * dy)));
        if (rr - dy * dy < 0) continue;
        this.hline(cx - span, cx + span, cy + dy, c);
      }
    }

    ellipse(cx, cy, rx, ry, c) {
      c = col(c);
      cx = Math.round(cx); cy = Math.round(cy);
      const ryi = Math.ceil(ry);
      for (let dy = -ryi; dy <= ryi; dy++) {
        const t = 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5));
        if (t < 0) continue;
        const span = Math.floor((rx + 0.5) * Math.sqrt(t));
        this.hline(cx - span, cx + span, cy + dy, c);
      }
    }

    /** Set pixel only where the ordered-dither threshold is below `level`. */
    dither(x, y, c, level) {
      if (ERX.bayer(x, y) < level) this.set(x, y, c);
    }

    ditherRect(x, y, w, h, c, level) {
      c = col(c);
      for (let yy = y | 0; yy < y + h; yy++)
        for (let xx = x | 0; xx < x + w; xx++) if (ERX.bayer(xx, yy) < level) this.set(xx, yy, c);
    }

    ditherCircle(cx, cy, r, c, level) {
      c = col(c);
      cx = Math.round(cx); cy = Math.round(cy);
      const rr = (r + 0.5) * (r + 0.5);
      const ri = Math.ceil(r);
      for (let dy = -ri; dy <= ri; dy++) {
        if (rr - dy * dy < 0) continue;
        const span = Math.floor(Math.sqrt(rr - dy * dy));
        for (let dx = -span; dx <= span; dx++) {
          if (ERX.bayer(cx + dx, cy + dy) < level) this.set(cx + dx, cy + dy, c);
        }
      }
    }

    line(x0, y0, x1, y1, c) {
      c = col(c);
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        this.set(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }

    /** Thick line made of stamped circles, radius can taper from r0 to r1. */
    thickLine(x0, y0, x1, y1, r0, r1, c) {
      const len = Math.hypot(x1 - x0, y1 - y0);
      const steps = Math.max(1, Math.ceil(len));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        this.circle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t, c);
      }
    }

    /** Adds a 1px outline (4-neighbourhood) around every opaque pixel. */
    outline(c, diagonal = false) {
      c = col(c);
      const src = this.data.slice();
      const w = this.w, h = this.h;
      const isSolid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && (src[y * w + x] >>> 24) !== 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (isSolid(x, y)) continue;
          let n = isSolid(x - 1, y) || isSolid(x + 1, y) || isSolid(x, y - 1) || isSolid(x, y + 1);
          if (!n && diagonal) n = isSolid(x - 1, y - 1) || isSolid(x + 1, y - 1) || isSolid(x - 1, y + 1) || isSolid(x + 1, y + 1);
          if (n) this.data[y * w + x] = c;
        }
      }
    }

    /** Copy opaque pixels of another buffer onto this one. */
    blit(src, dx, dy) {
      for (let y = 0; y < src.h; y++) {
        for (let x = 0; x < src.w; x++) {
          const v = src.data[y * src.w + x];
          if ((v >>> 24) !== 0) this.set(dx + x, dy + y, v);
        }
      }
    }

    toCanvas() {
      const cv = document.createElement('canvas');
      cv.width = this.w;
      cv.height = this.h;
      const ctx = cv.getContext('2d');
      const img = ctx.createImageData(this.w, this.h);
      new Uint32Array(img.data.buffer).set(this.data);
      ctx.putImageData(img, 0, 0);
      return cv;
    }
  }

  PixelBuffer.col = col;
  ERX.PixelBuffer = PixelBuffer;

  /** Create a blank canvas of the given size. */
  ERX.makeCanvas = function (w, h) {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, w | 0);
    cv.height = Math.max(1, h | 0);
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return cv;
  };
})(window.ERX = window.ERX || {});
