import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// An original 16-second instrumental. No samples, voices or existing melodies.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../examples/demo');
const rate=44100, duration=16, count=rate*duration;
const left=new Float64Array(count), right=new Float64Array(count);
const tau=Math.PI*2;
function noise(i,s=0){let x=(i+1+s*7411)|0;x=Math.imul(x^(x>>>16),0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);return ((x^(x>>>16))>>>0)/2147483648-1;}
function add(start, len, signal, pan=0, gain=1){let begin=Math.round(start*rate);for(let j=0;j<len*rate && begin+j<count;j++){if(begin+j<0)continue;const v=signal(j/rate,j)*gain;left[begin+j]+=v*Math.sqrt((1-pan)/2);right[begin+j]+=v*Math.sqrt((1+pan)/2);}}
function note(midi){return 440*2**((midi-69)/12);}
function pluck(at,midi,pan=0,amp=.14){const f=note(midi);add(at,.72,t=>(Math.sin(tau*f*t)+.26*Math.sin(tau*f*2*t)+.1*Math.sin(tau*f*3*t))*Math.exp(-t*8)*Math.min(1,t*180),pan,amp);}
for(let beat=0;beat<32;beat++){
 const at=beat*.5;
 add(at,.4,t=>Math.sin(tau*(47*t+3.2*(1-Math.exp(-t*34))))*Math.exp(-t*11)*Math.min(1,t*400),0,.64);
 if(beat%2===1){add(at,.22,(t,j)=>(noise(j,beat)*.65+Math.sin(tau*185*t)*.3)*Math.exp(-t*25)*Math.min(1,t*700),.03,.33);for(let c=0;c<3;c++)add(at+.012*c,.08,(t,j)=>noise(j,beat+90+c)*Math.exp(-t*65),.1,.055);}
 for(let off=0;off<2;off++)add(at+off*.25,.08,(t,j)=>(noise(j,beat+off*65)-noise(j-1,beat+off*65))*.5*Math.exp(-t*55),off? .48:-.4,off?.105:.07);
 if(beat%4===3)add(at+.375,.07,(t,j)=>noise(j,beat)*Math.exp(-t*60),-.5,.055);
 const roots=[35,38,33,30], bass=roots[Math.floor(beat/8)];
 for(const off of [0,.375])add(at+off,.28,t=>(Math.sin(tau*note(bass)*t)+.25*Math.sin(tau*note(bass)*2*t))*Math.exp(-t*9)*Math.min(1,t*250),0,off?.18:.28);
}
// Four deliberately authored motifs; timing is editorial, not vocal alignment.
const motifs=[[71,74,78,74,69,73,76,78],[74,78,81,78,76,74,71,69],[69,73,76,81,78,76,73,69],[66,69,73,78,76,73,69,66]];
for(let bar=0;bar<4;bar++)for(let k=0;k<8;k++){
 const at=bar*4+k*.5+(k%3===1?.25:0),m=motifs[bar][k];
 pluck(at,m,k%2?.35:-.35,.115);
 pluck(at+.1875,m,k%2?-.5:.5,.027);
 if(k%2===0)pluck(at+.75,m+12,.2,.025);
}
// Short reverse swells into scene boundaries, all synthesized.
for(const at of [4,8,12])add(at-.35,.35,(t,j)=>noise(j,91)*Math.sin(Math.PI*t/.7)**3,.1,.09);
let peak=0;for(let i=0;i<count;i++)peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
const pcm=Buffer.alloc(count*4), gain=.87/Math.max(1,peak);
for(let i=0;i<count;i++){
 const fade=Math.min(1,i/(rate*.006),(count-i)/(rate*.12));
 pcm.writeInt16LE(Math.round(Math.tanh(left[i]*gain)*fade*32767),i*4);
 pcm.writeInt16LE(Math.round(Math.tanh(right[i]*gain)*fade*32767),i*4+2);
}
const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*4,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
await mkdir(path.join(root,'assets'),{recursive:true});await mkdir(path.join(root,'config'),{recursive:true});
await writeFile(path.join(root,'assets/audio.wav'),Buffer.concat([header,pcm]));
const phrases=['MOVE WITH THE BEAT','MAKE WAVES','COME TOGETHER','MAKE IT YOURS'];
const lines=phrases.map((text,i)=>({i,text,start:i*4,end:(i+1)*4,words:text.split(' ').map((word,j,a)=>({text:word,start:i*4+j*(3/a.length),end:i*4+(j+1)*(3/a.length)}))}));
const timeline={version:1,duration,bpm:120,beat:.5,beats:Array.from({length:33},(_,i)=>i*.5),timing:{source:'authored',kind:'editorial',vocals:false,notes:'Original instrumental and authored display text. These are creative cue timings, not sung lyrics or forced alignment.'},lines};
await writeFile(path.join(root,'timeline.json'),JSON.stringify(timeline,null,2)+'\n');
// A portable line-timed input for exercising init; these are display cues, not vocals.
await writeFile(path.join(root,'assets/lyrics.lrc'),phrases.map((text,i)=>`[00:${String(i*4).padStart(2,'0')}.00]${text}`).join('\n')+'\n[00:16.00]\n');
await writeFile(path.join(root,'config/project.json'),JSON.stringify({title:'MAKE IT YOURS · Original demo',width:1920,height:1080,fps:30,duration,previewDuration:15,audio:'assets/audio.wav',timeline:'timeline.json',artwork:'artwork.js',readyToRender:true},null,2)+'\n');
console.log('Original demo: 16s / 120 BPM / 44.1 kHz stereo PCM; config + authored timeline generated.');
