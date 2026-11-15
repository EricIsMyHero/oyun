const test=require('node:test'),assert=require('node:assert/strict');
const modules=Promise.all([import('../arena/js/map.mjs'),import('../arena/js/camera.mjs'),import('../arena/js/projection.mjs'),import('../arena/js/scene-art.mjs')]);
const close=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<tolerance,`${a} ≈ ${b}`);

test('both portrait cameras round-trip positions, drag and zoom at desktop and phone sizes',async()=>{
  const [{ARENAS},{ArenaCamera},{projectPoint}]=await modules;
  for(const map of [ARENAS.waterfall,ARENAS.lava])for(const [width,height]of [[1310,690],[374,304]]){
    const camera=new ArenaCamera(width,height,map);camera.setActive(true);camera.focus({x:map.width/2,y:map.height/2});
    const blue=projectPoint(camera.view,map.bases[0]),red=projectPoint(camera.view,map.bases[1]);close(blue.x,red.x);assert.ok(blue.y>red.y);
    for(const p of [...map.bases,...map.routes.flat(),{x:map.width,y:map.height}]){const screen=projectPoint(camera.view,p),back=camera.worldAt(screen.x,screen.y);close(back.x,p.x);close(back.y,p.y);}
    const before=camera.worldAt(width*.4,height*.5);camera.panBy(30,-25);const after=camera.worldAt(width*.4+30,height*.5-25);close(before.x,after.x);close(before.y,after.y);
    const anchor={x:width*.45,y:height*.55},world=camera.worldAt(anchor.x,anchor.y);camera.setZoom(.75,anchor);const zoomed=camera.worldAt(anchor.x,anchor.y);close(world.x,zoomed.x);close(world.y,zoomed.y);
  }
});

test('portrait overviews fit the full painting without distorting its 2:3 aspect',async()=>{
  const [{ARENAS},{ArenaCamera},{projectPoint}]=await modules;
  for(const map of [ARENAS.waterfall,ARENAS.lava]){
    const camera=new ArenaCamera(1280,800,map),view=camera.view;
    const a=projectPoint(view,{x:map.width+2,y:-2}),b=projectPoint(view,{x:-2,y:map.height+2});
    close((b.x-a.x)/(b.y-a.y),2/3);assert.ok(a.x>=0&&a.y>=0&&b.x<=1280&&b.y<=800);
  }
});

test('painted registration meshes cover every source pixel without folding or dropping an anchor',async()=>{
  const [,,, {SCENES,registrationMesh}]=await modules;
  for(const scene of Object.values(SCENES)){
    const mesh=registrationMesh(scene);let area=0;
    for(const[a,b,c]of mesh){const source=(b.sx-a.sx)*(c.sy-a.sy)-(b.sy-a.sy)*(c.sx-a.sx),target=(b.tx-a.tx)*(c.ty-a.ty)-(b.ty-a.ty)*(c.tx-a.tx);assert.ok(source*target>0);area+=Math.abs(source)/2;}
    close(area,scene.width*scene.height);
    for(const [sx,sy,tx,ty]of scene.anchors)assert.ok(mesh.some(t=>t.some(p=>p.sx===sx&&p.sy===sy&&p.tx===tx&&p.ty===ty)));
  }
});

test('painted castle courts, mana pads and basin align with their gameplay world coordinates',async()=>{
  const [{ARENAS},,{atlasView,projectPoint},{SCENES,scenePoint}]=await modules;
  for(const map of Object.values(ARENAS)){
    const scene=SCENES[map.id],view=atlasView(map,40),landmarks=[...map.bases,...(map.nodes.length?map.nodes:[map.center])];
    for(let i=0;i<landmarks.length;i++){
      const expected=projectPoint(view,landmarks[i]),anchor=scene.anchors[i],actual=scenePoint(map,view,scene,anchor[2],anchor[3]);
      assert.ok(Math.hypot(expected.x-actual.x,expected.y-actual.y)<view.scale*.06,`${map.id}/${i}`);
    }
  }
});


test('ranged weapons face the same screen direction as their projectiles on every map',async()=>{
  const [{ARENAS},{ArenaCamera},{projectPoint,projectDirection}]=await modules;
  for(const map of Object.values(ARENAS)){
    const camera=new ArenaCamera(1000,600,map);camera.setActive(true);
    for(const direction of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:.4,y:.7}]){
      const a=projectPoint(camera.view,map.bases[0]),b=projectPoint(camera.view,{x:map.bases[0].x+direction.x,y:map.bases[0].y+direction.y});
      const length=Math.hypot(b.x-a.x,b.y-a.y),aim=projectDirection(camera.view,direction);close(aim.x,(b.x-a.x)/length);close(aim.y,(b.y-a.y)/length);
    }
  }
});

test('corrected bridge decks follow their real lanes and leave a clear walking strip on both sides of the center',async()=>{
  const [{MAP,closestRoute},,,{SCENES,PAINTED_BRIDGES,registrationMesh,guidePoint}]=await modules;
  const inverse=p=>{
    for(const[a,b,c]of registrationMesh(SCENES.verdant)){
      const det=(b.ty-c.ty)*(a.tx-c.tx)+(c.tx-b.tx)*(a.ty-c.ty),u=((b.ty-c.ty)*(p.x-c.tx)+(c.tx-b.tx)*(p.y-c.ty))/det,v=((c.ty-a.ty)*(p.x-c.tx)+(a.tx-c.tx)*(p.y-c.ty))/det,w=1-u-v;
      if(Math.min(u,v,w)<-1e-7)continue;
      return{x:u*a.sx+v*b.sx+w*c.sx,y:u*a.sy+v*b.sy+w*c.sy};
    }
    throw new Error('Walking point fell outside the terrain registration mesh.');
  };
  const inside=(p,polygon)=>{let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const[a,b]=polygon[i],[c,d]=polygon[j];if(((b>p.y)!==(d>p.y))&&(p.x<(c-a)*(p.y-b)/(d-b)+a))hit=!hit;
  }return hit;};
  for(const bridge of PAINTED_BRIDGES){
    for(const p of bridge.ends){const road=closestRoute(p,MAP);assert.equal(road.lane,bridge.lane);close(road.distance,0);}
    for(const offset of[-.5,0,.5])for(let i=1;i<20;i++){
      const t=i/20,[a,b]=bridge.ends,world={x:a.x+(b.x-a.x)*t,y:a.y+offset};
      assert.ok(inside(inverse(guidePoint(MAP,world)),bridge.walkway),`lane ${bridge.lane}, ${t}, offset ${offset}`);
    }
  }
});

test('structure placement registers the stone ground center across all maps, zooms and atlas resolutions',async()=>{
  const[{ARENAS},{ArenaCamera},{projectPoint},{structurePlacement}]=await modules;
  // Independently measured lower stone-ellipse centers in the 627px atlas cells.
  const bases={blue:[313,441.2],red:[313,442.75],pump:[314,485.66],shrine:[311,451.61]};
  for(const map of Object.values(ARENAS))for(const zoom of[.5,1,1.6])for(const atlasSize of[1254,2508]){
    const camera=new ArenaCamera(1310,690,map);camera.setActive(true);camera.setZoom(zoom);
    const entries=map.bases.map((p,side)=>({kind:'castle',p,side,key:side?'red':'blue'})).concat(map.nodes.map(p=>({kind:'node',p,side:null,key:map.theme==='waterfall'?'shrine':'pump'})));
    for(const{kind,p,side,key}of entries){
      const{source,rect,frame}=structurePlacement(map,camera.view,kind,p,side,atlasSize),[cx,cy]=bases[key],k=atlasSize/1254,cell=atlasSize/2;
      const actual={x:rect.x+(frame.column*cell+cx*k-source.x)/source.width*rect.width,y:rect.y+(frame.row*cell+cy*k-source.y)/source.height*rect.height},expected=projectPoint(camera.view,p);
      close(actual.x,expected.x);close(actual.y,expected.y);
      if(kind==='castle')assert.ok(source.y+source.height<(frame.row+1)*cell-15*k,'the castle frame cannot include glow from the next sprite row');
    }
  }
});
