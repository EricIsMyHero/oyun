const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const rawCards=fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).sort().flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f))));
const rawSpells=JSON.parse(fs.readFileSync(path.join(root,'data/spells.json')));
const modules=Promise.all([import('../arena/js/catalog.mjs'),import('../arena/js/abilities.mjs'),import('../arena/js/vision.mjs')]);
let isEntityVisible;
modules.then(([, ,vision])=>{isEntityVisible=vision.isEntityVisible;});
const catalogPromise=modules.then(([{buildCatalog}])=>buildCatalog(rawCards,rawSpells));
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);

function fixture(catalog,id) {
  const def=catalog.byId.get(id),targetDef=catalog.byId.get('hammies');
  assert.ok(def,id);
  const unit=(d,name,side)=>({id:name,def:d,side,lane:1,x:5+(side?.3:0),y:11,radius:.2,hp:d.stats.health,maxHp:d.stats.health,shield:d.stats.shield,maxShield:d.stats.shield,stats:{...d.stats},alive:true,born:0,hits:1,shots:1,memory:{},statuses:[],groupId:name==='u'?'group':'enemy-group',targetId:null});
  const u=unit(def,'u',0),t=unit(targetDef,'t',1);
  t.hp=t.maxHp=1000;
  const records={statuses:[],damage:[],spawn:[],push:[],fx:[]};
  const ctx={time:0,units:[u,t],castles:[],teams:[{mana:10,energy:0},{mana:10,energy:0}],random:()=>.01,
    canTarget(source,target){return source.side!==target.side&&isEntityVisible({time:this.time,units:this.units,castles:this.castles,nodes:[]},source.side,target);},
    status(target,kind,duration,magnitude=0,source=null,extra={}){const st={target,kind,duration,magnitude,source,...extra};records.statuses.push(st);target.statuses.push(st);},
    near(point,radius,filter=null){return this.units.filter(v=>v.alive&&Math.hypot(v.x-point.x,v.y-point.y)<=radius&&(!filter||filter(v)));},
    damage(source,target,amount,options={}){records.damage.push({source,target,amount,options});target.hp=Math.max(0,target.hp-amount);const killed=target.hp<=0;target.alive=!killed;return {healthDamage:amount,shieldDamage:0,total:amount,killed};},
    heal(target,amount){const n=Math.min(amount,target.maxHp-target.hp);target.hp+=n;return n;},
    giveShield(target,amount){target.shield+=amount;target.maxShield=Math.max(target.maxShield,target.shield);return amount;},
    spawn(d,side,p,lane,options={}){records.spawn.push({def:d,side,p,lane,options});const out=[];for(let i=0;i<(options.count||1);i++){const child=unit(d,'child-'+i,side);child.groupId=options.groupId||u.groupId;this.units.push(child);out.push(child);}return out;},
    push(target,from,distance){records.push.push({target,from,distance});},fx(type,x,y,opts){records.fx.push({type,x,y,opts});},
  };
  const hit={damage:10,kind:'attack',critical:false,bypassShield:false,burstIndex:0};
  const result={total:10,healthDamage:10,shieldDamage:0,killed:false};
  return {ctx,u,t,records,hit,result,rule:null};
}

test('arena catalog preserves every source definition and exposes honest data locks',async()=>{
  const [{buildCatalog,imageFor,formatStat}]=await modules;
  const before=JSON.stringify([rawCards,rawSpells]);
  const c=buildCatalog(rawCards,rawSpells);
  assert.equal(c.cards.length,138);assert.equal(c.forms.length,192);assert.equal(c.spells.length,26);
  assert.equal(c.cards.filter(x=>x.ready).length,58);assert.equal(c.spells.filter(x=>x.ready).length,17);
  assert.equal(JSON.stringify([rawCards,rawSpells]),before);
  for(const card of c.cards){assert.equal(card.raw,rawCards.find(x=>x.id===card.id));assert.equal(card.ready,card.reasons.length===0);if(card.ready){assert.ok(card.combat.attackDistance>0);assert.ok(card.attack.interval>0);}}
  assert.match(c.byId.get('fen').reasons.join(' '),/percentage/);
  assert.match(c.byId.get('tphoenix').reasons.join(' '),/Health restored/);
  assert.match(c.byId.get('nightfang').reasons.join(' '),/Attack Distance/);
  assert.match(c.spellById.get('crystalline-prison').reasons.join(' '),/conflict/);
  assert.equal(c.byId.get('soldier').attack.count,15);assert.equal(c.byId.get('soldier').attack.damage,3);
  assert.deepEqual(c.byId.get('kai').attack.sequence.map(x=>x.damage),[9,9,21]);
  assert.equal(c.byId.get('tribe').variants.reduce((n,x)=>n+x.count,0),5);
  assert.equal(c.byId.get('scrapy').combat.attackAngle,2*Math.atan(.5/(2*.5))*180/Math.PI);
  assert.equal(c.byId.get('jestro/cratex').stats.vision,0);
  assert.equal(formatStat('range','1250'),'1.25 tiles');
  assert.equal(formatStat('speed','1000'),'1 tile/s');
  assert.equal(formatStat('life','-'),'—');
  assert.match(imageFor({id:'soldier',group:'mission-1'}),/mission-1\/soldier\.jpg$/);
});

const cases={
  hammies:({ctx,u,rule,records})=>{rule.spawn(ctx,u);assert.equal(records.statuses[0].duration,12);close(records.statuses[0].magnitude,.2);},
  'b-b':({ctx,u,t,rule,hit})=>{t.def={...t.def,type:['Animal']};rule.incoming(ctx,u,t,hit);close(hit.damage,4);},
  scrapy:({ctx,u,t,rule,hit})=>{rule.attack(ctx,u,t,hit);close(hit.damage,15);assert.ok(hit.bypassShield);},
  nitrox:({ctx,u,t,rule,records})=>{t.side=0;rule.tick(ctx,u);assert.equal(records.statuses[0].kind,'attackHaste');close(records.statuses[0].magnitude,.12);},
  gloop:({ctx,u,rule,records})=>{assert.equal(u.stats.life,100);assert.deepEqual(rule.lifeDecay,{fraction:.01,interval:1});assert.equal(rule.contactAttack,true);rule.death(ctx,u);assert.equal(records.damage[0].amount,150);},
  henry:({ctx,u,t,rule,hit})=>{t.def={...t.def,type:['Animal']};rule.attack(ctx,u,t,hit);close(hit.damage,14);},
  venomora:({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].duration,2);close(records.statuses[0].magnitude,.25);},
  blocker:({ctx,u,t,rule,hit,records})=>{rule.incoming(ctx,u,t,hit);close(hit.damage,7);t.side=0;rule.tick(ctx,u);assert.equal(records.statuses[0].kind,'spellProtection');},
  ben:({ctx,u,t,rule,result,records})=>{for(let i=0;i<4;i++)rule.hit(ctx,u,t,result);assert.equal(records.statuses.length,1);assert.equal(records.statuses[0].duration,2);assert.equal(records.statuses[0].amount,10);},
  freak:({ctx,u,rule,records})=>{u.hp-=10;rule.tick(ctx,u,1);assert.equal(u.hp,u.maxHp-9);rule.death(ctx,u);assert.equal(records.spawn[0].options.count,2);},
  'freak/mini-freaks':({ctx,u,rule,records,hit,t})=>{rule.attack(ctx,u,t,hit);assert.equal(hit.combat.maxTargets,1);rule.death(ctx,u);assert.equal(records.damage[0].amount,50);},
  twins:({ctx,u,rule})=>{const twin={...u,id:'other',stats:{...u.stats},memory:{}};ctx.units.push(twin);rule.death(ctx,u);assert.equal(twin.maxHp,u.maxHp*3);assert.equal(twin.stats.damage,u.stats.damage*2);},
  bethe:({ctx,u,t,rule,result})=>{rule.hit(ctx,u,t,{...result,killed:true});rule.tick(ctx,u);assert.equal(u.stats.criticalChance,u.def.stats.criticalChance+5);ctx.time=11;rule.tick(ctx,u);assert.equal(u.stats.criticalChance,u.def.stats.criticalChance);},
  soldier:({ctx,u,t,rule,hit})=>{t.def={...t.def,combat:{movementType:'flying'}};rule.attack(ctx,u,t,hit);close(hit.damage,13.3);},
  snaykies:({ctx,u,t,rule,hit,result,records})=>{rule.attack(ctx,u,t,hit);assert.equal(hit.bypassShield,true);rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].duration,1.5);assert.equal(records.statuses[0].amount,4);},
  bees:({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].duration,6);assert.equal(records.statuses[0].amount,2);assert.equal(u.alive,false);rule.hit(ctx,u,t,result);assert.equal(records.statuses.length,1);},
  toxic:({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].duration,1.5);assert.equal(records.statuses[0].amount,3);},
  phewphew:({ctx,u,t,rule,hit})=>{rule.attack(ctx,u,t,hit);assert.equal(hit.shieldMultiplier,2);},
  hailey:({ctx,u,t,rule,result})=>{rule.hit(ctx,u,t,result);close(u.stats.criticalChance,u.def.stats.criticalChance+.5);},
  'chrono-mage':({ctx,u,t,rule,hit,records})=>{u.shots=5;const ally={...u,id:'ally',memory:{},statuses:[]};ctx.units.push(ally);rule.attack(ctx,u,t,hit);assert.ok(records.statuses.some(x=>x.kind==='attackHaste'&&x.duration===5));assert.ok(records.statuses.some(x=>x.kind==='slow'&&x.duration===8));},
  'aegis-guard':({ctx,u,t,rule,records})=>{t.side=0;rule.tick(ctx,u);assert.equal(records.statuses[0].kind,'protection');close(records.statuses[0].magnitude,.15);},
  ironjaw:({ctx,u,t,rule,result})=>{rule.hit(ctx,u,t,result);close(u.stats.lifestealChance,Math.min(25,u.def.stats.lifestealChance+.5));for(let i=0;i<100;i++)rule.hit(ctx,u,t,result);assert.equal(u.stats.lifestealChance,25);},
  'm-manager':({ctx,u,rule})=>{rule.tick(ctx,u,9);assert.equal(ctx.teams[0].mana,11);assert.equal(ctx.teams[0].energy,0);},
  srail:({ctx,u,rule})=>{rule.tick(ctx,u);assert.equal(u.stats.criticalChance,u.def.stats.criticalChance+8);},
  cryon:({ctx,u,rule,records})=>{u.hp=u.maxHp*.19;rule.damaged(ctx,u);rule.damaged(ctx,u);assert.equal(records.statuses.length,1);assert.equal(records.statuses[0].duration,12);},
  frostshot:({ctx,u,t,rule,hit,result,records})=>{rule.spawn(ctx,u);ctx.time=18;rule.attack(ctx,u,t,hit);close(hit.damage,37.5);rule.hit(ctx,u,t,result);assert.equal(u.memory.lastDamage,18);close(records.statuses[0].magnitude,.4);},
  hornets:({ctx,u,t,rule,hit})=>{t.def={...t.def,type:['Animal'],combat:{movementType:'flying'}};rule.incoming(ctx,u,t,hit);close(hit.damage,3.75);},
  warborn:({ctx,u,rule})=>{u.maxShield=100;u.shield=0;rule.tick(ctx,u,6);close(u.shield,20);},
  'x-bot':({ctx,u,t,rule,hit,result})=>{rule.spawn(ctx,u);ctx.time=4;rule.attack(ctx,u,t,hit);close(hit.damage,11);rule.hit(ctx,u,t,result);assert.equal(u.memory.lastDamage,4);},
  nyra:({ctx,u,t,rule,hit})=>{rule.spawn(ctx,u);u.x+=25;rule.tick(ctx,u);rule.attack(ctx,u,t,hit);close(hit.damage,20);},
  deadscope:({ctx,u,t,rule,hit,result})=>{rule.hit(ctx,u,t,{...result,killed:true});rule.attack(ctx,u,t,hit);close(hit.haste,.2);assert.equal(u.memory.nextHaste,false);},
  turtle:({ctx,u,rule,records})=>{rule.spawn(ctx,u);assert.equal(records.spawn[0].options.count,4);u.shield=0;rule.damaged(ctx,u,null,{shieldDamage:10});rule.tick(ctx,u,1);close(u.shield,25);rule.death(ctx,u);const child=ctx.units.find(x=>x.def.id==='turtle/mini-turtles');assert.equal(child.stats.damage,child.def.stats.damage*2);},
  'turtle/mini-turtles':({ctx,u,rule,catalog})=>{const parent={...u,id:'parent',def:catalog.byId.get('turtle')};ctx.units.push(parent);rule.tick(ctx,u);assert.equal(u.memory.followId,'parent');},
  'feral-wolf':({ctx,u,t,rule,hit,result,records})=>{rule.spawn(ctx,u);close(records.statuses[0].magnitude,1);rule.attack(ctx,u,t,hit);close(hit.damage,13);rule.hit(ctx,u,t,result);assert.equal(u.memory.firstHit,true);},
  trac:({ctx,u,rule})=>{rule.damaged(ctx,u,null,{total:48});close(u.stats.damageminimiser,u.def.stats.damageminimiser+1);close(u.stats.attackSpeed,u.def.stats.attackSpeed/1.01);},
  dino:({ctx,u,t,rule,result})=>{for(let i=0;i<20;i++)rule.hit(ctx,u,t,result);assert.equal(u.stats.damage,u.def.stats.damage+24);},
  tenta:({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].duration,1);close(records.statuses[0].magnitude,.25);},
  'fire-archer':({ctx,u,t,rule,hit,records})=>{u.shots=4;rule.attack(ctx,u,t,hit);assert.equal(records.statuses[0].duration,3);close(records.statuses[0].magnitude,.7);},
  'shadow-reaper':({ctx,u,t,rule,hit,result})=>{rule.attack(ctx,u,t,hit);assert.equal(hit.critical,true);rule.hit(ctx,u,t,{...result,killed:true});const next={damage:10};rule.attack(ctx,u,t,next);close(next.damage,160);},
  voltriker:({ctx,u,t,rule,hit})=>{u.shots=4;rule.attack(ctx,u,t,hit);assert.equal(hit.combat.maxTargets,3);assert.equal(hit.combat.impactSize,'3 × 3 tiles');u.shots=5;rule.attack(ctx,u,t,hit);assert.equal(hit.combat.maxTargets,1);},
  frostmaw:({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].kind,'silence');assert.equal(records.statuses[0].duration,5);},
  hexon:({ctx,u,t,rule,result,records})=>{u.hits=4;rule.hit(ctx,u,t,result);close(records.statuses[0].duration,.6);},
  'mecha-shield':({ctx,u,t,rule})=>{t.side=0;t.shield=0;rule.tick(ctx,u,21);assert.equal(t.shield,25);},
  venomspikes:({ctx,u,t,rule,result,records})=>{for(let i=0;i<5;i++)rule.hit(ctx,u,t,result);assert.equal(records.damage[0].amount,80);assert.equal(t.memory.venomMarks.u,0);},
  astranova:({ctx,u,t,rule,hit})=>{u.shots=10;rule.attack(ctx,u,t,hit);assert.equal(hit.damage,50);assert.equal(hit.combat.impactSize,'5 × 5 tiles');},
  kai:({ctx,u,t,rule,hit,result,records})=>{rule.damaged(ctx,u,t,{total:50});u.shots=3;rule.attack(ctx,u,t,hit);close(hit.damage,16);rule.hit(ctx,u,t,result,hit);assert.equal(records.push[0].distance,3);close(records.statuses[0].duration,.8);},
  cassandra:({ctx,u,t,rule,records})=>{const hp=u.maxHp;rule.tick(ctx,u,1);assert.equal(u.maxHp,hp+1);assert.equal(records.damage[0].amount,1);assert.equal(records.statuses[0].kind,'predominance');},
  arcanyx:({ctx,u,t,rule,hit,result,records})=>{rule.attack(ctx,u,t,hit);close(hit.damage,16);rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].kind,'regen');assert.equal(records.statuses[0].amount,4);assert.equal(records.statuses[0].duration,5);},
  leafshade:({ctx,u,t,rule,hit})=>{rule.attack(ctx,u,t,hit);assert.ok(hit.bypassShield);rule.tick(ctx,u,7);assert.equal(u.stats.lifestealChance,u.def.stats.lifestealChance+1);},
  jestro:({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].duration,5);u.hp=u.maxHp*.74;rule.damaged(ctx,u);rule.damaged(ctx,u);assert.equal(records.spawn.length,1);assert.equal(records.spawn[0].def.id,'jestro/cratex');},
  'jestro/cratex':({ctx,u,t,rule,result,records})=>{rule.hit(ctx,u,t,result);close(records.statuses[0].duration,1.3);},
  'ship-cannoneer':({ctx,u,rule})=>{u.maxShield=100;u.shield=0;rule.tick(ctx,u);close(u.stats.attackSpeed,u.def.stats.attackSpeed/1.1);},
  lumina:({ctx,u,rule,records})=>{rule.tick(ctx,u,.25);assert.equal(records.damage[0].amount,10);},
  'hell-boy':({ctx,u,t,rule,hit})=>{u.shots=5;rule.attack(ctx,u,t,hit);close(hit.damage,60);assert.equal(u.memory.rageUntil,3);},
  slasherx:({ctx,u,t,rule,hit})=>{rule.attack(ctx,u,t,hit);assert.equal(hit.instantKill,true);},
  sheriff:({ctx,u,t,rule,hit})=>{rule.tick(ctx,u);rule.attack(ctx,u,t,hit);close(hit.damage,12.5);},
  nurse:({ctx,u,rule})=>{rule.lifesteal(ctx,u,2);rule.tick(ctx,u);assert.equal(u.stats.damage,u.def.stats.damage+2);ctx.time=11;rule.tick(ctx,u);assert.equal(u.stats.damage,u.def.stats.damage);},
  tribe:({ctx,u,t,rule,hit,result,records})=>{rule.spawn(ctx,u);assert.equal(u.stats.damage,4);rule.tick(ctx,u,12.5);rule.attack(ctx,u,t,hit);assert.equal(hit.damage,20);t.hp=600;rule.hit(ctx,u,t,result,hit);assert.equal(records.statuses[0].duration,5);},
  earthshakers:({ctx,u,t,rule,hit,result,records})=>{u.shots=4;rule.attack(ctx,u,t,hit);assert.equal(hit.combat.impactSize,'3 × 3 tiles');rule.hit(ctx,u,t,result);assert.equal(records.statuses[0].duration,1.5);assert.equal(records.statuses[1].kind,'movementSlow');assert.equal(records.statuses[1].duration,3.5);close(records.statuses[1].magnitude,.3);},
  'void-striker':({ctx,u,t,rule,hit,result,records})=>{rule.spawn(ctx,u);ctx.time=18;rule.attack(ctx,u,t,hit);close(hit.haste,.2);rule.hit(ctx,u,t,result,hit);close(records.statuses[0].duration,.8);},
  shellbyte:({ctx,u,t,rule,hit})=>{t.x=u.x+4;rule.tick(ctx,u,.225*34);assert.ok(u.memory.leapStrike);rule.attack(ctx,u,t,hit);close(hit.damage,15);},
  'tphoenix/phoenix':({ctx,u,t,rule,hit,result})=>{rule.attack(ctx,u,t,hit);assert.ok(hit.bypassShield);rule.hit(ctx,u,t,result);assert.equal(u.stats.damage,u.def.stats.damage+1);},
};

for(const [id,exercise] of Object.entries(cases))test(`native arena ability: ${id}`,async()=>{
  const [,{ABILITIES}]=await modules;
  const catalog=await catalogPromise;
  const f=fixture(catalog,id);f.rule=ABILITIES[id];f.catalog=catalog;
  assert.ok(f.rule,`${id} has a registry rule`);exercise(f);
});

test('Sheriff marks only visible enemies and Shellbyte cannot leap to concealed targets',async()=>{
  const [,{ABILITIES}]=await modules;
  const catalog=await catalogPromise;
  const sheriff=fixture(catalog,'sheriff');
  sheriff.t.x=sheriff.u.x+9;
  ABILITIES.sheriff.tick(sheriff.ctx,sheriff.u);
  assert.deepEqual(sheriff.u.memory.marked,[]);
  const scout={...sheriff.u,id:'scout',x:sheriff.t.x-1,statuses:[]};
  sheriff.ctx.units.push(scout);
  ABILITIES.sheriff.tick(sheriff.ctx,sheriff.u);
  assert.deepEqual(sheriff.u.memory.marked,[sheriff.t.id]);
  sheriff.t.statuses=[{kind:'invisible',until:5}];
  ABILITIES.sheriff.tick(sheriff.ctx,sheriff.u);
  assert.deepEqual(sheriff.u.memory.marked,[]);

  const shellbyte=fixture(catalog,'shellbyte');
  shellbyte.t.x=shellbyte.u.x+4;
  shellbyte.t.statuses=[{kind:'invisible',until:5}];
  shellbyte.u.memory.charge=100;
  const origin={x:shellbyte.u.x,y:shellbyte.u.y};
  ABILITIES.shellbyte.tick(shellbyte.ctx,shellbyte.u,0);
  assert.equal(shellbyte.u.memory.charge,100);
  assert.equal(shellbyte.u.x,origin.x);
  assert.equal(shellbyte.u.targetId,null);
  shellbyte.t.statuses=[];
  ABILITIES.shellbyte.tick(shellbyte.ctx,shellbyte.u,0);
  assert.equal(shellbyte.u.targetId,shellbyte.t.id);
  assert.equal(shellbyte.u.memory.charge,0);
});

test('every enabled native card and reachable form has a behavioral test',async()=>{
  const [,{ABILITIES}]=await modules;
  const catalog=await catalogPromise;
  function verify(card){assert.ok(ABILITIES[card.id],card.id);assert.ok(cases[card.id],`${card.id} missing behavioral assertion`);card.forms.forEach(verify);}
  catalog.cards.filter(x=>x.ready).forEach(verify);
});
