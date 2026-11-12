/*
 * THE SPEWER: a rooted plant with a spotted bulb for a head. It spits seeds.
 *
 * Painted from a handful of parameters, like the goblin
 * (js/render/goblin-sprite.js): a leafy base, a curved stem, and a bulb whose
 * mouth opens as a wedge. It droops shut while dormant, sways when awake,
 * swells and glows while it charges a shot, and lunges with its jaw wide
 * open when it spits.
 *
 *   ERX.SpewerSprite.frame(pose, frame, facing) -> canvas (W x H), cached
 *   ERX.SpewerSprite.pellet(frame)              -> a seed pellet canvas (7x7)
 *   ERX.SpewerSprite.ANCHOR  the root pixel (facing right)
 *   ERX.SpewerSprite.MOUTH   where seeds leave the mouth, from ANCHOR (facing right)
 *
 * Poses: dormant(2) wake idle(4) charge(2) spit(2) hurt
 */
(function (ERX) {
  'use strict';

  const PB = ERX.PixelBuffer, C = ERX.Color;
  const cache = new Map();
  const W = 28, H = 26;
  const AX = 13, AY = 24;                  // the root: bottom centre of the stem, facing right
  const INK = '#120c16';
  const STEM = '#4a8a4a', STEM_D = '#2a5a34', STEM_L = '#7ab85a';
  const LEAF = '#3a8a5a', LEAF_D = '#245a3e', LEAF_L = '#62b878';
  const BULB = '#9a3a8a', BULB_D = '#5e1e5a', BULB_L = '#c86ab0', SPOT = '#f0b0e0';
  const LIP = '#e85a7a', MOUTH_IN = '#a82a4a', THROAT = '#2a0a18', TOOTH = '#f2ead2';
  const EYE = '#ffe04a', EYE_D = '#d8a830', PUPIL = '#1a0e10';
  const SEED = '#ffc23a', SEED_D = '#d86a1a', SEED_L = '#fff4c0';

  // ------------------------------------------------------------- poses
  // sway / shake: the bulb's sideways wobble; lean: + toward you, - away;
  // droop: how far the bulb hangs (dormant); swell: puffed up (charging);
  // mouth: 0 shut, 1 open, 2 wide; glow: the shut mouth glows (a seed loaded).
  const BASE = { sway: 0, shake: 0, lean: 0, droop: 0, swell: 0, mouth: 0, eye: 'open', glow: 0 };
  const P = (o) => Object.assign({}, BASE, o);
  const POSES = {
    dormant: [P({ sway: -1, lean: 1, droop: 3, eye: 'closed' }), P({ lean: 1, droop: 3, eye: 'closed' })],
    wake: [P({ droop: 1, mouth: 1 })],
    idle: [P({ mouth: 1 }), P({ sway: 1 }), P({ mouth: 1 }), P({ sway: -1 })],
    charge: [P({ lean: -1, swell: 1, eye: 'squint', glow: 1, shake: -1 }), P({ lean: -1, swell: 1, eye: 'squint', glow: 1, shake: 1 })],
    spit: [P({ lean: 2, mouth: 2 }), P({ lean: 1, mouth: 1 })],
    hurt: [P({ lean: -2, mouth: 1, eye: 'hurt' })],
  };

  /** Where everything sits for a pose (shared by the painter and MOUTH). */
  function geom(p) {
    const neck = [AX + p.sway + p.shake + p.lean, AY - 12 + p.droop];
    const bx = neck[0] + 1 + (p.lean > 0 ? 1 : 0), by = neck[1] - 5;
    const rx = 5.4 + p.swell, ry = 4.6 + p.swell * 0.8;
    return { neck, bx, by, rx, ry, hx: bx - 1, hy: by + 1 };
  }

  function paintPose(p) {
    const b = new PB(W, H);
    const px = (x, y, col) => b.set(Math.round(x), Math.round(y), C.u32(col));
    const g = geom(p);

    /** A leaf: fat in the middle, pointed at the tip, dark underneath, a pale midrib. */
    const leaf = (x0, y0, x1, y1, lift, fat) => {
      const cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - lift, pts = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24, u = 1 - t;
        pts.push([u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1, t]);
      }
      const r = (t) => fat * Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.85));
      for (const [x, y, t] of pts) b.circle(x, y + 0.6, r(t), C.u32(LEAF_D));
      for (const [x, y, t] of pts) b.circle(x, y, Math.max(0, r(t) - 0.6), C.u32(LEAF));
      for (const [x, y, t] of pts) if (t > 0.1 && t < 0.75) px(x, y, LEAF_L);
    };

    // ---- the leafy base ----
    leaf(AX - 1, AY - 1, AX - 9, AY - 2, 2, 1.7);
    leaf(AX + 1, AY - 1, AX + 9, AY - 2, 2, 1.7);
    leaf(AX - 1, AY - 2, AX - 5, AY - 6, 1, 1.1);

    // ---- the stem: a soft S-curve, shaded left to right ----
    const root = [AX, AY - 1], ctrl = [AX - (p.sway + p.shake) * 0.5 - p.lean * 0.6, AY - 7];
    const rows = new Map();
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, u = 1 - t;
      const x = u * u * root[0] + 2 * u * t * ctrl[0] + t * t * g.neck[0];
      const y = Math.round(u * u * root[1] + 2 * u * t * ctrl[1] + t * t * g.neck[1]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push(x);
    }
    for (const [y, xs] of rows) {
      const x = Math.round(xs.reduce((a, v) => a + v, 0) / xs.length);
      px(x - 1, y, STEM_D); px(x, y, STEM); px(x + 1, y, STEM_L);
    }

    // ---- sepals: little leaves cupping the bulb ----
    leaf(g.neck[0], g.neck[1] - 1, g.neck[0] - 4, g.neck[1] + 1, 0.5, 0.9);
    leaf(g.neck[0], g.neck[1] - 1, g.neck[0] + 4, g.neck[1] + 1, 0.5, 0.9);

    // ---- the bulb, with its wedge of a mouth ----
    const half = ([5, 24, 42][p.mouth] * Math.PI) / 180;
    for (let y = Math.floor(g.by - g.ry - 1); y <= g.by + g.ry + 1; y++) {
      for (let x = Math.floor(g.bx - g.rx - 1); x <= g.bx + g.rx + 1; x++) {
        const nx = (x - g.bx) / (g.rx + 0.5), ny = (y - g.by) / (g.ry + 0.5);
        if (nx * nx + ny * ny > 1) continue;
        const ang = Math.atan2(y - g.hy, x - g.hx);
        if (x > g.hx && Math.abs(ang) <= half) {
          if (p.mouth === 0) { px(x, y, !p.glow ? THROAT : x >= g.bx + g.rx - 2.5 ? SEED_L : SEED); continue; }   // shut: a seam (glowing hot at the lips while it charges)
          const d = Math.hypot(x - g.hx, y - g.hy);
          if (d > g.rx * 0.9) continue;                                         // the jaws part at the tip
          px(x, y, Math.abs(ang) > half - 0.2 ? LIP : d < 2.5 ? THROAT : MOUTH_IN);
          continue;
        }
        const l = -ny * 0.75 + nx * 0.35;                                       // lit from the top-front
        px(x, y, l > 0.42 ? BULB_L : l < -0.45 ? BULB_D : BULB);
      }
    }
    if (p.mouth > 0) {
      // fangs along the jaws
      for (const [d, side] of [[3, -1], [5, -1], [4, 1]]) {
        const a = side * (half - 0.28);
        px(g.hx + d * Math.cos(a), g.hy + d * Math.sin(a), TOOTH);
      }
    }
    // spots on the back of the bulb
    for (const [dx, dy] of [[-3, -2], [-1, -3], [-4, 1], [-2, 2]]) {
      const x = Math.round(g.bx + dx), y = Math.round(g.by + dy);
      if (b.solid(x, y)) px(x, y, SPOT);
    }
    // one big eye, above and behind the mouth, under a heavy brow
    const ex = Math.round(g.bx - 1), ey = Math.round(g.by - 2);
    const brow = () => { px(ex - 1, ey - 1, BULB_D); px(ex, ey - 1, BULB_D); px(ex + 1, ey - 1, BULB_D); };
    switch (p.eye) {
      case 'closed': px(ex, ey + 1, BULB_D); px(ex + 1, ey + 1, BULB_D); px(ex - 1, ey, BULB_D); break;
      case 'hurt': px(ex, ey - 1, PUPIL); px(ex + 1, ey, PUPIL); px(ex, ey + 1, PUPIL); break;
      case 'squint': brow(); px(ex, ey, BULB_D); px(ex + 1, ey, BULB_D); px(ex, ey + 1, EYE); px(ex + 1, ey + 1, PUPIL); break;
      default: brow(); px(ex, ey, EYE); px(ex + 1, ey, PUPIL); px(ex, ey + 1, EYE_D); px(ex + 1, ey + 1, PUPIL);
    }

    b.outline(C.u32(INK));
    return b;
  }

  function paint(pose, frame) {
    const set = POSES[pose] || POSES.idle;
    return paintPose(set[(frame || 0) % set.length]);
  }

  function pelletBuf(f) {
    const b = new PB(7, 7);
    b.circle(3, 3, 2, C.u32(SEED));
    for (const [x, y] of [[4, 4], [3, 5], [5, 3]]) b.set(x, y, C.u32(SEED_D));
    b.set(2, 2, C.u32(SEED_L));
    if (f) b.set(4, 2, C.u32(SEED_D)); else b.set(2, 4, C.u32(SEED_D));   // a stripe that turns as it spins
    b.outline(C.u32(INK));
    return b;
  }

  const spit = geom(POSES.spit[0]);
  const SpewerSprite = {
    W, H, POSES, SEED, SEED_D, SEED_L,
    ANCHOR: { x: AX, y: AY },
    MOUTH: { dx: Math.round(spit.bx + spit.rx) - AX, dy: spit.hy - AY },
    FRAMES: Object.fromEntries(Object.keys(POSES).map((k) => [k, POSES[k].length])),
    paint,
    pelletBuf,

    frame(pose = 'idle', frame = 0, facing = 1) {
      const set = POSES[pose] || POSES.idle;
      const f = (frame || 0) % set.length;
      const key = [pose, f, facing < 0 ? -1 : 1].join(',');
      let cv = cache.get(key);
      if (!cv) {
        cv = paint(pose, f).toCanvas();
        if (facing < 0) cv = ERX.Sprites.mirror(cv);
        cache.set(key, cv);
      }
      return cv;
    },

    pellet(frame) {
      const key = 'pellet' + (frame % 2);
      let cv = cache.get(key);
      if (!cv) { cv = pelletBuf(frame % 2).toCanvas(); cache.set(key, cv); }
      return cv;
    },
  };

  ERX.SpewerSprite = SpewerSprite;
})(window.ERX = window.ERX || {});
