// DOM Elementləri və funksiyaları DOMContentLoaded içərisində işə sal

document.addEventListener('DOMContentLoaded', () => {
  const filterButtons = document.querySelectorAll('.controls button');
  const cardsContainer = document.getElementById('cards');

  let allCardsData = []; // Bütün kart məlumatlarını saxlamaq üçün massiv

  // Kart yaratmaq üçün funksiya
  function createCardElement(data) {
    const card = document.createElement('article');

    card.className = `card r-${data.rarity.toLowerCase()}`;
    
    const badgeText = data.isHybrid ? `${data.type[0]}/${data.type[1]}` : data.type[0];

    card.innerHTML = `
    <div class="stripe"></div>
    <div class="head">
      <div class="name">${data.name}</div><span class="badge">${badgeText}</span>
    </div>
    <div class="meta">
      <span class="pill">Can: ${data.stats.health}</span>
      <span class="pill">Hasar: ${data.stats.damage}</span>
      <span class="pill">S.B.H: ${data.stats.sps}</span>
      <span class="pill">Saldırı Hızı: ${data.stats.attackSpeed}</span>
      <span class="pill">Gecikmə: ${data.stats.delay}</span>
      <span class="pill">Qalxan: ${data.stats.shield}</span>
      <span class="pill">Mana: ${data.additionalStats.mana}</span>
      <span class="pill">Menzil: ${data.additionalStats.range}</span>
      <span class="pill">Hız: ${data.additionalStats.speed}</span>
      <span class="pill">Kritik: ${data.additionalStats.critical}</span>
    </div>
    <div class="trait">${data.trait}</div>
  `;

    // Ethereal parıltısını əlavə et
    if (data.rarity.toLowerCase() === 'ethereal') {
      const glowDiv = document.createElement('div');
      glowDiv.className = 'card-glow';
      glowDiv.setAttribute('aria-hidden', 'true');
      card.appendChild(glowDiv);
    }

    return card;
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

      // Aktiv düymə sinifini yenilə
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      filterCards(rarity);
    });
  });

  // Səhifə yüklənərkən kartları çək və göstər
  fetchCards();
});
