const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const modules=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/map.mjs')]);
const root=path.resolve(__dirname,'..');let catalog;
async function fixture(arenaId='verdant'){
 const[{ArenaEngine},{buildCatalog}]=await modules;
 catalog||=buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json'))));
 const e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:['hammies','b-b','scrapy','venomora','ben','freak','bethe','soldier'],spellDeck:['guard-post'],bot:false,arenaId,seed:214});
 return e;
}
test('preview and payment agree on every lane, side and map, including formations, flying cards and companions',async()=>{
 const[,,{ARENAS,distance}]=await modules;
 for(const id of Object.keys(ARENAS))for(const side of[0,1])for(let lane=0;lane<ARENAS[id].routes.length;lane++)for(const card of['hammies','soldier','bees','corsair-crew','rotlings']){
  const e=await fixture(id),p=e.pointOnRoute(lane,side,5.5),team=e.teams[side];team.hand[0]=card;team.mana=20;
  const before=JSON.stringify(e.state),plan=e.deploymentPlan(side,0,p,{preview:true});assert.equal(plan.ok,true,`${id}/${side}/${lane}/${card}: ${plan.error}`);assert.equal(JSON.stringify(e.state),before,'hovering never pays or spawns');
  const result=e.deploy(side,0,p);assert.equal(result.ok,true);assert.equal(result.units.length,plan.formation.length);assert.equal(team.mana,20-plan.cost);assert.equal(team.deployed,1);
  for(const u of result.units){assert.equal(u.lane,lane);assert.ok(e.isDeployable(u,side));assert.ok(distance(u,e.map.bases[side])<=7.5+1e-8);}
 }
});
test('an ordinary nearby ally does not act like a building in the placement preview',async()=>{
 const e=await fixture(),p={x:8,y:14},def=catalog.byId.get('hammies');e.spawn(def,0,{x:8.55,y:14},1,{count:1,positions:[{x:8.55,y:14}]});
 assert.equal(e.deploymentPlan(0,0,p,{preview:true}).ok,true);assert.equal(e.deploy(0,0,p).ok,true);
});
test('occupied spots, insufficient mana and crowded formations reject without spending or cycling',async()=>{
 const e=await fixture(),p={x:8,y:14},def=catalog.byId.get('hammies');
 e.teams[0].mana=0;assert.match(e.deploymentPlan(0,0,p,{preview:true}).error,/mana/);e.teams[0].mana=20;
 e.spawn(def,0,p,1,{count:1,positions:[p]});assert.match(e.deploymentPlan(0,0,p,{preview:true}).error,/occupied/);e.state.units=[];
 // Fill the deployment roads while leaving just the intended anchor empty.
 for(let x=1;x<12;x+=.4)for(let y=6.5;y<21.6;y+=.4){const q={x,y};if(e.isDeployable(q,0)&&Math.hypot(q.x-p.x,q.y-p.y)>.6)e.spawn(def,0,q,e.closestRoute(q).lane,{count:1,positions:[q]});}
 const before=JSON.stringify(e.teams[0]);assert.match(e.deploymentPlan(0,0,p,{preview:true}).error,/formation/);assert.equal(e.deploy(0,0,p).ok,false);assert.equal(JSON.stringify(e.teams[0]),before);
});
test('preview does not reveal invisible enemy collision footprints',async()=>{
 const e=await fixture(),p={x:8,y:14},[enemy]=e.spawn(catalog.byId.get('hammies'),1,p,1,{count:1,positions:[p]});e.status(enemy,'invisible',30,0,enemy);
 assert.equal(e.deploymentPlan(0,0,p,{preview:true}).ok,true);assert.equal(e.deploy(0,0,p).ok,false);assert.equal(e.teams[0].deployed,0);
});
test('bound terrain blockers also reject deployment, not only movement',async()=>{
 const[,,{ARENAS,bindMap}]=await modules,p={x:8,y:14};
 assert.equal(bindMap(ARENAS.verdant).isDeployable(p,0),true);const map=bindMap(ARENAS.verdant,q=>Math.abs(q.x-8)<.1);assert.equal(map.isWalkable(p),false);assert.equal(map.isDeployable(p,0),false);
});
