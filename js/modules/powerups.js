/* ═══════════════════════════════════════════════════════
   js/modules/powerups.js
   Power Up section – fetch and render the Power Up table
═══════════════════════════════════════════════════════ */

let powerUpsData = null;

const LEVEL_LABELS = ['1-ci Səviyyə', '2-ci Səviyyə', '3-cü Səviyyə', '4-cü Səviyyə'];

/* ── Entry point ── */
async function initPowerUps() {
  const wrap = document.getElementById('powerups-table-wrap');

  /* Already initialised – skip */
  if (wrap.children.length > 0) return;

  try {
    const res = await fetch('data/powerups.json');
    powerUpsData = await res.json();
  } catch (e) {
    console.error('Power Up load error:', e);
    wrap.innerHTML = '<p style="color:var(--muted);padding:40px">Power Up məlumatları yüklənə bilmədi.</p>';
    return;
  }

  renderPowerUpsTable(powerUpsData);
}

/* ── Render table + mobile cards ── */
function renderPowerUpsTable(data) {
  const wrap = document.getElementById('powerups-table-wrap');

  const headCols = LEVEL_LABELS.map(l => `<th>${l}</th>`).join('');

  const rows = data.map(pu => {
    const cells = pu.levels.map((txt, i) =>
      `<td><span class="pu-level-tag">Lv.${i + 1}</span><span class="pu-cell-text">${txt}</span></td>`
    ).join('');

    return `
      <tr class="pu-row">
        <td class="pu-num">${pu.id}</td>
        <td class="pu-name">
          <span class="pu-name-icon"><i class="${pu.icon || 'fa-solid fa-bolt'}"></i></span>
          <span>${pu.name}</span>
        </td>
        ${cells}
        <td class="pu-capacity">${pu.capacity}</td>
      </tr>`;
  }).join('');

  /* Mobile card view */
  const cards = data.map(pu => `
    <div class="pu-card">
      <div class="pu-card-head">
        <span class="pu-card-num">№${pu.id}</span>
        <span class="pu-name-icon"><i class="${pu.icon || 'fa-solid fa-bolt'}"></i></span>
        <span class="pu-card-name">${pu.name}</span>
        <span class="pu-card-capacity">Tutum: ${pu.capacity}</span>
      </div>
      <div class="pu-card-levels">
        ${pu.levels.map((txt, i) => `
          <div class="pu-card-level">
            <span class="pu-level-tag">${LEVEL_LABELS[i]}</span>
            <p>${txt}</p>
          </div>`).join('')}
      </div>
    </div>`).join('');

  wrap.innerHTML = `
    <div class="pu-table-scroll">
      <table class="pu-table">
        <thead>
          <tr>
            <th>№</th>
            <th>Ad</th>
            ${headCols}
            <th>Tutum</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="pu-cards">${cards}</div>
  `;
}
