/* ═══════════════════════════════════════════════════════
   js/modules/shop.js
   Shop section — currency, packs, boosters, cosmetics, bundles
═══════════════════════════════════════════════════════ */

let shopInitialized = false;

/* Player wallet state */
const wallet = {
  gold:       4200,
  cardPiece:  320,
  ruby:       85,
  rubyPiece:  14,
  gear:       7,
  cardShard:  45,
  mana:       12,
  key:        3,
  goldCard:   1,
  pieceCard:  0,
};

/* Wallet field → DOM id map */
const WALLET_IDS = {
  gold:      'wallet-gold',
  cardPiece: 'wallet-cardpiece',
  ruby:      'wallet-ruby',
  rubyPiece: 'wallet-rubypiece',
  gear:      'wallet-gear',
  cardShard: 'wallet-cardshard',
  mana:      'wallet-mana',
  key:       'wallet-key',
  goldCard:  'wallet-goldcard',
  pieceCard: 'wallet-piececard',
};

function initShop() {
  if (shopInitialized) return;
  shopInitialized = true;

  /* Tab switching */
  document.querySelectorAll('.shop-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.shop-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const tabKey = tab.dataset.shopTab;
      const panelId = 'shop-' + tabKey;
      const panel = document.getElementById(panelId);
      if (panel) {
        panel.classList.add('active');
        panel.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
      }
      /* Lazy init chests when that tab is opened */
      if (tabKey === 'chests' && typeof initChests === 'function') initChests();
    });
  });

  /* Top-up button */
  const topupBtn = document.getElementById('topup-btn');
  if (topupBtn) {
    topupBtn.addEventListener('click', () => {
      // Switch to currency tab
      document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.shop-panel').forEach(p => p.classList.remove('active'));
      const currTab = document.querySelector('[data-shop-tab="currency"]');
      const currPanel = document.getElementById('shop-currency');
      if (currTab) currTab.classList.add('active');
      if (currPanel) currPanel.classList.add('active');
      currPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  updateWalletUI();
}

/* Update wallet display */
function updateWalletUI() {
  for (const [key, id] of Object.entries(WALLET_IDS)) {
    const el = document.getElementById(id);
    if (el) el.textContent = wallet[key].toLocaleString();
  }
}

/* Purchase handler — called from inline onclick in HTML */
function handlePurchase(itemName, price) {
  const toast = document.getElementById('shop-toast');
  if (!toast) return;

  /* Clear previous */
  clearTimeout(toast._timer);
  toast.classList.remove('show', 'success', 'error');

  /* Simulate purchase result */
  const isFree = price === 'free';
  const isReal = price.startsWith('$');

  let msg, success;

  if (isFree) {
    wallet.gold += 1000;
    updateWalletUI();
    msg = `✅ 1,000 Gold cüzdana əlavə edildi!`;
    success = true;
  } else if (isReal) {
    msg = `🔒 Ödəniş səhifəsinə yönləndirilir: <strong>${itemName}</strong> (${price})…`;
    success = true;
  } else if (price.includes('Gold')) {
    const cost = parseInt(price.replace(/\D/g,''));
    if (wallet.gold >= cost) {
      wallet.gold -= cost;
      updateWalletUI();
      msg = `✅ <strong>${itemName}</strong> alındı (${price})!`;
      success = true;
    } else {
      msg = `❌ Gold kifayət deyil! ${price} lazımdır.`;
      success = false;
    }
  } else if (price.includes('Ruby') || price.includes('Gems')) {
    const cost = parseInt(price.replace(/\D/g,''));
    if (wallet.ruby >= cost) {
      wallet.ruby -= cost;
      updateWalletUI();
      msg = `✅ <strong>${itemName}</strong> alındı (${price})!`;
      success = true;
    } else {
      msg = `❌ Ruby kifayət deyil! ${price} lazımdır.`;
      success = false;
    }
  } else if (price.includes('Shard')) {
    const cost = parseInt(price.replace(/\D/g,''));
    if (wallet.mana >= cost) {
      wallet.mana -= cost;
      updateWalletUI();
      msg = `✅ <strong>${itemName}</strong> alındı (${price})!`;
      success = true;
    } else {
      msg = `❌ Mana Shard kifayət deyil! ${price} lazımdır.`;
      success = false;
    }
  } else {
    msg = `✅ <strong>${itemName}</strong> alındı!`;
    success = true;
  }

  toast.innerHTML = msg;
  toast.classList.add('show', success ? 'success' : 'error');
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

/* Expose globally so inline onclick works */
window.handlePurchase = handlePurchase;
window.initShop = initShop;
