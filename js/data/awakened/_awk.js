/*
 * Shared helpers for the AWAKENED kits (js/data/awakened/awk-*.js).
 *
 * An awakened kit (ERX.Awakened[id]) looks like a normal kit (js/data/kits/_kit.js)
 * with a few extras:
 *   color            the awakened colour (fire awakens AZURE...)
 *   m1, s[5], ult    brand-new moves (never a recolour of the normal ones)
 *   dash             { name, style: 'none'|'blink', life, dmg, spawn, update, draw }
 *                    a custom effect spawned when you dash; it can hurt things
 *   guard            { name, sound, draw(ctx, G), hit(g, x, y, d, P) }   the block
 *   idle / run       { pose(t | phase, p) -> joints, fx(ctx, F), step(A, p, dt) }
 *   look             { fx(ctx, F) }   drawn on you the whole time you're awakened
 *   icons            5 icon names for the ability wheel (js/render/symbols.js)
 *
 * Poses are joint sets (see js/render/player-side.js) made from smooth sine motion,
 * so they can be blended frame by frame: nothing snaps.
 * F (for fx): { A, x, y (your feet on screen), d (facing), t, P (colours), p (player),
 *              at(name) -> screen point of 'eye' | 'cheek' | 'headTop' | 'chest' | 'handF' | 'handB' | 'footF' | 'footB' }
 */
(function (ERX) {
  'use strict';

  ERX.Awakened = ERX.Awakened || {};
  const U = ERX.U;
  const S = Math.sin, Co = Math.cos, TAU = Math.PI * 2;
  const wave = (t, speed, ph) => S(t * speed + (ph || 0));

  /** A joint set: standing, with overrides. */
  function J(o) {
    const st = { bob: 0, lean: 0, FL: [[9, 19], [9, 22]], BL: [[7, 19], [7, 22]], FA: [[9, 14], [9, 16]], BA: [[7, 14], [7, 16]] };
    return Object.assign(st, o);
  }
  /** Legs for a running stride at phase ph (radians); stride = reach, lift = knee lift. */
  function stride(ph, reach, lift) {
    const a = S(ph), b = S(ph + Math.PI), ka = Math.max(0, Co(ph)), kb = Math.max(0, Co(ph + Math.PI));
    return {
      FL: [[8.5 + a * reach * 0.5 + 1, 19 - ka * lift], [8.5 + a * reach, 22 - ka * lift * 1.2]],
      BL: [[7.5 + b * reach * 0.5, 19 - kb * lift], [7.5 + b * reach, 22 - kb * lift * 1.2]],
    };
  }

  // ------------------------------------------------------------------ IDLES
  // each returns joints for time t (seconds); o tweaks it per element
  const IDLE = {
    /** Wide, menacing stance; slow heavy breathing; arms loose. */
    menace: (t, o) => J({ bob: 0.5 + 0.5 * wave(t, 1.8), lean: (o && o.lean) || 1, FL: [[10.5, 19], [11.5, 22]], BL: [[5.5, 19], [4.5, 22]], FA: [[9.6, 14.5], [10.2 + wave(t, 1.8) * 0.3, 17.2]], BA: [[6.4, 14.5], [5.8, 17.2]], fist: o && o.fist }),
    /** Hands in pockets, leaning back, weight shifting. */
    pockets: (t) => { const w = wave(t, 0.9); return J({ lean: -1, bob: w > 0.7 ? 1 : 0, FL: [[9.6 + w * 0.4, 19], [10 + w * 0.6, 22]], BL: [[6.4, 19], [6, 22]], FA: [[10.4, 14.2], [9.4, 16.6]], BA: [[5.8, 14.2], [6.6, 16.6]], hideHands: true }); },
    /** Arms crossed, feet planted. */
    crossed: (t, o) => J({ bob: wave(t, 1.4) > 0.6 ? 1 : 0, lean: (o && o.lean) || 0, FL: [[10, 19], [10.5, 22]], BL: [[6, 19], [5.5, 22]], FA: [[10.4, 13.6], [7.2, 13.6]], BA: [[6, 13.6], [9.6, 13]] }),
    /** Hovering, legs dangling, arms slightly out. */
    float: (t, o) => J({ lift: ((o && o.lift) || 4) + wave(t, 2) * 1.6, FL: [[9.6, 19.5], [9.2 + wave(t, 2, 1) * 0.4, 22.5]], BL: [[7, 19.5], [6.4, 22.2]], FA: [[10.6, 14], [12 + wave(t, 2) * 0.5, 15.5]], BA: [[5.4, 14], [4 - wave(t, 2) * 0.5, 15.5]], eyesClosed: o && o.eyesClosed }),
    /** Cross-legged, floating, hands together (meditation). */
    meditate: (t, o) => J({ lift: ((o && o.lift) || 5) + wave(t, 1.5) * 1.2, bob: 1, FL: [[11.5, 20], [8.5, 21.2]], BL: [[4.5, 20], [7.5, 21.2]], FA: [[10.4, 14.6], [9.2, 13.2]], BA: [[6.8, 14.6], [8.4, 13.2]], eyesClosed: !(o && o.open) }),
    /** Fists up, bouncing on the balls of your feet. */
    fists: (t) => { const b = Math.abs(wave(t, 5)); return J({ bob: b > 0.5 ? 1 : 0, lean: 1, FL: [[10.6, 19], [11.4, 22]], BL: [[6, 19], [5, 22]], FA: [[11.2, 13.2], [12.2, 11.2]], BA: [[9.2, 13.4], [10.2, 11.6]], fist: true }); },
    /** Hunched forward, arms hanging long, swaying. */
    hunch: (t) => { const w = wave(t, 1.2); return J({ lean: 2, bob: 1, FL: [[10, 19], [10.6, 22]], BL: [[6, 19], [5.4, 22]], FA: [[10 + w * 0.6, 15.2], [10.8 + w, 19]], BA: [[7, 15.2], [7 + w * 0.6, 19]] }); },
    /** One hand raised (holding something up), the other relaxed. */
    raise: (t) => J({ bob: wave(t, 1.6) > 0.6 ? 1 : 0, FL: [[9.8, 19], [10.2, 22]], BL: [[6.4, 19], [6, 22]], FA: [[10.8, 10.4 + wave(t, 1.6) * 0.3], [11.2, 7.2 + wave(t, 1.6) * 0.5]], BA: [[6.4, 14.4], [6, 16.8]] }),
    /** Both arms open wide, palms up. */
    open: (t) => J({ bob: wave(t, 1.3) > 0.6 ? 1 : 0, FA: [[11.4, 13.4], [13.6, 12.6 + wave(t, 1.3) * 0.4]], BA: [[5, 13.4], [2.8, 12.6 + wave(t, 1.3) * 0.4]] }),
    /** Hand on hip, the other loose, chin up (lean back). */
    hip: (t) => J({ lean: -1, FL: [[10, 19], [10.6, 22]], BL: [[6.6, 19], [6.4, 22]], FA: [[11.6, 14.6], [9.6, 16.2]], BA: [[6.4, 14.4], [6 + wave(t, 1.1) * 0.4, 16.8]] }),
    /** Weapon held low and ready (a blade stance). */
    blade: (t) => J({ lean: 1, bob: wave(t, 1.6) > 0.7 ? 1 : 0, FL: [[11, 19], [12, 22]], BL: [[5.6, 19], [4.6, 22]], FA: [[11, 15], [12.6, 16.4]], BA: [[7.2, 14.2], [8.6, 15.4]] }),
    /** Hands behind your back, very regal. */
    regal: (t) => J({ lean: -1, bob: wave(t, 0.8) > 0.8 ? 1 : 0, FA: [[8.4, 14.6], [6.6, 16.2]], BA: [[6.2, 14.6], [6.4, 16.4]], hideHands: true }),
    /** Hands behind your head, relaxed. */
    lazy: (t) => J({ lean: -1, bob: wave(t, 0.6) > 0.8 ? 1 : 0, FL: [[9.8, 19], [10.6, 22]], BL: [[6.6, 19], [6.2, 22]], FA: [[11, 11], [7, 8.4]], BA: [[5.4, 11], [6.6, 8.6]], eyesClosed: wave(t, 0.35) > 0.6 }),
    /** Two fingers to the temple. */
    temple: (t, o) => J({ lift: ((o && o.lift) || 2) + wave(t, 1.7) * 1, FA: [[11, 12.6], [10.4, 9.4]], BA: [[6.2, 14.4], [5.4, 16.6]], FL: [[9.4, 19.2], [9.2, 22.2]], BL: [[7.2, 19.2], [6.8, 22.2]] }),
    /** Checking your wristwatch, tapping your foot. */
    watch: (t) => { const tap = Math.max(0, wave(t, 6)) > 0.5; return J({ FL: [[10, 19], [11, tap ? 21.2 : 22]], BL: [[6.6, 19], [6.2, 22]], FA: [[11, 13.2], [9.2, 12.2]], BA: [[6.4, 14.4], [6, 16.8]] }); },
    /** Palms pressing down at the floor (holding something heavy down). */
    press: (t) => J({ bob: 1, FL: [[10.8, 19.4], [11.6, 22]], BL: [[5.6, 19.4], [4.8, 22]], FA: [[11, 15], [12.8, 16.2 + wave(t, 2) * 0.4]], BA: [[5.6, 15], [3.8, 16.2 + wave(t, 2) * 0.4]] }),
    /** Headbanging, hands on your ears (headphones). */
    headbang: (t) => { const b = Math.max(0, wave(t, 7)); return J({ bob: b > 0.5 ? 1 : 0, lean: b > 0.5 ? 1 : 0, FA: [[10.8, 12.4], [10, 9.6]], BA: [[5.8, 12.4], [6, 9.8]], FL: [[9.8, 19], [10.4, 22]], BL: [[6.4, 19], [6, 22]] }); },
    /** Arms waving slowly like water. */
    flow: (t) => J({ bob: wave(t, 1.2) > 0.5 ? 1 : 0, FA: [[11 + wave(t, 1.6) * 0.6, 13 + wave(t, 1.6, 1) * 1.4], [13 + wave(t, 1.6, 0.6) * 1.2, 12 + wave(t, 1.6, 1.6) * 2]], BA: [[5 - wave(t, 1.6, 2) * 0.6, 13 + wave(t, 1.6, 3) * 1.4], [3 - wave(t, 1.6, 2.6) * 1.2, 12 + wave(t, 1.6, 3.6) * 2]], FL: [[9.6, 19], [10, 22]], BL: [[6.6, 19], [6.2, 22]] }),
    /** Arms out at the sides, palms forward, as if holding the air. */
    spread: (t, o) => J({ lift: (o && o.lift) || 0, FA: [[11.2, 14.2], [13 + wave(t, 1.4) * 0.3, 15.6]], BA: [[5.2, 14.2], [3.4 - wave(t, 1.4) * 0.3, 15.6]], noLegs: o && o.noLegs }),
    /** Arms limp, floating with toes pointed down (ghostly). */
    limp: (t, o) => J({ lift: ((o && o.lift) || 5) + wave(t, 1.3) * 2, FL: [[8.8, 19.6], [8.6, 22.8]], BL: [[7.4, 19.6], [7.2, 22.8]], FA: [[9.6, 15], [9.8, 18]], BA: [[6.8, 15], [6.6, 18]], eyesClosed: o && o.eyesClosed }),
    /** Raising both arms halfway to the sky. */
    sky: (t) => J({ FA: [[11, 11.4], [12.6, 8.6 + wave(t, 1.5) * 0.4]], BA: [[5.4, 11.4], [3.8, 8.6 + wave(t, 1.5) * 0.4]], bob: wave(t, 1.5) > 0.6 ? 1 : 0 }),
    /** Swaying slowly from side to side, arms loose (woozy). */
    sway: (t) => { const s = wave(t, 1.1); return J({ lean: Math.round(s * 1.4), bob: 1, FL: [[9.8, 19], [10.4, 22]], BL: [[6.4, 19], [6, 22]], FA: [[9.6 + s, 15], [10 + s * 2, 18]], BA: [[6.8 + s, 15], [6.6 + s * 2, 18]] }); },
    /** A weapon resting on your shoulder. */
    shoulder: (t) => J({ lean: -1, FL: [[10.4, 19], [11.2, 22]], BL: [[6.2, 19], [5.6, 22]], FA: [[10.6, 12.4], [9.6, 10.2]], BA: [[6.4, 14.4], [6 + wave(t, 1) * 0.3, 16.8]] }),
    /** Crouched, both claws raised and ready. */
    claws: (t) => { const s = wave(t, 3); return J({ bob: 2, lean: 1, FL: [[11, 19.6], [12, 22]], BL: [[5.4, 19.6], [4.4, 22]], FA: [[11.6, 13.6], [13.4, 12 + s * 0.6]], BA: [[5, 13.6], [3.6, 12 - s * 0.6]] }); },
    /** Both palms held out in front, controlling something unseen. */
    palms: (t) => J({ lean: 0, FL: [[10, 19], [10.6, 22]], BL: [[6.4, 19], [6, 22]], FA: [[11.6, 13.4], [14 + wave(t, 1.6) * 0.4, 13 + wave(t, 1.6, 1) * 0.6]], BA: [[10.8, 13.6], [13.4 - wave(t, 1.6) * 0.3, 13.6 - wave(t, 1.6, 1) * 0.4]] }),
    /** Superhero landing: one knee down, fist on the floor. */
    kneel: (t) => J({ bob: 3, lean: 2, FL: [[11.6, 19.6], [12.4, 22]], BL: [[6, 21], [3.6, 22]], FA: [[11.4, 16.4], [12, 21.6]], BA: [[6.4, 15], [5, 17.4 + wave(t, 1.2) * 0.4]], fist: true }),
    /** Perfectly still in the air, arms at your sides (unsettling). */
    still: (t) => J({ lift: 6, FL: [[8.8, 19.6], [8.6, 22.6]], BL: [[7.4, 19.6], [7.2, 22.6]], FA: [[9.2, 14.4], [9.2, 17.2]], BA: [[7, 14.4], [7, 17.2]] }),
  };

  // ------------------------------------------------------------------- RUNS
  // each returns joints for stride phase ph (radians, one stride = TAU)
  const RUN = {
    /** Leaning hard forward, arms trailing straight back (ninja run). */
    ninja: (ph) => Object.assign(J({ lean: 3, bob: Math.abs(S(ph)) > 0.7 ? 1 : 0, FA: [[6.2, 13.6], [3, 14.6]], BA: [[6.4, 12.8], [3.2, 13.6]] }), stride(ph, 4.2, 2.4)),
    /** Big arm pumps, heavy steps. */
    sprint: (ph) => Object.assign(J({ lean: 1, bob: S(ph * 2) > 0.3 ? 1 : 0, FA: [[9 + S(ph) * 2, 13], [10.5 + S(ph) * 2.8, 12.2 - Co(ph) * 0.8]], BA: [[7 - S(ph) * 2, 13], [6 - S(ph) * 2.8, 12.6 + Co(ph) * 0.8]], fist: true }), stride(ph, 3.6, 2)),
    /** Long skating glides: one leg pushes behind while the other glides forward. */
    skate: (ph, o) => { const a = S(ph); return J({ lean: 1, bob: 1, FL: [[10.4 + a * 1.2, 19.4], [11.8 + a * 2.2, 22]], BL: [[6.4 - a * 1.2, 19], [4 - a * 2.6, 21.2 + Math.max(0, a) * 0.8]], FA: (o && o.pockets) ? [[10.4, 14.2], [9.4, 16.6]] : [[10.8, 14 + a], [12.4, 15 + a * 1.6]], BA: (o && o.pockets) ? [[5.8, 14.2], [6.6, 16.6]] : [[5.4, 14 - a], [3.6, 15 - a * 1.6]], hideHands: o && o.pockets }); },
    /** Hovering forward: legs trailing, body leaning in. */
    hover: (ph, o) => J({ lift: ((o && o.lift) || 5) + S(ph * 0.5) * 1, lean: (o && o.lean) || 2, FL: [[8.4, 19.8], [6.6, 22]], BL: [[7, 19.8], [5, 21.6]], FA: (o && o.arms) || [[7.6, 14], [5.4, 15.6]], BA: (o && o.armsB) || [[6.6, 14], [4.6, 15.2]] }),
    /** Crouched, riding a board (water / sand). */
    surf: (ph) => J({ bob: 2, lean: 1, lift: 3 + S(ph * 0.5) * 1.5, FL: [[11.6, 20], [12.4, 22]], BL: [[5, 20], [4.2, 22]], FA: [[11.4, 14 + S(ph * 0.5)], [13.6, 13.4 + S(ph * 0.5) * 1.5]], BA: [[5.4, 14 - S(ph * 0.5)], [3.2, 13.4 - S(ph * 0.5) * 1.5]] }),
    /** Running with the arms spread wide behind (like wings). */
    airplane: (ph) => Object.assign(J({ lean: 2, lift: 1, FA: [[7.4, 13.4], [4.4, 12.6 + S(ph) * 0.6]], BA: [[6.8, 13.2], [3.4, 11.8 + S(ph) * 0.6]] }), stride(ph, 3.4, 2)),
    /** Skipping happily (bigger bounce, swinging arms). */
    skip: (ph) => Object.assign(J({ lift: Math.max(0, S(ph)) * 3, FA: [[10.6, 13.4], [12.4, 12 + S(ph) * 1.6]], BA: [[5.6, 13.4], [4, 12 - S(ph) * 1.6]] }), stride(ph, 2.8, 2.6)),
    /** Low and feral, claws reaching forward. */
    feral: (ph) => Object.assign(J({ lean: 4, bob: 1, FA: [[11.4, 15], [13.6 + S(ph) * 1.4, 17 + Co(ph)]], BA: [[10.6, 15], [12.6 - S(ph) * 1.4, 17.6 - Co(ph)]] }), stride(ph, 4.4, 2.2)),
    /** Stiff robotic march. */
    march: (ph) => { const a = S(ph) > 0 ? 1 : -1; return J({ FL: [[9 + a * 1.2, 19], [9 + a * 2.2, 22]], BL: [[7 - a * 1.2, 19], [7 - a * 2.2, 22]], FA: [[9 - a, 14], [9 - a * 2, 16.4]], BA: [[7 + a, 14], [7 + a * 2, 16.4]], bob: Math.abs(S(ph)) > 0.9 ? 1 : 0 }); },
    /** Gliding while tilted back, feet together (ghostly). */
    glide: (ph) => J({ lift: 3 + S(ph * 0.5) * 1, lean: -1, FL: [[8.6, 19.6], [8, 22.6]], BL: [[7.4, 19.6], [6.8, 22.6]], FA: [[9.2, 15], [8.4, 18]], BA: [[6.6, 15], [5.6, 17.8]] }),
    /** Big floaty low-gravity bounds. */
    bound: (ph) => J({ lift: Math.abs(S(ph * 0.5)) * 9, lean: 1, FL: [[10.6, 18.6], [11, 21.4]], BL: [[6, 19.6], [4.6, 21.6]], FA: [[11, 12.6], [12.6, 11]], BA: [[5.6, 13], [4, 14.6]] }),
    /** Standing tall on something that carries you, arms crossed. */
    ride: (ph, o) => J({ lift: ((o && o.lift) || 5) + S(ph * 0.5) * 1, lean: 1, FL: [[9.6, 19], [10, 22]], BL: [[6.8, 19], [6.4, 22]], FA: [[10.4, 13.6], [7.2, 13.6]], BA: [[6, 13.6], [9.6, 13]] }),
    /** Sunk into the ground, swimming forward (no legs). */
    sink: (ph) => J({ lean: 3, bob: 2, noLegs: true, FA: [[6.4, 14.4], [3.4, 15.6 + S(ph) * 0.6]], BA: [[6.8, 14], [3.8, 15 - S(ph) * 0.6]] }),
    /** A heavy, charging bull run. */
    charge: (ph) => Object.assign(J({ lean: 2, bob: S(ph * 2) > 0 ? 1 : 0, FA: [[10.4 + S(ph) * 2.4, 14.4], [11.6 + S(ph) * 3.2, 16.4]], BA: [[6.6 - S(ph) * 2.4, 14.4], [5.4 - S(ph) * 3.2, 16.4]], fist: true }), stride(ph, 4.6, 1.6)),
    /** A cool dance-like groove step. */
    groove: (ph) => Object.assign(J({ bob: S(ph * 2) > 0 ? 1 : 0, lean: S(ph) > 0 ? 1 : 0, FA: [[10.8, 12.6 + S(ph * 2)], [12.4, 11 + S(ph * 2) * 2]], BA: [[5.6, 13], [4.4, 14.6 - S(ph * 2)]] }), stride(ph, 3, 2.4)),
    /** An elegant run, arms low and swinging. */
    elegant: (ph) => Object.assign(J({ lean: 1, FA: [[9.6 + S(ph), 14.4], [10.6 + S(ph) * 1.6, 17]], BA: [[6.6 - S(ph), 14.4], [5.8 - S(ph) * 1.6, 17]] }), stride(ph, 3.4, 1.8)),
    /** Creeping: long slow strides, hunched, arms dangling. */
    creep: (ph) => Object.assign(J({ lean: 2, bob: 1, FA: [[10.4, 15.4], [11 + S(ph) * 1.2, 19]], BA: [[7, 15.4], [7 - S(ph) * 1.2, 19]] }), stride(ph, 4, 1.2)),
    /** A gentle slither, wobbling side to side. */
    slither: (ph) => Object.assign(J({ lean: 2 + (S(ph * 2) > 0 ? 1 : 0), bob: 2, FA: [[10, 15 + S(ph * 2)], [12, 16.6 + S(ph * 2)]], BA: [[6.6, 15 - S(ph * 2)], [4.6, 16.6 - S(ph * 2)]] }), stride(ph, 3, 1)),
    /** Darting: very low, arms swept back, quick short strides. */
    dart: (ph) => Object.assign(J({ lean: 4, bob: 1, FA: [[6.4, 14.6], [2.6, 16]], BA: [[6.6, 14], [2.8, 15]] }), stride(ph * 1.3, 3, 1.4)),
    /** Sitting cross-legged on something that flies you along. */
    floatSit: (ph, o) => J({ lift: ((o && o.lift) || 6) + S(ph * 0.5) * 1, bob: 1, lean: 1, FL: [[11.5, 20], [8.5, 21.2]], BL: [[4.5, 20], [7.5, 21.2]], FA: (o && o.arms) || [[10.6, 14.6], [11.6, 17.6]], BA: [[6.6, 14.6], [5.6, 17.4]] }),
    /** Standing perfectly still, sliding along (maglev). */
    maglev: (ph) => J({ lift: 3 + S(ph * 0.5) * 0.6, lean: 1, FA: [[9.8, 14], [11, 16.2]], BA: [[6.6, 14], [5.6, 16.2]], FL: [[9.4, 19.2], [9.6, 22.2]], BL: [[7.2, 19.2], [7, 22.2]] }),
    /** A brisk power-walk, arms swinging, very upright. */
    brisk: (ph) => Object.assign(J({ lean: 0, FA: [[9 + S(ph) * 1.4, 14], [9.6 + S(ph) * 2.6, 16.4]], BA: [[7 - S(ph) * 1.4, 14], [6.4 - S(ph) * 2.6, 16.4]] }), stride(ph, 2.6, 0.9)),
    /** Slow, heavy steps leaning back. */
    heavy: (ph) => Object.assign(J({ lean: -1, bob: Math.abs(S(ph)) > 0.8 ? 1 : 0, FA: [[10.4, 14.6], [11.4 + S(ph) * 0.6, 17]], BA: [[6, 14.6], [5 - S(ph) * 0.6, 17]] }), stride(ph, 2.4, 1)),
    /** A blazing, bouncy run: chest out, arms swept back and up. */
    blaze: (ph) => Object.assign(J({ lean: 1, lift: 1.5 + Math.abs(S(ph)) * 1.5, FA: [[7.6, 12.6], [5, 10.6 + S(ph) * 0.8]], BA: [[7, 12.8], [4.2, 11.4 - S(ph) * 0.8]] }), stride(ph, 3.8, 2.2)),
    /** Flying straight ahead like a shooting star. */
    soar: (ph) => J({ lift: 6 + S(ph * 0.5) * 1.2, lean: 4, FL: [[6.8, 19.6], [4, 20.4]], BL: [[6, 20], [3.2, 21.4]], FA: [[11.8, 12.6], [14, 11.6]], BA: [[6.8, 13.2], [4.4, 14.6]] }),
  };

  // ------------------------------------------------------------- overlays
  const H = {
    J, stride, IDLE, RUN, wave, TAU,
    /** Draw a little flame (rising tongue) at x, y. */
    flame(ctx, A, x, y, h, t, cols) {
      for (let i = 0; i < h; i++) { const q = i / h, w = Math.max(1, Math.round((1 - q) * 2.2)); A.px(ctx, x - w / 2 + Math.sin(t * 14 + i) * q * 1.4, y - i, w, 1, q > 0.6 ? cols[2] : q > 0.25 ? cols[1] : cols[0]); }
    },
    /** A soft aura around the body (dithered pixels that drift up). */
    aura(ctx, A, F, col, n, rise) {
      for (let i = 0; i < (n || 10); i++) {
        const k = ((F.t * (rise || 0.8) + i / (n || 10)) % 1), x = F.x + Math.sin(i * 2.3 + F.t * 2) * 8, y = F.y - 2 - k * 26;
        A.alpha(ctx, 1 - k, () => A.px(ctx, x, y, 1, 1, col));
      }
    },
    /** A glowing eye (pixel + halo). */
    eye(ctx, A, F, col, flicker) {
      const e = F.at('eye'); const a = flicker ? 0.6 + 0.4 * Math.sin(F.t * 20) : 1;
      A.alpha(ctx, 0.35 * a, () => A.disc(ctx, e.x, e.y, 2, col));
      A.px(ctx, e.x, e.y, 1, 1, '#ffffff'); A.px(ctx, e.x + (F.d > 0 ? -1 : 1), e.y, 1, 1, col);
    },
    /** A trail particle effect def (spawned while running). */
    trail(draw, life) { return { life: life || 0.6, draw }; },
    /** Spawn an effect in your awakened colours (for run trails, idle bits...). */
    emit(A, def, o) {
      const p = A.p, el = A.g.element(), kit = ERX.Awakening.kit(el.id);
      return A.spawn({ pal: ERX.Abilities.palette(el, kit, false), dmg: (o && o.dmg) || 0, status: kit.status, potency: 0, up: false, isUlt: false, dir: p.facing, x: p.cx, y: p.feet }, def, o || {});
    },
    /** True on each footfall while running (twice per stride). */
    footfall(p) {
      const n = Math.floor(p.runPhase / 3);
      if (p._awkFoot === undefined) p._awkFoot = n;
      if (n !== p._awkFoot) { p._awkFoot = n; return true; }
      return false;
    },
    /** True every `sec` seconds (per key). */
    every(p, key, sec, dt) {
      p._awkEvery = p._awkEvery || {};
      p._awkEvery[key] = (p._awkEvery[key] || 0) + dt;
      if (p._awkEvery[key] >= sec) { p._awkEvery[key] = 0; return true; }
      return false;
    },
    /** A thick bolt of lightning from (x0, y0) to (x1, y1): glow, coloured body, white core and a few forks. w = core width. */
    bolt(ctx, A, x0, y0, x1, y1, col, seed, w) {
      w = Math.max(1, Math.round(w || 2));
      const n = Math.max(4, Math.round(Math.hypot(x1 - x0, y1 - y0) / 10)), pts = [[x0, y0]];
      for (let i = 1; i < n; i++) { const q = i / n; pts.push([U.lerp(x0, x1, q) + Math.sin(seed * 7 + i * 3.1) * (4 + w * 0.6), U.lerp(y0, y1, q) + Math.cos(seed * 5 + i * 2.3) * 3]); }
      pts.push([x1, y1]);
      const path = (c, wd) => { for (let i = 1; i < pts.length; i++) A.line(ctx, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c, wd); };
      A.alpha(ctx, 0.3, () => path(col, w * 3 + 2));
      path(col, w + 2); path('#ffffff', w);
      for (let f = 0; f < 3 && pts.length > 3; f++) {
        const i = 1 + ((Math.floor(Math.abs(seed) * 13) + f * 5) % (pts.length - 2)), s = f % 2 ? 1 : -1;
        let [fx, fy] = pts[i];
        for (let k = 0; k < 3; k++) { const nx = fx + s * (6 + Math.abs(Math.sin(seed + f * 2 + k)) * 10), ny = fy + 6 + k * 3; A.line(ctx, fx, fy, nx, ny, k ? col : '#ffffff', Math.max(1, Math.round(w / 2))); fx = nx; fy = ny; }
      }
    },
    /** Hold the player in a pose during an Ultimate (pose: name or fn(t) -> joints). */
    hold(A, pose, lift, max) { A.p.ultHold = { pose, lift: lift || 0, max: max || 6, t: 0 }; return A.p.ultHold; },
    release(A) { A.p.ultHold = null; },
    /** Ease helpers. */
    ease: (k) => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k)),
    easeOut: (k) => 1 - Math.pow(1 - U.clamp(k, 0, 1), 3),
    easeIn: (k) => Math.pow(U.clamp(k, 0, 1), 3),

    // ------------------------------------------------------- impact kit
    // shared pieces that make awakened moves land hard (each move still draws its own thing)
    /** A cosmetic shockwave: a white flash, a thick expanding ring, a dotted inner ring and radial streaks. o: r, flat (y squash), c (colour). */
    SHOCK: {
      life: 0.4,
      spawn(e) { e.a0 = Math.random() * 6; },
      draw(e, ctx, ox, oy, A) {
        const k = Math.min(1, e.t / e.life), q = H.easeOut(k), x = e.x + ox, y = e.y + oy, R = e.r || 24, f = e.flat || 1, c = e.c || e.pal.c;
        if (e.t < 0.06) A.disc(ctx, x, y, Math.max(2, Math.round(R * 0.4 * (f < 1 ? 0.7 : 1))), '#ffffff');
        A.alpha(ctx, 1 - k, () => {
          const r1 = R * (0.3 + q * 0.7), r2 = R * (0.15 + q * 0.6);
          for (let w = 0; w < 3; w++) A.ring(ctx, x, y, Math.max(1, r1 - w), w ? c : '#ffffff', Math.max(1, (r1 - w) * f));
          A.ring(ctx, x, y, r2, e.pal.l || c, Math.max(1, r2 * f), 2);
          for (let i = 0; i < 10; i++) { const a = e.a0 + i * 0.628, ra = R * (0.35 + q * 0.5), rb = R * (0.6 + q * 0.6); A.line(ctx, x + Math.cos(a) * ra, y + Math.sin(a) * ra * f, x + Math.cos(a) * rb, y + Math.sin(a) * rb * f, i % 2 ? c : '#ffffff', i % 3 ? 1 : 2); }
        });
      },
    },
    /** Hit hard at (x, y): an explosion of radius r (damage, sound, shake) plus a shockwave. o: mult (damage), flat (squash the ring). */
    boom(A, e, x, y, r, o) {
      o = o || {};
      A.blast(e, x, y, r, o.mult !== undefined ? { dmg: e.dmg * o.mult } : undefined);
      A.spawn(e, H.SHOCK, { x, y, r: r * 1.15, flat: o.flat || 1, dmg: 0 });
      A.shake(Math.min(5, 1.5 + r / 20), 0.18);
    },
    /** A thick glowing straight beam from (x0, y0) to (x1, y1): soft glow, coloured body, light inner, white core. */
    beam(ctx, A, x0, y0, x1, y1, w, c, l) {
      w = Math.max(1, Math.round(w));
      A.alpha(ctx, 0.3, () => A.line(ctx, x0, y0, x1, y1, c, w * 2 + 3));
      A.line(ctx, x0, y0, x1, y1, c, w + 2);
      if (w > 1) A.line(ctx, x0, y0, x1, y1, l || '#ffffff', w);
      A.line(ctx, x0, y0, x1, y1, '#ffffff', Math.max(1, Math.round(w / 2)));
    },
    /** A big crescent smear (a limb or weapon swing) around (x, y), facing d. k: 0 -> 1 progress (the head sweeps, then the tail catches up). */
    smear(ctx, A, x, y, r, d, k, c, thick, a0, a1) {
      a0 = a0 === undefined ? -1.5 : a0; a1 = a1 === undefined ? 1.2 : a1;
      const n = Math.max(12, Math.round(r * 2.4)), head = Math.min(1, k * 1.7), tail = U.clamp(k * 1.7 - 0.7, 0, 1);
      if (head <= tail) return;
      for (let i = 0; i <= n; i++) {
        const q = i / n;
        if (q > head || q < tail) continue;
        const a = U.lerp(a0, a1, q), th = Math.max(1, Math.round(thick * Math.sin(((q - tail) / (head - tail)) * Math.PI)));
        for (let t = 0; t < th; t++) A.px(ctx, x + Math.cos(a) * (r - t) * d, y + Math.sin(a) * (r - t), 1, 1, t === 0 ? '#ffffff' : t === th - 1 && th > 2 ? (A.C ? A.C.mix(c, '#000000', 0.25) : c) : c);
      }
    },
    /** Bits that fly up and fall back down (rocks, droplets, shards): cosmetic particles in `cols`. */
    debris(A, x, y, n, cols, sp, o) {
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + A.rnd(-1.3, 1.3), v = (sp || 140) * A.rnd(0.4, 1); A.g.fx.add(Object.assign({ x: x + A.rnd(-3, 3), y: y + A.rnd(-3, 3), vx: Math.cos(a) * v, vy: Math.sin(a) * v, ay: 420, life: A.rnd(0.4, 0.8), color: cols[i % cols.length], size: i % 3 ? 1 : 2, fadeOut: 0.25 }, o)); }
    },
  };

  ERX.AwkHelp = H;
})(window.ERX = window.ERX || {});
