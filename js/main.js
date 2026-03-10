// ─── DOM Elementləri ─────────────────────────────────────────────────────────
const mainMenu     = document.getElementById('main-menu');
const cardsSection = document.getElementById('cards-section');
const showCardsBtn = document.getElementById('show-cards-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const filterButtons = document.querySelectorAll('.controls button');
const cardsContainer = document.getElementById('cards');
const searchInput   = document.getElementById('search-input');

// Info düyməsi funksionallığı
const showInfoBtn            = document.getElementById('show-info-btn');
const infoSection            = document.getElementById('info-section');
const backToMenuFromInfoBtn  = document.getElementById('back-to-menu-from-info-btn');
const infoContent            = document.getElementById('info-content');

// TEAM BUILDER VƏ LAYOUT ELEMENTLƏRİ
const openTeamBuilderBtn          = document.getElementById('open-team-builder-btn');
const closeTeamBuilderBtn         = document.getElementById('close-team-builder-btn');
const teamBuilderPanel            = document.getElementById('team-builder-panel');
const selectedTeamCards           = document.getElementById('selected-team-cards');
const totalHealth                 = document.getElementById('total-health');
const totalShield                 = document.getElementById('total-shield');
const totalDamage                 = document.getElementById('total-damage');
const totalDPS                    = document.getElementById('total-dps');
const totalMana                   = document.getElementById('total-mana');
const cheapestRecycleCostDisplay  = document.getElementById('cheapest-recycle-cost');
const clearTeamBtn                = document.getElementById('clear-team-btn');
const placeholderText             = document.getElementById('placeholder-text');

// ─── GLOBAL DƏYİŞƏNLƏR ───────────────────────────────────────────────────────
let allCardsData = [];
let activeRarity = 'all';
let currentTeam  = [];

// ─────────────────────────────────────────────
// NAVİQASİYA
// ─────────────────────────────────────────────

function showMenu() {
    mainMenu.classList.remove('hidden');
    cardsSection.classList.add('hidden');
    if (typeof spellsSection !== 'undefined' && spellsSection) spellsSection.classList.add('hidden');
    if (infoSection) infoSection.classList.add('hidden');
    if (cardsSection.classList.contains('team-mode-active')) {
        cardsSection.classList.remove('team-mode-active');
        if (teamBuilderPanel) teamBuilderPanel.classList.add('hidden');
        toggleCardButtons(false);
    }
}

function showCards() {
    mainMenu.classList.add('hidden');
    if (typeof spellsSection !== 'undefined' && spellsSection) spellsSection.classList.add('hidden');
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

// ─────────────────────────────────────────────
// KART VERİLƏRİNİ YÜKLƏ VƏ RENDER ET
// ─────────────────────────────────────────────

async function fetchAndRender(rarity) {
    if (!cardsContainer) return;

    cardsContainer.innerHTML = '<p style="color:var(--muted); padding:20px;">Kartlar yüklənir...</p>';

    try {
        if (allCardsData.length === 0) {
            const response = await fetch('data/cards.json');
            if (!response.ok) throw new Error('cards.json tapılmadı');
            allCardsData = await response.json();
        }
        activeRarity = rarity || 'all';
        filterAndRender();
    } catch (error) {
        cardsContainer.innerHTML = `<p style="color:#ff6b6b; padding:20px;">Xəta: ${error.message}</p>`;
    }
}

function filterAndRender() {
    if (!cardsContainer) return;

    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let filtered = allCardsData;

    // Nadirlik filtri
    if (activeRarity !== 'all') {
        filtered = filtered.filter(card =>
            card.rarity && card.rarity.toLowerCase() === activeRarity.toLowerCase()
        );
    }

    // Axtarış filtri
    if (searchTerm) {
        filtered = filtered.filter(card =>
            card.name && card.name.toLowerCase().includes(searchTerm)
        );
    }

    renderCards(filtered);
}

function renderCards(cards) {
    if (!cardsContainer) return;

    cardsContainer.innerHTML = '';

    if (cards.length === 0) {
        cardsContainer.innerHTML = '<p style="color:var(--muted); padding:20px;">Kart tapılmadı.</p>';
        return;
    }

    const isTeamMode = cardsSection.classList.contains('team-mode-active');

    cards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = `card rarity-${(card.rarity || 'common').toLowerCase()}`;

        const stats = card.stats || {};

        cardEl.innerHTML = `
            <div class="card-header">
                <h3 class="card-name">${card.name || 'Bilinməyən'}</h3>
                <span class="card-rarity">${card.rarity || ''}</span>
            </div>
            ${card.image ? `<img class="card-image" src="${card.image}" alt="${card.name}" loading="lazy">` : ''}
            <div class="card-stats">
                ${stats.health  !== undefined ? `<div class="stat"><span class="stat-label">❤️ HP</span><span class="stat-value">${stats.health}</span></div>`  : ''}
                ${stats.shield  !== undefined ? `<div class="stat"><span class="stat-label">🛡️ Shield</span><span class="stat-value">${stats.shield}</span></div>`  : ''}
                ${stats.damage  !== undefined ? `<div class="stat"><span class="stat-label">⚔️ DMG</span><span class="stat-value">${stats.damage}</span></div>`  : ''}
                ${stats.sps     !== undefined ? `<div class="stat"><span class="stat-label">💥 DPS</span><span class="stat-value">${stats.sps}</span></div>`     : ''}
                ${stats.mana    !== undefined ? `<div class="stat"><span class="stat-label">🔮 Mana</span><span class="stat-value">${stats.mana}</span></div>`    : ''}
            </div>
            ${card.description ? `<p class="card-description">${card.description}</p>` : ''}
            <button class="add-to-team-btn ${isTeamMode ? '' : 'hidden-team-btn'}" data-card-name="${card.name}">
                + Komandaya Əlavə Et
            </button>
        `;

        const addBtn = cardEl.querySelector('.add-to-team-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => addToTeam(card));
        }

        cardsContainer.appendChild(cardEl);
    });
}

// ─────────────────────────────────────────────
// TEAM BUILDER
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// INFO & GROUPS SEKSİYASI
// ─────────────────────────────────────────────

const infoTabGeneral  = document.getElementById('info-tab-general');
const infoTabGroups   = document.getElementById('info-tab-groups');
const groupsContent   = document.getElementById('groups-content');

let groupsDataCache = null;

function switchInfoTab(tab) {
    const isGeneral = tab === 'general';
    infoContent.classList.toggle('hidden', !isGeneral);
    groupsContent.classList.toggle('hidden', isGeneral);
    infoTabGeneral.classList.toggle('active', isGeneral);
    infoTabGroups.classList.toggle('active', !isGeneral);
    if (!isGeneral) loadGroups();
}

if (infoTabGeneral) infoTabGeneral.addEventListener('click', () => switchInfoTab('general'));
if (infoTabGroups)  infoTabGroups.addEventListener('click',  () => switchInfoTab('groups'));

async function loadGroups() {
    if (groupsDataCache) {
        displayGroups(groupsDataCache);
        return;
    }
    groupsContent.innerHTML = '<p style="color:var(--muted); padding:20px;">Qrup məlumatları yüklənir...</p>';
    try {
        const res = await fetch('data/groups.json');
        if (!res.ok) throw new Error('groups.json tapılmadı');
        groupsDataCache = await res.json();
        displayGroups(groupsDataCache);
    } catch (err) {
        groupsContent.innerHTML = `<p style="color:#ff6b6b; padding:20px;">Xəta: ${err.message}</p>`;
    }
}

function displayGroups(groups) {
    let html = '<div class="groups-grid">';
    groups.forEach(group => {
        const colorStyle = group.color ? `border-color: ${group.color}; --g-color: ${group.color};` : '';
        html += `
        <div class="group-card" style="${colorStyle}">
            <div class="group-card-header">
                <div class="group-icon-wrap" style="${group.color ? `background: ${group.color}22; border-color: ${group.color}55;` : ''}">
                    <i class="fa-solid ${group.icon || 'fa-users'}"></i>
                </div>
                <div class="group-title-block">
                    <h3 class="group-name">${group.name}</h3>
                    ${group.description ? `<p class="group-desc">${group.description}</p>` : ''}
                </div>
                <span class="group-count">${group.members.length} kart</span>
            </div>
            <div class="group-members">
                ${group.members.map(m => `<span class="group-member-tag">${m}</span>`).join('')}
            </div>
        </div>`;
    });
    html += '</div>';
    groupsContent.innerHTML = html;
}

if (showInfoBtn) {
    showInfoBtn.addEventListener('click', async () => {
        mainMenu.classList.add('hidden');
        infoSection.classList.remove('hidden');
        switchInfoTab('general');
        try {
            const response = await fetch('data/info.json');
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
        switchInfoTab('general');
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

// ─────────────────────────────────────────────
// EVENT LİSTENERLƏRİ
// ─────────────────────────────────────────────

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
// BAŞLANĞIC
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    showMenu();
    updateTeamStats();
    updateTeamPanel();
    if (teamBuilderPanel) teamBuilderPanel.classList.add('hidden');
});
