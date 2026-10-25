const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
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
    performance: { now: () => 0 }, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  });
  vm.runInContext(source, context);
  const run = code => vm.runInContext(code, context);
  run(`survivalVisible = true; startSurvivalRun('${character}');`);
  return { run, state: () => run('survivalState'), elements };
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
    assert.equal(g.state().stats.health, 0);
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
    g.run(`survivalState.stats.${id} = ${def.cap - def.step / 2}`);
    offer(g, `stat:${id}`);
    assert.equal(g.state().stats[id], def.cap);
    assert.ok(!g.run('survivalUpgradePool()').some(c => c.key === `stat:${id}`));
  }
  assert.equal(g.state().stats.attackSpeed, 90);
});

test('full progression still gives 3 selectable, distinct supplies', () => {
  const g = game();
  g.run(`survivalState.weapons = ['rifle','axe','wand','orbit'].map(id => ({...survivalCreateWeapon(id), level: 8}));
    survivalState.passives = ['venomora','toxic','magmara','clara'].map(id => ({id, level: 5}));
    for (const [id,def] of Object.entries(SURVIVAL_STAT_DEFS)) survivalState.stats[id] = def.cap;
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
  offer(g, 'stat:damage'); offer(g, 'stat:armor'); offer(g, 'stat:regen');
  g.run("survivalDamageEnemy(survivalState.enemies[0], 10, '#fff')");
  assert.equal(e.hp, 88.5);
  g.run('survivalState.stats.attackSpeed = 90; survivalState.player.hp = 50; survivalUpdate(0.05)');
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
  assert.equal(g.state().cfg.maxHealth, 182); assert.equal(g.state().player.hp, 182);
  offer(g, 'stat:speed');
  const x = g.state().player.x;
  g.run('survivalKeys.d = true; survivalUpdate(0.05)');
  assert.ok(Math.abs(g.state().player.x - x - 195 * 1.1 * 0.05) < 1e-9);
  const e = enemy(g);
  offer(g, 'stat:crit');
  g.run("Math.random = () => 0; survivalDamageEnemy(survivalState.enemies[0], 10, '#fff')");
  assert.equal(e.hp, 80);
});
