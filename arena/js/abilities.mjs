/* Native card rules. Missing facts are explicit locks, never invented effects. */
import { RULES, clamp } from './rules.mjs';
import { STATUS_INTERVALS, hasStatus } from './statuses.mjs';

const animal = u => (u?.def?.type || []).includes('Animal');
const airborne = u => u?.def?.combat?.movementType === 'flying';
const radius = (u,ctx) => (ctx?.statValue?ctx.statValue(u,'range'):u.stats.range)/1000;
const enemies = (ctx,u,r=radius(u,ctx)) => ctx.near(u,r,t=>(ctx.isEnemy?ctx.isEnemy(u,t):t.side!==u.side)&&!t.isCastle);
const healthCap=(ctx,u)=>ctx.maxHealth?ctx.maxHealth(u):u.maxHp;
const shieldCap=(ctx,u)=>ctx.maxShield?ctx.maxShield(u):u.maxShield;
const ascended=u=>u.def.ascension?.active||u.def.id.endsWith('/ascended');
const squareFriends=(ctx,u)=>ctx.units.filter(t=>t!==u&&t.alive&&t.side===u.side&&!t.isBuilding&&!t.engulfedBy&&!t.banished&&!t.possessingId&&!t.parasitizingId&&Math.abs(t.x-u.x)<=1.5+1e-7&&Math.abs(t.y-u.y)<=1.5+1e-7);
const reacherMode=(ctx,u,target=null)=>{
  const melee=target&&target.def?.combat?.movementType!=='flying'&&Math.hypot(target.x-u.x,target.y-u.y)<=1+(target.radius||0)+1e-7;
  const index=melee?0:1,mode=u.def.attack.modes[index];
  if(u.memory.combatMode!==index){u.burstIndex=0;u.burstTargetId=null;u.memory.combatMode=index;}
  Object.assign(u.stats,{damage:mode.damage,attackSpeed:mode.interval,delay:mode.delay,range:mode.range});
};
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
const lyraBonus=(ctx,u)=>Math.min(5,Math.floor(Math.max(0,1-u.hp/healthCap(ctx,u))*10+1e-7))*.08;
const enrageNaar=(ctx,u,crossed=false)=>{
  const threshold=healthCap(ctx,u)*.4;
  if(u.hp>=threshold){u.memory.naarArmed=true;return;}
  if(u.hp<=0||(u.memory.naarArmed===false&&!crossed)||(u.memory.naarCasts||0)>=3)return;
  u.memory.naarArmed=false;u.memory.naarCasts=(u.memory.naarCasts||0)+1;
  const cast=()=>{(u.memory.grenadeBursts||=[]).push({remaining:20,clock:0});ctx.fx('wave',u.x,u.y,{side:u.side,radius:radius(u,ctx),color:'#ffc184'});};
  if(ctx.useAbility)ctx.useAbility(u,cast);else cast();
};
const armWong=(ctx,u)=>{
  if(!u.alive||u.hp<=0||u.hp>=healthCap(ctx,u)*.4||u.wongBurstUsed)return;
  const draw=()=>{
    u.wongBurstUsed=true;u.memory.wongShots=0;
    u.attackMode={remaining:8,attack:{damage:8,interval:.4,delay:0,count:1},combat:{attackType:'ranged',attackShape:'single',multiTarget:false,maxTargets:1}};
    u.burstIndex=0;u.burstTargetId=null;u.cooldown=0;
    for(const target of enemies(ctx,u))if(!target.isBuilding)ctx.push(target,u,5);
    ctx.fx('wave',u.x,u.y,{side:u.side,radius:radius(u,ctx),color:'#ffc184'});
  };
  if(ctx.useAbility)ctx.useAbility(u,draw);else draw();
};
const untouchReady=(ctx,u)=>{
  const state=u.memory.untouch;
  if(state?.until&&ctx.time+1e-7>=state.until){state.until=0;state.ready=true;}
  return state;
};

export const ABILITIES = {
  willowshade:{
    attack(ctx,u,t,hit){hit.bypassShield=true;},
    death(ctx,u){const form=u.def.forms[0];if(form)ctx.spawn(form,u.side,u,u.lane,{count:1,groupId:u.groupId});},
  },
  'willowshade/octarion':{death(ctx,u){
    ctx.state.fields.push({id:`poison-${++ctx.serial}`,kind:'poison-cloud',x:u.x,y:u.y,side:u.side,source:u,shape:{shape:'rect',width:1.5,height:1.5},born:ctx.time,until:ctx.time+3,poisoned:{}});
    ctx.fx('poison',u.x,u.y,{side:u.side,radius:.75,duration:3});
  }},
  stormblade:{
    attack(ctx,u,t,hit){hit.combat={...hit.combat,multiTarget:false,maxTargets:1};},
    hit(ctx,u,t,result,hit){
      if(!damageEvent(result)||hit.stormBounce||t.isBuilding||t.isCastle)return;
      const targets=ctx.near(t,3,v=>v!==t&&!v.isBuilding&&!v.healthless&&ctx._canHit(u,v))
        .sort((a,b)=>Math.hypot(a.x-t.x,a.y-t.y)-Math.hypot(b.x-t.x,b.y-t.y)||a.id.localeCompare(b.id)).slice(0,3);
      for(const target of targets){ctx._resolveHit(u,target,{...hit,damage:hit.damage*.5,secondary:true,stormBounce:true});ctx.fx('chain',target.x,target.y,{fromX:t.x,fromY:t.y,side:u.side,color:'#b4d8ff',duration:.3});}
    },
  },
  mixela:{unitDeath(ctx,u,dead){
    if(dead.isBuilding||dead.healthless||Math.hypot(dead.x-u.x,dead.y-u.y)>radius(u,ctx)+(dead.radius||0)+1e-7)return;
    const gain=healthCap(ctx,dead)*.6;u.maxHp+=gain;u.stats.health=u.maxHp;u.hp=Math.min(healthCap(ctx,u),u.hp+gain);
    u.memory.mixelaGrowth=(u.memory.mixelaGrowth||0)+gain;ctx.fx('heal',u.x,u.y,{side:u.side,amount:gain});
  }},
  thief:{spawn(ctx,u){ctx.prepareWeapon(u);},tick(ctx,u){if(!u.theftState?.used)ctx.stealAbility(u);}},
  azrith:{
    tick(ctx,u){if(u.shield>0)for(const ally of ctx.units.filter(t=>t.alive&&t!==u&&t.side===u.side&&!t.engulfedBy&&!t.banished&&!t.possessingId&&!t.parasitizingId&&Math.abs(t.x-u.x)<=1&&Math.abs(t.y-u.y)<=1))ctx.status(ally,'damageBonus',.2,.1,u);},
    damaged(ctx,u,source,result){
      if(u.hp<=0||!(result.shieldDamage>0)||u.shield>0||u.banneroxCreated)return;
      u.banneroxCreated=true;const [flag]=ctx.spawn(u.def.forms[0],u.side,u,u.lane,{count:1,groupId:u.groupId});
      if(flag){flag.isBuilding=true;flag.stats.speed=0;ctx.fx('spawn',flag.x,flag.y,{side:u.side,color:'#f1d893'});}
    },
  },
  'azrith/bannerox':{tick(ctx,u){for(const ally of ctx.units.filter(t=>t.alive&&t!==u&&t.side===u.side&&!t.engulfedBy&&!t.banished&&!t.possessingId&&!t.parasitizingId&&Math.abs(t.x-u.x)<=1&&Math.abs(t.y-u.y)<=1))ctx.status(ally,'attackHaste',.2,.1,u);}},
  'bio-mech':{damaged(ctx,u,source,result){
    if(!damageEvent(result))return;
    for(const ally of allies(ctx,u).filter(t=>!t.isBuilding&&!t.healthless))ctx.giveShield(ally,ally.def.stats.shield>0?shieldCap(ctx,ally)*.03:5);
  }},
  laura:{tick(ctx,u,dt){
    u.memory.charge=(u.memory.charge||0)+8*dt;
    while(u.memory.charge+1e-7>=100){
      u.memory.charge=Math.max(0,u.memory.charge-100);
      const cast=()=>{for(const ally of allies(ctx,u))for(const kind of ['damageBonus','attackHaste','speedBonus'])ctx.status(ally,kind,30,.25,u);ctx.fx('wave',u.x,u.y,{side:u.side,radius:radius(u,ctx),color:'#b6e8e1'});};
      if(ctx.useAbility)ctx.useAbility(u,cast);else cast();
    }
  }},
  rotlings:{
    spawnForms:[0],spawnFormCounts:{0:1},conditionalStats:['damage'],
    tick(ctx,u){u.memory.rotlingSouls=(u.memory.rotlingSouls||[]).filter(until=>until>ctx.time+1e-7);u.stats.damage=u.def.stats.damage+u.memory.rotlingSouls.length;},
    unitDeath(ctx,u,dead){
      if(dead.side===u.side||dead.isBuilding)return;
      (u.memory.rotlingSouls||=[]).push(ctx.time+20);ABILITIES.rotlings.tick(ctx,u);
    },
  },
  'rotlings/mini-rotters':{
    death(ctx,u){
      const mist=u.def.raw.mechanicStats?.deathMist;if(!mist)return;
      ctx.state.fields.push({id:`mist-${++ctx.serial}`,kind:'blinding-mist',x:u.x,y:u.y,side:u.side,source:u,shape:{shape:'rect',width:mist.size,height:mist.size},born:ctx.time,until:ctx.time+mist.duration,magnitude:mist.blind/100});
    },
  },
  sushu:{
    noBasicAttack:true,
    spawn(ctx,u){ctx.status(u,'invisible',Infinity,0,u);},
    contact(ctx,u,t){ctx.parasitize(u,t);},
  },
  'void-wraith':{
    conditionalStats:['damage'],
    tick(ctx,u){
      const links=u.memory.voidLinks||={},nearby=enemies(ctx,u);
      for(const target of nearby)if(!target.isBuilding&&!target.healthless)links[target.id]=true;
      let bonus=0;
      for(const id of Object.keys(links)){
        const target=ctx.units.find(t=>t.id===id);
        if(!target?.alive||target.isBuilding||target.healthless||!ctx.isEnemy(u,target)||Math.hypot(target.x-u.x,target.y-u.y)>=6-1e-7){
          if(target)target.statuses=target.statuses.filter(s=>!(s.voidDrain&&s.sourceId===u.id));delete links[id];continue;
        }
        const status=ctx.status(target,'statReduction',.2,0,u,{percent:true,stats:{damage:.2},voidDrain:true});
        if(status){const clean={...target,statuses:target.statuses.filter(s=>!(s.voidDrain&&s.sourceId===u.id))};bonus+=ctx.statValue(clean,'damage')*.2;}
      }
      u.memory.voidBonus=Math.min(16,bonus);u.stats.damage=u.def.stats.damage+u.memory.voidBonus;
    },
  },
  untouch:{
    damaged(ctx,u,source,result){
      if(u.hp<=0||!result.healthDamage)return;
      const state=u.memory.untouch||={loss:0,ready:false,until:0};
      state.loss+=result.healthDamage/healthCap(ctx,u);
      const steps=Math.floor((state.loss+1e-7)/.2);if(!steps)return;
      state.loss=Math.max(0,state.loss-steps*.2);state.until=ctx.time+2;state.ready=false;
      ctx.status(u,'untouchable',2,0,u);ctx.fx('shield',u.x,u.y,{side:u.side,duration:2});
    },
    tick(ctx,u){untouchReady(ctx,u);},
    attack(ctx,u,t,hit){if(untouchReady(ctx,u)?.ready){hit.damage*=1.2;hit.untouchBonus=true;}},
    hit(ctx,u,t,result,hit){if(damageEvent(result)&&hit.untouchBonus)u.memory.untouch.ready=false;},
  },
  heartix:{
    attack(ctx,u,t,hit){if(!t.isBuilding&&!t.isCastle&&ctx.time-(u.memory.heartixLast??u.born??0)+1e-7>=24){u.memory.heartixLast=ctx.time;hit.heartixTargetId=t.id;}},
    hit(ctx,u,t,result,hit){if(damageEvent(result)&&t.id===hit.heartixTargetId)ctx.convert(u,t,8);},
  },
  'r-1':{burstBoost:{chance:.03,damage:1.1,width:3,range:2}},
  blank:{hit(ctx,u,t,result){if(result.killed&&!t.isCastle&&!t.isBuilding)growDamage(u,1,5);}},
  magmara:{hit(ctx,u,t,result){if(damageEvent(result)&&!t.isCastle&&!t.isBuilding){ctx.status(t,'burn',3,0,u,{amount:10,stack:true});ctx.fx('burn',t.x,t.y,{side:u.side});}}},
  collector:{hit(ctx,u,t,result){if(result.killed&&!t.isCastle&&!t.isBuilding){ctx.teams[u.side].mana=Math.min(RULES.maxMana,ctx.teams[u.side].mana+2);ctx.fx('mana',u.x,u.y,{side:u.side,amount:2});}}},
  umbra:{damaged(ctx,u){
    if(u.hp<=0)return;
    if(u.hp<=healthCap(ctx,u)*.75&&!u.umbraHidden){u.umbraHidden=true;ctx.status(u,'invisible',3,0,u);}
    if(u.hp<=healthCap(ctx,u)*.5&&!u.umbraRetreated){u.umbraRetreated=true;ctx.retreat(u,7.5);}
  }},
  'venom-fangs':{
    attack(ctx,u,t,hit){hit.bypassShield=true;},
    hit(ctx,u,t,result){
      if(!damageEvent(result)||t.isCastle||t.isBuilding)return;
      const gain=Math.min(.5,Math.max(0,t.stats.criticalChance),Math.max(0,100-u.stats.criticalChance));
      t.stats.criticalChance-=gain;u.stats.criticalChance+=gain;
    },
  },
  skyhunter:{attack(ctx,u,t,hit){const bonus=Math.hypot(t.x-u.x,t.y-u.y)*.1;u.memory.skyhunterBonus=bonus;hit.damage*=1+bonus;}},
  rockback:{
    conditionalStats:['speed'],
    tick(ctx,u){u.stats.speed=u.def.stats.speed*(!u.memory.rockbackStruck&&u.targetId?1.5:1);},
    attack(ctx,u,t,hit){if(!u.memory.rockbackStruck){hit.damage*=2.5;hit.rockbackCharge=true;}},
    damaged(ctx,u,s,result){if(result.shieldDamage>0&&u.shield<=0&&u.hp>0)u.memory.rockbackRepair=ctx.time+6;},
    hit(ctx,u,t,result,hit){
      if(!damageEvent(result))return;
      if(hit.rockbackCharge){u.memory.rockbackStruck=true;u.stats.speed=u.def.stats.speed;}
      if((u.memory.rockbackRepair||0)>ctx.time+1e-7)ctx.giveShield(u,Math.min(10,Math.max(0,shieldCap(ctx,u)-u.shield)));
    },
  },
  'neon-droid':{
    conditionalStats:['attackSpeed'],
    tick(ctx,u){u.memory.neonStacks=(u.memory.neonStacks||[]).filter(end=>end>ctx.time+1e-7);u.stats.attackSpeed=u.def.stats.attackSpeed/(1+u.memory.neonStacks.length*.2);},
    hit(ctx,u,t,result){if(damageEvent(result)){u.memory.neonStacks=[...(u.memory.neonStacks||[]).filter(end=>end>ctx.time+1e-7),ctx.time+3].slice(-3);ABILITIES['neon-droid'].tick(ctx,u);}},
  },
  reacher:{
    conditionalStats:['damageminimiser'],
    spawn(ctx,u){reacherMode(ctx,u);},
    prepareAttack:reacherMode,
    tick(ctx,u){const n=squareFriends(ctx,u).length;u.memory.nearbyFriends=n;u.stats.damageminimiser=u.def.stats.damageminimiser+Math.min(ascended(u)?24:16,n*(ascended(u)?3:2));},
  },
  bastra:{
    conditionalStats:['attackSpeed'],
    tick(ctx,u){const n=squareFriends(ctx,u).length;u.memory.nearbyFriends=n;u.stats.attackSpeed=u.def.stats.attackSpeed/(1+n*(ascended(u)?.03:.02));},
    attack(ctx,u,t,hit){hit.bypassShield=true;},
  },
  maapp:{hit(ctx,u,t,result){
    const up=ascended(u);
    if(damageEvent(result)&&!t.isCastle&&!t.isBuilding&&ctx.random()<(up?.10:.08))ctx.status(t,'statReduction',up?3:2,0,u,{percent:true,stats:{damage:up?.8:.75}});
  }},
  'john-reynolds':{
    criticalPiercesShield:true,
    damaged(ctx,u,source,result){
      if(u.hp<=0||!(result.healthDamage>0))return;
      const lost=(u.memory.johnHealthLoss||0)+result.healthDamage/healthCap(ctx,u),steps=Math.floor((lost+1e-7)/.08);
      u.memory.johnHealthLoss=Math.max(0,lost-steps*.08);
      if(!steps)return;
      u.memory.johnWhinnies=(u.memory.johnWhinnies||0)+steps;
      const cast=()=>{
        const duration=ascended(u)?5:3;
        ctx.status(u,'taunt',duration,0,u,{radius:radius(u,ctx)});
        ctx.status(u,'protection',duration,ascended(u)?.3:.25,u);
        ctx.fx('wave',u.x,u.y,{side:u.side,radius:radius(u,ctx),color:'#ffd4a1'});
      };
      if(ctx.useAbility)ctx.useAbility(u,cast);else cast();
    },
  },
  avara:{
    attack(ctx,u,target,hit){const step=hit.sequenceIndex%4;if(step===1){hit.projectileKind='raspberry';hit.projectileColor='#f6a2c6';}else if(step===2){hit.projectileKind='avocado';hit.projectileColor='#c6e28e';}},
    hit(ctx,u,target,result,hit){
      if(!damageEvent(result)||target.isCastle||target.isBuilding)return;
      const step=hit.sequenceIndex%4,up=ascended(u);
      if(step===0)ctx.status(target,'slow',up?2.75:2.5,up?.5:.4,u);
      else if(step===1)ctx.push(target,u,up?3:2.5);
      else if(step===2)ctx.status(target,'stun',up?1.25:.75,0,u);
    },
  },
  hammies:{spawn(ctx,u){ctx.status(u,'speedBonus',12,.2,u);}},
  'b-b':{incoming(ctx,u,s,hit){if(animal(s))hit.damage*=.4;}},
  scrapy:{attack(ctx,u,t,hit){hit.bypassShield=true;if(ctx.random()<.25)hit.damage*=1.5;}},
  nitrox:{tick(ctx,u){aura(ctx,u,'attackHaste',.12);}},
  nortex:{attack(ctx,u,t,hit){hit.damage*=1+.4*hit.burstIndex;}},
  fen:{hit(ctx,u,t,result){
    if(damageEvent(result)&&!t.isCastle&&!t.isBuilding)ctx.status(t,'blind',7,.125,u);
  }},
  nightprowler:{
    breakStealthOnDamage:true,
    spawn(ctx,u){u.memory.lastDamageDealt=ctx.time;},
    tick(ctx,u){
      const last=Math.max(u.born??ctx.time,u.memory.lastDamageDealt??0,u.memory.lastDamageReceived??0);
      if(ctx.time-last+1e-7<2||hasStatus(u,'invisible',ctx.time))return;
      const hide=()=>ctx.status(u,'invisible',Infinity,0,u);
      if(ctx.useAbility)ctx.useAbility(u,hide);else hide();
    },
    attack(ctx,u,t,hit){if(hasStatus(u,'invisible',ctx.time))hit.nightAmbush=true;},
    hit(ctx,u,t,result,hit){
      if(damageEvent(result)&&hit?.nightAmbush&&!t.isCastle&&!t.isBuilding)ctx.status(t,'misfortune',8,.1,u);
    },
  },
  gloop:{
    contactAttack:true,
    lifeDecay:{fraction:.01,interval:1},
    tick(ctx,u,dt){
      const interval=ctx.attackInterval(u),attempts=u.memory.engulfAttempts||=Object.create(null);
      for(const target of enemies(ctx,u,u.radius)){
        if((attempts[target.id]||0)>ctx.time)continue;
        attempts[target.id]=ctx.time+interval;
        ctx.engulf(u,target);
      }
      for(const target of ctx.captivesOf(u)){
        target.memory.digestClock+=dt;
        while(target.alive&&target.memory.digestClock+1e-7>=interval){
          target.memory.digestClock-=interval;
          ctx.damage(u,target,ctx.statValue(u,'damage'),{kind:'ability',secondary:true});
        }
      }
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
    tick(ctx,u,dt){periodic(u,'freakRegenClock',dt,1,()=>ctx.heal(u,1,u),ctx);},
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
  angels:{
    spawnSchedule:{initialGap:.4,gapStep:.05},
    unitDeath(ctx,u,dead){
      if(dead.def?.id!=='angels'||dead.side!==u.side||dead===u||dead.isBuilding)return;
      u.memory.angelDeaths=(u.memory.angelDeaths||0)+1;u.stats.damage+=2;
      ctx.fx('buff',u.x,u.y,{side:u.side,color:'#ffe6aa'});
    },
  },
  boomix:{
    attack(ctx,u,t,hit){hit.returning=true;hit.recoveryFromLaunch=true;},
    incoming(ctx,u,source,hit){if(u.memory.returningShotId)hit.damage*=.8;},
  },
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
  albert:{
    targetChanged(ctx,u,target){u.memory.albertTargetId=target?.id??null;u.memory.albertGrowth=0;u.stats.damage=u.def.stats.damage;},
    attack(ctx,u,target,hit){
      if(u.memory.albertTargetId===target.id)return;
      ABILITIES.albert.targetChanged(ctx,u,target);hit.damage=ctx.statValue?ctx.statValue(u,'damage'):u.stats.damage;
    },
    hit(ctx,u,target,result){
      if(!damageEvent(result)||u.memory.albertTargetId!==target.id)return;
      u.memory.albertGrowth=Math.min(3,(u.memory.albertGrowth||0)+1);
      u.stats.damage=u.def.stats.damage+u.memory.albertGrowth;
    },
  },
  chicken:{
    noBasicAttack:true,
    contactAttack:true,
    contact(ctx,u){ctx.killUnit(u);},
    death(ctx,u){
      const large=ctx.random()<.8,size=large?3.5:2,damage=ctx.statValue(u,'damage')*(large?5:1);
      const shape={shape:'rect',width:size,height:size};
      for(const target of [...ctx.units,...ctx.castles].filter(t=>ctx._canHit(u,t)&&ctx._inside(t,u,shape)))
        ctx.damage(u,target,damage,{kind:'ability',secondary:true,accuracyChecked:true});
      ctx.fx('explosion',u.x,u.y,{side:u.side,radius:size/2,color:large?'#ffb56b':'#ffd998',duration:.85});
      ctx.fx('blastArea',u.x,u.y,{side:u.side,width:size,height:size,color:'#ffc184',duration:.85});
    },
  },
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
  tornado:{
    captiveTarget:true,
    releaseCaptivesAfterBurst:3.5,
    tick(ctx,u){u.stats.damage=u.def.stats.damage+(u.hp<=healthCap(ctx,u)*.5?2:0);},
    attack(ctx,u,target,hit){hit.primaryTargetId=target.id;hit.splashScale=.5;hit.combat={attackShape:'circle',multiTarget:true,maxTargets:null};},
    hit(ctx,u,target,result,hit){
      if(!damageEvent(result)||target.id!==hit.primaryTargetId||target.engulfedBy===u.id)return;
      ctx.engulf(u,target,{radius:radius(u,ctx),vortex:true});
    },
    targetChanged(ctx,u,target){for(const captive of ctx.captivesOf(u))if(captive!==target)ctx.releaseEngulfed(captive);},
  },
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
      allies(ctx,u,radius(u,ctx),true).filter(t=>!t.healthless).forEach(t=>{const gain=Math.min(1,50-(t.memory.musicGrowth||0));if(gain>0){t.memory.musicGrowth=(t.memory.musicGrowth||0)+gain;t.maxHp+=gain;t.stats.health=t.maxHp;t.hp+=gain;}});
      enemies(ctx,u).forEach(t=>ctx.damage(u,t,1,{kind:'ability',secondary:true}));ctx.fx('wave',u.x,u.y,{radius:radius(u,ctx),side:u.side});
    },ctx);
  }},
  arcanyx:{
    attack(ctx,u,t,hit){hit.damage*=1.6;},
    hit(ctx,u,t,r){if(damageEvent(r))ctx.near(t,radius(u,ctx),a=>a.side===u.side).forEach(a=>ctx.status(a,'regen',5,0,u,{amount:4,interval:1}));},
  },
  tphoenix:{
    tick(ctx,u){ctx.phoenixEgg(u);},
    damaged(ctx,u,source,result,hit){
      if(source&&source!==u&&!hit.reflected)ctx.damage(u,source,result.total*.1,{kind:'reflect',secondary:true,reflected:true,friendlyFire:true});
      ctx.phoenixEgg(u);
    },
  },
  'tphoenix/fire-egg':{
    spawn(ctx,u){u.phoenixEggUsed=true;},
    tick(ctx,u){ctx.hatchPhoenix(u);},
    damaged(ctx,u){ctx.breakPhoenixEgg(u);},
  },
  'corsair-crew':{
    spawnForms:[0],
    intercept(ctx,u,shot){
      if(shot.hit.reflected)return false;
      const chance=clamp((5+ctx.statValue(u,'dodge')+ctx.statValue(u,'criticalChance'))/100,0,1);
      return ctx.random()<chance&&ctx.reflectProjectile(u,shot);
    },
  },
  'corsair-crew/pirate-girls':{attack(ctx,u,target,hit){
    const bonus=clamp(Math.hypot(target.x-u.x,target.y-u.y)/2.75,0,1)*.75;
    u.memory.distanceBonus=bonus;hit.damage*=1+bonus;
  }},
  roguex:{hit(ctx,u,target,result){
    if(damageEvent(result)&&!target.isCastle&&!target.isBuilding&&ctx.random()<.5)ctx.status(target,'blind',7,.25,u);
  }},
  whisper:{
    noBasicAttack:true,
    cannotCrit:true,
    possessor:true,
    exclusiveTarget:true,
    spawn(ctx,u){ctx.collectWhisperCritical(u);},
    target(ctx,u){return ctx.possessionTarget(u);},
    contact(ctx,u,target){ctx.possess(u,target);},
  },
  sunrise:{move(ctx,u,from,to,dt){
    if((u.memory.sunriseGrowth||0)>=210)return;
    periodic(u,'sunriseClock',dt,.6,()=>{
      const gain=Math.min(1,210-(u.memory.sunriseGrowth||0));if(gain<=0)return;
      u.memory.sunriseGrowth=(u.memory.sunriseGrowth||0)+gain;
      u.maxHp+=gain;u.stats.health=u.maxHp;u.hp=Math.min(healthCap(ctx,u),u.hp+gain);
      ctx.fx('buff',u.x,u.y,{side:u.side,color:'#ffe5a3'});
    },ctx);
  }},
  wong:{
    tick(ctx,u){armWong(ctx,u);},
    damaged(ctx,u){armWong(ctx,u);},
    attack(ctx,u,target,hit){
      if((u.memory.charge||0)>=100){u.memory.charge-=100;hit.wongCharged=true;}
    },
    hit(ctx,u,target,result,hit){
      if(!damageEvent(result))return;
      u.memory.charge=Math.min(100,(u.memory.charge||0)+25);
      if(hit.wongCharged&&!target.isCastle&&!target.isBuilding){ctx.push(target,u,3);ctx.status(target,'stun',1,0,u);}
    },
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
  stacy:{
    tick(ctx,u){u.stats.range=u.def.stats.range*(u.hp<healthCap(ctx,u)*.1?1.1:1);},
    hit(ctx,u,t,result){
      if(!damageEvent(result))return;
      ctx.status(t,'burn',4*STATUS_INTERVALS.burn,0,u,{amount:8,stack:true});
      ctx.fx('burn',t.x,t.y,{side:u.side,duration:.4,color:'#ffb578'});
    },
  },
  death:{unitDeath(ctx,u){
    const before=u.memory.damageGrowth||0;growDamage(u,2,80);
    if((u.memory.damageGrowth||0)>before)ctx.fx('buff',u.x,u.y,{side:u.side,color:'#c2a6ed'});
  }},
  demotron:{tick(ctx,u,dt){
    periodic(u,'repairClock',dt,10,()=>ctx.heal(u,Math.max(0,healthCap(ctx,u)-u.hp)*.1,u),ctx);
  }},
  magma:{move(ctx,u,from,to){
    const leave=()=>ctx.leaveTrail(u,from,to,{width:(u.def.combat.trailWidth||1500)/1000,duration:10,damage:3,interval:1});
    if(ctx.useAbility)ctx.useAbility(u,leave);else leave();
  }},
  'fallen-angel':{
    target(ctx,u){
      const previous=ctx.units.find(t=>t.id===u.memory.fallenTargetId);
      if(previous&&!previous.isBuilding&&ctx.canTarget(u,previous))return previous;
      return enemies(ctx,u,7.5).filter(t=>!t.isBuilding&&ctx.canTarget(u,t)&&Math.hypot(t.x-u.x,t.y-u.y)<=7.5+1e-7&&front(ctx,u,t))
        .sort((a,b)=>b.hp-a.hp||Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)||a.id.localeCompare(b.id))[0]||null;
    },
    targetChanged(ctx,u,target){
      u.memory.fallenTargetId=target?.id??null;u.memory.fallenStacks=0;u.stats.attackSpeed=u.def.stats.attackSpeed;
    },
    hit(ctx,u,target,result){
      if(!damageEvent(result)||target.isBuilding||target.isCastle||target.id!==u.memory.fallenTargetId)return;
      u.memory.fallenStacks=Math.min(80,(u.memory.fallenStacks||0)+1);
      u.stats.attackSpeed=u.def.stats.attackSpeed/(1+u.memory.fallenStacks/100);
    },
  },
  aeralis:{hit(ctx,u,t,result){
    if(damageEvent(result)&&!t.isCastle)ctx.push(t,u,ctx.random()<.12?.4:.1);
  }},
  'dark-necromancer':{
    hit(ctx,u,t,result){if(damageEvent(result)&&!t.isCastle&&ctx.random()<.17)ctx.status(t,'silence',10,0,u);},
    tick(ctx,u,dt){periodic(u,'summonClock',dt,14,()=>{
      const chance=ctx.random(),index=chance<.4?0:chance<.75?1:2,form=u.def.forms[index];
      if(form){ctx.spawn(form,u.side,u,u.lane,{count:1,groupId:u.groupId});ctx.fx('spawn',u.x,u.y,{side:u.side,color:'#bba3f1'});}
    },ctx);},
  },
  'dark-necromancer/bladeknight':{attack(ctx,u,t,hit){hit.bypassShield=true;}},
  'dark-necromancer/stormbow':{hit(ctx,u,t,result){
    if(damageEvent(result)&&!t.isCastle&&ctx.random()<.35)ctx.status(t,'burn',2*STATUS_INTERVALS.burn,0,u,{amount:4,stack:true});
  }},
  'dark-necromancer/ironhide':{incoming(ctx,u,s,hit){
    if(!(hit.damage>0))return;
    u.memory.incomingHits=(u.memory.incomingHits||0)+1;
    if(u.memory.incomingHits%4===0){hit.damage=0;hit.instantKill=false;ctx.fx('shield',u.x,u.y,{side:u.side});}
  }},
  ali:{tick(ctx,u,dt){
    u.memory.charge=(u.memory.charge||0)+allies(ctx,u).length*4*dt;
    while(u.memory.charge+1e-7>=100){
      u.memory.charge=Math.max(0,u.memory.charge-100);
      const protect=()=>{allies(ctx,u,radius(u,ctx),true).forEach(t=>ctx.status(t,'untouchable',3,0,u));ctx.fx('shield',u.x,u.y,{side:u.side,radius:radius(u,ctx)});};
      if(ctx.useAbility)ctx.useAbility(u,protect);else protect();
    }
  }},
  worms:{
    spawn(ctx,u){ctx.status(u,'invisible',Infinity,0,u);},
    hit(ctx,u,t,result){
      if(!damageEvent(result)||u.memory.ambushed)return;
      u.memory.ambushed=true;u.statuses=u.statuses.filter(s=>s.kind!=='invisible');
      if(!t.isCastle)ctx.status(t,'stun',.8,0,u);
      ctx.fx('leap',u.x,u.y,{side:u.side});
    },
  },
  bloodraider:{hit(ctx,u,t,result){
    if(!u.alive||!damageEvent(result))return;
    // Keep the unrounded compound value: 20 -> 22 -> 24.2 -> 26.62.
    u.memory.bloodDamage=Math.min(Number.MAX_SAFE_INTEGER,(u.memory.bloodDamage??u.stats.damage)*1.1);
    u.stats.damage=Math.round(u.memory.bloodDamage);
    ctx.loseHealth(u,healthCap(ctx,u)*.04);
  }},
  shine:{tick(ctx,u,dt){
    periodic(u,'shineClock',dt,5,()=>{
      for(const ally of allies(ctx,u,radius(u,ctx),true)){
        if(ally.healthless)continue;
        const stacks=ally.memory.shineStacks||0;if(stacks>=5)continue;
        const gain=ally.def.stats.health*.04;
        ally.memory.shineStacks=stacks+1;ally.maxHp+=gain;ally.stats.health=ally.maxHp;
        ally.hp=Math.min(healthCap(ctx,ally),ally.hp+gain);
        ctx.fx('buff',ally.x,ally.y,{side:u.side,color:'#f1db92'});
      }
    },ctx);
  }},
  avalith:{
    incoming(ctx,u,s,hit){if(ctx.random()<.33){hit.damage=0;hit.instantKill=false;ctx.fx('shield',u.x,u.y,{side:u.side});}},
    attack(ctx,u,t,hit){
      const distance=Math.hypot(t.x-u.x,t.y-u.y),range=u.def.stats.range/1000;
      hit.intervalScale=.2+.8*clamp((distance-1)/Math.max(.01,range-1),0,1);
      hit.returning=true;
    },
  },
  sylviana:{
    incoming(ctx,u,s,hit){if(s?.def?.type?.includes('Alien'))hit.damage*=.8;},
    death(ctx,u){const form=u.def.forms[0];if(form)ctx.spawn(form,u.side,u,u.lane,{count:form.stats.number,groupId:u.groupId});},
  },
  'sylviana/butterflies':{death(ctx,u){
    for(const ally of ctx.units.filter(t=>t.alive&&!t.healthless&&!t.engulfedBy&&!t.banished&&!t.possessingId&&!t.parasitizingId&&t.side===u.side&&Math.abs(t.x-u.x)<=.75+t.radius&&Math.abs(t.y-u.y)<=.75+t.radius)){
      ally.maxHp+=10;ally.stats.health=ally.maxHp;ally.hp=Math.min(healthCap(ctx,ally),ally.hp+10);
      ctx.fx('heal',ally.x,ally.y,{side:u.side,amount:10});
    }
    ctx.fx('healthBloom',u.x,u.y,{side:u.side,width:1.5,height:1.5,color:'#afe8ab',duration:.6});
  }},
  malvaris:{
    hit(ctx,u,t,result){
      if(!damageEvent(result)||t.isCastle||t.isBuilding)return;
      const form=u.def.forms[0];if(form)ctx.status(t,'soulMark',2,0,u,{onLethalHit:result.killed,summonFormId:form.id,summonSide:u.side,groupId:u.groupId});
    },
    unitDeath(ctx,u,dead){
      if(dead.side!==u.side)return;
      u.memory.criticalGrowth=Math.min(75,(u.memory.criticalGrowth||0)+.5);
      u.stats.criticalChance=u.def.stats.criticalChance+u.memory.criticalGrowth;
    },
  },
  'malvaris/phantomis':{tick(ctx,u){
    const extra=ctx.units.filter(t=>t.alive&&!t.banished&&t!==u&&t.side===u.side&&t.def.id===u.def.id).length;
    u.stats.damage=u.def.stats.damage*(1+extra*.1);
    u.stats.attackSpeed=u.def.stats.attackSpeed/(1+extra*.05);
  }},
  pyhsic:{tick(ctx,u,dt){
    periodic(u,'executionClock',dt,22,()=>{
      const forced=ctx.tauntTarget?.(u);
      const target=enemies(ctx,u,7.5).filter(t=>!t.isBuilding&&ctx.canTarget(u,t)&&front(ctx,u,t)&&(!forced||t===forced))
        .sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)||a.id.localeCompare(b.id))[0];
      if(!target)return;
      const result=ctx.damage(u,target,50,{kind:'ability',secondary:true});
      if(damageEvent(result)&&target.alive&&ctx.random()<clamp((20+healthCap(ctx,target)*.1)/100,0,1))
        ctx.damage(u,target,target.hp+target.shield+1,{kind:'ability',secondary:true,instantKill:true});
      ctx.fx('spell',target.x,target.y,{side:u.side,radius:.5,color:'#cbb2ff'});
    },ctx);
  }},
  unara:{
    hit(ctx,u,t,result){
      if(!u.alive||!damageEvent(result))return;
      u.memory.charge=(u.memory.charge||0)+9;
      if(u.memory.charge<100||u.memory.orbRemaining>0)return;
      const targets=enemies(ctx,u).filter(t=>!t.isBuilding&&ctx.canTarget(u,t))
        .sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)||a.id.localeCompare(b.id));
      if(!targets.length)return;
      u.memory.charge-=100;u.memory.orbRemaining=30;u.memory.orbClock=0;
      u.memory.orbRange=radius(u,ctx)+2;u.memory.orbTargets=targets.map(t=>t.id);
      targets.forEach(t=>ctx.push(t,u,2));ctx.fx('wave',u.x,u.y,{side:u.side,radius:radius(u,ctx),color:'#c5a7ff'});
    },
    tick(ctx,u,dt){
      if(!(u.memory.orbRemaining>0))return;
      u.memory.orbClock+=dt;
      while(u.memory.orbRemaining>0&&u.memory.orbClock+1e-9>=.1){
        u.memory.orbClock=Math.max(0,u.memory.orbClock-.1);
        const valid=t=>t?.alive&&!t.isBuilding&&ctx.canTarget(u,t)&&Math.hypot(t.x-u.x,t.y-u.y)<=u.memory.orbRange+(t.radius||0);
        const forced=ctx.tauntTarget?.(u);let target=valid(forced)?forced:null;
        if(forced&&!target){u.memory.orbRemaining--;continue;}
        if(!target){
          const queue=u.memory.orbTargets;
          while(queue.length&&!target){const id=queue.shift(),candidate=ctx.units.find(t=>t.id===id);if(valid(candidate)){target=candidate;queue.push(id);}}
        }
        if(!target){u.memory.orbRemaining=0;break;}
        u.memory.orbRemaining--;
        const launch=()=>ctx.abilityProjectile(u,target,2,{range:u.memory.orbRange,kind:'orb',color:'#c5a7ff'});
        if(ctx.useAbility)ctx.useAbility(u,launch);else launch();
      }
      if(!u.memory.orbRemaining){u.memory.orbTargets=[];u.memory.orbClock=0;}
    },
  },
  clara:{tick(ctx,u,dt){
    const nearby=enemies(ctx,u).filter(t=>!t.isBuilding&&(ctx.canSee?ctx.canSee(u,t):ctx.canTarget(u,t)));
    u.memory.charge=(u.memory.charge||0)+nearby.length*20*dt;
    while(u.memory.charge+1e-7>=100){
      u.memory.charge=Math.max(0,u.memory.charge-100);
      const cast=()=>{
        ctx.status(u,'taunt',7,0,u,{radius:radius(u,ctx)});
        ctx.status(u,'regen',7,0,u,{amount:3,interval:.25});
        ctx.fx('wave',u.x,u.y,{side:u.side,radius:radius(u,ctx),color:'#edb4a3'});
      };
      if(ctx.useAbility)ctx.useAbility(u,cast);else cast();
    }
  }},
  far:{hit(ctx,u,t,result){
    if(damageEvent(result)&&!t.isCastle&&!t.isBuilding&&ctx.random()<.08)ctx.banish(u,t,10);
  }},
  lyra:{
    tick(ctx,u){const bonus=lyraBonus(ctx,u);u.stats.damage=u.def.stats.damage*(1+bonus);u.stats.attackSpeed=u.def.stats.attackSpeed/(1+bonus);},
    attack(ctx,u,t,hit){const bonus=lyraBonus(ctx,u);hit.damage*=1+bonus;hit.haste=(hit.haste||0)+bonus;},
  },
  naar:{
    damaged(ctx,u,s,result){enrageNaar(ctx,u,u.hp+(result.healthDamage||0)>=healthCap(ctx,u)*.4);},
    tick(ctx,u,dt){
      enrageNaar(ctx,u);
      for(const burst of u.memory.grenadeBursts||[]){
        burst.clock+=dt;
        while(burst.remaining>0&&burst.clock+1e-9>=.5){
          burst.clock=Math.max(0,burst.clock-.5);burst.remaining--;
          const targets=enemies(ctx,u).filter(t=>!t.isBuilding&&ctx.canTarget(u,t))
            .sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)||a.id.localeCompare(b.id));
          const forced=ctx.tauntTarget?.(u),index=u.memory.grenadeCursor||0;
          const target=forced?targets.find(t=>t===forced):targets[index%targets.length];
          u.memory.grenadeCursor=index+1;if(!target)continue;
          const launch=()=>ctx.abilityProjectile(u,target,4,{range:radius(u,ctx),kind:'grenade',color:'#ffc184',impactSize:'1.25 × 1.25 tiles',deathBlast:{size:2.5,damage:40},cardOnly:true});
          if(ctx.useAbility)ctx.useAbility(u,launch);else launch();
        }
      }
      u.memory.grenadeBursts=(u.memory.grenadeBursts||[]).filter(b=>b.remaining>0);
    },
  },
  etheris:{tick(ctx,u){ctx.linkEtheris(u);}},
  format:{tick(ctx,u,dt){ctx.channelFormat(u,dt);}},
  artist:{
    hit(ctx,u,t,result){if(damageEvent(result))ctx.addInk(u,t);},
    death(ctx,u){
      const form=u.def.forms[0];if(!form)return;
      const bonus=Math.floor((u.memory.artistCharge||0)/20),lifetime=7+bonus,count=form.stats.number+bonus*2;
      for(const raven of ctx.spawn(form,u.side,u,u.lane,{count,groupId:u.groupId})){
        raven.stats.number=count;raven.stats.life=lifetime;raven.expiresAt=ctx.time+lifetime;raven.memory.artistCharge=u.memory.artistCharge||0;
      }
    },
  },
  'artist/flock-of-ravens':{},
};

/* These are author-data gaps, not substitute versions of the native abilities. */
export const ABILITY_GAPS = {};
for(const id of ['reacher','bastra','maapp','avara','john-reynolds'])ABILITIES[`${id}/ascended`]=ABILITIES[id];

// Phoenix is a reachable form rather than a separately selectable root card.
ABILITIES['tphoenix/phoenix']={attack(ctx,u,t,hit){hit.bypassShield=true;},hit(ctx,u,t,r){if(damageEvent(r))growDamage(u,1);}};

export function abilityReadiness(raw,id) {
  if(ABILITY_GAPS[id]?.length)return [...ABILITY_GAPS[id]];
  if(ABILITIES[id])return [];
  if(!raw.trait||raw.trait==='-')return [];
  return ['The native ability has not been implemented in Arena yet.'];
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
