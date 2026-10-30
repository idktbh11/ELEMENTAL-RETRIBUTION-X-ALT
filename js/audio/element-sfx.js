/*
 * ELEMENT SOUNDS — every element has its own voice, so its moves sound like it:
 * fire crackles and roars, water splashes and bubbles, ice chimes and shatters,
 * earth crunches, lightning zaps, metal clangs, death rattles and wails...
 *
 * Each voice has: swing (M1), cast (a skill), hit (an impact; o.s = size), boom
 * (an explosion), dash, charge (an Ultimate charging) and ult (the release).
 * The ability engine plays them automatically (js/game/abilities.js), so every
 * move, awakened move and Ultimate gets its element's sound with no extra code:
 *
 *   ERX.ElementSfx.move('fire', 's2', awakened)   ERX.ElementSfx.hit('ice', dmg, ...)
 *   ERX.ElementSfx.boom('earth', radius, ...)      ERX.ElementSfx.ult('void', ...)
 *
 * Everything is synthesised (WebAudio), like the rest of the game's sound.
 */
(function (ERX) {
  'use strict';

  const R = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ------------------------------------------------------------ building blocks
  const nz = (a, d, t, o) => a.noiseBurst(d, Object.assign({ t }, o));
  const tn = (a, d, t, o) => a.tone(d, Object.assign({ t }, o));
  /** Lots of tiny clicks (fire, gravel, electricity, grains of sand). */
  function crackle(a, d, t, dur, vol, f, rate) { const n = Math.round(dur * (rate || 60)); for (let i = 0; i < n; i++) nz(a, d, t + Math.random() * dur, { dur: 0.008, vol: vol * 1.4 * R(0.4, 1), type: 'bandpass', freq: (f || 2500) * R(0.6, 1.6), Q: 3, attack: 0.001, release: 0.012 }); }
  /** Air moving past: a band of noise sweeping f0 -> f1. */
  function whoosh(a, d, t, dur, vol, f0, f1, Q) { nz(a, d, t, { dur, vol: vol * 1.9, type: 'bandpass', freq: f0, freqEnd: f1, Q: Q || 1.2, attack: dur * 0.3, release: dur * 0.6 }); }
  /** A deep rumble. */
  function rumble(a, d, t, dur, vol) { nz(a, d, t, { dur, vol, type: 'lowpass', freq: 260, attack: dur * 0.1, release: dur }); tn(a, d, t, { wave: 'sine', freq: 55, freqEnd: 35, dur, vol: vol * 1.2, attack: 0.02, release: dur * 0.5 }); }
  /** A thump: a pitch dropping fast, plus a little noise. */
  function thud(a, d, t, f, vol, dur) { dur = dur || 0.15; tn(a, d, t, { wave: 'sine', freq: f, freqEnd: f * 0.35, slideTime: dur, dur, vol, attack: 0.002, release: 0.08 }); nz(a, d, t, { dur: 0.05, vol: vol * 0.5, type: 'lowpass', freq: 900, release: 0.05 }); }
  /** A bell-ish ring (crystal, ice, light): sine partials that fade. */
  function chime(a, d, t, f, vol, dur, partials) { (partials || [1, 2.76, 5.4]).forEach((p, i) => tn(a, d, t, { wave: 'sine', freq: f * p, dur: 0.02, vol: vol / (i + 1), attack: 0.002, release: (dur || 0.8) / (i + 1) })); }
  /** Metal being hit: inharmonic partials and a bright click. */
  function clang(a, d, t, f, vol, len) { [1, 1.48, 2.32, 3.17, 4.8].forEach((p, i) => tn(a, d, t, { wave: i % 2 ? 'square' : 'sine', freq: f * p, dur: 0.01, vol: vol / (i + 1.5), attack: 0.001, release: (len || 0.5) / (1 + i * 0.4) })); nz(a, d, t, { dur: 0.03, vol: vol * 0.6, type: 'highpass', freq: 2500, release: 0.04 }); }
  /** Electricity: a square wave jumping around + a hiss. */
  function zap(a, d, t, dur, vol, lo, hi) { const n = Math.max(2, Math.round(dur / 0.022)); for (let i = 0; i < n; i++) tn(a, d, t + i * 0.022, { wave: 'square', freq: R(lo || 700, hi || 2600), dur: 0.02, vol: vol * R(0.6, 1), attack: 0.001, release: 0.015 }); nz(a, d, t, { dur, vol: vol * 1.4, type: 'highpass', freq: 3500, release: dur * 0.6 }); }
  /** Bubbles: little rising blips. */
  function bubbles(a, d, t, n, vol, f, spread) { for (let i = 0; i < n; i++) { const st = t + Math.random() * (spread || 0.25), ff = (f || 500) * R(0.7, 1.6); tn(a, d, st, { wave: 'sine', freq: ff, freqEnd: ff * 2.2, slideTime: 0.05, dur: 0.05, vol: vol * R(0.5, 1), attack: 0.003, release: 0.03 }); } }
  /** A splash: noise falling from bright to dull, a slap, some bubbles. */
  function splash(a, d, t, vol, dur) { dur = dur || 0.3; nz(a, d, t, { dur, vol, type: 'bandpass', freq: 2400, freqEnd: 500, Q: 0.7, attack: 0.004, release: dur }); nz(a, d, t, { dur: 0.08, vol: vol * 0.8, type: 'lowpass', freq: 700, release: 0.08 }); bubbles(a, d, t + 0.04, 4, vol * 0.4, 600); }
  /** A ghostly wail (sine + triangle, bending, vibrato). */
  function wail(a, d, t, f, dur, vol, bend) { tn(a, d, t, { wave: 'sine', freq: f, freqEnd: f * (bend || 0.7), slideTime: dur, dur, vol, attack: dur * 0.3, release: dur * 0.4, vibrato: f * 0.03, vibratoRate: 6, vibratoDelay: 0.05 }); tn(a, d, t, { wave: 'triangle', freq: f * 1.5, freqEnd: f * 1.5 * (bend || 0.7), slideTime: dur, dur, vol: vol * 0.4, attack: dur * 0.3, release: dur * 0.4, vibrato: f * 0.04, vibratoRate: 5 }); }
  /** A dark drone. */
  function drone(a, d, t, f, dur, vol) { tn(a, d, t, { wave: 'sawtooth', freq: f, freqEnd: f * 0.8, dur, vol: vol * 0.45, attack: dur * 0.2, release: dur * 0.5 }); tn(a, d, t, { wave: 'sine', freq: f / 2, dur, vol, attack: dur * 0.2, release: dur * 0.5 }); nz(a, d, t, { dur, vol: vol * 0.5, type: 'lowpass', freq: 400, attack: dur * 0.3, release: dur * 0.5 }); }
  /** A swell that builds and cuts off, like a sound played backwards. */
  function swell(a, d, t, dur, vol, f0, f1) { nz(a, d, t, { dur, vol: vol * 1.7, type: 'bandpass', freq: f0 || 300, freqEnd: f1 || 3000, Q: 1, attack: dur * 0.9, release: 0.03 }); }
  /** A clock tick. */
  function tick(a, d, t, vol, f) { tn(a, d, t, { wave: 'square', freq: f || 3200, dur: 0.008, vol, attack: 0.001, release: 0.01 }); nz(a, d, t, { dur: 0.01, vol: vol * 0.7, type: 'highpass', freq: 5000, release: 0.01 }); }
  /** A psychic warble. */
  function warble(a, d, t, f, dur, vol, up) { tn(a, d, t, { wave: 'sine', freq: f, freqEnd: f * (up || 1.5), slideTime: dur, dur, vol, attack: 0.02, release: dur * 0.5, vibrato: f * 0.12, vibratoRate: 14 }); tn(a, d, t, { wave: 'triangle', freq: f * 0.5, dur, vol: vol * 0.5, attack: 0.02, release: dur * 0.5, vibrato: f * 0.05, vibratoRate: 9 }); }
  /** Magical sparkles: quick high notes from a pentatonic-ish set. */
  function sparkle(a, d, t, n, vol, base, spread) { for (let i = 0; i < n; i++) tn(a, d, t + i * (spread || 0.035), { wave: 'sine', freq: (base || 1200) * Math.pow(2, Math.floor(R(0, 8)) / 5), dur: 0.03, vol: vol * R(0.6, 1), attack: 0.002, release: 0.14 }); }
  /** A hiss (steam, poison, sand). */
  function hiss(a, d, t, dur, vol, f) { nz(a, d, t, { dur, vol, type: 'highpass', freq: f || 4000, attack: dur * 0.2, release: dur * 0.6 }); }
  /** A wet squelch. */
  function squelch(a, d, t, vol) { nz(a, d, t, { dur: 0.12, vol, type: 'lowpass', freq: 1800, freqEnd: 200, Q: 6, attack: 0.003, release: 0.1 }); tn(a, d, t, { wave: 'sine', freq: 140, freqEnd: 70, dur: 0.1, vol: vol * 0.8, release: 0.06 }); }
  /** A heartbeat (lub-dub). */
  function heart(a, d, t, vol) { thud(a, d, t, 70, vol, 0.12); thud(a, d, t + 0.16, 60, vol * 0.8, 0.12); }
  /** A monstrous growl. */
  function growl(a, d, t, f, dur, vol) { [1, 1.01, 0.5].forEach((m, i) => tn(a, d, t, { wave: 'sawtooth', freq: f * m, freqEnd: f * m * 0.6, slideTime: dur, dur, vol: vol * (i === 2 ? 0.8 : 0.4), attack: 0.05, release: dur * 0.5 })); nz(a, d, t, { dur, vol: vol * 0.6, type: 'lowpass', freq: 600, freqEnd: 200, attack: 0.05, release: dur * 0.5 }); }
  /** The body of an explosion. */
  function boomCore(a, d, t, vol, dur) { dur = dur || 0.5; nz(a, d, t, { dur, vol, type: 'lowpass', freq: 1000, freqEnd: 120, attack: 0.002, release: dur }); tn(a, d, t, { wave: 'sine', freq: 110, freqEnd: 32, slideTime: dur * 0.8, dur, vol: vol * 1.3, release: dur * 0.5 }); }
  /** A short sci-fi sweep (cosmic). */
  function sweep(a, d, t, f0, f1, dur, vol, wave) { tn(a, d, t, { wave: wave || 'sine', freq: f0, freqEnd: f1, slideTime: dur, dur, vol, attack: 0.004, release: dur * 0.4 }); }
  /** A chord of sines (light, spirit, moon). */
  function chord(a, d, t, f, dur, vol, notes, vib) { (notes || [0, 4, 7]).forEach((n, i) => tn(a, d, t, { wave: 'sine', freq: f * Math.pow(2, n / 12), dur, vol: vol / (1 + i * 0.4), attack: dur * 0.2, release: dur * 0.5, vibrato: vib ? f * 0.01 : 0, vibratoRate: 5 })); }
  /** Digital crunch (void, chaos). */
  function glitch(a, d, t, dur, vol) { const n = Math.round(dur / 0.018); for (let i = 0; i < n; i++) if (Math.random() < 0.7) tn(a, d, t + i * 0.018, { wave: 'square', freq: [110, 220, 880, 1760, 3520][Math.floor(Math.random() * 5)], dur: 0.012, vol: vol * R(0.4, 1), attack: 0.001, release: 0.005 }); }

  // --------------------------------------------------------------- the voices
  // v: volume multiplier, s: size (0.5 small .. 2 huge), awk: awakened (heavier)
  const V = {
    fire: {
      swing: (a, d, t, o) => { whoosh(a, d, t, 0.18, 0.13 * o.v, 600, 2400, 1.1); crackle(a, d, t + 0.02, 0.16, 0.06 * o.v, 2800); },
      cast: (a, d, t, o) => { whoosh(a, d, t, 0.5, 0.15 * o.v, 200, 1500, 0.8); crackle(a, d, t, 0.45, 0.07 * o.v, 2500); thud(a, d, t, 120, 0.12 * o.v); },
      hit: (a, d, t, o) => { nz(a, d, t, { dur: 0.12 * o.s, vol: 0.15 * o.v, type: 'lowpass', freq: 1400, freqEnd: 300, release: 0.12 * o.s }); crackle(a, d, t, 0.12 * o.s, 0.06 * o.v, 3000); },
      boom: (a, d, t, o) => { boomCore(a, d, t, 0.22 * o.v, 0.5 * o.s); crackle(a, d, t, 0.6 * o.s, 0.07 * o.v, 2400); whoosh(a, d, t, 0.4, 0.1 * o.v, 300, 2000); },
      dash: (a, d, t, o) => { whoosh(a, d, t, 0.22, 0.12 * o.v, 400, 2200, 1); crackle(a, d, t, 0.18, 0.05 * o.v, 2600); },
      charge: (a, d, t, o) => { whoosh(a, d, t, 1.3, 0.16 * o.v, 150, 2400, 0.7); crackle(a, d, t + 0.3, 1.0, 0.06 * o.v, 2400, 90); },
      ult: (a, d, t, o) => { growl(a, d, t, 70, 1.2, 0.16 * o.v); boomCore(a, d, t, 0.26 * o.v, 0.9); crackle(a, d, t, 1.2, 0.08 * o.v, 2400, 90); },
    },
    water: {
      swing: (a, d, t, o) => { nz(a, d, t, { dur: 0.14, vol: 0.12 * o.v, type: 'bandpass', freq: 1800, freqEnd: 600, Q: 0.9, attack: 0.01, release: 0.12 }); bubbles(a, d, t, 2, 0.05 * o.v, 700, 0.1); },
      cast: (a, d, t, o) => { nz(a, d, t, { dur: 0.6, vol: 0.14 * o.v, type: 'lowpass', freq: 600, freqEnd: 2200, attack: 0.15, release: 0.4 }); bubbles(a, d, t, 8, 0.06 * o.v, 500, 0.5); },
      hit: (a, d, t, o) => splash(a, d, t, 0.13 * o.v, 0.2 * o.s),
      boom: (a, d, t, o) => { boomCore(a, d, t, 0.16 * o.v, 0.45 * o.s); splash(a, d, t, 0.2 * o.v, 0.6 * o.s); bubbles(a, d, t + 0.1, 12, 0.05 * o.v, 400, 0.6); },
      dash: (a, d, t, o) => { whoosh(a, d, t, 0.22, 0.11 * o.v, 1200, 400, 1); bubbles(a, d, t, 3, 0.05 * o.v, 600, 0.15); },
      charge: (a, d, t, o) => { nz(a, d, t, { dur: 1.3, vol: 0.14 * o.v, type: 'lowpass', freq: 250, freqEnd: 2600, attack: 1.0, release: 0.3 }); bubbles(a, d, t, 16, 0.05 * o.v, 400, 1.2); },
      ult: (a, d, t, o) => { boomCore(a, d, t, 0.2 * o.v, 0.7); nz(a, d, t, { dur: 1.3, vol: 0.2 * o.v, type: 'lowpass', freq: 3000, freqEnd: 300, attack: 0.01, release: 1.2 }); bubbles(a, d, t + 0.2, 16, 0.05 * o.v, 400, 1); },
    },
    wind: {
      swing: (a, d, t, o) => whoosh(a, d, t, 0.16, 0.15 * o.v, 800, 3200, 2),
      cast: (a, d, t, o) => { whoosh(a, d, t, 0.45, 0.14 * o.v, 400, 2400, 1.6); whoosh(a, d, t + 0.15, 0.4, 0.1 * o.v, 2400, 600, 1.6); tn(a, d, t, { wave: 'sine', freq: 900, freqEnd: 1500, dur: 0.45, vol: 0.03 * o.v, attack: 0.1, release: 0.3, vibrato: 40, vibratoRate: 7 }); },
      hit: (a, d, t, o) => { nz(a, d, t, { dur: 0.05, vol: 0.12 * o.v, type: 'highpass', freq: 2000, release: 0.05 }); whoosh(a, d, t, 0.12 * o.s, 0.1 * o.v, 2500, 800, 1.4); },
      boom: (a, d, t, o) => { whoosh(a, d, t, 0.6 * o.s, 0.2 * o.v, 300, 2600, 0.8); thud(a, d, t, 90, 0.16 * o.v, 0.2); },
      dash: (a, d, t, o) => whoosh(a, d, t, 0.25, 0.17 * o.v, 600, 3600, 1.5),
      charge: (a, d, t, o) => { whoosh(a, d, t, 1.3, 0.16 * o.v, 200, 3000, 1.2); tn(a, d, t, { wave: 'sine', freq: 500, freqEnd: 1800, dur: 1.3, vol: 0.035 * o.v, attack: 0.6, release: 0.3, vibrato: 30, vibratoRate: 6 }); },
      ult: (a, d, t, o) => { for (let i = 0; i < 4; i++) whoosh(a, d, t + i * 0.22, 0.6, 0.15 * o.v, i % 2 ? 2800 : 400, i % 2 ? 500 : 2800, 1.2); rumble(a, d, t, 1.2, 0.12 * o.v); },
    },
    earth: {
      swing: (a, d, t, o) => { whoosh(a, d, t, 0.16, 0.1 * o.v, 300, 900, 1); thud(a, d, t + 0.05, 110, 0.12 * o.v, 0.12); },
      cast: (a, d, t, o) => { nz(a, d, t, { dur: 0.25, vol: 0.18 * o.v, type: 'lowpass', freq: 1200, freqEnd: 200, release: 0.25 }); thud(a, d, t, 80, 0.18 * o.v, 0.25); crackle(a, d, t + 0.05, 0.35, 0.07 * o.v, 700, 45); },
      hit: (a, d, t, o) => { thud(a, d, t, 95, 0.17 * o.v, 0.14 * o.s); crackle(a, d, t, 0.14 * o.s, 0.07 * o.v, 800, 70); },
      boom: (a, d, t, o) => { rumble(a, d, t, 0.6 * o.s, 0.16 * o.v); boomCore(a, d, t, 0.2 * o.v, 0.45 * o.s); crackle(a, d, t + 0.05, 0.5 * o.s, 0.07 * o.v, 650, 50); },
      dash: (a, d, t, o) => { nz(a, d, t, { dur: 0.22, vol: 0.22 * o.v, type: 'lowpass', freq: 900, freqEnd: 300, release: 0.15 }); crackle(a, d, t, 0.2, 0.07 * o.v, 700, 40); thud(a, d, t, 90, 0.08 * o.v, 0.1); },
      charge: (a, d, t, o) => { rumble(a, d, t, 1.3, 0.16 * o.v); crackle(a, d, t + 0.3, 1.0, 0.06 * o.v, 600, 40); },
      ult: (a, d, t, o) => { rumble(a, d, t, 1.4, 0.2 * o.v); boomCore(a, d, t, 0.26 * o.v, 0.8); crackle(a, d, t, 1.2, 0.08 * o.v, 600, 60); },
    },
    lightning: {
      swing: (a, d, t, o) => zap(a, d, t, 0.1, 0.05 * o.v),
      cast: (a, d, t, o) => { zap(a, d, t, 0.22, 0.06 * o.v, 600, 3000); crackle(a, d, t, 0.25, 0.06 * o.v, 5000, 90); },
      hit: (a, d, t, o) => { zap(a, d, t, 0.06 * o.s + 0.03, 0.06 * o.v); nz(a, d, t, { dur: 0.02, vol: 0.14 * o.v, type: 'highpass', freq: 3000, release: 0.02 }); },
      boom: (a, d, t, o) => { nz(a, d, t, { dur: 0.06, vol: 0.28 * o.v, type: 'highpass', freq: 1500, release: 0.05 }); rumble(a, d, t + 0.03, 0.8 * o.s, 0.16 * o.v); zap(a, d, t, 0.15, 0.05 * o.v); },
      dash: (a, d, t, o) => { tn(a, d, t, { wave: 'square', freq: 120, freqEnd: 240, dur: 0.18, vol: 0.05 * o.v, release: 0.06 }); zap(a, d, t, 0.15, 0.05 * o.v); },
      charge: (a, d, t, o) => { tn(a, d, t, { wave: 'sawtooth', freq: 60, freqEnd: 260, dur: 1.3, vol: 0.06 * o.v, attack: 0.3, release: 0.2 }); crackle(a, d, t + 0.2, 1.1, 0.06 * o.v, 5000, 100); },
      ult: (a, d, t, o) => { nz(a, d, t, { dur: 0.08, vol: 0.3 * o.v, type: 'highpass', freq: 1200, release: 0.06 }); rumble(a, d, t + 0.05, 1.4, 0.2 * o.v); zap(a, d, t, 0.4, 0.06 * o.v); },
    },
    ice: {
      swing: (a, d, t, o) => { whoosh(a, d, t, 0.14, 0.1 * o.v, 2000, 5000, 1.8); chime(a, d, t + 0.04, 2400, 0.05 * o.v, 0.25); },
      cast: (a, d, t, o) => { chime(a, d, t, 1700, 0.08 * o.v, 0.8); chime(a, d, t + 0.06, 2550, 0.06 * o.v, 0.6); hiss(a, d, t, 0.4, 0.06 * o.v, 5000); },
      hit: (a, d, t, o) => { chime(a, d, t, R(2400, 3200), 0.08 * o.v, 0.25 * o.s, [1, 2.4]); nz(a, d, t, { dur: 0.03, vol: 0.12 * o.v, type: 'highpass', freq: 4000, release: 0.03 }); },
      boom: (a, d, t, o) => { for (let i = 0; i < 8; i++) chime(a, d, t + i * 0.02, R(1800, 4200), 0.05 * o.v, 0.4); nz(a, d, t, { dur: 0.2, vol: 0.18 * o.v, type: 'highpass', freq: 2500, release: 0.25 }); boomCore(a, d, t, 0.12 * o.v, 0.35 * o.s); },
      dash: (a, d, t, o) => { hiss(a, d, t, 0.22, 0.08 * o.v, 5000); chime(a, d, t + 0.05, 3000, 0.04 * o.v, 0.3); },
      charge: (a, d, t, o) => { tn(a, d, t, { wave: 'sine', freq: 400, freqEnd: 2200, dur: 1.3, vol: 0.05 * o.v, attack: 0.5, release: 0.3 }); for (let i = 0; i < 10; i++) chime(a, d, t + 0.2 + i * 0.1, R(1500, 4000), 0.035 * o.v, 0.4); },
      ult: (a, d, t, o) => { boomCore(a, d, t, 0.2 * o.v, 0.7); for (let i = 0; i < 14; i++) chime(a, d, t + i * 0.03, R(1500, 4500), 0.05 * o.v, 0.6); tn(a, d, t, { wave: 'sine', freq: 90, dur: 1, vol: 0.12 * o.v, release: 0.6 }); },
    },
    nature: {
      swing: (a, d, t, o) => { for (let i = 0; i < 3; i++) nz(a, d, t + i * 0.03, { dur: 0.05, vol: 0.16 * o.v, type: 'bandpass', freq: R(1500, 3000), Q: 1.4, release: 0.05 }); },
      cast: (a, d, t, o) => { tn(a, d, t, { wave: 'triangle', freq: 120, freqEnd: 220, slideTime: 0.4, dur: 0.4, vol: 0.08 * o.v, attack: 0.05, release: 0.2, vibrato: 6, vibratoRate: 11 }); for (let i = 0; i < 6; i++) nz(a, d, t + i * 0.05, { dur: 0.06, vol: 0.05 * o.v, type: 'bandpass', freq: R(1200, 3200), Q: 1.4, release: 0.06 }); },
      hit: (a, d, t, o) => { tn(a, d, t, { wave: 'triangle', freq: 320, freqEnd: 140, dur: 0.08 * o.s + 0.04, vol: 0.12 * o.v, release: 0.05 }); nz(a, d, t, { dur: 0.06, vol: 0.09 * o.v, type: 'bandpass', freq: 1800, Q: 1, release: 0.06 }); },
      boom: (a, d, t, o) => { thud(a, d, t, 90, 0.16 * o.v, 0.3); for (let i = 0; i < 10; i++) nz(a, d, t + i * 0.035, { dur: 0.06, vol: 0.06 * o.v, type: 'bandpass', freq: R(1200, 3600), Q: 1.4, release: 0.06 }); },
      dash: (a, d, t, o) => { for (let i = 0; i < 4; i++) nz(a, d, t + i * 0.04, { dur: 0.05, vol: 0.15 * o.v, type: 'bandpass', freq: R(1500, 3200), Q: 1.4, release: 0.05 }); },
      charge: (a, d, t, o) => { tn(a, d, t, { wave: 'triangle', freq: 80, freqEnd: 320, dur: 1.3, vol: 0.08 * o.v, attack: 0.4, release: 0.3, vibrato: 5, vibratoRate: 8 }); for (let i = 0; i < 14; i++) nz(a, d, t + 0.1 + i * 0.08, { dur: 0.06, vol: 0.05 * o.v, type: 'bandpass', freq: R(1200, 3200), Q: 1.4, release: 0.06 }); },
      ult: (a, d, t, o) => { growl(a, d, t, 60, 1.1, 0.12 * o.v); thud(a, d, t, 70, 0.22 * o.v, 0.5); for (let i = 0; i < 18; i++) nz(a, d, t + i * 0.05, { dur: 0.07, vol: 0.06 * o.v, type: 'bandpass', freq: R(1000, 3600), Q: 1.4, release: 0.07 }); },
    },
    darkness: {
      swing: (a, d, t, o) => { whoosh(a, d, t, 0.18, 0.12 * o.v, 250, 800, 1); tn(a, d, t, { wave: 'sawtooth', freq: 70, dur: 0.15, vol: 0.05 * o.v, release: 0.1 }); },
      cast: (a, d, t, o) => { drone(a, d, t, 55, 0.6, 0.14 * o.v); hiss(a, d, t + 0.1, 0.4, 0.03 * o.v, 6000); },
      hit: (a, d, t, o) => { thud(a, d, t, 70, 0.16 * o.v, 0.15 * o.s); swell(a, d, t, 0.08, 0.06 * o.v, 200, 900); },
      boom: (a, d, t, o) => { drone(a, d, t, 45, 0.6 * o.s, 0.16 * o.v); boomCore(a, d, t, 0.2 * o.v, 0.5 * o.s); },
      dash: (a, d, t, o) => { whoosh(a, d, t, 0.22, 0.11 * o.v, 200, 900); hiss(a, d, t, 0.2, 0.025 * o.v, 6000); },
      charge: (a, d, t, o) => { drone(a, d, t, 40, 1.3, 0.16 * o.v); swell(a, d, t, 1.3, 0.1 * o.v, 100, 1200); },
      ult: (a, d, t, o) => { growl(a, d, t, 50, 1.3, 0.16 * o.v); drone(a, d, t, 40, 1.3, 0.14 * o.v); boomCore(a, d, t, 0.22 * o.v, 0.8); },
    },
    shadow: {
      swing: (a, d, t, o) => whoosh(a, d, t, 0.1, 0.12 * o.v, 2500, 6000, 2.2),
      cast: (a, d, t, o) => { hiss(a, d, t, 0.35, 0.04 * o.v, 5000); whoosh(a, d, t + 0.05, 0.2, 0.1 * o.v, 3000, 900, 2); },
      hit: (a, d, t, o) => { nz(a, d, t, { dur: 0.05, vol: 0.12 * o.v, type: 'highpass', freq: 4500, release: 0.04 }); tick(a, d, t, 0.06 * o.v, 2000); thud(a, d, t, 120, 0.08 * o.v, 0.08 * o.s); },
      boom: (a, d, t, o) => { swell(a, d, t, 0.3, 0.12 * o.v, 300, 2400); thud(a, d, t + 0.3, 70, 0.2 * o.v, 0.3 * o.s); },
      dash: (a, d, t, o) => swell(a, d, t, 0.14, 0.12 * o.v, 1000, 5000),
      charge: (a, d, t, o) => { hiss(a, d, t, 1.3, 0.04 * o.v, 5000); drone(a, d, t, 60, 1.3, 0.1 * o.v); },
      ult: (a, d, t, o) => { drone(a, d, t, 45, 1.2, 0.14 * o.v); swell(a, d, t, 0.4, 0.12 * o.v, 200, 3000); thud(a, d, t + 0.4, 60, 0.24 * o.v, 0.5); },
    },
    light: {
      swing: (a, d, t, o) => { whoosh(a, d, t, 0.12, 0.08 * o.v, 2500, 5000, 1.5); chime(a, d, t, 1320, 0.05 * o.v, 0.3, [1, 2]); },
      cast: (a, d, t, o) => { chord(a, d, t, 660, 0.5, 0.06 * o.v, [0, 4, 7, 12]); sparkle(a, d, t + 0.05, 4, 0.04 * o.v, 1600); },
      hit: (a, d, t, o) => { chime(a, d, t, 1600, 0.08 * o.v, 0.3 * o.s, [1, 2, 3]); nz(a, d, t, { dur: 0.02, vol: 0.08 * o.v, type: 'highpass', freq: 5000, release: 0.02 }); },
      boom: (a, d, t, o) => { chord(a, d, t, 440, 0.7 * o.s, 0.08 * o.v, [0, 4, 7, 12, 16]); nz(a, d, t, { dur: 0.3, vol: 0.14 * o.v, type: 'highpass', freq: 2000, release: 0.4 }); thud(a, d, t, 100, 0.14 * o.v, 0.25); },
      dash: (a, d, t, o) => { sweep(a, d, t, 800, 2400, 0.18, 0.04 * o.v); whoosh(a, d, t, 0.18, 0.08 * o.v, 2000, 5000, 1.5); },
      // (Light's Ultimate is silent here on purpose: the beams already make plenty of noise)
      charge: () => {},
      ult: () => {},
    },
    arcane: {
      swing: (a, d, t, o) => { whoosh(a, d, t, 0.14, 0.08 * o.v, 1000, 3000, 1.4); sparkle(a, d, t, 3, 0.04 * o.v, 1400, 0.03); },
      cast: (a, d, t, o) => { for (let i = 0; i < 6; i++) tn(a, d, t + i * 0.05, { wave: 'triangle', freq: 523 * Math.pow(2, [0, 3, 7, 10, 12, 15][i] / 12), dur: 0.06, vol: 0.05 * o.v, attack: 0.003, release: 0.18 }); warble(a, d, t, 300, 0.4, 0.03 * o.v, 2); },
      hit: (a, d, t, o) => { sweep(a, d, t, 600, 1800, 0.06, 0.07 * o.v, 'triangle'); sparkle(a, d, t, 2, 0.04 * o.v, 1800, 0.02); thud(a, d, t, 130, 0.08 * o.v, 0.08 * o.s); },
      boom: (a, d, t, o) => { sparkle(a, d, t, 10, 0.05 * o.v, 1200, 0.03); boomCore(a, d, t, 0.18 * o.v, 0.5 * o.s); warble(a, d, t, 200, 0.5, 0.04 * o.v, 0.5); },
      dash: (a, d, t, o) => warble(a, d, t, 500, 0.18, 0.05 * o.v, 2),
      charge: (a, d, t, o) => { for (let i = 0; i < 16; i++) tn(a, d, t + i * 0.075, { wave: 'triangle', freq: 330 * Math.pow(2, [0, 3, 7, 10][i % 4] / 12 + Math.floor(i / 4)), dur: 0.06, vol: 0.045 * o.v, attack: 0.003, release: 0.15 }); },
      ult: (a, d, t, o) => { sparkle(a, d, t, 16, 0.05 * o.v, 1000, 0.04); boomCore(a, d, t, 0.22 * o.v, 0.8); warble(a, d, t, 150, 1, 0.05 * o.v, 0.4); },
    },
    poison: {
      swing: (a, d, t, o) => { nz(a, d, t, { dur: 0.13, vol: 0.1 * o.v, type: 'bandpass', freq: 1400, freqEnd: 500, Q: 1.2, release: 0.1 }); hiss(a, d, t, 0.12, 0.04 * o.v, 5000); },
      cast: (a, d, t, o) => { bubbles(a, d, t, 10, 0.06 * o.v, 350, 0.5); hiss(a, d, t, 0.5, 0.05 * o.v, 4500); },
      hit: (a, d, t, o) => { hiss(a, d, t, 0.15 * o.s, 0.08 * o.v, 3500); squelch(a, d, t, 0.08 * o.v); },
      boom: (a, d, t, o) => { bubbles(a, d, t, 14, 0.06 * o.v, 300, 0.4); hiss(a, d, t, 0.6 * o.s, 0.09 * o.v, 3000); thud(a, d, t, 90, 0.15 * o.v, 0.25); },
      dash: (a, d, t, o) => { hiss(a, d, t, 0.22, 0.07 * o.v, 4000); bubbles(a, d, t, 3, 0.04 * o.v, 400, 0.15); },
      charge: (a, d, t, o) => { bubbles(a, d, t, 26, 0.05 * o.v, 250, 1.3); hiss(a, d, t + 0.4, 0.9, 0.05 * o.v, 4000); },
      ult: (a, d, t, o) => { growl(a, d, t, 65, 1, 0.1 * o.v); bubbles(a, d, t, 24, 0.06 * o.v, 280, 1); hiss(a, d, t, 1.2, 0.08 * o.v, 3000); boomCore(a, d, t, 0.16 * o.v, 0.6); },
    },
    blood: {
      swing: (a, d, t, o) => { whoosh(a, d, t, 0.13, 0.1 * o.v, 900, 2400, 1.2); squelch(a, d, t + 0.04, 0.06 * o.v); },
      cast: (a, d, t, o) => { heart(a, d, t, 0.16 * o.v); squelch(a, d, t + 0.3, 0.08 * o.v); },
      hit: (a, d, t, o) => { squelch(a, d, t, 0.12 * o.v * Math.sqrt(o.s)); thud(a, d, t, 100, 0.08 * o.v, 0.08); },
      boom: (a, d, t, o) => { for (let i = 0; i < 3; i++) squelch(a, d, t + i * 0.05, 0.1 * o.v); boomCore(a, d, t, 0.18 * o.v, 0.45 * o.s); },
      dash: (a, d, t, o) => { whoosh(a, d, t, 0.2, 0.1 * o.v, 600, 2000); thud(a, d, t, 70, 0.1 * o.v, 0.1); },
      charge: (a, d, t, o) => { for (let i = 0; i < 5; i++) heart(a, d, t + i * (0.32 - i * 0.04), 0.14 * o.v); },
      ult: (a, d, t, o) => { growl(a, d, t, 55, 1.2, 0.16 * o.v); heart(a, d, t, 0.2 * o.v); squelch(a, d, t + 0.3, 0.14 * o.v); boomCore(a, d, t + 0.1, 0.18 * o.v, 0.6); },
    },
    death: {
      swing: (a, d, t, o) => { whoosh(a, d, t, 0.15, 0.09 * o.v, 500, 1600); for (let i = 0; i < 4; i++) tick(a, d, t + i * 0.025, 0.04 * o.v, 900); },
      cast: (a, d, t, o) => { wail(a, d, t, 420, 0.6, 0.06 * o.v, 0.65); for (let i = 0; i < 6; i++) tick(a, d, t + i * 0.03, 0.035 * o.v, 800); },
      hit: (a, d, t, o) => { tick(a, d, t, 0.08 * o.v, 1200); thud(a, d, t, 80, 0.12 * o.v, 0.12 * o.s); },
      boom: (a, d, t, o) => { wail(a, d, t, 520, 0.8 * o.s, 0.07 * o.v, 0.5); boomCore(a, d, t, 0.18 * o.v, 0.5); },
      dash: (a, d, t, o) => { whoosh(a, d, t, 0.22, 0.09 * o.v, 400, 1400); for (let i = 0; i < 5; i++) tick(a, d, t + i * 0.03, 0.03 * o.v, 800); },
      charge: (a, d, t, o) => { for (let i = 0; i < 3; i++) wail(a, d, t + i * 0.2, 300 + i * 110, 1.1, 0.05 * o.v, 1.3); },
      ult: (a, d, t, o) => { drone(a, d, t, 45, 1.3, 0.12 * o.v); clang(a, d, t, 110, 0.12 * o.v, 1.4); wail(a, d, t + 0.1, 600, 1, 0.06 * o.v, 0.5); boomCore(a, d, t, 0.18 * o.v, 0.7); },
    },
    metal: {
      swing: (a, d, t, o) => { nz(a, d, t, { dur: 0.1, vol: 0.1 * o.v, type: 'highpass', freq: 3000, release: 0.08 }); tn(a, d, t, { wave: 'sine', freq: 2600, dur: 0.02, vol: 0.04 * o.v, release: 0.25 }); },
      cast: (a, d, t, o) => { clang(a, d, t, 330, 0.1 * o.v); tn(a, d, t, { wave: 'square', freq: 90, freqEnd: 300, dur: 0.3, vol: 0.04 * o.v, release: 0.1 }); },
      hit: (a, d, t, o) => clang(a, d, t, R(380, 560), 0.11 * o.v, 0.35 * o.s),
      boom: (a, d, t, o) => { clang(a, d, t, 220, 0.14 * o.v, 0.9); boomCore(a, d, t, 0.2 * o.v, 0.45 * o.s); for (let i = 0; i < 5; i++) clang(a, d, t + 0.1 + i * 0.07, R(800, 1600), 0.03 * o.v, 0.2); },
      dash: (a, d, t, o) => { nz(a, d, t, { dur: 0.22, vol: 0.15 * o.v, type: 'bandpass', freq: 3500, Q: 3, release: 0.15 }); tn(a, d, t, { wave: 'sine', freq: 1800, freqEnd: 2600, dur: 0.2, vol: 0.03 * o.v, release: 0.1 }); },
      charge: (a, d, t, o) => { tn(a, d, t, { wave: 'square', freq: 60, freqEnd: 420, dur: 1.3, vol: 0.05 * o.v, attack: 0.3, release: 0.2 }); for (let i = 0; i < 6; i++) clang(a, d, t + 0.2 + i * 0.18, 300 + i * 60, 0.05 * o.v, 0.3); },
      ult: (a, d, t, o) => { clang(a, d, t, 140, 0.16 * o.v, 1.5); boomCore(a, d, t, 0.22 * o.v, 0.7); tn(a, d, t, { wave: 'square', freq: 400, freqEnd: 80, dur: 0.8, vol: 0.05 * o.v, release: 0.3 }); },
    },
    sand: {
      swing: (a, d, t, o) => { nz(a, d, t, { dur: 0.14, vol: 0.09 * o.v, type: 'bandpass', freq: 3500, Q: 0.8, release: 0.1 }); crackle(a, d, t, 0.12, 0.05 * o.v, 5000, 120); },
      cast: (a, d, t, o) => { hiss(a, d, t, 0.6, 0.08 * o.v, 2500); crackle(a, d, t, 0.6, 0.04 * o.v, 5000, 140); },
      hit: (a, d, t, o) => { thud(a, d, t, 110, 0.1 * o.v, 0.1); crackle(a, d, t, 0.12 * o.s, 0.07 * o.v, 4500, 150); },
      boom: (a, d, t, o) => { hiss(a, d, t, 0.7 * o.s, 0.12 * o.v, 2000); thud(a, d, t, 80, 0.16 * o.v, 0.3); crackle(a, d, t, 0.6 * o.s, 0.05 * o.v, 4500, 140); },
      dash: (a, d, t, o) => { hiss(a, d, t, 0.25, 0.08 * o.v, 3000); crackle(a, d, t, 0.2, 0.04 * o.v, 5000, 140); },
      charge: (a, d, t, o) => { nz(a, d, t, { dur: 1.3, vol: 0.13 * o.v, type: 'bandpass', freq: 800, freqEnd: 4000, Q: 0.6, attack: 1, release: 0.3 }); crackle(a, d, t + 0.3, 1, 0.04 * o.v, 5000, 120); },
      ult: (a, d, t, o) => { hiss(a, d, t, 1.4, 0.13 * o.v, 1500); rumble(a, d, t, 1.2, 0.14 * o.v); crackle(a, d, t, 1.2, 0.05 * o.v, 4500, 140); },
    },
    magma: {
      swing: (a, d, t, o) => { whoosh(a, d, t, 0.2, 0.12 * o.v, 250, 1200, 0.9); crackle(a, d, t, 0.15, 0.05 * o.v, 1500); },
      cast: (a, d, t, o) => { bubbles(a, d, t, 7, 0.07 * o.v, 160, 0.45); whoosh(a, d, t, 0.5, 0.12 * o.v, 150, 900, 0.7); thud(a, d, t, 70, 0.14 * o.v, 0.3); },
      hit: (a, d, t, o) => { thud(a, d, t, 85, 0.15 * o.v, 0.15 * o.s); hiss(a, d, t + 0.03, 0.15 * o.s, 0.06 * o.v, 3500); },
      boom: (a, d, t, o) => { boomCore(a, d, t, 0.24 * o.v, 0.6 * o.s); rumble(a, d, t, 0.6 * o.s, 0.12 * o.v); crackle(a, d, t, 0.6, 0.07 * o.v, 1800); },
      dash: (a, d, t, o) => { whoosh(a, d, t, 0.24, 0.12 * o.v, 200, 1400, 0.9); crackle(a, d, t, 0.2, 0.05 * o.v, 1600); },
      charge: (a, d, t, o) => { rumble(a, d, t, 1.3, 0.14 * o.v); bubbles(a, d, t + 0.2, 14, 0.06 * o.v, 140, 1.0); },
      ult: (a, d, t, o) => { rumble(a, d, t, 1.4, 0.18 * o.v); boomCore(a, d, t, 0.28 * o.v, 0.9); crackle(a, d, t, 1.3, 0.08 * o.v, 1800, 80); },
    },
    storm: {
      swing: (a, d, t, o) => { whoosh(a, d, t, 0.15, 0.12 * o.v, 900, 3200, 1.6); zap(a, d, t + 0.05, 0.05, 0.03 * o.v); },
      cast: (a, d, t, o) => { rumble(a, d, t, 0.5, 0.12 * o.v); whoosh(a, d, t, 0.45, 0.1 * o.v, 500, 2400, 1.2); },
      hit: (a, d, t, o) => { zap(a, d, t, 0.05, 0.05 * o.v); whoosh(a, d, t, 0.1 * o.s, 0.09 * o.v, 2500, 900, 1.4); },
      boom: (a, d, t, o) => { nz(a, d, t, { dur: 0.06, vol: 0.26 * o.v, type: 'highpass', freq: 1500, release: 0.05 }); rumble(a, d, t + 0.03, 0.8 * o.s, 0.16 * o.v); hiss(a, d, t, 0.6, 0.05 * o.v, 3000); },
      dash: (a, d, t, o) => { whoosh(a, d, t, 0.24, 0.15 * o.v, 700, 3400, 1.5); zap(a, d, t, 0.06, 0.03 * o.v); },
      charge: (a, d, t, o) => { whoosh(a, d, t, 1.3, 0.14 * o.v, 200, 2600, 1); crackle(a, d, t + 0.4, 0.9, 0.05 * o.v, 5000, 80); },
      ult: (a, d, t, o) => { nz(a, d, t, { dur: 0.08, vol: 0.28 * o.v, type: 'highpass', freq: 1200, release: 0.06 }); rumble(a, d, t + 0.05, 1.4, 0.18 * o.v); hiss(a, d, t, 1.4, 0.07 * o.v, 2500); whoosh(a, d, t, 1.2, 0.1 * o.v, 400, 2800); },
    },
    cosmic: {
      swing: (a, d, t, o) => { sweep(a, d, t, 400, 1600, 0.1, 0.06 * o.v); sparkle(a, d, t + 0.04, 2, 0.035 * o.v, 2000, 0.03); },
      cast: (a, d, t, o) => { sparkle(a, d, t, 6, 0.04 * o.v, 1600, 0.05); [1, 1.005, 1.5].forEach((m, i) => tn(a, d, t, { wave: 'sine', freq: 220 * m, freqEnd: 440 * m, dur: 0.6, vol: 0.04 * o.v, attack: 0.2, release: 0.3 })); },
      hit: (a, d, t, o) => { sweep(a, d, t, 2000, 500, 0.08 * o.s + 0.04, 0.07 * o.v, 'square'); sparkle(a, d, t, 2, 0.03 * o.v, 2400, 0.02); },
      boom: (a, d, t, o) => { boomCore(a, d, t, 0.2 * o.v, 0.6 * o.s); sweep(a, d, t, 1600, 100, 0.6, 0.06 * o.v); sparkle(a, d, t + 0.1, 10, 0.04 * o.v, 1800, 0.04); },
      dash: (a, d, t, o) => { sweep(a, d, t, 300, 2400, 0.15, 0.05 * o.v); swell(a, d, t, 0.15, 0.06 * o.v, 1000, 6000); },
      charge: (a, d, t, o) => { [1, 1.004, 1.5, 2].forEach((m, i) => tn(a, d, t, { wave: 'sine', freq: 110 * m, freqEnd: 330 * m, dur: 1.3, vol: 0.045 * o.v, attack: 0.6, release: 0.3, vibrato: 3, vibratoRate: 4 })); sparkle(a, d, t + 0.4, 10, 0.03 * o.v, 2000, 0.08); },
      ult: (a, d, t, o) => { sweep(a, d, t, 2400, 60, 1.2, 0.08 * o.v); boomCore(a, d, t, 0.24 * o.v, 0.9); sparkle(a, d, t, 14, 0.04 * o.v, 1600, 0.06); },
    },
    void: {
      swing: (a, d, t, o) => swell(a, d, t, 0.1, 0.1 * o.v, 400, 2500),
      cast: (a, d, t, o) => { swell(a, d, t, 0.35, 0.12 * o.v, 200, 3000); tn(a, d, t, { wave: 'sine', freq: 40, dur: 0.5, vol: 0.14 * o.v, attack: 0.1, release: 0.3 }); glitch(a, d, t + 0.3, 0.12, 0.04 * o.v); },
      hit: (a, d, t, o) => { thud(a, d, t, 60, 0.14 * o.v, 0.12 * o.s); glitch(a, d, t, 0.06 * o.s, 0.04 * o.v); },
      boom: (a, d, t, o) => { swell(a, d, t, 0.35, 0.16 * o.v, 100, 4000); thud(a, d, t + 0.35, 45, 0.26 * o.v, 0.5 * o.s); glitch(a, d, t + 0.35, 0.2, 0.05 * o.v); },
      dash: (a, d, t, o) => { swell(a, d, t, 0.15, 0.1 * o.v, 300, 4000); glitch(a, d, t + 0.13, 0.05, 0.04 * o.v); },
      charge: (a, d, t, o) => { swell(a, d, t, 1.3, 0.16 * o.v, 60, 2400); tn(a, d, t, { wave: 'sine', freq: 30, dur: 1.3, vol: 0.16 * o.v, attack: 0.8, release: 0.1 }); },
      ult: (a, d, t, o) => { tn(a, d, t, { wave: 'sine', freq: 28, dur: 1.4, vol: 0.22 * o.v, attack: 0.02, release: 1 }); glitch(a, d, t, 0.5, 0.06 * o.v); swell(a, d, t + 0.4, 0.6, 0.12 * o.v, 100, 3000); },
    },
    psychic: {
      swing: (a, d, t, o) => warble(a, d, t, 600, 0.12, 0.05 * o.v, 1.8),
      cast: (a, d, t, o) => { warble(a, d, t, 300, 0.55, 0.07 * o.v, 2.2); chime(a, d, t + 0.1, 900, 0.04 * o.v, 0.5); },
      hit: (a, d, t, o) => { tn(a, d, t, { wave: 'sine', freq: 700, freqEnd: 350, dur: 0.1 * o.s + 0.05, vol: 0.08 * o.v, release: 0.06, vibrato: 90, vibratoRate: 30 }); thud(a, d, t, 120, 0.08 * o.v, 0.08); },
      boom: (a, d, t, o) => { warble(a, d, t, 200, 0.7 * o.s, 0.08 * o.v, 3); boomCore(a, d, t, 0.16 * o.v, 0.45); chime(a, d, t, 600, 0.05 * o.v, 0.8); },
      dash: (a, d, t, o) => warble(a, d, t, 800, 0.15, 0.05 * o.v, 0.5),
      charge: (a, d, t, o) => { warble(a, d, t, 150, 1.3, 0.07 * o.v, 3); warble(a, d, t + 0.2, 225, 1.1, 0.05 * o.v, 3); },
      ult: (a, d, t, o) => { warble(a, d, t, 120, 1.3, 0.1 * o.v, 4); chord(a, d, t, 330, 1.2, 0.06 * o.v, [0, 3, 7, 10], true); boomCore(a, d, t, 0.18 * o.v, 0.7); },
    },
    crystal: {
      swing: (a, d, t, o) => { whoosh(a, d, t, 0.12, 0.08 * o.v, 2500, 5500, 2); chime(a, d, t + 0.03, 3000, 0.04 * o.v, 0.2, [1, 2.2]); },
      cast: (a, d, t, o) => { for (let i = 0; i < 5; i++) chime(a, d, t + i * 0.04, 1400 * Math.pow(2, [0, 4, 7, 11, 14][i] / 12), 0.05 * o.v, 0.6, [1, 2.4]); },
      hit: (a, d, t, o) => chime(a, d, t, R(2200, 3600), 0.08 * o.v, 0.22 * o.s, [1, 2.4, 3.9]),
      boom: (a, d, t, o) => { for (let i = 0; i < 10; i++) chime(a, d, t + i * 0.015, R(1600, 5000), 0.05 * o.v, 0.5); nz(a, d, t, { dur: 0.25, vol: 0.16 * o.v, type: 'highpass', freq: 3000, release: 0.3 }); thud(a, d, t, 120, 0.1 * o.v, 0.2); },
      dash: (a, d, t, o) => { for (let i = 0; i < 3; i++) chime(a, d, t + i * 0.05, 2600 + i * 400, 0.035 * o.v, 0.3, [1, 2.4]); },
      charge: (a, d, t, o) => { for (let i = 0; i < 14; i++) chime(a, d, t + i * 0.09, 900 * Math.pow(2, i / 7), 0.04 * o.v, 0.5, [1, 2.4]); },
      ult: (a, d, t, o) => { for (let i = 0; i < 18; i++) chime(a, d, t + i * 0.02, R(1200, 5200), 0.05 * o.v, 0.8); chord(a, d, t, 523, 1.2, 0.06 * o.v, [0, 4, 7, 11, 14]); boomCore(a, d, t, 0.16 * o.v, 0.6); },
    },
    moon: {
      swing: (a, d, t, o) => { whoosh(a, d, t, 0.15, 0.08 * o.v, 1200, 3500, 1.4); chime(a, d, t + 0.04, 1050, 0.035 * o.v, 0.4, [1, 2]); },
      cast: (a, d, t, o) => { chord(a, d, t, 392, 0.7, 0.05 * o.v, [0, 7, 12], true); chime(a, d, t + 0.1, 1568, 0.035 * o.v, 0.6); },
      hit: (a, d, t, o) => { chime(a, d, t, 1320, 0.07 * o.v, 0.3 * o.s, [1, 2, 3]); thud(a, d, t, 110, 0.07 * o.v, 0.08); },
      boom: (a, d, t, o) => { thud(a, d, t, 70, 0.18 * o.v, 0.4 * o.s); chord(a, d, t, 294, 0.9, 0.06 * o.v, [0, 7, 12, 19], true); },
      dash: (a, d, t, o) => { whoosh(a, d, t, 0.22, 0.07 * o.v, 1000, 3000, 1.2); chime(a, d, t + 0.05, 1760, 0.03 * o.v, 0.3, [1, 2]); },
      charge: (a, d, t, o) => chord(a, d, t, 196, 1.3, 0.07 * o.v, [0, 7, 12, 19, 24], true),
      ult: (a, d, t, o) => { chord(a, d, t, 196, 1.4, 0.09 * o.v, [0, 7, 12, 19, 24], true); boomCore(a, d, t, 0.18 * o.v, 0.8); for (let i = 0; i < 6; i++) chime(a, d, t + 0.2 + i * 0.12, 2000 - i * 200, 0.04 * o.v, 0.5); },
    },
    solar: {
      swing: (a, d, t, o) => { whoosh(a, d, t, 0.16, 0.12 * o.v, 1000, 4000, 1.2); hiss(a, d, t, 0.12, 0.04 * o.v, 5000); },
      cast: (a, d, t, o) => { whoosh(a, d, t, 0.5, 0.14 * o.v, 400, 3000, 0.8); crackle(a, d, t, 0.45, 0.06 * o.v, 4000); },
      hit: (a, d, t, o) => { hiss(a, d, t, 0.14 * o.s, 0.08 * o.v, 3000); crackle(a, d, t, 0.12 * o.s, 0.06 * o.v, 4500); thud(a, d, t, 120, 0.08 * o.v, 0.08); },
      boom: (a, d, t, o) => { boomCore(a, d, t, 0.22 * o.v, 0.55 * o.s); whoosh(a, d, t, 0.5, 0.12 * o.v, 500, 3500); crackle(a, d, t, 0.6, 0.07 * o.v, 4200); },
      dash: (a, d, t, o) => { whoosh(a, d, t, 0.22, 0.13 * o.v, 800, 4200, 1.2); crackle(a, d, t, 0.18, 0.05 * o.v, 4500); },
      charge: (a, d, t, o) => { whoosh(a, d, t, 1.3, 0.16 * o.v, 300, 4000, 0.7); crackle(a, d, t + 0.3, 1, 0.06 * o.v, 4500, 100); },
      ult: (a, d, t, o) => { growl(a, d, t, 90, 1.2, 0.13 * o.v); boomCore(a, d, t, 0.26 * o.v, 0.9); crackle(a, d, t, 1.2, 0.08 * o.v, 4200, 100); },
    },
    magnetism: {
      swing: (a, d, t, o) => { tn(a, d, t, { wave: 'square', freq: 220, freqEnd: 110, dur: 0.1, vol: 0.05 * o.v, release: 0.05 }); whoosh(a, d, t, 0.12, 0.08 * o.v, 1000, 3000); },
      cast: (a, d, t, o) => { tn(a, d, t, { wave: 'sine', freq: 110, dur: 0.5, vol: 0.12 * o.v, attack: 0.05, release: 0.3, vibrato: 30, vibratoRate: 18 }); for (let i = 0; i < 4; i++) clang(a, d, t + 0.1 + i * 0.07, R(900, 1600), 0.03 * o.v, 0.2); },
      hit: (a, d, t, o) => { clang(a, d, t, R(500, 700), 0.08 * o.v, 0.25 * o.s); zap(a, d, t, 0.04, 0.03 * o.v); },
      boom: (a, d, t, o) => { clang(a, d, t, 240, 0.12 * o.v, 0.8); boomCore(a, d, t, 0.18 * o.v, 0.5 * o.s); tn(a, d, t, { wave: 'sine', freq: 60, dur: 0.5, vol: 0.12 * o.v, release: 0.3, vibrato: 20, vibratoRate: 20 }); },
      dash: (a, d, t, o) => { tn(a, d, t, { wave: 'sine', freq: 180, freqEnd: 600, dur: 0.2, vol: 0.08 * o.v, release: 0.08, vibrato: 25, vibratoRate: 22 }); whoosh(a, d, t, 0.2, 0.08 * o.v, 1200, 3000); },
      charge: (a, d, t, o) => { tn(a, d, t, { wave: 'sine', freq: 50, freqEnd: 220, dur: 1.3, vol: 0.14 * o.v, attack: 0.4, release: 0.2, vibrato: 25, vibratoRate: 16 }); for (let i = 0; i < 8; i++) clang(a, d, t + 0.3 + i * 0.12, R(800, 1800), 0.025 * o.v, 0.2); },
      ult: (a, d, t, o) => { tn(a, d, t, { wave: 'sine', freq: 40, dur: 1.4, vol: 0.18 * o.v, release: 0.8, vibrato: 15, vibratoRate: 12 }); clang(a, d, t, 160, 0.14 * o.v, 1.2); boomCore(a, d, t, 0.22 * o.v, 0.8); },
    },
    time: {
      swing: (a, d, t, o) => { tick(a, d, t, 0.07 * o.v, 3000); tick(a, d, t + 0.09, 0.06 * o.v, 2200); whoosh(a, d, t, 0.12, 0.07 * o.v, 1200, 3000); },
      cast: (a, d, t, o) => { for (let i = 0; i < 8; i++) tick(a, d, t + i * 0.045, 0.05 * o.v, i % 2 ? 2400 : 3200); chime(a, d, t + 0.36, 1760, 0.05 * o.v, 0.6, [1, 2.76]); },
      hit: (a, d, t, o) => { tick(a, d, t, 0.09 * o.v, 2600); thud(a, d, t, 110, 0.09 * o.v, 0.1 * o.s); },
      boom: (a, d, t, o) => { swell(a, d, t, 0.3, 0.12 * o.v, 300, 3000); clang(a, d, t + 0.3, 330, 0.12 * o.v, 1.2); thud(a, d, t + 0.3, 80, 0.14 * o.v, 0.3); },
      dash: (a, d, t, o) => { swell(a, d, t, 0.14, 0.09 * o.v, 600, 4000); tick(a, d, t + 0.14, 0.06 * o.v, 3000); },
      charge: (a, d, t, o) => { let tt = 0; for (let i = 0; i < 22; i++) { tick(a, d, t + tt, 0.05 * o.v, i % 2 ? 2400 : 3200); tt += Math.max(0.025, 0.12 - i * 0.005); } },
      ult: (a, d, t, o) => { clang(a, d, t, 98, 0.16 * o.v, 2); clang(a, d, t + 0.02, 196, 0.08 * o.v, 1.6); swell(a, d, t, 0.6, 0.1 * o.v, 200, 2000); },
    },
    gravity: {
      swing: (a, d, t, o) => { tn(a, d, t, { wave: 'sine', freq: 140, freqEnd: 40, dur: 0.16, vol: 0.16 * o.v, release: 0.08 }); whoosh(a, d, t, 0.14, 0.06 * o.v, 300, 900); },
      cast: (a, d, t, o) => { tn(a, d, t, { wave: 'sine', freq: 60, freqEnd: 45, dur: 0.6, vol: 0.18 * o.v, attack: 0.05, release: 0.3, vibrato: 8, vibratoRate: 6 }); rumble(a, d, t, 0.5, 0.1 * o.v); },
      hit: (a, d, t, o) => thud(a, d, t, 65, 0.2 * o.v, 0.18 * o.s),
      boom: (a, d, t, o) => { tn(a, d, t, { wave: 'sine', freq: 90, freqEnd: 25, dur: 0.7 * o.s, vol: 0.26 * o.v, release: 0.4 }); rumble(a, d, t, 0.7 * o.s, 0.14 * o.v); boomCore(a, d, t, 0.16 * o.v, 0.5); },
      dash: (a, d, t, o) => { tn(a, d, t, { wave: 'sine', freq: 80, freqEnd: 160, dur: 0.2, vol: 0.14 * o.v, release: 0.1 }); whoosh(a, d, t, 0.2, 0.07 * o.v, 200, 900); },
      charge: (a, d, t, o) => { tn(a, d, t, { wave: 'sine', freq: 35, freqEnd: 70, dur: 1.3, vol: 0.2 * o.v, attack: 0.6, release: 0.2, vibrato: 6, vibratoRate: 3 }); rumble(a, d, t, 1.3, 0.12 * o.v); },
      ult: (a, d, t, o) => { tn(a, d, t, { wave: 'sine', freq: 50, freqEnd: 20, dur: 1.4, vol: 0.26 * o.v, release: 0.8 }); rumble(a, d, t, 1.4, 0.16 * o.v); boomCore(a, d, t, 0.2 * o.v, 0.8); },
    },
    sound: {
      // (awakened Sound plays its own music instead: js/audio/sound-moves.js)
      swing: (a, d, t, o) => { tn(a, d, t, { wave: 'square', freq: 330, dur: 0.06, vol: 0.05 * o.v, release: 0.08 }); nz(a, d, t, { dur: 0.04, vol: 0.06 * o.v, type: 'highpass', freq: 6000, release: 0.03 }); },
      cast: (a, d, t, o) => { chord(a, d, t, 165, 0.3, 0.07 * o.v, [0, 7, 12]); thud(a, d, t, 150, 0.16 * o.v, 0.12); },
      hit: (a, d, t, o) => { thud(a, d, t, 150, 0.18 * o.v, 0.12); nz(a, d, t, { dur: 0.03, vol: 0.06 * o.v, type: 'highpass', freq: 6000, release: 0.03 }); },
      boom: (a, d, t, o) => { thud(a, d, t, 140, 0.22 * o.v, 0.18); nz(a, d, t, { dur: 0.7, vol: 0.1 * o.v, type: 'highpass', freq: 5200, Q: 0.5, release: 0.8 }); },
      dash: (a, d, t, o) => { sweep(a, d, t, 1200, 200, 0.15, 0.09 * o.v, 'sawtooth'); },
      charge: (a, d, t, o) => { tn(a, d, t, { wave: 'sawtooth', freq: 82, freqEnd: 330, dur: 1.3, vol: 0.06 * o.v, attack: 0.4, release: 0.2 }); },
      ult: (a, d, t, o) => { chord(a, d, t, 82, 1.2, 0.1 * o.v, [0, 7, 12, 19]); thud(a, d, t, 140, 0.24 * o.v, 0.2); nz(a, d, t, { dur: 1, vol: 0.1 * o.v, type: 'highpass', freq: 5200, release: 1 }); },
    },
    mist: {
      swing: (a, d, t, o) => whoosh(a, d, t, 0.2, 0.09 * o.v, 600, 1800, 0.6),
      cast: (a, d, t, o) => { nz(a, d, t, { dur: 0.6, vol: 0.18 * o.v, type: 'lowpass', freq: 500, freqEnd: 1600, attack: 0.3, release: 0.3 }); tn(a, d, t, { wave: 'sine', freq: 330, dur: 0.6, vol: 0.03 * o.v, attack: 0.3, release: 0.3, vibrato: 10, vibratoRate: 4 }); },
      hit: (a, d, t, o) => { thud(a, d, t, 100, 0.09 * o.v, 0.1 * o.s); hiss(a, d, t, 0.15, 0.04 * o.v, 3000); },
      boom: (a, d, t, o) => { whoosh(a, d, t, 0.6 * o.s, 0.14 * o.v, 300, 1600, 0.6); thud(a, d, t, 80, 0.12 * o.v, 0.25); },
      dash: (a, d, t, o) => whoosh(a, d, t, 0.25, 0.1 * o.v, 500, 2200, 0.6),
      charge: (a, d, t, o) => { nz(a, d, t, { dur: 1.3, vol: 0.12 * o.v, type: 'lowpass', freq: 300, freqEnd: 1800, attack: 1, release: 0.3 }); wail(a, d, t + 0.3, 280, 1, 0.04 * o.v, 1.2); },
      ult: (a, d, t, o) => { wail(a, d, t, 220, 1.3, 0.06 * o.v, 0.6); whoosh(a, d, t, 1.2, 0.14 * o.v, 200, 1400, 0.6); thud(a, d, t + 0.1, 70, 0.18 * o.v, 0.4); },
    },
    spirit: {
      swing: (a, d, t, o) => { whoosh(a, d, t, 0.14, 0.08 * o.v, 1200, 3000, 1.2); chime(a, d, t + 0.03, 1180, 0.03 * o.v, 0.35, [1, 2]); },
      cast: (a, d, t, o) => chord(a, d, t, 330, 0.6, 0.06 * o.v, [0, 5, 7, 12], true),
      hit: (a, d, t, o) => { chime(a, d, t, 990, 0.06 * o.v, 0.3 * o.s, [1, 2]); hiss(a, d, t, 0.1, 0.03 * o.v, 5000); thud(a, d, t, 110, 0.07 * o.v, 0.08); },
      boom: (a, d, t, o) => { chord(a, d, t, 220, 0.8 * o.s, 0.07 * o.v, [0, 5, 7, 12, 17], true); boomCore(a, d, t, 0.16 * o.v, 0.45); },
      dash: (a, d, t, o) => { whoosh(a, d, t, 0.22, 0.09 * o.v, 900, 2600); chime(a, d, t + 0.06, 1500, 0.03 * o.v, 0.3, [1, 2]); },
      charge: (a, d, t, o) => chord(a, d, t, 165, 1.3, 0.08 * o.v, [0, 5, 7, 12, 17, 19], true),
      ult: (a, d, t, o) => { chord(a, d, t, 165, 1.4, 0.1 * o.v, [0, 5, 7, 12, 17, 24], true); for (let i = 0; i < 4; i++) thud(a, d, t + i * 0.25, 70, 0.16 * o.v, 0.2); boomCore(a, d, t + 0.9, 0.2 * o.v, 0.6); },
    },
  };
  const KINDS = ['swing', 'cast', 'hit', 'boom', 'dash', 'charge', 'ult'];
  const voiceOf = (el) => {
    if (el === 'chaos') { const ids = Object.keys(V); return V[ids[Math.floor(Math.random() * ids.length)]]; }   // chaos sounds like anything
    return V[el] || V.fire;
  };
  for (const k of KINDS) {
    ERX.SfxBank['el_' + k] = (a, d, t, o) => {
      o = o || {};
      const s = clamp(o.s || 1, 0.4, 2.2), opts = { s, awk: !!o.awk, v: (o.awk ? 1.18 : 1) * (0.75 + 0.25 * s) };
      voiceOf(o.el)[k](a, d, t, opts);
      if (o.el === 'chaos') glitch(a, d, t, 0.08 + (k === 'ult' || k === 'boom' ? 0.2 : 0), 0.035 * opts.v);
      // an awakened impact gets a little extra weight underneath
      if (o.awk && (k === 'hit' || k === 'boom') && s > 1) thud(a, d, t, 60, 0.06 * s, 0.12);
    };
  }

  // ------------------------------------------------------------ what the game calls
  const play = (k, o) => ERX.Audio && ERX.Audio.playSfx('el_' + k, o);
  /** Voices that are silent on purpose. */
  const SILENT = { 'light.charge': true, 'light.ult': true };
  /** Whose Ultimate hits make no hit sounds (beams that tick constantly). */
  const QUIET_ULT = { light: true };
  ERX.ElementSfx = {
    VOICES: V, KINDS, SILENT,
    /** A move being used: the M1 swings, a skill casts. */
    move(el, slot, awk) { if (!el || (el === 'sound' && awk)) return; play(slot === 'm1' ? 'swing' : 'cast', { el, awk, minGap: 0.03 }); },
    /** A move landing on something (bigger hits sound bigger). */
    hit(el, dmg, awk, ult) { if (!el || (ult && QUIET_ULT[el])) return; play('hit', { el, awk, s: clamp((dmg || 10) / 18, 0.5, 2) * (ult ? 1.2 : 1), minGap: ult ? 0.12 : 0.05 }); },
    /** An explosion. */
    boom(el, r, awk, ult) { if (!el || (ult && QUIET_ULT[el])) return; play('boom', { el, awk, s: clamp((r || 40) / 55, 0.6, 2), minGap: 0.1 }); },
    dash(el, awk) { if (el) play('dash', { el, awk, minGap: 0.08 }); },
    charge(el, awk) { if (el) play('charge', { el, awk, minGap: 0.5 }); },
    ult(el, awk) { if (el) play('ult', { el, awk, minGap: 0.5 }); },
  };
  // ------------------------------------------------------------ Planetfall: the black hole (awakened Gravity)
  Object.assign(ERX.SfxBank, {
    /** The sky tearing open: a rising rip full of crackle. */
    bhTear(a, d, t) {
      nz(a, d, t, { dur: 0.8, vol: 0.22, type: 'bandpass', freq: 400, freqEnd: 3200, Q: 1.4, attack: 0.25, release: 0.25 });
      crackle(a, d, t + 0.1, 0.7, 0.06, 1800, 90);
      tn(a, d, t, { wave: 'sawtooth', freq: 60, freqEnd: 240, slideTime: 0.8, dur: 0.8, vol: 0.06, attack: 0.3, release: 0.2 });
    },
    /** The hole opening and growing: a sub drone that swells, the air being dragged in past you. o.dur = how long. */
    bhOpen(a, d, t, o) {
      const dur = (o && o.dur) || 3;
      tn(a, d, t, { wave: 'sine', freq: 48, freqEnd: 30, slideTime: dur, dur, vol: 0.3, attack: dur * 0.6, release: 0.3 });
      tn(a, d, t, { wave: 'sawtooth', freq: 72, freqEnd: 44, slideTime: dur, dur, vol: 0.05, attack: dur * 0.7, release: 0.3, vibrato: 6, vibratoRate: 3 });
      nz(a, d, t, { dur, vol: 0.18, type: 'bandpass', freq: 1800, freqEnd: 220, Q: 0.8, attack: dur * 0.75, release: 0.25 });
      nz(a, d, t + dur * 0.3, { dur: dur * 0.7, vol: 0.12, type: 'lowpass', freq: 300, attack: dur * 0.5, release: 0.3 });
      for (let i = 0; i < 6; i++) whoosh(a, d, t + 0.3 + (i * dur) / 7, 0.5, 0.05, 2400, 300, 1.2);
    },
    /** It collapses: everything gets sucked into one point, pinching up and stopping dead. */
    bhCollapse(a, d, t) {
      nz(a, d, t, { dur: 0.65, vol: 0.28, type: 'bandpass', freq: 150, freqEnd: 4000, Q: 1.2, attack: 0.6, release: 0.02 });
      tn(a, d, t, { wave: 'sine', freq: 40, freqEnd: 600, slideTime: 0.65, dur: 0.65, vol: 0.16, attack: 0.5, release: 0.02 });
      tn(a, d, t, { wave: 'square', freq: 80, freqEnd: 1200, slideTime: 0.65, dur: 0.65, vol: 0.03, attack: 0.5, release: 0.02 });
    },
    /** The single point it collapsed into: a thin ping in the silence. */
    bhPoint(a, d, t) { tn(a, d, t, { wave: 'sine', freq: 2600, dur: 0.05, vol: 0.06, attack: 0.002, release: 0.25 }); tn(a, d, t, { wave: 'sine', freq: 5200, dur: 0.05, vol: 0.02, attack: 0.002, release: 0.15 }); },
    /** PLANETFALL: a sub punch, a wall of noise, debris raining back down, and your ears ringing. */
    bhBoom(a, d, t) {
      tn(a, d, t, { wave: 'sine', freq: 90, freqEnd: 22, slideTime: 1.4, dur: 1.6, vol: 0.36, attack: 0.002, release: 1.2 });
      tn(a, d, t, { wave: 'triangle', freq: 180, freqEnd: 40, slideTime: 0.6, dur: 0.7, vol: 0.16, attack: 0.002, release: 0.5 });
      nz(a, d, t, { dur: 2.2, vol: 0.3, type: 'lowpass', freq: 3000, freqEnd: 140, attack: 0.002, release: 2 });
      nz(a, d, t, { dur: 0.25, vol: 0.2, type: 'highpass', freq: 2500, release: 0.25 });
      crackle(a, d, t + 0.25, 1.8, 0.05, 900, 40);
      tn(a, d, t + 0.1, { wave: 'sine', freq: 3900, dur: 1.6, vol: 0.012, attack: 0.3, release: 1.3 });
    },

    // ---------------------------------------------------------- Reality Collapse (awakened Chaos's Ultimate)
    /** Every colour there is pouring into you, mid-air: a rising swell, a climbing sparkle, a building drone. o.dur = how long. */
    chaosRise(a, d, t, o) {
      const dur = (o && o.dur) || 1.3;
      nz(a, d, t, { dur, vol: 0.14, type: 'bandpass', freq: 260, freqEnd: 5200, Q: 1.1, attack: dur * 0.9, release: 0.05 });
      tn(a, d, t, { wave: 'sawtooth', freq: 55, freqEnd: 220, slideTime: dur, dur, vol: 0.05, attack: dur * 0.8, release: 0.05 });
      tn(a, d, t, { wave: 'sine', freq: 40, freqEnd: 80, slideTime: dur, dur, vol: 0.18, attack: dur * 0.7, release: 0.05 });
      for (let i = 0; i < 18; i++) tn(a, d, t + (i / 18) * dur, { wave: 'triangle', freq: 330 * Math.pow(2, (i % 9) / 4.5), dur: 0.05, vol: 0.02 + 0.03 * (i / 18), attack: 0.004, release: 0.12 });
      glitch(a, d, t + dur * 0.6, dur * 0.4, 0.025);
    },
    /**
     * THE ROAR: a monstrous voice. Two detuned saws and a sub-octave square for the throat, their pitch rattling (the growl)
     * and the whole voice fluttering in volume (the gravel), torn up by distortion, then shaped by the mouth (vowel formants
     * opening from AAH towards AWR), with breath rasping through it and a sub-bass in the chest. It swells in, howls, cracks
     * and drags out ragged at the end. o.dur = how long.
     */
    chaosRoar(a, d, t, o) {
      const ctx = a.ctx, dur = (o && o.dur) || 4.6, end = t + dur;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(1, t + 0.16);
      env.gain.setValueAtTime(1, t + dur * 0.45);
      env.gain.linearRampToValueAtTime(0.82, t + dur * 0.55);
      env.gain.linearRampToValueAtTime(1, t + dur * 0.65);   // a second wind
      env.gain.exponentialRampToValueAtTime(0.4, t + dur * 0.9);
      env.gain.exponentialRampToValueAtTime(0.0001, end);
      const level = ctx.createGain(); level.gain.value = 0.55;
      env.connect(level); level.connect(d);
      // the throat
      const voice = ctx.createGain(); voice.gain.value = 0.3;
      const oscs = [];
      for (const [mul, type] of [[1, 'sawtooth'], [1.013, 'sawtooth'], [0.5, 'square']]) {
        const os = ctx.createOscillator(), f = os.frequency;
        os.type = type;
        f.setValueAtTime(72 * mul, t); f.exponentialRampToValueAtTime(134 * mul, t + 0.3); f.exponentialRampToValueAtTime(118 * mul, t + dur * 0.45);
        f.exponentialRampToValueAtTime(126 * mul, t + dur * 0.62); f.exponentialRampToValueAtTime(92 * mul, t + dur * 0.88); f.exponentialRampToValueAtTime(58 * mul, end);
        for (let k = 0.2; k < dur; k += R(0.08, 0.2)) os.detune.linearRampToValueAtTime(R(-70, 70), t + k);   // the voice cracking and wavering
        os.connect(voice); oscs.push(os);
      }
      // the growl: the pitch rattles...
      const rattle = ctx.createOscillator(), rattleAmt = ctx.createGain();
      rattle.type = 'sawtooth'; rattle.frequency.setValueAtTime(27, t); rattle.frequency.linearRampToValueAtTime(40, end);
      rattleAmt.gain.value = 14; rattle.connect(rattleAmt); for (const os of oscs) rattleAmt.connect(os.frequency);
      // ...and the volume flutters with it (the gravel)
      const flutter = ctx.createGain(); flutter.gain.value = 0.62;
      const am = ctx.createOscillator(), amAmt = ctx.createGain();
      am.type = 'sine'; am.frequency.setValueAtTime(31, t); am.frequency.linearRampToValueAtTime(46, end);
      amAmt.gain.value = 0.38; am.connect(amAmt); amAmt.connect(flutter.gain);
      // a torn throat
      const shaper = ctx.createWaveShaper(), curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 5) * 0.9; }
      shaper.curve = curve;
      voice.connect(shaper); shaper.connect(flutter);
      // breath rasping through it
      const ns = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
      ns.buffer = a.noise; ns.loop = true;
      nf.type = 'bandpass'; nf.frequency.setValueAtTime(1500, t); nf.frequency.linearRampToValueAtTime(950, end); nf.Q.value = 0.8;
      ng.gain.value = 0.5; ns.connect(nf); nf.connect(ng); ng.connect(flutter);
      // the mouth: vowel formants, opening up and then closing a little
      for (const [f0, f1, q, g0] of [[620, 790, 5, 1.6], [1050, 1260, 6, 1.1], [2400, 2650, 8, 0.55], [300, 280, 3, 0.7]]) {
        const bp = ctx.createBiquadFilter(), gg = ctx.createGain();
        bp.type = 'bandpass'; bp.Q.value = q;
        bp.frequency.setValueAtTime(f0, t); bp.frequency.linearRampToValueAtTime(f1, t + 0.45); bp.frequency.linearRampToValueAtTime(f0 * 0.85, end);
        gg.gain.value = g0; flutter.connect(bp); bp.connect(gg); gg.connect(env);
      }
      // the chest
      const sub = ctx.createOscillator(), sg = ctx.createGain();
      sub.type = 'sine'; sub.frequency.setValueAtTime(50, t); sub.frequency.exponentialRampToValueAtTime(34, end);
      sg.gain.value = 0.32; sub.connect(sg); sg.connect(env);
      for (const n of [...oscs, rattle, am, sub]) { n.start(t); n.stop(end + 0.05); }
      ns.start(t, Math.random()); ns.stop(end + 0.05);
    },
    /** You snap back to the ground: a glitchy stutter and a thump. */
    chaosBlink(a, d, t) {
      glitch(a, d, t, 0.16, 0.06);
      tn(a, d, t, { wave: 'square', freq: 1600, freqEnd: 90, slideTime: 0.12, dur: 0.12, vol: 0.05, release: 0.05 });
      thud(a, d, t + 0.1, 80, 0.22, 0.2);
    },
  });
})(window.ERX = window.ERX || {});
