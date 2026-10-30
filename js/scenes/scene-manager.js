/*
 * Scene manager — a stack of screens with animated transitions.
 *
 * Screens are registered by id and created on demand:
 *   ERX.Scenes.register('settings', SettingsScreen)
 *   ERX.Scenes.push('settings')                       // panel slides in
 *   ERX.Scenes.push('play', {}, { transition: 'dissolve' })
 *   ERX.Scenes.pop()
 *
 * Every screen below the top keeps rendering (the menu world stays alive
 * behind panels). Only the top screen receives input.
 *
 * Future gameplay states (world map, battle, inventory...) plug in as
 * additional screens with no changes here.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U;

  class Screen {
    constructor(id) {
      this.id = id;
      this.time = 0;
      this.appearT = 0;
      this.appear = 0;
      this.appearDuration = 0.35;
      this.leaving = false;
      this.easeIn = U.ease.outCubic;
    }
    enter() {}
    exit() {}
    /** Called when this screen becomes top again after another was popped. */
    resume() {}
    update() {}
    render() {}
    /** Default back behaviour: pop this screen. */
    back() {
      ERX.Audio.playSfx('back');
      ERX.Scenes.pop();
    }
    _tick(dt) {
      this.time += dt;
      this.appearT = U.clamp(this.appearT + (this.leaving ? -dt : dt) / this.appearDuration, 0, 1);
      this.appear = this.easeIn(this.appearT);
    }
  }

  // ---- pixel dissolve patterns (8x8 Bayer, 4px blocks) ----
  const BLOCK = 4;
  const patterns = [];
  function dissolvePattern(ctx, level) {
    const k = Math.max(0, Math.min(64, Math.round(level * 64)));
    if (!patterns[k]) {
      const tile = ERX.makeCanvas(8 * BLOCK, 8 * BLOCK);
      const c = tile.getContext('2d');
      c.fillStyle = '#05060c';
      for (let by = 0; by < 8; by++)
        for (let bx = 0; bx < 8; bx++) if (ERX.bayer8(bx, by) * 64 < k) c.fillRect(bx * BLOCK, by * BLOCK, BLOCK, BLOCK);
      patterns[k] = ctx.createPattern(tile, 'repeat');
    }
    return patterns[k];
  }

  const Scenes = {
    Screen,
    registry: {},
    stack: [],
    trans: null,

    register(id, ScreenClass) {
      this.registry[id] = ScreenClass;
    },

    top() {
      return this.stack[this.stack.length - 1] || null;
    },

    find(id) {
      return this.stack.find((s) => s.id === id) || null;
    },

    _create(id, params) {
      const Cls = this.registry[id];
      if (!Cls) throw new Error('Unknown screen: ' + id);
      const s = new Cls(id);
      s.enter(params || {});
      return s;
    },

    push(id, params, opts = {}) {
      const go = () => this.stack.push(this._create(id, params));
      if (opts.transition && opts.transition !== 'none') this.transition(opts.transition, opts.duration, go);
      else go();
    },

    pop(opts = {}) {
      const top = this.top();
      if (!top || this.stack.length <= 1) return;
      if (opts.transition && opts.transition !== 'none') {
        this.transition(opts.transition, opts.duration, () => this._remove(top));
      } else {
        top.leaving = true; // animates out, removed in update()
      }
    },

    replace(id, params, opts = {}) {
      const go = () => {
        const old = this.stack.pop();
        if (old) old.exit();
        this.stack.push(this._create(id, params));
      };
      if (opts.transition && opts.transition !== 'none') this.transition(opts.transition, opts.duration, go);
      else go();
    },

    _remove(screen) {
      const i = this.stack.indexOf(screen);
      if (i === -1) return;
      this.stack.splice(i, 1);
      screen.exit();
      const top = this.top();
      if (top) top.resume();
    },

    /**
     * Cover the screen, run `mid` at full cover, then reveal.
     * type: 'dissolve' | 'fade'. opts.revealOnly starts fully covered.
     */
    transition(type, duration = 0.7, mid = null, opts = {}) {
      this.trans = { type, t: opts.revealOnly ? duration / 2 : 0, dur: duration, mid, midDone: !!opts.revealOnly };
      if (!opts.silent) ERX.Audio.playSfx('transition');
    },

    get busy() {
      const top = this.top();
      return !!this.trans || !!(top && top.leaving);
    },

    update(dt, input) {
      if (this.trans) {
        const tr = this.trans;
        tr.t += dt;
        if (!tr.midDone && tr.t >= tr.dur / 2) {
          tr.midDone = true;
          if (tr.mid) tr.mid();
        }
        if (tr.t >= tr.dur) this.trans = null;
      }

      const top = this.top();
      const blocked = this.busy || input.capturing;
      for (const s of this.stack.slice()) {
        s._tick(dt);
        s.update(dt, input, s === top && !blocked);
      }
      for (const s of this.stack.slice()) {
        if (s.leaving && s.appearT <= 0) this._remove(s);
      }
    },

    render(ctx) {
      const top = this.top();
      // Screens flagged "opaque" (like gameplay) fully cover what is below them.
      let from = 0;
      for (let i = this.stack.length - 1; i >= 0; i--) if (this.stack[i].opaque) { from = i; break; }
      for (let i = from; i < this.stack.length; i++) this.stack[i].render(ctx, this.stack[i] === top);
    },

    /** True when an opaque screen (gameplay) is showing, so the menu world can sleep. */
    get worldHidden() {
      return this.stack.some((s) => s.opaque);
    },

    renderTransition(ctx, W, H) {
      const tr = this.trans;
      if (!tr) return;
      const half = tr.dur / 2;
      const cover = tr.t < half ? tr.t / half : 1 - (tr.t - half) / half;
      const k = U.ease.inOutSine(U.clamp(cover, 0, 1));
      if (tr.type === 'fade') {
        ctx.fillStyle = 'rgba(5,6,12,' + k.toFixed(3) + ')';
        ctx.fillRect(0, 0, W, H);
      } else {
        ctx.fillStyle = dissolvePattern(ctx, k);
        ctx.fillRect(0, 0, W, H);
      }
    },
  };

  ERX.Scenes = Scenes;
})(window.ERX = window.ERX || {});
