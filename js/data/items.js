/*
 * Items you carry (they live in the bag: js/game/inventory.js). Each one has a name, a description for
 * the inventory, and draws its own little icon. Optional: stack (how many fit in one slot, default 1),
 * unique (you only ever get one), slot (an armour slot it can be worn in), def, color (its name colour),
 * tag (a little label under the name), heal (food: the HP it gives back), price (what a shop asks).
 *
 * Armour (js/data/armor.js) are items too: 'armor:<id>', or 'armor:<id>+<n>' once Holt's upgraded it,
 * worn in the piece's own slot (head / chest / legs / feet).
 *
 * FOOD (Fenwick's, in Normalton): eat it from the bag, or let it eat itself: when your HP gets low,
 * the game screen feeds you the best fit for the gap (js/game/game-screen.js, autoEat).
 */
(function (ERX) {
  'use strict';

  /**
   * Draw a pixel grid centred on (x, y): each character is a colour from pal ('.' is empty).
   * outline: a colour to ring the whole shape with (one pixel, all the way round).
   */
  function grid(ctx, rows, pal, x, y, s, outline) {
    s = s || 1;
    const ox = x - (rows[0].length / 2) * s, oy = y - (rows.length / 2) * s;
    const at = (r, q) => r >= 0 && r < rows.length && q >= 0 && q < rows[r].length && !!pal[rows[r][q]];
    const px = (r, q, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(ox + q * s), Math.round(oy + r * s), Math.ceil(s), Math.ceil(s)); };
    if (outline) for (let r = -1; r <= rows.length; r++) for (let q = -1; q <= rows[0].length; q++) if (!at(r, q) && (at(r - 1, q) || at(r + 1, q) || at(r, q - 1) || at(r, q + 1))) px(r, q, outline);
    for (let r = 0; r < rows.length; r++) for (let q = 0; q < rows[r].length; q++) { const col = pal[rows[r][q]]; if (col) px(r, q, col); }
  }

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

  // ---- FOOD: Fenwick's Goods (Normalton). heal: HP back (Infinity: all of it).
  const O = '#2a1a14';   // (the outline every food icon gets)
  const FOOD = [
    {
      id: 'apple', name: 'APPLE', heal: 15, price: 5, color: '#ffa898',
      desc: 'Crunchy, red, and almost certainly not poisoned. Heals 15 HP.',
      pal: { r: '#e8483a', h: '#ffb0a0', d: '#a82a22', s: '#6a4a2a', l: '#5cb844' },
      icon: ['...s.l.', '...sll.', '.rrsrr.', 'rhrrrrd', 'rhrrrrd', 'rrrrrrd', '.rrrrd.', '..rdd..'],
    },
    {
      id: 'bread', name: 'BREAD LOAF', heal: 30, price: 10, color: '#f4c890',
      desc: "Rosa's. Still warm. Do not ask her who eats the other hundred and ninety-nine. Heals 30 HP.",
      pal: { l: '#f0b868', s: '#a8682e', c: '#c8843a', d: '#8a5424' },
      icon: ['...llll...', '.llllllll.', 'llsllsllsl', 'cccccccccc', 'dccccccccd', '.dddddddd.'],
    },
    {
      id: 'cheese', name: 'CHEESE WEDGE', heal: 45, price: 16, color: '#ffe48a',
      desc: 'Holes included at no extra charge. Heals 45 HP.',
      pal: { t: '#ffe070', y: '#f0c040', h: '#c8901a', d: '#b07a18' },
      icon: ['.......tt', '.....tttt', '...tttttt', '.tttttttt', 'yyyyyyyyy', 'yhyyyyhyy', 'yyyhyyyyy', 'ddddddddd'],
    },
    {
      id: 'drumstick', name: 'DRUMSTICK', heal: 70, price: 24, color: '#f0a878',
      desc: "Roasted. Juicy. Absolutely not one of Clover's chickens. (Do not tell the chickens.) Heals 70 HP.",
      pal: { m: '#c8703a', h: '#e8a060', d: '#8a4422', b: '#f0ece0', B: '#c8c0b0' },
      icon: ['..mmmm..', '.mhhmmm.', 'mhmmmmmd', 'mmmmmmmd', 'mmmmmmdd', '.mmmmdd.', '..mddd..', '...bB...', '...bB...', '..bbBB..', '..b..B..'],
    },
    {
      id: 'pie', name: 'MEAT PIE', heal: 110, price: 38, color: '#f4c27a',
      desc: 'A whole pie. In a tin. For one. You deserve this. Heals 110 HP.',
      pal: { l: '#f4c27a', v: '#8a5424', p: '#d8964a', t: '#a8b0c0', T: '#6e7688' },
      icon: ['..llllll..', '.llvllvll.', 'llllllllll', 'pppppppppp', 'tttttttttt', '.TTTTTTTT.'],
    },
    {
      id: 'stew', name: "NANA PIP'S STEW", heal: Infinity, price: 60, color: '#ffb07a',
      desc: "A bowl of Nana Pip's famous stew. Nobody knows what is in it. Everybody feels better. Heals ALL your HP.",
      pal: { w: '#f4ecdc', s: '#a8642a', c: '#ff8a3a', g: '#5cb844', b: '#c84a3a', d: '#8a2a22' },
      icon: ['wwwwwwwwww', 'wscsgsscsw', '.bbbbbbbb.', '.bbbbbbbd.', '..bbbbdd..', '...dddd...'],
      steam: true,
    },
  ];
  for (const f of FOOD) {
    ITEMS[f.id] = {
      name: f.name, desc: f.desc, color: f.color, stack: 16, heal: f.heal, price: f.price, food: true,
      tag: 'FOOD  ' + (f.heal === Infinity ? 'FULL HEAL' : '+' + f.heal + ' HP'),
      draw(ctx, x, y, t, s) {
        s = s || 1;
        grid(ctx, f.icon, f.pal, x, y + (f.steam ? 2 * s : 0), s, O);
        if (f.steam) {
          // a curl of steam off the top
          const k = ((t || 0) * 1.4) % 1;
          ctx.globalAlpha = 0.6 * (1 - k);
          ctx.fillStyle = '#ffffff';
          for (const dx of [-2, 2]) ctx.fillRect(Math.round(x + (dx + Math.sin(k * 6 + dx)) * s), Math.round(y - (3 + k * 4) * s), Math.ceil(s), Math.ceil(s * 2));
          ctx.globalAlpha = 1;
        }
      },
    };
  }

  // ---- armour as items: a little helmet / chestplate / pair of leggings / pair of boots in the armour's colour
  const SHAPES = {
    head: ['..######..', '.#llcccd#.', '#lccccccd#', '#lccccccd#', '#ssssssss#', '#cd....cd#', '###....###'],
    chest: ['.##....##.', '#lc#..#cc#', '#lcc##ccd#', '#lccccccd#', '.#lcsscd#.', '.#lccccd#.', '.#lcsscd#.', '.#lccccd#.', '..######..'],
    legs: ['#########', '#lccsccd#', '#lcccccd#', '#lcd#lcd#', '#lcd#lcd#', '#lcd#lcd#', '#lcd#lcd#', '####.####'],
    feet: ['###...###...', '#l#...#l#...', '#c#...#c#...', '#cc####cc###', '#lccd##lccd#', '############'],
  };
  const armorItems = Object.create(null);
  function armorItem(key) {
    if (armorItems[key]) return armorItems[key];
    const P = ERX.Armor && ERX.Armor.parse(key);
    if (!P) return null;
    const a = P.a, up = P.up, slot = ERX.Armor.slotOf(a), def = a.def + up, C = ERX.Color;
    const cols = { '#': C.shade(a.color, -0.6), c: a.color, l: C.shade(a.color, 0.35), d: C.shade(a.color, -0.25), s: C.shade(a.color, -0.4) };
    const rows = SHAPES[slot];
    return (armorItems[key] = {
      id: 'armor:' + key, armor: a.id, up, name: a.name.toUpperCase() + (up ? ' +' + up : ''), desc: a.desc, slot, def,
      look: a.color, tier: a.tier || null,
      color: C.mix(a.color, '#ffffff', 0.35), tag: 'ARMOR  +' + def + ' DEF' + (up ? '  (UPGRADED)' : ''),
      draw(ctx, x, y, t, s) {
        s = s || 1;
        grid(ctx, rows, cols, x, y, s);
        // Holt's work: a gold rivet for every upgrade
        for (let i = 0; i < up; i++) { ctx.fillStyle = '#ffd34d'; ctx.fillRect(Math.round(x + (rows[0].length / 2 - 1 - i * 2) * s), Math.round(y + (rows.length / 2 - 1) * s), Math.ceil(s), Math.ceil(s)); }
        if (a.id === 'golden') { const k = Math.floor((t || 0) * 6) % 12; if (k < 7) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x + (k - 4) * s), Math.round(y + (k - 3) * s), Math.ceil(s), Math.ceil(s)); } }   // it gleams
      },
    });
  }

  ERX.Items = {
    list: ITEMS,
    food: FOOD.map((f) => f.id),
    grid,
    get(id) { return ITEMS[id] || (typeof id === 'string' && id.indexOf('armor:') === 0 ? armorItem(id.slice(6)) : null); },
    /** Carrying it (or wearing it). */
    has(c, id) { return ERX.Inventory ? ERX.Inventory.has(c, id) : !!(c && c.items && c.items.indexOf(id) !== -1); },
  };
})(window.ERX = window.ERX || {});
