/*
 * AWAKENING — your element's second form.
 *
 *   Deal damage -> the AWAKENING meter fills (slowly) -> press {awaken}.
 *   A short transformation plays, then for TIME seconds you are AWAKENED:
 *     a brand-new moveset (M1, 5 skills, block, dash) from ERX.Awakened[element],
 *     your Ultimate becomes the AWAKENED ULTIMATE (its own charge, fire, title, riff),
 *     and you get your element's own idle + run animations.
 *   Awakening fills your Ultimate meter, so you always get one Awakened Ultimate.
 *
 * Animation: awakened idles/runs are joint sets from smooth sine motion
 * (js/data/awakened/_awk.js). Every frame the body BLENDS towards that target
 * pose, so going from a jump to idle to a run flows instead of snapping.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const TIME = 60, FILL = 0.16;
  const ease = (k) => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
  const back = (k) => { const c = 1.9; k = U.clamp(k, 0, 1) - 1; return 1 + (c + 1) * k * k * k + c * k * k; };

  // ============================================================ the scene
  /** The transformation (~2.6 s, the world is frozen): gather, burst, AWAKENED. */
  const T = { gather: 0.25, burst: 1.15, text: 1.25, out: 2.15, end: 2.6 };
  class AwakenCine {
    constructor(g, el, kit) {
      this.g = g; this.el = el; this.kit = kit; this.t = 0;
      this.pal = ERX.Abilities.palette(el, kit, false);
      this.A = ERX.Abilities.api(g);
      this.music = ERX.Audio.music.wanted;
      this.awakening = true;
      const p = g.player;
      p.vx = 0; p.vy = 0; p.attackT = 0; p.dashT = 0; p.blocking = false;
      p.cinePose = 'crouch';
      p.cineLift = 0;
      ERX.Audio.cutMusic();
      sfx('awakenCharge');
    }
    zoom() {
      const t = this.t;
      if (t < T.burst) return 1 + 1.7 * ease(t / 0.45) + 0.4 * ease((t - 0.45) / (T.burst - 0.45));
      if (t < T.out) return 3.1 - 0.5 * ease((t - T.burst) / 0.25);
      return 2.6 - 1.6 * ease((t - T.out) / (T.end - T.out));
    }
    black() { return 0; }
    update(dt) {
      const g = this.g, p = g.player, t0 = this.t;
      this.t += dt;
      const t = this.t, cross = (x) => t0 < x && t >= x;
      if (t < T.burst) {
        // power pulled in from everywhere
        if (Math.random() < dt * 60) {
          const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 30;
          g.fx.add({ x: p.cx + Math.cos(a) * d, y: p.y + 10 + Math.sin(a) * d, vx: -Math.cos(a) * d * 1.6, vy: -Math.sin(a) * d * 1.6, life: 0.6, color: Math.random() < 0.3 ? '#ffffff' : this.pal.c, size: 1, fadeOut: 0.2 });
        }
        ERX.FX.shake(0.4 + (t / T.burst) * 1.4, 0.05);
      }
      if (cross(T.burst)) {
        // BURST: you are awakened
        Awakening.begin(g);
        p.cinePose = null;
        sfx('awakenBurst');
        ERX.FX.shake(7, 0.5);
        g.flashT = Math.max(g.flashT || 0, 0.5);
        for (let i = 0; i < 60; i++) {
          const a = (i / 60) * Math.PI * 2, sp = 90 + Math.random() * 120;
          g.fx.add({ x: p.cx, y: p.y + 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.7, color: i % 3 ? this.pal.c : '#ffffff', size: i % 5 ? 1 : 2, fadeOut: 0.4 });
        }
      }
      // the body keeps animating (the scene freezes the world, not you)
      Awakening.animate(p, dt);
      g.fx.update(dt);
      if (t >= T.end) this.finish();
    }
    finish() {
      const g = this.g, p = g.player;
      p.cinePose = null; p.cineLift = 0;
      g.cine = null;
      if (this.music) ERX.Audio.playMusic(this.music);
    }
    /** Converging light, then the burst rings. */
    drawWorld(c, cam) {
      const p = this.g.player, A = this.A, t = this.t;
      const x = Math.round(p.cx) - cam.ix, y = Math.round(p.y + 10) - cam.iy;
      if (t < T.burst) {
        const k = t / T.burst;
        A.alpha(c, 0.35 + 0.4 * k, () => A.ring(c, x, y, 34 * (1 - k) + 6, this.pal.c));
        A.alpha(c, 0.25 * k, () => A.disc(c, x, y, Math.round(4 + k * 6), this.pal.l));
        const e = Awakening.screenPoint(p, cam, 'eye');
        if (k > 0.6) A.px(c, e.x, e.y, 1, 1, '#ffffff');
      } else {
        const k = (t - T.burst) / 0.6;
        if (k < 1) A.alpha(c, 1 - k, () => { A.ring(c, x, y, 8 + k * 70, this.pal.c, 8 + k * 70, 2); A.ring(c, x, y, 4 + k * 52, '#ffffff', 4 + k * 52, 2); A.ring(c, x, y + 12, 6 + k * 60, this.pal.l, (6 + k * 60) * 0.25, 1); });
      }
    }
    /** "AWAKENED" slams in. */
    drawScreen(ctx, W, H) {
      const t = this.t;
      if (t < T.text) return;
      const k = t - T.text, fade = t > T.out ? 1 - (t - T.out) / (T.end - T.out) : 1;
      const F = ERX.Font, cx = Math.round(W / 2), cy = Math.round(H * 0.24);
      const sc = Math.max(2, Math.round(4 - 1.6 * back(k / 0.22)));
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade);
      // the glow from the sides
      Awakening.sideGlow(ctx, W, H, this.pal.c, 0.32 + 0.12 * Math.sin(t * 9));
      F.draw(ctx, 'AWAKENED', cx, cy, { scale: sc, color: this.pal.l, outline: '#05030a', shadow: this.pal.d, shadowOffset: Math.max(1, sc - 1), align: 'center' });
      F.draw(ctx, this.el.name.toUpperCase() + ' HAS AWOKEN', cx, cy + 10 * sc, { color: '#ffffff', outline: '#05030a', align: 'center' });
      ctx.restore();
    }
  }

  // ============================================================ the system
  const Awakening = {
    TIME, FILL, T,
    /** The awakened kit for an element id. */
    kit(id) { return (ERX.Awakened || {})[id] || null; },
    /**
     * Has this character earned their Awakening? Not yet: every element will get its own way to unlock it
     * (a few worlds in). Until then the meter never fills, and only the admin panel can awaken you.
     */
    unlocked(g) { return !!(g && g.character && g.character.awakenUnlocked); },
    /** Can this player awaken right now? */
    ready(p) {
      const g = p.game, el = g.element();
      return !!el && !!Awakening.kit(el.id) && p.ab.awk >= 100 && !p.ab.awakened() && !g.cine;
    },
    /** Press the button: the transformation scene starts. */
    start(g) {
      const el = g.element(), kit = el && Awakening.kit(el.id);
      if (!kit) return false;
      g.cine = new AwakenCine(g, el, kit);
      return true;
    },
    /** The moment you're awakened (the burst). */
    begin(g) {
      const p = g.player, ab = p.ab, elx = g.element && g.element();
      if (elx && ERX.ElementSfx) ERX.ElementSfx.boom(elx.id, 120, true);
      ab.awk = 0;
      ab.awakenT = TIME;
      ab.ult = 100;
      for (const k of Object.keys(ab.cd)) ab.cd[k] = 0;
      p.awkJ = null;
      g.floatText(p.cx, p.y - 14, 'AWAKENED!', ERX.Abilities.palette(g.element(), Awakening.kit(g.element().id), false).l);
    },
    /** Awakening wears off. */
    end(g) {
      const p = g.player, ab = p.ab;
      ab.awakenT = 0;
      for (const k of Object.keys(ab.cd)) ab.cd[k] = 0;
      p.awkJ = null;
      p.ultHold = null;
      const el = g.element(), kit = el && Awakening.kit(el.id);
      if (kit) {
        const pal = ERX.Abilities.palette(el, kit, false);
        for (let i = 0; i < 24; i++) g.fx.add({ x: p.cx + U.lerp(-6, 6, Math.random()), y: p.y + Math.random() * p.h, vx: U.lerp(-30, 30, Math.random()), vy: -40 - Math.random() * 40, life: 0.8, color: i % 2 ? pal.c : pal.l, size: 1, fadeOut: 0.5 });
      }
      sfx('awakenEnd');
      g.floatText(p.cx, p.y - 10, 'AWAKENING FADED', '#c8c8e0');
    },

    // ---------------------------------------------------------- animation
    /** Which awakened animation applies right now: 'idle', 'run' or null. */
    state(p) {
      if (!p.ab || !p.ab.awakened() || p.cinePose || p.cineJoints || p.lying || p.hurtT > 0 || p.dashT > 0 || p.attackT > 0 || p.blocking || !p.onGround || p.ultHold) return null;
      return Math.abs(p.vx) > 15 ? 'run' : 'idle';
    },
    /** Blend the body towards the target pose (call every frame). */
    animate(p, dt) {
      const st = Awakening.state(p), el = p.game.element(), kit = el && Awakening.kit(el.id);
      if (!st || !kit || !kit[st]) { p.awkJ = null; return; }
      const def = kit[st];
      const target = st === 'idle' ? Awakening.breathe(def.pose(p.animT, p), p.animT, def.still) : def.pose((p.runPhase / 6) * Math.PI * 2, p);
      if (!p.awkJ) {
        // start from whatever pose you were just in, so even that first frame blends
        const [pose, frame] = p.lastPose || ['idle', 0];
        p.awkJ = Awakening.copy(ERX.PlayerSide.poseOf(pose, frame));
        p.awkJ.lift = 0;
      }
      const k = 1 - Math.exp(-22 * dt);
      Awakening.blendInto(p.awkJ, target, k);
      p.awkState = st;
    },
    /** Idles breathe: the arms rise and fall a little, so you never stand frozen. */
    breathe(j, t, still) {
      if (still) return j;
      const b = Math.sin(t * 2.3), b2 = Math.sin(t * 2.3 + 0.5);
      const o = Object.assign({}, j);
      o.FA = [[j.FA[0][0], j.FA[0][1] + b * 0.55], [j.FA[1][0] + b2 * 0.3, j.FA[1][1] + b2 * 0.9]];
      o.BA = [[j.BA[0][0], j.BA[0][1] + b * 0.55], [j.BA[1][0] - b2 * 0.3, j.BA[1][1] + b2 * 0.9]];
      o.bob = (j.bob || 0) + (b > 0.55 ? 0.6 : 0);
      return o;
    },
    copy(j) { return { bob: j.bob || 0, lean: j.lean || 0, lift: j.lift || 0, FL: [j.FL[0].slice(), j.FL[1].slice()], BL: [j.BL[0].slice(), j.BL[1].slice()], FA: [j.FA[0].slice(), j.FA[1].slice()], BA: [j.BA[0].slice(), j.BA[1].slice()] }; },
    blendInto(cur, tgt, k) {
      const L = (a, b) => a + (b - a) * k;
      cur.bob = L(cur.bob, tgt.bob || 0); cur.lean = L(cur.lean, tgt.lean || 0); cur.lift = L(cur.lift || 0, tgt.lift || 0);
      for (const limb of ['FL', 'BL', 'FA', 'BA']) for (let i = 0; i < 2; i++) for (let a = 0; a < 2; a++) cur[limb][i][a] = L(cur[limb][i][a], tgt[limb][i][a]);
      // flags can't blend: take the target's
      for (const f of ['fist', 'hideHands', 'noLegs', 'eyesClosed', 'mouthOpen']) cur[f] = tgt[f];
    },
    /** Where a body point is on screen right now. */
    screenPoint(p, cam, name) {
      // (the same pose the player is drawn with: an Ultimate's held pose, then the cutscene's, then the awakened idle/run)
      const hold = p.ultHold && typeof p.ultHold.pose === 'function' ? p.ultHold.pose(p.ultHold.t || 0) : null;
      const j = hold || p.cineJoints || p.awkJ || ERX.PlayerSide.poseOf.apply(null, p.lastPose || ['idle', 0]);
      const pt = ERX.PlayerSide.points(j)[name];
      const lift = (j.lift || 0) + (p.cineLift || 0) + (p.ultHold && p.ultHold.lift ? p.ultHold.lift : 0);
      return { x: Math.round(p.cx) - cam.ix + pt.dx * p.facing, y: Math.round(p.feet - lift) - cam.iy + pt.dy };
    },
    /** The info an awakened fx function gets. */
    frameInfo(p, cam, A) {
      const g = p.game, el = g.element(), kit = Awakening.kit(el.id);
      const lift = (p.awkJ ? p.awkJ.lift || 0 : 0) + (p.cineLift || 0);
      return {
        A, p, d: p.facing, t: p.animT, kit, P: ERX.Abilities.palette(el, kit, false),
        x: Math.round(p.cx) - cam.ix, y: Math.round(p.feet - lift) - cam.iy, ground: Math.round(p.feet) - cam.iy,
        at: (name) => Awakening.screenPoint(p, cam, name), speed: Math.abs(p.vx), state: p.awkState,
      };
    },
    /** Glow creeping in from both sides of the screen. */
    sideGlow(ctx, W, H, col, a) {
      const w = Math.round(W * 0.18);
      for (const left of [true, false]) {
        const gr = ctx.createLinearGradient(left ? 0 : W, 0, left ? w : W - w, 0);
        gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save(); ctx.globalAlpha *= U.clamp(a, 0, 1); ctx.fillStyle = gr; ctx.fillRect(left ? 0 : W - w, 0, w, H); ctx.restore();
      }
    },
    /**
     * Every awakened Ultimate plays out like a film: letterbox bars, a slow push in, its colour
     * bleeding in from the edges and the air full of power, for as long as the Ultimate lasts.
     * (An Ultimate with `cinema: false` runs its own camera, like Planetfall.)
     */
    cinema(g, kit, e0, life) {
      const A = ERX.Abilities.api(g), p = g.player;
      A.spawn(e0, {
        life, layer: 'screen',
        spawn(e) { e.motes = []; for (let i = 0; i < 48; i++) e.motes.push({ x: Math.random(), y: Math.random(), s: 0.3 + Math.random(), ph: Math.random() * 6 }); },
        update(e) {
          const t = e.t, bars = t < 0.35 ? t / 0.35 : t > life - 0.5 ? Math.max(0, (life - t) / 0.5) : 1;
          e.cam = g.ultCam = { x: p.cx, y: p.y, zoom: 1 + 0.07 * Math.sin(Math.min(1, t / life) * Math.PI), bars, t: g.t };
        },
        onEnd(e) { if (g.ultCam === e.cam) g.ultCam = null; },
        draw(e, ctx, ox, oy, A2) {
          const V = g.view || { width: 480, height: 270 }, t = e.t, k = Math.min(1, t / 0.4, (life - t) / 0.6), col = e.pal.c;
          Awakening.sideGlow(ctx, V.width, V.height, col, 0.24 * k);
          A2.alpha(ctx, 0.8 * k, () => { for (const m of e.motes) { const x = (m.x * V.width + t * 30 * m.s) % V.width, y = V.height - ((m.y * V.height + t * 60 * m.s) % V.height), s = m.s > 1 ? 2 : 1; A2.px(ctx, x + Math.sin(t * 3 + m.ph) * 4, y, s, s, m.s > 0.8 ? '#ffffff' : e.pal.l); } });
        },
      }, { isUlt: true });
    },
  };

  ERX.Awakening = Awakening;
})(window.ERX = window.ERX || {});
