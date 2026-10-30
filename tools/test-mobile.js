/*
 * Phone test: plays the game on an emulated touch-screen phone (844x390,
 * held sideways), using only taps — menus, name entry with the phone
 * keyboard, waking up, the on-screen controls, dialogue, pause — and checks
 * the "turn your phone" notice in portrait.
 *
 *   node tools/test-mobile.js            (add --shots to save screenshots)
 */
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp.js');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file:///' + ROOT.replace(/\\/g, '/') + '/index.html?scene=sky&seed=3';
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(__dirname, 'screenshots');
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log((ok ? '  PASS ' : '  FAIL ') + name + (ok || detail === undefined ? '' : '  -> ' + JSON.stringify(detail)));
}

(async () => {
  console.log('ELEMENTAL RETRIBUTION X — phone test\n');
  const b = await launch({ width: 844, height: 390 });
  const ev = (e) => b.eval(e);
  const G = 'ERX.Scenes.find("game")';
  const waitFor = async (expr, ms = 5000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { try { if (await ev(expr)) return true; } catch (e) { /* loading */ } await sleep(80); }
    return false;
  };
  const shot = async (n) => { if (SHOTS) { fs.mkdirSync(SHOT_DIR, { recursive: true }); await b.screenshot(path.join(SHOT_DIR, 'mobile-' + n + '.png')); } };
  // internal game pixels -> CSS pixels on the page
  const css = (expr) => ev(`(() => { const p = ${expr}; const r = ERX.Display.canvas.getBoundingClientRect(); const k = r.width / ERX.Display.width; return { x: p.x * k, y: p.y * k }; })()`);
  const widget = (expr) => css(`(() => { const w = ${expr}; return { x: w.x + w.w / 2, y: w.y + w.h / 2 }; })()`);
  const button = (id) => css(`ERX.Touch.buttons.find(b => b.id === '${id}')`);
  const tapWidget = async (expr) => { const p = await widget(expr); await b.tap(p.x, p.y); };

  try {
    await b.phone(844, 390, 3);
    await b.goto(URL);
    check('the game boots on a phone', await waitFor('!!(window.ERX && ERX.Game && ERX.Game.ready)', 15000));
    check('it renders crisp at a whole-number scale', await ev('Number.isInteger(ERX.Display.scale) && ERX.Display.width >= 320 && ERX.Display.height >= 250'), await ev('[ERX.Display.width, ERX.Display.height, ERX.Display.scale]'));
    await waitFor("ERX.Scenes.top().id === 'mainMenu' && ERX.Scenes.top().state !== 'intro'", 6000);

    console.log('[menus by tapping]');
    await b.tap(422, 300);
    check('a tap is "press any key"', await waitFor("ERX.Scenes.top().state === 'menu'", 3000));
    check('touch mode switches on by itself', await ev('ERX.Touch.enabled && ERX.Input.lastDevice === "touch"'));
    check('...which also unlocks the sound', await waitFor('ERX.Audio.unlocked', 2000));
    check('no mouse cursor is drawn for touch', await ev("ERX.Input.lastDevice !== 'mouse'"));
    await waitFor("ERX.Scenes.top().buttonsT > 0.9", 3000);
    await shot('01-menu');
    await tapWidget("ERX.Scenes.top().buttons[0]");
    check('tapping PLAY opens the character list', await waitFor("ERX.Scenes.top().id === 'characters' && !ERX.Scenes.busy", 4000));
    await waitFor('ERX.Scenes.top().appearT >= 1', 2000);
    await tapWidget('ERX.Scenes.top().newBtn');
    check('tapping NEW opens the creator', await waitFor("ERX.Scenes.top().id === 'creator' && !ERX.Scenes.busy", 4000));
    await waitFor('ERX.Scenes.top().appearT >= 1', 2000);
    await tapWidget('ERX.Scenes.top().nextBtn');
    check('tapping NEXT goes to naming', await waitFor("ERX.Scenes.top().state === 'name' && ERX.Input.textMode", 3000));
    await sleep(300);
    await tapWidget('ERX.Scenes.top().textBox');
    check('tapping the name box opens the phone keyboard', await waitFor('!!ERX.Touch.field && document.activeElement === ERX.Touch.field', 2000));
    await b.insertText('Thumbs');
    check('tapping the box does not submit an empty name', await ev('!ERX.Scenes.top().msg'));
    check('typing on the phone keyboard writes the name', await waitFor("ERX.Scenes.top().textBox.value === 'Thumbs'", 2000), await ev('ERX.Scenes.top().textBox.value'));
    await shot('02-name');
    await tapWidget('ERX.Scenes.top().createBtn');
    check('tapping CREATE makes the character', await waitFor("ERX.Saves.characters.some(c => c.name === 'Thumbs')", 3000));
    check('...and the keyboard closes', await waitFor("ERX.Scenes.top().id === 'characters' && document.activeElement !== ERX.Touch.field", 4000));
    await sleep(600);
    await tapWidget("ERX.Scenes.top().rows.find(r => r.character && r.character.name === 'Thumbs') || ERX.Scenes.top().rows[0]");
    await sleep(300);
    if ((await ev("ERX.Scenes.top().id")) !== 'game') await tapWidget("ERX.Scenes.top().group.focused");
    check('tapping your character starts the game', await waitFor(`ERX.Scenes.top().id === 'game' && !ERX.Scenes.busy`, 6000));

    console.log('[waking up]');
    await waitFor(`${G}.state === 'waking'`, 6000);
    check('the wake-up prompt says to tap', await ev("ERX.Touch.enabled"));
    await shot('03-wake');
    for (let i = 0; i < 40 && (await ev(`${G}.state`)) === 'waking'; i++) await b.tap(422, 200);
    check('tapping wakes you up', await waitFor(`${G}.state === 'play'`, 4000));

    console.log('[on-screen controls]');
    check('the controls appear when you can play', await waitFor('ERX.Touch.visible()', 3000));
    await shot('04-controls');
    const pad = await button('pad');
    const x0 = await ev(`${G}.player.x`);
    await b.touch('touchStart', [{ x: pad.x + 30, y: pad.y, id: 1 }]);
    await sleep(700);
    check('holding → walks right', (await ev(`${G}.player.x`)) > x0 + 30, [x0, await ev(`${G}.player.x`)]);
    check('...facing right', (await ev(`${G}.player.facing`)) === 1);
    // slide the same thumb over to the left half of the pad
    await b.touch('touchMove', [{ x: pad.x - 30, y: pad.y, id: 1 }]);
    await sleep(500);
    check('sliding your thumb to ← walks left', (await ev(`${G}.player.facing`)) === -1 && (await ev("ERX.Keybinds.isDown('moveLeft') && !ERX.Keybinds.isDown('moveRight')")));
    // second finger: jump while walking
    const jump = await button('jump');
    await b.touch('touchStart', [{ x: pad.x - 30, y: pad.y, id: 1 }, { x: jump.x, y: jump.y, id: 2 }]);
    check('JUMP works with another finger still walking', await waitFor(`!${G}.player.onGround || ${G}.player.vy < 0`, 1000));
    await b.touch('touchEnd', []);
    await sleep(400);
    check('letting go stops you', await ev("!ERX.Keybinds.isDown('moveLeft') && !ERX.Keybinds.isDown('moveRight') && !ERX.Keybinds.isDown('jump')"));
    await waitFor(`${G}.player.onGround`, 2000);
    const atk = await button('attack');
    await b.touch('touchStart', [{ x: atk.x, y: atk.y, id: 3 }]);
    check('HIT punches', await waitFor(`${G}.player.attackT > 0`, 500));
    await b.touch('touchEnd', []);
    await waitFor(`${G}.player.attackT <= 0`, 1000);
    const dash = await button('dash');
    const xd = await ev(`${G}.player.x`);
    await b.tap(dash.x, dash.y);
    await sleep(250);
    check('DASH dashes', Math.abs((await ev(`${G}.player.x`)) - xd) > 20, [xd, await ev(`${G}.player.x`)]);
    await sleep(400);
    await b.touch('touchStart', [{ x: 422, y: 120, id: 4 }]);
    await sleep(120);
    check('a tap on empty game space does nothing (no accidental punches)', await ev(`${G}.player.attackT <= 0 && !ERX.Keybinds.isDown('attack') && !ERX.Input.mouse.down[0]`));
    await b.touch('touchEnd', []);
    check('on-screen hints name the touch buttons', await ev("ERX.keyText('{jump}') === '[JUMP]' && ERX.keyText('{use}') === '[USE]'"));

    console.log('[dialogue + pause]');
    await ev(`(() => { const g = ${G}; g.runScript(function* (gg) { gg.lockControls(true); gg.dialogue.say(ERX.Story.cave.VOICE, 'Tap to continue. Go on.'); yield () => gg.dialogue.result; gg.lockControls(false); }); return true; })()`);
    check('during dialogue the controls get out of the way', await waitFor('!ERX.Touch.visible()', 2000));
    await sleep(1500);
    await shot('05-dialogue');
    await b.tap(422, 200);
    await b.tap(422, 200);
    check('tapping advances dialogue', await waitFor(`!${G}.dialogue.active && !${G}.script`, 3000));
    await waitFor('ERX.Touch.visible()', 2000);
    const pause = await button('pause');
    await b.tap(pause.x, pause.y);
    check('the pause button pauses', await waitFor("ERX.Scenes.top().id === 'pause'", 2000));
    await waitFor('ERX.Scenes.top().appearT >= 1', 2000);
    await shot('06-pause');
    await tapWidget('ERX.Scenes.top().buttons[0]');
    check('tapping RESUME resumes', await waitFor("ERX.Scenes.top().id === 'game' && !ERX.Scenes.busy", 3000));
    const bag = await button('inventory');
    await waitFor('ERX.Touch.visible()', 2000);
    await b.tap(bag.x, bag.y);
    check('the BAG button opens the inventory', await waitFor("ERX.Scenes.top().id === 'inventory'", 2000));
    await waitFor('ERX.Scenes.top().appearT >= 1', 2000);
    await tapWidget('ERX.Scenes.top().backBtn');
    check('...and you can tap out of it', await waitFor("ERX.Scenes.top().id === 'game' && !ERX.Scenes.busy", 3000));

    console.log('[portrait]');
    await b.phone(390, 844, 3);
    await sleep(500);
    check('held upright, it asks you to turn the phone sideways', await ev('ERX.Display.width < ERX.Display.height'));
    await shot('07-portrait');
    await b.phone(844, 390, 3);
    await sleep(500);
    check('...and turning it back brings the game back', await ev('ERX.Display.width > ERX.Display.height && ERX.Touch.visible()'));

    check('no console errors', b.errors.length === 0, b.errors);
  } catch (e) {
    check('test run crashed', false, String(e && e.stack || e));
  } finally {
    await b.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed.');
  process.exit(failed.length ? 1 : 0);
})();
