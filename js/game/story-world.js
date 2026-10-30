/*
 * STORY: THE WORLDS.
 *
 *   The first time you try to jump into a world, the Voice yanks you back
 *   (a telekinesis device, obviously) to give you the VOID RECALL DEVICE.
 *   After that, every jump drops you into the world from the sky (see
 *   js/game/world-fall.js). World 1: you land, the grumpy slime drops in
 *   and blocks the way, and the first Checkshot lets you recall to the void.
 */
(function (ERX) {
  'use strict';

  const sfx = (n, o) => ERX.Audio.playSfx(n, o);
  const { SLIME } = ERX.Story.deep;
  const FIG = () => ERX.Story.void.FIG;

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

  // ================================================== WORLD 1: you're down. guess who.
  function* world1Arrival(g) {
    const p = g.player;
    g.lockControls(true);
    g.saveFlag('world1');
    yield 0.9;
    g.dropBlocker(p.cx + 76);             // the slime falls out of the sky right in front of you
    yield () => (g.blocker && g.blocker.landed ? true : undefined);
    sfx('crash');
    g.shake(4, 0.35);
    yield 1.0;
    yield* say(g, SLIME, '...');
    yield* say(g, SLIME, "Oh. It's YOU. Again.");
    if (g.element() && g.element().id === 'chaos') yield* say(g, SLIME, '...And you brought the flickering. Wonderful.');
    g.blocker.angry = true;
    yield* say(g, SLIME, 'World 1? Not finished yet. Be patient >:(', { effect: 'shake' });
    yield* say(g, SLIME, 'Nobody gets past me. Nobody. Not even you. ESPECIALLY not you.');
    g.blocker.angry = false;
    yield* say(g, SLIME, "You can look around, I guess. The view IS nice. Don't touch anything.");
    yield* say(g, SLIME, "When you're done, go find that Checkshot thing and use your fancy recall gadget. Shoo.");
    g.lockControls(false);
    g.setObjective('FIND THE CHECKSHOT  <-', null, 1);
  }

  // ================================================== the slime, if you insist on talking to it
  const SLIME_LINES = [
    ['Still not finished. Still being patient. Be like me.'],
    ['Go away.', '...', 'I said go AWAY.'],
    ["You know what's past me? NOTHING. Yet. Construction. Very dangerous. Hard hats."],
    ['I am not a door. Stop pressing that button at me.'],
    ["The Voice says it's 'definitely almost ready'. The Voice says a lot of things."],
    ['Nice landing, by the way. You left a crater. Who is fixing that? Me. I am.'],
  ];
  function* slimeTalk(g) {
    const bl = g.blocker;
    bl.talk = ((bl.talk === undefined ? -1 : bl.talk) + 1) % SLIME_LINES.length;
    bl.angry = true;
    for (const line of SLIME_LINES[bl.talk]) yield* say(g, SLIME, line);
    bl.angry = false;
    g.lockControls(false);
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

  ERX.Story.world = { vrd, jump, world1Arrival, slimeTalk, checkshot, SLIME_LINES };
})(window.ERX = window.ERX || {});
