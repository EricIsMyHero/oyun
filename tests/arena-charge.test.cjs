const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const loaded=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/visuals.mjs')]).then(([{ArenaEngine},{buildCatalog},visuals])=>({ArenaEngine,...visuals,catalog:buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json'))))}));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
async function fixture(){
  const {ArenaEngine,catalog,...visuals}=await loaded,e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:catalog.cards.filter(c=>!c.choiceRequired).slice(0,8).map(c=>c.id),spellDeck:['healing-light'],bot:false,seed:37});
  const spawn=(id,side=0,p={x:15,y:14},stats={})=>{
    const def=structuredClone(catalog.byId.get(id));Object.assign(def.stats,{speed:0,criticalChance:0,dodge:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...stats});
    const [u]=e.spawn(def,side,p,1,{count:1,positions:[p]});u.cooldown=Infinity;return u;
  };
  const dummy=(p={x:16,y:14})=>{const u=spawn('hammies',1,p,{health:5000,shield:0,damage:0,range:0});u.def={...u.def,id:'charge-target',forms:[],combat:{...u.def.combat,attackType:'none'}};return u;};
  return {e,catalog,spawn,dummy,...visuals};
}

test('requested balance values and corrected reference DPS reach normalized Arena definitions without changing damage formats',async()=>{
  const {catalog}=await fixture(),f=catalog.byId.get('frostshot'),d=catalog.byId.get('deadscope'),n=catalog.byId.get('naar'),l=catalog.byId.get('lyra');
  assert.equal(catalog.cards.filter(c=>c.ready).length,138);close(f.attack.interval,.25);close(f.attack.delay,1.4);assert.equal(f.attack.count,2);close(f.attack.damage,11);close(f.stats.sps,20);
  close(d.attack.damage,125);close(d.attack.interval,5.25);close(d.stats.range,7000);close(d.stats.vision,8000);close(d.stats.sps,23.81);close(d.combat.attackDistance,500);
  close(n.attack.damage,96);close(n.attack.interval,3.75);close(n.stats.sps,25.6);close(l.stats.health,180);close(l.stats.shield,45);close(l.attack.damage,5);assert.deepEqual(l.attack.sequence.map(s=>s.count),[1,1,3]);
});

test('Frostshot fires its two bullets a quarter second apart and recovers interval plus the new 1.40s delay',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('frostshot'),t=dummy({x:18,y:14}),times=[],fire=e._fire.bind(e);
  e._fire=(source,target)=>{if(source===u)times.push(e.time);return fire(source,target);};u.cooldown=0;e.step(4);
  assert.ok(times.length>=4);assert.ok(times[1]-times[0]>=.25-1e-7&&times[1]-times[0]<=.25+1/30+1e-7);
  assert.ok(times[2]-times[1]>=1.65-1e-7&&times[2]-times[1]<=1.65+1/30+1e-7);assert.ok(t.hp<5000);
});

test('Deadscope deals 125 damage from a real projectile inside seven tiles and cannot acquire an eight-tile target',async()=>{
  const {e,spawn,dummy}=await fixture(),u=spawn('deadscope'),near=dummy({x:21.9,y:14}),far=dummy({x:23,y:14});
  assert.equal(e._target(u),near);e._fire(u,near);e.step(1);close(near.hp,4875);close(u.cooldown,4.25);
  e.killUnit(near);e._drainDeaths();assert.equal(e._target(u),null);close(far.hp,5000);
});

test('Avalith uses sixty-percent maximum interval reduction while retaining both legs of its returning weapon',async()=>{
  for(const[distance,recovery]of[[.75,.32],[1,.32],[2.375,.56],[3.75,.8]]){
    const{e,spawn,dummy}=await fixture(),u=spawn('avalith'),t=dummy({x:15+distance,y:14});e._fire(u,t);
    close(e.state.projectiles[0].recovery,recovery);assert.equal(e.state.projectiles[0].returning,'outbound');
  }
});

test('every native charge family reads its own counter, including both Ray partners and Ase parts',async()=>{
  const{catalog,nativeCharge}=await fixture();
  for(const id of['laura','kai','wong','tribe','shellbyte','ali','unara','clara','artist','ase/type1','ase/type2','mr-and-mrs-ray/type1','mr-and-mrs-ray/type1/the-rays','mr-and-mrs-ray/type2','mr-and-mrs-ray/type2/the-rays']){
    const u={def:catalog.byId.get(id),memory:{}},empty=nativeCharge(u);assert.ok(empty,id);close(empty.total,0);close(empty.ratio,0);
    u.memory[empty.key]=empty.max/2;const meter=nativeCharge(u);close(meter.ratio,.5);assert.equal(meter.ready,false);
  }
  assert.equal(nativeCharge({def:catalog.byId.get('hammies'),memory:{charge:75}}),null);
  assert.equal(nativeCharge({def:catalog.byId.get('artist/flock-of-ravens'),memory:{artistCharge:80}}),null);
});

test('charge display follows real gain, spending and pause instead of independently animating progress',async()=>{
  const{e,spawn,nativeCharge}=await fixture(),u=spawn('laura');e.step(5);close(nativeCharge(u).total,40);close(nativeCharge(u).ratio,.4);
  e.setPaused(true);e.step(8);close(nativeCharge(u).total,40);e.setPaused(false);e.step(7.5);close(nativeCharge(u).total,100);e.step(20);close(nativeCharge(u).total,100);
  spawn('hammies',0,{x:16,y:14},{damage:0,range:0});e.step(.04);close(nativeCharge(u).total,0);
  const kai=spawn('kai');kai.memory.charge=240;const before=JSON.stringify(kai.memory);assert.equal(nativeCharge(kai).caption,'100/100');assert.equal(nativeCharge(kai).ready,true);close(nativeCharge(kai).ratio,1);assert.equal(JSON.stringify(kai.memory),before);
});

test('Artist retains its ink count in a stable one-hundred-charge meter',async()=>{
  const{e,spawn,dummy,nativeCharge}=await fixture(),u=spawn('artist');
  for(let i=0;i<3;i++)e.addInk(u,dummy({x:16,y:14+i*.5}),21);
  const meter=nativeCharge(u);close(meter.total,30);assert.equal(meter.caption,'30/100');close(meter.value,30);close(meter.max,100);close(meter.ratio,.3);assert.equal(meter.segmented,false);
});

test('stolen native charges follow the thief while the stripped donor no longer displays a charge meter',async()=>{
  const{e,spawn,nativeCharge}=await fixture(),u=spawn('thief'),donor=spawn('laura',1,{x:16,y:14});
  assert.equal(e.stealAbility(u),true);assert.equal(nativeCharge(donor),null);assert.equal(nativeCharge(u).key,'charge');e.step(1);close(nativeCharge(u).total,8);
});

test('each Ray form earns six charge per second within exactly 2.5 tiles, holds charge outside and opens its ultimate at one hundred',async()=>{
  for(const type of[1,2]){
    const{e,spawn,dummy,nativeCharge}=await fixture(),u=spawn(`mr-and-mrs-ray/type${type}`),partner=e.units.find(t=>t!==u&&t.groupId===u.groupId);
    Object.assign(partner,{x:17.5,y:14,cooldown:Infinity});partner.stats.speed=0;e.step(2);close(u.memory.rayCharge,12);close(partner.memory.rayCharge,12);assert.equal(nativeCharge(u).caption,'12/100');
    partner.x=17.501;e.step(2);close(u.memory.rayCharge,12);close(partner.memory.rayCharge,12);
    partner.x=17.5;e.setPaused(true);e.step(3);close(u.memory.rayCharge,12);e.setPaused(false);e.step(14.6);assert.equal(!!u.sharedVitalsId||!!u.rayDash,false);
    dummy({x:15.4,y:14});e.step(.1);assert.ok(type===1?u.sharedVitalsId:u.rayDash);close(nativeCharge(u).total,0);close(nativeCharge(partner).total,0);
  }
});
