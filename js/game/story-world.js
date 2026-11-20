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
 *   slam on and a boss is approaching. Or would be. If it were finished.
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
    g.objective = null;
    p.vx = 0;
    p.facing = 1;
    g.music(null);
    yield 0.4;
    g.startLaunch();                      // up, up... into the light
    yield 2.05;
    g.enterWorld(1);                      // 2 s of black, then the portal (world-fall.js)
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
      if (ERX.Items.has(g.character, 'vrd')) g.thinkAloud('The VRD is buzzing.', '#c89aff');
      yield 0.6;
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
    g.startCaveFall();
  }

  // ================================================== THE DEEPER ENDS: you land. guess who.
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
    yield 2.8;
    // ...and who should drop in
    const s = g.npcs.find((n) => n.id === 'slime');
    if (s) {
      s.hidden = false;
      s.x = p.cx + 64; s.y = L.floorY - 240; s.vy = 0; s.falling = true; s.goX = null;
      yield () => (s.falling ? undefined : true);
      sfx('crash');
      g.shake(4, 0.35);
      yield 1.0;
      yield* say(g, SLIME(), '...');
      yield* say(g, SLIME(), 'You. AGAIN.');
      yield* say(g, SLIME(), 'Did you just fall through the FLOOR? From WORLD 1?');
      s.angry = true;
      yield* say(g, SLIME(), 'Something told you to LEAVE, and you went DOWN instead. Unbelievable.', { effect: 'shake' });
      s.angry = false;
      yield* say(g, SLIME(), "This is the Deeper Ends. It's deeper. It's darker. And the very bottom of it is NOT finished.");
      yield* say(g, SLIME(), "Look around if you must. Don't touch the crystals. They hum. And stay OUT of the Trial.");
      yield* say(g, SLIME(), "Now if you'll excuse me, I have somewhere to be. Somewhere important. Do NOT follow me.");
      g.dialogue.close();
      s.goX = L.slimeExitX;            // off it hops (and then it's gone: it has somewhere to be)
      s.leaving = true;
    }
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
    g.music('onward');
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
  /** Out in the middle: the lights slam on, the warning goes up, the music kicks in... and then the slime drops in. */
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
    g.rumble(5);
    yield 5.4;
    // ...from above?
    const s = g.npcs.find((n) => n.id === 'slime');
    if (s) {
      s.hidden = false; s.x = L.centerX + 10; s.y = L.floorY - 300; s.vy = 0; s.falling = true; s.goX = null;
      sfx('slimeWhistle');
      yield () => (s.falling ? undefined : true);
    }
    // THUD. (and the needle comes off the record)
    g.music(null);
    sfx('recordScratch');
    sfx('crash');
    g.warning = false;
    g.rumbleT = 0;
    g.shake(4, 0.35);
    yield 1.1;
    if (!s) { g.releaseCamera(); g.lockControls(false); return; }
    yield* say(g, SLIME(), '...');
    s.angry = true;
    yield* say(g, SLIME(), 'NO. Nope. Turn it OFF.', { effect: 'shake' });
    s.angry = false;
    yield* say(g, SLIME(), "The boss isn't here yet.");
    const c = yield* choose(g, ['Then why the WARNING?', "Who's the boss?"]);
    if (c === 0) {
      yield* say(g, SLIME(), 'Motion sensor. Somebody walked into the middle of the BOSS ARENA.');
      yield* say(g, SLIME(), 'Somebody who is NOT the boss.');
    } else {
      yield* say(g, SLIME(), 'Classified.');
      yield* say(g, SLIME(), "...Fine, I don't know. Nobody tells me anything. I wear the hard hat and I stand where they point.");
    }
    yield* say(g, SLIME(), 'And how did you even GET down here? You fell? AGAIN?');
    yield* say(g, SLIME(), 'Through the floor of skulls. You walked on the skulls. EVERYBODY walks on the skulls.');
    s.angry = true;
    yield* say(g, SLIME(), "Wait here if you like. The boss comes when it's READY. And do NOT touch the lava.", { effect: 'shake' });
    s.angry = false;
    yield* say(g, SLIME(), "It's black. Black lava is the WORST lava.");
    g.dialogue.close();
    g.releaseCamera();
    s.goX = L.slimeX;
    g.saveFlag('abyssIntro');
    g.lockControls(false);
  }

  // ================================================== the slime, if you insist on talking to it
  const SLIME_LINES = {
    deeper: [
      ['The crystals hum. All night. I have not slept in WEEKS.'],
      ['You fell. Through. The FLOOR. Who even does that.'],
      ['Blue eyes? ...Never heard of them.', '...', 'Go away.'],
    ],
    abyss: [
      ['The boss is late. Bosses are ALWAYS late. It is a whole thing with them.'],
      ['When is it coming? Do I look like I carry a calendar?', 'I carry a hard hat. That is ALL I carry.'],
      ['You walked on the skulls. The skulls fell. You fell.', 'You know that is not normal, right? Most people take the STAIRS.'],
      ['Stop standing in the middle. That is where the BOSS stands.'],
      ['The lights stay on now. Thanks to YOU. Do you know what purple fire costs down here?'],
    ],
  };
  function* slimeTalk(g, n) {
    const lines = SLIME_LINES[g.levelId === 'abyss' ? 'abyss' : 'deeper'];
    n.talk = ((n.talk === undefined ? -1 : n.talk) + 1) % lines.length;
    n.angry = true;
    for (const line of lines[n.talk]) yield* say(g, SLIME(), line);
    n.angry = false;
    g.dialogue.close();
    g.lockControls(false);
  }

  ERX.Story.world = { vrd, jump, world1Arrival, checkshot, theBars, deeperArrival, trialStart, trialDone, skullCollapse, abyssArrival, abyssBoss, slimeTalk, EYES };
})(window.ERX = window.ERX || {});
