const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const loaded=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs')]).then(([{ArenaEngine},{buildCatalog}])=>({ArenaEngine,catalog:buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json'))))}));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
async function fixture(){
 const {ArenaEngine,catalog}=await loaded,e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:catalog.cards.filter(c=>c.ready).slice(0,8).map(c=>c.id),spellDeck:['healing-light'],bot:false,seed:30});
 const spawn=(id='john-reynolds',side=0,p={x:15,y:14},stats={})=>{const def=structuredClone(catalog.byId.get(id));Object.assign(def.stats,{speed:0,criticalChance:0,dodge:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...stats});const [u]=e.spawn(def,side,p,1,{count:1});u.cooldown=Infinity;return u;};
 const dummy=(side=1,p={x:16,y:14},stats={})=>{const def=structuredClone(catalog.byId.get('hammies'));def.id='john-test-target';def.forms=[];def.combat.attackType='none';Object.assign(def.stats,{health:1000,shield:0,damage:0,range:0,speed:0,dodge:0,criticalChance:0,healrecovery:0,shieldrecovery:0,...stats});return e.spawn(def,side,p,1,{count:1,positions:[p]})[0];};
 return {e,catalog,spawn,dummy};
}

test('John and his source empowered form unlock with the authored 180-degree cone and original stats',async()=>{
 const {catalog}=await fixture();assert.equal(catalog.cards.filter(c=>c.ready).length,138);
 for(const up of [false,true]){const c=catalog.byId.get(up?'john-reynolds/ascended':'john-reynolds');assert.equal(c.ready,true);assert.deepEqual(c.reasons,[]);assert.deepEqual([c.combat.attackWidth,c.combat.attackDistance,c.combat.attackAngle,c.combat.attackShape,c.combat.targets],[1000,1250,180,'cone','ground']);close(c.stats.vision,8000);close(c.stats.health,up?335:305);close(c.stats.shield,up?190:160);close(c.stats.damage,up?25:22);close(c.stats.mana,up?15:13);close(c.attack.interval,1.15);}
});

test('critical John hits bypass shields and normal hits keep the standard seventy-percent absorption',async()=>{
 for(const crit of [false,true]){const {e,spawn,dummy}=await fixture(),u=spawn('john-reynolds',0,{x:15,y:14},{criticalChance:crit?100:0}),t=dummy(1,{x:16,y:14},{shield:100});e._fire(u,t);close(t.hp,crit?961.5:993.4);close(t.shield,crit?100:84.6);}
});

test('forced critical hits use the native bypass while Silence disables it without disabling critical damage',async()=>{
 for(const silence of [false,true]){const {e,spawn,dummy}=await fixture(),u=spawn(),t=dummy(1,{x:16,y:14},{shield:100});if(silence)e.status(u,'silence',10);const r=e.damage(u,t,10,{kind:'attack',critical:true,criticalMultiplier:2});close(r.total,20);close(t.hp,silence?994:980);close(t.shield,silence?86:100);}
});

test('John cone hits nearby forward enemies, excludes enemies behind and cannot hit flyers',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn(),front=dummy(),side=dummy(1,{x:15.2,y:14.6}),behind=dummy(1,{x:14.4,y:14}),air=dummy(1,{x:16,y:13.7});air.def.combat.movementType='flying';e._fire(u,front);close(front.hp,978);close(side.hp,978);close(behind.hp,1000);close(air.hp,1000);
});

test('John approaches and lands real cone attacks from both sides instead of stopping outside his strike',async()=>{
 for(const side of [0,1]){const {e,spawn,dummy}=await fixture(),u=spawn('john-reynolds',side,{x:side?28:15,y:14},{speed:1250}),t=dummy(1-side,{x:side?25:18,y:14});u.cooldown=0;e.step(4);assert.ok(u.hits>0);assert.equal(u.shots,u.hits);close(t.hp,1000-u.hits*22);}
});

test('exactly eight percent of actual Health loss taunts nearby opponents and grants timed protection',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn(),near=dummy(),far=dummy(1,{x:17,y:14});const amount=u.maxHp*.08;e.damage(null,u,amount-.1,{kind:'spell',bypassShield:true});assert.equal(u.memory.johnWhinnies||0,0);e.damage(null,u,.1,{kind:'spell',bypassShield:true});close(u.memory.johnWhinnies,1);close(u.memory.johnHealthLoss,0);
 const taunt=u.statuses.find(s=>s.kind==='taunt'),protection=u.statuses.find(s=>s.kind==='protection');close(taunt.radius,1.25);close(taunt.until,3);close(protection.magnitude,.25);close(protection.until,3);assert.ok(near.statuses.some(s=>s.kind==='taunted'));assert.equal(far.statuses.some(s=>s.kind==='taunted'),false);close(e.damage(null,u,10,{kind:'spell',bypassShield:true}).total,7.5);
});

test('shield loss alone does not advance Johns Health-loss trigger',async()=>{
 const {e,spawn}=await fixture(),u=spawn();u.stats.shieldtakendamage=100;const hp=u.hp;e.damage(null,u,50,{kind:'spell'});close(u.hp,hp);close(u.shield,110);close(u.memory.johnHealthLoss||0,0);close(u.memory.johnWhinnies||0,0);
});

test('one large packet consumes three thresholds but does not stack Taunt duration or protection',async()=>{
 const {e,spawn}=await fixture(),u=spawn();e.damage(null,u,u.maxHp*.24,{kind:'spell',bypassShield:true});close(u.memory.johnWhinnies,3);close(u.memory.johnHealthLoss,0);assert.equal(u.statuses.filter(s=>s.kind==='taunt').length,1);close(u.statuses.find(s=>s.kind==='taunt').until,3);close(u.statuses.find(s=>s.kind==='protection').magnitude,.25);
});

test('later Health loss refreshes one call and healed Health can be lost toward another call',async()=>{
 const {e,spawn}=await fixture(),u=spawn();e.damage(null,u,u.maxHp*.08,{kind:'spell',bypassShield:true});e.step(1);e.heal(u,u.maxHp);e.damage(null,u,u.maxHp*.08/.75,{kind:'spell',bypassShield:true});close(u.memory.johnWhinnies,2);close(u.statuses.find(s=>s.kind==='taunt').until,4);assert.equal(u.statuses.filter(s=>s.kind==='protection').length,1);e.step(3);assert.equal(u.statuses.some(s=>s.kind==='protection'),false);
});

test('empowered John uses five seconds and thirty-percent protection',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn('john-reynolds/ascended'),t=dummy();e.damage(null,u,u.maxHp*.08,{kind:'spell',bypassShield:true});close(u.statuses.find(s=>s.kind==='taunt').until,5);close(u.statuses.find(s=>s.kind==='protection').magnitude,.3);close(e.damage(null,u,10,{kind:'spell',bypassShield:true}).total,7);assert.ok(t.statuses.some(s=>s.kind==='taunted'));
});

test('Predominance prevents Taunt on its protected enemy and Cleanse removes the other enemy Taunt',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn(),protectedEnemy=dummy(1,{x:16,y:14}),t=dummy(1,{x:15.9,y:14.3});e.status(protectedEnemy,'predominance',10);e.damage(null,u,u.maxHp*.08,{kind:'spell',bypassShield:true});assert.equal(protectedEnemy.statuses.some(s=>s.kind==='taunted'),false);assert.ok(t.statuses.some(s=>s.kind==='taunted'));e.cleanse(t);assert.equal(t.statuses.some(s=>s.kind==='taunted'),false);
});

test('Silence and lethal damage cannot activate Johns horse call',async()=>{
 for(const lethal of [false,true]){const {e,spawn}=await fixture(),u=spawn();if(!lethal)e.status(u,'silence',10);e.damage(null,u,lethal?10000:u.maxHp*.08,{kind:'spell',bypassShield:true});assert.equal(u.statuses.some(s=>s.kind==='taunt'),false);close(u.memory.johnWhinnies||0,0);}
});

test('updated Maapp uses a 0.30-second interval in base and empowered forms',async()=>{
 const {e,spawn}=await fixture();for(const id of ['maapp','maapp/ascended']){const u=spawn(id);close(e.attackInterval(u),.3);close(u.def.attack.interval,.3);assert.match(u.def.raw.stats.attackSpeed,/0\.30/);}
});

test('Sheriff in the same deck empowers John before either card is deployed and charges fifteen mana',async()=>{
 const {catalog,ArenaEngine}=await loaded,deck=['john-reynolds','sheriff'];for(const c of catalog.cards.filter(c=>c.ready))if(deck.length<8&&!deck.includes(c.id))deck.push(c.id);
 const e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck,spellDeck:['healing-light'],bot:false});assert.equal(e.units.length,0);const def=e.cardFor(0,'john-reynolds');assert.equal(def.ascension.active,true);close(def.stats.health,335);close(def.stats.shield,190);close(def.stats.damage,25);close(def.stats.mana,15);close(e.cardFor(0,'sheriff').stats.mana,catalog.byId.get('sheriff').stats.mana);
 e.teams[0].mana=14;assert.equal(e.deploy(0,0,{x:7,y:14}).ok,false);close(e.teams[0].spentMana,0);e.teams[0].mana=20;const paid=e.deploy(0,0,{x:7,y:14});assert.equal(paid.ok,true);close(e.teams[0].spentMana,15);close(paid.units[0].hp,335);e.damage(null,paid.units[0],335*.08,{kind:'spell',bypassShield:true});close(paid.units[0].statuses.find(s=>s.kind==='protection').magnitude,.3);close(paid.units[0].statuses.find(s=>s.kind==='taunt').until,5);
});
