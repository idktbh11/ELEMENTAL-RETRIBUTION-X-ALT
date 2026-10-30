/*
 * THE ELEMENT REGISTRY — every element in ELEMENTAL RETRIBUTION X.
 *
 * Rules (do not break these):
 *   - The player NEVER chooses an element. It is assigned at random (weighted
 *     by rarity — see RARITIES below; Chaos is the one and only MYTHIC).
 *   - It stays hidden until the player gets through the tutorial.
 *   - Nothing in menus or settings may let the player pick one.
 *
 * Each entry:
 *   id        stable key used in code and save files (never rename these)
 *   name      display name
 *   color     main UI colour, dark = shadow colour (pixel-art friendly)
 *   desc      one-line flavour description (shown when the element is revealed)
 *   world     hints for how the world shifts for this element. Future systems
 *             (world gen, weather, NPCs, enemies) read these:
 *               tint      colour the world is subtly tinted toward
 *               particles ambient particle type floating around the player
 *               weather   preferred weather
 *               mood      one-word vibe for NPC reactions / music variants
 *
 * To add an element: append an entry. That's it. Everything reads from here.
 */
(function (ERX) {
  'use strict';

  const LIST = [
    { id: 'fire', name: 'Fire', color: '#ff5a36', dark: '#a8261a', desc: 'Burns bright, burns hot, burns your eyebrows off.', world: { tint: '#ff8a4a', particles: 'embers', weather: 'heatwave', mood: 'fierce' } },
    { id: 'water', name: 'Water', color: '#3aa0ff', dark: '#1a4aa8', desc: 'Flows around problems. Occasionally drowns them.', world: { tint: '#4ab0ff', particles: 'droplets', weather: 'rain', mood: 'calm' } },
    { id: 'wind', name: 'Wind', color: '#9ae8ff', dark: '#3a8ab0', desc: 'Fast, free, and impossible to hold onto.', world: { tint: '#c8f4ff', particles: 'gusts', weather: 'windy', mood: 'restless' } },
    { id: 'earth', name: 'Earth', color: '#b8864a', dark: '#5a3e22', desc: 'Solid. Dependable. Extremely hard to move.', world: { tint: '#c8a070', particles: 'pebbles', weather: 'clear', mood: 'stubborn' } },
    { id: 'lightning', name: 'Lightning', color: '#ffd23a', dark: '#a87a10', desc: 'Strikes first, asks questions never.', world: { tint: '#fff08a', particles: 'sparks', weather: 'thunderstorm', mood: 'hyper' } },
    { id: 'ice', name: 'Ice', color: '#a8e8ff', dark: '#4a8ac8', desc: 'Cool under pressure. Cold under everything else.', world: { tint: '#d8f4ff', particles: 'snowflakes', weather: 'snow', mood: 'chill' } },
    { id: 'nature', name: 'Nature', color: '#5fd84a', dark: '#2a7a2a', desc: 'Plants listen to you. Weeds especially.', world: { tint: '#8ae06a', particles: 'leaves', weather: 'spring', mood: 'gentle' } },
    { id: 'darkness', name: 'Darkness', color: '#5a4a8a', dark: '#1e1630', desc: 'The lights go out when you walk in. Every time.', world: { tint: '#3a3060', particles: 'gloom', weather: 'overcast', mood: 'brooding' } },
    { id: 'shadow', name: 'Shadow', color: '#6a6a8a', dark: '#22222e', desc: 'Sneaky. Silent. Probably standing behind you right now.', world: { tint: '#50506a', particles: 'wisps', weather: 'dusk', mood: 'sneaky' } },
    { id: 'light', name: 'Light', color: '#fff4c8', dark: '#c8a84a', desc: 'Radiant, hopeful, and a little too bright at 3 AM.', world: { tint: '#fff8e0', particles: 'motes', weather: 'sunny', mood: 'hopeful' } },
    { id: 'arcane', name: 'Arcane', color: '#c86aff', dark: '#5a2a8a', desc: 'Raw magic. Nobody fully understands it, including you.', world: { tint: '#d8a0ff', particles: 'runes', weather: 'aurora', mood: 'curious' } },
    { id: 'poison', name: 'Poison', color: '#9ad83a', dark: '#4a6a1a', desc: 'Slow, sneaky, and absolutely not safe to lick.', world: { tint: '#b0e060', particles: 'bubbles', weather: 'smog', mood: 'toxic' } },
    { id: 'blood', name: 'Blood', color: '#c8283a', dark: '#5a0e18', desc: 'Powerful, costly, and deeply unsettling at dinner parties.', world: { tint: '#c84a5a', particles: 'drips', weather: 'red moon', mood: 'intense' } },
    { id: 'death', name: 'Death', color: '#8a8aa0', dark: '#1a1a24', desc: 'Everything ends. You just help it along a little.', world: { tint: '#7a7a8a', particles: 'ashes', weather: 'grey', mood: 'grim' } },
    { id: 'metal', name: 'Metal', color: '#b8c0d0', dark: '#4a5060', desc: 'Hard, shiny, and fantastic at being a door.', world: { tint: '#c8d0e0', particles: 'filings', weather: 'clear', mood: 'unyielding' } },
    { id: 'sand', name: 'Sand', color: '#e8c87a', dark: '#a0803a', desc: 'Coarse, rough, and gets absolutely everywhere.', world: { tint: '#f0d898', particles: 'dust', weather: 'sandstorm', mood: 'dry' } },
    { id: 'magma', name: 'Magma', color: '#ff7a1a', dark: '#7a1a0a', desc: 'Fire and Earth had a very angry child.', world: { tint: '#ff9a4a', particles: 'cinders', weather: 'ashfall', mood: 'volatile' } },
    { id: 'storm', name: 'Storm', color: '#6a8ac8', dark: '#2a3a6a', desc: 'Wind, rain and lightning walk into a bar. The bar is gone.', world: { tint: '#7a90c0', particles: 'rain streaks', weather: 'storm', mood: 'wild' } },
    { id: 'cosmic', name: 'Cosmic', color: '#6a5aff', dark: '#1a1050', desc: 'The universe is huge. You are borrowing a bit of it.', world: { tint: '#7a6aff', particles: 'stardust', weather: 'starry', mood: 'vast' } },
    { id: 'void', name: 'Void', color: '#a85cff', dark: '#120820', desc: 'Pure nothing. Somehow, it is staring back.', world: { tint: '#5a3a8a', particles: 'void specks', weather: 'still', mood: 'empty' } },
    { id: 'psychic', name: 'Psychic', color: '#ff7ad8', dark: '#8a2a7a', desc: 'You knew you would get this one. Didn\'t you.', world: { tint: '#ffa0e0', particles: 'ripples', weather: 'hazy', mood: 'knowing' } },
    { id: 'crystal', name: 'Crystal', color: '#7af0e0', dark: '#2a8a9a', desc: 'Beautiful, sharp, and refracts your problems.', world: { tint: '#a0fff0', particles: 'glints', weather: 'clear', mood: 'sparkly' } },
    { id: 'moon', name: 'Moon', color: '#d8dcff', dark: '#5a5e9a', desc: 'Strongest at night. Sleepiest at noon.', world: { tint: '#c8ccff', particles: 'moonbeams', weather: 'night', mood: 'dreamy' } },
    { id: 'solar', name: 'Solar', color: '#ffb83a', dark: '#c8601a', desc: 'A tiny sun, personally. Bring sunscreen.', world: { tint: '#ffd070', particles: 'sunflares', weather: 'blazing sun', mood: 'radiant' } },
    { id: 'magnetism', name: 'Magnetism', color: '#ff4a6a', dark: '#3a4aa8', desc: 'Attractive. Repulsive. Both, depending on the side.', world: { tint: '#e07090', particles: 'field lines', weather: 'clear', mood: 'pulling' } },
    { id: 'time', name: 'Time', color: '#e8d08a', dark: '#7a6a3a', desc: 'You are always early. Or late. Or both at once.', world: { tint: '#f0e0a8', particles: 'clock dust', weather: 'frozen moment', mood: 'patient' } },
    { id: 'gravity', name: 'Gravity', color: '#7a6aa8', dark: '#2a2240', desc: 'What goes up comes down. You decide when.', world: { tint: '#8a7ab0', particles: 'floating rocks', weather: 'heavy air', mood: 'grounded' } },
    { id: 'sound', name: 'Sound', color: '#5ae8a8', dark: '#1a7a5a', desc: 'Loud. Very loud. The neighbours have complained.', world: { tint: '#80f0c0', particles: 'notes', weather: 'echoing', mood: 'loud' } },
    { id: 'mist', name: 'Mist', color: '#c8d4e0', dark: '#6a7a8a', desc: 'Now you see it. Now you mostly don\'t.', world: { tint: '#dce4ec', particles: 'fog', weather: 'foggy', mood: 'mysterious' } },
    { id: 'spirit', name: 'Spirit', color: '#a8fff0', dark: '#3a9a9a', desc: 'You can see things others can\'t. Some of them wave.', world: { tint: '#c0fff4', particles: 'souls', weather: 'ethereal', mood: 'haunting' } },
    { id: 'chaos', name: 'Chaos', color: '#ff3aa0', dark: '#4a0a3a', desc: 'Rules? Never heard of them. Neither has your element.', world: { tint: '#ff70c0', particles: 'everything', weather: 'random', mood: 'unhinged', intensity: 2 } },
  ];

  // ------------------------------------------------------------ RARITY
  // Rarer tiers get rolled less often. Per-element weight; the tier's share
  // of the roll is weight x members (≈ common 51%, uncommon 27%, rare 13.5%,
  // epic 5.8%, legendary 2%, mythic 0.16% — about 1 in 620).
  const RARITIES = [
    { id: 'common', name: 'Common', color: '#c8ccd8', dark: '#5a5e6a', weight: 10 },
    { id: 'uncommon', name: 'Uncommon', color: '#5fd84a', dark: '#1e5a1a', weight: 6 },
    { id: 'rare', name: 'Rare', color: '#3aa0ff', dark: '#14306a', weight: 3.5 },
    { id: 'epic', name: 'Epic', color: '#c86aff', dark: '#4a1a7a', weight: 1.8 },
    { id: 'legendary', name: 'Legendary', color: '#ffc83a', dark: '#7a4a0a', weight: 0.8 },
    { id: 'mythic', name: 'MYTHIC', color: '#ff3aa0', dark: '#4a0a3a', weight: 0.25 },
  ];
  const TIER_OF = {
    common: 'fire water wind earth lightning ice nature sand',
    uncommon: 'poison metal mist sound magnetism light shadow',
    rare: 'storm magma crystal darkness blood moon',
    epic: 'psychic arcane solar gravity spirit',
    legendary: 'death cosmic time void',
    mythic: 'chaos',
  };
  const rarityById = Object.create(null);
  RARITIES.forEach((r, i) => { r.tier = i; rarityById[r.id] = r; });
  for (const [tier, ids] of Object.entries(TIER_OF)) for (const id of ids.split(' ')) {
    const e = LIST.find((x) => x.id === id);
    if (e) e.rarity = tier;
  }
  for (const e of LIST) if (!e.rarity) e.rarity = 'common';   // new elements default to common

  // Title art cut from the element sheet (tools/cut-element-sheet.js).
  // Elements without art fall back to a generated pixel-font title.
  const NO_ART = { darkness: true };
  for (const e of LIST) e.art = NO_ART[e.id] ? null : 'assets/images/elements/' + e.id + '.png';

  // {elfire}text{/} etc. colour markup for element names
  if (ERX.Font && ERX.Font.COLORS) {
    for (const e of LIST) ERX.Font.COLORS['el' + e.id] = e.color;
    for (const r of RARITIES) ERX.Font.COLORS['rar' + r.id] = r.color;   // {rarepic}...{/}
  }

  const byId = Object.create(null);
  for (const e of LIST) byId[e.id] = e;

  ERX.Elements = {
    list: LIST,
    get count() { return LIST.length; },

    get(id) {
      return byId[id] || null;
    },

    rarities: RARITIES,
    /** The rarity tier object for an element (or element id). */
    rarityOf(e) {
      if (typeof e === 'string') e = byId[e];
      return e ? rarityById[e.rarity] : null;
    },

    /**
     * Pick an element at random, weighted by rarity. Only the reveal in the
     * sealed chamber calls this — the player can never influence it.
     */
    random(rng) {
      let r = (rng ? rng.next() : Math.random()) * this.totalWeight;
      for (const e of LIST) { r -= rarityById[e.rarity].weight; if (r < 0) return e; }
      return LIST[LIST.length - 1];
    },
    get totalWeight() { return LIST.reduce((s, e) => s + rarityById[e.rarity].weight, 0); },
    /** Chance (0..1) of rolling this element. */
    chance(e) { return rarityById[e.rarity].weight / this.totalWeight; },

    /** Lower-case names, for spotting players trying to sneak an element into text. */
    words() {
      return LIST.map((e) => e.id);
    },
  };
})(window.ERX = window.ERX || {});
