/*
 * SYMBOLS — a pixel symbol for every element, and an icon for every skill
 * (what the move looks like). Used by the ability wheel (HUD) and the phone buttons.
 *
 * 9x9 pixel strings. Colours:
 *   # element   o light   x dark   w white   k black   r red   b blue
 *   g grey   y gold   n brown   G green   p pink   . empty
 * Chaos draws everything in shifting rainbow.
 *
 *   ERX.Symbols.element(ctx, elementId, cx, cy, scale, { dim, glow, t })
 *   ERX.Symbols.move(ctx, elementId, slot, cx, cy, scale, { dim, t, awakened, color })
 * Awakened skills use the awakened kit's own icons (kit.icons) in the awakened colour.
 */
(function (ERX) {
  'use strict';

  const S = (s) => s.split('/');

  // ------------------------------------------------------------ ELEMENTS
  const ELEMENT = {
    fire: S('....#..../...##..../..###.#../..####.../.##o###../.#ooo##.#/##owoo###/.#ooo##../..#####..'),
    water: S('....#..../....#..../...###.../..##o##../.##ow###./.#ow####./.#o#####./..#####../...###...'),
    wind: S('..####.../.#....#../.....#.../#######../........./########./........#/...#...#./....###..'),
    earth: S('........./....#..../...###.../..##o##../..#oo###./.##o####./.#######x/#####xxxx/xxxxxxxx.'),
    lightning: S('.....###./....###../...###.../..######./.....##../....##.../...##..../..##...../.#.......'),
    ice: S('....#..../.#..#..#./..#.#.#../...ooo.../####w####/...ooo.../..#.#.#../.#..#..#./....#....'),
    nature: S('.....####/...##ooo#/..#oo###./.#o###.#./.#o##.##./.#o#.##../..#.##.../.#.##..../#........'),
    darkness: S('..#####../.#xxxxx#./#xkkkkkx#/#xkkkkkx#/#xkrkrkx#/#xkkkkkx#/#xkkkkkx#/.#xxxxx#./..#####..'),
    shadow: S('..#####../.#######./#########/##w###w##/xxxxxxxxx/#########/.#######./..#####../.........'),
    light: S('..ooooo../.o.....o./..ooooo../....w..../...www.../wwwwwwwww/...www.../....w..../....w....'),
    arcane: S('....o..../...#o#.../..#.o.#../.#..o..#./ooooooooo/.#..o..#./..#.o.#../...#o#.../....o....'),
    poison: S('...###.../....#..../....#..../...#.#.../..#ooo#../.#oo#oo#./.#o#ooo#./.#ooooo#./..#####..'),
    blood: S('..##.##../.#oo#oo#./.#o#####./.#######./..#####../...###.../....#..../....#..../....x....'),
    death: S('..######./.#.....##/#.......#/....g..../...g...../..g....../.g......./g......../.........'),
    metal: S('........./........./#########/#o#######/.#######./...###.../..#####../.#######./.........'),
    sand: S('....#..../...#o#.../..#o###../.#o#####./#o#######/xxxxxxxxx/..o.o.o../........./.........'),
    magma: S('...o.o.../....o..../...xox.../..x#o#x../..##o##../.#######./.###x###./####x####/#########'),
    storm: S('..###..../.#####.#./#########/#########/.#######./...ww..../..ww...../...ww..../..w......'),
    cosmic: S('....w..../....o..../...o#o.../wo#####ow/...o#o.../....o..../....w..../w.......w/.........'),
    void: S('..#####../.#.....#./#..kkk..#/#.kkkkk.#/#.kkkkk.#/#.kkkkk.#/#..kkk..#/.#.....#./..#####..'),
    psychic: S('........./...###.../.##ooo##./#oo#x#oo#/#o#xwx#o#/#oo#x#oo#/.##ooo##./...###.../.........'),
    crystal: S('........./..#####../.#o#o#o#./#########/.#o###o#./..#o#o#../...#o#.../....#..../.........'),
    moon: S('..####.../.###...../###....../##o....../##o....../##o....../###....../.###...../..####...'),
    solar: S('........./#..#.#..#/.#.....#./...ooo.../#.ooooo.#/..ooooo../xxxxxxxxx/........./.........'),
    magnetism: S('rrr...bbb/rrr...bbb/gg.....gg/gg.....gg/gg.....gg/gg.....gg/.gg...gg./..ggggg../...ggg...'),
    time: S('..#####../.#.....#./#...w...#/#...w...#/#...www.#/#.......#/#.......#/.#.....#./..#####..'),
    gravity: S('...###.../...###.../...###.../.#######./..#####../...###.../....#..../ooooooooo/xxxxxxxxx'),
    sound: S('....####./....#..#./....#..#./....#..#./....#..#./..###.##./.####.##./.####..../..##.....'),
    mist: S('...ooo.../..ooooo../.ooo#ooo./oooooo#oo/........./.ooooooo./ooooooooo/........./..ooooo..'),
    spirit: S('..#####../.#######./##x###x##/##x###x##/#########/#########/#########/##.###.##/#...#...#'),
    chaos: S('#...#...#/.#..#..#./..#.#.#../...###.../#########/...###.../..#.#.#../.#..#..#./#...#...#'),
  };

  // ------------------------------------------------------------ MOVE ICONS
  const GLYPH = {
    fireball: S('........./....###../...#ooo#./#.#oowoo#/.##oooo#./#.#oooo#./...#oo#../....##.../.........'),
    pillars: S('..o...o../.o#..o#.o/.##..##.#/.##..##.#/.##..##.#/.##..##.#/.##..##.#/.##..##.#/xxxxxxxxx'),
    spin: S('...###.../.##...##./.#.....#./#...w...#/#..www..#/#...w...#/.#.....#./.##...##./...###...'),
    cone: S('.......##/.....####/...###oo#/w##oooooo/w##oowooo/...###oo#/.....####/.......##/.........'),
    bird: S('#.......#/##.....##/.##...##./..##o##../...ooo.../...#w#.../....#..../...#.#.../..#...#..'),
    bubbles: S('......oo./.....o..o/.oo...oo./o..o...../o..o..o../.oo..o.o./......o../..ooo..../.o...o...'),
    wave: S('........./...ooo.../..o###o../.o##..##./o##....../##....#../#....###./##..#####/#########'),
    whirl: S('.#######./#.......#/#.#####.#/#.#...#.#/#.#.#.#.#/#.#.###.#/#.#.....#/#.#######/.........'),
    jet: S('........./.......o./o..oooooo/#########/#oooooooo/#########/o..oooooo/.......o./.........'),
    rain: S('..####.../.######../########./.......#./o.o.o.o../.o.o.o.o./o.o.o.o../.o.o.o.o./.........'),
    burst: S('#...#...#/.#..#..#./..#...#../........./##..w..##/........./..#...#../.#..#..#./#...#...#'),
    tornado: S('#########/.#######./..#####../...####../...###.../....##.../....#..../...##..../...#.....'),
    blades: S('..##...../...##..../....##.../...##..##/..##....#/......##./.....##../....##.../.........'),
    up: S('....#..../...###.../..#####../.###o###./...#o#.../...#o#.../...#o#.../...###.../.........'),
    dash: S('........./....##.../##..###../....####./###.#####/....####./##..###../....##.../.........'),
    spikes: S('........./....#..../#...#...#/#..###..#/##.###.##/##.###.##/#########/#########/xxxxxxxxx'),
    boulder: S('........./..#####../.##o####./##oo#####/##o####x#/########x/.######x./..#xxxx../.........'),
    quake: S('#.......#/.#.....#./........./####.####/#####.###/####.####/###.#####/####.####/xxxxxxxxx'),
    wall: S('#########/x##x##x##/#########/##x##x##x/#########/x##x##x##/#########/##x##x##x/#########'),
    slide: S('##......./###....../####.#.../#####..../######.#./#######../########./#########/xxxxxxxxx'),
    chain: S('w...w..../#...#..../.#...#.../##..##.../.#...#..w/..#...#.#/.##..##.#/..#...###/..w...#..'),
    bolt: S('.....www./....www../...www.../..wwwwww./.....ww../....ww.../...ww..../..ww...../.w.......'),
    orb: S('........./...###.../..#ooo#../.#oowoo#./.#owwwo#./.#oowoo#./..#ooo#../...###.../.........'),
    field: S('........./..w...w../.##.#.##./#.......#/#..w.w..#/#.......#/#...w...#/xxxxxxxxx/.........'),
    snow: S('#...o..../.#......./#.#..#.#./.....o.../..o.#.#../........./#.#...o../.#...#.#./#.#......'),
    nova: S('o...o...o/.o.....o./..#####../o.#...#.o/..#.w.#../o.#...#.o/..#####../.o.....o./o...o...o'),
    icicle: S('#########/.###.###./.##...##./.#o...o#./..#....#./..o....../.......o./..#....../.........'),
    whip: S('#......../.#....#../..#..#.#./...##...#/........#/.......#./......#../...o.#.../....#....'),
    mushroom: S('..#####../.#o###o#./#########/#o##o##o#/...www.../...www.../...www.../..wwwww../.........'),
    seeds: S('........./.n...n.../...n...n./.n..n..../n...n..n./..n...n../.n..n...n/........./#.#.#.#.#'),
    roots: S('....#..../..#.#.#../.#..#..#./.#.###.#./..#####../...###.../..#.#.#../.#..#..#./#...#...#'),
    flower: S('...p.p.../..ppypp../...ppp.../....#..../.##.#..../..###.##./....###../....#..../xxxxxxxxx'),
    orbEyes: S('...xxx.../.xx###xx./.x#####x./x#r###r#x/x#######x/x#######x/.x#####x./.xx###xx./...xxx...'),
    eyes: S('.xx...xx./xxxxxxxxx/xx#xxx#xx/xrrxxxrrx/xxxxxxxxx/.xxxxxxx./..xx.xx../.x......./.........'),
    hand: S('.#.#.#.#./.#.#.#.#./.#######./..#####../...###.../...###.../...###.../..#####../xxxxxxxxx'),
    tendril: S('........#/......##./.....#.../....#..../...##..../..#....../.##....../#..#...../#........'),
    clone: S('..x...o../.xxx.ooo./..x...o../.xxx.ooo./x.x.o.o.o/..x...o../.x.x.o.o./.x.x.o.o./.........'),
    shuriken: S('....#..../....##.../#...#..../.####o.../..#ow#.../...o####./....#...#/...##..../....#....'),
    behind: S('..####.../.#....#../#......#./#.......#/#.....###/#......#./.#......./..o.o.o../xxxxxxxxx'),
    smoke: S('...ooo.../..ooooo../.oooo#oo./oo#ooooo./.ooooo#oo/..ooooo../...#k#.../...kkk.../....k....'),
    kunai: S('........w/.......w./......#../.....#.../....#..../...g...../..g....../.o......./o.o......'),
    heal: S('........./...ooo.../...owo.../.ooowooo./.owwwwwo./.ooowooo./...owo.../...ooo.../.........'),
    flash: S('o...w...o/.o..w..o./..o.w.o../...www.../wwwwwwwww/...www.../..o.w.o../.o..w..o./o...w...o'),
    angel: S('..ooooo../....w..../oo..w..oo/ooo.w.ooo/.oowwwoo./..o.w.o../....w..../...w.w.../.........'),
    circle: S('..#####../.#.....#./#..o.o..#/#.......#/#.o.w.o.#/#.......#/#..o.o..#/.#.....#./..#####..'),
    missiles: S('.......o./...##..w./..o#o..../...##.o../......w../.o......./.w...##../.....o#o./......##.'),
    hexagon: S('...###.../..#ooo#../.#ooooo#./#ooowooo#/#oowoooo#/#owooooo#/.#ooooo#./..#ooo#../...###...'),
    cloud: S('........./...###.../.##ooo##./#ooooooo#/#oo#oo#o#/#ooooooo#/.#######./........./.........'),
    pool: S('........./........./.....o.../..o.....o/.....o.../..ooo..../.#######./#########/.xxxxxxx.'),
    snake: S('.......##/......#r#/......##./..##..#../.#..#.#../#....#.../#......../.#......./..##.....'),
    spread: S('o.......o/.#.....#./..#...#../...#.#.../....o..../...#.#.../..#...#../.#.....#./o.......o'),
    spear: S('........w/.......oo/......#o./.....#.../....#..../...#...../..#....../.#......./#........'),
    orbs3: S('....o..../...ooo.../....o..../........./.o.....o./ooo...ooo/.o.....o./........./.........'),
    burstMark: S('#...#...#/.#.....#./...ooo.../#.o...o.#/..o.w.o../#.o...o.#/...ooo.../.#.....#./#...#...#'),
    siphon: S('#......../##......./..#.o..../...#.o.../....#.o../.....#.#./......###/......###/.......#.'),
    rage: S('........./.##...##./.#.#.#.#./..#...#../........./..#...#../.#.#.#.#./.##...##./.........'),
    cage: S('.w.....w./w.w...w.w/w..w.w..w/w.w...w.w/w..w.w..w/w.w...w.w/w..w.w..w/.w.....w./xxxxxxxxx'),
    soul: S('....o..../...oo..../...ooo.../..oowo.../..owwoo../..owwwo../...ooo.../...o.o.../..o...o..'),
    skeleton: S('...www.../..wkwkw../...www.../....w..../..wwwww../....w..../...www.../...w.w.../..w...w..'),
    skull: S('..wwwww../.wwwwwww./wwwwwwwww/wkkwwwkkw/wkkwwwkkw/wwwwkwwww/.wwwwwww./..wkwkw../..wwwww..'),
    aura: S('..#.#.#../.#.....#./#...w...#/...www.../#...w...#/...w.w..#/#.......#/.#.....#./..#.#.#..'),
    saw: S('....g..../.g.ggg.g./..ggggg../gggkkkggg/.ggk.kgg./gggkkkggg/..ggggg../.g.ggg.g./....g....'),
    ball: S('g......../.g......./..g....../...g...../....###../...#####./...##o##./...#####./....###..'),
    cannon: S('........./......y../####.yyy./#gggg.y../#gggg..../####...../.k......./kkk....../.k.......'),
    trap: S('........./w.w.w.w.w/#.#.#.#.#/#.......#/.#.....#./..#####../#########/....#..../.........'),
    shield: S('#########/#ooooooo#/#o#####o#/#o#####o#/.#o###o#./.#o###o#./..#ooo#../...#o#.../....#....'),
    pit: S('........./........./........./..#####../.#.###.#./#.#.o.#.#/.#.###.#./..#####../.........'),
    coffin: S('...###.../..#o#o#../..#####../..o#o#o../..#####../..#o#o#../..#####../..o#o#o../...###...'),
    bug: S('.#.....#./..#...#../...###.../#.#bbb#.#/.#bbobb#./#.#bbb#.#/.#bbbbb#./..#bbb#../...###...'),
    geyser: S('...ooo.../..o###o../...###.../...###.../...###.../...###.../..#####../x.#####.x/xxxxxxxxx'),
    crack: S('........./........./........./xxxxxxxxx/xx#xxxxx#/x#x#xxx#x/#xxx#x#xx/xxxxx#xxx/xxxxxxxxx'),
    shards: S('......kk./...kk..../#.......k/#kkkkk.../#......../#...kkkk./#......../......kk./.........'),
    hail: S('..####.../.######../########./........./.w...w.../..w...w../...ww...w/.w...w.../..w...ww.'),
    cloudBolt: S('..###..../.#####.../#w###w#../#######../..ww...../...ww..../..ww...../...w...../.........'),
    gust: S('........./oooooo.../......o../ooooooo.o/........./oooooooo./........o/ooooo..o./.........'),
    ringStorm: S('..#.#.#../.#.....#./#.......#/..w...w../#.......#/..w...w../#.......#/.#.....#./..#.#.#..'),
    meteor: S('........./o.o....../.o.o...../..o.o..../...###.../..#xx##../.##x####./..#####../xxxxxxxxx'),
    constellation: S('w......../.#......./..#....w./...#..#../....w#.../....#..../...#...../..w....../.........'),
    comet: S('........./#......../.##....../..###..../...####../....#oow./.....oww./......w../.........'),
    planet: S('........./...###.../..#####../ooooooooo/o.#####.o/..#####../...###.../........./.........'),
    tear: S('....w..../...wkw.../...wkw.../..wkkkw../..wkkkw../..wkkkw../...wkw.../...wkw.../....w....'),
    erase: S('........./........./wwwwwwwww/kkkkkkkkk/k.k.k.k.k/kkkkkkkkk/wwwwwwwww/........./.........'),
    point: S('#.......#/.#.....#./...www.../..wkkkw../..wkkkw../..wkkkw../...www.../.#.....#./#.......#'),
    glitch: S('####...../..######./........./#####..../...######/..##...../######.../....#####/.........'),
    lift: S('....#..../...###.../..#####../........./...ooo.../..ooooo../...ooo.../..#.#.#../.#.#.#.#.'),
    waves: S('#......../.#...#.../..#...#../..#....#./..#....#./..#....#./..#...#../.#...#.../#........'),
    thought: S('.#######./#ooooooo#/#ooxoxoo#/#ooooooo#/.#######./...##..../..##...../.#......./.........'),
    rocks: S('.n......./nnn...nn./.n...nnnn/.....nn../..nn...../.nnnn..n./..nn..nnn/........n/#.#.#.#.#'),
    crystals: S('....o..../...o#o.../..o###.../.o.###.o./#o.###o#./#o.###o#./#o.###o#./#########/xxxxxxxxx'),
    prism: S('........r/....#..y./...#o#G../w.#ooo#../.#ooooo#b/#########/........./........./.........'),
    turret: S('...o...../..o#o..w./..###.w../..###w.../..###..../..###..../.#####.../#######../xxxxxxxxx'),
    geode: S('........./..ggggg../.ggggggg./gg#o#ogg./gg#####gg/ggo#o#ogg/.ggggggg./..ggggg../.........'),
    beam: S('...ooo.../...owo.../...owo.../...owo.../...owo.../...owo.../...owo.../.ooowooo./xxxxxxxxx'),
    phases: S('.kk...#o./k..k.#oo./k..k.#oo./.kk...#o./........./.#o...oo./#ooo.oooo/#ooo.oooo/.#o...oo.'),
    zzz: S('#####..../...#...../..#....../.#......./#####..../.....###./......#../.....#.../.....###.'),
    leap: S('...###.../..#...#../.#.....#./.#.....#./#.......#/#.......#/#.....###/#......#./xxxxxxxxx'),
    arrow: S('........./........./......w../.......w./#ooooooow/.......w./......w../........./.........'),
    sweep: S('w......../.oo....../.#oo...../..#oo..../...#oo.../....#oo../.....#oo./......#o./xxxxxxxxx'),
    corona: S('o.o.o.o.o/.#######./o#.....#o/.#.....#./o#.....#o/.#.....#./o#.....#o/.#######./o.o.o.o.o'),
    sunspot: S('....o..../...o#o.../....#..../....#..../...###.../...###.../..kkkkk../#kkkkkkk#/#########'),
    sun: S('..o...o../...ooo.../.o#####o./..#oww#../.o#ow##o./..#####../...ooo.../..o...o../.........'),
    pull: S('rrr....../gg...#.../gg..##.../gg.######/gg..##.../gg...#.../bbb....../........./.........'),
    push: S('#...#...#/.#.....#./..#...#../........./...rrbb../........./..#...#../.#.....#./#...#...#'),
    rail: S('........./..o...o../.o.o.o.o./yyyyyyyyy/wwwwwwwww/yyyyyyyyy/.o.o.o.o./..o...o../.........'),
    mine: S('........./........./........./....w..../..rrbb.../..rrbb.../.ggggggg./#########/.........'),
    swap: S('..r....../.rrrrrrr./..r....../........./r.......b/........./......b../.bbbbbbb./......b..'),
    bubbleClock: S('..#####../.#.....#./#..www..#/#.w.w.w.#/#.w.ww.w#/#.w...w.#/#..www..#/.#.....#./..#####..'),
    rewind: S('........./...#...#./..##..##./.###.###./####.####/.###.###./..##..##./...#...#./.........'),
    ffwd: S('........./.#...#.../.##..##../.###.###./####.####/.###.###./.##..##../.#...#.../.........'),
    hourglass: S('#########/.#ooooo#./..#ooo#../...#o#.../....#..../...#.#.../..#.o.#../.#ooooo#./#########'),
    slash2: S('........#/.......#./..o...#../.o...#.../o...#..../...#...../..#....../.#......./#........'),
    crush: S('#.#.#.#.#/.#.#.#.#./#########/........./..#####../.#######./..#####../xxxxxxxxx/.........'),
    flip: S('..#...o../.###..o../#####.o../..#...o../..#...o../..#...o../..#.ooooo/..#..ooo./..#...o..'),
    bomb: S('......w../.....o.w./....o..../..#####../.#xxxx##./.#x#####./.#######./.#######./..#####..'),
    ringG: S('..#####../.#.....#./#...o...#/#..ooo..#/#...o...#/#..o.o..#/#.......#/.#.....#./..#####..'),
    clap: S('#...o...#/.#.....#./...#.#.../..##.##../..##.##../..##.##../...#.#.../.#.....#./#.......#'),
    speaker: S('#######../#..o..#../#.....#.#/#.ooo.#../#ooooo#.#/#.ooo.#../#######../........./.........'),
    bounce: S('o......../.o.....o./..o...o.o/...o.o.../....#..../........./........./........./xxxxxxxxx'),
    notes: S('..######./..#....#./..#....#./..#....#./.##...##./###..###./##...##../........./.........'),
    scream: S('.#...#.../#.#.#.#../###.###../#.#.#.#../........./....#..../...#.#.../...###.../...#.#...'),
    drops: S('..o....../.ooo...o./.owo..ooo/..o...owo/........o/....o..../...ooo.../...owo.../....o....'),
    condense: S('o...o...o/.o.....o./...###.../o.#ooo#.o/..#owo#../o.#ooo#.o/...###.../.o.....o./o...o...o'),
    wisps: S('.o.....o./oo.....oo/........./....o..../...oo..../........./.o.....o./oo....oo./.........'),
    ghost: S('...ooo.../..owowo../..ooooo../..o.o.o../........./....#..../...###.../....#..../...#.#...'),
    totem: S('..nnnnn../..nwnwn../..nnnnn../.nnnnnnn./..nxnxn../..nnnnn../..nwnwn../..nnnnn../xxxxxxxxx'),
    chainLinks: S('o.......o/.o.....o./..oo.oo../..o.o.o../...ooo.../...o#o.../..o###o../.o.....o./o.......o'),
    bigOrb: S('..#####../.#ooooo#./#oowwooo#/#oowwooo#/.#ooooo#./..#####../....#..../...###.../...#.#...'),
    dice: S('#########/#w.....w#/#.......#/#...w...#/#.......#/#w.....w#/#########/........./.........'),
    fusion: S('........./.###.###./#...#...#/#..#o#..#/#..#o#..#/#...#...#/.###.###./........./.........'),
    shuffle: S('#.......#/.#.....#./..#...#../...#.#.../....#..../...#.#.../..#...#../###...###/.........'),
    chaosBurst: S('#.#...#.#/.#..#..#./#.#...#.#/...#.#.../.#.###.#./...#.#.../#.#...#.#/.#..#..#./#.#...#.#'),
  };

  /** Which icon each element's 5 skills use (in skill order). */
  const ICONS = {
    fire: ['fireball', 'pillars', 'spin', 'cone', 'bird'],
    water: ['bubbles', 'wave', 'whirl', 'jet', 'rain'],
    wind: ['burst', 'tornado', 'blades', 'up', 'dash'],
    earth: ['spikes', 'boulder', 'quake', 'wall', 'slide'],
    lightning: ['chain', 'bolt', 'dash', 'orb', 'field'],
    ice: ['spikes', 'snow', 'orb', 'nova', 'icicle'],
    nature: ['whip', 'mushroom', 'seeds', 'roots', 'flower'],
    darkness: ['orbEyes', 'eyes', 'hand', 'wave', 'tendril'],
    shadow: ['clone', 'shuriken', 'behind', 'smoke', 'kunai'],
    light: ['nova', 'pillars', 'heal', 'flash', 'angel'],
    arcane: ['circle', 'orb', 'up', 'missiles', 'hexagon'],
    poison: ['cloud', 'rain', 'pool', 'snake', 'spread'],
    blood: ['spear', 'orbs3', 'burstMark', 'siphon', 'rage'],
    death: ['cage', 'soul', 'skeleton', 'skull', 'aura'],
    metal: ['saw', 'ball', 'cannon', 'trap', 'shield'],
    sand: ['pit', 'coffin', 'bug', 'clone', 'tornado'],
    magma: ['geyser', 'boulder', 'pool', 'crack', 'shards'],
    storm: ['hail', 'cloudBolt', 'gust', 'rain', 'ringStorm'],
    cosmic: ['meteor', 'constellation', 'cloud', 'comet', 'planet'],
    void: ['tear', 'erase', 'dash', 'point', 'glitch'],
    psychic: ['lift', 'blades', 'waves', 'thought', 'rocks'],
    crystal: ['crystals', 'prism', 'nova', 'turret', 'geode'],
    moon: ['beam', 'phases', 'zzz', 'leap', 'arrow'],
    solar: ['sweep', 'corona', 'gust', 'sunspot', 'sun'],
    magnetism: ['pull', 'push', 'rail', 'mine', 'swap'],
    time: ['bubbleClock', 'rewind', 'ffwd', 'hourglass', 'slash2'],
    gravity: ['crush', 'up', 'flip', 'bomb', 'ringG'],
    sound: ['clap', 'speaker', 'bounce', 'notes', 'scream'],
    mist: ['cloud', 'spear', 'dash', 'drops', 'condense'],
    spirit: ['wisps', 'ghost', 'totem', 'chainLinks', 'bigOrb'],
    chaos: ['dice', 'fusion', 'glitch', 'shuffle', 'chaosBurst'],
  };

  const FIXED = { w: '#ffffff', k: '#05030a', r: '#ff3a4a', b: '#4a6aff', g: '#8a90a0', y: '#ffd34d', n: '#7a5236', G: '#5fd84a', p: '#ff9ad0' };
  const cache = new Map();

  /** The colours a symbol uses for an element ('rainbow' for Chaos). */
  function colours(elId, dim, color) {
    const el = ERX.Elements.get(elId);
    const c = dim ? '#4a4e6a' : color || el.color, C = ERX.Color;
    return { '#': c, o: dim ? '#6a6e8a' : C.mix(c, '#ffffff', 0.5), x: dim ? '#2a2e48' : C.shade(c, -0.45) };
  }

  /** Bake a pattern into a small canvas (cached). */
  function bake(rows, elId, dim, frame, color) {
    const key = rows.join('') + elId + (dim ? 1 : 0) + (frame || 0) + (color || '');
    let cv = cache.get(key);
    if (cv) return cv;
    const P = colours(elId, dim, color), w = rows[0].length, h = rows.length;
    cv = ERX.makeCanvas(w, h);
    const c = cv.getContext('2d');
    const rainbow = elId === 'chaos' && !dim;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === '.') continue;
      let col = P[ch] || FIXED[ch] || P['#'];
      if (rainbow && (ch === '#' || ch === 'o' || ch === 'x')) col = ERX.Abilities.toHex(ERX.Abilities.rainbowColor((x + y) * 0.12 + (frame || 0) * 0.25 + (ch === 'x' ? 1 : 0)));
      if (dim && FIXED[ch]) col = '#5a5e7a';
      c.fillStyle = col;
      c.fillRect(x, y, 1, 1);
    }
    cache.set(key, cv);
    if (cache.size > 600) cache.delete(cache.keys().next().value);
    return cv;
  }

  function put(ctx, cv, cx, cy, scale) {
    const w = cv.width * scale, h = cv.height * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cv, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
  }

  const Symbols = {
    ELEMENT, GLYPH, ICONS,
    /** Icon name for an element's skill slot ('s1'..'s5'). */
    iconOf(elId, slot, awakened) {
      const kit = awakened && ERX.Awakening && ERX.Awakening.kit(elId);
      const list = kit && kit.icons ? kit.icons : ICONS[elId];
      return list ? list[+slot.slice(1) - 1] : null;
    },

    element(ctx, elId, cx, cy, scale, o) {
      o = o || {};
      const rows = ELEMENT[elId]; if (!rows) return;
      const frame = elId === 'chaos' ? Math.floor((o.t || 0) * 8) % 12 : 0;
      if (o.glow) {
        // a glowing outline: draw it white, offset all around, then the symbol on top
        const halo = bake(rows.map((r) => r.replace(/[^.]/g, 'w')), elId, false, 0);
        ctx.save(); ctx.globalAlpha *= o.glow * 0.7;
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) put(ctx, halo, cx + dx, cy + dy, scale);
        ctx.restore();
      }
      put(ctx, bake(rows, elId, o.dim, frame, o.color), cx, cy, scale);
    },

    move(ctx, elId, slot, cx, cy, scale, o) {
      o = o || {};
      const rows = GLYPH[Symbols.iconOf(elId, slot, o.awakened)]; if (!rows) return;
      const frame = elId === 'chaos' ? Math.floor((o.t || 0) * 8) % 12 : 0;
      put(ctx, bake(rows, elId, o.dim, frame, o.color), cx, cy, scale);
    },
  };

  ERX.Symbols = Symbols;
})(window.ERX = window.ERX || {});
