/*
 * THE ULTIMATE CUTSCENE — plays before every Ultimate (~3.7 s):
 *
 *   0.00  the camera zooms in on you
 *   0.50  you CLAP: your element bursts out of your hands, your eyes glow
 *   0.75  the charge — different for every element (kit.ult.charge)
 *   1.95  zoom in even closer... cut to black
 *   2.25  0.2 s of silence
 *   2.45  a quick guitar riff + BOOM: the Ultimate's title slams onto the screen
 *   3.35  zoom back out to normal
 *   3.70  the Ultimate fires (kit.ult.run)
 *
 * The world is frozen while it plays.
 *
 * AWAKENED Ultimates use the same timeline with their own charge (which can be a
 * full joint animation: charge.pose(t, k) -> joints), a menacing riff, their own
 * title art (assets/images/ults-awakened/) and a glow creeping in from the sides.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, C = ERX.Color;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const T = { zoomIn: 0.3, clap: 0.5, charge: 0.75, chargeEnd: 1.95, black: 2.25, slam: 2.45, out: 3.35, end: 3.7 };
  const ease = (k) => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));

  class Cine {
    constructor(g, el, kit, base, opts) {
      this.g = g; this.el = el; this.kit = kit; this.base = base;
      this.awk = !!(opts && opts.awakened);
      this.pal = base.pal;
      this.t = 0;
      this.ch = kit.ult.charge || {};
      this.A = ERX.Abilities.api(g);
      this.music = ERX.Audio.music.wanted;
      this.state = {};            // scratch space for the charge animation
      const p = g.player;
      p.vx = 0; p.vy = 0; p.attackT = 0; p.dashT = 0;
      p.cinePose = 'clapOpen';
      p.cineLift = 0;
      sfx('whoosh');
    }

    /** Camera zoom right now. */
    zoom() {
      const t = this.t;
      if (t < T.zoomIn) return 1 + 2.2 * ease(t / T.zoomIn);
      if (t < T.chargeEnd) return 3.2 + 0.4 * ((t - T.zoomIn) / (T.chargeEnd - T.zoomIn));
      if (t < T.black) return 3.6 + 3 * ease((t - T.chargeEnd) / (T.black - T.chargeEnd));
      if (t < T.out) return 3.6;
      return 3.6 - 2.6 * ease((t - T.out) / (T.end - T.out));
    }
    /** How black the screen is. */
    black() {
      const t = this.t;
      if (t < T.chargeEnd) return 0;
      if (t < T.black) return (t - T.chargeEnd) / (T.black - T.chargeEnd);
      if (t < T.out) return 1;
      return Math.max(0, 1 - (t - T.out) / 0.25);
    }
    chargeK() { return U.clamp((this.t - T.charge) / (T.chargeEnd - T.charge), 0, 1); }

    update(dt) {
      const g = this.g, p = g.player, t0 = this.t;
      this.t += dt;
      const t = this.t, cross = (x) => t0 < x && t >= x;
      if (cross(T.clap)) {
        p.cinePose = 'clap';
        sfx('ultClap');
        ERX.FX.shake(2, 0.2);
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          g.fx.add({ x: p.cx + p.facing * 3, y: p.y + 9, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.4, color: i % 2 ? this.pal.c : '#ffffff', size: 1, fadeOut: 0.3 });
        }
      }
      if (cross(T.charge)) { if (typeof this.ch.pose !== 'function') p.cinePose = this.ch.pose || 'raise'; sfx(this.awk ? 'awakenCharge' : 'ultCharge'); if (ERX.ElementSfx) ERX.ElementSfx.charge(this.el.id, this.awk); }
      if (t >= T.charge && t < T.chargeEnd && typeof this.ch.pose === 'function') {
        // a full joint animation for the charge (blended so it flows out of the clap)
        const tgt = this.ch.pose(t - T.charge, this.chargeK());
        if (!p.cineJoints) { p.cineJoints = ERX.Awakening.copy(ERX.PlayerSide.poseOf('clap', 0)); }
        ERX.Awakening.blendInto(p.cineJoints, tgt, 1 - Math.exp(-18 * dt));
        p.cinePose = null;
      }
      if (t >= T.charge && t < T.chargeEnd) {
        p.cineLift = (this.ch.lift || 0) * ease(this.chargeK() * 1.6);
        if (this.ch.update) this.ch.update(this, dt, this.A);
        if (Math.random() < dt * 30) ERX.Abilities.puff(g, p.cx + U.lerp(-14, 14, Math.random()), p.y + U.lerp(-6, 22, Math.random()) - p.cineLift, this.pal.fx, this.pal, 1, 0.8);
      }
      if (cross(T.chargeEnd)) ERX.Audio.cutMusic();
      if (cross(T.slam)) { if (this.awk) sfx('awakenRiff', { seed: ERX.Elements.list.indexOf(this.el) }); else sfx('ultRiff'); sfx('bang'); ERX.FX.shake(this.awk ? 7 : 5, 0.4); }
      if (t >= T.out && !this.ch.keepLift) p.cineLift = U.lerp(p.cineLift, 0, Math.min(1, dt * 12));   // keepLift: stay up (the Ultimate fires from the air)
      g.fx.update(dt);
      if (t >= T.end) this.finish();
    }

    finish() {
      const g = this.g, p = g.player;
      p.cinePose = null;
      p.cineJoints = null;
      p.cineLift = 0;
      g.cine = null;
      if (this.music) ERX.Audio.playMusic(this.music);
      // fire!
      const e0 = Object.assign({ x: p.cx + p.facing * 10, y: p.y + 10, dir: p.facing, t: 0, hit: new Set(), hitT: new Map() }, this.base);
      const n0 = g.effects.length;
      if (ERX.ElementSfx) ERX.ElementSfx.ult(this.el.id, this.awk);
      this.kit.ult.run(this.A, e0, this.el);
      // awakened: the whole thing plays out like a film, for as long as it lasts
      if (this.awk && this.kit.ult.cinema !== false) {
        const lives = g.effects.slice(n0).map((f) => f.life || 0);
        ERX.Awakening.cinema(g, this.kit, e0, U.clamp(lives.length ? Math.max(...lives) : 4, 3, 7));
      }
    }

    /** Clap flash, glowing eyes and the charge, drawn into the world view. */
    drawWorld(c, cam) {
      const g = this.g, p = g.player, A = this.A, t = this.t;
      const x = Math.round(p.cx) - cam.ix, feet = Math.round(p.feet - (p.cineLift || 0)) - cam.iy, cy = feet - 12;
      // the clap: a ring of power bursting from the hands
      if (t >= T.clap && t < T.clap + 0.35) {
        const k = (t - T.clap) / 0.35;
        A.alpha(c, 1 - k, () => { A.ring(c, x + p.facing * 3, cy - 2, 4 + k * 26, this.pal.c); A.ring(c, x + p.facing * 3, cy - 2, 2 + k * 18, '#ffffff'); A.disc(c, x + p.facing * 3, cy - 2, Math.round(3 * (1 - k)) + 1, '#ffffff'); });
      }
      // the element's charge
      if (t >= T.charge && t < T.black && this.ch.draw) this.ch.draw(c, x, cy, this.chargeK(), t - T.charge, A, this.pal, this);
      // glowing eyes (from the clap on)
      if (t >= T.clap) {
        const ep = p.cineJoints ? ERX.Awakening.screenPoint(p, cam, 'eye') : null;
        const ex = ep ? ep.x : x + (p.facing > 0 ? 1 : -2), ey = ep ? ep.y : feet - 18;
        const pulse = 0.6 + 0.4 * Math.sin(t * 20);
        A.alpha(c, 0.45 * pulse, () => A.disc(c, ex + 1, ey + 1, 3, this.el.color));
        A.px(c, ex, ey, 2, 2, C.mix(this.el.color, '#ffffff', 0.45));
        A.px(c, ex + (p.facing > 0 ? 1 : 0), ey, 1, 1, '#ffffff');
      }
    }

    /** The black-out and the title slam, drawn over the whole screen. */
    drawScreen(ctx, W, H) {
      const b = this.black();
      if (b > 0) { ctx.fillStyle = 'rgba(0,0,0,' + b.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
      const t = this.t;
      if (t < T.slam || t > T.out + 0.3) return;
      const k = t - T.slam, fade = t > T.out ? 1 - (t - T.out) / 0.3 : 1;
      const cx = Math.round(W / 2), cy = Math.round(H * 0.45);
      ctx.save();
      ctx.globalAlpha = fade;
      // awakened: the screen glows in from the sides
      if (this.awk) ERX.Awakening.sideGlow(ctx, W, H, this.pal.c, 0.3 + 0.1 * Math.sin(k * 10));
      // element-coloured impact lines behind the title
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + k * 0.6, r0 = 30 + (k * 90) % 30, r1 = r0 + 40 + (i % 3) * 30;
        ctx.strokeStyle = i % 2 ? this.pal.c : this.pal.l; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.6); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.6); ctx.stroke();
      }
      // the title slams in big, then settles
      const slam = k < 0.12 ? 2.4 - (k / 0.12) * 1.4 : 1 + Math.max(0, 0.06 - (k - 0.12)) * 2;
      const img = ERX.Assets.image((this.awk ? 'awk_' : 'ult_') + this.el.id);
      ctx.imageSmoothingEnabled = false;
      if (img) {
        const base = Math.max(1, Math.floor(Math.min((W * 0.72) / img.width, (H * (this.awk ? 0.72 : 0.5)) / img.height)));
        const w = Math.round(img.width * base * slam), h = Math.round(img.height * base * slam);
        ctx.drawImage(img, cx - Math.round(w / 2), cy - Math.round(h / 2), w, h);
      } else {
        // no art (Darkness): a generated title in the same spirit
        const F = ERX.Font, words = this.kit.ult.name.toUpperCase().split(' ');
        const sc = Math.max(2, Math.round(3 * slam));
        words.forEach((wd, i) => F.draw(ctx, wd, cx, cy - 16 * sc / 3 + i * 9 * sc - (words.length - 1) * 4 * sc, { scale: sc, color: this.pal.l, outline: '#120c1a', shadow: this.pal.d, shadowOffset: Math.max(1, sc - 1), align: 'center' }));
      }
      if (k < 0.1) { ctx.globalAlpha = (1 - k / 0.1) * 0.6; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
    }
  }

  ERX.Ultimate = {
    T,
    start(g, el, kit, base, opts) { g.cine = new Cine(g, el, kit, base, opts); },
  };
})(window.ERX = window.ERX || {});
