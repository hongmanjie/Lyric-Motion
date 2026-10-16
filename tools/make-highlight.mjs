import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,stat,rename,rm,copyFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {REPO_ROOT,json,probe,run,writeJSON} from '../lib/paths.mjs';

// Frame-exact editorial montage of the original public demonstrations only.
// Eight-frame transitions are centered on 5, 10 and 15 seconds of a 120 BPM score.
const FPS=30,DURATION=20,FRAMES=FPS*DURATION,BLEND_FRAMES=8;
const CLIPS=[
 {id:'playground',sourceStartFrame:0,frames:154,transition:'smoothleft'},
 {id:'poetry',sourceStartFrame:105,frames:158,transition:'fade'},
 {id:'sculpture',sourceStartFrame:210,frames:158,transition:'circleopen'},
 {id:'storybook',sourceStartFrame:275,frames:154},
];
const hash=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
const rate=text=>{const [n,d=1]=String(text).split('/').map(Number);return n/d;};

export async function makeHighlight(){
 const directory=path.join(REPO_ROOT,'docs/media/highlight'),styles=path.join(REPO_ROOT,'docs/media/styles');
 const provenance=await json(path.join(styles,'manifest.json'));
 if(provenance.provenance?.kind!=='original-instrumental')throw new Error('Highlight requires the original public showcase, never a private user-song study.');
 const inputs=CLIPS.map(clip=>path.join(styles,clip.id,'demo.mp4'));
 const score=path.join(REPO_ROOT,'examples/demo/assets/audio.wav');
 const sources=[];
 for(const [i,file] of inputs.entries()){
  const metadata=await probe(file),video=metadata.streams.find(stream=>stream.codec_type==='video');
  if(!video||video.width!==1920||video.height!==1080||Math.abs(rate(video.avg_frame_rate)-FPS)>.001)throw new Error(`${CLIPS[i].id}: expected 1920x1080 at 30 fps`);
  if(Number(video.duration||metadata.format.duration)<(CLIPS[i].sourceStartFrame+CLIPS[i].frames)/FPS-.001)throw new Error(`${CLIPS[i].id}: source does not cover the selected excerpt`);
  sources.push({...CLIPS[i],source:`docs/media/styles/${CLIPS[i].id}/demo.mp4`,sourceSHA256:await hash(file),sourceStart:CLIPS[i].sourceStartFrame/FPS,sourceEnd:(CLIPS[i].sourceStartFrame+CLIPS[i].frames)/FPS});
 }
 const scoreInfo=await probe(score);
 if(!scoreInfo.streams.some(stream=>stream.codec_type==='audio')||Math.abs(Number(scoreInfo.format.duration)-16)>.002)throw new Error('Expected the original 16-second procedural score.');
 await mkdir(directory,{recursive:true});
 const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg',temporary=path.join(directory,`highlight.partial-${randomUUID()}.mp4`),output=path.join(directory,'demo.mp4');
 let totalFrames=CLIPS[0].frames;
 const filters=CLIPS.map((clip,i)=>`[${i}:v]fps=${FPS},trim=start_frame=${clip.sourceStartFrame}:end_frame=${clip.sourceStartFrame+clip.frames},setpts=PTS-STARTPTS,settb=1/${FPS},format=yuv420p[v${i}]`);
 let before='v0';
 const transitions=[];
 for(let i=1;i<CLIPS.length;i++){
  const at=(totalFrames-BLEND_FRAMES)/FPS,next=`mix${i}`,duration=BLEND_FRAMES/FPS;
  filters.push(`[${before}][v${i}]xfade=transition=${CLIPS[i-1].transition}:duration=${duration}:offset=${at}[${next}]`);
  transitions.push({start:at,end:at+duration,center:at+duration/2,kind:CLIPS[i-1].transition});
  before=next;totalFrames+=CLIPS[i].frames-BLEND_FRAMES;
 }
 if(totalFrames!==FRAMES)throw new Error('Highlight plan must contain exactly 600 frames.');
 filters.push(`[${before}]fps=${FPS},format=yuv420p[video]`);
 filters.push(`[4:a]atrim=duration=${DURATION},asetpts=PTS-STARTPTS,afade=t=out:st=19.65:d=0.35[audio]`);
 try{
  await run(ffmpeg,['-hide_banner','-loglevel','error','-y',...inputs.flatMap(file=>['-i',file]),'-stream_loop','-1','-i',score,
   '-filter_complex',filters.join(';'),'-map','[video]','-map','[audio]','-frames:v',String(FRAMES),'-t',String(DURATION),'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',temporary]);
  const media=await probe(temporary),video=media.streams.find(stream=>stream.codec_type==='video'),audio=media.streams.find(stream=>stream.codec_type==='audio');
  if(!video||!audio||Number(video.nb_frames)!==FRAMES||Math.abs(Number(video.duration)-DURATION)>.002||Math.abs(Number(media.format.duration)-DURATION)>.05)throw new Error('Encoded highlight failed frame count or duration verification.');
  await rename(temporary,output);
 }finally{if(await stat(temporary).catch(()=>null))await rm(temporary);}
 // Ordered dither keeps flat edges clean and avoids excessive grain in the inline preview.
 let colors=96;
 const gif=path.join(directory,'demo.gif');
 for(const count of [96,80,64]){
  colors=count;
  await run(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',output,'-filter_complex',`[0:v]fps=10,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff:max_colors=${count}[p];[b][p]paletteuse=dither=bayer:bayer_scale=3`,'-loop','0',gif]);
  if((await stat(gif)).size<10_000_000)break;
 }
 if((await stat(gif)).size>=10_000_000)throw new Error('Inline GIF exceeds the 10 MB budget.');
 const reviewFrames=[{file:'frame-01.png',time:2.6},{file:'frame-02.png',time:7.3},{file:'frame-03.png',time:12.6},{file:'frame-04.png',time:18.5}];
 for(const frame of reviewFrames)await run(ffmpeg,['-hide_banner','-loglevel','error','-y','-ss',String(frame.time),'-i',output,'-frames:v','1',path.join(directory,frame.file)]);
 await copyFile(path.join(directory,'frame-01.png'),path.join(directory,'poster.png'));
 const files=[];
 for(const name of ['demo.mp4','demo.gif','poster.png',...reviewFrames.map(frame=>frame.file)])files.push({name,bytes:(await stat(path.join(directory,name))).size,sha256:await hash(path.join(directory,name))});
 const manifest={format:1,duration:DURATION,width:1920,height:1080,fps:FPS,frames:FRAMES,sources,transitions,
  audio:{source:'examples/demo/assets/audio.wav',sourceSHA256:await hash(score),sourceDuration:16,method:'One original procedural instrumental stream: 16 seconds plus its first 4 seconds repeated; final 0.35-second fade. No source-video audio is used.',vocals:false},
  gif:{width:800,height:450,fps:10,colors,loop:true,silent:true},posterTime:reviewFrames[0].time,reviewFrames,files,
  review:{fullSizeFrames:'pending',continuousPlayback:'pending',subjectiveListening:'not-claimed'},
  provenance:'Original public demonstration artwork, original graphic copy and procedural instrumental only. No user song, supplied lyric translation or reference footage.'};
 await writeJSON(path.join(directory,'manifest.json'),manifest);
 return {directory,duration:DURATION,frames:FRAMES,gifBytes:(await stat(gif)).size,files:files.map(file=>file.name)};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){try{console.log(JSON.stringify(await makeHighlight(),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
