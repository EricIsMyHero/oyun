import { distance, projectSegment, portalJump } from './map.mjs';

export const PRISON_RULES=Object.freeze({interval:60,repeat:true,affectsFlying:true,orbOnlyWhenOpen:true});
export const gateClosed=(engine,gate)=>engine.state?.arena?.gatePhase===1?gate.group==='red':gate.group==='green';
export function gateContains(g,p,padding=0){return g.axis==='x'?Math.abs(p.x-g.x)<=.2+padding&&Math.abs(p.y-g.y)<=1.2+padding:Math.abs(p.y-g.y)<=.2+padding&&Math.abs(p.x-g.x)<=1.2+padding;}
export const gateBlocked=(engine,p)=>(engine.map.gates||[]).some(g=>gateClosed(engine,g)&&gateContains(g,p));
const present=u=>u.alive&&!u.banished&&!u.engulfedBy&&!u.possessingId&&!u.parasitizingId&&!u.fusedInto;
export function tickTopology(engine){
 const {map,state,time}=engine,arena=state.arena;
 if(map.theme==='swamp')for(const u of engine.units){
  if(!present(u)||u.isBuilding||time<(u.memory.portalUntil||0))continue;
  const entry=map.portals.find(p=>distance(u,p)<.75+u.radius);if(!entry)continue;
  const exit=map.portals.find(p=>p.id===entry.pair),enemy=engine.castles[1-u.side],enemyExit=distance(exit,enemy)<distance(exit,engine.castles[u.side]);
  const next=enemyExit?enemy:engine.castles[u.side],dx=next.x-exit.x,dy=next.y-exit.y,len=Math.hypot(dx,dy)||1;
  engine.fx('portal',entry.x,entry.y,{side:u.side,color:'#75ffe0',duration:.8});
  const old={x:u.x,y:u.y};u.x=exit.x+dx/len*1.2;u.y=exit.y+dy/len*1.2;
  if(u.rayDash){u.rayDash.startX+=u.x-old.x;u.rayDash.startY+=u.y-old.y;}u.lane=enemyExit?1:0;
  u.route=enemyExit?[{...exit},{x:next.x,y:next.y}]:[{...exit},{x:next.x,y:next.y},...engine.routeFor(0,u.side).slice(1)];u.waypoint=1;
  u.memory.portalUntil=time+1;u.targetId=null;u.burstTargetId=null;delete u.memory.navigation;
  engine.fx('portal',exit.x,exit.y,{side:u.side,color:'#75ffe0',duration:.8});
 }
 if(map.theme!=='prison')return;
 const epoch=Math.floor((time+1e-7)/PRISON_RULES.interval),phase=PRISON_RULES.repeat?epoch%2:Math.min(1,epoch),changed=phase!==arena.gatePhase;
 arena.gatePhase=phase;arena.gateEpoch=epoch;arena.nextPhaseAt=PRISON_RULES.repeat?(epoch+1)*PRISON_RULES.interval:phase?null:60;
 const occupants=[...engine.units];
 for(const gate of map.gates){
  if(!gateClosed(engine,gate))continue;
  for(const u of occupants){
   if(!present(u)||!PRISON_RULES.affectsFlying&&u.def.combat.movementType==='flying'||!gateContains(gate,u,u.radius))continue;
   const key=gate.axis==='x'?'x':'y',facing=key==='x'?u.facingX:u.facingY,sign=Math.abs(facing||0)>.05?Math.sign(facing):u.side?-1:1;
   u[key]=gate[key]+sign*(.2+u.radius+.12);u.targetId=null;delete u.memory.navigation;engine._resetWaypoint(u);
   if(changed)engine.damage(null,u,100,{kind:'environment',secondary:true,accuracyChecked:true});
  }
 }
 const orb=arena.orb;
 if(phase===1&&PRISON_RULES.orbOnlyWhenOpen){if(orb.available)engine.fx('capture',orb.x,orb.y,{color:'#ef7e79',duration:.6});orb.available=false;orb.gateSuppressed=true;}
 else if(orb.gateSuppressed){orb.gateSuppressed=false;orb.available=orb.respawnAt==null||time>=orb.respawnAt;if(orb.available){orb.respawnAt=null;orb.pickedBy=null;}}
}
const graphs=new WeakMap();
function graphFor(map){
 if(graphs.has(map))return graphs.get(map);
 const points=[],edges=[],index=p=>{let i=points.findIndex(q=>distance(q,p)<1e-6);if(i<0){i=points.length;points.push({...p});}return i;};
 for(const route of [...map.routes,...map.crossways])for(let i=1;i<route.length;i++){if(portalJump(route[i-1],route[i]))continue;const a=index(route[i-1]),b=index(route[i]);edges.push([a,b]);}
 const graph={points,edges};graphs.set(map,graph);return graph;
}
function clear(engine,a,b){const n=Math.max(1,Math.ceil(distance(a,b)/.18));for(let i=1;i<=n;i++)if(!engine.isWalkable({x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n}))return false;return true;}
function pathTo(engine,start,goal){
 const base=graphFor(engine.map),points=[...base.points,start,goal],source=points.length-2,target=points.length-1,edges=base.edges.filter(([a,b])=>clear(engine,points[a],points[b]));
 // Attach each end to its nearest road segment; projection prevents shortcutting
 // through a cell block while allowing off-center bodies to enter the graph.
 for(const [point,idx]of[[start,source],[goal,target]]){
  const nearest=base.edges.map(([a,b])=>({a,b,p:projectSegment(point,points[a],points[b])})).sort((a,b)=>a.p.distance-b.p.distance)[0];
  const projection=points.length;points.push(nearest.p);
  if(clear(engine,point,nearest.p))edges.push([idx,projection]);
  for(const end of[nearest.a,nearest.b])if(clear(engine,nearest.p,points[end]))edges.push([projection,end]);
 }
 const costs=points.map(()=>Infinity),previous=[],done=new Set();costs[source]=0;
 while(done.size<points.length){let at=-1;for(let i=0;i<points.length;i++)if(!done.has(i)&&(at<0||costs[i]<costs[at]))at=i;if(at<0||!Number.isFinite(costs[at])||at===target)break;done.add(at);
  for(const[a,b]of edges){const next=a===at?b:b===at?a:-1;if(next<0)continue;const cost=costs[at]+distance(points[at],points[next]);if(cost+1e-8<costs[next]){costs[next]=cost;previous[next]=at;}}
 }
 if(!Number.isFinite(costs[target]))return null;const result=[];for(let at=target;at!==source;at=previous[at]){if(at==null)return null;result.unshift({x:points[at].x,y:points[at].y});}return result;
}
export function topologyWaypoint(engine,u,goal){
 if(engine.map.theme!=='prison'||!PRISON_RULES.affectsFlying&&u.def.combat.movementType==='flying')return goal;
 let nav=u.memory.navigation;
 if(nav&&(nav.epoch!==engine.state.arena.gateEpoch||distance(nav.goal,goal)>.8||nav.last&&distance(nav.last,u)>1)){delete u.memory.navigation;nav=null;}
 if(!nav&&clear(engine,u,goal))return goal;
 if(!nav){const path=pathTo(engine,u,goal);if(!path)return{x:u.x,y:u.y};nav={goal:{x:goal.x,y:goal.y},path,epoch:engine.state.arena.gateEpoch};u.memory.navigation=nav;}
 while(nav.path.length&&distance(u,nav.path[0])<.18)nav.path.shift();
 if(!nav.path.length){delete u.memory.navigation;return goal;}nav.last={x:u.x,y:u.y};return nav.path[0];
}
export function gateTravelBlocked(engine,u,point){
 if(engine.map.theme!=='prison'||!PRISON_RULES.affectsFlying&&u.def.combat.movementType==='flying')return false;
 const n=Math.max(1,Math.ceil(distance(u,point)/.1));for(let i=1;i<=n;i++)if(gateBlocked(engine,{x:u.x+(point.x-u.x)*i/n,y:u.y+(point.y-u.y)*i/n}))return true;return false;
}
