import { clamp, num } from './rules.mjs';

// Canonical status rules from data/info.json. Native cards still supply their
// own damage, duration, radius and thresholds; prose is never executed at runtime.
export const STATUS_INTERVALS=Object.freeze({burn:1,poison:.75,bleed:1,regen:1});
export const NEGATIVE_STATUSES=new Set(['slow','movementSlow','stun','root','silence','blind','poison','burn','bleed','curse','misfortune','imprisonment','suppression','healBlock','fear','conversion','statReduction','airborne','betrayal','frozen','taunted','knockback','engulfed','soulMark','ink','parasite','weakness','absoluteWeakness']);
export const STACKING_STATUSES=new Set(['burn','poison','bleed','slow','frozen']);
export const SINGLE_TARGET_STATUSES=new Set(['berserk','untargetable','reflection','fearless','imprisonment','betrayal']);
export const STATUS_HIERARCHY=Object.freeze([
  ['untargetable','untouchable','immortal'],
  ['predominance'],
  ['betrayal','airborne','imprisonment'],
  ['cleanse'],
  ['root','misfortune','stun','curse','blind','statReduction','slow','burn','poison','frozen','bleed','knockback','taunt','taunted','silence','weakness','absoluteWeakness'],
  ['invisible','reflection','fearless','berserk','regen'],
].map(tier=>Object.freeze(tier)));
const ranks=new Map(STATUS_HIERARCHY.flatMap((tier,index)=>tier.map(kind=>[kind,STATUS_HIERARCHY.length-index])));
const BONUS_STATUSES=new Set(['damageBonus','attackHaste','speedBonus','protection','defense','spellProtection','allStatsBonus','blessedShield']);
const aliases={heal:'regen',healing:'regen',bleeding:'bleed',invisibility:'invisible',reflection:'reflection',statreduction:'statReduction',knockback:'knockback',movementslow:'movementSlow',healblock:'healBlock',attackhaste:'attackHaste',damagebonus:'damageBonus',speedbonus:'speedBonus',absoluteweakness:'absoluteWeakness'};
// Locked possession is deliberately outside the set removed by Cleanse.
const canonical=['blessed','regen','burn','poison','bleed','untouchable','immortal','predominance','fearless','taunt','taunted','cleanse','berserk','invisible','untargetable','reflection','possession',...NEGATIVE_STATUSES];
const names=new Map(canonical.map(name=>[name.toLowerCase(),name]));
export const statusKind=name=>aliases[String(name).replace(/[\s_-]/g,'').toLowerCase()]||names.get(String(name).toLowerCase())||name;
export const statusesAt=(u,kind,time)=>(u?.statuses||[]).filter(s=>s.kind===kind&&s.until>time+1e-7);
export const hasStatus=(u,kind,time)=>statusesAt(u,kind,time).length>0;
export const bonusMultiplier=(u,time)=>hasStatus(u,'absoluteWeakness',time)?.7:1;
export const canApplyStatuses=(u,time)=>!hasStatus(u,'absoluteWeakness',time);
export const statusMagnitude=(u,kind,time)=>Math.max(0,...statusesAt(u,kind,time).map(s=>num(s.magnitude)))*(BONUS_STATUSES.has(kind)?bonusMultiplier(u,time):1);

export function effectDefinition(name,{area=false}={}) {
  const kind=statusKind(name),base=kind==='movementSlow'?'slow':kind;
  const singleTargetOnly=SINGLE_TARGET_STATUSES.has(kind);
  return {kind,polarity:NEGATIVE_STATUSES.has(kind)?'negative':'positive',singleTargetOnly,
    category:STACKING_STATUSES.has(base)?'stacking':area&&!singleTargetOnly?'crowd-control':'control',
    // Internal numeric buffs and locked native possession are independent of
    // the named hierarchy. Permanent native stat growth is never a buff effect.
    rank:ranks.get(base)??(NEGATIVE_STATUSES.has(kind)?2:null)};
}
export function canRemoveStatus(kind,remover) {
  const effect=effectDefinition(kind),action=effectDefinition(remover);
  return effect.polarity==='negative'&&effect.rank!=null&&action.rank!=null&&action.rank>effect.rank;
}
export function weaknessDurationMultiplier(u,kind,time) {
  if(!NEGATIVE_STATUSES.has(kind))return 1;
  const stacking=effectDefinition(kind).category==='stacking';
  if(hasStatus(u,'absoluteWeakness',time))return stacking?1.5:1.33;
  if(hasStatus(u,'weakness',time))return stacking?1.33:1.25;
  return 1;
}

export function statModifiers(u,key,time) {
  let flat=0,factor=1;
  for(const s of statusesAt(u,'statReduction',time)) {
    const amount=Math.max(0,num(s.stats?.[key]));
    if(s.percent)factor*=1-clamp(amount,0,1);else flat+=amount;
  }
  return {flat,factor};
}
export function statValue(u,key,time,base=num(u?.stats?.[key])) {
  const {flat,factor}=statModifiers(u,key,time),inverse=key==='attackSpeed'||key==='delay';
  let value=inverse?(base+flat)/Math.max(.001,factor):Math.max(0,base-flat)*factor;
  if(!['mana','number','life'].includes(key))for(const buff of statusesAt(u,'allStatsBonus',time)){const bonus=buff.magnitude*bonusMultiplier(u,time);value=inverse?value/(1+bonus):value*(1+bonus);}
  if(statusesAt(u,'allStatsBonus',time).length){const cap={criticalChance:100,lifestealChance:100,lifesteal:100,dodge:70,damageminimiser:90,criticdamageminimiser:90,flexibility:80,healBonus:100,criticDamage:5,shieldtakendamage:100}[key];if(cap!=null)value=Math.min(cap,value);}
  if(key==='damage'||key==='attackSpeed')for(const s of statusesAt(u,'berserk',time)) {
    const cap=Math.max(1,statValue(u,'health',time,u.maxHp||num(u.stats?.health,1)));
    if(u.hp>=cap*s.threshold)continue;
    if(key==='damage')value*=1+Math.max(0,num(s.damageBonus))*bonusMultiplier(u,time);
    else value/=1+Math.max(0,num(s.attackSpeedBonus))*bonusMultiplier(u,time);
  }
  // Native tick handlers may rebuild their base chance; theft survives those
  // updates and transfers exact percentage points after temporary modifiers.
  if(key==='criticalChance')value=clamp(value+num(u?.criticalChanceOffset),0,100);
  return Math.max(0,value);
}

export function transferCriticalChance(source,target,amount,time) {
  const gain=Math.min(Math.max(0,num(amount)),statValue(target,'criticalChance',time),100-statValue(source,'criticalChance',time));
  if(gain>0){source.criticalChanceOffset=num(source.criticalChanceOffset)+gain;target.criticalChanceOffset=num(target.criticalChanceOffset)-gain;}
  return gain;
}

export function statusParameters(kind,magnitude,extra={}) {
  const params={...extra};
  if(kind==='slow')magnitude=clamp(num(magnitude),.1,.95);
  if(kind==='blind')magnitude=clamp(num(magnitude),.125,1);
  if(kind==='misfortune')magnitude=clamp(num(magnitude),.1,1);
  if(kind==='curse')magnitude=Math.max(.25,num(magnitude));
  if(kind==='statReduction') {
    params.stats={...(extra.stats||{}),...(extra.stat?{[extra.stat]:magnitude}:{})};
    if(!Object.entries(params.stats).some(([,value])=>Number.isFinite(value)&&value>0))return null;
  }
  if(kind==='berserk') {
    if(!Number.isFinite(extra.threshold)||extra.threshold<=0||extra.threshold>1)return null;
    params.damageBonus=num(extra.damageBonus,extra.stat==='damage'?magnitude:0);
    params.attackSpeedBonus=num(extra.attackSpeedBonus,extra.stat==='attackSpeed'?magnitude:0);
    if(!(params.damageBonus>0||params.attackSpeedBonus>0))return null;
  }
  const interval=num(extra.interval,STATUS_INTERVALS[kind]||1);
  params.interval=interval>0?interval:STATUS_INTERVALS[kind]||1;
  if(['poison','burn','regen'].includes(kind))params.amount=num(extra.amount,magnitude);
  return {magnitude,params};
}
