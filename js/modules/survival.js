/* ═══════════════════════════════════════════════════════
   js/modules/survival.js
   Horde survival mode (Brotato / Vampire Survivors style)
   Only Soldier and Henry are integrated for now — built so
   more Codex cards can be dropped into SURVIVAL_CHARACTERS
   later without touching the game loop.
═══════════════════════════════════════════════════════ */

const SURVIVAL_W = 960;
const SURVIVAL_H = 540;

/* ── Playable characters ──
   Attack numbers are exactly as specified:
   - Soldier: 3 bullets every 2s, 5 dmg each
   - Henry:   1 hit every 1.25s, 10 dmg, single target
   maxHealth / speed / radius / range are new balance values
   for this mode (not defined in the request) — tweak freely. */
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

/* ── Enemy scaling: 8 can ilə başlar, zamanla artır ── */
function survivalEnemyHP(elapsed)      { return 8 + Math.floor(elapsed / 12) * 2; }
function survivalSpawnInterval(elapsed){ return Math.max(300, 1400 - elapsed * 8); }
function survivalEnemySpeed(elapsed)   { return Math.min(150, 70 + elapsed * 0.6); }
const SURVIVAL_CONTACT_DMG = 8;
const SURVIVAL_CONTACT_CD  = 600;

/* ── XP / leveling: xp per kill = 1, threshold grows per level ── */
const SURVIVAL_XP_PER_KILL = 1;
function survivalXpToNext(level) { return 5 + level * 3; }

let survivalPickerBuilt = false;
let survivalState = null;
let survivalRAF   = null;
let survivalInput = { x: 0, y: 0 };
let survivalKeys  = {};
const survivalImgCache = {};   // charId -> HTMLImageElement (card art, reused across runs)

/* ── Preload each character's card art (uses getCardImg from cards.js) ── */
function survivalPreloadImages() {
  Object.values(SURVIVAL_CHARACTERS).forEach(ch => {
    const img = new Image();
    img.src = getCardImg({ group: ch.cardGroup, name: ch.cardName });
    survivalImgCache[ch.id] = img;
  });
}

/* ═══════════════════════════════════════════════════════
   ENTRY POINT (called by navigation.js)
═══════════════════════════════════════════════════════ */
function initSurvival() {
  if (survivalPickerBuilt) return;
  survivalPickerBuilt = true;
  survivalPreloadImages();
  buildSurvivalPicker();
  setupSurvivalControls();
}

function buildSurvivalPicker() {
  const grid = document.getElementById('survival-picker-grid');
  grid.innerHTML = '';
  Object.values(SURVIVAL_CHARACTERS).forEach(ch => {
    const card = document.createElement('div');
    card.className = 'survival-char-card';
    card.style.setProperty('--char-color', ch.color);
    card.innerHTML = `
      <img class="survival-char-img" src="${getCardImg({ group: ch.cardGroup, name: ch.cardName })}" alt="${ch.name}">
      <div class="survival-char-name">${ch.name}</div>
      <div class="survival-char-desc">${ch.desc}</div>
      <div class="survival-char-hp">❤ ${ch.maxHealth}</div>
    `;
    card.addEventListener('click', () => startSurvivalRun(ch.id));
    grid.appendChild(card);
  });
}

/* ── Controls: keyboard + drag joystick (mouse & touch) ── */
function setupSurvivalControls() {
  window.addEventListener('keydown', e => { survivalKeys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup',   e => { survivalKeys[e.key.toLowerCase()] = false; });

  const stick = document.getElementById('survival-joystick');
  const knob  = document.getElementById('survival-joystick-knob');
  const maxR  = 40;
  let dragging = false, originX = 0, originY = 0;

  function setKnob(dx, dy) { knob.style.transform = `translate(${dx}px, ${dy}px)`; }
  function resetKnob()     { setKnob(0, 0); survivalInput.x = 0; survivalInput.y = 0; }

  stick.addEventListener('pointerdown', e => {
    dragging = true;
    stick.setPointerCapture(e.pointerId);
    const rect = stick.getBoundingClientRect();
    originX = rect.left + rect.width / 2;
    originY = rect.top + rect.height / 2;
  });
  stick.addEventListener('pointermove', e => {
    if (!dragging) return;
    let dx = e.clientX - originX, dy = e.clientY - originY;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) { dx = (dx / dist) * maxR; dy = (dy / dist) * maxR; }
    setKnob(dx, dy);
    survivalInput.x = dx / maxR;
    survivalInput.y = dy / maxR;
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt =>
    stick.addEventListener(evt, () => { dragging = false; resetKnob(); })
  );
}

/* ── Restart / back-to-menu (event delegation, matches battle.js) ── */
document.addEventListener('click', e => {
  if (e.target && e.target.id === 'survival-restart-btn') startSurvivalRun(survivalState.charId);
  if (e.target && e.target.id === 'survival-menu-btn') {
    document.getElementById('survival-gameover').style.display = 'none';
    document.getElementById('survival-picker').style.display = 'block';
  }
});

/* ═══════════════════════════════════════════════════════
   RUN LIFECYCLE
═══════════════════════════════════════════════════════ */
function startSurvivalRun(charId) {
  /* clone so per-run level-up buffs never leak into the next run */
  const cfg = JSON.parse(JSON.stringify(SURVIVAL_CHARACTERS[charId]));
  document.getElementById('survival-picker').style.display   = 'none';
  document.getElementById('survival-gameover').style.display = 'none';
  document.getElementById('survival-game').style.display     = 'block';

  const canvas = document.getElementById('survival-canvas');
  canvas.width  = SURVIVAL_W;
  canvas.height = SURVIVAL_H;

  survivalState = {
    charId, cfg,
    player: {
      x: SURVIVAL_W / 2, y: SURVIVAL_H / 2,
      hp: cfg.maxHealth, contactCd: 0,
      level: 1, xp: 0, xpToNext: survivalXpToNext(1),
    },
    attackCd: 0,
    burst: null,          // { shotsLeft, timer } — soldier's burst-fire
    enemies: [],
    bullets: [],
    strikes: [],
    elapsed: 0,
    spawnCd: 800,
    kills: 0,
    over: false,
  };

  if (survivalRAF) cancelAnimationFrame(survivalRAF);
  let last = performance.now();
  const ctx = canvas.getContext('2d');

  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (survivalState.over) return;
    survivalUpdate(dt);
    survivalRender(ctx);
    survivalRAF = requestAnimationFrame(loop);
  }
  survivalRAF = requestAnimationFrame(loop);
}

/* ═══════════════════════════════════════════════════════
   UPDATE
═══════════════════════════════════════════════════════ */
function survivalUpdate(dt) {
  const st = survivalState, cfg = st.cfg, p = st.player;
  st.elapsed += dt;

  /* movement: joystick, overridden/added to by keyboard */
  let ix = survivalInput.x, iy = survivalInput.y;
  if (survivalKeys['a'] || survivalKeys['arrowleft'])  ix = -1;
  if (survivalKeys['d'] || survivalKeys['arrowright']) ix = 1;
  if (survivalKeys['w'] || survivalKeys['arrowup'])    iy = -1;
  if (survivalKeys['s'] || survivalKeys['arrowdown'])  iy = 1;
  const mag = Math.hypot(ix, iy);
  if (mag > 0.05) {
    p.x += (ix / mag) * cfg.speed * dt;
    p.y += (iy / mag) * cfg.speed * dt;
  }
  p.x = Math.max(cfg.radius, Math.min(SURVIVAL_W - cfg.radius, p.x));
  p.y = Math.max(cfg.radius, Math.min(SURVIVAL_H - cfg.radius, p.y));

  /* enemy spawning */
  st.spawnCd -= dt * 1000;
  if (st.spawnCd <= 0) {
    survivalSpawnEnemy();
    st.spawnCd = survivalSpawnInterval(st.elapsed);
  }

  /* character attack (starts a burst for soldier, fires instantly for henry) */
  st.attackCd -= dt * 1000;
  if (st.attackCd <= 0) {
    survivalDoAttack();
    st.attackCd = cfg.attack.interval;
  }

  /* tick soldier's burst — 3 bullets fired one after another, same target */
  if (st.burst && st.burst.shotsLeft > 0) {
    st.burst.timer -= dt * 1000;
    if (st.burst.timer <= 0) {
      survivalFireBurstShot();
      st.burst.shotsLeft--;
      st.burst.timer = cfg.attack.shotGap;
    }
  }

  /* bullets travel */
  st.bullets.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; });
  st.bullets = st.bullets.filter(b =>
    b.x > -20 && b.x < SURVIVAL_W + 20 && b.y > -20 && b.y < SURVIVAL_H + 20 && !b.hit
  );

  /* Henry strike flashes fade out */
  st.strikes.forEach(s => s.life -= dt);
  st.strikes = st.strikes.filter(s => s.life > 0);

  /* enemies chase player + contact damage */
  const enemySpeed = survivalEnemySpeed(st.elapsed);
  p.contactCd -= dt * 1000;
  st.enemies.forEach(e => {
    const dx = p.x - e.x, dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    e.x += (dx / dist) * enemySpeed * dt;
    e.y += (dy / dist) * enemySpeed * dt;
    if (dist < e.radius + cfg.radius && p.contactCd <= 0) {
      p.hp -= SURVIVAL_CONTACT_DMG;
      p.contactCd = SURVIVAL_CONTACT_CD;
    }
  });

  /* bullet ↔ enemy collisions */
  st.bullets.forEach(b => {
    if (b.hit) return;
    for (const e of st.enemies) {
      if (e.hp <= 0) continue;
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.radius + b.radius) {
        e.hp -= b.damage;
        b.hit = true;
        break;
      }
    }
  });

  /* remove dead enemies, count kills, award xp */
  const before = st.enemies.length;
  st.enemies = st.enemies.filter(e => e.hp > 0);
  const killedNow = before - st.enemies.length;
  st.kills += killedNow;
  if (killedNow > 0) {
    p.xp += killedNow * SURVIVAL_XP_PER_KILL;
    while (p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext;
      p.level++;
      p.xpToNext = survivalXpToNext(p.level);
      survivalLevelUp();
    }
  }

  updateSurvivalHUD();
  if (p.hp <= 0) survivalGameOver();
}

/* ── Level up: small, permanent-for-this-run buff ── */
function survivalLevelUp() {
  const st = survivalState, cfg = st.cfg, p = st.player;
  cfg.attack.damage += 1;                                  // bullets/strike hit harder
  cfg.maxHealth += 10;
  p.hp = Math.min(cfg.maxHealth, p.hp + 20);                // partial heal on level up
}

function survivalNearestEnemy() {
  const st = survivalState, p = st.player, atk = st.cfg.attack;
  let best = null, bestDist = atk.range;
  st.enemies.forEach(e => {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d <= bestDist) { best = e; bestDist = d; }
  });
  return best;
}

function survivalDoAttack() {
  const st = survivalState, cfg = st.cfg, atk = cfg.attack;

  if (atk.kind === 'burst') {
    /* start a 3-shot burst — each shot re-targets the current nearest enemy */
    st.burst = { shotsLeft: atk.count, timer: 0 };
  } else if (atk.kind === 'strike') {
    const t = survivalNearestEnemy();
    if (t) {
      const p = st.player;
      t.hp -= atk.damage;
      st.strikes.push({ x1: p.x, y1: p.y, x2: t.x, y2: t.y, life: 0.15 });
    }
  }
}

function survivalFireBurstShot() {
  const st = survivalState, p = st.player, atk = st.cfg.attack;
  const t = survivalNearestEnemy();
  if (!t) return;
  const dx = t.x - p.x, dy = t.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  st.bullets.push({
    x: p.x, y: p.y,
    vx: (dx / d) * atk.bulletSpeed, vy: (dy / d) * atk.bulletSpeed,
    radius: atk.bulletRadius, damage: atk.damage, hit: false,
  });
}

function survivalSpawnEnemy() {
  const st = survivalState;
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0)      { x = Math.random() * SURVIVAL_W; y = -20; }
  else if (edge === 1) { x = SURVIVAL_W + 20; y = Math.random() * SURVIVAL_H; }
  else if (edge === 2) { x = Math.random() * SURVIVAL_W; y = SURVIVAL_H + 20; }
  else                 { x = -20; y = Math.random() * SURVIVAL_H; }

  const hp = survivalEnemyHP(st.elapsed);
  st.enemies.push({ x, y, radius: 16, hp, maxHp: hp });
}

/* ═══════════════════════════════════════════════════════
   RENDER
═══════════════════════════════════════════════════════ */
function survivalRender(ctx) {
  const st = survivalState, cfg = st.cfg, p = st.player;

  ctx.clearRect(0, 0, SURVIVAL_W, SURVIVAL_H);
  ctx.fillStyle = '#080b18';
  ctx.fillRect(0, 0, SURVIVAL_W, SURVIVAL_H);

  ctx.strokeStyle = 'rgba(90,110,200,0.10)';
  ctx.lineWidth = 1;
  for (let gx = 0; gx < SURVIVAL_W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, SURVIVAL_H); ctx.stroke(); }
  for (let gy = 0; gy < SURVIVAL_H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(SURVIVAL_W, gy); ctx.stroke(); }

  /* Henry strike flashes */
  st.strikes.forEach(s => {
    ctx.strokeStyle = `rgba(248,113,113,${Math.max(0, s.life / 0.15)})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
  });

  /* bullets */
  ctx.fillStyle = '#a78bfa';
  st.bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); });

  /* enemies + hp bars */
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  st.enemies.forEach(e => {
    ctx.font = '28px serif';
    ctx.fillText('🧟', e.x, e.y);
    const w = 28;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 4);
    ctx.fillStyle = '#f87171';         ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w * (e.hp / e.maxHp), 4);
  });

  /* player — card art clipped to a circle, falls back to emoji until image loads */
  const img = survivalImgCache[st.charId];
  ctx.beginPath();
  ctx.fillStyle = cfg.glow;
  ctx.arc(p.x, p.y, cfg.radius + 6, 0, Math.PI * 2);
  ctx.fill();

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, cfg.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, p.x - cfg.radius, p.y - cfg.radius, cfg.radius * 2, cfg.radius * 2);
    ctx.restore();
    ctx.beginPath();
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 2;
    ctx.arc(p.x, p.y, cfg.radius, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.font = '30px serif';
    ctx.fillText(cfg.emoji, p.x, p.y);
  }
}

function updateSurvivalHUD() {
  const st = survivalState, cfg = st.cfg, p = st.player;
  const pct = Math.max(0, (p.hp / cfg.maxHealth) * 100);
  document.getElementById('survival-hp-fill').style.width = pct + '%';
  const xpPct = Math.max(0, (p.xp / p.xpToNext) * 100);
  document.getElementById('survival-xp-fill').style.width = xpPct + '%';
  document.getElementById('survival-level').textContent = p.level;
  const mm = String(Math.floor(st.elapsed / 60)).padStart(2, '0');
  const ss = String(Math.floor(st.elapsed % 60)).padStart(2, '0');
  document.getElementById('survival-timer').textContent = `${mm}:${ss}`;
  document.getElementById('survival-kills').textContent = `${st.kills} öldürmə`;
}

function survivalGameOver() {
  const st = survivalState;
  st.over = true;
  if (survivalRAF) cancelAnimationFrame(survivalRAF);
  document.getElementById('survival-game').style.display     = 'none';
  document.getElementById('survival-gameover').style.display = 'block';
  const mm = String(Math.floor(st.elapsed / 60)).padStart(2, '0');
  const ss = String(Math.floor(st.elapsed % 60)).padStart(2, '0');
  document.getElementById('survival-final-stats').textContent =
    `${st.cfg.name} · Lvl ${st.player.level} · ${mm}:${ss} sağ qaldı · ${st.kills} öldürmə`;
}
