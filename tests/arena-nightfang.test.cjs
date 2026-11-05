const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const loaded=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/vision.mjs')]).then(([{ArenaEngine},{buildCatalog},vision])=>({ArenaEngine,vision,catalog:buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json'))))}));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
async function fixture(){
  const {ArenaEngine,catalog,vision}=await loaded;
  const e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:catalog.cards.filter(c=>c.ready).slice(0,8).map(c=>c.id),spellDeck:['healing-light'],bot:false,seed:35});
  const spawn=(id='nightfang',side=0,p={x:15,y:14},stats={})=>{
    const def=structuredClone(catalog.byId.get(id));
    Object.assign(def.stats,{speed:0,criticalChance:0,dodge:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...stats});
    const [u]=e.spawn(def,side,p,1,{count:1,positions:[p]});u.cooldown=Infinity;return u;
  };
  const dummy=(p={x:15.6,y:14},stats={})=>{
    const def=structuredClone(catalog.byId.get('hammies'));def.id='nightfang-target';def.forms=[];def.combat.attackType='none';
    Object.assign(def.stats,{health:1000,shield:0,damage:0,range:0,speed:0,dodge:0,criticalChance:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...stats});
    const [u]=e.spawn(def,1,p,1,{count:1,positions:[p]});u.cooldown=Infinity;return u;
  };
  const hit=(u,t,damage=2)=>e._resolveHit(u,t,{damage,kind:'attack'});
  return {e,catalog,vision,spawn,dummy,hit};
}

test('Nightfang completes all 138 roots with authored geometry and independent Range and Vision',async()=>{
  const {catalog}=await fixture(),u=catalog.byId.get('nightfang');
  assert.equal(catalog.cards.filter(c=>c.ready).length,138);assert.deepEqual(u.reasons,[]);
  assert.equal(u.combat.attackWidth,500);assert.equal(u.combat.attackDistance,500);assert.equal(u.combat.scoutingRadius,12.5);
  close(u.stats.vision,12500);close(u.stats.range,12000);close(u.attack.interval,.1);close(u.attack.damage,2);
});

test('Nightfang reveals 12.5 tiles even while invisible, sharing sight without increasing other card radii',async()=>{
  const {e,vision,spawn,dummy}=await fixture(),u=spawn(),edge={x:u.x+12.5,y:u.y},beyond={x:edge.x+.001,y:edge.y};
  assert.equal(vision.isPointVisible(e.state,0,edge),true);assert.equal(vision.isPointVisible(e.state,0,beyond),false);
  const t=dummy({x:27,y:14});assert.equal(vision.isEntityVisible(e.state,0,t),true);assert.equal(vision.isEntityVisible(e.state,1,u),false);
  e.killUnit(u);assert.equal(vision.isPointVisible(e.state,0,edge),false);
  const normal=spawn('hammies');close(vision.visibilitySources(e.state,0).find(s=>s.x===normal.x&&s.y===normal.y).radius,8);
});

test('Blind reduces Nightfang sight and firing range by the same percentage and restores them on expiry',async()=>{
  const {e,vision,spawn}=await fixture(),u=spawn();e.status(u,'blind',2,.25);
  close(vision.visibilitySources(e.state,0).find(s=>s.x===u.x&&s.y===u.y).radius,9.375);close(e._range(u),9);
  e.step(2);close(vision.visibilitySources(e.state,0).find(s=>s.x===u.x&&s.y===u.y).radius,12.5);close(e._range(u),12);
});

test('Eternal Shroud initially lasts twelve seconds, permits outgoing attacks and breaks on incoming damage',async()=>{
  const {e,vision,spawn,dummy,hit}=await fixture(),u=spawn(),t=dummy();
  close(u.statuses.find(s=>s.kind==='invisible').until,12);hit(u,t);close(t.hp,998);
  assert.equal(vision.isEntityVisible(e.state,1,u),false);close(u.hits,1);
  e.damage(t,u,1,{kind:'spell'});close(u.hp,254);assert.equal(vision.isEntityVisible(e.state,1,u),true);
  const fresh=spawn('nightfang',0,{x:15,y:15});e.step(11.99);assert.ok(fresh.statuses.some(s=>s.kind==='invisible'));
  e.step(.01);assert.equal(fresh.statuses.some(s=>s.kind==='invisible'),false);
});

test('Every sixtieth damaging hit renews three seconds of stealth and each instance keeps its own counter',async()=>{
  const {e,spawn,dummy,hit}=await fixture(),u=spawn(),t=dummy();e.step(12);
  for(let i=0;i<59;i++)hit(u,t);close(u.hits,59);assert.equal(u.statuses.some(s=>s.kind==='invisible'),false);
  hit(u,t);close(u.hits,60);close(u.statuses.find(s=>s.kind==='invisible').until,15);
  e.step(3);assert.equal(u.statuses.some(s=>s.kind==='invisible'),false);
  for(let i=0;i<60;i++)hit(u,t);close(u.hits,120);close(u.statuses.find(s=>s.kind==='invisible').until,18);
  const fresh=spawn('nightfang',0,{x:15,y:15});close(fresh.hits,0);close(u.hits,120);
});

test('Misses, zero damage and fully prevented hits never advance the stealth counter; shield damage does',async()=>{
  const {e,spawn,dummy,hit}=await fixture(),u=spawn(),t=dummy();e.step(12);
  for(let i=0;i<59;i++)hit(u,t);
  hit(u,t,0);e.status(t,'untouchable',10);hit(u,t);close(u.hits,59);t.statuses=[];
  t.stats.dodge=70;e.random=()=>0;hit(u,t);close(u.hits,59);t.stats.dodge=0;
  e.status(u,'misfortune',2,1);e._fire(u,t);assert.equal(e.state.projectiles.length,0);close(u.hits,59);u.statuses=[];
  t.shield=t.maxShield=100;t.stats.shieldtakendamage=100;const hp=t.hp;hit(u,t);close(t.hp,hp);close(t.shield,98);
  close(u.hits,60);close(u.statuses.find(s=>s.kind==='invisible').until,15);
});

test('Silence prevents new stealth without removing an existing shroud or resetting successful hits',async()=>{
  const {e,spawn,dummy,hit}=await fixture(),u=spawn(),t=dummy();e.status(u,'silence',1);e.step(.5);
  assert.ok(u.statuses.some(s=>s.kind==='invisible'));e.step(11.5);e.status(u,'silence',1);
  for(let i=0;i<60;i++)hit(u,t);close(u.hits,60);assert.equal(u.statuses.some(s=>s.kind==='invisible'),false);
  e.step(1);for(let i=0;i<60;i++)hit(u,t);close(u.hits,120);close(u.statuses.find(s=>s.kind==='invisible').until,16);
});

test('Nightfang fires a real ranged projectile across twelve tiles despite its separate 500 attack-distance stat',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn(),t=dummy({x:26.9,y:14});u.cooldown=0;e.step(.04);u.cooldown=Infinity;
  assert.equal(u.targetId,t.id);assert.equal(u.shots,1);assert.equal(e.state.projectiles.length,1);close(t.hp,1000);
  const shot=e.state.projectiles[0];close(shot.width,.5);assert.ok(shot.range>=12);
  e.step(2);close(t.hp,998);close(u.hits,1);assert.ok(u.statuses.some(s=>s.kind==='invisible'));
});
