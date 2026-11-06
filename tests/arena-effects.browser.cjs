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
    await page.waitForFunction(()=>window.arenaApp?.catalog?.cards?.length===138);
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
      r.focusAt({x:21,y:14});return{results,hiddenDiff,hiddenStatusDiff,icons};
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
    assert.deepEqual(errors,[]);console.log(JSON.stringify({url:page.url(),...boundaries,fields:fixture.fields,lifeLoss:fixture.life[0],errors},null,2));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
