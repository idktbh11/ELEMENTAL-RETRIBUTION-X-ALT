/*
 * Rebuild js/data/neonjam.js (the Neon Jam beat map) from the songs themselves:
 *   node tools/neonjam-beats.js [song1.mp3 song2.mp3 ...]      (default: the two in ERX.AssetPaths.music.neonjam)
 *
 * For each song, in headless Chrome: decode it, build a spectral-flux onset curve (5 ms steps), find the tempo by
 * folding the onsets onto every period from 70 to 200 BPM, then track every beat with dynamic programming
 * (Ellis 2007: beats land on strong onsets, spacing stays close to the tempo, so drifting tempos are followed).
 * Per beat it measures the bass (a low-pass filter), the loudness and how busy it is -> "hype"; drops are where the
 * hype jumps from a quieter stretch into a loud one (snapped to a bar line). Moves: a spin on every drop (a flip if it
 * comes right after another), and a flip every 8 bars while it keeps going.
 * The songs are served over a little local web server, because browsers won't fetch file:// audio.
 */
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const { launch, sleep } = require('./cdp.js');
const FILES = process.argv.slice(2).length ? process.argv.slice(2) : ['assets/audio/neonjam-1-boss-battle.mp3', 'assets/audio/neonjam-2-boss-protocol-engaged.mp3'];
const OUT = path.join(ROOT, 'js/data/neonjam.js');

setTimeout(() => { console.log('timed out'); process.exit(3); }, 600000);
const server = http.createServer((req, res) => {
  if (req.url === '/blank') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><title>beats</title>'); return; }
  fs.readFile(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])), (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': 'audio/mpeg' }); res.end(data); });
});

// the analysis itself (runs in the page)
const ANALYSE = (url) => `(async () => {
  const ab = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(await (await fetch(${JSON.stringify(url)})).arrayBuffer());
  const sr = ab.sampleRate, n = ab.length, ch = ab.numberOfChannels, x = new Float32Array(n);
  for (let c = 0; c < ch; c++) { const d = ab.getChannelData(c); for (let i = 0; i < n; i++) x[i] += d[i] / ch; }
  // ---- onsets: positive change in the log spectrum, every 5 ms
  const HOP = 0.005, N = 1024, hop = Math.round(sr * HOP), frames = Math.floor((n - N) / hop);
  const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  const re = new Float32Array(N), im = new Float32Array(N), prev = new Float32Array(N / 2);
  const rev = new Uint32Array(N); for (let i = 0, bits = Math.log2(N); i < N; i++) { let r = 0; for (let k = 0; k < bits; k++) r |= ((i >> k) & 1) << (bits - 1 - k); rev[i] = r; }
  const tw = []; for (let size = 2; size <= N; size <<= 1) { const half = size >> 1, c = new Float32Array(half), s = new Float32Array(half); for (let k = 0; k < half; k++) { c[k] = Math.cos((-2 * Math.PI * k) / size); s[k] = Math.sin((-2 * Math.PI * k) / size); } tw.push([c, s]); }
  const fft = () => { for (let i = 0; i < N; i++) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } } let lvl = 0; for (let size = 2; size <= N; size <<= 1, lvl++) { const half = size >> 1, [cs, sn] = tw[lvl]; for (let i = 0; i < N; i += size) for (let k = 0; k < half; k++) { const j = i + k, l = j + half, tr = re[l] * cs[k] - im[l] * sn[k], ti = re[l] * sn[k] + im[l] * cs[k]; re[l] = re[j] - tr; im[l] = im[j] - ti; re[j] += tr; im[j] += ti; } } };
  const flux = new Float32Array(frames);
  for (let fr = 0; fr < frames; fr++) { const o = fr * hop; for (let i = 0; i < N; i++) { re[i] = x[o + i] * win[i]; im[i] = 0; } fft(); let fl = 0; for (let k = 2; k < N / 2; k++) { const lg = Math.log1p(Math.hypot(re[k], im[k]) * 20), d = lg - prev[k]; if (d > 0) fl += d; prev[k] = lg; } flux[fr] = fl; }
  const pre = new Float64Array(frames + 1); for (let i = 0; i < frames; i++) pre[i + 1] = pre[i] + flux[i];
  const on = new Float32Array(frames); for (let i = 0; i < frames; i++) { const a = Math.max(0, i - 40), z = Math.min(frames, i + 40); on[i] = Math.max(0, flux[i] - (pre[z] - pre[a]) / (z - a)); }
  let sd = 0; for (const v of on) sd += v * v; sd = Math.sqrt(sd / frames) || 1; for (let i = 0; i < frames; i++) on[i] /= sd;
  // ---- tempo: fold the onsets onto every period, keep the sharpest peak
  const sharp = (bpm, bins) => { const P = 60 / bpm / HOP, h = new Float64Array(bins); for (let i = 0; i < frames; i++) { const v = on[i]; if (v > 0) h[Math.floor(((i % P) / P) * bins) % bins] += v; } let m = 0, tot = 0; for (let i = 0; i < bins; i++) { tot += h[i]; m = Math.max(m, h[i]); } return m / (tot / bins || 1); };
  const coarse = []; for (let bpm = 70; bpm <= 200; bpm += 0.05) coarse.push([bpm, sharp(bpm, 64)]);
  coarse.sort((a, z) => z[1] - a[1]);
  const picks = []; for (const c of coarse) { if (picks.every((p) => Math.abs(p - c[0]) > 1.5)) picks.push(c[0]); if (picks.length >= 4) break; }
  let tempo = picks[0], bestS = 0; for (const p0 of picks) for (let bpm = p0 - 0.1; bpm <= p0 + 0.1; bpm += 0.004) { const s = sharp(bpm, 96); if (s > bestS) { bestS = s; tempo = bpm; } }
  while (tempo < 100) tempo *= 2; while (tempo > 190) tempo /= 2;
  // ---- every beat
  const tau = 60 / tempo / HOP, tight = 100, score = new Float32Array(frames), back = new Int32Array(frames).fill(-1);
  for (let t = 0; t < frames; t++) {
    let best = 0, bi = -1;
    for (let p = Math.max(0, Math.round(t - 2 * tau)), z = Math.round(t - tau / 2); p <= z; p++) { const pen = Math.log((t - p) / tau), v = score[p] - tight * pen * pen; if (v > best || bi < 0) { best = v; bi = p; } }
    score[t] = on[t] + (bi >= 0 ? Math.max(0, best) : 0); back[t] = bi >= 0 && best > 0 ? bi : -1;
  }
  let end = frames - 1, bs = -1e9; for (let t = Math.max(0, frames - Math.round(tau)); t < frames; t++) if (score[t] > bs) { bs = score[t]; end = t; }
  const bt = []; for (let t = end; t >= 0; t = back[t]) { bt.push(t); if (back[t] < 0) break; }
  bt.reverse();
  const times = bt.map((t) => t * HOP), B = times.length;
  // ---- per beat: bass (time-domain low-pass), loudness, how busy
  const lp = new Float32Array(n); { const w0 = 2 * Math.PI * 120 / sr, al = Math.sin(w0) / (2 * 0.707), cw = Math.cos(w0), b0 = (1 - cw) / 2, b1 = 1 - cw, a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al; for (let pass = 0; pass < 2; pass++) { let x1 = 0, x2 = 0, y1 = 0, y2 = 0; const src = pass ? lp.slice() : x; for (let i = 0; i < n; i++) { const xi = src[i], y = (b0 * xi + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = xi; y2 = y1; y1 = y; lp[i] = y; } } }
  const BS = [], E = [], D = [];
  for (let i = 0; i < B; i++) {
    const s0 = Math.round(times[i] * sr), s1 = i + 1 < B ? Math.round(times[i + 1] * sr) : Math.min(n, s0 + Math.round(tau * HOP * sr));
    let bb = 0, ee = 0; for (let j = s0; j < s1; j += 4) { bb += lp[j] * lp[j]; ee += x[j] * x[j]; } const cnt = Math.max(1, Math.floor((s1 - s0) / 4));
    BS.push(Math.sqrt(bb / cnt)); E.push(Math.sqrt(ee / cnt));
    const c0 = Math.round(times[i] / HOP), c1 = Math.round(s1 / sr / HOP); let dd = 0; for (let j = c0; j < c1; j++) dd += Math.min(3, on[j] || 0); D.push(dd / Math.max(1, c1 - c0));
  }
  const pct = (arr, q) => { const s = arr.slice().sort((p, r) => p - r); return s[Math.floor(q * (s.length - 1))] || 1; };
  const nrm = (arr) => { const lo = pct(arr, 0.05), hi = pct(arr, 0.95); return arr.map((v) => Math.max(0, Math.min(1, (v - lo) / ((hi - lo) || 1)))); };
  const bn = nrm(BS), en = nrm(E), dn = nrm(D), raw = bn.map((v, i) => 0.5 * v + 0.3 * en[i] + 0.2 * dn[i]);
  const hype = raw.map((_, k) => { let s = 0, c = 0; for (let j = Math.max(0, k - 2); j <= Math.min(B - 1, k + 1); j++) { s += raw[j]; c++; } return s / c; });
  // ---- drops: a quieter 8 beats, then a loud 8 (snapped to a bar line)
  const drops = [];
  for (let k = 8; k < B - 8; k++) {
    let p = 0, q = 0; for (let j = k - 8; j < k; j++) p += hype[j]; for (let j = k; j < k + 8; j++) q += hype[j]; p /= 8; q /= 8;
    const jump = q - p;
    if (jump > 0.16 && q > 0.5) { if (drops.length && k - drops[drops.length - 1].k < 16) { if (jump > drops[drops.length - 1].jump) drops[drops.length - 1] = { k, jump }; } else drops.push({ k, jump }); }
  }
  const votes = [0, 0, 0, 0]; for (const d of drops) votes[d.k % 4] += d.jump;
  const bar0 = votes.indexOf(Math.max(...votes));
  for (const d of drops) { const off = ((d.k - bar0) % 4 + 4) % 4; d.k += off <= 2 ? -off : 4 - off; }
  const dig = (arr) => arr.map((v) => Math.max(0, Math.min(9, Math.round(v * 9)))).join('');
  return JSON.stringify({ duration: +(n / sr).toFixed(3), tempo: +tempo.toFixed(3), bar0, drops: drops.map((d) => d.k).filter((k, i, a) => a.indexOf(k) === i), times: times.map((t) => Math.round(t * 1000)), hype: dig(hype), bass: dig(bn) });
})()`;

server.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const b = await launch({ width: 800, height: 400 });
  await b.goto(base + 'blank'); await sleep(300);
  const tracks = [];
  for (const file of FILES) {
    const r = JSON.parse(await b.eval(ANALYSE(base + file)));
    const B = r.times.length, hype = r.hype.split('').map(Number), drops = r.drops.slice().sort((p, q) => p - q), moves = [];
    drops.forEach((d, i) => {
      moves.push([d, i && d - drops[i - 1] < 32 ? 'flip' : 'spin']);
      const next = i + 1 < drops.length ? drops[i + 1] : B;
      for (let k = d + 32; k < next - 12; k += 32) { let h = 0; for (let j = k; j < Math.min(B, k + 4); j++) h += hype[j]; if (h / 4 >= 4) moves.push([k, 'flip']); }
    });
    tracks.push({ file, duration: r.duration, bar0: r.bar0, beats: r.times.map((t, i) => (i ? t - r.times[i - 1] : t)), hype: r.hype, bass: r.bass, drops, moves });
    console.log(file, '| tempo ~' + r.tempo, '| beats', B, '| drops', drops.join(','), '| moves', moves.map((m) => m[0] + (m[1] === 'spin' ? 'S' : 'F')).join(' '));
  }
  await b.close(); server.close();
  fs.writeFileSync(OUT, `/*
 * NEON JAM (type "neonjam" on the main menu): the beat map of its songs, worked out from the audio itself by
 * tools/neonjam-beats.js (a spectral-flux onset curve + a dynamic-programming beat tracker, so a drifting tempo is
 * followed beat by beat). Per track:
 *   beats   milliseconds from the previous beat (the first: from the start of the song)
 *   hype    how hard it's going at each beat, 0-9 (bass level + loudness + how busy it is)
 *   bass    how heavy the low end is at each beat, 0-9
 *   drops   the beats where it drops (they land on a bar line)
 *   moves   [beat, 'spin' | 'flip']: when the whole screen spins round or flips upside down and back
 *   bar0    which beat of the first four is a bar line
 */
(function (ERX) {
  'use strict';
  ERX.NeonJamData = {
    tracks: ${JSON.stringify(tracks)},
  };
})(window.ERX = window.ERX || {});
`);
  console.log('wrote', path.relative(ROOT, OUT));
  process.exit(0);
});
