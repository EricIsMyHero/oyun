const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const loaded=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/map.mjs')]).then(([{ArenaEngine},{buildCatalog},map])=>({ArenaEngine,...map,catalog:buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json'))))}));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
async function fixture(){
 const{ArenaEngine,catalog,...map}=await loaded,e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:['xii-josh','hammies','b-b','scrapy','venomora','ben','freak','soldier'],spellDeck:['healing-light'],bot:false,seed:39});
 for(const c of e.castles)c.cooldown=Infinity;
 const spawn=(id,side=0,p={x:15,y:14},stats={})=>{
  const def=structuredClone(catalog.byId.get(id));Object.assign(def.stats,{speed:0,criticalChance:0,dodge:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...stats});
  const made=e.spawn(def,side,p,1,{count:1,positions:[p]});for(const u of made){u.stats.speed=0;u.cooldown=Infinity;}return made[0];
 };
 const enemy=(p={x:15.6,y:14})=>{const t=spawn('hammies',1,p,{health:5000,shield:0,damage:0,range:0});t.def={...t.def,id:'readiness-target',forms:[],combat:{...t.def.combat,attackType:'none'}};return t;};
 const pair=(type,p={x:15,y:14})=>{const a=spawn(`mr-and-mrs-ray/type${type}`,0,p),b=e.units.find(t=>t!==a&&t.groupId===a.groupId);b.x=p.x-.45;b.y=p.y;a.memory.rayCharge=b.memory.rayCharge=100;return[a,b];};
 const held=(a,b)=>{assert.equal(a.sharedVitalsId,undefined);assert.equal(b.sharedVitalsId,undefined);close(a.memory.rayCharge,100);close(b.memory.rayCharge,100);};
 return{e,catalog,spawn,enemy,pair,held,...map};
}

test('paid XII Josh deployments create one body, retain nine mana and keep every-third placement progression',async()=>{
 const{e,catalog}=await fixture();assert.equal(catalog.byId.get('xii-josh').stats.number,1);
 for(let i=1;i<=3;i++){
  e.state.units=[];e.teams[0].hand[0]='xii-josh';e.teams[0].mana=20;
  const result=e.deploy(0,0,{x:7,y:14});assert.equal(result.ok,true,result.error);assert.equal(result.units.length,1);close(e.teams[0].mana,11);assert.equal(result.units[0].deploymentNumber,i);
 }
 assert.equal(e.teams[0].cardDeployments['xii-josh'],3);
});

test('Ase form II acquires from 2.5 tiles and moves 1.05 tiles per second while keeping its authored melee strike',async()=>{
 const{e,catalog,spawn,enemy}=await fixture(),def=catalog.byId.get('ase/type2'),u=spawn('ase/type2',0,{x:15,y:14},{speed:def.stats.speed}),near=enemy({x:17.7,y:14});
 close(def.stats.range,2500);close(def.stats.speed,1050);assert.equal(def.combat.attackType,'melee');close(def.combat.attackDistance,500);
 assert.equal(e._target(u),near);u.stats.speed=def.stats.speed;e._move(u,{x:18,y:14},1);close(u.x,16.05);close(u.y,14);
 for(const type of[1,2]){const parent=catalog.byId.get(`ase/type${type}`);assert.equal(parent.forms.length,1);assert.match(parent.forms[0].id,/giga-r/);}
});

test('Ray root, both selected forms and both partners use 1250-point normal attack width',async()=>{
 const{catalog}=await fixture();for(const id of['mr-and-mrs-ray','mr-and-mrs-ray/type1','mr-and-mrs-ray/type1/the-rays','mr-and-mrs-ray/type2','mr-and-mrs-ray/type2/the-rays'])close(catalog.byId.get(id).combat.attackWidth,1250);
});

for(const type of[1,2]){
 test(`Ray form ${type} holds both full charge meters until an enemy unit enters attack range`,async()=>{
  const{e,pair,held,enemy}=await fixture(),[a,b]=pair(type),far=enemy({x:18,y:14});e.step(4);held(a,b);
  // A castle in range is not a troop and cannot spend the stored ultimate.
  e.castles[1].x=15.7;e.castles[1].y=14;e._hook('tick',a,0);held(a,b);
  far.x=15.6;a.facingX=-1;a.facingY=0;e._hook('tick',b,0);
  assert.equal(e._pool(a).mode,type);close(a.memory.rayCharge,0);close(b.memory.rayCharge,0);
  if(type===2){close(a.rayDash.dx,1);close(a.rayDash.dy,0);close(a.rayDash.width,2);close(a.rayDash.length,5);}
 });
 test(`Ray form ${type} ignores concealed, untargetable, imprisoned, flying, healthless and building targets`,async()=>{
  for(const kind of['invisible','untargetable','imprisonment','flying','healthless','building']){
   const{e,pair,held,enemy}=await fixture(),[a,b]=pair(type),t=enemy();
   if(kind==='flying')t.def.combat.movementType='flying';else if(kind==='healthless')t.healthless=true;else if(kind==='building')t.isBuilding=true;else e.status(t,kind,10);
   e._hook('tick',a,0);e._hook('tick',b,0);held(a,b);
  }
 });
 test(`Ray form ${type} uses the fusion leader's blinded range and respects Taunt`,async()=>{
  const{e,pair,held,enemy}=await fixture(),[a,b]=pair(type),t=enemy({x:16,y:14});
  e.status(a,'blind',10,.5,t);e._hook('tick',b,0);held(a,b);
  a.statuses=[];b.x=17.5;t.x=18.1;e._hook('tick',b,0);held(a,b);
  t.x=15.6;const taunter=enemy({x:18,y:14});e.status(a,'taunted',10,0,taunter);e._hook('tick',a,0);held(a,b);
  taunter.x=15.8;e._hook('tick',b,0);assert.equal(e._pool(a).mode,type);
 });
}

test('walkable clipping traces the whole path and cannot skip forest to another lane',async()=>{
 const{clipWalkableSegment,isWalkable}=await fixture(),start={x:21.5,y:14},end={x:21.5,y:24};assert.equal(isWalkable(start),true);assert.equal(isWalkable(end),true);
 const stop=clipWalkableSegment(start,end);assert.equal(stop.blocked,true);assert.equal(isWalkable(stop),true);close(stop.x,21.5);close(stop.y,15.05);
});

test('Ray dash stops on each road/courtyard edge, remains fused for 3.75s and splits at safe coordinates',async()=>{
 for(const[p,heading,endpoint]of[[{x:40.5,y:14},{x:1,y:0},{x:41.05,y:14}],[{x:2.5,y:14},{x:-1,y:0},{x:1.95,y:14}],[{x:21.5,y:4},{x:0,y:-1},{x:21.5,y:2.95}],[{x:21.5,y:24},{x:0,y:1},{x:21.5,y:25.05}]]){
  const{e,pair,isWalkable,MAP}=await fixture(),[a,b]=pair(2,p);a.facingX=heading.x;a.facingY=heading.y;
  assert.equal(e.startRayDash(a,b),true);assert.equal(a.rayDash.boundaryLimited,true);assert.ok(a.rayDash.length<5);close(a.rayFusion.until,3.75);
  for(let i=0;i<37;i++){
   e.step(.1);for(const u of[a,b]){assert.equal(isWalkable(u),true);assert.ok(u.x>=.5&&u.x<=MAP.width-.5&&u.y>=.5&&u.y<=MAP.height-.5);}
  }
  assert.ok(a.rayDash);close(a.x,endpoint.x);close(a.y,endpoint.y);close(a.rayDash.remaining,0);e.step(.1);
  assert.equal(a.rayDash,undefined);assert.equal(a.sharedVitalsId,undefined);assert.equal(b.fusedInto,undefined);assert.equal(isWalkable(a),true);assert.equal(isWalkable(b),true);
 }
});

test('a dash with no safe forward travel does not consume charge or start a fusion',async()=>{
 const{e,pair,held}=await fixture(),[a,b]=pair(2,{x:41.05,y:14});a.facingX=1;a.facingY=0;assert.equal(e.startRayDash(a,b),false);held(a,b);
});
