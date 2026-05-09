/* ═══════════════════════════════════════════════════════
   js/core/navigation.js
   Section routing, portal control, nav buttons
═══════════════════════════════════════════════════════ */

const introScreen = document.getElementById('intro-screen');
const mainPortal  = document.getElementById('main-portal');

const sections = {
  lore:   document.getElementById('lore-section'),
  cards:  document.getElementById('cards-section'),
  spells: document.getElementById('spells-section'),
  info:   document.getElementById('info-section'),
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

  Object.values(sections).forEach(s => s.style.display = 'none');
  if (sections[name]) sections[name].style.display = 'block';

  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.section === name);
  });

  /* Lazy-load section data */
  if (name === 'cards')  initCards();
  if (name === 'spells') initSpells();
  if (name === 'info')   initInfo();

  window.scrollTo({ top: 0, behavior: 'smooth' });
  initReveal();
}

/* ── Hero CTA buttons ── */
document.getElementById('explore-btn').addEventListener('click', () => showPortal('cards'));
document.getElementById('lore-btn').addEventListener('click',    () => showPortal('lore'));

/* ── Nav logo → back to intro ── */
document.getElementById('nav-logo').addEventListener('click', () => {
  mainPortal.style.display  = 'none';
  introScreen.style.display = 'flex';
  window.scrollTo({ top: 0 });
});

/* ── Sticky nav buttons ── */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchSection(btn.dataset.section));
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
