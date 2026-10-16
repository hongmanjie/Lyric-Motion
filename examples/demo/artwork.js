// Original motion score. Every state depends on t, never on playback history.
export const readyToRender=true;
export const cuts=[0,4,8,12,16];
const C={paper:'#f4f1e9',ink:'#17191b',blue:'#3153fb',lime:'#dbfc59',pink:'#ff8aaf'};
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=v=>1-(1-clamp(v))**3;
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const lerp=(a,b,p)=>a+(b-a)*p;
const spring=v=>1-Math.exp(-clamp(v,0,3)*6)*Math.cos(clamp(v,0,3)*10);
const hash=n=>{let x=Math.sin(n*127.1+3.7)*43758.5453;return x-Math.floor(x);};

export async function createArtwork({canvas,ctx:g,project}){
 const face=new FontFace('DemoDisplay','url(/assets/display.ttf)',{weight:'100 900'});await face.load();document.fonts.add(face);await document.fonts.load('900 200px DemoDisplay');
 function text(s,x,y,size,color=C.ink,{weight=900,angle=0,sx=1,sy=1,alpha=1,stroke=0,align='center'}={}){
  g.save();g.translate(x,y);g.rotate(angle);g.scale(sx,sy);g.globalAlpha=clamp(alpha);g.font=`${weight} ${size}px DemoDisplay`;g.textAlign=align;g.textBaseline='middle';g.fillStyle=color;g.strokeStyle=color;g.lineWidth=stroke;
  if(stroke)g.strokeText(s,0,0);else g.fillText(s,0,0);g.restore();
 }
 function fit(s,x,y,size,max,color,opts={}){g.font=`${opts.weight||900} ${size}px DemoDisplay`;const width=g.measureText(s).width; text(s,x,y,size,color,{...opts,sx:(opts.sx||1)*Math.min(1,max/width)});}
 function circle(x,y,r,c){g.fillStyle=c;g.beginPath();g.arc(x,y,Math.max(.01,r),0,TAU);g.fill();}
 function pill(x,y,w,h,c,a=0){g.save();g.translate(x,y);g.rotate(a);g.fillStyle=c;g.beginPath();g.roundRect(-w/2,-h/2,w,h,h/2);g.fill();g.restore();}
 function line(x1,y1,x2,y2,c,w=3){g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();}
 function star(x,y,r,c,a=0,n=8){g.save();g.translate(x,y);g.rotate(a);g.fillStyle=c;g.beginPath();for(let i=0;i<n*2;i++){let v=i*Math.PI/n,rr=i%2?r*.51:r;g.lineTo(Math.cos(v)*rr,Math.sin(v)*rr);}g.closePath();g.fill();g.restore();}
 function ball(x,y,r,c){g.save();g.shadowColor='#11122225';g.shadowBlur=r*.25;g.shadowOffsetY=r*.15;const grad=g.createRadialGradient(x-r*.34,y-r*.45,r*.08,x,y,r);grad.addColorStop(0,'#fffce2');grad.addColorStop(.27,c);grad.addColorStop(1,c===C.lime?'#718e20':'#10209c');g.fillStyle=grad;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.restore();}
 function arrow(x,y,w,c,a=0){g.save();g.translate(x,y);g.rotate(a);g.fillStyle=c;g.beginPath();g.moveTo(-w*.5,-w*.12);g.lineTo(w*.1,-w*.12);g.lineTo(w*.1,-w*.34);g.lineTo(w*.5,0);g.lineTo(w*.1,w*.34);g.lineTo(w*.1,w*.12);g.lineTo(-w*.5,w*.12);g.closePath();g.fill();g.restore();}
 function label(s,x,y,c=C.ink,align='left'){text(s,x,y,22,c,{weight:550,align});}
 function micro(t,c){label('AN ORIGINAL MOTION SCORE',84,76,c);label('120 BPM / 16 SECONDS',1836,76,c,'right');let index=Math.min(4,Math.floor(t/4)+1);label(`0${index} / 04`,84,1006,c);for(let i=0;i<4;i++){g.fillStyle=c;g.globalAlpha=i===index-1?1:.19;g.fillRect(1690+i*39,995,25,4);}g.globalAlpha=1;}
 function paint(c){g.fillStyle=c;g.fillRect(0,0,1920,1080);}
 function flow(t){
  paint(C.paper);const u=t, impact=Math.exp(-((u%.5)/.055));
  // Direction accumulates in the letter spacing, then resolves as a word.
  const word='MOVE',step=330;
  for(let i=0;i<4;i++){
   const p=spring((u-i*.13+.05)/.45), x=960+(i-1.5)*step;
   text(word[i],x+lerp(-1050-180*i,0,p),530+Math.sin(i*1.7)*25*(1-clamp(u)),430,i===1?C.blue:C.ink,{angle:(1-p)*-.23,sy:1+(impact*.028),sx:1});
  }
  g.globalAlpha=ease((u-.65)/.5);arrow(1560+Math.sin(u*TAU)*10,790,190,C.blue,.02);g.globalAlpha=1;
  text('WITH THE',393,803,52,C.ink,{weight:600,alpha:ease((u-.55)/.25),align:'left'});
  text('BEAT',1000,800,130,C.ink,{angle:Math.sin(u*TAU)*.025,alpha:ease((u-.9)/.3)});
  // A split orbit follows the beat instead of becoming a background wallpaper.
  let bx=1610-Math.sin(u*1.7)*100,by=278+Math.cos(u*TAU)*16;
  ball(bx,by,74+impact*5,C.lime);line(109,264,1445,264,C.ink,2);
  for(let i=0;i<5;i++){const x=117+i*38;line(x,242,x+15,264,C.ink,2);}
  star(300,286,44,C.blue,u*.2,4);
  if(u>3.4){const z=smooth((u-3.4)/.6);g.fillStyle=C.blue;g.beginPath();g.moveTo(0,1080);for(let x=0;x<=1920;x+=20)g.lineTo(x,1080-z*1230+Math.sin(x*.004-u*3)*95);g.lineTo(1920,1080);g.fill();}
  micro(u,C.ink);
 }
 function waves(t){
  const u=t-4;paint(C.blue);
  // The old wipe becomes a waterline; the actual letter baselines rise and fall.
  const amp=lerp(0,53,ease(u/.8));
  label('LET ONE SMALL THING',115,195,C.paper);label('CHANGE THE WHOLE SURFACE.',115,229,C.paper);
  const chars='WAVES',step=300;
  for(let j=0;j<5;j++){
   const x=960+(j-2)*step, y=565+Math.sin(u*2.6+j*.77)*amp;
   text(chars[j],x,y+9,365,'#162eb4',{angle:Math.cos(u*2.6+j*.77)*.042});
   text(chars[j],x,y,365,C.paper,{angle:Math.cos(u*2.6+j*.77)*.042});
  }
  text('MAKE',1615,210,84,C.lime,{angle:-.11,weight:850,alpha:ease(u/.3)});
  // A bright buoy sends concentric elliptical ripples out into the frame.
  const sx=280+u*295,sy=820;
  for(let n=0;n<6;n++){let age=(u*.8+n/6)%1;g.strokeStyle=C.lime;g.lineWidth=2;g.globalAlpha=(1-age)*.65;g.beginPath();g.ellipse(sx,sy,20+age*410,5+age*85,0,0,TAU);g.stroke();}g.globalAlpha=1;
  ball(sx,sy-25-12*Math.sin(u*TAU),44,C.lime);
  star(1735,804,53,C.lime,-u*.7,8);
  if(u>3.38){let p=smooth((u-3.38)/.62);circle(960,540,p*1200,C.ink);}
  micro(t,C.paper);
 }
 function together(t){
  const u=t-8;paint(C.ink);let p=ease((u-.08)/1.1);
  text('COME',960,279,90,C.paper,{weight:500,alpha:ease(u/.4)});
  const word='TOGETHER';g.font='900 235px DemoDisplay';let widths=[...word].map(s=>g.measureText(s).width),total=widths.reduce((a,b)=>a+b,0)+7*7,x0=960-total/2;
  [...word].forEach((ch,i)=>{const x=x0+widths[i]/2;let pi=spring((u-.15-i*.08)/.65);text(ch,x+(i<4?-1:1)*(1-pi)*(650+80*Math.abs(i-3.5)),555+(1-pi)*Math.sin(i*2)*150,235,i===2||i===5?C.lime:C.paper,{angle:(1-pi)*(i-3.5)*.15});x0+=widths[i]+7;});
  // Distant objects meet, overshoot and keep a little shared momentum.
  const meet=spring((u-.3)/1.5),bob=Math.sin(u*TAU)*6;
  ball(lerp(400,900,meet),820+bob,61,C.blue);
  ball(lerp(1520,1020,meet),820-bob,61,C.lime);
  if(u>1.4){let q=ease((u-1.4)/.4);for(let i=0;i<10;i++){const a=i*TAU/10;line(960+Math.cos(a)*(125+u*8),820+Math.sin(a)*(92+u*8),960+Math.cos(a)*(145+u*8),820+Math.sin(a)*(112+u*8),C.paper,q*3);}}
  line(115,820,650,820,'#626364',2);line(1270,820,1805,820,'#626364',2);
  label('DIFFERENT SHAPES.',115,195,C.paper);label('SHARED MOMENTUM.',1805,195,C.paper,'right');
  if(u>3.4){let q=smooth((u-3.4)/.6);g.fillStyle=C.lime;g.fillRect(0,1080*(1-q),1920,1080*q);}
  micro(t,C.paper);
 }
 function yours(t){
  const u=t-12;paint(C.lime);
  const enter=ease(u/.55),pulse=Math.exp(-(u%.5)*13);
  // The aligned duo becomes a playful asterisk: a new object made together.
  g.save();g.translate(1515,295);g.rotate(-u*.25);for(let i=0;i<4;i++)pill(0,0,230,53,C.blue,i*Math.PI/4);g.restore();
  text('MAKE IT',120,270,95,C.ink,{weight:700,align:'left',alpha:enter});
  const word='YOURS',positions=[310,640,965,1265,1585];
  [...word].forEach((ch,i)=>{let p=spring((u-.1-i*.07)/.48);text(ch,positions[i],580+(1-p)*360,370,C.ink,{angle:(1-p)*.2*(i-2),sy:1+pulse*.012});});
  label('A SONG. AN IDEA. A WORLD IN MOTION.',120,850,C.ink);
  arrow(1720,850,140,C.ink,Math.sin(u)*.04);
  // Independent objects make room for the closing title; no preset scene card.
  const spin=u*.8;star(145,112,30,C.blue,spin,4);circle(1800,174,13,C.ink);
  text('LYRIC MOTION',960,969,31,C.ink,{weight:650,alpha:ease((u-1.5)/.5)});
  micro(t,C.ink);
 }
 return {render(t){t=clamp(Number(t)||0,0,15.999);g.save();g.setTransform(canvas.width/1920,0,0,canvas.height/1080,0,0);g.globalAlpha=1;g.lineCap='round';g.lineJoin='round';if(t<4)flow(t);else if(t<8)waves(t);else if(t<12)together(t);else yours(t);g.restore();}};
}
