/**
 * RPG CARD SYSTEM - CORE SCRIPT
 * Bütün sistemləri (Team, Compare, Filter) əhatə edir.
 */

// --- DOM ELEMENTLƏRİ ---
const mainMenu = document.getElementById('main-menu');
const cardsSection = document.getElementById('cards-section');
const showCardsBtn = document.getElementById('show-cards-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const filterButtons = document.querySelectorAll('.controls button');
const cardsContainer = document.getElementById('cards');
const searchInput = document.getElementById('search-input'); 

// Team Builder Elementləri
const openTeamBuilderBtn = document.getElementById('open-team-builder-btn');
const closeTeamBuilderBtn = document.getElementById('close-team-builder-btn');
const teamBuilderPanel = document.getElementById('team-builder-panel');
const selectedTeamCards = document.getElementById('selected-team-cards');
const clearTeamBtn = document.getElementById('clear-team-btn');
const placeholderText = document.getElementById('placeholder-text');

// Statistika Ekranları
const totalHealth = document.getElementById('total-health');
const totalShield = document.getElementById('total-shield');
const totalDamage = document.getElementById('total-damage');
const totalDPS = document.getElementById('total-dps');
const totalMana = document.getElementById('total-mana');
const cheapestRecycleCostDisplay = document.getElementById('cheapest-recycle-cost');

// Müqayisə Paneli
const comparisonPanel = document.getElementById('comparison-panel');
const comparisonResults = document.getElementById('comparison-results');

// --- GLOBAL DƏYİŞƏNLƏR ---
let allCardsData = []; 
let activeRarity = 'all'; 
let currentTeam = []; 
let comparisonCards = []; 

// --- QLOBAL FUNKSİYALAR (HTML onclick üçün) ---
window.removeFromComparison = function(cardName) {
    comparisonCards = comparisonCards.filter(c => c.name !== cardName);
    updateComparisonView();
};

window.removeFromTeam = function(cardName) {
    currentTeam = currentTeam.filter(c => c.name !== cardName);
    updateTeamPanel();
    updateTeamStats();
};

// --- NAVİQASİYA ---
function showMenu() {
    mainMenu.classList.remove('hidden');
    cardsSection.classList.add('hidden');
    resetUILayout();
}

function showCards() {
    mainMenu.classList.add('hidden');
    cardsSection.classList.remove('hidden');
    fetchAndRender('all');
}

function resetUILayout() {
    if (cardsSection.classList.contains('team-mode-active')) {
        cardsSection.classList.remove('team-mode-active');
        if (teamBuilderPanel) teamBuilderPanel.classList.add('hidden');
        if (comparisonPanel) comparisonPanel.classList.add('hidden');
        toggleCardButtons(false);
    }
}

// --- KARTLARIN YARADILMASI ---
function toggleCardButtons(isVisible) {
    const buttons = document.querySelectorAll('.add-to-compare-btn, .add-to-team-btn');
    buttons.forEach(btn => btn.classList.toggle('hidden-team-btn', !isVisible));
}

function createCardElement(data) {
    const container = document.createElement('article');
    container.className = `card-container card r-${data.rarity.toLowerCase()}`;
    
    // Action düymələri
    const btnBox = document.createElement('div');
    btnBox.className = 'card-buttons-container';
    
    const compBtn = document.createElement('button');
    compBtn.className = 'add-to-compare-btn hidden-team-btn action-button';
    compBtn.textContent = '+ Comp';
    compBtn.onclick = (e) => { e.stopPropagation(); addToComparison(data); };

    const teamBtn = document.createElement('button');
    teamBtn.className = 'add-to-team-btn hidden-team-btn action-button';
    teamBtn.textContent = '+ Team';
    teamBtn.onclick = (e) => { e.stopPropagation(); addToTeam(data); };

    btnBox.append(compBtn, teamBtn);
    container.appendChild(btnBox);

    if (data.isMulti) {
        const inner = document.createElement('div');
        inner.className = 'card-inner';
        const front = createCardContent(data, 'card-front');
        const back = createCardContent(data.secondForm, 'card-back');
        inner.append(front, back);
        container.appendChild(inner);
        
        const flip = document.createElement('button');
        flip.className = 'flip-button';
        flip.onclick = () => container.classList.toggle('is-flipped');
        container.appendChild(flip);
    } else {
        container.appendChild(createCardContent(data, 'card-single'));
    }

    return container;
}

function createCardContent(data, className) {
    const div = document.createElement('div');
    div.className = className;
    const badge = data.isHybrid ? `${data.type[0]}/${data.type[1]}` : data.type[0];
    
    div.innerHTML = `
        <div class="stripe"></div>
        <div class="head">
            <div class="name">${data.name} ${data.note ? `<span class="note">${data.note}</span>` : ""}</div>
            <span class="badge">${badge}</span>
        </div>
        <div class="card-tabs">
            <button class="tab-btn active" data-target="main-${data.name}">Main</button>
            <button class="tab-btn" data-target="other-${data.name}">Other</button>
            <button class="tab-btn" data-target="ability-${data.name}">Ability</button>
        </div>
        <div class="card-content-area">
            <div id="main-${data.name}" class="stats-section visible">
                <div class="stat-item"><b>HP:</b> <span>${data.stats.health}</span></div>
                <div class="stat-item"><b>Shield:</b> <span>${data.stats.shield}</span></div>
                <div class="stat-item"><b>DMG:</b> <span>${data.stats.damage}</span></div>
                <div class="stat-item"><b>DPS:</b> <span>${data.stats.sps}</span></div>
                <div class="stat-item"><b>Mana:</b> <span>${data.stats.mana}</span></div>
            </div>
            <div id="other-${data.name}" class="stats-section">
                <div class="stat-item"><b>Range:</b> <span>${data.additionalStats.range}</span></div>
                <div class="stat-item"><b>Speed:</b> <span>${data.additionalStats.speed}</span></div>
            </div>
            <div id="ability-${data.name}" class="stats-section">
                <div class="trait-center">${data.trait}</div>
            </div>
        </div>`;

    // Tab keçidləri
    div.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            div.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            div.querySelectorAll('.stats-section').forEach(s => s.classList.remove('visible'));
            btn.classList.add('active');
            div.querySelector(`#${btn.dataset.target}`).classList.add('visible');
        };
    });

    return div;
}

// --- KOMANDA MƏNTİQİ ---
function addToTeam(data) {
    if (currentTeam.length >= 6) return alert("Komanda doludur (maks 6).");
    if (currentTeam.some(c => c.name === data.name)) return alert("Bu kart artıq seçilib.");

    currentTeam.push({
        name: data.name,
        health: parseNum(data.stats.health),
        shield: parseNum(data.stats.shield),
        damage: parseNum(data.stats.damage),
        sps: parseNum(data.stats.sps),
        mana: parseNum(data.stats.mana)
    });
    updateTeamPanel();
    updateTeamStats();
}

function updateTeamPanel() {
    if (!selectedTeamCards) return;
    selectedTeamCards.innerHTML = '';
    placeholderText.style.display = currentTeam.length ? 'none' : 'block';
    
    currentTeam.forEach(c => {
        const item = document.createElement('div');
        item.className = 'team-card-item';
        item.innerHTML = `<span>${c.name}</span><button onclick="removeFromTeam('${c.name}')">X</button>`;
        selectedTeamCards.appendChild(item);
    });
}

function updateTeamStats() {
    const totals = currentTeam.reduce((acc, c) => {
        acc.hp += c.health; acc.sh += c.shield; acc.dmg += c.damage;
        acc.dps += c.sps; acc.mana += c.mana;
        return acc;
    }, { hp: 0, sh: 0, dmg: 0, dps: 0, mana: 0 });

    if (totalHealth) totalHealth.textContent = totals.hp;
    if (totalShield) totalShield.textContent = totals.sh;
    if (totalDamage) totalDamage.textContent = totals.dmg;
    if (totalDPS) totalDPS.textContent = totals.dps;
    if (totalMana) totalMana.textContent = totals.mana;

    // Ən ucuz çevirmə (İlk 3 kiçik mana)
    const sortedMana = currentTeam.map(c => c.mana).sort((a, b) => a - b);
    const recycle = sortedMana.slice(0, 3).reduce((a, b) => a + b, 0);
    if (cheapestRecycleCostDisplay) cheapestRecycleCostDisplay.textContent = recycle;
    
    if (openTeamBuilderBtn) openTeamBuilderBtn.textContent = `Komanda (${currentTeam.length}/6)`;
}

// --- MÜQAYİSƏ MƏNTİQİ ---
function addToComparison(data) {
    if (comparisonCards.length >= 2) return alert("Maksimum 2 kart müqayisə edilə bilər.");
    if (comparisonCards.some(c => c.name === data.name)) return alert("Kart artıq siyahıdadır.");

    comparisonCards.push({ name: data.name, stats: data.stats, rarity: data.rarity });
    updateComparisonView();
}

function updateComparisonView() {
    if (!comparisonResults) return;
    comparisonResults.innerHTML = '';
    const stats = ['health', 'shield', 'damage', 'sps', 'mana'];
    
    comparisonCards.forEach((c, idx) => {
        const other = comparisonCards[1 - idx];
        const item = document.createElement('div');
        item.className = 'compare-item';
        
        let rowsHtml = `<h3 style="color:var(--${c.rarity.toLowerCase()})">${c.name}</h3>`;
        
        stats.forEach(s => {
            const val1 = parseNum(c.stats[s]);
            const val2 = other ? parseNum(other.stats[s]) : null;
            let color = '';
            let arrow = '';

            if (val2 !== null && val1 !== val2) {
                const isWinner = s === 'mana' ? val1 < val2 : val1 > val2;
                color = isWinner ? 'color:#4CAF50; font-weight:bold;' : 'color:#f44336;';
                arrow = isWinner ? ' ↑' : ' ↓';
            }

            rowsHtml += `<div class="comp-stat-row"><b>${s.toUpperCase()}:</b> <span style="${color}">${c.stats[s]}${arrow}</span></div>`;
        });

        item.innerHTML = rowsHtml + `<button onclick="removeFromComparison('${c.name}')" class="remove-comp-btn">Sil</button>`;
        comparisonResults.appendChild(item);
    });

    const active = comparisonCards.length > 0;
    comparisonPanel.classList.toggle('hidden', !active);
    checkUIMode();
}

// --- DATA & FİLTR ---
async function fetchAndRender(rarity) {
    if (allCardsData.length === 0) {
        const types = ['mundane', 'familiar', 'arcane', 'relic', 'ascendant', 'apex', 'ethereal'];
        const loads = await Promise.all(types.map(t => fetch(`${t}.json`).then(r => r.ok ? r.json() : []).catch(() => [])));
        allCardsData = loads.flat();
    }
    activeRarity = rarity;
    filterAndRender();
}

function filterAndRender() {
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    const filtered = allCardsData.filter(c => {
        const matchRarity = activeRarity === 'all' || c.rarity.toLowerCase() === activeRarity;
        const matchSearch = c.name.toLowerCase().includes(search);
        return matchRarity && matchSearch;
    });

    cardsContainer.innerHTML = '';
    filtered.forEach(d => cardsContainer.appendChild(createCardElement(d)));
    checkUIMode();
}

// --- KÖMƏKÇİ FUNKSİYALAR ---
function parseNum(val) {
    if (typeof val === 'string') return parseInt(val.replace(/[^\d.]/g, '')) || 0;
    return val || 0;
}

function checkUIMode() {
    const teamOpen = !teamBuilderPanel.classList.contains('hidden');
    const compOpen = comparisonCards.length > 0;
    const anyActive = teamOpen || compOpen;
    
    cardsSection.classList.toggle('team-mode-active', anyActive);
    toggleCardButtons(anyActive);
}

// --- EVENT LISTENERS ---
showCardsBtn.addEventListener('click', showCards);
backToMenuBtn.addEventListener('click', showMenu);

filterButtons.forEach(btn => {
    btn.onclick = () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeRarity = btn.id.split('-')[1];
        filterAndRender();
    };
});

if (searchInput) searchInput.oninput = filterAndRender;

if (openTeamBuilderBtn) openTeamBuilderBtn.onclick = () => {
    teamBuilderPanel.classList.remove('hidden');
    checkUIMode();
};

if (closeTeamBuilderBtn) closeTeamBuilderBtn.onclick = () => {
    teamBuilderPanel.classList.add('hidden');
    checkUIMode();
};

if (clearTeamBtn) clearTeamBtn.onclick = () => {
    currentTeam = [];
    updateTeamPanel();
    updateTeamStats();
};

document.addEventListener('DOMContentLoaded', showMenu);
