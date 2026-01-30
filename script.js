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
const mainMenu = document.getElementById('main-menu');

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

    // ÇOX FORMALI KARTLAR (isMulti)
    if (data.isMulti && data.forms && data.forms.length > 0) {
        let currentFormIndex = 0;
        
        // Progress bar üçün class əlavə et
        cardContainer.classList.add('has-multi-controls');
        
        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';

        const cardFront = createCardContent(data);
        cardFront.classList.add('card-front');
        
        cardInner.appendChild(cardFront);
        cardContainer.appendChild(cardInner);

        setupCardListeners(cardFront);
        
        // MULTI CONTROLS (Progress bar + oxlar)
        const multiControls = document.createElement('div');
        multiControls.className = 'evolution-controls';
        
        // Sol ox
        const leftArrow = document.createElement('button');
        leftArrow.className = 'evolution-arrow';
        leftArrow.innerHTML = '◀';
        leftArrow.disabled = true;
        
        // Progress dots
        const progressBar = document.createElement('div');
        progressBar.className = 'evolution-progress';
        
        // Əsas kart üçün dot
        const mainDot = document.createElement('span');
        mainDot.className = 'progress-dot active';
        progressBar.appendChild(mainDot);
        
        // Hər forma üçün dot
        data.forms.forEach(() => {
            const dot = document.createElement('span');
            dot.className = 'progress-dot';
            progressBar.appendChild(dot);
        });
        
        // Form info
        const formInfo = document.createElement('span');
        formInfo.className = 'stage-info';
        formInfo.textContent = data.name;
        
        // Sağ ox
        const rightArrow = document.createElement('button');
        rightArrow.className = 'evolution-arrow';
        rightArrow.innerHTML = '▶';
        
        multiControls.appendChild(leftArrow);
        multiControls.appendChild(progressBar);
        multiControls.appendChild(formInfo);
        multiControls.appendChild(rightArrow);
        
        // Ox click event
        const updateForm = (newIndex) => {
            currentFormIndex = newIndex;
            
            // Progress dots yenilə
            progressBar.querySelectorAll('.progress-dot').forEach((dot, index) => {
                dot.classList.toggle('active', index === currentFormIndex);
            });
            
            // Oxları yenilə
            leftArrow.disabled = currentFormIndex === 0;
            rightArrow.disabled = currentFormIndex === data.forms.length;
            
            // Forma məzmununu yenilə
            cardFront.innerHTML = '';
            let contentData;
            
            if (currentFormIndex === 0) {
                // Əsas kart
                contentData = data;
            } else {
                // Digər formalar
                const formData = data.forms[currentFormIndex - 1];
                
                if (!formData) {
                    console.error('Form data not found at index:', currentFormIndex - 1);
                    return;
                }
                
                contentData = {
                    name: formData.name || 'Unknown',
                    note: formData.note || '',
                    type: formData.type || data.type,
                    rarity: data.rarity,
                    stats: formData.stats || {
                        health: 0,
                        shield: 0,
                        damage: 0,
                        sps: 0,
                        attackSpeed: '-',
                        delay: '-',
                        mana: 0,
                        number: 0
                    },
                    trait: formData.trait || '-',
                    additionalStats: formData.additionalStats || {
                        range: '-',
                        speed: '-',
                        criticalChance: '-',
                        criticDamage: '-',
                        lifestealChance: '-',
                        lifesteal: '-',
                        damageminimiser: '-',
                        dodge: '-'
                    },
                    showlevels: formData.showlevels || { level1: '-', level2: '-', level3: '-' },
                    story: formData.story || '-'
                };
            }
            
            if (!contentData || !contentData.stats) {
                console.error('Invalid contentData created:', contentData);
                return;
            }
            
            const newContent = createCardContent(contentData);
            cardFront.innerHTML = newContent.innerHTML;
            setupCardListeners(cardFront);
        };
        
        leftArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentFormIndex > 0) updateForm(currentFormIndex - 1);
        });
        
        rightArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentFormIndex < data.forms.length) updateForm(currentFormIndex + 1);
        });
        
        cardContainer.appendChild(multiControls);
    }
    // ASCENDANT KARTLAR ÜÇÜN TRANSFORM SİSTEMİ
    else if (data.isAscendant && data.upgradedsecondForm) {
        let isUpgraded = false;
        
        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';

        let currentCardData = data;
        const cardFront = createCardContent(currentCardData);
        cardFront.classList.add('card-front');
        
        cardInner.appendChild(cardFront);
        cardContainer.appendChild(cardInner);

        setupCardListeners(cardFront);
        
        cardContainer.classList.add('no-flip');
        
        const transformButton = document.createElement('button');
        transformButton.className = 'transform-button';
        transformButton.title = 'Transform';

        transformButton.addEventListener('click', (e) => {
            e.stopPropagation();
            
            isUpgraded = !isUpgraded;
            
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
            
            cardFront.innerHTML = '';
            const newContent = createCardContent(currentCardData);
            cardFront.innerHTML = newContent.innerHTML;
            setupCardListeners(cardFront);
        });

        cardContainer.appendChild(transformButton);
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
                <div class="stat-item"><b>Critic Chance <i class="fa-solid fa-percent"></i></b><span>${data.additionalStats?.criticalChance || '-'}</span></div>
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

        </div> `;

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
            const cardName = button.dataset.cardName;
            removeFromTeam(cardName);
        });
    });
}

function updateTeamStats() {
    const manaCosts = []; 
    
    const stats = currentTeam.reduce((acc, card) => {
        acc.health += card.health;
        acc.shield += card.shield;
        acc.damage += card.damage; 
        acc.dps += card.sps;
        acc.mana += card.mana;

        manaCosts.push(parseInt(card.mana) || 0); 

        return acc;
    }, { health: 0, shield: 0, damage: 0, dps: 0, mana: 0 }); 

    let cheapestRecycleCost = 0;
    if (manaCosts.length > 0) {
        manaCosts.sort((a, b) => a - b);
        cheapestRecycleCost = manaCosts.slice(0, 4).reduce((sum, mana) => sum + mana, 0);
    }
    
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

// Info düyməsinə klikləmə
if (showInfoBtn) {
  showInfoBtn.addEventListener('click', async () => {
    mainMenu.classList.add('hidden');
    infoSection.classList.remove('hidden');
    
    // info.json faylından məlumatları yüklə
    try {
      const response = await fetch('info.json');
      if (!response.ok) {
        throw new Error('Məlumat yüklənə bilmədi');
      }
      const data = await response.json();
      
      // Məlumatları göstər
      displayInfo(data);
    } catch (error) {
      infoContent.innerHTML = `<p style="color: #ff6b6b;">Xəta: ${error.message}</p>`;
    }
  });
}

// Geri düyməsi
if (backToMenuFromInfoBtn) {
  backToMenuFromInfoBtn.addEventListener('click', () => {
    infoSection.classList.add('hidden');
    mainMenu.classList.remove('hidden');
  });
}

// Məlumatları göstərən funksiya
function displayInfo(data) {
  let html = '';
  
  if (data.title) {
    html += `<h2 style="margin-bottom: 20px;">${data.title}</h2>`;
  }
  
  if (data.description) {
    html += `<p style="margin-bottom: 20px; line-height: 1.6;">${data.description}</p>`;
  }
  
  if (data.sections && Array.isArray(data.sections)) {
    data.sections.forEach(section => {
      html += `<div style="margin-bottom: 30px;">`;
      if (section.heading) {
        html += `<h3 style="margin-bottom: 10px; color: #4a9eff;">${section.heading}</h3>`;
      }
      if (section.content) {
        html += `<p style="line-height: 1.6;">${section.content}</p>`;
      }
      if (section.list && Array.isArray(section.list)) {
        html += `<ul style="margin-top: 10px; padding-left: 20px;">`;
        section.list.forEach(item => {
          html += `<li style="margin-bottom: 8px;">${item}</li>`;
        });
        html += `</ul>`;
      }
      html += `</div>`;
    });
  }
  
  infoContent.innerHTML = html;
}
