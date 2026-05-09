/* ═══════════════════════════════════════════════════════
   js/core/modal.js
═══════════════════════════════════════════════════════ */

const modal      = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ── Primary stats ── */
const STAT_DEFS = [
  { key: 'health', label: 'Health',  icon: '❤', max: 1000, color: '#f87171' },
  { key: 'shield', label: 'Shield',  icon: '🛡', max: 1000, color: '#60a5fa' },
  { key: 'damage', label: 'Damage',  icon: '⚔', max: 200,  color: '#fb923c' },
  { key: 'attackSpeed', label: 'Attack Speed',  icon: '⚔', max: 5,  color: '#fb923c' },
  { key: 'delay', label: 'Delay',  icon: '⚔', max: 200,  color: '#fb923c' },
  { key: 'sps',    label: 'DPS',     icon: '💥', max: 500,  color: '#f472b6' },
  { key: 'mana',   label: 'Mana',    icon: '🔮', max: 20,   color: '#a78bfa' },
  { key: 'number',   label: 'Count',    icon: '🔮', max: 15,   color: '#a78bfa' },
];

/* ── Secondary / additional stats ── */
const ADD_STAT_DEFS = [
  { key: 'range',           label: 'Range',            icon: '🎯', max: 30000, color: '#f87171',  suffix: ''  },
  { key: 'speed',           label: 'Speed',            icon: '⚡', max: 5000,  color: '#60a5fa',  suffix: ''  },
  { key: 'criticalChance',  label: 'Critical Chance',  icon: '🗡', max: 100,   color: '#fb923c',  suffix: '%' },
  { key: 'criticDamage',    label: 'Critical Damage',  icon: '💥', max: 5,     color: '#f472b6',  suffix: 'x' },
  { key: 'lifestealChance', label: 'Lifesteal Chance', icon: '🩸', max: 100,   color: '#a78bfa',  suffix: '%' },
  { key: 'lifesteal',       label: 'Lifesteal',        icon: '💚', max: 100,   color: '#4ade80',  suffix: '%' },
  { key: 'damageminimiser', label: 'Damage Reduction', icon: '🛡', max: 90,    color: '#fbbf24',  suffix: '%' },
  { key: 'dodge',           label: 'Dodge Chance',     icon: '👁', max: 70,    color: '#c084fc',  suffix: '%' },
];

/* ── Build stat bar rows ── */
function buildStatBars(defs, source) {
  return defs
    .filter(s => source[s.key] !== undefined)
    .map(s => {
      const raw = parseFloat(String(source[s.key]).replace(/[^0-9.]/g, '')) || 0;
      const pct = Math.min(100, (raw / s.max) * 100);
      return `
        <div class="stat-bar-row">
          <div class="stat-label-sm">${s.icon} ${s.label}</div>
          <div class="stat-bar-track">
            <div class="stat-bar-fill"
                 style="width:${pct}%;background:${s.color};box-shadow:0 0 8px ${s.color}60">
            </div>
          </div>
          <div class="stat-val-sm">${source[s.key]}</div>
        </div>`;
    })
    .join('');
}

/* ── Build star level rows ── */
function buildStarLevels(levels) {
  if (!levels) return '<p class="no-stat-msg">No level data available.</p>';

  const stars = [
    { key: 'level1', icon: '⭐',     label: 'Level 1', color: '#facc15' },
    { key: 'level2', icon: '⭐⭐',   label: 'Level 2', color: '#f97316' },
    { key: 'level3', icon: '⭐⭐⭐', label: 'Level 3', color: '#a855f7' },
  ];

  return stars.map(s => {
    const text = levels[s.key];
    if (!text || text === '-') {
      return `
        <div class="star-level-row star-level-empty">
          <div class="star-level-icon">${s.icon}</div>
          <div class="star-level-info">
            <div class="star-level-label" style="color:${s.color}">${s.label}</div>
            <div class="star-level-text">—</div>
          </div>
        </div>`;
    }
    /* Split "description | before » after" */
    const parts = text.split('|');
    const desc  = parts[0]?.trim() || text;
    const range = parts[1]?.trim() || '';
    return `
      <div class="star-level-row">
        <div class="star-level-icon">${s.icon}</div>
        <div class="star-level-info">
          <div class="star-level-label" style="color:${s.color}">${s.label}</div>
          <div class="star-level-text">${desc}</div>
          ${range ? `<div class="star-level-range">${range}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

/* ── Open modal ── */
function openModal(card) {
  const rarity   = (card.rarity || 'mundane').toLowerCase();
  const stats    = card.stats || {};
  const addStats = card.additionalStats || {};
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

  const primaryBars   = buildStatBars(STAT_DEFS, stats);
  const secondaryBars = buildStatBars(ADD_STAT_DEFS, addStats);

  const trait = card.trait || card.note || null;
  const story = card.story && card.story !== '-' ? card.story : null;

  document.getElementById('modal-content').innerHTML = `
    <span class="modal-rarity-badge"
          style="color:${rarColor};border-color:${rarColor}40;background:${rarColor}15">
      ${card.rarity || ''}
    </span>
    <div class="modal-card-name">${card.name || 'Unknown'}</div>
    <div class="modal-card-group">✦ ${card.group || 'Stagnantia'} ✦</div>

    <!-- Tab buttons -->
    <div class="stat-tab-row">
      <button class="stat-tab active" data-tab="primary">⚔ Combat Stats</button>
      <button class="stat-tab" data-tab="secondary">📊 Advanced Stats</button>
      <button class="stat-tab" data-tab="levels">⭐ Star Levels</button>
    </div>

    <!-- Primary stats panel -->
    <div class="stat-panel" id="panel-primary">
      ${primaryBars || '<p class="no-stat-msg">No stats available.</p>'}
    </div>

    <!-- Secondary stats panel -->
    <div class="stat-panel" id="panel-secondary" style="display:none">
      ${secondaryBars || '<p class="no-stat-msg">No advanced stats available.</p>'}
    </div>

    <!-- Star Levels panel -->
    <div class="stat-panel" id="panel-levels" style="display:none">
      ${buildStarLevels(card.showlevels)}
    </div>

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

  /* Tab switching */
  document.querySelectorAll('.stat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.stat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById('panel-primary').style.display   = tab === 'primary'   ? 'block' : 'none';
      document.getElementById('panel-secondary').style.display = tab === 'secondary' ? 'block' : 'none';
      document.getElementById('panel-levels').style.display    = tab === 'levels'    ? 'block' : 'none';
    });
  });

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('open');
  document.body.style.overflow = '';
}
