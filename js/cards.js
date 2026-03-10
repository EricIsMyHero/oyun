// ─── GitHub Şəkil Base URL ───────────────────────────────────────────────────
const GITHUB_IMG_BASE = 'https://raw.githubusercontent.com/EricIsMyHero/oyun/main/assets';

// Kartın şəkil URL-ini qaytarır: group/name.jpg
function getCardImageUrl(data) {
    const group = (data.group || '').toLowerCase().replace(/\s+/g, '-');
    const name  = (data.name  || 'unknown').toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9\-]/g, '');
    if (group) {
        return `${GITHUB_IMG_BASE}/${group}/${name}.jpg`;
    }
    return `${GITHUB_IMG_BASE}/${name}.jpg`;
}

// ── Tab listener köməkçisi ────────────────────────────────────────────────────
function setupCardListeners(el) {
    // Yeni layout sol tab listenerları
    el.querySelectorAll('.new-tab-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            el.querySelectorAll('.new-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.dataset.section;
            el.querySelectorAll('.new-panel').forEach(p => {
                p.classList.toggle('visible', p.dataset.panelId === target);
            });
        });
    });
    // Stats sub-tab listenerları
    el.querySelectorAll('.stats-sub-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            el.querySelectorAll('.stats-sub-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.dataset.statsTab;
            el.querySelectorAll('.stats-sub-panel').forEach(p => {
                p.classList.toggle('visible', p.dataset.statsPanel === target);
            });
        });
    });
    // Köhnə card-tabs (spell cards üçün)
    el.querySelectorAll('.card-tabs button').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            el.querySelectorAll('.card-tabs button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            el.querySelectorAll('.stats-section').forEach(s => s.classList.remove('visible'));
            const target = el.querySelector(`[data-section-id="${btn.dataset.section}"]`);
            if (target) target.classList.add('visible');
        });
    });
}

// ── Form data birləşdirici ────────────────────────────────────────────────────
function buildFormData(typeData, formData, rarity) {
    return {
        name:            formData.name            || typeData.name,
        note:            formData.note            || typeData.note || '',
        type:            formData.type            || typeData.type,
        rarity:          rarity,
        stats:           formData.stats           || typeData.stats,
        trait:           formData.trait           || typeData.trait || '-',
        additionalStats: formData.additionalStats || typeData.additionalStats,
        showlevels:      formData.showlevels      || typeData.showlevels,
        story:           formData.story           || typeData.story || '-'
    };
}

// ── Bir tip üçün multi-controls yaradır ──────────────────────────────────────
function buildMultiControls(typeData, frontEl, data) {
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
        const contentData = idx === 0 ? typeData : buildFormData(typeData, forms[idx - 1], data.rarity);
        frontEl.innerHTML = createCardContent(contentData).innerHTML;
        setupCardListeners(frontEl);
    };

    left.addEventListener('click',  e => { e.stopPropagation(); if (idx > 0)            goTo(idx - 1); });
    right.addEventListener('click', e => { e.stopPropagation(); if (idx < forms.length)  goTo(idx + 1); });

    return controls;
}

// ── Bir tip render edir ───────────────────────────────────────────────────────
function renderType(typeData, data) {
    const frontEl = document.createElement('div');
    frontEl.className = 'card-front';
    frontEl.innerHTML = createCardContent(typeData).innerHTML;
    setupCardListeners(frontEl);

    let controls = null;
    if (typeData.isMulti && typeData.forms && typeData.forms.length > 0) {
        controls = buildMultiControls(typeData, frontEl, data);
    }
    return { frontEl, controls };
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

    // ════════════════════════════════════════════════════════════════════
    //  ETHEREAL DUAL  —  type1 / type2
    // ════════════════════════════════════════════════════════════════════
    if (data.rarity.toLowerCase() === 'ethereal' && data.isDual && data.type1 && data.type2) {

        let activeType = 1;

        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';

        let { frontEl, controls: activeCtrl } = renderType(data.type1, data);
        cardInner.appendChild(frontEl);
        cardContainer.appendChild(cardInner);

        if (activeCtrl) {
            cardContainer.classList.add('has-multi-controls');
            cardContainer.appendChild(activeCtrl);
        }

        const dualBtn = document.createElement('button');
        dualBtn.className = 'dual-mode-button';
        dualBtn.title = 'İkinci Tipə Keçid';
        cardContainer.appendChild(dualBtn);

        dualBtn.addEventListener('click', e => {
            e.stopPropagation();
            activeType = activeType === 1 ? 2 : 1;
            cardContainer.classList.toggle('dual-active', activeType === 2);

            const oldCtrl = cardContainer.querySelector('.evolution-controls');
            if (oldCtrl) oldCtrl.remove();
            cardContainer.classList.remove('has-multi-controls');

            const typeData = activeType === 1 ? data.type1 : data.type2;
            const { frontEl: newFront, controls: newCtrl } = renderType(typeData, data);

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

        cardContainer.appendChild(buildMultiControls(data, cardFront, data));

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
    content.className = 'new-card-layout';

    if (!data || !data.stats) {
        console.error('Invalid card data:', data);
        content.innerHTML = '<p>Kart məlumatları düzgün deyil</p>';
        return content;
    }

    const badgeText = Array.isArray(data.type) ? data.type.join('/') : data.type;
    const rarityLower = (data.rarity || 'mundane').toLowerCase();

    content.innerHTML = `
        <div class="new-card-header">
            <div class="new-card-name">${data.name || 'Unknown'}</div>
            <span class="new-card-rarity r-badge-${rarityLower}">${data.rarity || ''}</span>
        </div>

        <div class="new-card-body">

            <!-- Sol: məzmun paneli -->
            <div class="new-card-panel-area">

                <!-- CARD PANELİ — ilk açılan, şəkil burada -->
                <div class="new-panel visible" data-panel-id="card-panel">
                    <div class="new-card-image-wrap">
                        <img src="${getCardImageUrl(data)}" alt="${data.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="new-card-image-placeholder" style="display:none;">
                            <i class="fa-solid fa-user" style="font-size:64px; color:#8a92b2;"></i>
                        </div>
                    </div>
                    <div class="new-card-type-badge">
                        ${data.note ? `<span class="type-note-line">${data.note}</span>` : ''}
                        <span class="type-main-line">${badgeText || 'Unknown'}</span>
                    </div>
                </div>

                <!-- STATS PANELİ -->
                <div class="new-panel" data-panel-id="stats-panel">
                    <div class="stats-sub-tabs">
                        <button class="stats-sub-btn active" data-stats-tab="main">Main</button>
                        <button class="stats-sub-btn" data-stats-tab="other">Other</button>
                    </div>
                    <div class="stats-sub-content">
                        <div class="stats-sub-panel visible" data-stats-panel="main">
                            <div class="stat-item"><b><i class="fa-solid fa-heart"></i> HP</b><span>${data.stats.health || 0}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-shield-halved"></i> Shield</b><span>${data.stats.shield || 0}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-hand-fist"></i> DMG</b><span>${data.stats.damage || 0}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-bolt"></i> DPS</b><span>${data.stats.sps || 0}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-tachometer-alt"></i> Atk Spd</b><span>${data.stats.attackSpeed || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-clock"></i> Delay</b><span>${data.stats.delay || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-certificate"></i> Mana</b><span>${data.stats.mana || 0}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-user"></i> Count</b><span>${data.stats.number || 0}</span></div>
                        </div>
                        <div class="stats-sub-panel" data-stats-panel="other">
                            <div class="stat-item"><b><i class="fa-solid fa-road"></i> Range</b><span>${data.additionalStats?.range || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-person-running"></i> Speed</b><span>${data.additionalStats?.speed || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-percent"></i> Crit%</b><span>${data.additionalStats?.criticalChance || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-crosshairs"></i> Crit DMG</b><span>${data.additionalStats?.criticDamage || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-percent"></i> LS%</b><span>${data.additionalStats?.lifestealChance || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-skull-crossbones"></i> Lifesteal</b><span>${data.additionalStats?.lifesteal || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-helmet-un"></i> DMG Red</b><span>${data.additionalStats?.damageminimiser || '-'}</span></div>
                            <div class="stat-item"><b><i class="fa-solid fa-wind"></i> Dodge</b><span>${data.additionalStats?.dodge || '-'}</span></div>
                        </div>
                    </div>
                </div>

                <!-- ABİLİTY PANELİ -->
                <div class="new-panel" data-panel-id="ability-panel">
                    <div class="trait trait-center">${data.trait || '-'}</div>
                </div>

                <!-- LEVELS PANELİ -->
                <div class="new-panel" data-panel-id="levels-panel">
                    <div class="stat-item"><b>Level 1</b><span>${data.showlevels?.level1 || '-'}</span></div>
                    <div class="stat-item"><b>Level 2</b><span>${data.showlevels?.level2 || '-'}</span></div>
                    <div class="stat-item"><b>Level 3</b><span>${data.showlevels?.level3 || '-'}</span></div>
                </div>

                <!-- STORY PANELİ -->
                <div class="new-panel" data-panel-id="story-panel">
                    <div class="story-content">${data.story || '-'}</div>
                </div>

            </div>

            <!-- Sağ tablar -->
            <div class="new-card-tabs">
                <button class="new-tab-btn active" data-section="card-panel">
                    <i class="fa-solid fa-id-card"></i><span>Card</span>
                </button>
                <button class="new-tab-btn" data-section="stats-panel">
                    <i class="fa-solid fa-chart-bar"></i><span>Stats</span>
                </button>
                <button class="new-tab-btn" data-section="ability-panel">
                    <i class="fa-solid fa-wand-sparkles"></i><span>Ability</span>
                </button>
                <button class="new-tab-btn" data-section="levels-panel">
                    <i class="fa-solid fa-arrow-up"></i><span>Levels</span>
                </button>
                <button class="new-tab-btn" data-section="story-panel">
                    <i class="fa-solid fa-book-open"></i><span>Story</span>
                </button>
            </div>

        </div>
    `;

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
                fetch(`rarity/${r}.json`).then(async res => {
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
