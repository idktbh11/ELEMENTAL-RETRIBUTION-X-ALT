const fs=require('fs'),zlib=require('zlib');
function decode(file){const b=fs.readFileSync(file);let p=8,w,h,ct,idat=[];
while(p<b.length){const len=b.readUInt32BE(p),type=b.toString('ascii',p+4,p+8);const d=b.slice(p+8,p+8+len);
if(type==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);ct=d[9];}if(type==='IDAT')idat.push(d);p+=12+len;}
const raw=zlib.inflateSync(Buffer.concat(idat));const bpp=ct===6?4:3,stride=w*bpp;const out=Buffer.alloc(w*h*4);const prev=Buffer.alloc(stride),cur=Buffer.alloc(stride);
for(let y=0;y<h;y++){const f=raw[y*(stride+1)];raw.copy(cur,0,y*(stride+1)+1,y*(stride+1)+1+stride);
for(let x=0;x<stride;x++){const a=x>=bpp?cur[x-bpp]:0,up=prev[x],c=x>=bpp?prev[x-bpp]:0;let v=cur[x];
if(f===1)v+=a;else if(f===2)v+=up;else if(f===3)v+=(a+up)>>1;else if(f===4){const pp=a+up-c,pa=Math.abs(pp-a),pb=Math.abs(pp-up),pc=Math.abs(pp-c);v+=(pa<=pb&&pa<=pc)?a:(pb<=pc?up:c);}cur[x]=v&255;}
cur.copy(prev);for(let x=0;x<w;x++){out[(y*w+x)*4]=cur[x*bpp];out[(y*w+x)*4+1]=cur[x*bpp+1];out[(y*w+x)*4+2]=cur[x*bpp+2];out[(y*w+x)*4+3]=bpp===4?cur[x*bpp+3]:255;}}
return {w,h,data:out};}
function crc32(buf){let c,crc=0xffffffff;for(let n=0;n<buf.length;n++){c=(crc^buf[n])&255;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crc=(crc>>>8)^c;}return (crc^0xffffffff)>>>0;}
function encode(file,w,h,data){const chunks=[];const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t,'ascii'),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc32(td));chunks.push(l,td,c);};
const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;chunk('IHDR',ih);
const raw=Buffer.alloc(h*(w*4+1));for(let y=0;y<h;y++){raw[y*(w*4+1)]=0;data.copy(raw,y*(w*4+1)+1,y*w*4,(y+1)*w*4);}
chunk('IDAT',zlib.deflateSync(raw,{level:9}));chunk('IEND',Buffer.alloc(0));fs.writeFileSync(file,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),...chunks]));}
module.exports={decode,encode};
