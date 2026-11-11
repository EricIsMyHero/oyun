const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const rawCards=fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).sort().flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f))));
const rawSpells=JSON.parse(fs.readFileSync(path.join(root,'data/spells.json')));
const modules=Promise.all([import('../arena/js/catalog.mjs'),import('../arena/js/abilities.mjs'),import('../arena/js/vision.mjs')]);
let isEntityVisible;
modules.then(([, ,vision])=>{isEntityVisible=vision.isEntityVisible;});
const catalogPromise=modules.then(([{buildCatalog}])=>buildCatalog(rawCards,rawSpells));
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);

function fixture(catalog,id) {
  const def=catalog.byId.get(id),targetDef=catalog.byId.get('hammies');
  assert.ok(def,id);
  const unit=(d,name,side)=>({id:name,def:d,side,lane:1,x:5+(side?.3:0),y:11,radius:.2,hp:d.stats.health,maxHp:d.stats.health,shield:d.stats.shield,maxShield:d.stats.shield,stats:{...d.stats},alive:true,born:0,hits:1,shots:1,memory:{},statuses:[],groupId:name==='u'?'group':'enemy-group',targetId:null});
  const u=unit(def,'u',0),t=unit(targetDef,'t',1);
  t.hp=t.maxHp=1000;
  const records={statuses:[],damage:[],spawn:[],push:[],fx:[],projectiles:[],banish:[]};
  const ctx={time:0,units:[u,t],castles:[],teams:[{mana:10,energy:0},{mana:10,energy:0}],random:()=>.01,
    canTarget(source,target){return source.side!==target.side&&isEntityVisible({time:this.time,units:this.units,castles:this.castles,nodes:[]},source.side,target);},
    status(target,kind,duration,magnitude=0,source=null,extra={}){const st={target,kind,duration,magnitude,source,...extra};records.statuses.push(st);target.statuses.push(st);},
    near(point,radius,filter=null){return this.units.filter(v=>v.alive&&Math.hypot(v.x-point.x,v.y-point.y)<=radius&&(!filter||filter(v)));},
    damage(source,target,amount,options={}){records.damage.push({source,target,amount,options});target.hp=Math.max(0,target.hp-amount);const killed=target.hp<=0;target.alive=!killed;return {healthDamage:amount,shieldDamage:0,total:amount,killed};},
    heal(target,amount){const n=Math.min(amount,target.maxHp-target.hp);target.hp+=n;return n;},
    loseHealth(target,amount){const lost=Math.min(target.hp,amount);target.hp-=lost;target.alive=target.hp>0;return lost;},
    abilityProjectile(source,target,damage,options){records.projectiles.push({source,target,damage,options});return true;},
    banish(source,target,duration){records.banish.push({source,target,duration});return true;},
    giveShield(target,amount){target.shield+=amount;target.maxShield=Math.max(target.maxShield,target.shield);return amount;},
    spawn(d,side,p,lane,options={}){records.spawn.push({def:d,side,p,lane,options});const out=[];for(let i=0;i<(options.count||1);i++){const child=unit(d,'child-'+i,side);child.groupId=options.groupId||u.groupId;this.units.push(child);out.push(child);}return out;},
    push(target,from,distance){records.push.push({target,from,distance});},fx(type,x,y,opts){records.fx.push({type,x,y,opts});},
  };
  const hit={damage:10,kind:'attack',critical:false,bypassShield:false,burstIndex:0};
  const result={total:10,healthDamage:10,shieldDamage:0,killed:false};
  return {ctx,u,t,records,hit,result,rule:null};
}

test('arena catalog preserves every source definition and exposes honest data locks',async()=>{
  const [{buildCatalog,imageFor,formatStat},{ABILITIES}]=await modules;
  const before=JSON.stringify([rawCards,rawSpells]);
  const c=buildCatalog(rawCards,rawSpells);
  assert.equal(c.cards.length,176);assert.equal(c.forms.length,241);assert.equal(c.spells.length,26);
  assert.equal(c.cards.filter(x=>x.ready).length,138);assert.equal(c.spells.filter(x=>x.ready).length,17);
  assert.equal(JSON.stringify([rawCards,rawSpells]),before);
  for(const card of c.cards){assert.equal(card.raw,rawCards.find(x=>x.id===card.id));assert.equal(card.ready,card.reasons.length===0);if(card.ready){assert.ok(card.combat.attackDistance>0);if(card.combat.attackType!=='none'&&!ABILITIES[card.id]?.noBasicAttack)assert.ok(card.attack.interval>0);}}
  assert.equal(c.byId.get('fen').ready,true);assert.equal(c.byId.get('nightprowler').ready,true);assert.equal(c.byId.get('nortex').ready,true);
  assert.equal(c.byId.get('tphoenix').ready,true);assert.equal(c.byId.get('tornado').ready,true);
  assert.equal(c.byId.get('nightfang').ready,true);assert.deepEqual(c.byId.get('nightfang').reasons,[]);
  assert.match(c.spellById.get('crystalline-prison').reasons.join(' '),/conflict/);
  assert.equal(c.byId.get('soldier').attack.count,15);assert.equal(c.byId.get('soldier').attack.damage,3);
  assert.deepEqual(c.byId.get('kai').attack.sequence.map(x=>x.damage),[9,9,21]);
  assert.equal(c.byId.get('tribe').variants.reduce((n,x)=>n+x.count,0),5);
  assert.equal(c.byId.get('scrapy').combat.attackAngle,2*Math.atan(.5/(2*.5))*180/Math.PI);
  assert.equal(c.byId.get('jestro/cratex').stats.vision,0);
  assert.equal(formatStat('range','1250'),'1.25 tiles');
  assert.equal(formatStat('speed','1000'),'1 tile/s');
  assert.equal(formatStat('life','-'),'—');
  assert.match(imageFor({id:'soldier',group:'mission-1'}),/mission-1\/soldier\.jpg$/);
});

const cases={
  nightfang:({ctx,u,t,rule,result,records})=>{rule.spawn(ctx,u);assert.equal(records.statuses[0].kind,'invisible');assert.equal(records.statuses[0].duration,12);u.hits=59;rule.hit(ctx,u,t,result);assert.equal(records.statuses.length,1);u.hits=60;rule.hit(ctx,u,t,result);assert.equal(records.statuses[1].kind,'invisible');assert.equal(records.statuses[1].duration,3);},
  'john-reynolds':({ctx,u,rule,records})=>{const hp=u.hp;rule.damaged(ctx,u,null,{healthDamage:u.maxHp*.08,total:u.maxHp*.08});assert.equal(u.memory.johnWhinnies,1);assert.equal(records.statuses[0].kind,'taunt');assert.equal(records.statuses[0].duration,u.def.id.includes('/ascended')?5:3);assert.equal(records.statuses[1].kind,'protection');assert.equal(rule.criticalPiercesShield,true);close(u.hp,hp);},
  reacher:({ctx,u,t,rule})=>{rule.spawn(ctx,u);close(u.stats.range,2200);rule.prepareAttack(ctx,u,t);assert.equal(u.memory.combatMode,0);t.side=0;rule.tick(ctx,u);close(u.stats.damageminimiser,u.def.stats.damageminimiser+(u.def.id.includes('/ascended')?3:2));},
  bastra:({ctx,u,t,rule,hit})=>{t.side=0;rule.tick(ctx,u);close(u.stats.attackSpeed,2/(1+(u.def.id.includes('/ascended')?.03:.02)));rule.attack(ctx,u,t,hit);assert.equal(hit.bypassShield,true);},
  maapp:({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].kind,'statReduction');close(records.statuses[0].stats.damage,u.def.id.includes('/ascended')?.8:.75);assert.equal(records.statuses[0].percent,true);},
  avara:({ctx,u,t,rule,result,hit,records})=>{hit.sequenceIndex=0;rule.hit(ctx,u,t,result,hit);assert.equal(records.statuses[0].kind,'slow');hit.sequenceIndex=1;rule.attack(ctx,u,t,hit);assert.equal(hit.projectileKind,'raspberry');rule.hit(ctx,u,t,result,hit);assert.equal(records.push.length,1);hit.sequenceIndex=2;rule.hit(ctx,u,t,result,hit);assert.equal(records.statuses[1].kind,'stun');},

  sunrise:({ctx,u,rule})=>{const hp=u.hp;rule.move(ctx,u,{x:0,y:0},{x:1,y:0},.6);close(u.memory.sunriseGrowth,1);close(u.hp,hp+1);close(u.maxHp,hp+1);},
  wong:({ctx,u,t,rule,result,hit,records})=>{for(let i=0;i<4;i++)rule.hit(ctx,u,t,result,hit);close(u.memory.charge,100);rule.attack(ctx,u,t,hit);assert.equal(hit.wongCharged,true);rule.hit(ctx,u,t,result,hit);close(u.memory.charge,25);close(records.push[0].distance,3);u.hp=u.maxHp*.39;rule.damaged(ctx,u);assert.equal(u.wongBurstUsed,true);close(u.attackMode.remaining,8);close(u.attackMode.attack.damage,8);close(u.attackMode.attack.interval,.4);rule.tick(ctx,u);close(u.attackMode.remaining,8);},
  whisper:({ctx,u,t,rule})=>{let collected=null,possessed=null;ctx.collectWhisperCritical=source=>{collected=source;};ctx.possessionTarget=()=>t;ctx.possess=(source,target)=>{possessed={source,target};};rule.spawn(ctx,u);assert.equal(collected,u);assert.equal(rule.target(ctx,u),t);rule.contact(ctx,u,t);assert.equal(possessed.source,u);assert.equal(possessed.target,t);assert.equal(rule.noBasicAttack,true);assert.equal(rule.cannotCrit,true);},
  'corsair-crew':({ctx,u,rule})=>{assert.deepEqual(rule.spawnForms,[0]);ctx.statValue=(actor,key)=>actor.stats[key];let reflected=false;ctx.reflectProjectile=()=>{reflected=true;return true;};assert.equal(rule.intercept(ctx,u,{hit:{reflected:false}}),true);assert.equal(reflected,true);assert.equal(rule.intercept(ctx,u,{hit:{reflected:true}}),false);},
  'corsair-crew/pirate-girls':({ctx,u,t,rule})=>{t.x=u.x+2.75;t.y=u.y;const hit={damage:16};rule.attack(ctx,u,t,hit);close(hit.damage,28);close(u.memory.distanceBonus,.75);},
  roguex:({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].kind,'blind');assert.equal(records.statuses[0].duration,7);close(records.statuses[0].magnitude,.25);},
  tornado:({ctx,u,t,rule,result,hit})=>{let capture=null;ctx.captivesOf=()=>[];ctx.engulf=(host,target,params)=>{capture={host,target,params};};u.hp=u.maxHp/2;rule.tick(ctx,u);assert.equal(u.stats.damage,6);rule.attack(ctx,u,t,hit);assert.equal(hit.splashScale,.5);rule.hit(ctx,u,t,result,hit);assert.equal(capture.target,t);close(capture.params.radius,1.2);assert.equal(capture.params.vortex,true);assert.equal(rule.releaseCaptivesAfterBurst,3.5);u.hp=u.maxHp;rule.tick(ctx,u);assert.equal(u.stats.damage,4);},
  tphoenix:({ctx,u,t,rule,result,hit,records})=>{let egg=null;ctx.phoenixEgg=actor=>{egg=actor;};rule.damaged(ctx,u,t,result,hit);assert.equal(egg,u);close(records.damage[0].amount,1);assert.equal(records.damage[0].options.reflected,true);},
  'tphoenix/fire-egg':({ctx,u,rule})=>{let hatch=null,broken=null;ctx.hatchPhoenix=actor=>{hatch=actor;};ctx.breakPhoenixEgg=actor=>{broken=actor;};rule.tick(ctx,u);rule.damaged(ctx,u);assert.equal(hatch,u);assert.equal(broken,u);},
  albert:({ctx,u,t,rule,hit,result})=>{rule.targetChanged(ctx,u,t);for(let i=0;i<8;i++)rule.hit(ctx,u,t,result);assert.equal(u.memory.albertGrowth,3);assert.equal(u.stats.damage,10);rule.targetChanged(ctx,u,null);assert.equal(u.stats.damage,7);rule.attack(ctx,u,t,hit);assert.equal(hit.damage,7);rule.hit(ctx,u,t,{total:0});assert.equal(u.memory.albertGrowth,0);},
  chicken:({ctx,u,t,rule,records})=>{ctx.statValue=(actor,key)=>actor.stats[key];ctx._canHit=(source,target)=>source.side!==target.side;ctx._inside=()=>true;ctx.killUnit=actor=>{actor.alive=false;};assert.equal(rule.noBasicAttack,true);assert.equal(rule.contactAttack,true);rule.contact(ctx,u,t);assert.equal(u.alive,false);rule.death(ctx,u);assert.equal(records.damage[0].amount,500);assert.equal(records.fx.find(f=>f.type==='blastArea').opts.width,3.5);},
  angels:({ctx,u,t,rule})=>{assert.deepEqual(rule.spawnSchedule,{initialGap:.4,gapStep:.05});const damage=u.stats.damage;t.def=u.def;t.side=u.side;rule.unitDeath(ctx,u,t);close(u.stats.damage,damage+2);assert.equal(u.memory.angelDeaths,1);t.side=1;rule.unitDeath(ctx,u,t);close(u.stats.damage,damage+2);},
  boomix:({ctx,u,t,rule,hit})=>{rule.attack(ctx,u,t,hit);assert.equal(hit.returning,true);assert.equal(hit.recoveryFromLaunch,true);hit={damage:100};rule.incoming(ctx,u,t,hit);close(hit.damage,100);u.memory.returningShotId='returning';rule.incoming(ctx,u,t,hit);close(hit.damage,80);},
  nortex:({ctx,u,t,rule})=>{for(const [burstIndex,damage] of [[0,5],[1,7],[2,9],[0,5]]){const hit={damage:5,burstIndex};rule.attack(ctx,u,t,hit);close(hit.damage,damage);}},
  fen:({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].kind,'blind');assert.equal(records.statuses[0].duration,7);close(records.statuses[0].magnitude,.125);},
  nightprowler:({ctx,u,t,rule,result,records})=>{rule.spawn(ctx,u);ctx.time=2;rule.tick(ctx,u);assert.equal(records.statuses[0].kind,'invisible');u.statuses=[{kind:'invisible',until:Infinity}];const hit={};rule.attack(ctx,u,t,hit);assert.equal(hit.nightAmbush,true);rule.hit(ctx,u,t,result,hit);assert.equal(records.statuses[1].kind,'misfortune');assert.equal(records.statuses[1].duration,8);close(records.statuses[1].magnitude,.1);assert.equal(rule.breakStealthOnDamage,true);},
  magma:({ctx,u,rule})=>{let patch=null;ctx.leaveTrail=(source,from,to,params)=>{patch={source,from,to,params};};rule.move(ctx,u,{x:5,y:11},{x:5.1,y:11});assert.equal(patch.source,u);assert.deepEqual(patch.params,{width:1.5,duration:10,damage:3,interval:1});},
  'fallen-angel':({ctx,u,t,rule,result})=>{assert.equal(rule.target(ctx,u),t);rule.targetChanged(ctx,u,t);for(let i=0;i<100;i++)rule.hit(ctx,u,t,result);assert.equal(u.memory.fallenStacks,80);close(u.stats.attackSpeed,u.def.stats.attackSpeed/1.8);rule.targetChanged(ctx,u,null);assert.equal(u.memory.fallenStacks,0);close(u.stats.attackSpeed,u.def.stats.attackSpeed);},
  etheris:({ctx,u,rule})=>{let linked=null;ctx.linkEtheris=actor=>{linked=actor;};rule.tick(ctx,u,0);assert.equal(linked,u);},
  format:({ctx,u,rule})=>{let channel=null;ctx.channelFormat=(actor,dt)=>{channel={actor,dt};};rule.tick(ctx,u,3);assert.equal(channel.actor,u);assert.equal(channel.dt,3);},
  artist:({ctx,u,t,rule,result,records})=>{let ink=null;ctx.addInk=(source,target)=>{ink={source,target};};rule.hit(ctx,u,t,result);assert.equal(ink.source,u);assert.equal(ink.target,t);u.memory.artistCharge=40;rule.death(ctx,u);assert.equal(records.spawn[0].options.count,10);for(const raven of ctx.units.filter(t=>t.def.id==='artist/flock-of-ravens')){assert.equal(raven.expiresAt,9);assert.equal(raven.stats.life,9);}},
  'artist/flock-of-ravens':({u})=>{assert.equal(u.def.combat.healthless,true);assert.equal(u.def.combat.untargetable,true);assert.equal(u.def.combat.movementType,'flying');assert.equal(u.stats.life,7);assert.equal(u.stats.vision,4000);},
  far:({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.banish[0].duration,10);assert.equal(records.banish[0].target,t);ctx.random=()=>.08;rule.hit(ctx,u,t,result);assert.equal(records.banish.length,1);},
  lyra:({ctx,u,t,rule})=>{u.hp=u.maxHp*.5;rule.tick(ctx,u);close(u.stats.damage,7);close(u.stats.attackSpeed,.2/1.4);const hit={damage:5};rule.attack(ctx,u,t,hit);close(hit.damage,7);close(hit.haste,.4);u.hp=u.maxHp;rule.tick(ctx,u);close(u.stats.damage,5);},
  naar:({ctx,u,rule,records})=>{u.hp=u.maxHp*.3;rule.tick(ctx,u,10);assert.equal(records.projectiles.length,20);assert.ok(records.projectiles.every(p=>p.damage===4&&p.options.impactSize==='1.25 × 1.25 tiles'&&p.options.deathBlast.size===2.5));for(let i=0;i<4;i++){u.hp=u.maxHp;rule.tick(ctx,u,0);u.hp=u.maxHp*.3;rule.tick(ctx,u,0);}assert.equal(u.memory.naarCasts,3);},
  pyhsic:({ctx,u,t,rule,records})=>{rule.tick(ctx,u,22);assert.equal(records.damage[0].amount,50);assert.equal(records.damage[1].options.instantKill,true);assert.equal(t.alive,false);},
  unara:({ctx,u,t,rule,result,records})=>{for(let i=0;i<12;i++)rule.hit(ctx,u,t,result);assert.equal(u.memory.charge,0);assert.equal(u.memory.orbRemaining,30);assert.equal(records.push[0].distance,2);rule.tick(ctx,u,3);assert.equal(records.projectiles.length,30);assert.ok(records.projectiles.every(p=>p.damage===2));assert.equal(u.memory.orbRemaining,0);},
  clara:({ctx,u,rule,records})=>{rule.tick(ctx,u,5);assert.equal(records.statuses[0].kind,'taunt');assert.equal(records.statuses[0].duration,7);assert.equal(records.statuses[1].kind,'regen');assert.equal(records.statuses[1].amount,3);assert.equal(records.statuses[1].interval,.25);assert.equal(records.statuses[1].duration,7);close(u.memory.charge,0);},
  sylviana:({ctx,u,t,rule,records})=>{t.def={...t.def,type:['Alien']};const hit={damage:50};rule.incoming(ctx,u,t,hit);close(hit.damage,40);rule.death(ctx,u);assert.equal(records.spawn[0].def.id,'sylviana/butterflies');assert.equal(records.spawn[0].options.count,4);},
  'sylviana/butterflies':({ctx,u,t,rule})=>{u.alive=false;t.side=u.side;rule.death(ctx,u);assert.equal(t.hp,1010);assert.equal(t.maxHp,1010);},
  malvaris:({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].kind,'soulMark');assert.equal(records.statuses[0].duration,2);assert.equal(records.statuses[0].summonFormId,'malvaris/phantomis');rule.unitDeath(ctx,u,t);assert.equal(u.stats.criticalChance,5);t.side=u.side;for(let i=0;i<160;i++)rule.unitDeath(ctx,u,t);assert.equal(u.memory.criticalGrowth,75);assert.equal(u.stats.criticalChance,80);},
  'malvaris/phantomis':({ctx,u,rule})=>{const make=id=>({...u,id,stats:{...u.stats},memory:{},groupId:id});ctx.units.push(make('other-a'),make('other-b'));rule.tick(ctx,u);close(u.stats.damage,12);close(u.stats.attackSpeed,1.5/1.1);ctx.units.pop();rule.tick(ctx,u);close(u.stats.damage,11);},
  avalith:({ctx,u,t,rule})=>{ctx.random=()=>.329;let hit={damage:10,instantKill:true};rule.incoming(ctx,u,t,hit);assert.equal(hit.damage,0);assert.equal(hit.instantKill,false);ctx.random=()=>.33;hit={damage:10};rule.incoming(ctx,u,t,hit);assert.equal(hit.damage,10);for(const [distance,factor] of [[.5,.4],[1,.4],[2.375,.7],[3.75,1]]){t.x=u.x+distance;t.y=u.y;hit={};rule.attack(ctx,u,t,hit);close(hit.intervalScale,factor);assert.equal(hit.returning,true);}},
  bloodraider:({ctx,u,t,rule,result})=>{u.stats.damage=20;for(const expected of [22,24,27]){rule.hit(ctx,u,t,result);assert.equal(u.stats.damage,expected);}close(u.hp,u.maxHp*.88);},
  shine:({ctx,u,t,rule})=>{t.side=u.side;t.maxHp=t.hp=t.def.stats.health;const initial=u.maxHp;for(let i=0;i<8;i++)rule.tick(ctx,u,5);close(u.maxHp,initial*1.2);close(t.maxHp,t.def.stats.health*1.2);assert.equal(u.memory.shineStacks,5);},
  stacy:({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].kind,'burn');assert.equal(records.statuses[0].amount,8);assert.equal(records.statuses[0].duration,4);assert.equal(records.statuses[0].stack,true);u.hp=u.maxHp*.1;rule.tick(ctx,u);close(u.stats.range,2600);u.hp-=.01;rule.tick(ctx,u);close(u.stats.range,2860);u.hp=u.maxHp;rule.tick(ctx,u);close(u.stats.range,2600);},
  death:({ctx,u,rule})=>{for(let i=0;i<50;i++)rule.unitDeath(ctx,u);assert.equal(u.memory.damageGrowth,80);assert.equal(u.stats.damage,105);},
  demotron:({ctx,u,rule})=>{u.hp=u.maxHp-100;rule.tick(ctx,u,10);close(u.hp,u.maxHp-90);rule.tick(ctx,u,10);close(u.hp,u.maxHp-81);},
  aeralis:({ctx,u,t,rule,result,records})=>{ctx.random=()=>.119;rule.hit(ctx,u,t,result);close(records.push[0].distance,.4);ctx.random=()=>.12;rule.hit(ctx,u,t,result);close(records.push[1].distance,.1);rule.hit(ctx,u,t,{total:0});assert.equal(records.push.length,2);},
  'dark-necromancer':({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].kind,'silence');assert.equal(records.statuses[0].duration,10);rule.tick(ctx,u,14);assert.equal(records.spawn[0].def.id,'dark-necromancer/bladeknight');ctx.random=()=>.4;rule.tick(ctx,u,14);assert.equal(records.spawn[1].def.id,'dark-necromancer/stormbow');ctx.random=()=>.75;rule.tick(ctx,u,14);assert.equal(records.spawn[2].def.id,'dark-necromancer/ironhide');},
  'dark-necromancer/bladeknight':({ctx,u,t,rule,hit})=>{rule.attack(ctx,u,t,hit);assert.equal(hit.bypassShield,true);},
  'dark-necromancer/stormbow':({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].kind,'burn');assert.equal(records.statuses[0].amount,4);assert.equal(records.statuses[0].duration,2);},
  'dark-necromancer/ironhide':({ctx,u,t,rule})=>{for(let i=1;i<=8;i++){const hit={damage:10};rule.incoming(ctx,u,t,hit);assert.equal(hit.damage,i%4?10:0);}},
  ali:({ctx,u,t,rule,records})=>{rule.tick(ctx,u,25);assert.equal(records.statuses.length,0,'Ali cannot charge alone');t.side=u.side;rule.tick(ctx,u,25);assert.equal(records.statuses.length,2);assert.ok(records.statuses.every(s=>s.kind==='untouchable'&&s.duration===3));close(u.memory.charge,0);},
  worms:({ctx,u,t,rule,result,records})=>{rule.spawn(ctx,u);assert.equal(records.statuses[0].kind,'invisible');rule.hit(ctx,u,t,result);assert.equal(u.statuses.some(s=>s.kind==='invisible'),false);assert.equal(records.statuses[1].kind,'stun');assert.equal(records.statuses[1].duration,.8);rule.hit(ctx,u,t,result);assert.equal(records.statuses.length,2);},
  hammies:({ctx,u,rule,records})=>{rule.spawn(ctx,u);assert.equal(records.statuses[0].duration,12);close(records.statuses[0].magnitude,.2);},
  'b-b':({ctx,u,t,rule,hit})=>{t.def={...t.def,type:['Animal']};rule.incoming(ctx,u,t,hit);close(hit.damage,4);},
  scrapy:({ctx,u,t,rule,hit})=>{rule.attack(ctx,u,t,hit);close(hit.damage,15);assert.ok(hit.bypassShield);},
  nitrox:({ctx,u,t,rule,records})=>{t.side=0;rule.tick(ctx,u);assert.equal(records.statuses[0].kind,'attackHaste');close(records.statuses[0].magnitude,.12);},
  gloop:({ctx,u,rule,records})=>{assert.equal(u.stats.life,100);assert.deepEqual(rule.lifeDecay,{fraction:.01,interval:1});assert.equal(rule.contactAttack,true);rule.death(ctx,u);assert.equal(records.damage[0].amount,150);},
  henry:({ctx,u,t,rule,hit})=>{t.def={...t.def,type:['Animal']};rule.attack(ctx,u,t,hit);close(hit.damage,14);},
  venomora:({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].duration,2);close(records.statuses[0].magnitude,.25);},
  blocker:({ctx,u,t,rule,hit,records})=>{rule.incoming(ctx,u,t,hit);close(hit.damage,7);t.side=0;rule.tick(ctx,u);assert.equal(records.statuses[0].kind,'spellProtection');},
  ben:({ctx,u,t,rule,result,records})=>{for(let i=0;i<4;i++)rule.hit(ctx,u,t,result);assert.equal(records.statuses.length,1);assert.equal(records.statuses[0].duration,2);assert.equal(records.statuses[0].amount,10);},
  freak:({ctx,u,rule,records})=>{u.hp-=10;rule.tick(ctx,u,1);assert.equal(u.hp,u.maxHp-9);rule.death(ctx,u);assert.equal(records.spawn[0].options.count,2);},
  'freak/mini-freaks':({ctx,u,rule,records,hit,t})=>{rule.attack(ctx,u,t,hit);assert.equal(hit.combat.maxTargets,1);rule.death(ctx,u);assert.equal(records.damage[0].amount,50);},
  twins:({ctx,u,rule})=>{const twin={...u,id:'other',stats:{...u.stats},memory:{}};ctx.units.push(twin);rule.death(ctx,u);assert.equal(twin.maxHp,u.maxHp*3);assert.equal(twin.stats.damage,u.stats.damage*2);},
  bethe:({ctx,u,t,rule,result})=>{rule.hit(ctx,u,t,{...result,killed:true});rule.tick(ctx,u);assert.equal(u.stats.criticalChance,u.def.stats.criticalChance+5);ctx.time=11;rule.tick(ctx,u);assert.equal(u.stats.criticalChance,u.def.stats.criticalChance);},
  soldier:({ctx,u,t,rule,hit})=>{t.def={...t.def,combat:{movementType:'flying'}};rule.attack(ctx,u,t,hit);close(hit.damage,13.3);},
  snaykies:({ctx,u,t,rule,hit,result,records})=>{rule.attack(ctx,u,t,hit);assert.equal(hit.bypassShield,true);rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].duration,1.5);assert.equal(records.statuses[0].amount,4);},
  bees:({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].duration,6);assert.equal(records.statuses[0].amount,2);assert.equal(u.alive,false);rule.hit(ctx,u,t,result);assert.equal(records.statuses.length,1);},
  toxic:({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].duration,1.5);assert.equal(records.statuses[0].amount,3);},
  phewphew:({ctx,u,t,rule,hit})=>{rule.attack(ctx,u,t,hit);assert.equal(hit.shieldMultiplier,2);},
  hailey:({ctx,u,t,rule,result})=>{rule.hit(ctx,u,t,result);close(u.stats.criticalChance,u.def.stats.criticalChance+.5);},
  'chrono-mage':({ctx,u,t,rule,hit,records})=>{u.shots=5;const ally={...u,id:'ally',memory:{},statuses:[]};ctx.units.push(ally);rule.attack(ctx,u,t,hit);assert.ok(records.statuses.some(x=>x.kind==='attackHaste'&&x.duration===5));assert.ok(records.statuses.some(x=>x.kind==='slow'&&x.duration===8));},
  'aegis-guard':({ctx,u,t,rule,records})=>{t.side=0;rule.tick(ctx,u);assert.equal(records.statuses[0].kind,'protection');close(records.statuses[0].magnitude,.15);},
  ironjaw:({ctx,u,t,rule,result})=>{rule.hit(ctx,u,t,result);close(u.stats.lifestealChance,u.def.stats.lifestealChance+.5);for(let i=0;i<100;i++)rule.hit(ctx,u,t,result);assert.equal(u.stats.lifestealChance,50);assert.equal(u.memory.ironjawSiphon,25);},
  'm-manager':({ctx,u,rule})=>{rule.tick(ctx,u,9);assert.equal(ctx.teams[0].mana,11);assert.equal(ctx.teams[0].energy,0);},
  srail:({ctx,u,rule})=>{rule.tick(ctx,u);assert.equal(u.stats.criticalChance,u.def.stats.criticalChance+8);},
  cryon:({ctx,u,rule,records})=>{u.hp=u.maxHp*.19;rule.damaged(ctx,u);rule.damaged(ctx,u);assert.equal(records.statuses.length,1);assert.equal(records.statuses[0].duration,12);},
  frostshot:({ctx,u,t,rule,hit,result,records})=>{rule.spawn(ctx,u);ctx.time=18;rule.attack(ctx,u,t,hit);close(hit.damage,37.5);rule.hit(ctx,u,t,result);assert.equal(u.memory.lastDamage,18);close(records.statuses[0].magnitude,.4);},
  hornets:({ctx,u,t,rule,hit})=>{t.def={...t.def,type:['Animal'],combat:{movementType:'flying'}};rule.incoming(ctx,u,t,hit);close(hit.damage,3.75);},
  warborn:({ctx,u,rule})=>{u.maxShield=100;u.shield=0;rule.tick(ctx,u,6);close(u.shield,20);},
  'x-bot':({ctx,u,t,rule,hit,result})=>{rule.spawn(ctx,u);ctx.time=4;rule.attack(ctx,u,t,hit);close(hit.damage,11);rule.hit(ctx,u,t,result);assert.equal(u.memory.lastDamage,4);},
  nyra:({ctx,u,t,rule,hit})=>{rule.spawn(ctx,u);u.x+=25;rule.tick(ctx,u);rule.attack(ctx,u,t,hit);close(hit.damage,20);},
  deadscope:({ctx,u,t,rule,hit,result})=>{rule.hit(ctx,u,t,{...result,killed:true});rule.attack(ctx,u,t,hit);close(hit.haste,.2);assert.equal(u.memory.nextHaste,false);},
  turtle:({ctx,u,rule,records})=>{rule.spawn(ctx,u);assert.equal(records.spawn[0].options.count,4);u.shield=0;rule.damaged(ctx,u,null,{shieldDamage:10});rule.tick(ctx,u,1);close(u.shield,25);rule.death(ctx,u);const child=ctx.units.find(x=>x.def.id==='turtle/mini-turtles');assert.equal(child.stats.damage,child.def.stats.damage*2);},
  'turtle/mini-turtles':({ctx,u,rule,catalog})=>{const parent={...u,id:'parent',def:catalog.byId.get('turtle')};ctx.units.push(parent);rule.tick(ctx,u);assert.equal(u.memory.followId,'parent');},
  'feral-wolf':({ctx,u,t,rule,hit,result,records})=>{rule.spawn(ctx,u);close(records.statuses[0].magnitude,1);rule.attack(ctx,u,t,hit);close(hit.damage,13);rule.hit(ctx,u,t,result);assert.equal(u.memory.firstHit,true);},
  trac:({ctx,u,rule})=>{rule.damaged(ctx,u,null,{total:48});close(u.stats.damageminimiser,u.def.stats.damageminimiser+1);close(u.stats.attackSpeed,u.def.stats.attackSpeed/1.01);},
  dino:({ctx,u,t,rule,result})=>{for(let i=0;i<20;i++)rule.hit(ctx,u,t,result);assert.equal(u.stats.damage,u.def.stats.damage+24);},
  tenta:({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].duration,1);close(records.statuses[0].magnitude,.25);},
  'fire-archer':({ctx,u,t,rule,hit,records})=>{u.shots=4;rule.attack(ctx,u,t,hit);assert.equal(records.statuses[0].duration,3);close(records.statuses[0].magnitude,.7);},
  'shadow-reaper':({ctx,u,t,rule,hit,result})=>{rule.attack(ctx,u,t,hit);assert.equal(hit.critical,true);rule.hit(ctx,u,t,{...result,killed:true});const next={damage:10};rule.attack(ctx,u,t,next);close(next.damage,160);},
  voltriker:({ctx,u,t,rule,hit})=>{u.shots=4;rule.attack(ctx,u,t,hit);assert.equal(hit.combat.maxTargets,3);assert.equal(hit.combat.impactSize,'3 × 3 tiles');u.shots=5;rule.attack(ctx,u,t,hit);assert.equal(hit.combat.maxTargets,1);},
  frostmaw:({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].kind,'silence');assert.equal(records.statuses[0].duration,5);},
  hexon:({ctx,u,t,rule,result,records})=>{u.hits=4;rule.hit(ctx,u,t,result);close(records.statuses[0].duration,.6);},
  'mecha-shield':({ctx,u,t,rule})=>{t.side=0;t.shield=0;rule.tick(ctx,u,21);assert.equal(t.shield,25);},
  venomspikes:({ctx,u,t,rule,result,records})=>{for(let i=0;i<5;i++)rule.hit(ctx,u,t,result);assert.equal(records.damage[0].amount,80);assert.equal(t.memory.venomMarks.u,0);},
  astranova:({ctx,u,t,rule,hit})=>{u.shots=10;rule.attack(ctx,u,t,hit);assert.equal(hit.damage,50);assert.equal(hit.combat.impactSize,'5 × 5 tiles');},
  kai:({ctx,u,t,rule,hit,result,records})=>{rule.damaged(ctx,u,t,{total:50});u.shots=3;rule.attack(ctx,u,t,hit);close(hit.damage,16);rule.hit(ctx,u,t,result,hit);assert.equal(records.push[0].distance,3);close(records.statuses[0].duration,.8);},
  cassandra:({ctx,u,t,rule,records})=>{const hp=u.maxHp;rule.tick(ctx,u,1);assert.equal(u.maxHp,hp+1);assert.equal(records.damage[0].amount,1);assert.equal(records.statuses[0].kind,'predominance');},
  arcanyx:({ctx,u,t,rule,hit,result,records})=>{rule.attack(ctx,u,t,hit);close(hit.damage,16);rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].kind,'regen');assert.equal(records.statuses[0].amount,4);assert.equal(records.statuses[0].duration,5);},
  leafshade:({ctx,u,t,rule,hit})=>{rule.attack(ctx,u,t,hit);assert.ok(hit.bypassShield);rule.tick(ctx,u,7);assert.equal(u.stats.lifestealChance,u.def.stats.lifestealChance+1);},
  jestro:({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].duration,5);u.hp=u.maxHp*.74;rule.damaged(ctx,u);rule.damaged(ctx,u);assert.equal(records.spawn.length,1);assert.equal(records.spawn[0].def.id,'jestro/cratex');},
  'jestro/cratex':({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);close(records.statuses[0].duration,1.3);},
  'ship-cannoneer':({ctx,u,rule})=>{u.maxShield=100;u.shield=0;rule.tick(ctx,u);close(u.stats.attackSpeed,u.def.stats.attackSpeed/1.1);},
  lumina:({ctx,u,rule,records})=>{rule.tick(ctx,u,.25);assert.equal(records.damage[0].amount,10);},
  'hell-boy':({ctx,u,t,rule,hit})=>{u.shots=5;rule.attack(ctx,u,t,hit);close(hit.damage,60);assert.equal(u.memory.rageUntil,3);},
  slasherx:({ctx,u,t,rule,hit})=>{rule.attack(ctx,u,t,hit);assert.equal(hit.instantKill,true);},
  sheriff:({ctx,u,t,rule,hit})=>{rule.tick(ctx,u);rule.attack(ctx,u,t,hit);close(hit.damage,12.5);},
  nurse:({ctx,u,rule})=>{rule.lifesteal(ctx,u,2);rule.tick(ctx,u);assert.equal(u.stats.damage,u.def.stats.damage+2);ctx.time=11;rule.tick(ctx,u);assert.equal(u.stats.damage,u.def.stats.damage);},
  tribe:({ctx,u,t,rule,hit,result,records})=>{rule.spawn(ctx,u);assert.equal(u.stats.damage,4);rule.tick(ctx,u,12.5);rule.attack(ctx,u,t,hit);assert.equal(hit.damage,20);t.hp=600;rule.hit(ctx,u,t,result,hit);assert.equal(records.statuses[0].duration,5);},
  earthshakers:({ctx,u,t,rule,hit,result,records})=>{u.shots=4;rule.attack(ctx,u,t,hit);assert.equal(hit.combat.impactSize,'3 × 3 tiles');rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].duration,1.5);assert.equal(records.statuses[1].kind,'movementSlow');assert.equal(records.statuses[1].duration,3.5);close(records.statuses[1].magnitude,.3);},
  'void-striker':({ctx,u,t,rule,hit,result,records})=>{rule.spawn(ctx,u);ctx.time=18;rule.attack(ctx,u,t,hit);close(hit.haste,.2);rule.hit(ctx,u,t,result,hit);close(records.statuses[0].duration,.8);},
  shellbyte:({ctx,u,t,rule,hit})=>{t.x=u.x+4;rule.tick(ctx,u,.225*34);assert.ok(u.memory.leapStrike);rule.attack(ctx,u,t,hit);close(hit.damage,15);},
  'tphoenix/phoenix':({ctx,u,t,rule,hit,result})=>{rule.attack(ctx,u,t,hit);assert.ok(hit.bypassShield);rule.hit(ctx,u,t,result);assert.equal(u.stats.damage,u.def.stats.damage+1);},
};

for(const id of ['reacher','bastra','maapp','avara','john-reynolds'])cases[`${id}/ascended`]=cases[id];

for(const [id,exercise] of Object.entries(cases))test(`native arena ability: ${id}`,async()=>{
  const [,{ABILITIES}]=await modules;
  const catalog=await catalogPromise;
  const f=fixture(catalog,id);f.rule=ABILITIES[id];f.catalog=catalog;
  assert.ok(f.rule,`${id} has a registry rule`);exercise(f);
});

test('Sheriff marks only visible enemies and Shellbyte cannot leap to concealed targets',async()=>{
  const [,{ABILITIES}]=await modules;
  const catalog=await catalogPromise;
  const sheriff=fixture(catalog,'sheriff');
  sheriff.t.x=sheriff.u.x+9;
  ABILITIES.sheriff.tick(sheriff.ctx,sheriff.u);
  assert.deepEqual(sheriff.u.memory.marked,[]);
  const scout={...sheriff.u,id:'scout',x:sheriff.t.x-1,statuses:[]};
  sheriff.ctx.units.push(scout);
  ABILITIES.sheriff.tick(sheriff.ctx,sheriff.u);
  assert.deepEqual(sheriff.u.memory.marked,[sheriff.t.id]);
  sheriff.t.statuses=[{kind:'invisible',until:5}];
  ABILITIES.sheriff.tick(sheriff.ctx,sheriff.u);
  assert.deepEqual(sheriff.u.memory.marked,[]);

  const shellbyte=fixture(catalog,'shellbyte');
  shellbyte.t.x=shellbyte.u.x+4;
  shellbyte.t.statuses=[{kind:'invisible',until:5}];
  shellbyte.u.memory.charge=100;
  const origin={x:shellbyte.u.x,y:shellbyte.u.y};
  ABILITIES.shellbyte.tick(shellbyte.ctx,shellbyte.u,0);
  assert.equal(shellbyte.u.memory.charge,100);
  assert.equal(shellbyte.u.x,origin.x);
  assert.equal(shellbyte.u.targetId,null);
  shellbyte.t.statuses=[];
  ABILITIES.shellbyte.tick(shellbyte.ctx,shellbyte.u,0);
  assert.equal(shellbyte.u.targetId,shellbyte.t.id);
  assert.equal(shellbyte.u.memory.charge,0);
});

test('every enabled native card and reachable form has a behavioral test',async()=>{
  const [,{ABILITIES}]=await modules;
  const catalog=await catalogPromise;
  function verify(card){
    if(card.choiceRequired){card.typeVariants.filter(form=>form.ready).forEach(verify);return;}
    assert.ok(ABILITIES[card.id],card.id);
    // Apex behavior is exercised with the real engine in arena-apex.test.cjs.
    assert.ok(cases[card.id]||['Apex','Emergent','Ethereal'].includes(card.rarity)||['stormblade','umbra'].includes(card.id),`${card.id} missing behavioral assertion`);
    card.forms.forEach(verify);if(card.ascended)verify(card.ascended);
  }
  catalog.cards.filter(x=>x.ready).forEach(verify);
});
