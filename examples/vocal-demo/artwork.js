import { loadFonts, clamp, lerp, ease, smooth, segment, fitText, drawSubtitles, noise, TAU, camera } from './shared.mjs';

export const readyToRender = true;
export let cuts = [];

// One original public showcase, authored around remembrance and human connection.
// It reads the supplied audio timeline; there is no invented beat or lyric clock.
const C={paper:'#ece5d7',white:'#faf3e5',ink:'#263a40',teal:'#537f7d',coral:'#b96c55',gold:'#d8ac61',mint:'#bcc7b5',night:'#22343b',dim:'#82958f'};
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z]+/g,'');
function path(g,points,color=C.ink,width=3,alpha=1){g.save();g.globalAlpha*=alpha;g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(...points[0]);for(let i=1;i<points.length-1;i++)g.quadraticCurveTo(...points[i],(points[i][0]+points[i+1][0])/2,(points[i][1]+points[i+1][1])/2);g.quadraticCurveTo(...points.at(-2),...points.at(-1));g.stroke();g.restore();}
function poly(g,points,fill,color=C.ink,width=2.6){g.save();g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();if(fill){g.fillStyle=fill;g.fill();}if(color){g.strokeStyle=color;g.lineWidth=width;g.lineJoin='round';g.stroke();}g.restore();}
function oval(g,x,y,rx,ry,fill,color=C.ink,width=2,angle=0){g.save();g.translate(x,y);g.rotate(angle);g.beginPath();g.ellipse(0,0,rx,ry,0,0,TAU);if(fill){g.fillStyle=fill;g.fill();}if(color){g.strokeStyle=color;g.lineWidth=width;g.stroke();}g.restore();}
function limb(g,points,color,width=24){path(g,points,C.ink,width+4);path(g,points,color,width);}
function hatch(g,points,color=C.ink){g.save();g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.clip();g.globalAlpha*=.14;for(let i=-15;i<80;i++)path(g,[[i*13,-200],[i*13+230,1000]],color,1);g.restore();}
function palm(g,x,y,angle=0){oval(g,x,y,13,18,C.white,C.ink,2.2,angle);}

// Adult proportions, a recognisable swept hair silhouette, a long teal coat and
// a coral scarf distinguish the same two people in photographs and the present.
function figure(g,x,y,{s=1,angle=0,who=0,pose='rest',phase=0,alpha=1,gaze=1,join=0}={}){
  g.save();g.translate(x,y);g.rotate(angle);g.scale(s,s);g.globalAlpha*=alpha;
  const color=who?C.dim:C.teal,walk=Math.sin(phase),coat=[[-42,-92],[38,-92],[53,88],[-52,88]];
  limb(g,[[-22,70],[-28,148],[-35+walk*12,222]],C.dim,23);limb(g,[[22,70],[30,148],[38-walk*12,223]],C.ink,23);
  poly(g,[[-51+walk*12,217],[-24+walk*12,215],[-8+walk*12,235],[-53+walk*12,235]],C.ink);
  poly(g,[[21-walk*12,217],[47-walk*12,216],[65-walk*12,234],[20-walk*12,235]],C.ink);
  poly(g,coat,color);hatch(g,coat);path(g,[[0,-83],[2,0],[0,82]],C.ink,1.5,.65);
  poly(g,[[-19,-105],[19,-105],[15,-77],[0,-60],[-19,-78]],C.white);
  let a=[[-63,-28],[-65,38]],b=[[63,-28],[65,38]];
  if(pose==='greet'||pose==='meet'){a=who?[[-75,-92],[-107,-155]]:[[-62,-28],[-72,35]];b=who?[[62,-28],[72,35]]:[[75,-92],[107,-155]];}
  if(pose==='remember'){a=[[-58,-30],[-56,31]];b=[[72,-98],[40,-143]];}
  if(pose==='join'){a=who?[[-81,-75],[-144,-53]]:[[-58,-20],[-66,30]];b=who?[[65,-24],[69,34]]:[[84,-80],[144,-53]];}
  if(pose==='meet'){const aa=who?[[-81,-75],[-144,-53]]:[[-58,-20],[-66,30]],bb=who?[[65,-24],[69,34]]:[[84,-80],[144,-53]];a=a.map((v,i)=>v.map((n,j)=>lerp(n,aa[i][j],join)));b=b.map((v,i)=>v.map((n,j)=>lerp(n,bb[i][j],join)));}
  if(pose==='walk'){a=[[-64,-16+walk*9],[-72,42+walk*16]];b=[[62,-18-walk*8],[71,42-walk*16]];}
  limb(g,[[-39,-73],a[0],a[1]],color,22);limb(g,[[39,-73],b[0],b[1]],color,22);palm(g,...a[1],-.3);palm(g,...b[1],.3);
  oval(g,0,-151,41,53,C.white,C.ink,2.7,-.025);
  const hair=who?[[-40,-153],[-43,-176],[-24,-202],[2,-210],[28,-193],[43,-166],[22,-170],[6,-184],[-12,-169],[-28,-165]]:[[-41,-151],[-45,-176],[-21,-203],[10,-208],[35,-191],[43,-165],[19,-176],[0,-179],[-19,-165]];
  poly(g,hair,C.ink);
  if(who){oval(g,-29,-199,17,18,C.ink);poly(g,[[-36,-105],[40,-107],[32,-86],[-30,-86]],C.coral);poly(g,[[27,-93],[38,-92],[58,-41],[40,-49]],C.coral);}
  oval(g,-10+gaze*4,-151,2.6,3.7,C.ink,null);oval(g,14+gaze*4,-152,2.6,3.7,C.ink,null);path(g,[[gaze*27,-147],[gaze*33,-136],[gaze*24,-133]],C.ink,1.6);
  oval(g,gaze*23,-127,7,3,C.coral,null);path(g,[[-6,-118],[4,-113],[14,-119]],C.ink,1.8);
  g.restore();
}

function actionFor(line,index,total){
  const specified=String(line.action||'').toLowerCase();
  const aliases={memory:'photo',forgot:'photo',photo:'photo',remember:'mind',mind:'mind',bridge:'bridge',dear:'dear',kindness:'cup',cup:'cup',finale:'finale',final:'finale'};
  if(aliases[specified])return aliases[specified];
  const text=norm(line.text);
  if(text.includes('forgot'))return 'photo';if(text.includes('mind'))return 'mind';if(text.includes('kindness')||text.includes('cup'))return 'cup';if(text.includes('dear'))return 'dear';
  return index===total-1?'finale':'bridge';
}

export async function createArtwork({ctx:g,project,timeline}){
  const fonts=await loadFonts(project),lines=timeline.lines;
  cuts=[...new Set([0,project.duration,...lines.flatMap(l=>[l.start,l.start+(l.end-l.start)*.2,l.start+(l.end-l.start)*.52,l.start+(l.end-l.start)*.78,...(l.tokens||[]).map(w=>w.start)])])].filter(t=>t>=0&&t<=project.duration).sort((a,b)=>a-b);
  const grainCanvas=document.createElement('canvas');grainCanvas.width=960;grainCanvas.height=540;const gg=grainCanvas.getContext('2d');
  for(let i=0;i<11000;i++){gg.fillStyle=`rgba(39,47,38,${.018+noise(i)*.03})`;gg.fillRect(noise(i*3+1)*960,noise(i*3+2)*540,.4+noise(i+7)*1.6,.5+noise(i+9)*1.4);}
  const grain=g.createPattern(grainCanvas,'repeat');
  function base(dark=false){g.fillStyle=dark?C.night:C.paper;g.fillRect(0,0,1920,1080);g.save();g.globalAlpha=dark?.3:1;g.fillStyle=grain;g.fillRect(0,0,1920,1080);g.restore();}
  function type(text,x,y,size,maxWidth=1700,{color=C.ink,alpha=1,font=fonts.sans,weight=850,angle=0,align='center'}={}){fitText(g,text,x,y,size,maxWidth,{color,alpha,font,weight,angle,align});}
  function wordStart(line,needle){const token=(line.tokens||[]).find(w=>norm(w.text).includes(norm(needle)));return token?.start??line.start;}
  function showKeyword(t,line,text,x,y,size,width,options={}){const p=ease((t-wordStart(line,text)+.04)/.28);type(text,x+(1-p)*90,y+(1-p)*20,size,width,{...options,alpha:p});}
  function lens(p,views){let result=views[0].v;for(let i=1;i<views.length;i++){const {at,v}=views[i];if(p<at)break;const q=ease((p-at)/.12);result={x:lerp(result.x,v.x,q),y:lerp(result.y,v.y,q),zoom:lerp(result.zoom,v.zoom,q),angle:lerp(result.angle||0,v.angle||0,q)};}camera(g,result);}
  function ribbon(points,dark=false,width=3){path(g,points,dark?C.gold:C.coral,width,.88);}
  function horizon(y=768,dark=false){poly(g,[[-300,y+50],[220,y-30],[760,y+22],[1210,y-45],[2190,y+14],[2190,1080],[-300,1080]],dark?'#385057':C.mint,dark?C.dim:C.ink,2);path(g,[[-120,y+56],[480,y+16],[1190,y+42],[2030,y+14]],dark?C.dim:C.teal,2,.5);}
  function photo(x,y,w,h,angle,p,{pair=true,fade=false}={}){
    g.save();g.translate(x,y);g.rotate(angle);g.shadowColor='#1c2e3520';g.shadowBlur=28;g.shadowOffsetY=15;
    poly(g,[[-w/2,-h/2],[w/2,-h/2-4],[w/2+2,h/2],[-w/2-3,h/2+3]],C.white,'#63736c50',1.2);g.shadowColor='transparent';
    g.save();g.beginPath();g.rect(-w/2+28,-h/2+28,w-56,h-101);g.clip();g.fillStyle='#d2d8c8';g.fillRect(-w/2,-h/2,w,h);
    oval(g,120,-145,80,80,C.gold,null);poly(g,[[-w,-8],[-160,-50],[180,-15],[w,-70],[w,h],[-w,h]],'#afc1b3',C.teal,1.8);
    for(let i=0;i<7;i++)path(g,[[-500+i*164,-31],[-470+i*164,-151],[-420+i*164,-66]],C.teal,2,.25);
    const personScale=Math.min(.72,(h-112)/445),offset=Math.min(105,(w-80)*.2),bodyY=-22.5-personScale*13.5;
    figure(g,pair?-offset:0,bodyY,{s:personScale,pose:'greet',alpha:fade?1-p*.45:1});if(pair)figure(g,offset,bodyY,{s:personScale,who:1,gaze:-1,alpha:fade?1-p*.5:1});
    if(fade){
      // A feathered diagonal bleach reads as a fading print rather than pixels
      // cutting the faces into a staircase.
      const q=clamp(p*1.45),wash=g.createLinearGradient(-w/2,-h/2,w/2,h/2);
      wash.addColorStop(0,C.white);wash.addColorStop(Math.max(0,q-.2),C.white);wash.addColorStop(Math.min(1,q+.2),'#faf3e500');wash.addColorStop(1,'#faf3e500');g.fillStyle=wash;g.fillRect(-w/2,-h/2,w,h);
    }
    g.restore();type('KEEP / REMEMBER',0,h/2-34,17,w-80,{font:fonts.serif,weight:500,color:C.dim});g.restore();
  }
  function memory(t,line,p,index){
    const variant=index>1;
    lens(p,[{at:0,v:{x:960,y:474,zoom:1.02,angle:-.018}},{at:.21,v:{x:1008,y:485,zoom:1.22,angle:.025}},{at:.56,v:{x:930,y:470,zoom:.91,angle:-.022}},{at:.8,v:{x:960,y:460,zoom:1.07,angle:.008}}]);
    type('FORGOT',990,239,262,1750,{color:'#263a4024',weight:950});
    photo(467,584,515,407,-.16,p,{pair:false,fade:true});photo(1434,557,485,409,.13,p,{pair:true,fade:true});
    photo(976+Math.sin(t*.6)*8,523,774,570,lerp(-.06,.045,smooth(p)),clamp((p-.36)/.64),{pair:true,fade:true});
    const eraseTime=wordStart(line,'forgot'),erasure=ease((t-eraseTime-.18)/Math.max(.25,line.end-eraseTime-.2));g.save();g.beginPath();g.rect(210+erasure*1200,120,1500*(1-erasure),275);g.clip();showKeyword(t,line,'FORGOT',986,225,216,1550,{color:C.ink});g.restore();
    ribbon([[-100,829],[374,801],[660,761],[997,803],[1362,785],[2040,819]]);
    if(variant){const appear=ease((p-.5)/.4);g.save();g.globalAlpha=appear;figure(g,1291,612,{s:.69,pose:'remember',angle:-.02,gaze:-1});g.restore();}
    // Reversible fading makes forgetting visible while the thread refuses to vanish.
    for(let i=0;i<7;i++){const x=260+i*225+Math.sin(t+i)*8,y=160+noise(i)*550;poly(g,[[x,y],[x+29,y-8],[x+39,y+19],[x+4,y+30]],C.white,'#71827855',1);}
  }
  function mind(t,line,p){
    lens(p,[{at:0,v:{x:960,y:480,zoom:1.13,angle:.014}},{at:.24,v:{x:1060,y:481,zoom:.95,angle:-.022}},{at:.57,v:{x:1020,y:472,zoom:1.17,angle:.012}}]);
    horizon(749);type('MIND',1087,394,353,1230,{font:fonts.serif,weight:800,color:'#263a401f'});
    // One physical line curls from the old photograph into a generous memory map.
    const loops=[];for(let i=0;i<160;i++){const q=i/159,a=q*TAU*2.3;loops.push([960+Math.cos(a)*(190+q*387),448+Math.sin(a)*(80+q*200)]);}ribbon([[-90,833],[328,815],...loops,[1540,661],[2040,669]],false,3.5);
    const travel=smooth(p),orbit=travel*TAU;photo(960+Math.cos(orbit)*324,430+Math.sin(orbit)*112,273,214,-.08+Math.sin(orbit)*.11,p,{pair:true});
    figure(g,490,547,{s:.94,pose:'remember',phase:t*2,gaze:1});
    showKeyword(t,line,'MIND',1197,620,190,1030,{font:fonts.serif,weight:750});
    const mark=ease((p-.33)/.24);path(g,[[754,713],[1050,734],[1440,702]],C.coral,3.3,mark);
    oval(g,1590,250,60,60,C.gold,null);for(let i=0;i<5;i++)path(g,[[1540+i*26,149],[1557+i*26,176]],C.gold,2);
  }
  function bridge(t,line,p,index,dark=false){
    lens(p,[{at:0,v:{x:960,y:456,zoom:1.06,angle:-.014}},{at:.23,v:{x:1100,y:470,zoom:1.22,angle:.018}},{at:.55,v:{x:960,y:470,zoom:.92,angle:-.012}},{at:.8,v:{x:960,y:470,zoom:1.03,angle:0}}]);
    const fg=dark?C.white:C.ink;
    if(dark){const glow=g.createRadialGradient(970,456,0,970,456,850);glow.addColorStop(0,'#53615b');glow.addColorStop(1,C.night);g.fillStyle=glow;g.fillRect(-400,-400,2800,1600);}
    horizon(798,dark);
    const opening=ease(p*2.3),distance=lerp(430,270,opening),left=960-distance,right=960+distance;
    const pts=[[-90,871],[340,810],[720,667],[970,695],[1230,655],[1620,790],[2030,844]];
    path(g,pts,dark?C.dim:C.teal,35,.25);path(g,pts,fg,3,.75);
    for(let i=0;i<17;i++){const x=365+i*76,y=785-Math.sin((i/16)*Math.PI)*97;path(g,[[x,y-2],[x-5,y+44]],dark?C.dim:C.teal,2,.55);}
    figure(g,left,541,{s:.84,pose:'walk',phase:t*4.1,gaze:1});figure(g,right,541,{s:.84,pose:'walk',who:1,phase:t*4.1+Math.PI,gaze:-1});
    const acquaintances=norm(line.text).includes('acquaintance'),words=acquaintances?['AULD','ACQUAINTANCE']:['AULD','LANG','SYNE'],xs=acquaintances?[560,1240]:[430,961,1482];
    words.forEach((word,i)=>{const token=wordStart(line,word),appear=ease((t-token+.02)/.24);type(word,xs[i],270+Math.sin(p*TAU+i)*12,acquaintances?126:136,acquaintances?(i?950:390):490,{font:fonts.serif,weight:700,color:fg,alpha:.28+appear*.72});});
    ribbon([[-100,837],[420,818],[760,744],[960,742],[1180,742],[1610,815],[2050,843]],dark,3.4);
    if(dark)for(let i=0;i<24;i++){const x=80+noise(i*4)*1770,y=74+noise(i*4+1)*570;oval(g,x,y,1.5+noise(i+9)*1.8,1.5+noise(i+9)*1.8,C.gold,null);}
    else oval(g,960,432,76,76,null,'#b88f5b50',1.8);
  }
  function dear(t,line,p){
    lens(p,[{at:0,v:{x:960,y:465,zoom:1.23,angle:.017}},{at:.23,v:{x:970,y:465,zoom:.96,angle:-.015}},{at:.56,v:{x:960,y:455,zoom:1.19,angle:0}}]);
    const warmth=g.createRadialGradient(960,430,30,960,430,730);warmth.addColorStop(0,'#edd4a0');warmth.addColorStop(1,C.paper);g.fillStyle=warmth;g.fillRect(-300,-400,2600,1700);
    horizon(812);showKeyword(t,line,'DEAR',953,222,235,1460,{font:fonts.serif,weight:730,color:'#263a4050'});
    const join=ease((p-.08)/.65),spread=lerp(360,144,join);
    const touch=smooth((join-.45)/.53);figure(g,960-spread,557,{s:1,pose:'meet',join:touch,phase:t*3,gaze:1});figure(g,960+spread,557,{s:1,who:1,pose:'meet',join:touch,phase:t*3,gaze:-1});
    if(join>.97){oval(g,960,504,17,12,C.white,C.ink,2.4);const r=31+Math.exp(-(p-.56)*9)*8;oval(g,960,504,r,r,null,C.coral,1.5);}
    ribbon([[-100,856],[340,813],[650,781],[960,504],[1260,784],[1620,820],[2060,848]],false,3.4);
    for(let i=0;i<7;i++)oval(g,300+i*220,170+noise(i+20)*70,3.5,3.5,C.gold,null);
  }
  function cup(t,line,p){
    lens(p,[{at:0,v:{x:960,y:472,zoom:1.18,angle:-.022}},{at:.24,v:{x:1000,y:455,zoom:1.02,angle:.013}},{at:.55,v:{x:980,y:448,zoom:1.3,angle:-.014}},{at:.8,v:{x:960,y:480,zoom:.96,angle:0}}]);
    const wooden=[[-200,745],[2150,686],[2150,1100],[-200,1100]];poly(g,wooden,'#ccb695',C.ink,2);for(let i=0;i<11;i++)path(g,[[-200,760+i*27],[520,746+i*27],[1500,718+i*27],[2150,720+i*27]],'#8e77595c',1.2);
    type('KINDNESS',970,230,186,1730,{font:fonts.serif,weight:750,color:'#263a4050'});
    const giving=ease((p-.03)/.55),x=lerp(700,1005,giving),y=lerp(606,574,giving);
    // The cup is passed between the same costume colours seen in the portraits.
    limb(g,[[-120,653],[350,652],[x-130,y+9]],C.teal,73);palm(g,x-120,y+10,-.6);
    const receive=ease((p-.4)/.38);g.save();g.globalAlpha=receive;limb(g,[[2090,619],[1640,638],[x+139,y+34]],C.dim,72);poly(g,[[1440,600],[1484,599],[1503,674],[1459,677]],C.coral);palm(g,x+133,y+32,.6);g.restore();
    oval(g,x,y+136,176,24,C.white,C.ink,2.5);oval(g,x,y+130,135,12,null,'#8e775955',1.5);
    oval(g,x+116,y+20,54,52,null,C.ink,17);oval(g,x+116,y+20,51,49,null,C.white,12);
    const body=[[x-103,y-30],[x+103,y-30],[x+84,y+107],[x-73,y+111]];poly(g,body,C.white);hatch(g,body,C.teal);oval(g,x,y-31,104,26,C.white,C.ink,2.8);oval(g,x,y-31,86,17,'#a57448',C.ink,1.5);
    // A continuous steam line is the earlier landscape thread, now an act of care.
    for(let i=0;i<3;i++){const drift=Math.sin(t*1.5+i)*8;path(g,[[x-54+i*55,y-52],[x-93+i*61+drift,y-142],[x+13+i*30,y-206],[x-38+i*47+drift,y-294]],C.coral,2.7,.58);}
    if(p>.62){const appear=ease((p-.62)/.3);type('YET',1526,466,108,410,{font:fonts.serif,weight:700,alpha:appear});}
  }
  function finale(t,line,p){
    lens(p,[{at:0,v:{x:960,y:470,zoom:1.21,angle:.012}},{at:.2,v:{x:960,y:470,zoom:.95,angle:-.008}},{at:.57,v:{x:960,y:467,zoom:1.02,angle:0}}]);
    const sky=g.createLinearGradient(0,80,0,900);sky.addColorStop(0,C.night);sky.addColorStop(.65,'#6e7970');sky.addColorStop(1,'#c2b392');g.fillStyle=sky;g.fillRect(-400,-400,2800,1600);
    oval(g,960,482,173,173,'#dfbf7c',null);horizon(790,true);
    type('AULD LANG',960,185,152,1600,{font:fonts.serif,weight:700,color:C.white});type('SYNE',960,350,228,1360,{font:fonts.serif,weight:750,color:C.white});
    const towards=ease(p),scale=lerp(.89,.66,towards),yy=lerp(613,592,towards),spread=scale*144;
    figure(g,960-spread,yy,{s:scale,pose:'join',phase:t*3,angle:0,gaze:1});figure(g,960+spread,yy,{s:scale,who:1,pose:'join',phase:t*3,gaze:-1});oval(g,960,yy-53*scale,15*scale,10*scale,C.white,C.ink,2);
    ribbon([[-100,886],[460,850],[725,747],[960,yy-53*scale],[1210,754],[1530,850],[2040,875]],true,3.6);
    for(let i=0;i<27;i++){const x=80+noise(i*3+1)*1760,y=65+noise(i*3+2)*630;oval(g,x,y,1.4+noise(i+99)*1.9,1.4+noise(i+99)*1.9,C.gold,null);}
    // A printed border resolves the moving memory-world into one final keepsake.
    const border=ease((p-.64)/.3);g.save();g.globalAlpha=border;poly(g,[[55,43],[1863,43],[1863,902],[55,902]],null,'#f4e4ba60',1.8);g.restore();
  }
  function scene(index,t){const line=lines[index],p=clamp((t-line.start)/(line.end-line.start)),action=actionFor(line,index,lines.length),dark=action==='finale'||(action==='bridge'&&index>4);base(dark);g.save();g.beginPath();g.rect(0,0,1920,929);g.clip();if(action==='photo')memory(t,line,p,index);else if(action==='mind')mind(t,line,p);else if(action==='dear')dear(t,line,p);else if(action==='cup')cup(t,line,p);else if(action==='finale')finale(t,line,p);else bridge(t,line,p,index,dark);g.restore();return {dark,action};}
  function originalLyric(t,line,dark){
    if(!(t>=line.start&&t<line.end))return;
    const translated=line.translations?.['zh-CN']||line.zh||line.subtitle;
    // When a translation occupies the lower caption, retain the complete sung
    // source line as a small, separate reading line above it.
    if(!translated)return;
    const value=String(line.text||''),color=dark?C.white:C.ink;
    g.save();g.fillStyle=dark?'#22343be8':'#ece5d7e8';g.fillRect(0,858,1920,71);type(value,960,895,32,1580,{font:fonts.serif,weight:500,color});g.restore();
  }
  return {render(t){
    t=clamp(Number(t)||0,0,project.duration-1e-7);const d=segment(t,timeline);g.save();g.scale(project.width/1920,project.height/1080);g.lineCap='round';g.lineJoin='round';
    const state=scene(d.index,t);
    if(d.index>0&&d.local<.29){const p=ease(d.local/.29),edge=1920*(1-p);g.save();g.beginPath();g.rect(-2,0,edge+2,929);g.clip();g.translate(-p*165,0);scene(d.index-1,lines[d.index-1].end-.001);g.restore();path(g,[[edge,-20],[edge-5,350],[edge+5,645],[edge,935]],C.coral,4.3);}
    originalLyric(t,d.line,state.dark);g.fillStyle=state.dark?C.night:C.paper;g.fillRect(0,929,1920,151);g.save();g.fillStyle=grain;g.globalAlpha=.6;g.fillRect(0,929,1920,151);g.restore();
    path(g,[[145,943],[675,944],[1270,942],[1775,943]],state.dark?'#faf3e52d':'#263a4026',1.3);
    drawSubtitles(g,t,timeline,project,{color:state.dark?C.white:C.ink,accent:state.dark?C.gold:C.coral});g.restore();
  }};
}
