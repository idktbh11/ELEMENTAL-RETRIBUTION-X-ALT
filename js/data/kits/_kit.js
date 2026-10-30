/*
 * Shared helpers for the element kits (js/data/kits/*.js).
 *
 * A kit:
 *   { status, fx, block: [name, style], dash: [name, style],
 *     m1: move, s: [5 moves], ult: { name, desc, dmg, charge, run },
 *     m1Up: move (what M1+ turns your M1 into), dashUp: { name, desc, dmg, life, spawn, update, draw, onEnd } (DASH+) }
 * Upgrading never changes a move's colours: upgraded moves are bigger (H.sc), faster, stronger and more detailed.
 * A move (see js/game/abilities.js):
 *   { name, desc, dmg, cd, mp, kind: 'custom', life,
 *     spawn(e, g, A), update(e, dt, g, A), draw(e, ctx, ox, oy, A) }
 * An ultimate's charge: { pose, lift, draw(ctx, x, y, k, t, A, pal, cine) }
 *   k goes 0 -> 1 over the charge; x, y = your chest on screen.
 * An ultimate's run(A, e0, el): spawns the attack (e0 = where you are + damage).
 *
 * Every move has its own draw function: nothing is a recolour of anything else.
 */
(function (ERX) {
  'use strict';

  ERX.Kits = ERX.Kits || {};
  const U = ERX.U;

  /** The little ring a projectile leaves where it lands. */
  const POP = { life: 0.18, draw(e, ctx, ox, oy, A) { const k = e.t / e.life, x = e.x + ox, y = e.y + oy; A.alpha(ctx, 1 - k, () => { A.ring(ctx, x, y, e.r * (0.4 + k * 0.8), e.pal.l || e.pal.c); A.ring(ctx, x, y, Math.max(1, e.r * (0.2 + k * 0.6)), '#ffffff'); }); } };

  const H = {
    /** Size multiplier: upgraded moves are bigger, and awakened moves (not Ultimates) are bigger still. */
    sc(e) { return (e.up ? 1.4 : 1) * (e.isAwk && !e.isUlt ? 1.25 : 1); },
    /** 0 -> 1 over the effect's life. */
    k(e) { return Math.min(1, e.t / e.life); },
    /** Put the effect in front of the player (dx forward, dy from the chest). */
    at(e, A, dx, dy) { const p = A.p; e.dir = p.facing; e.x = p.cx + e.dir * (dx || 0); e.y = p.y + 10 + (dy || 0); },
    /** Hit everything within `reach` in front of the player. */
    melee(e, A, reach, h, o) {
      const p = A.p; h = h || 20;
      return A.hit(e, { x: e.dir > 0 ? p.cx - 2 : p.cx - reach + 2, y: p.y + 10 - h / 2, w: reach, h }, Object.assign({ dir: e.dir }, o));
    },
    /** Move like a projectile; returns 'hit', 'wall', 'pierce' or null. */
    fly(e, dt, A, o) {
      o = o || {};
      if (o.gravity) e.vy += o.gravity * dt;
      if (o.homing) H.home(e, dt, A, o.homing, o.range || 170);
      const spd = e.up ? 1.2 : 1;   // upgraded: faster
      e.x += e.vx * dt * spd; e.y += e.vy * dt * spd;
      const r = (o.r || 5) * H.sc(e);
      const hit = A.hit(e, { x: e.x - r, y: e.y - r, w: r * 2, h: r * 2 }, { dir: Math.sign(e.vx) || e.dir, kb: o.kb });
      if (hit && !o.pierce) return 'hit';
      if (A.solid(e.x, e.y)) return 'wall';
      return hit ? 'pierce' : null;
    },
    /** Steer towards the nearest target. */
    home(e, dt, A, rate, range) {
      const t = A.near(e.x, e.y, range || 170);
      if (!t) return;
      const c = A.center(t), sp = Math.hypot(e.vx, e.vy), cur = Math.atan2(e.vy, e.vx);
      let da = Math.atan2(c.y - e.y, c.x - e.x) - cur;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const na = cur + U.clamp(da, -rate * dt, rate * dt);
      e.vx = Math.cos(na) * sp; e.vy = Math.sin(na) * sp;
    },
    /** A projectile definition: draw = how it looks; o: life, r, gravity, homing, pierce, boom, onHit(e, A). */
    proj(draw, o) {
      o = o || {};
      return {
        life: o.life || 1.2,
        update(e, dt, g, A) {
          if (o.tick) o.tick(e, dt, A);
          (e._tr || (e._tr = [])).unshift(e.x, e.y); if (e._tr.length > 6) e._tr.length = 6;   // where it just was (for the trail)
          const r = H.fly(e, dt, A, o);
          if (r === 'hit' || r === 'wall') {
            if (o.boom) A.blast(e, e.x, e.y, o.boom * H.sc(e));
            if (o.onHit) o.onHit(e, A, r);
            A.puff(e, e.x, e.y, 5);
            if (!o.boom && !o.onHit) A.spawn(e, POP, { x: e.x, y: e.y, r: 7 * H.sc(e), dmg: 0 });
            e.dead = true;
          }
        },
        // a soft glow in your colour under every projectile, so even the little ones read
        // ...and two fading afterimages behind it
        draw(e, ctx, ox, oy, A) {
          if (e.pal) A.glow(ctx, e.x + ox, e.y + oy, Math.max(2, (o.r || 4) * 0.8 * H.sc(e)), e.pal.c, 0.22);
          const tr = e._tr;
          if (tr) for (let i = tr.length - 2; i >= 2; i -= 2) { const ghost = Object.create(e); ghost.x = tr[i]; ghost.y = tr[i + 1]; A.alpha(ctx, 0.35 * (1 - i / 6), () => draw(ghost, ctx, ox, oy, A)); }
          draw(e, ctx, ox, oy, A);
        },
      };
    },
    /** Rotate a point. */
    rot(x, y, a) { const c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; },
    /** The highest open point above (x, y): under the ceiling, or the top of the view. */
    sky(A, x, y) { const top = A.top(); for (let yy = y; yy > top; yy -= 4) if (A.solid(x, yy)) return yy + 6; return top; },
    /** Ground under x near the player. */
    floor(A, x) { return A.ground(x, A.p.y + 2); },
    /** Every target, nearest first, within range of (x, y). */
    nearby(A, x, y, range) {
      return A.targets().map((t) => ({ t, c: A.center(t) })).filter((o) => Math.hypot(o.c.x - x, o.c.y - y) < range).sort((a, b) => Math.hypot(a.c.x - x, a.c.y - y) - Math.hypot(b.c.x - x, b.c.y - y));
    },
    /** A solid-colour silhouette of the player (clones, afterimages), cached. */
    ghost(A, pose, facing, color) {
      const PS = ERX.PlayerSide, look = A.p.look, cv = PS.frame(look, pose, Math.min(1, (PS.FRAMES[pose] || 1) - 1), facing);
      const key = pose + facing + color;
      if (!look._ghosts) Object.defineProperty(look, '_ghosts', { value: new Map(), enumerable: false });
      const hit = look._ghosts.get(key);
      if (hit && hit.src === cv) return hit.cv;
      const out = ERX.Sprites.tint(cv, color);
      look._ghosts.set(key, { src: cv, cv: out });
      return out;
    },
    /** Draw a player silhouette with its feet at (x, y). */
    drawGhost(ctx, A, pose, x, y, facing, color) { ERX.PlayerSide.draw(ctx, H.ghost(A, pose, facing, color), x, y, facing); },
    // ---- for upgraded dashes (kit.dashUp): a custom effect that lives a little past the dash itself
    /** True while you're mid-dash; records your path in e.pts ({ x, y (chest), f (feet), t }). */
    dashing(e, A) {
      const p = A.p, here = () => ({ x: p.cx, y: p.y + 10, f: p.feet, t: e.t });
      if (!e.pts) e.pts = [here()];
      if (p.dashT > 0 && !e.over) { e.pts.push(here()); return true; }
      e.over = true; return false;   // (a second dash doesn't count)
    },
    /** The last point of your dash path. */
    end(e) { return e.pts[e.pts.length - 1]; },
    /** Walk along your dash path every `step` px: fn(x, y (chest), f (feet), u (0 at the start -> 1 at the end)). */
    along(e, step, fn) {
      const pts = e.pts;
      if (!pts || !pts.length) return;
      let total = 0;
      for (let i = 1; i < pts.length; i++) total += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y);
      if (total < 1) { fn(pts[0].x, pts[0].y, pts[0].f, 1); return; }
      let acc = 0, next = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], seg = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
        while (seg > 0 && next <= acc + seg) { const q = (next - acc) / seg; fn(U.lerp(a.x, b.x, q), U.lerp(a.y, b.y, q), U.lerp(a.f, b.f, q), next / total); next += step; }
        acc += seg;
      }
    },
    /** Seconds since your dash ended (0 while it's still going). */
    since(e) { return e.over ? e.t - H.end(e).t : 0; },
    // ---- pushing things around
    /** Move a target by (dx, dy) unless something solid is in the way (the tutorial dummy and bosses don't budge). */
    shove(A, t, dx, dy) {
      if (t.tutorial || t.immovable || t.dead) return false;
      const nx = t.x + dx, ny = t.y + (dy || 0);
      if (ERX.GameEngine.Physics.overlapsSolid(A.g.level, nx, ny, t.w, t.h)) return false;
      t.x = nx; t.y = ny; return true;
    },
    /** Throw a target up into the air. */
    launch(t, v) { if (t.tutorial || t.immovable || t.dead) return; t.vy = -v; t.onGround = false; },
    /** Inflict a status other than your element's own. */
    inflict(e, t, id) { if (t.applyStatus && !t.dead) t.applyStatus(id, e.potency || 0); },
    /** Hit whatever you pass through mid-dash (once each). */
    dashBody(e, A, o) { const p = A.p; return A.hit(e, { x: p.x - 4, y: p.y, w: p.w + 8, h: p.h }, Object.assign({ dir: p.facing, kb: 0.8 }, o)); },
    /** The stretch of ground your dash covered: { x0, x1, f }. */
    span(e) { const xs = e.pts.map((q) => q.x); return { x0: Math.min(...xs), x1: Math.max(...xs), f: e.pts[0].f }; },
    /** A short burst of sparks in the move's colours (cosmetic). */
    sparks(A, x, y, n, col, speed) {
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = (speed || 60) * (0.4 + Math.random()); A.g.fx.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3 + Math.random() * 0.3, color: col, size: 1, fadeOut: 0.2 }); }
    },
  };

  ERX.KitHelp = H;
})(window.ERX = window.ERX || {});
