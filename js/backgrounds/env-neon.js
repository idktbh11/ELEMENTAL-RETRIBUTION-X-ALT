/*
 * SECRET SCENE — NEON CITY (type "neonjam" on the main menu; type it again to go back)
 * A synthwave city at full volume: a striped sun sinking behind a skyline of neon signs, lasers raking the sky,
 * a billboard equaliser, light trails on the flyover and a neon grid rolling towards you. Everything runs off the
 * real beat of its two songs (js/data/neonjam.js): the whole screen thumps on every beat, the city lights up when
 * the beat drops, and every so often the screen spins round or flips upside down and straight back.
 *
 * ERX.NeonJam is the conductor: it reads where the music is (ERX.Audio.musicTime), finds the beat, and hands out
 * pulse / hype / drops to the city, the menu's logo (through ERX.Audio.beat) and the screen itself (main.js).
 */
(function (ERX) {
  'use strict';

  const U = ERX.U;
  const NEON = ['#ff2a8a', '#2af0ff', '#ffe14a', '#a83aff', '#9aff3a', '#ff8a3a', '#ff3ad8', '#3a8aff'];
  const ease = (k) => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));

  // ============================================================ THE CONDUCTOR
  const fresh = () => ({ track: -1, k: -1, ph: 0, spb: 0.42, pulse: 0, hype: 0, bass: 0, count: 0, downbeat: false, dropT: 99, drops: 0, move: null, spins: 0, tPrev: 0, live: false });
  const prep = (tr) => {
    if (tr._t) return tr;
    let acc = 0;
    tr._t = tr.beats.map((d) => (acc += d) / 1000);
    tr._drops = new Set(tr.drops);
    tr._moves = new Map(tr.moves);
    return tr;
  };

  const NeonJam = {
    /** The speakers run a little behind the clock: the visuals wait this long (seconds). */
    LAG: 0.06,
    st: fresh(),

    /** Neon City is the menu world. */
    on() { return !!ERX.Backgrounds.current && ERX.Backgrounds.current.id === 'neon'; },
    /** ...and its music is actually playing. */
    playing() { const m = ERX.Audio.musicTime(); return m.id === 'neonjam' && m.playing && !!ERX.NeonJamData; },

    /** Typed "neonjam": switch it on (or back off), restarting the menu. */
    toggle() {
      const B = ERX.Backgrounds, off = this.on();
      ERX.Input.typed = '';
      ERX.Toast.show(off ? 'Neon Jam over. Back to normal. Boo.' : 'NEON JAM. TURN IT UP.', { color: off ? '#a8f0ff' : '#ff3ad8', duration: 3 });
      ERX.Scenes.transition('dissolve', 0.9, () => {
        this.st = fresh();
        B.start(off ? B.pick() : B.get('neon'));
        ERX.Scenes.replace('mainMenu');
      });
    },

    /** Find the beat from where the music is. */
    update(dt) {
      const s = this.st, data = ERX.NeonJamData, m = ERX.Audio.musicTime();
      s.dropT += dt;
      s.live = this.playing();
      if (!s.live) { s.pulse = Math.max(0, s.pulse - dt * 4); s.hype = U.approach(s.hype, 0.15, 1, dt); return; }
      const tr = prep(data.tracks[m.track] || data.tracks[0]), t = m.time - this.LAG;
      if (s.track !== m.track || t < s.tPrev - 0.5) { s.track = m.track; s.k = -1; s.move = null; }   // a new song (or it jumped back)
      while (s.k + 1 < tr._t.length && tr._t[s.k + 1] <= t) { s.k++; this._beat(tr, s.k); }
      s.tPrev = t;
      const k = s.k, t0 = k >= 0 ? tr._t[k] : 0, t1 = k + 1 < tr._t.length ? tr._t[k + 1] : t0 + s.spb;
      s.spb = Math.max(0.2, t1 - t0);
      s.ph = k >= 0 ? U.clamp((t - t0) / s.spb, 0, 1) : 0;
      s.bass = k >= 0 ? +tr.bass[k] / 9 : 0;
      s.pulse = k >= 0 ? Math.exp(-s.ph * 6) * (0.5 + 0.5 * s.bass) : 0;
      s.hype = U.approach(s.hype, k >= 0 ? +tr.hype[k] / 9 : 0, 2.5, dt);
      if (s.move) { s.move.u = (k - s.move.k + s.ph) / s.move.len; if (s.move.u >= 1) s.move = null; }
    },
    _beat(tr, k) {
      const s = this.st;
      s.count++;
      s.downbeat = ((k - tr.bar0) % 4 + 4) % 4 === 0;
      if (tr._drops.has(k)) { s.dropT = 0; s.drops++; }
      const mv = tr._moves.get(k);
      const top = ERX.Scenes.top();
      if (mv && top && top.id === 'mainMenu') s.move = { type: mv, k, len: mv === 'spin' ? 2 : 1.5, u: 0, dir: s.spins++ % 2 ? -1 : 1 };
    },

    /** Beat info in the same shape as ERX.Audio.beat(). */
    beat() { const s = this.st; return { pulse: Math.min(1, s.pulse * (1.1 + s.hype * 0.4)), count: s.count, downbeat: s.downbeat, fake: false }; },

    /** How the whole screen moves right now ({ scale, rot, fy }), or null when it shouldn't. */
    screen() {
      if (!this.on() || ERX.Scenes.worldHidden) return null;
      const s = this.st, calm = !ERX.Settings.get('video.screenShake');
      let rot = 0, fy = 1, zoom = 0;
      if (s.move && !calm) {
        const u = s.move.u;
        if (s.move.type === 'spin') { rot = ease(u) * Math.PI * 2 * s.move.dir; zoom = Math.sin(u * Math.PI) * 0.12; }
        else fy = u < 1 / 3 ? Math.cos(Math.PI * u * 3) : u < 2 / 3 ? -1 : -Math.cos(Math.PI * (u - 2 / 3) * 3);   // over, a moment upside down, and back
      }
      const scale = 1 + (calm ? 0.004 : 0.016 + 0.026 * s.hype) * s.pulse + zoom;
      return { scale, rot, fy };
    },
  };
  ERX.NeonJam = NeonJam;

  // ============================================================ THE CITY
  /** A neon sign: text in a glowing tube colour, drawn once. */
  function sign(text, col, frame, sc) {
    sc = sc || 1;
    const F = ERX.Font, w = F.measure(text, sc) + 8 * sc, h = 7 * sc + 6, cv = ERX.makeCanvas(w + 4, h + 4), c = cv.getContext('2d');
    c.fillStyle = '#0a0418'; c.fillRect(2, 2, w, h);
    c.fillStyle = frame; c.fillRect(2, 2, w, 1); c.fillRect(2, h + 1, w, 1); c.fillRect(2, 2, 1, h); c.fillRect(w + 1, 2, 1, h);
    F.draw(c, text, 2 + w / 2, 5, { color: col, align: 'center', scale: sc });
    return cv;
  }

  class NeonCity extends ERX.Environment {
    build(W, H) {
      super.build(W, H);
      const M = this.M, LW = W + M * 2, s = H / 270, rng = new U.RNG(this.seed);
      this.s = s; this.LW = LW;
      this.horizon = Math.round(H * 0.6);
      const hz = this.horizon;

      // ---- the sky: deep violet down to a hot pink/orange horizon
      const sky = ERX.makeCanvas(W, hz + 2), sc = sky.getContext('2d'), g = sc.createLinearGradient(0, 0, 0, hz);
      [[0, '#0b0326'], [0.35, '#24094e'], [0.62, '#6a1474'], [0.82, '#d42a78'], [0.95, '#ff6a52'], [1, '#ff9a4a']].forEach(([p, c]) => g.addColorStop(p, c));
      sc.fillStyle = g; sc.fillRect(0, 0, W, hz + 2);
      this.sky = sky;
      this.stars = []; for (let i = 0; i < 60; i++) this.stars.push({ x: rng.int(0, W), y: rng.int(0, Math.round(hz * 0.5)), p: rng.range(0, 6), c: rng.pick(['#ffffff', '#2af0ff', '#ff8ad8']) });

      // ---- the sun: striped, yellow at the top fading to hot pink
      const R = Math.round(60 * s), sun = ERX.makeCanvas(R * 2 + 2, R * 2 + 2), uc = sun.getContext('2d'), ug = uc.createLinearGradient(0, 0, 0, R * 2);
      ug.addColorStop(0, '#fff27a'); ug.addColorStop(0.45, '#ffb84a'); ug.addColorStop(1, '#ff2a8a');
      uc.fillStyle = ug;
      for (let y = -R; y < R; y++) {
        const q = (y + R) / (R * 2), w = Math.floor(Math.sqrt(R * R - y * y));
        if (q > 0.5) { const band = (y % Math.max(3, Math.round(7 * s)) + Math.max(3, Math.round(7 * s))) % Math.max(3, Math.round(7 * s)); if (band < Math.round((q - 0.5) * 9 * s)) continue; }   // the stripes get thicker towards the bottom
        uc.fillRect(R + 1 - w, y + R + 1, w * 2, 1);
      }
      this.sun = sun; this.sunR = R;

      // ---- far skyline: dark towers full of tiny lit windows
      this.far = this._skyline(rng, LW, Math.round(84 * s), { minH: 22 * s, maxH: 80 * s, minW: 8 * s, maxW: 22 * s, col: '#22104a', edge: '#5a2a8a', win: 0.22, winCols: ['#2af0ff', '#ff8ad8', '#ffe14a'], valley: 0.7 });
      // ---- mid skyline: taller, with neon edges (a dark version and a lit one, blended by how hype it is)
      const mid = this._skyline(rng, LW, Math.round(120 * s), { minH: 40 * s, maxH: 118 * s, minW: 14 * s, maxW: 34 * s, col: '#1a0838', edge: '#ff2a8a', win: 0.34, winCols: ['#2af0ff', '#ff3ad8', '#ffe14a', '#9aff3a'], neon: true, valley: 0.82 });
      this.mid = mid;
      // neon signs on the mid towers
      const words = ['NEON', 'JAM', '24/7', 'ERX', 'HYPE', 'OPEN', 'BOSS', 'LOUD'];
      this.signs = [];
      for (let i = 0; i < Math.max(6, Math.round(LW / 80)); i++) {
        const tall = mid.towers.filter((t) => t.h > 50 * s), tw = rng.pick(tall.length ? tall : mid.towers), col = NEON[i % NEON.length];
        this.signs.push({ cv: sign(words[i % words.length], col, col, i % 3 === 0 ? 2 : 1), x: tw.x + Math.round(tw.w / 2), y: mid.h - tw.h + Math.round(rng.range(6, 22) * s), col, ph: rng.range(0, 6), beat: i % 4 });
      }
      // ---- the billboard equaliser and the flyover
      this.board = { x: Math.round(LW * 0.72), w: Math.round(54 * s), h: Math.round(30 * s) };
      this.cars = []; for (let i = 0; i < 18; i++) this.cars.push({ x: rng.range(0, LW), lane: i % 2, sp: rng.range(70, 140), len: rng.range(10, 26), c: i % 2 ? '#ff3a5a' : '#ffffff' });
      // ---- lasers (from the rooftops) and glitter
      this.lasers = []; for (let i = 0; i < 8; i++) this.lasers.push({ x: rng.range(0.08, 0.92), a: rng.range(-0.7, 0.7), aim: 0, c: NEON[(i * 3) % NEON.length], ph: rng.range(0, 6) });
      this.glitter = new ERX.Paint.Particles();
      this.lastCount = -1; this.lastDrops = 0;
    }

    /** A row of towers on a transparent canvas (o: sizes, colours, window density, neon edges). */
    _skyline(rng, LW, h, o) {
      const cv = ERX.makeCanvas(LW, h), c = cv.getContext('2d'), lit = o.neon ? ERX.makeCanvas(LW, h) : null, lc = lit && lit.getContext('2d'), towers = [];
      for (let x = -4; x < LW;) {
        // (a dip in the middle of the skyline, so the sun always shows)
        const w = Math.round(rng.range(o.minW, o.maxW)), dist = Math.abs(x + w / 2 - LW / 2) / (LW / 2), cap = o.valley ? U.lerp(1 - o.valley, 1, ease((dist - 0.06) / 0.3)) : 1;
        const th = Math.max(Math.round(8 * this.s), Math.round(Math.min(rng.range(o.minH, o.maxH), o.maxH * cap))), y = h - th;
        towers.push({ x, w, h: th });
        c.fillStyle = o.col; c.fillRect(x, y, w, th);
        if (rng.next() < 0.3) { c.fillRect(x + Math.round(w / 2), y - Math.round(rng.range(4, 12)), 1, Math.round(rng.range(4, 12))); }   // an antenna
        for (let wy = y + 3; wy < h - 2; wy += 3) for (let wx = x + 2; wx < x + w - 2; wx += 3) if (rng.next() < o.win) { const col = rng.pick(o.winCols); c.fillStyle = C2(col, 0.55); c.fillRect(wx, wy, 1, 1); if (lc) { lc.fillStyle = col; lc.fillRect(wx, wy, 1, 1); } }
        if (o.neon) {
          const col = rng.pick(NEON);
          if (rng.next() < 0.4) for (let by = y + 6; by < h - 4; by += Math.round(rng.range(7, 13))) { const bc = rng.pick(NEON); c.fillStyle = C2(bc, 0.3); c.fillRect(x + 1, by, w - 2, 1); lc.fillStyle = bc; lc.fillRect(x + 1, by, w - 2, 1); }   // neon bands round the tower
          c.fillStyle = C2(col, 0.35); c.fillRect(x, y, w, 1); c.fillRect(x, y, 1, th); c.fillRect(x + w - 1, y, 1, th);
          lc.fillStyle = col; lc.fillRect(x, y, w, 1); lc.fillRect(x, y, 1, th); lc.fillRect(x + w - 1, y, 1, th);
          lc.fillStyle = C2(col, 0.25); lc.fillRect(x - 1, y - 1, w + 2, 1); lc.fillRect(x - 1, y, 1, th); lc.fillRect(x + w, y, 1, th);   // the glow round the tube
        } else { c.fillStyle = o.edge; c.fillRect(x, y, w, 1); }
        x += w + Math.round(rng.range(0, 3));
      }
      return { cv, lit, h, towers };
    }

    update(dt, cam) {
      super.update(dt);
      NeonJam.update(dt);
      const st = NeonJam.st, W = this.W, H = this.H, s = this.s;
      // every beat in a hype bit: the lasers jump to new angles; every drop: glitter everywhere
      if (st.count !== this.lastCount) { this.lastCount = st.count; if (st.hype > 0.55) for (const L of this.lasers) L.aim = U.clamp(L.a + (Math.random() - 0.5) * 1.1, -0.95, 0.95); }
      if (st.drops !== this.lastDrops) { this.lastDrops = st.drops; for (let i = 0; i < 90; i++) this.glitter.add({ x: Math.random() * W, y: -4 - Math.random() * H * 0.4, vx: (Math.random() - 0.5) * 30, vy: 40 + Math.random() * 80, life: 2 + Math.random() * 2, color: NEON[i % NEON.length], size: Math.random() < 0.3 ? 2 : 1, fadeOut: 0.6, blink: 9 }); }
      if (st.hype > 0.6 && Math.random() < dt * 25 * st.hype) this.glitter.add({ x: Math.random() * W, y: -4, vx: (Math.random() - 0.5) * 20, vy: 50 + Math.random() * 60, life: 3, color: NEON[Math.floor(Math.random() * NEON.length)], size: 1, fadeOut: 0.6 });
      this.glitter.update(dt, H + 10);
      for (const L of this.lasers) { L.a = U.approach(L.a, L.aim || L.a, 6, dt); if (st.hype <= 0.55) L.a = Math.sin(this.t * 0.5 + L.ph) * 0.6; }
      const speed = 1 + st.hype * 2.5;
      for (const car of this.cars) { car.x += (car.lane ? -1 : 1) * car.sp * speed * dt * s; if (car.x > this.LW + 30) car.x = -30; if (car.x < -30) car.x = this.LW + 30; }
      void cam;
    }

    render(ctx, cam) {
      const W = this.W, H = this.H, s = this.s, hz = this.horizon, t = this.t, st = NeonJam.st;
      const pulse = st.pulse, hype = st.hype, lit = U.clamp(0.45 + hype * 0.65 + (st.dropT < 1 ? (1 - st.dropT) * 0.5 : 0), 0, 1);
      ctx.drawImage(this.sky, 0, Math.round(-cam.y * 0.05));
      // the horizon glows behind the city (and swells when the beat drops)
      { const gx = Math.round(W / 2) + this.px(cam, 0.08) + this.M, gr = ctx.createRadialGradient(gx, hz, 4, gx, hz, W * (0.45 + 0.15 * hype));
        gr.addColorStop(0, 'rgba(255,90,150,' + (0.35 + 0.3 * hype + (st.dropT < 1 ? 0.3 * (1 - st.dropT) : 0)).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,40,140,0)');
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(0, 0, W, hz + 4); ctx.restore(); }
      // stars, twinkling (and blinking on the beat when it's going)
      for (const p of this.stars) { if ((Math.sin(t * 2 + p.p) > 0.2) || (hype > 0.6 && pulse > 0.5)) { ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 1, 1); } }
      // lasers raking the sky from the rooftops
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const nL = Math.round(3 + lit * 5);
      for (let i = 0; i < nL; i++) {
        const L = this.lasers[i], x0 = Math.round(L.x * W) + this.px(cam, 0.3) + this.M, y0 = hz - Math.round(60 * s), len = H * 1.1, a = -Math.PI / 2 + L.a, x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
        ctx.globalAlpha = (0.2 + 0.35 * lit) * (0.6 + 0.4 * pulse);
        ctx.fillStyle = L.c; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - 5 * s, y1); ctx.lineTo(x1 + 5 * s, y1); ctx.closePath(); ctx.fill();
        ctx.globalAlpha *= 1.6; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      ctx.restore();
      // the sun, glowing harder on every beat and blazing at a drop
      const sx = Math.round(W / 2) + this.px(cam, 0.08) + this.M, sy = hz - Math.round(this.sunR * 0.55) + Math.round(-cam.y * 0.08);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gl = ctx.createRadialGradient(sx, sy, this.sunR * 0.4, sx, sy, this.sunR * (1.9 + pulse * 0.5 + (st.dropT < 1 ? (1 - st.dropT) : 0)));
      gl.addColorStop(0, 'rgba(255,120,170,' + (0.35 + 0.25 * pulse * lit).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(255,40,140,0)');
      ctx.fillStyle = gl; ctx.fillRect(sx - this.sunR * 3, sy - this.sunR * 3, this.sunR * 6, this.sunR * 6);
      ctx.restore();
      const sb = 1 + pulse * 0.04 * lit;
      ctx.drawImage(this.sun, Math.round(sx - this.sunR * sb), Math.round(sy - this.sunR * sb), Math.round(this.sun.width * sb), Math.round(this.sun.height * sb));
      // a drop: rays bursting out from behind the city
      if (st.dropT < 1.2) {
        const k = st.dropT / 1.2;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - k) * 0.5;
        for (let i = 0; i < 14; i++) { const a = Math.PI + (i / 13) * Math.PI, r = W * (0.3 + k); ctx.fillStyle = NEON[i % NEON.length]; ctx.beginPath(); ctx.moveTo(sx, hz); ctx.lineTo(sx + Math.cos(a - 0.04) * r, hz + Math.sin(a - 0.04) * r); ctx.lineTo(sx + Math.cos(a + 0.04) * r, hz + Math.sin(a + 0.04) * r); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      }
      // the skylines
      const fx = this.px(cam, 0.18), fy = hz - this.far.h + 2 + Math.round(-cam.y * 0.18);
      ctx.drawImage(this.far.cv, fx, fy);
      const mx = this.px(cam, 0.4), my = hz - this.mid.h + 4 + Math.round(-cam.y * 0.4);
      ctx.drawImage(this.mid.cv, mx, my);
      ctx.save(); ctx.globalAlpha = U.clamp(lit * (0.75 + 0.25 * pulse), 0, 1); ctx.drawImage(this.mid.lit, mx, my); ctx.restore();
      // neon signs: buzzing on and off in the calm bits, flashing on their beat when it's going
      for (const sg of this.signs) {
        const beatOn = hype > 0.5 ? (st.count % 4 === sg.beat ? 1 : 0.55 + 0.45 * pulse) : (Math.sin(t * 7 + sg.ph) > -0.85 ? 0.8 : 0.15);
        ctx.save(); ctx.globalAlpha = U.clamp(beatOn * (0.5 + 0.5 * lit), 0, 1);
        const x = mx + sg.x - Math.round(sg.cv.width / 2), y = my + sg.y;
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = sg.col; ctx.globalAlpha *= 0.35; ctx.fillRect(x - 2, y - 2, sg.cv.width + 4, sg.cv.height + 4);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = U.clamp(beatOn * (0.55 + 0.45 * lit), 0, 1); ctx.drawImage(sg.cv, x, y);
        ctx.restore();
      }
      // the billboard: an equaliser jumping to the music
      const bd = this.board, bx = mx + bd.x, by = my + this.mid.h - bd.h - Math.round(46 * s);
      ctx.fillStyle = '#0a0418'; ctx.fillRect(bx - 2, by - 2, bd.w + 4, bd.h + 4);
      ctx.fillStyle = '#ff3ad8'; ctx.fillRect(bx - 2, by - 2, bd.w + 4, 1); ctx.fillRect(bx - 2, by + bd.h + 1, bd.w + 4, 1);
      const bars = 9, bw = Math.floor(bd.w / bars) - 1;
      for (let i = 0; i < bars; i++) {
        const v = U.clamp(0.15 + (0.25 + 0.75 * hype) * (0.5 + 0.5 * Math.sin(t * (6 + i * 1.7) + i)) * (0.6 + 0.6 * pulse), 0, 1), hgt = Math.round(v * (bd.h - 2));
        for (let y = 0; y < hgt; y += 2) { const q = y / bd.h; ctx.fillStyle = q > 0.75 ? '#ff2a8a' : q > 0.45 ? '#ffe14a' : '#2af0ff'; ctx.fillRect(bx + i * (bw + 1) + 1, by + bd.h - 1 - y, bw, 1); }
      }
      // the flyover: light trails streaking both ways
      const ry = hz - Math.round(3 * s), rx = this.px(cam, 0.6);
      ctx.fillStyle = '#0a0418'; ctx.fillRect(0, ry - 1, W, Math.round(6 * s));
      ctx.fillStyle = '#ff2a8a'; ctx.fillRect(0, ry - 1, W, 1);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const car of this.cars) { const x = rx + car.x, y = ry + 1 + car.lane * Math.round(2 * s); ctx.globalAlpha = 0.7; ctx.fillStyle = car.c; ctx.fillRect(Math.round(x), y, Math.round(car.len * (1 + hype)), 1); ctx.globalAlpha = 1; ctx.fillRect(Math.round(car.lane ? x : x + car.len * (1 + hype)), y, 2, 1); }
      ctx.restore();
      // the grid: neon lines rolling towards you, brighter on every beat
      this._grid(ctx, W, H, hz + Math.round(5 * s), st, lit);
      // glitter
      this.glitter.render(ctx);
      // the whole city breathes with the beat
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pulse * (0.04 + 0.1 * lit); ctx.fillStyle = hype > 0.6 ? NEON[st.count % 4] : '#ff2a8a'; ctx.fillRect(0, 0, W, H); ctx.restore();
      if (st.dropT < 0.35) { ctx.save(); ctx.globalAlpha = (0.35 - st.dropT) * 0.9; ctx.fillStyle = '#ffd8f0'; ctx.fillRect(0, 0, W, H); ctx.restore(); }   // the drop hits
    }

    _grid(ctx, W, H, top, st, lit) {
      const h = H - top, vx = W / 2, beatPos = (st.k >= 0 ? st.k + st.ph : this.t * 2) * 0.5;
      ctx.fillStyle = '#0c0420'; ctx.fillRect(0, top, W, h);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const col = st.hype > 0.6 && st.pulse > 0.4 ? '#ff7aea' : '#ff2ad4', col2 = st.hype > 0.6 && st.pulse > 0.4 ? '#8afcff' : '#2ad8ff';
      // rows rolling in, one per beat
      for (let i = 0; i < 12; i++) {
        const z = ((i - (beatPos % 1)) / 12), y = top + Math.round(Math.pow(Math.max(0, z), 2.2) * h);
        if (y <= top || y > H) continue;
        ctx.globalAlpha = U.clamp((0.35 + 0.6 * lit) * (0.4 + z) * (0.75 + 0.5 * st.pulse), 0, 1);
        ctx.fillStyle = col; ctx.fillRect(0, y, W, 1);
      }
      // lines running off to the vanishing point
      ctx.globalAlpha = U.clamp((0.3 + 0.5 * lit) * (0.8 + 0.4 * st.pulse), 0, 1); ctx.strokeStyle = col2; ctx.lineWidth = 1;
      for (let i = -12; i <= 12; i++) { const xb = vx + i * W * 0.11; ctx.beginPath(); ctx.moveTo(vx + i * 3, top); ctx.lineTo(xb, H); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = '#ff2a8a'; ctx.fillRect(0, top, W, 1);
    }
  }

  /** A colour with an alpha, as rgba(). */
  function C2(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }

  ERX.Backgrounds.register({
    id: 'neon',
    name: 'NEON CITY',
    music: 'neonjam',
    ambience: null,
    secret: true,
    Env: NeonCity,
  });
})(window.ERX = window.ERX || {});
