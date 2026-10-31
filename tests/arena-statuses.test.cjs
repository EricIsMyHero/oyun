const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const modules=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/abilities.mjs')]);
const catalogPromise=modules.then(([, {buildCatalog}])=>buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json')))));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
async function fixture(){
  const [{ArenaEngine}]=await modules,catalog=await catalogPromise;
  const base=structuredClone(catalog.byId.get('hammies'));base.id='status-fixture';base.forms=[];
  Object.assign(base.stats,{health:1000,shield:0,damage:10,attackSpeed:1,delay:0,number:1,range:3000,speed:1000,vision:8000,criticalChance:0,criticDamage:2,lifestealChance:0,healrecovery:0,shieldrecovery:0,life:0,dodge:0,flexibility:0,healBonus:0});
  base.attack={count:1,damage:10,interval:1,delay:0};Object.assign(base.combat,{attackType:'melee',attackDistance:1000,targets:'both'});
  const cards=Array.from({length:8},(_,i)=>({...structuredClone(base),id:`status-${i}`}));
  const e=new ArenaEngine({cards,spells:catalog.spells,deck:cards.map(c=>c.id),spellDeck:['healing-light'],bot:false});
  const make=(side,x=side?18:15,extra={})=>{
    const def=structuredClone(base);Object.assign(def.stats,{damage:0,speed:0,range:0,...extra});def.combat.attackType='none';
    return e.spawn(def,side,{x,y:14},1,{count:1})[0];
  };
  return {e,make,base,catalog};
}

test('Poison ticks every .75 seconds including the endpoint and slows movement by ten percent',async()=>{
  const {e,make}=await fixture(),u=make(1,18,{speed:1000});
  const status=e.status(u,'Poison',2.25,0,null,{amount:4});assert.equal(status.interval,.75);
  e.step(.7);close(u.hp,1000);e.step(.07);close(u.hp,996);
  e.step(.73);close(u.hp,992);e.step(.77);close(u.hp,988);
  assert.equal(u.statuses.some(s=>s.kind==='poison'),false);
  u.x=18;u.y=14;e.status(u,'poison',2,0,null,{amount:0});e._move(u,{x:17,y:14},1);close(u.x,17.1);
});

test('Burn ticks every second and reduces healing by twenty percent; Bleeding blocks healing',async()=>{
  const {e,make}=await fixture(),u=make(0);u.hp=500;
  e.status(u,'Burn',2,0,null,{amount:5});close(e.heal(u,100),80);
  e.step(.9);close(u.hp,580);e.step(.1);close(u.hp,575);e.step(1);close(u.hp,570);
  e.status(u,'Bleeding',2);assert.equal(e.heal(u,100),0);e.step(2);close(u.hp,550);
  assert.equal(e.heal(u,100),100);
});

test('Heal alias restores health at one-second intervals',async()=>{
  const {e,make}=await fixture(),u=make(0);u.hp=500;
  e.status(u,'Heal',3,4);e.step(3);close(u.hp,512);
});

test('Slow, Blind and Misfortune honor their minimum strengths and Blind reduces scouting',async()=>{
  const {e,make}=await fixture(),u=make(0,15,{range:4000}),enemy=make(1,22.5);
  assert.equal(e.status(u,'Slow',3,.01).magnitude,.1);
  assert.equal(e.status(u,'Misfortune',3,.01).magnitude,.1);
  assert.equal(e.status(u,'Blind',3,.01).magnitude,.125);
  close(e._range(u),3.5);
  const {isEntityVisible}=await import('../arena/js/vision.mjs');
  assert.equal(isEntityVisible(e.state,0,enemy),false);
  e.cleanse(u);assert.equal(isEntityVisible(e.state,0,enemy),true);
});

test('Untouchable and Untargetable block every damage category; only Untargetable blocks targeting',async()=>{
  const {e,make}=await fixture(),u=make(0),t=make(1);
  for(const kind of ['Untouchable','Untargetable']) {
    e.status(t,kind,2);
    for(const type of ['attack','spell','dot','ability','reflect'])assert.equal(e.damage(u,t,100,{kind:type}).total,0);
    assert.equal(e.canTarget(u,t),kind==='Untouchable');e.cleanse(t);t.statuses=[];
  }
});

test('Immortal prevents death and Invisibility breaks only after actual incoming damage',async()=>{
  const {e,make}=await fixture(),u=make(0),t=make(1);
  e.status(t,'Immortal',2);e.damage(u,t,5000,{kind:'spell'});assert.equal(t.hp,1);assert.equal(t.alive,true);
  e.status(t,'Invisibility',3);assert.equal(e.canTarget(u,t),false);
  e.status(t,'untouchable',1);e.damage(u,t,1,{kind:'spell'});assert.ok(t.statuses.some(s=>s.kind==='invisible'));
  t.statuses=t.statuses.filter(s=>s.kind!=='untouchable');t.hp=50;e.damage(u,t,.5,{kind:'spell'});
  assert.equal(t.statuses.some(s=>s.kind==='invisible'),false);
});

test('Predominance blocks every Codex negative effect, including forced taunt and knockback',async()=>{
  const {e,make}=await fixture(),u=make(0),t=make(1);
  e.status(u,'Predominance',5);const before={x:u.x,y:u.y};
  for(const kind of ['burn','poison','slow','silence','blind','statReduction','curse','stun','bleed','misfortune','imprisonment','root','airborne','betrayal','frozen','taunted','knockback'])assert.equal(e.status(u,kind,2,.2,t,{stats:{damage:5}}),null,kind);
  e.push(u,t,3);assert.equal(u.x,before.x);assert.equal(u.y,before.y);
  t.statuses=[];e.status(t,'poison',3,0,u,{amount:4});e.status(t,'frozen',2);e.status(t,'Predominance',3);
  assert.deepEqual(t.statuses.map(s=>s.kind),['predominance']);
});

test('Cleanse removes all new negative effects and prevents a cleansed Frozen from creating a delayed slow',async()=>{
  const {e,make}=await fixture(),u=make(0);
  for(const kind of ['frozen','airborne','betrayal','taunted','poison','statReduction'])e.status(u,kind,1,0,null,{stats:{damage:5}});
  e.status(u,'reflection',5);e.status(u,'Cleanse',0);
  assert.deepEqual(u.statuses.map(s=>s.kind),['reflection']);e.step(2);assert.equal(u.statuses.some(s=>s.kind==='slow'),false);
});

test('Fearless protects a lone card or a card surrounded by at least six enemies',async()=>{
  const {e,make}=await fixture(),u=make(0),foe=make(1,17);
  e.status(u,'Fearless',10,.25,u,{radius:5});close(e.damage(foe,u,100,{kind:'spell'}).total,75);
  make(0,16);close(e.damage(foe,u,100,{kind:'spell'}).total,100);
  for(let i=0;i<4;i++)make(1,18+i*.3);
  close(e.damage(foe,u,100,{kind:'spell'}).total,100);
  make(1,19.5);close(e.damage(foe,u,100,{kind:'spell'}).total,75);
});

test('Taunt overrides a burst target, respects immunity and can be cleansed',async()=>{
  const {e,make}=await fixture(),taunter=make(0,15,{range:5000}),other=make(0,17),enemy=make(1,18,{range:5000});
  enemy.burstTargetId=other.id;enemy.burstIndex=2;e.status(taunter,'Taunt',3);
  assert.equal(e._target(enemy),taunter);assert.equal(enemy.burstTargetId,null);
  e.cleanse(enemy);assert.equal(e._target(enemy),other);
  e.status(enemy,'predominance',5);taunter.statuses=[];e.status(taunter,'taunt',3);
  assert.equal(enemy.statuses.some(s=>s.kind==='taunted'),false);
});

test('Berserk uses supplied health threshold and bonuses without altering base stats',async()=>{
  const {e,make}=await fixture(),u=make(0,15,{damage:10,attackSpeed:1});
  assert.equal(e.status(u,'Berserk',3,.5),null,'a missing threshold is not invented');
  e.status(u,'Berserk',3,0,u,{threshold:.5,damageBonus:1,attackSpeedBonus:.5});
  assert.equal(e.statValue(u,'damage'),10);u.hp=400;
  assert.equal(e.statValue(u,'damage'),20);close(e.statValue(u,'attackSpeed'),2/3);
  u.def.combat.attackType='melee';const target=make(1,15.6);e._fire(u,target);close(target.hp,980);close(u.cooldown,2/3);
  assert.equal(u.stats.damage,10);e.step(3);assert.equal(e.statValue(u,'damage'),10);
});

test('Reflection returns actual damage of every type once and cannot bounce infinitely',async()=>{
  const {e,make}=await fixture(),u=make(0),t=make(1);
  e.status(u,'Reflection',5);e.status(t,'Reflection',5);
  for(const kind of ['attack','spell','ability','dot']) {
    u.hp=t.hp=1000;e.damage(u,t,20,{kind});close(u.hp,980);close(t.hp,980);
  }
});

test('Stat Reduction affects damage, speed, range, attack timing and vital caps, then expires cleanly',async()=>{
  const {e,make}=await fixture(),u=make(0,15,{damage:20,speed:1000,range:4000,attackSpeed:1,shield:100});
  e.status(u,'Stat Reduction',2,0,null,{stats:{damage:5,speed:500,range:1000,attackSpeed:.5,health:100,shield:40}});
  assert.equal(e.statValue(u,'damage'),15);close(e.statValue(u,'speed'),500);close(e._range(u),3);close(e.statValue(u,'attackSpeed'),1.5);
  assert.equal(u.hp,900);assert.equal(u.shield,60);assert.equal(e.heal(u,50),0);
  u.def.combat.attackType='melee';const target=make(1,15.6);e._fire(u,target);close(target.hp,985);close(u.cooldown,1.5);
  const x=u.x;e._move(u,{x:25,y:14},1);close(u.x-x,.5);
  e.giveShield(u,25);assert.equal(u.shield,85);assert.equal(e.maxShield(u),85);
  e.step(2);assert.equal(e.statValue(u,'damage'),20);assert.equal(e.maxHealth(u),1000);assert.equal(u.hp,900);
  assert.equal(u.stats.damage,20);assert.equal(u.stats.range,4000);
});

test('Curse increases incoming damage and Silence disables native abilities',async()=>{
  const {e,make,catalog}=await fixture(),u=make(0),t=make(1);
  e.status(t,'Curse',3,.5);close(e.damage(u,t,100,{kind:'spell'}).total,150);
  const [snake]=e.spawn(catalog.byId.get('snaykies'),0,{x:16,y:14},1,{count:1});
  e.status(snake,'Silence',3);e._resolveHit(snake,t,{damage:10,kind:'attack'});
  assert.equal(t.statuses.some(s=>s.kind==='poison'),false);
});

test('Misfortune suppresses attack-triggered abilities and harmful ability damage/statuses together',async()=>{
  const {e,make,catalog}=await fixture(),t=make(1,18);
  const [chrono]=e.spawn(catalog.byId.get('chrono-mage'),0,{x:15,y:14},1,{count:1});chrono.shots=4;
  e.status(chrono,'Misfortune',5,1);e._fire(chrono,t);
  assert.equal(e.state.projectiles.length,0);assert.equal(t.statuses.length,0);assert.equal(chrono.memory.lastWave,undefined);
  const [,,{ABILITIES}]=await modules;
  ABILITIES['status-fixture']={tick(ctx,u){ctx.damage(u,t,50,{kind:'ability'});ctx.status(t,'slow',2,.5,u);}};
  try{const source=make(0);e.status(source,'misfortune',3,1);const hp=t.hp;e._hook('tick',source,.1);assert.equal(t.hp,hp);assert.equal(t.statuses.length,0);}
  finally{delete ABILITIES['status-fixture'];}
  assert.equal(e.status(t,'stun',2,0,chrono),null);
  assert.equal(e.status(chrono,'taunt',2),null);
});

test('Misfortune also suppresses healing, shield and buff abilities, without delaying their spent timer',async()=>{
  const {e,make,catalog}=await fixture(),u=make(0),t=make(0,17);t.hp=500;
  e.status(u,'misfortune',10,1);
  assert.equal(e.heal(t,50,u),0);assert.equal(e.giveShield(t,50,u),0);assert.equal(e.status(t,'Heal',3,5,u),null);
  assert.equal(e.useAbility(u,()=>{u.memory.gain=true;}),false);assert.equal(u.memory.gain,undefined);
  const [manager]=e.spawn(catalog.byId.get('m-manager'),0,{x:14,y:14},1,{count:1});
  e.status(manager,'misfortune',20,1);const mana=e.teams[0].mana;e._hook('tick',manager,9);assert.equal(e.teams[0].mana,mana);
  e.cleanse(manager);e._hook('tick',manager,9);assert.equal(e.teams[0].mana,mana+1);
});

test('Stun stops movement and attacks while Root allows attacks; Imprisonment and Airborne also block damage',async()=>{
  for(const kind of ['stun','root','imprisonment','airborne']){
    const {e,make,base}=await fixture(),t=make(1,15.6),def=structuredClone(base);const [u]=e.spawn(def,0,{x:15,y:14},1,{count:1});
    e.status(u,kind,2);e.step(.2);close(u.x,15);close(u.y,14);
    assert.equal(u.shots>0,kind==='root',kind);
    if(['imprisonment','airborne'].includes(kind))assert.equal(e.damage(u,t,50,{kind:'ability'}).total,0,kind);
    if(kind==='imprisonment'){assert.equal(e.damage(t,u,50,{kind:'spell'}).total,0);assert.equal(e.canTarget(t,u),false);}
  }
});

test('Betrayal targets and damages own allies without changing ownership or harming its own castle',async()=>{
  const {e,make}=await fixture(),u=make(0,15,{range:5000}),ally=make(0,16),enemy=make(1,17);
  e.status(u,'Betrayal',2);assert.equal(u.side,0);assert.equal(e._target(u),ally);
  assert.equal(e.damage(u,enemy,10,{kind:'attack'}).total,0);assert.equal(e.damage(u,ally,10,{kind:'attack'}).total,10);
  assert.equal(e.canTarget(u,e.castles[0]),false);e.cleanse(u);assert.equal(e._target(u),enemy);
});

test('Frozen blocks actions then applies exactly three seconds of twenty-five-percent Slow',async()=>{
  const {e,make}=await fixture(),u=make(0,15,{speed:1000});
  e.status(u,'Frozen',1);e.step(.9);assert.equal(u.x,15);
  e.step(.1);const slow=u.statuses.find(s=>s.kind==='slow');assert.ok(slow);close(slow.until,4);assert.equal(slow.magnitude,.25);
  const x=u.x;e._move(u,{x:25,y:14},1);close(u.x-x,.75);e.step(3);assert.equal(u.statuses.some(s=>s.kind==='slow'),false);
});

test('Knockback is instantaneous and uses tiles; hover immunity rejects only ground-only effects',async()=>{
  const {e,make}=await fixture(),u=make(0),t=make(1,18);
  e.status(t,'Knockback',0,3,u);close(t.x,21);assert.equal(t.statuses.length,0);
  t.def.combat.groundEffectImmune=true;
  assert.equal(e.status(t,'Frozen',3,0,u,{groundOnly:true}),null);
  assert.ok(e.status(t,'Frozen',3,0,u));
});

for(const [id,count,amount] of [['snaykies',2,4],['bees',8,2],['toxic',2,3]])test(`${id} poison deals the authored ticks and persists after its caster dies`,async()=>{
  const {e,make,catalog}=await fixture(),t=make(1,16),def=structuredClone(catalog.byId.get(id));
  Object.assign(def.stats,{range:0,speed:0,criticalChance:0,lifestealChance:0});
  const [u]=e.spawn(def,0,{x:15,y:14},1,{count:1});
  e._resolveHit(u,t,{damage:10,kind:'attack'});assert.ok(t.statuses.some(s=>s.kind==='poison'));
  if(u.alive)e.damage(null,u,10000,{kind:'spell',bypassShield:true});e.step(count*.75+.05);
  close(t.hp,1000-10-count*amount);assert.equal(e.statusSources.size,0);assert.doesNotThrow(()=>JSON.stringify(e.state));
});

test('successive poison attacks each retain their full authored damage packet',async()=>{
  const {e,make,catalog}=await fixture(),t=make(1),def=structuredClone(catalog.byId.get('toxic'));
  def.stats.range=0;def.stats.speed=0;const [u]=e.spawn(def,0,{x:15,y:14},1,{count:1});
  e._resolveHit(u,t,{damage:1,kind:'attack'});e._resolveHit(u,t,{damage:1,kind:'attack'});
  assert.equal(t.statuses.filter(s=>s.kind==='poison').length,2);e.step(1.51);close(t.hp,986);
});

test('Giga Bomb applies its impact and ten one-second burns to units and castles',async()=>{
  const {e,make}=await fixture();e.teams[0].spellIds=['giga-bomb'];e.teams[0].energy=20;
  const target=make(1,37.5,{health:2000});
  assert.equal(e.cast(0,{x:39,y:14}).ok,true);
  assert.equal(target.hp,1000);assert.equal(e.castles[1].hp,500);
  e.step(.9);assert.equal(target.hp,1000);assert.equal(e.castles[1].hp,500);
  e.step(9.1);close(target.hp,750);close(e.castles[1].hp,450);
  assert.equal(e.statusSources.size,0);
});
