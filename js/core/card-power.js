/* Fixed 1000-point Power model, shared by Codex, Arena and the ranking script. */
(function(root){
'use strict';
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const limits=Object.freeze({health:1000,shield:1000,damage:200,attackSpeed:.1,attackSpeedWorst:50,delay:.1,delayWorst:5,sps:2000,mana:20,number:15,range:15000,speed:3000,criticalChance:100,criticDamage:5,lifestealChance:100,lifesteal:100,dodge:70,vision:21000,healBonus:100,healrecovery:10,shieldrecovery:10,criticdamageminimiser:90,damageminimiser:90,flexibility:80,shieldtakendamage:100,life:200});
const num=(value,fallback=0)=>{const n=parseFloat(String(value??'').split('/')[0].replace(/,/g,'.'));return Number.isFinite(n)?Math.max(0,n):fallback;};
function damage(value){const parts=String(value??'').split('/')[0].replace(/,/g,'.').split(/[x×]/i);return parts.length===2?{count:Math.max(1,num(parts[0],1)),perHit:num(parts[1])}:{count:1,perHit:num(value)};}
function dps(stats={}){const d=damage(stats.damage),cycle=d.count*num(stats.attackSpeed)+num(stats.delay);return cycle>0?d.count*d.perHit/cycle:d.count*d.perHit;}
function recovery(value){const parts=String(value??'').replace(/,/g,'.').split('/');return parts.length===2&&num(parts[1])>0?num(parts[0])/num(parts[1]):num(value);}
function area(value){const parts=String(value??'').replace(/,/g,'.').match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);return parts?Number(parts[1])*Number(parts[2]):0;}
const signature=c=>JSON.stringify([c.id||'',c.name||'',c.trait??c.treat??'']);
const passiveRatings=new Map((root.ClashPassivePower||[]).filter(e=>!e.derived).map(e=>[e.signature,e]));
function passive(card){
  const entry=passiveRatings.get(signature(card));
  return {points:entry?Math.max(0,Math.min(200,entry.score)):0,max:200,reviewed:!!entry,key:entry?.key||null};
}
function group(values,budget,minimum){const max=budget/values.length;return {max:budget,points:0,entries:values.map(([key,label,ratio])=>({key,label,normalized:clamp(ratio),min:minimum,max,points:minimum+(max-minimum)*clamp(ratio)}))};}
function sum(group){group.points=group.entries.reduce((n,e)=>n+e.points,0);return group;}
function average(items){return items.reduce((n,v)=>n+v,0)/items.length;}
function combine(forms){
  const groups={};for(const key of['primary','secondary','combat']){
    const entries=forms[0].groups[key].entries.map((entry,i)=>({...entry,normalized:average(forms.map(f=>f.groups[key].entries[i].normalized)),points:average(forms.map(f=>f.groups[key].entries[i].points))}));
    groups[key]={max:forms[0].groups[key].max,points:average(forms.map(f=>f.groups[key].points)),entries};
  }
  const p={points:average(forms.map(f=>f.passive.points)),max:200,reviewed:forms.every(f=>f.passive.reviewed),key:null};
  return finish(groups,p,forms);
}
function finish(groups,p,forms=[]){const stats=Object.values(groups).reduce((n,g)=>n+g.points,0),total=stats+p.points;return {version:2,max:1000,total,score:Math.round(total),stats,groups,passive:p,forms};}
function breakdown(card={}){
  if(card.isDual){const forms=[card.type1,card.type2].filter(Boolean).map(breakdown);if(forms.length)return combine(forms);}
  if(!card.powerMode){
    const fields=[['stats','damage'],['stats','attackSpeed'],['stats','delay'],['additionalStats','range']],count=Math.max(...fields.map(([bucket,key])=>String(card[bucket]?.[key]??'').split('/').length));
    if(count>1)return combine(Array.from({length:count},(_,i)=>{const mode={...card,powerMode:true,stats:{...card.stats},additionalStats:{...card.additionalStats}};for(const[bucket,key]of fields){const values=String(card[bucket]?.[key]??'').split('/');mode[bucket][key]=values[i]??values[0];}return breakdown(mode);}));
  }
  const s=card.stats||{},a=card.additionalStats||{},p=card.combatStats||{},d=damage(s.damage),interval=num(s.attackSpeed),delay=num(s.delay),hasDelay=delay>0;
  const best=d.count*.1+(hasDelay?.1:0),worst=d.count*50+(hasDelay?5:0),cycle=d.count*interval+delay;
  const crit=clamp(num(a.criticalChance)/100)*clamp((num(a.criticDamage,1)-1)/4);
  const primary=sum(group([
    ['health','Health',num(s.health)/1000],['shield','Shield',num(s.shield)/1000],['damage','Damage',d.count*d.perHit/200],
    ['attackCycle','Attack Speed + Delay',interval>0?1-(cycle-best)/(worst-best):0],['mana','Mana',1-num(s.mana,20)/20],['number','Count',num(s.number)/15],
    ['range','Range',num(a.range)/15000],['speed','Speed',num(a.speed)/3000],['critical','Critical Chance × Bonus Damage',crit],['lifesteal','Lifesteal Chance × Lifesteal',clamp(num(a.lifestealChance)/100)*clamp(num(a.lifesteal)/100)]
  ],500,10));
  const secondary=sum(group([
    ['dodge','Dodge Chance',num(a.dodge)/70],['vision','Vision',num(a.vision)/21000],['healBonus','Healing Bonus',num(a.healBonus)/100],
    ['healrecovery','Rejuvenation',recovery(a.healrecovery)/10],['shieldrecovery','Fortification',recovery(a.shieldrecovery)/10],
    ['criticdamageminimiser','Critical Resistance',num(a.criticdamageminimiser)/90],['damageminimiser','Damage Reduction',num(a.damageminimiser)/90],
    ['flexibility','Flexibility',num(a.flexibility)/80],['shieldtakendamage','Shield Depletion',1-num(a.shieldtakendamage,70)/100]
  ],100,1));
  const sequence=Array.isArray(p.attackSequence)&&p.attackSequence.length?p.attackSequence.map(step=>({...p,...step,attackSequence:undefined})):null;
  const profile=profile=>{
    const distance=profile.attackDistanceMatchesRange?Math.max(...String(a.range||0).split('/').map(v=>num(v))):num(profile.attackDistance),width=profile.attackWidth==null&&profile.multiTarget===false&&profile.attackType!=='none'?500:num(profile.attackWidth);
    const arc=profile.attackAngle==null&&profile.attackShape==='cone'&&distance>0?2*Math.atan(width/(2*distance))*180/Math.PI:num(profile.attackAngle);
    const r=distance/1000,w=width/1000,impact=area(profile.impactSize),multi=profile.multiTarget===true;
    const coverage=profile.attackShape==='circle'?Math.PI*r*r:profile.attackShape==='cone'?Math.PI*r*r*arc/360:profile.attackShape==='line'?r*w:profile.attackShape==='square'?impact||r*w:profile.attackShape==='multi'?(profile.maxTargets==null?15:num(profile.maxTargets)):0;
    return [distance/15000,width/5000,arc/360,coverage/25,multi?(profile.maxTargets==null?1:num(profile.maxTargets)/15):0,profile.groundEffectImmune===true?1:0,({'very-light':0,light:.25,medium:.5,heavy:.75,'very-heavy':1})[profile.weight]||0,impact/25,profile.projectileEndEffect==='explode'?1:0];
  };
  const ratios=sequence?profile(p).map((_,i)=>average(sequence.map(step=>profile(step)[i]))):profile(p);
  const names=[['attackDistance','Attack Distance'],['attackWidth','Projectile Width'],['attackAngle','Attack Arc'],['attackShape','Attack Coverage'],['multiTarget','Multiple Targets'],['groundEffectImmune','Ground Effect Immunity'],['weight','Weight'],['impactSize','Impact Area'],['projectileEndEffect','End of Attack']];
  const combat=sum(group(names.map(([key,label],i)=>[key,label,ratios[i]]),200,1));
  return finish({primary,secondary,combat},passive(card));
}
function markup(card){
  const b=breakdown(card),fmt=n=>Number(n.toFixed(2)),labels={primary:'Primary Stats',secondary:'Recovery & Defense',combat:'Combat Profile'};
  return `<details class="power-breakdown" data-power-score="${b.score}"><summary>Power · ${b.score} / 1000</summary><p>Stats: ${fmt(b.stats)} / 800 · Passive: ${fmt(b.passive.points)} / 200</p>${Object.entries(b.groups).map(([key,g])=>`<details class="power-group" data-power-group="${key}"><summary>${labels[key]} · ${fmt(g.points)} / ${g.max}</summary><ul>${g.entries.map(e=>`<li><span>${e.label}</span><strong>${fmt(e.points)} / ${fmt(e.max)}</strong></li>`).join('')}</ul></details>`).join('')}<p>${b.passive.reviewed?'Passive points are individually assigned editorial ratings.':'Passive rating pending; no passive points have been invented.'}${b.forms.length?' Forms or attack modes are averaged.':''} DPS and Life do not add separate points. Totals are rounded once.</p></details>`;
}
root.ClashCardPower=Object.freeze({limits,number:num,damagePerSecond:dps,breakdown,markup,raw:card=>breakdown(card).score,scorer(){return card=>breakdown(card).score;}});
})(globalThis);
