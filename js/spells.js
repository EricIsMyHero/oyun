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
    mainMenu.classList.remove('hidden');
}

function showSpells() {
    mainMenu.classList.add('hidden');
    cardsSection.classList.add('hidden');
    infoSection.classList.add('hidden');
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

    const createSpellContent = (spellData, isForm = false) => {
        const content = document.createElement('div');
        content.className = 'spell-content-wrapper';

        const isCardLike = isForm || (spellData.stats.hasOwnProperty('health') && spellData.stats.hasOwnProperty('shield'));

        if (isCardLike) {
            const typeText = Array.isArray(spellData.type) ? spellData.type.join('/') : spellData.type;
            content.innerHTML = `
                <div class="stripe"></div>
                <div class="head">
                    <div class="name">
                        ${spellData.name || data.name || 'Unknown'}
                        ${spellData.note ? `<span class="note">${spellData.note}</span>` : ''}
                    </div>
                    <span class="badge">${typeText || 'Unknown'}</span>
                </div>
                <div class="card-tabs">
                    <button class="active" data-section="main-stats">Main</button>
                    <button data-section="additional-stats">Other</button>
                    <button data-section="trait">Ability</button>
                    <button data-section="showlevels">Levels</button>
                    <button data-section="story-section">Story</button>
                </div>
                <div class="card-content-area">
                    <div class="stats-section visible" data-section-id="main-stats">
                        <div class="stat-item"><b>Health <i class="fa-solid fa-heart"></i></b><span>${spellData.stats.health || 0}</span></div>
                        <div class="stat-item"><b>Shield <i class="fa-solid fa-shield-halved"></i></b><span>${spellData.stats.shield || 0}</span></div>
                        <div class="stat-item"><b>Damage <i class="fa-solid fa-hand-fist"></i></b><span>${spellData.stats.damage || 0}</span></div>
                        <div class="stat-item"><b>D.P.S <i class="fa-solid fa-bolt"></i></b><span>${spellData.stats.sps || 0}</span></div>
                        <div class="stat-item"><b>Attack Speed <i class="fa-solid fa-tachometer-alt"></i></b><span>${spellData.stats.attackSpeed || '-'}</span></div>
                        <div class="stat-item"><b>Delay <i class="fa-solid fa-clock"></i></b><span>${spellData.stats.delay || '-'}</span></div>
                        <div class="stat-item"><b>Mana <i class="fa-solid fa-certificate"></i></b><span>${spellData.stats.mana || '-'}</span></div>
                        <div class="stat-item"><b>Number <i class="fa-solid fa-user"></i></b><span>${spellData.stats.number || 0}</span></div>
                    </div>
                    <div class="stats-section" data-section-id="additional-stats">
                        <div class="stat-item"><b>Range <i class="fa-solid fa-road"></i></b><span>${spellData.additionalStats?.range || '-'}</span></div>
                        <div class="stat-item"><b>Speed <i class="fa-solid fa-person-running"></i></b><span>${spellData.additionalStats?.speed || '-'}</span></div>
                        <div class="stat-item"><b>Critical Chance <i class="fa-solid fa-percent"></i></b><span>${spellData.additionalStats?.criticalChance || '-'}</span></div>
                        <div class="stat-item"><b>Critical Damage <i class="fa-solid fa-crosshairs"></i></b><span>${spellData.additionalStats?.criticDamage || '-'}</span></div>
                        <div class="stat-item"><b>Life Steal Chance <i class="fa-solid fa-percent"></i></b><span>${spellData.additionalStats?.lifestealChance || '-'}</span></div>
                        <div class="stat-item"><b>Life Steal <i class="fa-solid fa-skull-crossbones"></i></b><span>${spellData.additionalStats?.lifesteal || '-'}</span></div>
                        <div class="stat-item"><b>Damage Reduction <i class="fa-solid fa-helmet-un"></i></b><span>${spellData.additionalStats?.damageminimiser || '-'}</span></div>
                        <div class="stat-item"><b>Dodge Chance <i class="fa-solid fa-wind"></i></b><span>${spellData.additionalStats?.dodge || '-'}</span></div>
                    </div>
                    <div class="stats-section" data-section-id="trait">
                        <div class="trait trait-center">${spellData.trait || '-'}</div>
                    </div>
                    <div class="stats-section" data-section-id="showlevels">
                        <div class="stat-item"><b>Level 1</b><span>${spellData.showlevels?.level1 || '-'}</span></div>
                        <div class="stat-item"><b>Level 2</b><span>${spellData.showlevels?.level2 || '-'}</span></div>
                        <div class="stat-item"><b>Level 3</b><span>${spellData.showlevels?.level3 || '-'}</span></div>
                    </div>
                    <div class="stats-section" data-section-id="story-section">
                        <div class="story-content">${spellData.story || '-'}</div>
                    </div>
                </div>`;
        } else {
            const isBuildingType = data.type === 'Building';
            const mainStatsHTML = isBuildingType
                ? `<div class="stat-item"><b>Health <i class="fa-solid fa-heart"></i></b><span>${spellData.stats.health || '0'}</span></div>
                   <div class="stat-item"><b>Lifetime <i class="fa-solid fa-clock"></i></b><span>${spellData.stats.lifetime || '-'}</span></div>
                   <div class="stat-item"><b>Dmg to Card <i class="fa-solid fa-hand-fist"></i></b><span>${spellData.stats.damageToCard || '0'}</span></div>
                   <div class="stat-item"><b>Dmg to Castle <i class="fa-solid fa-castle"></i></b><span>${spellData.stats.damageToCastle || '0'}</span></div>
                   <div class="stat-item"><b>Attack Speed <i class="fa-solid fa-tachometer-alt"></i></b><span>${spellData.stats.attackSpeed || '-'}</span></div>
                   <div class="stat-item"><b>Range <i class="fa-solid fa-road"></i></b><span>${spellData.stats.range || '-'}</span></div>
                   <div class="stat-item"><b>Size <i class="fa-solid fa-expand"></i></b><span>${spellData.stats.size || '-'}</span></div>
                   <div class="stat-item"><b>Energy <i class="fa-solid fa-bolt"></i></b><span>${spellData.stats.energy || '0'}</span></div>`
                : `<div class="stat-item"><b>Dmg to Card <i class="fa-solid fa-hand-fist"></i></b><span>${spellData.stats.damageToCard || '0'}</span></div>
                   <div class="stat-item"><b>Dmg to Castle <i class="fa-solid fa-castle"></i></b><span>${spellData.stats.damageToCastle || '0'}</span></div>
                   <div class="stat-item"><b>Interval <i class="fa-solid fa-clock"></i></b><span>${spellData.stats.timeBetweenDamage || '-'}</span></div>
                   <div class="stat-item"><b>Range <i class="fa-solid fa-road"></i></b><span>${spellData.stats.range || '-'}</span></div>
                   <div class="stat-item"><b>Size <i class="fa-solid fa-expand"></i></b><span>${spellData.stats.size || '-'}</span></div>
                   <div class="stat-item"><b>Energy <i class="fa-solid fa-bolt"></i></b><span>${spellData.stats.energy || '0'}</span></div>`;

            content.innerHTML = `
                <div class="stripe"></div>
                <div class="head">
                    <div class="name">
                        ${spellData.name || data.name || 'Unknown'}
                        <span class="badge spell-type-badge spell-type-${data.type.toLowerCase()}">${data.type}</span>
                    </div>
                    <span class="badge spell-rarity-badge">${data.rarity}</span>
                </div>
                <div class="card-tabs">
                    <button class="active" data-section="spell-main">Stats</button>
                    <button data-section="spell-treat">Treat</button>
                    <button data-section="spell-story">Story</button>
                </div>
                <div class="card-content-area">
                    <div class="stats-section visible" data-section-id="spell-main">${mainStatsHTML}</div>
                    <div class="stats-section" data-section-id="spell-treat">
                        <div class="trait trait-center">${data.treat || '-'}</div>
                    </div>
                    <div class="stats-section" data-section-id="spell-story">
                        <div class="story-content">${data.story || '-'}</div>
                    </div>
                </div>`;
        }
        return content;
    };

    const setupTabListeners = container => {
        container.querySelectorAll('.card-tabs button').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                container.querySelectorAll('.card-tabs button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                container.querySelectorAll('.stats-section').forEach(sec => sec.classList.remove('visible'));
                container.querySelector(`[data-section-id="${btn.dataset.section}"]`).classList.add('visible');
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

        leftArrow.addEventListener('click',  e => { e.stopPropagation(); if (idx > 0)               updateForm(idx - 1); });
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
