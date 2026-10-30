/*
 * Settings manager — single source of truth for player preferences.
 *
 *   ERX.Settings.get('audio.music')        -> 60
 *   ERX.Settings.set('audio.music', 75)    -> emits 'settings:change', autosaves
 *
 * Values are validated against DEFAULTS and persisted to storage.
 * Note: there is intentionally NO element setting. Elements are never chosen.
 */
(function (ERX) {
  'use strict';

  const KEY = 'settings';

  const DEFAULTS = {
    audio: { master: 80, music: 60, sfx: 80 },
    video: { lowDetail: false, screenShake: true, showFps: false },
    controls: { bindings: null }, // filled in by ERX.Keybinds
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));

  function sanitize(defaults, loaded) {
    const out = {};
    for (const k of Object.keys(defaults)) {
      const d = defaults[k];
      const v = loaded ? loaded[k] : undefined;
      if (d !== null && typeof d === 'object' && !Array.isArray(d)) {
        out[k] = sanitize(d, v && typeof v === 'object' ? v : null);
      } else if (d === null) {
        out[k] = v === undefined ? null : v;
      } else if (typeof d === 'number') {
        out[k] = typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(100, v)) : d;
      } else if (typeof d === 'boolean') {
        out[k] = typeof v === 'boolean' ? v : d;
      } else {
        out[k] = v === undefined ? d : v;
      }
    }
    return out;
  }

  let saveTimer = null;

  const Settings = {
    DEFAULTS,
    data: clone(DEFAULTS),

    load() {
      const stored = ERX.Storage.load(KEY, null);
      const payload = stored && stored.version === ERX.Config.SETTINGS_VERSION ? stored.data : null;
      this.data = sanitize(DEFAULTS, payload);
      return this.data;
    },

    save() {
      clearTimeout(saveTimer);
      saveTimer = null;
      ERX.Storage.save(KEY, { version: ERX.Config.SETTINGS_VERSION, data: this.data });
    },

    /** Debounced save so dragging a slider doesn't hammer storage. */
    queueSave() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => this.save(), 250);
    },

    flush() {
      if (saveTimer) this.save();
    },

    get(path) {
      return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), this.data);
    },

    set(path, value) {
      const parts = path.split('.');
      let o = this.data;
      for (let i = 0; i < parts.length - 1; i++) {
        if (o[parts[i]] == null || typeof o[parts[i]] !== 'object') o[parts[i]] = {};
        o = o[parts[i]];
      }
      const last = parts[parts.length - 1];
      if (o[last] === value && typeof value !== 'object') return;
      o[last] = value;
      this.queueSave();
      ERX.Events.emit('settings:change', { path, value });
    },
  };

  window.addEventListener('pagehide', () => Settings.flush());
  window.addEventListener('beforeunload', () => Settings.flush());

  ERX.Settings = Settings;
})(window.ERX = window.ERX || {});
