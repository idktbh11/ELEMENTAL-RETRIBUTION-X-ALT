/*
 * Procedural ambient soundscapes, one per menu world.
 * Each is a class: constructor(audio, dest), update(dt), stop().
 */
(function (ERX) {
  'use strict';

  const rand = (a, b) => a + Math.random() * (b - a);

  class AmbienceBase {
    constructor(a, dest) {
      this.a = a;
      const ctx = a.ctx;
      this.out = ctx.createGain();
      this.out.gain.setValueAtTime(0.0001, ctx.currentTime);
      this.out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 3);
      this.out.connect(dest);
      this.sources = [];
      this.timers = {};
      this.t = 0;
    }

    /** A looping filtered-noise bed. Returns { filter, gain }. */
    noiseBed(type, freq, Q, vol) {
      const ctx = this.a.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.a.noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = Q;
      const g = ctx.createGain();
      g.gain.value = vol;
      src.connect(f);
      f.connect(g);
      g.connect(this.out);
      src.start(ctx.currentTime, Math.random() * 1.5);
      this.sources.push(src);
      return { filter: f, gain: g, base: vol };
    }

    /** Run fn at random intervals between min and max seconds. */
    every(name, min, max, dt, fn) {
      if (this.timers[name] === undefined) this.timers[name] = rand(min * 0.3, max);
      this.timers[name] -= dt;
      if (this.timers[name] <= 0) {
        this.timers[name] = rand(min, max);
        fn();
      }
    }

    now() {
      return this.a.ctx.currentTime;
    }

    chirp(vol = 0.03) {
      const t = this.now();
      const pan = rand(-0.8, 0.8);
      const base = rand(2400, 3800);
      const n = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const st = t + i * rand(0.07, 0.13);
        this.a.tone(this.out, { wave: 'sine', freq: base * rand(0.9, 1.15), freqEnd: base * rand(1.2, 1.6), slideTime: 0.05, t: st, dur: 0.05, vol, attack: 0.005, release: 0.04, pan });
      }
    }

    update(dt) {
      this.t += dt;
    }

    stop() {
      const ctx = this.a.ctx;
      this.out.gain.cancelScheduledValues(ctx.currentTime);
      this.out.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
      setTimeout(() => {
        for (const s of this.sources) { try { s.stop(); } catch (e) { /* ignore */ } }
        this.out.disconnect();
      }, 2000);
    }
  }

  class SkyAmbience extends AmbienceBase {
    constructor(a, dest) {
      super(a, dest);
      this.wind = this.noiseBed('lowpass', 520, 0.7, 0.11);
      this.falls = this.noiseBed('lowpass', 380, 0.5, 0.045);
    }
    update(dt) {
      super.update(dt);
      const t = this.now();
      this.every('mod', 0.25, 0.25, dt, () => {
        const w = 0.07 + 0.06 * (0.5 + 0.5 * Math.sin(this.t * 0.31) * Math.sin(this.t * 0.07));
        this.wind.gain.gain.setTargetAtTime(w, t, 0.5);
        this.wind.filter.frequency.setTargetAtTime(420 + 260 * (0.5 + 0.5 * Math.sin(this.t * 0.13)), t, 0.6);
      });
      this.every('bird', 3, 9, dt, () => this.chirp(0.022));
    }
  }

  class VillageAmbience extends AmbienceBase {
    constructor(a, dest) {
      super(a, dest);
      this.murmur = this.noiseBed('bandpass', 520, 0.9, 0.03);
      this.murmur2 = this.noiseBed('bandpass', 900, 1.4, 0.015);
      this.breeze = this.noiseBed('lowpass', 400, 0.6, 0.04);
    }
    update(dt) {
      super.update(dt);
      const t = this.now();
      // Crowd "walla": jittery amplitude + formant movement.
      this.every('walla', 0.08, 0.22, dt, () => {
        this.murmur.gain.gain.setTargetAtTime(rand(0.012, 0.045), t, 0.05);
        this.murmur.filter.frequency.setTargetAtTime(rand(380, 720), t, 0.06);
        this.murmur2.gain.gain.setTargetAtTime(rand(0.004, 0.02), t, 0.05);
      });
      this.every('crickets', 0.7, 1.3, dt, () => {
        const pan = rand(-0.9, 0.9);
        for (let i = 0; i < 3; i++)
          this.a.tone(this.out, { wave: 'sine', freq: 4700, t: t + i * 0.045, dur: 0.018, vol: 0.008, attack: 0.003, release: 0.01, pan });
      });
      this.every('chicken', 9, 22, dt, () => {
        const pan = rand(-0.6, 0.6);
        for (let i = 0; i < 3; i++)
          this.a.tone(this.out, { wave: 'pulse25', freq: rand(620, 760), freqEnd: rand(480, 560), t: t + i * 0.11, dur: 0.05, vol: 0.012, release: 0.03, pan });
        this.a.tone(this.out, { wave: 'pulse25', freq: 820, freqEnd: 520, t: t + 0.36, dur: 0.16, vol: 0.012, release: 0.05, pan });
      });
      this.every('dog', 20, 45, dt, () => {
        const pan = rand(-0.7, 0.7);
        for (let i = 0; i < 2; i++) {
          this.a.noiseBurst(this.out, { t: t + i * 0.22, dur: 0.08, vol: 0.025, type: 'bandpass', freq: 750, Q: 2, release: 0.07, pan });
          this.a.tone(this.out, { wave: 'square', freq: 240, freqEnd: 170, t: t + i * 0.22, dur: 0.07, vol: 0.012, release: 0.04, pan });
        }
      });
    }
  }

  class TreeAmbience extends AmbienceBase {
    constructor(a, dest) {
      super(a, dest);
      this.wind = this.noiseBed('lowpass', 420, 0.6, 0.08);
      this.leaves = this.noiseBed('highpass', 3200, 0.5, 0.0);
    }
    update(dt) {
      super.update(dt);
      const t = this.now();
      this.every('mod', 0.25, 0.25, dt, () => {
        const gust = Math.max(0, Math.sin(this.t * 0.21) * Math.sin(this.t * 0.053 + 1));
        this.wind.gain.gain.setTargetAtTime(0.05 + gust * 0.08, t, 0.6);
        this.leaves.gain.gain.setTargetAtTime(0.004 + gust * 0.02, t, 0.4);
      });
      this.every('bird', 2.5, 7, dt, () => this.chirp(0.018));
      this.every('chime', 14, 30, dt, () => {
        const scale = [1046, 1174, 1318, 1568, 1760, 2093];
        for (let i = 0; i < 3; i++)
          this.a.tone(this.out, { wave: 'sine', freq: scale[Math.floor(Math.random() * scale.length)], t: t + i * rand(0.15, 0.4), dur: 0.01, vol: 0.012, attack: 0.002, release: 1.4, pan: rand(-0.4, 0.4) });
      });
    }
  }

  class PeaksAmbience extends AmbienceBase {
    constructor(a, dest) {
      super(a, dest);
      this.howl = this.noiseBed('bandpass', 500, 5, 0.12);
      this.rumble = this.noiseBed('lowpass', 180, 0.7, 0.09);
      this.hiss = this.noiseBed('highpass', 2500, 0.5, 0.012);
      this.gust = 0;
    }
    update(dt) {
      super.update(dt);
      const t = this.now();
      this.every('howlShift', 1, 2.2, dt, () => {
        this.howl.filter.frequency.setTargetAtTime(rand(330, 820), t, 0.8);
      });
      this.every('gust', 6, 13, dt, () => { this.gust = 1; });
      this.gust = Math.max(0, this.gust - dt * 0.35);
      this.every('mod', 0.2, 0.2, dt, () => {
        const g = Math.sin(Math.min(1, this.gust) * Math.PI);
        this.howl.gain.gain.setTargetAtTime(0.08 + g * 0.1, t, 0.3);
        this.hiss.gain.gain.setTargetAtTime(0.01 + g * 0.02, t, 0.3);
      });
      this.every('eagle', 15, 35, dt, () => {
        const pan = rand(-0.7, 0.7);
        this.a.tone(this.out, { wave: 'sine', freq: 2300, freqEnd: 1450, slideTime: 0.7, t, dur: 0.7, vol: 0.018, attack: 0.05, release: 0.2, vibrato: 40, vibratoRate: 18, vibratoDelay: 0.05, pan });
      });
    }
  }

  ERX.AmbienceBase = AmbienceBase;   // other files build soundscapes on it (js/audio/world-audio.js)
  ERX.AmbienceBank = {
    sky: SkyAmbience,
    village: VillageAmbience,
    tree: TreeAmbience,
    peaks: PeaksAmbience,
  };
})(window.ERX = window.ERX || {});
