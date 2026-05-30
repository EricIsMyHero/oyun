/* ═══════════════════════════════════════════════════════
   js/modules/manapass.js
   Mana Pass — horizontal scroll track, JSON data
═══════════════════════════════════════════════════════ */

let mpInitialized = false;
let currentPass   = 'free';
let playerPoints  = 0;
let MP_DATA       = null;

const MP_PER_TIER = 500;

const ICONS = {
  'Gold':             '🪙',
  'Card Piece':       '🃏',
  'kart parçası':     '🃏',
  'Ruby Piece':       '🔴',
  'Card Shard':       '✨',
  'Tower Gear Piece': '⚙️',
  'Dungeon Key':      '🗝️',
  'Mana Shard':       '⚡',
  'Power Up Piece':   '🔋',
  'Mundane chest':    '📦',
  'Familiar chest':   '🟢',
  'Arcane chest':     '🔮',
  'arcane sandıq':    '🔮',
  'Relic chest':      '🔴',
  'altın':            '🪙',
};
function ico(name) { return ICONS[name] || '🎁'; }

/* ── Load data then init ── */
async function initManaPass() {
  if (mpInitialized) return;
  mpInitialized = true;

  try {
    const res = await fetch('data/manapass.json');
    MP_DATA = await res.json();
  } catch(e) {
    console.error('manapass.json yüklənmədi', e);
    return;
  }

  buildUI();
  bindEvents();
  rerender();
}

/* ── Build static HTML ── */
function buildUI() {
  const sec = document.getElementById('manapass-section');
  sec.innerHTML = `
    <div class="mp-hero">
      <div class="mp-hero__orb"></div>
      <p class="section-eyebrow">Mövsüm Keçidi</p>
      <h2 class="mp-hero__title">Mana Pass</h2>
      <p class="mp-hero__sub">Hər oyun, hər qələbə — daha çox Mana. 100 tier keç, ödüllərini topla.</p>

      <div class="mp-pass-selector" id="mp-pass-selector">
        <button class="mp-pass-btn active" data-pass="free">Free</button>
        <button class="mp-pass-btn" data-pass="pass">Mana Pass <span class="mp-pass-price">$5.99</span></button>
        <button class="mp-pass-btn mp-pass-btn--plus" data-pass="plus">Mana Pass Plus <span class="mp-pass-price">$11.99</span></button>
      </div>

      <div class="mp-info-bar">
        <div class="mp-info-item"><span class="mp-info-icon">📅</span><span class="mp-info-label">Mövsüm</span><span class="mp-info-val">50 gün</span></div>
        <div class="mp-info-item"><span class="mp-info-icon">⚡</span><span class="mp-info-label">Hər tier</span><span class="mp-info-val">500 MP</span></div>
        <div class="mp-info-item"><span class="mp-info-icon">🏆</span><span class="mp-info-label">Gündəlik</span><span class="mp-info-val">5 tier</span></div>
        <div class="mp-info-item"><span class="mp-info-icon">🎯</span><span class="mp-info-label">1. həftə</span><span class="mp-info-val">20. tier</span></div>
      </div>

      <div class="mp-earn-grid">
        <div class="mp-earn-row"><span>⚔️ Qazanma</span><span class="mp-earn-pts">+250</span></div>
        <div class="mp-earn-row"><span>💀 Uduzma</span><span class="mp-earn-pts">+125</span></div>
        <div class="mp-earn-row"><span>🎮 3-5 oyun</span><span class="mp-earn-pts">+150</span></div>
        <div class="mp-earn-row"><span>🎮 6-7 oyun</span><span class="mp-earn-pts">+175</span></div>
        <div class="mp-earn-row"><span>🎮 8-9 oyun</span><span class="mp-earn-pts">+200</span></div>
        <div class="mp-earn-row"><span>🎮 10+ oyun</span><span class="mp-earn-pts">+225</span></div>
        <div class="mp-earn-row"><span>🃏 Qoşulma</span><span class="mp-earn-pts">+75</span></div>
        <div class="mp-earn-row"><span>⬆️ Kart UP</span><span class="mp-earn-pts">+50</span></div>
      </div>
    </div>

    <!-- Progress -->
    <div class="mp-progress-section">
      <div class="mp-progress-inner">
        <div class="mp-prog-left">
          <span class="mp-prog-label">Tier</span>
          <span class="mp-prog-tier" id="mp-tier-display">0</span>
        </div>
        <div class="mp-prog-center">
          <div class="mp-prog-bar"><div class="mp-prog-fill" id="mp-prog-fill"></div></div>
          <div class="mp-prog-sub"><span id="mp-pts-cur">0</span> / 500 MP</div>
        </div>
        <div class="mp-prog-right">
          <span class="mp-prog-label">Toplam</span>
          <span class="mp-prog-total" id="mp-total-pts">0</span>
        </div>
      </div>
      <div class="mp-sim-btns">
        <button class="mp-sim-btn" data-pts="250">⚔️ +250</button>
        <button class="mp-sim-btn" data-pts="125">💀 +125</button>
        <button class="mp-sim-btn" data-pts="175">🎮 +175</button>
        <button class="mp-sim-btn" data-pts="150">🎮 +150</button>
        <button class="mp-sim-btn" data-pts="50">⬆️ +50</button>
        <button class="mp-sim-btn" data-pts="75">🃏 +75</button>
        <button class="mp-sim-btn mp-sim-btn--reset" id="mp-reset-btn">↺ Sıfırla</button>
      </div>
    </div>

    <!-- Legend -->
    <div class="mp-legend">
      <div class="mp-legend-item mp-legend-free"><span></span> Free</div>
      <div class="mp-legend-item mp-legend-pass" id="mp-legend-pass"><span></span> Mana Pass</div>
      <div class="mp-legend-item mp-legend-plus" id="mp-legend-plus"><span></span> Plus</div>
    </div>

    <!-- Horizontal tier track -->
    <div class="mp-track-outer" id="mp-track-outer">
      <div class="mp-track-scroll" id="mp-track-scroll">
        <!-- rows: tier label, free, pass, plus -->
        <div class="mp-track-row-tier"  id="mp-row-tier"></div>
        <div class="mp-track-row-free"  id="mp-row-free"></div>
        <div class="mp-track-row-pass"  id="mp-row-pass"></div>
        <div class="mp-track-row-plus"  id="mp-row-plus"></div>
        <div class="mp-track-line"></div>
      </div>
    </div>

    <!-- Bonus section -->
    <div class="mp-bonus-section">
      <div class="mp-bonus-header">
        <h3 class="mp-bonus-title">⭐ Bonus Ödüllər</h3>
        <p class="mp-bonus-sub">${MP_DATA.bonus.label} — 100. tier-dən sonra</p>
      </div>
      <div class="mp-bonus-cards" id="mp-bonus-cards"></div>
    </div>

    <!-- Totals -->
    <div class="mp-totals-section">
      <h3 class="mp-totals-title">Mövsüm Cəmi</h3>
      <div class="mp-totals-grid" id="mp-totals-grid"></div>
    </div>
  `;
}

/* ── Bind events ── */
function bindEvents() {
  /* Pass selector */
  document.querySelectorAll('.mp-pass-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mp-pass-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPass = btn.dataset.pass;
      rerender();
    });
  });

  /* Sim buttons */
  document.querySelectorAll('.mp-sim-btn[data-pts]').forEach(btn => {
    btn.addEventListener('click', () => {
      playerPoints += parseInt(btn.dataset.pts);
      rerender();
      scrollToCurrentTier();
    });
  });

  document.getElementById('mp-reset-btn')?.addEventListener('click', () => {
    playerPoints = 0;
    rerender();
  });
}

/* ── Current tier ── */
function currentTier() { return Math.min(Math.floor(playerPoints / MP_PER_TIER), 100); }
function ptsInTier()   { return playerPoints % MP_PER_TIER; }

/* ── Render track ── */
function renderTrack() {
  const rowTier = document.getElementById('mp-row-tier');
  const rowFree = document.getElementById('mp-row-free');
  const rowPass = document.getElementById('mp-row-pass');
  const rowPlus = document.getElementById('mp-row-plus');
  if (!rowTier) return;

  const tier = currentTier();
  const tiers = MP_DATA.tiers; // 101 items: tier 0..100

  let htmlTier = '', htmlFree = '', htmlPass = '', htmlPlus = '';

  tiers.forEach((t, i) => {
    const claimed = i < tier;
    const current = i === tier;
    const milestone = (i + 1) % 10 === 0 && i < 100;
    const isLast = i === 100;

    const cls = [
      'mp-cell',
      claimed ? 'claimed' : '',
      current ? 'current' : '',
      milestone ? 'milestone' : '',
      isLast ? 'final' : '',
    ].filter(Boolean).join(' ');

    /* Tier number cell */
    htmlTier += `<div class="${cls} mp-cell--tier" data-i="${i}">
      ${isLast ? '<span class="mp-final-star">★</span>' : ''}
      <span class="mp-tier-num">${i}</span>
      ${claimed ? '<div class="mp-check">✓</div>' : ''}
      ${current ? '<div class="mp-cur-arrow">▼</div>' : ''}
    </div>`;

    /* Reward cell builder */
    const cell = (r, trackCls) => {
      if (!r) return `<div class="${cls} ${trackCls} mp-cell--reward mp-cell--empty"></div>`;
      return `<div class="${cls} ${trackCls} mp-cell--reward" title="${r.qty} ${r.item}">
        ${claimed ? '<div class="mp-check-sm">✓</div>' : ''}
        <span class="mp-rwd-icon">${ico(r.item)}</span>
        <span class="mp-rwd-qty">${r.qty}</span>
        <span class="mp-rwd-lbl">${r.item}</span>
      </div>`;
    };

    htmlFree += cell(t.free, 'mp-cell--free');
    htmlPass += cell(t.pass, 'mp-cell--pass');
    htmlPlus += cell(t.plus, 'mp-cell--plus');
  });

  rowTier.innerHTML = htmlTier;
  rowFree.innerHTML = htmlFree;
  rowPass.innerHTML = htmlPass;
  rowPlus.innerHTML = htmlPlus;

  /* Show/hide pass & plus rows */
  const passVisible = currentPass !== 'free';
  const plusVisible = currentPass === 'plus';
  document.getElementById('mp-row-pass').style.display = passVisible ? 'flex' : 'none';
  document.getElementById('mp-row-plus').style.display = plusVisible ? 'flex' : 'none';
  document.getElementById('mp-legend-pass').style.opacity = passVisible ? '1' : '0.3';
  document.getElementById('mp-legend-plus').style.opacity = plusVisible ? '1' : '0.3';
}

/* ── Render bonus ── */
function renderBonus() {
  const container = document.getElementById('mp-bonus-cards');
  if (!container) return;
  const b = MP_DATA.bonus;

  const showPass = currentPass !== 'free';
  const showPlus = currentPass === 'plus';

  const rewardLine = (label, r1, r2) => r1 ? `
    <div class="mp-bonus-row">
      <span class="mp-bonus-track-label">${label}</span>
      <span class="mp-bonus-rwd">${ico(r1.item)} ${r1.qty} ${r1.item}</span>
      ${r2 ? `<span class="mp-bonus-sep">+</span><span class="mp-bonus-rwd">${ico(r2.item)} ${r2.qty} ${r2.item}</span>` : ''}
    </div>` : '';

  container.innerHTML = `
    <div class="mp-bonus-card">
      <div class="mp-bonus-icon">🎁</div>
      <div class="mp-bonus-info">
        <div class="mp-bonus-name">${b.label}</div>
        ${rewardLine('Free', b.free, b.free2)}
        ${showPass ? rewardLine('Pass', b.pass, b.pass2) : ''}
        ${showPlus ? rewardLine('Plus', b.plus, b.plus2) : ''}
      </div>
    </div>
  `;
}

/* ── Render totals ── */
function renderTotals() {
  const grid = document.getElementById('mp-totals-grid');
  if (!grid) return;
  const tier = currentTier();
  if (tier === 0) { grid.innerHTML = `<p class="mp-totals-empty">Hələ heç bir tier tamamlanmayıb.</p>`; return; }

  const totals = {};
  const passes = currentPass === 'free' ? ['free'] : currentPass === 'pass' ? ['free','pass'] : ['free','pass','plus'];

  MP_DATA.tiers.slice(0, tier).forEach(t => {
    passes.forEach(p => {
      const r = t[p];
      if (r && r.qty > 0) totals[r.item] = (totals[r.item]||0) + r.qty;
    });
  });

  grid.innerHTML = Object.entries(totals).map(([item, qty]) => `
    <div class="mp-total-card">
      <span class="mp-total-icon">${ico(item)}</span>
      <span class="mp-total-qty">${qty.toLocaleString()}</span>
      <span class="mp-total-name">${item}</span>
    </div>`).join('');
}

/* ── Progress bar ── */
function updateProgress() {
  const t = currentTier();
  const pts = ptsInTier();
  const pct = t >= 100 ? 100 : (pts / MP_PER_TIER) * 100;

  const tierEl  = document.getElementById('mp-tier-display');
  const fillEl  = document.getElementById('mp-prog-fill');
  const ptsEl   = document.getElementById('mp-pts-cur');
  const totalEl = document.getElementById('mp-total-pts');

  if (tierEl)  tierEl.textContent  = t >= 100 ? '100 ✓' : t;
  if (fillEl)  { fillEl.style.width = pct + '%'; fillEl.classList.add('flash'); setTimeout(()=>fillEl.classList.remove('flash'),500); }
  if (ptsEl)   ptsEl.textContent   = t >= 100 ? '—' : pts;
  if (totalEl) totalEl.textContent = playerPoints.toLocaleString();
}

/* ── Scroll to current tier ── */
function scrollToCurrentTier() {
  const t = currentTier();
  const outer = document.getElementById('mp-track-outer');
  if (!outer) return;
  // Each cell is 88px wide; scroll so current is near center
  const cellW = 88;
  const target = t * cellW - outer.clientWidth / 2 + cellW / 2;
  outer.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
}

function rerender() {
  updateProgress();
  renderTrack();
  renderBonus();
  renderTotals();
}

window.initManaPass = initManaPass;
