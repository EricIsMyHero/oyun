/* ═══════════════════════════════════════════════════════
   js/core/navigation.js
   Section routing, portal control, nav buttons
═══════════════════════════════════════════════════════ */

const introScreen = document.getElementById('intro-screen');
const mainPortal  = document.getElementById('main-portal');

const sections = {
  lore:   document.getElementById('lore-section'),
  battle: document.getElementById('battle-section'),
  survival: document.getElementById('survival-section'),
  cards:  document.getElementById('cards-section'),
  spells: document.getElementById('spells-section'),
  towerguns: document.getElementById('towerguns-section'),
  info:   document.getElementById('info-section'),
  powerups: document.getElementById('powerups-section'),
  shop:     document.getElementById('shop-section'),
  chests:   document.getElementById('shop-section'),
  manapass: document.getElementById('manapass-section'),
  trophyroad: document.getElementById('trophyroad-section'),
};

let currentSection = null;

/* ── Show the main portal and switch to a section ── */
function showPortal(section) {
  introScreen.style.display = 'none';
  mainPortal.style.display  = 'block';
  switchSection(section);
}

/* ── Switch between sections ── */
function switchSection(name) {
  currentSection = name;
  if (typeof survivalSetVisible === 'function') survivalSetVisible(name === 'survival');

  Object.values(sections).forEach(s => s.style.display = 'none');
  if (sections[name]) sections[name].style.display = 'block';

  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.section === name);
  });
  updateNavGroups();
  closeNavGroups();

  /* Lazy-load section data */
  if (name === 'battle') initBattle();
  if (name === 'survival') initSurvival();
  if (name === 'cards')  initCards();
  if (name === 'spells') initSpells();
  if (name === 'towerguns') initTowerGuns();
  if (name === 'info')   initInfo();
  if (name === 'powerups') initPowerUps();
  if (name === 'shop')     initShop();
  if (name === 'chests')   initChests();
  if (name === 'manapass') initManaPass();
  if (name === 'trophyroad') initTrophyRoad();

  window.scrollTo({ top: 0, behavior: 'smooth' });
  initReveal();
}

/* ── Hero CTA buttons ── */
document.getElementById('explore-btn').addEventListener('click', () => showPortal('cards'));
document.getElementById('lore-btn').addEventListener('click',    () => showPortal('lore'));

/* ── Nav logo → back to intro ── */
document.getElementById('nav-logo').addEventListener('click', () => {
  if (typeof survivalSetVisible === 'function') survivalSetVisible(false);
  mainPortal.style.display  = 'none';
  introScreen.style.display = 'flex';
  window.scrollTo({ top: 0 });
});

/* ── Sticky nav buttons ── */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchSection(btn.dataset.section));
});

/* ═══════════════════════════════════════════════════════
   NAV PACKAGES (dropdown groups: Archive / Game)
═══════════════════════════════════════════════════════ */
const navGroups = document.querySelectorAll('.nav-group');

/* Highlight the group that owns the active section and show its name */
function updateNavGroups() {
  navGroups.forEach(g => {
    const active = g.querySelector('.nav-btn.active');
    g.classList.toggle('has-active', !!active);
    const cur = g.querySelector('.nav-group-current');
    if (cur) cur.textContent = active ? (active.dataset.label || active.textContent.trim()) : '';
  });
}

function closeNavGroups(except) {
  navGroups.forEach(g => {
    if (g === except) return;
    g.classList.remove('open');
    const t = g.querySelector('.nav-group-btn');
    if (t) t.setAttribute('aria-expanded', 'false');
  });
}

navGroups.forEach(g => {
  const trigger = g.querySelector('.nav-group-btn');
  trigger.addEventListener('click', e => {
    e.stopPropagation();
    const willOpen = !g.classList.contains('open');
    closeNavGroups(g);
    g.classList.toggle('open', willOpen);
    trigger.setAttribute('aria-expanded', String(willOpen));
  });
});

/* Click outside / Escape closes any open menu */
document.addEventListener('click', e => {
  if (!e.target.closest('.nav-group')) closeNavGroups();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeNavGroups();
});

/* ═══════════════════════════════════════════════════════
   SCROLL REVEAL
═══════════════════════════════════════════════════════ */
function initReveal() {
  const els = document.querySelectorAll('.reveal:not(.visible)');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  els.forEach(el => obs.observe(el));
}

/* Run once on page load for any already-visible elements */
initReveal();
