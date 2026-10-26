const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const modalSource = fs.readFileSync(path.join(root, 'js/core/modal.js'), 'utf8');
const schema = modalSource.slice(modalSource.indexOf('const STAT_DEFS'), modalSource.indexOf('/* ════════════════════════════════════════════════════════\n   BUILDER HELPERS'));
const helpers = modalSource.slice(modalSource.indexOf('function modalEscape'), modalSource.indexOf('function buildAscendedBanner'));
const context = vm.createContext({ modalStatsPage:1, modalCardSection:'stats' });
vm.runInContext(schema + helpers, context);
const run = code => vm.runInContext(code, context);
const files = fs.readdirSync(path.join(root, 'rarity')).filter(f => f.endsWith('.json')).sort();
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
    assert.ok(['ground','flying','hovering'].includes(p.movementType), card.name);
    assert.equal(p.groundEffectImmune, p.movementType !== 'ground', card.name);
    assert.ok(['very-light','light','medium','heavy','very-heavy'].includes(p.weight), card.name);
    assert.ok(['ground','air','both','none'].includes(p.targets), card.name);
    for (const key of ['attackWidth','attackDistance','attackAngle']) assert.ok(p[key] === null || Number.isFinite(p[key]) && p[key] >= 0, `${card.name}: ${key}`);
    if (p.multiTarget) assert.ok(p.maxTargets === null || p.maxTargets > 1, card.name);
    else assert.ok(p.maxTargets === 0 || p.maxTargets === 1, card.name);
    if (p.attackType === 'none') assert.equal(p.targets, 'none', card.name);
  }
});

test('burst damage is independent from simultaneous target count, including distinct dual forms', () => {
  assert.equal(cards.find(c => c.id === 'soldier').combatStats.maxTargets, 1);
  assert.equal(cards.find(c => c.id === 'tenta').combatStats.maxTargets, 5);
  assert.equal(cards.find(c => c.id === 'hailey').combatStats.attackAngle, 360);
  assert.equal(cards.find(c => c.id === 'hailey').combatStats.attackWidth, null);
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
  assert.equal(pages.length, 3);
  assert.ok(!html.includes('stat-bar'));
  const sections = run("buildCardSections(card, 'Ability text', 'Lore text')");
  assert.match(sections, /card-section-levels/);
  assert.match(sections, /Level 1/);
  assert.match(sections, /card-section-lore/);
  assert.equal((sections.match(/data-card-section=/g) || []).length, 4);
});

test('missing data stays explicit, values are escaped, and a zero stat is never hidden', () => {
  const html = run("buildStatTiles(STAT_DEFS, {health:0, damage:'<script>boom</script>'})");
  assert.match(html, /modal-stat-value">0</);
  assert.match(html, /&lt;script&gt;/);
  assert.ok(!html.includes('<script>'));
  assert.equal((html.match(/data-stat=/g) || []).length, 8);
  assert.match(html, /No comparison data/);
});

test('conditional flight and splash damage display their activation rules', () => {
  context.card = cards.find(c => c.id === 'xii-josh');
  assert.match(run('buildCombatProfile(card)'), /10 saniyə uçar/);
  context.card = cards.find(c => c.id === 'voltriker');
  assert.match(run('buildCombatProfile(card)'), /Hər 4-cü vuruşda/);
  context.card = { stats:{}, combatStats:{}, type:['Unknown'] };
  assert.doesNotMatch(run('buildCombatProfile(card)'), /undefined|null/);
});


test('modal stat, profile and level renderers use inline icons without emoji', () => {
  context.card = cards.find(c => c.id === 'nitrox');
  for (const expr of ['buildModalStats(card)', 'buildCombatProfile(card)', 'buildStarLevels(card.showlevels)']) {
    const html = run(expr);
    assert.doesNotMatch(html, /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u);
  }
  assert.match(run('buildModalStats(card)'), /<svg class="modal-icon"/);
});


test('ability texts, names, turn abilities and star upgrades are preserved verbatim', () => {
  // Change this baseline only when an ability edit is explicitly requested.
  const content=forms.map(c=>[c.id??null,c.name,c.trait??null,c.abilityName??null,c.turns??null,c.showlevels??null]);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex'),
    'c1816898f72721bb8d2117f018df01434fe6e98cd64b895b3eed681f19a2e794');
});

test('Henry projectile width and attack travel distance are independent of Range', () => {
  context.card=cards.find(c=>c.id==='henry');
  assert.equal(context.card.combatStats.attackWidth,1200);
  assert.equal(context.card.combatStats.attackDistance,1250);
  assert.equal(context.card.additionalStats.range,'1200');
  const html=run('buildCombatProfile(card)');
  assert.match(html,/Projectile Width/);
  assert.match(html,/1200 tiles/);
  assert.match(html,/Attack Distance/);
  assert.match(html,/1250 tiles/);
});

test('Arcanyx travel limit follows maximum Range dynamically and explodes at the endpoint', () => {
  context.card=structuredClone(cards.find(c=>c.id==='arcanyx'));
  assert.equal(run('modalAttackDistance(card)'),2100);
  context.card.additionalStats.range='2600/4800';
  assert.equal(run('modalAttackDistance(card)'),4800);
  assert.equal(context.card.combatStats.projectileEndEffect,'explode');
  const html=run('buildCombatProfile(card)');
  assert.match(html,/4800 tiles/);
  assert.match(html,/Matches current Range/);
  assert.match(html,/Explodes/);
});

test('movement classifications match the provided hovering and flying rosters', () => {
  const key=c=>c.id || c.name.toLowerCase().replaceAll(' ','-');
  assert.deepEqual(forms.filter(c=>c.combatStats.movementType==='hovering').map(key).sort(),
    ['cryon','tornado','astranova','whisper','fallen-angel','void-wraith'].sort());
  assert.deepEqual(forms.filter(c=>c.combatStats.movementType==='flying').map(key).sort(),
    ['bees','angels','hornets','venom-fangs','bats','butterflies'].sort());
  assert.equal(run('MODAL_MOVEMENT.hovering.layer'),'ground');
  assert.equal(run('MODAL_MOVEMENT.hovering.groundEffectImmune'),true);
  assert.equal(run('MODAL_MOVEMENT.ground.groundEffectImmune'),false);
  assert.equal(run('MODAL_MOVEMENT.flying.layer'),'air');
});

test('new profile and stat labels are English while conditional ability text stays authored', () => {
  context.card=cards.find(c=>c.id==='cryon');
  const html=run('buildCombatProfile(card)');
  assert.match(html,/Hovering/);
  assert.match(html,/Ground Effect Immunity/);
  assert.doesNotMatch(html,/[ƏəıİşŞçÇğĞüÜöÖ]/);
  const stats=run('buildModalStats(card)');
  assert.match(stats,/Primary Stats/);
  assert.match(stats,/Recovery &amp; Defense|Recovery & Defense/);
  assert.doesNotMatch(stats,/[ƏəıİşŞçÇğĞüÜöÖ]/);
});
