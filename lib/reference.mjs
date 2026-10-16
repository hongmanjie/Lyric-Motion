import path from 'node:path';
import {mkdir,writeFile,stat,copyFile} from 'node:fs/promises';
import {probe,run,writeJSON} from './paths.mjs';
export async function prepareReference({video,out,start=0,duration,crop}){
  if(!video||!out)throw new Error('reference needs --video and --out');
  const input=path.resolve(video),root=path.resolve(out),media=await probe(input),stream=media.streams.find(s=>s.codec_type==='video');if(!stream)throw new Error('Reference has no video');
  const total=Number(media.format?.duration||stream.duration);duration??=total-start;
  if(!Number.isFinite(start)||!Number.isFinite(duration)||start<0||duration<=0||start+duration>total+.05)throw new Error('Reference range outside media duration');
  let region=null;if(crop){const [x,y,width,height,...rest]=crop.split(':').map(Number);if(rest.length||[x,y,width,height].some(n=>!Number.isInteger(n))||x<0||y<0||width<2||height<2||x+width>stream.width||y+height>stream.height)throw new Error('Crop must be x:y:width:height within source pixels');region={x,y,width,height};}
  if(await stat(root).catch(()=>null))throw new Error('Reference output already exists; choose a new directory');await mkdir(path.join(root,'evidence'),{recursive:true});
  const filter=[...(region?[`crop=${region.width}:${region.height}:${region.x}:${region.y}`]:[]),"scale='trunc(min(960,iw)/2)*2':-2"].join(',');
  const count=Math.min(24,Math.max(2,Math.ceil(duration/2))),frames=[];
  for(let i=0;i<count;i++){const at=start+Math.max(0,duration-.05)*i/Math.max(1,count-1),asset=`evidence/frame-${String(i+1).padStart(3,'0')}.png`;await run(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(at),'-i',input,'-vf',filter,'-frames:v','1',path.join(root,asset)]);frames.push({at:Number(at.toFixed(4)),asset});}
  await run(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(start),'-i',input,'-t',String(duration),'-vf',filter,'-map','0:v:0','-map','0:a?','-c:v','libx264','-pix_fmt','yuv420p','-preset','veryfast','-crf','24','-c:a','aac','-movflags','+faststart',path.join(root,'evidence/preview.mp4')]);
  const info={schemaVersion:'0.1.0',source:{name:path.basename(input),duration:total,width:stream.width,height:stream.height,hasAudio:media.streams.some(s=>s.codec_type==='audio')},range:{start,end:start+duration},region,frames,preview:'evidence/preview.mp4',review:{visual:'pending',audio:'not-claimed',semantics:'pending'}};
  await writeJSON(path.join(root,'reference.json'),info);await writeFile(path.join(root,'reference-findings.md'),'# Reference findings\n\nStatus: media prepared; analysis not performed.\n\nInspect the actual preview continuously and full-size frames. Separate observed behavior, semantic inferences and unknowns. Record source timestamps and the tools/coverage actually used. Do not claim listening from silent frames or signal features.\n\nAfter observation, write style-profile.json and style-prompt.md. Share principles, not source footage or its shot timing.\n');return {root,...info};
}
export function validateStyle(profile){
  if(profile.schemaVersion!=='0.1.0'||typeof profile.name!=='string'||!profile.name.trim())throw new Error('Invalid style profile version or name');
  for(const key of ['principles','typography','composition','motion','semantics','transitions','avoid'])if(!Array.isArray(profile[key])||!profile[key].length||profile[key].some(s=>typeof s!=='string'||!s.trim()))throw new Error(`Invalid style field: ${key}`);
  for(const key of ['color','rhythm'])if(profile[key]!==undefined&&(!Array.isArray(profile[key])||!profile[key].length||profile[key].some(s=>typeof s!=='string'||!s.trim())))throw new Error(`Invalid style field: ${key}`);
  for(const observation of profile.observations||[])if(observation.status==='observed'&&(!observation.evidence?.length||observation.evidence.some(e=>!Number.isFinite(e.at)||e.at<0||!e.description)))throw new Error('Observed claims need timestamped evidence');return true;
}
export async function exportStylePrompt(profile,file){validateStyle(profile);const labels={principles:'Creative principles',typography:'Typography',composition:'Composition',color:'Color',motion:'Motion',rhythm:'Rhythm',semantics:'Lyrics and meaning',transitions:'Transitions',avoid:'Avoid'};let text=`# ${profile.name}\n\n${profile.summary||''}\n\nProfile: ${profile.id||'unnamed'} · revision ${profile.revision||1}\n`;
  for(const [key,label] of Object.entries(labels))if(profile[key]?.length)text+=`\n## ${label}\n\n`+profile[key].map(s=>'- '+s).join('\n')+'\n';text+='\nUse these as transferable preferences. Recompose for the new song and user direction; do not copy reference footage, lyrics or shot times.\n';await mkdir(path.dirname(path.resolve(file)),{recursive:true});await writeFile(file,text);return {file:path.resolve(file)};
}
