/* Real standalone Arena browser checks. Requires Playwright and Chromium.
   Run: node tests/arena.browser.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const prefix = '/project/';
const mime = {'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const requests = [];
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    requests.push(url.pathname);
    if (!url.pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
    const relative = decodeURIComponent(url.pathname.slice(prefix.length)).replace(/\/$/, '/index.html');
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const body=await fs.readFile(file);
    res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream'}).end(body);
  } catch { res.writeHead(404).end(); }
});

async function clientPoint(page, point) {
  return page.evaluate(({x,y}) => {
    const app=window.arenaApp, canvas=document.getElementById('arena-canvas');
    const b=canvas.getBoundingClientRect();
    const a=app.renderer.worldAt(b.left,b.top);
    const u=app.renderer.worldAt(b.right,b.top);
    const v=app.renderer.worldAt(b.left,b.bottom);
    const ax=u.x-a.x,ay=u.y-a.y,bx=v.x-a.x,by=v.y-a.y;
    const determinant=ax*by-ay*bx;
    if (!Number.isFinite(determinant)||Math.abs(determinant)<1e-8) throw Error('Canvas projection is not invertible');
    const dx=x-a.x,dy=y-a.y;
    return {x:b.left+(dx*by-dy*bx)/determinant*b.width,y:b.top+(ax*dy-ay*dx)/determinant*b.height};
  },point);
}

async function settleFrame(page) {
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}

async function focusCamera(page,point) {
  await page.evaluate(point=>arenaApp.renderer.focusAt(point),point);
  await settleFrame(page);
}

async function minimapPoint(page,point) {
  return page.evaluate(point=>{
    const canvas=document.getElementById('arena-minimap'),bounds=canvas.getBoundingClientRect();
    const {scale,ox,oy}=arenaApp.renderer.minimapView(canvas);
    return {x:bounds.left+ox+(point.x+point.y)*scale,y:bounds.top+oy+(point.y-point.x)*scale*.5};
  },point);
}

async function pixelAt(page,point) {
  await focusCamera(page,point);
  const canvas=page.locator('#arena-canvas'),box=await canvas.boundingBox();
  const screen=await clientPoint(page,point);
  const png=PNG.sync.read(await canvas.screenshot());
  const x=Math.max(0,Math.min(png.width-1,Math.round((screen.x-box.x)*png.width/box.width)));
  const y=Math.max(0,Math.min(png.height-1,Math.round((screen.y-box.y)*png.height/box.height)));
  return [...png.data.subarray((y*png.width+x)*4,(y*png.width+x)*4+3)];
}

async function minimapPixelAt(page,point) {
  const canvas=page.locator('#arena-minimap'),box=await canvas.boundingBox(),screen=await minimapPoint(page,point);
  const png=PNG.sync.read(await canvas.screenshot());
  const x=Math.max(0,Math.min(png.width-1,Math.round((screen.x-box.x)*png.width/box.width)));
  const y=Math.max(0,Math.min(png.height-1,Math.round((screen.y-box.y)*png.height/box.height)));
  return [...png.data.subarray((y*png.width+x)*4,(y*png.width+x)*4+3)];
}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const screenshots=[];
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',hasTouch:true});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>{
      const url=new URL(route.request().url());
      if (url.hostname==='127.0.0.1') return route.continue();
      if (url.hostname.endsWith('.r2.dev')) return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#173b35"/><path d="M0 500L200 90L400 500Z" fill="#54816e"/><circle cx="200" cy="230" r="60" fill="#b5cdbb"/></svg>'});
      return route.abort();
    });
    await page.goto(`http://127.0.0.1:${server.address().port}${prefix}arena/`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.arenaApp?.catalog?.cards?.length===138);
    assert.equal(await page.locator('#start-match').isDisabled(),true,'an empty deck cannot start');
    const coverage=await page.evaluate(()=>({cards:arenaApp.catalog.cards.length,ready:arenaApp.catalog.cards.filter(c=>c.ready).length,spells:arenaApp.catalog.spells.length,locked:arenaApp.catalog.cards.find(c=>!c.ready),lockedSpell:arenaApp.catalog.spells.find(c=>!c.ready)}));
    assert.equal(coverage.cards,138);
    assert.equal(coverage.spells,26);
    assert.ok(coverage.ready>=8,'at least one complete deck is available');
    assert.equal(coverage.locked,undefined,'all authored root cards are playable');
    assert.ok(coverage.lockedSpell?.reasons?.length,'incomplete spells still expose source-backed reasons');
    await page.locator('#readiness-filter').selectOption('all');
    assert.equal(await page.locator('[data-inspect-card]').count(),138);
    assert.equal(coverage.ready,138);
    for(const id of ['nightfang','stacy','death','demotron','aeralis','dark-necromancer','ali','worms','bloodraider','shine','avalith','malvaris','sylviana','pyhsic','unara','clara','far','lyra','naar','etheris','format','artist','magma','fallen-angel','nortex','fen','nightprowler','angels','boomix','albert','chicken','tornado','tphoenix','corsair-crew','roguex','whisper','sunrise','wong','reacher','bastra','maapp','avara','john-reynolds','azrith','untouch','heartix','r-1','blank','magmara','willowshade','collector','sushu','umbra','thief','rotlings','stormblade','venom-fangs','skyhunter','rockback','neon-droid','void-wraith','bio-mech','mixela','laura']){
      const card=page.locator(`[data-add-card="${id}"]`);
      assert.ok((await card.getAttribute('aria-label')).startsWith('Add '),`${id} is available for deck building`);
      assert.equal(await card.locator('.card-locked-mark').count(),0);
    }
    await page.locator('[data-add-card="john-reynolds"]').click();assert.equal(await page.locator('#selected-deck .slot-mana').first().textContent(),'13');
    await page.locator('[data-add-card="sheriff"]').click();assert.equal(await page.locator('#selected-deck .slot-mana').first().textContent(),'15');
    await page.locator('[data-inspect-card="john-reynolds"]').click();assert.equal(await page.locator('[data-ascended]').count(),1);assert.equal(await page.locator('#inspector [data-stat="health"] strong').textContent(),'335');await page.locator('#inspector-close').click();await page.locator('#clear-deck').click();
    await page.locator('[data-add-card="reacher"]').click();assert.equal(await page.locator('#selected-deck .slot-mana').first().textContent(),'11');
    await page.locator('[data-add-card="soldier"]').click();assert.equal(await page.locator('#selected-deck .slot-mana').first().textContent(),'15');assert.equal(await page.locator('[data-add-card="reacher"] .card-role').textContent(),'Tank / Anchor');
    await page.locator('[data-inspect-card="reacher"]').click();assert.equal(await page.locator('[data-ascended]').count(),1);assert.equal(await page.locator('#inspector [data-stat="health"] strong').textContent(),'250');await page.locator('#inspector-close').click();
    await page.locator('[data-remove-card="soldier"]').click();assert.equal(await page.locator('#selected-deck .slot-mana').first().textContent(),'11');
    for(const id of ['bastra','maapp','avara'])await page.locator(`[data-add-card="${id}"]`).click();
    assert.deepEqual(await page.locator('#selected-deck .slot-mana').allTextContents(),['11','11','7','18']);
    await page.locator('[data-inspect-card="avara"]').click();assert.equal(await page.locator('[data-ascended]').count(),1);assert.match(await page.locator('#inspector .profile-grid').textContent(),/2.5 × 5 tiles.*5 × 2.5 tiles/);await page.locator('#inspector-close').click();
    for(const id of ['soldier','hammies','b-b','scrapy'])await page.locator(`[data-add-card="${id}"]`).click();
    assert.deepEqual(await page.locator('#selected-deck .slot-mana').allTextContents().then(v=>v.slice(0,4)),['15','11','7','18']);
    await page.screenshot({path:'/tmp/oyun-arena-ascendant-deck.png',fullPage:true});screenshots.push('/tmp/oyun-arena-ascendant-deck.png');
    await page.locator('#spell-tab').click();await page.locator('[data-add-spell="healing-light"]').click();await page.locator('#start-match').click();
    const partnerGame=await page.evaluate(()=>{const e=arenaApp.engine;e.bot=false;e.setPaused(false);e.teams[0].mana=20;const paid=e.deploy(0,0,{x:7,y:14});e.setPaused(true);return{cost:e.teams[0].spentMana,health:paid.units[0].hp,shield:paid.units[0].shield,active:paid.units[0].def.ascension.active,deck:e.teams[0].deck.includes('soldier')};});
    assert.deepEqual(partnerGame,{cost:15,health:250,shield:250,active:true,deck:true});
    await page.evaluate(()=>arenaApp.returnToLobby());await page.locator('#clear-deck').click();await page.locator('#troop-tab').click();
    await page.locator('[data-inspect-card="demotron"]').click();
    assert.match(await page.locator('#inspector .native-ability[lang="az"]').first().textContent(),/100 can.*10 can.*90 can.*9 can/);
    await page.locator('#inspector-close').click();
    await page.locator('[data-inspect-card="lyra"]').click();
    assert.equal(await page.locator('#inspector [data-stat="attackSpeed"] strong').textContent(),'0.20s');
    assert.equal(await page.locator('#inspector [data-stat="delay"] strong').textContent(),'0.90s');
    await page.locator('#inspector-close').click();
    await page.locator('#spell-tab').click();
    await page.locator(`[data-inspect-spell="${coverage.lockedSpell.id}"]`).click();
    assert.ok(await page.locator('#inspector').isVisible());
    assert.ok((await page.locator('#inspector').textContent()).includes(coverage.lockedSpell.reasons[0]));
    await page.locator('#inspector-close').click();

    await page.locator('#troop-tab').click();
    await page.locator('[data-inspect-card="nightfang"]').click();
    assert.equal(await page.locator('#inspector [data-stat="vision"] strong').textContent(),'12.5 tiles');
    assert.equal(await page.locator('#inspector [data-stat="range"] strong').textContent(),'12 tiles');
    assert.match(await page.locator('#inspector .profile-grid').textContent(),/Attack Distance0.5 tiles.*Projectile Width0.5 tiles/);
    await page.locator('#inspector-close').click();

    const readyInspect=await page.evaluate(()=>arenaApp.catalog.cards.find(c=>c.ready).id);
    await page.locator(`[data-inspect-card="${readyInspect}"]`).click();
    assert.equal(await page.locator('#inspector [data-stat]').count(),24,'the inspector contains every numeric stat');
    const authored=await page.evaluate(id=>{
      const card=arenaApp.catalog.byId.get(id), fragment=document.createElement('div');
      fragment.innerHTML=card.raw.trait||'';
      return fragment.textContent.replace(/\s+/g,' ').trim();
    },readyInspect);
    assert.equal((await page.locator('#inspector .native-ability[lang="az"]').first().textContent()).replace(/\s+/g,' ').trim(),authored,'ability body keeps its authored text');
    await page.locator('#inspector-close').click();
    for(const [id,width,travel,shape] of [['ali','1.5 tiles','4.5 tiles','Line'],['avalith','1 tile','1.75 tiles','Line'],['stacy','1 tile','2.6 tiles','Cone']]){
      await page.locator(`[data-inspect-card="${id}"]`).click();
      for(const [name,value] of [['Projectile Width',width],['Attack Distance',travel],['Attack Shape',shape]]){
        const field=page.locator('#inspector .profile-item').filter({has:page.locator('span',{hasText:new RegExp(`^${name}$`)})});
        assert.equal(await field.locator('strong').textContent(),value);
      }
      if(id==='ali'){assert.equal(await page.locator('#inspector [data-stat="range"] strong').textContent(),'1.25 tiles');assert.equal(await page.locator('#inspector [data-stat="damage"] strong').textContent(),'30');}
      await page.locator('#inspector-close').click();
    }
    await page.locator('[data-inspect-card="format"]').click();assert.ok(await page.locator('#inspector [data-copy-stats-note]').isVisible());await page.locator('#inspector-close').click();

    // Ethereal forms must be chosen in the real UI and remain fixed in battle.
    await page.locator('[data-add-card="ase"]').click();await page.locator('[data-ethereal-picker]').waitFor();assert.equal(await page.locator('.ethereal-choice').count(),2);assert.equal(await page.locator('#inspector [data-add-card="ase"]').isDisabled(),true);
    await page.locator('[data-choose-form="type2"]').click();assert.equal(await page.locator('[data-choose-form="type2"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#inspector [data-stat="range"] strong').textContent(),'1 tile');await page.locator('#inspector [data-add-card="ase"]').click();await page.locator('#inspector-close').click();assert.deepEqual(await page.evaluate(()=>arenaApp.formChoices),{ase:'type2'});assert.match(await page.locator('#selected-deck .slot-content').textContent(),/FORM 2/);
    await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.arenaApp?.catalog?.cards?.length===138);assert.deepEqual(await page.evaluate(()=>({deck:arenaApp.deck,form:arenaApp.formChoices.ase})),{deck:['ase'],form:'type2'});
    await page.locator('#selected-deck [data-inspect-card="ase"]').click();await page.locator('[data-choose-form="type1"]').click();await page.locator('#inspector-close').click();assert.equal(await page.evaluate(()=>arenaApp.formChoices.ase),'type1');await page.locator('#clear-deck').click();
    for(const id of ['ase','leno','king','dracula','leila','lord','hunter','soul-master','mr-and-mrs-ray']){await page.locator(`[data-inspect-card="${id}"]`).click();assert.equal(await page.locator('.ethereal-choice').count(),2,id);assert.equal(await page.locator('.ethereal-choice:disabled').count(),0,id);await page.locator('#inspector-close').click();}
    await page.locator('#quick-build').click();await page.locator('[data-remove-card="hammies"]').click();await page.locator('[data-inspect-card="ase"]').click();await page.locator('[data-choose-form="type2"]').click();await page.locator('#inspector [data-add-card="ase"]').click();await page.screenshot({path:'/tmp/oyun-arena-ethereal-choice.png',fullPage:true});screenshots.push('/tmp/oyun-arena-ethereal-choice.png');await page.locator('#inspector-close').click();await page.locator('#start-match').click();
    const chosenForm=await page.evaluate(()=>{const e=arenaApp.engine;e.bot=false;e.teams[0].mana=20;e.teams[0].hand[0]='ase';const result=e.deploy(0,0,{x:7,y:14});e.setPaused(true);return{key:e.teams[0].formChoices.ase,variant:result.units[0].def.variantId,counter:e.teams[0].cardDeployments.ase};});assert.deepEqual(chosenForm,{key:'type2',variant:'ase/type2',counter:1});await settleFrame(page);const chosenPoint=await clientPoint(page,{x:7,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(chosenPoint.x,chosenPoint.y);await page.locator('[data-ethereal-locked]').waitFor();assert.match(await page.locator('[data-ethereal-locked]').textContent(),/Form 2/);assert.equal(await page.locator('[data-choose-form]').count(),0);await page.locator('#inspector-close').click();await page.evaluate(()=>arenaApp.returnToLobby());await page.locator('#clear-deck').click();await page.locator('#troop-tab').click();

    // Build through real controls and test that spell capacity is enforced.
    await page.locator('#spell-tab').click();
    const budgetAttempt=await page.evaluate(()=>{
      const ordered=arenaApp.catalog.spells.filter(s=>s.ready).sort((a,b)=>b.charge-a.charge);
      let sum=0;const ids=[];
      for (const spell of ordered) { ids.push(spell.id);sum+=spell.charge;if(sum>5)return ids; }
      return null;
    });
    assert.ok(budgetAttempt,'ready spells can exercise the five-charge bound');
    for (const id of budgetAttempt) await page.locator(`[data-add-spell="${id}"]`).click();
    const budget=await page.evaluate(()=>({sum:arenaApp.spellDeck.reduce((n,id)=>n+arenaApp.catalog.spellById.get(id).charge,0),ids:[...arenaApp.spellDeck]}));
    assert.ok(budget.sum<=5);
    assert.ok(!budget.ids.includes(budgetAttempt.at(-1)),'the over-budget spell is rejected');
    await page.locator('#quick-build').click();
    const initialDeck=await page.evaluate(()=>({deck:[...arenaApp.deck],spells:[...arenaApp.spellDeck]}));
    assert.equal(new Set(initialDeck.deck).size,8);
    assert.ok(initialDeck.spells.length>=1);
    assert.equal(await page.locator('#start-match').isDisabled(),false);
    await page.locator('#start-match').click();
    await page.waitForFunction(()=>window.arenaApp?.engine?.state?.phase==='regulation');
    await settleFrame(page);
    assert.equal(await page.locator('[data-hand-index]').count(),4);
    assert.equal(await page.locator('#active-spell').count(),1);

    const rosters=await page.evaluate(()=>{
      const [player,opponent]=arenaApp.engine.teams;
      return {player:player.hand.concat(player.queue),bot:opponent.hand.concat(opponent.queue),spells:opponent.spellIds,charge:opponent.spellIds.reduce((n,id)=>n+arenaApp.catalog.spellById.get(id).charge,0),ready:opponent.hand.concat(opponent.queue).every(id=>arenaApp.catalog.byId.get(id).ready)};
    });
    assert.deepEqual(rosters.player,initialDeck.deck);assert.equal(new Set(rosters.bot).size,8);
    assert.notDeepEqual([...rosters.bot].sort(),[...rosters.player].sort());assert.ok(rosters.ready);assert.ok(rosters.spells.length>0&&rosters.charge<=5);
    const botActions=await page.evaluate(()=>{
      const e=arenaApp.engine,actions=[],deploy=e.deploy.bind(e);
      e.deploy=(side,index,point)=>{const before=e.teams[side].mana,result=deploy(side,index,point);if(result.ok&&side===1)actions.push({time:e.time,before,after:e.teams[side].mana});return result;};
      e.step(45);return actions;
    });
    assert.ok(botActions.length>=3&&botActions.length<=13,'the bot makes deliberate deployments rather than playing every second');
    for(let i=0;i<botActions.length;i++){
      assert.ok(botActions[i].after>=0&&botActions[i].after<botActions[i].before);
      if(i)assert.ok(botActions[i].time-botActions[i-1].time>=3.5-1e-7);
    }
    await page.evaluate(()=>arenaApp.startMatch());await settleFrame(page);
    const nextBotDeck=await page.evaluate(()=>arenaApp.engine.teams[1].hand.concat(arenaApp.engine.teams[1].queue));
    assert.notDeepEqual([...nextBotDeck].sort(),[...rosters.bot].sort(),'a new match draws a new opponent deck');

    // The battle opens close to our castle. Dragging an armed map pans it and
    // never commits the card, even when the release is over a legal road.
    const cameraStart=await page.evaluate(()=>{
      const e=arenaApp.engine;e.bot=false;e.teams[0].mana=20;
      return {center:{...arenaApp.renderer.camera.center},scale:arenaApp.renderer.view.scale};
    });
    assert.deepEqual(cameraStart.center,{x:8,y:14});
    await page.keyboard.press('1');
    const actionBefore=await page.evaluate(()=>({energy:arenaApp.engine.teams[0].energy,hand:[...arenaApp.engine.teams[0].hand],queue:[...arenaApp.engine.teams[0].queue],deployed:arenaApp.engine.teams[0].deployed}));
    const panStart=await clientPoint(page,{x:6.5,y:14});
    await page.mouse.move(panStart.x,panStart.y);await page.mouse.down();
    await page.mouse.move(panStart.x+120,panStart.y-20,{steps:8});await page.mouse.up();
    assert.notDeepEqual(await page.evaluate(()=>arenaApp.renderer.camera.center),cameraStart.center);
    assert.deepEqual(await page.evaluate(()=>({energy:arenaApp.engine.teams[0].energy,hand:[...arenaApp.engine.teams[0].hand],queue:[...arenaApp.engine.teams[0].queue],deployed:arenaApp.engine.teams[0].deployed})),actionBefore,'panning does not deploy the selected card');
    assert.ok(await page.evaluate(()=>arenaApp.selection?.kind==='card'),'the selection survives map panning');
    await page.locator('#camera-home').click();
    assert.deepEqual(await page.evaluate(()=>arenaApp.renderer.camera.center),cameraStart.center);
    await page.keyboard.press('Escape');
    await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);await page.keyboard.up('ArrowRight');
    assert.notDeepEqual(await page.evaluate(()=>arenaApp.renderer.camera.center),cameraStart.center);
    await page.keyboard.press('Home');
    assert.deepEqual(await page.evaluate(()=>arenaApp.renderer.camera.center),cameraStart.center);
    await page.mouse.move(panStart.x,panStart.y);const scrollBefore=await page.evaluate(()=>scrollY);
    await page.mouse.wheel(0,90);await settleFrame(page);
    assert.notDeepEqual(await page.evaluate(()=>arenaApp.renderer.camera.center),cameraStart.center);
    assert.equal(await page.evaluate(()=>scrollY),scrollBefore,'wheel navigation does not scroll the page');
    await page.keyboard.press('Space');
    assert.deepEqual(await page.evaluate(()=>arenaApp.renderer.camera.center),cameraStart.center);
    for(const percent of [90,80,75,70,60,50]){
      await page.locator('#camera-zoom-out').click();
      assert.equal(await page.evaluate(()=>arenaApp.renderer.camera.zoom),percent/100);
      assert.equal(await page.locator('#camera-zoom').textContent(),`${percent}%`);
    }
    assert.equal(await page.locator('#camera-zoom-out').isDisabled(),true);
    await page.screenshot({path:'/tmp/oyun-arena-zoom-50.png',fullPage:true});screenshots.push('/tmp/oyun-arena-zoom-50.png');
    for(const percent of [60,70,75,80,90,100]){
      await page.locator('#camera-zoom-in').click();
      assert.equal(await page.locator('#camera-zoom').textContent(),`${percent}%`);
    }
    await page.locator('#arena-canvas').focus();await page.keyboard.press('-');
    assert.equal(await page.locator('#camera-zoom').textContent(),'90%');
    await page.keyboard.press('+');assert.equal(await page.locator('#camera-zoom').textContent(),'100%');
    await page.mouse.move(panStart.x,panStart.y);await page.keyboard.down('Control');
    await page.mouse.wheel(0,80);await page.keyboard.up('Control');await settleFrame(page);
    assert.equal(await page.locator('#camera-zoom').textContent(),'90%');
    await page.locator('#camera-zoom-in').click();
    for(let i=0;i<4&&!await page.locator('#camera-zoom-in').isDisabled();i++)await page.locator('#camera-zoom-in').click();
    assert.equal(await page.evaluate(()=>arenaApp.renderer.camera.zoom),1.6);
    assert.equal(await page.locator('#camera-zoom-in').isDisabled(),true);
    for(let i=0;i<10&&!await page.locator('#camera-zoom-out').isDisabled();i++)await page.locator('#camera-zoom-out').click();
    assert.equal(await page.evaluate(()=>arenaApp.renderer.camera.zoom),.5);
    assert.equal(await page.locator('#camera-zoom-out').isDisabled(),true);
    await page.keyboard.press('1');
    const remote=await minimapPoint(page,{x:39,y:14});
    await page.mouse.click(remote.x,remote.y);await settleFrame(page);
    const remoteCenter=await page.evaluate(()=>arenaApp.renderer.camera.center);
    assert.ok(Math.hypot(remoteCenter.x-39,remoteCenter.y-14)<.5,'the minimap reaches the opposing castle');
    assert.equal(await page.locator('#enemy-castle-hp').textContent(),'?','camera movement does not reveal enemies');
    const north=await minimapPoint(page,{x:21.5,y:4}),south=await minimapPoint(page,{x:21.5,y:24});
    await page.mouse.move(north.x,north.y);await page.mouse.down();await page.mouse.move(south.x,south.y,{steps:6});await page.mouse.up();
    const draggedCenter=await page.evaluate(()=>arenaApp.renderer.camera.center);
    assert.ok(Math.hypot(draggedCenter.x-21.5,draggedCenter.y-24)<.5,'dragging the minimap reaches another route');
    assert.deepEqual(await page.evaluate(()=>({energy:arenaApp.engine.teams[0].energy,hand:[...arenaApp.engine.teams[0].hand],queue:[...arenaApp.engine.teams[0].queue],deployed:arenaApp.engine.teams[0].deployed})),actionBefore,'minimap input never places the armed card');
    await page.evaluate(()=>arenaApp.startMatch());await settleFrame(page);
    assert.equal(await page.evaluate(()=>arenaApp.renderer.camera.zoom),1,'restart restores the close home camera');

    // Exercise a real ranged Codex card across 3.5 tiles. It must fire a visible
    // projectile before impact and keep its distance, rather than chasing melee.
    const ranged=await page.evaluate(()=>{
      const e=arenaApp.engine;e.bot=false;e.state.units=[];e.state.projectiles=[];e.state.effects=[];
      const [source]=e.spawn(arenaApp.catalog.byId.get('soldier'),0,{x:15,y:14},1,{count:1});
      const dummy=structuredClone(arenaApp.catalog.byId.get('hammies'));
      dummy.id='ranged-target';Object.assign(dummy.stats,{health:10000,shield:0,speed:0,damage:0,range:0,dodge:0,healrecovery:0});dummy.combat.attackType='none';
      const [target]=e.spawn(dummy,1,{x:18.5,y:14},1,{count:1});
      e.step(1/30);e.setPaused(true);arenaApp.renderer.focusAt({x:16,y:14});
      window.rangedFixture={source,target};
      return {x:source.x,y:source.y,shots:source.shots,hp:target.hp,projectiles:e.state.projectiles.filter(p=>p.sourceId===source.id).length,slash:e.state.effects.some(fx=>fx.type==='slash')};
    });
    assert.equal(ranged.x,15);assert.equal(ranged.y,14);assert.ok(ranged.shots>0);assert.equal(ranged.hp,10000);assert.ok(ranged.projectiles>0);assert.equal(ranged.slash,false);
    await settleFrame(page);
    await page.screenshot({path:'/tmp/oyun-arena-ranged.png',fullPage:true});screenshots.push('/tmp/oyun-arena-ranged.png');
    const impact=await page.evaluate(()=>{
      const e=arenaApp.engine;e.setPaused(false);e.step(.6);e.setPaused(true);
      return {hp:window.rangedFixture.target.hp,x:window.rangedFixture.source.x,y:window.rangedFixture.source.y};
    });
    assert.ok(impact.hp<10000);assert.equal(impact.x,15);assert.equal(impact.y,14);
    await page.evaluate(()=>{
      const e=arenaApp.engine,u=window.rangedFixture.source;
      e.status(u,'Frozen',5);e.status(u,'Blind',5,.25);e.status(u,'Stat Reduction',5,0,null,{stats:{damage:1}});
      e.setPaused(false);arenaApp.renderer.focusAt(u);
    });
    const affected=await clientPoint(page,{x:15,y:14});await page.mouse.click(affected.x,affected.y);
    await page.locator('#inspector').waitFor({state:'visible'});
    for(const effect of ['frozen','blind','statReduction'])assert.ok(await page.locator(`#inspector [data-status="${effect}"]`).isVisible());
    assert.equal(await page.locator('#inspector [data-stat="damage"] strong').textContent(),'15 × 2');
    assert.equal(await page.locator('#inspector [data-stat="range"] strong').textContent(),'3 tiles');
    await page.screenshot({path:'/tmp/oyun-arena-status-inspector.png',fullPage:true});screenshots.push('/tmp/oyun-arena-status-inspector.png');
    await page.locator('#inspector-close').click();
    await page.evaluate(()=>{delete window.rangedFixture;arenaApp.startMatch();});await settleFrame(page);

    const returning=await page.evaluate(()=>{
      const e=arenaApp.engine;e.bot=false;e.state.units=[];e.state.projectiles=[];e.state.effects=[];
      const def=structuredClone(arenaApp.catalog.byId.get('avalith'));Object.assign(def.stats,{speed:0,criticalChance:0});
      const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});
      const dummy=structuredClone(arenaApp.catalog.byId.get('hammies'));dummy.id='return-target';
      Object.assign(dummy.stats,{health:1000,shield:0,speed:0,damage:0,range:0,dodge:0,healrecovery:0});dummy.combat.attackType='none';
      const [target]=e.spawn(dummy,1,{x:18.5,y:14},1,{count:1});e._fire(source,target);e.step(.5);e.setPaused(true);arenaApp.renderer.focusAt(source);
      window.returnFixture={source,target};return{phase:e.state.projectiles[0]?.returning,shots:source.shots,locked:!!source.memory.returningShotId,hp:target.hp};
    });
    assert.equal(returning.phase,'return');assert.equal(returning.shots,1);assert.ok(returning.locked);assert.equal(returning.hp,968);
    await settleFrame(page);await page.screenshot({path:'/tmp/oyun-arena-avalith-return.png',fullPage:true});screenshots.push('/tmp/oyun-arena-avalith-return.png');
    const caught=await page.evaluate(()=>{
      const e=arenaApp.engine,{source,target}=returnFixture;e.setPaused(false);e.step(.5);e.setPaused(true);
      return{shots:source.shots,locked:!!source.memory.returningShotId,hp:target.hp,remaining:e.state.projectiles.filter(p=>p.sourceId===source.id).length};
    });
    assert.deepEqual(caught,{shots:1,locked:false,hp:968,remaining:0});
    await page.evaluate(()=>{delete window.returnFixture;arenaApp.startMatch();});await settleFrame(page);

    await page.evaluate(()=>{
      const e=arenaApp.engine;e.bot=false;e.state.units=[];e.state.projectiles=[];e.state.effects=[];
      const def=structuredClone(arenaApp.catalog.byId.get('malvaris'));def.stats.speed=0;
      const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});source.cooldown=Infinity;
      const dummy=structuredClone(arenaApp.catalog.byId.get('hammies'));dummy.id='soul-target';dummy.name='Marked Target';
      Object.assign(dummy.stats,{health:1000,shield:0,speed:0,damage:0,range:0,dodge:0,healrecovery:0});dummy.combat.attackType='none';
      const [target]=e.spawn(dummy,1,{x:15.6,y:14},1,{count:1});e._resolveHit(source,target,{kind:'attack',damage:23});
      window.soulFixture={source,target,dummy};arenaApp.renderer.focusAt(source);
    });
    await settleFrame(page);const markedPoint=await clientPoint(page,{x:15.6,y:14});await page.mouse.click(markedPoint.x,markedPoint.y);
    await page.locator('#inspector').waitFor({state:'visible'});assert.ok(await page.locator('#inspector [data-status="soulMark"]').isVisible());
    await page.locator('#inspector-close').click();
    const souls=await page.evaluate(()=>{
      const e=arenaApp.engine,{source,target,dummy}=soulFixture;e.setPaused(true);e.damage(null,target,1001,{kind:'spell',bypassShield:true});e._drainDeaths();
      const first=e.units.find(u=>u.def.id==='malvaris/phantomis'),def=structuredClone(arenaApp.catalog.byId.get('malvaris/phantomis'));def.stats.speed=0;
      e.spawn(def,0,{x:13,y:14},1,{count:1});e.spawn(def,0,{x:17,y:14},1,{count:1});
      for(let i=0;i<150;i++){const [ally]=e.spawn(dummy,0,{x:10,y:14},1,{count:1});e.damage(null,ally,1001,{kind:'spell',bypassShield:true});e._drainDeaths();}
      const army=e.units.filter(u=>u.def.id==='malvaris/phantomis');for(const u of army){u.stats.speed=0;u.cooldown=Infinity;e._hook('tick',u,0);}
      soulFixture.first=first;return{count:army.length,critical:source.stats.criticalChance,damage:first.stats.damage};
    });
    assert.deepEqual(souls,{count:3,critical:80,damage:12});
    await page.evaluate(()=>arenaApp.engine.setPaused(false));const malvarisPoint=await clientPoint(page,{x:15,y:14});await page.mouse.click(malvarisPoint.x,malvarisPoint.y);
    await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('#inspector [data-stat="criticalChance"] strong').textContent(),'80%');
    await page.locator('#inspector-close').click();await page.evaluate(()=>arenaApp.engine.setPaused(false));
    const phantomPoint=await clientPoint(page,{x:15.6,y:14});await page.mouse.click(phantomPoint.x,phantomPoint.y);
    await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('#inspector-name').textContent(),'Phantomis');
    assert.equal(await page.locator('#inspector [data-stat="damage"] strong').textContent(),'12');
    assert.equal(await page.locator('#inspector [data-stat="attackSpeed"] strong').textContent(),'1.364s');
    await page.screenshot({path:'/tmp/oyun-arena-phantomis-inspector.png',fullPage:true});screenshots.push('/tmp/oyun-arena-phantomis-inspector.png');await page.locator('#inspector-close').click();
    const bloom=await page.evaluate(()=>{
      const e=arenaApp.engine;e.setPaused(true);e.state.units=[];e.state.projectiles=[];e.state.effects=[];
      const dummy=structuredClone(soulFixture.dummy);dummy.stats.health=100;
      const [friend]=e.spawn(dummy,0,{x:15.6,y:14},1,{count:1}),[enemy]=e.spawn(dummy,1,{x:15.4,y:14},1,{count:1});
      const [parent]=e.spawn(arenaApp.catalog.byId.get('sylviana'),0,{x:15,y:14},1,{count:1});e.damage(null,parent,1000,{kind:'spell',bypassShield:true});e._drainDeaths();
      const children=e.units.filter(u=>u.def.id==='sylviana/butterflies');e.damage(null,children[0],1000,{kind:'spell',bypassShield:true});e._drainDeaths();arenaApp.renderer.focusAt(friend);
      return{born:children.length,friendHp:friend.hp,friendMax:friend.maxHp,enemyHp:enemy.hp,area:e.state.effects.find(f=>f.type==='healthBloom').width};
    });
    assert.deepEqual(bloom,{born:4,friendHp:110,friendMax:110,enemyHp:100,area:1.5});
    await settleFrame(page);await page.screenshot({path:'/tmp/oyun-arena-butterfly-bloom.png',fullPage:true});screenshots.push('/tmp/oyun-arena-butterfly-bloom.png');
    await page.evaluate(()=>{delete window.soulFixture;arenaApp.startMatch();});await settleFrame(page);

    const volley=await page.evaluate(()=>{
      const e=arenaApp.engine;e.bot=false;e.state.units=[];e.state.projectiles=[];e.state.effects=[];
      const def=structuredClone(arenaApp.catalog.byId.get('unara'));def.stats.speed=0;
      const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});source.cooldown=Infinity;
      const dummy=structuredClone(arenaApp.catalog.byId.get('hammies'));dummy.id='orb-target';
      Object.assign(dummy.stats,{health:1000,shield:0,speed:0,damage:0,range:0,dodge:0,healrecovery:0});dummy.combat.attackType='none';
      const targets=[16,16.7].map(x=>e.spawn(dummy,1,{x,y:14},1,{count:1})[0]);for(let i=0;i<12;i++)e._resolveHit(source,targets[0],{kind:'attack',damage:5});
      for(const target of targets)target.hp=1000;e.step(.2);e.setPaused(true);arenaApp.renderer.focusAt(source);window.orbFixture={source,targets,dummy};
      return{charge:source.memory.charge,remaining:source.memory.orbRemaining,orbs:e.state.projectiles.filter(p=>p.kind==='orb').length};
    });
    assert.deepEqual(volley,{charge:8,remaining:28,orbs:2});await settleFrame(page);
    await page.screenshot({path:'/tmp/oyun-arena-unara-orbs.png',fullPage:true});screenshots.push('/tmp/oyun-arena-unara-orbs.png');
    const orbImpact=await page.evaluate(()=>{const e=arenaApp.engine;e.setPaused(false);e.step(3.4);e.setPaused(true);return{hp:orbFixture.targets.map(t=>t.hp),charge:orbFixture.source.memory.charge,hits:orbFixture.source.hits};});
    assert.deepEqual(orbImpact,{hp:[970,970],charge:8,hits:12});
    const taunt=await page.evaluate(()=>{
      const e=arenaApp.engine;e.state.units=[];e.state.projectiles=[];e.state.effects=[];e.setPaused(false);
      const def=structuredClone(arenaApp.catalog.byId.get('clara'));def.stats.speed=0;
      const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});source.cooldown=Infinity;source.hp=100;
      const dummy=structuredClone(orbFixture.dummy);dummy.stats.range=5000;
      const [other]=e.spawn(dummy,0,{x:15.4,y:14},1,{count:1}),[enemy]=e.spawn(dummy,1,{x:15.8,y:14},1,{count:1});
      enemy.burstTargetId=other.id;enemy.burstIndex=2;e.step(5.3);arenaApp.renderer.focusAt(source);
      return{forced:e._target(enemy)===source,hp:source.hp,taunted:enemy.statuses.some(s=>s.kind==='taunted')};
    });
    assert.deepEqual(taunt,{forced:true,hp:103,taunted:true});await settleFrame(page);
    const tauntPoint=await clientPoint(page,{x:15.8,y:14});await page.mouse.click(tauntPoint.x,tauntPoint.y);
    await page.locator('#inspector').waitFor({state:'visible'});assert.ok(await page.locator('#inspector [data-status="taunted"]').isVisible());
    await page.screenshot({path:'/tmp/oyun-arena-clara-taunt.png',fullPage:true});screenshots.push('/tmp/oyun-arena-clara-taunt.png');await page.locator('#inspector-close').click();
    const execution=await page.evaluate(()=>{
      const e=arenaApp.engine;e.setPaused(false);e.state.units=[];e.state.projectiles=[];e.state.effects=[];e.random=()=>.399;
      const def=structuredClone(arenaApp.catalog.byId.get('pyhsic'));def.stats.speed=0;
      const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});source.cooldown=Infinity;
      const dummy=structuredClone(orbFixture.dummy);dummy.stats.health=200;const [target]=e.spawn(dummy,1,{x:21,y:14},1,{count:1});
      e.step(22);e.setPaused(true);return{alive:target.alive,hp:target.hp,hits:source.hits};
    });
    assert.deepEqual(execution,{alive:false,hp:0,hits:0});await page.evaluate(()=>{delete window.orbFixture;arenaApp.startMatch();});await settleFrame(page);

    const portal=await page.evaluate(()=>{
      const e=arenaApp.engine;e.bot=false;e.state.units=[];e.state.projectiles=[];e.state.effects=[];e.random=()=>.079;
      const def=structuredClone(arenaApp.catalog.byId.get('far'));def.stats.speed=0;def.stats.criticalChance=0;
      const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});source.cooldown=Infinity;
      const dummy=structuredClone(arenaApp.catalog.byId.get('hammies'));dummy.id='portal-target';
      Object.assign(dummy.stats,{health:1000,shield:0,speed:0,damage:0,range:0,dodge:0,healrecovery:0});dummy.combat.attackType='none';
      const [target]=e.spawn(dummy,1,{x:15.6,y:14},1,{count:1});e._resolveHit(source,target,{kind:'attack',damage:8});e.step(.2);e.setPaused(true);arenaApp.renderer.focusAt(source);
      arenaApp.renderer.shotTimes.delete(target.id);window.portalFixture={source,target,dummy};return{banished:target.banished,hp:target.hp};
    });
    assert.deepEqual(portal,{banished:true,hp:992});await settleFrame(page);
    assert.equal(await page.evaluate(()=>arenaApp.renderer.shotTimes.has(portalFixture.target.id)),false);
    await page.screenshot({path:'/tmp/oyun-arena-far-portal.png',fullPage:true});screenshots.push('/tmp/oyun-arena-far-portal.png');
    const returned=await page.evaluate(()=>{const e=arenaApp.engine;e.setPaused(false);e.step(9.8);e.setPaused(true);const t=portalFixture.target;return{absent:!!t.banished,hp:t.hp,moved:Math.hypot(t.x-15.6,t.y-14)>.6,lane:t.lane};});
    assert.equal(returned.absent,false);assert.equal(returned.hp,872);assert.ok(returned.moved);assert.ok([0,1,2].includes(returned.lane));
    const combo=await page.evaluate(()=>{
      const e=arenaApp.engine;e.state.units=[];e.state.projectiles=[];e.state.effects=[];e.setPaused(false);
      const def=structuredClone(arenaApp.catalog.byId.get('lyra'));def.stats.speed=0;def.stats.criticalChance=0;
      const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1}),[target]=e.spawn(portalFixture.dummy,1,{x:15.6,y:14},1,{count:1});
      e.step(3);e.setPaused(true);return{hp:target.hp,hits:source.hits,attacks:source.attacks,sequence:source.def.attack.sequence.map(mode=>mode.count)};
    });
    assert.deepEqual(combo,{hp:975,hits:5,attacks:3,sequence:[1,1,3]});
    const grenades=await page.evaluate(()=>{
      const e=arenaApp.engine;e.state.units=[];e.state.projectiles=[];e.state.effects=[];e.setPaused(false);
      const def=structuredClone(arenaApp.catalog.byId.get('naar'));def.stats.speed=0;
      const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});source.hp=67;source.cooldown=Infinity;
      const targets=[18,18.5].map(x=>e.spawn(portalFixture.dummy,1,{x,y:14},1,{count:1})[0]);e.step(.6);e.setPaused(true);arenaApp.renderer.focusAt(source);window.grenadeFixture={source,targets};
      return{casts:source.memory.naarCasts,remaining:source.memory.grenadeBursts[0].remaining,kind:e.state.projectiles[0]?.kind};
    });
    assert.deepEqual(grenades,{casts:1,remaining:19,kind:'grenade'});await settleFrame(page);
    await page.screenshot({path:'/tmp/oyun-arena-naar-grenade.png',fullPage:true});screenshots.push('/tmp/oyun-arena-naar-grenade.png');
    const detonated=await page.evaluate(()=>{
      const e=arenaApp.engine,{source,targets}=grenadeFixture;e.setPaused(false);e.step(10);e.setPaused(true);
      const hp=targets.map(t=>t.hp);for(let i=0;i<4;i++){e.heal(source,1000);e.damage(null,source,103,{kind:'spell',bypassShield:true});}
      return{hp,casts:source.memory.naarCasts};
    });
    assert.deepEqual(detonated,{hp:[920,920],casts:3});await page.evaluate(()=>{delete window.portalFixture;delete window.grenadeFixture;arenaApp.startMatch();});await settleFrame(page);

    // Shared reserves, copied Power profiles and the timed, healthless raven form
    // run in the real browser module graph and remain inspectable through clicks.
    const linkedReserve=await page.evaluate(()=>{
      const e=arenaApp.engine;e.bot=false;e.state.units=[];e.state.projectiles=[];e.setPaused(true);
      const def=structuredClone(arenaApp.catalog.byId.get('etheris'));def.stats.speed=0;
      const pair=e.spawn(def,0,{x:15,y:14},1),friend=structuredClone(arenaApp.catalog.byId.get('hammies'));
      Object.assign(friend.stats,{health:1000,shield:0,speed:0,range:0,damage:0,healrecovery:0});friend.combat.attackType='none';friend.id='shared-friend';
      const [ally]=e.spawn(friend,0,{x:15.7,y:14},1,{count:1});e._hook('tick',pair[0],0);
      e.damage(null,ally,50,{kind:'spell'});pair.forEach(u=>u.cooldown=Infinity);
      arenaApp.renderer.focusAt(ally);window.inkFixture={dummy:friend,ally,pair};
      return{hp:ally.hp,shield:ally.shield,shared:pair.every(u=>u.hp===ally.hp),max:e.maxHealth(ally)};
    });
    assert.deepEqual(linkedReserve,{hp:1101,shield:73,shared:true,max:1116});await settleFrame(page);
    const sharedPoint=await clientPoint(page,{x:15.7,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(sharedPoint.x,sharedPoint.y);
    await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-shared-vitals]').count(),1);
    assert.equal(await page.locator('#inspector [data-stat="health"] strong').textContent(),'1101 / 1116');
    await page.screenshot({path:'/tmp/oyun-arena-etheris-reserve.png',fullPage:true});screenshots.push('/tmp/oyun-arena-etheris-reserve.png');await page.locator('#inspector-close').click();
    const copiedPower=await page.evaluate(()=>{
      const e=arenaApp.engine;e.state.units=[];e.state.projectiles=[];e.setPaused(true);
      const format=structuredClone(arenaApp.catalog.byId.get('format'));format.stats.speed=0;
      const [source]=e.spawn(format,0,{x:15,y:14},1,{count:1});
      const strong=structuredClone(arenaApp.catalog.byId.get('soldier'));strong.stats.speed=0;
      const [target]=e.spawn(strong,1,{x:18,y:14},1,{count:1});target.hp=1;target.shield=0;
      e._hook('tick',source,2.9);const before={name:source.def.id,shots:source.shots};e._hook('tick',source,.1);
      return{before,name:source.def.id,hp:source.hp,max:target.maxHp,range:source.stats.range,power:source.def.power,website:ClashCardPower.scorer(arenaApp.catalog.cards.map(c=>c.raw))(target.def.raw)};
    });
    assert.deepEqual(copiedPower.before,{name:'format',shots:0});assert.equal(copiedPower.name,'soldier');assert.equal(copiedPower.hp,copiedPower.max);assert.equal(copiedPower.power,copiedPower.website);
    const inkCurse=await page.evaluate(()=>{
      const e=arenaApp.engine;e.state.units=[];e.state.projectiles=[];e.setPaused(true);
      const def=structuredClone(arenaApp.catalog.byId.get('artist'));def.stats.speed=0;def.stats.criticalChance=0;
      const [artist]=e.spawn(def,0,{x:15,y:14},1,{count:1});artist.cooldown=Infinity;
      const [target]=e.spawn(inkFixture.dummy,1,{x:18,y:14},1,{count:1}),[next]=e.spawn(inkFixture.dummy,1,{x:18.6,y:14},1,{count:1});
      e.addInk(artist,target,21);e.addInk(artist,next,17);e.damage(null,target,5000,{kind:'spell',bypassShield:true});e._drainDeaths();
      window.inkFixture={...inkFixture,artist,next};arenaApp.renderer.focusAt(artist);
      return{ink:next.statuses.find(s=>s.kind==='ink').stacks,charge:artist.memory.artistCharge,curse:next.statuses.find(s=>s.kind==='curse').magnitude};
    });
    assert.deepEqual(inkCurse,{ink:21,charge:20,curse:.25});await settleFrame(page);
    const artistPoint=await clientPoint(page,{x:15,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(artistPoint.x,artistPoint.y);
    await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-artist-charge="20"]').count(),1);
    assert.match(await page.locator('[data-artist-charge]').textContent(),/8 ravens for 8 seconds/);await page.locator('#inspector-close').click();
    const timedRavens=await page.evaluate(()=>{
      const e=arenaApp.engine;e.setPaused(true);e.damage(null,inkFixture.artist,5000,{kind:'spell',bypassShield:true});e._drainDeaths();
      const ravens=e.units.filter(u=>u.healthless);for(const r of ravens){r.x=15;r.y=14;r.stats.speed=0;r.cooldown=Infinity;}
      inkFixture.raven=ravens[0];e.state.units=ravens;arenaApp.renderer.focusAt(ravens[0]);
      return{count:ravens.length,life:ravens[0].expiresAt-e.time,vision:ravens[0].stats.vision,canHit:e.canTarget(inkFixture.next,ravens[0]),damage:e.damage(null,ravens[0],9999,{kind:'spell'}).total};
    });
    assert.ok(Math.abs(timedRavens.life-8)<1e-7);assert.deepEqual({...timedRavens,life:8},{count:8,life:8,vision:4000,canHit:false,damage:0});await settleFrame(page);
    const ravenPoint=await clientPoint(page,{x:15,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(ravenPoint.x,ravenPoint.y);
    await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-healthless]').count(),1);
    assert.equal(await page.locator('#inspector [data-stat="number"] strong').textContent(),'8');
    assert.equal(await page.locator('#inspector [data-stat="health"] strong').textContent(),'—');assert.equal(await page.locator('#inspector [data-stat="shield"] strong').textContent(),'—');
    const ravenLife=parseFloat(await page.locator('#inspector [data-stat="life"] strong').textContent());assert.ok(ravenLife>=7.5&&ravenLife<=8);
    await page.screenshot({path:'/tmp/oyun-arena-raven-lifetime.png',fullPage:true});screenshots.push('/tmp/oyun-arena-raven-lifetime.png');await page.locator('#inspector-close').click();
    await page.evaluate(()=>{delete window.inkFixture;arenaApp.startMatch();});await settleFrame(page);

    {
      const burstPackets=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];e.setPaused(false);
        const def=structuredClone(arenaApp.catalog.byId.get('nortex'));Object.assign(def.stats,{speed:0,criticalChance:0,lifestealChance:0});
        const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});
        const dummy=structuredClone(arenaApp.catalog.byId.get('hammies'));dummy.id='mundane-browser-target';dummy.combat.attackType='none';Object.assign(dummy.stats,{health:5000,shield:0,damage:0,range:0,speed:0,dodge:0,healrecovery:0});
        const [target]=e.spawn(dummy,1,{x:18,y:14},1,{count:1}),packets=[],damage=e.damage.bind(e);
        e.damage=(u,t,amount,options)=>{const result=damage(u,t,amount,options);if(u===source&&t===target&&result.total>0)packets.push(result.total);return result;};
        e.step(3.05);source.cooldown=Infinity;e.setPaused(true);arenaApp.renderer.focusAt(source);window.mundaneFixture={source,target,dummy};return packets;
      });
      assert.deepEqual(burstPackets,[5,7,9,5,7,9]);await settleFrame(page);
      const nortexPoint=await clientPoint(page,{x:15,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(nortexPoint.x,nortexPoint.y);
      await page.locator('#inspector').waitFor({state:'visible'});assert.match(await page.locator('[data-nortex-burst]').textContent(),/5 → 7 → 9/);
      await page.screenshot({path:'/tmp/oyun-arena-nortex-burst.png',fullPage:true});screenshots.push('/tmp/oyun-arena-nortex-burst.png');await page.locator('#inspector-close').click();
      const fenBlind=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];e.setPaused(true);
        const def=structuredClone(arenaApp.catalog.byId.get('fen'));def.stats.speed=0;const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});source.cooldown=Infinity;
        const dummy=structuredClone(mundaneFixture.dummy);dummy.stats.range=4000;const [target]=e.spawn(dummy,1,{x:18,y:14},1,{count:1});
        e._resolveHit(source,target,{damage:4,kind:'attack'});arenaApp.renderer.focusAt(target);window.mundaneFixture={...mundaneFixture,source,target};
        return{magnitude:target.statuses.find(s=>s.kind==='blind').magnitude,range:e._range(target)};
      });
      assert.deepEqual(fenBlind,{magnitude:.125,range:3.5});await settleFrame(page);
      const blindPoint=await clientPoint(page,{x:18,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(blindPoint.x,blindPoint.y);
      await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-status="blind"]').count(),1);
      assert.equal(await page.locator('#inspector [data-stat="range"] strong').textContent(),'3.5 tiles');assert.equal(await page.locator('#inspector [data-stat="vision"] strong').textContent(),'7 tiles');
      await page.screenshot({path:'/tmp/oyun-arena-fen-blind.png',fullPage:true});screenshots.push('/tmp/oyun-arena-fen-blind.png');await page.locator('#inspector-close').click();
      const hiddenNight=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];e.setPaused(false);
        const def=structuredClone(arenaApp.catalog.byId.get('nightprowler'));Object.assign(def.stats,{speed:0,criticalChance:0,lifestealChance:0});const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});source.cooldown=Infinity;
        const [target]=e.spawn(mundaneFixture.dummy,1,{x:15.8,y:14},1,{count:1});e.step(2);e.setPaused(true);arenaApp.renderer.focusAt(source);window.mundaneFixture={...mundaneFixture,source,target};
        return{hidden:source.statuses.some(s=>s.kind==='invisible'),targetable:e.canTarget(target,source),friendly:e.canSee(source,source)};
      });
      assert.deepEqual(hiddenNight,{hidden:true,targetable:false,friendly:true});await settleFrame(page);
      const nightPoint=await clientPoint(page,{x:15,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(nightPoint.x,nightPoint.y);
      await page.locator('#inspector').waitFor({state:'visible'});assert.match(await page.locator('[data-nightprowler-stealth]').textContent(),/Invisibility Active/);
      await page.screenshot({path:'/tmp/oyun-arena-nightprowler-stealth.png',fullPage:true});screenshots.push('/tmp/oyun-arena-nightprowler-stealth.png');await page.locator('#inspector-close').click();
      const ambush=await page.evaluate(()=>{
        const e=arenaApp.engine,{source,target}=mundaneFixture;e.setPaused(true);e._fire(source,target);source.cooldown=Infinity;
        const effect=target.statuses.find(s=>s.kind==='misfortune');arenaApp.renderer.focusAt(target);
        return{magnitude:effect.magnitude,duration:effect.until-e.time,hidden:source.statuses.some(s=>s.kind==='invisible')};
      });
      assert.equal(ambush.magnitude,.1);assert.ok(Math.abs(ambush.duration-8)<1e-7);assert.equal(ambush.hidden,false);await settleFrame(page);
      const ambushPoint=await clientPoint(page,{x:15.8,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(ambushPoint.x,ambushPoint.y);
      await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-status="misfortune"]').count(),1);
      await page.screenshot({path:'/tmp/oyun-arena-nightprowler-misfortune.png',fullPage:true});screenshots.push('/tmp/oyun-arena-nightprowler-misfortune.png');await page.locator('#inspector-close').click();
      await page.evaluate(()=>{delete window.mundaneFixture;arenaApp.startMatch();});await settleFrame(page);
    }

    {
      const growth=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];
        const def=structuredClone(arenaApp.catalog.byId.get('albert'));Object.assign(def.stats,{speed:0,criticalChance:0,lifestealChance:0});
        const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});source.cooldown=Infinity;
        const dummy=structuredClone(arenaApp.catalog.byId.get('hammies'));dummy.id='familiar-browser-target';dummy.combat.attackType='none';Object.assign(dummy.stats,{health:1000,shield:0,damage:0,range:0,speed:0,dodge:0,healrecovery:0});
        const [target]=e.spawn(dummy,1,{x:15.6,y:14},1,{count:1});for(let i=0;i<3;i++)e._fire(source,target);source.cooldown=Infinity;
        e.setPaused(true);arenaApp.renderer.focusAt(source);window.familiarFixture={source,target,dummy};return{damage:source.stats.damage,hp:target.hp};
      });
      assert.deepEqual(growth,{damage:10,hp:976});await settleFrame(page);
      const albertPoint=await clientPoint(page,{x:15,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(albertPoint.x,albertPoint.y);
      await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-albert-growth="3"]').count(),1);assert.equal(await page.locator('#inspector [data-stat="damage"] strong').textContent(),'12 × 10');
      await page.screenshot({path:'/tmp/oyun-arena-albert-growth.png',fullPage:true});screenshots.push('/tmp/oyun-arena-albert-growth.png');await page.locator('#inspector-close').click();
      const chickenReady=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];e.teams[0].hand[0]='chicken';const result=e.deploy(0,0,{x:7,y:14});if(!result.ok)throw Error(result.error);
        const source=result.units[0];e.setPaused(true);arenaApp.renderer.focusAt(source);window.familiarFixture={...familiarFixture,source};return{spent:e.teams[0].spentMana,shots:source.shots};
      });
      assert.deepEqual(chickenReady,{spent:6,shots:0});await settleFrame(page);
      const chickenPoint=await clientPoint(page,{x:7,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(chickenPoint.x,chickenPoint.y);
      await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-chicken-detonation]').count(),1);assert.match(await page.locator('[data-chicken-detonation]').textContent(),/3.5 × 3.5 tiles/);assert.equal(await page.locator('#inspector [data-stat="attackSpeed"] strong').textContent(),'—');
      await page.screenshot({path:'/tmp/oyun-arena-chicken-ready.png',fullPage:true});screenshots.push('/tmp/oyun-arena-chicken-ready.png');await page.locator('#inspector-close').click();
      const explosion=await page.evaluate(()=>{
        const e=arenaApp.engine,{source,dummy}=familiarFixture;e.setPaused(true);const [target]=e.spawn(dummy,1,{x:source.x+.4,y:source.y},1,{count:1});e.random=()=>.1;e.setPaused(false);e.step(1/30);e.setPaused(true);
        const blast=e.state.effects.find(f=>f.type==='blastArea');return{alive:source.alive,hp:target.hp,shots:source.shots,spent:e.teams[0].spentMana,width:blast?.width};
      });
      assert.deepEqual(explosion,{alive:false,hp:500,shots:0,spent:6,width:3.5});await settleFrame(page);
      await page.screenshot({path:'/tmp/oyun-arena-chicken-explosion.png',fullPage:true});screenshots.push('/tmp/oyun-arena-chicken-explosion.png');
      await page.evaluate(()=>{delete window.familiarFixture;arenaApp.startMatch();});await settleFrame(page);
    }

    {
      const angelsPaid=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];e.teams[0].hand[0]='angels';
        const result=e.deploy(0,0,{x:7,y:14});if(!result.ok)throw Error(result.error);
        const first=result.units[0];e.step(.9);e.setPaused(true);arenaApp.renderer.focusAt(first);window.wingFixture={first};
        return{units:e.units.length,spent:e.teams[0].spentMana,deployed:e.teams[0].deployed,next:e.state.spawnStreams[0].nextAt};
      });
      assert.deepEqual(angelsPaid,{units:3,spent:8,deployed:1,next:1.35});await settleFrame(page);
      const angelPoint=await clientPoint(page,await page.evaluate(()=>({x:wingFixture.first.x,y:wingFixture.first.y})));await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(angelPoint.x,angelPoint.y);
      await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-angel-stream="3"]').count(),1);
      assert.match(await page.locator('[data-angel-stream]').textContent(),/3 \/ 10/);
      await page.screenshot({path:'/tmp/oyun-arena-angels-stream.png',fullPage:true});screenshots.push('/tmp/oyun-arena-angels-stream.png');await page.locator('#inspector-close').click();
      const rallied=await page.evaluate(()=>{
        const e=arenaApp.engine;e.setPaused(false);e.step(Math.max(0,5.4-e.time));e.setPaused(true);const emitted=e.units.filter(u=>u.def.id==='angels').length;
        e.damage(null,wingFixture.first,10000,{kind:'spell',bypassShield:true});e._drainDeaths();
        return{emitted,alive:e.units.filter(u=>u.def.id==='angels').length,damage:e.units.filter(u=>u.def.id==='angels').map(u=>u.stats.damage),pending:e.state.spawnStreams.length,spent:e.teams[0].spentMana};
      });
      assert.deepEqual(rallied,{emitted:10,alive:9,damage:Array(9).fill(8),pending:0,spent:8});
      const boomFlight=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];
        const def=structuredClone(arenaApp.catalog.byId.get('boomix'));Object.assign(def.stats,{speed:0,criticalChance:0,lifestealChance:0});
        const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});source.shield=0;
        const dummy=structuredClone(arenaApp.catalog.byId.get('hammies'));dummy.id='return-browser-target';dummy.combat.attackType='none';Object.assign(dummy.stats,{health:1000,shield:0,damage:0,range:0,speed:0,dodge:0,healrecovery:0});
        const [target]=e.spawn(dummy,1,{x:18,y:14},1,{count:1});e._fire(source,target);e.step(.2);const damage=e.damage(null,source,10,{kind:'spell',bypassShield:true}).total;
        e.setPaused(true);arenaApp.renderer.focusAt(source);window.wingFixture={source,target};return{damage,flight:!!source.memory.returningShotId,phase:e.state.projectiles[0].returning};
      });
      assert.deepEqual(boomFlight,{damage:8,flight:true,phase:'outbound'});await settleFrame(page);
      const boomPoint=await clientPoint(page,{x:15,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(boomPoint.x,boomPoint.y);
      await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-boomix-flight="true"]').count(),1);assert.match(await page.locator('[data-boomix-flight]').textContent(),/20% less incoming damage/);
      await page.screenshot({path:'/tmp/oyun-arena-boomix-flight.png',fullPage:true});screenshots.push('/tmp/oyun-arena-boomix-flight.png');await page.locator('#inspector-close').click();
      const caught=await page.evaluate(()=>{const e=arenaApp.engine,{source,target}=wingFixture;e.setPaused(false);e.step(Math.max(0,.9-e.time));e.setPaused(true);return{hp:target.hp,flight:!!source.memory.returningShotId,shots:source.shots,cooldown:source.cooldown};});
      assert.equal(caught.hp,972);assert.equal(caught.flight,false);assert.equal(caught.shots,1);assert.ok(Math.abs(caught.cooldown-1.5)<1e-7);
      const relaunched=await page.evaluate(()=>{const e=arenaApp.engine;e.setPaused(false);e.step(Math.max(0,2.4-e.time));e.setPaused(true);return wingFixture.source.shots;});assert.equal(relaunched,2);
      await page.evaluate(()=>{delete window.wingFixture;arenaApp.startMatch();});await settleFrame(page);
    }

    {
      const growth=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];
        const def=structuredClone(arenaApp.catalog.byId.get('sunrise'));Object.assign(def.stats,{speed:1000,criticalChance:0});const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});e.step(1.2);source.stats.speed=0;
        e.setPaused(true);arenaApp.renderer.focusAt(source);return{growth:source.memory.sunriseGrowth,hp:source.hp,maxHp:source.maxHp,sourceHealth:source.def.stats.health};
      });assert.deepEqual(growth,{growth:2,hp:157,maxHp:157,sourceHealth:155});await settleFrame(page);
      const sunrisePoint=await clientPoint(page,{x:16.2,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(sunrisePoint.x,sunrisePoint.y);
      await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-sunrise-growth="2"]').count(),1);assert.match(await page.locator('[data-sunrise-growth]').textContent(),/\+2 \/ \+210 Health/);
      await page.screenshot({path:'/tmp/oyun-arena-sunrise-growth.png',fullPage:true});screenshots.push('/tmp/oyun-arena-sunrise-growth.png');await page.locator('#inspector-close').click();
      const burst=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];
        const def=structuredClone(arenaApp.catalog.byId.get('wong'));Object.assign(def.stats,{speed:0,criticalChance:0,lifestealChance:0});const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});e.damage(null,source,300,{kind:'spell',bypassShield:true});
        const dummy=structuredClone(arenaApp.catalog.byId.get('hammies'));dummy.id='wong-browser-host';dummy.combat.attackType='none';Object.assign(dummy.stats,{health:1000,shield:0,damage:0,range:0,speed:0,dodge:0,criticalChance:0,healrecovery:0,shieldrecovery:0});const [target]=e.spawn(dummy,1,{x:15.9,y:14},1,{count:1});e.status(target,'predominance',30);e.step(.5);
        e.setPaused(true);arenaApp.renderer.focusAt(source);window.wongFixture={source,target};return{shots:source.shots,remaining:source.attackMode.remaining,hp:target.hp,mode:e._profile(source).attackType,interval:e.attackInterval(source),baseDamage:source.stats.damage};
      });assert.deepEqual(burst,{shots:2,remaining:6,hp:984,mode:'ranged',interval:.4,baseDamage:28});await settleFrame(page);
      const wongPoint=await clientPoint(page,{x:15,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(wongPoint.x,wongPoint.y);
      await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-wong-burst="6"]').count(),1);assert.match(await page.locator('[data-wong-burst]').textContent(),/Firearm Burst.*2 \/ 8 shots/);
      await page.screenshot({path:'/tmp/oyun-arena-wong-burst.png',fullPage:true});screenshots.push('/tmp/oyun-arena-wong-burst.png');await page.locator('#inspector-close').click();
      const returned=await page.evaluate(()=>{const e=arenaApp.engine,{source,target}=wongFixture;e.setPaused(false);e.step(2.5);e.setPaused(true);return{shots:source.shots,specialShots:source.memory.wongShots,hp:target.hp,mode:e._profile(source).attackType,interval:e.attackInterval(source),active:!!source.attackMode,used:source.wongBurstUsed};});
      assert.deepEqual(returned,{shots:8,specialShots:8,hp:936,mode:'melee',interval:1.1,active:false,used:true});
      await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(wongPoint.x,wongPoint.y);await page.locator('#inspector').waitFor({state:'visible'});assert.match(await page.locator('[data-wong-burst="0"]').textContent(),/Melee · Burst Used/);
      await page.screenshot({path:'/tmp/oyun-arena-wong-melee.png',fullPage:true});screenshots.push('/tmp/oyun-arena-wong-melee.png');await page.locator('#inspector-close').click();
      await page.evaluate(()=>{const e=arenaApp.engine,{source}=wongFixture;source.hp=source.maxHp;e.damage(null,source,300,{kind:'spell',bypassShield:true});if(source.attackMode)throw Error('Wong repeated its one-use special');delete window.wongFixture;arenaApp.startMatch();});await settleFrame(page);
    }

    {
      const radial=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];
        const def=structuredClone(arenaApp.catalog.byId.get('maapp'));def.stats.speed=0;const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});
        const dummy=structuredClone(arenaApp.catalog.byId.get('hammies'));dummy.id='ascendant-browser-host';dummy.combat.attackType='none';Object.assign(dummy.stats,{health:1000,shield:0,damage:0,range:0,speed:0,dodge:0,healrecovery:0,shieldrecovery:0});
        const [front]=e.spawn(dummy,1,{x:19,y:14},1,{count:1}),[back]=e.spawn(dummy,1,{x:11,y:14},1,{count:1});front.stats.damage=100;e.random=()=>.079;e._fire(source,front);source.cooldown=Infinity;e.setPaused(true);arenaApp.renderer.focusAt(source);window.ascendantFixture={source,dummy};return{front:front.hp,back:back.hp,shots:e.state.projectiles.length,reduced:e.statValue(front,'damage'),until:front.statuses.find(s=>s.kind==='statReduction').until,interval:e.attackInterval(source)};
      });assert.deepEqual(radial,{front:998,back:998,shots:0,reduced:25,until:2,interval:.3});await settleFrame(page);
      const maappPoint=await clientPoint(page,{x:15,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(maappPoint.x,maappPoint.y);await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-maapp-pulse]').count(),1);await page.screenshot({path:'/tmp/oyun-arena-maapp-pulse.png',fullPage:true});screenshots.push('/tmp/oyun-arena-maapp-pulse.png');await page.locator('#inspector-close').click();
      const rectangle=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];const def=structuredClone(arenaApp.catalog.byId.get('avara'));def.stats.speed=0;const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1}),[target]=e.spawn(ascendantFixture.dummy,1,{x:17,y:14},1,{count:1}),[deep]=e.spawn(ascendantFixture.dummy,1,{x:19.8,y:14},1,{count:1});e._fire(source,target);source.cooldown=Infinity;e.setPaused(true);arenaApp.renderer.focusAt(source);window.ascendantFixture={...ascendantFixture,source,target,deep};return{hp:target.hp,deep:deep.hp,step:source.sequenceIndex,delay:e._attackDefinition(source).delay,slow:target.statuses.find(s=>s.kind==='slow').magnitude};
      });assert.deepEqual(rectangle,{hp:978,deep:978,step:1,delay:1.45,slow:.4});await settleFrame(page);await page.screenshot({path:'/tmp/oyun-arena-avara-front.png',fullPage:true});screenshots.push('/tmp/oyun-arena-avara-front.png');
      const avaraPoint=await clientPoint(page,{x:15,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(avaraPoint.x,avaraPoint.y);await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-avara-step="2"]').count(),1);assert.equal(await page.locator('#inspector [data-stat="damage"] strong').textContent(),'44');assert.equal(await page.locator('#inspector [data-stat="range"] strong').textContent(),'2.4 tiles');await page.screenshot({path:'/tmp/oyun-arena-avara-sequence.png',fullPage:true});screenshots.push('/tmp/oyun-arena-avara-sequence.png');await page.locator('#inspector-close').click();
      const fourth=await page.evaluate(()=>{const e=arenaApp.engine,{source,target,deep}=ascendantFixture;source.sequenceIndex=3;e._fire(source,target);return{target:target.hp,deep:deep.hp,cooldown:source.cooldown,step:source.sequenceIndex%4};});assert.deepEqual(fourth,{target:886,deep:978,cooldown:3.2,step:0});
      const hybrid=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];const def=structuredClone(arenaApp.catalog.byId.get('reacher'));Object.assign(def.stats,{speed:0,criticalChance:0});const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1}),[target]=e.spawn(ascendantFixture.dummy,1,{x:15.6,y:14},1,{count:1});e.step(.1);e.setPaused(true);arenaApp.renderer.focusAt(source);return{hp:target.hp,mode:source.memory.combatMode,type:e._profile(source).attackType};
      });assert.deepEqual(hybrid,{hp:976,mode:0,type:'melee'});await settleFrame(page);await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(avaraPoint.x,avaraPoint.y);await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-reacher-mode="melee"]').count(),1);await page.screenshot({path:'/tmp/oyun-arena-reacher-melee.png',fullPage:true});screenshots.push('/tmp/oyun-arena-reacher-melee.png');await page.locator('#inspector-close').click();
      await page.evaluate(()=>{delete window.ascendantFixture;arenaApp.startMatch();});await settleFrame(page);
    }

    {
      const john=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];
        const def=structuredClone(arenaApp.catalog.byId.get('john-reynolds'));Object.assign(def.stats,{speed:0,criticalChance:100});const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});
        const dummy=structuredClone(arenaApp.catalog.byId.get('hammies'));dummy.id='john-browser-target';dummy.combat.attackType='none';Object.assign(dummy.stats,{health:1000,shield:100,damage:0,range:0,speed:0,dodge:0,healrecovery:0,shieldrecovery:0});const [target]=e.spawn(dummy,1,{x:16,y:14},1,{count:1});e.step(.1);e.damage(null,source,source.maxHp*.08,{kind:'spell',bypassShield:true});e.setPaused(true);arenaApp.renderer.focusAt(source);return{hp:target.hp,shield:target.shield,calls:source.memory.johnWhinnies,taunted:target.statuses.some(s=>s.kind==='taunted'),protection:source.statuses.find(s=>s.kind==='protection').magnitude};
      });assert.deepEqual(john,{hp:961.5,shield:100,calls:1,taunted:true,protection:.25});await settleFrame(page);
      const johnPoint=await clientPoint(page,{x:15,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(johnPoint.x,johnPoint.y);await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-john-calls="1"]').count(),1);assert.equal(await page.locator('[data-status="taunt"]').count(),1);assert.equal(await page.locator('[data-status="protection"]').count(),1);await page.screenshot({path:'/tmp/oyun-arena-john-horse-call.png',fullPage:true});screenshots.push('/tmp/oyun-arena-john-horse-call.png');await page.locator('#inspector-close').click();await page.evaluate(()=>arenaApp.startMatch());await settleFrame(page);
    }

    {
      const apex=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];
        const def=structuredClone(arenaApp.catalog.byId.get('r-1'));Object.assign(def.stats,{speed:0,criticalChance:0,lifestealChance:0});const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});
        const dummy=structuredClone(arenaApp.catalog.byId.get('hammies'));dummy.id='apex-browser-target';dummy.combat.attackType='none';Object.assign(dummy.stats,{health:1000,shield:0,damage:0,range:0,speed:0,dodge:0,criticalChance:0,healrecovery:0,shieldrecovery:0});const [target]=e.spawn(dummy,1,{x:17,y:14},1,{count:1});
        e.random=()=>.99;source.memory.burstBoost={queued:true,active:false};e._fire(source,target);source.cooldown=Infinity;e.setPaused(true);arenaApp.renderer.focusAt(source);return{damage:e.state.projectiles[0].hit.damage,width:e.state.projectiles[0].width,range:e._range(source),active:source.memory.burstBoost.active};
      });assert.deepEqual(apex,{damage:77,width:1.5,range:4.6,active:true});await settleFrame(page);
      const r1Point=await clientPoint(page,{x:15,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(r1Point.x,r1Point.y);await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-r1-boost="active"]').count(),1);assert.match(await page.locator('[data-r1-boost]').textContent(),/all three bullets/);await page.screenshot({path:'/tmp/oyun-arena-apex-r1.png',fullPage:true});screenshots.push('/tmp/oyun-arena-apex-r1.png');await page.locator('#inspector-close').click();
      const apexPoison=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];
        const make=(id,side,p)=>{const def=structuredClone(arenaApp.catalog.byId.get(id));Object.assign(def.stats,{speed:0,criticalChance:0,healrecovery:0,shieldrecovery:0});const [u]=e.spawn(def,side,p,1,{count:1,positions:[p]});u.cooldown=Infinity;return u;};
        const scout=make('hammies',0,{x:14,y:14}),oct=make('willowshade/octarion',0,{x:15,y:14}),target=make('hammies',1,{x:15.5,y:14});target.hp=target.maxHp=1000;target.shield=0;e.killUnit(oct);e._drainDeaths();e.step(.9);e.setPaused(true);arenaApp.renderer.focusAt(target);return{hp:target.hp,kind:e.state.fields[0].kind,size:e.state.fields[0].shape.width};
      });assert.deepEqual(apexPoison,{hp:995,kind:'poison-cloud',size:1.5});await settleFrame(page);await page.screenshot({path:'/tmp/oyun-arena-apex-poison.png',fullPage:true});screenshots.push('/tmp/oyun-arena-apex-poison.png');
      const apexParasite=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];
        const make=(id,side,p)=>{const def=structuredClone(arenaApp.catalog.byId.get(id));Object.assign(def.stats,{speed:0,criticalChance:0,healrecovery:0,shieldrecovery:0});const [u]=e.spawn(def,side,p,1,{count:1,positions:[p]});u.cooldown=Infinity;return u;};
        make('hammies',0,{x:14,y:14});const source=make('sushu',0,{x:15,y:14}),host=make('hammies',1,{x:15.6,y:14});host.hp=host.maxHp=1000;host.shield=0;e.parasitize(source,host);e.step(1);e.setPaused(true);arenaApp.renderer.focusAt(host);return{hp:host.hp,inside:source.parasitizingId===host.id,near:e.near(host,2).includes(source),count:host.parasiteIds.length};
      });assert.deepEqual(apexParasite,{hp:984,inside:true,near:false,count:1});await settleFrame(page);
      const apexHostPoint=await clientPoint(page,{x:15.6,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(apexHostPoint.x,apexHostPoint.y);await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-parasite-host]').count(),1);await page.screenshot({path:'/tmp/oyun-arena-apex-sushu.png',fullPage:true});screenshots.push('/tmp/oyun-arena-apex-sushu.png');await page.locator('#inspector-close').click();
      const apexStolen=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];
        const make=(id,side,x)=>{const def=structuredClone(arenaApp.catalog.byId.get(id));Object.assign(def.stats,{speed:0,criticalChance:0});const [u]=e.spawn(def,side,{x,y:14},1,{count:1});u.cooldown=Infinity;return u;};const source=make('thief',0,15),donor=make('magmara',1,16);e.stealAbility(source);e.setPaused(true);arenaApp.renderer.focusAt(source);return{stolen:source.def.rootId==='thief',damage:source.stats.damage,donorDisabled:donor.passiveDisabled};
      });assert.deepEqual(apexStolen,{stolen:true,damage:20,donorDisabled:true});await settleFrame(page);
      const thiefPoint=await clientPoint(page,{x:15,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(thiefPoint.x,thiefPoint.y);await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-thief-stolen]').count(),1);assert.equal(await page.locator('#inspector-name').textContent(),'Thief');await page.locator('#inspector-close').click();
      const rotlings=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];e.teams[0].hand[0]='rotlings';e.teams[0].mana=12;
        const result=e.deploy(0,0,{x:7,y:14});for(const u of result.units){u.stats.speed=0;u.cooldown=Infinity;}
        const adults=result.units.filter(u=>u.def.id==='rotlings'),minis=result.units.filter(u=>u.def.id==='rotlings/mini-rotters');
        const dummy=structuredClone(arenaApp.catalog.byId.get('hammies'));dummy.id='rotlings-browser-target';dummy.combat.attackType='none';Object.assign(dummy.stats,{health:1000,shield:0,damage:0,range:4000,speed:0,dodge:0,criticalChance:0,healrecovery:0,shieldrecovery:0});
        const [target]=e.spawn(dummy,1,{x:minis[0].x+.35,y:minis[0].y},1,{count:1});target.cooldown=Infinity;
        e.killUnit(minis[0]);e._drainDeaths();e.step(.2);e.setPaused(true);arenaApp.renderer.focusAt(adults[0]);window.rotlingsBrowserIds={adult:adults[0].id,mini:minis[1].id,target:target.id};
        return{ok:result.ok,adults:adults.length,minis:minis.length,spent:e.teams[0].spentMana,mist:e.state.fields[0].kind,size:e.state.fields[0].shape.width,range:e._range(target),expires:e.state.fields[0].until};
      });assert.deepEqual(rotlings,{ok:true,adults:3,minis:3,spent:9,mist:'blinding-mist',size:2,range:3,expires:5});await settleFrame(page);await page.screenshot({path:'/tmp/oyun-arena-rotlings-mist.png',fullPage:true});screenshots.push('/tmp/oyun-arena-rotlings-mist.png');
      const rotterSpot=await page.evaluate(()=>{const u=arenaApp.engine.units.find(u=>u.id===rotlingsBrowserIds.mini);return{x:u.x,y:u.y};});const rotterPoint=await clientPoint(page,rotterSpot);await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(rotterPoint.x,rotterPoint.y);await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-rotter-mist]').count(),1);assert.equal(await page.locator('[data-rotter-growth]').count(),0);assert.match(await page.locator('[data-rotter-mist]').textContent(),/Lasts 5s/);await page.locator('#inspector-close').click();
      const rotlingBonus=await page.evaluate(()=>{const e=arenaApp.engine;e.setPaused(true);const target=e.units.find(u=>u.id===rotlingsBrowserIds.target);e.killUnit(target);e._drainDeaths();const u=e.units.find(u=>u.id===rotlingsBrowserIds.adult);arenaApp.renderer.focusAt(u);return{x:u.x,y:u.y,damage:u.stats.damage};});assert.equal(rotlingBonus.damage,15);await settleFrame(page);const adultPoint=await clientPoint(page,rotlingBonus);await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(adultPoint.x,adultPoint.y);await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-rotlings-bonus="1"]').count(),1);assert.match(await page.locator('[data-rotlings-bonus]').textContent(),/20-second/);await page.screenshot({path:'/tmp/oyun-arena-rotlings-bonus.png',fullPage:true});screenshots.push('/tmp/oyun-arena-rotlings-bonus.png');await page.locator('#inspector-close').click();
      const orbital=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];for(const c of e.castles)c.cooldown=Infinity;
        const def=structuredClone(arenaApp.catalog.byId.get('dumpsy'));Object.assign(def.stats,{speed:0,criticalChance:0,lifestealChance:0});const[u]=e.spawn(def,0,{x:15,y:14},1,{count:1,deploymentNumber:2});u.cooldown=Infinity;
        const loot=structuredClone(arenaApp.catalog.byId.get('hammies'));loot.id='late-browser-loot';const[drop]=e.spawn(loot,1,{x:20,y:14},1,{count:1});e.killUnit(drop);e._drainDeaths();e.step(.2);e.setPaused(true);arenaApp.renderer.focusAt(u);return{fixed:u.memory.dumpFixed.length,loot:u.memory.dumpLoot.length,ordinal:u.deploymentNumber};
      });assert.deepEqual(orbital,{fixed:3,loot:1,ordinal:2});await settleFrame(page);await page.screenshot({path:'/tmp/oyun-arena-dumpsy-orbits.png',fullPage:true});screenshots.push('/tmp/oyun-arena-dumpsy-orbits.png');const dumpsyPoint=await clientPoint(page,{x:15,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(dumpsyPoint.x,dumpsyPoint.y);await page.locator('[data-dumpsy-items]').waitFor();assert.equal(await page.locator('[data-emergent-deployment="2"]').count(),1);await page.locator('#inspector-close').click();
      const fused=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];const def=structuredClone(arenaApp.catalog.byId.get('mr-and-mrs-ray/type1'));Object.assign(def.stats,{speed:0,criticalChance:0});const made=e.spawn(def,0,{x:15,y:14},1,{count:1});for(const u of made){u.stats.speed=0;u.cooldown=Infinity;u.memory.rayCharge=100;}e._hook('tick',made[0],0);e.step(.3);e.setPaused(true);arenaApp.renderer.focusAt(made[0]);return{pool:e.maxHealth(made[0]),hidden:made[1].fusedInto===made[0].id,shared:e.state.sharedVitals.length};
      });assert.deepEqual(fused,{pool:620,hidden:true,shared:1});await settleFrame(page);await page.screenshot({path:'/tmp/oyun-arena-rays-fusion.png',fullPage:true});screenshots.push('/tmp/oyun-arena-rays-fusion.png');
      const banked=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];
        const def=structuredClone(arenaApp.catalog.byId.get('whisper'));Object.assign(def.stats,{speed:0,criticalChance:5});const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});
        e.setPaused(true);arenaApp.renderer.focusAt(source);return{chance:source.stats.criticalChance,bonus:source.whisperState.bonusSeconds};
      });
      assert.deepEqual(banked,{chance:0,bonus:5});await settleFrame(page);
      const whisperPoint=await clientPoint(page,{x:15,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(whisperPoint.x,whisperPoint.y);
      await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-whisper-bonus="5"]').count(),1);assert.match(await page.locator('[data-whisper-bonus]').textContent(),/Critical damage: Disabled/);
      await page.screenshot({path:'/tmp/oyun-arena-whisper-bank.png',fullPage:true});screenshots.push('/tmp/oyun-arena-whisper-bank.png');await page.locator('#inspector-close').click();
      const possession=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];
        const def=structuredClone(arenaApp.catalog.byId.get('whisper'));Object.assign(def.stats,{speed:0,criticalChance:5});const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});
        const dummy=structuredClone(arenaApp.catalog.byId.get('hammies'));dummy.id='whisper-browser-host';dummy.combat.attackType='none';Object.assign(dummy.stats,{health:1000,shield:100,damage:0,range:0,speed:0,dodge:0,criticalChance:40,healrecovery:0,shieldrecovery:0});
        const [target]=e.spawn(dummy,1,{x:16.5,y:14},1,{count:1});target.hp=780;target.shield=40;e.possess(source,target);e.step(2);e.cleanse(target);e.status(target,'predominance',30);source.stats.criticalChance=4;e.step(1/30);e.setPaused(true);arenaApp.renderer.focusAt(target);window.whisperFixture={source,target,dummy};
        return{side:target.side,sourceVisible:e.canSee(source,source),hostChance:target.stats.criticalChance,bonus:source.whisperState.bonusSeconds,deadline:source.whisperState.until,penalty:source.whisperState.penalized,hp:target.hp,shield:target.shield};
      });
      assert.deepEqual(possession,{side:0,sourceVisible:false,hostChance:40,bonus:9,deadline:17.75,penalty:true,hp:780,shield:40});await settleFrame(page);
      await page.screenshot({path:'/tmp/oyun-arena-whisper-possession.png',fullPage:true});screenshots.push('/tmp/oyun-arena-whisper-possession.png');
      const hostPoint=await clientPoint(page,{x:16.5,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(hostPoint.x,hostPoint.y);
      await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-whisper-control]').count(),1);assert.equal(await page.locator('[data-status="possession"]').count(),1);assert.match(await page.locator('[data-whisper-control]').textContent(),/Critical conversion: \+9s.*Duration penalty: 25%/);assert.equal(await page.locator('#inspector-name').textContent(),'Hammies');
      await page.screenshot({path:'/tmp/oyun-arena-whisper-control.png',fullPage:true});screenshots.push('/tmp/oyun-arena-whisper-control.png');await page.locator('#inspector-close').click();
      const restored=await page.evaluate(()=>{
        const e=arenaApp.engine,{source,target}=whisperFixture;target.hp=611;target.shield=17;e.setPaused(false);e.step(Math.max(0,source.whisperState.until-e.time)+1/30);e.setPaused(true);
        return{side:target.side,hp:target.hp,shield:target.shield,sourceAlive:source.alive,sourceInWorld:e.units.includes(source),marker:target.statuses.some(s=>s.kind==='possession')};
      });
      assert.deepEqual(restored,{side:1,hp:611,shield:17,sourceAlive:false,sourceInWorld:false,marker:false});
      const earlyDeath=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];const def=structuredClone(arenaApp.catalog.byId.get('whisper'));def.stats.speed=0;const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1}),[target]=e.spawn(whisperFixture.dummy,1,{x:16.5,y:14},1,{count:1});
        e.possess(source,target);e.damage(null,target,10000,{kind:'spell'});e._drainDeaths();e.setPaused(true);return{hostAlive:target.alive,sourceAlive:source.alive,units:e.units.length,deaths:e.state.events.filter(s=>s.type==='death').length};
      });
      assert.deepEqual(earlyDeath,{hostAlive:false,sourceAlive:false,units:0,deaths:2});await page.evaluate(()=>{delete window.whisperFixture;arenaApp.startMatch();});await settleFrame(page);
    }

    {
      const crew=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];e.teams[0].hand[0]='corsair-crew';const result=e.deploy(0,0,{x:7,y:14});if(!result.ok)throw Error(result.error);
        e.setPaused(true);arenaApp.renderer.focusAt(result.units[0]);return{ids:result.units.map(u=>u.def.id),spent:e.teams[0].spentMana,groups:new Set(result.units.map(u=>u.groupId)).size};
      });
      assert.deepEqual(crew,{ids:['corsair-crew','corsair-crew/pirate-girls','corsair-crew/pirate-girls'],spent:12,groups:1});await settleFrame(page);
      await page.screenshot({path:'/tmp/oyun-arena-corsair-formation.png',fullPage:true});screenshots.push('/tmp/oyun-arena-corsair-formation.png');
      const crewPoint=await clientPoint(page,{x:7,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(crewPoint.x,crewPoint.y);
      await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-corsair-crew="3"]').count(),1);await page.locator('#inspector-close').click();
      const deflected=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];
        const def=structuredClone(arenaApp.catalog.byId.get('corsair-crew'));Object.assign(def.stats,{speed:0,criticalChance:100,lifestealChance:0});const made=e.spawn(def,0,{x:15,y:14},1,{count:1});for(const u of made){u.cooldown=Infinity;u.stats.speed=0;}
        const source=made[0],dummy=structuredClone(arenaApp.catalog.byId.get('hammies'));dummy.id='corsair-browser-target';dummy.combat.attackType='ranged';Object.assign(dummy.stats,{health:1000,shield:0,damage:40,range:6000,attackSpeed:1,speed:0,criticalChance:0,dodge:0,healrecovery:0});
        const [attacker]=e.spawn(dummy,1,{x:18,y:14},1,{count:1});attacker.cooldown=Infinity;e.random=()=>.5;e._fire(attacker,source);e.step(.4);e.setPaused(true);arenaApp.renderer.focusAt(source);window.corsairFixture={source,attacker,dummy};
        return{hp:source.hp,reflected:source.memory.reflectedShots,flight:e.state.projectiles.some(p=>p.reflected)};
      });
      assert.deepEqual(deflected,{hp:430,reflected:1,flight:true});await settleFrame(page);
      await page.screenshot({path:'/tmp/oyun-arena-corsair-return.png',fullPage:true});screenshots.push('/tmp/oyun-arena-corsair-return.png');
      const corsairPoint=await clientPoint(page,{x:15,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(corsairPoint.x,corsairPoint.y);
      await page.locator('#inspector').waitFor({state:'visible'});assert.match(await page.locator('[data-corsair-crew]').textContent(),/Reflected shots: 1/);await page.locator('#inspector-close').click();
      const returnedHp=await page.evaluate(()=>{const e=arenaApp.engine;e.setPaused(false);e.step(.5);e.setPaused(true);return corsairFixture.attacker.hp;});assert.equal(returnedHp,960);
      const distant=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];
        const def=structuredClone(arenaApp.catalog.byId.get('corsair-crew/pirate-girls'));Object.assign(def.stats,{speed:0,criticalChance:0,lifestealChance:0});const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});
        const dummy=structuredClone(corsairFixture.dummy);dummy.combat.attackType='none';dummy.stats.range=0;dummy.stats.damage=0;const [target]=e.spawn(dummy,1,{x:17.75,y:14},1,{count:1});e._fire(source,target);source.cooldown=Infinity;e.step(.5);e.setPaused(true);arenaApp.renderer.focusAt(source);window.corsairFixture={dummy};
        return{hp:target.hp,base:source.stats.damage,bonus:source.memory.distanceBonus};
      });
      assert.deepEqual(distant,{hp:972,base:16,bonus:.75});await settleFrame(page);
      const girlPoint=await clientPoint(page,{x:15,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(girlPoint.x,girlPoint.y);
      await page.locator('#inspector').waitFor({state:'visible'});assert.match(await page.locator('[data-pirate-distance]').textContent(),/\+75%/);await page.screenshot({path:'/tmp/oyun-arena-pirate-distance.png',fullPage:true});screenshots.push('/tmp/oyun-arena-pirate-distance.png');await page.locator('#inspector-close').click();
      const rogueBlind=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];
        const def=structuredClone(arenaApp.catalog.byId.get('roguex'));Object.assign(def.stats,{speed:0,criticalChance:0,lifestealChance:0});const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});
        const dummy=structuredClone(corsairFixture.dummy);Object.assign(dummy.stats,{range:4000,vision:8000});const [target]=e.spawn(dummy,1,{x:18,y:14},1,{count:1});e.random=()=>.4;e._fire(source,target);source.cooldown=Infinity;e.step(.5);e.setPaused(true);arenaApp.renderer.focusAt(target);const status=target.statuses.find(s=>s.kind==='blind');return{hp:target.hp,magnitude:status.magnitude,range:e._range(target)};
      });
      assert.deepEqual(rogueBlind,{hp:984,magnitude:.25,range:3});await settleFrame(page);
      const roguePoint=await clientPoint(page,{x:18,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(roguePoint.x,roguePoint.y);
      await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-status="blind"]').count(),1);assert.equal(await page.locator('#inspector [data-stat="range"] strong').textContent(),'3 tiles');assert.equal(await page.locator('#inspector [data-stat="vision"] strong').textContent(),'6 tiles');
      await page.screenshot({path:'/tmp/oyun-arena-rogue-blind.png',fullPage:true});screenshots.push('/tmp/oyun-arena-rogue-blind.png');await page.locator('#inspector-close').click();
      await page.evaluate(()=>{delete window.corsairFixture;arenaApp.startMatch();});await settleFrame(page);
    }

    {
      const held=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];
        const def=structuredClone(arenaApp.catalog.byId.get('tornado'));Object.assign(def.stats,{speed:0,criticalChance:0,lifestealChance:0});
        const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});source.hp=175;e._hook('tick',source,0);
        const dummy=structuredClone(arenaApp.catalog.byId.get('hammies'));dummy.id='vortex-browser-target';dummy.combat.attackType='none';Object.assign(dummy.stats,{health:1000,shield:0,damage:0,range:0,speed:0,dodge:0,healrecovery:0});
        const [target]=e.spawn(dummy,1,{x:16,y:14},1,{count:1}),[other]=e.spawn(dummy,1,{x:16.1,y:14},1,{count:1});e._fire(source,target);source.cooldown=Infinity;e.setPaused(true);arenaApp.renderer.focusAt(source);window.vortexFixture={source,target,other};
        return{held:target.engulfedBy===source.id,hp:target.hp,splashHp:other.hp,captiveDamage:e.damage(target,source,100,{kind:'spell'}).total};
      });
      assert.deepEqual(held,{held:true,hp:994,splashHp:997,captiveDamage:0});await settleFrame(page);
      const tornadoPoint=await clientPoint(page,{x:15,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(tornadoPoint.x,tornadoPoint.y);
      await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-tornado-captives="1"]').count(),1);assert.equal(await page.locator('#inspector [data-stat="damage"] strong').textContent(),'10 × 6');assert.equal(await page.locator('#inspector [data-stat="attackSpeed"] strong').textContent(),'0.25s');
      await page.screenshot({path:'/tmp/oyun-arena-tornado-vortex.png',fullPage:true});screenshots.push('/tmp/oyun-arena-tornado-vortex.png');await page.locator('#inspector-close').click();
      const released=await page.evaluate(()=>{const e=arenaApp.engine,{source,target,other}=vortexFixture;e.setPaused(true);for(let i=0;i<9;i++)e._fire(source,target);return{held:!!target.engulfedBy,hp:target.hp,splashHp:other.hp,x:target.x,attacks:source.attacks};});
      assert.equal(released.held,false);assert.equal(released.hp,940);assert.equal(released.splashHp,970);assert.ok(Math.abs(released.x-18.5)<1e-7);assert.equal(released.attacks,1);
      const egg=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];
        const def=structuredClone(arenaApp.catalog.byId.get('tphoenix'));Object.assign(def.stats,{speed:0,criticalChance:0,lifestealChance:0});const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});
        const result=e.damage(null,source,361,{kind:'spell'});e.step(2);e.setPaused(true);arenaApp.renderer.focusAt(source);window.vortexFixture={source};return{id:source.def.id,hp:source.hp,killed:result.killed,remaining:source.memory.rebirth.hatchAt-e.time};
      });
      assert.equal(egg.id,'tphoenix/fire-egg');assert.equal(egg.hp,360);assert.equal(egg.killed,false);assert.ok(Math.abs(egg.remaining-8)<1e-7);await settleFrame(page);
      const eggPoint=await clientPoint(page,{x:15,y:14});await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(eggPoint.x,eggPoint.y);
      await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-phoenix-egg]').count(),1);assert.match(await page.locator('[data-phoenix-egg]').textContent(),/Hatching.*25% Max Health/);assert.equal(await page.locator('#inspector-name').textContent(),'Fire Egg');
      await page.screenshot({path:'/tmp/oyun-arena-fire-egg.png',fullPage:true});screenshots.push('/tmp/oyun-arena-fire-egg.png');await page.locator('#inspector-close').click();
      const restored=await page.evaluate(()=>{const e=arenaApp.engine,{source}=vortexFixture;e.setPaused(true);const result=e.damage(null,source,1000,{kind:'spell'});return{id:source.def.id,hp:source.hp,max:source.maxHp,killed:result.killed,cycles:source.memory.rebirth.cycles};});
      assert.deepEqual(restored,{id:'tphoenix',hp:120,max:480,killed:false,cycles:1});await settleFrame(page);
      await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(eggPoint.x,eggPoint.y);await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-phoenix-cycles="1"]').count(),1);assert.equal(await page.locator('#inspector [data-stat="health"] strong').textContent(),'120 / 480');
      await page.screenshot({path:'/tmp/oyun-arena-phoenix-restoration.png',fullPage:true});screenshots.push('/tmp/oyun-arena-phoenix-restoration.png');await page.locator('#inspector-close').click();
      const used=await page.evaluate(()=>{const e=arenaApp.engine,{source}=vortexFixture;e.setPaused(true);e.damage(null,source,1,{kind:'spell'});e._hook('tick',source,0);return{id:source.def.id,hp:source.hp,used:source.phoenixEggUsed};});assert.deepEqual(used,{id:'tphoenix',hp:119,used:true});
      const phoenix=await page.evaluate(()=>{
        arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];const def=structuredClone(arenaApp.catalog.byId.get('tphoenix'));Object.assign(def.stats,{speed:0,criticalChance:0,lifestealChance:0});const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});
        e.damage(null,source,361,{kind:'spell'});e.step(10);e.setPaused(true);return{id:source.def.id,hp:source.hp,movement:source.def.combat.movementType,deaths:e.state.events.filter(v=>v.type==='death').length};
      });
      assert.deepEqual(phoenix,{id:'tphoenix/phoenix',hp:240,movement:'flying',deaths:0});await settleFrame(page);
      await page.evaluate(()=>{delete window.vortexFixture;arenaApp.startMatch();});await settleFrame(page);
    }

    const magmaWalk=await page.evaluate(()=>{
      const e=arenaApp.engine;e.bot=false;e.state.units=[];e.state.projectiles=[];e.setPaused(false);
      const def=structuredClone(arenaApp.catalog.byId.get('magma'));def.stats.criticalChance=0;
      const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});source.cooldown=Infinity;e.step(2);source.stats.speed=0;
      const dummy=structuredClone(arenaApp.catalog.byId.get('hammies'));dummy.id='fire-target';Object.assign(dummy.stats,{health:1000,shield:0,speed:0,damage:0,range:0,dodge:0,healrecovery:0});dummy.combat.attackType='none';
      const [target]=e.spawn(dummy,1,{x:15.4,y:14},1,{count:1});e.step(1);e.setPaused(true);arenaApp.renderer.focusAt(source);window.flameFixture={source,target,dummy};
      return{hp:source.hp,enemyHp:target.hp,width:e.state.trails[0].width,segments:e.state.trails[0].segments.length,walked:source.x-15};
    });
    assert.equal(magmaWalk.hp,740);assert.equal(magmaWalk.enemyHp,997);assert.equal(magmaWalk.width,1.5);assert.equal(magmaWalk.segments,60);assert.ok(magmaWalk.walked>1.5);
    await settleFrame(page);await page.screenshot({path:'/tmp/oyun-arena-magma-trail.png',fullPage:true});screenshots.push('/tmp/oyun-arena-magma-trail.png');
    const magmaPoint=await clientPoint(page,await page.evaluate(()=>({x:flameFixture.source.x,y:flameFixture.source.y})));await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(magmaPoint.x,magmaPoint.y);
    await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-magma-trail]').count(),1);assert.match(await page.locator('[data-magma-trail]').textContent(),/1.5 tiles.*10 seconds.*3 damage/);
    await page.locator('#inspector-close').click();
    await page.evaluate(()=>{const e=arenaApp.engine;e.setPaused(true);e.leaveTrail(flameFixture.source,{x:30,y:14},{x:31,y:14},{width:1.5,duration:10,damage:3,interval:1});});
    const hiddenFire=await pixelAt(page,{x:30.5,y:14});assert.ok(hiddenFire.every(value=>value<12),'distant flame does not expose fog');
    const fallenMark=await page.evaluate(()=>{
      arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];e.state.projectiles=[];e.setPaused(false);
      const def=structuredClone(arenaApp.catalog.byId.get('fallen-angel'));Object.assign(def.stats,{criticalChance:0,lifestealChance:0});
      const [source]=e.spawn(def,0,{x:15,y:14},1,{count:1});
      const [wounded]=e.spawn(flameFixture.dummy,1,{x:16.8,y:14},1,{count:1});wounded.hp=500;
      const other=structuredClone(flameFixture.dummy);other.stats.health=600;
      const [chosen]=e.spawn(other,1,{x:18,y:14},1,{count:1});e.step(1/30);
      while((source.memory.fallenStacks||0)<5&&e.time<12)e.step(1/30);
      e.setPaused(true);arenaApp.renderer.focusAt(source);window.flameFixture={source,chosen,wounded};
      return{chosen:source.targetId===chosen.id,stacks:source.memory.fallenStacks,interval:e.attackInterval(source),hp:chosen.hp,point:{x:source.x,y:source.y}};
    });
    assert.equal(fallenMark.chosen,true);assert.equal(fallenMark.hp,530);assert.equal(fallenMark.stacks,5);assert.ok(Math.abs(fallenMark.interval-.8/1.05)<1e-7);await settleFrame(page);
    const fallenPoint=await clientPoint(page,fallenMark.point);await page.evaluate(()=>arenaApp.engine.setPaused(false));await page.mouse.click(fallenPoint.x,fallenPoint.y);
    await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-fallen-stacks="5"]').count(),1);assert.equal(await page.locator('#inspector [data-stat="attackSpeed"] strong').textContent(),'0.762s');
    await page.screenshot({path:'/tmp/oyun-arena-fallen-mark.png',fullPage:true});screenshots.push('/tmp/oyun-arena-fallen-mark.png');await page.locator('#inspector-close').click();
    const fallenReset=await page.evaluate(()=>{const e=arenaApp.engine,{source,chosen,wounded}=flameFixture;e.damage(null,chosen,5000,{kind:'spell',bypassShield:true});e._drainDeaths();e.setPaused(false);e.step(1/30);e.setPaused(true);return{stacks:source.memory.fallenStacks,next:source.targetId===wounded.id};});
    assert.deepEqual(fallenReset,{stacks:0,next:true});await page.evaluate(()=>{delete window.flameFixture;arenaApp.startMatch();});await settleFrame(page);

    // A real flyer engages units in its deployed outer lane, then resumes that
    // corridor. Gloop hides captives, reports its count/lifetime, and releases.
    const flight=await page.evaluate(()=>{
      const e=arenaApp.engine;e.bot=false;e.state.units=[];e.state.projectiles=[];e.state.effects=[];
      const [flyer]=e.spawn(arenaApp.catalog.byId.get('hornets'),0,{x:11,y:4},0,{count:1});
      const def=structuredClone(arenaApp.catalog.byId.get('hammies'));def.id='flight-target';
      Object.assign(def.stats,{health:1000,shield:0,speed:0,damage:0,range:0,dodge:0,healrecovery:0});def.combat.attackType='none';
      const [target]=e.spawn(def,1,{x:11.8,y:4},0,{count:1});
      e.step(3);const hp=target.hp;e.damage(null,target,10000,{kind:'spell'});e.step(4);e.setPaused(true);arenaApp.renderer.focusAt(flyer);
      return {hp,x:flyer.x,y:flyer.y,lane:flyer.lane,shots:flyer.shots};
    });
    assert.ok(flight.hp<1000);assert.ok(flight.x>12);assert.ok(Math.abs(flight.y-4)<.26);assert.equal(flight.lane,0);assert.ok(flight.shots>0);
    await settleFrame(page);await page.screenshot({path:'/tmp/oyun-arena-flying-lane.png',fullPage:true});screenshots.push('/tmp/oyun-arena-flying-lane.png');
    const engulfed=await page.evaluate(()=>{
      const e=arenaApp.engine;e.state.units=[];e.state.projectiles=[];e.state.effects=[];e.setPaused(false);
      const [gloop]=e.spawn(arenaApp.catalog.byId.get('gloop'),0,{x:17,y:14},1,{count:1});gloop.stats.speed=0;
      const def=structuredClone(arenaApp.catalog.byId.get('hammies'));def.id='gloop-target';
      Object.assign(def.stats,{health:1000,shield:0,speed:0,damage:0,range:0,dodge:0,healrecovery:0});def.combat.attackType='none';
      const [target]=e.spawn(def,1,{x:17.4,y:14},1,{count:1});e.step(1);e.setPaused(true);arenaApp.renderer.focusAt(gloop);
      window.gloopFixture={gloop,target};
      return {hp:target.hp,hostHp:gloop.hp,captive:target.engulfedBy===gloop.id,count:e.captivesOf(gloop).length};
    });
    assert.equal(engulfed.captive,true);assert.equal(engulfed.count,1);assert.equal(engulfed.hp,990);assert.equal(engulfed.hostHp,990);
    await settleFrame(page);
    assert.equal(await page.evaluate(()=>arenaApp.renderer.shotTimes.has(gloopFixture.target.id)),false,'a swallowed portrait is not rendered');
    await page.screenshot({path:'/tmp/oyun-arena-gloop-captive.png',fullPage:true});screenshots.push('/tmp/oyun-arena-gloop-captive.png');
    await page.evaluate(()=>arenaApp.engine.setPaused(false));
    const gloopPoint=await clientPoint(page,{x:17,y:14});await page.mouse.click(gloopPoint.x,gloopPoint.y);
    await page.locator('#inspector').waitFor({state:'visible'});
    assert.equal(await page.locator('#inspector-name').textContent(),'Gloop');
    assert.equal(await page.locator('[data-engulfed-count="1"]').count(),1);
    const life=parseFloat(await page.locator('#inspector [data-stat="life"] strong').textContent());
    assert.ok(life>=98&&life<=99,'the inspector shows Gloop\'s remaining lifetime');
    await page.screenshot({path:'/tmp/oyun-arena-gloop-inspector.png',fullPage:true});screenshots.push('/tmp/oyun-arena-gloop-inspector.png');
    await page.locator('#inspector-close').click();
    const released=await page.evaluate(()=>{
      const e=arenaApp.engine,{gloop,target}=gloopFixture;e.setPaused(false);e.damage(null,gloop,10000,{kind:'spell'});e.step(1/30);e.setPaused(true);
      return {hostAlive:gloop.alive,captive:!!target.engulfedBy,alive:target.alive,hp:target.hp};
    });
    assert.equal(released.hostAlive,false);assert.equal(released.captive,false);assert.equal(released.alive,true);assert.equal(released.hp,840);
    await page.evaluate(()=>{delete window.gloopFixture;arenaApp.startMatch();});await settleFrame(page);

    // Current vision is rendered, inspected and reported consistently. Freeze
    // this fixture without the pause overlay so actual canvas pixels are tested.
    assert.equal(await page.locator('#enemy-castle-hp').textContent(),'?');
    assert.equal(await page.locator('#node-hud [data-owner="unknown"]').count(),3);
    assert.ok((await pixelAt(page,{x:21.5,y:14})).every(channel=>channel<12),'unseen center terrain is opaque black');
    assert.ok((await pixelAt(page,{x:7,y:14})).some(channel=>channel>30),'the castle reveals the starting courtyard');
    await page.evaluate(()=>{
      const e=arenaApp.engine;e.bot=false;e.setPaused(true);e.state.units=[];e.state.projectiles=[];e.state.effects=[];
      const def=structuredClone(arenaApp.catalog.byId.get('hammies'));
      def.id='fog-fixture';def.name='Fog Target';Object.assign(def.stats,{health:1000,shield:0,speed:0,damage:0,range:0});
      def.combat.movementType='flying';def.combat.attackType='none';
      const [enemy]=e.spawn(def,1,{x:32,y:14},1,{count:1});
      e.state.castles[1].hp=777;e.state.time+=.2;
      window.fogFixture={enemy,def};
    });
    await settleFrame(page);
    await focusCamera(page,{x:32,y:14});
    let hiddenEnemy=await clientPoint(page,{x:32,y:14});
    assert.ok((await minimapPixelAt(page,{x:32,y:14})).every(channel=>channel<35),'the minimap does not expose an unseen enemy marker');
    await page.evaluate(()=>arenaApp.engine.setPaused(false));
    await page.mouse.click(hiddenEnemy.x,hiddenEnemy.y);
    assert.equal(await page.locator('#inspector').isVisible(),false,'clicking an unseen enemy does not disclose its identity');
    await page.evaluate(()=>{
      const e=arenaApp.engine;e.setPaused(true);
      [window.fogFixture.scout]=e.spawn(window.fogFixture.def,0,{x:24.5,y:14},1,{count:1});e.state.time+=.2;
    });
    await settleFrame(page);
    assert.ok((await pixelAt(page,{x:30,y:14})).some(channel=>channel>30),'a scout reveals terrain within eight tiles');
    const enemyMarker=await minimapPixelAt(page,{x:32,y:14});
    assert.ok(enemyMarker[0]>140&&enemyMarker[0]>enemyMarker[1]*1.5,`a visible enemy appears as a red minimap marker: ${JSON.stringify(enemyMarker)}`);
    hiddenEnemy=await clientPoint(page,{x:32,y:14});
    await page.evaluate(()=>arenaApp.engine.setPaused(false));
    await page.mouse.click(hiddenEnemy.x,hiddenEnemy.y);
    assert.equal(await page.locator('#inspector').isVisible(),true,'a revealed enemy can be inspected');
    assert.equal(await page.locator('#inspector-name').textContent(),'Fog Target');
    await page.locator('#inspector-close').click();
    await page.evaluate(()=>{const e=arenaApp.engine;e.setPaused(true);window.fogFixture.scout.x=32;e.state.time+=.2;});
    await page.waitForFunction(()=>document.getElementById('enemy-castle-hp').textContent==='777');
    await page.evaluate(()=>{window.fogFixture.scout.alive=false;arenaApp.engine.state.time+=.2;});
    await page.waitForFunction(()=>document.getElementById('enemy-castle-hp').textContent==='?');
    assert.ok((await pixelAt(page,{x:30,y:14})).every(channel=>channel<12),'losing the scout hides previously seen terrain again');
    await page.evaluate(()=>{const e=arenaApp.engine;e.state.units=[];e.state.nodes[1].owner=0;e.state.time+=.2;});
    await page.waitForFunction(()=>document.querySelectorAll('#node-hud [data-owner="0"]').length===1);
    assert.ok((await pixelAt(page,{x:24.5,y:14})).some(channel=>channel>30),'a captured pump reveals ground inside four tiles');
    assert.ok((await pixelAt(page,{x:25.6,y:14})).every(channel=>channel<12),'a pump does not reveal past four tiles');
    await page.evaluate(()=>{arenaApp.engine.state.nodes[1].owner=1;arenaApp.engine.state.time+=.2;});
    await page.waitForFunction(()=>document.querySelectorAll('#node-hud [data-owner="unknown"]').length===3);
    assert.ok((await pixelAt(page,{x:24.5,y:14})).every(channel=>channel<12),'losing the pump removes its vision immediately');
    await page.evaluate(()=>{
      const e=arenaApp.engine;e.state.nodes[1].owner=0;
      e.spawn(window.fogFixture.def,0,{x:14,y:14},1,{count:1});e.state.time+=.2;
    });
    await settleFrame(page);
    await focusCamera(page,{x:12,y:14});
    await page.screenshot({path:'/tmp/oyun-arena-fog-desktop.png',fullPage:true});screenshots.push('/tmp/oyun-arena-fog-desktop.png');
    await page.evaluate(()=>{delete window.fogFixture;arenaApp.startMatch();});
    await settleFrame(page);

    // A keyboard-selected card is deployed by clicking its real map position.
    const choice=await page.evaluate(()=>{
      const t=arenaApp.engine.state.teams[0];
      return t.hand.map((id,index)=>({id,index,cost:arenaApp.catalog.byId.get(id).stats.mana})).find(c=>c.cost<=t.mana);
    });
    assert.ok(choice,'opening hand contains an affordable card');
    const before=await page.evaluate(()=>({mana:arenaApp.engine.state.teams[0].mana,energy:arenaApp.engine.state.teams[0].energy,hand:[...arenaApp.engine.state.teams[0].hand],queue:[...arenaApp.engine.state.teams[0].queue]}));
    await page.keyboard.press(String(choice.index+1));
    const valid=await clientPoint(page,{x:6.5,y:14});
    await page.mouse.click(valid.x,valid.y);
    await page.waitForFunction(()=>arenaApp.engine.state.teams[0].energy>0);
    const after=await page.evaluate(()=>({mana:arenaApp.engine.state.teams[0].mana,energy:arenaApp.engine.state.teams[0].energy,hand:[...arenaApp.engine.state.teams[0].hand],queue:[...arenaApp.engine.state.teams[0].queue],units:arenaApp.engine.state.units.filter(u=>u.side===0)}));
    assert.ok(Math.abs(after.energy-before.energy-Math.round(choice.cost/18*20)/20)<1e-8);
    assert.ok(after.mana>=before.mana-choice.cost && after.mana<before.mana-choice.cost+.5);
    assert.equal(after.hand[choice.index],before.queue[0]);
    assert.equal(after.queue.at(-1),choice.id);
    assert.ok(after.units.length>0);

    // The cleared courtyard also accepts a deployment behind the castle.
    const rearChoice=await page.evaluate(()=>{
      const t=arenaApp.engine.state.teams[0];
      return t.hand.map((id,index)=>({id,index,cost:arenaApp.catalog.byId.get(id).stats.mana})).filter(c=>c.cost<=t.mana).sort((a,b)=>a.cost-b.cost)[0];
    });
    assert.ok(rearChoice,'the opening cycle can afford a second courtyard deployment');
    const rear=await clientPoint(page,{x:2.2,y:14});
    const rearHand=await page.locator(`[data-hand-index="${rearChoice.index}"]`).boundingBox();
    await page.mouse.move(rearHand.x+rearHand.width/2,rearHand.y+rearHand.height/2);await page.mouse.down();
    await page.mouse.move(rear.x,rear.y,{steps:8});await page.mouse.up();
    await page.waitForFunction(energy=>arenaApp.engine.state.teams[0].energy>energy,after.energy);
    const rearAfter=await page.evaluate(()=>({energy:arenaApp.engine.state.teams[0].energy,hand:[...arenaApp.engine.state.teams[0].hand],queue:[...arenaApp.engine.state.teams[0].queue]}));
    assert.ok(Math.abs(rearAfter.energy-after.energy-Math.round(rearChoice.cost/18*20)/20)<1e-8,'rear placement spends mana and earns energy exactly once');
    assert.equal(rearAfter.queue.at(-1),rearChoice.id);

    // An own-side road remains invalid outside the castle's 7.5-tile radius.
    // This fixture funds the hand so affordability cannot mask a placement error.
    const outsideRoad=await page.evaluate(async()=>{
      arenaApp.engine.state.teams[0].mana=20;
      const {MAP,distance,closestRoute}=await import('./js/map.mjs');
      const base=MAP.bases[0],radius=8.5;
      for(let i=1;i<MAP.routes[0].length;i++){
        const a=MAP.routes[0][i-1],b=MAP.routes[0][i],dx=b.x-a.x,dy=b.y-a.y,ox=a.x-base.x,oy=a.y-base.y;
        const aa=dx*dx+dy*dy,bb=2*(ox*dx+oy*dy),cc=ox*ox+oy*oy-radius*radius;
        const discriminant=bb*bb-4*aa*cc;
        if(discriminant<0||aa===0)continue;
        for(const t of [(-bb-Math.sqrt(discriminant))/(2*aa),(-bb+Math.sqrt(discriminant))/(2*aa)]){
          if(t<0||t>1)continue;
          const point={x:a.x+dx*t,y:a.y+dy*t};
          if(point.x<21.5)return {...point,castleDistance:distance(base,point),roadDistance:closestRoute(point).distance};
        }
      }
      throw Error('No own-side road crosses the castle range boundary');
    });
    assert.ok(Math.abs(outsideRoad.castleDistance-8.5)<1e-6);
    assert.ok(outsideRoad.roadDistance<1e-6,'the invalid range fixture is on an actual route');
    const invalidBefore=await page.evaluate(()=>({mana:arenaApp.engine.state.teams[0].mana,energy:arenaApp.engine.state.teams[0].energy,hand:[...arenaApp.engine.state.teams[0].hand],queue:[...arenaApp.engine.state.teams[0].queue]}));
    await page.keyboard.press('1');
    const tooFar=await clientPoint(page,outsideRoad);
    await page.mouse.click(tooFar.x,tooFar.y);
    assert.deepEqual(await page.evaluate(()=>({mana:arenaApp.engine.state.teams[0].mana,energy:arenaApp.engine.state.teams[0].energy,hand:[...arenaApp.engine.state.teams[0].hand],queue:[...arenaApp.engine.state.teams[0].queue]})),invalidBefore,'out-of-radius placement is atomic even on an own-side road');

    // Enemy-side placement and targeting cancellation are atomic as well.
    await page.keyboard.press('1');
    await focusCamera(page,{x:36,y:14});
    const enemy=await clientPoint(page,{x:36,y:14});
    await page.mouse.click(enemy.x,enemy.y);
    assert.deepEqual(await page.evaluate(()=>({mana:arenaApp.engine.state.teams[0].mana,energy:arenaApp.engine.state.teams[0].energy,hand:[...arenaApp.engine.state.teams[0].hand],queue:[...arenaApp.engine.state.teams[0].queue]})),invalidBefore);
    await page.keyboard.press('Escape');
    await page.locator('#camera-home').click();

    await page.locator('#pause-button').click();
    assert.equal(await page.evaluate(()=>arenaApp.engine.state.paused),true);
    const frozen=await page.evaluate(()=>JSON.stringify({time:arenaApp.engine.state.time,mana:arenaApp.engine.state.teams[0].mana,units:arenaApp.engine.state.units.map(u=>[u.id,u.x,u.y,u.hp])}));
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(()=>JSON.stringify({time:arenaApp.engine.state.time,mana:arenaApp.engine.state.teams[0].mana,units:arenaApp.engine.state.units.map(u=>[u.id,u.x,u.y,u.hp])})),frozen);
    await page.locator('#resume-button').click();
    assert.equal(await page.evaluate(()=>arenaApp.engine.state.paused),false);

    // Visibility changes are real app events; a return does not silently resume.
    await page.evaluate(()=>{
      Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
      Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await page.evaluate(()=>arenaApp.engine.state.paused),true);
    const hiddenTime=await page.evaluate(()=>arenaApp.engine.state.time);
    await page.waitForTimeout(120);
    assert.equal(await page.evaluate(()=>arenaApp.engine.state.time),hiddenTime);
    await page.evaluate(()=>{
      delete document.hidden;delete document.visibilityState;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await page.evaluate(()=>arenaApp.engine.state.paused),true,'returning to the tab requires explicit resume');
    await page.locator('#resume-button').click();

    // A focused state fixture gives enough earned energy to test the public cast UI.
    const spellFixture=await page.evaluate(()=>{
      const spells=['Shock Bomb','Healing Light'].map(name=>arenaApp.catalog.spells.find(s=>s.name===name&&s.ready));
      if(spells.some(s=>!s))return null;
      const team=arenaApp.engine.state.teams[0];team.spellIds=spells.map(s=>s.id);team.spellIndex=0;team.energy=20;
      return {first:spells[0].id,second:spells[1].id,cost:spells[0].energy};
    });
    assert.ok(spellFixture);
    await settleFrame(page);
    await page.locator('#active-spell').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>arenaApp.engine.state.teams[0].energy),20,'canceling a spell costs no energy');
    assert.equal(await page.evaluate(()=>arenaApp.engine.state.teams[0].spellIndex),0);
    await page.locator('#active-spell').click();
    const castAt=await clientPoint(page,{x:12,y:14});
    await page.mouse.click(castAt.x,castAt.y);
    await page.waitForFunction(()=>arenaApp.engine.state.teams[0].spellIndex===1);
    assert.equal(await page.evaluate(()=>arenaApp.engine.state.teams[0].energy),20-spellFixture.cost);

    await page.waitForFunction(()=>document.getElementById('toast').hidden);
    await page.screenshot({path:'/tmp/oyun-arena-desktop.png',fullPage:true});screenshots.push('/tmp/oyun-arena-desktop.png');
    await page.keyboard.press('1');
    const previewPoint=await clientPoint(page,{x:6.5,y:14});
    await page.mouse.move(previewPoint.x,previewPoint.y);await settleFrame(page);
    await page.screenshot({path:'/tmp/oyun-arena-deployment-preview.png',fullPage:true});screenshots.push('/tmp/oyun-arena-deployment-preview.png');
    await page.keyboard.press('Escape');
    for (const [width,height] of [[1024,768],[768,1024],[390,844],[320,568],[844,390]]) {
      await page.setViewportSize({width,height});await settleFrame(page);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}x${height}: page overflows horizontally`);
      const box=await page.locator('#arena-canvas').boundingBox();
      assert.ok(box.width>100&&box.height>100,`${width}x${height}: battlefield remains visible`);
      const p=await clientPoint(page,{x:6.5,y:14});
      const roundTrip=await page.evaluate(p=>arenaApp.renderer.worldAt(p.x,p.y),p);
      assert.ok(Math.abs(roundTrip.x-6.5)<.01&&Math.abs(roundTrip.y-14)<.01,`${width}x${height}: map input projection`);
      const landmarks=await page.evaluate(async()=>{
        const {MAP}=await import('./js/map.mjs');
        return [...MAP.bases,...MAP.nodes].map(p=>arenaApp.renderer.screenAt(p));
      });
      assert.ok(landmarks.some(p=>p.x<0||p.x>box.width||p.y<0||p.y>box.height),`${width}x${height}: only part of the map is shown`);
      assert.ok(landmarks[0].x>0&&landmarks[0].x<box.width&&landmarks[0].y>0&&landmarks[0].y<box.height,`${width}x${height}: home castle stays in view`);
    }
    await page.setViewportSize({width:390,height:844});await settleFrame(page);
    await page.screenshot({path:'/tmp/oyun-arena-mobile.png',fullPage:true});screenshots.push('/tmp/oyun-arena-mobile.png');

    await page.locator('#pause-button').click();
    await page.locator('#restart-button').click();
    await page.waitForFunction(()=>arenaApp.engine.state.time<2&&!arenaApp.engine.state.paused);
    assert.equal(await page.evaluate(()=>arenaApp.engine.state.teams[0].energy),0);
    assert.equal(await page.evaluate(()=>arenaApp.engine.state.castles[0].hp),1000);

    // Touch the actual hand and battlefield on a narrow screen.
    const touchChoice=await page.evaluate(()=>{
      const t=arenaApp.engine.state.teams[0];
      return t.hand.map((id,index)=>({id,index,cost:arenaApp.catalog.byId.get(id).stats.mana})).find(c=>c.cost<=t.mana);
    });
    assert.ok(touchChoice);
    const touchEnergy=await page.evaluate(()=>arenaApp.engine.state.teams[0].energy);
    await page.locator(`[data-hand-index="${touchChoice.index}"]`).tap();
    await page.locator('#arena-canvas').scrollIntoViewIfNeeded();
    const touchPoint=await clientPoint(page,{x:6.5,y:14});
    await page.touchscreen.tap(touchPoint.x,touchPoint.y);
    await page.waitForFunction(before=>arenaApp.engine.state.teams[0].energy>before,touchEnergy);
    assert.ok(Math.abs(await page.evaluate(()=>arenaApp.engine.state.teams[0].energy)-touchEnergy-Math.round(touchChoice.cost/18*20)/20)<1e-8);

    // A real Chromium touch swipe pans an armed battlefield without deploying.
    await page.evaluate(()=>{arenaApp.engine.teams[0].mana=20;});
    await page.locator('[data-hand-index="0"]').tap();
    const touchBefore=await page.evaluate(()=>({center:{...arenaApp.renderer.camera.center},energy:arenaApp.engine.teams[0].energy,deployed:arenaApp.engine.teams[0].deployed,hand:[...arenaApp.engine.teams[0].hand]}));
    const swipe=await clientPoint(page,{x:9,y:14}),cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:swipe.x,y:swipe.y,id:1}]});
    for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:swipe.x+70*i/6,y:swipe.y+10*i/6,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
    assert.notDeepEqual(await page.evaluate(()=>arenaApp.renderer.camera.center),touchBefore.center);
    assert.deepEqual(await page.evaluate(()=>({energy:arenaApp.engine.teams[0].energy,deployed:arenaApp.engine.teams[0].deployed,hand:[...arenaApp.engine.teams[0].hand]})),{energy:touchBefore.energy,deployed:touchBefore.deployed,hand:touchBefore.hand});
    await page.locator('#camera-home').tap();await page.keyboard.press('Escape');

    const captured=await page.evaluate(()=>{
      const e=arenaApp.engine;e.bot=false;e.state.units=[];e.state.projectiles=[];
      const def=arenaApp.catalog.cards.find(c=>c.ready);
      for (const [lane,y] of [4,14,24].entries()) {
        const [u]=e.spawn(def,0,{x:21.5,y},lane,{count:1});u.stats.speed=0;
      }
      for(let i=0;i<156;i++)e.step(1/30);
      e.teams[0].mana=0;
      for(let i=0;i<39;i++)e.step(1/30);
      return {owners:e.state.nodes.map(n=>n.owner),mana:e.teams[0].mana};
    });
    assert.deepEqual(captured.owners,[0,0,0]);
    assert.ok(Math.abs(captured.mana-1.06)<1e-6,'three owned wells add six percent to base mana regeneration');
    await page.waitForFunction(()=>document.querySelectorAll('#node-hud [data-owner="0"]').length===3);
    assert.equal(await page.locator('#node-hud [data-owner="0"]').count(),3,'the HUD shows all three captured wells');

    await page.evaluate(()=>{
      const e=arenaApp.engine;e.state.phase='regulation';e.state.remaining=.01;
      e.step(1/30);
    });
    await page.waitForFunction(()=>arenaApp.engine.state.phase==='overtime');
    await page.waitForFunction(()=>/overtime/i.test(document.getElementById('match-phase').textContent));
    assert.match(await page.locator('#match-phase').textContent(),/overtime/i);

    // Resolve a terminal state with the real damage path, then exercise its UI.
    await page.evaluate(()=>arenaApp.engine.damage(null,arenaApp.engine.state.castles[1],2000,{kind:'spell',bypassShield:true,secondary:true}));
    await page.waitForFunction(()=>arenaApp.engine.state.phase==='ended');
    await page.locator('#result-overlay').waitFor({state:'visible'});
    assert.ok(await page.locator('#result-overlay').isVisible());
    assert.equal(await page.evaluate(()=>arenaApp.engine.state.winner),0);

    await page.locator('#result-edit-deck').click();
    await page.locator('#troop-tab').click();
    for (const [width,height] of [[390,844],[320,568]]) {
      await page.setViewportSize({width,height});await settleFrame(page);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}x${height}: setup library overflows`);
      assert.ok(await page.locator('#catalog-grid').isVisible());
    }
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>window.scrollTo(0,0));await settleFrame(page);
    await page.screenshot({path:'/tmp/oyun-arena-lobby-mobile.png'});screenshots.push('/tmp/oyun-arena-lobby-mobile.png');
    await page.setViewportSize({width:1440,height:1100});
    await page.evaluate(()=>window.scrollTo(0,0));await settleFrame(page);
    await page.screenshot({path:'/tmp/oyun-arena-lobby-desktop.png'});screenshots.push('/tmp/oyun-arena-lobby-desktop.png');

    // Codex copy follows the preserved arena map/timer rules and lists all stats.
    const codex=await context.newPage();codex.on('pageerror',error=>errors.push(error.message));
    await codex.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    await codex.goto(`http://127.0.0.1:${server.address().port}${prefix}index.html`,{waitUntil:'domcontentloaded'});
    await codex.evaluate(()=>showPortal('info'));
    await codex.waitForFunction(()=>document.querySelectorAll('#codex-content .codex-entry').length===8);
    await codex.getByRole('button',{name:'Card Stats',exact:true}).click();
    assert.equal(await codex.locator('.codex-entry.visible li').count(),24);
    await codex.getByRole('button',{name:'How to Play',exact:true}).click();
    assert.match(await codex.locator('.codex-entry.visible').textContent(),/three-route/);
    await codex.getByRole('button',{name:'Win Conditions',exact:true}).click();
    assert.match(await codex.locator('.codex-entry.visible').textContent(),/overtime always follow/);
    await codex.getByRole('button',{name:'Negative Status Effects',exact:true}).click();
    assert.match(await codex.locator('.codex-entry.visible').textContent(),/Poison:.*0\.75 seconds/);
    await codex.close();
    assert.deepEqual(errors,[],'no browser runtime errors');
    assert.ok(requests.includes('/project/rarity/mundane.json'),'data loads under the project prefix');
    assert.ok(!requests.some(url=>url.startsWith('/rarity/')),'no origin-root data URLs');
    console.log(`Arena browser checks passed: ${coverage.cards} cards, ${coverage.ready} ready, ${coverage.spells} spells; Ethereal form selection/persistence and battle lock, Emergent ordinals and Dumpsy orbits, Ray shared-Health fusion, Rotlings 3+3 deployment, timed damage stacks and Mini Rotter mist/inspectors, all 21 Apex roots, R-1 whole-series boost and inspector, Octarion poison cloud rendering, hidden Sushu/host inspection and native passive theft, updated Maapp 8/10 percent reduction and 0.30s interval, John Reynolds critical shield bypass and horse Taunt, partner-aware Ascendant decks/mana, Reacher hybrid attacks, Maapp radial pulse and Avara four-mode areas, Sunrise movement-only Health growth and Wong one-use eight-shot burst/melee restoration, Whisper critical conversion, priority possession, current-health return and host-death cleanup, Corsair formation and projectile reflection, Pirate Girls distance scaling, RogueX 25% Blind, Tornado central/splash damage and captive release, once-per-deployment Tphoenix rebirth and Phoenix hatch, Albert same-target growth and inspector, Chicken contact/death explosion and inspector, Angels staggered reinforcements and death rally, Boomix two-way hits and launch cooldown, Nortex 5/7/9 burst reset, Fen 12.5% Blind, Nightprowler stealth and Misfortune, Magma ground flame trail and fog, Fallen Angel current-health targeting and haste stacks, Etheris shared reserve, Format Power copying, Artist ink/Curse/charge and timed healthless ravens, Pyhsic execution, Unara orb distribution, Clara Taunt/healing, Soul Mark conversion, Malvaris and Phantomis live stats, Butterfly health bloom, independent bot decks and paced mana spending, Avalith return flight and two-way hits, flying lane combat, Gloop engulf/digestion/release and inspector, ranged projectile launch and impact, mouse/touch/keyboard/scroll camera, minimap and fog, zoom, drag-versus-deploy, hand drag, hidden inspection/HUD, deck, deployment radius, economy, spell cycle, pause/restart and six viewports. Screenshots: ${screenshots.join(', ')}`);
  } finally {
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
