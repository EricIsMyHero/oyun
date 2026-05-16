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
  { key: 'health',      label: 'Health',       icon: '❤️',  max: 1000, color: '#f87171' },
  { key: 'shield',      label: 'Shield',       icon: '🛡️',  max: 1000, color: '#60a5fa' },
  { key: 'damage',      label: 'Damage',       icon: '💥',  max: 200,  color: '#fb923c' },
  { key: 'attackSpeed', label: 'Attack Speed', icon: '⏳',  max: 5,    color: '#fb923c' },
  { key: 'delay',       label: 'Delay',        icon: '⏱️',  max: 200,  color: '#fb923c' },
  { key: 'sps',         label: 'DPS',          icon: '🔥',  max: 500,  color: '#f472b6' },
  { key: 'mana',        label: 'Mana',         icon: '💧',  max: 20,   color: '#a78bfa' },
  { key: 'number',      label: 'Count',        icon: '🔢',  max: 15,   color: '#a78bfa' },
];

/* ── Secondary / additional stats ── */
const ADD_STAT_DEFS = [
  { key: 'range',           label: 'Range',            icon: '🏹',  max: 30000, color: '#f87171', suffix: ''  },
  { key: 'speed',           label: 'Speed',            icon: '👟',  max: 5000,  color: '#60a5fa', suffix: ''  },
  { key: 'criticalChance',  label: 'Critical Chance',  icon: '🎯',  max: 100,   color: '#fb923c', suffix: '%' },
  { key: 'criticDamage',    label: 'Critical Damage',  icon: '🧨',  max: 5,     color: '#f472b6', suffix: 'x' },
  { key: 'lifestealChance', label: 'Lifesteal Chance', icon: '🧛',  max: 100,   color: '#a78bfa', suffix: '%' },
  { key: 'lifesteal',       label: 'Lifesteal',        icon: '🩸',  max: 100,   color: '#4ade80', suffix: '%' },
  { key: 'damageminimiser', label: 'Damage Reduction', icon: '🔰',  max: 90,    color: '#fbbf24', suffix: '%' },
  { key: 'dodge',           label: 'Dodge Chance',     icon: '💨',  max: 70,    color: '#c084fc', suffix: '%' },
];

/* ════════════════════════════════════════════════════════
   BUILDER HELPERS  (pure — no DOM reads, safe call order)
════════════════════════════════════════════════════════ */

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

function buildStarLevels(levels) {
  if (!levels) return '<p class="no-stat-msg">No level data available.</p>';
  const stars = [
    { key: 'level1', icon: '⭐',     label: 'Level 1', color: '#facc15' },
    { key: 'level2', icon: '⭐⭐',   label: 'Level 2', color: '#f97316' },
    { key: 'level3', icon: '⭐⭐⭐', label: 'Level 3', color: '#a855f7' },
  ];
  return stars.map(s => {
    const text = levels[s.key];
    if (!text || text === '-') return `
        <div class="star-level-row star-level-empty">
          <div class="star-level-icon">${s.icon}</div>
          <div class="star-level-info">
            <div class="star-level-label" style="color:${s.color}">${s.label}</div>
            <div class="star-level-text">—</div>
          </div>
        </div>`;
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

function buildAscendedBanner(root, isAscended) {
  const secondForm = root.upgradedsecondForm;
  if (!secondForm) return '';
  if (isAscended) return `
      <div class="ascended-banner ascended-banner--active">
        <div class="ascended-banner-info">
          <span class="ascended-banner-icon">⚡</span>
          <div>
            <div class="ascended-banner-title">Ascended Form</div>
            <div class="ascended-banner-sub">Partnyor bonusu aktiv — ${secondForm.name}</div>
          </div>
        </div>
        <button class="ascended-toggle-btn ascended-toggle-btn--revert"
                id="ascended-toggle">↩ Base Form</button>
      </div>`;
  return `
    <div class="ascended-banner">
      <div class="ascended-banner-info">
        <span class="ascended-banner-icon">⚡</span>
        <div>
          <div class="ascended-banner-title">Ascended Form mövcuddur</div>
          <div class="ascended-banner-sub">Partnyor ilə → ${secondForm.name}</div>
        </div>
      </div>
      <button class="ascended-toggle-btn" id="ascended-toggle">⚡ Etki</button>
    </div>`;
}

function buildFormSwitcher(rootCard, activeIndex) {
  const forms = rootCard.forms;
  if (!forms || !forms.length) return '';
  const buttons = [
    `<button class="form-switch-btn ${activeIndex === -1 ? 'form-switch-btn--active' : ''}"
             data-form-index="-1">${rootCard.name}</button>`,
    ...forms.map((f, i) =>
      `<button class="form-switch-btn ${activeIndex === i ? 'form-switch-btn--active' : ''}"
               data-form-index="${i}">${f.name}</button>`)
  ].join('');
  return `
    <div class="form-switcher">
      <div class="form-switcher-label">🃏 Formlar</div>
      <div class="form-switcher-btns">${buttons}</div>
    </div>`;
}

/* ════════════════════════════════════════════════════════
   RENDER FUNCTIONS
════════════════════════════════════════════════════════ */

function updateModalImage(card, fallbackCard) {
  const imgUrl  = getCardImg(card) || (fallbackCard ? getCardImg(fallbackCard) : '');
  const img     = document.getElementById('modal-img');
  const pholder = document.getElementById('modal-placeholder');
  img.src = imgUrl;
  img.style.display     = 'block';
  pholder.style.display = 'none';
  img.onerror = () => { img.style.display = 'none'; pholder.style.display = 'flex'; };
}

/* Ethereal: dual-type selector screen */
function buildDualTypeSelector(card) {
  const t1       = card.type1;
  const t2       = card.type2;
  const rarColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--ethereal').trim() || '#f472b6';

  function statPreview(c) {
    const s = c.stats || {};
    return `
      <div class="dual-stat-row"><span>❤️ HP</span><span>${s.health || '—'}</span></div>
      <div class="dual-stat-row"><span>🛡️ Shield</span><span>${s.shield || '—'}</span></div>
      <div class="dual-stat-row"><span>💥 DMG</span><span>${s.damage || '—'}</span></div>
      <div class="dual-stat-row"><span>🔥 DPS</span><span>${s.sps || '—'}</span></div>`;
  }

  function spawnTag(c) {
    if (!c.forms || !c.forms.length) return '';
    return `<div class="dual-spawn-tag">🃏 ${c.forms.map(f => f.name).join(', ')}</div>`;
  }

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-rarity-class-row">
      <span class="modal-rarity-badge"
            style="color:${rarColor};border-color:${rarColor}40;background:${rarColor}15">
        Ethereal
      </span>
      ${card.class ? `<span class="modal-class-badge">${card.class}</span>${card.subclass ? `<span class="modal-subclass-badge">${card.subclass}</span>` : ''}` : ''}
    </div>
    <div class="modal-card-name">${card.name || 'Unknown'}</div>
    <div class="modal-card-group">✦ ${card.group || 'Stagnantia'} ✦</div>

    <div class="dual-selector-header">
      <span class="dual-selector-icon">🌀</span>
      <div>
        <div class="dual-selector-title">Dual Form Kartı</div>
        <div class="dual-selector-sub">Oyuna başlamazdan əvvəl bir forma seçin</div>
      </div>
    </div>

    <div class="dual-type-grid">
      <button class="dual-type-card" id="dual-pick-1">
        <div class="dual-type-badge"
             style="color:${rarColor};border-color:${rarColor}40;background:${rarColor}15">Type I</div>
        <div class="dual-type-name">${t1.class ? (t1.subclass ? `${t1.class} / ${t1.subclass}` : t1.class) : '—'}</div>
        <div class="dual-type-stats">${statPreview(t1)}</div>
        ${spawnTag(t1)}
        <div class="dual-type-cta">Seç →</div>
      </button>
      <button class="dual-type-card" id="dual-pick-2">
        <div class="dual-type-badge"
             style="color:${rarColor};border-color:${rarColor}40;background:${rarColor}15">Type II</div>
        <div class="dual-type-name">${t2.class ? (t2.subclass ? `${t2.class} / ${t2.subclass}` : t2.class) : '—'}</div>
        <div class="dual-type-stats">${statPreview(t2)}</div>
        ${spawnTag(t2)}
        <div class="dual-type-cta">Seç →</div>
      </button>
    </div>
  `;

  document.getElementById('dual-pick-1').addEventListener('click', () => {
    renderDualForm({ ...t1, group: card.group, _dualRoot: card });
  });
  document.getElementById('dual-pick-2').addEventListener('click', () => {
    renderDualForm({ ...t2, group: card.group, _dualRoot: card });
  });
}

/* Render a chosen dual type */
function renderDualForm(typeCard) {
  const activeFormIndex = typeCard.isMulti && typeCard.forms && typeCard.forms.length ? -1 : null;
  renderModalContent(typeCard, typeCard, activeFormIndex, typeCard._dualRoot);
  updateModalImage(typeCard, typeCard._dualRoot);
}

/* ── Main content renderer ──────────────────────────────
   card            : card whose stats are currently shown
   rootCard        : top-level card (owns forms[], upgradedsecondForm)
   activeFormIndex : -1=base  0..n=forms[i]  null=not-multi
   dualRoot        : original isDual card (back button); null otherwise
──────────────────────────────────────────────────────── */
function renderModalContent(card, rootCard, activeFormIndex, dualRoot) {
  const rarity   = (card.rarity || 'mundane').toLowerCase();
  const stats    = card.stats    || {};
  const addStats = card.additionalStats || {};
  const rarColor = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${rarity}`).trim() || '#7b9cff';

  document.getElementById('modal-img-rarity').style.background =
    `linear-gradient(90deg, ${rarColor}, transparent)`;

  const primaryBars   = buildStatBars(STAT_DEFS, stats);
  const secondaryBars = buildStatBars(ADD_STAT_DEFS, addStats);
  const trait       = card.trait || null;
  const abilityName = card.abilityName && card.abilityName !== '—' ? card.abilityName : null;
  const story = card.story && card.story !== '-' ? card.story : null;

  const isAscended = (rootCard !== null && activeFormIndex === null && card !== rootCard);
  const root       = rootCard || card;

  const backBtn = dualRoot ? `
    <button class="dual-back-btn" id="dual-back">← Forma seçiminə qayıt</button>` : '';

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-rarity-class-row">
      <span class="modal-rarity-badge"
            style="color:${rarColor};border-color:${rarColor}40;background:${rarColor}15">
        ${card.rarity || ''}
      </span>
      ${card.class ? `<span class="modal-class-badge">${card.class}</span>${card.subclass ? `<span class="modal-subclass-badge">${card.subclass}</span>` : ''}` : ''}
    </div>
    <div class="modal-card-name">${card.name || 'Unknown'}</div>
    <div class="modal-card-group">✦ ${card.group || root.group || 'Stagnantia'} ✦</div>

    ${backBtn}
    ${buildAscendedBanner(root, isAscended)}
    ${activeFormIndex !== null ? buildFormSwitcher(root, activeFormIndex) : ''}

    <div class="stat-tab-row">
      <button class="stat-tab active" data-tab="primary">⚔ Combat Stats</button>
      <button class="stat-tab" data-tab="secondary">📊 Advanced Stats</button>
      <button class="stat-tab" data-tab="levels">⭐ Star Levels</button>
    </div>

    <div class="stat-panel" id="panel-primary">
      ${primaryBars || '<p class="no-stat-msg">No stats available.</p>'}
    </div>
    <div class="stat-panel" id="panel-secondary" style="display:none">
      ${secondaryBars || '<p class="no-stat-msg">No advanced stats available.</p>'}
    </div>
    <div class="stat-panel" id="panel-levels" style="display:none">
      ${buildStarLevels(card.showlevels)}
    </div>

    ${trait ? `
      <div class="modal-section-label">Ability</div>
      ${abilityName ? `<div class="modal-ability-name">⚔ ${abilityName}</div>` : ''}
      <div class="modal-trait-box">${trait}</div>` : ''}

    ${story ? `
      <div class="modal-section-label">Lore</div>
      <div class="modal-story-box">${story}</div>` : ''}

    <button class="modal-lore-link">
      ✦ This entity belongs to the ${card.group || root.group || 'Stagnantia'} faction
    </button>
  `;

  /* Stat tab switching */
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

  /* Back to dual selector */
  const backEl = document.getElementById('dual-back');
  if (backEl) {
    backEl.addEventListener('click', () => {
      buildDualTypeSelector(dualRoot);
      updateModalImage(dualRoot);
    });
  }

  /* Ascended toggle */
  const ascBtn = document.getElementById('ascended-toggle');
  if (ascBtn) {
    ascBtn.addEventListener('click', () => {
      if (isAscended) {
        renderModalContent(root, root, null, dualRoot);
        updateModalImage(root);
      } else {
        const form = { ...root.upgradedsecondForm, group: root.group };
        renderModalContent(form, root, null, dualRoot);
        updateModalImage(form, root);
      }
    });
  }

  /* Multi-form switcher */
  document.querySelectorAll('.form-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.formIndex, 10);
      if (idx === -1) {
        renderModalContent(root, root, -1, dualRoot);
        updateModalImage(root);
      } else {
        const form = { ...root.forms[idx], group: root.group };
        renderModalContent(form, root, idx, dualRoot);
        updateModalImage(form, root);
      }
    });
  });
}

/* ════════════════════════════════════════════════════════
   ENTRY POINT
════════════════════════════════════════════════════════ */
function openModal(card) {
  updateModalImage(card);
  if (card.isDual) {
    buildDualTypeSelector(card);
  } else {
    const activeFormIndex = card.isMulti && card.forms && card.forms.length ? -1 : null;
    renderModalContent(card, card, activeFormIndex, null);
  }
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('open');
  document.body.style.overflow = '';
}
