/* Native Emergent/Ethereal handlers. Deployment ordinals are owned by the match. */
import { clamp } from './rules.mjs';
import { statusMagnitude,hasStatus,STATUS_INTERVALS } from './statuses.mjs';
const dealt=r=>(r?.total||0)>0;
const range=(ctx,u)=>ctx.statValue(u,'range')/1000;
const friends=(ctx,u,r=range(ctx,u))=>ctx.near(u,r,t=>t!==u&&t.side===u.side&&!t.isBuilding&&!t.healthless);
const foes=(ctx,u,r=range(ctx,u))=>ctx.near(u,r,t=>ctx.isEnemy(u,t)&&!t.isBuilding&&!t.healthless);
function every(ctx,u,key,dt,seconds,fn){u.memory[key]=(u.memory[key]||0)+dt;while(u.memory[key]+1e-7>=seconds){u.memory[key]=Math.max(0,u.memory[key]-seconds);ctx.useAbility(u,fn);}}
const offspring=(ctx,u)=>{const form=u.def.forms[0];if(form)ctx.spawn(form,u.side,u,u.lane,{count:form.stats.number||1,groupId:u.groupId});};
const rayPartner=(ctx,u)=>ctx.near(u,2,t=>t!==u&&t.side===u.side&&t.groupId===u.groupId&&(t.def.variantId||t.def.id).startsWith((u.def.variantId||u.def.id).split('/').slice(0,2).join('/'))&&!t.sharedVitalsId)[0];
const rayCharge=(ctx,u,dt,type)=>{
 const pool=ctx._pool(u);
 if(pool?.kind==='ray'){
  if(pool.leaderId===u.id)every(ctx,u,'rayPulse',dt,.25,()=>{for(const t of foes(ctx,u))if(ctx._canHit(u,t))ctx.damage(u,t,5,{kind:'ability',secondary:true});ctx.heal(u,3,u);ctx.fx('wave',u.x,u.y,{side:u.side,radius:range(ctx,u),color:'#e9bea1',duration:.3});});
  return;
 }
 if(u.rayDash)return;
 const partner=rayPartner(ctx,u);if(!partner)return;
 u.memory.rayCharge=Math.min(100,(u.memory.rayCharge||0)+dt*(type===1?3:2));
 if(u.memory.rayCharge>=100-1e-7&&(partner.memory.rayCharge||0)>=100-1e-7){if(type===1)ctx.fuseRays(u,partner);else ctx.startRayDash(u,partner);}
};
const rayRescue=(ctx,u)=>{if(u.rayDash&&!u.rayHealUsed&&u.hp>0&&u.hp<ctx.maxHealth(u)*.2){u.rayHealUsed=true;ctx.heal(u,(ctx.maxHealth(u)-u.hp)*.75,u);}};
const rayOne={spawnForms:[0],tick(ctx,u,dt){rayCharge(ctx,u,dt,1);}};
const rayTwo={spawnForms:[0],tick(ctx,u,dt){rayCharge(ctx,u,dt,2);rayRescue(ctx,u);},damaged(ctx,u){rayRescue(ctx,u);}};
const dumpObject=(ctx,u,index,outer=false)=>({id:`object-${++ctx.serial}`,outer,angle:index,next:0,element:u.deploymentNumber%2===0&&ctx.random()<.25?['slow','poison','burn'][Math.floor(ctx.random()*3)]:null});
const dumpDamage=(ctx,u,target)=>ctx.statValue(u,'damage')*(1+statusMagnitude(u,'damageBonus',ctx.time))*(u.memory.dumpCombo?.id===target.id&&!hasStatus(u,'silence',ctx.time)?Math.pow(1.25,u.memory.dumpCombo.count):1);
const dumpHit=(ctx,u,t,result,hit)=>{
 if(!dealt(result)||!hit.dumpObject)return;
 u.memory.dumpCombo={id:t.id,count:u.memory.dumpCombo?.id===t.id?u.memory.dumpCombo.count+1:1};
 if(hit.dumpElement==='slow')ctx.status(t,'slow',3,.25,u);
 else if(hit.dumpElement==='poison')ctx.status(t,'poison',7*STATUS_INTERVALS.poison,0,u,{amount:2,stack:true});
 else if(hit.dumpElement==='burn')ctx.status(t,'burn',3,0,u,{amount:5,stack:true});
};
const ase={tick(ctx,u,dt){every(ctx,u,'partsClock',dt,7,()=>{u.memory.parts=(u.memory.parts||0)+1;if(u.memory.parts>=4){u.memory.parts-=4;offspring(ctx,u);ctx.fx('capture',u.x,u.y,{side:u.side});}});}};
export const LATE_ABILITIES={
 dumpsy:{
  noBasicAttack:true,
  spawn(ctx,u){u.memory.dumpFixed=Array.from({length:3},(_,i)=>dumpObject(ctx,u,i));u.memory.dumpLoot=[];u.memory.dumpPhase=0;},
  unitDeath(ctx,u,dead){if(dead.isBuilding)return;const loot=u.memory.dumpLoot||=[];if(loot.length<12){loot.push(dumpObject(ctx,u,loot.length,true));ctx.fx('capture',dead.x,dead.y,{side:u.side,duration:.3,color:'#d8c5a5'});}},
  weaponTick(ctx,u,dt){
   const fixed=u.memory.dumpFixed||=[],loot=u.memory.dumpLoot||=[],scale=ctx.attackInterval(u)/u.def.attack.interval;
   u.memory.dumpPhase=(u.memory.dumpPhase||0)+Math.PI*2*dt/(.9*scale);
   for(const[objects,radiusValue,period]of[[fixed,.5,.9],[loot,1,1.15]])for(let i=0;i<objects.length;i++){
    const object=objects[i],angle=u.memory.dumpPhase+i*Math.PI*2/objects.length;object.ox=Math.cos(angle)*radiusValue;object.oy=Math.sin(angle)*radiusValue;
    if(object.next>ctx.time+1e-7)continue;
    const point={x:u.x+object.ox,y:u.y+object.oy},target=ctx.near(point,.25,t=>!t.isBuilding&&ctx._canHit(u,t)).sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y)||a.id.localeCompare(b.id))[0];if(!target)continue;
    object.next=ctx.time+period*scale;u.shots++;u.memory.lastAttack=ctx.time;
    if(ctx.random()<statusMagnitude(u,'misfortune',ctx.time)){ctx.fx('miss',target.x,target.y,{side:u.side});continue;}
    ctx._resolveHit(u,target,{damage:dumpDamage(ctx,u,target),kind:'attack',critical:ctx.random()<ctx.statValue(u,'criticalChance')/100,dumpObject:true,dumpElement:object.element});
   }
   u.memory.dumpThrowClock=Math.min(1.15*scale,(u.memory.dumpThrowClock||0)+dt);
   if(!loot.length||u.memory.dumpThrowClock+1e-7<1.15*scale)return;
   const reach=Math.max(...String(u.def.raw.additionalStats.range).split('/').map(Number))/1000,forced=ctx.tauntTarget(u);
   const target=foes(ctx,u,reach).filter(t=>ctx.canTarget(u,t)&&(!forced||t===forced)).sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)||a.id.localeCompare(b.id))[0];if(!target)return;
   u.memory.dumpThrowClock=0;const object=loot.shift();u.shots++;
   if(ctx.abilityProjectile(u,target,dumpDamage(ctx,u,target),{range:reach,kind:'orb',color:({slow:'#94d6ec',poison:'#b5df78',burn:'#ffb875'})[object.element]||'#dcc59e',cardOnly:true})){
    const shot=ctx.state.projectiles.at(-1);shot.ability=false;Object.assign(shot.hit,{kind:'attack',secondary:false,critical:ctx.random()<ctx.statValue(u,'criticalChance')/100,dumpObject:true,dumpElement:object.element});
   }
  },
  hit:dumpHit,
 },
 stella:{spawn(ctx,u){
  const area={shape:'rect',width:1.5,height:1.5};for(const t of foes(ctx,u,2))if(ctx._inside(t,u,area))ctx.damage(u,t,20,{kind:'ability',secondary:true});ctx.fx('blastArea',u.x,u.y,{side:u.side,width:1.5,height:1.5,color:'#b2d9d0'});
  const bonus=Math.min(.5,Math.max(0,u.deploymentNumber-1)*.1),reach=3*(1+bonus),profile={attackType:'ranged',attackShape:'line',attackWidth:2000,attackDistance:reach*1000,multiTarget:true,maxTargets:null,cardOnly:true};u.memory.gliderBonus=bonus;
  const shot=ctx._projectile(u,{x:u.x+(u.side?-reach:reach),y:u.y},{damage:12*(1+bonus),kind:'ability',secondary:true,critical:false,accuracyChecked:true},profile);shot.ability=true;shot.kind='glider';shot.color='#c7e6d5';
 }},

 blesser:{
  preparationTime:12,
  tick(ctx,u){
   if(u.memory.blessed||ctx.time-u.born<12-1e-7)return;
   const target=friends(ctx,u,12).sort((a,b)=>b.hp-a.hp||a.id.localeCompare(b.id))[0];if(!target)return;
   u.memory.blessed=true;const stage=Math.min(2,Math.max(0,u.deploymentNumber-1)),kind=Math.floor(ctx.random()*3);u.memory.blessingKind=kind;u.memory.blessingTargetId=target.id;
   ctx.useAbility(u,()=>{
    if(kind===0){const hp=ctx.maxHealth(target),shield=ctx.maxShield(target),entry=ctx.status(target,'allStatsBonus',Infinity,[.2,.225,.25][stage],u);if(entry){target.hp*=ctx.maxHealth(target)/hp;if(shield>0)target.shield*=ctx.maxShield(target)/shield;ctx._capVitals(target);}}
    else if(kind===1){const gain=ctx.giveShield(target,ctx.maxHealth(target)*[.25,.285,.32][stage],u);if(gain>0)ctx.status(target,'blessedShield',Infinity,0,u,{remaining:gain});}
    else ctx.status(target,'blessedTrap',Infinity,0,u,{width:1.75,height:1.75,stunDuration:[2,3,4][stage]});
    ctx.fx('buff',target.x,target.y,{side:u.side,color:'#f4dca0'});
   });
  },
 },
 mimic:{
  spawn(ctx,u){if(u.deploymentNumber%3===0)ctx.status(u,'predominance',Infinity,0,u);},
  negativeStatus(ctx,u,source){return u.deploymentNumber%3===0&&source?.alive&&ctx.random()<.5;},
  hit(ctx,u,target,result){
   if(!u.alive||!dealt(result)||target.isBuilding||target.isCastle||target.healthless)return;
   const record=(u.memory.mimicVictims||={})[target.id]||={healthDamage:0,health:false,shield:false};record.healthDamage+=result.healthDamage;
   const clone=()=>{
    const def={...target.def,passiveDisabled:target.passiveDisabled||target.def.passiveDisabled,combat:structuredClone(target.temporaryFlight?.combat||target.def.combat),stats:{...target.stats,health:ctx.maxHealth(target)*.7,shield:ctx.maxShield(target)*.7,damage:target.stats.damage*.7},attack:structuredClone(target.def.attack)};
    const ratio=target.def.stats.damage>0?def.stats.damage/target.def.stats.damage:.7;
    for(const attack of[def.attack,...(def.attack.sequence||[]),...(def.attack.modes||[])])attack.damage*=ratio;
    const made=ctx.spawn(def,u.side,{x:u.x+(u.side?-.4:.4),y:u.y},u.lane,{count:1,groupId:u.groupId,deploymentNumber:target.deploymentNumber});for(const c of made)c.memory.mimicClone=true;
    if(made[0]){made[0].stats.damage=def.stats.damage;made[0].stats.attackSpeed=def.stats.attackSpeed;if(target.memory.dagger!=null)made[0].memory.dagger=target.memory.dagger;}
    ctx.fx('capture',u.x,u.y,{side:u.side,color:'#d7b3df'});
   };
   if(!record.shield&&result.shieldDamage>0&&target.shield<=0){record.shield=true;clone();}
   if(!record.health&&record.healthDamage+1e-7>=ctx.maxHealth(target)*.2){record.health=true;clone();}
  },
 },
 'the-seven-sins/greed':{
  tick(ctx,u,dt){every(ctx,u,'greedClock',dt,1,()=>{for(const t of ctx.near(u,range(ctx,u),t=>t!==u&&!t.isBuilding&&!t.healthless)){const result=ctx.damage(u,t,t.hp*.01,{kind:'ability',secondary:true,bypassShield:true,friendlyFire:true});ctx.heal(u,result.healthDamage,u);}});},
  unitDeath(ctx,u,dead){if(dead.isBuilding||dead.healthless)return;const gain=ctx.maxHealth(dead)*.05;u.maxHp+=gain;u.stats.health=u.maxHp;u.hp=Math.min(ctx.maxHealth(u),u.hp+gain);},
 },
 'the-seven-sins/lust':{
  tick(ctx,u){
   ctx.status(u,'taunt',.12,0,u,{radius:0});for(const t of ctx.units.filter(t=>t.alive&&!t.isBuilding&&ctx.isEnemy(u,t)&&!t.engulfedBy&&!t.banished&&!t.possessingId&&!t.parasitizingId&&!t.fusedInto&&Math.abs(t.x-u.x)<=1.5&&Math.abs(t.y-u.y)<=1.5))ctx.status(t,'taunted',.12,0,u,{scheduled:true});
   let ally=ctx.units.find(t=>t.id===u.memory.lustBond&&t.alive&&t.side===u.side);
   if(!ally&&u.memory.lustBond){u.memory.lustBond=null;u.memory.lustRebind=ctx.time+2;}
   if(!ally&&ctx.time>=(u.memory.lustRebind||0)){ally=friends(ctx,u).sort((a,b)=>a.hp-b.hp||a.id.localeCompare(b.id))[0];if(ally)u.memory.lustBond=ally.id;}
   if(ally)for(const target of[u,ally])ctx.status(target,'protection',.12,.05,u);
  },
 },
 'the-seven-sins/envy':{
  conditionalStats:['damage','attackSpeed','delay','range'],
  tick(ctx,u){
   const targets=foes(ctx,u).filter(t=>ctx.canTarget(u,t)&&(t.x-u.x)*(u.side?-1:1)>=0),target=targets.find(t=>t.id===u.targetId)||targets.sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)||a.id.localeCompare(b.id))[0];
   if(!target){delete u.memory.envyWeapon;for(const key of['damage','attackSpeed','delay','range'])u.stats[key]=u.def.stats[key];return;}
   const attack=ctx._attackDefinition(target),damage=ctx.statValue(target,'damage'),interval=ctx.attackInterval(target),delay=ctx.statValue(target,'delay'),reach=ctx._range(target)*1000;
   if(u.memory.envyWeapon?.targetId!==target.id){u.burstIndex=0;u.burstTargetId=null;}
   u.memory.envyWeapon={targetId:target.id,attack:{damage,count:attack.count,interval,delay,range:reach},combat:{attackType:ctx._profile(target).attackType}};
   Object.assign(u.stats,{damage,attackSpeed:interval,delay,range:reach});
  },
 },

 'mr-and-mrs-ray/type1':rayOne,
 'mr-and-mrs-ray/type1/the-rays-form':{tick:rayOne.tick},
 'mr-and-mrs-ray/type2':rayTwo,
 'mr-and-mrs-ray/type2/the-rays-form-2':{tick:rayTwo.tick,damaged:rayTwo.damaged},

 'xii-josh':{
  conditionalStats:['attackSpeed'],
  tick(ctx,u){
   const mana=ctx.units.filter(t=>t!==u&&t.alive&&ctx.isEnemy(u,t)&&!t.isBuilding&&!t.engulfedBy&&!t.banished&&!t.possessingId&&!t.parasitizingId&&!t.fusedInto&&Math.abs(t.x-u.x)<=1&&Math.abs(t.y-u.y)<=1).reduce((n,t)=>n+ctx.statValue(t,'mana'),0);
   u.memory.joshMana=mana;u.stats.attackSpeed=u.def.stats.attackSpeed/(1+mana*.005);
  },
  damaged(ctx,u){if(u.hp>=ctx.maxHealth(u)*.1)u.memory.joshArmed=true;if(u.hp>0&&u.hp<ctx.maxHealth(u)*.1&&!u.temporaryFlight&&u.memory.joshArmed!==false){u.memory.joshArmed=false;ctx.takeFlight(u,10);}},
  hit(ctx,u,t,result){if(dealt(result)&&!t.isBuilding&&!t.isCastle&&u.deploymentNumber%3===0&&ctx.random()<.33)ctx.status(t,'misfortune',Infinity,.15,u);},
  land(ctx,u){const shape={shape:'rect',width:1.5,height:1.5};for(const t of foes(ctx,u,2))if(ctx._inside(t,u,shape))ctx.damage(u,t,24,{kind:'ability',secondary:true});ctx.fx('blastArea',u.x,u.y,{side:u.side,width:1.5,height:1.5,color:'#dec891'});},
 },
 js:{conditionalStats:['range'],tick(ctx,u){const missing=Math.max(0,1-u.hp/ctx.maxHealth(u));u.stats.range=u.def.stats.range+Math.floor(missing/.02+1e-7)*25;},hit(ctx,u,t,result){if(dealt(result)&&!t.isCastle&&!t.isBuilding)ctx.status(t,'curse',8,u.deploymentNumber%5===0?.75:.25,u);}},
 'lord/type1':{damaged(ctx,u){
  if(u.lordImmortalUsed||u.hp>=ctx.maxHealth(u)*.05)return;
  u.lordImmortalUsed=true;const recovery=(ctx.maxHealth(u)-u.hp)*.25;u.hp=Math.max(1,u.hp);
  ctx.status(u,'immortal',5,0,u);ctx.status(u,'regen',5,0,u,{amount:recovery/5,interval:1});ctx.fx('shield',u.x,u.y,{side:u.side,duration:5});
 }},
 'leila/type1':{
  hit(ctx,u,t,result){if(dealt(result)&&!t.isBuilding&&!t.isCastle){u.memory.leilaHits=(u.memory.leilaHits||0)+1;if(u.memory.leilaHits%24===0)u.memory.leilaBombs=(u.memory.leilaBombs||0)+1;}},
  tick(ctx,u){if(!(u.memory.leilaBombs>0))return;const target=foes(ctx,u).filter(t=>ctx.canTarget(u,t)).sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)||a.id.localeCompare(b.id))[0];if(!target)return;u.memory.leilaBombs--;ctx.abilityProjectile(u,target,12,{range:range(ctx,u),kind:'grenade',impactSize:'3 × 3 tiles',cardOnly:true,statusesOnHit:[{kind:'blind',duration:4,magnitude:.125}]});},
 },

 'ase/type1':ase,'ase/type2':ase,
 'ase/type1/giga-r':{spawn(ctx,u){ctx.status(u,'protection',22,.1,u);}},
 'ase/type2/giga-r-2':{hit(ctx,u,t,r){if(r.killed&&!t.isBuilding&&!t.isCastle){u.memory.gigaKills=Math.min(10,(u.memory.gigaKills||0)+1);u.stats.attackSpeed=u.def.stats.attackSpeed/(1+u.memory.gigaKills*.03);}}},
 'leno/type1':{conditionalStats:['criticalChance'],tick(ctx,u){u.stats.criticalChance=Math.min(100,u.def.stats.criticalChance+(ctx.time-u.born<25-1e-7?45:15));}},
 'leno/type2':{attack(ctx,u,t,hit){if(t.def?.type?.some(type=>['Animal','Robot','Dead','Spirit','Alien','Entity'].includes(type)))hit.damage*=1.4;}},
 'king/type1':{tick(ctx,u){for(const ally of friends(ctx,u))ctx.status(ally,'attackHaste',.2,.25,u);}},
 'king/type2':{immobile:true,tick(ctx,u,dt){every(ctx,u,'guardClock',dt,12,()=>{offspring(ctx,u);ctx.status(u,'protection',2,.15,u);ctx.fx('shield',u.x,u.y,{side:u.side});});}},
 'king/type2/guard':{attack(ctx,u,t,hit){if(t.shield>0)hit.damage*=1.3;}},
 'dracula/type1':{hit(ctx,u,t,r){if(dealt(r)&&!t.isBuilding&&!t.isCastle){u.memory.draculaSiphon=Math.min(25,(u.memory.draculaSiphon||0)+1);u.stats.lifestealChance=Math.min(100,u.def.stats.lifestealChance+u.memory.draculaSiphon);}}},
 'dracula/type2':{conditionalStats:['damageminimiser'],tick(ctx,u){const steps=Math.floor(Math.max(0,1-u.hp/ctx.maxHealth(u))*10+1e-7);u.stats.damageminimiser=Math.min(90,u.def.stats.damageminimiser+steps*5);},death:offspring},
 'dracula/type2/bats':{attack(ctx,u,t,hit){if(!u.memory.batStruck){hit.damage*=1.4;hit.batOpening=true;}},hit(ctx,u,t,r,hit){if(dealt(r)&&hit.batOpening)u.memory.batStruck=true;}},
 'hunter/type1':{attack(ctx,u,t,hit){if(t.def?.type?.includes('Animal'))hit.damage*=1.6;},death:offspring},
 'hunter/type1/wolf':{attack(ctx,u,t,hit){hit.shieldMultiplier=1.5;}},
 'hunter/type2':{attack(ctx,u,t,hit){if(t.def?.type?.includes('Human'))hit.damage*=1.5;},death:offspring},
 'hunter/type2/eagle':{attack(ctx,u,t,hit){hit.bypassShield=true;}},
 'lord/type2':{tick(ctx,u,dt){every(ctx,u,'lordRegenClock',dt,1,()=>ctx.heal(u,1,u));},damaged(ctx,u,source,result){if(u.hp<=0)return;u.memory.lordLoss=(u.memory.lordLoss||0)+(result.healthDamage||0)/ctx.maxHealth(u);while(u.memory.lordLoss+1e-7>=.1&&(u.memory.riders||0)<5){u.memory.lordLoss=Math.max(0,u.memory.lordLoss-.1);u.memory.riders=(u.memory.riders||0)+1;offspring(ctx,u);}}},
 'lord/type2/rider':{damaged(ctx,u,source,result){if(result.shieldDamage>0&&u.shield<=0&&!u.memory.riderBroken){u.memory.riderBroken=true;u.stats.damage=u.def.stats.damage*1.5;}}},
 'leila/type2':{attack(ctx,u,t,hit){if(u.shots%5===0){hit.combat={...hit.combat,impactSize:'1.2 × 1.2 tiles'};hit.leilaBleed=true;}},hit(ctx,u,t,r,hit){if(dealt(r)&&hit.leilaBleed&&!t.isCastle&&!t.isBuilding)ctx.status(t,'bleed',8,0,u);}},
 'soul-master/type1':{unitDeath(ctx,u,dead){if(dead.isBuilding)return;u.memory.souls=(u.memory.souls||0)+1;const stacks=Math.floor(u.memory.souls/10);u.stats.damage=u.def.stats.damage*(1+stacks*.25);}},
 'soul-master/type2':{
  unitDeath(ctx,u,dead){if(!dead.isBuilding)u.memory.souls=(u.memory.souls||0)+1;},
  tick(ctx,u){if((u.memory.souls||0)<8)return;const target=foes(ctx,u).filter(t=>ctx.canTarget(u,t)&&(t.x-u.x)*(u.side?-1:1)>=0).sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)||a.id.localeCompare(b.id))[0];if(target)ctx.useAbility(u,()=>{u.memory.souls-=8;ctx.damage(u,target,ctx.maxHealth(target)*.1,{kind:'ability',secondary:true});ctx.fx('spell',target.x,target.y,{side:u.side,color:'#c2abe7'});});},
 },
 'the-seven-sins':{spawn(ctx,u){const forms=u.def.forms,index=ctx.random()<.01?forms.findIndex(f=>f.id.endsWith('/human')):Math.floor(ctx.random()*7);if(forms[index]){const mana=u.stats.mana;ctx._setUnitForm(u,forms[index],{});u.stats.mana=mana;ctx._hook('spawn',u);ctx.fx('capture',u.x,u.y,{side:u.side});}}},
 'the-seven-sins/pride':{attack(ctx,u,t,hit){if(!friends(ctx,u).length)hit.damage*=1.25;if(t.hp<u.hp)hit.damage*=1.25;}},
 'the-seven-sins/gluttony':{lifesteal(ctx,u,amount){ctx.giveShield(u,amount*.5,u);}},
 'the-seven-sins/wrath':{conditionalStats:['damage','attackSpeed'],tick(ctx,u){const loss=clamp((1-u.hp/ctx.maxHealth(u))/.9,0,1);u.stats.damage=u.def.stats.damage*(1+loss*.8);u.stats.attackSpeed=u.def.stats.attackSpeed/(1+loss*.6);}},
 'the-seven-sins/sloth':{tick(ctx,u,dt){every(ctx,u,'slothClock',dt,12,()=>ctx.giveShield(u,10,u));}},
 'the-seven-sins/human':{},
};
