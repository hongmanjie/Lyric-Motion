// Prepare two independent studies; the agent creates each artwork for the current song.
import path from 'node:path';
import {mkdir,mkdtemp,copyFile,readFile,writeFile,stat,rename,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {REPO_ROOT,json,probe,run,writeJSON,timecode,inside} from '../lib/paths.mjs';
import {normalizeTimeline,validate} from '../lib/project.mjs';

export const STYLE_IDS=['painted-story','rhythmic-type'];
const PUBLIC_CUES=[
  ['BREAK THROUGH THE NOISE','NOISE','Find your own rhythm in the noise.','pressure',['BREAK THROUGH','THE','NOISE']],
  ['MAKE TOMORROW BRIGHT','BRIGHT','Open a brighter possibility.','open',['MAKE','TOMORROW','BRIGHT']],
  ['DIVE INTO THE NIGHT','NIGHT','Let the motion take you deeper.','fall',['DIVE','INTO','THE NIGHT']],
  ['TAKE MY HAND','HAND','One gesture changes the direction.','reach',['TAKE','MY','HAND']],
];
const MARKS=[0,3.969,7.585,11.313,14.3];

/** Shared excerpt preparation. It does not analyze, transcribe, or invent alignment. */
export async function makeStyleExamples({audio,timeline:timelineFile,out,start=0,duration,publicDemo=false,captionFont,focus=[]}={}){
  if(!out)throw new Error('Choose a new --out directory');const destination=path.resolve(out);let root=destination;
  if(await stat(destination).catch(()=>null))throw new Error('Style example output exists; choose a new directory');
  let timeline,source;
  if(publicDemo){
    audio=path.join(REPO_ROOT,'examples/demo/assets/audio.wav');duration=14.3;start=0;
    timeline={duration,language:'en',alignment:{quality:'editorial',source:'original-authored-cues',vocals:false},beats:Array.from({length:29},(_,i)=>i*.5),lines:PUBLIC_CUES.map(([text,hero,subtitle,action,groups],i)=>({id:`cue-${i+1}`,text,focus:hero,subtitle,action,start:MARKS[i],end:MARKS[i+1],tokens:[],cues:groups.map((value,k)=>({text:value,action,start:MARKS[i]+(MARKS[i+1]-MARKS[i])*k/groups.length,end:MARKS[i]+(MARKS[i+1]-MARKS[i])*(k+1)/groups.length}))}))};
    source={kind:'original-instrumental',notes:'Original procedural instrumental excerpt, 14.3 seconds with a short audio fade-out. Original authored editorial phrases and motion cues; no vocals or automatic alignment.'};
  }else{
    if(!audio||!timelineFile)throw new Error('Supply --audio and an existing timed --timeline');
    const input=normalizeTimeline(await json(path.resolve(timelineFile)));
    const media=await probe(path.resolve(audio));if(!media.streams.some(s=>s.codec_type==='audio'))throw new Error('Source has no audio stream');
    const total=Math.min(input.duration,Number(media.format.duration));duration??=total-start;
    if(!Number.isFinite(start)||!Number.isFinite(duration)||start<0||duration<=0||start+duration>total+.001)throw new Error('Excerpt exceeds source media');
    duration=Math.floor(duration*30+1e-7)/30;
    const lines=input.lines.filter(l=>l.start<start+duration&&l.end>start).map((l,i)=>({
      id:l.id,text:l.text,focus:focus[i]||l.focus||l.accent||l.emphasis?.[0],
      action:l.action,
      start:Math.max(0,l.start-start),end:Math.min(duration,l.end-start),
      translations:l.translations||(l.zh?{'zh-CN':l.zh}:undefined),
      tokens:(l.tokens||[]).filter(token=>token.start<start+duration&&(token.end===undefined?token.start>=start:token.end>start)).map(token=>({...token,start:Math.max(0,token.start-start),...(token.end===undefined?{}:{end:Math.min(duration,token.end-start)})})),
      cues:l.cues?.filter(cue=>cue.start<start+duration&&cue.end>start).map(cue=>({...cue,start:Math.max(0,cue.start-start),end:Math.min(duration,cue.end-start)})),
    }));
    if(!lines.length)throw new Error('Excerpt has no timed lyric lines');
    timeline={duration,language:input.language,alignment:{quality:'supplied-line-timed',source:'provided-timeline',tokenTiming:'supplied, not independently aligned',inputProvenance:input.alignment},beats:(input.beats||[]).filter(b=>b>=start&&b<start+duration).map(b=>b-start),lines};
    source={kind:'user-supplied-media',sourceAudio:path.basename(audio),sourceTimeline:path.basename(timelineFile),range:{start,end:start+duration},originalTrackRange:input.segStart===undefined?undefined:{start:input.segStart+start,end:input.segStart+start+duration},publicRedistribution:'not-assumed'};
  }
  const project={title:'Style comparison',width:1920,height:1080,fps:30,duration,previewDuration:Math.min(15,duration),audio:'assets/audio.wav',timeline:'timeline.json',artwork:'artwork.js',readyToRender:false,fonts:{sans:'/assets/display.ttf',serif:'/assets/serif.ttf',caption:'/assets/caption.ttf'}};
  validate(project,timeline);
  const serif=path.join(REPO_ROOT,'examples/style-assets/fonts/serif.ttf'),sans=path.join(REPO_ROOT,'examples/demo/assets/display.ttf');
  for(const file of [audio,serif,sans,captionFont||sans])if(!(await stat(path.resolve(file))).isFile())throw new Error('Required source asset is not a file');
  for(const id of STYLE_IDS)for(const file of ['profile.json','prompt.md'])await stat(path.join(REPO_ROOT,`examples/styles/${id}/${file}`));
  for(const file of ['examples/style-assets/fonts/OFL-serif.txt','examples/demo/assets/OFL.txt','templates/artwork.js'])await stat(path.join(REPO_ROOT,file));
  const parent=path.dirname(destination);await mkdir(parent,{recursive:true});
  root=await mkdtemp(path.join(parent,'.lyric-motion-styles-'));
  try{
  await mkdir(path.join(root,'assets'));
  await run(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-ss',String(start),'-i',path.resolve(audio),'-t',String(duration),'-af',publicDemo?`afade=t=out:st=${duration-.12}:d=0.12`:'anull','-ar','44100','-ac','2','-c:a','pcm_s16le',path.join(root,'assets/audio.wav')]);
  await writeJSON(path.join(root,'timeline.json'),timeline);await writeJSON(path.join(root,'source.json'),source);
  for(const id of STYLE_IDS){
    const dir=path.join(root,id);await mkdir(path.join(dir,'assets'),{recursive:true});await mkdir(path.join(dir,'config'));
    await mkdir(path.join(dir,'style'));
    for(const [from,to] of [[path.join(root,'assets/audio.wav'),'audio.wav'],[sans,'display.ttf'],[serif,'serif.ttf'],[captionFont||sans,'caption.ttf']])await copyFile(from,path.join(dir,'assets',to));
    await copyFile(path.join(REPO_ROOT,'examples/style-assets/fonts/OFL-serif.txt'),path.join(dir,'assets/OFL-serif.txt'));
    await copyFile(path.join(REPO_ROOT,'examples/demo/assets/OFL.txt'),path.join(dir,'assets/OFL-sans.txt'));
    await copyFile(path.join(REPO_ROOT,'templates/artwork.js'),path.join(dir,'artwork.js'));
    await copyFile(path.join(REPO_ROOT,`examples/styles/${id}/profile.json`),path.join(dir,'style/style-profile.json'));
    await copyFile(path.join(REPO_ROOT,`examples/styles/${id}/prompt.md`),path.join(dir,'style/style-prompt.md'));
    await writeJSON(path.join(dir,'config/project.json'),{...project,title:`Lyric Motion · ${id}`});
    await writeJSON(path.join(dir,'timeline.json'),timeline);await writeJSON(path.join(dir,'source.json'),source);
    const captions=timeline.lines.map((l,i)=>`${i+1}\n${timecode(l.start)} --> ${timecode(l.end)}\n${l.translations?.['zh-CN']||l.subtitle||l.text}\n`).join('\n');await writeFile(path.join(dir,'captions.srt'),'\uFEFF'+captions);
  }
  await rename(root,destination);
  return {directory:destination,duration,styles:STYLE_IDS,source};
  }finally{if(inside(parent,root)&&path.basename(root).startsWith('.lyric-motion-styles-'))await rm(root,{recursive:true,force:true});}
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const options={};try{for(let i=2;i<process.argv.length;i++){const key=process.argv[i];if(key==='--public-demo')options.publicDemo=true;else if(['--audio','--timeline','--out','--start','--duration','--caption-font'].includes(key)){const value=process.argv[++i];if(!value||value.startsWith('--'))throw new Error(`${key} needs a value`);options[{'--caption-font':'captionFont'}[key]||key.slice(2)]=['--start','--duration'].includes(key)?Number(value):value;}else throw new Error(`Unknown option: ${key}`);}console.log(JSON.stringify(await makeStyleExamples(options),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
}
