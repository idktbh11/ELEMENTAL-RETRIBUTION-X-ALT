/*
 * Items you carry (they live in the bag: js/game/inventory.js). Each one has a name, a description for
 * the inventory, and draws its own little icon. Optional: stack (how many fit in one slot, default 1),
 * unique (you only ever get one), slot (an armour slot it can be worn in), def, color (its name colour),
 * tag (a little label under the name).
 *
 * Armour from Brenda's shop (js/data/armor.js) are items too: 'armor:<id>', worn in the CHEST slot.
 */
(function (ERX) {
  'use strict';

  const ITEMS = {
    vrd: {
      name: 'VOID RECALL DEVICE',
      short: 'VRD',
      unique: true, color: '#e0c8ff', tag: 'KEY ITEM',
      desc: 'Teleports you back to the void. Only works at a Checkshot. (A checkpoint. With a cooler name.)',
      /** A chunky purple gadget with a glowing void-orb and a little antenna. Centred on (x, y). */
      draw(ctx, x, y, t, s) {
        s = s || 1;
        const R = (dx, dy, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x + dx * s), Math.round(y + dy * s), Math.ceil(w * s), Math.ceil(h * s)); };
        const pulse = 0.5 + 0.5 * Math.sin((t || 0) * 5);
        R(-4, -4, 8, 10, '#120c1c'); R(-3, -5, 6, 12, '#120c1c');
        R(-3, -4, 6, 10, '#4a2a7a'); R(-3, -4, 6, 1, '#6a44a0'); R(2, -3, 1, 9, '#2e1a50');
        R(-2, -3, 4, 4, '#05020a'); R(-1, -2, 2, 2, pulse > 0.5 ? '#e0b8ff' : '#b87aff');
        R(-2, 3, 1, 1, '#ffd34d'); R(0, 3, 1, 1, '#7af0a0'); R(-2, 5, 4, 1, '#2e1a50');
        R(2, -8, 1, 4, '#8a7e9c'); R(1, -9, 3, 1, pulse > 0.5 ? '#ff8ad8' : '#c89aff');
      },
    },
  };

  // ---- armour as items: a little chestplate in the armour's colour
  const CHEST = [
    '.##....##.',
    '#lc#..#cc#',
    '#lcc##ccd#',
    '#lccccccd#',
    '.#lcsscd#.',
    '.#lccccd#.',
    '.#lcsscd#.',
    '.#lccccd#.',
    '..######..',
  ];
  const armorItems = Object.create(null);
  function armorItem(aid) {
    if (armorItems[aid]) return armorItems[aid];
    const a = ERX.Armor && ERX.Armor.get(aid);
    if (!a) return null;
    const C = ERX.Color, cols = { '#': C.shade(a.color, -0.6), c: a.color, l: C.shade(a.color, 0.35), d: C.shade(a.color, -0.25), s: C.shade(a.color, -0.4) };
    return (armorItems[aid] = {
      id: 'armor:' + aid, name: a.name.toUpperCase(), desc: a.desc, slot: 'chest', def: a.def,
      color: C.mix(a.color, '#ffffff', 0.35), tag: 'ARMOR  +' + a.def + ' DEF',
      draw(ctx, x, y, t, s) {
        s = s || 1;
        for (let r = 0; r < CHEST.length; r++) for (let q = 0; q < CHEST[r].length; q++) {
          const ch = CHEST[r][q];
          if (ch === '.') continue;
          ctx.fillStyle = cols[ch];
          ctx.fillRect(Math.round(x + (q - 5) * s), Math.round(y + (r - 4) * s), Math.ceil(s), Math.ceil(s));
        }
        if (aid === 'golden') { const k = Math.floor((t || 0) * 6) % 12; if (k < 7) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x + (k - 4) * s), Math.round(y + (k - 3) * s), Math.ceil(s), Math.ceil(s)); } }   // it gleams
      },
    });
  }

  ERX.Items = {
    list: ITEMS,
    get(id) { return ITEMS[id] || (typeof id === 'string' && id.indexOf('armor:') === 0 ? armorItem(id.slice(6)) : null); },
    /** Carrying it (or wearing it). */
    has(c, id) { return ERX.Inventory ? ERX.Inventory.has(c, id) : !!(c && c.items && c.items.indexOf(id) !== -1); },
  };
})(window.ERX = window.ERX || {});
