// Optional drawing helper. Art and caption layout remain project decisions.
export function currentLine(lines,t){return lines.find(l=>Number.isFinite(l.start)&&t>=l.start&&t<l.end);}
export function activeLines(lines,t){return lines.filter(l=>Number.isFinite(l.start)&&t>=l.start&&t<l.end);}
export function drawCaption(ctx,text,{width,height,color='#f4f3eb',font='sans-serif',size=height*.0375,y=height*.935}={}){if(!text)return;ctx.save();ctx.font=`500 ${size}px ${font}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,width/2,y,width*.86);ctx.restore();}
