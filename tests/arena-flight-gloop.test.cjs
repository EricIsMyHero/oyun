const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const modules=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/map.mjs'),import('../arena/js/vision.mjs')]);
const catalogPromise=modules.then(([, {buildCatalog}])=>buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json')))));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
async function fixture(){
  const [{ArenaEngine},,{routeFor,pointOnRoute,projectSegment,distance},vision]=await modules,catalog=await catalogPromise;
  const e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:catalog.cards.filter(c=>c.ready).slice(0,8).map(c=>c.id),spellDeck:['healing-light'],bot:false,seed:28});
  const dummy=(side,point={x:17,y:14},stats={})=>{
    const def=structuredClone(catalog.byId.get('hammies'));def.id='flight-gloop-dummy';def.forms=[];
    Object.assign(def.stats,{health:1000,shield:0,speed:0,damage:0,range:0,life:0,dodge:0,criticalChance:0,healrecovery:0,shieldrecovery:0,flexibility:0,damageminimiser:0,...stats});def.combat.attackType='none';
    return e.spawn(def,side,point,1,{count:1})[0];
  };
  const gloop=(point={x:17,y:14},side=0)=>{
    const u=e.spawn(catalog.byId.get('gloop'),side,point,1,{count:1})[0];u.stats.speed=0;return u;
  };
  return {e,catalog,dummy,gloop,routeFor,pointOnRoute,projectSegment,distance,...vision};
}

test('flying cards follow each deployed corridor for both teams, rather than cutting toward the castle',async()=>{
  for(const side of [0,1])for(const lane of [0,1,2]){
    const {e,catalog,routeFor,pointOnRoute,projectSegment,distance}=await fixture(),route=routeFor(lane,side);
    const start=pointOnRoute(lane,side,3),u=e.spawn(catalog.byId.get('hornets'),side,start,lane,{count:1})[0];
    for(let i=0;i<240;i++){
      e.step(1/30);
      const deviation=Math.min(...route.slice(1).map((b,j)=>projectSegment(u,route[j],b).distance));
      assert.ok(deviation<.26,`team ${side}, lane ${lane}: ${deviation}`);
    }
    assert.equal(u.lane,lane);assert.ok(distance(u,start)>2);assert.equal(u.shots,0);
  }
});

test('paid flying formations retain the selected outer corridor',async()=>{
  for(const side of [0,1])for(const lane of [0,2]){
    const {e,catalog,routeFor,pointOnRoute}=await fixture();
    e.teams[side].hand[0]='hornets';e.teams[side].mana=20;
    const p=pointOnRoute(lane,side,4),result=e.deploy(side,0,p);
    assert.equal(result.ok,true,result.error);assert.equal(result.units.length,catalog.byId.get('hornets').stats.number);
    assert.ok(result.units.every(u=>u.lane===lane));e.step(3);
    assert.ok(result.units.every(u=>u.alive&&u.lane===lane&&(lane===0?u.y<p.y:u.y>p.y)));
  }
});

test('every playable flying profile damages an encountered legal enemy before the castle',async()=>{
  const {catalog}=await fixture();
  for(const def of catalog.forms.filter(c=>c.ready&&c.combat.movementType==='flying'))for(const side of [0,1]){
    const {e,dummy}=await fixture(),u=e.spawn(def,side,{x:17,y:14},1,{count:1})[0];
    const t=dummy(1-side,{x:17+(side?-.8:.8),y:14});
    e.step(3);assert.ok(t.hp<1000,`${def.id}, team ${side} must strike the encountered unit`);
    assert.ok(e.castles.every(c=>c.hp===c.maxHp));
  }
});

test('a flyer returns to its chosen corridor after pursuing an enemy',async()=>{
  const {e,catalog,dummy,routeFor,projectSegment}=await fixture();
  const route=routeFor(0,0),u=e.spawn(catalog.byId.get('hornets'),0,{x:13,y:4},0,{count:1})[0];
  const t=dummy(1,{x:13.5,y:4.9});e.step(1);assert.ok(u.y>4);
  e.damage(null,t,10000,{kind:'spell'});e.step(8);
  assert.equal(u.lane,0);assert.ok(Math.min(...route.slice(1).map((b,j)=>projectSegment(u,route[j],b).distance))<.26);
  assert.equal(u.memory.pursuing,undefined);
});

test('Gloop source data specifies 100 seconds and the matching star-level reference',async()=>{
  const {catalog}=await fixture(),def=catalog.byId.get('gloop');
  assert.equal(def.stats.life,100);assert.equal(def.raw.additionalStats.life,'100s');
  assert.match(def.raw.trait,/100 saniyə/);assert.match(def.raw.trait,/1%/);
  assert.match(def.raw.showlevels.level3,/100s » 120s/);
});

test('Gloop loses exactly one percent of maximum health at each second and pauses with the match',async()=>{
  const {e,gloop}=await fixture(),u=gloop();
  e.step(.9);close(u.hp,1000);e.step(.1);close(u.hp,990);e.step(1);close(u.hp,980);
  e.setPaused(true);e.step(20);close(u.hp,980);close(e.time,2);
  e.setPaused(false);e.step(1);close(u.hp,970);
});

test('Gloop ageing ignores shields, damage reduction and combat status immunities',async()=>{
  for(const status of ['silence','frozen','imprisonment','untouchable','immortal','misfortune']){
    const {e,gloop}=await fixture(),u=gloop();u.shield=u.maxShield=500;u.stats.damageminimiser=90;
    e.status(u,status,101,1);e.step(2);close(u.hp,980);close(u.shield,500);
    e.step(98);assert.equal(u.alive,false,`${status} cannot extend natural life`);
  }
});

test('healing offsets ageing but cannot extend the hard 100-second lifetime',async()=>{
  const {e,gloop}=await fixture(),u=gloop();e.step(99);assert.equal(u.alive,true);close(u.hp,10);
  e.heal(u,990);close(u.hp,1000);e.step(1);assert.equal(u.alive,false);close(e.time,100);
  assert.equal(e.state.events.filter(ev=>ev.type==='death'&&ev.unitId===u.id).length,1);
  assert.equal(e.state.effects.filter(fx=>fx.type==='explosion').length,1);
});

test('Gloop approaches into actual body contact before engulfing instead of applying a root aura',async()=>{
  const {e,gloop,dummy,distance}=await fixture(),u=gloop(),t=dummy(1,{x:17.8,y:14});u.stats.speed=800;
  e.step(1/30);assert.equal(t.engulfedBy,undefined);assert.ok(u.x>17);
  for(let i=0;i<30&&!t.engulfedBy;i++)e.step(1/30);
  assert.equal(t.engulfedBy,u.id);assert.equal(t.statuses.some(s=>s.kind==='root'),false);
  close(distance(u,t),0);assert.equal(e.captivesOf(u).length,1);
});

test('engulfed enemies cannot act, scout, collide or contest a pump and take damage inside Gloop',async()=>{
  const {e,gloop,dummy,isEntityVisible,visibilitySources}=await fixture();
  const u=gloop({x:21.5,y:14}),t=dummy(1,{x:21.9,y:14},{damage:100,speed:1000,range:5000});
  t.def.combat.attackType='ranged';assert.equal(e.engulf(u,t),true);
  assert.equal(isEntityVisible(e.state,1,t),false);assert.equal(isEntityVisible(e.state,0,t),false);
  assert.equal(visibilitySources(e.state,1).some(s=>s.x===t.x&&s.y===t.y),false);
  assert.equal(e.canTarget(u,t),false);assert.ok(!e.near(u,1).includes(t));
  e.step(1);close(t.hp,990);assert.equal(t.shots,0);close(u.hp,990);
  assert.equal(e.state.nodes[1].capturing,0);e.step(4);assert.equal(e.state.nodes[1].owner,0);
  u.stats.speed=800;e.step(.5);close(t.x,u.x);close(t.y,u.y);
  assert.doesNotThrow(()=>JSON.stringify(e.state),'captor references must not create state cycles');
});

test('Gloop damages every captive using its current damage and attack interval',async()=>{
  const {e,gloop,dummy}=await fixture(),u=gloop(),a=dummy(1,{x:17.3,y:14}),b=dummy(1,{x:16.7,y:14});
  assert.equal(e.engulf(u,a),true);assert.equal(e.engulf(u,b),true);
  u.stats.damage=20;e.status(u,'attackHaste',3,1);e.step(1);close(a.hp,960);close(b.hp,960);
  e.status(u,'silence',1);e.step(.9);close(a.hp,960);close(b.hp,960);
});

test('Gloop respects target layers, structure immunity, Predominance and body contact',async()=>{
  const {e,gloop,dummy}=await fixture(),u=gloop(),t=dummy(1,{x:17.4,y:14});
  t.def.combat.movementType='flying';assert.equal(e.engulf(u,t),false);
  t.def.combat.movementType='hovering';assert.equal(e.engulf(u,t),true);e.cleanse(t);
  Object.assign(t,{x:17.4,y:14,isBuilding:true});assert.equal(e.engulf(u,t),false);t.isBuilding=false;
  assert.equal(e.engulf(u,e.castles[1]),false);
  t.side=0;assert.equal(e.engulf(u,t),false);t.side=1;
  t.x=17.8;assert.equal(e.engulf(u,t),false);t.x=17.4;
  e.status(t,'predominance',3);assert.equal(e.engulf(u,t),false);
  t.statuses=[];e.status(t,'untargetable',3);assert.equal(e.engulf(u,t),false);
  t.statuses=[];e.status(t,'untouchable',3);assert.equal(e.engulf(u,t),true);e.step(1);close(t.hp,1000);
});

test('engulfed cards cannot deal damage or take outside damage; Cleanse releases them',async()=>{
  const {e,gloop,dummy,isEntityVisible}=await fixture(),u=gloop(),t=dummy(1,{x:17.4,y:14}),other=dummy(0,{x:18,y:14});
  e.engulf(u,t);
  assert.equal(e.damage(t,u,100,{kind:'ability'}).total,0);
  assert.equal(e.damage(other,t,100,{kind:'spell'}).total,0);
  assert.equal(e.damage(u,t,10,{kind:'ability'}).total,10);
  const before={x:t.x,y:t.y};e.push(t,other,3);assert.deepEqual({x:t.x,y:t.y},before);
  e.cleanse(t);assert.equal(t.engulfedBy,undefined);assert.equal(e.captivesOf(u).length,0);
  assert.equal(t.statuses.some(s=>s.kind==='engulfed'),false);assert.equal(isEntityVisible(e.state,1,t),true);
});

test('Gloop death releases survivors before its existing 150-damage explosion, exactly once',async()=>{
  const {e,gloop,dummy,distance}=await fixture(),u=gloop(),t=dummy(1,{x:17.4,y:14});
  e.engulf(u,t);e.step(1);close(t.hp,990);
  e.damage(null,u,10000,{kind:'spell'});e.step(1/30);
  assert.equal(t.engulfedBy,undefined);assert.equal(t.alive,true);close(t.hp,840);
  assert.ok(distance(u,t)>=u.radius+t.radius);assert.ok(e.units.includes(t));
  assert.equal(e.state.effects.filter(fx=>fx.type==='explosion').length,1);e.step(.1);close(t.hp,840);
});

test('Silence and natural expiry always release surviving captives',async()=>{
  for(const silenced of [false,true]){
    const {e,gloop,dummy}=await fixture(),u=gloop();e.step(99);
    const t=dummy(1,{x:17.4,y:14});e.engulf(u,t);if(silenced)e.status(u,'silence',2);
    e.step(1);assert.equal(u.alive,false);assert.equal(t.engulfedBy,undefined);assert.equal(t.alive,true);
    assert.equal(t.statuses.some(s=>s.kind==='engulfed'),false);
  }
});

test('a captive killed during digestion is removed without leaving an occupied body',async()=>{
  const {e,gloop,dummy}=await fixture(),u=gloop(),t=dummy(1,{x:17.4,y:14},{health:5});
  e.engulf(u,t);e.step(1);assert.equal(t.alive,false);assert.ok(!e.units.includes(t));
  assert.equal(e.captivesOf(u).length,0);assert.equal(t.engulfedBy,undefined);
});
