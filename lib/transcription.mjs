import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat,mkdir,open,readdir,realpath,rename,rm,writeFile} from 'node:fs/promises';
import {REPO_ROOT,inside,json,probe,timecode,writeJSON} from './paths.mjs';

export const BACKEND_VERSION='1.2.1';
export const LYRIC_MODELS=Object.freeze(['tiny','tiny.en','base','base.en','small','small.en','medium','medium.en','large-v2','large-v3','large-v3-turbo','distil-large-v3']);
const CACHE_MARKER='.lyric-motion-lyrics-cache.json';
const defaultCache=()=>path.join(os.homedir(),'.cache','lyric-motion','lyrics');
const exists=async p=>{try{await lstat(p);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}};
const logDefault=message=>process.stderr.write(`${message}\n`);

/** Spawn argv directly: no shell expansion, with live setup/transcription progress. */
export function runLyricsProcess(command,args,{log=logDefault,timeout=0}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,PYTHONUTF8:'1',PYTHONIOENCODING:'utf-8'}});let stdout='',stderr='',timer,lastOutput=Date.now();
    const heartbeat=!timeout?setInterval(()=>{if(Date.now()-lastOutput>=15000)log('Local lyrics process is still working; initial package/model downloads or CPU recognition can take several minutes.');},15000):null;
    if(timeout)timer=setTimeout(()=>{child.kill();reject(new Error(`Timed out checking Python: ${command}`));},timeout);
    child.stdout.on('data',chunk=>{lastOutput=Date.now();stdout=(stdout+chunk).slice(-2_000_000);if(!timeout)log(String(chunk).trimEnd());});
    child.stderr.on('data',chunk=>{lastOutput=Date.now();stderr=(stderr+chunk).slice(-8000);if(!timeout)log(String(chunk).trimEnd());});
    child.once('error',error=>{clearTimeout(timer);clearInterval(heartbeat);reject(error);});
    child.once('close',code=>{clearTimeout(timer);clearInterval(heartbeat);code===0?resolve(stdout):reject(new Error(`${path.basename(command)} exited ${code}: ${stderr.slice(-3000)}`));});
  });
}

function checkOptions({model='base',language='auto'}={}){
  if(!LYRIC_MODELS.includes(model))throw new Error(`Unsupported model. Choose: ${LYRIC_MODELS.join(', ')}`);
  if(typeof language!=='string'||!(/^(auto|[a-z]{2,3})$/.test(language)))throw new Error('Language must be auto or a Whisper language code, e.g. en, zh, ja');
  return {model,language};
}

async function pythonCandidate(explicit,runner){
  let candidates=[];
  if(explicit){
    if(typeof explicit!=='string'||!explicit||explicit.startsWith('-')||/[\u0000\r\n]/.test(explicit)||/WindowsApps[\\/]python/i.test(explicit))throw new Error('Use a real Python executable, not a Windows Store alias');
    candidates=[[explicit,[]]];
  }else{
    if(process.platform==='win32')candidates.push(['py',['-3']]);
    const names=process.platform==='win32'?['python.exe','python3.exe']:['python3','python'];
    for(const directory of (process.env.PATH||'').split(path.delimiter)){
      if(!directory||/WindowsApps/i.test(directory))continue;
      for(const name of names){const file=path.join(directory,name);if(await exists(file))candidates.push([file,[]]);}
    }
  }
  for(const [executable,prefix] of candidates)try{
    const result=JSON.parse((await runner(executable,[...prefix,'-c','import json,sys; print(json.dumps({"version":list(sys.version_info[:3]),"executable":sys.executable}))'],{timeout:10000,log:()=>{}})).trim());
    if(result.version?.[0]===3&&result.version[1]>=10&&result.version[1]<=13&&result.executable&&!/WindowsApps/i.test(result.executable))return {executable:result.executable,prefix:[],version:result.version};
  }catch(error){if(explicit)throw new Error(`Cannot use --python: ${error.message}`);}
  throw new Error('Python 3.10–3.13 is required for optional local lyrics. Install Python, or pass --python FULL_PATH. Node-only MV creation still works.');
}

async function managedCache(cache){
  const root=path.resolve(cache||defaultCache());
  if(await exists(root)){
    const stat=await lstat(root);if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('Lyrics cache must be a real directory, not a link');
    const names=await readdir(root);
    if(names.length&&!names.includes(CACHE_MARKER))throw new Error('Cache directory is not owned by Lyric Motion. Choose a new --cache directory.');
    if(names.includes(CACHE_MARKER)){
      const marker=await json(path.join(root,CACHE_MARKER));
      if(marker.schemaVersion!==1||marker.owner!=='lyric-motion-lyrics')throw new Error('Invalid lyrics cache ownership marker');
    }
  }else await mkdir(root,{recursive:true});
  const marker=path.join(root,CACHE_MARKER);
  if(!await exists(marker))await writeFile(marker,JSON.stringify({schemaVersion:1,owner:'lyric-motion-lyrics'})+'\n',{flag:'wx'});
  return await realpath(root);
}

async function checkRuntime(python,runner){
  const raw=await runner(python,['-c','import importlib.metadata,json; import faster_whisper,numpy; print(json.dumps({"backendVersion":importlib.metadata.version("faster-whisper")}))'],{timeout:30000,log:()=>{}});
  const result=JSON.parse(raw.trim());if(result.backendVersion!==BACKEND_VERSION)throw new Error(`Expected faster-whisper ${BACKEND_VERSION}`);return result;
}

export async function setupLyrics({python,cache,log=logDefault,_runner=runLyricsProcess}={}){
  const root=await managedCache(cache),venv=path.join(root,'venv'),runtime=path.join(venv,process.platform==='win32'?'Scripts/python.exe':'bin/python');
  for(const child of [venv,path.join(root,'models')])if(await exists(child)){
    const stat=await lstat(child);if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('Managed lyrics environment/model cache cannot be a file or directory link');
  }
  // Locks prevent two concurrent first-use installs from corrupting one venv.
  const lock=path.join(root,'.setup.lock');let handle;
  try{handle=await open(lock,'wx');}catch(error){if(error.code==='EEXIST')throw new Error(`Lyrics setup is already running, or a previous setup was interrupted. Check ${lock} before removing that lock.`);throw error;}
  try{
    if(await exists(runtime)){
      const stat=await lstat(venv);if(stat.isSymbolicLink())throw new Error('Managed lyrics environment cannot be a directory link');
      try{const verified=await checkRuntime(runtime,_runner);return {ready:true,cache:root,python:runtime,...verified,modelCache:path.join(root,'models'),reused:true};}catch(error){log(`Repairing isolated lyrics environment: ${error.message}`);}
    }
    const selected=await pythonCandidate(python,_runner);
    log(`Creating isolated lyrics environment in ${root}`);
    await _runner(selected.executable,['-m','venv',venv],{log});
    log(`Installing optional faster-whisper ${BACKEND_VERSION}; first setup needs network access.`);
    await _runner(runtime,['-m','pip','install','--disable-pip-version-check','-r',path.join(REPO_ROOT,'tools','lyrics-requirements.txt')],{log});
    const verified=await checkRuntime(runtime,_runner);
    await writeJSON(path.join(root,'runtime.json'),{schemaVersion:1,backend:'faster-whisper',backendVersion:BACKEND_VERSION,sourcePython:selected.version,installedAt:new Date().toISOString()});
    return {ready:true,cache:root,python:runtime,...verified,modelCache:path.join(root,'models'),reused:false};
  }finally{await handle.close();await rm(lock,{force:true});}
}

export function lrcTimestamp(seconds){
  if(!Number.isFinite(seconds)||seconds<0)throw new Error('Invalid LRC timestamp');
  const centiseconds=Math.round(seconds*100),minutes=Math.floor(centiseconds/6000),remainder=centiseconds%6000;
  return `[${String(minutes).padStart(2,'0')}:${String(Math.floor(remainder/100)).padStart(2,'0')}.${String(remainder%100).padStart(2,'0')}]`;
}

/** Validate model timings; never invent timing by distributing transcript text. */
export function validateTranscript(raw,duration){
  if(!Number.isFinite(duration)||duration<=0)throw new Error('Audio duration must be positive');
  if(!raw||!Array.isArray(raw.segments))throw new Error('Backend transcript needs segments');
  if(!Number.isFinite(raw.decodedDuration)||Math.abs(raw.decodedDuration-duration)>0.25)throw new Error('Decoded audio duration does not match the source audio');
  const segments=[];let previous=-1;
  for(const [index,segment] of raw.segments.entries()){
    const {start,end}=segment;
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>duration+0.001||start<previous)throw new Error(`Invalid or unordered segment timing at ${index}`);
    if(typeof segment.text!=='string')throw new Error(`Missing segment text at ${index}`);
    previous=start;const text=segment.text.replace(/[\r\n]+/g,' ').replace(/\s+/g,' ').trim();
    if(!text)continue;
    const words=[];let previousWord=-1;
    for(const word of segment.words||[]){
      if(!Number.isFinite(word.start)||!Number.isFinite(word.end)||word.start<0||word.end<word.start||word.end>duration+0.001||word.start<previousWord||typeof word.text!=='string')throw new Error(`Invalid word timing in segment ${index}`);
      if(word.probability!==undefined&&(!Number.isFinite(word.probability)||word.probability<0||word.probability>1))throw new Error('Invalid word probability');
      previousWord=word.start;words.push({...word});
    }
    segments.push({...segment,text,words});
  }
  if(!segments.length)throw new Error('No vocal text was detected. No empty or fabricated LRC was exported.');
  return {...raw,segments};
}

/** Readable lyric phrases, cut only at actual ASR word boundaries. */
export function phraseTranscript(transcript){
  const sourceSegments=transcript.segments,segments=[];
  for(const [sourceSegment,segment] of sourceSegments.entries()){
    const previousCount=segments.length;
    const words=segment.words||[],compact=text=>text.replace(/\s+/g,'');
    // Some backends omit words. Preserve their real segment interval instead
    // of guessing where transcript characters occur in time.
    if(!words.length||compact(words.map(word=>word.text).join(''))!==compact(segment.text)){
      segments.push({...segment,sourceSegment});continue;
    }
    let group=[];
    const flush=()=>{if(!group.length)return;segments.push({...segment,sourceSegment,start:group[0].start,end:group.at(-1).end,text:group.map(word=>word.text).join('').trim(),words:group});group=[];};
    for(const word of words){
      const text=[...group,word].map(item=>item.text).join('').trim(),limit=/[\u3040-\u30ff\u3400-\u9fff]/u.test(text)?24:48;
      if(group.length&&(word.start-group.at(-1).end>0.45||text.length>limit||word.end-group[0].start>7))flush();
      group.push(word);
      const phrase=group.map(item=>item.text).join('').trim();
      if(/[.!?。！？]["'”’]*$/u.test(word.text)||phrase.length>=16&&/[,;:，；：]["'”’]*$/u.test(word.text))flush();
    }
    flush();
    if(segments.slice(previousCount).some(phrase=>phrase.end<=phrase.start))segments.splice(previousCount,segments.length-previousCount,{...segment,sourceSegment});
  }
  return {...transcript,sourceSegments,segments,phraseGrouping:{method:'model-word-boundaries',maxCharacters:48,cjkMaxCharacters:24,maxSeconds:7,gapSeconds:0.45,fallback:'original model segment when word coverage is missing'}};
}

export function transcriptFiles(transcript,duration){
  const data=validateTranscript(phraseTranscript(validateTranscript(transcript,duration)),duration),lrc=['[re:Lyric Motion local ASR draft]'],srt=[],txt=[];
  if(Math.round(data.segments[0].start*100)>0)lrc.push('[00:00.00]');
  data.segments.forEach((segment,index)=>{
    const next=data.segments[index+1];
    lrc.push(lrcTimestamp(segment.start)+segment.text);
    // A blank timed line clears text in genuine gaps and after the last vocal.
    if(!next||Math.round(next.start*100)>Math.round(segment.end*100))lrc.push(lrcTimestamp(segment.end));
    srt.push(`${index+1}\n${timecode(segment.start)} --> ${timecode(segment.end)}\n${segment.text}`);txt.push(segment.text);
  });
  return {transcript:data,lrc:lrc.join('\n')+'\n',srt:srt.join('\n\n')+'\n',txt:txt.join('\n')+'\n'};
}

const hashFile=async file=>{const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');};

export async function transcribeLyrics({audio,out,model='base',language='auto',python,cache,log=logDefault,_setup=setupLyrics,_runner=runLyricsProcess,_probe=probe}={}){
  checkOptions({model,language});
  if(typeof audio!=='string'||!audio||typeof out!=='string'||!out)throw new Error('lyrics needs --audio FILE and --out NEW_DIR');
  const source=await realpath(path.resolve(audio)),sourceStat=await lstat(source);
  if(!sourceStat.isFile())throw new Error('Audio must be a file');
  const destination=path.resolve(out);
  if(await exists(destination))throw new Error('Lyrics output already exists. Choose a new --out directory.');
  const media=await _probe(source),audioStream=media.streams?.find(stream=>stream.codec_type==='audio');
  const duration=Number(audioStream?.duration??media.format?.duration);
  if(!audioStream||!Number.isFinite(duration)||duration<=0)throw new Error('Source has no readable audio duration');
  const runtime=await _setup({python,cache,log});
  if(inside(destination,runtime.cache)||inside(runtime.cache,destination)||destination===runtime.cache)throw new Error('Output and lyrics cache must be separate directories');
  await mkdir(path.dirname(destination),{recursive:true});
  const stage=path.join(path.dirname(destination),`.lyrics-stage-${randomUUID()}`);await mkdir(stage);
  try{
    const backendFile=path.join(stage,'backend.json');
    await _runner(runtime.python,[path.join(REPO_ROOT,'tools','transcribe-lyrics.py'),'--audio',source,'--output',backendFile,'--model',model,'--language',language,'--model-cache',runtime.modelCache,'--ffmpeg',process.env.FFMPEG_PATH||'ffmpeg'],{log});
    const files=transcriptFiles(await json(backendFile),duration);
    const reviewHints=files.transcript.segments.flatMap((segment,index)=>{
      const hints=[];
      for(const word of segment.words)if(word.probability!==undefined&&word.probability<0.6)hints.push({segment:index,start:word.start,end:word.end,text:word.text.trim(),reason:'low-model-word-probability',probability:word.probability});
      if(segment.noSpeechProbability>0.6||segment.avgLogprob< -1)hints.push({segment:index,start:segment.start,end:segment.end,text:segment.text,reason:'weak-model-segment-confidence'});
      return hints;
    });
    const transcript={...files.transcript,status:'draft-needs-review',source:{filename:path.basename(source),sha256:await hashFile(source),duration},requestedLanguage:language,createdAt:new Date().toISOString(),reviewHints,reviewHintMethod:'Heuristic flags only: word probability < 0.6, segment avgLogprob < -1, or noSpeechProbability > 0.6. These are not correctness scores; unflagged text also needs review.',alignment:{method:'local-asr',lineTiming:'model-estimated',wordTiming:'model-estimated-cross-attention',humanReviewed:false,warning:'Singing, backing vocals, instrumental passages and languages can cause missing or invented text. Review against the actual audio before creating an MV.'}};
    await Promise.all([writeFile(path.join(stage,'lyrics.lrc'),files.lrc),writeFile(path.join(stage,'lyrics.srt'),files.srt),writeFile(path.join(stage,'lyrics.txt'),files.txt),writeJSON(path.join(stage,'transcription.json'),transcript),writeJSON(path.join(stage,'state.json'),{status:'draft-needs-review',workflow:'audio-to-lrc',transcription:'transcription.json',next:'Listen to the audio and correct text and timing. Then use lyrics.lrc with init. The original audio was read only.'})]);
    await rm(backendFile);
    // Do not use rename-overwrite semantics on an existing empty directory.
    await mkdir(destination);
    try{for(const name of await readdir(stage))await rename(path.join(stage,name),path.join(destination,name));}catch(error){await rm(destination,{recursive:true,force:true});throw error;}
    return {directory:destination,status:'draft-needs-review',duration,segments:files.transcript.segments.length,language:files.transcript.language,model,lrc:path.join(destination,'lyrics.lrc'),note:'Actual local ASR timestamps, requiring listening and correction. Source audio preserved; no credentials required.'};
  }finally{await rm(stage,{recursive:true,force:true});}
}
