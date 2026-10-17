import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {analyzeSamples,measureAudio} from '../lib/audio-features.mjs';

test('silence has no invented acoustic events; invalid input is rejected',()=>{
 const result=analyzeSamples(new Float32Array(16000));
 assert.equal(result.duration,1);assert.equal(result.verifiedMusicalBeats,false);assert.equal(result.rms.length,100);
 assert.ok(result.rms.every(value=>value===0));assert.deepEqual(result.onsets,[]);
 assert.throws(()=>analyzeSamples([],16000),/samples/);assert.throws(()=>analyzeSamples([0],0),/sample rate/);
});

test('measured activity locates separated synthetic pulses instead of making a regular beat grid',()=>{
 const rate=16000,samples=new Float32Array(rate*3),starts=[.4,1.2,2.15];
 for(const start of starts)for(let i=0;i<rate*.18;i++)samples[Math.floor(start*rate)+i]=Math.sin(i/rate*2*Math.PI*120)*.8;
 const features=analyzeSamples(samples,rate);
 for(const start of starts)assert.ok(features.onsets.some(event=>Math.abs(event.time-start)<.07),`Missing measured rise near ${start}`);
 assert.ok(features.rms[50]>features.rms[10]);assert.ok(features.bass[50]>0);
 assert.ok(features.onsets.every(event=>event.strength>=0&&event.strength<=1));
});

test('file analysis retains source bytes and refuses to overwrite a previous measurement',{skip:spawnSync(process.env.FFMPEG_PATH||'ffmpeg',['-version'],{windowsHide:true}).status!==0},async t=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),parent=path.join(root,'qa/audio-feature-tests');await mkdir(parent,{recursive:true});const dir=await mkdtemp(path.join(parent,'case-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const audio=path.join(dir,'song.wav'),out=path.join(dir,'features.json'),bytes=await readFile(path.join(root,'examples/demo/assets/audio.wav'));await writeFile(audio,bytes);
 const result=await measureAudio({audio,out}),features=JSON.parse(await readFile(out));
 assert.ok(result.duration>0);assert.match(features.sourceSHA256,/^[a-f0-9]{64}$/);assert.equal(features.verifiedMusicalBeats,false);
 assert.deepEqual(await readFile(audio),bytes);await assert.rejects(measureAudio({audio,out}),/exists/);
});
