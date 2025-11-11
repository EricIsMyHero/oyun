// DOM Elementləri
const mainMenu = document.getElementById('main-menu');
const cardsSection = document.getElementById('cards-section');
const showCardsBtn = document.getElementById('show-cards-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const filterButtons = document.querySelectorAll('.controls button');
const cardsContainer = document.getElementById('cards');

function showMenu() {
  mainMenu.classList.remove('hidden');
  cardsSection.classList.add('hidden');
}

function showCards() {
  mainMenu.classList.add('hidden');
  cardsSection.classList.remove('hidden');
  fetchAndRender('all');
}

// Kart yaratmaq üçün əsas funksiya
function createCardElement(data) {
    const cardContainer = document.createElement('article');
    cardContainer.className = `card-container card r-${data.rarity.toLowerCase()}`;
    
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
    
    const cardButtons = content.querySelectorAll('.card-tabs button');
    cardButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const sectionId = button.dataset.section;
            
            cardButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            content.querySelectorAll('.stats-section').forEach(section => {
                section.classList.remove('visible');
            });
            content.querySelector(`[data-section-id="${sectionId}"]`).classList.add('visible');
        });
    });

    return content;
}

// Kartları render edən funksiya
function renderCards(cardsToRender) {
    cardsContainer.innerHTML = '';
    if (cardsToRender.length === 0) {
        cardsContainer.innerHTML = '<p>Bu endərlikdə kart tapılmadı.</p>';
        return;
    }
    cardsToRender.forEach(data => {
        cardsContainer.appendChild(createCardElement(data));
    });
}

// Məlumatları endərliyə görə çəkən və göstərən funksiya
async function fetchAndRender(rarity) {
  cardsContainer.innerHTML = '<p>Loading...</p>';
  try {
    let cardsData = [];
    if (rarity === 'all') {
      const rarities = ['mundane', 'familiar', 'arcane', 'mythic', 'legendary', 'ethereal'];
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
      cardsData = results.flat();
    } else {
      const response = await fetch(`${rarity}.json`);
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`${rarity}.json tapılmadı.`);
          cardsData = [];
        } else {
          throw new Error(`HTTP xətası! Status: ${response.status}`);
        }
      } else {
        const text = await response.text();
        cardsData = text ? JSON.parse(text) : [];
      }
    }
    renderCards(cardsData);
  } catch (error) {
    console.error('Məlumatları yükləmə zamanı xəta:', error);
    cardsContainer.innerHTML = '<p style="color:red;">Kart məlumatları yüklənərkən xəta baş verdi.</p>';
  }
}


showCardsBtn.addEventListener('click', showCards);
backToMenuBtn.addEventListener('click', showMenu);

['show-spells-btn','show-boosters-btn','show-towers-btn'].forEach(id=>{
  document.getElementById(id).addEventListener('click',()=>{
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
});

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    const rarity = button.id.split('-')[1];
    filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    fetchAndRender(rarity);
  });
});

document.addEventListener('DOMContentLoaded', showMenu);
