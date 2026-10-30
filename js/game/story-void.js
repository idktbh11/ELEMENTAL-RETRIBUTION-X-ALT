/*
 * STORY: THE VOID — after the reveal.
 *
 *   you float in space -> bounce to your feet (no floor?) -> a figure staring
 *   at the horizon turns around... it's THE VOICE, in person -> your element
 *   gets scanned -> the Julforic Pillars -> 7 locked worlds (they depend on
 *   your element) -> he shoots an energy key at world 1's lock -> he goes to
 *   his HQ -> jump into world 1 (js/game/story-world.js) or visit the HQ.
 *
 * Also: the HQ staff and Brenda's armour shop.
 */
(function (ERX) {
  'use strict';

  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const { THOUGHT, SLIME, MINERS } = ERX.Story.deep;

  // the Voice, in person: no more telepathic wobble
  const FIG_Q = { name: '???', color: '#c89aff', plate: '#3a2050', voice: 'voice', effect: null, speed: 38 };
  const FIG = Object.assign({}, FIG_Q, { name: 'THE VOICE' });

  function* say(g, speaker, text, o) {
    g.lockControls(true);
    g.dialogue.say(speaker, text, o || {});
    return yield () => g.dialogue.result;
  }
  function* me(g, text, o) { return yield* say(g, g.playerSpeaker, text, Object.assign({ speed: 60 }, o || {})); }
  function* choose(g, labels) {
    g.lockControls(true);
    g.dialogue.choose(labels);
    return yield () => g.dialogue.result;
  }
  const fig = (g, text, o) => say(g, g.figure && g.figure.named ? FIG : FIG_Q, text, o);
  function* angry(g, text) {
    const f = g.figure;
    f.expr = 'angry';
    f.shakeT = 0.6;
    yield* fig(g, text, { effect: 'shake' });
  }

  // ================================================== WHAT HE SAYS ABOUT YOUR ELEMENT
  // {E} becomes your element's name, in its colour.
  const ELEMENT_LINES = {
    fire: { expr: 'smug', lines: ['{E}, huh? Hot-headed. Figures.', "Please don't set my void on fire. ...Actually, go ahead. There's nothing to burn. Ha."] },
    water: { expr: 'smug', lines: ['{E}. Calm. Flowing. Hydrating.', "You're basically a walking water bottle. Stay hydrated. Literally."] },
    wind: { expr: 'smug', lines: ['{E}. So you\'re a breeze. A fast, annoying breeze.', 'I bet your hair is always perfect. Or always a disaster. No in-between.'] },
    earth: { expr: 'unamused', lines: ['{E}. Solid. Stubborn. Rock-hard.', 'That explains SO much about the tutorial.'] },
    lightning: { expr: 'nervous', lines: ['{E}! Fast. Shocking. Like your manners.', "Don't touch anything metal. Or me. Especially me."] },
    ice: { expr: 'smug', lines: ['{E}. Brrr.', 'You probably get the chills a lot. Do you get the chills a lot? You look like you get the chills.'] },
    nature: { expr: 'smug', lines: ['{E}. So you must REALLY like plants and trees.', 'Like, REALLY like them. You talk to them, don\'t you. You totally talk to them.'] },
    darkness: { expr: 'unamused', lines: ['{E}. Oh no.', "You're an edgelord now. Please don't start wearing a trench coat.", '...Too late. You already own one. I can tell.'] },
    shadow: { expr: 'nervous', lines: ['{E}. Sneaky. Silent.', "You're probably standing behind me right now. You're not. But you COULD be. That's worse."] },
    light: { expr: 'unamused', lines: ['{E}. Bright. Shiny. Hopeful. Ugh.', "You're going to be optimistic about EVERYTHING now, aren't you."] },
    arcane: { expr: 'nervous', lines: ['{E}. Raw magic.', 'Nobody understands it. Including you. Including me. ESPECIALLY me.'] },
    poison: { expr: 'unamused', lines: ['{E}. Gross.', "Don't lick anything. Don't let anything lick YOU. Just... wash your hands. Often."] },
    blood: { expr: 'nervous', lines: ['{E}. That\'s... dark. Metal. But dark.', 'Please never bring that up at dinner.'] },
    death: { expr: 'shock', lines: ['{E}?!', 'Oh. Oh no. Okay. Cool. Totally normal element to have.', "I'm just going to... stand a little further away now."] },
    metal: { expr: 'smug', lines: ['{E}. Hard. Shiny. Probably great at being a door.', 'Also: rock on. Literally.'] },
    sand: { expr: 'unamused', lines: ['{E}. Coarse, rough, irritating... and it gets EVERYWHERE.', "Wipe your feet before you go into my HQ. I'm serious."] },
    magma: { expr: 'nervous', lines: ['{E}. Fire AND earth.', 'Angry AND stubborn. Wonderful. My favourite combination. (It is not.)'] },
    storm: { expr: 'smug', lines: ['{E}. Wind, rain AND lightning?', "That's three elements in a trench coat. Overachiever."] },
    cosmic: { expr: 'unamused', lines: ['{E}. So now you\'re borrowing the UNIVERSE.', "You're going to be insufferable about this, aren't you."] },
    void: { expr: 'unamused', lines: ['{E}. Pure nothing.', 'Fitting. You showed up out of nowhere. Into MY nowhere. Rude, honestly.'] },
    psychic: { expr: 'nervous', lines: ['{E}. So you already knew I was going to say that.', '...Did you? Stop reading my mind. I said STOP.'] },
    crystal: { expr: 'smug', lines: ['{E}. Sparkly. Sharp. Very pretty.', "You're basically a walking chandelier. Don't stand under ceiling fans."] },
    moon: { expr: 'smug', lines: ['{E}. Strongest at night. Sleepy all day.', 'So... a teenager.'] },
    solar: { expr: 'nervous', lines: ['{E}. A tiny sun. Personally.', 'Do NOT look directly at yourself.'] },
    magnetism: { expr: 'smug', lines: ["{E}. You're attractive. Scientifically.", "Don't let it go to your head. Or your fridge."] },
    time: { expr: 'unamused', lines: ['{E}. So you can be late AND early.', 'Do you know how annoying that is to schedule around?'] },
    gravity: { expr: 'smug', lines: ['{E}. Heavy stuff. You must feel really grounded.', 'Ha. Grounded. Get it? ...I\'ll stop.'] },
    sound: { expr: 'nervous', lines: ['{E}. Loud. VERY loud.', 'Please use your indoor voice. This is an indoor void.'] },
    mist: { expr: 'smug', lines: ['{E}. Now I see you. Now I mostly don\'t.', 'Very mysterious. Very damp.'] },
    spirit: { expr: 'nervous', lines: ['{E}. You can see ghosts now.', "Some of them will wave at you. Wave back. It's polite."] },
    chaos: { expr: 'shock', lines: ['{E}?! THE MYTHIC ONE?!', 'Out of EVERYONE?! YOU?!', '...The universe has a sense of humour. A really, really bad one.'] },
  };
  const FALLBACK = { expr: 'neutral', lines: ['{E}. Huh. Never seen that one before.', "Neat. I have no jokes prepared. That's a first."] };

  // ================================================== CHAOS: THE SCAN GOES VERY WRONG
  // The rarest, most dangerous element in the universe. He does not take it well.
  function* chaosReaction(g, name) {
    const f = g.figure;
    g.music(null);
    f.expr = 'shock';
    f.bubble = 'bang';
    f.hop = 1;
    sfx('figureShock');
    g.shake(5, 0.5);
    yield 0.6;
    // he stumbles back... and goes down
    f.x += f.facing * -6;
    yield 0.15;
    f.x += f.facing * -5;
    f.pose = 'fallen';
    sfx('thud');
    g.shake(3, 0.25);
    yield 0.8;
    f.shakeT = 99;                    // trembling, the whole time he's down there
    yield* fig(g, 'C-C-C...', { effect: 'shake' });
    yield* fig(g, name + '?!?!', { effect: 'shake' });
    yield* fig(g, "No. No no no no NO. That's not possible. My scanner's broken.", { effect: 'shake' });
    // he scans you again from the floor, just to be sure
    g.startScan(1.2);
    yield 1.4;
    g.scanResult();
    yield 0.6;
    yield* fig(g, "...My scanner is not broken.", { effect: 'shake' });
    g.music('voice');
    yield* fig(g, 'Do you have ANY idea what you are carrying right now?!', { effect: 'shake' });
    yield* fig(g, 'That is the STRONGEST ELEMENT IN HISTORY. The rarest thing in the ENTIRE universe!', { effect: 'shake' });
    yield* fig(g, "Nobody has had that in... I don't even KNOW how long! Nobody knows! Nobody was supposed to EVER get it!", { effect: 'shake' });
    f.bubble = null;
    const c = yield* choose(g, ['Is that... good?', 'Cool.', '*point back at him*']);
    if (c === 0) {
      yield* me(g, 'Is that... good?');
      yield* fig(g, "GOOD?! It's good AND bad AND everything else at the same time! That's the PROBLEM!", { effect: 'shake' });
    } else if (c === 1) {
      yield* me(g, 'Cool.');
      yield* fig(g, '"COOL"?! You just won the COSMIC LOTTERY and you said "COOL"?!', { effect: 'shake' });
    } else {
      g.player.facing = f.x > g.player.cx ? 1 : -1;
      yield* me(g, '*points back at him*');
      yield* fig(g, "DON'T POINT BACK AT ME! I'm the one pointing! This is MY shocked moment!", { effect: 'shake' });
    }
    // he gets back up. With dignity. Mostly.
    f.shakeT = 0;
    f.pose = 'idle';
    f.expr = 'nervous';
    sfx('step');
    yield 0.5;
    yield* fig(g, '*ahem*');
    yield* fig(g, "I'm fine. I'm totally fine. I meant to sit down. The floor looked comfy.");
    f.expr = 'neutral';
    g.music(null);
    yield* fig(g, 'Listen to me. Seriously. For once.');
    yield* fig(g, "Chaos doesn't follow rules. Not physics. Not logic. Not even the other elements.");
    yield* fig(g, 'Something like you gets NOTICED. You are a {red}THREAT{/} now. To the monsters. To the pillars. Maybe to everything.');
    yield* fig(g, 'The worlds will feel you coming. They will push back. Everything out there will be... a little harder for you than for anyone else.');
    f.expr = 'sigh';
    yield* fig(g, 'So be careful with the power you have. Please.');
    f.expr = 'unamused';
    yield* fig(g, "I would like my void to still exist next week.");
    g.music('void');
  }

  // ================================================== FLOATING -> AWAKE
  function* voidIntro(g) {
    const p = g.player;
    g.lockControls(true);
    yield 3.4;                       // floating in space, very asleep
    g.wakeFromFloat();               // ...and you bounce right to your feet
    yield () => (p.onGround ? true : undefined);
    yield 0.5;
    g.thinkAloud('...where is the floor?');
    yield 1.8;
    g.music('void');
    g.lockControls(false);
  }

  // ================================================== THE VOICE, IN PERSON
  function* meetFigure(g) {
    const p = g.player, f = g.figure;
    g.lockControls(true);
    p.vx = 0;
    g.music(null);
    g.focusCamera((p.cx + f.x) / 2, f.y - 40);
    yield 1.6;                       // someone, staring at the horizon...
    // ...turns around. Slowly.
    sfx('figureTurn');
    f.front = true;
    yield 1.1;
    f.front = false;
    f.facing = p.cx < f.x ? -1 : 1;
    yield 0.7;
    // and sees you.
    f.expr = 'shock';
    f.bubble = 'bang';
    f.hop = 1;
    sfx('figureShock');
    g.shake(2, 0.25);
    yield 1.0;
    g.music('voice');                // the confusing music. again.
    f.pose = 'point';
    yield* fig(g, 'Y-Y-YOU?!', { effect: 'shake' });
    yield* fig(g, 'H-h-how did you g-g-get HERE?!', { effect: 'shake' });
    f.bubble = null;
    const c = yield* choose(g, ['Idk.', 'You probably brought me here.', 'Are you the Voice that helped me through that tutorial?']);
    f.pose = 'idle';
    if (c === 0) {
      yield* me(g, 'Idk.');
      f.expr = 'unamused';
      yield* fig(g, '..."Idk."');
      yield* fig(g, 'Are you messing with me right now?');
      f.expr = 'nervous';
      yield* fig(g, "You are. You're playing with me. First you show up in MY cave, now you show up in MY void.");
      // he checks for hidden cameras
      f.facing = -f.facing; yield 0.45; f.facing = -f.facing; yield 0.45;
      yield* fig(g, 'Is this a prank? Is somebody filming this?');
    } else if (c === 1) {
      yield* me(g, 'You probably brought me here.');
      g.shake(3, 0.3);
      f.bubble = 'bang';
      yield* angry(g, 'BROUGHT YOU HERE?!');
      yield* angry(g, 'This is MY domain! MINE!');
      yield* angry(g, "I don't just bring RANDOM VISITORS over here! Do you know how long it took to get this place this EMPTY?!");
      f.bubble = null;
    } else {
      yield* me(g, 'Are you the Voice that helped me through that tutorial?');
      f.expr = 'sigh';
      sfx('sigh');
      yield* fig(g, '*sigh*', { speed: 10 });
      yield* fig(g, '...Yes.');
    }
    // every answer ends up here
    f.expr = 'sigh';
    if (c !== 2) yield* fig(g, "...Wait. You don't recognise me? It's ME. The Voice. From the tutorial.");
    f.named = true;
    f.expr = 'neutral';
    yield* fig(g, 'And yes. This is what I really look like.');
    yield* fig(g, 'I was the one who helped you through that whole tutorial. You are welcome. Again.');

    // ---- did you get your element? ----
    yield* fig(g, 'Anyway. More importantly...');
    yield* fig(g, 'Did you get your element yet?');
    const e = yield* choose(g, ['Yes.', 'No.']);
    if (e === 0) {
      yield* me(g, 'Yes.');
      f.expr = 'smug';
      yield* fig(g, 'Good. Obviously.');
    } else {
      yield* me(g, 'No.');
      f.expr = 'unamused';
      yield* fig(g, '...');
      yield* fig(g, "I know you're lying.");
      yield* fig(g, "That's literally the ONLY way you could have gotten here.");
      yield* fig(g, 'Nice try, though. Zero out of ten.');
    }

    // ---- the scan ----
    f.expr = 'neutral';
    yield* fig(g, 'Hold still. Let me scan you.');
    f.pose = 'cast';
    g.startScan(2.4);
    yield 2.6;
    f.pose = 'idle';
    const el = g.element();
    g.scanResult();
    yield 1.2;
    const name = '{el' + el.id + '}' + el.name.toUpperCase() + '{/}';
    if (el.id === 'chaos') yield* chaosReaction(g, name);
    else {
      const said = ELEMENT_LINES[el.id] || FALLBACK;
      f.expr = said.expr;
      for (const line of said.lines) yield* fig(g, line.replace('{E}', name));
    }

    // ---- the Julforic Pillars ----
    f.expr = 'nervous';
    yield* fig(g, "Oh! Right. I forgot to tell you something. Kind of a big something.");
    f.expr = 'neutral';
    yield* fig(g, "You're a HERO. Chosen by an Unknown Being.");
    yield* fig(g, 'Your job is to travel to different worlds and destroy these things called {red}JULFORIC PILLARS{/}.');
    yield* fig(g, 'Those pillars make monsters spawn. LOTS of monsters. They wreak havoc. Big, messy, expensive havoc.');
    const u = yield* choose(g, ['Ok.', 'Who is this "Unknown Being"?']);
    if (u === 0) {
      yield* me(g, 'Ok.');
      yield* fig(g, 'Great. Love that. Moving on.');
    } else {
      yield* me(g, 'Who is this "Unknown Being"?');
      f.expr = 'nervous';
      yield* fig(g, "I don't know.");
      yield* fig(g, "Genuinely. I don't even know who it is. Nobody does. It's kind of in the name.");
    }

    // ---- learning your element ----
    f.expr = 'neutral';
    yield* fig(g, "Also, you'll have to learn how to use your element along the way.");
    yield* fig(g, "I can't teach you that part. I don't know how to use elements.");
    const t = yield* choose(g, ['Ok.', 'What type of tutorial guide are you?']);
    if (t === 0) {
      yield* me(g, 'Ok.');
      yield* fig(g, 'Thank you. Finally. Someone who gets it.');
    } else {
      yield* me(g, 'What type of tutorial guide are you?');
      g.shake(3, 0.3);
      f.bubble = 'bang';
      yield* angry(g, 'EXCUSE ME?!');
      yield* angry(g, "I can't just use whatever element I WANT! I'm just like you! I got ONE!");
      f.bubble = null;
      f.expr = 'unamused';
      yield* fig(g, "And no, I'm not telling you which one.");
    }
    f.expr = 'sigh';
    sfx('sigh');
    yield* fig(g, '*sigh*', { speed: 10 });
    yield* fig(g, "Alright. Let me show you all the worlds you need to save.");

    // ---- you both look out into space ----
    f.expr = 'neutral';
    f.facing = 1;
    p.facing = 1;
    g.music(null);
    g.focusCamera(f.x + 40, f.y - 120);
    yield 1.6;
    g.showWorlds();                   // seven locked worlds appear
    yield 3.6;
    g.music('void');
    yield* fig(g, 'Those are the worlds. Seven of them. All locked. Obviously.');
    yield* fig(g, 'The worlds depend on what element you have. Different element, different worlds.');
    yield* fig(g, "So you'll have to adjust to whatever environment you get. Pack a jacket. Or sunscreen. Or both.");
    yield* me(g, 'How many elements are there?');
    f.facing = -1;
    f.expr = 'nervous';
    yield* fig(g, '...');
    yield* fig(g, "I don't know.");
    yield* fig(g, 'A lot? Some? More than three. Definitely more than three.');

    // ---- world 1 ----
    f.facing = 1;
    f.expr = 'neutral';
    f.pose = 'point';
    yield* fig(g, 'That one.');
    yield* fig(g, "That's the world you save first.");
    // a key, out of pure energy...
    f.pose = 'cast';
    g.chargeKey();
    yield 1.7;
    g.shootKey();                     // ...shot straight at the lock
    yield () => (g.energyKey && g.energyKey.done ? true : undefined);
    f.pose = 'idle';
    yield 1.4;
    f.facing = -1;
    f.expr = 'smug';
    yield* fig(g, 'There. Unlocked. You can thank me later. Or now. Now is good.');
    g.saveProgress('worldUnlocked');
    g.releaseCamera();

    // ---- he heads off to his HQ ----
    f.expr = 'neutral';
    yield* fig(g, "Alright. I'll be at my HQ.");
    g.spawnHqDoor();
    yield 0.8;
    yield* fig(g, 'You can go on ahead and jump into that world... or you can stay for a bit. Your call.');
    yield* fig(g, "Don't touch anything.");
    f.walkTo = g.level.doorX;        // and off he goes
    g.lockControls(false);
    g.setObjective('JUMP INTO WORLD 1  -OR-  VISIT THE HQ', null, 1);
  }

  // ================================================== RETURNING / AFTER
  function* backInVoid(g) {
    g.lockControls(false);
    g.setObjective('JUMP INTO WORLD 1  -OR-  VISIT THE HQ', null, 1);
    yield 0;
  }

  // ================================================== THE HQ
  const npcSpeaker = (m) => ({ name: m.name, color: m.color || '#ffd36a', plate: m.plate || '#4a3a1a', voice: 'npc', pitch: m.pitch, speed: 44 });

  /** Brenda's armour counter. */
  function* shop(g, npc) {
    const c = g.character, p = g.player;
    const B = npcSpeaker(MINERS.brenda);
    const Inv = ERX.Inventory, item = (a) => 'armor:' + a.id;
    Inv.ensure(c);
    npc.talking = true;
    if (g.element() && g.element().id === 'chaos') yield* say(g, B, npc.visited ? "Back again, chaos kid? Please don't make the armor sentient this time." : "Welcome to Brenda's Ar— oh. OH. You're the one the boss won't shut up about. Honey, you're gonna NEED armor.");
    else yield* say(g, B, npc.visited ? 'Back again? I like repeat customers. I like ALL customers. There are three of you.' : "Welcome to Brenda's Armor! Protection for heroes, zeroes, and everyone in between.");
    npc.visited = true;
    for (;;) {
      yield* say(g, B, 'You have {gold}' + (c.gold || 0) + 'G{/}. What will it be?');
      const items = ERX.Armor.list;
      const labels = items.map((a) => (c.armor === a.id ? '[WORN] ' : Inv.has(c, item(a)) ? '[OWNED] ' : '') + a.name + '  ' + a.price + 'G  +' + a.def + ' DEF');
      labels.push('Just looking.');
      const i = yield* choose(g, labels);
      if (i >= items.length) { yield* say(g, B, 'Come back when you want to be less squishy.'); break; }
      const a = items[i];
      if (c.armor === a.id) { yield* say(g, B, "You're already wearing that. It looks great. Trust me. I'm a professional."); continue; }
      if (Inv.has(c, item(a))) {
        Inv.equip(c, item(a));
        ERX.Saves.update(c);
        sfx('select');
        yield* say(g, B, 'Swapped! ' + a.name + ' equipped.');
        continue;
      }
      yield* say(g, B, a.name + ': ' + a.desc);
      if ((c.gold || 0) < a.price) {
        sfx('deny');
        if (a.id === 'golden') yield* say(g, B, "...Sweetie. That's 9999G. Let's be realistic.");
        else {
          yield* say(g, B, "That's " + a.price + 'G. You have ' + (c.gold || 0) + "G. The math isn't mathing.");
          yield* say(g, B, 'Go punch some monsters. They drop gold. Do NOT ask me where they keep it.');
        }
        continue;
      }
      if (!Inv.fits(c, item(a))) { sfx('deny'); yield* say(g, B, "Your bag's full, hon. I sell armor, not storage units."); continue; }
      const ok = yield* choose(g, ['Buy it (' + a.price + 'G)', 'Never mind.']);
      if (ok !== 0) continue;
      c.gold -= a.price;
      Inv.add(c, item(a));
      Inv.equip(c, item(a));
      ERX.Saves.update(c);
      sfx('buy');
      g.floatText(p.cx, p.y - 8, '-' + a.price + 'G', '#ffd34d');
      yield* say(g, B, 'Pleasure doing business! Already equipped. You look 40% less squishy.');
    }
    npc.talking = false;
    g.lockControls(false);
  }

  // the HQ staff (talked to through the same NPC system as the miners)
  Object.assign(MINERS, {
    dot: {
      name: 'RECEPTIONIST DOT', pitch: 1.3,
      look: { gender: 1, skin: 2, hair: 2, hairColor: 3, eyes: 1, outfit: 3, outfitColor: 5, pants: 3 },
      lines: [
        ['Welcome to HQ! Do you have an appointment?', "...No? That's fine. Nobody does. We don't do appointments."],
        ["The boss is at his desk in the back. He's been sighing a lot today. More than usual."],
        ["We're a non-profit. Mostly because we've never made a profit."],
      ],
      chaosLines: [
        ['Welcome to HQ! Do you have an appoint—', '...', '...Is your outline supposed to flicker like that?', "No. Don't answer that. Please sign in. Please don't touch the pen."],
        ["The boss told everyone about you. In capital letters. He made a memo. The memo just says 'CHAOS' and 'DON'T'."],
        ["Our insurance doesn't cover you. I checked. Twice. They laughed at me."],
      ],
    },
    kev: {
      name: 'INTERN KEV', pitch: 1.1,
      look: { gender: 0, skin: 1, hair: 1, hairColor: 2, eyes: 3, outfit: 1, outfitColor: 2, pants: 2 },
      lines: [
        ["I'm the intern! I've been the intern for three hundred years!", 'Time works weird in the void. My contract does not.'],
        ["Want some coffee? It's void coffee.", "It's just an empty mug. There's nothing in it. It's very on-brand."],
        ['The boss says I might get promoted soon. He has said that every day for three hundred years.'],
      ],
      chaosLines: [
        ["WHOA. You're the Chaos one?!", 'Can I get your autograph? ...Actually, can you sign it from over there? Like, far over there?'],
        ["Want some void coffee? It's an empty mug.", '...You just looked at it and now there IS coffee in it. How. HOW.'],
        ['The boss said Chaos might break reality. I said "cool". He did not think it was cool.'],
      ],
    },
    brenda: {
      name: 'ARMORER BRENDA', pitch: 0.95, color: '#ffd34d',
      look: { gender: 1, skin: 5, hair: 4, hairColor: 5, eyes: 2, outfit: 6, outfitColor: 3, pants: 1 },
      talk: shop,
    },
    steve: {
      name: 'SNORING STEVE', pitch: 0.7,
      look: { gender: 0, skin: 4, hair: 5, hairColor: 0, eyes: 0, outfit: 0, outfitColor: 6, pants: 4 },
      lines: [
        ['Zzz... five more minutes... zzz...', '...zzz... the floor isn\'t real... zzz...'],
        ['(He is asleep. He has been asleep since the HQ was built. Nobody knows his job.)'],
      ],
      chaosLines: [
        ['Zzz... chaos... zzz...', '(He sits bolt upright, looks straight at you, says "so it begins" and falls back asleep.)'],
        ['(He is asleep. He is sleeping slightly further away from you than usual.)'],
      ],
    },
    atlas: {
      name: 'DR. ATLAS', pitch: 1.0,
      look: { gender: 0, skin: 6, hair: 6, hairColor: 7, eyes: 4, outfit: 2, outfitColor: 0, pants: 5 },
      lines: [
        ['I study the Julforic Pillars. Big. Glowy. Rude.', 'Destroy one and the monsters in that world calm down. In theory. Theories are fun!'],
        ['Your element changes the worlds you visit. Fascinating! Also terrifying! Mostly fascinating!'],
        ['How many elements are there? ...Next question.'],
      ],
      chaosLines: [
        ['CHAOS! A real, living Chaos! Oh, this is the best day of my career!', 'May I take a sample? A small one? A tiny bit of your aura? No? Worth asking!'],
        ['Fascinating: the worlds bend a little more around you than around anyone else. They can FEEL you.', 'Also: the monsters out there will be tougher. Probably. Science!'],
        ['My instruments explode when you walk past. I love it. Please keep walking past.'],
      ],
    },
    ron: {
      name: 'BIG RON', pitch: 0.75,
      look: { gender: 0, skin: 3, hair: 8, hairColor: 1, eyes: 1, outfit: 5, outfitColor: 1, pants: 6 },
      lines: [
        ['Hero, huh? Nice. You lift?', '...You lift ELEMENTS. That counts. Respect.'],
        ["Armor's over at Brenda's. Can't punch pillars in your pajamas."],
        ["I'm not punching the air. I'm punching the VOID. Huge difference."],
      ],
      chaosLines: [
        ["So YOU'RE the Chaos one. Huh.", "...I'm not scared. I'm just standing over here for no reason. Leg day."],
        ["Arm wrestle? ...Nah. Nah, I'm good. I like my arm. It's attached."],
        ['Respect. Massive respect. From a safe distance.'],
      ],
    },
    guide: {
      name: 'THE VOICE', speaker: FIG,
      lines: [
        ['Oh. You came to the HQ. Great. Wonderful.', "Don't touch anything. ESPECIALLY the plant. It bites."],
        ['World 1 is unlocked. The jump point is out in the void. Walk out the door, keep walking, jump.'],
        ["I said I'd be at my HQ. I'm at my HQ. This is me. Being here."],
        ["Need armor? Talk to Brenda. Need advice? Also talk to Brenda. She's smarter than me."],
      ],
      chaosLines: [
        ['Oh. You came to the HQ. With your... CHAOS. Great. Wonderful.', "Don't touch anything. Don't LOOK at anything too hard. The plant already fainted."],
        ['World 1 is unlocked. It knows you are coming. Be careful out there. I mean it.'],
        ["I'm not nervous. I'm just standing behind my desk. The desk is load-bearing. For me."],
        ["Remember: you're a threat now. Act like it. But a careful threat. A threat with manners."],
      ],
    },
  });

  ERX.Story.void = { voidIntro, meetFigure, chaosReaction, backInVoid, shop, ELEMENT_LINES, FIG, THOUGHT };
})(window.ERX = window.ERX || {});
