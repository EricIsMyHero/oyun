/* Horde survival: independent weapons, Codex-inspired passives and paused level choices. */
const SURVIVAL_W = 960;
const SURVIVAL_H = 540;

const SURVIVAL_CHARACTERS = {
  soldier: {
    id: 'soldier',
    name: 'Soldier',
    emoji: '🪖',
    cardGroup: 'mission-1',
    cardName: 'Soldier',
    color: '#7b9cff',
    glow: 'rgba(123,156,255,0.55)',
    desc: '3 güllə ardıcıl / 2s · Güllə başına 5 hasar',
    maxHealth: 100,
    speed: 230,
    radius: 18,
    attack: { kind: 'burst', count: 3, shotGap: 120, interval: 2000, damage: 5, bulletSpeed: 560, bulletRadius: 5, range: 480 },
  },
  henry: {
    id: 'henry',
    name: 'Henry',
    emoji: '🧔',
    cardGroup: 'twisted-farm',
    cardName: 'Henry',
    color: '#f87171',
    glow: 'rgba(248,113,113,0.55)',
    desc: 'Tək hədəf / 1.25s · 10 hasar',
    maxHealth: 130,
    speed: 195,
    radius: 20,
    attack: { kind: 'strike', interval: 1250, damage: 10, range: 150 },
  },
};

/* Bonuses are additive to the character's base. Attack speed +90% means
   1.9 attacks/second for a base of 1, not a 90% cooldown reduction. */
const SURVIVAL_STAT_DEFS = {
  damage:      { name: 'Hasar', icon: '⚔', step: 15, cap: 200, unit: '%' },
  attackSpeed: { name: 'Hücum sürəti', icon: '⚡', step: 10, cap: 90, unit: '%' },
  speed:       { name: 'Hərəkət sürəti', icon: '👟', step: 10, cap: 60, unit: '%' },
  health:      { name: 'Maksimum can', icon: '❤', step: 20, cap: 200, unit: '%' },
  armor:       { name: 'Hasar azaltma', icon: '🛡', step: 5, cap: 60, unit: '%' },
  crit:        { name: 'Kritik şansı', icon: '✦', step: 5, cap: 60, unit: '%' },
  regen:       { name: 'Can bərpası', icon: '✚', step: 0.5, cap: 5, unit: '/san' },
};
const SURVIVAL_WEAPONS = {
  rifle: { name: 'Soldier tüfəngi', icon: '🔫', color: '#a5b4fc', kind: 'burst', damage: 5, interval: 2000, range: 480 },
  axe: { name: 'Henry baltası', icon: '🪓', color: '#fda4af', kind: 'strike', damage: 10, interval: 1250, range: 150 },
  wand: { name: 'Mana əsası', icon: '✦', color: '#c4b5fd', kind: 'bolt', damage: 9, interval: 1400, range: 520 },
  orbit: { name: 'Dumpsy orbitləri', icon: '◈', color: '#fcd34d', kind: 'orbit', damage: 6, interval: 450, range: 82 },
  nova: { name: 'Alov halqası', icon: '🔥', color: '#fb923c', kind: 'nova', damage: 10, interval: 2600, range: 120 },
  lightning: { name: 'Zəncir şimşək', icon: 'ϟ', color: '#67e8f9', kind: 'chain', damage: 8, interval: 2200, range: 350 },
};
/* Adapted for this arena, rather than changing the original Codex card data. */
const SURVIVAL_PASSIVES = {
  venomora: { name: 'Venomora', icon: '❄', color: '#67e8f9', desc: l => `Vuruşlar rəqibi 2 saniyə ${25 + (l - 1) * 5}% yavaşladır.` },
  toxic: { name: 'Toxic', icon: '☠', color: '#a3e635', desc: l => `Vuruşlar 3 saniyə ərzində hər saniyə ${2 * l} zəhər hasarı verir. Təkrar vuruş müddəti yeniləyir.` },
  magmara: { name: 'Magmara', icon: '♨', color: '#fb923c', desc: l => `Vuruşlar 2 saniyə ərzində hər saniyə ${3 * l} yanma hasarı verir. Təkrar vuruş müddəti yeniləyir.` },
  aeralis: { name: 'Aeralis', icon: '≋', color: '#c4b5fd', desc: l => `Vuruşlar rəqibi ${12 + (l - 1) * 5} məsafə geri itələyir.` },
  clara: { name: 'Clara', icon: '✚', color: '#6ee7b7', desc: l => `Hər öldürmə ${l} can bərpa edir.` },
  venomspikes: { name: 'Venomspikes', icon: '✹', color: '#f0abfc', desc: l => `Eyni rəqibə hər 5-ci vuruş onun maksimum canının ${8 + (l - 1) * 3}%-i qədər əlavə hasar verir.` },
};
const SURVIVAL_MAX_WEAPONS = 4;
const SURVIVAL_MAX_PASSIVES = 4;
const SURVIVAL_MAX_WEAPON_LEVEL = 8;
const SURVIVAL_MAX_PASSIVE_LEVEL = 5;
const SURVIVAL_CONTACT_DMG = 8;
const SURVIVAL_CONTACT_CD = 600;
function survivalEnemyHP(elapsed) { return 8 + Math.floor(elapsed / 12) * 2; }
function survivalSpawnInterval(elapsed) { return Math.max(300, 1400 - elapsed * 8); }
function survivalEnemySpeed(elapsed) { return Math.min(150, 70 + elapsed * 0.6); }
function survivalXpToNext(level) { return 5 + level * 3; }

let survivalPickerBuilt = false;
let survivalState = null;
let survivalRAF = null;
let survivalInput = { x: 0, y: 0 };
let survivalKeys = {};
let survivalVisible = false;
const survivalImgCache = {};
const survivalReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initSurvival() {
  survivalSetVisible(true);
  if (survivalPickerBuilt) return;
  survivalPickerBuilt = true;
  Object.values(SURVIVAL_CHARACTERS).forEach(ch => {
    const img = new Image();
    img.src = getCardImg({ group: ch.cardGroup, name: ch.cardName });
    survivalImgCache[ch.id] = img;
  });
  buildSurvivalPicker();
  setupSurvivalControls();
}

function buildSurvivalPicker() {
  const grid = document.getElementById('survival-picker-grid');
  grid.innerHTML = '';
  Object.values(SURVIVAL_CHARACTERS).forEach(ch => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'survival-char-card';
    card.style.setProperty('--char-color', ch.color);
    card.innerHTML = `<span class="survival-char-avatar">${ch.emoji}</span>
      <span class="survival-char-name">${ch.name}</span>
      <span class="survival-char-desc">${ch.desc}</span>
      <span class="survival-char-hp">❤ ${ch.maxHealth} · 1 / 4 silah</span>`;
    card.addEventListener('click', () => startSurvivalRun(ch.id));
    grid.appendChild(card);
  });
}

function survivalResetInput() {
  survivalKeys = {};
  survivalInput = { x: 0, y: 0 };
  const knob = document.getElementById('survival-joystick-knob');
  if (knob) knob.style.transform = 'translate(0px, 0px)';
}
function survivalSetVisible(visible) {
  survivalVisible = visible;
  survivalResetInput();
  if (visible && survivalState?.choosing) survivalFocusChoice();
}
function survivalIsPaused() {
  return !survivalVisible || document.hidden || survivalState.paused || survivalState.choosing;
}
function survivalFocusChoice() {
  document.querySelector('#survival-choices button')?.focus({ preventScroll: true });
}
function survivalTogglePause() {
  if (!survivalState || survivalState.over || survivalState.choosing) return;
  survivalState.paused = !survivalState.paused;
  survivalResetInput();
  document.getElementById('survival-pause-btn').textContent = survivalState.paused ? '▶ Davam et' : 'Ⅱ Fasilə';
  document.getElementById('survival-paused').hidden = !survivalState.paused;
}
function setupSurvivalControls() {
  window.addEventListener('keydown', e => {
    if (!survivalVisible || !survivalState || survivalState.over) return;
    if (e.target.matches('input, textarea, select')) return;
    const key = e.key.toLowerCase();
    if (survivalState.choosing) {
      if (key === 'tab') {
        const buttons = [...document.querySelectorAll('#survival-choices button')];
        const index = buttons.indexOf(document.activeElement);
        e.preventDefault();
        buttons[(index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
      }
      if (['1', '2', '3'].includes(key) && !e.repeat) {
        e.preventDefault();
        survivalChooseUpgrade(Number(key) - 1);
      }
      return;
    }
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
    if ((key === 'p' || key === 'escape') && !e.repeat) survivalTogglePause();
    survivalKeys[key] = true;
  });
  window.addEventListener('keyup', e => { delete survivalKeys[e.key.toLowerCase()]; });
  window.addEventListener('blur', () => {
    survivalResetInput();
    if (survivalState && !survivalState.over && !survivalState.paused && !survivalState.choosing) survivalTogglePause();
  });
  document.addEventListener('visibilitychange', survivalResetInput);
  document.getElementById('survival-pause-btn').addEventListener('click', survivalTogglePause);
  document.getElementById('survival-resume-btn').addEventListener('click', survivalTogglePause);
  document.getElementById('survival-exit-btn').addEventListener('click', survivalExitRun);
  document.getElementById('survival-restart-btn').addEventListener('click', () => startSurvivalRun(survivalState.charId));
  document.getElementById('survival-menu-btn').addEventListener('click', survivalExitRun);

  const stick = document.getElementById('survival-joystick');
  const knob = document.getElementById('survival-joystick-knob');
  let dragging = false;
  stick.addEventListener('pointerdown', e => {
    if (!survivalState || survivalIsPaused() || survivalState.over) return;
    dragging = true;
    stick.setPointerCapture(e.pointerId);
    move(e);
  });
  function move(e) {
    if (!dragging || survivalIsPaused()) return;
    const rect = stick.getBoundingClientRect();
    let dx = e.clientX - rect.left - rect.width / 2;
    let dy = e.clientY - rect.top - rect.height / 2;
    const distance = Math.hypot(dx, dy);
    const maxR = rect.width * 0.35;
    if (distance > maxR) { dx *= maxR / distance; dy *= maxR / distance; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    survivalInput = { x: dx / maxR, y: dy / maxR };
  }
  stick.addEventListener('pointermove', move);
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(event => stick.addEventListener(event, () => {
    dragging = false;
    survivalResetInput();
  }));
}

function survivalExitRun() {
  if (survivalRAF) cancelAnimationFrame(survivalRAF);
  if (survivalState) survivalState.over = true;
  survivalResetInput();
  document.getElementById('survival-levelup').hidden = true;
  document.getElementById('survival-game').style.display = 'none';
  document.getElementById('survival-gameover').style.display = 'none';
  document.getElementById('survival-picker').style.display = 'block';
  document.querySelector('.survival-char-card')?.focus({ preventScroll: true });
}
function survivalCreateWeapon(id) { return { id, level: 1, cd: 0, shotsLeft: 0, shotCd: 0 }; }
function startSurvivalRun(charId) {
  if (survivalRAF) cancelAnimationFrame(survivalRAF);
  survivalResetInput();
  const cfg = JSON.parse(JSON.stringify(SURVIVAL_CHARACTERS[charId]));
  survivalState = {
    charId, cfg,
    player: { x: SURVIVAL_W / 2, y: SURVIVAL_H / 2, hp: cfg.maxHealth, contactCd: 0, level: 1, xp: 0, xpToNext: survivalXpToNext(1) },
    stats: Object.fromEntries(Object.keys(SURVIVAL_STAT_DEFS).map(key => [key, 0])),
    weapons: [survivalCreateWeapon(charId === 'soldier' ? 'rifle' : 'axe')],
    passives: [], choices: [], choosing: false, paused: false,
    enemies: [], bullets: [], effects: [], particles: [], texts: [],
    elapsed: 0, spawnCd: 500, kills: 0, shake: 0, over: false,
  };
  document.getElementById('survival-picker').style.display = 'none';
  document.getElementById('survival-gameover').style.display = 'none';
  document.getElementById('survival-game').style.display = 'block';
  document.getElementById('survival-levelup').hidden = true;
  document.getElementById('survival-paused').hidden = true;
  document.getElementById('survival-pause-btn').textContent = 'Ⅱ Fasilə';
  document.getElementById('survival-pause-btn').disabled = false;
  const canvas = document.getElementById('survival-canvas');
  canvas.width = SURVIVAL_W;
  canvas.height = SURVIVAL_H;
  const ctx = canvas.getContext('2d');
  survivalUpdateLoadout();
  updateSurvivalHUD();
  canvas.focus({ preventScroll: true });
  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (survivalState.over) return;
    survivalUpdate(dt);
    survivalRender(ctx);
    if (!survivalState.over) survivalRAF = requestAnimationFrame(loop);
  }
  survivalRAF = requestAnimationFrame(loop);
}

/* ── Upgrade selection: one offer per category while available, then fill
   from the remaining eligible pool. Never offer a fifth weapon/passive. */
function survivalUpgradePool() {
  const st = survivalState;
  const pool = [];
  Object.entries(SURVIVAL_WEAPONS).forEach(([id, def]) => {
    const owned = st.weapons.find(w => w.id === id);
    if (owned ? owned.level >= SURVIVAL_MAX_WEAPON_LEVEL : st.weapons.length >= SURVIVAL_MAX_WEAPONS) return;
    pool.push({ key: `weapon:${id}`, type: 'weapon', id, icon: def.icon, name: def.name, color: def.color,
      label: owned ? `Silah · Sv. ${owned.level} → ${owned.level + 1}` : 'Yeni silah',
      desc: survivalWeaponDescription(id, (owned?.level || 0) + 1) });
  });
  Object.entries(SURVIVAL_STAT_DEFS).forEach(([id, def]) => {
    const value = st.stats[id];
    if (value >= def.cap) return;
    const next = Math.min(def.cap, value + def.step);
    pool.push({ key: `stat:${id}`, type: 'stat', id, icon: def.icon, name: def.name, color: '#fcd34d', label: 'Stat artımı',
      desc: `${value}${def.unit} → ${next}${def.unit} · Limit: ${def.cap}${def.unit}${id === 'crit' ? ' · Kritik vuruş 2× hasar verir.' : ''}` });
  });
  Object.entries(SURVIVAL_PASSIVES).forEach(([id, def]) => {
    const owned = st.passives.find(p => p.id === id);
    if (owned ? owned.level >= SURVIVAL_MAX_PASSIVE_LEVEL : st.passives.length >= SURVIVAL_MAX_PASSIVES) return;
    pool.push({ key: `passive:${id}`, type: 'passive', id, icon: def.icon, name: def.name, color: def.color,
      label: owned ? `Passiv · Sv. ${owned.level} → ${owned.level + 1}` : 'Yeni passiv',
      desc: def.desc((owned?.level || 0) + 1) });
  });
  // At full progression, useful one-time effects keep all three choices valid.
  const supplies = [
    { id: 'heal', icon: '♥', name: 'İkinci nəfəs', desc: 'Maksimum canın 35%-ni bərpa et.' },
    { id: 'barrier', icon: '⬡', name: 'Mana sipəri', desc: '8 saniyəlik toxunulmazlıq qazan.' },
    { id: 'blast', icon: '✺', name: 'Təmizlənmə', desc: 'Arenadakı bütün rəqiblərə maksimum canlarının 50%-i qədər hasar ver.' },
  ];
  if (pool.length < 3) supplies.forEach(s => pool.push({ ...s, key: `supply:${s.id}`, type: 'supply', color: '#6ee7b7', label: 'Birdəfəlik yardım' }));
  return pool;
}
function survivalWeaponDescription(id, level) {
  const def = SURVIVAL_WEAPONS[id];
  const damage = +(def.damage * (1 + (level - 1) * 0.3)).toFixed(1);
  const details = {
    rifle: `${3 + Math.floor((level - 1) / 3)} ardıcıl güllə`,
    axe: 'Yaxındakı bir rəqibə balta zərbəsi',
    wand: 'Rəqiblərdən keçən mana mərmisi',
    orbit: `${2 + Math.floor((level - 1) / 2)} fırlanan kürə`,
    nova: 'Ətrafdakı bütün rəqibləri vuran alov halqası',
    lightning: `${3 + Math.floor((level - 1) / 2)} rəqibə qədər sıçrayan şimşək`,
  };
  return `${details[id]} · ${damage} baza hasarı · ${(def.interval / 1000).toFixed(2)} san. Sv. ${level}/${SURVIVAL_MAX_WEAPON_LEVEL}.`;
}
function survivalSample(list) { return list[Math.floor(Math.random() * list.length)]; }
function survivalLevelUp() {
  const st = survivalState, p = st.player;
  if (st.over || st.choosing || p.xp < p.xpToNext) return false;
  p.xp -= p.xpToNext;
  p.level++;
  p.xpToNext = survivalXpToNext(p.level);
  st.choosing = true;
  survivalResetInput();
  const pool = survivalUpgradePool();
  const selected = [];
  ['weapon', 'stat', 'passive'].forEach(type => {
    let options = pool.filter(c => c.type === type);
    if (type === 'passive') {
      const discoveries = options.filter(c => !st.passives.some(p => p.id === c.id));
      if (discoveries.length) options = discoveries;
    }
    if (options.length) selected.push(survivalSample(options));
  });
  while (selected.length < 3) selected.push(survivalSample(pool.filter(c => !selected.includes(c))));
  // Shuffle positions so the passive is not permanently the third button.
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }
  st.choices = selected;
  survivalRenderChoices();
  updateSurvivalHUD();
  return true;
}
function survivalRenderChoices() {
  const st = survivalState;
  document.getElementById('survival-levelup-title').textContent = `Səviyyə ${st.player.level} — gücünü seç`;
  document.getElementById('survival-choice-slots').textContent = `Silah ${st.weapons.length}/4 · Passiv ${st.passives.length}/4 · Yalnız 1 seçim`;
  const container = document.getElementById('survival-choices');
  container.replaceChildren();
  st.choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `survival-choice survival-choice--${choice.type}`;
    button.style.setProperty('--choice-color', choice.color);
    button.innerHTML = `<span class="survival-choice-type">${choice.label}</span>
      <span class="survival-choice-icon">${choice.icon}</span><strong>${choice.name}</strong>
      <span class="survival-choice-desc">${choice.desc}</span><span class="survival-choice-key">${index + 1} · Seç</span>`;
    button.addEventListener('click', () => survivalChooseUpgrade(index));
    container.appendChild(button);
  });
  document.getElementById('survival-levelup').hidden = false;
  document.getElementById('survival-pause-btn').disabled = true;
  survivalFocusChoice();
}
function survivalChooseUpgrade(index) {
  const st = survivalState;
  if (!st || st.over || !st.choosing || !st.choices[index]) return;
  const choice = st.choices[index];
  // Recheck eligibility instead of trusting a stale UI offer.
  if (!survivalUpgradePool().some(c => c.key === choice.key)) return;
  if (choice.type === 'weapon' || choice.type === 'passive') {
    const collection = choice.type === 'weapon' ? st.weapons : st.passives;
    const owned = collection.find(item => item.id === choice.id);
    if (owned) owned.level++;
    else collection.push(choice.type === 'weapon' ? survivalCreateWeapon(choice.id) : { id: choice.id, level: 1 });
  } else if (choice.type === 'stat') {
    const def = SURVIVAL_STAT_DEFS[choice.id];
    st.stats[choice.id] = Math.min(def.cap, st.stats[choice.id] + def.step);
    if (choice.id === 'health') {
      const oldMax = st.cfg.maxHealth;
      st.cfg.maxHealth = SURVIVAL_CHARACTERS[st.charId].maxHealth * (1 + st.stats.health / 100);
      st.player.hp = Math.min(st.cfg.maxHealth, st.player.hp + st.cfg.maxHealth - oldMax);
    }
  } else if (choice.id === 'heal') {
    st.player.hp = Math.min(st.cfg.maxHealth, st.player.hp + st.cfg.maxHealth * 0.35);
  } else if (choice.id === 'barrier') {
    st.player.contactCd = Math.max(st.player.contactCd, 8000);
  } else if (choice.id === 'blast') {
    st.enemies.forEach(e => { if (e.hp > 0) survivalDamageEnemy(e, e.maxHp * 0.5, '#6ee7b7', false); });
  }
  st.choosing = false;
  st.choices = [];
  survivalResetInput();
  survivalRing(st.player.x, st.player.y, '#fcd34d', 100, 0.6);
  survivalUpdateLoadout();
  document.getElementById('survival-levelup').hidden = true;
  document.getElementById('survival-pause-btn').disabled = false;
  // Overflow XP produces sequential choices, never free or lost upgrades.
  if (!survivalLevelUp()) document.getElementById('survival-canvas').focus({ preventScroll: true });
  updateSurvivalHUD();
}
function survivalUpdateLoadout() {
  const st = survivalState;
  const slots = (items, defs, kind) => Array.from({ length: 4 }, (_, i) => {
    const item = items[i], def = item && defs[item.id];
    const desc = item ? (kind === 'weapon' ? survivalWeaponDescription(item.id, item.level) : def.desc(item.level)) : 'Boş yuva';
    if (!item) return '<span class="survival-slot"><b>＋</b><span>Boş yuva</span></span>';
    return `<details class="survival-slot is-filled"><summary><b>${def.icon}</b><span>${def.name}<small>Sv. ${item.level}</small></span></summary><p>${desc}</p></details>`;
  }).join('');
  document.getElementById('survival-weapons').innerHTML = slots(st.weapons, SURVIVAL_WEAPONS, 'weapon');
  document.getElementById('survival-passives').innerHTML = slots(st.passives, SURVIVAL_PASSIVES, 'passive');
  document.getElementById('survival-weapon-count').textContent = `${st.weapons.length}/4`;
  document.getElementById('survival-passive-count').textContent = `${st.passives.length}/4`;
  document.getElementById('survival-stat-list').innerHTML = Object.entries(SURVIVAL_STAT_DEFS).map(([id, def]) =>
    `<span class="survival-stat${st.stats[id] >= def.cap ? ' is-max' : ''}">${def.icon} ${def.name} <b>${st.stats[id]}${def.unit}</b><small> / ${def.cap}${def.unit}</small></span>`).join('');
}

/* ── Combat ── */
function survivalPassiveLevel(id) { return survivalState.passives.find(p => p.id === id)?.level || 0; }
function survivalNearestEnemy(range, x = survivalState.player.x, y = survivalState.player.y, excluded = new Set()) {
  let best = null, distance = range;
  survivalState.enemies.forEach(e => {
    const d = Math.hypot(e.x - x, e.y - y);
    if (e.hp > 0 && !excluded.has(e) && d <= distance) { best = e; distance = d; }
  });
  return best;
}
function survivalDamageEnemy(enemy, amount, color, onHit = true) {
  if (enemy.hp <= 0) return;
  const st = survivalState;
  const crit = onHit && Math.random() * 100 < st.stats.crit;
  const damage = onHit ? amount * (1 + st.stats.damage / 100) * (crit ? 2 : 1) : amount;
  enemy.hp -= damage;
  enemy.flash = 0.12;
  survivalText(enemy.x, enemy.y - 15, `${crit ? '✦ ' : ''}${+damage.toFixed(1)}`, crit ? '#fde68a' : color);
  survivalParticles(enemy.x, enemy.y, color, crit ? 7 : 3);
  if (!onHit) return;
  const slow = survivalPassiveLevel('venomora');
  if (slow) { enemy.slowTime = 2; enemy.slowAmount = (25 + (slow - 1) * 5) / 100; }
  const poison = survivalPassiveLevel('toxic');
  if (poison) { enemy.poisonTime = 3; enemy.poisonDps = 2 * poison; }
  const burn = survivalPassiveLevel('magmara');
  if (burn) { enemy.burnTime = 2; enemy.burnDps = 3 * burn; }
  const knockback = survivalPassiveLevel('aeralis');
  if (knockback) {
    const dx = enemy.x - st.player.x, dy = enemy.y - st.player.y;
    const d = Math.hypot(dx, dy) || 1;
    enemy.x += dx / d * (12 + (knockback - 1) * 5);
    enemy.y += dy / d * (12 + (knockback - 1) * 5);
  }
  const spikes = survivalPassiveLevel('venomspikes');
  if (spikes) {
    enemy.toxinHits = (enemy.toxinHits || 0) + 1;
    if (enemy.toxinHits % 5 === 0) {
      survivalDamageEnemy(enemy, enemy.maxHp * (8 + (spikes - 1) * 3) / 100, '#f0abfc', false);
      survivalRing(enemy.x, enemy.y, '#f0abfc', 32, 0.3);
    }
  }
}
function survivalShoot(weapon) {
  const st = survivalState, def = SURVIVAL_WEAPONS[weapon.id], p = st.player;
  const target = survivalNearestEnemy(def.range);
  if (!target) return;
  const dx = target.x - p.x, dy = target.y - p.y, d = Math.hypot(dx, dy) || 1;
  const speed = weapon.id === 'wand' ? 420 : 560;
  st.bullets.push({ x: p.x, y: p.y, prevX: p.x, prevY: p.y,
    vx: dx / d * speed, vy: dy / d * speed, radius: weapon.id === 'wand' ? 7 : 4,
    damage: def.damage * (1 + (weapon.level - 1) * 0.3), color: def.color,
    remaining: def.range, speed, pierce: weapon.id === 'wand' ? 2 + Math.floor(weapon.level / 3) : 1, targets: new Set() });
  survivalParticles(p.x + dx / d * 20, p.y + dy / d * 20, def.color, 3);
}
function survivalOrbitPositions(weapon) {
  const p = survivalState.player, time = survivalState.elapsed;
  const count = 2 + Math.floor((weapon.level - 1) / 2);
  return Array.from({ length: count }, (_, i) => ({
    x: p.x + Math.cos(time * 2.8 + i * Math.PI * 2 / count) * 82,
    y: p.y + Math.sin(time * 2.8 + i * Math.PI * 2 / count) * 82,
  }));
}
function survivalAttack(weapon) {
  const st = survivalState, def = SURVIVAL_WEAPONS[weapon.id], p = st.player;
  const damage = def.damage * (1 + (weapon.level - 1) * 0.3);
  if (def.kind === 'burst') {
    weapon.shotsLeft = 3 + Math.floor((weapon.level - 1) / 3);
    weapon.shotCd = 0;
  } else if (def.kind === 'bolt') survivalShoot(weapon);
  else if (def.kind === 'strike') {
    const target = survivalNearestEnemy(def.range);
    if (!target) return;
    survivalDamageEnemy(target, damage, def.color);
    st.effects.push({ kind: 'line', x: p.x, y: p.y, x2: target.x, y2: target.y, color: def.color, life: 0.2, maxLife: 0.2, width: 6 });
  } else if (def.kind === 'nova') {
    const range = def.range + (weapon.level - 1) * 7;
    survivalRing(p.x, p.y, def.color, range, 0.45);
    st.enemies.forEach(e => { if (Math.hypot(e.x - p.x, e.y - p.y) <= range + e.radius) survivalDamageEnemy(e, damage, def.color); });
  } else if (def.kind === 'orbit') {
    const orbs = survivalOrbitPositions(weapon);
    st.enemies.forEach(e => {
      if (orbs.some(o => Math.hypot(e.x - o.x, e.y - o.y) <= e.radius + 12)) survivalDamageEnemy(e, damage, def.color);
    });
  } else if (def.kind === 'chain') {
    let x = p.x, y = p.y;
    const hit = new Set();
    for (let i = 0; i < 3 + Math.floor((weapon.level - 1) / 2); i++) {
      const target = survivalNearestEnemy(i === 0 ? def.range : 180, x, y, hit);
      if (!target) break;
      hit.add(target);
      st.effects.push({ kind: 'line', x, y, x2: target.x, y2: target.y, color: def.color, life: 0.22, maxLife: 0.22, width: 3 });
      x = target.x; y = target.y;
      survivalDamageEnemy(target, damage, def.color);
    }
  }
}
function survivalSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - x1 - t * dx, py - y1 - t * dy);
}
function survivalUpdate(dt) {
  const st = survivalState;
  if (!st || st.over || survivalIsPaused()) return;
  const cfg = st.cfg, p = st.player;
  // XP may arrive from several kills in the previous frame or a supply effect.
  if (survivalLevelUp()) return;
  st.elapsed += dt;
  st.shake = Math.max(0, st.shake - dt * 18);
  p.hp = Math.min(cfg.maxHealth, p.hp + st.stats.regen * dt);
  let ix = survivalInput.x, iy = survivalInput.y;
  if (survivalKeys.a || survivalKeys.arrowleft) ix -= 1;
  if (survivalKeys.d || survivalKeys.arrowright) ix += 1;
  if (survivalKeys.w || survivalKeys.arrowup) iy -= 1;
  if (survivalKeys.s || survivalKeys.arrowdown) iy += 1;
  const mag = Math.hypot(ix, iy), speed = cfg.speed * (1 + st.stats.speed / 100);
  if (mag > 0.05) {
    p.x += ix / Math.max(1, mag) * speed * dt;
    p.y += iy / Math.max(1, mag) * speed * dt;
  }
  p.x = Math.max(cfg.radius, Math.min(SURVIVAL_W - cfg.radius, p.x));
  p.y = Math.max(cfg.radius, Math.min(SURVIVAL_H - cfg.radius, p.y));
  st.spawnCd -= dt * 1000;
  if (st.spawnCd <= 0) { survivalSpawnEnemy(); st.spawnCd = survivalSpawnInterval(st.elapsed); }

  st.weapons.forEach(w => {
    const def = SURVIVAL_WEAPONS[w.id];
    w.cd -= dt * 1000;
    if (w.cd <= 0) { survivalAttack(w); w.cd = def.interval / (1 + st.stats.attackSpeed / 100); }
    if (w.shotsLeft > 0) {
      w.shotCd -= dt * 1000;
      if (w.shotCd <= 0) { survivalShoot(w); w.shotsLeft--; w.shotCd = 120 / (1 + st.stats.attackSpeed / 100); }
    }
  });
  st.bullets.forEach(b => {
    b.prevX = b.x; b.prevY = b.y;
    const distance = Math.min(b.remaining, b.speed * dt);
    b.x += b.vx / b.speed * distance; b.y += b.vy / b.speed * distance; b.remaining -= distance;
    // Swept collision avoids skipping enemies between frames. Resolve nearest first.
    const hits = st.enemies.filter(e => e.hp > 0 && !b.targets.has(e) &&
      survivalSegmentDistance(e.x, e.y, b.prevX, b.prevY, b.x, b.y) <= e.radius + b.radius)
      .sort((a, c) => Math.hypot(a.x - b.prevX, a.y - b.prevY) - Math.hypot(c.x - b.prevX, c.y - b.prevY));
    for (const e of hits) {
      if (b.pierce <= 0) break;
      survivalDamageEnemy(e, b.damage, b.color);
      b.targets.add(e); b.pierce--;
    }
  });
  st.bullets = st.bullets.filter(b => b.pierce > 0 && b.remaining > 0 && b.x > -30 && b.x < SURVIVAL_W + 30 && b.y > -30 && b.y < SURVIVAL_H + 30);

  p.contactCd -= dt * 1000;
  st.enemies.forEach(e => {
    if (e.hp <= 0) return;
    e.flash = Math.max(0, (e.flash || 0) - dt);
    for (const [timer, dps, color] of [['poisonTime', 'poisonDps', '#a3e635'], ['burnTime', 'burnDps', '#fb923c']]) {
      const active = Math.min(dt, e[timer] || 0);
      if (active > 0) {
        // Integrate exactly to expiry; show periodic text instead of 60 labels/sec.
        e.hp -= e[dps] * active;
        e.dotText = (e.dotText || 0) + active;
        if (e.dotText >= 0.5) { survivalText(e.x, e.y - 22, '•', color); e.dotText = 0; }
        e[timer] = Math.max(0, e[timer] - dt);
      }
    }
    if (e.hp <= 0) return;
    const slowActive = Math.min(dt, e.slowTime || 0);
    const travel = survivalEnemySpeed(st.elapsed) * (dt - slowActive * (e.slowAmount || 0));
    e.slowTime = Math.max(0, (e.slowTime || 0) - dt);
    const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy) || 1;
    e.x += dx / dist * travel; e.y += dy / dist * travel;
    if (Math.hypot(p.x - e.x, p.y - e.y) < e.radius + cfg.radius && p.contactCd <= 0) {
      const damage = SURVIVAL_CONTACT_DMG * (1 - st.stats.armor / 100);
      p.hp = Math.max(0, p.hp - damage); p.contactCd = SURVIVAL_CONTACT_CD;
      st.shake = 5;
      survivalText(p.x, p.y - 25, `−${+damage.toFixed(1)}`, '#f87171');
      survivalRing(p.x, p.y, '#f87171', 40, 0.25);
    }
  });
  const dead = st.enemies.filter(e => e.hp <= 0);
  dead.forEach(e => {
    survivalParticles(e.x, e.y, e.poisonTime > 0 ? '#a3e635' : '#fbbf24', 10);
    survivalRing(e.x, e.y, '#a78bfa', 22, 0.25);
    survivalText(e.x, e.y, '+1 XP', '#c4b5fd');
  });
  st.enemies = st.enemies.filter(e => e.hp > 0);
  st.kills += dead.length; p.xp += dead.length;
  // Death takes priority over healing or a new selection on the same frame.
  if (p.hp <= 0) { updateSurvivalHUD(); survivalGameOver(); return; }
  const heal = dead.length * survivalPassiveLevel('clara');
  if (heal && p.hp < cfg.maxHealth) {
    p.hp = Math.min(cfg.maxHealth, p.hp + heal);
    survivalText(p.x, p.y - 35, `+${heal} ❤`, '#6ee7b7');
  }
  st.effects.forEach(e => e.life -= dt);
  st.effects = st.effects.filter(e => e.life > 0);
  st.particles.forEach(e => { e.life -= dt; e.x += e.vx * dt; e.y += e.vy * dt; });
  st.particles = st.particles.filter(e => e.life > 0);
  st.texts.forEach(e => { e.life -= dt; e.y -= dt * 28; });
  st.texts = st.texts.filter(e => e.life > 0);
  survivalLevelUp();
  updateSurvivalHUD();
}
function survivalSpawnEnemy() {
  const st = survivalState, edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = Math.random() * SURVIVAL_W; y = -20; }
  else if (edge === 1) { x = SURVIVAL_W + 20; y = Math.random() * SURVIVAL_H; }
  else if (edge === 2) { x = Math.random() * SURVIVAL_W; y = SURVIVAL_H + 20; }
  else { x = -20; y = Math.random() * SURVIVAL_H; }
  const hp = survivalEnemyHP(st.elapsed);
  st.enemies.push({ x, y, radius: 16, hp, maxHp: hp });
}

/* ── Bounded effects: no timers or DOM nodes per hit. ── */
function survivalParticles(x, y, color, count) {
  if (survivalReducedMotion) return;
  const particles = survivalState.particles;
  for (let i = 0; i < count && particles.length < 240; i++) {
    const angle = Math.random() * Math.PI * 2, speed = 30 + Math.random() * 100;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color, life: 0.35, maxLife: 0.35 });
  }
}
function survivalText(x, y, text, color) {
  if (survivalState.texts.length < 70) survivalState.texts.push({ x, y, text, color, life: 0.7, maxLife: 0.7 });
}
function survivalRing(x, y, color, radius, life) {
  if (survivalState.effects.length < 100) survivalState.effects.push({ kind: 'ring', x, y, color, radius, life, maxLife: life });
}
function survivalRender(ctx) {
  const st = survivalState, cfg = st.cfg, p = st.player;
  ctx.clearRect(0, 0, SURVIVAL_W, SURVIVAL_H);
  ctx.save();
  if (st.shake > 0 && !survivalReducedMotion && !survivalIsPaused()) ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);
  const gradient = ctx.createRadialGradient(p.x, p.y, 30, SURVIVAL_W / 2, SURVIVAL_H / 2, 650);
  gradient.addColorStop(0, '#17213b'); gradient.addColorStop(1, '#080b18');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, SURVIVAL_W, SURVIVAL_H);
  ctx.strokeStyle = 'rgba(120,145,210,0.09)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < SURVIVAL_W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, SURVIVAL_H); }
  for (let y = 0; y < SURVIVAL_H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(SURVIVAL_W, y); }
  ctx.stroke();
  st.effects.forEach(e => {
    ctx.globalAlpha = Math.max(0, e.life / e.maxLife);
    ctx.strokeStyle = e.color; ctx.lineWidth = e.width || 3;
    ctx.beginPath();
    if (e.kind === 'ring') ctx.arc(e.x, e.y, e.radius * (1 - e.life / e.maxLife), 0, Math.PI * 2);
    else {
      ctx.moveTo(e.x, e.y);
      ctx.lineTo((e.x + e.x2) / 2 + 8, (e.y + e.y2) / 2 - 8);
      ctx.lineTo(e.x2, e.y2);
    }
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  st.bullets.forEach(b => {
    ctx.strokeStyle = b.color; ctx.lineWidth = b.radius;
    ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.025, b.y - b.vy * 0.025); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 0.55, 0, Math.PI * 2); ctx.fill();
  });
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  st.enemies.forEach(e => {
    if (e.slowTime > 0 || e.poisonTime > 0 || e.burnTime > 0) {
      ctx.strokeStyle = e.slowTime > 0 ? '#67e8f9' : e.poisonTime > 0 ? '#a3e635' : '#fb923c';
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 3, 0, Math.PI * 2); ctx.stroke();
      ctx.font = '11px sans-serif';
      const status = `${e.slowTime > 0 ? '❄' : ''}${e.poisonTime > 0 ? '☠' : ''}${e.burnTime > 0 ? '♨' : ''}`;
      ctx.fillStyle = '#fff'; ctx.fillText(status, e.x, e.y + 26);
    }
    ctx.font = '28px serif'; ctx.fillText('🧟', e.x, e.y);
    if (e.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(e.x, e.y, 14, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#262435'; ctx.fillRect(e.x - 14, e.y - 28, 28, 4);
    ctx.fillStyle = '#f87171'; ctx.fillRect(e.x - 14, e.y - 28, 28 * Math.max(0, e.hp / e.maxHp), 4);
  });
  const orbit = st.weapons.find(w => w.id === 'orbit');
  if (orbit) survivalOrbitPositions(orbit).forEach(o => {
    ctx.fillStyle = '#fcd34d'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(o.x, o.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  });
  ctx.fillStyle = cfg.glow;
  ctx.beginPath(); ctx.arc(p.x, p.y, cfg.radius + 6, 0, Math.PI * 2); ctx.fill();
  const img = survivalImgCache[st.charId];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, cfg.radius, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(img, p.x - cfg.radius, p.y - cfg.radius, cfg.radius * 2, cfg.radius * 2); ctx.restore();
  } else { ctx.font = '30px serif'; ctx.fillText(cfg.emoji, p.x, p.y); }
  ctx.strokeStyle = p.contactCd > 0 ? '#fef3c7' : cfg.color; ctx.lineWidth = p.contactCd > 600 ? 4 : 2;
  ctx.beginPath(); ctx.arc(p.x, p.y, cfg.radius + 2, 0, Math.PI * 2); ctx.stroke();
  st.particles.forEach(e => {
    ctx.globalAlpha = Math.max(0, e.life / e.maxLife); ctx.fillStyle = e.color; ctx.fillRect(e.x, e.y, 3, 3);
  });
  ctx.font = 'bold 13px sans-serif';
  st.texts.forEach(e => {
    ctx.globalAlpha = Math.max(0, e.life / e.maxLife); ctx.fillStyle = e.color; ctx.fillText(e.text, e.x, e.y);
  });
  ctx.restore();
}
function updateSurvivalHUD() {
  const st = survivalState, p = st.player;
  document.getElementById('survival-hp-fill').style.width = Math.max(0, p.hp / st.cfg.maxHealth * 100) + '%';
  document.getElementById('survival-hp-text').textContent = `${Math.ceil(p.hp)} / ${Math.round(st.cfg.maxHealth)}`;
  document.getElementById('survival-xp-fill').style.width = Math.min(100, p.xp / p.xpToNext * 100) + '%';
  document.getElementById('survival-xp-text').textContent = `${p.xp} / ${p.xpToNext} XP`;
  document.getElementById('survival-level').textContent = p.level;
  document.getElementById('survival-timer').textContent = survivalTime(st.elapsed);
  document.getElementById('survival-kills').textContent = `${st.kills} öldürmə`;
}
function survivalTime(elapsed) { return `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}`; }
function survivalGameOver() {
  const st = survivalState;
  st.over = true; st.choosing = false;
  survivalResetInput();
  if (survivalRAF) cancelAnimationFrame(survivalRAF);
  document.getElementById('survival-levelup').hidden = true;
  document.getElementById('survival-game').style.display = 'none';
  document.getElementById('survival-gameover').style.display = 'block';
  document.getElementById('survival-final-stats').textContent =
    `${st.cfg.name} · Sv. ${st.player.level} · ${survivalTime(st.elapsed)} sağ qaldı · ${st.kills} öldürmə`;
  document.getElementById('survival-restart-btn').focus({ preventScroll: true });
}
