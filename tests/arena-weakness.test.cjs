const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const modules=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/statuses.mjs'),import('../arena/js/visuals.mjs')]);
const catalogPromise=modules.then(([,m])=>m.buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json')))));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
async function fixture(){
  const [{ArenaEngine},,rules,visuals]=await modules,catalog=await catalogPromise;
  const e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:catalog.cards.filter(c=>c.ready).slice(0,8).map(c=>c.id),spellDeck:['healing-light'],bot:false});
  const spawn=(id='hammies',side=0,x=15,stats={})=>{
    const def=structuredClone(catalog.byId.get(id));if(id==='hammies')def.id='weakness-target';Object.assign(def.stats,{health:1000,shield:0,damage:10,speed:0,range:3000,vision:8000,healrecovery:0,shieldrecovery:0,life:0,criticalChance:0,lifestealChance:0,dodge:0,flexibility:0,...stats});
    const[u]=e.spawn(def,side,{x,y:14},1,{count:1,positions:[{x,y:14}]});u.cooldown=Infinity;return u;
  };
  return {e,spawn,rules,visuals,catalog};
}

for(const[vulnerability,control,stacking]of[['weakness',1.25,1.33],['absoluteWeakness',1.33,1.5]]){
  for(const[kind,multiplier]of[['stun',control],['curse',control],['statReduction',control],['slow',stacking],['frozen',stacking],['burn',stacking],['poison',stacking],['bleed',stacking]])test(`${vulnerability} extends ${kind} using its specified duration category`,async()=>{
    const {e,spawn}=await fixture(),u=spawn();e.status(u,vulnerability,20);
    const effect=e.status(u,kind,4,.2,null,{stats:{damage:2},amount:0});close(effect.until,4*multiplier);
  });
}

test('only the stronger vulnerability applies, Flexibility applies once, and positive or indefinite effects are not extended',async()=>{
  const {e,spawn}=await fixture(),u=spawn('hammies',0,15,{flexibility:20});
  e.status(u,'weakness',20);e.status(u,'absoluteWeakness',20);
  close(e.status(u,'slow',4,.2).until,4*1.5*.8);
  close(e.status(u,'curse',4,.25).until,4*1.33*.8);
  close(e.status(u,'Heal',4,1).until,4);assert.equal(e.status(u,'blind',Infinity,.25).until,Infinity);
  const before=e.status(u,'root',2).until;e.cleanse(u);assert.equal(u.statuses.length,1,'Cleanse keeps Heal');
  e.status(u,'root',2);close(u.statuses.find(s=>s.kind==='root').until,1.6);assert.ok(before>1.6);
});

test('adding vulnerability does not retroactively extend effects already applied',async()=>{
  const {e,spawn}=await fixture(),u=spawn();const root=e.status(u,'root',4);e.status(u,'weakness',10);close(root.until,4);
});

test('Absolute Weakness blocks outgoing positive and negative effects, including scheduled hits, but not damage',async()=>{
  const {e,spawn}=await fixture(),u=spawn(),ally=spawn('hammies',0,14),enemy=spawn('hammies',1,16);
  e.status(u,'absoluteWeakness',10);
  for(const[kind,target,extra]of[['slow',enemy,{}],['poison',enemy,{scheduled:true}],['damageBonus',ally,{}],['regen',u,{}],['predominance',u,{}],['taunt',u,{radius:3}]])assert.equal(e.status(target,kind,3,.2,u,extra),null,kind);
  assert.equal(e.cleanse(ally,{source:u}),false);assert.equal(e.push(enemy,u,1),false);close(enemy.x,16);
  e.useAbility(u,()=>assert.equal(e.status(enemy,'stun',2),null),'an inferred native caster is also blocked');
  close(e.damage(u,enemy,10,{kind:'ability'}).total,10);
  e.cleanse(u);assert.ok(e.status(enemy,'slow',2,.2,u));
});

test('a previously applied damage-over-time packet continues after its caster receives Absolute Weakness',async()=>{
  const {e,spawn}=await fixture(),u=spawn(),enemy=spawn('hammies',1,20);e.status(enemy,'burn',2,0,u,{amount:8});e.status(u,'absoluteWeakness',4);
  e.step(2);close(enemy.hp,984);
});

test('active and new numerical buff bonuses become seventy percent as strong and recover after vulnerability expires',async()=>{
  const {e,spawn,rules}=await fixture(),u=spawn(),ally=spawn('hammies',0,14);
  e.status(u,'damageBonus',10,.2,ally);e.status(u,'attackHaste',10,.2,ally);e.status(u,'absoluteWeakness',1);
  close(rules.statusMagnitude(u,'damageBonus',e.time),.14);close(rules.statusMagnitude(u,'attackHaste',e.time),.14);
  e.status(u,'speedBonus',10,.2,ally);close(rules.statusMagnitude(u,'speedBonus',e.time),.14);
  e.step(1);close(rules.statusMagnitude(u,'damageBonus',e.time),.2);close(rules.statusMagnitude(u,'speedBonus',e.time),.2);
});

test('all-stat and Berserk buffs use weakened positive bonuses without reducing base stats',async()=>{
  const {e,spawn}=await fixture(),u=spawn('hammies',0,15,{attackSpeed:1,delay:1});u.hp=400;
  e.status(u,'allStatsBonus',10,.2);e.status(u,'Berserk',10,0,null,{threshold:.5,damageBonus:.2,attackSpeedBonus:.2});e.status(u,'absoluteWeakness',5);
  close(e.statValue(u,'damage'),10*1.14*1.14);close(e.statValue(u,'attackSpeed'),1/1.14/1.14);close(e.statValue(u,'delay'),1/1.14);close(e.maxHealth(u),1140);
  const enemy=spawn('hammies',1,16);e._resolveHit(u,enemy,{damage:e.statValue(u,'damage'),kind:'attack'});close(enemy.hp,1000-10*1.14*1.14);
});

test('Fearless and protection bonuses weaken without weakening permanent Damage Reduction',async()=>{
  const {e,spawn}=await fixture(),u=spawn('hammies',0,15,{damageminimiser:20}),enemy=spawn('hammies',1,16);
  e.status(u,'fearless',10,.2,null,{radius:3});e.status(u,'protection',10,.2);e.status(u,'absoluteWeakness',5);
  close(e.damage(enemy,u,100,{kind:'spell'}).total,100*.8*.86*.86);
});

test('Dino, Mixela and Ironjaw permanent native gains are not reduced by Absolute Weakness',async()=>{
  const {e,spawn}=await fixture(),dino=spawn('dino'),mixela=spawn('mixela',0,17),ironjaw=spawn('ironjaw',0,19,{lifestealChance:25}),target=spawn('hammies',1,20);
  for(const u of[dino,mixela,ironjaw])e.status(u,'absoluteWeakness',20);
  e._resolveHit(dino,target,{damage:1,kind:'attack'});close(e.statValue(dino,'damage'),12);
  e._resolveHit(ironjaw,target,{damage:1,kind:'attack'});close(e.statValue(ironjaw,'lifestealChance'),25.5);
  const victim=spawn('hammies',1,17.5,{health:100});e.killUnit(victim);e._drainDeaths();close(mixela.maxHp,1060);close(mixela.hp,1060);
});

test('priority resolves removal interactions: Stun leaves Heal, Reflection and Berserk active',async()=>{
  const {e,spawn}=await fixture(),u=spawn();u.hp=500;e.status(u,'Heal',4,4);e.status(u,'reflection',4);e.status(u,'berserk',4,0,null,{threshold:.9,damageBonus:.2});
  e.status(u,'stun',2);assert.deepEqual(u.statuses.map(s=>s.kind),['regen','reflection','berserk','stun']);e.step(1);close(u.hp,504);
  assert.ok(e.status(u,'invisible',2),'a higher active status does not block an unrelated lower effect');
});

test('Cleanse removes lower negative effects but preserves high controls and all positive buffs',async()=>{
  const {e,spawn}=await fixture(),u=spawn();
  for(const kind of['regen','reflection','frozen','weakness','absoluteWeakness','airborne','betrayal','imprisonment'])e.status(u,kind,8,1);
  e.cleanse(u);assert.deepEqual(u.statuses.map(s=>s.kind),['regen','reflection','airborne','betrayal','imprisonment']);
  e.status(u,'predominance',2);assert.deepEqual(u.statuses.map(s=>s.kind),['regen','reflection','predominance']);
  assert.equal(e.status(u,'weakness',4),null);assert.equal(e.status(u,'absoluteWeakness',4),null);
});

test('Predominance can release Imprisonment while Cleanse cannot, without leaving a stranded banished unit',async()=>{
  const {e,spawn}=await fixture(),u=spawn('far'),target=spawn('hammies',1,16);
  assert.equal(e.banish(u,target),true);e.cleanse(target);assert.equal(target.banished,true);
  e.status(target,'Predominance',2);assert.equal(target.banished,undefined);assert.equal(target.memory.banish,undefined);close(target.hp,1000);
});

test('Weakness and Absolute Weakness do not override Whisper native locked possession',async()=>{
  const {e,spawn}=await fixture(),whisper=spawn('whisper'),target=spawn('hammies',1,15.5);
  e.status(whisper,'absoluteWeakness',2);assert.equal(e.possess(whisper,target),false);e.cleanse(whisper);assert.equal(e.possess(whisper,target),true);
  const until=whisper.whisperState.until;e.status(target,'absoluteWeakness',2);e.cleanse(target);assert.equal(target.possessedBy,whisper.id);close(whisper.whisperState.until,until);
});

test('the five stacking categories and six single-target exceptions are explicit and batch applications respect them',async()=>{
  const {e,spawn,rules}=await fixture(),a=spawn(),b=spawn('hammies',0,14);
  assert.deepEqual([...rules.STACKING_STATUSES],['burn','poison','bleed','slow','frozen']);
  for(const kind of rules.SINGLE_TARGET_STATUSES){a.statuses=[];b.statuses=[];const entries=e.statusMany([a,b],kind,3,.2,null,{threshold:.5,damageBonus:.2});assert.equal(entries.length,1,kind);assert.equal(a.statuses[0].category,'control');assert.equal(b.statuses.length,0);assert.equal(e.status(b,kind,3,.2,null,{area:true}),null);}
  a.statuses=[];b.statuses=[];assert.equal(e.statusMany([a,b],'stun',2).length,2);assert.equal(a.statuses[0].category,'crowd-control');
  assert.equal(rules.effectDefinition('Slow',{area:true}).category,'stacking');assert.equal(rules.effectDefinition('Curse',{area:true}).category,'crowd-control');assert.equal(rules.effectDefinition('Stat Reduction').category,'control');
});

test('new effects have canonical aliases, distinct vector icons and inspector classification',async()=>{
  const {e,spawn,rules,visuals}=await fixture(),u=spawn();e.status(u,'Absolute Weakness',3);e.status(u,'Weakness',3);
  assert.equal(rules.statusKind('absolute-weakness'),'absoluteWeakness');const badges=visuals.statusBadges(u.statuses,0);assert.deepEqual(badges.map(b=>b.kind),['absoluteWeakness','weakness']);
  for(const badge of badges){assert.equal(badge.polarity,'negative');assert.equal(badge.category,'control');assert.match(visuals.statusIconSVG(badge.kind),/<svg.*<path/);}
  assert.notEqual(visuals.statusIconSVG('weakness'),visuals.statusIconSVG('absoluteWeakness'));
});

test('Codex documents the latest interaction-only priority and excludes native permanent gains from the penalty',()=>{
  const data=JSON.parse(fs.readFileSync(path.join(root,'data/info.json'))),get=heading=>data.sections.find(s=>s.heading===heading);
  assert.match(get('Status Effect Priority').content,/does not automatically erase unrelated effects/);
  assert.match(get('Status Effect Priority').content,/Stun does not interrupt Heal/);
  assert.match(get('Negative Status Effects').list.find(s=>s.startsWith('Absolute Weakness:')),/Permanent native passive gains are unchanged/);
});
