/* ═══════════════════════════════════════════════════════
   js/modules/spells.js
   Spell archive – fetch, filter, render
═══════════════════════════════════════════════════════ */

let allSpells        = [];
let activeSpellRarity = 'all';
let activeSpellType   = 'all';
let spellFiltersReady = false;

/* ── Entry point ── */
async function initSpells() {
  if (allSpells.length === 0) {
    document.getElementById('spells-grid').innerHTML =
      '<div class="no-results">Loading arcane archive…</div>';

    try {
      const res = await fetch('data/spells.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      allSpells = await res.json();
    } catch (e) {
      console.error('Spell load error:', e);
      document.getElementById('spells-grid').innerHTML =
        '<div class="no-results">Could not load spell data.</div>';
      return;
    }
  }

  renderSpells();

  if (!spellFiltersReady) {
    setupSpellFilters();
    spellFiltersReady = true;
  }
}

/* ── Wire filter buttons ── */
function setupSpellFilters() {
  document.querySelectorAll('.spell-filter').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.spell-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeSpellRarity = btn.dataset.filter;
      renderSpells();
    };
  });

  document.querySelectorAll('.spell-type').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.spell-type').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeSpellType = btn.dataset.type;
      renderSpells();
    };
  });
}

/* ── Render filtered spell list ── */
function renderSpells() {
  const grid  = document.getElementById('spells-grid');
  const count = document.getElementById('spell-count');

  let filtered = allSpells;
  if (activeSpellRarity !== 'all')
    filtered = filtered.filter(s => (s.rarity || '').toLowerCase() === activeSpellRarity);
  if (activeSpellType !== 'all')
    filtered = filtered.filter(s => (s.type || '').toLowerCase() === activeSpellType.toLowerCase());

  count.textContent = filtered.length;

  if (!filtered.length) {
    grid.innerHTML = '<div class="no-results">No spells found matching your filters.</div>';
    return;
  }

  grid.innerHTML = '';
  filtered.forEach((spell, i) => grid.appendChild(createSpellEl(spell, i)));
}

/* ── Build a single spell element ── */
function createSpellEl(spell, idx) {
  const rarity = (spell.rarity || 'common').toLowerCase();
  const stats  = spell.stats || {};

  const el = document.createElement('div');
  el.className = `spell-item spell-${rarity}`;
  el.style.animationDelay = `${idx * 0.04}s`;

  const statPairs = [
    ['DMG',    stats.damageToCard],
    ['Castle', stats.damageToCastle],
    ['Range',  stats.range],
    ['Energy', stats.energy],
  ].filter(([, v]) => v && v !== '-');

  el.innerHTML = `
    <div class="spell-top">
      <div>
        <div class="spell-rarity-tag spell-rarity-${rarity}">
          ${spell.rarity || ''} · ${spell.type || ''}
        </div>
        <div class="spell-name">${spell.name || 'Unknown'}</div>
      </div>
      ${stats.energy ? `<div class="spell-energy-badge">⚡ ${stats.energy}</div>` : ''}
    </div>
    ${spell.treat ? `<p class="spell-treat">${spell.treat}</p>` : ''}
    <div class="spell-stats-row">
      ${statPairs.map(([l, v]) => `
        <div class="spell-stat">
          <span class="spell-stat-label">${l}</span>
          <span class="spell-stat-val">${v}</span>
        </div>`).join('')}
    </div>
  `;

  return el;
}
