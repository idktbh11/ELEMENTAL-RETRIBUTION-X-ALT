/*
 * GAMEPLAY SCREEN — owns the current area (level), player, camera, lighting,
 * entities, dialogue and the story scripts. Pushed from the character list:
 *   ERX.Scenes.push('game', { character }, { transition: 'dissolve' })
 *
 * Flow:
 *   THE CAVE: wake up -> explore -> arena + the Voice + tutorial -> gates open
 *   -> monster cavern -> the Voice applauds (sarcastically) -> descend
 *   THE DEEP ENDS: crystals, miners, monsters -> the ELEVATOR
 *   THE SEALED CHAMBER: the rainbow orb -> shockwave -> nebula -> pass out
 *   -> "YOU GOT ..." (the element reveal)
 *   THE VOID: float -> no floor -> THE VOICE in person -> the scan -> 7 worlds
 *   -> world 1 unlocked -> jump in (coming soon) or visit THE HQ (armour shop)
 *
 * Progress (character.progress.stage): new -> tutorialDone -> enemiesCleared
 *   -> deepEnds -> reachedEnd -> awakened -> worldUnlocked. Returning players
 *   resume at the right place. character.element is assigned ONLY at the reveal.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, F = ERX.Font, T = ERX.UITheme, K = ERX.Keybinds;
  const { Camera, Lighting, Script, Physics } = ERX.GameEngine;
  const { Gate, Dummy, Bolt, Orb, Shockwave, renderDecor, drawFlame } = ERX.Props;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);

  const STAGES = ['new', 'tutorialDone', 'enemiesCleared', 'deepEnds', 'reachedEnd', 'awakened', 'worldUnlocked'];
  const ORB_LIGHTS = ['#ff5a5a', '#ffb84a', '#ffe95a', '#6aff8a', '#5ac8ff', '#b07aff'];
  // ability effects drawn behind characters (things on the ground)
  const BACK_FX = { zone: true, vortex: true, aura: true, spikes: true, pillar: true, turret: true };
  const stageIndex = (s) => Math.max(0, STAGES.indexOf(s));

  const WAKE_THOUGHTS = [
    '...',
    '...five more minutes...',
    'why is the floor so hard',
    'is this... a rock? am I sleeping on a rock?',
    'where even am I',
    'WAKE UP. WAKE UP. WAKE UP.',
  ];

  const REVIVE_LINES = [
    'The Immortality Stone revived you. It seemed annoyed.',
    'Revived! The Immortality Stone sighs: "again?"',
    'You died. Briefly. The Stone fixed it. Try harder.',
    'Back from the dead! The Stone is keeping count.',
  ];

  class GameScreen extends ERX.Scenes.Screen {
    enter(params) {
      this.opaque = true;
      this.coversPanels = true;
      this.appearDuration = 0.01;
      this.character = params.character;
      this.playerSpeaker = { name: this.character.name.toUpperCase(), color: '#ffd34d', plate: '#3a3a20', voice: null, speed: 60 };
      this.camera = new Camera();
      this.lighting = new Lighting();
      this.dialogue = new ERX.Dialogue({ position: 'top' });
      this.player = new ERX.Player(this, this.character);
      this.zoom = 1;
      this.t = 0;
      this.hudAlpha = 0;
      this.deaths = 0;

      const stage = this.stage();
      if (stage === 'new') this.loadLevel('cave', { wake: true });
      else if (stage === 'tutorialDone') this.loadLevel('cave', { at: 'arena' });
      else if (stage === 'enemiesCleared') this.loadLevel('cave', { at: 'gauntlet' });
      else if (stage === 'awakened') this.loadLevel('void', { intro: true });
      else if (stage === 'worldUnlocked') this.loadLevel('void', {});
      else this.loadLevel('deep', { at: stage === 'reachedEnd' ? 'hall' : 'start' });
      ERX.Audio.setAmbience('cave');
    }

    stage() {
      return (this.character.progress && this.character.progress.stage) || 'new';
    }

    // ------------------------------------------------------- level loading
    loadLevel(id, opts = {}) {
      const seed = (Date.now() >>> 0) ^ (id === 'cave' ? 0x1234 : 0x5678);
      this.levelId = id;
      const Level = { cave: ERX.CaveLevel, vault: ERX.VaultLevel, void: ERX.VoidLevel, hq: ERX.HqLevel, training: ERX.TrainingLevel, world1: ERX.World1Level }[id] || ERX.DeepEndsLevel;
      this.level = new Level(seed);
      this.backWall = this.level.renderBackWall ? this.level.renderBackWall() : null;
      this.frontLayer = this.level.renderFront ? this.level.renderFront() : null;
      this.tilesCanvas = this.level.renderTiles();
      this.bgCanvas = this.level.renderBackground();
      this.decorCanvas = renderDecor(this.level);

      this.gates = {};
      this.dummy = null;
      this.enemies = [];
      this.npcs = [];
      this.bolts = [];
      this.fx = new ERX.Paint.Particles();
      this.confetti = new ERX.Paint.Particles();
      this.floats = [];
      this.script = null;
      this.objective = null;
      this.barkMsg = null;
      this.banner = null;
      this.bossBar = null;
      this.warning = false;
      this.rumbleT = 0;
      this.prompt = null;
      this.state = 'play';
      this.lids = 1;
      this.elev = null;
      this.orb = null;
      this.shockwaves = [];
      this.neb = null;
      this.rev = null;
      this.figure = null;
      this.worlds = null;
      this.energyKey = null;
      this.scan = null;
      this.hqDoor = null;
      this.launch = null;
      this.float = null;
      this.fall = null;
      this.pull = null;
      this.recall = null;
      this.gift = null;
      this.checkshot = null;
      this.blocker = null;
      this.ripples = [];
      this.effects = [];
      this.cine = null;
      this.transitioning = false;
      this.dialogue.close();

      const p = this.player;
      p.lying = false;
      p.controls = true;
      p.hp = p.maxHp;
      const st = stageIndex(this.stage());
      this.allowDeath = st >= 1;

      if (id === 'cave') {
        const L = this.level;
        this.gates.left = new Gate(L, L.arena.leftGate);
        this.gates.right = new Gate(L, L.arena.rightGate);
        this.gates.gauntlet = new Gate(L, L.gauntlet.gate);
        this.gates.gauntlet.snap(st < 2); // sealed until the monsters are cleared
        this.arenaLit = false;
        this.stageName = 'cave';
        if (opts.wake) {
          this.stageName = 'cave';
          this.state = 'intro';
          this.wake = 0; this.wakeT = 0; this.lids = 0; this.thought = 0;
          p.placeAt(L.spawn.x, L.spawn.y);
          p.lying = true;
          p.controls = false;
          this.darkness = 0.06;
          this.hudAlpha = 0;
          ERX.Audio.playMusic(null);
        } else {
          this.stageName = 'free';
          this.arenaLit = true;
          for (const b of L.braziers) b.lit = true;
          this.dummy = new Dummy(this, L.arena.dummyX, L.arena.floorY);
          this.dummy.spawnT = 1;
          this.hudAlpha = 1;
          this.darkness = 0.04;
          if (opts.at === 'gauntlet') {
            p.placeAt(L.gauntlet.spawn.x, L.gauntlet.spawn.y);
            ERX.Audio.playMusic('cave');
            this.setObjective('HEAD DEEPER INTO THE CAVE  →', null, 1);
          } else {
            p.placeAt(L.arena.centerX - 60, L.arena.floorY);
            ERX.Audio.playMusic('onward');
            this.runScript(ERX.Story.cave.returning);
          }
        }
        for (const s of L.enemySpawns) {
          if (s.zone === 'gauntlet' && st >= 2) continue;
          this.enemies.push(ERX.Enemies.create(this, s));
        }
      } else if (id === 'vault') {
        const L = this.level;
        this.orb = new Orb(this, L.orb.x, L.orb.floorY, false);
        this.stageName = 'vault';
        this.darkness = 0.5;
        this.hudAlpha = 1;
        this.allowDeath = true;
        p.placeAt(L.elevator.x, L.elevator.floorY);
        ERX.Audio.playMusic(null);
        this.banner = { title: 'THE SEALED CHAMBER', sub: 'Something in here is humming. At you.', t: 0, dur: 4 };
        if (opts.arrive) this.runScript(ERX.Story.vault.vaultArrival);
      } else if (id === 'void') {
        const L = this.level;
        this.stageName = 'void';
        this.darkness = 0;
        this.hudAlpha = 1;
        this.allowDeath = true;
        ERX.Audio.setAmbience(null);
        if (opts.intro || this.stage() !== 'worldUnlocked') {
          // floating in space, fast asleep. The Voice is out there somewhere.
          this.float = { t: 0, x: L.spawn.x, y: L.floorY - 64 };
          p.placeAt(this.float.x, this.float.y);
          p.lying = true;
          p.controls = false;
          this.state = 'float';
          this.hudAlpha = 0;
          this.figure = { x: L.figureX, y: L.floorY, facing: 1, front: false, expr: 'neutral', pose: 'idle', t: 0, hop: 0, shakeT: 0, bubble: null, walkTo: null, gone: false, met: false, named: false };
          ERX.Audio.playMusic(null);
          this.runScript(ERX.Story.void.voidIntro);
        } else {
          this.showWorlds(true);
          this.worlds.unlocked[0] = true;
          this.hqDoor = { x: L.doorX, y: L.floorY, t: 1, openT: 0 };
          const at = opts.at === 'door' ? L.doorX - 26 : opts.at === 'jump' ? L.jumpX - 34 : L.spawn.x;
          p.placeAt(at, L.floorY);
          ERX.Audio.playMusic('void');
          if (!opts.at) this.banner = { title: 'THE VOID', sub: 'Floor: invisible. Vibes: cosmic.', t: 0, dur: 3.5 };
          this.runScript(ERX.Story.void.backInVoid);
        }
      } else if (id === 'hq') {
        const L = this.level;
        this.stageName = 'hq';
        this.darkness = 0.18;
        this.hudAlpha = 1;
        p.placeAt(opts.at === 'training' ? L.trainingDoor.x - 22 : L.spawn.x, L.floorY);
        for (const n of L.people) this.npcs.push(Object.assign({ talkIndex: 0, t: Math.random() * 3, facing: -1 }, n));
        ERX.Audio.playMusic('hq');
        ERX.Audio.setAmbience(null);
        if (opts.at !== 'training') this.banner = { title: 'HERO HQ', sub: 'Staff: questionable. Coffee: imaginary.', t: 0, dur: 3.5 };
      } else if (id === 'training') {
        const L = this.level;
        this.stageName = 'training';
        this.darkness = 0.12;
        this.hudAlpha = 1;
        this.allowDeath = true;
        p.placeAt(L.spawn.x, L.floorY);
        for (const s of L.enemySpawns) this.enemies.push(ERX.Enemies.create(this, s));
        ERX.Audio.playMusic('onward');
        ERX.Audio.setAmbience(null);
        this.banner = { title: 'TRAINING ROOM', sub: 'Hit stuff. Learn stuff. The dummies signed waivers.', t: 0, dur: 3.5 };
      } else if (id === 'world1') {
        // WORLD 1: you always arrive from the sky; coming back from a save puts you at the Checkshot
        const L = this.level;
        L.game = this;
        L.ambience = 'world1';
        this.stageName = 'world1';
        this.darkness = 0;
        this.hudAlpha = 1;
        this.allowDeath = true;
        if (this.worldTod === undefined) this.worldTod = 0.12;   // a fresh morning
        this.checkshot = { x: L.checkshotX, y: L.floorY, on: false, t: 0, onT: 0 };
        if (opts.fall) {
          p.placeAt(L.landX, L.floorY - L.fallHeight);
          this.fall = new ERX.SkyFall(this, 1);
          this.fall.onDone = (g) => g.runScript(ERX.Story.world.world1Arrival);
        } else {
          p.placeAt(L.checkshotX + 20, L.floorY);
          this.checkshot.on = true;
          this.blocker = { x: L.slimeX, y: L.floorY, vy: 0, landed: true, t: 1, angry: false };
          ERX.Audio.playMusic('world1');
          ERX.Audio.setAmbience('world1');
        }
      } else {
        const L = this.level;
        const at = opts.at === 'hall' ? L.checkpoints[L.checkpoints.length - 1] : opts.at === 'elevator' ? { x: L.elevator.x0 - 24, y: L.elevator.floorY } : L.spawn;
        p.placeAt(at.x, at.y);
        for (const s of L.enemySpawns) this.enemies.push(ERX.Enemies.create(this, s));
        for (const n of L.npcs) this.npcs.push(Object.assign({ talkIndex: 0, t: Math.random() * 3 }, n));
        this.stageName = 'deep';
        this.darkness = 0.25;
        this.hudAlpha = 1;
        ERX.Audio.playMusic('deepends');
        this.banner = { title: 'THE DEEP ENDS', sub: 'Bright. Colourful. Full of monsters. Lovely.', t: 0, dur: 4 };
        if (st < 3) this.saveProgress('deepEnds');
        this.allowDeath = true;
      }
      this.checkpoint = { x: p.cx, y: p.feet };
      this._resize(true);
      this.camera.focus = null;
      this.camera.snap(p.cx, p.y, this.level);
    }

    exit() {
      ERX.Input.textMode = false;
      const bg = ERX.Backgrounds.current;
      if (bg) { ERX.Audio.playMusic(bg.music); ERX.Audio.setAmbience(bg.ambience); }
    }

    resume() {
      this.player.applySkills();
    }

    // ------------------------------------------------------- story hooks
    runScript(fn) { this.script = new Script(fn, this); }
    lockControls(on) { this.player.controls = !on; }
    shake(a, d) { ERX.FX.shake(a, d); }
    music(id) { ERX.Audio.playMusic(id); }
    focusCamera(x, y) { this.camera.focus = { x, y }; }
    releaseCamera() { this.camera.focus = null; }
    rumble(dur) { this.rumbleT = dur; sfx('rumble', { dur }); }
    floatText(x, y, text, color) { this.floats.push({ x, y, text, color, t: 0 }); }
    clearBolts() { this.bolts.length = 0; }
    addBolt(x, y, vx) { this.bolts.push(new Bolt(x, y, vx)); }
    setObjective(label, progress, goal) { this.objective = { label, progress, goal, t: 0, doneT: 0 }; }
    completeObjective() { if (this.objective) this.objective.doneT = 0.01; sfx('objective'); }
    bark(text) { this.barkMsg = { text, t: 0, dur: 2.6 }; }
    givePoints(n) {
      this.character.skillPoints = (this.character.skillPoints || 0) + n;
      ERX.Saves.update(this.character);
      ERX.Toast.show('+' + n + ' SKILL POINT! Press ' + ERX.keyText('{skills}') + ' to spend it.', { color: '#ffd34d', duration: 3.5 });
      sfx('star');
    }
    saveProgress(stage) {
      this.character.progress = Object.assign({}, this.character.progress, { stage });
      ERX.Saves.update(this.character);
      if (stageIndex(stage) >= 1) this.allowDeath = true;
    }
    lightArena() {
      this.arenaLit = true;
      sfx('ignite');
      this.shake(2, 0.3);
      this.flashT = 0.3;
      this.level.braziers.forEach((b, i) => setTimeout(() => { b.lit = true; sfx('ignite', { minGap: 0.05 }); }, i * 120));
    }
    spawnDummy() {
      const A = this.level.arena;
      this.dummy = new Dummy(this, A.dummyX, A.floorY);
      sfx('pop');
      sfx('confetti');
      this.flashT = 0.3;
      for (let i = 0; i < 90; i++) {
        this.confetti.add({
          x: A.dummyX + U.lerp(-6, 6, Math.random()), y: A.floorY - 30,
          vx: U.lerp(-150, 150, Math.random()), vy: U.lerp(-260, -60, Math.random()), ay: 280,
          life: U.lerp(2, 4, Math.random()), size: Math.random() < 0.5 ? 1 : 2,
          colors: [ERX.Color.ELEMENTS[i % 6], '#ffffff'], wobble: 30, wobbleRate: U.lerp(4, 9, Math.random()), phase: Math.random() * 6, fadeOut: 0.8,
        });
      }
    }
    openGates() {
      this.gates.left.open();
      this.gates.right.open();
      this.shake(2, 0.4);
    }
    openGauntletGate() {
      if (this.gates.gauntlet) this.gates.gauntlet.open();
      this.shake(2, 0.4);
    }
    dust(x, y, n) {
      for (let i = 0; i < n; i++) this.fx.add({ x: x + U.lerp(-4, 4, Math.random()), y: y - 1, vx: U.lerp(-30, 30, Math.random()), vy: U.lerp(-30, -5, Math.random()), life: U.lerp(0.25, 0.5, Math.random()), color: '#8a7e9c', size: 1, grow: 1, fadeOut: 0.3 });
    }
    sparks(x, y, n, dir) {
      for (let i = 0; i < n; i++) this.fx.add({ x, y, vx: dir * U.lerp(20, 120, Math.random()) + U.lerp(-40, 40, Math.random()), vy: U.lerp(-120, -20, Math.random()), ay: 300, life: U.lerp(0.2, 0.45, Math.random()), color: Math.random() < 0.5 ? '#ffd34d' : '#ffffff', size: 1 });
    }

    /** The player's punch: every target can be hit once per swing. */
    playerAttack(box, dmg, dir, crit, swingId) {
      let hit = false;
      const d = this.dummy;
      if (d && d.spawnT > 0.3 && d.lastSwing !== swingId && Physics.rectsOverlap(box, d.box)) {
        d.lastSwing = swingId;
        d.hit(dmg, dir, crit);
        this.player.stats.hits++;
        hit = true;
      }
      for (const e of this.enemies) {
        if (e.dead || e.lastSwing === swingId || !Physics.rectsOverlap(box, e.box)) continue;
        e.lastSwing = swingId;
        e.hurt(dmg, dir, crit);
        hit = true;
      }
      return hit;
    }

    onEnemyKilled(e) {
      if (!e.xp) return;
      const ups = this.player.gainXp(e.xp);
      this.floatText(e.cx, e.y - 14, '+' + e.xp + ' XP', '#a8f0ff');
      if (ups) { this.character.skillPoints = (this.character.skillPoints || 0) + ups; ERX.Saves.update(this.character); }
      if (e.gold) {
        this.character.gold = (this.character.gold || 0) + e.gold;
        ERX.Saves.update(this.character);
        this.floatText(e.cx, e.y - 24, '+' + e.gold + 'G', '#ffd34d');
        sfx('coin');
      }
      if (ups) {
        sfx('levelUp');
        this.floatText(this.player.cx, this.player.y - 18, 'LEVEL UP!', '#ffd34d');
        ERX.Toast.show('LEVEL ' + this.player.level + '! +5 MAX HP, +1 SKILL POINT.', { color: '#ffd34d' });
        for (let i = 0; i < 20; i++) this.fx.add({ x: this.player.cx, y: this.player.y + 10, vx: U.lerp(-60, 60, Math.random()), vy: U.lerp(-140, -40, Math.random()), ay: 120, life: 1, color: i % 2 ? '#ffd34d' : '#ffffff', size: 1, fadeOut: 0.5 });
      }
    }

    onBolt(result) {
      if (result === 'hit' && this.boltHitQuips && this.boltHitQuips.length) this.bark(this.boltHitQuips.shift());
      if (result === 'blocked' && Math.random() < 0.3) this.bark(['Nice.', 'Ding!', 'Look at you go.', 'Blocked. Fancy.'][Math.floor(Math.random() * 4)]);
    }

    startElevator(dir) {
      this.state = 'elevator';
      this.elev = { y: 0, speed: 0, target: 0, jolt: 0, flicker: 0, slime: null, t: 0, dir: dir || 1 };
      this.player.vx = 0;
    }

    /** Fade to another area (elevator arrivals). */
    travel(id, opts) {
      if (this.transitioning) return;
      this.transitioning = true;
      ERX.Scenes.transition('dissolve', 1.2, () => this.loadLevel(id, opts));
    }

    // ------------------------------------------------ the orb + the reveal
    awakened() { return stageIndex(this.stage()) >= stageIndex('awakened'); }
    /** The element you're playing with: yours, or the admin panel's pick (testing only, never saved). */
    element() {
      const A = ERX.Admin;
      if (A && A.on() && A.data.element) return ERX.Elements.get(A.data.element);
      return ERX.Elements.get(this.character.element);
    }
    addShockwave(x, y, r, dur) { this.shockwaves.push(new Shockwave(x, y, r, dur)); }

    startNebula() {
      this.state = 'nebula';
      this.neb = { t: 0, lying: false, fading: false, black: 0 };
      this.dialogue.close();
      ERX.Audio.cutMusic();
    }

    /**
     * Silence, darkness... and the element is decided. Right here. At random.
     * This is the ONLY place an element is ever assigned, and it never rerolls.
     */
    startReveal() {
      this.state = 'reveal';
      this.rev = { t: 0, you: null, got: null, roll: null, elem: null, rarity: null, slime: null, sparks: [] };
      ERX.Audio.cutMusic();
      ERX.Audio.setAmbience(null);
      if (!ERX.Elements.get(this.character.element)) this.character.element = ERX.Elements.random().id;
      this._freshStart();
      this.saveProgress('awakened');
    }

    /**
     * Getting your element is a brand-new start: the tutorial's levels, XP, skill
     * points, stats and gold are all gone. (Achievements stay; they're device-wide.)
     */
    _freshStart() {
      const c = this.character, p = this.player;
      c.level = 1;
      c.xp = 0;
      c.skills = { vitality: 0, focus: 0, agility: 0 };
      c.elementSkills = {};
      c.skillPoints = 0;
      c.gold = 0;
      ERX.Inventory.clearArmor(c);
      p.hp = 0; p.mp = 0;
      p.applySkills();
      p.hp = p.maxHp; p.mp = p.maxMp;
      p.ab = new ERX.AbilityState(p);
      this.hpShown = p.hp;
    }

    /** Sparks out of the element art. `rarity`: a second burst in the rarity colour (rainbow for MYTHIC). */
    revealBurst(rarity) {
      const el = this.element(), rar = ERX.Elements.rarityOf(el);
      const n = rarity ? 80 + rar.tier * 30 : 120;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = U.lerp(40, 260, Math.random());
        const c = rarity ? (rar.tier >= 5 ? ERX.Props.rainbow(0, Math.random() * 360) : Math.random() < 0.7 ? rar.color : '#ffffff') : Math.random() < 0.7 ? el.color : '#ffffff';
        this.rev.sparks.push({ x: 0, y: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, t: U.lerp(0.8, 2.2, Math.random()), c });
      }
    }

    /** End panel "BACK TO THE VOID" (after trying to jump into world 1). */
    leaveReveal() {
      this.travel('void', { at: 'jump' });
    }

    // ------------------------------------------------------- the void
    /** An immediate cut to black + silence. */
    blackout() {
      this.state = 'black';
      this.dialogue.close();
      ERX.Audio.cutMusic();
      ERX.Audio.setAmbience(null);
    }
    /** Floating asleep in space -> bounce right to your feet. */
    wakeFromFloat() {
      const p = this.player;
      this.state = 'play';
      this.float = null;
      p.lying = false;
      p.vy = -310;
      p.y -= 6;
      sfx('wakeUp');
      this.shake(2, 0.25);
    }
    /** A thought that floats up from your head (slower + longer than damage numbers). */
    thinkAloud(text, color) {
      this.floats.push({ x: this.player.cx, y: this.player.y - 10, text, color: color || '#c8d0f0', t: 0, dur: 2.6, rise: 6 });
    }
    ripple(x, y, big) { this.ripples.push({ x, y, t: 0, big: !!big }); }
    startScan(dur) {
      this.scan = { t: 0, dur };
      sfx('scan', { dur });
    }
    scanResult() {
      const el = this.element(), p = this.player;
      this.scan = null;
      sfx('scanDone');
      this.flashT = 0.2;
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2, sp = U.lerp(30, 110, Math.random());
        this.fx.add({ x: p.cx, y: p.y + 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: U.lerp(0.5, 1, Math.random()), color: Math.random() < 0.75 ? el.color : '#ffffff', size: Math.random() < 0.3 ? 2 : 1, fadeOut: 0.4 });
      }
      this.floats.push({ x: p.cx, y: p.y - 14, text: el.name.toUpperCase() + '!', color: el.color, t: 0, dur: 2.4, rise: 8 });
    }
    /** The 7 worlds (built from your element). instant = already there. */
    showWorlds(instant) {
      this.worlds = { list: ERX.Worlds.build(this.element()), t: instant ? 99 : 0, unlocked: [false, false, false, false, false, false, false], shards: [] };
      if (!instant) sfx('worldsAppear');
    }
    chargeKey() {
      this.energyKey = { phase: 'charge', t: 0, done: false };
      sfx('energyCharge');
    }
    shootKey() {
      const k = this.energyKey, f = this.figure, h = ERX.FigureSprite.hand(f.facing);
      const to = this._skyPos(this.worlds.list[0]);
      k.phase = 'fly';
      k.t = 0;
      k.from = { x: f.x + h.x, y: f.y + h.y };
      k.to = { x: to.x + this.camera.ix, y: to.y + this.camera.iy };
      sfx('keyShoot');
    }
    spawnHqDoor() {
      const L = this.level;
      this.hqDoor = { x: L.doorX, y: L.floorY, t: 0, openT: 0 };
      sfx('doorPop');
      for (let i = 0; i < 24; i++) this.fx.add({ x: L.doorX, y: L.floorY - 20, vx: U.lerp(-80, 80, Math.random()), vy: U.lerp(-90, 30, Math.random()), life: 0.6, color: i % 2 ? '#c89aff' : '#ffffff', size: 1, fadeOut: 0.3 });
    }
    startLaunch() {
      const p = this.player;
      this.state = 'launch';
      this.launch = { t: 0, x0: p.cx, y0: p.feet };
      sfx('jump');
      sfx('launch');
    }
    /** Black screen, and the grumpy slime drops in (reuses the reveal screen). */
    dropSlime() {
      this.state = 'reveal';
      this.rev = { t: 0, you: null, got: null, roll: null, elem: null, rarity: null, slime: { y: -140, vy: 0, landed: false, t: 0 }, sparks: [] };
    }

    // ------------------------------------------------------- the worlds
    /** Drop into a world: 2 s of black, the portal, the fall (js/game/world-fall.js). */
    enterWorld(n) {
      this.flashT = 0;
      this.loadLevel('world' + n, { fall: true });
    }
    /** Remember a story moment on the character (progress.vrd, progress.world1...). */
    saveFlag(name) {
      this.character.progress = Object.assign({}, this.character.progress, { [name]: true });
      ERX.Saves.update(this.character);
    }
    /** Freeze the launch where it is (someone is yelling WAIT). */
    holdLaunch() { if (this.launch) this.launch.hold = true; }
    /** Where the launch has you right now, in world pixels (feet), and how small you've got. */
    _launchPos() {
      const L = this.launch, cam = this.camera, target = this._skyPos(this.worlds.list[0]);
      const sx = L.x0 - cam.ix, sy = L.y0 - cam.iy, hop = Math.min(1, L.t / 0.35), e = U.clamp((L.t - 0.35) / 1.4, 0, 1), ee = e * e;
      return { x: U.lerp(sx, target.x, ee) + cam.ix, y: U.lerp(sy - Math.sin(hop * Math.PI * 0.5) * 30, target.y, ee) + cam.iy };
    }
    /** The Voice comes running out of the HQ (making the figure if he wasn't around). */
    figureBurstsOut() {
      const L = this.level;
      const f = this.figure || (this.figure = { x: 0, y: L.floorY, facing: -1, front: false, expr: 'shock', pose: 'idle', t: 0, hop: 0, shakeT: 0, bubble: null, walkTo: null, gone: false, met: true, named: true });
      Object.assign(f, { gone: false, x: this.hqDoor ? this.hqDoor.x : L.doorX, y: L.floorY, walkTo: null, facing: -1, expr: 'shock', pose: 'point', hop: 1, shakeT: 0.6, front: false, met: true, named: true });
      if (this.hqDoor) this.hqDoor.openT = 0.9;
      sfx('doorOpen');
      return f;
    }
    /** The telekinesis device: you get dragged out of the air and back down to (toX, the floor). */
    startPull(toX) {
      const from = this.launch ? this._launchPos() : { x: this.player.cx, y: this.player.feet };
      this.launch = null;
      this.state = 'pull';
      this.pull = { t: 0, x0: from.x, y0: from.y, x1: toX, y1: this.level.floorY };
    }
    _updatePull(dt) {
      const P = this.pull, p = this.player;
      P.t += dt;
      const k = Math.min(1, P.t / 1.3), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      p.placeAt(U.lerp(P.x0, P.x1, e), U.lerp(P.y0, P.y1, e) - Math.sin(k * Math.PI) * 26);
      if (k >= 1) {
        this.pull = null;
        this.state = 'play';
        p.placeAt(P.x1, P.y1);
        sfx('thud');
        this.dust(P.x1, P.y1, 10);
        this.shake(3, 0.25);
        if (this.ripple) this.ripple(P.x1, P.y1, true);
      }
    }
    _renderPull(c, cam) {
      const P = this.pull, p = this.player, f = this.figure, t = this.t;
      if (f) {
        const h = ERX.FigureSprite.hand(f.facing), hx = f.x + h.x - cam.ix, hy = f.y + h.y - cam.iy, px2 = p.cx - cam.ix, py = p.y + 10 - cam.iy;
        // the device in his hand
        c.fillStyle = '#120c1c'; c.fillRect(Math.round(hx) - 3, Math.round(hy) - 3, 7, 6);
        c.fillStyle = '#3a3a4a'; c.fillRect(Math.round(hx) - 2, Math.round(hy) - 2, 5, 4);
        c.fillStyle = Math.floor(t * 12) % 2 ? '#ff8ad8' : '#c89aff'; c.fillRect(Math.round(hx), Math.round(hy) - 1, 2, 2);
        // the beam: three wobbling strands and sparks
        for (let s = 0; s < 3; s++) {
          c.fillStyle = s === 1 ? '#ffffff' : s ? '#ff8ad8' : '#c89aff';
          for (let i = 0; i <= 30; i++) { const q = i / 30, w = Math.sin(q * 12 - t * 18 + s * 2) * 3 * Math.sin(q * Math.PI); c.fillRect(Math.round(U.lerp(hx, px2, q)), Math.round(U.lerp(hy, py, q) + w), 1, 1); }
        }
        c.globalAlpha = 0.25; c.fillStyle = '#c89aff'; c.fillRect(Math.round(px2) - 9, Math.round(py) - 14, 18, 26); c.globalAlpha = 1;
      }
      const cv = ERX.PlayerSide.frame(p.look, 'hurt', 0, p.facing);
      c.save();
      c.translate(Math.round(p.cx - cam.ix), Math.round(p.feet - 12 - cam.iy));
      c.rotate(Math.sin(t * 9) * 0.25 * (1 - Math.min(1, P.t / 1.3)));
      ERX.PlayerSide.draw(c, cv, 0, 12, p.facing);
      c.restore();
    }
    /** An item floats from the Voice's hand over your head, then into your pocket. */
    giveItem(id) {
      const ch = this.character, f = this.figure;
      ERX.Inventory.add(ch, id);
      ERX.Saves.update(ch);
      const h = f ? ERX.FigureSprite.hand(f.facing) : { x: 0, y: -24 };
      this.gift = { id, t: 0, from: f ? { x: f.x + h.x, y: f.y + h.y } : { x: this.player.cx, y: this.player.y - 24 } };
      const it = ERX.Items.get(id);
      this.banner = { title: 'YOU GOT THE ' + it.name + '!', sub: it.desc, t: 0, dur: 3.4 };
      sfx('itemGet');
    }
    _renderGift(c, cam) {
      const gf = this.gift, p = this.player, it = ERX.Items.get(gf.id);
      const to = { x: p.cx, y: p.y - 16 };
      let x, y, s = 1;
      if (gf.t < 0.7) { const k = gf.t / 0.7; x = U.lerp(gf.from.x, to.x, k); y = U.lerp(gf.from.y, to.y, k) - Math.sin(k * Math.PI) * 24; }
      else if (gf.t < 2.1) { x = to.x; y = to.y + Math.sin(gf.t * 4) * 2; }
      else if (gf.t < 2.4) { const k = (gf.t - 2.1) / 0.3; x = to.x; y = U.lerp(to.y, p.y + 10, k); s = 1 - k; }
      else { this.gift = null; return; }
      const sx = x - cam.ix, sy = y - cam.iy;
      const big = gf.t < 0.7 ? 1 + gf.t / 0.7 : 2;
      if (gf.t > 0.5) { const g2 = c.createRadialGradient(sx, sy, 1, sx, sy, 18); g2.addColorStop(0, 'rgba(224,200,255,0.55)'); g2.addColorStop(1, 'rgba(224,200,255,0)'); c.fillStyle = g2; c.fillRect(sx - 18, sy - 18, 36, 36); }
      if (gf.t > 0.7 && gf.t < 2.1) { c.fillStyle = '#ffffff'; for (let i = 0; i < 8; i++) { const a = gf.t * 3 + i * 0.785; c.fillRect(Math.round(sx + Math.cos(a) * 14), Math.round(sy + Math.sin(a) * 14), 1, 1); } }
      if (s > 0.05) it.draw(c, sx, sy, gf.t, s * big);
    }

    /** The grumpy slime falls out of the sky at x and parks itself in your way. */
    dropBlocker(x) {
      this.blocker = { x, y: this.camera.y - 40, vy: 0, landed: false, t: 0, angry: false };
    }
    _updateBlocker(dt) {
      const b = this.blocker, p = this.player;
      if (!b) return;
      b.t += dt;
      if (!b.landed) {
        b.vy += 900 * dt; b.y += b.vy * dt;
        if (b.y >= this.level.floorY) { b.y = this.level.floorY; b.landed = true; b.t = 0; this.dust(b.x, b.y, 14); }
        return;
      }
      if (p.x + p.w > b.x - 12) { p.x = b.x - 12 - p.w; if (p.vx > 0) p.vx = 0; }   // nobody gets past. nobody.
    }
    _renderBlocker(c, cam) {
      const b = this.blocker;
      if (!ERX.Slime) return;
      const frame = !b.landed ? 2 : b.t < 0.3 ? 1 : Math.floor(b.t * 1.5) % 2;
      const sl = ERX.Slime(b.angry ? '#e0504a' : '#8a90b0', frame), x = Math.round(b.x - cam.ix), y = Math.round(b.y - cam.iy);
      c.drawImage(sl, x - Math.round(sl.width / 2), y - sl.height + 2);
      // a hard hat. it's a construction site.
      const top = y - sl.height + 4;
      c.fillStyle = '#120c1c'; c.fillRect(x - 6, top - 4, 12, 4);
      c.fillStyle = '#ffd34d'; c.fillRect(x - 5, top - 4, 10, 3); c.fillRect(x - 7, top - 1, 14, 1);
      c.fillStyle = '#fff0a0'; c.fillRect(x - 3, top - 4, 3, 1);
    }

    /** The Checkshot: a stone pedestal with a void crystal floating over it (glowing once it's on). */
    _renderCheckshot(c, cam) {
      const cs = this.checkshot, x = Math.round(cs.x - cam.ix), y = Math.round(cs.y - cam.iy), t = this.t;
      if (x < -40 || x > this.view.width + 40) return;
      const R = (xx, yy, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(xx), Math.round(yy), w, h); };
      if (cs.on) {
        const g2 = c.createRadialGradient(x, y - 26, 2, x, y - 26, 40);
        g2.addColorStop(0, 'rgba(200,154,255,0.45)'); g2.addColorStop(1, 'rgba(200,154,255,0)');
        c.fillStyle = g2; c.fillRect(x - 40, y - 66, 80, 80);
        c.globalAlpha = 0.18 + 0.06 * Math.sin(t * 3); R(x - 3, y - 120, 6, 100, '#e0c8ff'); R(x - 1, y - 140, 2, 120, '#ffffff'); c.globalAlpha = 1;
      }
      R(x - 8, y - 6, 16, 6, '#120c1c'); R(x - 7, y - 6, 14, 5, '#7e7884'); R(x - 7, y - 6, 14, 1, '#a8a0a8');
      R(x - 5, y - 13, 10, 7, '#120c1c'); R(x - 4, y - 13, 8, 7, '#6a6474'); R(x - 4, y - 13, 8, 1, '#8e8894');
      R(x - 2, y - 11, 1, 3, cs.on ? '#e0c8ff' : '#4a4458'); R(x + 1, y - 11, 1, 3, cs.on ? '#e0c8ff' : '#4a4458');
      // the crystal, turning slowly as it floats
      const fy = y - 28 + Math.sin(t * 2) * 2, w = Math.max(1, Math.round(Math.abs(Math.cos(t * 1.4)) * 4) + 1);
      for (let yy = -7; yy <= 7; yy++) {
        const hw = Math.round(w * (1 - Math.abs(yy) / 8));
        for (let xx = -hw; xx <= hw; xx++) R(x + xx, fy + yy, 1, 1, cs.on ? (xx < 0 ? '#e0c8ff' : xx === 0 ? '#ffffff' : '#b87aff') : (xx < 0 ? '#6a5a8a' : '#4a3e66'));
      }
      if (cs.on) for (let i = 0; i < 5; i++) { const a = t * 2.4 + i * 1.257; R(x + Math.cos(a) * 10, fy + Math.sin(a) * 4, 1, 1, i % 2 ? '#ffffff' : '#c89aff'); }
      if (cs.onT > 0 && cs.onT < 0.8) { c.globalAlpha = 1 - cs.onT / 0.8; c.strokeStyle = '#e0c8ff'; c.lineWidth = 1; c.beginPath(); c.ellipse(x + 0.5, fy + 0.5, 6 + cs.onT * 60, 3 + cs.onT * 30, 0, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; }
    }
    activateCheckshot() {
      const cs = this.checkshot;
      cs.on = true; cs.onT = 0.001;
      sfx(this.element() && this.element().id === 'chaos' ? 'checkshotChaos' : 'checkshotOn');
      this.flashT = Math.max(this.flashT || 0, 0.15);
      this.checkpoint = { x: cs.x, y: cs.y };
      this.floats.push({ x: cs.x, y: cs.y - 44, text: 'CHECKSHOT REACHED', color: '#e0c8ff', t: 0, dur: 2.4, rise: 8 });
      for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, sp = U.lerp(30, 110, Math.random()); this.fx.add({ x: cs.x, y: cs.y - 28, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: U.lerp(0.5, 1, Math.random()), color: Math.random() < 0.6 ? '#c89aff' : '#ffffff', size: 1, fadeOut: 0.4 }); }
      this.saveFlag('checkshot1');
    }
    /** The VRD: you dissolve into the void's colours, and you're home. */
    startRecall() {
      this.state = 'recall';
      this.recall = { t: 0 };
      this.player.controls = false;
      sfx('recallOut');
    }
    _updateRecall(dt) {
      const r = this.recall, p = this.player;
      r.t += dt;
      if (Math.random() < dt * 40) { const a = Math.random() * Math.PI * 2, d = U.lerp(20, 40, Math.random()); this.fx.add({ x: p.cx + Math.cos(a) * d, y: p.y + 10 + Math.sin(a) * d, vx: -Math.cos(a) * d * 2, vy: -Math.sin(a) * d * 2, life: 0.5, color: Math.random() < 0.5 ? '#c89aff' : '#ffffff', size: 1, fadeOut: 0.2 }); }
      if (r.t > 1.15 && !r.done) { r.done = true; this.flashT = 0.6; this.travel('void', { at: 'jump' }); }
    }
    _renderRecall(c, cam) {
      const r = this.recall, p = this.player, k = Math.min(1, r.t / 1.15);
      if (k < 0.92) this.player.render(c, cam);
      const x = Math.round(p.cx - cam.ix), y = Math.round(p.y - cam.iy);
      c.globalAlpha = 0.25 + k * 0.6; c.fillStyle = '#c89aff'; c.fillRect(x - Math.round(6 + k * 3), y - 4 - Math.round(k * 40), Math.round(12 + k * 6), Math.round(p.h + 6 + k * 40));
      c.globalAlpha = k; c.fillStyle = '#ffffff'; c.fillRect(x - 1, y - 6 - Math.round(k * 60), 2, Math.round(p.h + 10 + k * 60)); c.globalAlpha = 1;
    }

    /** Where a world hangs on screen (view coords). World 1 sits above the jump point; they drift a bit slower than the ground (depth). */
    _skyPos(w) {
      const cam = this.camera, vw = this.view.width, vh = this.view.height, L = this.level;
      const camCx = cam.ix + vw / 2, ay = L.floorY - 120 - vh / 2;
      return { x: Math.round(vw / 2 + w.dx * vw + (L.jumpX - camCx) * 0.85), y: Math.round(w.fy * vh - (cam.iy - ay) * 0.15) };
    }

    _updateVoid(dt) {
      const p = this.player;
      if (this.float) {
        const fl = this.float;
        fl.t += dt;
        p.placeAt(fl.x, fl.y + Math.round(Math.sin(fl.t * 1.6) * 3));
        if (Math.floor(fl.t / 1.1) !== Math.floor((fl.t - dt) / 1.1)) this.floats.push({ x: p.cx + 6, y: p.y - 4, text: 'z', color: '#8a90c0', t: 0, dur: 1.4, rise: 10 });
      }
      const f = this.figure;
      if (f && !f.gone) {
        f.t += dt;
        f.hop = Math.max(0, f.hop - dt * 2.5);
        f.shakeT = Math.max(0, f.shakeT - dt);
        if (f.walkTo !== null) {
          const dir = Math.sign(f.walkTo - f.x);
          if (dir) f.facing = dir;
          f.pose = 'walk';
          const sp = f.walkSpeed || 60;
          f.x = Math.abs(f.walkTo - f.x) <= sp * dt ? f.walkTo : f.x + dir * sp * dt;
          if (Math.abs(f.walkTo - f.x) < 2) {
            if (f.walkStay) { f.walkTo = null; f.pose = 'idle'; }
            else {
              f.gone = true;
              sfx('doorOpen');
              if (this.hqDoor) this.hqDoor.openT = 0.9;
            }
          }
        }
      }
      if (this.hqDoor) { this.hqDoor.t = Math.min(1, this.hqDoor.t + dt * 2.5); this.hqDoor.openT = Math.max(0, this.hqDoor.openT - dt); }
      if (this.worlds) {
        const W = this.worlds;
        W.t += dt;
        for (const sh of W.shards) { sh.t -= dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.vy += 120 * dt; }
        W.shards = W.shards.filter((sh) => sh.t > 0);
      }
      const k = this.energyKey;
      if (k && !k.done) {
        k.t += dt;
        if (k.phase === 'charge' && f) {
          // pure energy, gathering in his hand
          const h = ERX.FigureSprite.hand(f.facing);
          if (Math.random() < dt * 40) {
            const a = Math.random() * Math.PI * 2, d = U.lerp(14, 26, Math.random());
            this.fx.add({ x: f.x + h.x + Math.cos(a) * d, y: f.y + h.y + Math.sin(a) * d, vx: -Math.cos(a) * d * 2.5, vy: -Math.sin(a) * d * 2.5, life: 0.4, color: Math.random() < 0.5 ? '#7af0ff' : '#ffffff', size: 1, fadeOut: 0.2 });
          }
        } else if (k.phase === 'fly') {
          const e = Math.min(1, k.t / 0.8);
          const x = U.lerp(k.from.x, k.to.x, e), y = U.lerp(k.from.y, k.to.y, e) - Math.sin(e * Math.PI) * 30;
          this.fx.add({ x, y, vx: U.lerp(-10, 10, Math.random()), vy: U.lerp(-10, 10, Math.random()), life: 0.35, color: Math.random() < 0.5 ? '#7af0ff' : '#ffffff', size: 1, fadeOut: 0.2 });
          if (e >= 1) {
            // the lock shatters
            k.done = true;
            this.worlds.unlocked[0] = true;
            const pos = this._skyPos(this.worlds.list[0]);
            for (let i = 0; i < 26; i++) {
              const a = Math.random() * Math.PI * 2, sp = U.lerp(30, 120, Math.random());
              this.worlds.shards.push({ x: pos.x, y: pos.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, t: U.lerp(0.5, 1.2, Math.random()), c: Math.random() < 0.6 ? '#ffd34d' : '#ffffff' });
            }
            this.flashT = 0.35;
            sfx('lockBreak');
            this.shake(3, 0.35);
          }
        }
      }
      if (this.launch && !this.launch.hold) this.launch.t += dt;
      // the invisible floor ripples where you step
      for (const r of this.ripples) r.t += dt;
      this.ripples = this.ripples.filter((r) => r.t < 0.7);
      if (this.state === 'play') {
        if (p.onGround && !this._wasGround) { this.ripple(p.cx, p.feet, true); sfx('voidStep', { minGap: 0.05 }); }
        if (p.onGround && Math.abs(p.vx) > 20) {
          this._stepT = (this._stepT || 0) - dt;
          if (this._stepT <= 0) { this._stepT = 0.3; this.ripple(p.cx, p.feet, false); sfx('voidStep', { minGap: 0.1 }); }
        }
        this._wasGround = p.onGround;
      }
    }

    _updateAwaken(dt) {
      if (this.neb) {
        const n = this.neb;
        n.t += dt;
        if (n.fading) n.black = Math.min(1, n.black + dt / 3);
        if (!n.lying && Math.random() < dt * 40) {
          const a = Math.random() * Math.PI * 2;
          this.fx.add({ x: Math.cos(a) * 40, y: Math.sin(a) * 40, vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 60, life: 0.6, color: ORB_LIGHTS[Math.floor(Math.random() * 6)], size: Math.random() < 0.3 ? 2 : 1, fadeOut: 0.3 });
        }
      }
      if (this.rev) {
        const r = this.rev;
        r.t += dt;
        for (const k of ['you', 'got', 'roll', 'elem', 'rarity']) if (r[k] !== null) r[k] += dt;
        for (const s of r.sparks) { s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 1 - dt * 1.5; s.vy = s.vy * (1 - dt * 1.5) + 40 * dt; }
        r.sparks = r.sparks.filter((s) => s.t > 0);
        if (r.slime) {
          const s = r.slime;
          s.t += dt;
          if (!s.landed) { s.vy += 900 * dt; s.y += s.vy * dt; if (s.y >= 0) { s.y = 0; s.landed = true; s.t = 0; } }
        }
      }
    }

    /** Skipping the tutorial (you've beaten it before): straight to the Deep Ends elevator. */
    skipToElevator() {
      if (this.transitioning) return;
      this.transitioning = true;
      this.player.controls = false;
      sfx('pop');
      this.flashT = 0.4;
      this.saveProgress('reachedEnd');
      ERX.Scenes.transition('dissolve', 1.4, () => this.loadLevel('deep', { at: 'elevator' }));
    }

    goDeeper() {
      if (this.transitioning) return;
      this.transitioning = true;
      this.player.controls = false;
      ERX.Scenes.transition('dissolve', 1.4, () => this.loadLevel('deep', { at: 'start' }));
    }

    // ------------------------------------------------------------ update
    _resize(force) {
      const W = ERX.Display.width, H = ERX.Display.height;
      const vw = Math.ceil(W / this.zoom), vh = Math.ceil(H / this.zoom);
      if (force || !this.view || this.view.width !== vw || this.view.height !== vh) {
        this.view = ERX.makeCanvas(vw, vh);
        this.vctx = this.view.getContext('2d');
        this.camera.setView(vw, vh);
      }
    }

    /** An impact frame: a blink of inverted black-and-white, and a short freeze. */
    impact(d) { this.impactT = Math.max(this.impactT || 0, d); this.hitStop = Math.max(this.hitStop || 0, d); }

    update(dt, input, active) {
      if (!active) return;
      this.t += dt;
      this._resize(false);

      if (input.hasAction('back')) {
        input.consumeAction('back');
        ERX.Audio.playSfx('select');
        ERX.Scenes.push('pause', { game: this });
        return;
      }
      // an ultimate's cutscene: the world holds its breath
      if (this.cine) {
        this.cine.update(dt);
        for (const f of this.floats) { f.t += dt; f.y -= (f.rise || 20) * dt; }
        this.floats = this.floats.filter((f) => f.t < (f.dur || 0.9));
        this.flashT = Math.max(0, (this.flashT || 0) - dt);
        return;
      }
      // a freeze-frame after a heavy hit (awakened moves)
      this.impactT = Math.max(0, (this.impactT || 0) - dt);
      if (this.hitStop > 0) { this.hitStop -= dt; return; }
      if (this.state === 'play' && this.player.controls) {
        if (K.wasPressed('skills')) { ERX.Scenes.push('skills', { game: this }); return; }
        if (K.wasPressed('inventory')) { ERX.Scenes.push('inventory', { game: this }); return; }
      }
      if (K.wasPressed('zoomIn') && this.zoom < 2) { this.zoom = 2; sfx('tick', { value: 80 }); }
      if (K.wasPressed('zoomOut') && this.zoom > 1) { this.zoom = 1; sfx('tick', { value: 30 }); }

      if (this.state === 'intro' || this.state === 'waking') this._updateWake(dt, input);
      if (this.state === 'bounce') {
        this.bounceT += dt;
        this.lids = Math.min(1, this.lids + dt * 3);
        if (this.player.onGround && this.bounceT > 0.3) {
          this.state = 'play';
          this.player.controls = true;
          this.banner = { title: 'A RANDOM CAVE', sub: 'Location: unknown. Vibes: damp.', t: 0, dur: 3.5 };
          ERX.Audio.playMusic('cave');
        }
      }
      if (this.state === 'dead') this._updateDead(dt);

      if (this.script) { this.script.update(dt); if (this.script && this.script.done) this.script = null; }
      this.dialogue.update(dt, input);

      if (this.state === 'elevator') {
        this._updateElevator(dt);
      } else if (this.state === 'nebula' || this.state === 'reveal') {
        this._updateAwaken(dt);
      } else if (this.state === 'black') {
        // nothing. absolutely nothing.
      } else {
        if (this.state !== 'float' && this.state !== 'launch' && this.state !== 'skyfall' && this.state !== 'pull' && this.state !== 'recall') this.player.update(dt);
        for (const g of Object.values(this.gates)) g.update(dt);
        if (this.dummy) this.dummy.update(dt);
        for (const e of this.enemies) e.update(dt);
        this.enemies = this.enemies.filter((e) => !e.dead);
        for (const b of this.bolts) b.update(dt, this);
        this.bolts = this.bolts.filter((b) => !b.dead);
        this._updateNpcs(dt);
        if (this.orb) this.orb.update(dt);
        for (const s of this.shockwaves) s.update(dt);
        this.shockwaves = this.shockwaves.filter((s) => !s.done);
        if (this.levelId === 'void') this._updateVoid(dt);
        if (this.level.update) this.level.update(dt, this);
        if (this.fall) this.fall.update(dt);
        if (this.pull) this._updatePull(dt);
        if (this.recall) this._updateRecall(dt);
        if (this.checkshot && this.checkshot.onT > 0) this.checkshot.onT += dt;
        if (this.gift) this.gift.t += dt;
        this._updateBlocker(dt);
        for (const fx of this.effects) fx.update(dt);
        this.effects = this.effects.filter((fx) => !fx.dead);
      }
      this.fx.update(dt);
      this.confetti.update(dt);
      for (const f of this.floats) { f.t += dt; f.y -= (f.rise || 20) * dt; }
      this.floats = this.floats.filter((f) => f.t < (f.dur || 0.9));
      if (this.objective) {
        this.objective.t += dt;
        if (this.objective.doneT > 0) { this.objective.doneT += dt; if (this.objective.doneT > 1.2) this.objective = null; }
      }
      if (this.barkMsg) { this.barkMsg.t += dt; if (this.barkMsg.t > this.barkMsg.dur) this.barkMsg = null; }
      if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
      this.flashT = Math.max(0, (this.flashT || 0) - dt);
      this.hpShown = U.approach(this.hpShown || this.player.hp, this.player.hp, 6, dt);
      if (this.player.hurtT <= 0 && this.player.invulnT <= 0 && this.state === 'play') this.player.hp = Math.min(this.player.maxHp, this.player.hp + dt * 2);

      if (this.rumbleT > 0) {
        this.rumbleT -= dt;
        const k = 1 - Math.max(0, this.rumbleT) / 4.2;
        ERX.FX.shake(1 + k * 3, 0.1);
        if (Math.random() < dt * (10 + k * 30)) {
          this.fx.add({ x: this.camera.x + Math.random() * this.camera.vw, y: this.level.TS * 4, vx: 0, vy: U.lerp(40, 120, Math.random()), ay: 400, life: 1.4, color: Math.random() < 0.5 ? '#6a6080' : '#8a7e9c', size: Math.random() < 0.3 ? 2 : 1 });
        }
      }

      this._triggers();
      if (this.state !== 'intro') this.hudAlpha = Math.min(1, this.hudAlpha + dt * (this.state === 'play' || this.state === 'dead' ? 2 : 0));
      if (this.state !== 'elevator' && this.state !== 'nebula' && this.state !== 'reveal' && this.state !== 'black' && this.state !== 'skyfall') this.camera.update(dt, this.player, this.level);
      const target = this.state === 'intro' || this.state === 'waking' ? 0.06 : this.level.darknessAt(this.player.cx, this.arenaLit);
      this.darkness = U.approach(this.darkness, target, this.flashT > 0 ? 12 : 1.4, dt);
    }

    _updateWake(dt, input) {
      this.wakeT += dt;
      if (this.state === 'intro') {
        if (this.wakeT > 2.2) { this.state = 'waking'; this.wakeT = 0; }
        return;
      }
      const pressed = K.wasPressed('jump') || input.hasAction('confirm') || K.wasPressed('attack') || input.mouse.pressed[0];
      if (pressed) {
        this.wake = Math.min(1, this.wake + 0.1);
        sfx('wakePress', { value: this.wake });
        if (Math.random() < 0.5) this.fx.add({ x: this.player.cx + 6, y: this.player.y + 8, vx: U.lerp(5, 15, Math.random()), vy: -18, life: 1.2, color: '#ffffff', size: 1, fadeOut: 0.5 });
      }
      // (check before the decay, otherwise a full meter drains before it counts)
      if (this.wake < 1) this.wake = Math.max(0, this.wake - dt * 0.11);
      this.thought = Math.min(WAKE_THOUGHTS.length - 1, Math.floor(this.wake * WAKE_THOUGHTS.length));
      this.lids = U.approach(this.lids, this.wake * 0.55 + Math.sin(this.wakeT * 1.3) * 0.03, 8, dt);
      if (this.wake >= 1) {
        this.state = 'bounce';
        this.bounceT = 0;
        this.player.lying = false;
        this.player.vy = -310;
        this.player.y -= 6;
        sfx('wakeUp');
        this.shake(2, 0.25);
        this.dust(this.player.cx, this.player.feet, 8);
      }
    }

    _updateDead(dt) {
      this.deadT += dt;
      if (this.deadT > 1.8 && !this.reviving) {
        this.reviving = true;
        ERX.Scenes.transition('fade', 0.9, () => {
          const p = this.player;
          p.lying = false;
          p.placeAt(this.checkpoint.x, this.checkpoint.y);
          p.hp = p.maxHp;
          p.invulnT = 2;
          p.controls = !this.script;
          this.state = 'play';
          this.reviving = false;
          sfx('revive');
          ERX.Toast.show(REVIVE_LINES[(this.deaths - 1) % REVIVE_LINES.length], { color: '#a8f0ff' });
          this.camera.snap(p.cx, p.y, this.level);
        }, { silent: true });
      }
    }

    _updateNpcs(dt) {
      const p = this.player;
      for (const n of this.npcs) {
        n.t += dt;
        const near = Math.abs(n.x - p.cx) < 40;
        if (n.pose === 'mine' && !n.talking && !near) {
          // swing the pickaxe at the wall
          const ph = n.t % 1.1;
          const strike = ph > 0.55 && ph < 0.6;
          if (strike && !n.struck) {
            n.struck = true;
            if (Math.abs(n.x - p.cx) < 260) sfx('anvil', { volume: 0.02, minGap: 0.2 });
            this.sparks(n.x + n.facing * 12, n.y - 14, 3, n.facing);
          } else if (!strike) n.struck = false;
        }
        if (near || n.talking) n.facingNow = p.cx < n.x ? -1 : 1;
        else n.facingNow = n.facing;
      }
    }

    _updateElevator(dt) {
      const e = this.elev;
      e.t += dt;
      e.speed = U.approach(e.speed, e.target, 1.2, dt);
      e.y += e.speed * dt;
      e.jolt = Math.max(0, e.jolt - dt * 2);
      e.flicker = Math.max(0, e.flicker - dt);
      if (e.speed > 5 && Math.floor(e.t * 2) !== Math.floor((e.t - dt) * 2)) sfx('elevatorHum', { minGap: 0.3 });
      if (e.slime && !e.slime.landed) {
        e.slime.vy += 900 * dt;
        e.slime.y += e.slime.vy * dt;
        if (e.slime.y >= 0) { e.slime.y = 0; e.slime.landed = true; e.roofBroken = true; }
      }
      if (e.slime) e.slime.t += dt;
    }

    _triggers() {
      const p = this.player;
      if (this.state !== 'play') { this.prompt = null; return; }
      // death
      if (this.allowDeath && p.hp <= 0) {
        this.state = 'dead';
        this.deadT = 0;
        this.deaths++;
        p.lying = true;
        p.controls = false;
        sfx('hurt');
        ERX.FX.shake(3, 0.3);
        return;
      }
      // fell out of the world
      if (p.feet > this.level.ph - 4) {
        p.hp = Math.max(1, p.hp - 15);
        p.placeAt(this.checkpoint.x, this.checkpoint.y);
        sfx('hurt');
        ERX.Toast.show('The Immortality Stone fished you out of the abyss. It wants a raise.', { color: '#a8f0ff' });
      }
      // checkpoints (Deep Ends)
      if (this.levelId === 'deep') {
        for (const c of this.level.checkpoints) if (p.cx >= c.x && c.x > this.checkpoint.x - 1 && p.onGround) this.checkpoint = { x: c.x, y: c.y };
      }

      if (this.levelId === 'cave') {
        const L = this.level;
        if (this.stageName === 'cave' && p.cx > L.arena.triggerX) {
          this.stageName = 'arena';
          this.objective = null;
          this.runScript(ERX.Story.cave.arenaIntro);
        }
        if (p.cx > L.gauntlet.x0 && p.onGround && this.checkpoint.x < L.gauntlet.x0) this.checkpoint = { x: L.gauntlet.spawn.x, y: L.gauntlet.spawn.y };
        const gauntletLeft = this.enemies.filter((e) => e.zone === 'gauntlet').length;
        if (!this.script && this.stage() === 'tutorialDone' && p.cx > L.gauntlet.x0 && gauntletLeft === 0) {
          this.objective = null;
          this.runScript(ERX.Story.deep.voiceApplause);
        }
        if (this.stage() === 'tutorialDone' && p.cx > L.gauntlet.x0 && gauntletLeft > 0 && !this.objective && !this.script) {
          this.setObjective('DEFEAT THE MONSTERS', () => 6 - this.enemies.filter((e) => e.zone === 'gauntlet').length, 6);
        }
        if (p.cx > L.transitionX && stageIndex(this.stage()) >= 2) this.goDeeper();
      }

      // the void: someone is standing out there...
      const f = this.figure;
      if (this.levelId === 'void' && f && !f.met && !this.script && p.cx > f.x - 120) {
        f.met = true;
        this.runScript(ERX.Story.void.meetFigure);
      }

      // interact prompts: signs, people, doors, the elevator
      this.prompt = null;
      if (this.script || !p.controls) return;
      for (const s of this.level.signs) {
        if (Math.abs(s.x - p.cx) < 14 && Math.abs(s.y - p.feet) < 20) {
          this.prompt = { x: s.x, y: s.y - 22, text: '{use} READ' };
          if (K.wasPressed('use')) { s.read = true; this.runScript((g) => ERX.Story.cave.readSign(g, s.text)); }
          return;
        }
      }
      for (const n of this.npcs) {
        if (Math.abs(n.x - p.cx) < 18 && Math.abs(n.y - p.feet) < 24) {
          this.prompt = { x: n.x, y: n.y - 34, text: '{use} TALK' };
          if (K.wasPressed('use')) this.runScript((g) => ERX.Story.deep.talk(g, n));
          return;
        }
      }
      if (this.levelId === 'world1') {
        const cs = this.checkshot;
        if (cs && Math.abs(p.cx - cs.x) < 16 && p.onGround) {
          this.prompt = { x: cs.x, y: cs.y - 46, text: cs.on ? '{use} RECALL TO THE VOID (VRD)' : '{use} ACTIVATE THE CHECKSHOT' };
          if (K.wasPressed('use')) this.runScript(ERX.Story.world.checkshot);
          return;
        }
        const bl = this.blocker;
        if (bl && bl.landed && Math.abs(p.cx - bl.x) < 34) {
          this.prompt = { x: bl.x, y: bl.y - 34, text: '{use} TALK' };
          if (K.wasPressed('use')) this.runScript(ERX.Story.world.slimeTalk);
          return;
        }
      }
      if (this.levelId === 'void' && this.worlds && this.worlds.unlocked[0]) {
        const L = this.level;
        if (Math.abs(p.cx - L.jumpX) < 16 && p.onGround) {
          this.prompt = { x: L.jumpX, y: L.floorY - 40, text: '{use} JUMP INTO WORLD 1' };
          if (K.wasPressed('use')) this.runScript(ERX.Story.world.jump);
          return;
        }
        const d = this.hqDoor;
        if (d && d.t >= 1 && Math.abs(p.cx - d.x) < 14) {
          this.prompt = { x: d.x, y: d.y - 52, text: '{use} ENTER THE HQ' };
          if (K.wasPressed('use')) { sfx('doorOpen'); d.openT = 0.9; p.controls = false; this.travel('hq'); }
          return;
        }
      }
      if (this.levelId === 'hq' && Math.abs(p.cx - this.level.trainingDoor.x) < 14) {
        this.prompt = { x: this.level.trainingDoor.x, y: this.level.floorY - 64, text: '{use} TRAINING ROOM' };
        if (K.wasPressed('use')) { sfx('doorOpen'); p.controls = false; this.travel('training'); }
        return;
      }
      if (this.levelId === 'training' && Math.abs(p.cx - this.level.exit.x) < 14) {
        this.prompt = { x: this.level.exit.x, y: this.level.floorY - 64, text: '{use} BACK TO THE HQ' };
        if (K.wasPressed('use')) { sfx('doorOpen'); p.controls = false; this.travel('hq', { at: 'training' }); }
        return;
      }
      if (this.levelId === 'hq' && Math.abs(p.cx - this.level.exit.x) < 14) {
        this.prompt = { x: this.level.exit.x, y: this.level.floorY - 64, text: '{use} BACK TO THE VOID' };
        if (K.wasPressed('use')) { sfx('doorOpen'); p.controls = false; this.travel('void', { at: 'door' }); }
        return;
      }
      const E = this.level.elevator;
      if (E && this.levelId === 'deep' && p.cx > E.x0 && p.cx < E.x1 && Math.abs(p.feet - E.floorY) < 4) {
        this.prompt = { x: E.x, y: E.floorY - 50, text: '{use} RIDE THE ELEVATOR' };
        if (K.wasPressed('use')) {
          p.placeAt(E.x, E.floorY);
          p.facing = 1;
          this.runScript(ERX.Story.deep.elevatorRide);
        }
        return;
      }
      const o = this.orb;
      if (o && o.state === 'sealed' && !this.awakened() && Math.abs(o.x - p.cx) < 30 && Math.abs(o.floorY - p.feet) < 20) {
        this.prompt = { x: o.x, y: o.floorY - 56, text: '{use} TOUCH THE ORB' };
        if (K.wasPressed('use')) this.runScript(ERX.Story.vault.touchOrb);
      }
    }

    /** Called by the end panel's "stay" button after the elevator. */
    leaveElevator() {
      this.state = 'play';
      this.elev = null;
      const E = this.level.elevator;
      this.player.placeAt(E.x0 - 30, E.floorY);
      this.player.controls = true;
      ERX.Audio.playMusic('deepends');
      this.camera.snap(this.player.cx, this.player.y, this.level);
    }

    // ------------------------------------------------------------ render
    _lights() {
      const t = this.t;
      const out = [];
      for (const l of this.level.lights) {
        if (l.ref && l.ref.lit === false) continue;
        let r = l.r, inten = 1;
        if (l.flicker) r *= 0.94 + 0.06 * Math.sin(t * 9 + (l.ref ? l.ref.phase : 0)) + 0.03 * Math.sin(t * 23);
        if (l.pulse) inten = 0.75 + 0.25 * Math.sin(t * 1.5 + (l.ref ? l.ref.phase || 0 : 0));
        out.push({ x: l.x, y: l.y, r, color: l.color, intensity: inten });
      }
      out.push({ x: this.player.cx, y: this.player.y + 10, r: 34, color: null, intensity: 1 });
      if (this.level.liveLights) for (const l of this.level.liveLights(this)) out.push(l);
      if (this.checkshot) out.push({ x: this.checkshot.x, y: this.checkshot.y - 26, r: this.checkshot.on ? 64 : 26, color: '#c89aff', intensity: 1 });
      const o = this.orb;
      if (o && o.state !== 'gone') out.push({ x: o.x, y: o.y, r: 96, color: ORB_LIGHTS[Math.floor(t * 3) % 6], intensity: 0.9 + 0.1 * Math.sin(t * 5) });
      if (o) out.push({ x: o.baseX, y: o.floorY - 20, r: 40, color: null, intensity: 1 });
      return out;
    }

    render(ctx) {
      const W = ERX.Display.width, H = ERX.Display.height;
      if (this.state === 'elevator') {
        this._renderElevator(ctx, W, H);
        ERX.HUD.render(ctx, W, H, this);
        this.dialogue.render(ctx, W, H);
        return;
      }
      if (this.state === 'nebula') { this._renderNebula(ctx, W, H); this.dialogue.render(ctx, W, H); return; }
      if (this.state === 'reveal') { this._renderReveal(ctx, W, H); this.dialogue.render(ctx, W, H); return; }
      if (this.state === 'black') { ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H); this.dialogue.render(ctx, W, H); return; }
      const c = this.vctx, cam = this.camera;
      const vw = this.view.width, vh = this.view.height;
      c.imageSmoothingEnabled = false;
      c.fillStyle = { deep: '#0e1028', void: '#05040f', hq: '#120c1a' }[this.levelId] || '#0c0912';
      c.fillRect(0, 0, vw, vh);
      if (this.level.drawSky) this.level.drawSky(c, cam, vw, vh, this);
      if (this.backWall) c.drawImage(this.backWall, -cam.ix, -cam.iy);
      else if (!this.level.drawSky) ERX.Paint.drawTiled(c, this.bgCanvas, cam.x * (this.levelId === 'void' ? 0.2 : 0.5), -cam.iy, vw);
      if (this.worlds) this._renderSky(c, cam);
      c.drawImage(this.tilesCanvas, -cam.ix, -cam.iy);
      c.drawImage(this.decorCanvas, -cam.ix, -cam.iy);
      for (const ch of this.level.chalk) {
        const sx = ch.x - cam.ix, sy = ch.y - cam.iy;
        if (sx < -220 || sx > vw + 10) continue;
        F.draw(c, ERX.keyText(ch.text), sx, sy, { color: '#d8d4e8', alpha: 0.55 });
      }
      for (const tch of this.level.torches) {
        const fx = Math.round(tch.x) - cam.ix, fy = Math.round(tch.y) + 1 - cam.iy;
        if (fx < -20 || fx > vw + 20) continue;
        drawFlame(c, fx, tch.lantern ? fy + 4 : fy, this.t + tch.phase, tch.lantern ? 0.6 : 1);
      }
      for (const b of this.level.braziers) if (b.lit) drawFlame(c, Math.round(b.x) - cam.ix, Math.round(b.y) - 16 - cam.iy, this.t + b.phase, 2.2);
      for (const g of Object.values(this.gates)) g.render(c, cam);
      if (this.level.elevator) this._drawElevatorCage(c, cam);
      if (this.orb) this.orb.render(c, cam);
      for (const n of this.npcs) this._drawNpc(c, cam, n);
      if (this.levelId === 'void') this._renderVoidThings(c, cam);
      if (this.level.drawLive) this.level.drawLive(c, cam, this);
      if (this.checkshot) this._renderCheckshot(c, cam);
      if (this.blocker) this._renderBlocker(c, cam);
      for (const fx of this.effects) if (BACK_FX[fx.kind]) fx.render(c, cam);
      if (this.dummy) this.dummy.render(c, cam);
      for (const e of this.enemies) e.render(c, cam);
      for (const b of this.bolts) b.render(c, cam);
      if (this.state === 'launch') this._renderLaunch(c, cam);
      else if (this.state === 'skyfall' && this.fall) this.fall.renderWorld(c, cam);
      else if (this.state === 'pull' && this.pull) this._renderPull(c, cam);
      else if (this.state === 'recall' && this.recall) this._renderRecall(c, cam);
      else this.player.render(c, cam);
      if (this.gift) this._renderGift(c, cam);
      // awakened moves go on the glow layer (js/game/abilities.js, Glow); everything else straight onto the view
      // (un-awakened element moves go on the lighter bold layer: Bold, same file)
      const Glow = ERX.Abilities.Glow, Bright = ERX.Abilities.Bright, Bold = ERX.Abilities.Bold;
      let glow = null, glowCol = null, bright = null, brightCol = null, bold = null;
      for (const fx of this.effects) {
        if (BACK_FX[fx.kind] || fx.layer === 'screen') continue;
        if (Glow.wants(fx)) { if (!glow) { glow = Glow.begin(vw, vh); glowCol = fx.pal && fx.pal.c; } fx.render(glow, cam); }
        else if (Bright.wants(fx)) { if (!bright) { bright = Bright.begin(vw, vh); brightCol = fx.pal && fx.pal.c; } fx.render(bright, cam); }
        else if (Bold.wants(fx)) { if (!bold) bold = Bold.begin(vw, vh); fx.render(bold, cam); }
        else fx.render(c, cam);
      }
      if (bold) Bold.end(c);
      if (bright) Bright.end(c, brightCol || '#ffffff');
      if (glow) Glow.end(c, glowCol || '#ffffff');
      for (const fx of this.effects) if (fx.layer === 'screen') { if (fx.kind === 'custom') fx.render(c, cam); else ERX.Abilities.renderScreen(c, fx, vw, vh); }
      if (this.frontLayer) c.drawImage(this.frontLayer, -cam.ix, -cam.iy);
      if (this.levelId === 'void') this._renderVoidFx(c, cam);
      for (const s of this.shockwaves) s.render(c, cam);
      this.fx.render(c, -cam.ix, -cam.iy);
      this.confetti.render(c, -cam.ix, -cam.iy);
      for (const f of this.floats) F.draw(c, f.text, f.x - cam.ix, f.y - cam.iy, { color: f.color, outline: T.ink, align: 'center', alpha: f.dur ? U.clamp((f.dur - f.t) / 0.6, 0, 1) : 1 - f.t / 0.9 });
      this.lighting.render(c, cam, vw, vh, this.darkness, this._lights());
      ERX.ChaosWorld.render(c, this, vw, vh);
      if (this.flashT > 0) { c.fillStyle = 'rgba(255,255,255,' + Math.min(0.85, this.flashT * 2.5).toFixed(3) + ')'; c.fillRect(0, 0, vw, vh); }
      if (this.impactT > 0) {
        // impact frame: the whole screen in stark inverted black and white, for a blink
        c.save(); c.globalCompositeOperation = 'saturation'; c.fillStyle = '#808080'; c.fillRect(0, 0, vw, vh);
        c.globalCompositeOperation = 'difference'; c.fillStyle = '#ffffff'; c.fillRect(0, 0, vw, vh); c.restore();
      }
      if (this.fall) this.fall.renderOverlay(c, vw, vh);
      if (this.state === 'dead') {
        c.fillStyle = 'rgba(40,0,10,' + Math.min(0.5, this.deadT * 0.4).toFixed(3) + ')';
        c.fillRect(0, 0, vw, vh);
      }
      if (this.cine) {
        // zoomed in on you (the ultimate cutscene)
        this.cine.drawWorld(c, cam);
        const z = this.cine.zoom(), sw = vw / z, sh = vh / z;
        const px = this.player.cx - cam.ix, py = this.player.y + 6 - (this.player.cineLift || 0) - cam.iy;
        const sx = U.clamp(px - sw / 2, 0, vw - sw), sy = U.clamp(py - sh / 2, 0, vh - sh);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.view, sx, sy, sw, sh, 0, 0, vw * this.zoom, vh * this.zoom);
        this.cine.drawScreen(ctx, W, H);
        return;
      }
      // an Ultimate can take over the camera (Planetfall...): zoom in on a point, letterbox bars
      const uc = this.ultCam && this.t - this.ultCam.t < 0.25 ? this.ultCam : null;
      if (uc && (uc.zoom || 1) > 1.001) {
        const z = uc.zoom, sw = vw / z, sh = vh / z;
        const sx = U.clamp(uc.x - cam.ix - sw / 2, 0, vw - sw), sy = U.clamp(uc.y - cam.iy - sh / 2, 0, vh - sh);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.view, sx, sy, sw, sh, 0, 0, vw * this.zoom, vh * this.zoom);
      } else ctx.drawImage(this.view, 0, 0, vw * this.zoom, vh * this.zoom);
      if (uc && uc.bars > 0) { const bh = Math.round(uc.bars * H * 0.11); ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh); }

      this._drawWake(ctx, W, H);
      if (this.state === 'dead' && this.deadT > 0.4) {
        F.draw(ctx, 'YOU DIED', W / 2, Math.round(H * 0.4), { scale: 2, color: '#ff6a4f', outline: T.ink, shadow: '#3a0008', shadowOffset: 2, align: 'center' });
        F.draw(ctx, '...for now. The Immortality Stone is warming up.', W / 2, Math.round(H * 0.4) + 22, { color: '#d4daf5', outline: T.ink, align: 'center' });
      }
      if (!(uc && uc.bars > 0.3)) ERX.HUD.render(ctx, W, H, this);
      this.dialogue.render(ctx, W, H);
    }

    _drawNpc(c, cam, n) {
      if (n.id === 'guide') {
        const FS = ERX.FigureSprite;
        FS.draw(c, FS.frame(n.talking ? 'smug' : 'neutral', 'idle', 0, n.facingNow || n.facing), Math.round(n.x) - cam.ix, Math.round(n.y) - cam.iy);
        if (n.talking) c.drawImage(ERX.Actors.bubble('dots'), Math.round(n.x) - 4 - cam.ix, Math.round(n.y) - 48 - cam.iy);
        return;
      }
      const look = ERX.Story.deep.MINERS[n.id].look;
      const PS = ERX.PlayerSide;
      const facing = n.facingNow || n.facing;
      let pose = 'idle', frame = Math.floor(n.t * 1.6) % 2;
      if (n.pose === 'sit') { pose = 'sit'; frame = 0; }
      if ((n.pose === 'mine' || n.pose === 'punch') && !n.talking && Math.abs(n.x - this.player.cx) >= 40) {
        const ph = n.t % (n.pose === 'punch' ? 0.7 : 1.1);
        pose = 'attack';
        frame = ph < 0.4 ? 0 : ph < 0.65 ? 1 : 2;
      }
      const cv = PS.frame(look, pose, frame, facing);
      const x = Math.round(n.x) - cam.ix, y = Math.round(n.y) - cam.iy;
      PS.draw(c, cv, x, y, facing);
      // pickaxe for the mining pose
      if (pose === 'attack' && n.pose === 'mine') {
        const hx = x + facing * (frame === 1 ? 14 : frame === 0 ? -4 : 9), hy = y - (frame === 0 ? 20 : 13);
        c.fillStyle = '#7a5236'; c.fillRect(Math.min(hx, hx + facing * 6), hy, 6, 1);
        c.fillStyle = '#c8d0e0'; c.fillRect(hx + facing * 5, hy - 2, 1, 5);
      }
      if (n.talking) c.drawImage(ERX.Actors.bubble('dots'), x - 4, y - 44);
    }

    _drawElevatorCage(c, cam) {
      const E = this.level.elevator;
      const x0 = Math.round(E.x - 26) - cam.ix, y1 = E.floorY - cam.iy, w = 52, h = 46;
      c.fillStyle = T.ink; c.fillRect(x0, y1 - h, w, 3); c.fillRect(x0, y1 - 2, w, 3);
      c.fillStyle = '#848ca0'; c.fillRect(x0 + 1, y1 - h + 1, w - 2, 1); c.fillRect(x0 + 1, y1 - 1, w - 2, 1);
      for (const px of [0, w - 3]) { c.fillStyle = T.ink; c.fillRect(x0 + px, y1 - h, 3, h); c.fillStyle = '#9aa2b4'; c.fillRect(x0 + px + 1, y1 - h + 1, 1, h - 2); }
      for (let bx = 8; bx < w - 6; bx += 8) { c.fillStyle = 'rgba(132,140,160,0.5)'; c.fillRect(x0 + bx, y1 - h + 3, 1, h - 6); }
      // cable + bulb
      c.fillStyle = '#5e6478'; c.fillRect(x0 + w / 2, y1 - h - 200, 1, 200);
      c.fillStyle = '#ffe08a'; c.fillRect(x0 + w / 2 - 1, y1 - h + 4, 3, 3);
    }

    /** The elevator ride: the shaft scrolls past while the cage stays centred. */
    _renderElevator(ctx, W, H) {
      const e = this.elev;
      const cx = Math.round(W / 2), floorY = Math.round(H * 0.68);
      const jolt = Math.round(e.jolt * 6 * Math.sin(e.t * 60));
      ctx.fillStyle = '#0c0e22';
      ctx.fillRect(0, 0, W, H);
      // shaft walls scroll downwards as we rise
      const scroll = Math.round(e.y * (e.dir || 1));
      const wallW = Math.round(W / 2 - 70);
      for (const side of [0, 1]) {
        const x = side ? W - wallW : 0;
        // rock walls: the level's own back-wall texture, scrolling
        ctx.save();
        ctx.beginPath(); ctx.rect(x, 0, wallW, H); ctx.clip();
        const bh = this.bgCanvas.height;
        for (let y = -bh + (scroll % bh); y < H; y += bh) ERX.Paint.drawTiled(ctx, this.bgCanvas, side * 97, y, W);
        ctx.fillStyle = 'rgba(80,96,154,0.35)'; ctx.fillRect(x, 0, wallW, H);
        ctx.restore();
        ctx.fillStyle = '#0e1020'; ctx.fillRect(side ? x : x + wallW - 2, 0, 2, H);
        ctx.fillStyle = '#6a80b8'; ctx.fillRect(side ? x + 2 : x + wallW - 3, 0, 1, H);
        // glowing crystals embedded in the walls
        for (let i = 0; i < 6; i++) {
          const yy = ((i * 97 + scroll * 0.9) % (H + 40)) - 20;
          ctx.fillStyle = ['#ff7ad8', '#5af0e0', '#ffd36a'][i % 3];
          ctx.fillRect(side ? x + 6 + (i * 13) % 30 : x + wallW - 12 - (i * 11) % 30, Math.round(yy), 3, 5);
        }
      }
      // horizontal girders whizzing past
      for (let y = -120 + (scroll % 120); y < H; y += 120) {
        ctx.fillStyle = '#5e6478'; ctx.fillRect(wallW, Math.round(y), W - wallW * 2, 3);
        ctx.fillStyle = '#848ca0'; ctx.fillRect(wallW, Math.round(y), W - wallW * 2, 1);
      }
      // cage
      const cw = 70, ch = 58, x0 = cx - cw / 2, y0 = floorY - ch + jolt;
      const flick = e.flicker > 0 && Math.floor(e.t * 20) % 3 === 0;
      ctx.fillStyle = flick ? 'rgba(10,10,20,0.9)' : 'rgba(255,230,160,0.07)';
      ctx.fillRect(x0 + 3, y0 + 3, cw - 6, ch - 6);
      ctx.fillStyle = '#5e6478'; ctx.fillRect(cx, 0, 1, y0);
      ctx.fillStyle = T.ink; ctx.fillRect(x0, y0, cw, 4); ctx.fillRect(x0, y0 + ch - 3, cw, 4);
      ctx.fillStyle = '#9aa2b4'; ctx.fillRect(x0 + 1, y0 + 1, cw - 2, 1); ctx.fillRect(x0 + 1, y0 + ch - 2, cw - 2, 1);
      for (const px of [0, cw - 3]) { ctx.fillStyle = T.ink; ctx.fillRect(x0 + px, y0, 3, ch); ctx.fillStyle = '#9aa2b4'; ctx.fillRect(x0 + px + 1, y0 + 1, 1, ch - 2); }
      for (let bx = 9; bx < cw - 6; bx += 9) { ctx.fillStyle = 'rgba(132,140,160,0.45)'; ctx.fillRect(x0 + bx, y0 + 4, 1, ch - 8); }
      if (e.roofBroken) { ctx.fillStyle = '#0c0e22'; ctx.fillRect(cx - 9, y0, 18, 4); ctx.fillStyle = '#9aa2b4'; ctx.fillRect(cx - 11, y0 - 2, 2, 3); ctx.fillRect(cx + 9, y0 - 1, 2, 3); }
      ctx.fillStyle = flick ? '#3a3a2a' : '#ffe08a'; ctx.fillRect(cx - 1 + Math.round(Math.sin(e.t * 3) * 2), y0 + 5, 3, 3);
      // the player
      const PS = ERX.PlayerSide;
      const pose = e.jolt > 0.3 ? 'hurt' : 'idle';
      PS.draw(ctx, PS.frame(this.character.look, pose, Math.floor(e.t * 1.6) % 2, 1), cx - 12, y0 + ch - 3, 1);
      // the slime crashes in
      if (e.slime && ERX.Slime) {
        const s = e.slime;
        const frame = s.landed ? (s.t < 0.3 ? 1 : Math.floor(s.t * 2) % 2) : 2;
        const angry = s.landed && s.t > 0.6;
        const sl = ERX.Slime(angry ? '#e0504a' : '#8a90b0', frame);
        const sy = s.landed ? y0 + ch - 3 - sl.height + 3 : y0 + ch - 3 - sl.height + 3 + s.y;
        ctx.drawImage(sl, cx + 2, Math.round(sy));
      }
      if (e.speed > 20) F.draw(ctx, e.dir < 0 ? 'GOING DOWN...' : 'GOING UP...', cx, floorY + 14, { color: '#9aa3cf', align: 'center', alpha: 0.7 });
    }

    /** A swirling nebula galaxy, generated once per screen size. */
    _nebulaCanvas(W, H) {
      const NW = W + 64; // a little wider than the screen, so it can sway
      if (this._nebCv && this._nebCv.width === NW && this._nebCv.height === H) return this._nebCv;
      const buf = new ERX.PixelBuffer(NW, H);
      const noise = new U.Noise(1234);
      const C = ERX.Color;
      const cols = ['#07051a', '#140a33', '#2a1060', '#4a1a80', '#8a2a9a', '#d04aa0', '#ff8ac0'].map((h) => C.u32(h));
      const blue = ['#07051a', '#0a1a40', '#103a70', '#1a6aa0'].map((h) => C.u32(h));
      for (let y = 0; y < H; y++) for (let x = 0; x < NW; x++) {
        const n = noise.fbm2(x * 0.012, y * 0.018, 4);
        const m = noise.fbm2(x * 0.02 + 40, y * 0.02 + 9, 3);
        const v = n + (ERX.bayer(x, y) - 0.5) * 0.08;
        let col = cols[U.clamp(Math.floor((v - 0.3) * 14), 0, cols.length - 1)];
        if (m > 0.6 && v < 0.55) col = blue[U.clamp(Math.floor((m - 0.6) * 18), 0, blue.length - 1)];
        buf.data[y * NW + x] = col;
      }
      const rng = new U.RNG(99);
      for (let i = 0; i < (NW * H) / 90; i++) buf.set(rng.int(0, NW - 1), rng.int(0, H - 1), C.u32(rng.chance(0.2) ? '#ffe8a0' : '#ffffff'));
      this._nebCv = buf.toCanvas();
      this._nebStars = [];
      for (let i = 0; i < 40; i++) this._nebStars.push({ x: rng.int(0, W - 1), y: rng.int(0, H - 1), p: rng.range(0, 6) });
      return this._nebCv;
    }

    _renderNebula(ctx, W, H) {
      const n = this.neb;
      const bg = this._nebulaCanvas(W, H);
      const drift = Math.round(32 + Math.sin(n.t * 0.5) * 30);
      ctx.drawImage(bg, -drift, 0);
      for (const s of this._nebStars) {
        const tw = Math.sin(this.t * 4 + s.p);
        ctx.fillStyle = tw > 0.3 ? '#ffffff' : '#8a8acf';
        const sx = s.x;
        ctx.fillRect(sx, s.y, 1, 1);
        if (tw > 0.85) { ctx.fillRect(sx - 1, s.y, 3, 1); ctx.fillRect(sx, s.y - 1, 1, 3); }
      }
      const cx = Math.round(W / 2), cy = Math.round(H * 0.62);
      const shake = n.lying ? 0 : Math.min(7, 1 + n.t * 1.8);
      const jx = Math.round((Math.random() - 0.5) * 2 * shake), jy = Math.round((Math.random() - 0.5) * shake);
      // rainbow aura rings pulsing outward
      if (!n.lying) {
        for (let k = 0; k < 4; k++) {
          const ph = (n.t * 1.3 + k / 4) % 1;
          const r = Math.round(10 + ph * 70);
          ctx.globalAlpha = 1 - ph;
          ctx.fillStyle = ORB_LIGHTS[(k + Math.floor(n.t * 4)) % 6];
          const cnt = Math.round(r * 2.5);
          for (let i = 0; i < cnt; i++) { const a = (i / cnt) * Math.PI * 2; ctx.fillRect(cx + Math.round(Math.cos(a) * r), cy - 22 + Math.round(Math.sin(a) * r), 2, 2); }
        }
        ctx.globalAlpha = 1;
      }
      this.fx.render(ctx, cx, cy - 22);
      // you, at 2x, shaking violently
      const PS = ERX.PlayerSide;
      const cv = PS.frame(this.character.look, n.lying ? 'lie' : 'hurt', 0, 1);
      ctx.save();
      ctx.translate(cx + jx, cy + jy);
      ctx.scale(2, 2);
      if (!n.lying && Math.floor(n.t * 14) % 3 === 0) ctx.filter = 'brightness(1.8)';
      PS.draw(ctx, cv, 0, 0, 1, n.lying);
      ctx.restore();
      if (n.black > 0) { ctx.fillStyle = 'rgba(0,0,0,' + n.black.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    }

    _renderReveal(ctx, W, H) {
      const r = this.rev, el = this.element();
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
      const wordsAlpha = r.slime ? Math.max(0.25, 1 - r.slime.t * 0.8) : 1;
      const wy = Math.round(H * 0.24);
      const pop = (k) => (k < 0.12 ? 1.6 - k * 5 : 1);
      if (r.you !== null) F.draw(ctx, 'YOU', Math.round(W / 2 - 40), wy, { scale: 3, color: '#ffffff', align: 'center', alpha: wordsAlpha * Math.min(1, r.you * 6) });
      if (r.got !== null) F.draw(ctx, 'GOT', Math.round(W / 2 + 40), wy, { scale: 3, color: '#ffffff', align: 'center', alpha: wordsAlpha * Math.min(1, r.got * 6) });
      if (r.roll !== null && r.elem === null) {
        // drumroll: a nervous little "..." building up
        const dots = '.'.repeat(1 + (Math.floor(r.roll * 6) % 3));
        F.draw(ctx, dots, W / 2, Math.round(H * 0.52), { scale: 2, color: '#8a8aa8', align: 'center' });
      }
      if (r.elem !== null && el) {
        const cx = Math.round(W / 2), cy = Math.round(H * 0.52);
        // glow + rays in the element's colour
        ctx.globalAlpha = Math.min(0.5, r.elem);
        ctx.fillStyle = el.color;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 + r.elem * 0.3;
          for (let d = 30; d < 140; d += 3) if ((d + i) % 2 === 0) ctx.fillRect(cx + Math.round(Math.cos(a) * d), cy + Math.round(Math.sin(a) * d * 0.6), 1, 1);
        }
        ctx.globalAlpha = 1;
        for (const s of r.sparks) { ctx.globalAlpha = Math.min(1, s.t); ctx.fillStyle = s.c; ctx.fillRect(cx + Math.round(s.x), cy + Math.round(s.y), 2, 2); }
        ctx.globalAlpha = 1;
        const img = ERX.Assets.image('element_' + el.id);
        const k = pop(r.elem);
        const bob = Math.round(Math.sin(r.elem * 2) * 2);
        if (img) {
          const sc = Math.max(1, Math.floor(Math.min((W * 0.62) / img.width, (H * 0.42) / img.height)));
          const w = Math.round(img.width * sc * k), h = Math.round(img.height * sc * k);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, cx - Math.round(w / 2), cy - Math.round(h / 2) + bob, w, h);
        } else {
          // no art for this one: a big pixel-font title instead
          const sc = Math.max(2, Math.floor(Math.min((W * 0.6) / Math.max(1, F.measure(el.name.toUpperCase())), 5) * k));
          F.draw(ctx, el.name.toUpperCase(), cx, cy - Math.round((sc * 7) / 2) + bob, { scale: sc, color: el.color, outline: '#ffffff', shadow: el.dark, shadowOffset: Math.max(1, sc - 1), align: 'center' });
        }
        if (r.elem > 0.8) F.draw(ctx, el.desc, cx, Math.round(H * 0.8), { color: '#c8c8e0', align: 'center', alpha: Math.min(1, (r.elem - 0.8) * 2) });
        if (r.rarity !== null) this._renderRarity(ctx, cx, Math.round(H * 0.86), r.rarity, ERX.Elements.rarityOf(el));
      }
      if (r.slime && ERX.Slime) {
        const s = r.slime;
        const frame = s.landed ? (s.t < 0.3 ? 1 : Math.floor(s.t * 2) % 2) : 2;
        const sl = ERX.Slime(s.angry ? '#e0504a' : '#8a90b0', frame);
        const fx = Math.round(W * 0.86), fy = Math.round(H * 0.92);
        ctx.save();
        ctx.translate(fx, Math.round(fy + s.y));
        ctx.scale(2, 2);
        ctx.drawImage(sl, -Math.round(sl.width / 2), -sl.height);
        ctx.restore();
      }
    }

    /** The 7 worlds in the sky: locked ones dim with a padlock, world 1 glowing once unlocked. */
    _renderSky(c) {
      const W = this.worlds;
      W.list.forEach((w, i) => {
        const k = U.clamp((W.t - i * 0.35) / 0.45, 0, 1);
        if (k <= 0) return;
        const pos = this._skyPos(w);
        const open = W.unlocked[i];
        const cv = open ? w.cv : w.cvLocked;
        const pop = k < 1 ? 0.6 + k * 0.5 : 1;
        c.globalAlpha = k;
        if (open) {
          // pulsing glow ring
          const rr = w.r + 4 + Math.round(Math.sin(this.t * 3) * 1.5);
          c.fillStyle = '#ffffff';
          for (let a = 0; a < 48; a++) if (a % 2 === Math.floor(this.t * 4) % 2) c.fillRect(pos.x + Math.round(Math.cos((a / 48) * Math.PI * 2) * rr), pos.y + Math.round(Math.sin((a / 48) * Math.PI * 2) * rr), 1, 1);
        }
        const dw = Math.round(cv.width * pop), dh = Math.round(cv.height * pop);
        c.drawImage(cv, pos.x - Math.round(dw / 2), pos.y - Math.round(dh / 2), dw, dh);
        if (!open && k >= 1) this._drawLock(c, pos.x, pos.y + 2);
        c.globalAlpha = 1;
      });
      for (const sh of W.shards) { c.globalAlpha = Math.min(1, sh.t * 2); c.fillStyle = sh.c; c.fillRect(Math.round(sh.x), Math.round(sh.y), 2, 2); }
      c.globalAlpha = 1;
    }

    _drawLock(c, x, y) {
      const R = (rx, ry, w, h, col) => { c.fillStyle = col; c.fillRect(x + rx, y + ry, w, h); };
      R(-3, -9, 7, 2, T.ink); R(-3, -8, 1, 5, T.ink); R(3, -8, 1, 5, T.ink);           // shackle outline
      R(-2, -8, 5, 1, '#c8d0e0'); R(-2, -7, 1, 4, '#c8d0e0'); R(2, -7, 1, 4, '#c8d0e0');
      R(-5, -4, 11, 9, T.ink); R(-4, -3, 9, 7, '#ffd34d'); R(-4, -3, 9, 1, '#fff0a0'); R(-4, 3, 9, 1, '#c89a20');
      R(0, -1, 1, 3, '#5a3a10');                                                       // keyhole
    }

    /** The figure, the HQ door, the jump point and the floor ripples (world coords). */
    _renderVoidThings(c, cam) {
      // ripples on the invisible floor
      for (const r of this.ripples) {
        const rad = 3 + r.t * (r.big ? 46 : 26), a = 1 - r.t / 0.7;
        c.fillStyle = 'rgba(138,176,255,' + (a * 0.8).toFixed(2) + ')';
        const n = Math.round(rad * 2.4);
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2;
          c.fillRect(Math.round(r.x + Math.cos(ang) * rad) - cam.ix, Math.round(r.y + Math.sin(ang) * rad * 0.18) - cam.iy, 1, 1);
        }
      }
      // the jump point: a beam down from world 1
      const L = this.level;
      if (this.worlds && this.worlds.unlocked[0]) {
        const top = this._skyPos(this.worlds.list[0]);
        const bx = L.jumpX - cam.ix, by = L.floorY - cam.iy;
        const steps = 60;
        for (let i = 0; i < steps; i++) {
          const e = i / steps;
          const x = Math.round(U.lerp(top.x, bx, e)), y = Math.round(U.lerp(top.y + 20, by, e));
          const wob = Math.round(Math.sin(this.t * 6 + i * 0.5) * 1.5);
          c.fillStyle = (i + Math.floor(this.t * 20)) % 6 < 3 ? 'rgba(255,255,255,0.55)' : 'rgba(122,240,255,0.35)';
          c.fillRect(x - 1 + wob, y, 3, Math.ceil((by - top.y) / steps) + 1);
        }
        const rr = 12 + Math.sin(this.t * 4) * 2;
        c.fillStyle = '#7af0ff';
        for (let i = 0; i < 40; i++) { const ang = (i / 40) * Math.PI * 2; c.fillRect(Math.round(bx + Math.cos(ang) * rr), Math.round(by + Math.sin(ang) * rr * 0.25), 1, 1); }
      }
      // the HQ door, standing on nothing
      const d = this.hqDoor;
      if (d) {
        const k = U.ease.outBack(U.clamp(d.t, 0, 1));
        const w = Math.round(22 * k), h = Math.round(38 * k);
        const x = Math.round(d.x - w / 2) - cam.ix, y = Math.round(d.y - h) - cam.iy;
        if (w > 2) {
          c.fillStyle = T.ink; c.fillRect(x - 2, y - 2, w + 4, h + 2);
          c.fillStyle = '#ffd34d'; c.fillRect(x - 1, y - 1, w + 2, h + 1);
          c.fillStyle = d.openT > 0 ? '#ffe8b0' : '#5a3a8a'; c.fillRect(x, y, w, h);
          if (d.openT <= 0) {
            c.fillStyle = '#4a2a7a'; c.fillRect(x + 3, y + 3, w - 6, Math.round(h * 0.4)); c.fillRect(x + 3, y + Math.round(h * 0.5), w - 6, Math.round(h * 0.42));
            c.fillStyle = '#ffd34d'; c.fillRect(x + w - 5, y + Math.round(h * 0.55), 2, 2);
          }
          if (k >= 1) F.draw(c, 'HQ', d.x - cam.ix, y - 12, { color: Math.floor(this.t * 2) % 7 === 0 ? '#8a4a7a' : '#ff8ad8', outline: '#3a0a3a', align: 'center' });
        }
      }
      // the Voice himself
      const f = this.figure;
      if (f && !f.gone) {
        const FS = ERX.FigureSprite;
        const hop = f.hop > 0 ? -Math.round(Math.sin((1 - f.hop) * Math.PI) * 8) : 0;
        const jx = f.shakeT > 0 ? Math.round((Math.random() - 0.5) * 3) : 0;
        const cv = FS.frame(f.expr, f.pose, Math.floor(f.t * 6), f.facing, f.front);
        FS.draw(c, cv, Math.round(f.x) + jx - cam.ix, Math.round(f.y) + hop - cam.iy);
        if (f.bubble) c.drawImage(ERX.Actors.bubble(f.bubble), Math.round(f.x) - 4 - cam.ix, Math.round(f.y) - FS.H - 12 + hop - cam.iy);
      }
    }

    /** The scan + the energy key (drawn over the player). */
    _renderVoidFx(c, cam) {
      const p = this.player;
      if (this.scan) {
        const s = this.scan;
        s.t += 1 / 60;
        const top = p.y - 4, h = p.h + 8;
        const y = Math.round(top + (Math.sin(s.t * 5) * 0.5 + 0.5) * h) - cam.iy;
        const x0 = Math.round(p.cx - 14) - cam.ix;
        c.fillStyle = 'rgba(122,240,160,0.18)';
        c.fillRect(x0, Math.round(top) - cam.iy, 28, h);
        c.fillStyle = '#7af0a0'; c.fillRect(x0, y, 28, 1);
        c.fillStyle = 'rgba(122,240,160,0.5)'; c.fillRect(x0, y - 1, 28, 1); c.fillRect(x0, y + 1, 28, 1);
        // a dotted beam from his hand
        const f = this.figure;
        if (f) {
          const hh = ERX.FigureSprite.hand(f.facing);
          const hx = f.x + hh.x, hy = f.y + hh.y;
          c.fillStyle = '#7af0a0';
          for (let i = 0; i < 24; i++) {
            if ((i + Math.floor(s.t * 20)) % 3) continue;
            const e = i / 24;
            c.fillRect(Math.round(U.lerp(hx, p.cx, e)) - cam.ix, Math.round(U.lerp(hy, p.y + 10, e)) - cam.iy, 1, 1);
          }
        }
      }
      const k = this.energyKey;
      if (k && !k.done) {
        let x, y, a = 1;
        if (k.phase === 'charge') {
          const f = this.figure, h = ERX.FigureSprite.hand(f.facing);
          x = f.x + h.x; y = f.y + h.y - 6; a = Math.min(1, k.t / 1.2);
        } else {
          const e = Math.min(1, k.t / 0.8);
          x = U.lerp(k.from.x, k.to.x, e); y = U.lerp(k.from.y, k.to.y, e) - Math.sin(e * Math.PI) * 30;
        }
        x = Math.round(x) - cam.ix; y = Math.round(y) - cam.iy;
        c.globalAlpha = a;
        c.fillStyle = 'rgba(122,240,255,0.35)'; c.fillRect(x - 6, y - 4, 13, 9);
        c.fillStyle = '#ffffff';
        c.fillRect(x - 4, y - 2, 3, 1); c.fillRect(x - 4, y + 1, 3, 1); c.fillRect(x - 5, y - 1, 1, 2); c.fillRect(x - 1, y - 1, 1, 2);   // bow
        c.fillRect(x, y, 6, 1);                                                                                                    // shaft
        c.fillRect(x + 3, y + 1, 1, 2); c.fillRect(x + 5, y + 1, 1, 2);                                                           // teeth
        c.globalAlpha = 1;
      }
    }

    /** Launching yourself at world 1: up, smaller, faster... */
    _renderLaunch(c, cam) {
      const L = this.launch, p = this.player;
      const target = this._skyPos(this.worlds.list[0]);
      const sx = L.x0 - cam.ix, sy = L.y0 - cam.iy;
      const hop = Math.min(1, L.t / 0.35);
      const e = U.clamp((L.t - 0.35) / 1.4, 0, 1);
      const ee = e * e;
      const x = U.lerp(sx, target.x, ee), y = U.lerp(sy - Math.sin(hop * Math.PI * 0.5) * 30, target.y, ee);
      const sc = 1 - ee * 0.85;
      for (let i = 0; i < 3; i++) this.fx.add({ x: x + cam.ix + U.lerp(-3, 3, Math.random()), y: y + cam.iy, vx: 0, vy: 0, life: 0.4, color: Math.random() < 0.5 ? '#7af0ff' : '#ffffff', size: 1, fadeOut: 0.3 });
      const cv = ERX.PlayerSide.frame(p.look, 'jump', 0, 1);
      c.save();
      c.translate(Math.round(x), Math.round(y));
      c.scale(sc, sc);
      ERX.PlayerSide.draw(c, cv, 0, 0, 1);
      c.restore();
      if (L.t > 1.5) this.flashT = Math.max(this.flashT, Math.min(0.9, (L.t - 1.5) * 2));
    }

    /** "★ LEGENDARY ★" under the element. MYTHIC cycles through the rainbow. */
    _renderRarity(ctx, cx, y, t, rar) {
      const k = t < 0.12 ? 1.5 - t * 4 : 1;
      const text = '★ ' + rar.name.toUpperCase() + ' ★';
      const sc = Math.max(1, Math.round(2 * k));
      const mythic = rar.tier >= 5;
      if (!mythic) {
        F.draw(ctx, text, cx, y, { scale: sc, color: rar.color, outline: '#000000', shadow: rar.dark, shadowOffset: 1, align: 'center', alpha: Math.min(1, t * 6) });
        return;
      }
      // MYTHIC: every letter its own colour, wobbling
      const w = F.measure(text) * sc;
      let x = cx - Math.round(w / 2);
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const dy = Math.round(Math.sin(t * 6 + i * 0.7) * 2);
        F.draw(ctx, ch, x, y + dy, { scale: sc, color: ERX.Props.rainbow(t * 2, i * 30), outline: '#000000', alpha: Math.min(1, t * 6) });
        x += F.measure(ch) * sc;
      }
    }

    _drawWake(ctx, W, H) {
      if (this.state === 'play' && this.lids >= 1) return;
      if (this.state === 'dead' || this.state === 'elevator' || this.state === 'nebula' || this.state === 'reveal' || this.state === 'float' || this.state === 'black' || this.state === 'launch' || this.state === 'skyfall' || this.state === 'pull' || this.state === 'recall') return;
      const open = this.state === 'intro' ? 0 : this.lids;
      const cy = U.clamp(Math.round((this.player.y + 12 - this.camera.y) * this.zoom), 40, H - 40);
      const gap = Math.round(H * open);
      const top = Math.max(0, cy - Math.round(gap / 2)), bot = Math.min(H, cy + Math.round(gap / 2));
      const topH = Math.round(U.lerp(top, 0, open * open)), botY = Math.round(U.lerp(bot, H, open * open));
      ctx.fillStyle = '#05040a';
      ctx.fillRect(0, 0, W, topH);
      ctx.fillRect(0, botY, W, H - botY);
      for (let i = 0; i < 6; i++) {
        for (let x = (i & 1); x < W; x += 2 + (i >> 1)) {
          ctx.fillRect(x, topH + i, 1, 1);
          ctx.fillRect(x, botY - 1 - i, 1, 1);
        }
      }
      if (this.state === 'intro') {
        const lines = ['...', 'Somewhere.', 'Somehow.'];
        const n = Math.min(lines.length, Math.floor(this.wakeT / 0.6) + 1);
        lines.slice(0, n).forEach((l, i) => F.draw(ctx, l, W / 2, H / 2 - 14 + i * 12, { color: '#8a90b0', align: 'center' }));
        return;
      }
      if (this.state === 'waking') {
        const th = WAKE_THOUGHTS[this.thought];
        const jit = this.thought === WAKE_THOUGHTS.length - 1 ? Math.round((Math.random() - 0.5) * 2) : 0;
        F.draw(ctx, th, W / 2 + jit, Math.round(H * 0.22), { color: '#c8c0e0', outline: '#05040a', align: 'center' });
        const blink = Math.floor(this.t * 3) % 2 === 0;
        const label = ERX.Touch.enabled ? 'TAP TAP TAP TO WAKE UP' : 'MASH ' + ERX.keyText('{jump}') + ' TO WAKE UP';
        if (blink || this.wake > 0.05) F.draw(ctx, label, W / 2, Math.round(H * 0.76), { scale: 2, color: '#ffffff', outline: '#05040a', shadow: '#2a3070', shadowOffset: 2, align: 'center' });
        const bw = 140, bx = Math.round(W / 2 - bw / 2), by = Math.round(H * 0.76) + 22;
        T.rect(ctx, bx - 1, by - 1, bw + 2, 7, T.ink);
        T.rect(ctx, bx, by, bw, 5, '#1a1428');
        T.rect(ctx, bx, by, Math.round(bw * this.wake), 5, ERX.Color.mix('#8a5ac8', '#ffd34d', this.wake));
      }
    }
  }

  GameScreen.STAGES = STAGES;
  ERX.Scenes.register('game', GameScreen);
})(window.ERX = window.ERX || {});
