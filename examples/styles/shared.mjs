// Drawing utilities for the optional style demonstrations, not a global visual theme.
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const ease=v=>1-(1-clamp(v))**3;
export const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const TAU=Math.PI*2;
export function segment(t,timeline){
  const lines=timeline.lines;let index=lines.findIndex(l=>t>=l.start&&t<l.end);
  if(index<0)index=t<lines[0].start?0:Math.max(0,lines.findLastIndex(l=>l.start<=t));
  const line=lines[index],local=t-line.start;
  return {index,line,local,progress:clamp(local/(line.end-line.start)),active:t>=line.start&&t<line.end};
}
export function beat(t,timeline){
  const beats=timeline.beats||[];const i=beats.findLastIndex(b=>b<=t);
  return i<0?0:Math.exp(-(t-beats[i])*19);
}
export function cueAt(t,line){
  const cues=line.cues?.length?line.cues:[{start:line.start,end:line.end,text:line.focus||line.text,action:line.action}];
  let index=cues.findIndex(cue=>t>=cue.start&&t<cue.end);
  if(index<0)index=t<cues[0].start?0:Math.max(0,cues.findLastIndex(cue=>cue.start<=t));
  const cue=cues[index],local=t-cue.start;
  return {index,cue,local,progress:clamp(local/Math.max(.001,cue.end-cue.start))};
}
export function camera(ctx,{x=960,y=500,zoom=1,angle=0}={}){
  ctx.translate(960,500);ctx.rotate(angle);ctx.scale(zoom,zoom);ctx.translate(-x,-y);
}
export async function loadFonts(project){
  const urls=project.fonts||{sans:'/assets/display.ttf'};
  const families={sans:'StyleSans',serif:'StyleSerif',caption:'StyleCaption'};
  for(const [key,name] of Object.entries(families)){
    const url=urls[key]||urls.sans||'/assets/display.ttf';
    const face=new FontFace(name,`url(${JSON.stringify(url)})`,{weight:'100 900'});
    await face.load();document.fonts.add(face);await document.fonts.load(`500 32px ${name}`);
  }
  return families;
}
export function fitText(ctx,value,x,y,size,maxWidth,{font='StyleSans',weight=800,color='#17191b',align='center',baseline='middle',alpha=1,angle=0}={}){
  const text=String(value??'');ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=clamp(alpha);
  ctx.font=`${weight} ${size}px ${font}`;ctx.textAlign=align;ctx.textBaseline=baseline;
  const width=ctx.measureText(text).width,scale=width>0?Math.min(1,maxWidth/width):1;
  ctx.scale(scale,1);ctx.fillStyle=color;ctx.fillText(text,0,0);ctx.restore();return {width:width*scale,height:size};
}
export function drawSubtitles(ctx,t,timeline,project,{color='#f6f1e8',accent=color,y=1002,background=false}={}){
  const {line,active}=segment(t,timeline);if(!active)return;
  const text=line.translations?.['zh-CN']||line.zh||line.subtitle||line.text;
  ctx.save();
  if(background){const gradient=ctx.createLinearGradient(0,y-80,0,1080);gradient.addColorStop(0,'#080b1400');gradient.addColorStop(1,'#080b14b3');ctx.fillStyle=gradient;ctx.fillRect(0,y-80,1920,1080-y+80);}
  ctx.strokeStyle=accent;ctx.globalAlpha=.38;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(923,y-41);ctx.lineTo(997,y-41);ctx.stroke();ctx.globalAlpha=1;
  fitText(ctx,text,960,y,34,1550,{font:'StyleCaption',weight:500,color});ctx.restore();
}
export function noise(n){const v=Math.sin(n*127.1+19.7)*43758.5453123;return v-Math.floor(v);}
