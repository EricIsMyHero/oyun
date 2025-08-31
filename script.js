// DOM Elementləri
const hybridGlowBtn = document.getElementById('toggle-hybrid');
const treeBtn = document.getElementById('toggle-tree');
const tree = document.getElementById('tree');
const cardsContainer = document.getElementById('cards');

// Kart yaratmaq üçün funksiya
function createCardElement(data) {
  const card = document.createElement('article');
  card.className = `card t-${data.type}`;
  if (data.isHybrid) {
    card.classList.add('hybrid-card');
  }

  card.innerHTML = `
    <div class="stripe"></div>
    <div class="head">
      <div class="name">${data.name ?? ''}</div><span class="badge">${data.type ?? ''}</span>
    </div>
    ${data.isHybrid ? '<div class="hybrid" aria-hidden="true"></div>' : ''}
    <div class="meta">
      <span class="pill">Hasar: ${data.stats?.damage ?? '-'}</span><span class="pill">S.B.H: ${data.stats?.sps ?? '-'}</span>
      <span class="pill">Saldırı Hızı: ${data.stats?.attackSpeed ?? '-'}</span><span class="pill">Gecikmə: ${data.stats?.delay ?? '-'}</span>
      <span class="pill">Qalxan: ${data.stats?.shield ?? '-'}</span>
    </div>
    <div class="trait">${data.trait ?? ''}</div>
    <div class="stats">
      <div class="stat"><b>Mana</b><span>${data.additionalStats?.mana ?? '-'}</span></div>
      <div class="stat"><b>Menzil</b><span>${data.additionalStats?.range ?? '-'}</span></div>
      <div class="stat"><b>Hız</b><span>${data.additionalStats?.speed ?? '-'}</span></div>
      ${data.rarity ? `
        <div class="stat rarity" title="${data.rarity}">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l2.9 6.6L22 10l-5 4.6L18 22l-6-3.5L6 22l1-7.4L2 10l7.1-1.4L12 2z"/>
          </svg>
          ${data.rarity} Hibrid
        </div>` : `
        <div class="stat"><b>Kritik</b><span>${data.additionalStats?.critical ?? '-'}</span></div>
      `}
    </div>
  `;

  return card;
}

// Kartları render edən funksiya
function renderCards(cardData) {
  if (!cardsContainer) return;
  cardsContainer.innerHTML = ''; // Köhnə kartları təmizlə
  cardData.forEach(data => {
    cardsContainer.appendChild(createCardElement(data));
  });
}

// JSON faylından məlumatları çəkən funksiya
async function fetchCards() {
  if (!cardsContainer) return;
  try {
    const response = await fetch('cards.json');
    if (!response.ok) {
      throw new Error(`HTTP xətası! Status: ${response.status}`);
    }
    const data = await response.json();
    renderCards(data);
  } catch (error) {
    console.error('Məlumatları yükləmə zamanı xəta:', error);
    cardsContainer.innerHTML = '<p style="color:red;">Kart məlumatları yüklənərkən xəta baş verdi.</p>';
  }
}

// Event Listeners
if (hybridGlowBtn) {
  hybridGlowBtn.addEventListener('click', () => {
    const hybridCards = document.querySelectorAll('.hybrid');
    hybridCards.forEach(card => {
      card.classList.toggle('hidden');
    });
  });
}

if (treeBtn && tree) {
  treeBtn.addEventListener('click', () => {
    tree.classList.toggle('hidden');
  });
}

// Səhifə yüklənərkən kartları çək və göstər
document.addEventListener('DOMContentLoaded', fetchCards);
