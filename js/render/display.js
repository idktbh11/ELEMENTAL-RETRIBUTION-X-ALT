/*
 * Display — owns the game canvas and the pixel-perfect scaling strategy.
 *
 * The game draws into a small internal canvas (250-375px tall). That
 * canvas is scaled up by a WHOLE NUMBER of device pixels, so every game
 * pixel becomes a crisp square block at any resolution. Instead of
 * letterboxing, the internal width adapts to the window's aspect ratio,
 * so wide, tall and ultrawide windows are all filled edge-to-edge.
 */
(function (ERX) {
  'use strict';

  const Display = {
    canvas: null,
    ctx: null,
    width: 480,
    height: 270,
    scale: 1,

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      window.addEventListener('resize', () => this.resize());
      // pixel density can change without a resize (dragging the window to
      // another monitor, browser zoom, phone emulation): re-fit then too
      const watchDpr = () => {
        if (!window.matchMedia) return;
        const mq = window.matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)');
        if (mq.addEventListener) mq.addEventListener('change', () => { this.resize(); watchDpr(); }, { once: true });
      };
      watchDpr();
      document.addEventListener('fullscreenchange', () => {
        this.resize();
        ERX.Events.emit('display:fullscreen', this.isFullscreen());
      });
      this.resize();
    },

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const devW = Math.max(1, Math.round(window.innerWidth * dpr));
      const devH = Math.max(1, Math.round(window.innerHeight * dpr));

      let scale = Math.max(1, Math.floor(devH / ERX.Config.MIN_HEIGHT));
      while (scale > 1 && devW / scale < ERX.Config.MIN_WIDTH) scale--;

      const w = Math.ceil(devW / scale);
      const h = Math.ceil(devH / scale);
      const changed = w !== this.width || h !== this.height || scale !== this.scale || !this.canvas.width;

      this.scale = scale;
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      this.width = w;
      this.height = h;
      // CSS size in CSS pixels such that each game pixel = `scale` device pixels.
      this.canvas.style.width = (w * scale) / dpr + 'px';
      this.canvas.style.height = (h * scale) / dpr + 'px';
      this.ctx.imageSmoothingEnabled = false;

      if (changed) ERX.Events.emit('display:resize', { width: w, height: h, scale });
    },

    /** Convert a mouse position in CSS pixels to internal game pixels. */
    toInternal(clientX, clientY) {
      const r = this.canvas.getBoundingClientRect();
      return {
        x: ((clientX - r.left) * this.width) / r.width,
        y: ((clientY - r.top) * this.height) / r.height,
      };
    },

    isFullscreen() {
      return !!document.fullscreenElement;
    },

    setFullscreen(on) {
      try {
        if (on && !document.fullscreenElement) {
          const p = document.documentElement.requestFullscreen({ navigationUI: 'hide' });
          if (p && p.catch) p.catch(() => ERX.Toast && ERX.Toast.show('Fullscreen was blocked by the browser.', { color: '#ff8a6a' }));
        } else if (!on && document.fullscreenElement) {
          const p = document.exitFullscreen();
          if (p && p.catch) p.catch(() => {});
        }
      } catch (e) {
        console.warn('[ERX] Fullscreen not available:', e);
      }
    },

    toggleFullscreen() {
      this.setFullscreen(!this.isFullscreen());
    },
  };

  ERX.Display = Display;
})(window.ERX = window.ERX || {});
