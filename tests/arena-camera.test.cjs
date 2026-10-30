const test=require('node:test');
const assert=require('node:assert/strict');
const modules=Promise.all([import('../arena/js/camera.mjs'),import('../arena/js/map.mjs')]);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const project=(view,p)=>({x:view.ox+(p.x+p.y)*view.scale,y:view.oy+(p.y-p.x)*view.scale*.5});

test('battle camera shows a close portion of the island on desktop and mobile; lobby fits the map',async()=>{
  const [{ArenaCamera},{MAP}]=await modules;
  for(const [width,height] of [[1310,690],[374,304],[304,270],[800,310]]) {
    const camera=new ArenaCamera(width,height),overview=camera.view;
    assert.ok([...MAP.bases,...MAP.nodes].map(p=>project(overview,p)).every(p=>p.x>0&&p.x<width&&p.y>0&&p.y<height));
    camera.setActive(true);
    assert.ok(camera.view.scale>overview.scale*2);
    const castle=project(camera.view,MAP.bases[0]);
    assert.ok(castle.x>0&&castle.x<width&&castle.y>0&&castle.y<height);
    const opponent=project(camera.view,MAP.bases[1]);
    assert.ok(opponent.x<0||opponent.x>width||opponent.y<0||opponent.y>height);
    camera.setActive(false);close(camera.view.scale,overview.scale);
  }
});

test('dragging keeps the world beneath the pointer anchored and allows every lane and castle to be reached',async()=>{
  const [{ArenaCamera},{MAP}]=await modules;
  const camera=new ArenaCamera(1200,650);camera.setActive(true);camera.focus(MAP.nodes[1]);
  const point=camera.worldAt(550,325);
  camera.panBy(160,-60);
  const after=camera.worldAt(710,265);close(point.x,after.x);close(point.y,after.y);
  for(const landmark of [...MAP.bases,...MAP.nodes]) {
    camera.focus(landmark);
    const p=project(camera.view,landmark);close(p.x,600);close(p.y,325);
  }
  camera.panBy(1e9,1e9);
  assert.ok(camera.center.x>=0&&camera.center.x<=MAP.width&&camera.center.y>=0&&camera.center.y<=MAP.height);
  camera.focus({x:NaN,y:0});assert.ok(Number.isFinite(camera.view.ox));
});

test('zoom preserves its pointer anchor, stays bounded and cannot expose a whole-map battle view',async()=>{
  const [{ArenaCamera,CAMERA},{MAP}]=await modules;
  const camera=new ArenaCamera(1200,650);camera.setActive(true);camera.focus(MAP.nodes[1]);
  const anchor={x:450,y:200},point=camera.worldAt(anchor.x,anchor.y);
  camera.zoomBy(1.4,anchor);
  const after=camera.worldAt(anchor.x,anchor.y);close(after.x,point.x);close(after.y,point.y);
  camera.zoomBy(1e6);assert.equal(camera.zoom,CAMERA.maxZoom);
  camera.zoomBy(1e-6);assert.equal(camera.zoom,CAMERA.minZoom);
  const fullWidth=(MAP.width+MAP.height)*camera.view.scale;
  assert.ok(fullWidth>camera.width*1.7);
  const before={...camera.view};camera.zoomBy(0);camera.zoomBy(NaN);assert.deepEqual(camera.view,before);
});

test('resizing preserves camera focus and zoom; restarting restores the home view',async()=>{
  const [{ArenaCamera},{MAP}]=await modules;
  const camera=new ArenaCamera(1200,650);camera.setActive(true);camera.focus(MAP.nodes[2]);camera.zoomBy(1.3);
  camera.resize(374,304);
  assert.deepEqual(camera.center,{x:21.5,y:24});assert.equal(camera.zoom,1.3);
  const p=project(camera.view,MAP.nodes[2]);close(p.x,187);close(p.y,152);
  camera.home();assert.deepEqual(camera.center,{x:8,y:14});assert.equal(camera.zoom,1.3);
  camera.setActive(true);assert.equal(camera.zoom,1);assert.deepEqual(camera.center,{x:8,y:14});
});
