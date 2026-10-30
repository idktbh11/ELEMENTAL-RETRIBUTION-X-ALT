/*
 * HELP screen text. The game is talking to the player here.
 * Colour markup: {gold}word{/}, {red}, {blue}, {green}, {purple}, {cyan}, {gray}.
 */
(function (ERX) {
  'use strict';

  ERX.Data = ERX.Data || {};

  ERX.Data.help = [
    {
      title: 'WELCOME, TRAVELER',
      body: [
        'Welcome to {gold}ELEMENTAL RETRIBUTION X{/}. You opened the Help menu, which means you either need help, or you click on everything. Both are valid life choices.',
      ],
    },
    {
      title: 'HOW THIS GAME WORKS',
      body: [
        'ELEMENTAL RETRIBUTION X is a retro RPG where everything revolves around one thing: {gold}your element{/}.',
        'Your element will shape your abilities, how you fight, where you can go, which enemies show up, who talks to you, and who absolutely refuses to.',
      ],
    },
    {
      title: 'YOU DO NOT CHOOSE YOUR ELEMENT',
      body: [
        'Your element is assigned {red}completely at random{/}.',
        'You do not choose it. Not at the start. Not in Settings. Not by whispering "fire" at your monitor.',
        'Yes, this is {gold}intentional{/}.',
        'No, there is not a secret "choose fire" button. We checked. Twice.',
        'No, rerolling is not a thing. We have never heard of rerolling.',
      ],
    },
    {
      title: 'WHEN DO I FIND OUT?',
      body: [
        'Your element stays hidden until you make it through the {cyan}tutorial{/}. Think of it as a surprise. A mandatory, non-refundable surprise.',
        'Until then, nobody knows what it is. Not you. Not the villagers. Possibly not even us.',
      ],
    },
    {
      title: 'COMBAT (EVENTUALLY)',
      body: [
        'Combat will depend heavily on your element. Some elements hit hard. Some hit fast. Some hit... {purple}differently{/}.',
        'Combat is not in this build yet. The enemies are still stretching.',
      ],
    },
    {
      title: 'THE TUTORIAL',
      body: [
        'The tutorial will explain everything properly, with words, arrows, and at least one sign that says DON\'T.',
        'It is also not in this build. Please press PLAY for our official position on this matter.',
      ],
    },
    {
      title: 'CONTROLS',
      body: [
        '{gold}MENUS:{/} Arrow keys or WASD to move. ENTER or SPACE to confirm. ESC or BACKSPACE to go back. Mouse and gamepads work too.',
        '{gold}SETTINGS TABS:{/} Q / E, TAB, or LB / RB.',
        '{gold}FULLSCREEN:{/} ALT + ENTER, or Settings > Video.',
        '{gold}ELEMENT ABILITIES:{/} once you have an element, J attacks with it, Q / R / C / X / Z cast your five skills and V unleashes your Ultimate (fill the meter by fighting). Learn + upgrade them in the skill tree (T). Upgrading your M1 or your dash turns it into a whole new move.',
        '{gold}INVENTORY:{/} I or TAB. Click to pick things up and put them down, right-click to split a stack, SHIFT-click to move things between the bag and the hotbar (or to wear armour), 1-9 to swap with the hotbar. Armour goes in the CHEST slot. It does not go on your head. We checked.',
        '{gold}AWAKENING:{/} rumour has it every element can AWAKEN into something far more dangerous. Nobody knows how. Not even the Voice. Especially not the Voice.',
        '{gold}BLOCKING:{/} hold K. Your guard wears down with every hit you block and breaks after a few. Let go to recover.',
        '{gold}PHONES + TABLETS:{/} Hold it sideways. Tap to use menus. In game: arrows on the left, JUMP / HIT / DASH / BLOCK / USE on the right, pause + bag + skills at the top.',
        'Gameplay keys can be remapped in {cyan}Settings > Controls{/}. You can bind Jump to anything you like. Except ESC. ESC has a job.',
      ],
    },
    {
      title: 'FREQUENTLY ASKED QUESTIONS',
      body: [
        '{gold}Q:{/} Can I pick my element if I ask nicely?\n{blue}A:{/} No.',
        '{gold}Q:{/} What if I ask really, really nicely?\n{blue}A:{/} Still no. But we appreciate the manners.',
        '{gold}Q:{/} How many elements are there?\n{blue}A:{/} A lot. Which ones? That\'s a surprise. You\'ll find out what YOU got eventually.',
        '{gold}Q:{/} Does my element change the world?\n{blue}A:{/} Yes. The world will shift a little depending on what you get. Different weather, different vibes, different people being weird at you.',
        '{gold}Q:{/} Why does the menu look different every time?\n{blue}A:{/} Every launch drops you into a random world. Reload the game to see where you end up next.',
        '{gold}Q:{/} The game is slow on my computer.\n{blue}A:{/} Turn on {green}Low Detail Mode{/} in Settings > Video. It removes particles, fog and other shiny things.',
        '{gold}Q:{/} Why is the PLAY button like that?\n{blue}A:{/} Be patient >:(',
      ],
    },
    {
      title: 'FINAL ADVICE',
      body: [
        'Embrace the chaos. Your element will be decided by forces far beyond your control. (A random number generator.)',
        'Good luck out there. You will need it. Probably.',
      ],
    },
  ];
})(window.ERX = window.ERX || {});
