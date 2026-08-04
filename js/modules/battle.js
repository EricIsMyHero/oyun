/* ═══════════════════════════════════════════════════════
   js/modules/battle.js
   Turn-based board arena (Songs of Conquest style)
   Reuses allCards / getCardImg / _toNum / _calcDPS from cards.js
═══════════════════════════════════════════════════════ */

const BOARD_COLS  = 7;
const BOARD_ROWS  = 7;
const SQUAD_SIZE  = 5;

let battlePicked   = [];   // cards chosen by player in the picker
let battlePickerBuilt = false;
let battle = null;         // active battle state

/* ── Raw stat extraction (mirrors the logic cards.js already uses) ── */
function _bCardStats(card) { const s = (card.isDual && card.type1) ? card.type1 : card; return s.stats || {}; }
function _bCardAdd(card)   { const s = (card.isDual && card.type1) ? card.type1 : card; return s.additionalStats || {}; }
function _rawHP(card)      { const s = _bCardStats(card); return _toNum(s.health) + _toNum(s.shield); }
function _rawDPS(card)     { return _calcDPS(_bCardStats(card)); }
function _rawSpeed(card)   { return _toNum(_bCardAdd(card).speed); }
function _rawRange(card)   { return _toNum(_bCardAdd(card).range); }

/* ── Normalize raw stats (any scale) into small board-friendly numbers ── */
let _bMin = {}, _bMax = {};

function prepareBattleStats() {
  const hp = [], dps = [], spd = [], rng = [];
  allCards.forEach(c => {
    hp.push(_rawHP(c)); dps.push(_rawDPS(c)); spd.push(_rawSpeed(c)); rng.push(_rawRange(c));
  });
  _bMin = { hp: Math.min(...hp), dps: Math.min(...dps), spd: Math.min(...spd), rng: Math.min(...rng) };
  _bMax = { hp: Math.max(...hp), dps: Math.max(...dps), spd: Math.max(...spd), rng: Math.max(...rng) };
}

function _norm(v, key) {
  const mn = _bMin[key], mx = _bMax[key];
  return mx > mn ? (v - mn) / (mx - mn) : 0.5;
}
function _lerp(a, b, t) { return a + (b - a) * t; }

/* Public: get (and cache) a card's board-battle stats */
function getBattleStats(card) {
  if (card._battle) return card._battle;
  const bs = {
    maxHp: Math.round(_lerp(18, 55, _norm(_rawHP(card), 'hp'))),
    atk:   Math.round(_lerp(3, 16,  _norm(_rawDPS(card), 'dps'))),
    move:  Math.round(_lerp(2, 5,   _norm(_rawSpeed(card), 'spd'))),
    range: Math.max(1, Math.round(_lerp(1, 4, _norm(_rawRange(card), 'rng')))),
  };
  card._battle = bs;
  return bs;
}

/* ═══════════════════════════════════════════════════════
   ENTRY POINT (called by navigation.js)
═══════════════════════════════════════════════════════ */
async function initBattle() {
  await initCards();               // make sure allCards is loaded (cards.js, idempotent)
  prepareBattleStats();
  if (!battlePickerBuilt) {
    renderPicker();
    battlePickerBuilt = true;
  }
  document.getElementById('battle-picker').style.display = 'block';
  document.getElementById('battle-arena').style.display  = 'none';
  document.getElementById('battle-result').style.display = 'none';
}

/* ═══════════════════════════════════════════════════════
   SQUAD PICKER
═══════════════════════════════════════════════════════ */
function renderPicker() {
  const grid = document.getElementById('battle-picker-grid');
  grid.innerHTML = '';
  allCards.forEach(card => {
    const bs = getBattleStats(card);
    const el = document.createElement('div');
    el.className = 'card-item battle-pick-item';
    el.innerHTML = `
      <div class="card-img-wrap">
        <img src="${getCardImg(card)}" alt="${card.name}" loading="lazy"
             onerror="this.style.display='none'">
      </div>
      <div class="card-body">
        <div class="card-name">${card.name || 'Unknown'}</div>
        <div class="battle-pick-stats">
          <span>❤ ${bs.maxHp}</span><span>⚔ ${bs.atk}</span><span>➤ ${bs.move}</span><span>◎ ${bs.range}</span>
        </div>
      </div>`;
    el.addEventListener('click', () => togglePick(card, el));
    grid.appendChild(el);
  });
  updatePickCount();
}

function togglePick(card, el) {
  const idx = battlePicked.indexOf(card);
  if (idx >= 0) {
    battlePicked.splice(idx, 1);
    el.classList.remove('picked');
  } else {
    if (battlePicked.length >= SQUAD_SIZE) return;
    battlePicked.push(card);
    el.classList.add('picked');
  }
  updatePickCount();
}

function updatePickCount() {
  document.getElementById('battle-pick-count').textContent = battlePicked.length;
  document.getElementById('battle-start-btn').disabled = battlePicked.length !== SQUAD_SIZE;
}

/* ═══════════════════════════════════════════════════════
   BATTLE SETUP
═══════════════════════════════════════════════════════ */
function pickAiSquad() {
  const pool = allCards.filter(c => !battlePicked.includes(c));
  const squad = [];
  while (squad.length < SQUAD_SIZE && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    squad.push(pool.splice(i, 1)[0]);
  }
  return squad;
}

function buildUnits(cards, side) {
  const rows = [1, 2, 3, 4, 5];
  const x = side === 'p' ? 0 : BOARD_COLS - 1;
  return cards.map((card, i) => {
    const bs = getBattleStats(card);
    return {
      id: `${side}-${i}`, card, side,
      x, y: rows[i],
      hp: bs.maxHp, maxHp: bs.maxHp, atk: bs.atk, move: bs.move, range: bs.range,
      initiative: _rawSpeed(card),
      alive: true, hasMoved: false, hasActed: false,
    };
  });
}

function startBattle() {
  if (battlePicked.length !== SQUAD_SIZE) return;
  const units = [...buildUnits(battlePicked, 'p'), ...buildUnits(pickAiSquad(), 'e')];
  battle = { units, order: [], turnIdx: -1, active: null, awaitingInput: false, reachable: [], attackable: [], over: false };

  document.getElementById('battle-picker').style.display = 'none';
  document.getElementById('battle-arena').style.display  = 'block';
  document.getElementById('battle-result').style.display = 'none';
  document.getElementById('battle-log').innerHTML = '';

  renderBoard();
  nextUnit();
}

function restartBattle() {
  battlePicked = [];
  document.querySelectorAll('.battle-pick-item.picked').forEach(el => el.classList.remove('picked'));
  updatePickCount();
  document.getElementById('battle-result').style.display = 'none';
  document.getElementById('battle-arena').style.display  = 'none';
  document.getElementById('battle-picker').style.display = 'block';
}

/* ═══════════════════════════════════════════════════════
   TURN ORDER
═══════════════════════════════════════════════════════ */
function nextUnit() {
  if (battle.over) return;
  battle.turnIdx++;
  if (battle.turnIdx >= battle.order.length) {
    battle.order = battle.units.filter(u => u.alive).sort((a, b) => b.initiative - a.initiative);
    battle.turnIdx = 0;
  }
  if (!battle.order.length) return;
  const unit = battle.order[battle.turnIdx];
  if (!unit.alive) { nextUnit(); return; }

  unit.hasMoved = false;
  unit.hasActed = false;
  battle.active = unit;
  updateTurnInfo(unit);

  if (unit.side === 'p') {
    battle.reachable  = computeReachable(unit);
    battle.attackable = computeAttackable(unit, unit.x, unit.y);
    battle.awaitingInput = true;
    renderBoard();
  } else {
    battle.awaitingInput = false;
    renderBoard();
    setTimeout(() => { aiTakeTurn(unit); }, 500);
  }
}

function finalizeUnitTurn() {
  battle.awaitingInput = false;
  battle.reachable = [];
  battle.attackable = [];
  if (checkWin()) return;
  renderBoard();
  setTimeout(nextUnit, 350);
}

/* ═══════════════════════════════════════════════════════
   MOVEMENT / ATTACK RANGE
═══════════════════════════════════════════════════════ */
function getUnitAt(x, y) {
  return battle.units.find(u => u.alive && u.x === x && u.y === y);
}
function inBounds(x, y) { return x >= 0 && x < BOARD_COLS && y >= 0 && y < BOARD_ROWS; }
function chebyshev(ax, ay, bx, by) { return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); }

function computeReachable(unit) {
  const visited = new Map();
  visited.set(`${unit.x},${unit.y}`, 0);
  let frontier = [{ x: unit.x, y: unit.y, d: 0 }];
  const out = [];
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

  while (frontier.length) {
    const next = [];
    for (const cell of frontier) {
      if (cell.d >= unit.move) continue;
      for (const [dx, dy] of dirs) {
        const nx = cell.x + dx, ny = cell.y + dy;
        if (!inBounds(nx, ny)) continue;
        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        if (getUnitAt(nx, ny)) continue;
        visited.set(key, cell.d + 1);
        out.push({ x: nx, y: ny });
        next.push({ x: nx, y: ny, d: cell.d + 1 });
      }
    }
    frontier = next;
  }
  return out;
}

function computeAttackable(unit, fromX, fromY) {
  return battle.units
    .filter(u => u.alive && u.side !== unit.side && chebyshev(fromX, fromY, u.x, u.y) <= unit.range)
    .map(u => ({ x: u.x, y: u.y }));
}

function moveUnit(unit, x, y) { unit.x = x; unit.y = y; }

function resolveAttack(attacker, defender) {
  defender.hp = Math.max(0, defender.hp - attacker.atk);
  logMsg(`${attacker.card.name} → ${defender.card.name} (-${attacker.atk})`);
  if (defender.hp <= 0) {
    defender.alive = false;
    logMsg(`${defender.card.name} məğlub oldu.`);
  }
}

/* ═══════════════════════════════════════════════════════
   PLAYER INPUT
═══════════════════════════════════════════════════════ */
function onCellClick(x, y) {
  if (!battle || !battle.awaitingInput) return;
  const unit = battle.active;
  if (!unit || unit.side !== 'p' || unit.hasActed) return;

  const target = getUnitAt(x, y);

  // Attack an enemy currently in range
  if (target && target.side !== unit.side && battle.attackable.some(p => p.x === x && p.y === y)) {
    resolveAttack(unit, target);
    unit.hasActed = true;
    finalizeUnitTurn();
    return;
  }

  // Move to an empty reachable tile
  if (!target && !unit.hasMoved && battle.reachable.some(p => p.x === x && p.y === y)) {
    moveUnit(unit, x, y);
    unit.hasMoved = true;
    battle.reachable = [];
    battle.attackable = computeAttackable(unit, unit.x, unit.y);
    renderBoard();
  }
}

document.addEventListener('click', e => {
  if (e.target && e.target.id === 'battle-end-turn-btn') finalizeUnitTurn();
  if (e.target && e.target.id === 'battle-start-btn') startBattle();
  if (e.target && e.target.id === 'battle-restart-btn') restartBattle();
});

/* ═══════════════════════════════════════════════════════
   SIMPLE AI
═══════════════════════════════════════════════════════ */
function aiTakeTurn(unit) {
  if (!unit.alive || battle.over) { finalizeUnitTurn(); return; }

  const targets = battle.units.filter(u => u.alive && u.side !== unit.side);
  if (!targets.length) { finalizeUnitTurn(); return; }

  let target = targets.reduce((best, t) =>
    chebyshev(unit.x, unit.y, t.x, t.y) < chebyshev(unit.x, unit.y, best.x, best.y) ? t : best
  );

  if (chebyshev(unit.x, unit.y, target.x, target.y) > unit.range) {
    const options = [{ x: unit.x, y: unit.y }, ...computeReachable(unit)];
    const bestCell = options.reduce((best, c) =>
      chebyshev(c.x, c.y, target.x, target.y) < chebyshev(best.x, best.y, target.x, target.y) ? c : best
    );
    moveUnit(unit, bestCell.x, bestCell.y);
  }

  if (chebyshev(unit.x, unit.y, target.x, target.y) <= unit.range) {
    resolveAttack(unit, target);
  }

  unit.hasActed = true;
  finalizeUnitTurn();
}

/* ═══════════════════════════════════════════════════════
   WIN CHECK
═══════════════════════════════════════════════════════ */
function checkWin() {
  const pAlive = battle.units.some(u => u.side === 'p' && u.alive);
  const eAlive = battle.units.some(u => u.side === 'e' && u.alive);
  if (pAlive && eAlive) return false;

  battle.over = true;
  const title = pAlive ? 'QƏLƏBƏ — Azure Core qazandı' : 'MƏĞLUBİYYƏT — Crimson Crown qazandı';
  document.getElementById('battle-result-title').textContent = title;
  document.getElementById('battle-arena').style.display  = 'block';
  document.getElementById('battle-result').style.display = 'block';
  renderBoard();
  return true;
}

/* ═══════════════════════════════════════════════════════
   RENDER
═══════════════════════════════════════════════════════ */
function updateTurnInfo(unit) {
  const el = document.getElementById('battle-turn-info');
  const faction = unit.side === 'p' ? 'Azure Core' : 'Crimson Crown';
  el.textContent = `${faction} növbəsi: ${unit.card.name}`;
}

function logMsg(text) {
  const log = document.getElementById('battle-log');
  const line = document.createElement('div');
  line.textContent = text;
  log.prepend(line);
}

function renderBoard() {
  const board = document.getElementById('battle-board');
  board.innerHTML = '';
  board.style.gridTemplateColumns = `repeat(${BOARD_COLS}, 1fr)`;

  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      const cell = document.createElement('div');
      cell.className = 'battle-cell';
      if (battle.reachable.some(p => p.x === x && p.y === y))  cell.classList.add('reachable');
      if (battle.attackable.some(p => p.x === x && p.y === y)) cell.classList.add('attackable');

      const unit = getUnitAt(x, y);
      if (unit) {
        const u = document.createElement('div');
        u.className = `battle-unit side-${unit.side}${unit === battle.active ? ' active' : ''}`;
        u.innerHTML = `
          <img src="${getCardImg(unit.card)}" alt="${unit.card.name}" onerror="this.style.display='none'">
          <div class="battle-hp-bar"><div class="battle-hp-fill" style="width:${(unit.hp/unit.maxHp)*100}%"></div></div>`;
        cell.appendChild(u);
      }

      cell.addEventListener('click', () => onCellClick(x, y));
      board.appendChild(cell);
    }
  }
}
