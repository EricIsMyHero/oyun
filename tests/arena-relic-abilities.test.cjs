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

test('seven Relic cards and all three Necromancer summons unlock with verified native handlers',async()=>{
  const {catalog}=await fixture();
  const ids=['stacy','death','demotron','aeralis','dark-necromancer','ali','worms','dark-necromancer/bladeknight','dark-necromancer/stormbow','dark-necromancer/ironhide'];
  for(const id of ids){assert.equal(catalog.byId.get(id).ready,true,id);assert.deepEqual(catalog.byId.get(id).reasons,[]);}
  assert.equal(catalog.cards.filter(c=>c.ready).length,65);
  assert.equal(catalog.byId.get('format').ready,false);assert.match(catalog.byId.get('format').reasons.join(' '),/not been implemented/);
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
