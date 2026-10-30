// Downsamples a large AI/upscaled pixel-art image to its native pixel grid.
// Usage: node tools/pixelate-logo.js <input.png> <targetWidth> <output.png>
// (used to make assets/images/logo.png at 236px wide from logo_source.png)
const {decode,encode}=require('./png.js');const src=decode(process.argv[2]);const tw=+process.argv[3];const out=process.argv[4];const view=+process.argv[5]||1;
const sx=src.w/tw;const th=Math.round(src.h/sx);const sy=src.h/th;const D=Buffer.alloc(tw*th*4);
for(let y=0;y<th;y++)for(let x=0;x<tw;x++){const bins=new Map();
 const x0=Math.floor((x+0.2)*sx),x1=Math.ceil((x+0.8)*sx),y0=Math.floor((y+0.2)*sy),y1=Math.ceil((y+0.8)*sy);
 for(let yy=y0;yy<y1&&yy<src.h;yy++)for(let xx=x0;xx<x1&&xx<src.w;xx++){const i=(yy*src.w+xx)*4;const a=src.data[i+3];
  const key=a<128?'T':((src.data[i]>>4)<<8|(src.data[i+1]>>4)<<4|(src.data[i+2]>>4));let e=bins.get(key);if(!e){e={n:0,r:0,g:0,b:0};bins.set(key,e);}e.n++;e.r+=src.data[i];e.g+=src.data[i+1];e.b+=src.data[i+2];}
 let best=null,bk;for(const [k,e] of bins)if(!best||e.n>best.n){best=e;bk=k;}
 const o=(y*tw+x)*4;if(bk==='T'){D[o+3]=0;}else{D[o]=Math.round(best.r/best.n);D[o+1]=Math.round(best.g/best.n);D[o+2]=Math.round(best.b/best.n);D[o+3]=255;}}
if(view>1){const W=tw*view,H=th*view,V=Buffer.alloc(W*H*4);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const s=((y/view|0)*tw+(x/view|0))*4,d=(y*W+x)*4;const a=D[s+3];V[d]=a?D[s]:20;V[d+1]=a?D[s+1]:20;V[d+2]=a?D[s+2]:40;V[d+3]=255;}encode(out,W,H,V);}else encode(out,tw,th,D);
console.log(tw,th);
