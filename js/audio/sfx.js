/*
 * Sound effect bank — every UI sound is synthesised on the fly.
 * Signature: fn(audio, destination, startTime, options)
 */
(function (ERX) {
  'use strict';

  const SfxBank = {
    hover(a, d, t) {
      a.tone(d, { wave: 'pulse25', freq: 1320, t, dur: 0.025, vol: 0.05, release: 0.03 });
    },

    move(a, d, t) {
      a.tone(d, { wave: 'pulse25', freq: 990, t, dur: 0.03, vol: 0.06, release: 0.03 });
    },

    select(a, d, t) {
      a.tone(d, { wave: 'pulse25', freq: 784, t, dur: 0.05, vol: 0.09 });
      a.tone(d, { wave: 'pulse25', freq: 1175, t: t + 0.05, dur: 0.05, vol: 0.09 });
      a.tone(d, { wave: 'pulse125', freq: 1568, t: t + 0.1, dur: 0.09, vol: 0.07, release: 0.12 });
    },

    back(a, d, t) {
      a.tone(d, { wave: 'pulse25', freq: 880, t, dur: 0.05, vol: 0.08 });
      a.tone(d, { wave: 'pulse25', freq: 587, t: t + 0.055, dur: 0.07, vol: 0.08, release: 0.08 });
    },

    transition(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.4, vol: 0.06, type: 'bandpass', freq: 300, freqEnd: 3200, Q: 1.4, attack: 0.15, release: 0.3 });
      a.tone(d, { wave: 'triangle', freq: 220, freqEnd: 660, t, dur: 0.3, vol: 0.05, release: 0.15 });
    },

    toggleOn(a, d, t) {
      a.tone(d, { wave: 'pulse25', freq: 660, t, dur: 0.04, vol: 0.08 });
      a.tone(d, { wave: 'pulse25', freq: 990, t: t + 0.045, dur: 0.06, vol: 0.08 });
    },

    toggleOff(a, d, t) {
      a.tone(d, { wave: 'pulse25', freq: 990, t, dur: 0.04, vol: 0.08 });
      a.tone(d, { wave: 'pulse25', freq: 660, t: t + 0.045, dur: 0.06, vol: 0.08 });
    },

    tick(a, d, t, o) {
      const v = o && o.value !== undefined ? o.value : 50;
      a.tone(d, { wave: 'triangle', freq: 500 + v * 9, t, dur: 0.03, vol: 0.12, release: 0.03 });
    },

    tab(a, d, t) {
      a.tone(d, { wave: 'pulse125', freq: 1046, t, dur: 0.04, vol: 0.07 });
      a.tone(d, { wave: 'pulse125', freq: 1396, t: t + 0.04, dur: 0.05, vol: 0.06 });
    },

    deny(a, d, t) {
      a.tone(d, { wave: 'square', freq: 155, t, dur: 0.16, vol: 0.07, vibrato: 25, vibratoRate: 30, vibratoDelay: 0.01 });
    },

    listen(a, d, t) {
      a.tone(d, { wave: 'pulse125', freq: 1760, t, dur: 0.03, vol: 0.06 });
      a.tone(d, { wave: 'pulse125', freq: 1760, t: t + 0.08, dur: 0.03, vol: 0.06 });
    },

    bound(a, d, t) {
      a.tone(d, { wave: 'pulse25', freq: 1046, t, dur: 0.05, vol: 0.08 });
      a.tone(d, { wave: 'pulse25', freq: 1318, t: t + 0.05, dur: 0.05, vol: 0.08 });
      a.tone(d, { wave: 'pulse25', freq: 2093, t: t + 0.1, dur: 0.1, vol: 0.06, release: 0.15 });
    },

    swap(a, d, t) {
      a.tone(d, { wave: 'pulse25', freq: 1318, t, dur: 0.05, vol: 0.07 });
      a.tone(d, { wave: 'pulse25', freq: 988, t: t + 0.06, dur: 0.05, vol: 0.07 });
      a.tone(d, { wave: 'pulse25', freq: 1318, t: t + 0.12, dur: 0.07, vol: 0.07 });
    },

    type(a, d, t) {
      a.tone(d, { wave: 'pulse25', freq: 600 + Math.random() * 260, t, dur: 0.02, vol: 0.045, release: 0.02 });
    },

    thud(a, d, t) {
      a.tone(d, { wave: 'sine', freq: 140, freqEnd: 38, t, dur: 0.25, vol: 0.4, release: 0.15 });
      a.noiseBurst(d, { t, dur: 0.12, vol: 0.12, type: 'lowpass', freq: 900, release: 0.12 });
    },

    start(a, d, t) {
      const notes = [523, 659, 784, 1046, 1318];
      notes.forEach((f, i) => a.tone(d, { wave: 'pulse25', freq: f, t: t + i * 0.05, dur: 0.07, vol: 0.07, release: 0.1 }));
      a.tone(d, { wave: 'triangle', freq: 1568, t: t + 0.25, dur: 0.35, vol: 0.08, release: 0.4, vibrato: 12, vibratoDelay: 0.1 });
      a.noiseBurst(d, { t, dur: 0.5, vol: 0.035, type: 'highpass', freq: 5000, attack: 0.2, release: 0.4 });
    },

    logo(a, d, t) {
      a.tone(d, { wave: 'sine', freq: 110, freqEnd: 45, t, dur: 0.35, vol: 0.3, release: 0.25 });
      a.noiseBurst(d, { t, dur: 0.25, vol: 0.06, type: 'lowpass', freq: 600, release: 0.3 });
      a.tone(d, { wave: 'triangle', freq: 880, t: t + 0.02, dur: 0.4, vol: 0.04, release: 0.5, vibrato: 8 });
    },

    star(a, d, t) {
      [1318, 1568, 2093, 2637].forEach((f, i) => a.tone(d, { wave: 'pulse125', freq: f, t: t + i * 0.06, dur: 0.06, vol: 0.06, release: 0.12 }));
    },

    anvil(a, d, t, o) {
      const pan = (o && o.pan) || 0;
      const vol = (o && o.volume) || 0.05;
      [1250, 2840, 4130].forEach((f, i) =>
        a.tone(d, { wave: 'sine', freq: f, t, dur: 0.01, vol: vol / (i + 1), attack: 0.001, release: 0.5 / (i + 1), pan })
      );
      a.noiseBurst(d, { t, dur: 0.02, vol: vol * 0.8, type: 'highpass', freq: 3000, release: 0.03, pan });
    },
  };

  ERX.SfxBank = SfxBank;
})(window.ERX = window.ERX || {});
