/*
 * Colour helpers. Pixel buffers store colours as packed 32-bit ABGR
 * integers (little-endian RGBA bytes), which is what ImageData expects.
 */
(function (ERX) {
  'use strict';

  const cache = new Map();

  function parse(hex) {
    let h = hex.charAt(0) === '#' ? hex.slice(1) : hex;
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function toHex(r, g, b) {
    const c = (v) => {
      const s = Math.round(Math.max(0, Math.min(255, v))).toString(16);
      return s.length === 1 ? '0' + s : s;
    };
    return '#' + c(r) + c(g) + c(b);
  }

  const Color = {
    parse,
    toHex,

    /** '#rrggbb' -> packed ABGR uint32 (alpha 0..255). */
    u32(hex, a = 255) {
      const key = hex + a;
      let v = cache.get(key);
      if (v === undefined) {
        const { r, g, b } = parse(hex);
        v = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
        cache.set(key, v);
      }
      return v;
    },

    mix(a, b, t) {
      const A = parse(a), B = parse(b);
      return toHex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
    },

    /** amt > 0 lightens toward white, amt < 0 darkens toward black. */
    shade(hex, amt) {
      return amt >= 0 ? Color.mix(hex, '#ffffff', amt) : Color.mix(hex, '#000000', -amt);
    },

    rgba(hex, a) {
      const { r, g, b } = parse(hex);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    },
  };

  // The six elemental colours, matching the icons on the logo.
  // UI decoration only — nothing here assigns anything to the player.
  Color.ELEMENTS = ['#ff5a36', '#3aa0ff', '#5fd84a', '#a85cff', '#ffd23a', '#9ae8ff'];

  ERX.Color = Color;
})(window.ERX = window.ERX || {});
