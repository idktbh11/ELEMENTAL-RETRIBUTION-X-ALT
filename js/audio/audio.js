/*
 * Audio manager — Web Audio graph, volume buses and playback entry points.
 *
 *   master ─┬─ music  (with a subtle echo send)
 *           └─ sfx ─── ambience
 *
 * All sound in this build is synthesised in code (no external or
 * copyrighted files). To use real audio files later, set the paths in
 * ERX.AssetPaths.music / .ambience — those take priority automatically. A music entry can be a LIST of files:
 * they play one after another and loop round in that order (Neon Jam).
 *
 * Browsers only allow audio after a user gesture, so the context is created
 * on the first key press / click ("PRESS ANY KEY" on the title screen).
 */
(function (ERX) {
  'use strict';

  const volumeCurve = (v) => Math.pow(Math.max(0, Math.min(100, v)) / 100, 1.8);

  function makePulseWave(ctx, duty) {
    const n = 48;
    const real = new Float32Array(n), imag = new Float32Array(n);
    for (let i = 1; i < n; i++) real[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    return ctx.createPeriodicWave(real, imag);
  }

  const Audio = {
    ctx: null,
    buses: null,
    noise: null,
    waves: {},
    unlocked: false,
    disabled: false,
    lastSfx: {},
    music: { wanted: null, currentId: null, player: null, element: null, playlist: null },
    ambience: { wanted: null, currentId: null, player: null, element: null },

    init() {
      ERX.Events.on('input:gesture', () => this.unlock());
      ERX.Events.on('settings:change', (e) => {
        if (e.path.indexOf('audio.') === 0) this.applyVolumes();
      });
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) this.ctx.suspend();
        else if (this.unlocked) this.ctx.resume();
        for (const slot of [this.music, this.ambience]) {
          if (!slot.element) continue;
          if (document.hidden) slot.element.pause();
          else slot.element.play().catch(() => {});
        }
      });
    },

    _create() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        this.disabled = true;
        console.warn('[ERX] Web Audio is not supported; running silently.');
        return;
      }
      const ctx = (this.ctx = new AC());

      const master = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 10;
      comp.ratio.value = 3.5;
      comp.attack.value = 0.004;
      comp.release.value = 0.25;
      master.connect(comp);
      comp.connect(ctx.destination);

      const musicOut = ctx.createGain();
      musicOut.connect(master);
      const musicIn = ctx.createGain();
      musicIn.connect(musicOut);
      // Echo send gives the chiptune a bit of space.
      const delay = ctx.createDelay(1.0);
      delay.delayTime.value = 0.34;
      const fb = ctx.createGain();
      fb.gain.value = 0.3;
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 2200;
      const wet = ctx.createGain();
      wet.gain.value = 0.25;
      musicIn.connect(delay);
      delay.connect(tone);
      tone.connect(fb);
      fb.connect(delay);
      tone.connect(wet);
      wet.connect(musicOut);

      const sfx = ctx.createGain();
      sfx.connect(master);
      const ambience = ctx.createGain();
      ambience.connect(sfx);

      this.buses = { master, music: musicIn, musicOut, sfx, ambience };

      const len = Math.floor(ctx.sampleRate * 2);
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

      this.waves.pulse25 = makePulseWave(ctx, 0.25);
      this.waves.pulse125 = makePulseWave(ctx, 0.125);

      this.applyVolumes(true);
    },

    unlock() {
      if (this.disabled) return;
      if (!this.ctx) this._create();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume().catch(() => {});
      if (!this.unlocked) {
        this.unlocked = true;
        this._syncMusic();
        this._syncAmbience();
      }
    },

    volume(name) {
      return volumeCurve(ERX.Settings.get('audio.' + name));
    },

    applyVolumes(immediate) {
      const master = this.volume('master'), music = this.volume('music'), sfx = this.volume('sfx');
      if (this.buses) {
        const t = this.ctx.currentTime;
        const set = (param, v) => {
          if (immediate) param.setValueAtTime(v, t);
          else param.setTargetAtTime(v, t, 0.03);
        };
        set(this.buses.master.gain, master);
        set(this.buses.musicOut.gain, music);
        set(this.buses.sfx.gain, sfx);
      }
      if (this.music.element) this.music.element.volume = Math.min(1, master * music);
      if (this.ambience.element) this.ambience.element.volume = Math.min(1, master * sfx * 0.8);
    },

    get ready() {
      return !!(this.ctx && this.unlocked);
    },

    // ------------------------------------------------------------- SFX
    playSfx(name, opts = {}) {
      if (!this.ready) return;
      const fn = ERX.SfxBank && ERX.SfxBank[name];
      if (!fn) return;
      const now = this.ctx.currentTime;
      const gap = opts.minGap !== undefined ? opts.minGap : 0.025;
      if (this.lastSfx[name] !== undefined && now - this.lastSfx[name] < gap) return;
      this.lastSfx[name] = now;
      const dest = opts.bus === 'ambience' ? this.buses.ambience : this.buses.sfx;
      try {
        fn(this, dest, now + 0.004, opts);
      } catch (e) {
        console.warn('[ERX] sfx "' + name + '" failed', e);
      }
    },

    // ------------------------------------------------------------ MUSIC
    playMusic(id) {
      this.music.wanted = id;
      if (this.unlocked) this._syncMusic();
    },

    stopMusic() {
      this.playMusic(null);
    },

    /** Stop the music instantly (record-scratch moments). */
    cutMusic() {
      const slot = this.music;
      slot.wanted = null;
      if (slot.player) slot.player.stop(0.04);
      if (slot.element) { slot.element.pause(); slot.element = null; }
      slot.player = null; slot.playlist = null;
      slot.currentId = null;
    },

    _syncMusic() {
      const slot = this.music;
      if (slot.currentId === slot.wanted) return;
      if (slot.player) slot.player.stop(1.2);
      if (slot.element) { slot.element.pause(); slot.element = null; }
      slot.player = null; slot.playlist = null;
      slot.currentId = slot.wanted;
      if (!slot.wanted) return;

      const file = ERX.AssetPaths.music[slot.wanted];
      if (Array.isArray(file)) {
        slot.playlist = this._filePlaylist(file);
      } else if (file) {
        slot.element = this._fileLoop(file, this.volume('master') * this.volume('music'));
      } else if (ERX.MusicTracks && ERX.MusicTracks[slot.wanted]) {
        slot.player = new ERX.Sequencer(this, ERX.MusicTracks[slot.wanted], this.buses.music);
      }
    },

    // --------------------------------------------------------- AMBIENCE
    setAmbience(id) {
      this.ambience.wanted = id;
      if (this.unlocked) this._syncAmbience();
    },

    _syncAmbience() {
      const slot = this.ambience;
      if (slot.currentId === slot.wanted) return;
      if (slot.player) slot.player.stop();
      if (slot.element) { slot.element.pause(); slot.element = null; }
      slot.player = null;
      slot.currentId = slot.wanted;
      if (!slot.wanted) return;

      const file = ERX.AssetPaths.ambience[slot.wanted];
      if (file) {
        slot.element = this._fileLoop(file, this.volume('master') * this.volume('sfx') * 0.8);
      } else if (ERX.AmbienceBank && ERX.AmbienceBank[slot.wanted]) {
        slot.player = new ERX.AmbienceBank[slot.wanted](this, this.buses.ambience);
      }
    },

    _fileLoop(path, volume) {
      const el = new window.Audio(path);
      el.loop = true;
      el.volume = Math.min(1, volume);
      el.play().catch((e) => console.warn('[ERX] Could not play audio file ' + path, e));
      return el;
    },

    /** Music files played one after another, looping round in order. The music slot's element is always the one playing. */
    _filePlaylist(paths) {
      const slot = this.music, list = { paths, i: 0, els: paths.map((p) => { const el = new window.Audio(p); el.preload = 'auto'; return el; }) };
      const play = (i) => {
        list.i = i;
        const el = list.els[i];
        el.currentTime = 0;
        el.volume = Math.min(1, this.volume('master') * this.volume('music'));
        slot.element = el;
        el.play().catch((e) => console.warn('[ERX] Could not play audio file ' + paths[i], e));
      };
      list.els.forEach((el, i) => el.addEventListener('ended', () => { if (slot.playlist === list) play((i + 1) % list.els.length); }));
      list.play = play;
      play(0);
      return list;
    },

    /** What the music is doing right now: { id, track (which file of a playlist), time (s), playing }. */
    musicTime() {
      const slot = this.music, el = slot.element;
      return { id: slot.currentId, track: slot.playlist ? slot.playlist.i : 0, time: el ? el.currentTime : 0, playing: !!el && !el.paused };
    },

    update(dt) {
      if (this.ambience.player && this.ready) this.ambience.player.update(dt);
    },

    /**
     * Beat info for beat-synced visuals: { pulse 0..1, count, downbeat }.
     * Follows the live sequencer when music is playing; otherwise (audio still
     * locked, or a file-based track) it fakes a steady beat at the track tempo.
     */
    beat() {
      if (ERX.NeonJam && ERX.NeonJam.playing()) return ERX.NeonJam.beat();
      const p = this.music.player;
      if (p && this.ctx && this.ctx.state === 'running') return p.beatAt(this.ctx.currentTime);
      const id = this.music.wanted;
      const tr = id && ERX.MusicTracks && ERX.MusicTracks[id];
      const bpm = tr ? tr.bpm : 110;
      const beats = (performance.now() / 1000) * (bpm / 60);
      const ph = beats - Math.floor(beats);
      return { pulse: 0.45 * Math.exp(-ph * (60 / bpm) * 9), count: Math.floor(beats), downbeat: false, fake: true };
    },

    // ---------------------------------------------------- synth helpers
    /**
     * Schedule a single enveloped oscillator note.
     * o: { wave, freq, freqEnd, t, dur, vol, attack, decay, sustain, release,
     *      vibrato (Hz depth), vibratoRate, vibratoDelay, pan }
     */
    tone(dest, o) {
      const ctx = this.ctx;
      const t = o.t !== undefined ? o.t : ctx.currentTime;
      const dur = o.dur || 0.1;
      const attack = o.attack !== undefined ? o.attack : 0.005;
      const release = o.release !== undefined ? o.release : 0.05;
      const sustain = o.sustain !== undefined ? o.sustain : 1;
      const decay = o.decay !== undefined ? o.decay : 0.1;
      const vol = o.vol !== undefined ? o.vol : 0.1;

      const osc = ctx.createOscillator();
      if (this.waves[o.wave]) osc.setPeriodicWave(this.waves[o.wave]);
      else osc.type = o.wave || 'square';
      osc.frequency.setValueAtTime(o.freq, t);
      if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.freqEnd), t + (o.slideTime || dur));

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + attack);
      if (sustain < 1) g.gain.setTargetAtTime(vol * sustain, t + attack, decay / 3);
      g.gain.setTargetAtTime(0.0001, t + dur, release / 3);

      let node = g;
      if (o.pan && ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = o.pan;
        g.connect(p);
        node = p;
      }
      osc.connect(g);
      node.connect(dest);

      if (o.vibrato) {
        const lfo = ctx.createOscillator();
        const lg = ctx.createGain();
        lfo.frequency.value = o.vibratoRate || 5.5;
        lg.gain.setValueAtTime(0, t);
        lg.gain.linearRampToValueAtTime(o.vibrato, t + (o.vibratoDelay || 0.15));
        lfo.connect(lg);
        lg.connect(osc.frequency);
        lfo.start(t);
        lfo.stop(t + dur + release + 0.1);
      }
      osc.start(t);
      osc.stop(t + dur + release + 0.1);
      return osc;
    },

    /**
     * Schedule a filtered noise burst.
     * o: { t, dur, vol, type, freq, freqEnd, Q, attack, release, pan }
     */
    noiseBurst(dest, o) {
      const ctx = this.ctx;
      const t = o.t !== undefined ? o.t : ctx.currentTime;
      const dur = o.dur || 0.1;
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = o.type || 'bandpass';
      f.frequency.setValueAtTime(o.freq || 1000, t);
      if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t + dur);
      f.Q.value = o.Q !== undefined ? o.Q : 1;
      const g = ctx.createGain();
      const vol = o.vol !== undefined ? o.vol : 0.1;
      const attack = o.attack !== undefined ? o.attack : 0.003;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + attack);
      g.gain.setTargetAtTime(0.0001, t + attack, (o.release !== undefined ? o.release : dur) / 3);
      src.connect(f);
      f.connect(g);
      let node = g;
      if (o.pan && ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = o.pan;
        g.connect(p);
        node = p;
      }
      node.connect(dest);
      src.start(t, Math.random() * 1.5);
      src.stop(t + dur + (o.release || dur) + 0.1);
      return src;
    },
  };

  ERX.Audio = Audio;
})(window.ERX = window.ERX || {});
