/* Run: node tests/card-modal.browser.cjs (Playwright + Chromium required).
   Serves the real app on an ephemeral localhost port; external artwork is stubbed. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const server = http.createServer(async (req, res) => {
  try {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\/$/, '/index.html'));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const body = await fs.readFile(file);
    res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream'}).end(body);
  } catch { res.writeHead(404).end(); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless:true, args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:1600,height:1000}, reducedMotion:'reduce'});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname === '127.0.0.1') return route.continue();
      if (url.hostname.endsWith('.r2.dev')) {
        if (url.pathname.includes('missing-art')) return route.fulfill({status:404, body:''});
        return route.fulfill({contentType:'image/svg+xml', body:'<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1600"><rect width="900" height="1600" fill="#25425b"/><rect x="4" y="4" width="892" height="1592" fill="none" stroke="gold" stroke-width="8"/></svg>'});
      }
      return route.abort();
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(async () => { showPortal('cards'); await initCards(); });
    assert.equal(await page.locator('#cards-grid .card-item').count(), 138);
    assert.doesNotMatch(await page.locator('#cards-grid').textContent(), /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u);
    await page.locator('#cards-grid .card-item').filter({has:page.getByText('Nitrox', {exact:true})}).click();
    assert.equal(await page.locator('#modal-overlay').getAttribute('aria-hidden'), 'false');
    assert.equal(await page.locator('#modal-content .modal-rarity-badge').count(), 0);
    assert.equal(await page.locator('#modal-content .modal-story-box').count(), 0);
    assert.equal(await page.locator('#stat-page-1 [data-stat]').count(), 14);
    assert.equal(await page.locator('#modal-content .stat-bar-track').count(), 0);
    const pair = await page.locator('#stat-page-1').evaluate(el => {
      const a=el.querySelector('[data-stat="health"]').getBoundingClientRect(), b=el.querySelector('[data-stat="shield"]').getBoundingClientRect();
      return a.top === b.top && a.left < b.left;
    });
    assert.ok(pair, 'Health and Shield share a row');
    await page.locator('[data-stat-page="2"]').click();
    assert.equal(await page.locator('#stat-page-2 [data-stat]').count(), 10);
    assert.ok(await page.locator('#stat-page-2 [data-stat="dodge"]').isVisible());
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[data-stat-page="3"]').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#stat-page-3 [data-profile]').count(), 13);
    await page.keyboard.press('End');
    assert.equal(await page.locator('[data-stat-page="3"]').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await page.locator('[data-stat-page="1"]').getAttribute('aria-selected'), 'true');
    const header = await page.locator('.modal-name-class-row').evaluate(el => {
      const name=el.querySelector('.modal-card-name').getBoundingClientRect();
      return [...el.querySelectorAll('.modal-class-badge,.modal-subclass-badge')].every(b=>{
        const r=b.getBoundingClientRect(); return r.left>=name.right && r.top<name.bottom;
      });
    });
    assert.ok(header, 'class and subclass sit beside the card name');
    assert.ok(await page.locator('#modal-img-col').evaluate(el=>el.contains(document.getElementById('modal-identity'))), 'identity lives on the artwork');
    assert.equal(await page.locator('#modal-content .modal-card-name').count(), 0);
    assert.ok(await page.locator('#modal-identity').evaluate(el=>{ const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect(); return a.top>=b.top && a.bottom<=b.bottom; }), 'identity is inside the portrait');
    assert.ok(await page.locator('.modal-card-body').evaluate(el=>el.querySelector('.modal-side-nav').getBoundingClientRect().left >= el.querySelector('.modal-section-panels').getBoundingClientRect().right), 'section buttons sit on the right');
    assert.deepEqual(await page.locator('[data-card-section]').allTextContents(), ['Stats','Ability','Star Levels','Lore']);
    await page.locator('#modal-artwork-open').click();
    assert.equal(await page.locator('#artwork-overlay').getAttribute('aria-hidden'), 'false');
    assert.equal(await page.locator('#artwork-image').evaluate(el=>getComputedStyle(el).objectFit), 'contain');
    assert.equal(await page.locator('#modal-overlay').evaluate(el=>el.inert), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#artwork-overlay').getAttribute('aria-hidden'), 'true');
    assert.equal(await page.locator('#modal-overlay').getAttribute('aria-hidden'), 'false');
    assert.ok(await page.locator('#modal-artwork-open').evaluate(el=>el===document.activeElement));
    await page.locator('[data-card-section="ability"]').click();
    assert.ok(await page.locator('#card-section-ability .modal-trait-box').isVisible());
    assert.equal(await page.locator('#card-section-stats').isVisible(), false);
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('#card-section-levels .star-level-row').count(), 3);
    assert.ok(await page.locator('#card-section-levels').isVisible());
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.locator('#card-section-lore .modal-lore-copy').isVisible());
    assert.ok((await page.locator('#card-section-lore').textContent()).length > 100);
    await page.locator('[data-card-section="stats"]').click();
    await page.keyboard.press('Tab');
    assert.ok(await page.locator('#modal-close').evaluate(el=>el===document.activeElement));
    await page.keyboard.press('Shift+Tab');
    assert.ok(await page.locator('[data-card-section="stats"]').evaluate(el=>el===document.activeElement));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#modal-overlay').getAttribute('aria-hidden'), 'true');

    assert.ok(await page.locator('#cards-grid .card-item').filter({has:page.getByText('Nitrox', {exact:true})}).evaluate(el=>el===document.activeElement));
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#modal-overlay').getAttribute('aria-hidden'), 'false');
    await page.keyboard.press('Escape');

    // Exercise every real card/form without replacing production render functions.
    const rendered = await page.evaluate(() => {
      const rarities = new Map(); let forms = 0;
      function check(card, root) {
        renderModalContent(card, root, null, null);
        if (document.querySelectorAll('[data-stat]').length !== 24) throw Error(`${card.name}: missing stats`);
        if (document.querySelectorAll('[data-profile]').length !== 13) throw Error(`${card.name}: missing combat profile`);
        if (/\p{Extended_Pictographic}|\p{Emoji_Presentation}/u.test(document.querySelector('.modal-frame').textContent)) throw Error(`${card.name}: emoji in modal`);
        forms++;
        for (const form of card.forms || []) check(form, root);
        for (const prop of ['type1','type2','upgradedsecondForm']) if (card[prop]) check(card[prop], root);
      }
      for (const card of allCards) {
        openModal(card);
        const box=document.getElementById('modal-box');
        if (box.dataset.rarity !== card.rarity.toLowerCase()) throw Error(`${card.name}: wrong rarity`);
        rarities.set(card.rarity, getComputedStyle(box).borderColor);
        check(card,card);
        closeModal();
      }
      return {forms,rarities:[...rarities]};
    });
    assert.equal(rendered.forms, 192);
    assert.equal(new Set(rendered.rarities.map(x => x[1])).size, 8);

    await page.evaluate(()=>openModal(allCards.find(c=>c.id==='henry')));
    await page.locator('[data-stat-page="3"]').click();
    assert.equal(await page.locator('[data-profile="attackWidth"] strong').textContent(),'1.2 tiles');
    assert.equal(await page.locator('[data-profile="attackDistance"] strong').textContent(),'1.25 tiles');
    assert.equal(await page.locator('[data-profile="range"]').count(),0);
    await page.locator('[data-stat-page="1"]').click();
    assert.equal(await page.locator('[data-stat="range"] .modal-stat-value').textContent(),'1.2 tiles');
    assert.equal(await page.locator('[data-stat="speed"] .modal-stat-value').textContent(),'0.8 tiles/s');
    await page.evaluate(()=>openModal(allCards.find(c=>c.id==='fen')));
    await page.locator('[data-stat-page="3"]').click();
    assert.equal(await page.locator('[data-profile="attackWidth"] strong').textContent(),'1 tile');
    assert.equal(await page.locator('[data-profile="attackDistance"] strong').textContent(),'3.6 tiles');
    assert.equal(await page.locator('[data-profile="attackShape"] strong').textContent(),'Cone');
    await page.evaluate(()=>openModal(allCards.find(c=>c.id==='bethe')));
    await page.locator('[data-stat-page="3"]').click();
    assert.equal(await page.locator('[data-profile="attackAngle"] strong').textContent(),'75°');
    assert.equal(await page.locator('[data-profile="weight"] strong').textContent(),'Medium');
    await page.evaluate(()=>openModal(allCards.find(c=>c.id==='arcanyx')));
    await page.locator('[data-stat-page="3"]').click();
    assert.equal(await page.locator('[data-profile="attackDistance"] strong').textContent(),'2.1 tiles');
    assert.equal(await page.locator('[data-profile="projectileEndEffect"] strong').textContent(),'Explodes');
    for (const id of ['cryon','tornado','astranova','whisper','fallen-angel','void-wraith']) {
      await page.evaluate(id=>openModal(allCards.find(c=>c.id===id)),id);
      await page.locator('[data-stat-page="3"]').click();
      assert.equal(await page.locator('[data-profile="movementType"] strong').textContent(),'Hovering');
      assert.equal(await page.locator('[data-profile="groundEffectImmune"] strong').textContent(),'Yes');
      const englishUI=await page.locator('#stat-page-3').evaluate(el=>{
        const copy=el.cloneNode(true); copy.querySelectorAll('[lang="az"]').forEach(n=>n.remove()); return copy.textContent;
      });
      assert.doesNotMatch(englishUI,/[ƏəıİşŞçÇğĞüÜöÖ]/);
    }
    await page.evaluate(()=>openModal(allCards.find(c=>c.id==='sylviana')));
    await page.locator('[data-form-index="0"]').click();
    await page.locator('[data-stat-page="3"]').click();
    assert.equal(await page.locator('[data-profile="movementType"] strong').textContent(),'Flying');
    assert.equal(await page.locator('[data-profile="type"] strong').textContent(),'Animal');
    await page.evaluate(()=>openModal(allCards.find(c=>c.id==='nitrox')));
    await page.locator('[data-card-section="ability"]').click();
    assert.equal(await page.locator('#card-section-ability .modal-trait-box').getAttribute('lang'),'az');
    assert.equal(await page.locator('#card-section-ability .modal-trait-box').innerHTML(),await page.evaluate(()=>allCards.find(c=>c.id==='nitrox').trait));

    await page.evaluate(() => openModal(allCards.find(c=>c.id==='king')));
    await page.locator('#dual-pick-2').click();
    await page.locator('[data-stat-page="3"]').click();
    await page.locator('[data-form-index="0"]').click();
    assert.match(await page.locator('.modal-card-name').textContent(), /Guard/);
    assert.equal(await page.locator('#modal-box').getAttribute('data-rarity'), 'ethereal');
    assert.equal(await page.locator('[data-stat-page="3"]').getAttribute('aria-selected'), 'true');
    await page.locator('#origin-back').click();
    assert.equal(await page.locator('#dual-pick-1').count(), 1);
    await page.evaluate(() => openModal(allCards.find(c=>c.id==='freak')));
    await page.locator('[data-form-index="0"]').click();
    assert.match(await page.locator('.modal-card-name').textContent(), /Mini Freaks/);
    await page.locator('[data-stat-page="3"]').click();
    assert.equal(await page.locator('[data-profile="attackWidth"] strong').textContent(),'0.5 tiles');
    assert.equal(await page.locator('[data-profile="weight"] strong').textContent(),'Heavy');
    await page.evaluate(() => openModal(allCards.find(c=>c.id==='avara')));
    await page.locator('[data-stat-page="3"]').click();
    await page.locator('#ascended-toggle').click();
    assert.match(await page.locator('.ascended-banner-title').textContent(), /Ascended Form/);
    assert.equal(await page.locator('#modal-box').getAttribute('data-rarity'), 'ascendant');
    await page.locator('#ascended-toggle').click();
    await page.evaluate(() => openModal(allCards.find(c=>c.id==='xii-josh')));
    await page.locator('[data-card-section="ability"]').click();
    const turns=page.locator('.emergent-trait-btn');
    if (await turns.count() > 1) {
      await turns.last().click();
      assert.ok(await page.locator('#emergent-trait-text').textContent());
    }

    for (const [width,height] of [[1600,1000],[1024,768],[768,1024],[390,844],[320,568],[844,390]]) {
      await page.setViewportSize({width,height});
      await page.evaluate(() => openModal(allCards.find(c=>c.id==='nitrox')));
      await page.waitForFunction(() => document.getElementById('modal-img').naturalWidth > 0);
      assert.equal(await page.locator('#modal-img').evaluate(el=>getComputedStyle(el).objectFit), 'cover');
      assert.equal(await page.locator('#modal-img').evaluate(el=>getComputedStyle(el).transform), 'none');
      for (let n=1;n<=3;n++) {
        await page.locator(`[data-stat-page="${n}"]`).click();
        const box = await page.locator('#modal-box').evaluate(el => ({w:el.clientWidth, scroll:el.scrollWidth, h:el.clientHeight}));
        assert.ok(box.scroll <= box.w + 1, `${width}x${height}: page ${n} overflows`);
        assert.ok(box.h < height, `${width}x${height}: modal is taller than viewport`);
      }
      for (const section of ['ability','levels','lore','stats']) {
        await page.locator(`[data-card-section="${section}"]`).click();
        assert.ok(await page.locator(`#card-section-${section}`).isVisible());
      }
      await page.locator('[data-card-section="lore"]').click();
      const closeBefore=await page.locator('#modal-close').boundingBox();
      await page.locator('#modal-box').evaluate(el=>el.scrollTop=el.scrollHeight);
      const closeAfter=await page.locator('#modal-close').boundingBox();
      assert.equal(closeAfter.y,closeBefore.y, 'close button stays on the frame while scrolling');
      assert.ok(closeAfter.y>=0 && closeAfter.y+closeAfter.height<height);
      await page.locator('#modal-close').click();
    }
    await page.setViewportSize({width:320,height:568});
    const mobileForms = await page.evaluate(() => {
      let count=0;
      function check(card, root) {
        renderModalContent(card,root,null,null);
        for (const tab of document.querySelectorAll('[data-stat-page]')) {
          tab.click();
          const box=document.getElementById('modal-box');
          if (box.scrollWidth > box.clientWidth + 1) throw Error(`${card.name}: mobile overflow`);
        }
        count++;
        for (const form of card.forms || []) check(form,root);
        for (const prop of ['type1','type2','upgradedsecondForm']) if (card[prop]) check(card[prop],root);
      }
      modal.inert=false; modal.classList.add('open');
      for (const card of allCards) check(card,card);
      closeModal();
      return count;
    });
    assert.equal(mobileForms,192);
    await page.evaluate(() => openModal({id:'missing-art',name:'Missing art',rarity:'Apex',stats:{health:0},additionalStats:{}}));
    await page.waitForFunction(() => document.getElementById('modal-placeholder').style.display === 'flex');
    assert.equal(await page.locator('#modal-img').isVisible(), false);
    assert.equal(await page.locator('#modal-artwork-open').isVisible(), false);
    assert.doesNotMatch(await page.locator('.modal-frame').textContent(), /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u);
    assert.match(await page.locator('[data-stat="health"] .modal-stat-value').textContent(), /0/);
    await page.evaluate(async () => { closeModal(); switchSection('spells'); await initSpells(); });
    await page.locator('#spells-grid .spell-item').filter({has:page.getByText('Meteor', {exact:true})}).click();
    assert.equal(await page.locator('#modal-overlay').getAttribute('aria-hidden'), 'false');
    assert.equal(await page.locator('#modal-overlay').evaluate(el=>el.inert), false);
    assert.equal(await page.locator('#modal-box').getAttribute('data-rarity'), 'mundane');
    const spellViews = await page.evaluate(() => {
      let count=0;
      for (const spell of allSpells) {
        for (const index of [-1, ...(spell.forms || []).map((_,i)=>i)]) {
          renderSpellModal(spell,index);
          if (/\p{Extended_Pictographic}|\p{Emoji_Presentation}/u.test(document.querySelector('.modal-frame').textContent)) throw Error(`${spell.name}: emoji in spell modal`);
          count++;
        }
      }
      return count;
    });
    assert.ok(spellViews>0);
    if (await page.locator('.modal-lore-button').count()) {
      await page.locator('.modal-lore-button').click();
      assert.equal(await page.locator('#lore-fullscreen-overlay').getAttribute('aria-hidden'), 'false');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#lore-fullscreen-overlay').getAttribute('aria-hidden'), 'true');
    }
    await page.locator('#modal-close').click();
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(()=>openModal(allCards.find(c=>c.id==='nitrox')));
    const orbitBefore=await page.locator('.modal-frame').evaluate(el=>getComputedStyle(el,'::before').getPropertyValue('--modal-orbit'));
    await page.waitForTimeout(150);
    const orbitAfter=await page.locator('.modal-frame').evaluate(el=>getComputedStyle(el,'::before').getPropertyValue('--modal-orbit'));
    assert.notEqual(orbitBefore,orbitAfter, 'rarity light travels around the frame');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.modal-frame').evaluate(el=>getComputedStyle(el,'::before').animationName), 'none');
    await page.locator('#modal-close').click();
    await page.evaluate(async () => {switchSection('survival'); await initSurvival(); survivalVisible=true; startSurvivalRun('soldier'); });
    assert.equal(await page.evaluate(()=>typeof survivalTraitsInit), 'function');
    assert.deepEqual(errors, []);
    console.log(`Browser checks passed: 138 cards, ${rendered.forms} forms, 8 rarity glows, 6 viewport sizes, Lore, tabs, form switches, spells and Survival.`);
  } finally { await browser.close(); }
})().catch(err=>{console.error(err);process.exitCode=1;}).finally(()=>server.close());
