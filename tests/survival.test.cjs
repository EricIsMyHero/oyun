const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const modal = fs.readFileSync(path.join(__dirname, '../js/core/modal.js'), 'utf8');
const schema = modal.slice(modal.indexOf('const STAT_DEFS'), modal.indexOf('/* ════════════════════════════════════════════════════════\n   BUILDER HELPERS'));
const metadata = fs.readFileSync(path.join(__dirname, '../js/modules/survival-data.js'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '../js/modules/survival.js'), 'utf8');

// The game runs unmodified in a VM. Only browser surfaces are stubbed; combat,
// XP, eligibility, timers and upgrade application use the production functions.
function game(character = 'soldier') {
  const elements = new Map();
  const element = () => ({ style: { setProperty() {} }, hidden: true, textContent: '', innerHTML: '',
    children: [], appendChild(child) { this.children.push(child); }, replaceChildren() { this.children = []; },
    addEventListener() {}, focus() {}, getContext() { return {}; } });
  const context = vm.createContext({
    window: { matchMedia: () => ({ matches: false }), addEventListener() {} },
    document: { hidden: false, addEventListener() {}, createElement: element,
      querySelector() { return null; }, getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); } },
    Image: class {}, getCardImg: () => 'art.jpg',
    performance: { now: () => 0 }, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  });
  vm.runInContext(schema + metadata + source, context);
  const run = code => vm.runInContext(code, context);
  // Explicit balanced fixtures isolate combat assertions from future Codex edits.
  run(`for (const [id, hp, damage, speed, range, interval] of [['soldier',100,5,1150,4800,2], ['henry',130,10,975,1500,1.25]]) {
    const cfg = SURVIVAL_CHARACTERS[id];
    Object.assign(cfg.stats, {health:hp, shield:0, damage, speed, range, attackSpeed:interval, criticalChance:0, criticDamage:2});
    cfg.maxHealth = hp;
  }
  survivalVisible = true; startSurvivalRun('${character}');`);
  return { run, context, state: () => run('survivalState'), elements };
}
function offer(g, key) {
  g.run(`survivalState.choosing = true; survivalState.choices = [survivalUpgradePool().find(c => c.key === '${key}')]; survivalChooseUpgrade(0);`);
}
function enemy(g, options = '') {
  return g.run(`survivalState.enemies[0] = { x: 580, y: 270, hp: 100, maxHp: 100, radius: 16, ${options} };`);
}
function quiet(g) { g.run('survivalState.spawnCd = 1e9; survivalState.weapons.forEach(w => { w.cd = 1e9; w.shotsLeft = 0; });'); }

test('starting weapon counts toward four slots for both characters; runs reset bonuses', () => {
  for (const [ch, first] of [['soldier', 'rifle'], ['henry', 'axe']]) {
    const g = game(ch);
    assert.equal(g.state().weapons.length, 1);
    assert.equal(g.state().weapons[0].id, first);
    offer(g, 'stat:health'); offer(g, 'passive:venomora');
    assert.equal(g.state().passives.length, 1);
    g.run(`startSurvivalRun('${ch}')`);
    assert.equal(g.state().passives.length, 0);
    assert.equal(g.state().stats.health, ch === 'soldier' ? 100 : 130);
    assert.equal(g.state().player.hp, ch === 'soldier' ? 100 : 130);
    assert.equal(g.run(`SURVIVAL_CHARACTERS.${ch}.maxHealth`), ch === 'soldier' ? 100 : 130);
  }
});

test('level up produces 3 distinct categories and freezes the entire simulation', () => {
  const g = game();
  g.run('survivalState.player.hp = 70; survivalState.player.xp = 8; survivalUpdate(0.05);');
  assert.equal(g.state().choosing, true);
  assert.equal(g.state().player.level, 2);
  assert.equal(g.state().player.hp, 70); // no free automatic damage/health buff
  assert.equal(g.state().choices.length, 3);
  assert.equal(new Set(g.state().choices.map(c => c.key)).size, 3);
  assert.deepEqual(Array.from(g.state().choices, c => c.type).sort(), ['passive', 'stat', 'weapon']);
  const snapshot = g.run('JSON.stringify(survivalState)');
  g.run('survivalKeys.d = true; survivalUpdate(0.05)');
  assert.equal(g.run('JSON.stringify(survivalState)'), snapshot);
});

test('overflow XP gives sequential choices with no loss or free upgrades', () => {
  const g = game();
  g.run('survivalState.player.xp = 40; survivalLevelUp();');
  for (let i = 0; i < 3; i++) {
    assert.equal(g.state().player.level, 2 + i);
    assert.equal(g.state().choosing, true);
    g.run('survivalChooseUpgrade(0)');
  }
  assert.equal(g.state().player.level, 4);
  assert.equal(g.state().player.xp, 7); // 40 - 8 - 11 - 14
  assert.equal(g.state().choosing, false);
  const after = g.run('JSON.stringify(survivalState)');
  g.run('survivalChooseUpgrade(0); survivalChooseUpgrade(-1)');
  assert.equal(g.run('JSON.stringify(survivalState)'), after);
});

test('four weapon/passive slots block new items but retain upgrades', () => {
  const g = game();
  for (const id of ['axe', 'wand', 'orbit']) offer(g, `weapon:${id}`);
  for (const id of ['venomora', 'toxic', 'magmara', 'clara']) offer(g, `passive:${id}`);
  const pool = g.run('survivalUpgradePool()');
  assert.equal(g.state().weapons.length, 4); assert.equal(g.state().passives.length, 4);
  assert.ok(!pool.some(c => c.key === 'weapon:nova' || c.key === 'passive:aeralis'));
  assert.ok(pool.some(c => c.key === 'weapon:rifle'));
  assert.ok(pool.some(c => c.key === 'passive:venomora'));
  // A stale offer cannot add a fifth item.
  g.run("survivalState.choosing = true; survivalState.choices = [{ key:'weapon:nova', type:'weapon', id:'nova' }]; survivalChooseUpgrade(0)");
  assert.equal(g.state().weapons.length, 4);
  offer(g, 'weapon:rifle'); offer(g, 'passive:venomora');
  assert.equal(g.state().weapons[0].level, 2);
  assert.equal(g.state().passives[0].level, 2);
});

test('all stat caps clamp, disappear from offers, and cannot be exceeded', () => {
  const g = game();
  for (const [id, def] of Object.entries(g.run('SURVIVAL_STAT_DEFS'))) {
    if (def.derived) continue;
    if (id === 'attackSpeed') g.run('survivalState.haste = 85');
    else g.run(`survivalState.stats.${id} = ${def.lower ? def.min + def.step / 2 : def.cap - def.step / 2}`);
    offer(g, `stat:${id}`);
    if (id === 'attackSpeed') assert.equal(g.state().haste, 90);
    else assert.equal(g.state().stats[id], def.lower ? def.min : def.cap);
    assert.ok(!g.run('survivalUpgradePool()').some(c => c.key === `stat:${id}`));
  }
  assert.equal(g.state().haste, 90);
});

test('full progression still gives 3 selectable, distinct supplies', () => {
  const g = game();
  g.run(`survivalState.weapons = ['rifle','axe','wand','orbit'].map(id => ({...survivalCreateWeapon(id), level: 8}));
    survivalState.passives = ['venomora','toxic','magmara','clara'].map(id => ({id, level: 5}));
    for (const [id,def] of Object.entries(SURVIVAL_STAT_DEFS)) survivalState.stats[id] = def.lower ? def.min : def.cap; survivalState.haste = 90;
    survivalState.player.xp = 8; survivalLevelUp();`);
  assert.equal(g.state().choices.length, 3);
  assert.deepEqual(Array.from(g.state().choices, c => c.id).sort(), ['barrier', 'blast', 'heal']);
  const index = g.state().choices.findIndex(c => c.id === 'barrier');
  g.run(`survivalChooseUpgrade(${index})`);
  assert.equal(g.state().player.contactCd, 8000);
});

test('Venomora slows by 25% for exactly 2 seconds and refreshes without stacking', () => {
  const g = game(); quiet(g); const e = enemy(g);
  offer(g, 'passive:venomora');
  g.run("survivalDamageEnemy(survivalState.enemies[0], 1, '#fff')");
  assert.equal(e.slowTime, 2); assert.equal(e.slowAmount, 0.25);
  const initialX = e.x;
  g.run('survivalUpdate(0.05)');
  const expected = (70 + 0.05 * 0.6) * 0.05 * 0.75;
  assert.ok(Math.abs(initialX - e.x - expected) < 1e-9);
  g.run("survivalDamageEnemy(survivalState.enemies[0], 1, '#fff')");
  assert.equal(e.slowTime, 2); assert.equal(e.slowAmount, 0.25);
  // No player contact; expiry and partial-frame movement can be checked safely.
  e.x = 900; e.slowTime = 0.02;
  const x = e.x;
  g.run('survivalUpdate(0.05)');
  assert.equal(e.slowTime, 0);
  assert.ok(Math.abs(x - e.x - (70 + 0.1 * 0.6) * (0.05 - 0.02 * 0.25)) < 1e-9);
});

test('poison and burn apply their exact totals, refresh, then expire', () => {
  const g = game(); quiet(g); const e = enemy(g, 'x: 900');
  offer(g, 'passive:toxic'); offer(g, 'passive:magmara');
  g.run("survivalDamageEnemy(survivalState.enemies[0], 1, '#fff')");
  for (let i = 0; i < 70; i++) g.run('survivalUpdate(0.05)');
  assert.ok(Math.abs(e.hp - 87) < 1e-8); // 1 hit + 2*3 poison + 3*2 burn
  assert.equal(e.poisonTime, 0); assert.equal(e.burnTime, 0);
  g.run("survivalDamageEnemy(survivalState.enemies[0], 1, '#fff')");
  assert.equal(e.poisonTime, 3); assert.equal(e.burnTime, 2);
});

test('Venomspikes counts each fifth direct hit, not damage-over-time', () => {
  const g = game(); const e = enemy(g, 'hp: 1000, maxHp: 1000');
  offer(g, 'passive:venomspikes');
  for (let i = 0; i < 5; i++) g.run("survivalDamageEnemy(survivalState.enemies[0], 1, '#fff')");
  assert.equal(e.hp, 915); assert.equal(e.toxinHits, 5);
  g.run("survivalDamageEnemy(survivalState.enemies[0], 10, '#fff', false)");
  assert.equal(e.hp, 905); assert.equal(e.toxinHits, 5);
});

test('Aeralis pushes away and Clara heals kills without exceeding maximum HP', () => {
  const g = game(); quiet(g); const e = enemy(g);
  offer(g, 'passive:aeralis'); offer(g, 'passive:clara');
  g.run("survivalDamageEnemy(survivalState.enemies[0], 1, '#fff')");
  assert.equal(e.x, 592);
  g.state().player.hp = 99.5; e.hp = 0;
  g.run('survivalUpdate(0.05)');
  assert.equal(g.state().player.hp, 100);
  assert.equal(g.state().kills, 1); assert.equal(g.state().player.xp, 1);
});

test('all six weapons deal damage, including orbit, area and chaining', () => {
  for (const id of ['rifle','axe','wand','orbit','nova','lightning']) {
    const g = game();
    const e = enemy(g, 'x: 562');
    g.run(`survivalState.weapons = [survivalCreateWeapon('${id}')]; survivalState.spawnCd = 1e9; survivalUpdate(0.01);`);
    for (let i = 0; i < 20; i++) g.run('survivalUpdate(0.02)');
    assert.ok(e.hp < 100, `${id} must actually hit`);
  }
});

test('projectiles cannot tunnel through enemies, hit twice, or exceed range', () => {
  const g = game(); const e = enemy(g, 'x: 600'); quiet(g);
  g.run(`survivalState.bullets = [{x: 550, y:270, vx:2000, vy:0, speed:2000, radius:4,
    damage:5, remaining:200, pierce:3, targets:new Set(), color:'#fff'}]; survivalUpdate(0.05)`);
  assert.equal(e.hp, 95);
  g.run('survivalUpdate(0.05); survivalUpdate(0.05)');
  assert.equal(e.hp, 95); assert.equal(g.state().bullets.length, 0);
  // A target beyond the remaining travel budget must not be hit.
  e.x = 600;
  g.run(`survivalState.bullets = [{x:550,y:270,vx:2000,vy:0,speed:2000,radius:4,
    damage:5,remaining:10,pierce:1,targets:new Set(),color:'#fff'}]; survivalUpdate(0.05)`);
  assert.equal(e.hp, 95);
});

test('damage, armor, attack-speed and regeneration bonuses affect combat', () => {
  const g = game(); const e = enemy(g);
  offer(g, 'stat:damage'); offer(g, 'stat:damageminimiser'); offer(g, 'stat:healrecovery');
  g.run("survivalDamageEnemy(survivalState.enemies[0], 10, '#fff')");
  assert.equal(e.hp, 84);
  g.run('survivalState.haste = 90; survivalState.player.hp = 50; survivalUpdate(0.05)');
  assert.ok(Math.abs(g.state().weapons[0].cd - 2000 / 1.9) < 1e-9);
  assert.equal(g.state().player.hp, 50.025);
  e.x = g.state().player.x; e.y = g.state().player.y;
  g.run('survivalUpdate(0.05)');
  assert.ok(Math.abs(g.state().player.hp - (50.05 - 8 * 0.95)) < 1e-9);
});

test('pause, hidden section and hidden tab freeze combat; returning resumes it', () => {
  const g = game();
  for (const [pause, resume] of [
    ['survivalTogglePause()', 'survivalTogglePause()'],
    ['survivalSetVisible(false)', 'survivalSetVisible(true)'],
    ['document.hidden = true', 'document.hidden = false'],
  ]) {
    g.run(pause); const t = g.state().elapsed;
    g.run('survivalUpdate(0.05)'); assert.equal(g.state().elapsed, t);
    g.run(resume); g.run('survivalUpdate(0.05)'); assert.ok(g.state().elapsed > t);
  }
});

test('death beats level-up and kill healing; restart/menu clears modal and run', () => {
  const g = game(); quiet(g);
  offer(g, 'passive:clara');
  enemy(g, 'hp: 0');
  g.run(`survivalState.enemies.push({x:480,y:270,radius:16,hp:100,maxHp:100});
    survivalState.player.hp = 1; survivalState.player.xp = 7; survivalUpdate(0.05)`);
  assert.equal(g.state().over, true); assert.equal(g.state().choosing, false);
  assert.equal(g.state().player.hp, 0);
  g.run('startSurvivalRun("henry")');
  assert.equal(g.state().over, false); assert.equal(g.state().weapons[0].id, 'axe');
  g.run('survivalExitRun()');
  assert.equal(g.state().over, true);
  assert.equal(g.elements.get('survival-game').style.display, 'none');
});

test('maximum weapon/passive levels are not offered, and new passives are preferred', () => {
  const g = game();
  for (let i = 1; i < 8; i++) offer(g, 'weapon:rifle');
  for (let i = 0; i < 5; i++) offer(g, 'passive:venomora');
  assert.equal(g.state().weapons[0].level, 8);
  assert.equal(g.state().passives[0].level, 5);
  assert.ok(!g.run('survivalUpgradePool()').some(c => ['weapon:rifle', 'passive:venomora'].includes(c.key)));
  for (let i = 0; i < 20; i++) {
    g.run('survivalState.choosing = false; survivalState.player.xp = survivalState.player.xpToNext; survivalLevelUp()');
    const passive = g.state().choices.find(c => c.type === 'passive');
    assert.ok(passive && passive.id !== 'venomora');
  }
});

test('chain lightning hits distinct enemies and nova damages all targets in radius', () => {
  for (const id of ['lightning', 'nova']) {
    const g = game();
    g.run(`survivalState.enemies = [520,540,560].map(x => ({x,y:270,hp:100,maxHp:100,radius:16}));
      survivalAttack(survivalCreateWeapon('${id}'));`);
    for (const e of g.state().enemies) assert.equal(e.hp, id === 'lightning' ? 92 : 90);
  }
});

test('a real kill awards XP once and opens the level-up selection', () => {
  const g = game(); quiet(g);
  enemy(g, 'hp: 1');
  g.state().player.xp = 7;
  g.run("survivalDamageEnemy(survivalState.enemies[0], 5, '#fff'); survivalUpdate(0.05)");
  assert.equal(g.state().kills, 1); assert.equal(g.state().player.level, 2);
  assert.equal(g.state().player.xp, 0); assert.equal(g.state().choosing, true);
  g.run('survivalChooseUpgrade(0); survivalUpdate(0.05)');
  assert.equal(g.state().kills, 1); assert.equal(g.state().player.xp, 0);
});

test('health and movement bonuses use the character base; critical hits double damage', () => {
  const g = game('henry'); quiet(g);
  offer(g, 'stat:health'); offer(g, 'stat:health');
  assert.equal(g.state().cfg.maxHealth, 180); assert.equal(g.state().player.hp, 180);
  offer(g, 'stat:speed');
  const x = g.state().player.x;
  g.run('survivalKeys.d = true; survivalUpdate(0.05)');
  assert.ok(Math.abs(g.state().player.x - x - (975 + 150) / 5 * 0.05) < 1e-9);
  const e = enemy(g);
  offer(g, 'stat:criticalChance');
  g.run("Math.random = () => 0; survivalDamageEnemy(survivalState.enemies[0], 10, '#fff')");
  assert.equal(e.hp, 80);
});

test('all 24 Codex keys, units and caps are reused; measured DPS is not an upgrade', () => {
  const g = game();
  const defs = g.run('SURVIVAL_STAT_DEFS');
  const modalDefs = g.run('[...STAT_DEFS,...ADD_STAT_DEFS,...EXTRA_STAT_DEFS]');
  assert.equal(Object.keys(defs).length, 24);
  for (const def of modalDefs) {
    assert.equal(defs[def.key].cap, def.max);
    assert.equal(defs[def.key].name, def.label);
  }
  assert.ok(!g.run('survivalUpgradePool()').some(c => c.key === 'stat:sps'));
});

test('all 138 repository cards can start and simulate; forms and raw data are preserved', () => {
  const g = game();
  const cards = fs.readdirSync(path.join(__dirname,'../rarity')).flatMap(name => JSON.parse(fs.readFileSync(path.join(__dirname,'../rarity',name),'utf8')));
  assert.equal(cards.length, 138);
  const snapshot = JSON.stringify(cards);
  g.context.cards = cards;
  g.run('for (const card of cards) SURVIVAL_CHARACTERS[card.id] = survivalCardConfig(card)');
  assert.equal(g.run('Object.keys(SURVIVAL_CHARACTERS).length'), 138);
  for (const card of cards) {
    g.context.characterId = card.id;
    g.run('startSurvivalRun(characterId); for(let i=0;i<5;i++) survivalUpdate(0.05)');
    const st = g.state();
    for (const [id, value] of Object.entries(st.stats)) {
      assert.ok(Number.isFinite(value) && value >= 0 && value <= g.run('SURVIVAL_STAT_DEFS')[id].cap, `${card.id}: ${id}`);
    }
    assert.equal(st.weapons.length, 1);
    assert.ok(st.passives.length <= 1);
    assert.equal(st.player.hp, st.stats.health);
    assert.ok(st.player.shield <= st.stats.shield);
  }
  assert.equal(g.run('SURVIVAL_CHARACTERS.ase.stats.health'), 140);
  assert.equal(g.run('SURVIVAL_CHARACTERS.soldier.stats.shield'), 120);
  assert.equal(JSON.stringify(cards), snapshot);
});

test('shield absorbs damage before health with correct overflow and depletion efficiency', () => {
  const g = game();
  g.run('survivalState.stats.shield = 10; survivalState.player.shield = 10; survivalState.stats.shieldtakendamage = 100; survivalTakeDamage({damage:8})');
  assert.equal(g.state().player.shield, 2); assert.equal(g.state().player.hp, 100);
  g.run('survivalState.player.contactCd = 0; survivalTakeDamage({damage:8})');
  assert.equal(g.state().player.shield, 0); assert.equal(g.state().player.hp, 94);
  g.run('survivalState.player.contactCd = 0; survivalState.player.shield = 10; survivalState.stats.shieldtakendamage = 50; survivalTakeDamage({damage:8})');
  assert.equal(g.state().player.shield, 6); assert.equal(g.state().player.hp, 94);
});

test('fortification waits 3 seconds, healing bonus scales recovery and respects caps', () => {
  const g = game(); quiet(g);
  g.run('survivalState.stats.shield = 10; survivalState.stats.shieldrecovery = 2; survivalState.stats.healrecovery = 1; survivalState.stats.healBonus = 100; survivalState.player.hp = 50; survivalState.player.lastDamage = 0; survivalUpdate(0.05)');
  assert.equal(g.state().player.shield, 0); assert.equal(g.state().player.hp, 50.1);
  g.run('survivalState.elapsed = 3; survivalUpdate(0.05)');
  assert.equal(g.state().player.shield, 0.1);
  g.run('survivalHeal(1e6); survivalRestoreShield(1e6)');
  assert.equal(g.state().player.hp, 100); assert.equal(g.state().player.shield, 10);
});

test('lifesteal heals only actual health damage, including critical and healing bonuses', () => {
  const g = game(); const e = enemy(g, 'hp: 2, shield: 6');
  g.run("survivalState.player.hp = 50; survivalState.stats.lifestealChance = 100; survivalState.stats.healBonus = 100; survivalDamageEnemy(survivalState.enemies[0], 10, '#fff')");
  assert.equal(e.hp, 0); assert.equal(e.shield, 0);
  assert.equal(g.state().player.hp, 51); // 2 HP damage * 25% * 2 healing
  assert.equal(g.state().stats.sps, 8); // actual shield + health damage, no overkill
});

test('DPS includes all damage, never exceeds 500, and resets after a rolling second', () => {
  const g = game(); const e = enemy(g, 'hp: 10000, maxHp: 10000'); quiet(g);
  g.run("survivalDamageEnemy(survivalState.enemies[0], 900, '#fff', false)");
  assert.equal(e.hp, 9500); assert.equal(g.state().stats.sps, 500);
  g.run("survivalDamageEnemy(survivalState.enemies[0], 50, '#fff', false)");
  assert.equal(e.hp, 9500);
  for (let i = 0; i < 20; i++) g.run('survivalUpdate(0.05)');
  assert.equal(g.state().stats.sps, 0);
  g.run("survivalDamageEnemy(survivalState.enemies[0], 20, '#fff', false)");
  assert.equal(e.hp, 9480); assert.equal(g.state().stats.sps, 20);
});

test('range and vision govern real target acquisition; count adds projectiles and orbitals', () => {
  const g = game(); enemy(g, 'x: 780');
  g.run('survivalState.stats.range = 2000; survivalShoot(survivalState.weapons[0])');
  assert.equal(g.state().bullets.length, 0);
  g.run('survivalState.stats.range = 6000; survivalState.stats.vision = 1000; survivalShoot(survivalState.weapons[0])');
  assert.equal(g.state().bullets.length, 0);
  g.run('survivalState.stats.vision = 8000; survivalState.stats.number = 3; survivalShoot(survivalState.weapons[0])');
  assert.equal(g.state().bullets.length, 3);
  assert.equal(g.run('survivalOrbitPositions(survivalCreateWeapon("orbit")).length'), 4);
});

test('dodge, critical resistance, damage reduction and flexibility mitigate enemy attacks', () => {
  const g = game();
  g.run('survivalState.stats.criticdamageminimiser = 90; survivalState.stats.damageminimiser = 90; survivalTakeDamage({damage:8,criticalChance:100,criticDamage:2})');
  assert.ok(Math.abs(g.state().player.hp - 99.12) < 1e-9);
  g.run('survivalState.player.contactCd = 0; survivalState.stats.dodge = 70; Math.random = () => 0; survivalTakeDamage({damage:100})');
  assert.ok(Math.abs(g.state().player.hp - 99.12) < 1e-9);
  g.run('survivalState.player.contactCd = 0; survivalState.stats.dodge = 0; survivalState.stats.flexibility = 80; survivalTakeDamage({damage:1,chill:true})');
  assert.ok(Math.abs(g.state().player.slowTime - 0.4) < 1e-9);
});

test('mana ability spends mana, uses life duration, respects pause and regenerates', () => {
  const g = game(); quiet(g);
  g.run('survivalState.stats.mana = 6; survivalState.player.mana = 6; survivalState.stats.life = 15; survivalCastMana()');
  assert.equal(g.state().player.mana, 3); assert.equal(g.state().manaBuff, 15);
  g.run('survivalCastMana()'); assert.equal(g.state().player.mana, 3); // cooldown
  g.run('survivalTogglePause(); survivalUpdate(0.05); survivalCastMana()');
  assert.equal(g.state().manaBuff, 15); assert.equal(g.state().player.mana, 3);
  g.run('survivalTogglePause(); survivalUpdate(0.05)');
  assert.equal(g.state().manaBuff, 14.95); assert.equal(g.state().player.mana, 3.025);
});

test('delay is a real wind-up, improves downward, and haste cannot exceed +90%', () => {
  const g = game(); enemy(g);
  g.run('survivalState.stats.delay = 200; survivalUpdate(0.05)');
  assert.equal(g.state().bullets.length, 0);
  g.run('survivalUpdate(0.05); survivalUpdate(0.05); survivalUpdate(0.05)');
  assert.ok(g.state().bullets.length > 0);
  offer(g,'stat:delay'); assert.equal(g.state().stats.delay, 180);
  g.run("survivalState.haste = 85; survivalAddPassive('neon-droid'); survivalState.neonTime = 3");
  assert.equal(g.run('survivalHaste()'), 90);
});

test('Stormblade splash does not recursively trigger other hits or steal life', () => {
  const g = game(); enemy(g); offer(g,'passive:stormblade');
  g.run("survivalState.enemies.push({x:600,y:270,hp:100,maxHp:100,radius:16}); survivalDamageEnemy(survivalState.enemies[0],10,'#fff')");
  assert.equal(g.state().enemies[0].hp, 90);
  assert.equal(g.state().enemies[1].hp, 98);
});

test('Frostshot freezes, Artist curses, and Neon Droid grants temporary haste', () => {
  const g = game(); const e = enemy(g);
  offer(g,'passive:frostshot'); offer(g,'passive:artist'); offer(g,'passive:neon-droid');
  g.run("Math.random = () => 0; for(let i=0;i<4;i++) survivalDamageEnemy(survivalState.enemies[0],10,'#fff')");
  assert.equal(e.stunTime, 0.5); assert.equal(e.curseTime, 3);
  assert.equal(g.state().neonTime, 3); assert.equal(g.run('survivalHaste()'), 10);
  g.run("survivalDamageEnemy(survivalState.enemies[0],10,'#fff')");
  assert.equal(e.hp, 49);
});

test('Collector and Blesser restore resources on kills; passive grants obey shield cap', () => {
  const g = game(); quiet(g); offer(g,'passive:collector'); offer(g,'passive:blesser');
  assert.equal(g.state().stats.shield, 20);
  g.run('survivalState.player.mana = 0; survivalState.player.shield = 0');
  enemy(g,'hp:0'); g.run('survivalUpdate(0.05)');
  assert.equal(g.state().player.shield, 2);
  assert.ok(Math.abs(g.state().player.mana - 0.325) < 1e-9);
  g.run("survivalState.stats.shield = 990; survivalAddPassive('blesser')");
  assert.equal(g.state().stats.shield, 1000);
});

test('Demotron and Ali activate on timers; Untouch has a cooldown', () => {
  const g = game(); quiet(g);
  offer(g,'passive:demotron'); offer(g,'passive:ali'); offer(g,'passive:untouch');
  g.run('survivalState.player.hp = 50; survivalState.passiveTimers.demotron = 0; survivalState.passiveTimers.ali = 0; survivalUpdate(0.05)');
  assert.equal(g.state().player.hp, 54);
  assert.ok(g.state().player.contactCd > 1000);
  g.run('survivalState.player.hp = 20; survivalState.player.contactCd = 0; survivalTakeDamage({damage:1})');
  assert.equal(g.state().player.contactCd, 2000);
  assert.equal(g.state().passiveTimers.untouch, 20);
  g.run('survivalState.player.contactCd = 0; survivalTakeDamage({damage:1})');
  assert.equal(g.state().player.contactCd, 600);
});

test('Snaykies pierces shields, Azrith uses shields, Lyra uses missing health, Reacher reduces damage', () => {
  const g = game(); const e = enemy(g,'shield:100'); offer(g,'passive:snaykies');
  g.run("survivalDamageEnemy(survivalState.enemies[0],10,'#fff')");
  assert.equal(e.shield, 92); assert.equal(e.hp, 98);
  offer(g,'passive:azrith'); offer(g,'passive:lyra'); offer(g,'passive:reacher');
  g.run("survivalState.player.shield = 10; survivalState.player.hp = 50; survivalDamageEnemy(survivalState.enemies[0],10,'#fff')");
  assert.ok(e.hp < 98 - 2);
  g.run('survivalState.player.shield = 0; survivalTakeDamage({damage:10})');
  assert.equal(g.state().player.hp, 40.3);
});

test('Skyhunter increases damage with distance and respects the maximum distance bonus', () => {
  const g = game(); offer(g,'passive:skyhunter'); const e = enemy(g,'x: 980, hp:1000, maxHp:1000');
  g.run("survivalDamageEnemy(survivalState.enemies[0],10,'#fff')");
  assert.ok(Math.abs(e.hp - 989.2) < 1e-9);
  e.x = 1480;
  g.run("survivalDamageEnemy(survivalState.enemies[0],10,'#fff')");
  assert.ok(Math.abs(e.hp - 978.4) < 1e-9);
});
