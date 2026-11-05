const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const modules=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/map.mjs'),import('../arena/js/vision.mjs')]);
const catalogPromise=modules.then(([, {buildCatalog}])=>buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json')))));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
async function fixture(){
  const [{ArenaEngine},,map,vision]=await modules,catalog=await catalogPromise;
  const e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:catalog.cards.filter(c=>c.ready).slice(0,8).map(c=>c.id),spellDeck:['healing-light'],bot:false,seed:25});
  const spawn=(id,side=0,p={x:15,y:14},stats={})=>{
    const def=structuredClone(catalog.byId.get(id));Object.assign(def.stats,{speed:0,criticalChance:0,dodge:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...stats});
    const made=e.spawn(def,side,p,1,{count:1});for(const u of made){u.cooldown=Infinity;u.stats.speed=0;u.stats.criticalChance=0;u.stats.lifestealChance=0;}Object.assign(made[0].stats,stats);return made[0];
  };
  const dummy=(side=1,p={x:18,y:14},stats={})=>{
    const def=structuredClone(catalog.byId.get('hammies'));def.id='corsair-target';def.forms=[];def.combat.attackType='none';
    Object.assign(def.stats,{health:1000,shield:0,damage:0,range:0,speed:0,dodge:0,criticalChance:0,healrecovery:0,shieldrecovery:0,...stats});
    const [u]=e.spawn(def,side,p,1,{count:1});u.cooldown=Infinity;return u;
  };
  const shooter=(p={x:18,y:14},id=null)=>{const u=id?spawn(id,1,p,{health:1000,shield:0}):dummy(1,p,{damage:40,range:6000,attackSpeed:1,criticDamage:2.5});u.def.combat.attackType='ranged';return u;};
  return {e,catalog,spawn,dummy,shooter,map,vision};
}

test('Corsair Crew, Pirate Girls and RogueX unlock while source mana, Count and damage stay intact',async()=>{
  const {catalog}=await fixture();assert.equal(catalog.cards.filter(c=>c.ready).length,95);
  for(const id of ['corsair-crew','corsair-crew/pirate-girls','roguex'])assert.deepEqual(catalog.byId.get(id).reasons,[]);
  const c=catalog.byId.get('corsair-crew'),g=c.forms[0],r=catalog.byId.get('roguex');
  assert.equal(c.stats.number,1);assert.equal(c.stats.mana,12);assert.equal(c.stats.health,430);assert.equal(c.stats.damage,20);
  assert.equal(g.stats.number,2);assert.equal(g.stats.damage,16);assert.equal(g.stats.range,2750);assert.equal(g.attack.interval,1.5);
  assert.equal(r.stats.mana,9);assert.equal(r.stats.damage,16);assert.equal(r.combat.attackType,'ranged');
});

test('one twelve-mana deployment creates the captain and both girls on the same selected corridor',async()=>{
  const {e,map}=await fixture();e.teams[0].hand[0]='corsair-crew';const result=e.deploy(0,0,{x:7,y:14});assert.equal(result.ok,true);
  assert.equal(result.units.length,3);assert.deepEqual(result.units.map(u=>u.def.id),['corsair-crew',...Array(2).fill('corsair-crew/pirate-girls')]);
  assert.equal(new Set(result.units.map(u=>u.groupId)).size,1);assert.equal(e.teams[0].spentMana,12);assert.equal(e.teams[0].deployed,1);assert.equal(e.teams[0].queue.at(-1),'corsair-crew');
  for(const u of result.units){assert.equal(u.lane,1);assert.equal(u.side,0);assert.ok(map.isDeployable(u,0));}
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.ok(map.distance(result.units[i],result.units[j])>=result.units[i].radius+result.units[j].radius);
  assert.ok(result.units[1].x<result.units[0].x);assert.ok(result.units[2].x<result.units[0].x);
});

test('all three crew bodies stay inside the legal castle radius at either deployment boundary',async()=>{
  for(const side of [0,1]){
    const {e,map}=await fixture();e.teams[side].hand[0]='corsair-crew';const result=e.deploy(side,0,{x:side?31.5:11.5,y:14});assert.equal(result.ok,true);
    assert.equal(result.units.length,3);for(const u of result.units){assert.ok(map.isDeployable(u,side));assert.ok(map.distance(u,e.castles[side])<=7.5+1e-7);}
  }
});

test('lack of room for the whole crew rejects deployment before charging mana or cycling the hand',async()=>{
  const {e}=await fixture(),point={x:7,y:14};e.teams[0].hand[0]='corsair-crew';const before=[...e.teams[0].hand];
  const candidates=[{x:6.4,y:13.65},{x:6.4,y:14.35}];for(let ring=1;ring<=6;ring++)for(let k=0;k<ring*8;k++){const angle=k/(ring*8)*Math.PI*2;candidates.push({x:7+Math.cos(angle)*ring*.54,y:14+Math.sin(angle)*ring*.54});}
  e.state.units=candidates.map((p,i)=>({...p,id:`blocker-${i}`,alive:true,radius:.25,def:{combat:{movementType:'ground'}}}));
  const result=e.deploy(0,0,point);assert.equal(result.ok,false);assert.match(result.error,/whole formation/);assert.equal(e.teams[0].spentMana,0);assert.equal(e.teams[0].mana,12);assert.deepEqual(e.teams[0].hand,before);
});

test('captain death leaves the two living girls without summoning or charging again',async()=>{
  const {e,spawn}=await fixture(),captain=spawn('corsair-crew');assert.equal(e.units.length,3);e.damage(null,captain,10000,{kind:'spell'});e._drainDeaths();
  assert.equal(e.units.length,2);assert.ok(e.units.every(u=>u.def.id==='corsair-crew/pirate-girls'));assert.equal(e.teams[0].spentMana,0);e.step(.1);assert.equal(e.units.length,2);
});

test('Format copies the crew companions once and promotion does not duplicate them',async()=>{
  const {e,spawn}=await fixture(),u=spawn('format'),target=spawn('corsair-crew',1,{x:18,y:14});
  target.def.power=1000;for(const girl of e.units.filter(t=>t.def.id==='corsair-crew/pirate-girls'))girl.def.power=1;
  e.step(3);assert.equal(u.def.id,'corsair-crew');assert.equal(e.units.filter(t=>t.side===0&&t.def.id==='corsair-crew/pirate-girls').length,2);
  e.damage(u,target,10000,{kind:'spell'});assert.equal(u.memory.format.promoted,true);assert.equal(e.units.filter(t=>t.side===0&&t.def.id==='corsair-crew/pirate-girls').length,2);
});

test('Pirate Girls launch 16, 22 and 28 damage at zero, half and maximum distance, capped at 75 percent',async()=>{
  for(const [range,damage]of [[0,16],[1.375,22],[2.75,28],[4,28]]){
    const {e,spawn,dummy}=await fixture(),girl=spawn('corsair-crew/pirate-girls'),target=dummy(1,{x:15+range,y:14});e._fire(girl,target);
    close(e.state.projectiles[0].hit.damage,damage);close(girl.stats.damage,16);close(girl.memory.distanceBonus,(damage/16)-1);
  }
});

test('a real Pirate Girls projectile fires from 2.75 tiles and delivers 28 damage before contact',async()=>{
  const {e,spawn,dummy}=await fixture(),girl=spawn('corsair-crew/pirate-girls'),target=dummy(1,{x:17.75,y:14});girl.cooldown=0;e.step(.5);
  assert.equal(girl.shots,1);close(target.hp,972);close(girl.x,15);assert.equal(girl.def.stats.damage,16);
});

test('Corsair reflects a real projectile before damage and returns it visibly to its shooter',async()=>{
  const {e,spawn,shooter}=await fixture(),captain=spawn('corsair-crew',0,{x:15,y:14},{criticalChance:5}),attacker=shooter();e.random=()=>.099;
  e._fire(attacker,captain);e.step(.4);close(captain.hp,430);close(attacker.hp,1000);assert.equal(captain.memory.reflectedShots,1);assert.ok(e.state.projectiles.some(p=>p.reflected&&p.targetId===attacker.id));
  e.step(.4);close(attacker.hp,960);assert.equal(e.state.projectiles.length,0);assert.equal(captain.shots,0);
});

test('reflection uses the exact 5 plus Dodge plus Critical Chance boundary before ordinary Dodge',async()=>{
  for(const [dodge,crit,roll,reflected]of [[0,5,.099,true],[0,5,.1,false],[20,25,.499,true],[20,25,.5,false],[70,100,.999,true]]){
    const {e,spawn,shooter}=await fixture(),captain=spawn('corsair-crew',0,{x:15,y:14},{dodge,criticalChance:crit}),attacker=shooter();e.random=()=>roll;e._fire(attacker,captain);e.step(.9);
    assert.equal(!!captain.memory.reflectedShots,reflected,`${dodge}/${crit}/${roll}`);close(captain.hp,reflected?430:390);close(attacker.hp,reflected?960:1000);
  }
});

test('Corsair does not reflect melee hits, direct spells or damage over time',async()=>{
  for(const kind of ['melee','spell','dot']){
    const {e,spawn,shooter}=await fixture(),captain=spawn('corsair-crew',0,{x:15,y:14},{criticalChance:100}),attacker=shooter({x:15.6,y:14});e.random=()=>.5;
    if(kind==='melee'){attacker.def.combat.attackType='melee';e._fire(attacker,captain);}else e.damage(attacker,captain,40,{kind});
    close(captain.hp,390);close(attacker.hp,1000);assert.equal(captain.memory.reflectedShots,undefined);
  }
});

test('Silence and Misfortune can suppress projectile reflection without cancelling the incoming damage',async()=>{
  for(const kind of ['silence','misfortune']){
    const {e,spawn,shooter}=await fixture(),captain=spawn('corsair-crew',0,{x:15,y:14},{criticalChance:100}),attacker=shooter();e.status(captain,kind,2,.1);e.random=()=>0;e._fire(attacker,captain);e.step(.9);
    close(captain.hp,390);close(attacker.hp,1000);assert.equal(captain.memory.reflectedShots,undefined);
  }
});

test('returned bullets retain the original critical multiplier and respect recipient Critical Resistance',async()=>{
  const {e,spawn,shooter}=await fixture(),captain=spawn('corsair-crew',0,{x:15,y:14},{criticalChance:100}),attacker=shooter();attacker.stats.criticdamageminimiser=20;e.random=()=>.5;
  e._fire(attacker,captain);e.state.projectiles[0].hit.critical=true;e.step(.9);close(captain.hp,430);close(attacker.hp,912);
});

test('Corsair can return an aerial shooter bullet while its own melee target layer stays ground-only',async()=>{
  const {e,spawn,shooter}=await fixture(),captain=spawn('corsair-crew',0,{x:15,y:14},{criticalChance:100}),attacker=shooter();attacker.def.combat.movementType='flying';e.random=()=>.5;
  assert.equal(e.canTarget(captain,attacker),false);e._fire(attacker,captain);e.step(.9);close(attacker.hp,960);assert.equal(captain.def.combat.targets,'ground');
});

test('a reflected castle projectile can return to and damage its castle',async()=>{
  const {e,spawn}=await fixture(),captain=spawn('corsair-crew',0,{x:35,y:14},{criticalChance:100}),castle=e.castles[1];castle.cooldown=Infinity;e.random=()=>.5;
  e._projectile(castle,captain,{damage:40,kind:'attack',critical:false},{attackType:'ranged',attackWidth:500,attackDistance:7500,attackShape:'single',multiTarget:false,maxTargets:1});e.step(1.2);close(castle.hp,960);close(captain.hp,430);
});

test('reflecting Boomix keeps its weapon locked until the return bullet finishes',async()=>{
  const {e,spawn,shooter}=await fixture(),captain=spawn('corsair-crew',0,{x:15,y:14},{criticalChance:100}),attacker=shooter({x:18,y:14},'boomix');e.random=()=>.5;
  e._fire(attacker,captain);e.step(.4);assert.ok(attacker.memory.returningShotId);e._fire(attacker,captain);assert.equal(attacker.shots,1);
  e.step(.4);assert.equal(attacker.memory.returningShotId,undefined);assert.equal(attacker.shots,1);close(captain.hp,430);assert.ok(attacker.hp<1000);
});

test('a reflected projectile pauses and expires cleanly if its shooter disappears',async()=>{
  const {e,spawn,shooter}=await fixture(),captain=spawn('corsair-crew',0,{x:15,y:14},{criticalChance:100}),attacker=shooter();e.random=()=>.5;e._fire(attacker,captain);e.step(.4);const shot=e.state.projectiles[0],x=shot.x;
  e.setPaused(true);e.step(10);close(shot.x,x);e.setPaused(false);e.killUnit(attacker);e.step(.1);assert.equal(e.state.projectiles.length,0);close(captain.hp,430);
});

test('an already reflected shot cannot bounce between two Corsair captains',async()=>{
  const {e,spawn}=await fixture(),a=spawn('corsair-crew',1,{x:18,y:14},{criticalChance:100}),b=spawn('corsair-crew',0,{x:15,y:14},{criticalChance:100});e.random=()=>.5;
  e._projectile(a,b,{damage:40,kind:'attack',critical:false},{attackType:'ranged',attackWidth:500,attackDistance:6000,attackShape:'single',multiTarget:false,maxTargets:1});e.step(.9);
  close(a.hp,390);close(b.hp,430);assert.equal(b.memory.reflectedShots,1);assert.equal(a.memory.reflectedShots,undefined);assert.equal(e.state.projectiles.length,0);
});

test('a reflected explosive ability projectile keeps its payload without exploding on the defender',async()=>{
  const {e,spawn,shooter}=await fixture(),captain=spawn('corsair-crew',0,{x:15,y:14},{criticalChance:100}),attacker=shooter();e.random=()=>.5;
  assert.equal(e.abilityProjectile(attacker,captain,40,{range:6,kind:'grenade',impactSize:'1.25 × 1.25 tiles'}),true);e.step(.9);
  close(captain.hp,430);close(attacker.hp,960);assert.equal(captain.memory.reflectedShots,1);
});

test('RogueX applies seven seconds of 25 percent Blind on its fifty-percent successful-hit boundary',async()=>{
  for(const [roll,blind]of [[.499,true],[.5,false]]){
    const {e,spawn,dummy,vision}=await fixture(),u=spawn('roguex'),target=dummy(1,{x:18,y:14},{range:4000,vision:8000});e.random=()=>roll;e._fire(u,target);e.step(.5);
    close(target.hp,984);const status=target.statuses.find(s=>s.kind==='blind');assert.equal(!!status,blind);
    if(status){close(status.magnitude,.25);close(status.until-status.nextTick+status.interval,7);close(e._range(target),3);assert.equal(vision.visibilitySources(e.state,1).find(s=>s.x===target.x&&s.y===target.y).radius,6);}
  }
});

test('RogueX Blind respects immunity, misses, Silence, structures and Predominance',async()=>{
  for(const kind of ['untouchable','misfortune','silence','building','predominance']){
    const {e,spawn,dummy}=await fixture(),u=spawn('roguex'),target=dummy();e.random=()=>0;
    if(kind==='untouchable'||kind==='predominance')e.status(target,kind,2);
    else if(kind==='building')target.isBuilding=true;
    else e.status(u,kind,2,.1);
    e._fire(u,target);e.step(.5);assert.equal(target.statuses.some(s=>s.kind==='blind'),false,kind);
  }
});
