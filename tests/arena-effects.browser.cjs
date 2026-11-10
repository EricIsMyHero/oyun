/* Real Canvas rendering, status inspection, field boundaries and fog regression.
   Run locally, or set ARENA_EFFECTS_URL to check a deployed build. */
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),prefix='/project/';
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix))return res.writeHead(404).end();
    const file=path.resolve(root,decodeURIComponent(url.pathname.slice(prefix.length)).replace(/\/$/,'/index.html'));
    if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(await fs.readFile(file));
  }catch{res.writeHead(404).end();}
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>{
      const url=new URL(r.request().url());
      if(url.hostname.endsWith('.r2.dev'))return r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#254c4c"/><path d="M40 260L100 50L160 260Z" fill="#b3d7cc"/></svg>'});
      if(url.hostname.includes('fonts.'))return r.abort();return r.continue();
    });
    await page.goto(process.env.ARENA_EFFECTS_URL||`http://127.0.0.1:${server.address().port}${prefix}arena/`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.arenaApp?.catalog?.cards?.length===167);
    assert.equal(await page.evaluate(()=>arenaApp.catalog.cards.filter(c=>c.ready).length),138,'all roots including the authored Ray form IDs are ready');
    await page.locator('#quick-build').click();await page.locator('#start-match').click();
    const fixture=await page.evaluate(()=>{
      const a=arenaApp,e=a.engine;e.bot=false;e.setPaused(true);e.state.units=[];e.state.effects=[];e.state.time=0;
      for(const c of e.castles)c.cooldown=Infinity;
      for(const[id,side,p]of[['roots',0,{x:16,y:14}],['nightfall-curse',1,{x:21,y:10}],['spirit-of-the-wild',0,{x:25,y:15}]])e._applySpell(side,a.catalog.spellById.get(id),p,id);
      e.state.fields.push({id:'visual-poison',kind:'poison-cloud',side:1,x:21,y:18,shape:{shape:'rect',width:1.5,height:1.5},born:0,until:8,poisoned:{}});
      e.state.fields.push({id:'visual-mist',kind:'blinding-mist',side:0,x:17,y:18,shape:{shape:'rect',width:2,height:2},born:0,until:7});
      const spawn=(id,x,y,kinds)=>{
        const d=structuredClone(a.catalog.byId.get(id));Object.assign(d.stats,{health:1000,speed:0,range:0,damage:0,shield:0,healrecovery:0,shieldrecovery:0});d.combat.attackType='none';
        const[u]=e.spawn(d,0,{x,y},1,{count:1,positions:[{x,y}]});u.cooldown=Infinity;
        for(const kind of kinds)e.status(u,kind,12,.25,null,{amount:0});return u;
      };
      const combined=spawn('hammies',21,14,['frozen','slow','poison']);
      spawn('hammies',18.5,13,['frozen']);spawn('hammies',24,13,['poison']);spawn('hammies',21,17,['burn']);spawn('hammies',18,18,['stun']);spawn('hammies',24,16,['curse']);spawn('hammies',23,19,['root']);
      const gloop=spawn('gloop',18,15.5,[]);e.state.time=2;e._lifeDecay(gloop);e.state.effects=e.state.effects.filter(f=>f.type==='lifeLoss');
      a.renderer.focusAt({x:21,y:14});window.effectsFixture={combined,gloop};
      return{fields:e.state.fields.length,life:e.state.effects.map(f=>({type:f.type,color:f.color,amount:f.amount}))};
    });
    assert.equal(fixture.fields,5);assert.ok(fixture.life.length>0);assert.ok(fixture.life.every(f=>f.type==='lifeLoss'&&f.color==='#ff747d'&&f.amount===10));
    const boundaries=await page.evaluate(()=>{
      const e=arenaApp.engine,r=arenaApp.renderer,ctx=r.ctx,dpr=r.view.dpr;
      // Isolate overlay geometry from external artwork for origin-clean pixel reads.
      const portrait=r.portrait;r.portrait=()=>null;r.canvas.width=r.canvas.width;
      const pixels=(point,w=12,h=12)=>{const p=r.screenAt(point);return Array.from(ctx.getImageData(Math.round(p.x*dpr-w/2),Math.round(p.y*dpr-h/2),w,h).data);};
      const diff=(a,b)=>a.reduce((n,v,i)=>n+(i%4!==3&&Math.abs(v-b[i])>10?1:0),0);
      const results=[];
      for(const field of e.state.fields){
        r.focusAt(field);const p={x:field.x+(field.shape.radius||field.shape.width/2),y:field.y};
        r.draw({...e.state,fields:[],effects:[]});const before=pixels(p);
        r.draw({...e.state,fields:[field],effects:[]});const after=pixels(p);results.push({kind:field.kind,changed:diff(before,after)});
        r.draw({...e.state,fields:[{...field,until:e.time}],effects:[]});const expired=diff(before,pixels(p));if(expired!==0)throw Error(`Expired ${field.kind} still paints an area`);
      }
      // A distant enemy field must not paint through the unrevealed map.
      const hidden={kind:'roots',side:1,x:38,y:24,shape:{shape:'circle',radius:2},born:0,until:12};r.focusAt(hidden);
      r.draw({...e.state,fields:[],effects:[]});const before=pixels(hidden,40,40);
      r.draw({...e.state,fields:[hidden],effects:[]});const hiddenDiff=diff(before,pixels(hidden,40,40));
      const hiddenDef=structuredClone(arenaApp.catalog.byId.get('hammies'));hiddenDef.combat.attackType='none';Object.assign(hiddenDef.stats,{speed:0,range:0,damage:0});
      const [concealed]=e.spawn(hiddenDef,1,{x:22,y:14},1,{count:1,positions:[{x:22,y:14}]});concealed.cooldown=Infinity;e.status(concealed,'invisible',10);e.status(concealed,'frozen',10);
      r.focusAt(concealed);r.draw({...e.state,effects:[]});const hiddenStatusBefore=pixels(concealed,90,90);
      r.draw({...e.state,effects:e.state.effects.filter(f=>f.type==='status'&&f.unitId===concealed.id)});const hiddenStatusDiff=diff(hiddenStatusBefore,pixels(concealed,90,90));
      const u=effectsFixture.combined;r.focusAt(u);const size=Math.max(12,Math.min(34,r.view.scale*.86)),center=r.screenAt(u),saved=u.statuses;
      const badgePixels=()=>Array.from(ctx.getImageData(Math.round((center.x-28)*dpr),Math.round((center.y-size*1.55-23)*dpr),Math.round(56*dpr),Math.round(18*dpr)).data);
      u.statuses=[];r.draw({...e.state,effects:[]});const without=badgePixels();u.statuses=saved;r.draw({...e.state,effects:[]});const icons=diff(without,badgePixels());
      r.portrait=portrait;r.focusAt({x:21,y:14});r.draw(e.state);return{results,hiddenDiff,hiddenStatusDiff,icons};
    });
    for(const result of boundaries.results)assert.ok(result.changed>8,`${result.kind} paints a visible boundary`);
    assert.equal(boundaries.hiddenDiff,0,'fog hides field effects and their labels');assert.equal(boundaries.hiddenStatusDiff,0,'status pulses do not disclose an invisible enemy');assert.ok(boundaries.icons>30,'readable icons render above the card');
    await page.screenshot({path:'/tmp/oyun-effects-v36-desktop.png',fullPage:true});
    const time=await page.evaluate(()=>arenaApp.engine.time);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>arenaApp.engine.time),time,'visual timers pause with the battle');
    const point=await page.evaluate(()=>{const p=arenaApp.renderer.screenAt(effectsFixture.combined),b=document.getElementById('arena-canvas').getBoundingClientRect();return{x:b.left+p.x,y:b.top+p.y};});
    await page.evaluate(()=>arenaApp.engine.setPaused(false));
    await page.mouse.click(point.x,point.y);await page.locator('#inspector').waitFor({state:'visible'});
    for(const kind of['frozen','slow','poison'])assert.equal(await page.locator(`#inspector [data-status="${kind}"] svg`).count(),1,`${kind} has a vector icon and a readable text label`);
    await page.screenshot({path:'/tmp/oyun-effects-v36-inspector.png',fullPage:true});await page.locator('#inspector-close').click();
    await page.evaluate(()=>{arenaApp.engine.setPaused(true);arenaApp.renderer.zoomBy(.5);arenaApp.renderer.focusAt(effectsFixture.combined);});
    await page.screenshot({path:'/tmp/oyun-effects-v36-zoom50.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'effects do not cause horizontal overflow');
    await page.screenshot({path:'/tmp/oyun-effects-v36-mobile.png',fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    const charges=await page.evaluate(async()=>{
      const {nativeCharge}=await import('./js/visuals.mjs');const a=arenaApp;a.startMatch();const e=a.engine;e.bot=false;e.state.units=[];e.state.fields=[];e.state.effects=[];for(const c of e.castles)c.cooldown=Infinity;
      const make=(id,x,y,value)=>{const d=structuredClone(a.catalog.byId.get(id));Object.assign(d.stats,{speed:0,range:0,damage:0,criticalChance:0,healrecovery:0,shieldrecovery:0});const[u]=e.spawn(d,0,{x,y},1,{count:1,positions:[{x,y}]});u.cooldown=Infinity;if(value!=null)u.memory[nativeCharge(u).key]=value;return u;};
      const laura=make('laura',15,14);e.step(5);const gained=nativeCharge(laura).total;
      e.step(7.5);const held=nativeCharge(laura).total;make('hammies',15.1,14);e.step(.04);const spent=nativeCharge(laura).total;e.step(5);
      const kai=make('kai',18,12,100),artist=make('artist',18,16,30);make('tribe',21,13,65);make('ase/type1',22,16,2);
      const ray=make('mr-and-mrs-ray/type1',25,14),partner=e.units.find(u=>u!==ray&&u.groupId===ray.groupId);Object.assign(partner,{x:27,y:14,cooldown:Infinity});partner.stats.speed=0;
      make('wong',17,18,75);make('clara',21,18,25);make('unara',25,18,90);make('ali',24,11,20);make('shellbyte',21,10,25);e.step(2);e.setPaused(true);a.renderer.focusAt({x:21,y:14});
      const r=a.renderer,point=r.screenAt(laura),size=Math.max(12,Math.min(34,r.view.scale*.86)),dpr=r.view.dpr,ctx=r.ctx;
      const portrait=r.portrait;r.portrait=()=>null;r.canvas.width=r.canvas.width;
      const pixels=()=>Array.from(ctx.getImageData(Math.round((point.x-26)*dpr),Math.round((point.y-size*1.55-16)*dpr),Math.round(52*dpr),Math.round(10*dpr)).data);
      const paint=r.chargeBar;r.chargeBar=()=>{};r.draw(e.state);const before=pixels();r.chargeBar=paint;r.draw(e.state);const after=pixels(),changed=before.reduce((n,v,i)=>n+(i%4!==3&&Math.abs(v-after[i])>10?1:0),0);
      r.portrait=portrait;r.draw(e.state);
      window.chargeFixture={laura,ray,partner};
      return{gained,held,spent,changed,laura:nativeCharge(laura),ray:nativeCharge(ray),partner:nativeCharge(partner),artist:nativeCharge(artist),ready:nativeCharge(kai).ready,
        stats:Object.fromEntries(['frostshot','deadscope','naar','lyra'].map(id=>{const c=a.catalog.byId.get(id);return[id,{health:c.stats.health,shield:c.stats.shield,damage:c.attack.damage,interval:c.attack.interval,delay:c.attack.delay,range:c.stats.range}];}))};
    });
    assert.ok(Math.abs(charges.gained-40)<1e-6);assert.ok(Math.abs(charges.held-100)<1e-6);assert.ok(Math.abs(charges.spent)<1e-6);assert.ok(charges.changed>50,'the real charge bar and number paint above the card');
    assert.ok(Math.abs(charges.ray.total-12)<1e-6);assert.ok(Math.abs(charges.partner.total-12)<1e-6);assert.equal(charges.ray.max,100);assert.equal(charges.artist.total,30);assert.equal(charges.ready,true);
    assert.equal(charges.stats.frostshot.interval,.25);assert.equal(charges.stats.frostshot.delay,1.4);assert.equal(charges.stats.deadscope.damage,125);assert.equal(charges.stats.deadscope.interval,5.25);assert.equal(charges.stats.deadscope.range,7000);assert.equal(charges.stats.naar.damage,96);assert.equal(charges.stats.naar.interval,3.75);assert.equal(charges.stats.lyra.health,180);assert.equal(charges.stats.lyra.shield,45);
    await page.screenshot({path:'/tmp/oyun-charge-v37-desktop.png',fullPage:true});
    const chargePoint=await page.evaluate(()=>{const r=arenaApp.renderer;r.focusAt(chargeFixture.laura);const p=r.screenAt(chargeFixture.laura),b=document.getElementById('arena-canvas').getBoundingClientRect();arenaApp.engine.setPaused(false);return{x:b.left+p.x,y:b.top+p.y};});
    await page.mouse.click(chargePoint.x,chargePoint.y);await page.locator('#inspector').waitFor({state:'visible'});assert.equal(await page.locator('[data-native-charge="charge"] [role="progressbar"]').count(),1);
    const readout=Number(await page.locator('[data-native-charge="charge"] [role="progressbar"]').getAttribute('aria-valuenow'));assert.ok(Math.abs(readout-await page.evaluate(()=>chargeFixture.laura.memory.charge))<1e-6);
    await page.screenshot({path:'/tmp/oyun-charge-v37-inspector.png',fullPage:true});await page.locator('#inspector-close').click();
    await page.evaluate(()=>{arenaApp.engine.setPaused(true);arenaApp.renderer.zoomBy(.5);arenaApp.renderer.focusAt({x:21,y:14});});
    await page.screenshot({path:'/tmp/oyun-charge-v37-zoom50.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'/tmp/oyun-charge-v37-mobile.png',fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    const weakness=await page.evaluate(async()=>{
      const [{statusMagnitude},{statusBadges}]=await Promise.all([import('./js/statuses.mjs'),import('./js/visuals.mjs')]);
      const a=arenaApp;a.startMatch();const e=a.engine;e.bot=false;e.state.units=[];e.state.effects=[];for(const c of e.castles)c.cooldown=Infinity;
      const make=(side,x)=>{const d=structuredClone(a.catalog.byId.get('hammies'));d.id='weakness-visual';d.combat.attackType='none';Object.assign(d.stats,{health:1000,shield:0,speed:0,range:0,damage:10,criticalChance:0,healrecovery:0,shieldrecovery:0,flexibility:0});const[u]=e.spawn(d,side,{x,y:14},1,{count:1,positions:[{x,y:14}]});u.cooldown=Infinity;return u;};
      const u=make(0,19),enemy=make(1,21);u.hp=500;
      e.status(u,'Heal',5,4);e.status(u,'damageBonus',10,.2);e.status(u,'allStatsBonus',10,.2);e.status(u,'weakness',10);e.status(u,'Absolute Weakness',10);
      const stun=e.status(u,'stun',2),slow=e.status(u,'slow',4,.25),blocked=e.status(enemy,'poison',2,.1,u,{scheduled:true});
      e.step(1);e.setPaused(true);a.renderer.focusAt(u);window.weaknessFixture={u,enemy};
      const r=a.renderer,ctx=r.ctx,dpr=r.view.dpr,portrait=r.portrait;r.portrait=()=>null;r.canvas.width=r.canvas.width;
      const p=r.screenAt(u),read=()=>Array.from(ctx.getImageData(Math.round((p.x-40)*dpr),Math.round((p.y-85)*dpr),Math.round(80*dpr),Math.round(65*dpr)).data);
      const saved=u.statuses;u.statuses=[];r.draw(e.state);const before=read();u.statuses=saved;r.draw(e.state);const after=read(),changed=before.reduce((n,v,i)=>n+(i%4!==3&&Math.abs(v-after[i])>10?1:0),0);r.portrait=portrait;r.draw(e.state);
      return{hp:u.hp,bonus:statusMagnitude(u,'damageBonus',e.time),maxHp:e.maxHealth(u),stun:stun.until,slow:slow.until,blocked,changed,badges:statusBadges(u.statuses,e.time).map(b=>b.kind)};
    });
    assert.ok(Math.abs(weakness.hp-504)<1e-6,'Stun does not stop an active Heal');assert.ok(Math.abs(weakness.bonus-.14)<1e-6);assert.equal(weakness.maxHp,1140);
    assert.ok(Math.abs(weakness.stun-2.66)<1e-6);assert.equal(weakness.slow,6);assert.equal(weakness.blocked,null);assert.ok(weakness.changed>30,'the new vector badges paint on Canvas');
    await page.screenshot({path:'/tmp/oyun-weakness-v42-desktop.png',fullPage:true});
    const weakPoint=await page.evaluate(()=>{const p=arenaApp.renderer.screenAt(weaknessFixture.u),b=document.getElementById('arena-canvas').getBoundingClientRect();arenaApp.engine.setPaused(false);return{x:b.left+p.x,y:b.top+p.y};});
    await page.mouse.click(weakPoint.x,weakPoint.y);await page.locator('#inspector').waitFor({state:'visible'});
    for(const kind of['weakness','absoluteWeakness']){const badge=page.locator(`#inspector [data-status="${kind}"]`);assert.equal(await badge.locator('svg').count(),1);assert.equal(await badge.getAttribute('data-polarity'),'negative');assert.equal(await badge.getAttribute('data-category'),'control');assert.match(await badge.getAttribute('title'),/Negative.*Control/);}
    assert.match(await page.locator('[data-vulnerability="absoluteWeakness"]').textContent(),/30% weaker.*permanent native passive gains remain unchanged/);
    assert.equal(await page.locator('#inspector [data-status="regen"]').count(),1);assert.equal(await page.locator('#inspector [data-status="stun"]').count(),1);
    await page.screenshot({path:'/tmp/oyun-weakness-v42-inspector.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'/tmp/oyun-weakness-v42-mobile.png',fullPage:true});
    assert.deepEqual(errors,[]);console.log(JSON.stringify({url:page.url(),...boundaries,fields:fixture.fields,lifeLoss:fixture.life[0],charges,weakness,errors},null,2));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
