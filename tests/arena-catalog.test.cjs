const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.join(__dirname,'..');
const rawCards=fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f))));
const rawSpells=JSON.parse(fs.readFileSync(path.join(root,'data/spells.json')));
const catalogModule=()=>import(pathToFileURL(path.join(root,'arena/js/catalog.mjs')).href);

test('arena catalog retains all source cards and spells without mutating their definitions',async()=>{
  const {buildCatalog}=await catalogModule();
  const before=JSON.stringify([rawCards,rawSpells]);
  const catalog=buildCatalog(rawCards,rawSpells);
  assert.equal(catalog.cards.length,138);
  assert.equal(catalog.spells.length,26);
  assert.ok(catalog.byId instanceof Map);
  for(const card of catalog.cards){
    assert.deepEqual(card.raw,rawCards.find(c=>c.id===card.id));
    assert.equal(typeof card.ready,'boolean');
    assert.ok(Array.isArray(card.reasons),card.id);
    if(!card.ready)assert.ok(card.reasons.length>0,card.id);
  }
  assert.equal(JSON.stringify([rawCards,rawSpells]),before);
  assert.ok(catalog.cards.filter(c=>c.ready).length>=8,'enough fully authored cards for a legal deck');
});

test('numeric combat data keeps source scale, seconds, Count and successive hits separate',async()=>{
  const {buildCatalog}=await catalogModule();
  const {byId}=buildCatalog(rawCards,rawSpells);
  const soldier=byId.get('soldier');
  assert.equal(soldier.ready,true);
  assert.equal(soldier.stats.number,1);
  assert.equal(soldier.stats.range,4000);
  assert.equal(soldier.stats.speed,1050);
  assert.deepEqual([soldier.attack.count,soldier.attack.damage,soldier.attack.interval,soldier.attack.delay],[15,3,.2,1.75]);
  const hammies=byId.get('hammies');
  assert.equal(hammies.stats.number,3);
  assert.equal(hammies.attack.count,1);
  assert.equal(byId.get('henry').combat.attackWidth,1200);
  assert.equal(byId.get('arcanyx').combat.attackDistance,500);
  assert.equal(byId.get('arcanyx').stats.range,2100);
  assert.equal(byId.get('lumina').stats.attackSpeed,1.85);
  assert.equal(byId.get('sunrise').stats.range,2000);
  assert.equal(byId.get('tribe').combat.attackDistance,750);
});

test('every ready definition preserves all 24 numerical stat keys and explicit missing-data locks',async()=>{
  const {buildCatalog}=await catalogModule();
  const {STAT_KEYS}=await import(pathToFileURL(path.join(root,'arena/js/rules.mjs')).href);
  const catalog=buildCatalog(rawCards,rawSpells);
  for(const card of catalog.cards.filter(c=>c.ready)){
    for(const key of STAT_KEYS)assert.ok(Number.isFinite(card.stats[key]),`${card.id}:${key}`);
    assert.ok(card.stats.health>0,card.id);
    assert.ok(card.stats.number>=1,card.id);
    assert.ok(card.combat.attackType==='none'||Number.isFinite(card.combat.attackDistance),card.id);
  }
  assert.equal(catalog.byId.get('nightfang').ready,false,'travel distance has not been authored');
  assert.match(catalog.byId.get('nightfang').reasons.join(' '),/distance/i);
});

test('source-native ability text, spell Charge and Energy remain independently available',async()=>{
  const {buildCatalog}=await catalogModule();
  const catalog=buildCatalog(rawCards,rawSpells);
  assert.equal(catalog.byId.get('venomora').raw.trait,rawCards.find(c=>c.id==='venomora').trait);
  const bomb=catalog.spells.find(s=>s.name==='Giga Bomb');
  assert.equal(bomb.charge,5);
  assert.equal(bomb.energy,10);
  const healing=catalog.spells.find(s=>s.name==='Healing Light');
  assert.equal(healing.charge,1);
  assert.equal(healing.energy,1);
  assert.ok(catalog.spells.some(s=>s.ready),'a legal spell loadout exists');
});
