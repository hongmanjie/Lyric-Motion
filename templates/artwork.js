// This is a deliberately unfinished surface, not a visual style to extend.
// Replace with an original composition for the supplied song and brief.
export const readyToRender=false;
export const cuts=[];
export async function createArtwork({ctx,project}){
  return {render(){ctx.fillStyle='#151715';ctx.fillRect(0,0,project.width,project.height);ctx.fillStyle='#e9edde';ctx.font=`500 ${project.height*.04}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Waiting for original artwork',project.width/2,project.height/2);}};
}
