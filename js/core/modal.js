/* ═══════════════════════════════════════════════════════
   js/core/modal.js
   Card detail overlay – open / close / render
═══════════════════════════════════════════════════════ */

const modal   = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ── Stat definitions for the bar chart inside the modal ── */
const STAT_DEFS = [
  { key: 'health', label: 'Health', icon: '❤', max: 5000, color: '#f87171' },
  { key: 'shield', label: 'Shield', icon: '🛡', max: 3000, color: '#60a5fa' },
  { key: 'damage', label: 'Damage', icon: '⚔', max: 500,  color: '#fb923c' },
  { key: 'sps',    label: 'DPS',    icon: '💥', max: 300,  color: '#f472b6' },
  { key: 'mana',   label: 'Mana',   icon: '🔮', max: 10,   color: '#a78bfa' },
  { key: 'speed',  label: 'Speed',  icon: '⚡', max: 500,  color: '#4ade80' },
  { key: 'range',  label: 'Range',  icon: '🎯', max: 3000, color: '#fbbf24' },
];

/* ── Open the modal for a given card object ── */
function openModal(card) {
  const rarity   = (card.rarity || 'mundane').toLowerCase();
  const stats    = card.stats || {};
  const imgUrl   = getCardImg(card);
  const rarColor = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${rarity}`).trim() || '#7b9cff';

  /* Image */
  const img     = document.getElementById('modal-img');
  const pholder = document.getElementById('modal-placeholder');

  img.src = imgUrl;
  img.style.display    = 'block';
  pholder.style.display = 'none';
  img.onerror = () => { img.style.display = 'none'; pholder.style.display = 'flex'; };

  document.getElementById('modal-img-rarity').style.background =
    `linear-gradient(90deg, ${rarColor}, transparent)`;

  /* Stat bars */
  const statBars = STAT_DEFS
    .filter(s => stats[s.key] !== undefined)
    .map(s => {
      const raw = parseFloat(String(stats[s.key]).replace(/[^0-9.]/g, '')) || 0;
      const pct = Math.min(100, (raw / s.max) * 100);
      return `
        <div class="stat-bar-row">
          <div class="stat-label-sm">${s.icon} ${s.label}</div>
          <div class="stat-bar-track">
            <div class="stat-bar-fill"
                 style="width:${pct}%;background:${s.color};box-shadow:0 0 8px ${s.color}60">
            </div>
          </div>
          <div class="stat-val-sm">${stats[s.key]}</div>
        </div>`;
    })
    .join('');

  const trait = card.trait || card.note || null;
  const story = card.story && card.story !== '-' ? card.story : null;

  document.getElementById('modal-content').innerHTML = `
    <span class="modal-rarity-badge"
          style="color:${rarColor};border-color:${rarColor}40;background:${rarColor}15">
      ${card.rarity || ''}
    </span>
    <div class="modal-card-name">${card.name || 'Unknown'}</div>
    <div class="modal-card-group">✦ ${card.group || 'Stagnantia'} ✦</div>

    ${statBars ? `<div class="modal-section-label">Combat Statistics</div>${statBars}` : ''}

    ${trait ? `
      <div class="modal-section-label">Ability</div>
      <div class="modal-trait-box">${trait}</div>` : ''}

    ${story ? `
      <div class="modal-section-label">Lore</div>
      <div class="modal-story-box">${story}</div>` : ''}

    <button class="modal-lore-link">
      ✦ This entity belongs to the ${card.group || 'Stagnantia'} faction
    </button>
  `;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('open');
  document.body.style.overflow = '';
}
