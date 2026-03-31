// ─────────────────────────────────────────────
// INTRO SEQUENCE — Audio ilə sinxronizasiya
// Audio: 2 dəq 50 san = 170 saniyə
// ─────────────────────────────────────────────

const AUDIO_SRC      = 'assets/intro.mp3';   // audio faylın yolu
const AUDIO_DURATION = 170000;                // ms (170s)
const END_BUFFER     = 8000;                  // son 8s sonda saxla
const USABLE_MS      = AUDIO_DURATION - END_BUFFER; // 162000ms

const SEGMENTS = [
  { head:      true,  text: "Stagnantia: The Story of the Infinite Cycle" },
  { para:      true,  text: "The year is 2467. Humanity has reached the pinnacle of technological development, but is spiritually exhausted. Diseases have been cured, resource problems have been solved. However, this perfection has brought a great misfortune — a period of stagnation in Stagnantia. People no longer enjoy anything, they do not create anything new. To eliminate this mass boredom, a ruthless project is launched: Clash-A-Mana." },
  { para:      true,  text: "The world is divided into two sharp poles:" },
  { bullet:    true,  text: "The Crimson Crown: This class is the rulers and the wealthy of the world. They are the architects of Stagnantia. They live in comfort and their only goal is entertainment. For them, life is just a control panel." },
  { bullet:    true,  text: "The Azure Core: The rest of society — the workforce and ordinary people. They are the cogs in the system created by the Crimson Crown. The Azure Core is always fighting, but this fighting never lifts them to the top." },
  { para:      true,  text: "Scientists have invented portals that pierce reality to entertain the bored masses. These portals bring beings from different times and dimensions — ancient knights, robots of the future, mythological monsters and wild beasts — to Stagnantia." },
  { para:      true,  text: "Huge, symmetrical arenas are built for battles. At one end stands a red tower representing The Crimson Crown, at the other a blue tower representing The Azure Core. In each battle, a player from The Crimson Crown kidnaps a person from The Azure Core for fun and forces him to fight in the arena." },
  { highlight: true,  text: "You are one of those kidnapped." },
  { para:      true,  text: "You are given digital cards. These cards are the only means to control the beings brought through the portals. You have only one goal:" },
  { highlight: true,  text: '"Destroy the opposing side\'s castle and be free."' },
  { para:      true,  text: "You win by strategically playing each card you are given, advancing your troops and defending the castle. This struggle, fought in the dust and at the cost of your life, promises you freedom." },
  { para:      true,  text: "But the reality is different from what you're told. Clash-A-Mana games are designed to last, not to end. Each victory leads you not to freedom, but to the next, more difficult battle. In Stagnantia, time has stopped. You are trapped in an endless cycle. Your heroism is just entertainment for The Crimson Crown." },
  { highlight: true,  text: "The only way to freedom is not to win the game — but to destroy the system itself." },
  { para:      true,  text: "But the portals keep opening. The cards keep being dealt." },
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
