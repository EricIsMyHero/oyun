const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const modules=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs')]);
const catalogPromise=modules.then(([, {buildCatalog}])=>buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json')))));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
async function fixture(){
  const [{ArenaEngine}]=await modules,catalog=await catalogPromise;
  const e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:catalog.cards.filter(c=>c.ready).slice(0,8).map(c=>c.id),spellDeck:['healing-light'],bot:false,seed:23});
  const spawn=(id,side=0,p={x:15,y:14},stats={})=>{
    const def=structuredClone(catalog.byId.get(id));Object.assign(def.stats,{speed:0,criticalChance:0,dodge:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...stats});
    const [u]=e.spawn(def,side,p,1,{count:1});u.cooldown=Infinity;return u;
  };
  const dummy=(side=1,p={x:18,y:14},stats={})=>{
    const def=structuredClone(catalog.byId.get('hammies'));def.id='transformation-target';def.forms=[];def.combat.attackType='none';
    Object.assign(def.stats,{health:5000,shield:0,damage:0,range:0,speed:0,dodge:0,healrecovery:0,shieldrecovery:0,...stats});
    const [u]=e.spawn(def,side,p,1,{count:1});u.cooldown=Infinity;return u;
  };
  return {e,catalog,spawn,dummy};
}

test('Tornado uses the updated .25-second interval, 1.25-second delay and 1.2-tile reach',async()=>{
  const {catalog}=await fixture(),u=catalog.byId.get('tornado');assert.deepEqual(u.reasons,[]);
  assert.ok(catalog.cards.filter(c=>c.rarity==='Familiar').every(c=>c.ready));
  assert.deepEqual(u.attack,{count:10,damage:4,interval:.25,delay:1.25});assert.equal(u.stats.sps,40);assert.equal(u.stats.range,1200);assert.equal(u.combat.attackDistance,1200);assert.equal(u.combat.attackWidth,750);assert.equal(u.combat.movementType,'hovering');
});

test('Tornado captures only one nearby target and each of ten hits stays on that captive',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('tornado'),target=dummy(1,{x:16.1,y:14}),other=dummy(1,{x:16.2,y:14});
  e._fire(u,target);assert.equal(target.engulfedBy,u.id);assert.equal(other.engulfedBy,undefined);close(target.hp,4996);close(other.hp,4998);assert.equal(e._target(u),target);
  for(let i=0;i<8;i++){e._fire(u,target);assert.equal(target.engulfedBy,u.id);}
  e._fire(u,target);assert.equal(target.engulfedBy,undefined);close(target.hp,4960);close(other.hp,4980);assert.equal(u.attacks,1);assert.equal(u.burstIndex,0);close(u.cooldown,1.5);assert.ok(target.x>18);
});

test('Tornado cannot hurt or capture a target outside 1.2 tiles plus its body overlap',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('tornado'),target=dummy(1,{x:16.6,y:14});u.cooldown=0;e.step(.1);
  assert.equal(u.shots,0);assert.equal(target.engulfedBy,undefined);close(target.hp,5000);
});

test('Tornado deals six per hit at half health without stacking and returns to four after healing',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('tornado'),target=dummy(1,{x:16,y:14});u.hp=175;e._hook('tick',u,0);
  for(let i=0;i<10;i++)e._fire(u,target);close(target.hp,4940);assert.equal(u.stats.damage,6);
  e.heal(u,100);e._hook('tick',u,0);assert.equal(u.stats.damage,4);assert.equal(u.def.stats.damage,4);
});

test('Tornado splash deals half damage to every other nearby enemy without capturing them',async()=>{
  for(const lowHealth of [false,true]){
    const {e,spawn,dummy}=await fixture(),u=spawn('tornado'),primary=dummy(1,{x:16,y:14}),a=dummy(1,{x:15.9,y:14}),b=dummy(1,{x:14.1,y:14}),outside=dummy(1,{x:16.6,y:14}),friend=dummy(0,{x:15.9,y:14});
    if(lowHealth)u.hp=175;e._hook('tick',u,0);e._fire(u,primary);
    close(primary.hp,5000-(lowHealth?6:4));close(a.hp,5000-(lowHealth?3:2));close(b.hp,5000-(lowHealth?3:2));close(outside.hp,5000);close(friend.hp,5000);
    assert.equal(e.captivesOf(u).length,1);assert.equal(primary.engulfedBy,u.id);assert.equal(a.engulfedBy,undefined);assert.equal(b.engulfedBy,undefined);
  }
});

test('an immune central Tornado target does not shield surrounding enemies from splash',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('tornado'),primary=dummy(1,{x:16,y:14}),other=dummy(1,{x:16.1,y:14});e.status(primary,'untouchable',1);e._fire(u,primary);
  close(primary.hp,5000);close(other.hp,4998);assert.equal(e.captivesOf(u).length,0);
});

test('Tornado blocks all captive damage, including existing projectiles, damage-over-time and flame fields',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('tornado'),target=dummy(1,{x:16,y:14}),ally=dummy(0,{x:16.5,y:14});e._fire(u,target);
  for(const options of [{kind:'attack'},{kind:'ability'},{kind:'dot'},{kind:'ability',persistentField:true}])close(e.damage(target,ally,100,options).total,0);
  assert.equal(e.canTarget(u,target),true);assert.equal(e.canTarget(ally,target),false);assert.equal(e.canSee(ally,target),false);close(e.damage(ally,target,100,{kind:'ability'}).total,0);
});

test('Tornado does not capture an evaded, missed, immune, flying or Predominance-protected target',async()=>{
  for(const kind of ['dodge','misfortune','untouchable','flying','predominance']){
    const {e,spawn,dummy}=await fixture(),u=spawn('tornado'),target=dummy(1,{x:16,y:14});
    if(kind==='dodge'){target.stats.dodge=70;e.random=()=>0;}
    else if(kind==='misfortune'){e.status(u,kind,1,.1);e.random=()=>0;}
    else if(kind==='flying')target.def.combat.movementType='flying';
    else e.status(target,kind,1);
    if(kind==='flying'){u.cooldown=0;e.step(1/30);}else e._fire(u,target);
    assert.equal(target.engulfedBy,undefined,kind);
  }
});

test('the tenth Tornado attempt releases its victim even if that final hit misses or is silenced',async()=>{
  for(const kind of ['misfortune','silence']){
    const {e,spawn,dummy}=await fixture(),u=spawn('tornado'),target=dummy(1,{x:16,y:14});for(let i=0;i<9;i++)e._fire(u,target);
    e.status(u,kind,2,.1);e.random=()=>0;e._fire(u,target);assert.equal(target.engulfedBy,undefined);assert.equal(target.memory.vortexHeld,undefined);
  }
});

test('Cleanse, a target switch and captor death all release surviving Tornado captives',async()=>{
  for(const action of ['cleanse','switch','death']){
    const {e,spawn,dummy}=await fixture(),u=spawn('tornado'),target=dummy(1,{x:16,y:14});e._fire(u,target);
    if(action==='cleanse')e.cleanse(target);
    if(action==='switch')e._hook('targetChanged',u,dummy(1,{x:16.2,y:14}));
    if(action==='death'){e.damage(null,u,10000,{kind:'spell'});e._drainDeaths();}
    assert.equal(target.engulfedBy,undefined,action);assert.equal(target.memory.vortexHeld,undefined);assert.equal(target.alive,true);
  }
});

test('Tornado hurls victims along their original approach direction for either faction',async()=>{
  for(const side of [0,1]){
    const {e,spawn,dummy}=await fixture(),u=spawn('tornado',side),target=dummy(1-side,{x:15+(side===0?1:-1),y:14});
    for(let i=0;i<10;i++)e._fire(u,target);
    close(Math.hypot(target.x-u.x,target.y-u.y),3.5);assert.ok(side===0?target.x>18:target.x<13,`side ${side}`);assert.equal(target.engulfedBy,undefined);
  }
});

test('real Tornado burst timing and pause follow the authored interval and delay',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('tornado'),target=dummy(1,{x:16,y:14});u.cooldown=0;e.step(1);assert.equal(u.shots,4);assert.equal(target.engulfedBy,u.id);
  e.setPaused(true);e.step(10);assert.equal(u.shots,4);e.setPaused(false);e.step(1.5);assert.equal(u.shots,10);assert.equal(target.engulfedBy,undefined);assert.equal(u.attacks,1);
  e.step(1);assert.equal(u.shots,10);
});

test('Tphoenix and both forms unlock with the authored 480, 360 and 240 Health',async()=>{
  const {catalog}=await fixture();for(const id of ['tphoenix','tphoenix/fire-egg','tphoenix/phoenix'])assert.deepEqual(catalog.byId.get(id).reasons,[],id);
  const [root,egg,phoenix]=['tphoenix','tphoenix/fire-egg','tphoenix/phoenix'].map(id=>catalog.byId.get(id));
  assert.equal(root.stats.health,480);assert.equal(egg.stats.health,360);assert.equal(phoenix.stats.health,240);
  assert.equal(egg.combat.attackType,'none');assert.equal(phoenix.combat.movementType,'flying');assert.equal(root.stats.mana,15);
});

test('Tphoenix reflects 10 percent of damage actually taken once, including shield damage',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('tphoenix',0,{x:15,y:14},{shield:100,shieldtakendamage:70,damageminimiser:20}),attacker=dummy();
  const result=e.damage(attacker,u,100,{kind:'spell'});close(result.total,80);close(u.hp,456);close(u.shield,44);close(attacker.hp,4992);assert.equal(u.def.id,'tphoenix');
});

test('two Tphoenix reflectors terminate without bouncing reflected damage back and forth',async()=>{
  const {e,spawn}=await fixture(),a=spawn('tphoenix'),b=spawn('tphoenix',1,{x:16,y:14});
  e.damage(a,b,100,{kind:'spell'});close(b.hp,380);close(a.hp,470);assert.equal(e.damageDepth,0);
});

test('strictly below 25 percent becomes a full-health Fire Egg without death or extra mana',async()=>{
  const {e,spawn}=await fixture(),u=spawn('tphoenix'),identity={id:u.id,side:u.side,lane:u.lane,groupId:u.groupId};
  e.damage(null,u,360,{kind:'spell'});assert.equal(u.def.id,'tphoenix');close(u.hp,120);
  const result=e.damage(null,u,1,{kind:'spell'});assert.equal(result.killed,false);assert.equal(u.def.id,'tphoenix/fire-egg');close(u.hp,360);close(u.maxHp,360);
  for(const [key,value]of Object.entries(identity))assert.equal(u[key],value);
  assert.equal(e.deaths.length,0);assert.equal(e.units.length,1);assert.equal(e.teams[0].spentMana,0);assert.equal(u.memory.rebirth.cycles,1);close(u.memory.rebirth.hatchAt,10);
});

test('a lethal packet becomes Fire Egg without false kill credit or a death event',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('tphoenix'),attacker=dummy();const result=e.damage(attacker,u,10000,{kind:'spell'});e._drainDeaths();
  assert.equal(result.killed,false);assert.equal(u.alive,true);assert.equal(u.def.id,'tphoenix/fire-egg');close(u.hp,360);close(attacker.hp,4952);
  assert.equal(e.state.events.some(v=>v.type==='death'),false);assert.equal(e.units.includes(u),true);
});

test('broken Fire Egg returns to the same Tphoenix with exactly 120 out of 480 Health',async()=>{
  const {e,spawn}=await fixture(),u=spawn('tphoenix');e.damage(null,u,361,{kind:'spell'});const id=u.id;
  e.damage(null,u,359,{kind:'spell'});close(u.hp,1);assert.equal(u.def.id,'tphoenix/fire-egg');
  const result=e.damage(null,u,1,{kind:'spell'});e._drainDeaths();assert.equal(result.killed,false);assert.equal(u.def.id,'tphoenix');close(u.hp,120);close(u.maxHp,480);assert.equal(u.id,id);assert.equal(u.alive,true);
  u.cooldown=Infinity;e.step(.2);assert.equal(u.def.id,'tphoenix','exactly 25 percent does not immediately re-enter the egg');assert.equal(e.deaths.length,0);
});

test('Tphoenix has one Fire Egg transformation per deployment even after later healing',async()=>{
  const {e,spawn}=await fixture(),u=spawn('tphoenix');e.damage(null,u,361,{kind:'spell'});e.damage(null,u,1000,{kind:'spell'});assert.equal(u.phoenixEggUsed,true);
  e.damage(null,u,1,{kind:'spell'});e.step(.1);assert.equal(u.def.id,'tphoenix');close(u.hp,119);
  e.heal(u,361);e.damage(null,u,361,{kind:'spell'});assert.equal(u.def.id,'tphoenix');close(u.hp,119);
  const death=e.damage(null,u,119,{kind:'spell'});assert.equal(death.killed,true);assert.equal(u.alive,false);
  const next=spawn('tphoenix',0,{x:16,y:14});e.damage(null,next,361,{kind:'spell'});assert.equal(next.def.id,'tphoenix/fire-egg');assert.equal(next.memory.rebirth.cycles,1);
});

test('Format promotion cannot reset the once-per-deployment Fire Egg limit',async()=>{
  const {e,spawn}=await fixture(),u=spawn('format'),target=spawn('tphoenix',1,{x:18,y:14});e.step(3);
  e.damage(null,u,361,{kind:'spell'});e.damage(null,u,1000,{kind:'spell'});e.status(target,'silence',20);e.damage(u,target,10000,{kind:'attack'});
  assert.equal(u.memory.format.promoted,true);assert.equal(u.phoenixEggUsed,true);close(u.maxHp,960);
  e.damage(null,u,721,{kind:'spell'});assert.equal(u.def.id,'tphoenix');close(u.hp,239);assert.equal(u.phoenixEggUsed,true);
});

test('Fire Egg waits ten game seconds then becomes full-health flying Phoenix on the same lane',async()=>{
  const {e,spawn}=await fixture(),u=spawn('tphoenix');e.damage(null,u,361,{kind:'spell'});const position={x:u.x,y:u.y};
  e.step(9.9);assert.equal(u.def.id,'tphoenix/fire-egg');assert.deepEqual({x:u.x,y:u.y},position);assert.equal(u.shots,0);
  e.step(.1);assert.equal(u.def.id,'tphoenix/phoenix');close(u.hp,240);close(u.maxHp,240);assert.equal(u.def.combat.movementType,'flying');assert.equal(u.lane,1);assert.equal(e.deaths.length,0);
});

test('egg timer freezes during pause; Silence delays hatching and can prevent the broken-egg rescue',async()=>{
  const {e,spawn}=await fixture(),u=spawn('tphoenix');e.damage(null,u,361,{kind:'spell'});e.step(5);e.setPaused(true);e.step(20);close(e.time,5);
  e.setPaused(false);e.status(u,'silence',6);e.step(5.5);assert.equal(u.def.id,'tphoenix/fire-egg');e.step(.5);assert.equal(u.def.id,'tphoenix/phoenix');
  const v=spawn('tphoenix',0,{x:16,y:14});e.damage(null,v,361,{kind:'spell'});e.status(v,'silence',2);const result=e.damage(null,v,1000,{kind:'spell'});e._drainDeaths();assert.equal(result.killed,true);assert.equal(v.alive,false);
});

test('Silence or a failed Misfortune trigger prevents Tphoenix rescue and reflection',async()=>{
  for(const kind of ['silence','misfortune']){
    const {e,spawn,dummy}=await fixture(),u=spawn('tphoenix'),attacker=dummy();e.status(u,kind,2,.1);e.random=()=>0;
    const result=e.damage(attacker,u,1000,{kind:'spell'});assert.equal(result.killed,true);assert.equal(u.alive,false);close(attacker.hp,5000);assert.equal(e.deaths.length,1);
  }
});

test('Phoenix bypasses shields and grows by one Damage after each successful hit without a cap',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('tphoenix/phoenix'),target=dummy(1,{x:15.6,y:14},{health:1000000,shield:1000});
  e._fire(u,target);close(target.hp,999986);close(target.shield,1000);assert.equal(u.stats.damage,15);
  for(let i=0;i<220;i++)e._fire(u,target);assert.equal(u.stats.damage,235);assert.equal(u.def.stats.damage,14);close(target.shield,1000);
  e.status(target,'untouchable',2);e._fire(u,target);assert.equal(u.stats.damage,235);
});

test('broken egg preserves existing statuses, effective Health caps and percentage-based restoration',async()=>{
  const {e,spawn}=await fixture(),u=spawn('tphoenix');e.status(u,'statReduction',30,0,null,{stats:{health:.2},percent:true});close(e.maxHealth(u),384);
  e.damage(null,u,300,{kind:'spell'});assert.equal(u.def.id,'tphoenix/fire-egg');close(e.maxHealth(u),288);
  e.damage(null,u,1000,{kind:'spell'});assert.equal(u.def.id,'tphoenix');close(e.maxHealth(u),384);close(u.hp,96);assert.equal(u.statuses[0].kind,'statReduction');
});

test('a copied Tphoenix uses its copied root stats for its broken-egg return',async()=>{
  const {e,spawn}=await fixture(),u=spawn('format'),target=spawn('tphoenix',1,{x:18,y:14});
  e.step(3);assert.equal(u.def.id,'tphoenix');assert.equal(u.memory.format.transformed,true);const memory=u.memory.format;
  e.damage(null,u,361,{kind:'spell'});assert.equal(u.def.id,'tphoenix/fire-egg');assert.equal(u.memory.format,memory);
  e.damage(null,u,1000,{kind:'spell'});assert.equal(u.def.id,'tphoenix');close(u.hp,120);assert.equal(u.memory.format,memory);assert.equal(u.alive,true);assert.equal(target.alive,true);
});
