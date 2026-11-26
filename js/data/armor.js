/*
 * ARMOR — Brenda's chest pieces at the Voice's HQ, and Normalton's armoury (Greta's: head to toe,
 * leather to iron). Holt the smith, next door, upgrades whatever you're wearing: +1, +2, +3.
 *
 *   def    damage blocked per hit (armour soaks at most 70% of a hit: js/game/player.js takeHit)
 *   price  in gold (G). Monsters drop gold when they die.
 *   color  tint used for the armour on the character
 *   slot   head | chest | legs | feet (default chest)
 *   tier   leather | chain | iron (how it's drawn on you: a cap, a coif, a helm...)
 *   shop   who sells it: none = Brenda's counter at the HQ; 'normalton' = Greta's armoury
 *
 * An upgraded piece is the same armour with a level on the end of its id: 'iron_helm+2' (+1 DEF a level).
 */
(function (ERX) {
  'use strict';

  const LIST = [
    // ---- Brenda's (the HQ)
    { id: 'cardboard', name: 'Cardboard Armor', price: 10, def: 1, color: '#c8a070', desc: 'It is a box. With arm holes. Do not get it wet.' },
    { id: 'leather', name: 'Leather Vest', price: 35, def: 2, color: '#8a5a36', desc: 'Smells like a saddle. Protects like one, too.' },
    { id: 'chain', name: 'Chainmail', price: 70, def: 4, color: '#a8b0c0', desc: 'Jingles when you walk. Stealth: zero.' },
    { id: 'knight', name: 'Knight Plate', price: 150, def: 6, color: '#d8dce8', desc: 'Heavy, shiny, and extremely loud on stairs.' },
    { id: 'golden', name: 'Royal Golden Armor', price: 9999, def: 7, color: '#ffd34d', desc: 'You cannot afford to even look at this.' },

    // ---- Normalton's armoury: leather...
    { id: 'leather_cap', name: 'Leather Cap', slot: 'head', tier: 'leather', shop: 'normalton', price: 15, def: 1, color: '#a8743e', desc: 'A snug leather cap. Smells faintly of cow. Keeps the sun off, at least.' },
    { id: 'leather_tunic', name: 'Leather Tunic', slot: 'chest', tier: 'leather', shop: 'normalton', price: 30, def: 2, color: '#8e5c34', desc: 'Stitched by hand. Whose hand? Do not ask Greta whose hand.' },
    { id: 'leather_pants', name: 'Leather Pants', slot: 'legs', tier: 'leather', shop: 'normalton', price: 20, def: 1, color: '#7a4c2c', desc: 'They squeak when you run. Everyone will hear you coming. Everyone.' },
    { id: 'leather_boots', name: 'Leather Boots', slot: 'feet', tier: 'leather', shop: 'normalton', price: 12, def: 1, color: '#6a4026', desc: 'Comfy. Waterproof. Mostly.' },
    // ...chainmail...
    { id: 'chain_coif', name: 'Chain Coif', slot: 'head', tier: 'chain', shop: 'normalton', price: 45, def: 2, color: '#a4acbc', desc: 'A hood made of tiny metal rings. Your hair will never be the same.' },
    { id: 'chain_shirt', name: 'Chain Shirt', slot: 'chest', tier: 'chain', shop: 'normalton', price: 75, def: 4, color: '#9aa4b8', desc: 'Hundreds of little rings, all holding hands. Very supportive.' },
    { id: 'chain_leggings', name: 'Chain Leggings', slot: 'legs', tier: 'chain', shop: 'normalton', price: 55, def: 2, color: '#8e98ac', desc: 'They pinch. Behind the knees. Every. Single. Step.' },
    { id: 'chain_boots', name: 'Chain Boots', slot: 'feet', tier: 'chain', shop: 'normalton', price: 35, def: 1, color: '#848ea2', desc: 'Jingle jangle. You sound like a very angry wind chime.' },
    // ...and iron (Holt's finest)
    { id: 'iron_helm', name: 'Iron Helm', slot: 'head', tier: 'iron', shop: 'normalton', price: 95, def: 3, color: '#c4cad8', desc: 'Solid iron. You can hear the sea in it. (You cannot. That is just ringing.)' },
    { id: 'iron_plate', name: 'Iron Plate', slot: 'chest', tier: 'iron', shop: 'normalton', price: 140, def: 5, color: '#b8c0d0', desc: 'Bonk-proof. Mostly fall-proof. Definitely not lift-proof.' },
    { id: 'iron_greaves', name: 'Iron Greaves', slot: 'legs', tier: 'iron', shop: 'normalton', price: 120, def: 3, color: '#aab2c4', desc: 'Heavy. Very heavy. Your knees have filed a complaint.' },
    { id: 'iron_boots', name: 'Iron Boots', slot: 'feet', tier: 'iron', shop: 'normalton', price: 70, def: 2, color: '#9ca4b6', desc: 'Stomp. Stomp. STOMP. The chickens are terrified of you now.' },
  ];
  const byId = Object.create(null);
  for (const a of LIST) byId[a.id] = a;
  const MAX_UP = 3;
  const UP_COST = [0, 0.4, 0.7, 1.1];   // what an upgrade to +1 / +2 / +3 costs, against the piece's price...
  const UP_MIN = [0, 25, 45, 70];       // ...but never less than this (a cheap cap at +3 shouldn't beat an iron helm for a song)

  ERX.Armor = {
    list: LIST,
    MAX_UP,
    /** A piece by its plain id ('iron_helm'). */
    get(id) { return byId[id] || null; },
    /** 'iron_helm+2' -> { a: the piece, up: 2 } ('iron_helm' -> up 0); null if it isn't armour. */
    parse(id) {
      const m = /^([a-z_]+)(?:\+(\d))?$/.exec(typeof id === 'string' ? id : '');
      const a = m && byId[m[1]];
      return a ? { a, up: Math.min(MAX_UP, Number(m[2] || 0)) } : null;
    },
    /** The id of a piece at an upgrade level. */
    idAt(a, up) { return a.id + (up > 0 ? '+' + up : ''); },
    /** What Holt charges to take a piece up to level `to` (1..3). */
    upCost(a, to) { return Math.max(UP_MIN[to] || 25, Math.round((a.price * (UP_COST[to] || 1)) / 5) * 5); },
    slotOf(a) { return a.slot || 'chest'; },
    /** Everything a shop sells ('normalton'), or Brenda's (no name). */
    shop(name) { return LIST.filter((a) => (a.shop || null) === (name || null)); },
  };
})(window.ERX = window.ERX || {});
