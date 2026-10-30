/*
 * AWAKENED SOUND's instrument: its moves play actual music.
 * Everything is in E minor pentatonic at 150 BPM, so whatever you do fits together:
 * the M1 walks a riff one note per swing (every third swing is a power chord),
 * the Subwoofer plays a bass line, the Drumline plays a fill, Resonant Frequency
 * climbs the scale, and World Resonance is a whole song in four parts.
 *
 *   ERX.Audio.playSfx('sndNote', { i: 3 })   ...see the SfxBank entries below.
 */
(function (ERX) {
  'use strict';

  const Gt = ERX.Guitar, semis = Gt.semis;
  const E2 = 82.41;
  const PENTA = [0, 3, 5, 7, 10];                       // E G A B D
  /** Frequency of scale step n, `oct` octaves above E2. */
  const deg = (n, oct) => semis(E2, 12 * ((oct || 0) + Math.floor(n / 5)) + PENTA[((n % 5) + 5) % 5]);
  const EIGHTH = 60 / 150 / 2;
  // the riff the M1 walks through, one note per swing
  const RIFF = [0, 2, 3, 2, 4, 3, 2, 0, 5, 4, 3, 2];
  const BASSLINE = [0, 0, 1, 0, 3, 0, 2, 4];

  // ------------------------------------------------------------ the band
  const amp = (a, d, drive, vol) => Gt.pedal(a, d, drive || 60, vol || 0.3, 3600);
  function kick(a, d, t, v) { a.tone(d, { wave: 'sine', freq: 150, freqEnd: 42, slideTime: 0.12, t, dur: 0.14, vol: v || 0.32, attack: 0.002, release: 0.06 }); a.noiseBurst(d, { t, dur: 0.02, vol: 0.05, type: 'lowpass', freq: 1200 }); }
  function snare(a, d, t, v) { a.noiseBurst(d, { t, dur: 0.12, vol: v || 0.16, type: 'bandpass', freq: 1900, Q: 0.8, release: 0.12 }); a.tone(d, { wave: 'triangle', freq: 210, freqEnd: 150, t, dur: 0.06, vol: 0.08, release: 0.05 }); }
  function hat(a, d, t, v) { a.noiseBurst(d, { t, dur: 0.03, vol: v || 0.05, type: 'highpass', freq: 7000, release: 0.03 }); }
  function crash(a, d, t, v) { a.noiseBurst(d, { t, dur: 0.8, vol: v || 0.09, type: 'highpass', freq: 5200, Q: 0.5, release: 0.9 }); }
  function bass(a, d, t, f, dur) { a.tone(d, { wave: 'square', freq: f, t, dur: dur || 0.18, vol: 0.08, attack: 0.004, release: 0.06, sustain: 0.7, decay: 0.08 }); a.tone(d, { wave: 'sine', freq: f / 2, t, dur: dur || 0.18, vol: 0.15, release: 0.06 }); }
  function pluck(a, d, t, f, vol) { a.tone(d, { wave: 'triangle', freq: f, t, dur: 0.12, vol: vol || 0.1, attack: 0.002, release: 0.2, sustain: 0.3, decay: 0.08 }); a.tone(d, { wave: 'square', freq: f * 2, t, dur: 0.05, vol: (vol || 0.1) * 0.25, release: 0.08 }); }

  Object.assign(ERX.SfxBank, {
    /** The next note of the riff (o.i = how far along it you are). */
    sndNote(a, d, t, o) { const i = (o && o.i) || 0; Gt.lead(a, amp(a, d, 55, 0.26), deg(RIFF[i % RIFF.length], 2), t, 0.2, { vol: 0.1 }); hat(a, d, t, 0.03); },
    /** A power chord with a kick under it (o.n = scale step, o.crash adds a cymbal). */
    sndChord(a, d, t, o) { Gt.powerChord(a, amp(a, d, 70, 0.3), deg((o && o.n) || 0, 0), t, (o && o.dur) || 0.45, {}); kick(a, d, t); if (o && o.crash) crash(a, d, t); },
    /** A clean note, for echoes (o.n = scale step, o.vol). */
    sndPing(a, d, t, o) { pluck(a, d, t, deg((o && o.n) || 0, 3), (o && o.vol) || 0.1); },
    /** The subwoofer's beat: kick + the next note of the bass line (o.i). */
    sndBass(a, d, t, o) { const i = (o && o.i) || 0; kick(a, d, t, 0.36); bass(a, d, t, deg(BASSLINE[i % BASSLINE.length], 1), 0.26); hat(a, d, t + EIGHTH, 0.04); },
    /** One hit of the drumline (o.i = 0..3): kick, snare, kick, snare + crash. */
    sndDrum(a, d, t, o) { const i = (o && o.i) || 0; if (i % 2 === 0) kick(a, d, t, 0.34); else snare(a, d, t, 0.18); hat(a, d, t, 0.04); if (i === 3) crash(a, d, t); },
    /** Feedback: two screaming leads bending against each other. */
    sndFeedback(a, d, t) { Gt.lead(a, amp(a, d, 120, 0.22), deg(4, 3), t, 1.6, { bend: 1.12, bendT: 0.5, vib: true, vol: 0.07 }); Gt.lead(a, amp(a, d, 120, 0.18), deg(2, 3), t + 0.05, 1.5, { bend: 0.94, bendT: 0.7, vib: true, vol: 0.05 }); },
    /** Resonant Frequency: each tick climbs one step higher (o.i)... */
    sndRise(a, d, t, o) { const i = (o && o.i) || 0; Gt.lead(a, amp(a, d, 40 + i * 12, 0.22), deg(i * 2, 2), t, 0.22, { vib: true, vol: 0.08 + i * 0.008 }); hat(a, d, t, 0.03); },
    /** ...until it shatters on a huge chord. */
    sndShatter(a, d, t) { Gt.powerChord(a, amp(a, d, 90, 0.29), deg(0, 1), t, 0.8, { vib: true }); kick(a, d, t, 0.34); crash(a, d, t, 0.11); },
    /** MIC DROP: chord, kick, crash, and the feedback squeal after. */
    sndMicDrop(a, d, t) { Gt.powerChord(a, amp(a, d, 100, 0.29), deg(0, 0), t, 1.2, { vib: true }); kick(a, d, t, 0.36); crash(a, d, t, 0.12); Gt.lead(a, amp(a, d, 120, 0.16), deg(4, 3), t + 0.25, 0.9, { bend: 1.06, vib: true, vol: 0.05 }); },
    /** The Noise Wall stopping a hit: a muted chord stab. */
    sndStab(a, d, t) { Gt.powerChord(a, amp(a, d, 60, 0.24), deg(3, 0), t, 0.14, { mute: true }); },
    /** WORLD RESONANCE, one part at a time (o.part: intro / beat (o.i) / clash / scream / end). */
    sndUlt(a, d, t, o) {
      const part = o && o.part, i = (o && o.i) || 0;
      if (part === 'intro') { Gt.powerChord(a, amp(a, d, 110, 0.29), deg(0, 0), t, 1.1, { vib: true }); kick(a, d, t, 0.36); crash(a, d, t, 0.12); Gt.lead(a, amp(a, d, 90, 0.17), deg(0, 3), t + 0.05, 1.0, { vib: true, vol: 0.06 }); }
      else if (part === 'beat') {
        const step = i % 8;
        if (step === 0 || step === 3 || step === 5) kick(a, d, t, 0.36);
        if (step === 2 || step === 6) snare(a, d, t, 0.17);
        hat(a, d, t, step % 2 ? 0.03 : 0.05);
        bass(a, d, t, deg(BASSLINE[i % 8], 1), 0.16);
        Gt.lead(a, amp(a, d, 70, 0.22), deg(RIFF[i % RIFF.length] + 5, 1), t, 0.16, { vol: 0.07 });
      } else if (part === 'clash') { crash(a, d, t, 0.16); for (let k = 0; k < 6; k++) snare(a, d, t + k * EIGHTH * 0.5, 0.1 + k * 0.015); Gt.powerChord(a, amp(a, d, 100, 0.34), semis(E2, 8), t, 0.6, { vib: true }); }
      else if (part === 'scream') { Gt.powerChord(a, amp(a, d, 110, 0.28), semis(E2, 7), t, 0.8, { vib: true }); Gt.lead(a, amp(a, d, 130, 0.17), deg(5, 3), t, 0.8, { bend: 1.12, bendT: 0.3, vib: true, vol: 0.08 }); kick(a, d, t, 0.34); }
      else if (part === 'end') { Gt.powerChord(a, amp(a, d, 110, 0.3), deg(0, 0), t, 1.4, { vib: true }); kick(a, d, t, 0.38); crash(a, d, t, 0.13); }
    },
  });
})(window.ERX = window.ERX || {});
