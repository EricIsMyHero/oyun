import { distance, inRect, projectSegment } from './map.mjs';
import { RULES } from './rules.mjs';

const EPS=1e-7;
const present=u=>u.alive&&!u.isBuilding&&!u.banished&&!u.engulfedBy&&!u.possessingId&&!u.parasitizingId&&!u.fusedInto;
export const groundAffected=u=>u.def?.combat?.movementType==='ground'&&!u.def.combat.groundEffectImmune;
export function waterContains(map,point) {
  return map.theme==='waterfall'&&map.river.slice(1).some((b,i)=>projectSegment(point,map.river[i],b).distance<=map.waterWidth/2+EPS);
}
export function createEnvironment(map) {
  return {id:map.id,gatePhase:0,gateEpoch:0,surge:false,lavaActive:false,nextPhaseAt:map.theme==='waterfall'?90:map.theme==='lava'?45:map.theme==='prison'?60:null,
    orb:['lava','prison'].includes(map.theme)?{...map.center,available:true,radius:.65,pickedBy:null,respawnAt:null,bonusUntil:[0,0]}:null};
}
export function terrainSlow(engine,unit) {
  return groundAffected(unit)&&waterContains(engine.map,unit)?(engine.state.arena.surge ? .33 : .15):0;
}
// All phase clocks use simulation time; pausing never advances hazards or orbs.
export function tickEnvironment(engine,dt) {
  const {map,state,time}=engine,arena=state.arena;
  if(map.theme==='waterfall') {
    const cycle=time%90;arena.surge=time+EPS>=90&&(cycle<30-EPS||cycle>90-EPS);
    const start=Math.floor((time+EPS)/90)*90;
    arena.nextPhaseAt=arena.surge?start+30:start+90;
  }
  if(!['lava','prison'].includes(map.theme))return;
  if(map.theme==='lava'){
    const cycle=time%45;arena.lavaActive=time+EPS>=45&&(cycle<15-EPS||cycle>45-EPS);
    const start=Math.floor((time+EPS)/45)*45;
    arena.nextPhaseAt=arena.lavaActive?start+15:start+45;
    for(const u of engine.units) {
      if(!present(u)||!groundAffected(u)||!arena.lavaActive||!inRect(u,map.plaza)) {delete u.lavaExposure;continue;}
      u.lavaExposure=(u.lavaExposure||0)+dt;
      while(u.alive&&u.lavaExposure+EPS>=1) {
        u.lavaExposure-=1;
        const amount=engine.maxHealth(u)*.01;
        engine.loseHealth(u,amount);
        engine.fx('lifeLoss',u.x,u.y,{amount,side:u.side,color:'#ff747d',cause:'lava'});
      }
    }
  }
  const orb=arena.orb;
  if(orb.gateSuppressed)return;
  if(!orb.available&&time+EPS>=orb.respawnAt){orb.available=true;orb.respawnAt=null;orb.pickedBy=null;}
  if(!orb.available)return;
  const collector=engine.units.filter(u=>present(u)&&distance(u,orb)<=orb.radius+u.radius+EPS)
    .sort((a,b)=>distance(a,orb)-distance(b,orb)||a.born-b.born||a.id.localeCompare(b.id))[0];
  if(!collector)return;
  orb.available=false;orb.pickedBy=collector.side;orb.bonusUntil[collector.side]=time+30;orb.respawnAt=time+35;
  engine.teams[collector.side].mana=Math.min(RULES.maxMana,engine.teams[collector.side].mana+5);
  engine.fx('capture',orb.x,orb.y,{side:collector.side,color:'#b9a1ff',duration:1.2});
  engine.log('orb',`${collector.side?'Crimson Crown':'Azure Core'} claimed the mana orb: +5 mana, +2% regeneration for 30 seconds.`,{side:collector.side});
}
