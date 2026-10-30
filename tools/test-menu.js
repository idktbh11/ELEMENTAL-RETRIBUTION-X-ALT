/*
 * Automated end-to-end test for the ELEMENTAL RETRIBUTION X main menu.
 *
 *   node tools/test-menu.js            (needs Node 22+ and Chrome or Edge)
 *   node tools/test-menu.js --shots    (also saves screenshots to tools/screenshots)
 *
 * Drives the real game in a headless browser with real keyboard and mouse
 * events, then inspects game state.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp.js');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file:///' + ROOT.replace(/\\/g, '/') + '/index.html';
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(__dirname, 'screenshots');
if (SHOTS) fs.mkdirSync(SHOT_DIR, { recursive: true });

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  console.log((ok ? '  PASS ' : '  FAIL ') + name + (detail !== undefined && !ok ? '  -> ' + JSON.stringify(detail) : ''));
}

async function ready(b) {
  for (let i = 0; i < 80; i++) {
    try { if (await b.eval('!!(window.ERX && ERX.Game && ERX.Game.ready)')) return true; } catch (e) { /* loading */ }
    await sleep(100);
  }
  return false;
}
const top = (b) => b.eval('ERX.Scenes.top() && ERX.Scenes.top().id');
const shot = async (b, name) => { if (SHOTS) await b.screenshot(path.join(SHOT_DIR, name + '.png')); };
async function waitFor(b, expr, ms = 3000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await b.eval(expr)) return true;
    await sleep(80);
  }
  return false;
}
async function toMenu(b) {
  await b.key('Enter');
  await waitFor(b, "ERX.Scenes.top().state === 'menu' && ERX.Scenes.top().buttonsT > 0.5");
}
/** Move main-menu focus to button i using real arrow-key presses. */
async function focusMain(b, i) {
  for (let n = 0; n < 8; n++) {
    const cur = await b.eval('ERX.Scenes.top().group.index');
    if (cur === i) return true;
    await b.key(cur < i ? 'ArrowDown' : 'ArrowUp');
  }
  return false;
}
/** Centre of a main-menu button in CSS pixels. */
async function buttonCenter(b, i) {
  return b.eval(`(() => { const w = ERX.Scenes.find('mainMenu').buttons[${i}]; const r = ERX.Display.canvas.getBoundingClientRect(); const k = r.width / ERX.Display.width; return { x: (w.x + w.w / 2) * k, y: (w.y + w.h / 2) * k }; })()`);
}

(async () => {
  console.log('ELEMENTAL RETRIBUTION X — menu test suite\n');
  const b = await launch({ width: 1920, height: 1080 });
  try {
    await b.viewport(1920, 1080);

    // ---------------------------------------------------------- launch
    console.log('[launch]');
    await b.goto(URL + '?scene=sky&seed=1');
    check('game boots and reaches ready state', await ready(b));
    check('main menu is the first screen', (await top(b)) === 'mainMenu');
    check('logo image loaded', await b.eval("!!ERX.Assets.image('logo') && ERX.Assets.image('logo').width === 236"));
    check('canvas uses integer pixel scale', await b.eval('Number.isInteger(ERX.Display.scale) && ERX.Display.scale >= 1'));
    await sleep(1600);
    check('PRESS ANY KEY prompt shown', (await b.eval('ERX.Scenes.top().state')) === 'press');
    await toMenu(b);
    check('menu buttons appear after a key press', (await b.eval('ERX.Scenes.top().state')) === 'menu');
    check('audio context unlocked and running', (await b.eval("ERX.Audio.ctx && ERX.Audio.ctx.state")) === 'running');
    check('menu music is playing (procedural sequencer)', await b.eval('!!ERX.Audio.music.player'));
    check('ambient soundscape is playing', await b.eval('!!ERX.Audio.ambience.player'));
    await shot(b, '01-main-menu');

    // ---------------------------------------------------- keyboard nav
    console.log('[keyboard navigation]');
    await b.key('ArrowDown');
    check('arrow down moves focus to SETTINGS', (await b.eval('ERX.Scenes.top().group.index')) === 1);
    await b.key('ArrowUp'); await b.key('ArrowUp');
    check('focus wraps from top to bottom (CREDITS)', (await b.eval('ERX.Scenes.top().group.index')) === 3);
    await b.key('ArrowDown');
    check('focus wraps back to PLAY', (await b.eval('ERX.Scenes.top().group.index')) === 0);
    await b.key('Escape');
    check('ESC on main menu shows a joke instead of breaking', await b.eval('ERX.Toast.items.length > 0') && (await top(b)) === 'mainMenu');
    await b.type('fire');
    check('typing an element name does NOT choose an element', await b.eval("ERX.Toast.items.some(t => /choose|ignor|typing|revealed/i.test(t.text))"));
    check('no element is ever stored in settings', await b.eval("!JSON.stringify(ERX.Settings.data).match(/element/i)"));
    console.log('[element registry]');
    check('all 31 elements are registered with unique ids', await b.eval("ERX.Elements.count === 31 && new Set(ERX.Elements.list.map(e => e.id)).size === 31"));
    check('every element has colours, a description and world hints', await b.eval("ERX.Elements.list.every(e => /^#[0-9a-f]{6}$/i.test(e.color) && /^#[0-9a-f]{6}$/i.test(e.dark) && e.desc && e.world && e.world.tint && e.world.particles && e.world.weather && e.world.mood)"));
    check('every element name is caught by the name checker', await b.eval("ERX.Elements.list.every(e => ERX.CharacterNames.judgeName(e.name).element)"));
    check('normal names are not falsely flagged', await b.eval("['Gerald', 'Sandra', 'Alice', 'Captain Noodle', 'Bob'].every(n => !ERX.CharacterNames.judgeName(n).element)"));

    // ------------------------------------------- PLAY -> CHARACTERS
    console.log('[character select & creation]');
    const top2 = (id) => waitFor(b, `ERX.Scenes.top().id === '${id}' && !ERX.Scenes.busy && ERX.Scenes.top().appearT >= 1`);
    await b.key('Enter');
    check('PLAY opens the character select screen', await top2('characters'));
    check('character list starts empty on a fresh install', await b.eval('ERX.Saves.characters.length === 0'));
    check('with no characters, NEW is focused', await b.eval("ERX.Scenes.top().group.focused === ERX.Scenes.top().newBtn"));
    await shot(b, '02a-characters-empty');
    await b.key('Enter');
    check('NEW opens the character creator', await top2('creator'));
    const look0 = await b.eval('JSON.stringify(ERX.Scenes.top().look)');
    await b.key('ArrowRight');           // gender
    await b.key('ArrowDown'); await b.key('ArrowDown');
    await b.key('ArrowRight');           // hair
    check('arrow keys change appearance options', (await b.eval('JSON.stringify(ERX.Scenes.top().look)')) !== look0);
    check('the look has no element field', await b.eval("!('element' in ERX.Scenes.top().look)"));
    for (let i = 0; i < 6; i++) await b.key('ArrowDown');
    const lookBefore = await b.eval('JSON.stringify(ERX.Scenes.top().look)');
    await b.key('Enter'); await b.key('ArrowRight');
    check('ELEMENT row is locked and only makes jokes', (await b.eval('JSON.stringify(ERX.Scenes.top().look)')) === lookBefore && await b.eval("ERX.Toast.items.some(t => /lock|Nope|fate/i.test(t.text))"));
    await b.key('ArrowDown');            // RANDOMIZE
    await b.key('Enter');
    check('RANDOMIZE rolls a new look', (await b.eval('JSON.stringify(ERX.Scenes.top().look)')) !== lookBefore);
    await shot(b, '02b-creator');
    await b.key('ArrowDown'); await b.key('ArrowRight'); // -> NEXT
    await b.key('Enter');
    check('NEXT opens the name step with text input', await b.eval("ERX.Scenes.top().state === 'name' && ERX.Input.textMode === true"));
    await b.key('Enter');
    check('empty names are rejected', await b.eval("ERX.Saves.characters.length === 0 && !!ERX.Scenes.top().msg"));
    await b.type('wasd');
    check('letters type into the name (not menu controls)', (await b.eval('ERX.Scenes.top().textBox.value')) === 'wasd' && (await b.eval("ERX.Scenes.top().state")) === 'name');
    for (let i = 0; i < 4; i++) await b.key('Backspace', { wait: 40 });
    await b.type('fire');
    await b.key('Enter');
    check('element names are rejected with a joke', await b.eval("ERX.Saves.characters.length === 0 && /FIRE/.test(ERX.Scenes.top().msg.text)"));
    await shot(b, '02c-name-fire');
    for (let i = 0; i < 4; i++) await b.key('Backspace', { wait: 40 });
    await b.type('abcdefghijklmnopqrstu');
    check('names are capped at 16 characters', (await b.eval('ERX.Scenes.top().textBox.value.length')) === 16);
    for (let i = 0; i < 16; i++) await b.key('Backspace', { wait: 30 });
    await b.type('gerald');
    await b.key('Enter');
    check('a valid name creates the character', await waitFor(b, "ERX.Saves.characters.length === 1 && ERX.Saves.characters[0].name === 'gerald'"));
    check('creator returns to the list with the new character', await top2('characters'));
    check('saved character has no element', await b.eval("!('element' in ERX.Saves.characters[0])"));
    await shot(b, '02d-characters-one');

    // insisting on an element name three times
    await b.eval("ERX.Scenes.top().group.focus(ERX.Scenes.top().newBtn); true");
    await b.key('Enter');
    await top2('creator');
    await b.eval("ERX.Scenes.top().lookGroup.focus(ERX.Scenes.top().nextBtn); true");
    await b.key('Enter');
    for (let attempt = 0; attempt < 3; attempt++) {
      await b.eval("ERX.Scenes.top().textBox.value = ''; true");
      await b.type('water');
      await b.key('Enter');
    }
    check('third element-name attempt becomes "Definitely Not ..."', await waitFor(b, "ERX.Saves.characters.some(c => c.name === 'Definitely Not water')", 5000));
    await top2('characters');

    // persistence
    await b.goto(URL + '?scene=sky&seed=1');
    await ready(b);
    check('characters persist after reload', await b.eval('ERX.Saves.load().length === 2'));
    await sleep(1500);
    await toMenu(b);
    await b.key('Enter');
    await top2('characters');

    // play as a character (the full gameplay run is in tools/test-game.js)
    console.log('[play]');
    await b.eval("ERX.Scenes.top().group.focus(ERX.Scenes.top().rows[0]); ERX.Scenes.top().rows[0].slot = 0; true");
    await b.key('Enter');
    check('PLAY on a character starts the game', await waitFor(b, "ERX.Scenes.top().id === 'game'", 4000));
    check('the game knows which character is playing', (await b.eval('ERX.Scenes.top().character.name')) === 'gerald');
    await sleep(2600);
    await shot(b, '02e-game-wake');
    await b.key('Escape');
    check('ESC in game opens the pause menu', await waitFor(b, "ERX.Scenes.top().id === 'pause' && ERX.Scenes.top().appearT >= 1"));
    for (let i = 0; i < 5; i++) await b.key('ArrowDown');
    await b.key('Enter');
    check('QUIT TO MENU returns to the character list', await waitFor(b, "ERX.Scenes.top().id === 'characters' && !ERX.Scenes.busy", 4000));
    check('menu music returns after quitting', await b.eval('ERX.Audio.music.wanted === ERX.Backgrounds.current.music'));
    // delete (with confirmation)
    console.log('[delete character]');
    await sleep(300);
    await b.key('ArrowRight');
    await b.key('Enter');
    check('DELETE asks for confirmation', await top2('confirm'));
    await shot(b, '02f-delete-confirm');
    await b.key('Enter'); // focus starts on KEEP
    check('KEEP cancels the deletion', await waitFor(b, "ERX.Scenes.top().id === 'characters'") && await b.eval('ERX.Saves.characters.length === 2'));
    await sleep(300);
    await b.key('Delete');
    await top2('confirm');
    await b.key('ArrowRight');
    await b.key('Enter');
    check('DELETE removes the character', await waitFor(b, "ERX.Scenes.top().id === 'characters' && ERX.Saves.characters.length === 1"));
    check('deletion is saved', (await b.eval("ERX.Storage.load('characters').list.length")) === 1);
    await b.key('Escape');
    check('ESC returns from character select to the main menu', await waitFor(b, "ERX.Scenes.top().id === 'mainMenu' && !ERX.Scenes.busy"));

    // -------------------------------------------------------- SETTINGS
    console.log('[settings]');
    await sleep(300);
    await focusMain(b, 1);
    await b.key('Enter');
    check('SETTINGS opens', await waitFor(b, "ERX.Scenes.top().id === 'settings' && !ERX.Scenes.busy"));
    await shot(b, '03-settings-audio');
    const master0 = await b.eval("ERX.Settings.get('audio.master')");
    await b.key('ArrowDown');
    await b.key('ArrowLeft'); await b.key('ArrowLeft');
    const master1 = await b.eval("ERX.Settings.get('audio.master')");
    check('master volume slider changes value', master1 === master0 - 10, { master0, master1 });
    check('master volume reaches the audio bus', await b.eval(`Math.abs(ERX.Audio.buses.master.gain.value - Math.pow(${master1} / 100, 1.8)) < 0.05`));
    await b.key('ArrowDown');
    await b.key('ArrowLeft');
    check('music volume slider works', (await b.eval("ERX.Settings.get('audio.music')")) === 55);
    await b.key('ArrowDown');
    await b.key('ArrowRight');
    check('sfx volume slider works', (await b.eval("ERX.Settings.get('audio.sfx')")) === 85);

    // video tab
    await b.key('KeyE');
    check('E switches to the VIDEO tab', (await b.eval('ERX.Scenes.top().tabBar.index')) === 1);
    await b.key('ArrowDown');
    const parts0 = await b.eval('ERX.Backgrounds.env.motes.count');
    await b.key('Enter');
    check('Low Detail Mode toggles on', await b.eval("ERX.Settings.get('video.lowDetail') === true && ERX.Backgrounds.env.low === true"));
    // no new particles spawn; the old ones (8-16 s lifetimes) fade out over time
    await waitFor(b, `ERX.Backgrounds.env.motes.count + ERX.Backgrounds.env.streaks.count < ${parts0}`, 16000);
    const parts1 = await b.eval('ERX.Backgrounds.env.motes.count + ERX.Backgrounds.env.streaks.count');
    check('Low Detail Mode actually reduces particles', parts1 < parts0 || parts1 === 0, { before: parts0, after: parts1 });
    check('Low Detail Mode stops camera sway', await b.eval('Math.abs(ERX.Backgrounds.cam.x) < 3'));
    await shot(b, '04-settings-video-lowdetail');
    await b.key('Enter');
    check('Low Detail Mode toggles off', await b.eval("ERX.Settings.get('video.lowDetail') === false"));
    await b.key('ArrowDown'); // screen shake
    await b.key('ArrowDown'); // fullscreen
    await b.key('ArrowDown'); // show fps
    await b.key('Enter');
    check('Show FPS toggles', await b.eval("ERX.Settings.get('video.showFps') === true"));

    // controls tab
    await b.key('KeyE');
    check('controls tab opens', (await b.eval('ERX.Scenes.top().tabBar.index')) === 2);
    await shot(b, '05-settings-controls');
    await b.key('ArrowDown'); // Move Left row
    await b.key('Enter');
    check('selecting a key slot starts listening', await b.eval('ERX.Input.capturing'));
    await b.key('KeyX');
    check('pressing a key rebinds it', (await b.eval("ERX.Keybinds.get('moveLeft')[0]")) === 'KeyX');
    await b.key('ArrowDown'); // Move Right row
    await b.key('Enter');
    await b.key('KeyX');
    const bl = await b.eval("[ERX.Keybinds.get('moveLeft')[0], ERX.Keybinds.get('moveRight')[0]]");
    check('conflicting key is swapped, never duplicated', bl[0] === 'KeyD' && bl[1] === 'KeyX', bl);
    check('conflict is explained with a message', await b.eval("ERX.Toast.items.some(t => /Swapped/.test(t.text))"));
    await b.key('Enter');
    await b.key('Escape');
    check('ESC cancels listening without rebinding', !(await b.eval('ERX.Input.capturing')) && (await b.eval("ERX.Keybinds.get('moveRight')[0]")) === 'KeyX' && (await top(b)) === 'settings');
    await b.key('ArrowRight'); // alt slot
    await b.key('Delete');
    check('DELETE clears a slot', (await b.eval("ERX.Keybinds.get('moveRight')[1]")) === null);
    // mouse binding via click on the slot
    const slot = await b.eval(`(() => { const r = ERX.Scenes.top().keyRows[3]; const s = r._slotRect(0); const k = ERX.Display.canvas.getBoundingClientRect().width / ERX.Display.width; return { x: (s.x + s.w / 2) * k, y: (s.y + 6) * k }; })()`);
    await b.click(slot.x, slot.y);
    check('clicking a slot starts listening', await b.eval('ERX.Input.capturing'));
    await b.click(slot.x, slot.y, 'right');
    check('mouse buttons can be bound', (await b.eval("ERX.Keybinds.get('attack')[0]")) === 'Mouse2');
    check('game code can query actions (Keybinds.isDown)', (await b.eval("typeof ERX.Keybinds.isDown('jump')")) === 'boolean');

    // ------------------------------------------------- persistence
    console.log('[persistence]');
    await b.key('Escape');
    await waitFor(b, "ERX.Scenes.top().id === 'mainMenu' && !ERX.Scenes.busy");
    await b.goto(URL + '?scene=sky&seed=1');
    await ready(b);
    check('volume settings persist after reload', (await b.eval("[ERX.Settings.get('audio.master'), ERX.Settings.get('audio.music'), ERX.Settings.get('audio.sfx')].join()")) === [master1, 55, 85].join());
    check('video settings persist after reload', await b.eval("ERX.Settings.get('video.showFps') === true && ERX.Settings.get('video.lowDetail') === false"));
    check('keybinds persist after reload', (await b.eval("ERX.Keybinds.get('moveRight')[0] + ',' + ERX.Keybinds.get('attack')[0]")) === 'KeyX,Mouse2');
    await sleep(1500);
    await toMenu(b);

    // reset keys through the UI
    await focusMain(b, 1); await b.key('Enter');
    await waitFor(b, "ERX.Scenes.top().id === 'settings' && !ERX.Scenes.busy");
    await b.key('KeyQ');
    check('Q switches tabs backwards (wraps to CONTROLS)', (await b.eval('ERX.Scenes.top().tabBar.index')) === 2);
    await b.key('ArrowUp'); await b.key('ArrowUp'); // -> reset (last-1)
    const focusedLabel = await b.eval('ERX.Scenes.top().group.focused.label');
    if (focusedLabel === 'RESET KEYS') await b.key('Enter');
    check('RESET KEYS restores defaults', (await b.eval("ERX.Keybinds.get('moveRight')[0] + ',' + ERX.Keybinds.get('attack')[0]")) === 'KeyD,KeyJ', focusedLabel);
    // restore the default settings for the rest of the run
    await b.eval("ERX.Settings.set('video.showFps', false); ERX.Settings.set('audio.master', 80); ERX.Settings.set('audio.music', 60); ERX.Settings.set('audio.sfx', 80); ERX.Settings.save(); true");
    await b.key('Escape');
    await waitFor(b, "ERX.Scenes.top().id === 'mainMenu' && !ERX.Scenes.busy");

    // ------------------------------------------------------------ HELP
    console.log('[help & credits]');
    await sleep(200);
    await focusMain(b, 2);
    await b.key('Enter');
    check('HELP opens', await waitFor(b, "ERX.Scenes.top().id === 'help' && !ERX.Scenes.busy"));
    await shot(b, '06-help');
    await b.key('PageDown');
    await sleep(500);
    check('help text scrolls', await b.eval('ERX.Scenes.top().scroll > 50'));
    check('help never reveals an element', await b.eval("!ERX.Data.help.some(s => s.body.join(' ').match(/your element is (fire|water|earth|lightning|void|air)/i))"));
    await b.key('Escape');
    check('ESC closes HELP', await waitFor(b, "ERX.Scenes.top().id === 'mainMenu' && !ERX.Scenes.busy"));

    // --------------------------------------------------------- CREDITS
    await focusMain(b, 3);
    await b.key('Enter');
    check('CREDITS opens', await waitFor(b, "ERX.Scenes.top().id === 'credits' && !ERX.Scenes.busy"));
    const s0 = await b.eval('ERX.Scenes.top().scroll');
    await sleep(2500);
    check('credits roll automatically', (await b.eval('ERX.Scenes.top().scroll')) > s0 + 5);
    await shot(b, '07-credits');
    await b.key('Enter');
    check('credits BACK button works', await waitFor(b, "ERX.Scenes.top().id === 'mainMenu' && !ERX.Scenes.busy"));

    // ----------------------------------------------------------- MOUSE
    console.log('[mouse]');
    await sleep(200);
    let c = await buttonCenter(b, 2);
    await b.move(c.x, c.y);
    check('mouse hover focuses a button', (await b.eval('ERX.Scenes.top().group.index')) === 2);
    await b.click(c.x, c.y);
    check('mouse click opens HELP', await waitFor(b, "ERX.Scenes.top().id === 'help' && !ERX.Scenes.busy"));
    await waitFor(b, 'ERX.Scenes.top().appearT >= 1');
    await sleep(100);
    const back = await b.eval("(() => { const w = ERX.Scenes.top().backBtn; const k = ERX.Display.canvas.getBoundingClientRect().width / ERX.Display.width; return { x: (w.x + w.w / 2) * k, y: (w.y + w.h / 2) * k }; })()");
    await b.click(back.x, back.y);
    check('mouse click on BACK returns', await waitFor(b, "ERX.Scenes.top().id === 'mainMenu' && !ERX.Scenes.busy"));
    c = await buttonCenter(b, 1);
    await b.click(c.x, c.y);
    await waitFor(b, "ERX.Scenes.top().id === 'settings' && !ERX.Scenes.busy && ERX.Scenes.top().appearT >= 1");
    await sleep(100);
    const before = await b.eval("ERX.Settings.get('audio.master')");
    const bar = await b.eval("(() => { const sl = ERX.Scenes.top().audioWidgets[0]; const r = sl._barRect(); const k = ERX.Display.canvas.getBoundingClientRect().width / ERX.Display.width; return { x0: (r.bx + 2) * k, x1: (r.bx + r.bw * 0.5) * k, y: (r.by + 3) * k }; })()");
    await b.drag(bar.x0, bar.y, bar.x1, bar.y);
    const after = await b.eval("ERX.Settings.get('audio.master')");
    check('slider can be dragged with the mouse', after !== before && after >= 40 && after <= 60, { before, after });
    await b.wheel(bar.x1, bar.y, 100);
    await b.key('Escape');
    await waitFor(b, "ERX.Scenes.top().id === 'mainMenu' && !ERX.Scenes.busy");
    await b.eval("ERX.Settings.set('audio.master', 80); ERX.Settings.save(); true");

    // ------------------------------------------------- every world
    console.log('[menu worlds]');
    for (const id of ['sky', 'village', 'tree', 'peaks']) {
      await b.goto(URL + '?scene=' + id);
      const ok = await ready(b);
      await sleep(1200);
      const st = await b.eval("({ id: ERX.Backgrounds.current.id, t: ERX.Backgrounds.env.t })");
      await sleep(500);
      const t2 = await b.eval('ERX.Backgrounds.env.t');
      check('world "' + id + '" loads and animates', ok && st.id === id && t2 > st.t, st);
      await b.key('Enter');
      await sleep(900);
      await shot(b, '08-world-' + id);
    }

    console.log('[random selection]');
    const seen = [];
    for (let i = 0; i < 8; i++) {
      await b.goto(URL);
      await ready(b);
      seen.push(await b.eval('ERX.Backgrounds.current.id'));
    }
    const valid = seen.every((s) => ['sky', 'village', 'tree', 'peaks'].includes(s));
    const repeats = seen.some((s, i) => i > 0 && s === seen[i - 1]);
    check('random world on every launch (' + seen.join(', ') + ')', valid && new Set(seen).size >= 2);
    check('same world never shown twice in a row', !repeats);
    await b.eval('void 0');

    // ------------------------------------------------ neon jam (secret)
    console.log('[neon jam]');
    await b.goto(URL);
    await ready(b);
    await sleep(1600);
    await b.key('Enter');
    await sleep(900);
    const menuBefore = await b.eval('(window.__menu = ERX.Scenes.top(), true)');
    void menuBefore;
    await b.type('neonjam');
    await sleep(1700);
    const nj = await b.eval(`JSON.stringify({ world: ERX.Backgrounds.current.id, name: ERX.Backgrounds.current.name, fresh: ERX.Scenes.top() !== window.__menu && ERX.Scenes.top().id === 'mainMenu', music: ERX.Audio.musicTime(), src: ERX.Audio.music.element ? decodeURIComponent(ERX.Audio.music.element.src) : '' })`);
    const njo = JSON.parse(nj);
    check('typing "neonjam" restarts the menu in NEON CITY', njo.world === 'neon' && njo.name === 'NEON CITY' && njo.fresh, njo);
    check('...and "Boss Battle" plays first', njo.music.id === 'neonjam' && njo.music.track === 0 && /boss-battle/.test(njo.src), njo);
    check('both songs have a beat map (every beat, hype, drops on the bar lines)', await b.eval(`ERX.NeonJamData.tracks.length === 2 && ERX.NeonJamData.tracks.every((t) => t.beats.length > 400 && t.beats.slice(1).every((d) => d > 280 && d < 600) && t.hype.length === t.beats.length && t.drops.length >= 3 && t.drops.every((k) => (k - t.bar0) % 4 === 0))`));
    await sleep(1500);
    check('the menu\'s beat follows the real beat of the music', await b.eval('ERX.NeonJam.st.k >= 2 && ERX.Audio.beat().fake === false'));
    // the songs take turns: Boss Battle -> Boss Protocol Engaged -> Boss Battle...
    await b.eval('(ERX.Audio.music.element.dispatchEvent(new Event("ended")), true)');
    await sleep(500);
    const second = await b.eval('JSON.stringify({ t: ERX.Audio.musicTime(), src: decodeURIComponent(ERX.Audio.music.element.src) })');
    await b.eval('(ERX.Audio.music.element.dispatchEvent(new Event("ended")), true)');
    await sleep(500);
    const third = await b.eval('JSON.stringify({ t: ERX.Audio.musicTime(), src: decodeURIComponent(ERX.Audio.music.element.src) })');
    check('...then "Boss Protocol Engaged", then round again in that order', /boss-protocol-engaged/.test(JSON.parse(second).src) && JSON.parse(second).t.track === 1 && /boss-battle/.test(JSON.parse(third).src) && JSON.parse(third).t.track === 0, [second, third]);
    // the screen: thumps on the beat, spins at a drop, flips upside down and back (stepped with a fake music clock)
    const moves = await b.eval(`(() => {
      const J = ERX.NeonJam, tr = ERX.NeonJamData.tracks[0], real = ERX.Audio.musicTime; let T = 0, acc = 0;
      const bt = tr.beats.map((d) => (acc += d) / 1000), spinK = tr.moves.find((m) => m[1] === 'spin')[0], flipK = tr.moves.find((m) => m[1] === 'flip')[0];
      ERX.Audio.musicTime = () => ({ id: 'neonjam', track: 0, time: T, playing: true });
      const run = (from, to) => { const r = { maxRot: 0, minFy: 1, maxScale: 1 }; J.st.track = -1; for (T = from; T < to; T += 1 / 60) { J.update(1 / 60); const sc = J.screen(); if (sc) { r.maxRot = Math.max(r.maxRot, Math.abs(sc.rot)); r.minFy = Math.min(r.minFy, sc.fy); r.maxScale = Math.max(r.maxScale, sc.scale); } } r.endRot = J.screen().rot; r.endFy = J.screen().fy; return r; };
      const spin = run(bt[spinK] - 0.3 + J.LAG, bt[spinK + 3] + J.LAG), flip = run(bt[flipK] - 0.3 + J.LAG, bt[flipK + 3] + J.LAG), beat = run(bt[20] - 0.1 + J.LAG, bt[21] + J.LAG);
      ERX.Audio.musicTime = real;
      return JSON.stringify({ spin, flip, beat });
    })()`);
    const mo = JSON.parse(moves);
    check('the whole screen thumps on every beat', mo.beat.maxScale > 1.01, mo.beat);
    check('...spins all the way round when the beat drops', mo.spin.maxRot > 6 && Math.abs(mo.spin.endRot) < 0.01, mo.spin);
    check('...and now and then flips upside down and straight back', mo.flip.minFy <= -0.99 && mo.flip.endFy === 1, mo.flip);
    check('Neon City is never picked at random (only by the code)', await b.eval('Array.from({ length: 300 }, () => ERX.Backgrounds.pick().id).every((id) => id !== "neon")'));
    await shot(b, '08-world-neon');
    await b.key('Enter');
    await sleep(900);
    await b.type('neonjam');
    await sleep(1700);
    check('typing it again goes back to a normal world (and its music)', await b.eval("ERX.Backgrounds.current.id !== 'neon' && ERX.Audio.musicTime().id === ERX.Backgrounds.current.music && !ERX.NeonJam.screen()"));

    // ------------------------------------------------ resolutions
    console.log('[resolutions]');
    const sizes = [[1280, 720], [1366, 768], [1600, 900], [2560, 1440], [3440, 1440], [1024, 768], [800, 600], [3840, 2160]];
    for (const [w, h] of sizes) {
      await b.viewport(w, h);
      await sleep(400);
      const d = await b.eval('({ w: ERX.Display.width, h: ERX.Display.height, s: ERX.Display.scale, cw: ERX.Display.canvas.getBoundingClientRect().width, ch: ERX.Display.canvas.getBoundingClientRect().height })');
      const covers = d.cw >= w - 0.5 && d.ch >= h - 0.5 && d.cw < w + d.s && d.ch < h + d.s;
      check(`${w}x${h} -> ${d.w}x${d.h} @${d.s}x, fills window, crisp`, Number.isInteger(d.s) && d.h >= 250 && covers, d);
      if (w === 1280 || w === 3440 || w === 800) {
        await sleep(300);
        await shot(b, '09-res-' + w + 'x' + h);
      }
    }
    await b.viewport(1920, 1080);

    // ------------------------------------------------------ errors
    console.log('[errors]');
    check('no console errors or exceptions', b.errors.length === 0, b.errors);
  } catch (e) {
    check('test run crashed', false, String(e && e.stack || e));
  } finally {
    await b.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed.');
  process.exit(failed.length ? 1 : 0);
})();
