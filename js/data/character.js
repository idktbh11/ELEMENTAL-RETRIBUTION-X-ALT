/*
 * Character-creation data: every customisation option, its display name,
 * and all the jokes the name screen makes. Edit freely.
 *
 * Note: there is deliberately NO element option. Elements are assigned at
 * random later in the game and can never be picked here.
 */
(function (ERX) {
  'use strict';

  ERX.Data = ERX.Data || {};

  ERX.Data.character = {
    MAX_CHARACTERS: 8,
    MAX_NAME: 16,

    genders: ['Male', 'Female'],

    skins: [
      { name: 'Porcelain', c: '#f6dcc4' },
      { name: 'Peach', c: '#f2c7a0' },
      { name: 'Honey', c: '#e0a77e' },
      { name: 'Tan', c: '#c98c62' },
      { name: 'Bronze', c: '#a86c48' },
      { name: 'Umber', c: '#8a5236' },
      { name: 'Cocoa', c: '#6a3e2a' },
      { name: 'Slime Green', c: '#8ac878' },
    ],

    hairStyles: ['Short', 'Spiky', 'Long', 'Ponytail', 'Bun', 'Mohawk', 'Shaggy', 'Afro', 'Bald'],

    hairColors: [
      { name: 'Midnight', c: '#2a2230' },
      { name: 'Chestnut', c: '#6a3a22' },
      { name: 'Caramel', c: '#a86a36' },
      { name: 'Golden', c: '#e8c050' },
      { name: 'Ginger', c: '#c8552a' },
      { name: 'Snow', c: '#ece8e4' },
      { name: 'Silver', c: '#a8a8b8' },
      { name: 'Sky', c: '#5aa0e8' },
      { name: 'Bubblegum', c: '#ff8ac8' },
      { name: 'Moss', c: '#5a9a4a' },
      { name: 'Grape', c: '#8a5ac8' },
      { name: 'Sea Foam', c: '#6ad8c0' },
    ],

    eyeColors: [
      { name: 'Brown', c: '#7a4a2a' },
      { name: 'Hazel', c: '#9a7a3a' },
      { name: 'Green', c: '#3e9a44' },
      { name: 'Blue', c: '#3a7ae0' },
      { name: 'Gray', c: '#7a8090' },
      { name: 'Amber', c: '#e0a020' },
      { name: 'Violet', c: '#9a5ae0' },
      { name: 'Ruby', c: '#d83a3a' },
      { name: 'Teal', c: '#2ab0b0' },
      { name: 'Pink', c: '#ff6ab0' },
    ],

    outfits: ['Tunic', 'Hoodie', 'Robe', 'Vest', 'Overalls', 'Dress', 'Adventurer'],

    outfitColors: [
      { name: 'Crimson', c: '#b83a3a' },
      { name: 'Royal', c: '#3a5ab8' },
      { name: 'Forest', c: '#3a8a4a' },
      { name: 'Plum', c: '#7a3a8a' },
      { name: 'Mustard', c: '#c89a2a' },
      { name: 'Teal', c: '#2a8a8a' },
      { name: 'Rose', c: '#c86a8a' },
      { name: 'Charcoal', c: '#4a4a5a' },
      { name: 'Tangerine', c: '#e0782a' },
      { name: 'Sky', c: '#5aa0d8' },
      { name: 'Cream', c: '#e0d4b0' },
      { name: 'Lime', c: '#8ac83a' },
    ],

    pantsColors: [
      { name: 'Navy', c: '#2e3a5a' },
      { name: 'Brown', c: '#5a3e2e' },
      { name: 'Charcoal', c: '#3a3a44' },
      { name: 'Olive', c: '#5a5a32' },
      { name: 'Khaki', c: '#a89060' },
      { name: 'Black', c: '#1e1c24' },
      { name: 'Burgundy', c: '#6a2a3a' },
      { name: 'Denim', c: '#4a6a9a' },
    ],

    // Shown when someone pokes the locked ELEMENT row in the creator.
    lockedElementJokes: [
      'Nope. Elements are not on the menu. Literally.',
      'LOCKED. The element is chosen by fate, and fate is busy.',
      'You can pick your hair colour. Not your destiny.',
      'Still locked. It will be locked tomorrow too.',
      'Clicking harder does not unlock it.',
      'The lock has been informed of your attempt.',
    ],

    // Name checks. Any name containing an element (see js/data/elements.js)
    // or one of these synonyms gets a reaction.
    elementWords: [
      'fire', 'flame', 'blaze', 'pyro', 'inferno', 'water', 'aqua', 'hydro', 'ocean', 'earth', 'terra', 'stone', 'rock',
      'air', 'wind', 'storm', 'lightning', 'thunder', 'electric', 'spark', 'ice', 'frost', 'snow', 'void', 'nature',
      'plant', 'leaf', 'light', 'dark', 'shadow', 'lava', 'magma', 'metal', 'poison', 'spirit', 'element',
      'magic', 'venom', 'toxic', 'iron', 'steel', 'galaxy', 'lunar', 'magnet', 'chrono', 'echo', 'fog', 'ghost', 'soul',
    ],
    // Real names that happen to contain an element word. These get a pass.
    allowedNames: ['sandra', 'sandy', 'cassandra', 'alexsandra', 'misty', 'sundae', 'sunny', 'starla', 'timothy', 'solaris', 'sanders', 'sanderson', 'deathridge'],
    elementReplies: {
      fire: 'Naming yourself FIRE will not make you fire. It will just make you awkward at parties.',
      flame: 'FLAME? That name is too hot. HR has been notified.',
      water: 'WATER? Bold. The Element Council has been informed and is drafting a strongly-worded letter.',
      aqua: 'AQUA is just WATER wearing sunglasses. We see you.',
      earth: 'EARTH is already taken. By the planet.',
      rock: 'ROCK? Your parents must be so proud of you, Rock.',
      air: 'AIR. Wow. Your name is literally nothing. We respect the commitment, but no.',
      wind: 'WIND? The wind does not have a name. It has vibes.',
      lightning: 'LIGHTNING never strikes twice. Neither will this name. Denied.',
      thunder: 'THUNDER? Sounds loud. Try something with an indoor voice.',
      ice: 'ICE ICE... no. Absolutely not.',
      void: 'VOID? The void stared back and said "no thanks".',
      light: 'LIGHT? Too bright. Our eyes. Try again.',
      dark: 'DARK? Edgy. Have you tried a name with fewer shadows?',
      shadow: 'SHADOW? Every edgy hero is named Shadow. Every. Single. One.',
      element: 'Naming yourself ELEMENT is the most suspicious thing anyone has ever done here.',
      darkness: 'DARKNESS? We turned the lights on just to say no.',
      arcane: 'ARCANE? Spell it backwards. It still says no.',
      poison: 'POISON? That name has a warning label. Denied.',
      blood: 'BLOOD? Yikes. The village children are scared now.',
      death: 'DEATH? Your mum is going to have a hard time calling you in for dinner.',
      metal: 'METAL? Very loud. Very shiny. Very rejected.',
      sand: 'SAND? It is coarse and rough and it gets everywhere. Including name fields, apparently.',
      magma: 'MAGMA? Too spicy for a name tag.',
      storm: 'STORM? Ooh, dramatic. Still no.',
      cosmic: 'COSMIC? The universe has reviewed your request and declined.',
      psychic: 'PSYCHIC? Then you already knew this would be rejected.',
      crystal: 'CRYSTAL? Shiny name. Suspiciously elemental. No.',
      moon: 'MOON? The moon called. It wants its name back.',
      solar: 'SOLAR? Too bright. We need sunglasses just to read it.',
      magnetism: 'MAGNETISM? Your name is very attractive. To the reject button.',
      time: 'TIME? It is time to pick a different name.',
      gravity: 'GRAVITY? That name has been pulled back down. Try again.',
      sound: 'SOUND? We heard you. The answer is no.',
      mist: 'MIST? You missed. Get it? Missed? ...Pick another name.',
      spirit: 'SPIRIT? Spooky. The ghosts said no, politely.',
      chaos: 'CHAOS? Absolutely not. We have enough of that already.',
      nature: 'NATURE? Touch grass instead of typing it.',
    },
    genericElementReplies: [
      'Nice try. You cannot sneak an element in through your name.',
      'That name sounds suspiciously elemental. The game is squinting at you.',
      'The tutorial saw that. The tutorial is disappointed.',
      'Names are not a loophole. We checked. We closed it.',
    ],
    // Escalation: on the third attempt the game gives up... in its own way.
    insistReplies: [
      null,
      'Again? Really? The game is watching you very closely now.',
      'Fine. FINE. You can have it. With a small adjustment.',
    ],
    insistPrefix: 'Definitely Not ',

    // Special names that are allowed, but noticed.
    specialNames: {
      player: 'PLAYER. Wow. Truly the name of legends.',
      hero: 'HERO? Confident. We like it.',
      slime: 'The slime approves. The slime never approves of anything.',
      developer: 'There can only be one [Developer]. ...Okay, fine, two.',
      dev: 'A fellow dev! Please do not look at the source code.',
      steve: 'Hi Steve. You look like you build things.',
      bob: 'Bob. A classic. A legend. A Bob.',
      admin: 'ADMIN privileges: none. Nice try though.',
      asdf: 'Keyboard smash detected. Very creative.',
      qwerty: 'Named after a keyboard. Bold.',
      chosenone: 'There is no chosen one. Only random ones.',
      nobody: 'Hello, Nobody. You look like somebody.',
    },
    emptyName: 'Every hero needs a name. Even you.',

    // Random name generator parts.
    namePrefixes: ['Sir', 'Lady', 'Captain', 'Professor', 'Tiny', 'Big', 'Lord', 'Dame', 'Grandpa', 'Baron', 'Agent', 'Doctor', 'Auntie', 'Lil'],
    nameCores: ['Bob', 'Pebble', 'Noodle', 'Biscuit', 'Waffles', 'Gerald', 'Pickles', 'Muffin', 'Doug', 'Toast', 'Beans', 'Nugget', 'Gary', 'Spud', 'Crumpet', 'Fern', 'Mabel', 'Turnip', 'Pip', 'Tofu'],
    nameSuffixes: ['', '', '', ' Jr.', ' III', ' the Bold', ' the Mild', ' of Nowhere', ' the Damp'],
  };
})(window.ERX = window.ERX || {});
