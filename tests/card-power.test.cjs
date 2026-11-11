const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),cards=fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).sort().flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f))));
const modules=Promise.all([import('../arena/js/power.mjs'),import('../arena/js/catalog.mjs')]);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const base=()=>({id:'fixture',stats:{health:0,shield:0,damage:0,attackSpeed:50,delay:5,mana:20,number:0},additionalStats:{shieldtakendamage:100},combatStats:{attackType:'none',weight:'very-light'}});
async function api(){await modules;return globalThis.ClashCardPower;}

test('fixed budgets, per-entry floors and ceilings apply to every root, form and upgrade',async()=>{
 const p=await api(),[{createPowerScorer},{buildCatalog}]=await modules,catalog=buildCatalog(cards,[]),score=createPowerScorer(cards);
 assert.equal(catalog.forms.length,241);assert.equal(globalThis.ClashPassivePower.length,241);
 for(const def of catalog.forms){const b=p.breakdown(def.raw);assert.equal(def.power,score(def.raw));assert.equal(b.passive.reviewed,true,def.id);assert.ok(b.score>=118&&b.score<=1000,def.id);close(b.stats+b.passive.points,b.total);assert.equal(b.score,Math.round(b.total));
  for(const[key,count,budget,floor]of[['primary',10,500,10],['secondary',9,100,1],['combat',9,200,1]]){const g=b.groups[key];assert.equal(g.max,budget);assert.equal(g.entries.length,count);for(const e of g.entries){close(e.max,budget/count);assert.equal(e.min,floor);assert.ok(e.points>=floor-1e-7&&e.points<=e.max+1e-7);}close(g.points,g.entries.reduce((n,e)=>n+e.points,0));}
 }
});

test('theoretical minimum is 118 and an ideal complete card reaches exactly 1000 without relative scaling',async()=>{
 const p=await api(),low=base();close(p.breakdown(low).total,118);
 const high=structuredClone(cards.find(c=>c.id==='whisper'));Object.assign(high.stats,{health:1000,shield:1000,damage:200,attackSpeed:.1,delay:0,mana:0,number:15});
 Object.assign(high.additionalStats,{range:15000,speed:3000,criticalChance:100,criticDamage:5,lifestealChance:100,lifesteal:100,dodge:70,vision:21000,healBonus:100,healrecovery:10,shieldrecovery:10,criticdamageminimiser:90,damageminimiser:90,flexibility:80,shieldtakendamage:0});
 Object.assign(high.combatStats,{attackType:'ranged',attackDistance:15000,attackWidth:5000,attackAngle:360,attackShape:'circle',multiTarget:true,maxTargets:15,groundEffectImmune:true,weight:'very-heavy',impactSize:'5 × 5 tiles',projectileEndEffect:'explode'});
 const b=p.breakdown(high);close(b.groups.primary.points,500);close(b.groups.secondary.points,100);close(b.groups.combat.points,200);assert.equal(b.passive.points,200);assert.equal(b.score,1000);
});

test('a card score is independent of collection size and extreme new cards',async()=>{
 const [{createPowerScorer}]=await modules,p=await api(),card=cards[0],score=createPowerScorer(cards);assert.equal(createPowerScorer([card])(card),score(card));assert.equal(createPowerScorer([])(card),score(card));assert.equal(score(card),p.raw(card));
});

test('chance and magnitude pairs use expected benefit rather than independent free points',async()=>{
 const p=await api(),c=base();c.additionalStats={criticalChance:0,criticDamage:5,lifestealChance:0,lifesteal:100};
 const entries=()=>Object.fromEntries(p.breakdown(c).groups.primary.entries.map(e=>[e.key,e.points]));close(entries().critical,10);close(entries().lifesteal,10);
 c.additionalStats.criticalChance=50;c.additionalStats.lifestealChance=50;close(entries().critical,30);close(entries().lifesteal,30);
 c.additionalStats.criticDamage=1;close(entries().critical,10);
});

test('the attack cycle includes every burst hit and optional delay, with absent attacks receiving no speed bonus',async()=>{
 const p=await api(),c=base(),speed=()=>p.breakdown(c).groups.primary.entries.find(e=>e.key==='attackCycle').points;
 c.stats.damage='3x6';c.stats.attackSpeed=.1;c.stats.delay=0;close(speed(),50);c.stats.attackSpeed=50;c.stats.delay=5;close(speed(),10);
 c.stats.attackSpeed=1;c.stats.delay=0;const before=speed();c.stats.delay=5;assert.ok(speed()<before);c.stats.attackSpeed='-';close(speed(),10);
 close(p.damagePerSecond({damage:'3×6',attackSpeed:1,delay:3}),3);
});

test('DPS and Life do not double-count power; lower mana and shield depletion score better',async()=>{
 const p=await api(),c=base(),before=p.raw(c);c.stats.sps=2000;c.additionalStats.life=200;assert.equal(p.raw(c),before);
 c.stats.mana=0;close(p.breakdown(c).groups.primary.entries.find(e=>e.key==='mana').points,50);c.additionalStats.shieldtakendamage=0;close(p.breakdown(c).groups.secondary.entries.find(e=>e.key==='shieldtakendamage').points,100/9);
});

test('periodic recovery converts amounts to rates; source values and stats above reference caps stay unchanged',async()=>{
 const p=await api(),c=base();c.additionalStats.healrecovery='6/6s';c.additionalStats.shieldrecovery='10/2s';c.stats.health=2000;const before=JSON.stringify(c),b=p.breakdown(c);
 close(b.groups.secondary.entries.find(e=>e.key==='healrecovery').normalized,.1);close(b.groups.secondary.entries.find(e=>e.key==='shieldrecovery').normalized,.5);assert.equal(b.groups.primary.entries[0].points,50);assert.equal(JSON.stringify(c),before);
});

test('only the nine approved combat fields contribute and physical area determines shape coverage',async()=>{
 const p=await api(),c=base(),before=p.raw(c);c.type=['Alien'];c.combatStats.targets='both';c.combatStats.movementType='flying';c.combatStats.attackType='ranged';assert.equal(p.raw(c),before);
 Object.assign(c.combatStats,{attackDistance:1000,attackWidth:1000,attackAngle:180,attackShape:'cone',weight:'heavy',impactSize:'1,5 × 1,5 tiles'});const b=p.breakdown(c),e=Object.fromEntries(b.groups.combat.entries.map(e=>[e.key,e]));close(e.attackShape.normalized,Math.PI/50);close(e.impactSize.normalized,2.25/25);close(e.weight.normalized,.75);
});

test('dual cards and slash-separated modes average full unrounded breakdowns',async()=>{
 const p=await api(),dual=cards.find(c=>c.id==='mr-and-mrs-ray'),b=p.breakdown(dual);close(b.total,(p.breakdown(dual.type1).total+p.breakdown(dual.type2).total)/2);
 const c=base();Object.assign(c.stats,{damage:'10 / 30',attackSpeed:'1s / 2s',delay:0});c.additionalStats.range='1000 / 3000';const modes=p.breakdown(c);assert.equal(modes.forms.length,2);close(modes.total,(modes.forms[0].total+modes.forms[1].total)/2);
});

test('manual passive ratings survive stat rebalances, but changed or new abilities require a fresh review',async()=>{
 const p=await api(),c=structuredClone(cards.find(c=>c.id==='whisper'));assert.equal(p.breakdown(c).passive.points,200);c.stats.health=1;assert.equal(p.breakdown(c).passive.points,200);c.trait+=' changed';assert.equal(p.breakdown(c).passive.reviewed,false);assert.equal(p.breakdown(c).passive.points,0);
 const keys=globalThis.ClashPassivePower.map(e=>e.key);assert.equal(new Set(keys).size,241);for(const e of globalThis.ClashPassivePower)assert.ok(Number.isInteger(e.score)&&e.score>=0&&e.score<=200);
});
