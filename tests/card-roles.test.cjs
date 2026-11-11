const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),taxonomy=require('../data/card-roles.json'),audit=require('../data/card-role-audit.json'),before=require('./fixtures/pre-role-gameplay.json');
const cards=fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).sort().flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f))));
function walk(c,key=c.id){return[[c,key],...(c.forms||[]).flatMap((f,i)=>walk(f,key+'/forms/'+i)),...['type1','type2','upgradedsecondForm'].flatMap(k=>c[k]?walk(c[k],key+'/'+k):[])];}
const entries=cards.flatMap(c=>walk(c)),byKey=new Map(entries.map(([c,key])=>[key,c]));
function withoutRoles(c){const out=structuredClone(c);delete out.class;delete out.subclass;out.forms?.forEach((f,i)=>out.forms[i]=withoutRoles(f));for(const k of['type1','type2','upgradedsecondForm'])if(out[k])out[k]=withoutRoles(out[k]);return out;}

test('every root and reachable form has an English class and compatible defined subclass',()=>{
 assert.equal(cards.length,176);assert.equal(entries.length,241);assert.deepEqual(taxonomy.classes.map(c=>c.name),['Tank','Fighter','Assassin','Marksman','Mage','Support','Specialist']);
 const allowed=new Map(taxonomy.classes.map(c=>[c.name,new Set(c.subclasses.map(s=>s.name))]));
 for(const[c,key]of entries){assert.ok(allowed.has(c.class),key+' class');assert.ok(allowed.get(c.class).has(c.subclass),key+' subclass');assert.match(c.class,/^[A-Za-z ]+$/);assert.match(c.subclass,/^[A-Za-z ]+$/);}
 for(const role of taxonomy.classes){assert.ok(role.description);assert.equal(new Set(role.subclasses.map(s=>s.name)).size,role.subclasses.length);for(const sub of role.subclasses){assert.ok(sub.description);assert.ok(entries.some(([c])=>c.class===role.name&&c.subclass===sub.name));}}
});

test('the audit reviews every entry exactly once and matches current labels',()=>{
 assert.equal(audit.reviewed,241);assert.equal(audit.records.length,241);assert.equal(new Set(audit.records.map(r=>r.key)).size,241);assert.equal(audit.changed,audit.records.filter(r=>r.changed).length);
 for(const row of audit.records){const c=byKey.get(row.key);assert.ok(c,row.key);assert.equal(c.class,row.after.class);assert.equal(c.subclass,row.after.subclass);assert.ok(row.reason.length>20);assert.equal(row.changed,JSON.stringify(row.before)!==JSON.stringify(row.after));}
});

test('role changes leave every other source field and every Power score identical',async()=>{
 await import('../arena/js/power.mjs');
 for(const card of cards)assert.equal(crypto.createHash('sha256').update(JSON.stringify(withoutRoles(card))).digest('hex'),before.raw[card.id],card.id);
 for(const[c,key]of entries)assert.equal(globalThis.ClashCardPower.raw(c),before.power[key],key);
});

test('clear role mismatches, missing summons and obsolete placeholder classes are corrected',()=>{
 for(const[key,pair]of Object.entries({bastra:'Marksman/Piercer',maapp:'Mage/Debuffer',avara:'Mage/Controller',cassandra:'Support/Buffer',etheris:'Support/Guardian',stormblade:'Fighter/Sweeper','azrith/forms/0':'Support/Buffer','sylviana/forms/0':'Support/Healer','malvaris/forms/0':'Fighter/Swarm','artist/forms/0':'Specialist/Swarm','dark-necromancer/forms/0':'Fighter/Piercer','dark-necromancer/forms/1':'Marksman/Igniter','dark-necromancer/forms/2':'Tank/Bulwark',plauge:'Mage/Debuffer',erica:'Mage/Controller',bro:'Tank/Juggernaut',veronica:'Support/Shieldbearer'}))assert.equal(byKey.get(key).class+'/'+byKey.get(key).subclass,pair,key);
 for(const[c,key]of entries){assert.notEqual(c.class,'Suicide Assassin',key);assert.notEqual(c.class,'Ölü',key);assert.notEqual(c.subclass,'Human',key);if(c.combatStats?.attackType==='melee')assert.notEqual(c.class,'Marksman',key);}
});

test('selectable Ethereal forms carry their own roles and parent labels match the default form',()=>{
 for(const c of cards.filter(c=>c.isDual)){assert.equal(c.class,c.type1.class,c.id);assert.equal(c.subclass,c.type1.subclass,c.id);assert.ok(c.type2.class&&c.type2.subclass);}
 assert.equal(byKey.get('king/type1').class,'Support');assert.equal(byKey.get('king/type2').class,'Tank');
 for(const id of['reacher','bastra','maapp','avara','john-reynolds'])assert.deepEqual([byKey.get(id+'/upgradedsecondForm').class,byKey.get(id+'/upgradedsecondForm').subclass],[byKey.get(id).class,byKey.get(id).subclass]);
});

test('Arena still exposes the authored per-form roles without unlocking incomplete battle data',async()=>{
 const{buildCatalog}=await import('../arena/js/catalog.mjs'),catalog=buildCatalog(cards,[]);assert.equal(catalog.cards.filter(c=>c.ready).length,138);assert.equal(catalog.cards.filter(c=>!c.ready).length,38);
 for(const def of catalog.forms){assert.equal(def.class,def.raw.class,def.id);assert.equal(def.subclass,def.raw.subclass,def.id);}
 const{resolveDeckCard}=await import('../arena/js/ascension.mjs');for(const form of['type1','type2']){const king=resolveDeckCard(catalog.byId,'king',['king'],{king:form});assert.equal(king.class,form==='type1'?'Support':'Tank');}
});
