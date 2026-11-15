const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),prefix='/project/';
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix))return res.writeHead(404).end();const file=path.resolve(root,decodeURIComponent(url.pathname.slice(prefix.length)).replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),errors=[],results=[];
 try{
  for(const viewport of[{width:1440,height:1000},{width:768,height:1024},{width:390,height:844}]){
   const phone=viewport.width<900,context=await browser.newContext({viewport,hasTouch:phone,deviceScaleFactor:phone?2:1}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname.endsWith('.r2.dev'))return r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#254c4c"/></svg>'});if(u.hostname.includes('fonts.'))return r.abort();return r.continue();});
   await page.goto(process.env.ARENA_DEPLOYMENT_URL||`http://127.0.0.1:${server.address().port}${prefix}arena/`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.arenaApp?.catalog);await page.locator('#quick-build').click();
   await page.evaluate(()=>{
    const r=arenaApp.renderer,original=r.placement;r.placement=function(ctx,state,ui){window.placementProbe=ui.placement?{...ui.placement}:null;return original.call(this,ctx,state,ui);};
    window.preparePlacement=({lane=1,d=5.5,zoom=1,home=true,clear=true}={})=>{
     const a=arenaApp,e=a.engine;if(clear){e.state.units=[];e.state.spawnStreams=[];}e.teams[0].mana=20;e.teams[0].hand[0]='hammies';a.selectHand(0);
     const r=a.renderer,p=e.pointOnRoute(lane,0,d);if(home)r.home();r.camera.setZoom(zoom);r.syncCamera();
     let screen=r.screenAt(p);if(screen.x<15||screen.y<15||screen.x>r.view.width-15||screen.y>r.view.height-15){r.focusAt(p);screen=r.screenAt(p);}
     const rect=r.canvas.getBoundingClientRect(),x=rect.left+screen.x,y=rect.top+screen.y;
     return{x,y,p,lane,hit:document.elementFromPoint(x,y)?.id,cost:e.cardFor(0,'hammies').stats.mana};
    };
   });
   let placements=0;
   const clickPoint=async(info,valid=true)=>{
    assert.equal(info.hit,'arena-canvas','the actual deployment target is never covered by navigation');
    await page.mouse.move(info.x,info.y);await page.waitForFunction(expected=>window.placementProbe&&Math.hypot(placementProbe.x-expected.p.x,placementProbe.y-expected.p.y)<.02&&placementProbe.valid===expected.valid,{p:info.p,valid});
    const before=await page.evaluate(()=>({deployed:arenaApp.engine.teams[0].deployed,mana:arenaApp.engine.teams[0].mana}));
    if(phone)await page.touchscreen.tap(info.x,info.y);else await page.mouse.click(info.x,info.y);
    const after=await page.evaluate(()=>({deployed:arenaApp.engine.teams[0].deployed,mana:arenaApp.engine.teams[0].mana,lanes:arenaApp.engine.units.map(u=>u.lane)}));
    assert.equal(after.deployed,before.deployed+(valid?1:0));assert.equal(after.mana,before.mana-(valid?info.cost:0));
    if(valid){assert.equal(after.lanes.length>=3,true);assert.ok(after.lanes.every(l=>l===info.lane));placements++;}
   };
   for(const id of['verdant','waterfall','lava','swamp','prison']){
    const lanes=await page.evaluate(id=>{arenaApp.startMatch({arenaId:id});const e=arenaApp.engine;e.bot=false;e.step=()=>{};return e.map.routes.length;},id);
    const layout=await page.evaluate(()=>{const map=document.getElementById('arena-canvas').getBoundingClientRect(),nav=document.getElementById('camera-panel').getBoundingClientRect(),hand=document.getElementById('hand-cards').getBoundingClientRect();return{separated:nav.top>=map.bottom,handVisible:hand.top>=0&&hand.bottom<=innerHeight};});assert.equal(layout.separated,true);assert.equal(layout.handVisible,true,'the dock also leaves the hand reachable without scrolling');
    for(let lane=0;lane<lanes;lane++){
     // These home-camera points reproduce the covered lower-right lane on phones.
     for(const d of[2.5,4,5.5,7])await clickPoint(await page.evaluate(options=>preparePlacement(options),{lane,d}));
     for(const zoom of[.5,.75,1.6])await clickPoint(await page.evaluate(options=>preparePlacement(options),{lane,zoom}));
    }
    // Building previews use buildings as obstacles; a nearby troop isn't one.
    const build=await page.evaluate(()=>{const a=arenaApp,e=a.engine;const info=preparePlacement({lane:0});const p={x:info.p.x+.55,y:info.p.y},def=a.catalog.byId.get('hammies');e.spawn(def,0,p,0,{count:1,positions:[p]});e.teams[0].spellIds=['guard-post'];e.teams[0].spellIndex=0;e.teams[0].energy=5;a.selectSpell();return info;});
    await page.mouse.move(build.x,build.y);await page.waitForFunction(()=>placementProbe?.valid===true);await page.mouse.click(build.x,build.y);assert.equal(await page.evaluate(()=>arenaApp.engine.units.filter(u=>u.isBuilding).length),1);
    // A map swipe and minimap navigation never spend the selected card.
    const start=await page.evaluate(()=>preparePlacement({lane:0}));await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+60,start.y+20,{steps:4});await page.mouse.up();assert.equal(await page.evaluate(()=>arenaApp.selection?.kind),'card');
    const paidBefore=await page.evaluate(()=>arenaApp.engine.teams[0].deployed);await page.locator('#arena-minimap').click({position:{x:60,y:30}});assert.equal(await page.evaluate(()=>arenaApp.engine.teams[0].deployed),paidBefore);
    await page.locator('#arena-canvas').scrollIntoViewIfNeeded();
   }
   await page.evaluate(()=>{arenaApp.startMatch({arenaId:'verdant'});arenaApp.engine.bot=false;arenaApp.engine.step=()=>{};});
   // Nearby allies previously made a legal target orange; exact occupation stays orange.
   const ally=await page.evaluate(()=>{const info=preparePlacement({lane:1,d:4}),e=arenaApp.engine,p={x:info.p.x+.55,y:info.p.y};e.spawn(arenaApp.catalog.byId.get('hammies'),0,p,1,{count:1,positions:[p]});return info;});await clickPoint(ally);
   const occupied=await page.evaluate(()=>{const info=preparePlacement({lane:1,d:4}),e=arenaApp.engine;e.spawn(arenaApp.catalog.byId.get('hammies'),0,info.p,1,{count:1,positions:[info.p]});return info;});await clickPoint(occupied,false);
   const forbidden=await page.evaluate(()=>preparePlacement({lane:1,d:9}));await clickPoint(forbidden,false);
   // Drag a real hand button into the lower lane, without turning it into camera pan.
   await page.evaluate(()=>preparePlacement({lane:2}));await page.locator('[data-hand-index="0"]').scrollIntoViewIfNeeded();const dragTarget=await page.evaluate(()=>preparePlacement({lane:2})),hand=await page.locator('[data-hand-index="0"]').boundingBox(),beforeDrag=await page.evaluate(()=>arenaApp.engine.teams[0].deployed);
   await page.mouse.move(hand.x+hand.width/2,hand.y+hand.height/2);await page.mouse.down();await page.mouse.move(dragTarget.x,dragTarget.y,{steps:8});await page.mouse.up();assert.equal(await page.evaluate(()=>arenaApp.engine.teams[0].deployed),beforeDrag+1);
   if(phone){
    const cdp=await context.newCDPSession(page),tap=await page.evaluate(()=>preparePlacement({lane:1,d:4})),before=await page.evaluate(()=>arenaApp.engine.teams[0].deployed);
    const send=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});const touch=(x,y)=>[{x,y,id:0,radiusX:4,radiusY:4,force:1}];
    await send('touchStart',touch(tap.x,tap.y));await send('touchMove',touch(tap.x+8,tap.y-4));await send('touchEnd',[]);assert.equal(await page.evaluate(()=>arenaApp.engine.teams[0].deployed),before+1,'small finger drift still counts as a tap');
    const swipe=await page.evaluate(()=>preparePlacement({lane:1,d:4})),beforeSwipe=await page.evaluate(()=>({deployed:arenaApp.engine.teams[0].deployed,center:{...arenaApp.renderer.camera.center}}));
    await send('touchStart',touch(swipe.x,swipe.y));await send('touchMove',touch(swipe.x+55,swipe.y+20));await send('touchEnd',[]);const afterSwipe=await page.evaluate(()=>({deployed:arenaApp.engine.teams[0].deployed,center:{...arenaApp.renderer.camera.center}}));assert.equal(afterSwipe.deployed,beforeSwipe.deployed);assert.notDeepEqual(afterSwipe.center,beforeSwipe.center);
    const cancel=await page.evaluate(()=>preparePlacement({lane:1,d:4}));await send('touchStart',touch(cancel.x,cancel.y));await send('touchCancel',[]);assert.equal(await page.evaluate(()=>arenaApp.engine.teams[0].deployed),beforeSwipe.deployed);
   }
   await page.locator('#arena-canvas').scrollIntoViewIfNeeded();await page.evaluate(()=>{arenaApp.renderer.home();arenaApp.clearSelection();});await page.screenshot({path:`/tmp/arena-deployment-${viewport.width}-v51.png`,fullPage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);results.push({viewport:viewport.width,placements});await context.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({results,errors},null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
