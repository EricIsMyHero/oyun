/* ═══════════════════════════════════════════════════════
   js/core/modal.js
═══════════════════════════════════════════════════════ */

const modal      = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
let modalReturnFocus = null;
let loreReturnFocus = null;
let modalStatsPage = 1;
let modalStatsOpen = true;

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

const loreOverlay = document.getElementById('lore-fullscreen-overlay');
const loreClose   = document.getElementById('lore-fullscreen-close');
loreClose.addEventListener('click', closeLoreFullscreen);
loreOverlay.addEventListener('click', e => { if (e.target === loreOverlay) closeLoreFullscreen(); });

document.addEventListener('keydown', e => {
  const dialog = loreOverlay.classList.contains('open') ? loreOverlay : modal.classList.contains('open') ? modal : null;
  if (!dialog) return;
  if (e.key === 'Escape') {
    if (dialog === loreOverlay) closeLoreFullscreen(); else closeModal();
  }
  if (e.key === 'Tab') {
    const controls = [...dialog.querySelectorAll('button, summary, [tabindex="0"]')].filter(el => el.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      e.preventDefault(); last?.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      e.preventDefault(); first?.focus();
    }
  }
});

/* ── Lore fullscreen ── */
function openLoreFullscreen(name, text) {
  loreReturnFocus = document.activeElement;
  document.getElementById('lore-fullscreen-name').textContent = name || '';
  document.getElementById('lore-fullscreen-text').innerHTML   = text || '';
  loreOverlay.classList.add('open');
  loreOverlay.inert = false;
  loreOverlay.setAttribute('aria-hidden', 'false');
  modal.inert = true;
  document.body.style.overflow = 'hidden';
  loreClose.focus();
}

function closeLoreFullscreen() {
  loreOverlay.classList.remove('open');
  loreOverlay.inert = true;
  loreOverlay.setAttribute('aria-hidden', 'true');
  modal.inert = !modal.classList.contains('open');
  document.body.style.overflow = modal.classList.contains('open') ? 'hidden' : '';
  if (loreReturnFocus?.isConnected) loreReturnFocus.focus();
}

/* Keep the portrait view compact; the story opens in its own reader. */
function buildLoreBlock(text) {
  if (!text) return '';
  return '<button class="modal-lore-button" type="button" aria-haspopup="dialog">Lore</button>';
}

function wireLoreExpand(root, name, text) {
  const btn = root.querySelector('.modal-lore-button');
  if (btn) btn.addEventListener('click', () => openLoreFullscreen(name, text));
}

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
  { key: 'dodge',           label: 'Dodge Chance',     icon: '💨',  max: 70,    color: '#c084fc', suffix: '%' },
  { key: 'vision',          label: 'Vision',           icon: '👁️',  max: 8000,  color: '#c084fc', suffix: ''  },
];

/* ── Tertiary / bonus stats ──
   These still live inside card.additionalStats in the JSON data —
   they're just a separate display bucket in the modal so the
   "Advanced Stats" tab doesn't get overcrowded. */
const EXTRA_STAT_DEFS = [
  { key: 'healBonus',             label: 'Healing Bonus',       icon: '💖',  max: 100, color: '#fb7185', suffix: '%' },
  { key: 'healrecovery',          label: 'Rejuvenation',        icon: '🌱',  max: 10,  color: '#4ade80', suffix: '/s' },
  { key: 'shieldrecovery',        label: 'Fortification',       icon: '🏰',  max: 10,  color: '#38bdf8', suffix: '/s' },
  { key: 'criticdamageminimiser', label: 'Critical Resistance', icon: '🧱',  max: 90,  color: '#fbbf24', suffix: '%' },
  { key: 'damageminimiser',       label: 'Damage Reduction',    icon: '🔰',  max: 90,  color: '#fbbf24', suffix: '%' },
  { key: 'flexibility',           label: 'Flexibility',         icon: '🤸',  max: 80,  color: '#5eead4', suffix: '%' },
  { key: 'shieldtakendamage',     label: 'Shield Depletion',    icon: '🔻',  max: 100, color: '#f87171', suffix: '%' },
  { key: 'life',                  label: 'Life',                icon: '⌛',  max: 200, color: '#facc15', suffix: 's' },
];

/* ════════════════════════════════════════════════════════
   BUILDER HELPERS  (pure — no DOM reads, safe call order)
════════════════════════════════════════════════════════ */

function modalEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

/* Every render sets the skin, including form changes and the dual picker. */
function applyModalRarity(rarity, name) {
  const aliases = { common:'mundane', rare:'familiar', epic:'arcane', legendary:'apex' };
  const requested = String(rarity || 'mundane').toLowerCase();
  const key = aliases[requested] || requested;
  const allowed = ['mundane','familiar','arcane','relic','ascendant','apex','emergent','ethereal'];
  const safeKey = allowed.includes(key) ? key : 'mundane';
  const box = document.getElementById('modal-box');
  allowed.forEach(r => box.classList.remove(`r-${r}`));
  box.classList.add(`r-${safeKey}`);
  const color = getComputedStyle(document.documentElement).getPropertyValue(`--${safeKey}`).trim() || '#9ca3af';
  modal.style.setProperty('--modal-color', color);
  box.style.setProperty('--modal-color', color);
  box.dataset.rarity = safeKey;
  // Screen readers retain the rarity information without a visible badge.
  box.setAttribute('aria-label', `${name || 'Kart'} · ${safeKey}`);
  document.getElementById('modal-img-rarity').style.background = color;
}

const MODAL_STAT_HINTS = {
  health:'Maksimum can.', shield:'Canı qoruyan qalxan.', damage:'Bir vuruşun hasarı. 2x6: iki dəfə 6 hasar.',
  sps:'Saniyə başına hasar.', attackSpeed:'Vuruşlar arasındakı vaxt. Az olması daha yaxşıdır.',
  delay:'Hücum dəstələri arasındakı fasilə. Az olması daha yaxşıdır.', mana:'Kartın mana xərci.',
  number:'Meydana çıxan vahidlərin sayı; eyni vaxtda vurulan hədəf sayı deyil.',
  range:'Hücum məsafəsi.', speed:'Hərəkət sürəti.', criticDamage:'Kritik vuruşun hasar əmsalı.',
  criticalChance:'Kritik vuruş ehtimalı.', lifesteal:'Can çalma işə düşəndə bərpa edilən hasar faizi.',
  lifestealChance:'Can çalma ehtimalı.', dodge:'Zərbədən yayınma ehtimalı.', vision:'Görüş məsafəsi.',
  healBonus:'Alınan sağaltmanı gücləndirir.', healrecovery:'Saniyə başına can bərpası.',
  shieldrecovery:'Saniyə başına qalxan bərpası.', criticdamageminimiser:'Alınan kritik hasarı azaldır.',
  damageminimiser:'Alınan hasarı azaldır.', flexibility:'Mənfi təsirlərə qarşı çeviklik.',
  shieldtakendamage:'Qalxanın aldığı hasar faizi. Az olması daha yaxşıdır.', life:'Məhdud ömür. Tire: məhdudiyyət göstərilməyib.',
};

function modalStatMagnitude(value) {
  if (value == null || /^[\s—–-]*$/.test(String(value))) return null;
  const first = String(value).split('/')[0].trim().replace(/,/g, '.');
  const product = first.match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  const n = product ? Number(product[1]) * Number(product[2]) : parseFloat(first);
  return Number.isFinite(n) ? n : null;
}

function modalStatRating(def, value) {
  const n = modalStatMagnitude(value);
  if (n === null) return null;
  const lower = ['attackSpeed','delay','shieldtakendamage','mana'].includes(def.key);
  const reference = def.key === 'delay' ? 5 : def.max;
  const ratio = Math.max(0, Math.min(1, n / reference));
  return Math.ceil((lower ? 1 - ratio : ratio) * 5);
}

function buildStatTiles(defs, source) {
  return defs.map(def => {
    const raw = source[def.key];
    const value = raw == null || String(raw).trim() === '' || /^[—–-]$/.test(String(raw).trim()) ? '—' : raw;
    const rating = modalStatRating(def, value);
    const hint = MODAL_STAT_HINTS[def.key] || '';
    const ratingLabel = rating === null ? 'Müqayisə məlumatı yoxdur' : `Müqayisəli göstərici: ${rating}/5`;
    return `<div class="modal-stat-tile${String(value).length > 9 ? ' modal-stat-tile--wide-value' : ''}" data-stat="${def.key}" style="--stat-color:${def.color}" title="${modalEscape(hint)}">
      <span class="modal-stat-label"><span aria-hidden="true">${def.icon}</span>${def.label}</span>
      <strong class="modal-stat-value">${modalEscape(value)}</strong>
      <span class="modal-stat-crystals" role="img" aria-label="${ratingLabel}">${Array.from({length:5}, (_, i) => `<i class="${rating !== null && i < rating ? 'lit' : ''}"></i>`).join('')}</span>
    </div>`;
  }).join('');
}

function buildCombatProfile(card) {
  const p = card.combatStats || {};
  const labels = {
    attackType: { melee:'Yaxın', ranged:'Uzaq', mixed:'Yaxın və uzaq', none:'Hücum etmir' },
    attackShape: { single:'Tək hədəf', cone:'Sektor', circle:'Dairəvi', line:'Xətt', square:'Sahəvi', multi:'Çox hədəf', none:'Yoxdur' },
    flight: { ground:'Xeyr · yerüstü', flying:'Bəli · uçan', conditional:'Şərti uçuş' },
    weight: { 'very-light':'Çox yüngül', light:'Yüngül', medium:'Orta', heavy:'Ağır', 'very-heavy':'Çox ağır' },
    targets: { ground:'Yerüstü', air:'Hava', both:'Yer və hava', none:'Yoxdur' },
  };
  const multi = p.attackType === 'none' ? 'Hücum etmir' : p.multiTarget === true ? (Number.isFinite(p.maxTargets) ? `Bəli · ${p.maxTargets} hədəf` : 'Bəli · sahədəki rəqiblər') : p.multiTarget === false ? 'Xeyr · tək hədəf' : '—';
  const fields = [
    ['multiTarget','🎯','Birdən çox rəqibə hasar',multi,'Count-dan fərqli olaraq bir hücumun vura bildiyi hədəflər.'],
    ['attackWidth','📐','Saldırı genişliyi',p.attackWidth || '—','Hücum sektorunun bucağı və ya sahənin ölçüsü.'],
    ['attackType','⚔','Hücum məsafəsi',labels.attackType[p.attackType] || '—','Əsas hücumun növü.'],
    ['attackShape','◈','Hücum forması',labels.attackShape[p.attackShape] || '—','Əsas zərbənin yayıldığı forma.'],
    ['flight','🪽','Uça bilirmi?',labels.flight[p.flight] || '—',p.flightCondition || 'Kartın uçuş vəziyyəti.'],
    ['weight','⚖','Çəki',labels.weight[p.weight] || '—','Çox yüngül → yüngül → orta → ağır → çox ağır.'],
    ['targets','◎','Hədəflər',labels.targets[p.targets] || '—','Hücumun yönələ bildiyi hədəflər.'],
    ['type','✦','Kart tipi',Array.isArray(card.type) ? card.type.join(' / ') : card.type || '—','Kartın aid olduğu varlıq tipi.'],
  ];
  return fields.map(([key, icon, name, value, hint]) => `<div class="modal-profile-tile" data-profile="${key}" title="${modalEscape(hint)}">
    <span class="modal-stat-label"><span aria-hidden="true">${icon}</span>${name}</span>
    <strong>${modalEscape(value)}</strong>
    ${key === 'flight' && p.flightCondition ? `<small>${modalEscape(p.flightCondition)}</small>` : key === 'multiTarget' && p.multiTargetCondition ? `<small>${modalEscape(p.multiTargetCondition)}</small>` : ''}
  </div>`).join('');
}

function buildModalStats(card) {
  const defs = Object.fromEntries([...STAT_DEFS, ...ADD_STAT_DEFS, ...EXTRA_STAT_DEFS].map(d => [d.key, d]));
  const ordered = ['health','shield','damage','sps','attackSpeed','delay','mana','number','range','speed','criticDamage','criticalChance','lifesteal','lifestealChance'];
  const remaining = ['dodge','vision','healBonus','healrecovery','shieldrecovery','damageminimiser','criticdamageminimiser','flexibility','shieldtakendamage','life'];
  const values = { ...card.additionalStats, ...card.stats };
  const names = ['Əsas statlar','Bərpa və müdafiə','Döyüş profili','Ulduz səviyyələri'];
  const bodies = [
    `<div class="modal-stat-grid">${buildStatTiles(ordered.map(k => defs[k]), values)}</div>`,
    `<div class="modal-stat-grid">${buildStatTiles(remaining.map(k => defs[k]), values)}</div>`,
    `<div class="modal-stat-grid">${buildCombatProfile(card)}</div>`,
    buildStarLevels(card.showlevels),
  ];
  return `<details class="modal-stats" ${modalStatsOpen ? 'open' : ''}>
    <summary><span>Stats</span><span class="modal-stats-chevron" aria-hidden="true">⌄</span></summary>
    <div class="modal-stats-body">
      <div class="modal-stat-pages" role="tablist" aria-label="Stat səhifələri">${names.map((name, i) => `<button type="button" role="tab" id="stat-tab-${i + 1}" aria-controls="stat-page-${i + 1}" aria-selected="${modalStatsPage === i + 1}" tabindex="${modalStatsPage === i + 1 ? 0 : -1}" data-stat-page="${i + 1}" title="${name}">${i + 1}</button>`).join('')}</div>
      ${bodies.map((body, i) => `<section class="modal-stat-page" id="stat-page-${i + 1}" role="tabpanel" aria-labelledby="stat-tab-${i + 1}" ${modalStatsPage === i + 1 ? '' : 'hidden'}><h3>${names[i]}</h3>${body}${i < 2 ? '<p class="modal-stat-note">Kristallar müqayisəli gücü göstərir. Vaxt, mana xərci və qalxan itkisi azaldıqca göstərici yüksəlir.</p>' : ''}</section>`).join('')}
    </div>
  </details>`;
}

function wireModalStats(root) {
  const details = root.querySelector('.modal-stats');
  if (!details) return;
  details.addEventListener('toggle', () => { modalStatsOpen = details.open; });
  const tabs = [...root.querySelectorAll('[data-stat-page]')];
  function select(btn, focus = false) {
    modalStatsPage = Number(btn.dataset.statPage);
    tabs.forEach(tab => {
      const active = tab === btn;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      root.querySelector(`#stat-page-${tab.dataset.statPage}`).hidden = !active;
    });
    if (focus) btn.focus();
  }
  tabs.forEach((btn, i) => {
    btn.addEventListener('click', () => select(btn));
    btn.addEventListener('keydown', e => {
      const next = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
      if (next !== null) { e.preventDefault(); select(tabs[next], true); }
    });
  });
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
  img.alt = card.name || fallbackCard?.name || 'Kart';
  pholder.textContent = typeof getRarityEmoji === 'function' ? getRarityEmoji(card.rarity || fallbackCard?.rarity) : '⚔';
  img.onerror = () => { img.style.display = 'none'; pholder.style.display = 'flex'; };
  img.onload = () => { img.style.display = 'block'; pholder.style.display = 'none'; };
  if (imgUrl) {
    img.style.display = 'block';
    pholder.style.display = 'none';
    img.src = imgUrl;
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
    pholder.style.display = 'flex';
  }
}

/* Shared preview helpers — used by the Ethereal dual selector
   and the Emergent turn selector */
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

/* Ethereal: dual-type selector screen */
function buildDualTypeSelector(card) {
  applyModalRarity(card.rarity || 'ethereal', card.name);
  const t1       = card.type1;
  const t2       = card.type2;
  const rarColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--ethereal').trim() || '#f472b6';

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-name-class-row">
      <div class="modal-card-name">${card.name || 'Unknown'}</div>
      ${card.class ? `<span class="modal-class-badge">${card.class}</span>${card.subclass ? `<span class="modal-subclass-badge">${card.subclass}</span>` : ''}` : ''}
    </div>
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
    renderDualForm({ ...t1, group: card.group }, card);
  });
  document.getElementById('dual-pick-2').addEventListener('click', () => {
    renderDualForm({ ...t2, group: card.group }, card);
  });
}

/* Render a chosen dual type */
function renderDualForm(typeCard, dualRootCard) {
  const activeFormIndex = typeCard.isMulti && typeCard.forms && typeCard.forms.length ? -1 : null;
  renderModalContent(typeCard, typeCard, activeFormIndex, { kind: 'dual', root: dualRootCard });
  updateModalImage(typeCard, dualRootCard);
}

/* Emergent: builds the turn-tab row shown inside the Ability section.
   Stats/shield/etc. don't change per turn — only the trait text does.
   Turn keys are arbitrary and chosen per-card in the JSON
   (e.g. "1", "2", "3", "5" — not required to be sequential or capped at 5). */
function buildEmergentTraitTabs(card) {
  const keys = emergentTurnKeys(card);
  if (!keys.length) return '';
  const tabs = keys.map((k, i) =>
    `<button class="emergent-trait-btn ${i === 0 ? 'emergent-trait-btn--active' : ''}"
             data-turn-key="${k}">Tur ${k}</button>`).join('');
  return `
    <div class="emergent-trait-switcher">
      <div class="emergent-trait-label">🌱 Tura görə dəyişir</div>
      <div class="emergent-trait-btns">${tabs}</div>
    </div>
    <div class="modal-trait-box" id="emergent-trait-text">${card.turns[keys[0]]}</div>`;
}

function wireEmergentTraitTabs(card) {
  document.querySelectorAll('.emergent-trait-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.emergent-trait-btn').forEach(b => b.classList.remove('emergent-trait-btn--active'));
      btn.classList.add('emergent-trait-btn--active');
      const textEl = document.getElementById('emergent-trait-text');
      if (textEl) textEl.innerHTML = card.turns[btn.dataset.turnKey] || '';
    });
  });
}

/* ── Main content renderer ──────────────────────────────
   card            : card whose stats are currently shown
   rootCard        : top-level card (owns forms[], upgradedsecondForm)
   activeFormIndex : -1=base  0..n=forms[i]  null=not-multi
   backOrigin      : { kind: 'dual', root } when this card was reached via
                     the Ethereal dual-form picker; null otherwise
──────────────────────────────────────────────────────── */
function renderModalContent(card, rootCard, activeFormIndex, backOrigin) {
  const root = rootCard || card;
  applyModalRarity(card.rarity || root.rarity || backOrigin?.root.rarity, card.name || root.name);
  const isEmergentCard = !!(card.isEmergent && card.turns && emergentTurnKeys(card).length);
  const trait       = card.trait || null;
  const abilityName = card.abilityName && card.abilityName !== '—' ? card.abilityName : null;
  const story = card.story && card.story !== '-' ? card.story : null;

  const isAscended = (rootCard !== null && activeFormIndex === null && card !== rootCard);

  const backBtn = backOrigin ? `
    <button class="dual-back-btn" id="origin-back">← Forma seçiminə qayıt</button>` : '';

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-name-class-row">
      <div class="modal-card-name">${card.name || 'Unknown'}</div>
      ${card.class ? `<span class="modal-class-badge">${card.class}</span>${card.subclass ? `<span class="modal-subclass-badge">${card.subclass}</span>` : ''}` : ''}
    </div>
    <div class="modal-card-group">✦ ${card.group || root.group || 'Stagnantia'} ✦</div>

    ${backBtn}
    ${buildAscendedBanner(root, isAscended)}
    ${activeFormIndex !== null ? buildFormSwitcher(root, activeFormIndex) : ''}

    ${buildModalStats(card)}

    ${(trait || isEmergentCard) ? `
      <div class="modal-section-label">Ability</div>
      ${abilityName ? `<div class="modal-ability-name">⚔ ${abilityName}</div>` : ''}
      ${isEmergentCard ? buildEmergentTraitTabs(card) : `<div class="modal-trait-box">${trait}</div>`}` : ''}

    ${buildLoreBlock(story)}

  `;

  wireLoreExpand(document.getElementById('modal-content'), card.name || root.name, story);
  if (isEmergentCard) wireEmergentTraitTabs(card);

  wireModalStats(document.getElementById('modal-content'));

  /* Back to the Ethereal dual-form picker */
  const backEl = document.getElementById('origin-back');
  if (backEl && backOrigin) {
    backEl.addEventListener('click', () => {
      buildDualTypeSelector(backOrigin.root);
      updateModalImage(backOrigin.root);
    });
  }

  /* Ascended toggle */
  const ascBtn = document.getElementById('ascended-toggle');
  if (ascBtn) {
    ascBtn.addEventListener('click', () => {
      if (isAscended) {
        renderModalContent(root, root, null, backOrigin);
        updateModalImage(root);
      } else {
        const form = { ...root.upgradedsecondForm, group: root.group };
        renderModalContent(form, root, null, backOrigin);
        updateModalImage(form, root);
      }
    });
  }

  /* Multi-form switcher */
  document.querySelectorAll('.form-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.formIndex, 10);
      if (idx === -1) {
        renderModalContent(root, root, -1, backOrigin);
        updateModalImage(root);
      } else {
        const form = { ...root.forms[idx], group: root.group };
        renderModalContent(form, root, idx, backOrigin);
        updateModalImage(form, root);
      }
    });
  });
}

/* ════════════════════════════════════════════════════════
   ENTRY POINT
════════════════════════════════════════════════════════ */
function openModal(card) {
  modalStatsPage = 1;
  modalStatsOpen = true;
  updateModalImage(card);
  if (card.isDual) {
    buildDualTypeSelector(card);
  } else {
    const activeFormIndex = card.isMulti && card.forms && card.forms.length ? -1 : null;
    renderModalContent(card, card, activeFormIndex, null);
  }
  showModalDialog();
}

function showModalDialog() {
  modalReturnFocus = document.activeElement;
  modal.inert = false;
  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('open');
  document.getElementById('modal-box').scrollTop = 0;
  document.body.style.overflow = 'hidden';
  modalClose.focus();
}

function closeModal() {
  if (!modal.classList.contains('open')) return;
  if (loreOverlay.classList.contains('open')) closeLoreFullscreen();
  modal.classList.remove('open');
  modal.inert = true;
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (modalReturnFocus?.isConnected) modalReturnFocus.focus();
}
