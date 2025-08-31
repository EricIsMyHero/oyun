const hybridGlowBtn = document.getElementById('toggle-hybrid');
const treeBtn = document.getElementById('toggle-tree');
const tree = document.getElementById('tree');
const cardsContainer = document.getElementById('cards');

// Kart məlumatları (bu massiv artırıla bilər)
const cardData = [
  {
    name: 'Skyhunter',
    type: 'insan',
    isHybrid: false,
    rarity: null,
    stats: {
      damage: '22',
      sps: '18',
      attackSpeed: '0,70s',
      delay: '-',
      shield: '50'
    },
    trait: 'Uçan kartlara <b>+20% Hasar</b> bonusu.',
    additionalStats: {
      mana: '10',
      range: '1,500',
      speed: '1,000',
      critical: '5%'
    }
  },
  {
    name: 'Bio Mech',
    type: 'robot',
    isHybrid: true,
    rarity: 'Nadir',
    stats: {
      damage: '8x3',
      sps: '18',
      attackSpeed: '0,80s',
      delay: '1,10s',
      shield: '60'
    },
    trait: 'Hər vuruşdan sonra 3s <b>-5 Can/Zəhər</b>.',
    additionalStats: {
      mana: '13',
      range: '2,000',
      speed: '1,000'
    }
  }
];

// Kart yaratma funksiyası
function createCardElement(data) {
  const card = document.createElement('article');
  card.className = `card t-${data.type}`;
  if (data.isHybrid) {
    card.classList.add('hybrid-card');
  }

  card.innerHTML = `
    <div class="stripe"></div>
    <div class="head">
      <div class="name">${data.name}</div><span class="badge">${data.type}</span>
    </div>
    ${data.isHybrid ? '<div class="hybrid" aria-hidden="true"></div>' : ''}
    <div class="meta">
      <span class="pill">Hasar: ${data.stats.damage}</span><span class="pill">S.B.H: ${data.stats.sps}</span>
      <span class="pill">Saldırı Hızı: ${data.stats.attackSpeed}</span><span class="pill">Gecikmə: ${data.stats.delay}</span>
      <span class="pill">Qalxan: ${data.stats.shield}</span>
    </div>
    <div class="trait">${data.trait}</div>
    <div class="stats">
      <div class="stat"><b>Mana</b><span>${data.additionalStats.mana}</span></div>
      <div class="stat"><b>Menzil</b><span>${data.additionalStats.range}</span></div>
      <div class="stat"><b>Hız</b><span>${data.additionalStats.speed}</span></div>
      ${data.rarity ? `
        <div class="stat rarity" title="${data.rarity}">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l2.9 6.6L22 10l-5 4.6L18 22l-6-3.5L6 22l1-7.4L2 10l7.1-1.4L12 2z"/>
          </svg>
          ${data.rarity} Hibrid
        </div>` : `
        <div class="stat"><b>Kritik</b><span>${data.additionalStats.critical}</span></div>
      `}
    </div>
  `;

  return card;
}

// Kartları render edən funksiya
function renderCards() {
  cardData.forEach(data => {
    cardsContainer.appendChild(createCardElement(data));
  });
}

// Düymə hadisələri
hybridGlowBtn.addEventListener('click', () => {
  const hybridCards = document.querySelectorAll('.hybrid');
  hybridCards.forEach(card => {
    card.classList.toggle('hidden');
  });
});

treeBtn.addEventListener('click', () => {
  tree.classList.toggle('hidden');
});

// Səhifə yüklənərkən kartları göstər
renderCards();
