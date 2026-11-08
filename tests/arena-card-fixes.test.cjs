const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),loaded=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs')]).then(([{ArenaEngine},{buildCatalog}])=>({ArenaEngine,catalog:buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json'))))}));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
async function fixture(){
 const{ArenaEngine,catalog}=await loaded,e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:['hammies','b-b','scrapy','venomora','ben','freak','bethe','soldier'],spellDeck:['healing-light'],bot:false,seed:41});for(const c of e.castles)c.cooldown=Infinity;
 const spawn=(id,side=0,p={x:15,y:14},stats={})=>{const d=structuredClone(catalog.byId.get(id));Object.assign(d.stats,{speed:0,dodge:0,criticalChance:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...stats});const made=e.spawn(d,side,p,1,{count:1,positions:[p]});for(const u of made){u.stats.speed=0;u.cooldown=Infinity;}return made[0];};
 const dummy=(p={x:15.6,y:14},side=1,stats={})=>{const t=spawn('hammies',side,p,{health:10000,shield:0,damage:0,range:0,...stats});t.def={...t.def,id:'audit-target',forms:[],combat:{...t.def.combat,attackType:'none'}};return t;};
 return{e,catalog,spawn,dummy};
}

test('Arcanyx launches one seed and damages every ground enemy in its authored impact square exactly once',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('arcanyx'),near=dummy({x:15.6,y:14.6}),primary=dummy(),outside=dummy({x:15.6,y:15.1}),air=dummy({x:15.6,y:13.5}),ally=dummy({x:15,y:14.5},0);
 air.def.combat.movementType='flying';ally.hp=9000;e._fire(u,primary);assert.equal(e.state.projectiles.length,1);e.step(.3);
 close(primary.hp,9982.4);close(near.hp,9982.4);close(outside.hp,10000);close(air.hp,10000);close(ally.hp,9000);assert.equal(u.hits,2);assert.equal(e.state.effects.filter(f=>f.type==='explosion').length,1);
 e.step(5);close(ally.hp,9020);
});

test('Arcanyx keeps intrinsic splash under Silence while losing the sixty-percent bonus and native healing',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('arcanyx'),primary=dummy(),near=dummy({x:15.6,y:14.6});e.status(u,'silence',5);e._fire(u,primary);e.step(.3);
 close(primary.hp,9989);close(near.hp,9989);assert.equal(u.statuses.some(s=>s.kind==='regen'),false);
});

test('Tphoenix resolves one instantaneous one-tile explosion, respecting area edges and ground targeting',async()=>{
 const{e,spawn,dummy,catalog}=await fixture(),u=spawn('tphoenix'),primary=dummy(),near=dummy({x:15.6,y:14.4}),outside=dummy({x:15.6,y:14.9}),air=dummy({x:15.6,y:13.6});air.def.combat.movementType='flying';
 assert.equal(catalog.byId.get('tphoenix').combat.multiTarget,true);e._fire(u,primary);close(primary.hp,9982);close(near.hp,9982);close(outside.hp,10000);close(air.hp,10000);assert.equal(e.state.projectiles.length,0);assert.equal(u.hits,2);assert.equal(e.state.effects.filter(f=>f.type==='explosion').length,1);
});

test('melee endpoint explosions retain damage rules under Silence, Misfortune and target immunity',async()=>{
 for(const kind of['silence','misfortune','untouchable']){
  const{e,spawn,dummy}=await fixture(),u=spawn('tphoenix'),primary=dummy(),near=dummy({x:15.6,y:14.4});e.status(kind==='untouchable'?near:u,kind,5,kind==='misfortune'?1:0);e._fire(u,primary);
  close(primary.hp,kind==='misfortune'?10000:9982);close(near.hp,kind==='misfortune'||kind==='untouchable'?10000:9982);
 }
});

for(const[id,base,expected]of[['leno/type1',5,50],['bethe',5,5],['srail',20,28]])test(`Venom Fangs theft survives ${id}'s native stat recomputation`,async()=>{
 const{e,spawn}=await fixture(),fang=spawn('venom-fangs'),target=spawn(id,1,{x:15.5,y:14},{health:10000,shield:0,criticalChance:base});e._hook('tick',target,0);close(e.statValue(target,'criticalChance'),expected);
 e._resolveHit(fang,target,{damage:1,kind:'attack'});close(e.statValue(target,'criticalChance'),expected-.5);e.step(1/30);close(e.statValue(target,'criticalChance'),expected-.5);close(e.statValue(fang,'criticalChance'),.5);
 if(id==='leno/type1'){e.step(25);close(e.statValue(target,'criticalChance'),19.5);}
});

test('multiple Fangs cannot drain below zero or gain above one hundred critical chance',async()=>{
 const{e,spawn,dummy}=await fixture(),a=spawn('venom-fangs',0,{x:15,y:14},{criticalChance:99.75}),b=spawn('venom-fangs',0,{x:15,y:14.5}),target=dummy(undefined,1,{criticalChance:.75});
 e._resolveHit(a,target,{damage:1,kind:'attack'});close(e.statValue(a,'criticalChance'),100);close(e.statValue(target,'criticalChance'),.5);
 e._resolveHit(a,target,{damage:1,kind:'attack'});close(e.statValue(target,'criticalChance'),.5);e._resolveHit(b,target,{damage:1,kind:'attack'});e._resolveHit(b,target,{damage:1,kind:'attack'});close(e.statValue(target,'criticalChance'),0);close(e.statValue(b,'criticalChance'),.5);
});

test('theft transfers exact effective percentage points and survives Cleanse and the thief dying',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('venom-fangs',0,{x:15,y:14},{criticalChance:10}),target=dummy(undefined,1,{criticalChance:20});
 e.status(u,'allStatsBonus',5,.2,u);e.status(target,'allStatsBonus',5,.2,target);close(e.statValue(u,'criticalChance'),12);close(e.statValue(target,'criticalChance'),24);
 e._resolveHit(u,target,{damage:1,kind:'attack'});close(e.statValue(u,'criticalChance'),12.5);close(e.statValue(target,'criticalChance'),23.5);e.cleanse(target);close(e.statValue(target,'criticalChance'),23.5);
 e.killUnit(u);e._drainDeaths();e.step(5.1);close(e.statValue(target,'criticalChance'),19.5);
});

test('Hailey can earn back stolen chance through a new successful hit even after reaching the hundred-point base cap',async()=>{
 const{e,spawn,dummy}=await fixture(),fang=spawn('venom-fangs'),hailey=spawn('hailey',1,{x:15.5,y:14},{criticalChance:100}),target=dummy({x:16,y:14},0);
 e._resolveHit(fang,hailey,{damage:1,kind:'attack'});close(e.statValue(hailey,'criticalChance'),99.5);e._resolveHit(hailey,target,{damage:1,kind:'attack'});close(e.statValue(hailey,'criticalChance'),100);e._resolveHit(hailey,target,{damage:1,kind:'attack'});close(e.statValue(hailey,'criticalChance'),100);
});

test('Mimic and Format snapshot transferred critical chance once without sharing a transfer ledger',async()=>{
 for(const id of['mimic','format']){
  const{e,spawn}=await fixture(),u=spawn(id),target=spawn('venom-fangs',1,{x:16,y:14},{health:1000,shield:0,criticalChance:10});target.criticalChanceOffset=-2;
  let copy;if(id==='mimic'){e._resolveHit(u,target,{damage:200,kind:'attack'});copy=e.units.find(t=>t.side===0&&t!==u&&t.memory.mimicClone);}else{u.criticalChanceOffset=3;e.channelFormat(u,3);copy=u;}
  assert.ok(copy);close(e.statValue(copy,'criticalChance'),8);assert.equal(copy.criticalChanceOffset,undefined);close(e.statValue(target,'criticalChance'),8);
 }
});

test('Ironjaw grows from its authored twenty-five-percent lifesteal chance to fifty after fifty successful hits',async()=>{
 const{e,spawn,dummy,catalog}=await fixture(),u=spawn('ironjaw',0,{x:15,y:14},{lifestealChance:25}),target=dummy();
 e._resolveHit(u,target,{damage:1,kind:'attack'});close(u.stats.lifestealChance,25.5);for(let i=0;i<99;i++)e._resolveHit(u,target,{damage:1,kind:'attack'});close(u.stats.lifestealChance,50);close(u.memory.ironjawSiphon,25);close(catalog.byId.get('ironjaw').stats.lifestealChance,25);
});

test('Ironjaw earns no stacks from prevented damage or while silenced, and a Thief gets only the additional twenty-five points',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('ironjaw',0,{x:15,y:14},{lifestealChance:25}),target=dummy();e.status(target,'untouchable',5);e._resolveHit(u,target,{damage:1,kind:'attack'});close(u.stats.lifestealChance,25);
 target.statuses=[];e.status(u,'silence',5);e._resolveHit(u,target,{damage:1,kind:'attack'});close(u.stats.lifestealChance,25);
 const thief=spawn('thief',0,{x:18,y:14}),donor=spawn('ironjaw',1,{x:19,y:14},{health:10000,shield:0,lifestealChance:25});assert.equal(e.stealAbility(thief),true);for(let i=0;i<60;i++)e._resolveHit(thief,donor,{damage:1,kind:'attack'});close(thief.stats.lifestealChance,25);close(thief.memory.ironjawSiphon,25);
});

test('Deadscope and Naar reference DPS matches their base per-hit damage and full attack cycle',async()=>{
 const{catalog}=await fixture();for(const[id,damage,interval,dps]of[['deadscope',125,5.25,23.81],['naar',96,3.75,25.6]]){const c=catalog.byId.get(id);close(c.stats.sps,dps);close(c.attack.damage,damage);close(c.attack.interval,interval);close(Math.round((damage/interval)*100)/100,dps);}
 assert.equal(catalog.cards.length,167);assert.equal(catalog.forms.length,232);assert.equal(catalog.cards.filter(c=>c.ready).length,138);
});
