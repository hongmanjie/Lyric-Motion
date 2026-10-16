import path from 'node:path';
import {mkdir,copyFile,stat,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {REPO_ROOT,json,run,writeJSON} from '../lib/paths.mjs';

// Public capture accepts only this credited, self-contained CC0 song example.
const project=path.join(REPO_ROOT,'examples/vocal-demo'),input=path.join(project,'renders/final.mp4');
const provenance=await json(path.join(project,'provenance.json'));
if(provenance.recording?.license!=='CC0-1.0'||provenance.recording.sha256!=='91e0fe21e4a046bf6c3885b87e317c4b17596b91387ac42cc073e7737ddc6d7d')throw Error('Unexpected public vocal source');
const metadata=await json(input+'.json');
if(metadata.duration!==20||metadata.frames!==600)throw Error('Render the 20-second vocal example first');
const directory=path.join(REPO_ROOT,'docs/media/vocal');await mkdir(directory,{recursive:true});
await copyFile(input,path.join(directory,'demo.mp4'));
const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg',posterTime=18.5;
await run(ffmpeg,['-hide_banner','-loglevel','error','-y','-ss',String(posterTime),'-i',input,'-frames:v','1',path.join(directory,'poster.png')]);
const files=[];for(const name of ['demo.mp4','poster.png']){const file=path.join(directory,name),bytes=await readFile(file);files.push({name,bytes:(await stat(file)).size,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeJSON(path.join(directory,'manifest.json'),{format:1,source:'examples/vocal-demo',...metadata,posterTime,files,provenance,review:'See review.json for actual visual/playback coverage; metadata is not a listening claim.'});
console.log(JSON.stringify({directory,files},null,2));
