// DOM Elementləri
const mainMenu = document.getElementById('main-menu');
const cardsSection = document.getElementById('cards-section');
const showCardsBtn = document.getElementById('show-cards-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const filterButtons = document.querySelectorAll('.controls button');
const cardsContainer = document.getElementById('cards');
const searchInput = document.getElementById('search-input');

// Info düyməsi funksionallığı
const showInfoBtn = document.getElementById('show-info-btn');
const infoSection = document.getElementById('info-section');
const backToMenuFromInfoBtn = document.getElementById('back-to-menu-from-info-btn');
const infoContent = document.getElementById('info-content');

// TEAM BUILDER VƏ LAYOUT ELEMENTLƏRİ
const openTeamBuilderBtn = document.getElementById('open-team-builder-btn');
const closeTeamBuilderBtn = document.getElementById('close-team-builder-btn');
const teamBuilderPanel = document.getElementById('team-builder-panel');
const selectedTeamCards = document.getElementById('selected-team-cards');
const totalHealth = document.getElementById('total-health');
const totalShield = document.getElementById('total-shield');
const totalDamage = document.getElementById('total-damage');
const totalDPS = document.getElementById('total-dps');
const totalMana = document.getElementById('total-mana');
const cheapestRecycleCostDisplay = document.getElementById('cheapest-recycle-cost');
const clearTeamBtn = document.getElementById('clear-team-btn');
const placeholderText = document.getElementById('placeholder-text');

// GLOBAL DƏYİŞƏNLƏR
let allCardsData = [];
let activeRarity = 'all';
let currentTeam = [];


function showMenu() {
    mainMenu.classList.remove('hidden');
    cardsSection.classList.add('hidden');
    if (spellsSection) spellsSection.classList.add('hidden');
    if (infoSection) infoSection.classList.add('hidden');
    if (cardsSection.classList.contains('team-mode-active')) {
        cardsSection.classList.remove('team-mode-active');
        if (teamBuilderPanel) teamBuilderPanel.classList.add('hidden');
        toggleCardButtons(false);
    }
}

function showCards() {
    mainMenu.classList.add('hidden');
    if (spellsSection) spellsSection.classList.add('hidden');
    if (infoSection) infoSection.classList.add('hidden');
    cardsSection.classList.remove('hidden');
    fetchAndRender('all');
    if (searchInput) searchInput.value = '';
}

function toggleCardButtons(isVisible) {
    const buttons = document.querySelectorAll('.hidden-team-btn, .add-to-team-btn');
    buttons.forEach(button => {
        if (isVisible) {
            button.classList.remove('hidden-team-btn');
        } else {
            button.classList.add('hidden-team-btn');
        }
    });
}


// Kart yaratmaq üçün əsas funksiya
function createCardElement(data) {
    const cardContainer = document.createElement('article');
    cardContainer.className = `card-container card r-${data.rarity.toLowerCase()}`;

    // TEAM BUILDER DÜYMƏSİ
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'card-buttons-container';

    const addButton = document.createElement('button');
    addButton.className = 'add-to-team-btn hidden-team-btn action-button';
    addButton.textContent = '+ Team';
    addButton.title = 'Komandaya Əlavə Et';
    addButton.dataset.cardName = data.name;
    addButton.addEventListener('click', e => { e.stopPropagation(); addToTeam(data); });

    buttonsContainer.appendChild(addButton);
    cardContainer.appendChild(buttonsContainer);

    // ── Tab listener köməkçisi ────────────────────────────────────────────
    const setupCardListeners = el => {
        el.querySelectorAll('.card-tabs button').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                el.querySelectorAll('.card-tabs button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                el.querySelectorAll('.stats-section').forEach(s => s.classList.remove('visible'));
                el.querySelector(`[data-section-id="${btn.dataset.section}"]`).classList.add('visible');
            });
        });
    };

    // ── Form data birləşdirici ────────────────────────────────────────────
    // Formun çatışmayan sahələrini typeData-dan tamamlayır
    const buildFormData = (typeData, formData) => ({
        name:            formData.name            || typeData.name,
        note:            formData.note            || typeData.note || '',
        type:            formData.type            || typeData.type,
        rarity:          data.rarity,
        stats:           formData.stats           || typeData.stats,
        trait:           formData.trait           || typeData.trait || '-',
        additionalStats: formData.additionalStats || typeData.additionalStats,
        showlevels:      formData.showlevels      || typeData.showlevels,
        story:           formData.story           || typeData.story || '-'
    });

    // ── Bir tip üçün multi-controls yaradır ──────────────────────────────
    const buildMultiControls = (typeData, frontEl) => {
        const forms = typeData.forms || [];

        const controls = document.createElement('div');
        controls.className = 'evolution-controls';

        const left = document.createElement('button');
        left.className = 'evolution-arrow';
        left.innerHTML = '◀';
        left.disabled = true;

        const bar = document.createElement('div');
        bar.className = 'evolution-progress';

        const mainDot = document.createElement('span');
        mainDot.className = 'progress-dot active';
        bar.appendChild(mainDot);
        forms.forEach(() => {
            const d = document.createElement('span');
            d.className = 'progress-dot';
            bar.appendChild(d);
        });

        const right = document.createElement('button');
        right.className = 'evolution-arrow';
        right.innerHTML = '▶';
        if (forms.length === 0) right.disabled = true;

        controls.appendChild(left);
        controls.appendChild(bar);
        controls.appendChild(right);

        let idx = 0;
        const goTo = newIdx => {
            idx = newIdx;
            bar.querySelectorAll('.progress-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
            left.disabled  = idx === 0;
            right.disabled = idx === forms.length;
            const contentData = idx === 0 ? typeData : buildFormData(typeData, forms[idx - 1]);
            frontEl.innerHTML = createCardContent(contentData).innerHTML;
            setupCardListeners(frontEl);
        };

        left.addEventListener('click',  e => { e.stopPropagation(); if (idx > 0)            goTo(idx - 1); });
        right.addEventListener('click', e => { e.stopPropagation(); if (idx < forms.length)  goTo(idx + 1); });

        return controls;
    };

    // ── Bir tip render edir, frontEl + controls qaytarır ─────────────────
    const renderType = typeData => {
        const frontEl = document.createElement('div');
        frontEl.className = 'card-front';
        frontEl.innerHTML = createCardContent(typeData).innerHTML;
        setupCardListeners(frontEl);

        let controls = null;
        if (typeData.isMulti && typeData.forms && typeData.forms.length > 0) {
            controls = buildMultiControls(typeData, frontEl);
        }
        return { frontEl, controls };
    };

    // ════════════════════════════════════════════════════════════════════
    //  ETHEREAL DUAL  —  type1 / type2
    // ════════════════════════════════════════════════════════════════════
    if (data.rarity.toLowerCase() === 'ethereal' && data.isDual && data.type1 && data.type2) {

        let activeType = 1;

        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';

        // İlk tipi render et
        let { frontEl, controls: activeCtrl } = renderType(data.type1);
        cardInner.appendChild(frontEl);
        cardContainer.appendChild(cardInner);

        if (activeCtrl) {
            cardContainer.classList.add('has-multi-controls');
            cardContainer.appendChild(activeCtrl);
        }

        // II keçid düyməsi
        const dualBtn = document.createElement('button');
        dualBtn.className = 'dual-mode-button';
        dualBtn.title = 'İkinci Tipə Keçid';
        cardContainer.appendChild(dualBtn);

        dualBtn.addEventListener('click', e => {
            e.stopPropagation();
            activeType = activeType === 1 ? 2 : 1;
            cardContainer.classList.toggle('dual-active', activeType === 2);

            // Köhnə controls-u sil
            const oldCtrl = cardContainer.querySelector('.evolution-controls');
            if (oldCtrl) oldCtrl.remove();
            cardContainer.classList.remove('has-multi-controls');

            // Yeni tipi render et
            const typeData = activeType === 1 ? data.type1 : data.type2;
            const { frontEl: newFront, controls: newCtrl } = renderType(typeData);

            cardInner.innerHTML = '';
            cardInner.appendChild(newFront);

            if (newCtrl) {
                cardContainer.classList.add('has-multi-controls');
                cardContainer.insertBefore(newCtrl, dualBtn);
            }
        });

    // ════════════════════════════════════════════════════════════════════
    //  ASCENDANT TRANSFORM
    // ════════════════════════════════════════════════════════════════════
    } else if (data.isAscendant && data.upgradedsecondForm) {
        let isUpgraded = false;

        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';

        const cardFront = createCardContent(data);
        cardFront.classList.add('card-front');
        cardInner.appendChild(cardFront);
        cardContainer.appendChild(cardInner);
        setupCardListeners(cardFront);
        cardContainer.classList.add('no-flip');

        const transformButton = document.createElement('button');
        transformButton.className = 'transform-button';
        transformButton.title = 'Transform';
        transformButton.addEventListener('click', e => {
            e.stopPropagation();
            isUpgraded = !isUpgraded;
            const d = isUpgraded
                ? { ...data,
                    stats: data.upgradedsecondForm.stats,
                    trait: data.upgradedsecondForm.trait,
                    additionalStats: data.upgradedsecondForm.additionalStats,
                    showlevels: data.upgradedsecondForm.showlevels,
                    story: data.upgradedsecondForm.story }
                : data;
            cardContainer.classList.toggle('is-upgraded', isUpgraded);
            cardFront.innerHTML = createCardContent(d).innerHTML;
            setupCardListeners(cardFront);
        });
        cardContainer.appendChild(transformButton);

    // ════════════════════════════════════════════════════════════════════
    //  isMulti  —  çox formalı kart
    // ════════════════════════════════════════════════════════════════════
    } else if (data.isMulti && data.forms && data.forms.length > 0) {
        cardContainer.classList.add('has-multi-controls');

        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';
        const cardFront = createCardContent(data);
        cardFront.classList.add('card-front');
        cardInner.appendChild(cardFront);
        cardContainer.appendChild(cardInner);
        setupCardListeners(cardFront);

        cardContainer.appendChild(buildMultiControls(data, cardFront));

    // ════════════════════════════════════════════════════════════════════
    //  SADƏ KART
    // ════════════════════════════════════════════════════════════════════
    } else {
        const singleCard = createCardContent(data);
        singleCard.classList.add('card-single');
        cardContainer.appendChild(singleCard);
        setupCardListeners(singleCard);
    }

    // Ethereal glow
    if (data.rarity.toLowerCase() === 'ethereal') {
        const glowDiv = document.createElement('div');
        glowDiv.className = 'card-glow';
        glowDiv.setAttribute('aria-hidden', 'true');
        cardContainer.appendChild(glowDiv);
    }

    return cardContainer;
}

// Kartın iç məzmununu yaradan köməkçi funksiya
function createCardContent(data) {
    const content = document.createElement('div');

    if (!data || !data.stats) {
        console.error('Invalid card data:', data);
        content.innerHTML = '<p>Kart məlumatları düzgün deyil</p>';
        return content;
    }

    const badgeText = Array.isArray(data.type) ? data.type.join('/') : data.type;
    content.innerHTML = `
        <div class="stripe"></div>
        <div class="head">
            <div class="name">
                ${data.name || 'Unknown'}
                ${data.note ? `<span class="note">${data.note}</span>` : ""}
            </div>
            <span class="badge">${badgeText || 'Unknown'}</span>
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
                <div class="stat-item"><b>Health <i class="fa-solid fa-heart"></i></b><span>${data.stats.health || 0}</span></div>
                <div class="stat-item"><b>Shield <i class="fa-solid fa-shield-halved"></i></b><span>${data.stats.shield || 0}</span></div>
                <div class="stat-item"><b>Damage <i class="fa-solid fa-hand-fist"></i></b><span>${data.stats.damage || 0}</span></div>
                <div class="stat-item"><b>D.P.S <i class="fa-solid fa-bolt"></i></b><span>${data.stats.sps || 0}</span></div>
                <div class="stat-item"><b>Attack Speed <i class="fa-solid fa-tachometer-alt"></i></b><span>${data.stats.attackSpeed || '-'}</span></div>
                <div class="stat-item"><b>Delay <i class="fa-solid fa-clock"></i></b><span>${data.stats.delay || '-'}</span></div>
                <div class="stat-item"><b>Mana <i class="fa-solid fa-certificate"></i></b><span>${data.stats.mana || 0}</span></div>
                <div class="stat-item"><b>Number <i class="fa-solid fa-user"></i></b><span>${data.stats.number || 0}</span></div>
            </div>

            <div class="stats-section" data-section-id="additional-stats">
                <div class="stat-item"><b>Range <i class="fa-solid fa-road"></i></b><span>${data.additionalStats?.range || '-'}</span></div>
                <div class="stat-item"><b>Speed <i class="fa-solid fa-person-running"></i></b><span>${data.additionalStats?.speed || '-'}</span></div>
                <div class="stat-item"><b>Critical Chance <i class="fa-solid fa-percent"></i></b><span>${data.additionalStats?.criticalChance || '-'}</span></div>
                <div class="stat-item"><b>Critical Damage <i class="fa-solid fa-crosshairs"></i></b><span>${data.additionalStats?.criticDamage || '-'}</span></div>
                <div class="stat-item"><b>Life Steal Chance <i class="fa-solid fa-percent "></i></b><span>${data.additionalStats?.lifestealChance || '-'}</span></div>
                <div class="stat-item"><b>Life Steal <i class="fa-solid fa-skull-crossbones "></i></b><span>${data.additionalStats?.lifesteal || '-'}</span></div>
                <div class="stat-item"><b>Damage Reduction <i class="fa-solid fa-helmet-un "></i></b><span>${data.additionalStats?.damageminimiser || '-'}</span></div>
                <div class="stat-item"><b>Dodge Chance <i class="fa-solid fa-wind "></i></b><span>${data.additionalStats?.dodge || '-'}</span></div>
            </div>

            <div class="stats-section" data-section-id="trait">
                <div class="trait trait-center">${data.trait || '-'}</div>
            </div>

            <div class="stats-section" data-section-id="showlevels">
                <div class="stat-item"><b>Level 1</b><span>${data.showlevels?.level1 || '-'}</span></div>
                <div class="stat-item"><b>Level 2</b><span>${data.showlevels?.level2 || '-'}</span></div>
                <div class="stat-item"><b>Level 3</b><span>${data.showlevels?.level3 || '-'}</span></div>
            </div>

            <div class="stats-section" data-section-id="story-section">
                <div class="story-content">${data.story || '-'}</div>
            </div>

        </div>`;

    return content;
}

function renderCards(cardsToRender) {
    if (!cardsContainer) return;

    cardsContainer.innerHTML = '';
    if (cardsToRender.length === 0) {
        cardsContainer.innerHTML = '<p>Bu endərlikdə kart tapılmadı.</p>';
        return;
    }
    cardsToRender.forEach(data => {
        cardsContainer.appendChild(createCardElement(data));
    });
}

function getNumericStat(statValue) {
    if (typeof statValue === 'string') {
        const cleanedValue = statValue.replace(/[^\d.]/g, '');
        return parseInt(cleanedValue) || 0;
    }
    return statValue || 0;
}

function addToTeam(cardData) {
    const isAlreadyInTeam = currentTeam.some(card => card.name === cardData.name);

    if (isAlreadyInTeam) {
        alert(`❌ '${cardData.name}' kartı artıq komandada var. Hər kartdan yalnız bir dəfə istifadə edə bilərsiniz.`);
        return;
    }

    if (currentTeam.length >= 8) {
        alert('Komandada maksimum 8 kart ola bilər.');
        return;
    }

    const cardToAdd = {
        name: cardData.name,
        health: getNumericStat(cardData.stats.health),
        shield: getNumericStat(cardData.stats.shield),
        damage: getNumericStat(cardData.stats.damage),
        sps: getNumericStat(cardData.stats.sps),
        mana: getNumericStat(cardData.stats.mana),
        originalCardData: cardData
    };

    currentTeam.push(cardToAdd);
    updateTeamPanel();
    updateTeamStats();
}

function removeFromTeam(cardName) {
    const index = currentTeam.findIndex(card => card.name === cardName);
    if (index > -1) {
        currentTeam.splice(index, 1);
    }
    updateTeamPanel();
    updateTeamStats();
}

function updateTeamPanel() {
    if (!selectedTeamCards || !placeholderText) return;

    selectedTeamCards.innerHTML = '';

    if (currentTeam.length === 0) {
        placeholderText.style.display = 'block';
        selectedTeamCards.appendChild(placeholderText);
        return;
    }
    placeholderText.style.display = 'none';

    currentTeam.forEach(card => {
        const teamItem = document.createElement('div');
        teamItem.className = 'team-card-item';
        teamItem.innerHTML = `
            <span>${card.name}</span>
            <button class="remove-from-team-btn" data-card-name="${card.name}">X</button>
        `;
        selectedTeamCards.appendChild(teamItem);
    });

    selectedTeamCards.querySelectorAll('.remove-from-team-btn').forEach(button => {
        button.addEventListener('click', () => {
            removeFromTeam(button.dataset.cardName);
        });
    });
}

function updateTeamStats() {
    const manaCosts = [];

    const stats = currentTeam.reduce((acc, card) => {
        acc.health += card.health;
        acc.shield += card.shield;
        acc.damage += card.damage;
        acc.dps    += card.sps;
        acc.mana   += card.mana;
        manaCosts.push(parseInt(card.mana) || 0);
        return acc;
    }, { health: 0, shield: 0, damage: 0, dps: 0, mana: 0 });

    let cheapestRecycleCost = 0;
    if (manaCosts.length > 0) {
        manaCosts.sort((a, b) => a - b);
        cheapestRecycleCost = manaCosts.slice(0, 4).reduce((sum, mana) => sum + mana, 0);
    }

    if (totalHealth)  totalHealth.textContent  = stats.health;
    if (totalShield)  totalShield.textContent  = stats.shield;
    if (totalDamage)  totalDamage.textContent  = stats.damage;
    if (totalDPS)     totalDPS.textContent     = stats.dps;
    if (totalMana)    totalMana.textContent    = stats.mana;
    if (cheapestRecycleCostDisplay) cheapestRecycleCostDisplay.textContent = cheapestRecycleCost;

    if (openTeamBuilderBtn) {
        openTeamBuilderBtn.textContent = `Komandanı Göstər (${currentTeam.length}/8)`;
    }
}

function filterAndRender() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let filteredCards = allCardsData;

    if (activeRarity !== 'all') {
        filteredCards = filteredCards.filter(card => card.rarity.toLowerCase() === activeRarity);
    }

    if (searchTerm.length > 0) {
        filteredCards = filteredCards.filter(card =>
            card.name.toLowerCase().includes(searchTerm)
        );
    }

    renderCards(filteredCards);

    if (teamBuilderPanel && !teamBuilderPanel.classList.contains('hidden')) {
        toggleCardButtons(true);
    } else {
        toggleCardButtons(false);
    }
}

async function fetchAndRender(rarity) {
    if (cardsContainer) cardsContainer.innerHTML = '<p>Məlumatlar yüklənir...</p>';
    activeRarity = rarity;
    try {
        if (allCardsData.length === 0) {
            const rarities = ['mundane', 'familiar', 'arcane', 'relic', 'ascendant', 'apex', 'ethereal'];
            const fetchPromises = rarities.map(r =>
                fetch(`${r}.json`).then(async res => {
                    if (!res.ok) {
                        if (res.status === 404) {
                            console.warn(`${r}.json tapılmadı, bu endərlik ötürülür.`);
                            return [];
                        }
                        throw new Error(`${r}.json yüklənmədi`);
                    }
                    const text = await res.text();
                    return text ? JSON.parse(text) : [];
                })
            );
            const results = await Promise.all(fetchPromises);
            allCardsData = results.flat();
        }
        filterAndRender();
    } catch (error) {
        console.error('Məlumatları yükləmə zamanı xəta:', error);
        if (cardsContainer) cardsContainer.innerHTML = '<p style="color:red;">Kart məlumatları yüklənərkən xəta baş verdi.</p>';
    }
}

// EVENT LİSTENERLƏRİ

showCardsBtn.addEventListener('click', showCards);
backToMenuBtn.addEventListener('click', showMenu);

['show-boosters-btn', 'show-towers-btn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
        btn.addEventListener('click', () => {
            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
            modal.style.padding = '20px';
            modal.style.backgroundColor = 'var(--card)';
            modal.style.color = 'var(--text)';
            modal.style.borderRadius = '12px';
            modal.style.boxShadow = 'var(--shadow)';
            modal.style.zIndex = '1000';
            modal.textContent = "Coming Soon...";
            document.body.appendChild(modal);
            setTimeout(() => { document.body.removeChild(modal); }, 3000);
        });
    }
});

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        const rarity = button.id.split('-')[1];
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        activeRarity = rarity;
        filterAndRender();
    });
});

if (searchInput) {
    searchInput.addEventListener('input', filterAndRender);
} else {
    console.warn("Axtarış inputu (id='search-input') tapılmadı. HTML-i yoxlayın.");
}

if (openTeamBuilderBtn) {
    openTeamBuilderBtn.addEventListener('click', () => {
        if (cardsSection) cardsSection.classList.add('team-mode-active');
        if (teamBuilderPanel) teamBuilderPanel.classList.remove('hidden');
        updateTeamPanel();
        toggleCardButtons(true);
    });
}

if (closeTeamBuilderBtn) {
    closeTeamBuilderBtn.addEventListener('click', () => {
        if (cardsSection) cardsSection.classList.remove('team-mode-active');
        if (teamBuilderPanel) teamBuilderPanel.classList.add('hidden');
        toggleCardButtons(false);
    });
}

if (clearTeamBtn) {
    clearTeamBtn.addEventListener('click', () => {
        currentTeam = [];
        updateTeamPanel();
        updateTeamStats();
    });
}

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
            const res = await fetch('spells.json');
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

// ── EVENT LİSTENERLƏRİ (Spells) ──────────────────

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

// ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    showMenu();
    updateTeamStats();
    updateTeamPanel();
    if (teamBuilderPanel) teamBuilderPanel.classList.add('hidden');
});

// Info düyməsinə klikləmə
if (showInfoBtn) {
    showInfoBtn.addEventListener('click', async () => {
        mainMenu.classList.add('hidden');
        infoSection.classList.remove('hidden');
        try {
            const response = await fetch('info.json');
            if (!response.ok) throw new Error('Məlumat yüklənə bilmədi');
            displayInfo(await response.json());
        } catch (error) {
            infoContent.innerHTML = `<p style="color: #ff6b6b;">Xəta: ${error.message}</p>`;
        }
    });
}

if (backToMenuFromInfoBtn) {
    backToMenuFromInfoBtn.addEventListener('click', () => {
        infoSection.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    });
}

function displayInfo(data) {
    let html = '';
    if (data.title)       html += `<h2 style="margin-bottom: 20px;">${data.title}</h2>`;
    if (data.description) html += `<p style="margin-bottom: 20px; line-height: 1.6;">${data.description}</p>`;
    if (data.sections && Array.isArray(data.sections)) {
        data.sections.forEach(section => {
            html += `<div style="margin-bottom: 30px;">`;
            if (section.heading) html += `<h3 style="margin-bottom: 10px; color: #4a9eff;">${section.heading}</h3>`;
            if (section.content) html += `<p style="line-height: 1.6;">${section.content}</p>`;
            if (section.list && Array.isArray(section.list)) {
                html += `<ul style="margin-top: 10px; padding-left: 20px;">`;
                section.list.forEach(item => { html += `<li style="margin-bottom: 8px;">${item}</li>`; });
                html += `</ul>`;
            }
            html += `</div>`;
        });
    }
    infoContent.innerHTML = html;
}
