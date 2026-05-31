/* ═══════════════════════════════════════════════════════
   js/modules/info.js
   Codex / Info section – fetch and render entries + factions
═══════════════════════════════════════════════════════ */

let infoData   = null;
let groupsData = null;

/* ── Entry point ── */
async function initInfo() {
  const nav     = document.getElementById('codex-nav');
  const content = document.getElementById('codex-content');

  /* Already initialised – skip */
  if (nav.children.length > 0) return;

  try {
    const [infoRes, groupRes] = await Promise.all([
      fetch('data/info.json'),
      fetch('data/groups.json'),
    ]);
    infoData   = await infoRes.json();
    groupsData = await groupRes.json();
  } catch (e) {
    console.error('Codex load error:', e);
    content.innerHTML = '<p style="color:var(--muted);padding:40px">Could not load codex data.</p>';
    return;
  }

  const entries = infoData.sections || [];

  /* ── Build nav buttons ── */
  entries.forEach((sec, i) => {
    const btn = document.createElement('button');
    btn.className   = 'codex-nav-btn' + (i === 0 ? ' active' : '');
    btn.textContent = sec.heading;
    btn.onclick     = () => activateCodexEntry(btn, i);
    nav.appendChild(btn);
  });

  /* Factions nav button */
  const grpBtn = document.createElement('button');
  grpBtn.className   = 'codex-nav-btn';
  grpBtn.textContent = 'Factions';
  grpBtn.onclick     = () => activateCodexEntry(grpBtn, 'groups');
  nav.appendChild(grpBtn);

  /* ── Build content entries ── */
  content.innerHTML = '';

  entries.forEach((sec, i) => {
    const div = document.createElement('div');
    div.className  = 'codex-entry' + (i === 0 ? ' visible' : '');
    div.dataset.idx = i;

    const listHTML = (sec.list || []).map(item => {
      const parts = item.split(' - ');
      return parts.length > 1
        ? `<li class="codex-list-item"><strong>${parts[0]}</strong><span>${parts.slice(1).join(' - ')}</span></li>`
        : `<li class="codex-list-item"><span>${item}</span></li>`;
    }).join('');

    div.innerHTML = `
      <h3 class="codex-heading">${sec.heading}</h3>
      <p class="codex-para">${sec.content}</p>
      ${listHTML ? `<ul class="codex-list">${listHTML}</ul>` : ''}
    `;
    content.appendChild(div);
  });

  /* Factions entry */
  const grpDiv = document.createElement('div');
  grpDiv.className   = 'codex-entry';
  grpDiv.dataset.idx = 'groups';
  grpDiv.innerHTML   = `
    <h3 class="codex-heading">Factions &amp; Groups</h3>
    <p class="codex-para">
      The entities of Stagnantia are organised into factions, each with unique lore and combat roles.
    </p>
    <div class="groups-grid">
      ${(groupsData || []).map(g => `
        <div class="group-card" style="border-top:2px solid ${g.color || 'var(--accent)'}">
          <div class="group-icon">
            <i class="fa-solid ${g.icon || 'fa-shield'}" style="color:${g.color || 'var(--accent)'}"></i>
          </div>
          <div class="group-name" style="color:${g.color || 'var(--accent)'}">${g.name}</div>
          <p class="group-desc">${g.description}</p>
          <div class="group-members">
            ${(g.members || []).map(m => `<span class="member-tag">${m}</span>`).join('')}
          </div>
        </div>`).join('')}
    </div>
  `;
  content.appendChild(grpDiv);
}

/* ── Switch visible codex entry ── */
function activateCodexEntry(activeBtn, idx) {
  document.querySelectorAll('.codex-nav-btn').forEach(b => b.classList.remove('active'));
  activeBtn.classList.add('active');

  document.querySelectorAll('.codex-entry').forEach(e => e.classList.remove('visible'));
  document.querySelector(`.codex-entry[data-idx="${idx}"]`)?.classList.add('visible');
}
