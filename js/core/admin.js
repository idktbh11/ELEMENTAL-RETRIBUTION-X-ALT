/*
 * HIDDEN ADMIN MODE — for testing. Unlocked by typing "theelementaladmin"
 * on the main menu. Never mentioned anywhere in the game.
 *
 * Lets you pick ANY element to play with (a temporary override: your real,
 * randomly-assigned element is never changed or re-rolled), unlock every
 * skill, and turn on god mode / infinite mana / instant Ultimate.
 */
(function (ERX) {
  'use strict';

  const DEFAULTS = { unlocked: false, element: null, skills: 'normal', god: false, infiniteMp: false, instantUlt: false, instantAwk: false };

  const Admin = {
    data: Object.assign({}, DEFAULTS),
    load() {
      const d = ERX.Storage.load('admin', null);
      this.data = Object.assign({}, DEFAULTS, d && typeof d === 'object' ? d : {});
      if (this.data.element && !(ERX.Elements && ERX.Elements.get(this.data.element))) this.data.element = null;
      if (['normal', 'base', 'max'].indexOf(this.data.skills) === -1) this.data.skills = 'normal';
      return this.data;
    },
    save() { ERX.Storage.save('admin', this.data); },
    on() { return !!this.data.unlocked; },
    set(k, v) { this.data[k] = v; this.save(); },
    unlock() { this.data.unlocked = true; this.save(); },
    lock() { this.data = Object.assign({}, DEFAULTS); this.save(); },
  };

  ERX.Admin = Admin;
})(window.ERX = window.ERX || {});
