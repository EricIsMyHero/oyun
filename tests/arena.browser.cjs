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
    console.log(`Arena browser checks passed: ${coverage.cards} cards, ${coverage.ready} ready, ${coverage.spells} spells; independent bot decks and paced mana spending, flying lane combat, Gloop engulf/digestion/release and inspector, ranged projectile launch and impact, mouse/touch/keyboard/scroll camera, minimap and fog, zoom, drag-versus-deploy, hand drag, hidden inspection/HUD, deck, deployment radius, economy, spell cycle, pause/restart and six viewports. Screenshots: ${screenshots.join(', ')}`);
  } finally {
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
