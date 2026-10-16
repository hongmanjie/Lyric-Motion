import {loadFonts,clamp,lerp,ease,smooth,segment,cueAt,fitText,drawSubtitles,beat,noise,TAU,camera} from '../shared.mjs';

export const readyToRender=true;
export const cuts=[];
const C={night:'#080d1b',ice:'#baf6ff',cyan:'#40e8e0',white:'#edf2ee',purple:'#7c79ff',amber:'#ffc276'};
const modes=['pressure','open','fall','reach'];

export async function createArtwork({ctx:screen,project,timeline}){
  const fonts=await loadFonts(project);let g=screen;
  cuts.splice(0,cuts.length,...new Set([0,...timeline.lines.flatMap(l=>[l.start,...(l.cues||[]).map(c=>c.start)]),timeline.duration]));
  const text=(s,x,y,size,max=1600,opts={})=>fitText(g,s,x,y,size,max,{font:fonts.sans,color:C.white,weight:850,...opts});
  function stroke(points,color,width=2,close=false){g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));if(close)g.closePath();g.strokeStyle=color;g.lineWidth=width;g.stroke();}
  function halo(x,y,r,color,alpha=1){g.save();g.globalAlpha*=alpha;const a=g.createRadialGradient(x,y,0,x,y,r);a.addColorStop(0,color);a.addColorStop(.3,color+'55');a.addColorStop(1,color+'00');g.fillStyle=a;g.fillRect(x-r,y-r,r*2,r*2);g.restore();}
  function ball(x,y,r,hot=false){
    g.save();g.shadowColor='#0008';g.shadowBlur=18;g.shadowOffsetY=16;
    const a=g.createRadialGradient(x-r*.35,y-r*.42,1,x+r*.1,y+r*.04,r*1.2);
    for(const [p,c] of [[0,'#fffef6'],[.18,hot?'#ffe3ab':'#b8f1ff'],[.36,hot?'#c77941':'#347b98'],[.51,'#10223b'],[.67,hot?'#f6b768':'#a9bed9'],[1,'#111728']])a.addColorStop(p,c);
    g.fillStyle=a;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.restore();
  }
  function projection(p,angle=.3,tilt=.2,cx=960,cy=470,scale=1){
    const x=p[0]*Math.cos(angle)-p[2]*Math.sin(angle),z=p[0]*Math.sin(angle)+p[2]*Math.cos(angle),y=p[1]*Math.cos(tilt)-z*Math.sin(tilt),depth=p[1]*Math.sin(tilt)+z*Math.cos(tilt);
    const f=1100/(1100+depth);return [cx+x*f*scale,cy+y*f*scale,depth];
  }
  function box({x=0,y=0,z=0,w=200,h=200,d=120,angle=.3,tilt=.2,cx=960,cy=470,scale=1,color=C.ice,solid=true}={}){
    const pts=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(p=>projection([p[0]*w/2+x,p[1]*h/2+y,p[2]*d/2+z],angle,tilt,cx,cy,scale));
    const faces=[[0,1,2,3],[4,5,6,7],[0,4,7,3],[1,5,6,2],[0,1,5,4],[3,2,6,7]].map((ids,i)=>({ids,i,z:ids.reduce((s,k)=>s+pts[k][2],0)/4})).sort((a,b)=>b.z-a.z);
    for(const face of faces){const poly=face.ids.map(i=>pts[i]);if(solid){const grad=g.createLinearGradient(...poly[0].slice(0,2),...poly[2].slice(0,2));grad.addColorStop(0,['#142f4a','#377d90','#adcede','#152c4b','#d5e9e7','#405a77'][face.i]);grad.addColorStop(1,'#0b1427');g.fillStyle=grad;g.beginPath();poly.forEach(([px,py],i)=>i?g.lineTo(px,py):g.moveTo(px,py));g.closePath();g.fill();}stroke(poly,color,solid?1.3:2.4,true);}
  }
  function ring(x,y,rx,ry,phase,color=C.cyan,width=2){stroke(Array.from({length:65},(_,i)=>{const a=i/64*TAU;return [x+Math.cos(a)*rx,y+Math.sin(a)*ry+Math.sin(a*2+phase)*6];}),color,width);}
  function type3(value,x,y,size,max=1500,opts={}){
    const {color=C.white,align='center',tilt=-.045}=opts;g.save();g.translate(x,y);g.transform(1,tilt,.015,1,0,0);
    for(let i=12;i>=2;i-=2)text(value,i*.75,i*.95,size,max,{align,color:i>6?'#122944':'#426478'});
    text(value,0,0,size,max,{align,color});g.restore();
  }
  function background(t,action){
    g.fillStyle=C.night;g.fillRect(0,0,1920,1080);halo(1160,480,780,action==='open'?'#4b3558':'#163958',.3);
    for(let i=0;i<30;i++){g.globalAlpha=.12+noise(i)*.17;g.fillStyle=C.ice;g.fillRect(noise(i+20)*1920,noise(i+70)*860,1.5,1.5);}g.globalAlpha=1;
  }
  function stageCamera(q,progress,flip=1){
    const entry=ease(Math.max(0,q.local)/.34),impact=Math.exp(-Math.max(0,q.local)*18);
    camera(g,{x:960+(1-entry)*170*flip+Math.sin(progress*Math.PI)*24*flip,y:480+(1-entry)*60,zoom:1+impact*.18,angle:(1-entry)*-.055*flip});
  }
  function pressure(t,line,q,p){
    const n=q.index%4,age=Math.max(0,q.local),settle=ease(age/.36),pulse=beat(t,timeline);
    g.save();stageCamera(q,p,n%2?1:-1);
    if(n<2){
      const compress=smooth(p*.9);for(let i=0;i<8;i++){
        const side=i%2?1:-1,cx=960+side*(600-compress*220)+Math.sin(t*2+i)*18;
        box({w:65,h:300+noise(i)*320,d:120,cx,cy:430+(noise(i+11)-.5)*330,angle:side*.34+t*.1,color:i%3?C.ice:C.purple});
      }
      for(let k=-1;k<=1;k++){g.globalAlpha=k===0?1:.12;type3(q.cue.text,960+k*(40+90*p),465+k*210,240,1440,{color:k===0?C.white:C.ice,tilt:-.04});}g.globalAlpha=1;
    }else{
      const expand=n===2?1:1-smooth(q.progress);
      for(let i=0;i<12;i++){const a=i/12*TAU+t*.18,r=420+expand*180;box({w:24,h:90,d:20,angle:a,cx:960+Math.cos(a)*r,cy:470+Math.sin(a)*r*.58,color:C.purple});}
      ring(960,610,260+90*p,78,t,C.cyan);type3(q.cue.text,960,440,290,1450,{color:n===3?C.amber:C.white});
    }
    ball(1520-180*settle,710-40*p,44+pulse*3,true);g.restore();
  }
  function open(t,line,q,p){
    const n=q.index%3,entry=ease(Math.max(0,q.local)/.45);g.save();stageCamera(q,p,-1);
    halo(1110,470,520,C.amber,.1+entry*.13);
    const aperture=lerp(80,340,ease(p*1.4));
    for(let i=0;i<8;i++){const a=i/8*TAU+t*.26,r=aperture;box({w:55,h:120+50*Math.sin(a),d:45,angle:a+t*.18,cx:1110+Math.cos(a)*r,cy:470+Math.sin(a)*r*.63,color:i%2?C.amber:C.ice});}
    for(let i=0;i<4;i++)ring(1110,470,aperture+20*i,aperture*.35+9*i,t+i*.5,i%2?C.amber:C.purple,1.5);
    if(n===0){type3(q.cue.text,250,330+60*(1-entry),165,1350,{align:'left'});ball(1410,665,65,true);}
    else if(n===1){type3(q.cue.text,960,465,290+20*beat(t,timeline),1650,{color:C.amber,tilt:0});}
    else{type3(q.cue.text,960,390,270,1530,{color:C.white});stroke([[320,650],[1600,650]],C.amber,3);ball(960,650,45,true);}
    g.restore();
  }
  function fall(t,line,q,p){
    const n=q.index%4,age=Math.max(0,q.local),entry=ease(age/.36);g.save();
    camera(g,{x:960+(1-entry)*120,y:470+(1-entry)*-90,zoom:1+Math.exp(-age*15)*.16,angle:(n===2?.075:-.035)*smooth(q.progress)});
    const phase=(t*.5)%1;
    for(let i=0;i<9;i++){
      const depth=(i+phase)/9,scale=.16+depth*1.3;g.globalAlpha=.12+depth*.6;
      box({w:780,h:490,d:25,angle:.1+depth*.25,tilt:-.1,cx:960,cy:465+depth*100,scale,solid:false,color:i%2?C.purple:C.cyan});
    }g.globalAlpha=1;
    if(n===2){
      const chars=Array.from(q.cue.text),width=Math.min(1450,chars.length*210),step=width/Math.max(1,chars.length);
      chars.forEach((char,i)=>{const delay=i*.055,down=smooth((q.progress-delay)/(1-delay));type3(char,960+(i-(chars.length-1)/2)*step,320+down*300,185,step*.95,{tilt:down*.1,color:i%2?C.ice:C.white});});
    }else type3(q.cue.text,960+(n===3?180:0),n===1?405:440,260,1500,{color:n===1?C.purple:C.white,tilt:.035});
    ball(1510-360*p,280+p*440,38,true);g.restore();
  }
  function reach(t,line,q,p){
    const n=q.index%4,age=Math.max(0,q.local),entry=ease(age/.28),join=smooth((p-.28)/.58),dx=lerp(510,115,join);
    g.save();stageCamera(q,p,n%2?1:-1);halo(960,480,390,C.amber,.12*join);
    const cy=600;ball(960-dx,cy,73);ball(960+dx,cy,73,true);
    const bend=lerp(260,0,join);g.strokeStyle=C.cyan;g.lineWidth=5;g.beginPath();g.moveTo(960-dx,cy);g.bezierCurveTo(750,cy-bend,1170,cy+bend,960+dx,cy);g.stroke();
    if(n<2){type3(q.cue.text,n===0?610:1250,340,260,1150,{color:n===0?C.ice:C.amber});}
    else{
      const bracket=lerp(350,150,join);for(const side of [-1,1]){stroke([[960+side*bracket,300],[960+side*(bracket+60),300],[960+side*(bracket+60),550],[960+side*bracket,550]],side<0?C.cyan:C.amber,12);}
      type3(q.cue.text,960,420,260,1460,{color:n===3?C.amber:C.white,tilt:0});
    }
    ring(960,730,450*(1-join*.2),52,t*.8,C.purple,2);g.restore();
  }
  function renderStage(t,line,index){
    const action=line.action||modes[index%modes.length],q=cueAt(t,line),p=clamp((t-line.start)/(line.end-line.start));
    background(t,action);g.save();g.beginPath();g.rect(0,125,1920,790);g.clip();
    ({pressure,open,fall,reach}[action]||pressure)(t,line,q,p);g.restore();
    text('LYRIC MOTION',100,77,21,600,{weight:500,align:'left',color:C.ice});text('03 / DIGITAL SCULPTURE',1820,77,21,750,{weight:500,align:'right',color:C.ice});
    text(line.text,960,865,43,1660,{weight:500,color:C.ice});
  }
  const blend=document.createElement('canvas');blend.width=1920;blend.height=1080;const buffer=blend.getContext('2d');
  return {render(t){
    const s=segment(t,timeline);screen.save();screen.scale(project.width/1920,project.height/1080);
    if(s.index>0&&s.local<.15){g=screen;renderStage(s.line.start-.001,timeline.lines[s.index-1],s.index-1);g=buffer;buffer.reset();renderStage(t,s.line,s.index);g=screen;screen.globalAlpha=smooth(s.local/.15);screen.drawImage(blend,0,0);screen.globalAlpha=1;}
    else{g=screen;renderStage(t,s.line,s.index);}
    drawSubtitles(screen,t,timeline,project,{color:C.white,accent:C.cyan,background:true});screen.restore();g=screen;
  }};
}
