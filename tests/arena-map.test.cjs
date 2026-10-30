const test=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const mod=file=>import(pathToFileURL(path.join(__dirname,'../arena/js',file)).href);

test('mana spent converts to nearest 0.05 energy per paid deployment',async()=>{
  const {energyForMana,RULES}=await mod('rules.mjs');
  assert.equal(energyForMana(18),1);
  assert.equal(energyForMana(17),.95);
  assert.equal(energyForMana(9),.5);
  assert.equal(energyForMana(1),.05);
  assert.equal(energyForMana(0),0);
  assert.deepEqual([RULES.maxMana,RULES.startMana,RULES.manaInterval,RULES.regulation,RULES.overtime],[20,12,1.3,300,120]);
  assert.equal(RULES.castleRange,7.5);
});

test('source burst parsing preserves hit count, per-hit damage and undecided slash modes',async()=>{
  const {burst}=await mod('rules.mjs');
  assert.deepEqual(burst('15x3'),{count:15,damage:3});
  assert.deepEqual(burst('2 × 6'),{count:2,damage:6});
  assert.deepEqual(burst('1,5'),{count:1,damage:1.5});
  assert.equal(burst('24/2x8'),null);
});

test('three symmetric routes connect both castles and each contain a capture objective',async()=>{
  const {MAP,routeFor,closestRoute,routeLength,pointOnRoute,distance}=await mod('map.mjs');
  assert.equal(MAP.routes.length,3);
  assert.equal(MAP.nodes.length,3);
  for(let lane=0;lane<3;lane++) {
    assert.deepEqual(routeFor(lane,0)[0],MAP.bases[0]);
    assert.deepEqual(routeFor(lane,0).at(-1),MAP.bases[1]);
    assert.deepEqual(routeFor(lane,1),routeFor(lane,0).reverse());
    assert.equal(closestRoute(MAP.nodes[lane]).lane,lane);
    assert.equal(closestRoute(MAP.nodes[lane]).distance,0);
    assert.ok(Math.abs(routeLength(routeFor(lane,0))-35)<1e-9);
    for(const side of [0,1]) {
      const route=routeFor(lane,side);
      const index=route.findIndex(p=>distance(p,MAP.nodes[lane])<1e-9);
      assert.ok(index>0);
      assert.ok(Math.abs(routeLength(route.slice(0,index+1))-17.5)<1e-9);
      assert.ok(distance(pointOnRoute(lane,side,17.5),MAP.nodes[lane])<1e-9);
    }
  }
});

test('deployment allows own roads and courtyard only inside the 7.5-tile castle radius',async()=>{
  const {MAP,isDeployable,pointOnRoute,distance}=await mod('map.mjs');
  assert.equal(isDeployable({x:6.5,y:11},0),true);
  assert.equal(isDeployable({x:25.5,y:11},1),true);
  assert.equal(isDeployable({x:25.5,y:11},0),false);
  assert.equal(isDeployable({x:6.5,y:11},1),false);
  assert.equal(isDeployable({x:16,y:11},0),false);
  assert.equal(isDeployable({x:16,y:11},1),false);
  assert.equal(isDeployable({x:9,y:7},0),false);
  assert.equal(isDeployable(MAP.bases[0],0),false);
  assert.equal(isDeployable({x:6.5,y:11},0,[{x:6.5,y:11,radius:.5}]),false);
  for(const p of [null,{x:NaN,y:11},{x:Infinity,y:11},{x:-5,y:11}])assert.equal(isDeployable(p,0),false);
  assert.equal(isDeployable({x:6.5,y:11},2),false);
  for(const side of [0,1]) {
    // Find the exact radius intersection on the real north road, rather than
    // testing an off-road point that would be rejected for another reason.
    let low=0,high=17.5;
    for(let i=0;i<60;i++) {
      const mid=(low+high)/2;
      if(distance(pointOnRoute(0,side,mid),MAP.bases[side])<7.5)low=mid;else high=mid;
    }
    const boundary=pointOnRoute(0,side,(low+high)/2);
    assert.ok(Math.abs(distance(boundary,MAP.bases[side])-7.5)<1e-9);
    assert.equal(isDeployable(boundary,side),true);
    assert.equal(isDeployable(pointOnRoute(0,side,high+.01),side),false);
    assert.equal(isDeployable(MAP.nodes[0],side),false);
  }
});

test('courtyards preserve one tile behind and 2.5 tiles ahead, with both spaces deployable',async()=>{
  const {MAP,courtyardFor,isCourtyard,isDeployable,isWalkable}=await mod('map.mjs');
  for(const side of [0,1]) {
    const b=MAP.bases[side],bounds=courtyardFor(side),direction=side===0?1:-1;
    const rear=side===0?bounds.minX:bounds.maxX,front=side===0?bounds.maxX:bounds.minX;
    assert.ok(Math.abs(Math.abs(rear-b.x)-MAP.castleRadius-1)<1e-9);
    assert.ok(Math.abs(Math.abs(front-b.x)-MAP.castleRadius-2.5)<1e-9);
    for(const p of [{x:b.x-direction*(MAP.castleRadius+.75),y:b.y},{x:b.x+direction*(MAP.castleRadius+2),y:b.y}]) {
      assert.equal(isCourtyard(p,side),true);
      assert.equal(isWalkable(p),true);
      assert.equal(isDeployable(p,side),true);
    }
  }
});

test('road projection clamps to segment endpoints and finds closest actual path',async()=>{
  const {projectSegment,closestRoute}=await mod('map.mjs');
  assert.deepEqual(projectSegment({x:4,y:3},{x:1,y:1},{x:3,y:1}),{x:3,y:1,t:1,distance:Math.sqrt(5)});
  assert.equal(closestRoute({x:10,y:3.4}).lane,0);
  assert.equal(closestRoute({x:10,y:18.7}).lane,2);
});
