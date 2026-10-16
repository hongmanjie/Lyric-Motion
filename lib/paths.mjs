import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {realpath,readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {spawn} from 'node:child_process';
export const REPO_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const json=async file=>JSON.parse((await readFile(file,'utf8')).replace(/^\uFEFF/,''));
export function inside(root,file){const rel=path.relative(path.resolve(root),path.resolve(file));return rel!==''&&!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel);}
export function projectPath(root,relative){
  if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||/^[A-Za-z]:|^[/\\]|[\u0000-\u001f]/.test(relative))throw new Error('Expected a project-relative path');
  const resolved=path.resolve(root,relative);if(!inside(root,resolved))throw new Error('Path escapes the project');return resolved;
}
export async function existingPath(root,relative){const file=await realpath(projectPath(root,relative)),base=await realpath(root);if(!inside(base,file))throw new Error('Resolved path escapes the project');return file;}
export async function writeJSON(file,data){await mkdir(path.dirname(file),{recursive:true});const tmp=file+`.tmp-${process.pid}`;await writeFile(tmp,JSON.stringify(data,null,2)+'\n');await rename(tmp,file);}
export function run(command,args,{cwd,limit=8_000_000}={}){return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{cwd,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='',error='',failed=false;
  const collect=(current,chunk)=>{const next=current+chunk;if(next.length>limit&&!failed){failed=true;child.kill();reject(new Error('Tool output exceeded limit'));}return next.slice(-limit);};
  child.stdout.on('data',b=>output=collect(output,b));child.stderr.on('data',b=>error=collect(error,b));child.on('error',reject);child.on('close',code=>code===0?resolve(output):reject(new Error(`${command} exited ${code}: ${error.slice(-2000)}`)));
});}
export async function probe(file){return JSON.parse(await run(process.env.FFPROBE_PATH||'ffprobe',['-v','error','-show_format','-show_streams','-of','json',file]));}
export function timecode(seconds){const n=Math.round(seconds*1000),ms=n%1000,s=Math.floor(n/1000)%60,m=Math.floor(n/60000)%60,h=Math.floor(n/3600000);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`;}
