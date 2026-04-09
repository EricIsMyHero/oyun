// ─────────────────────────────────────────────
// INTRO SEQUENCE — Audio ilə sinxronizasiya
// Audio: 2 dəq 50 san = 170 saniyə
// ─────────────────────────────────────────────

const AUDIO_SRC      = 'assets/intro.mp3';   // audio faylın yolu
const AUDIO_DURATION = 170000;                // ms (170s)
const END_BUFFER     = 8000;                 // son 8s sonda saxla
const USABLE_MS      = AUDIO_DURATION - END_BUFFER; // 162000ms

const SEGMENTS = [
  { head:      true,  text: "Stagnantia: The Tale of the Endless Cycle" },
  { para:      true,  text: "The year is 2467. Humanity has reached the pinnacle of technological advancement, but is spiritually exhausted. Diseases have been cured, and resource problems solved. However, this perfection has brought about a great curse: a period of stagnation in Stagnantia. People no longer enjoy anything or create anything new. To combat this mass feeling of boredom, a ruthless project is launched: Clash-A-Mana." },
  { para:      true,  text: "The world is divided into two stark poles:" },
  { bullet:    true,  text: "The Crimson Crown: This tier consists of the world's rulers and the wealthy. They are the architects of Stagnantia. They live in comfort, and their sole purpose is entertainment. For them, life is just a control panel." },
  { bullet:    true,  text: "The Azure Core: The rest of society, the working class and ordinary people. They are the cogs in the system created by the Crimson Crown. The Azure Core is always struggling, but this struggle never lifts them to the upper class." },
  { para:      true,  text: "Scientists discovered reality-warping portals to entertain the bored masses. These portals bring beings from different times and dimensions-ancient knights, robots of the future, mythological monsters, and wild beasts-to Stagnantia." },
  { para:      true,  text: "Giant, symmetrical arenas are built for the battles. At one end of the arena, a red castle representing The Crimson Crown towers, and at the other, a blue one representing The Azure Core." },
  { para:      true,  text: "In each battle, a player from The Crimson Crown faction kidnaps a person from The Azure Core faction for entertainment and forces them to fight in the arena." },
  { highlight: true,  text: "You are one of those kidnapped." },
  { para:      true,  text: "You are dealt digital cards. These cards are the only way to control the beings brought through portals. You have only one objective:" },
  { highlight: true,  text: '"Destroy the opponent tower and be free."' },
  { para:      true,  text: "You win by strategically playing each card you are dealt, advancing your troops and defending your tower. This struggle you fight in the dust and dirt, at the cost of your soul, promises you freedom." },
  { para:      true,  text: "But the reality is different from what you've been told. Clash-A-Mana games are not meant to end, but to continue. Every victory you achieve leads you not to freedom, but to the next, more difficult battle. In Stagnantia, time has stood still. You are trapped in an endless cycle. Your heroism is just an evening's show for The Crimson Crown." },
  { highlight: true,  text: "The only way to freedom is not to win the game, but to destroy the system itself." },
  { para:      true,  text: "Yet the portals continue to open, and the cards keep on being dealt." },
];

const TOTAL_CHARS = SEGMENTS.reduce((a, s) => a + s.text.length, 0);
const MS_PER_CHAR = USABLE_MS / TOTAL_CHARS;

// ── DOM ───────────────────────────────────────────────────────────────────────
const overlay     = document.getElementById('intro-overlay');
const introTextEl = document.getElementById('intro-text');
const skipBtn     = document.getElementById('intro-skip-btn');
const progressBar = document.getElementById('intro-progress-bar');
const mainContent = document.getElementById('main-content');

// ── Audio ─────────────────────────────────────────────────────────────────────
const audio = new Audio(AUDIO_SRC);
audio.volume = 1.0;
audio.preload = 'auto';

// ── Vəziyyət ──────────────────────────────────────────────────────────────────
let stopped   = false;
let charCount = 0;
let timers    = [];

function clearAllTimers() {
    timers.forEach(clearTimeout);
    timers = [];
}

function at(fn, ms) {
    timers.push(setTimeout(fn, ms));
}

// ── Blok yarat ────────────────────────────────────────────────────────────────
function createBlock(seg) {
    const el = document.createElement('p');
    if      (seg.head)      el.className = 'intro-head';
    else if (seg.bullet)    el.className = 'intro-bullet';
    else if (seg.highlight) el.className = 'intro-highlight';
    else                    el.className = 'intro-para';
    return el;
}

// ── Segment cədvəli ───────────────────────────────────────────────────────────
function scheduleSegment(seg, segStartMs) {
    const block = createBlock(seg);
    at(() => {
        if (!stopped) introTextEl.appendChild(block);
    }, segStartMs);

    for (let ci = 0; ci < seg.text.length; ci++) {
        const ch       = seg.text[ci];
        const charTime = segStartMs + (ci + 1) * MS_PER_CHAR;

        at(() => {
            if (stopped) return;
            block.textContent += ch;
            charCount++;
            progressBar.style.width = (charCount / TOTAL_CHARS * 100) + '%';
            block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, charTime);
    }
}

function scheduleAll() {
    let elapsed = 0;
    SEGMENTS.forEach(seg => {
        scheduleSegment(seg, elapsed);
        elapsed += seg.text.length * MS_PER_CHAR;
    });
    at(endIntro, AUDIO_DURATION + 500);
}

// ── İntro sonu ────────────────────────────────────────────────────────────────
function endIntro() {
    if (stopped) return;
    stopped = true;
    clearAllTimers();
    audio.pause();
    fadeOut();
}

function fadeOut() {
    overlay.classList.add('intro-fade-out');
    overlay.addEventListener('animationend', () => {
        overlay.remove();
        mainContent.style.display = '';
    }, { once: true });
}

// ── Skip ──────────────────────────────────────────────────────────────────────
skipBtn.addEventListener('click', () => {
    if (stopped) return;
    stopped = true;
    clearAllTimers();
    audio.pause();

    // Bütün mətni dərhal yaz
    introTextEl.innerHTML = '';
    SEGMENTS.forEach(seg => {
        const block = createBlock(seg);
        block.textContent = seg.text;
        introTextEl.appendChild(block);
    });
    progressBar.style.width = '100%';

    setTimeout(fadeOut, 600);
});

// ── Başlat ────────────────────────────────────────────────────────────────────
scheduleAll();
audio.play().catch(() => {
    console.warn('Audio autoplay blocked — text continues without audio.');
});
