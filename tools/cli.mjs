#!/usr/bin/env node
import path from 'node:path';
import {readFile,mkdir} from 'node:fs/promises';
import {REPO_ROOT,json,probe,run,writeJSON} from '../lib/paths.mjs';
import {serve,findBrowser} from './browser.mjs';
import {loadProject} from '../lib/project.mjs';
import {checkArtwork,renderVideo,captureStill,exportSubtitles} from '../lib/render.mjs';
import {prepareReference,exportStylePrompt,validateStyle} from '../lib/reference.mjs';
import {listStyles,exportStyle} from '../lib/styles.mjs';
import {prepareReconstruction,exportReconstruction,validateReconstruction} from '../lib/reconstruction.mjs';
const [rawCommand='help',...argv]=process.argv.slice(2),command=['--help','-h'].includes(rawCommand)?'help':rawCommand,options={};
const flags=new Set(['sample','draft','overwrite','help']);
try{
  for(let i=0;i<argv.length;i++){const arg=argv[i];if(!arg.startsWith('--'))throw new Error(`Unexpected argument: ${arg}`);const key=arg.slice(2);if(key in options)throw new Error(`Duplicate option: --${key}`);if(flags.has(key))options[key]=true;else{if(!argv[i+1]||argv[i+1].startsWith('--'))throw new Error(`--${key} needs a value`);options[key]=argv[++i];}}
  const allowed={help:[],doctor:['project'],styles:[],style:['id','out'],init:['audio','lyrics','out','aspect','direction','reference','style','style-profile','style-prompt'],inspect:['project'],install:['agent','target'],reference:['video','out','start','duration','crop'],'reverse-prompt':['video','analysis','out','start','duration','crop'],'reconstruction-check':['analysis'],preview:['project','port'],check:['project'],render:['project','start','duration','sample','draft','name','overwrite'],still:['project','time','out','draft'],subtitles:['project','language'],'style-check':['profile'],'style-prompt':['profile','out'],package:['out'],showcase:[]};
  if(!(command in allowed))throw new Error(`Unknown command: ${command}`);for(const key of Object.keys(options))if(key!=='help'&&!allowed[command].includes(key))throw new Error(`Unknown option for ${command}: --${key}`);
  const required=(key)=>{if(!options[key])throw new Error(`${command} needs --${key}`);return options[key];};
  const number=(key,fallback)=>{if(options[key]===undefined)return fallback;const value=Number(options[key]);if(!Number.isFinite(value))throw new Error(`--${key} must be a number`);return value;};
  const directory=path.resolve(options.project||path.join(REPO_ROOT,'examples/demo'));let result;
  if(command==='help'||options.help){
    console.log(`Lyric Motion — conversation-first MV toolkit\n\nUsage: node tools/cli.mjs <command> [options]\n\n  doctor                         Check Node, browser, FFmpeg and FFprobe\n  install --agent codex|claude-code --target DIR\n  styles                         List and validate optional built-in directions\n  style --id ID [--out NEW_DIR]   Locate or export a reusable style bundle\n  init --audio FILE --lyrics FILE --out DIR [--style auto|1|2|3|4 --aspect 16:9 --direction TEXT]\n       [--style-profile FILE --style-prompt FILE --reference FILE]\n  inspect --project DIR           Inspect raw project/state, including unaligned lyrics\n  reference --video FILE --out DIR [--start 0 --duration SECONDS --crop x:y:w:h]\n  preview --project DIR [--port 4179]\n  check --project DIR             Technical checks; visual playback is separate\n  render --project DIR [--sample --draft --name main --overwrite]\n  still --project DIR --time SEC [--out FILE]\n  subtitles --project DIR [--language zh-CN]\n  style-check --profile FILE\n  style-prompt --profile FILE --out FILE\n  showcase                       Rebuild README media from the original demo\n  package [--out release/lyric-motion]\n\nStyles: auto/0, playground/1, poetry/2, sculpture/3, storybook/4. Named styles are starting\npoints, not artwork templates. Explicit custom profiles/prompts replace the\nbuilt-in bundle; your direction and reference still guide the new composition.\nThe default project is the bundled original demo. New artwork remains blocked\nuntil the agent has created it. TXT needs timing; no automatic alignment is claimed.\n`);
    console.log('Reverse a video into an authored reconstruction prompt:\n  reverse-prompt --video FILE --out NEW_DIR [--start 0 --duration SEC --crop x:y:w:h]\n  reverse-prompt --analysis FILE --out NEW_DIR\n  reconstruction-check --analysis FILE\nPreparation needs actual agent observation before export; style-prompt remains the separate transferable-style workflow.');
  }else if(command==='doctor'){
    const checks={node:process.version,nodeSupported:Number(process.versions.node.split('.')[0])>=22,platform:process.platform,browser:null,ffmpeg:null,ffprobe:null};
    try{checks.browser=findBrowser();}catch(e){checks.browserError=e.message;}
    for(const [key,env] of [['ffmpeg','FFMPEG_PATH'],['ffprobe','FFPROBE_PATH']])try{checks[key]=(await run(process.env[env]||key,['-version'])).split('\n')[0];}catch(e){checks[key+'Error']=e.message;}
    if(options.project)try{const data=await loadProject(directory);checks.project={title:data.project.title,duration:data.project.duration,lines:data.timeline.lines.length};}catch(e){checks.projectError=e.message;}
    result={...checks,ok:checks.nodeSupported&&!!checks.browser&&!!checks.ffmpeg&&!!checks.ffprobe&&!checks.projectError};if(!result.ok)process.exitCode=1;
  }else if(command==='init'){
    const {prepareProject}=await import('../lib/prepare.mjs');result=await prepareProject({audio:required('audio'),lyrics:required('lyrics'),out:required('out'),aspect:options.aspect||'16:9',direction:options.direction||'',reference:options.reference,style:options.style??'auto',styleProfile:options['style-profile'],stylePrompt:options['style-prompt'],templateRoot:path.join(REPO_ROOT,'templates')});
  }else if(command==='styles'){
    result={default:'auto',styles:await listStyles(),note:'Optional art directions, not fixed storyboards. Your reference, supplied profile/prompt, and explicit direction take precedence.'};
  }else if(command==='style'){
    result=await exportStyle({id:required('id'),out:options.out});
  }else if(command==='inspect'){
    const p=await json(path.join(directory,'config/project.json'));result={directory,project:p,state:await json(path.join(directory,'state.json')).catch(()=>({status:'unknown'})),timeline:await json(path.join(directory,p.timeline)).catch(()=>null)};
  }else if(command==='install'){
    const {installSkill}=await import('./install.mjs');result=await installSkill({agent:required('agent'),target:required('target'),sourceRoot:REPO_ROOT});
  }else if(command==='reference'){
    result=await prepareReference({video:required('video'),out:required('out'),start:number('start',0),duration:number('duration'),crop:options.crop});
  }else if(command==='reverse-prompt'){
    if(!!options.video===!!options.analysis)throw new Error('reverse-prompt needs exactly one of --video or --analysis');
    if(options.analysis){
      if(['start','duration','crop'].some(key=>options[key]!==undefined))throw new Error('--start/--duration/--crop apply only to video preparation');
      result=await exportReconstruction({analysis:await json(required('analysis')),evidenceRoot:path.dirname(path.resolve(options.analysis)),out:required('out')});
    }else result=await prepareReconstruction({video:required('video'),out:required('out'),start:number('start',0),duration:number('duration'),crop:options.crop});
  }else if(command==='reconstruction-check'){
    validateReconstruction(await json(required('analysis')));result={valid:true,note:'Authored structure, timestamps and declared coverage checked. Actual observation and reproduction fidelity are not automatically verified.'};
  }else if(command==='preview'){
    const data=await loadProject(directory),port=number('port',0);if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Port must be 0–65535');const server=await serve(data.root,port);console.log(`Preview: ${server.url}\nExports: ${server.url}/player\nProject: ${data.root}\nPress Ctrl+C to stop. Preview is local; generation stays in your agent conversation.`);const stop=async()=>{await server.close();process.exit(0);};process.once('SIGINT',stop);process.once('SIGTERM',stop);
  }else if(command==='check')result=await checkArtwork(directory);
  else if(command==='render')result=await renderVideo(directory,{start:number('start',0),duration:number('duration'),sample:!!options.sample,draft:!!options.draft,name:options.name||(options.sample?'sample':'main'),overwrite:!!options.overwrite});
  else if(command==='still')result=await captureStill(directory,{time:number('time',0),out:options.out,draft:!!options.draft});
  else if(command==='subtitles')result=await exportSubtitles(directory,{language:options.language});
  else if(command==='style-check'){validateStyle(await json(required('profile')));result={valid:true,note:'Basic workflow checks passed. The published JSON Schema is the complete structural contract.'};}
  else if(command==='style-prompt')result=await exportStylePrompt(await json(required('profile')),required('out'));
  else if(command==='package'){const {packageRelease}=await import('./package.mjs');result=await packageRelease({out:options.out});}
  else if(command==='showcase'){const {makeShowcase}=await import('./showcase.mjs');result=await makeShowcase();}
  if(result)console.log(JSON.stringify(result,null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
