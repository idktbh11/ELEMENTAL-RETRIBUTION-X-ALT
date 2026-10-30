// Crops the big blue "X" out of the native-resolution logo to use as the favicon.
// Usage: node tools/make-favicon.js
const path = require('path');
const { decode, encode } = require('./png.js');
const root = path.join(__dirname, '..');
const src = decode(path.join(root, 'assets/images/logo.png'));
const X0 = 98, Y0 = 78, S = 40;
const out = Buffer.alloc(S * S * 4);
for (let y = 0; y < S; y++)
  for (let x = 0; x < S; x++) {
    const sx = X0 + x, sy = Y0 + y;
    if (sx >= src.w || sy >= src.h) continue;
    src.data.copy(out, (y * S + x) * 4, (sy * src.w + sx) * 4, (sy * src.w + sx) * 4 + 4);
  }
encode(path.join(root, 'assets/images/favicon.png'), S, S, out);
console.log('favicon written');
