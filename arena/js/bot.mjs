import { RULES, num, clamp } from './rules.mjs';
import { MAP, distance } from './map.mjs';
import { visibilitySources, isEntityVisible } from './vision.mjs';

const airTarget = def => ['air','both'].includes(def.combat?.targets);
const ranged = def => def.combat?.attackType === 'ranged';
const frontline = def => def.combat?.attackType==='melee' && num(def.stats.health)+num(def.stats.shield)>=230;
const living = unit => unit.alive && !unit.engulfedBy;
const shuffled = (values,random) => {
  const copy=[...values];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
};

/** Independent seeded draw from playable root cards, never the player's hand. */
export function buildBotLoadout(cards,spells,random) {
  const pool=shuffled(cards.filter(c=>c.ready&&!c.id.includes('/')&&c.stats.mana>0&&c.stats.mana<=RULES.maxMana),random);
  if(pool.length<RULES.deckSize)throw Error('The bot needs eight playable root cards.');
  const selected=[];
  const pick=predicate=>{const card=pool.find(c=>!selected.includes(c)&&predicate(c)&&(c.stats.mana<=10||selected.filter(v=>v.stats.mana>10).length<2));if(card)selected.push(card);};
  pick(c=>c.stats.mana<=4);pick(c=>c.stats.mana<=4);
  pick(airTarget);pick(frontline);pick(ranged);
  pick(c=>c.stats.mana>=5&&c.stats.mana<=8);
  while(selected.length<RULES.deckSize){
    const expensive=selected.filter(c=>c.stats.mana>10).length;
    const card=pool.find(c=>!selected.includes(c)&&(expensive<2||c.stats.mana<=10))||pool.find(c=>!selected.includes(c));
    selected.push(card);
  }
  const deck=shuffled(selected,random);
  if(!deck.slice(0,RULES.handSize).some(c=>c.stats.mana<=4)){
    const cheap=deck.findIndex(c=>c.stats.mana<=4);if(cheap>=0)[deck[0],deck[cheap]]=[deck[cheap],deck[0]];
  }
  const spellPool=shuffled(spells.filter(s=>s.ready&&s.charge>0&&s.charge<=RULES.spellBudget),random),spellIds=[];
  let capacity=RULES.spellBudget;
  // A usable offensive spell keeps a random support spell from blocking combat.
  const offense=spellPool.find(s=>s.kind!=='building'&&!['healing-light','shield-of-serenity','lunar-mirrage'].includes(s.id));
  if(offense){spellIds.push(offense.id);capacity-=offense.charge;}
  for(const spell of spellPool)if(!spellIds.includes(spell.id)&&spell.charge<=capacity){spellIds.push(spell.id);capacity-=spell.charge;}
  return {deck:deck.map(c=>c.id),spellDeck:spellIds};
}

export function createBotState(engine) {
  return {nextDeployAt:2+engine.random()*1.5,nextSpellAt:0,lastDeployAt:-Infinity,plan:null};
}

function power(stats,attack,hp=stats.health,shield=stats.shield) {
  const count=Math.max(1,attack?.count||1),cycle=Math.max(.05,num(stats.attackSpeed,1)*count+num(stats.delay));
  return (Math.max(0,hp)+Math.max(0,shield)*.7)/100+Math.max(0,num(stats.damage))*count/cycle/12;
}
const unitPower = unit => power(unit.stats,unit.def.attack,unit.hp,unit.shield);
const cardPower = def => power(def.stats,def.attack)*Math.max(1,num(def.stats.number,1));
const canHit = (def,target) => def.combat.attackType!=='none'&&(def.combat.targets==='both'||(def.combat.targets==='air'?target.def.combat.movementType==='flying':def.combat.targets==='ground'&&target.def.combat.movementType!=='flying'));

function situation(engine) {
  const side=1,castle=engine.castles[side],sources=visibilitySources(engine.state,side);
  const allies=engine.units.filter(u=>living(u)&&u.side===side);
  const enemies=engine.units.filter(u=>living(u)&&u.side!==side&&isEntityVisible(engine.state,side,u,sources));
  const lanes=MAP.routes.map((_,lane)=>{
    const army=allies.filter(u=>u.lane===lane),foes=enemies.filter(u=>u.lane===lane);
    const approaching=foes.filter(u=>distance(u,castle)<=12);
    const defenders=army.filter(u=>approaching.some(t=>canHit(u.def,t)&&distance(u,t)<=6));
    const threat=approaching.reduce((n,u)=>n+unitPower(u),0),defense=defenders.reduce((n,u)=>n+unitPower(u),0);
    const nearest=Math.min(Infinity,...approaching.map(u=>distance(u,castle)));
    const deficit=Math.max(0,threat-defense*.85);
    return {lane,army,foes,approaching,nearest,deficit,defense,threat,
      danger:approaching.length&&deficit>.4?deficit*(nearest<=7.5?2:1):0,
      investment:army.filter(u=>!u.isBuilding).reduce((n,u)=>n+num(u.def.stats.mana)/Math.max(1,num(u.def.stats.number,1)),0)};
  });
  return {side,castle,allies,enemies,lanes};
}

function choosePlan(engine,view) {
  const team=engine.teams[view.side],danger=[...view.lanes].sort((a,b)=>b.danger-a.danger)[0];
  const defending=danger.danger>0;
  const lane=defending?danger:view.lanes.map(report=>({...report,priority:(engine.state.nodes[report.lane].owner!==view.side?6:1)-report.investment*.45-report.foes.reduce((n,u)=>n+unitPower(u),0)*.2+engine.random()*.8})).sort((a,b)=>b.priority-a.priority)[0];
  const urgent=defending&&lane.nearest<=7.5;
  const mode=defending?'defend':lane.army.some(u=>frontline(u.def)&&!u.isBuilding)?'support':'advance';
  let candidates=team.hand.map(id=>engine.cards.get(id));
  if(defending){
    const counters=candidates.filter(def=>lane.approaching.some(t=>canHit(def,t)));
    if(counters.length)candidates=counters;else return null;
    if(urgent&&candidates.some(def=>def.stats.mana<=team.mana))candidates=candidates.filter(def=>def.stats.mana<=team.mana);
  }
  const previous=engine.botState.plan;
  if(previous&&previous.mode===mode&&previous.lane===lane.lane&&previous.until>engine.time&&candidates.some(def=>def.id===previous.cardId))return {...previous,urgent,report:lane};
  const scored=candidates.map(def=>{
    const cost=num(def.stats.mana);
    let score=cardPower(def)/Math.max(2,cost)*3+engine.random()*.35;
    if(mode==='advance')score+=(frontline(def)?1.5:0)+Math.max(0,7-cost)*.3+num(def.stats.speed)/1500;
    if(mode==='support')score+=(ranged(def)?2.5:0)+(['Support','Mage'].includes(def.class)?1:0);
    if(defending){
      const covered=lane.approaching.filter(t=>canHit(def,t));
      score+=covered.reduce((n,t)=>n+unitPower(t),0)*1.4;
      if(covered.length>=3&&def.combat.multiTarget)score+=2.5;
      if(ranged(def))score+=1;
      if(urgent)score-=Math.max(0,cost-team.mana)*2;
    }
    return {def,score};
  }).sort((a,b)=>b.score-a.score);
  if(!scored.length)return null;
  return {cardId:scored[0].def.id,lane:lane.lane,mode,urgent,until:engine.time+10,report:lane};
}

function deployPlan(engine,view,plan) {
  if(!plan)return false;
  const ai=engine.botState,team=engine.teams[view.side],def=engine.cards.get(plan.cardId),cost=num(def.stats.mana);
  const minimumGap=plan.urgent?1.25:3.5;
  if(engine.time-ai.lastDeployAt<minimumGap)return false;
  if(!plan.urgent&&engine.time<ai.nextDeployAt)return false;
  const reserve=plan.urgent?0:Math.min(plan.mode==='defend'?2:4,RULES.maxMana-cost);
  if(team.mana+1e-7<cost+reserve)return false;
  // An adequate marching force can finish its job while mana is banked.
  if(!plan.urgent&&plan.mode!=='defend'&&plan.report.investment>=12&&team.mana<18)return false;
  let goal=MAP.nodes[plan.lane];
  const target=[...plan.report.approaching].sort((a,b)=>distance(a,view.castle)-distance(b,view.castle))[0];
  if(target){
    const length=distance(view.castle,target)||1,back=ranged(def)?clamp(num(def.stats.range)/1000*.7,1.3,3):.8;
    goal={x:target.x+(view.castle.x-target.x)/length*back,y:target.y+(view.castle.y-target.y)/length*back};
  }else if(plan.mode==='support'){
    const tank=plan.report.army.filter(u=>frontline(u.def)&&!u.isBuilding).sort((a,b)=>distance(a,view.castle)-distance(b,view.castle))[0];
    if(tank){const length=distance(tank,view.castle)||1;goal={x:tank.x+(view.castle.x-tank.x)/length*1.5,y:tank.y+(view.castle.y-tank.y)/length*1.5};}
  }
  const index=team.hand.indexOf(plan.cardId);
  for(const point of engine._deploymentCandidates(view.side,plan.lane,goal).slice(0,32)){
    if(!engine.deploy(view.side,index,point).ok)continue;
    ai.lastDeployAt=engine.time;ai.nextDeployAt=engine.time+(plan.urgent?1.5+engine.random():3.5+engine.random()*2.5);ai.plan=null;
    return true;
  }
  return false;
}

function castUsefulSpell(engine,view,plan) {
  const team=engine.teams[view.side],ai=engine.botState,spell=engine.spells.get(team.spellIds[team.spellIndex]);
  if(!spell||team.energy+1e-7<spell.energy||engine.time<ai.nextSpellAt)return;
  const id=spell.id,allies=view.allies.filter(u=>!u.isBuilding),enemies=view.enemies;
  if(spell.kind==='building'){
    const lane=plan?.lane??view.lanes.reduce((best,l)=>l.danger>best.danger?l:best).lane;
    if(view.allies.some(u=>u.isBuilding&&u.buildingKind===id))return;
    if(id==='watchtower'||id==='obsidian-fortress'){
      if(!view.lanes[lane].army.some(u=>!u.isBuilding))return;
    }
    for(const point of engine._deploymentCandidates(view.side,lane,MAP.nodes[lane],true).slice(0,24))if(engine.cast(view.side,point).ok){ai.nextSpellAt=engine.time+3;return;}
    return;
  }
  let pool;
  if(id==='healing-light')pool=allies.filter(u=>u.hp<engine.maxHealth(u)*.7||u.statuses.some(s=>['stun','frozen','poison','burn','bleed'].includes(s.kind)));
  else if(id==='shield-of-serenity')pool=allies.filter(u=>u.maxShield>0&&enemies.some(t=>distance(t,u)<=5));
  else if(id==='lunar-mirrage')pool=allies.filter(u=>enemies.some(t=>distance(t,u)<=5)||distance(u,view.castle)>10);
  else pool=id==='roots'?enemies.filter(u=>!u.def.combat.groundEffectImmune):enemies;
  const shape=engine._shape(spell);
  const scored=pool.map(target=>({target,value:pool.filter(u=>engine._inside(u,target,shape)).reduce((n,u)=>n+(id==='healing-light'?Math.min(engine.maxHealth(u)-u.hp,engine.maxHealth(u)*.3)/50:unitPower(u)),0)})).sort((a,b)=>b.value-a.value);
  let target=scored[0]?.target;
  if(target&&!['healing-light','shield-of-serenity','lunar-mirrage'].includes(id)){
    const victims=pool.filter(u=>engine._inside(u,target,shape)),danger=distance(target,view.castle)<=7.5;
    if(!danger&&victims.length<2&&unitPower(target)<3)return;
    if(id==='giga-bomb'&&!danger&&victims.reduce((n,u)=>n+unitPower(u),0)<8)return;
  }
  if(!target&&!['healing-light','shield-of-serenity','lunar-mirrage','illustration-spell','spirit-of-the-wild'].includes(id)){
    const castle=engine.castles[0];if(isEntityVisible(engine.state,view.side,castle))target=castle;
  }
  if(target&&engine.cast(view.side,target).ok)ai.nextSpellAt=engine.time+2+engine.random();
}

export function tickBot(engine,dt) {
  if(!engine.bot||engine.state.paused||engine.state.phase==='ended')return;
  engine.botClock-=dt;if(engine.botClock>0)return;
  engine.botClock=.55+engine.random()*.35;
  const view=situation(engine),plan=choosePlan(engine,view);
  engine.botState.plan=plan?{cardId:plan.cardId,lane:plan.lane,mode:plan.mode,until:plan.until}:null;
  deployPlan(engine,view,plan);
  castUsefulSpell(engine,view,plan);
}
