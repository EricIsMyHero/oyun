import { RULES, clamp, num, burst, energyForMana } from './rules.mjs';
import { MAP, routeFor, closestRoute, isDeployable, isWalkable, isCourtyard, courtyardFor, distance, projectSegment } from './map.mjs';
import { ABILITIES } from './abilities.mjs';

const NEGATIVE = new Set(['slow','movementSlow','stun','root','silence','blind','poison','burn','bleed','curse','misfortune','imprisonment','suppression','healBlock','fear','conversion']);
const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= MAP.width && p.y >= 0 && p.y <= MAP.height;
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const active = (u,kind,time) => (u.statuses || []).filter(s => s.kind === kind && s.until > time);
const strongest = (u,kind,time) => Math.max(0,...active(u,kind,time).map(s => s.magnitude || 0));
const has = (u,kind,time) => active(u,kind,time).length > 0;
const bodyMass = { 'very-light':.5, light:.75, medium:1, heavy:1.5, 'very-heavy':2 };
const EPS = 1e-7;

/** Pure fixed-step simulation. Render/UI modules never own combat timers. */
export class ArenaEngine {
  constructor({cards=[],spells=[],deck=[],spellDeck=[],seed=1,bot=true}={}) {
    this.cards = new Map();
    const add = c => { this.cards.set(c.id,c); for(const f of c.forms || []) add(f); };
    cards.forEach(add);
    this.spells = new Map(spells.map(s => [s.id,s]));
    if(deck.length !== RULES.deckSize || new Set(deck).size !== RULES.deckSize) throw new Error('Choose eight different unit cards.');
    if(deck.some(id => !this.cards.get(id)?.ready)) throw new Error('Every selected unit must have complete battle data.');
    if(!spellDeck.length || new Set(spellDeck).size !== spellDeck.length || spellDeck.some(id => !this.spells.get(id)?.ready)) throw new Error('Choose complete, distinct spells.');
    if(spellDeck.reduce((s,id)=>s+num(this.spells.get(id).charge),0) > RULES.spellBudget) throw new Error('Spell charge capacity is five.');
    this.seed = (Number(seed) >>> 0) || 1;
    this.bot = !!bot;
    this.accumulator = 0;
    this.serial = 0;
    this.deaths = [];
    this.damageDepth = 0;
    this.botClock = .6;
    this.state = {
      time:0, phase:'regulation',remaining:RULES.regulation,paused:false,winner:null,
      teams:[0,1].map(()=>({mana:RULES.startMana,energy:0,hand:deck.slice(0,RULES.handSize),queue:deck.slice(RULES.handSize),spellIds:[...spellDeck],spellIndex:0,deployed:0,spentMana:0})),
      castles:MAP.bases.map((p,side)=>({id:`castle-${side}`,name:side?'Crimson Crown':'Azure Core',...p,side,radius:MAP.castleRadius,hp:RULES.castleHealth,maxHp:RULES.castleHealth,shield:0,maxShield:0,alive:true,isCastle:true,isBuilding:true,stats:{dodge:0,damageminimiser:0,shieldtakendamage:0,criticdamageminimiser:0},statuses:[],memory:{},cooldown:0})),
      nodes:MAP.nodes.map(n=>({...n,owner:null,capturing:null,progress:0})),
      units:[],projectiles:[],effects:[],events:[],fields:[],
    };
  }
  get time(){return this.state.time;}
  get units(){return this.state.units;}
  get castles(){return this.state.castles;}
  get teams(){return this.state.teams;}
  random(){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
  setPaused(paused){this.state.paused=!!paused;return this.state.paused;}
  log(type,text,extra={}){
    this.state.events.push({time:this.time,type,text,...extra});
    if(this.state.events.length>160)this.state.events.splice(0,this.state.events.length-160);
  }
  fx(type,x,y,options={}){
    this.state.effects.push({id:`fx-${++this.serial}`,type,x,y,born:this.time,until:this.time+(options.duration??.65),...options});
    if(this.state.effects.length>300)this.state.effects.splice(0,this.state.effects.length-300);
  }
  near(point,radius,filter=null){return this.units.filter(u=>u.alive&&distance(u,point)<=radius+(u.radius||0)&&(!filter||filter(u)));}
  ability(u){return ABILITIES[u.def?.id] || ABILITIES[u.def?.rootId] || null;}
  _hook(name,u,...args){
    if(name!=='spawn'&&(has(u,'silence',this.time)||has(u,'imprisonment',this.time)))return;
    const fn=this.ability(u)?.[name];if(fn)fn(this,u,...args);
  }
  _validAction(side){return (side===0||side===1)&&!this.state.paused&&this.state.phase!=='ended';}
  deploy(side,handIndex,point){
    if(!this._validAction(side))return {ok:false,error:'The battle is paused or finished.'};
    const team=this.teams[side];
    if(!Number.isInteger(handIndex)||handIndex<0||handIndex>=team.hand.length)return {ok:false,error:'Select a card in your hand.'};
    const def=this.cards.get(team.hand[handIndex]);
    if(!def?.ready)return {ok:false,error:'This card has incomplete battle data.'};
    const cost=num(def.stats.mana);
    if(team.mana+EPS<cost)return {ok:false,error:'Not enough mana.'};
    if(!isDeployable(point,side,this.units.filter(u=>u.alive&&u.isBuilding)))return {ok:false,error:'Deploy on a road or courtyard within your castle\'s 7.5-tile range.'};
    if(this.near(point,.18).some(u=>!u.isBuilding&&u.def.combat?.movementType!=='flying'))return {ok:false,error:'That position is occupied.'};
    const lane=closestRoute(point).lane;
    const formation=this._formation(def,side,point,lane);
    if(!formation)return {ok:false,error:'There is not enough room for the whole formation.'};
    team.mana=Math.max(0,team.mana-cost);
    team.energy=Math.round((team.energy+energyForMana(cost))*1e9)/1e9;
    team.spentMana+=cost;team.deployed++;
    const played=team.hand[handIndex];team.hand[handIndex]=team.queue.shift();team.queue.push(played);
    const units=this.spawn(def,side,point,lane,{positions:formation});
    this.log('deploy',`${side?'Crimson':'Azure'} deployed ${def.name}.`,{side,cardId:def.id});
    return {ok:true,units};
  }
  _formation(def,side,point,lane){
    const count=Math.max(1,Math.floor(num(def.stats.number,1)));
    const radius=.18+.07*(bodyMass[def.combat?.weight]||1);
    const positions=[];
    const candidates=[{...point}];
    // Stable radial packing; every paid unit receives a legal in-range location.
    for(let ring=1;ring<=6;ring++)for(let k=0;k<ring*8;k++){
      const angle=k/(ring*8)*Math.PI*2;
      candidates.push({x:point.x+Math.cos(angle)*ring*(radius*2+.04),y:point.y+Math.sin(angle)*ring*(radius*2+.04)});
    }
    for(const candidate of candidates){
      if(!isDeployable(candidate,side,this.units.filter(u=>u.alive&&u.isBuilding)))continue;
      if(closestRoute(candidate).lane!==lane&&distance(point,candidate)>1)continue;
      if(positions.some(p=>distance(p,candidate)<radius*2+.02))continue;
      if(this.units.some(u=>u.alive&&u.def.combat?.movementType===def.combat?.movementType&&distance(candidate,u)<radius+u.radius+.02))continue;
      positions.push(candidate);if(positions.length===count)return positions;
    }
    return null;
  }
  spawn(def,side,point,lane=closestRoute(point).lane,options={}){
    if(!def||!finitePoint(point)||(side!==0&&side!==1))return [];
    const count=Math.max(0,Math.floor(options.count??num(def.stats.number,1)));
    const groupId=options.groupId??`group-${++this.serial}`;
    const made=[];
    for(let i=0;i<count;i++){
      const stats={...def.stats};
      const mass=bodyMass[def.combat?.weight]||1;
      const route=routeFor(lane,side);
      let p=options.positions?.[i]||{x:clamp(point.x+(count===1?0:(i%3-1)*.24),0,MAP.width),y:clamp(point.y+(Math.floor(i/3)-(Math.ceil(count/3)-1)/2)*.27,0,MAP.height)};
      if(!options.positions&&def.combat?.movementType!=='flying'&&!isWalkable(p)){const projected=closestRoute(p);p={x:projected.x,y:projected.y};}
      let best={distance:Infinity,index:1};
      for(let j=1;j<route.length;j++) {const q=projectSegment(p,route[j-1],route[j]);if(q.distance<best.distance)best={...q,index:j};}
      const u={
        id:`unit-${++this.serial}`,def,side,lane,...p,radius:.18+.07*mass,mass,
        hp:num(stats.health),maxHp:num(stats.health),shield:num(stats.shield),maxShield:num(stats.shield),stats,
        alive:true,born:this.time,hits:0,shots:0,attacks:0,memory:{},statuses:[],groupId,targetId:null,
        cooldown:0,burstIndex:0,burstTargetId:null,sequenceIndex:0,route,waypoint:best.index,
        facingX:side?-1:1,facingY:0,damageWindow:[],dps:0,expiresAt:stats.life>0?this.time+stats.life:Infinity,
      };
      if(!(u.hp>0))continue;
      this.units.push(u);made.push(u);
      this._hook('spawn',u);
      this.fx('spawn',u.x,u.y,{side,duration:.6});
    }
    return made;
  }
  _shape(spell){
    if(spell.range&&typeof spell.range==='object')return spell.range;
    const raw=String(spell.raw?.stats?.range??'');
    if(raw.toLowerCase()==='global')return {shape:'global'};
    if(/[x×]/i.test(raw)){const [a,b]=raw.split(/[x×]/i).map(v=>num(v)/1000);return {shape:'rect',width:a,height:b};}
    return {shape:'circle',radius:num(raw)/1000};
  }
  _inside(point,center,shape){
    if(shape.shape==='global'||shape.type==='global')return true;
    if(shape.shape==='rect'||shape.type==='rect')return Math.abs(point.x-center.x)<=shape.width/2+(point.radius||0)&&Math.abs(point.y-center.y)<=shape.height/2+(point.radius||0);
    return distance(point,center)<=(shape.radius??0)+(point.radius||0);
  }
  cast(side,point){
    if(!this._validAction(side))return {ok:false,error:'The battle is paused or finished.'};
    const team=this.teams[side], spell=this.spells.get(team.spellIds[team.spellIndex]);
    if(!spell?.ready)return {ok:false,error:'This spell has incomplete battle data.'};
    const cost=num(spell.energy);
    if(team.energy+EPS<cost)return {ok:false,error:'Not enough spell energy.'};
    if(!finitePoint(point))return {ok:false,error:'Choose a point inside the arena.'};
    const building=(spell.kind||String(spell.raw?.type).toLowerCase())==='building';
    if(building&&!isDeployable(point,side,this.units.filter(u=>u.alive&&u.isBuilding)))return {ok:false,error:'Place buildings on a road or courtyard within your castle\'s 7.5-tile range.'};
    const id=spell.id||slug(spell.name);
    const handled=new Set(['spirit-of-the-wild','illustration-spell','laser','nightfall-curse','roots','lunar-mirrage','shock-bomb','shield-of-serenity','healing-light','dark-orb','reflector','guard-post','watchtower','obsidian-fortress','mana-surge','stagnantias-wrath']);
    if(!handled.has(id))return {ok:false,error:'This spell has incomplete battle data.'};
    team.energy=Math.max(0,Math.round((team.energy-cost)*1e9)/1e9);
    team.spellIndex=(team.spellIndex+1)%team.spellIds.length;
    this._applySpell(side,spell,point,id);
    this.log('spell',`${side?'Crimson':'Azure'} cast ${spell.name}.`,{side,spellId:spell.id});
    return {ok:true,spell};
  }
  _applySpell(side,spell,point,id){
    const raw=spell.raw.stats,shape=this._shape(spell);
    const source={id:`spell-${++this.serial}`,side,x:point.x,y:point.y,isSpell:true,stats:{},statuses:[]};
    const targets=this.units.filter(u=>u.alive&&this._inside(u,point,shape));
    const enemies=targets.filter(u=>u.side!==side),allies=targets.filter(u=>u.side===side&&!u.isBuilding);
    const castles=this.castles.filter(u=>u.alive&&u.side!==side&&this._inside(u,point,shape));
    const visualRadius=shape.shape==='global'?12:shape.radius||Math.max(shape.width||0,shape.height||0)/2;
    this.fx('spell',point.x,point.y,{side,radius:visualRadius,shape,duration:.9,color:side?'#fb8c79':'#77ddff'});
    if((spell.kind||String(spell.raw.type).toLowerCase())==='building') {this._building(spell,side,point,id);return;}
    if(id==='healing-light'){
      for(const u of allies){this.cleanse(u);this.heal(u,u.maxHp*.3,source);}return;
    }
    if(id==='shield-of-serenity'){for(const u of allies)this.giveShield(u,u.maxShield*.2);return;}
    if(id==='illustration-spell'){
      for(const u of enemies.filter(u=>!u.isBuilding)){
        if(u.memory.conversion)continue;
        const conversion=this.status(u,'conversion',20,1,source,{originalSide:u.side});
        if(!conversion)continue;
        u.memory.conversion={side:u.side,until:conversion.until};u.side=side;u.targetId=null;u.burstTargetId=null;u.route=routeFor(u.lane,side);this._resetWaypoint(u);
        this.fx('capture',u.x,u.y,{side,duration:.8});
      }return;
    }
    if(id==='spirit-of-the-wild'){
      this.state.fields.push({id:`field-${++this.serial}`,kind:'suppression',...point,side,shape,until:this.time+10,next:this.time,source});return;
    }
    if(id==='roots'||id==='nightfall-curse'){
      const attack=burst(raw.damageToCard),castleAttack=burst(raw.damageToCastle),interval=num(raw.timeBetweenDamage);
      this.state.fields.push({id:`field-${++this.serial}`,kind:id,...point,side,shape,until:this.time+attack.count*interval,next:this.time,left:attack.count,interval,attack,castleAttack,source});return;
    }
    const attack=burst(raw.damageToCard)||{damage:0,count:1},castleAttack=burst(raw.damageToCastle)||{damage:0,count:1};
    let extra=0,castleExtra=0;
    if(id==='laser'&&enemies.length<=2){extra=50;castleExtra=25;}
    for(const u of enemies){this.damage(source,u,attack.damage+extra,{kind:'spell'});if(id==='shock-bomb')this.status(u,'stun',1.5,1,source);}
    for(const c of castles)this.damage(source,c,castleAttack.damage+castleExtra,{kind:'spell'});
    if(id==='lunar-mirrage'){
      for(const u of allies.filter(u=>!u.memory.illusion)){
        const copies=this.spawn(u.def,side,{x:clamp(u.x+.3,0,MAP.width),y:u.y},u.lane,{count:1});
        for(const copy of copies){copy.memory.illusion=true;copy.expiresAt=this.time+27;}
      }
    }
  }
  _building(spell,side,point,kind){
    const raw=spell.raw.stats,reach=num(raw.range)/1000;
    const def={id:spell.id,name:spell.name,image:spell.image,rarity:spell.rarity,type:['Building'],raw:spell.raw,
      stats:{health:num(raw.health),shield:0,damage:num(raw.damageToCard),attackSpeed:num(raw.attackSpeed),delay:0,sps:0,mana:0,number:1,range:reach*1000,speed:0,vision:reach*1000,criticalChance:0,criticDamage:1,lifestealChance:0,lifesteal:0,dodge:0,damageminimiser:0,shieldtakendamage:0},
      attack:{count:1,damage:num(raw.damageToCard),interval:num(raw.attackSpeed),delay:0},
      combat:{attackType:num(raw.attackSpeed)>0?'ranged':'none',attackWidth:500,attackDistance:reach*1000,attackShape:'single',multiTarget:false,maxTargets:1,movementType:'ground',targets:'both',weight:'very-heavy'},forms:[]};
    const [u]=this.spawn(def,side,point,closestRoute(point).lane,{count:1});
    if(!u)return;
    u.isBuilding=true;u.radius=.44;u.buildingKind=kind;u.spell=spell;u.expiresAt=this.time+num(raw.lifetime);
  }
  status(target,kind,duration,magnitude=0,source=null,extra={}){
    if(!target?.alive||duration<=0)return null;
    if(extra.groundOnly&&target.def?.combat?.groundEffectImmune)return null;
    if(NEGATIVE.has(kind)&&has(target,'predominance',this.time))return null;
    const actual=NEGATIVE.has(kind)&&Number.isFinite(duration)?duration*(1-clamp(num(target.stats.flexibility),0,80)/100):duration;
    const sourceId=source?.id??null;
    let entry=target.statuses.find(s=>s.kind===kind&&s.sourceId===sourceId&&s.until>this.time);
    if(entry){entry.until=Math.max(entry.until,this.time+actual);entry.magnitude=Math.max(entry.magnitude||0,magnitude);Object.assign(entry,extra);return entry;}
    entry={kind,until:this.time+actual,magnitude,sourceId,nextTick:this.time+(extra.interval||1),...extra};target.statuses.push(entry);
    return entry;
  }
  cleanse(target){
    target.statuses=target.statuses.filter(s=>!NEGATIVE.has(s.kind));
    if(target.memory.conversion)this._restoreConversion(target);
  }
  _restoreConversion(u){
    u.side=u.memory.conversion.side;delete u.memory.conversion;u.targetId=null;u.burstTargetId=null;
    u.route=routeFor(u.lane,u.side);this._resetWaypoint(u);
  }
  heal(target,amount,source=null){
    if(!target?.alive||amount<=0||has(target,'bleed',this.time)||has(target,'healBlock',this.time)||has(target,'suppression',this.time))return 0;
    const burn=has(target,'burn',this.time)?.8:1;
    const value=Math.min(target.maxHp-target.hp,amount*(1+num(target.stats.healBonus)/100)*burn);
    if(value<=0)return 0;
    target.hp+=value;this.fx('heal',target.x,target.y,{amount:value,side:target.side});return value;
  }
  giveShield(target,amount){
    if(!target?.alive||amount<=0||has(target,'suppression',this.time))return 0;
    const value=amount;target.maxShield=Math.max(target.maxShield,target.shield+value);target.shield+=value;
    this.fx('shield',target.x,target.y,{amount:value,side:target.side});return value;
  }
  damage(source,target,amount,options={}){
    const empty={healthDamage:0,shieldDamage:0,total:0,killed:false};
    if(!target?.alive||!(amount>0)||this.damageDepth>16)return empty;
    if(has(target,'imprisonment',this.time)||has(target,'untouchable',this.time)||has(target,'untargetable',this.time))return empty;
    const hit={damage:amount,kind:'attack',bypassShield:false,critical:false,secondary:false,...options};
    if(source&&source.side===target.side&&!options.friendlyFire)return empty;
    if(hit.kind==='attack'&&!hit.secondary&&this.random()<clamp(num(target.stats.dodge),0,70)/100){this.fx('miss',target.x,target.y,{side:target.side});return empty;}
    this.damageDepth++;
    this._hook('incoming',target,source,hit);
    if(hit.instantKill&&!target.isCastle&&!target.isBuilding){hit.damage=target.hp+target.shield+1;hit.bypassShield=true;hit.kind='execution';}
    if(hit.critical){
      const multiplier=Math.max(1,num(source?.stats?.criticDamage,1.5));
      hit.damage*=1+(multiplier-1)*(1-clamp(num(target.stats.criticdamageminimiser),0,90)/100);
    }
    let reduction=clamp(num(target.stats.damageminimiser)/100,0,.9);
    const protection=strongest(target,'protection',this.time)||strongest(target,'defense',this.time);
    const spellProtection=hit.kind==='spell'?strongest(target,'spellProtection',this.time):0;
    if(hit.kind!=='execution')hit.damage*=Math.max(0,(1-reduction)*(1-protection)*(1-spellProtection));
    hit.damage*=1+strongest(target,'curse',this.time);
    if(!Number.isFinite(hit.damage)||hit.damage<=0){this.damageDepth--;return empty;}
    const beforeHp=target.hp,beforeShield=target.shield;
    let healthPart=hit.damage;
    if(target.shield>0&&!hit.bypassShield){
      const fraction=clamp(num(target.stats.shieldtakendamage,70)/100,0,1),multiplier=Math.max(.01,hit.shieldMultiplier??1);
      const absorbedRaw=Math.min(hit.damage*fraction,target.shield/multiplier);
      target.shield=Math.max(0,target.shield-absorbedRaw*multiplier);healthPart-=absorbedRaw;
    }
    target.hp=Math.max(has(target,'immortal',this.time)?1:0,target.hp-healthPart);
    const result={healthDamage:Math.max(0,beforeHp-target.hp),shieldDamage:Math.max(0,beforeShield-target.shield),total:0,killed:target.hp<=0};
    result.total=result.healthDamage+result.shieldDamage;
    if(result.total>0){
      target.statuses=target.statuses.filter(s=>s.kind!=='invisible');
      target.memory.lastDamageReceived=this.time;
      this.fx('hit',target.x,target.y,{amount:result.total,side:target.side,critical:hit.critical,color:hit.kind==='dot'?'#b9db72':undefined});
      if(source&&!source.isSpell){source.damageWindow??=[];source.damageWindow.push({time:this.time,damage:result.total});}
      this._hook('damaged',target,source,result,hit);
      if(target.buildingKind==='reflector'&&source?.alive&&!hit.secondary)this.damage(target,source,result.total*(source.isCastle?.4:.6),{kind:'reflect',secondary:true});
    }
    if(target.hp<=0&&target.alive){target.alive=false;this.deaths.push({u:target,killer:source});}
    this.damageDepth--;
    return result;
  }
  push(target,awayFrom,tiles){
    if(!target?.alive||target.isCastle||target.isBuilding||tiles<=0)return;
    let dx=target.x-awayFrom.x,dy=target.y-awayFrom.y,len=Math.hypot(dx,dy);
    if(!len){dx=target.side?-1:1;dy=0;len=1;}
    const p={x:clamp(target.x+dx/len*tiles,.5,MAP.width-.5),y:clamp(target.y+dy/len*tiles,.5,MAP.height-.5)};
    if(target.def.combat.movementType!=='flying'){const q=closestRoute(p);target.x=q.x;target.y=q.y;}else Object.assign(target,p);
    this._resetWaypoint(target);
  }
  _resetWaypoint(u){
    let best={distance:Infinity,index:1};
    for(let i=1;i<u.route.length;i++){const q=projectSegment(u,u.route[i-1],u.route[i]);if(q.distance<best.distance)best={...q,index:i};}
    u.waypoint=best.index;
  }
  _legalTarget(u,target){
    if(!target?.alive||target.side===u.side)return false;
    if(has(target,'untargetable',this.time)||has(target,'invisible',this.time)||has(target,'imprisonment',this.time))return false;
    const layers=u.def?.combat?.targets||'both';
    if(layers==='none')return false;
    const air=target.def?.combat?.movementType==='flying';
    return layers==='both'||(layers==='air'?air:!air);
  }
  _range(u){
    const blind=strongest(u,'blind',this.time);
    const range=num(u.stats.range)/1000*(1-blind);
    const authored=u.def?.raw?.additionalStats?.vision;
    const vision=num(u.stats.vision)/1000*(1-blind);
    return authored!=null&&!/^[-—–]$/.test(String(authored).trim())?Math.min(range,vision):range;
  }
  _target(u){
    if(u.burstTargetId){const locked=this.units.concat(this.castles).find(t=>t.id===u.burstTargetId);if(this._legalTarget(u,locked))return locked;u.burstTargetId=null;u.burstIndex=0;u.cooldown=Math.max(u.cooldown,u.def.attack?.delay||0);}
    const reach=this._range(u);
    const candidates=this.units.filter(t=>this._legalTarget(u,t)&&distance(u,t)<=reach+t.radius);
    candidates.sort((a,b)=>distance(u,a)-distance(u,b)||a.id.localeCompare(b.id));
    if(candidates.length)return candidates[0];
    return this.castles.find(t=>this._legalTarget(u,t)&&distance(u,t)<=reach+t.radius)||null;
  }
  _profile(u){
    let p={...u.def.combat};
    const sequence=p.attackSequence;
    if(sequence?.length)p={...p,...sequence[u.sequenceIndex%sequence.length]};
    // Conditional death/periodic splash is resolved by the native handler only.
    if(p.multiTargetCondition&&!sequence){p.multiTarget=false;p.maxTargets=1;p.attackShape='single';}
    return p;
  }
  _attackDefinition(u){
    const base=u.def.attack||{count:1,damage:num(u.stats.damage),interval:num(u.stats.attackSpeed),delay:num(u.stats.delay)};
    const step=base.sequence?.[u.sequenceIndex%base.sequence.length];
    return step?{...base,...step}:{...base};
  }
  _reach(u,p=this._profile(u)){return Math.max(0,num(p.attackDistance)/1000);}
  _courtyardExit(u){
    const bounds=courtyardFor(u.side),route=u.route;
    for(let i=1;i<route.length;i++){
      const a=route[i-1],b=route[i];
      if(isCourtyard(b,u.side))continue;
      let t=1;
      if(b.x<bounds.minX)t=Math.min(t,(bounds.minX-a.x)/(b.x-a.x));
      if(b.x>bounds.maxX)t=Math.min(t,(bounds.maxX-a.x)/(b.x-a.x));
      if(b.y<bounds.minY)t=Math.min(t,(bounds.minY-a.y)/(b.y-a.y));
      if(b.y>bounds.maxY)t=Math.min(t,(bounds.maxY-a.y)/(b.y-a.y));
      const inside=clamp(t-.12/(distance(a,b)||1),0,1);
      return {x:a.x+(b.x-a.x)*inside,y:a.y+(b.y-a.y)*inside,next:b};
    }
    return null;
  }
  _move(u,target,dt){
    if(u.isBuilding||has(u,'root',this.time)||has(u,'stun',this.time)||has(u,'imprisonment',this.time))return;
    const movement=u.def.combat?.movementType;
    let destination;
    if(target)destination=target;
    else if(u.memory.followId){const parent=this.units.find(t=>t.alive&&t.id===u.memory.followId);if(parent){if(distance(u,parent)<.85)return;destination=parent;}}
    if(!destination&&movement==='flying')destination=this.castles[1-u.side];
    if(!destination){
      while(u.waypoint<u.route.length-1&&distance(u,u.route[u.waypoint])<.25)u.waypoint++;
      destination=u.route[u.waypoint];
    }
    const node=this.state.nodes.find(n=>n.owner!==u.side&&distance(n,u)<=RULES.captureRadius);
    if(!target&&node&&!this.near(node,RULES.captureRadius,t=>t.side!==u.side&&!t.isBuilding).length)return;
    if(movement!=='flying'&&isCourtyard(u,u.side)&&!isCourtyard(destination,u.side)){
      // An off-road courtyard placement must enter its chosen lane through the
      // road/courtyard intersection, not aim across the forest toward a bend.
      const exit=this._courtyardExit(u);
      if(exit){
        if(distance(u,exit)<=.14)u.memory.leavingCourtyard=true;
        destination=u.memory.leavingCourtyard?exit.next:exit;
      }
    }else delete u.memory.leavingCourtyard;
    let dx=destination.x-u.x,dy=destination.y-u.y,d=Math.hypot(dx,dy);
    if(d<EPS)return;
    let slow=Math.max(strongest(u,'slow',this.time),strongest(u,'movementSlow',this.time));if(has(u,'poison',this.time))slow=Math.max(slow,.1);
    let speed=num(u.stats.speed)/1000*(1+strongest(u,'speedBonus',this.time))*(1-clamp(slow,0,.95));
    if(has(u,'fear',this.time)){dx=-dx;dy=-dy;}
    const travel=Math.min(d,speed*dt),p={x:u.x+dx/d*travel,y:u.y+dy/d*travel};
    u.facingX=dx/d;u.facingY=dy/d;
    if(movement!=='flying'){
      if(!isWalkable(p)){
        // Leave a courtyard through a road at walking speed, rather than
        // snapping across the gap when a direct pursuit reaches its edge.
        const q=closestRoute(u),toward=Math.hypot(q.x-u.x,q.y-u.y);
        if(toward<EPS)return;
        const correction=Math.min(toward,speed*dt);
        p.x=u.x+(q.x-u.x)/toward*correction;p.y=u.y+(q.y-u.y)/toward*correction;
        if(!isWalkable(p))return;
      }
      const obstacles=this.castles.concat(this.units.filter(b=>b.isBuilding));
      const block=obstacles.find(b=>b.alive&&b.id!==u.id&&distance(p,b)<u.radius+b.radius);
      if(block){
        const direction=(u.id.charCodeAt(u.id.length-1)%2)?1:-1;
        let avoided=false;
        for(const sign of [direction,-direction]){
          const slide={x:u.x-dy/d*speed*dt*sign,y:u.y+dx/d*speed*dt*sign};
          if(isWalkable(slide)&&distance(slide,block)>distance(u,block)&&!obstacles.some(b=>b.alive&&b.id!==u.id&&distance(slide,b)<u.radius+b.radius)){
            Object.assign(p,slide);avoided=true;break;
          }
        }
        if(!avoided)return;
      }
    }
    const travelled=distance(u,p);
    if(travelled>EPS){u.facingX=(p.x-u.x)/travelled;u.facingY=(p.y-u.y)/travelled;}
    u.x=clamp(p.x,.5,MAP.width-.5);u.y=clamp(p.y,.5,MAP.height-.5);
    u.memory.distance=(u.memory.distance||0)+travelled*1000;
    u.memory.movedTime=(u.memory.movedTime||0)+dt;
    u.moving=travelled>0;
  }
  _targetsFor(u,target,p){
    if(!p.multiTarget)return [target];
    const reach=this._reach(u,p),width=num(p.attackWidth)/1000;
    const dx=target.x-u.x,dy=target.y-u.y,len=Math.hypot(dx,dy)||1;
    const angle=(num(p.attackAngle)||2*Math.atan(width/(2*Math.max(reach,.01)))*180/Math.PI)*Math.PI/180;
    let victims=this.units.concat(this.castles).filter(t=>this._legalTarget(u,t));
    victims=victims.filter(t=>{
      const x=t.x-u.x,y=t.y-u.y,dist=Math.hypot(x,y);
      if(p.attackShape==='square'){
        const nums=String(p.impactSize||'').match(/[\d.]+/g)?.map(Number)||[width,width];
        return Math.abs(t.x-target.x)<=nums[0]/2+t.radius&&Math.abs(t.y-target.y)<=(nums[1]??nums[0])/2+t.radius;
      }
      if(dist>reach+t.radius)return false;
      if(p.attackShape==='circle')return true;
      const along=(x*dx+y*dy)/len,cross=Math.abs(x*dy-y*dx)/len;
      if(p.attackShape==='cone')return along>=-t.radius&&Math.acos(clamp((x*dx+y*dy)/(dist*len||1),-1,1))<=angle/2+Math.asin(Math.min(1,t.radius/(dist||1)))&&cross<=width/2+t.radius;
      if(p.attackShape==='multi')return true;
      return along>=-t.radius&&cross<=width/2+t.radius;
    });
    victims.sort((a,b)=>(a.id===target.id?-1:b.id===target.id?1:distance(u,a)-distance(u,b)));
    if(Number.isFinite(p.maxTargets))victims=victims.slice(0,p.maxTargets);
    return victims;
  }
  _fire(u,target){
    const attack=this._attackDefinition(u),profile=this._profile(u);
    const index=u.burstIndex;
    u.shots++;u.memory.lastAttack=this.time;
    const hit={damage:attack.sequence?attack.damage:num(u.stats.damage,attack.damage),kind:'attack',bypassShield:false,critical:false,secondary:false,burstIndex:index,combat:profile};
    // Per-mode damage is authored independently of the base per-hit statistic.
    if(u.def.attack?.sequence)hit.damage=attack.damage;
    this._hook('attack',u,target,hit);
    if(hit.targetId){const selected=this.units.find(t=>t.id===hit.targetId);if(this._legalTarget(u,selected)&&distance(u,selected)<=this._reach(u,profile)+selected.radius)target=selected;}
    hit.damage*=1+strongest(u,'damageBonus',this.time);
    hit.critical=hit.critical||(!has(u,'suppression',this.time)&&this.random()<clamp(num(u.stats.criticalChance),0,100)/100);
    const p={...profile,...hit.combat};
    const misfortune=strongest(u,'misfortune',this.time);
    if(this.random()>=misfortune){
      if(p.attackType==='ranged'){
        const targets=p.attackShape==='multi'&&p.multiTarget?this._targetsFor(u,target,p):[target];
        for(const t of targets)this._projectile(u,t,hit,p);
      }else{
        const victims=this._targetsFor(u,target,p);
        for(const t of victims)this._resolveHit(u,t,hit);
        this.fx('slash',u.x,u.y,{side:u.side,radius:this._reach(u,p),angle:p.attackAngle||0,dx:target.x-u.x,dy:target.y-u.y,duration:.24});
      }
    }else this.fx('miss',target.x,target.y,{side:u.side});
    const haste=strongest(u,'attackHaste',this.time)+(hit.haste||0),slow=strongest(u,'slow',this.time);
    const baseInterval=u.def.attack?.sequence?attack.interval:num(u.stats.attackSpeed,attack.interval);
    const interval=Math.max(.01,baseInterval/(1+haste)/(1-clamp(slow,0,.95)));
    u.burstIndex++;
    if(u.burstIndex>=Math.max(1,attack.count)){
      u.burstIndex=0;u.burstTargetId=null;u.sequenceIndex++;u.attacks++;
      u.cooldown=Math.max(.01,interval+num(attack.delay));
    }else{u.burstTargetId=target.id;u.cooldown=interval;}
  }
  _projectile(u,target,hit,profile){
    let dx=target.x-u.x,dy=target.y-u.y,len=Math.hypot(dx,dy)||1;
    const remaining=this._reach(u,profile);
    this.state.projectiles.push({id:`shot-${++this.serial}`,x:u.x,y:u.y,prevX:u.x,prevY:u.y,dx:dx/len,dy:dy/len,remaining,width:num(profile.attackWidth)/1000,side:u.side,sourceId:u.id,source:u,targetId:target.id,hit:{...hit},profile:{...profile},hitIds:new Set(),kind:'bolt',color:u.side?'#ffb286':'#9feaff'});
  }
  _resolveHit(source,target,hit){
    if(!target.alive)return;
    const result=this.damage(source,target,hit.damage,hit);
    if(result.total<=0)return;
    source.hits=(source.hits||0)+1;
    this._hook('hit',source,target,result,hit);
    if(result.healthDamage>0&&source.alive&&!source.isCastle&&!source.isBuilding&&!has(source,'suppression',this.time)&&this.random()<clamp(num(source.stats.lifestealChance),0,100)/100){
      const healed=this.heal(source,result.healthDamage*clamp(num(source.stats.lifesteal),0,100)/100,source);
      if(healed>0)this._hook('lifesteal',source,healed);
    }
  }
  _projectiles(dt){
    for(const shot of this.state.projectiles){
      if(shot.done)continue;
      shot.prevX=shot.x;shot.prevY=shot.y;
      const step=Math.min(shot.remaining,RULES.projectileSpeed*dt);
      shot.x+=shot.dx*step;shot.y+=shot.dy*step;shot.remaining-=step;
      const targets=this.units.concat(this.castles).filter(t=>this._legalTarget(shot.source,t)&&!shot.hitIds.has(t.id)&&projectSegment(t,{x:shot.prevX,y:shot.prevY},shot).distance<=t.radius+shot.width/2);
      targets.sort((a,b)=>distance({x:shot.prevX,y:shot.prevY},a)-distance({x:shot.prevX,y:shot.prevY},b));
      for(const target of targets){
        if(shot.profile.projectileEndEffect==='explode'||shot.profile.multiTarget&&['square','circle'].includes(shot.profile.attackShape)){
          this._explodeProjectile(shot,target);shot.done=true;break;
        }
        shot.hitIds.add(target.id);this._resolveHit(shot.source,target,shot.hit);
        const limit=shot.profile.multiTarget?shot.profile.maxTargets:1;
        if(limit!=null&&shot.hitIds.size>=limit){shot.done=true;break;}
      }
      if(shot.remaining<=EPS){if(!shot.done&&shot.profile.projectileEndEffect==='explode')this._explodeProjectile(shot,shot);shot.done=true;}
    }
    this.state.projectiles=this.state.projectiles.filter(s=>!s.done);
  }
  _explodeProjectile(shot,point){
    const dimensions=String(shot.profile.impactSize||'').match(/[\d.]+/g)?.map(Number);
    const width=dimensions?.[0]??shot.width,height=dimensions?.[1]??width;
    const shape={shape:'rect',width,height};
    const targets=this.units.concat(this.castles).filter(t=>this._legalTarget(shot.source,t)&&this._inside(t,point,shape));
    const limit=shot.profile.multiTarget?shot.profile.maxTargets:1;
    for(const t of targets.slice(0,limit??targets.length))this._resolveHit(shot.source,t,shot.hit);
    this.fx('explosion',point.x,point.y,{side:shot.side,radius:Math.max(width,height)/2,duration:.7});
  }
  _statuses(u,dt){
    for(const s of u.statuses){
      while(s.nextTick<=Math.min(this.time,s.until)+EPS){
        if(s.kind==='bleed')this.damage(this.units.find(v=>v.id===s.sourceId)||null,u,u.maxHp*.01,{kind:'dot',secondary:true});
        else if(s.kind==='poison'||s.kind==='burn')this.damage(this.units.find(v=>v.id===s.sourceId)||null,u,s.amount||0,{kind:'dot',secondary:true,bypassShield:!!s.bypassShield});
        else if(s.kind==='regen')this.heal(u,s.amount??s.magnitude,null);
        s.nextTick+=s.interval||1;
      }
    }
    u.statuses=u.statuses.filter(s=>s.until>this.time);
    if(u.memory.conversion&&!has(u,'conversion',this.time))this._restoreConversion(u);
    if(!u.alive)return;
    this.heal(u,num(u.stats.healrecovery)*dt,u);
    if(!has(u,'suppression',this.time)){
      const raw=String(u.def.raw?.additionalStats?.shieldrecovery||'');
      if(/^\d+(?:\.\d+)?\/\d+(?:\.\d+)?s$/.test(raw)){
        const [amount,period]=raw.split('/').map(num);u.memory.shieldClock=(u.memory.shieldClock||0)+dt;
        if(u.memory.shieldClock>=period){u.shield=Math.min(u.maxShield,u.shield+amount);u.memory.shieldClock-=period;}
      }else u.shield=Math.min(u.maxShield,u.shield+num(u.stats.shieldrecovery)*dt);
    }
    u.damageWindow=u.damageWindow.filter(d=>d.time>this.time-1);u.dps=u.damageWindow.reduce((sum,d)=>sum+d.damage,0);
  }
  _fields(){
    for(const field of this.state.fields){
      if(field.until<=this.time)continue;
      const targets=this.units.filter(u=>u.alive&&u.side!==field.side&&this._inside(u,field,field.shape));
      if(field.kind==='suppression'){for(const u of targets)this.status(u,'suppression',.1,1,field.source);continue;}
      for(const u of targets)this.status(u,field.kind==='roots'?'slow':'curse',.1,field.kind==='roots'?.15:.4,field.source,{groundOnly:field.kind==='roots'});
      if(field.left>0&&field.next<=this.time+EPS){
        for(const u of targets){if(field.kind!=='roots'||!u.def.combat.groundEffectImmune)this.damage(field.source,u,field.attack.damage,{kind:'spell'});}
        for(const c of this.castles.filter(c=>c.alive&&c.side!==field.side&&this._inside(c,field,field.shape)))this.damage(field.source,c,field.castleAttack.damage,{kind:'spell'});
        field.left--;field.next+=field.interval;
      }
    }
    this.state.fields=this.state.fields.filter(f=>f.until>this.time);
  }
  _buildingAura(u){
    const radius=num(u.spell?.raw?.stats?.range)/1000;
    if(u.buildingKind==='watchtower'||u.buildingKind==='obsidian-fortress'){
      for(const ally of this.near(u,radius,t=>t.side===u.side&&!t.isBuilding))this.status(ally,u.buildingKind==='watchtower'?'damageBonus':'spellProtection',.12,u.buildingKind==='watchtower'?.1:.5,u);
    }
  }
  _castles(dt){
    for(const castle of this.castles){
      if(!castle.alive)continue;
      castle.damageWindow=(castle.damageWindow||[]).filter(d=>d.time>this.time-1);
      castle.dps=castle.damageWindow.reduce((sum,d)=>sum+d.damage,0);
      castle.cooldown-=dt;
      if(castle.cooldown>EPS)continue;
      const targets=this.units.filter(u=>u.alive&&u.side!==castle.side&&!has(u,'invisible',this.time)&&!has(u,'imprisonment',this.time)&&distance(castle,u)<=RULES.castleRange+u.radius);
      targets.sort((a,b)=>distance(castle,a)-distance(castle,b));
      if(!targets.length)continue;
      const target=targets[0];
      castle.def={combat:{targets:'both',movementType:'ground'}};
      this._projectile(castle,target,{damage:RULES.castleDamage,kind:'attack',critical:false,secondary:false,bypassShield:false},{attackDistance:RULES.castleRange*1000,attackWidth:500,attackShape:'single',multiTarget:false,maxTargets:1});
      castle.cooldown=RULES.castleInterval;
    }
  }
  _objectives(dt){
    for(const node of this.state.nodes){
      const present=[0,1].map(side=>this.near(node,RULES.captureRadius,u=>u.side===side&&!u.isBuilding).length>0);
      if(present[0]&&present[1])continue;
      const side=present[0]?0:present[1]?1:null;
      if(side===null||side===node.owner){node.progress=0;node.capturing=null;continue;}
      if(node.capturing!==side){node.capturing=side;node.progress=0;}
      node.progress+=dt;
      if(node.progress+EPS>=RULES.captureTime){node.owner=side;node.progress=0;node.capturing=null;this.fx('capture',node.x,node.y,{side,radius:1.4,duration:1.4});this.log('capture',`${side?'Crimson':'Azure'} captured ${node.name}.`,{side,nodeId:node.id});}
    }
  }
  _separation(){
    const bodies=this.units.filter(u=>u.alive&&!u.isBuilding&&u.def.combat.movementType!=='flying');
    for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
      const a=bodies[i],b=bodies[j],min=(a.radius+b.radius)*.72;
      let dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);
      if(d>=min)continue;if(d<.001){dx=0;dy=(i%2?1:-1)*.001;d=.001;}
      const overlap=Math.min(.04,(min-d)*.3),total=a.mass+b.mass;
      for(const [u,sign,weight] of [[a,1,b.mass/total],[b,-1,a.mass/total]]){
        if(has(u,'stun',this.time)||has(u,'root',this.time)||has(u,'imprisonment',this.time))continue;
        const p={x:u.x+dx/d*overlap*sign*weight,y:u.y+dy/d*overlap*sign*weight};
        if(isWalkable(p)&&!this.castles.some(c=>c.alive&&distance(p,c)<c.radius+u.radius)){u.x=p.x;u.y=p.y;}
      }
    }
  }
  _drainDeaths(){
    let processed=0;
    while(this.deaths.length&&processed++<2048){
      const {u,killer}=this.deaths.shift();if(u.memory.deathResolved)continue;u.memory.deathResolved=true;
      if(u.isCastle){this.fx('explosion',u.x,u.y,{side:u.side,radius:2,duration:1.8});continue;}
      this._hook('death',u,killer);
      if(u.buildingKind==='dark-orb'){
        const raw=u.spell.raw.stats;
        for(const enemy of this.units.filter(v=>v.alive&&v.side!==u.side))this.damage(u,enemy,num(raw.damageToCard),{kind:'spell',secondary:true});
        for(const c of this.castles.filter(v=>v.alive&&v.side!==u.side))this.damage(u,c,num(raw.damageToCastle),{kind:'spell',secondary:true});
      }
      this.fx('death',u.x,u.y,{side:u.side,duration:.7});
      this.log('death',`${u.def.name} fell.`,{side:u.side,unitId:u.id});
    }
    this.state.units=this.units.filter(u=>u.alive);
  }
  _deploymentCandidates(side,lane,goal=MAP.nodes[lane],building=false){
    const route=routeFor(lane,side),buildings=this.units.filter(u=>u.alive&&u.isBuilding);
    const candidates=[],seen=new Set();
    for(let i=1;i<route.length;i++){
      const a=route[i-1],b=route[i],length=distance(a,b),steps=Math.max(1,Math.ceil(length/.4));
      const nx=length?-(b.y-a.y)/length:0,ny=length?(b.x-a.x)/length:0;
      for(let step=0;step<=steps;step++)for(const offset of [0,.45,-.45]){
        const fraction=step/steps,point={x:a.x+(b.x-a.x)*fraction+nx*offset,y:a.y+(b.y-a.y)*fraction+ny*offset};
        const key=`${point.x.toFixed(4)},${point.y.toFixed(4)}`;
        if(seen.has(key)||!isDeployable(point,side,buildings))continue;
        if(building&&this.units.some(u=>u.alive&&u.def.combat?.movementType!=='flying'&&distance(u,point)<u.radius+.5))continue;
        seen.add(key);candidates.push(point);
      }
    }
    // Both sides use the same road/range legality and tactical distance metric.
    return candidates.sort((a,b)=>distance(a,goal)-distance(b,goal)||distance(a,MAP.bases[side])-distance(b,MAP.bases[side]));
  }
  _bot(dt){
    if(!this.bot)return;
    this.botClock-=dt;if(this.botClock>0)return;
    this.botClock=.6;
    const side=1,team=this.teams[side],castle=this.castles[side],opponent=this.castles[1-side],enemy=this.units.filter(u=>u.alive&&u.side!==side);
    const scores=MAP.routes.map((r,lane)=>{
      const pressure=enemy.filter(u=>u.lane===lane).reduce((n,u)=>n+(distance(u,castle)<distance(u,opponent)?3:1)*(u.hp/Math.max(1,u.maxHp)),0);
      return pressure+(this.state.nodes[lane].owner!==side?2:0)+(this.random()*.4);
    });
    const lane=scores.indexOf(Math.max(...scores));
    const threats=enemy.filter(u=>u.lane===lane&&distance(u,castle)<distance(u,opponent)).sort((a,b)=>distance(a,castle)-distance(b,castle));
    let goal=MAP.nodes[lane];
    if(threats.length){
      const target=threats[0],length=distance(castle,target)||1;
      goal={x:target.x+(castle.x-target.x)/length,y:target.y+(castle.y-target.y)/length};
    }
    const legal=team.hand.map((id,index)=>({def:this.cards.get(id),index})).filter(v=>v.def.stats.mana<=team.mana+EPS);
    legal.sort((a,b)=>{
      const score=v=>num(v.def.stats.health)/100+num(v.def.stats.damage)*(v.def.attack?.count||1)/20+(v.def.combat.targets==='both'?1:0)-v.def.stats.mana*.12;
      return score(b)-score(a);
    });
    if(legal.length){
      for(const point of this._deploymentCandidates(side,lane,goal).slice(0,24))if(this.deploy(side,legal[0].index,point).ok)break;
    }
    const spell=this.spells.get(team.spellIds[team.spellIndex]);
    if(spell&&team.energy>=spell.energy){
      const name=slug(spell.name),friendly=['healing-light','shield-of-serenity','lunar-mirrage'].includes(name);
      if(spell.kind==='building'){
        for(const point of this._deploymentCandidates(side,lane,goal,true).slice(0,24))if(this.cast(side,point).ok)break;
      }
      else{
        const pool=friendly?this.units.filter(u=>u.alive&&u.side===side&&!u.isBuilding):enemy;
        const target=pool.sort((a,b)=>this.near(b,2,u=>u.side===b.side).length-this.near(a,2,u=>u.side===a.side).length)[0];
        if(target)this.cast(side,target);
      }
    }
  }
  _finish(){
    const [a,b]=this.castles;
    if(a.hp<=0||b.hp<=0)this.state.winner=a.hp<=0&&b.hp<=0?'draw':a.hp<=0?1:0;
    else if(this.state.phase==='overtime'&&this.state.remaining<=EPS)this.state.winner=Math.abs(a.hp-b.hp)<EPS?'draw':a.hp>b.hp?0:1;
    if(this.state.winner!==null){this.state.phase='ended';this.state.remaining=Math.max(0,this.state.remaining);this.log('result',this.state.winner==='draw'?'The battle is a draw.':`${this.state.winner?'Crimson Crown':'Azure Core'} wins.`);}
  }
  _tick(dt){
    this.state.time+=dt;this.state.remaining-=dt;
    for(let side=0;side<2;side++){
      const owned=this.state.nodes.filter(n=>n.owner===side).length;
      this.teams[side].mana=Math.min(RULES.maxMana,this.teams[side].mana+dt/RULES.manaInterval*(1+owned*RULES.nodeBonus)*(this.state.phase==='overtime'?2:1));
    }
    this._fields();
    // Snapshot prevents summons from taking an extra action in their birth tick.
    for(const u of [...this.units]){
      if(!u.alive)continue;
      u.moving=false;u.cooldown-=dt;
      this._statuses(u,dt);
      if(!u.alive)continue;
      if(u.expiresAt<=this.time){u.hp=0;u.alive=false;this.deaths.push({u,killer:null});continue;}
      if(u.isBuilding)this._buildingAura(u);
      if(!has(u,'silence',this.time)&&!has(u,'imprisonment',this.time))this._hook('tick',u,dt);
      if(!u.alive||has(u,'stun',this.time)||has(u,'imprisonment',this.time))continue;
      const target=this._target(u);u.targetId=target?.id??null;
      const profile=this._profile(u),reach=this._reach(u,profile);
      if(target&&distance(u,target)<=reach+target.radius+u.radius*.2&&profile.attackType!=='none'){
        const dx=target.x-u.x,dy=target.y-u.y,len=Math.hypot(dx,dy)||1;u.facingX=dx/len;u.facingY=dy/len;
        if(u.cooldown<=EPS)this._fire(u,target);
      }else this._move(u,target,dt);
    }
    this._separation();this._castles(dt);this._projectiles(dt);this._objectives(dt);this._drainDeaths();
    this.state.effects=this.state.effects.filter(e=>e.until>this.time);
    this._finish();
    if(this.state.phase==='ended')return;
    if(this.state.remaining<=EPS&&this.state.phase==='regulation'){
      this.state.phase='overtime';this.state.remaining=RULES.overtime;this.log('overtime','Overtime · double mana.');
    }
    this._bot(dt);
  }
  step(dt){
    if(this.state.paused||this.state.phase==='ended'||!Number.isFinite(dt)||dt<=0)return this.state;
    this.accumulator+=dt;
    // No wall-clock work while paused; callers can simulate long matches in tests.
    let ticks=0;
    while(this.accumulator+EPS>=RULES.fixedStep&&this.state.phase!=='ended'){
      this.accumulator-=RULES.fixedStep;this._tick(RULES.fixedStep);
      if(++ticks>=30000){this.accumulator=0;break;}
    }
    return this.state;
  }
}
