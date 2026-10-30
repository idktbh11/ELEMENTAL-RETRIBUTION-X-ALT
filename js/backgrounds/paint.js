/*
 * Procedural pixel-art painters shared by every menu environment:
 * dithered skies, glows, clouds, mountains, hills, trees, plus small
 * animated systems (particles, grass, birds).
 *
 * Painters write into PixelBuffers, so every result is genuine
 * hard-edged pixel art with limited palettes and ordered dithering.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U;
  const C = ERX.Color;
  const PB = ERX.PixelBuffer;
  const c32 = (h) => (typeof h === 'number' ? h : C.u32(h));

  const Paint = {};

  /**
   * Vertical banded gradient. stops: [[t0,'#hex'], [t1,'#hex'], ...].
   * `soft` = fraction of each band used for the dithered transition.
   */
  Paint.gradient = function (buf, stops, y0 = 0, y1 = buf.h, soft = 0.5) {
    const cols = stops.map((s) => c32(s[1]));
    for (let y = Math.max(0, y0); y < Math.min(buf.h, y1); y++) {
      const t = (y - y0) / Math.max(1, y1 - y0 - 1);
      let i = 0;
      while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
      const a = stops[i][0], b = stops[i + 1][0];
      let f = U.clamp((t - a) / Math.max(0.0001, b - a), 0, 1);
      f = U.clamp((f - 0.5) / Math.max(0.001, soft) + 0.5, 0, 1);
      const ca = cols[i], cb = cols[i + 1];
      const row = y * buf.w;
      for (let x = 0; x < buf.w; x++) buf.data[row + x] = ERX.bayer(x, y) < f ? cb : ca;
    }
  };

  /** Dithered radial glow of a single colour. */
  Paint.glow = function (buf, cx, cy, r, color, maxLevel = 1, power = 1.5) {
    const c = c32(color);
    const ri = Math.ceil(r);
    for (let y = -ri; y <= ri; y++) {
      for (let x = -ri; x <= ri; x++) {
        const d = Math.sqrt(x * x + y * y) / r;
        if (d >= 1) continue;
        const level = maxLevel * Math.pow(1 - d, power);
        if (ERX.bayer(cx + x, cy + y) < level) buf.set(cx + x, cy + y, c);
      }
    }
  };

  /**
   * Puffy cumulus cloud sprite.
   * pal: { hi, mid, lo, deep } ; returns PixelBuffer.
   */
  Paint.cloud = function (rng, w, h, pal) {
    const buf = new PB(w, h);
    const base = h - 2;
    const n = Math.max(3, Math.round(w / 11));
    const blobs = [];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const bell = Math.sin(t * Math.PI);
      const r = Math.max(2, (h * 0.2 + bell * h * 0.3) * rng.range(0.75, 1.1));
      const cx = U.clamp(t * w + rng.range(-2, 2), r, w - r - 1);
      const cy = base - r * 0.55 - bell * h * 0.1;
      blobs.push({ cx, cy, r });
    }
    const lo = c32(pal.lo), mid = c32(pal.mid), hi = c32(pal.hi);
    for (const b of blobs) buf.circle(b.cx, b.cy, b.r, lo);
    for (const b of blobs) buf.circle(b.cx - 1, b.cy - 2, b.r - 1, mid);
    for (const b of blobs) if (b.r > 3) buf.circle(b.cx - b.r * 0.25, b.cy - b.r * 0.45, b.r * 0.5, hi);
    // flat underside with darker belly
    for (let y = base + 1; y < h; y++) for (let x = 0; x < w; x++) buf.set(x, y, 0);
    if (pal.deep) {
      const deep = c32(pal.deep);
      for (let x = 0; x < w; x++) {
        if (buf.solid(x, base)) buf.set(x, base, deep);
        if (buf.solid(x, base - 1) && ERX.bayer(x, base - 1) < 0.5) buf.set(x, base - 1, deep);
      }
    }
    return buf;
  };

  /**
   * Long, thin sunset cloud lit from below. pal: { hi, mid, lo }.
   */
  Paint.streakCloud = function (rng, w, h, pal) {
    const buf = new PB(w, h);
    const n = Math.max(3, Math.round(w / 14));
    const parts = [];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const bell = Math.sin(t * Math.PI);
      parts.push({ x: t * w, y: h * 0.5 + rng.range(-1, 1), rx: w / n + rng.range(2, 6), ry: Math.max(1.5, (h * 0.25 + bell * h * 0.2) * rng.range(0.8, 1.1)) });
    }
    for (const q of parts) buf.ellipse(q.x, q.y, q.rx, q.ry, c32(pal.lo));
    for (const q of parts) buf.ellipse(q.x + 1, q.y + 1, q.rx - 2, q.ry - 1, c32(pal.mid));
    for (const q of parts) buf.ellipse(q.x + 2, q.y + q.ry * 0.6, q.rx * 0.6, Math.max(1, q.ry * 0.35), c32(pal.hi));
    return buf;
  };

  /**
   * Horizontally tileable cloud bank (a "sea of clouds").
   * Returns a canvas of width w that wraps seamlessly.
   */
  Paint.cloudBank = function (rng, w, h, pal, o = {}) {
    const buf = new PB(w, h);
    const top = o.top !== undefined ? o.top : Math.round(h * 0.35);
    const rMin = o.rMin || 6, rMax = o.rMax || 14;
    const lo = c32(pal.lo), mid = c32(pal.mid), hi = c32(pal.hi);
    const blobs = [];
    let x = 0;
    while (x < w) {
      const r = rng.range(rMin, rMax);
      blobs.push({ x, y: top + rMax - r * rng.range(0.6, 1.0), r });
      x += r * rng.range(0.9, 1.5);
    }
    const stamp = (b, dx, dy, dr, col) => {
      for (const off of [-w, 0, w]) buf.circle(b.x + off + dx, b.y + dy, b.r + dr, col);
    };
    for (const b of blobs) stamp(b, 0, 0, 0, lo);
    buf.rect(0, top + rMax, w, h, lo);
    for (const b of blobs) stamp(b, -1, -2, -1, mid);
    for (const b of blobs) if (b.r > 4) stamp(b, -b.r * 0.2, -b.r * 0.45, -b.r * 0.5, hi);
    // body below the bumps: mid fading into lo (and deep) with dithering
    const bodyTop = top + rMax + 2;
    for (let y = bodyTop; y < h; y++) {
      const f = (y - bodyTop) / Math.max(1, h - bodyTop);
      for (let xx = 0; xx < w; xx++) {
        if (!buf.solid(xx, y)) continue;
        if (pal.deep && ERX.bayer(xx, y) < f * 1.2 - 0.2) buf.set(xx, y, c32(pal.deep));
        else if (ERX.bayer(xx, y) < 0.5 - f) buf.set(xx, y, mid);
        else buf.set(xx, y, lo);
      }
    }
    return buf.toCanvas();
  };

  /**
   * Mountain range with lit/shadow faces, snow caps and atmospheric fade.
   * o: { peaks, minH, maxH, rock:[lit,shade,detail], snow:[lit,shade] | null,
   *      snowLine (absolute height from bottom), rim, fade:{color,start,end},
   *      lean, jag, seed }
   * Returns { canvas, top: Int16Array }.
   */
  Paint.mountains = function (rng, w, h, o) {
    const noise = new U.Noise(rng.int(1, 1e9));
    const heights = new Float32Array(w);
    const peaks = [];
    const n = o.peaks || 4;
    for (let i = 0; i < n; i++) {
      peaks.push({
        x: ((i + rng.range(0.15, 0.85)) / n) * w,
        h: rng.range(o.minH, o.maxH),
        sl: rng.range(0.55, 1.15) * (o.slope || 1),
        sr: rng.range(0.55, 1.15) * (o.slope || 1),
      });
    }
    if (o.extraPeaks) for (const p of o.extraPeaks) peaks.push(p);
    const jag = o.jag !== undefined ? o.jag : 1;
    for (let x = 0; x < w; x++) {
      let best = 0;
      for (const p of peaks) {
        const dx = x - p.x;
        const v = p.h - Math.abs(dx) * (dx < 0 ? p.sl : p.sr);
        if (v > best) best = v;
      }
      best += (noise.fbm1(x * 0.06, 3) - 0.5) * 10 * jag + (noise.n1(x * 0.4) - 0.5) * 3 * jag;
      heights[x] = Math.max(0, best);
    }
    const top = new Int16Array(w);
    for (let x = 0; x < w; x++) top[x] = Math.round(h - heights[x]);
    // smoothed slope for face lighting
    const slope = new Float32Array(w);
    for (let x = 0; x < w; x++) {
      const a = top[Math.max(0, x - 3)], b = top[Math.min(w - 1, x + 3)];
      slope[x] = b - a;
    }
    const buf = new PB(w, h);
    const lit = c32(o.rock[0]), shade = c32(o.rock[1]), detail = c32(o.rock[2] || o.rock[1]);
    const snowLit = o.snow ? c32(o.snow[0]) : 0, snowShade = o.snow ? c32(o.snow[1]) : 0;
    const rim = o.rim ? c32(o.rim) : 0;
    const fade = o.fade ? c32(o.fade.color) : 0;
    const lean = o.lean !== undefined ? o.lean : 0.55;
    const snowY = o.snow ? h - o.snowLine : -1;

    for (let x = 0; x < w; x++) {
      for (let y = Math.max(0, top[x]); y < h; y++) {
        const depth = y - top[x];
        const sx = U.clamp(Math.round(x - depth * lean + (noise.n2(x * 0.15, y * 0.15) - 0.5) * 6), 0, w - 1);
        const isLit = slope[sx] < 0 || (slope[sx] === 0 && x < w / 2);
        let col = isLit ? lit : shade;
        const tex = noise.n2(x * 0.25, y * 0.5);
        if (tex > 0.68) col = detail;
        if (o.snow) {
          const sn = snowY + (noise.n2(x * 0.12, y * 0.05) - 0.5) * 16 + depth * 0.15;
          const streak = noise.n2(x * 0.35, y * 0.09) > 0.72 && y < snowY + 10 && y > snowY - 20;
          if (y < sn || streak) col = isLit ? snowLit : snowShade;
        }
        if (rim && depth === 0 && isLit) col = rim;
        if (o.fade) {
          const f = (y - o.fade.start) / Math.max(1, o.fade.end - o.fade.start);
          if (f > 0 && ERX.bayer(x, y) < f) col = fade;
        }
        buf.data[y * w + x] = col;
      }
    }
    return { canvas: buf.toCanvas(), top, buf };
  };

  /**
   * Rolling hills silhouette. Returns { canvas, top }.
   * o: { base, amp, freq, colors:[top, body, dark], detailColor, seed }
   */
  Paint.hills = function (rng, w, h, o) {
    const noise = new U.Noise(rng.int(1, 1e9));
    const buf = new PB(w, h);
    const top = new Int16Array(w);
    const [cTop, cBody, cDark] = o.colors.map(c32);
    for (let x = 0; x < w; x++) {
      const v = noise.fbm1(x * (o.freq || 0.01), 3);
      top[x] = Math.round(o.base - v * o.amp);
    }
    for (let x = 0; x < w; x++) {
      for (let y = Math.max(0, top[x]); y < h; y++) {
        const d = y - top[x];
        let col = d < 2 ? cTop : cBody;
        if (d >= 2 && d < 4 && ERX.bayer(x, y) < 0.5) col = cTop;
        const f = (y - top[x]) / Math.max(1, h - top[x]);
        if (cDark && ERX.bayer(x, y) < f * 1.4 - 0.3) col = cDark;
        buf.data[y * w + x] = col;
      }
    }
    return { canvas: buf.toCanvas(), top, buf };
  };

  /**
   * Round leafy tree. pal: { dark, mid, light, hi, trunk, trunkDark, outline }
   * Returns PixelBuffer; trunk base sits at the bottom centre.
   */
  Paint.roundTree = function (rng, r, pal) {
    const w = Math.ceil(r * 2.6) + 4, th = Math.max(3, Math.round(r * 0.9));
    const h = Math.ceil(r * 2.2) + th + 2;
    const buf = new PB(w, h);
    const cx = Math.floor(w / 2), groundY = h - 1;
    // trunk
    const tw = Math.max(2, Math.round(r / 4));
    buf.rect(cx - Math.floor(tw / 2), groundY - th - 2, tw, th + 3, c32(pal.trunk));
    buf.rect(cx - Math.floor(tw / 2) + tw - 1, groundY - th - 2, 1, th + 3, c32(pal.trunkDark));
    // canopy blobs
    const canopyY = groundY - th - r * 0.9;
    const blobs = [{ x: cx, y: canopyY, r }];
    const extra = rng.int(2, 4);
    for (let i = 0; i < extra; i++) {
      const a = rng.range(Math.PI * 0.9, Math.PI * 2.1);
      blobs.push({ x: cx + Math.cos(a) * r * 0.6, y: canopyY + Math.sin(a) * r * 0.45 + r * 0.15, r: r * rng.range(0.55, 0.75) });
    }
    for (const b of blobs) buf.circle(b.x, b.y, b.r, c32(pal.dark));
    for (const b of blobs) buf.circle(b.x - 1, b.y - 1, b.r - 1.2, c32(pal.mid));
    for (const b of blobs) buf.circle(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.45, c32(pal.light));
    if (pal.hi) {
      for (let i = 0; i < r; i++) {
        const b = rng.pick(blobs);
        const px = Math.round(b.x - b.r * 0.4 + rng.range(-1, 1)), py = Math.round(b.y - b.r * 0.5 + rng.range(-1, 1));
        if (buf.solid(px, py)) buf.set(px, py, c32(pal.hi));
      }
    }
    // leaf texture: scattered dark pixels
    for (let i = 0; i < r * 3; i++) {
      const b = rng.pick(blobs);
      const px = Math.round(b.x + rng.range(-b.r, b.r) * 0.8), py = Math.round(b.y + rng.range(-b.r, b.r) * 0.8);
      if (buf.solid(px, py) && buf.get(px, py) !== c32(pal.light)) buf.set(px, py, c32(pal.dark));
    }
    if (pal.outline) buf.outline(c32(pal.outline));
    return buf;
  };

  /** Pine / conifer. Returns PixelBuffer. */
  Paint.pineTree = function (rng, h, pal) {
    const w = Math.round(h * 0.6) | 1;
    const buf = new PB(w + 2, h + 2);
    const cx = Math.floor((w + 2) / 2);
    buf.rect(cx - 1, h - 2, 2, 4, c32(pal.trunk));
    const tiers = Math.max(2, Math.round(h / 6));
    for (let i = 0; i < tiers; i++) {
      const ty = Math.round((i / tiers) * (h - 4));
      const tierH = Math.round((h - 4) / tiers) + 3;
      const maxW = (w / 2) * ((i + 1) / tiers) + 1;
      for (let y = 0; y < tierH; y++) {
        const hw = Math.round((maxW * (y + 1)) / tierH);
        for (let x = -hw; x <= hw; x++) {
          const col = x < -hw / 3 ? pal.light : x > hw / 3 ? pal.dark : pal.mid;
          buf.set(cx + x, ty + y + 1, c32(col));
        }
      }
    }
    if (pal.outline) buf.outline(c32(pal.outline));
    return buf;
  };

  // ------------------------------------------------------- Particles
  class Particles {
    constructor() {
      this.list = [];
    }
    add(p) {
      p.age = 0;
      this.list.push(p);
      return p;
    }
    get count() { return this.list.length; }
    update(dt) {
      const L = this.list;
      for (let i = L.length - 1; i >= 0; i--) {
        const p = L[i];
        p.age += dt;
        if (p.age >= p.life) { L.splice(i, 1); continue; }
        p.vx += (p.ax || 0) * dt;
        p.vy += (p.ay || 0) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.wobble) p.x += Math.sin(p.age * p.wobbleRate + (p.phase || 0)) * p.wobble * dt;
      }
    }
    /** Draw as pixel squares; per-particle fade via age (optional). */
    render(ctx, ox = 0, oy = 0) {
      for (const p of this.list) {
        const k = p.age / p.life;
        let a = 1;
        if (p.fadeIn) a = Math.min(a, p.age / p.fadeIn);
        if (p.fadeOut) a = Math.min(a, (p.life - p.age) / p.fadeOut);
        if (p.blink) a *= 0.5 + 0.5 * Math.sin(p.age * p.blink + (p.phase || 0));
        if (a <= 0.02) continue;
        ctx.globalAlpha = Math.min(1, a) * (p.alpha || 1);
        const s = p.grow ? Math.max(1, Math.round(p.size + p.grow * k)) : p.size || 1;
        ctx.fillStyle = p.colors ? p.colors[Math.floor(p.age * 6 + (p.phase || 0)) % p.colors.length] : p.color;
        if (p.len) ctx.fillRect(Math.round(p.x + ox), Math.round(p.y + oy), p.len, 1);
        else ctx.fillRect(Math.round(p.x + ox - (s >> 1)), Math.round(p.y + oy - (s >> 1)), s, s);
      }
      ctx.globalAlpha = 1;
    }
  }
  Paint.Particles = Particles;

  // ------------------------------------------------------------ Grass
  /** Individually swaying grass blades (cheap: ~1 fillRect per pixel). */
  class Grass {
    constructor() {
      this.groups = new Map(); // color -> blades
    }
    add(x, y, h, color, phase) {
      if (!this.groups.has(color)) this.groups.set(color, []);
      this.groups.get(color).push({ x: Math.round(x), y: Math.round(y), h, phase });
    }
    /** wind(x, t) -> sway strength in pixels at blade tip. */
    render(ctx, t, ox, oy, wind, still) {
      for (const [color, blades] of this.groups) {
        ctx.fillStyle = color;
        for (const b of blades) {
          const sway = still ? 0 : wind(b.x, t, b.phase);
          for (let j = 0; j < b.h; j++) {
            const k = (j + 1) / b.h;
            const off = Math.round(sway * k * k);
            ctx.fillRect(b.x + off + ox, b.y - j + oy, 1, 1);
          }
        }
      }
    }
  }
  Paint.Grass = Grass;

  // ------------------------------------------------------------ Birds
  const BIRD_FRAMES = [
    ['#...#', '.#.#.', '..#..'],
    ['.....', '.###.', '#...#'],
  ];
  const birdCache = new Map();
  function birdSprite(color, frame) {
    const key = color + frame;
    if (!birdCache.has(key)) birdCache.set(key, ERX.Sprites.fromStrings(BIRD_FRAMES[frame], { '#': color }));
    return birdCache.get(key);
  }

  class Flock {
    constructor(rng, o) {
      this.rng = rng;
      this.o = o;
      this.birds = [];
      for (let i = 0; i < o.count; i++) this.birds.push(this._spawn(true));
    }
    _spawn(initial) {
      const o = this.o, r = this.rng;
      const dir = o.dir || 1;
      return {
        x: initial ? r.range(0, o.W) : dir > 0 ? -r.range(10, 160) : o.W + r.range(10, 160),
        y: r.range(o.yMin, o.yMax),
        vx: dir * r.range(o.speedMin, o.speedMax),
        phase: r.range(0, 10),
        flap: r.range(5, 9),
        bob: r.range(0.5, 1.5),
        glide: r.range(0, 10),
      };
    }
    update(dt) {
      for (let i = 0; i < this.birds.length; i++) {
        const b = this.birds[i];
        b.x += b.vx * dt;
        b.phase += dt;
        if ((b.vx > 0 && b.x > this.o.W + 12) || (b.vx < 0 && b.x < -12)) this.birds[i] = this._spawn(false);
      }
    }
    render(ctx, ox = 0, oy = 0) {
      for (const b of this.birds) {
        // birds alternate between flapping and gliding
        const gliding = Math.sin(b.phase * 0.5 + b.glide) > 0.4;
        const frame = gliding ? 1 : Math.floor(b.phase * b.flap) % 2;
        const y = b.y + Math.sin(b.phase * b.bob) * 2;
        ctx.drawImage(birdSprite(this.o.color, frame), Math.round(b.x + ox), Math.round(y + oy));
      }
    }
  }
  Paint.Flock = Flock;

  /** Draw a layer canvas with horizontal parallax, wrapping if needed. */
  Paint.drawLayer = function (ctx, canvas, x, y) {
    ctx.drawImage(canvas, Math.round(x), Math.round(y));
  };

  /** Draw a horizontally tiling canvas scrolled by `offset`. */
  Paint.drawTiled = function (ctx, canvas, offset, y, W) {
    const w = canvas.width;
    let x = -(((offset % w) + w) % w);
    x = Math.round(x);
    for (; x < W; x += w) ctx.drawImage(canvas, x, Math.round(y));
  };

  ERX.Paint = Paint;
})(window.ERX = window.ERX || {});
