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
});

test('source burst parsing preserves hit count, per-hit damage and undecided slash modes',async()=>{
  const {burst}=await mod('rules.mjs');
  assert.deepEqual(burst('15x3'),{count:15,damage:3});
  assert.deepEqual(burst('2 × 6'),{count:2,damage:6});
  assert.deepEqual(burst('1,5'),{count:1,damage:1.5});
  assert.equal(burst('24/2x8'),null);
});

test('three symmetric routes connect both castles and each contain a capture objective',async()=>{
  const {MAP,routeFor,closestRoute}=await mod('map.mjs');
  assert.equal(MAP.routes.length,3);
  assert.equal(MAP.nodes.length,3);
  for(let lane=0;lane<3;lane++) {
    assert.deepEqual(routeFor(lane,0)[0],MAP.bases[0]);
    assert.deepEqual(routeFor(lane,0).at(-1),MAP.bases[1]);
    assert.deepEqual(routeFor(lane,1),routeFor(lane,0).reverse());
    assert.equal(closestRoute(MAP.nodes[lane]).lane,lane);
    assert.equal(closestRoute(MAP.nodes[lane]).distance,0);
  }
});

test('deployment validates own road, neutral strip, castle footprint and buildings symmetrically',async()=>{
  const {MAP,isDeployable}=await mod('map.mjs');
  assert.equal(isDeployable({x:9,y:11},0),true);
  assert.equal(isDeployable({x:23,y:11},1),true);
  assert.equal(isDeployable({x:23,y:11},0),false);
  assert.equal(isDeployable({x:9,y:11},1),false);
  assert.equal(isDeployable({x:16,y:11},0),false);
  assert.equal(isDeployable({x:16,y:11},1),false);
  assert.equal(isDeployable({x:9,y:7},0),false);
  assert.equal(isDeployable(MAP.bases[0],0),false);
  assert.equal(isDeployable({x:9,y:11},0,[{x:9,y:11,radius:.5}]),false);
  for(const p of [null,{x:NaN,y:11},{x:Infinity,y:11},{x:-5,y:11}])assert.equal(isDeployable(p,0),false);
});

test('road projection clamps to segment endpoints and finds closest actual path',async()=>{
  const {projectSegment,closestRoute}=await mod('map.mjs');
  assert.deepEqual(projectSegment({x:4,y:3},{x:1,y:1},{x:3,y:1}),{x:3,y:1,t:1,distance:Math.sqrt(5)});
  assert.equal(closestRoute({x:10,y:3.4}).lane,0);
  assert.equal(closestRoute({x:10,y:18.7}).lane,2);
});
