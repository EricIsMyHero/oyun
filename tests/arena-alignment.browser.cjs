/* Measure actual sprite alpha, then check the real drawImage calls at all zooms. */
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const{chromium}=require('playwright'),root=path.resolve(__dirname,'..'),prefix='/project/';
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix))return res.writeHead(404).end();const file=path.resolve(root,decodeURIComponent(url.pathname.slice(prefix.length)).replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),errors=[],results=[];
 try{
  for(const viewport of[{width:1440,height:1100},{width:390,height:844}]){
   const page=await browser.newPage({viewport});page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname.endsWith('.r2.dev'))return r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#254c4c"/></svg>'});if(u.hostname.includes('fonts.'))return r.abort();return r.continue();});
   await page.goto(process.env.ARENA_ALIGNMENT_URL||`http://127.0.0.1:${server.address().port}${prefix}arena/`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.arenaApp?.catalog&&[...arenaApp.renderer.images].filter(([u])=>u.includes('/assets/')).length>=5&&[...arenaApp.renderer.images].filter(([u])=>u.includes('/assets/')).every(([,i])=>i.loaded));
   const result=await page.evaluate(()=>{
    const a=arenaApp,r=a.renderer,atlas=[...r.images].find(([u])=>u.includes('arena-structures.webp'))[1],n=atlas.naturalWidth/2;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=atlas.naturalWidth;const ctx=canvas.getContext('2d');ctx.drawImage(atlas,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const fit=(column,row)=>{
     const samples=[];for(let x=20;x<n-20;x+=20){let bottom=null;for(let y=350;y<600;y++)if(pixels[((row*n+y)*canvas.width+column*n+x)*4+3]>180)bottom=y;if(bottom!==null)samples.push([x,bottom]);}
     let best=null;
     for(let cx=298;cx<326;cx++)for(let radius=265;radius<306;radius++){
      const data=samples.filter(([x])=>Math.abs(x-cx)<radius*.94).map(([x,y])=>[Math.sqrt(1-((x-cx)/radius)**2),y]);
      const mx=data.reduce((sum,[x])=>sum+x,0)/data.length,my=data.reduce((sum,[,y])=>sum+y,0)/data.length;
      const ry=data.reduce((sum,[x,y])=>sum+(x-mx)*(y-my),0)/data.reduce((sum,[x])=>sum+(x-mx)**2,0),cy=my-ry*mx,error=data.reduce((sum,[x,y])=>sum+(cy+ry*x-y)**2,0)/data.length;
      if(!best||error<best.error)best={error,x:cx,y:cy};
     }return best;
    };
    const fitted=[[fit(0,0),fit(1,0)],[fit(0,1),fit(1,1)]],measurements=[];
    for(const id of['verdant','waterfall','lava','swamp','prison']){
     a.previewArena(id);r.setBattleView(true);
     for(const zoom of[.5,1,1.6]){
      r.camera.setZoom(zoom);r.syncCamera();const calls=[],draw=r.ctx.drawImage;
      try{r.ctx.drawImage=function(image,...args){if(image===atlas)calls.push(args);return draw.call(this,image,...args);};r.draw(null);}finally{r.ctx.drawImage=draw;}
      for(const[sx,sy,sw,sh,dx,dy,dw,dh]of calls){
       const column=Math.floor(sx/n),row=Math.floor(sy/n),base=fitted[row][column],actual={x:dx+(column*n+base.x-sx)/sw*dw,y:dy+(row*n+base.y-sy)/sh*dh};
       const point=row===0?r.map.bases[column]:r.map.nodes[measurements.filter(m=>m.id===id&&m.zoom===zoom&&m.row===1).length];
       const expected=r.screenAt(point),error=Math.hypot(actual.x-expected.x,actual.y-expected.y);
       if(error>1.5)throw new Error(`${id}/${zoom}/${row}:${column} stone ground center is ${error.toFixed(2)}px off the painted court`);
       measurements.push({id,zoom,row,column,error});
      }
     }
    }
    a.previewArena('verdant');return{maximumError:Math.max(...measurements.map(m=>m.error)),count:measurements.length};
   });
   assert.ok(result.maximumError<1.5);assert.equal(result.count,51);results.push({viewport:viewport.width,...result});
   for(const id of['verdant','waterfall','lava','swamp','prison']){await page.locator(`[data-preview-arena="${id}"]`).click();await page.waitForTimeout(100);await page.locator('#arena-canvas').screenshot({path:`/tmp/arena-alignment-${id}-${viewport.width}-v50.png`});}
   await page.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({results,errors},null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
