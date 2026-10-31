import { STAT_KEYS, num, burst } from './rules.mjs';
import { abilityReadiness, SPELL_RULES, SPELL_GAPS } from './abilities.mjs';

const RARITIES=['mundane','familiar','arcane','relic','ascendant','apex','emergent','ethereal'];
const R2='https://pub-ebf8690f3ea54a55853e5e920cb6903a.r2.dev';
export function slugify(text='') {
  return String(text).toLowerCase().replaceAll('ı','i').replaceAll('ğ','g').replaceAll('ü','u').replaceAll('ş','s').replaceAll('ö','o').replaceAll('ç','c').replaceAll(/\s+/g,'-').replaceAll(/[^a-z0-9-]/g,'');
}
const creature = value => ({'İnsan':'Human','Heyvan':'Animal','Ölü':'Dead','Uzaylı':'Alien','Ruh':'Spirit','Varlıq':'Entity'}[value]||value);
export function imageFor(raw,parent=null) {
  const source=raw.isDual&&raw.type1?raw.type1:raw;
  const group=slugify(source.group||raw.group||parent?.group||'');
  const key=slugify(source.id||raw.id||source.name||raw.name||'');
  return `${R2}/${group?`${group}/`:''}${key}.jpg`;
}
function parseCombat(raw) {
  if(!raw.combatStats)return null;
  const combat=structuredClone(raw.combatStats);
  if(combat.attackWidth==null&&combat.multiTarget===false&&combat.attackType!=='none')combat.attackWidth=500;
  if(combat.attackDistanceMatchesRange){
    const ranges=String(raw.additionalStats?.range||'').split('/').map(v=>num(v,NaN)).filter(Number.isFinite);
    combat.attackDistance=ranges.length?Math.max(...ranges):null;
  }
  if(combat.attackAngle==null&&combat.attackShape==='cone'&&combat.attackWidth>0&&combat.attackDistance>0){
    combat.attackAngle=2*Math.atan(combat.attackWidth/(2*combat.attackDistance))*180/Math.PI;
  }
  return combat;
}
function normalizeCard(raw,parent=null,id=raw.id||slugify(raw.name)) {
  const values={...raw.additionalStats,...raw.stats};
  const stats=Object.fromEntries(STAT_KEYS.map(key=>[key,num(values[key])]));
  if(values.criticDamage==null||values.criticDamage==='-')stats.criticDamage=1;
  let parsed=burst(raw.stats?.damage);
  let sequence;
  const modeReasons=[];
  if(id==='kai'){
    parsed={count:1,damage:9};
    sequence=[9,9,21].map(damage=>({count:1,damage,interval:num(raw.stats.attackSpeed),delay:num(raw.stats.delay)}));
  }else if(id==='tribe')parsed={count:1,damage:4};
  else if(!parsed)modeReasons.push('The slash-separated attack modes are not fully defined for this combat profile.');
  stats.damage=parsed?.damage||0;
  const attack={...(parsed||{count:1,damage:0}),interval:num(raw.stats?.attackSpeed),delay:num(raw.stats?.delay)};
  if(sequence)attack.sequence=sequence;
  const combat=parseCombat(raw);
  const reasons=[...modeReasons];
  if(!raw.stats||num(raw.stats.health,NaN)<=0||!Number.isFinite(num(raw.stats.health,NaN)))reasons.push('A positive Health value is not authored.');
  if(!combat)reasons.push('The essential combat profile is not authored.');
  else if(combat.attackType!=='none'){
    if(!Number.isFinite(combat.attackDistance)||combat.attackDistance<=0)reasons.push('Attack Distance is not authored.');
    if(!Number.isFinite(combat.attackWidth)||combat.attackWidth<=0)reasons.push('Projectile Width is not authored.');
    if(combat.attackShape==='cone'&&!Number.isFinite(combat.attackAngle))reasons.push('The Cone angle cannot be resolved from authored geometry.');
    if(combat.attackShape==='square'&&!combat.impactSize)reasons.push('Impact Area dimensions are not authored.');
    if(combat.projectileEndEffect==='explode'&&!combat.impactSize)reasons.push('The endpoint explosion dimensions are not authored.');
    if(!(stats.range>0))reasons.push('Target-acquisition Range is not authored.');
    if(!(attack.interval>0)&&attack.damage>0)reasons.push('A positive Attack Speed interval is not authored.');
  }
  reasons.push(...abilityReadiness(raw,id));
  const def={id,name:raw.name||'Unnamed',raw,rarity:raw.rarity||parent?.rarity||'Mundane',group:raw.group||parent?.group||'',image:imageFor(raw,parent),type:(Array.isArray(raw.type)?raw.type:[raw.type]).filter(Boolean).map(creature),class:raw.class||parent?.class||'',subclass:raw.subclass||'',stats,attack,combat,forms:[],typeVariants:[],ready:false,reasons};
  def.forms=(raw.forms||[]).map(form=>normalizeCard(form,raw,`${id}/${form.id||slugify(form.name)}`));
  for(const key of ['type1','type2'])if(raw[key])def.typeVariants.push(normalizeCard(raw[key],raw,`${id}/${key}`));
  if(raw.upgradedsecondForm)def.ascended=normalizeCard(raw.upgradedsecondForm,raw,`${id}/ascended`);
  if(id==='tribe')def.variants=[{count:2,damage:4,interval:1},{count:3,damage:6,interval:1.25}];
  // A parent cannot promise a summon/form that the engine cannot faithfully run.
  for(const form of [...def.forms,...def.typeVariants,...(def.ascended?[def.ascended]:[])]){
    if(!form.ready)reasons.push(`${form.name}: ${form.reasons.join(' ')}`);
  }
  if(raw.isDual)reasons.push('A complete selectable Type I or Type II combat profile is required.');
  def.reasons=[...new Set(reasons)];def.ready=def.reasons.length===0;
  return def;
}
function spellRange(value) {
  if(String(value).toLowerCase()==='global')return {shape:'global',radius:Infinity};
  const rectangle=String(value||'').replaceAll(',','.').match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)$/i);
  if(rectangle)return {shape:'rect',width:num(rectangle[1])/1000,height:num(rectangle[2])/1000};
  return {shape:'circle',radius:num(value)/1000};
}
function normalizeSpell(raw) {
  const id=slugify(raw.name),stats=raw.stats||{};
  const kind=String(raw.type).toLowerCase()==='building'?'building':'normal';
  const reasons=[...(SPELL_GAPS[id]||[])];
  if(!SPELL_RULES[id]&&!reasons.length)reasons.push('Essential spell behavior is not fully authored.');
  const range=spellRange(stats.range);
  if(range.shape!=='global'&&!(range.radius>0||range.width>0&&range.height>0)&&!['deathBlast'].includes(SPELL_RULES[id]?.kind))reasons.push('An effect area is not authored.');
  const energy=num(stats.energy),charge=num(stats.charge);
  if(!(energy>0))reasons.push('A positive Energy cost is not authored.');
  if(!Number.isInteger(charge)||charge<1||charge>5)reasons.push('Charge must be an authored integer from 1 to 5.');
  if(kind==='building'&&!(num(stats.health)>0&&num(stats.lifetime)>0))reasons.push('Building Health and lifetime must be authored.');
  return {id,name:raw.name,raw,rarity:raw.rarity||'Common',image:imageFor(raw),kind,energy,charge,range,damage:burst(stats.damageToCard)||{count:1,damage:0},castleDamage:burst(stats.damageToCastle)||{count:1,damage:0},interval:num(stats.timeBetweenDamage||stats.attackSpeed),health:num(stats.health),lifetime:num(stats.lifetime),rule:SPELL_RULES[id]||null,ready:reasons.length===0,reasons};
}
export function buildCatalog(rawCards,rawSpells) {
  const cards=rawCards.map(raw=>normalizeCard(raw));
  const forms=[];
  function walk(def){forms.push(def);def.forms.forEach(walk);def.typeVariants.forEach(walk);if(def.ascended)walk(def.ascended);}
  cards.forEach(walk);
  const spells=rawSpells.map(normalizeSpell);
  return {cards,spells,forms,byId:new Map(forms.map(c=>[c.id,c])),spellById:new Map(spells.map(s=>[s.id,s]))};
}
export async function loadCatalog(baseURL=new URL('../../',import.meta.url)) {
  const fetchJSON=async path=>{
    const response=await fetch(new URL(path,baseURL),{cache:'no-cache'});
    if(!response.ok)throw Error(`Could not load ${path} (${response.status}).`);
    const data=await response.json();if(!Array.isArray(data))throw Error(`Invalid entity list in ${path}.`);return data;
  };
  const [rarities,spells]=await Promise.all([Promise.all(RARITIES.map(r=>fetchJSON(`rarity/${r}.json`))),fetchJSON('data/spells.json')]);
  return buildCatalog(rarities.flat(),spells);
}
export function formatStat(key,value) {
  if(value==null||value==='-'||value==='—')return '—';
  if(['range','speed','vision','attackWidth','attackDistance'].includes(key)){
    const values=String(value).split('/').map(v=>num(v)/1000);
    return `${values.join(' / ')} ${values.length===1&&values[0]===1?'tile':'tiles'}${key==='speed'?'/s':''}`;
  }
  return String(value);
}
