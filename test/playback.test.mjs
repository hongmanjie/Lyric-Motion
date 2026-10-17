import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {findBrowser,serve,openBrowser} from '../tools/browser.mjs';

let browserAvailable=true;try{findBrowser()}catch{browserAvailable=false}
function silence(seconds){const rate=8000,bytes=Math.ceil(rate*seconds)*2,b=Buffer.alloc(44+bytes);b.write('RIFF');b.writeUInt32LE(36+bytes,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes,40);return b}

test('slow artwork reaches the canonical final frame and replays from zero after the project cut', {skip:!browserAvailable,timeout:25000},async t=>{
 const parent=path.resolve('qa/test-tmp');await mkdir(parent,{recursive:true});const root=await mkdtemp(path.join(parent,'playback-'));let server,browser;
 t.after(async()=>{await browser?.close();await server?.close();await rm(root,{recursive:true,force:true})});
 await mkdir(path.join(root,'config'));await mkdir(path.join(root,'assets'));
 await writeFile(path.join(root,'config/project.json'),JSON.stringify({title:'Playback fixture',width:320,height:180,fps:30,duration:1.2,previewDuration:1.2,audio:'assets/audio.wav',timeline:'timeline.json',artwork:'artwork.js'}));
 await writeFile(path.join(root,'timeline.json'),JSON.stringify({duration:1.2,beats:[],lines:[{text:'Fixture',start:0,end:1.2}]}));
 await writeFile(path.join(root,'assets/audio.wav'),silence(1.4));
 await writeFile(path.join(root,'artwork.js'),'export const readyToRender=true;export async function createArtwork({ctx}){return {async render(t){await new Promise(r=>setTimeout(r,120));ctx.fillRect(0,0,320,180);window.lastRenderedTime=t}}}');
 server=await serve(root);browser=await openBrowser(server.url,320,180);
 await browser.evaluate('document.querySelector("#play").click();true',{userGesture:true});
 const end=await browser.evaluate('(async()=>{const end=1.2-1/30,a=document.querySelector("audio");const deadline=Date.now()+8000;while(Date.now()<deadline){if(a.paused&&Math.abs(window.lastRenderedTime-end)<1e-7)return {time:window.lastRenderedTime,slider:Number(document.querySelector("#scrub").value),error:document.querySelector("#error").textContent};await new Promise(r=>setTimeout(r,30))}throw Error("Playback did not reach the final frame")})()');
 assert.ok(Math.abs(end.time-(1.2-1/30))<1e-7);assert.ok(Math.abs(end.slider-end.time)<.011);assert.equal(end.error,'');
 await browser.evaluate('document.querySelector("#play").click();true',{userGesture:true});
 const replay=await browser.evaluate('(async()=>{await new Promise(r=>setTimeout(r,180));const a=document.querySelector("audio");return {time:a.currentTime,paused:a.paused,error:document.querySelector("#error").textContent}})()');
 assert.ok(replay.time<.8,'Replay must restart near zero, not at the last frame');assert.equal(replay.paused,false);assert.equal(replay.error,'');
 await browser.evaluate('window.__freeze();true');
});
