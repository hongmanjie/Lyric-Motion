import path from 'node:path';
import {mkdir} from 'node:fs/promises';
import {json,existingPath,probe,REPO_ROOT} from './paths.mjs';
export function normalizeTimeline(input){
  return {...input,language:input.language||'und',lines:(input.lines||[]).map((l,i)=>({...l,id:l.id??`line-${i+1}`,text:l.text??l.jp,end:l.text===undefined&&l.jp?Math.min(l.end,input.duration):l.end,tokens:l.tokens??(l.morae||[]).map(m=>({text:m.ch,start:m.at}))}))};
}
export function validate(project,timeline){
  for(const key of ['width','height','fps','duration','previewDuration'])if(!Number.isFinite(project[key])||project[key]<=0)throw new Error(`${key} must be positive`);
  for(const key of ['width','height'])if(!Number.isInteger(project[key])||project[key]%2)throw new Error(`${key} must be an even integer`);
  if(project.previewDuration>project.duration+.001)throw new Error('Preview exceeds project duration');
  if(!Number.isFinite(timeline.duration)||project.duration>timeline.duration+.05)throw new Error('Project exceeds timeline duration');
  if(!Array.isArray(timeline.lines)||!timeline.lines.length)throw new Error('Timeline has no lyrics');
  if(timeline.alignment?.quality==='unaligned')throw new Error('Lyrics need timing. Import LRC/SRT or provide alignment; plain text is not automatically aligned.');
  let previousStart=0;for(const [i,l] of timeline.lines.entries()){
    if(typeof l.text!=='string'||!l.text.trim()||!Number.isFinite(l.start)||!Number.isFinite(l.end)||l.start<0||l.end<=l.start||l.start<previousStart-.001||l.end>timeline.duration+.001)throw new Error(`Invalid or out-of-order lyric line ${i+1}`);
    if(l.start>timeline.duration+.001)throw new Error('Lyric starts after the audio');
    const tokens=l.tokens||[];if(tokens.some((token,k)=>typeof token.text!=='string'||!Number.isFinite(token.start)||token.start<l.start-.001||token.start>l.end+.001||(k&&token.start<tokens[k-1].start)))throw new Error(`Invalid token timing at line ${i+1}`);
    previousStart=l.start;
  }
  if(!Array.isArray(timeline.beats)||timeline.beats.some((b,i,a)=>!Number.isFinite(b)||(i&&b<a[i-1])))throw new Error('Invalid beat times');return true;
}
export async function loadProject(directory=path.join(REPO_ROOT,'examples/demo')){
  const root=path.resolve(directory),project=await json(await existingPath(root,'config/project.json'));
  const timeline=normalizeTimeline(await json(await existingPath(root,project.timeline)));
  validate(project,timeline);const audio=await existingPath(root,project.audio);await existingPath(root,project.artwork||'src/artwork.js');
  for(const dir of ['renders','qa'])await mkdir(path.join(root,dir),{recursive:true});
  return {root,project,timeline,audio};
}
export async function probeAudio(data){const result=await probe(data.audio);if(!result.streams.some(s=>s.codec_type==='audio')||Number(result.format?.duration)<data.project.duration-.05)throw new Error('Audio missing or shorter than project');return Number(result.format.duration);}
