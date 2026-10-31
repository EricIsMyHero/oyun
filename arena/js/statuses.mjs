import { clamp, num } from './rules.mjs';

// Canonical status rules from data/info.json. Native cards still supply their
// own damage, duration, radius and thresholds; prose is never executed at runtime.
export const STATUS_INTERVALS=Object.freeze({burn:1,poison:.75,bleed:1,regen:1});
export const NEGATIVE_STATUSES=new Set(['slow','movementSlow','stun','root','silence','blind','poison','burn','bleed','curse','misfortune','imprisonment','suppression','healBlock','fear','conversion','statReduction','airborne','betrayal','frozen','taunted','knockback','engulfed']);
const aliases={heal:'regen',healing:'regen',bleeding:'bleed',invisibility:'invisible',reflection:'reflection',statreduction:'statReduction',knockback:'knockback',movementslow:'movementSlow',healblock:'healBlock',attackhaste:'attackHaste',damagebonus:'damageBonus',speedbonus:'speedBonus'};
const canonical=['regen','burn','poison','bleed','untouchable','immortal','predominance','fearless','taunt','taunted','cleanse','berserk','invisible','untargetable','reflection',...NEGATIVE_STATUSES];
const names=new Map(canonical.map(name=>[name.toLowerCase(),name]));
export const statusKind=name=>aliases[String(name).replace(/[\s_-]/g,'').toLowerCase()]||names.get(String(name).toLowerCase())||name;
export const statusesAt=(u,kind,time)=>(u?.statuses||[]).filter(s=>s.kind===kind&&s.until>time+1e-7);
export const hasStatus=(u,kind,time)=>statusesAt(u,kind,time).length>0;
export const statusMagnitude=(u,kind,time)=>Math.max(0,...statusesAt(u,kind,time).map(s=>num(s.magnitude)));

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
  if(key==='damage'||key==='attackSpeed')for(const s of statusesAt(u,'berserk',time)) {
    const cap=Math.max(1,statValue(u,'health',time,u.maxHp||num(u.stats?.health,1)));
    if(u.hp>=cap*s.threshold)continue;
    if(key==='damage')value*=1+Math.max(0,num(s.damageBonus));
    else value/=1+Math.max(0,num(s.attackSpeedBonus));
  }
  return Math.max(0,value);
}

export function statusParameters(kind,magnitude,extra={}) {
  const params={...extra};
  if(kind==='slow')magnitude=clamp(num(magnitude),.1,.95);
  if(kind==='blind')magnitude=clamp(num(magnitude),.125,1);
  if(kind==='misfortune')magnitude=clamp(num(magnitude),.1,1);
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
