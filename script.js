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

// GLOBAL DƏYİŞƏNLƏR
let allCardsData = []; // Bütün yüklənmiş kartları saxlayır
let activeRarity = 'all'; // Aktiv endərliyi yadda saxlayır
let currentTeam = []; // Seçilmiş kartları (statistikalarla) saxlayır 


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
    
    // YENİ DÜYMƏLƏRİN KONTEYNERİ
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'card-buttons-container'; 
    
    // TEAM BUILDER DÜYMƏSİ
    const addButton = document.createElement('button');
    addButton.className = 'add-to-team-btn hidden-team-btn action-button';
    addButton.textContent = '+ Team';
    addButton.title = 'Komandaya Əlavə Et';
    addButton.dataset.cardName = data.name;

    addButton.addEventListener('click', (e) => {
        e.stopPropagation(); 
        addToTeam(data); 
    });
    
    buttonsContainer.appendChild(addButton);
    
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

    // EVOLUTION SİSTEMİ (Phoenix tipli kartlar)
    if (data.isEvolution && data.evolutionChain) {
        let currentStage = 0;
        
        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';

        const cardFront = createCardContent(data.evolutionChain[currentStage]);
        cardFront.classList.add('card-front');
        
        cardInner.appendChild(cardFront);
        cardContainer.appendChild(cardInner);

        setupCardListeners(cardFront);
        
        // Evolution Controls
        const evolutionControls = document.createElement('div');
        evolutionControls.className = 'evolution-controls';
        
        // Sol ox
        const leftArrow = document.createElement('button');
        leftArrow.className = 'evolution-arrow';
        leftArrow.innerHTML = '◀';
        leftArrow.disabled = true;
        
        // Progress dots
        const progressBar = document.createElement('div');
        progressBar.className = 'evolution-progress';
        
        data.evolutionChain.forEach((_, index) => {
            const dot = document.createElement('span');
            dot.className = 'progress-dot';
            if (index === 0) dot.classList.add('active');
            progressBar.appendChild(dot);
        });
        
        // Stage info
        const stageInfo = document.createElement('span');
        stageInfo.className = 'stage-info';
        stageInfo.textContent = `${data.evolutionChain[currentStage].name}`;
        
        // Sağ ox
        const rightArrow = document.createElement('button');
        rightArrow.className = 'evolution-arrow';
        rightArrow.innerHTML = '▶';
        if (data.evolutionChain.length === 1) rightArrow.disabled = true;
        
        evolutionControls.appendChild(leftArrow);
        evolutionControls.appendChild(progressBar);
        evolutionControls.appendChild(stageInfo);
        evolutionControls.appendChild(rightArrow);
        
        // Ox click event
        const updateStage = (newStage) => {
            currentStage = newStage;
            
            // Progress dots yenilə
            progressBar.querySelectorAll('.progress-dot').forEach((dot, index) => {
                dot.classList.toggle('active', index === currentStage);
            });
            
            // Oxları yenilə
            leftArrow.disabled = currentStage === 0;
            rightArrow.disabled = currentStage === data.evolutionChain.length - 1;
            
            // Stage info yenilə
            stageInfo.textContent = `${data.evolutionChain[currentStage].name}`;
            
            // Kart məzmununu yenilə
            cardFront.innerHTML = '';
            const newContent = createCardContent(data.evolutionChain[currentStage]);
            cardFront.innerHTML = newContent.innerHTML;
            setupCardListeners(cardFront);
        };
        
        leftArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentStage > 0) updateStage(currentStage - 1);
        });
        
        rightArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentStage < data.evolutionChain.length - 1) updateStage(currentStage + 1);
        });
        
        cardContainer.appendChild(evolutionControls);
    }
    // SUMMONER SİSTEMİ (Ana kart + köməkçilər)
    else if (data.isSummoner && data.summonedUnits) {
        let currentIndex = 0; // 0 = ana kart, 1+ = köməkçilər
        
        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';
        
        cardContainer.classList.add('is-summoner');

        const cardFront = createCardContent(data);
        cardFront.classList.add('card-front');
        
        cardInner.appendChild(cardFront);
        cardContainer.appendChild(cardInner);

        setupCardListeners(cardFront);
        
        // Summoner Controls
        const summonerControls = document.createElement('div');
        summonerControls.className = 'evolution-controls';
        
        // Sol ox
        const leftArrow = document.createElement('button');
        leftArrow.className = 'evolution-arrow';
        leftArrow.innerHTML = '◀';
        leftArrow.disabled = true;
        
        // Progress dots (ana kart + summonlar)
        const progressBar = document.createElement('div');
        progressBar.className = 'evolution-progress';
        
        // Ana kart üçün dot
        const mainDot = document.createElement('span');
        mainDot.className = 'progress-dot active';
        progressBar.appendChild(mainDot);
        
        // Hər summon üçün dot
        data.summonedUnits.forEach(() => {
            const dot = document.createElement('span');
            dot.className = 'progress-dot';
            progressBar.appendChild(dot);
        });
        
        // Unit info
        const unitInfo = document.createElement('span');
        unitInfo.className = 'stage-info';
        unitInfo.textContent = data.name;
        
        // Sağ ox
        const rightArrow = document.createElement('button');
        rightArrow.className = 'evolution-arrow';
        rightArrow.innerHTML = '▶';
        
        summonerControls.appendChild(leftArrow);
        summonerControls.appendChild(progressBar);
        summonerControls.appendChild(unitInfo);
        summonerControls.appendChild(rightArrow);
        
        // Ox click event
        const updateUnit = (newIndex) => {
            currentIndex = newIndex;
            
            // Progress dots yenilə
            progressBar.querySelectorAll('.progress-dot').forEach((dot, index) => {
                dot.classList.toggle('active', index === currentIndex);
            });
            
            // Oxları yenilə
            leftArrow.disabled = currentIndex === 0;
            rightArrow.disabled = currentIndex === data.summonedUnits.length;
            
            // Unit məzmununu yenilə
            cardFront.innerHTML = '';
            let contentData;
            
            if (currentIndex === 0) {
                // Ana kart
                contentData = data;
                unitInfo.textContent = data.name;
            } else {
                // Köməkçi kart
                contentData = {
                    ...data.summonedUnits[currentIndex - 1],
                    type: data.type, // Ana kartın tipini götür
                    rarity: data.rarity
                };
                unitInfo.textContent = data.summonedUnits[currentIndex - 1].name;
            }
            
            const newContent = createCardContent(contentData);
            cardFront.innerHTML = newContent.innerHTML;
            setupCardListeners(cardFront);
        };
        
        leftArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentIndex > 0) updateUnit(currentIndex - 1);
        });
        
        rightArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentIndex < data.summonedUnits.length) updateUnit(currentIndex + 1);
        });
        
        cardContainer.appendChild(summonerControls);
    }
    // ASCENDANT KARTLAR ÜÇÜN TRANSFORM SİSTEMİ
    if (data.isAscendant && data.upgradedsecondForm) {
        let isUpgraded = false; // Kartın hazırki vəziyyətini izləyir
        
        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';

        // İlkin vəziyyət - normal statistikalar
        let currentCardData = data;
        const cardFront = createCardContent(currentCardData);
        cardFront.classList.add('card-front');
        
        cardInner.appendChild(cardFront);
        cardContainer.appendChild(cardInner);

        setupCardListeners(cardFront);
        
        // Flip düyməsi olmayan Ascendant kartlar üçün class əlavə et
        if (!data.isMulti) {
            cardContainer.classList.add('no-flip');
        }
        
        // TRANSFORM DÜYMƏSİ
        const transformButton = document.createElement('button');
        transformButton.className = 'transform-button';
        transformButton.title = 'Transform';

        transformButton.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Vəziyyəti dəyiş
            isUpgraded = !isUpgraded;
            
            // Kartın məzmununu yenilə
            if (isUpgraded) {
                currentCardData = {
                    ...data,
                    stats: data.upgradedsecondForm.stats,
                    trait: data.upgradedsecondForm.trait,
                    additionalStats: data.upgradedsecondForm.additionalStats,
                    showlevels: data.upgradedsecondForm.showlevels,
                    story: data.upgradedsecondForm.story
                };
                cardContainer.classList.add('is-upgraded');
            } else {
                currentCardData = data;
                cardContainer.classList.remove('is-upgraded');
            }
            
            // İçindəkiləri təmizlə və yenidən yarat
            cardFront.innerHTML = '';
            const newContent = createCardContent(currentCardData);
            cardFront.innerHTML = newContent.innerHTML;
            setupCardListeners(cardFront);
        });

        cardContainer.appendChild(transformButton);
    }
    // ÇOX FORMALI (isMulti) KARTLAR
    else if (data.isMulti) {
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
    } 
    // SADƏ KARTLAR
    else {
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
    const badgeText = Array.isArray(data.type) ? data.type.join('/') : data.type;
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
    // 1. Unikal kart yoxlaması
    const isAlreadyInTeam = currentTeam.some(card => card.name === cardData.name);

    if (isAlreadyInTeam) {
        alert(`❌ '${cardData.name}' kartı artıq komandada var. Hər kartdan yalnız bir dəfə istifadə edə bilərsiniz.`);
        return;
    }
    
    // 2. Maksimum kart sayının yoxlanılması
    if (currentTeam.length >= 8) {
        alert('Komandada maksimum 8 kart ola bilər.');
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
        acc.health += card.health;
        acc.shield += card.shield;
        acc.damage += card.damage; 
        acc.dps += card.sps;
        acc.mana += card.mana;

        manaCosts.push(parseInt(card.mana) || 0); 

        return acc;
    }, { health: 0, shield: 0, damage: 0, dps: 0, mana: 0 }); 

    // 3. ƏN UCUZ ÇEVİRMƏ DƏYƏRİNİ HESABLA
    let cheapestRecycleCost = 0;
    if (manaCosts.length > 0) {
        manaCosts.sort((a, b) => a - b);
        cheapestRecycleCost = manaCosts.slice(0, 4).reduce((sum, mana) => sum + mana, 0);
    }
    
    // 4. Mövcud statistikaları yenilə
    if (totalHealth) totalHealth.textContent = stats.health;
    if (totalShield) totalShield.textContent = stats.shield;
    if (totalDamage) totalDamage.textContent = stats.damage; 
    if (totalDPS) totalDPS.textContent = stats.dps;
    if (totalMana) totalMana.textContent = stats.mana;

    if (cheapestRecycleCostDisplay) cheapestRecycleCostDisplay.textContent = cheapestRecycleCost; 

    if (openTeamBuilderBtn) {
        openTeamBuilderBtn.textContent = `Komandanı Göstər (${currentTeam.length}/8)`;
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
    
    if (teamBuilderPanel && !teamBuilderPanel.classList.contains('hidden')) { 
        toggleCardButtons(true);
    } else {
        toggleCardButtons(false);
    }
}

// Məlumatları çəkən funksiya
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

// TEAM BUILDER PANEL EVENT LİSTENERLƏRİ
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
    if (teamBuilderPanel) teamBuilderPanel.classList.add('hidden'); 
});
