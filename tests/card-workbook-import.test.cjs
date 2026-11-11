const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),manifest=require('../data/card-imports/book2.json'),before=require('./fixtures/pre-book2-cards.json');
const files=fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json'));
const cards=files.flatMap(file=>JSON.parse(fs.readFileSync(path.join(root,'rarity',file)))),byId=new Map(cards.map(c=>[c.id,c]));
function walk(c){return[c,...(c.forms||[]).flatMap(walk),...['type1','type2','upgradedsecondForm'].flatMap(k=>c[k]?walk(c[k]):[])];}

test('Book2 retains all originals apart from rarity moves and explicitly authorized later audit corrections',()=>{
 assert.equal(cards.length,176);assert.equal(cards.flatMap(walk).length,241);assert.equal(byId.size,cards.length);assert.equal(manifest.newCards.length,29);
 assert.deepEqual(new Set(manifest.newCards.map(c=>c.id)),new Set(cards.filter(c=>!before.order.includes(c.id)&&c.sourceWorkbook?.file!=='Book1.xlsx').map(c=>c.id)));
 for(const id of before.order){
  const c=structuredClone(byId.get(id));assert.ok(c,id);delete c.rarity;
  // Restore only the four source edits authorized after the Book2 import.
  if(id==='ironjaw')c.trait='Hər hasar verdikdə Can Çalma şansı <b>+0,5%</b> artar <b>(Max:25%)</b>';
  if(id==='tphoenix'){c.combatStats.multiTarget=false;c.combatStats.maxTargets=1;}
  if(id==='deadscope')c.stats.sps='30';if(id==='naar')c.stats.sps='40';
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(c)).digest('hex'),before.sha256ById[id],id);
 }
 assert.equal(byId.get('xii-josh').stats.number,'1');assert.equal(byId.get('ase').type2.additionalStats.range,'2500');assert.equal(byId.get('ase').type2.additionalStats.speed,'1050');
});

test('rarity files, visible rarity and moved card identities remain consistent without duplicate Stormblade or Umbra entries',()=>{
 const counts={Mundane:33,Familiar:31,Arcane:29,Relic:26,Ascendant:10,Apex:24,Emergent:13,Ethereal:10};
 for(const file of files){const roots=JSON.parse(fs.readFileSync(path.join(root,'rarity',file)));for(const c of roots){assert.equal(c.rarity.toLowerCase()+'.json',file,c.id);for(const f of walk(c))assert.equal(f.rarity,c.rarity,f.name);}assert.equal(roots.length,counts[roots[0].rarity]);}
 assert.equal(byId.get('stormblade').rarity,'Mundane');assert.equal(byId.get('umbra').rarity,'Arcane');
 assert.deepEqual(manifest.rarityMoves.map(c=>[c.id,c.from,c.to]),[['stormblade','Apex','Mundane'],['umbra','Apex','Arcane']]);
});

test('the two workbook Marcy entries are distinct Mertel and Marcy cards with their own native abilities and source rows',()=>{
 const mertel=byId.get('mertel'),marcy=byId.get('marcy');
 assert.deepEqual([mertel.name,mertel.rarity,mertel.stats.health,mertel.stats.shield],['Mertel','Arcane','125','65']);assert.match(mertel.trait,/kritik şansı can çalma şansına/);assert.equal(mertel.additionalStats.lifestealChance,'50%');
 assert.deepEqual([marcy.name,marcy.rarity,marcy.stats.health,marcy.stats.shield],['Marcy','Ascendant','100','60']);assert.match(marcy.trait,/2 saniyəlik \+20%/);assert.deepEqual(marcy.ascension.partnerIds,['dracula']);assert.equal(mertel.sourceWorkbook.originalName,'Marcy');
});

test('new numeric source values preserve hit formats, interval precision, probabilities and tile-to-point conversions',()=>{
 const atlas=byId.get('atlas'),stan=byId.get('great-stan'),dragon=byId.get('dragon'),monkeys=byId.get('three-wise-monkeys');
 assert.deepEqual([atlas.additionalStats.range,atlas.additionalStats.speed,atlas.stats.attackSpeed],['1000/2600','1000','0.90s/1.15s']);
 assert.deepEqual([stan.stats.damage,stan.stats.attackSpeed,stan.stats.delay,stan.additionalStats.range,stan.additionalStats.speed],['6x2','0.165s','1.40s','3250','1000']);assert.equal(stan.upgradedsecondForm.stats.attackSpeed,'0.165s');
 assert.deepEqual([dragon.type1.additionalStats.range,dragon.type1.additionalStats.speed,dragon.type2.stats.damage],['1450','1000','10x5']);
 assert.deepEqual([monkeys.stats.number,monkeys.additionalStats.criticalChance],['3','10%']);assert.equal(byId.get('cow').stats.health,'800');assert.equal(byId.get('indi').additionalStats.range,'10000');
});

test('new Ascendant partner rows, Bolt companion, Cloud phases and Dragon choices stay nested under the correct root',()=>{
 for(const[id,partner,health,mana]of[['atlas','stella','260','17'],['great-stan','jestro','160','18'],['marcy','dracula','120','4'],['shield-maiden','legendary-warrior','180','18'],['shockwave','bolt','235','15']]){
  const c=byId.get(id);assert.equal(c.isAscendant,true);assert.deepEqual(c.ascension.partnerIds,[partner]);assert.ok(byId.has(partner),partner);assert.equal(c.upgradedsecondForm.stats.health,health);assert.equal(c.upgradedsecondForm.stats.mana,mana);
 }
 const bolt=byId.get('bolt');assert.equal(bolt.isMulti,true);assert.equal(bolt.forms.length,1);assert.equal(bolt.forms[0].name,'Volt');assert.equal(bolt.forms[0].stats.mana,'-');assert.equal(byId.has('volt'),false);
 assert.equal(byId.get('cloud').isMulti,true);assert.deepEqual(byId.get('cloud').forms.map(c=>c.stats.damage),['2','4']);const d=byId.get('dragon');assert.equal(d.isDual,true);assert.equal(d.type1.name,'Dragon (Light)');assert.equal(d.type2.name,'Dragon (Dark)');assert.equal(d.type2.stats.mana,'16');
});

test('unprovided combat facts remain explicit instead of inventing profiles, while all original Arena cards remain playable',async()=>{
 const{buildCatalog}=await import('../arena/js/catalog.mjs'),catalog=buildCatalog(cards,[]);assert.equal(catalog.cards.filter(c=>c.ready).length,138);
 for(const id of before.order)assert.equal(catalog.byId.get(id).ready,true,id);
 for(const entry of manifest.newCards){const c=byId.get(entry.id),d=catalog.byId.get(entry.id);assert.equal(d.ready,false,entry.id);assert.match(d.reasons.join(' '),/combat profile|native ability/);for(const f of walk(c)){assert.equal(f.combatStats,undefined);assert.ok(f.story==null||f.story==='-');assert.equal(f.class,'');assert.equal(f.sourceWorkbook.file,'Book2.xlsx');if(f.additionalStats)assert.equal(f.additionalStats.criticDamage,'-');}}
});
