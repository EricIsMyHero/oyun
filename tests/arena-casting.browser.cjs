/* Blesser channel/receipt visuals, shared Ray forms and held charge in Chromium.
   Set ARENA_CASTING_URL to exercise a deployed build. */
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),prefix='/project/',mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix))return res.writeHead(404).end();const file=path.resolve(root,decodeURIComponent(url.pathname.slice(prefix.length)).replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
async function inspect(page,key){
  const point=await page.evaluate(key=>{const u=castingFixture[key],r=arenaApp.renderer;r.focusAt(u);const p=r.screenAt(u),b=document.getElementById('arena-canvas').getBoundingClientRect();arenaApp.engine.setPaused(false);return{x:b.left+p.x,y:b.top+p.y};},key);
  await page.mouse.click(point.x,point.y);await page.locator('#inspector').waitFor({state:'visible'});
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>{const url=new URL(r.request().url());if(url.hostname.endsWith('.r2.dev'))return r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#254c4c"/><path d="M40 260L100 50L160 260Z" fill="#b3d7cc"/></svg>'});if(url.hostname.includes('fonts.'))return r.abort();return r.continue();});
    await page.goto(process.env.ARENA_CASTING_URL||`http://127.0.0.1:${server.address().port}${prefix}arena/`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.arenaApp?.catalog?.cards?.length===138);
    const definitions=await page.evaluate(()=>{const c=arenaApp.catalog;return{ready:c.cards.filter(c=>c.ready).length,joshCount:c.byId.get('xii-josh').stats.number,aseRange:c.byId.get('ase/type2').stats.range,aseSpeed:c.byId.get('ase/type2').stats.speed,rayWidths:[1,2].flatMap(type=>{const d=c.byId.get(`mr-and-mrs-ray/type${type}`);return[d.combat.attackWidth,d.forms[0].combat.attackWidth];})};});
    assert.deepEqual(definitions,{ready:138,joshCount:1,aseRange:2500,aseSpeed:1050,rayWidths:[1250,1250,1250,1250]});await page.locator('#quick-build').click();await page.locator('#start-match').click();
    const channel=await page.evaluate(()=>{
      window.castingReset=()=>{arenaApp.startMatch();const e=arenaApp.engine;e.bot=false;e.state.units=[];e.state.fields=[];e.state.effects=[];e.random=()=>0;for(const c of e.castles)c.cooldown=Infinity;return e;};
      window.castingMake=(id,side,x,y,stats={},power=null)=>{const e=arenaApp.engine,d=structuredClone(arenaApp.catalog.byId.get(id));Object.assign(d.stats,{speed:0,criticalChance:0,dodge:0,lifestealChance:0,healrecovery:0,shieldrecovery:0,...stats});const made=e.spawn(d,side,{x,y},1,{count:1,positions:[{x,y}]});for(const u of made){u.stats.speed=0;u.cooldown=Infinity;}const u=made[0];if(power!=null)u.def={...u.def,id:'casting-ally',power,forms:[],combat:{...u.def.combat,attackType:'none'}};return u;};
      window.castingBlesser=()=>{const e=castingReset(),u=castingMake('blesser',0,15,14),weak=castingMake('hammies',0,16,13,{health:1000,shield:0},100),strong=castingMake('hammies',0,18,14,{health:300,shield:0},900);u.stats.speed=1000;strong.hp=50;e.step(1.5);e.setPaused(true);arenaApp.renderer.focusAt({x:16.5,y:14});window.castingFixture={u,weak,strong};return e;};
      const e=castingBlesser(),{u,strong}=castingFixture,r=arenaApp.renderer,ctx=r.ctx,dpr=r.view.dpr,portrait=r.portrait;r.portrait=()=>null;r.canvas.width=r.canvas.width;
      const p=r.screenAt(16.5,14),w=Math.round(r.view.scale*2*dpr),h=Math.round(r.view.scale*1.5*dpr),read=()=>Array.from(ctx.getImageData(Math.round(p.x*dpr-w/2),Math.round((p.y-r.view.scale*.5)*dpr-h/2),w,h).data);
      const saved=u.memory.blessingChannel;u.memory.blessingChannel=null;r.draw(e.state);const before=read();u.memory.blessingChannel=saved;r.draw(e.state);const after=read(),pixels=before.reduce((n,v,i)=>n+(i%4!==3&&Math.abs(v-after[i])>12?1:0),0),marked=r.blessingTargets.has(strong.id);
      r.portrait=portrait;r.draw(e.state);return{selected:u.memory.blessingTargetId===strong.id,progress:saved.progress,pixels,marked};
    });
    assert.equal(channel.selected,true);close(channel.progress,1.5);assert.ok(channel.pixels>50);assert.equal(channel.marked,true);await page.screenshot({path:'/tmp/oyun-blesser-channel-v39.png',fullPage:true});
    const completion=await page.evaluate(()=>{const e=arenaApp.engine,{u,strong,weak}=castingFixture;e.setPaused(false);e.step(1.5);e.setPaused(true);return{blessed:u.memory.blessed,strongHp:strong.hp,strongMax:e.maxHealth(strong),weakMax:e.maxHealth(weak),receipt:strong.statuses.some(s=>s.kind==='blessed'),fx:e.state.effects.some(f=>f.type==='blessing'&&f.unitId===strong.id),x:u.x};});
    assert.deepEqual(completion,{blessed:true,strongHp:60,strongMax:360,weakMax:1000,receipt:true,fx:true,x:15});await page.screenshot({path:'/tmp/oyun-blesser-complete-v39.png',fullPage:true});
    await inspect(page,'strong');assert.equal(await page.locator('[data-status="blessed"] svg').count(),1);assert.equal(await page.locator('#inspector [data-stat="health"] strong').textContent(),'60 / 360');await page.screenshot({path:'/tmp/oyun-blesser-receipt-v39.png',fullPage:true});await page.locator('#inspector-close').click();
    const stationary=await page.evaluate(()=>{const e=arenaApp.engine;e.setPaused(false);e.step(Math.max(0,11.9-e.time));e.setPaused(true);return{x:castingFixture.u.x,y:castingFixture.u.y};});close(stationary.x,15);close(stationary.y,14);
    const forms=[];
    for(const type of[1,2]){
      const fusion=await page.evaluate(type=>{
        const e=castingReset(),u=castingMake(`mr-and-mrs-ray/type${type}`,0,15,14),partner=e.units.find(t=>t!==u&&t.groupId===u.groupId);
        const enemy=(x,y)=>castingMake('hammies',1,x,y,{health:500,shield:0,damage:0,range:0},10);
        u.memory.rayCharge=partner.memory.rayCharge=100;e.step(1);const waiting=!u.sharedVitalsId&&!partner.sharedVitalsId&&u.memory.rayCharge===100&&partner.memory.rayCharge===100;
        const inside=enemy(type===1?15.6:18,type===1?14:14.95),behind=enemy(14.4,14),outside=enemy(18,15.6),beyond=enemy(20.7,14);
        if(type===2)enemy(15.4,14);e._hook('tick',u,0);e.step(type===1?.27:1.5);if(type===1)e.damage(null,u,40,{kind:'spell',bypassShield:true});e.setPaused(true);arenaApp.renderer.focusAt({x:type===1?15.5:17,y:14});window.castingFixture={u,partner,inside,behind,outside,beyond};
        let bodies=0;const r=arenaApp.renderer,paint=r.unit;r.unit=function(ctx,unit,...args){if(unit.groupId===u.groupId)bodies++;return paint.call(this,ctx,unit,...args);};r.draw(e.state);r.unit=paint;
        return{waiting,mode:u.rayFusion.mode,pool:e.maxHealth(u),hp:u.hp,partnerHp:partner.hp,bodies,hidden:partner.fusedInto===u.id,width:u.rayDash?.width,length:u.rayDash?.length,behind:behind.hp};
      },type);
      assert.equal(fusion.waiting,true);assert.equal(fusion.mode,type);assert.equal(fusion.pool,type===1?620:740);assert.equal(fusion.hp,fusion.partnerHp);assert.equal(fusion.bodies,1);assert.equal(fusion.hidden,true);if(type===1)assert.equal(fusion.behind,495);else{assert.equal(fusion.width,2);assert.equal(fusion.length,5);assert.equal(fusion.behind,500);}
      forms.push(fusion);await page.screenshot({path:`/tmp/oyun-rays-form${type}-v39.png`,fullPage:true});
      await inspect(page,'u');assert.equal(await page.locator(`[data-ray-fusion="${type}"]`).count(),1);assert.match(await page.locator('[data-native-charge="rayCharge"]').textContent(),/ACTIVE/);if(type===2)assert.match(await page.locator('[data-ray-charge]').textContent(),/2 × 5-tile.*75 damage/);await page.locator('#inspector-close').click();
      if(type===2){const result=await page.evaluate(()=>{const e=arenaApp.engine,{u,partner,inside,outside,beyond}=castingFixture;e.setPaused(false);e.step(Math.max(0,u.rayFusion.until-e.time)+.05);e.setPaused(true);return{inside:inside.hp,outside:outside.hp,beyond:beyond.hp,split:!u.sharedVitalsId&&!partner.fusedInto&&!u.rayDash};});assert.deepEqual(result,{inside:425,outside:500,beyond:500,split:true});}
    }
    const boundary=await page.evaluate(async()=>{
      const {isWalkable}=await import('./js/map.mjs'),e=castingReset(),u=castingMake('mr-and-mrs-ray/type2',0,21.5,14),partner=e.units.find(t=>t!==u&&t.groupId===u.groupId),target=castingMake('hammies',1,21.5,14.6,{health:500,shield:0,damage:0,range:0},10);
      u.memory.rayCharge=partner.memory.rayCharge=100;u.facingX=1;u.facingY=0;e._hook('tick',u,0);const length=u.rayDash.length,width=u.rayDash.width,limited=u.rayDash.boundaryLimited;
      let safe=true;for(let i=0;i<20;i++){e.step(.1);safe&&=isWalkable(u)&&isWalkable(partner);}e.setPaused(true);arenaApp.renderer.focusAt({x:21.5,y:14});window.castingFixture={u,partner,target};
      return{length,width,limited,safe,x:u.x,y:u.y,hp:target.hp,active:!!u.sharedVitalsId};
    });
    close(boundary.length,1.05);close(boundary.width,2);close(boundary.x,21.5);close(boundary.y,15.05);assert.equal(boundary.limited,true);assert.equal(boundary.safe,true);assert.equal(boundary.active,true);close(boundary.hp,425);
    await page.screenshot({path:'/tmp/oyun-rays-boundary-v39.png',fullPage:true});
    const split=await page.evaluate(async()=>{const{isWalkable}=await import('./js/map.mjs'),{u,partner}=castingFixture,e=arenaApp.engine;e.setPaused(false);e.step(1.8);e.setPaused(true);return{split:!u.sharedVitalsId&&!partner.fusedInto&&!u.rayDash,safe:isWalkable(u)&&isWalkable(partner)};});assert.deepEqual(split,{split:true,safe:true});
    const hold=await page.evaluate(()=>{const e=castingReset(),u=castingMake('laura',0,15,14);e.step(30);e.setPaused(true);arenaApp.renderer.focusAt(u);window.castingFixture={u};return u.memory.charge;});close(hold,100);await page.screenshot({path:'/tmp/oyun-charge-held-v39.png',fullPage:true});
    const dumpsy=await page.evaluate(()=>{const e=castingReset(),u=castingMake('dumpsy',0,15,14),target=castingMake('hammies',1,15.5,14,{health:5000,shield:0,damage:0,range:0},1),values=[];for(let i=0;i<3;i++){e.state.time=i*.9;u.memory.dumpPhase=0;const hp=target.hp;e.ability(u).weaponTick(e,u,0);values.push(hp-target.hp);}e.setPaused(true);window.castingFixture={u};return values;});for(let i=0;i<3;i++)close(dumpsy[i],[10,10.5,11.025][i]);
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{castingBlesser();arenaApp.renderer.focusAt({x:16.5,y:14});});await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'/tmp/oyun-blesser-mobile-v39.png',fullPage:true});
    assert.deepEqual(errors,[]);console.log(JSON.stringify({url:page.url(),definitions,channel,completion,forms,boundary,hold,dumpsy,errors},null,2));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
