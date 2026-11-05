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
  const e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:catalog.cards.filter(c=>c.ready).slice(0,8).map(c=>c.id),spellDeck:['healing-light'],bot:false,seed:22});
  const spawn=(id,side=0,p={x:15,y:14},stats={})=>{
    const def=structuredClone(catalog.byId.get(id));Object.assign(def.stats,{speed:0,criticalChance:0,dodge:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...stats});
    const [u]=e.spawn(def,side,p,1,{count:1});u.cooldown=Infinity;return u;
  };
  const dummy=(side=1,p={x:15.6,y:14},stats={})=>{
    const def=structuredClone(catalog.byId.get('hammies'));def.id='familiar-target';def.forms=[];def.combat.attackType='none';
    Object.assign(def.stats,{health:5000,shield:0,damage:0,range:0,speed:0,dodge:0,healrecovery:0,shieldrecovery:0,...stats});
    const [u]=e.spawn(def,side,p,1,{count:1});u.cooldown=Infinity;return u;
  };
  const kill=u=>{e.damage(null,u,100000,{kind:'spell',bypassShield:true});e._drainDeaths();};
  return {e,catalog,spawn,dummy,kill};
}

test('Albert and Chicken unlock without changing their authored stats or inventing a Chicken attack interval',async()=>{
  const {catalog}=await fixture();assert.equal(catalog.cards.filter(c=>c.ready).length,95);
  for(const id of ['albert','chicken'])assert.deepEqual(catalog.byId.get(id).reasons,[]);
  const a=catalog.byId.get('albert'),c=catalog.byId.get('chicken');
  assert.deepEqual(a.attack,{count:12,damage:7,interval:.25,delay:1.25});assert.equal(a.stats.mana,15);assert.equal(a.stats.sps,28);
  assert.deepEqual(c.attack,{count:1,damage:100,interval:0,delay:0});assert.equal(c.raw.stats.attackSpeed,'-');assert.equal(c.stats.mana,6);
  assert.equal(c.combat.targets,'ground');assert.equal(c.combat.impactSize,'2 × 2 tiles');assert.equal(c.combat.attackWidth,500);assert.equal(c.combat.attackDistance,500);
});

test('Albert deals 7, 8, 9, 10 then keeps the +3 bonus through the next series against the same target',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('albert'),target=dummy(),packets=[],damage=e.damage.bind(e);
  e.damage=(source,t,amount,options)=>{const result=damage(source,t,amount,options);if(source===u&&t===target&&result.total>0)packets.push(result.total);return result;};
  u.cooldown=0;e.step(4.5);assert.deepEqual(packets,[7,8,9,...Array(10).fill(10)]);
  assert.equal(u.memory.albertGrowth,3);assert.equal(u.stats.damage,10);assert.equal(u.def.stats.damage,7);assert.equal(u.def.raw.stats.damage,'12x7');
});

test('Albert resets bonus when the current target dies, changes, or disappears even during Silence',async()=>{
  const {e,spawn,dummy,kill}=await fixture(),u=spawn('albert'),first=dummy(),next=dummy(1,{x:15.7,y:14});
  for(let i=0;i<4;i++)e._fire(u,first);assert.equal(u.stats.damage,10);
  kill(first);u.cooldown=Infinity;e.step(1/30);assert.equal(u.targetId,next.id);assert.equal(u.stats.damage,7);assert.equal(u.memory.albertGrowth,0);
  e._fire(u,next);assert.equal(u.stats.damage,8);
  e.status(u,'silence',2);next.x=25;u.burstTargetId=null;e.step(1/30);assert.equal(u.targetId,null);assert.equal(u.stats.damage,7);
});

test('Albert counts successful shield damage but not dodge, immunity or Misfortune misses',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('albert'),target=dummy(1,{x:15.6,y:14},{shield:100,shieldtakendamage:100});
  e.random=()=>0;e._fire(u,target);close(target.hp,5000);close(target.shield,93);assert.equal(u.stats.damage,8);
  target.stats.dodge=70;e._fire(u,target);assert.equal(u.stats.damage,8);target.stats.dodge=0;
  e.status(target,'untouchable',2);e._fire(u,target);assert.equal(u.stats.damage,8);e.cleanse(target);target.statuses=[];
  e.status(u,'misfortune',2,.1);e._fire(u,target);assert.equal(u.stats.damage,8);
  u.statuses=[];e._fire(u,target);assert.equal(u.stats.damage,9);
});

test('Albert keeps the chosen target through its 12-hit burst and resets on a deliberate switch',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('albert'),a=dummy(),b=dummy(1,{x:16,y:14});
  e._fire(u,a);assert.equal(e._target(u),a);e._fire(u,a);assert.equal(u.stats.damage,9);
  e._fire(u,b);close(b.hp,4993);assert.equal(u.stats.damage,8);assert.equal(u.memory.albertTargetId,b.id);
  e._hook('hit',u,a,{total:10});assert.equal(u.stats.damage,8,'a late old-target hit cannot transfer bonus');
});

test('Chicken walks into body contact before one suicide explosion, without dealing a normal hit',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('chicken',0,{x:15,y:14},{speed:1300}),target=dummy(1,{x:15.8,y:14});e.random=()=>.8;
  e._fire(u,target);assert.equal(u.shots,0);close(target.hp,5000);
  e.step(1/30);assert.equal(u.alive,true);assert.ok(u.x>15);close(target.hp,5000);
  e.step(.4);assert.equal(u.alive,false);assert.equal(u.memory.deathResolved,true);close(target.hp,4900);assert.equal(u.shots,0);
  e.step(1);e._drainDeaths();close(target.hp,4900);assert.equal(e.state.effects.filter(f=>f.type==='explosion').length,0);
});

test('Chicken ordinary explosion is a 2 by 2 square and the .8 probability boundary is not enlarged',async()=>{
  const {e,spawn,dummy,kill}=await fixture(),u=spawn('chicken'),inside=dummy(1,{x:16.19,y:14.9}),outside=dummy(1,{x:16.26,y:14}),ally=dummy(0,{x:15.8,y:14});
  inside.radius=outside.radius=.25;e.random=()=>.8;kill(u);
  close(inside.hp,4900);close(outside.hp,5000);close(ally.hp,5000);
  const fx=e.state.effects.filter(f=>f.type==='blastArea');assert.equal(fx.length,1);assert.equal(fx[0].width,2);assert.equal(fx[0].height,2);
});

test('Chicken enlarged explosion is 3.5 by 3.5 with 500 damage, including square corners',async()=>{
  const {e,spawn,dummy,kill}=await fixture(),u=spawn('chicken'),near=dummy(),corner=dummy(1,{x:16.9,y:15.7}),outside=dummy(1,{x:17.01,y:14});
  Object.assign(corner,{x:16.9,y:15.7,radius:.2});Object.assign(outside,{x:17.01,radius:.25});e.random=()=>.799999;kill(u);
  close(near.hp,4500);close(corner.hp,4500);close(outside.hp,5000);
  assert.equal(e.state.effects.find(f=>f.type==='blastArea').width,3.5);
});

test('Chicken uses ground targeting, normal shield/reduction rules and one shared explosion roll',async()=>{
  const {e,spawn,dummy,kill}=await fixture(),u=spawn('chicken'),ground=dummy(),hover=dummy(),flyer=dummy(),protectedUnit=dummy(1,{x:15.7,y:14},{shield:200,shieldtakendamage:70,damageminimiser:20});
  hover.def.combat.movementType='hovering';flyer.def.combat.movementType='flying';const rolls=[];e.random=()=>{rolls.push(1);return .1;};kill(u);
  close(ground.hp,4500);close(hover.hp,4500);close(flyer.hp,5000);close(protectedUnit.shield,0);close(protectedUnit.hp,4800);assert.equal(rolls.length,1);
});

test('Chicken contact and killed explosions can hit enemy buildings and castles but not allies',async()=>{
  for(const big of [false,true]){
    const {e,spawn,dummy}=await fixture(),castle=e.castles[1],u=spawn('chicken',0,{x:castle.x-castle.radius-.24,y:castle.y}),building=dummy(1,{x:u.x,y:u.y});
    building.isBuilding=true;const before=castle.hp;e.random=()=>big?.1:.9;e.step(1/30);
    assert.equal(u.alive,false);close(castle.hp,before-(big?500:100));close(building.hp,5000-(big?500:100));
  }
});

test('Chicken waits while silenced or stunned, then detonates on eligible contact without an attack timer',async()=>{
  for(const kind of ['silence','stun','frozen','airborne','imprisonment']){
    const {e,spawn,dummy}=await fixture(),u=spawn('chicken'),target=dummy(1,{x:15.48,y:14});e.random=()=>.9;
    target.x=u.x+u.radius+target.radius-.01;e.status(u,kind,.2);e.step(.1);assert.equal(u.alive,true,kind);close(target.hp,5000);
    u.statuses=[];e.step(1/30);assert.equal(u.alive,false,kind);close(target.hp,4900);assert.equal(u.shots,0);
  }
});

test('Chicken cannot acquire flying or untargetable cards and remains still in body contact until a legal target exists',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('chicken'),flyer=dummy(1,{x:15.4,y:14});flyer.def.combat.movementType='flying';e.step(.1);assert.equal(u.alive,true);
  flyer.def.combat.movementType='ground';e.status(flyer,'untargetable',1);e.step(.1);assert.equal(u.alive,true);
  flyer.statuses=[];e.random=()=>.9;e.step(1/30);assert.equal(u.alive,false);close(flyer.hp,4900);
});

test('Silence and Misfortune suppress a Chicken death explosion, with no repeat or per-victim reroll',async()=>{
  for(const kind of ['silence','misfortune']){
    const {e,spawn,dummy,kill}=await fixture(),u=spawn('chicken'),a=dummy(),b=dummy(1,{x:15.8,y:14});
    e.status(u,kind,2,.1);e.random=()=>0;kill(u);assert.equal(u.alive,false);close(a.hp,5000);close(b.hp,5000);
    assert.equal(e.state.effects.some(f=>f.type==='blastArea'),false);e._drainDeaths();close(a.hp,5000);
  }
});

test('Chicken consumes itself on contact even when Misfortune makes its single explosion miss',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('chicken'),target=dummy(1,{x:15.4,y:14});
  e.status(u,'misfortune',2,.1);e.random=()=>0;e.step(1/30);
  assert.equal(u.alive,false);close(target.hp,5000);assert.equal(e.state.effects.some(f=>f.type==='blastArea'),false);
  e.step(1);close(target.hp,5000);
});

test('Chicken pauses cleanly and chains each dead Chicken only once',async()=>{
  const {e,spawn,dummy}=await fixture(),a=spawn('chicken'),b=spawn('chicken',1,{x:15.48,y:14}),target=dummy(1,{x:15.8,y:14});e.random=()=>.9;
  e.setPaused(true);e.step(1);assert.equal(a.alive,true);e.setPaused(false);e.step(1/30);
  assert.equal(a.alive,false);assert.equal(b.alive,false);assert.equal(e.state.effects.filter(f=>f.type==='blastArea').length,2);close(target.hp,4900);
  e._drainDeaths();close(target.hp,4900);
});

test('one paid Chicken deployment charges six mana and later contact has no extra resource cost',async()=>{
  const {e,dummy}=await fixture();e.teams[0].hand[0]='chicken';const result=e.deploy(0,0,{x:7,y:14});assert.equal(result.ok,true);
  assert.equal(e.teams[0].spentMana,6);assert.equal(e.teams[0].deployed,1);const u=result.units[0],target=dummy(1,{x:u.x+.4,y:u.y});target.x=u.x+u.radius+target.radius-.01;e.random=()=>.9;e.step(1/30);
  assert.equal(u.alive,false);assert.equal(e.teams[0].spentMana,6);assert.equal(e.teams[0].queue.at(-1),'chicken');
});
