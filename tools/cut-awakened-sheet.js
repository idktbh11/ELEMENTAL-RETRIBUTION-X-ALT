/*
 * Cuts the AWAKENED ULTIMATES sheet (black background, 5x6 emblems, same
 * element order as the other sheets, no Darkness) into one PNG per element,
 * and erases the "1." / "12." numbers in front of each title.
 *
 *   node tools/cut-awakened-sheet.js assets/images/ults_awakened_source.png
 *   -> assets/images/ults-awakened/<id>.png  + _preview.png
 *
 *   1. shrink to the art's pixel grid (most common colour per cell)
 *   2. split into the 5x6 emblems along the black gaps
 *   3. black becomes transparent, with a soft edge so the glows stay glowy
 *   4. the numbers are erased first (boxes measured by hand: NUMBERS)
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
const PIXEL = 2;
const COLS = [[0, 258], [258, 528], [528, 786], [786, 1044], [1044, 1312]];
const ROWS = [[148, 340], [340, 516], [516, 690], [690, 867], [867, 1035], [1035, 1199]];

const src = decode(process.argv[2]);
const outDir = path.join(__dirname, '..', 'assets', 'images', 'ults-awakened');
fs.mkdirSync(outDir, { recursive: true });
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

function shrink(x0, y0, x1, y1) {
  const W = Math.round((x1 - x0) / PIXEL), H = Math.round((y1 - y0) / PIXEL);
  const img = new Uint8ClampedArray(W * H * 4);
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const bins = new Map();
    const sx0 = x0 + Math.floor(tx * PIXEL), sy0 = y0 + Math.floor(ty * PIXEL);
    for (let y = sy0; y < sy0 + PIXEL && y < src.h; y++) for (let x = sx0; x < sx0 + PIXEL && x < src.w; x++) {
      const k = (y * src.w + x) * 4;
      const key = ((src.data[k] >> 4) << 8) | ((src.data[k + 1] >> 4) << 4) | (src.data[k + 2] >> 4);
      let e = bins.get(key);
      if (!e) { e = { n: 0, r: 0, g: 0, b: 0 }; bins.set(key, e); }
      e.n++; e.r += src.data[k]; e.g += src.data[k + 1]; e.b += src.data[k + 2];
    }
    let best = null;
    for (const e of bins.values()) if (!best || e.n > best.n) best = e;
    const o = (ty * W + tx) * 4;
    img[o] = best.r / best.n; img[o + 1] = best.g / best.n; img[o + 2] = best.b / best.n; img[o + 3] = 255;
  }
  return { W, H, img };
}

// Where each title's number ("1." ... "30.") sits on the sheet: [x0, y0, x1, y1] in sheet pixels.
// Measured by hand (an automatic guess kept eating letters).
const NUMBERS = {
  fire: [28, 266, 60, 306], water: [290, 276, 326, 308], wind: [553, 266, 590, 308], earth: [821, 268, 857, 302], lightning: [1074, 276, 1112, 308],
  ice: [34, 424, 78, 468], nature: [298, 432, 338, 470], shadow: [558, 432, 598, 474], light: [836, 432, 876, 470], arcane: [1062, 440, 1120, 478],
  poison: [30, 616, 79, 656], blood: [298, 608, 356, 654], death: [558, 616, 610, 656], metal: [858, 590, 914, 634], sand: [1084, 610, 1140, 650],
  magma: [36, 786, 90, 826], storm: [294, 788, 340, 826], cosmic: [558, 790, 614, 826], void: [824, 792, 874, 830], psychic: [1074, 794, 1130, 832],
  crystal: [34, 952, 88, 992], moon: [298, 954, 362, 992], solar: [564, 954, 622, 996], magnetism: [816, 946, 872, 986], time: [1080, 966, 1128, 1004],
  gravity: [36, 1114, 81, 1152], sound: [300, 1120, 350, 1158], mist: [566, 1114, 610, 1152], spirit: [828, 1120, 878, 1158], chaos: [1098, 1112, 1148, 1148],
};
function eraseNumbers() {
  for (const [x0, y0, x1, y1] of Object.values(NUMBERS)) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const k = (y * src.w + x) * 4; src.data[k] = src.data[k + 1] = src.data[k + 2] = 0; }
}

/** Black -> transparent, softly. Then trim to the visible area. */
function finish(c) {
  const { W, H, img } = c;
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4, l = lum(img[o], img[o + 1], img[o + 2]);
    const a = Math.max(0, Math.min(1, (l - 18) / 45));
    img[o + 3] = Math.round(a * 255);
    if (a > 0.2) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  }
  const w = maxX - minX + 1, h = maxY - minY + 1, out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const s = ((y + minY) * W + x + minX) * 4, d = (y * w + x) * 4; for (let k = 0; k < 4; k++) out[d + k] = img[s + k]; }
  return { w, h, data: out };
}

eraseNumbers();
const cut = [];
ROWS.forEach((r, ri) => COLS.forEach((cl, ci) => {
  const id = ORDER[ri * 5 + ci];
  const c = shrink(cl[0], r[0], cl[1], r[1]);
  const box = NUMBERS[id];
  const f = finish(c);
  encode(path.join(outDir, id + '.png'), f.w, f.h, f.data);
  cut.push({ id, f, box });
  console.log(id.padEnd(10), f.w + 'x' + f.h, box ? 'number erased' : 'NO NUMBER BOX');
}));

// preview: all of them on a dark grey sheet
const PW = 5 * 136, PH = 6 * 98, prev = Buffer.alloc(PW * PH * 4);
for (let i = 0; i < PW * PH; i++) { prev[i * 4] = 30; prev[i * 4 + 1] = 26; prev[i * 4 + 2] = 40; prev[i * 4 + 3] = 255; }
cut.forEach(({ f }, i) => {
  const ox = (i % 5) * 136 + Math.floor((136 - f.w) / 2), oy = Math.floor(i / 5) * 98 + Math.floor((98 - f.h) / 2);
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    const px = ox + x, py = oy + y; if (px < 0 || py < 0 || px >= PW || py >= PH) continue;
    const s = (y * f.w + x) * 4, d = (py * PW + px) * 4, a = f.data[s + 3] / 255;
    for (let k = 0; k < 3; k++) prev[d + k] = prev[d + k] * (1 - a) + f.data[s + k] * a;
  }
});
encode(path.join(outDir, '_preview.png'), PW, PH, prev);
