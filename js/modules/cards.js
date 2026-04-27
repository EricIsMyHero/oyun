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

/* ── Build the image URL for a card ── */
function getCardImg(card) {
  const group = (card.group || '').toLowerCase().replace(/\s+/g, '-');
  const name  = (card.name  || '').toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
  return group
    ? `${GITHUB_BASE}/${group}/${name}.jpg`
    : `${GITHUB_BASE}/${name}.jpg`;
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
      <div class="card-mini-stats">
        ${stats.health !== undefined ? `<div class="mini-stat"><span class="mini-stat-icon">❤</span><span class="mini-stat-val">${stats.health}</span></div>` : ''}
        ${stats.damage !== undefined ? `<div class="mini-stat"><span class="mini-stat-icon">⚔</span><span class="mini-stat-val">${stats.damage}</span></div>` : ''}
        ${stats.shield !== undefined ? `<div class="mini-stat"><span class="mini-stat-icon">🛡</span><span class="mini-stat-val">${stats.shield}</span></div>` : ''}
      </div>
    </div>
    <div class="card-rarity-tag">${card.rarity || ''}</div>
  `;

  el.addEventListener('click', () => openModal(card));
  return el;
}
