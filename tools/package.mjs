import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,lstat,readdir,readFile,writeFile,rename,rm} from 'node:fs/promises';
import {REPO_ROOT,inside,writeJSON,run} from '../lib/paths.mjs';
import {collectInstallSources,excludedPackagePath} from './install.mjs';
const PUBLIC_PATHS=['README.md','README.zh-CN.md','LICENSE','THIRD_PARTY_NOTICES.md','CONTRIBUTING.md','CHANGELOG.md','AGENTS.md','CLAUDE.md','.gitignore','.gitattributes','.github','docs','test','examples/contracts'];
async function walk(relative,files){
  if(excludedPackagePath(relative))return;const file=path.join(REPO_ROOT,relative),info=await lstat(file);if(info.isSymbolicLink())throw new Error(`Public source symlink: ${relative}`);
  if(info.isDirectory())for(const child of (await readdir(file)).sort())await walk(path.join(relative,child),files);
  else if(info.isFile())files.push({source:file,destination:relative.replaceAll('\\','/')});
}
export async function packageRelease({out}={}){
  const destination=path.resolve(out||path.join(REPO_ROOT,'release/lyric-motion'));
  if(!inside(path.join(REPO_ROOT,'release'),destination))throw new Error('Release output must be a child of this repository\'s release/ directory');
  if(await lstat(destination).catch(()=>null))throw new Error('Release directory already exists. Choose a new --out release/NAME.');
  const archive=destination+'.tar.gz';
  if(await lstat(archive).catch(()=>null))throw new Error('Release archive already exists. Choose a new --out release/NAME.');
  // Refuse directory links in the output chain, including a linked release/ parent.
  for(let current=path.dirname(destination);inside(REPO_ROOT,current);current=path.dirname(current)){
    const info=await lstat(current).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
    if(info?.isSymbolicLink())throw new Error('Release output cannot pass through a directory link');
  }
  const install=await collectInstallSources(REPO_ROOT),files=install.map(f=>({source:f.source,destination:f.destination.startsWith('toolkit/')?f.destination.slice(8):`skills/lyric-motion/${f.destination}`}));
  for(const relative of PUBLIC_PATHS)await walk(relative,files);
  const byPath=new Map();for(const file of files){if(!/^[\x20-\x7e]+$/.test(file.destination))throw new Error(`Non-ASCII public filename: ${file.destination}`);if(file.destination.split('/').some(s=>['projects','input','output','qa','renders','.env'].includes(s)))throw new Error(`Private path in public package: ${file.destination}`);byPath.set(file.destination,file);}
  const parent=path.dirname(destination);await mkdir(parent,{recursive:true});const staging=path.join(parent,`.lyric-motion-stage-${randomUUID()}`);await mkdir(staging);const manifest=[];
  try{for(const file of [...byPath.values()].sort((a,b)=>a.destination.localeCompare(b.destination))){const bytes=await readFile(file.source);const output=path.join(staging,file.destination);if(!inside(staging,output))throw new Error('Invalid archive path');await mkdir(path.dirname(output),{recursive:true});await writeFile(output,bytes,{flag:'wx'});manifest.push({path:file.destination,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
    await writeJSON(path.join(staging,'release-manifest.json'),{format:1,files:manifest,note:'Public allowlist. User projects, original private song, reference footage and generated QA are excluded.'});await rename(staging,destination);
  }finally{if(inside(parent,staging)&&path.basename(staging).startsWith('.lyric-motion-stage-'))await rm(staging,{recursive:true,force:true});}
  try{await run('tar',['-czf',archive,'-C',parent,path.basename(destination)]);}catch(e){throw new Error(`Release folder created at ${destination}; tar archive failed: ${e.message}`);}
  return {directory:destination,archive,fileCount:manifest.length,bytes:manifest.reduce((n,f)=>n+f.size,0)};
}
