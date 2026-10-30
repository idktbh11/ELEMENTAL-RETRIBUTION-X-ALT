/*
 * STORY: the top of the elevator — the sealed chamber, the rainbow orb,
 * the awakening, and THE REVEAL (the only place an element is ever assigned).
 * Right after the reveal: a hard cut to THE VOID (story-void.js).
 */
(function (ERX) {
  'use strict';

  const sfx = (n, o) => ERX.Audio.playSfx(n, o);

  // ===================================================== ELEVATOR RIDES
  function* elevatorUp(g) {
    g.lockControls(true);
    g.objective = null;
    g.startElevator(1);
    sfx('ding');
    yield 1.0;
    g.music('elevator');
    g.elev.target = 80;
    yield 6.0;
    // it slows down... and actually arrives. Wow.
    g.elev.target = 0;
    yield 2.6;
    sfx('ding');
    yield 1.0;
    g.travel('vault', { arrive: true });
  }

  // ===================================================== ARRIVAL
  function* vaultArrival(g) {
    const L = g.level;
    g.lockControls(true);
    yield 1.0;
    g.focusCamera(L.orb.x, L.orb.floorY - 40);
    sfx('orbHum', { value: 0.15 });
    yield 2.6;
    g.releaseCamera();
    yield 0.6;
    g.setObjective('INSPECT THE ORB', null, 1);
    g.lockControls(false);
  }

  // ===================================================== THE AWAKENING
  function* touchOrb(g) {
    const o = g.orb, p = g.player;
    g.lockControls(true);
    g.objective = null;
    p.vx = 0;
    p.facing = o.x > p.cx ? 1 : -1;
    g.music(null);
    yield 0.8;
    // it shakes... the glass cracks...
    o.state = 'shaking';
    for (let i = 0; i < 9; i++) {
      o.shake = 0.4 + i * 0.3;
      sfx('orbHum', { value: i / 8, minGap: 0 });
      if (i >= 3) { o.crack = (i - 2) / 6; sfx('glassCrack', { minGap: 0 }); }
      g.shake(0.4 + i * 0.2, 0.3);
      yield 0.34;
    }
    // ...and it BREAKS OUT. Massive shockwave.
    o.shake = 0;
    o.shatter();
    sfx('shatter');
    sfx('shockwave');
    g.flashT = 0.5;
    ERX.FX.shake(7, 0.8);
    g.addShockwave(o.x, o.y, 300, 1.1);
    p.fling(-p.facing * 340, -300);
    yield () => (p.onGround && p.hurtT <= 0.9 ? true : undefined);
    p.hurtT = 0;
    p.lying = true;
    sfx('land');
    g.dust(p.cx, p.feet, 10);
    ERX.FX.shake(2, 0.2);
    yield 1.6;
    p.lying = false;
    p.facing = o.x > p.cx ? 1 : -1;
    yield 0.9;
    // no warning. none.
    o.shake = 2.5;
    sfx('orbHum', { value: 1, minGap: 0 });
    yield 0.45;
    o.shake = 0;
    o.state = 'dash';
    sfx('orbDash');
    yield () => (o.hit ? true : undefined);
    sfx('orbImpact');
    g.flashT = 0.7;
    ERX.FX.shake(6, 0.5);
    // the nebula: power surges through you
    g.startNebula();
    sfx('surge');
    yield 4.0;
    g.neb.lying = true;
    sfx('passOut');
    yield 1.6;
    g.neb.fading = true;   // the screen slowly cuts to black
    yield 3.4;

    // ===================================================== THE REVEAL
    g.startReveal();       // silence. darkness. (the element is decided here)
    const el = g.element();
    yield 5.0;
    g.rev.you = 0;
    sfx('bang');
    yield 1.0;
    g.rev.got = 0;
    sfx('bangHigh');
    yield 0.7;
    sfx('drumroll', { dur: 2.6 });
    g.rev.roll = 0;
    yield 2.6;
    g.rev.elem = 0;
    g.revealBurst();
    const rar = ERX.Elements.rarityOf(el);
    sfx('guitarRiff', { tier: rar.tier });   // every rarity has its own riff; Chaos's is ominous
    sfx('element_' + el.id);
    ERX.FX.shake(4, 0.4);
    yield 1.6;
    // ...and how rare it is
    g.rev.rarity = 0;
    sfx('raritySting', { tier: rar.tier });
    if (rar.tier >= 4) { g.revealBurst(true); g.flashT = rar.tier >= 5 ? 0.6 : 0.3; ERX.FX.shake(rar.tier >= 5 ? 6 : 3, 0.5); }
    yield rar.tier >= 5 ? 4.4 : 3.0;

    // ...and then: an immediate cut to black. You're somewhere else now.
    g.blackout();
    yield 1.6;
    g.loadLevel('void', { intro: true });
  }

  ERX.Story.vault = { elevatorUp, vaultArrival, touchOrb };
})(window.ERX = window.ERX || {});
