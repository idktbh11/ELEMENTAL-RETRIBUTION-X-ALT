/*
 * THE DEEPER ENDS' LAST STRETCH (js/game/level-deeper.js carves the rooms; this runs them):
 *
 *   THE TRIAL  a tall chamber. Walk in and a gate rises behind you, then six waves of
 *              monsters come through purple portals. They're worth nothing (no XP, no
 *              gold): it's a test, not a buffet. Each wave you clear lights a rune on the
 *              great door at the far end; light all six and it grinds open. Die in there
 *              and you start again from the wave you were on.
 *   THE TORCH  past the door it's pitch black. There's a torch on the wall by the door:
 *              take it, and you carry it, lighting the dark around you.
 *   THE BONES  the corridor's floor is skulls. Skulls and bones and skeletons, all the
 *              way along. Far in, they start to shake... then they fall, and you fall
 *              with them (js/game/abyss-fall.js takes it from there).
 *
 *   ERX.DeeperTrial = { Trial, Torch, Bones, WAVES, boneArt }
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, PB = ERX.PixelBuffer, C = ERX.Color;
  const TS = 16;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const c32 = (h) => C.u32(h);

  // ============================================================ THE TRIAL
  // what comes through the portals, wave by wave (js/game/enemies-deep.js, enemies.js)
  const WAVES = [
    ['darkSlime', 'darkSlime', 'darkSlime'],
    ['zombie', 'zombie', 'bat', 'bat'],
    ['darkSlime', 'darkSlime', 'vampire', 'deeper'],
    ['zombie', 'zombie', 'vampire', 'bat', 'bat'],
    ['deeper', 'deeper', 'darkSlime', 'darkSlime', 'vampire'],
    ['zombie', 'zombie', 'vampire', 'vampire', 'darkSlime', 'darkSlime', 'bat', 'bat', 'deeper'],
  ];
  const WAVE_SUBS = [
    'Dark slimes. A warm-up.',
    'They grab. They flap.',
    'Something under the floor, too.',
    'Getting crowded in here.',
    'Watch your feet.',
    'All of them. At once.',
  ];
  const PORTAL = 0.8;       // a portal swirls this long before its monster steps out
  // the six runes on the door (3 x 4 glyphs, a row of bits each)
  const GLYPHS = [[7, 2, 2, 7], [5, 7, 5, 5], [6, 5, 6, 5], [7, 1, 2, 4], [2, 7, 2, 5], [5, 2, 5, 2]];

  /** Fill an ellipse with rows of rectangles (crisp pixels). */
  function fillEllipse(ctx, cx, cy, rx, ry, col) {
    ctx.fillStyle = col;
    for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
      const k = 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5));
      if (k < 0) continue;
      const hw = Math.floor((rx + 0.5) * Math.sqrt(k));
      ctx.fillRect(Math.round(cx) - hw, Math.round(cy) + dy, hw * 2 + 1, 1);
    }
  }

  class Trial {
    /** def: { gateTx, gateRows: [top, bottom], x0, x1 (the arena, tiles [x0, x1)), doorTx, doorRows } */
    constructor(level, def) {
      this.L = level; this.def = def;
      this.state = 'idle';     // idle -> intro (the gate) -> between / fight (x6) -> open (the door) -> done
      this.wave = 0;           // waves cleared so far
      this.t = 0; this.pause = 0;
      this.portals = [];       // monsters on their way in
      this.mains = [];         // this wave's monsters (not the little slimes that split off them)
      this.runeT = WAVES.map(() => -1);   // how long since each rune lit (-1: still dark)
      this.door = 0;           // 0 shut .. 1 slid all the way up into the rock
      this.doorOpening = false;
      this.gate = new ERX.Props.Gate(level, { tx: def.gateTx, ty0: def.gateRows[0], ty1: def.gateRows[1] });
      this.setDoorSolid(true);
    }
    get x0() { return this.def.x0 * TS; }
    get x1() { return this.def.x1 * TS; }
    get running() { return this.state === 'between' || this.state === 'fight'; }
    get cleared() { return this.wave >= WAVES.length; }

    setDoorSolid(on) {
      const d = this.def;
      for (let tx = d.doorTx; tx < d.doorTx + 2; tx++) for (let ty = d.doorRows[0]; ty <= d.doorRows[1]; ty++) {
        const k = tx + ',' + ty;
        if (on) this.L.dynamicSolid.add(k); else this.L.dynamicSolid.delete(k);
      }
    }
    /** Somewhere to get back up after the trial: by the door. */
    addCheckpoint() {
      const x = (this.def.x1 - 3) * TS;
      if (!this.L.checkpoints.some((c) => c.x === x)) this.L.checkpoints.push({ x, y: this.L.floorY });
    }

    /** Already beaten (a save from after the trial): the gate down, every rune lit, the door open. */
    snapDone() {
      this.state = 'done';
      this.wave = WAVES.length;
      this.runeT = WAVES.map(() => 99);
      this.door = 1;
      this.setDoorSolid(false);
      this.gate.snap(false);
      this.addCheckpoint();
    }

    update(dt, g) {
      const p = g.player;
      this.t += dt;
      for (let i = 0; i < this.runeT.length; i++) if (this.runeT[i] >= 0) this.runeT[i] += dt;
      // the door, grinding up into the rock
      if (this.doorOpening && this.door < 1) {
        const was = this.door;
        this.door = Math.min(1, this.door + dt / 2.6);
        const d = this.def, top = d.doorRows[0] * TS;
        if (Math.random() < dt * 40) g.fx.add({ x: d.doorTx * TS + Math.random() * 2 * TS, y: top + 1, vx: U.lerp(-10, 10, Math.random()), vy: U.lerp(10, 40, Math.random()), ay: 400, life: 0.9, color: Math.random() < 0.5 ? '#4a4260' : '#2a2438', size: Math.random() < 0.3 ? 2 : 1, fadeOut: 0.3 });
        if (was < 0.8 && this.door >= 0.8) this.setDoorSolid(false);
        if (this.door >= 1) { sfx('doorBoom'); ERX.FX.shake(3, 0.3); this.state = 'done'; }
      }
      // monsters stepping out of their portals
      for (const pt of this.portals) {
        const was = pt.t;
        pt.t += dt;
        if (was < 0 && pt.t >= 0) sfx('portalOpen', { minGap: 0.08 });
        if (pt.t >= PORTAL) this.arrive(g, pt);
      }
      this.portals = this.portals.filter((pt) => !pt.done);
      switch (this.state) {
        case 'idle':
          // walk in, and it begins (story-world.js: trialStart closes the gate behind you)
          if (!g.script && g.state === 'play' && p.onGround && p.cx > this.x0 + 1.5 * TS && p.cx < this.x1) {
            this.state = 'intro';
            g.runScript((gg) => ERX.Story.world.trialStart(gg, this));
          }
          break;
        case 'between':
          if (this.t >= this.pause) this.startWave(g);
          break;
        case 'fight':
          if (!this.portals.length && !g.enemies.some((e) => e.zone === 'trial' && !e.dead)) this.clearWave(g);
          break;
      }
      // you went down in there and got back up outside: it starts over (from the wave you were on)
      if (this.running && g.state === 'play' && p.cx < this.def.gateTx * TS) this.reset(g);
    }

    startWave(g) {
      const n = this.wave, list = WAVES[n], p = g.player, L = this.L;
      this.state = 'fight';
      this.mains = [];
      // portals open around the arena: not right on top of you, and not on top of each other
      const lo = this.x0 + 2 * TS, hi = this.x1 - 3 * TS, xs = [];
      list.forEach((type, i) => {
        let x = lo;
        for (let k = 0; k < 40; k++) {
          x = U.lerp(lo, hi, Math.random());
          if (Math.abs(x - p.cx) > 80 && xs.every((o) => Math.abs(o - x) > 26)) break;
        }
        xs.push(x);
        const air = type === 'bat';
        this.portals.push({ type, x, y: air ? L.floorY - U.lerp(70, 115, Math.random()) : L.floorY, air, t: -i * 0.22 });
      });
      g.setObjective('WAVE ' + (n + 1) + ' OF ' + WAVES.length, () => this.mains.filter((e) => e.dead).length, list.length);
      g.banner = { title: 'WAVE ' + (n + 1), sub: WAVE_SUBS[n], t: 0, dur: 2.2 };
      sfx('trialWave');
    }

    /** A portal finishes swirling: out steps a monster (worth nothing: see ERX.Enemies.create's noReward). */
    arrive(g, pt) {
      pt.done = true;
      const e = ERX.Enemies.create(g, { type: pt.type, x: pt.x, zone: 'trial', noReward: true });
      if (!e) return;
      if (pt.air) { e.state = 'fly'; e.modeT = 0; e.x = pt.x - e.w / 2; e.y = pt.y - e.h / 2; }   // bats come out flying
      e.facing = g.player.cx < e.cx ? -1 : 1;
      g.enemies.push(e);
      this.mains.push(e);
      for (let i = 0; i < 18; i++) {
        g.fx.add({
          x: pt.x + U.lerp(-7, 7, Math.random()), y: pt.y - (pt.air ? 0 : 6) + U.lerp(-6, 6, Math.random()), vx: U.lerp(-50, 50, Math.random()), vy: U.lerp(-80, 10, Math.random()),
          life: U.lerp(0.35, 0.7, Math.random()), color: i % 3 ? '#8a4ad8' : '#e8c8ff', size: Math.random() < 0.4 ? 2 : 1, fadeOut: 0.3,
        });
      }
      sfx('portalPop', { minGap: 0.05 });
    }

    clearWave(g) {
      this.runeT[this.wave] = 0;
      this.wave++;
      sfx('runeLight');
      g.completeObjective();
      if (this.cleared) { this.state = 'open'; g.runScript((gg) => ERX.Story.world.trialDone(gg, this)); }
      else { this.state = 'between'; this.t = 0; this.pause = 2.6; }
    }

    /** All six: the door grinds open (story-world.js: trialDone), and the gate behind you comes down. */
    openDoor(g) {
      this.doorOpening = true;
      this.gate.open();
      this.addCheckpoint();
      sfx('doorGrind');
      g.shake(2, 2.6);
    }

    reset(g) {
      g.enemies = g.enemies.filter((e) => e.zone !== 'trial');
      this.portals = [];
      this.mains = [];
      this.state = 'idle';
      this.gate.open();
      g.objective = null;
      g.music('deeperends');
    }

    // ---------------------------------------------------------- drawing
    /** Purple vortexes: flat on the floor (or round, in mid-air for bats), swirling open. */
    drawPortals(ctx, cam) {
      for (const pt of this.portals) {
        if (pt.t < 0) continue;
        const k = Math.min(1, pt.t / PORTAL), x = Math.round(pt.x) - cam.ix, y = Math.round(pt.y) - cam.iy - (pt.air ? 0 : 2);
        const r = 3 + k * 9, sq = pt.air ? 1 : 0.35;
        const gl = ctx.createRadialGradient(x, y, 1, x, y, r * 3);
        gl.addColorStop(0, C.rgba('#c47aff', 0.8 * k)); gl.addColorStop(1, C.rgba('#b46aff', 0));
        ctx.fillStyle = gl; ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
        fillEllipse(ctx, x, y, r, Math.max(1, r * sq), '#7a3ad0');                  // the rim...
        fillEllipse(ctx, x, y, r * 0.75, Math.max(1, r * 0.75 * sq), '#120620');   // ...and the dark in the middle
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2 + pt.t * 7 * (i % 2 ? 1 : -1), rr = r * (0.45 + 0.55 * (((i * 7) % 5) / 4));
          ctx.fillStyle = i % 4 === 0 ? '#ffffff' : i % 2 ? '#d8a8ff' : '#a060f0';
          ctx.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr * sq), 1, 1);
        }
        // sparks rising out of it
        ctx.fillStyle = '#d8b0ff';
        for (let i = 0; i < 4; i++) { const s = (pt.t * 1.6 + i / 4) % 1; ctx.globalAlpha = 1 - s; ctx.fillRect(Math.round(x + Math.sin(i * 2.4 + pt.t * 3) * r * 0.6), Math.round(y - s * 22 * k), 1, 2); }
        ctx.globalAlpha = 1;
      }
    }

    /** The great door: a slab of dark stone with six runes round a circle, sliding up into the rock as it opens. */
    drawDoor(ctx, cam, t) {
      const d = this.def, x = d.doorTx * TS - cam.ix, top = d.doorRows[0] * TS - cam.iy, H = (d.doorRows[1] - d.doorRows[0] + 1) * TS, W = 2 * TS;
      if (x < -W - 4 || x > (cam.vw || 2000) + 4) return;
      const slide = Math.round(this.door * H);
      ctx.fillStyle = '#020104'; ctx.fillRect(x, top, W, H);      // what's behind it: nothing you can see
      if (slide >= H) return;
      // door-local rectangles, cut off at the top of the doorway (the rest is up inside the rock)
      const R = (rx, ry, rw, rh, col) => {
        let y0 = top + ry - slide;
        const y1 = y0 + rh;
        y0 = Math.max(y0, top);
        if (y1 <= y0) return;
        ctx.fillStyle = col; ctx.fillRect(x + rx, y0, rw, y1 - y0);
      };
      R(0, 0, W, H, '#060408');                       // ink edge
      R(1, 1, W - 2, H - 2, '#2a2438');               // the slab
      R(1, 1, 2, H - 2, '#3a3250'); R(W - 3, 1, 2, H - 2, '#1a1626');   // lit edge / shadowed edge
      for (const by of [14, 44, 54]) R(2, by, W - 4, 1, '#1a1626');     // the blocks it's cut from
      R(2, H - 6, W - 4, 4, '#1e1a2a'); R(2, H - 6, W - 4, 1, '#3a3250');   // the foot of it
      // the circle the runes sit round
      const cx = W / 2, cy = 29, all = this.runeT.every((r) => r >= 0);
      for (let a = 0; a < 40; a++) {
        const ang = (a / 40) * Math.PI * 2, px = Math.round(cx + Math.cos(ang) * 10 - 0.5), py = Math.round(cy + Math.sin(ang) * 10);
        R(px, py, 1, 1, all ? (Math.floor(t * 8 + a) % 5 === 0 ? '#ffffff' : '#c88aff') : '#100c18');
        if (!all) R(px, py + 1, 1, 1, '#4a4266');      // a carved groove: dark, its lower lip catching the light
      }
      // the eye in the middle (opens when all six are lit)
      R(cx - 3, cy - 1, 6, 3, '#0c0a14');
      if (all) { R(cx - 2, cy, 4, 1, '#e8c8ff'); R(cx - 1, cy - 1, 2, 3, '#b46aff'); }
      // six runes: dark grooves until their wave is beaten, then they flare and glow
      GLYPHS.forEach((rows, i) => {
        const ang = -Math.PI / 2 + (i / 6) * Math.PI * 2, rx = Math.round(cx + Math.cos(ang) * 10) - 1, ry = Math.round(cy + Math.sin(ang) * 10) - 2;
        const lt = this.runeT[i], lit = lt >= 0;
        const col = !lit ? '#0c0a12' : lt < 0.25 ? '#ffffff' : Math.sin(t * 3 + i) > 0.85 ? '#f0dcff' : '#c88aff';
        R(rx - 1, ry - 1, 5, 6, lit ? '#2a1450' : '#1a1626');
        rows.forEach((bits, ry2) => {
          for (let b = 0; b < 3; b++) {
            if (!(bits & (4 >> b))) continue;
            R(rx + b, ry + ry2, 1, 1, col);
            if (!lit && !(rows[ry2 + 1] & (4 >> b))) R(rx + b, ry + ry2 + 1, 1, 1, '#52486e');   // the groove's lit lower lip
          }
        });
      });
    }

    /** The portals and the lit runes glow a little. */
    lights(out) {
      for (const pt of this.portals) if (pt.t > 0) out.push({ x: pt.x, y: pt.y - 6, r: 30 + 30 * Math.min(1, pt.t / PORTAL), color: '#b46aff', intensity: 0.9 });
      const lit = this.runeT.filter((r) => r >= 0).length;
      if (lit && this.door < 1) out.push({ x: (this.def.doorTx + 1) * TS, y: this.def.doorRows[0] * TS + 29 - this.door * 64, r: 20 + lit * 5, color: '#c88aff', intensity: 0.8 });
    }
  }

  // ============================================================ THE TORCH
  class Torch {
    /** wall: the torch on the wall (one of the level's torches: { x, y, phase, lit }). */
    constructor(level, wall) { this.L = level; this.wall = wall; this.held = false; }
    canTake(trial, p) { return !this.held && trial.state === 'done' && Math.abs(p.cx - this.wall.x) < 18 && p.onGround; }
    take(g) {
      const L = this.L, w = this.wall;
      this.held = true;
      L.torches = L.torches.filter((t) => t !== w);    // off the wall (the empty bracket stays)
      w.lit = false;                                    // and its light goes with it (you carry it now: light())
      sfx('torchGrab');
      for (let i = 0; i < 10; i++) g.fx.add({ x: w.x, y: w.y - 4, vx: U.lerp(-30, 30, Math.random()), vy: U.lerp(-60, -10, Math.random()), life: U.lerp(0.3, 0.6, Math.random()), color: i % 2 ? '#ffb040' : '#ff6a2a', size: 1, fadeOut: 0.2 });
    }
    /** Your front hand (where you hold it), from the pose you're in. */
    handAt(p) {
      const PS = ERX.PlayerSide, lp = p.lastPose || ['idle', 0];
      let h = { dx: 2, dy: -8 };
      try { h = PS.points(PS.poseOf(lp[0], lp[1])).handF; } catch (e) { /* the default */ }
      return { x: p.cx + h.dx * (p.facing || 1), y: p.feet - 1 + h.dy };
    }
    draw(ctx, cam, g) {
      const p = g.player;
      if (!this.held || p.lying || g.state === 'skyfall' || g.state === 'dead') return;
      const h = this.handAt(p), x = Math.round(h.x) - cam.ix, y = Math.round(h.y) - cam.iy;
      ctx.fillStyle = '#140c08'; ctx.fillRect(x - 1, y - 7, 3, 10);     // the stick, up out of your fist
      ctx.fillStyle = '#6a4630'; ctx.fillRect(x, y - 6, 1, 8);
      ctx.fillStyle = '#a07a50'; ctx.fillRect(x, y - 6, 1, 2);          // the wrapped head
      ERX.Props.drawFlame(ctx, x, y - 7, g.t * 1.3, 1);
    }
    light(g) {
      if (!this.held) return null;
      const h = this.handAt(g.player), t = g.t;
      return { x: h.x, y: h.y - 12, r: 96 * (0.95 + 0.04 * Math.sin(t * 9) + 0.02 * Math.sin(t * 23)), color: '#ffb050', intensity: 1 };
    }
  }

  // ============================================================ THE BONES
  const BONE = { H: '#ece4cc', M: '#c8bc9a', L: '#8e8266', D: '#4e4636', o: '#0c0806', ink: '#120c0a' };
  // little sprites as rows of letters: H light bone, M mid, L shadow, D deep shadow, o / n a hole, T tooth, t gap
  const ART = {
    skull: ['..HHH..', '.HHHHM.', 'HHHHHMM', 'HooHooM', 'HooHooM', '.MHnHM.', '..tTt..'],
    skullBig: ['...HHH...', '.HHHHHHM.', 'HHHHHHHMM', 'HHHHHHHHM', 'HoooHoooM', 'HoooHoooM', '.MHHnHHM.', '..MHnHM..', '..tTtTt..'],
    skullSide: ['..HHHH..', '.HHHHHH.', 'HHHHHoHH', 'MHHHHHHn', 'MMHHHTtT', '.MMM.LL.'],
    ribs: ['.MMMMMMMM.', 'H.H..H..H.', 'H..H..H..H', 'H..H..H..H', '.H..H..H.H', '..MM.MM.M.'],
    bone: ['HH.....HH', 'MHHHHHHHM', 'LM.....ML'],
    jaw: ['H....H', 'HTtTtH', '.MMMM.'],
    skeleton: [
      '..HHH...........................',
      '.HHHHM...H.H.H.H................',
      'HHoHHM..HHHHHHHHH..MM...........',
      'HHHHHMMMMMMMMMMMMMMHHMMMMMMMMMHH',
      '.MHnM...H.H.H.H.H..HHM......L..L',
      '..tTt...........L.L..LLLLLLL....',
    ],
  };
  const COL = { H: BONE.H, M: BONE.M, L: BONE.L, D: BONE.D, o: BONE.o, n: BONE.o, T: BONE.H, t: BONE.D };
  const artCache = new Map();
  /** A bone sprite as a pixel buffer (for painting into walls); boneCv for a (cached, maybe mirrored) canvas. */
  function boneArt(kind) {
    const rows = ART[kind], b = new PB(rows[0].length + 2, rows.length + 2);
    rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = COL[row[x]]; if (c) b.set(x + 1, y + 1, c32(c)); } });
    b.outline(c32(BONE.ink));
    return b;
  }
  function boneCv(kind, flip) {
    const key = kind + (flip ? '<' : '>');
    let cv = artCache.get(key);
    if (!cv) {
      cv = boneArt(kind).toCanvas();
      if (flip) cv = ERX.Sprites.mirror(cv);
      artCache.set(key, cv);
    }
    return cv;
  }

  class Bones {
    /** The floor from x0 to x1 (px) is skulls and bones, piled two and three deep, a skeleton here and there. */
    constructor(x0, x1, floorY, seed) {
      const rng = new U.RNG(seed);
      this.x0 = x0; this.x1 = x1; this.floorY = floorY;
      this.shake = 0; this.t = 0;
      const pick = () => { const r = rng.next(); return r < 0.42 ? 'skull' : r < 0.52 ? 'skullBig' : r < 0.6 ? 'skullSide' : r < 0.78 ? 'bone' : r < 0.88 ? 'ribs' : 'jaw'; };
      const P = [];
      const add = (x, kind, lift, front) => P.push({ x, kind, flip: rng.chance(0.5), lift, front, ph: rng.range(0, 6), ox: 0, oy: 0, vx: 0, vy: 0, ang: 0, spin: 0, falling: false, gone: false });
      for (let x = x0; x < x1; x += rng.int(3, 6)) {
        add(x, pick(), rng.int(0, 2), false);
        if (rng.chance(0.55)) add(x + rng.int(-2, 2), pick(), rng.int(3, 6), false);                        // one more on top
        if (rng.chance(0.22)) add(x + rng.int(-1, 3), rng.chance(0.6) ? 'skull' : 'jaw', -1, true);         // and in front of your feet
      }
      for (let x = x0 + rng.int(20, 60); x < x1 - 40; x += rng.int(90, 150)) add(x, 'skeleton', 3, false);   // whole ones, where they fell
      P.sort((a, b) => a.lift - b.lift);
      this.pieces = P;
    }
    update(dt) {
      this.t += dt;
      for (const p of this.pieces) {
        if (!p.falling || p.gone) continue;
        p.vy += 900 * dt;
        p.ox += p.vx * dt; p.oy += p.vy * dt; p.ang += p.spin * dt;
        if (p.oy > 700) p.gone = true;
      }
    }
    /** Everything between x0 and x1 (px) goes down the hole. */
    collapse(x0, x1) {
      for (const p of this.pieces) {
        if (p.x < x0 || p.x > x1) continue;
        p.falling = true;
        p.vx = U.lerp(-35, 35, Math.random()); p.vy = U.lerp(-90, 0, Math.random()); p.spin = U.lerp(-9, 9, Math.random());
      }
    }
    /** Draw the pieces behind you (front = false) or the few in front of your feet (front = true). */
    draw(ctx, cam, front) {
      const vw = cam.vw || 2000, sh = this.shake;
      for (const p of this.pieces) {
        if (p.front !== front || p.gone) continue;
        const cv = boneCv(p.kind, p.flip);
        let x = p.x + p.ox, y = this.floorY + 1 - p.lift - cv.height + 2 + p.oy;
        if (sh > 0 && !p.falling) { x += Math.round(Math.sin(this.t * 41 + p.ph * 7) * sh * 1.2); if (Math.sin(this.t * 23 + p.ph * 3) > 0.7) y -= Math.round(sh); }
        const sx = Math.round(x) - cam.ix, sy = Math.round(y) - cam.iy;
        if (sx < -40 || sx > vw + 40) continue;
        if (p.falling && p.ang) {
          ctx.save();
          ctx.translate(sx + cv.width / 2, sy + cv.height / 2);
          ctx.rotate(p.ang);
          ctx.drawImage(cv, -Math.round(cv.width / 2), -Math.round(cv.height / 2));
          ctx.restore();
        } else ctx.drawImage(cv, sx - (cv.width >> 1), sy);
      }
    }
  }

  ERX.DeeperTrial = { Trial, Torch, Bones, WAVES, boneArt, boneCv, fillEllipse };
})(window.ERX = window.ERX || {});
