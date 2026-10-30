const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const modules=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/map.mjs')]);
const root=path.resolve(__dirname,'..');
const rawCards=fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f))));
const rawSpells=JSON.parse(fs.readFileSync(path.join(root,'data/spells.json')));
async function fixture({bot=false,deck,spellDeck=['healing-light'],seed=123}={}){
  const [{ArenaEngine},{buildCatalog}]=await modules;
  const catalog=buildCatalog(rawCards,rawSpells);
  const base={id:'fixture',name:'Fixture',raw:{stats:{},additionalStats:{vision:'8000'}},ready:true,reasons:[],rarity:'Mundane',forms:[],type:['Human'],
    stats:{health:1000,shield:0,damage:10,attackSpeed:1,delay:0,sps:10,mana:2,number:1,range:2000,speed:1000,vision:8000,criticalChance:0,criticDamage:2,lifestealChance:0,lifesteal:0,dodge:0,healBonus:0,healrecovery:0,shieldrecovery:0,criticdamageminimiser:0,damageminimiser:0,flexibility:0,shieldtakendamage:70,life:0},
    attack:{count:1,damage:10,interval:1,delay:0},combat:{attackType:'melee',attackShape:'single',attackWidth:500,attackDistance:1000,targets:'both',multiTarget:false,maxTargets:1,movementType:'ground',groundEffectImmune:false,weight:'medium'}};
  const cards=Array.from({length:8},(_,i)=>({...structuredClone(base),id:`fixture-${i}`}));
  const engine=new ArenaEngine({cards,spells:catalog.spells,deck:deck||cards.map(c=>c.id),spellDeck,seed,bot});
  return {engine,cards,catalog,base};
}
function inert(engine,def,side,p,extra={}){
  const copy=structuredClone(def);copy.stats={...copy.stats,speed:0,damage:0,range:0,vision:0,...extra};copy.raw.additionalStats.vision='0';copy.combat.attackType='none';
  return engine.spawn(copy,side,p,1,{count:1})[0];
}

test('arena rejects invalid decks, unavailable units and spell overload before starting',async()=>{
  const [{ArenaEngine}]=await modules;const {cards,catalog}=await fixture();
  for(const deck of [cards.slice(0,7).map(c=>c.id),Array(8).fill(cards[0].id),cards.map((c,i)=>i===7?'missing':c.id)])assert.throws(()=>new ArenaEngine({cards,spells:catalog.spells,deck,spellDeck:['healing-light']}));
  assert.throws(()=>new ArenaEngine({cards,spells:catalog.spells,deck:cards.map(c=>c.id),spellDeck:[]}));
  assert.throws(()=>new ArenaEngine({cards,spells:catalog.spells,deck:cards.map(c=>c.id),spellDeck:['illustration-spell','nightfall-curse']}));
});

test('paid deployment is atomic, cycles four cards and converts spent mana into rounded energy',async()=>{
  const {engine:e,cards}=await fixture();cards[0].stats.mana=17;
  const before=structuredClone(e.teams[0]);
  assert.equal(e.deploy(0,0,{x:10,y:11}).ok,false);assert.deepEqual(e.teams[0],before);
  e.teams[0].mana=20;
  assert.equal(e.deploy(0,0,{x:20,y:11}).ok,false);assert.equal(e.teams[0].mana,20);
  const result=e.deploy(0,0,{x:10,y:11});assert.equal(result.ok,true);assert.equal(e.teams[0].mana,3);assert.equal(e.teams[0].energy,.95);
  assert.deepEqual(e.teams[0].hand,['fixture-4','fixture-1','fixture-2','fixture-3']);
  assert.deepEqual(e.teams[0].queue,['fixture-5','fixture-6','fixture-7','fixture-0']);
  e.spawn(cards[0],0,{x:12,y:11},1,{count:1});assert.equal(e.teams[0].energy,.95,'free summons cannot farm energy');
});

test('full Count formation remains inside the castle deployment boundary without paid partial spawns',async()=>{
  const {engine:e,cards}=await fixture();cards[0].stats.number=10;
  const {RULES}=await import('../arena/js/rules.mjs');
  const [, , {isDeployable,distance,MAP}]=await modules;
  const point=e._deploymentCandidates(0,0).find(p=>distance(p,MAP.bases[0])>RULES.castleRange-.4);
  assert.ok(point,'a valid road point lies near the deployment-radius edge');
  const result=e.deploy(0,0,point);assert.equal(result.ok,true);assert.equal(result.units.length,10);
  for(const u of result.units){assert.ok(isDeployable(u,0),`${u.x},${u.y}`);assert.ok(distance(u,MAP.bases[0])<=RULES.castleRange+1e-9);}
  for(let i=0;i<result.units.length;i++)for(let j=i+1;j<result.units.length;j++)assert.ok(Math.hypot(result.units[i].x-result.units[j].x,result.units[i].y-result.units[j].y)>=result.units[i].radius+result.units[j].radius);
});

test('mana regenerates each 1.3 seconds, caps at twenty and pauses without a catch-up jump',async()=>{
  const {engine:e}=await fixture();e.teams[0].mana=0;e.step(1.3);assert.ok(Math.abs(e.teams[0].mana-1)<1e-8);
  e.setPaused(true);const before=JSON.stringify(e.state);e.step(30);assert.equal(JSON.stringify(e.state),before);
  e.setPaused(false);e.step(1.3);assert.ok(Math.abs(e.teams[0].mana-2)<1e-8);e.step(60);assert.equal(e.teams[0].mana,20);
});

test('objective capture requires five uncontested seconds, contests freeze and income stacks at six percent',async()=>{
  const {engine:e,base}=await fixture();
  const a=inert(e,base,0,{x:16,y:11});e.step(2);const node=e.state.nodes[1];assert.equal(node.owner,null);assert.ok(node.progress>1.9);
  const b=inert(e,base,1,{x:16,y:11});const progress=node.progress;e.step(1);assert.equal(node.progress,progress);
  b.x=25;b.y=11;e.step(3.1);assert.equal(node.owner,0);assert.equal(node.progress,0);
  a.x=5;a.y=11;e.step(1);assert.equal(node.owner,0,'ownership persists when vacant');
  e.state.nodes.forEach(n=>n.owner=0);e.teams[0].mana=0;e.teams[1].mana=0;e.step(1.3);
  assert.ok(Math.abs(e.teams[0].mana-1.06)<1e-8);assert.ok(Math.abs(e.teams[1].mana-1)<1e-8);
});

test('shield splits incoming damage and passes unmet shield absorption through to Health',async()=>{
  const {engine:e,base}=await fixture();const target=inert(e,base,1,{x:12,y:11},{health:100,shield:70});
  const r=e.damage(null,target,100,{kind:'spell'});assert.equal(r.shieldDamage,70);assert.equal(r.healthDamage,30);assert.equal(target.hp,70);assert.equal(target.shield,0);
  target.hp=100;target.shield=20;const overflow=e.damage(null,target,100,{kind:'spell'});assert.equal(overflow.healthDamage,80);assert.equal(target.hp,20);
});

test('shield bonus damages only shield and bypass ignores it; critical resistance affects only the bonus',async()=>{
  const {engine:e,base}=await fixture();const source=inert(e,base,0,{x:10,y:11});const target=inert(e,base,1,{x:12,y:11},{health:1000,shield:100});
  const r=e.damage(source,target,100,{kind:'spell',shieldMultiplier:2});assert.equal(r.shieldDamage,100);assert.equal(r.healthDamage,50);
  target.hp=1000;target.shield=100;e.damage(source,target,100,{kind:'spell',bypassShield:true});assert.equal(target.hp,900);assert.equal(target.shield,100);
  target.hp=1000;target.shield=0;target.stats.criticdamageminimiser=50;e.damage(source,target,100,{kind:'spell',critical:true});assert.equal(target.hp,850);
});

test('lifesteal uses actual health damage, then healing bonus; Bleed blocks every heal and ticks twice',async()=>{
  const {engine:e,base}=await fixture();const source=inert(e,base,0,{x:10,y:11},{health:100,lifestealChance:100,lifesteal:50,healBonus:20});source.hp=50;
  const target=inert(e,base,1,{x:12,y:11},{health:1000,shield:100});e._resolveHit(source,target,{damage:40,kind:'attack'});
  assert.ok(Math.abs(source.hp-57.2)<1e-8);
  e.status(source,'bleed',2,0,target);assert.equal(e.heal(source,100,source),0);e.step(2.01);assert.ok(Math.abs(source.hp-55.2)<1e-8);
});

test('flexibility shortens debuffs, Predominance blocks them, and hover ignores ground-only effects',async()=>{
  const {engine:e,base}=await fixture();const unit=inert(e,base,0,{x:10,y:11},{flexibility:25});
  e.status(unit,'stun',4,1);assert.equal(unit.statuses[0].until,3);
  e.status(unit,'predominance',2,1);assert.equal(e.status(unit,'slow',4,.25),null);
  unit.statuses=[];unit.def.combat.groundEffectImmune=true;assert.equal(e.status(unit,'slow',4,.25,null,{groundOnly:true}),null);
});

test('Range acquires a target but a short Attack Distance makes the attacker approach before striking',async()=>{
  const {engine:e,base}=await fixture();const def=structuredClone(base);def.stats.range=4000;def.combat.attackDistance=500;def.stats.speed=1000;
  const attacker=e.spawn(def,0,{x:10,y:3},0,{count:1})[0];const target=inert(e,base,1,{x:13,y:3});
  e.step(.5);assert.equal(attacker.shots,0);assert.ok(attacker.x>10);assert.equal(target.hp,1000);
  e.step(3);assert.ok(attacker.shots>0);assert.ok(target.hp<1000);
});

test('Soldier source A×B fires fifteen three-damage hits at one locked target then recovers interval plus delay',async()=>{
  const {engine:e,base}=await fixture();const def=structuredClone(base);def.id='soldier';def.stats.damage=3;def.stats.attackSpeed=.2;def.stats.delay=1.75;def.stats.speed=0;def.attack={count:15,damage:3,interval:.2,delay:1.75};
  const attacker=e.spawn(def,0,{x:10,y:3},0,{count:1})[0];const target=inert(e,base,1,{x:10.8,y:3});
  const other=inert(e,base,1,{x:10.7,y:3.6});e.step(2.84);
  assert.equal(attacker.shots,15);assert.equal(target.hp,955);assert.equal(other.hp,1000);e.step(1.8);assert.equal(attacker.shots,15);e.step(.2);assert.equal(attacker.shots,16);
});

test('projectiles cannot tunnel, exceed travel distance, damage air with ground-only targeting, or hit twice',async()=>{
  const {engine:e,base}=await fixture();const def=structuredClone(base);def.combat.attackType='ranged';def.combat.attackDistance=500;def.combat.targets='ground';def.stats.speed=0;
  const source=e.spawn(def,0,{x:10,y:11},1,{count:1})[0];const target=inert(e,base,1,{x:10.6,y:11});const far=inert(e,base,1,{x:12,y:11});const air=inert(e,base,1,{x:10.3,y:11});air.def.combat.movementType='flying';
  e._projectile(source,target,{damage:25,kind:'attack'},def.combat);e._projectiles(1);assert.equal(target.hp,975);assert.equal(far.hp,1000);assert.equal(air.hp,1000);assert.equal(e.state.projectiles.length,0);
});

test('cone/area geometry and finite target caps apply independently from projectile width',async()=>{
  const {engine:e,base}=await fixture();const source=e.spawn(base,0,{x:10,y:11},1,{count:1})[0];
  const front=inert(e,base,1,{x:10.8,y:11}),side=inert(e,base,1,{x:10.8,y:12.1}),behind=inert(e,base,1,{x:9.5,y:11});
  side.y=12.1; // A flying/outside-road target must remain outside the narrow cone.
  const cone={...base.combat,multiTarget:true,maxTargets:null,attackShape:'cone',attackAngle:75,attackWidth:1250,attackDistance:1000};
  assert.deepEqual(e._targetsFor(source,front,cone).map(u=>u.id),[front.id]);
  const area={...cone,attackShape:'square',impactSize:'3 × 3 tiles',maxTargets:2};assert.equal(e._targetsFor(source,front,area).length,2);assert.ok(!e._targetsFor(source,front,cone).includes(behind));
});

test('spell capacity is a deck budget; energy and active-spell cycling occur only for valid casts',async()=>{
  const {engine:e,base}=await fixture({spellDeck:['healing-light','shock-bomb','roots']});e.teams[0].energy=4;
  const ally=inert(e,base,0,{x:10,y:11});ally.hp=500;e.status(ally,'bleed',5,0,null);
  assert.equal(e.cast(0,{x:-1,y:10}).ok,false);assert.equal(e.teams[0].energy,4);assert.equal(e.teams[0].spellIndex,0);
  assert.equal(e.cast(0,{x:10,y:11}).ok,true);assert.equal(ally.hp,800);assert.equal(ally.statuses.length,0);assert.equal(e.teams[0].energy,3);assert.equal(e.teams[0].spellIndex,1);
  const enemy=inert(e,base,1,{x:12,y:11});assert.equal(e.cast(0,enemy).ok,true);assert.equal(enemy.hp,925);assert.ok(enemy.statuses.some(s=>s.kind==='stun'));assert.equal(e.teams[0].energy,0);assert.equal(e.teams[0].spellIndex,2);
  assert.equal(e.cast(0,enemy).ok,false);assert.equal(e.teams[0].spellIndex,2);
});

test('all advertised ready spells cast, buildings respect territory, and card-only conversion excludes castles',async()=>{
  const {engine:e,catalog,base}=await fixture();
  for(const spell of catalog.spells.filter(s=>s.ready)){
    e.teams[0].spellIds=[spell.id];e.teams[0].spellIndex=0;e.teams[0].energy=20;
    const point={x:6+(e.time%4),y:11};
    // Keep building footprints separate without changing source resources.
    e.state.units=e.units.filter(u=>!u.isBuilding);
    assert.equal(e.cast(0,point).ok,true,spell.id);
  }
  e.teams[0].spellIds=['guard-post'];e.teams[0].spellIndex=0;e.teams[0].energy=10;assert.equal(e.cast(0,{x:20,y:11}).ok,false);assert.equal(e.teams[0].energy,10);
  e.teams[0].spellIds=['illustration-spell'];const enemy=inert(e,base,1,{x:20,y:11});e.cast(0,enemy);assert.equal(enemy.side,0);assert.equal(e.castles[1].side,1);e.step(20.1);assert.equal(enemy.side,1);
});

test('regulation always proceeds to two-minute overtime, doubles mana, then compares castle health',async()=>{
  const {engine:e}=await fixture();e.castles[0].hp=800;e.castles[1].hp=900;e.step(300);assert.equal(e.state.phase,'overtime');assert.ok(Math.abs(e.state.remaining-120)<1e-7);
  e.teams[0].mana=0;e.step(1.3);assert.ok(Math.abs(e.teams[0].mana-2)<1e-7);e.step(118.7);assert.equal(e.state.phase,'ended');assert.equal(e.state.winner,1);
  const {engine:draw}=await fixture();draw.step(420);assert.equal(draw.state.winner,'draw');
});

test('simultaneous castle deaths resolve to a draw and stop all future simulation',async()=>{
  const {engine:e}=await fixture();e.damage(null,e.castles[0],1000,{kind:'spell'});e.damage(null,e.castles[1],1000,{kind:'spell'});e.step(.1);assert.equal(e.state.winner,'draw');const time=e.time;e.step(100);assert.equal(e.time,time);
});

test('native hooks obey silence and each natural death resolves exactly once',async()=>{
  const {engine:e,catalog,base}=await fixture();const freak=catalog.byId.get('freak');const [unit]=e.spawn(freak,0,{x:10,y:11},1,{count:1});
  e.status(unit,'silence',10,0);e.damage(null,unit,500,{kind:'spell'});e.step(.04);assert.equal(e.units.filter(u=>u.def.id==='freak/mini-freaks').length,0);
  const [natural]=e.spawn(freak,0,{x:12,y:11},1,{count:1});e.damage(null,natural,500,{kind:'spell'});e.damage(null,natural,500,{kind:'spell'});e.step(.04);assert.equal(e.units.filter(u=>u.def.id==='freak/mini-freaks').length,2);
});

test('taking damage does not reset Frostshot or X-Bot outgoing idle damage bonuses',async()=>{
  const {engine:e,catalog,base}=await fixture();
  for(const id of ['frostshot','x-bot']){
    const [unit]=e.spawn(catalog.byId.get(id),0,{x:10,y:11},1,{count:1});
    unit.memory.lastDamage=e.time-20;
    e.damage(null,unit,1,{kind:'spell'});
    assert.equal(unit.memory.lastDamage,-20);
    const target=inert(e,base,1,{x:10.5,y:11});
    const before=target.hp;e._fire(unit,target);e._projectiles(1);
    const expected=unit.stats.damage*(id==='frostshot'?3.75:1.5);
    // Criticals disabled to isolate the idle bonus, rather than incoming damage.
    assert.ok(before-target.hp>=expected-1e-7,id);
  }
});

test('Predominance blocks conversion and cleansing restores converted ownership immediately',async()=>{
  const {engine:e,base}=await fixture({spellDeck:['illustration-spell','healing-light']});
  e.teams[0].energy=20;
  const immune=inert(e,base,1,{x:12,y:11});e.status(immune,'predominance',30,1,immune);
  e.cast(0,immune);assert.equal(immune.side,1);assert.equal(immune.memory.conversion,undefined);
  const convert=inert(e,base,1,{x:10,y:11});e.teams[0].spellIndex=0;e.cast(0,convert);assert.equal(convert.side,0);
  assert.ok(convert.statuses.some(s=>s.kind==='conversion'));e.cast(0,convert);assert.equal(convert.side,1);assert.equal(convert.memory.conversion,undefined);
});

test('Earthshakers stuns for 1.5s then slows movement for two seconds without slowing attacks',async()=>{
  const {engine:e,catalog,base}=await fixture();const [earth]=e.spawn(catalog.byId.get('earthshakers'),0,{x:10,y:11},1,{count:1});
  const def=structuredClone(base);def.stats.damage=0;const [victim]=e.spawn(def,1,{x:10.5,y:11},1,{count:1});
  earth.shots=4;e._hook('hit',earth,victim,{total:1,killed:false},{damage:1});
  assert.equal(victim.statuses.find(s=>s.kind==='stun').until,1.5);assert.equal(victim.statuses.find(s=>s.kind==='movementSlow').until,3.5);
  const x=victim.x;e._move(victim,{x:9,y:11},1);assert.equal(victim.x,x);
  e.state.time=1.5;e._move(victim,{x:9,y:11},1);assert.ok(Math.abs(victim.x-(x-.7))<1e-8);
  victim.cooldown=0;e._fire(victim,earth);assert.equal(victim.cooldown,1,'movement-only slow leaves attack interval unchanged');
  e.cleanse(victim);assert.equal(victim.statuses.some(s=>s.kind==='movementSlow'),false);
  e.status(victim,'movementSlow',4,.3,earth);victim.stats.flexibility=25;e.status(victim,'movementSlow',4,.3,null);assert.equal(victim.statuses.at(-1).until,4.5);
});

test('seeded bot matches are reproducible, spend only earned mana and bound visual/log histories',async()=>{
  const [{ArenaEngine},{buildCatalog}]=await modules;const catalog=buildCatalog(rawCards,rawSpells);const deck=['hammies','b-b','scrapy','venomora','ben','freak','bethe','soldier'];
  const run=()=>{const e=new ArenaEngine({...catalog,deck,spellDeck:['healing-light','shock-bomb'],seed:190,bot:true});for(let i=0;i<420&&e.state.phase!=='ended';i++)e.step(1);return e;};
  const a=run(),b=run();assert.equal(JSON.stringify(a.state),JSON.stringify(b.state));assert.ok(a.teams[1].mana>=0&&a.teams[1].mana<=20);assert.ok(a.teams[1].energy>=0);assert.ok(a.state.effects.length<=300);assert.ok(a.state.events.length<=160);assert.equal(a.state.phase,'ended');
});

test('castle acquires targets at its 7.5-tile body-edge range and shots cannot travel farther',async()=>{
  const {engine:e,base}=await fixture();const {RULES}=await import('../arena/js/rules.mjs');
  assert.equal(RULES.castleRange,7.5);
  const castle=e.castles[0],target=inert(e,base,1,{x:16,y:3});
  target.x=castle.x+RULES.castleRange+target.radius+.01;target.y=castle.y;
  e._castles(0);assert.equal(e.state.projectiles.length,0);
  target.x=castle.x+RULES.castleRange+target.radius-.01;e._castles(0);
  assert.equal(e.state.projectiles.length,1);assert.equal(e.state.projectiles[0].remaining,7.5);
  e._projectiles(1);assert.equal(target.hp,975);assert.equal(e.state.projectiles.length,0);
});

test('paid troops and buildings beyond the castle radius are rejected without spending resources',async()=>{
  const {engine:e}=await fixture({spellDeck:['guard-post']});const [,,{pointOnRoute,isWalkable}]=await modules;
  const point=pointOnRoute(0,0,8.5);assert.ok(isWalkable(point));
  const before=structuredClone(e.teams[0]);assert.equal(e.deploy(0,0,point).ok,false);assert.deepEqual(e.teams[0],before);
  e.teams[0].energy=10;assert.equal(e.cast(0,point).ok,false);assert.equal(e.teams[0].energy,10);assert.equal(e.teams[0].spellIndex,0);assert.equal(e.units.length,0);
});

test('rear courtyard deployments retain their location and walk around the castle body',async()=>{
  const {engine:e}=await fixture();const [,,{MAP,isWalkable,distance}]=await modules;
  const point={x:2.2,y:11},result=e.deploy(0,0,point);assert.equal(result.ok,true);
  const unit=result.units[0];assert.equal(unit.x,point.x);assert.equal(unit.y,point.y);
  assert.equal(e.castles[0].radius,MAP.castleRadius);
  for(let i=0;i<80;i++){
    const previous={x:unit.x,y:unit.y};
    e.step(.1);assert.ok(isWalkable(unit),`${unit.x},${unit.y}`);
    assert.ok(distance(previous,unit)<=.1+1e-8,'the courtyard exit does not teleport the unit');
    assert.ok(distance(unit,e.castles[0])>=MAP.castleRadius+unit.radius-1e-8,'walking does not intersect the castle');
  }
  assert.ok(distance(unit,point)>3,'a rear deployment can leave the courtyard');
});

test('front-corner courtyard units enter their route without getting stuck or teleporting on either side',async()=>{
  const {engine:e,catalog}=await fixture();const [,,{MAP,isDeployable,isWalkable,distance,closestRoute}]=await modules;
  const cases=[{side:0,point:{x:7.4,y:12.9}},{side:1,point:{x:24.6,y:9.1}},{side:0,point:{x:7.4,y:9.1}},{side:1,point:{x:24.6,y:12.9}}];
  for(const {side,point} of cases){
    e.state.units=[];assert.ok(isDeployable(point,side));
    const def=catalog.byId.get('henry'),lane=closestRoute(point).lane;
    const [unit]=e.spawn(def,side,point,lane,{count:1,positions:[point]});
    for(let i=0;i<220;i++){
      const previous={x:unit.x,y:unit.y};e.step(1/30);
      assert.ok(isWalkable(unit),`${side}: ${unit.x},${unit.y}`);
      assert.ok(distance(previous,unit)<=def.stats.speed/1000/30+1e-8,'walking respects the source speed');
      assert.ok(distance(unit,e.castles[side])>=MAP.castleRadius+unit.radius-1e-8);
    }
    assert.ok(distance(unit,point)>3,`${side}: the corner deployment leaves the courtyard`);
  }
});

test('bot troop and building placement derives legal positions from each lane and castle range',async()=>{
  const {engine:e}=await fixture({bot:true,spellDeck:['guard-post']});const [,,{MAP,isDeployable,distance}]=await modules;
  const {RULES}=await import('../arena/js/rules.mjs');
  for(let side=0;side<2;side++)for(let lane=0;lane<3;lane++){
    const candidates=e._deploymentCandidates(side,lane);assert.ok(candidates.length>0,`side ${side}, lane ${lane}`);
    for(const p of candidates){assert.ok(isDeployable(p,side));assert.ok(distance(p,MAP.bases[side])<=RULES.castleRange+1e-9);}
  }
  const placements=[],casts=[],deploy=e.deploy.bind(e),cast=e.cast.bind(e);
  e.deploy=(side,index,point)=>{const result=deploy(side,index,point);if(result.ok)placements.push({side,point:{...point}});return result;};
  e.cast=(side,point)=>{const result=cast(side,point);if(result.ok)casts.push({side,point:{...point}});return result;};
  e.teams[1].energy=10;e.step(8);
  assert.ok(placements.length>0);assert.ok(casts.length>0);
  for(const {side,point} of [...placements,...casts]){assert.equal(side,1);assert.ok(isDeployable(point,side));assert.ok(distance(point,MAP.bases[side])<=7.5+1e-9);}
});
