import {loadFonts,clamp,lerp,ease,smooth,segment,fitText,drawSubtitles,beat} from '../shared.mjs';

export const readyToRender=true;
// Filled from actual supplied line/cue times when the composition initializes.
export const cuts=[];
const P={paper:'#f5f1e8',ink:'#191b1d',blue:'#3154f5',lime:'#dafa61',coral:'#ff795e',pink:'#ffa7b7'};
const TAU=Math.PI*2,actions=['pressure','open','fall','reach'];
const spring=v=>1-Math.exp(-clamp(v,0,3)*7)*Math.cos(clamp(v,0,3)*10);
const seed=n=>{const v=Math.sin(n*121.23+47.8)*46393.12;return v-Math.floor(v);};

export async function createArtwork({ctx:g,project,timeline}){
 const fonts=await loadFonts(project);
 const lines=timeline.lines;
 const content=l=>String(l.text||l.jp||'');
 const latin=s=>Array.from(s).every(c=>c.charCodeAt(0)<128);
 const cueLists=lines.map(l=>{
  const explicit=l.cues||l.motion?.cues||(Array.isArray(timeline.motion)?timeline.motion.filter(c=>(c.start??c.at)>=l.start&&(c.start??c.at)<l.end):[]);
  const list=explicit?.length?explicit:[{start:l.start,end:l.end,text:l.focus||content(l),action:l.action}];
  return list.map((c,i)=>({...c,start:Number(c.start??c.at??l.start),end:Number(c.end??list[i+1]?.start??l.end),text:String(c.text||c.word||l.focus||content(l))})).sort((a,b)=>a.start-b.start);
 });
 cuts.splice(0,cuts.length,...Array.from(new Set([0,project.duration,...lines.map(l=>l.start),...cueLists.flatMap(list=>list.map(c=>c.start))])).sort((a,b)=>a-b));
 function txt(s,x,y,size,c=P.ink,opts={}){fitText(g,String(s??''),x,y,size,opts.maxWidth||1690,{font:fonts.sans,weight:900,color:c,...opts});}
 function circle(x,y,r,c,stroke){g.fillStyle=c;g.beginPath();g.arc(x,y,Math.max(.01,r),0,TAU);g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=3;g.stroke();}}
 function box(x,y,w,h,c,r=0,a=0){g.save();g.translate(x,y);g.rotate(a);g.fillStyle=c;g.beginPath();g.roundRect(-w/2,-h/2,Math.max(.01,w),Math.max(.01,h),r);g.fill();g.restore();}
 function line(points,c,w=3){g.strokeStyle=c;g.lineWidth=w;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();}
 function star(x,y,r,c,a=0,n=8){g.save();g.translate(x,y);g.rotate(a);g.fillStyle=c;g.beginPath();for(let i=0;i<n*2;i++){const angle=i*Math.PI/n,v=i%2?r*.43:r;g.lineTo(Math.cos(angle)*v,Math.sin(angle)*v);}g.closePath();g.fill();g.restore();}
 function arrow(x,y,w,c,a=0){g.save();g.translate(x,y);g.rotate(a);g.fillStyle=c;g.beginPath();g.moveTo(-w*.5,-w*.1);g.lineTo(w*.1,-w*.1);g.lineTo(w*.1,-w*.3);g.lineTo(w*.5,0);g.lineTo(w*.1,w*.3);g.lineTo(w*.1,w*.1);g.lineTo(-w*.5,w*.1);g.closePath();g.fill();g.restore();}
 function camera({zoom=1,x=960,y=500,angle=0},fn){g.save();g.translate(960,500);g.rotate(angle);g.scale(zoom,zoom);g.translate(-x,-y);fn();g.restore();}
 function cueAt(t,index){const list=cueLists[index];let j=list.findLastIndex(c=>c.start<=t+.001);if(j<0)j=0;const cue=list[j],duration=Math.max(.12,cue.end-cue.start);return {cue,j,count:list.length,age:t-cue.start,duration,p:clamp((t-cue.start)/duration),previous:list[j-1]};}
 function label(index,t,c){txt('PLAYGROUND',105,73,22,c,{weight:650,align:'left'});const b=beat(t,timeline);for(let i=0;i<lines.length;i++){g.globalAlpha=i===index?1:.18;box(1780+i*16-lines.length*16,73,9,i===index?10+b*13:4,c);}g.globalAlpha=1;}
 function lineNote(l,c){txt(content(l),110,870,43,c,{maxWidth:1650,weight:550,align:'left'});}
 function glyphs(s,x,y,size,c,t,mode='push'){
  const ascii=latin(s),units=ascii?String(s).trim().split(/\s+/):Array.from(s);
  g.save();g.font=`900 ${size}px ${fonts.sans}`;
  const gap=ascii?size*.23:size*.025,widths=units.map(unit=>g.measureText(unit).width);
  const natural=widths.reduce((a,b)=>a+b,0)+gap*Math.max(0,units.length-1),scale=Math.min(1,1580/Math.max(1,natural));
  g.translate(x,y);g.scale(scale,1);let cursor=-natural/2;
  units.forEach((unit,k)=>{const a=seed(k+9),dy=mode==='fall'?((t*.8+a)%1)*450-220:Math.sin(t*3+k)*10;txt(unit,cursor+widths[k]/2,dy,size,c,{angle:mode==='fall'?-.1+a*.2:Math.sin(t*2+k)*.025,maxWidth:widths[k]+2});cursor+=widths[k]+gap;});
  g.restore();
 }
 function ghost(cue,s,c){if(!cue.previous||s.age>.18)return;g.save();g.globalAlpha=(1-ease(s.age/.18))*.6;txt(cue.previous.text,960-s.age*5500,500,260,c,{angle:-s.age*.6});g.restore();}
 function impact(s){return .12*Math.exp(-Math.max(0,s.age)*18);}
 function pressure(l,s,t,p){
  const j=s.j%4,hit=impact(s),enter=ease(s.age/.19),z=1+hit;
  const dark=j===2,bg=j===1?P.blue:dark?P.ink:P.paper,fg=dark||j===1?P.paper:P.ink;
  g.fillStyle=bg;g.fillRect(0,0,1920,1080);
  // Noise lives in real letterforms, compressing toward a single isolated actor.
  g.save();g.globalAlpha=dark?.13:.095;
  for(let row=0;row<5;row++)txt(content(l),960+Math.sin(t*2+row)*230,190+row*150,116,fg,{angle:-.09,maxWidth:2300});
  g.restore();
  if(j===0){
   box(960,228,2250,106,P.ink,0,-.07);txt(s.cue.text,960,230,71,P.paper,{angle:-.07,maxWidth:1740});
   camera({zoom:z,x:lerp(1150,960,enter),angle:lerp(-.085,.015,enter)},()=>{txt(s.cue.text,960,525,latin(s.cue.text)?255:305,P.ink,{maxWidth:1650});arrow(1600,720,170,P.blue,.1);});
   for(let i=0;i<7;i++)box(160+i*52,745+Math.sin(i+t*4)*15,24,8,P.blue,3,-.25);
  }else if(j===1){
   const squeeze=lerp(1620,1380,ease(s.p));box(960,495,squeeze,358,P.paper,18,-.035);
   line([[190+100*s.p,260],[190+100*s.p,710]],P.lime,22);line([[1730-100*s.p,260],[1730-100*s.p,710]],P.lime,22);
   camera({zoom:z,angle:lerp(.07,-.025,enter)},()=>txt(s.cue.text,960,485,latin(s.cue.text)?255:325,P.blue,{maxWidth:1260}));
   star(1560,710,65,P.lime,t*.7,4);
  }else if(j===2){
   camera({zoom:z,x:lerp(800,960,enter),angle:lerp(.1,0,enter)},()=>glyphs(s.cue.text,960,475,latin(s.cue.text)?215:290,P.paper,t));
   line([[335,685],[1585,685]],P.coral,12);for(let i=0;i<3;i++)line([[400+i*540,645],[435+i*540,728]],P.coral,7);
  }else{
   txt(s.cue.text,650+Math.sin(s.p)*35,455,latin(s.cue.text)?265:420,P.ink,{maxWidth:1120,angle:lerp(-.06,.015,enter)});
   for(let i=0;i<4;i++)line([[1240+i*80,230+i*80],[1370+i*30,280+i*20]],P.blue,3);
   star(1530,650,110,P.lime,-t*.8,8);arrow(1070,700,160,P.blue,-.48);
  }
  ghost(s,s,fg);lineNote(l,fg);return {bg,fg};
 }
 function opening(l,s,t,p){
  const j=Math.min(2,s.j),enter=ease(s.age/.2),z=1+impact(s),bg=j===0?P.blue:j===1?P.paper:P.coral,fg=j===0?P.paper:P.ink;
  g.fillStyle=bg;g.fillRect(0,0,1920,1080);
  // A small carried object opens a field of light; the aperture becomes the type's stage.
  const r=lerp(100,390,ease(p)),sx=lerp(1450,1100,s.p);
  // The white phrase crosses the aperture: keep that field subdued so its strokes remain clear.
  g.save();g.globalAlpha=j===0?.22:1;star(sx,485,r,j===0?P.lime:j===1?P.lime:P.paper,t*.15+s.j*.24,10);g.restore();
  for(let k=0;k<9;k++){let a=k*TAU/9+t*.1;line([[sx+Math.cos(a)*(r+28),485+Math.sin(a)*(r+28)],[sx+Math.cos(a)*(r+65),485+Math.sin(a)*(r+65)]],j===1?P.blue:fg,3);}
  if(j===0){
   camera({zoom:z,x:lerp(1240,960,enter),angle:lerp(-.1,-.025,enter)},()=>txt(s.cue.text,905,455,latin(s.cue.text)?240:270,P.paper,{maxWidth:1650}));
   txt(l.focus||s.cue.text,220,730,66,P.lime,{weight:650,align:'left',maxWidth:1000});
  }else if(j===1){
   camera({zoom:z*lerp(1.12,1,ease(s.p)),angle:lerp(.075,-.035,enter)},()=>{txt(s.cue.text,960,470,latin(s.cue.text)?330:400,P.ink,{maxWidth:1670});});
   arrow(255,690,200,P.blue,-.8);star(1640,710,55,P.coral,t,4);
  }else{
   // Type lands large, then opens a calmer window for the next fall.
   camera({zoom:z,x:lerp(770,960,enter),angle:lerp(-.13,.025,enter)},()=>{txt(s.cue.text,950,460,latin(s.cue.text)?340:430,P.ink,{maxWidth:1670});});
   box(510,690,640,12,P.ink,6,-.09);box(1360,690,310,12,P.ink,6,.09);
  }
  ghost(s,s,fg);lineNote(l,fg);return {bg,fg};
 }
 function falling(l,s,t,p){
  const j=s.j%4,enter=ease(s.age/.2),bg=P.ink,fg=P.paper;
  g.fillStyle=bg;g.fillRect(0,0,1920,1080);
  // Receding boundaries pull the eye inward while the carried actor descends.
  for(let k=0;k<8;k++){
   const depth=((k/8+p*.44)%1),scale=.1+depth*1.5;
   g.save();g.translate(1030,480);g.rotate(-.12+p*.2);g.scale(scale,scale);g.strokeStyle=k%2?P.blue:'#65666a';g.globalAlpha=.12+depth*.34;g.lineWidth=2;g.strokeRect(-670,-320,1340,640);g.restore();
  }
  g.save();g.globalAlpha=.09;glyphs(content(l),960,490,150,P.paper,t,'fall');g.restore();
  if(j===0){
   camera({zoom:lerp(1.55,1,enter),x:1000,y:lerp(400,500,enter),angle:lerp(.15,-.025,enter)},()=>txt(s.cue.text,960,435,latin(s.cue.text)?265:310,fg,{maxWidth:1570}));
   line([[230,660],[590,720],[1390,720]],P.coral,5);
  }else if(j===1){
   circle(1030,460,300,P.blue);camera({zoom:1+impact(s),angle:lerp(-.18,.025,enter)},()=>txt(s.cue.text,1030,445,latin(s.cue.text)?320:550,P.paper,{maxWidth:1470}));
   txt(l.focus||s.cue.text,235,720,64,P.lime,{maxWidth:800,align:'left',weight:600});
  }else if(j===2){
   camera({zoom:1+impact(s),x:lerp(1170,960,enter),y:lerp(360,500,enter),angle:lerp(-.17,.04,enter)},()=>txt(s.cue.text,960,450,latin(s.cue.text)?290:330,P.paper,{maxWidth:1580}));
   for(let k=0;k<5;k++)arrow(450+k*265,700,95,k%2?P.blue:P.coral,Math.PI/2);
  }else{
   camera({zoom:lerp(1.18,.98,ease(s.p)),x:lerp(850,960,enter),angle:lerp(.06,0,enter)},()=>txt(s.cue.text,1000,430,latin(s.cue.text)?270:360,P.paper,{maxWidth:1510}));
   line([[510,610],[510,745],[1420,745]],P.lime,9);arrow(1530,735,160,P.coral,0);
  }
  ghost(s,s,P.paper);lineNote(l,P.paper);return {bg,fg};
 }
 function reaching(l,s,t,p){
  const j=s.j%4,enter=ease(s.age/.19),bg=j===2?P.blue:P.paper,fg=j===2?P.paper:P.ink;
  g.fillStyle=bg;g.fillRect(0,0,1920,1080);
  const join=spring((p-.15)/.47),right=lerp(1710,1160,clamp(join));
  // A second actor approaches the one followed from the noisy first phrase.
  circle(right,650,59,P.lime,P.ink);
  if(j===0){
   txt(s.cue.text,610,370,latin(s.cue.text)?270:340,P.ink,{maxWidth:1120,angle:lerp(-.08,.015,enter)});
   arrow(1120,600,370,P.blue,.15);box(240,715,350,130,P.blue,55,-.15);
  }else if(j===1){
   box(400+enter*250,650,760,150,P.blue,70,-.16);box(1550-enter*100,650,530,150,P.coral,70,.13);
   camera({zoom:1+impact(s),x:lerp(1150,960,enter),angle:lerp(.1,-.025,enter)},()=>txt(s.cue.text,1020,425,latin(s.cue.text)?330:500,P.ink,{maxWidth:1530}));
  }else if(j===2){
   camera({zoom:1+impact(s),angle:lerp(-.09,.015,enter)},()=>txt(s.cue.text,960,410,latin(s.cue.text)?300:370,P.paper,{maxWidth:1660}));
   const grip=ease(s.p*2);line([[lerp(180,615,grip),570],[lerp(180,615,grip),725],[850,725]],P.lime,26);line([[lerp(1740,1305,grip),570],[lerp(1740,1305,grip),725],[1070,725]],P.lime,26);
  }else{
   txt(s.cue.text,680,360,latin(s.cue.text)?280:420,P.ink,{maxWidth:1160,angle:lerp(-.075,.015,enter)});
   txt(l.focus||s.cue.text,1320,470,latin(l.focus||'')?120:180,P.blue,{maxWidth:730,angle:.055,alpha:ease((s.age-.08)/.17)});
   g.strokeStyle=P.blue;g.lineWidth=3;g.beginPath();g.ellipse(1160,650,350,125,-.05,0,TAU);g.stroke();star(1550,730,55,P.coral,t*.4,4);
  }
  ghost(s,s,fg);lineNote(l,fg);return {bg,fg};
 }
 const carrierNodes=[[1660,735],[1460,275],[1410,735],[420,730],[1170,650]];
 function carrier(index,p,t,action,s){
  const start=carrierNodes[Math.min(index,3)],end=carrierNodes[Math.min(index+1,4)];
  const v=action==='fall'?p*p:p;
  let x=lerp(start[0],end[0],v),y=lerp(start[1],end[1],v)-Math.sin(Math.PI*v)*(action==='reach'?125:40),r=lerp(49,62,p);
  if(action==='reach'&&p>.48){x=lerp(x,1040,smooth((p-.48)/.52));y=lerp(y,650,smooth((p-.48)/.52));}
  const pulse=beat(t,timeline),squish=.04*pulse;
  g.save();g.translate(x,y);g.rotate(Math.sin(t*2)*.08);g.scale(1+squish,1-squish);circle(7,9,r,'#191b1d25');circle(0,0,r,P.coral,P.ink);
  circle(-r*.23,-r*.11,3.5,P.ink);circle(r*.23,-r*.11,3.5,P.ink);g.strokeStyle=P.ink;g.lineWidth=3;g.beginPath();if(action==='pressure') {g.moveTo(-r*.22,r*.27);g.lineTo(r*.22,r*.27);}else g.arc(0,0,r*.31,.18,Math.PI-.18);g.stroke();g.restore();
 }
 return {render(t){
  t=clamp(Number(t)||0,0,project.duration-1e-7);const state=segment(t,timeline),index=state.index,l=state.line,s=cueAt(t,index),p=state.progress,action=l.action||actions[index%4];
  g.save();g.scale(project.width/1920,project.height/1080);g.lineCap='round';g.lineJoin='round';
  g.save();g.beginPath();g.rect(0,0,1920,930);g.clip();
  const theme=action==='pressure'?pressure(l,s,t,p):action==='open'?opening(l,s,t,p):action==='fall'?falling(l,s,t,p):reaching(l,s,t,p);
  carrier(index,p,t,action,s);label(index,t,theme.fg);g.restore();
  g.fillStyle=theme.bg;g.fillRect(0,930,1920,150);drawSubtitles(g,t,timeline,project,{color:theme.fg,accent:theme.fg});g.restore();
 }};
}
