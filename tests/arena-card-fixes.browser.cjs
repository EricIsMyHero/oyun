/* Card audit regressions in the real UI; ARENA_CARD_FIXES_URL also checks Pages. */
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const{chromium}=require('playwright'),root=path.resolve(__dirname,'..'),prefix='/project/',mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(!p.startsWith(prefix))return res.writeHead(404).end();const file=path.resolve(root,decodeURIComponent(p.slice(prefix.length)).replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
async function inspect(page){const p=await page.evaluate(()=>{const r=arenaApp.renderer,u=cardFixFixture.inspect;r.focusAt(u);const p=r.screenAt(u),b=r.canvas.getBoundingClientRect();arenaApp.engine.setPaused(false);return{x:b.left+p.x,y:b.top+p.y};});await page.mouse.click(p.x,p.y);await page.locator('#inspector').waitFor({state:'visible'});}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname.endsWith('.r2.dev'))return r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#254c4c"/><path d="M40 260L100 50L160 260Z" fill="#b3d7cc"/></svg>'});if(u.hostname.includes('fonts.'))return r.abort();return r.continue();});
  await page.goto(process.env.ARENA_CARD_FIXES_URL||`http://127.0.0.1:${server.address().port}${prefix}arena/`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.arenaApp?.catalog?.cards?.length===176);
  const defs=await page.evaluate(()=>{const c=arenaApp.catalog;return{ready:c.cards.filter(c=>c.ready).length,deadscope:c.byId.get('deadscope').stats.sps,naar:c.byId.get('naar').stats.sps,tphoenixArea:c.byId.get('tphoenix').combat.multiTarget,ironjawBase:c.byId.get('ironjaw').stats.lifestealChance};});assert.deepEqual(defs,{ready:138,deadscope:23.81,naar:25.6,tphoenixArea:true,ironjawBase:25});
  for(const[id,expected]of[['deadscope','23.81'],['naar','25.6']]){await page.locator(`[data-inspect-card="${id}"]`).click();assert.equal(await page.locator('#inspector [data-stat="sps"] strong').textContent(),expected);await page.locator('#inspector-close').click();}
  await page.locator('#quick-build').click();await page.locator('#start-match').click();
  await page.evaluate(()=>{
   window.cardFixReset=()=>{arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];e.state.effects=[];e.random=()=>.99;for(const c of e.castles)c.cooldown=Infinity;return e;};
   window.cardFixMake=(id,side,x,y,stats={},dummy=false)=>{const d=structuredClone(arenaApp.catalog.byId.get(id));Object.assign(d.stats,{speed:0,dodge:0,criticalChance:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...stats});if(dummy){d.id='card-fix-target';d.forms=[];d.combat.attackType='none';}const made=arenaApp.engine.spawn(d,side,{x,y},1,{count:1,positions:[{x,y}]});for(const u of made){u.cooldown=Infinity;u.stats.speed=0;}return made[0];};
  });
  const areas=[];
  for(const id of['arcanyx','tphoenix']){
   const area=await page.evaluate(id=>{const e=cardFixReset(),u=cardFixMake(id,0,15,14),primary=cardFixMake('hammies',1,15.6,14,{health:10000,shield:0},true),near=cardFixMake('hammies',1,15.6,id==='arcanyx'?14.6:14.4,{health:10000,shield:0},true),outside=cardFixMake('hammies',1,15.6,15.2,{health:10000,shield:0},true);e._fire(u,primary);e.step(.3);e.setPaused(true);arenaApp.renderer.focusAt({x:15.8,y:14});window.cardFixFixture={inspect:u};return{card:id,primary:10000-primary.hp,near:10000-near.hp,outside:10000-outside.hp,explosions:e.state.effects.filter(f=>f.type==='explosion').length};},id);
   close(area.primary,id==='arcanyx'?17.6:18);close(area.near,area.primary);close(area.outside,0);assert.equal(area.explosions,1);areas.push(area);await page.screenshot({path:`/tmp/oyun-${id}-splash-v41.png`,fullPage:true});
  }
  const theft=[];
  for(const[id,base,expected]of[['leno/type1',5,49.5],['bethe',5,4.5],['srail',20,27.5]]){
   const result=await page.evaluate(({id,base})=>{const e=cardFixReset(),fang=cardFixMake('venom-fangs',0,15,14),target=cardFixMake(id,1,16,14,{health:10000,shield:0,criticalChance:base});e._hook('tick',target,0);e._resolveHit(fang,target,{damage:1,kind:'attack'});e.step(1/30);e.setPaused(true);window.cardFixFixture={inspect:target};return{card:id,critical:e.statValue(target,'criticalChance'),gained:e.statValue(fang,'criticalChance')};},{id,base});
   close(result.critical,expected);close(result.gained,.5);theft.push(result);await inspect(page);assert.equal(await page.locator('#inspector [data-stat="criticalChance"] strong').textContent(),`${expected}%`);await page.locator('#inspector-close').click();
  }
  const ironjaw=await page.evaluate(()=>{const e=cardFixReset(),u=cardFixMake('ironjaw',0,15,14,{lifestealChance:25}),target=cardFixMake('hammies',1,15.6,14,{health:10000,shield:0},true);for(let i=0;i<60;i++)e._resolveHit(u,target,{damage:1,kind:'attack'});e.setPaused(true);window.cardFixFixture={inspect:u};return{chance:e.statValue(u,'lifestealChance'),bonus:u.memory.ironjawSiphon,source:u.def.raw.trait};});close(ironjaw.chance,50);close(ironjaw.bonus,25);assert.match(ironjaw.source,/50%/);await inspect(page);assert.equal(await page.locator('#inspector [data-stat="lifestealChance"] strong').textContent(),'50%');await page.screenshot({path:'/tmp/oyun-ironjaw-cap-v41.png',fullPage:true});
  const power=await page.evaluate(()=>{const entries=arenaApp.catalog.forms.map(def=>({id:def.id,catalog:def.power,details:ClashCardPower.breakdown(def.raw)}));return{entries,standalone:ClashCardPower.scorer([])(arenaApp.catalog.byId.get('ironjaw').raw)};});
  assert.equal(power.entries.length,241);for(const row of power.entries){assert.equal(row.catalog,row.details.score,row.id);assert.equal(row.details.passive.reviewed,true,row.id);assert.ok(row.catalog>=118&&row.catalog<=1000);}
  assert.equal(await page.locator('#inspector .power-breakdown').getAttribute('data-power-score'),String(power.standalone));
  assert.equal(await page.locator('#inspector [data-power-group="primary"] li').count(),10);assert.equal(await page.locator('#inspector [data-power-group="secondary"] li').count(),9);assert.equal(await page.locator('#inspector [data-power-group="combat"] li').count(),9);
  await page.locator('#inspector .power-breakdown > summary').click();await page.locator('#inspector [data-power-group="combat"] > summary').click();await page.screenshot({path:'/tmp/oyun-power-arena-v43.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({url:page.url(),defs,areas,theft,ironjaw,powerEntries:power.entries.length,errors},null,2));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
