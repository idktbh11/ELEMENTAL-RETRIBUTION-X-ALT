/*
 * Funky chiptune sequencer + the original menu soundtrack.
 *
 * Each menu world has its own short looping groove, written as plain data:
 *   chords: one chord per bar
 *   lead:   melody tokens ('-' = hold, '.' = rest, '|' = bar line); `res` = tokens per bar
 *   bass:   per-bar pattern of chord degrees (R=root, 3, 5, 7, 8=octave up)
 *   arp:    per-bar list of chord-tone indices (wraps into higher octaves)
 *   stab:   per-bar pattern where 'x' plays the full chord briefly
 *   drums:  per-bar pattern; a token may stack hits, e.g. 'kh'
 *           (k=kick, s=snare, c=clap, h=hat, o=open hat, x=shaker)
 *   swing:  0..0.3, delays every off-beat 16th for that bouncy feel
 *   once:   true = play through one time and stop (an ending), instead of looping
 *   fadeIn: seconds to fade in (default 2); an ending that has to hit on cue uses ~0
 *
 * The sequencer also reports beats so visuals can dance in time.
 * All music here is composed for this project and synthesised live.
 */
(function (ERX) {
  'use strict';

  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function noteToMidi(n) {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
    if (!m) return null;
    let s = SEMI[m[1]];
    if (m[2] === '#') s++;
    if (m[2] === 'b') s--;
    return 12 * (parseInt(m[3], 10) + 1) + s;
  }

  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function parseChord(sym) {
    const m = /^([A-G])(#|b)?(.*)$/.exec(sym);
    let root = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    const q = m[3];
    const Q = {
      '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11],
      sus2: [0, 2, 7], sus4: [0, 5, 7], add9: [0, 4, 7, 14], dim: [0, 3, 6],
    };
    return { root: (root + 12) % 12, intervals: Q[q] || Q[''] };
  }

  const tokens = (str) => str.split(/\s+/).filter((t) => t && t !== '|');

  /** Compile track data into flat per-step event lists. */
  function compile(track) {
    const spb = track.stepsPerBar;
    const chords = tokens(track.chords).map(parseChord);
    const total = chords.length * spb;
    const steps = [];
    for (let i = 0; i < total; i++) steps.push([]);

    // Lead melody (written at `res` tokens per bar, stretched onto the step grid)
    if (track.lead) {
      const lt = tokens(track.lead.notes);
      const f = Math.max(1, Math.round(spb / (track.lead.res || spb)));
      for (let i = 0; i < lt.length && i * f < total; i++) {
        const midi = noteToMidi(lt[i]);
        if (midi === null) continue;
        let len = 1;
        while (i + len < lt.length && lt[i + len] === '-') len++;
        steps[i * f].push({ ch: 'lead', midi, len: len * f });
      }
    }

    chords.forEach((chord, bar) => {
      const base = bar * spb;
      const tonesAt = (octave) => chord.intervals.map((iv) => 12 * (octave + 1) + chord.root + iv);

      if (track.bass) {
        const pt = tokens(track.bass.pattern);
        const deg = { R: 0, '3': chord.intervals[1], '5': 7, '7': chord.intervals[3] !== undefined ? chord.intervals[3] : 10, '8': 12 };
        for (let s = 0; s < spb; s++) {
          const tk = pt[s % pt.length];
          if (deg[tk] === undefined) continue;
          let len = 1;
          while (s + len < spb && pt[(s + len) % pt.length] === '-') len++;
          steps[base + s].push({ ch: 'bass', midi: 12 * (track.bass.octave + 1) + chord.root + deg[tk], len });
        }
      }

      if (track.arp) {
        const tones = tonesAt(track.arp.octave);
        const n = tones.length;
        for (let s = 0; s < spb; s++) {
          const idx = track.arp.pattern[s % track.arp.pattern.length];
          if (idx === null || idx === undefined) continue;
          const midi = tones[idx % n] + 12 * Math.floor(idx / n);
          steps[base + s].push({ ch: 'arp', midi, len: 1 });
        }
      }

      if (track.pad) {
        tonesAt(track.pad.octave).slice(0, 3).forEach((midi) => steps[base].push({ ch: 'pad', midi, len: spb }));
      }

      if (track.stab) {
        const pt = tokens(track.stab.pattern);
        for (let s = 0; s < spb; s++) {
          if (pt[s % pt.length] !== 'x') continue;
          tonesAt(track.stab.octave).slice(0, 4).forEach((midi) => steps[base + s].push({ ch: 'stab', midi, len: 1 }));
        }
      }

      if (track.drums) {
        const pt = tokens(track.drums.pattern);
        for (let s = 0; s < spb; s++) {
          const tk = pt[s % pt.length];
          if (!tk || tk === '.') continue;
          for (const kind of tk) steps[base + s].push({ ch: 'drum', kind });
        }
      }
    });

    return { steps, total };
  }

  // Instrument voices: how each channel turns a note into sound.
  const VOICES = {
    lead: (a, d, f, t, dur, tr) =>
      a.tone(d, { wave: 'pulse25', freq: f, t, dur: Math.min(dur * 0.85, 0.6), vol: tr.lead.vol, attack: 0.005, decay: 0.18, sustain: 0.6, release: 0.07, vibrato: f * 0.012, vibratoDelay: 0.2 }),
    bell: (a, d, f, t, dur, tr) => {
      a.tone(d, { wave: 'sine', freq: f, t, dur: 0.02, vol: tr.lead.vol, attack: 0.003, release: Math.min(1.4, dur * 1.4) });
      a.tone(d, { wave: 'sine', freq: f * 2.005, t, dur: 0.02, vol: tr.lead.vol * 0.35, attack: 0.003, release: 0.5 });
      a.tone(d, { wave: 'triangle', freq: f, t, dur: dur * 0.7, vol: tr.lead.vol * 0.25, attack: 0.03, release: 0.3 });
    },
    // Punchy "slap" bass: triangle body + a short pulse click on top.
    bass: (a, d, f, t, dur, tr) => {
      a.tone(d, { wave: 'triangle', freq: f, t, dur: dur * 0.75, vol: tr.bass.vol, attack: 0.003, decay: 0.12, sustain: 0.55, release: 0.04 });
      a.tone(d, { wave: 'pulse25', freq: f, freqEnd: f * 0.98, t, dur: 0.035, vol: tr.bass.vol * 0.22, attack: 0.002, release: 0.04 });
    },
    arp: (a, d, f, t, dur, tr) =>
      a.tone(d, { wave: tr.arp.wave || 'pulse125', freq: f, t, dur: dur * 0.5, vol: tr.arp.vol, attack: 0.003, decay: 0.06, sustain: 0.4, release: 0.05 }),
    pad: (a, d, f, t, dur, tr) =>
      a.tone(d, { wave: 'triangle', freq: f, t, dur: dur * 0.95, vol: tr.pad.vol, attack: Math.min(0.5, dur * 0.3), release: 0.5 }),
    stab: (a, d, f, t, dur, tr) =>
      a.tone(d, { wave: 'pulse125', freq: f, t, dur: 0.05, vol: tr.stab.vol, attack: 0.002, release: 0.05 }),
  };

  function drum(a, d, kind, t, vol) {
    switch (kind) {
      case 'k':
        a.tone(d, { wave: 'sine', freq: 160, freqEnd: 40, slideTime: 0.11, t, dur: 0.11, vol: 0.55 * vol, attack: 0.002, release: 0.09 });
        a.noiseBurst(d, { t, dur: 0.01, vol: 0.05 * vol, type: 'lowpass', freq: 2500, release: 0.01 });
        break;
      case 's':
        a.noiseBurst(d, { t, dur: 0.12, vol: 0.16 * vol, type: 'highpass', freq: 1400, release: 0.12 });
        a.tone(d, { wave: 'triangle', freq: 210, freqEnd: 140, t, dur: 0.05, vol: 0.12 * vol, release: 0.05 });
        break;
      case 'c': // handclap: three quick smacks then a tail
        for (let i = 0; i < 3; i++) a.noiseBurst(d, { t: t + i * 0.011, dur: 0.01, vol: 0.13 * vol, type: 'bandpass', freq: 1300, Q: 1.2, release: 0.012 });
        a.noiseBurst(d, { t: t + 0.033, dur: 0.1, vol: 0.12 * vol, type: 'bandpass', freq: 1200, Q: 1, release: 0.1 });
        break;
      case 'h':
        a.noiseBurst(d, { t, dur: 0.025, vol: 0.055 * vol, type: 'highpass', freq: 8000, release: 0.03 });
        break;
      case 'o':
        a.noiseBurst(d, { t, dur: 0.15, vol: 0.045 * vol, type: 'highpass', freq: 7000, release: 0.16 });
        break;
      case 'x':
        a.noiseBurst(d, { t, dur: 0.05, vol: 0.045 * vol, type: 'bandpass', freq: 6500, Q: 1.5, attack: 0.015, release: 0.05 });
        break;
    }
  }

  class Sequencer {
    constructor(audio, track, dest) {
      this.a = audio;
      this.track = track;
      this.song = compile(track);
      this.stepDur = 60 / track.bpm / (track.stepsPerBar / 4);
      this.beatDur = 60 / track.bpm;
      this.beats = [];
      this.lastBeat = null;
      this.beatCount = 0;
      const ctx = audio.ctx;
      this.out = ctx.createGain();
      this.out.gain.setValueAtTime(0.0001, ctx.currentTime);
      const fade = track.fadeIn !== undefined ? Math.max(0.01, track.fadeIn) : 2;
      this.out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + fade);
      this.out.connect(dest);
      this.step = 0;
      this.loop = 0;
      this.nextTime = ctx.currentTime + (fade < 0.1 ? 0.02 : 0.15);
      this.timer = setInterval(() => this._schedule(), 25);
      this._schedule();
    }

    _schedule() {
      const ctx = this.a.ctx;
      if (!ctx || ctx.state !== 'running') return;
      // If the tab was asleep, don't try to "catch up" on missed notes.
      if (this.nextTime < ctx.currentTime - 0.2) {
        this.nextTime = ctx.currentTime + 0.05;
        this.beats.length = 0;
      }
      while (this.nextTime < ctx.currentTime + 0.18) {
        this._play(this.step, this.nextTime);
        this.nextTime += this.stepDur;
        this.step++;
        if (this.step >= this.song.total) {
          if (this.track.once) { this.finished = true; clearInterval(this.timer); return; }
          this.step = 0;
          this.loop++;
        }
      }
    }

    _play(step, t) {
      const tr = this.track;
      const spb = tr.stepsPerBar;
      // swing: push every off-beat 16th a little late
      if (tr.swing && step % 2 === 1) t += tr.swing * this.stepDur;
      // Every few loops the melody takes a breather so the theme doesn't nag.
      const leadResting = tr.restEvery && this.loop % tr.restEvery === tr.restEvery - 1;
      const evs = this.song.steps[step];
      for (const ev of evs) {
        if (ev.ch === 'drum') {
          drum(this.a, this.out, ev.kind, t, tr.drums.vol);
          continue;
        }
        if (ev.ch === 'lead' && leadResting) continue;
        const inst = tr[ev.ch] && tr[ev.ch].inst;
        const voice = VOICES[inst || ev.ch] || VOICES[ev.ch];
        voice(this.a, this.out, midiToFreq(ev.midi), t, ev.len * this.stepDur, tr);
      }
      // Remember when each beat will actually be heard (for beat-synced visuals).
      const hit = evs.some((e) => e.ch === 'drum' && (e.kind === 'k' || e.kind === 'c' || e.kind === 's'));
      if (step % (spb / 4) === 0 || hit) {
        this.beats.push({ t, strength: hit ? 1 : 0.5, downbeat: step % spb === 0 });
      }
    }

    /** Beat info at audio time `now`: { pulse 0..1, count, downbeat }. */
    beatAt(now) {
      while (this.beats.length && this.beats[0].t <= now) {
        this.lastBeat = this.beats.shift();
        this.beatCount++;
      }
      const b = this.lastBeat;
      if (!b) return { pulse: 0, count: 0, downbeat: false };
      return { pulse: b.strength * Math.exp(-(now - b.t) * 9), count: this.beatCount, downbeat: b.downbeat && now - b.t < 0.15 };
    }

    stop(fade = 1) {
      clearInterval(this.timer);
      const ctx = this.a.ctx;
      try {
        this.out.gain.cancelScheduledValues(ctx.currentTime);
        this.out.gain.setTargetAtTime(0.0001, ctx.currentTime, fade / 4);
      } catch (e) { /* ignore */ }
      setTimeout(() => this.out.disconnect(), fade * 1000 + 3000);
    }
  }

  ERX.Sequencer = Sequencer;
  ERX.MusicVoices = VOICES; // other files can add instruments

  ERX.MusicTracks = {
    // ABOVE THE CLOUDS — breezy sky-funk, D major.
    sky: {
      title: 'Skyward Groove',
      bpm: 112, stepsPerBar: 16, swing: 0.14, restEvery: 3,
      chords: 'Dmaj7 Bm7 Em7 A7 Gmaj7 F#m7 Em7 A7',
      lead: {
        inst: 'lead', vol: 0.045, res: 8,
        notes:
          'F#5 . A5 F#5 . E5 D5 . | F#5 - E5 . D5 B4 . . | G5 . F#5 G5 . A5 B5 . | A5 - - . E5 F#5 G5 . |' +
          'B5 . A5 G5 . F#5 . D5 | C#5 . D5 E5 . F#5 A5 . | G5 . E5 . B4 . E5 G5 | A5 - - - C#6 . A5 .',
      },
      bass: { octave: 2, vol: 0.2, pattern: 'R . . 8 . R . 8 . . R . 5 . 7 .' },
      stab: { octave: 4, vol: 0.014, pattern: '. . x . . . x . . . x . . x . .' },
      arp: { octave: 5, vol: 0.014, pattern: [0, null, 2, null, 1, null, 3, null, 2, null, 0, null, 3, null, 1, null] },
      drums: { vol: 0.8, pattern: 'k . h . c . h k . k h . c . o .' },
    },

    // LIVELY VILLAGE — bouncy market-day funk, G major.
    village: {
      title: 'Market Day Bounce',
      bpm: 124, stepsPerBar: 16, swing: 0.18, restEvery: 4,
      chords: 'G Em C D G Em Am7 D7',
      lead: {
        inst: 'lead', vol: 0.045, res: 8,
        notes:
          'B4 D5 . G5 . D5 B4 . | E5 . G5 . B5 . G5 E5 | C5 . E5 G5 . E5 C5 . | D5 . F#5 . A5 . F#5 D5 |' +
          'B4 D5 . G5 . A5 B5 . | G5 . E5 . B4 . E5 G5 | A5 . C6 . A5 . E5 . | F#5 G5 A5 . D6 . . .',
      },
      bass: { octave: 2, vol: 0.21, pattern: 'R . . R 8 . R . . R . 5 8 . 7 .' },
      stab: { octave: 4, vol: 0.016, pattern: '. . x . . . x . . . x . . . x .' },
      drums: { vol: 0.78, pattern: 'k . h kh c . h . k . h k c . o h' },
    },

    // THE GREAT TREE — laid-back lo-fi funk, still calm, now with a head-nod.
    tree: {
      title: 'Under the Old Branches (Remix)',
      bpm: 94, stepsPerBar: 16, swing: 0.24, restEvery: 3,
      chords: 'Fmaj7 Em7 Dm7 Cmaj7 Bbmaj7 Am7 Gm7 C7',
      lead: {
        inst: 'bell', vol: 0.055, res: 8,
        notes:
          'A5 - . C6 . E6 - . | G5 - . B5 . D6 - . | F5 - . A5 . C6 . A5 | E5 - - - G5 - . . |' +
          'D5 - . F5 . A5 - . | C5 - . E5 . G5 . E5 | F5 - . Bb5 . D6 - . | E5 - G5 - Bb5 - . .',
      },
      bass: { octave: 2, vol: 0.19, pattern: 'R . . . . . 5 . 8 . . R . . 7 .' },
      arp: { octave: 4, vol: 0.03, wave: 'triangle', pattern: [0, null, null, 2, null, null, 1, null, 3, null, null, 2, null, 1, null, null] },
      pad: { octave: 4, vol: 0.012 },
      drums: { vol: 0.62, pattern: 'k . h . c . h k . h k . c . h x' },
    },

    // MOUNTAINS ABOVE THE CLOUDS — driving summit disco, D minor.
    peaks: {
      title: 'Summit Disco',
      bpm: 122, stepsPerBar: 16, swing: 0.06, restEvery: 3,
      chords: 'Dm7 Bbmaj7 C Am7 Dm7 Bbmaj7 Gm7 A7',
      lead: {
        inst: 'lead', vol: 0.045, res: 8,
        notes:
          'D5 . . F5 . A5 . C6 | Bb5 . A5 . F5 . D5 . | E5 . G5 . C6 . G5 E5 | A5 - - . C5 . E5 . |' +
          'D5 . F5 A5 . D6 . C6 | Bb5 . A5 F5 . D5 F5 . | G5 . Bb5 . D6 . Bb5 . | C#6 - - - A5 . E5 .',
      },
      bass: { octave: 2, vol: 0.2, pattern: 'R . 8 . R . 8 . R . 8 . R 8 R 8' },
      stab: { octave: 4, vol: 0.014, pattern: '. . . . x . . . . . . x . . x .' },
      arp: { octave: 5, vol: 0.012, pattern: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 2, 3] },
      drums: { vol: 0.8, pattern: 'k . o . kc . o . k . o . kc . o h' },
    },
  };
})(window.ERX = window.ERX || {});
