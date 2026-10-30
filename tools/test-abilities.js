/*
 * Element abilities test: kits for every element, casting with the real
 * keys, upgrades, status effects, guard breaks, the element skill tree,
 * the Training Room dummies and the hidden admin panel.
 *
 * Also checks that every move and Ultimate is its own code (no recolours).
 *
 *   node tools/test-abilities.js            (add --shots to save screenshots)
 */
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp.js');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file:///' + ROOT.replace(/\\/g, '/') + '/index.html?scene=sky&seed=4';
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(__dirname, 'screenshots');
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log((ok ? '  PASS ' : '  FAIL ') + name + (ok || detail === undefined ? '' : '  -> ' + JSON.stringify(detail)));
}

(async () => {
  console.log('ELEMENTAL RETRIBUTION X — abilities test\n');
  const b = await launch({ width: 1280, height: 720 });
  const ev = (e) => b.eval(e);
  const G = 'ERX.Scenes.find("game")';
  const waitFor = async (expr, ms = 5000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await ev(expr)) return true; } catch (e) { /* */ } await sleep(80); } return false; };
  const shot = async (n) => { if (SHOTS) { fs.mkdirSync(SHOT_DIR, { recursive: true }); await b.screenshot(path.join(SHOT_DIR, 'abil-' + n + '.png')); } };

  try {
    await b.goto(URL);
    check('boots', await waitFor('!!(window.ERX && ERX.Game && ERX.Game.ready)', 15000));

    console.log('[the kits]');
    const kits = await ev(`(() => {
      const bad = [], S = ERX.Abilities.STATUS, src = (fns) => fns.filter(Boolean).map(String).join('|');
      const moveSrc = new Map(), m1Names = new Set(), chargeSrc = new Set(), runSrc = new Set(), ultNames = new Set(), upSrc = new Map(), upNames = new Set();
      for (const el of ERX.Elements.list) {
        const k = ERX.Kits[el.id];
        if (!k) { bad.push(el.id + ': no kit'); continue; }
        if (!k.m1 || !Array.isArray(k.s) || k.s.length !== 5) { bad.push(el.id + ': needs an M1 + 5 skills'); continue; }
        for (const m of [k.m1, ...k.s]) {
          if (!m.name || !m.desc || !m.spawn) bad.push(el.id + ': ' + (m.name || '?') + ' incomplete');
          const code = src([m.spawn, m.update, m.draw]);
          if (moveSrc.has(code)) bad.push(el.id + ' ' + m.name + ' is a copy of ' + moveSrc.get(code)); else moveSrc.set(code, el.id + ' ' + m.name);
        }
        m1Names.add(k.m1.name);
        const u = k.ult;
        if (!u || !u.name || !u.desc || !u.run || !u.charge || !u.charge.draw) { bad.push(el.id + ': ultimate incomplete'); continue; }
        if (chargeSrc.has(String(u.charge.draw))) bad.push(el.id + ': ult charge is a copy');
        chargeSrc.add(String(u.charge.draw));
        if (runSrc.has(String(u.run))) bad.push(el.id + ': ult is a copy');
        runSrc.add(String(u.run));
        ultNames.add(u.name);
        if (!k.block || !k.dash) bad.push(el.id + ': block/dash');
        if (k.status !== 'random' && !S[k.status]) bad.push(el.id + ': status ' + k.status);
        if (!k.m1Up || !k.m1Up.name || !k.m1Up.desc || !k.m1Up.spawn) bad.push(el.id + ': upgraded M1');
        else if (k.m1Up.name === k.m1.name) bad.push(el.id + ': M1+ is just the M1');
        if (!k.dashUp || !k.dashUp.name || !k.dashUp.desc || !(k.dashUp.spawn || k.dashUp.update)) bad.push(el.id + ': upgraded dash');
        else if (k.dashUp.name === k.dash[0]) bad.push(el.id + ': DASH+ is just the dash');
        for (const m of [k.m1Up, k.dashUp].filter(Boolean)) {
          const code = src([m.spawn, m.update, m.draw, m.onEnd]);
          if (upSrc.has(code)) bad.push(el.id + ' ' + m.name + ' is a copy of ' + upSrc.get(code)); else upSrc.set(code, el.id + ' ' + m.name);
          upNames.add(m.name);
        }
      }
      const n = ERX.Elements.list.length;
      return { bad, moves: moveSrc.size, m1s: m1Names.size, ults: ultNames.size, ups: upSrc.size, upNames: upNames.size, n };
    })()`);
    check('every element has an M1, 5 skills, an Ultimate, a block, a dash, a status, an upgraded M1 + an upgraded dash', kits.bad.length === 0, kits.bad);
    check('all ' + 31 * 2 + ' upgraded M1s and dashes are their own code with their own names', kits.ups === kits.n * 2 && kits.upNames === kits.n * 2, kits);
    check('no upgraded move shares a name with any other move', await ev(`(() => { const names = []; for (const el of ERX.Elements.list) { const k = ERX.Kits[el.id], ak = ERX.Awakening.kit(el.id); names.push(k.m1.name, ...k.s.map((m) => m.name), k.ult.name, k.dash[0], k.block[0]); if (ak) names.push(ak.m1.name, ...ak.s.map((m) => m.name), ak.ult.name); } const set = new Set(names); return ERX.Elements.list.every((el) => !set.has(ERX.Kits[el.id].m1Up.name) && !set.has(ERX.Kits[el.id].dashUp.name)); })()`));
    check('all ' + 31 * 6 + ' moves are their own code (nothing is a recolour)', kits.moves === kits.n * 6, kits);
    check('every M1 and every Ultimate has its own name', kits.m1s === kits.n && kits.ults === kits.n, kits);
    check('only Chaos borrows other elements\' Ultimates', await ev("Object.keys(ERX.Kits).filter(id => id !== 'chaos').every(id => !String(ERX.Kits[id].ult.run).includes('kit.ult.run')) && String(ERX.Kits.chaos.ult.run).includes('kit.ult.run')"));
    check('every Ultimate has its title art (Darkness draws its own)', await ev("ERX.Elements.list.every(el => el.id === 'darkness' || !!ERX.Assets.image('ult_' + el.id))"));
    check('fire burns, ice chills, darkness blinds, nature poisons', await ev("ERX.Kits.fire.status === 'burn' && ERX.Kits.ice.status === 'chill' && ERX.Kits.darkness.status === 'blind' && ERX.Kits.nature.status === 'poison'"));
    check('wind slash, fire slash, nature thorn from the ground, ice spikes, dark scythe', await ev("ERX.Kits.wind.m1.name === 'Wind Slash' && ERX.Kits.fire.m1.name === 'Flame Slash' && ERX.Kits.nature.m1.name === 'Thorn Strike' && ERX.Kits.ice.m1.name === 'Ice Spikes' && ERX.Kits.darkness.m1.name === 'Dark Scythe'"));
    check('the Ultimates from the list (Supernova, Tsunami, Divine Tempest...)', await ev("/Supernova/.test(ERX.Kits.fire.ult.name) && /Tsunami/.test(ERX.Kits.water.ult.name) && ERX.Kits.wind.ult.name === 'Divine Tempest' && ERX.Kits.time.ult.name === 'Chrono Overkill' && ERX.Kits.chaos.ult.name === 'Absolute Anomaly'"));
    check('fire: fiery block + flaming dash, nature: a tree, ice: an ice wall', await ev("ERX.Kits.fire.block[0] === 'Flame Ward' && ERX.Kits.fire.dash[0] === 'Flame Dash' && ERX.Kits.nature.block[1] === 'tree' && ERX.Kits.ice.block[0] === 'Ice Wall' && ERX.Kits.ice.dash[0] === 'Ice Slide'"));

    console.log('[admin panel]');
    await waitFor("ERX.Scenes.top().id === 'mainMenu' && ERX.Scenes.top().state !== 'intro'", 6000);
    await b.key('Enter');
    await waitFor("ERX.Scenes.top().state === 'menu'", 3000);
    check('admin is hidden by default', await ev('!ERX.Admin.on()'));
    for (const ch of 'theelementaladmin') await b.key('Key' + ch.toUpperCase(), { wait: 25 });
    check('typing "theelementaladmin" unlocks it and opens the panel', await waitFor("ERX.Admin.on() && ERX.Scenes.top().id === 'admin'", 3000));
    await sleep(500);
    await shot('01-admin');
    check('...listing every element', await ev("ERX.Scenes.top().items.filter(i => i.type === 'el').length === ERX.Elements.list.length + 1"));
    await b.key('Escape');
    await waitFor("ERX.Scenes.top().id === 'mainMenu'", 2000);

    // a character who has reached the HQ (real element: wind)
    await ev(`(() => { ERX.Saves.load(); const c = ERX.Saves.create('Tester', ERX.Saves.randomLook()); c.element = 'wind'; c.progress = { stage: 'worldUnlocked' }; c.skillPoints = 0; ERX.Saves.update(c); ERX.Scenes.push('game', { character: c }); return true; })()`);
    await waitFor(`ERX.Scenes.top().id === 'game'`, 3000);
    await ev(`(() => { const g = ${G}; g.script = null; return true; })()`);

    console.log('[the training room]');
    await ev(`(() => { const g = ${G}; g.loadLevel('hq', {}); g.player.placeAt(g.level.trainingDoor.x, g.level.floorY); g.player.controls = true; return true; })()`);
    await sleep(400);
    check('the HQ has a TRAINING ROOM door', await ev(`!!${G}.prompt && /TRAINING ROOM/.test(${G}.prompt.text)`));
    await b.key('KeyE');
    check('...which leads to the training room', await waitFor(`${G}.levelId === 'training' && !ERX.Scenes.busy`, 5000));
    check('7 kinds of dummies: normal, attacking, blocking, countering, 1 HP, tank, runner', await ev(`${G}.enemies.map(e => e.kind).join() === 'normal,attacker,blocker,counter,onehp,tank,runner'`));
    await shot('02-training');

    console.log('[your element in action]');
    await ev(`(() => { const g = ${G}; g.player.placeAt(12.5 * 16, g.level.floorY); g.player.facing = 1; g.player.controls = true; return true; })()`);
    const d0 = await ev(`${G}.enemies[0].log.length`);
    await b.key('KeyJ');
    await sleep(500);
    check('the attack button fires your element\'s M1 (wind slash)', await ev(`${G}.enemies[0].log.length > ${d0}`));
    check('...which inflicts its status (AIRBORNE)', await ev(`${G}.enemies[0].log.length > 0`));
    await b.key('KeyQ');
    await sleep(200);
    check('skills start locked', await ev(`${G}.player.ab.cd.s1 === 0`));
    await ev(`(() => { const c = ${G}.character; c.elementSkills = { s1: 1, s2: 1, s3: 1, s4: 1, s5: 1, ult: 1 }; return true; })()`);
    for (const [key, slot] of [['KeyQ', 's1'], ['KeyR', 's2'], ['KeyC', 's3'], ['KeyX', 's4'], ['KeyZ', 's5']]) {
      await ev(`(() => { const p = ${G}.player; p.mp = p.maxMp; p.ab.cd.${slot} = 0; return true; })()`);
      await b.key(key);
      await sleep(150);
    }
    check('Q / R / C / X / Z cast the five skills (they go on cooldown)', await ev(`(() => { const ab = ${G}.player.ab; return ['s1', 's2', 's3', 's4', 's5'].every(s => ab.cd[s] > 0); })()`));
    check('skills cost mana', await ev(`${G}.player.mp < ${G}.player.maxMp`));
    await sleep(600);
    await ev(`${G}.player.ab.ult = 0`);
    await b.key('KeyV');
    await sleep(100);
    check('the Ultimate needs a full meter', await ev(`!${G}.cine`));
    await ev(`${G}.player.ab.ult = 100`);
    await b.key('KeyV');
    check('V starts the Ultimate cutscene (the world freezes)', await waitFor(`!!${G}.cine && ${G}.cine.kit.ult.name === 'Divine Tempest'`, 1000));
    await sleep(650);
    check('...you clap, power bursts out, your eyes glow', await ev(`!!${G}.cine && ${G}.cine.t > ERX.Ultimate.T.clap && !!${G}.player.cinePose`));
    check('...the camera zooms in', await ev(`!!${G}.cine && ${G}.cine.zoom() > 2`));
    check('...cuts to black, then the title slams in', await waitFor(`!!${G}.cine && ${G}.cine.t > ERX.Ultimate.T.slam && ${G}.cine.black() === 1`, 4000));
    await shot('03-ultimate-title');
    check('...then zooms out and FIRES', await waitFor(`!${G}.cine && ${G}.effects.length > 0`, 3000));
    check('the whole cutscene is quick (under 4 seconds)', await ev('ERX.Ultimate.T.end < 4'));
    await sleep(2500);
    check('dealing damage fills the Ultimate meter', await ev(`${G}.player.ab.ult > 0`));

    console.log('[upgrades]');
    const upg = await ev(`(() => { const out = []; for (const el of ERX.Elements.list) { if (el.id === 'chaos') continue; const k = ERX.Kits[el.id], a = ERX.Abilities.palette(el, k, false), b = ERX.Abilities.palette(el, k, true); if (a.c !== b.c || a.l !== b.l || a.d !== b.d) out.push(el.id); } return out; })()`);
    check('upgrades keep the element\'s own colours', upg.length === 0, upg);
    check('M1+ swaps your M1 for a whole new move; your skills stay the same', await ev(`ERX.Elements.list.every((el) => { const k = ERX.Kits[el.id], A = ERX.Abilities; return A.move(k, 'm1', true) === k.m1Up && A.move(k, 'm1', false) === k.m1 && [1, 2, 3, 4, 5].every((i) => A.move(k, 's' + i, true) === k.s[i - 1]) && A.move(k, 'ult', true) === k.ult; })`));
    check('awakened moves are not swapped out by upgrades', await ev(`ERX.Elements.list.every((el) => { const ak = ERX.Awakening.kit(el.id); return !ak || ERX.Abilities.move(ak, 'm1', true) === ak.m1; })`));
    check('upgraded skills are a bit faster to recharge', await ev(`(() => { const g = ${G}, p = g.player; p.ab = new ERX.AbilityState(p); g.character.elementSkills = { s1: 2 }; p.ab.cd.s1 = 0; p.mp = p.maxMp; const k = p.kit(), base = ERX.Abilities.stats(k, 's1', true).cd; p.ab.cast('s1'); const cd = p.ab.cd.s1; g.effects.length = 0; return Math.abs(cd - base * 0.85) < 1e-6; })()`));
    const dmg = await ev(`(() => { const g = ${G}, p = g.player; g.effects.length = 0; p.placeAt(12.5 * 16, g.level.floorY); p.facing = 1; p.ab = new ERX.AbilityState(p); g.character.elementSkills = { m1: 1 }; const e0 = g.enemies[0]; e0.log = []; e0.status = {}; p.ab.cast('m1'); return true; })()`);
    void dmg;
    await sleep(500);
    const baseD = await ev(`${G}.enemies[0].log.reduce((s, l) => s + l.d, 0)`);
    await ev(`(() => { const g = ${G}, p = g.player; g.effects.length = 0; p.placeAt(12.5 * 16, g.level.floorY); p.facing = 1; g.character.elementSkills = { m1: 2 }; p.ab.cd.m1 = 0; const e0 = g.enemies[0]; e0.log = []; e0.status = {}; p.ab.cast('m1'); return true; })()`);
    await sleep(500);
    const upD = await ev(`${G}.enemies[0].log.reduce((s, l) => s + l.d, 0)`);
    check('upgraded moves hit harder', upD > baseD, [baseD, upD]);
    check('...and an upgraded M1 is the new move (wind: Wind Lasso)', await ev(`(() => { const g = ${G}, p = g.player; g.effects.length = 0; p.ab.cd.m1 = 0; g.character.elementSkills = { m1: 2 }; p.ab.cast('m1'); return g.effects.some((fx) => fx.k && fx.k.update === ERX.Kits.wind.m1Up.update); })()`));

    console.log('[status effects]');
    check('burn hurts over time', await ev(`(() => { const d = ${G}.enemies[5]; d.hp = d.maxHp; d.applyStatus('burn', 0); return true; })()`) && await waitFor(`${G}.enemies[5].hp < ${G}.enemies[5].maxHp`, 2000));
    check('3 chills -> FROZEN (can\'t move)', await ev(`(() => { const d = ${G}.enemies[6]; d.status = {}; d.applyStatus('chill'); d.applyStatus('chill'); d.applyStatus('chill'); return !!d.status.freeze && d.stunned(); })()`));
    check('blind monsters can\'t find you (or hurt you on touch)', await ev(`(() => { const d = ${G}.enemies[0]; d.status = {}; d.applyStatus('blind'); const t = d.target(); return t !== ${G}.player && d.isBlind(); })()`));
    check('confused monsters go the wrong way', await ev(`(() => { const d = ${G}.enemies[0]; d.status = {}; d.applyStatus('confuse'); const t = d.target(); return Math.sign(t.cx - d.cx) !== Math.sign(${G}.player.cx - d.cx); })()`));
    check('poison stacks', await ev(`(() => { const d = ${G}.enemies[0]; d.status = {}; d.applyStatus('poison'); d.applyStatus('poison'); return d.status.poison.stacks === 2; })()`));
    check('status potency makes it last longer', await ev(`(() => { const d = ${G}.enemies[0]; d.status = {}; d.applyStatus('burn', 0); const a = d.status.burn.t; d.status = {}; d.applyStatus('burn', 3); return d.status.burn.t > a; })()`));

    console.log('[block + dash]');
    await ev(`(() => { const g = ${G}, p = g.player; p.guard = p.guardMax; p.guardBrokenT = 0; p.hurtT = 0; p.invulnT = 0; p.dashT = 0; p.dashGrace = 0; return true; })()`);
    await b.down('KeyK');
    await sleep(100);
    const guardRun = await ev(`(() => { const p = ${G}.player; const out = []; for (let i = 0; i < 6; i++) { out.push(p.takeHit(6, p.cx + p.facing * 20)); } return { out, broken: p.guardBrokenT > 0, guard: p.guard, blocking: p.blocking }; })()`);
    check('blocking wears down your guard...', guardRun.out.slice(0, 4).every((r) => r === 'blocked'), guardRun);
    check('...and it BREAKS after 5 hits', guardRun.broken && guardRun.guard <= 0, guardRun);
    await sleep(100);
    check('...leaving you unable to block for a bit', await ev(`!${G}.player.blocking`));
    await shot('04-guard-break');
    await b.up('KeyK');
    check('the guard comes back', await waitFor(`${G}.player.guard >= ${G}.player.guardMax * 0.9 && ${G}.player.guardBrokenT === 0`, 7000));
    check('your block takes your element\'s look', await ev(`(() => { const g = ${G}, p = g.player; p.blocking = true; const cv = document.createElement('canvas').getContext('2d'); return ERX.Abilities.renderBlock(cv, p, g.camera, 0) === true; })()`));
    await ev(`(() => { const g = ${G}, p = g.player; g.character.elementSkills.dash = 2; p.placeAt(11 * 16, g.level.floorY); p.facing = 1; p.dashCd = 0; const d = g.enemies[0]; d.log = []; return true; })()`);
    await b.key('KeyL');
    await sleep(120);
    check('an upgraded dash is your element\'s own new dash (wind: Jet Stream)', await ev(`${G}.effects.some((fx) => fx.k && fx.k.update === ERX.Kits.wind.dashUp.update)`));
    await sleep(280);
    check('an upgraded dash hits what you dash through', await ev(`${G}.enemies[0].log.length > 0`));

    console.log('[training dummies]');
    const dum = (i) => `${G}.enemies[${i}]`;
    check('the 1 HP dummy goes down in one hit... and gets back up', await ev(`(() => { const d = ${dum(4)}; d.down = false; d.hp = 1; d.hurt(5, 1, false, 0); return d.down === true && !d.dead; })()`) && await waitFor(`!${dum(4)}.down`, 3000));
    check('the blocker blocks hits from the front', await ev(`(() => { const d = ${dum(2)}; d.status = {}; d.guard = 5; d.facing = -1; const hp = d.hp; d.hurt(10, 1, false, 0); return d.hp === hp && d.guard === 4; })()`));
    check('...until its guard breaks', await ev(`(() => { const d = ${dum(2)}; for (let i = 0; i < 4; i++) d.hurt(10, 1, false, 0); const hp = d.hp; d.hurt(10, 1, false, 0); return d.guard === 0 && d.hp < hp; })()`));
    check('the counter dummy hits back', await ev(`(() => { const g = ${G}, p = g.player, d = ${dum(3)}; p.placeAt(d.cx - 16, g.level.floorY); p.invulnT = 0; p.blocking = false; p.dashT = 0; p.dashGrace = 0; window.__hp = p.hp; d.facing = -1; d.counterT = 0; d.strikeT = 0; d.hurt(5, 1, false, 0); return d.counterT > 0; })()`) && await waitFor(`${G}.player.hp < window.__hp`, 1500));
    check('the tank has 2000 HP and heals when left alone', await ev(`(() => { const d = ${dum(5)}; d.hp = 1500; d.lastHit = d.t - 10; return d.maxHp === 2000; })()`) && await waitFor(`${dum(5)}.hp === 2000`, 1500));
    check('the runner runs', await ev(`(() => { window.__rx = ${dum(6)}.x; return true; })()`) && await waitFor(`Math.abs(${dum(6)}.x - window.__rx) > 10`, 2000));
    check('every dummy shows its DPS', await ev(`typeof ${dum(0)}.dps === 'number'`));
    check('dummies give no XP or gold (nice try)', await ev(`${G}.enemies.every(e => !e.xp && !e.gold)`));

    console.log('[skill tree]');
    await ev(`(() => { const c = ${G}.character; c.elementSkills = {}; c.skillPoints = 30; return true; })()`);
    await b.key('KeyT');
    check('the skill tree opens on your element\'s moves', await waitFor("ERX.Scenes.top().id === 'skills' && ERX.Scenes.top().appearT >= 1", 2000));
    check('...and names the upgrades after the new moves (WIND LASSO, JET STREAM)', await ev("(() => { const t = ERX.Scenes.top(), N = ERX.SkillTree.NODES; return t._name(N.find((n) => n.id === 'm1+')) === 'WIND LASSO' && t._name(N.find((n) => n.id === 'dash+')) === 'JET STREAM'; })()"));
    await shot('05-skill-tree');
    const tree = (id) => ev(`(() => { ERX.Scenes.top()._buy('${id}'); return JSON.stringify(${G}.character.elementSkills) + '|' + ${G}.character.skillPoints; })()`);
    let r = await tree('ult');
    check('the Ultimate needs 3 skills first', !/ult/.test(r.split('|')[0]), r);
    await tree('s1'); await tree('s2'); r = await tree('ult');
    check('...two is not enough', !/ult/.test(r.split('|')[0]), r);
    r = await tree('s3');
    check('learning skills costs points', /"s1":1/.test(r) && /"s3":1/.test(r) && r.endsWith('|26'), r);
    r = await tree('ult');
    check('...then the Ultimate unlocks', /"ult":1/.test(r), r);
    r = await tree('s1+');
    check('every move can be upgraded', /"s1":2/.test(r), r);
    await tree('potency'); await tree('potency'); r = await tree('potency');
    check('status potency has 3 ranks', /"potency":3/.test(r), r);
    r = await tree('block+'); r = await tree('dash+');
    check('your block and dash can be upgraded', /"block":2/.test(r) && /"dash":2/.test(r), r);
    check('stats (vitality / focus / agility) are still there', await ev("ERX.Scenes.top().items.some(i => i.id === 'stat:focus') && ERX.Scenes.top().items.some(i => i.id === 'stat:agility')"));
    await b.key('Escape');
    await waitFor("ERX.Scenes.top().id === 'game'", 2000);
    check('levelling up gives a skill point', await ev(`(() => { const g = ${G}; const before = g.character.skillPoints; g.onEnemyKilled({ xp: 9999, gold: 0, cx: 0, y: 0 }); return g.character.skillPoints > before; })()`));

    console.log('[admin in a game]');
    await b.key('Escape');
    check('the pause menu has an ADMIN button (when unlocked)', await waitFor("ERX.Scenes.top().id === 'pause' && ERX.Scenes.top().buttons.some(b => b.label === 'ADMIN')", 2000));
    await ev("ERX.Scenes.top().buttons.find(b => b.label === 'ADMIN').activate()");
    check('...which opens the admin panel', await waitFor("ERX.Scenes.top().id === 'admin' && ERX.Scenes.top().items.length > 0", 2000));
    await ev("(() => { const s = ERX.Scenes.top(); s._activate(s.items.find(i => i.id === 'fire')); return true; })()");
    check('pick any element to test (fire)', await ev(`${G}.element().id === 'fire'`));
    check('...your real element is untouched', await ev(`${G}.character.element === 'wind' && ERX.Saves.characters.find(c => c.name === 'Tester').element === 'wind'`));
    check('the admin pick switches your whole kit (fire block, fire M1)', await ev(`${G}.player.kit() === ERX.Kits.fire`));
    await ev("(() => { const s = ERX.Scenes.top(); s._activate(s.items.find(i => i.id === 'skills')); s._activate(s.items.find(i => i.id === 'skills')); return true; })()");
    check('skills: ALL UPGRADED', await ev("ERX.Admin.data.skills === 'max' && ERX.Abilities.rank(ERX.Scenes.find('game'), 's3') === 2"));
    await ev("(() => { const s = ERX.Scenes.top(); s._activate(s.items.find(i => i.id === null)); return true; })()");
    check('"MY ELEMENT" goes back to your own', await ev(`${G}.element().id === 'wind'`));

    console.log('[every element, every move]');
    const sweep = await ev(`(async () => {
      const g = ${G}, p = g.player, bad = [];
      for (let i = 0; i < 6 && ERX.Scenes.top().id !== 'game'; i++) { const s = ERX.Scenes.stack; const x = s.pop(); if (x) x.exit(); }
      for (const el of ERX.Elements.list) {
        for (const mode of ['base', 'max']) {
          ERX.Admin.set('element', el.id); ERX.Admin.set('skills', mode); ERX.Admin.set('infiniteMp', true);
          p.ab = new ERX.AbilityState(p);
          for (const slot of ['m1', 's1', 's2', 's3', 's4', 's5', 'ult']) {
            p.ab.ult = 100;
            p.placeAt(12.5 * 16, g.level.floorY); p.facing = 1;
            if (!p.ab.cast(slot)) bad.push(el.id + ' ' + mode + ' ' + slot);
            for (let i = 0; i < (slot === 'ult' ? 330 : 40); i++) g.update(1 / 60, ERX.Input, true);
            if (g.cine) bad.push(el.id + ' ' + mode + ': cutscene never ended');
          }
          g.effects.length = 0;
        }
      }
      ERX.Admin.set('element', null); ERX.Admin.set('skills', 'normal');
      return bad;
    })()`);
    check('all ' + 31 * 7 * 2 + ' moves (base + upgraded) cast cleanly', sweep.length === 0, sweep);

    console.log('[ability wheel]');
    check('every element has a symbol, and every skill has its own icon', await ev("ERX.Elements.list.every(el => !!ERX.Symbols.ELEMENT[el.id] && ['s1','s2','s3','s4','s5'].every(s => !!ERX.Symbols.GLYPH[ERX.Symbols.iconOf(el.id, s)]) && new Set(ERX.Symbols.ICONS[el.id]).size === 5)"));
    check('the wheel draws (element in the middle, 5 skills around it)', await ev(`(() => { const g = ${G}, cv = document.createElement('canvas'); cv.width = 480; cv.height = 270; const c = cv.getContext('2d'); g.player.ab.ult = 100; ERX.HUD.render(c, 480, 270, g); const L = ERX.HUD.wheelLayout(270); const lit = (x, y) => c.getImageData(x, y, 1, 1).data[3] > 0; return lit(L.cx, L.cy) && L.slots.length === 5 && L.slots.every(s => lit(s.x, s.y)); })()`));

    check('skills 4 and 5 keep their ranks when the game reloads', await ev(`(() => { const c = ${G}.character, keep = JSON.stringify(c.elementSkills); c.elementSkills = Object.assign({}, c.elementSkills, { s4: 1, s5: 2 }); ERX.Saves.update(c); ERX.Saves.load(); const d = ERX.Saves.characters.find((x) => x.id === c.id); const ok = !!d && d.elementSkills.s4 === 1 && d.elementSkills.s5 === 2; c.elementSkills = JSON.parse(keep); ERX.Saves.update(c); return ok; })()`));

    console.log('[blocks]');
    check('every element has its own block look + hit burst + sound', await ev("ERX.Elements.list.every(el => { const gd = ERX.Guards[el.id]; return gd && typeof gd.draw === 'function' && typeof gd.hit === 'function' && !!gd.sound; }) && new Set(ERX.Elements.list.map(el => String(ERX.Guards[el.id].draw))).size === ERX.Elements.list.length"));
    check('blocking has sounds (raising your guard + a blocked hit)', await ev("!!ERX.SfxBank.guardUp && !!ERX.SfxBank.blockHit"));
    check('a blocked hit sprays your element burst', await ev(`(() => { const g = ${G}, p = g.player; const n = g.fx.count + g.effects.length; p._blockBurst(); return g.fx.count + g.effects.length > n; })()`));

    console.log('[ultimates you can see]');
    const drawn = await ev(`(() => { const g = ${G}, p = g.player, out = [];
      for (const id of ['darkness', 'storm', 'void', 'time', 'sound', 'mist', 'moon', 'solar']) {
        g.effects.length = 0; ERX.Admin.set('element', id); p.ab = new ERX.AbilityState(p);
        const kit = ERX.Kits[id], el = ERX.Elements.get(id);
        kit.ult.run(ERX.Abilities.api(g), { x: p.cx, y: p.y + 10, dir: 1, t: 0, hit: new Set(), hitT: new Map(), pal: ERX.Abilities.palette(el, kit, false), dmg: 1, status: kit.status, potency: 0, isUlt: true }, el);
        let calls = 0; for (const fx of g.effects) { const r = fx.render.bind(fx); fx.render = (c, cam) => { calls++; r(c, cam); }; }
        for (let i = 0; i < 20; i++) g.update(1 / 60, ERX.Input, true);
        g.render(ERX.Display.canvas.getContext('2d'));
        if (!calls) out.push(id);
      }
      g.effects.length = 0; ERX.Admin.set('element', null); return out; })()`);
    check('full-screen Ultimates actually draw (Endless Night, Solar Flare...)', drawn.length === 0, drawn);
    check('the silence before the title slam is 0.2 s', await ev('Math.abs(ERX.Ultimate.T.slam - ERX.Ultimate.T.black - 0.2) < 1e-9'));

    console.log('[chaos]');
    check('Chaos makes monsters tougher', await ev(`(() => { const g = ${G}; ERX.Admin.set('element', 'chaos'); const a = ERX.Enemies.create(g, { type: 'slime', x: 0, y: 0 }); ERX.Admin.set('element', 'fire'); const b2 = ERX.Enemies.create(g, { type: 'slime', x: 0, y: 0 }); ERX.Admin.set('element', null); return a.maxHp > b2.maxHp && a.damage > b2.damage; })()`));
    check('...but never the training dummies', await ev(`(() => { const g = ${G}; ERX.Admin.set('element', 'chaos'); const d = ERX.Enemies.create(g, { type: 'dummy', variant: 'normal', x: 0, y: 0 }); ERX.Admin.set('element', null); ERX.Admin.set('element', 'fire'); const d2 = ERX.Enemies.create(g, { type: 'dummy', variant: 'normal', x: 0, y: 0 }); ERX.Admin.set('element', null); return d.maxHp === d2.maxHp; })()`));
    check('the world bends around Chaos (shards, glitches, stranger worlds)', await ev("typeof ERX.ChaosWorld.render === 'function' && ERX.Elements.get('chaos').world.intensity > 1"));
    check('the Voice falls over when he scans Chaos (and calls you a threat)', await ev("/chaosReaction/.test(String(ERX.Story.void.meetFigure)) && /'fallen'/.test(String(ERX.Story.void.chaosReaction)) && /STRONGEST ELEMENT IN HISTORY/.test(String(ERX.Story.void.chaosReaction)) && /THREAT/.test(String(ERX.Story.void.chaosReaction)) && /careful/.test(String(ERX.Story.void.chaosReaction))") && await ev("!!ERX.FigureSprite.frame('shock', 'fallen', 0, 1)"));
    check('HQ staff talk to you differently with Chaos', await ev("['dot', 'kev', 'steve', 'atlas', 'ron', 'guide'].every(id => Array.isArray(ERX.Story.deep.MINERS[id].chaosLines))"));

    console.log('[chaos: its own beam]');
    const beam = await ev(`(() => {
      const g = ${G}, p = g.player, out = {};
      const reset = () => { g.effects.length = 0; g.enemies.forEach((e, i) => { e.kind = 'normal'; e.x = 236 + i * 22 - e.w / 2; e.y = g.level.floorY - e.h; e.vx = 0; e.vy = 0; e.status = {}; e.hp = e.maxHp = 100000; e.down = false; }); p.placeAt(200, g.level.floorY); p.facing = 1; p.ab = new ERX.AbilityState(p); };
      const fx = (n) => { for (let i = 0; i < n; i++) g.update(1 / 60, ERX.Input, true); };
      const counts = () => g.enemies.map((e) => Object.keys(e.status).length);
      ERX.Admin.set('element', 'chaos');
      ERX.Admin.set('skills', 'base'); reset(); p.ab.cast('m1'); out.m1 = ERX.Abilities.move(p.kit(), 'm1').name; fx(30); out.one = counts();
      ERX.Admin.set('skills', 'max'); reset(); p.ab.cast('m1'); out.up = ERX.Abilities.move(p.kit(), 'm1', true).name; fx(30); out.two = counts();
      ERX.Admin.set('skills', 'base'); reset(); ERX.Awakening.begin(g); p.ab.cast('m1'); out.awk = p.kit().m1.name; fx(30); out.three = counts(); ERX.Awakening.end(g);
      ERX.Admin.set('element', null); ERX.Admin.set('skills', 'normal'); g.effects.length = 0;
      return out;
    })()`);
    check('Chaos\'s M1 is its own move now: a white beam with a rainbow edge, one random effect on everything it hits', beam.m1 === 'Chaos Ray' && beam.one.filter((n) => n > 0).length >= 2 && beam.one.every((n) => n <= 1), beam);
    check('...upgraded: a bigger, faster, longer beam, and TWO random effects', beam.up === 'Chaos Ray XL' && beam.two.filter((n) => n === 2).length >= 3 && beam.two.every((n) => n <= 2), beam);
    check('...awakened: the beam erupts from the ground under the enemy, with THREE random effects', beam.awk === 'Chaos Pillar' && beam.three[0] === 3 && beam.three.slice(1).every((n) => n === 0), beam);

    console.log('[awakening]');
    const AWK_ULTS = {
      fire: 'Starfall Inferno', water: "Leviathan's Wrath", wind: 'Celestial Cyclone', earth: 'Continental Ruin', lightning: "Heaven's Thunder", ice: 'Absolute Zero',
      nature: "Eden's Wrath", shadow: 'Eternal Eclipse', light: "Heaven's Erasure", arcane: 'Forbidden Genesis', poison: 'Plague of Eternity', blood: 'Crimson Behemoth',
      death: 'Requiem of the Dead', metal: 'Iron Dominion', sand: 'Eternal Desert', magma: 'Core Eruption', storm: 'Apocalypse Tempest', cosmic: 'Celestial Cataclysm',
      void: 'Absolute Nothing', psychic: 'Godmind', crystal: 'Prismatic World', moon: 'Lunar Apocalypse', solar: 'Solar Apocalypse', magnetism: 'Magnetic Singularity',
      time: 'Zero Hour', gravity: 'Planetfall', sound: 'World Resonance', mist: 'Phantom Realm', spirit: 'Eternal Legion', chaos: 'Reality Collapse',
    };
    const awk = await ev(`(() => {
      const bad = [], src = (fns) => fns.filter(Boolean).map(String).join('|'), seen = new Map(), want = ${JSON.stringify(AWK_ULTS)};
      // every normal move's code first: an awakened move can't just be one of those again
      for (const el of ERX.Elements.list) { const k = ERX.Kits[el.id]; for (const m of [k.m1, ...k.s]) seen.set(src([m.spawn, m.update, m.draw]), el.id + ' ' + m.name); }
      for (const el of ERX.Elements.list) {
        const a = ERX.Awakened[el.id], k = ERX.Kits[el.id];
        if (!a) { bad.push(el.id + ': no awakened kit'); continue; }
        if (!a.color || a.color === el.color) bad.push(el.id + ': needs its own awakened colour');
        if (!a.m1 || !Array.isArray(a.s) || a.s.length !== 5) { bad.push(el.id + ': needs an M1 + 5 skills'); continue; }
        const normal = new Set([k.m1, ...k.s].map((m) => m.name));
        for (const m of [a.m1, ...a.s]) {
          if (!m.name || !m.desc || !m.spawn) bad.push(el.id + ': ' + (m.name || '?') + ' incomplete');
          if (normal.has(m.name)) bad.push(el.id + ': ' + m.name + ' is a normal move');
          const code = src([m.spawn, m.update, m.draw]);
          if (seen.has(code)) bad.push(el.id + ' ' + m.name + ' is a copy of ' + seen.get(code)); else seen.set(code, 'awakened ' + el.id + ' ' + m.name);
        }
        const u = a.ult;
        if (!u || !u.run || !u.charge || !u.charge.draw || !u.desc) bad.push(el.id + ': awakened ultimate incomplete');
        else if (want[el.id] && u.name !== want[el.id]) bad.push(el.id + ': ultimate should be ' + want[el.id] + ' (is ' + u.name + ')');
        if (u && (String(u.run) === String(k.ult.run) || String(u.charge.draw) === String(k.ult.charge.draw))) bad.push(el.id + ': same ultimate as before awakening');
        if (!a.dash || !a.dash.name || !a.dash.update || !a.dash.draw || !(a.dash.dmg > 0)) bad.push(el.id + ': dash');
        if (!a.guard || typeof a.guard.draw !== 'function' || typeof a.guard.hit !== 'function' || !a.guard.sound) bad.push(el.id + ': block');
        if (!a.idle || typeof a.idle.pose !== 'function' || !a.run || typeof a.run.pose !== 'function') bad.push(el.id + ': idle / run');
      }
      const uniq = (f, what) => { const all = ERX.Elements.list.map((el) => String(f(ERX.Awakened[el.id]))); if (new Set(all).size !== all.length) bad.push('two awakened ' + what + ' share code'); };
      uniq((a) => a.ult.run, 'ultimates'); uniq((a) => a.ult.charge.draw, 'charge-ups'); uniq((a) => a.dash.update, 'dashes'); uniq((a) => a.guard.draw, 'blocks'); uniq((a) => a.idle.pose, 'idles'); uniq((a) => a.run.pose, 'runs');
      return bad;
    })()`);
    check('every element has its own AWAKENED kit: new M1 + 5 skills, dash, block, idle, run and Ultimate (your list)', awk.length === 0, awk);
    check('every awakened skill has its own icon (never a normal one, never shared)', await ev(`(() => { const G = ERX.Symbols.GLYPH, all = ERX.Elements.list.flatMap((el) => ERX.Awakened[el.id].icons || []), normal = new Set(Object.values(ERX.Symbols.ICONS).flat()); return all.length === 31 * 5 && new Set(all).size === all.length && new Set(all.map((n) => G[n] && G[n].join('/'))).size === all.length && all.every((n) => G[n] && !normal.has(n) && G[n].length === 9 && G[n].every((r) => r.length === 9)); })()`));
    check('every awakened Ultimate has its title art (Darkness draws its own)', await ev("ERX.Elements.list.every(el => el.id === 'darkness' || !!ERX.Assets.image('awk_' + el.id))"));
    check('AWAKEN has its own key (G)', await ev("!!ERX.Keybinds.ACTIONS.find((a) => a.id === 'awaken' && a.defaults.includes('KeyG'))"));

    const flow = await ev(`(async () => {
      const g = ${G}, p = g.player, out = {}, A = ERX.Abilities.api(g);
      for (let i = 0; i < 6 && ERX.Scenes.top().id !== 'game'; i++) { const s = ERX.Scenes.stack; const x = s.pop(); if (x) x.exit(); }
      ERX.Admin.set('element', 'ice'); ERX.Admin.set('skills', 'normal'); ERX.Admin.set('instantAwk', false);
      g.character.awakenUnlocked = true;   // (a character who has earned it)
      p.ab = new ERX.AbilityState(p); p.placeAt(12.5 * 16, g.level.floorY); p.facing = 1;
      out.denied = !p.ab.awaken();
      const t = ERX.Enemies.create(g, { type: 'dummy', variant: 'tank', x: p.cx + 30, y: g.level.floorY }); g.enemies.push(t);
      const before = p.ab.awk; A.damage({ dmg: 50, x: p.cx, pal: ERX.Abilities.palette(ERX.Elements.get('ice'), ERX.Kits.ice, false), status: null, potency: 0, isUlt: false }, t, 1, 0);
      out.fills = p.ab.awk > before;
      g.enemies.splice(g.enemies.indexOf(t), 1);
      p.ab.awk = 100;
      return out;
    })()`);
    check('the Awakening meter fills as you deal damage (and you cannot awaken early)', flow.denied && flow.fills, flow);
    await b.key('KeyG');
    check('pressing G awakens you (a short cutscene, then AWAKENED)', await waitFor(`${G}.player.ab.awakened()`, 6000));
    check('...for 60 seconds, with a full Ultimate and the awakened kit', await ev(`(() => { const p = ${G}.player; return p.ab.awakenT > 50 && p.ab.awakenT <= 60 && p.ab.ult === 100 && p.kit() === ERX.Awakened.ice && p.ab.awk === 0; })()`));
    await waitFor(`!${G}.cine`, 4000);
    const ultCine = await ev(`(() => { const g = ${G}, p = g.player; p.ab.ult = 100; const cast = p.ab.cast('ult'), c = g.cine, P = c && Object.getPrototypeOf(c), src = P ? Object.getOwnPropertyNames(P).map((n) => String(P[n])).join('|') : ''; return { cast, cine: !!c, awk: !!(c && c.awk), kit: !!(c && c.kit === ERX.Awakened.ice), riff: /awakenRiff/.test(src), glow: /sideGlow/.test(src), art: /'awk_'/.test(src) }; })()`);
    check('the awakened Ultimate gets the awakened cutscene (art, side glow, riff)', Object.values(ultCine).every(Boolean), ultCine);
    await waitFor(`!${G}.cine`, 6000);
    // (an Ultimate's impact frame can freeze the game for a few frames, so step until it is over)
    check('...and wears off: back to your normal kit', await ev(`(() => { const g = ${G}, p = g.player; p.ab.awakenT = 0.02; for (let i = 0; i < 30 && p.ab.awakened(); i++) g.update(1 / 60, ERX.Input, true); return !p.ab.awakened() && p.kit() === ERX.Kits.ice; })()`));
    const locked = await ev(`(() => {
      const g = ${G}, p = g.player, A = ERX.Abilities.api(g), out = {};
      delete g.character.awakenUnlocked; ERX.Admin.set('instantAwk', false);
      p.ab = new ERX.AbilityState(p); g.floats.length = 0;
      const t = ERX.Enemies.create(g, { type: 'dummy', variant: 'tank', x: p.cx + 30, y: g.level.floorY }); g.enemies.push(t);
      A.damage({ dmg: 400, x: p.cx, pal: ERX.Abilities.palette(ERX.Elements.get('ice'), ERX.Kits.ice, false), status: null, potency: 0, isUlt: false }, t, 1, 0);
      g.enemies.splice(g.enemies.indexOf(t), 1);
      out.noFill = p.ab.awk === 0; out.noAwaken = !p.ab.awaken() && !g.cine; out.noFloat = !g.floats.some((f) => /AWAKENING/.test(f.text));
      ERX.Admin.set('instantAwk', true); p.ab.update(1 / 60); out.admin = p.ab.awk === 100;
      ERX.Admin.set('instantAwk', false); p.ab = new ERX.AbilityState(p);
      return out;
    })()`);
    check('Awakening is locked until you earn it: the meter never fills and G does nothing (only the admin panel can awaken you)', Object.values(locked).every(Boolean), locked);

    const awkSweep = await ev(`(async () => {
      const g = ${G}, p = g.player, bad = [];
      for (let i = 0; i < 6 && ERX.Scenes.top().id !== 'game'; i++) { const s = ERX.Scenes.stack; const x = s.pop(); if (x) x.exit(); }
      for (const el of ERX.Elements.list) {
        for (const mode of ['base', 'max']) {
          ERX.Admin.set('element', el.id); ERX.Admin.set('skills', mode); ERX.Admin.set('infiniteMp', true);
          p.ab = new ERX.AbilityState(p); ERX.Awakening.begin(g);
          for (const slot of ['m1', 's1', 's2', 's3', 's4', 's5', 'ult']) {
            p.ab.ult = 100; p.ab.awakenT = 60; p.ultHold = null;
            p.placeAt(12.5 * 16, g.level.floorY); p.facing = 1;
            if (!p.ab.cast(slot)) bad.push(el.id + ' ' + mode + ' ' + slot);
            for (let i = 0; i < (slot === 'ult' ? 330 : 40); i++) g.update(1 / 60, ERX.Input, true);
            if (g.cine) bad.push(el.id + ' ' + mode + ': cutscene never ended');
          }
          // the dash and the block
          p.ultHold = null; p.ab.awakenT = 60; p.dashT = 0.16; p.dashStyle = 'awk-x'; p._awakenedDash(ERX.Awakened[el.id]);
          for (let i = 0; i < 50; i++) g.update(1 / 60, ERX.Input, true);
          p._blockBurst(); p.blocking = true; g.render(ERX.Display.canvas.getContext('2d')); p.blocking = false;
          g.effects.length = 0;
        }
      }
      ERX.Admin.set('element', null); ERX.Admin.set('skills', 'normal');
      return bad;
    })()`);
    check('all ' + 31 * 7 * 2 + ' awakened moves, plus every awakened dash and block, run cleanly', awkSweep.length === 0, awkSweep);

    const smooth = await ev(`(() => {
      const g = ${G}, p = g.player, bad = [], key = (j) => JSON.stringify(ERX.PlayerSide.points(j)) + '|' + Math.round(j.lift || 0);
      for (const el of ERX.Elements.list) {
        ERX.Admin.set('element', el.id); p.ab = new ERX.AbilityState(p); ERX.Awakening.begin(g); p.ab.awakenT = 60;
        p.ultHold = null; p.dashT = 0; p.attackT = 0; p.hurtT = 0; p.blocking = false; p.onGround = true; p.vx = 0; p.awkJ = null;
        const idle = new Set(); for (let i = 0; i < 150; i++) { p.animT += 1 / 60; ERX.Awakening.animate(p, 1 / 60); if (p.awkJ) idle.add(key(p.awkJ)); }
        // switching to a run never snaps: every joint moves a little each frame
        let jump = 0, prev = ERX.PlayerSide.points(p.awkJ); p.vx = 92; const run = new Set();
        for (let i = 0; i < 120; i++) { p.animT += 1 / 60; p.runPhase += 92 / 60 / 5.5; ERX.Awakening.animate(p, 1 / 60); const pts = ERX.PlayerSide.points(p.awkJ); for (const n in pts) jump = Math.max(jump, Math.hypot(pts[n].dx - prev[n].dx, pts[n].dy - prev[n].dy)); prev = pts; run.add(key(p.awkJ)); }
        p.vx = 0;
        if (idle.size < 3 || run.size < 5 || jump > 5) bad.push(el.id + ' idle ' + idle.size + ' run ' + run.size + ' jump ' + jump.toFixed(1));
      }
      ERX.Admin.set('element', null); p.ab = new ERX.AbilityState(p);
      return bad;
    })()`);
    check('every awakened idle and run animates smoothly (many frames, no snapping)', smooth.length === 0, smooth);
    check('awakened: the wheel shows the awakened icons and the AWAKENED timer', await ev(`(() => { const g = ${G}, p = g.player; ERX.Admin.set('element', 'sound'); p.ab = new ERX.AbilityState(p); ERX.Awakening.begin(g); const cv = document.createElement('canvas'); cv.width = 480; cv.height = 270; const c = cv.getContext('2d'); ERX.HUD.render(c, 480, 270, g); const L = ERX.HUD.wheelLayout(270), lit = (x, y) => c.getImageData(x, y, 1, 1).data[3] > 0; const ok = ERX.Symbols.iconOf('sound', 's1', true) === 'subwoofer' && L.slots.every((s) => lit(s.x, s.y)); ERX.Admin.set('element', null); p.ab = new ERX.AbilityState(p); return ok; })()`));

    console.log('[awakened: bigger, louder, stranger]');
    const music = await ev(`(async () => {
      const a = ERX.Awakened.sound, src = (f) => String(f || '');
      const wired = /sndNote/.test(src(a.m1.spawn)) && /sndChord/.test(src(a.m1.spawn)) && /sndBass/.test(src(a.s[0].update)) && /sndDrum/.test(src(a.s[1].update)) && /sndFeedback/.test(src(a.s[2].spawn)) && /sndRise/.test(src(a.s[3].update)) && /sndMicDrop/.test(src(a.s[4].update)) && /sndPing/.test(src(a.dash.update)) && /sndStab/.test(src(a.guard.hit)) && /sndUlt/.test(src(a.ult.run));
      let loud = 0;
      for (const [name, o] of [['sndNote', { i: 2 }], ['sndChord', { n: 1 }], ['sndDrum', { i: 1 }], ['sndUlt', { part: 'beat', i: 0 }]]) {
        const oac = new OfflineAudioContext(1, 44100, 44100), noise = oac.createBuffer(1, 44100, 44100), nd = noise.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        ERX.SfxBank[name]({ ctx: oac, waves: {}, noise, tone: ERX.Audio.tone, noiseBurst: ERX.Audio.noiseBurst }, oac.destination, 0.01, o);
        const d = (await oac.startRendering()).getChannelData(0); let peak = 0; for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
        if (peak > 0.02) loud++;
      }
      return { wired, loud };
    })()`);
    check("awakened Sound's moves play actual music (riff notes, chords, bass, drums, a whole song for the Ultimate)", music.wired && music.loud === 4, music);

    const chaos = await ev(`(() => {
      const g = ${G}, p = g.player, a = ERX.Awakened.chaos, out = {};
      ERX.Admin.set('element', 'chaos'); p.ab = new ERX.AbilityState(p); ERX.Awakening.begin(g); p.placeAt(12.5 * 16, g.level.floorY); p.facing = 1;
      p.vx = 0; p.onGround = true; p.awkJ = null; for (let i = 0; i < 30; i++) { p.animT += 1 / 60; ERX.Awakening.animate(p, 1 / 60); }
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const c = cv.getContext('2d');
      p.render(c, { ix: Math.round(p.cx) - 32, iy: Math.round(p.feet) - 50 });
      const d = c.getImageData(0, 0, 64, 64).data; let white = 0, rainbow = 0;
      for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; const r = d[i], gg = d[i + 1], bb = d[i + 2], mx = Math.max(r, gg, bb), mn = Math.min(r, gg, bb); if (r > 245 && gg > 245 && bb > 245) white++; else if (mx > 150 && mx - mn > 90) rainbow++; }
      out.body = white > 40 && rainbow > 20;
      out.ownIdle = !/worn|Awakened\\[/.test(String(a.idle.pose)) && !/worn|Awakened\\[/.test(String(a.run.pose));
      out.floats = a.run.pose(0).lift >= 5;
      out.hand = typeof a.guard.pose === 'function' && a.guard.pose().FA[1][0] > 14;
      // its dash makes enemies glitch out
      const t = ERX.Enemies.create(g, { type: 'dummy', variant: 'tank', x: p.cx + 26, y: g.level.floorY }); g.enemies.push(t);
      p.dashT = 0.16; p.dashStyle = 'awk-blink'; p._awakenedDash(a); for (let i = 0; i < 20; i++) g.update(1 / 60, ERX.Input, true);
      out.glitch = t._glitchUntil > g.t;
      g.enemies.splice(g.enemies.indexOf(t), 1); g.effects.length = 0; p.dashT = 0;
      ERX.Admin.set('element', null); p.ab = new ERX.AbilityState(p);
      return out;
    })()`);
    check('awakened Chaos: a white entity with a rainbow outline, its own menacing idle, it floats instead of running, blocks with one hand out', chaos.body && chaos.ownIdle && chaos.floats && chaos.hand, chaos);
    check('...and its dash makes enemies glitch out', chaos.glitch, chaos);
    const rc = await ev(`(() => {
      const g = ${G}, p = g.player, out = {}, god = ERX.Admin.data.god;
      ERX.Admin.set('element', 'chaos'); ERX.Admin.set('god', false);
      g.effects.length = 0; g.cine = null; p.ultHold = null; g.ultCam = null;
      g.enemies.forEach((e, i) => { e.kind = 'normal'; e.x = 236 + i * 22 - e.w / 2; e.y = g.level.floorY - e.h; e.vx = 0; e.vy = 0; e.status = {}; e.hp = e.maxHp = 100000; e.down = false; });
      p.placeAt(200, g.level.floorY); p.facing = 1; p.ab = new ERX.AbilityState(p); ERX.Awakening.begin(g);
      const u = ERX.Awakened.chaos.ult, j = u.charge.pose(0.5, 1);
      out.xArms = j.FA[1][0] < j.FA[0][0] && j.BA[1][0] > j.BA[0][0] && Math.abs(j.FA[1][1] - j.BA[1][1]) < 2 && j.FA[1][1] < j.FA[0][1];   // forearms crossing in front of the chest
      const feet0 = p.feet, step = (secs) => { for (let t = 0; t < secs; t += 1 / 60) g.update(1 / 60, ERX.Input, true); };
      p.ab.ult = 100; p.ab.cast('ult'); step(ERX.Ultimate.T.end + 0.05);
      const fx = () => g.effects.find((e) => e.realityCollapse);
      step(1.2); out.up = feet0 - p.feet; out.held = !!p.ultHold;
      out.safe = p.takeHit(30, p.cx + 10) === 'ignored';
      step(0.8); out.roared = !!(fx() && fx().roared); out.hurt = g.enemies.filter((e) => e.hp < e.maxHp).length; out.stillUp = feet0 - p.feet;
      step(4); const c = fx() ? Object.assign({}, fx().count) : {}; out.count = c;
      for (let i = 0; i < 400 && fx(); i++) g.update(1 / 60, ERX.Input, true);   // (freeze frames from all those hits stretch it a little)
      out.down = Math.abs(p.feet - feet0) < 1 && !p.ultHold; out.camFree = !g.ultCam; out.over = !fx();
      ERX.Awakening.end(g); ERX.Admin.set('god', god); ERX.Admin.set('element', null); g.effects.length = 0;
      return out;
    })()`);
    check('awakened Chaos\'s Ultimate charges with its arms crossed in an X', rc.xArms, rc);
    check('...then you leap into the air (and nothing can touch you while it plays)', rc.up > 30 && rc.held && rc.safe, rc);
    check('...ROAR: a shockwave tears through everything around you', rc.roared && rc.hurt >= 5 && rc.stillUp > 30, rc);
    check('...and everything goes off at once: other elements\' Ultimates, awakened skills and ordinary skills', rc.count.ult >= 1 && rc.count.awk >= 1 && rc.count.skill >= 1, rc);
    check('...then it stops and you\'re straight back on the ground', rc.down && rc.camFree && rc.over, rc);

    const planetfall = await ev(`(() => {
      const g = ${G}, p = g.player, out = { bars: 0, zoom: 1, impact: false, dmg: 0 };
      ERX.Admin.set('element', 'gravity'); ERX.Admin.set('skills', 'base'); p.ab = new ERX.AbilityState(p); ERX.Awakening.begin(g); p.placeAt(12.5 * 16, g.level.floorY); p.facing = 1; p.ultHold = null;
      const t = ERX.Enemies.create(g, { type: 'dummy', variant: 'tank', x: p.cx + 70, y: g.level.floorY }); g.enemies.push(t); t.total = 0;
      p.ab.ult = 100; p.ab.cast('ult');
      for (let i = 0; i < 60 * 11; i++) { g.update(1 / 60, ERX.Input, true); const uc = g.ultCam; if (uc) { out.bars = Math.max(out.bars, uc.bars); out.zoom = Math.max(out.zoom, uc.zoom); } if (g.impactT > 0) out.impact = true; t.hp = t.maxHp; }
      out.dmg = Math.round(t.total); out.camGone = !g.ultCam || g.t - g.ultCam.t > 0.25;
      g.enemies.splice(g.enemies.indexOf(t), 1); g.effects.length = 0; p.ultHold = null;
      ERX.Admin.set('element', null); p.ab = new ERX.AbilityState(p);
      return out;
    })()`);
    check('Planetfall is a whole cinematic (letterbox, the camera pushing into the black hole, an impact frame) and hits like a truck', planetfall.bars >= 1 && planetfall.zoom > 1.5 && planetfall.impact && planetfall.dmg >= 200 && planetfall.camGone, planetfall);

    const film = await ev(`(() => {
      const g = ${G}, p = g.player, out = { bars: 0, zoom: 1 };
      ERX.Admin.set('element', 'fire'); p.ab = new ERX.AbilityState(p); ERX.Awakening.begin(g); p.placeAt(12.5 * 16, g.level.floorY); p.ultHold = null;
      p.ab.ult = 100; p.ab.cast('ult');
      for (let i = 0; i < 60 * 8; i++) { g.update(1 / 60, ERX.Input, true); const uc = g.ultCam; if (uc && g.t - uc.t < 0.25) { out.bars = Math.max(out.bars, uc.bars); out.zoom = Math.max(out.zoom, uc.zoom); } }
      g.effects.length = 0; p.ultHold = null; ERX.Admin.set('element', null); p.ab = new ERX.AbilityState(p);
      return out;
    })()`);
    check('every awakened Ultimate plays out like a film (letterbox bars, a slow push in)', film.bars >= 1 && film.zoom > 1.02, film);
    check("awakened hits land harder: sparks, a freeze-frame on big hits, an impact frame on an Ultimate's finisher", await ev(`(() => { const g = ${G}, A = ERX.Abilities.api(g); const t = ERX.Enemies.create(g, { type: 'dummy', variant: 'tank', x: g.player.cx + 40, y: g.level.floorY }); g.enemies.push(t); g.hitStop = 0; g.impactT = 0; g._awkStop = -9; g._awkImpact = -9; const n0 = g.fx.count; A.damage({ dmg: 80, x: g.player.cx, pal: ERX.Abilities.palette(ERX.Elements.get('fire'), ERX.Kits.fire, false), isAwk: true, isUlt: true, status: null, potency: 0 }, t, 1, 0); const ok = g.fx.count > n0 && g.hitStop > 0 && g.impactT > 0; g.enemies.splice(g.enemies.indexOf(t), 1); g.hitStop = 0; g.impactT = 0; return ok; })()`));

    console.log('[every move sounds like its element, and lands]');
    const voices = await ev(`(async () => {
      const kinds = ERX.ElementSfx.KINDS, bad = [];
      for (const el of ERX.Elements.list.map((e) => e.id)) for (const k of kinds) for (const awk of [false, true]) {
        if (typeof (ERX.ElementSfx.VOICES[el] || ERX.ElementSfx.VOICES.fire)[k] !== 'function' && el !== 'chaos') { bad.push(el + '.' + k + ' missing'); continue; }
        if (ERX.ElementSfx.SILENT[el + '.' + k]) continue;   // silent on purpose
        if (awk && k !== 'hit' && k !== 'cast') continue;
        try {
          const oac = new OfflineAudioContext(1, 44100, 44100), noise = oac.createBuffer(1, 22050, 44100), nd = noise.getChannelData(0);
          for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
          ERX.SfxBank['el_' + k]({ ctx: oac, waves: {}, noise, tone: ERX.Audio.tone, noiseBurst: ERX.Audio.noiseBurst }, oac.destination, 0.01, { el, awk, s: 1.4 });
          const d = (await oac.startRendering()).getChannelData(0); let peak = 0; for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
          if (peak < 0.01) bad.push(el + '.' + k + (awk ? '*' : '') + ' silent'); else if (peak > 1) bad.push(el + '.' + k + (awk ? '*' : '') + ' clips');
        } catch (e) { bad.push(el + '.' + k + ': ' + e.message); }
      }
      return bad;
    })()`);
    check('every element has its own sound for swings, casts, hits, blasts, dashes and Ultimates (all of them play, none clip)', voices.length === 0, voices);
    const heard = await ev(`(() => {
      const g = ${G}, p = g.player, A = ERX.Abilities.api(g), rec = [], orig = ERX.Audio.playSfx;
      ERX.Audio.playSfx = function (n, o) { rec.push(n + ':' + (o && o.el)); return orig.apply(this, arguments); };
      try {
        ERX.Admin.set('element', 'water'); p.ab = new ERX.AbilityState(p); p.placeAt(12.5 * 16, g.level.floorY); p.facing = 1;
        const t = ERX.Enemies.create(g, { type: 'dummy', variant: 'tank', x: p.cx + 16, y: g.level.floorY }); g.enemies.push(t);
        p.ab.cast('m1'); for (let i = 0; i < 30; i++) g.update(1 / 60, ERX.Input, true);
        A.blast({ pal: ERX.Abilities.palette(ERX.Elements.get('water'), ERX.Kits.water, false), dmg: 5, el: 'water' }, p.cx + 60, p.y, 30);
        g.enemies.splice(g.enemies.indexOf(t), 1); g.effects.length = 0;
      } finally { ERX.Audio.playSfx = orig; ERX.Admin.set('element', null); p.ab = new ERX.AbilityState(p); }
      return { swing: rec.includes('el_swing:water'), hit: rec.includes('el_hit:water'), boom: rec.includes('el_boom:water') };
    })()`);
    check('...and they really play: a swing, its hit and a blast all sound like the element that made them', heard.swing && heard.hit && heard.boom, heard);
    const land = await ev(`(() => {
      const g = ${G}, p = g.player, A = ERX.Abilities.api(g), H = ERX.KitHelp, out = {};
      const pal = ERX.Abilities.palette(ERX.Elements.get('fire'), ERX.Awakened.fire, false);
      const a = ERX.Enemies.create(g, { type: 'dummy', variant: 'tank', x: p.cx + 40, y: g.level.floorY }), b2 = ERX.Enemies.create(g, { type: 'dummy', variant: 'tank', x: p.cx + 58, y: g.level.floorY });
      g.enemies.push(a, b2); const hp = b2.hp;
      A.damage({ dmg: 20, x: p.cx, pal, isAwk: true, isUlt: false, el: 'fire', status: null, potency: 0 }, a, 1, 0);
      out.splash = b2.hp < hp;
      const hp2 = b2.hp; A.damage({ dmg: 20, x: p.cx, pal, isAwk: false, isUlt: false, el: 'fire', status: null, potency: 0 }, a, 1, 0); out.baseNoSplash = b2.hp === hp2;
      out.sc = H.sc({ isAwk: true }) === 1.25 && H.sc({ isAwk: true, isUlt: true }) === 1 && H.sc({}) === 1;
      ERX.Admin.set('element', 'fire'); p.ab = new ERX.AbilityState(p); ERX.Awakening.begin(g); g.effects.length = 0;
      for (let i = 0; i < 3; i++) { p.ab.cd.m1 = 0; p.ab.cast('m1'); g.update(1 / 60, ERX.Input, true); }
      out.finisher = g.effects.some((e) => e.kind === 'blastfx');
      out.glow = ERX.Abilities.Glow.wants(g.effects[0]) && !ERX.Abilities.Glow.wants({ isAwk: true, isUlt: true }) && ERX.Abilities.Bold.wants({ el: 'fire' }) && !ERX.Abilities.Bold.wants({ el: 'fire', isAwk: true });
      g.enemies.splice(g.enemies.indexOf(a), 1); g.enemies.splice(g.enemies.indexOf(b2), 1); g.effects.length = 0; g.hitStop = 0; g.impactT = 0;
      ERX.Admin.set('element', null); p.ab = new ERX.AbilityState(p);
      return out;
    })()`);
    check('awakened hits splash onto enemies standing nearby (built for crowds); normal hits do not', land.splash && land.baseNoSplash, land);
    check('awakened moves are drawn bigger (not the Ultimates), with their own glow; normal moves get a lighter outline', land.sc && land.glow, land);
    check('every third awakened swing ends in a burst of your element', land.finisher, land);

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
