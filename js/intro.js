// ─────────────────────────────────────────────
// INTRO SEQUENCE
// ─────────────────────────────────────────────

const INTRO_TEXT = [
  { head: true,  text: "Stagnantia: The Story of the Infinite Cycle" },
  { head: false, text: "The year is 2467. Humanity has reached the pinnacle of technological development, but is spiritually exhausted. Diseases have been cured, resource problems have been solved. However, this perfection has brought a great misfortune — a period of stagnation in Stagnantia. People no longer enjoy anything, they do not create anything new. To eliminate this mass boredom, a ruthless project is launched: Clash-A-Mana." },
  { head: false, text: "The world is divided into two sharp poles:" },
  { bullet: true, text: "The Crimson Crown: This class is the rulers and the wealthy of the world. They are the architects of Stagnantia. They live in comfort and their only goal is entertainment. For them, life is just a control panel." },
  { bullet: true, text: "The Azure Core: The rest of society — the workforce and ordinary people. They are the cogs in the system created by the Crimson Crown. The Azure Core is always fighting, but this fighting never lifts them to the top." },
  { head: false, text: "Scientists have invented portals that pierce reality to entertain the bored masses. These portals bring beings from different times and dimensions — ancient knights, robots of the future, mythological monsters and wild beasts — to Stagnantia." },
  { head: false, text: "Huge, symmetrical arenas are built for battles. At one end stands a red tower representing The Crimson Crown, at the other a blue tower representing The Azure Core. In each battle, a player from The Crimson Crown kidnaps a person from The Azure Core for fun and forces him to fight in the arena." },
  { highlight: true, text: "You are one of those kidnapped." },
  { head: false, text: "You are given digital cards. These cards are the only means to control the beings brought through the portals. You have only one goal:" },
  { highlight: true, text: "\"Destroy the opposing side's castle and be free.\"" },
  { head: false, text: "You win by strategically playing each card you are given, advancing your troops and defending the castle. This struggle, fought in the dust and at the cost of your life, promises you freedom." },
  { head: false, text: "But the reality is different from what you're told. Clash-A-Mana games are designed to last, not to end. Each victory leads you not to freedom, but to the next, more difficult battle. In Stagnantia, time has stopped. You are trapped in an endless cycle. Your heroism is just entertainment for The Crimson Crown." },
  { highlight: true, text: "The only way to freedom is not to win the game — but to destroy the system itself." },
  { head: false, text: "But the portals keep opening. The cards keep being dealt." },
];

// Düz mətn uzunluğu (proqres üçün)
const FULL_TEXT_LENGTH = INTRO_TEXT.reduce((a, b) => a + b.text.length, 0);

const overlay      = document.getElementById('intro-overlay');
const introTextEl  = document.getElementById('intro-text');
const skipBtn      = document.getElementById('intro-skip-btn');
const progressBar  = document.getElementById('intro-progress-bar');
const mainContent  = document.getElementById('main-content');

let charCount    = 0;
let stopped      = false;
let rafId        = null;

// ── Mətn bloku yarat ──────────────────────────────────────────────────────────
function createBlock(segment) {
    const el = document.createElement('p');
    if (segment.head)      el.className = 'intro-head';
    else if (segment.bullet)    el.className = 'intro-bullet';
    else if (segment.highlight) el.className = 'intro-highlight';
    else                        el.className = 'intro-para';
    if (segment.bullet) el.setAttribute('data-bullet', '▸');
    return el;
}

// ── Typewriter ────────────────────────────────────────────────────────────────
async function runTypewriter() {
    for (let si = 0; si < INTRO_TEXT.length; si++) {
        if (stopped) return;
        const seg = INTRO_TEXT[si];
        const block = createBlock(seg);
        introTextEl.appendChild(block);

        for (let ci = 0; ci < seg.text.length; ci++) {
            if (stopped) return;
            block.textContent += seg.text[ci];
            charCount++;
            progressBar.style.width = (charCount / FULL_TEXT_LENGTH * 100) + '%';

            // Scroll et
            block.scrollIntoView({ behavior: 'smooth', block: 'end' });

            // Sürət: başlıq daha yavaş, nöqtə/vergüldən sonra fasilə
            const ch = seg.text[ci];
            let delay = seg.head ? 38 : 18;
            if (ch === '.' || ch === '!' || ch === '?') delay = 260;
            else if (ch === ',' || ch === ';' || ch === ':') delay = 120;
            else if (ch === ' ') delay = 8;

            await sleep(delay);
        }

        // Bloklar arası boşluq
        await sleep(seg.head ? 500 : 200);
    }

    // Bitdikdən sonra 2.5s gözlə
    await sleep(2500);
    endIntro();
}

function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

// ── İntro bitir ───────────────────────────────────────────────────────────────
function endIntro() {
    if (stopped) return;
    stopped = true;
    overlay.classList.add('intro-fade-out');
    overlay.addEventListener('animationend', () => {
        overlay.remove();
        mainContent.style.display = '';
    }, { once: true });
}

// ── Skip düyməsi ──────────────────────────────────────────────────────────────
skipBtn.addEventListener('click', () => {
    stopped = true;
    overlay.classList.add('intro-fade-out');
    overlay.addEventListener('animationend', () => {
        overlay.remove();
        mainContent.style.display = '';
    }, { once: true });
});

// ── Başlat ────────────────────────────────────────────────────────────────────
runTypewriter();
