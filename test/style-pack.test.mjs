import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,readFile,writeFile,rm,rename,stat,symlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {exportStyle,getStyle} from '../lib/styles.mjs';
import {prepareProject} from '../lib/prepare.mjs';
import {readStyleAssets} from '../lib/style-pack.mjs';
import {layoutAt,cubicPoint,acousticPulse,energyAt,settle} from '../examples/styles/rhythmic-type/motion-kit.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function temporary(t){const parent=path.join(root,'qa/style-pack-tests');await mkdir(parent,{recursive:true});const dir=await mkdtemp(path.join(parent,'case-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}
const hasMedia=spawnSync(process.env.FFPROBE_PATH||'ffprobe',['-version'],{windowsHide:true}).status===0;

test('a named pack exports and imports after relocation, including its independent visual/code assets', {skip:!hasMedia},async t=>{
 const dir=await temporary(t),out=path.join(dir,'exported'),source=await getStyle(2),bundle=await exportStyle({id:2,out});
 assert.deepEqual(Object.keys(bundle.assets).sort(),['guide','motionKit','visualReference']);
 for(const asset of source.assets)assert.deepEqual(await readFile(path.join(out,asset.path)),await readFile(asset.source));
 const moved=path.join(dir,'moved');await rename(out,moved);
 const project=await prepareProject({audio:path.join(root,'examples/demo/assets/audio.wav'),lyrics:path.join(root,'examples/demo/assets/lyrics.lrc'),out:path.join(dir,'song'),styleProfile:path.join(moved,'style-profile.json'),stylePrompt:path.join(moved,'style-prompt.md')});
 assert.equal(project.request.extensions.style.source,'custom');
 assert.equal(project.request.creative.styleAssets.motionKit,'style/motion-kit.mjs');
 assert.deepEqual(await readFile(path.join(project.directory,'style/motion-kit.mjs')),await readFile(path.join(moved,'motion-kit.mjs')));
 await writeFile(path.join(project.directory,'style/guide.md'),'My new song');
 assert.notEqual(await readFile(path.join(moved,'guide.md'),'utf8'),'My new song');
 assert.equal(project.project.readyToRender,false);
 assert.doesNotMatch(JSON.stringify(project.request),new RegExp(dir.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});

test('pack path escapes, collisions and linked assets fail before creating a song',async t=>{
 const dir=await temporary(t),profile=JSON.parse(await readFile(path.join(root,'examples/styles/rhythmic-type/profile.json'))),file=path.join(dir,'profile.json');
 for(const relative of ['../outside.md','C:/outside.md','folder/../../outside.md','folder\\outside.md','style-profile.json']){
  profile.extensions.assets={guide:relative};await writeFile(file,JSON.stringify(profile));
  await assert.rejects(readStyleAssets(file),/Invalid style asset/);
 }
 const target=path.join(dir,'outside');await mkdir(target);await writeFile(path.join(target,'guide.md'),'Outside');
 try{await symlink(target,path.join(dir,'linked'),process.platform==='win32'?'junction':'dir');}catch(e){if(['EPERM','EACCES'].includes(e.code)){t.diagnostic('Link creation unavailable; traversal checks completed.');return;}throw e;}
 profile.extensions.assets={guide:'linked/guide.md'};await writeFile(file,JSON.stringify(profile));
 await assert.rejects(readStyleAssets(file),/through a link/);
 const output=path.join(dir,'blocked-song');
 await assert.rejects(prepareProject({styleProfile:file,audio:path.join(root,'examples/demo/assets/audio.wav'),lyrics:path.join(root,'examples/demo/assets/lyrics.lrc'),out:output}),/through a link/);
 await assert.rejects(stat(output),{code:'ENOENT'});
});

test('motion helpers interpolate endpoints and give identical random-order time queries',()=>{
 const points=[[0,0],[0,100],[100,100],[100,0]];
 assert.deepEqual(cubicPoint(points,0),[0,0]);assert.deepEqual(cubicPoint(points,1),[100,0]);assert.deepEqual(cubicPoint(points,.5),[50,75]);
 const before=[{x:10,y:20,size:100,alpha:1}],after=[{x:40,y:50,size:60,alpha:1},{x:400,y:100,size:200,alpha:1}];
 assert.equal(layoutAt(before,after,0)[0].x,10);assert.deepEqual(layoutAt(before,after,1),after);
 const features={step:.1,rms:[0,.5,1],onsets:[{time:.1,strength:.8},{time:.3,strength:1}]};
 const times=[.4,0,.2,.3,.1],values=times.map(time=>[energyAt(features,time),acousticPulse(features,time),settle(time)]);
 assert.deepEqual(times.map(time=>[energyAt(features,time),acousticPulse(features,time),settle(time)]),values);
 assert.equal(acousticPulse(features,.05),0);assert.equal(acousticPulse(features,.3),1);assert.ok(Math.abs(energyAt(features,.15)-.75)<1e-12);
});
