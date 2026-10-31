const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const modules=Promise.all([import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs'),import('../arena/js/map.mjs')]);
const catalogPromise=modules.then(([, {buildCatalog}])=>buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json')))));
const playerDeck=['hammies','b-b','scrapy','venomora','ben','freak','bethe','soldier'];
async function fixture(seed=12,deck=playerDeck){
  const [{ArenaEngine},,{isDeployable,distance}]=await modules,catalog=await catalogPromise;
  const e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck,spellDeck:['healing-light'],seed,bot:true});
  const spawn=(id,side,point,stats={})=>{
    const def=structuredClone(catalog.byId.get(id));Object.assign(def.stats,stats);
    return e.spawn(def,side,point,1,{count:1})[0];
  };
  const turn=(time=5)=>{e.state.time=time;e.botClock=0;e._bot(.1);};
  const hand=ids=>{e.teams[1].hand=[...ids];e.teams[1].queue=catalog.cards.filter(c=>c.ready&&!ids.includes(c.id)).slice(0,4).map(c=>c.id);};
  const center=()=>{e.state.nodes[0].owner=e.state.nodes[2].owner=1;};
  return {e,catalog,spawn,turn,hand,center,isDeployable,distance};
}

test('bot draws eight distinct ready root cards with a usable mana curve and legal independent spells',async()=>{
  const combinations=new Set();
  for(let seed=1;seed<=40;seed++){
    const {e,catalog}=await fixture(seed),team=e.teams[1],ids=team.hand.concat(team.queue),deck=ids.map(id=>catalog.byId.get(id));
    assert.equal(new Set(ids).size,8);assert.ok(deck.every(c=>c.ready&&!c.id.includes('/')));
    assert.ok(deck.filter(c=>c.stats.mana<=4).length>=2);
    assert.ok(deck.filter(c=>c.stats.mana>10).length<=2);
    assert.ok(deck.some(c=>['both','air'].includes(c.combat.targets)));
    assert.ok(deck.some(c=>c.combat.attackType==='ranged'));
    assert.ok(deck.some(c=>c.combat.attackType==='melee'&&c.stats.health+c.stats.shield>=230));
    assert.ok(team.hand.some(id=>catalog.byId.get(id).stats.mana<=4));
    assert.ok(team.spellIds.length>0);assert.equal(new Set(team.spellIds).size,team.spellIds.length);
    assert.ok(team.spellIds.every(id=>catalog.spellById.get(id).ready));
    assert.ok(team.spellIds.reduce((n,id)=>n+catalog.spellById.get(id).charge,0)<=5);
    assert.notDeepEqual([...ids].sort(),[...playerDeck].sort());
    assert.deepEqual(e.teams[0].hand.concat(e.teams[0].queue),playerDeck);
    combinations.add([...ids].sort().join(','));
  }
  assert.ok(combinations.size>30,'different seeds create varied complete decks');
});

test('bot loadout is reproducible and independent of the player deck and spell selection',async()=>{
  const {e:a,catalog}=await fixture(77),other=catalog.cards.filter(c=>c.ready&&!playerDeck.includes(c.id)).slice(0,8).map(c=>c.id);
  const {e:b}=await fixture(77,other),[{ArenaEngine}]=await modules;
  const c=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:other,spellDeck:['giga-bomb'],seed:77,bot:true});
  for(const engine of [b,c]){
    assert.deepEqual(a.teams[1].hand.concat(a.teams[1].queue),engine.teams[1].hand.concat(engine.teams[1].queue));
    assert.deepEqual(a.teams[1].spellIds,engine.teams[1].spellIds);
  }
});

test('bot saves mana for its chosen push rather than cycling an affordable cheap card',async()=>{
  const {e,turn,hand,center}=await fixture();center();hand(['hammies','gloop','soldier','blocker']);
  e.botState.plan={cardId:'gloop',lane:1,mode:'advance',until:100};e.botState.nextDeployAt=0;e.teams[1].mana=12;
  turn();assert.equal(e.teams[1].deployed,0);assert.equal(e.teams[1].mana,12);assert.equal(e.botState.plan.cardId,'gloop');
  e.teams[1].mana=14;turn(6);assert.equal(e.teams[1].deployed,1);assert.equal(e.teams[1].mana,4);
  assert.ok(e.units.some(u=>u.side===1&&u.def.id==='gloop'));
});

test('an imminent flying threat interrupts saving and spends the reserve on an affordable air counter',async()=>{
  const {e,turn,hand,spawn}=await fixture();hand(['gloop','fire-archer','hammies','slasherx']);
  e.teams[1].mana=4;e.botState.nextDeployAt=100;e.botState.plan={cardId:'gloop',lane:1,mode:'defend',until:100};
  spawn('hornets',0,{x:35,y:14});turn();
  const deployed=e.units.filter(u=>u.side===1);assert.equal(e.teams[1].deployed,1);assert.equal(deployed[0].def.id,'fire-archer');
  assert.equal(deployed[0].lane,1);assert.equal(e.teams[1].mana,0);
  e.teams[1].mana=20;turn(5.6);assert.equal(e.teams[1].deployed,1,'danger does not restore the old .6-second spam');
});

test('a sufficiently defended lane does not force a reserve-draining panic deployment',async()=>{
  const {e,turn,hand,spawn}=await fixture();hand(['fire-archer','scrapy','hammies','slasherx']);
  spawn('hammies',0,{x:35,y:14},{health:45,damage:0});spawn('blocker',1,{x:35.5,y:14},{health:2000,damage:200});
  e.teams[1].mana=4;e.botState.nextDeployAt=0;turn();assert.equal(e.teams[1].deployed,0);assert.equal(e.teams[1].mana,4);
});

test('bot supports a committed tank with a ranged unit placed behind it',async()=>{
  const {e,turn,hand,center,spawn,distance}=await fixture();center();hand(['gloop','fire-archer','scrapy','hailey']);
  const tank=spawn('gloop',1,{x:34,y:14});e.teams[1].mana=20;e.botState.nextDeployAt=0;turn();
  const support=e.units.find(u=>u.side===1&&u!==tank);assert.ok(support);assert.equal(support.def.combat.attackType,'ranged');
  assert.equal(support.lane,1);assert.ok(distance(support,e.castles[1])<distance(tank,e.castles[1]));
});

test('a non-attacking building does not count as a defender that can stop an approaching enemy',async()=>{
  const {e,turn,hand,spawn}=await fixture();hand(['gloop','soldier','hammies','scrapy']);
  spawn('gloop',0,{x:35,y:14});
  const building=spawn('blocker',1,{x:34.5,y:14},{health:2000,damage:0});building.isBuilding=true;building.def.combat.attackType='none';
  e.teams[1].mana=4;e.botState.nextDeployAt=100;turn();assert.equal(e.teams[1].deployed,1);
});

test('bot banks mana while every corridor already has a strong marching force, then avoids wasting full mana',async()=>{
  const {e,turn,hand,catalog}=await fixture();hand(['fire-archer','scrapy','hammies','slasherx']);
  const {pointOnRoute}=await import('../arena/js/map.mjs');
  for(let lane=0;lane<3;lane++){
    e.state.nodes[lane].owner=1;e.spawn(catalog.byId.get('gloop'),1,pointOnRoute(lane,1,6),lane,{count:2});
  }
  e.teams[1].mana=17;e.botState.nextDeployAt=0;turn();assert.equal(e.teams[1].deployed,0);
  e.teams[1].mana=20;turn(6);assert.equal(e.teams[1].deployed,1);
});

test('normal deployments have deliberate gaps, stay legal, and spend only available mana',async()=>{
  const {e,isDeployable}=await fixture(190),actions=[],deploy=e.deploy.bind(e);
  e.deploy=(side,index,point)=>{
    const before=e.teams[side].mana,result=deploy(side,index,point);
    if(result.ok)actions.push({time:e.time,before,after:e.teams[side].mana,point,side});return result;
  };
  e.step(1.9);assert.equal(actions.length,0);e.step(88.1);
  assert.ok(actions.length>=5&&actions.length<25,`${actions.length} deliberate deployments in 90 seconds`);
  for(let i=0;i<actions.length;i++){
    const a=actions[i];assert.equal(a.side,1);assert.ok(a.after>=4-1e-7&&a.after<a.before);assert.ok(isDeployable(a.point,1));
    if(i)assert.ok(a.time-actions[i-1].time>=3.5-1e-7);
  }
});

test('healing waits for useful healing or cleansing instead of wasting spell energy on full-health troops',async()=>{
  const {e,turn,spawn}=await fixture();const ally=spawn('blocker',1,{x:34,y:14});
  e.teams[1].spellIds=['healing-light'];e.teams[1].spellIndex=0;e.teams[1].energy=3;e.botState.nextDeployAt=100;e.teams[1].mana=0;
  turn();assert.equal(e.teams[1].energy,3);
  ally.hp=100;turn(6);assert.equal(e.teams[1].energy,2);assert.ok(ally.hp>100);
});

test('offensive spells ignore unseen armies and save expensive spells for a worthwhile target',async()=>{
  const {e,turn,spawn}=await fixture();e.teams[1].spellIds=['giga-bomb'];e.teams[1].spellIndex=0;e.teams[1].energy=10;e.teams[1].mana=0;e.botState.nextDeployAt=100;
  spawn('hammies',0,{x:7,y:14});turn();assert.equal(e.teams[1].energy,10);
  spawn('hammies',0,{x:28,y:14});spawn('hammies',1,{x:29,y:14},{damage:0});turn(6);assert.equal(e.teams[1].energy,10);
  spawn('gloop',0,{x:34,y:14});turn(7);assert.equal(e.teams[1].energy,0);
});

test('paused games freeze bot decisions and their saved plan',async()=>{
  const {e}=await fixture();e.step(1);e.setPaused(true);
  const before=JSON.stringify({state:e.state,bot:e.botState,clock:e.botClock,seed:e.seed});e.step(30);e._bot(30);
  assert.equal(JSON.stringify({state:e.state,bot:e.botState,clock:e.botClock,seed:e.seed}),before);
});
