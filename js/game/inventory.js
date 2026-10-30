/*
 * THE BAG: a Minecraft-style inventory (the screen is InventoryScreen in js/screens/game-menus.js).
 *
 *   character.inv    36 slots: 0-8 are the hotbar, 9-35 the bag. Each is null or { id, n }.
 *   character.equip  { head, chest, legs, feet }: the armour you're wearing (item ids).
 *
 * Item ids come from js/data/items.js ('vrd', 'armor:leather', ...). An older save's items / armour move
 * into the bag the first time it's touched, and the older fields stay up to date for the code that reads
 * them: character.items (ids of what you carry), character.armorOwned and character.armor (the chest
 * piece you wear, which is what the player sprite and the damage maths look at).
 */
(function (ERX) {
  'use strict';

  const SIZE = 36, HOTBAR = 9, ARMOR = ['head', 'chest', 'legs', 'feet'];
  const Items = () => ERX.Items;
  const empty = () => ({ head: null, chest: null, legs: null, feet: null });

  const Inventory = {
    SIZE, HOTBAR, ARMOR,

    /** How many of an item fit in one slot. */
    max(id) { const it = Items().get(id); return it ? it.stack || 1 : 1; },

    /** Make sure the character has a bag and armour slots (moving an older save's things in). Returns c. */
    ensure(c) {
      if (!c || (Array.isArray(c.inv) && c.inv.length === SIZE && c.equip && typeof c.equip === 'object')) return c;
      c.inv = new Array(SIZE).fill(null);
      c.equip = empty();
      const worn = ERX.Armor && ERX.Armor.get(c.armor) ? c.armor : null;
      if (worn) c.equip.chest = 'armor:' + worn;
      for (const id of Array.isArray(c.items) ? c.items : []) if (Items().get(id) && !this.has(c, id)) this._put(c, id, 1);
      for (const a of Array.isArray(c.armorOwned) ? c.armorOwned : []) if (a !== worn && ERX.Armor.get(a)) this._put(c, 'armor:' + a, 1);
      this.sync(c);
      return c;
    },

    /** Throw out anything broken in a saved bag (unknown items, silly counts, armour in the wrong slot). */
    clean(c) {
      if (!c || !Array.isArray(c.inv)) return c;
      const inv = new Array(SIZE).fill(null);
      for (let i = 0; i < SIZE; i++) { const s = c.inv[i]; if (s && Items().get(s.id) && Number.isInteger(s.n) && s.n > 0) inv[i] = { id: s.id, n: Math.min(s.n, this.max(s.id)) }; }
      const eq = empty();
      for (const k of ARMOR) { const id = c.equip && c.equip[k], it = id && Items().get(id); if (it && it.slot === k) eq[k] = id; }
      c.inv = inv; c.equip = eq;
      this.sync(c);
      return c;
    },

    /** Put n of an item in the bag (topping up stacks first, then the hotbar, then the rest). Returns how many didn't fit. */
    add(c, id, n) {
      this.ensure(c);
      const it = Items().get(id);
      if (!it) return n || 1;
      if (it.unique && this.has(c, id)) return 0;   // one is all you get
      const left = this._put(c, id, n || 1);
      this.sync(c);
      return left;
    },
    _put(c, id, n) {
      const m = this.max(id);
      for (let i = 0; i < SIZE && n > 0; i++) { const s = c.inv[i]; if (s && s.id === id && s.n < m) { const k = Math.min(n, m - s.n); s.n += k; n -= k; } }
      for (let i = 0; i < SIZE && n > 0; i++) if (!c.inv[i]) { const k = Math.min(n, m); c.inv[i] = { id, n: k }; n -= k; }
      return n;
    },
    /** Would n of an item fit? */
    fits(c, id, n) {
      this.ensure(c);
      const m = this.max(id);
      let room = 0;
      for (const s of c.inv) room += !s ? m : s.id === id ? m - s.n : 0;
      return room >= (n || 1);
    },
    /** Take n of an item out of the bag. Returns how many were taken. */
    remove(c, id, n) {
      this.ensure(c);
      let want = n || 1;
      for (let i = SIZE - 1; i >= 0 && want > 0; i--) { const s = c.inv[i]; if (s && s.id === id) { const k = Math.min(want, s.n); s.n -= k; want -= k; if (!s.n) c.inv[i] = null; } }
      this.sync(c);
      return (n || 1) - want;
    },
    count(c, id) {
      this.ensure(c);
      let n = 0;
      for (const s of c.inv) if (s && s.id === id) n += s.n;
      for (const k of ARMOR) if (c.equip[k] === id) n++;
      return n;
    },
    /** In the bag or being worn. */
    has(c, id) {
      if (!c) return false;
      this.ensure(c);
      return c.inv.some((s) => s && s.id === id) || ARMOR.some((k) => c.equip[k] === id);
    },

    /** Wear an armour piece from the bag. Whatever you had on goes into the slot it came from. */
    equip(c, id) {
      this.ensure(c);
      const it = Items().get(id), i = c.inv.findIndex((s) => s && s.id === id);
      if (!it || !it.slot || i < 0) return false;
      const old = c.equip[it.slot];
      c.equip[it.slot] = id;
      c.inv[i] = old ? { id: old, n: 1 } : null;
      this.sync(c);
      return true;
    },
    /** All the defence your armour adds up to. */
    defense(c) {
      this.ensure(c);
      let d = 0;
      for (const k of ARMOR) { const it = Items().get(c.equip[k]); if (it && it.def) d += it.def; }
      return d;
    },
    /** Lose every piece of armour (getting your element is a fresh start). */
    clearArmor(c) {
      this.ensure(c);
      c.inv = c.inv.map((s) => (s && Items().get(s.id) && Items().get(s.id).slot ? null : s));
      c.equip = empty();
      this.sync(c);
    },
    /** Empty everything. */
    reset(c) { c.inv = new Array(SIZE).fill(null); c.equip = empty(); this.sync(c); },

    /** Bring the older fields up to date: items, armorOwned and armor. */
    sync(c) {
      const ids = [], owned = [];
      const note = (id) => { if (!id) return; if (id.indexOf('armor:') === 0) { if (owned.indexOf(id.slice(6)) === -1) owned.push(id.slice(6)); } else if (ids.indexOf(id) === -1) ids.push(id); };
      for (const s of c.inv) if (s) note(s.id);
      for (const k of ARMOR) note(c.equip[k]);
      c.items = ids;
      c.armorOwned = owned;
      c.armor = c.equip.chest && c.equip.chest.indexOf('armor:') === 0 ? c.equip.chest.slice(6) : null;
    },
  };

  ERX.Inventory = Inventory;
})(window.ERX = window.ERX || {});
