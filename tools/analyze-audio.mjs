import {pathToFileURL} from 'node:url';
import {measureAudio} from '../lib/audio-features.mjs';
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){try{const options={};for(let i=2;i<process.argv.length;i++){const key=process.argv[i],value=process.argv[++i];if(!['--audio','--out'].includes(key)||!value||value.startsWith('--'))throw Error('Use --audio FILE --out NEW_FILE');options[key.slice(2)]=value;}console.log(JSON.stringify(await measureAudio(options),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
export {measureAudio};
