const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const loaded=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/vision.mjs'),import('../arena/js/map.mjs')]).then(([{ArenaEngine},{buildCatalog},vision,map])=>({ArenaEngine,vision,map,catalog:buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json'))))}));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
async function fixture(){
 const {ArenaEngine,catalog,vision,map}=await loaded,e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:catalog.cards.filter(c=>c.ready).slice(0,8).map(c=>c.id),spellDeck:['healing-light'],bot:false,seed:31});
 const spawn=(id,side=0,p={x:15,y:14},stats={})=>{const def=structuredClone(catalog.byId.get(id));assert.ok(def,id);Object.assign(def.stats,{speed:0,criticalChance:0,dodge:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...stats});const [u]=e.spawn(def,side,p,1,{count:1,positions:[p]});u.cooldown=Infinity;return u;};
 const dummy=(side=1,p={x:15.6,y:14},stats={})=>{const def=structuredClone(catalog.byId.get('hammies'));def.id='apex-target';def.forms=[];def.combat.attackType='none';Object.assign(def.stats,{health:1000,shield:0,damage:0,range:0,speed:0,dodge:0,criticalChance:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...stats});return e.spawn(def,side,p,1,{count:1,positions:[p]})[0];};
 const kill=(u,killer=null)=>{e.killUnit(u,killer);e._drainDeaths();};
 return{e,catalog,spawn,dummy,kill,vision,map};
}

test('the original 21 Apex roots and their forms retain their unlocked profiles after rarity moves with the authored independent attack geometry',async()=>{
 const {catalog}=await fixture();const geometry={azrith:[1000,1300],untouch:[500,500],heartix:[500,500],'r-1':[500,500],blank:[750,3800],magmara:[500,500],willowshade:[1000,1000],collector:[1000,1000],sushu:[500,500],umbra:[500,500],thief:[500,500],rotlings:[500,500],stormblade:[1000,2500],'venom-fangs':[500,500],skyhunter:[500,500],rockback:[500,500],'neon-droid':[500,500],'void-wraith':[500,500],'bio-mech':[1000,1050],mixela:[500,500],laura:[500,500]};
 assert.equal(catalog.cards.filter(c=>c.ready).length,138);assert.equal(catalog.cards.filter(c=>c.rarity==='Apex').length,23);
 for(const[id,pair]of Object.entries(geometry)){const c=catalog.byId.get(id);assert.equal(c.ready,true,id);assert.deepEqual(c.reasons,[]);assert.deepEqual([c.combat.attackWidth,c.combat.attackDistance],pair,id);for(const f of c.forms)assert.equal(f.ready,true,f.id);}
 close(catalog.byId.get('stormblade').stats.range,1200);assert.equal(catalog.byId.get('willowshade').combat.attackAngle,125);assert.equal(catalog.byId.get('collector').combat.attackAngle,75);
 assert.equal(catalog.byId.get('neon-droid').combat.movementType,'flying');assert.equal(catalog.byId.get('venom-fangs').combat.targets,'both');
});

test('Azrith aura covers a centered 2x2 square and ends when his shield breaks',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('azrith'),inside=dummy(0,{x:15.95,y:14.95}),outside=dummy(0,{x:16.01,y:14}),enemy=dummy();e._hook('tick',u,0);assert.ok(inside.statuses.some(s=>s.kind==='damageBonus'&&s.magnitude===.1));assert.equal(outside.statuses.length,0);assert.equal(enemy.statuses.length,0);u.shield=0;e.step(.21);assert.equal(inside.statuses.length,0);
});
test('Azrith creates one stationary Bannerox only once per deployment, with a 2x2 haste aura',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('azrith'),friend=dummy(0,{x:15.8,y:14});e.damage(null,u,150,{kind:'spell'});assert.ok(u.banneroxCreated);let flags=e.units.filter(t=>t.def.id==='azrith/bannerox');assert.equal(flags.length,1);const flag=flags[0];assert.equal(flag.isBuilding,true);close(flag.stats.speed,0);e._hook('tick',flag,0);assert.ok(friend.statuses.some(s=>s.kind==='attackHaste'&&s.magnitude===.1));e.giveShield(u,20);e.damage(null,u,30,{kind:'spell'});assert.equal(e.units.filter(t=>t.def.id==='azrith/bannerox').length,1);
});
test('Bio Mech gives 3 percent of recipient maximum Shield, and flat five to intrinsically shieldless cards',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('bio-mech'),shielded=dummy(0,{x:15.6,y:14},{shield:100}),bare=dummy(0,{x:15,y:14.6}),far=dummy(0,{x:18,y:14});shielded.shield=50;e.damage(null,u,1,{kind:'spell'});close(shielded.shield,53);close(bare.shield,5);close(far.shield,0);e.damage(null,u,1,{kind:'spell'});close(shielded.shield,56);close(bare.shield,10);close(u.maxShield,75);
});
test('Laura pulses after 12.5 seconds, granting three 25-percent bonuses for 30 seconds without stacking',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('laura'),friend=dummy(0,{x:16,y:14},{damage:20,speed:1000});friend.stats.speed=0;e.step(12.49);assert.equal(friend.statuses.length,0);e.step(.01);assert.deepEqual(friend.statuses.map(s=>s.kind).sort(),['attackHaste','damageBonus','speedBonus']);for(const s of friend.statuses){close(s.magnitude,.25);close(s.until,42.5);}close(u.memory.charge,0);e.step(12.5);assert.equal(friend.statuses.length,3);for(const s of friend.statuses)close(s.until,55);e.status(u,'silence',40);e.step(30);assert.equal(friend.statuses.length,0);
});
test('Mixela permanently gains current and maximum Health from allied and enemy deaths within Range',async()=>{
 const{e,spawn,dummy,kill}=await fixture(),u=spawn('mixela'),ally=dummy(0,{x:15.7,y:14},{health:100}),enemy=dummy(1,{x:16,y:14},{health:200}),far=dummy(1,{x:20,y:14},{health:1000});u.hp=100;kill(ally);close(u.maxHp,220);close(u.hp,160);kill(enemy);close(u.maxHp,340);close(u.hp,280);kill(far);close(u.maxHp,340);close(u.stats.health,340);close(u.def.stats.health,160);close(u.memory.mixelaGrowth,180);e._drainDeaths();close(u.maxHp,340);
});
test('Rotlings gain timed damage from enemy deaths and do not create additional Mini Rotters on death',async()=>{
 const{e,spawn,dummy,kill}=await fixture(),u=spawn('rotlings'),ally=dummy(0),enemy=dummy();const minis=e.units.filter(t=>t.alive&&t.def.id==='rotlings/mini-rotters').length;kill(ally);close(u.stats.damage,14);kill(enemy);close(u.stats.damage,15);kill(u);assert.equal(e.units.filter(t=>t.alive&&t.def.id==='rotlings/mini-rotters').length,minis);
});
test('Mini Rotters retain their own form after forty-five seconds and do not mature into adults',async()=>{
 const{e,spawn}=await fixture(),u=spawn('rotlings/mini-rotters'),id=u.id;u.hp=u.maxHp*.5;e.step(46);assert.equal(u.def.id,'rotlings/mini-rotters');assert.equal(u.id,id);close(u.hp,20);assert.equal(e.units.filter(t=>t.alive&&t.def.id==='rotlings').length,0);
});

test('Sushu enters a touched enemy, hides its body and vision, and deals sixteen damage each second',async()=>{
 const{e,spawn,dummy,vision}=await fixture(),u=spawn('sushu'),t=dummy();assert.ok(u.statuses.some(s=>s.kind==='invisible'));assert.equal(e.parasitize(u,t),true);assert.equal(u.parasitizingId,t.id);assert.equal(vision.isEntityVisible(e.state,0,u),false);assert.equal(e.near(u,2).includes(u),false);assert.equal(e.canTarget(t,u),false);close(e.damage(t,u,100,{kind:'spell'}).total,0);e.step(.99);close(t.hp,1000);e.step(.01);close(t.hp,984);e.step(2);close(t.hp,952);close(u.shots,0);
});
test('Sushu vanishes with its host without granting the enemy a kill, and Cleanse also releases its marker',async()=>{
 for(const cleanse of[false,true]){const{e,spawn,dummy,kill}=await fixture(),u=spawn('sushu'),t=dummy();e.parasitize(u,t);if(cleanse)e.cleanse(t);else kill(t);assert.equal(u.alive,false);assert.equal(t.parasiteIds.length,0);assert.equal(t.statuses.some(s=>s.kind==='parasite'),false);e.step(1);}
});
test('Sushu cannot enter buildings, airborne enemies, or Predominance-protected targets; Silence prevents entry',async()=>{
 for(const mode of['air','predominance','silence','building']){const{e,spawn,dummy}=await fixture(),u=spawn('sushu'),t=dummy();if(mode==='air')t.def.combat.movementType='flying';if(mode==='building')t.isBuilding=true;if(mode==='predominance')e.status(t,'predominance',10);if(mode==='silence')e.status(u,'silence',10);assert.equal(e.parasitize(u,t),false,mode);assert.equal(u.parasitizingId,undefined);}
});

test('Thief uses melee near the target and a ranged projectile at distance, preserving its own damage',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('thief'),t=dummy(1,{x:17,y:14});u.theftState={used:true};e._fire(u,t);assert.equal(u.memory.combatMode,1);assert.equal(e.state.projectiles.length,1);u.cooldown=Infinity;e.step(.3);close(t.hp,980);t.x=15.5;e._fire(u,t);assert.equal(u.memory.combatMode,0);close(t.hp,960);close(u.stats.damage,20);
});
test('Thief permanently steals a passive once, disables its victim, and keeps its own body and source stats',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('thief'),donor=spawn('magmara',1,{x:16,y:14}),t=dummy();const hp=u.hp;assert.equal(e.stealAbility(u),true);assert.equal(donor.passiveDisabled,true);assert.equal(e.ability(donor),null);assert.equal(u.def.name,'Thief');close(u.hp,hp);close(u.def.stats.health,320);close(u.stats.damage,20);assert.equal(u.def.id,'magmara');assert.equal(u.def.rootId,'thief');e._resolveHit(u,t,{damage:20,kind:'attack'});assert.ok(t.statuses.some(s=>s.kind==='burn'&&s.amount===10));assert.equal(e.stealAbility(u),false);assert.ok(!e.ability(donor));
});
test('Thief excludes invisible, behind, or distant donors and does not duplicate an already stolen passive',async()=>{
 const{e,spawn}=await fixture(),u=spawn('thief'),behind=spawn('magmara',1,{x:14,y:14}),hidden=spawn('magmara',1,{x:16,y:14}),far=spawn('magmara',1,{x:31,y:14});e.status(hidden,'invisible',10);assert.equal(e.stealAbility(u),false);close(u.theftState?.used?1:0,0);const legal=spawn('blank',1,{x:17,y:14});assert.equal(e.stealAbility(u),true);assert.equal(legal.passiveDisabled,true);assert.equal(behind.passiveDisabled,undefined);assert.equal(far.passiveDisabled,undefined);
});
test('Thief can borrow native spawn-dependent passives without replacing its hybrid weapon',async()=>{
 for(const id of['reacher','turtle','freak','gloop','fallen-angel','whisper','format']){const{e,spawn}=await fixture(),u=spawn('thief'),t=spawn(id,1,{x:16,y:14});t.statuses=[];assert.equal(e.stealAbility(u),true,id);assert.equal(u.theftState.used,true);assert.equal(t.passiveDisabled,true);e._hook('tick',u,.1);assert.ok(Number.isFinite(u.hp));assert.ok(Number.isFinite(u.stats.damage));assert.equal(u.def.attack.modes.length,2);}
});

test('Void Wraith drains twenty percent from each enemy, caps only its additional damage at sixteen, and releases links at six tiles',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('void-wraith'),a=dummy(1,{x:16,y:14},{damage:50}),b=dummy(1,{x:15,y:15},{damage:50});e._hook('tick',u,0);close(e.statValue(a,'damage'),40);close(e.statValue(b,'damage'),40);close(u.stats.damage,23);a.x=20.9;b.x=21;b.y=14;e._hook('tick',u,0);close(e.statValue(a,'damage'),40);close(e.statValue(b,'damage'),50);close(u.stats.damage,17);a.x=21;e._hook('tick',u,0);close(e.statValue(a,'damage'),50);close(u.stats.damage,7);assert.deepEqual(u.memory.voidLinks,{});
});
test('Void Wraith respects Predominance and releases debuffs shortly after death or Silence',async()=>{
 for(const mode of['predominance','silence','death']){const{e,spawn,dummy,kill}=await fixture(),u=spawn('void-wraith'),t=dummy(1,{x:16,y:14},{damage:20});if(mode==='predominance')e.status(t,'predominance',10);e._hook('tick',u,0);if(mode==='silence')e.status(u,'silence',10);if(mode==='death')kill(u);e.step(.21);close(e.statValue(t,'damage'),20);if(u.alive)close(u.stats.damage,7);}
});

test('R-1 rolls once per completed series and enhances every bullet of the next series without mutating source stats',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('r-1'),t=dummy();e.random=()=>.01;
 for(let i=0;i<2;i++){e._fire(u,t);assert.equal(u.memory.burstBoost.queued,false);}e._fire(u,t);assert.equal(u.memory.burstBoost.queued,true);assert.deepEqual(e.state.projectiles.map(p=>p.hit.damage),[70,70,70]);close(e._range(u),4.6);e.random=()=>.99;
 for(let i=0;i<3;i++){e._fire(u,t);const p=e.state.projectiles.at(-1);close(p.hit.damage,77);close(p.width,1.5);assert.equal(p.hit.burstBoosted,true);assert.ok(p.range>=4.6);}assert.equal(u.memory.burstBoost.active,false);assert.equal(u.memory.burstBoost.queued,false);close(e._range(u),2.3);close(u.def.stats.damage,70);close(u.def.stats.range,2300);close(u.def.combat.attackWidth,500);e._fire(u,t);close(e.state.projectiles.at(-1).hit.damage,70);
});
test('R-1 old shield bypass and Human damage reduction are removed and Silence disables enhancement',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('r-1'),t=dummy(1,{x:16,y:14},{shield:100});e._resolveHit(u,t,{damage:70,kind:'attack'});close(t.hp,979);close(t.shield,51);const hp=u.hp;e.damage(t,u,100,{kind:'spell',bypassShield:true});close(u.hp,hp-100);u.memory.burstBoost={queued:true,active:false};e.status(u,'silence',10);e._fire(u,t);close(e.state.projectiles.at(-1).width,.5);close(e.state.projectiles.at(-1).hit.damage,70);close(e._range(u),2.3);
});
test('R-1 respects the three-percent boundary and canceled enhanced bursts do not carry the bonus to another target',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('r-1'),t=dummy();e.random=()=>.03;for(let i=0;i<3;i++)e._fire(u,t);assert.equal(u.memory.burstBoost.queued,false);u.memory.burstBoost.queued=true;e._fire(u,t);assert.equal(u.memory.burstBoost.active,true);e.killUnit(t);e._target(u);assert.equal(u.memory.burstBoost.active,false);
});

test('Stormblade strikes at most four enemies in total with fifty-percent bounce damage within three tiles',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('stormblade'),t=dummy(),a=dummy(1,{x:16.4,y:14}),b=dummy(1,{x:16.8,y:14}),c=dummy(1,{x:17.2,y:14}),extra=dummy(1,{x:17.6,y:14}),far=dummy(1,{x:20,y:14});e._fire(u,t);close(t.hp,974);for(const v of[a,b,c])close(v.hp,987);close(extra.hp,1000);close(far.hp,1000);close(u.hits,4);assert.equal(e.state.effects.filter(f=>f.type==='chain').length,3);
});
test('Stormblade bounces apply critical damage once and exclude allies, flying units and untargetable cards',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('stormblade',0,{x:15,y:14},{criticalChance:100,criticDamage:2}),t=dummy(),a=dummy(1,{x:16.5,y:14}),ally=dummy(0,{x:16,y:14}),air=dummy(1,{x:16,y:15}),safe=dummy(1,{x:16,y:13});air.def.combat.movementType='flying';e.status(safe,'untargetable',10);e._fire(u,t);close(t.hp,948);close(a.hp,974);for(const v of[ally,air,safe])close(v.hp,1000);
});
test('Willowshade bypasses shields and death creates one Octarion with its source geometry',async()=>{
 const{e,spawn,dummy,kill}=await fixture(),u=spawn('willowshade'),t=dummy(1,{x:15.6,y:14},{shield:100});e._fire(u,t);close(t.hp,970);close(t.shield,100);kill(u);const forms=e.units.filter(t=>t.alive&&t.def.id==='willowshade/octarion');assert.equal(forms.length,1);close(forms[0].maxHp,80);close(forms[0].def.combat.attackWidth,500);
});
test('Octarion leaves a three-second 1.5x1.5 poison cloud that catches late entrants exactly once',async()=>{
 const{e,spawn,dummy,kill}=await fixture(),u=spawn('willowshade/octarion'),t=dummy(),late=dummy(1,{x:20,y:14});kill(u);const f=e.state.fields[0];assert.equal(f.kind,'poison-cloud');assert.deepEqual(f.shape,{shape:'rect',width:1.5,height:1.5});e.step(.1);assert.equal(t.statuses.filter(s=>s.kind==='poison').length,1);e.step(.9);close(t.hp,995);late.x=15.5;e.step(.1);assert.equal(late.statuses.filter(s=>s.kind==='poison').length,1);e.step(1.9);close(t.hp,985);assert.equal(e.state.fields.length,0);e.step(.5);close(late.hp,985);close(t.hp,985);
});
test('Octarion ground poison spares hovering/flying cards, allies, and Predominance, and Cleanse removes the packet',async()=>{
 const{e,spawn,dummy,kill}=await fixture(),u=spawn('willowshade/octarion'),ground=dummy(),hover=dummy(1,{x:15,y:14.5}),air=dummy(1,{x:15,y:13.5}),ally=dummy(0),safe=dummy(1,{x:15.5,y:14.5});hover.def.combat.movementType='hovering';hover.def.combat.groundEffectImmune=true;air.def.combat.movementType='flying';e.status(safe,'predominance',5);kill(u);e.step(.1);e.cleanse(ground);e.step(3);for(const t of[ground,hover,air,ally,safe])close(t.hp,1000);
});

test('Untouch triggers only from Health loss, grants two seconds of immunity, then enhances exactly one successful hit',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('untouch'),t=dummy();e.damage(null,u,10,{kind:'spell'});assert.equal(u.memory.untouch.ready,false);assert.equal(u.statuses.some(s=>s.kind==='untouchable'),false); // three Health lost is below threshold
 const lost=205-u.hp;e.damage(null,u,41-lost,{kind:'spell',bypassShield:true});assert.ok(u.statuses.some(s=>s.kind==='untouchable'));close(e.damage(t,u,10,{kind:'spell'}).total,0);e.step(2);e._fire(u,t);close(t.hp,944.8);e._fire(u,t);close(t.hp,898.8);assert.equal(u.memory.untouch.ready,false);
});
test('Untouch does not save a lethal packet, and immunity bonus survives an unsuccessful hit',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('untouch'),t=dummy();e.damage(null,u,41,{kind:'spell',bypassShield:true});e.step(2);e.status(t,'untouchable',10);e._fire(u,t);assert.equal(u.memory.untouch.ready,true);t.statuses=[];e._fire(u,t);assert.equal(u.memory.untouch.ready,false);e.damage(null,u,10000,{kind:'spell',bypassShield:true});assert.equal(u.alive,false);
});
test('Heartix charms only the primary victim of its 24-second splash attack and restores current health ownership after eight seconds',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('heartix'),t=dummy(1,{x:17,y:14}),near=dummy(1,{x:17,y:14.5});e.step(24);e._fire(u,t);e.step(.4);assert.equal(t.side,0);assert.equal(near.side,1);close(t.hp,983);assert.ok(near.hp<1000);e.step(8);assert.equal(t.side,1);close(t.hp,983);
});
test('Blank personal kill damage caps at five and does not grow from allied or unrelated deaths',async()=>{
 const{e,spawn,dummy,kill}=await fixture(),u=spawn('blank');for(let i=0;i<7;i++){const t=dummy(1,{x:16,y:14},{health:1});e._resolveHit(u,t,{damage:40,kind:'attack'});e._drainDeaths();}close(u.stats.damage,45);kill(dummy());close(u.stats.damage,45);
});
test('Magmara applies three ten-damage Burn ticks per hit with canonical one-second timing',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('magmara'),t=dummy();e._fire(u,t);u.cooldown=Infinity;close(t.hp,960);e.step(.99);close(t.hp,960);e.step(.01);close(t.hp,950);e.step(2);close(t.hp,930);
});
test('Collector refunds two mana on personal enemy kills, never energy, with the twenty-mana limit',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('collector');e.teams[0].mana=19;e.teams[0].energy=0;const t=dummy(1,{x:15.6,y:14},{health:1});e._fire(u,t);close(e.teams[0].mana,20);close(e.teams[0].energy,0);
});
test('Umbra hides once at seventy-five percent and retreats 7.5 tiles along its own route once at fifty percent',async()=>{
 const{e,spawn,map}=await fixture();for(const side of[0,1]){const p=map.pointOnRoute(1,side,15),u=spawn('umbra',side,p);e.damage(null,u,u.maxHp*.25,{kind:'spell',bypassShield:true});assert.ok(u.umbraHidden);e.damage(null,u,u.maxHp*.25,{kind:'spell',bypassShield:true});assert.ok(u.umbraRetreated);const target=map.pointOnRoute(1,side,7.5);close(u.x,target.x);close(u.y,target.y);e.heal(u,u.maxHp);e.damage(null,u,u.maxHp*.5,{kind:'spell',bypassShield:true});close(u.x,target.x);}
});
test('Venom Fangs transfer half a critical-chance point and bypass shields, including versus airborne targets',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('venom-fangs'),t=dummy(1,{x:15.5,y:14},{shield:100,criticalChance:1});t.def.combat.movementType='flying';e._fire(u,t);close(t.hp,989);close(t.shield,100);close(t.stats.criticalChance,.5);close(u.stats.criticalChance,.5);for(let i=0;i<2;i++)e._fire(u,t);close(t.stats.criticalChance,0);close(u.stats.criticalChance,1);
});
test('Skyhunter projectile snapshots ten-percent additional damage per tile of launch distance',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('skyhunter'),t=dummy(1,{x:19,y:14});e._fire(u,t);close(e.state.projectiles[0].hit.damage,61.6);t.x=18;e.step(.5);close(t.hp,938.4);
});
test('Rockback rushes until its first landed hit and repairs ten Shield on each hit for six seconds after shield break',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('rockback',0,{x:15,y:14},{speed:900}),t=dummy();u.targetId=t.id;e._hook('tick',u,0);close(u.stats.speed,1350);e._fire(u,t);close(t.hp,965);close(u.stats.speed,900);u.stats.speed=0;e.damage(null,u,220/.7,{kind:'spell'});close(u.shield,0);e._fire(u,t);close(t.hp,951);close(u.shield,10);u.cooldown=Infinity;e.step(6);e._fire(u,t);close(u.shield,10);
});
test('Neon Droid flies and earns independently expiring haste stacks capped at sixty percent',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('neon-droid'),t=dummy();assert.equal(u.def.combat.movementType,'flying');for(let i=0;i<4;i++)e._resolveHit(u,t,{damage:16,kind:'attack'});close(e.attackInterval(u),.75);assert.equal(u.memory.neonStacks.length,3);e.step(3);close(e.attackInterval(u),1.2);assert.equal(u.memory.neonStacks.length,0);
});

test('Thief can adopt each available native passive without crashing its next combat tick',async()=>{
 const{catalog}=await fixture();for(const c of catalog.cards.filter(c=>c.ready&&c.id!=='thief')){
  const{e,spawn}=await fixture(),u=spawn('thief'),donor=spawn(c.id,1,{x:16,y:14});
  donor.statuses=[];for(const other of e.units)if(other!==u&&other!==donor)e.vanishUnit(other);
  const borrowed=e.stealAbility(u);if(!borrowed)continue;
  assert.equal(donor.passiveDisabled,true,c.id);assert.doesNotThrow(()=>e.step(.1),c.id);
 }
});

test('a hidden Sushu does not count toward allied auras or receive Butterfly permanent health growth',async()=>{
 const{e,spawn,dummy,kill}=await fixture(),u=spawn('reacher'),sushu=spawn('sushu',0,{x:15.5,y:14}),host=dummy(1,{x:16,y:14});e.parasitize(sushu,host);e._hook('tick',u,0);close(u.memory.nearbyFriends,0);const hp=sushu.maxHp,butterfly=spawn('sylviana/butterflies',0,{x:15.6,y:14});kill(butterfly);close(sushu.maxHp,hp);
});

test('paid Rotlings deployment creates exactly three adults and three minis for nine Mana on both sides',async()=>{
 for(const side of[0,1]){
  const{e,map}=await fixture(),team=e.teams[side],point={x:side?36:7,y:14};team.hand[0]='rotlings';team.mana=12;const result=e.deploy(side,0,point);assert.equal(result.ok,true,result.error);assert.equal(result.units.length,6);assert.equal(result.units.filter(u=>u.def.id==='rotlings').length,3);assert.equal(result.units.filter(u=>u.def.id==='rotlings/mini-rotters').length,3);close(team.mana,3);close(team.spentMana,9);assert.equal(new Set(result.units.map(u=>u.groupId)).size,1);
  for(const u of result.units){assert.equal(u.side,side);assert.equal(u.lane,1);assert.ok(map.isDeployable(u,side));assert.ok(map.distance(u,e.castles[side])<=7.5+1e-7);}
 }
});
test('Rotlings formation reserves room for all six bodies and failed placement spends no Mana',async()=>{
 const{e}=await fixture(),point={x:7,y:14};e.teams[0].hand[0]='rotlings';const blockers=[];
 // Block the candidate region without modifying the placement implementation.
 for(let x=4;x<=10;x+=.3)for(let y=11;y<=17;y+=.3)blockers.push({id:'occupied',alive:true,x,y,radius:.3,def:{combat:{movementType:'ground'}}});
 e.state.units.push(...blockers);const before=[...e.teams[0].hand];const result=e.deploy(0,0,point);assert.equal(result.ok,false);close(e.teams[0].mana,12);close(e.teams[0].spentMana,0);assert.deepEqual(e.teams[0].hand,before);
});
test('Rotlings bonuses stack separately for twenty seconds without renewing older stacks',async()=>{
 const{e,spawn,dummy,kill}=await fixture(),u=spawn('rotlings');for(const t of e.units){t.stats.speed=0;t.cooldown=Infinity;}const enemy=()=>dummy(1,{x:25,y:14});kill(enemy());close(u.stats.damage,15);e.step(5);kill(enemy());close(u.stats.damage,16);e.step(14.99);close(u.stats.damage,16);e.step(.01);close(u.stats.damage,15);e.step(5);close(u.stats.damage,14);close(u.def.stats.damage,14);assert.deepEqual(u.memory.rotlingSouls,[]);
});
test('all living Rotlings receive an enemy death bonus while Silence suppresses its effect without renewing expiry',async()=>{
 const{e,catalog,dummy,kill}=await fixture(),made=e.spawn(catalog.byId.get('rotlings'),0,{x:15,y:14},1);for(const u of made){u.stats.speed=0;u.cooldown=Infinity;}const adults=made.filter(u=>u.def.id==='rotlings');kill(dummy(1,{x:25,y:14}));for(const u of adults)close(u.stats.damage,15);const u=adults[0];e.status(u,'silence',10);e.step(1);close(u.stats.damage,14);e.cleanse(u);e.step(.1);close(u.stats.damage,15);e.step(18.9);for(const adult of adults)close(adult.stats.damage,14);
});
test('Mini Rotter death creates a two-tile mist that blinds enemies including late entrants, flying and hovering cards',async()=>{
 const{e,spawn,dummy,kill,vision}=await fixture(),mini=spawn('rotlings/mini-rotters'),ground=dummy(1,{x:15.5,y:14},{range:4000}),late=dummy(1,{x:20,y:14},{range:4000}),air=dummy(1,{x:15,y:14.7}),hover=dummy(1,{x:15,y:13.3}),ally=dummy(0,{x:15.6,y:14});air.def.combat.movementType='flying';hover.def.combat.movementType='hovering';hover.def.combat.groundEffectImmune=true;kill(mini);const field=e.state.fields[0];assert.equal(field.kind,'blinding-mist');assert.deepEqual(field.shape,{shape:'rect',width:2,height:2});e.step(.1);for(const t of[ground,air,hover])assert.ok(t.statuses.some(s=>s.kind==='blind'),t.id);close(e._range(ground),3);close(vision.visibilitySources(e.state,1).find(s=>s.x===ground.x&&s.y===ground.y).radius,6);assert.equal(ally.statuses.some(s=>s.kind==='blind'),false);assert.equal(late.statuses.length,0);late.x=15.7;e.step(.1);close(e._range(late),3);assert.equal(field.until,5);
});
test('mist blindness ends on exit or cloud expiry without removing Blind from other sources',async()=>{
 const{e,spawn,dummy,kill}=await fixture(),mini=spawn('rotlings/mini-rotters'),t=dummy(1,{x:15.5,y:14},{range:4000}),other=spawn('roguex',0,{x:10,y:14});kill(mini);e.step(.1);e.status(t,'blind',10,.5,other);close(e._range(t),2);t.x=20;e.step(.1);assert.equal(t.statuses.some(s=>s.mistFieldId),false);close(e._range(t),2);t.x=15.5;e.step(.1);assert.ok(t.statuses.some(s=>s.mistFieldId));e.step(4.7);assert.equal(e.state.fields.length,0);assert.equal(t.statuses.some(s=>s.mistFieldId),false);close(e._range(t),2);
});
test('mist respects Predominance, Cleanse, pause and overlapping clouds without multiplying Blind strength',async()=>{
 const{e,spawn,dummy,kill}=await fixture(),a=spawn('rotlings/mini-rotters'),b=spawn('rotlings/mini-rotters',0,{x:15.1,y:14}),t=dummy(1,{x:15.5,y:14},{range:4000});e.status(t,'predominance',1);kill(a);kill(b);e.step(.5);close(e._range(t),4);e.step(.6);close(e._range(t),3);assert.equal(t.statuses.filter(s=>s.mistFieldId).length,2);e.cleanse(t);close(e._range(t),4);e.step(.1);close(e._range(t),3);e.setPaused(true);e.step(10);assert.equal(e.state.fields.length,2);close(e._range(t),3);e.setPaused(false);e.step(3.8);assert.equal(e.state.fields.length,0);close(e._range(t),4);
});
