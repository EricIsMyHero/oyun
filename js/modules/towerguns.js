/* ═══════════════════════════════════════════════════════
   js/modules/towerguns.js
   Tower Guns – fetch and render (data/towerguns.json)
═══════════════════════════════════════════════════════ */

let allTowerGuns = [];
let towerGunsLoaded = false;

/* Known stats get a nicer label; any other key inside "stats" is still shown. */
const TG_STAT_LABELS = {
  damage:      '💥 Damage',
  range:       '🏹 Range',
  attackSpeed: '⏳ Attack Speed',
  sps:         '⚡ D.P.S.',
  health:      '❤️ Health',
  shield:      '🛡️ Shield',
  cost:        '🔮 Cost',
};

function _tgEsc(v) {
  return String(v).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ── Entry point ── */
async function initTowerGuns() {
  const grid = document.getElementById('tg-grid');

  if (!towerGunsLoaded) {
    grid.innerHTML = '<div class="no-results">Loading tower guns…</div>';
    try {
      const res = await fetch('data/towerguns.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      allTowerGuns = await res.json();
      towerGunsLoaded = true;
    } catch (e) {
      console.error('Tower gun load error:', e);
      grid.innerHTML = '<div class="no-results">Could not load tower gun data.</div>';
      return;
    }
  }

  renderTowerGuns();
}

/* ── Render list ── */
function renderTowerGuns() {
  const grid  = document.getElementById('tg-grid');
  const count = document.getElementById('tg-count');

  count.textContent = allTowerGuns.length;

  if (!allTowerGuns.length) {
    grid.innerHTML = '<div class="no-results">No tower guns have been added yet.</div>';
    return;
  }

  grid.innerHTML = allTowerGuns.map(g => {
    const rarity = String(g.rarity || '').toLowerCase();
    const stats  = Object.entries(g.stats || {})
      .filter(([, v]) => v !== '' && v !== '-' && v != null)
      .map(([k, v]) => `
        <div class="tg-stat">
          <span class="tg-stat-label">${_tgEsc(TG_STAT_LABELS[k] || k)}</span>
          <span class="tg-stat-val">${_tgEsc(v)}</span>
        </div>`).join('');

    return `
      <article class="tg-card${rarity ? ' tg-card--' + _tgEsc(rarity) : ''}">
        <div class="tg-name">${_tgEsc(g.name || 'Unnamed')}</div>
        ${rarity ? `<div class="tg-rarity">${_tgEsc(rarity)}</div>` : ''}
        ${g.trait ? `<p class="tg-trait">${_tgEsc(g.trait)}</p>` : ''}
        ${stats ? `<div class="tg-stats">${stats}</div>` : ''}
      </article>`;
  }).join('');
}
