import path from 'node:path';
import {writeFile,readFile,mkdir,rename,unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {serve,openBrowser} from '../tools/browser.mjs';
import {loadProject,probeAudio} from './project.mjs';
import {writeJSON,run,timecode} from './paths.mjs';
const digest=data=>createHash('sha256').update(data).digest('hex');
export async function withArtwork(directory,draft,fn){
  const data=await loadProject(directory);await probeAudio(data);const p=data.project,scale=draft?.5:1;
  const width=Math.round(p.width*scale/2)*2,height=Math.round(p.height*scale/2)*2;
  const server=await serve(data.root);let browser;
  try{browser=await openBrowser(server.url+'/?capture',width,height);const meta=await browser.evaluate('window.__meta');if(meta.width!==p.width||meta.height!==p.height||meta.fps!==p.fps||Math.abs(meta.duration-p.duration)>.001)throw new Error('Artwork metadata does not match project');return await fn({...data,browser,meta,width,height});}
  finally{await browser?.close();await server.close();}
}
export async function captureStill(directory,{time=0,out,draft=false}={}){
  return withArtwork(directory,draft,async({root,project,browser})=>{if(!Number.isFinite(time)||time<0||time>project.duration)throw new Error('Still time outside project');await browser.evaluate(`window.__seek(${time})`);if(browser.errors.length)throw new Error(browser.errors.join('\n'));const file=path.resolve(out||path.join(root,'qa',`frame-${time.toFixed(3)}.png`));await mkdir(path.dirname(file),{recursive:true});await writeFile(file,await browser.screenshot());return {file,time};});
}
export async function checkArtwork(directory){
  return withArtwork(directory,false,async({root,project:p,timeline,browser,meta,audio})=>{
    const times=new Set(Array.from({length:12},(_,i)=>Number(((p.duration-1/p.fps)*i/11).toFixed(5))));
    const samples=[...times],cuts=[...(meta.sceneCuts||[]),...timeline.lines.map(l=>l.start)];
    for(const t of cuts)for(const dt of [-1/p.fps,0,1/p.fps,.15,.4])if(t+dt>=0&&t+dt<p.duration)times.add(Number((t+dt).toFixed(5)));
    for(const t of times){await browser.evaluate(`window.__seek(${t})`);if(browser.errors.length)throw new Error(browser.errors.join('\n'));}
    const hashes=[];for(const [i,t] of samples.entries()){await browser.evaluate(`window.__seek(${t})`);const frame=await browser.screenshot();hashes.push(digest(frame));await writeFile(path.join(root,'qa',`frame-${String(i).padStart(2,'0')}.png`),frame);}
    await browser.evaluate(`window.__seek(${samples[3]})`);const first=digest(await browser.screenshot());await browser.evaluate(`window.__seek(${samples[9]})`);await browser.evaluate(`window.__seek(${samples[3]})`);const deterministic=first===digest(await browser.screenshot());
    if(!deterministic)throw new Error('Artwork depends on seek order');
    const report={readyToRender:meta.readyToRender,checkedFrames:times.size,deterministic,distinctSamples:new Set(hashes).size,sampleTimes:samples,audioSHA256:digest(await readFile(audio)),visualReview:'pending',audioReview:'not-claimed',note:'Technical check only. Inspect full-size images AND actual continuous playback before recording visual review.'};
    await writeJSON(path.join(root,'qa/technical-report.json'),report);return report;
  });
}
export async function renderVideo(directory,{start=0,duration,draft=false,name='main',sample=false,overwrite=false}={}){
  return withArtwork(directory,draft,async({root,project:p,browser,meta,audio,width,height})=>{
    if(meta.readyToRender!==true)throw new Error('Artwork is unfinished. Create original artwork before setting readyToRender=true.');
    duration??=sample?Math.min(p.previewDuration,p.duration-start):p.duration-start;
    if(!Number.isFinite(start)||!Number.isFinite(duration)||start<0||duration<=0||start+duration>p.duration+.001)throw new Error('Render range outside project');
    if(Math.abs(duration*p.fps-Math.round(duration*p.fps))>.001)throw new Error('Render duration must contain an integer number of frames');
    if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name))throw new Error('Output name must use ASCII letters, numbers, underscores or hyphens');
    const file=path.join(root,'renders',name+'.mp4'),temp=path.join(root,'renders',`${name}.partial-${process.pid}.mp4`);
    const {existsSync}=await import('node:fs');if(existsSync(file)&&!overwrite)throw new Error(`Output exists: ${file}. Use a new --name or explicit --overwrite.`);
    const frames=Math.round(duration*p.fps),ff=['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate',String(p.fps),'-vcodec','mjpeg','-i','pipe:0','-ss',String(start),'-i',audio,'-map','0:v:0','-map','1:a:0','-t',String(duration),'-c:v','libx264','-preset','fast','-crf',draft?'23':'18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',temp];
    const encoder=spawn(process.env.FFMPEG_PATH||'ffmpeg',ff,{windowsHide:true,stdio:['pipe','ignore','pipe']});let stderr='',failure;encoder.stderr.on('data',b=>stderr+=b);encoder.stdin.on('error',e=>failure=e);
    const done=new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('close',code=>code===0?resolve():reject(new Error(stderr||`Encoder exited ${code}`)));});done.catch(e=>failure=e);
    const interrupt=()=>encoder.kill();process.once('SIGINT',interrupt);process.once('SIGTERM',interrupt);
    try{
      for(let i=0;i<frames;i++){
        if(failure)throw failure;await browser.evaluate(`window.__seek(${start+i/p.fps})`);if(browser.errors.length)throw new Error(browser.errors.join('\n'));
        if(!encoder.stdin.write(await browser.screenshot('jpeg')))await Promise.race([done.then(()=>{throw new Error('Encoder ended early');}),new Promise((resolve,reject)=>{const timer=setTimeout(()=>{clean();reject(new Error('Encoder backpressure timed out'));},30000);const clean=()=>{clearTimeout(timer);encoder.stdin.off('drain',drain);encoder.stdin.off('error',err);};const drain=()=>{clean();resolve();},err=e=>{clean();reject(e);};encoder.stdin.once('drain',drain);encoder.stdin.once('error',err);})]);
        if(i%(p.fps*4)===0)console.log(`Rendering ${i}/${frames}`);
      }
      encoder.stdin.end();await done;
      const result=JSON.parse(await run(process.env.FFPROBE_PATH||'ffprobe',['-v','error','-count_frames','-show_entries','stream=codec_type,width,height,nb_read_frames,duration','-of','json',temp]));
      const video=result.streams.find(s=>s.codec_type==='video'),track=result.streams.find(s=>s.codec_type==='audio');
      if(!video||!track||video.width!==width||video.height!==height||Number(video.nb_read_frames)!==frames||Math.abs(Number(video.duration)-duration)>.05||!Number.isFinite(Number(track.duration))||Number(track.duration)<duration-.10)throw new Error('Encoded media verification failed');
      await rename(temp,file);const metadata={start,duration,width,height,fps:p.fps,frames,audioSHA256:digest(await readFile(audio)),timelineSHA256:digest(await readFile(path.join(root,p.timeline))),visualReview:'pending',audioReview:'not-claimed'};await writeJSON(file+'.json',metadata);return {file,...metadata};
    }catch(e){encoder.kill();await done.catch(()=>{});await unlink(temp).catch(()=>{});throw e;}
    finally{process.off('SIGINT',interrupt);process.off('SIGTERM',interrupt);}
  });
}
export async function exportSubtitles(directory,{language}={}){
  const {root,project,timeline}=await loadProject(directory);
  const lines=timeline.lines.filter(l=>l.start<project.duration).map((l,i)=>{const text=language?(typeof l.translations?.[language]==='string'?l.translations[language]:null):l.text;if(!text)throw new Error(`No translation for ${language} at line ${i+1}. Supply translations first.`);return `${i+1}\n${timecode(l.start)} --> ${timecode(Math.min(l.end,project.duration))}\n${text}\n`;});
  const file=path.join(root,'renders',`captions${language?'-'+language.replace(/[^A-Za-z0-9-]/g,''):''}.srt`);await writeFile(file,'\uFEFF'+lines.join('\n'));return {file,lines:lines.length};
}
