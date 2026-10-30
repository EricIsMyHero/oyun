import { loadCatalog } from './catalog.mjs';
import { ArenaEngine } from './engine.mjs';
import { ArenaRenderer } from './renderer.mjs';
import { RULES, STAT_KEYS, num } from './rules.mjs';
import { MAP, distance, isDeployable } from './map.mjs';
import { isEntityVisible, isPointVisible } from './vision.mjs';

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'clash-a-mana.arena.deck.v1';
const RARITY_COLORS = {mundane:'#8da093',familiar:'#6eaa8e',arcane:'#6ba4bd',relic:'#a189c2',ascendant:'#bd9565',apex:'#d18a74',emergent:'#b2aa68',ethereal:'#8bbac1',common:'#8da093',rare:'#6ba4bd',epic:'#a189c2',legendary:'#bd9565'};
const STAT_LABELS = {health:'Health',shield:'Shield',damage:'Damage',sps:'DPS',attackSpeed:'Attack Speed',delay:'Delay',mana:'Mana',number:'Count',range:'Range',speed:'Speed',criticDamage:'Critical Damage',criticalChance:'Critical Chance',lifesteal:'Lifesteal',lifestealChance:'Lifesteal Chance',dodge:'Dodge Chance',vision:'Vision',healBonus:'Healing Bonus',healrecovery:'Rejuvenation',shieldrecovery:'Fortification',damageminimiser:'Damage Reduction',criticdamageminimiser:'Critical Resistance',flexibility:'Flexibility',shieldtakendamage:'Shield Depletion',life:'Life'};
const STAT_ORDER = ['health','shield','damage','sps','attackSpeed','delay','mana','number','range','speed','criticDamage','criticalChance','lifesteal','lifestealChance','dodge','vision','healBonus','healrecovery','shieldrecovery','damageminimiser','criticdamageminimiser','flexibility','shieldtakendamage','life'];
const state = {catalog:null,renderer:null,engine:null,deck:[],spellDeck:[],tab:'troops',selection:null,pointer:null,drag:null,pauseReasons:new Set(),selectedUnitId:null,toastTimer:0,frame:0,lastFrame:0,lastHUD:0,handSignature:'',spellSignature:'',resultShown:false,seed:Date.now()>>>0,inspectorDefinition:null};

function escapeHTML(value='') { return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function label(value='') { return String(value).replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }
function initials(name='') { return name.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase(); }
function rarityColor(def) { return RARITY_COLORS[String(def?.rarity||def?.raw?.rarity||'').toLowerCase()]||'#8da093'; }
function nativeHTML(value) {
  const template=document.createElement('template');
  template.innerHTML=String(value??'');
  const allowed=new Set(['B','I','STRONG','EM','BR']);
  for (const element of [...template.content.querySelectorAll('*')].reverse()) {
    if (['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH'].includes(element.tagName)) element.remove();
    else if (!allowed.has(element.tagName)) element.replaceWith(...element.childNodes);
    else for (const attr of [...element.attributes]) element.removeAttribute(attr.name);
  }
  return template.innerHTML;
}
function formatValue(key,value) {
  if (value==null||String(value).trim()===''||/^[-—–]$/.test(String(value).trim())) return '—';
  if (['range','speed','vision'].includes(key)) {
    const segments=String(value).split('/').map(x=>Number(x.replace(',','.')));
    if (segments.every(Number.isFinite)) return `${segments.map(x=>Number((x/1000).toFixed(3))).join(' / ')} ${segments.length===1&&segments[0]===1000?'tile':'tiles'}${key==='speed'?'/s':''}`;
  }
  return String(value);
}
function imageMarkup(def,className='card-art',fallbackClass='art-fallback',lazy=true) {
  const fallback=`<span class="${fallbackClass}"${def.image?' hidden':''}>${escapeHTML(initials(def.name))}</span>`;
  return (def.image?`<img class="${className}" src="${escapeHTML(def.image)}" alt="" ${lazy?'loading="lazy" ':''}draggable="false">`:'')+fallback;
}
function toast(message,error=false) {
  clearTimeout(state.toastTimer);
  $('toast').textContent=message;
  $('toast').dataset.error=String(error);
  $('toast').hidden=false;
  state.toastTimer=setTimeout(()=>{$('toast').hidden=true;},error?4600:2800);
}
function sourceValues(def) {return {...def.raw?.additionalStats,...def.raw?.stats};}
function spellCharge() { return state.spellDeck.reduce((sum,id)=>sum+(state.catalog.spellById.get(id)?.charge||0),0); }
function canStart() { return state.deck.length===RULES.deckSize&&state.spellDeck.length>0&&spellCharge()<=RULES.spellBudget&&state.deck.every(id=>state.catalog.byId.get(id)?.ready)&&state.spellDeck.every(id=>state.catalog.spellById.get(id)?.ready); }
function saveDeck() {try {localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,deck:state.deck,spells:state.spellDeck}));}catch {/* Storage is optional. */}}
function restoreDeck() {
  try {
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    if (!saved||saved.version!==1||!Array.isArray(saved.deck)||!Array.isArray(saved.spells)) return;
    state.deck=[...new Set(saved.deck.filter(id=>typeof id==='string'&&state.catalog.cards.some(c=>c.id===id&&c.ready)))].slice(0,8);
    state.spellDeck=[];
    for (const id of [...new Set(saved.spells)]) {
      const spell=state.catalog.spellById.get(id);
      if (spell?.ready&&spellCharge()+spell.charge<=5) state.spellDeck.push(id);
    }
  } catch {/* A corrupt or unavailable saved deck must not prevent play. */}
}
function toggleCard(id) {
  const card=state.catalog.byId.get(id);
  if (!card) return;
  if (!card.ready) {openInspector(card);return;}
  const index=state.deck.indexOf(id);
  if(index>=0)state.deck.splice(index,1);
  else if(state.deck.length<8)state.deck.push(id);
  else {toast('Your unit deck is full. Remove a card before adding another.',true);return;}
  updateDeck();
}
function toggleSpell(id) {
  const spell=state.catalog.spellById.get(id);
  if (!spell) return;
  if (!spell.ready) {openInspector(spell,'spell');return;}
  const index=state.spellDeck.indexOf(id);
  if(index>=0)state.spellDeck.splice(index,1);
  else if(spellCharge()+spell.charge<=5)state.spellDeck.push(id);
  else {toast(`That spell exceeds your 5-charge loadout. ${5-spellCharge()} charge remaining.`,true);return;}
  updateDeck();
}
function reorder(array,id,direction) {
  const from=array.indexOf(id),to=from+direction;
  if(from<0||to<0||to>=array.length)return;
  [array[from],array[to]]=[array[to],array[from]];
  updateDeck();
}
function quickBuild() {
  if (!state.catalog) return;
  const ready=state.catalog.cards.filter(c=>c.ready);
  const preferred=['hammies','scrapy','venomora','soldier','henry','hailey','nyra','aegis-guard'];
  state.deck=preferred.filter(id=>ready.some(c=>c.id===id));
  const cheapest=[...ready].sort((a,b)=>(a.stats.mana-b.stats.mana)||a.name.localeCompare(b.name));
  for(const card of cheapest)if(state.deck.length<8&&!state.deck.includes(card.id))state.deck.push(card.id);
  state.spellDeck=[];
  const spells=[...state.catalog.spells.filter(s=>s.ready)].sort((a,b)=>(a.energy-b.energy)||(a.charge-b.charge)||a.name.localeCompare(b.name));
  for (const spell of spells) if(state.spellDeck.length<3&&spellCharge()+spell.charge<=5)state.spellDeck.push(spell.id);
  updateDeck();
  if (!canStart()) toast('The source data does not yet contain a complete playable deck.',true);
  else toast('Your starter deck is ready. Reorder it to choose your opening hand.');
}
function updateDeck() {
  saveDeck();
  $('deck-count').textContent=`${state.deck.length} / 8`;
  $('average-mana').textContent=state.deck.length?(state.deck.reduce((sum,id)=>sum+state.catalog.byId.get(id).stats.mana,0)/state.deck.length).toFixed(1):'—';
  $('spell-load').textContent=`${spellCharge()} / 5 charge`;
  $('selected-deck').innerHTML=Array.from({length:8},(_,i)=>{
    const def=state.catalog.byId.get(state.deck[i]);
    if(!def)return `<div class="deck-slot empty"><strong>${String(i+1).padStart(2,'0')}</strong><span>UNIT SLOT</span></div>`;
    return `<article class="deck-slot" style="--rarity:${rarityColor(def)}">${imageMarkup(def,'','slot-art-fallback')}<span class="slot-mana">${def.stats.mana}</span><button type="button" class="slot-remove" data-remove-card="${escapeHTML(def.id)}" aria-label="Remove ${escapeHTML(def.name)}">×</button><div class="slot-content"><strong>${escapeHTML(def.name)}</strong><span>${i<4?'OPENING HAND':'NEXT IN CYCLE'}</span></div><div class="slot-reorder"><button type="button" data-move-card="${escapeHTML(def.id)}" data-direction="-1" aria-label="Move ${escapeHTML(def.name)} earlier" ${i===0?'disabled':''}>←</button><button type="button" data-move-card="${escapeHTML(def.id)}" data-direction="1" aria-label="Move ${escapeHTML(def.name)} later" ${i===state.deck.length-1?'disabled':''}>→</button></div></article>`;
  }).join('');
  $('selected-spells').innerHTML=state.spellDeck.length?state.spellDeck.map((id,i)=>{
    const def=state.catalog.spellById.get(id);
    return `<article class="spell-slot"><button type="button" class="slot-remove" data-remove-spell="${escapeHTML(id)}" aria-label="Remove ${escapeHTML(def.name)}">×</button><strong>${escapeHTML(def.name)}</strong><span>${def.charge} charge · ${def.energy} energy</span><div class="spell-order"><button type="button" data-move-spell="${escapeHTML(id)}" data-direction="-1" aria-label="Move ${escapeHTML(def.name)} earlier" ${i===0?'disabled':''}>←</button><button type="button" data-move-spell="${escapeHTML(id)}" data-direction="1" aria-label="Move ${escapeHTML(def.name)} later" ${i===state.spellDeck.length-1?'disabled':''}>→</button></div></article>`;
  }).join(''):'<div class="spell-empty">Add spells from the registry below.</div>';
  $('start-match').disabled=!canStart();
  $('start-hint').textContent=canStart()?'Ready for a fair battle against the bot.':`Choose ${8-state.deck.length} more unit${8-state.deck.length===1?'':'s'}${state.spellDeck.length?'':' and at least 1 spell'}.`;
  renderCatalog();
}
function populateFilters() {
  const entries=state.tab==='troops'?state.catalog.cards:state.catalog.spells;
  const rarities=[...new Set(entries.map(c=>String(c.rarity||c.raw?.rarity||'').toLowerCase()).filter(Boolean))];
  $('rarity-filter').innerHTML='<option value="all">All rarities</option>'+rarities.map(x=>`<option value="${escapeHTML(x)}">${escapeHTML(label(x))}</option>`).join('');
  const classes=[...new Set(entries.map(c=>c.raw?.class||c.raw?.type).filter(x=>typeof x==='string'))].sort();
  $('class-filter').innerHTML='<option value="all">All roles</option>'+classes.map(x=>`<option value="${escapeHTML(x)}">${escapeHTML(x)}</option>`).join('');
}
function setTab(tab) {
  state.tab=tab;
  $('troop-tab').setAttribute('aria-selected',String(tab==='troops'));
  $('spell-tab').setAttribute('aria-selected',String(tab==='spells'));
  $('catalog-grid').setAttribute('aria-labelledby',tab==='troops'?'troop-tab':'spell-tab');
  populateFilters();renderCatalog();
}
function renderCatalog() {
  if (!state.catalog) return;
  const isSpell=state.tab==='spells',entries=isSpell?state.catalog.spells:state.catalog.cards;
  const query=$('card-search').value.trim().toLowerCase(),readiness=$('readiness-filter').value,rarity=$('rarity-filter').value,role=$('class-filter').value;
  const shown=entries.filter(def=>{
    const haystack=[def.name,def.raw?.class,def.raw?.subclass,...(Array.isArray(def.type)?def.type:[def.type||'']),def.raw?.group].join(' ').toLowerCase();
    return (!query||haystack.includes(query))&&(readiness==='all'||def.ready===(readiness==='ready'))&&(rarity==='all'||String(def.rarity||def.raw?.rarity).toLowerCase()===rarity)&&(role==='all'||(def.raw?.class||def.raw?.type)===role);
  }).sort((a,b)=>Number(b.ready)-Number(a.ready));
  $('catalog-summary').textContent=`${shown.length} ${isSpell?'spells':'units'} · ${entries.filter(c=>c.ready).length} battle-ready`;
  $('catalog-grid').innerHTML=shown.length?shown.map(def=>{
    const selected=(isSpell?state.spellDeck:state.deck).includes(def.id),roleText=isSpell?`${label(def.kind||def.spellkind||def.raw?.type)} · ${def.charge} charge`:[def.raw?.class,def.raw?.subclass].filter(Boolean).join(' / ');
    const reason=def.reasons?.[0]||'Required battle information is missing.';
    return `<article class="library-card ${def.ready?'':'locked'} ${selected?'selected':''} ${isSpell?'spell-card':''}" style="--rarity:${rarityColor(def)}"><button type="button" class="card-pick" data-add-${isSpell?'spell':'card'}="${escapeHTML(def.id)}" aria-label="${def.ready?(selected?'Remove':'Add'):'Inspect locked'} ${escapeHTML(def.name)}" aria-pressed="${selected}"><div class="catalog-art">${imageMarkup(def)}</div><div class="card-tile-body"><strong>${escapeHTML(def.name)}</strong><span class="card-role">${escapeHTML(roleText||label(def.rarity))}</span><div class="card-footer"><span>${escapeHTML(def.ready?(selected?'IN YOUR DECK':'BATTLE-READY'):reason)}</span><span class="card-cost ${isSpell?'spell-cost':''}">${isSpell?`${def.energy} E`:`${def.stats.mana} M`}</span></div></div>${selected?'<span class="card-selected-mark"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg></span>':!def.ready?'<span class="card-locked-mark"><i class="small-lock" aria-hidden="true"></i> NEEDS DATA</span>':''}</button><button type="button" class="card-info" data-inspect-${isSpell?'spell':'card'}="${escapeHTML(def.id)}" aria-label="Inspect ${escapeHTML(def.name)}">i</button></article>`;
  }).join(''):'<div class="empty-catalog"><strong>No entries found.</strong>Try another search or clear a filter.</div>';
}

function profileMarkup(def) {
  const p=def.raw?.combatStats||def.combat||{},distanceValue=p.attackDistanceMatchesRange?num(def.raw?.additionalStats?.range):p.attackDistance;
  const pairs=[['Attack Distance',formatValue('range',distanceValue)],['Projectile Width',formatValue('range',p.attackWidth??(p.multiTarget===false?500:null))],['Attack Arc',p.attackSequence?p.attackSequence.map(x=>x.attackAngle?`${x.attackAngle}°`:'—').join(' / '):p.attackAngle!=null?`${p.attackAngle}°`:'—'],['Attack Shape',label(p.attackShape)||'—'],['Attack Type',label(p.attackType)||'—'],['Multiple Targets',p.attackSequence?'Conditional':p.multiTarget?(p.maxTargets?`Up to ${p.maxTargets}`:'Targets in area'):'Single target'],['Targets',p.targets==='both'?'Ground & air':label(p.targets)||'—'],['Movement',label(p.movementType)||'—'],['Ground Effect Immunity',p.groundEffectImmune?'Yes':'No'],['Weight',label(p.weight)||'—'],['Creature Type',(Array.isArray(def.type)?def.type:[def.type||'']).join(' / ')||'—'],['Impact Area',p.impactSize||'—'],['End of Attack',p.projectileEndEffect==='explode'?'Explodes':'—']];
  return pairs.map(([name,value])=>`<div class="profile-item"><span>${name}</span><strong>${escapeHTML(value)}</strong></div>`).join('');
}
function openInspector(def,kind='card',unit=null) {
  if(!def)return;
  if(unit&&state.engine&&state.engine.state.phase!=='ended'&&!isEntityVisible(state.engine.state,0,unit))return;
  state.inspectorDefinition={def,kind,unit};
  if(unit)state.selectedUnitId=unit.id;
  const raw=def.raw||{},values=sourceValues(def),locked=!def.ready,canAdd=kind==='spell'||state.catalog.cards.some(c=>c.id===def.id);
  const selected=(kind==='spell'?state.spellDeck:state.deck).includes(def.id);
  const image=def.image?`<img src="${escapeHTML(def.image)}" alt="" draggable="false"><span class="art-initials" hidden>${escapeHTML(initials(def.name))}</span>`:`<span class="art-initials">${escapeHTML(initials(def.name))}</span>`;
  const stats=kind==='spell'?Object.entries(raw.stats||{}).map(([key,value])=>`<div class="inspector-stat" data-spell-stat="${escapeHTML(key)}"><span>${escapeHTML(({damageToCard:'Unit Damage',damageToCastle:'Castle Damage',timeBetweenDamage:'Hit Interval',energy:'Energy',charge:'Charge',lifetime:'Lifetime',attackSpeed:'Attack Speed'})[key]||label(key))}</span><strong>${escapeHTML(formatValue(key,value))}</strong></div>`).join(''):STAT_ORDER.map(key=>{
    let value=values[key];
    if(unit&&key==='health')value=`${Math.ceil(unit.hp)} / ${Math.ceil(unit.maxHp)}`;
    if(unit&&key==='shield')value=`${Math.ceil(unit.shield)} / ${Math.ceil(unit.maxShield)}`;
    return `<div class="inspector-stat" data-stat="${key}"><span>${STAT_LABELS[key]}</span><strong>${escapeHTML(formatValue(key,value))}</strong></div>`;
  }).join('');
  const ability=raw.trait??raw.treat??'';
  const forms=[...(def.forms||[]),...(def.typeVariants||[])];
  $('inspector').style.setProperty('--rarity',rarityColor(def));
  $('inspector-content').innerHTML=`<div class="inspector-layout"><div class="inspector-art">${image}<div class="inspector-identity"><span class="identity-class">${escapeHTML([raw.class,raw.subclass].filter(Boolean).join(' / ')||label(raw.type||kind))}</span><h2 id="inspector-name">${escapeHTML(def.name)}</h2><span class="identity-faction">${escapeHTML(label(raw.group||'The Stagnantia Project'))}</span></div></div><div class="inspector-body"><div class="inspector-status ${locked?'locked':''}"><i></i>${locked?'Battle data incomplete':'Battle-ready'}${unit?' · Battle paused for inspection':''}</div>${locked?`<ul class="readiness-list">${(def.reasons||['Required battle data is missing.']).map(reason=>`<li>${escapeHTML(reason)}</li>`).join('')}</ul>`:''}<h3>${kind==='spell'?'Spell Parameters':'All Statistics'}</h3><div class="inspector-stat-grid">${stats}</div>${kind==='card'?`<h3>Combat Profile</h3><div class="profile-grid">${profileMarkup(def)}</div>`:''}<h3>Ability</h3><div class="native-ability" lang="az">${raw.abilityName?`<strong class="ability-name">${escapeHTML(raw.abilityName)}</strong>`:''}${ability&&ability!=='-'?nativeHTML(ability):'<span>No additional ability is specified.</span>'}</div><p class="inspector-native-note">Original Codex ability text. Source DPS is informational.</p>${forms.length?`<h3>Forms</h3><div>${forms.map(form=>`<button type="button" class="inspector-form-button" data-inspect-card="${escapeHTML(form.id)}">${escapeHTML(form.name)}</button>`).join('')}</div>`:''}${raw.showlevels?`<details><summary>Star levels</summary><ol class="inspector-levels" lang="az">${Object.values(raw.showlevels).map(x=>`<li>${nativeHTML(x)}</li>`).join('')}</ol><p>Star upgrades are shown for reference. Arena deployment uses the base Codex stats.</p></details>`:''}${raw.story&&raw.story!=='-'?`<details><summary>Lore</summary><p>${escapeHTML(raw.story).replace(/\n/g,'<br>')}</p></details>`:''}<div class="inspector-actions">${canAdd&&!state.engine?`<button type="button" class="primary-button" data-add-${kind==='spell'?'spell':'card'}="${escapeHTML(def.id)}" ${locked?'disabled':''}>${selected?'Remove from deck':'Add to deck'}</button>`:''}<button type="button" class="text-button" data-close-inspector>Close details</button></div></div></div>`;
  if(!$('inspector').open)$('inspector').showModal();
  setPause('inspector',true);
}
function closeInspector() {
  $('inspector').close();
  state.inspectorDefinition=null;
  setPause('inspector',false);
}
function setPause(reason,on) {
  if(on)state.pauseReasons.add(reason);else state.pauseReasons.delete(reason);
  if(!state.engine)return;
  state.engine.setPaused(state.pauseReasons.size>0);
  const manual=state.pauseReasons.has('manual')||state.pauseReasons.has('visibility');
  $('pause-overlay').hidden=!manual||state.engine.state.phase==='ended';
  $('pause-message').textContent=state.pauseReasons.has('visibility')?'The battle paused while this page was hidden. Resume when you are ready.':'The arena is paused. Neither side can act.';
  $('pause-button').textContent=manual?'Resume':'Pause';
}
function resumeMatch() {setPause('manual',false);setPause('visibility',false);}
function togglePause() {
  if(!state.engine||state.engine.state.phase==='ended')return;
  if(state.pauseReasons.has('manual')||state.pauseReasons.has('visibility'))resumeMatch();else setPause('manual',true);
}
function startMatch() {
  if(!canStart()){toast('Complete your 8-card deck and a valid spell loadout first.',true);return false;}
  try {
    if($('inspector').open)closeInspector();
    state.pauseReasons.clear();
    state.engine=new ArenaEngine({cards:state.catalog.cards,spells:state.catalog.spells,deck:[...state.deck],spellDeck:[...state.spellDeck],seed:state.seed++,bot:true});
    state.selection=null;state.pointer=null;state.drag=null;state.selectedUnitId=null;state.resultShown=false;state.handSignature='';state.spellSignature='';state.lastHUD=0;
    document.body.dataset.mode='battle';
    document.querySelectorAll('.battle-only').forEach(el=>{el.hidden=false;});
    $('pause-overlay').hidden=true;$('result-overlay').hidden=true;
    $('stage-message').textContent='Choose a road or courtyard within 7.5 tiles of your citadel.';
    $('stage-message').classList.remove('warning');
    state.renderer.resize();
    updateHUD(true);
    window.scrollTo({top:0,behavior:'instant'});
    $('arena-canvas').focus({preventScroll:true});
    return true;
  } catch (error) {toast(`Unable to start this deck: ${error.message}`,true);return false;}
}
function returnToLobby() {
  if(state.engine)state.engine.setPaused(true);
  state.engine=null;state.selection=null;state.pointer=null;state.pauseReasons.clear();state.selectedUnitId=null;state.drag=null;
  document.body.dataset.mode='lobby';
  document.querySelectorAll('.battle-only').forEach(el=>{el.hidden=true;});
  $('pause-overlay').hidden=true;$('result-overlay').hidden=true;
  if($('inspector').open)closeInspector();
  state.renderer.resize();
  window.scrollTo({top:0,behavior:'instant'});
}
function selectedDefinition() {
  if(!state.engine||!state.selection)return null;
  const team=state.engine.state.teams[0];
  return state.selection.kind==='spell'?state.catalog.spellById.get(team.spellIds[team.spellIndex]):state.catalog.byId.get(team.hand[state.selection.handIndex]);
}
function selectHand(index) {
  if(!state.engine||state.engine.state.phase==='ended'||state.engine.state.paused)return;
  if(!state.engine.state.teams[0].hand[index])return;
  state.selection={kind:'card',handIndex:index};
  state.pointer=null;
  const def=selectedDefinition();
  stageMessage(`Place ${def.name} on a road or courtyard within 7.5 tiles of your citadel. ${def.stats.mana} mana.`);
  state.handSignature='';updateHUD(true);
}
function selectSpell() {
  if(!state.engine||state.engine.state.phase==='ended'||state.engine.state.paused)return;
  state.selection={kind:'spell'};state.pointer=null;
  const def=selectedDefinition();
  if(!def){state.selection=null;return;}
  stageMessage(`${def.name} · Choose ${def.kind==='building'||def.spellkind==='building'?'a road or courtyard within your citadel’s 7.5-tile range':'a target area'}. ${def.energy} energy.`);
  state.spellSignature='';updateHUD(true);
}
function clearSelection() {
  state.selection=null;state.pointer=null;state.drag=null;
  stageMessage('Select a card, then place it in the highlighted deployment area.');
  state.handSignature='';state.spellSignature='';updateHUD(true);
}
function stageMessage(message,warning=false) { $('stage-message').textContent=message;$('stage-message').classList.toggle('warning',warning); }
function isValidPlacement(point) {
  if(!state.engine||!state.selection||!point)return false;
  const def=selectedDefinition(),team=state.engine.state.teams[0];
  if(!def)return false;
  const visibleOccupants=state.engine.state.units.filter(u=>u.alive&&isEntityVisible(state.engine.state,0,u));
  if(state.selection.kind==='card')return team.mana+1e-6>=def.stats.mana&&isDeployable(point,0,visibleOccupants);
  if(team.energy+1e-6<def.energy)return false;
  if(def.kind==='building'||def.spellkind==='building')return isDeployable(point,0,visibleOccupants);
  return point.x>=0&&point.x<=MAP.width&&point.y>=0&&point.y<=MAP.height;
}
function commitPlacement(point) {
  if(!state.engine||state.engine.state.paused||state.engine.state.phase==='ended')return;
  if(!state.selection){inspectAt(point);return;}
  const def=selectedDefinition();
  const result=state.selection.kind==='spell'?state.engine.cast(0,point):state.engine.deploy(0,state.selection.handIndex,point);
  if(result?.ok){const wasSpell=state.selection.kind==='spell';clearSelection();stageMessage(`${def.name} ${def.kind==='building'||def.spellkind==='building'?'placed':wasSpell?'cast':'deployed'}.`);updateHUD(true);}
  else {const message=result?.error||'Choose an open path on your side of the arena.';stageMessage(message,true);toast(message,true);}
}
function inspectAt(point) {
  const battle=state.engine.state;
  if(battle.phase!=='ended'&&!isPointVisible(battle,0,point))return;
  const candidates=[...battle.units,...battle.castles].filter(u=>u.alive!==false&&u.hp>0&&(battle.phase==='ended'||isEntityVisible(battle,0,u)));
  const unit=candidates.map(u=>({u,d:distance(u,point)})).filter(x=>x.d<Math.max(.65,(x.u.radius||0)+.25)).sort((a,b)=>a.d-b.d)[0]?.u;
  if(!unit)return;
  if(unit.def){openInspector(unit.def,unit.isBuilding?'spell':'card',unit);return;}
  if(unit.isCastle){
    const range=RULES.castleRange*1000;
    const def={id:`castle-${unit.side}`,name:unit.side===0?'Azure Citadel':'Crimson Citadel',ready:true,type:['Citadel'],rarity:'mundane',stats:unit.stats||{},raw:{class:'Citadel',subclass:'Defender',stats:{health:RULES.castleHealth,shield:0,damage:RULES.castleDamage,attackSpeed:`${RULES.castleInterval.toFixed(2)}s`,sps:RULES.castleDamage/RULES.castleInterval,mana:'—',number:1},additionalStats:{range,speed:0,vision:range},combatStats:{attackType:'ranged',attackDistance:range,attackWidth:500,targets:'both',movementType:'ground',multiTarget:false,weight:'very-heavy'},trait:'',story:'The heart of your command. Its destruction ends the battle.'}};
    openInspector(def,'card',unit);
  }
}
function updateHUD(force=false) {
  if(!state.engine)return;
  const s=state.engine.state,team=s.teams[0];
  if(s.phase==='ended'&&!state.resultShown)force=true;
  if(!force&&s.time-state.lastHUD<.09)return;
  state.lastHUD=s.time;
  const mana=Math.max(0,team.mana),energy=Math.max(0,team.energy);
  $('mana-value').innerHTML=`${Math.floor(mana)}<span>/20</span>`;
  $('mana-fill').style.width=`${Math.min(100,mana/20*100)}%`;
  $('energy-value').textContent=energy.toFixed(2);
  const owned=(s.nodes||[]).filter(n=>n.owner===0).length;
  $('mana-bonus').textContent=`+${owned*2}%`;
  const remaining=Math.max(0,Math.ceil(s.remaining||0));
  $('match-clock').textContent=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
  $('match-phase').textContent=s.phase==='overtime'?'OVERTIME · 2× MANA':s.phase==='ended'?'BATTLE COMPLETE':'REGULATION';
  $('match-phase').parentElement.classList.toggle('overtime',s.phase==='overtime');
  for(const [side,prefix] of [[0,'player'],[1,'enemy']]){
    const castle=s.castles.find(c=>c.side===side)||s.castles[side];
    const visible=side===0||s.phase==='ended'||!!castle&&isEntityVisible(s,0,castle);
    const element=$(`${prefix}-castle-hp`);
    element.textContent=visible?Math.ceil(Math.max(0,castle?.hp||0)).toLocaleString('en-US'):'?';
    element.setAttribute('aria-label',visible?`${prefix==='player'?'Your':'Enemy'} citadel: ${Math.ceil(Math.max(0,castle?.hp||0))} health`:'Enemy citadel health is hidden in the fog');
    element.closest('.citadel-status').dataset.visible=String(visible);
    $(`${prefix}-castle-bar`).style.width=visible?`${Math.max(0,(castle?.hp||0)/1000*100)}%`:'0%';
  }
  $('node-hud').innerHTML=(s.nodes||MAP.nodes).map(n=>{
    const visible=s.phase==='ended'||isPointVisible(s,0,n);
    const owner=visible?(n.owner===0?'0':n.owner===1?'1':'neutral'):'unknown';
    return `<span class="node-indicator ${visible?(n.owner===0?'azure':n.owner===1?'crimson':''):'unknown'}" data-owner="${owner}" aria-label="${escapeHTML(n.name||n.id)}: ${visible?(n.owner===0?'Azure Core':n.owner===1?'Crimson Crown':'Neutral'):'Unseen'}"><i></i><span>${escapeHTML((n.name||n.id).toUpperCase())}</span><b style="width:${visible?Math.max(0,Math.min(100,(n.progress||0)/5*100)):0}%"></b></span>`;
  }).join('');
  const handKey=JSON.stringify([team.hand,team.hand.map(id=>mana>=(state.catalog.byId.get(id)?.stats.mana||0)),state.selection]);
  if(force||handKey!==state.handSignature){
    state.handSignature=handKey;
    $('hand-cards').innerHTML=team.hand.map((id,i)=>{
      const def=state.catalog.byId.get(id);if(!def)return '';
      return `<button type="button" class="hand-card ${mana<def.stats.mana?'unaffordable':''} ${state.selection?.kind==='card'&&state.selection.handIndex===i?'selected':''}" data-hand-index="${i}" aria-label="${escapeHTML(def.name)}, ${def.stats.mana} mana, key ${i+1}" aria-pressed="${state.selection?.kind==='card'&&state.selection.handIndex===i}">${imageMarkup(def,'','hand-placeholder',false)}<span class="hand-cost">${def.stats.mana}</span><span class="hand-key">${i+1}</span><span class="hand-name">${escapeHTML(def.name)}</span></button>`;
    }).join('');
    const next=state.catalog.byId.get(team.queue?.[0]);
    $('next-card').innerHTML=next?`<span class="micro-label">UP NEXT</span><div class="next-card-art">${imageMarkup(next,'','',false)}</div><span>${escapeHTML(next.name)}</span>`:'';
  }
  const spellId=team.spellIds[team.spellIndex],spell=state.catalog.spellById.get(spellId),spellKey=JSON.stringify([spellId,energy>=(spell?.energy||0),state.selection?.kind]);
  if(force||spellKey!==state.spellSignature){
    state.spellSignature=spellKey;
    const next=state.catalog.spellById.get(team.spellIds[(team.spellIndex+1)%team.spellIds.length]);
    $('spell-command').innerHTML=spell?`<span class="micro-label">ACTIVE SPELL <kbd>Q</kbd></span><button type="button" id="active-spell" class="spell-button ${energy<spell.energy?'unaffordable':''} ${state.selection?.kind==='spell'?'selected':''}" aria-pressed="${state.selection?.kind==='spell'}" aria-label="${escapeHTML(spell.name)}, ${spell.energy} energy"><strong>${escapeHTML(spell.name)}</strong><span>${spell.energy} ENERGY · ${spell.charge} CHARGE</span></button><span>${team.spellIds.length>1?`NEXT: ${escapeHTML(next?.name||'')}`:'CAST TO REUSE'}</span>`:'';
  }
  if(s.phase==='ended'&&!state.resultShown)showResult();
}
function showResult() {
  state.resultShown=true;state.selection=null;state.drag=null;state.pointer=null;
  const s=state.engine.state,winner=s.winner;
  const result=winner===0?'victory':winner===1?'defeat':'draw';
  $('result-overlay').dataset.result=result;
  $('result-title').textContent=result==='victory'?'The crown is yours.':result==='defeat'?'A citadel has fallen.':'Neither crown yields.';
  $('result-eyebrow').textContent=result==='victory'?'AZURE CORE VICTORY':result==='defeat'?'CRIMSON CROWN VICTORY':'DRAW';
  $('result-summary').textContent=result==='victory'?'Your command held. The enemy citadel is broken or outlasted.':result==='defeat'?'The Crimson Crown prevailed. Rework your deck and reclaim the paths.':'The battle ended with equal citadel health. The frontier remains contested.';
  $('result-player-hp').textContent=Math.ceil(Math.max(0,s.castles.find(c=>c.side===0)?.hp||0));
  $('result-enemy-hp').textContent=Math.ceil(Math.max(0,s.castles.find(c=>c.side===1)?.hp||0));
  $('pause-overlay').hidden=true;$('result-overlay').hidden=false;
  $('play-again').focus({preventScroll:true});
}
function animationFrame(now) {
  const dt=state.lastFrame?Math.min(.1,(now-state.lastFrame)/1000):0;
  state.lastFrame=now;
  if(state.engine){
    if(!state.engine.state.paused&&state.engine.state.phase!=='ended')state.engine.step(dt);
    const battle=state.engine.state;
    if(state.selectedUnitId&&battle.phase!=='ended') {
      const selected=[...battle.units,...battle.castles].find(unit=>unit.id===state.selectedUnitId);
      if(!selected||!isEntityVisible(battle,0,selected)){
        state.selectedUnitId=null;
        if(state.inspectorDefinition?.unit)closeInspector();
      }
    }
    updateHUD();
  }
  if(state.renderer){
    const def=selectedDefinition();
    state.renderer.draw(state.engine?.state||null,{placement:state.pointer&&state.selection?{...state.pointer,valid:isValidPlacement(state.pointer)}:null,selectedCard:def,selectedUnitId:state.selectedUnitId,spellSelected:state.selection?.kind==='spell'});
  }
  state.frame=requestAnimationFrame(animationFrame);
}
function inCanvas(x,y) {const r=$('arena-canvas').getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}

document.addEventListener('error',event=>{
  const img=event.target;if(!(img instanceof HTMLImageElement))return;
  img.hidden=true;const fallback=img.nextElementSibling;if(fallback)fallback.hidden=false;
},true);
document.addEventListener('click',event=>{
  const target=event.target.closest('button');if(!target)return;
  if(target.dataset.addCard){toggleCard(target.dataset.addCard);if($('inspector').open&&state.inspectorDefinition){const {def,kind,unit}=state.inspectorDefinition;openInspector(def,kind,unit);}return;}
  if(target.dataset.addSpell){toggleSpell(target.dataset.addSpell);if($('inspector').open&&state.inspectorDefinition){const {def,kind,unit}=state.inspectorDefinition;openInspector(def,kind,unit);}return;}
  if(target.dataset.inspectCard){openInspector(state.catalog.byId.get(target.dataset.inspectCard));return;}
  if(target.dataset.inspectSpell){openInspector(state.catalog.spellById.get(target.dataset.inspectSpell),'spell');return;}
  if(target.dataset.removeCard){state.deck=state.deck.filter(id=>id!==target.dataset.removeCard);updateDeck();return;}
  if(target.dataset.removeSpell){state.spellDeck=state.spellDeck.filter(id=>id!==target.dataset.removeSpell);updateDeck();return;}
  if(target.dataset.moveCard){reorder(state.deck,target.dataset.moveCard,Number(target.dataset.direction));return;}
  if(target.dataset.moveSpell){reorder(state.spellDeck,target.dataset.moveSpell,Number(target.dataset.direction));return;}
  if(target.hasAttribute('data-close-inspector')){closeInspector();return;}
  if(target.hasAttribute('data-hand-index')&&event.detail===0){selectHand(Number(target.dataset.handIndex));return;}
  if(target.id==='active-spell'){selectSpell();return;}
});
$('quick-build').addEventListener('click',quickBuild);
$('clear-deck').addEventListener('click',()=>{state.deck=[];state.spellDeck=[];updateDeck();});
$('start-match').addEventListener('click',startMatch);
$('troop-tab').addEventListener('click',()=>setTab('troops'));
$('spell-tab').addEventListener('click',()=>setTab('spells'));
for(const id of ['card-search','readiness-filter','rarity-filter','class-filter'])$(id).addEventListener(id==='card-search'?'input':'change',renderCatalog);
$('pause-button').addEventListener('click',togglePause);
$('resume-button').addEventListener('click',resumeMatch);
$('restart-button').addEventListener('click',startMatch);
$('play-again').addEventListener('click',startMatch);
for(const id of ['return-lobby','pause-edit-deck','result-edit-deck'])$(id).addEventListener('click',returnToLobby);
$('inspector-close').addEventListener('click',closeInspector);
$('inspector').addEventListener('cancel',event=>{event.preventDefault();closeInspector();});
$('inspector').addEventListener('click',event=>{if(event.target===$('inspector')){const r=$('inspector').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeInspector();}});
$('guide-button').addEventListener('click',()=>{$('guide-dialog').showModal();setPause('guide',true);});
function closeGuide(){$('guide-dialog').close();setPause('guide',false);}
$('guide-close').addEventListener('click',closeGuide);$('guide-done').addEventListener('click',closeGuide);$('guide-dialog').addEventListener('cancel',event=>{event.preventDefault();closeGuide();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.engine&&state.engine.state.phase!=='ended')setPause('visibility',true);});
document.addEventListener('keydown',event=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName)||$('inspector').open||$('guide-dialog').open)return;
  if(!state.engine)return;
  if(/^[1-4]$/.test(event.key)){event.preventDefault();selectHand(Number(event.key)-1);}
  else if(event.key.toLowerCase()==='q'){event.preventDefault();selectSpell();}
  else if(event.key==='Escape'){event.preventDefault();state.selection?clearSelection():togglePause();}
  else if(event.key.toLowerCase()==='p'){event.preventDefault();togglePause();}
});
document.addEventListener('pointerdown',event=>{
  if(!state.engine||state.engine.state.paused||state.engine.state.phase==='ended')return;
  const hand=event.target.closest('[data-hand-index]');
  if(hand){selectHand(Number(hand.dataset.handIndex));state.drag={pointerId:event.pointerId,fromHand:true,x:event.clientX,y:event.clientY};try{hand.setPointerCapture(event.pointerId);}catch{}return;}
  if(event.target===$('arena-canvas')){state.drag={pointerId:event.pointerId,fromHand:false,x:event.clientX,y:event.clientY};state.pointer=state.renderer.worldAt(event.clientX,event.clientY);}
});
window.addEventListener('pointermove',event=>{
  if(!state.engine||!state.selection||state.engine.state.paused)return;
  if(inCanvas(event.clientX,event.clientY))state.pointer=state.renderer.worldAt(event.clientX,event.clientY);
  else state.pointer=null;
});
window.addEventListener('pointerup',event=>{
  const drag=state.drag;if(!drag||drag.pointerId!==event.pointerId)return;
  state.drag=null;
  if(inCanvas(event.clientX,event.clientY))commitPlacement(state.renderer.worldAt(event.clientX,event.clientY));
});
window.addEventListener('pointercancel',()=>{state.drag=null;state.pointer=null;});
window.addEventListener('resize',()=>state.renderer?.resize());
window.addEventListener('pagehide',()=>{if(state.engine)setPause('visibility',true);});

async function load() {
  $('loading-state').hidden=false;$('error-state').hidden=true;$('app-content').hidden=true;
  try {
    state.catalog=await loadCatalog();
    if(!state.catalog.cards?.length||!state.catalog.spells?.length)throw new Error('The registry returned no cards or spells. Serve this page over HTTP and try again.');
    $('app-content').hidden=false;$('loading-state').hidden=true;
    state.renderer?.destroy();state.renderer=new ArenaRenderer($('arena-canvas'));
    $('troop-total').textContent=state.catalog.cards.length;$('spell-total').textContent=state.catalog.spells.length;
    const ready=state.catalog.cards.filter(c=>c.ready).length;
    $('roster-summary').textContent=`${state.catalog.cards.length} Codex units. ${ready} ready for battle. Complete data comes first.`;
    restoreDeck();populateFilters();updateDeck();
    if(!state.frame)state.frame=requestAnimationFrame(animationFrame);
  } catch(error) {
    console.error('Arena registry load failed:',error);
    $('loading-state').hidden=true;$('app-content').hidden=true;$('error-state').hidden=false;
    $('load-error-message').textContent=error.message||'Check your connection and try again.';
  }
}
$('retry-load').addEventListener('click',load);
window.arenaApp={
  get catalog(){return state.catalog;},get engine(){return state.engine;},get renderer(){return state.renderer;},get deck(){return [...state.deck];},get spellDeck(){return [...state.spellDeck];},get selection(){return state.selection;},
  startMatch,returnToLobby,quickBuild,selectHand,selectSpell,clearSelection,
};
load();
