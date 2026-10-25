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
    Object.assign(cfg.stats, {health:hp, shield:0, damage, speed, range, attackSpeed:interval, criticalChance:0, criticDamage:2, number:1});
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
  g.run('survivalState.stats.vision = 8000; survivalState.stats.number = 3; survivalShoot(survivalCreateWeapon("wand"))');
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

test('Frostshot slows, Artist curses, and Neon Droid grants temporary haste', () => {
  const g = game(); const e = enemy(g);
  offer(g,'passive:frostshot'); offer(g,'passive:artist'); offer(g,'passive:neon-droid');
  g.run("Math.random = () => 0; for(let i=0;i<4;i++) survivalDamageEnemy(survivalState.enemies[0],10,'#fff')");
  assert.equal(e.slowTime, 3); assert.equal(e.slowAmount, 0.4); assert.equal(e.curseTime, 3);
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
  assert.equal(e.shield, 100); assert.equal(e.hp, 90);
  offer(g,'passive:azrith'); offer(g,'passive:lyra'); offer(g,'passive:reacher');
  g.run("survivalState.player.shield = 10; survivalState.player.hp = 50; survivalDamageEnemy(survivalState.enemies[0],10,'#fff')");
  assert.ok(e.hp < 90 - 10);
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

function equipmentGame(id) {
  const g = game();
  const card = fs.readdirSync(path.join(__dirname,'../rarity')).flatMap(name => JSON.parse(fs.readFileSync(path.join(__dirname,'../rarity',name),'utf8'))).find(c => c.id === id);
  assert.ok(card, `Card ${id} must exist`);
  g.context.card = card;
  g.run('SURVIVAL_CHARACTERS[card.id] = survivalCardConfig(card); startSurvivalRun(card.id); survivalState.stats.criticalChance = 0; Math.random=()=>0.99; survivalState.spawnCd = 1e9');
  return g;
}

test('all 19 requested cards receive the exact named melee loadout and base stats', () => {
  const groups = {
    sword: ['king','mimic','blesser','xii-josh','bio-mech','stormblade','azrith','fallen-angel','ali','slasherx'],
    dualSwords: ['nightprowler','malvaris'], scythe: ['hailey','shadow-reaper','bloodraider'],
    spear: ['wong','void-striker','tribe','lumina'],
  };
  const damage = {sword:12, dualSwords:6, scythe:28, spear:20};
  const intervals = {sword:1.25, dualSwords:0.5, scythe:2, spear:1.75};
  for (const [weapon, ids] of Object.entries(groups)) for (const id of ids) {
    const g = equipmentGame(id);
    assert.equal(g.state().weapons[0].id, weapon, id);
    assert.equal(g.state().stats.damage, damage[weapon], id);
    assert.equal(g.state().stats.attackSpeed, intervals[weapon], id);
    assert.equal(g.state().stats.delay, 0);
    assert.equal(g.run('survivalWeaponInterval(survivalState.weapons[0])'), intervals[weapon] * 1000);
    assert.equal(g.state().weapons.length, 1);
  }
});

test('unnamed cards receive melee or ranged equipment by range rather than class', () => {
  const g = game();
  g.context.examples = [
    {id:'short-mage',name:'Short mage',class:'Mage',additionalStats:{range:1000}},
    {id:'long-fighter',name:'Long fighter',class:'Fighter',additionalStats:{range:4000}},
    {id:'threshold',name:'Threshold',class:'Support',additionalStats:{range:1500}},
    {id:'ranged-mage',name:'Ranged mage',class:'Mage',additionalStats:{range:1501}},
  ];
  assert.deepEqual(Array.from(g.run('examples.map(c => survivalCardConfig(c).weapon)')), ['axe','rifle','axe','wand']);
});

test('rifle fires exactly three bullets at the same point despite target death or a nearer enemy', () => {
  const g = equipmentGame('soldier');
  g.run(`survivalState.stats.delay=0; survivalState.enemies=[
    {x:780,y:270,hp:100,maxHp:100,radius:16}, {x:480,y:600,hp:100,maxHp:100,radius:16}]; survivalUpdate(0)`);
  assert.equal(g.state().bullets.length, 1);
  const w = g.state().weapons[0];
  assert.equal(w.aim.x, 780); assert.equal(w.aim.y, 270);
  g.run('survivalState.enemies[0].hp=0; survivalState.enemies[1].x=500; survivalState.enemies[1].y=330');
  for (let i=0;i<7;i++) g.run('survivalUpdate(0.05)');
  assert.equal(g.state().bullets.length, 3);
  assert.equal(w.shotsLeft, 0);
  for (const bullet of g.state().bullets) { assert.equal(bullet.vx, 560); assert.equal(bullet.vy, 0); }
  g.run('survivalAttack(survivalState.weapons[0])');
  assert.notEqual(w.aim.x, 780); // next volley may choose a new enemy
});

test('rifle Count upgrades extend the same volley, not multi-target projectile fans', () => {
  const g = equipmentGame('soldier'); enemy(g);
  offer(g,'stat:number');
  g.run('survivalAttack(survivalState.weapons[0]); survivalShoot(survivalState.weapons[0])');
  assert.equal(g.state().weapons[0].shotsLeft, 4);
  assert.equal(g.state().bullets.length, 1);
});

test('sword hits every enemy inside its 135 degree sector and excludes rear/out-of-range targets', () => {
  const g = equipmentGame('king');
  g.run(`survivalState.enemies=[0,60,67.5,70,90,180].map(deg=>({x:480+100*Math.cos(deg*Math.PI/180),y:270+100*Math.sin(deg*Math.PI/180),hp:100,maxHp:100,radius:0}));
    survivalState.enemies.push({x:631,y:270,hp:100,maxHp:100,radius:0});
    survivalMeleeHit(survivalState.weapons[0],0)`);
  assert.deepEqual(Array.from(g.state().enemies, e=>e.hp), [88,88,88,100,100,100,100]);
});

test('sector collision wraps angles and includes enemy bodies crossing the edge', () => {
  const g = equipmentGame('king');
  assert.equal(g.run('survivalInSweep({x:380,y:270,radius:0},{x:480,y:270},-Math.PI,135,150)'),true);
  assert.equal(g.run('survivalInSweep({x:480+100*Math.cos(70*Math.PI/180),y:270+100*Math.sin(70*Math.PI/180),radius:8},{x:480,y:270},0,135,150)'),true);
  assert.equal(g.run('survivalInSweep({x:632,y:270,radius:4},{x:480,y:270},0,135,150)'),true);
});

test('dual swords hit twice in a 90 degree sector at 0.50s, then recover for 0.75s', () => {
  const g = equipmentGame('nightprowler'); const e = enemy(g,'hp:1000,maxHp:1000,radius:0');
  g.run('survivalUpdate(0)'); assert.equal(e.hp,994);
  for(let i=0;i<9;i++)g.run('survivalUpdate(0.05)');
  assert.equal(e.hp,994);
  g.run('survivalUpdate(0.05)'); assert.equal(e.hp,988);
  for(let i=0;i<14;i++)g.run('survivalUpdate(0.05)');
  assert.equal(e.hp,988);
  g.run('survivalUpdate(0.05)'); assert.equal(e.hp,982);
  assert.equal(g.run('SURVIVAL_WEAPONS.dualSwords.recovery'),750);
});

test('dual sword second swing stays aimed, pauses, and haste speeds up the whole combo', () => {
  const g = equipmentGame('malvaris'); const e=enemy(g,'hp:1000,maxHp:1000');
  g.run('survivalUpdate(0); survivalState.paused=true');
  const time=g.state().weapons[0].combo.timer;
  g.run('survivalUpdate(0.05)'); assert.equal(g.state().weapons[0].combo.timer,time);
  g.run('survivalState.paused=false; survivalState.enemies[0].x=380');
  for(let i=0;i<10;i++)g.run('survivalUpdate(0.05)');
  assert.equal(e.hp,994); // enemy left the locked 90-degree sector
  const faster=equipmentGame('nightprowler'); const target=enemy(faster,'hp:1000,maxHp:1000');
  faster.run('survivalState.haste=90; survivalUpdate(0)');
  for(let i=0;i<5;i++)faster.run('survivalUpdate(0.05)');
  assert.equal(target.hp,994);
  faster.run('survivalUpdate(0.05)'); assert.equal(target.hp,988);
  assert.ok(Math.abs(faster.run('survivalWeaponCycleInterval(survivalState.weapons[0])')-1250/1.9)<1e-9);
});

test('scythe deals 28 damage all around the player while spear hits a longer narrow line', () => {
  const scythe=equipmentGame('hailey');
  scythe.run(`survivalState.enemies=[0,90,180,270].map(deg=>({x:480+120*Math.cos(deg*Math.PI/180),y:270+120*Math.sin(deg*Math.PI/180),hp:100,maxHp:100,radius:0}));survivalMeleeHit(survivalState.weapons[0],0)`);
  assert.deepEqual(Array.from(scythe.state().enemies,e=>e.hp),[72,72,72,72]);
  const spear=equipmentGame('wong');
  spear.run(`survivalState.enemies=[{x:580,y:270},{x:700,y:270},{x:700,y:300},{x:400,y:270},{x:750,y:270}].map(e=>({...e,hp:100,maxHp:100,radius:0}));survivalMeleeHit(survivalState.weapons[0],0)`);
  assert.deepEqual(Array.from(spear.state().enemies,e=>e.hp),[80,80,100,100,100]);
  assert.ok(spear.run('survivalWeaponRange(survivalState.weapons[0])')>scythe.run('SURVIVAL_WEAPONS.sword.range'));
});

test('new melee weapons work with passives and respect the four weapon slots', () => {
  const g=equipmentGame('king'); enemy(g); offer(g,'passive:venomora');
  g.run('survivalAttack(survivalState.weapons[0])'); assert.equal(g.state().enemies[0].slowTime,2);
  for(const id of ['dualSwords','scythe','spear'])offer(g,`weapon:${id}`);
  assert.equal(g.state().weapons.length,4);
  assert.ok(!g.run('survivalUpgradePool()').some(c=>c.key==='weapon:rifle'));
  assert.ok(g.run('survivalUpgradePool()').some(c=>c.key==='weapon:sword'));
});

function traitGame(...ids) {
  const g=game();quiet(g);
  g.run('Math.random=()=>0.99; survivalState.player.contactCd=1e9');
  for(const id of ids)g.run(`survivalAddPassive('${id}')`);
  return g;
}
function advance(g,seconds) {for(let t=0;t<seconds-1e-9;t+=0.05)g.run(`survivalUpdate(${Math.min(0.05,seconds-t)})`);}
function hit(g,amount=10) {return g.run(`survivalDamageEnemy(survivalState.enemies[0],${amount},'#fff')`);}

test('new eleven equipment assignments use exact hammer, bow and light axe stats',()=>{
  for(const [weapon,ids,damage,interval] of [
    ['hammer',['lord','trac','earthshakers','warborn'],90,3],
    ['bow',['hunter','js','skyhunter','fire-archer','nyra'],8,0.8],
    ['lightAxe',['hell-boy','collector'],6,0.75],
  ])for(const id of ids){const g=equipmentGame(id);assert.equal(g.state().weapons[0].id,weapon,id);assert.equal(g.state().stats.damage,damage);assert.equal(g.state().stats.attackSpeed,interval);}
});

test('hammer hits a true 40x40 target area, light axe hits only one, bow shoots long range arrows',()=>{
  const hammer=equipmentGame('lord');
  hammer.run(`survivalState.enemies=[{x:570,y:270},{x:589,y:289},{x:591,y:291},{x:620,y:270}].map(e=>({...e,hp:200,maxHp:200,radius:0}));survivalAttack(survivalState.weapons[0])`);
  assert.deepEqual(Array.from(hammer.state().enemies,e=>e.hp),[110,110,200,200]);
  const axe=equipmentGame('collector');axe.run('survivalState.stats.number=15;survivalState.enemies=[570,580].map(x=>({x,y:270,hp:100,maxHp:100,radius:0}));survivalAttack(survivalState.weapons[0])');
  assert.deepEqual(Array.from(axe.state().enemies,e=>e.hp),[94,100]);
  const bow=equipmentGame('hunter');enemy(bow,'x:900');bow.run('survivalAttack(survivalState.weapons[0])');
  assert.equal(bow.state().bullets.length,1);assert.equal(bow.state().bullets[0].arrow,true);assert.equal(bow.state().bullets[0].speed,700);
});

test('all 91 passives initialize and survive event/timer simulation without NaN or slot leaks',()=>{
  const g=game();const ids=Array.from(g.run('Object.keys(SURVIVAL_PASSIVES)'));assert.equal(ids.length,91);
  for(const id of ids){
    g.run(`startSurvivalRun('soldier');Math.random=()=>0.99;survivalState.player.contactCd=1e9;survivalState.spawnCd=1e9;survivalAddPassive('${id}');survivalState.enemies=[{x:700,y:270,hp:10000,maxHp:10000,radius:16,shield:100,charge:100}];survivalState.player.hp=70`);
    for(let i=0;i<10;i++)g.run('survivalDamageEnemy(survivalState.enemies[0],1,"#fff");survivalUpdate(0.05)');
    advance(g,2);
    const st=g.state();assert.ok(Number.isFinite(st.player.hp),id);assert.ok(Number.isFinite(st.stats.sps)&&st.stats.sps<=500,id);
    assert.ok(st.companions.length<=12,id);assert.equal(st.passives.length,1,id);
    for(const e of st.enemies)assert.ok(Number.isFinite(e.hp),id);
  }
});

test('single-rank rules disappear after acquisition and four passive slots remain enforced',()=>{
  const g=traitGame('fen','ben','freak','nightprowler');
  assert.equal(g.state().passives.length,4);
  assert.ok(!g.run('survivalUpgradePool()').some(c=>c.type==='passive'));
  g.run('survivalAddPassive("bees");survivalAddPassive("fen")');
  assert.equal(g.state().passives.length,4);assert.equal(g.state().passives[0].level,1);
});

test('Fen blindness lasts 7s and suppresses ranged fire; RogueX uses its 50% proc',()=>{
  const g=traitGame('fen');const e=enemy(g,'ranged:true,shotCd:0');hit(g);assert.equal(e.blindTime,7);
  g.run('survivalEnemyAbility(survivalState.enemies[0],0.1,survivalState.player)');assert.equal(g.state().enemyBullets.length,0);
  advance(g,7);assert.ok(e.blindTime<1e-8);
  g.run('survivalState.enemyBullets=[];survivalState.enemies[0].shotCd=0;survivalEnemyAbility(survivalState.enemies[0],0.1,survivalState.player)');assert.equal(g.state().enemyBullets.length,1);
  const rogue=traitGame('roguex');const target=enemy(rogue);rogue.run('Math.random=()=>0.1');hit(rogue);assert.equal(target.blindTime,7);
});

test('Ben applies bleeding only every fourth wound, deals 8 total damage, then expires',()=>{
  const g=traitGame('ben');const e=enemy(g,'x:900');
  for(let i=0;i<3;i++)hit(g,1);assert.equal(e.dots,undefined);hit(g,1);
  assert.equal(e.dots.bleed.time,2);advance(g,2.2);assert.ok(Math.abs(e.hp-88)<1e-8);assert.equal(e.dots.bleed.time,0);
});

test('Freak rescues one fatal hit as two mini forms; mini death explodes for 50',()=>{
  const g=traitGame('freak');const e=enemy(g,'hp:1000,maxHp:1000');
  g.run('survivalState.player.contactCd=0;survivalState.player.hp=1;survivalTakeDamage(survivalState.enemies[0])');
  assert.equal(g.state().traits.phase,'mini');assert.equal(g.state().player.hp,50);assert.equal(g.state().companions.length,1);
  g.run('survivalState.companions[0].x=580;survivalState.companions[0].y=270;survivalKillCompanion(survivalState.companions[0])');assert.equal(e.hp,950);
  g.run('survivalState.player.contactCd=0;survivalState.player.hp=1;survivalTakeDamage(survivalState.enemies[0])');assert.equal(g.state().player.hp,0);
});

test('Twins transfers control or buffs survivor once; turtle companion death doubles damage',()=>{
  const g=traitGame('twins');
  g.run('survivalKillCompanion(survivalState.companions[0])');assert.equal(g.state().stats.health,300);assert.equal(g.state().stats.damage,10);
  g.run('survivalKillCompanion(survivalState.companions[0])');assert.equal(g.state().stats.health,300);
  const transfer=traitGame('twins');enemy(transfer);transfer.run('survivalState.player.contactCd=0;survivalState.player.hp=1;survivalTakeDamage(survivalState.enemies[0])');
  assert.equal(transfer.state().player.hp,300);assert.equal(transfer.state().stats.damage,10);
  const turtle=traitGame('turtle-kin');turtle.run('survivalKillCompanion(survivalState.companions[0])');assert.equal(turtle.state().stats.damage,10);
});

test('Nightprowler hides after idle, breaks concealment on hit and weakens the target',()=>{
  const g=traitGame('nightprowler');const e=enemy(g,'x:900');advance(g,2);
  assert.equal(g.run('survivalIsHidden()'),true);assert.equal(g.run('survivalEnemyTarget(survivalState.enemies[0])'),null);
  hit(g);assert.equal(g.run('survivalIsHidden()'),false);assert.ok(e.unluckyUntil>g.state().elapsed);
  g.run('survivalState.player.contactCd=0;survivalTakeDamage(survivalState.enemies[0])');assert.equal(g.state().player.hp,94);
});

test('Bethe kill crit stacks and Nurse lifesteal stacks expire separately',()=>{
  const g=traitGame('bethe','nurse');
  g.run('survivalTraitsOnKill({});survivalTraitLifesteal()');assert.equal(g.run('survivalTraitCrit()'),5);assert.equal(g.run('survivalTraitBaseDamage(null)'),7);
  advance(g,5);g.run('survivalTraitsOnKill({})');assert.equal(g.run('survivalTraitCrit()'),10);
  advance(g,5.1);assert.equal(g.run('survivalTraitCrit()'),5);assert.equal(g.run('survivalTraitBaseDamage(null)'),5);
});

test('Soldier/Hornets distinguish flying and animal targets; shield bonus uses actual damage budget',()=>{
  const soldier=traitGame('soldier');const e=enemy(soldier,'flying:true');hit(soldier);assert.ok(Math.abs(e.hp-86.7)<1e-8);
  const hornets=traitGame('hornets');hornets.run('survivalState.player.contactCd=0;survivalTakeDamage({hp:100,damage:8,flying:true})');assert.equal(hornets.state().player.hp,96);
  hornets.run('survivalState.player.contactCd=0;survivalTakeDamage({hp:100,damage:8,species:"Animal"})');assert.equal(hornets.state().player.hp,90);
  const shield=traitGame('phewphew');const target=enemy(shield,'shield:20');hit(shield);assert.equal(target.shield,0);assert.equal(target.hp,100);assert.equal(shield.state().stats.sps,20);
});

test('Angels spawn every 0.4s with a six-unit cap and deaths strengthen survivors',()=>{
  const g=traitGame('angels');advance(g,2.4);assert.equal(g.state().companions.length,6);
  g.run('survivalKillCompanion(survivalState.companions[0])');assert.equal(g.state().companions[1].damage,4);
  advance(g,10);assert.ok(g.state().companions.length<=6);
});

test('Bees sacrifice the drone, not the player; Chicken and Mini Freak death bursts are real',()=>{
  const g=traitGame('bees');const e=enemy(g,'hp:1000,maxHp:1000');
  g.run('const bee=survivalSummon("Bee",{kind:"bee",hp:1});bee.x=580;bee.y=270;survivalTickCompanions(0.05)');
  assert.equal(g.state().companions.length,0);assert.equal(g.state().player.hp,100);assert.equal(e.dots.bee.dps,8);
  const chicken=traitGame('chicken');const foe=enemy(chicken,'hp:1000,maxHp:1000');chicken.run('Math.random=()=>0.1;const bird=survivalSummon("Chicken",{kind:"chicken"});bird.x=580;bird.y=270;survivalKillCompanion(bird)');assert.equal(foe.hp,900);
});

test('Chrono Mage and Fire Archer count attacks, not individual target hits, and cap haste',()=>{
  const g=traitGame('chrono-mage','fire-archer');enemy(g);
  g.run('for(let i=0;i<5;i++)survivalAttack(survivalCreateWeapon("rifle"))');
  assert.equal(g.state().traits.chronoUntil,5);assert.equal(g.state().enemies[0].slowAmount,0.25);
  assert.equal(g.run('survivalHaste()'),90);advance(g,5.1);assert.equal(g.run('survivalHaste()'),0);
});

test('Ironjaw and Leafshade lifesteal growth caps at +25%; M-Manager restores mana on a 9s timer',()=>{
  const g=traitGame('ironjaw','leafshade','m-manager');enemy(g,'hp:10000,maxHp:10000,x:900');
  for(let i=0;i<60;i++)hit(g,0.1);assert.equal(g.run('survivalTraitLifestealChance()'),25);
  g.run('survivalState.player.mana=0;survivalTraitMemory("m-manager").clock=8.95');advance(g,0.05);assert.ok(Math.abs(g.state().player.mana-1.025)<1e-8);
  g.run('survivalTraitMemory("leafshade").clock=6.95');advance(g,0.05);assert.equal(g.run('survivalTraitLifestealChance()'),26);
});

test('Srail counts only front enemies and global critical chance never exceeds 100',()=>{
  const g=traitGame('srail');g.run('survivalState.enemies=[{x:580,y:270,hp:100,radius:0},{x:380,y:270,hp:100,radius:0}]');assert.equal(g.run('survivalTraitCrit()'),8);
  g.run('survivalState.stats.criticalChance=95');assert.equal(g.run('survivalTraitCrit()'),100);
});

test('Cryon and last stand trigger on low HP with cooldowns; executioner doubles low-target damage',()=>{
  const g=traitGame('cryon','last-stand');const e=enemy(g);g.run('survivalState.player.hp=19;survivalState.player.contactCd=0;survivalTakeDamage(survivalState.enemies[0])');assert.equal(e.stunTime,12);assert.equal(e.x,700);
  g.run('survivalState.player.contactCd=0;survivalTakeDamage(survivalState.enemies[0])');assert.equal(e.x,700);
  const execute=traitGame('executioner');const target=enemy(execute,'hp:40');hit(execute);assert.equal(target.hp,20);
});

test('Albert resets its same-target streak, Dino caps at +24 and Phoenix at 200 base damage',()=>{
  const g=traitGame('albert','dino');const e=enemy(g,'hp:10000,maxHp:10000');for(let i=0;i<15;i++)hit(g,0.1);
  assert.equal(g.run('survivalTraitMemory("dino").value'),24);assert.equal(g.run('survivalTraitBaseDamage(survivalState.enemies[0])'),32);
  assert.equal(g.run('survivalTraitBaseDamage({})'),29);
  const phoenix=traitGame('phoenix');enemy(phoenix,'hp:100000,maxHp:100000,shield:1000');for(let i=0;i<210;i++)hit(phoenix,0.0001);
  assert.equal(phoenix.state().enemies[0].shield,1000);assert.equal(phoenix.run('survivalTraitBaseDamage(null)'),200);
});

test('Frostshot and X-Bot idle bonuses reset on real damage; Nyra gains travel-based shield pierce',()=>{
  const frost=traitGame('frostshot');const e=enemy(frost,'hp:1000,maxHp:1000');frost.run('survivalState.elapsed=18');hit(frost);assert.equal(e.hp,962.5);hit(frost);assert.equal(e.hp,952.5);
  const bot=traitGame('x-bot');enemy(bot);bot.run('survivalState.elapsed=4');assert.equal(hit(bot),11);
  const nyra=traitGame('nyra');const target=enemy(nyra,'shield:100');nyra.run('survivalTraitMoved(5000,1)');hit(nyra);assert.equal(target.shield,100);assert.equal(target.hp,80);
});

test('Warborn restores 20% missing shield; Turtle restores exactly 75 over three seconds',()=>{
  const g=traitGame('warborn');g.run('survivalState.stats.shield=100;survivalState.player.shield=0');advance(g,6);assert.equal(g.state().player.shield,20);
  const turtle=traitGame('turtle');turtle.run('survivalState.stats.shieldtakendamage=100;survivalState.player.contactCd=0;survivalTakeDamage({hp:100,damage:75})');assert.equal(turtle.state().player.shield,0);advance(turtle,3);assert.ok(Math.abs(turtle.state().player.shield-75)<1e-7);
});

test('Trac accumulates real damage; Feral Wolf opening boost and Deadscope next-cycle haste work',()=>{
  const trac=traitGame('trac');trac.run('survivalState.player.contactCd=0;survivalTakeDamage({hp:100,damage:48})');assert.equal(trac.run('survivalTraitMemory("trac").value'),1);assert.equal(trac.run('survivalHaste()'),1);
  const wolf=traitGame('feral-wolf','deadscope');assert.equal(wolf.run('survivalTraitSpeed()'),460);enemy(wolf);assert.equal(hit(wolf),13);
  wolf.run('survivalTraitsOnKill({})');assert.equal(wolf.run('survivalHaste()'),20);wolf.run('survivalTraitsFinishAttack()');assert.equal(wolf.run('survivalHaste()'),0);advance(wolf,16.1);assert.equal(wolf.run('survivalTraitSpeed()'),230);
});

test('Tenta hits four additional targets, Voltriker three, Hexon stuns on the fourth hit',()=>{
  const g=traitGame('tenta','voltriker','hexon');g.run('survivalState.enemies=[580,590,600,610,620].map(x=>({x,y:270,hp:1000,maxHp:1000,radius:16}))');
  for(let i=0;i<4;i++)hit(g,1);
  assert.equal(g.state().enemies[0].stunTime,0.6);assert.equal(g.state().enemies[4].slowTime,1);
  assert.ok(g.state().enemies[1].hp<g.state().enemies[4].hp);
});

test('Shadow Reaper forces the first crit and adds 15% max health after a kill',()=>{
  const g=traitGame('shadow-reaper');const e=enemy(g,'hp:1000,maxHp:1000');assert.equal(hit(g),20);g.run('survivalTraitsOnKill({})');assert.equal(hit(g),160);assert.equal(e.hp,820);
});

test('Mecha Shield, Cassandra and Arcanyx provide timed support and real area damage',()=>{
  const g=traitGame('mecha-shield','cassandra','arcanyx');const e=enemy(g,'hp:1000,maxHp:1000,x:580');
  hit(g,10);assert.equal(e.hp,984);g.run('survivalState.player.hp=50;survivalState.player.shield=0');advance(g,1);
  assert.ok(g.state().player.hp>54);assert.equal(g.state().stats.health,101);
  g.run('survivalTraitMemory("mecha-shield").clock=20.95');advance(g,0.05);assert.equal(g.state().player.shield,25);
});

test('Astranova explodes on the tenth attack and Kai uses damage-generated charges',()=>{
  const g=traitGame('astranova','kai');const e=enemy(g,'hp:1000,maxHp:1000');
  g.run('for(let i=0;i<10;i++)survivalAttack(survivalCreateWeapon("rifle"))');hit(g,10);assert.equal(e.hp,950);
  g.run('survivalState.player.contactCd=0;survivalTakeDamage({hp:100,damage:50})');assert.equal(g.run('survivalTraitMemory("kai").charge'),100);
  hit(g,10);assert.equal(g.run('survivalTraitMemory("kai").charge'),0);assert.ok(e.x>=700);
});

test('Charge siphon drains enemy meters and silences their active attacks',()=>{
  const g=traitGame('charge-siphon');g.run('survivalState.enemies=Array.from({length:10},()=>({x:900,y:500,hp:100,maxHp:100,radius:16,charge:100,ranged:true}));survivalTraitsTick(4.8)');
  assert.equal(g.state().enemies[0].charge,90);assert.equal(g.state().enemies[0].silenceTime,12);
  g.run('survivalEnemyAbility(survivalState.enemies[0],1,survivalState.player)');assert.equal(g.state().enemyBullets.length,0);
});

test('Jestro and Cratex silence and stun; Tornado holds and then knocks back',()=>{
  const g=traitGame('jestro','cratex','tornado');const e=enemy(g);g.run('Math.random=()=>0.01');hit(g);assert.equal(e.silenceTime,5);
  g.run('survivalPlaceTrap();survivalState.enemies[0].x=480;survivalTraitsTick(0.05)');assert.equal(e.stunTime,1.3);
  g.run('survivalTraitMemory("tornado").clock=5.95;survivalTraitsTick(0.05)');assert.equal(e.vortexTime,2);
  g.run('survivalState.enemies[0].x=580');advance(g,2);assert.ok(e.x>=650);
});

test('Tphoenix reflects enemy projectiles safely, becomes Egg, then Phoenix or restores base on break',()=>{
  const g=traitGame('tphoenix');const e=enemy(g,'hp:1000,maxHp:1000');
  g.run('survivalState.player.contactCd=0;survivalTakeDamage({damage:8,source:survivalState.enemies[0]})');assert.ok(Math.abs(e.hp-999.2)<1e-8);assert.ok(Number.isFinite(g.state().stats.sps));
  g.run('survivalState.player.contactCd=0;survivalState.player.hp=20;survivalTakeDamage(survivalState.enemies[0])');assert.equal(g.state().traits.phase,'egg');
  assert.equal(g.run('survivalTraitSpeed()'),0);g.run('survivalState.player.contactCd=1e9');advance(g,12);assert.equal(g.state().traits.phase,'phoenix');assert.equal(g.state().player.hp,100);
  const broken=traitGame('fire-egg');broken.run('survivalState.player.hp=0;survivalTraitRescue();survivalState.player.hp=0;survivalTraitRescue()');assert.equal(broken.state().traits.phase,'base');assert.equal(broken.state().player.hp,40);assert.equal(broken.state().traits.eggCooldown,30);
});

test('Corsair reflects actual hostile projectiles; Boomix returns a projectile for a second pass',()=>{
  const corsair=traitGame('corsair-crew');corsair.run('Math.random=()=>0;survivalState.enemyBullets=[{x:480,y:270,vx:100,vy:0,radius:5,life:6,damage:4}];survivalTickEnemyBullets(0)');assert.equal(corsair.state().enemyBullets.length,0);assert.equal(corsair.state().bullets[0].secondary,true);
  const boom=traitGame('boomix');enemy(boom,'x:900');boom.run('survivalShoot(survivalCreateWeapon("bow"))');assert.equal(boom.state().bullets[0].boomerang,true);
  boom.run('survivalState.bullets[0].remaining=1');advance(boom,0.05);assert.equal(boom.state().bullets[0].returning,true);assert.equal(boom.run('survivalTraitDefense({})'),0.8);
});

test('Lumina drains max health, Hell boy rages on fifth hit and SlasherX executes with shield chance',()=>{
  const g=traitGame('lumina','hell-boy');const e=enemy(g,'hp:1000,maxHp:1000');advance(g,0.25);assert.equal(e.hp,990);
  for(let i=0;i<5;i++)hit(g,0.1);assert.ok(g.run('survivalTraitMemory("hell-boy").until')>g.state().elapsed);const before=e.hp;hit(g,1);assert.ok(Math.abs(before-e.hp-51)<1e-7);
  const slash=traitGame('slasherx');const target=enemy(slash);slash.run('Math.random=()=>0;survivalState.player.shield=100');hit(slash,1);assert.equal(target.hp,0);
});

test('Sheriff marks only six, Tribe charges its empowered strike, and Earthshakers stuns every fourth attack',()=>{
  const g=traitGame('sheriff','tribe','earthshakers');g.run('survivalState.enemies=Array.from({length:7},(_,i)=>({x:550+i,y:270,hp:100+i,maxHp:110,radius:0}));survivalTraitMemory("tribe").charge=100;survivalState.traits.attackWeapon="spear"');
  assert.equal(g.run('survivalTraitBeforeHit(survivalState.enemies[0]).bonus'),2);
  assert.equal(g.run('survivalTraitBeforeHit(survivalState.enemies[6]).bonus'),2.25);
  hit(g,1);assert.equal(g.run('survivalTraitMemory("tribe").charge'),0);
  g.run('for(let i=0;i<4;i++)survivalAttack(survivalCreateWeapon("rifle"))');assert.equal(g.state().enemies[1].stunTime,1.5);assert.equal(g.state().enemies[1].slowAmount,0.3);
});

test('Whisper converts without awarding kill XP; Nightfang stealth renews on hit sixty',()=>{
  const g=traitGame('whisper','nightfang');const e=enemy(g,'hp:10000,maxHp:10000');assert.equal(g.run('survivalIsHidden()'),true);
  for(let i=0;i<60;i++)hit(g,0.01);assert.equal(g.state().traits.stealthUntil,3);
  g.run('survivalTraitMemory("whisper").clock=19.95;survivalTraitsTick(0.05)');assert.equal(g.state().enemies.length,0);assert.equal(g.state().kills,0);assert.equal(g.state().companions[0].kind,'controlled');
});

test('Sunrise and Tempo grow within caps; Shellbyte leaps after charging, Wong schedules eight hits, Sophie throws',()=>{
  const g=traitGame('sunrise','tempo','shellbyte','wong');enemy(g,'x:900,hp:1000,maxHp:1000');
  g.run('survivalTraitMoved(1,0.6)');assert.equal(g.state().stats.health,101);
  g.run('survivalTraitMemory("tempo").clock=5.95;survivalTraitsTick(0.05)');assert.equal(g.state().stats.speed,1175);assert.equal(g.run('survivalHaste()'),1);
  g.run('survivalTraitMemory("shellbyte").charge=100;survivalTraitsTick(0.05)');assert.equal(g.state().player.x,870);
  g.run('survivalState.player.hp=30;survivalState.player.contactCd=0;survivalTakeDamage(survivalState.enemies[0])');assert.equal(g.state().traits.pending.length,8);
  const sophie=traitGame('sophie');const e=enemy(sophie);sophie.run('Math.random=()=>0;survivalAttack(survivalCreateWeapon("rifle"))');assert.equal(e.stunTime,3);assert.equal(sophie.run('survivalHaste()'),40);
});

test('empty attack attempts do not advance shot counters or spend next-attack buffs',()=>{
  const g=traitGame('fire-archer','chrono-mage','deadscope');g.run('survivalTraitsOnKill({});const w=survivalCreateWeapon("rifle");for(let i=0;i<10;i++){survivalAttack(w);survivalTraitsFinishAttack(w)}');
  assert.equal(g.state().traits.attacks,0);assert.equal(g.run('survivalHaste()'),20);
});

test('combined rescue passives terminate correctly and reset for a new run',()=>{
  const g=traitGame('freak','twins','tphoenix','chicken');
  g.run('survivalState.player.hp=0;survivalTraitRescue()');assert.equal(g.state().traits.phase,'egg');
  g.run('survivalState.player.hp=0;survivalTraitRescue()');assert.equal(g.state().traits.phase,'base');
  g.run('survivalState.player.hp=0;survivalTraitRescue()');assert.equal(g.state().traits.phase,'mini');
  g.run('survivalState.player.hp=0;survivalTraitRescue()');assert.ok(g.state().player.hp>0);
  g.run('survivalState.player.hp=0');assert.equal(g.run('survivalTraitRescue()'),false);
  g.run('startSurvivalRun("soldier")');assert.equal(g.state().companions.length,0);assert.equal(g.state().traits.phase,'base');
});

test('new timers and projectiles freeze on pause; crowd and damage bookkeeping stay bounded',()=>{
  const g=traitGame('angels','tribe','nightfang','cassandra');advance(g,1);
  g.run('survivalState.enemyBullets=[{x:500,y:300,vx:50,vy:0,life:6,radius:4,damage:4}];survivalTogglePause()');
  const paused=g.run('JSON.stringify(survivalState)');advance(g,1);assert.equal(g.run('JSON.stringify(survivalState)'),paused);
  g.run('survivalTogglePause();for(let i=0;i<200;i++)survivalSpawnEnemy()');assert.equal(g.state().enemies.length,180);
  enemy(g,'hp:10000,maxHp:10000');for(let i=0;i<1000;i++)hit(g,0.001);
  assert.equal(g.state().damageLog.length,1);assert.ok(g.state().stats.sps<=500);
});

test('Aegis protects nearby allies and self, while combined reductions respect the 90% cap',()=>{
  const g=traitGame('aegis-guard','hornets');
  g.run('survivalState.player.contactCd=0;survivalTakeDamage({hp:100,damage:10})');assert.equal(g.state().player.hp,91.5);
  g.run('const ally=survivalSummon("Guarded",{hp:100});survivalHitCompanion(ally,{damage:10},1)');assert.equal(g.state().companions[0].hp,91.5);
  g.run('survivalState.player.contactCd=0;survivalState.stats.damageminimiser=90;survivalTakeDamage({hp:100,damage:10,flying:true})');assert.equal(g.state().player.hp,90.5);
});

test('Pirate Girls distance scaling caps at 75%; Ship Cannoneer haste scales with lost shield',()=>{
  const g=traitGame('pirate-girls','ship-cannoneer');const e=enemy(g,'x:1480,hp:1000,maxHp:1000');assert.equal(hit(g),17.5);
  e.x=2480;assert.equal(hit(g),17.5);
  g.run('survivalState.stats.shield=1000;survivalState.player.shield=0');assert.equal(g.run('survivalHaste()'),90);
});

test('a returning Boomix arrow can damage the same enemy once on each pass and then despawns',()=>{
  const g=traitGame('boomix');const e=enemy(g,'x:780,hp:1000,maxHp:1000');g.run('survivalShoot(survivalCreateWeapon("bow"))');
  advance(g,3);assert.equal(e.hp,984);assert.equal(g.state().bullets.length,0);
});

test('public HTML loads a complete Survival runtime without a separate passive script',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const scripts=Array.from(html.matchAll(/<script\s+src="([^"]+)"/g),m=>m[1]).filter(src=>src.includes('/survival'));
  assert.ok(scripts.length>0);
  const context=vm.createContext({window:{matchMedia:()=>({matches:false})}});
  vm.runInContext(schema,context);
  for(const src of scripts){
    const pathname=new URL(src,'http://localhost/').pathname.slice(1);
    vm.runInContext(fs.readFileSync(path.join(__dirname,'..',pathname),'utf8'),context,{filename:pathname});
  }
  assert.equal(vm.runInContext('typeof survivalTraitsInit',context),'function');
  assert.equal(vm.runInContext('Object.keys(survivalTraitsInit().memory).length',context),0);
  assert.equal(vm.runInContext('Object.keys(SURVIVAL_PASSIVES).length',context),91);
});
