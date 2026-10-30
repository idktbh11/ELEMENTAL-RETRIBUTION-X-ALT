/*
 * ARMOR — sold by Brenda at the Voice's HQ.
 *
 *   def    damage blocked per hit (a hit always does at least 1)
 *   price  in gold (G). Monsters drop gold when they die.
 *   color  tint used for the armour on the character
 */
(function (ERX) {
  'use strict';

  const LIST = [
    { id: 'cardboard', name: 'Cardboard Armor', price: 10, def: 1, color: '#c8a070', desc: 'It is a box. With arm holes. Do not get it wet.' },
    { id: 'leather', name: 'Leather Vest', price: 35, def: 2, color: '#8a5a36', desc: 'Smells like a saddle. Protects like one, too.' },
    { id: 'chain', name: 'Chainmail', price: 70, def: 4, color: '#a8b0c0', desc: 'Jingles when you walk. Stealth: zero.' },
    { id: 'knight', name: 'Knight Plate', price: 150, def: 6, color: '#d8dce8', desc: 'Heavy, shiny, and extremely loud on stairs.' },
    { id: 'golden', name: 'Royal Golden Armor', price: 9999, def: 7, color: '#ffd34d', desc: 'You cannot afford to even look at this.' },
  ];
  const byId = Object.create(null);
  for (const a of LIST) byId[a.id] = a;

  ERX.Armor = {
    list: LIST,
    get(id) { return byId[id] || null; },
  };
})(window.ERX = window.ERX || {});
