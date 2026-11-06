const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const cards=fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).sort().flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f))));
const modules=Promise.all([import('../arena/js/power.mjs'),import('../arena/js/catalog.mjs')]);

test('shared Power scorer preserves all 138 original Codex scores, including dual-card averages',async()=>{
  // Keep the original-stat regression fixture independent of the requested
  // Explicit stat rebalances are restored only in this historical fixture.
  // The next test checks every current authored score with the website formula.
  const baseline=structuredClone(cards),maapp=baseline.find(c=>c.id==='maapp');
  for(const[id,stats,additional]of[
    ['frostshot',{attackSpeed:'0.10s',delay:'1.20s'},{}],
    ['deadscope',{damage:'150',attackSpeed:'5.00s'},{range:'8000'}],
    ['naar',{damage:'120',attackSpeed:'3.00s'},{}],
    ['lyra',{health:'150',shield:'25'},{}],
  ]){const card=baseline.find(c=>c.id===id);Object.assign(card.stats,stats);Object.assign(card.additionalStats,additional);}
  baseline.find(c=>c.id==='nightfang').additionalStats.vision='8000';
  baseline.find(c=>c.id==='stormblade').additionalStats.range='2600';
  baseline.find(c=>c.id==='leno').type2.additionalStats.range='3200';
  maapp.stats.attackSpeed='0.25s';maapp.upgradedsecondForm.stats.attackSpeed='0.25s';
  const [{createPowerScorer}]=await modules,score=createPowerScorer(baseline);
  const scores=baseline.map(card=>[card.id,score(card)]);
  // Captured from the original Codex formula before extracting the shared module.
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(scores)).digest('hex'),'2db2dd13f823024488b778a7550884236a312d000081aefa5f71c39edd1b11af');
});

test('Format receives exactly the same scaled Power as the website for every root and reachable form',async()=>{
  const [{createPowerScorer},{buildCatalog}]=await modules,catalog=buildCatalog(cards,[]),score=createPowerScorer(cards);
  for(const def of catalog.forms){assert.equal(def.power,score(def.raw),def.id);assert.ok(Number.isFinite(def.power));}
  const first=score(cards[0]);createPowerScorer([cards[0]]);assert.equal(score(cards[0]),first,'independent catalogs cannot reset one another');
  assert.equal(createPowerScorer([cards[0]])(cards[0]),550);
});
