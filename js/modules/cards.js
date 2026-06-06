/* ═══════════════════════════════════════════════════════
   js/modules/cards.js
   Card database – fetch, filter, render
═══════════════════════════════════════════════════════ */

/* Local asset base – no GitHub raw needed when running from ZIP */
const GITHUB_BASE = 'assets';

const RARITY_FILES = ['mundane', 'familiar', 'arcane', 'relic', 'ascendant', 'apex', 'ethereal'];

let allCards    = [];
let activeRarity = 'all';
let filtersReady = false;

/* ── Transliterate non-ASCII characters for file paths ── */
function slugify(str) {
  return (str || '')
    .toLowerCase()
    .replace(/İ/g, 'i').replace(/ı/g, 'i')
    .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u').replace(/ü/g, 'u')
    .replace(/Ş/g, 's').replace(/ş/g, 's')
    .replace(/Ö/g, 'o').replace(/ö/g, 'o')
    .replace(/Ç/g, 'c').replace(/ç/g, 'c')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

/* ── Build the image URL for a card ── */
function getCardImg(card) {
  /* isDual cards carry group on type1; fall back gracefully */
  const src   = (card.isDual && card.type1) ? card.type1 : card;
  const group = slugify(src.group || card.group || '');
  const name  = slugify(src.name  || card.name  || '');
  return group
    ? `${GITHUB_BASE}/${group}/${name}.jpg`
    : `${GITHUB_BASE}/${name}.jpg`;
}

/* ── Power Score helpers ── */
function _toNum(v) {
  if (!v || v === '-') return 0;
  const s = String(v).split('/')[0].replace(',', '.').replace(/[s%x]/gi, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function _aspd(v) {
  if (!v || v === '-') return 1;
  const s = String(v).split('/')[0].replace(',', '.').replace('s', '').trim();
  const n = parseFloat(s);
  return (isNaN(n) || n <= 0) ? 1 : n;
}
function _dmg(v) {
  if (!v || v === '-') return 0;
  const first = String(v).split('/')[0].trim();
  if (first.includes('x')) {
    const [a, b] = first.split('x');
    return (parseFloat(a) || 1) * (parseFloat(b) || 1);
  }
  return _toNum(first);
}

function calcCardPower(card) {
  const s  = card.stats || {};
  const as = card.additionalStats || {};
  const hp      = _toNum(s.health);
  const shield  = _toNum(s.shield);
  const atk     = _dmg(s.damage);
  const aspd    = _aspd(s.attackSpeed);
  const count   = _toNum(s.number) || 1;
  const dps     = aspd > 0 ? atk / aspd : 0;
  const range   = _toNum(as.range);
  const speed   = _toNum(as.speed);
  const crit    = _toNum(as.criticalChance);
  const critDmg = _toNum(as.criticDamage) || 1.5;
  const dodge   = _toNum(as.dodge);
  const ls      = _toNum(as.lifesteal);
  const dmgMin  = _toNum(as.damageminimiser);

  let base =
    (hp + shield) * 0.45 +
    dps * 7 +
    range / 120 +
    speed / 25 +
    dodge * 4 +
    ls * 2 +
    dmgMin * 5;
  base *= 1 + (crit / 100) * (critDmg - 1);
  if (count > 1) base *= 1 + (count - 1) * 0.6;
  return Math.round(base);
}

/* Raw power scores are computed once after all cards load, then scaled 100–1000 */
let _minPow = 0, _maxPow = 1;

function computeAllPowerScores(cards) {
  /* Flatten: normal cards + forms inside dual cards */
  const flat = [];
  for (const c of cards) {
    if (c.isDual) {
      if (c.type1) flat.push(c.type1);
      if (c.type2) flat.push(c.type2);
    } else {
      flat.push(c);
    }
  }
  const raws = flat.map(calcCardPower).filter(p => p > 0);
  _minPow = Math.min(...raws);
  _maxPow = Math.max(...raws);
}

function scaledPower(card) {
  let raw;
  if (card.isDual) {
    const p1 = card.type1 ? calcCardPower(card.type1) : 0;
    const p2 = card.type2 ? calcCardPower(card.type2) : 0;
    raw = Math.round((p1 + p2) / 2);
  } else {
    raw = calcCardPower(card);
  }
  if (_maxPow === _minPow) return 550;
  return Math.round(100 + ((raw - _minPow) / (_maxPow - _minPow)) * 900);
}

/* Power Score bar color: grey→green→yellow→red */
function powerColor(score) {
  if (score >= 800) return '#f87171';   /* red   – OP */
  if (score >= 500) return '#facc15';   /* gold  – strong */
  if (score >= 300) return '#4ade80';   /* green – average */
  return '#6b7280';                      /* grey  – weak */
}

/* ── Rarity emoji map ── */
function getRarityEmoji(r) {
  return { mundane:'⚙', familiar:'🌿', arcane:'🔮', relic:'📿',
           ascendant:'🔥', apex:'👑', ethereal:'✨' }[(r||'').toLowerCase()] || '⚔';
}

/* ── Entry point called by navigation.js ── */
async function initCards() {
  if (allCards.length === 0) {
    const grid = document.getElementById('cards-grid');
    grid.innerHTML = '<div class="no-results">Loading entity registry…</div>';

    try {
      const results = await Promise.all(
        RARITY_FILES.map(r =>
          fetch(`rarity/${r}.json`)
            .then(res => res.ok ? res.json() : [])
            .catch(() => [])
        )
      );
      allCards = results.flat();
      computeAllPowerScores(allCards);
    } catch (e) {
      console.error('Card load error:', e);
      document.getElementById('cards-grid').innerHTML =
        '<div class="no-results">Could not load card data.</div>';
      return;
    }
  }

  renderCards();

  if (!filtersReady) {
    setupCardFilters();
    filtersReady = true;
  }
}

/* ── Wire up filter buttons & search ── */
function setupCardFilters() {
  document.querySelectorAll('.filter-btn[data-rarity]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.filter-btn[data-rarity]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeRarity = btn.dataset.rarity;
      renderCards();
    };
  });

  document.getElementById('card-search').oninput = () => renderCards();
}

/* ── Render filtered card list ── */
function renderCards() {
  const grid   = document.getElementById('cards-grid');
  const search = document.getElementById('card-search').value.toLowerCase().trim();
  const count  = document.getElementById('card-count');

  let filtered = allCards;
  if (activeRarity !== 'all')
    filtered = filtered.filter(c => (c.rarity || '').toLowerCase() === activeRarity);
  if (search)
    filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(search));

  count.textContent = filtered.length;

  if (!filtered.length) {
    grid.innerHTML = '<div class="no-results">No entities found matching your filters.</div>';
    return;
  }

  grid.innerHTML = '';
  filtered.forEach((card, i) => grid.appendChild(createCardEl(card, i)));
}

/* ── Build a single card element ── */
function createCardEl(card, idx) {
  const rarity = (card.rarity || 'mundane').toLowerCase();
  const stats  = card.stats || {};
  const imgUrl = getCardImg(card);
  const mana   = stats.mana !== undefined ? stats.mana : '?';
  const ps     = scaledPower(card);
  const pcol   = powerColor(ps);

  const el = document.createElement('div');
  el.className = `card-item r-${rarity}`;
  el.style.animationDelay = `${idx * 0.04}s`;

  el.innerHTML = `
    <div class="card-rarity-bar"></div>
    <div class="card-img-wrap">
      <img src="${imgUrl}" alt="${card.name}" loading="lazy"
           onerror="this.style.display='none';
                    this.parentElement.querySelector('.card-img-placeholder').style.display='flex';">
      <div class="card-img-overlay"></div>
      <div class="card-img-placeholder" style="display:none">${getRarityEmoji(rarity)}</div>
      <div class="card-mana-badge">${mana}</div>
    </div>
    <div class="card-body">
      <div class="card-name">${card.name || 'Unknown'}</div>
      <div class="card-group-tag">${card.group || 'Stagnantia'}</div>
      ${card.abilityName && card.abilityName !== '—' ? `<div class="card-ability-tag">⚔ ${card.abilityName}</div>` : ''}
      <div class="card-mini-stats">
        ${stats.health !== undefined ? `<div class="mini-stat"><span class="mini-stat-icon">❤</span><span class="mini-stat-val">${stats.health}</span></div>` : ''}
        ${stats.damage !== undefined ? `<div class="mini-stat"><span class="mini-stat-icon">⚔</span><span class="mini-stat-val">${stats.damage}</span></div>` : ''}
        ${stats.shield !== undefined ? `<div class="mini-stat"><span class="mini-stat-icon">🛡</span><span class="mini-stat-val">${stats.shield}</span></div>` : ''}
      </div>
      <div class="card-power-wrap">
        <div class="card-power-label">PWR <span class="card-power-num" style="color:${pcol}">${ps}</span><span class="card-power-max">/1000</span></div>
        <div class="card-power-bar-bg"><div class="card-power-bar-fill" style="width:${ps / 10}%;background:${pcol}"></div></div>
      </div>
    </div>
    <div class="card-rarity-tag">${card.rarity || ''}</div>
  `;

  el.addEventListener('click', () => openModal(card));
  return el;
}
