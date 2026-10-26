const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const modalSource = fs.readFileSync(path.join(root, 'js/core/modal.js'), 'utf8');
const schema = modalSource.slice(modalSource.indexOf('const STAT_DEFS'), modalSource.indexOf('/* ════════════════════════════════════════════════════════\n   BUILDER HELPERS'));
const helpers = modalSource.slice(modalSource.indexOf('function modalEscape'), modalSource.indexOf('function buildAscendedBanner'));
const context = vm.createContext({ modalStatsPage:1, modalStatsOpen:true });
vm.runInContext(schema + helpers, context);
const run = code => vm.runInContext(code, context);
const files = fs.readdirSync(path.join(root, 'rarity')).filter(f => f.endsWith('.json'));
const cards = files.flatMap(f => JSON.parse(fs.readFileSync(path.join(root, 'rarity', f))));
function allForms(card) {
  return [card, ...(card.forms || []).flatMap(allForms), ...['type1','type2','upgradedsecondForm'].flatMap(k => card[k] ? allForms(card[k]) : [])];
}
const forms = cards.flatMap(allForms);

test('all cards and nested forms have complete, consistent editable combat profiles', () => {
  assert.equal(cards.length, 138);
  assert.equal(forms.length, 192);
  for (const card of forms) {
    const p = card.combatStats;
    assert.ok(p, card.name);
    assert.ok(['melee','ranged','mixed','none'].includes(p.attackType), card.name);
    assert.equal(typeof p.multiTarget, 'boolean', card.name);
    assert.ok(['single','cone','circle','line','square','multi','none'].includes(p.attackShape), card.name);
    assert.ok(['ground','flying','conditional'].includes(p.flight), card.name);
    assert.ok(['very-light','light','medium','heavy','very-heavy'].includes(p.weight), card.name);
    assert.ok(['ground','air','both','none'].includes(p.targets), card.name);
    assert.equal(typeof p.attackWidth, 'string', card.name);
    if (p.flight === 'conditional') assert.ok(p.flightCondition, card.name);
    if (p.multiTarget) assert.ok(p.maxTargets === null || p.maxTargets > 1, card.name);
    else assert.ok(p.maxTargets === 0 || p.maxTargets === 1, card.name);
    if (p.attackType === 'none') assert.equal(p.targets, 'none', card.name);
  }
});

test('burst damage is independent from simultaneous target count, including distinct dual forms', () => {
  assert.equal(cards.find(c => c.id === 'soldier').combatStats.maxTargets, 1);
  assert.equal(cards.find(c => c.id === 'tenta').combatStats.maxTargets, 5);
  assert.equal(cards.find(c => c.id === 'hailey').combatStats.attackWidth, '360°');
  const ray = cards.find(c => c.id === 'mr-and-mrs-ray');
  assert.equal(ray.type1.combatStats.multiTarget, true);
  assert.equal(ray.type2.combatStats.multiTarget, false);
  assert.equal(ray.type1.forms[0].combatStats.multiTarget, true);
  assert.equal(ray.type2.forms[0].combatStats.multiTarget, false);
});

test('stat magnitude handles comma decimals, burst damage and missing or zero values', () => {
  assert.equal(run("modalStatMagnitude('0,80s')"), .8);
  assert.equal(run("modalStatMagnitude('2x6')"), 12);
  assert.equal(run("modalStatMagnitude('2 × 6')"), 12);
  assert.equal(run("modalStatMagnitude('1000/2500')"), 1000);
  assert.equal(run("modalStatMagnitude('0%')"), 0);
  for (const v of [null, undefined, '-', '—', '', 'unknown']) {
    context.value = v;
    assert.equal(run('modalStatMagnitude(value)'), null);
  }
});

test('crystals reward faster attacks and lower delay, mana cost and shield depletion', () => {
  for (const key of ['attackSpeed','delay','mana','shieldtakendamage']) {
    context.key = key;
    assert.ok(run('modalStatRating({key, max:100}, 1) >= modalStatRating({key, max:100}, 4)'));
  }
  assert.equal(run("modalStatRating({key:'health', max:1000}, 1000)"), 5);
  assert.equal(run("modalStatRating({key:'health', max:1000}, 0)"), 0);
  assert.equal(run("modalStatRating({key:'damage', max:200}, 300)"), 5);
  assert.equal(run("modalStatRating({key:'damage', max:200}, '—')"), null);
});

test('all 24 numeric stats remain visible with the requested first page pairing', () => {
  context.card = cards.find(c => c.id === 'nitrox');
  const html = run('buildModalStats(card)');
  const pages = html.split('<section class="modal-stat-page"').slice(1);
  const keys = str => [...str.matchAll(/data-stat="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(keys(pages[0]), ['health','shield','damage','sps','attackSpeed','delay','mana','number','range','speed','criticDamage','criticalChance','lifesteal','lifestealChance']);
  assert.equal(keys(pages[1]).length, 10);
  assert.equal(new Set(keys(html)).size, 24);
  assert.equal(pages.length, 4);
  assert.ok(!html.includes('stat-bar'));
  assert.match(pages[3], /Level 1/);
});

test('missing data stays explicit, values are escaped, and a zero stat is never hidden', () => {
  const html = run("buildStatTiles(STAT_DEFS, {health:0, damage:'<script>boom</script>'})");
  assert.match(html, /modal-stat-value">0</);
  assert.match(html, /&lt;script&gt;/);
  assert.ok(!html.includes('<script>'));
  assert.equal((html.match(/data-stat=/g) || []).length, 8);
  assert.match(html, /Müqayisə məlumatı yoxdur/);
});

test('conditional flight and splash damage display their activation rules', () => {
  context.card = cards.find(c => c.id === 'xii-josh');
  assert.match(run('buildCombatProfile(card)'), /10 saniyə uçar/);
  context.card = cards.find(c => c.id === 'voltriker');
  assert.match(run('buildCombatProfile(card)'), /Hər 4-cü vuruşda/);
  context.card = { stats:{}, combatStats:{}, type:['Unknown'] };
  assert.doesNotMatch(run('buildCombatProfile(card)'), /undefined|null/);
});
