import { clamp, RAY_CHARGE } from './rules.mjs';
import { statusKind } from './statuses.mjs';

// The same hand-drawn symbols are used on the battlefield and in the inspector.
// Paths use a 20×20 view box; there are no emoji or font-dependent glyphs.
export const ICON_PATHS = Object.freeze({
  frost:'M10 2v16M3.1 6l13.8 8M3.1 14l13.8-8M7 3.5l3 3 3-3M7 16.5l3-3 3 3M3 9l4-1-1-4M17 11l-4 1 1 4M3 11l4 1-1 4M17 9l-4-1 1-4',
  slow:'M4 5l5 5-5 5M10 5l5 5-5 5M3 18h14',
  poison:'M7 2h6M8 2v5l-4 7q-2 4 3 4h6q5 0 3-4l-4-7V2M6 12h8M8 15h.1M12 14h.1',
  flame:'M11 2q2 5-1 7 4-1 4-4 5 7 2 11-5 5-10 0-3-4 2-9-1 5 2 5-2-5 1-10Z',
  drop:'M10 2C8 6 3 10 4 14a6 6 0 0 0 12 0C17 10 12 6 10 2ZM7 13q-1 3 2 3',
  stun:'M10 2l2.2 5.3L18 8l-4.4 3.8 1.3 5.8-4.9-3-4.9 3 1.3-5.8L2 8l5.8-.7Z',
  root:'M10 2v9M5 4q5 0 5 5M15 5q-5 0-5 6M10 10l-4 5-3 1M10 11l4 4 3 1M10 10v8',
  silence:'M5 7v6h3l5 4V3L8 7ZM16 7l3 6M19 7l-3 6',
  eye:'M2 10q8-11 16 0-8 11-16 0ZM7 10a3 3 0 1 0 6 0 3 3 0 1 0-6 0M3 17L17 3',
  curse:'M10 2l7 8-7 8-7-8ZM10 6v5M10 14h.1',
  shield:'M10 2l7 3v5q0 5-7 8-7-3-7-8V5ZM6 10l3 3 5-6',
  heal:'M8 3h4v5h5v4h-5v5H8v-5H3V8h5Z',
  sword:'M5 15L15 3h3v3L7 17M3 12l5 5M3 18l3-3',
  wind:'M2 6h11q5 0 3-3M2 10h14q5 0 2 3M2 14h7q5 0 3 3',
  lock:'M5 9V6a5 5 0 0 1 10 0v3M4 9h12v9H4ZM10 12v3',
  clock:'M5 2h10M5 18h10M6 2v3l8 10v3M14 2v3L6 15v3M7 15h6',
  moon:'M14 3a8 8 0 1 0 3 11A8 8 0 0 1 14 3Z',
  target:'M10 2v3M10 15v3M2 10h3M15 10h3M4 10a6 6 0 1 0 12 0 6 6 0 1 0-12 0M8 10a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
  down:'M10 2v11M5 9l5 5 5-5M3 18h14',
  blessing:'M10 1l2.4 6.6L19 10l-6.6 2.4L10 19l-2.4-6.6L1 10l6.6-2.4ZM5 2v3M3.5 3.5h3',
  link:'M8 6L6 4a4 4 0 0 0-5 6l4 4a4 4 0 0 0 6-5M12 14l2 2a4 4 0 0 0 5-6l-4-4a4 4 0 0 0-6 5M7 7l6 6',
  charge:'M11 2L3 12h6l-1 6 9-11h-6Z',
});
const visual=(label,color,icon,priority)=>Object.freeze({label,color,icon,priority});
const STATUS_VISUALS=Object.freeze({
  blessed:visual('Blessed','#f4dca0','blessing',-1),
  frozen:visual('Frozen','#b9f1ff','frost',0),stun:visual('Stun','#ffe09b','stun',1),
  airborne:visual('Airborne','#cae2ff','wind',2),imprisonment:visual('Imprisonment','#b8beff','lock',3),
  root:visual('Root','#b4dd88','root',4),silence:visual('Silence','#dfb1ff','silence',5),
  blind:visual('Blind','#dbc1e2','eye',6),slow:visual('Slow','#8edbff','slow',7),
  poison:visual('Poison','#b5e673','poison',8),burn:visual('Burn','#ffb478','flame',9),
  bleed:visual('Bleeding','#ff8296','drop',10),curse:visual('Curse','#e6a4f4','curse',11),
  misfortune:visual('Misfortune','#cfb0eb','curse',12),suppression:visual('Suppression','#bdaeff','lock',13),
  taunted:visual('Taunted','#ffb18a','target',14),betrayal:visual('Betrayal','#ff8ba9','sword',15),
  conversion:visual('Conversion','#d1b5ff','moon',16),possession:visual('Possession','#cbb5ff','moon',16),
  ink:visual('Ink','#b5a1df','drop',17),soulMark:visual('Soul Mark','#c2a6ed','curse',18),
  statReduction:visual('Stat Reduction','#e9a2cd','down',19),healBlock:visual('Healing Blocked','#ff879c','heal',20),
  fear:visual('Fear','#d2b1ed','eye',20),engulfed:visual('Engulfed','#b5dc91','lock',20),
  parasite:visual('Parasite','#c2b3ff','drop',21),knockback:visual('Knockback','#c6e2ff','wind',21),
  regen:visual('Heal','#a2e7a2','heal',30),untouchable:visual('Untouchable','#e4f8ff','shield',31),
  immortal:visual('Immortal','#ffe2ac','shield',31),predominance:visual('Predominance','#dfd0ff','shield',32),
  reflection:visual('Reflection','#b6f1df','shield',33),invisible:visual('Invisibility','#bfc9ea','moon',34),
  untargetable:visual('Untargetable','#c3d9fa','eye',34),taunt:visual('Taunt','#ffbb8e','target',35),
  berserk:visual('Berserk','#ffb46d','sword',36),fearless:visual('Fearless','#ffe9ac','shield',36),
  attackHaste:visual('Attack Haste','#ffcba2','sword',40),damageBonus:visual('Damage Bonus','#ffcd98','sword',40),
  speedBonus:visual('Speed Bonus','#9fe8dd','wind',41),protection:visual('Protection','#b6dedf','shield',42),
  defense:visual('Defense','#b6dedf','shield',42),spellProtection:visual('Spell Protection','#c1b5ef','shield',42),
  allStatsBonus:visual('Blessing','#f3dfa8','stun',43),blessedShield:visual('Blessed Shield','#f3dfa8','shield',43),
});
export function statusVisual(kind){
  const key=statusKind(kind)==='movementSlow'?'slow':statusKind(kind);
  return STATUS_VISUALS[key]||visual(String(kind).replace(/([a-z])([A-Z])/g,'$1 $2'),'#ccd9d9','curse',90);
}
export function statusIconSVG(kind){
  const v=statusVisual(kind);
  return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON_PATHS[v.icon]}"/></svg>`;
}
export function statusBadges(statuses=[],time=0){
  const groups=new Map();
  for(const s of statuses){
    if((s.until??Infinity)<=time+1e-7||s.kind==='blessedTrap')continue;
    const kind=statusKind(s.kind)==='movementSlow'?'slow':statusKind(s.kind),v=statusVisual(kind);
    const previous=groups.get(kind);
    if(previous){previous.count++;previous.until=Math.max(previous.until,s.until??Infinity);}
    else groups.set(kind,{kind,...v,count:1,until:s.until??Infinity});
  }
  return [...groups.values()].sort((a,b)=>a.priority-b.priority||a.kind.localeCompare(b.kind));
}

const CHARGE_CARDS=new Set(['laura','kai','wong','tribe','shellbyte','ali','unara','clara']);
// Presentation reads native counters directly: no animation invents charge or
// changes a passive. Current ability IDs also cover copied/stolen passives.
export function nativeCharge(unit,time=0){
  if(!unit||unit.passiveDisabled||unit.def?.passiveDisabled)return null;
  const id=unit.def?.variantId||unit.def?.id||'',memory=unit.memory||{};
  let key='charge',max=100,label='Charge',color='#88deed',segmented=false;
  if(id.startsWith('mr-and-mrs-ray/')){key='rayCharge';max=RAY_CHARGE.maximum;label='Twin Charge';color='#e5bf9a';}
  else if(/^ase\/type[12]$/.test(id)){key='parts';max=4;label='Robot Parts';}
  else if(id==='artist'){key='artistCharge';label='Ink Charge';color='#c99ae6';}
  else if(!CHARGE_CARDS.has(id))return null;
  const total=Number.isFinite(memory[key])?clamp(memory[key],0,max):0;
  if(unit.rayFusion?.until>time){const ratio=clamp((unit.rayFusion.until-time)/(unit.rayFusion.until-unit.rayFusion.born),0,1);return{key,label:'Fusion Active',color:'#f4dca0',total,value:ratio*100,max:100,ready:false,active:true,segmented:false,ratio,caption:'ACTIVE'};}
  const value=segmented?total%max:total,ready=!segmented&&value>=max-1e-7;
  return {key,label,color,total,value,max,ready,segmented,ratio:clamp(value/max,0,1),
    caption:segmented?String(Math.floor(total+1e-7)):`${Math.floor(total+1e-7)}/${max}`};
}

const FIELDS=Object.freeze({
  roots:{label:'Roots',color:'#a9d77f',icon:'root',texture:'roots'},
  'nightfall-curse':{label:'Nightfall Curse',color:'#c3a0f7',icon:'curse',texture:'runes'},
  suppression:{label:'Spirit of the Wild',color:'#8bdfdc',icon:'lock',texture:'runes'},
  'poison-cloud':{label:'Poison',color:'#b4de70',icon:'poison',texture:'poison'},
  'blinding-mist':{label:'Blinding Mist',color:'#c3d4ec',icon:'eye',texture:'mist'},
});
export function fieldVisual(field,time=0){
  if(!field||field.until<=time+1e-7)return null;
  const shape=field.shape||{},rect=(shape.shape||shape.type)==='rect';
  if(rect?!(shape.width>0&&shape.height>0):!(shape.radius>0))return null;
  const remaining=Math.max(0,field.until-time),duration=field.until-(field.born??time);
  return {...(FIELDS[field.kind]||{label:'Spell Area',color:'#bcbded',icon:'curse',texture:'runes'}),
    shape:rect?'rect':'circle',width:rect?shape.width:shape.radius*2,height:rect?shape.height:shape.radius*2,
    radius:rect?null:shape.radius,remaining,fraction:duration>0?clamp(remaining/duration,0,1):1,
    fade:clamp(remaining/.45,0,1)};
}

export const LIFE_LOSS_COLOR='#ff747d';
export function effectColor(effect){
  if(effect.type==='lifeLoss')return LIFE_LOSS_COLOR;
  if(effect.color)return effect.color;
  if(effect.type==='status')return statusVisual(effect.statusKind).color;
  if(effect.critical)return '#ffdb87';
  return ({hit:'#ffd4ae',heal:'#a2e7a2',shield:'#8edcff',death:'#f8c99b',capture:'#9bf5ed',engulf:'#a5e27c',release:'#d2efac',explosion:'#ffc279',slash:'#fff2c2',spell:'#ccadff',spawn:'#b8edfa',thaw:'#b9f1ff',miss:'#c3ced4'}[effect.type]||'#ffe8c0');
}
