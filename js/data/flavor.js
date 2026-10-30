/*
 * Flavour text: title-screen splash lines, main-menu jokes and the PLAY
 * placeholder messages. Edit freely — it's all just data.
 */
(function (ERX) {
  'use strict';

  ERX.Data = ERX.Data || {};

  /*
   * Splash lines under the logo. One is picked at random every time the menu
   * shows (and clicking it rerolls). Live tokens get filled in:
   *   {time} clock, {world} menu world, {song} current track, {year},
   *   {count} number of splash lines, {rand} a random 3-digit number.
   * Supported characters: the pixel font has A-Z a-z 0-9 and . , ! ? : ; ' " - + = _ / \ ( ) [ ] < > * # % & ~ ^ | @ $ ♥ ★
   */
  ERX.Data.splashes = [
    // --- the classics ---
    'Now with 0% gameplay!',
    'Your element is not up to you.',
    'Contains elements.',
    'Patch notes: added menu.',
    'Fire is not guaranteed.',
    '100% organic, free-range pixels.',
    'Probably not cursed.',
    'The tutorial is watching.',
    'Retribution sold separately.',
    'Now with a working PLAY button! (It says no.)',
    'Reroll? Never heard of it.',
    'Hand-placed pixels. Some of them.',
    'Ask your element about its feelings.',
    'X stands for X.',

    // --- breaking the fourth wall ---
    'Hi. Yes, you. The one reading this.',
    'You blinked. I saw that.',
    'Try clicking me. Go on.',
    'This text is yellow so you notice it. It worked.',
    'It is {time}. Shouldn\'t you be asleep?',
    'You are currently in: {world}. Enjoy your stay.',
    'Now playing: {song}. Bop responsibly.',
    'The logo is dancing because it is happy you are here.',
    'Please do not lick the screen.',
    'I am a splash text. This is my whole life.',
    'There are {count} of these. Collect them all!',
    'The developer is probably watching you play right now.',
    'Your mouse cursor looks nice today.',
    'Loading jokes... done!',
    'This message will self-destruct in 0 seconds.',
    'If you can read this, you can read.',
    'Press ALT+F4 for a free element! (Do not.)',
    'Achievement unlocked: Looked at the splash text.',
    'I was supposed to be a loading screen tip.',
    'Every time you reload, a new world is born. No pressure.',
    'The menu has better graphics than my real life.',
    'Look behind you. ...Just kidding. Unless?',
    'Do not trust the slime behind the PLAY button.',
    'This splash text has been approved by 0 out of 0 lawyers.',
    'You found the secret text! (It is not secret.)',
    'Are you reading these instead of playing? Same.',
    'These words are made of exactly 7 pixels of height.',
    'Thank you for not pressing ESC. Oh wait.',
    'If this text is on two lines, the developer talked too much.',
    'Stop clicking me, I am trying to work.',
    'The music is in your head now. Forever.',

    // --- useless fun facts ---
    'Fun fact: octopuses have three hearts.',
    'Fun fact: honey never spoils.',
    'Fun fact: a group of flamingos is called a flamboyance.',
    'Fun fact: bananas are berries. Strawberries are not.',
    'Fun fact: sloths can hold their breath longer than dolphins.',
    'Fun fact: wombat poop is cube-shaped.',
    'Fun fact: there are more stars than grains of sand. Probably.',
    'Fun fact: this fact is fun.',
    'Fun fact: 73% of statistics are made up on the spot.',
    'Fun fact: sharks existed before trees.',
    'Fun fact: a day on Venus is longer than its year.',
    'Fun fact: cows have best friends.',
    'Fun fact: the dot over an i is called a tittle.',
    'Fun fact: the slime is not actually angry. Just misunderstood.',
    'Fun fact: this menu has {count} splash texts. You saw one.',
    'Fun fact: every pixel in this game was drawn by math.',
    'Fun fact: the blacksmith has never finished a sword.',
    'Fun fact: no elements were harmed in the making of this menu.',
    'Fun fact: penguins propose with pebbles.',
    'Fun fact: hot water can freeze faster than cold water.',
    'Useless fact: you just read a useless fact.',
    'Fun fact: the sky whale is 4% whale.',
    'Fun fact: lightning is hotter than the sun\'s surface.',
    'Fun fact: water is wet. Allegedly.',
    'Fun fact: the person under the tree has been reading the same page for years.',

    // --- fake quotes ---
    '"I came, I saw, I pressed PLAY." - Julius Caesar, probably',
    '"Be patient >:(" - The PLAY button',
    '"To be or not to be fire." - Shakespeare, kind of',
    '"Wow." - Somebody, at some point',
    '"I didn\'t choose the element life. It chose me." - You, eventually',
    '"One does not simply choose their element." - A wise wizard',
    '"Bawk." - A chicken in the village',
    '"Clang." - The blacksmith, philosophically',
    '"Take this! (It is nothing. The inventory is not done.)" - An old man',
    '"The real element was the friends we made along the way."',
    '"Why is the logo moving?" - Everyone',
    '"I have no idea what I\'m doing." - The developer, {year}',
    '"Ten out of ten menu." - My mom',
    '"Have you tried turning it off and on again?" - IT Department',
    '"I will reveal myself... later." - Your element',
    '"I could do that in an afternoon." - Famous last words',
    '"Ahem." - The tutorial, clearing its throat',

    // --- random sentences ---
    'Somewhere, a sandwich is being made.',
    'The cheese has left the building.',
    'A goose is plotting something.',
    'Potatoes are just earth apples.',
    'Bees? In my RPG? It\'s more likely than you think.',
    'Smells like pixels in here.',
    'Today\'s lucky number: {rand}.',
    'Have you hydrated today? Drink some water.',
    'Spaghetti is just long pasta with confidence.',
    'This sentence is false.',
    'Gravity: still working.',
    'Turn left at the big tree. Then keep going. Forever.',
    'Socks disappear. Nobody knows where.',
    'The moon is just a really far away rock.',
    'Pineapple on pizza is a valid life choice.',
    'Don\'t forget to touch grass. (It sways in the Great Tree world.)',
    'Clouds weigh about a million pounds. Hold on tight.',
    'Toast always lands butter side down. Science.',
    'A wizard is never late. He just has lag.',
    'Somebody left the stove on. Not in this game, in real life.',
    'Ducks are just water chickens.',
    'Chairs are just frozen bowing.',
    'Wiggle your toes. Thank you.',
    'If you see a dragon, act natural.',
    'Free hugs! (Hugs not included.)',
    'Bread.',
    'Now 12% more funky!',
    'The bass player is a triangle wave.',
    'Certified bop.',
    'Groovy.',
    'Funky town population: you.',
    'Nod your head. Yeah, like that.',

    // --- about the element thing ---
    'Your element was decided by a random number. It was {rand}.',
    'Element: ??? (please wait)',
    'Spoiler: you have an element.',
    'Fire? Water? Toaster? Find out later!',
    'There is no "choose element" button. Stop looking.',
    'Your element is out there. Somewhere. Probably.',
    'Elements available: some. Elements choosable: none.',
    'What if your element is... cheese? (It is not.)',
    'Typing "fire" on the menu will not help. We tried.',
    'The tutorial knows your element. The tutorial is not telling.',
    'Your element can\'t be bribed.',
    'Retribution: incoming. Elemental: pending. X: present.',
    'How many elements are there? Yes.',
    'Your element is a surprise. Like a pop quiz, but sparkly.',

    // --- game-dev confessions ---
    'Bug free! (Citation needed.)',
    'Made with love and too much coffee.',
    'Version {rand}.0 coming never. Just kidding. Soon.',
    'Works on my machine!',
    'This feature was supposed to be a bug.',
    'Somewhere in the code, there is a comment that just says "why".',
    'Now with extra semicolons;',
    'Gameplay sold separately. And not yet made.',
    'Please wait while we invent the rest of the game.',
    'Roadmap: 1. Menu. 2. ??? 3. Retribution.',
    'Ctrl+S is the most powerful spell.',
    'Optimised for potatoes. Literally, try Low Detail Mode.',
    'Playtested by at least one person!',
    'The credits are mostly the same name. Respect.',
    '99 little bugs in the code... fix one... 127 little bugs.',
  ];

  ERX.Data.escapeJokes = [
    'This is the main menu. There is no further back.',
    'Still the main menu.',
    'You cannot escape the menu. Only PLAY can save you. (It cannot.)',
    'ESC pressed. Nothing happened. As designed.',
    'Okay, now you are just pressing ESC for fun.',
  ];

  // Typing any of these on the main menu gets you... a response. Not an element.
  ERX.Data.elementWords = (ERX.Elements ? ERX.Elements.words() : []).concat(['leaf', 'plant', 'thunder', 'air', 'dark']);
  ERX.Data.elementWordReplies = [
    'Nice try. Elements cannot be chosen. Not even by typing them.',
    'There is no secret "choose {w}" button. We checked.',
    'The game heard "{w}". The game is ignoring "{w}".',
    'Your element will be revealed later. Typing it now changes nothing.',
  ];

  ERX.Data.play = {
    headline: 'Not here yet, be patient >:(',
    // Shown under the headline; one per visit, the last one repeats.
    sublines: [
      'The actual RPG is still being forged. By hand. Slowly.',
      'You came back. Bold. Still not here.',
      'We checked again. Still not here.',
      'Pressing PLAY harder does not make it compile faster.',
      'At this point you deserve something. Here: ★',
      'That was the only star. Please go outside.',
      '...',
    ],
  };
})(window.ERX = window.ERX || {});
