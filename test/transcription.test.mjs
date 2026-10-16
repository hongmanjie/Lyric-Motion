import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {mkdtemp,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {BACKEND_VERSION,lrcTimestamp,phraseTranscript,setupLyrics,transcribeLyrics,transcriptFiles,validateTranscript} from '../lib/transcription.mjs';

const transcript=(segments,duration=10)=>({schemaVersion:1,backend:'faster-whisper',backendVersion:BACKEND_VERSION,model:'base',language:'en',languageProbability:0.98,decodedDuration:duration,segments});
const fixture=()=>transcript([{start:1.23,end:3.2,text:' Hello, world!',words:[]},{start:5.7,end:8,text:'Second line.',words:[]}]);
const temporary=async t=>{const directory=await mkdtemp(path.join(os.tmpdir(),'lyric-transcription-'));t.after(()=>rm(directory,{recursive:true,force:true}));return directory;};
const silent=()=>{};

test('LRC centisecond rounding carries seconds and minutes correctly',()=>{
  assert.equal(lrcTimestamp(59.999),'[01:00.00]');
  assert.equal(lrcTimestamp(3599.999),'[60:00.00]');
  assert.equal(lrcTimestamp(0.005),'[00:00.01]');
  assert.throws(()=>lrcTimestamp(NaN),/Invalid/);
});

test('real ASR gaps clear lyrics and SRT preserves actual ends',()=>{
  const files=transcriptFiles(fixture(),10);
  assert.match(files.lrc,/\[00:00.00\]\n\[00:01.23\]Hello, world!\n\[00:03.20\]\n\[00:05.70\]Second line.\n\[00:08.00\]/);
  assert.match(files.srt,/00:00:01,230 --> 00:00:03,200/);
  assert.deepEqual(files.transcript.segments.map(segment=>segment.start),[1.23,5.7]);
});

test('invalid, out-of-audio, unordered, and empty ASR segments cannot export fabricated LRC',()=>{
  for(const segments of [[],[{start:0,end:11,text:'outside'}],[{start:3,end:5,text:'one'},{start:2,end:3,text:'two'}],[{start:NaN,end:2,text:'bad'}],[{start:0,end:1,text:' '}],[{start:0,end:2,text:'bad',words:[{start:1,end:11,text:'bad'}]}]])assert.throws(()=>validateTranscript(transcript(segments),10));
  assert.throws(()=>validateTranscript({...fixture(),decodedDuration:30},10),/duration/);
});

test('long segments become readable phrases using only actual model word times',()=>{
  const words=[{start:1,end:2,text:'Should '},{start:2,end:3,text:'old '},{start:3,end:5,text:'acquaintance '},{start:5,end:6,text:'be forgot,'},{start:7,end:8,text:' and '},{start:8,end:9,text:'never '},{start:9,end:11,text:'brought '},{start:11,end:12,text:'to mind?'}];
  const source=transcript([{start:0,end:13,text:words.map(word=>word.text).join(''),words}],15),phrases=phraseTranscript(validateTranscript(source,15));
  assert.equal(phrases.segments.length,2);
  assert.deepEqual(phrases.segments.map(segment=>[segment.start,segment.end]),[[1,6],[7,12]]);
  assert.equal(phrases.sourceSegments[0].start,0);
  assert.equal(phrases.segments.flatMap(segment=>segment.words).length,words.length);
});

test('missing word coverage never causes text-only timestamp invention',()=>{
  const source=fixture();source.segments[0].words=[{start:1.23,end:2,text:'Hello'}];
  const result=phraseTranscript(validateTranscript(source,10));
  assert.equal(result.segments[0].text,'Hello, world!');assert.equal(result.segments[0].end,3.2);
});

test('zero-duration model words retain the valid source interval instead of invalid phrases',()=>{
  const source=transcript([{start:1,end:3,text:'Hi!',words:[{start:1,end:1,text:'Hi!'}]}]);
  const result=transcriptFiles(source,10);
  assert.equal(result.transcript.segments[0].start,1);assert.equal(result.transcript.segments[0].end,3);
});

test('isolated setup reuses only a verified managed environment and no shell',async t=>{
  const root=await temporary(t),cache=path.join(root,'cache'),calls=[];
  const runtime=path.join(cache,'venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
  const runner=async(command,args)=>{
    calls.push([command,args]);
    if(args.includes('import json,sys; print(json.dumps({"version":list(sys.version_info[:3]),"executable":sys.executable}))'))return JSON.stringify({version:[3,12,0],executable:'/fake/python'});
    if(args.includes('venv')){await mkdir(path.dirname(runtime),{recursive:true});await writeFile(runtime,'test fake interpreter');return '';}
    if(args.includes('pip'))return '';
    return JSON.stringify({backendVersion:BACKEND_VERSION});
  };
  const first=await setupLyrics({python:'/fake/python',cache,log:silent,_runner:runner});assert.equal(first.reused,false);
  const second=await setupLyrics({cache,log:silent,_runner:runner});assert.equal(second.reused,true);
  assert.equal(calls.filter(([,args])=>args.includes('pip')).length,1);
  const foreign=path.join(root,'foreign');await mkdir(foreign);await writeFile(path.join(foreign,'important.txt'),'keep');
  await assert.rejects(setupLyrics({cache:foreign,log:silent,_runner:runner}),/not owned/);
  assert.equal(await readFile(path.join(foreign,'important.txt'),'utf8'),'keep');
});

test('audio transcription preserves Unicode source, writes review state, refuses overwrite',async t=>{
  const root=await temporary(t),audio=path.join(root,'歌曲 source.wav'),out=path.join(root,'lyrics'),cache=path.join(root,'cache');await writeFile(audio,'original source bytes');
  const setup=async()=>({cache,python:'/fake/python',modelCache:path.join(cache,'models')});
  let executions=0;
  const runner=async(command,args)=>{executions++;assert.equal(args[args.indexOf('--audio')+1],audio);const data=fixture();data.segments[0].words=[{start:1.23,end:3.2,text:'Hello, world!',probability:0.25}];await writeFile(args[args.indexOf('--output')+1],JSON.stringify(data));};
  const invoke=()=>transcribeLyrics({audio,out,log:silent,_setup:setup,_runner:runner,_probe:async()=>({streams:[{codec_type:'audio',duration:'10'}]})});
  const result=await invoke();assert.equal(result.status,'draft-needs-review');
  assert.deepEqual((await readdir(out)).sort(),['lyrics.lrc','lyrics.srt','lyrics.txt','state.json','transcription.json']);
  const metadata=JSON.parse(await readFile(path.join(out,'transcription.json'),'utf8'));
  assert.equal(metadata.source.filename,'歌曲 source.wav');assert.equal(metadata.alignment.humanReviewed,false);assert.match(metadata.source.sha256,/^[a-f0-9]{64}$/);
  assert.equal(metadata.reviewHints[0].reason,'low-model-word-probability');assert.equal(metadata.reviewHints[0].start,1.23);
  assert.equal(await readFile(audio,'utf8'),'original source bytes');
  await assert.rejects(invoke(),/already exists/);assert.equal(executions,1);
});

test('backend failure leaves no exported result or staging directory',async t=>{
  const root=await temporary(t),audio=path.join(root,'song.wav'),out=path.join(root,'failed');await writeFile(audio,'source');
  await assert.rejects(transcribeLyrics({audio,out,log:silent,_setup:async()=>({cache:path.join(root,'cache'),python:'/fake/python',modelCache:'models'}),_probe:async()=>({streams:[{codec_type:'audio',duration:10}]}),_runner:async()=>{throw new Error('model download failed');}}),/download failed/);
  assert.deepEqual(await readdir(root),['song.wav']);
});

test('model paths and invalid language are rejected before source access',async()=>{
  await assert.rejects(transcribeLyrics({audio:'missing',out:'missing',model:'../../weights'}),/Unsupported model/);
  await assert.rejects(transcribeLyrics({audio:'missing',out:'missing',language:'en;echo'}),/Language/);
});
