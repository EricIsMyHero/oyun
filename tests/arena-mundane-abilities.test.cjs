const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const modules=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/statuses.mjs'),import('../arena/js/vision.mjs')]);
const catalogPromise=modules.then(([, {buildCatalog}])=>buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json')))));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
async function fixture(){
  const [{ArenaEngine},,{hasStatus},vision]=await modules,catalog=await catalogPromise;
  const e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:catalog.cards.filter(c=>c.ready).slice(0,8).map(c=>c.id),spellDeck:['healing-light'],bot:false,seed:20});
  const spawn=(id,side=0,p={x:15,y:14},extra={})=>{
    const def=structuredClone(catalog.byId.get(id));Object.assign(def.stats,{speed:0,criticalChance:0,dodge:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...extra});
    const [u]=e.spawn(def,side,p,1,{count:1});u.cooldown=Infinity;return u;
  };
  const dummy=(side=1,p={x:18,y:14},extra={})=>{
    const def=structuredClone(catalog.byId.get('hammies'));def.id='mundane-target';def.forms=[];def.combat.attackType='none';
    Object.assign(def.stats,{health:5000,shield:0,damage:0,range:0,speed:0,dodge:0,healrecovery:0,shieldrecovery:0,...extra});
    const [u]=e.spawn(def,side,p,1,{count:1});u.cooldown=Infinity;return u;
  };
  const hit=(u,t,damage=u.stats.damage)=>e._resolveHit(u,t,{kind:'attack',damage});
  const kill=u=>{e.damage(null,u,100000,{kind:'spell',bypassShield:true});e._drainDeaths();};
  return {e,catalog,spawn,dummy,hit,kill,vision,has:(u,kind)=>hasStatus(u,kind,e.time)};
}

test('Nortex, Fen and Nightprowler unlock with unchanged base stats and faithful combat geometry',async()=>{
  const {catalog}=await fixture();assert.equal(catalog.cards.filter(c=>c.ready).length,88);
  for(const id of ['nortex','fen','nightprowler']){const def=catalog.byId.get(id);assert.equal(def.ready,true,id);assert.deepEqual(def.reasons,[]);}
  assert.deepEqual(catalog.byId.get('nortex').attack,{count:3,damage:5,interval:.3,delay:1.1});assert.equal(catalog.byId.get('nortex').stats.sps,15);
  assert.equal(catalog.byId.get('fen').attack.count,12);assert.equal(catalog.byId.get('fen').attack.damage,4);
  assert.equal(catalog.byId.get('nightprowler').stats.damage,38);assert.equal(catalog.byId.get('nightprowler').combat.attackAngle,75);
});

test('real Nortex projectiles repeat 5, 7, 9 every burst without permanently changing base Damage',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('nortex'),target=dummy(),packets=[],damage=e.damage.bind(e);
  e.damage=(source,t,amount,options)=>{const result=damage(source,t,amount,options);if(source===u&&t===target&&result.total>0)packets.push(result.total);return result;};
  u.cooldown=0;e.step(3.05);assert.deepEqual(packets,[5,7,9,5,7,9]);close(target.hp,4958);close(u.stats.damage,5);close(u.def.stats.damage,5);
});

test('Nortex resets an interrupted series when its target dies and another target is acquired',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('nortex'),first=dummy(1,{x:16,y:14},{health:5}),next=dummy();
  e._fire(u,first);u.cooldown=Infinity;e.step(.2);assert.equal(first.alive,false);assert.equal(u.burstIndex,0);
  assert.equal(e._target(u),next);assert.equal(u.burstIndex,0);e._fire(u,next);u.cooldown=Infinity;assert.equal(e.state.projectiles[0].hit.damage,5);
  e.step(.5);close(next.hp,4995);
});

test('missed Nortex shots advance the series, while Silence disables only the native progressive bonus',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('nortex'),target=dummy();e.status(u,'misfortune',5,1);
  e._fire(u,target);assert.equal(e.state.projectiles.length,0);assert.equal(u.burstIndex,1);e.cleanse(u);
  e._fire(u,target);assert.equal(e.state.projectiles[0].hit.damage,7);e.status(u,'silence',5);
  e._fire(u,target);assert.equal(e.state.projectiles[1].hit.damage,5);assert.equal(u.burstIndex,0);e.cleanse(u);
  e._fire(u,target);assert.equal(e.state.projectiles[2].hit.damage,5);u.cooldown=Infinity;e.step(.5);close(target.hp,4983);
});

test('Fen applies exactly 12.5% Blind for seven seconds, reducing acquisition Range, combat Vision and scouting',async()=>{
  const {e,spawn,dummy,hit,has,vision}=await fixture(),u=spawn('fen'),target=dummy(1,{x:18,y:14},{range:4000});
  hit(u,target,4);const blind=target.statuses.find(s=>s.kind==='blind');close(blind.magnitude,.125);close(blind.until,7);close(e._range(target),3.5);
  const state={time:e.time,units:[target],castles:[],nodes:[]};close(vision.visibilitySources(state,1)[0].radius,7);
  assert.equal(vision.isPointVisible(state,1,{x:25,y:14}),true);assert.equal(vision.isPointVisible(state,1,{x:25.01,y:14}),false);
  e.step(6.9);assert.equal(has(target,'blind'),true);e.step(.1);assert.equal(has(target,'blind'),false);close(e._range(target),4);
});

test('successive Fen hits refresh one Blind entry and the effect survives caster death',async()=>{
  const {e,spawn,dummy,hit,has,kill}=await fixture(),u=spawn('fen'),target=dummy();hit(u,target,4);e.step(3);hit(u,target,4);
  assert.equal(target.statuses.filter(s=>s.kind==='blind').length,1);close(target.statuses[0].until,10);kill(u);
  e.step(6.9);assert.equal(has(target,'blind'),true);e.step(.1);assert.equal(has(target,'blind'),false);assert.equal(e.statusSources.size,0);
});

test('Fen Blind honors immunity, Cleanse, Flexibility and Silence, and cannot apply on a prevented hit',async()=>{
  const {e,spawn,dummy,hit,has}=await fixture(),u=spawn('fen'),target=dummy(1,{x:18,y:14},{flexibility:50});
  e.status(target,'predominance',5);hit(u,target,4);assert.equal(has(target,'blind'),false);target.statuses=[];
  e.status(target,'untouchable',5);hit(u,target,4);assert.equal(has(target,'blind'),false);target.statuses=[];
  e.status(u,'silence',5);hit(u,target,4);assert.equal(has(target,'blind'),false);e.cleanse(u);
  hit(u,target,4);close(target.statuses.find(s=>s.kind==='blind').until,3.5);e.cleanse(target);assert.equal(has(target,'blind'),false);
});

test('Nightprowler enters invisibility after exactly two idle seconds and deals an eight-second ten-percent ambush',async()=>{
  const {e,spawn,dummy,has,vision}=await fixture(),u=spawn('nightprowler'),target=dummy(1,{x:15.8,y:14});
  e.step(1.9);assert.equal(has(u,'invisible'),false);e.step(.1);assert.equal(has(u,'invisible'),true);
  assert.equal(vision.isEntityVisible(e.state,1,u),false);assert.equal(vision.isEntityVisible(e.state,0,u),true);
  e._fire(u,target);u.cooldown=Infinity;assert.equal(has(u,'invisible'),false);const effect=target.statuses.find(s=>s.kind==='misfortune');close(effect.magnitude,.1);close(effect.until-e.time,8);
  close(target.hp,4962);close(u.memory.lastDamageDealt,2);e.step(1.9);assert.equal(has(u,'invisible'),false);e.step(.1);assert.equal(has(u,'invisible'),true);
});

test('taking real damage breaks Nightprowler stealth and restarts its two-second recovery, including repeated damage',async()=>{
  const {e,spawn,has}=await fixture(),u=spawn('nightprowler');e.step(2);assert.equal(has(u,'invisible'),true);
  e.damage(null,u,1,{kind:'spell',bypassShield:true});assert.equal(has(u,'invisible'),false);e.step(1.9);assert.equal(has(u,'invisible'),false);
  e.damage(null,u,1,{kind:'spell',bypassShield:true});e.step(1.9);assert.equal(has(u,'invisible'),false);e.step(.1);assert.equal(has(u,'invisible'),true);
  e.status(u,'untouchable',3);e.damage(null,u,1,{kind:'spell'});assert.equal(has(u,'invisible'),true);
});

test('Nightprowler does not spend its ambush on misses or invulnerable victims; the first successful cone applies to all victims',async()=>{
  const {e,spawn,dummy,has}=await fixture(),u=spawn('nightprowler'),a=dummy(1,{x:15.7,y:14}),b=dummy(1,{x:15.75,y:14.2});
  e.step(2);e.status(u,'misfortune',5,1);e._fire(u,a);u.cooldown=Infinity;assert.equal(has(u,'invisible'),true);assert.equal(has(a,'misfortune'),false);e.cleanse(u);
  e.status(a,'untouchable',5);e.status(b,'untouchable',5);e._fire(u,a);u.cooldown=Infinity;assert.equal(has(u,'invisible'),true);
  a.statuses=[];b.statuses=[];e._fire(u,a);u.cooldown=Infinity;
  for(const target of [a,b]){assert.equal(has(target,'misfortune'),true);close(target.statuses.find(s=>s.kind==='misfortune').magnitude,.1);}
  assert.equal(has(u,'invisible'),false);
});

test('Nightprowler Misfortune has the exact ten-percent miss boundary, expires at eight seconds, and can be cleansed',async()=>{
  const {e,spawn,dummy,has}=await fixture(),u=spawn('nightprowler'),enemy=spawn('hammies',1,{x:15.8,y:14}),receiver=dummy(0,{x:16.4,y:14});
  e.step(2);e._fire(u,enemy);u.cooldown=Infinity;assert.equal(has(enemy,'misfortune'),true);
  e.random=()=>.099;e._fire(enemy,receiver);enemy.cooldown=Infinity;close(receiver.hp,5000);
  e.random=()=>.1;e._fire(enemy,receiver);enemy.cooldown=Infinity;close(receiver.hp,4992);
  e.step(7.9);assert.equal(has(enemy,'misfortune'),true);e.step(.1);assert.equal(has(enemy,'misfortune'),false);
  e.status(enemy,'misfortune',8,.1,u);e.cleanse(enemy);assert.equal(has(enemy,'misfortune'),false);
});

test('Silence prevents new Nightprowler stealth/ambush; dealing damage while silenced still ends existing stealth',async()=>{
  const {e,spawn,dummy,has}=await fixture(),u=spawn('nightprowler'),target=dummy(1,{x:15.8,y:14});
  e.status(u,'silence',5);e.step(2);assert.equal(has(u,'invisible'),false);e.cleanse(u);e.step(1/30);assert.equal(has(u,'invisible'),true);
  e.status(u,'silence',5);e._fire(u,target);u.cooldown=Infinity;assert.equal(has(u,'invisible'),false);assert.equal(has(target,'misfortune'),false);
});

test('Nightprowler ambush respects Predominance and Flexibility, while pause freezes stealth and effect clocks',async()=>{
  const {e,spawn,dummy,has}=await fixture(),u=spawn('nightprowler'),target=dummy(1,{x:15.8,y:14},{flexibility:50});
  e.setPaused(true);e.step(20);close(e.time,0);assert.equal(has(u,'invisible'),false);e.setPaused(false);e.step(2);
  e.status(target,'predominance',5);e._fire(u,target);u.cooldown=Infinity;assert.equal(has(target,'misfortune'),false);assert.equal(has(u,'invisible'),false);
  target.statuses=[];e.step(2);e._fire(u,target);u.cooldown=Infinity;close(target.statuses.find(s=>s.kind==='misfortune').until-e.time,4);
  e.setPaused(true);e.step(20);assert.equal(has(target,'misfortune'),true);e.setPaused(false);e.step(4);assert.equal(has(target,'misfortune'),false);
});

test('all Mundane roots are battle-ready, including the final Angels and Boomix profiles',async()=>{
  const {catalog}=await fixture();assert.ok(catalog.cards.filter(c=>c.rarity==='Mundane').every(c=>c.ready));assert.equal(catalog.cards.filter(c=>c.ready).length,88);
  assert.equal(catalog.byId.get('angels').stats.number,10);assert.equal(catalog.byId.get('boomix').attack.interval,2.4);assert.equal(catalog.byId.get('boomix').stats.sps,6);
});

test('Angels emits exactly ten bodies with growing gaps and no cumulative timing drift',async()=>{
  const {e,catalog}=await fixture(),def=structuredClone(catalog.byId.get('angels'));def.stats.speed=0;
  const initial=e.spawn(def,0,{x:15,y:14},1);assert.equal(initial.length,1);assert.equal(e.units.length,1);close(e.state.spawnStreams[0].nextAt,.4);
  e.step(.39);assert.equal(e.units.length,1);e.step(.01);assert.equal(e.units.length,2);close(e.state.spawnStreams[0].nextAt,.85);
  e.step(5);assert.equal(e.units.length,10);assert.equal(e.state.spawnStreams.length,0);
  const due=[0,.4,.85,1.35,1.9,2.5,3.15,3.85,4.6,5.4];
  e.units.forEach((u,i)=>{assert.ok(u.born+1e-7>=due[i]);assert.ok(u.born-due[i]<1/30+1e-7,`${i}: ${u.born} vs ${due[i]}`);assert.equal(u.groupId,initial[0].groupId);assert.equal(u.lane,1);assert.equal(u.def.combat.movementType,'flying');});
  e.step(10);assert.equal(e.units.length,10);assert.doesNotThrow(()=>JSON.stringify(e.state));assert.equal(def.stats.number,10);
});

test('one Angels deployment pays mana and cycles the hand once for all ten scheduled bodies',async()=>{
  const {e}=await fixture();e.teams[0].hand[0]='angels';
  const result=e.deploy(0,0,{x:7,y:14});assert.equal(result.ok,true);assert.equal(result.units.length,1);close(e.teams[0].mana,4);close(e.teams[0].energy,.45);assert.equal(e.teams[0].spentMana,8);assert.equal(e.teams[0].deployed,1);
  e.step(5.4);assert.equal(e.units.filter(u=>u.def.id==='angels').length,10);assert.equal(e.teams[0].spentMana,8);assert.equal(e.teams[0].deployed,1);assert.equal(e.teams[0].queue.at(-1),'angels');
});

test('Angel reinforcements retain their selected outer corridor and faction on both sides',async()=>{
  for(const side of [0,1]){
    const {e,catalog}=await fixture(),def=structuredClone(catalog.byId.get('angels'));def.stats.speed=0;
    e.spawn(def,side,{x:side?32:11,y:4},0);e.step(5.4);assert.equal(e.units.length,10);
    assert.ok(e.units.every(u=>u.side===side&&u.lane===0&&u.y===4));
  }
});

test('Angel stream survives the first body death or control effects and pauses with the match clock',async()=>{
  const {e,catalog,kill}=await fixture(),def=structuredClone(catalog.byId.get('angels'));def.stats.speed=0;
  const [first]=e.spawn(def,0,{x:15,y:14},1);e.status(first,'silence',10);e.status(first,'imprisonment',10);e.setPaused(true);e.step(20);close(e.time,0);assert.equal(e.units.length,1);e.setPaused(false);
  e.cleanse(first);kill(first);e.step(.4);assert.equal(e.units.length,1);assert.equal(e.units[0].def.id,'angels');e.step(5);assert.equal(e.units.length,9);assert.equal(e.state.spawnStreams.length,0);
});

test('each friendly Angel death grants two permanent Damage to living Angels across groups, without affecting future arrivals',async()=>{
  const {e,catalog,spawn,kill}=await fixture(),a=spawn('angels'),b=spawn('angels',0,{x:16,y:14}),enemy=spawn('angels',1,{x:25,y:14});
  const def=structuredClone(catalog.byId.get('angels'));def.stats.speed=0;const [first]=e.spawn(def,0,{x:17,y:14},1);
  kill(a);close(b.stats.damage,8);close(first.stats.damage,8);close(enemy.stats.damage,6);assert.equal(b.memory.angelDeaths,1);
  e.deaths.push({u:a,killer:null});e._drainDeaths();close(b.stats.damage,8);
  e.step(.4);const newest=e.units.at(-1);close(newest.stats.damage,6);kill(first);close(b.stats.damage,10);close(newest.stats.damage,8);
  kill(enemy);close(b.stats.damage,10);assert.equal(b.def.stats.damage,6);
});

test('Boomix reaches its target point, hits once on each leg, and catches without a stale flight lock',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('boomix'),target=dummy();e._fire(u,target);const shot=e.state.projectiles[0];
  for(let i=0;i<100&&shot.returning==='outbound';i++)e._projectiles(1/60);
  assert.equal(shot.returning,'return');close(shot.x,18);close(target.hp,4986);assert.equal(u.memory.returningShotId,shot.id);
  e._fire(u,target);assert.equal(u.shots,1);
  for(let i=0;i<100&&u.memory.returningShotId;i++)e._projectiles(1/60);
  close(target.hp,4972);assert.equal(u.hits,2);assert.equal(u.memory.returningShotId,undefined);assert.equal(e.state.projectiles.length,0);
});

test('Boomix preserves its single-target limit separately on each leg instead of becoming a piercing line',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('boomix'),primary=dummy(),interceptor=dummy(1,{x:17,y:14}),beyond=dummy(1,{x:19,y:14});e._fire(u,primary);
  for(let i=0;i<120&&e.state.projectiles.length;i++)e._projectiles(1/60);
  close(interceptor.hp,4986);close(primary.hp,4986);close(beyond.hp,5000);assert.equal(u.hits,2);
});

test('Boomix next launch is 2.4 seconds after launch, including rather than adding flight time',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('boomix'),target=dummy();e._fire(u,target);
  e.step(.8);assert.equal(u.memory.returningShotId,undefined);close(u.cooldown,1.6);assert.equal(u.shots,1);close(target.hp,4972);
  e.step(1.59);assert.equal(u.shots,1);e.step(.01);assert.equal(u.shots,2);
});

test('Boomix must still catch a weapon whose flight exceeds the launch interval',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('boomix',0,{x:12,y:14}),target=dummy(1,{x:30,y:14});dummy(0,{x:29,y:14});
  u.stats.range=20000;u.stats.vision=30000;u.def.raw.additionalStats.vision='30000';e._fire(u,target);
  e.step(2.4);assert.equal(u.shots,1);assert.ok(u.memory.returningShotId);assert.ok(u.cooldown<1e-7);
  for(let i=0;i<90&&u.shots<2;i++)e.step(1/30);
  assert.equal(u.shots,2);assert.ok(e.time>=4.5&&e.time<4.7,`launch at ${e.time}`);
});

test('Boomix gains twenty-percent incoming protection only during flight, with Silence and misses honored',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('boomix'),target=dummy();u.shield=0;
  close(e.damage(null,u,10,{kind:'spell'}).total,10);e._fire(u,target);close(e.damage(null,u,10,{kind:'spell'}).total,8);
  e.status(u,'silence',5);close(e.damage(null,u,10,{kind:'spell'}).total,10);e.cleanse(u);e.step(.8);assert.equal(u.memory.returningShotId,undefined);close(e.damage(null,u,10,{kind:'spell'}).total,10);
  e.status(u,'misfortune',5,1);e._fire(u,target);assert.equal(e.state.projectiles.length,0);assert.equal(u.memory.returningShotId,undefined);close(e.damage(null,u,10,{kind:'spell'}).total,10);
});

test('Boomix return motion follows its moving owner, freezes on pause and clears its lock on death',async()=>{
  const {e,spawn,dummy,kill}=await fixture(),u=spawn('boomix'),target=dummy();e._fire(u,target);e.step(.1);const x=e.state.projectiles[0].x;
  e.setPaused(true);e.step(20);close(e.state.projectiles[0].x,x);e.setPaused(false);u.x=14.5;
  for(let i=0;i<100&&u.memory.returningShotId;i++)e.step(1/30);assert.equal(u.memory.returningShotId,undefined);
  e._fire(u,target);assert.ok(u.memory.returningShotId);kill(u);e.step(1/30);assert.equal(e.state.projectiles.length,0);assert.equal(u.memory.returningShotId,undefined);
});

test('a Format promotion cannot throw a second Boomix weapon before the original is caught',async()=>{
  const {e,spawn}=await fixture(),u=spawn('format'),target=spawn('boomix',1,{x:18,y:14});target.hp=14;target.shield=0;
  e._hook('tick',u,3);e._fire(u,target);const id=u.memory.returningShotId;
  e.step(.34);assert.equal(target.alive,false);assert.equal(u.memory.format.promoted,true);assert.equal(u.memory.returningShotId,id);assert.equal(e.state.projectiles.length,1);
  for(let i=0;i<4;i++)e.step(1/30);assert.ok(e.state.projectiles.length<=1);
});

test('an Angel arriving after a death in the same tick does not inherit a retroactive rally bonus',async()=>{
  const {e,catalog}=await fixture(),def=structuredClone(catalog.byId.get('angels'));def.stats.speed=0;
  const [first]=e.spawn(def,0,{x:15,y:14},1);
  e.status(first,'burn',.4,0,null,{amount:25,interval:.4});e.step(.4);
  assert.equal(first.alive,false);assert.equal(e.units.length,1);close(e.units[0].stats.damage,6);close(e.units[0].born,.4);
});
