import { loadFonts, clamp, lerp, ease, smooth, segment, cueAt, fitText, drawSubtitles, beat, noise, TAU, camera } from '../shared.mjs';

export const readyToRender = true;
export let cuts = [];

// This example is one authored story, not the implementation of the preset.
// New songs receive the creative profile and an unfinished artwork starter.
const C = { paper:'#f1eadb', white:'#fff7e7', ink:'#293b40', teal:'#568b85', mint:'#bdcbbb', coral:'#cc7661', gold:'#e5ba6a', slate:'#83999a', night:'#20343d', blue:'#385863' };
const actions = ['pressure', 'open', 'fall', 'reach'];

function trace(g, points, color=C.ink, width=3, seed=0, close=false, fill=null) {
  g.save();g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';
  g.beginPath();g.moveTo(points[0][0],points[0][1]);
  const count=points.length+(close?1:0);
  for(let i=1;i<count;i++){
    const a=points[i-1],b=points[i%points.length],n=Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/22));
    for(let j=1;j<=n;j++){const q=j/n,k=seed+i*43+j;g.lineTo(lerp(a[0],b[0],q)+(noise(k)-.5)*1.7,lerp(a[1],b[1],q)+(noise(k+7)-.5)*1.7);}
  }
  if(close)g.closePath();if(fill){g.fillStyle=fill;g.fill();}g.stroke();g.restore();
}
function curve(g, points, color=C.ink, width=3, alpha=1) {
  g.save();g.globalAlpha*=alpha;g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(...points[0]);
  for(let i=1;i<points.length-1;i++)g.quadraticCurveTo(...points[i],(points[i][0]+points[i+1][0])/2,(points[i][1]+points[i+1][1])/2);
  g.quadraticCurveTo(...points.at(-2),...points.at(-1));g.stroke();g.restore();
}
function ellipse(g,x,y,rx,ry,fill,stroke=C.ink,width=3,angle=0){g.save();g.translate(x,y);g.rotate(angle);g.beginPath();g.ellipse(0,0,rx,ry,0,0,TAU);if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}g.restore();}
function polygon(g,points,fill,seed=0,width=3,stroke=C.ink){trace(g,points,stroke,width,seed,true,fill);}
function pencil(g,points,color,seed=0){
  g.save();g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.clip();g.strokeStyle=color;g.lineWidth=1.1;g.globalAlpha*=.23;
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  for(let x=minX-150;x<maxX+150;x+=12+noise(x+seed)*5){g.beginPath();g.moveTo(x,minY-15);g.lineTo(x+110,maxY+20);g.stroke();}g.restore();
}
function limb(g,points,color,width=24,seed=0){trace(g,points,C.ink,width+5,seed);trace(g,points,color,width,seed);}
function hand(g,x,y,angle=0,color=C.white){
  g.save();g.translate(x,y);g.rotate(angle);ellipse(g,0,0,12,17,color,C.ink,2.5);curve(g,[[5,-9],[17,-17],[20,-12],[10,1]],C.ink,2);g.restore();
}

// Local origin is the character's waist, at y = 0. Silhouette and costume stay
// continuous across every camera setup; only joints, gaze and body angle vary.
function person(g,x,y,{scale=1,angle=0,pose='walk',color=C.teal,phase=0,partner=false,arms=null,face=1,smile=false}={}){
  g.save();g.translate(x,y);g.rotate(angle);g.scale(scale,scale);
  const worry=pose==='worry',fall=pose==='fall',lift=pose==='lift';
  const hipL=[-27,57],hipR=[26,57];
  const feet=fall?[[-95,161],[83,125]]:lift?[[-53,174],[39,179]]:[[-43+Math.sin(phase)*15,177],[48-Math.sin(phase)*16,179]];
  if(fall){trace(g,[hipL,[-56,113],feet[0]],C.slate,32,11);trace(g,[hipR,[63,116],feet[1]],C.slate,32,25);}
  limb(g,[hipL,[-33+(fall?-23:0),113],feet[0]],C.slate,25,11);limb(g,[hipR,[36+(fall?27:0),116],feet[1]],C.ink,25,25);
  polygon(g,[[feet[0][0]-16,feet[0][1]-1],[feet[0][0]+13,feet[0][1]-5],[feet[0][0]+28,feet[0][1]+11],[feet[0][0]-17,feet[0][1]+14]],C.ink,10,2,fall?C.slate:C.ink);
  polygon(g,[[feet[1][0]-17,feet[1][1]],[feet[1][0]+15,feet[1][1]-4],[feet[1][0]+29,feet[1][1]+10],[feet[1][0]-16,feet[1][1]+14]],C.ink,22,2,fall?C.slate:C.ink);
  const coat=[[-48,-72],[-22,-83],[24,-82],[49,-67],[59,58],[-54,60]];
  polygon(g,coat,color,31,3.5);pencil(g,coat,C.ink,27);
  curve(g,[[0,-72],[-2,-10],[1,56]],C.ink,2.2,.65);curve(g,[[-31,-27],[-30,1],[-10,0]],C.ink,2,.6);curve(g,[[18,-27],[38,-29],[36,-5],[19,-4]],C.ink,2,.6);
  polygon(g,[[-19,-89],[18,-89],[16,-67],[-1,-53],[-19,-69]],C.white,35,2.4);
  let left,right;
  if(arms){left=arms.left;right=arms.right;}
  else if(worry){const q=Math.sin(phase);left=[[-80-q*3,-86+q*5],[-49,-136+q*3]];right=[[77-q*3,-82-q*5],[48,-138-q*3]];}
  else if(fall){left=[[-92,-95],[-131,-155]];right=[[91,-107],[140,-182]];}
  else if(lift){left=[[-72,-28],[-93,17]];right=[[81,-30],[133,-79]];}
  else{const q=Math.sin(phase);left=[[-64,-9+q*6],[-65,56+q*11]];right=[[70,-38+q*3],[114,-88+q*5]];}
  limb(g,[[-43,-56],left[0],left[1]],color,23,53);limb(g,[[44,-57],right[0],right[1]],color,23,61);
  hand(g,...left[1],-.4);hand(g,...right[1],.5);
  // Cream face, dark swept hair, a small coral cheek and a legible gaze.
  ellipse(g,0,-132,46,55,C.white,C.ink,3.4,-.045);
  const hair=partner?[[-44,-137],[-47,-162],[-31,-185],[2,-192],[33,-179],[46,-150],[26,-156],[8,-174],[-7,-160],[-32,-153]]:[[-45,-132],[-50,-156],[-35,-180],[-8,-190],[23,-185],[47,-160],[43,-143],[17,-161],[-9,-153],[-29,-145]];
  polygon(g,hair,C.ink,90,fall?1.6:2.5,fall?C.slate:C.ink);
  if(partner){ellipse(g,-38,-179,18,20,C.ink,C.ink,2);polygon(g,[[-48,-83],[39,-84],[33,-62],[-40,-65]],C.gold,19,2);}
  const eyeY=worry?-127:-131;ellipse(g,face*16,eyeY,2.8,4.2,C.ink,null);ellipse(g,-face*11,eyeY-1,2.5,3.7,C.ink,null);
  curve(g,[[face*31,-127],[face*38,-116],[face*28,-113]],C.ink,1.8);
  ellipse(g,face*27,-108,8,3.5,C.coral,null);
  if(fall)ellipse(g,6,-100,4.5,6.5,null,C.ink,1.8);
  else curve(g,smile?[[-5,-99],[5,-92],[16,-99]]:worry?[[-11,-98],[2,-108],[16,-101]]:[[-2,-99],[8,-99],[14,-102]],C.ink,2.1);
  if(worry){curve(g,[[-18,-140],[-10,-144],[-3,-140]],C.ink,2.2);curve(g,[[10,-140],[17,-144],[24,-141]],C.ink,2.2);}
  g.restore();
}

function flower(g,x,y,size,phase=1,color=C.coral){
  const p=ease(phase);curve(g,[[x,y],[x-12,y-45*p],[x+7,y-103*p]],C.teal,3.4);
  ellipse(g,x-13,y-48*p,17*p,6*p,C.mint,C.teal,1.6,-.5);
  for(let i=0;i<5;i++){const a=i*TAU/5;ellipse(g,x+7+Math.cos(a)*size*p,y-103*p+Math.sin(a)*size*p,size*.7*p,size*.42*p,color,C.ink,1.5,a);}
  ellipse(g,x+7,y-103*p,size*.37*p,size*.37*p,C.gold,C.ink,1.6);
}
function cloud(g,x,y,size=1,color=C.white){
  g.save();g.translate(x,y);g.scale(size,size);g.fillStyle=color;g.beginPath();g.moveTo(-86,21);g.bezierCurveTo(-105,-16,-61,-46,-36,-30);g.bezierCurveTo(-20,-81,61,-64,61,-23);g.bezierCurveTo(105,-34,117,22,80,32);g.lineTo(-67,34);g.closePath();g.fill();g.strokeStyle=C.ink;g.lineWidth=2;g.stroke();g.restore();
}

export async function createArtwork({ctx:g,project,timeline}){
  const fonts=await loadFonts(project);
  cuts=[...new Set([0,project.duration,...timeline.lines.flatMap(l=>[l.start,l.start+(l.end-l.start)*.25,l.start+(l.end-l.start)*.58,...(l.cues||[]).map(c=>c.start)])])].filter(t=>t>=0&&t<=project.duration).sort((a,b)=>a-b);
  const paper=document.createElement('canvas');paper.width=960;paper.height=540;const pg=paper.getContext('2d');
  for(let i=0;i<12000;i++){pg.fillStyle=`rgba(47,41,31,${.018+noise(i+5)*.035})`;pg.fillRect(noise(i*3)*960,noise(i*3+1)*540,noise(i+9)*1.8+.4,noise(i+10)*1.4+.4);}
  const grain=g.createPattern(paper,'repeat');
  function paperBase(dark=false){g.fillStyle=dark?C.night:C.paper;g.fillRect(0,0,1920,1080);g.save();g.fillStyle=grain;g.globalAlpha=dark?.25:1;g.fillRect(0,0,1920,1080);g.restore();}
  function lens(p,settings){
    let current=settings[0].view;
    for(let i=1;i<settings.length;i++){
      const s=settings[i];if(p<s.at)break;const q=ease((p-s.at)/.105),prior=current;
      current={x:lerp(prior.x,s.view.x,q),y:lerp(prior.y,s.view.y,q),zoom:lerp(prior.zoom,s.view.zoom,q),angle:lerp(prior.angle||0,s.view.angle||0,q)};
    }
    camera(g,current);
  }
  function sourceNote(line,t,dark=false){
    const value=cueAt(t,line).cue.text||line.focus||line.text;
    g.save();g.globalAlpha=.9;fitText(g,value,165,142,38,1060,{font:fonts.serif,weight:500,color:dark?C.paper:C.ink,align:'left'});
    trace(g,[[166,177],[344,181],[500,175]],dark?C.coral:C.teal,2.3,72);g.restore();
  }
  function city(t,line,p){
    const v=ease(p*2.1),shrink=Math.sin(p*Math.PI)*18;
    lens(p,[{at:0,view:{x:960,y:470,zoom:1,angle:-.012}},{at:.26,view:{x:1030,y:494,zoom:1.25,angle:.012}},{at:.59,view:{x:920,y:468,zoom:1.02,angle:-.025}}]);
    // Tall, inward leaning buildings behave like the pressure surrounding a person.
    for(let i=0;i<9;i++){
      const side=i<5?-1:1,xx=i<5?i*180-75:1265+(i-5)*175;
      const h=370+noise(i+40)*290,tilt=side===-1?40+v*35:-40-v*35;
      const pts=[[xx,782],[xx+tilt,782-h],[xx+165+tilt,782-h-14],[xx+165,782]];
      polygon(g,pts,i%2?C.mint:'#d9ddd0',i*17,2.5);pencil(g,pts,C.teal,i);
      for(let row=0;row<5;row++)for(let col=0;col<2;col++){
        const yy=782-h+52+row*62,offset=(782-yy)/h*tilt;
        polygon(g,[[xx+28+col*66+offset,yy],[xx+57+col*66+offset,yy-2],[xx+57+col*66+offset,yy+24],[xx+28+col*66+offset,yy+26]],i%3?C.paper:C.gold,i+row*2+col,1.3,C.slate);
      }
    }
    curve(g,[[-100,811],[450,771],[980,797],[1500,767],[2050,803]],C.ink,3);
    for(let i=0;i<10;i++)trace(g,[[130+i*172,842],[155+i*172,846]],C.slate,2,i);
    const actorX=972+Math.sin(t*2)*5,actorY=606+Math.sin(t*5)*2;
    ellipse(g,actorX+3,804,145,17,'#293b4015',null);person(g,actorX,actorY,{scale:1.01,pose:'worry',phase:t*5,angle:Math.sin(t*2)*.016});
    // Looping pencil marks are thought-pressure, not decorative floating particles.
    const coil=[];for(let k=0;k<150;k++){const a=k*.27;coil.push([actorX+Math.cos(a)*lerp(118,65,k/149),actorY-268+Math.sin(a)*(30+shrink)]);}curve(g,coil,C.ink,2.2,.7);
    for(let i=0;i<7;i++){const x=510+i*153+Math.sin(t*1.8+i)*22,y=240+noise(i+2)*110;trace(g,[[x-18,y],[x+17,y-9],[x+5,y+11],[x+30,y+7]],C.coral,2,i*11);}
    // A red line slips from the city into the next shot as a small promise.
    curve(g,[[-70,850],[420,830],[720,838],[1040,822],[1450,810],[2000,824]],C.coral,3.2,.8);
  }
  function opening(t,line,p){
    lens(p,[{at:0,view:{x:1020,y:480,zoom:1.18,angle:.025}},{at:.24,view:{x:1075,y:462,zoom:.93,angle:-.012}},{at:.61,view:{x:1210,y:475,zoom:1.09,angle:.01}}]);
    const open=ease(p*3.7),walk=ease((p-.08)/.65),sky='#dce5d5';
    // The opening occupies the whole stage, rather than a title on a backdrop.
    polygon(g,[[320,818],[359,253],[671,125],[1572,175],[1654,821]],sky,90,3.5);
    ellipse(g,1255,306,95,95,C.gold,C.ink,2.7);
    for(let i=0;i<12;i++){const a=i*TAU/12;trace(g,[[1255+Math.cos(a)*111,306+Math.sin(a)*111],[1255+Math.cos(a)*131,306+Math.sin(a)*131]],C.gold,3,i);}
    cloud(g,699+Math.sin(t*.4)*11,325,1.12);cloud(g,1458,425,.67);
    polygon(g,[[286,698],[686,589],[1130,643],[1721,566],[1820,880],[243,876]],C.mint,35,2.5);
    curve(g,[[350,728],[750,650],[1110,697],[1621,627]],C.teal,2.2,.7);
    // A wall slides away; its former boundary remains the garden's path.
    const boundary=lerp(1240,350,open);
    polygon(g,[[-250,-100],[boundary,-100],[boundary+24,875],[-250,900]],C.paper,62,3.7);
    trace(g,[[boundary+24,887],[boundary-5,433],[boundary,171]],C.ink,3.7,27);
    polygon(g,[[345,840],[960,731],[1080,746],[610,889]],C.white,78,2.3);
    curve(g,[[-80,851],[330,845],[650,782],[960,741],[1400,719],[1990,735]],C.coral,3.1,.8);
    const px=lerp(760,1110,walk),py=lerp(629,595,walk);
    ellipse(g,px,py+184,124,15,'#293b4015',null);person(g,px,py,{scale:1,pose:'walk',phase:t*6,angle:lerp(-.06,.025,walk),smile:true});
    for(let i=0;i<13;i++){const x=430+i*109,y=775+noise(i+50)*100;flower(g,x,y,16+noise(i+6)*9,clamp((p-.07-i*.022)*4),i%3?C.white:C.coral);}
    curve(g,[[1331,557],[1405,536],[1470,553]],C.teal,2,.65);
  }
  function night(t,line,p){
    lens(p,[{at:0,view:{x:1020,y:486,zoom:1.14,angle:.048}},{at:.26,view:{x:985,y:488,zoom:.94,angle:-.045}},{at:.65,view:{x:1044,y:464,zoom:1.22,angle:.026}}]);
    const descent=ease(p),drift=Math.sin(t*2.7)*7;
    // The path loses its support; the same lead is now caught between layers.
    polygon(g,[[-120,680],[609,476],[820,493],[665,572],[-120,837]],'#b8c8bd',25,3,C.paper);
    pencil(g,[[-120,680],[609,476],[820,493],[665,572],[-120,837]],C.ink,36);
    for(let i=0;i<5;i++){const y=155+i*178;curve(g,[[1310,y-80],[1530,y-26],[1750,y-11],[1990,y+35]],C.slate,2,.32);}
    for(let i=0;i<5;i++){const x=400+i*280;curve(g,[[x,61],[x-149,314],[x-60,612],[x+100,965]],C.blue,2.3,.6);}
    for(let i=0;i<24;i++){const x=160+noise(i*4+2)*1600,y=80+noise(i*4+3)*760,r=2+noise(i+18)*3;trace(g,[[x-r*2,y],[x+r*2,y]],C.paper,1.8,i);trace(g,[[x,y-r*2],[x,y+r*2]],C.paper,1.8,i+8);}
    ellipse(g,1560,260,80,80,C.paper,null);ellipse(g,1587,238,72,72,C.night,null);
    const x=lerp(901,1015,descent)+drift,y=lerp(397,601,descent);
    // Warm contour under the falling body keeps the silhouette readable.
    ellipse(g,x,y-52,150,240,'#f1eadb08',null,0,.2);
    person(g,x,y,{scale:1.05,angle:lerp(.18,-.22,descent),pose:'fall',color:C.teal});
    const hx=x+Math.cos(-.22)*147+Math.sin(-.22)*190,hy=y+Math.sin(-.22)*147-Math.cos(-.22)*190;
    curve(g,[[-50,871],[544,832],[812,745],[1201,691],[1325,513],[hx,hy]],C.coral,4.2,.95);
    // A distinct coral sleeve enters from beyond the scene near the final phrase.
    const reach=ease((p-.57)/.43);g.save();g.globalAlpha=reach;limb(g,[[1590,140],[1447,246],[1290,365]],C.coral,35,78);hand(g,1277,380,.7);g.restore();
    for(let i=0;i<5;i++){const px=720+i*70+noise(i)*50,py=620+i*30+descent*70;polygon(g,[[px,py],[px+23,py+12],[px+9,py+31],[px-8,py+22]],C.paper,i,1.5,C.slate);}
  }
  function reaching(t,line,p){
    const pull=smooth((p-.17)/.64);
    lens(p,[{at:0,view:{x:960,y:448,zoom:1.5,angle:-.025}},{at:.25,view:{x:955,y:505,zoom:.96,angle:.015}},{at:.65,view:{x:956,y:482,zoom:1.07,angle:-.007}}]);
    // A shared hand position makes the narrative resolution physically legible.
    const grip=[960,450],leftX=lerp(760,815,pull),rightX=lerp(1160,1105,pull),leftY=lerp(619,600,pull),rightY=590;
    const halo=g.createRadialGradient(968,455,10,968,455,665);halo.addColorStop(0,'#f2d494');halo.addColorStop(.65,'#f0e3c3');halo.addColorStop(1,C.paper);g.fillStyle=halo;g.fillRect(-600,-500,3100,1800);
    ellipse(g,960,487,345+pull*45,345+pull*45,null,'#c5aa793f',1.8);
    for(let i=0;i<10;i++){const a=i*TAU/10;trace(g,[[960+Math.cos(a)*408,487+Math.sin(a)*408],[960+Math.cos(a)*435,487+Math.sin(a)*435]],C.gold,2,i);}
    polygon(g,[[-100,826],[370,797],[700,818],[1010,807],[1390,774],[2050,816],[2050,1100],[-100,1100]],'#c5d1bb',50,3);
    curve(g,[[-120,841],[520,828],[950,825],[1440,816],[2010,833]],C.teal,2.7,.8);
    ellipse(g,leftX,809,131,16,'#293b4015',null);ellipse(g,rightX,809,131,16,'#293b4015',null);
    const leftHand=[grip[0]-leftX,grip[1]-leftY],rightHand=[grip[0]-rightX,grip[1]-rightY];
    person(g,leftX,leftY,{pose:'lift',color:C.teal,angle:0,smile:true,face:1,arms:{left:[[-62,-10],[-75,53]],right:[[leftHand[0]*.55,-96],leftHand]}});
    person(g,rightX,rightY,{pose:'lift',color:C.coral,partner:true,angle:0,smile:true,face:-1,arms:{left:[[rightHand[0]*.54,-98],rightHand],right:[[73,-6],[81,50]]}});
    // Render the touching palms above both sleeves; a warm pencil ring is brief.
    ellipse(g,...grip,16,12,C.white,C.ink,2.7,-.16);trace(g,[[950,445],[958,453],[970,448]],C.ink,1.5,4);
    const burst=Math.exp(-Math.max(0,p-.08)*10);for(let i=0;i<7;i++){const a=i*TAU/7;trace(g,[[960+Math.cos(a)*36,450+Math.sin(a)*36],[960+Math.cos(a)*(38+22*burst),450+Math.sin(a)*(38+22*burst)]],C.coral,2.4,i);}
    curve(g,[[-70,850],[560,851],[821,833],[960,450],[1125,837],[1510,838],[2010,846]],C.coral,2.8,.75);
    for(let i=0;i<10;i++)flower(g,204+i*172,852+noise(i+5)*30,15+noise(i+9)*9,clamp((p-.25)*3-i*.04),i%2?C.white:C.gold);
    cloud(g,365,256,.77);cloud(g,1543,292,.72);
  }
  function scene(index,t){
    const line=timeline.lines[index],p=clamp((t-line.start)/(line.end-line.start)),action=line.action||actions[index%4],dark=action==='fall';
    paperBase(dark);g.save();g.beginPath();g.rect(0,0,1920,928);g.clip();
    if(action==='pressure')city(t,line,p);else if(action==='open')opening(t,line,p);else if(action==='fall')night(t,line,p);else reaching(t,line,p);
    g.restore();sourceNote(line,t,dark);return {dark,action};
  }
  return {render(t){
    t=clamp(Number(t)||0,0,project.duration-1e-7);const data=segment(t,timeline);
    g.save();g.scale(project.width/1920,project.height/1080);g.lineCap='round';g.lineJoin='round';
    const state=scene(data.index,t);
    if(data.index>0&&data.local<.34){
      const p=ease(data.local/.34),edge=1920*(1-p);
      g.save();g.beginPath();
      if(state.action==='fall'){
        // The garden opens into the void, continuing the story's loss of support.
        g.rect(-2,-2,1924,932);g.moveTo(1020+Math.max(.01,p*2300),440);g.arc(1020,440,Math.max(.01,p*2300),0,TAU);g.clip('evenodd');
      }else if(state.action==='reach'){
        // Warm light and the entering sleeve descend along the same diagonal.
        const y=lerp(-170,1110,p);g.moveTo(-2,y-80);g.lineTo(1922,y+80);g.lineTo(1922,930);g.lineTo(-2,930);g.closePath();g.clip();
      }else{g.rect(0,0,edge,928);g.clip();g.translate(-p*110,0);}
      scene(data.index-1,timeline.lines[data.index-1].end-.001);g.restore();
      if(state.action==='fall')ellipse(g,1020,440,p*2300,p*2300,null,C.coral,3.5);
      else if(state.action==='reach'){const y=lerp(-170,1110,p);trace(g,[[-20,y-80],[650,y-23],[1260,y+27],[1940,y+80]],C.gold,4,19);}
      else trace(g,[[edge,-20],[edge-8,294],[edge+7,612],[edge-3,928]],C.coral,4.5,87);
    }
    g.fillStyle=state.dark?C.night:C.paper;g.fillRect(0,928,1920,152);g.save();g.fillStyle=grain;g.globalAlpha=.6;g.fillRect(0,928,1920,152);g.restore();
    trace(g,[[155,940],[760,943],[1210,939],[1765,941]],state.dark?'#f1eadb20':'#293b401c',1.5,51);
    drawSubtitles(g,t,timeline,project,{color:state.dark?C.paper:C.ink,accent:state.dark?C.coral:C.teal});
    g.restore();
  }};
}
