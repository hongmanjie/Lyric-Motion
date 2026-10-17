import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir,lstat,readdir,readFile,copyFile,writeFile,rename,rm} from 'node:fs/promises';
import {loadProject} from './project.mjs';
import {exportSubtitles} from './render.mjs';
import {inside,run} from './paths.mjs';

const generated=new Set(['qa','renders','delivery','node_modules']);
const safeName=value=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(value)&&value!=='.'&&value!=='..';
const exists=async file=>lstat(file).catch(error=>{if(error.code==='ENOENT')return null;throw error});
async function digest(file){const hash=createHash('sha256');for await(const b of createReadStream(file))hash.update(b);return hash.digest('hex')}
async function regular(root,relative){const file=path.resolve(root,relative);if(!inside(root,file))throw Error('Delivery file escapes project');let current=root;for(const part of path.relative(root,file).split(path.sep)){current=path.join(current,part);if((await lstat(current)).isSymbolicLink())throw Error('Delivery cannot include linked files or directories')}if(!(await lstat(file)).isFile())throw Error('Delivery source must be a regular file');return file}
async function sources(root,relative='',files=[]){for(const name of (await readdir(path.join(root,relative))).sort()){
 if(name.startsWith('.')||name==='node_modules'||(!relative&&generated.has(name)))continue;
 const child=path.join(relative,name),file=path.join(root,child),stat=await lstat(file);
 if(stat.isSymbolicLink())throw Error('Delivery source contains a link: '+child);
 if(stat.isDirectory())await sources(root,child,files);else if(stat.isFile())files.push(child.replaceAll('\\','/'));else throw Error('Unsupported project source: '+child);
 }return files}

/** A local handoff, not a public release: preserve the current movie and editable source together. */
export async function deliverProject(directory,{render,name='final'}={}){
 if(!safeName(render)||!safeName(name))throw Error('Delivery needs safe render/name identifiers (without .mp4)');
 const {root,project}=await loadProject(directory),movie=await regular(root,'renders/'+render+'.mp4'),metadataFile=await regular(root,'renders/'+render+'.mp4.json');
 const metadata=JSON.parse(await readFile(metadataFile,'utf8'));
 if(metadata.width!==project.width||metadata.height!==project.height||metadata.fps!==project.fps||!Number.isFinite(metadata.duration)||metadata.duration<=0||metadata.frames!==Math.round(metadata.duration*project.fps))throw Error('Render metadata does not match the project');
 if(metadata.audioSHA256!==await digest(await regular(root,project.audio))||metadata.timelineSHA256!==await digest(await regular(root,project.timeline)))throw Error('Audio or lyric timeline changed since this render; render the current revision first');
 const parent=path.join(root,'delivery'),destination=path.join(parent,name);
 if(await exists(parent)){if((await lstat(parent)).isSymbolicLink())throw Error('Delivery directory cannot be a link')}
 if(await exists(destination))throw Error('Delivery exists; preserve it and choose a new --name');
 const files=await sources(root),review=[];
 for(const file of ['qa/review.md','qa/review.json'])if(await exists(path.join(root,file))){await regular(root,file);review.push(file)}
 await mkdir(parent,{recursive:true});const staging=path.join(parent,'.stage-'+randomUUID());await mkdir(staging);
 try{
  const manifestFiles=[];
  async function copy(source,relative){const out=path.join(staging,relative);await mkdir(path.dirname(out),{recursive:true});await copyFile(source,out);const info=await lstat(out);manifestFiles.push({path:relative,bytes:info.size,sha256:await digest(out)})}
  for(const file of [...files,...review])await copy(await regular(root,file),'project/'+file);
  await copy(movie,'video.mp4');await copy(metadataFile,'render.json');
  // Generate from the render-verified timeline, never copy an unrelated older SRT.
  const subtitles=await exportSubtitles(root,{out:path.join(staging,'captions.srt')});
  if(subtitles.file)manifestFiles.push({path:'captions.srt',bytes:(await lstat(subtitles.file)).size,sha256:await digest(subtitles.file)});
  await writeFile(path.join(staging,'README.md'),'# Local MV delivery\n\nvideo.mp4 is the selected rendered revision. project/ contains the editable artwork and its original inputs. project.tar.gz is the same source folder as a portable archive.\n\nOpen the source folder with Lyric Motion: node /path/to/toolkit/tools/cli.mjs preview --project /path/to/project\n\nGenerated prior renders, installed dependencies and hidden configuration are excluded. Framework projects may need their documented dependencies installed. Review coverage is only what project/qa/review.* actually records; packaging does not perform visual or audio review. This local delivery does not publish the song or grant recording rights.\n');
  const archive=path.join(staging,'project.tar.gz');await run('tar',['-czf',archive,'-C',staging,'project']);manifestFiles.push({path:'project.tar.gz',bytes:(await lstat(archive)).size,sha256:await digest(archive)});
  const manifest={version:1,title:project.title,render,range:{start:metadata.start,duration:metadata.duration},width:metadata.width,height:metadata.height,fps:metadata.fps,frames:metadata.frames,sourceFiles:files.length,review:review.length?'included-see-records':'not-recorded',publicUpload:false,files:manifestFiles};
  await writeFile(path.join(staging,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');await rename(staging,destination);
  return {directory:destination,video:path.join(destination,'video.mp4'),project:path.join(destination,'project'),archive:path.join(destination,'project.tar.gz'),sourceFiles:files.length,review:manifest.review,publicUpload:false};
 }finally{if(!inside(parent,staging)||!path.basename(staging).startsWith('.stage-'))throw Error('Unexpected delivery staging path');await rm(staging,{recursive:true,force:true})}
}
