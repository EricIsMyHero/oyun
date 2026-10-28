/* ═══════════════════════════════════════════════════════
   js/core/modal.js
═══════════════════════════════════════════════════════ */

const modal      = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
let modalReturnFocus = null;
let loreReturnFocus = null;
let modalStatsPage = 1;
let modalCardSection = 'stats';

function syncModalNavOrientation() {
  const nav = document.querySelector('.modal-side-nav');
  if (nav) nav.setAttribute('aria-orientation', window.matchMedia('(max-width: 760px)').matches ? 'horizontal' : 'vertical');
}
window.addEventListener('resize', syncModalNavOrientation);

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

const loreOverlay = document.getElementById('lore-fullscreen-overlay');
const loreClose   = document.getElementById('lore-fullscreen-close');
loreClose.addEventListener('click', closeLoreFullscreen);
loreOverlay.addEventListener('click', e => { if (e.target === loreOverlay) closeLoreFullscreen(); });

const artworkOverlay = document.getElementById('artwork-overlay');
const artworkClose = document.getElementById('artwork-close');
let artworkReturnFocus = null;
document.getElementById('modal-artwork-open').addEventListener('click', openModalArtwork);
artworkClose.addEventListener('click', closeModalArtwork);
artworkOverlay.addEventListener('click', e => { if (e.target === artworkOverlay) closeModalArtwork(); });

function openModalArtwork() {
  const img = document.getElementById('modal-img');
  if (!img.naturalWidth || img.style.display === 'none') return;
  artworkReturnFocus = document.activeElement;
  document.getElementById('artwork-image').src = img.currentSrc || img.src;
  document.getElementById('artwork-image').alt = img.alt;
  document.getElementById('artwork-title').textContent = img.alt;
  artworkOverlay.inert = false;
  artworkOverlay.classList.add('open');
  artworkOverlay.setAttribute('aria-hidden', 'false');
  modal.inert = true;
  artworkClose.focus();
}

function closeModalArtwork() {
  artworkOverlay.classList.remove('open');
  artworkOverlay.inert = true;
  artworkOverlay.setAttribute('aria-hidden', 'true');
  modal.inert = !modal.classList.contains('open');
  if (artworkReturnFocus?.isConnected) artworkReturnFocus.focus();
}

document.addEventListener('keydown', e => {
  const dialog = artworkOverlay.classList.contains('open') ? artworkOverlay : loreOverlay.classList.contains('open') ? loreOverlay : modal.classList.contains('open') ? modal : null;
  if (!dialog) return;
  if (e.key === 'Escape') {
    if (dialog === artworkOverlay) closeModalArtwork();
    else if (dialog === loreOverlay) closeLoreFullscreen(); else closeModal();
  }
  if (e.key === 'Tab') {
    const controls = [...dialog.querySelectorAll('button, summary, [tabindex="0"]')].filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
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

/* Inline outline icons keep the modal independent of icon fonts and emoji. */
function modalIcon(key) {
  const paths = {
    health:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3Z"/>',
    damage:'<path d="m14 4 6-1-1 6L7 21l-4-4L15 5M5 13l6 6M3 21l2-2"/>',
    attackSpeed:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3M18 6l2-2"/>',
    delay:'<path d="M5 3h14M5 21h14M7 3v4l5 5-5 5v4M17 3v4l-5 5 5 5v4"/>',
    sps:'<path d="M13 3c1 5-3 5-2 9 2-1 3-3 3-3s5 4 5 8a7 7 0 0 1-14 0c0-5 4-7 4-7s-1 5 2 5"/>',
    mana:'<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0C19 10 12 2 12 2Z"/><path d="M8 15a4 4 0 0 0 4 4"/>',
    number:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    range:'<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/><path d="M7 3h10M7 21h10"/>',
    speed:'<path d="m13 3-8 11h7l-1 7 8-11h-7l1-7Z"/>',
    criticalChance:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/>',
    criticDamage:'<path d="m12 2 2.8 6.5L22 9l-5.4 4.7 1.7 7.3-6.3-3.8L5.7 21l1.7-7.3L2 9l7.2-.5L12 2Z"/>',
    lifesteal:'<path d="M12 3S6 10 6 15a6 6 0 0 0 12 0c0-5-6-12-6-12Z"/><path d="M9 15h6M12 12v6"/>',
    lifestealChance:'<path d="M8 3S3 9 3 13a5 5 0 0 0 7 4M16 7s5 6 5 10a5 5 0 0 1-10 0c0-4 5-10 5-10Z"/>',
    dodge:'<path d="M3 7h10a3 3 0 1 0-3-3M2 12h16a3 3 0 1 1-3 3M4 17h3"/>',
    vision:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    healBonus:'<path d="M12 3v18M3 12h18"/><path d="m6 4 1 2M18 4l-1 2M4 18l2-1M20 18l-2-1"/>',
    healrecovery:'<path d="M20 4c-9-1-16 3-15 10 1 7 11 7 14 0 1-3 1-6 1-10ZM4 21l11-11"/>',
    shieldrecovery:'<path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3ZM9 12h6M12 9v6"/>',
    criticdamageminimiser:'<path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3ZM9 9l6 6M15 9l-6 6"/>',
    damageminimiser:'<path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3ZM8 12h8"/>',
    flexibility:'<path d="M4 8a8 8 0 0 1 14-3l2 3M20 3v5h-5M20 16a8 8 0 0 1-14 3l-2-3M4 21v-5h5"/>',
    shieldtakendamage:'<path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3ZM12 8v8M9 13l3 3 3-3"/>',
    life:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    multiTarget:'<circle cx="8" cy="8" r="4"/><circle cx="17" cy="16" r="4"/><path d="m10 12 3 2M12 7h8M16 3l4 4-4 4"/>',
    attackWidth:'<path d="M9 7h7a5 5 0 0 1 0 10H9V7ZM4 7v10M2 9l2-2 2 2M2 15l2 2 2-2"/>',
    attackAngle:'<path d="M4 4v16h16M4 20 17 7M4 11a9 9 0 0 1 9 9"/>',
    attackType:'<path d="m4 4 16 16M20 4 4 20M3 8l5-5M16 21l5-5M3 16l5 5M16 3l5 5"/>',
    attackShape:'<path d="m12 3 9 9-9 9-9-9 9-9Z"/><path d="m12 8 4 4-4 4-4-4 4-4Z"/>',
    flight:'<path d="M12 20v-8M12 13C10 7 5 4 2 4c0 8 4 12 10 9Zm0 0C14 7 19 4 22 4c0 8-4 12-10 9Z"/>',
    ground:'<path d="M3 20h18M5 16h5v-5h5V6h4"/>',
    hovering:'<path d="m12 3 5 5-5 5-5-5 5-5ZM4 17h16M7 21h10"/>',
    weight:'<path d="M6 7h12l3 14H3L6 7Z"/><circle cx="12" cy="5" r="3"/>',
    type:'<path d="m12 2 9 5v10l-9 5-9-5V7l9-5ZM3 7l9 5 9-5M12 12v10"/>',
    stats:'<path d="M5 20V10M12 20V4M19 20v-7M2 20h20"/>',
    ability:'<path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z"/>',
    levels:'<path d="M4 20h5v-5h5v-5h6V4M15 4h5v5"/>',
    lore:'<path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15"/>',
    forms:'<rect x="3" y="3" width="12" height="15" rx="2"/><path d="M8 21h11a2 2 0 0 0 2-2V8"/>',
    back:'<path d="m10 5-7 7 7 7M3 12h18"/>',
    expand:'<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
  };
  const aliases = { attackDistance:'range', flying:'flight', movementType:'flight', groundEffectImmune:'shield', impactSize:'attackShape', projectileEndEffect:'sps', targets:'criticalChance', star:'criticDamage', entity:'type', damageToCard:'damage', damageToCastle:'shield', timeBetweenDamage:'delay', lifetime:'life', size:'attackWidth' };
  const body = paths[aliases[key] || key] || paths.type;
  return `<svg class="modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

function renderModalIdentity(card, fallback = {}) {
  const name = card.name || fallback.name || 'Unknown';
  const role = modalTerm(card.class || fallback.class);
  const subclass = modalTerm(card.subclass || fallback.subclass);
  const type = modalTypes(card.type || fallback.type).join(' / ');
  const group = card.group || fallback.group || (modal.dataset.kind === 'spell' ? 'Spell' : 'Stagnantia');
  document.getElementById('modal-identity').innerHTML = `
    <div class="modal-name-class-row">
      <h2 class="modal-card-name">${modalEscape(name)}</h2>
      ${role ? `<span class="modal-class-badge">${modalEscape(role)}</span>` : ''}
      ${subclass ? `<span class="modal-subclass-badge">${modalEscape(subclass)}</span>` : ''}
    </div>
    <div class="modal-card-group">${modalIcon('type')}<span>${modalEscape(group)}</span></div>`;
  const movement = MODAL_MOVEMENT[card.combatStats?.movementType];
  document.getElementById('modal-art-meta').innerHTML = `${type ? `<span>${modalIcon('entity')}${modalEscape(type)}</span>` : ''}${movement ? `<span title="${modalEscape(movement.hint)}">${modalIcon(card.combatStats.movementType)}${movement.label}</span>` : ''}`;
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
  (box.closest('.modal-frame') || box).setAttribute('aria-label', `${name || 'Card'} · ${safeKey}`);
  document.getElementById('modal-img-rarity').style.background = color;
}

const MODAL_STAT_HINTS = {
  health:'Maximum health.', shield:'Protective shield that absorbs incoming damage.', damage:'Damage per hit. 2x6 means two hits for 6 damage each.',
  sps:'Damage per second.', attackSpeed:'Time between hits. Lower is better.',
  delay:'Recovery time between volleys. Lower is better.', mana:'Mana cost to deploy the card.',
  number:'Number of deployed units; separate from the number of simultaneous targets.',
  range:'Distance at which the card can acquire a target and begin attacking. 1,000 points = 1 tile.', speed:'Movement speed. 1,000 points = 1 tile per second.', criticDamage:'Critical hit damage multiplier.',
  criticalChance:'Chance of a critical hit.', lifesteal:'Percentage of dealt damage restored as health when lifesteal triggers.',
  lifestealChance:'Chance to trigger lifesteal.', dodge:'Chance to avoid an incoming hit.', vision:'Vision distance.',
  healBonus:'Increases healing received.', healrecovery:'Health restored per second.',
  shieldrecovery:'Shield restored per second.', criticdamageminimiser:'Reduces incoming critical damage.',
  damageminimiser:'Reduces incoming damage.', flexibility:'Resistance to negative effects.',
  shieldtakendamage:'Percentage of damage taken by the shield. Lower is better.', life:'Limited lifetime. A dash means no lifetime has been specified.',
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
    const value = modalStatDisplay(def.key, raw);
    const rating = modalStatRating(def, raw);
    const hint = MODAL_STAT_HINTS[def.key] || '';
    const ratingLabel = rating === null ? 'No comparison data' : `Relative rating: ${rating}/5`;
    return `<div class="modal-stat-tile${String(value).length > 9 ? ' modal-stat-tile--wide-value' : ''}" data-stat="${def.key}" style="--stat-color:var(--modal-color)" title="${modalEscape(hint)}">
      <span class="modal-stat-label">${modalIcon(def.key)}<span>${def.label}</span></span>
      <strong class="modal-stat-value">${modalEscape(value)}</strong>
      <span class="modal-stat-crystals" role="img" aria-label="${ratingLabel}">${Array.from({length:5}, (_, i) => `<i class="${rating !== null && i < rating ? 'lit' : ''}"></i>`).join('')}</span>
    </div>`;
  }).join('');
}

// Width, travel distance, targeting range and area geometry are separate values.
const MODAL_MOVEMENT = {
  ground: { label:'Ground', layer:'ground', groundEffectImmune:false, hint:'Travels along the ground.' },
  flying: { label:'Flying', layer:'air', groundEffectImmune:true, hint:'Travels through the air and follows air-targeting rules.' },
  hovering: { label:'Hovering', layer:'ground', groundEffectImmune:true, hint:'Moves along the ground while remaining immune to ground-only spells and effects.' },
};
function modalTerm(value) {
  return { 'İnsan':'Human', 'Heyvan':'Animal', 'Ölü':'Dead', 'Uzaylı':'Alien', 'Ruh':'Spirit', 'Varlıq':'Entity' }[value] || value || '';
}
function modalTypes(value) {
  return (Array.isArray(value) ? value : value ? [value] : []).map(modalTerm);
}
const MODAL_POINTS_PER_TILE = 1000;
const MODAL_SINGLE_TARGET_WIDTH = 500;

function modalTiles(value, perSecond = false) {
  if (value == null || String(value).trim() === '') return '—';
  const parts = String(value).split('/').map(part => part.trim().replace(',', '.'));
  if (parts.some(part => !/^\d+(?:\.\d+)?$/.test(part) || !Number.isFinite(Number(part)))) return '—';
  const tiles = parts.map(part => Number(part) / MODAL_POINTS_PER_TILE);
  const unit = tiles.length === 1 && tiles[0] === 1 ? 'tile' : 'tiles';
  return `${tiles.join(' / ')} ${unit}${perSecond ? '/s' : ''}`;
}
function modalStatDisplay(key, value) {
  if (key === 'range' || key === 'speed') return modalTiles(value, key === 'speed');
  return value == null || String(value).trim() === '' || /^[—–-]$/.test(String(value).trim()) ? '—' : value;
}
function modalDistance(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? modalTiles(value) : '—';
}
function modalAttackWidth(card) {
  const p = card.combatStats || {};
  if (p.attackWidth != null) return p.attackWidth;
  return p.multiTarget === false && p.attackType !== 'none' ? MODAL_SINGLE_TARGET_WIDTH : null;
}
function modalAttackDistance(card) {
  const p = card.combatStats || {};
  if (!p.attackDistanceMatchesRange) return p.attackDistance ?? null;
  const values = String(card.additionalStats?.range ?? '').split('/').map(part => parseFloat(part.replace(',', '.'))).filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}

function buildCombatProfile(card) {
  const p = card.combatStats || {};
  const movement = MODAL_MOVEMENT[p.movementType];
  const labels = {
    attackType: { melee:'Melee', ranged:'Ranged', mixed:'Melee & ranged', none:'Does not attack' },
    attackShape: { single:'Single target', cone:'Cone', circle:'Circular', line:'Line', square:'Area', multi:'Multiple targets', none:'None' },
    weight: { 'very-light':'Very light', light:'Light', medium:'Medium', heavy:'Heavy', 'very-heavy':'Very heavy' },
    targets: { ground:'Ground', air:'Air', both:'Ground & air', none:'None' },
  };
  const multi = p.attackType === 'none' ? 'Does not attack' : p.multiTarget === true ? (Number.isFinite(p.maxTargets) ? `Yes · ${p.maxTargets} targets` : 'Yes · targets in the area') : p.multiTarget === false ? 'No · single target' : '—';
  const fields = [
    ['attackDistance','Attack Distance',modalDistance(modalAttackDistance(card)),'Maximum distance a single attack or projectile can travel. 1,000 points = 1 tile.'],
    ['attackWidth','Projectile Width',modalDistance(modalAttackWidth(card)),'Width of one projectile or strike. 1,000 points = 1 tile; single-target attacks default to 500 points (0.5 tiles).'],
    ['attackAngle','Attack Arc',typeof p.attackAngle === 'number' ? `${p.attackAngle}°` : '—','Angle covered by a sweeping attack. Separate from projectile width.'],
    ['attackType','Attack Type',labels.attackType[p.attackType] || '—','How the card delivers its basic attack.'],
    ['attackShape','Attack Shape',labels.attackShape[p.attackShape] || '—','Shape of the strike or impact area.'],
    ['multiTarget','Multiple Targets',multi,'Targets hit by one attack. Separate from the number of deployed units.'],
    ['targets','Targets',labels.targets[p.targets] || '—','Target layers this card can attack.'],
    ['movementType','Movement',movement?.label || '—',movement?.hint || 'Movement type has not been specified.'],
    ['groundEffectImmune','Ground Effect Immunity',movement ? movement.groundEffectImmune ? 'Yes' : 'No' : '—','Immunity to spells and effects that only affect the ground. Hovering cards still move on the ground.'],
    ['weight','Weight',labels.weight[p.weight] || '—','Very light, light, medium, heavy or very heavy.'],
    ['type','Creature Type',modalTypes(card.type).join(' / ') || '—','The creature category this card belongs to.'],
    ['impactSize','Impact Area',p.impactSize || '—','Area affected on impact. Separate from projectile width.'],
    ['projectileEndEffect','End of Attack',p.projectileEndEffect === 'explode' ? 'Explodes' : '—','Effect triggered at the end of the attack distance.'],
  ];
  return fields.map(([key, name, value, hint]) => `<div class="modal-profile-tile" data-profile="${key}" title="${modalEscape(hint)}">
    <span class="modal-stat-label">${modalIcon(key === 'movementType' ? p.movementType : key)}<span>${name}</span></span>
    <strong>${modalEscape(value)}</strong>
    ${key === 'attackDistance' && p.attackDistanceMatchesRange ? '<small>Matches current Range.</small>' : ''}
    ${key === 'movementType' && movement ? `<small>${modalEscape(movement.hint)}</small>` : ''}
    ${key === 'movementType' && p.movementCondition ? `<small lang="az">${modalEscape(p.movementCondition)}</small>` : ''}
    ${key === 'multiTarget' && p.multiTargetCondition ? `<small lang="az">${modalEscape(p.multiTargetCondition)}</small>` : ''}
  </div>`).join('');
}

function buildModalStats(card) {
  const defs = Object.fromEntries([...STAT_DEFS, ...ADD_STAT_DEFS, ...EXTRA_STAT_DEFS].map(d => [d.key, d]));
  const ordered = ['health','shield','damage','sps','attackSpeed','delay','mana','number','range','speed','criticDamage','criticalChance','lifesteal','lifestealChance'];
  const remaining = ['dodge','vision','healBonus','healrecovery','shieldrecovery','damageminimiser','criticdamageminimiser','flexibility','shieldtakendamage','life'];
  const values = { ...card.additionalStats, ...card.stats };
  const names = ['Primary Stats','Recovery & Defense','Combat Profile'];
  const bodies = [
    `<div class="modal-stat-grid">${buildStatTiles(ordered.map(k => defs[k]), values)}</div>`,
    `<div class="modal-stat-grid">${buildStatTiles(remaining.map(k => defs[k]), values)}</div>`,
    `<div class="modal-stat-grid">${buildCombatProfile(card)}</div>`,
  ];
  return `<div class="modal-stats">
    <div class="modal-stats-body">
      <div class="modal-stat-pages" role="tablist" aria-label="Stat pages">${names.map((name, i) => `<button type="button" role="tab" id="stat-tab-${i + 1}" aria-controls="stat-page-${i + 1}" aria-selected="${modalStatsPage === i + 1}" tabindex="${modalStatsPage === i + 1 ? 0 : -1}" data-stat-page="${i + 1}" title="${name}">${i + 1}</button>`).join('')}</div>
      ${bodies.map((body, i) => `<section class="modal-stat-page" id="stat-page-${i + 1}" role="tabpanel" aria-labelledby="stat-tab-${i + 1}" ${modalStatsPage === i + 1 ? '' : 'hidden'}><h3>${names[i]}</h3>${body}${i < 2 ? '<p class="modal-stat-note">Crystals show relative strength. Lower attack intervals, mana costs and shield depletion receive higher ratings.</p>' : ''}</section>`).join('')}
    </div>
  </div>`;
}

function wireModalStats(root) {
  if (!root.querySelector('.modal-stats')) return;
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
    { key: 'level1', number: '01', label: 'Level 1', color: '#facc15' },
    { key: 'level2', number: '02', label: 'Level 2', color: '#f97316' },
    { key: 'level3', number: '03', label: 'Level 3', color: '#a855f7' },
  ];
  return stars.map(s => {
    const text = levels[s.key];
    if (!text || text === '-') return `
        <div class="star-level-row star-level-empty">
          <div class="star-level-icon">${s.number}</div>
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
        <div class="star-level-icon">${s.number}</div>
        <div class="star-level-info">
          <div class="star-level-label" style="color:${s.color}">${s.label}</div>
          <div class="star-level-text" lang="az">${desc}</div>
          ${range ? `<div class="star-level-range">${range}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

/* The archive keeps its original open typography; navigation lives on the right. */
function buildCardSections(card, abilityHtml, story) {
  const sections = [
    { key:'stats', label:'Stats', body:buildModalStats(card) },
    { key:'ability', label:'Ability', body:abilityHtml },
    { key:'levels', label:'Star Levels', body:buildStarLevels(card.showlevels) },
    { key:'lore', label:'Lore', body:story ? `<div class="modal-lore-copy">${story}</div>` : '<p class="no-stat-msg">No lore has been added for this card.</p>' },
  ];
  return `<div class="modal-card-body">
    <div class="modal-section-panels">${sections.map(section => `
      <section id="card-section-${section.key}" class="modal-card-section" role="tabpanel" aria-labelledby="card-tab-${section.key}" ${modalCardSection === section.key ? '' : 'hidden'}>
        <div class="modal-section-label">${modalIcon(section.key)}<span>${section.label}</span></div>${section.body}
      </section>`).join('')}
    </div>
    <nav class="modal-side-nav" role="tablist" aria-label="Card sections" aria-orientation="vertical">${sections.map(section => `
      <button type="button" class="modal-section-tab" id="card-tab-${section.key}" role="tab" data-card-section="${section.key}" aria-controls="card-section-${section.key}" aria-selected="${modalCardSection === section.key}" tabindex="${modalCardSection === section.key ? 0 : -1}">${modalIcon(section.key)}<span>${section.label}</span></button>`).join('')}
    </nav>
  </div>`;
}

function wireCardSections(root) {
  syncModalNavOrientation();
  const tabs = [...root.querySelectorAll('[data-card-section]')];
  function select(btn, focus = false) {
    modalCardSection = btn.dataset.cardSection;
    tabs.forEach(tab => {
      const active = tab === btn;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      root.querySelector(`#card-section-${tab.dataset.cardSection}`).hidden = !active;
    });
    if (focus) btn.focus({preventScroll:true});
  }
  tabs.forEach((btn, i) => {
    btn.addEventListener('click', () => select(btn));
    btn.addEventListener('keydown', e => {
      const next = ['ArrowDown','ArrowRight'].includes(e.key) ? (i + 1) % tabs.length : ['ArrowUp','ArrowLeft'].includes(e.key) ? (i + tabs.length - 1) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
      if (next !== null) { e.preventDefault(); select(tabs[next], true); }
    });
  });
}

function buildAscendedBanner(root, isAscended) {
  const secondForm = root.upgradedsecondForm;
  if (!secondForm) return '';
  if (isAscended) return `
      <div class="ascended-banner ascended-banner--active">
        <div class="ascended-banner-info">
          <span class="ascended-banner-icon">${modalIcon('ability')}</span>
          <div>
            <div class="ascended-banner-title">Ascended Form</div>
            <div class="ascended-banner-sub">Partner bonus active — ${secondForm.name}</div>
          </div>
        </div>
        <button class="ascended-toggle-btn ascended-toggle-btn--revert"
                id="ascended-toggle">${modalIcon('back')} Base Form</button>
      </div>`;
  return `
    <div class="ascended-banner">
      <div class="ascended-banner-info">
        <span class="ascended-banner-icon">${modalIcon('ability')}</span>
        <div>
          <div class="ascended-banner-title">Ascended Form available</div>
          <div class="ascended-banner-sub">With partner → ${secondForm.name}</div>
        </div>
      </div>
      <button class="ascended-toggle-btn" id="ascended-toggle">${modalIcon('ability')} Preview</button>
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
      <div class="form-switcher-label">${modalIcon('forms')} Forms</div>
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
  img.alt = card.name || fallbackCard?.name || 'Card';
  pholder.innerHTML = modalIcon('entity');
  document.getElementById('modal-artwork-open').hidden = true;
  img.onerror = () => { img.style.display = 'none'; pholder.style.display = 'flex'; document.getElementById('modal-artwork-open').hidden = true; };
  img.onload = () => { img.style.display = 'block'; pholder.style.display = 'none'; document.getElementById('modal-artwork-open').hidden = false; };
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
    <div class="dual-stat-row"><span>${modalIcon('health')} HP</span><span>${s.health || '—'}</span></div>
    <div class="dual-stat-row"><span>${modalIcon('shield')} Shield</span><span>${s.shield || '—'}</span></div>
    <div class="dual-stat-row"><span>${modalIcon('damage')} DMG</span><span>${s.damage || '—'}</span></div>
    <div class="dual-stat-row"><span>${modalIcon('sps')} DPS</span><span>${s.sps || '—'}</span></div>`;
}

function spawnTag(c) {
  if (!c.forms || !c.forms.length) return '';
  return `<div class="dual-spawn-tag">${modalIcon('forms')} ${c.forms.map(f => f.name).join(', ')}</div>`;
}

/* Ethereal: dual-type selector screen */
function buildDualTypeSelector(card) {
  renderModalIdentity(card);
  applyModalRarity(card.rarity || 'ethereal', card.name);
  const t1       = card.type1;
  const t2       = card.type2;
  const rarColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--ethereal').trim() || '#f472b6';

  document.getElementById('modal-content').innerHTML = `
    <div class="dual-selector-header">
      <span class="dual-selector-icon">${modalIcon('forms')}</span>
      <div>
        <div class="dual-selector-title">Dual Form Card</div>
        <div class="dual-selector-sub">Choose a form before entering battle</div>
      </div>
    </div>

    <div class="dual-type-grid">
      <button class="dual-type-card" id="dual-pick-1">
        <div class="dual-type-badge"
             style="color:${rarColor};border-color:${rarColor}40;background:${rarColor}15">Type I</div>
        <div class="dual-type-name">${t1.class ? (t1.subclass ? `${t1.class} / ${t1.subclass}` : t1.class) : '—'}</div>
        <div class="dual-type-stats">${statPreview(t1)}</div>
        ${spawnTag(t1)}
        <div class="dual-type-cta">Select →</div>
      </button>
      <button class="dual-type-card" id="dual-pick-2">
        <div class="dual-type-badge"
             style="color:${rarColor};border-color:${rarColor}40;background:${rarColor}15">Type II</div>
        <div class="dual-type-name">${t2.class ? (t2.subclass ? `${t2.class} / ${t2.subclass}` : t2.class) : '—'}</div>
        <div class="dual-type-stats">${statPreview(t2)}</div>
        ${spawnTag(t2)}
        <div class="dual-type-cta">Select →</div>
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
             data-turn-key="${k}">Turn ${k}</button>`).join('');
  return `
    <div class="emergent-trait-switcher">
      <div class="emergent-trait-label">${modalIcon('levels')} Changes by turn</div>
      <div class="emergent-trait-btns">${tabs}</div>
    </div>
    <div class="modal-trait-box" lang="az" id="emergent-trait-text">${card.turns[keys[0]]}</div>`;
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
  renderModalIdentity(card, root);
  applyModalRarity(card.rarity || root.rarity || backOrigin?.root.rarity, card.name || root.name);
  const isEmergentCard = !!(card.isEmergent && card.turns && emergentTurnKeys(card).length);
  const trait       = card.trait || null;
  const abilityName = card.abilityName && card.abilityName !== '—' ? card.abilityName : null;
  const story = card.story && card.story !== '-' ? card.story : null;

  const isAscended = (rootCard !== null && activeFormIndex === null && card !== rootCard);

  const backBtn = backOrigin ? `
    <button class="dual-back-btn" id="origin-back">${modalIcon('back')} Back to form selection</button>` : '';

  document.getElementById('modal-content').innerHTML = `
    ${backBtn}
    ${buildAscendedBanner(root, isAscended)}
    ${activeFormIndex !== null ? buildFormSwitcher(root, activeFormIndex) : ''}

    ${buildCardSections(card, `
      ${(trait || isEmergentCard) ? `
        ${abilityName ? `<div class="modal-ability-name">${modalIcon('ability')} ${abilityName}</div>` : ''}
        ${isEmergentCard ? buildEmergentTraitTabs(card) : `<div class="modal-trait-box" lang="az">${trait}</div>`}` : '<p class="no-stat-msg">No ability has been specified.</p>'}
    `, story)}
  `;

  if (isEmergentCard) wireEmergentTraitTabs(card);
  wireModalStats(document.getElementById('modal-content'));
  wireCardSections(document.getElementById('modal-content'));

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
  modal.dataset.kind = 'card';
  modalStatsPage = 1;
  modalCardSection = 'stats';
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
  if (artworkOverlay.classList.contains('open')) closeModalArtwork();
  modal.classList.remove('open');
  modal.inert = true;
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (modalReturnFocus?.isConnected) modalReturnFocus.focus();
}
