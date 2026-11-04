const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const modules=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/statuses.mjs')]);
const catalogPromise=modules.then(([, {buildCatalog}])=>buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json')))));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
async function fixture(){
  const [{ArenaEngine},,{hasStatus}]=await modules,catalog=await catalogPromise;
  const e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:catalog.cards.filter(c=>c.ready).slice(0,8).map(c=>c.id),spellDeck:['healing-light'],seed:15,bot:false});
  const spawn=(id,side=0,p={x:15,y:14},extra={})=>{
    const def=structuredClone(catalog.byId.get(id));Object.assign(def.stats,{speed:0,criticalChance:0,lifestealChance:0,dodge:0,healrecovery:0,shieldrecovery:0,...extra});
    const [u]=e.spawn(def,side,p,1,{count:1});u.cooldown=Infinity;return u;
  };
  const dummy=(side=1,p={x:18,y:14},extra={})=>{
    const def=structuredClone(catalog.byId.get('hammies'));def.id='relic-target';def.forms=[];
    Object.assign(def.stats,{health:1000,shield:0,damage:0,speed:0,range:0,number:1,life:0,dodge:0,criticalChance:0,healrecovery:0,shieldrecovery:0,...extra});def.combat.attackType='none';
    return e.spawn(def,side,p,1,{count:1})[0];
  };
  const hit=(u,t,damage=u.stats.damage)=>e._resolveHit(u,t,{kind:'attack',damage});
  const kill=u=>{e.damage(null,u,u.hp+u.shield+1,{kind:'spell',bypassShield:true});e._drainDeaths();};
  return {e,catalog,spawn,dummy,hit,kill,has:(u,kind)=>hasStatus(u,kind,e.time)};
}

test('all twenty-three Relic cards and their summons unlock with verified native handlers',async()=>{
  const {catalog}=await fixture();
  const ids=['stacy','death','demotron','aeralis','dark-necromancer','ali','worms','bloodraider','shine','avalith','sylviana','sylviana/butterflies','malvaris','malvaris/phantomis','pyhsic','unara','clara','far','lyra','naar','dark-necromancer/bladeknight','dark-necromancer/stormbow','dark-necromancer/ironhide'];
  for(const id of ids){assert.equal(catalog.byId.get(id).ready,true,id);assert.deepEqual(catalog.byId.get(id).reasons,[]);}
  for(const id of ['etheris','format','artist','artist/flock-of-ravens'])assert.equal(catalog.byId.get(id).ready,true,id);
  assert.equal(catalog.cards.filter(c=>c.ready).length,86);
  assert.equal(catalog.byId.get('magma').ready,true);assert.equal(catalog.byId.get('fallen-angel').ready,true);
});

test('each Stacy impact delivers exactly four eight-damage Burn ticks without recursion',async()=>{
  const {e,spawn,dummy,hit}=await fixture(),u=spawn('stacy'),target=dummy();hit(u,target,8);
  close(target.hp,992);assert.equal(target.statuses.filter(s=>s.kind==='burn').length,1);
  e.step(.9);close(target.hp,992);e.step(.1);close(target.hp,984);e.step(3);close(target.hp,960);
  assert.equal(target.statuses.some(s=>s.kind==='burn'),false);e.step(2);close(target.hp,960);assert.equal(u.hits,1);
});

test('independent Stacy Burn packets stack and survive the caster death with their source attribution',async()=>{
  const {e,spawn,dummy,hit,kill}=await fixture(),u=spawn('stacy'),target=dummy();hit(u,target,8);hit(u,target,8);
  assert.equal(target.statuses.filter(s=>s.kind==='burn').length,2);kill(u);e.step(4);close(target.hp,920);
  assert.equal(e.statusSources.size,0);assert.equal(target.statuses.some(s=>s.kind==='burn'),false);
});

test('Stacy gains ten percent Range only below ten percent Health and loses the bonus after healing',async()=>{
  const {e,spawn}=await fixture(),u=spawn('stacy');u.hp=19;e._hook('tick',u,0);close(e._range(u),2.6);
  u.hp=18.9;e._hook('tick',u,0);close(e._range(u),2.86);assert.equal(u.def.stats.range,2600);
  e.status(u,'blind',2,.25);close(e._range(u),2.145);e.cleanse(u);
  e.heal(u,20);e._hook('tick',u,0);close(e._range(u),2.6);
});

test('ranged cones expand toward their authored width and hit multiple enemies within the fan',async()=>{
  for(const id of ['stacy','aeralis']){
    const {e,spawn,dummy}=await fixture(),u=spawn(id),center=dummy(1,{x:17.3,y:14}),fan=dummy(1,{x:17.1,y:14.45}),nearOutside=dummy(1,{x:15.15,y:14.4}),outside=dummy(1,{x:17.1,y:14.95});
    for(const t of [center,fan,nearOutside,outside])t.radius=.1;
    e._fire(u,center);u.cooldown=Infinity;e.step(.6);
    assert.ok(center.hp<1000,id);assert.ok(fan.hp<1000,id);close(nearOutside.hp,1000);close(outside.hp,1000);
  }
});

test('Demotron repairs ten percent of its current missing Health each ten seconds: 10 then 9',async()=>{
  const {e,spawn}=await fixture(),u=spawn('demotron');u.hp=u.maxHp-100;
  e.step(9.9);close(u.hp,635);e.step(.1);close(u.hp,645);e.step(10);close(u.hp,654);
  e.heal(u,1000);e.step(10);close(u.hp,735);
});

test('Demotron regeneration uses current loss, honors healing modifiers and stops while silenced or paused',async()=>{
  const {e,spawn}=await fixture(),u=spawn('demotron',0,{x:15,y:14},{healBonus:25});u.hp-=100;
  e.step(9);e.status(u,'burn',2,0,null,{amount:0});e.step(1);close(u.hp,645);
  e.setPaused(true);e.step(30);close(u.hp,645);close(e.time,10);e.setPaused(false);
  e.status(u,'silence',20);e.step(10);close(u.hp,645);
  e.cleanse(u);e.step(10);close(u.hp,656.25);
});

test('Death counts allied, enemy and summoned unit deaths once and caps only the bonus at eighty',async()=>{
  const {e,spawn,dummy,kill}=await fixture(),u=spawn('death');
  const ally=dummy(0,{x:11,y:14}),enemy=dummy(1,{x:25,y:14}),summon=spawn('freak/mini-freaks',0,{x:18,y:14});
  kill(ally);kill(enemy);kill(summon);close(u.stats.damage,31);
  e.deaths.push({u:ally,killer:null});e._drainDeaths();close(u.stats.damage,31);
  for(let i=0;i<45;i++)kill(dummy(i%2,{x:20,y:14}));
  close(u.memory.damageGrowth,80);close(u.stats.damage,105);assert.equal(u.def.stats.damage,25);
});

test('Death ignores castle and building destruction and cannot collect souls while silenced or dead',async()=>{
  const {e,spawn,dummy,kill}=await fixture(),u=spawn('death'),building=dummy();building.isBuilding=true;kill(building);close(u.stats.damage,25);
  kill(e.castles[1]);close(u.stats.damage,25);
  e.status(u,'silence',3);kill(dummy());close(u.stats.damage,25);e.cleanse(u);
  e.status(u,'misfortune',3,1);kill(dummy());close(u.stats.damage,25);e.cleanse(u);kill(dummy());close(u.stats.damage,27);
  kill(u);kill(dummy());close(u.stats.damage,27);
});

test('Aeralis pushes on real hits by .1 tiles, with exactly twelve percent chance of a .4-tile push',async()=>{
  const {e,spawn,dummy,hit}=await fixture(),u=spawn('aeralis'),target=dummy(1,{x:17,y:14});
  e.random=()=>.119;hit(u,target,7);close(target.x,17.4);
  e.random=()=>.12;hit(u,target,7);close(target.x,17.5);
  e.status(target,'predominance',3);hit(u,target,7);close(target.x,17.5);
});

test('Necromancer summons one fully playable form after fourteen seconds and follows the 40/35/25 boundaries',async()=>{
  for(const [roll,id] of [[.399,'bladeknight'],[.4,'stormbow'],[.749,'stormbow'],[.75,'ironhide']]){
    const {e,spawn}=await fixture(),u=spawn('dark-necromancer');e.random=()=>roll;
    e.step(13.9);assert.equal(e.units.length,1);e.step(.1);
    const children=e.units.filter(t=>t!==u);assert.equal(children.length,1);assert.equal(children[0].def.id,`dark-necromancer/${id}`);assert.equal(children[0].groupId,u.groupId);
    assert.equal(children[0].shots,0,'a summon cannot take an extra action in its birth tick');
  }
});

test('Necromancer silence, Bladeknight shield bypass and Stormbow Burn execute their authored effects',async()=>{
  const {e,spawn,dummy,hit,has}=await fixture(),mage=spawn('dark-necromancer'),target=dummy(1,{x:17,y:14},{shield:100});e.random=()=>0;
  hit(mage,target,15);assert.ok(has(target,'silence'));close(target.statuses.find(s=>s.kind==='silence').until,10);
  const blade=spawn('dark-necromancer/bladeknight'),shield=target.shield,hp=target.hp;e._fire(blade,target);blade.cooldown=Infinity;close(target.shield,shield);close(target.hp,hp-27);
  const archer=spawn('dark-necromancer/stormbow'),fresh=dummy(1,{x:20,y:14});hit(archer,fresh,17);e.step(2);close(fresh.hp,975);
});

test('Ironhide prevents every fourth incoming damage event across attack, spell and damage-over-time packets',async()=>{
  const {e,spawn}=await fixture(),u=spawn('dark-necromancer/ironhide',0,{x:15,y:14},{shield:0});
  for(let i=1;i<=8;i++){const result=e.damage(null,u,10,{kind:['attack','spell','dot'][i%3]});assert.equal(result.total,i%4?10:0);}
  close(u.hp,340);
});

test('Ironhide also cancels an execution attached to its fourth incoming hit',async()=>{
  const {e,spawn}=await fixture(),u=spawn('dark-necromancer/ironhide',0,{x:15,y:14},{shield:0});
  for(let i=0;i<3;i++)e.damage(null,u,10,{kind:'attack'});
  close(e.damage(null,u,10,{kind:'attack',instantKill:true}).total,0);assert.ok(u.alive);close(u.hp,370);
});

test('Ali charges from other nearby allies and grants himself and them three seconds of immunity',async()=>{
  const {e,spawn,dummy,has}=await fixture(),u=spawn('ali');e.step(1);close(u.memory.charge,0);
  const near=dummy(0,{x:15.5,y:14}),far=dummy(0,{x:17,y:14});e.step(25);
  assert.ok(has(u,'untouchable'));assert.ok(has(near,'untouchable'));assert.equal(has(far,'untouchable'),false);
  close(e.damage(null,near,10,{kind:'spell'}).total,0);close(e.damage(null,far,10,{kind:'spell'}).total,10);
  e.step(3);assert.equal(has(near,'untouchable'),false);close(e.damage(null,near,10,{kind:'spell'}).total,10);
});

test('Worms deploy as six concealed units and their first successful strike emerges and stuns once',async()=>{
  const {e,spawn,dummy,hit,has}=await fixture();e.teams[0].hand[0]='worms';e.teams[0].mana=20;
  const paid=e.deploy(0,0,{x:6.5,y:14});assert.equal(paid.ok,true);assert.equal(paid.units.length,6);assert.ok(paid.units.every(u=>has(u,'invisible')));
  const u=spawn('worms'),target=dummy(1,{x:15.6,y:14});assert.equal(e.canTarget(target,u),false);
  hit(u,target,7);assert.equal(has(u,'invisible'),false);assert.ok(has(target,'stun'));e.step(1);assert.equal(has(target,'stun'),false);
  hit(u,target,7);assert.equal(has(target,'stun'),false);
});

test('native Relic timers and deaths freeze with the simulation pause',async()=>{
  const {e,spawn,dummy}=await fixture();spawn('death');const u=spawn('demotron'),mage=spawn('dark-necromancer');u.hp-=100;spawn('ali');dummy(0,{x:15.5,y:14});
  e.step(5);e.setPaused(true);const before=JSON.stringify(e.state);e.step(30);assert.equal(JSON.stringify(e.state),before);assert.equal(mage.memory.summonClock>4.9,true);
});

test('Bloodraider compounds unrounded damage while each delivered strike uses an integer',async()=>{
  const {e,spawn,dummy,hit}=await fixture(),u=spawn('bloodraider',0,{x:15,y:14},{damage:20}),target=dummy(),shield=u.shield;
  for(const expected of [22,24,27]){hit(u,target);assert.equal(u.stats.damage,expected);}
  close(u.memory.bloodDamage,26.62);close(target.hp,934);close(u.hp,308);close(u.shield,shield);
  assert.equal(u.def.stats.damage,20);assert.equal(e.cards.get('bloodraider').stats.damage,38);
});

test('Bloodraider spends four percent maximum Health per successful victim without shield or damage reduction',async()=>{
  const {e,spawn,dummy,hit}=await fixture(),u=spawn('bloodraider',0,{x:15,y:14},{damageminimiser:90}),target=dummy(),shield=u.shield;
  e.status(u,'untouchable',3);hit(u,target);close(u.hp,336);close(u.shield,shield);
  e.status(target,'untouchable',3);hit(u,target);close(u.hp,336);assert.equal(u.stats.damage,42);
  e.cleanse(target);target.statuses=[];e.status(u,'silence',3);hit(u,target);close(u.hp,336);assert.equal(u.stats.damage,42);
});

test('Bloodraider health costs resolve a lethal loss once, and Immortal can preserve its last Health',async()=>{
  const {e,spawn,dummy,hit}=await fixture(),u=spawn('bloodraider'),target=dummy(),death=spawn('death');u.hp=14;
  hit(u,target);assert.equal(u.alive,false);close(u.hp,0);e._drainDeaths();assert.equal(death.stats.damage,27);
  assert.equal(e.loseHealth(u,14),0);e._drainDeaths();assert.equal(death.stats.damage,27);
  const immortal=spawn('bloodraider');immortal.hp=7;e.status(immortal,'immortal',2);hit(immortal,target);close(immortal.hp,1);assert.ok(immortal.alive);
});

test('Shine raises self and nearby allies by four percent of base maximum Health every five seconds',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('shine'),ally=dummy(0,{x:15.6,y:14.5}),enemy=dummy(1,{x:15.6,y:13.5}),far=dummy(0,{x:18,y:14});ally.hp=950;
  e.step(4.9);close(u.maxHp,280);close(ally.maxHp,1000);e.step(.1);
  close(u.maxHp,291.2);close(u.hp,291.2);close(ally.maxHp,1040);close(ally.hp,990);
  close(enemy.maxHp,1000);close(far.maxHp,1000);close(e.castles[0].maxHp,1000);close(u.shield,90);
  e.step(25);close(u.maxHp,336);close(ally.maxHp,1200);close(ally.hp,1150);assert.equal(ally.memory.shineStacks,5);
});

test('overlapping Shines share the twenty-percent cap and preserve other maximum-Health bonuses',async()=>{
  const {e,spawn,dummy}=await fixture(),a=spawn('shine'),b=spawn('shine',0,{x:15.7,y:14}),ally=dummy(0,{x:15.35,y:14.6});
  ally.maxHp+=50;ally.stats.health=ally.maxHp;ally.hp+=50;
  for(let i=0;i<4;i++){e._hook('tick',a,5);e._hook('tick',b,5);}
  close(ally.maxHp,1250);close(ally.hp,1250);assert.equal(ally.memory.shineStacks,5);close(ally.def.stats.health,1000);
});

test('Shine pauses its aura timer when silenced and with the battle pause',async()=>{
  const {e,spawn}=await fixture(),u=spawn('shine');e.step(4.9);e.status(u,'silence',20);e.step(10);close(u.maxHp,280);
  e.cleanse(u);e.setPaused(true);e.step(30);close(u.maxHp,280);e.setPaused(false);e.step(.1);close(u.maxHp,291.2);
});

test('Avalith pierces ground targets once on each leg and turns at the original target position',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('avalith'),primary=dummy(1,{x:17.5,y:14}),near=dummy(1,{x:15.9,y:14}),far=dummy(1,{x:19,y:14}),outside=dummy(1,{x:16.2,y:15.1}),air=dummy(1,{x:16.5,y:14});air.def.combat.movementType='flying';outside.y=15.1;
  e._fire(u,primary);const shot=e.state.projectiles[0];assert.equal(u.memory.returningShotId,shot.id);
  for(let i=0;i<100&&shot.returning==='outbound';i++)e._projectiles(1/60);
  assert.equal(shot.returning,'return');close(shot.x,17.5);close(primary.hp,984);close(near.hp,984);
  e._fire(u,primary);assert.equal(u.shots,1,'the returning weapon must be caught before another shot');
  for(let i=0;i<100&&e.state.projectiles.length;i++)e._projectiles(1/60);
  close(primary.hp,968);close(near.hp,968);close(far.hp,1000);close(outside.hp,1000);close(air.hp,1000);
  assert.equal(u.hits,4);assert.equal(u.memory.returningShotId,undefined);assert.equal(e.state.projectiles.length,0);
});

test('Avalith returns to its moving owner, without chasing a target that left the line',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('avalith'),target=dummy(1,{x:17,y:14});e._fire(u,target);
  target.y=17;const shot=e.state.projectiles[0];
  for(let i=0;i<100&&shot.returning==='outbound';i++)e._projectiles(1/60);
  close(shot.x,17);close(shot.y,14);u.x=14.5;
  for(let i=0;i<100&&e.state.projectiles.length;i++)e._projectiles(1/60);
  close(shot.x,u.x);close(shot.y,u.y);close(target.hp,1000);assert.equal(u.memory.returningShotId,undefined);
});

test('Avalith recovers after catching its shot with the confirmed linear distance interval',async()=>{
  for(const [distance,interval] of [[.75,.16],[1,.16],[2.375,.48],[3.75,.8]]){
    const {e,spawn,dummy}=await fixture(),u=spawn('avalith'),target=dummy(1,{x:15+distance,y:14});
    e._fire(u,target);const shot=e.state.projectiles[0];close(shot.recovery,interval);
    assert.equal(u.def.stats.attackSpeed,.8);assert.equal(u.def.stats.delay,1.3);
    e.step(2*distance/8-.01);assert.equal(u.shots,1);assert.ok(u.memory.returningShotId);
    for(let i=0;i<100&&u.memory.returningShotId;i++)e.step(1/30);
    const caught=e.time;close(u.cooldown,interval);e.step(interval-.04);assert.equal(u.shots,1);
    e.step(.1);assert.equal(u.shots,2);assert.ok(e.time>=caught+interval);
  }
});

test('Avalith respects Slow and Haste and a new Silence does not strand a shot in flight',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('avalith'),target=dummy(1,{x:16,y:14});
  e.status(u,'slow',5,.25);e.status(u,'attackHaste',5,.5);e._fire(u,target);
  close(e.state.projectiles[0].recovery,.8/1.5/.75*.2);e.status(u,'silence',5);
  for(let i=0;i<100&&e.state.projectiles.length;i++)e._projectiles(1/60);
  close(target.hp,968);assert.equal(u.memory.returningShotId,undefined);
});

test('Avalith cannot avoid damage or launch its returning ability while silenced',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('avalith'),target=dummy(1,{x:16,y:14});e.random=()=>0;
  e.status(u,'silence',3);close(e.damage(null,u,50,{kind:'spell'}).total,50);e._fire(u,target);
  assert.equal(e.state.projectiles[0].returning,undefined);assert.equal(u.memory.returningShotId,undefined);close(u.cooldown,2.1);
});

test('Avalith has an exact thirty-three-percent incoming-damage avoidance boundary',async()=>{
  const {e,spawn}=await fixture(),u=spawn('avalith');e.random=()=>.329;
  close(e.damage(null,u,100,{kind:'spell',instantKill:true}).total,0);close(u.hp,240);
  e.random=()=>.33;close(e.damage(null,u,100,{kind:'spell'}).total,100);close(u.hp,140);
});

test('Avalith flight freezes on pause and clears its attack lock on caster death or timeout',async()=>{
  const {e,spawn,dummy,kill}=await fixture(),u=spawn('avalith'),target=dummy(1,{x:17,y:14});e._fire(u,target);e.step(.1);e.setPaused(true);
  const before=JSON.stringify(e.state);e.step(20);assert.equal(JSON.stringify(e.state),before);e.setPaused(false);e.random=()=>.99;kill(u);e.step(.1);
  assert.equal(e.state.projectiles.length,0);assert.equal(u.memory.returningShotId,undefined);
  const next=spawn('avalith');e._fire(next,target);e.state.projectiles[0].ttl=.01;e._projectiles(.1);
  assert.equal(e.state.projectiles.length,0);assert.equal(next.memory.returningShotId,undefined);assert.ok(next.cooldown>0);
});

test('Malvaris marks a successful hit for two seconds, refreshes it, and any killer can raise its Phantomis',async()=>{
  const {e,spawn,dummy,hit,kill,has}=await fixture(),u=spawn('malvaris'),target=dummy();hit(u,target);
  assert.ok(has(target,'soulMark'));close(target.statuses.find(s=>s.kind==='soulMark').until,2);
  e.step(1.5);hit(u,target);assert.equal(target.statuses.filter(s=>s.kind==='soulMark').length,1);
  close(target.statuses.find(s=>s.kind==='soulMark').until,3.5);e.step(1);kill(target);
  const child=e.units.filter(t=>t.def.id==='malvaris/phantomis');assert.equal(child.length,1);
  assert.equal(child[0].side,u.side);assert.equal(child[0].groupId,u.groupId);assert.equal(child[0].lane,target.lane);close(child[0].maxHp,60);
  e.deaths.push({u:target,killer:null});e._drainDeaths();assert.equal(e.units.filter(t=>t.def.id==='malvaris/phantomis').length,1);
});

test('Malvaris killing blows can mark before queued death, without accepting other statuses on dead units',async()=>{
  const {e,spawn,dummy,hit}=await fixture(),u=spawn('malvaris'),target=dummy(1,{x:16,y:14},{health:10});hit(u,target);
  assert.equal(target.alive,false);assert.ok(target.statuses.some(s=>s.kind==='soulMark'));
  assert.equal(e.status(target,'burn',2,0,u,{onLethalHit:true,amount:8}),null);e._drainDeaths();
  assert.equal(e.units.filter(t=>t.def.id==='malvaris/phantomis').length,1);
  assert.equal(e.status(target,'soulMark',2,0,u,{onLethalHit:true}),null,'a resolved death cannot be marked again');
});

test('expired, cleansed or immune Soul Marks do not summon and buildings cannot be converted',async()=>{
  for(const mode of ['expired','cleanse','predominance','building','castle']){
    const {e,spawn,dummy,hit,kill}=await fixture(),u=spawn('malvaris'),target=mode==='castle'?e.castles[1]:dummy();
    if(mode==='building')target.isBuilding=true;if(mode==='predominance')e.status(target,'predominance',5);
    hit(u,target);if(mode==='expired')e.step(2);if(mode==='cleanse')e.cleanse(target);
    kill(target);assert.equal(e.units.some(t=>t.def.id==='malvaris/phantomis'),false,mode);
  }
});

test('Soul Mark respects Flexibility, and a prevented or missed hit applies no mark',async()=>{
  const {e,spawn,dummy,hit}=await fixture(),u=spawn('malvaris'),target=dummy(1,{x:15.6,y:14},{flexibility:50});hit(u,target);
  close(target.statuses.find(s=>s.kind==='soulMark').until,1);e.cleanse(target);e.status(target,'untouchable',2);hit(u,target);
  assert.equal(target.statuses.some(s=>s.kind==='soulMark'),false);target.statuses=[];
  e.status(u,'misfortune',2,1);e._fire(u,target);assert.equal(target.statuses.some(s=>s.kind==='soulMark'),false);
});

test('an existing Soul Mark survives caster death or Silence without holding dead caster objects forever',async()=>{
  for(const mode of ['dead','silenced']){
    const {e,spawn,dummy,hit,kill}=await fixture(),u=spawn('malvaris'),target=dummy();hit(u,target);
    if(mode==='dead')kill(u);else e.status(u,'silence',5);
    if(mode==='dead')assert.ok(e.statusSources.has(u.id),'the pending mark retains its dead caster');
    e.step(.5);kill(target);assert.equal(e.units.filter(t=>t.def.id==='malvaris/phantomis').length,1,mode);
    e.step(.1);assert.equal(e.statusSources.has(u.id),false);
  }
});

test('each caster mark resolves once even when two Malvaris mark the same victim',async()=>{
  const {e,spawn,dummy,hit,kill}=await fixture(),a=spawn('malvaris'),b=spawn('malvaris',0,{x:13,y:14}),target=dummy();
  hit(a,target);hit(b,target);kill(target);
  const children=e.units.filter(t=>t.def.id==='malvaris/phantomis');assert.equal(children.length,2);
  assert.deepEqual(new Set(children.map(t=>t.groupId)),new Set([a.groupId,b.groupId]));
});

test('Malvaris caps the additional critical chance at seventy-five for eighty total with its five base',async()=>{
  const {e,spawn,dummy,kill}=await fixture(),u=spawn('malvaris',0,{x:15,y:14},{criticalChance:5});kill(dummy(1));close(u.stats.criticalChance,5);
  kill(dummy(0,{x:12,y:14}));close(u.stats.criticalChance,5.5);
  for(let i=0;i<160;i++)kill(dummy(0,{x:12,y:14}));close(u.memory.criticalGrowth,75);close(u.stats.criticalChance,80);close(u.def.stats.criticalChance,5);
});

test('Silence prevents fresh Malvaris marks and allied death bonuses',async()=>{
  const {e,spawn,dummy,kill}=await fixture(),u=spawn('malvaris'),target=dummy(1,{x:15.6,y:14});e.status(u,'silence',5);
  e._fire(u,target);assert.equal(target.statuses.some(s=>s.kind==='soulMark'),false);kill(dummy(0,{x:12,y:14}));close(u.stats.criticalChance,0);
  e.cleanse(u);kill(dummy(0,{x:12,y:14}));close(u.stats.criticalChance,.5);
});

test('Phantomis bonuses add across allied groups and update when an ally dies',async()=>{
  const {e,spawn,dummy,kill}=await fixture(),a=spawn('malvaris/phantomis'),b=spawn('malvaris/phantomis',0,{x:24,y:14}),c=spawn('malvaris/phantomis',0,{x:11,y:14}),enemy=spawn('malvaris/phantomis',1,{x:30,y:14}),target=dummy(1,{x:15.6,y:14});
  e.step(1/30);for(const u of [a,b,c]){close(u.stats.damage,12);close(u.stats.attackSpeed,1.5/1.1);}close(enemy.stats.damage,10);
  e._fire(a,target);close(target.hp,988);close(a.cooldown,1.5/1.1);a.cooldown=Infinity;
  kill(c);e.step(1/30);for(const u of [a,b]){close(u.stats.damage,11);close(u.stats.attackSpeed,1.5/1.05);}close(a.def.stats.damage,10);
  const far=spawn('far',1,{x:24.6,y:14});e.banish(far,b);e.step(1/30);close(a.stats.damage,10);
});

test('Sylviana takes twenty percent less damage from Aliens and creates four flying Butterflies on death',async()=>{
  const {e,spawn,dummy,kill}=await fixture(),u=spawn('sylviana'),alien=dummy();alien.def.type=['Alien'];
  close(e.damage(alien,u,50,{kind:'attack'}).total,40);close(u.hp,108);close(u.shield,12);
  alien.def.type=['Human'];close(e.damage(alien,u,50,{kind:'spell',bypassShield:true}).total,50);
  kill(u);const children=e.units.filter(t=>t.def.id==='sylviana/butterflies');assert.equal(children.length,4);
  assert.ok(children.every(t=>t.side===u.side&&t.groupId===u.groupId&&t.lane===u.lane&&t.def.combat.movementType==='flying'&&t.shots===0));
});

test('Butterflies increase current and maximum Health by ten for friends inside a one-and-a-half tile square',async()=>{
  const {e,spawn,dummy,kill}=await fixture(),u=spawn('sylviana/butterflies'),full=dummy(0,{x:15.4,y:14},{health:100,shield:30}),hurt=dummy(0,{x:15.5,y:14},{health:100}),corner=dummy(0),outside=dummy(0),enemy=dummy(1,{x:15.2,y:14});hurt.hp=70;
  Object.assign(corner,{x:15.75,y:14.75,radius:0});Object.assign(outside,{x:15.7501,y:14,radius:0});
  kill(u);close(full.maxHp,110);close(full.hp,110);close(full.shield,30);close(hurt.maxHp,110);close(hurt.hp,80);
  close(corner.maxHp,1010);close(outside.maxHp,1000);close(enemy.maxHp,1000);close(e.castles[0].maxHp,1000);
  const bloom=e.state.effects.find(f=>f.type==='healthBloom');assert.equal(bloom.width,1.5);assert.equal(bloom.height,1.5);
});

test('simultaneous Butterfly deaths stack their gifts on survivors without reviving the dead',async()=>{
  const {e,catalog,dummy}=await fixture(),ally=dummy(0,{x:15.6,y:14}),butterflies=e.spawn(catalog.byId.get('sylviana/butterflies'),0,{x:15,y:14},1,{count:4});
  for(const u of butterflies)e.damage(null,u,1000,{kind:'spell',bypassShield:true});e._drainDeaths();
  close(ally.maxHp,1040);close(ally.hp,1040);assert.ok(butterflies.every(u=>!u.alive&&u.hp===0&&u.maxHp===30));
});

test('native Soul Mark clocks and summon state freeze with pause',async()=>{
  const {e,spawn,dummy,hit,kill}=await fixture(),u=spawn('malvaris'),target=dummy();hit(u,target);e.step(1);e.setPaused(true);
  const before=JSON.stringify(e.state);e.step(30);assert.equal(JSON.stringify(e.state),before);e.setPaused(false);kill(target);
  assert.equal(e.units.filter(t=>t.def.id==='malvaris/phantomis').length,1);
});

test('Pyhsic deals fifty damage at twenty-two seconds and follows the exact execution probability',async()=>{
  for(const [health,roll,dead] of [[200,.399,true],[200,.4,false],[800,.999,true],[1000,.999,true]]){
    const {e,spawn,dummy}=await fixture(),u=spawn('pyhsic'),target=dummy(1,{x:21,y:14},{health});e.random=()=>roll;
    e.step(21.9);close(target.hp,health);e.step(.1);
    assert.equal(target.alive,!dead,`${health} at ${roll}`);close(target.hp,dead?0:health-50);close(u.memory.executionClock,0);
  }
});

test('Pyhsic selects a visible frontal unit within seven-and-a-half tiles and excludes structures',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('pyhsic',0,{x:15,y:14},{range:0}),back=dummy(1,{x:14,y:14}),hidden=dummy(1,{x:16,y:14}),building=dummy(1,{x:17,y:14}),legal=dummy(1,{x:22.5,y:14}),far=dummy(1,{x:24,y:14});
  building.isBuilding=true;e.status(hidden,'invisible',30);e.random=()=>.999;e.step(22);
  assert.equal(legal.alive,false);for(const t of [back,hidden,building,far])close(t.hp,1000);assert.equal(u.hits,0);
});

test('Pyhsic executions respect immunity, Immortal and reduction while Silence prevents the cast',async()=>{
  for(const mode of ['untouchable','immortal','reduction','silence']){
    const {e,spawn,dummy}=await fixture(),u=spawn('pyhsic'),t=dummy(1,{x:20,y:14},{health:800,shield:100,damageminimiser:90});e.random=()=>.9;
    if(mode==='silence')e.status(u,'silence',30);else if(mode!=='reduction')e.status(t,mode,30);
    e.step(22);if(mode==='untouchable'||mode==='silence'){close(t.hp,800);close(t.shield,100);}
    else if(mode==='immortal'){assert.ok(t.alive);close(t.hp,1);}else assert.equal(t.alive,false);
  }
});

test('Unara spends one hundred of twelve nine-charge hits and distributes exactly thirty two-damage orbs',async()=>{
  const {e,spawn,dummy,hit}=await fixture(),u=spawn('unara'),targets=[16,16.5,17].map(x=>dummy(1,{x,y:14}));
  for(let i=0;i<11;i++)hit(u,targets[0]);assert.equal(u.memory.charge,99);assert.equal(u.memory.orbRemaining,undefined);
  hit(u,targets[0]);assert.equal(u.memory.charge,8);assert.equal(u.memory.orbRemaining,30);for(const t of targets)t.hp=1000;
  assert.deepEqual(targets.map(t=>t.x),[18,18.5,19]);const launched=[],launch=e.abilityProjectile.bind(e);
  e.abilityProjectile=(s,t,d,o)=>{launched.push({id:t.id,time:e.time,damage:d});return launch(s,t,d,o);};
  e.step(3.6);assert.equal(launched.length,30);for(let i=0;i<30;i++){assert.equal(launched[i].id,targets[i%3].id);close(launched[i].damage,2);if(i)close(launched[i].time-launched[i-1].time,.1);}
  for(const t of targets)close(t.hp,980);assert.equal(u.hits,12);assert.equal(u.memory.charge,8);assert.equal(u.memory.orbRemaining,0);assert.equal(e.state.projectiles.length,0);
});

test('Unara ability orbs do not reroll accuracy on impact or hit an intervening opponent',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('unara'),blocker=dummy(1,{x:16,y:14}),target=dummy(1,{x:18,y:14});e.status(u,'misfortune',10,.5);e.random=()=>.9;
  assert.equal(e.abilityProjectile(u,target,2,{range:4.1}),true);e.random=()=>.1;e._projectiles(1);
  close(target.hp,998);close(blocker.hp,1000);assert.equal(u.hits,0);assert.equal(u.memory.charge,undefined);
});

test('Unara removes dead or hidden targets from its queue and cancels if no valid targets remain',async()=>{
  const {e,spawn,dummy,hit,kill}=await fixture(),u=spawn('unara'),a=dummy(1,{x:16,y:14}),b=dummy(1,{x:17,y:14});
  for(let i=0;i<12;i++)hit(u,a);e.step(.5);e.status(a,'invisible',10);const launches=[],launch=e.abilityProjectile.bind(e);
  e.abilityProjectile=(s,t,d,o)=>{launches.push(t.id);return launch(s,t,d,o);};e.step(.5);assert.ok(launches.length>0&&launches.every(id=>id===b.id));
  kill(b);e.step(.2);assert.equal(u.memory.orbRemaining,0);assert.deepEqual(u.memory.orbTargets,[]);
});

test('Clara Taunt redirects Unara orbs and expires without replacing targets inside existing projectiles',async()=>{
  const {e,spawn,dummy,hit}=await fixture(),u=spawn('unara'),enemy=dummy(1,{x:16,y:14}),taunter=spawn('clara',1,{x:16.8,y:14});
  for(let i=0;i<12;i++)hit(u,enemy);e.status(taunter,'taunt',1,0,taunter,{radius:5});const launches=[],launch=e.abilityProjectile.bind(e);
  e.abilityProjectile=(s,t,d,o)=>{launches.push(t.id);return launch(s,t,d,o);};e.step(.5);
  assert.ok(launches.length===5&&launches.every(id=>id===taunter.id));assert.equal(e.tauntTarget(u),taunter);
  e.cleanse(u);launches.length=0;e.step(.3);assert.ok(launches.includes(enemy.id));
});

test('Clara gains twenty charge per nearby enemy per second and forces attacks toward herself',async()=>{
  const {e,spawn,dummy,has}=await fixture(),u=spawn('clara'),other=dummy(0,{x:15.4,y:14}),enemy=dummy(1,{x:15.8,y:14},{range:5000});
  enemy.burstTargetId=other.id;enemy.burstIndex=2;e.step(4.9);assert.equal(has(enemy,'taunted'),false);e.step(.1);
  assert.ok(has(u,'taunt'));assert.ok(has(enemy,'taunted'));assert.equal(e._target(enemy),u);assert.equal(enemy.burstTargetId,null);
  close(enemy.statuses.find(s=>s.kind==='taunted').until,e.time+7);assert.equal(has(u,'regen'),true);
});

test('Clara heals exactly twenty-eight quarter-second ticks during one seven-second activation',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('clara'),enemy=dummy(1,{x:15.8,y:14});e.step(5);enemy.x=20;u.hp=100;
  e.step(.24);close(u.hp,100);e.step(.03);close(u.hp,103);e.step(6.73);close(u.hp,184);
  assert.equal(u.statuses.some(s=>s.kind==='regen'),false);e.step(.5);close(u.hp,184);
});

test('Clara Taunt affects flying enemies, respects Predominance and refreshes both old and new victims',async()=>{
  const {e,spawn,dummy,has}=await fixture(),u=spawn('clara'),flyer=dummy(1,{x:15.8,y:14});flyer.def.combat.movementType='flying';
  assert.equal(e.canTarget(u,flyer),false);e.step(5);assert.ok(has(flyer,'taunted'));assert.equal(e.tauntTarget(flyer),u);
  const fresh=dummy(1,{x:15.7,y:14}),immune=dummy(1,{x:15.6,y:14});e.status(immune,'predominance',20);e.step(1);
  u.memory.charge=100;e._hook('tick',u,0);assert.ok(has(fresh,'taunted'));assert.equal(has(immune,'taunted'),false);
  close(flyer.statuses.find(s=>s.kind==='taunted').until,e.time+7);assert.equal(u.statuses.filter(s=>s.kind==='regen').length,1);
});

test('Clara healing respects Bleeding, while Silence and pause freeze new charge and orbital timers',async()=>{
  const {e,spawn,dummy,hit}=await fixture(),u=spawn('clara'),enemy=dummy(1,{x:15.8,y:14});e.step(5);enemy.x=21;u.hp=100;
  e.status(u,'bleed',1);e.step(.27);close(u.hp,100);e.cleanse(u);e.step(.25);close(u.hp,103);
  const mage=spawn('unara'),target=dummy(1,{x:16,y:14});for(let i=0;i<12;i++)hit(mage,target);e.status(mage,'silence',10);
  e.step(.5);assert.equal(mage.memory.orbRemaining,30);e.cleanse(mage);e.setPaused(true);const before=JSON.stringify(e.state);e.step(30);assert.equal(JSON.stringify(e.state),before);
  e.setPaused(false);e.step(.1);assert.equal(mage.memory.orbRemaining,29);
});

test('Far banishes on eight percent of real hits and returns a victim after ten seconds with twelve-percent damage',async()=>{
  const {e,spawn,dummy,hit}=await fixture(),u=spawn('far'),target=dummy();e.random=()=>.079;hit(u,target);
  assert.equal(target.banished,true);assert.equal(e.canTarget(u,target),false);close(e.damage(null,target,50,{kind:'spell'}).total,0);
  close(e.heal(target,50),0);close(target.hp,992);e.step(9.9);assert.ok(target.banished);e.step(.1);
  assert.equal(target.banished,undefined);close(target.hp,872);assert.ok(Math.hypot(target.x-18,target.y-14)>.6);assert.ok([0,1,2].includes(target.lane));
  const {isWalkable}=await import('../arena/js/map.mjs');assert.ok(isWalkable(target));
});

test('banished cards cannot scout, contest pumps, collide or be seen by either team',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('far',1,{x:22.2,y:14}),target=dummy(0,{x:21.5,y:14});
  const {isEntityVisible,isPointVisible}=await import('../arena/js/vision.mjs');assert.equal(isPointVisible(e.state,0,target),true);
  e.banish(u,target);assert.equal(isEntityVisible(e.state,0,target),false);assert.equal(isEntityVisible(e.state,1,target),false);assert.equal(isPointVisible(e.state,0,target),false);
  assert.equal(e.near(e.state.nodes[1],1.25).includes(target),false);e._objectives(6);assert.equal(e.state.nodes[1].owner,1);
  assert.equal(e.status(target,'poison',3,0,u,{amount:8}),null);assert.equal(e.giveShield(target,10),0);
});

test('Far return respects Flexibility, can survive the caster death and can be cleansed without the exit penalty',async()=>{
  for(const mode of ['flexibility','dead','cleanse']){
    const {e,spawn,dummy,kill}=await fixture(),u=spawn('far'),target=dummy(1,{x:18,y:14},mode==='flexibility'?{flexibility:50}:{});e.random=()=>.4;
    e.banish(u,target);if(mode==='dead')kill(u);
    if(mode==='cleanse'){e.cleanse(target);close(target.hp,1000);}else{e.step(mode==='flexibility'?5:10);close(target.hp,880);}
    assert.equal(target.banished,undefined,mode);assert.ok(Math.hypot(target.x-18,target.y-14)>.6);
  }
});

test('Far honors its chance boundary, immunity, pause, deterministic return placement and normal shields',async()=>{
  const {e,spawn,dummy,hit}=await fixture(),u=spawn('far'),target=dummy(1,{x:18,y:14},{shield:100});e.random=()=>.08;hit(u,target);assert.equal(target.banished,undefined);
  e.status(target,'predominance',20);assert.equal(e.banish(u,target),false);target.statuses=[];e.random=()=>0;e.banish(u,target);target.hp=1000;target.shield=100;
  e.step(5);e.setPaused(true);const before=JSON.stringify(e.state);e.step(20);assert.equal(JSON.stringify(e.state),before);e.setPaused(false);e.step(5);
  close(target.hp,964);close(target.shield,16);assert.equal(target.banished,undefined);assert.ok(Math.hypot(target.x-18,target.y-14)>.6);
});

test('Lyra repeats two single attacks and one three-hit burst with the authored timing',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('lyra'),target=dummy(1,{x:15.6,y:14}),times=[],fire=e._fire.bind(e);u.cooldown=0;
  e._fire=(source,t)=>{if(source===u)times.push(e.time);return fire(source,t);};e.step(3);
  close(target.hp,975);assert.equal(u.shots,5);assert.equal(u.attacks,3);assert.equal(u.sequenceIndex,3);
  for(const [i,offset] of [0,1.1,2.2,2.4,2.6].entries())close(times[i]-times[0],offset);
  e.step(.8);close(times[5]-times[0],3.7);close(u.def.stats.attackSpeed,.2);close(u.def.stats.delay,.9);assert.equal(u.def.stats.sps,7);
});

test('Lyra missing-health bonuses are additive, capped and removed by healing without doubling damage',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('lyra'),target=dummy(1,{x:15.6,y:14});u.hp=135;e._hook('tick',u,0);close(u.stats.damage,5.4);
  e._fire(u,target);close(target.hp,994.6);close(u.cooldown,.2/1.08+.9);
  u.hp=75;e._hook('tick',u,0);e._fire(u,target);close(target.hp,987.6);close(u.stats.attackSpeed,.2/1.4);
  u.hp=1;e._hook('tick',u,0);close(u.stats.damage,7);e.heal(u,150);e._hook('tick',u,0);close(u.stats.damage,5);close(u.stats.attackSpeed,.2);
});

test('Lyra advances the attack cycle when its locked burst target dies',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('lyra'),first=dummy(1,{x:15.6,y:14},{health:5});u.sequenceIndex=2;e._fire(u,first);e._drainDeaths();
  const next=dummy(1,{x:15.6,y:14});assert.equal(e._target(u),next);assert.equal(u.sequenceIndex,3);assert.equal(e._attackDefinition(u).count,1);close(u.cooldown,.9);
});

test('Naar launches twenty four-damage grenades over ten seconds with the requested square footprint',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('naar'),a=dummy(1,{x:18,y:14}),b=dummy(1,{x:18.5,y:14}),shots=[],launch=e.abilityProjectile.bind(e);u.hp=67;
  e.abilityProjectile=(source,t,damage,options)=>{shots.push({time:e.time,damage,options});return launch(source,t,damage,options);};
  e.step(10.6);assert.equal(shots.length,20);for(const shot of shots){assert.equal(shot.damage,4);assert.equal(shot.options.impactSize,'1.25 × 1.25 tiles');assert.deepEqual(shot.options.deathBlast,{size:2.5,damage:40});}
  for(let i=1;i<20;i++)close(shots[i].time-shots[i-1].time,.5);close(a.hp,920);close(b.hp,920);assert.equal(u.memory.naarCasts,1);
  e.step(5);assert.equal(shots.length,20,'remaining below the threshold does not retrigger the ultimate');
});

test('Naar rearms only after recovering to forty percent and is capped at three activations',async()=>{
  const {e,spawn}=await fixture(),u=spawn('naar');u.hp=68;e._hook('tick',u,0);assert.equal(u.memory.naarCasts,undefined);
  e.damage(null,u,.1,{kind:'spell',bypassShield:true});assert.equal(u.memory.naarCasts,1);
  for(let i=0;i<4;i++){e.heal(u,1000);e.damage(null,u,103,{kind:'spell',bypassShield:true});}
  assert.equal(u.memory.naarCasts,3);assert.equal(u.memory.grenadeBursts.length,3);
  const dead=spawn('naar');e.damage(null,dead,1000,{kind:'spell',bypassShield:true});assert.equal(dead.memory.naarCasts,undefined);
});

test('Naar grenade kills chain forty-damage square explosions once per victim without damaging allies or structures',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('naar'),a=dummy(1,{x:18,y:14},{health:4}),b=dummy(1,{x:19.2,y:14},{health:35}),c=dummy(1,{x:20.4,y:14}),friend=dummy(0,{x:18.2,y:14}),building=dummy(1,{x:19,y:14});building.isBuilding=true;
  e.abilityProjectile(u,a,4,{range:6,kind:'grenade',impactSize:'1.25 × 1.25 tiles',deathBlast:{size:2.5,damage:40},cardOnly:true});e._projectiles(1);e._drainDeaths();
  assert.equal(a.alive,false);assert.equal(b.alive,false);close(c.hp,960);close(friend.hp,1000);close(building.hp,1000);
  e.deaths.push({u:b,killer:u,deathBlast:{size:2.5,damage:40}});e._drainDeaths();close(c.hp,960);
  assert.equal(e.state.effects.filter(f=>f.type==='blastArea'&&f.width===2.5).length,2);
});

test('Naar basic attacks preserve the original one-tile blast and do not trigger the ultimate death chain',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('naar'),a=dummy(1,{x:18,y:14},{health:4}),b=dummy(1,{x:19.2,y:14});e._fire(u,a);e._projectiles(1);e._drainDeaths();
  assert.equal(a.alive,false);close(b.hp,1000);assert.equal(u.def.combat.impactSize,'1 × 1 tiles');assert.equal(e.state.effects.some(f=>f.type==='blastArea'),false);
});

test('Naar burst timers and Lyra attacks freeze during pause, while Silence pauses new grenade throws',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('naar');dummy(1,{x:18,y:14});u.hp=67;e.step(.5);assert.equal(u.memory.grenadeBursts[0].remaining,19);
  e.status(u,'silence',2);e.step(1);assert.equal(u.memory.grenadeBursts[0].remaining,19);e.cleanse(u);
  const lyra=spawn('lyra');lyra.cooldown=0;e.setPaused(true);const before=JSON.stringify(e.state);e.step(20);assert.equal(JSON.stringify(e.state),before);
});

test('Etheris combines ninety percent of two bodies and one ally into one health/shield reserve',async()=>{
  const {e,catalog,dummy}=await fixture();
  const pair=e.spawn(catalog.byId.get('etheris'),0,{x:15,y:14},1),friend=dummy(0,{x:15.5,y:14}),other=dummy(0,{x:15.7,y:14});
  pair.forEach(u=>{u.stats.speed=0;u.cooldown=Infinity;});e._hook('tick',pair[0],0);
  const members=[...pair,friend];
  assert.equal(e.state.sharedVitals.length,1);assert.equal(e.state.sharedVitals[0].members.length,3);
  for(const u of members){close(u.hp,1116);close(e.maxHealth(u),1116);close(u.shield,108);}
  close(other.hp,1000);assert.equal(other.sharedVitalsId,undefined);
  const result=e.damage(null,pair[0],50,{kind:'spell'});close(result.total,50);
  for(const u of members){close(u.hp,1101);close(u.shield,73);}
  close(e.heal(friend,10),10);members.forEach(u=>close(u.hp,1111));
  e.giveShield(pair[1],5);members.forEach(u=>close(u.shield,78));
  // Repeated ticking never compounds the ninety-percent conversion.
  e._hook('tick',pair[1],0);members.forEach(u=>close(e.maxHealth(u),1116));
  assert.doesNotThrow(()=>JSON.stringify(e.state));
  const death=e.damage(null,friend,5000,{kind:'spell',bypassShield:true});assert.equal(death.killed,true);
  assert.ok(members.every(u=>!u.alive&&u.hp===0));assert.equal(e.deaths.length,3);
  e._drainDeaths();assert.equal(e.state.events.filter(x=>x.type==='death').length,3);assert.equal(e.vitalPools.size,0);assert.ok(other.alive);
});

test('Etheris can recruit a later nearby ally, shares healing and respects linked Immortal',async()=>{
  const {e,catalog,dummy}=await fixture(),pair=e.spawn(catalog.byId.get('etheris'),0,{x:15,y:14},1);
  e._hook('tick',pair[0],0);close(pair[0].hp,216);const friend=dummy(0,{x:17,y:14});
  e._hook('tick',pair[1],0);assert.equal(friend.sharedVitalsId,undefined);
  friend.x=15.4;e._hook('tick',pair[1],0);close(friend.hp,1116);
  e.status(friend,'immortal',2);e.damage(null,pair[0],5000,{kind:'spell',bypassShield:true});
  for(const u of [...pair,friend]){assert.equal(u.alive,true);close(u.hp,1);}
  e.cleanse(friend);friend.statuses=[];e.loseHealth(pair[1],1);assert.ok([...pair,friend].every(u=>!u.alive));
});

test('Format uses the actual website Power score rather than current health or damage and waits three active seconds',async()=>{
  const {e,catalog,spawn,dummy}=await fixture(),u=spawn('format'),weak=dummy(1,{x:16,y:14},{health:50000,damage:5000});weak.def.power=100;
  const strong=spawn('death',1,{x:18,y:14});strong.def.power=900;strong.hp=1;strong.shield=0;
  const before=JSON.stringify(catalog.byId.get('death'));
  e.step(1);assert.equal(u.memory.format.targetId,strong.id);assert.equal(u.def.id,'format');assert.equal(u.shots,0);assert.equal(e.state.projectiles.length,0);
  e.setPaused(true);e.step(10);assert.equal(u.def.id,'format');e.setPaused(false);
  e.step(1.9);assert.equal(u.def.id,'format');e.step(.1);assert.equal(u.def.id,'death');
  close(u.hp,strong.maxHp);close(u.shield,strong.maxShield);assert.equal(u.memory.format.transformed,true);assert.equal(u.shots,0);
  assert.equal(JSON.stringify(catalog.byId.get('death')),before);
});

test('Format channel ignores hidden, behind and out-of-reach enemies; losing its target restarts the channel',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('format'),hidden=dummy(1,{x:16,y:14}),behind=dummy(1,{x:14,y:14}),far=dummy(1,{x:31,y:14});
  hidden.def.power=1000;e.status(hidden,'invisible',20);behind.def.power=999;far.def.power=998;
  e.step(1);assert.equal(u.memory.format.targetId,null);
  const first=spawn('soldier',1,{x:18,y:14});e.step(2);assert.equal(u.memory.format.targetId,first.id);
  first.x=35;const next=spawn('phewphew',1,{x:18,y:14});e.step(1.1);assert.equal(u.def.id,'format');assert.equal(u.memory.format.targetId,next.id);
  e.step(1.9);assert.equal(u.def.id,'phewphew');assert.equal(u.def.combat.attackType,'ranged');close(u.stats.damage,next.stats.damage);
});

test('Format doubles its refreshed copied statistics only when it kills the original target',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('format'),target=spawn('soldier',1,{x:18,y:14});
  target.stats.damage=9;target.hp=5;target.shield=0;
  e._hook('tick',u,3);assert.equal(u.def.id,'soldier');close(u.stats.damage,9);close(u.hp,target.maxHp);
  const copied={...u.stats};const other=dummy();e.damage(u,other,5000,{kind:'ability',bypassShield:true});assert.equal(u.memory.format.promoted,false);
  u.hp=1;e.damage(u,target,5000,{kind:'ability',bypassShield:true});assert.equal(u.memory.format.promoted,true);
  close(u.stats.damage,18);close(u.stats.health,copied.health*2);close(u.hp,copied.health*2);close(u.stats.attackSpeed,copied.attackSpeed/2);close(u.stats.delay,copied.delay/2);
  close(u.stats.range,copied.range*2);close(u.stats.speed,copied.speed*2);close(u.stats.vision,copied.vision*2);
  e._promoteFormat(u,target);close(u.stats.damage,18);e._drainDeaths();assert.ok(u.alive);
});

test('Format does not promote when another ally kills its original enemy, and Silence suspends transformation',async()=>{
  const {e,spawn,kill}=await fixture(),u=spawn('format'),target=spawn('phewphew',1,{x:18,y:14});
  e.status(u,'silence',3);e.step(2);assert.equal(u.memory.format,undefined);e.cleanse(u);
  e._hook('tick',u,3);assert.equal(u.def.id,'phewphew');kill(target);assert.equal(u.memory.format.promoted,false);
});

test('Artist applies one persistent ink per damaging hit: three-percent increments, twenty-one threshold and ten charge',async()=>{
  const {e,spawn,dummy,hit,has}=await fixture(),u=spawn('artist'),target=dummy();
  hit(u,target,1);const ink=target.statuses.find(s=>s.kind==='ink');assert.equal(ink.stacks,1);close(ink.magnitude,.03);assert.equal(ink.until,Infinity);
  close(e.attackInterval(target),target.stats.attackSpeed/.97);
  for(let i=1;i<20;i++)hit(u,target,1);assert.equal(ink.stacks,20);assert.equal(has(target,'curse'),false);assert.equal(u.memory.artistCharge,undefined);
  hit(u,target,1);assert.equal(ink.stacks,21);close(ink.magnitude,.63);assert.equal(has(target,'curse'),true);assert.equal(u.memory.artistCharge,10);
  hit(u,target,1);assert.equal(u.memory.artistCharge,10);close(target.hp,977.75);
  e.damage(null,target,40,{kind:'spell'});close(target.hp,927.75);
  e.cleanse(target);assert.equal(has(target,'ink'),false);assert.equal(has(target,'curse'),false);hit(u,target,1);assert.equal(target.statuses.find(s=>s.kind==='ink').stacks,1);
});

test('Artist ink slows movement and attacks by its own authored increments, unaffected by generic minimum Slow',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('artist'),target=dummy(1,{x:20,y:14},{speed:1000,attackSpeed:1});
  e.addInk(u,target);const before=target.x;e._move(target,null,1);close(before-target.x,.97);close(e.attackInterval(target),1/.97);
  e.addInk(u,target,20);close(e.attackInterval(target),1/.37);
  e.status(target,'slow',2,.75);close(e.attackInterval(target),4);
});

test('Artist ignores missed, immune and non-damaging hits and Predominance prevents ink and Curse',async()=>{
  const {e,spawn,dummy,hit,has}=await fixture(),u=spawn('artist'),target=dummy();
  e.status(target,'untouchable',2);hit(u,target,1);assert.equal(has(target,'ink'),false);target.statuses=[];
  e.status(target,'predominance',2);for(let i=0;i<21;i++)hit(u,target,1);assert.equal(has(target,'ink'),false);assert.equal(has(target,'curse'),false);assert.equal(u.memory.artistCharge,undefined);
  target.statuses=[];e.status(u,'misfortune',2,1);e._fire(u,target);assert.equal(e.state.projectiles.length,0);assert.equal(has(target,'ink'),false);
});

test('cursed death spreads four ink to every enemy within a two-by-two square, including after Artist death',async()=>{
  const {e,spawn,dummy,kill}=await fixture(),u=spawn('artist'),target=dummy(),inside=dummy(1,{x:18.9,y:14.9}),outside=dummy(1,{x:19.5,y:14}),ally=dummy(0,{x:18.2,y:14});
  e.addInk(u,target,21);kill(u);kill(target);
  assert.equal(inside.statuses.find(s=>s.kind==='ink').stacks,4);assert.equal(outside.statuses.length,0);assert.equal(ally.statuses.length,0);
  assert.equal(e.units.filter(t=>t.def.id==='artist/flock-of-ravens').length,6);
});

test('a lethal twenty-first Artist hit still curses and spreads; spread can trigger another Curse without recursion',async()=>{
  const {e,spawn,dummy,hit}=await fixture(),u=spawn('artist'),target=dummy(),next=dummy(1,{x:18.5,y:14});
  e.addInk(u,target,20);e.addInk(u,next,17);target.hp=1;hit(u,target,1);e._drainDeaths();
  assert.equal(next.statuses.find(s=>s.kind==='ink').stacks,21);assert.equal(u.memory.artistCharge,20);
  close(next.statuses.find(s=>s.kind==='curse').magnitude,.25);
});

test('independent Artists retain their own ink, curses, charge and death spread attribution',async()=>{
  const {e,spawn,dummy,kill}=await fixture(),a=spawn('artist'),b=spawn('artist',0,{x:15.6,y:14}),target=dummy(),next=dummy(1,{x:18.5,y:14});
  e.addInk(a,target,21);e.addInk(b,target,21);assert.equal(target.statuses.filter(s=>s.kind==='ink').length,2);
  assert.equal(a.memory.artistCharge,10);assert.equal(b.memory.artistCharge,10);kill(target);
  assert.equal(next.statuses.filter(s=>s.kind==='ink').length,2);assert.ok(next.statuses.filter(s=>s.kind==='ink').every(s=>s.stacks===4));
});

test('Artist death creates six ravens for seven seconds, gaining two ravens and one second per twenty charge',async()=>{
  for(const [charge,count,life] of [[0,6,7],[10,6,7],[20,8,8],[39,8,8],[40,10,9]]){
    const {e,spawn,kill}=await fixture(),u=spawn('artist');u.memory.artistCharge=charge;kill(u);
    const ravens=e.units.filter(t=>t.def.id==='artist/flock-of-ravens');assert.equal(ravens.length,count);
    assert.ok(ravens.every(raven=>raven.stats.number===count));
    for(const raven of ravens){assert.equal(raven.healthless,true);assert.equal(raven.def.raw.stats.health,'-');assert.equal(raven.def.combat.movementType,'flying');close(raven.expiresAt-e.time,life);close(raven.stats.vision,4000);raven.stats.speed=0;}
    e.setPaused(true);e.step(30);assert.equal(e.units.length,count);e.setPaused(false);e.step(life-.1);assert.equal(e.units.length,count);e.step(.1);assert.equal(e.units.length,0);
  }
});

test('ravens have no health, cannot be targeted or damaged by cards, spells or status effects, but attack and scout',async()=>{
  const {e,spawn,dummy,kill}=await fixture(),artist=spawn('artist');kill(artist);const raven=e.units[0];raven.stats.speed=0;raven.stats.criticalChance=0;raven.stats.lifestealChance=0;
  const enemy=dummy(1,{x:raven.x+.4,y:raven.y});assert.equal(e.canTarget(enemy,raven),false);
  assert.equal(e.canSee(enemy,raven),true);assert.equal(e.damage(enemy,raven,9999,{kind:'spell',instantKill:true}).total,0);assert.equal(e.status(raven,'burn',10,0,enemy,{amount:9999}),null);
  assert.equal(e.heal(raven,100),0);assert.equal(e.giveShield(raven,100),0);assert.equal(e.loseHealth(raven,999),0);assert.equal(raven.alive,true);
  const {visibilitySources,isPointVisible}=await import('../arena/js/vision.mjs');const state={time:e.time,units:[raven],castles:[],nodes:[]};
  assert.equal(visibilitySources(state,0)[0].radius,4);assert.equal(isPointVisible(state,0,{x:raven.x+4,y:raven.y}),true);assert.equal(isPointVisible(state,0,{x:raven.x+4.01,y:raven.y}),false);
  e._fire(raven,enemy);assert.ok(enemy.hp<1000);assert.ok(raven.alive);
});

test('raven liveness never becomes health through allied growth; beneficial combat auras still work',async()=>{
  const {e,spawn}=await fixture(),raven=spawn('artist/flock-of-ravens'),shine=spawn('shine'),cassandra=spawn('cassandra'),butterfly=spawn('sylviana/butterflies'),nitrox=spawn('nitrox');
  e._hook('tick',shine,5);e._hook('tick',cassandra,1);e._hook('death',butterfly);e._hook('tick',nitrox,0);
  close(raven.hp,1);close(raven.maxHp,1);close(raven.stats.health,0);close(raven.shield,0);
  assert.ok(raven.statuses.some(s=>s.kind==='attackHaste'&&s.magnitude===.12));
  const point={x:raven.x,y:raven.y};e.push(raven,{x:14,y:14},3);close(raven.x,point.x);close(raven.y,point.y);
});

test('all Relic root cards now have complete battle data; Magma replaces its old health-loss/burn aura',async()=>{
  const {catalog,e,spawn}=await fixture();assert.equal(catalog.cards.filter(c=>c.rarity==='Relic').length,23);assert.ok(catalog.cards.filter(c=>c.rarity==='Relic').every(c=>c.ready));
  const magma=spawn('magma');e.step(20);close(magma.hp,magma.maxHp);close(magma.shield,magma.maxShield);assert.equal(e.state.trails.length,0);
  assert.equal(magma.def.combat.attackWidth,500);assert.equal(magma.def.combat.trailWidth,1500);
});

test('Magma creates a continuous 1.5-tile ground trail only along its actual voluntary movement',async()=>{
  const {e,spawn}=await fixture(),u=spawn('magma',0,{x:15,y:14},{speed:800});
  e.step(1);assert.ok(u.x>15.7);assert.equal(e.state.trails.length,1);const trail=e.state.trails[0];assert.equal(trail.width,1.5);assert.equal(trail.segments.length,30);
  for(let i=0;i<trail.segments.length;i++){const segment=trail.segments[i];close(segment.until-segment.born,10);if(i)assert.deepEqual(segment.from,trail.segments[i-1].to);}
  const end={x:u.x,y:u.y},count=trail.segments.length;e.status(u,'root',2);e.step(1);close(u.x,end.x);assert.equal(trail.segments.length,count);
  e.cleanse(u);e.status(u,'silence',2);e.step(1);assert.ok(u.x>end.x);assert.equal(trail.segments.length,count);
  e.cleanse(u);u.stats.speed=0;e.push(u,{x:14,y:14},2);e.step(1);assert.equal(trail.segments.length,count);
});

test('a Magma patch deals exactly three damage per second for ten seconds, with no damage afterward',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('magma'),target=dummy(1,{x:15.5,y:14});
  e.leaveTrail(u,{x:15,y:14},{x:16,y:14},{width:1.5,duration:10,damage:3,interval:1});
  e.step(.9);close(target.hp,1000);e.step(.1);close(target.hp,997);e.step(9);close(target.hp,970);
  assert.equal(e.state.trails.length,0);e.step(10);close(target.hp,970);assert.equal(target.statuses.some(s=>s.kind==='burn'),false);
});

test('overlapping pieces of the same Magma trail deal one packet per second; distinct Magmas remain independent',async()=>{
  const {e,spawn,dummy}=await fixture(),a=spawn('magma'),b=spawn('magma'),target=dummy(1,{x:15.5,y:14});
  const params={width:1.5,duration:10,damage:3,interval:1};
  for(let i=0;i<50;i++)e.leaveTrail(a,{x:15,y:14},{x:16,y:14},params);
  e.step(1);close(target.hp,997);e.leaveTrail(b,{x:15,y:14},{x:16,y:14},params);
  // Memory resets during a Format promotion cannot duplicate one caster's field.
  a.memory={};e.leaveTrail(a,{x:15,y:14},{x:16,y:14},params);assert.equal(e.state.trails.length,2);
  e.step(1);close(target.hp,991);
});

test('Magma fire uses the authored footprint, excludes allies and structures, and respects flying/hovering immunity',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('magma'),inside=dummy(1,{x:15.5,y:14}),outside=dummy(1,{x:15.5,y:14}),ally=dummy(0,{x:15.5,y:14}),hover=spawn('cryon',1,{x:15.5,y:14}),flyer=spawn('hornets',1,{x:15.5,y:14}),building=dummy(1,{x:15.5,y:14});
  inside.radius=outside.radius=.1;inside.y=14.84;outside.y=14.86;building.isBuilding=true;const hoverHp=hover.hp,flyerHp=flyer.hp;
  e.leaveTrail(u,{x:15,y:14},{x:16,y:14},{width:1.5,duration:10,damage:3,interval:1});e.step(1);
  close(inside.hp,997);close(outside.hp,1000);close(ally.hp,1000);close(hover.hp,hoverHp);close(flyer.hp,flyerHp);close(building.hp,1000);
});

test('Magma fire persists after caster death or loss of control, retains its owner, and freezes on pause',async()=>{
  const {e,spawn,dummy,kill}=await fixture(),u=spawn('magma'),target=dummy(1,{x:15.5,y:14}),ally=dummy(0,{x:15.5,y:14});
  e.leaveTrail(u,{x:15,y:14},{x:16,y:14},{width:1.5,duration:10,damage:3,interval:1});e.status(u,'imprisonment',5);u.side=1;
  e.step(1);close(target.hp,997);close(ally.hp,1000);e.setPaused(true);e.step(30);close(target.hp,997);close(e.time,1);e.setPaused(false);
  u.statuses=[];kill(u);e.step(9);close(target.hp,970);assert.equal(e.state.trails.length,0);assert.equal(u.alive,false);
});

test('Magma fire starts a new exposure interval after leaving and re-entering, without applying a lingering Burn',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('magma'),target=dummy(1,{x:15.5,y:14});
  e.leaveTrail(u,{x:15,y:14},{x:16,y:14},{width:1.5,duration:10,damage:3,interval:1});e.step(.7);target.x=19;e.step(1);close(target.hp,1000);
  target.x=15.5;e.step(.9);close(target.hp,1000);e.step(.1);close(target.hp,997);target.x=19;e.step(2);close(target.hp,997);
});

test('Fallen Angel chooses highest current Health instead of maximum Health, shields or proximity',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('fallen-angel'),wounded=dummy(1,{x:18,y:14},{health:2000}),chosen=dummy(1,{x:20,y:14},{health:700}),near=dummy(1,{x:15.8,y:14},{health:100,shield:5000});
  wounded.hp=600;e.step(1/30);assert.equal(u.targetId,chosen.id);assert.equal(u.memory.fallenTargetId,chosen.id);assert.notEqual(u.targetId,near.id);
});

test('Fallen Angel acquires only visible grounded opponents ahead within seven-and-a-half tiles',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('fallen-angel'),behind=dummy(1,{x:14,y:14},{health:9000}),far=dummy(1,{x:22.6,y:14},{health:9000}),hidden=dummy(1,{x:18,y:14},{health:9000}),air=spawn('hornets',1,{x:18,y:14},{health:9000}),ground=dummy(1,{x:22.5,y:14},{health:900});
  e.status(hidden,'invisible',5);e.step(1/30);assert.equal(u.targetId,ground.id);assert.equal(u.def.combat.movementType,'hovering');assert.ok([behind,far,hidden,air].every(t=>t.id!==u.targetId));
});

test('Fallen Angel retains its marked target and gains one percent per real hit on that target only, capped at eighty',async()=>{
  const {e,spawn,dummy,hit}=await fixture(),u=spawn('fallen-angel'),chosen=dummy(1,{x:18,y:14},{health:100000}),other=dummy(1,{x:18.3,y:14});
  e.step(1/30);assert.equal(u.targetId,chosen.id);chosen.hp=500;assert.equal(e._target(u),chosen);
  hit(u,other,1);close(u.memory.fallenStacks,0);hit(u,chosen,1);close(u.memory.fallenStacks,1);close(e.attackInterval(u),.8/1.01);
  e.status(chosen,'untouchable',1);hit(u,chosen,1);close(u.memory.fallenStacks,1);chosen.statuses=[];
  for(let i=0;i<100;i++)hit(u,chosen,1);close(u.memory.fallenStacks,80);close(u.stats.attackSpeed,.8/1.8);close(e.attackInterval(u),.8/1.8);
  assert.equal(u.def.stats.attackSpeed,.8);
});

test('Fallen Angel resets stacks on target death, concealment or Taunt and Silence cannot preserve stacks on a changed target',async()=>{
  for(const mode of ['death','invisible','taunt','silence']){
    const {e,spawn,dummy,hit,kill}=await fixture(),u=spawn('fallen-angel'),chosen=dummy(1,{x:18,y:14},{health:2000}),next=dummy(1,{x:17,y:14});
    e.step(1/30);for(let i=0;i<5;i++)hit(u,chosen,1);assert.equal(u.memory.fallenStacks,5);
    if(mode==='death')kill(chosen);
    if(mode==='invisible')e.status(chosen,'invisible',2);
    if(mode==='taunt')e.status(u,'taunted',2,0,next);
    if(mode==='silence')e.status(u,'silence',2);
    e.step(1/30);close(u.memory.fallenStacks,0);close(u.stats.attackSpeed,.8);assert.equal(u.targetId,mode==='silence'?null:next.id);
  }
});

test('Magma trail emission respects Misfortune, while placed flames use normal shield, Curse and immunity rules',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('magma',0,{x:15,y:14},{speed:800}),target=dummy(1,{x:15.5,y:14},{shield:100});
  e.status(u,'misfortune',5,1);e._move(u,null,1/30);assert.equal(e.state.trails.length,0);e.cleanse(u);
  e._move(u,null,1/30);assert.equal(e.state.trails.length,1);u.stats.speed=0;
  e.status(target,'curse',5,.25);e.step(1);close(target.hp,998.875);close(target.shield,97.375);
  e.status(target,'untouchable',5);e.step(1);close(target.hp,998.875);close(target.shield,97.375);
});

test('a copied Magma flame kill promotes Format with its original caster attribution',async()=>{
  const {e,spawn}=await fixture(),u=spawn('format'),enemy=spawn('magma',1,{x:18,y:14});enemy.hp=3;enemy.shield=0;
  e._hook('tick',u,3);assert.equal(u.def.id,'magma');
  e.leaveTrail(u,{x:17.5,y:14},{x:18.5,y:14},{width:1.5,duration:10,damage:3,interval:1});e.step(1);
  assert.equal(enemy.alive,false);assert.equal(u.memory.format.promoted,true);close(u.stats.damage,164);close(u.hp,1480);
});

test('new fire laid under Betrayal damages the caster allies while existing fire retains its allegiance',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('magma'),enemy=dummy(1,{x:15.5,y:14}),ally=dummy(0,{x:15.5,y:14}),params={width:1.5,duration:10,damage:3,interval:1};
  e.leaveTrail(u,{x:15,y:14},{x:16,y:14},params);e.status(u,'betrayal',2);e._hook('move',u,{x:15,y:14},{x:16,y:14});
  assert.equal(e.state.trails.length,2);e.step(1);close(enemy.hp,997);close(ally.hp,997);close(u.hp,740);
});
