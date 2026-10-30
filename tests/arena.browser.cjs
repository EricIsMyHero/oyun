/* Real standalone Arena browser checks. Requires Playwright and Chromium.
   Run: node tests/arena.browser.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

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
    const coverage=await page.evaluate(()=>({cards:arenaApp.catalog.cards.length,ready:arenaApp.catalog.cards.filter(c=>c.ready).length,spells:arenaApp.catalog.spells.length,locked:arenaApp.catalog.cards.find(c=>!c.ready)}));
    assert.equal(coverage.cards,138);
    assert.equal(coverage.spells,26);
    assert.ok(coverage.ready>=8,'at least one complete deck is available');
    assert.ok(coverage.locked?.reasons?.length,'incomplete cards expose source-backed reasons');
    await page.locator('#readiness-filter').selectOption('all');
    assert.equal(await page.locator('[data-inspect-card]').count(),138);
    await page.locator(`[data-inspect-card="${coverage.locked.id}"]`).click();
    assert.ok(await page.locator('#inspector').isVisible());
    assert.ok((await page.locator('#inspector').textContent()).includes(coverage.locked.reasons[0]));
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

    // A keyboard-selected card is deployed by clicking its real map position.
    const choice=await page.evaluate(()=>{
      const t=arenaApp.engine.state.teams[0];
      return t.hand.map((id,index)=>({id,index,cost:arenaApp.catalog.byId.get(id).stats.mana})).find(c=>c.cost<=t.mana);
    });
    assert.ok(choice,'opening hand contains an affordable card');
    const before=await page.evaluate(()=>({mana:arenaApp.engine.state.teams[0].mana,energy:arenaApp.engine.state.teams[0].energy,hand:[...arenaApp.engine.state.teams[0].hand],queue:[...arenaApp.engine.state.teams[0].queue]}));
    await page.keyboard.press(String(choice.index+1));
    const valid=await clientPoint(page,{x:6.5,y:11});
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
    await page.keyboard.press(String(rearChoice.index+1));
    const rear=await clientPoint(page,{x:2.2,y:11});
    await page.mouse.click(rear.x,rear.y);
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
          if(point.x<15.5)return {...point,castleDistance:distance(base,point),roadDistance:closestRoute(point).distance};
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
    const enemy=await clientPoint(page,{x:24,y:11});
    await page.mouse.click(enemy.x,enemy.y);
    assert.deepEqual(await page.evaluate(()=>({mana:arenaApp.engine.state.teams[0].mana,energy:arenaApp.engine.state.teams[0].energy,hand:[...arenaApp.engine.state.teams[0].hand],queue:[...arenaApp.engine.state.teams[0].queue]})),invalidBefore);
    await page.keyboard.press('Escape');

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
    const castAt=await clientPoint(page,{x:12,y:11});
    await page.mouse.click(castAt.x,castAt.y);
    await page.waitForFunction(()=>arenaApp.engine.state.teams[0].spellIndex===1);
    assert.equal(await page.evaluate(()=>arenaApp.engine.state.teams[0].energy),20-spellFixture.cost);

    await page.waitForFunction(()=>document.getElementById('toast').hidden);
    await page.screenshot({path:'/tmp/oyun-arena-desktop.png',fullPage:true});screenshots.push('/tmp/oyun-arena-desktop.png');
    await page.keyboard.press('1');
    const previewPoint=await clientPoint(page,{x:6.5,y:11});
    await page.mouse.move(previewPoint.x,previewPoint.y);await settleFrame(page);
    await page.screenshot({path:'/tmp/oyun-arena-deployment-preview.png',fullPage:true});screenshots.push('/tmp/oyun-arena-deployment-preview.png');
    await page.keyboard.press('Escape');
    for (const [width,height] of [[1024,768],[768,1024],[390,844],[320,568],[844,390]]) {
      await page.setViewportSize({width,height});await settleFrame(page);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}x${height}: page overflows horizontally`);
      const box=await page.locator('#arena-canvas').boundingBox();
      assert.ok(box.width>100&&box.height>100,`${width}x${height}: battlefield remains visible`);
      const p=await clientPoint(page,{x:6.5,y:11});
      const roundTrip=await page.evaluate(p=>arenaApp.renderer.worldAt(p.x,p.y),p);
      assert.ok(Math.abs(roundTrip.x-6.5)<.01&&Math.abs(roundTrip.y-11)<.01,`${width}x${height}: map input projection`);
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
    const touchPoint=await clientPoint(page,{x:6.5,y:11});
    await page.touchscreen.tap(touchPoint.x,touchPoint.y);
    await page.waitForFunction(before=>arenaApp.engine.state.teams[0].energy>before,touchEnergy);
    assert.ok(Math.abs(await page.evaluate(()=>arenaApp.engine.state.teams[0].energy)-touchEnergy-Math.round(touchChoice.cost/18*20)/20)<1e-8);

    const captured=await page.evaluate(()=>{
      const e=arenaApp.engine;e.bot=false;e.state.units=[];e.state.projectiles=[];
      const def=arenaApp.catalog.cards.find(c=>c.ready);
      for (const [lane,y] of [3,11,19].entries()) {
        const [u]=e.spawn(def,0,{x:16,y},lane,{count:1});u.stats.speed=0;
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

    assert.deepEqual(errors,[],'no browser runtime errors');
    assert.ok(requests.includes('/project/rarity/mundane.json'),'data loads under the project prefix');
    assert.ok(!requests.some(url=>url.startsWith('/rarity/')),'no origin-root data URLs');
    console.log(`Arena browser checks passed: ${coverage.cards} cards, ${coverage.ready} ready, ${coverage.spells} spells; real deck, front/rear courtyard deployment, castle-radius rejection, energy, spell cycle, pause/restart and six viewports. Screenshots: ${screenshots.join(', ')}`);
  } finally {
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
