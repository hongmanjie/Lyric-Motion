import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,writeFile,readFile,rm,stat} from 'node:fs/promises';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {deliverProject} from '../lib/delivery.mjs';

const mediaAvailable=[['ffmpeg',['-version']],['tar',['--version']]].every(([command,args])=>spawnSync(command,args,{windowsHide:true}).status===0);
const hash=b=>createHash('sha256').update(b).digest('hex');
async function fixture(t){
 const parent=path.resolve('qa/test-tmp');await mkdir(parent,{recursive:true});const root=await mkdtemp(path.join(parent,'delivery-'));t.after(()=>rm(root,{recursive:true,force:true}));
 for(const dir of ['config','assets','input/audio','renders','qa','node_modules'])await mkdir(path.join(root,dir),{recursive:true});
 const audio=await readFile('examples/demo/assets/audio.wav'),timeline=Buffer.from(JSON.stringify({duration:1,beats:[],lines:[{text:'Original fixture',start:0,end:1}]}));
 await writeFile(path.join(root,'assets/audio.wav'),audio);await writeFile(path.join(root,'input/audio/示例曲.wav'),audio);await writeFile(path.join(root,'timeline.json'),timeline);
 await writeFile(path.join(root,'config/project.json'),JSON.stringify({title:'Delivery fixture',width:320,height:180,fps:30,duration:1,previewDuration:1,audio:'assets/audio.wav',timeline:'timeline.json',artwork:'artwork.js'}));
 await writeFile(path.join(root,'artwork.js'),'export const readyToRender=true;export function createArtwork(){return {render(){}}}');
 await writeFile(path.join(root,'renders/captions.srt'),'Previous edited subtitle file');
 await writeFile(path.join(root,'qa/review.md'),'Transport fixture only, no subjective review.');await writeFile(path.join(root,'qa/private-note.txt'),'Do not package');await writeFile(path.join(root,'.env'),'PRIVATE_VALUE=exclude');await writeFile(path.join(root,'node_modules/cache.bin'),'Exclude');
 execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=blue:s=320x180:r=30','-i',path.join(root,'assets/audio.wav'),'-t','1','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',path.join(root,'renders/main.mp4')],{windowsHide:true});
 await writeFile(path.join(root,'renders/main.mp4.json'),JSON.stringify({start:0,duration:1,width:320,height:180,fps:30,frames:30,audioSHA256:hash(audio),timelineSHA256:hash(timeline)}));return root;
}

test('local delivery preserves movie, multilingual original inputs and portable source; excludes other renders and private generated files',{skip:!mediaAvailable},async t=>{
 const root=await fixture(t),out=await deliverProject(root,{render:'main'}),manifest=JSON.parse(await readFile(path.join(out.directory,'manifest.json')));
 assert.deepEqual(await readFile(out.video),await readFile(path.join(root,'renders/main.mp4')));
 assert.deepEqual(await readFile(path.join(out.project,'input/audio/示例曲.wav')),await readFile(path.join(root,'assets/audio.wav')));
 assert.equal(manifest.publicUpload,false);assert.equal(manifest.review,'included-see-records');
 assert.match(await readFile(path.join(out.directory,'captions.srt'),'utf8'),/Original fixture/);
 assert.equal(await readFile(path.join(root,'renders/captions.srt'),'utf8'),'Previous edited subtitle file');
 for(const file of manifest.files)assert.equal(hash(await readFile(path.join(out.directory,file.path))),file.sha256);
 const archived=execFileSync('tar',['-tzf',out.archive],{encoding:'utf8',windowsHide:true});assert.match(archived,/project\/artwork.js/);assert.doesNotMatch(archived,/node_modules|private-note|\.env|project\/renders/);
 await assert.rejects(deliverProject(root,{render:'main'}),/Delivery exists/);
 assert.deepEqual(JSON.parse(await readFile(path.join(out.directory,'manifest.json'))),manifest);
});

test('instrumental delivery excludes stale vocal subtitles while keeping the previous file intact',{skip:!mediaAvailable},async t=>{
 const root=await fixture(t),timeline=Buffer.from(JSON.stringify({duration:1,content:{kind:'instrumental'},alignment:{quality:'not-applicable',source:'lrc'},beats:[],lines:[]}));
 await writeFile(path.join(root,'timeline.json'),timeline);
 const meta=JSON.parse(await readFile(path.join(root,'renders/main.mp4.json')));meta.timelineSHA256=hash(timeline);await writeFile(path.join(root,'renders/main.mp4.json'),JSON.stringify(meta));
 const out=await deliverProject(root,{render:'main'});
 await assert.rejects(stat(path.join(out.directory,'captions.srt')),{code:'ENOENT'});
 assert.equal(await readFile(path.join(root,'renders/captions.srt'),'utf8'),'Previous edited subtitle file');
});

test('changed lyric timing and escaping names are refused before creating a delivery',{skip:!mediaAvailable},async t=>{
 const root=await fixture(t);await writeFile(path.join(root,'timeline.json'),JSON.stringify({duration:1,beats:[],lines:[{text:'Changed line',start:.1,end:1}]}));
 await assert.rejects(deliverProject(root,{render:'main'}),/changed since this render/);
 await assert.rejects(deliverProject(root,{render:'../main'}),/safe render/);
 await assert.rejects(deliverProject(root,{render:'main',name:'../outside'}),/safe render/);
 await assert.rejects(stat(path.join(root,'delivery/final')),{code:'ENOENT'});
});
