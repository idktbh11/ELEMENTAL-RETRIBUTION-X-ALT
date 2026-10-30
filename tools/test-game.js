/*
 * End-to-end test of the first gameplay section (the cave + tutorial).
 *
 *   node tools/test-game.js            (Node 22+, Chrome or Edge)
 *   node tools/test-game.js --shots    (saves screenshots to tools/screenshots)
 *
 * Plays through the whole sequence with real key presses: wake up, walk,
 * jump, read a sign, enter the arena, talk to the Voice, do every tutorial
 * task, open the gates and reach the end of the current content.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp.js');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file:///' + ROOT.replace(/\\/g, '/') + '/index.html?scene=sky&seed=2';
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(__dirname, 'screenshots');
if (SHOTS) fs.mkdirSync(SHOT_DIR, { recursive: true });

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log((ok ? '  PASS ' : '  FAIL ') + name + (!ok && detail !== undefined ? '  -> ' + JSON.stringify(detail) : ''));
}

(async () => {
  console.log('ELEMENTAL RETRIBUTION X — gameplay test\n');
  const b = await launch({ width: 1920, height: 1080 });
  const ev = (e) => b.eval(e);
  const G = 'ERX.Scenes.find("game")';
  const waitFor = async (expr, ms = 5000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await sleep(80); }
    return false;
  };
  const shot = async (n) => { if (SHOTS) await b.screenshot(path.join(SHOT_DIR, 'game-' + n + '.png')); };
  /** Click through dialogue until a choice appears (or the dialogue ends). */
  const advance = async (maxSteps = 60) => {
    for (let i = 0; i < maxSteps; i++) {
      const st = await ev(`(() => { const d = ${G}.dialogue; return d.active ? d.mode : (${G}.script ? 'busy' : 'none'); })()`);
      if (st === 'choose') return 'choose';
      if (st === 'none') return 'none';
      if (st === 'say') { await b.key('Enter', { wait: 30 }); }
      else if (await ev(`!!(${G}.objective && ${G}.objective.doneT === 0 && ${G}.player.controls)`)) return 'task';
      await sleep(120);
    }
    return 'timeout';
  };
  const pick = async (i) => {
    for (let k = 0; k < i; k++) await b.key('ArrowDown', { wait: 40 });
    await sleep(300);
    await b.key('Enter');
    await sleep(200);
  };

  try {
    await b.viewport(1920, 1080);
    await b.goto(URL);
    await waitFor('!!(window.ERX && ERX.Game && ERX.Game.ready)');
    await ev("localStorage.clear(); ERX.Saves.load(); ERX.Saves.create('Hero', {gender:1,skin:1,hair:3,hairColor:7,eyes:2,outfit:0,outfitColor:2,pants:3}); true");
    await sleep(1500);
    await b.key('Enter');
    await waitFor("ERX.Scenes.top().state === 'menu' && ERX.Scenes.top().buttonsT > 0.6");
    await b.key('Enter');
    await waitFor("ERX.Scenes.top().id === 'characters' && ERX.Scenes.top().appearT >= 1");
    await b.key('Enter');
    console.log('[waking up]');
    check('PLAY on a character starts the game', await waitFor(`ERX.Scenes.top().id === 'game'`, 4000));
    check('the menu world stops rendering behind the game', await ev('ERX.Scenes.worldHidden'));
    check('the game starts with the player lying down', await ev(`${G}.player.lying === true && ${G}.state === 'intro'`));
    await waitFor(`${G}.state === 'waking'`, 4000);
    await shot('01-wake');
    check('controls are locked while asleep', await ev(`${G}.player.controls === false`));
    for (let i = 0; i < 100 && (await ev(`${G}.state`)) === 'waking'; i++) await b.key('Space', { wait: 15 });
    check('mashing the key wakes the player up (bounce!)', await ev(`${G}.state === 'bounce' || ${G}.state === 'play'`));
    check('gameplay begins after landing', await waitFor(`${G}.state === 'play' && ${G}.player.controls`, 3000));
    await shot('02-awake');

    console.log('[movement]');
    const x0 = await ev(`${G}.player.x`);
    await b.hold('KeyD', 700);
    check('walking right moves the player', (await ev(`${G}.player.x`)) > x0 + 30);
    await b.down('Space'); await sleep(120);
    check('jumping leaves the ground', await ev(`${G}.player.vy < 0 && !${G}.player.onGround`));
    await b.up('Space');
    await waitFor(`${G}.player.onGround`, 2000);
    const dx0 = await ev(`${G}.player.x`);
    await b.key('ShiftLeft', { wait: 250 });
    check('dashing bursts forward', (await ev(`${G}.player.x`)) > dx0 + 25);
    await sleep(300);

    console.log('[signs]');
    await ev(`${G}.player.placeAt(16 * 16 + 8, 19 * 16); true`);
    await sleep(300);
    check('standing at a sign shows a read prompt', await ev(`!!${G}.prompt`));
    await b.key('KeyE');
    check('USE reads the sign', await waitFor(`${G}.dialogue.active && ${G}.dialogue.speaker.name === 'SIGN'`, 2000));
    await shot('03-sign');
    await advance(5);
    check('the sign closes and control returns', await waitFor(`!${G}.dialogue.active && ${G}.player.controls`, 2000));

    console.log('[darkness]');
    const d0 = await ev(`${G}.level.darknessAt(10 * 16, false)`);
    const d1 = await ev(`${G}.level.darknessAt(100 * 16, false)`);
    check('the cave starts bright and gets darker', d0 < 0.15 && d1 > 0.6, { d0, d1 });
    await ev(`${G}.player.placeAt(100 * 16, 19 * 16); true`);
    await sleep(1500);
    await shot('04-dark');

    console.log('[platforms]');
    await ev(`${G}.player.placeAt(81 * 16, 21 * 16); ${G}.player.facing = 1; true`);
    await sleep(250);
    await b.down('KeyD'); await sleep(80); await b.down('Space'); await sleep(380); await b.up('Space'); await sleep(250); await b.up('KeyD');
    await waitFor(`${G}.player.onGround`, 2000);
    check('the first cave platform is reachable from the hollow floor', await ev(`${G}.player.onPlatform || ${G}.player.feet < 21 * 16`), await ev(`[${G}.player.x, ${G}.player.feet]`));
    await ev(`${G}.player.placeAt(84 * 16, 19 * 16); ${G}.player.facing = 1; true`);
    await sleep(300);
    await b.down('KeyD'); await sleep(60); await b.down('Space'); await sleep(380); await b.up('Space'); await sleep(250); await b.up('KeyD');
    await waitFor(`${G}.player.onGround`, 2000);
    check('...and the next one is reachable from there', await ev(`${G}.player.feet <= 17 * 16 + 0.5`), await ev(`[${G}.player.x, ${G}.player.feet]`));

    console.log('[arena]');
    await ev(`${G}.player.placeAt(124 * 16, 19 * 16); true`);
    await b.hold('KeyD', 900);
    check('entering the arena starts the cutscene', await waitFor(`${G}.stageName === 'arena' && !!${G}.script`, 2000));
    check('controls lock during the cutscene', await ev(`${G}.player.controls === false`));
    check('the metal gates slam shut', await waitFor(`${G}.gates.left.amount === 1 && ${G}.gates.right.amount === 1`, 3000));
    check('the arena lights up', await waitFor(`${G}.arenaLit`, 3000));
    check('the fake boss warning appears', await waitFor(`${G}.warning`, 4000));
    await shot('05-warning');
    check('a training dummy spawns (with confetti)', await waitFor(`!!${G}.dummy && ${G}.confetti.count > 20`, 7000));
    await sleep(500);
    await shot('06-dummy');
    check('the Voice starts talking', await waitFor(`${G}.dialogue.active && ${G}.dialogue.speaker.name === '???'`, 6000));
    check('goofy music plays for the Voice', await ev("ERX.Audio.music.wanted === 'voice'"));
    check('first choice appears', (await advance()) === 'choose');
    await shot('07-choice');
    check('there are three answers', (await ev(`${G}.dialogue.choices.length`)) === 3);
    await pick(1); // "I think you brought me here."
    await advance();
    check('the Voice snaps, then offers the follow-up line', await ev(`${G}.dialogue.mode === 'choose' && /Who else/.test(${G}.dialogue.choices[0])`));
    await pick(0);

    console.log('[tutorial]');
    check('tutorial: walking task', (await advance()) === 'task' && /WALK/.test(await ev(`${G}.objective.label`)));
    await shot('08-task');
    await b.hold('KeyA', 700); await b.hold('KeyD', 700);
    check('tutorial: jump task', (await advance()) === 'task' && /JUMP/.test(await ev(`${G}.objective.label`)));
    for (let i = 0; i < 3; i++) { await b.key('Space', { wait: 30 }); await waitFor(`${G}.player.onGround`, 2000); await sleep(150); }
    check('tutorial: platform task', (await advance()) === 'task' && /PLATFORM/.test(await ev(`${G}.objective.label`)));
    // jump onto the platform for real (no teleporting onto it)
    await ev(`(() => { const g = ${G}; g.player.placeAt(126 * 16, g.level.arena.floorY); g.player.facing = 1; return true; })()`);
    await sleep(200);
    await b.down('KeyD'); await sleep(150); await b.down('Space'); await sleep(380); await b.up('Space'); await sleep(450); await b.up('KeyD');
    await sleep(300);
    check('a real jump reaches the arena platform', await ev(`${G}.player.stats.platform === true`), await ev(`[${G}.player.x, ${G}.player.feet]`));
    check('tutorial: dash task', (await advance()) === 'task' && /DASH/.test(await ev(`${G}.objective.label`)));
    for (let i = 0; i < 2; i++) { await b.key('ShiftLeft', { wait: 30 }); await sleep(700); }
    check('tutorial: attack task', (await advance()) === 'task' && /HIT/.test(await ev(`${G}.objective.label`)));
    await ev(`(() => { const g = ${G}; g.player.placeAt(g.dummy.x - 16, g.level.arena.floorY); g.player.facing = 1; return true; })()`);
    await sleep(300);
    for (let i = 0; i < 7; i++) { await b.key('KeyJ', { wait: 30 }); await sleep(330); }
    check('punching the dummy registers hits', (await ev(`${G}.dummy.hits`)) >= 6);
    await shot('09-punch');
    check('tutorial: block task', (await advance()) === 'task' && /BLOCK/.test(await ev(`${G}.objective.label`)));
    check('the dummy throws bolts', await waitFor(`${G}.bolts.length > 0`, 3000));
    await ev(`(() => { const g = ${G}; g.player.placeAt(g.dummy.x - 50, g.level.arena.floorY); g.player.facing = 1; return true; })()`);
    await b.down('KeyK');
    await waitFor(`${G}.player.stats.blocks >= 3`, 9000);
    await shot('10-block');
    await b.up('KeyK');
    check('blocking deflects bolts', (await ev(`${G}.player.stats.blocks`)) >= 3);
    await waitFor(`!${G}.objective || ${G}.objective.doneT > 0 || !/BLOCK/.test(${G}.objective.label)`, 3000);   // let the BLOCK task finish first
    check('tutorial: skill tree task', (await advance()) === 'task' && /SKILL/.test(await ev(`${G}.objective.label`)));
    check('the Voice gave a skill point', (await ev(`${G}.character.skillPoints`)) === 1);
    await b.key('KeyT');
    check('the skill tree opens', await waitFor("ERX.Scenes.top().id === 'skills' && ERX.Scenes.top().appearT >= 1", 2000));
    check('the element branch is locked', await ev("ERX.Scenes.top().elementRect !== undefined"));
    await shot('11-skills');
    await b.key('Enter');
    check('spending the point learns VITALITY 1 (+10 max HP)', await ev(`${G}.character.skills.vitality === 1 && ${G}.player.maxHp === 110 && ${G}.character.skillPoints === 0`));
    await b.key('Escape');
    await waitFor("ERX.Scenes.top().id === 'game'", 2000);
    await waitFor(`!${G}.objective || ${G}.objective.doneT > 0 || !/SKILL/.test(${G}.objective.label)`, 3000);   // let the SKILL task finish first
    check('final choice: Bet / What if I die', (await advance()) === 'choose' && /die/.test(await ev(`${G}.dialogue.choices[1]`)));
    await pick(1);
    let sawStone = false, sawGame = false;
    for (let i = 0; i < 40 && !(sawStone && sawGame); i++) {
      const txt = await ev(`${G}.dialogue.active ? (${G}.dialogue.text || '') : ''`);
      if (/IMMORTALITY STONE/.test(txt)) sawStone = true;
      if (/VIDEO GAME/.test(txt)) sawGame = true;
      await b.key('Enter', { wait: 30 });
      await sleep(150);
    }
    check('the Voice explains the Immortality Stone', sawStone);
    check('...then breaks the fourth wall (you are in a video game)', sawGame);
    await advance(30);
    check('the gates open', await waitFor(`${G}.gates.left.target === 0 && ${G}.gates.right.target === 0`, 6000));
    await advance(10);
    check('finishing the tutorial unlocks an achievement', await ev("ERX.Achievements.has('tutorial')"));
    check('...with an ACHIEVEMENT UNLOCKED banner', await ev("ERX.Achievements.popups.length > 0 && ERX.Achievements.popups[0].a.id === 'tutorial'"));
    await sleep(600);
    await shot('12b-achievement');
    check('...only once', await ev("ERX.Achievements.unlock('tutorial') === false && ERX.Achievements.popups.length === 1"));
    check('progress is saved after the tutorial', await waitFor("ERX.Saves.characters[0].progress.stage === 'tutorialDone'", 4000));
    check('the "go fight enemies" objective shows', await waitFor(`!!${G}.objective && /ENEMIES/.test(${G}.objective.label)`, 3000));
    check('upbeat music after the gates open', await ev("ERX.Audio.music.wanted === 'onward'"));
    await shot('12-gates-open');

    console.log('[pause]');
    await b.key('Escape');
    check('ESC pauses the game', await waitFor("ERX.Scenes.top().id === 'pause'", 2000));
    await shot('13-pause');
    await b.key('Enter');
    check('RESUME returns to the game', await waitFor("ERX.Scenes.top().id === 'game'", 2000));

    console.log('[monsters]');
    check('six monsters wait past the arena (slimes + bats)', await ev(`${G}.enemies.filter(e => e.zone === 'gauntlet').length === 6 && ${G}.enemies.some(e => e instanceof ERX.Enemies.Bat) && ${G}.enemies.some(e => e instanceof ERX.Enemies.Slime)`));
    check('the way deeper is sealed until they are beaten', await ev(`${G}.gates.gauntlet.target === 1`));
    // fight one slime for real
    await ev(`(() => { const g = ${G}; const s = g.enemies.find(e => e instanceof ERX.Enemies.Slime); g.enemies.forEach(e => { if (e !== s) e.x += 0; }); g.player.placeAt(s.cx - 14, g.level._groundBelow(Math.floor(s.cx / 16), 2) * 16); g.player.facing = 1; window.__slime = s; return true; })()`);
    const xp0 = await ev(`${G}.player.xp + ${G}.player.level * 1000`);
    for (let i = 0; i < 14 && !(await ev('window.__slime.dead')); i++) {
      await ev(`(() => { const g = ${G}; const s = window.__slime; g.player.facing = s.cx > g.player.cx ? 1 : -1; if (Math.abs(s.cx - g.player.cx) > 16) g.player.placeAt(s.cx - 12 * g.player.facing, g.player.feet); return true; })()`);
      await b.key('KeyJ', { wait: 30 });
      await sleep(320);
    }
    check('punching a slime kills it', await ev('window.__slime.dead'));
    check('killing monsters gives XP', (await ev(`${G}.player.xp + ${G}.player.level * 1000`)) > xp0);
    await shot('13-fight');
    // monsters fight back
    const hp0 = await ev(`${G}.player.hp`);
    await ev(`(() => { const g = ${G}; const s = g.enemies.find(e => e instanceof ERX.Enemies.Slime && !e.dead); g.player.invulnT = 0; g.player.placeAt(s.cx, s.y + s.h); return true; })()`);
    await sleep(400);
    check('monsters hurt you on contact', (await ev(`${G}.player.hp`)) < hp0);
    // bats wake up and swoop
    await ev(`(() => { const g = ${G}; const bat = g.enemies.find(e => e instanceof ERX.Enemies.Bat); g.player.placeAt(bat.cx + 20, g.level._groundBelow(Math.floor(bat.cx / 16), 2) * 16); window.__bat = bat; return true; })()`);
    check('bats wake up when you come close', await waitFor("window.__bat.state !== 'hang'", 3000));
    // finish the rest quickly
    await ev(`(() => { const g = ${G}; g.player.placeAt(g.level.gauntlet.x0 + 40, 19 * 16); g.enemies.filter(e => e.zone === 'gauntlet').forEach(e => e.hurt(999, 1, false)); return true; })()`);

    check('monsters drop gold', await waitFor('ERX.Saves.characters[0].gold > 0', 2000), await ev('ERX.Saves.characters[0].gold'));

    console.log('[the Voice returns]');
    check('clearing the monsters brings the Voice back', await waitFor(`!!${G}.script && ${G}.player.controls === false`, 4000));
    let sawSarcasm = false, sawThought = false;
    for (let i = 0; i < 40; i++) {
      const st = await ev(`(() => { const d = ${G}.dialogue; return d.active ? d.mode + '|' + (d.speaker ? d.speaker.name : '') + '|' + (d.text || '') : 'none'; })()`);
      if (/songs/.test(st)) sawSarcasm = true;
      if (/^say\|\(YOU\)/.test(st)) sawThought = true;
      if (st.startsWith('choose')) break;
      await b.key('Enter', { wait: 30 }); await sleep(140);
    }
    check('the Voice sarcastically applauds', sawSarcasm);
    check('...and you see right through it', sawThought);
    check('choices: Ok / Why is there an elevator in a cave?', await ev(`${G}.dialogue.mode === 'choose' && /elevator in a cave/.test(${G}.dialogue.choices[1])`));
    await pick(1);
    let sawNoIdea = false, sawOddFeeling = false;
    for (let i = 0; i < 40; i++) {
      const info = await ev(`(() => { const d = ${G}.dialogue; return d.active ? JSON.stringify({ t: d.text, c: d.textColor }) : 'none'; })()`);
      if (/NO idea/.test(info)) sawNoIdea = true;
      if (/odd feeling/.test(info) && /7af0e0/.test(info)) { sawOddFeeling = true; await shot('14-odd-feeling'); }
      if (info === 'none' && !(await ev(`!!${G}.script`))) break;
      await b.key('Enter', { wait: 30 }); await sleep(140);
    }
    check('the Voice has no idea why there is an elevator', sawNoIdea);
    check('your "odd feeling" line is in its own colour', sawOddFeeling);
    check('the way deeper opens', await waitFor(`${G}.gates.gauntlet.target === 0`, 3000));
    check('progress saved (enemies cleared)', (await ev('ERX.Saves.characters[0].progress.stage')) === 'enemiesCleared');

    console.log('[the Deep Ends]');
    await ev(`${G}.player.placeAt(${G}.level.transitionX - 30, 21 * 16); true`);
    await b.hold('KeyD', 700);
    check('heading deeper loads the Deep Ends', await waitFor(`${G}.levelId === 'deep' && !ERX.Scenes.busy`, 5000));
    check('Deep Ends banner + bright music', await ev(`!!${G}.banner && /DEEP ENDS/.test(${G}.banner.title) && ERX.Audio.music.wanted === 'deepends'`));
    check('progress saved (deep ends)', (await ev('ERX.Saves.characters[0].progress.stage')) === 'deepEnds');
    check('the Deep Ends are full of monsters', (await ev(`${G}.enemies.length`)) >= 12);
    await sleep(800);
    await shot('15-deep-ends');
    // talk to a miner
    await ev(`(() => { const g = ${G}; const n = g.npcs.find(n => n.id === 'gus'); g.player.placeAt(n.x - 12, n.y); return true; })()`);
    await sleep(300);
    check('miners can be talked to', await ev(`!!${G}.prompt && /TALK/.test(${G}.prompt.text)`));
    await b.key('KeyE');
    check('Miner Gus talks about how bright the cave is', await waitFor(`${G}.dialogue.active && ${G}.dialogue.speaker.name === 'MINER GUS' && /BEAUTIFUL|colour|lighting/.test(${G}.dialogue.text)`, 2000));
    await shot('16-miner');
    await advance(6);
    check('the camp has three miners', (await ev(`${G}.npcs.length`)) === 3);

    console.log('[death & the Immortality Stone]');
    await waitFor(`!${G}.script`, 3000);
    await ev(`(() => { const g = ${G}; g.player.invulnT = 0; g.player.blocking = false; g.player.takeHit(9999, g.player.cx + 10); return true; })()`);
    check('you can actually die now', await waitFor(`${G}.state === 'dead'`, 1500));
    await shot('17-dead');
    check('...and the Immortality Stone revives you', await waitFor(`${G}.state === 'play' && ${G}.player.hp === ${G}.player.maxHp && !ERX.Scenes.busy`, 6000));

    console.log('[mining camp platforms]');
    await waitFor(`!${G}.script`, 3000);
    await ev(`${G}.player.placeAt(66 * 16, 26 * 16); ${G}.player.facing = 1; true`);
    await sleep(300);
    await b.down('Space'); await sleep(380); await b.up('Space');
    await sleep(200); await waitFor(`${G}.player.onGround`, 2000);
    check('the low camp scaffold is reachable from the floor', await ev(`${G}.player.feet <= 24 * 16 + 0.5`), await ev(`[${G}.player.x, ${G}.player.feet]`));
    await ev(`${G}.player.placeAt(70.5 * 16, 24 * 16); true`);
    await sleep(300);
    await b.down('Space'); await sleep(380); await b.up('Space');
    await sleep(200); await waitFor(`${G}.player.onGround`, 2000);
    check('...and Old Marge\'s top scaffold is reachable from there', await ev(`${G}.player.feet <= 22 * 16 + 0.5`), await ev(`[${G}.player.x, ${G}.player.feet]`));
    check('Old Marge sits on her (lowered) scaffold', await ev(`${G}.npcs.find(n => n.id === 'marge').y === 22 * 16`));

    console.log('[dash = intangible]');
    const dodge = await ev(`(() => { const p = ${G}.player; p.invulnT = 0; p.dashT = 0.1; const hp = p.hp; const r = p.takeHit(25, p.cx + 10); const ok = r === 'ignored' && p.hp === hp; p.dashT = 0; p.dashGrace = 0; return ok; })()`);
    check('nothing can hit you mid-dash', dodge);
    const contact = await ev(`(() => { const g = ${G}; const s = g.enemies.find(e => e instanceof ERX.Enemies.Slime && !e.dead); const p = g.player; p.invulnT = 0; p.placeAt(s.cx, s.y + s.h); p.dashT = 0.1; const hp = p.hp; s.contact && s.contact(); const ok = p.hp === hp; p.dashT = 0; return ok; })()`);
    check('dashing straight through a monster does not hurt', contact);
    const bolt = await ev(`(() => { const g = ${G}; const p = g.player; p.invulnT = 0; p.dashT = 0.1; const hp = p.hp; const B = new ERX.Props.Bolt(p.cx, p.y + 10, 0); B.update(0.016, g); const ok = p.hp === hp && !B.dead; p.dashT = 0; return ok; })()`);
    check('bolts pass straight through a dashing player', bolt);

    console.log('[the elevator]');
    await ev(`(() => { const g = ${G}; g.enemies.length = 0; const E = g.level.elevator; g.player.placeAt(E.x, E.floorY); return true; })()`);
    await sleep(300);
    check('the elevator can be ridden', await ev(`!!${G}.prompt && /ELEVATOR/.test(${G}.prompt.text)`));
    await b.key('KeyE');
    check('riding it starts the elevator scene', await waitFor(`${G}.state === 'elevator'`, 2000));
    check('elevator music plays', await waitFor("ERX.Audio.music.wanted === 'elevator'", 3000));
    await sleep(2500);
    await shot('18-elevator');
    check('the elevator goes all the way up (no slime crash this time)', await waitFor(`${G}.levelId === 'vault' && !ERX.Scenes.busy`, 14000));
    check('no element before the reveal', await ev("!('element' in ERX.Saves.characters[0])"));

    console.log('[the sealed chamber]');
    check('arriving plays a cutscene', await waitFor(`!!${G}.script && ${G}.player.controls === false`, 3000));
    check('a glowing rainbow orb sits in a sealed container', await ev(`!!${G}.orb && ${G}.orb.state === 'sealed' && !${G}.orb.broken`));
    let sawPan = false;
    for (let i = 0; i < 80 && (await ev(`!!${G}.script`)); i++) {
      if (!sawPan && (await ev(`!!${G}.camera.focus`))) { sawPan = true; await sleep(800); await shot('19-orb-reveal'); }
      if (await ev(`${G}.dialogue.active`)) await b.key('Enter', { wait: 30 });
      await sleep(150);
    }
    check('...where the camera shows you the orb', sawPan);
    check('control returns after the cutscene', await waitFor(`!${G}.script && ${G}.player.controls`, 3000));
    check('you can walk towards it', await ev(`/ORB/.test(${G}.objective && ${G}.objective.label)`));
    await b.down('KeyD');
    await waitFor(`!!${G}.prompt && /ORB/.test(${G}.prompt.text)`, 9000);
    await b.up('KeyD');
    check('getting close lets you interact with it', await ev(`!!${G}.prompt && /TOUCH THE ORB/.test(${G}.prompt.text)`), await ev(`[${G}.player.cx, ${G}.orb.x]`));
    await shot('20-orb-close');
    if (process.env.FORCE_EL) await ev(`ERX.Saves.characters[0].element = '${process.env.FORCE_EL}'; true`);   // screenshots of a specific roll
    await b.key('KeyE');
    check('touching it starts the awakening', await waitFor(`!!${G}.script && ${G}.player.controls === false`, 2000));
    for (let i = 0; i < 30 && (await ev(`${G}.orb.state`)) === 'sealed'; i++) { if (await ev(`${G}.dialogue.active`)) await b.key('Enter', { wait: 30 }); await sleep(200); }
    check('the orb shakes and the glass cracks', await waitFor(`${G}.orb.shake > 0 && ${G}.orb.crack > 0`, 4000));
    check('it breaks out of the container', await waitFor(`${G}.orb.broken && ${G}.orb.state === 'free'`, 5000));
    check('...with a massive shockwave', await ev(`${G}.shockwaves.length > 0`));
    await sleep(150);
    await shot('21-shockwave');
    check('which sends you flying', await ev(`Math.abs(${G}.player.vx) > 100 && ${G}.player.flungT > 0`));
    for (let i = 0; i < 60 && (await ev(`${G}.state`)) !== 'nebula'; i++) { if (await ev(`${G}.dialogue.active`)) await b.key('Enter', { wait: 30 }); await sleep(150); }
    check('the orb dashes into your body', await ev(`${G}.orb.state === 'gone' && ${G}.orb.hit === true`));
    check('you shake violently in a nebula galaxy', await ev(`${G}.state === 'nebula'`));
    await sleep(1500);
    await shot('22-nebula');
    check('then you pass out', await waitFor(`${G}.neb && ${G}.neb.lying`, 5000));
    check('...and the screen slowly cuts to black', await waitFor(`${G}.neb && ${G}.neb.black > 0.5`, 5000));

    console.log('[THE REVEAL]');
    check('the reveal begins in silence and darkness', await waitFor(`${G}.state === 'reveal'`, 5000) && await ev("ERX.Audio.music.wanted === null && ERX.Audio.ambience.wanted === null"));
    const el = await ev("ERX.Saves.characters[0].element || null");
    check('an element is assigned (at random) at the reveal', !!el && (await ev(`!!ERX.Elements.get('${el}')`)), el);
    check('progress saved (awakened)', (await ev('ERX.Saves.characters[0].progress.stage')) === 'awakened');
    check('getting your element is a fresh start: no XP, levels, skill points, stats or gold from the tutorial', await ev("(() => { const c = ERX.Saves.characters[0]; return c.level === 1 && !c.xp && c.skillPoints === 0 && Object.keys(c.elementSkills || {}).length === 0 && Object.values(c.skills).every(v => v === 0) && c.gold === 0; })()"), await ev("JSON.stringify(ERX.Saves.characters[0])"));
    check('...and the player really is back at level 1', await ev(`${G}.player.level === 1 && ${G}.player.xp === 0 && ${G}.player.hp === ${G}.player.maxHp`));
    await sleep(2500);
    check('5 seconds of nothing first', await ev(`${G}.rev.you === null`));
    check('"YOU" appears', await waitFor(`${G}.rev.you !== null`, 4000));
    check('...then "GOT" a second later', await waitFor(`${G}.rev.got !== null`, 2000) && (await ev(`${G}.rev.you >= 0.8`)));
    check('...then the drumroll', await waitFor(`${G}.rev.roll !== null`, 2000));
    check('...then the element appears', await waitFor(`${G}.rev.elem !== null`, 4000));
    check('the element art is loaded (or has its fallback title)', await ev(`(() => { const e = ${G}.element(); return e.art ? !!ERX.Assets.image('element_' + e.id) : e.id === 'darkness'; })()`), el);
    check('every element has a signature sound + the guitar riff exists', await ev("ERX.Elements.list.every(e => typeof ERX.SfxBank['element_' + e.id] === 'function') && typeof ERX.SfxBank.guitarRiff === 'function' && typeof ERX.SfxBank.drumroll === 'function'"));
    await sleep(800);
    await shot('23-you-got');
    check('...then how rare it is', await waitFor(`${G}.rev.rarity !== null`, 3000));
    check('every rarity tier has a sting', await ev("typeof ERX.SfxBank.raritySting === 'function'"));
    check('every rarity tier has its OWN guitar riff', await ev(`(() => {
      const node = () => ({ connect() {}, disconnect() {}, frequency: {}, gain: {} });
      const sig = (tier) => { const log = []; const a = { ctx: { createWaveShaper: node, createBiquadFilter: node, createGain: node }, tone: (d, o) => log.push(o.wave + Math.round(o.freq)), noiseBurst: () => log.push('n') }; ERX.SfxBank.guitarRiff(a, {}, 0, { tier }); return log.join(','); };
      const all = [0, 1, 2, 3, 4, 5].map(sig);
      return new Set(all).size === 6 && all.every((x) => x.length > 20);
    })()`));
    await sleep(1200);
    await shot('23b-rarity');
    console.log('[the void]');
    check('right after the reveal, the screen cuts to black', await waitFor(`${G}.state === 'black'`, 8000));
    check('...and you are floating in a space-like void', await waitFor(`${G}.levelId === 'void' && ${G}.state === 'float' && ${G}.player.lying`, 5000));
    await sleep(800);
    await shot('24-void-float');
    check('you wake up and bounce right to your feet', await waitFor(`${G}.state === 'play' && !${G}.player.lying && ${G}.player.onGround`, 8000));
    check('there is no (visible) floor', await ev(`(() => { const g = ${G}; const c = g.tilesCanvas.getContext('2d'); const d = c.getImageData(0, g.level.floorY, g.level.pw, 16).data; for (let k = 3; k < d.length; k += 4) if (d[k]) return false; return true; })()`));
    check('...but you can walk on it anyway', await ev(`!!${G}.level.isSolid(10, 18)`));
    check('someone stands out there, looking towards the horizon', await ev(`!!${G}.figure && ${G}.figure.facing === 1 && !${G}.figure.met && ${G}.figure.x > ${G}.player.cx`));
    await waitFor(`!${G}.script && ${G}.player.controls`, 6000);
    const vx0 = await ev(`${G}.player.x`);
    await b.down('KeyD');
    await sleep(500);
    check('you can walk around', (await ev(`${G}.player.x`)) > vx0 + 20);
    check('the invisible floor ripples where you step', await waitFor(`${G}.ripples.length > 0`, 1500));
    await waitFor(`!!${G}.script`, 15000);
    await b.up('KeyD');
    check('the figure turns around... slowly', await waitFor(`${G}.figure.front === true`, 4000));
    check('...and gets a comedically shocked expression', await waitFor(`${G}.figure.expr === 'shock' && ${G}.figure.bubble === 'bang'`, 4000));
    check('the confusing music plays again', await waitFor("ERX.Audio.music.wanted === 'voice'", 3000));
    await shot('25-figure-shock');
    // talk to him, choosing the answers named below
    const seenV = [];
    const answers = [
      [/Idk\./, 1],                                   // "You probably brought me here."
      [/^Yes\. \/ No\.$/, 1],                        // "No."
      [/Unknown Being/, 1],                            // "Who is this Unknown Being?"
      [/tutorial guide/, 1],                           // "What type of tutorial guide are you?"
    ];
    let sawAngryDomain = false, sawLying = false, sawScan = false, sawKey = false, worldsWhenShown = null;
    for (let k = 0; k < 500 && (await ev(`!!${G}.script`)); k++) {
      const st = await ev(`(() => { const d = ${G}.dialogue; return d.active ? (d.mode === 'say' ? 'say|' + d.speaker.name + '|' + d.plain : 'choose|' + d.choices.join(' / ')) : 'busy'; })()`);
      if (st !== 'busy' && seenV[seenV.length - 1] !== st) seenV.push(st);
      if (/domain/.test(st) && (await ev(`${G}.figure.expr === 'angry'`))) { if (!sawAngryDomain) await shot('26-figure-angry'); sawAngryDomain = true; }
      if (/lying/.test(st) && (await ev(`${G}.figure.expr === 'unamused'`))) sawLying = true;
      if (!sawScan && (await ev(`!!${G}.scan`))) { sawScan = true; await sleep(500); await shot('27-scan'); }
      if (!worldsWhenShown && (await ev(`!!${G}.worlds && ${G}.worlds.t > 3`))) { worldsWhenShown = await ev(`${G}.worlds.unlocked.slice()`); await shot('28-worlds'); }
      if (!sawKey && (await ev(`!!${G}.energyKey && ${G}.energyKey.phase === 'fly'`))) { sawKey = true; await shot('29-energy-key'); }
      if (st.startsWith('choose|')) {
        const a = answers.find(([re]) => re.test(st.slice(7)));
        const idx = a ? a[1] : 0;
        for (let q = 0; q < idx; q++) await b.key('ArrowDown', { wait: 40 });
        await sleep(280);
        await b.key('Enter', { wait: 40 });
      } else if (st.startsWith('say|')) await b.key('Enter', { wait: 30 });
      await sleep(120);
    }
    const said = (re) => seenV.some((x) => re.test(x));
    check('he stutters about how you got here', said(/H-h-how did you g-g-get HERE/));
    check('three answers: Idk / you brought me / are you the Voice?', said(/^choose\|Idk\. \/ You probably brought me here\. \/ Are you the Voice that helped me through that tutorial\?$/));
    check('"You probably brought me here" -> he snaps: this is HIS domain', sawAngryDomain && said(/RANDOM VISITORS/));
    check('every answer leads to: this is what he really looks like', said(/what I really look like/));
    check('...and he was the one who helped you through the tutorial', said(/helped you through that whole tutorial/));
    check('he asks if you got your element yet', said(/Did you get your element yet/));
    check('"No." -> visibly unamused: he knows you are lying', sawLying && said(/ONLY way you could have gotten here/));
    check('he scans you', sawScan);
    const elName = await ev(`${G}.element().name.toUpperCase()`);
    check('...and says something about YOUR element', said(new RegExp('THE VOICE\\|' + elName)) && (await ev(`!!ERX.Story.void.ELEMENT_LINES[${G}.element().id]`)), elName);
    check('every element has its own lines', await ev('ERX.Elements.list.every(e => !!ERX.Story.void.ELEMENT_LINES[e.id])'));
    check('the Julforic Pillars + the Unknown Being (nobody knows who)', said(/JULFORIC PILLARS/) && said(/don't even know who it is/));
    check('"What type of tutorial guide are you?" -> he can\'t just use any element, he\'s like you', said(/I'm just like you/));
    check('seven locked worlds appear', !!worldsWhenShown && worldsWhenShown.length === 7 && worldsWhenShown.every((u) => !u));
    check('world 1 always looks normal (the same planet for every element)', await ev("(() => { const a = ERX.Worlds.build(ERX.Elements.get('fire')), b = ERX.Worlds.build(ERX.Elements.get('chaos')); return a[0].surface === 'earthlike' && JSON.stringify(a[0].spec) === JSON.stringify(b[0].spec); })()"));
    check('the other worlds match the element (fire burns, ice freezes, water floods...)', await ev("(() => { const f = ERX.Worlds.build(ERX.Elements.get('fire')).slice(1), i = ERX.Worlds.build(ERX.Elements.get('ice')).slice(1), w = ERX.Worlds.build(ERX.Elements.get('water')).slice(1); return f.some(x => x.surface === 'lava') && i.some(x => x.surface === 'ice') && w.some(x => x.surface === 'ocean'); })()"));
    check('every element has its own world style, and its 6 worlds all look different', await ev("ERX.Elements.list.every(el => { const ws = ERX.Worlds.build(el).slice(1); return new Set(ws.map(w => JSON.stringify([w.spec.feat, w.spec.base, w.spec.extra]))).size === 6; })"));
    check('the worlds depend on your element', await ev("(() => { const a = ERX.Worlds.build(ERX.Elements.get('fire')), b = ERX.Worlds.build(ERX.Elements.get('ice')); return a.length === 7 && a.some((w, i) => w.surface !== b[i].surface); })()") && said(/depend on what element you have/));
    check('you ask how many elements there are: he doesn\'t know', said(new RegExp(await ev(`${G}.character.name.toUpperCase()`) + '\\|How many elements are there')) && said(/^say\|THE VOICE\|I don't know\.$/));
    check('he shoots an energy key at the first world\'s lock', sawKey || (await ev(`!!${G}.energyKey && ${G}.energyKey.done && !!${G}.energyKey.from`)));
    check('...which breaks it (world 1 unlocked, the rest still locked)', await ev(`${G}.worlds.unlocked[0] && ${G}.worlds.unlocked.slice(1).every(u => !u)`));
    check('he says he\'ll be at his HQ (go ahead, or stay a bit)', said(/I'll be at my HQ/) && said(/stay for a bit/));
    check('progress saved (worldUnlocked)', (await ev('ERX.Saves.characters[0].progress.stage')) === 'worldUnlocked');
    check('then he walks away', await ev(`${G}.figure.walkTo !== null`) && await waitFor(`${G}.figure.gone`, 12000));
    await shot('30-free');

    console.log('[the Void Recall Device]');
    await ev(`(() => { const g = ${G}; g.player.placeAt(g.level.jumpX, g.level.floorY); return true; })()`);
    await sleep(300);
    check('you can jump into the world', await ev(`!!${G}.prompt && /JUMP INTO WORLD 1/.test(${G}.prompt.text)`));
    await b.key('KeyE');
    check('...up you go', await waitFor(`${G}.state === 'launch'`, 3000));
    check('"WAAAAIT!" the Voice comes running out of the HQ', await waitFor(`${G}.dialogue.active && /WAAA+IT/.test(${G}.dialogue.plain) && !!${G}.figure && !${G}.figure.gone`, 4000));
    check('...and you are frozen in mid-air', await ev(`!!${G}.launch && ${G}.launch.hold === true`));
    await shot('31-wait');
    const seenW = [];
    let sawPull = false, sawGift = false;
    const vrdAnswers = [[/making up words/, 1], [/why did you tell me/, 0]];
    for (let k = 0; k < 300 && (await ev(`!!${G}.script`)); k++) {
      const st = await ev(`(() => { const d = ${G}.dialogue; return d.active ? (d.mode === 'say' ? 'say|' + d.speaker.name + '|' + d.plain : 'choose|' + d.choices.join(' / ')) : 'busy'; })()`);
      if (st !== 'busy' && seenW[seenW.length - 1] !== st) seenW.push(st);
      if (!sawPull && (await ev(`${G}.state === 'pull'`))) { sawPull = true; await sleep(400); await shot('32-telekinesis'); }
      if (!sawGift && (await ev(`!!${G}.gift`))) { sawGift = true; await sleep(900); await shot('33-vrd'); }
      if (st.startsWith('choose|')) {
        const ans = vrdAnswers.find(([re]) => re.test(st.slice(7)));
        const idx = ans ? ans[1] : 0;
        for (let q = 0; q < idx; q++) await b.key('ArrowDown', { wait: 40 });
        await sleep(280);
        await b.key('Enter', { wait: 40 });
      } else if (st.startsWith('say|')) await b.key('Enter', { wait: 30 });
      await sleep(120);
    }
    const saidW = (re) => seenW.some((x) => re.test(x));
    check('a telekinesis device drags you back down into the void', sawPull);
    check('he forgot to give you something...', saidW(/forgot to give you something/));
    check('...the Void Recall Device (the VRD)', sawGift && saidW(/Void Recall Device\. The VRD/) && (await ev(`ERX.Items.has(${G}.character, 'vrd')`)));
    check('"What is this?" -> a recall device: it teleports you back to the void', saidW(/^choose\|What is this\? \/ Can I eat it\?$/) && saidW(/recall device/) && saidW(/back here\. To the void/));
    check('...but only once you reach a Checkshot', saidW(/once you reach a Checkshot/));
    check('"Are you just making up words?" -> he snaps (it\'s a checkpoint)', saidW(/^choose\|What is a checkshot\? \/ Are you just making up words\?$/) && saidW(/NOT MAKING UP WORDS/) && saidW(/CHECKPOINT/));
    check('be careful: you can upgrade your element... and AWAKEN it', saidW(/Be careful/) && saidW(/upgrade it/) && saidW(/AWAKEN it/));
    check('...but he doesn\'t know how', saidW(/\|I don't know\.$/));
    check('"Then why did you tell me?" -> he snaps again (the deeper worlds)', saidW(/GONNA HAVE TO KNOW/) && saidW(/deeper worlds/));
    check('*sigh* Good luck out there. You\'re gonna need it. (With Chaos: good luck to WORLD 1.)', saidW(/Good luck out there/) && (el === 'chaos' ? saidW(/Good luck to WORLD 1/) : saidW(/gonna need it/)));
    check('progress saved (you have the VRD)', await ev('ERX.Saves.characters[0].progress.vrd === true && ERX.Saves.characters[0].items.indexOf("vrd") !== -1'));
    check('...and he walks off again', await waitFor(`${G}.figure.gone`, 12000));

    console.log('[entering world 1]');
    await ev(`(() => { const g = ${G}; g.player.placeAt(g.level.jumpX, g.level.floorY); return true; })()`);
    await sleep(300);
    await b.key('KeyE');
    check('this time you really jump', await waitFor(`${G}.state === 'launch'`, 3000));
    check('2 seconds of black...', await waitFor(`${G}.state === 'skyfall' && ${G}.levelId === 'world1' && ${G}.fall.phase === 'black'`, 5000));
    check('...then a galaxy portal opens at the top and you drop out of it (music!)', (await waitFor(`!!${G}.fall && ${G}.fall.phase === 'portal'`, 3500)) && (await waitFor("ERX.Audio.music.wanted === 'skyfall'", 1000)));
    await sleep(1200);
    await shot('34-portal');
    check('falling through the void, the wind howling', (await waitFor(`!!${G}.fall && ${G}.fall.phase === 'voidFall'`, 3000)) && (await ev("ERX.Audio.ambience.wanted === 'skyfall'")));
    check('it gets brighter, and brighter...', await waitFor(`!!${G}.fall && ${G}.fall.phase === 'bright'`, 5000));
    check('...the light cracks...', await waitFor(`!!${G}.fall && ${G}.fall.phase === 'crack'`, 3000));
    await sleep(700);
    await shot('35-cracks');
    check('...and SHATTERS: you are falling out of the sky of World 1', await waitFor(`!!${G}.fall && ${G}.fall.phase === 'sky'`, 3000));
    await sleep(1500);
    await shot('36-sky');
    // the rest of the way down, fast-forwarded (no dodging: the HP never drops below 1)
    const fall = await ev(`(() => { const g = ${G}, f = g.fall, out = { obs: 0, cloud: false, kinds: {}, minHp: 1e9 }; let t = 0;
      while (g.fall && g.fall.phase === 'sky' && t < 20) { g.update(1 / 60, ERX.Input, true); t += 1 / 60; out.obs = Math.max(out.obs, f.obs.length); for (const o of f.obs) out.kinds[o.kind] = 1; if (f.inCloud) out.cloud = true; out.minHp = Math.min(out.minHp, g.player.hp); }
      out.t = +(t + f.pt - t).toFixed(1); out.phase = g.fall && g.fall.phase; out.kinds = Object.keys(out.kinds).join(','); return out; })()`);
    check('things fly at you the whole way down (birds, geese, paper planes, kites, hot-air balloons)', fall.obs > 0 && fall.kinds.split(',').length >= 3 && fall.minHp >= 1, fall);
    check('halfway down you fall through the clouds', fall.cloud, fall);
    check('...about 13 seconds of falling, then the ground', fall.phase === 'land', fall);
    check('you hit the ground: a shockwave in your element\'s style, and the music hits its ending', (await ev(`${G}.effects.some((e) => e.k === ERX.SkyFall.LANDFX)`)) && (await ev("ERX.Audio.music.wanted === 'skyfallEnd'")));
    await shot('37-landing');
    check('...and 1.3 seconds later you get up', await waitFor(`${G}.state === 'play' && !${G}.fall`, 4000));
    check('the grumpy slime drops in and blocks the way', await waitFor(`!!${G}.blocker && ${G}.blocker.landed`, 5000));
    const seenS = [];
    for (let k = 0; k < 40 && (await ev(`!!${G}.script`)); k++) {
      const st = await ev(`(() => { const d = ${G}.dialogue; return d.active && d.mode === 'say' ? d.plain : 'busy'; })()`);
      if (st !== 'busy' && seenS[seenS.length - 1] !== st) seenS.push(st);
      if (st !== 'busy') await b.key('Enter', { wait: 30 });
      await sleep(150);
    }
    check('"World 1? Not finished yet. Be patient >:("', seenS.some((s) => /Be patient/.test(s)), seenS);
    await shot('38-world1');
    check('...and nobody gets past it', await ev(`(() => { const g = ${G}, p = g.player; for (let i = 0; i < 120; i++) { p.x += 3; g.update(1 / 60, ERX.Input, true); } return p.cx < g.blocker.x; })()`));
    check('World 1 has a day and night cycle (a full day every 10 minutes)', await ev(`(() => { const g = ${G}, a = g.worldTod; g.level.update(1, g); return Math.abs(g.worldTod - a - 1 / 600) < 1e-9 && ERX.World1Level.DAY === 600; })()`));
    check('the slime says to go find the Checkshot', await ev(`!!${G}.objective && /CHECKSHOT/.test(${G}.objective.label)`));
    await ev(`(() => { const g = ${G}; g.player.placeAt(g.checkshot.x, g.level.floorY); return true; })()`);
    await sleep(300);
    check('...there it is', await ev(`!!${G}.prompt && /ACTIVATE THE CHECKSHOT/.test(${G}.prompt.text)`));
    await b.key('KeyE');
    check('...activated (a checkpoint, with a cooler name)', (await waitFor(`${G}.checkshot.on && !${G}.script`, 4000)) && (await ev('ERX.Saves.characters[0].progress.checkshot1 === true')));
    await shot('39-checkshot');
    // World 1 is a little different if you're Chaos
    check('Chaos turns World 1\'s sky very slightly red', await ev(`(() => {
      const g = ${G}, vw = g.view.width, vh = g.view.height;
      const sky = (id) => { const cv = document.createElement('canvas'); cv.width = vw; cv.height = vh; const as = Object.create(g); as.element = () => ERX.Elements.get(id); g.level.drawSky(cv.getContext('2d'), g.camera, vw, vh, as); return cv.getContext('2d').getImageData(Math.floor(vw / 2), 2, 1, 1).data; };
      const a = sky('fire'), c = sky('chaos'); g.level.drawSky(document.createElement('canvas').getContext('2d'), g.camera, vw, vh, g);
      return c[0] > a[0] && c[2] < a[2] && c[0] - a[0] < 70 && ERX.World1Level.CHAOS_RED <= 0.2; })()`));
    check('...the junk in the sky hits Chaos a little harder', await ev("ERX.SkyFall.hitShare(ERX.Elements.get('chaos')) > ERX.SkyFall.hitShare(ERX.Elements.get('fire')) && ERX.SkyFall.hitShare(ERX.Elements.get('chaos')) < 0.1"));
    check('...Chaos lands with a white shockwave edged in rainbow, and leaves a bigger, cracked crater', await ev(`(() => { const g = ${G}, A = ERX.Abilities.api(g), pal = { c: '#ffffff', l: '#ffffff', d: '#c8c8e0', core: '#ffffff', fx: 'chaos' }; const e = A.spawn({ pal, dmg: 0, el: 'chaos' }, ERX.SkyFall.LANDFX, { x: g.player.cx, y: g.level.floorY, fx: 'chaos', chaos: true, life: 3 }); e.t = 0.3; e.render(document.createElement('canvas').getContext('2d'), g.camera); const ok = e.bits.length === 46 && e.cracks.length === 7; e.dead = true; return ok && /chaos: true/.test(String(ERX.SkyFall.prototype.land)); })()`));
    check('...and its Checkshot sounds different', await ev(`(() => { const g = ${G}, cs = g.checkshot, heard = [], real = ERX.Audio.playSfx; ERX.Audio.playSfx = function (n) { heard.push(n); return real.apply(this, arguments); }; g.element = () => ERX.Elements.get('chaos'); cs.on = false; g.activateCheckshot(); g.element = () => ERX.Elements.get('fire'); cs.on = false; g.activateCheckshot(); delete g.element; ERX.Audio.playSfx = real; return heard.includes('checkshotChaos') && heard.includes('checkshotOn') && cs.on; })()`));
    check('...and the Voice\'s send-off changes a little', await ev("/Good luck to WORLD 1/.test(String(ERX.Story.world.vrd)) && /only one we've got/.test(String(ERX.Story.world.vrd))"));
    check('now the VRD can take you home', await ev(`!!${G}.prompt && /RECALL TO THE VOID/.test(${G}.prompt.text)`));
    await b.key('KeyE');
    await waitFor(`${G}.dialogue.active && ${G}.dialogue.mode === 'choose'`, 2000);
    await sleep(300);
    await b.key('Enter', { wait: 40 });
    check('...poof', await waitFor(`${G}.state === 'recall'`, 2000));
    check('...back to the void', await waitFor(`ERX.Scenes.top().id === 'game' && ${G}.levelId === 'void' && !ERX.Scenes.busy`, 5000));

    console.log('[the HQ]');
    await ev(`(() => { const g = ${G}; g.player.placeAt(g.hqDoor.x, g.level.floorY); return true; })()`);
    await sleep(300);
    check('or you can go explore his HQ', await ev(`!!${G}.prompt && /ENTER THE HQ/.test(${G}.prompt.text)`));
    await b.key('KeyE');
    check('...which is a real place', await waitFor(`${G}.levelId === 'hq' && !ERX.Scenes.busy`, 5000));
    check('it has a bunch of people in it (and him)', await ev(`${G}.npcs.length >= 6 && ${G}.npcs.some(n => n.id === 'guide')`));
    await shot('32-hq');
    const goldBefore = 40;
    await ev(`(() => { const g = ${G}; g.character.gold = ${goldBefore}; g.player.placeAt(g.npcs.find(n => n.id === 'brenda').x - 6, g.level.floorY); g.player.facing = 1; return true; })()`);
    await sleep(300);
    await b.key('KeyE');
    check('Brenda sells armor', await waitFor(`${G}.dialogue.active && /Brenda/.test(${G}.dialogue.plain)`, 2000));
    // buy the cardboard armor, then try the golden one, then leave
    const shopPlan = [0, 4, 5];
    let shopStep = 0, sawBroke = false;
    for (let k = 0; k < 80 && (await ev(`!!${G}.script`)); k++) {
      const st = await ev(`(() => { const d = ${G}.dialogue; return d.active ? d.mode + '|' + (d.mode === 'say' ? d.plain : d.choices.join(' / ')) : 'busy'; })()`);
      if (/realistic|math isn't mathing/.test(st)) sawBroke = true;
      if (st.startsWith('choose|')) {
        if (/^choose\|Buy it/.test(st)) { await b.key('Enter', { wait: 40 }); }
        else {
          if (shopStep === 0) await shot('33-shop');
          const idx = shopPlan[Math.min(shopStep++, shopPlan.length - 1)];
          for (let q = 0; q < idx; q++) await b.key('ArrowDown', { wait: 40 });
          await sleep(280);
          await b.key('Enter', { wait: 40 });
        }
      } else if (st.startsWith('say|')) await b.key('Enter', { wait: 30 });
      await sleep(120);
    }
    const ch = await ev('JSON.stringify((({ gold, armor, armorOwned }) => ({ gold, armor, armorOwned }))(ERX.Saves.characters[0]))');
    check('you can buy armor if you have the money', await ev("(() => { const c = ERX.Saves.characters[0]; return c.armor === 'cardboard' && c.armorOwned.indexOf('cardboard') !== -1 && c.gold === 30; })()"), ch);
    check('...and can\'t if you don\'t', sawBroke && await ev("ERX.Saves.characters[0].armorOwned.indexOf('golden') === -1"));
    check('armor shows on you and soaks damage', await ev(`(() => { const p = ${G}.player; p.invulnT = 0; p.dashT = 0; p.dashGrace = 0; p.blocking = false; const hp = p.hp; p.takeHit(10, p.cx + 30); const ok = hp - p.hp === 9 && p.look.armor === ERX.Armor.get('cardboard').color; p.hp = p.maxHp; p.invulnT = 0; return ok; })()`));
    await shot('34-armor');

    console.log('[inventory]');
    await b.key('KeyI');
    check('I opens the inventory', await waitFor("ERX.Scenes.top().id === 'inventory' && ERX.Scenes.top().appearT >= 1", 2000));
    check('it\'s a Minecraft-style bag: 27 slots, a 9-slot hotbar and 4 armour slots (and no weapon)', await ev("(() => { const k = ERX.Scenes.top().slots.map((q) => q.k); return k.filter((x) => typeof x === 'number').length === 36 && ['head', 'chest', 'legs', 'feet'].every((a) => k.includes(a)) && k.length === 40; })()"));
    check('your things are in it (the VRD) and the armour you bought is worn (CHEST)', await ev(`(() => { const c = ${G}.character; return c.inv.some((s) => s && s.id === 'vrd') && c.equip.chest === 'armor:cardboard'; })()`));
    await shot('35-inventory');
    check('click picks things up, click puts them down', await ev(`(() => { const s = ERX.Scenes.top(), c = ${G}.character, i = c.inv.findIndex((q) => q && q.id === 'vrd'); s._click(i); const held = !!s.held && s.held.id === 'vrd' && !c.inv[i]; s._click(20); return held && !s.held && !!c.inv[20] && c.inv[20].id === 'vrd'; })()`));
    check('armour won\'t go on your head', await ev(`(() => { const s = ERX.Scenes.top(), c = ${G}.character; s._click('chest'); const up = !!s.held && s.held.id === 'armor:cardboard' && c.armor === null; s._click('head'); const refused = !!s.held && !c.equip.head; s._click('chest'); return up && refused && !s.held && c.armor === 'cardboard'; })()`));
    check('shift-click takes armour off and puts it back on (your defence follows)', await ev(`(() => { const s = ERX.Scenes.top(), c = ${G}.character; s._click('chest', false, true); const off = c.armor === null && ERX.Inventory.defense(c) === 0; const i = c.inv.findIndex((q) => q && q.id === 'armor:cardboard'); s._click(i, false, true); return off && i >= 0 && c.armor === 'cardboard' && ERX.Inventory.defense(c) === 1; })()`));
    check('shift-click sends things between the bag and the hotbar', await ev(`(() => { const s = ERX.Scenes.top(), c = ${G}.character; s._click(20, false, true); const i = c.inv.findIndex((q) => q && q.id === 'vrd'); return i >= 0 && i < 9; })()`));
    check('1-9 swaps with that hotbar slot', await ev(`(() => { const s = ERX.Scenes.top(), c = ${G}.character, i = c.inv.findIndex((q) => q && q.id === 'vrd'); s._swapHot(i, 8); return !!c.inv[8] && c.inv[8].id === 'vrd'; })()`));
    check('stacks split with a right-click and merge back together', await ev(`(() => { const s = ERX.Scenes.top(), c = ${G}.character; ERX.Items.list.__pebble = { name: 'PEBBLE', desc: 'A pebble.', stack: 16, draw() {} }; c.inv[30] = { id: '__pebble', n: 10 }; s._click(30, true); const half = !!s.held && s.held.n === 5 && c.inv[30].n === 5; s._click(31, true); const one = !!c.inv[31] && c.inv[31].n === 1 && s.held.n === 4; s._click(30); const merged = !s.held && c.inv[30].n === 9; c.inv[30] = null; c.inv[31] = null; delete ERX.Items.list.__pebble; ERX.Inventory.sync(c); return half && one && merged; })()`));
    check('the details box draws for what you point at (no errors)', await ev("(() => { const s = ERX.Scenes.top(), cv = document.createElement('canvas'); cv.width = 600; cv.height = 340; s._tooltip(cv.getContext('2d'), 8, s._get(8), 600, 340); return true; })()"));
    await ev("(() => { ERX.Scenes.top()._click(8); return true; })()");
    await b.key('Escape');
    check('closing puts back whatever you were holding, and saves the bag', await waitFor("ERX.Scenes.top().id === 'game'", 2000) && await ev("(() => { const c = ERX.Saves.characters[0]; return !!c.inv[8] && c.inv[8].id === 'vrd' && c.equip.chest === 'armor:cardboard' && c.items.indexOf('vrd') !== -1 && c.armor === 'cardboard'; })()"));
    check('an older save\'s items and armour move into the bag', await ev("(() => { const c = { items: ['vrd'], armorOwned: ['cardboard', 'leather'], armor: 'leather' }; ERX.Inventory.ensure(c); return c.inv.length === 36 && c.inv[0].id === 'vrd' && c.inv[1].id === 'armor:cardboard' && c.equip.chest === 'armor:leather' && c.armor === 'leather'; })()"));

    await ev(`(() => { const g = ${G}; g.player.placeAt(g.level.exit.x, g.level.floorY); return true; })()`);
    await sleep(400);
    check('the HQ door leads back to the void', await ev(`!!${G}.prompt && /BACK TO THE VOID/.test(${G}.prompt.text)`));
    await b.key('KeyE');
    check('...and it does', await waitFor(`${G}.levelId === 'void' && !ERX.Scenes.busy`, 5000));
    await waitFor(`!${G}.script`, 2000);
    await b.key('Escape');
    await waitFor("ERX.Scenes.top().id === 'pause'", 2000);
    await ev("(() => { const s = ERX.Scenes.stack; ERX.Scenes.transition('dissolve', 0.3, () => { while (s.length > 1) { const x = s.pop(); x.exit(); } ERX.Scenes.top().resume(); }); return true; })()");
    check('back to the title screen', await waitFor("ERX.Scenes.stack.length === 1 && ERX.Scenes.top().id === 'mainMenu'", 4000));

    console.log('[returning player]');
    await waitFor("ERX.Scenes.top().id === 'mainMenu' && ERX.Scenes.top().appearT >= 1 && !ERX.Scenes.busy");
    await sleep(800);
    await b.key('Enter');
    await waitFor("ERX.Scenes.top().id === 'characters' && ERX.Scenes.top().appearT >= 1");
    await b.key('Enter');
    check('a returning player resumes in the void (world 1 unlocked, he is at his HQ)', await waitFor(`ERX.Scenes.top().id === 'game' && ${G}.levelId === 'void' && ${G}.worlds && ${G}.worlds.unlocked[0] && !${G}.figure && !!${G}.hqDoor`, 5000));
    check('your armor and gold were saved', await ev("ERX.Saves.characters[0].armor === 'cardboard' && ERX.Saves.characters[0].gold === 30"));
    check('your level was saved', (await ev('ERX.Saves.characters[0].level')) >= 1 && (await ev(`${G}.player.level`)) === (await ev('ERX.Saves.characters[0].level')));
    check('the element never rerolls', (await ev('ERX.Saves.characters[0].element')) === el);
    console.log('[bats never spawn stuck]');
    const stuckBats = await ev(`(() => { const P = ERX.GameEngine.Physics; let bad = 0; for (const L0 of [ERX.CaveLevel, ERX.DeepEndsLevel]) for (let s = 1; s <= 150; s++) { const L = new L0(s * 7919); for (const sp of L.enemySpawns.filter(e => e.type === 'bat')) { const bt = new ERX.Enemies.Bat({ level: L, player: { cx: 0, y: 0 } }, sp); if (P.overlapsSolid(L, bt.x, bt.y, bt.w, bt.h)) bad++; } } return bad; })()`);
    check('no bat ever starts inside the ceiling (150 random caves each)', stuckBats === 0, stuckBats);
    const freed = await ev(`(() => { const L = new ERX.CaveLevel(15838); const g = { level: L, player: { cx: 188 * 16, x: 188 * 16, y: 17 * 16, w: 10, h: 22, invulnT: 9, intangible: true, takeHit() {} } }; const sp = L.enemySpawns.find(e => e.type === 'bat'); const bt = new ERX.Enemies.Bat(g, sp); bt.y -= 40; const P = ERX.GameEngine.Physics; const was = P.overlapsSolid(L, bt.x, bt.y, bt.w, bt.h); bt.state = 'fly'; bt.update(1 / 60); return was && !P.overlapsSolid(L, bt.x, bt.y, bt.w, bt.h); })()`);
    check('a bat shoved into rock frees itself', freed);

    console.log('[rarity]');
    check('six tiers: common > uncommon > rare > epic > legendary > MYTHIC', await ev("ERX.Elements.rarities.map(r => r.id).join() === 'common,uncommon,rare,epic,legendary,mythic' && ERX.Elements.rarities.every((r, i, a) => !i || r.weight < a[i - 1].weight)"));
    check('every element has a rarity', await ev("ERX.Elements.list.every(e => !!ERX.Elements.rarityOf(e))"));
    check('Chaos is the one and only MYTHIC', await ev("ERX.Elements.list.filter(e => e.rarity === 'mythic').map(e => e.id).join() === 'chaos'"));
    check('Chaos is the rarest roll', await ev("(() => { const E = ERX.Elements, c = E.chance(E.get('chaos')); return E.list.every(e => e.id === 'chaos' || E.chance(e) > c); })()"));
    const dist = await ev("(() => { const n = {}; for (let i = 0; i < 100000; i++) { const r = ERX.Elements.random().rarity; n[r] = (n[r] || 0) + 1; } return n; })()");
    check('the roll is weighted (commons common, mythic very rare)', dist.common > dist.uncommon && dist.uncommon > dist.rare && dist.rare > dist.epic && dist.epic > dist.legendary && (dist.mythic || 0) < dist.legendary && (dist.mythic || 0) < 600, dist);
    check('nobody chose it: no element setting exists', await ev("!JSON.stringify(ERX.Settings.data).match(/element/i)"));

    console.log('[restart]');
    await waitFor(`!ERX.Scenes.busy`, 3000);
    await b.key('Escape');
    check('pause opens', await waitFor("ERX.Scenes.top().id === 'pause'", 2000));
    check('...but there is no RESTART once you have your element', await ev("!ERX.Scenes.top().buttons.some(x => x.label === 'RESTART')"));
    await b.key('Escape');
    await waitFor("ERX.Scenes.top().id === 'game' && !ERX.Scenes.busy", 2000);
    // during the tutorial you can still restart, and it wipes everything
    await ev(`(() => { const s = ERX.Scenes.stack; while (s.length > 1) s.pop().exit(); const c = ERX.Saves.characters[0]; c.progress = { stage: 'tutorialDone' }; c.level = 3; c.xp = 5; c.skillPoints = 2; c.gold = 7; delete c.element; ERX.Saves.update(c); ERX.Scenes.push('game', { character: c }); return true; })()`);
    await waitFor(`ERX.Scenes.top().id === 'game' && !ERX.Scenes.busy`, 3000);
    await sleep(300);
    await b.key('Escape');
    check('in the tutorial, pause still has RESTART', await waitFor("ERX.Scenes.top().id === 'pause' && ERX.Scenes.top().buttons.some(x => x.label === 'RESTART')", 2000));
    await ev("(() => { const p = ERX.Scenes.top(); p.buttons.find(x => x.label === 'RESTART').onActivate(); return true; })()");
    check('restart asks first', await waitFor("ERX.Scenes.top().id === 'confirm'", 2000));
    await ev("ERX.Scenes.top().p.onYes(); true");
    check('restart lands back in the cave', await waitFor(`ERX.Scenes.top().id === 'game' && ${G}.levelId === 'cave' && !ERX.Scenes.busy`, 5000));
    check('restart wipes all progress (stage, level, xp, skills, gold, armor)', await ev("(() => { const c = ERX.Saves.characters[0]; return c.progress.stage === 'new' && c.level === 1 && !c.xp && c.skillPoints === 0 && Object.values(c.skills).every(v => v === 0) && !('element' in c) && c.gold === 0 && c.armor === null && c.armorOwned.length === 0; })()"), await ev("JSON.stringify(ERX.Saves.characters[0])"));
    check('...and it stays wiped after a reload', await ev("(() => { ERX.Saves.load(); const c = ERX.Saves.characters[0]; return c.progress.stage === 'new' && !('element' in c); })()"));

    check('...but achievements are forever', await ev("ERX.Achievements.has('tutorial')"));

    console.log('[a new character: the Voice remembers]');
    // a brand-new character on a device that has already beaten the tutorial
    const toArena = async (name) => {
      await ev(`(() => { const s = ERX.Scenes.stack; while (s.length > 1) s.pop().exit(); const c = ERX.Saves.create('${name}', ERX.Saves.randomLook()); ERX.Scenes.push('game', { character: c }); return true; })()`);
      await waitFor(`ERX.Scenes.top().id === 'game' && ${G}.character.name === '${name}'`, 3000);
      await ev(`(() => { const g = ${G}; g.state = 'play'; g.lids = 1; g.player.lying = false; g.player.controls = true; g.player.placeAt(g.level.arena.triggerX + 8, g.level.arena.floorY); return true; })()`);
      await waitFor(`!!${G}.script`, 3000);
    };
    const talkUntilChoice = async () => {
      const seen = [];
      for (let k = 0; k < 500; k++) {   // (the fake-boss build-up alone takes ~12 s)
        const st = await ev(`(() => { const d = ${G}.dialogue; return d.active ? d.mode + '|' + (d.mode === 'say' ? d.plain : d.choices.join(' / ')) : 'busy'; })()`);
        if (st !== 'busy' && seen[seen.length - 1] !== st) seen.push(st);
        if (st.startsWith('choose|')) return seen;
        if (st.startsWith('say|') && !/ h-$/.test(st)) await b.key('Enter', { wait: 30 });
        await sleep(120);
      }
      return seen;
    };
    await toArena('Twin');
    let seenR = await talkUntilChoice();
    check('mid-sentence, the Voice cuts himself off...', seenR.some((x) => /how did you even get in h-$/.test(x)));
    check('...recognises you: "Have I seen you before?"', seenR.some((x) => /Have I seen you before\?/.test(x)));
    await shot('40-recognised');
    check('tutorial again, or skip to the elevator?', /^choose\|Go through the tutorial again\. \/ Skip it\. Take me to the elevator\.$/.test(seenR[seenR.length - 1]), seenR[seenR.length - 1]);
    await b.key('ArrowDown', { wait: 40 });
    await sleep(280);
    await b.key('Enter', { wait: 40 });
    for (let k = 0; k < 40 && (await ev(`${G}.levelId`)) === 'cave'; k++) { if (await ev(`${G}.dialogue.active`)) await b.key('Enter', { wait: 30 }); await sleep(150); }
    check('skip -> straight to the Deep Ends elevator', await waitFor(`${G}.levelId === 'deep' && !ERX.Scenes.busy`, 6000) && await ev(`Math.abs(${G}.player.cx - ${G}.level.elevator.x0) < 60`));
    check('...with the skill point the tutorial would have given you', await ev(`${G}.character.skillPoints === 1`));
    check('...and it is saved (resumes near the elevator)', await ev(`${G}.character.progress.stage === 'reachedEnd'`));
    await sleep(500);
    check('...and the elevator works', await ev(`!!${G}.prompt && /ELEVATOR/.test(${G}.prompt.text)`) || await ev(`(() => { const g = ${G}; const E = g.level.elevator; g.player.placeAt(E.x, E.floorY); return true; })()`) && await waitFor(`!!${G}.prompt && /ELEVATOR/.test(${G}.prompt.text)`, 1500));
    await toArena('Triplet');
    seenR = await talkUntilChoice();
    await sleep(280);
    await b.key('Enter', { wait: 40 });
    check('"tutorial again" -> the tutorial, from the top', await waitFor(`!!${G}.objective && /WALK/.test(${G}.objective.label)`, 8000) || (await (async () => { for (let k = 0; k < 20; k++) { if (await ev(`${G}.dialogue.active`)) await b.key('Enter', { wait: 30 }); await sleep(150); } return ev(`!!${G}.objective && /WALK/.test(${G}.objective.label)`); })()));

    check('no console errors', b.errors.length === 0, b.errors);
  } catch (e) {
    check('test run crashed', false, String(e && e.stack || e)); console.log('ERRORS', JSON.stringify(b.errors));
  } finally {
    await b.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed.');
  process.exit(failed.length ? 1 : 0);
})();
