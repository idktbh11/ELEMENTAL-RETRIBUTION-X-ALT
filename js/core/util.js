/*
 * Math helpers, easing curves, seeded random numbers and value noise.
 */
(function (ERX) {
  'use strict';

  const U = {};

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smoothstep = (a, b, v) => {
    const t = U.clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  // Frame-rate independent exponential approach toward a target.
  U.approach = (value, target, rate, dt) => value + (target - value) * (1 - Math.exp(-rate * dt));
  U.wrap = (v, min, max) => {
    const r = max - min;
    return ((((v - min) % r) + r) % r) + min;
  };

  U.ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outBack: (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    outBounce: (t) => {
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
  };

  /** Small, fast, seedable PRNG (mulberry32). */
  class RNG {
    constructor(seed) {
      this.state = (seed >>> 0) || 0x9e3779b9;
    }
    next() {
      let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    range(a, b) { return a + (b - a) * this.next(); }
    int(a, b) { return Math.floor(a + (b - a + 1) * this.next()); }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    chance(p) { return this.next() < p; }
    sign() { return this.next() < 0.5 ? -1 : 1; }
    fork(salt) { return new RNG((this.state ^ Math.imul(salt + 1, 0x85ebca6b)) >>> 0); }
  }
  U.RNG = RNG;
  U.randomSeed = () => (Math.random() * 0xffffffff) >>> 0;

  /** Seeded value noise (1D + 2D) with fractal sums. Output roughly 0..1. */
  class Noise {
    constructor(seed) {
      const rng = new RNG(seed);
      this.p = new Uint8Array(512);
      const perm = [];
      for (let i = 0; i < 256; i++) perm[i] = i;
      for (let i = 255; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [perm[i], perm[j]] = [perm[j], perm[i]];
      }
      for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];
      this.v = new Float32Array(256);
      for (let i = 0; i < 256; i++) this.v[i] = rng.next();
    }
    n1(x) {
      const xi = Math.floor(x), xf = x - xi;
      const a = this.v[this.p[xi & 255]], b = this.v[this.p[(xi + 1) & 255]];
      const t = xf * xf * (3 - 2 * xf);
      return a + (b - a) * t;
    }
    n2(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const p = this.p, v = this.v;
      const aa = v[p[(p[xi & 255] + yi) & 255]];
      const ba = v[p[(p[(xi + 1) & 255] + yi) & 255]];
      const ab = v[p[(p[xi & 255] + yi + 1) & 255]];
      const bb = v[p[(p[(xi + 1) & 255] + yi + 1) & 255]];
      const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
      const x1 = aa + (ba - aa) * u, x2 = ab + (bb - ab) * u;
      return x1 + (x2 - x1) * w;
    }
    fbm1(x, oct = 3) {
      let s = 0, a = 0.5, f = 1, n = 0;
      for (let i = 0; i < oct; i++) { s += this.n1(x * f) * a; n += a; a *= 0.5; f *= 2; }
      return s / n;
    }
    fbm2(x, y, oct = 3) {
      let s = 0, a = 0.5, f = 1, n = 0;
      for (let i = 0; i < oct; i++) { s += this.n2(x * f, y * f) * a; n += a; a *= 0.5; f *= 2; }
      return s / n;
    }
  }
  U.Noise = Noise;

  ERX.U = U;
})(window.ERX = window.ERX || {});
