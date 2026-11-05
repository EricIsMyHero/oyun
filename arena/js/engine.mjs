import { RULES, clamp, num, burst, energyForMana } from './rules.mjs';
import { MAP, routeFor, routeLength, pointOnRoute, closestRoute, isDeployable, isWalkable, isCourtyard, courtyardFor, distance, projectSegment } from './map.mjs';
import { ABILITIES } from './abilities.mjs';
import { visibilitySources, isEntityVisible } from './vision.mjs';
import { NEGATIVE_STATUSES as NEGATIVE, STATUS_INTERVALS, statusKind, statusParameters, statValue, statModifiers } from './statuses.mjs';
import { buildBotLoadout, createBotState, tickBot } from './bot.mjs';
import { resolveDeckCard } from './ascension.mjs';

const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= MAP.width && p.y >= 0 && p.y <= MAP.height;
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const active = (u,kind,time) => (u.statuses || []).filter(s => s.kind === kind && s.until > time+1e-7);
const strongest = (u,kind,time) => Math.max(0,...active(u,kind,time).map(s => s.magnitude || 0));
const has = (u,kind,time) => active(u,kind,time).length > 0;
const bodyMass = { 'very-light':.5, light:.75, medium:1, heavy:1.5, 'very-heavy':2 };
const EPS = 1e-7;

/** Pure fixed-step simulation. Render/UI modules never own combat timers. */
export class ArenaEngine {
  constructor({cards=[],spells=[],deck=[],spellDeck=[],seed=1,bot=true}={}) {
    this.cards = new Map();
    const add = c => { this.cards.set(c.id,c); for(const f of c.forms || []) add(f);if(c.ascended)add(c.ascended); };
    cards.forEach(add);
    this.spells = new Map(spells.map(s => [s.id,s]));
    if(deck.length !== RULES.deckSize || new Set(deck).size !== RULES.deckSize) throw new Error('Choose eight different unit cards.');
    if(deck.some(id => id.endsWith('/ascended')||!this.cards.get(id)?.ready)) throw new Error('Select complete root cards; an ascended form requires its partner in the deck.');
    if(!spellDeck.length || new Set(spellDeck).size !== spellDeck.length || spellDeck.some(id => !this.spells.get(id)?.ready)) throw new Error('Choose complete, distinct spells.');
    if(spellDeck.reduce((s,id)=>s+num(this.spells.get(id).charge),0) > RULES.spellBudget) throw new Error('Spell charge capacity is five.');
    this.seed = (Number(seed) >>> 0) || 1;
    this.bot = !!bot;
    const opponent=this.bot?buildBotLoadout(cards,spells,()=>this.random()):{deck,spellDeck};
    this.accumulator = 0;
    this.serial = 0;
    this.deaths = [];
    this.damageDepth = 0;
    this.botClock = .6;
    this.statusSources=new Map();
    this.vitalPools=new Map();
    this.abilityContext=null;
    this.state = {
      time:0, phase:'regulation',remaining:RULES.regulation,paused:false,winner:null,
      teams:[{deck,spellDeck},opponent].map(loadout=>({deck:[...loadout.deck],mana:RULES.startMana,energy:0,hand:loadout.deck.slice(0,RULES.handSize),queue:loadout.deck.slice(RULES.handSize),spellIds:[...loadout.spellDeck],spellIndex:0,deployed:0,spentMana:0})),
      castles:MAP.bases.map((p,side)=>({id:`castle-${side}`,name:side?'Crimson Crown':'Azure Core',...p,side,radius:MAP.castleRadius,hp:RULES.castleHealth,maxHp:RULES.castleHealth,shield:0,maxShield:0,alive:true,isCastle:true,isBuilding:true,stats:{dodge:0,damageminimiser:0,shieldtakendamage:0,criticdamageminimiser:0},statuses:[],memory:{},cooldown:0})),
      nodes:MAP.nodes.map(n=>({...n,owner:null,capturing:null,progress:0})),
      units:[],projectiles:[],effects:[],events:[],fields:[],trails:[],sharedVitals:[],spawnStreams:[],
    };
    this.botState=this.bot?createBotState(this):null;
  }
  get time(){return this.state.time;}
  get units(){return this.state.units;}
  get castles(){return this.state.castles;}
  get teams(){return this.state.teams;}
  cardFor(side,id){return resolveDeckCard(this.cards,id,this.teams[side]?.deck);}
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
  near(point,radius,filter=null){return this.units.filter(u=>u.alive&&!u.engulfedBy&&!u.banished&&!u.possessingId&&!u.parasitizingId&&distance(u,point)<=radius+(u.radius||0)&&(!filter||filter(u)));}
  ability(u){return u.passiveDisabled?null:ABILITIES[u.def?.id] || ABILITIES[u.def?.rootId] || null;}
  prepareWeapon(u,target=null){
    const custom=this.ability(u)?.prepareAttack;if(custom){custom(this,u,target);return;}
    const modes=u.def.attack?.modes;if(!modes)return;
    const index=target&&target.def?.combat?.movementType!=='flying'&&distance(u,target)<=modes[0].range/1000+(target.radius||0)+EPS?0:1,mode=modes[index];
    if(u.memory.combatMode!==index){u.burstIndex=0;u.burstTargetId=null;this._cancelBurstBoost(u);u.memory.combatMode=index;}
    Object.assign(u.stats,{damage:mode.damage,attackSpeed:mode.interval,delay:mode.delay,range:mode.range});
  }
  stealAbility(u){
    if(u.theftState?.used)return false;
    const donor=this.units.filter(t=>!t.isBuilding&&!t.healthless&&this._legalTarget(u,t,null,'both')&&distance(u,t)<=15+EPS&&(t.x-u.x)*(u.side?-1:1)>=0&&this.ability(t)&&Object.keys(this.ability(t)).length)
      .sort((a,b)=>distance(u,a)-distance(u,b)||a.id.localeCompare(b.id))[0];
    if(!donor)return false;
    u.theftState={used:true,donorId:donor.id,donorName:donor.def.name};
    if(has(donor,'predominance',this.time)||this._abilityMiss(u,donor))return false;
    const behavior=this.ability(donor),original=u.def;
    donor.passiveDisabled=true;donor.abilityStolenBy=u.id;
    for(const key of behavior.conditionalStats||[])donor.stats[key]=donor.def.stats[key];
    if(behavior.lifeDecay)delete donor.lifeDecay;
    u.def={...original,id:donor.def.id,rootId:original.rootId||original.id,forms:donor.def.forms,ascension:donor.def.ascension,
      raw:{...original.raw,trait:donor.def.raw.trait,abilityName:donor.def.raw.abilityName,mechanicStats:donor.def.raw.mechanicStats}};
    if(behavior.lifeDecay)u.lifeDecay={...behavior.lifeDecay,next:this.time+behavior.lifeDecay.interval};
    this._hook('spawn',u);this._spawnCompanions(u);this.fx('capture',donor.x,donor.y,{side:u.side,color:'#d0b3ee'});return true;
  }
  _hook(name,u,...args){
    // Target changes clear passive state even while abilities are silenced.
    if(!['spawn','targetChanged'].includes(name)&&(has(u,'silence',this.time)||has(u,'imprisonment',this.time)))return;
    if(u.engulfedBy&&['tick','move','attack','hit','lifesteal'].includes(name))return;
    if(['tick','move','attack'].includes(name)&&(has(u,'airborne',this.time)||has(u,'frozen',this.time)))return;
    const fn=this.ability(u)?.[name];if(!fn)return;
    const chance=strongest(u,'misfortune',this.time),triggered=['incoming','damaged','death','unitDeath','lifesteal','intercept'].includes(name);
    if(triggered&&chance&&this.random()<chance)return;
    const previous=this.abilityContext;this.abilityContext={source:u,name,missed:triggered?false:null};
    try{return fn(this,u,...args);}finally{this.abilityContext=previous;}
  }
  statValue(u,key,fallback=0){return statValue(u,key,this.time,num(u?.stats?.[key],fallback));}
  _pool(u){return this.vitalPools.get(u?.sharedVitalsId)||null;}
  _poolCap(pool,key){
    const base=key==='health'?pool.maxHp:pool.maxShield;
    return Math.min(base,...pool.members.map(id=>this.units.find(u=>u.id===id)).filter(Boolean).map(u=>statValue(u,key,this.time,base)));
  }
  maxHealth(u){const pool=this._pool(u);return Math.max(1,pool?this._poolCap(pool,'health'):statValue(u,'health',this.time,u.maxHp));}
  maxShield(u){const pool=this._pool(u);return pool?this._poolCap(pool,'shield'):statValue(u,'shield',this.time,u.maxShield);}
  _healthFloor(u){const pool=this._pool(u),members=pool?this.units.filter(t=>pool.members.includes(t.id)):[u];return members.some(t=>has(t,'immortal',this.time))?Math.min(1,u.hp):0;}
  killUnit(u,killer=null,extra={}){
    const pool=this._pool(u),members=pool?this.units.filter(t=>pool.members.includes(t.id)):[u];
    for(const member of members)if(member.alive){member.hp=0;member.alive=false;this.deaths.push({u:member,killer,...extra});}
    for(const member of members){this._possessionGone(member);this._parasitesGone(member);}
    for(const member of members)this._promoteFormat(killer,member);
  }
  vanishUnit(u){
    if(!u?.alive)return;
    this._detachSharedVitals(u);
    u.hp=0;u.alive=false;this.deaths.push({u,killer:null});this._possessionGone(u);this._parasitesGone(u);
  }
  _detachSharedVitals(u){
    const pool=this._pool(u);
    if(pool){
      const contribution=u.sharedVitalContribution||{health:0,shield:0};
      const ownHealth=contribution.health/.9||u.stats.health,ownShield=contribution.shield/.9||0;
      const saved={hp:pool.maxHp>0?pool.hp/pool.maxHp*ownHealth:0,maxHp:ownHealth,shield:pool.maxShield>0?pool.shield/pool.maxShield*ownShield:0,maxShield:ownShield};
      pool.members=pool.members.filter(id=>id!==u.id);delete u.sharedVitalsId;delete u.sharedVitalContribution;
      for(const [current,maximum,part]of [['hp','maxHp',contribution.health],['shield','maxShield',contribution.shield]]){
        const capacity=pool[maximum];pool[maximum]=Math.max(0,capacity-part);
        pool[current]=capacity>0?pool[current]*pool[maximum]/capacity:0;
      }
      for(const [key,value]of Object.entries(saved))Object.defineProperty(u,key,{enumerable:true,configurable:true,writable:true,value});
      for(const member of this.units.filter(t=>t.alive&&pool.members.includes(t.id)))this._capVitals(member);
    }
  }
  collectWhisperCritical(u){
    const bank=u.whisperState||={bonusSeconds:0};
    const gained=clamp(num(u.stats.criticalChance),0,100);u.stats.criticalChance=0;
    if(gained>0){bank.bonusSeconds+=gained;if(u.possessingId)bank.until+=gained*bank.durationFactor;}
    return bank;
  }
  possessionTarget(u){
    return this.near(u,this._range(u),t=>!t.isBuilding&&!t.healthless&&!t.possessedBy&&this._legalTarget(u,t))
      .sort((a,b)=>distance(u,a)-distance(u,b)||a.id.localeCompare(b.id))[0]||null;
  }
  _possessionMarker(source,host){
    let marker=host.statuses.find(s=>s.kind==='possession'&&s.sourceId===source.id);
    if(!marker){marker={kind:'possession',sourceId:source.id,magnitude:1,unbreakable:true,nextTick:Infinity,interval:1};host.statuses.push(marker);}
    marker.until=source.whisperState.until;this.statusSources.set(source.id,source);
  }
  _possessionSide(host,side){
    if(host.side===side)return;
    host.side=side;host.targetId=host.burstTargetId=null;host.burstIndex=0;
    host.route=routeFor(host.lane,side);this._resetWaypoint(host);
  }
  possess(source,host){
    if(!source?.alive||!this.ability(source)?.possessor||source.possessingId||source.engulfedBy||source.banished||['silence','stun','imprisonment','airborne','frozen'].some(kind=>has(source,kind,this.time))||!host?.alive||host.isBuilding||host.healthless||host.possessedBy||!this._legalTarget(source,host)||distance(source,host)>this._range(source)+host.radius+EPS)return false;
    const bank=this.collectWhisperCritical(source),missed=this._abilityMiss(source,host);
    bank.penalized=missed||has(host,'predominance',this.time);bank.durationFactor=bank.penalized?.75:1;
    bank.startedAt=this.time;bank.until=this.time+(num(source.def.raw?.mechanicStats?.controlDuration,14)+bank.bonusSeconds)*bank.durationFactor;
    bank.originalSide=host.side;bank.controlSide=source.side;bank.hostId=host.id;
    this._detachSharedVitals(source);
    source.possessingId=host.id;host.possessedBy=source.id;
    source.targetId=source.burstTargetId=null;source.moving=false;
    this._possessionSide(host,bank.controlSide);this._possessionMarker(source,host);
    this.fx('portal',source.x,source.y,{side:source.side,color:'#cbb5ff',duration:.7});
    source.x=host.x;source.y=host.y;
    this.fx('capture',host.x,host.y,{side:bank.controlSide,color:'#cbb5ff',duration:.8});
    this.log('possession',`Whisper controls ${host.def.name}.`,{side:bank.controlSide,unitId:host.id});
    return true;
  }
  _penalizePossession(host){
    const source=this.units.find(u=>u.id===host.possessedBy),bank=source?.whisperState;
    if(!source?.alive||!source.possessingId||!bank||bank.penalized)return;
    bank.until=this.time+Math.max(0,bank.until-this.time)*.75;bank.durationFactor=.75;bank.penalized=true;
    this._possessionMarker(source,host);
  }
  endPossession(source){
    if(!source?.possessingId)return;
    const host=this.units.find(u=>u.id===source.possessingId),bank=source.whisperState;
    if(host?.possessedBy===source.id){
      // An expired lower-priority conversion may change the underlying owner.
      if(host.alive&&host.memory.conversion&&!has(host,'conversion',this.time))this._restoreConversion(host);
      delete host.possessedBy;host.statuses=host.statuses.filter(s=>s.kind!=='possession'||s.sourceId!==source.id);
      if(host.alive)this._possessionSide(host,bank.originalSide);
    }
    delete source.possessingId;bank.hostId=null;bank.until=null;
    this.vanishUnit(source);
  }
  _possessionGone(u){
    if(u.possessingId)this.endPossession(u);
    if(u.possessedBy){const controller=this.units.find(t=>t.id===u.possessedBy);if(controller)this.endPossession(controller);}
  }
  _syncPossessions(){
    const sources=this.units.filter(u=>u.possessingId||u.alive&&this.ability(u)?.possessor);
    if(!sources.length)return;
    const byId=new Map(this.units.map(u=>[u.id,u]));
    for(const u of sources)if(u.alive)this.collectWhisperCritical(u);
    for(const source of sources){
      if(!source.possessingId)continue;
      const host=byId.get(source.possessingId),bank=source.whisperState;
      if(!source.alive||!host?.alive||this.time+EPS>=bank.until){this.endPossession(source);continue;}
      host.possessedBy=source.id;this._possessionSide(host,bank.controlSide);this._possessionMarker(source,host);
      let position=host;const visited=new Set([source.id]);
      while(position.possessingId&&!visited.has(position.id)){visited.add(position.id);const next=byId.get(position.possessingId);if(!next?.alive)break;position=next;}
      source.x=position.x;source.y=position.y;source.moving=false;
    }
  }
  _bindVitals(pool,u){
    const saved={hp:u.hp,maxHp:u.maxHp,shield:u.shield,maxShield:u.maxShield};
    for(const key of Object.keys(saved))pool[key]+=saved[key]*.9;
    u.sharedVitalContribution={health:saved.maxHp*.9,shield:saved.maxShield*.9};
    pool.members.push(u.id);u.sharedVitalsId=pool.id;
    for(const key of Object.keys(saved))Object.defineProperty(u,key,{enumerable:true,configurable:true,get:()=>pool[key],set:value=>{pool[key]=Math.max(0,Number.isFinite(value)?value:0);}});
    this._capVitals(u);
  }
  parasitize(source,host){
    if(['silence','stun','frozen','imprisonment','airborne'].some(kind=>has(source,kind,this.time)))return false;
    if(!source?.alive||source.parasitizingId||source.possessingId||source.engulfedBy||source.banished||!host?.alive||host.isCastle||host.isBuilding||host.healthless||!this._legalTarget(source,host)||distance(source,host)>this._reach(source)+host.radius+EPS||this.time<(source.memory.parasiteRetry||0))return false;
    source.memory.parasiteRetry=this.time+this.attackInterval(source);
    const marker=this.status(host,'parasite',Infinity,0,source);if(!marker)return false;
    this._detachSharedVitals(source);source.parasitizingId=host.id;(host.parasiteIds||=[]).push(source.id);
    source.memory.parasiteTick=this.time+this.attackInterval(source);source.targetId=null;source.moving=false;
    source.x=host.x;source.y=host.y;this.fx('portal',host.x,host.y,{side:source.side,color:'#b8d4ff'});return true;
  }
  endParasite(source){
    if(!source?.parasitizingId)return;
    const host=this.units.find(u=>u.id===source.parasitizingId);delete source.parasitizingId;
    if(host){host.parasiteIds=(host.parasiteIds||[]).filter(id=>id!==source.id);host.statuses=host.statuses.filter(s=>s.kind!=='parasite'||s.sourceId!==source.id);}
    this.vanishUnit(source);
  }
  _parasitesGone(u){
    if(u.parasitizingId)this.endParasite(u);
    for(const id of [...(u.parasiteIds||[])]){const source=this.units.find(t=>t.id===id);if(source)this.endParasite(source);}
  }
  _syncParasites(){
    for(const source of [...this.units]){
      if(!source.parasitizingId)continue;
      const host=this.units.find(t=>t.id===source.parasitizingId);
      if(!source.alive||!host?.alive||!host.statuses.some(s=>s.kind==='parasite'&&s.sourceId===source.id)){this.endParasite(source);continue;}
      source.x=host.x;source.y=host.y;source.moving=false;
      while(source.alive&&source.parasitizingId&&host.alive&&source.memory.parasiteTick<=this.time+EPS){
        source.memory.parasiteTick+=this.attackInterval(source);
        this.damage(source,host,this.statValue(source,'damage'),{kind:'parasite',secondary:true,accuracyChecked:true,parasiteDamage:true,friendlyFire:true});
      }
    }
  }
  linkEtheris(u){
    const pair=this.units.filter(t=>t.alive&&!t.banished&&t.side===u.side&&t.groupId===u.groupId&&t.def.id==='etheris');
    if(pair.length<2)return;
    let pool=this._pool(u);
    if(!pool){
      if(pair.some(t=>t.sharedVitalsId))return;
      pool={id:`vitals-${++this.serial}`,members:[],hp:0,maxHp:0,shield:0,maxShield:0};
      this.vitalPools.set(pool.id,pool);this.state.sharedVitals.push(pool);for(const member of pair)this._bindVitals(pool,member);
    }
    if(pool.members.length>=3)return;
    const friend=this.near(u,this.statValue(u,'range')/1000,t=>t.side===u.side&&!t.sharedVitalsId&&!t.isBuilding&&!t.healthless&&t.def.id!=='etheris')
      .sort((a,b)=>distance(u,a)-distance(u,b)||a.id.localeCompare(b.id))[0];
    if(friend){this._bindVitals(pool,friend);this.fx('shield',friend.x,friend.y,{side:u.side,color:'#bce4d9'});}
  }
  channelFormat(u,dt){
    if(u.memory.format?.transformed)return;
    const memory=u.memory.format||={remaining:3,targetId:null};
    const valid=t=>t.alive&&!t.isBuilding&&!t.healthless&&this.isEnemy(u,t)&&!t.def.combat.untargetable&&
      !['imprisonment','untargetable'].some(kind=>has(t,kind,this.time))&&this.canSee(u,t)&&distance(u,t)<=15+EPS&&(t.x-u.x)*(u.side?-1:1)>=0;
    let target=this.units.find(t=>t.id===memory.targetId&&valid(t));
    if(!target){
      target=this.units.filter(valid).sort((a,b)=>(b.def.power||0)-(a.def.power||0)||distance(u,a)-distance(u,b)||a.id.localeCompare(b.id))[0];
      memory.targetId=target?.id??null;memory.remaining=3;
    }
    if(!target)return;
    memory.remaining-=dt;
    if(memory.remaining>EPS)return;
    const def={...target.def,stats:{...target.stats,health:this.maxHealth(target),shield:this.maxShield(target)},attack:structuredClone(target.def.attack),combat:{...target.def.combat}};
    // Keep authored attack sequences, including their relative damage/intervals.
    const activeMode=target.def.attack?.modes?this._attackDefinition(target):null;
    const originalDamage=activeMode?.damage??target.def.stats.damage,originalSpeed=activeMode?.interval??target.def.stats.attackSpeed,originalDelay=activeMode?.delay??target.def.stats.delay;
    const damageScale=originalDamage>0?def.stats.damage/originalDamage:1;
    const speedScale=originalSpeed>0?def.stats.attackSpeed/originalSpeed:1;
    const delayScale=originalDelay>0?def.stats.delay/originalDelay:1;
    for(const attack of [def.attack,...(def.attack.sequence||[]),...(def.attack.modes||[])]){attack.damage*=damageScale;attack.interval*=speedScale;attack.delay*=delayScale;}
    memory.snapshot=def;memory.transformed=true;memory.promoted=false;
    this._setFormatForm(u,def,true);
  }
  _setUnitForm(u,def,memory={}){
    delete u.attackMode;
    u.def=def;u.stats={...def.stats};u.hp=u.maxHp=def.stats.health;u.shield=u.maxShield=def.stats.shield;
    u.memory=memory;u.healthless=false;u.mass=bodyMass[def.combat.weight]||1;u.radius=.18+.07*u.mass;u.moving=false;
    u.hits=u.shots=u.attacks=u.burstIndex=u.sequenceIndex=0;u.targetId=u.burstTargetId=null;u.cooldown=0;
    delete u.lifeDecay;const decay=this.ability(u)?.lifeDecay;if(decay)u.lifeDecay={...decay,next:this.time+decay.interval};
    u.born=this.time;u.expiresAt=def.stats.life>0?this.time+def.stats.life:Infinity;
    u.statuses=u.statuses.filter(s=>!s.groundOnly||!def.combat.groundEffectImmune);
    if(def.combat.movementType!=='flying'&&!isWalkable(u)){const point=closestRoute(u);u.x=point.x;u.y=point.y;}
    this._resetWaypoint(u);this._capVitals(u);
  }
  _setFormatForm(u,def,spawnHook=false){
    const format=u.memory.format,returningShotId=u.memory.returningShotId;
    this._setUnitForm(u,def,{format,...(returningShotId?{returningShotId}:{})});
    if(spawnHook){this._hook('spawn',u);this._spawnCompanions(u);}
    this.fx('capture',u.x,u.y,{side:u.side,duration:1});
    this.log('transform',`Format became ${def.name}${format.promoted?' with doubled stats':''}.`,{side:u.side,unitId:u.id});
  }
  _phoenixForm(u,def,fraction=1){
    if(!u?.alive||!def)return false;
    const previous=u.def,rebirth=u.memory.rebirth||{root:previous.id==='tphoenix'?previous:this.cards.get('tphoenix'),cycles:0};
    const {format,conversion,lastDamageReceived,lastDamageDealt}=u.memory;
    this._setUnitForm(u,def,{rebirth,...(format?{format}:{}),...(conversion?{conversion}:{}),lastDamageReceived,lastDamageDealt});
    u.hp=this.maxHealth(u)*fraction;
    if(def.id==='tphoenix/fire-egg'){u.phoenixEggUsed=true;rebirth.cycles++;rebirth.hatchAt=this.time+10;}
    else delete rebirth.hatchAt;
    this.fx('portal',u.x,u.y,{side:u.side,color:'#ffba72',duration:.8});
    this.log('transform',`${previous.name} became ${def.name}.`,{side:u.side,unitId:u.id});
    return true;
  }
  phoenixEgg(u){
    if(u.def.id!=='tphoenix'||u.phoenixEggUsed||u.hp>=this.maxHealth(u)*.25)return false;
    return this._phoenixForm(u,u.def.forms.find(f=>f.id==='tphoenix/fire-egg'));
  }
  hatchPhoenix(u){
    const hatchAt=u.memory.rebirth?.hatchAt??u.born+10;
    if(this.time+EPS<hatchAt)return false;
    const root=u.memory.rebirth?.root||this.cards.get('tphoenix');
    return this._phoenixForm(u,root?.forms.find(f=>f.id==='tphoenix/phoenix'));
  }
  breakPhoenixEgg(u){
    if(u.hp>0)return false;
    return this._phoenixForm(u,u.memory.rebirth?.root||this.cards.get('tphoenix'),.25);
  }
  _promoteFormat(source,target){
    const memory=source?.memory?.format;
    if(!source?.alive||!memory?.transformed||memory.promoted||memory.targetId!==target.id)return;
    memory.promoted=true;
    const snapshot=memory.snapshot,stats=Object.fromEntries(Object.entries(snapshot.stats).map(([key,value])=>[key,['attackSpeed','delay'].includes(key)?value/2:value*2]));
    const attack=structuredClone(snapshot.attack);
    for(const mode of [attack,...(attack.sequence||[]),...(attack.modes||[])]){mode.damage*=2;mode.interval/=2;mode.delay/=2;}
    this._setFormatForm(source,{...snapshot,stats,attack});
  }
  addInk(source,target,count=1,scheduled=false){
    if(!source||target?.isCastle||target?.isBuilding||target?.healthless)return null;
    const previous=active(target,'ink',this.time).find(s=>s.sourceId===source.id),stacks=Math.min(21,(previous?.stacks||0)+count);
    const ink=this.status(target,'ink',Infinity,stacks*.03,source,{stacks,onLethalHit:true,scheduled});
    if(!ink||stacks<21||active(target,'curse',this.time).some(s=>s.inkCurse&&s.sourceId===source.id))return ink;
    const curse=this.status(target,'curse',Infinity,.25,source,{inkCurse:true,onLethalHit:true,scheduled:true});
    if(curse){source.memory.artistCharge=(source.memory.artistCharge||0)+10;this.fx('poison',target.x,target.y,{side:source.side,color:'#c99ae6'});}
    return ink;
  }
  _spreadInk(target){
    for(const curse of active(target,'curse',this.time).filter(s=>s.inkCurse)){
      const artist=this._sourceFor(curse);if(!artist)continue;
      for(const enemy of this.units.filter(t=>t.alive&&!t.banished&&!t.engulfedBy&&this.isEnemy(artist,t)&&this._inside(t,target,{shape:'rect',width:2,height:2})))this.addInk(artist,enemy,4,true);
      this.fx('blastArea',target.x,target.y,{side:artist.side,width:2,height:2,color:'#c99ae6'});
    }
  }
  isEnemy(source,target){return !!target&&source!==target&&(has(source,'betrayal',this.time)?source.side===target.side&&!target.isCastle:source.side!==target.side);}
  _abilityMiss(source,target){
    const chance=strongest(source,'misfortune',this.time);if(!chance)return false;
    const context=this.abilityContext;
    if(context?.source===source&&['attack','hit','lifesteal','spawn'].includes(context.name))return false;
    if(context?.source===source){if(context.missed==null)context.missed=this.random()<chance;return context.missed;}
    return this.random()<chance;
  }
  useAbility(source,action){
    if(source.engulfedBy||['silence','imprisonment','airborne','frozen'].some(kind=>has(source,kind,this.time)))return false;
    if(this._abilityMiss(source,source))return false;
    const previous=this.abilityContext;this.abilityContext={source,name:'ability',missed:false};
    try{action();return true;}finally{this.abilityContext=previous;}
  }
  _sourceFor(status){return this.units.find(u=>u.id===status.sourceId)||this.castles.find(u=>u.id===status.sourceId)||this.statusSources.get(status.sourceId)||null;}
  _validAction(side){return (side===0||side===1)&&!this.state.paused&&this.state.phase!=='ended';}
  deploy(side,handIndex,point){
    if(!this._validAction(side))return {ok:false,error:'The battle is paused or finished.'};
    const team=this.teams[side];
    if(!Number.isInteger(handIndex)||handIndex<0||handIndex>=team.hand.length)return {ok:false,error:'Select a card in your hand.'};
    const def=this.cardFor(side,team.hand[handIndex]);
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
    const ability=this.ability({def}),forms=(ability?.spawnForms||[]).map(i=>def.forms[i]).filter(Boolean);
    const companions=(ability?.spawnForms||[]).reduce((n,index)=>n+(def.forms[index]?Math.max(1,Math.floor(num(ability.spawnFormCounts?.[index],num(def.forms[index].stats.number,1)))):0),0);
    const count=ability?.spawnSchedule?1:Math.max(1,Math.floor(num(def.stats.number,1)))*(1+companions);
    const radius=Math.max(...[def,...forms].map(f=>.18+.07*(bodyMass[f.combat?.weight]||1)));
    const positions=[];
    const candidates=[{...point}];
    if(forms.length)for(const sign of [-1,1])candidates.push({x:point.x+(side===0?-1:1)*(radius*2+.1),y:point.y+sign*(radius+.1)});
    // Stable radial packing; every paid unit receives a legal in-range location.
    for(let ring=1;ring<=6;ring++)for(let k=0;k<ring*8;k++){
      const angle=k/(ring*8)*Math.PI*2;
      candidates.push({x:point.x+Math.cos(angle)*ring*(radius*2+.04),y:point.y+Math.sin(angle)*ring*(radius*2+.04)});
    }
    for(const candidate of candidates){
      if(!isDeployable(candidate,side,this.units.filter(u=>u.alive&&u.isBuilding)))continue;
      if(closestRoute(candidate).lane!==lane&&distance(point,candidate)>1)continue;
      if(positions.some(p=>distance(p,candidate)<radius*2+.02))continue;
      if(this.units.some(u=>u.alive&&!u.engulfedBy&&!u.possessingId&&!u.parasitizingId&&u.def.combat?.movementType===def.combat?.movementType&&distance(candidate,u)<radius+u.radius+.02))continue;
      positions.push(candidate);if(positions.length===count)return positions;
    }
    return null;
  }
  spawn(def,side,point,lane=closestRoute(point).lane,options={}){
    if(!def||!finitePoint(point)||(side!==0&&side!==1))return [];
    const count=Math.max(0,Math.floor(options.count??num(def.stats.number,1)));
    const groupId=options.groupId??`group-${++this.serial}`;
    const schedule=this.ability({def})?.spawnSchedule;
    if(schedule&&count>1&&!options.fromStream){
      const made=this.spawn(def,side,point,lane,{...options,count:1,groupId,fromStream:true,positions:options.positions?.slice(0,1)});
      if(made.length){
        const stream={id:`stream-${++this.serial}`,def,side,lane,point:{x:made[0].x,y:made[0].y},groupId,total:count,emitted:1,nextAt:this.time+schedule.initialGap,...schedule,positions:options.positions?.map(p=>({...p}))};
        this.state.spawnStreams.push(stream);made[0].memory.spawnStreamId=stream.id;made[0].memory.spawnTotal=count;
      }
      return made;
    }
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
        hp:def.combat?.healthless?1:num(stats.health),maxHp:def.combat?.healthless?1:num(stats.health),shield:num(stats.shield),maxShield:num(stats.shield),stats,healthless:!!def.combat?.healthless,
        alive:true,born:this.time,hits:0,shots:0,attacks:0,memory:{},statuses:[],groupId,targetId:null,
        cooldown:0,burstIndex:0,burstTargetId:null,sequenceIndex:0,route,waypoint:best.index,
        facingX:side?-1:1,facingY:0,damageWindow:[],dps:0,expiresAt:stats.life>0?this.time+stats.life:Infinity,
      };
      if(!(u.hp>0))continue;
      this.units.push(u);made.push(u);
      const decay=this.ability(u)?.lifeDecay;
      if(decay)u.lifeDecay={...decay,next:this.time+decay.interval};
      this._hook('spawn',u);
      this.fx('spawn',u.x,u.y,{side,duration:.6});
    }
    let slot=count;
    for(const parent of [...made]){
      const companions=this._spawnCompanions(parent,options.positions?.slice(slot));
      slot+=companions.length;made.push(...companions);
    }
    return made;
  }
  _spawnCompanions(parent,positions){
    const made=[],{def,side,lane,groupId}=parent;let slot=0;
    const ability=this.ability(parent);
    for(const index of ability?.spawnForms||[]){
      const form=def.forms[index];if(!form)continue;
      for(let j=0;j<Math.max(1,Math.floor(num(ability.spawnFormCounts?.[index],num(form.stats.number,1))));j++){
        const placement=positions?.[slot++],back=parent.radius+.18+.07*(bodyMass[form.combat?.weight]||1)+.1;
        const point=placement||{x:clamp(parent.x+(side===0?-back:back),.5,MAP.width-.5),y:clamp(parent.y+(j%2?1:-1)*.35,.5,MAP.height-.5)};
        made.push(...this.spawn(form,side,point,lane,{count:1,groupId,positions:placement?[placement]:undefined}));
      }
    }
    return made;
  }
  _spawnStreams(){
    for(const stream of this.state.spawnStreams){
      while(stream.emitted<stream.total&&stream.nextAt<=this.time+EPS){
        const position=stream.positions?.[stream.emitted];
        const made=this.spawn(stream.def,stream.side,stream.point,stream.lane,{count:1,groupId:stream.groupId,fromStream:true,positions:position?[position]:undefined});
        if(!made.length)break;
        made[0].memory.spawnStreamId=stream.id;made[0].memory.spawnTotal=stream.total;stream.emitted++;
        stream.nextAt+=stream.initialGap+(stream.emitted-1)*stream.gapStep;
      }
    }
    this.state.spawnStreams=this.state.spawnStreams.filter(stream=>stream.emitted<stream.total);
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
    const handled=new Set(['giga-bomb','spirit-of-the-wild','illustration-spell','laser','nightfall-curse','roots','lunar-mirrage','shock-bomb','shield-of-serenity','healing-light','dark-orb','reflector','guard-post','watchtower','obsidian-fortress','mana-surge','stagnantias-wrath']);
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
    const targets=this.units.filter(u=>u.alive&&!u.banished&&!u.possessingId&&!u.parasitizingId&&this._inside(u,point,shape));
    const enemies=targets.filter(u=>u.side!==side),allies=targets.filter(u=>u.side===side&&!u.isBuilding);
    const castles=this.castles.filter(u=>u.alive&&u.side!==side&&this._inside(u,point,shape));
    const visualRadius=shape.shape==='global'?12:shape.radius||Math.max(shape.width||0,shape.height||0)/2;
    this.fx('spell',point.x,point.y,{side,radius:visualRadius,shape,duration:.9,color:side?'#fb8c79':'#77ddff'});
    if((spell.kind||String(spell.raw.type).toLowerCase())==='building') {this._building(spell,side,point,id);return;}
    if(id==='giga-bomb'){
      for(const [targets,damage,amount] of [[enemies,num(raw.damageToCard),25],[castles,num(raw.damageToCastle),5]])for(const target of targets){
        this.damage(source,target,damage,{kind:'spell'});
        if(target.alive)this.status(target,'burn',10,0,source,{amount,stack:true});
      }
      return;
    }
    if(id==='healing-light'){
      for(const u of allies){this.cleanse(u);this.heal(u,u.maxHp*.3,source);}return;
    }
    if(id==='shield-of-serenity'){for(const u of allies)this.giveShield(u,u.maxShield*.2);return;}
    if(id==='illustration-spell'){
      for(const u of enemies.filter(u=>!u.isBuilding)){
        if(u.memory.conversion||u.possessedBy)continue;
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
    kind=statusKind(kind);
    if(target?.possessingId||target?.parasitizingId||kind==='conversion'&&target?.possessedBy)return null;
    if(target?.banished&&kind!=='cleanse')return null;
    // A successful killing blow can mark its victim before the death queue runs.
    if(!target?.alive&&!(target&&['soulMark','ink','curse'].includes(kind)&&extra.onLethalHit&&!target.memory?.deathResolved))return null;
    if(target.healthless&&NEGATIVE.has(kind))return null;
    if(extra.groundOnly&&target.def?.combat?.groundEffectImmune)return null;
    if(NEGATIVE.has(kind)&&has(target,'predominance',this.time))return null;
    const caster=source||(kind==='taunt'?target:null);
    if(caster&&!extra.scheduled&&this._abilityMiss(caster,target))return null;
    if(kind==='cleanse'){this.cleanse(target);return {kind};}
    if(kind==='knockback'){if(!source||!(magnitude>0))return null;this.push(target,source,magnitude);return {kind};}
    if(duration<=0)return null;
    if(kind==='predominance'){this.cleanse(target);if(target.possessedBy)this._penalizePossession(target);}
    const normalized=statusParameters(kind,magnitude,extra);if(!normalized)return null;
    magnitude=normalized.magnitude;extra=normalized.params;
    const actual=NEGATIVE.has(kind)&&Number.isFinite(duration)?duration*(1-clamp(this.statValue(target,'flexibility'),0,80)/100):duration;
    const sourceId=source?.id??null;
    if(sourceId)this.statusSources.set(sourceId,source);
    let entry=!extra.stack&&target.statuses.find(s=>s.kind===kind&&s.sourceId===sourceId&&s.until>this.time);
    if(entry){entry.until=Math.max(entry.until,this.time+actual);entry.magnitude=Math.max(entry.magnitude||0,magnitude);Object.assign(entry,extra);}
    else {entry={kind,until:this.time+actual,magnitude,sourceId,nextTick:this.time+extra.interval,...extra};target.statuses.push(entry);}
    if(kind==='taunt'){
      const radius=num(extra.radius,this.statValue(target,'range')/1000);
      for(const enemy of this.near(target,radius,u=>this.isEnemy(target,u)))this.status(enemy,'taunted',actual,0,target,{scheduled:true});
    }
    if(kind==='statReduction')this._capVitals(target);
    return entry;
  }
  _capVitals(u){
    u.effectiveMaxHp=this.maxHealth(u);u.effectiveMaxShield=this.maxShield(u);u.hp=Math.min(u.hp,u.effectiveMaxHp);u.shield=Math.min(u.shield,u.effectiveMaxShield);
    const pool=this._pool(u);if(pool)for(const member of this.units.filter(t=>pool.members.includes(t.id))){member.effectiveMaxHp=u.effectiveMaxHp;member.effectiveMaxShield=u.effectiveMaxShield;}
  }
  cleanse(target){
    target.statuses=target.statuses.filter(s=>!NEGATIVE.has(s.kind));
    for(const id of [...(target.parasiteIds||[])]){const source=this.units.find(t=>t.id===id);if(source)this.endParasite(source);}
    if(target.banished)this.returnBanished(target,false);
    if(target.engulfedBy)this.releaseEngulfed(target);
    if(target.memory.conversion)this._restoreConversion(target);
    this._capVitals(target);
  }
  banish(source,target,duration=10){
    if(!source?.alive||!target?.alive||target.banished||target.isCastle||target.isBuilding||!this._canHit(source,target))return false;
    const effect=this.status(target,'imprisonment',duration,0,source,{banish:true});if(!effect)return false;
    target.memory.banish={origin:{x:target.x,y:target.y},sourceId:source.id};target.banished=true;
    target.targetId=null;target.burstTargetId=null;target.burstIndex=0;target.moving=false;
    this.fx('portal',target.x,target.y,{side:source.side,color:'#b8a3ff',duration:.7});return true;
  }
  returnBanished(target,penalty=true){
    const memory=target.memory.banish;if(!target.banished||!memory)return;
    delete target.banished;delete target.memory.banish;
    target.statuses=target.statuses.filter(s=>!s.banish);
    if(!target.alive)return;
    let chosen=null,fallback=null;
    for(let i=0;i<120;i++){
      const lane=Math.floor(this.random()*MAP.routes.length),length=routeLength(MAP.routes[lane]);
      const point=pointOnRoute(lane,target.side,this.random()*length);
      if(distance(point,memory.origin)<=target.radius*2+.1||this.castles.some(c=>c.alive&&distance(c,point)<=c.radius+target.radius+.05))continue;
      if(this.units.some(u=>u!==target&&u.alive&&!u.banished&&!u.engulfedBy&&u.isBuilding&&distance(u,point)<u.radius+target.radius))continue;
      fallback||={...point,lane};
      if(this.units.some(u=>u!==target&&u.alive&&!u.banished&&!u.engulfedBy&&u.def.combat.movementType!=='flying'&&distance(u,point)<u.radius+target.radius))continue;
      chosen={...point,lane};break;
    }
    if(!chosen&&!fallback)for(let lane=0;lane<MAP.routes.length&&!fallback;lane++)for(const fraction of [.25,.5,.75]){
      const point=pointOnRoute(lane,target.side,routeLength(MAP.routes[lane])*fraction);
      if(distance(point,memory.origin)>target.radius*2+.1&&!this.units.some(u=>u!==target&&u.alive&&u.isBuilding&&distance(u,point)<u.radius+target.radius)){fallback={...point,lane};break;}
    }
    chosen||=fallback;
    Object.assign(target,chosen);target.route=routeFor(target.lane,target.side);this._resetWaypoint(target);
    target.targetId=null;target.burstTargetId=null;
    this.fx('portal',target.x,target.y,{side:target.side,color:'#b8a3ff',duration:.7});
    if(penalty){const source=this.units.find(u=>u.id===memory.sourceId)||this.statusSources.get(memory.sourceId)||null;
      this.damage(source,target,this.maxHealth(target)*.12,{kind:'ability',secondary:true,accuracyChecked:true});}
  }
  captivesOf(host){return this.units.filter(u=>u.alive&&u.engulfedBy===host.id);}
  engulf(host,target,{radius=host?.radius,vortex=false}={}){
    if(!host?.alive||host.engulfedBy||!target?.alive||target.engulfedBy||target.isCastle||target.isBuilding||!this._canHit(host,target))return false;
    if(distance(host,target)>radius+target.radius+EPS)return false;
    const status=this.status(target,'engulfed',Infinity,0,host);
    if(!status)return false;
    target.engulfedBy=host.id;target.targetId=null;target.burstTargetId=null;target.burstIndex=0;target.moving=false;
    target.memory.digestClock=0;if(vortex){
      const dx=target.x-host.x,dy=target.y-host.y;
      target.memory.vortexHeld=true;target.memory.vortexVector=dx||dy?{x:dx,y:dy}:{x:host.side===0?1:-1,y:0};
    }
    target.x=host.x;target.y=host.y;
    this.fx('engulf',host.x,host.y,{side:host.side,radius:host.radius+target.radius,color:vortex?'#b9dcff':undefined,duration:.55});
    return true;
  }
  releaseEngulfed(target){
    const host=this.units.find(u=>u.id===target.engulfedBy);
    delete target.engulfedBy;delete target.memory.digestClock;delete target.memory.vortexHeld;delete target.memory.vortexVector;
    target.statuses=target.statuses.filter(s=>s.kind!=='engulfed');
    if(!target.alive)return;
    if(host){
      // Return the survivor to the road beside its captor, never a forest tile.
      const buildings=this.castles.concat(this.units.filter(u=>u.isBuilding));
      let released=false;
      for(let ring=0;ring<8&&!released;ring++)for(let i=0;i<12;i++){
        const angle=i/12*Math.PI*2,radius=host.radius+target.radius+.05+ring*.25;
        const p={x:host.x+Math.cos(angle)*radius,y:host.y+Math.sin(angle)*radius};
        if(!finitePoint(p)||!isWalkable(p)||buildings.some(b=>b.alive&&distance(p,b)<target.radius+b.radius))continue;
        if(this.units.some(u=>u!==target&&u!==host&&u.alive&&!u.engulfedBy&&u.def.combat.movementType!=='flying'&&distance(p,u)<target.radius+u.radius))continue;
        Object.assign(target,p);released=true;break;
      }
      if(!released){const p=closestRoute(host);target.x=p.x;target.y=p.y;}
      this.fx('release',target.x,target.y,{side:target.side,radius:target.radius+.2,duration:.45});
    }
    target.targetId=null;target.burstTargetId=null;this._resetWaypoint(target);
  }
  _syncCaptives(){
    const byId=new Map(this.units.map(u=>[u.id,u]));
    for(const u of this.units){
      if(!u.alive||!u.engulfedBy)continue;
      const host=byId.get(u.engulfedBy);
      if(!host?.alive||!has(u,'engulfed',this.time)){this.releaseEngulfed(u);continue;}
      let position=host;
      const visited=new Set([u.id]);
      while(position.engulfedBy&&!visited.has(position.id)){
        visited.add(position.id);const parent=byId.get(position.engulfedBy);if(!parent?.alive)break;position=parent;
      }
      u.x=position.x;u.y=position.y;u.moving=false;
    }
  }
  _lifeDecay(u){
    const decay=u.lifeDecay;if(!decay)return;
    while(u.alive&&decay.next<=Math.min(this.time,u.expiresAt)+EPS){
      // Ageing is health loss, independent of shields and combat immunities.
      const amount=this.maxHealth(u)*decay.fraction;u.hp=Math.max(0,u.hp-amount);decay.next+=decay.interval;
      this.fx('hit',u.x,u.y,{amount,side:u.side,color:'#b5df78'});
      if(u.hp<=EPS)this.killUnit(u);
    }
  }
  _restoreConversion(u){
    const originalSide=u.memory.conversion.side;delete u.memory.conversion;
    if(u.possessedBy){const controller=this.units.find(t=>t.id===u.possessedBy);if(controller?.whisperState){controller.whisperState.originalSide=originalSide;return;}}
    u.side=originalSide;u.targetId=null;u.burstTargetId=null;
    u.route=routeFor(u.lane,u.side);this._resetWaypoint(u);
  }
  heal(target,amount,source=null,options={}){
    if(!target?.alive||target.healthless||target.banished||target.possessingId||target.parasitizingId||amount<=0||has(target,'bleed',this.time)||has(target,'healBlock',this.time)||has(target,'suppression',this.time))return 0;
    if(source&&!options.passive&&this._abilityMiss(source,target))return 0;
    const burn=has(target,'burn',this.time)?.8:1;
    const value=Math.min(this.maxHealth(target)-target.hp,amount*(1+this.statValue(target,'healBonus')/100)*burn);
    if(value<=0)return 0;
    target.hp+=value;this.fx('heal',target.x,target.y,{amount:value,side:target.side});return value;
  }
  loseHealth(target,amount){
    if(!target?.alive||target.healthless||target.possessingId||target.parasitizingId||!Number.isFinite(amount)||amount<=0)return 0;
    // Health costs bypass shields and damage modifiers, without triggering a hit.
    const before=target.hp;target.hp=Math.max(this._healthFloor(target),target.hp-amount);
    const lost=Math.max(0,before-target.hp);
    if(lost)this.fx('hit',target.x,target.y,{amount:lost,side:target.side,color:'#d07b88'});
    if(target.hp<=0)this.killUnit(target);
    return lost;
  }
  giveShield(target,amount,source=this.abilityContext?.source||null){
    if(!target?.alive||target.healthless||target.banished||target.possessingId||target.parasitizingId||amount<=0||has(target,'suppression',this.time))return 0;
    if(source&&this._abilityMiss(source,target))return 0;
    const {flat,factor}=statModifiers(target,'shield',this.time);if(factor<=0)return 0;
    const value=amount;target.maxShield=Math.max(target.maxShield,(target.shield+value)/factor+flat);target.shield+=value;
    this.fx('shield',target.x,target.y,{amount:value,side:target.side});return value;
  }
  convert(source,target,duration){
    if(!source?.alive||!target?.alive||target.isCastle||target.isBuilding||target.healthless||target.possessedBy||target.memory.conversion||!this.isEnemy(source,target))return false;
    const entry=this.status(target,'conversion',duration,1,source,{originalSide:target.side});if(!entry)return false;
    target.memory.conversion={side:target.side,until:entry.until};this._possessionSide(target,source.side);
    this.fx('capture',target.x,target.y,{side:source.side,duration:.8});return true;
  }
  retreat(u,tiles){
    let walked=0,best={distance:Infinity,walked:0};
    for(let i=1;i<u.route.length;i++){const a=u.route[i-1],b=u.route[i],length=distance(a,b),p=projectSegment(u,a,b);if(p.distance<best.distance)best={distance:p.distance,walked:walked+p.t*length};walked+=length;}
    const before={x:u.x,y:u.y},point=pointOnRoute(u.lane,u.side,Math.max(this.castles[u.side].radius+u.radius+.03,best.walked-tiles));
    Object.assign(u,point);this._resetWaypoint(u);this.fx('portal',before.x,before.y,{side:u.side,color:'#bdafef'});this.fx('leap',u.x,u.y,{side:u.side});
  }
  _burstBoost(u){return !has(u,'silence',this.time)&&this.ability(u)?.burstBoost&&(u.memory.burstBoost?.active||u.memory.burstBoost?.queued)?this.ability(u).burstBoost:null;}
  _cancelBurstBoost(u){if(u.memory.burstBoost)u.memory.burstBoost.active=false;}
  damage(source,target,amount,options={}){
    const empty={healthDamage:0,shieldDamage:0,total:0,killed:false};
    if(!target?.alive||target.healthless||target.banished||target.possessingId||target.parasitizingId||!(amount>0)||this.damageDepth>16)return empty;
    if(source?.possessingId||source?.parasitizingId&&!(options.parasiteDamage&&target.id===source.parasitizingId))return empty;
    if(source?.memory?.vortexHeld)return empty;
    if(source&&!options.persistentField&&(source.engulfedBy||has(source,'imprisonment',this.time)||has(source,'airborne',this.time)))return empty;
    if(target.engulfedBy&&source?.id!==target.engulfedBy)return empty;
    if(has(target,'imprisonment',this.time)||has(target,'untouchable',this.time)||has(target,'untargetable',this.time))return empty;
    const hit={damage:amount,kind:'attack',bypassShield:false,critical:false,secondary:false,...options};
    if(source&&!(options.fieldSide!=null?target.side!==options.fieldSide:this.isEnemy(source,target))&&!options.friendlyFire)return empty;
    if(hit.kind==='ability'&&!hit.accuracyChecked&&source&&this._abilityMiss(source,target)){this.fx('miss',target.x,target.y,{side:source.side});return empty;}
    if(hit.kind==='attack'&&!hit.secondary&&this.random()<clamp(this.statValue(target,'dodge'),0,70)/100){this.fx('miss',target.x,target.y,{side:target.side});return empty;}
    this.damageDepth++;
    if(source&&this.ability(source)?.cannotCrit)hit.critical=false;
    if(source&&hit.kind==='attack'&&hit.critical&&this.ability(source)?.criticalPiercesShield&&!has(source,'silence',this.time))hit.bypassShield=true;
    this._hook('incoming',target,source,hit);
    if(hit.instantKill&&!target.isCastle&&!target.isBuilding){hit.damage=target.hp+target.shield+1;hit.bypassShield=true;hit.kind='execution';}
    if(hit.critical){
      const multiplier=Math.max(1,hit.criticalMultiplier??this.statValue(source,'criticDamage',1.5));
      hit.damage*=1+(multiplier-1)*(1-clamp(this.statValue(target,'criticdamageminimiser'),0,90)/100);
    }
    let reduction=clamp(this.statValue(target,'damageminimiser')/100,0,.9);
    let fearless=0;
    for(const buff of active(target,'fearless',this.time)){
      const radius=num(buff.radius,this.statValue(target,'range')/1000);
      const nearby=this.near(target,radius,u=>u!==target);
      if(!nearby.some(u=>u.side===target.side)||nearby.filter(u=>u.side!==target.side).length>5)fearless=Math.max(fearless,clamp(buff.magnitude,0,.9));
    }
    const protection=strongest(target,'protection',this.time)||strongest(target,'defense',this.time);
    const spellProtection=hit.kind==='spell'?strongest(target,'spellProtection',this.time):0;
    if(hit.kind!=='execution')hit.damage*=Math.max(0,(1-reduction)*(1-protection)*(1-spellProtection)*(1-fearless));
    hit.damage*=1+strongest(target,'curse',this.time);
    if(!Number.isFinite(hit.damage)||hit.damage<=0){this.damageDepth--;return empty;}
    const beforeHp=target.hp,beforeShield=target.shield;
    let healthPart=hit.damage;
    if(target.shield>0&&!hit.bypassShield){
      const fraction=clamp(this.statValue(target,'shieldtakendamage',70)/100,0,1),multiplier=Math.max(.01,hit.shieldMultiplier??1);
      const absorbedRaw=Math.min(hit.damage*fraction,target.shield/multiplier);
      target.shield=Math.max(0,target.shield-absorbedRaw*multiplier);healthPart-=absorbedRaw;
      if(target.shield<EPS)target.shield=0;
    }
    target.hp=Math.max(this._healthFloor(target),target.hp-healthPart);
    const result={healthDamage:Math.max(0,beforeHp-target.hp),shieldDamage:Math.max(0,beforeShield-target.shield),total:0,killed:target.hp<=0};
    result.total=result.healthDamage+result.shieldDamage;
    if(result.total>0){
      target.statuses=target.statuses.filter(s=>s.kind!=='invisible');
      target.memory.lastDamageReceived=this.time;
      this.fx('hit',target.x,target.y,{amount:result.total,side:target.side,critical:hit.critical,color:hit.kind==='dot'?'#b9db72':undefined});
      if(source&&!source.isSpell){
        source.damageWindow??=[];source.damageWindow.push({time:this.time,damage:result.total});
        (source.memory??={}).lastDamageDealt=this.time;
        // Ending a conditional stealth state is structural, including while silenced.
        if(this.ability(source)?.breakStealthOnDamage)source.statuses=source.statuses.filter(s=>s.kind!=='invisible');
      }
      this._hook('damaged',target,source,result,hit);
      if(source?.alive&&source!==target&&!hit.reflected&&has(target,'reflection',this.time))this.damage(target,source,result.total,{kind:'reflect',secondary:true,reflected:true,friendlyFire:true});
      else if(target.buildingKind==='reflector'&&source?.alive&&!hit.secondary)this.damage(target,source,result.total*(source.isCastle?.4:.6),{kind:'reflect',secondary:true,reflected:true});
    }
    if(target.hp<=0&&target.alive)this.killUnit(target,source,{deathBlast:hit.deathBlast});
    // Native form changes can survive an otherwise lethal packet.
    result.killed=!target.alive||target.hp<=0;
    this.damageDepth--;
    return result;
  }
  push(target,awayFrom,tiles,origin=target){
    if(!target?.alive||target.healthless||target.engulfedBy||target.possessingId||target.parasitizingId||target.isCastle||target.isBuilding||tiles<=0||has(target,'predominance',this.time))return;
    let dx=origin.x-awayFrom.x,dy=origin.y-awayFrom.y,len=Math.hypot(dx,dy);
    if(!len){dx=target.side?-1:1;dy=0;len=1;}
    const p={x:clamp(origin.x+dx/len*tiles,.5,MAP.width-.5),y:clamp(origin.y+dy/len*tiles,.5,MAP.height-.5)};
    if(target.def.combat.movementType!=='flying'){const q=closestRoute(p);target.x=q.x;target.y=q.y;}else Object.assign(target,p);
    this._resetWaypoint(target);
  }
  _resetWaypoint(u){
    let best={distance:Infinity,index:1};
    for(let i=1;i<u.route.length;i++){const q=projectSegment(u,u.route[i-1],u.route[i]);if(q.distance<best.distance)best={...q,index:i};}
    u.waypoint=best.index;
  }
  _canHit(u,target,layers=u.def?.combat?.targets||'both'){
    if(u.possessingId||u.parasitizingId)return false;
    if(!target?.alive||target.def?.combat?.untargetable||target.banished||target.possessingId||target.parasitizingId||!this.isEnemy(u,target))return false;
    if(target.engulfedBy&&!(target.engulfedBy===u.id&&this.ability(u)?.captiveTarget))return false;
    if(has(target,'untargetable',this.time)||has(target,'imprisonment',this.time))return false;
    if(layers==='none')return false;
    const air=target.def?.combat?.movementType==='flying';
    return layers==='both'||(layers==='air'?air:!air);
  }
  _legalTarget(u,target,sources=null,layers){return this._canHit(u,target,layers)&&(target.engulfedBy===u.id&&this.ability(u)?.captiveTarget||isEntityVisible(this.state,u.side,target,sources));}
  canTarget(u,target){return this._legalTarget(u,target);}
  canSee(u,target){return isEntityVisible(this.state,u.side,target);}
  tauntTarget(u,sources=null){
    if(has(u,'predominance',this.time))return null;
    const targets=active(u,'taunted',this.time).map(s=>this._sourceFor(s)).filter(target=>this._legalTarget(u,target,sources));
    targets.sort((a,b)=>distance(u,a)-distance(u,b)||a.id.localeCompare(b.id));
    return targets[0]||null;
  }
  _range(u){
    const blind=strongest(u,'blind',this.time);
    const attack=u.def?this._attackDefinition(u):{},modeRange=u.def?.attack?.modes?Math.max(...u.def.attack.modes.map(m=>m.range)):attack.range;
    const range=(modeRange!=null?statValue(u,'range',this.time,modeRange):this.statValue(u,'range'))/1000*(1-blind)*(this._burstBoost(u)?.range||1);
    const authored=u.def?.raw?.additionalStats?.vision;
    const vision=this.statValue(u,'vision')/1000*(1-blind);
    return authored!=null&&!/^[-—–]$/.test(String(authored).trim())?Math.min(range,vision):range;
  }
  _target(u){
    const sources=visibilitySources(this.state,u.side);
    const taunter=this.tauntTarget(u,sources);
    if(taunter){if(u.burstTargetId&&u.burstTargetId!==taunter.id){u.burstTargetId=null;u.burstIndex=0;this._cancelBurstBoost(u);}return taunter;}
    if(u.burstTargetId){const locked=this.units.concat(this.castles).find(t=>t.id===u.burstTargetId);if(this._legalTarget(u,locked,sources))return locked;
      if(u.burstIndex>0&&u.def.attack?.sequence?.length)u.sequenceIndex++;
      u.burstTargetId=null;u.burstIndex=0;this._cancelBurstBoost(u);u.cooldown=Math.max(u.cooldown,u.def.attack?.delay||0);}
    const prioritized=this._hook('target',u);
    if(prioritized&&this._legalTarget(u,prioritized,sources))return prioritized;
    if(this.ability(u)?.exclusiveTarget)return null;
    const reach=this._range(u);
    const candidates=this.units.filter(t=>this._legalTarget(u,t,sources)&&distance(u,t)<=reach+t.radius);
    candidates.sort((a,b)=>distance(u,a)-distance(u,b)||a.id.localeCompare(b.id));
    if(candidates.length)return candidates[0];
    return this.castles.find(t=>this._legalTarget(u,t,sources)&&distance(u,t)<=reach+t.radius)||null;
  }
  _profile(u){
    let p={...u.def.combat,...u.def.attack?.modes?.[u.memory.combatMode??1]?.combat,...u.attackMode?.combat};
    const sequence=p.attackSequence;
    if(sequence?.length)p={...p,...sequence[u.sequenceIndex%sequence.length]};
    // Conditional death/periodic splash is resolved by the native handler only.
    if(p.multiTargetCondition&&!sequence){p.multiTarget=false;p.maxTargets=1;p.attackShape='single';}
    p.attackWidth*=this._burstBoost(u)?.width||1;
    return p;
  }
  _attackDefinition(u){
    const base=u.def.attack||{count:1,damage:num(u.stats.damage),interval:num(u.stats.attackSpeed),delay:num(u.stats.delay)};
    if(u.attackMode)return {...base,...u.attackMode.attack};
    if(base.modes)return {...base,...base.modes[u.memory.combatMode??1]};
    const step=base.sequence?.[u.sequenceIndex%base.sequence.length];
    return step?{...base,...step}:{...base};
  }
  _reach(u,p=this._profile(u)){return Math.max(0,num(p.attackDistance)/1000);}
  _attackReach(u,p=this._profile(u)){
    if(this.ability(u)?.contactAttack)return u.radius;
    // A ranged unit fires from its acquisition Range, rather than walking into
    // contact because its source projectile profile has a short travel value.
    return p.attackType==='ranged'?this._range(u):this._reach(u,p);
  }
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
    if(u.isBuilding||u.possessingId||u.parasitizingId||['root','stun','imprisonment','airborne','frozen'].some(kind=>has(u,kind,this.time)))return;
    const movement=u.def.combat?.movementType;
    let destination;
    if(target)destination=target;
    else if(u.memory.followId){const parent=this.units.find(t=>t.alive&&t.id===u.memory.followId);if(parent){if(distance(u,parent)<.85)return;destination=parent;}}
    if(movement==='flying'){
      if(target)u.memory.pursuing=true;
      else if(u.memory.pursuing){this._resetWaypoint(u);delete u.memory.pursuing;}
    }
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
    let slow=Math.max(strongest(u,'slow',this.time),strongest(u,'movementSlow',this.time),strongest(u,'ink',this.time));if(has(u,'poison',this.time))slow=Math.max(slow,.1);
    let speed=this.statValue(u,'speed')/1000*(1+strongest(u,'speedBonus',this.time))*(1-clamp(slow,0,.95));
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
    const from={x:u.x,y:u.y};
    u.x=clamp(p.x,.5,MAP.width-.5);u.y=clamp(p.y,.5,MAP.height-.5);
    u.memory.distance=(u.memory.distance||0)+travelled*1000;
    u.memory.movedTime=(u.memory.movedTime||0)+dt;
    u.moving=travelled>0;
    if(distance(from,u)>EPS)this._hook('move',u,from,{x:u.x,y:u.y},dt);
  }
  leaveTrail(u,from,to,{width,duration,damage,interval}){
    if(distance(from,to)<=EPS||!(width>0&&duration>0&&interval>0))return;
    const side=has(u,'betrayal',this.time)?1-u.side:u.side;
    let trail=this.state.trails.find(t=>t.sourceId===u.id&&t.side===side);
    if(!trail){
      trail={id:`trail-${++this.serial}`,source:u,sourceId:u.id,side,width,damage,interval,segments:[],exposure:{}};
      this.state.trails.push(trail);u.memory.magmaTrailId=trail.id;
    }
    trail.segments.push({from:{...from},to:{...to},born:this.time,until:this.time+duration});
  }
  _trails(dt){
    for(const trail of this.state.trails){
      const segments=trail.segments.filter(s=>s.until+EPS>=this.time),exposure={};
      for(const target of this.units){
        if(!target.alive||target.id===trail.sourceId||target.banished||target.engulfedBy||target.possessingId||target.parasitizingId||target.isBuilding||target.healthless||target.side===trail.side||target.def.combat.movementType!=='ground'||target.def.combat.groundEffectImmune)continue;
        if(!segments.some(s=>projectSegment(target,s.from,s.to).distance<=trail.width/2+target.radius+EPS))continue;
        let clock=(trail.exposure[target.id]||0)+dt;
        while(target.alive&&clock+EPS>=trail.interval){
          clock=Math.max(0,clock-trail.interval);
          this.damage(trail.source,target,trail.damage,{kind:'dot',secondary:true,accuracyChecked:true,persistentField:true,fieldSide:trail.side});
        }
        if(target.alive)exposure[target.id]=clock;
      }
      trail.exposure=exposure;trail.segments=segments.filter(s=>s.until>this.time+EPS);
    }
    this.state.trails=this.state.trails.filter(t=>t.segments.length);
  }
  _targetsFor(u,target,p){
    if(!p.multiTarget)return [target];
    const reach=this._attackReach(u,p),width=num(p.attackWidth)/1000;
    const dx=target.x-u.x,dy=target.y-u.y,len=Math.hypot(dx,dy)||1;
    const angle=(num(p.attackAngle)||2*Math.atan(width/(2*Math.max(reach,.01)))*180/Math.PI)*Math.PI/180;
    // Picking separate targets requires sight; a cone, splash or swept area can
    // still strike an unseen enemy without granting information to its caster.
    const sources=p.attackShape==='multi'?visibilitySources(this.state,u.side):null;
    let victims=this.units.concat(this.castles).filter(t=>p.attackShape==='multi'?this._legalTarget(u,t,sources):this._canHit(u,t));
    victims=victims.filter(t=>{
      const x=t.x-u.x,y=t.y-u.y,dist=Math.hypot(x,y);
      if(p.attackShape==='square'){
        if(p.areaOrigin){
          const area=this._strikeArea(u,target,p),ax=t.x-area.x,ay=t.y-area.y;
          return Math.abs(ax*area.dx+ay*area.dy)<=area.width/2+t.radius+EPS&&Math.abs(-ax*area.dy+ay*area.dx)<=area.height/2+t.radius+EPS;
        }
        const nums=String(p.impactSize||'').match(/[\d.]+/g)?.map(Number)||[width,width];
        return Math.abs(t.x-target.x)<=nums[0]/2+t.radius&&Math.abs(t.y-target.y)<=(nums[1]??nums[0])/2+t.radius;
      }
      if(dist>reach+t.radius+EPS)return false;
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
  _strikeArea(u,target,p){
    const [width=1,height=width]=String(p.impactSize||'').match(/[\d.]+/g)?.map(Number)||[];
    const length=distance(u,target),dx=length>EPS?(target.x-u.x)/length:(u.facingX??1),dy=length>EPS?(target.y-u.y)/length:(u.facingY??0);
    const center=p.areaOrigin==='front'?{x:u.x+dx*height/2,y:u.y+dy*height/2}:target;
    return {x:center.x,y:center.y,width:height,height:width,dx,dy,angle:Math.atan2(dy,dx)};
  }
  _fire(u,target){
    if(u.memory.returningShotId||this.ability(u)?.noBasicAttack)return;
    this.prepareWeapon(u,target);
    const booster=this.ability(u)?.burstBoost;
    if(booster&&u.burstIndex===0){const state=u.memory.burstBoost||={queued:false,active:false};state.active=state.queued;state.queued=false;}
    const attack=this._attackDefinition(u),profile=this._profile(u),mode=u.attackMode;
    if(!(attack.damage>0))return;
    const index=u.burstIndex;
    u.shots++;u.memory.lastAttack=this.time;
    const hit={damage:mode||attack.sequence||attack.modes?statValue(u,'damage',this.time,attack.damage):this.statValue(u,'damage',attack.damage),kind:'attack',bypassShield:false,critical:false,secondary:false,burstIndex:index,sequenceIndex:u.sequenceIndex,combat:profile};
    hit.damage*=this._burstBoost(u)?.damage||1;
    hit.burstBoosted=!!this._burstBoost(u);
    // Per-mode damage is authored independently of the base per-hit statistic.
    const missed=this.random()<strongest(u,'misfortune',this.time);
    if(!missed)this._hook('attack',u,target,hit);
    if(hit.targetId){const selected=this.units.find(t=>t.id===hit.targetId);if(this._legalTarget(u,selected)&&distance(u,selected)<=this._attackReach(u,profile)+selected.radius)target=selected;}
    hit.damage*=1+strongest(u,'damageBonus',this.time);
    hit.critical=!this.ability(u)?.cannotCrit&&(hit.critical||(!has(u,'suppression',this.time)&&this.random()<clamp(this.statValue(u,'criticalChance'),0,100)/100));
    const p={...profile,...hit.combat};
    if(!missed){
      if(p.attackType==='ranged'&&!p.instantArea){
        const targets=p.attackShape==='multi'&&p.multiTarget?this._targetsFor(u,target,p):[target];
        for(const t of targets)this._projectile(u,t,hit,p);
      }else{
        const victims=this._targetsFor(u,target,p);
        for(const t of victims)this._resolveHit(u,t,hit);
        if(p.areaOrigin){const area=this._strikeArea(u,target,p);this.fx('blastArea',area.x,area.y,{...area,side:u.side,color:'#ffc5a2',duration:.6});}
        else this.fx(p.instantArea?'wave':'slash',u.x,u.y,{side:u.side,radius:this._reach(u,p),angle:p.attackAngle||0,dx:target.x-u.x,dy:target.y-u.y,duration:p.instantArea?.5:.24});
      }
    }else this.fx('miss',target.x,target.y,{side:u.side});
    const interval=Math.max(.01,this.attackInterval(u,hit.haste||0)*num(hit.intervalScale,1));
    const returning=hit.returning&&this.state.projectiles.find(shot=>shot.id===u.memory.returningShotId);
    if(returning)returning.recovery=interval;
    u.burstIndex++;
    if(u.burstIndex>=Math.max(1,attack.count)){
      u.burstIndex=0;u.burstTargetId=null;u.sequenceIndex++;u.attacks++;
      if(booster){this._cancelBurstBoost(u);if(!has(u,'silence',this.time)&&this.random()<booster.chance)this.useAbility(u,()=>{u.memory.burstBoost.queued=true;});}
      // Returning weapons can count recovery from launch or from the catch.
      u.cooldown=Math.max(.01,interval+(returning?0:statValue(u,'delay',this.time,num(attack.delay))));
      const releaseDistance=this.ability(u)?.releaseCaptivesAfterBurst;
      if(releaseDistance)for(const captive of this.captivesOf(u)){
        const vector=captive.memory.vortexVector||{x:u.side===0?1:-1,y:0};
        this.releaseEngulfed(captive);
        if(!has(u,'silence',this.time)&&!has(u,'imprisonment',this.time))this.push(captive,{x:u.x-vector.x,y:u.y-vector.y},releaseDistance,u);
      }
    }else{u.burstTargetId=target.id;u.cooldown=interval;}
    if(mode){
      mode.remaining--;u.memory.wongShots=(u.memory.wongShots||0)+1;
      if(mode.remaining<=0){
        delete u.attackMode;u.burstIndex=0;u.burstTargetId=null;
        u.cooldown=this.attackInterval(u)+this.statValue(u,'delay');
      }
    }
  }
  attackInterval(u,extraHaste=0){
    const attack=this._attackDefinition(u),haste=strongest(u,'attackHaste',this.time)+extraHaste,slow=Math.max(strongest(u,'slow',this.time),strongest(u,'ink',this.time));
    const base=u.attackMode||u.def.attack?.sequence||u.def.attack?.modes?statValue(u,'attackSpeed',this.time,attack.interval):this.statValue(u,'attackSpeed',attack.interval);
    return Math.max(.01,base/(1+haste)/(1-clamp(slow,0,.95)));
  }
  _projectile(u,target,hit,profile){
    let dx=target.x-u.x,dy=target.y-u.y,len=Math.hypot(dx,dy)||1;
    const remaining=profile.attackType==='ranged'?Math.max(this._reach(u,profile),this._attackReach(u,profile)):this._reach(u,profile);
    const shot={id:`shot-${++this.serial}`,x:u.x,y:u.y,prevX:u.x,prevY:u.y,dx:dx/len,dy:dy/len,remaining,width:num(profile.attackWidth)/1000,side:u.side,sourceId:u.id,source:u,targetId:target.id,hit:{...hit},profile:{...profile},hitIds:new Set(),kind:'bolt',color:u.side?'#ffb286':'#9feaff',
      homing:!!u.isCastle,origin:{x:u.x,y:u.y},range:remaining,ttl:2*remaining/RULES.projectileSpeed+RULES.fixedStep};
    if(hit.projectileKind)shot.kind=hit.projectileKind;
    if(hit.projectileColor)shot.color=hit.projectileColor;
    if(hit.returning){
      shot.returning='outbound';shot.remaining=Math.min(remaining,Math.hypot(dx,dy));
      shot.ttl=4*remaining/RULES.projectileSpeed+2;u.memory.returningShotId=shot.id;
    }
    this.state.projectiles.push(shot);
    return shot;
  }
  abilityProjectile(source,target,damage,{range,kind='orb',color='#c5a7ff',impactSize=null,deathBlast=null,cardOnly=false}={}){
    if(!source?.alive||!this._legalTarget(source,target)||this._abilityMiss(source,target))return false;
    const reach=Math.max(0,num(range))+(target.radius||0);
    if(distance(source,target)>reach+EPS)return false;
    const profile={attackType:'ranged',attackWidth:500,attackDistance:reach*1000,attackShape:impactSize?'square':'single',multiTarget:!!impactSize,maxTargets:impactSize?null:1,impactSize,cardOnly};
    const shot=this._projectile(source,target,{damage,kind:'ability',secondary:true,critical:false,accuracyChecked:true,deathBlast},profile);
    shot.homing=true;shot.ability=true;shot.kind=kind;shot.color=color;
    return true;
  }
  _catchProjectile(shot){
    shot.done=true;
    if(shot.source.memory.returningShotId!==shot.id)return;
    delete shot.source.memory.returningShotId;
    if(shot.source.alive)shot.source.cooldown=Math.max(.01,shot.hit.recoveryFromLaunch?shot.source.cooldown:shot.recovery||.01);
  }
  reflectProjectile(defender,shot){
    if(shot.done||shot.hit.reflected||!shot.source)return false;
    const attacker=shot.source,range=distance(defender,attacker)+(attacker.radius||.25)+.35;
    const hit={...shot.hit,reflected:true,accuracyChecked:true,returning:false,criticalMultiplier:shot.hit.criticalMultiplier??this.statValue(attacker,'criticDamage',1.5)};
    const reflected=this._projectile(defender,attacker,hit,{...shot.profile,attackType:'ranged',attackDistance:range*1000});
    reflected.homing=true;reflected.reflected=true;reflected.ability=shot.ability;reflected.kind=shot.kind;reflected.color='#a8f0dd';
    if(shot.returning)reflected.returningOriginal=shot;
    shot.done=true;defender.memory.reflectedShots=(defender.memory.reflectedShots||0)+1;
    this.fx('shield',defender.x,defender.y,{side:defender.side,color:'#a8f0dd',duration:.4});
    return true;
  }
  _resolveHit(source,target,hit){
    if(!target.alive)return;
    const amount=hit.damage*(hit.splashScale!=null&&target.id!==hit.primaryTargetId?hit.splashScale:1);
    const result=this.damage(source,target,amount,{...hit,damage:amount});
    if(result.total<=0)return;
    source.hits=(source.hits||0)+1;
    this._hook('hit',source,target,result,hit);
    if(result.healthDamage>0&&source.alive&&!source.isCastle&&!source.isBuilding&&!has(source,'suppression',this.time)&&this.random()<clamp(this.statValue(source,'lifestealChance'),0,100)/100){
      const healed=this.heal(source,result.healthDamage*clamp(this.statValue(source,'lifesteal'),0,100)/100,source);
      if(healed>0)this._hook('lifesteal',source,healed);
    }
  }
  _projectiles(dt){
    for(const shot of this.state.projectiles){
      if(shot.done)continue;
      shot.prevX=shot.x;shot.prevY=shot.y;
      let candidates;
      if(shot.returning){
        shot.ttl-=dt;
        if(!shot.source.alive||shot.ttl<=0){this._catchProjectile(shot);continue;}
      }
      if(shot.returning==='return'){
        const dx=shot.source.x-shot.x,dy=shot.source.y-shot.y,len=Math.hypot(dx,dy);
        shot.dx=dx/(len||1);shot.dy=dy/(len||1);
        const step=Math.min(len,RULES.projectileSpeed*dt);
        shot.x+=shot.dx*step;shot.y+=shot.dy*step;shot.remaining=Math.max(0,len-step);
        candidates=this.units.concat(this.castles);
      }else if(shot.homing){
        const target=this.units.concat(this.castles).find(t=>t.id===shot.targetId);
        if(!this._legalTarget(shot.source,target,null,shot.reflected?'both':undefined)||distance(shot.origin,target)>shot.range+EPS||shot.ttl<=0){shot.done=true;continue;}
        const dx=target.x-shot.x,dy=target.y-shot.y,len=Math.hypot(dx,dy)||1;
        shot.dx=dx/len;shot.dy=dy/len;
        const step=Math.min(len,RULES.projectileSpeed*Math.min(dt,shot.ttl));
        shot.x+=shot.dx*step;shot.y+=shot.dy*step;shot.ttl-=dt;
        // Castle range is a radial boundary; a tracking arc may be longer.
        shot.remaining=Math.max(0,shot.range-distance(shot.origin,shot));
        candidates=[target];
      }else{
        const step=Math.min(shot.remaining,RULES.projectileSpeed*dt);
        shot.x+=shot.dx*step;shot.y+=shot.dy*step;shot.remaining-=step;
        candidates=this.units.concat(this.castles);
      }
      const limit=shot.profile.multiTarget?shot.profile.maxTargets:1;
      const targets=candidates.filter(t=>{
        if(shot.returning&&limit!=null&&shot.hitIds.size>=limit)return false;
        if(!this._canHit(shot.source,t,shot.reflected?'both':undefined)||shot.hitIds.has(t.id))return false;
        let halfWidth=shot.width/2;
        if(shot.profile.attackShape==='cone'){
          const along=(t.x-shot.origin.x)*shot.dx+(t.y-shot.origin.y)*shot.dy;
          const angle=num(shot.profile.attackAngle,2*Math.atan(shot.width/(2*Math.max(.01,this._reach(shot.source,shot.profile))))*180/Math.PI)*Math.PI/180;
          halfWidth=Math.min(halfWidth,Math.max(0,along)*Math.tan(angle/2));
        }
        return projectSegment(t,{x:shot.prevX,y:shot.prevY},shot).distance<=t.radius+halfWidth;
      });
      targets.sort((a,b)=>distance({x:shot.prevX,y:shot.prevY},a)-distance({x:shot.prevX,y:shot.prevY},b));
      for(const target of targets){
        if(this._hook('intercept',target,shot))break;
        if(shot.profile.projectileEndEffect==='explode'||shot.profile.multiTarget&&['square','circle'].includes(shot.profile.attackShape)){
          this._explodeProjectile(shot,target);shot.done=true;break;
        }
        shot.hitIds.add(target.id);
        if(shot.ability)this.damage(shot.source,target,shot.hit.damage,shot.hit);
        else this._resolveHit(shot.source,target,shot.hit);
        if(limit!=null&&shot.hitIds.size>=limit){if(!shot.returning)shot.done=true;break;}
      }
      if(shot.done)continue;
      if(shot.returning&&shot.remaining<=EPS){
        if(shot.returning==='outbound'){
          shot.returning='return';shot.hitIds.clear();shot.remaining=distance(shot,shot.source);
          this.fx('wave',shot.x,shot.y,{side:shot.side,radius:.25,duration:.2});
        }else this._catchProjectile(shot);
      }else if(shot.remaining<=EPS||shot.homing&&shot.ttl<=0){if(!shot.done&&shot.profile.projectileEndEffect==='explode')this._explodeProjectile(shot,shot);shot.done=true;}
    }
    for(const shot of this.state.projectiles)if(shot.done&&shot.returningOriginal)this._catchProjectile(shot.returningOriginal);
    this.state.projectiles=this.state.projectiles.filter(s=>!s.done);
  }
  _explodeProjectile(shot,point){
    const dimensions=String(shot.profile.impactSize||'').match(/[\d.]+/g)?.map(Number);
    const width=dimensions?.[0]??shot.width,height=dimensions?.[1]??width;
    const shape={shape:'rect',width,height};
    const targets=this.units.concat(this.castles).filter(t=>this._canHit(shot.source,t,shot.reflected?'both':undefined)&&(!shot.profile.cardOnly||!t.isBuilding&&!t.isCastle)&&this._inside(t,point,shape));
    const limit=shot.profile.multiTarget?shot.profile.maxTargets:1;
    for(const t of targets.slice(0,limit??targets.length)){
      if(shot.ability)this.damage(shot.source,t,shot.hit.damage,shot.hit);else this._resolveHit(shot.source,t,shot.hit);
    }
    this.fx('explosion',point.x,point.y,{side:shot.side,radius:Math.max(width,height)/2,duration:.7});
    if(shot.kind==='grenade')this.fx('blastArea',point.x,point.y,{side:shot.side,width,height,color:'#ffbe87'});
  }
  _statuses(u,dt){
    for(const s of u.statuses){
      while(s.nextTick<=Math.min(this.time,s.until)+EPS){
        if(s.kind==='bleed')this.damage(this._sourceFor(s),u,this.maxHealth(u)*.01,{kind:'dot',secondary:true});
        else if(s.kind==='poison'||s.kind==='burn')this.damage(this._sourceFor(s),u,s.amount||0,{kind:'dot',secondary:true,bypassShield:!!s.bypassShield});
        else if(s.kind==='regen')this.heal(u,s.amount??s.magnitude,null);
        s.nextTick+=s.interval||1;
      }
      if(s.kind==='frozen'&&s.until<=this.time+EPS)this.status(u,'slow',3,.25,this._sourceFor(s),{scheduled:true});
    }
    u.statuses=u.statuses.filter(s=>s.until>this.time+EPS);
    if(u.banished&&!u.statuses.some(s=>s.banish))this.returnBanished(u);
    if(u.memory.conversion&&!has(u,'conversion',this.time))this._restoreConversion(u);
    if(!u.alive)return;
    this._capVitals(u);
    this.heal(u,this.statValue(u,'healrecovery')*dt,u,{passive:true});
    if(!has(u,'suppression',this.time)){
      const raw=String(u.def?.raw?.additionalStats?.shieldrecovery||'');
      if(/^\d+(?:\.\d+)?\/\d+(?:\.\d+)?s$/.test(raw)){
        const [amount,period]=raw.split('/').map(num);u.memory.shieldClock=(u.memory.shieldClock||0)+dt;
        if(u.memory.shieldClock>=period){u.shield=Math.min(this.maxShield(u),u.shield+amount);u.memory.shieldClock-=period;}
      }else u.shield=Math.min(this.maxShield(u),u.shield+this.statValue(u,'shieldrecovery')*dt);
    }
    u.damageWindow=(u.damageWindow||[]).filter(d=>d.time>this.time-1);u.dps=u.damageWindow.reduce((sum,d)=>sum+d.damage,0);
  }
  _fields(){
    for(const field of this.state.fields){
      if(field.until<=this.time+EPS){
        if(field.kind==='blinding-mist')for(const u of this.units)u.statuses=u.statuses.filter(s=>s.mistFieldId!==field.id);
        continue;
      }
      const targets=this.units.filter(u=>u.alive&&u.side!==field.side&&this._inside(u,field,field.shape));
      if(field.kind==='blinding-mist'){
        const affected=new Set(targets.filter(u=>!u.isBuilding&&!u.engulfedBy&&!u.banished&&!u.possessingId&&!u.parasitizingId).map(u=>u.id));
        for(const u of this.units){
          if(affected.has(u.id))this.status(u,'blind',.12,field.magnitude,field.source,{scheduled:true,mistFieldId:field.id});
          else u.statuses=u.statuses.filter(s=>s.mistFieldId!==field.id);
        }
        continue;
      }
      if(field.kind==='poison-cloud'){
        for(const u of targets){
          if(field.poisoned[u.id]||u.isBuilding||u.healthless||u.def.combat.movementType!=='ground'||u.def.combat.groundEffectImmune)continue;
          if(this.status(u,'poison',3*STATUS_INTERVALS.poison,0,field.source,{amount:5,stack:true,groundOnly:true,scheduled:true}))field.poisoned[u.id]=true;
        }
        continue;
      }
      if(field.kind==='suppression'){for(const u of targets)this.status(u,'suppression',.1,1,field.source);continue;}
      for(const u of targets)this.status(u,field.kind==='roots'?'slow':'curse',.1,field.kind==='roots'?.15:.4,field.source,{groundOnly:field.kind==='roots'});
      if(field.left>0&&field.next<=this.time+EPS){
        for(const u of targets){if(field.kind!=='roots'||!u.def.combat.groundEffectImmune)this.damage(field.source,u,field.attack.damage,{kind:'spell'});}
        for(const c of this.castles.filter(c=>c.alive&&c.side!==field.side&&this._inside(c,field,field.shape)))this.damage(field.source,c,field.castleAttack.damage,{kind:'spell'});
        field.left--;field.next+=field.interval;
      }
    }
    this.state.fields=this.state.fields.filter(f=>f.until>this.time+EPS);
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
      const sources=visibilitySources(this.state,castle.side);
      const targets=this.units.filter(u=>this._legalTarget(castle,u,sources)&&distance(castle,u)<=RULES.castleRange+EPS);
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
    const bodies=this.units.filter(u=>u.alive&&!u.engulfedBy&&!u.banished&&!u.possessingId&&!u.parasitizingId&&!u.isBuilding&&u.def.combat.movementType!=='flying');
    for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
      const a=bodies[i],b=bodies[j],min=(a.radius+b.radius)*.72;
      let dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);
      if(d>=min)continue;if(d<.001){dx=0;dy=(i%2?1:-1)*.001;d=.001;}
      const overlap=Math.min(.04,(min-d)*.3),total=a.mass+b.mass;
      for(const [u,sign,weight] of [[a,1,b.mass/total],[b,-1,a.mass/total]]){
        if(['stun','root','imprisonment','airborne','frozen'].some(kind=>has(u,kind,this.time)))continue;
        const p={x:u.x+dx/d*overlap*sign*weight,y:u.y+dy/d*overlap*sign*weight};
        if(isWalkable(p)&&!this.castles.some(c=>c.alive&&distance(p,c)<c.radius+u.radius)){u.x=p.x;u.y=p.y;}
      }
    }
  }
  _drainDeaths(){
    let processed=0;
    while(this.deaths.length&&processed++<2048){
      const {u,killer,deathBlast}=this.deaths.shift();if(u.memory.deathResolved)continue;u.memory.deathResolved=true;
      if(u.isCastle){this.fx('explosion',u.x,u.y,{side:u.side,radius:2,duration:1.8});continue;}
      if(!u.isBuilding)for(const observer of [...this.units])if(observer.alive&&observer!==u&&this.ability(observer)?.unitDeath)this._hook('unitDeath',observer,u,killer);
      // Release is structural: Silence cannot leave survivors trapped forever.
      for(const captive of this.captivesOf(u))this.releaseEngulfed(captive);
      if(u.engulfedBy)this.releaseEngulfed(u);
      this._spreadInk(u);
      if(!u.isBuilding)for(const mark of active(u,'soulMark',this.time)){
        const form=this.cards.get(mark.summonFormId);
        if(form&&[0,1].includes(mark.summonSide)){
          this.spawn(form,mark.summonSide,u,u.lane,{count:1,groupId:mark.groupId});
          this.fx('spawn',u.x,u.y,{side:mark.summonSide,color:'#c2a6ed'});
        }
      }
      this._hook('death',u,killer);
      if(deathBlast&&killer&&!u.isBuilding){
        const shape={shape:'rect',width:deathBlast.size,height:deathBlast.size};
        for(const enemy of this.units.filter(t=>t.alive&&!t.banished&&!t.engulfedBy&&!t.isBuilding&&this.isEnemy(killer,t)&&this._inside(t,u,shape)))
          this.damage(killer,enemy,deathBlast.damage,{kind:'ability',secondary:true,accuracyChecked:true,deathBlast});
        this.fx('blastArea',u.x,u.y,{side:killer.side,width:deathBlast.size,height:deathBlast.size,color:'#ffad78'});
      }
      if(u.buildingKind==='dark-orb'){
        const raw=u.spell.raw.stats;
        for(const enemy of this.units.filter(v=>v.alive&&v.side!==u.side))this.damage(u,enemy,num(raw.damageToCard),{kind:'spell',secondary:true});
        for(const c of this.castles.filter(v=>v.alive&&v.side!==u.side))this.damage(u,c,num(raw.damageToCastle),{kind:'spell',secondary:true});
      }
      this.fx('death',u.x,u.y,{side:u.side,duration:.7});
      this.log('death',`${u.def.name} fell.`,{side:u.side,unitId:u.id});
    }
    this.state.units=this.units.filter(u=>u.alive);
    this.state.sharedVitals=this.state.sharedVitals.filter(pool=>{
      if(pool.members.some(id=>this.units.some(u=>u.id===id)))return true;
      this.vitalPools.delete(pool.id);return false;
    });
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
        if(building&&this.units.some(u=>u.alive&&!u.engulfedBy&&u.def.combat?.movementType!=='flying'&&distance(u,point)<u.radius+.5))continue;
        seen.add(key);candidates.push(point);
      }
    }
    // Both sides use the same road/range legality and tactical distance metric.
    return candidates.sort((a,b)=>distance(a,goal)-distance(b,goal)||distance(a,MAP.bases[side])-distance(b,MAP.bases[side]));
  }
  _bot(dt){tickBot(this,dt);}
  _finish(){
    const [a,b]=this.castles;
    if(a.hp<=0||b.hp<=0)this.state.winner=a.hp<=0&&b.hp<=0?'draw':a.hp<=0?1:0;
    else if(this.state.phase==='overtime'&&this.state.remaining<=EPS)this.state.winner=Math.abs(a.hp-b.hp)<EPS?'draw':a.hp>b.hp?0:1;
    if(this.state.winner!==null){this.state.phase='ended';this.state.remaining=Math.max(0,this.state.remaining);this.log('result',this.state.winner==='draw'?'The battle is a draw.':`${this.state.winner?'Crimson Crown':'Azure Core'} wins.`);}
  }
  _tick(dt){
    this.state.time+=dt;this.state.remaining-=dt;
    this._syncPossessions();this._syncParasites();
    for(let side=0;side<2;side++){
      const owned=this.state.nodes.filter(n=>n.owner===side).length;
      this.teams[side].mana=Math.min(RULES.maxMana,this.teams[side].mana+dt/RULES.manaInterval*(1+owned*RULES.nodeBonus)*(this.state.phase==='overtime'?2:1));
    }
    this._fields();this._trails(dt);
    this._syncCaptives();
    for(const castle of this.castles)if(castle.alive)this._statuses(castle,dt);
    // Snapshot prevents summons from taking an extra action in their birth tick.
    for(const u of [...this.units]){
      if(!u.alive)continue;
      u.moving=false;u.cooldown-=dt;
      this._statuses(u,dt);
      if(!u.alive)continue;
      if(u.possessingId||u.parasitizingId)continue;
      this._lifeDecay(u);
      if(!u.alive)continue;
      if(u.expiresAt<=this.time+EPS||u.def.stats.life>0&&this.time-u.born+EPS>=this.statValue(u,'life')){this.killUnit(u);continue;}
      if(u.engulfedBy)continue;
      if(u.isBuilding)this._buildingAura(u);
      if(has(u,'silence',this.time)||has(u,'imprisonment',this.time))for(const key of this.ability(u)?.conditionalStats||[])u.stats[key]=u.def.stats[key];
      if(!has(u,'silence',this.time)&&!has(u,'imprisonment',this.time))this._hook('tick',u,dt);
      if(!u.alive||['stun','imprisonment','airborne','frozen'].some(kind=>has(u,kind,this.time)))continue;
      const target=this._target(u);
      if(u.targetId!==(target?.id??null))this._hook('targetChanged',u,target);
      u.targetId=target?.id??null;
      this.prepareWeapon(u,target);
      const profile=this._profile(u),reach=this._attackReach(u,profile);
      // A melee unit must reach its real damage area before stopping. A wider
      // trigger radius leaves cone/line attacks swinging forever outside it.
      const allowance=profile.attackType==='melee'||this.ability(u)?.contactAttack?EPS:u.radius*.2;
      if(target&&distance(u,target)<=reach+target.radius+allowance&&profile.attackType!=='none'){
        const dx=target.x-u.x,dy=target.y-u.y,len=Math.hypot(dx,dy)||1;u.facingX=dx/len;u.facingY=dy/len;
        if(this.ability(u)?.noBasicAttack)this._hook('contact',u,target);
        else if(u.cooldown<=EPS&&!u.memory.returningShotId)this._fire(u,target);
      }else this._move(u,target,dt);
    }
    this._syncCaptives();this._separation();this._castles(dt);this._projectiles(dt);this._syncPossessions();this._syncParasites();this._objectives(dt);this._drainDeaths();this._spawnStreams();
    this.state.effects=this.state.effects.filter(e=>e.until>this.time);
    const referenced=new Set(this.units.concat(this.castles).flatMap(u=>u.statuses.filter(s=>s.until>this.time).map(s=>s.sourceId)));
    for(const id of this.statusSources.keys())if(!referenced.has(id))this.statusSources.delete(id);
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
