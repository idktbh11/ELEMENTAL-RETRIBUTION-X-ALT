/*
 * STORY: after the tutorial — the Voice's applause, the Deep Ends miners,
 * and the elevator ride (which, these days, actually arrives).
 */
(function (ERX) {
  'use strict';

  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const { VOICE } = ERX.Story.cave;

  const THOUGHT = { name: '(YOU)', color: '#9aa3cf', plate: '#22243a', voice: null, textColor: '#b4bbdb', speed: 50 };
  const SLIME = { name: 'GRUMPY SLIME', color: '#c8d0e8', plate: '#3a3e58', voice: 'voiceAngry', speed: 30 };

  function* say(g, speaker, text, o) {
    g.lockControls(true);
    g.dialogue.say(speaker, text, o || {});
    return yield () => g.dialogue.result;
  }
  const v = (g, text, o) => say(g, VOICE, text, o);
  function* me(g, text, o) { return yield* say(g, g.playerSpeaker, text, Object.assign({ speed: 60 }, o || {})); }
  function* choose(g, labels) {
    g.lockControls(true);
    g.dialogue.choose(labels);
    return yield () => g.dialogue.result;
  }

  // ===================================================== THE APPLAUSE
  function* voiceApplause(g) {
    g.lockControls(true);
    g.player.vx = 0;
    g.music(null);
    yield 0.8;
    for (let i = 0; i < 4; i++) { sfx('clap'); yield 0.6; }
    g.music('voice');
    yield* v(g, '*clap*   *clap*   *clap*', { effect: null, speed: 18 });
    yield* v(g, 'Wow. Bravo. Incredible. Truly.');
    yield* v(g, 'You defeated slimes. AND bats. The two most fearsome creatures in all of existence.');
    yield* v(g, 'They will write songs about this. Long songs. With harps. And crying.');
    yield* say(g, THOUGHT, "(He's being sarcastic. You can tell. A rock could tell.)");
    yield* v(g, 'Anyway.');
    yield* v(g, 'Keep heading deeper into the cave. Eventually, you will reach an elevator.');
    yield* v(g, "What's after the elevator? No idea. Genuinely. Not a clue.");
    const c = yield* choose(g, ['Ok.', 'Why is there an elevator in a cave?']);
    if (c === 0) {
      yield* me(g, 'Ok.');
      yield* v(g, 'Great talk. Riveting.');
    } else {
      yield* me(g, 'Why is there an elevator in a cave?');
      yield* v(g, 'I have NO idea.');
      yield* v(g, "It's just... there. It has always been there. Do not question the elevator.");
      yield* v(g, 'Just get to it.');
    }
    yield* v(g, "Alright. I'm going to leave you alone now.");
    yield* v(g, 'You know enough. I feel like you can handle the world by yourself. Probably. Hopefully. Eh.');
    // a line in its own special colour
    yield* me(g, "I have an odd feeling I'm gonna see you again.", { textColor: '#7af0e0', effect: 'wave', speed: 40 });
    yield* v(g, '...');
    yield* v(g, 'I hope not.');
    yield* v(g, 'But whatever.');
    yield* v(g, "Best of luck out there, hero. Truly. From the bottom of my heart. I'll think about you constantly.");
    yield* v(g, '(I will not.)', { effect: null });
    g.openGauntletGate();
    g.music('cave');
    g.saveProgress('enemiesCleared');
    g.lockControls(false);
    g.setObjective('HEAD DEEPER INTO THE CAVE  →', null, 1);
  }

  // ============================================================ MINERS
  const MINERS = {
    gus: {
      name: 'MINER GUS', pitch: 0.8,
      look: { gender: 0, skin: 3, hair: 0, hairColor: 1, eyes: 0, outfit: 4, outfitColor: 1, pants: 1, hat: 'hard' },
      lines: [
        ["Oi! A visitor! Ain't it BEAUTIFUL down here?", "Glowing crystals, shiny walls... more colours than a rainbow's birthday party.", "Sure, there's monsters. But have you SEEN this lighting?"],
        ["Brightest cave in the whole world, this is. Never needed a torch in me life.", 'Well. Once. But that was a Tuesday, and Tuesdays are dark.'],
        ["Me pickaxe? Named her Shirley. She's been with me longer than me wife.", "Don't tell me wife."],
      ],
    },
    pebbles: {
      name: 'MINER PEBBLES', pitch: 1.25,
      look: { gender: 1, skin: 1, hair: 3, hairColor: 4, eyes: 2, outfit: 4, outfitColor: 8, pants: 7, hat: 'hard' },
      lines: [
        ['They call it the Deep Ends. I call it home!', 'Bright as a festival down here, and twice as loud when the bats wake up.'],
        ['The slimes eat the moss. The bats eat the slimes. I eat sandwiches.', 'Circle of life, that is.'],
        ["Beating up monsters makes you stronger, y'know. Levels and all that!", "Don't get too attached though. Word is it doesn't stick once you leave these caves."],
      ],
    },
    marge: {
      name: 'OLD MARGE', pitch: 1.0,
      look: { gender: 1, skin: 4, hair: 4, hairColor: 6, eyes: 4, outfit: 6, outfitColor: 7, pants: 2, hat: 'hard' },
      lines: [
        ["Forty years I've mined these caves, dearie. Prettiest place I know.", "The crystals glow brighter when you're happy. Or so I tell myself."],
        ['That elevator up ahead? Been there longer than me.', 'Nobody knows who built it. Nobody asks. Best not to.'],
        ["Mind the monsters. They're rude, but the view is worth every bite."],
      ],
    },
  };

  function* talk(g, npc) {
    const m = MINERS[npc.id];
    if (m.talk) { yield* m.talk(g, npc); return; }
    npc.talkIndex = npc.talkIndex || 0;
    // people talk to you differently when you're carrying Chaos
    const el = g.element && g.element(), lines = el && el.id === 'chaos' && m.chaosLines ? m.chaosLines : m.lines;
    const set = lines[npc.talkIndex % lines.length];
    npc.talkIndex++;
    const speaker = m.speaker || { name: m.name, color: m.color || '#ffd36a', plate: '#4a3a1a', voice: 'npc', pitch: m.pitch, speed: 44 };
    npc.talking = true;
    for (const line of set) yield* say(g, speaker, line);
    npc.talking = false;
    g.lockControls(false);
  }

  // ========================================================= ELEVATOR
  // It goes all the way up now (see story-vault.js).
  function* elevatorRide(g) { yield* ERX.Story.vault.elevatorUp(g); }

  ERX.Story.deep = { voiceApplause, talk, elevatorRide, MINERS, THOUGHT, SLIME };
})(window.ERX = window.ERX || {});
