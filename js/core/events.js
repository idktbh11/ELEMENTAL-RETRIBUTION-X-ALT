/*
 * Tiny publish/subscribe event bus used to decouple systems
 * (e.g. Settings -> Audio, Display -> Backgrounds).
 */
(function (ERX) {
  'use strict';

  class EventBus {
    constructor() {
      this.listeners = new Map();
    }
    on(name, fn) {
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());
      this.listeners.get(name).add(fn);
      return () => this.off(name, fn);
    }
    off(name, fn) {
      const set = this.listeners.get(name);
      if (set) set.delete(fn);
    }
    emit(name, payload) {
      const set = this.listeners.get(name);
      if (!set) return;
      for (const fn of Array.from(set)) {
        try {
          fn(payload);
        } catch (err) {
          console.error('[ERX] listener for "' + name + '" failed:', err);
        }
      }
    }
  }

  ERX.EventBus = EventBus;
  ERX.Events = new EventBus();
})(window.ERX = window.ERX || {});
