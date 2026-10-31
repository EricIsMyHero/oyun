/* Native card rules. Missing facts are explicit locks, never invented effects. */
import { RULES, clamp } from './rules.mjs';
import { STATUS_INTERVALS } from './statuses.mjs';

const animal = u => (u?.def?.type || []).includes('Animal');
const airborne = u => u?.def?.combat?.movementType === 'flying';
const radius = (u,ctx) => (ctx?.statValue?ctx.statValue(u,'range'):u.stats.range)/1000;
const enemies = (ctx,u,r=radius(u,ctx)) => ctx.near(u,r,t=>(ctx.isEnemy?ctx.isEnemy(u,t):t.side!==u.side)&&!t.isCastle);
const healthCap=(ctx,u)=>ctx.maxHealth?ctx.maxHealth(u):u.maxHp;
const shieldCap=(ctx,u)=>ctx.maxShield?ctx.maxShield(u):u.maxShield;
const poisonHit=(ctx,u,t,result,count,amount)=>{
  if(!damageEvent(result)||t.isCastle)return;
  ctx.status(t,'poison',count*STATUS_INTERVALS.poison,0,u,{amount,stack:true});
  ctx.fx('poison',t.x,t.y,{side:u.side,duration:.5});
};
const allies = (ctx,u,r=radius(u,ctx),self=false) => ctx.near(u,r,t=>t.side===u.side&&(self||t!==u));
const periodic = (u,key,dt,period,fn,ctx=null) => {
  u.memory[key]=(u.memory[key]||0)+dt;
  while(u.memory[key]+1e-9>=period){u.memory[key]-=period;if(ctx?.useAbility)ctx.useAbility(u,fn);else fn();}
};
const damageEvent = result => (result?.total||0)>0;
const front = (ctx,u,t) => {
  const target=[...ctx.units,...ctx.castles].find(v=>v.id===u.targetId);
  const dx=target?target.x-u.x:(u.side===0?1:-1),dy=target?target.y-u.y:0;
  return (t.x-u.x)*dx+(t.y-u.y)*dy>=0;
};
const aura = (ctx,u,kind,magnitude,self=false) => allies(ctx,u,radius(u,ctx),self).forEach(t=>ctx.status(t,kind,.2,magnitude,u));
const growDamage = (u,amount,max=Infinity) => {u.memory.damageGrowth=Math.min(max,(u.memory.damageGrowth||0)+amount);u.stats.damage=u.def.stats.damage+u.memory.damageGrowth;};
const markCriticalKills = (ctx,u,result) => {
  if(result.killed)(u.memory.criticalKills||=[]).push(ctx.time+10);
};

export const ABILITIES = {
  hammies:{spawn(ctx,u){ctx.status(u,'speedBonus',12,.2,u);}},
  'b-b':{incoming(ctx,u,s,hit){if(animal(s))hit.damage*=.4;}},
  scrapy:{attack(ctx,u,t,hit){hit.bypassShield=true;if(ctx.random()<.25)hit.damage*=1.5;}},
  nitrox:{tick(ctx,u){aura(ctx,u,'attackHaste',.12);}},
  gloop:{
    spawn(ctx,u){u.memory.expires=ctx.time+125;u.expiresAt=ctx.time+125;},
    tick(ctx,u){
      if(ctx.time>=u.memory.expires){ctx.damage(null,u,u.hp+u.shield+1,{kind:'expiry',bypassShield:true,secondary:true});return;}
      enemies(ctx,u,u.def.combat.attackDistance/1000).forEach(t=>ctx.status(t,'root',.2,0,u));
    },
    death(ctx,u){enemies(ctx,u).forEach(t=>ctx.damage(u,t,150,{kind:'ability',secondary:true}));ctx.fx('explosion',u.x,u.y,{radius:radius(u,ctx),side:u.side});},
  },
  henry:{attack(ctx,u,t,hit){if(animal(t))hit.damage*=1.4;}},
  venomora:{hit(ctx,u,t,result){if(damageEvent(result)&&!t.isCastle)ctx.status(t,'slow',2,.25,u);}},
  blocker:{
    incoming(ctx,u,s,hit){if(s&&hit.kind==='attack'&&front(ctx,u,s))hit.damage*=.7;},
    tick(ctx,u){aura(ctx,u,'spellProtection',.2);},
  },
  ben:{hit(ctx,u,t,result){
    if(!damageEvent(result)||t.isCastle)return;
    const wounds=u.memory.wounds||=(Object.create(null));wounds[t.id]=(wounds[t.id]||0)+1;
    if(wounds[t.id]%4===0)ctx.status(t,'bleed',2,0,u,{amount:healthCap(ctx,t)*.01,interval:1});
  }},
  freak:{
    tick(ctx,u,dt){ctx.heal(u,dt,u);},
    death(ctx,u){const mini=u.def.forms[0];if(mini)ctx.spawn(mini,u.side,u,u.lane,{count:2,groupId:u.groupId});},
  },
  'freak/mini-freaks':{attack(ctx,u,t,hit){hit.combat={attackShape:'single',multiTarget:false,maxTargets:1};},death(ctx,u){enemies(ctx,u).forEach(t=>ctx.damage(u,t,50,{kind:'ability',secondary:true}));ctx.fx('explosion',u.x,u.y,{radius:radius(u,ctx),side:u.side});}},
  twins:{death(ctx,u){
    ctx.units.filter(t=>t.alive&&t.side===u.side&&t.groupId===u.groupId&&t!==u).forEach(t=>{
      if(t.memory.twinLoss)return;t.memory.twinLoss=true;
      const old=t.maxHp;t.maxHp*=3;t.hp+=old*2;t.stats.health=t.maxHp;t.stats.damage*=2;
      ctx.fx('buff',t.x,t.y,{side:t.side});
    });
  }},
  bethe:{
    hit(ctx,u,t,r){if(!t.isCastle)markCriticalKills(ctx,u,r);},
    tick(ctx,u){u.memory.criticalKills=(u.memory.criticalKills||[]).filter(end=>end>ctx.time);u.stats.criticalChance=clamp(u.def.stats.criticalChance+u.memory.criticalKills.length*5,0,100);},
  },
  soldier:{attack(ctx,u,t,hit){if(airborne(t))hit.damage*=1.33;}},
  snaykies:{attack(ctx,u,t,hit){hit.bypassShield=true;},hit(ctx,u,t,r){poisonHit(ctx,u,t,r,2,4);}},
  bees:{hit(ctx,u,t,r){if(!damageEvent(r)||u.memory.sacrificed)return;u.memory.sacrificed=true;poisonHit(ctx,u,t,r,8,2);ctx.damage(null,u,u.hp+u.shield+1,{kind:'sacrifice',bypassShield:true,secondary:true});}},
  phewphew:{attack(ctx,u,t,hit){hit.shieldMultiplier=2;}},
  hailey:{hit(ctx,u,t,r){if(damageEvent(r))u.stats.criticalChance=Math.min(100,u.stats.criticalChance+.5);}},
  'chrono-mage':{attack(ctx,u,t,hit){
    if(u.shots%5||u.memory.lastWave===u.shots)return;u.memory.lastWave=u.shots;
    allies(ctx,u).forEach(a=>{ctx.status(a,'speedBonus',5,.25,u);ctx.status(a,'attackHaste',5,.25,u);});
    enemies(ctx,u).forEach(e=>ctx.status(e,'slow',8,.25,u));ctx.fx('wave',u.x,u.y,{radius:radius(u,ctx),side:u.side});
  }},
  'aegis-guard':{tick(ctx,u){aura(ctx,u,'protection',.15);}},
  ironjaw:{hit(ctx,u,t,r){if(damageEvent(r))u.stats.lifestealChance=Math.min(25,u.stats.lifestealChance+.5);}},
  'm-manager':{tick(ctx,u,dt){periodic(u,'manaClock',dt,9,()=>{ctx.teams[u.side].mana=Math.min(RULES.maxMana,ctx.teams[u.side].mana+1);ctx.fx('mana',u.x,u.y,{side:u.side});},ctx);}},
  srail:{tick(ctx,u){const n=enemies(ctx,u).filter(t=>front(ctx,u,t)).length;u.stats.criticalChance=Math.min(80,u.def.stats.criticalChance+n*8);}},
  cryon:{damaged(ctx,u){if(u.hp>0&&u.hp<healthCap(ctx,u)*.2&&!u.memory.maskOff){u.memory.maskOff=true;ctx.near(u,radius(u,ctx),t=>t!==u).forEach(t=>ctx.status(t,'stun',12,0,u));ctx.fx('wave',u.x,u.y,{radius:radius(u,ctx),side:u.side});}}},
  frostshot:{
    spawn(ctx,u){u.memory.lastDamage=ctx.time;},
    attack(ctx,u,t,hit){if(ctx.time-u.memory.lastDamage>=18)hit.damage*=3.75;},
    hit(ctx,u,t,r){if(damageEvent(r)){u.memory.lastDamage=ctx.time;if(!t.isCastle)ctx.status(t,'slow',3,.4,u);}},
  },
  hornets:{incoming(ctx,u,s,hit){if(airborne(s))hit.damage*=.5;if(animal(s))hit.damage*=.75;}},
  warborn:{tick(ctx,u,dt){periodic(u,'restoreShield',dt,6,()=>ctx.giveShield(u,Math.max(0,shieldCap(ctx,u)-u.shield)*.2));}},
  'x-bot':{
    spawn(ctx,u){u.memory.lastDamage=ctx.time;},
    attack(ctx,u,t,hit){hit.damage*=1+Math.floor((ctx.time-u.memory.lastDamage)/2)*.05;},
    hit(ctx,u,t,r){if(damageEvent(r))u.memory.lastDamage=ctx.time;},
  },
  nyra:{
    spawn(ctx,u){u.memory.previous={x:u.x,y:u.y};u.memory.walked=0;},
    tick(ctx,u){const p=u.memory.previous;u.memory.walked+=Math.hypot(u.x-p.x,u.y-p.y);u.memory.previous={x:u.x,y:u.y};},
    attack(ctx,u,t,hit){if(u.memory.walked>=25)hit.damage*=2;},
  },
  deadscope:{
    hit(ctx,u,t,r){if(r.killed&&!t.isCastle)u.memory.nextHaste=true;},
    attack(ctx,u,t,hit){if(u.memory.nextHaste){hit.haste=.2;u.memory.nextHaste=false;}},
  },
  turtle:{
    spawn(ctx,u){const mini=u.def.forms[0];if(mini)ctx.spawn(mini,u.side,{x:u.x+(u.side===0?-.45:.45),y:u.y},u.lane,{count:mini.stats.number||4,groupId:u.groupId});},
    damaged(ctx,u,s,r){if(r.shieldDamage>0&&u.shield<=0&&!u.memory.restoring){u.memory.restoring=3;}},
    tick(ctx,u,dt){if(u.memory.restoring>0){const used=Math.min(dt,u.memory.restoring);ctx.giveShield(u,25*used);u.memory.restoring-=used;}},
    death(ctx,u){ctx.units.filter(t=>t.alive&&t.groupId===u.groupId&&t.def.id==='turtle/mini-turtles').forEach(t=>{t.stats.damage=t.def.stats.damage*2;t.memory.parentDead=true;});},
  },
  'turtle/mini-turtles':{tick(ctx,u){
    if(u.memory.parentDead)return;
    const parent=ctx.units.find(t=>t.alive&&t.groupId===u.groupId&&t.def.id==='turtle');
    if(parent){u.memory.followId=parent.id;}
  }},
  'feral-wolf':{
    spawn(ctx,u){ctx.status(u,'speedBonus',16,1,u);},
    attack(ctx,u,t,hit){if(!u.memory.firstHit)hit.damage*=1.3;},
    hit(ctx,u,t,r){if(damageEvent(r))u.memory.firstHit=true;},
  },
  trac:{damaged(ctx,u,s,r){
    u.memory.received=(u.memory.received||0)+r.total;
    const stacks=Math.floor(u.memory.received/24);
    u.stats.damageminimiser=Math.min(90,u.def.stats.damageminimiser+stacks*.5);
    u.stats.attackSpeed=u.def.stats.attackSpeed/(1+stacks*.005);
  }},
  dino:{hit(ctx,u,t,r){if(damageEvent(r))growDamage(u,2,24);}},
  tenta:{hit(ctx,u,t,r){if(damageEvent(r)&&!t.isCastle)ctx.status(t,'slow',1,.25,u);}},
  'fire-archer':{attack(ctx,u){if(u.shots%4===0)ctx.status(u,'attackHaste',3,.7,u);}},
  'shadow-reaper':{
    attack(ctx,u,t,hit){if(!u.memory.struck)hit.critical=true;if(u.memory.soul&&!t.isCastle){hit.damage+=healthCap(ctx,t)*.15;u.memory.soul=false;}},
    hit(ctx,u,t,r){if(damageEvent(r))u.memory.struck=true;if(r.killed&&!t.isCastle)u.memory.soul=true;},
  },
  voltriker:{attack(ctx,u,t,hit){hit.combat={attackShape:u.shots%4===0?'square':'single',multiTarget:u.shots%4===0,maxTargets:u.shots%4===0?3:1,impactSize:'3 × 3 tiles'};}},
  frostmaw:{hit(ctx,u,t,r){if(damageEvent(r)&&!t.isCastle&&ctx.random()<.08)ctx.status(t,'silence',5,0,u);}},
  hexon:{hit(ctx,u,t,r){if(damageEvent(r)&&!t.isCastle&&u.hits%4===0)ctx.status(t,'stun',.6,0,u);}},
  'mecha-shield':{tick(ctx,u,dt){periodic(u,'shieldWave',dt,21,()=>allies(ctx,u).forEach(t=>ctx.giveShield(t,25)));}},
  venomspikes:{hit(ctx,u,t,r){
    if(!damageEvent(r)||t.isCastle)return;
    const marks=t.memory.venomMarks||=(Object.create(null));marks[u.id]=(marks[u.id]||0)+1;
    if(marks[u.id]>=5){marks[u.id]-=5;ctx.damage(u,t,healthCap(ctx,t)*.08,{kind:'ability',bypassShield:true,secondary:true});ctx.fx('poison',t.x,t.y,{side:u.side});}
  }},
  astranova:{attack(ctx,u,t,hit){const nova=u.shots%10===0;hit.combat={attackShape:nova?'square':'single',multiTarget:nova,maxTargets:nova?null:1,impactSize:'5 × 5 tiles'};if(nova)hit.damage*=5;}},
  kai:{
    damaged(ctx,u,s,r){u.memory.chargeDamage=(u.memory.chargeDamage||0)+r.total;const chunks=Math.floor(u.memory.chargeDamage/10);u.memory.chargeDamage-=chunks*10;u.memory.charge=(u.memory.charge||0)+chunks*20;},
    attack(ctx,u,t,hit){if((u.memory.charge||0)>=100){u.memory.charge-=100;hit.damage*=1.6;hit.kaiCharged=true;}},
    hit(ctx,u,t,r,hit){if(!damageEvent(r)||t.isCastle)return;if(u.shots%3===0)ctx.status(t,'stun',.8,0,u);if(hit.kaiCharged)ctx.push(t,u,3);},
  },
  cassandra:{tick(ctx,u,dt){
    aura(ctx,u,'predominance',1,true);
    periodic(u,'music',dt,1,()=>{
      allies(ctx,u,radius(u,ctx),true).forEach(t=>{const gain=Math.min(1,50-(t.memory.musicGrowth||0));if(gain>0){t.memory.musicGrowth=(t.memory.musicGrowth||0)+gain;t.maxHp+=gain;t.stats.health=t.maxHp;t.hp+=gain;}});
      enemies(ctx,u).forEach(t=>ctx.damage(u,t,1,{kind:'ability',secondary:true}));ctx.fx('wave',u.x,u.y,{radius:radius(u,ctx),side:u.side});
    },ctx);
  }},
  arcanyx:{
    attack(ctx,u,t,hit){hit.damage*=1.6;},
    hit(ctx,u,t,r){if(damageEvent(r))ctx.near(t,radius(u,ctx),a=>a.side===u.side).forEach(a=>ctx.status(a,'regen',5,0,u,{amount:4,interval:1}));},
  },
  toxic:{hit(ctx,u,t,r){poisonHit(ctx,u,t,r,2,3);}},
  leafshade:{
    attack(ctx,u,t,hit){hit.bypassShield=true;},
    tick(ctx,u,dt){periodic(u,'lifestealClock',dt,7,()=>{u.stats.lifestealChance=Math.min(25,u.stats.lifestealChance+1);},ctx);},
  },
  jestro:{
    hit(ctx,u,t,r){if(damageEvent(r)&&!t.isCastle&&ctx.random()<.06)ctx.status(t,'silence',5,0,u);},
    damaged(ctx,u){if(u.hp>0&&u.hp<healthCap(ctx,u)*.75&&!u.memory.cratex){u.memory.cratex=true;ctx.spawn(u.def.forms[0],u.side,u,u.lane,{count:1,groupId:u.groupId});}},
  },
  'jestro/cratex':{hit(ctx,u,t,r){if(damageEvent(r)&&!t.isCastle)ctx.status(t,'stun',1.3,0,u);}},
  'ship-cannoneer':{tick(ctx,u){u.stats.attackSpeed=u.def.stats.attackSpeed/(1+Math.max(0,shieldCap(ctx,u)-u.shield)*.001);}},
  lumina:{tick(ctx,u,dt){periodic(u,'radiance',dt,.25,()=>enemies(ctx,u).forEach(t=>ctx.damage(u,t,healthCap(ctx,t)*.01,{kind:'ability',secondary:true})));}},
  'hell-boy':{
    attack(ctx,u,t,hit){if(u.shots%5===0)u.memory.rageUntil=ctx.time+3;if((u.memory.rageUntil||0)>ctx.time&&!t.isCastle)hit.damage+=healthCap(ctx,t)*.05;},
  },
  slasherx:{attack(ctx,u,t,hit){if(!t.isCastle&&ctx.random()<Math.min(1,(1+u.shield)/100))hit.instantKill=true;}},
  sheriff:{
    tick(ctx,u){u.memory.marked=ctx.near(u,10,t=>ctx.canTarget(u,t)).sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)).slice(0,6).map(t=>t.id);},
    attack(ctx,u,t,hit){if(u.memory.marked?.includes(t.id))hit.damage*=1.25;},
  },
  nurse:{
    lifesteal(ctx,u,amount){if(amount>0)(u.memory.nurseStacks||=[]).push(ctx.time+10);},
    tick(ctx,u){u.memory.nurseStacks=(u.memory.nurseStacks||[]).filter(end=>end>ctx.time);u.stats.damage=u.def.stats.damage+Math.min(20,u.memory.nurseStacks.length*2);},
  },
  tribe:{
    spawn(ctx,u){const i=ctx.units.filter(t=>t.groupId===u.groupId&&t.def.id===u.def.id).length-1;u.memory.dagger=i<2;u.stats.damage=u.memory.dagger?4:6;u.stats.attackSpeed=u.memory.dagger?1:1.25;},
    tick(ctx,u,dt){u.memory.charge=(u.memory.charge||0)+8*dt;},
    attack(ctx,u,t,hit){if((u.memory.charge||0)>=100){u.memory.charge-=100;hit.damage*=u.memory.dagger?2:3;hit.tribeCharged=true;
      const group=ctx.units.filter(a=>a.alive&&a.groupId===u.groupId);const selected=group.find(a=>a.memory.chargedTarget)?.memory.chargedTarget;
      const target=ctx.units.find(a=>a.alive&&a.id===selected&&a.side!==u.side);
      if(target)hit.targetId=target.id;else group.forEach(a=>a.memory.chargedTarget=t.id);
    }},
    hit(ctx,u,t,r,hit){if(!damageEvent(r)||!hit.tribeCharged||t.isCastle)return;if(u.memory.dagger&&t.hp<healthCap(ctx,t)*.7)ctx.status(t,'bleed',5,0,u,{amount:healthCap(ctx,t)*.01,interval:1});if(!u.memory.dagger)ctx.push(t,u,.5);},
  },
  earthshakers:{
    attack(ctx,u,t,hit){if(u.shots%4===0)hit.combat={attackShape:'square',impactSize:'3 × 3 tiles',multiTarget:true,maxTargets:null};},
    hit(ctx,u,t,r){if(damageEvent(r)&&!t.isCastle&&u.shots%4===0){ctx.status(t,'stun',1.5,0,u);ctx.status(t,'movementSlow',3.5,.3,u);}},
  },
  'void-striker':{
    spawn(ctx,u){u.memory.nextFast=ctx.time+18;},
    attack(ctx,u,t,hit){if(ctx.time>=u.memory.nextFast){u.memory.nextFast+=18;hit.haste=.2;hit.voidFast=true;}},
    hit(ctx,u,t,r,hit){if(damageEvent(r)&&hit.voidFast&&!t.isCastle)ctx.status(t,'slow',.8,.1,u);},
  },
  shellbyte:{
    tick(ctx,u,dt){if(enemies(ctx,u).some(t=>ctx.canTarget(u,t))){u.memory.leapClock=0;return;}
      periodic(u,'leapClock',dt,.225,()=>{u.memory.charge=(u.memory.charge||0)+3;});
      if((u.memory.charge||0)>=100){const target=enemies(ctx,u,4.5).filter(t=>!airborne(t)&&ctx.canTarget(u,t)).sort((a,b)=>a.hp-b.hp)[0];if(target){u.memory.charge-=100;const leap=()=>{u.x=target.x+(u.side===0?-.35:.35);u.y=target.y;u.targetId=target.id;u.memory.leapStrike=true;ctx.fx('leap',u.x,u.y,{side:u.side});};if(ctx.useAbility)ctx.useAbility(u,leap);else leap();}}
    },
    attack(ctx,u,t,hit){if(u.memory.leapStrike){hit.damage*=1.5;u.memory.leapStrike=false;}},
  },
};

/* These are author-data gaps, not substitute versions of the native abilities. */
export const ABILITY_GAPS = {
  nortex:['The +40% successive-shot bonus has no authored reset or stacking boundary.'],
  fen:['Blindness duration is authored, but its Range/Vision reduction percentage is not.'],
  nightprowler:['The opening Misfortune effect has no authored magnitude or duration.'],
  angels:['The continuous spawn stream has no end condition or relationship to Count 10.'],
  boomix:['The returning projectile has no authored turn point or return-hit rule.'],
  albert:['The same-target growth has no authored increment or reset rule.'],
  chicken:['The 80% larger death explosion has no authored enlarged dimensions.'],
  tornado:['The whirlwind energy or duration, which triggers release, is not authored.'],
  tphoenix:['Health restored when Fire Egg breaks and returns to Tphoenix is not authored.'],
  'tphoenix/fire-egg':['Health restored on a broken-egg transformation is not authored.'],
  'tphoenix/phoenix':[],
  'corsair-crew':['Pirate Girls have no distance-to-damage scaling formula before the 75% cap.'],
  'corsair-crew/pirate-girls':['Distance-to-damage scaling before the 75% cap is not authored.'],
  whisper:['Host restoration and ownership after the possession expires are not authored.'],
  roguex:['Blindness has no authored Range/Vision reduction percentage.'],
  sunrise:['The 210 Health growth cap is not identified as total Health or bonus Health.'],
  wong:['The firearm state after its eight-hit burst is not authored.'],
};

// Phoenix is not independently selectable; its parent remains locked until its
// broken-egg health is supplied. The native shield bypass/growth is still exact.
ABILITIES['tphoenix/phoenix']={attack(ctx,u,t,hit){hit.bypassShield=true;},hit(ctx,u,t,r){if(damageEvent(r))growDamage(u,1);}};

export function abilityReadiness(raw,id) {
  if(ABILITY_GAPS[id]?.length)return [...ABILITY_GAPS[id]];
  if(ABILITIES[id])return [];
  if(!raw.trait||raw.trait==='-')return [];
  return ['Native ability cannot be verified until its missing combat profile is authored.'];
}

export const SPELL_RULES = Object.freeze({
  'giga-bomb':{kind:'burn',interval:STATUS_INTERVALS.burn},
  'spirit-of-the-wild':{kind:'suppression',duration:10},
  'illustration-spell':{kind:'conversion',duration:20},
  laser:{kind:'laser'},
  'nightfall-curse':{kind:'curse',magnitude:.4},
  roots:{kind:'slow',magnitude:.15,groundOnly:true},
  'lunar-mirrage':{kind:'copies',duration:27},
  'shock-bomb':{kind:'stun',duration:1.5},
  'shield-of-serenity':{kind:'shield',magnitude:.2},
  'healing-light':{kind:'heal',magnitude:.3,cleanse:true},
  'dark-orb':{kind:'deathBlast'},
  reflector:{kind:'reflect',magnitude:.6,castleMagnitude:.4},
  'guard-post':{kind:'turret'},
  watchtower:{kind:'turret',aura:'damageBonus',magnitude:.1},
  'obsidian-fortress':{kind:'aura',aura:'spellProtection',magnitude:.5},
  'mana-surge':{kind:'blast'},
  'stagnantias-wrath':{kind:'global'},
});
export const SPELL_GAPS = {
  'ember-strike':['The healing-reduction effect has no authored duration.'],
  present:['The random 10–150% bonus has no authored probability distribution.'],
  meteor:['The distance-to-damage falloff formula and distance origin are not authored.'],
  'crystalline-prison':['Damage ticks conflict with the statement that imprisoned units cannot take damage.'],
  'ice-tower':['The 25% Slow has no authored duration.'],
  'stone-wall':['The blocking wall footprint and collision dimensions are not authored.'],
  'dragon-nest':['Fire Dragon and Shadow Dragon lack essential combat profiles and travel distances.'],
  'arcane-shield':['The barrier has no authored Health or lifetime.'],
  'void-rift':['The pull duration and detonation timing are not authored.'],
};
