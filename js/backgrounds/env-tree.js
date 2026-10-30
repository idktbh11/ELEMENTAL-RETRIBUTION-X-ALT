/*
 * SCENE 3 — THE GREAT TREE
 * A colossal tree on a quiet hill. Someone rests against its trunk.
 * Leaves sway, light falls through the canopy, the meadow ripples in the wind.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, PB = ERX.PixelBuffer, P = ERX.Paint, C = ERX.Color, A = ERX.Actors;
  const c32 = (h) => C.u32(h);

  const PAL = {
    sky: [[0, '#3466b6'], [0.24, '#4a82ca'], [0.48, '#6ea4da'], [0.68, '#9cc6e6'], [0.84, '#cfe2e2'], [1, '#f2e4bc']],
    cloud: { hi: '#ffffff', mid: '#f2efe8', lo: '#d4d4de', deep: '#b6bcd0' },
    farMtn: { rock: ['#8eaed0', '#7896c0', '#84a2c8'], fade: '#bcd4e2' },
    farHills: ['#7fa6a8', '#6c9498', '#5e8890'],
    midHills: ['#86c05a', '#62a04a', '#4c8840'],
    meadow: ['#8cd05a', '#6cb04c', '#4f9440', '#3a7636', '#2c5e30'],
    bark: ['#9a6a44', '#7a5236', '#5a3a2a', '#3e2820', '#2a1a18'],
    moss: ['#6a8a3a', '#4e6e30'],
    leaves: ['#1e4a2a', '#2e6232', '#3f7f35', '#5aa040', '#86c64e', '#bce870'],
    light: '#fff4c8',
  };

  class GreatTree extends ERX.Environment {
    build(W, H) {
      super.build(W, H);
      const M = this.M, LW = W + M * 2;
      const rng = new U.RNG(this.seed);
      this.rng = rng.fork(3);
      const s = H / 270;
      this.s = s;

      // ---- sky ----
      const horizon = Math.round(H * 0.6);
      const sky = new PB(W, H);
      P.gradient(sky, PAL.sky, 0, horizon + 6, 0.55);
      sky.rect(0, horizon + 6, W, H, c32(PAL.farHills[1]));
      const sunX = Math.round(W * 0.12), sunY = Math.round(H * 0.12);
      P.glow(sky, sunX, sunY, H * 0.28, '#8cbce6', 0.6, 2);
      P.glow(sky, sunX, sunY, H * 0.14, '#d6ecf4', 0.85, 1.5);
      P.glow(sky, sunX, sunY, H * 0.07, '#fff6d6', 1, 1.2);
      sky.circle(sunX, sunY, 7, c32('#ffffff'));
      this.skyCanvas = sky.toCanvas();

      this.clouds = [];
      for (let i = 0; i < 6; i++) {
        const cw = rng.int(36, 84);
        this.clouds.push({ canvas: P.cloud(rng, cw, Math.round(cw * rng.range(0.32, 0.42)), PAL.cloud).toCanvas(), x: rng.range(-cw, W), y: rng.range(0.04, 0.4) * H, speed: rng.range(0.8, 2.2) });
      }

      // ---- distance ----
      const mh = Math.round(H * 0.2);
      const mtn = P.mountains(rng, LW, mh, { peaks: Math.max(3, Math.round(LW / 140)), minH: mh * 0.3, maxH: mh * 0.9, rock: PAL.farMtn.rock, snow: ['#eef4fa', '#c8d8ec'], snowLine: mh * 0.7, lean: 0.5, jag: 0.6, fade: { color: PAL.farMtn.fade, start: mh * 0.45, end: mh * 1.05 } });
      this.mtn = { canvas: mtn.canvas, y: horizon - mh + 4 };

      const fh = Math.round(H * 0.14);
      const farY = horizon - Math.round(fh * 0.5);
      const farHills = P.hills(rng, LW, H - farY, { base: fh * 0.6, amp: fh * 0.5, freq: 0.015, colors: PAL.farHills });
      for (let x = 0; x < LW; x += rng.int(2, 5)) {
        const t = farHills.top[x];
        const r = rng.int(1, 3);
        farHills.buf.circle(x, t + 1, r, c32(rng.chance(0.5) ? '#5e8890' : '#6c9498'));
      }
      this.farHills = { canvas: farHills.buf.toCanvas(), y: farY };

      const midY = horizon + Math.round(H * 0.02);
      const mh2 = H - midY;
      const midHills = P.hills(rng, LW, mh2, { base: H * 0.08, amp: H * 0.065, freq: 0.008, colors: PAL.midHills });
      const mhNoise = new U.Noise(rng.int(1, 1e9));
      for (let y = 0; y < mh2; y++) for (let x = 0; x < LW; x++) {
        if (y > midHills.top[x] + 3 && mhNoise.n2(x * 0.05, y * 0.15) > 0.62 && ERX.bayer(x, y) < 0.5) midHills.buf.set(x, y, c32('#5a9646'));
      }
      for (let i = 0; i < Math.round(LW / 90); i++) {
        const tx = rng.int(0, LW - 1);
        const tr = P.roundTree(rng, rng.int(3, 5), { dark: '#3a6e3a', mid: '#4f8a44', light: '#6aa850', trunk: '#5a4030', trunkDark: '#3e2c22' });
        midHills.buf.blit(tr, tx - (tr.w >> 1), midHills.top[tx] - tr.h + 3);
      }
      this.midHills = { canvas: midHills.buf.toCanvas(), y: midY };

      this._buildTree(rng, LW, H, s);
      this._buildForeground(rng, LW, H);

      // sitting figure (scenery, not a character)
      this.sitter = A.makePerson(rng, { hairStyle: 'hood', shirt: '#2f6a78', hoodColor: '#24525e', pants: '#3a3048' });
      this.leaves = new P.Particles();
      this.pollen = new P.Particles();
      this.flock = new P.Flock(rng, { count: 3, W, yMin: H * 0.08, yMax: H * 0.3, speedMin: 8, speedMax: 13, color: '#2e4470', dir: 1 });
      this.butterflies = [0, 1].map((i) => ({ x: rng.range(W * 0.1, W * 0.6), y: H * 0.85, p: rng.range(0, 10), col: i ? '#ffe45c' : '#ff9ad0' }));
      this.wisps = ERX.Color.ELEMENTS.map((col, i) => ({ col, p: i * 1.05, r: rng.range(26, 48) * s, sp: rng.range(0.18, 0.3), trail: [] }));
    }

    _buildTree(rng, LW, H, s) {
      const noise = new U.Noise(rng.int(1, 1e9));
      const ground = Math.round(H * 0.79);
      const baseX = Math.round(this.W * 0.78) + this.M;
      const canopyBase = Math.round(H * 0.42);
      this.tree = { baseX, ground, canopyBase };

      // ---- hill + meadow under the tree (midground) ----
      const hill = new PB(LW, H);
      const Mw = PAL.meadow.map(c32);
      this.hillTop = new Int16Array(LW);
      for (let x = 0; x < LW; x++) {
        const d = (x - baseX) / (this.W * 0.55);
        const top = Math.round(ground + 6 - Math.exp(-d * d * 2.2) * 10 * s + (noise.n1(x * 0.04) - 0.5) * 6 + Math.max(0, -d) * 4);
        this.hillTop[x] = top;
        for (let y = top; y < H; y++) {
          const dd = y - top;
          let col = dd === 0 ? Mw[0] : dd < 3 ? Mw[1] : dd < 10 && ERX.bayer(x, y) < 0.5 ? Mw[1] : Mw[2];
          if (dd > 12 && ERX.bayer(x, y) < (dd - 12) / 30) col = Mw[3];
          else if (dd > 3 && noise.n2(x * 0.06, y * 0.2) > 0.64 && ERX.bayer(x, y) < 0.5) col = Mw[2];
          hill.set(x, y, col);
        }
      }
      // tree shadow on the grass (sun is upper-left)
      for (let y = ground - 4; y < ground + 26 * s; y++) {
        for (let x = baseX - 20; x < baseX + 110 * s; x++) {
          const dx = (x - baseX - 40 * s) / (75 * s), dy = (y - ground - 6) / (14 * s);
          if (dx * dx + dy * dy < 1 && y >= this.hillTop[U.clamp(x, 0, LW - 1)] && hill.solid(x, y) && ERX.bayer(x, y) < 0.6) {
            const cur = hill.get(x, y);
            hill.set(x, y, cur === Mw[0] || cur === Mw[1] ? Mw[2] : Mw[3]);
          }
        }
      }
      // flowers and stones in the meadow
      const flowerCols = ['#ffffff', '#ffe45c', '#ff8ad0', '#9ab8ff', '#ff7a5a'].map(c32);
      for (let i = 0; i < LW / 4; i++) {
        const x = rng.int(0, LW - 1);
        const y = this.hillTop[x] + rng.int(1, H - this.hillTop[x] - 1);
        if (rng.chance(0.85)) { hill.set(x, y, rng.pick(flowerCols)); hill.set(x, y + 1, Mw[3]); }
      }
      this.hillCanvas = hill.toCanvas();

      // ---- trunk, roots and branches ----
      const tb = new PB(LW, H);
      const B = PAL.bark.map(c32);
      const trunkTop = canopyBase - Math.round(20 * s);
      const w0 = 16 * s, flare = 18 * s;
      const cxAt = (y) => baseX + Math.sin((ground - y) * 0.03) * 3 * s;
      const hwAt = (y) => w0 + flare * Math.exp(-(ground - y) / (9 * s));
      const barkColor = (x, y, u) => {
        const n = noise.n2(x * 0.7, y * 0.07);
        let v = 0.58 - u * 0.42 + (n - 0.5) * 0.55 + (ERX.bayer(x, y) - 0.5) * 0.14;
        if (n > 0.8) v -= 0.3; // deep bark grooves
        return v > 0.82 ? B[0] : v > 0.58 ? B[1] : v > 0.36 ? B[2] : v > 0.16 ? B[3] : B[4];
      };
      for (let y = trunkTop; y <= ground + 2; y++) {
        const cx = cxAt(y), hw = hwAt(y);
        for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
          const u = (x - cx) / hw;
          if (Math.abs(u) > 1) continue;
          let col = barkColor(x, y, u);
          if (u < -0.45 && y > ground - 50 * s && noise.n2(x * 0.3, y * 0.2) > 0.62) col = c32(PAL.moss[ERX.bayer(x, y) < 0.5 ? 0 : 1]);
          tb.set(x, y, col);
        }
      }
      // a knot hole
      tb.ellipse(baseX + 3, Math.round(ground - 46 * s), 2, 3, B[4]);
      tb.set(baseX + 2, Math.round(ground - 49 * s), B[1]);

      // roots sprawling over the hill
      const roots = [[-1, 46], [-1, 28], [1, 34], [1, 56], [-1, 64], [1, 18]];
      for (const [dir, len] of roots) {
        const L = len * s;
        const sx0 = baseX + dir * w0 * 0.6;
        const ex = baseX + dir * (w0 + L), ey = ground + rng.range(2, 7);
        const steps = Math.ceil(L);
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = U.lerp(sx0, ex, t);
          const y = U.lerp(ground - 8 * s, ey, Math.sqrt(t)) - Math.sin(t * Math.PI) * 2;
          const r = U.lerp(5 * s, 1, t);
          tb.circle(x, y, r, B[3]);
          tb.circle(x, y - 1, Math.max(0, r - 1), B[dir < 0 ? 1 : 2]);
          if (r > 2) tb.set(Math.round(x), Math.round(y - r), B[dir < 0 ? 0 : 1]);
        }
      }

      // branches
      this.branchEnds = [];
      const limbs = [[-95, -38, 6], [-52, -76, 6.5], [-8, -96, 7], [40, -84, 6], [88, -46, 6], [128, -20, 5]];
      for (const [dx, dy, r] of limbs) {
        const x0 = cxAt(trunkTop) + dx * 0.08 * s, y0 = trunkTop + 6;
        const x1 = baseX + dx * s, y1 = trunkTop + dy * s;
        const mx = U.lerp(x0, x1, 0.5) + rng.range(-8, 8) * s, my = U.lerp(y0, y1, 0.5) + 10 * s;
        const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1;
          const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1;
          const rr = U.lerp(r * s, 1.2, t);
          tb.circle(x, y, rr, B[3]);
          tb.circle(x - 0.6, y - 0.8, Math.max(0, rr - 1.2), B[2]);
          if (rr > 2.5) tb.circle(x - rr * 0.4, y - rr * 0.4, rr * 0.3, B[1]);
        }
        this.branchEnds.push({ x: x1, y: y1 });
        // twigs
        for (let k = 0; k < 3; k++) {
          const tx = U.lerp(mx, x1, rng.range(0.3, 1)), ty = U.lerp(my, y1, rng.range(0.3, 1));
          tb.line(tx, ty, tx + rng.range(-14, 14) * s, ty - rng.range(4, 14) * s, B[3]);
        }
      }
      tb.outline(c32('#1e1214'));
      this.trunkCanvas = tb.toCanvas();
      this.swingBranch = { x: baseX - 62 * s, y: trunkTop - 34 * s };

      // ---- canopy (split into sway groups) ----
      const clumps = [];
      const domeCX = baseX + 6 * s, domeCY = canopyBase - 66 * s;
      for (const e of this.branchEnds) {
        for (let k = 0; k < 4; k++) clumps.push({ x: e.x + rng.range(-16, 16) * s, y: e.y + rng.range(-14, 10) * s, r: rng.range(14, 22) * s });
      }
      for (let i = 0; i < 40; i++) {
        const a = rng.range(Math.PI, Math.PI * 2);
        const d = Math.sqrt(rng.next());
        clumps.push({ x: domeCX + Math.cos(a) * d * 150 * s, y: domeCY + Math.sin(a) * d * 70 * s + 20 * s, r: rng.range(12, 24) * s });
      }
      clumps.sort((a, b) => a.y - b.y);
      const L = PAL.leaves.map(c32);
      const GROUPS = 6;
      const minX = domeCX - 175 * s, maxX = domeCX + 175 * s;
      const back = new PB(LW, H);
      const fronts = [];
      for (let g = 0; g < GROUPS; g++) fronts.push(new PB(LW, H));
      const lx = -0.62, ly = -0.78;
      const paintClump = (buf, c, darken) => {
        const ri = Math.ceil(c.r * 1.15);
        for (let dy = -ri; dy <= ri; dy++) {
          for (let dx = -ri; dx <= ri; dx++) {
            const x = Math.round(c.x + dx), y = Math.round(c.y + dy);
            const ang = Math.atan2(dy, dx);
            const edge = c.r * (0.82 + 0.3 * noise.n2(Math.cos(ang) * 2 + c.x, Math.sin(ang) * 2 + c.y));
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > edge) continue;
            const nx = dx / edge, ny = dy / edge;
            const lit = nx * lx + ny * ly;
            const leaf = noise.n2(x * 0.32, y * 0.32);
            let v = 0.5 + lit * 0.42 + (leaf - 0.5) * 0.5 - darken + (ERX.bayer(x, y) - 0.5) * 0.18;
            if (d > edge - 1.2) v -= 0.3;
            const k = U.clamp(Math.floor(v * 6), 0, 5);
            buf.set(x, y, L[k]);
          }
        }
      };
      for (const c of clumps) paintClump(back, { x: c.x + 6 * s, y: c.y + 8 * s, r: c.r * 1.05 }, 0.32);
      for (const c of clumps) {
        const g = U.clamp(Math.floor(((c.x - minX) / (maxX - minX)) * GROUPS), 0, GROUPS - 1);
        paintClump(fronts[g], c, 0);
      }
      this.canopyBack = back.toCanvas();
      this.canopyGroups = fronts.map((f, i) => { f.outline(c32('#122a1a')); return { canvas: f.toCanvas(), phase: i * 0.9 + rng.range(0, 0.5) }; });
      this.canopyBounds = { minX, maxX, top: domeCY - 80 * s, bottom: canopyBase + 10 * s };

      // ---- light shafts through the canopy ----
      this.shafts = [];
      for (let i = 0; i < 3; i++) {
        const sw = Math.round(rng.range(8, 16) * s), len = Math.round(H * 0.55);
        const b = new PB(sw + len, len);
        for (let y = 0; y < len; y++) {
          const off = Math.round(y * 0.75);
          const fade = 1 - y / len;
          for (let x = 0; x < sw; x++) if (ERX.bayer(off + x, y) < 0.32 * fade) b.set(off + x, y, c32(PAL.light));
        }
        this.shafts.push({ canvas: b.toCanvas(), x: baseX - 150 * s + i * 52 * s + rng.range(-10, 10), y: canopyBase - 40 * s, p: rng.range(0, 6) });
      }
    }

    _buildForeground(rng, LW, H) {
      const fg = new PB(LW, H);
      const noise = new U.Noise(rng.int(1, 1e9));
      const top = Math.round(H * 0.93);
      const Mw = PAL.meadow.map(c32);
      this.fgTop = new Int16Array(LW);
      for (let x = 0; x < LW; x++) {
        const t = top + Math.round((noise.n1(x * 0.03) - 0.5) * 10);
        this.fgTop[x] = t;
        for (let y = t; y < H; y++) fg.set(x, y, y - t < 2 ? Mw[2] : ERX.bayer(x, y) < 0.4 ? Mw[4] : Mw[3]);
      }
      // a few rocks and mushrooms
      for (let i = 0; i < Math.round(LW / 120); i++) {
        const x = rng.int(10, LW - 10), y = this.fgTop[x] + 3, r = rng.int(3, 6);
        fg.ellipse(x, y, r + 2, r, c32('#6a6a7a'));
        fg.ellipse(x - 1, y - 1, r, r - 1, c32('#8a8a9a'));
        fg.set(x - 2, y - r + 1, c32('#b0b0c0'));
      }
      fg.outline(c32('#16261a'));
      this.fgCanvas = fg.toCanvas();
      this.grass = new P.Grass();
      const cols = ['#8cd05a', '#6cb04c', '#4f9440', '#3a7636'];
      for (let x = 0; x < LW; x += 1) {
        if (rng.chance(0.55)) this.grass.add(x, this.fgTop[x] + 1, rng.int(3, 8), rng.pick(cols), rng.range(0, 6));
      }
      // grass on the hill around the tree (midground)
      this.hillGrass = new P.Grass();
      for (let x = 0; x < LW; x += rng.int(1, 3)) this.hillGrass.add(x, this.hillTop[x], rng.int(1, 4), rng.pick(['#8cd05a', '#6cb04c']), rng.range(0, 6));
    }

    update(dt) {
      super.update(dt);
      const W = this.W, H = this.H, R = this.rng, s = this.s;
      for (const c of this.clouds) { c.x -= c.speed * dt; if (c.x < -c.canvas.width) c.x = W + 10; }
      if (!this.low) {
        this.flock.update(dt);
        // falling leaves from the canopy
        if (R.chance(dt * 2.5) && this.leaves.count < 24) {
          const b = this.canopyBounds;
          this.leaves.add({
            x: R.range(b.minX, b.maxX) - this.M, y: R.range(b.top + 40 * s, b.bottom - 10 * s), vx: R.range(2, 8), vy: R.range(6, 12),
            life: R.range(7, 11), colors: R.chance(0.25) ? ['#e8c050', '#c89030'] : ['#86c64e', '#5aa040'], size: 1,
            wobble: 14, wobbleRate: R.range(1.5, 2.5), phase: R.range(0, 6), fadeOut: 1,
          });
        }
        if (R.chance(dt * 3) && this.pollen.count < 30) {
          this.pollen.add({
            x: R.range(0, W), y: R.range(H * 0.4, H * 0.95), vx: R.range(1, 4), vy: R.range(-3, -1),
            life: R.range(5, 9), color: R.chance(0.5) ? '#fff6b0' : '#ffffff', size: 1, wobble: 5, wobbleRate: 1, phase: R.range(0, 6),
            fadeIn: 1, fadeOut: 2, blink: 2, alpha: 0.8,
          });
        }
        for (const w of this.wisps) {
          w.trail.unshift({ x: w.x, y: w.y });
          if (w.trail.length > 4) w.trail.pop();
        }
      }
      this.leaves.update(dt);
      this.pollen.update(dt);
    }

    render(ctx, cam) {
      const W = this.W, H = this.H, t = this.t, s = this.s;
      ctx.drawImage(this.skyCanvas, 0, 0);
      for (const c of this.clouds) ctx.drawImage(c.canvas, Math.round(c.x - cam.x * 0.06), Math.round(c.y));
      if (!this.low) this.flock.render(ctx, -cam.x * 0.15, 0);
      ctx.drawImage(this.mtn.canvas, this.px(cam, 0.08), this.mtn.y + this.py(cam, 0.08));
      ctx.drawImage(this.farHills.canvas, this.px(cam, 0.2), this.farHills.y + this.py(cam, 0.2));
      ctx.drawImage(this.midHills.canvas, this.px(cam, 0.4), this.midHills.y + this.py(cam, 0.4));

      // ---- the great tree ----
      const tx = this.px(cam, 0.7), ty = this.py(cam, 0.7);
      ctx.drawImage(this.hillCanvas, tx, ty);
      this.hillGrass.render(ctx, t, tx, ty, (x, tt, ph) => Math.sin(tt * 1.6 + ph + x * 0.05) * 0.8 + this._gust(x, tt) * 0.8, this.low);

      const sway = (ph, amp) => (this.low ? 0 : Math.round(Math.sin(t * 0.9 + ph) * amp));
      ctx.drawImage(this.canopyBack, tx + sway(0.4, 1), ty);
      ctx.drawImage(this.trunkCanvas, tx, ty);

      // rope swing hanging from a low branch
      const sb = this.swingBranch;
      const ang = this.low ? 0 : Math.sin(t * 1.1) * 0.1;
      const ropeLen = 58 * s;
      const sx = sb.x + tx, sy = sb.y + ty;
      const ex = sx + Math.sin(ang) * ropeLen, ey = sy + Math.cos(ang) * ropeLen;
      ctx.fillStyle = '#c8a878';
      for (let i = 0; i < ropeLen; i += 1) {
        const k = i / ropeLen;
        ctx.fillRect(Math.round(sx - 4 + (ex - sx) * k), Math.round(sy + (ey - sy) * k), 1, 1);
        ctx.fillRect(Math.round(sx + 4 + (ex - sx) * k), Math.round(sy + (ey - sy) * k), 1, 1);
      }
      ctx.fillStyle = '#1e1214';
      ctx.fillRect(Math.round(ex - 6), Math.round(ey), 13, 3);
      ctx.fillStyle = '#8a5a3a';
      ctx.fillRect(Math.round(ex - 5), Math.round(ey), 11, 2);

      // the person resting against the trunk
      const tr = this.tree;
      const breathe = Math.floor(t / 3.2) % 2 === 0 ? 0 : 1;
      const px = tr.baseX - 13 * s - 6 + tx, py = tr.ground + 2 + ty;
      const fr = this.sitter.frames.sit[0];
      ctx.drawImage(fr.l, Math.round(px - A.ANCHOR.x), Math.round(py - A.ANCHOR.y - breathe));
      // a little book in their hands
      ctx.fillStyle = '#f4ecd8';
      ctx.fillRect(Math.round(px - 5), Math.round(py - 7 - breathe), 2, 2);
      ctx.fillStyle = '#8a3a3a';
      ctx.fillRect(Math.round(px - 3), Math.round(py - 7 - breathe), 1, 2);

      for (const g of this.canopyGroups) ctx.drawImage(g.canvas, tx + sway(g.phase, 1), ty + sway(g.phase + 1.7, 0.6));

      if (!this.low) {
        // god rays
        for (const sh of this.shafts) {
          ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * 0.35 + sh.p);
          ctx.drawImage(sh.canvas, Math.round(sh.x + tx), Math.round(sh.y + ty));
        }
        ctx.globalAlpha = 1;
        // elemental wisps drifting around the tree
        for (const w of this.wisps) {
          const a = t * w.sp + w.p;
          w.x = tr.baseX + tx + Math.cos(a) * w.r * 2.4 - 20 * s;
          w.y = tr.canopyBase + ty + 20 * s + Math.sin(a * 1.7) * w.r * 0.8;
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = w.col;
          for (const p of w.trail) ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
          ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3 + w.p);
          ctx.fillRect(Math.round(w.x) - 1, Math.round(w.y), 3, 1);
          ctx.fillRect(Math.round(w.x), Math.round(w.y) - 1, 1, 3);
          ctx.globalAlpha = 1;
        }
      }
      this.leaves.render(ctx, -cam.x * 0.7, 0);

      // ---- foreground meadow ----
      const fx = this.px(cam, 1.1), fy = this.py(cam, 1.1);
      ctx.drawImage(this.fgCanvas, fx, fy);
      this.grass.render(ctx, t, fx, fy, (x, tt, ph) => Math.sin(tt * 1.7 + ph + x * 0.06) * 1.2 + this._gust(x, tt) * 2.4, this.low);
      if (!this.low) {
        for (const b of this.butterflies) {
          const bx = b.x + Math.sin(t * 0.4 + b.p) * 60 + fx + this.M;
          const by = H * 0.84 + Math.sin(t * 1.3 + b.p) * 10 + Math.sin(t * 7 + b.p) * 1.5;
          const open = Math.floor(t * 10 + b.p) % 2 === 0;
          ctx.fillStyle = b.col;
          if (open) { ctx.fillRect(Math.round(bx) - 2, Math.round(by), 2, 2); ctx.fillRect(Math.round(bx) + 1, Math.round(by), 2, 2); }
          else { ctx.fillRect(Math.round(bx) - 1, Math.round(by), 1, 2); ctx.fillRect(Math.round(bx) + 1, Math.round(by), 1, 2); }
          ctx.fillStyle = '#2a1a1a';
          ctx.fillRect(Math.round(bx), Math.round(by), 1, 2);
        }
      }
      this.pollen.render(ctx);
    }

    /** A gust of wind rolling across the meadow from left to right. */
    _gust(x, t) {
      const w = Math.sin(x * 0.018 - t * 0.9);
      return w > 0.6 ? (w - 0.6) * 2.5 : 0;
    }
  }

  ERX.Backgrounds.register({
    id: 'tree',
    name: 'THE GREAT TREE',
    music: 'tree',
    ambience: 'tree',
    Env: GreatTree,
  });
})(window.ERX = window.ERX || {});
