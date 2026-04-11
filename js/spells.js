// ─────────────────────────────────────────────
// SPELLS SEKSİYA
// ─────────────────────────────────────────────

const showSpellsBtn        = document.getElementById('show-spells-btn');
const spellsSection        = document.getElementById('spells-section');
const backToMenuFromSpells = document.getElementById('back-to-menu-from-spells-btn');
const spellsGrid           = document.getElementById('spells-grid');
const spellSearchInput     = document.getElementById('spell-search-input');

const spellFilterAll       = document.getElementById('spell-filter-all');
const spellFilterNormal    = document.getElementById('spell-filter-normal');
const spellFilterBuilding  = document.getElementById('spell-filter-building');
const spellTypeButtons     = [spellFilterAll, spellFilterNormal, spellFilterBuilding];

const spellRarityAll       = document.getElementById('spell-rarity-all');
const spellRarityCommon    = document.getElementById('spell-rarity-common');
const spellRarityEpic      = document.getElementById('spell-rarity-epic');
const spellRarityLegendary = document.getElementById('spell-rarity-legendary');
const spellRarityButtons   = [spellRarityAll, spellRarityCommon, spellRarityEpic, spellRarityLegendary];

// main.js-dəki dəyişənlərə təhlükəsiz giriş (lazy lookup)
const getMainMenu    = () => document.getElementById('main-menu');
const getCardsSection = () => document.getElementById('cards-section');
const getInfoSection  = () => document.getElementById('info-section');

let allSpellsData     = [];
let activeSpellType   = 'all';
let activeSpellRarity = 'all';

const SPELL_RARITY_CSS = {
    common:    'r-familiar',
    epic:      'r-arcane',
    legendary: 'r-apex'
};

function showMenu_fromSpells() {
    spellsSection.classList.add('hidden');
    getMainMenu().classList.remove('hidden');
}

function showSpells() {
    getMainMenu().classList.add('hidden');
    const cs = getCardsSection(); if (cs) cs.classList.add('hidden');
    const is = getInfoSection();  if (is) is.classList.add('hidden');
    spellsSection.classList.remove('hidden');
    fetchAndRenderSpells();
    if (spellSearchInput) spellSearchInput.value = '';
}

async function fetchAndRenderSpells() {
    if (spellsGrid) spellsGrid.innerHTML = '<p>Büyü məlumatları yüklənir...</p>';
    try {
        if (allSpellsData.length === 0) {
            const res = await fetch('data/spells.json');
            if (!res.ok) throw new Error('spells.json yüklənə bilmədi');
            allSpellsData = await res.json();
        }
        filterAndRenderSpells();
    } catch (err) {
        console.error('Spells yükleme xəta:', err);
        if (spellsGrid) spellsGrid.innerHTML = '<p style="color:red;">Büyü məlumatları yüklənərkən xəta baş verdi.</p>';
    }
}

function filterAndRenderSpells() {
    const search = spellSearchInput ? spellSearchInput.value.toLowerCase().trim() : '';
    let filtered = allSpellsData;
    if (activeSpellType !== 'all')   filtered = filtered.filter(s => s.type.toLowerCase() === activeSpellType);
    if (activeSpellRarity !== 'all') filtered = filtered.filter(s => s.rarity.toLowerCase() === activeSpellRarity);
    if (search.length > 0)           filtered = filtered.filter(s => s.name.toLowerCase().includes(search));
    renderSpells(filtered);
}

function renderSpells(spells) {
    if (!spellsGrid) return;
    spellsGrid.innerHTML = '';
    if (spells.length === 0) {
        spellsGrid.innerHTML = '<p>Bu filtrə görə büyü tapılmadı.</p>';
        return;
    }
    spells.forEach(s => spellsGrid.appendChild(createSpellCard(s)));
}

function createSpellCard(data) {
    const rarityClass = SPELL_RARITY_CSS[data.rarity.toLowerCase()] || '';
    const card = document.createElement('article');
    card.className = `card-container card ${rarityClass} spell-card`;
    if (data.rarity.toLowerCase() === 'legendary') card.classList.add('spell-legendary-glow');

    const rarityLower = (data.rarity || '').toLowerCase();

    // ── Spell məzmununu yeni layout ilə yarat ──────────────────────────────
    const createSpellContent = (spellData, isForm = false) => {
        const content = document.createElement('div');
        content.className = 'new-card-layout';

        const isCardLike = isForm || (spellData.stats.hasOwnProperty('health') && spellData.stats.hasOwnProperty('shield'));

        let panelsHTML = '';
        let tabsHTML   = '';

        if (isCardLike) {
            // Kart kimi spell (health + shield olan) — stats/ability/levels/story
            const typeText = Array.isArray(spellData.type) ? spellData.type.join('/') : spellData.type;
            panelsHTML = `
                <div class="new-panel visible" data-panel-id="sp-stats">
                    <div class="stats-sub-tabs">
                        <button class="stats-sub-btn active" data-stats-tab="main">Main</button>
                        <button class="stats-sub-btn" data-stats-tab="other">Other</button>
                    </div>
                    <div class="stats-sub-content">
                        <div class="stats-sub-panel visible" data-stats-panel="main">
                            <div class="stat-item"><b><i class="fa-solid fa-heart"></i> HP</b><span>${spellData.stats.health || 0}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-shield-halved"></i> Shield</b><span>${spellData.stats.shield || 0}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-hand-fist"></i> DMG</b><span>${spellData.stats.damage || 0}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-bolt"></i> DPS</b><span>${spellData.stats.sps || 0}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-tachometer-alt"></i> Atk Speed</b><span>${spellData.stats.attackSpeed || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-clock"></i> Delay</b><span>${spellData.stats.delay || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-certificate"></i> Mana</b><span>${spellData.stats.mana || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-user"></i> Number</b><span>${spellData.stats.number || 0}</span></div>
                        </div>
                        <div class="stats-sub-panel" data-stats-panel="other">
                            <div class="stat-item"><b><i class="fa-solid fa-road"></i> Range</b><span>${spellData.additionalStats?.range || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-person-running"></i> Speed</b><span>${spellData.additionalStats?.speed || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-percent"></i> Crit Chance</b><span>${spellData.additionalStats?.criticalChance || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-crosshairs"></i> Crit DMG</b><span>${spellData.additionalStats?.criticDamage || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-percent"></i> LS Chance</b><span>${spellData.additionalStats?.lifestealChance || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-skull-crossbones"></i> Lifesteal</b><span>${spellData.additionalStats?.lifesteal || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-helmet-un"></i> DMG Reduct</b><span>${spellData.additionalStats?.damageminimiser || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-wind"></i> Dodge</b><span>${spellData.additionalStats?.dodge || '-'}</span></div>
                        </div>
                    </div>
                </div>
                <div class="new-panel" data-panel-id="sp-ability">
                    <div class="trait trait-center">${spellData.trait || '-'}</div>
                </div>
                <div class="new-panel" data-panel-id="sp-levels">
                    <div class="stat-item"><b>Level 1</b><span>${spellData.showlevels?.level1 || '-'}</span></div>
                    <div class="stat-item"><b>Level 2</b><span>${spellData.showlevels?.level2 || '-'}</span></div>
                    <div class="stat-item"><b>Level 3</b><span>${spellData.showlevels?.level3 || '-'}</span></div>
                </div>
                <div class="new-panel" data-panel-id="sp-story">
                    <div class="story-content">${spellData.story || '-'}</div>
                </div>`;
            tabsHTML = `
                <button class="new-tab-btn active" data-section="sp-stats">
                    <i class="fa-solid fa-chart-bar"></i><span>Stats</span>
                </button>
                <button class="new-tab-btn" data-section="sp-ability">
                    <i class="fa-solid fa-wand-sparkles"></i><span>Ability</span>
                </button>
                <button class="new-tab-btn" data-section="sp-levels">
                    <i class="fa-solid fa-arrow-up"></i><span>Levels</span>
                </button>
                <button class="new-tab-btn" data-section="sp-story">
                    <i class="fa-solid fa-book-open"></i><span>Story</span>
                </button>`;
        } else {
            // Normal / Building spell
            const isBuildingType = data.type === 'Building';
            const mainStatsHTML = isBuildingType
                ? `<div class="stat-item"><b><i class="fa-solid fa-heart"></i> Health</b><span>${spellData.stats.health || '0'}</span></div>
                   <div class="stat-item"><b><i class="fa-solid fa-clock"></i> Lifetime</b><span>${spellData.stats.lifetime || '-'}</span></div>
                   <div class="stat-item"><b><i class="fa-solid fa-hand-fist"></i> Dmg→Card</b><span>${spellData.stats.damageToCard || '0'}</span></div>
                   <div class="stat-item"><b><i class="fa-solid fa-castle"></i> Dmg→Castle</b><span>${spellData.stats.damageToCastle || '0'}</span></div>
                   <div class="stat-item"><b><i class="fa-solid fa-tachometer-alt"></i> Atk Speed</b><span>${spellData.stats.attackSpeed || '-'}</span></div>
                   <div class="stat-item"><b><i class="fa-solid fa-road"></i> Range</b><span>${spellData.stats.range || '-'}</span></div>
                   <div class="stat-item"><b><i class="fa-solid fa-expand"></i> Size</b><span>${spellData.stats.size || '-'}</span></div>
                   <div class="stat-item"><b><i class="fa-solid fa-bolt"></i> Energy</b><span>${spellData.stats.energy || '0'}</span></div>`
                : `<div class="stat-item"><b><i class="fa-solid fa-hand-fist"></i> Dmg→Card</b><span>${spellData.stats.damageToCard || '0'}</span></div>
                   <div class="stat-item"><b><i class="fa-solid fa-castle"></i> Dmg→Castle</b><span>${spellData.stats.damageToCastle || '0'}</span></div>
                   <div class="stat-item"><b><i class="fa-solid fa-clock"></i> Interval</b><span>${spellData.stats.timeBetweenDamage || '-'}</span></div>
                   <div class="stat-item"><b><i class="fa-solid fa-road"></i> Range</b><span>${spellData.stats.range || '-'}</span></div>
                   <div class="stat-item"><b><i class="fa-solid fa-expand"></i> Size</b><span>${spellData.stats.size || '-'}</span></div>
                   <div class="stat-item"><b><i class="fa-solid fa-bolt"></i> Energy</b><span>${spellData.stats.energy || '0'}</span></div>`;

            panelsHTML = `
                <div class="new-panel visible" data-panel-id="sp-stats">
                    <div class="stats-sub-content" style="margin-top:0;">
                        <div class="stats-sub-panel visible" data-stats-panel="main">
                            ${mainStatsHTML}
                        </div>
                    </div>
                </div>
                <div class="new-panel" data-panel-id="sp-treat">
                    <div class="trait trait-center">${data.treat || '-'}</div>
                </div>
                <div class="new-panel" data-panel-id="sp-story">
                    <div class="story-content">${data.story || '-'}</div>
                </div>`;
            tabsHTML = `
                <button class="new-tab-btn active" data-section="sp-stats">
                    <i class="fa-solid fa-chart-bar"></i><span>Stats</span>
                </button>
                <button class="new-tab-btn" data-section="sp-treat">
                    <i class="fa-solid fa-wand-sparkles"></i><span>Treat</span>
                </button>
                <button class="new-tab-btn" data-section="sp-story">
                    <i class="fa-solid fa-book-open"></i><span>Story</span>
                </button>`;
        }

        const spellTypeText = Array.isArray(data.type) ? data.type.join('/') : data.type;

        content.innerHTML = `
            <div class="new-card-header">
                <div class="new-card-name">${spellData.name || data.name || 'Unknown'}</div>
                <span class="new-card-rarity r-badge-${rarityLower}">${data.rarity || ''}</span>
            </div>
            <div class="new-card-body">
                <div class="new-card-panel-area">
                    ${panelsHTML}
                </div>
                <div class="new-card-tabs">
                    ${tabsHTML}
                </div>
            </div>`;

        return content;
    };

    // Tab listener-lər (new-tab-btn + stats-sub-btn)
    const setupTabListeners = container => {
        // Əsas sağ tablar
        container.querySelectorAll('.new-tab-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                container.querySelectorAll('.new-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                container.querySelectorAll('.new-panel').forEach(p => p.classList.remove('visible'));
                const target = container.querySelector(`[data-panel-id="${btn.dataset.section}"]`);
                if (target) target.classList.add('visible');
            });
        });
        // Stats alt tablar
        container.querySelectorAll('.stats-sub-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const area = btn.closest('.new-panel');
                area.querySelectorAll('.stats-sub-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                area.querySelectorAll('.stats-sub-panel').forEach(p => p.classList.remove('visible'));
                const target = area.querySelector(`[data-stats-panel="${btn.dataset.statsTab}"]`);
                if (target) target.classList.add('visible');
            });
        });
    };

    if (data.isMulti && data.forms && data.forms.length > 0) {
        let idx = 0;
        card.classList.add('has-multi-controls');

        const spellContent = createSpellContent(data, false);
        card.appendChild(spellContent);
        setupTabListeners(spellContent);

        const multiControls = document.createElement('div');
        multiControls.className = 'evolution-controls';

        const leftArrow = document.createElement('button');
        leftArrow.className = 'evolution-arrow';
        leftArrow.innerHTML = '◀';
        leftArrow.disabled = true;

        const progressBar = document.createElement('div');
        progressBar.className = 'evolution-progress';
        const mainDot = document.createElement('span');
        mainDot.className = 'progress-dot active';
        progressBar.appendChild(mainDot);
        data.forms.forEach(() => {
            const dot = document.createElement('span');
            dot.className = 'progress-dot';
            progressBar.appendChild(dot);
        });

        const rightArrow = document.createElement('button');
        rightArrow.className = 'evolution-arrow';
        rightArrow.innerHTML = '▶';

        multiControls.appendChild(leftArrow);
        multiControls.appendChild(progressBar);
        multiControls.appendChild(rightArrow);

        const updateForm = newIdx => {
            idx = newIdx;
            progressBar.querySelectorAll('.progress-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
            leftArrow.disabled  = idx === 0;
            rightArrow.disabled = idx === data.forms.length;
            const formData   = idx === 0 ? data : data.forms[idx - 1];
            const isFormFlag = idx !== 0;
            spellContent.innerHTML = createSpellContent(formData, isFormFlag).innerHTML;
            setupTabListeners(spellContent);
        };

        leftArrow.addEventListener('click',  e => { e.stopPropagation(); if (idx > 0)                updateForm(idx - 1); });
        rightArrow.addEventListener('click', e => { e.stopPropagation(); if (idx < data.forms.length) updateForm(idx + 1); });

        card.appendChild(multiControls);
    } else {
        const spellContent = createSpellContent(data, false);
        card.appendChild(spellContent);
        setupTabListeners(spellContent);
    }

    return card;
}

// ── EVENT LİSTENERLƏRİ (Spells) ──────────────────────────────────────────────

if (showSpellsBtn)        showSpellsBtn.addEventListener('click', showSpells);
if (backToMenuFromSpells) backToMenuFromSpells.addEventListener('click', showMenu_fromSpells);

spellTypeButtons.forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
        spellTypeButtons.forEach(b => b && b.classList.remove('active'));
        btn.classList.add('active');
        activeSpellType = btn.id.split('-').pop();
        filterAndRenderSpells();
    });
});

spellRarityButtons.forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
        spellRarityButtons.forEach(b => b && b.classList.remove('active'));
        btn.classList.add('active');
        activeSpellRarity = btn.id.split('-').pop();
        filterAndRenderSpells();
    });
});

if (spellSearchInput) spellSearchInput.addEventListener('input', filterAndRenderSpells);
