// Original acting helpers. No shot list, palette or protagonist is prescribed.
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const mix=(a,b,p)=>a+(b-a)*p;
export const smooth=p=>{p=clamp(p);return p*p*(3-2*p)};
export const lerpFace=(a,b,p)=>Object.fromEntries(Object.keys({...a,...b}).map(key=>[key,mix(a[key]??0,b[key]??0,smooth(p))]));
export const expressions=Object.freeze({
 sad:{brow:.75,mouth:.65,eye:.82,look:0,tilt:.08,lean:.02},
 tired:{brow:.25,mouth:.2,eye:.35,look:-.1,tilt:.13,lean:-.035},
 surprised:{brow:-.5,mouth:0,eye:1.3,look:.8,tilt:-.05,lean:-.06},
 hopeful:{brow:-.15,mouth:-.28,eye:1.03,look:.8,tilt:-.025,lean:.035},
 calm:{brow:0,mouth:-.18,eye:.88,look:.3,tilt:0,lean:0},
 resolved:{brow:-.24,mouth:-.1,eye:.93,look:1,tilt:-.025,lean:.045},
});

/** Anticipation, main action and readable reaction are separate, absolute-time phases. */
export function actionPhase(time,{at=0,anticipation=.22,action=.65,reaction=.6}={}){
 if([time,at,anticipation,action,reaction].some(x=>!Number.isFinite(x))||anticipation<0||action<=0||reaction<0)throw Error('Action needs finite, nonnegative phases and a positive duration');
 const age=time-at,moveStart=anticipation,reactStart=anticipation+action;
 return {anticipation:smooth(age/Math.max(.001,anticipation)),action:smooth((age-moveStart)/action),reaction:smooth((age-reactStart)/Math.max(.001,reaction)),done:age>=reactStart+reaction};
}

export function handPositions({x=0,y=0,scale=1,facing=1,rotation=0,left=[-77,-73],right=[78,-73]}={}){
 const point=([px,py])=>[x+(px*Math.cos(rotation)-py*Math.sin(rotation))*scale*facing,y+(px*Math.sin(rotation)+py*Math.cos(rotation))*scale];
 return {left:point(left),right:point(right)};
}

/** Pin a prop's local grip to a world point. Draw with translate, scale, then rotate. */
export function placePropAt(target,anchor=[0,0],{scale=1,facing=1,rotation=0}={}){
 if(!Array.isArray(target)||target.length!==2||!Array.isArray(anchor)||anchor.length!==2||[...target,...anchor,scale,rotation].some(v=>!Number.isFinite(v))||scale<=0||![1,-1].includes(facing))throw Error('Prop placement needs finite points, positive scale and facing 1 or -1');
 const [px,py]=anchor,c=Math.cos(rotation),s=Math.sin(rotation);
 return {x:target[0]-(px*c-py*s)*scale*facing,y:target[1]-(px*s+py*c)*scale,scale,facing,rotation};
}

/** A small editable 2D rig. Draw your own props using its stable returned hand coordinates. */
export function createPuppetPainter({ctx,paint,ink,palette}){
 const C={ink:'#35434a',fox:'#cd925f',cream:'#ead4a4',cat:'#ddd8c6',coat:'#3f5963',blue:'#819ca4',red:'#ad5e4b',rabbit:'#eee4cd',yellow:'#cbb470',...palette};
 function oval(x,y,rx,ry,color,rotation=0){const p=new Path2D();p.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rotation,0,Math.PI*2);paint(p,color,true,2.7)}
 function shape(points,color,width=3){const p=new Path2D();points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();paint(p,color,true,width)}
 function limb(x,y,tx,ty,color,w=17){const mid=[mix(x,tx,.52)+5,mix(y,ty,.52)+12];ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(...mid,tx,ty);ctx.strokeStyle=C.ink;ctx.lineWidth=w+5;ctx.lineCap='round';ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=w;ctx.stroke();oval(tx,ty,13,12,C.cream)}
 function draw({x=960,y=850,scale=1,time=0,species='fox',facing=1,view='three-quarter',emotion='sad',face,walk=0,headTurn=0,lean=0,left,right,blink=true,coat,scarf=true,alpha=1,sit=false}={}){
  const f={...(expressions[emotion]||expressions.calm),...face},gait=Math.sin(time*7.3),bodyBob=Math.sin(time*2.05)*1.5-Math.abs(gait)*walk*8;
  const l=left||[-77-walk*gait*24,-70+walk*gait*13],r=right||[79+walk*gait*22,-70-walk*gait*10];
  ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y+bodyBob);ctx.scale(scale*facing,scale);ctx.rotate(lean+f.lean+walk*gait*.024);
  ctx.save();ctx.globalAlpha*=.12;oval(0,9,87,13,C.ink);ctx.restore();
  const back=view==='back',side=view==='side',skin=species==='fox'?C.fox:species==='rabbit'?C.rabbit:C.cat,cloth=coat||(species==='fox'?C.coat:species==='rabbit'?C.yellow:C.blue);
  if(species==='fox'){const tail=new Path2D();tail.moveTo(-50,-130);tail.bezierCurveTo(-132,-96,-156,-25,-83,-12);tail.quadraticCurveTo(-104,-67,-50,-130);paint(tail,C.fox,true,3);shape([[-124,-51],[-145,-28],[-116,-13],[-83,-12],[-102,-40]],C.cream,2)}
  if(!sit){for(const [index,foot]of [[0,-38],[1,38]]){const phase=index?gait:-gait,tx=foot+phase*walk*37,yy=Math.max(0,phase)*walk*-23;ink([[foot,-39],[tx,yy]],C.ink,17);oval(tx+7,yy+3,27,10,C.coat)}}else{ink([[-37,-46],[-61,8]],C.ink,18);ink([[38,-46],[65,8]],C.ink,18);oval(-60,8,28,11,C.coat);oval(68,8,28,11,C.coat)}
  shape([[-49,-188],[43,-190],[65,-35],[4,-23],[-68,-38]],cloth,3.2);
  if(!back){ink([[3,-176],[5,-45]],species==='fox'?'#9caaa8':'#d0d2bc',1.8);for(let i=0;i<3;i++)oval(15,-139+i*35,2.5,2.5,C.cream)}
  limb(-47,-168,...l,cloth);limb(47,-166,...r,cloth);
  ctx.save();ctx.translate(8+headTurn*6,-244+Math.sin(time*2.05-.7)*1.1);ctx.rotate(f.tilt+headTurn*.035+walk*gait*.015);
  if(species==='rabbit'){oval(-35,-70,17,68,skin,-.14);oval(35,-70,17,68,skin,.12);oval(-35,-77,7,43,'#caa996',-.14);oval(35,-77,7,43,'#caa996',.12);oval(0,0,75,67,skin)}
  else{const head=new Path2D();head.moveTo(-81,-3);head.lineTo(-75,-86);head.quadraticCurveTo(-70,-99,-48,-64);head.lineTo(-31,-54);head.quadraticCurveTo(0,-66,35,-53);head.lineTo(62,-86);head.quadraticCurveTo(79,-96,82,-70);head.lineTo(86,1);head.bezierCurveTo(75,70,-76,73,-81,-3);paint(head,skin,true,3.2);shape([[-69,-73],[-56,-47],[-40,-52]],'#ac7a65',1.2);shape([[70,-72],[61,-47],[43,-51]],'#ac7a65',1.2)}
  if(!back){
   const bias=side?26:view==='three-quarter'?12:0,near=side?.65:1;
   if(species!=='rabbit'){const muzzle=new Path2D();muzzle.moveTo(-68,-1);muzzle.quadraticCurveTo(-45,8,-24,30);muzzle.quadraticCurveTo(5,14,29,31);muzzle.quadraticCurveTo(58,4,76,-2);muzzle.quadraticCurveTo(52,56,5,56);muzzle.quadraticCurveTo(-48,52,-68,-1);paint(muzzle,C.cream,false,1)}
   const close=blink&&Math.cos(time*1.73)>.997,eyeH=close?1.7:8*f.eye;
   for(const [i,xx]of [[0,-28],[1,32]]){const px=xx*near+bias,look=f.look*4+headTurn*5;oval(px+look,-7,4.6,eyeH,C.ink);if(!close&&eyeH>5)oval(px+look-1,-10,1.3,2,C.cream);ink([[px-11,-30-f.brow*(i?8:-8)],[px+10,-30+f.brow*(i?6:-6)]],C.ink,2.6)}
   oval(bias+3,20,6,3.5,C.ink);ctx.beginPath();ctx.moveTo(bias-10,38);ctx.quadraticCurveTo(bias+4,38-f.mouth*19,bias+16,38);ctx.strokeStyle=C.ink;ctx.lineWidth=2.5;ctx.stroke();
  }
  if(scarf){shape([[-67,52],[69,47],[68,65],[-68,69]],species==='fox'?C.red:C.blue,2);const q=Math.sin(time*3.2-.6)*8;shape([[60,52],[111,47+q],[106,65+q],[60,65]],species==='fox'?C.red:C.blue,2)}
  ctx.restore();ctx.restore();
  return handPositions({x,y:y+bodyBob,scale,facing,rotation:lean+f.lean+walk*gait*.024,left:l,right:r});
 }
 return {draw};
}
