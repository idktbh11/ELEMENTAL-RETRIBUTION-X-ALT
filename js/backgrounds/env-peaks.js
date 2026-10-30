/*
 * SCENE 4 — MOUNTAINS ABOVE THE CLOUDS
 * Dawn over a range of giant peaks. Clouds stream through the valleys, a
 * banner snaps in the wind, rocks float where they shouldn't, and every so
 * often something very large flies past in the distance.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, PB = ERX.PixelBuffer, P = ERX.Paint, C = ERX.Color;
  const c32 = (h) => C.u32(h);

  const PAL = {
    sky: [[0, '#141236'], [0.2, '#24205c'], [0.42, '#463882'], [0.6, '#86589a'], [0.76, '#cc788c'], [0.9, '#f4a67a'], [1, '#ffd49a']],
    farPeaks: { rock: ['#a884b8', '#8a6aa6', '#9a78b0'], snow: ['#f4d4dc', '#c4a8d0'], rim: '#ffe0c8', fade: '#c890b0' },
    midPeaks: { rock: ['#8a6a9a', '#4c3a6e', '#6a5288'], snow: ['#ffe4da', '#a898d0'], rim: '#ffd4b8', fade: '#b884a8' },
    nearPeaks: { rock: ['#4e3c6c', '#2c2248', '#3c2e5a'], snow: ['#e0d0ec', '#8a7ab4'], rim: '#c89ab8' },
    cloudFar: { hi: '#ffd8c8', mid: '#eab0bc', lo: '#b886ac', deep: '#946ea0' },
    cloudMid: { hi: '#ffe4d8', mid: '#f0bcc4', lo: '#c494b6', deep: '#9a76a8' },
    cloudNear: { hi: '#fff0ea', mid: '#f6cfd2', lo: '#d2a6c2', deep: '#a888b4' },
    ledge: ['#6e5a82', '#4a3c60', '#342a48', '#241c34'],
    outline: '#140e20',
  };

  const DRAGON = [
    [
      '..........##........',
      '.........###........',
      '........####........',
      '.......#####.....##.',
      '###..##########.####',
      '.#############.###..',
      '......#######.......',
      '.......#..#.........',
    ],
    [
      '....................',
      '....................',
      '.................##.',
      '.......#########.###',
      '###.###########.##..',
      '.##########.........',
      '......######........',
      '.......#..#.........',
    ],
  ];

  const EAGLE = [
    ['##.....##', '.##...##.', '..##.##..', '....#....'],
    ['.........', '###...###', '..#####..', '....#....'],
  ];

  class Peaks extends ERX.Environment {
    build(W, H) {
      super.build(W, H);
      const M = this.M, LW = W + M * 2;
      const rng = new U.RNG(this.seed);
      this.rng = rng.fork(11);
      const s = H / 270;
      this.s = s;

      // ---- sky ----
      const horizon = Math.round(H * 0.6);
      const sky = new PB(W, H);
      P.gradient(sky, PAL.sky, 0, horizon + 4, 0.55);
      sky.rect(0, horizon + 4, W, H, c32('#ffd49a'));
      this.sun = { x: Math.round(W * 0.3), y: horizon - Math.round(12 * s) };
      P.glow(sky, this.sun.x, this.sun.y, H * 0.36, '#c8708e', 0.5, 2);
      P.glow(sky, this.sun.x, this.sun.y, H * 0.2, '#f4a07a', 0.7, 1.6);
      sky.circle(this.sun.x, this.sun.y, Math.round(14 * s), c32('#ffc87a'));
      sky.circle(this.sun.x - 1, this.sun.y - 1, Math.round(12 * s), c32('#fff0c0'));
      this.skyCanvas = sky.toCanvas();
      const glow = new PB(Math.round(H * 0.5), Math.round(H * 0.5));
      P.glow(glow, glow.w >> 1, glow.h >> 1, glow.w * 0.5, '#ffe0b0', 0.45, 2.2);
      this.sunGlow = glow.toCanvas();

      this.stars = [];
      for (let i = 0; i < 40; i++) this.stars.push({ x: rng.int(0, W), y: rng.int(1, Math.round(H * 0.32)), p: rng.range(0, 6), r: rng.range(0.6, 2.4) });

      // ---- layered peaks & cloud seas ----
      const fh = Math.round(H * 0.3);
      const far = P.mountains(rng, LW, fh, {
        peaks: Math.max(4, Math.round(LW / 80)), minH: fh * 0.35, maxH: fh * 0.95, slope: 1.3,
        rock: PAL.farPeaks.rock, snow: PAL.farPeaks.snow, snowLine: fh * 0.62, rim: PAL.farPeaks.rim,
        lean: 0.5, jag: 0.7, fade: { color: PAL.farPeaks.fade, start: fh * 0.55, end: fh * 1.05 },
      });
      this.far = { canvas: far.canvas, y: horizon - fh + Math.round(8 * s) };
      this.cloudFar = { canvas: P.cloudBank(rng, 280, Math.round(H * 0.2), PAL.cloudFar, { top: 3, rMin: 4, rMax: 9 }), y: horizon - Math.round(4 * s) };

      const mh = Math.round(H * 0.5);
      const mid = P.mountains(rng, LW, mh, {
        peaks: Math.max(3, Math.round(LW / 150)), minH: mh * 0.4, maxH: mh * 0.95, slope: 1.05,
        rock: PAL.midPeaks.rock, snow: PAL.midPeaks.snow, snowLine: mh * 0.55, rim: PAL.midPeaks.rim,
        lean: 0.6, jag: 1, fade: { color: PAL.midPeaks.fade, start: mh * 0.72, end: mh * 1.15 },
        extraPeaks: [{ x: LW * 0.72, h: mh * 0.98, sl: 0.85, sr: 1.0 }],
      });
      mid.buf.outline(c32('#3a2a58'));
      this.mid = { canvas: mid.buf.toCanvas(), y: Math.round(H * 0.72) - mh };
      this.cloudMid = { canvas: P.cloudBank(rng, 340, Math.round(H * 0.24), PAL.cloudMid, { top: 4, rMin: 5, rMax: 12 }), y: Math.round(H * 0.64) };

      // near peaks: tall dark spire on the left, smaller crag on the right
      const nh = Math.round(H * 0.82);
      const near = P.mountains(rng, LW, nh, {
        peaks: 0, minH: 0, maxH: 0, rock: PAL.nearPeaks.rock, snow: PAL.nearPeaks.snow, snowLine: nh * 0.78, rim: PAL.nearPeaks.rim,
        lean: 0.7, jag: 1.3,
        extraPeaks: [
          { x: LW * 0.04, h: nh * 0.95, sl: 0.4, sr: 1.6 },
          { x: LW * 0.15, h: nh * 0.7, sl: 1.2, sr: 1.9 },
          { x: LW * 0.94, h: nh * 0.62, sl: 1.5, sr: 0.6 },
        ],
      });
      near.buf.outline(c32(PAL.outline));
      this.near = { canvas: near.buf.toCanvas(), y: H - nh + Math.round(4 * s) };
      this.cloudNear = { canvas: P.cloudBank(rng, 380, Math.round(H * 0.24), PAL.cloudNear, { top: 4, rMin: 7, rMax: 15 }), y: Math.round(H * 0.8) };

      // cloud shadow overlay (masked onto the mid peaks each frame)
      this.shadowTemp = ERX.makeCanvas(LW, mh);
      const blob = new PB(Math.round(110 * s), Math.round(40 * s));
      for (let i = 0; i < 6; i++) blob.ellipse(rng.range(20, blob.w - 20), rng.range(12, blob.h - 12), rng.range(14, 26) * s, rng.range(7, 12) * s, c32('#2a1a48'));
      this.shadowBlob = blob.toCanvas();
      this.shadowBlobs = [0, 1, 2].map((i) => ({ x: rng.range(0, LW), y: rng.range(mh * 0.25, mh * 0.75), speed: rng.range(4, 7) }));

      this._buildLedge(rng, LW, H, s);

      // creatures & particles
      this.flock = new P.Flock(rng, { count: 4, W, yMin: H * 0.15, yMax: H * 0.45, speedMin: 12, speedMax: 20, color: '#2a1e48', dir: 1 });
      this.eagleSprites = EAGLE.map((r) => ERX.Sprites.fromStrings(r, { '#': '#1e1634' }));
      this.dragonSprites = DRAGON.map((r) => ERX.Sprites.fromStrings(r, { '#': '#5a4880' }));
      this.dragon = { x: W + rng.range(40, 400), y: H * rng.range(0.22, 0.34), speed: 9 };
      this.wind = new P.Particles();
      this.dust = new P.Particles();
    }

    _buildLedge(rng, LW, H, s) {
      const fg = new PB(LW, H);
      const noise = new U.Noise(rng.int(1, 1e9));
      const L = PAL.ledge.map(c32);
      this.ledgeTop = new Int16Array(LW).fill(H + 10);
      const end = Math.round(LW * 0.42);
      for (let x = 0; x < end; x++) {
        const t = x / end;
        let top = Math.round(H * 0.85 - Math.sin(t * Math.PI) * 6 * s + (noise.n1(x * 0.12) - 0.5) * 6 + t * t * 10 * s);
        if (x > end - 8) top += (x - (end - 8)) * 5;
        this.ledgeTop[x] = top;
        for (let y = top; y < H; y++) {
          const d = y - top;
          const n = noise.n2(x * 0.15, y * 0.15);
          let col = d < 2 ? L[0] : n > 0.6 ? L[1] : n > 0.38 ? L[2] : L[3];
          if (d > 2 && d < 5 && ERX.bayer(x, y) < 0.4) col = L[1];
          // cracks
          if (noise.n2(x * 0.4, y * 0.08) > 0.78) col = L[3];
          fg.set(x, y, col);
        }
      }
      // cairn of stacked stones
      const cx = Math.round(LW * 0.22), cb = this.ledgeTop[cx];
      const stones = [[7, 3], [6, 3], [5, 3], [3, 2]];
      let sy = cb;
      for (const [w, h] of stones) {
        fg.ellipse(cx, sy - h + 1, w / 2, h / 2 + 0.5, c32('#8a7a9a'));
        fg.hline(cx - Math.floor(w / 2) + 1, cx + Math.floor(w / 2) - 1, sy - h, c32('#b0a0c0'));
        sy -= h;
      }
      // sparse hardy grass
      this.grass = new P.Grass();
      for (let x = 0; x < end - 4; x += rng.int(2, 5)) this.grass.add(x, this.ledgeTop[x] - 1, rng.int(2, 4), rng.pick(['#5a8a7a', '#3e6a62', '#7aa890']), rng.range(0, 6));
      fg.outline(c32(PAL.outline));
      this.ledgeCanvas = fg.toCanvas();
      this.pole = { x: Math.round(LW * 0.1), y: this.ledgeTop[Math.round(LW * 0.1)], h: Math.round(30 * s) };

      // floating rocks: they hover. Nobody knows why.
      this.floaters = [];
      for (let i = 0; i < 6; i++) {
        const w = rng.int(3, 8), h = rng.int(3, 6);
        const b = new PB(w + 2, h + 3);
        b.ellipse(Math.floor((w + 2) / 2), Math.floor(h / 2) + 1, w / 2, h / 2, c32('#5a4a70'));
        b.hline(1, w, 1, c32('#8a7aa0'));
        if (rng.chance(0.6)) b.hline(2, w - 1, 0, c32('#5a8a7a'));
        b.outline(c32(PAL.outline));
        this.floaters.push({ canvas: b.toCanvas(), x: LW * rng.range(0.44, 0.98), y: H * rng.range(0.6, 0.86), p: rng.range(0, 6), amp: rng.range(2, 5), sp: rng.range(0.5, 1.1) });
      }
    }

    update(dt) {
      super.update(dt);
      const W = this.W, H = this.H, R = this.rng;
      for (const b of this.shadowBlobs) { b.x += b.speed * dt; if (b.x > W + this.M * 2 + 60) b.x = -this.shadowBlob.width - 40; }
      if (!this.low) {
        this.flock.update(dt);
        this.dragon.x -= this.dragon.speed * dt;
        if (this.dragon.x < -60) { this.dragon.x = W + R.range(600, 1400); this.dragon.y = H * R.range(0.18, 0.34); }
        if (R.chance(dt * 3) && this.wind.count < 16) {
          this.wind.add({ x: -20, y: R.range(0.05, 0.95) * H, vx: R.range(90, 160), vy: R.range(-3, 3), life: 6, len: R.int(5, 14), color: '#ffffff', alpha: 0.35, fadeIn: 0.3, fadeOut: 1 });
        }
        if (R.chance(dt * 2.5) && this.dust.count < 20) {
          this.dust.add({ x: R.range(W * 0.4, W), y: H + 2, vx: R.range(2, 8), vy: -R.range(4, 9), life: R.range(6, 10), color: R.pick(['#c8b0e0', '#ffd8c0']), size: 1, wobble: 5, wobbleRate: 1.3, phase: R.range(0, 6), fadeIn: 1, fadeOut: 2, alpha: 0.8 });
        }
      }
      this.wind.update(dt);
      this.dust.update(dt);
    }

    render(ctx, cam) {
      const W = this.W, H = this.H, t = this.t, s = this.s;
      ctx.drawImage(this.skyCanvas, 0, 0);
      // stars fading into dawn
      for (const st of this.stars) {
        const a = 0.5 + 0.5 * Math.sin(t * st.r + st.p);
        if (this.low && a < 0.6) continue;
        ctx.fillStyle = a > 0.8 ? '#ffffff' : '#b8a8e0';
        ctx.fillRect(st.x, st.y, 1, 1);
      }
      // slowly breathing sun glow (the light changes over time)
      const pulse = this.low ? 0.6 : 0.45 + 0.3 * Math.sin(t * 0.15) + 0.1 * Math.sin(t * 0.53);
      ctx.globalAlpha = U.clamp(pulse, 0, 1);
      ctx.drawImage(this.sunGlow, this.sun.x - (this.sunGlow.width >> 1), this.sun.y - (this.sunGlow.height >> 1));
      ctx.globalAlpha = 1;

      if (!this.low) {
        const fr = Math.floor(t * 2.2) % 2;
        ctx.drawImage(this.dragonSprites[fr], Math.round(this.dragon.x - cam.x * 0.1), Math.round(this.dragon.y + Math.sin(t * 1.1) * 3));
      }

      ctx.drawImage(this.far.canvas, this.px(cam, 0.06), this.far.y + this.py(cam, 0.06));
      P.drawTiled(ctx, this.cloudFar.canvas, t * 3 + cam.x * 0.15, this.cloudFar.y + this.py(cam, 0.15), W);

      const mx = this.px(cam, 0.3), my = this.mid.y + this.py(cam, 0.3);
      ctx.drawImage(this.mid.canvas, mx, my);
      if (!this.low) this._cloudShadows(ctx, mx, my);
      P.drawTiled(ctx, this.cloudMid.canvas, t * 6 + cam.x * 0.45, this.cloudMid.y + this.py(cam, 0.45), W);

      if (!this.low) {
        // an eagle circling between the peaks
        const ex = W * 0.68 + Math.cos(t * 0.35) * W * 0.12 - cam.x * 0.5;
        const ey = H * 0.4 + Math.sin(t * 0.35) * H * 0.06;
        ctx.drawImage(this.eagleSprites[Math.sin(t * 0.7) > 0.3 ? Math.floor(t * 5) % 2 : 1], Math.round(ex), Math.round(ey));
        this.flock.render(ctx, -cam.x * 0.5, 0);
      }

      ctx.drawImage(this.near.canvas, this.px(cam, 0.6), this.near.y + this.py(cam, 0.6));
      P.drawTiled(ctx, this.cloudNear.canvas, t * 10 + cam.x * 0.75, this.cloudNear.y + this.py(cam, 0.75), W);

      // ---- foreground ledge ----
      const fx = this.px(cam, 1), fy = this.py(cam, 1);
      for (const f of this.floaters) {
        const bob = this.low ? 0 : Math.sin(t * f.sp + f.p) * f.amp;
        ctx.drawImage(f.canvas, Math.round(f.x + fx * 0.9), Math.round(f.y + bob + fy));
      }
      ctx.drawImage(this.ledgeCanvas, fx, fy);
      this.grass.render(ctx, t, fx, fy, (x, tt, ph) => 1.5 + Math.sin(tt * 3 + ph + x * 0.1) * 1.2, this.low);
      this._flag(ctx, this.pole.x + fx, this.pole.y + fy, this.pole.h, t);

      this.dust.render(ctx);
      this.wind.render(ctx);
    }

    _cloudShadows(ctx, mx, my) {
      const c = this.shadowTemp.getContext('2d');
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, this.shadowTemp.width, this.shadowTemp.height);
      for (const b of this.shadowBlobs) c.drawImage(this.shadowBlob, Math.round(b.x), Math.round(b.y));
      c.globalCompositeOperation = 'destination-in';
      c.drawImage(this.mid.canvas, 0, 0);
      ctx.globalAlpha = 0.3;
      ctx.drawImage(this.shadowTemp, mx, my);
      ctx.globalAlpha = 1;
    }

    _flag(ctx, x, y, h, t) {
      ctx.fillStyle = PAL.outline;
      ctx.fillRect(x - 1, y - h - 1, 3, h + 1);
      ctx.fillStyle = '#9a8a6a';
      ctx.fillRect(x, y - h, 1, h);
      ctx.fillStyle = '#ffd34d';
      ctx.fillRect(x - 1, y - h - 2, 3, 2);
      const fw = Math.round(16 * this.s), fh = Math.round(9 * this.s);
      for (let i = 0; i < fw; i++) {
        const k = i / fw;
        const wave = this.low ? 0 : Math.sin(t * 7 - i * 0.55) * k * 2.2;
        const yy = Math.round(y - h + 1 + wave + k * 1.5);
        const slope = Math.cos(t * 7 - i * 0.55);
        const col = slope > 0.3 ? '#e04a5a' : slope < -0.3 ? '#8a2438' : '#b83448';
        ctx.fillStyle = PAL.outline;
        ctx.fillRect(x + 1 + i, yy - 1, 1, fh + 2);
        ctx.fillStyle = col;
        const len = i === fw - 1 ? fh - 2 : fh;
        ctx.fillRect(x + 1 + i, yy, 1, len);
        if (i > fw * 0.3 && i < fw * 0.65) {
          ctx.fillStyle = '#ffd34d';
          ctx.fillRect(x + 1 + i, yy + Math.round(fh * 0.35), 1, Math.max(1, Math.round(fh * 0.3)));
        }
      }
    }
  }

  ERX.Backgrounds.register({
    id: 'peaks',
    name: 'MOUNTAINS ABOVE THE CLOUDS',
    music: 'peaks',
    ambience: 'peaks',
    Env: Peaks,
  });
})(window.ERX = window.ERX || {});
