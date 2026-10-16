import path from 'node:path';
import {mkdir,copyFile,stat} from 'node:fs/promises';
import {REPO_ROOT,run,writeJSON,json} from '../lib/paths.mjs';
import {renderVideo} from '../lib/render.mjs';
export async function makeShowcase(){
  const project=path.join(REPO_ROOT,'examples/demo'),source=path.join(project,'renders/main.mp4'),out=path.join(REPO_ROOT,'docs/media');
  if(!await stat(source).catch(()=>null))await renderVideo(project,{name:'main'});
  await mkdir(out,{recursive:true});await copyFile(source,path.join(out,'demo.mp4'));
  const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';
  await run(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',source,'-filter_complex','[0:v]fps=12,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff:max_colors=128[p];[b][p]paletteuse=dither=sierra2_4a','-loop','0',path.join(out,'demo.gif')]);
  for(const [name,time] of [['poster.png',5.8],['move.png',2.9],['together.png',10.4],['yours.png',14.5]])await run(ffmpeg,['-hide_banner','-loglevel','error','-y','-ss',String(time),'-i',source,'-frames:v','1',path.join(out,name)]);
  await run(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',path.join(out,'yours.png'),'-vf','scale=1136:638,pad=1280:640:(ow-iw)/2:(oh-ih)/2:color=0x17191b','-frames:v','1',path.join(out,'social-preview.png')]);
  const metadata=await json(source+'.json');const files=[];for(const name of ['demo.gif','demo.mp4','poster.png','move.png','together.png','yours.png','social-preview.png'])files.push({name,bytes:(await stat(path.join(out,name))).size});
  await writeJSON(path.join(out,'manifest.json'),{source:'examples/demo',...metadata,provenance:'Original procedural instrumental and authored text. No vocals or forced alignment. Font is Noto Sans JP under OFL.',files});return {directory:out,files};
}
