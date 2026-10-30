/*
 * SCENE 1 — ABOVE THE CLOUDS
 * Floating islands with waterfalls pouring into a sea of clouds, seen from
 * a grassy ledge on our own floating island.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, PB = ERX.PixelBuffer, P = ERX.Paint, C = ERX.Color;
  const c32 = (h) => C.u32(h);

  const PAL = {
    sky: [[0, '#1f2d78'], [0.16, '#2a44a0'], [0.34, '#3a66c4'], [0.52, '#5590dc'], [0.7, '#82bdf0'], [0.86, '#b2dcf8'], [1, '#dcf2ff']],
    cloud: { hi: '#ffffff', mid: '#e6f2fe', lo: '#bfd8f2', deep: '#9fbfe6' },
    cloudFar: { hi: '#f2f8ff', mid: '#d4e6f8', lo: '#b4cfec', deep: '#9ab9e0' },
    farIsle: { top: '#a6c4ea', body: '#87a6d8', dark: '#7593c8', fall: '#dcecff' },
    grass: ['#9ce45c', '#5fc24a', '#3c9a3e', '#2c7436'],
    soil: ['#a8724a', '#8a5a3e', '#6c4434', '#50322c', '#3a2428'],
    rock: ['#8a8098', '#6a6078', '#4c4460'],
    outline: '#22182a',
    water: ['#ffffff', '#c4e6fb', '#7ec0f0', '#a8d8f8', '#4a8fd6'],
    tree: { dark: '#2c7436', mid: '#46a043', light: '#7cd055', hi: '#b8f070', trunk: '#7a4e34', trunkDark: '#53342a', outline: '#1f2a28' },
  };

  /** Floating island sprite with grass cap, layered soil and hanging vines. */
  function makeIsland(rng, w, o = {}) {
    const noise = new U.Noise(rng.int(1, 1e9));
    const room = o.treeRoom || 0;
    const depth = Math.round(w * rng.range(0.5, 0.72));
    const cap = Math.max(4, Math.round(w * 0.07));
    const h = room + cap + depth + 10;
    const buf = new PB(w, h);
    const surf = new Int16Array(w), bottom = new Int16Array(w);
    const topBase = room + 3;

    for (let x = 0; x < w; x++) {
      const u = (2 * x) / (w - 1) - 1;
      surf[x] = Math.round(topBase - (1 - u * u) * 2 + (noise.n1(x * 0.2) - 0.5) * 2);
      const taper = Math.pow(Math.max(0, 1 - Math.abs(u)), 0.75);
      const spike = noise.n1(x * 0.35) > 0.62 ? (noise.n1(x * 0.9) * 8) : 0;
      bottom[x] = Math.round(topBase + cap + depth * taper * (0.65 + 0.35 * noise.n1(x * 0.08)) + spike * taper);
      // round off the side walls
      const edge = Math.min(x, w - 1 - x);
      if (edge < 3) surf[x] += 3 - edge;
    }

    const G = PAL.grass.map(c32), S = PAL.soil.map(c32), R = PAL.rock.map(c32);
    for (let x = 0; x < w; x++) {
      const drip = Math.round(noise.n1(x * 0.7 + 30) * 3);
      for (let y = surf[x]; y <= bottom[x]; y++) {
        const d = y - surf[x];
        let col;
        if (d === 0) col = G[0];
        else if (d < 3) col = ERX.bayer(x, y) < 0.25 ? G[0] : G[1];
        else if (d < 4 + drip) col = G[2];
        else {
          const depthFrac = (y - surf[x]) / Math.max(1, bottom[x] - surf[x]);
          const band = Math.floor((y + noise.n2(x * 0.1, y * 0.1) * 5) / 5) % 3;
          let k = band === 0 ? 0 : band === 1 ? 1 : 1;
          k += Math.floor(depthFrac * 2.5);
          // light from the upper-left: right side darker
          const u = x / w;
          if (u > 0.62 + (noise.n2(x * 0.05, y * 0.05) - 0.5) * 0.2) k += 1;
          if (u < 0.25 && depthFrac < 0.5 && ERX.bayer(x, y) < 0.5) k -= 1;
          k = U.clamp(k, 0, S.length - 1);
          col = S[k];
          // embedded stones
          const st = noise.n2(x * 0.3 + 100, y * 0.3);
          if (st > 0.8) col = st > 0.85 ? R[1] : R[2];
          if (st > 0.9) col = R[0];
        }
        buf.set(x, y, col);
      }
    }
    // hanging vines and roots under the grass lip and underside
    const vineCount = Math.round(w / 9);
    for (let i = 0; i < vineCount; i++) {
      const x = rng.int(3, w - 4);
      const startY = rng.chance(0.6) ? surf[x] + 4 : bottom[x] - rng.int(0, 3);
      const len = rng.int(3, Math.max(4, Math.round(w * 0.14)));
      const green = startY < surf[x] + 8;
      for (let j = 0; j < len; j++) {
        const yy = startY + j;
        if (yy >= h - 1) break;
        buf.set(x + (j % 7 === 6 ? 1 : 0), yy, green ? (j % 3 === 2 ? G[1] : G[2]) : S[3]);
        if (green && j % 3 === 1 && rng.chance(0.5)) buf.set(x + 1, yy, G[1]);
      }
    }
    buf.outline(c32(PAL.outline));
    // re-highlight the grass top edge over the outline
    for (let x = 1; x < w - 1; x++) if (buf.get(x, surf[x]) === G[0] && ERX.bayer(x, surf[x]) < 0.3) buf.set(x, surf[x] + 1, G[0]);

    // trees / ruins on top
    if (o.trees) {
      for (let i = 0; i < o.trees; i++) {
        const r = Math.round(rng.range(o.treeMin || 4, o.treeMax || 7));
        const tree = P.roundTree(rng, r, PAL.tree);
        const tx = U.clamp(Math.round(rng.range(0.15, 0.85) * w), 4, w - 4);
        buf.blit(tree, tx - Math.floor(tree.w / 2), surf[tx] - tree.h + 2);
      }
    }
    if (o.pillar) {
      const px = Math.round(w * rng.range(0.2, 0.75));
      const ph = Math.round(room * 0.7);
      const base = surf[px];
      for (let y = 0; y < ph; y++) {
        for (let x = 0; x < 4; x++) {
          const col = x === 0 ? '#c8c2d8' : x === 3 ? '#6a6480' : '#a49cb8';
          if (y < 2 && x > 0 && x < 3 && (px + y) % 2) continue; // broken top
          buf.set(px + x, base - y, c32(col));
        }
        if (y % 5 === 0) buf.set(px + 1, base - y, c32('#8a82a0'));
      }
      buf.rect(px - 1, base - ph, 6, 1, c32('#d8d2e8'));
    }

    const fallSide = o.fallSide || (rng.chance(0.5) ? -1 : 1);
    const fx = fallSide < 0 ? Math.round(w * 0.12) : Math.round(w * 0.86);
    return { canvas: buf.toCanvas(), w, h, surf, bottom, fall: o.fall ? { x: fx, y: surf[fx] + 1 } : null };
  }

  /** Tiny distant island silhouette. */
  function farIsland(buf, rng, cx, cy, w) {
    const top = c32(PAL.farIsle.top), body = c32(PAL.farIsle.body), dark = c32(PAL.farIsle.dark);
    const depth = Math.round(w * rng.range(0.5, 0.8));
    for (let x = 0; x < w; x++) {
      const u = (2 * x) / (w - 1) - 1;
      const bottom = Math.round(depth * Math.pow(Math.max(0, 1 - Math.abs(u)), 0.8));
      for (let y = 0; y <= bottom + 1; y++) {
        const col = y === 0 ? top : x > w * 0.6 && ERX.bayer(cx + x, cy + y) < 0.5 ? dark : body;
        buf.set(cx - (w >> 1) + x, cy + y, col);
      }
    }
    // tiny trees
    let tx = cx - (w >> 1) + rng.int(2, 5);
    while (tx < cx + (w >> 1) - 3) {
      const r = rng.int(1, 3);
      if (rng.chance(0.7)) buf.circle(tx, cy - r + 1, r, top);
      tx += r + rng.int(1, 4);
    }
    if (rng.chance(0.6)) {
      const fx = cx - (w >> 1) + (rng.chance(0.5) ? 2 : w - 3);
      const len = rng.int(10, 30);
      for (let y = 1; y < len; y++) if (ERX.bayer(fx, cy + y) < 1 - y / len) buf.set(fx, cy + y, c32(PAL.farIsle.fall));
    }
  }

  // Sky creature (a distant gentle sky-whale), two frames.
  const WHALE = [
    [
      '...............#######......',
      '..........##############....',
      '##.....###################..',
      '###..######################.',
      '.##########################.',
      '..#########################.',
      '.###.....##################.',
      '##........#####.....######..',
      '...........###..............',
    ],
    [
      '...............#######......',
      '..........##############....',
      '.......###################..',
      '....#######################.',
      '.##########################.',
      '###########################.',
      '###......##################.',
      '..........#####.....######..',
      '............###.............',
    ],
  ];

  class SkyIslands extends ERX.Environment {
    build(W, H) {
      super.build(W, H);
      const M = this.M;
      const LW = W + M * 2;
      const rng = new U.RNG(this.seed);
      this.rng = rng.fork(99);

      // --- static sky with sun ---
      const sky = new PB(W, H);
      P.gradient(sky, PAL.sky, 0, Math.round(H * 0.82), 0.55);
      sky.rect(0, Math.round(H * 0.82), W, H, c32('#dcf2ff'));
      const sx = Math.round(W * 0.8), sy = Math.round(H * 0.17);
      P.glow(sky, sx, sy, H * 0.26, '#5f98de', 0.6, 2);
      P.glow(sky, sx, sy, H * 0.14, '#a4d2f6', 0.85, 1.6);
      P.glow(sky, sx, sy, H * 0.075, '#fff1c4', 1, 1.2);
      sky.circle(sx, sy, 8, c32('#fff6d8'));
      sky.circle(sx, sy, 6, c32('#ffffff'));
      // wispy high cirrus
      for (let i = 0; i < 14; i++) {
        const y = Math.round(rng.range(0.05, 0.42) * H), x = rng.int(-20, W);
        const len = rng.int(12, 50);
        sky.hline(x, x + len, y, c32(rng.chance(0.5) ? '#5c8ed8' : '#7aa8e6'));
        if (rng.chance(0.6)) sky.hline(x + 6, x + len - 8, y + 1, c32('#4a7ccc'));
      }
      this.skyCanvas = sky.toCanvas();

      // --- far sea of clouds at the horizon ---
      this.horizon = Math.round(H * 0.64);
      this.farSea = P.cloudBank(rng, 300, H - this.horizon + 4, PAL.cloudFar, { top: 3, rMin: 3, rMax: 8 });

      // --- distant islands (static parallax layer) ---
      const far = new PB(LW, H);
      const farCount = Math.max(4, Math.round(W / 70));
      for (let i = 0; i < farCount; i++) {
        const cx = Math.round(((i + rng.range(0.2, 0.8)) / farCount) * LW);
        farIsland(far, rng, cx, Math.round(rng.range(0.34, 0.6) * H), rng.int(10, 26));
      }
      this.farLayer = far.toCanvas();

      // --- drifting puffy clouds ---
      this.clouds = [];
      const cloudCount = Math.max(5, Math.round(W / 55));
      for (let i = 0; i < cloudCount; i++) {
        const cw = rng.int(34, 90), ch = Math.round(cw * rng.range(0.3, 0.42));
        this.clouds.push({
          canvas: P.cloud(rng, cw, ch, rng.chance(0.4) ? PAL.cloudFar : PAL.cloud).toCanvas(),
          x: rng.range(-cw, W), y: rng.range(0.08, 0.62) * H, speed: rng.range(1.5, 4.5), depth: rng.range(0.2, 0.45),
          front: false,
        });
      }

      // --- main floating islands ---
      const s = H / 270;
      const mk = (w, opts) => makeIsland(rng, Math.round(w * s), opts);
      this.islands = [
        Object.assign(mk(118, { treeRoom: 24, trees: 3, treeMin: 5, treeMax: 8, fall: true, fallSide: -1 }), { x: W * 0.02, y: H * 0.36, depth: 0.55, phase: 0 }),
        Object.assign(mk(96, { treeRoom: 30, trees: 1, pillar: true, fall: true, fallSide: 1 }), { x: W * 0.76, y: H * 0.24, depth: 0.5, phase: 2 }),
        Object.assign(mk(46, { treeRoom: 12, trees: 1, treeMin: 3, treeMax: 4, fall: true }), { x: W * 0.62, y: H * 0.56, depth: 0.42, phase: 4 }),
        Object.assign(mk(34, { treeRoom: 10, trees: 1, treeMin: 3, treeMax: 3 }), { x: W * 0.05, y: H * 0.06, depth: 0.35, phase: 1 }),
      ];

      // --- near sea of clouds ---
      this.nearY = Math.round(H * 0.8);
      this.nearSea = P.cloudBank(rng, 360, H - this.nearY + 6, PAL.cloud, { top: 4, rMin: 6, rMax: 14 });

      // --- foreground ledge (the island we stand on) ---
      this._buildForeground(rng, W, H, LW);

      // --- creatures & particles ---
      this.flock = new P.Flock(rng, { count: 6, W, yMin: H * 0.1, yMax: H * 0.5, speedMin: 10, speedMax: 18, color: '#203066', dir: 1 });
      this.whale = { x: rng.range(-60, W * 0.6), y: H * rng.range(0.24, 0.34), speed: 3.2 };
      this.whaleSprites = WHALE.map((rows) => ERX.Sprites.fromStrings(rows, { '#': '#6f90c8' }));
      this.motes = new P.Particles();
      this.streaks = new P.Particles();
      this.mist = new P.Particles();
      this.moteTimer = 0;
    }

    _buildForeground(rng, W, H, LW) {
      const fg = new PB(LW, H);
      const noise = new U.Noise(rng.int(1, 1e9));
      const G = PAL.grass.map(c32), S = PAL.soil.map(c32);
      const ledgeEnd = Math.round(LW * 0.36);
      this.ledgeTop = new Int16Array(LW).fill(H + 10);
      for (let x = 0; x < ledgeEnd + 6; x++) {
        const t = x / ledgeEnd;
        let top = Math.round(H * 0.84 + t * t * H * 0.05 + (noise.n1(x * 0.08) - 0.5) * 5);
        // cliff edge falls away at the right end
        if (x > ledgeEnd - 6) top += (x - (ledgeEnd - 6)) * 4;
        this.ledgeTop[x] = top;
        for (let y = top; y < H; y++) {
          const d = y - top;
          let col = d === 0 ? G[0] : d < 3 ? G[1] : d < 5 + Math.round(noise.n1(x * 0.6) * 3) ? G[2] : S[1 + Math.min(3, Math.floor(d / 9) + (ERX.bayer(x, y) < 0.3 ? 1 : 0))];
          if (d > 6 && noise.n2(x * 0.25, y * 0.25) > 0.72) col = c32(PAL.rock[1]);
          fg.set(x, y, col);
        }
      }
      // small rock outcrop at the bottom right
      const rx0 = Math.round(LW * 0.86);
      for (let x = rx0; x < LW; x++) {
        const u = (x - rx0) / (LW - rx0);
        const top = Math.round(H * 0.93 - Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.5) * H * 0.04 + (noise.n1(x * 0.2) - 0.5) * 3);
        this.ledgeTop[x] = top;
        for (let y = top; y < H; y++) {
          const d = y - top;
          fg.set(x, y, d === 0 ? G[0] : d < 2 ? G[1] : d < 4 ? G[2] : S[2 + (ERX.bayer(x, y) < 0.5 ? 1 : 0)]);
        }
      }
      fg.outline(c32(PAL.outline));

      // ancient broken pillar with vines
      const px = Math.round(LW * 0.07);
      const ph = Math.round(H * 0.16);
      const pb = this.ledgeTop[px + 3];
      for (let y = 0; y < ph; y++) {
        for (let x = 0; x < 9; x++) {
          if (y > ph - 4 && (x + y) % 3 === 0) continue;
          let col = x === 0 ? '#e0dcef' : x < 3 ? '#c4bed8' : x < 7 ? '#a49cb8' : '#7a7292';
          if (x === 4 && y % 2 === 0) col = '#8a82a2';
          if (y % 12 === 0) col = '#6e6688';
          fg.set(px + x, pb - y, c32(col));
        }
      }
      fg.rect(px - 2, pb - ph - 1, 13, 2, c32('#d0cae4'));
      fg.rect(px - 2, pb - ph + 1, 13, 1, c32('#6e6688'));
      for (let v = 0; v < 3; v++) {
        const vx = px + rng.int(1, 7);
        for (let y = pb - ph + 2; y < pb - rng.int(0, ph * 0.4); y++) if (rng.chance(0.85)) fg.set(vx + (y % 4 === 0 ? 1 : 0), y, G[(y % 3) === 0 ? 0 : 2]);
      }
      // flowers
      const flowerCols = ['#ff7ab8', '#ffe45c', '#ffffff', '#b48cff'].map(c32);
      for (let i = 0; i < 26; i++) {
        const x = rng.int(2, ledgeEnd - 8);
        const y = this.ledgeTop[x] - 1;
        const c = rng.pick(flowerCols);
        fg.set(x, y - 1, c);
        fg.set(x, y, G[2]);
      }
      this.fgLayer = fg.toCanvas();

      // swaying grass blades on top of the ledge
      this.grass = new P.Grass();
      const blades = ['#9ce45c', '#5fc24a', '#3c9a3e'];
      for (let x = 0; x < LW; x += rng.int(1, 3)) {
        if (this.ledgeTop[x] > H) continue;
        this.grass.add(x, this.ledgeTop[x] - 1, rng.int(2, 5), rng.pick(blades), rng.range(0, 6));
      }
    }

    update(dt, cam) {
      super.update(dt);
      const W = this.W, H = this.H;
      for (const c of this.clouds) {
        c.x -= c.speed * dt;
        if (c.x < -c.canvas.width - 30) c.x = W + 30;
      }
      if (!this.low) {
        this.flock.update(dt);
        this.whale.x += this.whale.speed * dt;
        if (this.whale.x > W + 80) { this.whale.x = -W * 0.8 - this.rng.range(0, W); this.whale.y = H * this.rng.range(0.22, 0.36); }

        // rising sparkle motes
        this.moteTimer -= dt;
        if (this.moteTimer <= 0 && this.motes.count < 40) {
          this.moteTimer = 0.15;
          this.motes.add({
            x: this.rng.range(0, W), y: H + 2, vx: this.rng.range(-2, 2), vy: -this.rng.range(6, 14),
            life: this.rng.range(8, 16), color: this.rng.chance(0.3) ? '#fff3b0' : '#ffffff', size: 1,
            wobble: 4, wobbleRate: 1.2, phase: this.rng.range(0, 6), blink: 3, fadeIn: 1, fadeOut: 2, alpha: 0.85,
          });
        }
        if (this.rng.chance(dt * 0.8) && this.streaks.count < 6) {
          this.streaks.add({
            x: -20, y: this.rng.range(0.1, 0.75) * H, vx: this.rng.range(60, 110), vy: 0, life: 8,
            len: this.rng.int(6, 16), color: '#ffffff', alpha: 0.35, fadeIn: 0.4, fadeOut: 1,
          });
        }
        // mist where waterfalls hit the cloud sea
        for (const isl of this.islands) {
          if (!isl.fall || !isl.mistX) continue;
          if (this.rng.chance(dt * 6)) {
            this.mist.add({
              x: isl.mistX + this.rng.range(-3, 5), y: this.nearY + this.rng.range(0, 6), vx: this.rng.range(-4, 4), vy: -this.rng.range(2, 6),
              life: this.rng.range(1, 2.2), color: '#ffffff', size: 2, grow: 2, fadeOut: 1, alpha: 0.7,
            });
          }
        }
      }
      this.motes.update(dt);
      this.streaks.update(dt);
      this.mist.update(dt);
    }

    _drawFall(ctx, x, y0, y1, width) {
      const W = PAL.water;
      const t = this.t;
      const len = y1 - y0;
      for (let j = 0; j < len; j++) {
        const y = y0 + j;
        const fade = j / len;
        for (let i = 0; i < width; i++) {
          // thin out toward the bottom with ordered dither
          if (fade > 0.55 && ERX.bayer(x + i, y) < (fade - 0.55) * 2.4) continue;
          const k = Math.floor((j - t * 38) / 3 + i * 1.7) & 3;
          ctx.fillStyle = i === 0 || i === width - 1 ? W[4] : W[k];
          ctx.fillRect(x + i, y, 1, 1);
        }
      }
    }

    render(ctx, cam) {
      const W = this.W, H = this.H;
      ctx.drawImage(this.skyCanvas, 0, 0);

      // far cloud sea scrolls slowly
      P.drawTiled(ctx, this.farSea, this.t * 2 + cam.x * 0.1, this.horizon + this.py(cam, 0.1), W);
      ctx.drawImage(this.farLayer, this.px(cam, 0.15), this.py(cam, 0.15));

      if (!this.low) {
        const fr = Math.floor(this.t * 1.2) % 2;
        ctx.drawImage(this.whaleSprites[fr], Math.round(this.whale.x - cam.x * 0.2), Math.round(this.whale.y + Math.sin(this.t * 0.4) * 2));
      }

      for (const c of this.clouds) ctx.drawImage(c.canvas, Math.round(c.x - cam.x * c.depth), Math.round(c.y - cam.y * c.depth));

      // floating islands bob gently; waterfalls pour off their edges
      for (const isl of this.islands) {
        const bob = this.low ? 0 : Math.round(Math.sin(this.t * 0.55 + isl.phase) * 1.6);
        const ix = Math.round(isl.x - cam.x * isl.depth);
        const iy = Math.round(isl.y - cam.y * isl.depth) + bob;
        if (isl.fall) {
          const fx = ix + isl.fall.x - 1;
          const fy = iy + isl.fall.y;
          isl.mistX = fx;
          this._drawFall(ctx, fx, fy, this.nearY + 6, Math.max(4, Math.round(isl.w / 18)));
        }
        ctx.drawImage(isl.canvas, ix, iy);
      }

      P.drawTiled(ctx, this.nearSea, this.t * 5 + cam.x * 0.7, this.nearY + this.py(cam, 0.6), W);
      this.mist.render(ctx);
      if (!this.low) this.flock.render(ctx, -cam.x * 0.5, 0);

      const fx = this.px(cam, 1);
      ctx.drawImage(this.fgLayer, fx, this.py(cam, 1));
      this.grass.render(ctx, this.t, fx, this.py(cam, 1), (x, t, ph) => Math.sin(t * 1.8 + ph + x * 0.05) * 1.6 + Math.max(0, Math.sin(t * 0.7 - x * 0.02)) * 1.5, this.low);

      this.motes.render(ctx);
      this.streaks.render(ctx);
    }
  }

  ERX.Backgrounds.register({
    id: 'sky',
    name: 'ABOVE THE CLOUDS',
    music: 'sky',
    ambience: 'sky',
    Env: SkyIslands,
  });
})(window.ERX = window.ERX || {});
