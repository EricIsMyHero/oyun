const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),prefix='/project/';
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix))return res.writeHead(404).end();const file=path.resolve(root,decodeURIComponent(url.pathname.slice(prefix.length)).replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),errors=[],results=[];
try{
 for(const viewport of[{width:1440,height:1100},{width:390,height:844}]){
  const page=await browser.newPage({viewport});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname.endsWith('.r2.dev'))return r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#254c4c"/></svg>'});if(u.hostname.includes('fonts.'))return r.abort();return r.continue();});
  await page.goto(process.env.ARENA_TOPOLOGY_URL||`http://127.0.0.1:${server.address().port}${prefix}arena/`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.arenaApp?.catalog&&[...arenaApp.renderer.images].filter(([u])=>u.includes('/assets/')).length>=7&&[...arenaApp.renderer.images].filter(([u])=>u.includes('/assets/')).every(([,i])=>i.loaded));
  assert.equal(await page.locator('[data-preview-arena]').count(),5);
  for(const id of['swamp','prison']){
   await page.locator(`[data-preview-arena="${id}"]`).click();assert.equal(await page.evaluate(()=>arenaApp.renderer.map.id),id);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.locator('#arena-canvas').screenshot({path:`/tmp/arena-${id}-preview-${viewport.width}-v49.png`});
  }
  await page.locator('#quick-build').click();
  await page.evaluate(()=>{
   window.topologyStart=id=>{const a=arenaApp;a.startMatch({arenaId:id});const e=a.engine;e.bot=false;e.setPaused(true);e.castles.forEach(c=>c.cooldown=Infinity);return e;};
   window.topologyUnit=(point,movement='ground')=>{const e=arenaApp.engine,d=structuredClone(arenaApp.catalog.byId.get('hammies'));d.id='topology-dummy';d.forms=[];d.combat={...d.combat,attackType:'none',movementType:movement};Object.assign(d.stats,{health:1000,shield:500,damageminimiser:0,shieldtakendamage:70,speed:0,healrecovery:0,shieldrecovery:0,life:0});return e.spawn(d,0,point,e.closestRoute(point).lane,{count:1,positions:[point]})[0];};
  });
  const teleport=await page.evaluate(()=>{const e=topologyStart('swamp'),u=topologyUnit(e.map.portals[0],'flying');e.setPaused(false);e.step(1/30);e.setPaused(true);arenaApp.renderer.focusAt(e.map.portals[1]);return{x:u.x,y:u.y,hp:u.hp,exit:e.map.portals[1]};});
  assert.ok(Math.hypot(teleport.x-teleport.exit.x,teleport.y-teleport.exit.y)<1.3);assert.equal(teleport.hp,1000);await page.waitForTimeout(130);assert.match(await page.locator('#arena-condition').textContent(),/HOLLOW PORTALS/);await page.screenshot({path:`/tmp/arena-swamp-teleport-${viewport.width}-v49.png`,fullPage:true});
  const crush=await page.evaluate(()=>{const e=topologyStart('prison'),u=topologyUnit(e.map.center);e.state.time=59.99;e.setPaused(false);e.step(1/30);e.setPaused(true);arenaApp.renderer.focusAt(e.map.center);window.prisonOccupant=u;return{hp:u.hp,x:u.x,nodes:e.state.nodes.length,orb:e.state.arena.orb.available};});
  assert.equal(crush.hp,970);assert.ok(crush.x>17);assert.equal(crush.nodes,2);assert.equal(crush.orb,false);await page.waitForTimeout(150);assert.match(await page.locator('#arena-condition').textContent(),/CENTER SEALED/);assert.equal(await page.locator('#node-hud .node-indicator').count(),3);assert.match(await page.locator('#node-hud').textContent(),/ORB SEALED/);
  await page.screenshot({path:`/tmp/arena-prison-closed-${viewport.width}-v49.png`,fullPage:true});
  await page.evaluate(()=>{const e=arenaApp.engine;prisonOccupant.x=21;prisonOccupant.y=13;e.state.time=119.99;e.setPaused(false);e.step(1/30);e.setPaused(true);});await page.waitForTimeout(150);assert.match(await page.locator('#arena-condition').textContent(),/CENTER OPEN/);assert.equal(await page.evaluate(()=>arenaApp.engine.state.arena.orb.available),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`/tmp/arena-prison-open-${viewport.width}-v49.png`,fullPage:true});results.push({viewport:viewport.width,teleport,crush});await page.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({results,errors},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
