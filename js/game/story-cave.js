/*
 * STORY: THE CAVE — arena intro, the Voice, the tutorial, the gates.
 *
 * Scripts are generator functions run by ERX.GameEngine.Script:
 *   yield 1.5;                         wait 1.5 seconds
 *   yield* v(g, 'text');               the Voice says something (waits for the player)
 *   const i = yield* choose(g, [...]); player picks a dialogue option
 *   yield* task(g, label, fn, goal);   gameplay objective; waits until fn() >= goal
 * {actionId} in text becomes the player's key, e.g. {jump} -> [SPACE].
 */
(function (ERX) {
  'use strict';

  const sfx = (n, o) => ERX.Audio.playSfx(n, o);

  const VOICE = { name: '???', color: '#c89aff', plate: '#3a2050', voice: 'voice', effect: 'wave', speed: 36 };
  const SIGN = { name: 'SIGN', color: '#e8c87a', plate: '#5a3e22', voice: null, speed: 80 };

  // ------------------------------------------------------------ helpers
  function* say(g, speaker, text, o) {
    g.lockControls(true);
    g.dialogue.say(speaker, text, o || {});
    return yield () => g.dialogue.result;
  }
  const v = (g, text, o) => say(g, VOICE, text, o);
  /** The Voice starts a line... and stops himself before it's finished. */
  function* cutOff(g, text) {
    g.lockControls(true);
    g.dialogue.say(VOICE, text, {});
    yield () => (g.dialogue.typing ? undefined : true);
    yield 0.25;
    g.dialogue.close();
  }
  const angry = (g, text) => say(g, VOICE, text, { effect: 'shake' });
  function* me(g, text) { return yield* say(g, g.playerSpeaker, text, { speed: 60 }); }
  function* choose(g, labels) {
    g.lockControls(true);
    g.dialogue.choose(labels);
    return yield () => g.dialogue.result;
  }
  function* task(g, label, progress, goal) {
    g.setObjective(label, progress, goal);
    g.lockControls(false);
    yield () => (progress() >= goal ? true : undefined);
    g.completeObjective();
    yield 0.8;
  }

  // ======================================================== ARENA INTRO
  function* arenaIntro(g) {
    const A = g.level.arena;
    g.lockControls(true);
    g.player.vx = 0;
    // the gates slam shut behind you
    g.gates.left.close();
    g.gates.right.close();
    g.music(null);
    yield 1.4;
    // ...then the lights come on. All at once.
    g.lightArena();
    yield 1.4;
    g.focusCamera(A.centerX, A.floorY - 70);
    yield 1.0;
    // something BIG is coming
    g.music('boss');
    g.warning = true;
    g.rumble(4.2);
    yield 4.4;
    // ...
    g.music(null);
    g.warning = false;
    sfx('recordScratch');
    yield 0.7;
    g.spawnDummy();
    yield 0.25;
    sfx('partyHorn');
    yield 0.9;
    g.bossBar = { name: 'THE METAL DUMMY', sub: 'Destroyer of Absolutely Nothing' };
    yield 2.2;

    // ---------------------------------------------------- THE VOICE
    g.music('voice');
    yield 0.6;
    yield* v(g, '...');
    yield* v(g, 'Uh.');
    if (ERX.Achievements.has('tutorial')) { yield* recognised(g); return; }
    yield* v(g, 'Hold on. Who are YOU?');
    yield* v(g, 'How did you even get in here?');
    g.releaseCamera();

    const c = yield* choose(g, ["I don't know.", 'I think you brought me here.', 'Where is your voice even coming from?']);
    if (c === 0) {
      yield* me(g, "I don't know.");
      yield* v(g, "...You don't know.");
      yield* v(g, '*shrug*');
      yield* v(g, 'Okay. Then some extraterrestrial force must have dropped you here.');
      yield* v(g, 'Happens all the time. Probably. Moving on.');
    } else if (c === 1) {
      yield* me(g, 'I think you brought me here.');
      g.shake(3, 0.3);
      yield* angry(g, 'ME?!');
      yield* angry(g, 'Are you STUPID? Why would I bring YOU to a CAVE?!');
      yield* v(g, 'I have WAY better things to do. Like... stuff. Important stuff.');
      yield* choose(g, ['Who else would have brought me here?']);
      yield* me(g, 'Who else would have brought me here?');
      yield* v(g, '...');
      yield* v(g, "I don't know.");
      yield* v(g, "NOT me. That's who.");
    } else {
      yield* me(g, 'Where is your voice even coming from?');
      yield* v(g, "Oh, that's easy. I can see you through telepathy and telekinesis.");
      const r = yield* v(g,
        'See, telekinesis lets me project my consciousness across vast distances, so my thoughts travel through the rocks as tiny invisible waves, which bounce off your eardrums and into your...',
        { interrupt: { label: "That's not how telekinesis works though.", alt: '(Let them finish.)', at: 0.3 } });
      if (r === 'interrupt') {
        yield* me(g, "That's not how telekinesis works though.");
        yield* v(g, '...');
        g.shake(4, 0.35);
        yield* angry(g, 'EXCUSE ME?!');
        yield* angry(g, "What would YOU know?! You're NORMAL!");
        yield* angry(g, "You don't even know what your own element is!");
        yield* v(g, 'Hmph.');
      } else {
        yield* v(g, '...brain. Where they turn into words. Words like these. Which is how you are hearing me.');
        yield* v(g, 'Riveting stuff. You are welcome.');
      }
    }

    // every path ends here
    sfx('sigh');
    yield* v(g, '*sigh*', { effect: null, speed: 10 });
    yield* v(g, "Okay. Look. Whatever. You're here now.");
    yield* v(g, "And I refuse to watch you embarrass yourself, so I'm going to teach you the basics.");
    yield* v(g, 'Pay attention. I am only explaining this once. (I will explain it as many times as you need.)');
    g.bossBar = null;
    yield* tutorial(g);
  }

  // ============================== SOMEONE WHO ALREADY BEAT THE TUTORIAL
  function* recognised(g) {
    yield* cutOff(g, 'Hold on. Who are you, and how did you even get in h-');
    g.shake(1, 0.2);
    yield 0.4;
    yield* v(g, '...wait.');
    yield* v(g, 'Have I seen you before?');
    yield* v(g, "You look familiar. Weirdly familiar. Like... I've-already-explained-jumping-to-you familiar.");
    g.releaseCamera();
    const c = yield* choose(g, ['Go through the tutorial again.', 'Skip it. Take me to the elevator.']);
    if (c === 0) {
      yield* me(g, 'Go through the tutorial again.');
      yield* v(g, 'Again?! Wow. Okay. A classic. From the top, then.');
      g.bossBar = null;
      yield* tutorial(g);
      return;
    }
    yield* me(g, 'Skip it. Take me to the elevator.');
    yield* v(g, 'Say no more. One express trip to the elevator, coming right up.');
    yield* v(g, "Here. Your skill point. Don't say I never gave you anything.");
    g.givePoints(1);
    yield* v(g, '*finger snap*', { effect: null, speed: 20 });
    g.bossBar = null;
    g.skipToElevator();
  }

  // ============================================================ TUTORIAL
  function* tutorial(g) {
    const p = g.player;
    const s = p.stats;
    g.music('voice');

    // --- moving ---
    yield* v(g, 'First: walking. Revolutionary, I know.');
    yield* v(g, 'Use {moveLeft} and {moveRight} to walk around.');
    const l0 = s.movedLeft, r0 = s.movedRight;
    yield* task(g, 'WALK LEFT AND RIGHT', () => (Math.min(s.movedLeft - l0, 48) + Math.min(s.movedRight - r0, 48)) / 96, 1);

    // --- jumping ---
    yield* v(g, 'Great. You can walk. Your parents would be so proud.');
    yield* v(g, 'Now press {jump} to jump. Hold it longer to jump higher.');
    const j0 = s.jumps;
    yield* task(g, 'JUMP 3 TIMES', () => s.jumps - j0, 3);
    yield* v(g, 'See those platforms? You can jump up THROUGH them. They are one-way. Like this conversation.');
    s.platform = false;
    yield* task(g, 'STAND ON A PLATFORM', () => (s.platform ? 1 : 0), 1);

    // --- dashing ---
    yield* v(g, 'Next: {dash} makes you dash. Fast. Great for dodging. Or for looking cool.');
    const d0 = s.dashes;
    yield* task(g, 'DASH 2 TIMES', () => s.dashes - d0, 2);

    // --- attacking ---
    yield* v(g, "You don't have a weapon. So use your fists. Like a caveman.");
    yield* v(g, 'Which, technically, you are. You live in a cave now.');
    yield* v(g, 'Walk up to the dummy and press {attack} to hit it. Every third hit is stronger.');
    const h0 = g.dummy.hits;
    yield* task(g, 'HIT THE DUMMY', () => g.dummy.hits - h0, 6);
    yield* v(g, 'Wow. You beat up a defenseless metal man. Truly heroic.');

    // --- blocking ---
    yield* v(g, "Now the dummy fights back. Don't worry, it is only throwing bolts. Probably.");
    yield* v(g, 'Hold {block} while FACING the bolts to block them.');
    g.dummy.shooting = true;
    g.boltHitQuips = ['You were supposed to BLOCK that.', 'Face the bolts. FACE them.', 'Hold {block}. HOLD it.', 'The dummy is winning. The DUMMY.'];
    const b0 = s.blocks;
    yield* task(g, 'BLOCK 3 BOLTS', () => s.blocks - b0, 3);
    g.dummy.shooting = false;
    g.clearBolts();
    yield* v(g, 'See? Blocking. Saves lives. Mostly yours.');

    // --- skill tree ---
    yield* v(g, 'Next: your skill tree. As you get stronger, you earn skill points.');
    yield* v(g, "Here. Have one. Don't spend it all in one place.");
    g.givePoints(1);
    yield* v(g, 'Press {skills} to open your skill tree, then spend it on something.');
    yield* task(g, 'OPEN THE SKILL TREE ({skills}) AND SPEND A POINT', () => (g.character.skillPoints === 0 ? 1 : 0), 1);
    yield* v(g, 'Nice. That big empty bit in the middle is for your ELEMENT skills.');
    yield* v(g, "You don't know your element yet. Neither do I. It will reveal itself when it's ready.");
    yield* v(g, 'Elements are dramatic like that.');

    // --- the rest ---
    yield* v(g, 'Oh, and {inventory} opens your inventory. It is empty. You woke up in a cave. What did you expect?');
    yield* v(g, '{use} lets you interact with things. Like signs. Which you have DEFINITELY been reading.');
    yield* v(g, 'The red bar is your health. The blue one is mana. You will need mana later. For element stuff. Later.');

    // --- the gates ---
    yield* v(g, "Alright. That's the basics. I'm going to open the gates.");
    yield* v(g, 'Then you are going to go fight some ACTUAL enemies. Test out your new-found knowledge. For real this time.');
    const c = yield* choose(g, ['Bet.', 'What if I die?']);
    if (c === 0) {
      yield* me(g, 'Bet.');
      yield* v(g, '...Bet? Okay. Cool. Love the enthusiasm.');
    } else {
      yield* me(g, 'What if I die?');
      yield* v(g, "Die? Oh, you can't die.");
      yield* v(g, "You're linked to something called the IMMORTALITY STONE. If you fall in battle, it revives you.");
      yield* v(g, 'Also, and I cannot stress this enough...');
      g.shake(2, 0.25);
      yield* v(g, "You're in a VIDEO GAME.", { effect: 'shake' });
      yield* v(g, "You can't die forever unless the game has lives, or it's a permadeath game. And this is NOT one of those.");
      yield* v(g, '...');
      yield* v(g, "I probably wasn't supposed to say that out loud.");
      yield* v(g, 'Forget I said anything.');
    }
    g.openGates();
    yield 1.6;
    yield* v(g, 'There. Gates are open.');
    yield* v(g, 'Now go. Kill some enemies. Shoo.');
    g.music('onward');
    g.saveProgress('tutorialDone');
    ERX.Achievements.unlock('tutorial');
    g.allowDeath = true;
    g.lockControls(false);
    g.setObjective('GO FIGHT SOME ENEMIES  →', null, 1);
  }

  // =================================================== RETURNING PLAYERS
  function* returning(g) {
    yield 0.8;
    yield* v(g, "Oh. It's you again.");
    yield* v(g, 'The gates are still open, by the way. The enemies are THAT way. Shoo.');
    g.lockControls(false);
    g.setObjective('GO FIGHT SOME ENEMIES  →', null, 1);
  }

  // =============================================================== SIGNS
  function* readSign(g, text) {
    sfx('read');
    yield* say(g, SIGN, text);
    g.lockControls(false);
  }

  ERX.Story = ERX.Story || {};
  ERX.Story.cave = { arenaIntro, tutorial, recognised, returning, readSign, VOICE, SIGN };
})(window.ERX = window.ERX || {});
