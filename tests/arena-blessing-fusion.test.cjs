const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const loaded=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/visuals.mjs')]).then(([{ArenaEngine},{buildCatalog},visuals])=>({ArenaEngine,...visuals,catalog:buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json'))))}));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
async function fixture(){
  const {ArenaEngine,catalog,...visuals}=await loaded,e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:catalog.cards.filter(c=>!c.choiceRequired).slice(0,8).map(c=>c.id),spellDeck:['healing-light'],bot:false,seed:38});
  for(const c of e.castles)c.cooldown=Infinity;e.random=()=>.99;
  const spawn=(id,side=0,p={x:15,y:14},stats={})=>{
    const d=structuredClone(catalog.byId.get(id));Object.assign(d.stats,{speed:0,criticalChance:0,dodge:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...stats});
    const made=e.spawn(d,side,p,1,{count:1,positions:[p]});for(const u of made){u.stats.speed=0;u.cooldown=Infinity;}return made[0];
  };
  const dummy=(side=1,p={x:16,y:14},stats={},power=100)=>{const u=spawn('hammies',side,p,{health:5000,shield:0,damage:0,range:0,...stats});u.def={...u.def,id:'rework-target',power,forms:[],combat:{...u.def.combat,attackType:'none'}};return u;};
  const pair=type=>{const a=spawn(`mr-and-mrs-ray/type${type}`),b=e.units.find(u=>u!==a&&u.groupId===a.groupId);a.memory.rayCharge=b.memory.rayCharge=100;if(type===1)e.fuseRays(a,b);else e.startRayDash(a,b);return[a,b];};
  return{e,catalog,spawn,dummy,pair,...visuals};
}

test('Dumpsy compounds only five percent on successful same-target orbital hits',async()=>{
  const{e,spawn,dummy}=await fixture(),u=spawn('dumpsy'),t=dummy(1,{x:15.5,y:14}),amounts=[];
  for(let i=0;i<3;i++){e.state.time=i*.9;u.memory.dumpPhase=0;const hp=t.hp;e.ability(u).weaponTick(e,u,0);amounts.push(hp-t.hp);}
  for(const[value,expected]of amounts.map((n,i)=>[n,[10,10.5,11.025][i]]))close(value,expected);
  close(u.stats.damage,10);assert.equal(u.memory.dumpCombo.count,3);
});

test('damage-derived, idle and busy native charge counters stop at one hundred',async()=>{
  const{e,spawn,dummy}=await fixture();
  const kai=spawn('kai');e.damage(null,kai,100,{kind:'spell',bypassShield:true});close(kai.memory.charge,100);
  for(const id of['tribe','shellbyte']){const u=spawn(id,0,{x:20,y:14});e._hook('tick',u,100);close(u.memory.charge,100);e._hook('tick',u,100);close(u.memory.charge,100);}
  const unara=spawn('unara'),target=dummy();unara.memory.orbRemaining=1;for(let i=0;i<30;i++)e._hook('hit',unara,target,{total:1});close(unara.memory.charge,100);
  const wong=spawn('wong');for(let i=0;i<10;i++)e._hook('hit',wong,target,{total:1},{});close(wong.memory.charge,100);
});

test('Laura holds a full charge without allies and spends it only when a valid ally receives the ability',async()=>{
  const{e,spawn,dummy,nativeCharge}=await fixture(),u=spawn('laura');e.step(30);close(u.memory.charge,100);assert.equal(nativeCharge(u).caption,'100/100');assert.ok(nativeCharge(u).ready);
  e.step(20);close(u.memory.charge,100);const ally=dummy(0);e.step(.04);close(u.memory.charge,0);assert.ok(ally.statuses.some(s=>s.kind==='damageBonus'));
});

test('Ali and Clara cast at most once when a large gain reaches their capped charge',async()=>{
  for(const id of['ali','clara']){const{e,spawn,dummy}=await fixture(),u=spawn(id);dummy(id==='ali'?0:1);e._hook('tick',u,100);close(u.memory.charge,0);assert.equal(e.state.effects.filter(f=>f.type===(id==='ali'?'shield':'wave')).length,1);}
});

test('Artist ink remains at one hundred rather than wrapping its display or continuing past the cap',async()=>{
  const{e,spawn,dummy,nativeCharge}=await fixture(),u=spawn('artist');for(let i=0;i<15;i++)e.addInk(u,dummy(1,{x:16,y:14+i*.1}),21);
  close(u.memory.artistCharge,100);assert.equal(nativeCharge(u).caption,'100/100');close(nativeCharge(u).ratio,1);e.step(20);close(u.memory.artistCharge,100);
});

test('both Ray forms become one target with pooled current and maximum Health and show an active ultimate',async()=>{
  for(const type of[1,2]){const{e,pair,dummy,nativeCharge}=await fixture(),[a,b]=pair(type),foe=dummy(),maximum=type===1?620:740;
    assert.equal(a.sharedVitalsId,b.sharedVitalsId);assert.equal(b.fusedInto,a.id);close(e.maxHealth(a),maximum);close(e.maxHealth(b),maximum);assert.equal(e.canTarget(foe,b),false);
    const loss=type===1?30:10;e.damage(null,a,40,{kind:'spell',bypassShield:true});close(a.hp,maximum-loss);close(b.hp,a.hp);
    assert.equal(nativeCharge(a,e.time).caption,'ACTIVE');e.step(.5);assert.ok(nativeCharge(a,e.time).ratio<1);close(a.memory.rayCharge,0);
  }
});

test('the first Ray fusion hits all around its one-tile circle and never gains the second-form dash',async()=>{
  const{e,pair,dummy}=await fixture(),[a]=pair(1),front=dummy(1,{x:15.6,y:14}),behind=dummy(1,{x:14.4,y:14}),far=dummy(1,{x:17,y:14});e.step(.27);
  close(front.hp,4995);close(behind.hp,4995);close(far.hp,5000);assert.equal(a.rayDash,undefined);
});

test('the fused second-form dash sweeps a two-by-five corridor once for seventy-five damage',async()=>{
  for(const angle of[0,Math.atan2(-4,5)]){
    const{e,spawn,dummy}=await fixture(),a=spawn('mr-and-mrs-ray/type2',0,angle===0?{x:15,y:14}:{x:6.5,y:7.6}),b=e.units.find(u=>u!==a&&u.groupId===a.groupId);a.facingX=Math.cos(angle);a.facingY=Math.sin(angle);
    const origin={x:a.x,y:a.y},at=(forward,across)=>({x:origin.x+forward*Math.cos(angle)-across*Math.sin(angle),y:origin.y+forward*Math.sin(angle)+across*Math.cos(angle)});
    const near=dummy(1,at(.7,0)),edge=dummy(1,at(3,.95)),outside=dummy(1,at(3,1.5)),beyond=dummy(1,at(5.6,0)),behind=dummy(1,at(-.6,0));
    e.startRayDash(a,b);e.step(3.8);close(near.hp,4925);close(edge.hp,4925);for(const t of[outside,beyond,behind])close(t.hp,5000);
    assert.equal(a.sharedVitalsId,undefined);assert.equal(b.fusedInto,undefined);assert.equal(a.rayFusion,undefined);assert.equal(a.rayDash,undefined);
  }
});

test('second-form shared Health death and conversion release the fused body without a leftover dash',async()=>{
  for(const mode of['death','conversion']){const{e,pair}=await fixture(),[a,b]=pair(2);if(mode==='death')e.killUnit(a);else b.side=1;e._syncRayFusions(true);
    assert.equal(a.sharedVitalsId,undefined);assert.equal(b.fusedInto,undefined);assert.equal(a.rayDash,undefined);assert.equal(e.state.sharedVitals.length,0);if(mode==='death'){assert.equal(a.alive,false);assert.equal(b.alive,false);}
  }
});

test('Blesser selects highest Power instead of highest current Health, channels three seconds and remains still for twelve',async()=>{
  const{e,spawn,dummy}=await fixture(),u=spawn('blesser',0,{x:15,y:14},{speed:1000}),weak=dummy(0,{x:16,y:14},{health:1000},100),strong=dummy(0,{x:17,y:14},{health:100},900);strong.hp=50;e.random=()=>0;
  dummy(0,{x:15.1,y:14},{health:1000},1);e.step(1.5);assert.equal(u.memory.blessingTargetId,strong.id);assert.ok(u.memory.blessingChannel);assert.equal(strong.statuses.some(s=>s.kind==='allStatsBonus'),false);close(u.x,15);
  e.step(1.5);assert.ok(u.memory.blessed);close(e.maxHealth(strong),120);close(strong.hp,60);assert.equal(weak.statuses.some(s=>s.kind==='allStatsBonus'),false);assert.ok(strong.statuses.some(s=>s.kind==='blessed'));
  assert.ok(e.state.effects.some(f=>f.type==='blessing'&&f.unitId===strong.id));e.step(8.99);close(u.x,15);close(u.y,14);e.step(3);assert.equal(strong.statuses.filter(s=>s.kind==='allStatsBonus').length,1);
});

test('a lost blessing target is replaced and the new ally receives a fresh three-second channel',async()=>{
  const{e,spawn,dummy}=await fixture(),u=spawn('blesser'),first=dummy(0,{x:16,y:14},{},900),next=dummy(0,{x:17,y:14},{},800);e.random=()=>0;e.step(1.5);e.killUnit(first);e._drainDeaths();e.step(.04);
  assert.equal(u.memory.blessingTargetId,next.id);assert.ok(u.memory.blessingChannel.progress<.1);e.step(2.9);assert.equal(u.memory.blessed,undefined);e.step(.1);assert.ok(u.memory.blessed);assert.ok(next.statuses.some(s=>s.kind==='blessed'));
});

test('pausing and Silence suspend blessing progress rather than granting it while the caster cannot act',async()=>{
  const{e,spawn,dummy}=await fixture(),u=spawn('blesser'),target=dummy(0);e.random=()=>0;e.step(1);const progress=u.memory.blessingChannel.progress;
  e.setPaused(true);e.step(10);close(u.memory.blessingChannel.progress,progress);e.setPaused(false);e.status(u,'silence',1);e.step(1);assert.ok(u.memory.blessingChannel.progress<progress+.04);assert.equal(u.memory.blessed,undefined);
  e.step(2);assert.ok(u.memory.blessed);assert.ok(target.statuses.some(s=>s.kind==='allStatsBonus'));
});


test('fusion protection also covers damage-over-time packets already attached to the hidden partner',async()=>{
  for(const type of[1,2]){const{e,pair}=await fixture(),[a,b]=pair(type),before=a.hp;
    e.damage(null,b,40,{kind:'dot',bypassShield:true});close(a.hp,before-(type===1?30:10));close(b.hp,a.hp);
  }
});


test('persistent ground fields treat a fused pair as one body rather than poisoning its hidden partner twice',async()=>{
  const{e,pair}=await fixture(),[a,b]=pair(2),source={id:'field-source',side:1,isSpell:true,stats:{},statuses:[]};
  e.state.fields.push({id:'one-body-poison',kind:'poison-cloud',x:15,y:14,side:1,shape:{shape:'rect',width:2,height:2},born:0,until:3,source,poisoned:{}});
  e._fields();assert.equal(a.statuses.filter(s=>s.kind==='poison').length,1);assert.equal(b.statuses.filter(s=>s.kind==='poison').length,0);
  e.step(.8);close(a.hp,739.625);close(a.shield,109.125);close(b.hp,a.hp);
});
