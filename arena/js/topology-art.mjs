import { projectPoint } from './projection.mjs';

export function paintTopology(renderer,ctx,state,view){
 const {map}=renderer,time=state?.time??performance.now()/1000,project=(p,z=0)=>projectPoint(view,p,z),s=view.scale;
 ctx.save();
 if(map.theme==='swamp')for(const portal of map.portals){
  const p=project(portal),pulse=.65+Math.sin(time*2+portal.x)*.2;
  ctx.globalAlpha=pulse;ctx.strokeStyle='#9bffe5';ctx.lineWidth=Math.max(.6,s*.035);ctx.beginPath();ctx.ellipse(p.x,p.y,s*.65,s*.23,0,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<6;i++){const t=(time*.35+i/6)%1;ctx.globalAlpha=Math.sin(t*Math.PI)*.55;ctx.fillStyle='#9cffe8';ctx.beginPath();ctx.arc(p.x+Math.sin(i*2+time)*s*.32,p.y-t*s*1.5,s*.027,0,Math.PI*2);ctx.fill();}
 }
 if(map.theme==='prison')for(const gate of map.gates){
  const phase=state?.arena?.gatePhase||0,closed=phase===1?gate.group==='red':gate.group==='green',color=gate.group==='red'?'#f29283':'#96d5ae';
  const at=(across,z=0)=>project({x:gate.x+(gate.axis==='y'?across:0),y:gate.y+(gate.axis==='x'?across:0)},z);
  const a=at(-1.16),b=at(1.16),middle=at(0);ctx.globalAlpha=1;ctx.lineCap='round';
  const glow=ctx.createRadialGradient(middle.x,middle.y,0,middle.x,middle.y,s*.9);glow.addColorStop(0,color+(closed?'63':'21'));glow.addColorStop(1,color+'00');ctx.fillStyle=glow;ctx.fillRect(middle.x-s,middle.y-s,s*2,s*2);
  ctx.strokeStyle='#12202cbd';ctx.lineWidth=s*.22;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  ctx.strokeStyle=closed?color+'88':'#94d9d141';ctx.lineWidth=s*.045;ctx.stroke();
  for(const sign of[-1,1]){
   const p=at(sign*1.18),top=at(sign*1.18,.85);ctx.strokeStyle='#27303b';ctx.lineWidth=s*.2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(top.x,top.y);ctx.stroke();ctx.strokeStyle='#839098';ctx.lineWidth=s*.08;ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.arc(top.x,top.y,s*.065,0,Math.PI*2);ctx.fill();
  }
  if(closed){
   for(let x=-1;x<=1.01;x+=.25){const p=at(x),q=at(x,.72);ctx.strokeStyle='#182333';ctx.lineWidth=s*.095;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.strokeStyle='#8d939d';ctx.lineWidth=s*.035;ctx.stroke();}
   for(const z of[.2,.7]){const p=at(-1.1,z),q=at(1.1,z);ctx.strokeStyle=z===.7?color:'#747c89';ctx.lineWidth=s*(z===.7?.08:.06);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}
  }
 }
 ctx.restore();
}
