/*
 * Audio for the WORLDS: the fall from the sky (portal, void, the light
 * cracking, the wind, the landing), the falling music and its ending, and
 * World 1's day + night themes and soundscape. Also the Voice's gadgets
 * (the telekinesis device, the VRD) and Checkshots.
 *
 * The falling music is two tracks: 'skyfall' loops while you fall, and the
 * moment you land 'skyfallEnd' plays ONCE (its first downbeat is the impact).
 */
(function (ERX) {
  'use strict';

  const V = ERX.MusicVoices;
  const rand = (a, b) => a + Math.random() * (b - a);

  // ---------------------------------------------------------- instruments
  /** Lush strings: two detuned saws with a slow swell and vibrato. */
  V.strings = (a, d, f, t, dur, tr) => {
    const vol = (tr.pad && tr.pad.vol) || 0.02;
    for (const det of [0.997, 1.003]) a.tone(d, { wave: 'sawtooth', freq: f * det, t, dur: dur * 0.98, vol: vol * 0.5, attack: Math.min(0.6, dur * 0.35), release: 0.6, vibrato: f * 0.006, vibratoRate: 5, vibratoDelay: 0.3 });
  };
  /** A breathy flute: a sine with a soft attack, vibrato and a puff of air. */
  V.flute = (a, d, f, t, dur, tr) => {
    a.tone(d, { wave: 'sine', freq: f, t, dur: Math.min(dur * 0.9, 1.2), vol: tr.lead.vol, attack: 0.04, decay: 0.1, sustain: 0.85, release: 0.12, vibrato: f * 0.012, vibratoRate: 5.2, vibratoDelay: 0.18 });
    a.tone(d, { wave: 'triangle', freq: f * 2, t, dur: Math.min(dur * 0.9, 1.2), vol: tr.lead.vol * 0.12, attack: 0.05, release: 0.1 });
    a.noiseBurst(d, { t, dur: 0.06, vol: tr.lead.vol * 0.5, type: 'bandpass', freq: f * 2, Q: 2, attack: 0.01, release: 0.05 });
  };
  /** A soaring lead for the fall: pulse + saw, wide vibrato. */
  V.soar = (a, d, f, t, dur, tr) => {
    a.tone(d, { wave: 'pulse25', freq: f, t, dur: Math.min(dur * 0.92, 1.4), vol: tr.lead.vol, attack: 0.02, decay: 0.2, sustain: 0.75, release: 0.15, vibrato: f * 0.016, vibratoRate: 5.5, vibratoDelay: 0.15 });
    a.tone(d, { wave: 'sawtooth', freq: f * 1.002, t, dur: Math.min(dur * 0.92, 1.4), vol: tr.lead.vol * 0.35, attack: 0.03, release: 0.15, vibrato: f * 0.014, vibratoRate: 5.3, vibratoDelay: 0.15 });
  };
  /** Big brass hit: stacked saws, a fast swell and a bright edge. */
  V.brass = (a, d, f, t, dur, tr) => {
    const vol = (tr.stab && tr.stab.vol) || 0.03;
    a.tone(d, { wave: 'sawtooth', freq: f, t, dur: Math.min(dur * 0.9, 1.6), vol, attack: 0.025, decay: 0.25, sustain: 0.7, release: 0.35 });
    a.tone(d, { wave: 'pulse25', freq: f * 0.5, t, dur: Math.min(dur * 0.9, 1.6), vol: vol * 0.6, attack: 0.03, release: 0.35 });
  };

  // ------------------------------------------------------------- tracks
  Object.assign(ERX.MusicTracks, {
    // Falling out of the sky: wonder, wind and a whole lot of momentum. D major.
    skyfall: {
      title: 'Terminal Velocity',
      bpm: 128, stepsPerBar: 16, restEvery: 0,
      chords: 'D A Bm G D A G A D F#m Bm G Em A D A',
      lead: {
        inst: 'soar', vol: 0.04, res: 8,
        notes:
          'F#5 - - - E5 - D5 - | E5 - - - A4 - - - | F#5 - - - E5 - D5 - | B4 - - - - - . . |' +
          'F#5 - - - A5 - - - | E5 - - - C#5 - - - | D5 - - - B4 - - - | C#5 - - - E5 - - - |' +
          'A5 - - - F#5 - D5 - | C#6 - - - A5 - - - | B5 - - - F#5 - - - | G5 - - - B5 - - - |' +
          'G5 - - - E5 - B4 - | E5 - - - C#5 - - - | D5 - - - F#5 - A5 - | A5 - - - - - . .',
      },
      bass: { octave: 2, vol: 0.15, pattern: 'R . R . R . R 8 R . R . R . 5 .' },
      arp: { octave: 5, vol: 0.011, wave: 'pulse125', pattern: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 2, 3] },
      pad: { octave: 3, vol: 0.016, inst: 'strings' },
      drums: { vol: 0.5, pattern: 'k . h h s . h k k . h h s . h o' },
    },
    // ...and the moment you hit the ground: the big finish, once.
    skyfallEnd: {
      title: 'Terminal Velocity (Landing)',
      once: true, fadeIn: 0.01,
      bpm: 128, stepsPerBar: 16, restEvery: 0,
      chords: 'D D Bm G A A D D',
      lead: {
        inst: 'soar', vol: 0.045, res: 8,
        notes:
          'D6 - - - - - - - | A5 - F#5 - D5 - - - | F#5 - - - E5 - D5 - | B4 - - - D5 - - - |' +
          'C#5 - - - E5 - - - | A5 - - - G5 - E5 - | F#5 - - - - - - - | D5 - - - - - - - ',
      },
      bass: { octave: 2, vol: 0.16, pattern: 'R - - - - - - - R - - - 5 - - -' },
      stab: { octave: 4, vol: 0.026, inst: 'brass', pattern: 'x . . . . . . . . . . . . . . .' },
      pad: { octave: 3, vol: 0.02, inst: 'strings' },
      drums: { vol: 0.55, pattern: 'ko . . . . . . . k . . . s . . .' },
    },
    // World 1 by day: green hills, blue sky, a flute that won't stop being happy. G major.
    world1: {
      title: 'A Perfectly Normal Planet',
      bpm: 96, stepsPerBar: 16, swing: 0.12, restEvery: 3,
      chords: 'G D Em C G D C D G Bm C Am Em D C D',
      lead: {
        inst: 'flute', vol: 0.05, res: 8,
        notes:
          'B5 - - . D6 - B5 . | A5 - - - F#5 - . . | G5 - - . B5 - A5 . | E5 - - - - - . . |' +
          'D5 - G5 . B5 - D6 . | C#6 - A5 . F#5 - . . | E5 - G5 . C6 - B5 . | A5 - - - - - . . |' +
          'B5 - - . G5 - D5 . | F#5 - - . B5 - D6 . | E6 - - . C6 - G5 . | A5 - - . C6 - E6 . |' +
          'D6 - - . B5 - G5 . | F#5 - - - A5 - . . | G5 - E5 . C5 - E5 . | D5 - - - - - . .',
      },
      bass: { octave: 2, vol: 0.13, pattern: 'R . . . 5 . . . 8 . . . 5 . . .' },
      arp: { octave: 5, vol: 0.008, wave: 'triangle', pattern: [0, null, 2, null, 1, null, 3, null, 2, null, 1, null, 3, null, 2, null] },
      pad: { octave: 3, vol: 0.014, inst: 'strings' },
      drums: { vol: 0.3, pattern: 'k . x . s . x . k k x . s . x x' },
    },
    // ...and by night: crickets, stars and a lullaby. E minor.
    world1Night: {
      title: 'Same Planet, Lights Off',
      bpm: 66, stepsPerBar: 16, restEvery: 2,
      chords: 'Em7 Cmaj7 G D Em7 Am7 Cmaj7 D',
      lead: {
        inst: 'bell', vol: 0.062, res: 8,
        notes:
          'G5 - - . B5 - - . | E5 - - - - - . . | D5 - - . G5 - B5 . | F#5 - - - - - . . |' +
          'B5 - - . G5 - - . | A5 - - . E5 - - . | G5 - - . E5 - C5 . | D5 - - - - - . .',
      },
      arp: { octave: 4, vol: 0.015, wave: 'triangle', pattern: [0, null, null, 2, null, null, 1, null, null, 3, null, null, 2, null, 1, null] },
      pad: { octave: 3, vol: 0.024, inst: 'strings' },
    },
  });

  // ------------------------------------------------------------- soundscapes
  const Base = ERX.AmbienceBase;

  /** The wind while you fall: a roar, a hiss that grows with speed, cloth flapping. Driven by ERX.Skyfall.wind (0..1). */
  class SkyfallAmbience extends Base {
    constructor(a, dest) {
      super(a, dest);
      this.roar = this.noiseBed('lowpass', 320, 0.7, 0.05);
      this.rush = this.noiseBed('bandpass', 900, 0.8, 0.03);
      this.hiss = this.noiseBed('highpass', 3500, 0.6, 0.01);
      this.flap = this.noiseBed('bandpass', 520, 2.2, 0.0);
      this.gust = 0;
    }
    update(dt) {
      super.update(dt);
      const t = this.now(), S = ERX.Skyfall || {}, k = S.wind !== undefined ? S.wind : 0.5;
      this.gust = Math.max(0, this.gust - dt * 0.6);
      this.every('gust', 1.2, 3.5, dt, () => { this.gust = rand(0.4, 1); });
      this.every('mod', 0.05, 0.05, dt, () => {
        const g = this.gust * 0.5, flutter = 0.5 + 0.5 * Math.sin(this.t * 74) * Math.sin(this.t * 13.7);
        this.roar.gain.gain.setTargetAtTime(0.03 + k * 0.13 + g * 0.04, t, 0.15);
        this.roar.filter.frequency.setTargetAtTime(220 + k * 260 + g * 120, t, 0.2);
        this.rush.gain.gain.setTargetAtTime(0.01 + k * 0.07 + g * 0.03, t, 0.12);
        this.rush.filter.frequency.setTargetAtTime(700 + k * 700 + Math.sin(this.t * 0.9) * 200, t, 0.2);
        this.hiss.gain.gain.setTargetAtTime(k * k * 0.035, t, 0.1);
        this.flap.gain.gain.setTargetAtTime(k * (S.flap !== undefined ? S.flap : 1) * 0.05 * flutter, t, 0.02);
      });
    }
  }

  /** World 1: a breeze in the grass, birds by day; crickets, frogs and an owl by night. Reads ERX.World1.night (0..1). */
  class World1Ambience extends Base {
    constructor(a, dest) {
      super(a, dest);
      this.breeze = this.noiseBed('lowpass', 480, 0.6, 0.04);
      this.leaves = this.noiseBed('bandpass', 2400, 0.7, 0.006);
    }
    update(dt) {
      super.update(dt);
      const t = this.now(), night = (ERX.World1 && ERX.World1.night) || 0;
      this.every('mod', 0.3, 0.3, dt, () => {
        const w = 0.025 + 0.03 * (0.5 + 0.5 * Math.sin(this.t * 0.23) * Math.sin(this.t * 0.07));
        this.breeze.gain.gain.setTargetAtTime(w, t, 0.8);
        this.leaves.gain.gain.setTargetAtTime(0.002 + w * 0.15, t, 0.6);
      });
      if (night < 0.6) {
        this.every('bird', 1.2, 4, dt, () => this.chirp(0.02 * (1 - night)));
        this.every('song', 6, 14, dt, () => {   // a little bird song: a run of notes
          const base = rand(2000, 2800), pan = rand(-0.8, 0.8), n = 4 + Math.floor(Math.random() * 4);
          for (let i = 0; i < n; i++) this.a.tone(this.out, { wave: 'sine', freq: base * (1 + (i % 3) * 0.12), freqEnd: base * (1.1 + (i % 2) * 0.2), slideTime: 0.06, t: t + i * 0.11, dur: 0.07, vol: 0.016 * (1 - night), attack: 0.005, release: 0.05, pan });
        });
      }
      if (night > 0.3) {
        this.every('crickets', 0.5, 1.1, dt, () => {
          const pan = rand(-0.9, 0.9), f = rand(4300, 5100);
          for (let i = 0; i < 4; i++) this.a.tone(this.out, { wave: 'sine', freq: f, t: t + i * 0.04, dur: 0.016, vol: 0.009 * night, attack: 0.003, release: 0.01, pan });
        });
        this.every('owl', 9, 22, dt, () => {
          const pan = rand(-0.7, 0.7);
          for (const [dt2, f] of [[0, 420], [0.35, 400], [0.62, 380]]) this.a.tone(this.out, { wave: 'sine', freq: f, freqEnd: f * 0.92, slideTime: 0.2, t: t + dt2, dur: 0.22, vol: 0.02 * night, attack: 0.05, release: 0.12, pan });
        });
      }
    }
  }
  ERX.AmbienceBank.skyfall = SkyfallAmbience;
  ERX.AmbienceBank.world1 = World1Ambience;

  // ------------------------------------------------------------- sound effects
  Object.assign(ERX.SfxBank, {
    // ---- entering a world
    /** A galaxy portal tearing open overhead: a deep swirl rising into a shimmer. */
    portalOpen(a, d, t) {
      a.tone(d, { wave: 'sine', freq: 70, freqEnd: 140, slideTime: 1.2, t, dur: 1.4, vol: 0.2, attack: 0.3, release: 0.6 });
      a.noiseBurst(d, { t, dur: 1.4, vol: 0.12, type: 'bandpass', freq: 300, freqEnd: 2600, Q: 1.3, attack: 0.6, release: 0.6 });
      for (let i = 0; i < 12; i++) a.tone(d, { wave: 'sine', freq: rand(900, 2400), t: t + 0.4 + i * 0.07, dur: 0.05, vol: 0.02, attack: 0.005, release: 0.3, pan: rand(-0.7, 0.7) });
    },
    /** Falling out of it: a big whoosh past your ears. */
    portalDrop(a, d, t) { a.noiseBurst(d, { t, dur: 0.7, vol: 0.2, type: 'bandpass', freq: 2400, freqEnd: 300, Q: 1, attack: 0.05, release: 0.6 }); },
    /** The void lighting up around you: a long rising shimmer. */
    brightRise(a, d, t) {
      for (const [f, v] of [[220, 0.05], [330, 0.04], [440, 0.035], [660, 0.025], [880, 0.02]]) a.tone(d, { wave: 'sine', freq: f, freqEnd: f * 2, slideTime: 1.6, t, dur: 1.7, vol: v, attack: 1.2, release: 0.15 });
      a.noiseBurst(d, { t, dur: 1.7, vol: 0.08, type: 'highpass', freq: 2000, freqEnd: 8000, attack: 1.4, release: 0.1 });
    },
    /** The light cracking like glass. o.i = which crack (they get bigger). */
    lightCrack(a, d, t, o) {
      const i = (o && o.i) || 0;
      a.noiseBurst(d, { t, dur: 0.05, vol: 0.12 + i * 0.03, type: 'highpass', freq: 3000, release: 0.08 });
      for (let k = 0; k < 6 + i * 3; k++) a.noiseBurst(d, { t: t + Math.random() * 0.12, dur: 0.008, vol: 0.06, type: 'bandpass', freq: rand(3000, 7000), Q: 4, release: 0.01 });
      a.tone(d, { wave: 'sine', freq: rand(2600, 3600), t, dur: 0.02, vol: 0.05, attack: 0.002, release: 0.4 });
    },
    /** ...and breaking: a shatter, a bright burst, and the world's air rushing in. */
    lightShatter(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.6, vol: 0.32, type: 'highpass', freq: 1800, release: 0.6 });
      a.noiseBurst(d, { t, dur: 0.9, vol: 0.2, type: 'lowpass', freq: 1200, freqEnd: 200, release: 0.8 });
      for (let k = 0; k < 26; k++) a.tone(d, { wave: 'sine', freq: rand(2500, 6500), t: t + 0.05 + Math.random() * 0.8, dur: 0.02, vol: 0.025, attack: 0.002, release: rand(0.1, 0.4), pan: rand(-0.9, 0.9) });
      a.tone(d, { wave: 'sine', freq: 110, freqEnd: 45, slideTime: 0.6, t, dur: 0.7, vol: 0.25, release: 0.5 });
    },
    /** Punching down through the cloud layer: a soft, muffled whoosh. */
    cloudPuff(a, d, t) { a.noiseBurst(d, { t, dur: 1.1, vol: 0.3, type: 'lowpass', freq: 900, freqEnd: 300, attack: 0.25, release: 0.7 }); },
    /** Something smacked into you mid-air. */
    skyBonk(a, d, t) {
      a.tone(d, { wave: 'square', freq: 320, freqEnd: 120, slideTime: 0.12, t, dur: 0.14, vol: 0.09, release: 0.08 });
      a.noiseBurst(d, { t, dur: 0.08, vol: 0.14, type: 'bandpass', freq: 900, Q: 1, release: 0.08 });
    },
    birdSquawk(a, d, t) { for (let i = 0; i < 2; i++) a.tone(d, { wave: 'sawtooth', freq: 1400 - i * 200, freqEnd: 900, slideTime: 0.08, t: t + i * 0.1, dur: 0.08, vol: 0.05, attack: 0.005, release: 0.05, vibrato: 60, vibratoRate: 30 }); },
    balloonBoing(a, d, t) { a.tone(d, { wave: 'sine', freq: 180, freqEnd: 420, slideTime: 0.15, t, dur: 0.3, vol: 0.14, release: 0.2, vibrato: 30, vibratoRate: 14 }); },
    /** You hit the ground. Hard. (Your element's boom plays on top.) */
    landSlam(a, d, t) {
      a.tone(d, { wave: 'sine', freq: 120, freqEnd: 30, slideTime: 0.5, t, dur: 0.6, vol: 0.45, attack: 0.002, release: 0.45 });
      a.noiseBurst(d, { t, dur: 0.9, vol: 0.34, type: 'lowpass', freq: 1600, freqEnd: 120, release: 0.8 });
      for (let k = 0; k < 20; k++) a.noiseBurst(d, { t: t + 0.08 + Math.random() * 0.7, dur: 0.01, vol: 0.05, type: 'bandpass', freq: rand(800, 2400), Q: 3, release: 0.02 });
    },
    /** Standing back up (cloth + a little grunt of effort). */
    getUp(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.25, vol: 0.05, type: 'bandpass', freq: 1200, Q: 0.8, attack: 0.08, release: 0.15 });
      a.tone(d, { wave: 'triangle', freq: 180, freqEnd: 150, t: t + 0.05, dur: 0.12, vol: 0.04, attack: 0.02, release: 0.06 });
    },

    // ---- the Voice's gadgets
    /** The telekinesis device grabbing you: a warbling sci-fi beam. */
    tkBeam(a, d, t) {
      a.tone(d, { wave: 'sawtooth', freq: 220, freqEnd: 440, slideTime: 0.3, t, dur: 1.6, vol: 0.05, attack: 0.05, release: 0.3, vibrato: 40, vibratoRate: 9 });
      a.tone(d, { wave: 'sine', freq: 880, t, dur: 1.6, vol: 0.03, attack: 0.05, release: 0.3, vibrato: 120, vibratoRate: 12 });
      a.noiseBurst(d, { t, dur: 1.6, vol: 0.04, type: 'bandpass', freq: 1800, Q: 2, attack: 0.1, release: 0.3 });
    },
    /** Item get! A bright little fanfare. */
    itemGet(a, d, t) {
      [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.32]].forEach(([f, dt]) => {
        a.tone(d, { wave: 'pulse25', freq: f, t: t + dt, dur: dt === 0.32 ? 0.5 : 0.09, vol: 0.06, attack: 0.004, release: 0.12 });
        a.tone(d, { wave: 'sine', freq: f * 2, t: t + dt, dur: 0.05, vol: 0.02, attack: 0.004, release: 0.2 });
      });
    },
    /** A Checkshot waking up: a rising chime and a soft hum. */
    checkshotOn(a, d, t) {
      for (const [f, dt] of [[659, 0], [988, 0.12], [1319, 0.24]]) a.tone(d, { wave: 'sine', freq: f, t: t + dt, dur: 0.04, vol: 0.07, attack: 0.003, release: 0.9 });
      a.tone(d, { wave: 'triangle', freq: 165, t, dur: 1.2, vol: 0.05, attack: 0.2, release: 0.6 });
    },
    /** A Checkshot waking up for Chaos: the same chime... but it stutters, lands on a wrong note and sags, over a low tritone. */
    checkshotChaos(a, d, t) {
      for (const [f, dt] of [[659, 0], [988, 0.11], [1397, 0.22], [932, 0.3]]) for (let i = 0; i < 3; i++) a.tone(d, { wave: 'square', freq: f * (1 + (i - 1) * 0.014), t: t + dt + i * 0.024, dur: 0.02, vol: 0.03, attack: 0.002, release: 0.14 });
      a.tone(d, { wave: 'sine', freq: 932, freqEnd: 466, slideTime: 0.9, t: t + 0.34, dur: 0.9, vol: 0.05, attack: 0.04, release: 0.5 });
      a.tone(d, { wave: 'triangle', freq: 116.5, t, dur: 1.4, vol: 0.06, attack: 0.25, release: 0.7 });
      a.tone(d, { wave: 'triangle', freq: 164.8, t, dur: 1.4, vol: 0.04, attack: 0.25, release: 0.7 });
      for (let i = 0; i < 7; i++) a.tone(d, { wave: 'square', freq: [3520, 1760, 5274, 2637][i % 4], t: t + 0.12 + i * 0.045, dur: 0.012, vol: 0.022, attack: 0.001, release: 0.02 });   // digital crackle
    },
    /** The VRD pulling you out of a world: a reversed swell into a zap. */
    recallOut(a, d, t) {
      a.noiseBurst(d, { t, dur: 1.1, vol: 0.18, type: 'bandpass', freq: 200, freqEnd: 5000, Q: 1.4, attack: 1.0, release: 0.05 });
      a.tone(d, { wave: 'sine', freq: 110, freqEnd: 1760, slideTime: 1.1, t, dur: 1.15, vol: 0.1, attack: 0.8, release: 0.05 });
      a.tone(d, { wave: 'square', freq: 1760, freqEnd: 220, slideTime: 0.2, t: t + 1.12, dur: 0.22, vol: 0.06, release: 0.12 });
    },
  });
})(window.ERX = window.ERX || {});
