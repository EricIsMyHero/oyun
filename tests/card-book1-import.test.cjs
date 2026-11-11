const {restoreHistoricalRoles}=require('./card-role-history.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),manifest=require('../data/card-imports/book1.json'),before=require('./fixtures/pre-book1-cards.json');
const cards=fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),byId=new Map(cards.map(c=>[c.id,c]));
function walk(c,key=c.id){return[[c,key],...(c.forms||[]).flatMap((f,i)=>walk(f,key+'/forms/'+i)),...['type1','type2','upgradedsecondForm'].flatMap(k=>c[k]?walk(c[k],key+'/'+k):[])];}
const all=cards.flatMap(c=>walk(c));

test('Book1 preserves prior source data with only subsequently authorized role labels restored',()=>{
 assert.equal(cards.length,176);assert.equal(all.length,241);assert.equal(byId.size,176);assert.equal(manifest.newRootCount,9);
 const added=cards.filter(c=>!Object.hasOwn(before.hashes,c.id));assert.deepEqual(new Set(added.map(c=>c.id)),new Set(manifest.newCards.map(c=>c.id)));
 for(const[id,hash]of Object.entries(before.hashes))assert.equal(crypto.createHash('sha256').update(JSON.stringify(restoreHistoricalRoles(byId.get(id)))).digest('hex'),hash,id);
});

test('new rows retain workbook stats, native ability prose, rarity, source rows and percentage conversions',()=>{
 for(const entry of manifest.newCards){const c=byId.get(entry.id),v=entry.sourceValues;assert.equal(c.name,v[1]);assert.equal(c.rarity,entry.rarity);assert.equal(c.sourceWorkbook.file,'Book1.xlsx');assert.equal(c.sourceWorkbook.sheet,entry.sheet);assert.equal(c.sourceWorkbook.row,entry.row);
  for(const[key,index]of[['health',3],['shield',4],['mana',11],['number',2]])assert.equal(Number(c.stats[key]),v[index],entry.id+key);
  assert.equal(c.stats.damage,String(v[5]));assert.ok(Math.abs(Number(c.stats.sps)-v[6])<1e-7);assert.equal(parseFloat(c.stats.attackSpeed),v[7]);assert.equal(c.stats.delay,v[8]==='-'?'-':v[8].toFixed(2)+'s');assert.equal(c.trait,v[9]);
  assert.equal(c.additionalStats.range,String(v[12]));assert.equal(c.additionalStats.speed,String(v[13]));assert.equal(parseFloat(c.additionalStats.criticalChance),v[14]*100);assert.equal(parseFloat(c.additionalStats.lifestealChance),v[15]*100);
 }
 assert.equal(byId.get('plauge').isEmergent,true);assert.match(byId.get('plauge').trait,/3,2 saniyəlik.*acizlik/);assert.match(byId.get('erica').trait,/8 saniyəlik həbs/);
});

test('Martel is a documented alias for Mertel and workbook typos do not silently rename cards',()=>{
 assert.equal(byId.get('mertel').name,'Mertel');assert.equal(byId.has('martel'),false);assert.equal(byId.has('plague'),false);assert.equal(byId.get('plauge').name,'Plauge');assert.equal(manifest.aliases[0].existingId,'mertel');
});

test('missing combat facts remain unspecified and new cards cannot enter an Arena deck accidentally',async()=>{
 const{buildCatalog}=await import('../arena/js/catalog.mjs'),catalog=buildCatalog(cards,JSON.parse(fs.readFileSync(path.join(root,'data/spells.json'))));assert.equal(catalog.cards.filter(c=>c.ready).length,138);assert.equal(catalog.cards.filter(c=>!c.ready).length,38);
 for(const entry of manifest.newCards){const c=byId.get(entry.id),d=catalog.byId.get(entry.id);assert.equal(c.combatStats,undefined);assert.ok(c.class&&c.subclass,'later role audit supplies the role');assert.equal(c.group,'');assert.equal(c.additionalStats.criticDamage,'-');assert.equal(d.ready,false);assert.match(d.reasons.join(' '),/combat profile|native ability/);}
 const{ArenaEngine}=await import('../arena/js/engine.mjs');const deck=catalog.cards.filter(c=>c.ready).slice(0,7).map(c=>c.id).concat('plauge');assert.throws(()=>new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck,spellDeck:['healing-light'],bot:false}),/complete root/);
});

test('all previous Power scores stay identical and each new passive has an explicit editorial rating',async()=>{
 await import('../arena/js/power.mjs');const p=globalThis.ClashCardPower;
 for(const[c,key]of all){const b=p.breakdown(c);if(Object.hasOwn(before.power,key))assert.equal(b.score,before.power[key],key);assert.equal(b.passive.reviewed,true,key);}
 const points={erica:150,witch:125,bro:100,tooni:125,spinata:100,nancy:100,veronica:125,radglic:150,plauge:150};for(const[id,pointsExpected]of Object.entries(points))assert.equal(p.breakdown(byId.get(id)).passive.points,pointsExpected,id);
});
