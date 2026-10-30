# ELEMENTAL RETRIBUTION X

**Version 1.1** (`ERX.Config.VERSION` in `js/core/config.js`, shown on the main menu; `package.json` says 1.1.0).

A 2D retro pixel-art RPG. Current build: main menu, character creation, **The Cave** (wake-up, the arena, the Voice, the tutorial, the first monsters) and **The Deep Ends** (miners, more monsters, the elevator) and **The Sealed Chamber** (the rainbow orb, the awakening, and the "YOU GOT ..." element reveal) and **The Void** (the Voice in person, your element scanned, the Julforic Pillars, 7 element-dependent worlds, world 1 unlocked) plus **Hero HQ** (staff to talk to, Brenda's armour shop) and **World 1** (the Voice yanks you back to hand you the Void Recall Device, then you drop out of a galaxy portal and fall into a bright, green, earth-like world with a day/night cycle; the grumpy slime blocks the way past the landing meadow, and the first Checkshot recalls you to the void). The rest of World 1 is where the story currently ends. Elements are never chosen, ever: one is rolled at random (weighted by rarity) at the reveal and saved on the character.

## Running it

**Double-click `index.html`.** It runs in any modern browser (Chrome, Edge, Firefox). You don't need a build step, a server or an internet connection.

The first key press or click on the title screen starts the audio, because browsers block sound until you interact with the page.

### Developer URL switches
| URL suffix | Effect |
|---|---|
| `index.html?scene=sky` | Force a world: `sky`, `village`, `tree`, `peaks` |
| `index.html?seed=1234` | Fix the world-generation seed |
| `index.html?debug` | Debug overlay (resolution, scale, world, screen stack, audio state) |

### Automated tests
```
node tools/test-menu.js          # menus, settings, characters, Neon Jam (109 checks)
node tools/test-game.js          # plays the whole story so far: the cave, the reveal, the void, the VRD, falling into World 1, the inventory, Chaos in World 1 (246 checks)
node tools/test-mobile.js        # plays on an emulated touch-screen phone using only taps (36 checks)
node tools/test-abilities.js     # every element's kit + AWAKENED kit (all moves unique), element sounds, hit impact, Ultimate cutscenes, statuses, guard breaks, skill tree, training room, admin, the Awakening lock, upgraded M1s + dashes, Chaos's beam + roar (123 checks)
node tools/test-menu.js --shots  # also saves screenshots to tools/screenshots/
```
Requires Node 22+ and Chrome or Edge installed. No npm packages are needed.

## Project structure
```
index.html              Entry point (loads scripts in dependency order)
css/style.css           Full-window canvas, pixelated scaling
assets/images/          logo.png (native pixel-grid version of your logo),
                        logo_source.png (your original), favicon.png
js/core/                config (+ all asset paths), util (math/RNG/noise), events,
                        storage (localStorage + fallback), settings, saves (characters), asset loader
js/render/              display (integer pixel scaling), pixel-buffer (procedural
                        pixel painting), bitmap font, colour, sprites/icons, player-sprite
js/input/               input (keyboard/mouse/gamepad + UI actions), keybinds (remapping)
js/audio/               audio manager (buses), sfx bank, chiptune sequencer + tracks,
                        ambient soundscapes
js/ui/                  theme (pixel panels/buttons), widgets + focus navigation,
                        overlay (toasts, cursor, screen shake, FPS)
js/scenes/              scene manager (screen stack + dissolve/fade transitions)
js/backgrounds/         background manager, shared painters, pixel actors (NPCs),
                        the four worlds: env-sky, env-village, env-tree, env-peaks
js/screens/             main menu, character select, character creator, confirm dialog,
                        pause / skill tree / inventory / road-closed (game-menus.js),
                        play placeholder, settings, help, credits
js/data/                elements.js = THE ELEMENT REGISTRY (all 31 elements + world hints);
                        all text: splash lines, jokes, help text, credits, and
                        character options + name jokes (character.js)
js/game/                engine (physics, camera, lighting, script runner), level-cave, level-deep,
                        enemies (slimes, bats),
                        props (gates, dummy, torches), player, dialogue, hud,
                        story-cave (cave dialogue + tutorial), story-deep (the Voice returns,
                        miners, elevator), game-screen
js/main.js              Boot + main loop
tools/                  test suite, CDP browser driver, logo pixelation + favicon scripts
```

### Desktop app (Electron)
```
npm start          # the game in its own window (F11 fullscreen, F12 dev tools, Ctrl+R reload)
npm run phone      # a phone-sized window where mouse clicks are touches (try the mobile controls)
```
The launcher lives in `electron/`. `package.json`'s `main` stays `index.html` for the web2exe/NW.js export.

### Default gameplay controls
A / D move, SPACE jump (hold for higher), L-SHIFT dash, J attack, K block, Q / R / C / X / Z skills, V Ultimate, G awaken, E use/read, I inventory, T skill tree, = / - zoom, ESC pause. All remappable in Settings > Controls.

**Phones / tablets** (held sideways): tap through menus; in game, ← → on the left, JUMP / HIT / DASH / BLOCK / USE on the right, ★ skills / BAG / pause at the top. Tapping the name box opens the phone keyboard. Touch switches on automatically (`js/input/touch.js`), and the first tap tries to go fullscreen.

### Extending later
- **Story / dialogue**: edit `js/game/story-cave.js`. Scripts are generator functions: `yield* v(g, "text")`, `yield* choose(g, [...])`, `yield* task(...)`.
- **Monsters**: `js/game/enemies.js` — extend `Enemy`, add it to `TYPES`, then list it in a level's `enemySpawns`. Set `gold` for how much it drops.
- **The void + HQ**: `js/game/story-void.js` (the Voice's conversation, his line for every element in `ELEMENT_LINES`, HQ staff in `MINERS`, Brenda's shop), `js/game/level-void.js` (both areas + `ERX.Worlds.build(element)`, which paints the 7 worlds from the element), `js/render/figure-sprite.js` (the Voice's sprite + expressions).
- **Element abilities**: every element's kit (M1, 5 skills, Ultimate, block, dash, status, plus an upgraded M1 `m1Up` and upgraded dash `dashUp`) lives in `js/data/kits/` (`kits-1.js` .. `kits-5.js`, format + helpers in `_kit.js`). Every move is its own code with its own `spawn` / `update` / `draw` — no move is a recolour of another (the abilities test checks this). Only Chaos borrows other elements' moves. The engine (drawing/hitting toolkit `A`, status effects, cooldowns, Ultimate meter, block/dash looks) is `js/game/abilities.js`. **Ultimate cutscene** (`js/game/ultimate.js`, ~3.7 s, 0.2 s of silence before the title): zoom in, clap, glowing eyes, the element's own charge (`ult.charge`), black, guitar riff + the title art slams in (`assets/images/ults/<element>.png`; Darkness draws its title), zoom out, fire (`ult.run`). Skill tree: `js/screens/skill-tree.js` (ranks in `character.elementSkills`; the Ultimate needs any 3 skills). **Upgrades** (rank 2) keep the element's colours and make a move bigger (`H.sc`), stronger (x1.6), faster (cooldown x0.85, projectiles x1.2) and more detailed (the `Bright` glow layer, trails, hit bursts); **M1+** swaps the M1 for the kit's `m1Up` (a whole new move) and **DASH+** spawns the kit's `dashUp` with every dash (`player._upgradedDash`; helpers `H.dashing` / `H.along` / `H.span` in `_kit.js`). Skills 1-5 stay the same move when upgraded. Training Room + dummies: `js/game/training.js`. Default keys: J attack, Q / R / C / X / Z skills, V Ultimate (phone: 1-5 + ULT buttons).
- **Worlds**: `ERX.Worlds` in `js/game/level-void.js`. World 1 is always the same normal, Earth-like planet (the starting world, with its own pillar). The other 6 follow the element (`THEMES`: 4 surface styles, 3 palettes, extras like flames/rings/moons/spikes/auras each); Chaos borrows other styles in clashing colours with glitches.
  - **Entering a world** (every world, every time; `js/game/world-fall.js`, `ERX.SkyFall`): 2 s of black, a galaxy portal opens at the top and you drop out of it, you fall through the void, it gets blindingly bright, the light cracks like glass and shatters, and you are falling out of the world's sky (~13 s). Steer left/right (dash for a quick swerve) to dodge what flies at you (`WORLDS[n].high/low`: World 1 has geese, birds and paper planes above the clouds, kites and hot-air balloons below; a hit costs 6% HP but never kills). Halfway down you punch through the sea of clouds. You land in a shockwave styled by your element (`LANDFX`), kneel for 1.3 s, and stand up. Music: `skyfall` loops while you fall and `skyfallEnd` plays once from the moment you land (`once` and `fadeIn` track options in `js/audio/music.js`); the wind is the `skyfall` ambience (`js/audio/world-audio.js`, driven by `ERX.Skyfall.wind`).
  - **World 1** (`js/game/level-world1.js`): a flowery meadow under oaks, pines, birches and blossom trees, with rolling hills, a windmill, a cottage, snowy mountains and a sea of clouds above. `drawSky` draws the sky, sun/moon/stars and every parallax layer (each in day, dusk and night versions) and also works from thousands of pixels up, which is what the fall uses. A full day + night takes 10 minutes (`g.worldTod`, `World1Level.DAY`): fireflies and crickets at night, birds and butterflies by day, its own day and night music (`world1` / `world1Night`).
  - **Story** (`js/game/story-world.js`): the first jump, the Voice freezes you mid-air and drags you back with a telekinesis device to hand you the **Void Recall Device** (`js/data/items.js`, shown in the inventory bag). In World 1 the grumpy slime (in a hard hat) drops in and blocks the way; the first **Checkshot** (a checkpoint with a cooler name) is where the VRD recalls you to the void. Progress flags: `progress.vrd`, `progress.world1`, `progress.checkshot1`.
- **Getting your element** wipes the tutorial: level, XP, skill points, stats and gold reset (`_freshStart` in `js/game/game-screen.js`), and RESTART disappears from the pause menu. Each rarity has its own reveal riff (`RIFFS` in `js/audio/reveal-audio.js`); Chaos (mythic) is the ominous one.
- **Ability wheel** (HUD, bottom-left): your element's symbol in the middle doubles as the Ultimate meter (fills with energy, glows when ready); the 5 skills circle it, each with an icon of what the move looks like. Symbols + icons: `js/render/symbols.js` (9x9 pixel strings; `ICONS` maps each element's skills to icons). Phone buttons use the same symbols.
- **Every move sounds like its element** (`js/audio/element-sfx.js`): each of the 31 elements has its own voice for swings, casts, hits, blasts, dashes, the Ultimate charge and the Ultimate itself (fire crackles and roars, ice chimes and shatters, water splashes, and so on; Chaos glitches through a random one). It plays on its own from the ability engine: `cast()`, `damage()`, `blast()`, the dash and the Ultimate call `ERX.ElementSfx`, so new moves get it for free. Every element hit also flashes (`hitFx` in `js/game/abilities.js`).
- **Blocks**: every element has its own block look, hit burst and blocked-hit sound in `js/data/kits/guards.js` (sounds `guardUp` / `blockHit` in `js/audio/game-audio.js`).
- **AWAKENING** is locked for now: each element will get its own way to unlock it a few worlds in (`character.awakenUnlocked`, checked by `ERX.Awakening.unlocked`). Until then the meter never fills, the ring and the phone's AWAKEN button are hidden, and only the admin panel (INSTANT AWAKENING, AWAKEN NOW) can awaken you. Once unlocked: dealing damage fills the Awakening meter (the ring around the wheel). When it's full, press **G** (phone: the AWAKEN button) for a short cutscene, then 60 s AWAKENED: a whole new kit with its own colour, a full Ultimate and reset cooldowns. Engine: `js/game/awakening.js` (meter, cutscene, smooth pose blending, side glow). Kits: `js/data/awakened/awk-1.js` .. `awk-5.js`, format + pose templates in `_awk.js`. Each one has a new M1 + 5 skills, a damaging dash, a block, its own idle + run animation (joint poses blended every frame, so nothing snaps), an always-on `look`, 5 skill icons (`js/render/symbols-awakened.js`), and an awakened Ultimate with its own charge-up, a more menacing riff (`awakenRiff`), a side glow and title art (`assets/images/ults-awakened/<id>.png`, cut from the sheet with `tools/cut-awakened-sheet.js`; Darkness draws its title). Only Chaos borrows other elements' (awakened) moves. Admin has INSTANT AWAKENING and AWAKEN NOW.
  - Every awakened Ultimate plays out like a film (`ERX.Awakening.cinema`: letterbox bars, a slow camera push, its colour bleeding in from the edges, power in the air). Awakened hits land harder: sparks in your colours, a jolt, a freeze-frame on big hits and an inverted black-and-white impact frame on an Ultimate's finisher (`awkJuice` in `js/game/abilities.js`).
  - **Planetfall** (Gravity) is its own cinematic: the sky tears, the camera pushes into a black hole that rips up the ground and drags everything up, it collapses into a point... and explodes. Every beat has its own sound (`bhTear`, `bhOpen`, `bhCollapse`, `bhPoint`, `bhBoom` in `js/audio/element-sfx.js`).
  - **Awakened moves are built for crowds and hit hard**: every awakened hit splashes onto enemies standing next to what it hit (`awkSplash`), every third awakened swing ends in a burst of your element, awakened moves (not Ultimates) are drawn 1.25x bigger (`KitHelp.sc`), and they are drawn on their own layer that gets a bloom in your awakened colour plus a one-pixel thickening (`Glow` in `js/game/abilities.js`; a move that recolours the world under it sets `noGlow: true`). Un-awakened element moves get a lighter outline (`Bold`). The weak-looking awakened moves were rebuilt bigger with the impact kit in `_awk.js`: `W.SHOCK` (a shockwave), `W.boom` (explosion + shockwave + shake), `W.beam` (a thick glowing beam), `W.smear` (a big swing crescent) and `W.debris`. Every kit projectile (`KitHelp.proj`) has a soft glow, two afterimages and a pop where it lands.
  - **Awakened Sound plays real music**: the M1 walks a riff, the third swing is a power chord, the Subwoofer plays a bass line, the Drumline a fill, World Resonance a whole song (`js/audio/sound-moves.js`, E minor pentatonic at 150 BPM, built on the guitar rig `ERX.Guitar` from `reveal-audio.js`).
  - **Awakened Chaos** is a white entity with a shifting rainbow outline (`look.body`), stands like awakened Fire, floats instead of running, blocks with one hand out (`guard.pose`) and its dash makes enemies glitch out (`enemy._glitchUntil`).
- **Engine hooks used by the awakened kits**: a dash can bring its own pose (`dash.pose`, `dash.flip` for a moonwalk) and so can a block (`guard.pose`); `look.body` can replace how your body is drawn; `player.ultHold` freezes you in a pose during an Ultimate, `player.vanishT` hides you, `enemy._erased` hides an enemy and `enemy._glitchUntil` glitches it; `game.ultCam = { x, y, zoom, bars, t }` lets an Ultimate take over the camera (refresh it every frame; it lapses on its own), `game.impact(seconds)` plays an impact frame + freeze, `game.hitStop` freezes the world briefly; `ERX.AwkHelp.bolt` draws a thick forked lightning bolt; and `Physics.move` splits big steps so nothing tunnels through the floor on slow frames. Full-screen effects should size themselves from the game's `view` (it follows the window), not a fixed 480x270.
- **Chaos** (the mythic): the Voice falls over when he scans it (`chaosReaction` in `js/game/story-void.js`), HQ staff have `chaosLines`, the world glitches + shimmers and monsters are tougher (`js/game/chaos-world.js`, applied in `ERX.Enemies.create`), and the 7 worlds look stranger. Chaos has its **own M1**: Chaos Ray, a white beam with a rainbow edge giving everything it hits 1 random status effect (M1+ Chaos Ray XL: bigger, faster, further, 2 effects; awakened Chaos Pillar: erupts from the ground under the enemy, 3 effects). Its **awakened Ultimate** (Reality Collapse, `js/data/awakened/awk-5.js`) is a cinematic: arms crossed in an X for the charge, then it leaps into the air, drinks in every colour, ROARS (`chaosRoar` in `js/audio/element-sfx.js`) with a white shockwave edged in rainbow and star eyes, fires other elements' Ultimates, awakened skills and normal skills for ~4.4 s, then snaps back to the ground (`ultHold.safe` keeps you untouchable meanwhile). The normal Chaos Ultimate is unchanged. In **World 1** Chaos gets a slightly red sky (`World1Level.CHAOS_RED`), harder bonks on the way down (`SkyFall.hitShare`), a white + rainbow landing with a bigger cracked crater, its own Checkshot sound (`checkshotChaos`) and a different send-off from the Voice.
- **Admin (hidden)**: type `theelementaladmin` on the main menu. `js/core/admin.js` + `js/screens/admin.js`: test any element (a temporary override; the real element is never changed), unlock all skills, god mode, infinite mana, instant Ultimate, warp to the Training Room.
- **Neon Jam (hidden)**: type `neonjam` on the main menu (again to switch it off). The menu restarts in **Neon City** (`js/backgrounds/env-neon.js`, a secret world that is never picked at random) to "Boss Battle" then "Boss Protocol Engaged", round and round (`assets/audio/neonjam-*.mp3`). `ERX.NeonJam` reads where the music is and follows the real beat map in `js/data/neonjam.js`: the whole screen thumps on every beat (main.js), the logo dances to it with a neon glow, the city lights up when the beat drops, and the screen spins round on drops / flips upside down and back every 8 bars (only on the main menu; turning off Screen Shake keeps it still). New songs? Put them in `ERX.AssetPaths.music.neonjam` and run `node tools/neonjam-beats.js` to rebuild the beat map.
- **Achievements**: `js/game/achievements.js` — append to `LIST`, call `ERX.Achievements.unlock('id')` where it's earned. They're shared by every character on the device and survive RESTART. Once 'tutorial' is earned, new characters get the Voice recognising them in the arena (tutorial again, or skip to the elevator).
- **Armour**: add entries to `js/data/armor.js` (name, price, def, colour). Each one is also an inventory item (`armor:<id>`, worn in the CHEST slot). Gold and armour are saved on the character.
- **Inventory** (Minecraft-style): `js/game/inventory.js` (`ERX.Inventory`: `character.inv` = 36 slots, 0-8 the hotbar; `character.equip` = head / chest / legs / feet) and the screen in `js/screens/game-menus.js` (armour + your preview + the bag and hotbar; click / right-click / shift-click / 1-9; no weapon slot). Add items to `js/data/items.js` (`name`, `desc`, `draw`, optional `stack`, `unique`, `slot`, `def`). Older saves move into the bag automatically, and `character.items` / `armor` / `armorOwned` are kept in sync for the code that reads them.
- **Levels**: `js/game/level-cave.js` carves the cave from numbers in SECTIONS; copy it for new areas.
- **Elements**: everything reads from `js/data/elements.js`. Add an element by appending an entry. Each has `world` hints (tint, particles, weather, mood) for element-dependent world changes. `ERX.Elements.random()` is called in exactly one place: `GameScreen.startReveal()` (the orb cutscene), which sets `character.element` once and never rerolls; the player can never choose. Title art per element lives in `assets/images/elements/<id>.png` (cut from the sheet with `tools/cut-element-sheet.js`; Darkness has no art yet and uses a generated pixel-font title). Each element has a signature reveal sound in `js/audio/reveal-audio.js`. **Rarity**: every element has a `rarity` tier (common, uncommon, rare, epic, legendary, mythic — see `RARITIES` / `TIER_OF` in elements.js); the tier weight sets how often it rolls. Chaos is the only MYTHIC and the rarest roll. New elements default to common.
- **New screen** (world map, battle, inventory): extend `ERX.Scenes.Screen`, call `ERX.Scenes.register('id', Class)`, then `ERX.Scenes.push('id')`.
- **Gameplay input**: read controls only through `ERX.Keybinds.isDown('jump')` and `ERX.Keybinds.wasPressed('attack')`. The player's remapping applies automatically.
- **New menu world**: extend `ERX.Environment` and call `ERX.Backgrounds.register({...})`.
- **Real audio files**: set paths in `ERX.AssetPaths.music` / `.ambience` in `js/core/config.js`. They replace the procedural tracks automatically. An entry can be a list of files: they play one after another and loop round in order.
- **Credits names**: edit `PEOPLE` in `js/data/credits.js`.
- **Character saves**: `ERX.Saves` (js/core/saves.js) stores name + appearance per character; add progress fields there later.
- **Customisation options**: add hairstyles/colours/outfits in `js/data/character.js` and draw them in `js/render/player-sprite.js`.
