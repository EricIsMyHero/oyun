const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const loaded=Promise.all([import('../arena/js/visuals.mjs'),import('../arena/js/engine.mjs'),import('../arena/js/catalog.mjs')]);
async function fixture(){
  const [visuals,{ArenaEngine},{buildCatalog}]=await loaded;
  const catalog=buildCatalog(fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'rarity',f)))),JSON.parse(fs.readFileSync(path.join(root,'data/spells.json'))));
  const e=new ArenaEngine({cards:catalog.cards,spells:catalog.spells,deck:catalog.cards.slice(0,8).map(c=>c.id),spellDeck:['roots'],bot:false});
  const def=structuredClone(catalog.byId.get('gloop'));Object.assign(def.stats,{speed:0,shield:0,healrecovery:0,shieldrecovery:0});
  const [u]=e.spawn(def,0,{x:17,y:14},1,{count:1,positions:[{x:17,y:14}]});u.cooldown=Infinity;
  return{e,u,catalog,...visuals};
}

test('status badges prioritize crowd control, merge repeated poison and equivalent slows, and exclude expired effects and hidden traps',async()=>{
  const {statusBadges}=await fixture();
  const source=[{kind:'regen',until:15},{kind:'poison',until:12},{kind:'poison',until:14},{kind:'frozen',until:10},{kind:'slow',until:9},{kind:'movementSlow',until:11},{kind:'burn',until:5},{kind:'blessedTrap',until:30}];
  const before=JSON.stringify(source),badges=statusBadges(source,5);
  assert.deepEqual(badges.map(b=>b.kind),['frozen','slow','poison','regen']);assert.equal(badges[1].count,2);assert.equal(badges[1].until,11);assert.equal(badges[2].count,2);assert.equal(badges[2].until,14);
  assert.equal(JSON.stringify(source),before);assert.deepEqual(statusBadges(source,30),[]);
});

test('battle and inspector status icons share vector symbols with distinct frozen, slowed and poisoned silhouettes',async()=>{
  const {statusVisual,statusIconSVG}=await fixture(),icons=['frozen','slow','poison'].map(statusIconSVG);
  assert.equal(new Set(icons).size,3);for(const svg of icons){assert.match(svg,/<svg.*aria-hidden="true"><path d="/);assert.doesNotMatch(svg,/\p{Extended_Pictographic}/u);}
  assert.deepEqual(statusVisual('movementSlow'),statusVisual('slow'));assert.equal(statusVisual('bleeding').label,'Bleeding');
  assert.match(statusIconSVG('future-status'),/<path/);
});

test('persistent fields display their actual circle or rectangle and remaining lifetime without changing their footprint',async()=>{
  const {fieldVisual}=await fixture();
  for(const kind of['roots','nightfall-curse','suppression','poison-cloud','blinding-mist']){
    const field={kind,born:2,until:12,shape:{shape:'circle',radius:3}},before=JSON.stringify(field),v=fieldVisual(field,7);
    assert.equal(v.radius,3);assert.equal(v.width,6);assert.equal(v.shape,'circle');assert.equal(v.remaining,5);assert.equal(v.fraction,.5);assert.equal(v.fade,1);assert.equal(JSON.stringify(field),before);
    assert.equal(fieldVisual(field,12),null);
  }
  const rect=fieldVisual({kind:'blinding-mist',born:0,until:5,shape:{shape:'rect',width:2,height:1.5}},4.9);
  assert.equal(rect.width,2);assert.equal(rect.height,1.5);assert.equal(rect.shape,'rect');assert.ok(rect.fade<1);
  assert.equal(fieldVisual({until:10,shape:{shape:'global'}},1),null,'global fields must never be represented by an invented local radius');
});

test('real persistent spells retain their timing and geometry while exposing a correct visual countdown',async()=>{
  const{e,catalog,fieldVisual}=await fixture();
  for(const[id,seconds,radius]of[['roots',12,3],['nightfall-curse',6.3,2.75],['spirit-of-the-wild',10,3.5]]){
    const spell=catalog.spells.find(s=>s.id===id);assert.ok(spell.ready);e._applySpell(0,spell,{x:20,y:14},id);const field=e.state.fields.at(-1),v=fieldVisual(field,e.time);
    assert.equal(field.born,e.time);assert.ok(Math.abs(v.remaining-seconds)<1e-7);assert.equal(v.radius,radius);assert.equal(v.fraction,1);
  }
});

test('lifetime loss emits a red damage effect rather than a green heal, remains paused with the battle, and preserves damage amount',async()=>{
  const {e,u,effectColor,LIFE_LOSS_COLOR}=await fixture(),hp=u.hp;e.step(1);
  const losses=e.state.effects.filter(f=>f.type==='lifeLoss');assert.equal(losses.length,1);assert.equal(losses[0].cause,'lifetime');assert.equal(effectColor(losses[0]),LIFE_LOSS_COLOR);
  assert.equal(u.hp,hp-u.maxHp*.01);assert.equal(losses[0].amount,u.maxHp*.01);assert.equal(e.state.effects.some(f=>f.type==='heal'),false);
  e.setPaused(true);const time=e.time;e.step(4);assert.equal(e.time,time);assert.equal(e.state.effects.filter(f=>f.type==='lifeLoss').length,1);
});

test('status entry effects fire once across aura refreshes; thaw visuals preserve the existing three-second slow',async()=>{
  const{e,u}=await fixture();e.status(u,'slow',3,.25);e.status(u,'slow',3,.25);e.status(u,'slow',3,.4);
  assert.equal(e.state.effects.filter(f=>f.type==='status'&&f.statusKind==='slow').length,1);assert.equal(e.state.effects.find(f=>f.type==='status').unitId,u.id);
  e.status(u,'frozen',1);e.step(1);assert.equal(u.statuses.some(s=>s.kind==='frozen'),false);assert.ok(u.statuses.some(s=>s.kind==='slow'&&s.until===4));
  assert.equal(e.state.effects.filter(f=>f.type==='thaw').length,1);e.step(.1);assert.equal(e.state.effects.filter(f=>f.type==='thaw').length,1);
  e.status(u,'predominance',3);const count=e.state.effects.filter(f=>f.type==='status').length;e.status(u,'poison',2,0,null,{amount:5});assert.equal(e.state.effects.filter(f=>f.type==='status').length,count,'blocked status changes produce no false entry visual');
});
