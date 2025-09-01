// DOM Elementləri
const filterButtons = document.querySelectorAll('.controls button');
const cardsContainer = document.getElementById('cards');

let allCardsData = [];

// Kart yaratmaq üçün əsas funksiya
function createCardElement(data) {
  const cardContainer = document.createElement('article');
  cardContainer.className = `card-container r-${data.rarity.toLowerCase()}`;
  
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
    flipButton.addEventListener('click', (e) => {
      e.stopPropagation();
      cardContainer.classList.toggle('is-flipped');
    });
    cardContainer.appendChild(flipButton);
  } else {
    const singleCard = createCardContent(data);
    singleCard.classList.add('card-single');
    cardContainer.appendChild(singleCard);
  }

  // Ethereal parıltısını əlavə et
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
      <div class="name">${data.name}</div><span class="badge">${badgeText}</span>
    </div>
    <div class="card-tabs">
      <button class="active" data-section="main-stats">Əsas</button>
      <button data-section="additional-stats">Əlavə</button>
      <button data-section="trait">Özəllik</button>
    </div>
    
    <div class="stats-section visible" data-section-id="main-stats">
      <div class="stat-item"><b>Can</b><span>${data.stats.health}</span></div>
      <div class="stat-item"><b>Qalxan</b><span>${data.stats.shield}</span></div>
      <div class="stat-item"><b>Hasar</b><span>${data.stats.damage}</span></div>
      <div class="stat-item"><b>S.B.H</b><span>${data.stats.sps}</span></div>
      <div class="stat-item"><b>Saldırı Hızı</b><span>${data.stats.attackSpeed}</span></div>
      <div class="stat-item"><b>Gecikmə</b><span>${data.stats.delay}</span></div>
      <div class="stat-item"><b>Mana</b><span>${data.stats.mana}</span></div>
      <div class="stat-item"><b>Say</b><span>${data.stats.number}</span></div>
    </div>
    
    <div class="stats-section" data-section-id="additional-stats">
      <div class="stat-item"><b>Menzil</b><span>${data.additionalStats.range}</span></div>
      <div class="stat-item"><b>Hız</b><span>${data.additionalStats.speed}</span></div>
      <div class="stat-item"><b>Kritik Şansı</b><span>${data.additionalStats.criticalChance}</span></div>
      <div class="stat-item"><b>Can Çalma Şansı</b><span>${data.additionalStats.lifestealChance}</span></div>
    </div>
    
    <div class="stats-section" data-section-id="trait">
      <div class="trait trait-center">${data.trait}</div>
    </div>
  `;

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
  cardsToRender.forEach(data => {
    cardsContainer.appendChild(createCardElement(data));
  });
}

// JSON faylından məlumatları çəkən funksiya
async function fetchCards() {
  try {
    const response = await fetch('cards.json');
    if (!response.ok) {
      throw new Error(`HTTP xətası! Status: ${response.status}`);
    }
    allCardsData = await response.json();
    renderCards(allCardsData);
  } catch (error) {
    console.error('Məlumatları yükləmə zamanı xəta:', error);
    cardsContainer.innerHTML = '<p style="color:red;">Kart məlumatları yüklənərkən xəta baş verdi.</p>';
  }
}

// Filtrləmə funksiyası
function filterCards(rarity) {
  let filteredCards = allCardsData;
  if (rarity !== 'all') {
    filteredCards = allCardsData.filter(card => card.rarity.toLowerCase() === rarity);
  }
  renderCards(filteredCards);
}

// Event Listeners
filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    const rarity = button.id.split('-')[1];
    filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    filterCards(rarity);
  });
});

// Səhifə yüklənərkən kartları çək və göstər
document.addEventListener('DOMContentLoaded', fetchCards);
