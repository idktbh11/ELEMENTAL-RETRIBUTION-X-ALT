/*
 * Menu background manager.
 *
 * Holds the registry of menu environments, picks ONE at random when the
 * game boots (and keeps it for the whole session), drives the parallax
 * camera, and rebuilds the procedural art when the window is resized.
 *
 * Adding a new world = write a class extending ERX.Environment and call
 *   ERX.Backgrounds.register({ id, name, music, ambience, Env })   (secret: true = never picked at random)
 */
(function (ERX) {
  'use strict';

  const U = ERX.U;

  /** Base class for animated menu worlds. */
  class Environment {
    constructor(seed) {
      this.seed = seed;
      this.t = 0;
      this.low = false;
      this.W = 0;
      this.H = 0;
      this.M = 24; // parallax margin (pixels of extra art on each side)
    }
    /** (Re)generate all cached art for a W x H screen. */
    build(W, H) { this.W = W; this.H = H; }
    setLowDetail(low) { this.low = low; }
    update(dt) { this.t += dt; }
    render() {}
    /** x position for a layer of width W+2M at the given parallax depth. */
    px(cam, depth) { return Math.round(-this.M - cam.x * depth); }
    py(cam, depth) { return Math.round(-cam.y * depth); }
  }
  ERX.Environment = Environment;

  const Backgrounds = {
    defs: [],
    current: null,
    env: null,
    seed: 0,
    cam: { x: 0, y: 0 },
    t: 0,
    rebuildIn: 0,

    register(def) {
      this.defs.push(def);
    },

    get(id) {
      return this.defs.find((d) => d.id === id) || null;
    },

    init() {
      ERX.Events.on('display:resize', () => { this.rebuildIn = 0.12; });
      ERX.Events.on('settings:change', (e) => {
        if (e.path === 'video.lowDetail' && this.env) this.env.setLowDetail(e.value);
      });
    },

    /**
     * Pick the world for this session. Truly random, except it avoids
     * showing the exact same world twice in a row across launches.
     */
    pick() {
      if (ERX.Config.FORCE_SCENE) {
        const forced = this.get(ERX.Config.FORCE_SCENE);
        if (forced) return forced;
        console.warn('[ERX] Unknown ?scene=' + ERX.Config.FORCE_SCENE + ', picking randomly.');
      }
      const last = ERX.Storage.load('meta.lastScene', null);
      const open = this.defs.filter((d) => !d.secret);
      let pool = open.filter((d) => d.id !== last);
      if (!pool.length) pool = open;
      return pool[Math.floor(Math.random() * pool.length)];
    },

    start(def) {
      this.current = def;
      this.seed = ERX.Config.FORCE_SEED !== null ? ERX.Config.FORCE_SEED : U.randomSeed();
      this.env = new def.Env(this.seed);
      this.env.setLowDetail(!!ERX.Settings.get('video.lowDetail'));
      this.env.build(ERX.Display.width, ERX.Display.height);
      ERX.Storage.save('meta.lastScene', def.id);
      ERX.Audio.playMusic(def.music);
      ERX.Audio.setAmbience(def.ambience);
      if (ERX.Config.DEBUG) console.log('[ERX] Menu world: ' + def.name + ' (seed ' + this.seed + ')');
    },

    update(dt, input) {
      if (!this.env) return;
      this.t += dt;
      if (this.rebuildIn > 0) {
        this.rebuildIn -= dt;
        if (this.rebuildIn <= 0) this.env.build(ERX.Display.width, ERX.Display.height);
      }
      const low = this.env.low;
      let tx = 0, ty = 0;
      if (!low) {
        tx = Math.sin(this.t * 0.09) * 6;
        ty = Math.sin(this.t * 0.063) * 1.5;
        if (input.mouse.present && input.lastDevice === 'mouse') {
          tx += (input.mouse.x / ERX.Display.width - 0.5) * 8;
          ty += (input.mouse.y / ERX.Display.height - 0.5) * 3;
        }
      }
      this.cam.x = U.approach(this.cam.x, tx, 1.5, dt);
      this.cam.y = U.approach(this.cam.y, ty, 1.5, dt);
      this.env.update(dt, this.cam);
    },

    render(ctx) {
      if (this.env) this.env.render(ctx, this.cam);
    },
  };

  ERX.Backgrounds = Backgrounds;
})(window.ERX = window.ERX || {});
