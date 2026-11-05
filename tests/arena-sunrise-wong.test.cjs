const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const loaded=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs')]).then(([{ArenaEngine},{buildCatalog}])=>({ArenaEngine,catalog:buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json'))))}));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
async function fixture(){
 const {ArenaEngine,catalog}=await loaded;
 const e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:catalog.cards.filter(c=>c.ready).slice(0,8).map(c=>c.id),spellDeck:['healing-light'],bot:false,seed:27});
 const spawn=(id,side=0,p={x:15,y:14},stats={})=>{const def=structuredClone(catalog.byId.get(id));Object.assign(def.stats,{speed:0,criticalChance:0,dodge:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...stats});return e.spawn(def,side,p,1,{count:1})[0];};
 const dummy=(side=1,p={x:15.9,y:14},stats={})=>{const def=structuredClone(catalog.byId.get('hammies'));def.id='growth-burst-target';def.forms=[];def.combat.attackType='none';Object.assign(def.stats,{health:1000,shield:0,damage:0,range:0,speed:0,dodge:0,criticalChance:0,healrecovery:0,shieldrecovery:0,...stats});return e.spawn(def,side,p,1,{count:1})[0];};
 const draw=u=>{u.hp=u.maxHp*.39;e._hook('damaged',u,null,{total:1},{});};
 return{e,catalog,spawn,dummy,draw};
}

test('Sunrise and Wong unlock without changing authored stats, geometry, Power or source definitions',async()=>{
 const {catalog}=await fixture();assert.equal(catalog.cards.filter(c=>c.ready).length,99);
 const s=catalog.byId.get('sunrise'),w=catalog.byId.get('wong');for(const c of[s,w]){assert.equal(c.ready,true);assert.deepEqual(c.reasons,[]);}
 assert.deepEqual([s.stats.health,s.stats.shield,s.stats.damage,s.stats.mana,s.stats.range,s.attack.interval],[155,155,38,11,2000,1.5]);
 assert.deepEqual([w.stats.health,w.stats.shield,w.stats.damage,w.stats.mana,w.stats.range,w.attack.interval],[445,10,28,17,1000,1.1]);
 assert.equal(s.combat.attackType,'melee');assert.equal(w.combat.attackType,'melee');assert.equal(w.combat.attackShape,'line');
});

test('Sunrise earns one current and maximum Health after 0.6 seconds of real movement',async()=>{
 const {e,spawn}=await fixture(),u=spawn('sunrise',0,{x:15,y:14},{speed:1000});u.hp=100;e.step(.3);close(u.hp,100);close(u.maxHp,155);assert.ok(u.x>15);
 e.step(.3);close(u.hp,101);close(u.maxHp,156);close(u.stats.health,156);close(u.memory.sunriseGrowth,1);close(u.shield,155);close(u.def.stats.health,155);
});

test('Sunrise movement growth caps at an additional 210 rather than 210 total Health',async()=>{
 const {e,spawn}=await fixture(),u=spawn('sunrise',0,{x:15,y:14},{speed:1000});u.hp=100;
 for(let i=0;i<260;i++){u.x=15;e._move(u,{x:16,y:14},.6);}
 close(u.memory.sunriseGrowth,210);close(u.maxHp,365);close(u.stats.health,365);close(u.hp,310);close(u.def.stats.health,155);close(u.shield,155);
});

test('Sunrise standing still and a combat stop do not earn movement growth',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn('sunrise',0,{x:15,y:14},{speed:1000});dummy(1,{x:15.6,y:14});e.step(3);close(u.x,15);close(u.memory.sunriseGrowth||0,0);
 const {e:f,spawn:other}=await fixture(),still=other('sunrise');f.step(3);close(still.memory.sunriseGrowth||0,0);
});

test('Root and pause preserve partial movement progress without granting stationary time',async()=>{
 const {e,spawn}=await fixture(),u=spawn('sunrise',0,{x:15,y:14},{speed:1000});e.step(.3);e.status(u,'root',10);e.step(2);close(u.memory.sunriseGrowth||0,0);
 const time=e.time;e.setPaused(true);e.step(100);close(e.time,time);e.setPaused(false);e.cleanse(u);e.step(.3);close(u.memory.sunriseGrowth,1);
});

test('Silenced movement does not grant Sunrise deferred growth when Silence ends',async()=>{
 const {e,spawn}=await fixture(),u=spawn('sunrise',0,{x:15,y:14},{speed:1000});e.status(u,'silence',10);e.step(1.2);close(u.memory.sunriseGrowth||0,0);e.cleanse(u);e.step(.6);close(u.memory.sunriseGrowth,1);
});

test('Sunrise growth increases capacity and current Health rather than multiplying a heal',async()=>{
 const {e,spawn}=await fixture(),u=spawn('sunrise',0,{x:15,y:14},{speed:1000,healBonus:100});u.hp=100;e._move(u,{x:16,y:14},.6);close(u.hp,101);close(e.maxHealth(u),156);
});

test('Wong pays seventeen mana once, with no extra charge for its special burst',async()=>{
 const {e}=await fixture();e.teams[0].mana=20;e.teams[0].hand[0]='wong';const paid=e.deploy(0,0,{x:7,y:14});assert.equal(paid.ok,true);const u=paid.units[0];u.hp=170;e._hook('tick',u,0);assert.equal(u.wongBurstUsed,true);assert.equal(e.teams[0].spentMana,17);assert.equal(e.teams[0].mana,3);assert.equal(e.teams[0].deployed,1);assert.equal(e.teams[0].queue.at(-1),'wong');
});

test('Wong gains 25 charge per successful damage event and its next attack pushes and stuns',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn('wong'),t=dummy();for(let i=0;i<4;i++)e._fire(u,t);close(t.hp,888);close(u.memory.charge,100);e._fire(u,t);close(t.hp,860);close(t.x,18.9);close(u.memory.charge,25);assert.ok(t.statuses.some(s=>s.kind==='stun'&&s.until===1));
});

test('blocked Wong hits grant no charge or on-hit effects',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn('wong'),t=dummy();e.status(t,'untouchable',10);e._fire(u,t);close(t.hp,1000);close(u.memory.charge||0,0);assert.equal(t.statuses.some(s=>s.kind==='stun'),false);
});

test('Wong special activates strictly below forty percent and kicks enemies, excluding allies',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn('wong'),t=dummy(1,{x:16,y:14}),ally=dummy(0,{x:15.6,y:14});u.shield=0;u.hp=178;e._hook('tick',u,0);assert.equal(u.wongBurstUsed,undefined);
 e.damage(null,u,1,{kind:'spell',bypassShield:true});assert.equal(u.wongBurstUsed,true);close(t.x,21);close(ally.x,15.6);assert.equal(e._profile(u).attackType,'ranged');close(e.attackInterval(u),.4);close(e._range(u),1);close(u.stats.damage,28);close(u.stats.attackSpeed,1.1);close(u.stats.range,1000);
});

test('Wong fires eight real projectiles at 0.4 seconds then resumes 28-damage melee',async()=>{
 const {e,spawn,dummy,draw}=await fixture(),u=spawn('wong');draw(u);const t=dummy();e.status(t,'predominance',30);e.step(3);
 close(t.hp,936);close(u.shots,8);close(u.memory.wongShots,8);assert.equal(u.attackMode,undefined);assert.equal(e._profile(u).attackType,'melee');close(e.attackInterval(u),1.1);close(u.stats.damage,28);close(u.stats.attackSpeed,1.1);e.step(1);close(u.shots,9);close(t.hp,908);
});

test('a Wong burst waits for a target instead of spending shots into empty fog',async()=>{
 const {e,spawn,draw}=await fixture(),u=spawn('wong');draw(u);e.step(5);close(u.shots,0);close(u.attackMode.remaining,8);close(u.memory.wongShots,0);
});

test('stunning an active Wong pauses its burst and does not restart the eight-shot allowance',async()=>{
 const {e,spawn,dummy,draw}=await fixture(),u=spawn('wong');draw(u);const t=dummy();e.status(t,'predominance',30);e.step(.5);close(u.shots,2);e.status(u,'stun',2);e.step(1);close(u.shots,2);close(u.attackMode.remaining,6);e.cleanse(u);e.step(2.1);close(u.shots,8);close(t.hp,936);assert.equal(u.attackMode,undefined);
});

test('Misfortune misses consume the finite special ammunition and still restore melee',async()=>{
 const {e,spawn,dummy,draw}=await fixture(),u=spawn('wong');draw(u);const t=dummy();e.status(u,'misfortune',30,.1);e.random=()=>0;for(let i=0;i<8;i++)e._fire(u,t);close(u.shots,8);close(u.memory.wongShots,8);close(t.hp,1000);assert.equal(e.state.projectiles.length,0);assert.equal(u.attackMode,undefined);assert.equal(e._profile(u).attackType,'melee');
});

test('Silence during an already active Wong burst cannot leave permanent firearm mode',async()=>{
 const {e,spawn,dummy,draw}=await fixture(),u=spawn('wong');draw(u);const t=dummy();e.status(u,'silence',30);for(let i=0;i<8;i++)e._fire(u,t);assert.equal(u.attackMode,undefined);close(u.memory.wongShots,8);assert.equal(e._profile(u).attackType,'melee');
});

test('healing above the threshold then taking damage cannot trigger a second Wong burst',async()=>{
 const {e,spawn,dummy,draw}=await fixture(),u=spawn('wong');draw(u);const t=dummy();for(let i=0;i<8;i++)e._fire(u,t);u.hp=u.maxHp;e.damage(null,u,300,{kind:'spell',bypassShield:true});e._hook('tick',u,0);assert.equal(u.attackMode,undefined);assert.equal(u.wongBurstUsed,true);close(u.memory.wongShots,8);
});

test('a lethal hit does not start a special burst or push enemies after Wong dies',async()=>{
 const {e,spawn,dummy}=await fixture(),u=spawn('wong'),t=dummy();e.damage(null,u,10000,{kind:'spell',bypassShield:true});assert.equal(u.alive,false);assert.equal(u.wongBurstUsed,undefined);close(t.x,15.9);assert.equal(u.attackMode,undefined);
});

test('each independently placed Wong has its own one-use special allowance',async()=>{
 const {spawn,draw}=await fixture(),a=spawn('wong'),b=spawn('wong',0,{x:17,y:14});draw(a);draw(b);assert.equal(a.wongBurstUsed,true);assert.equal(b.wongBurstUsed,true);close(a.attackMode.remaining,8);close(b.attackMode.remaining,8);
});

test('Format promotion preserves the per-deployment Wong allowance and clears an active stance',async()=>{
 const {e,spawn,draw}=await fixture(),u=spawn('format'),target=spawn('wong',1,{x:18,y:14});e.step(3);assert.equal(u.def.id,'wong');draw(u);assert.ok(u.attackMode);assert.equal(u.wongBurstUsed,true);
 e.damage(u,target,10000,{kind:'spell',bypassShield:true});assert.equal(u.memory.format.promoted,true);assert.equal(u.attackMode,undefined);assert.equal(u.wongBurstUsed,true);u.hp=e.maxHealth(u)*.39;e._hook('tick',u,0);assert.equal(u.attackMode,undefined);
});
