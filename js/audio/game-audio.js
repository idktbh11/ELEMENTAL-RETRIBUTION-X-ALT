/*
 * Gameplay audio: extra instruments, the in-game soundtrack, gameplay SFX
 * and the cave soundscape. Extends the banks defined in music.js, sfx.js
 * and ambience.js.
 */
(function (ERX) {
  'use strict';

  const V = ERX.MusicVoices;
  const rand = (a, b) => a + Math.random() * (b - a);

  // ---------------------------------------------------------- instruments
  V.kazoo = (a, d, f, t, dur, tr) => {
    a.tone(d, { wave: 'sawtooth', freq: f, t, dur: Math.min(dur * 0.9, 0.7), vol: tr.lead.vol * 0.55, attack: 0.03, release: 0.06, vibrato: f * 0.04, vibratoRate: 7, vibratoDelay: 0.02 });
    a.tone(d, { wave: 'pulse25', freq: f * 1.003, t, dur: Math.min(dur * 0.9, 0.7), vol: tr.lead.vol * 0.4, attack: 0.03, release: 0.06, vibrato: f * 0.03, vibratoRate: 6.3 });
  };
  V.boing = (a, d, f, t, dur, tr) => {
    a.tone(d, { wave: 'triangle', freq: f * 0.85, freqEnd: f, slideTime: 0.05, t, dur: dur * 0.7, vol: tr.bass.vol, attack: 0.003, decay: 0.1, sustain: 0.5, release: 0.05 });
  };
  V.drone = (a, d, f, t, dur, tr) => {
    a.tone(d, { wave: 'sawtooth', freq: f, t, dur: dur * 0.98, vol: tr.pad.vol, attack: 0.2, release: 0.3, vibrato: 2, vibratoRate: 0.5 });
  };

  // ------------------------------------------------------------- tracks
  Object.assign(ERX.MusicTracks, {
    // Exploring the cave: quiet, echoey, a little lonely.
    cave: {
      title: 'Somewhere Underground',
      bpm: 70, stepsPerBar: 16, restEvery: 2,
      chords: 'Am Am F G Am Am Dm E',
      lead: {
        inst: 'bell', vol: 0.05, res: 8,
        notes:
          'E5 - - . . . A5 - | G5 - - . E5 - - . | F5 - - . C5 - - . | D5 - - - B4 - - . |' +
          'E5 - - . . . C6 - | B5 - - . A5 - - . | F5 - - . D5 - A5 - | G#5 - - - E5 - - .',
      },
      bass: { octave: 2, vol: 0.15, pattern: 'R - - - - - - - - - - - - - - -' },
      arp: { octave: 4, vol: 0.022, wave: 'triangle', pattern: [0, null, null, null, 2, null, null, null, 1, null, null, null, 3, null, null, null] },
      pad: { octave: 3, vol: 0.012 },
      drums: { vol: 0.45, pattern: '. . . . . . . . . . . . . . x .' },
    },

    // The "boss" is coming. (It is not.)
    boss: {
      title: 'An Ominous Rumble',
      bpm: 150, stepsPerBar: 16, swing: 0,
      chords: 'Em Em C B Em Em C B',
      bass: { octave: 2, vol: 0.2, pattern: 'R R 8 R R R 8 R R R 8 R R 8 R 8' },
      stab: { octave: 4, vol: 0.02, pattern: 'x . . . . . . . x . . . . . x .' },
      arp: { octave: 5, vol: 0.016, pattern: [0, 1, 2, 1, 0, 1, 2, 3, 0, 1, 2, 1, 3, 2, 1, 0] },
      pad: { octave: 2, vol: 0.02, inst: 'drone' },
      drums: { vol: 0.9, pattern: 'k . h . kc . h . k k h . kc . h h' },
    },

    // The Voice: goofy, confused, slightly off-kilter waltz with a kazoo.
    voice: {
      title: 'Who Even Are You (Kazoo Waltz)',
      bpm: 104, stepsPerBar: 12, swing: 0, restEvery: 0,
      chords: 'C Ab C Db C Ab G7 G7',
      lead: {
        inst: 'kazoo', vol: 0.06, res: 6,
        notes:
          'E5 . G5 . C6 B5 | C6 . Ab5 . Eb5 . | G5 F5 E5 D#5 E5 . | F5 . Ab5 . Db6 - |' +
          'C6 . G5 . E5 G5 | Ab5 . Eb5 . C5 . | B4 C5 D5 F5 G5 . | F5 E5 D5 C#5 D5 -',
      },
      bass: { octave: 2, vol: 0.2, inst: 'boing', pattern: 'R . . . . . . . . . . .' },
      stab: { octave: 4, vol: 0.02, pattern: '. . . . x . . . x . . .' },
      drums: { vol: 0.55, pattern: 'k . . . s . . . s . . .' },
    },

    // After the gates open: let's go.
    onward: {
      title: 'Go Hit Something',
      bpm: 128, stepsPerBar: 16, swing: 0.1, restEvery: 4,
      chords: 'Am F C G Am F G E',
      lead: {
        inst: 'lead', vol: 0.045, res: 8,
        notes:
          'A4 C5 E5 . A5 . G5 E5 | F5 . A5 . C6 . A5 F5 | E5 . G5 . C6 . G5 E5 | D5 . G5 . B5 . D6 . |' +
          'E5 . A5 C6 . B5 A5 . | F5 . A5 . C6 . F6 . | D6 . B5 . G5 . D5 . | E5 - G#5 - B5 - E6 .',
      },
      bass: { octave: 2, vol: 0.2, pattern: 'R . 8 R . 8 R . R . 8 R . 8 7 .' },
      stab: { octave: 4, vol: 0.015, pattern: '. . x . . . x . . . x . . x . .' },
      drums: { vol: 0.8, pattern: 'k . h . kc . h k . k h . kc . o .' },
    },
  });

  Object.assign(ERX.MusicTracks, {
    // THE DEEP ENDS: bright, sparkly, a little bouncy. Monsters? What monsters?
    deepends: {
      title: 'Bright Down Here',
      bpm: 104, stepsPerBar: 16, swing: 0.12, restEvery: 3,
      chords: 'Fmaj7 G Em7 Am7 Fmaj7 G Am7 C',
      lead: {
        inst: 'lead', vol: 0.042, res: 8,
        notes:
          'C6 . A5 . G5 . E5 . | D5 . G5 . B5 . D6 . | E6 . D6 B5 . G5 . E5 | A5 - - . C6 . E6 . |' +
          'F6 . E6 . C6 . A5 . | G5 . B5 . D6 . G6 . | E6 . C6 . A5 . E5 . | G5 - A5 - B5 - C6 .',
      },
      bass: { octave: 2, vol: 0.18, pattern: 'R . . 8 . . 5 . R . . 8 . 5 7 .' },
      arp: { octave: 5, vol: 0.016, wave: 'triangle', pattern: [0, null, 2, null, 3, null, 2, null, 1, null, 3, null, 2, null, 0, null] },
      drums: { vol: 0.65, pattern: 'k . h . c . h k . . h . c . h x' },
    },
    // Elevator music. Smooth. Cheesy. Unstoppable. (It stops.)
    elevator: {
      title: 'Going Up (Smooth Mix)',
      bpm: 96, stepsPerBar: 16, swing: 0.2, restEvery: 0,
      chords: 'Cmaj7 Am7 Dm7 G7 Cmaj7 A7 Dm7 G7',
      lead: {
        inst: 'bell', vol: 0.05, res: 8,
        notes:
          'E5 - G5 . B5 - A5 . | G5 - E5 . C5 - . . | F5 - A5 . C6 - B5 . | A5 - G5 . F5 - D5 . |' +
          'E5 - G5 . B5 - D6 . | C#6 - A5 . G5 - E5 . | F5 - E5 . D5 - C5 . | B4 - D5 . G5 - . .',
      },
      bass: { octave: 2, vol: 0.17, pattern: 'R . . 5 . . R . . . 5 . R . 8 .' },
      pad: { octave: 4, vol: 0.013 },
      drums: { vol: 0.5, pattern: 'x . h x . h x . x . h x . h x .' },
    },
  });

  // ---------------------------------------------------------- gameplay SFX
  Object.assign(ERX.SfxBank, {
    step(a, d, t) { a.noiseBurst(d, { t, dur: 0.03, vol: 0.025, type: 'lowpass', freq: 500, release: 0.03 }); },
    jump(a, d, t) { a.tone(d, { wave: 'pulse25', freq: 300, freqEnd: 560, slideTime: 0.08, t, dur: 0.08, vol: 0.05, release: 0.04 }); },
    land(a, d, t) {
      a.tone(d, { wave: 'sine', freq: 130, freqEnd: 60, t, dur: 0.07, vol: 0.12, release: 0.05 });
      a.noiseBurst(d, { t, dur: 0.05, vol: 0.04, type: 'lowpass', freq: 700, release: 0.05 });
    },
    dash(a, d, t) {
      // FWOOSH: an airy sweep, a falling tone and a little push-off thump
      a.noiseBurst(d, { t, dur: 0.22, vol: 0.17, type: 'bandpass', freq: 3200, freqEnd: 450, Q: 1.6, attack: 0.004, release: 0.18 });
      a.tone(d, { wave: 'triangle', freq: 620, freqEnd: 150, slideTime: 0.16, t, dur: 0.16, vol: 0.09, release: 0.06 });
      a.tone(d, { wave: 'sine', freq: 110, freqEnd: 45, t, dur: 0.07, vol: 0.18, release: 0.06 });
    },
    swing(a, d, t) {
      // a quick, sharp WHFF of air
      a.noiseBurst(d, { t, dur: 0.11, vol: 0.14, type: 'bandpass', freq: 1400, freqEnd: 4200, Q: 2.2, attack: 0.008, release: 0.06 });
      a.noiseBurst(d, { t: t + 0.03, dur: 0.08, vol: 0.06, type: 'highpass', freq: 3000, release: 0.05 });
      a.tone(d, { wave: 'triangle', freq: 380, freqEnd: 900, slideTime: 0.07, t, dur: 0.07, vol: 0.035, release: 0.03 });
    },
    punchHit(a, d, t) {
      // THWACK
      a.noiseBurst(d, { t, dur: 0.06, vol: 0.2, type: 'lowpass', freq: 1400, release: 0.06 });
      a.tone(d, { wave: 'sine', freq: 190, freqEnd: 60, t, dur: 0.08, vol: 0.22, release: 0.06 });
      a.tone(d, { wave: 'square', freq: 900, freqEnd: 300, t, dur: 0.02, vol: 0.04, release: 0.02 });
    },
    slimeHop(a, d, t) { a.tone(d, { wave: 'sine', freq: 260, freqEnd: 520, slideTime: 0.08, t, dur: 0.08, vol: 0.05, release: 0.05 }); },
    slimeHurt(a, d, t) {
      a.tone(d, { wave: 'sine', freq: 520, freqEnd: 180, t, dur: 0.12, vol: 0.08, release: 0.06, vibrato: 40, vibratoRate: 30, vibratoDelay: 0.01 });
      a.noiseBurst(d, { t, dur: 0.06, vol: 0.06, type: 'lowpass', freq: 900, release: 0.06 });
    },
    slimeDie(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.18, vol: 0.14, type: 'lowpass', freq: 1200, freqEnd: 200, release: 0.15 });
      a.tone(d, { wave: 'sine', freq: 440, freqEnd: 90, slideTime: 0.25, t, dur: 0.25, vol: 0.1, release: 0.08, vibrato: 30, vibratoRate: 25 });
    },
    batFlap(a, d, t) { a.noiseBurst(d, { t, dur: 0.04, vol: 0.03, type: 'bandpass', freq: 900, Q: 1, release: 0.04 }); },
    batScreech(a, d, t) { a.tone(d, { wave: 'square', freq: 1900, freqEnd: 2600, slideTime: 0.1, t, dur: 0.12, vol: 0.025, release: 0.05, vibrato: 80, vibratoRate: 40, vibratoDelay: 0.01 }); },
    batHurt(a, d, t) { a.tone(d, { wave: 'square', freq: 1500, freqEnd: 900, t, dur: 0.07, vol: 0.04, release: 0.04 }); },
    batDie(a, d, t) {
      a.tone(d, { wave: 'square', freq: 1800, freqEnd: 300, slideTime: 0.3, t, dur: 0.3, vol: 0.04, release: 0.08, vibrato: 60, vibratoRate: 30 });
      a.noiseBurst(d, { t, dur: 0.1, vol: 0.06, type: 'bandpass', freq: 1200, release: 0.1 });
    },
    levelUp(a, d, t) {
      [523, 659, 784, 1046].forEach((f, i) => a.tone(d, { wave: 'pulse25', freq: f, t: t + i * 0.07, dur: 0.08, vol: 0.08, release: 0.06 }));
      a.tone(d, { wave: 'pulse25', freq: 1318, t: t + 0.3, dur: 0.3, vol: 0.08, release: 0.3, vibrato: 14, vibratoDelay: 0.1 });
      a.tone(d, { wave: 'triangle', freq: 659, t: t + 0.3, dur: 0.3, vol: 0.08, release: 0.3 });
    },
    clap(a, d, t) {
      for (let i = 0; i < 3; i++) a.noiseBurst(d, { t: t + i * 0.008, dur: 0.008, vol: 0.12, type: 'bandpass', freq: 1500, Q: 1.3, release: 0.012 });
      a.noiseBurst(d, { t: t + 0.025, dur: 0.06, vol: 0.06, type: 'bandpass', freq: 1300, release: 0.07 });
    },
    revive(a, d, t) {
      [392, 523, 659, 784, 1046].forEach((f, i) => a.tone(d, { wave: 'triangle', freq: f, t: t + i * 0.09, dur: 0.12, vol: 0.07, release: 0.2 }));
      a.noiseBurst(d, { t, dur: 0.6, vol: 0.04, type: 'highpass', freq: 4000, attack: 0.2, release: 0.4 });
    },
    /** Achievement unlocked: a bright little fanfare. */
    achievement(a, d, t) {
      [784, 988, 1175, 1568].forEach((f, i) => a.tone(d, { wave: 'square', freq: f, t: t + i * 0.08, dur: 0.07, vol: 0.05, release: 0.08 }));
      for (const f of [1568, 1976, 2349]) a.tone(d, { wave: 'triangle', freq: f, t: t + 0.34, dur: 0.5, vol: 0.04, attack: 0.01, release: 0.6 });
      a.noiseBurst(d, { t: t + 0.34, dur: 0.05, vol: 0.06, type: 'highpass', freq: 6000, release: 0.5 });
    },
    ding(a, d, t) {
      a.tone(d, { wave: 'sine', freq: 1318, t, dur: 0.01, vol: 0.09, attack: 0.002, release: 0.8 });
      a.tone(d, { wave: 'sine', freq: 1046, t: t + 0.25, dur: 0.01, vol: 0.09, attack: 0.002, release: 1.0 });
    },
    elevatorHum(a, d, t) { a.tone(d, { wave: 'sawtooth', freq: 55, t, dur: 0.6, vol: 0.03, attack: 0.1, release: 0.2 }); },
    screech(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.7, vol: 0.18, type: 'bandpass', freq: 3500, freqEnd: 1200, Q: 4, attack: 0.01, release: 0.4 });
      a.tone(d, { wave: 'sawtooth', freq: 1800, freqEnd: 400, slideTime: 0.6, t, dur: 0.6, vol: 0.05, release: 0.2, vibrato: 60, vibratoRate: 35 });
      a.tone(d, { wave: 'sine', freq: 70, freqEnd: 35, t: t + 0.5, dur: 0.3, vol: 0.3, release: 0.3 });
    },
    crash(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.4, vol: 0.25, type: 'lowpass', freq: 2000, freqEnd: 200, release: 0.4 });
      a.tone(d, { wave: 'sine', freq: 120, freqEnd: 35, t, dur: 0.35, vol: 0.35, release: 0.3 });
      [180, 377, 611].forEach((f, i) => a.tone(d, { wave: 'sine', freq: f, t, dur: 0.01, vol: 0.1 / (i + 1), attack: 0.002, release: 0.7 }));
    },
    npc(a, d, t, o) {
      const p = (o && o.pitch) || 1;
      a.tone(d, { wave: 'triangle', freq: (170 + Math.random() * 60) * p, t, dur: 0.05, vol: 0.06, attack: 0.004, release: 0.03 });
    },
    hitMetal(a, d, t) {
      [380, 917, 1460, 2210].forEach((f, i) => a.tone(d, { wave: 'sine', freq: f * rand(0.97, 1.03), t, dur: 0.01, vol: 0.07 / (i + 1), attack: 0.001, release: 0.35 / (i + 1) }));
      a.noiseBurst(d, { t, dur: 0.03, vol: 0.08, type: 'bandpass', freq: 2500, release: 0.04 });
      a.tone(d, { wave: 'sine', freq: 120, freqEnd: 70, t, dur: 0.06, vol: 0.12, release: 0.06 });
    },
    block(a, d, t) {
      a.tone(d, { wave: 'sine', freq: 1760, t, dur: 0.01, vol: 0.06, attack: 0.001, release: 0.35 });
      a.tone(d, { wave: 'sine', freq: 2637, t, dur: 0.01, vol: 0.04, attack: 0.001, release: 0.25 });
      a.noiseBurst(d, { t, dur: 0.02, vol: 0.06, type: 'highpass', freq: 4000, release: 0.03 });
    },
    /** Raising your guard: a short "fwump". */
    guardUp(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.06, vol: 0.07, type: 'bandpass', freq: 900, release: 0.06 });
      a.tone(d, { wave: 'triangle', freq: 220, freqEnd: 330, t, dur: 0.06, vol: 0.06, release: 0.05 });
    },
    /** A hit stopped by your block: a solid impact + your element's flavour (js/data/kits/guards.js). */
    blockHit(a, d, t, o) {
      const k = (o && o.kind) || 'plain';
      a.tone(d, { wave: 'square', freq: 150, freqEnd: 70, t, dur: 0.07, vol: 0.09, release: 0.06 });
      a.noiseBurst(d, { t, dur: 0.04, vol: 0.1, type: 'lowpass', freq: 1800, release: 0.05 });
      const ring = (fs, vol, rel) => fs.forEach((f, i) => a.tone(d, { wave: 'sine', freq: f * rand(0.98, 1.02), t, dur: 0.01, vol: vol / (i + 1), attack: 0.001, release: rel / (i + 1) }));
      switch (k) {
        case 'clang': ring([520, 1247, 1980, 2890], 0.09, 0.5); break;
        case 'glass': ring([1760, 2637, 3520], 0.06, 0.4); a.noiseBurst(d, { t, dur: 0.03, vol: 0.06, type: 'highpass', freq: 5000, release: 0.05 }); break;
        case 'crackle': for (let i = 0; i < 6; i++) a.noiseBurst(d, { t: t + i * 0.025, dur: 0.01, vol: 0.06, type: 'highpass', freq: 2500 + i * 300, release: 0.02 }); a.noiseBurst(d, { t, dur: 0.15, vol: 0.05, type: 'bandpass', freq: 700, release: 0.1 }); break;
        case 'splash': a.noiseBurst(d, { t, dur: 0.18, vol: 0.09, type: 'bandpass', freq: 1400, release: 0.15 }); a.tone(d, { wave: 'sine', freq: 600, freqEnd: 1200, t, dur: 0.08, vol: 0.05, release: 0.05 }); break;
        case 'whoosh': a.noiseBurst(d, { t, dur: 0.2, vol: 0.08, type: 'bandpass', freq: 500, freqEnd: 1500, release: 0.15 }); break;
        case 'thud': a.tone(d, { wave: 'sine', freq: 90, freqEnd: 40, t, dur: 0.16, vol: 0.18, release: 0.12 }); a.noiseBurst(d, { t, dur: 0.1, vol: 0.08, type: 'lowpass', freq: 600, release: 0.1 }); break;
        case 'zap': a.tone(d, { wave: 'sawtooth', freq: 1400, freqEnd: 300, t, dur: 0.08, vol: 0.05, release: 0.04 }); a.noiseBurst(d, { t, dur: 0.06, vol: 0.06, type: 'highpass', freq: 3000, release: 0.05 }); break;
        case 'chime': [1318, 1760, 2093].forEach((f, i) => a.tone(d, { wave: 'triangle', freq: f, t: t + i * 0.03, dur: 0.02, vol: 0.05, release: 0.35 })); break;
        case 'wood': a.tone(d, { wave: 'triangle', freq: 320, freqEnd: 260, t, dur: 0.05, vol: 0.12, release: 0.08 }); a.tone(d, { wave: 'triangle', freq: 640, t, dur: 0.02, vol: 0.05, release: 0.06 }); break;
        case 'squelch': a.tone(d, { wave: 'sine', freq: 300, freqEnd: 90, t, dur: 0.12, vol: 0.1, release: 0.08, vibrato: 40, vibratoRate: 30 }); a.noiseBurst(d, { t, dur: 0.1, vol: 0.06, type: 'lowpass', freq: 900, release: 0.08 }); break;
        case 'bone': for (let i = 0; i < 3; i++) a.tone(d, { wave: 'square', freq: rand(900, 1300), t: t + i * 0.03, dur: 0.012, vol: 0.05, release: 0.03 }); break;
        case 'tick': a.tone(d, { wave: 'square', freq: 2200, t, dur: 0.01, vol: 0.06, release: 0.02 }); a.tone(d, { wave: 'square', freq: 1600, t: t + 0.12, dur: 0.01, vol: 0.05, release: 0.02 }); break;
        case 'boom': a.tone(d, { wave: 'sine', freq: 70, freqEnd: 45, t, dur: 0.25, vol: 0.2, release: 0.15 }); a.tone(d, { wave: 'square', freq: 140, t, dur: 0.05, vol: 0.05, release: 0.05 }); break;
        case 'psi': a.tone(d, { wave: 'sine', freq: 880, freqEnd: 440, t, dur: 0.2, vol: 0.06, release: 0.1, vibrato: 60, vibratoRate: 14 }); break;
        case 'glitch': for (let i = 0; i < 5; i++) a.tone(d, { wave: 'square', freq: rand(200, 2400), t: t + i * 0.02, dur: 0.02, vol: 0.04, release: 0.01 }); break;
        default: ring([1760, 2637], 0.06, 0.3);
      }
    },
    hurt(a, d, t) { a.tone(d, { wave: 'square', freq: 420, freqEnd: 140, t, dur: 0.16, vol: 0.06, release: 0.06 }); },
    wakePress(a, d, t, o) {
      const v = (o && o.value) || 0;
      a.tone(d, { wave: 'triangle', freq: 180 + v * 420, freqEnd: 220 + v * 460, t, dur: 0.06, vol: 0.07, release: 0.06 });
    },
    wakeUp(a, d, t) {
      a.tone(d, { wave: 'triangle', freq: 160, freqEnd: 780, slideTime: 0.22, t, dur: 0.24, vol: 0.14, release: 0.1, vibrato: 30, vibratoRate: 18, vibratoDelay: 0.05 });
      [1046, 1318, 1568].forEach((f, i) => a.tone(d, { wave: 'pulse125', freq: f, t: t + 0.2 + i * 0.05, dur: 0.05, vol: 0.05, release: 0.1 }));
    },
    gateClang(a, d, t) {
      [110, 233, 371, 587].forEach((f, i) => a.tone(d, { wave: 'sine', freq: f, t, dur: 0.01, vol: 0.12 / (i + 1), attack: 0.002, release: 0.9 / (i + 1) }));
      a.noiseBurst(d, { t, dur: 0.15, vol: 0.12, type: 'lowpass', freq: 1500, release: 0.2 });
    },
    gateRattle(a, d, t) {
      for (let i = 0; i < 6; i++) a.tone(d, { wave: 'sine', freq: rand(700, 1300), t: t + i * 0.05, dur: 0.01, vol: 0.02, attack: 0.001, release: 0.06 });
    },
    rumble(a, d, t, o) {
      const dur = (o && o.dur) || 2.5;
      a.noiseBurst(d, { t, dur, vol: 0.3, type: 'lowpass', freq: 110, attack: dur * 0.4, release: dur * 0.6 });
      a.tone(d, { wave: 'sine', freq: 45, t, dur, vol: 0.18, attack: dur * 0.4, release: 0.4, vibrato: 4, vibratoRate: 9 });
    },
    partyHorn(a, d, t) {
      a.tone(d, { wave: 'sawtooth', freq: 480, freqEnd: 720, slideTime: 0.18, t, dur: 0.75, vol: 0.06, attack: 0.04, release: 0.1, vibrato: 18, vibratoRate: 11, vibratoDelay: 0.12 });
      a.tone(d, { wave: 'pulse25', freq: 482, freqEnd: 724, slideTime: 0.18, t, dur: 0.75, vol: 0.05, attack: 0.04, release: 0.1, vibrato: 15, vibratoRate: 9, vibratoDelay: 0.12 });
      a.noiseBurst(d, { t, dur: 0.75, vol: 0.02, type: 'bandpass', freq: 1500, attack: 0.05, release: 0.1 });
    },
    pop(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.03, vol: 0.12, type: 'bandpass', freq: 1800, release: 0.04 });
      a.tone(d, { wave: 'sine', freq: 900, freqEnd: 300, t, dur: 0.06, vol: 0.08, release: 0.05 });
    },
    confetti(a, d, t) {
      for (let i = 0; i < 10; i++) a.noiseBurst(d, { t: t + rand(0, 0.35), dur: 0.01, vol: 0.03, type: 'highpass', freq: rand(3000, 7000), release: 0.02, pan: rand(-0.7, 0.7) });
    },
    recordScratch(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.25, vol: 0.12, type: 'bandpass', freq: 3200, freqEnd: 300, Q: 3, attack: 0.01, release: 0.1 });
      a.tone(d, { wave: 'sawtooth', freq: 1400, freqEnd: 200, slideTime: 0.25, t, dur: 0.25, vol: 0.04, release: 0.05 });
    },
    voice(a, d, t, o) {
      const p = (o && o.pitch) || 1;
      a.tone(d, { wave: 'pulse25', freq: rand(230, 330) * p, freqEnd: rand(200, 360) * p, slideTime: 0.05, t, dur: 0.045, vol: 0.05, attack: 0.004, release: 0.03, vibrato: 25, vibratoRate: 22, vibratoDelay: 0.005 });
    },
    voiceAngry(a, d, t) {
      a.tone(d, { wave: 'square', freq: rand(320, 420), t, dur: 0.04, vol: 0.05, attack: 0.002, release: 0.02 });
    },
    sigh(a, d, t) {
      a.noiseBurst(d, { t, dur: 1.0, vol: 0.07, type: 'bandpass', freq: 1400, freqEnd: 350, Q: 1.3, attack: 0.15, release: 0.6 });
      a.tone(d, { wave: 'pulse25', freq: 300, freqEnd: 160, slideTime: 0.9, t, dur: 0.9, vol: 0.03, attack: 0.1, release: 0.2, vibrato: 10, vibratoRate: 12 });
    },
    ignite(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.6, vol: 0.12, type: 'bandpass', freq: 400, freqEnd: 2600, Q: 0.8, attack: 0.05, release: 0.5 });
      a.tone(d, { wave: 'sine', freq: 90, freqEnd: 50, t, dur: 0.3, vol: 0.2, release: 0.3 });
    },
    read(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.04, vol: 0.04, type: 'highpass', freq: 3000, release: 0.04 });
      a.noiseBurst(d, { t: t + 0.07, dur: 0.05, vol: 0.035, type: 'highpass', freq: 2500, release: 0.05 });
    },
    bolt(a, d, t) { a.tone(d, { wave: 'pulse25', freq: 980, freqEnd: 380, slideTime: 0.12, t, dur: 0.12, vol: 0.05, release: 0.04 }); },
    objective(a, d, t) {
      a.tone(d, { wave: 'pulse25', freq: 784, t, dur: 0.06, vol: 0.06 });
      a.tone(d, { wave: 'pulse25', freq: 1046, t: t + 0.07, dur: 0.06, vol: 0.06 });
      a.tone(d, { wave: 'pulse25', freq: 1568, t: t + 0.14, dur: 0.12, vol: 0.06, release: 0.15 });
    },
  });

  // --------------------------------------------------------- cave ambience
  class CaveAmbience {
    constructor(a, dest) {
      this.a = a;
      const ctx = a.ctx;
      this.out = ctx.createGain();
      this.out.gain.setValueAtTime(0.0001, ctx.currentTime);
      this.out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 2);
      this.out.connect(dest);
      const src = ctx.createBufferSource();
      src.buffer = a.noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 220;
      const g = ctx.createGain();
      g.gain.value = 0.07;
      src.connect(f); f.connect(g); g.connect(this.out);
      src.start();
      this.src = src;
      this.rumbleT = 12;
    }
    update(dt) {
      const t = this.a.ctx.currentTime;
      this.rumbleT -= dt;
      if (this.rumbleT <= 0) {
        this.rumbleT = rand(14, 28);
        this.a.noiseBurst(this.out, { t, dur: 2, vol: 0.05, type: 'lowpass', freq: 90, attack: 0.8, release: 1.2 });
      }
    }
    stop() {
      const ctx = this.a.ctx;
      this.out.gain.cancelScheduledValues(ctx.currentTime);
      this.out.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
      setTimeout(() => { try { this.src.stop(); } catch (e) { /* ignore */ } this.out.disconnect(); }, 2000);
    }
  }
  ERX.AmbienceBank.cave = CaveAmbience;
})(window.ERX = window.ERX || {});
