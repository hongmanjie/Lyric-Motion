// Capture two explicitly selected, reviewed renders. Never generates art or uploads media.
import path from 'node:path';
import {mkdir,mkdtemp,stat,rename,rm,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {probe,run,writeJSON,inside} from '../lib/paths.mjs';

export async function showcaseStyles({painted,rhythmic,out,paintedPoster=10.8,rhythmicPoster=9.5}={}){
  if(!painted||!rhythmic||!out)throw Error('Supply --painted RENDER.mp4 --rhythmic RENDER.mp4 --out NEW_DIR. Choose only media authorized for this destination.');
  const destination=path.resolve(out),parent=path.dirname(destination);
  if(await stat(destination).catch(()=>null))throw Error('Showcase output exists; choose a new directory.');
  const sources=[['painted-story',painted,paintedPoster],['rhythmic-type',rhythmic,rhythmicPoster]],validated=[];
  for(const [id,file,posterTime] of sources){
    const input=path.resolve(file),media=await probe(input),video=media.streams.find(s=>s.codec_type==='video');
    if(!video||!media.streams.some(s=>s.codec_type==='audio'))throw Error(id+' needs both video and audio.');
    const duration=Number(media.format.duration);
    if(!Number.isFinite(posterTime)||posterTime<0||posterTime>=duration)throw Error(id+' poster time must be inside its video.');
    validated.push({id,input,posterTime,duration});
  }
  await mkdir(parent,{recursive:true});const stage=await mkdtemp(path.join(parent,'.showcase-'));
  try{
    const records=[];
    for(const {id,input,posterTime} of validated){
      const video=path.join(stage,id+'.mp4'),poster=path.join(stage,id+'.png'),ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';
      await run(ffmpeg,['-hide_banner','-loglevel','error','-i',input,'-map','0:v:0','-map','0:a:0','-c:v','libx264','-preset','medium','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart',video]);
      await run(ffmpeg,['-hide_banner','-loglevel','error','-ss',String(posterTime),'-i',video,'-frames:v','1',poster]);
      const media=await probe(video),stream=media.streams.find(s=>s.codec_type==='video'),bytes=await readFile(video);
      records.push({id,video:id+'.mp4',poster:id+'.png',posterTime,duration:Number(media.format.duration),width:stream.width,height:stream.height,frames:Number(stream.nb_frames),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
    }
    await writeJSON(path.join(stage,'manifest.json'),{format:2,notes:'Two maintainer-selected rendered excerpts. Source recordings, full lyrics, private artwork and reference videos are excluded. Recording rights are separate from the code license.',videos:records});
    await rename(stage,destination);return {directory:destination,videos:records};
  }finally{if(inside(parent,stage)&&path.basename(stage).startsWith('.showcase-'))await rm(stage,{recursive:true,force:true});}
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const options={};try{
    for(let i=2;i<process.argv.length;i++){
      const key=process.argv[i],value=process.argv[++i];if(!['--painted','--rhythmic','--out','--painted-poster','--rhythmic-poster'].includes(key)||!value||value.startsWith('--'))throw Error('Expected --painted FILE --rhythmic FILE --out NEW_DIR [--painted-poster SEC --rhythmic-poster SEC]');
      options[{'--painted-poster':'paintedPoster','--rhythmic-poster':'rhythmicPoster'}[key]||key.slice(2)]=key.endsWith('-poster')?Number(value):value;
    }
    console.log(JSON.stringify(await showcaseStyles(options),null,2));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
