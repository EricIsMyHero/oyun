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

/* ── Spell stat bar builder ── */
const SPELL_STAT_DEFS = [
  { key: 'damageToCard',      label: 'Karta Hasar',  icon: '💥', max: 1000, color: '#f87171' },
  { key: 'damageToCastle',    label: 'Qala Hasar',   icon: '🏰', max: 500,  color: '#fb923c' },
  { key: 'health',            label: 'Can',           icon: '❤️', max: 1000, color: '#4ade80' },
  { key: 'range',             label: 'Menzil',        icon: '🏹', max: 5000, color: '#60a5fa' },
  { key: 'attackSpeed',       label: 'Atk Sürəti',   icon: '⏳', max: 5,    color: '#fb923c' },
  { key: 'timeBetweenDamage', label: 'İnterval',     icon: '⏱️', max: 5,    color: '#fbbf24' },
  { key: 'lifetime',          label: 'Ömür',          icon: '⌛', max: 200,  color: '#a78bfa' },
  { key: 'size',              label: 'Ölçü',          icon: '📐', max: 10,   color: '#94a3b8' },
];

function buildSpellStatBars(stats) {
  return SPELL_STAT_DEFS
    .filter(s => stats[s.key] && stats[s.key] !== '-')
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
}

/* ── Form switcher for isMulti spells ── */
function buildSpellFormSwitcher(spell, activeIndex) {
  if (!spell.forms || !spell.forms.length) return '';
  const buttons = [
    `<button class="form-switch-btn spell-form-btn ${activeIndex === -1 ? 'active' : ''}"
             data-spell-form-index="-1">📜 ${spell.name}</button>`
  ].concat(
    spell.forms.map((f, i) =>
      `<button class="form-switch-btn spell-form-btn ${activeIndex === i ? 'active' : ''}"
               data-spell-form-index="${i}">🃏 ${f.name}</button>`
    )
  ).join('');

  return `
    <div class="form-switcher spell-form-switcher">
      <div class="form-switcher-label">🃏 Formlar</div>
      <div class="form-switcher-btns">${buttons}</div>
    </div>`;
}

/* ── Modal renderer for spells ── */
function renderSpellModal(spell, activeFormIndex) {
  const rarity = (spell.rarity || 'common').toLowerCase();
  const stats  = spell.stats || {};
  const energy = stats.energy;
  const charge = stats.charge;

  const rarColorMap = {
    legendary: 'var(--apex)',
    epic:      'var(--arcane)',
    rare:      'var(--familiar)',
    common:    'var(--mundane)',
  };
  const rarColor = rarColorMap[rarity] || '#7b9cff';

  const treat = spell.treat && spell.treat !== '-' ? spell.treat : null;
  const story = spell.story && spell.story !== '-' ? spell.story : null;

  /* Decide what content body to show */
  let bodyHtml = '';
  if (spell.isMulti && spell.forms && spell.forms.length && activeFormIndex >= 0) {
    const form = spell.forms[activeFormIndex];
    const fStats = { ...(form.stats || {}), ...(form.additionalStats || {}) };
    bodyHtml = `
      <div class="spell-modal-form-card">
        <div class="spell-modal-form-name">🃏 ${form.name}</div>
        ${form.type ? `<div class="spell-modal-form-type">${form.type}${form.note ? ' · ' + form.note : ''}</div>` : ''}
        <div class="spell-form-stat-bars">
          ${buildSpellStatBars(fStats) || '<p class="no-stat-msg">Stat yoxdur.</p>'}
        </div>
        ${form.trait ? `<div class="modal-section-label">Xüsusiyyət</div><div class="modal-trait-box">${form.trait}</div>` : ''}
        ${buildLoreBlock(form.story && form.story !== '-' ? form.story : null)}
      </div>`;
  } else {
    bodyHtml = `
      <div id="panel-primary">
        ${buildSpellStatBars(stats) || '<p class="no-stat-msg">Stat məlumatı yoxdur.</p>'}
      </div>
      ${treat ? `<div class="modal-section-label">Xüsusiyyət</div><div class="modal-trait-box">${treat}</div>` : ''}
      ${buildLoreBlock(story)}`;
  }

  document.getElementById('modal-content').innerHTML = `
    <span class="modal-rarity-badge"
          style="color:${rarColor};border-color:${rarColor}40;background:${rarColor}15">
      ${spell.rarity || ''}
    </span>
    <div class="modal-card-name">${spell.name || 'Unknown'}</div>
    <div class="modal-card-group">✦ ${spell.type || 'Spell'} ✦</div>

    <div class="spell-modal-badges">
      ${energy ? `<div class="spell-modal-energy">⚡ <span>${energy}</span> Enerji</div>` : ''}
      ${charge ? `<div class="spell-modal-charge">${'◆'.repeat(Math.min(charge, 5))} <span>${charge}</span> Yük</div>` : ''}
    </div>

    ${spell.isMulti && spell.forms ? buildSpellFormSwitcher(spell, activeFormIndex) : ''}

    ${bodyHtml}
  `;

  const activeLoreName = (spell.isMulti && spell.forms && spell.forms.length && activeFormIndex >= 0)
    ? spell.forms[activeFormIndex].name : spell.name;
  const activeLoreText = (spell.isMulti && spell.forms && spell.forms.length && activeFormIndex >= 0)
    ? (spell.forms[activeFormIndex].story && spell.forms[activeFormIndex].story !== '-' ? spell.forms[activeFormIndex].story : null)
    : story;
  wireLoreExpand(document.getElementById('modal-content'), activeLoreName, activeLoreText);

  /* Wire form switcher buttons */
  document.querySelectorAll('.spell-form-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.spellFormIndex, 10);
      renderSpellModal(spell, idx);
    });
  });
}

/* ── Build a single spell card element ── */
function createSpellEl(spell, idx) {
  const rarity = (spell.rarity || 'common').toLowerCase();
  const stats  = spell.stats || {};
  const energy = stats.energy;
  const charge = stats.charge;

  const el = document.createElement('div');
  el.className = `spell-item spell-${rarity}`;
  el.style.animationDelay = `${idx * 0.04}s`;

  const statPairs = [
    ['DMG',    stats.damageToCard],
    ['Qala',   stats.damageToCastle],
    ['Menzil', stats.range],
  ].filter(([, v]) => v && v !== '-');

  /* Charge dots */
  const maxChargeDots = 5;
  const chargeDots = charge
    ? Array.from({ length: maxChargeDots }, (_, i) =>
        `<span class="spell-charge-dot ${i < charge ? 'filled' : ''}"></span>`
      ).join('')
    : '';

  /* isMulti badge */
  const multiBadge = spell.isMulti
    ? `<span class="spell-multi-badge">🃏 Multi</span>`
    : '';

  el.innerHTML = `
    <div class="spell-top-left-badges">
      ${energy ? `<div class="spell-energy-pill">⚡ <strong>${energy}</strong></div>` : ''}
      ${charge ? `<div class="spell-charge-pill">
        <div class="spell-charge-dots">${chargeDots}</div>
        <span class="spell-charge-num">${charge} Yük</span>
      </div>` : ''}
    </div>
    <div class="spell-top">
      <div>
        <div class="spell-rarity-tag spell-rarity-${rarity}">
          ${spell.rarity || ''} · ${spell.type || ''}
        </div>
        <div class="spell-name">${spell.name || 'Unknown'} ${multiBadge}</div>
      </div>
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

  /* Click → spell modal */
  el.addEventListener('click', () => {
    const modal = document.getElementById('modal-overlay');
    const img   = document.getElementById('modal-img');
    const ph    = document.getElementById('modal-placeholder');

    img.style.display = 'none';
    ph.style.display  = 'flex';
    ph.textContent    = spell.type === 'Building' || spell.type === 'building' ? '🏛️' : '✨';

    const rarColorMap = {
      legendary: 'var(--apex)',
      epic:      'var(--arcane)',
      rare:      'var(--familiar)',
      common:    'var(--mundane)',
    };
    const rarColor = rarColorMap[rarity] || '#7b9cff';
    document.getElementById('modal-img-rarity').style.background =
      `linear-gradient(90deg, ${rarColor}, transparent)`;

    const activeFormIndex = spell.isMulti && spell.forms && spell.forms.length ? -1 : null;
    renderSpellModal(spell, activeFormIndex);

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  return el;
}
