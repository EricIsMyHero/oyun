const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),loaded=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/ascension.mjs')]).then(([{ArenaEngine},{buildCatalog},{resolveDeckCard}])=>({ArenaEngine,resolveDeckCard,catalog:buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json'))))}));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
async function fixture({id,form='type1',bot=false}={}){
 const{ArenaEngine,catalog,resolveDeckCard}=await loaded,baseDeck=['hammies','b-b','scrapy','venomora','ben','freak','bethe','soldier'];if(id)baseDeck[0]=id;
 const e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:baseDeck,spellDeck:['healing-light'],formChoices:id?{[id]:form}:{},bot,seed:34});for(const c of e.castles)c.cooldown=Infinity;
 const spawn=(key,side=0,p={x:15,y:14},extra={})=>{const def=structuredClone(catalog.byId.get(key));Object.assign(def.stats,{speed:0,criticalChance:0,dodge:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...extra});const made=e.spawn(def,side,p,1,{count:1,positions:[p]});for(const u of made){u.stats.speed=0;u.cooldown=Infinity;}return made[0];};
 const dummy=(side=1,p={x:15.6,y:14},extra={})=>{const def=structuredClone(catalog.byId.get('hammies'));def.id='progression-target';def.forms=[];def.combat.attackType='none';Object.assign(def.stats,{health:1000,shield:0,damage:0,speed:0,range:0,dodge:0,criticalChance:0,healrecovery:0,shieldrecovery:0,...extra});const[u]=e.spawn(def,side,p,1,{count:1,positions:[p]});u.cooldown=Infinity;return u;};
 return{e,catalog,spawn,dummy,resolveDeckCard};
}

test('Ethereal decks require an explicit ready form before match creation',async()=>{
 const{ArenaEngine,catalog}=await loaded,deck=['ase','hammies','b-b','scrapy','venomora','ben','freak','soldier'],args={cards:catalog.cards,spells:catalog.spells,deck,spellDeck:['healing-light'],bot:false};
 for(const formChoices of [{},{ase:'type3'},{ase:'lord/type1'}])assert.throws(()=>new ArenaEngine({...args,formChoices}),/Ethereal form/);
 const choices={ase:'type2'},e=new ArenaEngine({...args,formChoices:choices});choices.ase='type1';assert.equal(e.cardFor(0,'ase').variantId,'ase/type2');assert.equal(e.cardFor(1,'ase').variantId,'ase/type2');assert.equal(e.cardFor(0,'ase').stats.range,1000);
});
test('form resolver preserves root deck identity while exposing exact selected native data and descendants',async()=>{
 const{catalog,resolveDeckCard}=await fixture();for(const key of['type1','type2']){const c=resolveDeckCard(catalog.byId,'ase',['ase'],{ase:key});assert.equal(c.id,'ase');assert.equal(c.rootId,'ase');assert.equal(c.variantId,`ase/${key}`);assert.equal(c.raw,catalog.byId.get(`ase/${key}`).raw);assert.equal(c.forms.length,1);assert.equal(c.ethereal.key,key);}
 assert.equal(resolveDeckCard(catalog.byId,'ase',[],{}).choiceRequired,true);
});
test('one Ethereal form is used for every paid deployment without allowing a summon/form to take a deck slot',async()=>{
 const{e}=await fixture({id:'ase',form:'type2'});for(let i=0;i<2;i++){e.teams[0].mana=20;e.teams[0].hand[0]='ase';e.state.units=[];const r=e.deploy(0,0,{x:7,y:14});assert.equal(r.ok,true,r.error);assert.equal(r.units[0].def.variantId,'ase/type2');assert.equal(e.ability(r.units[0]),e.ability({def:e.cards.get('ase/type2')}));assert.equal(r.units[0].deploymentNumber,i+1);}assert.equal(e.teams[0].cardDeployments.ase,2);
});
test('deployment counters are separate per card and team, do not count summons or failed placements, and reset per match',async()=>{
 const{e,catalog}=await fixture();e.teams[0].hand[0]='hammies';const fail=e.deploy(0,0,{x:21,y:14});assert.equal(fail.ok,false);assert.equal(e.teams[0].cardDeployments.hammies,undefined);
 for(const side of[0,1]){e.state.units=[];e.teams[side].hand[0]='hammies';const r=e.deploy(side,0,{x:side?36:7,y:14});assert.equal(r.ok,true);assert.equal(r.units.length,3);assert.ok(r.units.every(u=>u.deploymentNumber===1));assert.equal(e.teams[side].cardDeployments.hammies,1);}
 e.spawn(catalog.byId.get('hammies'),0,{x:15,y:14});assert.equal(e.teams[0].cardDeployments.hammies,1);const fresh=await fixture();assert.deepEqual(fresh.e.teams[0].cardDeployments,{});
});
test('Ase collects four parts over twenty-eight seconds, creates the selected Giga-R, and repeats',async()=>{
 for(const key of['type1','type2']){const{e,spawn}=await fixture(),u=spawn(`ase/${key}`);e.step(27.99);assert.equal(e.units.filter(t=>t.def.id.includes('/giga-r')).length,0);e.step(.01);const robots=e.units.filter(t=>t.def.id.includes('/giga-r'));assert.equal(robots.length,1);assert.equal(robots[0].def.id,`ase/${key}/${key==='type1'?'giga-r':'giga-r-2'}`);close(u.memory.parts,0);e.step(28);assert.equal(e.units.filter(t=>t.def.id.includes('/giga-r')).length,2);}
});
test('Giga-R form I has twenty-two seconds of protection and form II gains capped kill haste',async()=>{
 const{e,spawn,dummy}=await fixture(),tank=spawn('ase/type1/giga-r'),sniper=spawn('ase/type2/giga-r-2');close(e.damage(null,tank,10,{kind:'spell'}).total,9);e.step(22);close(e.damage(null,tank,10,{kind:'spell'}).total,10);
 for(let i=0;i<12;i++){const t=dummy(1,{x:16,y:14},{health:1});e._resolveHit(sniper,t,{damage:72,kind:'attack'});}close(sniper.stats.attackSpeed,1.8/1.3);
});
test('Leno form I changes its critical bonus after twenty-five seconds and form II targets ground at one tile',async()=>{
 const{e,spawn,catalog}=await fixture(),u=spawn('leno/type1');e._hook('tick',u,0);close(u.stats.criticalChance,45);e.step(25);close(u.stats.criticalChance,15);for(const key of['type1','type2'])assert.equal(catalog.byId.get(`leno/${key}`).combat.targets,'ground');close(catalog.byId.get('leno/type2').stats.range,1000);
});
test('Leno form II gets forty-percent bonus only against listed creature types',async()=>{
 for(const type of['Animal','Robot','Dead','Spirit','Alien','Entity','Human']){const{e,spawn,dummy}=await fixture(),u=spawn('leno/type2'),t=dummy();t.def={...t.def,type:[type]};e._fire(u,t);close(e.state.projectiles[0].hit.damage,type==='Human'?50:70);}
});
test('King aura buffs allies while stationary form II summons Guards and timed protection',async()=>{
 const{e,spawn,dummy}=await fixture(),king=spawn('king/type1'),ally=dummy(0),stationary=spawn('king/type2',0,{x:20,y:14},{speed:1000});e._hook('tick',king,0);assert.ok(ally.statuses.some(s=>s.kind==='attackHaste'&&s.magnitude===.25));e._move(stationary,{x:21,y:14},1);close(stationary.x,20);e.step(12);assert.equal(e.units.filter(t=>t.def.id==='king/type2/guard').length,1);assert.ok(stationary.statuses.some(s=>s.kind==='protection'&&s.magnitude===.15));e.step(2);assert.equal(stationary.statuses.some(s=>s.kind==='protection'),false);
});
test('Guards gain thirty-percent Damage against shielded targets',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('king/type2/guard'),t=dummy(1,{x:15.5,y:14},{shield:100});const before=t.hp;e._fire(u,t);close(before-t.hp,3.9);close(t.shield,90.9);
});
test('Dracula form I hovers and grows lifesteal chance to twenty-five while form II flies and spawns ten lightweight Bats',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('dracula/type1'),t=dummy();for(let i=0;i<30;i++)e._resolveHit(u,t,{damage:1,kind:'attack'});close(u.stats.lifestealChance,25);assert.equal(u.def.combat.movementType,'hovering');const flyer=spawn('dracula/type2');flyer.hp=flyer.maxHp*.5;e._hook('tick',flyer,0);close(flyer.stats.damageminimiser,30);assert.equal(flyer.def.combat.movementType,'flying');e.killUnit(flyer);e._drainDeaths();const bats=e.units.filter(t=>t.def.id==='dracula/type2/bats');assert.equal(bats.length,10);assert.ok(bats.every(t=>t.def.combat.weight==='very-light'&&t.def.combat.movementType==='flying'));
});
test('each Bat gets its forty-percent bonus only on its first landed hit',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('dracula/type2/bats'),t=dummy();e._fire(u,t);close(t.hp,993);e._fire(u,t);close(t.hp,988);
});
test('Hunter creature bonuses and death transformations retain the selected form',async()=>{
 for(const[key,type,damage,child]of[['type1','Animal',19.2,'wolf'],['type2','Human',30,'eagle']]){const{e,spawn,dummy}=await fixture(),u=spawn(`hunter/${key}`),t=dummy();t.def={...t.def,type:[type]};e._fire(u,t);close(e.state.projectiles[0].hit.damage,damage);e.killUnit(u);e._drainDeaths();assert.equal(e.units.filter(t=>t.alive&&t.def.id===`hunter/${key}/${child}`).length,1);}
});
test('Wolf hits shields harder and flying Eagle bypasses them',async()=>{
 const{e,spawn,dummy}=await fixture(),wolf=spawn('hunter/type1/wolf'),eagle=spawn('hunter/type2/eagle'),a=dummy(1,{x:15.5,y:14},{shield:100}),b=dummy(1,{x:15.5,y:14},{shield:100});e._fire(wolf,a);close(a.shield,94.75);e._fire(eagle,b);close(b.shield,100);close(b.hp,984);assert.equal(eagle.def.combat.movementType,'flying');
});
test('Soul Master uses separate damage growth and eight-soul attack rules for each form',async()=>{
 const{e,spawn,dummy}=await fixture(),a=spawn('soul-master/type1'),b=spawn('soul-master/type2'),target=dummy(1,{x:16,y:14});for(let i=0;i<10;i++){const t=dummy(i%2,{x:25,y:14});e.killUnit(t);e._drainDeaths();}close(a.stats.damage,20);close(b.memory.souls,10);e._hook('tick',b,0);close(target.hp,900);close(b.memory.souls,2);
});
test('Lord form II regenerates once per second and summons at most five Riders from actual Health loss',async()=>{
 const{e,spawn}=await fixture(),u=spawn('lord/type2');e.damage(null,u,123,{kind:'spell',bypassShield:true});assert.equal(e.units.filter(t=>t.def.id==='lord/type2/rider').length,3);e.step(1);close(u.hp,u.maxHp-122);e.heal(u,100);e.damage(null,u,123,{kind:'spell',bypassShield:true});assert.equal(e.units.filter(t=>t.def.id==='lord/type2/rider').length,5);
});
test('Rider gains fifty-percent permanent damage after its shield breaks',async()=>{
 const{e,spawn}=await fixture(),u=spawn('lord/type2/rider');e.damage(null,u,145,{kind:'spell'});close(u.shield,0);close(u.stats.damage,18);e.giveShield(u,20);close(u.stats.damage,18);
});
test('Leila form II enlarges every fifth explosion and applies eight-second Bleeding',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('leila/type2'),t=dummy(1,{x:17,y:14});for(let i=0;i<5;i++)e._fire(u,t);const shots=e.state.projectiles;assert.equal(shots.length,5);assert.equal(shots[0].profile.impactSize,'1 × 1 tiles');assert.equal(shots[4].profile.impactSize,'1.2 × 1.2 tiles');u.cooldown=Infinity;e.step(.4);const bleed=t.statuses.find(s=>s.kind==='bleed');assert.ok(bleed);assert.ok(bleed.until>8);
});

test('new Emergent geometry, Human manifestation and all Ethereal forms preserve authored measurements',async()=>{
 const{catalog}=await fixture();assert.equal(catalog.forms.length,193);assert.equal(catalog.cards.filter(c=>c.ready).length,138);
 for(const[id,width,distance,arc]of[['xii-josh',1000,1000,135],['dumpsy',500,500,360],['blesser',1000,2000,45],['js',500,500,null],['mimic',1000,2750,75],['the-seven-sins',500,500,null],['stella',500,500,null]]){const p=catalog.byId.get(id).combat;assert.deepEqual([p.attackWidth,p.attackDistance,p.attackAngle],[width,distance,arc],id);}
 for(const c of catalog.cards.filter(c=>c.rarity==='Ethereal')){assert.equal(c.choiceRequired,true);assert.ok(c.typeVariants.every(v=>v.ready));}
 const human=catalog.byId.get('the-seven-sins/human');assert.deepEqual([human.stats.health,human.stats.shield,human.stats.damage,human.stats.attackSpeed],[100,100,10,1]);assert.equal(human.raw.trait,'-');assert.equal(catalog.byId.get('lord/type1').combat.attackWidth,500);assert.equal(catalog.byId.get('mr-and-mrs-ray/type1/the-rays').combat.attackWidth,1000);
});
test('summoned and Ethereal form ids cannot be used directly as deck cards',async()=>{
 const{ArenaEngine,catalog}=await loaded;assert.throws(()=>new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:['ase/type1','hammies','b-b','scrapy','venomora','ben','freak','soldier'],spellDeck:['healing-light']}),/root cards/);
});
test('bot chooses legal forms independently and reproducibly for its own loadout',async()=>{
 const{e:a}=await fixture({bot:true}),{e:b}=await fixture({bot:true});assert.deepEqual(a.teams[1].formChoices,b.teams[1].formChoices);for(const id of a.teams[1].deck){const c=a.cards.get(id);if(c.choiceRequired){assert.ok(['type1','type2'].includes(a.teams[1].formChoices[id]));assert.ok(a.cardFor(1,id).variantId);}}assert.deepEqual(a.teams[0].formChoices,{});
});
test('XII Josh counts only enemy Mana in its centered two-by-two square for haste',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('xii-josh'),ally=dummy(0,{x:15.5,y:14},{mana:20}),enemy=dummy(1,{x:15.9,y:14.9},{mana:10}),far=dummy(1,{x:16.01,y:14},{mana:20});e._hook('tick',u,0);close(u.memory.joshMana,10);close(e.attackInterval(u),1.2/1.05);assert.equal(u.def.combat.movementType,'hovering');
});
test('only every third paid XII Josh deployment empowers all three bodies, and Misfortune lasts until cleansed',async()=>{
 const{e,dummy}=await fixture();let made;for(let n=1;n<=4;n++){e.state.units=[];e.teams[0].hand[0]='xii-josh';e.teams[0].mana=20;const r=e.deploy(0,0,{x:7,y:14});assert.equal(r.ok,true);assert.ok(r.units.every(u=>u.deploymentNumber===n));assert.equal(r.units.length,3);const u=r.units[0],t=dummy(1,{x:8,y:14});e.random=()=>0;e._resolveHit(u,t,{damage:9,kind:'attack'});assert.equal(t.statuses.some(s=>s.kind==='misfortune'),n===3);if(n===3){const status=t.statuses.find(s=>s.kind==='misfortune');assert.equal(status.until,Infinity);close(status.magnitude,.15);e.cleanse(t);assert.equal(t.statuses.length,0);}}
});
test('XII Josh temporary flight ends under Silence and its normal landing deals 24 in a one-and-a-half tile square',async()=>{
 for(const silence of[false,true]){const{e,spawn,dummy}=await fixture(),u=spawn('xii-josh'),t=dummy(1,{x:15.5,y:14.5}),far=dummy(1,{x:17,y:14});e.damage(null,u,95,{kind:'spell',bypassShield:true});assert.equal(u.def.combat.movementType,'flying');if(silence)e.status(u,'silence',20);e.step(10);assert.equal(u.def.combat.movementType,'hovering');assert.equal(u.temporaryFlight,undefined);close(t.hp,silence?1000:976);close(far.hp,1000);}
});
test('JS gains Range from currently missing Health and only every fifth placement uses seventy-five-percent Curse',async()=>{
 for(const ordinal of[1,4,5,6,10]){const{e,spawn,dummy}=await fixture(),u=spawn('js'),t=dummy();u.deploymentNumber=ordinal;u.hp=u.maxHp*.9;e._hook('tick',u,0);close(u.stats.range,4125);e._resolveHit(u,t,{damage:11,kind:'attack'});const curse=t.statuses.find(s=>s.kind==='curse');close(curse.magnitude,ordinal%5===0?.75:.25);close(curse.until,8);e.heal(u,100);e._hook('tick',u,0);close(u.stats.range,4000);}
});
test('Dumpsy starts with three permanent orbital weapons and spends only collected objects on ranged throws',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('dumpsy'),near=dummy(1,{x:15.55,y:14},{health:100000});e.step(.9);assert.equal(u.memory.dumpFixed.length,3);assert.equal(u.memory.dumpLoot.length,0);assert.ok(u.hits>=3);assert.ok(near.hp<100000-30);assert.equal(u.shots,u.hits);near.x=25;
 const target=dummy(1,{x:17.5,y:14}),drop=dummy(0,{x:25,y:14});e.killUnit(drop);e._drainDeaths();assert.equal(u.memory.dumpLoot.length,1);e.step(.27);assert.equal(u.memory.dumpFixed.length,3);assert.equal(u.memory.dumpLoot.length,0);assert.ok(e.state.projectiles.some(p=>p.sourceId===u.id&&p.kind==='orb'));u.cooldown=Infinity;e.step(.5);assert.ok(target.hp<1000);
});
test('Dumpsy has a twelve-object loot cap, unbounded repeated-target growth, and enhanced items only on even deployments',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('dumpsy');for(let i=0;i<20;i++){e.killUnit(dummy(1,{x:25,y:14}));e._drainDeaths();}assert.equal(u.memory.dumpLoot.length,12);assert.equal(u.memory.dumpFixed.length,3);
 e.random=()=>0;u.deploymentNumber=2;e._hook('spawn',u);assert.ok(u.memory.dumpFixed.every(o=>o.element==='slow'));u.deploymentNumber=3;e._hook('spawn',u);assert.ok(u.memory.dumpFixed.every(o=>o.element===null));
 const t=dummy(1,{x:15.55,y:14},{health:100000000});e.step(4);assert.ok(u.memory.dumpCombo.count>10);assert.ok(t.hp<100000000-u.hits*10);close(u.stats.damage,10);
});
test('Dumpsy throws no faster than 1.15 seconds and Slow from enhanced items lasts three seconds',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('dumpsy'),t=dummy(1,{x:17.5,y:14});u.deploymentNumber=2;e.random=()=>0;e._hook('spawn',u);e.killUnit(dummy(0,{x:25,y:14}));e._drainDeaths();e.step(1.14);assert.equal(e.state.projectiles.length,0);e.step(.03);assert.equal(e.state.projectiles.length,1);e.step(.3);const slow=t.statuses.find(s=>s.kind==='slow');assert.ok(slow);close(slow.magnitude,.25);assert.ok(slow.until>4.1&&slow.until<4.5);
});
test('Blesser channels for three seconds while standing for twelve, blesses once and preserves excluded stats',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('blesser',0,{x:15,y:14},{speed:1000}),t=dummy(0,{x:16,y:14},{mana:5,number:3,life:80,damage:10,attackSpeed:1,range:4000});u.deploymentNumber=6;e.random=()=>0;e.step(2.99);close(u.x,15);assert.equal(t.statuses.some(s=>s.kind==='allStatsBonus'),false);e.step(.01);assert.ok(u.memory.blessed);e.step(8.99);close(u.x,15);close(e.maxHealth(t),1250);close(t.hp,1250);close(e.statValue(t,'damage'),12.5);close(e.statValue(t,'mana'),5);close(e.statValue(t,'number'),3);close(e.statValue(t,'life'),80);close(e.attackInterval(t),.8);e.step(1);assert.equal(t.statuses.filter(s=>s.kind==='allStatsBonus').length,1);
});
test('Blesser shield uses maximum Health and retaliates with one second of Bleeding when that layer is hit',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('blesser'),ally=dummy(0,{x:15.6,y:14},{health:200,shield:0}),enemy=dummy(1,{x:16,y:14});e.random=()=>.4;e.step(12);close(ally.shield,50);e.damage(enemy,ally,10,{kind:'attack'});const bleed=enemy.statuses.find(s=>s.kind==='bleed');assert.ok(bleed);close(bleed.until,e.time+1);
});
test('Blesser invisible trap is a centered 1.75 square, triggers once and uses tier-three four-second Stun',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('blesser'),ally=dummy(0,{x:16,y:14}),enemy=dummy(1,{x:20,y:14});u.deploymentNumber=3;e.random=()=>.9;e.step(12);const trap=ally.statuses.find(s=>s.kind==='blessedTrap');assert.ok(trap);close(trap.width,1.75);enemy.x=16.7;enemy.y=14;e.step(.04);const stun=enemy.statuses.find(s=>s.kind==='stun');assert.ok(stun);close(stun.until-e.time,4);assert.ok(Math.hypot(enemy.x-ally.x,enemy.y-ally.y)>3);assert.equal(ally.statuses.some(s=>s.kind==='blessedTrap'),false);
});
test('Mimic creates at most one shield-break clone and one Health-loss clone per victim, retaining copied passives',async()=>{
 const{e,spawn}=await fixture(),u=spawn('mimic'),victim=spawn('magmara',1,{x:16,y:14},{health:1000,shield:20,damage:40});e._resolveHit(u,victim,{damage:30,kind:'attack'});let clones=e.units.filter(t=>t.side===0&&t.def.id==='magmara');assert.equal(clones.length,1);close(clones[0].maxHp,700);close(clones[0].maxShield,14);close(clones[0].stats.damage,28);assert.equal(e.ability(clones[0]),e.ability(victim));e._resolveHit(u,victim,{damage:210,kind:'attack'});clones=e.units.filter(t=>t.side===0&&t.def.id==='magmara');assert.equal(clones.length,2);e.giveShield(victim,20);e._resolveHit(u,victim,{damage:100,kind:'attack'});assert.equal(e.units.filter(t=>t.side===0&&t.def.id==='magmara').length,2);assert.ok(clones.every(c=>c.expiresAt===Infinity));
});
test('Mimic third-deployment Predominance blocks negatives and reflects them at fifty-percent without recursion',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('mimic'),source=dummy();u.deploymentNumber=3;e._hook('spawn',u);e.random=()=>.49;assert.equal(e.status(u,'slow',3,.25,source),null);assert.equal(u.statuses.some(s=>s.kind==='slow'),false);assert.ok(source.statuses.some(s=>s.kind==='slow'));source.statuses=[];e.random=()=>.5;assert.equal(e.status(u,'slow',3,.25,source),null);assert.equal(source.statuses.length,0);
});
test('Seven Sins rolls Human at one percent and selects one of seven manifestations otherwise',async()=>{
 const{e,catalog}=await fixture();for(const[roll,id]of[[.009,'human'],[.01,'pride'],[.99,'sloth']]){let n=0;e.random=()=>n++===0?roll:roll;const[u]=e.spawn(catalog.byId.get('the-seven-sins'),0,{x:15,y:14},1,{count:1,deploymentNumber:4});assert.equal(u.def.id,`the-seven-sins/${id}`);close(u.stats.mana,10);assert.equal(u.deploymentNumber,4);if(id==='human')close(u.maxHp,100);}
});
test('Seven Sins Greed drains current Health each second and gains both Health caps from allied or enemy deaths',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('the-seven-sins/greed'),ally=dummy(0,{x:15.5,y:14}),enemy=dummy(1,{x:15,y:14.6});u.hp=100;ally.hp=500;enemy.hp=200;e.step(1);close(ally.hp,495);close(enemy.hp,198);close(u.hp,107);e.killUnit(enemy);e._drainDeaths();close(u.maxHp,275);close(u.hp,157);
});
test('Seven Sins Lust taunts a three-by-three square, links the weakest ally and waits two seconds after losing it',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('the-seven-sins/lust'),weak=dummy(0,{x:15.5,y:14}),other=dummy(0,{x:15,y:14.5}),corner=dummy(1,{x:16.4,y:15.4});weak.hp=100;e._hook('tick',u,0);assert.equal(u.memory.lustBond,weak.id);assert.ok(corner.statuses.some(s=>s.kind==='taunted'));assert.ok(weak.statuses.some(s=>s.kind==='protection'&&s.magnitude===.05));e.killUnit(weak);e._hook('tick',u,0);assert.equal(u.memory.lustBond,null);e.step(1.99);assert.equal(u.memory.lustBond,null);e.step(.01);assert.equal(u.memory.lustBond,other.id);
});
test('Seven Sins Envy copies burst damage, speed, delay and Range, while Silence restores its base weapon',async()=>{
 const{e,spawn}=await fixture(),u=spawn('the-seven-sins/envy'),target=spawn('r-1',1,{x:15.8,y:14});e._hook('tick',u,0);const attack=e._attackDefinition(u);assert.deepEqual([attack.count,attack.damage,attack.interval,attack.delay,attack.range],[3,70,.8,9,2300]);e._fire(u,target);assert.equal(e.state.projectiles.length,1);close(e.state.projectiles[0].hit.damage,70);e.status(u,'silence',5);e.step(.04);close(u.stats.damage,18);assert.equal(e._profile(u).attackType,'melee');
});
test('Seven Sins Pride, Gluttony, Wrath and Sloth retain their distinct native effects',async()=>{
 const{e,spawn,dummy}=await fixture(),pride=spawn('the-seven-sins/pride'),t=dummy();const hit={damage:16};e._hook('attack',pride,t,hit);close(hit.damage,20);const glutton=spawn('the-seven-sins/gluttony');e._hook('lifesteal',glutton,10);close(glutton.shield,100);const wrath=spawn('the-seven-sins/wrath');wrath.hp=wrath.maxHp*.1;e._hook('tick',wrath,0);close(wrath.stats.damage,45);close(wrath.stats.attackSpeed,.75/1.6);const sloth=spawn('the-seven-sins/sloth');e.step(12);close(sloth.shield,220);
});
test('Stella landing remains twenty damage while later gliders gain ten percent up to fifty',async()=>{
 for(const[n,bonus]of[[1,0],[2,.1],[6,.5],[10,.5]]){const{e,catalog,dummy}=await fixture(),t=dummy(1,{x:15.5,y:14.5});const def=structuredClone(catalog.byId.get('stella'));const[u]=e.spawn(def,0,{x:15,y:14},1,{count:1,deploymentNumber:n});close(t.hp,980);const shot=e.state.projectiles.find(p=>p.kind==='glider');close(shot.hit.damage,12*(1+bonus));close(shot.profile.attackDistance,3000*(1+bonus));close(u.memory.gliderBonus,bonus);}
});
test('Lord first form survives a lethal crossing once and heals a quarter of missing Health over five seconds',async()=>{
 const{e,spawn}=await fixture(),u=spawn('lord/type1');e.damage(null,u,1000,{kind:'spell',bypassShield:true});assert.equal(u.alive,true);assert.ok(u.lordImmortalUsed);close(u.hp,1);e.damage(null,u,10000,{kind:'spell',bypassShield:true});close(u.hp,1);e.step(5);close(u.hp,181);e.damage(null,u,10000,{kind:'spell',bypassShield:true});assert.equal(u.alive,false);
});
test('Leila first form launches a twelve-damage three-by-three Blind bomb after twenty-four successful hits',async()=>{
 const{e,spawn,dummy}=await fixture(),u=spawn('leila/type1'),t=dummy(1,{x:17,y:14});for(let i=0;i<24;i++)e._resolveHit(u,t,{damage:1,kind:'attack'});e._hook('tick',u,0);const shot=e.state.projectiles[0];assert.equal(shot.kind,'grenade');assert.equal(shot.hit.damage,12);assert.equal(shot.profile.impactSize,'3 × 3 tiles');u.cooldown=Infinity;e.step(.4);const blind=t.statuses.find(s=>s.kind==='blind');assert.ok(blind);close(blind.magnitude,.125);assert.ok(blind.until>4);
});
test('Ray first form fuses shared Health into one target, pulses twenty times, then splits Health proportionally',async()=>{
 const{e,spawn,dummy}=await fixture(),a=spawn('mr-and-mrs-ray/type1'),b=e.units.find(t=>t.def.id==='mr-and-mrs-ray/type1/the-rays'),target=dummy(1,{x:15.6,y:14});a.hp=180;b.hp=130;a.memory.rayCharge=b.memory.rayCharge=100;e._hook('tick',a,0);assert.equal(b.fusedInto,a.id);close(e.maxHealth(a),620);close(a.hp,310);assert.equal(e.canTarget(target,b),false);e.damage(null,a,40,{kind:'spell',bypassShield:true});close(a.hp,280);e.step(5);assert.equal(a.sharedVitalsId,undefined);assert.equal(b.fusedInto,undefined);close(a.hp+b.hp,340);close(a.hp/360,b.hp/260);close(target.hp,900);
});
test('Ray shared Health death kills both and leaves no permanently fused body',async()=>{
 const{e,spawn}=await fixture(),a=spawn('mr-and-mrs-ray/type1'),b=e.units.find(t=>t.def.id==='mr-and-mrs-ray/type1/the-rays');a.memory.rayCharge=b.memory.rayCharge=100;e._hook('tick',a,0);e.killUnit(a);e._syncRayFusions(true);assert.equal(a.alive,false);assert.equal(b.alive,false);assert.equal(b.fusedInto,undefined);assert.equal(e.state.sharedVitals.length,0);
});
test('Ray second form fuses, travels five tiles in 3.75 seconds and hits each crossed target once',async()=>{
 const{e,spawn,dummy}=await fixture(),a=spawn('mr-and-mrs-ray/type2'),b=e.units.find(t=>t.def.id==='mr-and-mrs-ray/type2/the-rays'),t=dummy(1,{x:18,y:14});a.memory.rayCharge=b.memory.rayCharge=100;e._hook('tick',a,0);assert.ok(a.rayDash);e.step(3.8);assert.equal(a.rayDash,undefined);close(a.x,20);close(t.hp,925);
});
test('Ray second form rescue is available once per deployment even when later dashes begin',async()=>{
 const{e,spawn}=await fixture(),a=spawn('mr-and-mrs-ray/type2'),b=e.units.find(t=>t.def.id==='mr-and-mrs-ray/type2/the-rays');e.startRayDash(a,b);e.damage(null,a,2560,{kind:'spell',bypassShield:true});close(a.hp,580);assert.ok(a.rayHealUsed);assert.ok(b.rayHealUsed);e.damage(null,a,2000,{kind:'spell',bypassShield:true});close(a.hp,80);e.step(3.8);e.startRayDash(a,b);e._hook('tick',a,0);close(a.hp,80);
});

test('Dracula authored twenty-five-percent Lifesteal Chance can gain an additional twenty-five points',async()=>{
 const{e,catalog,dummy}=await fixture(),[u]=e.spawn(catalog.byId.get('dracula/type1'),0,{x:15,y:14},1,{count:1}),t=dummy();for(let i=0;i<30;i++)e._resolveHit(u,t,{damage:1,kind:'attack'});close(u.stats.lifestealChance,50);close(u.memory.draculaSiphon,25);
});
test('missing Shield-absorption data uses seventy percent while an explicit zero is retained',async()=>{
 const{e,spawn,dummy}=await fixture(),human=spawn('the-seven-sins/human');close(human.stats.shieldtakendamage,70);e.damage(null,human,10,{kind:'spell'});close(human.hp,97);close(human.shield,93);const t=dummy(1,{x:16,y:14},{shield:100,shieldtakendamage:0});e.damage(null,t,10,{kind:'spell'});close(t.shield,100);close(t.hp,990);
});
test('Thief borrows the selected Ethereal native handler and keeps its own weapon stats',async()=>{
 const{e,spawn,dummy}=await fixture({id:'ase',form:'type2'}),u=spawn('thief'),def=structuredClone(e.cardFor(1,'ase'));const[donor]=e.spawn(def,1,{x:16,y:14},1,{count:1});assert.equal(e.stealAbility(u),true);assert.equal(u.def.variantId,'ase/type2');close(u.stats.damage,20);assert.equal(donor.passiveDisabled,true);e._hook('tick',u,28);assert.equal(e.units.filter(t=>t.side===0&&t.def.id==='ase/type2/giga-r-2').length,1);
});

test('Mimic copies the intrinsic movement rather than making temporary XII Josh flight permanent',async()=>{
 const{e,spawn}=await fixture(),u=spawn('mimic'),target=spawn('xii-josh',1,{x:16,y:14},{health:1000,shield:20});e.takeFlight(target,10);e._resolveHit(u,target,{damage:30,kind:'attack'});const clone=e.units.find(t=>t.side===0&&t.def.id==='xii-josh');assert.ok(clone);assert.equal(clone.def.combat.movementType,'hovering');assert.equal(clone.temporaryFlight,undefined);close(clone.stats.damage,6.3);
});
