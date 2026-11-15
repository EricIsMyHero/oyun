/* Random arenas, live hazard UI, fog, camera bounds and mobile rendering. */
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),prefix='/project/';
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix))return res.writeHead(404).end();const file=path.resolve(root,decodeURIComponent(url.pathname.slice(prefix.length)).replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const errors=[],results=[];
 try{
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
   const page=await browser.newPage({viewport});page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>{const url=new URL(r.request().url());if(url.hostname.endsWith('.r2.dev'))return r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#254c4c"/></svg>'});if(url.hostname.includes('fonts.'))return r.abort();return r.continue();});
   await page.goto(process.env.ARENA_ENVIRONMENTS_URL||`http://127.0.0.1:${server.address().port}${prefix}arena/`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.arenaApp?.catalog?.cards?.length===176);await page.locator('#quick-build').click();
   for(const id of ['waterfall','lava','verdant']){
    const info=await page.evaluate(id=>{
     const app=arenaApp;app.startMatch({arenaId:id});const e=app.engine;e.bot=false;e.setPaused(true);
     window.envSpawn=(point,side=0,movement='ground')=>{const def=structuredClone(app.catalog.byId.get('hammies'));def.id='map-scout';def.forms=[];def.combat={...def.combat,attackType:'none',movementType:movement,groundEffectImmune:movement!=='ground'};Object.assign(def.stats,{speed:0,healrecovery:0,shieldrecovery:0,health:1000});return e.spawn(def,side,point,e.closestRoute(point).lane,{count:1,positions:[point]})[0];};
     const center=e.map.center||e.map.nodes[Math.floor(e.map.nodes.length/2)];envSpawn(center);e.state.castles.forEach(c=>c.cooldown=Infinity);app.renderer.focusAt(center);app.renderer.draw(e.state);
     return{id:e.map.id,lanes:e.map.routes.length,nodes:e.state.nodes.length,name:e.map.name,center};
    },id);
    assert.equal(info.id,id);assert.equal(info.lanes,{verdant:3,waterfall:2,lava:1}[id]);assert.equal(await page.locator('#match-seed').textContent(),info.name.toUpperCase());
    const projection=await page.evaluate(()=>{
     const a=arenaApp,r=a.renderer,m=a.engine.map,canvas=document.getElementById('arena-minimap'),v=r.minimapView(canvas),p=m.bases[1];
     r.focusAt({x:1000,y:1000});const bounds={...r.camera.center};r.focusAt(m.center||m.nodes[0]);r.camera.setZoom(.5);r.syncCamera();
     const q={x:v.ox+(p.x+p.y)*v.scale,y:v.oy+(p.y-p.x)*v.scale*.5};r.drawMinimap(canvas,a.engine.state);const pixel=[...canvas.getContext('2d').getImageData(Math.round(q.x*v.dpr),Math.round(q.y*v.dpr),1,1).data];
     return{bounds,max:{x:m.width,y:m.height},zoom:r.camera.zoom,pixel};
    });
    assert.deepEqual(projection.bounds,projection.max);assert.equal(projection.zoom,.5);assert.ok(projection.pixel.slice(0,3).every(v=>v<25),'unseen enemy castle remains black on minimap');
    await page.locator('#camera-home').click();assert.equal(await page.evaluate(()=>arenaApp.renderer.camera.center.x),8);
    if(id!=='verdant'){
     await page.evaluate(id=>{const a=arenaApp,e=a.engine;e.state.time=id==='waterfall'?89.99:44.99;e.setPaused(false);e.step(1/30);e.setPaused(true);a.renderer.focusAt(e.map.center||{x:14,y:11});},id);
     await page.waitForTimeout(180);assert.match(await page.locator('#arena-condition').textContent(),id==='waterfall'?/33%.*SURGE ENDS/:/LAVA ACTIVE/);
     assert.equal(await page.locator('#arena-condition').getAttribute('data-active'),'true');
     if(id==='lava'){
      await page.evaluate(()=>{const e=arenaApp.engine;e.state.time=45.1;e.state.units=[];e.state.arena.orb.available=true;envSpawn(e.map.center,0,'flying');e.teams[0].mana=2;e.setPaused(false);e.step(1/30);e.setPaused(true);});
      await page.waitForTimeout(180);assert.match(await page.locator('#node-hud').textContent(),/ORB RETURNS IN 35s/);assert.equal(await page.locator('#mana-bonus').textContent(),'+2%');
     }
    }else assert.equal(await page.locator('#arena-condition').isVisible(),false);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
    await page.screenshot({path:`/tmp/oyun-${id}-${viewport.width}-v46.png`,fullPage:true});
    if(viewport.width>600){
     await page.evaluate(()=>{const a=arenaApp,map=a.engine.map;a.returnToLobby();a.renderer.setMap(map);a.renderer.draw(null);});
     await page.locator('#arena-canvas').screenshot({path:`/tmp/oyun-${id}-terrain-v46.png`});
    }
    results.push({viewport:viewport.width,...info});
   }
   await page.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({results,errors},null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
