export const MAP = Object.freeze({
  width:32,height:22,roadWidth:2.2,
  bases:[{x:3,y:11},{x:29,y:11}],
  routes:[
    [{x:3,y:11},{x:4,y:6},{x:9,y:3},{x:16,y:3},{x:23,y:3},{x:28,y:6},{x:29,y:11}],
    [{x:3,y:11},{x:9,y:11},{x:16,y:11},{x:23,y:11},{x:29,y:11}],
    [{x:3,y:11},{x:4,y:16},{x:9,y:19},{x:16,y:19},{x:23,y:19},{x:28,y:16},{x:29,y:11}],
  ],
  nodes:[{id:'north',name:'Northwell',x:16,y:3},{id:'center',name:'Heartwell',x:16,y:11},{id:'south',name:'Southwell',x:16,y:19}],
});
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function projectSegment(p,a,b) {
  const dx=b.x-a.x,dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
  const point={x:a.x+t*dx,y:a.y+t*dy};
  return {...point,t,distance:distance(p,point)};
}
export const routeFor=(lane,side)=>side===1?[...MAP.routes[lane]].reverse():[...MAP.routes[lane]];
export function closestRoute(p) {
  let best={lane:1,segment:0,distance:Infinity,x:p.x,y:p.y};
  MAP.routes.forEach((route,lane)=>route.slice(1).forEach((b,i)=>{
    const hit=projectSegment(p,route[i],b);
    if(hit.distance<best.distance)best={...hit,lane,segment:i};
  }));
  return best;
}
export function isDeployable(p,side,buildings=[]) {
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<1||p.x>31||p.y<1||p.y>21)return false;
  if(side===0?p.x>=15.5:p.x<=16.5)return false;
  if(closestRoute(p).distance>MAP.roadWidth/2-.1)return false;
  if(MAP.bases.some(base=>distance(p,base)<1.65))return false;
  return !buildings.some(b=>b.alive!==false&&distance(p,b)<(b.radius||.45)+.35);
}
