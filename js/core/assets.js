/*
 * Asset loader. Loads everything listed in ERX.AssetPaths.images and
 * never blocks the game on a missing file — missing assets resolve to
 * null and callers fall back to procedural art.
 */
(function (ERX) {
  'use strict';

  const Assets = {
    images: {},

    loadImage(key, path) {
      return new Promise((resolve) => {
        if (!path) return resolve(null);
        const img = new Image();
        img.onload = () => {
          this.images[key] = img;
          resolve(img);
        };
        img.onerror = () => {
          console.warn('[ERX] Missing image asset "' + key + '" at ' + path + ' — using fallback.');
          this.images[key] = null;
          resolve(null);
        };
        img.src = path;
      });
    },

    loadAll() {
      const jobs = [];
      const paths = ERX.AssetPaths.images;
      for (const key of Object.keys(paths)) jobs.push(this.loadImage(key, paths[key]));
      // element title art (shown once, at the reveal)
      if (ERX.Elements) for (const e of ERX.Elements.list) if (e.art) jobs.push(this.loadImage('element_' + e.id, e.art));
      // ultimate title art (the slam). Darkness has none: it gets a generated title.
      if (ERX.Elements) for (const e of ERX.Elements.list) if (e.id !== 'darkness') jobs.push(this.loadImage('ult_' + e.id, 'assets/images/ults/' + e.id + '.png'));
      // the AWAKENED Ultimate titles
      if (ERX.Elements) for (const e of ERX.Elements.list) if (e.id !== 'darkness') jobs.push(this.loadImage('awk_' + e.id, 'assets/images/ults-awakened/' + e.id + '.png'));
      return Promise.all(jobs);
    },

    image(key) {
      return this.images[key] || null;
    },
  };

  ERX.Assets = Assets;
})(window.ERX = window.ERX || {});
