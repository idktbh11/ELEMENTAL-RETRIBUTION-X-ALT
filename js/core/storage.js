/*
 * Persistence layer. Wraps localStorage with JSON encoding and a safe
 * in-memory fallback (private browsing, blocked storage, etc.).
 *
 * Future save files can live here too — everything is namespaced under
 * Config.STORAGE_PREFIX.
 */
(function (ERX) {
  'use strict';

  const memory = {};
  let available = false;
  try {
    const probe = '__erx_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    available = true;
  } catch (e) {
    available = false;
  }

  const fullKey = (key) => ERX.Config.STORAGE_PREFIX + key;

  ERX.Storage = {
    get available() { return available; },

    load(key, fallback = null) {
      const k = fullKey(key);
      try {
        const raw = available ? window.localStorage.getItem(k) : memory[k];
        if (raw === null || raw === undefined) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        console.warn('[ERX] Could not read "' + key + '" from storage, using defaults.', e);
        return fallback;
      }
    },

    save(key, value) {
      const k = fullKey(key);
      const raw = JSON.stringify(value);
      try {
        if (available) window.localStorage.setItem(k, raw);
        else memory[k] = raw;
        return true;
      } catch (e) {
        memory[k] = raw;
        return false;
      }
    },

    remove(key) {
      const k = fullKey(key);
      try {
        if (available) window.localStorage.removeItem(k);
      } catch (e) { /* ignore */ }
      delete memory[k];
    },
  };
})(window.ERX = window.ERX || {});
