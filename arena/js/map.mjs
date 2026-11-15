import { RULES } from './rules.mjs';

// The straight center road puts its pump 17.5 tiles from either castle.
// Outer roads take longer forest routes; no bends are needed to pad the center.
const PUMP_DISTANCE=17.5;

export const MAP = Object.freeze({
  id:'verdant',name:'Verdant Basin',theme:'forest',description:'Three routes, three mana pumps. No environmental effects.',
  width:43,height:28,roadWidth:2.2,castleRadius:1.05,pumpDistance:PUMP_DISTANCE,
  courtyard:Object.freeze({rear:1,front:2.5,side:1}),
  bases:[{x:4,y:14},{x:39,y:14}],
  routes:[
    [{x:4,y:14},{x:6,y:8},{x:11,y:4},{x:21.5,y:4},{x:32,y:4},{x:37,y:8},{x:39,y:14}],
    [{x:4,y:14},{x:10,y:14},{x:16,y:14},{x:21.5,y:14},{x:27,y:14},{x:33,y:14},{x:39,y:14}],
    [{x:4,y:14},{x:6,y:20},{x:11,y:24},{x:21.5,y:24},{x:32,y:24},{x:37,y:20},{x:39,y:14}],
  ],
  nodes:[{id:'north',name:'Northwell',x:21.5,y:4},{id:'center',name:'Heartwell',x:21.5,y:14},{id:'south',name:'Southwell',x:21.5,y:24}],
});
// Geometry belongs to a match. Keeping definitions immutable prevents one match
// (or a replay/test) from changing another match's routes and camera bounds.
function freezeTree(value) {
  if(value&&typeof value==='object'){Object.values(value).forEach(freezeTree);Object.freeze(value);}
  return value;
}
freezeTree(MAP);
export const ARENAS=freezeTree({
  verdant:MAP,
  waterfall:{
    id:'waterfall',name:'Cascade Hollow',theme:'waterfall',projection:'portrait',
    description:'Two routes cross the waterfall. Ground cards move 15% slower in water; 33% during a surge.',
    width:29,height:22,roadWidth:2.2,castleRadius:1.05,pumpDistance:12.5,
    courtyard:{rear:1,front:2.5,side:1},bases:[{x:4,y:11},{x:25,y:11}],
    routes:[[{x:4,y:11},{x:7,y:7},{x:22,y:7},{x:25,y:11}],
            [{x:4,y:11},{x:7,y:15},{x:22,y:15},{x:25,y:11}]],
    nodes:[{id:'cascade',name:'Cascade Well',x:14.5,y:7}],
    river:[{x:9,y:-1},{x:10,y:3},{x:11,y:7},{x:14.5,y:11},{x:18,y:15},{x:19,y:19},{x:20,y:23}],
    waterWidth:2.4,
  },
  lava:{
    id:'lava',name:'Ember Rift',theme:'lava',projection:'portrait',
    description:'One route, one mana orb. The central 5 × 5 basin fills with lava every 45 seconds for 15 seconds.',
    width:38,height:18,roadWidth:2.2,castleRadius:1.05,pumpDistance:15,
    courtyard:{rear:1,front:2.5,side:1},bases:[{x:4,y:9},{x:34,y:9}],
    routes:[[{x:4,y:9},{x:19,y:9},{x:34,y:9}]],nodes:[],
    center:{x:19,y:9},plaza:{minX:16.5,maxX:21.5,minY:6.5,maxY:11.5},
  },
});
export function arenaFor(id='verdant',random=Math.random) {
  if(id==='random'){const maps=Object.values(ARENAS);return maps[Math.min(maps.length-1,Math.floor(random()*maps.length))];}
  if(!ARENAS[id])throw new Error(`Unknown arena: ${id}`);
  return ARENAS[id];
}
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function projectSegment(p,a,b) {
  const dx=b.x-a.x,dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
  const point={x:a.x+t*dx,y:a.y+t*dy};
  return {...point,t,distance:distance(p,point)};
}
export const routeFor=(lane,side,map=MAP)=>side===1?[...map.routes[lane]].reverse():[...map.routes[lane]];
export function routeLength(points) {
  return points.slice(1).reduce((total,p,i)=>total+distance(points[i],p),0);
}
export function pointOnRoute(lane,side,walkingDistance,map=MAP) {
  const route=routeFor(lane,side,map);
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
export function closestRoute(p,map=MAP) {
  let best={lane:0,segment:0,distance:Infinity,x:p.x,y:p.y};
  map.routes.forEach((route,lane)=>route.slice(1).forEach((b,i)=>{
    const hit=projectSegment(p,route[i],b);
    if(hit.distance<best.distance)best={...hit,lane,segment:i};
  }));
  return best;
}
export function courtyardFor(side,map=MAP) {
  const base=map.bases[side],r=map.castleRadius,pad=map.courtyard;
  return {
    minX:base.x-r-(side===0?pad.rear:pad.front),
    maxX:base.x+r+(side===0?pad.front:pad.rear),
    minY:base.y-r-pad.side,maxY:base.y+r+pad.side,
  };
}
export function isCourtyard(p,side,map=MAP) {
  if(!p||(side!==0&&side!==1))return false;
  const b=courtyardFor(side,map);
  return p.x>=b.minX&&p.x<=b.maxX&&p.y>=b.minY&&p.y<=b.maxY;
}
export function isWalkable(p,map=MAP) {
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>map.width||p.y<0||p.y>map.height)return false;
  return isCourtyard(p,0,map)||isCourtyard(p,1,map)||inRect(p,map.plaza)||closestRoute(p,map).distance<=map.roadWidth/2-.05;
}
// Trace the whole segment, so a dash cannot cross a gap and reappear on a road.
export function clipWalkableSegment(from,to,padding=.5,map=MAP) {
  const valid=p=>p.x>=padding&&p.x<=map.width-padding&&p.y>=padding&&p.y<=map.height-padding&&isWalkable(p,map);
  if(!valid(from)||!Number.isFinite(to?.x)||!Number.isFinite(to?.y))return {x:from.x,y:from.y,blocked:true};
  const length=distance(from,to),steps=Math.max(1,Math.ceil(length/.05));
  const at=t=>({x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t});
  for(let i=1;i<=steps;i++)if(!valid(at(i/steps))){
    let low=(i-1)/steps,high=i/steps;
    for(let j=0;j<20;j++){const middle=(low+high)/2;if(valid(at(middle)))low=middle;else high=middle;}
    return {...at(low),blocked:true};
  }
  return {x:to.x,y:to.y,blocked:false};
}
export function isDeployable(p,side,buildings=[],map=MAP) {
  if((side!==0&&side!==1)||!isWalkable(p,map))return false;
  if(distance(p,map.bases[side])>RULES.castleRange+1e-9)return false;
  if(!isCourtyard(p,side,map)&&!inRect(p,map.plaza)&&closestRoute(p,map).distance>map.roadWidth/2-.1)return false;
  if(map.bases.some(base=>distance(p,base)<map.castleRadius+.35))return false;
  return !buildings.some(b=>b.alive!==false&&distance(p,b)<(b.radius||.45)+.35);
}

export const inRect=(p,rect)=>!!rect&&p.x>=rect.minX&&p.x<=rect.maxX&&p.y>=rect.minY&&p.y<=rect.maxY;
export function objectiveFor(map,lane=0) {
  const route=map.routes[lane]||map.routes[0];
  return map.nodes[lane]||map.nodes[0]||map.center||route[Math.floor(route.length/2)];
}
export function bindMap(map) {
  return {
    routeFor:(lane,side)=>routeFor(lane,side,map),
    pointOnRoute:(lane,side,d)=>pointOnRoute(lane,side,d,map),
    closestRoute:p=>closestRoute(p,map),courtyardFor:side=>courtyardFor(side,map),
    isCourtyard:(p,side)=>isCourtyard(p,side,map),isWalkable:p=>isWalkable(p,map),
    clipWalkableSegment:(a,b,padding)=>clipWalkableSegment(a,b,padding,map),
    isDeployable:(p,side,buildings)=>isDeployable(p,side,buildings,map),
    finitePoint:p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=map.width&&p.y>=0&&p.y<=map.height,
  };
}
