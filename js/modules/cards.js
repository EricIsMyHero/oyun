/* ═══════════════════════════════════════════════════════
   js/modules/cards.js
   Card database – fetch, filter, render
═══════════════════════════════════════════════════════ */

/* Card images now served from Cloudflare R2 */
const GITHUB_BASE = 'https://pub-ebf8690f3ea54a55853e5e920cb6903a.r2.dev';

const RARITY_FILES = ['mundane', 'familiar', 'arcane', 'relic', 'ascendant', 'apex', 'emergent', 'ethereal'];

let allCards     = [];
let activeRarity  = 'all';
let activeClass   = 'all';
let activeCType   = 'all';
let activeSort    = 'default';
let filtersReady  = false;

/* ── Transliterate non-ASCII characters for file paths ── */
function slugify(str) {
  return (str || '')
    .toLowerCase()
    .replace(/İ/g, 'i').replace(/ı/g, 'i')
    .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u').replace(/ü/g, 'u')
    .replace(/Ş/g, 's').replace(/ş/g, 's')
    .replace(/Ö/g, 'o').replace(/ö/g, 'o')
    .replace(/Ç/g, 'c').replace(/ç/g, 'c')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

/* ── Sorted turn keys for an Emergent card (numeric ascending) ── */
function emergentTurnKeys(card) {
  return Object.keys(card.turns || {}).sort((a, b) => parseFloat(a) - parseFloat(b));
}

/* ── Resolve the "primary" nested form used for image/type
      fallbacks when a card isn't rendered as itself:
      isDual → type1 (Emergent cards keep their stats at root
      level, so they don't need this fallback). ── */
function _primaryFormSource(card) {
  if (card.isDual && card.type1) return card.type1;
  return card;
}

/* ── Build the image URL for a card ── */
function getCardImg(card) {
  const src     = _primaryFormSource(card);
  const group   = slugify(src.group || card.group || '');
  const imgKey  = slugify(src.id || card.id || src.name || card.name || '');
  return group
    ? `${GITHUB_BASE}/${group}/${imgKey}.jpg`
    : `${GITHUB_BASE}/${imgKey}.jpg`;
}

/* Power scoring is shared with Arena. */
function _toNum(value){return globalThis.ClashCardPower.number(value);}
function calcCardPower(card){return globalThis.ClashCardPower.raw(card);}
let _scoreCardPower=()=>550;
function computeAllPowerScores(cards){_scoreCardPower=globalThis.ClashCardPower.scorer(cards);}
function scaledPower(card){return _scoreCardPower(card);}

/* Power Score bar color: grey→green→yellow→red */
function powerColor(score) {
  if (score >= 800) return '#f87171';   /* red   – OP */
  if (score >= 500) return '#facc15';   /* gold  – strong */
  if (score >= 300) return '#4ade80';   /* green – average */
  return '#6b7280';                      /* grey  – weak */
}

/* Outline symbols match the card detail view. */
function getRarityIcon(r) {
  const key = {mundane:'entity', familiar:'healrecovery', arcane:'ability', relic:'levels',
    ascendant:'speed', apex:'star', emergent:'forms', ethereal:'attackShape'}[(r || '').toLowerCase()];
  return modalIcon(key || 'entity');
}

/* ── Entry point called by navigation.js ── */
async function initCards() {
  if (allCards.length === 0) {
    const grid = document.getElementById('cards-grid');
    grid.innerHTML = '<div class="no-results">Loading entity registry…</div>';

    try {
      const results = await Promise.all(
        RARITY_FILES.map(r =>
          fetch(`rarity/${r}.json`, { cache:'no-cache' })
            .then(res => res.ok ? res.json() : [])
            .catch(() => [])
        )
      );
      allCards = results.flat();
      computeAllPowerScores(allCards);
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

  function bindGroup(attr, setter) {
    document.querySelectorAll(`.filter-btn[${attr}]`).forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll(`.filter-btn[${attr}]`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setter(btn.getAttribute(attr));
        renderCards();
      };
    });
  }

  bindGroup('data-rarity', v => activeRarity = v);
  bindGroup('data-class',  v => activeClass  = v);
  bindGroup('data-ctype',  v => activeCType  = v);
  bindGroup('data-sort',   v => activeSort   = v);

  document.getElementById('card-search').oninput = () => renderCards();
}

/* ── Normalise type list for a card ── */
function cardTypes(card) {
  const src = _primaryFormSource(card);
  const t = src.type || card.type || [];
  const arr = Array.isArray(t) ? t : [t];
  // normalise Az→En synonyms
  return arr.map(s => {
    const m = { 'İnsan':'Human','Heyvan':'Animal','Ölü':'Dead','Uzaylı':'Alien','Ruh':'Spirit','Varlıq':'Entity' };
    return m[s] || s;
  });
}

/* ── Render filtered + sorted card list ── */
function renderCards() {
  const grid   = document.getElementById('cards-grid');
  const search = document.getElementById('card-search').value.toLowerCase().trim();
  const count  = document.getElementById('card-count');

  let filtered = allCards;

  // Rarity
  if (activeRarity !== 'all')
    filtered = filtered.filter(c => (c.rarity || '').toLowerCase() === activeRarity);

  // Class
  if (activeClass !== 'all')
    filtered = filtered.filter(c => {
      const choices = c.isDual ? [c.type1, c.type2].filter(Boolean) : [c];
      return choices.some(form => (form.class || c.class || '') === activeClass);
    });

  // Type
  if (activeCType !== 'all')
    filtered = filtered.filter(c => cardTypes(c).includes(activeCType));

  // Search
  if (search)
    filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(search));

  // Sort
  filtered = [...filtered].sort((a, b) => {
    switch (activeSort) {
      case 'default':    return 0; // JSON sırası qorunur
      case 'power-desc': return scaledPower(b) - scaledPower(a);
      case 'power-asc':  return scaledPower(a) - scaledPower(b);
      case 'name-asc':   return (a.name || '').localeCompare(b.name || '');
      case 'name-desc':  return (b.name || '').localeCompare(a.name || '');
      case 'mana-asc':   return _toNum((a.stats||{}).mana) - _toNum((b.stats||{}).mana);
      case 'mana-desc':  return _toNum((b.stats||{}).mana) - _toNum((a.stats||{}).mana);
      default: return 0;
    }
  });

  count.textContent = filtered.length;

  if (!filtered.length) {
    grid.innerHTML = '<div class="no-results">No Cards found matching your filters.</div>';
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
  const ps     = scaledPower(card);
  const pcol   = powerColor(ps);

  const el = document.createElement('div');
  el.className = `card-item r-${rarity}`;
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-haspopup', 'dialog');
  el.style.animationDelay = `${idx * 0.04}s`;

  el.innerHTML = `
    <div class="card-rarity-bar"></div>
    <div class="card-img-wrap">
      <img src="${imgUrl}" alt="${card.name}" loading="lazy"
           onerror="this.style.display='none';
                    this.parentElement.querySelector('.card-img-placeholder').style.display='flex';">
      <div class="card-img-overlay"></div>
      <div class="card-img-placeholder" style="display:none">${getRarityIcon(rarity)}</div>
      <div class="card-mana-badge">${mana}</div>
    </div>
    <div class="card-body">
      <div class="card-name">${card.name || 'Unknown'}</div>
      <div class="card-group-tag">${card.group || 'Stagnantia'}</div>
      ${card.abilityName && card.abilityName !== '—' ? `<div class="card-ability-tag">${modalIcon('ability')} ${card.abilityName}</div>` : ''}
      <div class="card-mini-stats">
        ${stats.health !== undefined ? `<div class="mini-stat"><span class="mini-stat-icon">${modalIcon('health')}</span><span class="mini-stat-val">${stats.health}</span></div>` : ''}
        ${stats.damage !== undefined ? `<div class="mini-stat"><span class="mini-stat-icon">${modalIcon('damage')}</span><span class="mini-stat-val">${stats.damage}</span></div>` : ''}
        ${stats.shield !== undefined ? `<div class="mini-stat"><span class="mini-stat-icon">${modalIcon('shield')}</span><span class="mini-stat-val">${stats.shield}</span></div>` : ''}
      </div>
      <div class="card-power-wrap">
        <div class="card-power-label">PWR <span class="card-power-num" style="color:${pcol}">${ps}</span><span class="card-power-max">/1000</span></div>
        <div class="card-power-bar-bg"><div class="card-power-bar-fill" style="width:${ps / 10}%;background:${pcol}"></div></div>
      </div>
    </div>
    <div class="card-rarity-tag">${card.rarity || ''}</div>
  `;

  el.addEventListener('click', () => { el.focus({preventScroll:true}); openModal(card); });
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
  });
  return el;
}
