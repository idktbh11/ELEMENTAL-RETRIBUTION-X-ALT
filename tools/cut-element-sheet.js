/*
 * Cuts the element-name sheet into one native-resolution pixel-art PNG per
 * element, removing the blurry glow halos behind the labels.
 *
 *   node tools/cut-element-sheet.js <sheet.png>            element names
 *   -> assets/images/elements/<id>.png  + assets/images/elements/_preview.png
 *   node tools/cut-element-sheet.js <sheet.png> --ults     ultimate titles
 *   -> assets/images/ults/<id>.png      (same 5x6 layout + element order)
 *
 * Steps:
 *   1. shrink the whole sheet to the art's pixel grid ("most common colour")
 *   2. flood-fill the halo/background in from the edges, 4-way, stopping at
 *      the labels' dark outlines (4-way fills cannot slip through diagonal
 *      outline steps)
 *   3. group what's left into connected shapes and give each shape to the
 *      nearest label centre (labels are not on a perfectly even grid)
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { decode, encode } = require('./png.js');

const ORDER = [
  'fire', 'water', 'wind', 'earth', 'lightning',
  'ice', 'nature', 'shadow', 'light', 'arcane',
  'poison', 'blood', 'death', 'metal', 'sand',
  'magma', 'storm', 'cosmic', 'void', 'psychic',
  'crystal', 'moon', 'solar', 'magnetism', 'time',
  'gravity', 'sound', 'mist', 'spirit', 'chaos',
];
let PIXEL = 4.5;                                     // source px per art px
const COL_CENTERS = [155, 460, 765, 1060, 1370];      // label centres on the sheet
const ROW_CENTERS = [125, 300, 480, 650, 815, 950];
const DARK = 78;                                     // outline luminance threshold

const ULTS = process.argv.includes('--ults');
if (ULTS) { PIXEL = 3; COL_CENTERS.splice(0, 5, 160, 460, 770, 1075, 1385); ROW_CENTERS.splice(0, 6, 130, 310, 490, 660, 815, 955); }
const src = decode(process.argv[2]);
const outDir = path.join(__dirname, '..', 'assets', 'images', ULTS ? 'ults' : 'elements');
fs.mkdirSync(outDir, { recursive: true });
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

// ---- 1. shrink to the pixel grid ----
const W = Math.round(src.w / PIXEL), H = Math.round(src.h / PIXEL);
const img = new Uint8ClampedArray(W * H * 4);
for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
  const bins = new Map();
  const x0 = Math.floor((tx + 0.2) * PIXEL), x1 = Math.ceil((tx + 0.8) * PIXEL);
  const y0 = Math.floor((ty + 0.2) * PIXEL), y1 = Math.ceil((ty + 0.8) * PIXEL);
  for (let y = y0; y < y1 && y < src.h; y++) for (let x = x0; x < x1 && x < src.w; x++) {
    const k = (y * src.w + x) * 4;
    const key = src.data[k + 3] < 128 ? 'T' : ((src.data[k] >> 4) << 8) | ((src.data[k + 1] >> 4) << 4) | (src.data[k + 2] >> 4);
    let e = bins.get(key);
    if (!e) { e = { n: 0, r: 0, g: 0, b: 0 }; bins.set(key, e); }
    e.n++; e.r += src.data[k]; e.g += src.data[k + 1]; e.b += src.data[k + 2];
  }
  let best = null, bk = 'T';
  for (const [k, e] of bins) if (!best || e.n > best.n) { best = e; bk = k; }
  const o = (ty * W + tx) * 4;
  if (bk !== 'T') { img[o] = best.r / best.n; img[o + 1] = best.g / best.n; img[o + 2] = best.b / best.n; img[o + 3] = 255; }
}

// ---- 2. flood-fill the background (4-way) ----
const solid = (i) => img[i * 4 + 3] === 255;
const dark = (i) => solid(i) && lum(img[i * 4], img[i * 4 + 1], img[i * 4 + 2]) < DARK;
// ult sheet: only the pale, colourless checkerboard counts as background
const bgLike = (i) => { if (!solid(i)) return true; const r = img[i * 4], g = img[i * 4 + 1], b = img[i * 4 + 2]; return lum(r, g, b) > 222 && Math.max(r, g, b) - Math.min(r, g, b) < 12; };
const bg = new Uint8Array(W * H);
const stack = [];
for (let x = 0; x < W; x++) stack.push(x, 0, x, H - 1);
for (let y = 0; y < H; y++) stack.push(0, y, W - 1, y);
while (stack.length) {
  const y = stack.pop(), x = stack.pop();
  if (x < 0 || y < 0 || x >= W || y >= H) continue;
  const i = y * W + x;
  if (bg[i] || (ULTS ? !bgLike(i) : dark(i))) continue;
  bg[i] = 1;
  stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
}
const fg = (i) => solid(i) && !bg[i];

// ---- 3. connected shapes -> nearest label ----
const label = new Int16Array(W * H).fill(-1);
const shapes = [];
for (let i = 0; i < W * H; i++) {
  if (!fg(i) || label[i] !== -1) continue;
  const id = shapes.length, pix = [];
  const q = [i];
  label[i] = id;
  while (q.length) {
    const j = q.pop();
    pix.push(j);
    const x = j % W, y = (j / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      if (fg(n) && label[n] === -1) { label[n] = id; q.push(n); }
    }
  }
  let sx = 0, sy = 0;
  for (const j of pix) { sx += j % W; sy += (j / W) | 0; }
  shapes.push({ pix, cx: (sx / pix.length) * PIXEL, cy: (sy / pix.length) * PIXEL });
}
const groups = ORDER.map(() => []);
const nearestLabel = (x, y) => {
  let best = 0, bd = Infinity;
  ORDER.forEach((_, k) => {
    const dx = (x - COL_CENTERS[k % 5]) / 300, dy = (y - ROW_CENTERS[Math.floor(k / 5)]) / 150;
    const d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = k; }
  });
  return { best, bd };
};
for (const s of shapes) {
  if (s.pix.length < 2) continue; // stray specks
  // two labels touching on the sheet -> split that shape pixel by pixel
  const votes = new Map();
  for (const j of s.pix) { const k = nearestLabel((j % W) * PIXEL, ((j / W) | 0) * PIXEL).best; votes.set(k, (votes.get(k) || 0) + 1); }
  const big = [...votes.values()].filter((n) => n > s.pix.length * 0.15).length;
  if (big > 1) {
    const parts = new Map();
    for (const j of s.pix) { const k = nearestLabel((j % W) * PIXEL, ((j / W) | 0) * PIXEL).best; if (!parts.has(k)) parts.set(k, []); parts.get(k).push(j); }
    for (const [k, pix] of parts) groups[k].push({ pix });
    continue;
  }
  const { best, bd } = nearestLabel(s.cx, s.cy);
  if (bd < 1) groups[best].push(s);
}

const previews = [];
ORDER.forEach((id, k) => {
  const pix = [].concat(...groups[k].map((s) => s.pix));
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (const j of pix) { const x = j % W, y = (j / W) | 0; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const tw = maxX - minX + 1, th = maxY - minY + 1;
  const out = Buffer.alloc(tw * th * 4);
  for (const j of pix) {
    const x = j % W - minX, y = ((j / W) | 0) - minY, o = (y * tw + x) * 4;
    out[o] = img[j * 4]; out[o + 1] = img[j * 4 + 1]; out[o + 2] = img[j * 4 + 2]; out[o + 3] = 255;
  }
  encode(path.join(outDir, id + '.png'), tw, th, out);
  previews.push({ id, tw, th, out });
});

// ---- preview sheet (x4) on a checkerboard, for eyeballing the cut ----
const S = ULTS ? 1 : 4, CW = ULTS ? 200 : 84, CH = ULTS ? 150 : 52, PW = CW * S, PH = CH * S;
const pv = Buffer.alloc(PW * 5 * PH * 6 * 4);
previews.forEach(({ tw, th, out }, i) => {
  const ox = (i % 5) * PW, oy = Math.floor(i / 5) * PH;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const d = ((oy + y) * PW * 5 + ox + x) * 4;
    const sx = Math.floor(x / S) - Math.floor((CW - tw) / 2), sy = Math.floor(y / S) - Math.floor((CH - th) / 2);
    let r = 20, g = 18, b = 34;
    if ((Math.floor(x / 16) + Math.floor(y / 16)) % 2) { r = 28; g = 26; b = 46; }
    if (sx >= 0 && sy >= 0 && sx < tw && sy < th && out[(sy * tw + sx) * 4 + 3]) { const s = (sy * tw + sx) * 4; r = out[s]; g = out[s + 1]; b = out[s + 2]; }
    pv[d] = r; pv[d + 1] = g; pv[d + 2] = b; pv[d + 3] = 255;
  }
});
encode(path.join(outDir, '_preview.png'), PW * 5, PH * 6, pv);
console.log('cut ' + previews.length + ' elements:', previews.map((p) => p.id + ' ' + p.tw + 'x' + p.th).join(', '));
