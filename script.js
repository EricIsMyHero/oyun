// DOM Elementləri
const mainMenu = document.getElementById('main-menu');
const cardsSection = document.getElementById('cards-section');
const showCardsBtn = document.getElementById('show-cards-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const filterButtons = document.querySelectorAll('.controls button');
const cardsContainer = document.getElementById('cards');
const searchInput = document.getElementById('search-input'); 

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

/// MÜQAYİSƏ ELEMENTLƏRİ
const comparisonPanel = document.getElementById('comparison-panel');
const comparisonResults = document.getElementById('comparison-results');
const closeComparisonBtn = document.getElementById('close-comparison-panel-btn');

// GLOBAL DƏYİŞƏNLƏR
let allCardsData = []; 
let activeRarity = 'all'; 
let currentTeam = []; 
let comparisonCards = []; 

// FUNKSİYANI QLOBAL ETMƏK (Xətanın həlli)
window.removeFromComparison = function(cardName) {
    comparisonCards = comparisonCards.filter(card => card.name !== cardName);
    updateComparisonView();
};
function showMenu() {
    mainMenu.classList.remove('hidden');
    cardsSection.classList.add('hidden');
    // Menyuya qayıdanda komanda rejimini ləğv et
    if (cardsSection.classList.contains('team-mode-active')) {
         cardsSection.classList.remove('team-mode-active');
         if (teamBuilderPanel) teamBuilderPanel.classList.add('hidden');
         toggleCardButtons(false);
    }
}

function showCards() {
    mainMenu.classList.add('hidden');
    cardsSection.classList.remove('hidden');
    fetchAndRender('all');
    if (searchInput) searchInput.value = '';
}

// Bu funksiya bütün kartlardakı Team/Compare düymələrinin görünməsinə nəzarət edir.
function toggleCardButtons(isVisible) {
    const buttons = document.querySelectorAll('.hidden-team-btn, .add-to-compare-btn, .add-to-team-btn');
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
    
    // YENİ DÜYMƏLƏRİN KONTEYNERİ
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'card-buttons-container'; 
    
    // TEAM BUILDER DÜYMƏSİ
    const addButton = document.createElement('button');
    addButton.className = 'add-to-team-btn hidden-team-btn action-button'; // 'action-button' əlavə edildi
    addButton.textContent = '+ Team'; // Mətn dəyişmədi, amma stil dəyişdi
    addButton.title = 'Komandaya Əlavə Et';
    addButton.dataset.cardName = data.name;

    addButton.addEventListener('click', (e) => {
        e.stopPropagation(); 
        addToTeam(data); 
    });
    
    // MÜQAYİSƏ DÜYMƏSİ
    const compareButton = document.createElement('button');
    compareButton.className = 'add-to-compare-btn hidden-team-btn action-button'; // 'action-button' əlavə edildi
    compareButton.textContent = '+ Comp'; // Mətn '+ Comp' olaraq dəyişdirildi
    compareButton.title = 'Müqayisəyə Əlavə Et';
    compareButton.dataset.cardName = data.name;

    compareButton.addEventListener('click', (e) => {
        e.stopPropagation(); 
        addToComparison(data);
        // comparisonModal artıq yoxlanıldığı üçün yoxlamaya ehtiyac yoxdur.
        // if (comparisonModal) comparisonModal.classList.remove('hidden'); 
    });
    
    buttonsContainer.appendChild(compareButton);
    buttonsContainer.appendChild(addButton); // Sıralama dəyişdi: Comp, Team
    
    cardContainer.appendChild(buttonsContainer); 
    
    const setupCardListeners = (contentElement) => {
        const cardButtons = contentElement.querySelectorAll('.card-tabs button');
        cardButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const sectionId = button.dataset.section;
                
                cardButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                contentElement.querySelectorAll('.stats-section').forEach(section => {
                    section.classList.remove('visible');
                });
                
                contentElement.querySelector(`[data-section-id="${sectionId}"]`).classList.add('visible');
            });
        });
    }

    if (data.isMulti) {
        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';

        const cardFront = createCardContent(data);
        cardFront.classList.add('card-front');
        
        const cardBack = createCardContent(data.secondForm);
        cardBack.classList.add('card-back');

        cardInner.appendChild(cardFront);
        cardInner.appendChild(cardBack);
        cardContainer.appendChild(cardInner);

        setupCardListeners(cardFront);
        setupCardListeners(cardBack);
        
        const flipButton = document.createElement('button');
        flipButton.className = 'flip-button';

        cardContainer.addEventListener('click', (e) => {
            if (e.target.closest('.flip-button')) {
                cardContainer.classList.toggle('is-flipped');
            }
        });

        cardContainer.appendChild(flipButton);
    } else {
        const singleCard = createCardContent(data);
        singleCard.classList.add('card-single');
        cardContainer.appendChild(singleCard);
        
        setupCardListeners(singleCard);
    }

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
    const badgeText = data.isHybrid ? `${data.type[0]}/${data.type[1]}` : data.type[0];
    content.innerHTML = `
        <div class="stripe"></div>
        <div class="head">
            <div class="name">
                ${data.name}
                ${data.note ? `<span class="note">${data.note}</span>` : ""}
            </div>
            <span class="badge">${badgeText}</span>
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
                <div class="stat-item"><b>Health <i class="fa-solid fa-heart"></i></b><span>${data.stats.health}</span></div>
                <div class="stat-item"><b>Shield <i class="fa-solid fa-shield-halved"></i></b><span>${data.stats.shield}</span></div>
                <div class="stat-item"><b>Damage <i class="fa-solid fa-hand-fist"></i></b><span>${data.stats.damage}</span></div>
                <div class="stat-item"><b>D.P.S <i class="fa-solid fa-bolt"></i></b><span>${data.stats.sps}</span></div>
                <div class="stat-item"><b>Attack Speed <i class="fa-solid fa-tachometer-alt"></i></b><span>${data.stats.attackSpeed}</span></div>
                <div class="stat-item"><b>Delay <i class="fa-solid fa-clock"></i></b><span>${data.stats.delay}</span></div>
                <div class="stat-item"><b>Mana <i class="fa-solid fa-certificate"></i></b><span>${data.stats.mana}</span></div>
                <div class="stat-item"><b>Number <i class="fa-solid fa-user"></i></b><span>${data.stats.number}</span></div>
            </div>
            
            <div class="stats-section" data-section-id="additional-stats">
                <div class="stat-item"><b>Range <i class="fa-solid fa-road"></i></b><span>${data.additionalStats.range}</span></div>
                <div class="stat-item"><b>Speed <i class="fa-solid fa-person-running"></i></b><span>${data.additionalStats.speed}</span></div>
                <div class="stat-item"><b>Critic Chance <i class="fa-solid fa-percent"></i></b><span>${data.additionalStats.criticalChance}</span></div>
                <div class="stat-item"><b>Critical Damage <i class="fa-solid fa-crosshairs"></i></b><span>${data.additionalStats.criticDamage}</span></div>
                <div class="stat-item"><b>Life Steal Chance <i class="fa-solid fa-percent "></i></b><span>${data.additionalStats.lifestealChance}</span></div>
                <div class="stat-item"><b>Life Steal <i class="fa-solid fa-skull-crossbones "></i></b><span>${data.additionalStats.lifesteal}</span></div>
                <div class="stat-item"><b>Damage Reduction <i class="fa-solid fa-helmet-un "></i></b><span>${data.additionalStats.damageminimiser}</span></div>
                <div class="stat-item"><b>Dodge Chance <i class="fa-solid fa-wind "></i></b><span>${data.additionalStats.dodge}</span></div>
            </div>
            
            <div class="stats-section" data-section-id="trait">
                <div class="trait trait-center">${data.trait}</div>
            </div>

            <div class="stats-section" data-section-id="showlevels">
                <div class="stat-item"><b>Level 1</b><span>${data.showlevels.level1}</span></div>
                <div class="stat-item"><b>Level 2</b><span>${data.showlevels.level2}</span></div>
                <div class="stat-item"><b>Level 3</b><span>${data.showlevels.level3}</span></div>
            </div>
            
            <div class="stats-section" data-section-id="story-section">
                <div class="story-content">${data.story}</div>
            </div>

        </div> `;

    return content;
}

// Kartları render edən funksiya
function renderCards(cardsToRender) {
    if (!cardsContainer) return; // cardsContainer tapılmasa funksiyanı dayandır
    
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
    // 1. Unikal kart yoxlaması
    const isAlreadyInTeam = currentTeam.some(card => card.name === cardData.name);

    if (isAlreadyInTeam) {
        alert(`❌ '${cardData.name}' kartı artıq komandada var. Hər kartdan yalnız bir dəfə istifadə edə bilərsiniz.`);
        return;
    }
    
    // 2. Maksimum kart sayının yoxlanılması
    if (currentTeam.length >= 6) {
        alert('Komandada maksimum 6 kart ola bilər.');
        return;
    }
    
    // 3. Kartın düzgün formatlanaraq əlavə edilməsi
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
    
    // 4. Panellərin və statistikaların yenilənməsi
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
            const cardName = button.dataset.cardName;
            removeFromTeam(cardName);
        });
    });
}

function updateTeamStats() {
    // 1. Mana dəyərlərini toplayacağımız massivi yaradırıq
    const manaCosts = []; 
    
    // 2. Reducer vasitəsilə ümumi statistikaları hesablayırıq
    const stats = currentTeam.reduce((acc, card) => {
        // Mövcud statistikaların toplanması (original kodunuzu dəyişmədən saxlayırıq)
        acc.health += card.health;
        acc.shield += card.shield;
        acc.damage += card.damage; 
        acc.dps += card.sps;
        acc.mana += card.mana;

        // YENİ: Ən ucuz çevirmə üçün mana dəyərini (ədəd olaraq) massivə əlavə edirik
        manaCosts.push(parseInt(card.mana) || 0); 

        return acc;
    }, { health: 0, shield: 0, damage: 0, dps: 0, mana: 0 }); 

    // 3. ƏN UCUZ ÇEVİRMƏ DƏYƏRİNİ HESABLA (Məntiq: ən kiçik 3 mana dəyərinin cəmi)
    let cheapestRecycleCost = 0;
    if (manaCosts.length > 0) {
        // Mana dəyərlərini kiçikdən böyüyə sırala
        manaCosts.sort((a, b) => a - b);
        
        // Ən ucuz 3 kartın mana dəyərini götür və topla
        cheapestRecycleCost = manaCosts.slice(0, 3).reduce((sum, mana) => sum + mana, 0);
    }
    
    // 4. Mövcud statistikaları yenilə
    if (totalHealth) totalHealth.textContent = stats.health;
    if (totalShield) totalShield.textContent = stats.shield;
    if (totalDamage) totalDamage.textContent = stats.damage; 
    if (totalDPS) totalDPS.textContent = stats.dps;
    if (totalMana) totalMana.textContent = stats.mana;

    // 5. ƏN UCUZ ÇEVİRMƏ STATİSTİKASINI YENİLƏ (aşağıdakı təlimata uyğun olaraq bu elementi HTML-ə əlavə edin)
    if (cheapestRecycleCostDisplay) cheapestRecycleCostDisplay.textContent = cheapestRecycleCost; 

    if (openTeamBuilderBtn) {
        openTeamBuilderBtn.textContent = `Komandanı Göstər (${currentTeam.length}/6)`;
    }
}

// ƏSAS FİLTR VƏ AXTARIŞ FUNKSİYASI
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
    
    const isAnyPanelOpen = !teamBuilderPanel.classList.contains('hidden') || 
                       !document.getElementById('comparison-panel').classList.contains('hidden');
toggleCardButtons(isAnyPanelOpen);
    
    // XƏTA DÜZƏLİŞİ: teamBuilderModal əvəzinə teamBuilderPanel-in mövcudluğunu və vəziyyətini yoxlayın
    if (teamBuilderPanel && !teamBuilderPanel.classList.contains('hidden')) { 
        toggleCardButtons(true);
    } else {
        toggleCardButtons(false);
    }
}


// MÜQAYİSƏ SİSTEMİ
function addToComparison(cardData) {
    if (comparisonCards.some(card => card.name === cardData.name)) {
        alert("Bu kart artıq müqayisə siyahısındadır.");
        return;
    }

    if (comparisonCards.length >= 2) {
        alert('Maksimum 2 kartı müqayisə edə bilərsiniz.');
        return;
    }

    comparisonCards.push({
        name: cardData.name,
        originalCardData: cardData 
    });

    updateComparisonView();
}

function updateComparisonView() {
    const panel = document.getElementById('comparison-panel');
    const resultsContainer = document.getElementById('comparison-results');
    
    if (!panel || !resultsContainer) return;
    resultsContainer.innerHTML = '';

    // Müqayisə ediləcək statistikalar
    const statsToCompare = ['health', 'shield', 'damage', 'sps', 'mana'];
    const winners = {};

    if (comparisonCards.length === 2) {
        statsToCompare.forEach(stat => {
            const val1 = getNumericStat(comparisonCards[0].originalCardData.stats[stat]);
            const val2 = getNumericStat(comparisonCards[1].originalCardData.stats[stat]);
            
            if (val1 > val2) {
                winners[stat] = stat === 'mana' ? 1 : 0; 
            } else if (val2 > val1) {
                winners[stat] = stat === 'mana' ? 0 : 1;
            } else {
                winners[stat] = null; 
            }
        });
    }

    comparisonCards.forEach((card, index) => {
        const d = card.originalCardData;
        const item = document.createElement('div');
        item.className = 'compare-item';
        
        const getStyle = (s) => {
            if (comparisonCards.length < 2 || winners[s] === null) return '';
            return winners[s] === index ? 'color: #4CAF50; font-weight: bold;' : 'color: #f44336;';
        };

        const getArrow = (s) => {
            if (comparisonCards.length < 2 || winners[s] === null) return '';
            return winners[s] === index ? ' ↑' : ' ↓';
        };

        item.innerHTML = `
            <h3 style="color: var(--${d.rarity.toLowerCase()}); border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 10px;">${d.name}</h3>
            <div class="comp-stat-row"><b>HP:</b> <span style="${getStyle('health')}">${d.stats.health}${getArrow('health')}</span></div>
            <div class="comp-stat-row"><b>Shield:</b> <span style="${getStyle('shield')}">${d.stats.shield}${getArrow('shield')}</span></div>
            <div class="comp-stat-row"><b>DMG:</b> <span style="${getStyle('damage')}">${d.stats.damage}${getArrow('damage')}</span></div>
            <div class="comp-stat-row"><b>DPS:</b> <span style="${getStyle('sps')}">${d.stats.sps}${getArrow('sps')}</span></div>
            <div class="comp-stat-row"><b>Mana:</b> <span style="${getStyle('mana')}">${d.stats.mana}${getArrow('mana')}</span></div>
            <button onclick="removeFromComparison('${d.name}')" class="remove-comp-btn">Sil</button>
        `;
        resultsContainer.appendChild(item);
    });

    if (comparisonCards.length > 0) {
        panel.classList.remove('hidden');
        cardsSection.classList.add('team-mode-active');
    } else {
        panel.classList.add('hidden');
        if (teamBuilderPanel.classList.contains('hidden')) {
            cardsSection.classList.remove('team-mode-active');
        }
    }
}
// Məlumatları çəkən funksiya
async function fetchAndRender(rarity) {
    if (cardsContainer) cardsContainer.innerHTML = '<p>Məlumatlar yüklənir...</p>';
    activeRarity = rarity; 
    try {
        
        // 'all' kartları çəkmək lazımdırsa VƏ hələ çəkilməyibsə:
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
            allCardsData = results.flat(); // Bütün kartları bir dəfə çəkib saxlayırıq
        }
        
        // Məlumatı çəkdikdən sonra filtrləmə və render etməyi icra edin
        filterAndRender();
        
    } catch (error) {
        console.error('Məlumatları yükləmə zamanı xəta:', error);
        if (cardsContainer) cardsContainer.innerHTML = '<p style="color:red;">Kart məlumatları yüklənərkən xəta baş verdi.</p>';
    }
}


// EVENT LİSTENERLƏRİ

showCardsBtn.addEventListener('click', showCards);
backToMenuBtn.addEventListener('click', showMenu);

['show-spells-btn','show-boosters-btn','show-towers-btn'].forEach(id=>{
    const btn = document.getElementById(id);
    if (btn) {
        btn.addEventListener('click', () => {
            const modal=document.createElement('div');
            modal.style.position='fixed';
            modal.style.top='50%';
            modal.style.left='50%';
            modal.style.transform='translate(-50%, -50%)';
            modal.style.padding='20px';
            modal.style.backgroundColor='var(--card)';
            modal.style.color='var(--text)';
            modal.style.borderRadius='12px';
            modal.style.boxShadow='var(--shadow)';
            modal.style.zIndex='1000';
            modal.textContent="Coming Soon...";
            document.body.appendChild(modal);
            setTimeout(()=>{document.body.removeChild(modal);},3000);
        });
    }
});

// FİLTR DÜYMƏLƏRİ
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        const rarity = button.id.split('-')[1];
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Active rarity yenilənir və filtrasiya təkrar icra olunur
        activeRarity = rarity; 
        filterAndRender(); 
    });
});

// AXTARIŞ GİRİŞİNƏ EVENT LİSTENER
if (searchInput) {
    searchInput.addEventListener('input', filterAndRender);
} else {
    console.warn("Axtarış inputu (id='search-input') tapılmadı. HTML-i yoxlayın.");
}

// TEAM BUILDER PANEL EVENT LİSTENERLƏRİ (YENİLƏNMİŞ)
if (openTeamBuilderBtn) {
    openTeamBuilderBtn.addEventListener('click', () => {
        // Layotu iki sütunlu rejimi aktivləşdir
        if (cardsSection) cardsSection.classList.add('team-mode-active');
        
        // Paneli göstər
        if (teamBuilderPanel) teamBuilderPanel.classList.remove('hidden');

        updateTeamPanel();
        toggleCardButtons(true); // Team və Compare düymələrini göstər
    });
}

if (closeTeamBuilderBtn) {
    closeTeamBuilderBtn.addEventListener('click', () => {
        // Layotu bir sütunlu rejimi bərpa et
        if (cardsSection) cardsSection.classList.remove('team-mode-active');
        
        // Paneli gizlət
        if (teamBuilderPanel) teamBuilderPanel.classList.add('hidden');

        toggleCardButtons(false); // Team və Compare düymələrini gizlət
    });
}

// Komandanı Təmizlə funksiyası üçün listener
if(clearTeamBtn) {
    clearTeamBtn.addEventListener('click', () => {
        currentTeam = [];
        updateTeamPanel();
        updateTeamStats();
    });
}


document.addEventListener('DOMContentLoaded', () => {
    showMenu();
    updateTeamStats(); 
    updateTeamPanel();
    // DOM yüklənəndə Komanda Panelini gizlət (Layout dəyişikliyinin ilk vizual xətasını aradan qaldırır)
    if (teamBuilderPanel) teamBuilderPanel.classList.add('hidden'); 
});
