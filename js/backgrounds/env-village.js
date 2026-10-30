/*
 * SCENE 2 — LIVELY VILLAGE
 * A village at dusk: glowing windows, chimney smoke, lanterns, a blacksmith
 * at work, villagers strolling and chatting, animals, fireflies.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, PB = ERX.PixelBuffer, P = ERX.Paint, C = ERX.Color, A = ERX.Actors;
  const c32 = (h) => C.u32(h);

  const PAL = {
    sky: [[0, '#1a1840'], [0.2, '#2a2456'], [0.4, '#4a326e'], [0.58, '#86497c'], [0.72, '#c45e6a'], [0.86, '#ea8858'], [1, '#ffbe6a']],
    cloud: { hi: '#ffb98a', mid: '#e27f86', lo: '#a45a80', deep: '#6e4a7a' },
    mountains: { rock: ['#6a4a82', '#4a3466', '#5a3e74'], rim: '#e88a8a', fade: '#8a5a86' },
    hills: ['#4a3a68', '#3a2e58', '#2e2448'],
    backTree: { dark: '#221e3c', mid: '#2c2850', light: '#3a3462', trunk: '#1e1a30', trunkDark: '#16122a' },
    walls: [['#e8d4b0', '#c8ae88'], ['#d8c8b8', '#b8a490'], ['#e0c49a', '#c0a074'], ['#cfd6dc', '#aab4bc']],
    roofs: ['#b5483a', '#3e5a9a', '#4a7a4a', '#8a5a3a', '#7a3a6a'],
    timber: '#4a3024',
    stone: ['#8a7e86', '#6a6070', '#4e4656'],
    glass: ['#ffcf5a', '#fff0a8', '#b0702a', '#3a2a3a'],
    path: ['#8a7466', '#6e5c54', '#544548', '#a08a76'],
    grass: ['#5a8a4a', '#40703c', '#2e5432', '#78a858'],
    fgTree: { dark: '#1e3a2a', mid: '#2a5034', light: '#3e6a40', hi: '#5a8a4a', trunk: '#3a2a22', trunkDark: '#2a1e1a', outline: '#120e16' },
    outline: '#140e18',
  };

  function makeHouse(rng, o) {
    const over = 3, chim = 12;
    const w = o.w, wallH = o.wallH, roofH = o.roofH;
    const BW = w + over * 2, BH = chim + roofH + wallH;
    const buf = new PB(BW, BH);
    const x0 = over, wallTop = chim + roofH;
    const [wall, wallShade] = o.wall;
    const roof = c32(o.roof), roofLight = c32(C.shade(o.roof, 0.18)), roofDark = c32(C.shade(o.roof, -0.35));
    const ink = c32(PAL.outline), timber = c32(PAL.timber);
    const windows = [];

    // walls
    for (let y = wallTop; y < BH; y++) {
      for (let x = x0; x < x0 + w; x++) {
        let col = c32(wall);
        if (x > x0 + w * 0.82 && ERX.bayer(x, y) < 0.5) col = c32(wallShade);
        if (y < wallTop + 2 && ERX.bayer(x, y) < 0.75) col = c32(wallShade);
        buf.set(x, y, col);
      }
    }
    // foundation stones
    for (let y = BH - 3; y < BH; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const mortar = y === BH - 3 || (x + (y % 2) * 3) % 6 === 0;
        buf.set(x, y, c32(mortar ? PAL.stone[2] : y === BH - 2 ? PAL.stone[0] : PAL.stone[1]));
      }
    }
    // timber frame
    if (o.timber) {
      const cols = [x0, x0 + w - 1];
      const nPanels = Math.max(2, Math.round(w / 14));
      for (let i = 1; i < nPanels; i++) cols.push(x0 + Math.round((i * w) / nPanels));
      for (const cx of cols) buf.rect(cx, wallTop, 1, wallH - 3, timber);
      buf.rect(x0, wallTop, w, 1, timber);
      if (o.floors > 1) buf.rect(x0, wallTop + Math.round((wallH - 3) / 2), w, 1, timber);
      buf.rect(x0, BH - 4, w, 1, timber);
    }

    // windows & door
    const floorH = Math.round((wallH - 3) / o.floors);
    const slots = Math.max(1, Math.floor((w - 4) / 13));
    const doorSlot = o.kind === 'house' ? rng.int(0, slots - 1) : Math.floor(slots / 2);
    let door = null;
    for (let f = 0; f < o.floors; f++) {
      const fy = wallTop + f * floorH;
      for (let i = 0; i < slots; i++) {
        const cx = x0 + Math.round(((i + 0.5) * w) / slots);
        const ground = f === o.floors - 1;
        if (ground && i === doorSlot) {
          const dw = 7, dh = Math.min(12, floorH - 2);
          const dx = cx - 3, dy = BH - 3 - dh;
          buf.rect(dx - 1, dy - 1, dw + 2, dh + 1, ink);
          buf.rect(dx, dy, dw, dh, c32('#6a4028'));
          for (let px = dx + 1; px < dx + dw; px += 2) buf.rect(px, dy + 1, 1, dh - 1, c32('#55301e'));
          buf.set(dx, dy, ink); buf.set(dx + dw - 1, dy, ink);
          buf.set(dx + dw - 2, dy + Math.round(dh / 2), c32('#ffd34d'));
          buf.rect(dx - 1, BH - 3, dw + 2, 1, c32(PAL.stone[0]));
          door = { x: dx, y: dy, w: dw, h: dh };
          continue;
        }
        const ww = 7, wh = 8;
        const wx = cx - 3, wy = fy + Math.round((floorH - wh) / 2) - (ground ? 1 : 0);
        if (wy + wh > BH - 4) continue;
        buf.rect(wx - 1, wy - 1, ww + 2, wh + 2, ink);
        buf.rect(wx, wy, ww, wh, c32(PAL.glass[0]));
        buf.rect(wx + 1, wy + 1, ww - 3, wh - 4, c32(PAL.glass[1]));
        buf.rect(wx + 3, wy, 1, wh, c32(PAL.glass[2]));
        buf.rect(wx, wy + 3, ww, 1, c32(PAL.glass[2]));
        buf.rect(wx - 2, wy + wh + 1, ww + 4, 1, c32('#8a6a4a'));
        if (rng.chance(0.4)) {
          buf.rect(wx - 1, wy + wh + 2, ww + 2, 2, c32('#4a7a3a'));
          for (let k = 0; k < 4; k++) buf.set(wx + rng.int(-1, ww), wy + wh + 1 + rng.int(0, 1), c32(rng.pick(['#e85a7a', '#ffd34d', '#ffffff', '#e86a3a'])));
        }
        windows.push({ x: wx, y: wy, w: ww, h: wh });
      }
    }

    // roof
    for (let r = 0; r < roofH; r++) {
      const t = r / Math.max(1, roofH - 1);
      const left = Math.round(U.lerp(BW * 0.28, 0, t));
      const right = Math.round(U.lerp(BW * 0.72, BW - 1, t));
      const y = chim + r;
      for (let x = left; x <= right; x++) {
        let col = x < BW * 0.5 ? roofLight : roof;
        if (r % 3 === 2) col = roofDark;
        else if ((x + (Math.floor(r / 3) % 2) * 2) % 4 === 0) col = x < BW * 0.5 ? roof : roofDark;
        if (x === left || x === right) col = ink;
        buf.set(x, y, col);
      }
    }
    buf.rect(Math.round(BW * 0.28), chim, Math.round(BW * 0.44) + 1, 1, ink);
    buf.rect(Math.round(BW * 0.28) + 1, chim + 1, Math.round(BW * 0.44) - 1, 1, roofLight);
    buf.rect(0, wallTop, BW, 1, ink);

    // chimney
    const chx = Math.round(BW * 0.66);
    const chTop = 3, chBottom = chim + Math.round(roofH * 0.45);
    for (let y = chTop; y < chBottom; y++) {
      for (let x = chx; x < chx + 5; x++) {
        const mortar = (y % 3 === 0) || (x + (Math.floor(y / 3) % 2) * 2) % 4 === 0;
        buf.set(x, y, c32(x === chx ? PAL.stone[0] : mortar ? PAL.stone[2] : PAL.stone[1]));
      }
    }
    buf.rect(chx - 1, chTop - 1, 7, 2, c32(PAL.stone[2]));

    // shop extras: striped awning + hanging sign
    let sign = null;
    if ((o.kind === 'shop' || o.kind === 'inn') && door) {
      const ax = door.x - 5, ay = door.y - 6, aw = door.w + 10;
      const stripe = o.awning || '#c84a4a';
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < aw; x++) buf.set(ax + x - (3 - y), ay + y, c32(Math.floor((x + 3 - y) / 3) % 2 ? '#f2e8d8' : stripe));
      }
      for (let x = 0; x < aw; x += 3) buf.set(ax + x - 0, ay + 4, c32(stripe));
      buf.rect(ax - 3, ay - 1, aw, 1, ink);
      sign = { x: door.x + door.w + 6, y: door.y - 10, icon: o.icon };
    }
    buf.outline(ink);
    return { buf, BW, BH, windows, door, chimney: { x: chx + 2, y: chTop - 2 }, sign };
  }

  const SIGN_ICONS = {
    potion: ['..#..', '.###.', '#####', '#####', '.###.'],
    mug: ['####.', '#..##', '#..#.#', '####.', '####.'],
    sword: ['....#', '...#.', '#.#..', '.#...', '#.#..'],
    bread: ['.###.', '#####', '#.#.#', '#####', '.....'],
  };

  function makeSign(icon, wood) {
    const b = new PB(11, 13);
    b.rect(5, 0, 1, 3, c32('#2a2a30'));
    b.rect(1, 3, 9, 9, c32(wood || '#7a5236'));
    b.rect(1, 3, 9, 1, c32('#9a6e48'));
    const rows = SIGN_ICONS[icon] || SIGN_ICONS.mug;
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') b.set(3 + x, 5 + y, c32('#ffe08a')); });
    b.outline(c32(PAL.outline));
    return b.toCanvas();
  }

  function makeSmithy(rng, w, h) {
    const BW = w + 4, BH = h + 4;
    const b = new PB(BW, BH);
    const ink = c32(PAL.outline);
    const roofY = 6;
    // slanted roof
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < BW; x++) {
        const yy = roofY - 6 + y + Math.round((x / BW) * 4);
        b.set(x, yy, c32(y === 0 ? '#9a6a4a' : y % 2 ? '#6a4632' : '#7a5238'));
      }
    }
    // posts
    for (const px of [2, BW - 4]) b.rect(px, roofY + 4, 2, BH - roofY - 4, c32('#5a3a28'));
    // dark interior + forge
    b.rect(4, roofY + 6, BW - 8, BH - roofY - 9, c32('#2a1a24'));
    const fx = 6, fy = BH - 14;
    b.rect(fx, fy, 12, 11, c32(PAL.stone[1]));
    b.rect(fx + 2, fy + 2, 8, 5, c32('#ff7a2a'));
    b.rect(fx + 3, fy + 3, 6, 3, c32('#ffd060'));
    b.rect(fx + 4, fy - 14, 4, 14, c32(PAL.stone[2]));
    // tools on the wall
    for (let i = 0; i < 3; i++) b.rect(BW - 16 + i * 4, roofY + 9, 1, 6, c32('#9aa0b0'));
    b.rect(0, BH - 2, BW, 2, c32(PAL.stone[2]));
    b.outline(ink);
    return { buf: b, BW, BH, forge: { x: fx + 6, y: fy + 4 } };
  }

  function makeAnvil() {
    return ERX.Sprites.fromStrings([
      '#########.',
      '.#######..',
      '...###....',
      '..#####...',
      '.#######..',
    ], { '#': '#5a5e70' });
  }

  function makeBench() {
    return ERX.Sprites.fromStrings([
      'bbbbbbbbbbbb',
      'dddddddddddd',
      '.d........d.',
      '.d........d.',
    ], { b: '#8a6040', d: '#5a3a28' });
  }

  function makeLampGlow(r, color) {
    const b = new PB(r * 2 + 1, r * 2 + 1);
    P.glow(b, r, r, r, color, 0.55, 1.4);
    P.glow(b, r, r, r * 0.45, '#fff0b0', 0.7, 1.2);
    return b.toCanvas();
  }

  class Village extends ERX.Environment {
    build(W, H) {
      super.build(W, H);
      const M = this.M, LW = W + M * 2;
      const rng = new U.RNG(this.seed);
      this.rng = rng.fork(7);
      const s = H / 270;

      this.groundY = Math.round(H * 0.74);
      this.pathTop = this.groundY + 4;
      this.pathBot = Math.round(H * 0.865);
      const horizon = this.groundY - Math.round(18 * s);

      // ---- sky ----
      const sky = new PB(W, H);
      P.gradient(sky, PAL.sky, 0, horizon + 4, 0.55);
      sky.rect(0, horizon + 4, W, H, c32('#ffbe6a'));
      const sunX = Math.round(W * 0.16), sunY = horizon - Math.round(10 * s);
      P.glow(sky, sunX, sunY, H * 0.3, '#d0606a', 0.55, 2);
      P.glow(sky, sunX, sunY, H * 0.16, '#f49a5a', 0.75, 1.6);
      sky.circle(sunX, sunY, Math.round(13 * s), c32('#ffb050'));
      sky.circle(sunX - 1, sunY - 1, Math.round(11 * s), c32('#ffe08a'));
      for (let i = 0; i < 4; i++) sky.hline(sunX - 16, sunX + 16, sunY + 3 + i * 3, c32(i % 2 ? '#e8806a' : '#f49a5a'));
      this.skyCanvas = sky.toCanvas();
      this.stars = [];
      for (let i = 0; i < 26; i++) this.stars.push({ x: rng.int(0, W), y: rng.int(2, Math.round(H * 0.3)), p: rng.range(0, 6), r: rng.range(1, 3) });

      this.clouds = [];
      for (let i = 0; i < 6; i++) {
        const cw = rng.int(50, 110);
        this.clouds.push({ canvas: P.streakCloud(rng, cw, rng.int(7, 11), PAL.cloud).toCanvas(), x: rng.range(-cw, W), y: rng.range(0.08, 0.45) * H, speed: rng.range(1, 2.5) });
      }

      // ---- far mountains & hills ----
      const mtnH = Math.round(H * 0.32);
      const mtn = P.mountains(rng, LW, mtnH, {
        peaks: Math.max(3, Math.round(LW / 110)), minH: mtnH * 0.35, maxH: mtnH * 0.85,
        rock: PAL.mountains.rock, snow: null, rim: PAL.mountains.rim, lean: 0.6, jag: 0.8,
        fade: { color: PAL.mountains.fade, start: mtnH * 0.55, end: mtnH * 1.1 },
      });
      this.mtn = { canvas: mtn.canvas, y: horizon - mtnH + 6 };

      const hillH = Math.round(H * 0.2);
      const hills = P.hills(rng, LW, hillH, { base: hillH * 0.55, amp: hillH * 0.45, freq: 0.012, colors: PAL.hills });
      // castle silhouette on the highest hill
      let hx = 0;
      for (let x = Math.round(LW * 0.6); x < LW - 20; x++) if (hills.top[x] < hills.top[hx] || hx === 0) hx = x;
      const hb = hills.buf, castleCol = c32('#2a2046'), litWin = c32('#ffcf5a');
      const cy = hills.top[hx] + 2;
      hb.rect(hx - 10, cy - 10, 20, 12, castleCol);
      for (const tx of [hx - 12, hx + 8]) { hb.rect(tx, cy - 18, 5, 20, castleCol); hb.rect(tx - 1, cy - 19, 7, 2, castleCol); }
      hb.rect(hx - 2, cy - 22, 4, 12, castleCol);
      for (let i = -10; i < 10; i += 3) hb.set(hx + i, cy - 11, castleCol);
      hb.set(hx - 10, cy - 13, litWin); hb.set(hx + 10, cy - 14, litWin); hb.set(hx, cy - 18, litWin);
      this.hills = { canvas: hb.toCanvas(), y: horizon - Math.round(hillH * 0.45) };

      // ---- back tree line ----
      const bt = new PB(LW, Math.round(H * 0.2));
      const btBase = bt.h - 1;
      for (let x = -6; x < LW + 6; x += rng.int(6, 12)) {
        const tr = P.roundTree(rng, rng.int(5, 9), PAL.backTree);
        bt.blit(tr, x - (tr.w >> 1), btBase - tr.h + 1);
      }
      this.backTrees = { canvas: bt.toCanvas(), y: this.groundY - bt.h + 2 };

      this._buildVillage(rng, LW, H, s);
      this._buildForeground(rng, LW, H);
      this._buildActors(rng, LW, s);

      this.lampGlow = makeLampGlow(Math.round(14 * s), '#ffb04a');
      this.forgeGlow = makeLampGlow(Math.round(10 * s), '#ff7a2a');
      this.smoke = new P.Particles();
      this.sparks = new P.Particles();
      this.flies = new P.Particles();
      this.flock = new P.Flock(rng, { count: 4, W, yMin: H * 0.08, yMax: H * 0.35, speedMin: 9, speedMax: 15, color: '#2a1a3a', dir: -1 });
      this.windowTimer = 3;
    }

    _buildVillage(rng, LW, H, s) {
      const vb = new PB(LW, H);
      const gy = this.groundY;
      // ground strip + cobblestone path
      const G = PAL.grass.map(c32), Pa = PAL.path.map(c32);
      vb.rect(0, gy - 1, LW, this.pathTop - gy + 1, G[1]);
      for (let x = 0; x < LW; x++) if (ERX.bayer(x, gy - 1) < 0.5) vb.set(x, gy - 1, G[0]);
      vb.rect(0, this.pathTop, LW, this.pathBot - this.pathTop, Pa[2]);
      const tones = [Pa[1], Pa[1], Pa[0], c32('#7a665c')];
      for (let y = this.pathTop; y < this.pathBot;) {
        const rh = rng.int(3, 4);
        let x = -rng.int(0, 6);
        while (x < LW) {
          const sw = rng.int(4, 8);
          const tone = rng.pick(tones);
          for (let yy = 0; yy < rh - 1 && y + yy < this.pathBot; yy++) {
            for (let xx = 0; xx < sw - 1; xx++) {
              const corner = (xx === 0 || xx === sw - 2) && (yy === 0 || yy === rh - 2);
              if (corner) continue;
              let col = tone;
              if (yy === 0 || xx === 0) col = Pa[3];
              if (yy === rh - 2 && xx > 0) col = Pa[2] === tone ? Pa[1] : c32('#5e4e4c');
              vb.set(x + xx, y + yy, col);
            }
          }
          x += sw;
        }
        y += rh;
      }
      // worn dirt and stray grass on the stones
      for (let i = 0; i < LW / 6; i++) {
        const gx = rng.int(0, LW), gy2 = rng.int(this.pathTop, this.pathBot - 1);
        vb.set(gx, gy2, rng.chance(0.5) ? G[1] : c32('#7a6450'));
      }
      // grass edge below the path
      vb.rect(0, this.pathBot, LW, H - this.pathBot, G[2]);
      for (let x = 0; x < LW; x++) {
        vb.set(x, this.pathBot, G[1]);
        if (ERX.bayer(x, this.pathBot + 1) < 0.5) vb.set(x, this.pathBot + 1, G[1]);
      }

      // buildings along the street
      this.windows = [];
      this.chimneys = [];
      this.lamps = [];
      this.signs = [];
      this.props = [];
      const order = ['house', 'smithy', 'house', 'shop', 'house', 'house', 'inn', 'shop', 'house', 'house', 'shop', 'house'];
      const icons = ['potion', 'sword', 'bread', 'mug'];
      let x = rng.int(-8, 4);
      let k = 0;
      while (x < LW + 10) {
        const kind = order[k % order.length];
        k++;
        if (kind === 'smithy') {
          const sw = Math.round(46 * s), sh = Math.round(40 * s);
          const sm = makeSmithy(rng, sw, sh);
          vb.blit(sm.buf, x, gy - sm.BH + 1);
          this.smithy = { x, forgeX: x + sm.forge.x, forgeY: gy - sm.BH + 1 + sm.forge.y, anvilX: x + Math.round(sm.BW * 0.62) };
          const anvil = makeAnvil();
          this.props.push({ canvas: anvil, x: this.smithy.anvilX, y: this.pathTop + 1 - anvil.height + 3 });
          x += sm.BW + rng.int(4, 10);
          continue;
        }
        const floors = kind === 'inn' ? 2 : rng.chance(0.35) ? 2 : 1;
        const w = Math.round((kind === 'inn' ? 64 : rng.int(40, 58)) * s);
        const wallH = Math.round((floors === 2 ? rng.int(40, 46) : rng.int(26, 32)) * s);
        const wallPal = rng.pick(PAL.walls);
        const house = makeHouse(rng, {
          w, wallH, roofH: Math.round(rng.int(16, 22) * s), floors, kind,
          wall: wallPal, roof: rng.pick(PAL.roofs), timber: rng.chance(0.6) || kind === 'inn',
          awning: rng.pick(['#c84a4a', '#3a8a5a', '#3a5aa8', '#a85aa8']), icon: kind === 'inn' ? 'mug' : icons[k % icons.length],
        });
        const hx = x, hy = gy - house.BH + 1;
        vb.blit(house.buf, hx, hy);
        for (const wdw of house.windows) this.windows.push({ x: hx + wdw.x, y: hy + wdw.y, w: wdw.w, h: wdw.h, on: true });
        this.chimneys.push({ x: hx + house.chimney.x, y: hy + house.chimney.y, t: rng.range(0, 1) });
        if (house.sign) this.signs.push({ canvas: makeSign(house.sign.icon), x: hx + house.sign.x, y: hy + house.sign.y, phase: rng.range(0, 6) });
        if (kind === 'inn') this.inn = { x: hx, w: house.BW, doorX: hx + house.door.x };
        if (kind === 'shop' && !this.shop) this.shop = { x: hx, doorX: hx + house.door.x, w: house.BW };
        x += house.BW;

        // gap decoration: lamp post, tree or barrels
        const gap = rng.int(5, 16);
        const gx = x + Math.floor(gap / 2);
        if (gap >= 12 && rng.chance(0.6)) {
          const tree = P.roundTree(rng, Math.round(rng.int(6, 9) * s), { dark: '#24402e', mid: '#2e5636', light: '#406e42', hi: '#5a8a4a', trunk: '#4a3226', trunkDark: '#33221c', outline: PAL.outline });
          vb.blit(tree, gx - (tree.w >> 1), gy - tree.h + 2);
        } else if (gap >= 6) {
          this._lampPost(vb, gx, gy, s);
        }
        if (rng.chance(0.3)) {
          const bx = x - 4;
          vb.rect(bx, gy - 6, 5, 6, c32('#7a5236'));
          vb.rect(bx, gy - 4, 5, 1, c32('#3a2a22'));
          vb.rect(bx + 1, gy - 6, 3, 1, c32('#9a6e48'));
        }
        x += gap;
      }
      // a bench for the village elder
      this.bench = { canvas: makeBench(), x: Math.round(LW * 0.83), y: this.pathTop - 2 };
      this.villageCanvas = vb.toCanvas();
    }

    _lampPost(vb, x, gy, s) {
      const h = Math.round(22 * s);
      vb.rect(x, gy - h, 1, h, c32('#2a2230'));
      vb.rect(x - 1, gy - 1, 3, 1, c32('#2a2230'));
      vb.rect(x - 2, gy - h - 5, 5, 5, c32('#2a2230'));
      vb.rect(x - 1, gy - h - 4, 3, 3, c32('#ffd060'));
      vb.set(x, gy - h - 6, c32('#2a2230'));
      this.lamps.push({ x, y: gy - h - 3, p: Math.random() * 10 });
    }

    _buildForeground(rng, LW, H) {
      const fg = new PB(LW, H);
      const top = Math.round(H * 0.915);
      const G = ['#2e5432', '#40703c', '#22402a'].map(c32);
      const noise = new U.Noise(rng.int(1, 1e9));
      this.fgTop = new Int16Array(LW);
      for (let x = 0; x < LW; x++) {
        const t = top + Math.round((noise.n1(x * 0.05) - 0.5) * 6);
        this.fgTop[x] = t;
        for (let y = t; y < H; y++) fg.set(x, y, y === t ? G[1] : ERX.bayer(x, y) < 0.3 ? G[2] : G[0]);
      }
      // bushes with flowers
      for (let i = 0; i < Math.round(LW / 60); i++) {
        const bx = rng.int(0, LW), r = rng.int(6, 11);
        const by = this.fgTop[U.clamp(bx, 0, LW - 1)] + 2;
        fg.circle(bx, by, r, c32('#1e3a26'));
        fg.circle(bx - 1, by - 1, r - 2, c32('#2a5032'));
        fg.circle(bx - r * 0.35, by - r * 0.4, r * 0.4, c32('#3a6a40'));
        for (let f = 0; f < r; f++) fg.set(bx + rng.int(-r + 2, r - 2), by + rng.int(-r + 2, 0), c32(rng.pick(['#e85a7a', '#ffd34d', '#f0e8ff'])));
      }
      // wooden fences at both ends
      const fence = (x0, x1) => {
        for (let x = x0; x < x1; x++) {
          const t = this.fgTop[U.clamp(x, 0, LW - 1)];
          if ((x - x0) % 9 === 0) { fg.rect(x, t - 12, 2, 13, c32('#6a4a32')); fg.set(x, t - 12, c32('#8a6444')); }
          fg.set(x, t - 9, c32('#8a6444')); fg.set(x, t - 5, c32('#7a5638'));
          fg.set(x, t - 8, c32('#5a3e2a'));
        }
      };
      fence(0, Math.round(LW * 0.2));
      fence(Math.round(LW * 0.8), LW);
      fg.outline(c32(PAL.outline));
      this.fgCanvas = fg.toCanvas();
      this.grass = new P.Grass();
      for (let x = 0; x < LW; x += rng.int(1, 3)) this.grass.add(x, this.fgTop[x] - 1, rng.int(2, 5), rng.pick(['#40703c', '#5a8a4a', '#2e5432']), rng.range(0, 6));
    }

    _buildActors(rng, LW, s) {
      const lanes = [this.pathTop + 6, Math.round((this.pathTop + this.pathBot) / 2) + 2, this.pathBot - 1];
      this.lanes = lanes;
      this.walkers = [];
      const count = Math.max(8, Math.round(LW / 45));
      for (let i = 0; i < count; i++) {
        const person = A.makePerson(rng, { kid: rng.chance(0.15) });
        this.walkers.push({
          p: person, x: rng.range(0, LW), lane: rng.int(0, 2), y: 0, dir: rng.sign(), speed: rng.range(9, 15) * (person.look.kid ? 1.4 : 1),
          state: 'walk', timer: rng.range(3, 9), frameT: rng.range(0, 4), facing: 1, bubble: null, bubbleT: 0, cooldown: rng.range(2, 6),
        });
      }
      for (const w of this.walkers) { w.y = lanes[w.lane]; w.facing = w.dir; }

      this.statics = [];
      // blacksmith at the anvil
      if (this.smithy) {
        this.statics.push({ kind: 'smith', p: A.makePerson(rng, { apron: true, hairStyle: 'bald', shirt: '#6a3a2a' }), x: this.smithy.anvilX - 7, y: this.pathTop + 3, facing: 1, t: 0, hit: false });
        this.statics.push({ kind: 'dog', x: this.smithy.x + 4, y: this.pathTop + 2, facing: 1, t: rng.range(0, 3) });
      }
      // shopkeeper waving by their door
      if (this.shop) this.statics.push({ kind: 'shopkeeper', p: A.makePerson(rng, { apron: true }), x: this.shop.doorX + 12, y: this.pathTop + 2, facing: -1, t: rng.range(0, 5) });
      // two friends chatting by the inn
      if (this.inn) {
        const ix = this.inn.doorX - 10;
        this.statics.push({ kind: 'chat', p: A.makePerson(rng), x: ix, y: this.pathTop + 5, facing: 1, t: 0, speaker: true });
        this.statics.push({ kind: 'chat', p: A.makePerson(rng), x: ix + 11, y: this.pathTop + 5, facing: -1, t: 1.6, speaker: false });
      }
      // the village elder on the bench
      this.statics.push({ kind: 'elder', p: A.makePerson(rng, { hair: '#d8d4d0', hairStyle: 'bald', shirt: '#5a5a7a' }), x: this.bench.x + 4, y: this.bench.y + 2, facing: -1, t: 0 });
      // a guard who keeps looking around
      if (this.lamps.length) {
        const lamp = this.lamps[Math.floor(this.lamps.length * 0.25)];
        this.statics.push({ kind: 'guard', p: A.makePerson(rng, { hairStyle: 'hat', hatColor: '#5a5e70', shirt: '#3a4a7a' }), x: lamp.x + 6, y: this.pathTop + 3, facing: 1, t: rng.range(0, 4) });
      }
      // a cat on a fence, chickens pecking
      this.statics.push({ kind: 'cat', x: Math.round(LW * 0.12), y: this.fgTop[Math.round(LW * 0.12)] - 13, facing: 1, t: 0 });
      for (let i = 0; i < 3; i++) {
        this.statics.push({ kind: 'chicken', x: rng.range(LW * 0.3, LW * 0.75), y: lanes[2] + 1, facing: rng.sign(), t: rng.range(0, 4), home: 0, wander: rng.range(10, 30) });
      }
      for (const st of this.statics) if (st.kind === 'chicken') st.home = st.x;
      // kid chasing a runaway chicken
      this.chase = { x: rng.range(0, LW), dir: 1, y: lanes[1] + 1, kid: A.makePerson(rng, { kid: true }), t: 0 };
    }

    _visibleCount(n) {
      return this.low ? Math.ceil(n / 2) : n;
    }

    update(dt) {
      super.update(dt);
      const W = this.W, LW = W + this.M * 2, R = this.rng;
      for (const c of this.clouds) { c.x -= c.speed * dt; if (c.x < -c.canvas.width) c.x = W + 10; }
      if (!this.low) this.flock.update(dt);

      // walkers
      const active = this.walkers.slice(0, this._visibleCount(this.walkers.length));
      for (const w of active) {
        w.cooldown -= dt;
        w.bubbleT -= dt;
        if (w.state === 'walk') {
          w.x += w.dir * w.speed * dt;
          w.frameT += dt * w.speed * 0.2;
          w.facing = w.dir;
          w.timer -= dt;
          if (w.timer <= 0) {
            w.state = R.chance(0.5) ? 'idle' : 'look';
            w.timer = R.range(1.5, 4);
          }
          if (w.x < -30 || w.x > LW + 30) {
            w.dir = w.x < 0 ? 1 : -1;
            w.lane = R.int(0, 2);
          }
          // bump into someone heading the other way -> stop and chat
          if (w.cooldown <= 0) {
            for (const o of active) {
              if (o === w || o.state !== 'walk' || o.lane !== w.lane || o.dir === w.dir || o.cooldown > 0) continue;
              const d = (o.x - w.x) * w.dir;
              if (d > 8 && d < 14) {
                w.state = o.state = 'talk';
                w.timer = o.timer = R.range(4, 7);
                w.partner = o; o.partner = w;
                w.facing = w.dir; o.facing = o.dir;
                w.speaker = true; o.speaker = false;
                w.talkT = 0; o.talkT = 0;
                break;
              }
            }
          }
        } else {
          w.timer -= dt;
          if (w.state === 'look' && Math.floor(w.timer * 1.2) % 2 === 0) w.facing = -w.dir; else if (w.state === 'look') w.facing = w.dir;
          if (w.state === 'talk') {
            w.talkT = (w.talkT || 0) + dt;
            if (w.speaker && w.talkT > 1.4) { w.talkT = 0; w.speaker = false; if (w.partner) { w.partner.speaker = true; w.partner.talkT = 0; } }
            if (w.speaker && w.bubbleT <= 0) { w.bubble = R.pick(A.BUBBLES); w.bubbleT = 1.2; }
          }
          if (w.timer <= 0) {
            w.state = 'walk';
            w.timer = R.range(4, 10);
            w.cooldown = R.range(5, 10);
            w.bubble = null;
            if (R.chance(0.3)) w.dir = -w.dir;
            w.partner = null;
          }
        }
        w.y = this.lanes[w.lane];
      }

      // stationary villagers & animals
      for (const st of this.statics) {
        st.t += dt;
        if (st.kind === 'smith') {
          const cyc = st.t % 0.9;
          const down = cyc > 0.62;
          if (down && !st.hit) {
            st.hit = true;
            if (!this.low) {
              for (let i = 0; i < 5; i++) this.sparks.add({ x: st.x + 10, y: st.y - 6, vx: R.range(-25, 25), vy: R.range(-40, -15), ay: 120, life: R.range(0.25, 0.5), color: R.pick(['#ffd060', '#ff9a3a', '#ffffff']), size: 1 });
            }
            const sx = (st.x - this.M) / this.W;
            if (sx > -0.1 && sx < 1.1) ERX.Audio.playSfx('anvil', { bus: 'ambience', pan: U.clamp(sx * 2 - 1, -1, 1), volume: 0.035, minGap: 0.3 });
          } else if (!down) st.hit = false;
        } else if (st.kind === 'chicken') {
          // wander and peck
          const phase = Math.floor(st.t / 2.5) % 3;
          if (phase === 1) {
            st.x += st.facing * 6 * dt;
            if (Math.abs(st.x - st.home) > st.wander) st.facing = st.x > st.home ? -1 : 1;
          }
        } else if (st.kind === 'guard') {
          st.facing = Math.floor(st.t / 3) % 2 === 0 ? 1 : -1;
        }
      }

      // kid chasing a chicken
      const ch = this.chase;
      ch.t += dt;
      ch.x += ch.dir * 22 * dt;
      if (ch.x > LW + 60) { ch.dir = -1; } else if (ch.x < -60) { ch.dir = 1; }

      // chimney smoke
      if (!this.low) {
        for (const c of this.chimneys) {
          c.t -= dt;
          if (c.t <= 0) {
            c.t = R.range(0.3, 0.6);
            this.smoke.add({ x: c.x + R.range(-1, 1), y: c.y, vx: R.range(2, 5), vy: -R.range(5, 9), ax: 1.2, life: R.range(3.5, 5.5), color: R.pick(['#9a8a9e', '#b4a2b0', '#7e6e86']), size: 2, grow: 3, fadeOut: 2, alpha: 0.75 });
          }
        }
        if (this.flies.count < 18 && R.chance(dt * 4)) {
          this.flies.add({ x: R.range(0, LW), y: R.range(this.pathBot - 6, this.H - 4), vx: R.range(-4, 4), vy: R.range(-3, 1), life: R.range(4, 8), color: '#d8ff6a', size: 1, blink: 4, phase: R.range(0, 6), wobble: 6, wobbleRate: 2, fadeIn: 1, fadeOut: 1 });
        }
      }
      // occasionally someone flips a light switch
      this.windowTimer -= dt;
      if (this.windowTimer <= 0 && this.windows.length) {
        this.windowTimer = R.range(2, 6);
        const w = R.pick(this.windows);
        w.on = !w.on || R.chance(0.2);
        if (!w.on) w.offT = R.range(4, 12);
      }
      for (const w of this.windows) if (!w.on) { w.offT -= dt; if (w.offT <= 0) w.on = true; }
      this.smoke.update(dt);
      this.sparks.update(dt);
      this.flies.update(dt);
    }

    _drawPerson(ctx, person, pose, frame, facing, x, y) {
      const fr = person.frames[pose][frame % person.frames[pose].length];
      ctx.drawImage(facing < 0 ? fr.l : fr.r, Math.round(x - A.ANCHOR.x), Math.round(y - A.ANCHOR.y));
    }

    render(ctx, cam) {
      const W = this.W, H = this.H, t = this.t;
      ctx.drawImage(this.skyCanvas, 0, 0);
      // twinkling stars in the dusk sky
      for (const st of this.stars) {
        const a = 0.5 + 0.5 * Math.sin(t * st.r + st.p);
        if (this.low && a < 0.7) continue;
        ctx.fillStyle = a > 0.75 ? '#ffffff' : '#c8b8e8';
        ctx.fillRect(st.x, st.y, 1, 1);
      }
      for (const c of this.clouds) ctx.drawImage(c.canvas, Math.round(c.x - cam.x * 0.08), Math.round(c.y));
      if (!this.low) this.flock.render(ctx, -cam.x * 0.2, 0);

      ctx.drawImage(this.mtn.canvas, this.px(cam, 0.1), this.mtn.y + this.py(cam, 0.1));
      ctx.drawImage(this.hills.canvas, this.px(cam, 0.3), this.hills.y + this.py(cam, 0.3));
      ctx.drawImage(this.backTrees.canvas, this.px(cam, 0.55), this.backTrees.y + this.py(cam, 0.55));

      // ---- the street (houses, villagers) ----
      const vx = this.px(cam, 0.85), vy = this.py(cam, 0.85);
      ctx.drawImage(this.villageCanvas, vx, vy);
      // windows switched off
      ctx.fillStyle = '#3a2a3a';
      for (const w of this.windows) if (!w.on) {
        ctx.fillRect(w.x + vx, w.y + vy, w.w, w.h);
        ctx.fillStyle = '#5a4058';
        ctx.fillRect(w.x + vx + 3, w.y + vy, 1, w.h);
        ctx.fillRect(w.x + vx, w.y + vy + 3, w.w, 1);
        ctx.fillStyle = '#3a2a3a';
      }
      // swinging shop signs
      for (const sg of this.signs) {
        const sw = this.low ? 0 : Math.round(Math.sin(t * 1.3 + sg.phase) * 0.8);
        ctx.drawImage(sg.canvas, sg.x + vx + sw, sg.y + vy);
      }
      // forge glow
      if (this.smithy) {
        const fl = 0.55 + 0.25 * Math.sin(t * 9) + 0.15 * Math.sin(t * 23);
        ctx.globalAlpha = U.clamp(fl, 0.2, 1);
        ctx.drawImage(this.forgeGlow, this.smithy.forgeX + vx - (this.forgeGlow.width >> 1), this.smithy.forgeY + vy - (this.forgeGlow.height >> 1));
        ctx.globalAlpha = 1;
      }
      this.smoke.render(ctx, vx, vy);
      for (const pr of this.props) ctx.drawImage(pr.canvas, pr.x + vx, pr.y + vy);
      ctx.drawImage(this.bench.canvas, this.bench.x + vx, this.bench.y + vy);

      // collect everyone, draw back-to-front
      const draw = [];
      const active = this.walkers.slice(0, this._visibleCount(this.walkers.length));
      for (const w of active) draw.push({ y: w.y, fn: () => {
        const pose = w.state === 'walk' ? 'walk' : w.state === 'talk' ? 'talk' : 'stand';
        const frame = w.state === 'walk' ? Math.floor(w.frameT) % 4 : w.state === 'talk' && w.speaker ? Math.floor(t * 4) % 2 : 0;
        this._drawPerson(ctx, w.p, pose, frame, w.facing, w.x + vx, w.y + vy);
        if (w.state === 'talk' && w.speaker && w.bubble) ctx.drawImage(A.bubble(w.bubble), Math.round(w.x + vx - 3), Math.round(w.y + vy - 28));
      } });
      for (const st of this.statics) draw.push({ y: st.y, fn: () => this._drawStatic(ctx, st, vx, vy) });
      const ch = this.chase;
      draw.push({ y: ch.y, fn: () => {
        const hen = A.animal('chicken')[0];
        ctx.drawImage(ch.dir > 0 ? hen.r : hen.l, Math.round(ch.x + vx + ch.dir * 16), Math.round(ch.y + vy - 5 - (Math.floor(t * 10) % 2)));
        this._drawPerson(ctx, ch.kid, 'walk', Math.floor(t * 9) % 4, ch.dir, ch.x + vx, ch.y + vy);
      } });
      draw.sort((a, b) => a.y - b.y);
      for (const d of draw) d.fn();
      this.sparks.render(ctx, vx, vy);

      // lantern glow (drawn over the street)
      for (const l of this.lamps) {
        ctx.globalAlpha = this.low ? 0.7 : 0.6 + 0.2 * Math.sin(t * 7 + l.p) + 0.1 * Math.sin(t * 17 + l.p);
        ctx.drawImage(this.lampGlow, l.x + vx - (this.lampGlow.width >> 1), l.y + vy - (this.lampGlow.height >> 1));
      }
      ctx.globalAlpha = 1;

      // ---- foreground ----
      const fx = this.px(cam, 1.15), fy = this.py(cam, 1.15);
      ctx.drawImage(this.fgCanvas, fx, fy);
      this.grass.render(ctx, t, fx, fy, (x, tt, ph) => Math.sin(tt * 1.5 + ph + x * 0.04) * 1.2, this.low);
      this.flies.render(ctx, vx, vy);
    }

    _drawStatic(ctx, st, vx, vy) {
      const t = st.t;
      switch (st.kind) {
        case 'smith':
          this._drawPerson(ctx, st.p, 'hammer', (t % 0.9) > 0.62 ? 1 : 0, 1, st.x + vx, st.y + vy);
          break;
        case 'shopkeeper': {
          const waving = (t % 7) < 1.6;
          this._drawPerson(ctx, st.p, waving ? 'wave' : 'stand', Math.floor(t * 5) % 2, st.facing, st.x + vx, st.y + vy);
          break;
        }
        case 'chat': {
          const speaking = Math.floor((t + (st.speaker ? 0 : 1.6)) / 1.6) % 2 === 0;
          this._drawPerson(ctx, st.p, 'talk', speaking ? Math.floor(t * 4) % 2 : 0, st.facing, st.x + vx, st.y + vy);
          if (speaking && (t % 1.6) < 1.1) {
            const kinds = ['dots', 'note', 'heart', 'what', 'bang', 'coin'];
            ctx.drawImage(A.bubble(kinds[Math.floor(t / 1.6) % kinds.length]), Math.round(st.x + vx - 3), Math.round(st.y + vy - 28));
          }
          break;
        }
        case 'elder': {
          const nod = (t % 5) > 4.5 ? 1 : 0;
          this._drawPerson(ctx, st.p, 'sit', 0, st.facing, st.x + vx, st.y + vy + nod);
          break;
        }
        case 'guard':
          this._drawPerson(ctx, st.p, 'stand', 0, st.facing, st.x + vx, st.y + vy);
          ctx.fillStyle = '#6a4a30';
          ctx.fillRect(Math.round(st.x + vx + st.facing * 4), Math.round(st.y + vy - 18), 1, 18);
          ctx.fillStyle = '#c8ccd8';
          ctx.fillRect(Math.round(st.x + vx + st.facing * 4), Math.round(st.y + vy - 21), 1, 3);
          break;
        case 'cat': {
          const fr = A.animal('cat')[Math.floor(t * 1.5) % 4 === 0 ? 1 : 0];
          ctx.drawImage(fr.r, Math.round(st.x + vx), Math.round(st.y + vy));
          break;
        }
        case 'dog': {
          const fr = A.animal('dog')[Math.floor(t * 6) % 2];
          ctx.drawImage(fr.r, Math.round(st.x + vx), Math.round(st.y + vy - 6));
          break;
        }
        case 'chicken': {
          const pecking = Math.floor(t / 2.5) % 3 !== 1 && Math.floor(t * 3) % 2 === 0;
          const fr = A.animal('chicken')[pecking ? 1 : 0];
          ctx.drawImage(st.facing < 0 ? fr.l : fr.r, Math.round(st.x + vx), Math.round(st.y + vy - 5));
          break;
        }
      }
    }
  }

  ERX.Backgrounds.register({
    id: 'village',
    name: 'LIVELY VILLAGE',
    music: 'village',
    ambience: 'village',
    Env: Village,
  });
})(window.ERX = window.ERX || {});
