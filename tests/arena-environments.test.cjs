const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const modules=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/map.mjs'),import('../arena/js/environment.mjs'),import('../arena/js/camera.mjs')]);
let catalog;
async function fixture(arenaId='verdant',options={}){
  const [{ArenaEngine},{buildCatalog}]=await modules;
  catalog||=buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json'))));
  const e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:['hammies','b-b','scrapy','venomora','ben','freak','bethe','soldier'],spellDeck:['healing-light'],seed:172991,bot:false,arenaId,...options});
  e.castles.forEach(c=>c.cooldown=Infinity);
  const spawn=(side,point,movement='ground',stats={})=>{
    const def=structuredClone(catalog.byId.get('hammies'));def.id='environment-dummy';def.forms=[];def.combat={...def.combat,movementType:movement,groundEffectImmune:movement!=='ground',attackType:'none'};
    Object.assign(def.stats,{health:1000,shield:500,damage:0,speed:0,healrecovery:0,shieldrecovery:0,life:0,...stats});
    return e.spawn(def,side,point,e.closestRoute(point).lane,{count:1,positions:[point]})[0];
  };
  return {e,spawn};
}
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} ≈ ${expected}`);

test('all three arenas have distinct dimensions, lane counts and objective topology',async()=>{
  const [,,{MAP,ARENAS,routeLength,pointOnRoute,distance,isWalkable}]=await modules;
  assert.deepEqual(Object.values(ARENAS).map(m=>[m.routes.length,m.nodes.length]),[[3,3],[2,1],[1,0]]);
  assert.equal(new Set(Object.values(ARENAS).map(m=>`${m.width}x${m.height}`)).size,3);
  assert.equal(MAP,ARENAS.verdant);
  for(const map of Object.values(ARENAS))for(const route of map.routes){assert.deepEqual(route[0],map.bases[0]);assert.deepEqual(route.at(-1),map.bases[1]);assert.ok(route.every(p=>isWalkable(p,map)));}
  for(const side of [0,1])close(distance(pointOnRoute(0,side,12.5,ARENAS.waterfall),ARENAS.waterfall.nodes[0]),0);
  ARENAS.waterfall.routes.forEach(route=>close(routeLength(route),25));
  for(const side of [0,1])close(distance(pointOnRoute(0,side,15,ARENAS.lava),ARENAS.lava.center),0);
  const {plaza}=ARENAS.lava;close(plaza.maxX-plaza.minX,5);close(plaza.maxY-plaza.minY,5);
  assert.equal(isWalkable({x:19,y:11.4},ARENAS.lava),true);assert.equal(isWalkable({x:19,y:11.6},ARENAS.lava),false);
  assert.ok(Object.isFrozen(ARENAS.waterfall.routes[0][0]));
});

test('map bindings isolate simultaneous matches, movement bounds, deployment and camera',async()=>{
  const {e:a}=await fixture('lava'),{e:b}=await fixture('waterfall'),{e:c}=await fixture();
  assert.equal(a.routeFor(0,0).at(-1).x,34);assert.equal(b.routeFor(1,0).at(-1).x,25);assert.equal(c.routeFor(1,0).at(-1).x,39);
  for(const e of [a,b,c])for(const side of [0,1])for(let lane=0;lane<e.map.routes.length;lane++){
    const points=e._deploymentCandidates(side,lane);assert.ok(points.length>0);assert.ok(points.every(p=>e.isDeployable(p,side)));
    assert.ok(points.every(p=>Math.hypot(p.x-e.castles[side].x,p.y-e.castles[side].y)<=7.5+1e-7));
  }
  assert.equal(a.finitePoint({x:40,y:9}),false);assert.equal(c.finitePoint({x:40,y:9}),true);
  const [,,,,{ArenaCamera}]=await modules,cam=new ArenaCamera();cam.setMap(a.map);cam.setActive(true);cam.focus({x:100,y:100});assert.deepEqual(cam.center,{x:38,y:18});cam.setMap(b.map);assert.ok(cam.center.x<=29&&cam.center.y<=22);
});

test('seeded random match selection reaches all arenas and rejects unknown maps',async()=>{
  const ids=new Set();for(let i=1;i<=40;i++){const {e}=await fixture('random',{seed:i*100003});ids.add(e.map.id);const {e:again}=await fixture('random',{seed:i*100003});assert.equal(e.map.id,again.map.id);}
  assert.equal(ids.size,3);
  const adjacent=new Set();for(let seed=1000;seed<1020;seed++){const {e}=await fixture('random',{seed});adjacent.add(e.map.id);}assert.equal(adjacent.size,3);
  await assert.rejects(()=>fixture('missing'),/Unknown arena/);
});

test('water slows only ground movement, pulses for 30 of every 90 seconds, and pauses',async()=>{
  const {e,spawn}=await fixture('waterfall'),[,,,{terrainSlow}]=await modules;
  const p={x:11,y:7},ground=spawn(0,p,'ground',{speed:1000}),air=spawn(0,p,'flying'),hover=spawn(0,p,'hovering');
  close(terrainSlow(e,ground),.15);close(terrainSlow(e,air),0);close(terrainSlow(e,hover),0);
  const before={x:ground.x,y:ground.y};e._move(ground,null,.1);close(Math.hypot(ground.x-before.x,ground.y-before.y),.085);
  e.state.time=89.9;e.step(.1);assert.equal(e.state.arena.surge,true);close(terrainSlow(e,ground),.33);close(e.state.arena.nextPhaseAt,120);
  e.setPaused(true);e.step(40);close(e.time,90);assert.equal(e.state.arena.surge,true);
  e.setPaused(false);e.state.time=119.9;e.step(.1);assert.equal(e.state.arena.surge,false);close(e.state.arena.nextPhaseAt,180);
  e.state.time=179.9;e.step(.1);assert.equal(e.state.arena.surge,true);
});

test('lava pulses for 15 seconds and loses exactly one percent health per exposed second without consuming shield',async()=>{
  const {e,spawn}=await fixture('lava');const p={x:18,y:9},u=spawn(0,p),air=spawn(0,p,'flying'),hover=spawn(0,p,'hovering'),outside=spawn(0,{x:16.4,y:9});
  // Keep the stationary fixture in place: separation is irrelevant to exposure.
  e._separation=()=>{};e.state.arena.orb.available=false;e.state.arena.orb.respawnAt=999;
  e.step(44.9);close(u.hp,1000);e.step(.1);assert.equal(e.state.arena.lavaActive,true);close(e.state.arena.nextPhaseAt,60);
  e.step(1);close(u.hp,990);close(u.shield,500);close(air.hp,1000);close(hover.hp,1000);close(outside.hp,1000);
  assert.ok(e.state.effects.some(f=>f.type==='lifeLoss'&&f.cause==='lava'&&f.color==='#ff747d'));
  e.setPaused(true);e.step(30);close(u.hp,990);e.setPaused(false);e.step(14);assert.equal(e.state.arena.lavaActive,false);close(u.hp,850);close(e.state.arena.nextPhaseAt,90);
  e.step(29.9);assert.equal(e.state.arena.lavaActive,false);e.step(.1);assert.equal(e.state.arena.lavaActive,true);
});

test('orb grants first touching team five mana, caps at 20, grants a 30-second bonus and respawns five seconds later',async()=>{
  const {e,spawn}=await fixture('lava');const center=e.map.center;spawn(1,center,'flying');e.teams[1].mana=7;e.step(1/30);
  const orb=e.state.arena.orb,pickedAt=e.time;assert.equal(orb.available,false);assert.equal(orb.pickedBy,1);close(orb.bonusUntil[1],pickedAt+30);close(orb.respawnAt,pickedAt+35);assert.ok(e.teams[1].mana>12&&e.teams[1].mana<12.1);
  e.state.units=[];e.teams[1].mana=0;const before=e.teams[1].mana;e.step(1);close(e.teams[1].mana-before,1/1.3*1.02);
  e.setPaused(true);e.step(40);close(e.time,pickedAt+1);assert.equal(orb.available,false);e.setPaused(false);
  e.state.time=pickedAt+30;e.teams[1].mana=0;e.step(1);close(e.teams[1].mana,1/1.3);assert.equal(orb.available,false);
  e.state.time=pickedAt+34.9;e.step(.1);assert.equal(orb.available,true);
  e.teams[0].mana=19;spawn(0,center,'hovering');e.step(1/30);close(e.teams[0].mana,20);assert.equal(orb.pickedBy,0);
});

test('dead, captive, possessed and fused cards cannot collect the orb or take terrain damage',async()=>{
  const {e,spawn}=await fixture('lava');const units=[spawn(0,e.map.center),spawn(0,e.map.center),spawn(0,e.map.center),spawn(0,e.map.center)];
  units[0].engulfedBy='host';units[1].possessingId='host';units[2].fusedInto='host';units[3].alive=false;
  const [,,,{tickEnvironment}]=await modules;e.state.time=45;for(let i=0;i<40;i++)tickEnvironment(e,1/30);
  assert.equal(e.state.arena.orb.available,true);units.forEach(u=>close(u.hp,1000));
});

test('bot builds and plays valid independent decks on one and two lane arenas',async()=>{
  for(const id of ['waterfall','lava']){
    const {e}=await fixture(id,{bot:true});e.step(65);
    assert.ok(e.teams[1].deployed>1);assert.ok(e.units.filter(u=>u.side===1).every(u=>u.lane<e.map.routes.length));
    assert.ok(e.teams[1].mana>=0&&e.teams[1].mana<=20);assert.ok(e.units.every(u=>e.finitePoint(u)));
  }
});
