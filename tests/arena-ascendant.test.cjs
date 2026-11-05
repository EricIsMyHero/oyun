const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const loaded=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/ascension.mjs')]).then(([{ArenaEngine},{buildCatalog},{resolveDeckCard}])=>({ArenaEngine,resolveDeckCard,catalog:buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json'))))}));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
async function fixture(ids=[]){
 const {ArenaEngine,catalog,resolveDeckCard}=await loaded,deck=[...ids];for(const c of catalog.cards.filter(c=>c.ready))if(deck.length<8&&!deck.includes(c.id))deck.push(c.id);
 const e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck,spellDeck:['healing-light'],bot:false,seed:29});
 const spawn=(id,side=0,p={x:15,y:14},stats={})=>{const def=structuredClone(catalog.byId.get(id));Object.assign(def.stats,{speed:0,criticalChance:0,dodge:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...stats});return e.spawn(def,side,p,1,{count:1})[0];};
 const dummy=(side=1,p={x:17,y:14},stats={})=>{const def=structuredClone(catalog.byId.get('hammies'));def.id='ascendant-target';def.forms=[];def.combat.attackType='none';Object.assign(def.stats,{health:1000,shield:0,damage:0,speed:0,range:0,dodge:0,criticalChance:0,healrecovery:0,shieldrecovery:0,...stats});return e.spawn(def,side,p,1,{count:1,positions:[p]})[0];};
 return{e,catalog,resolveDeckCard,deck,spawn,dummy};
}

test('five Ascendant roots and all five empowered forms unlock with authored stats and geometry',async()=>{
 const {catalog}=await fixture();assert.equal(catalog.cards.filter(c=>c.ready).length,137);
 for(const id of ['reacher','bastra','maapp','avara','john-reynolds'])for(const key of [id,id+'/ascended']){const c=catalog.byId.get(key);assert.equal(c.ready,true,key);assert.deepEqual(c.reasons,[]);close(c.stats.vision,8000);}
 const r=catalog.byId.get('reacher');assert.equal(r.combat.attackType,'mixed');assert.equal(r.combat.targets,'both');close(r.combat.attackDistance,500);assert.deepEqual(r.attack.modes.map(m=>[m.damage,m.count,m.interval,m.delay,m.range]),[[24,1,1.2,0,1000],[8,2,.2,.8,2200]]);
 const m=catalog.byId.get('maapp');assert.deepEqual([m.combat.attackWidth,m.combat.attackDistance,m.combat.attackAngle,m.combat.weight],[5000,5000,360,'light']);
 assert.equal(catalog.byId.get('john-reynolds').ready,true);
});

test('each authored partner activates exactly one stronger form based on original deck membership',async()=>{
 const {catalog,resolveDeckCard}=await fixture(),before=JSON.stringify(catalog.cards);
 for(const [id,partner,mana,health]of [['reacher','soldier',15,250],['bastra','maapp',11,140],['maapp','bastra',7,110],['avara','bastra',18,180],['bastra','avara',11,140],['maapp','avara',7,110],['avara','maapp',18,180]]){
  const base=catalog.byId.get(id);assert.equal(resolveDeckCard(catalog.byId,id,[id,'hammies']),base);const form=resolveDeckCard(catalog.byId,id,[id,partner]);assert.equal(form.id,id);assert.equal(form.ascension.active,true);close(form.stats.mana,mana);close(form.stats.health,health);assert.equal(form.power,base.ascended.power);
 }
 assert.equal(resolveDeckCard(catalog.byId,'soldier',['reacher','soldier']),catalog.byId.get('soldier'));assert.equal(JSON.stringify(catalog.cards),before);
 const once=resolveDeckCard(catalog.byId,'bastra',['bastra','maapp','avara']);close(once.stats.mana,11);close(once.stats.health,140);
});

test('each team resolves its own partner membership without consulting the enemy deck',async()=>{
 const {e}=await fixture(['reacher','soldier']);e.teams[1].deck=e.teams[1].deck.filter(id=>id!=='soldier');close(e.cardFor(0,'reacher').stats.mana,15);close(e.cardFor(1,'reacher').stats.mana,11);
});

test('partner deployment charges the increased price atomically and keeps root IDs in the cycle',async()=>{
 const {e}=await fixture(['reacher','soldier']);e.teams[0].hand[0]='reacher';e.teams[0].mana=14;const hand=[...e.teams[0].hand];assert.equal(e.deploy(0,0,{x:7,y:14}).ok,false);assert.deepEqual(e.teams[0].hand,hand);close(e.teams[0].spentMana,0);
 e.teams[0].mana=20;const paid=e.deploy(0,0,{x:7,y:14});assert.equal(paid.ok,true);close(e.teams[0].mana,5);close(e.teams[0].spentMana,15);assert.equal(e.teams[0].queue.at(-1),'reacher');assert.equal(paid.units[0].def.ascension.active,true);close(paid.units[0].hp,250);close(paid.units[0].shield,250);
});

test('unplayed or destroyed partners keep the bonus active for the whole match',async()=>{
 const {e,spawn}=await fixture(['reacher','soldier']);assert.equal(e.units.length,0);close(e.cardFor(0,'reacher').stats.mana,15);const soldier=spawn('soldier');e.damage(null,soldier,10000,{kind:'spell',bypassShield:true});e._drainDeaths();close(e.cardFor(0,'reacher').stats.mana,15);assert.ok(e.teams[0].deck.includes('soldier'));
});

test('all upgraded mana prices come from their authored forms rather than a percentage multiplier',async()=>{
 for(const [id,partner,cost]of [['bastra','maapp',11],['maapp','bastra',7],['avara','bastra',18]]){const {e}=await fixture([id,partner]);e.teams[0].hand[0]=id;e.teams[0].mana=20;const result=e.deploy(0,0,{x:7,y:14});assert.equal(result.ok,true);close(e.teams[0].spentMana,cost);close(e.teams[0].mana,20-cost);}
});

test('Reacher fires a two-shot ranged burst at ground enemies before contact',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn('reacher'),t=dummy();e.step(.25);close(u.shots,2);assert.equal(e._profile(u).attackType,'ranged');assert.equal(u.memory.combatMode,1);e.step(.2);close(t.hp,984);close(u.x,15);close(u.def.stats.damage,24);assert.ok(u.cooldown>.7);
});

test('Reacher uses melee against close ground enemies but ranged shots against equally close flyers',async()=>{
 for(const air of [false,true]){const {e,spawn,dummy}=await fixture(),u=spawn('reacher'),t=dummy(1,{x:15.6,y:14});if(air)t.def.combat.movementType='flying';e.step(.25);assert.equal(e._profile(u).attackType,air?'ranged':'melee');close(t.hp,air?984:976);close(u.shots,air?2:1);}
});

test('empowered Reacher uses the authored 32 melee damage and two twelve-damage ranged shots',async()=>{
 for(const melee of [false,true]){const {e,spawn,dummy}=await fixture(),u=spawn('reacher/ascended'),t=dummy(1,{x:melee?15.6:17,y:14});e.step(.7);close(t.hp,melee?968:976);close(u.stats.attackSpeed,melee?1.1:.4);}
});

test('Reacher can change weapon mid-burst without changing an already launched projectile payload',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn('reacher'),far=dummy();e._fire(u,far);const shot=e.state.projectiles[0];close(shot.hit.damage,8);assert.equal(u.burstIndex,1);const near=dummy(1,{x:15.6,y:14});e._fire(u,near);assert.equal(u.memory.combatMode,0);close(near.hp,976);close(shot.hit.damage,8);assert.equal(u.burstIndex,0);
});

test('Reacher square ally count excludes self, enemies, buildings and units outside 3 by 3 tiles',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn('reacher');dummy(0,{x:14,y:13});dummy(0,{x:16.4,y:15.4});dummy(0,{x:16.6,y:14});dummy(1,{x:15.5,y:14});const building=dummy(0,{x:15,y:14.5});building.isBuilding=true;e._hook('tick',u,0);close(u.memory.nearbyFriends,2);close(u.stats.damageminimiser,4);
});

test('Reacher caps ally protection at sixteen percent normally and twenty-four when empowered',async()=>{
 for(const up of [false,true]){const {e,spawn,dummy}=await fixture(),u=spawn(up?'reacher/ascended':'reacher');for(let i=0;i<10;i++)dummy(0,{x:14+(i%3),y:13+Math.floor(i/3)*.6});e._hook('tick',u,0);close(u.stats.damageminimiser,up?24:16);const result=e.damage(null,u,100,{kind:'spell',bypassShield:true});close(result.total,up?76:84);}
});

test('Reacher loses ally protection under Silence while its basic weapon switching still works',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn('reacher');dummy(0,{x:14,y:13});const t=dummy(1,{x:15.6,y:14});e._hook('tick',u,0);close(u.stats.damageminimiser,2);e.status(u,'silence',10);e.step(1/30);close(u.stats.damageminimiser,0);assert.equal(e._profile(u).attackType,'melee');close(t.hp,976);
});

test('Bastra bypasses shields with real ranged projectiles',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn('bastra'),t=dummy(1,{x:17,y:14},{shield:100});e._fire(u,t);u.cooldown=Infinity;e.step(.4);close(t.hp,930);close(t.shield,100);close(u.stats.damage,70);
});

test('Bastra recalculates two or three percent haste per nearby ally and clears it on Silence',async()=>{
 for(const up of [false,true]){const {e,spawn,dummy}=await fixture(),u=spawn(up?'bastra/ascended':'bastra'),a=dummy(0,{x:14,y:13});dummy(0,{x:16,y:15});e._hook('tick',u,0);close(e.attackInterval(u),2/(1+(up?.03:.02)*2));a.x=19;e._hook('tick',u,0);close(e.attackInterval(u),2/(1+(up?.03:.02)));e.status(u,'silence',10);e.step(1/30);close(e.attackInterval(u),2);}
});

test('Maapp pulses in all directions and hits air without producing a projectile',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn('maapp'),front=dummy(1,{x:19.8,y:14}),back=dummy(1,{x:10.2,y:14}),air=dummy(1,{x:15,y:18.8}),far=dummy(1,{x:20.5,y:14});air.def.combat.movementType='flying';e.random=()=>.99;e._fire(u,front);for(const t of[front,back,air])close(t.hp,998);close(far.hp,1000);assert.equal(e.state.projectiles.length,0);assert.ok(e.state.effects.some(f=>f.type==='wave'&&f.radius===5));
});

test('Maapp proc probability, updated reduction probabilities and two/three second duration match both forms',async()=>{
 for(const up of [false,true])for(const proc of [false,true]){const {e,spawn,dummy}=await fixture(),u=spawn(up?'maapp/ascended':'maapp'),t=dummy(1,{x:17,y:14},{damage:100});e.random=()=>((up?.10:.08)+(proc?-.001:0));e._fire(u,t);u.cooldown=Infinity;close(e.statValue(t,'damage'),proc?(up?20:25):100);if(proc){close(t.statuses.find(s=>s.kind==='statReduction').until,up?3:2);e.step(up?3:2);close(e.statValue(t,'damage'),100);}}
});

test('Maapp reduction respects Predominance and Cleanse',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn('maapp'),t=dummy(1,{x:17,y:14},{damage:100});e.random=()=>0;e.status(t,'predominance',10);e._fire(u,t);close(e.statValue(t,'damage'),100);e.cleanse(t);t.statuses=[];e._fire(u,t);close(e.statValue(t,'damage'),25);e.cleanse(t);close(e.statValue(t,'damage'),100);
});

test('Avara source modes preserve four damage values, four ranges and a delay after every attack',async()=>{
 const {catalog}=await fixture();for(const up of[false,true]){const a=catalog.byId.get(up?'avara/ascended':'avara');assert.deepEqual(a.attack.sequence.map(m=>m.damage),up?[26,52,76,108]:[22,44,64,92]);assert.deepEqual(a.attack.sequence.map(m=>m.range),[2200,2400,4200,5000]);assert.deepEqual(a.attack.sequence.map(m=>m.interval),[1.35,.75,.85,1.75]);assert.deepEqual(a.attack.sequence.map(m=>m.delay),Array(4).fill(1.45));}
});

test('Avara first attack hits only its forward 2.5 by 5 rectangle and slows every victim',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn('avara'),target=dummy(1,{x:17,y:14}),deep=dummy(1,{x:19.7,y:15.2}),behind=dummy(1,{x:14.5,y:14}),wide=dummy(1,{x:17,y:15.6}),far=dummy(1,{x:20.4,y:14});e._fire(u,target);for(const t of[target,deep]){close(t.hp,978);const s=t.statuses.find(s=>s.kind==='slow');close(s.magnitude,.4);close(s.until,2.5);}for(const t of[behind,wide,far])close(t.hp,1000);close(u.cooldown,2.8);assert.equal(e.state.projectiles.length,0);
});

test('Avara fourth attack centers a wide 5 by 2.5 rectangle on the enemy',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn('avara');u.sequenceIndex=3;const target=dummy(1,{x:19.5,y:14}),wide=dummy(1,{x:19.5,y:16.4}),deep=dummy(1,{x:20.6,y:14}),near=dummy(1,{x:15.7,y:14}),outside=dummy(1,{x:21.1,y:14});e._fire(u,target);for(const t of[target,wide,deep])close(t.hp,908);for(const t of[near,outside])close(t.hp,1000);close(u.cooldown,3.2);assert.equal(u.sequenceIndex%4,0);
});

test('Avara rectangular attacks rotate with its aim for the opposite team and vertical targets',async()=>{
 for(const [side,point]of [[1,{x:12,y:14}],[0,{x:15,y:17}]]){const {e,spawn,dummy}=await fixture(),u=spawn('avara',side),target=dummy(1-side,point);Object.assign(target,point);e._fire(u,target);close(target.hp,978);const fx=e.state.effects.find(f=>f.type==='blastArea');assert.ok(fx);close(fx.width,5);close(fx.height,2.5);}
});

test('Avara raspberry and avocado keep their launch mode after the sequence advances',async()=>{
 for(const up of[false,true])for(const step of[1,2]){const {e,spawn,dummy}=await fixture(),u=spawn(up?'avara/ascended':'avara');u.sequenceIndex=step;const t=dummy();e._fire(u,t);u.cooldown=Infinity;assert.equal(e.state.projectiles[0].kind,step===1?'raspberry':'avocado');e.step(.5);close(t.hp,1000-(up?[26,52,76,108]:[22,44,64,92])[step]);if(step===1)close(t.x,up?20:19.5);else{const s=t.statuses.find(s=>s.kind==='stun');assert.ok(s);assert.ok(s.until-e.time>0);assert.ok(s.until-e.time<=(up?1.25:.75));}}
});

test('Avara automatically cycles all four attacks using the requested per-attack delays',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn('avara'),t=dummy(1,{x:17,y:14},{health:100000});e.status(t,'predominance',30);const times=[];while(times.length<5&&e.time<15){const previous=u.shots;e.step(1/30);if(u.shots>previous)times.push(e.time);}assert.equal(times.length,5);for(let i=1;i<5;i++)close(times[i]-times[i-1],[2.8,2.2,2.3,3.2][i-1]);assert.equal(u.sequenceIndex%4,1);
});

test('empowered Avara improves first-area Slow, has a higher mana price and leaves source data untouched',async()=>{
 const {e,catalog,spawn,dummy}=await fixture(),u=spawn('avara/ascended'),t=dummy();e._fire(u,t);close(t.hp,974);const slow=t.statuses.find(s=>s.kind==='slow');close(slow.magnitude,.5);close(slow.until,2.75);close(u.stats.mana,18);assert.equal(catalog.byId.get('avara').raw.stats.damage,'22/44/64/92');
});

test('an empowered form cannot be selected directly to bypass its partner requirement',async()=>{
 const {e,catalog,deck}=await fixture(['reacher']);const {ArenaEngine}=await loaded;assert.throws(()=>new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:deck.map(id=>id==='reacher'?'reacher/ascended':id),spellDeck:['healing-light']}),/root cards/);assert.equal(e.cardFor(0,'reacher').ascension,undefined);
});

test('Format copies both Reacher modes without treating its current ranged damage as the melee base',async()=>{
 const {e,spawn}=await fixture(),u=spawn('format'),target=spawn('reacher/ascended',1,{x:18,y:14});e.step(3);assert.equal(u.def.id,'reacher/ascended');assert.deepEqual(u.def.attack.modes.map(m=>m.damage),[32,12]);assert.deepEqual(u.def.attack.modes.map(m=>m.interval),[1.1,.4]);
 e.damage(u,target,10000,{kind:'spell',bypassShield:true});assert.equal(u.memory.format.promoted,true);assert.deepEqual(u.def.attack.modes.map(m=>m.damage),[64,24]);assert.deepEqual(u.def.attack.modes.map(m=>m.interval),[.55,.2]);
});
