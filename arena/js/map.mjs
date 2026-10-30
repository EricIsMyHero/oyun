import { RULES } from './rules.mjs';

// Equal 35-tile routes put each pump 17.5 walking tiles from either castle.
// Bends change the road geometry, never the source-to-tile conversion.
const PUMP_DISTANCE=17.5;
const centralLeg=(PUMP_DISTANCE**2+48)/(4*PUMP_DISTANCE);
const centralSway=Math.sqrt(centralLeg**2-16);
let bendLow=3,bendHigh=6;
for(let i=0;i<52;i++) {
  const y=(bendLow+bendHigh)/2;
  if(Math.hypot(1,11-y)+Math.hypot(4,y-3)>PUMP_DISTANCE-7)bendLow=y;
  else bendHigh=y;
}
const northBendY=(bendLow+bendHigh)/2;

export const MAP = Object.freeze({
  width:32,height:22,roadWidth:2.2,castleRadius:1.05,pumpDistance:PUMP_DISTANCE,
  courtyard:Object.freeze({rear:1,front:2.5,side:1}),
  bases:[{x:4,y:11},{x:28,y:11}],
  routes:[
    [{x:4,y:11},{x:5,y:northBendY},{x:9,y:3},{x:16,y:3},{x:23,y:3},{x:27,y:northBendY},{x:28,y:11}],
    [{x:4,y:11},{x:8,y:11-centralSway},{x:12,y:11+centralSway},{x:16,y:11},{x:20,y:11-centralSway},{x:24,y:11+centralSway},{x:28,y:11}],
    [{x:4,y:11},{x:5,y:22-northBendY},{x:9,y:19},{x:16,y:19},{x:23,y:19},{x:27,y:22-northBendY},{x:28,y:11}],
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
export function routeLength(points) {
  return points.slice(1).reduce((total,p,i)=>total+distance(points[i],p),0);
}
export function pointOnRoute(lane,side,walkingDistance) {
  const route=routeFor(lane,side);
  let remaining=Math.max(0,walkingDistance);
  for(let i=1;i<route.length;i++) {
    const length=distance(route[i-1],route[i]);
    if(remaining<=length) {
      const t=remaining/(length||1);
      return {x:route[i-1].x+(route[i].x-route[i-1].x)*t,y:route[i-1].y+(route[i].y-route[i-1].y)*t};
    }
    remaining-=length;
  }
  return {...route.at(-1)};
}
export function closestRoute(p) {
  let best={lane:1,segment:0,distance:Infinity,x:p.x,y:p.y};
  MAP.routes.forEach((route,lane)=>route.slice(1).forEach((b,i)=>{
    const hit=projectSegment(p,route[i],b);
    if(hit.distance<best.distance)best={...hit,lane,segment:i};
  }));
  return best;
}
export function courtyardFor(side) {
  const base=MAP.bases[side],r=MAP.castleRadius,pad=MAP.courtyard;
  return {
    minX:base.x-r-(side===0?pad.rear:pad.front),
    maxX:base.x+r+(side===0?pad.front:pad.rear),
    minY:base.y-r-pad.side,maxY:base.y+r+pad.side,
  };
}
export function isCourtyard(p,side) {
  if(!p||(side!==0&&side!==1))return false;
  const b=courtyardFor(side);
  return p.x>=b.minX&&p.x<=b.maxX&&p.y>=b.minY&&p.y<=b.maxY;
}
export function isWalkable(p) {
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>MAP.width||p.y<0||p.y>MAP.height)return false;
  return isCourtyard(p,0)||isCourtyard(p,1)||closestRoute(p).distance<=MAP.roadWidth/2-.05;
}
export function isDeployable(p,side,buildings=[]) {
  if((side!==0&&side!==1)||!isWalkable(p))return false;
  if(distance(p,MAP.bases[side])>RULES.castleRange+1e-9)return false;
  if(!isCourtyard(p,side)&&closestRoute(p).distance>MAP.roadWidth/2-.1)return false;
  if(MAP.bases.some(base=>distance(p,base)<MAP.castleRadius+.35))return false;
  return !buildings.some(b=>b.alive!==false&&distance(p,b)<(b.radius||.45)+.35);
}
