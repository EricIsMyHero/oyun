const test=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const vision=()=>import(pathToFileURL(path.join(__dirname,'../arena/js/vision.mjs')).href);
const entity=(side,x,y,extra={})=>({side,x,y,hp:100,alive:true,statuses:[],...extra});
const empty=()=>({time:2,castles:[],units:[],nodes:[]});

test('allied cards reveal exactly eight tiles, share sight and lose it on death or conversion',async()=>{
  const {isPointVisible,isEntityVisible,visibilitySources}=await vision();
  const state=empty(),scout=entity(0,15,14),enemy=entity(1,23,14);
  state.units=[scout,enemy];
  assert.equal(isEntityVisible(state,0,enemy),true);
  assert.equal(isPointVisible(state,0,{x:23.001,y:14}),false);
  assert.equal(isEntityVisible(state,1,scout),true);
  scout.alive=false;
  assert.equal(isEntityVisible(state,0,enemy),false);
  scout.alive=true;scout.hp=0;
  assert.equal(visibilitySources(state,0).length,0);
  scout.hp=100;scout.side=1;
  assert.equal(isPointVisible(state,0,enemy),false);
  assert.equal(visibilitySources(state,1).length,2);
});

test('captured pumps reveal four tiles to their owner without retaining explored terrain',async()=>{
  const {isPointVisible}=await vision();
  const state=empty(),node={x:21.5,y:14,owner:null,capturing:0,progress:4};
  state.nodes=[node];
  assert.equal(isPointVisible(state,0,node),false);
  node.owner=0;
  assert.equal(isPointVisible(state,0,{x:21.5,y:18}),true);
  assert.equal(isPointVisible(state,0,{x:21.5,y:18.001}),false);
  assert.equal(isPointVisible(state,1,node),false);
  node.owner=1;
  assert.equal(isPointVisible(state,0,node),false);
  assert.equal(isPointVisible(state,1,node),true);
});

test('the starting castle reveals its deployable radius without exposing the opposing base',async()=>{
  const {isPointVisible,isEntityVisible,VISION}=await vision();
  const state=empty();state.castles=[entity(0,4,14,{isCastle:true}),entity(1,39,14,{isCastle:true})];
  assert.equal(VISION.castle,7.5);
  assert.equal(isPointVisible(state,0,{x:11.5,y:14}),true);
  assert.equal(isPointVisible(state,0,{x:11.501,y:14}),false);
  assert.equal(isEntityVisible(state,0,state.castles[1]),false);
  state.castles[0].alive=false;
  assert.equal(isPointVisible(state,0,{x:4,y:14}),false);
});

test('fog sight respects enemy concealment while allied concealed cards retain team sight',async()=>{
  const {isEntityVisible,isPointVisible}=await vision();
  const state=empty(),ally=entity(0,15,14),enemy=entity(1,16,14);
  state.units=[ally,enemy];
  for(const kind of ['invisible','untargetable','imprisonment']) {
    enemy.statuses=[{kind,until:3}];
    assert.equal(isEntityVisible(state,0,enemy),false,kind);
    assert.equal(isPointVisible(state,0,enemy),true);
    state.time=3;assert.equal(isEntityVisible(state,0,enemy),true);
    state.time=2;
  }
  ally.statuses=[{kind:'invisible',until:10}];
  assert.equal(isEntityVisible(state,0,ally),true);
  assert.equal(isPointVisible(state,0,{x:23,y:14}),true);
  for(const point of [null,{x:NaN,y:0},{x:Infinity,y:0}])assert.equal(isPointVisible(state,0,point),false);
  assert.equal(isEntityVisible(state,2,ally),false);
});
