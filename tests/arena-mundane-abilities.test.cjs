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
  const {catalog}=await fixture();assert.equal(catalog.cards.filter(c=>c.ready).length,84);
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
