const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const modules=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/vision.mjs')]);
const catalogPromise=modules.then(([, {buildCatalog}])=>buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json')))));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
async function fixture(){
  const [{ArenaEngine},,vision]=await modules,catalog=await catalogPromise;
  const e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:catalog.cards.filter(c=>c.ready).slice(0,8).map(c=>c.id),spellDeck:['healing-light'],bot:false,seed:26});
  const spawn=(id='whisper',side=0,p={x:15,y:14},stats={})=>{
    const def=structuredClone(catalog.byId.get(id));Object.assign(def.stats,{speed:0,criticalChance:0,dodge:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...stats});
    const [u]=e.spawn(def,side,p,1,{count:1});u.cooldown=Infinity;return u;
  };
  const host=(side=1,p={x:16.5,y:14},stats={})=>{
    const def=structuredClone(catalog.byId.get('hammies'));def.id='whisper-host';def.forms=[];def.combat.attackType='none';
    Object.assign(def.stats,{health:1000,shield:0,damage:0,range:0,speed:0,dodge:0,criticalChance:0,healrecovery:0,shieldrecovery:0,...stats});
    const [u]=e.spawn(def,side,p,1,{count:1});u.cooldown=Infinity;return u;
  };
  return {e,catalog,spawn,host,vision};
}

test('Whisper unlocks with authored cost, hovering movement, range and no invented attack interval',async()=>{
  const {catalog}=await fixture(),d=catalog.byId.get('whisper');assert.deepEqual(d.reasons,[]);assert.equal(d.stats.mana,6);assert.equal(d.stats.health,160);assert.equal(d.stats.range,1800);
  assert.equal(d.stats.damage,0);assert.equal(d.attack.interval,0);assert.equal(d.raw.stats.attackSpeed,'-');assert.equal(d.raw.stats.damage,'-');assert.equal(d.combat.movementType,'hovering');assert.equal(d.combat.weight,'very-light');
});

test('a paid Whisper takes a visible host from ranged distance and spends mana only once',async()=>{
  const {e,host}=await fixture();e.teams[0].hand[0]='whisper';const paid=e.deploy(0,0,{x:7,y:14});assert.equal(paid.ok,true);const u=paid.units[0],t=host(1,{x:8.5,y:14});
  e.step(1/30);assert.equal(t.side,0);assert.equal(u.possessingId,t.id);assert.equal(t.possessedBy,u.id);assert.equal(u.shots,0);close(t.hp,1000);assert.equal(e.teams[0].spentMana,6);assert.equal(e.teams[0].deployed,1);
  e.step(14);assert.equal(t.side,1);assert.equal(u.alive,false);assert.equal(e.teams[0].spentMana,6);assert.equal(e.teams[0].queue.at(-1),'whisper');
});

test('existing critical chance becomes seconds, not critical probability, without mutating source stats',async()=>{
  const {e,spawn,host}=await fixture(),u=spawn('whisper',0,{x:15,y:14},{criticalChance:5}),t=host(1,{x:16.5,y:14},{criticalChance:90});
  close(u.stats.criticalChance,0);close(u.def.stats.criticalChance,5);close(u.whisperState.bonusSeconds,5);assert.equal(e.possess(u,t),true);close(u.whisperState.until,19);close(t.stats.criticalChance,90);
});

test('new critical chance before and during possession is consumed once and extends active control',async()=>{
  const {e,spawn,host}=await fixture(),u=spawn('whisper',0,{x:15,y:14},{criticalChance:5});u.stats.criticalChance=2.5;e.step(1/30);close(u.whisperState.bonusSeconds,7.5);close(u.stats.criticalChance,0);
  const t=host();e.possess(u,t);const deadline=u.whisperState.until;u.stats.criticalChance=3;e.step(1/30);close(u.whisperState.until,deadline+3);close(u.whisperState.bonusSeconds,10.5);close(u.stats.criticalChance,0);
  e.step(2);close(u.whisperState.until,deadline+3);close(t.statuses.find(s=>s.kind==='possession').until,deadline+3);
});

test('a critical grant at the deadline is converted before an otherwise due expiry',async()=>{
  const {e,spawn,host}=await fixture(),u=spawn(),t=host();e.possess(u,t);e.step(13.9);u.stats.criticalChance=5;e.step(.1);assert.equal(t.side,0);assert.equal(u.alive,true);close(u.whisperState.until,19);
  e.step(5);assert.equal(t.side,1);assert.equal(u.alive,false);
});

test('Whisper never launches a basic attack or deals critical damage even with a forced critical flag',async()=>{
  const {e,spawn,host}=await fixture(),u=spawn(),t=host(1,{x:18,y:14});e._fire(u,t);assert.equal(u.shots,0);assert.equal(e.state.projectiles.length,0);
  const result=e.damage(u,t,10,{kind:'ability',critical:true,criticalMultiplier:5});close(result.total,10);close(t.hp,990);assert.equal(e.state.effects.find(s=>s.type==='hit').critical,false);
  u.stats.criticalChance=100;e.step(1/30);close(u.stats.criticalChance,0);close(u.whisperState.bonusSeconds,100);
});

test('a controlled host retains its own critical chance and damage multiplier',async()=>{
  const {e,spawn,host}=await fixture(),u=spawn(),t=host(1,{x:16.5,y:14},{damage:10,criticalChance:100,criticDamage:2}),enemy=host(1,{x:17.1,y:14});t.def.combat.attackType='melee';e.random=()=>.5;
  e.possess(u,t);e._fire(t,enemy);close(enemy.hp,980);close(t.stats.criticalChance,100);close(u.stats.criticalChance,0);
});

test('time expiry restores the same actor, current health, shield, lane, position and original route',async()=>{
  const {e,spawn,host}=await fixture(),u=spawn(),t=host(1,{x:16.5,y:14},{shield:100}),id=t.id,group=t.groupId,route=structuredClone(t.route);t.hp=750;t.shield=40;e.possess(u,t);
  t.hp=611;t.shield=17;e.step(14);assert.equal(t.id,id);assert.equal(t.groupId,group);assert.equal(t.side,1);close(t.hp,611);close(t.shield,17);close(t.x,16.5);close(t.y,14);assert.equal(t.lane,1);assert.deepEqual(t.route,route);assert.equal(t.possessedBy,undefined);assert.equal(t.statuses.some(s=>s.kind==='possession'),false);
});

test('host death immediately removes Whisper and resolves each disappearance only once',async()=>{
  const {e,spawn,host}=await fixture(),u=spawn(),t=host();e.possess(u,t);e.damage(null,t,10000,{kind:'spell'});assert.equal(t.alive,false);assert.equal(u.alive,false);assert.equal(u.possessingId,undefined);assert.equal(t.possessedBy,undefined);
  e._drainDeaths();assert.equal(e.state.events.filter(s=>s.type==='death').length,2);assert.equal(e.units.length,0);e.endPossession(u);e._drainDeaths();assert.equal(e.state.events.filter(s=>s.type==='death').length,2);
});

test('Whisper disappearance gives no kill credit or direct damage to its living host',async()=>{
  const {e,spawn,host}=await fixture(),u=spawn(),t=host();e.possess(u,t);e.step(14);assert.equal(t.alive,true);close(t.hp,1000);assert.equal(t.hits,0);assert.equal(t.damageWindow.length,0);assert.equal(e.state.events.filter(s=>s.type==='death').length,1);
});

test('the lost Whisper body cannot scout, be seen, be targeted, collide or receive new effects',async()=>{
  const {e,spawn,host,vision}=await fixture(),u=spawn(),t=host(),enemy=host(1,{x:17,y:14});e.possess(u,t);
  assert.equal(vision.isEntityVisible(e.state,0,u),false);assert.equal(vision.isEntityVisible(e.state,1,u),false);assert.equal(e.canTarget(enemy,u),false);assert.equal(e.canTarget(u,enemy),false);
  assert.equal(vision.visibilitySources(e.state,0).filter(s=>s.x===t.x&&s.y===t.y).length,1);assert.equal(e.near(t,1).includes(u),false);
  close(e.damage(enemy,u,100,{kind:'spell'}).total,0);close(e.damage(u,enemy,100,{kind:'ability',persistentField:true}).total,0);assert.equal(e.status(u,'burn',5,0,enemy,{amount:10}),null);close(e.heal(u,10),0);close(e.giveShield(u,10),0);close(e.loseHealth(u,10),0);
  const x=t.x;e._separation();close(t.x,x);t.x=17;e.step(1/30);close(u.x,t.x);close(u.y,t.y);
});

test('a banished host does not leave an independent Whisper body capturing its mana pump',async()=>{
  const {e,spawn,host}=await fixture(),node=e.state.nodes[1],u=spawn('whisper',0,{x:node.x-.5,y:node.y}),t=host(1,node),enemy=host(1,{x:node.x+.5,y:node.y});e.possess(u,t);assert.equal(e.banish(enemy,t,10),true);enemy.x+=10;
  e._objectives(1);assert.equal(node.capturing,null);assert.equal(t.possessedBy,u.id);assert.equal(u.alive,true);
});

test('Misfortune failure and Predominance shorten control by 25 percent rather than blocking it',async()=>{
  for(const scenario of ['misfortune','predominance','both','successful-accuracy']){
    const {e,spawn,host}=await fixture(),u=spawn(),t=host();
    if(scenario!=='predominance')e.status(u,'misfortune',30,.1);if(['predominance','both'].includes(scenario))e.status(t,'predominance',30);
    e.random=()=>scenario==='successful-accuracy'?.5:0;assert.equal(e.possess(u,t),true);assert.equal(t.side,0);close(u.whisperState.until,scenario==='successful-accuracy'?14:10.5);
  }
});

test('Cleanse cannot remove priority control and repeating Predominance cannot stack penalties',async()=>{
  const {e,spawn,host}=await fixture(),u=spawn(),t=host();e.status(t,'predominance',30);e.possess(u,t);close(u.whisperState.until,10.5);
  e.cleanse(t);assert.equal(t.side,0);assert.equal(u.alive,true);assert.ok(t.statuses.some(s=>s.kind==='possession'));
  for(let i=0;i<5;i++)e.status(t,'predominance',30);close(u.whisperState.until,10.5);e.step(10.5);assert.equal(t.side,1);assert.equal(u.alive,false);
});

test('later Predominance shortens remaining time once and scales future critical seconds',async()=>{
  const {e,spawn,host}=await fixture(),u=spawn(),t=host();e.possess(u,t);e.step(6);e.status(t,'predominance',10);close(u.whisperState.until,12);assert.equal(u.alive,true);
  u.stats.criticalChance=4;e.step(1/30);close(u.whisperState.until,15);e.status(t,'predominance',20);close(u.whisperState.until,15);e.step(15-e.time);assert.equal(t.side,1);
});

test('late Predominance never instantly dispels a nearly expired possession',async()=>{
  const {e,spawn,host}=await fixture(),u=spawn(),t=host();e.possess(u,t);e.step(13);e.status(t,'predominance',10);close(u.whisperState.until,13.75);assert.equal(t.side,0);assert.equal(u.alive,true);
});

test('ordinary Flexibility and crowd control cannot cancel or further shorten locked ownership',async()=>{
  const {e,spawn,host}=await fixture(),u=spawn(),t=host(1,{x:16.5,y:14},{flexibility:80});e.possess(u,t);close(u.whisperState.until,14);
  for(const kind of ['silence','stun','frozen','imprisonment'])e.status(t,kind,50);e.cleanse(t);e.step(1);assert.equal(t.side,0);close(u.whisperState.until,14);
});

test('Illustration Spell and another Whisper cannot take an already possessed host',async()=>{
  const {e,catalog,spawn,host}=await fixture(),u=spawn(),t=host(),other=spawn('whisper',1,{x:18,y:14});e.possess(u,t);
  assert.equal(e.possess(other,t),false);assert.equal(e.possessionTarget(other),null);assert.equal(e.status(t,'conversion',20,1,other),null);
  e._applySpell(1,catalog.spellById.get('illustration-spell'),t,'illustration-spell');assert.equal(t.side,0);assert.equal(t.memory.conversion,undefined);assert.equal(t.possessedBy,u.id);
});

test('a lower-priority conversion resumes after Whisper when its original duration remains',async()=>{
  const {e,catalog,spawn,host}=await fixture(),t=host(0);e._applySpell(1,catalog.spellById.get('illustration-spell'),t,'illustration-spell');assert.equal(t.side,1);const u=spawn();
  e.possess(u,t);e.step(14);assert.equal(t.side,1);assert.equal(u.alive,false);e.step(6);assert.equal(t.side,0);
});

test('expired or cleansed lower-priority conversion cannot override active possession or restore a stale owner',async()=>{
  for(const mode of ['expire','cleanse']){
    const {e,catalog,spawn,host}=await fixture(),t=host(0);e._applySpell(1,catalog.spellById.get('illustration-spell'),t,'illustration-spell');const u=spawn();e.possess(u,t);
    if(mode==='expire'){t.statuses.find(s=>s.kind==='conversion').until=5;e.step(6);}else e.cleanse(t);
    assert.equal(t.side,0);assert.equal(t.possessedBy,u.id);assert.equal(u.alive,true);e.step(14-e.time);assert.equal(t.side,0);assert.equal(u.alive,false);
  }
});

test('a lower-priority change to the hidden caster cannot transfer its active control to another team',async()=>{
  const {e,catalog,spawn,host}=await fixture(),u=spawn('whisper',1);e._applySpell(0,catalog.spellById.get('illustration-spell'),u,'illustration-spell');u.statuses.find(s=>s.kind==='conversion').until=5;
  const t=host();assert.equal(e.possess(u,t),true);e.step(6);assert.equal(u.side,1);assert.equal(t.side,0);e.step(8);assert.equal(t.side,1);assert.equal(u.alive,false);
});

test('silencing or stunning Whisper before activation delays casting rather than granting physical immunity',async()=>{
  for(const kind of ['silence','stun','frozen','airborne']){
    const {e,spawn,host}=await fixture(),u=spawn(),t=host();e.status(u,kind,.2);assert.equal(e.possess(u,t),false);e.step(.1);assert.equal(t.side,1);e.cleanse(u);e.step(1/30);assert.equal(t.side,0);
  }
});

test('possession still requires a visible, targetable unit in range and excludes buildings and healthless forms',async()=>{
  const {e,spawn,host}=await fixture(),u=spawn(),t=host(1,{x:18,y:14});assert.equal(e.possess(u,t),false);t.x=16.5;
  t.isBuilding=true;assert.equal(e.possess(u,t),false);t.isBuilding=false;t.healthless=true;assert.equal(e.possess(u,t),false);t.healthless=false;
  e.status(t,'invisible',10);assert.equal(e.possess(u,t),false);e.cleanse(t);t.statuses=[];e.status(t,'untargetable',10);assert.equal(e.possess(u,t),false);t.statuses=[];assert.equal(e.possess(u,t),true);
});

test('possession and its critical-second accumulator freeze during pause',async()=>{
  const {e,spawn,host}=await fixture(),u=spawn(),t=host();e.possess(u,t);e.step(5);e.setPaused(true);u.stats.criticalChance=5;e.step(20);close(e.time,5);close(u.whisperState.until,14);close(u.stats.criticalChance,5);
  e.setPaused(false);e.step(1/30);close(u.whisperState.until,19);close(u.stats.criticalChance,0);assert.equal(t.side,0);
});

test('a controlled Tphoenix keeps possession across Egg/Phoenix forms and returns with current form health',async()=>{
  const {e,spawn}=await fixture(),u=spawn(),t=spawn('tphoenix',1,{x:16.5,y:14});e.possess(u,t);e.damage(null,t,361,{kind:'spell'});assert.equal(t.def.id,'tphoenix/fire-egg');assert.equal(t.possessedBy,u.id);
  e.step(10);assert.equal(t.def.id,'tphoenix/phoenix');assert.equal(t.side,0);e.step(4);assert.equal(t.side,1);close(t.hp,240);assert.equal(u.alive,false);
});

test('a possessed Format retains locked ownership when it copies another native card',async()=>{
  const {e,spawn}=await fixture(),u=spawn(),t=spawn('format',1,{x:16.5,y:14}),enemy=spawn('sheriff',1,{x:18.5,y:14},{health:100000});enemy.def.power=1000;
  e.possess(u,t);e.step(3);assert.equal(t.def.id,'sheriff');assert.equal(t.possessedBy,u.id);assert.equal(t.side,0);const hp=t.hp;
  e.step(11);assert.equal(t.def.id,'sheriff');assert.equal(t.side,1);close(t.hp,hp);assert.equal(u.alive,false);
});

test('Whisper leaves its Etheris reserve proportionally when its physical body disappears',async()=>{
  const {e,catalog,spawn,host}=await fixture(),etheris=structuredClone(catalog.byId.get('etheris'));etheris.combat.attackType='none';etheris.stats.speed=0;
  const pair=e.spawn(etheris,0,{x:14.5,y:14},1,{count:2}),u=spawn(),t=host();e.linkEtheris(pair[0]);assert.ok(u.sharedVitalsId);const pool=e._pool(u),hp=pool.hp,capacity=pool.maxHp,contribution=u.sharedVitalContribution.health;e.possess(u,t);
  assert.equal(u.sharedVitalsId,undefined);assert.equal(pool.members.length,2);close(pool.maxHp,capacity-contribution);close(pool.hp,hp*(capacity-contribution)/capacity);
  e.step(14);assert.equal(u.alive,false);assert.ok(pair.every(s=>s.alive));assert.equal(t.side,1);
});

test('depleting Whisper former shared reserve cannot interrupt already locked possession',async()=>{
  const {e,catalog,spawn,host}=await fixture(),etheris=structuredClone(catalog.byId.get('etheris'));etheris.combat.attackType='none';etheris.stats.speed=0;
  const pair=e.spawn(etheris,0,{x:14.5,y:14},1,{count:2}),u=spawn(),t=host();e.linkEtheris(pair[0]);e.possess(u,t);e.damage(null,pair[0],10000,{kind:'spell'});e._drainDeaths();
  assert.ok(pair.every(s=>!s.alive));assert.equal(u.alive,true);assert.equal(t.side,0);e.step(14);assert.equal(t.side,1);assert.equal(u.alive,false);
});

test('nested possession resolves host disappearance without recursion, orphaned links or duplicate deaths',async()=>{
  const {e,spawn,host}=await fixture(),outer=spawn('whisper',0,{x:15,y:14},{criticalChance:10}),inner=spawn('whisper',1,{x:16.5,y:14}),t=host(1,{x:18,y:14});
  assert.equal(e.possess(outer,inner),true);assert.equal(e.possess(inner,t),true);e.step(14);assert.equal(inner.alive,false);assert.equal(outer.alive,false);assert.equal(t.side,1);assert.equal(t.possessedBy,undefined);assert.equal(e.state.events.filter(s=>s.type==='death').length,2);assert.doesNotThrow(()=>JSON.stringify(e.state));
});

test('unbreakable ownership repairs a missing display marker without changing the deadline',async()=>{
  const {e,spawn,host}=await fixture(),u=spawn(),t=host();e.possess(u,t);t.statuses=[];e.step(1/30);assert.equal(t.side,0);assert.ok(t.statuses.some(s=>s.kind==='possession'));close(u.whisperState.until,14);
});

test('the bot preserves spell energy instead of wasting Illustration on a locked host',async()=>{
  const {createBotState}=await import('../arena/js/bot.mjs');const {e,spawn,host}=await fixture(),u=spawn('whisper',0,{x:34,y:14}),t=host(1,{x:35.5,y:14});e.possess(u,t);
  e.bot=true;e.botState=createBotState(e);e.botState.nextDeployAt=Infinity;e.botState.lastDeployAt=e.time;e.botClock=0;e.teams[1].spellIds=['illustration-spell'];e.teams[1].spellIndex=0;e.teams[1].energy=10;e._bot(.6);
  assert.equal(e.teams[1].energy,10);assert.equal(t.side,0);assert.equal(t.possessedBy,u.id);
});
