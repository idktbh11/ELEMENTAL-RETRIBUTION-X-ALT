/*
 * STORY: THE WORLDS.
 *
 *   The first time you try to jump into a world, the Voice yanks you back
 *   (a telekinesis device, obviously) to give you the VOID RECALL DEVICE.
 *   After that, every jump drops you into the world from the sky (see
 *   js/game/world-fall.js). World 1: you land, and the first Checkshot lets
 *   you recall to the void. Far to the east, past the fog, you can smash your
 *   way into the old cave... where something behind bars tells you to LEAVE,
 *   the floor gives way (js/game/cave-fall.js), and you land in THE DEEPER
 *   ENDS, where guess who turns up again. Far in: THE TRIAL (six waves, then
 *   a great door), a pitch-black corridor (take the torch), a floor of skulls
 *   that gives way (js/game/abyss-fall.js)... and THE ABYSS, where the lights
 *   slam on and the AZURE ZOMBIE comes out of the sigil (js/game/boss-azure.js).
 *   Beat it, and the far passage opens: a building site, a prototype lift, a big
 *   red button (DO NOT PRESS). It goes up. Very fast (js/game/sky-launch.js), and
 *   blasts you out into the sky; you come down in NORMALTON, where everyone stares,
 *   and guess who comes down after you (the road out east isn't finished).
 *   Normalton: the Sleepy Goose (sleep the night away upstairs), Fenwick's food, Greta's armor,
 *   Holt's upgrades. Switch on the square's Checkshot and the mayor will answer anything you ask...
 *   and when you ask what was in that cave, he tells you what this world really is. He opens the
 *   east gate for you; walk up to it, and the slime drops in. (The road STILL isn't finished.)
 */
(function (ERX) {
  'use strict';

  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const FIG = () => ERX.Story.void.FIG;
  const SLIME = () => ERX.Story.deep.SLIME;
  /** Whoever is behind the bars in the old cave: just two blue eyes and a very deep voice. */
  const EYES = { name: '???', color: '#7ac8ff', plate: '#081428', voice: 'voiceDeep', shakeVoice: 'voiceDeep', textColor: '#9ad8ff', speed: 6 };

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
  const fig = (g, text, o) => say(g, FIG(), text, o);
  function* angry(g, text) {
    const f = g.figure;
    f.expr = 'angry';
    f.shakeT = 0.6;
    yield* fig(g, text, { effect: 'shake' });
  }
  const elName = (g) => { const el = g.element(); return '{el' + el.id + '}' + el.name.toUpperCase() + '{/}'; };

  // ================================================== THE VRD (the first time you try to leave)
  function* vrd(g) {
    const p = g.player, L = g.level;
    g.lockControls(true);
    g.objective = null;
    p.vx = 0;
    p.facing = 1;
    g.music(null);
    yield 0.4;
    g.startLaunch();                      // up you go...
    yield 0.62;
    g.holdLaunch();                       // ...and stop. Mid-air.
    const f = g.figureBurstsOut();        // he comes flying out of the HQ
    f.walkTo = L.jumpX + 70; f.walkStay = true; f.walkSpeed = 170;
    sfx('figureShock');
    g.shake(3, 0.3);
    yield* angry(g, 'WAAAAAAAIT!!!');
    yield () => (f.walkTo === null ? true : undefined);
    f.facing = -1;
    f.pose = 'cast';
    f.expr = 'angry';
    sfx('tkBeam');
    g.startPull(L.jumpX + 30);            // a telekinesis device. Back down you come.
    yield () => (g.state === 'play' ? true : undefined);
    p.facing = 1;
    yield 0.5;
    f.pose = 'idle';
    f.expr = 'nervous';
    sfx('sigh');
    yield* fig(g, '*huff*... *huff*...', { speed: 14 });
    yield* fig(g, 'Sorry. Sorry! I forgot to give you something.');
    f.expr = 'neutral';
    f.pose = 'point';
    g.giveItem('vrd');                    // it floats over to you
    yield 2.4;
    f.pose = 'idle';
    yield* fig(g, 'The Void Recall Device. The VRD, for short.');
    const a = yield* choose(g, ['What is this?', 'Can I eat it?']);
    if (a === 1) {
      f.expr = 'shock';
      yield* fig(g, 'NO. Do NOT eat it.');
      f.expr = 'unamused';
      yield* fig(g, "...It's a recall device.");
    } else yield* fig(g, "It's a recall device.");
    yield* fig(g, 'It teleports you back here. To the void.');
    f.expr = 'smug';
    f.pose = 'point';
    yield* fig(g, 'BUT. You can only use it once you reach a Checkshot.');
    f.pose = 'idle';
    const b = yield* choose(g, ['What is a checkshot?', 'Are you just making up words?']);
    if (b === 0) {
      f.expr = 'unamused';
      yield* fig(g, "It's a checkpoint.");
      yield* fig(g, '...A checkpoint with a cooler name. Keep up.');
    } else {
      g.shake(3, 0.3);
      f.bubble = 'bang';
      yield* angry(g, 'I AM NOT MAKING UP WORDS!');
      yield* angry(g, "It's a CHECKPOINT! It's a CHECKPOINT with a COOLER NAME!");
      f.bubble = null;
      f.expr = 'unamused';
      yield* fig(g, '...Moving on.');
    }

    // ---- be careful. and about your element...
    f.expr = 'neutral';
    yield* fig(g, 'Listen. Be careful out there. I mean it.');
    yield* fig(g, 'Your element, ' + elName(g) + ', is the only thing you have out there.');
    yield* fig(g, 'You can upgrade it, to make it stronger. Use that skill tree. That is what it is for.');
    f.expr = 'nervous';
    yield* fig(g, 'And...');
    yield* fig(g, '...you can also AWAKEN it.', { effect: 'wave' });
    yield* me(g, 'Awaken it? How?');
    yield* fig(g, '...');
    yield* fig(g, "I don't know.");
    yield* fig(g, 'Every element is different. Nobody knows how. Not even me.');
    const c = yield* choose(g, ["Then why did you tell me this if you don't even know how to do it?", '...Okay.']);
    if (c === 0) {
      g.shake(3, 0.35);
      f.bubble = 'bang';
      yield* angry(g, "BECAUSE YOU'RE GONNA HAVE TO KNOW!");
      yield* angry(g, "Especially once you get to the deeper worlds! You'll NEED it!");
      f.bubble = null;
    } else {
      f.expr = 'unamused';
      yield* fig(g, "Yeah. 'Okay'. You'll figure it out. Especially once you get to the deeper worlds. You'll NEED to.");
    }
    f.expr = 'sigh';
    sfx('sigh');
    yield* fig(g, '*sigh*', { speed: 10 });
    if (g.element() && g.element().id === 'chaos') {
      // he's not worried about you. he's worried about World 1.
      f.expr = 'nervous';
      yield* fig(g, 'Well. Good luck out there.');
      yield* fig(g, '...No. Wait. Good luck to WORLD 1.');
      f.expr = 'unamused';
      yield* fig(g, "Try not to break it. It's the only one we've got.");
    } else {
      f.expr = 'smug';
      yield* fig(g, 'Well. Good luck out there.');
      yield* fig(g, "...You're gonna need it.");
    }
    f.expr = 'neutral';
    f.walkTo = L.doorX; f.walkStay = false; f.walkSpeed = 60;   // and off he goes. Again.
    g.saveFlag('vrd');
    g.lockControls(false);
    g.setObjective('JUMP INTO WORLD 1  -OR-  VISIT THE HQ', null, 1);
  }

  // ================================================== JUMP INTO A WORLD (every time after that)
  function* jump(g) {
    const c = g.character;
    if (!(c.progress && c.progress.vrd)) return yield* vrd(g);
    const p = g.player;
    g.lockControls(true);
    // switched Normalton's Checkshot on? Then you get to pick where you come down
    let at = null;
    if (c.progress && c.progress.checkshotVillage) {
      const i = yield* choose(g, ['World 1: the meadow', 'World 1: Normalton', 'Not yet']);
      g.dialogue.close();
      if (i === 2) { g.lockControls(false); return; }
      if (i === 1) at = 'village';
    }
    g.objective = null;
    p.vx = 0;
    p.facing = 1;
    g.music(null);
    yield 0.4;
    g.startLaunch();                      // up, up... into the light
    yield 2.05;
    g.enterWorld(1, at);                  // 2 s of black, then the portal (world-fall.js)
  }

  // ================================================== WORLD 1: you're down
  function* world1Arrival(g) {
    g.lockControls(true);
    g.saveFlag('world1');
    yield 0.9;
    g.thinkAloud('World 1. Nice view.');
    yield 1.2;
    g.lockControls(false);
    g.setObjective('FIND THE CHECKSHOT  <-', null, 1);
  }

  // ================================================== CHECKSHOTS
  function* checkshot(g) {
    const cs = g.checkshot;
    if (!cs.on) {
      g.lockControls(true);
      g.activateCheckshot();
      yield 1.3;
      if (g.objective) g.completeObjective();
      if (g.levelId === 'world1' && ERX.Items.has(g.character, 'vrd')) g.thinkAloud('The VRD is buzzing.', '#c89aff');
      yield 0.6;
      if (g.levelId === 'village') { yield 0.8; villageObjective(g); }
      g.lockControls(false);
      return;
    }
    if (!ERX.Items.has(g.character, 'vrd')) { g.thinkAloud('A Checkshot. Nice. Now if only you had a way home.'); return; }
    const i = yield* choose(g, ['Recall to the void (VRD)', 'Stay a bit longer']);
    if (i !== 0) { g.lockControls(false); return; }
    g.startRecall();
  }

  // ================================================== THE OLD CAVE: the bars at the end
  function* theBars(g) {
    const L = g.level, p = g.player;
    g.lockControls(true);
    p.vx = 0;
    p.facing = 1;
    g.music(null);                     // the music stops. that's never good.
    yield 1.0;
    // two blue eyes open in the dark behind the bars
    L.eyes.on = true;
    L.eyes.t = 0;
    sfx('eyesOpen');
    yield 1.6;
    yield* say(g, EYES, 'LEAVE.', { effect: 'shake' });
    g.dialogue.close();
    L.eyes.on = false;                 // ...and they're gone
    yield 0.7;
    // the cave starts to shake
    g.rumble(3);
    g.shake(3, 2.6);
    L.quake = 2.8;
    yield 1.2;
    // the floor cracks under you...
    L.startCracks(p.cx);
    sfx('floorCrack');
    g.shake(5, 0.4);
    yield 1.1;
    sfx('floorCrack');
    yield 0.4;
    // ...and gives way
    L.breakFloor(g, p.cx);
    g.saveFlag('caveFell');            // (and the whole cave comes down behind you: World 1's cliff is rubble from now on)
    g.startCaveFall();
  }

  // ================================================== THE DEEPER ENDS: you land.
  function* deeperArrival(g) {
    const p = g.player, L = g.level;
    g.lockControls(true);
    // hang in the dark a moment while it fades in... then drop the last bit
    const t0 = g.t;
    yield () => { p.placeAt(L.landX, L.floorY - 280); p.vx = 0; p.vy = 0; return g.t - t0 > 0.7 ? true : undefined; };
    p.vy = 120;
    yield () => (p.onGround ? true : undefined);
    // THUD
    g.checkpoint = { x: p.cx, y: p.feet };   // (you came in from the air: this is where you'd get back up)
    sfx('landSlam');
    g.shake(7, 0.5);
    if (g.impact) g.impact(0.07);
    g.dust(p.cx, p.feet, 26);
    p.lying = true;
    yield 1.8;
    p.lying = false;
    sfx('getUp');
    yield 0.5;
    g.thinkAloud('...Ow.');
    yield 1.2;
    g.banner = { title: 'THE DEEPER ENDS', sub: 'Darker. Deeper. Weirdly groovy.', t: 0, dur: 4.5 };
    g.music('deeperends');
    g.saveProgress('deeperEnds');
    yield 1.0;
    g.lockControls(false);
  }

  // ================================================== THE TRIAL (js/game/deeper-trial.js runs the waves)
  function* trialStart(g, T) {
    const p = g.player, again = (T.tries = (T.tries || 0) + 1) > 1;
    g.lockControls(true);
    p.vx = 0;
    T.gate.close();                    // CLANG. no way back.
    g.music(null);
    yield again ? 0.8 : 1.1;
    sfx('trialHorn');
    g.shake(2, 1.3);
    yield 0.5;
    if (!again) {
      g.banner = { title: 'THE TRIAL', sub: 'Six waves. No reward. No way out.', t: 0, dur: 3.2 };
      yield 2.4;
    }
    g.music('trial');
    g.lockControls(false);
    T.state = 'between'; T.t = 0; T.pause = 0.6;   // here they come (again: from the wave you went down on)
  }
  /** All six waves down: the great door grinds open... onto nothing but black. */
  function* trialDone(g, T) {
    g.music(null);
    yield 1.2;
    T.openDoor(g);
    yield 2.8;
    g.saveFlag('trialDone');
    g.setObjective('TAKE THE TORCH');
  }

  // ================================================== THE DARK: far along the corridor of skulls...
  /** ...the skulls start to shake, and then they fall. And so do you. */
  function* skullCollapse(g) {
    const L = g.level, p = g.player;
    g.lockControls(true);
    p.vx = 0;
    yield 0.5;
    L.bones.shake = 1;                 // every skull in the corridor starts to rattle
    sfx('skullRattle');
    sfx('rumble', { dur: 2.2 });
    g.shake(2, 2.3);
    yield 2.6;
    L.collapse(g);                     // ...and down they go. All of them. With you on top.
    g.startAbyssFall();
  }

  // ================================================== THE ABYSS: you land. Something's coming. (It isn't.)
  function* abyssArrival(g) {
    const p = g.player, L = g.level;
    g.lockControls(true);
    const t0 = g.t;
    yield () => { p.placeAt(L.landX, L.floorY - 300); p.vx = 0; p.vy = 0; return g.t - t0 > 0.8 ? true : undefined; };
    p.vy = 160;
    yield () => (p.onGround ? true : undefined);
    g.checkpoint = { x: p.cx, y: p.feet };
    sfx('landSlam');
    g.shake(8, 0.6);
    if (g.impact) g.impact(0.08);
    g.dust(p.cx, p.feet, 30);
    p.lying = true;
    yield 2.0;
    p.lying = false;
    sfx('getUp');
    yield 1.0;
    g.saveProgress('abyss');
    g.banner = { title: 'THE ABYSS', sub: 'All the way down. Probably.', t: 0, dur: 4.5 };
    yield 1.6;
    g.lockControls(false);
  }
  /**
   * Out in the middle: the lights slam on, the warning goes up... and the sigil opens. Out of it drops
   * a zombie. Just a zombie. A bit blue round the eyes. Then its hands go up in blue fire: the AZURE ZOMBIE.
   * (The fight itself: js/game/boss-azure.js. Its end: js/game/finale.js, then abyssAfter.)
   */
  function* abyssBoss(g) {
    const L = g.level, p = g.player;
    g.lockControls(true);
    p.vx = 0;
    yield 0.6;
    // CLUNK. CLUNK. CLUNK: the lights, a pair at a time, from the far ends in (the dark lifts as they come on)
    L.lit = true;
    for (const pair of L.lampOrder) {
      for (const i of pair) L.lightLamp(g, i);
      sfx('lightsOn');
      g.shake(2.5, 0.2);
      g.darkness = Math.max(L.darknessAt(), g.darkness - 0.14);
      yield 0.42;
    }
    L.sigil.t = 0;                     // the sigil on the far wall flares
    sfx('runeLight');
    yield 1.0;
    // something BIG is coming
    g.focusCamera(L.centerX, L.floorY - 60);
    g.music('abyssboss');
    g.warning = { title: '!! WARNING !!', text: 'A BOSS ENEMY IS APPROACHING', style: 'abyss' };
    g.rumble(4);
    yield 3.6;
    // the sigil's eye opens into a portal, and something takes shape in it
    L.portal = { k: 0, open: true };
    sfx('azureEmerge');
    const boss = ERX.Enemies.create(g, { type: 'azure', x: L.centerX, y: L.sigil.y + 11 });
    g.enemies.push(boss);
    yield 1.7;
    g.warning = false;
    g.rumbleT = 0;
    // ...and out it drops
    boss.setState('drop');
    L.portal.open = false;
    yield () => (boss.state === 'stand' ? true : undefined);
    g.music(null);
    yield 0.9;
    sfx('azureGroan');                 // ...a zombie. That's it? It just stands there.
    yield 1.7;
    // then its hands go up in blue fire
    boss.igniting = true;
    sfx('azureIgnite');
    g.shake(3, 0.4);
    yield 0.9;
    g.titleCard = { title: 'AZURE ZOMBIE', sub: 'The Blue Flame That Walks', t: 0, dur: 3.2, color: '#8ad8ff' };
    sfx('azureSting');
    yield 2.0;
    // its health bar drops down into place
    g.bossBar = { name: 'AZURE ZOMBIE', boss, t: 0, chip: 1, color: '#2a6aff', notch: 0.5 };
    yield 0.5;
    sfx('bossBarDrop');
    g.shake(2, 0.2);
    yield 0.4;
    g.music('azure');
    g.releaseCamera();
    boss.begin();
    g.lockControls(false);
  }
  /** After the finale: the seal on the far passage cracks and falls away... and there's a light on, through there. */
  function* abyssAfter(g) {
    const L = g.level, p = g.player;
    g.lockControls(true);
    p.vx = 0;
    g.saveFlag('bossDefeated');
    yield 1.0;
    L.unseal(g);
    L.bossDone = true;
    g.shake(3, 0.6);
    yield 0.7;
    g.focusCamera(L.passage.x + 60, L.floorY - 50);   // (a building site, round the corner. With a lift in it.)
    yield 2.2;
    g.releaseCamera();
    g.setObjective('THROUGH THE PASSAGE  →');
    g.lockControls(false);
  }

  // ================================================== THE LIFT, and what happens when you press the button
  /** The big red button. (It says DO NOT PRESS.) The gate comes down, the lift starts up... and doesn't stop (js/game/sky-launch.js). */
  function* liftGo(g) {
    const L = g.level, p = g.player, Lf = L.lift;
    g.lockControls(true);
    g.objective = null;
    p.vx = 0;
    p.placeAt(Lf.x - 7, L.floorY);
    p.facing = 1;
    p.cinePose = 'idle';
    yield 0.35;
    Lf.press = 1; Lf.state = 'pressed';
    sfx('liftButton');                                        // click.
    yield 1.2;                                                // ...nothing.
    sfx('liftClunk'); g.shake(2, 0.25);                       // CLANG: the gate comes down
    Lf.state = 'closing';
    yield () => (Lf.state === 'shut' ? true : undefined);
    yield 0.6;
    sfx('liftHum');                                           // and up it goes. Nice and slow.
    Lf.carry = true; Lf.vy = 12; Lf.state = 'rising';
    yield 1.5;
    sfx('liftLurch'); g.shake(3, 0.4);                         // ...a bit faster...
    yield 1.0;
    Lf.carry = false; p.cinePose = null;
    g.music(null);
    g.startLiftRide();                                        // ...a LOT faster
  }

  // ================================================== NORMALTON (js/game/level-village.js)
  /** Everyone in Normalton: how they look, and what they've got to say. (The level says where they stand.) */
  const VILLAGERS = {
    bramble: {
      name: 'MAYOR BRAMBLE', pitch: 0.85,
      look: { gender: 0, skin: 0, hair: 8, hairColor: 5, eyes: 4, outfit: 6, outfitColor: 3, pants: 5, hat: 'top' },
      lines: [
        ['Welcome to Normalton! Population: thirty-one.', 'Thirty-two, counting the goose. Thirty-one, since the goose went missing.'],
        ['That crater in the square? Leave it. It is a landmark now.', 'We shall put a little fence round it. Possibly a plaque.'],
        ['The new road east is nearly finished! Any day now.', 'The construction slime has been saying "any day now" for... some time.'],
        ['That stone in the square, with the crystal floating over it? The slime calls it a "Checkshot".', 'Nobody knows who put it there. We polish it on Sundays.'],
      ],
    },
    rosa: {
      name: 'BAKER ROSA', pitch: 1.2,
      look: { gender: 1, skin: 1, hair: 4, hairColor: 1, eyes: 0, outfit: 5, outfitColor: 10, pants: 1, hat: 'chef' },
      lines: [
        ['Fresh buns! Still warm!', 'Not for you, though, dear. You would only land on them.'],
        ['Fenwick has finally opened his shop! After eleven years!', 'I was so surprised I dropped a whole tray. Buns everywhere. The chickens were delighted.'],
        ['I bake two hundred buns every morning. Two hundred.', 'Nobody has ever asked who eats them all. Please do not be the first.'],
        ['You came down so hard my souffle fell.', 'Every souffle in the village fell. All at once. It was a very sad noise.'],
      ],
    },
    fenwick: {
      name: 'FENWICK', pitch: 0.95,
      look: { gender: 0, skin: 3, hair: 0, hairColor: 0, eyes: 1, outfit: 3, outfitColor: 4, pants: 1, hat: 'cap' },
      lines: [
        ['Goods! Wares! Things! All perfectly normal.', 'The shop was meant to open eleven years ago. Then YOU walked in. So I suppose it is open now.'],
        ['I sell potions. Well. Coloured water. In potion bottles.', 'The food is real, though. I promise. Mostly.'],
      ],
    },
    greta: {
      name: 'GRETA', pitch: 1.0,
      look: { gender: 1, skin: 4, hair: 3, hairColor: 0, eyes: 0, outfit: 3, outfitColor: 0, pants: 2 },
      lines: [['Holt makes it, I sell it.', 'He is my little brother. He is seven feet tall. He is still my little brother.']],
    },
    tobias: {
      name: 'OLD TOBIAS', pitch: 0.75,
      look: { gender: 0, skin: 0, hair: 8, hairColor: 6, eyes: 4, outfit: 1, outfitColor: 10, pants: 3 },
      lines: [
        ['Zzz... five more minutes, Mum... zzz...'],
        ['Zzz... no, Gerald... that is MY bun... zzz...'],
        ['*SNORT*', '...Wha? Oh. It is you. The one from the sky.', '...Zzz.'],
        ['Zzz... thirty-one... always thirty-one... zzz...'],
      ],
    },
    pip: {
      name: 'NANA PIP', pitch: 1.35,
      look: { gender: 1, skin: 0, hair: 4, hairColor: 6, eyes: 3, outfit: 2, outfitColor: 6, pants: 6, hat: 'scarf' },
      lines: [
        ['Ooh, a falling star! And it landed! How lovely, dear.', 'In my day the stars stayed UP. That was rather the point of them.'],
        ['Sit down, dear. You look like you have fallen a very long way.', '...Oh. You have. Well. Sit down anyway.'],
        ['That slime at the gate? Lovely manners. Terrible temper.', 'Wears that little hat everywhere. Even to bed, I expect.'],
      ],
    },
    molly: {
      name: 'MOLLY', pitch: 1.1,
      look: { gender: 1, skin: 2, hair: 2, hairColor: 2, eyes: 1, outfit: 5, outfitColor: 0, pants: 1 },
      lines: [
        ['Welcome to the Sleepy Goose! Best beds in Normalton.', 'Only beds in Normalton. Still the best, though.'],
        ['The goose on the sign? That was Gerald. Before he went missing.', 'We do not talk about Gerald.'],
      ],
    },
    holt: {
      name: 'HOLT THE SMITH', pitch: 0.7,
      look: { gender: 0, skin: 4, hair: 7, hairColor: 0, eyes: 0, outfit: 3, outfitColor: 7, pants: 2 },
      lines: [
        ['*CLANG*', '...Oh. Hello. Sorry. I hit things. For a living.'],
        ['You fell out of the sky and walked away?', 'Tough as an anvil, you are. I like you.'],
      ],
    },
    timmy: {
      name: 'TIMMY', pitch: 1.6,
      look: { gender: 0, skin: 1, hair: 1, hairColor: 3, eyes: 3, outfit: 1, outfitColor: 9, pants: 7 },
      lines: [
        ['WHOA! You fell out of the SKY! Do it again! DO IT AGAIN!'],
        ['When I grow up I want to fall out of the sky too.', 'Mum says I am not allowed.'],
        ['I saw a goose fly over the east road yesterday!', 'The slime would not let me go and look. It never lets ANYONE go and look.'],
      ],
    },
    clover: {
      name: 'FARMER CLOVER', pitch: 1.05,
      look: { gender: 1, skin: 2, hair: 3, hairColor: 4, eyes: 2, outfit: 4, outfitColor: 2, pants: 4, hat: 'straw' },
      lines: [
        ['Mind the chickens. They have opinions.', 'Mostly about you. Mostly bad.'],
        ['Best cabbages in all of World 1, these.', 'Only cabbages in all of World 1? Never checked.'],
        ['Heard an almighty rumble out west a while back. That whole cliff came down.', 'Opened up a nice shortcut to the meadow, mind. Through the fog. Bring a lantern.'],
      ],
    },
  };
  // (they talk the way the miners do: js/game/story-deep.js talk())
  Object.assign(ERX.Story.deep.MINERS, VILLAGERS);
  const villager = (id) => { const v = VILLAGERS[id]; return { name: v.name, color: '#ffd36a', plate: '#4a3a1a', voice: 'npc', pitch: v.pitch, speed: 44 }; };
  /** The usual: the next set of a villager's lines. */
  function* chat(g, npc) {
    const v = VILLAGERS[npc.id], set = v.lines[(npc.talkIndex || 0) % v.lines.length];
    npc.talkIndex = (npc.talkIndex || 0) + 1;
    for (const line of set) yield* say(g, villager(npc.id), line);
  }
  function done(g, npc) { if (npc) npc.talking = false; g.dialogue.close(); g.lockControls(false); }

  /** Down in Normalton: a crater in the square, everyone staring... and guess who comes down after you. */
  function* villageArrival(g) {
    const L = g.level, p = g.player;
    g.lockControls(true);
    p.vx = 0;
    g.checkpoint = { x: p.cx, y: p.feet };
    g.saveProgress('village');
    g.saveFlag('normalton');
    // everyone nearby jumps... and stares
    for (const n of g.npcs) if (n.id !== 'slime' && Math.abs(n.x - p.cx) < 280) { n.bubble = 'bang'; n.bubbleT = 1.6; n.watch = p.cx; n.stay = true; }
    sfx('villageGasp');
    yield 1.5;
    // the mayor hurries over
    const mayor = g.npcs.find((n) => n.id === 'bramble');
    if (mayor) {
      mayor.goX = p.cx + (mayor.x < p.cx ? -28 : 28); mayor.goSpeed = 40;
      yield () => (mayor.goX == null ? true : undefined);
      yield 0.3;
      yield* say(g, villager('bramble'), 'Oh! Oh my. Did you just... fall out of the SKY?');
      yield* say(g, villager('bramble'), 'Ahem. WELCOME, traveller, to Normalton! A perfectly normal village.');
      yield* say(g, villager('bramble'), 'Usually. A goose went missing last week. That was very exciting.');
    }
    // ...and then that whistle again
    const s = g.npcs.find((n) => n.id === 'slime');
    if (s) {
      g.dialogue.close();
      g.focusCamera(p.cx + 30, L.floorY - 40);
      s.hidden = false; s.x = p.cx + 46; s.y = L.floorY - 320; s.vy = 0; s.falling = true; s.goX = null; s.guard = false;
      sfx('slimeWhistle');
      yield () => (s.falling ? undefined : true);
      sfx('crash');
      g.shake(4, 0.35);
      if (mayor) { mayor.bubble = 'bang'; mayor.bubbleT = 1.2; mayor.watch = s.x; }
      yield 1.0;
      yield* say(g, SLIME(), '...You.');
      yield* say(g, SLIME(), 'You pressed the button. The BIG RED ONE. With the label on it. That said DO NOT PRESS.');
      s.angry = true;
      yield* say(g, SLIME(), 'That lift was a PROTOTYPE! It was meant to go up ONE FLOOR! ONE!', { effect: 'shake' });
      yield* say(g, SLIME(), 'And before that you killed the BOSS! Do you know how long that thing took to build?!', { effect: 'shake' });
      s.angry = false;
      yield* say(g, SLIME(), '...I rode up on the roof of the lift, by the way. Nobody asked. Nobody ever asks.');
      yield* say(g, SLIME(), 'Fine. This is Normalton. Walk around. Talk to people. Buy a bun.');
      yield* say(g, SLIME(), 'But the road out of the east gate is NOT finished. Hard hat zone. Not past me.');
      g.dialogue.close();
      g.releaseCamera();
      s.goX = L.gateX - 24; s.guard = false; s.leaving = true;   // off it hops, east, to its road (behind the gate)
    }
    for (const n of g.npcs) { n.stay = false; n.watch = null; }
    g.music('normalton');
    ERX.Audio.setAmbience('village');
    g.banner = { title: 'NORMALTON', sub: 'Population: 31. Suspiciously normal.', t: 0, dur: 4.5 };
    villageObjective(g);
    g.lockControls(false);
  }
  /** What you're meant to be doing in Normalton right now: the Checkshot, then the mayor, then the east gate. */
  function villageObjective(g) {
    const pr = g.character.progress || {};
    if (g.checkshot && !g.checkshot.on) g.setObjective('ACTIVATE THE CHECKSHOT', null, 1);
    else if (!pr.mayorTalk) g.setObjective('TALK TO THE MAYOR', null, 1);
    else if (!pr.slimeGate) g.setObjective('THROUGH THE EAST GATE  →', null, 1);
  }
  /** Back down in Normalton (from the void, through its Checkshot... or out of the lift, again): it's getting to be a habit. */
  function* villageReturn(g) {
    const p = g.player;
    g.lockControls(true);
    p.vx = 0;
    g.checkpoint = { x: p.cx, y: p.feet };
    g.saveProgress('village');
    for (const n of g.npcs) if (n.id !== 'slime' && Math.abs(n.x - p.cx) < 240) { n.bubble = 'what'; n.bubbleT = 1.3; n.watch = p.cx; }
    yield 1.1;
    for (const n of g.npcs) n.watch = null;
    g.music('normalton');
    ERX.Audio.setAmbience('village');
    g.banner = { title: 'NORMALTON', sub: 'Another crater. Lovely.', t: 0, dur: 3.5 };
    villageObjective(g);
    g.lockControls(false);
  }

  // ================================================== INSIDE: the Sleepy Goose, Fenwick's, Greta's... and Holt, at his anvil
  /** Molly, behind the bar. */
  function* mollyTalk(g, npc) {
    const M = villager('molly');
    npc.talking = true;
    yield* say(g, M, npc.met ? 'Back again, love? What can I get you?' : 'Welcome to the Sleepy Goose! Best beds in Normalton. Only beds in Normalton. Still the best, though.');
    npc.met = true;
    for (;;) {
      const i = yield* choose(g, ['Can I stay the night?', 'Tell me about Gerald.', "What's good here?", 'Bye!']);
      if (i === 0) {
        yield* say(g, M, 'Course you can! Upstairs, the bed on the left. On the house. You did fall out of the sky, after all.');
        yield* say(g, M, 'Night time only, mind. Beds get cross if you sleep in them in the day.');
        yield* say(g, M, "...That isn't true. I just like my afternoons quiet.");
        yield* say(g, M, 'A good night in that bed and you will be right as rain. Fixes anything. Bumps, bruises, falling out of the sky.');
      } else if (i === 1) {
        yield* say(g, M, "Gerald was our goose. The Sleepy Goose's goose. He slept in the window every afternoon.");
        yield* say(g, M, 'Then one morning he flew off east, over the gate. Never came back.');
        yield* say(g, M, 'We do not talk about Gerald. ...I just did. Oh dear.');
      } else if (i === 2) {
        yield* say(g, M, 'Milk. More milk. Or, if you are feeling brave: no milk.');
        yield* say(g, M, "For proper food, try Fenwick's, down the street. He's finally opened. Took him eleven years.");
      } else break;
    }
    yield* say(g, M, 'Mind how you go!');
    done(g, npc);
  }
  /** A shop (js/screens/shop.js): a word from the keeper, then the counter. The game waits while it's open. */
  function* shop(g, npc, kind, title, hello) {
    const v = villager(npc.id);
    npc.talking = true;
    if (hello && !npc.met) yield* say(g, v, hello);
    npc.met = true;
    g.dialogue.close();
    ERX.Scenes.push('shop', { game: g, kind, title, keeper: { name: v.name, color: '#ffd36a' } });
    yield 0.05;
    done(g, npc);
  }
  const fenwickTalk = (g, npc) => shop(g, npc, 'food', "FENWICK'S GOODS", 'A CUSTOMER! An actual customer! In my actual shop! Come in, come in, look around!');
  const gretaTalk = (g, npc) => shop(g, npc, 'armor', "GRETA'S ARMORY", 'Ah, the sky-faller! Holt said you might come in. He said you looked "squishy".');
  /** Holt, at the anvil: he'll hit your armor until it's better. */
  function* holtTalk(g, npc) {
    const H = villager('holt'), Inv = ERX.Inventory;
    npc.talking = true;
    if (!Inv.armorPieces(g.character).length) {
      yield* say(g, H, '*CLANG* ...Oh. Hello.');
      yield* say(g, H, 'I upgrade armor. You have not got any. I cannot upgrade your shirt.');
      yield* say(g, H, 'Greta sells it. Next door. She is my big sister. ...Do not tell her I said that nicely.');
      return done(g, npc);
    }
    yield* say(g, H, npc.met ? '*CLANG* ...You again. Want something hit?' : '*CLANG* ...Oh. Hello. Want that armor of yours hit until it is better?');
    npc.met = true;
    const i = yield* choose(g, ['Upgrade my armor.', 'Just saying hi.']);
    if (i !== 0) { yield* chat(g, npc); return done(g, npc); }
    g.dialogue.close();
    ERX.Scenes.push('shop', { game: g, kind: 'upgrade', title: "HOLT'S ANVIL", keeper: { name: VILLAGERS.holt.name, color: '#ff9a4a' } });
    yield 0.05;
    done(g, npc);
  }
  /** Old Tobias, fast asleep at his table. (He talks in his sleep.) */
  function* tobiasTalk(g, npc) {
    npc.talking = true;
    yield* chat(g, npc);
    done(g, npc);
  }

  // ---- knock knock (the houses you can't go into)
  const KNOCKED = { farm: 'A CHICKEN', cat: 'THE CAT', bakery: 'A NOTE ON THE DOOR', end: 'SOMEONE INSIDE' };
  const KNOCK_LINES = {
    farm: [['BWAK.'], ['...BWAK?'], ['BWAAAAAK!', '(The chickens seem to live here now. Farmer Clover is outside. With the other chickens.)']],
    cat: [['Mrrrow.'], ['...Mrrp.'], ['(The cat does not get up. The cat will never get up.)']],
    bakery: [['BACK IN 5 MINUTES. - Rosa', '(The note is very, very old.)']],
    end: [['We already have a goose, thank you!'], ['If this is about the crater, it was NOT us.'], ['Go away. We are having a perfectly normal day in here.']],
  };
  const KNOCK_COUNT = {};
  function* knock(g, who) {
    g.lockControls(true);
    g.player.vx = 0;
    sfx('knock');
    yield 0.9;
    const sets = KNOCK_LINES[who] || [['...']], k = KNOCK_COUNT[who] = ((KNOCK_COUNT[who] === undefined ? -1 : KNOCK_COUNT[who]) + 1);
    const sp = who === 'bakery' ? ERX.Story.cave.SIGN : { name: KNOCKED[who] || '???', color: '#c8c0a8', plate: '#3a3428', voice: who === 'cat' || who === 'farm' ? null : 'npc', pitch: 1.1, speed: 40 };
    if (who === 'farm') sfx('chickenCluck');
    for (const line of sets[Math.min(k, sets.length - 1)]) yield* say(g, sp, line);
    done(g);
  }

  // ---- the Sleepy Goose, upstairs: sleep the night away (and wake up fully healed)
  const NOTE = { name: 'A NOTE ON THE PILLOW', color: '#e8c87a', plate: '#5a3e22', voice: null, speed: 80 };
  const isNight = (tod) => tod >= 0.47 || tod < 0.02;   // (from dusk on, until just after sunrise)
  function* sleep(g, bed) {
    const L = g.level, p = g.player;
    g.lockControls(true);
    p.vx = 0;
    if (!isNight(g.worldTod || 0)) {
      sfx('read');
      yield* say(g, NOTE, 'BEDS ARE FOR NIGHT TIME. It is not night time. Come back when the sun goes down. - Molly');
      return done(g);
    }
    const i = yield* choose(g, ['Sleep until morning.', 'Not yet.']);
    g.dialogue.close();
    if (i !== 0) { g.lockControls(false); return; }
    p.placeAt(bed.x, L.floorY);
    p.vanishT = 99;                            // (you're the lump under the quilt)
    L.sleeper = { t: 0 };
    sfx('sleepJingle');
    yield 2.0;
    ERX.Scenes.transition('fade', 2.8, () => {
      g.worldTod = 0.03;                       // ...and it's morning
      L.L = ERX.World1Level.lightAt(g.worldTod);
      g.darkness = L.darknessAt();
      p.hp = p.maxHp; p.mp = p.maxMp; g.hpShown = p.hp;
    }, { silent: true });
    yield 0.05;                                // (the game waits out the fade)
    sfx('rooster');
    yield 1.6;
    L.sleeper = null;
    p.vanishT = 0;
    p.vy = -150;
    p.facing = 1;
    g.floatText(p.cx, p.y - 8, 'FULLY RESTED!', '#7af0a0');
    sfx('revive');
    yield 0.5;
    g.lockControls(false);
  }

  // ================================================== THE MAYOR: ask him anything (once the square's Checkshot is on)
  const MAYOR_Q = [
    {
      q: 'Why is this town called Normalton?',
      a: ['Because it is NORMAL! Perfectly, completely, entirely normal.', 'We voted on the name. Thirty-one votes to none. A very normal vote.', 'Before that it was called Normalton as well. We like things to stay the same.'],
      after: ['We named it ourselves, you know. "Normalton."', 'I think we were trying to convince somebody. ...Mostly ourselves.'],
    },
    {
      q: 'Why are there only 31 people here?',
      a: ['Thirty-one is a wonderful number! A prime. It cannot be divided. Much like our community.', 'We were thirty-two, once. Counting Gerald.', '...Gerald was a goose.'],
      after: ['There have always been thirty-one of us. There always will be.', '...Unless somebody seals that Pillar. Then, who knows? Perhaps there will be thirty-two.'],
    },
    {
      q: 'Who is Gerald?',
      a: ["Gerald was the Sleepy Goose's goose. He slept in Molly's window every afternoon. Sweet bird. Bit bitey.", 'One morning, he spread his wings and flew off. East. Over the gate.', 'He never came back. Molly still leaves the window open for him.'],
    },
    {
      q: "What's with the grumpy slime?",
      a: ['The construction slime? It turned up one day with a hard hat and a clipboard, and started building a road.', 'Nobody asked it to. Nobody knows who pays it. It will not say.', 'Very good at its job, though. Whatever its job is.'],
    },
    {
      q: "What's past the east gate?",
      a: ['The road east. Or it will be, once it is finished.', 'Past that? Fields. Hills. More fields.', 'Nobody goes past the east gate, really. There is simply no reason to.', '......None at all.'],
      after: ['The road. The fields. And, a very long way past them, the Pillar.', 'Go carefully.'],
    },
  ];
  function* mayorTalk(g, npc) {
    const pr = () => g.character.progress || {}, M = villager('bramble');
    npc.talking = true;
    npc.stay = true;
    // (before the Checkshot's on: the usual pleasantries)
    if (!pr().checkshotVillage) { yield* chat(g, npc); npc.stay = false; return done(g, npc); }
    if (!pr().mayorMet) {
      npc.bubble = 'bang'; npc.bubbleT = 1.2;
      yield* say(g, M, 'Ah! Our sky-faller! I see you have woken up the old stone in the square. It is GLOWING. It has never glowed before!');
      yield* say(g, M, 'Well. You must have questions. Visitors always do. Not that we get visitors. You are the first.');
      yield* say(g, M, 'Ask me anything! The mayor is always in. Mostly because there is nowhere else to be.');
      g.saveFlag('mayorMet');
    } else yield* say(g, M, pr().mayorTalk ? 'Still here? Good. Ask away.' : 'Back again! Ask away. I have all day. I have had all day for a very long time.');
    for (;;) {
      const labels = MAYOR_Q.map((q) => q.q);
      labels.push(pr().mayorTalk ? 'Tell me about the Julforic Pillar.' : '{red}What was in that cave?{/}', 'Goodbye.');
      const i = yield* choose(g, labels);
      if (i === labels.length - 1) break;
      if (i < MAYOR_Q.length) {
        const q = MAYOR_Q[i];
        for (const line of pr().mayorTalk && q.after ? q.after : q.a) yield* say(g, M, line);
        continue;
      }
      if (pr().mayorTalk) {
        yield* say(g, M, 'Far to the east, past the end of the road. Its light makes this world shine... and its shadow makes the monsters.');
        yield* say(g, M, 'Seal it, and perhaps the light will finally be just light. And the dark will just be dark.');
        yield* say(g, M, 'And be careful. I did mention careful?');
        continue;
      }
      yield* caveStory(g, npc);
      return;
    }
    yield* say(g, M, 'Good day to you! Do mind the crater.');
    npc.stay = false;
    done(g, npc);
  }

  /** "What was in that cave?" The mayor goes very quiet... and tells you what this world really is. */
  function* caveStory(g, npc) {
    const M = villager('bramble'), V = VILLAGERS.bramble;
    // a cave? what cave?
    npc.bubble = 'what'; npc.bubbleT = 1.6;
    yield* say(g, M, '...Cave?');
    yield* say(g, M, 'What cave?');
    yield* say(g, M, 'Oh, you mean the OLD cave? Out west, past the fog? That has been boarded up since before I was mayor.');
    yield* say(g, M, 'Why? Did something happen in there?');
    yield* choose(g, ['There was a monster with blue eyes in the cave and it sent me down to the depths below the village. Then I had to fight a zombie with blue flames.']);
    // the music stops dead, and so does he
    g.dialogue.close();
    ERX.Audio.cutMusic();
    ERX.Audio.setAmbience(null);
    npc.watch = g.player.cx;
    yield 2.6;
    yield* say(g, M, '......', { speed: 4 });
    yield* say(g, M, 'Did it... say anything? Before it dropped you?', { speed: 30 });
    yield* choose(g, ['It just told me to "Leave".']);
    g.dialogue.close();
    yield 1.4;
    yield* say(g, M, '...Leave.', { speed: 14 });
    yield* say(g, M, 'Of course it did.');
    // he takes off his hat
    npc.look = Object.assign({}, V.look, { hat: undefined });
    sfx('cloth');
    yield 1.0;
    yield* say(g, M, 'Have you noticed how bright everything is here? The grass. The sky. The flowers.');
    yield* say(g, M, 'All just a little too bright? Like a painting somebody keeps touching up?');
    yield* say(g, M, 'That is the light of the {red}JULFORIC PILLAR{/}.');
    yield* say(g, M, 'It stands far to the east, past the end of the road. It was there before the village. Before anything.');
    yield* say(g, M, 'Its light gets into everything. The colours. The weather. The people. It makes this whole world shine like a new coin.');
    yield* say(g, M, 'But a light that bright throws a shadow just as deep.');
    yield* say(g, M, 'The light is up here, with us. The shadow is down there. Under the village. Under everything.');
    yield* say(g, M, 'That is where the monsters come from. The things in the dark. The blue fire. That is where YOU were.');
    yield 0.6;
    yield* say(g, M, 'This world is not sunshine and rainbows, my friend. It only looks that way.');
    yield* say(g, M, 'And Normalton is not exactly... "normal".');
    yield* say(g, M, 'There have always been thirty-one of us. Always. Nobody is ever born. Nobody grows old. Nobody ever leaves.');
    yield* say(g, M, 'Rosa bakes two hundred buns every morning. By the next morning, they are gone. Nobody has ever eaten one.');
    yield* say(g, M, 'I have been the mayor of this village for three hundred and twelve years.');
    yield* say(g, M, 'The only one who ever left was Gerald. He flew east one morning, towards the Pillar. He never came back.');
    yield* say(g, M, 'And whatever is behind those bars in the old cave... I think it has been telling people to leave for a very long time.');
    const i = yield* choose(g, ["I was actually sent here to go seal the Julforic Pillar in this world, so I'll go seal it.", "Once I'm fully prepared, I can go seal the Julforic Pillar in this world."]);
    if (i === 0) {
      yield* say(g, M, '...Seal it.');
      yield* say(g, M, 'Do you know, I have waited three hundred and twelve years for somebody to say that.');
    } else {
      yield* say(g, M, 'Prepared. Yes. Good. That is the most sensible thing anybody has said to me in three hundred years.');
      yield* say(g, M, 'Buy some armor from Greta. Have Holt hit it until it is better. Eat something. Sleep at the Sleepy Goose.');
    }
    npc.look = null;                            // (the hat goes back on)
    yield 0.4;
    yield* say(g, M, 'Then I shall open the east gate for you.');
    yield* say(g, M, 'But listen to me. The road east is dangerous. More dangerous than the cave. More dangerous than the dark under the village.');
    yield* say(g, M, 'Whatever is out there has had a very long time to get ready for you.');
    yield* say(g, M, 'So be careful. Be VERY careful.');
    yield* say(g, M, 'Normalton does not get many visitors. We would quite like to keep this one.');
    g.dialogue.close();
    g.saveFlag('mayorTalk');
    // the music comes back...
    g.music('normalton');
    ERX.Audio.setAmbience('village');
    yield 0.8;
    // ...and the east gate swings open
    yield* say(g, M, 'OPEN THE EAST GATE!', { effect: 'shake' });
    g.dialogue.close();
    yield* openGate(g);
    npc.stay = false; npc.watch = null;
    done(g, npc);
  }
  /** The camera goes over to the east gate: the bar lifts, the doors swing open. (They stay open.) */
  function* openGate(g) {
    const L = g.level;
    if (!L.gate) return;
    g.lockControls(true);
    g.focusCamera(L.gate.x0 + 18, L.floorY - 50);
    yield 1.9;
    L.openGate(g);
    yield () => (L.gate.state === 'open' ? true : undefined);
    g.saveFlag('gatesOpen');
    yield 1.3;
    g.releaseCamera();
    yield 0.9;
    g.setObjective('THROUGH THE EAST GATE  →', null, 1);
  }

  /** You walk up to the open gate... *whistle* ...guess who. */
  function* slimeGate(g) {
    const L = g.level, p = g.player, s = g.npcs.find((n) => n.id === 'slime');
    g.lockControls(true);
    p.vx = 0;
    if (s) {
      g.focusCamera(L.slimeX - 24, L.floorY - 40);
      s.hidden = false; s.x = L.slimeX; s.y = L.floorY - 320; s.vy = 0; s.falling = true; s.goX = null; s.guard = false; s.leaving = false;
      sfx('slimeWhistle');
      yield () => (s.falling ? undefined : true);
      sfx('crash');
      g.shake(4, 0.35);
      s.guard = true;
      yield 1.0;
      yield* say(g, SLIME(), "...Oh, no you don't.");
      yield* say(g, SLIME(), 'The mayor opened the gate. How NICE. For YOU.');
      s.angry = true;
      yield* say(g, SLIME(), 'The road is STILL. NOT. FINISHED!', { effect: 'shake' });
      yield* say(g, SLIME(), 'Do you see this hat? This is a HARD HAT. This is a HARD HAT ZONE.', { effect: 'shake' });
      s.angry = false;
      yield* say(g, SLIME(), 'Seal the Pillar? Lovely. Great. Not on MY road. Not until it is finished.');
      yield* say(g, SLIME(), 'Come back when the road is done. Which will be... soon. Ish.');
      yield* say(g, SLIME(), '...Go and buy a bun or something.');
      g.dialogue.close();
      g.releaseCamera();
    }
    g.saveFlag('slimeGate');
    if (g.objective) g.completeObjective();
    g.lockControls(false);
  }

  // (the villagers who have more to say than a line or two)
  VILLAGERS.molly.talk = mollyTalk;
  VILLAGERS.fenwick.talk = fenwickTalk;
  VILLAGERS.greta.talk = gretaTalk;
  VILLAGERS.holt.talk = holtTalk;
  VILLAGERS.tobias.talk = tobiasTalk;
  VILLAGERS.bramble.talk = mayorTalk;

  // ================================================== the slime, if you insist on talking to it
  const SLIME_LINES = {
    deeper: [
      ['The crystals hum. All night. I have not slept in WEEKS.'],
      ['You fell. Through. The FLOOR. Who even does that.'],
    ],
    village: [
      ['Still not finished. The road, I mean. Not this sentence.'],
      ['There is a CRATER in the SQUARE. The mayor wants a PLAQUE.'],
      ['You went up four thousand metres in a prototype lift. And came back down without it.', 'Show-off.'],
      ['The east road goes to... places. Unfinished places. Go and pet a chicken.'],
      ['The mayor opened the gate. The MAYOR. Who does he think he is? ...The mayor. Fine.'],
      ['Somewhere out there is a goose called Gerald. He is not your problem.', 'He is also not past me.'],
    ],
  };
  function* slimeTalk(g, n) {
    const lines = SLIME_LINES[g.levelId === 'village' ? 'village' : 'deeper'];
    n.talk = ((n.talk === undefined ? -1 : n.talk) + 1) % lines.length;
    n.angry = true;
    for (const line of lines[n.talk]) yield* say(g, SLIME(), line);
    n.angry = false;
    g.dialogue.close();
    g.lockControls(false);
  }

  ERX.Story.world = { vrd, jump, world1Arrival, checkshot, theBars, deeperArrival, trialStart, trialDone, skullCollapse, abyssArrival, abyssBoss, abyssAfter, liftGo, villageArrival, villageReturn, villageObjective, slimeTalk, slimeGate, knock, sleep, openGate, VILLAGERS, EYES };
})(window.ERX = window.ERX || {});
