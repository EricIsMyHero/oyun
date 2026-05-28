/* ═══════════════════════════════════════════════════════
   js/modules/chests.js
   Sandıq sistemi — xətti çəki əsaslı mükafat paylanması
═══════════════════════════════════════════════════════ */

/* ── Weighted Random Reward (Xətti Azalan Çəki) ── */
function getContinuousWeightedReward(minReward, maxReward) {
  if (minReward === maxReward) return minReward;
  if (minReward > maxReward) return minReward;

  const rewards = [];
  const weights = [];
  const totalSteps = maxReward - minReward;
  const startChance = 0.40;
  const endChance   = 0.10;
  const stepChance  = (startChance - endChance) / totalSteps;

  for (let i = 0; i <= totalSteps; i++) {
    rewards.push(minReward + i);
    weights.push(startChance - i * stepChance);
  }

  const totalWeight = weights.reduce((a, w) => a + w, 0);
  let rand = Math.random() * totalWeight;

  for (let i = 0; i < rewards.length; i++) {
    if (rand < weights[i]) return rewards[i];
    rand -= weights[i];
  }
  return maxReward;
}

/* ── Sandıq Konfiqurasiyası ──
   reward fields: [min, max] or null (o resurs bu sandıqda yoxdur)
   Columns: gold, cardPiece, rubyPiece, towerGearPiece, cardShard,
            dungeonKey, goldCard, pieceCard
*/
const CHEST_DEFS = [
  {
    id: 'mundane',
    name: 'Mundane',
    icon: '📦',
    rarity: 'mundane',
    priceRuby: 6,
    priceUSD: '$0.58',
    desc: 'Başlanğıc səviyyəsi. Əsas resurslara sahib ol.',
    rewards: {
      gold:          [125,   250],
      cardPiece:     [250,   500],
      rubyPiece:     [1,    5  ],
      towerGearPiece:[3,    5  ],
      cardShard:     [0,    10 ],
      dungeonKey:    null,
      goldCard:      null,
      pieceCard:     null,
    }
  },
  {
    id: 'familiar',
    name: 'Familiar',
    icon: '🟢',
    rarity: 'familiar',
    priceRuby: 12,
    priceUSD: '$1.18',
    desc: 'Tanış resurslara daha güclü giriş.',
    rewards: {
      gold:          [250,  375],
      cardPiece:     [500,  750],
      rubyPiece:     [3,    7  ],
      towerGearPiece:[5,    7  ],
      cardShard:     [0,    15 ],
      dungeonKey:    null,
      goldCard:      null,
      pieceCard:     null,
    }
  },
  {
    id: 'arcane',
    name: 'Arcane',
    icon: '🔮',
    rarity: 'arcane',
    priceRuby: 30,
    priceUSD: '$2.88',
    desc: 'Sehrli aura. Zindana açar ehtimalı başlayır.',
    rewards: {
      gold:          [375,  625],
      cardPiece:     [750,  1250],
      rubyPiece:     [5,    10 ],
      towerGearPiece:[7,    9  ],
      cardShard:     [0,    20 ],
      dungeonKey:    [0,    1  ],
      goldCard:      null,
      pieceCard:     null,
    }
  },
  {
    id: 'relic',
    name: 'Relic',
    icon: '🔴',
    rarity: 'relic',
    priceRuby: 55,
    priceUSD: '$4.98',
    desc: 'Qədim əşyalar. Daha çox açar, daha çox güc.',
    rewards: {
      gold:          [625,  875],
      cardPiece:     [1250, 1750],
      rubyPiece:     [10,   15 ],
      towerGearPiece:[9,    11 ],
      cardShard:     [0,    25 ],
      dungeonKey:    [0,    2  ],
      goldCard:      null,
      pieceCard:     null,
    }
  },
  {
    id: 'ascendant',
    name: 'Ascendant',
    icon: '🟠',
    rarity: 'ascendant',
    priceRuby: 110,
    priceUSD: '$9.08',
    desc: 'Yüksək dərəcə. Qızıl kart və parça kart şansı!',
    rewards: {
      gold:          [875,  1250],
      cardPiece:     [1750, 2500],
      rubyPiece:     [15,   30 ],
      towerGearPiece:[12,   14 ],
      cardShard:     [0,    30 ],
      dungeonKey:    [0,    3  ],
      goldCard:      [0,    1  ],
      pieceCard:     [0,    1  ],
    }
  },
  {
    id: 'apex',
    name: 'Apex',
    icon: '⚡',
    rarity: 'apex',
    priceRuby: 175,
    priceUSD: '$14.48',
    desc: 'Zirvə gücü. Elite mükafatlar.',
    rewards: {
      gold:          [1250, 1625],
      cardPiece:     [2500, 3250],
      rubyPiece:     [30,   50 ],
      towerGearPiece:[15,   17 ],
      cardShard:     [0,    40 ],
      dungeonKey:    [0,    4  ],
      goldCard:      [0,    1  ],
      pieceCard:     [0,    1  ],
    }
  },
  {
    id: 'ethereal',
    name: 'Ethereal',
    icon: '👻',
    rarity: 'ethereal',
    priceRuby: 250,
    priceUSD: '$19.18',
    desc: 'Saf enerjinin mükafatı. Ən yüksək tier.',
    rewards: {
      gold:          [1625, 2125],
      cardPiece:     [3250, 4250],
      rubyPiece:     [50,   75 ],
      towerGearPiece:[18,   20 ],
      cardShard:     [0,    50 ],
      dungeonKey:    [0,    5  ],
      goldCard:      [0,    1  ],
      pieceCard:     [0,    1  ],
    }
  },
  {
    id: 'lucky1',
    name: 'Lucky Chest I',
    icon: '🍀',
    rarity: 'ascendant',
    priceRuby: 30,
    priceUSD: '$2.96',
    desc: 'Sürpriz sandıq. Geniş aralıq, tam şanslı!',
    rewards: {
      gold:          [100,  1000],
      cardPiece:     [200,  2000],
      rubyPiece:     [0,    20 ],
      towerGearPiece:[0,    8  ],
      cardShard:     [0,    10 ],
      dungeonKey:    [0,    3  ],
      goldCard:      null,
      pieceCard:     null,
    }
  },
  {
    id: 'lucky2',
    name: 'Lucky Chest II',
    icon: '🌠',
    rarity: 'apex',
    priceRuby: 80,
    priceUSD: '$7.16',
    desc: 'Böyük şans sandığı. Kəskin mükafat potensialı.',
    rewards: {
      gold:          [250,  2500],
      cardPiece:     [500,  5000],
      rubyPiece:     [0,    50 ],
      towerGearPiece:[0,    20 ],
      cardShard:     [0,    25 ],
      dungeonKey:    [0,    5  ],
      goldCard:      null,
      pieceCard:     null,
    }
  },
  {
    id: 'ruby',
    name: 'Ruby Chest',
    icon: '💎',
    rarity: 'relic',
    priceRuby: 50,
    priceUSD: '$4.46',
    desc: 'Ruby parçaları üçün xüsusi sandıq. Min. 10 parça!',
    rewards: {
      gold:          [25,   50 ],
      cardPiece:     [50,   100],
      rubyPiece:     [10,   1000],
      towerGearPiece:[2,    4  ],
      cardShard:     null,
      dungeonKey:    null,
      goldCard:      null,
      pieceCard:     null,
    }
  },
  {
    id: 'piece',
    name: 'Piece Chest',
    icon: '🧩',
    rarity: 'familiar',
    priceRuby: 25,
    priceUSD: '$2.46',
    desc: 'Yalnız kart parçası verir. Dəstə qurmaq üçün ideal.',
    rewards: {
      gold:          null,
      cardPiece:     [500,  1000],
      rubyPiece:     [25,   50 ],
      towerGearPiece:null,
      cardShard:     null,
      dungeonKey:    null,
      goldCard:      null,
      pieceCard:     null,
    }
  },
];

/* ── Reward meta (label, icon, wallet key) ── */
const REWARD_META = {
  gold:           { label: 'Gold',              icon: '🪙',  walletKey: 'gold'      },
  cardPiece:      { label: 'Card Piece',        icon: '🃏',  walletKey: 'cardPiece' },
  rubyPiece:      { label: 'Ruby Piece',        icon: '🔴',  walletKey: 'rubyPiece' },
  towerGearPiece: { label: 'Tower Gear Piece',  icon: '⚙️',  walletKey: 'gear'      },
  cardShard:      { label: 'Card Shard',        icon: '✨',  walletKey: 'cardShard' },
  dungeonKey:     { label: 'Dungeon Key',       icon: '🗝️',  walletKey: 'key'       },
  goldCard:       { label: 'Gold Card',         icon: '🌟',  walletKey: 'goldCard'  },
  pieceCard:      { label: 'Piece Card',        icon: '🧩',  walletKey: 'pieceCard' },
};

/* ── Roll rewards for a chest ── */
function rollChest(chest) {
  const rolled = {};
  for (const [key, range] of Object.entries(chest.rewards)) {
    if (!range) continue;
    const val = getContinuousWeightedReward(range[0], range[1]);
    if (val > 0) rolled[key] = val;
  }
  return rolled;
}

/* ── Render chest grid ── */
let chestsInitialized = false;

function initChests() {
  if (chestsInitialized) return;
  chestsInitialized = true;

  const grid = document.getElementById('chests-grid');
  if (!grid) return;

  grid.innerHTML = CHEST_DEFS.map(c => `
    <div class="chest-card chest-card--${c.rarity}" data-chest-id="${c.id}">
      <div class="chest-card__bg-glow"></div>
      <div class="chest-card__icon">${c.icon}</div>
      <div class="chest-rarity-tag chest-rarity--${c.rarity}">${c.rarity.toUpperCase()}</div>
      <div class="chest-name">${c.name}</div>
      <p class="chest-desc">${c.desc}</p>
      <div class="chest-reward-preview">
        ${Object.entries(c.rewards).filter(([,v]) => v).map(([k, range]) => `
          <div class="chest-reward-row">
            <span class="chest-reward-icon">${REWARD_META[k].icon}</span>
            <span class="chest-reward-label">${REWARD_META[k].label}</span>
            <span class="chest-reward-range">${range[0]}–${range[1]}</span>
          </div>
        `).join('')}
      </div>
      <div class="chest-footer">
        <div class="chest-prices">
          <span class="chest-price-ruby">💎 ${c.priceRuby}</span>
          <span class="chest-price-usd">${c.priceUSD}</span>
        </div>
        <button class="chest-open-btn" data-chest-id="${c.id}">Aç</button>
      </div>
    </div>
  `).join('');

  /* Open button listeners */
  grid.querySelectorAll('.chest-open-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openChest(btn.dataset.chestId);
    });
  });

  /* Close result overlay */
  document.getElementById('chest-result-close').addEventListener('click', closeChestResult);
  document.getElementById('chest-result-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeChestResult();
  });

  /* Open again */
  document.getElementById('chest-open-again-btn').addEventListener('click', () => {
    const id = document.getElementById('chest-result-overlay').dataset.lastChest;
    if (id) openChest(id, true);
  });
}

function openChest(chestId, repeat = false) {
  const chest = CHEST_DEFS.find(c => c.id === chestId);
  if (!chest) return;

  /* Deduct ruby cost from wallet */
  if (wallet.ruby < chest.priceRuby) {
    showToast(`❌ Ruby kifayət deyil! ${chest.priceRuby} Ruby lazımdır.`, false);
    return;
  }
  wallet.ruby -= chest.priceRuby;
  updateWalletUI();

  /* Roll rewards */
  const rewards = rollChest(chest);

  /* Apply ALL rewards to wallet */
  for (const [key, val] of Object.entries(rewards)) {
    const meta = REWARD_META[key];
    if (meta && meta.walletKey && wallet[meta.walletKey] !== undefined) {
      wallet[meta.walletKey] += val;
    }
  }
  updateWalletUI();

  /* Build result HTML */
  const rewardRows = Object.entries(rewards).map(([key, val]) => {
    const meta = REWARD_META[key];
    const isJackpot = chest.rewards[key] && val >= chest.rewards[key][1];
    const isZero = val === 0;
    if (isZero) return '';
    return `
      <div class="chest-result-reward-row ${isJackpot ? 'jackpot' : ''}">
        <span class="chest-result-reward-icon">${meta.icon}</span>
        <span class="chest-result-reward-label">${meta.label}</span>
        <span class="chest-result-reward-val ${isJackpot ? 'jackpot-val' : ''}">
          ${val.toLocaleString()}${isJackpot ? ' 🎉' : ''}
        </span>
      </div>
    `;
  }).join('');

  /* Show overlay */
  const overlay = document.getElementById('chest-result-overlay');
  overlay.dataset.lastChest = chestId;
  document.getElementById('chest-result-icon').textContent = chest.icon;
  document.getElementById('chest-result-chest-name').textContent = chest.name + ' Sandığı';
  document.getElementById('chest-result-rewards').innerHTML = rewardRows || '<p style="color:var(--muted);font-style:italic">Bu dəfə heç nə çıxmadı...</p>';

  /* Animate open */
  const box = document.getElementById('chest-result-box');
  overlay.classList.add('active');
  if (!repeat) {
    box.style.animation = 'none';
    void box.offsetWidth;
    box.style.animation = 'chest-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both';
  }

  /* Stagger reward rows */
  const rows = document.querySelectorAll('.chest-result-reward-row');
  rows.forEach((row, i) => {
    row.style.animationDelay = `${0.1 + i * 0.07}s`;
    row.classList.remove('row-reveal');
    void row.offsetWidth;
    row.classList.add('row-reveal');
  });
}

function closeChestResult() {
  document.getElementById('chest-result-overlay').classList.remove('active');
}

function showToast(msg, success) {
  const toast = document.getElementById('shop-toast');
  if (!toast) return;
  clearTimeout(toast._timer);
  toast.classList.remove('show', 'success', 'error');
  toast.innerHTML = msg;
  toast.classList.add('show', success ? 'success' : 'error');
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

window.initChests = initChests;
