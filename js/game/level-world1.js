/*
 * WORLD 1 — a perfectly normal planet (the same one for every hero).
 *
 * Bright, green and alive: a flowery meadow under huge old trees, rolling
 * hills, a windmill, snowy mountains, a sea of clouds above it all, and a sun
 * that sets and a moon that rises (one full day every 10 minutes).
 *
 * Head east and it gets foggy: past the meadow the fog thickens into the fog
 * zone (you can't see far, you walk slowly, and wisps drift out of the mist),
 * and the road ends at a cliff with an old cave in it. It's boarded up, but
 * the boards break (see openCave), and in you go: js/game/level-oldcave.js.
 * Once you've fallen through it, it caves in behind you (prepare): the cliff's a heap of
 * rubble, and the path runs on over it, out of the fog... to Normalton (js/game/level-village.js).
 *
 *   World1Level        the ground you walk on (tiles, trees, flowers, the cliff...)
 *   level.drawSky()    everything behind it: sky, sun / moon / stars,
 *                      mountains, hills, clouds. It also works from thousands
 *                      of pixels up, which is where you start: falling.
 *   level.update()     the clock, critters, swaying grass, the wisps
 *   level.drawFog()    the fog over everything (the game screen calls it)
 *   level.speedAt(x)   how fast you can walk there (the player asks)
 *
 * Coordinates: the meadow is flat at floorY; "altitude" is how far the
 * camera is above where it sits when you stand on the ground.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, PB = ERX.PixelBuffer, C = ERX.Color, P = ERX.Paint;
  const c32 = (h) => C.u32(h);
  const TS = 16;
  const { AIR, ROCK } = ERX.CaveLevel.TILES;

  const DAY = 600;          // one full day + night, in seconds
  const FALL = 3600;        // how high above the meadow the fall starts (px)
  const CLOUDS = 1750;      // the sea of clouds (its top), above the meadow (px)

  const PAL = {
    rock: ['#a8a0a8', '#7e7884', '#5a5462', '#3e3a48', '#2a2634', '#1e1a26'],
    moss: ['#7ae05a', '#4ea840'],
    metal: ['#a8b0c0', '#848ca0', '#5e6478', '#3e4254'],
    wood: ['#a8784a', '#7a5236', '#4a3022'],
    outline: '#1a1424',
    back: ['#2a6ad8', '#4f9cee', '#b4e2ff', '#ffffff'],
  };
  const GRASS = ['#b4f06a', '#86d84e', '#5cb844', '#3e9a3c', '#2c7a36'];
  const SOIL = ['#9a6a42', '#86583a', '#704830', '#5a3a28', '#462e22', '#36241c'];
  const TREE = { dark: '#2c7a36', mid: '#46a043', light: '#7cd055', hi: '#b8f070', trunk: '#8a5a38', trunkDark: '#5a3a28', outline: '#1a2a1e' };
  const TREE_BACK = { dark: '#3a7a5a', mid: '#4e9068', light: '#6aa87a', hi: '#8ac090', trunk: '#6a5a4a', trunkDark: '#4a4038', outline: null };
  const PINE = { dark: '#1e5a36', mid: '#2e7a44', light: '#4a9a54', trunk: '#6a4a30', outline: '#14261c' };
  const FLOWERS = ['#ff6a8a', '#ffd34d', '#ffffff', '#b87aff', '#ff9a3a', '#6ac8ff'];

  // ------------------------------------------------------------ time of day
  /** Sky colours: zenith, middle, horizon. */
  const SKY = {
    day: ['#2766d6', '#4f9cee', '#bfe8ff'],
    dusk: ['#2a2a76', '#a4508a', '#ffa45a'],
    night: ['#02030f', '#081030', '#18244e'],
  };
  /** tod 0..1: 0 sunrise, 0.25 noon, 0.5 sunset, 0.75 midnight. */
  function lightAt(tod) {
    const sun = Math.sin(tod * Math.PI * 2);
    const night = U.clamp(-sun * 3.2 + 0.05, 0, 1);
    const dusk = U.clamp(1 - Math.abs(sun) * 3.4, 0, 1) * (1 - night * 0.5);
    return { sun, night, dusk };
  }
  const mix = (a, b, k) => C.mix(a, b, U.clamp(k, 0, 1));
  const skyCol = (i, L) => mix(mix(SKY.day[i], SKY.dusk[i], L.dusk), SKY.night[i], L.night);

  /** A copy of a canvas washed in a colour (multiply), keeping its shape: how layers look at dusk and at night. */
  function tinted(cv, col, alpha) {
    const out = ERX.makeCanvas(cv.width, cv.height), c = out.getContext('2d');
    c.drawImage(cv, 0, 0);
    c.globalCompositeOperation = 'multiply'; c.globalAlpha = alpha; c.fillStyle = col; c.fillRect(0, 0, cv.width, cv.height);
    c.globalCompositeOperation = 'destination-in'; c.globalAlpha = 1; c.drawImage(cv, 0, 0);
    return out;
  }
  /** A colour washed the same way as tinted() does it (for flat fills that have to match a tinted layer). */
  function mulCol(hex, tint, a) { const A = C.mix(hex, '#000000', 0), x = parseInt(A.slice(1), 16), y = parseInt(tint.slice(1), 16); const m = (s) => Math.round((((x >> s) & 255) * ((y >> s) & 255)) / 255); const mul = '#' + ((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1); return C.mix(hex, mul, a); }
  const todCol = (hex, L) => mix(mix(hex, mulCol(hex, '#ff9a6a', 0.75), L.dusk * (1 - L.night)), mulCol(hex, '#2a3a7a', 0.92), L.night);
  /** Day, dusk and night versions of a layer. */
  const tod3 = (cv) => ({ day: cv, dusk: tinted(cv, '#ff9a6a', 0.75), night: tinted(cv, '#2a3a7a', 0.92) });
  function drawTod(ctx, L, layer, x, y) {
    ctx.drawImage(layer.day, x, y);
    if (L.dusk > 0.02) { ctx.globalAlpha = L.dusk * (1 - L.night); ctx.drawImage(layer.dusk, x, y); }
    if (L.night > 0.02) { ctx.globalAlpha = L.night; ctx.drawImage(layer.night, x, y); }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ the backdrop
  /** Everything behind the ground, built for one view size. */
  class Backdrop {
    constructor(level, vw, vh) {
      this.vw = vw; this.vh = vh;
      const rng = new U.RNG(0x0ea7);
      const span = (d) => Math.round(vw + Math.max(0, level.pw - vw) * d + 16);
      // stars
      const sb = new PB(vw, vh);
      for (let i = 0; i < vw * vh * 0.0016; i++) sb.set(rng.int(0, vw - 1), rng.int(0, vh - 1), c32(rng.pick(['#ffffff', '#c8d8ff', '#fff0c8', '#8a9ac8'])));
      this.stars = sb.toCanvas();
      this.twinkles = Array.from({ length: 22 }, () => ({ x: rng.range(0, vw), y: rng.range(0, vh * 0.7), ph: rng.range(0, 6), sp: rng.range(1, 3) }));
      // far, snowy mountains (blue in the haze)
      const far = P.mountains(rng, span(0.05), 150, { peaks: 7, minH: 60, maxH: 138, rock: ['#a6b8e0', '#8094c8', '#93a6d4'], snow: ['#f4f8ff', '#c8d4f0'], snowLine: 92, rim: '#ffffff', fade: { color: '#b8d0f0', start: 96, end: 150 }, lean: 0.5, jag: 0.8 });
      // nearer mountains: green-grey, a little snow on the tallest
      const mid = P.mountains(rng, span(0.1), 120, { peaks: 9, minH: 34, maxH: 92, rock: ['#7aa28a', '#5a8270', '#6a927c'], snow: ['#eef8f4', '#b8d0c8'], snowLine: 82, rim: '#c8f0d8', fade: { color: '#8ab8a4', start: 74, end: 120 }, lean: 0.55, jag: 0.9 });
      // forest hills: rolling, with a fringe of trees along the top
      const hills = P.hills(rng, span(0.2), 90, { base: 46, amp: 26, freq: 0.012, colors: ['#5aa850', '#3e8a46', '#2e6e40'] });
      this.forest(hills, rng, ['#2e6e40', '#245a36', '#3a7a46'], 0.85);
      // the meadow hills just behind the trees: bright, flowery
      const near = P.hills(rng, span(0.32), 70, { base: 36, amp: 16, freq: 0.018, colors: ['#8ad85a', '#64bc4c', '#4ea044'] });
      this.forest(near, rng, ['#3e8a46', '#2e7a40', '#4e9a4e'], 0.35, true);
      this.flowers(near, rng);
      this.layers = [
        { cv: tod3(far.canvas), depth: 0.05, lift: 46, under: '#b8d0f0' },
        { cv: tod3(mid.canvas), depth: 0.1, lift: 34, under: '#8ab8a4' },
        { cv: tod3(hills.canvas), depth: 0.2, lift: 22, under: '#2e6e40' },
        { cv: tod3(near.canvas), depth: 0.32, lift: 10, under: '#4ea044' },
      ];
      this.windmill = { layer: 3, x: Math.round(span(0.32) * 0.62), top: near.top };
      this.cottage = { layer: 2, x: Math.round(span(0.2) * 0.3), top: hills.top };
      // little fair-weather clouds drifting across the sky
      const cpal = { hi: '#ffffff', mid: '#eef6ff', lo: '#cfe2f6', deep: '#b0cbe8' };
      this.clouds = [];
      for (let i = 0; i < 9; i++) {
        const w = rng.int(30, 76), cv = P.cloud(rng, w, Math.round(w * rng.range(0.32, 0.45)), cpal).toCanvas();
        this.clouds.push({ cv: tod3(cv), x: rng.range(-80, vw + 80), y: rng.range(14, vh * 0.42), sp: rng.range(2, 7), depth: rng.range(0.02, 0.06) });
      }
      // big puffy clouds hanging at every height you fall past
      this.puffs = [];
      for (let i = 0; i < 26; i++) {
        let alt; do alt = rng.range(380, FALL - 120); while (Math.abs(alt - CLOUDS) < 320);
        const w = rng.int(70, 170), cv = P.cloud(rng, w, Math.round(w * rng.range(0.34, 0.5)), cpal).toCanvas();
        this.puffs.push({ cv: tod3(cv), x: rng.range(-60, level.pw), alt, depth: rng.range(0.55, 0.9) });
      }
      // the sea of clouds: a tiling top and a darker, flipped underside
      const bankW = 512;
      this.bankTop = tod3(P.cloudBank(rng, bankW, 72, { hi: '#ffffff', mid: '#f0f6ff', lo: '#d6e6f8', deep: '#bcd2ec' }, { top: 18, rMin: 8, rMax: 22 }));
      const under = P.cloudBank(rng, bankW, 60, { hi: '#d8e4f2', mid: '#bccde4', lo: '#9eb4d4', deep: '#8aa2c8' }, { top: 14, rMin: 6, rMax: 18 });
      const flip = ERX.makeCanvas(bankW, 60), fc = flip.getContext('2d'); fc.translate(0, 60); fc.scale(1, -1); fc.drawImage(under, 0, 0);
      this.bankUnder = tod3(flip);
      this.flock = new P.Flock(rng, { count: 6, W: vw, yMin: 30, yMax: vh * 0.4, speedMin: 14, speedMax: 26, color: '#2a3048', dir: 1 });
      this.shoot = null;
    }

    /** A fringe of little trees along a hill's top edge (into its canvas). */
    forest(h, rng, cols, density, round) {
      const c = h.canvas.getContext('2d'), w = h.canvas.width;
      for (let x = 2; x < w - 2; x += rng.int(2, 6)) {
        if (rng.next() > density) continue;
        const top = h.top[x], th = rng.int(4, round ? 6 : 9), col = rng.pick(cols);
        c.fillStyle = col;
        if (round) { const r = rng.int(2, 4); for (let yy = -r; yy <= r; yy++) { const hw = Math.round(Math.sqrt(r * r - yy * yy)); c.fillRect(x - hw, top - r - 1 + yy, hw * 2 + 1, 1); } c.fillRect(x, top - 1, 1, 2); }
        else for (let yy = 0; yy < th; yy++) { const hw = Math.floor((yy / th) * 2.4); c.fillRect(x - hw, top - th + yy, hw * 2 + 1, 1); }
      }
    }
    /** Specks of flowers on the meadow hills. */
    flowers(h, rng) {
      const c = h.canvas.getContext('2d'), w = h.canvas.width;
      for (let i = 0; i < w * 0.5; i++) { const x = rng.int(0, w - 1), y = h.top[x] + rng.int(3, 18); if (y < h.canvas.height) { c.fillStyle = rng.pick(FLOWERS); c.fillRect(x, y, 1, 1); } }
    }

    draw(ctx, cam, vw, vh, g, level) {
      const t = g.t, tod = g.worldTod || 0, L = lightAt(tod);
      const ground = level.ph - vh;                         // camera y when you stand in the meadow
      const alt = Math.max(0, ground - cam.y);
      const gl = level.floorY - ground;                     // the meadow's line on screen (from the ground)
      const horizon = gl - 40 + alt * 0.03;
      // ---- the sky: deeper blue the higher you are
      const high = U.clamp(alt / FALL, 0, 1) * (1 - L.night);
      // (Chaos turns the sky very slightly red: a red haze that's strongest down by the horizon)
      const el = g.element && g.element(), red = el && el.id === 'chaos' ? World1Level.CHAOS_RED : 0, R = (col, k) => (red ? mix(col, '#ff4a3a', red * k) : col);
      const grad = ctx.createLinearGradient(0, horizon - vh * 1.25, 0, horizon + 10);
      grad.addColorStop(0, R(mix(skyCol(0, L), '#0a2a92', high * 0.7), 0.7));
      grad.addColorStop(0.5 - L.dusk * 0.12, R(mix(skyCol(1, L), '#2a60d0', high * 0.5), 1.1));
      grad.addColorStop(0.82 - L.dusk * 0.12, R(skyCol(2, L), 1.7));
      grad.addColorStop(1, R(skyCol(2, L), 1.7));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, vw, vh);
      // ---- stars (and the odd shooting star)
      if (L.night > 0.02) {
        ctx.globalAlpha = L.night * 0.9; ctx.drawImage(this.stars, 0, 0); ctx.globalAlpha = 1;
        for (const s of this.twinkles) { const a = L.night * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)); ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1); ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y), 3, 1); ctx.fillRect(Math.round(s.x), Math.round(s.y) - 1, 1, 3); }
        ctx.globalAlpha = 1;
        if (!this.shoot && Math.random() < 0.004 * L.night) this.shoot = { x: Math.random() * vw, y: Math.random() * vh * 0.3, t: 0 };
        if (this.shoot) { const s = this.shoot; s.t += 1 / 60; const k = s.t / 0.7; ctx.globalAlpha = (1 - k) * L.night; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x + k * 90, s.y + k * 40); ctx.lineTo(s.x + k * 90 - 14, s.y + k * 40 - 6); ctx.stroke(); ctx.globalAlpha = 1; if (k >= 1) this.shoot = null; }
      }
      // ---- the sun by day, the moon by night (arcing over the sky)
      const arcY = (u) => horizon - Math.sin(u * Math.PI) * (horizon - 24);
      if (tod < 0.53) {
        const u = U.clamp(tod / 0.5, 0, 1), sx = vw * (0.12 + 0.76 * u), sy = arcY(u) + alt * 0.02, low = U.clamp(1 - Math.sin(u * Math.PI) * 2.2, 0, 1);
        const sc = mix('#fff6c8', '#ff8a3a', low), r = 9 + low * 4;
        const gl2 = ctx.createRadialGradient(sx, sy, 2, sx, sy, 90 + low * 40);
        gl2.addColorStop(0, C.rgba(sc, 0.55)); gl2.addColorStop(1, C.rgba(sc, 0));
        ctx.fillStyle = gl2; ctx.fillRect(sx - 140, sy - 140, 280, 280);
        // god rays, slowly turning
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.032 * (1 - L.night);
        for (let i = 0; i < 7; i++) { const a = t * 0.03 + i * 0.9, l = 260; ctx.fillStyle = sc; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a - 0.05) * l, sy + Math.sin(a - 0.05) * l); ctx.lineTo(sx + Math.cos(a + 0.05) * l, sy + Math.sin(a + 0.05) * l); ctx.fill(); }
        ctx.restore();
        disc(ctx, sx, sy, r + 2, mix(sc, '#ffffff', 0.3)); disc(ctx, sx, sy, r, sc); disc(ctx, sx - 2, sy - 2, Math.max(2, r - 5), '#ffffff');
      }
      if (tod > 0.47) {
        const u = U.clamp((tod - 0.5) / 0.5, 0, 1), mx = vw * (0.12 + 0.76 * u), my = arcY(u) + alt * 0.02;
        const glm = ctx.createRadialGradient(mx, my, 2, mx, my, 70);
        glm.addColorStop(0, 'rgba(200,220,255,0.35)'); glm.addColorStop(1, 'rgba(200,220,255,0)');
        ctx.fillStyle = glm; ctx.fillRect(mx - 80, my - 80, 160, 160);
        disc(ctx, mx, my, 9, '#e8eeff'); disc(ctx, mx + 2, my - 1, 7, '#f8faff');
        for (const [dx, dy, rr] of [[-3, -2, 2], [2, 3, 1.5], [3, -3, 1]]) disc(ctx, mx + dx, my + dy, rr, '#c8d0e8');
      }
      // ---- little clouds drifting by
      for (const c of this.clouds) {
        const w = c.cv.day.width, x = ((c.x + t * c.sp - cam.x * c.depth) % (vw + w * 2) + vw + w * 2) % (vw + w * 2) - w;
        drawTod(ctx, L, c.cv, Math.round(x), Math.round(c.y + alt * 0.04));
      }
      if (L.night < 0.5 && alt < 400) { ctx.globalAlpha = (1 - L.night * 2) * (1 - alt / 400); this.flock.update(1 / 60); this.flock.render(ctx, 0, Math.round(alt * 0.05)); ctx.globalAlpha = 1; }
      // ---- mountains, hills, the meadow hills (they sink out of view as you go up)
      this.layers.forEach((ly, i) => {
        const h = ly.cv.day.height, y = Math.round(gl - ly.lift + alt * ly.depth * 1.2 - h);
        if (y > vh) return;
        const x = Math.round(-cam.x * ly.depth - 8);
        drawTod(ctx, L, ly.cv, x, y);
        if (y + h < vh) { ctx.fillStyle = todCol(ly.under, L); ctx.fillRect(0, y + h, vw, vh - y - h); }
        if (i === this.cottage.layer) this.drawCottage(ctx, L, x, y, t);
        if (i === this.windmill.layer) this.drawWindmill(ctx, L, x, y, t);
      });
      // ---- the puffy clouds and the sea of clouds you fall through (true world height: they rush past)
      for (const pf of this.puffs) {
        const wy = level.floorY - pf.alt, sy = wy - cam.y, w = pf.cv.day.width;
        if (sy > vh + 10 || sy + pf.cv.day.height < -10) continue;
        drawTod(ctx, L, pf.cv, Math.round(pf.x - cam.x * pf.depth), Math.round(sy));
      }
      this.drawCloudSea(ctx, L, cam, vw, vh, level);
    }

    /** The sea of clouds: a bumpy white top, a solid body, a darker underside. */
    drawCloudSea(ctx, L, cam, vw, vh, level) {
      const top = level.floorY - CLOUDS - cam.y, thick = 150;
      if (top > vh || top + thick + 70 < 0) return;
      const off = cam.x * 0.6 + (level.game ? level.game.t * 6 : 0);
      const body = mix(mix('#d6e6f8', '#e8b8b8', L.dusk), '#3a4670', L.night);
      ctx.fillStyle = body; ctx.fillRect(0, Math.round(top + 60), vw, thick - 60);
      for (const [key, y] of [['bankTop', top], ['bankUnder', top + thick - 10]]) {
        const b = this[key], w = b.day.width;
        for (let x = -(((off % w) + w) % w); x < vw; x += w) drawTod(ctx, L, b, Math.round(x), Math.round(y));
      }
    }

    /** A little cottage on the far hills, smoke curling up from the chimney. */
    drawCottage(ctx, L, lx, ly, t) {
      const x = lx + this.cottage.x, y = ly + this.cottage.top[this.cottage.x] + 1;
      const R = (xx, yy, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(xx), Math.round(yy), w, h); };
      R(x - 4, y - 5, 8, 5, mix('#e8dcc0', '#3a3a60', L.night)); R(x - 5, y - 8, 10, 3, mix('#b04a3a', '#2a2040', L.night)); R(x - 3, y - 9, 6, 1, mix('#b04a3a', '#2a2040', L.night)); R(x + 2, y - 11, 2, 3, '#6a5a5a');
      R(x - 1, y - 3, 2, 3, '#4a3022'); R(x + 2, y - 4, 1, 1, L.night > 0.4 ? '#ffd870' : '#6ab0e0');
      for (let i = 0; i < 4; i++) { const k = (t * 0.25 + i / 4) % 1; ctx.globalAlpha = (1 - k) * 0.6; R(x + 3 + Math.sin(k * 6 + i) * 2 * k, y - 12 - k * 14, 2, 2, '#e8eef4'); }
      ctx.globalAlpha = 1;
    }
    /** A windmill on the meadow hills, sails turning in the breeze. */
    drawWindmill(ctx, L, lx, ly, t) {
      const x = lx + this.windmill.x, y = ly + this.windmill.top[this.windmill.x] + 1, wall = mix('#f0e8d8', '#4a4a70', L.night), roof = mix('#8a4a3a', '#2a2040', L.night);
      ctx.fillStyle = wall;
      for (let yy = 0; yy < 18; yy++) { const hw = 3 + Math.floor(yy / 6); ctx.fillRect(x - hw, y - 18 + yy, hw * 2, 1); }
      ctx.fillStyle = roof; ctx.fillRect(x - 4, y - 21, 8, 3); ctx.fillRect(x - 3, y - 22, 6, 1);
      ctx.fillStyle = '#4a3022'; ctx.fillRect(x - 1, y - 4, 2, 4);
      if (L.night > 0.4) { ctx.fillStyle = '#ffd870'; ctx.fillRect(x, y - 12, 1, 2); }
      const hx = x, hy = y - 17, a0 = t * 1.1;
      ctx.strokeStyle = mix('#c8b090', '#5a5070', L.night); ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const a = a0 + i * Math.PI / 2, ex = hx + Math.cos(a) * 13, ey = hy + Math.sin(a) * 13;
        ctx.beginPath(); ctx.moveTo(hx + 0.5, hy + 0.5); ctx.lineTo(ex + 0.5, ey + 0.5); ctx.stroke();
        ctx.fillStyle = mix('#f4ecdc', '#5a5a80', L.night);
        for (let k = 4; k < 13; k++) ctx.fillRect(Math.round(hx + Math.cos(a) * k - Math.sin(a) * 1.5), Math.round(hy + Math.sin(a) * k + Math.cos(a) * 1.5), 2, 2);
      }
      ctx.fillStyle = '#6a4a30'; ctx.fillRect(hx - 1, hy - 1, 2, 2);
    }
  }
  /** A filled pixel circle (canvas context). */
  function disc(ctx, x, y, r, col) {
    ctx.fillStyle = col;
    const R = Math.max(0.5, r), ri = Math.ceil(R);
    for (let yy = -ri; yy <= ri; yy++) { const hw = Math.floor(Math.sqrt(Math.max(0, R * R - yy * yy))); if (hw <= 0 && Math.abs(yy) > R - 0.5) continue; ctx.fillRect(Math.round(x - hw), Math.round(y + yy), hw * 2 + 1, 1); }
  }

  // ------------------------------------------------------------ the journey
  // East from where you land: the meadow (its monsters spread out, so you meet
  // them one at a time), then the fog creeps in and thickens into the fog zone
  // (you can't see far, you wade through it slowly, and wisps drift out of it),
  // and at the far end a cliff with an old cave in it, boarded up. DO NOT ENTER.
  const MAP = {
    W: 214,                            // tiles
    fogStart: 116, fogFull: 134,       // the fog thickens between these tiles; past fogFull you're in the fog zone
    cave: 204,                         // the cliff starts at this tile (the cave mouth is in its face)
    wisps: [[136, 2], [150, 1], [164, 2], [178, 1], [190, 2]],   // [tile, how many]: wisps drift out of the fog as you get there
    slow: 0.32,                        // how much the fog zone slows your walking (0.32 = you walk at 68%)
  };
  const FOG = { day: '#c4d4d8', dusk: '#d4b8b0', night: '#1c2638' };
  const fogCol = (L) => mix(mix(FOG.day, FOG.dusk, L.dusk * (1 - L.night)), FOG.night, L.night);
  const GRASS_FOG = ['#a8b89c', '#8aa08a', '#6a8a74', '#4e6e60', '#3a584e'];   // the grass, grey and damp in the fog
  const TREE_FOG = { dark: '#4a6a5a', mid: '#5e7e6a', light: '#7a9682', hi: '#94aa98', trunk: '#5a524a', trunkDark: '#423c36', outline: null };
  const PINE_FOG = { dark: '#3a5a4a', mid: '#4a6a58', light: '#5e7e6a', trunk: '#4a4038' };
  const DEAD = { bark: '#5a5050', dark: '#3a3434', light: '#7a7068' };
  const DEAD_FAR = { bark: '#848080', dark: '#6a6666', light: '#9a9692' };   // further back: paler in the mist

  /** A soft strip of mist that tiles sideways (day / dusk / night versions). */
  function fogBank(seed, w, h) {
    const cv = ERX.makeCanvas(w, h), c = cv.getContext('2d'), rng = new U.RNG(seed);
    for (let i = 0; i < 46; i++) {
      const x = rng.range(0, w), y = rng.range(h * 0.3, h * 0.72), r = rng.range(10, 26);
      for (const ox of [-w, 0, w]) {                 // drawn three times over so it tiles without a seam
        const gr = c.createRadialGradient(x + ox, y, 0, x + ox, y, r);
        gr.addColorStop(0, 'rgba(238,246,248,0.5)');
        gr.addColorStop(1, 'rgba(238,246,248,0)');
        c.fillStyle = gr;
        c.fillRect(x + ox - r, y - r, r * 2, r * 2);
      }
    }
    return tod3(cv);
  }
  /** One vertical strip of a fog bank, faded by a (so the bank thins out where the fog does). */
  function drawTodStrip(ctx, L, layer, sx, sw, sh, dx, dy, a) {
    ctx.globalAlpha = a;
    ctx.drawImage(layer.day, sx, 0, sw, sh, dx, dy, sw, sh);
    if (L.dusk > 0.02) { ctx.globalAlpha = a * L.dusk * (1 - L.night); ctx.drawImage(layer.dusk, sx, 0, sw, sh, dx, dy, sw, sh); }
    if (L.night > 0.02) { ctx.globalAlpha = a * L.night; ctx.drawImage(layer.night, sx, 0, sw, sh, dx, dy, sw, sh); }
    ctx.globalAlpha = 1;
  }
  /** A dead tree: a crooked trunk and bare, forking limbs (a PixelBuffer, roots at the bottom middle). */
  function deadTree(rng, h, pal = DEAD) {
    const w = Math.round(h * 1.1), b = new PB(w, h + 2), cx = Math.floor(w / 2);
    const bark = c32(pal.bark), dark = c32(pal.dark), light = c32(pal.light);
    const limb = (x0, y0, ang, len, depth) => {
      const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
      b.line(x0, y0, x1, y1, depth === 0 ? dark : bark);
      if (depth === 0) b.line(x0 + 1, y0, x1 + 1, y1, bark);   // the big limbs are 2px thick
      if (depth < 2) for (const s of [-1, 1]) limb(x1, y1, ang + s * rng.range(0.3, 0.7), len * rng.range(0.45, 0.65), depth + 1);
    };
    let x = cx;
    const lean = rng.range(-0.25, 0.25), crown = Math.round(h * 0.4);
    for (let y = h + 1; y > crown; y--) {
      const k = (h + 1 - y) / h, tw = Math.max(1, Math.round(3.4 - k * 2.4));
      x += lean * 0.5 + (rng.next() < 0.15 ? rng.range(-0.6, 0.6) : 0);
      for (let i = 0; i < tw; i++) b.set(Math.round(x) - Math.floor(tw / 2) + i, y, i === 0 ? dark : i === tw - 1 ? light : bark);
      if (y < h * 0.8 && rng.next() < 0.1) limb(x, y, -Math.PI / 2 + (rng.next() < 0.5 ? -1 : 1) * rng.range(0.6, 1.1), rng.range(h * 0.16, h * 0.28), 1);
    }
    for (let i = 0; i < 3; i++) limb(x, crown, -Math.PI / 2 + (i - 1) * rng.range(0.4, 0.8), rng.range(h * 0.22, h * 0.34), 0);
    b.set(cx - 2, h + 1, dark); b.set(cx + 2, h + 1, dark); b.set(cx - 3, h + 1, bark);   // roots
    return b;
  }

  class World1Level extends ERX.CaveLevel {
    configure() {
      this.W = MAP.W;
      this.H = 30;
      this.pal = PAL;
      this.sections = [];
      this.id = 'world1';
    }

    build() {
      this.tiles.fill(AIR);
      this.surfRow = 27;
      for (let x = 0; x < this.W; x++) for (let y = this.surfRow; y < this.H; y++) this.setTile(x, y, ROCK);
      // the edges: a giant old tree on the left, and the cliff (with the cave in it) at the far end
      for (let y = 0; y < this.H; y++) for (const x of [0, 1, 2]) this.setTile(x, y, ROCK);
      for (let y = 0; y < this.H; y++) for (let x = MAP.cave; x < this.W; x++) this.setTile(x, y, ROCK);
      this.floorY = this.surfRow * TS;
      this.landX = 38 * TS;                 // where you come down
      this.checkshotX = 18 * TS + 8;        // the first Checkshot
      this.fogStart = MAP.fogStart * TS;    // the fog starts creeping in here...
      this.fogFull = MAP.fogFull * TS;      // ...and from here on you're in the fog zone
      this.caveX = MAP.cave * TS;           // the face of the cliff
      this.wispMinX = (this.fogStart + this.fogFull) / 2;   // wisps won't drift out of the thick of the fog
      this.wispMaxX = this.caveX - 4;
      this.wispMarks = MAP.wisps.map(([tx, n]) => ({ x: tx * TS, n, done: false }));
      this.spawn = { x: this.landX, y: this.floorY };
      this.checkpoints = [this.spawn];
      this.fallHeight = FALL;
      this.cloudAlt = CLOUDS;
      this.decor = [];
      this.lights = [];
      this.torches = [];
      this.braziers = [];
      this.signs = [
        { x: 52 * TS + 8, y: this.floorY, text: 'WORLD 1  ->\nFog ahead. Mind the goblins.\n(And whatever lives in the fog.)', read: false },
        { x: this.caveX - 40, y: this.floorY, text: 'DO NOT ENTER.', read: false },
      ];
      this.chalk = [];
      this.npcs = [];
      // the meadow's monsters, spread out along the way so you meet them one at a time
      // (the wisps aren't here: they drift out of the fog as you go through it, see update())
      this.enemySpawns = [
        { type: 'slime', x: 50 * TS },
        { type: 'goblin', x: 64 * TS },
        { type: 'spewer', x: 78 * TS, facing: -1 },
        { type: 'goblinThrower', x: 92 * TS },
        { type: 'goblinMage', x: 106 * TS },
      ];
      this.dark = 0;
      this.saidFog = false;
      // critters + swaying grass (set up in buildLife)
      this.grass = null;
      this.critters = [];
    }

    /**
     * The barricade's been smashed: open up the cave mouth so you can walk in
     * (the game screen takes you into the old cave once you're inside it).
     * quiet = it was already open (you broke in on an earlier visit).
     */
    openCave(g, quiet) {
      this.caveOpen = true;
      for (let tx = MAP.cave; tx < MAP.cave + 3; tx++) for (let ty = this.surfRow - 3; ty < this.surfRow; ty++) this.setTile(tx, ty, AIR);
      if (quiet) return;
      g.saveFlag('caveOpen');
      g.thinkAloud('The sign DID say do not enter...');
    }

    /**
     * Before it's drawn (the game screen calls this): been down through the old cave? Then it caved in behind you.
     * The cliff's a heap of rubble now, the path runs on over it... and on the other side of it is Normalton.
     */
    prepare(g) {
      const pr = (g.character && g.character.progress) || {};
      if (!(pr.caveFell || pr.trialDone || pr.bossDefeated || pr.normalton || ['deeperEnds', 'abyss', 'village'].indexOf(pr.stage) !== -1)) return;
      this.rubble = true;
      this.caveOpen = false;
      for (let ty = 0; ty < this.surfRow; ty++) for (let tx = MAP.cave; tx < this.W; tx++) this.setTile(tx, ty, AIR);
      const sign = this.signs.find((sg) => sg.text === 'DO NOT ENTER.');
      if (sign) sign.text = 'DO NOT ENT\n(The rest of the sign is under a rock.)';
      this.villageX = this.pw - 2 * TS;       // walk on past here, and you're in Normalton
    }

    /** How foggy it is at x: 0 in the meadow, thickening through the fringe, 1 in the fog zone. */
    fogAt(x) {
      const k = U.clamp((x - this.fogStart) / (this.fogFull - this.fogStart), 0, 1);
      return k * k * (3 - 2 * k);
    }
    /** How fast you can walk at x (the player asks): you wade slowly through the fog. */
    speedAt(x) { return 1 - MAP.slow * this.fogAt(x); }
    /** The fog zone is gloomy, so the wisps glow in it. */
    darknessAt(x) { return Math.min(0.55, this.dark + 0.16 * this.fogAt(x || 0)); }
    renderBackground() { return ERX.makeCanvas(16, 16); }

    /** The ground: thick grass over layered soil (greying in the fog), then the cliff with the boarded-up cave. */
    renderTiles() {
      const W = this.pw, H = this.ph, b = new PB(W, H), n = new U.Noise(0x9a55);
      const s = SOIL.map(c32), st = ['#b8b0b4', '#8e8894', '#625c6a'].map(c32), root = c32('#5a3a22');
      const top = this.floorY, cave = this.caveX;
      const grassAt = new Map();   // grass colours by how foggy it is (16 steps)
      const greens = (x) => {
        const q = Math.round(this.fogAt(x) * 16);
        if (!grassAt.has(q)) grassAt.set(q, GRASS.map((g, i) => c32(mix(g, GRASS_FOG[i], (q / 16) * 0.85))));
        return grassAt.get(q);
      };
      const groundEnd = this.rubble ? W : cave, rubble0 = cave - 5 * TS;
      for (let x = 3 * TS; x < groundEnd; x++) {
        const g = greens(x);
        const lip = Math.round((n.n1(x * 0.21) - 0.5) * 2);           // the grass edge wobbles a little
        for (let y = top + lip; y < H; y++) {
          const d = y - top - lip;
          let col;
          // (where the cliff came down: the path's a field of broken rock)
          if (this.rubble && x >= rubble0 && d < 6 && n.n2(x * 0.16, y * 0.34) > 0.42 - Math.min(1, (x - rubble0) / (4 * TS)) * 0.3) { const v = n.n2(x * 0.45, y * 0.45); col = v > 0.66 ? st[0] : v > 0.4 ? st[1] : st[2]; }
          else if (d === 0) col = g[0];
          else if (d < 3) col = g[1];
          else if (d < 5) col = ERX.bayer(x, y) < 0.6 ? g[2] : g[1];
          else if (d < 7) col = ERX.bayer(x, y) < 0.5 ? g[3] : s[0];
          else {
            const k = U.clamp((d - 7) / 40, 0, 0.999), band = Math.floor(k * (s.length - 1) + ERX.bayer(x, y) * 0.9);
            col = s[Math.min(s.length - 1, band)];
            const stone = n.n2(x * 0.32, y * 0.42);
            if (stone > 0.83) col = st[stone > 0.87 ? 0 : 1];
            else if (stone > 0.81) col = st[2];
            if (n.n2(x * 0.5, y * 0.05) > 0.83 && d < 26) col = root;
          }
          b.data[y * W + x] = col;
        }
        // tufts of grass poking up over the edge
        const r = n.n1(x * 1.7 + 5);
        if (r > 0.42) b.set(x, top + lip - 1, g[r > 0.7 ? 0 : 1]);
        if (r > 0.66) b.set(x, top + lip - 2, g[0]);
      }

      // ---- the cliff at the end of the road: lit at its face, darker further in, mossy on top ----
      // (unless it's come down: then there's nothing but the rubble: renderBackWall)
      if (this.rubble) return b.toCanvas();
      const rk = PAL.rock.map(c32), edge = c32(PAL.outline);
      for (let x = cave; x < W; x++) {
        const u = x - cave;
        const ctop = Math.round(top - (118 + 54 * (1 - Math.exp(-u / 46))) + (n.n1(x * 0.07 + 3) - 0.5) * 16);
        for (let y = Math.max(0, ctop); y < H; y++) {
          const d = y - ctop, tex = n.n2(x * 0.09, y * 0.11);
          let i = u < 2 ? 1 : u < 6 ? 2 : 3;
          if (tex > 0.62) i -= 1; else if (tex < 0.32) i += 1;
          if (Math.sin(y * 0.35 + n.n1(x * 0.05) * 3) > 0.86) i += 1;     // strata
          let col = rk[U.clamp(i, 0, 5)];
          if (d < 3) col = c32(d === 0 ? '#5a8a5a' : d === 1 ? '#4a7a4e' : '#3a5a40');   // a mossy lip along the top
          b.data[y * W + x] = col;
        }
        if (ctop - 1 >= 0) b.data[(ctop - 1) * W + x] = edge;
      }
      for (let y = 0; y < top; y++) if (b.solid(cave, y)) b.set(cave - 1, y, edge);   // outline the face

      // ---- the cave mouth: an arch in the cliff, framed in big stones, black inside ----
      const mx0 = cave + 8, mw = 40, mh = 54, gy = top, mcx = mx0 + mw / 2, r = mw / 2, archY = gy - mh + r;
      const inMouth = (x, y) => {
        if (y >= gy || y < gy - mh) return false;
        const dx = Math.abs(x + 0.5 - mcx);
        if (y >= archY) return dx <= r;
        const dy = archY - y;
        return dx * dx + dy * dy <= r * r;
      };
      for (let y = gy - mh - 4; y < gy; y++) {
        for (let x = mx0 - 4; x < mx0 + mw + 4; x++) {
          if (inMouth(x, y)) {
            const rim = !inMouth(x - 2, y) || !inMouth(x + 2, y) || !inMouth(x, y - 2);
            b.data[y * W + x] = c32(rim ? '#2a2030' : ERX.bayer(x, y) < 0.15 ? '#1a1220' : '#0e0a14');
          } else if (inMouth(x - 3, y) || inMouth(x + 3, y) || inMouth(x, y + 3) || inMouth(x, y - 3)) {
            const sv = n.n2(x * 0.4, y * 0.4);
            b.data[y * W + x] = c32(sv > 0.55 ? '#a8a0a8' : sv > 0.4 ? '#8e8894' : '#625c6a');
          }
        }
      }
      // (the planks boarding it up are a live thing you can smash: ERX.Enemies.Barricade, see openCave)
      // a few rocks fallen at the foot of the cliff
      for (const [dx, rx, ry] of [[-7, 4, 3], [-15, 3, 2], [3, 5, 3]]) {
        b.ellipse(cave + dx, gy - ry + 1, rx, ry, rk[2]);
        b.ellipse(cave + dx - 1, gy - ry, rx - 1, ry - 1, rk[1]);
      }
      return b.toCanvas();
    }

    /** Behind the path (drawn over the sky): big old trees, bushes, rocks, flowers... and dead trees in the fog. */
    renderBackWall() {
      const W = this.pw, H = this.ph, b = new PB(W, H), rng = new U.RNG(0x7ee5), gy = this.floorY + 1;
      const meadowEnd = this.fogStart, cave = this.caveX;
      const blit = (src, x, yBottom) => { for (let yy = 0; yy < src.h; yy++) for (let xx = 0; xx < src.w; xx++) { const v = src.data[yy * src.w + xx]; if (v) b.set(Math.round(x - src.w / 2) + xx, Math.round(yBottom - src.h) + yy, v); } };
      // a soft row of distant trees right behind the path: greyer as the fog comes in, then dead
      for (let x = 3 * TS; x < cave - TS; x += this.fogAt(x) > 0.6 ? rng.int(22, 40) : rng.int(10, 18)) {
        const k = this.fogAt(x);
        if (k > 0.6) { blit(deadTree(rng, rng.int(16, 26), DEAD_FAR), x, gy - 3); continue; }
        const tr = rng.next() < 0.5 ? P.roundTree(rng, rng.int(6, 10), k > 0.2 ? TREE_FOG : TREE_BACK) : P.pineTree(rng, rng.int(14, 24), k > 0.2 ? PINE_FOG : { dark: '#2e6a4a', mid: '#3e7e56', light: '#5a9a6a', trunk: '#5a4a3a' });
        blit(tr, x, gy - 3);
      }
      // the big trees of the meadow (not where you land, not on the Checkshot)
      const spots = [[6, 'oak'], [10, 'pine'], [13, 'blossom'], [24, 'oak'], [27, 'birch'], [30, 'pine'], [46, 'blossom'], [49, 'oak'], [53, 'birch'], [56, 'pine'], [63, 'oak'], [67, 'blossom'], [72, 'pine'], [76, 'oak']];
      const more = new U.RNG(0xb16), kinds = ['oak', 'pine', 'birch', 'blossom'];
      for (let tx = 81; tx < MAP.fogStart - 2; tx += more.int(4, 8)) spots.push([tx, kinds[more.int(0, 3)]]);
      const BLOSSOM = { dark: '#c8508a', mid: '#f07ab4', light: '#ffb4d8', hi: '#ffe4f2', trunk: '#7a4a3a', trunkDark: '#5a3428', outline: '#3a1a2a' };
      for (const [tx, kind] of spots) {
        const x = tx * TS + rng.int(-4, 4);
        if (kind === 'birch') { const h = rng.int(44, 60); for (let y = 0; y < h; y++) { b.set(x, gy - y, c32(y % 7 === 3 ? '#3a3440' : '#f0ece4')); b.set(x + 1, gy - y, c32(y % 9 === 5 ? '#3a3440' : '#d8d2c8')); } blit(P.roundTree(rng, rng.int(9, 12), { dark: '#4e9a3c', mid: '#7ac04a', light: '#a8e06a', hi: '#d8f8a0', trunk: '#f0ece4', trunkDark: '#d8d2c8', outline: '#1a2a1e' }), x, gy - h + 18); continue; }
        const tr = kind === 'pine' ? P.pineTree(rng, rng.int(38, 56), PINE) : P.roundTree(rng, rng.int(13, 21), kind === 'blossom' ? BLOSSOM : TREE);
        blit(tr, x, gy + 1);
        if (kind === 'blossom') for (let i = 0; i < 10; i++) b.set(x + rng.int(-18, 18), gy - rng.int(0, 2), c32(rng.pick(['#ffb4d8', '#f07ab4', '#ffffff'])));   // petals on the grass
      }
      // big dead trees standing in the fog
      for (let tx = MAP.fogStart + 1; tx < MAP.cave - 3; tx += more.int(6, 11)) blit(deadTree(more, more.int(46, 70)), tx * TS + more.int(-4, 4), gy + 1);
      // bushes, rocks, flowers in the meadow
      const bush = (x, r) => { const cy = gy - r + 1; for (const [dx, dy, rr] of [[0, 0, r], [-r * 0.7, 2, r * 0.75], [r * 0.7, 2, r * 0.7]]) { b.circle(x + dx, cy + dy, rr, c32('#2c7a36')); b.circle(x + dx - 1, cy + dy - 1, rr - 1, c32('#46a043')); b.circle(x + dx - rr * 0.3, cy + dy - rr * 0.35, rr * 0.4, c32('#7cd055')); } if (rng.next() < 0.5) for (let i = 0; i < 4; i++) b.set(Math.round(x + rng.range(-r, r)), Math.round(cy + rng.range(-r * 0.5, r * 0.5)), c32(rng.pick(['#ff4a5a', '#ffd34d', '#ffffff']))); };
      const mTiles = MAP.fogStart - 4;
      for (let i = 0; i < 26; i++) { const x = rng.int(4, mTiles) * TS + rng.int(0, 15); if (Math.abs(x - this.landX) < 40 || Math.abs(x - this.checkshotX) < 26) continue; bush(x, rng.int(4, 7)); }
      const rock = (x, r, mossy) => { b.ellipse(x, gy - r * 0.55, r, r * 0.7, c32('#7e7884')); b.ellipse(x - 1, gy - r * 0.7, r * 0.8, r * 0.5, c32('#a8a0a8')); b.ellipse(x - r * 0.3, gy - r * 0.95, r * 0.45, r * 0.25, c32(mossy ? '#7ae05a' : '#8a9a88')); };
      for (let i = 0; i < 11; i++) { const x = rng.int(4, mTiles) * TS + 8; if (Math.abs(x - this.landX) < 30 || Math.abs(x - this.checkshotX) < 22) continue; rock(x, rng.int(3, 6), true); }
      for (let x = 3 * TS; x < meadowEnd; x += rng.int(2, 7)) { if (rng.next() < this.fogAt(x) * 1.6) continue; const col = c32(rng.pick(FLOWERS)), y = gy - rng.int(2, 5); b.set(x, y + 1, c32('#3e9a3c')); b.set(x, y + 2, c32('#3e9a3c')); b.set(x, y, col); if (rng.next() < 0.4) { b.set(x - 1, y, col); b.set(x + 1, y, col); b.set(x, y - 1, col); } }
      // in the fog: grey rocks and dead, twiggy shrubs
      for (let tx = MAP.fogStart; tx < MAP.cave - 2; tx += more.int(3, 6)) {
        const x = tx * TS + more.int(0, 15);
        if (more.next() < 0.45) rock(x, more.int(3, 6), false);
        else for (let i = 0; i < 5; i++) b.line(x, gy - 1, x + more.int(-6, 6), gy - more.int(4, 10), c32(i % 2 ? DEAD.bark : DEAD.dark));
      }
      // the cliff that came down: a heap of broken rock (greyed in the fog), the planks that boarded up the cave in it
      if (this.rubble) {
        const x0 = cave - 3 * TS, x1 = this.pw, rocks = [];
        for (let i = 0; i < 120; i++) {
          const u = more.next(), x = x0 + u * (x1 - x0), peak = u < 0.35 ? 30 + (u / 0.35) * 70 : 100 - ((u - 0.35) / 0.65) * 55;
          const r = more.int(5, 15);
          rocks.push({ x, y: gy - more.range(0, Math.max(0, peak - r)), r, mossy: more.next() < 0.3 });
        }
        rocks.sort((a, b2) => a.y - b2.y);
        for (const k of rocks) {
          b.ellipse(Math.round(k.x), Math.round(k.y), k.r, Math.round(k.r * 0.75), c32('#625c64'));
          b.ellipse(Math.round(k.x - 1), Math.round(k.y - 1), k.r - 1, Math.round(k.r * 0.75) - 1, c32('#7e787e'));
          b.ellipse(Math.round(k.x - k.r * 0.3), Math.round(k.y - k.r * 0.35), Math.round(k.r * 0.4), Math.round(k.r * 0.25), c32(k.mossy ? '#6a8a6a' : '#9a9496'));
        }
        for (let i = 0; i < 7; i++) { const px = x0 + more.range(10, x1 - x0 - 10), py = gy - more.range(4, 40), a = more.range(-0.9, 0.9), L2 = more.int(14, 26); b.line(Math.round(px), Math.round(py), Math.round(px + Math.cos(a) * L2), Math.round(py + Math.sin(a) * L2), c32('#7a5236')); b.line(Math.round(px), Math.round(py + 1), Math.round(px + Math.cos(a) * L2), Math.round(py + 1 + Math.sin(a) * L2), c32('#a8784a')); }
      }
      // the giant old tree on the far left: you are not getting past this
      const tx = 2 * TS;
      for (let y = 0; y < gy; y++) { const w = 26 + Math.round(Math.max(0, (y - gy + 40) * 0.5)); for (let xx = -w; xx <= Math.round(w * 0.4); xx++) { const edge = xx < -w + 3 ? 2 : xx > w * 0.4 - 3 ? 0 : 1; b.set(tx + xx, y, c32(['#a07048', '#7a5236', '#5a3a28'][edge === 1 ? (ERX.bayer(tx + xx, y) < 0.15 ? 2 : 1) : edge])); } }
      for (let i = 0; i < 26; i++) { const cx = tx + rng.int(-40, 30), cy = rng.int(-10, gy - 120); b.circle(cx, cy, rng.int(18, 34), c32('#2c7a36')); b.circle(cx - 3, cy - 3, rng.int(12, 22), c32('#46a043')); }
      b.outline(c32('#1a1424'));
      return b.toCanvas();
    }

    /** In front of you: grass tufts along the bottom edge (grey in the fog) and leaves from the giant tree. */
    renderFront() {
      const W = this.pw, H = this.ph, b = new PB(W, H), rng = new U.RNG(0xf00d), gy = this.floorY + 2;
      for (let x = 3 * TS; x < this.caveX - 4; x += rng.int(8, 26)) {
        const h = rng.int(3, 7), pal = this.fogAt(x) > 0.5 ? GRASS_FOG : GRASS;
        for (let i = 0; i < h + 3; i++) { const bx = x + rng.int(-3, 3), bh = rng.int(2, h); for (let yy = 0; yy < bh; yy++) b.set(bx + Math.round((yy / bh) * rng.range(-1, 1)), gy - yy, c32(yy > bh - 2 ? pal[0] : pal[2])); }
      }
      for (let i = 0; i < 14; i++) { const cx = 2 * TS + rng.int(-10, 40), cy = rng.int(4, 120); b.circle(cx, cy, rng.int(6, 12), c32('#2c7a36')); b.circle(cx + 2, cy - 2, rng.int(3, 6), c32('#46a043')); }
      if (this.rubble) for (let x = this.caveX - 2 * TS; x < this.pw - 8; x += rng.int(22, 44)) { const r = rng.int(2, 4); b.ellipse(x, gy - r + 1, r + 1, r, c32('#625c64')); b.ellipse(x - 1, gy - r, r, r - 1, c32('#8e8894')); }
      return b.toCanvas();
    }

    // ---------------------------------------------------------- live bits
    /** Swaying grass + critters (and motes of mist in the fog), set up once. */
    buildLife() {
      const rng = new U.RNG(0x11fe), meadow = [4 * TS, this.fogStart - 4 * TS];
      this.grass = new P.Grass();
      for (let x = 3 * TS; x < this.caveX - 2; x += rng.int(1, 3)) {
        const fog = rng.next() < this.fogAt(x);
        this.grass.add(x, this.floorY - 1, rng.int(2, 6), rng.pick(fog ? [GRASS_FOG[1], GRASS_FOG[2], GRASS_FOG[0], GRASS_FOG[3]] : ['#86d84e', '#5cb844', '#b4f06a', '#3e9a3c']), rng.range(0, 6));
      }
      for (let i = 0; i < 14; i++) this.critters.push({ kind: 'fly', x: rng.range(meadow[0], meadow[1]), y: this.floorY - rng.range(10, 60), ph: rng.range(0, 6), c: rng.pick(['#ffd34d', '#ff8ad8', '#8ad8ff', '#ffffff']), vx: rng.range(-12, 12) });
      for (let i = 0; i < 40; i++) this.critters.push({ kind: 'glow', x: rng.range(meadow[0], meadow[1]), y: this.floorY - rng.range(6, 80), ph: rng.range(0, 6) });
      for (let i = 0; i < 9; i++) this.critters.push({ kind: 'leaf', x: rng.range(meadow[0], meadow[1]), y: rng.range(this.floorY - 160, this.floorY - 20), ph: rng.range(0, 6), c: rng.pick(['#46a043', '#7cd055', '#c8a040']) });
      for (let i = 0; i < 44; i++) this.critters.push({ kind: 'mote', x: rng.range(this.fogStart, this.caveX), y: this.floorY - rng.range(4, 110), ph: rng.range(0, 6), sp: rng.range(4, 9) });
    }

    /** The clock, the critters, and the fog zone (it slows you, and wisps drift out of it). g = the game screen. */
    update(dt, g) {
      if (!this.grass) this.buildLife();
      g.worldTod = ((g.worldTod === undefined ? 0.12 : g.worldTod) + dt / DAY) % 1;
      const L = lightAt(g.worldTod);
      this.L = L;
      this.dark = Math.min(0.5, L.night * 0.5 + L.dusk * 0.08);
      ERX.World1 = ERX.World1 || {};
      ERX.World1.night = L.night;
      const m0 = 4 * TS, m1 = this.fogStart - 4 * TS;
      for (const c of this.critters) {
        c.ph += dt;
        if (c.kind === 'fly') { c.x += (c.vx + Math.sin(c.ph * 0.7) * 14) * dt; c.y += Math.sin(c.ph * 2.3) * 12 * dt; if (c.x < m0 || c.x > m1) c.vx = -c.vx; }
        else if (c.kind === 'glow') { c.x += Math.sin(c.ph * 0.6) * 6 * dt; c.y += Math.cos(c.ph * 0.9) * 5 * dt; }
        else if (c.kind === 'leaf') { c.y += 14 * dt; c.x += Math.sin(c.ph * 1.6) * 16 * dt; if (c.y > this.floorY - 2) { c.y = this.floorY - 170; c.x = m0 + Math.random() * (m1 - m0); } }
        else if (c.kind === 'mote') { c.y -= c.sp * dt; c.x += Math.sin(c.ph * 0.8) * 4 * dt; if (c.y < this.floorY - 120) { c.y = this.floorY - 2; c.x = this.fogStart + Math.random() * (this.caveX - this.fogStart); } }
      }
      // the fog zone
      const p = g.player;
      if (!p) return;
      if (!this.saidFog && this.fogAt(p.cx) > 0.4) { this.saidFog = true; g.thinkAloud('Getting hard to see out here...'); }
      // wisps drift out of the fog ahead of you as you go deeper (walking it from the east, over the rubble: ahead is west)
      const dir = this.fromEast ? -1 : 1;
      for (const m of this.wispMarks) {
        if (m.done || (dir > 0 ? p.cx < m.x : p.cx > m.x)) continue;
        m.done = true;
        for (let i = 0; i < m.n; i++) {
          const x = U.clamp(p.cx + dir * (U.lerp(90, 150, Math.random()) + i * 30), this.wispMinX + 8, this.wispMaxX - 8);
          const e = ERX.Enemies.create(g, { type: 'wisp', x, y: this.floorY - U.lerp(36, 80, Math.random()) });
          if (e) g.enemies.push(e);
        }
      }
    }

    /** Grass and critters, drawn over the ground (before the characters). */
    drawLive(ctx, cam, g) {
      if (!this.grass) return;
      const t = g.t, ox = -cam.ix, oy = -cam.iy, L = this.L || lightAt(0.12);
      const wind = (x, tt, ph) => Math.sin(tt * 1.6 + x * 0.05 + ph) * 1.2 + Math.sin(tt * 0.5 + x * 0.01) * 0.8;
      this.grass.render(ctx, t, ox, oy, wind);
      for (const c of this.critters) {
        const x = Math.round(c.x + ox), y = Math.round(c.y + oy);
        if (x < -10 || x > cam.vw + 10) continue;
        if (c.kind === 'fly' && L.night < 0.6) { const f = Math.floor(c.ph * 14) % 2; ctx.globalAlpha = 1 - L.night; ctx.fillStyle = c.c; ctx.fillRect(x - 1, y - f, 1, 1); ctx.fillRect(x + 1, y - f, 1, 1); ctx.fillStyle = '#2a1a10'; ctx.fillRect(x, y, 1, 1); ctx.globalAlpha = 1; }
        else if (c.kind === 'glow' && L.night > 0.15) { const a = L.night * (0.5 + 0.5 * Math.sin(c.ph * 2.2)); ctx.globalAlpha = a * 0.35; ctx.fillStyle = '#d8ff6a'; ctx.fillRect(x - 1, y - 1, 3, 3); ctx.globalAlpha = a; ctx.fillStyle = '#f4ffb0'; ctx.fillRect(x, y, 1, 1); ctx.globalAlpha = 1; }
        else if (c.kind === 'leaf') { ctx.fillStyle = c.c; ctx.fillRect(x, y, 2, 1); ctx.fillRect(x + (Math.sin(c.ph * 3) > 0 ? 1 : 0), y + 1, 1, 1); }
        else if (c.kind === 'mote') { ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(c.ph * 1.7)); ctx.fillStyle = '#b8fff4'; ctx.fillRect(x, y, 1, 1); ctx.globalAlpha = 1; }
      }
    }

    /** Fireflies light up the night; anything that glows (wisps) lights up the fog. */
    liveLights(g) {
      const out = [], L = this.L;
      if (L && L.night >= 0.2) for (const c of this.critters) if (c.kind === 'glow') out.push({ x: c.x, y: c.y, r: 14, color: '#d8ff6a', intensity: L.night * (0.5 + 0.5 * Math.sin(c.ph * 2.2)) });
      if (g && g.enemies) for (const e of g.enemies) if (e.light && !e.dead) out.push(e.light());
      return out;
    }

    /** The sky and everything far away (see Backdrop), washed out by the fog. g = the game screen. */
    drawSky(ctx, cam, vw, vh, g) {
      this.game = g;
      if (!this.backdrop || this.backdrop.vw !== vw || this.backdrop.vh !== vh) this.backdrop = new Backdrop(this, vw, vh);
      this.backdrop.draw(ctx, cam, vw, vh, g, this);
      const f = this.fogAt(cam.x + vw / 2);
      if (f > 0.01) { ctx.fillStyle = C.rgba(fogCol(this.L || lightAt(0.12)), +(0.72 * f).toFixed(3)); ctx.fillRect(0, 0, vw, vh); }
    }

    /**
     * The fog, over the world (the game screen calls this once everything's drawn,
     * before the damage numbers): banks of mist rolling along, and you can't see
     * far: it's clear right round you and thick further off.
     */
    drawFog(ctx, cam, vw, vh, g) {
      if (this.fogAt(cam.ix + vw) < 0.01) return;
      const L = this.L || lightAt(0.12), t = g.t;
      if (!this.fogBanks) this.fogBanks = [fogBank(0x5eed, 384, 64), fogBank(0xf06, 384, 48)];
      const banks = [
        { cv: this.fogBanks[0], y: this.floorY - 46, par: 1, drift: t * 7, a: 0.85 },     // low, along the ground
        { cv: this.fogBanks[1], y: this.floorY - 120, par: 0.85, drift: -t * 4, a: 0.6 },  // higher, drifting the other way
      ];
      for (const bk of banks) {
        const w = bk.cv.day.width, h = bk.cv.day.height, sy = Math.round(bk.y - cam.iy);
        if (sy > vh || sy + h < 0) continue;
        for (let sx = 0; sx < vw; sx += 8) {
          const a = this.fogAt(cam.ix + sx + 4) * bk.a;
          if (a < 0.01) continue;
          const src = Math.floor((((cam.ix * bk.par + sx + bk.drift) % w) + w) % w), sw = Math.min(8, w - src);
          drawTodStrip(ctx, L, bk.cv, src, sw, h, sx, sy, a);
          if (sw < 8) drawTodStrip(ctx, L, bk.cv, 0, 8 - sw, h, sx + sw, sy, a);
        }
      }
      const p = g.player, f = this.fogAt(p.cx);
      if (f > 0.01) {
        const x = p.cx - cam.ix, y = p.y + p.h / 2 - cam.iy, col = fogCol(L);
        const gr = ctx.createRadialGradient(x, y, 56, x, y, 180);
        gr.addColorStop(0, C.rgba(col, 0));
        gr.addColorStop(1, C.rgba(col, +(0.7 * f).toFixed(3)));
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, vw, vh);
      }
    }
  }

  World1Level.MAP = MAP;
  World1Level.DAY = DAY;
  World1Level.CHAOS_RED = 0.14;   // how much red Chaos puts in the sky
  World1Level.lightAt = lightAt;
  ERX.World1Level = World1Level;
})(window.ERX = window.ERX || {});
