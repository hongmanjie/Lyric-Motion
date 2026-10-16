import http from 'node:http';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {existsSync,createReadStream} from 'node:fs';
import {mkdtemp,readFile,rm,stat,realpath,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {REPO_ROOT,inside,json} from '../lib/paths.mjs';
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export function findBrowser(){
  if(process.env.CHROME_PATH){if(!existsSync(process.env.CHROME_PATH))throw new Error('CHROME_PATH does not exist');return process.env.CHROME_PATH;}
  const names=process.platform==='win32'?['chrome.exe','msedge.exe']:['chromium','chromium-browser','google-chrome','google-chrome-stable'];
  const candidates=[
    'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ...(process.env.PATH||'').split(path.delimiter).flatMap(dir=>names.map(n=>path.join(dir,n)))
  ];
  const found=candidates.find(f=>existsSync(f));if(!found)throw new Error('Chrome/Edge/Chromium not found. Set CHROME_PATH to its executable.');return found;
}
export async function serve(projectRoot,port=0){
  const root=await realpath(projectRoot),runtime=await realpath(path.join(REPO_ROOT,'src'));
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.mp3':'audio/mpeg','.wav':'audio/wav','.flac':'audio/flac','.ogg':'audio/ogg','.aac':'audio/aac','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.woff':'font/woff','.mp4':'video/mp4','.webm':'video/webm','.srt':'text/plain; charset=utf-8'};
  const server=http.createServer(async(req,res)=>{
    try{
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return;}
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(pathname==='/__api/project'){
        const project=await json(path.join(root,'config/project.json'));
        const renders=(await readdir(path.join(root,'renders')).catch(()=>[])).filter(f=>f.endsWith('.mp4')).sort().reverse();
        res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({title:project.title,renders}));return;
      }
      const local=pathname==='/'?'__runtime/index.html':pathname==='/player'?'__runtime/player.html':pathname.slice(1);
      const isRuntime=local.startsWith('__runtime/'),base=isRuntime?runtime:root,relative=isRuntime?local.slice(10):local;
      if(relative.split(/[\\/]/).some(s=>s.startsWith('.'))){res.writeHead(403).end();return;}
      let file=path.resolve(base,relative);if(!inside(base,file)){res.writeHead(403).end();return;}
      file=await realpath(file);if(!inside(base,file)){res.writeHead(403).end();return;}
      const info=await stat(file);if(!info.isFile()){res.writeHead(404).end();return;}
      const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'};
      let start=0,end=info.size-1,status=200;
      if(req.headers.range){
        const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}
        if(match[1]){start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;}else start=Math.max(0,info.size-Number(match[2]));
        if(start>end||start>=info.size||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}
        status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
      }
      headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);if(req.method==='HEAD'||!info.size){res.end();return;}
      const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
    }catch{if(!res.headersSent)res.writeHead(404);res.end('Not found');}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  return {url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);})};
}
export async function openBrowser(url,width,height){
  const executable=findBrowser(),profile=await mkdtemp(path.join(tmpdir(),'lyric-motion-'));
  const child=spawn(executable,['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--hide-scrollbars','--mute-audio','--force-device-scale-factor=1','--enable-unsafe-swiftshader','about:blank'],{windowsHide:true,stdio:'ignore'});
  let launchError,ws;child.on('error',e=>launchError=e);const pending=new Map(),errors=[];let id=0;
  const close=async()=>{ws?.close();child.kill();for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('Browser closed'));}pending.clear();await sleep(300);if(path.dirname(profile)!==tmpdir()||!path.basename(profile).startsWith('lyric-motion-'))throw new Error('Unexpected temporary browser path');await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:300}).catch(()=>{});};
  try{
    const deadline=Date.now()+30000;let port;
    while(Date.now()<deadline){if(launchError)throw launchError;try{port=Number((await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);if(port)break;}catch{}await sleep(100);}
    if(!port)throw new Error('Browser startup timed out');
    const targets=await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(10000)}).then(r=>r.json()),target=targets.find(t=>t.type==='page');if(!target)throw new Error('No browser page');
    ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('DevTools connection timed out')),10000);ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});ws.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('DevTools connection failed'));},{once:true});});
    ws.addEventListener('message',event=>{const msg=JSON.parse(String(event.data));if(msg.id){const p=pending.get(msg.id);if(!p)return;clearTimeout(p.timer);pending.delete(msg.id);msg.error?p.reject(new Error(msg.error.message)):p.resolve(msg.result);}if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);});
    const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id,timer=setTimeout(()=>{pending.delete(key);reject(new Error(`${method} timed out`));},30000);pending.set(key,{resolve,reject,timer});ws.send(JSON.stringify({id:key,method,params}));});
    const evaluate=async(expression,{userGesture=false}={})=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;};
    await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url});
    let ready=false;for(let i=0;i<150;i++){if(await evaluate('typeof window.__ready !== "undefined"')){ready=true;break;}if(errors.length)throw new Error(errors.join('\n'));await sleep(100);}if(!ready)throw new Error('Page did not expose __ready');
    await evaluate('window.__ready');await evaluate('document.fonts.ready.then(()=>true)');await evaluate('window.__freeze()');
    return {evaluate,errors,close,screenshot:async(format='png')=>Buffer.from((await send('Page.captureScreenshot',{format,...(format==='jpeg'?{quality:94}:{}),captureBeyondViewport:false,fromSurface:true})).data,'base64')};
  }catch(e){await close();throw e;}
}
