import path from 'node:path';
import {mkdir,copyFile,stat} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {REPO_ROOT,json,run,writeJSON} from '../lib/paths.mjs';
import {renderVideo} from '../lib/render.mjs';
import {makeStyleExamples,STYLE_IDS} from './make-style-examples.mjs';

export async function showcaseStyles({projects=path.join(REPO_ROOT,'projects/public-kinetic-previews')}={}){
  if(!await stat(path.join(projects,'source.json')).catch(()=>null))await makeStyleExamples({publicDemo:true,out:projects});
  const source=await json(path.join(projects,'source.json'));
  if(source.kind!=='original-instrumental')throw new Error('Public showcase accepts only the original generated demonstration. Keep user-song studies private.');
  const media=path.join(REPO_ROOT,'docs/media/styles'),ffmpeg=process.env.FFMPEG_PATH||'ffmpeg',records=[];
  for(const id of STYLE_IDS){
    const project=path.join(projects,id),input=path.join(project,'renders/main.mp4'),out=path.join(media,id);
    if(!await stat(input).catch(()=>null))await renderVideo(project,{name:'main'});
    await mkdir(out,{recursive:true});await copyFile(input,path.join(out,'demo.mp4'));
    const posterTime={playground:6.3,poetry:6.5,sculpture:6.6,storybook:5.2}[id];
    if(posterTime===undefined)throw new Error(`Choose an intentional poster time for style: ${id}`);
    await run(ffmpeg,['-hide_banner','-loglevel','error','-y','-ss',String(posterTime),'-i',input,'-frames:v','1',path.join(out,'poster.png')]);
    await run(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',input,'-filter_complex','[0:v]fps=10,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff:max_colors=112[p];[b][p]paletteuse=dither=sierra2_4a','-loop','0',path.join(out,'demo.gif')]);
    const metadata=await json(input+'.json');const files=[];for(const name of ['poster.png','demo.gif','demo.mp4'])files.push({name,bytes:(await stat(path.join(out,name))).size});
    records.push({id,...metadata,posterTime,files});
  }
  const tiles=STYLE_IDS.map((id,i)=>`[${i}:v]scale=640:360:flags=lanczos[t${i}]`).join(';');
  const labels=STYLE_IDS.map((id,i)=>`[t${i}]`).join('');
  const layout=STYLE_IDS.map((id,i)=>`${i%2*640}_${Math.floor(i/2)*360}`).join('|');
  await run(ffmpeg,['-hide_banner','-loglevel','error','-y',...STYLE_IDS.flatMap(id=>['-i',path.join(media,id,'poster.png')]),'-filter_complex',`${tiles};${labels}xstack=inputs=${STYLE_IDS.length}:layout=${layout}:fill=black[v]`,'-map','[v]','-frames:v','1',path.join(media,'overview.png')]);
  await writeJSON(path.join(media,'manifest.json'),{format:1,provenance:source,notes:'Public text and procedural instrumental only. Private sung studies and lyric translations are not included. Actual visual/audio review is recorded separately.',styles:records});return {directory:media,styles:records.map(r=>({id:r.id,files:r.files}))};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){try{console.log(JSON.stringify(await showcaseStyles(),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
