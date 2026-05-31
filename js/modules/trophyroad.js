/* ═══════════════════════════════════════════════════════
   js/modules/trophyroad.js
   Trophy Road — vertical scroll, bottom→top, arena groups
═══════════════════════════════════════════════════════ */

let trInitialized = false;

const TR_ICONS = {
  'Gold':             '🪙',
  'Card Piece':       '🃏',
  'Ruby Piece':       '🔴',
  'Card Shard':       '✨',
  'Tower Gear Piece': '⚙️',
  'Dungeon Key':      '🗝️',
  'Mana Shard':       '⚡',
  'Power Up Piece':   '🔋',
  'Mundane Chest':    '📦',
  'Familiar Chest':   '🟢',
  'Arcane Chest':     '🔮',
  'Relic Chest':      '🟥',
};
function trIco(name) { return TR_ICONS[name] || '🎁'; }

const ARENAS = [
  { id:1,  name:'Arena 1',  subtitle:'Başlanğıc Meydanı', minTrophy:0,    maxTrophy:300,  color:'#6a78a8', glow:'rgba(106,120,168,0.45)' },
  { id:2,  name:'Arena 2',  subtitle:'Çöl Diyarı',        minTrophy:300,  maxTrophy:600,  color:'#4ade80', glow:'rgba(74,222,128,0.45)'  },
  { id:3,  name:'Arena 3',  subtitle:'Daş Qala',          minTrophy:600,  maxTrophy:900,  color:'#60a5fa', glow:'rgba(96,165,250,0.45)'  },
  { id:4,  name:'Arena 4',  subtitle:'Mis Dağları',       minTrophy:900,  maxTrophy:1200, color:'#fb923c', glow:'rgba(251,146,60,0.45)'  },
  { id:5,  name:'Arena 5',  subtitle:'Ruh Vadisi',        minTrophy:1200, maxTrophy:1500, color:'#a78bfa', glow:'rgba(167,139,250,0.45)' },
  { id:6,  name:'Arena 6',  subtitle:'Gümüş Zirvə',      minTrophy:1500, maxTrophy:1800, color:'#e8c95a', glow:'rgba(232,201,90,0.45)'  },
  { id:7,  name:'Arena 7',  subtitle:'Qara Bataqlıq',    minTrophy:1800, maxTrophy:2100, color:'#f472b6', glow:'rgba(244,114,182,0.45)' },
  { id:8,  name:'Arena 8',  subtitle:'İldırım Platosu',  minTrophy:2100, maxTrophy:2400, color:'#38bdf8', glow:'rgba(56,189,248,0.45)'  },
  { id:9,  name:'Arena 9',  subtitle:'Əjdaha Yuvası',    minTrophy:2400, maxTrophy:2700, color:'#f87171', glow:'rgba(248,113,113,0.45)' },
  { id:10, name:'Arena 10', subtitle:'Əfsanə Meydanı',   minTrophy:2700, maxTrophy:3000, color:'#facc15', glow:'rgba(250,204,21,0.55)'  },
];

/* All steps — in ascending order (will be reversed for rendering) */
const TROPHY_STEPS = [
  { trophy:50,   arena:1,  amount:15,  type:'Card Shard'       },
  { trophy:100,  arena:1,  amount:100, type:'Card Piece'        },
  { trophy:150,  arena:1,  amount:50,  type:'Gold'              },
  { trophy:200,  arena:1,  amount:10,  type:'Ruby Piece'        },
  { trophy:250,  arena:1,  amount:2,   type:'Tower Gear Piece'  },
  { trophy:300,  arena:1,  amount:1,   type:'Mundane Chest'     },
  { trophy:350,  arena:2,  amount:15,  type:'Card Shard'        },
  { trophy:400,  arena:2,  amount:100, type:'Card Piece'        },
  { trophy:450,  arena:2,  amount:50,  type:'Gold'              },
  { trophy:500,  arena:2,  amount:10,  type:'Ruby Piece'        },
  { trophy:550,  arena:2,  amount:2,   type:'Tower Gear Piece'  },
  { trophy:600,  arena:2,  amount:2,   type:'Mana Shard'        },
  { trophy:650,  arena:3,  amount:15,  type:'Card Shard'        },
  { trophy:700,  arena:3,  amount:150, type:'Card Piece'        },
  { trophy:750,  arena:3,  amount:75,  type:'Gold'              },
  { trophy:800,  arena:3,  amount:10,  type:'Ruby Piece'        },
  { trophy:850,  arena:3,  amount:4,   type:'Tower Gear Piece'  },
  { trophy:900,  arena:3,  amount:1,   type:'Mundane Chest'     },
  { trophy:950,  arena:4,  amount:15,  type:'Card Shard'        },
  { trophy:1000, arena:4,  amount:150, type:'Card Piece'        },
  { trophy:1050, arena:4,  amount:75,  type:'Gold'              },
  { trophy:1100, arena:4,  amount:10,  type:'Ruby Piece'        },
  { trophy:1150, arena:4,  amount:4,   type:'Tower Gear Piece'  },
  { trophy:1200, arena:4,  amount:3,   type:'Mana Shard'        },
  { trophy:1250, arena:5,  amount:40,  type:'Card Shard'        },
  { trophy:1300, arena:5,  amount:500, type:'Card Piece'        },
  { trophy:1350, arena:5,  amount:250, type:'Gold'              },
  { trophy:1400, arena:5,  amount:35,  type:'Ruby Piece'        },
  { trophy:1450, arena:5,  amount:8,   type:'Tower Gear Piece'  },
  { trophy:1500, arena:5,  amount:1,   type:'Familiar Chest'    },
  { trophy:1550, arena:6,  amount:20,  type:'Card Shard'        },
  { trophy:1600, arena:6,  amount:150, type:'Card Piece'        },
  { trophy:1650, arena:6,  amount:75,  type:'Gold'              },
  { trophy:1700, arena:6,  amount:20,  type:'Ruby Piece'        },
  { trophy:1750, arena:6,  amount:4,   type:'Tower Gear Piece'  },
  { trophy:1800, arena:6,  amount:1,   type:'Power Up Piece'    },
  { trophy:1850, arena:7,  amount:20,  type:'Card Shard'        },
  { trophy:1900, arena:7,  amount:150, type:'Card Piece'        },
  { trophy:1950, arena:7,  amount:75,  type:'Gold'              },
  { trophy:2000, arena:7,  amount:20,  type:'Ruby Piece'        },
  { trophy:2050, arena:7,  amount:4,   type:'Tower Gear Piece'  },
  { trophy:2100, arena:7,  amount:3,   type:'Mana Shard'        },
  { trophy:2150, arena:8,  amount:20,  type:'Card Shard'        },
  { trophy:2200, arena:8,  amount:150, type:'Card Piece'        },
  { trophy:2250, arena:8,  amount:75,  type:'Gold'              },
  { trophy:2300, arena:8,  amount:20,  type:'Ruby Piece'        },
  { trophy:2350, arena:8,  amount:4,   type:'Tower Gear Piece'  },
  { trophy:2400, arena:8,  amount:1,   type:'Power Up Piece'    },
  { trophy:2450, arena:9,  amount:20,  type:'Card Shard'        },
  { trophy:2500, arena:9,  amount:150, type:'Card Piece'        },
  { trophy:2550, arena:9,  amount:75,  type:'Gold'              },
  { trophy:2600, arena:9,  amount:20,  type:'Ruby Piece'        },
  { trophy:2650, arena:9,  amount:4,   type:'Tower Gear Piece'  },
  { trophy:2700, arena:9,  amount:2,   type:'Mana Shard'        },
  { trophy:2750, arena:10, amount:20,  type:'Card Shard'        },
  { trophy:2800, arena:10, amount:400, type:'Card Piece'        },
  { trophy:2850, arena:10, amount:200, type:'Gold'              },
  { trophy:2900, arena:10, amount:20,  type:'Ruby Piece'        },
  { trophy:2950, arena:10, amount:4,   type:'Tower Gear Piece'  },
  { trophy:3000, arena:10, amount:1,   type:'Power Up Piece'    },
];

let playerTrophies = 0;
let claimedSteps   = new Set();

/* ════════════════════════════════ INIT ════════════════ */
function initTrophyRoad() {
  if (trInitialized) return;
  trInitialized = true;
  buildTRUI();
  bindTREvents();
  renderTR();
  /* scroll to bottom on open */
  setTimeout(() => {
    const track = document.getElementById('tr-track');
    if (track) track.scrollTop = track.scrollHeight;
  }, 50);
}

/* ════════════════════════════════ BUILD SHELL ═════════ */
function buildTRUI() {
  const sec = document.getElementById('trophyroad-section');
  sec.innerHTML = `
    <div class="tr-topbar">
      <div class="tr-topbar__left">
        <p class="section-eyebrow" style="margin:0">Arenalar</p>
        <h2 class="tr-hero__title">🏆 Trophy Road</h2>
      </div>
      <div class="tr-topbar__right">
        <div class="tr-trophy-input">
          <input type="number" id="tr-input" class="tr-input" value="0" min="0" max="3000" step="50" placeholder="Kupa..." />
          <button class="tr-set-btn" id="tr-set-btn">Tətbiq et</button>
        </div>
        <div class="tr-progress-bar">
          <div class="tr-progress-fill" id="tr-progress-fill"></div>
          <span class="tr-progress-label" id="tr-progress-label">0 / 3000 🏆</span>
        </div>
      </div>
    </div>

    <div class="tr-track" id="tr-track">
      <div class="tr-track-inner" id="tr-track-inner"></div>
    </div>
  `;
}

/* ════════════════════════════════ EVENTS ══════════════ */
function bindTREvents() {
  document.getElementById('tr-set-btn').addEventListener('click', applyTrophies);
  document.getElementById('tr-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') applyTrophies();
  });
}

function applyTrophies() {
  const val = parseInt(document.getElementById('tr-input').value) || 0;
  playerTrophies = Math.max(0, Math.min(3000, val));
  document.getElementById('tr-input').value = playerTrophies;
  renderTR();
}

/* ════════════════════════════════ RENDER ══════════════ */
function renderTR() {
  /* progress bar */
  const pct = (playerTrophies / 3000) * 100;
  document.getElementById('tr-progress-fill').style.width = pct + '%';
  document.getElementById('tr-progress-label').textContent = `${playerTrophies} / 3000 🏆`;

  const inner = document.getElementById('tr-track-inner');
  inner.innerHTML = '';

  /*
    Arenas are rendered in REVERSE order (10→1) so that scrolling to the
    bottom reveals Arena 1 first. No column-reverse CSS needed.
  */

  [...ARENAS].reverse().forEach(arena => {
    const steps = TROPHY_STEPS.filter(s => s.arena === arena.id).reverse();
    const isUnlocked  = playerTrophies >= arena.minTrophy;
    const isCompleted = playerTrophies >= arena.maxTrophy;

    /* ── Arena banner (appears at TOP of its group = bottom visually) ── */
    const banner = document.createElement('div');
    banner.className = `tr-arena-banner${isUnlocked ? ' tr--unlocked' : ''}${isCompleted ? ' tr--completed' : ''}`;
    banner.style.setProperty('--ac', arena.color);
    banner.style.setProperty('--ag', arena.glow);
    banner.innerHTML = `
      <div class="tr-ab-line"></div>
      <div class="tr-ab-pill">
        <span class="tr-ab-icon">${isCompleted ? '✅' : isUnlocked ? '⚔️' : '🔒'}</span>
        <span class="tr-ab-name">${arena.name}</span>
        <span class="tr-ab-sub">${arena.subtitle}</span>
        <span class="tr-ab-range">${arena.minTrophy} – ${arena.maxTrophy} 🏆</span>
      </div>
      <div class="tr-ab-line"></div>
    `;

    /* ── Step rows ── */
    const stepsWrap = document.createElement('div');
    stepsWrap.className = 'tr-steps-group';
    stepsWrap.style.setProperty('--ac', arena.color);
    stepsWrap.style.setProperty('--ag', arena.glow);

    steps.forEach(step => {
      const unlocked = playerTrophies >= step.trophy;
      const claimed  = claimedSteps.has(step.trophy);
      const canClaim = unlocked && !claimed;

      let btnHTML = '';
      if (claimed) {
        btnHTML = `<button class="tr-claim-btn tr-claimed" disabled data-trophy="${step.trophy}">✓ Götürüldü</button>`;
      } else if (canClaim) {
        btnHTML = `<button class="tr-claim-btn tr-claimable" data-trophy="${step.trophy}">Götür</button>`;
      } else {
        btnHTML = `<div class="tr-lock-icon">🔒</div>`;
      }

      const row = document.createElement('div');
      row.className = `tr-row${unlocked ? ' tr-row--unlocked' : ''}${claimed ? ' tr-row--claimed' : ''}`;

      row.innerHTML = `
        <div class="tr-row__left">
          <div class="tr-milestone">
            <div class="tr-milestone__dot"></div>
            <div class="tr-milestone__trophy">🏆 ${step.trophy}</div>
          </div>
        </div>
        <div class="tr-row__line-col">
          <div class="tr-vline"></div>
          <div class="tr-node">${trIco(step.type)}</div>
          <div class="tr-vline"></div>
        </div>
        <div class="tr-row__right">
          <div class="tr-reward">
            <span class="tr-reward__ico">${trIco(step.type)}</span>
            <span class="tr-reward__text">${step.amount}× ${step.type}</span>
            ${btnHTML}
          </div>
        </div>
      `;
      stepsWrap.appendChild(row);
    });

    inner.appendChild(stepsWrap);
    inner.appendChild(banner);
  });

  /* claim events */
  inner.querySelectorAll('.tr-claim-btn.tr-claimable').forEach(btn => {
    btn.addEventListener('click', () => {
      const trophy = parseInt(btn.dataset.trophy);
      claimedSteps.add(trophy);
      btn.textContent = '✓ Götürüldü';
      btn.className = 'tr-claim-btn tr-claimed';
      btn.disabled = true;
      const row = btn.closest('.tr-row');
      if (row) row.classList.add('tr-row--claimed');
    });
  });
}
