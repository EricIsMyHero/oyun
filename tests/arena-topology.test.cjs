const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const modules=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/map.mjs'),import('../arena/js/topology.mjs')]);let catalog;
async function fixture(arenaId,bot=false){
 const[{ArenaEngine},{buildCatalog}]=await modules;catalog||=buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json'))));
 const e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:['hammies','b-b','scrapy','venomora','ben','freak','bethe','soldier'],spellDeck:['healing-light'],bot,arenaId,seed:47291});e.castles.forEach(c=>c.cooldown=Infinity);
 const spawn=(p,side=0,movement='ground',speed=0,lane=e.closestRoute(p).lane)=>{
  const d=structuredClone(catalog.byId.get('hammies'));d.id='topology-dummy';d.forms=[];d.combat={...d.combat,movementType:movement,attackType:'none',groundEffectImmune:movement!=='ground'};Object.assign(d.stats,{health:1000,shield:500,damageminimiser:0,shieldtakendamage:70,speed,life:0,healrecovery:0,shieldrecovery:0,damage:0});
  return e.spawn(d,side,p,lane,{count:1,positions:[p]})[0];
 };return{e,spawn};
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ≈ ${b}`);

test('swamp has one main road and two real half-roads without a walkable link across the bog',async()=>{
 const[,,{ARENAS,isWalkable,routeLength,pointOnRoute}]=await modules,m=ARENAS.swamp;
 assert.equal(m.nodes.length,1);close(routeLength(m.routes[1]),32);assert.equal(isWalkable({x:20,y:13},m),true);assert.equal(isWalkable({x:20,y:10},m),false);
 const p=pointOnRoute(1,0,16.1,m);close(p.x,m.portals[1].x);close(p.y,m.portals[1].y+.1);
});

test('both teams and every movement type travel through paired stumps once, preserving health and resources',async()=>{
 for(const side of[0,1])for(const movement of['ground','hovering','flying']){
  const{e,spawn}=await fixture('swamp'),entry=e.map.portals[side],exit=e.map.portals[1-side],u=spawn(entry,side,movement),mana=e.teams[side].mana;
  e.step(1/30);assert.ok(Math.hypot(u.x-exit.x,u.y-exit.y)<1.3);close(u.hp,1000);close(u.shield,500);assert.equal(u.lane,1);assert.ok(e.teams[side].mana>=mana);
  const p={x:u.x,y:u.y};e.step(.8);close(u.x,p.x);close(u.y,p.y);assert.equal(u.route.at(-1).x,e.castles[1-side].x);
 }
});

test('a unit deployed along the half-road reaches the hollow, teleports and continues toward the enemy',async()=>{
 const{e,spawn}=await fixture('swamp'),u=spawn({x:e.map.bases[0].x,y:e.map.bases[0].y+6},0,'ground',3000,1);
 e.step(5);assert.ok(u.x>34,'crossed the magical link');assert.ok(u.y>5.2,'walked out toward the enemy rather than looping back');assert.ok(e.isWalkable(u));
});

test('prison gates alternate on simulation minutes; pause freezes the state',async()=>{
 const{e}=await fixture('prison'),[,,,{gateBlocked}]=await modules;
 assert.equal(gateBlocked(e,{x:17,y:13}),false);assert.equal(gateBlocked(e,{x:15.5,y:8.5}),true);
 e.step(60);assert.equal(e.state.arena.gatePhase,1);assert.equal(gateBlocked(e,{x:17,y:13}),true);assert.equal(gateBlocked(e,{x:15.5,y:8.5}),false);
 e.setPaused(true);e.step(90);close(e.time,60);assert.equal(e.state.arena.gatePhase,1);e.setPaused(false);e.step(60);assert.equal(e.state.arena.gatePhase,0);
});

test('a closing central gate deals one ordinary 100-damage hit and pushes each side forward',async()=>{
 const{e,spawn}=await fixture('prison'),a=spawn({x:17,y:12.6},0),b=spawn({x:17,y:13.4},1,'flying'),outside=spawn({x:15,y:13});
 e.state.time=59.99;e.step(1/30);close(a.hp,970);close(b.hp,970);close(outside.hp,1000);close(a.shield,430);assert.ok(a.x>17&&b.x<17);
 e.step(.3);close(a.hp,970);close(b.hp,970);
});

test('green gates also crush and eject along their own crossing direction when closing',async()=>{
 const{e,spawn}=await fixture('prison');e.state.time=61;e.step(1/30);const u=spawn({x:15.5,y:8.5});u.facingY=-1;
 e.state.time=119.99;e.step(1/30);close(u.hp,970);assert.ok(u.y<8.1);assert.ok(e.isWalkable(u));
});

test('central orb is removed when its gate closes and returns when the center reopens',async()=>{
 const{e}=await fixture('prison');e.step(60);assert.equal(e.state.arena.orb.available,false);assert.equal(e.state.arena.orb.gateSuppressed,true);
 e.step(60);assert.equal(e.state.arena.orb.available,true);assert.equal(e.state.arena.orb.gateSuppressed,false);
});

test('prison retains its two wells and the ordinary orb pickup and mana bonus',async()=>{
 const{e,spawn}=await fixture('prison');e.teams[0].mana=2;spawn(e.map.center);e.step(1/30);assert.equal(e.state.nodes.length,2);assert.ok(e.teams[0].mana>7);assert.equal(e.state.arena.orb.pickedBy,0);
 e.state.time=59.99;e.step(1/30);assert.equal(e.state.arena.orb.gateSuppressed,true);assert.equal(e.state.arena.orb.available,false);
});

test('center units find a side detour around a closed red gate for every movement type',async()=>{
 for(const movement of['ground','hovering','flying']){
  const{e,spawn}=await fixture('prison');e.state.time=61;e.step(1/30);const u=spawn({x:15,y:13},0,movement,1500,1);let visitedSide=false;
  for(let i=0;i<800;i++){e.step(1/30);if(Math.abs(u.y-e.map.center.y)>6)visitedSide=true;assert.equal(Math.abs(u.x-17)<.19&&Math.abs(u.y-13)<1.19,false,'never crosses the sealed central gate');}
  assert.ok(visitedSide,`${movement} used an outer lane`);assert.ok(u.x>20,`${movement} continued to the enemy`);
 }
});

test('dash clipping cannot cross a closed gate and the cross passages remain walkable',async()=>{
 const{e}=await fixture('prison');e.state.time=61;e.step(1/30);const hit=e.clipWalkableSegment({x:16,y:13},{x:19,y:13});assert.equal(hit.blocked,true);assert.ok(hit.x<16.81);assert.equal(e.isWalkable({x:15.5,y:8.5}),true);
});

test('bot deploys legal cards and remains bounded on both new maps through multiple gate cycles',async()=>{
 for(const name of['swamp','prison']){const{e}=await fixture(name,true);e.castles.forEach(c=>{c.hp=c.maxHp=1000000;});e.step(180);assert.ok(e.teams[1].deployed>5);assert.ok(e.teams[1].mana>=0&&e.teams[1].mana<=20);assert.ok(e.units.every(u=>e.finitePoint(u)));}
});


test('gate hits respect damage reduction and shield while moving invulnerable cards across safely',async()=>{
 const{e,spawn}=await fixture('prison'),u=spawn({x:17,y:13});u.stats.damageminimiser=50;e.state.time=59.99;e.step(1/30);close(u.hp,985);close(u.shield,465);assert.ok(u.x>17);
 const{e:b,spawn:make}=await fixture('prison'),v=make({x:17,y:13});b.status(v,'untouchable',120,0,null);b.state.time=59.99;b.step(1/30);close(v.hp,1000);assert.ok(v.x>17);
});


test('native cards and their companions can take an environmental gate hit without an attacker',async()=>{
 await fixture('prison');
 for(const root of catalog.cards.filter(c=>c.ready)){
  const{e}=await fixture('prison');const def=root.choiceRequired?root.typeVariants.find(c=>c.ready):root;
  e.spawn(def,0,{x:17,y:13},1,{count:1});e.state.time=59.99;assert.doesNotThrow(()=>e.step(1/30),def.id);
 }
});


test('navigation caches keep coordinate points instead of circular references to enemy units',async()=>{
 const{e,spawn}=await fixture('prison'),[,,,{topologyWaypoint}]=await modules;e.state.time=61;e.step(1/30);const a=spawn({x:15,y:13}),b=spawn({x:20,y:13},1);
 topologyWaypoint(e,a,b);topologyWaypoint(e,b,a);assert.doesNotThrow(()=>JSON.stringify(e.state));assert.deepEqual(Object.keys(a.memory.navigation.goal).sort(),['x','y']);
});


test('new arenas retain their authored dimensions and symmetric objective routes',async()=>{
 const[,,{ARENAS,pointOnRoute,distance,routeLength}]=await modules;
 for(const map of[ARENAS.swamp,ARENAS.prison]){
  assert.deepEqual([map.width,map.height],map.id==='swamp'?[40,26]:[34,26]);
  const halfDistance=map.id==='swamp'?17.5:9+Math.sqrt(97);close(map.pumpDistance,halfDistance);
  for(const node of map.nodes){const lane=map.routes.findIndex(route=>route.some(p=>distance(p,node)<1e-7));
   for(const side of[0,1])close(distance(pointOnRoute(lane,side,halfDistance,map),node),0);
   close(routeLength(map.routes[lane]),halfDistance*2);
  }
 }
});
