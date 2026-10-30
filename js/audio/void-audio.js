/*
 * Audio for THE VOID and the HQ: two tracks, plus the Voice's shocked
 * sting, the scan, the energy key, the lock breaking, coins and shopping.
 */
(function (ERX) {
  'use strict';

  const rand = (a, b) => a + Math.random() * (b - a);

  Object.assign(ERX.MusicTracks, {
    // Floating in nothing. Big, slow, a little lonely, a little pretty.
    void: {
      title: 'Nowhere In Particular',
      bpm: 58, stepsPerBar: 16, restEvery: 0,
      chords: 'Dmaj7 Bm7 Gmaj7 A Dmaj7 F#m7 Gmaj7 A',
      lead: {
        inst: 'bell', vol: 0.035, res: 8,
        notes:
          'F#5 - - . . . A5 - | D6 - - . . . C#6 - | B5 - - . . . . . | E5 - - - - - . . |' +
          'F#5 - - . . . A5 - | C#6 - - . E6 - - . | D6 - - . B5 - - . | A5 - - - - - . .',
      },
      arp: { octave: 4, vol: 0.012, wave: 'triangle', pattern: [0, null, null, 2, null, null, 1, null, null, 3, null, null, 2, null, 1, null] },
      pad: { octave: 3, vol: 0.018, inst: 'drone' },
    },
    // The HQ: lounge music. Smooth. Slightly too smooth.
    hq: {
      title: 'Hold Music For Heroes',
      bpm: 92, stepsPerBar: 16, swing: 0.22, restEvery: 0,
      chords: 'Fmaj7 Em7 Dm7 Cmaj7 Bbmaj7 Am7 Gm7 C7',
      lead: {
        inst: 'bell', vol: 0.045, res: 8,
        notes:
          'A5 - C6 . E6 - D6 . | B5 - G5 . E5 - . . | F5 - A5 . C6 - B5 . | G5 - E5 . C5 - . . |' +
          'D5 - F5 . A5 - G5 . | E5 - C5 . A4 - . . | Bb4 - D5 . F5 - A5 . | G5 - - . E5 - . .',
      },
      bass: { octave: 2, vol: 0.16, pattern: 'R . . 5 . . 8 . R . . 5 . 7 8 .' },
      pad: { octave: 4, vol: 0.012 },
      drums: { vol: 0.45, pattern: 'k . h . s . h k . . h . s . h h' },
    },
  });

  Object.assign(ERX.SfxBank, {
    // ------------------------------------------------------- the Voice
    /** A slow cloak swish (turning around). */
    figureTurn(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.5, vol: 0.05, type: 'bandpass', freq: 700, Q: 0.8, attack: 0.2, release: 0.3 });
    },
    /** The comedic shocked sting: DUN! + a boing. */
    figureShock(a, d, t) {
      for (const f of [196, 233, 277]) a.tone(d, { wave: 'square', freq: f, t, dur: 0.18, vol: 0.06, attack: 0.002, release: 0.25 });
      a.noiseBurst(d, { t, dur: 0.05, vol: 0.12, type: 'lowpass', freq: 1800, release: 0.2 });
      a.tone(d, { wave: 'sine', freq: 300, freqEnd: 900, slideTime: 0.12, t: t + 0.12, dur: 0.18, vol: 0.12, release: 0.12, vibrato: 40, vibratoRate: 18 });
    },
    /** A door popping into existence out of nowhere. */
    doorPop(a, d, t) {
      a.tone(d, { wave: 'sine', freq: 220, freqEnd: 880, slideTime: 0.1, t, dur: 0.12, vol: 0.14, release: 0.1 });
      a.noiseBurst(d, { t, dur: 0.15, vol: 0.06, type: 'highpass', freq: 3000, release: 0.2 });
    },
    doorOpen(a, d, t) {
      a.tone(d, { wave: 'square', freq: 160, freqEnd: 120, t, dur: 0.18, vol: 0.04, release: 0.1 });
      a.noiseBurst(d, { t: t + 0.25, dur: 0.06, vol: 0.12, type: 'lowpass', freq: 600, release: 0.15 });
    },
    // ------------------------------------------------------- the scan
    scan(a, d, t, o) {
      const dur = (o && o.dur) || 2.2;
      for (let s = 0; s < dur; s += 0.18) a.tone(d, { wave: 'square', freq: 1200 + (s / dur) * 800, t: t + s, dur: 0.04, vol: 0.03, release: 0.04 });
      a.tone(d, { wave: 'sawtooth', freq: 180, freqEnd: 360, slideTime: dur, t, dur, vol: 0.025, attack: 0.1, release: 0.2 });
    },
    scanDone(a, d, t) {
      a.tone(d, { wave: 'square', freq: 1568, t, dur: 0.08, vol: 0.05, release: 0.05 });
      a.tone(d, { wave: 'square', freq: 2093, t: t + 0.09, dur: 0.16, vol: 0.05, release: 0.2 });
    },
    // ------------------------------------------------------- the worlds
    worldsAppear(a, d, t) {
      [587, 740, 880, 1109, 1175, 1480, 1760].forEach((f, i) => a.tone(d, { wave: 'triangle', freq: f, t: t + i * 0.32, dur: 0.6, vol: 0.05, attack: 0.02, release: 1.0 }));
      a.tone(d, { wave: 'sine', freq: 73, t, dur: 2.6, vol: 0.12, attack: 1.2, release: 1.2 });
      a.noiseBurst(d, { t, dur: 2.4, vol: 0.03, type: 'highpass', freq: 6000, attack: 1.2, release: 1.0 });
    },
    energyCharge(a, d, t) {
      a.tone(d, { wave: 'sawtooth', freq: 110, freqEnd: 880, slideTime: 1.4, t, dur: 1.4, vol: 0.05, attack: 0.3, release: 0.1 });
      for (let i = 0; i < 10; i++) a.tone(d, { wave: 'sine', freq: rand(1500, 3000), t: t + i * 0.13, dur: 0.03, vol: 0.03, release: 0.08 });
    },
    keyShoot(a, d, t) {
      a.tone(d, { wave: 'square', freq: 1400, freqEnd: 300, slideTime: 0.35, t, dur: 0.35, vol: 0.07, release: 0.1 });
      a.noiseBurst(d, { t, dur: 0.4, vol: 0.06, type: 'bandpass', freq: 2500, Q: 0.7, release: 0.3 });
    },
    lockBreak(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.05, vol: 0.25, type: 'highpass', freq: 2500, release: 0.4 });
      [523, 659, 784, 1046].forEach((f, i) => a.tone(d, { wave: 'triangle', freq: f, t: t + 0.08 + i * 0.07, dur: 0.15, vol: 0.07, release: 0.5 }));
      a.tone(d, { wave: 'sine', freq: 2093, t: t + 0.4, dur: 0.01, vol: 0.06, release: 1.2 });
    },
    // ------------------------------------------------------- you
    /** Stepping on the invisible floor: a soft glassy ripple. */
    voidStep(a, d, t) {
      a.tone(d, { wave: 'sine', freq: rand(900, 1100), freqEnd: 600, slideTime: 0.1, t, dur: 0.03, vol: 0.02, attack: 0.002, release: 0.12 });
    },
    launch(a, d, t) {
      a.tone(d, { wave: 'sawtooth', freq: 200, freqEnd: 1600, slideTime: 1.2, t, dur: 1.2, vol: 0.06, attack: 0.05, release: 0.2 });
      a.noiseBurst(d, { t, dur: 1.3, vol: 0.08, type: 'bandpass', freq: 1500, Q: 0.6, attack: 0.3, release: 0.4 });
    },
    // ------------------------------------------------------- abilities
    cast(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.12, vol: 0.06, type: 'bandpass', freq: 1800, Q: 0.8, release: 0.1 });
      a.tone(d, { wave: 'triangle', freq: rand(500, 700), freqEnd: rand(900, 1300), slideTime: 0.1, t, dur: 0.1, vol: 0.04, release: 0.1 });
    },
    whoosh(a, d, t) { a.noiseBurst(d, { t, dur: 0.35, vol: 0.07, type: 'bandpass', freq: 900, Q: 0.6, attack: 0.1, release: 0.2 }); },
    zap(a, d, t) {
      for (let i = 0; i < 4; i++) a.tone(d, { wave: 'square', freq: rand(900, 2400), t: t + i * 0.025, dur: 0.025, vol: 0.04, release: 0.02 });
      a.noiseBurst(d, { t, dur: 0.12, vol: 0.08, type: 'highpass', freq: 3000, release: 0.1 });
    },
    boom(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.3, vol: 0.18, type: 'lowpass', freq: 900, attack: 0.002, release: 0.35 });
      a.tone(d, { wave: 'sine', freq: 120, freqEnd: 40, t, dur: 0.3, vol: 0.25, release: 0.25 });
    },
    ultimate(a, d, t) {
      a.tone(d, { wave: 'sawtooth', freq: 110, freqEnd: 440, slideTime: 0.3, t, dur: 0.3, vol: 0.06, release: 0.1 });
      for (const f of [440, 554, 659, 880]) a.tone(d, { wave: 'square', freq: f, t: t + 0.3, dur: 0.5, vol: 0.04, attack: 0.01, release: 0.6 });
      a.noiseBurst(d, { t: t + 0.3, dur: 0.6, vol: 0.12, type: 'lowpass', freq: 1400, release: 0.6 });
      a.tone(d, { wave: 'sine', freq: 60, t: t + 0.3, dur: 0.8, vol: 0.3, release: 0.5 });
    },
    // ------------------------------------------------------- money
    coin(a, d, t) {
      a.tone(d, { wave: 'square', freq: 1319, t, dur: 0.05, vol: 0.04, release: 0.03 });
      a.tone(d, { wave: 'square', freq: 1760, t: t + 0.06, dur: 0.12, vol: 0.04, release: 0.15 });
    },
    buy(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.04, vol: 0.1, type: 'highpass', freq: 3000, release: 0.05 });
      [1046, 1319, 1568, 2093].forEach((f, i) => a.tone(d, { wave: 'square', freq: f, t: t + 0.05 + i * 0.05, dur: 0.06, vol: 0.035, release: 0.2 }));
    },
  });
})(window.ERX = window.ERX || {});
