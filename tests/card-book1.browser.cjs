/* Book1 Codex + Arena import UI; BOOK1_BASE_URL supports checking Pages. */
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),manifest=require('../data/card-imports/book1.json'),root=path.resolve(__dirname,'..'),prefix='/project/';
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;if(!pathname.startsWith(prefix))return res.writeHead(404).end();const file=path.resolve(root,decodeURIComponent(pathname.slice(prefix.length)).replace(/\/$/,'/index.html')||'index.html');if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),errors=[];
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname.endsWith('.r2.dev'))return r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#254c4c"/></svg>'});if(u.hostname.includes('fonts.'))return r.abort();return r.continue();});
  const base=process.env.BOOK1_BASE_URL||`http://127.0.0.1:${server.address().port}${prefix}`,page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'?v=44',{waitUntil:'domcontentloaded'});await page.evaluate(()=>showPortal('cards'));await page.waitForFunction(()=>typeof allCards!=='undefined'&&allCards.length===176);
  for(const entry of manifest.newCards){
   await page.evaluate(id=>openModal(allCards.find(c=>c.id===id)),entry.id);assert.equal(await page.locator('#modal-box').getAttribute('data-rarity'),entry.rarity.toLowerCase());
   assert.equal(await page.locator('#modal-content [data-stat="health"] .modal-stat-value').textContent(),String(entry.sourceValues[3]));assert.equal(await page.locator('#modal-content [data-stat="mana"] .modal-stat-value').textContent(),String(entry.sourceValues[11]));
   const passive=await page.evaluate(id=>ClashCardPower.breakdown(allCards.find(c=>c.id===id)).passive,entry.id);assert.equal(passive.reviewed,true);assert.ok(passive.points>0);
   await page.locator('[data-card-section="ability"]').click();assert.equal((await page.locator('.modal-trait-box').textContent()).trim(),entry.sourceValues[9]);
   await page.locator('[data-card-section="stats"]').click();await page.locator('[data-stat-page="3"]').click();assert.equal(await page.locator('[data-profile="attackDistance"] strong').textContent(),'—');assert.equal(await page.locator('[data-profile="movementType"] strong').textContent(),'—');
   if(entry.id==='plauge')await page.locator('#modal-box').screenshot({path:'/tmp/oyun-book1-plauge-codex.png'});
   await page.locator('#modal-close').click();
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>openModal(allCards.find(c=>c.id==='erica')));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#modal-box').screenshot({path:'/tmp/oyun-book1-erica-mobile.png'});await page.locator('#modal-close').click();
  const arena=await context.newPage();arena.on('pageerror',e=>errors.push(e.message));await arena.goto(base+'arena/?v=44',{waitUntil:'domcontentloaded'});await arena.waitForFunction(()=>window.arenaApp?.catalog?.cards?.length===176);await arena.locator('#readiness-filter').selectOption('all');assert.equal(await arena.locator('.library-card.locked').count(),38);
  for(const entry of manifest.newCards){await arena.locator(`[data-inspect-card="${entry.id}"]`).click();assert.match(await arena.locator('#inspector').textContent(),/combat profile|native ability/);assert.equal(await arena.locator('#inspector [data-stat="health"] strong').textContent(),String(entry.sourceValues[3]));assert.equal(await arena.locator('#inspector [data-add-card]').isDisabled(),true);await arena.locator('#inspector-close').click();}
  await arena.locator('[data-inspect-card="plauge"]').click();await arena.screenshot({path:'/tmp/oyun-book1-plauge-arena.png',fullPage:true});assert.deepEqual(errors,[]);console.log(JSON.stringify({base,newCards:manifest.newCards.map(c=>c.name),totalRoots:176,totalDefinitions:241,ready:138,incomplete:38,errors},null,2));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
