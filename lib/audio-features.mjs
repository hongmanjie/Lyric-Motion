import path from 'node:path';
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,lstat,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const percentile=(values,q)=>{const a=[...values].sort((x,y)=>x-y);return a[Math.floor((a.length-1)*q)]||0;};
const unit=(x,scale)=>Math.round(Math.min(1,Math.max(0,x/Math.max(scale,1e-9)))*100000)/100000;

/** Acoustic activity from decoded samples. These are not musical beats or lyric alignment. */
export function analyzeSamples(samples,sampleRate=16000){
 if(!samples.length||!Number.isFinite(sampleRate)||sampleRate<=0)throw Error('Decoded audio needs samples and a positive sample rate');
 const hop=Math.max(1,Math.round(sampleRate*.01)),window=Math.max(8,Math.round(sampleRate*.064));
 const power=new Float64Array(samples.length+1),low=new Float64Array(samples.length+1),alpha=1-Math.exp(-2*Math.PI*180/sampleRate);let filtered=0;
 for(let i=0;i<samples.length;i++){const x=Number.isFinite(samples[i])?samples[i]:0;filtered+=alpha*(x-filtered);power[i+1]=power[i]+x*x;low[i+1]=low[i]+filtered*filtered;}
 const rms=[],bass=[];for(let start=0;start<samples.length;start+=hop){const end=Math.min(samples.length,start+window),count=end-start;rms.push(Math.sqrt(Math.max(0,power[end]-power[start])/count));bass.push(Math.sqrt(Math.max(0,low[end]-low[start])/count));}
 const rmsScale=percentile(rms,.96),bassScale=percentile(bass,.96),flux=rms.map((r,i)=>i?Math.max(0,r-rms[i-1])+Math.max(0,bass[i]-bass[i-1])*.6:0);
 const fluxScale=percentile(flux.filter(v=>v>0),.9),onsets=[];
 for(let i=1;i<flux.length-1;i++){
  if(flux[i]<=0||rms[i]<Math.max(.002,rmsScale*.07))continue;
  const around=flux.slice(Math.max(0,i-40),Math.min(flux.length,i+41)),mean=around.reduce((n,v)=>n+v,0)/around.length,std=Math.sqrt(around.reduce((n,v)=>n+(v-mean)**2,0)/around.length);
  if(flux[i]<=mean+std||flux[i]<Math.max(...flux.slice(Math.max(0,i-5),i+6)))continue;
  const time=Math.min(samples.length/sampleRate,(i*hop+window/2)/sampleRate),strength=unit(flux[i],fluxScale);
  if(!onsets.length||time-onsets.at(-1).time>=.14)onsets.push({time:Number(time.toFixed(4)),strength});
 }
 return {version:1,method:'Measured waveform RMS, low-pass energy and positive energy-rise peaks. Acoustic onsets are estimates, not a verified beat grid.',duration:samples.length/sampleRate,step:hop/sampleRate,windowCenterOffset:window/(2*sampleRate),rms:rms.map(v=>unit(v,rmsScale)),bass:bass.map(v=>unit(v,bassScale)),onsets,verifiedMusicalBeats:false};
}

export async function measureAudio({audio,out}={}){
 if(!audio||!out)throw Error('analyze-audio needs --audio FILE --out NEW_FILE');
 const source=await realpath(path.resolve(audio)),destination=path.resolve(out);
 if(!(await lstat(source)).isFile())throw Error('Audio must be a regular file');
 if(await lstat(destination).catch(e=>{if(e.code==='ENOENT')return null;throw e}))throw Error('Audio feature output exists; choose a new file');
 const decoded=await new Promise((resolve,reject)=>{const p=spawn(process.env.FFMPEG_PATH||'ffmpeg',['-v','error','-i',source,'-vn','-ac','1','-ar','16000','-f','f32le','pipe:1'],{windowsHide:true,stdio:['ignore','pipe','pipe']});const chunks=[];let stderr='';p.stdout.on('data',b=>chunks.push(b));p.stderr.on('data',b=>stderr=(stderr+b).slice(-8000));p.once('error',reject);p.once('close',code=>code===0?resolve(Buffer.concat(chunks)):reject(Error(stderr||'FFmpeg decode failed')));});
 const samples=new Float32Array(decoded.buffer,decoded.byteOffset,Math.floor(decoded.length/4)),data=analyzeSamples(samples);
 data.sourceSHA256=createHash('sha256').update(await readFile(source)).digest('hex');
 await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,JSON.stringify(data)+'\n',{flag:'wx'});
 return {file:destination,duration:data.duration,acousticOnsets:data.onsets.length,verifiedMusicalBeats:false};
}
