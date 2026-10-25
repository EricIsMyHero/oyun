/* Passive rules and runtime are bundled here so Survival starts with
   the same script even when an older page omits a separate traits include. */
/* Extended Codex traits. These exact rule bundles are single-rank passives;
   the original scalable passives retain their levels. All state is per run. */
function survivalRegisterTrait(id, name, icon, description) {
  SURVIVAL_PASSIVES[id] = { name, icon, color:'#a5b4fc', maxLevel:1, desc: () => description };
}
[
  ['fen','Fen','◉','Vuruşlar 7 saniyə kor edir: nişanlı hücumları dayandırır, təmasın yayınma şansı 50% olur.'],
  ['ben','Ben','🩸','Vuruşlar yara yığır. Hər 4-cü yara 2 saniyə ərzində 8 qanama hasarı verir.'],
  ['freak','Freak','🧬','Hər saniyə +1 can. Ölümcül zərbədə bir dəfə iki Mini Freak-ə bölünürsən: biri sənsən, digəri yoldaşındır. Hər birinin canı əvvəlkinin yarısıdır; öləndə 50 sahə hasarı.'],
  ['mini-freaks','Mini Freaks','💥','Hər 12 saniyədə bir qeyri-sabit Mini Freak yoldaşı. Məhv olanda və ya 12s ömrü bitəndə 50 sahə hasarı verir.'],
  ['nightprowler','Nightprowler','◐','2 saniyə hasar verməsən görünməz olursan. Növbəti birbaşa vuruş 4 saniyə bədbəxtlik verir: rəqib 25% zəif vurur.'],
  ['twins','Twins','♊','Daimi bir Twin yoldaşı. Biri öləndə sağ qalan +200% maksimum can və +100% baza hasarı alır (stat limitləri daxilində). Sən ölsən idarə qalan Twin-ə keçir. Bir dəfə.'],
  ['bethe','Bethe','🎯','Hər öldürmə 10 saniyəlik +5% kritik şansı verir. Yüklər ayrı-ayrı bitir; ümumi şans maksimum 100%.'],
  ['snaykies','Snaykies','🐍','Vuruşlar qalxandan tam keçir və 2 saniyə ərzində hər saniyə 4 zəhər hasarı verir.'],
  ['soldier','Soldier','🪖','Uçan rəqiblərə +33% hasar.'],
  ['bees','Bees','🐝','Hər 3 saniyə bir fədai arı yoldaşı. İlk zərbədə 8×2 zəhər hasarı qoyur və özü məhv olur; oyunçu ölmür.'],
  ['hailey','Hailey','☽','Vuruşlar yaxın ətrafa da sıçrayır (360°); hər birbaşa vuruş +0,5% kritik şansı yığır. Ümumi limit 100%.'],
  ['angels','Angels','👼','Hər 0,4 saniyədə Angel yoldaşı (maksimum 6). Hər Angel ölümü sağ qalan Angel-lərə +1 hasar verir. Yoldaşların ömrü 8s-dir.'],
  ['boomix','Boomix','↔','Mərmilər mənzilin sonunda geri qayıdır, hər gedişdə hər rəqibə bir dəfə dəyə bilir. Uçuş vaxtı +20% hasar azaltma.'],
  ['phewphew','PhewPhew','🔻','Rəqibin qalxanına +100% hasar.'],
  ['chrono-mage','Chrono Mage','⌛','Hər 5-ci hücum: sənə və yoldaşlara 5s +25% hərəkət və hücum sürəti; ətraf rəqiblərə 8s 25% yavaşlatma.'],
  ['aegis-guard','Aegis Guard','🛡','Sən və yaxın yoldaşlar 15% az hasar alır. Digər azaltmalarla ümumi limit 90%.'],
  ['ironjaw','Ironjaw','🧛','Hər birbaşa vuruş +0,5% can çalma şansı yığır (bu passivdən maksimum +25%).'],
  ['m-manager','M-Manager','💧','Hər 9 saniyə +1 mövcud mana verir. Tutumu keçmir.'],
  ['srail','Srail','◎','Qarşındakı 180° və 400 piksel sahədə hər rəqib üçün +8% kritik şansı (passiv maksimum +80%).'],
  ['cryon','Cryon','🎭','Can 20%-dən aşağı düşəndə yaxın rəqiblər 12s sərsəmləyir. Təkrar aktivləşmə: 30s.'],
  ['executioner','Cəllad','⚔','Canı 50%-dən az olan rəqiblərə +100% hasar.'],
  ['last-stand','Son çırpıntı','≋','Can 30%-dən aşağı düşəndə yaxın rəqibləri 3 karo (120px) geri itələyir. Təkrar: 20s.'],
  ['albert','Albert','↗','Eyni rəqibə ardıcıl birbaşa vuruşlar +1 baza hasarı yığır (maksimum +3). Hədəf dəyişəndə sıfırlanır.'],
  ['chicken','Chicken','🐔','Hər 8 saniyə fədai Chicken yoldaşı. Öləndə 20 sahə hasarı; 80% şansla daha böyük sahədə +400% (100) hasar.'],
  ['frostshot','Frostshot','❄','Vuruşlar 3s 40% yavaşladır. 18s hasar verməsən növbəti birbaşa vuruşa +275% hasar.'],
  ['hornets','Hornets','🪽','Uçan rəqiblərdən 50%, Heyvan tipindən 25% daha az hasar alırsan.'],
  ['warborn','Warborn','🏰','Hər 6 saniyə itirilmiş qalxanın 20%-ni bərpa edir.'],
  ['x-bot','X-Bot','⏳','Hasar vermədiyin hər 2 saniyə +5% növbəti vuruş hasarı (maksimum +200%). Vuranda sıfırlanır.'],
  ['nyra','Nyra','👟','Getdiyin hər 5000 vahid (1000px) üçün +20% hasar (maksimum +100%). 25000 vahiddə vuruşlar qalxandan keçir.'],
  ['deadscope','Deadscope','✧','Öldürmədən sonra növbəti hücum dövrünə +20% hücum sürəti.'],
  ['turtle','Turtle','🐢','Qalxan qırılanda 3 saniyə ərzində 75 qalxan yenilənir. Tutum yoxdursa 75 qalxan tutumu açılır; təkrar: 12s.'],
  ['turtle-kin','Turtle-nin varisi','♧','Yanında bir Turtle yoldaşı döyüşür. Turtle məhv olanda +100% baza hasarı (stat limiti daxilində). Bir dəfə.'],
  ['feral-wolf','Feral Wolf','🐺','İlk 16 saniyə +100% hərəkət sürəti. İlk birbaşa vuruş +30% hasar.'],
  ['trac','Trac','🔨','Alınan hər 24 faktiki hasar üçün +0,5% hasar azaltma və +0,5% hücum sürəti yığır. Ümumi limitlər 90%.'],
  ['tornado','Tornado','🌀','Hər 6s bir hədəfi 2s burulğana çəkir, 4/s hasar, sonda 3,5 karo (140px) geri atır. Can 50%-dən aşağı ikən +2 baza hasarı.'],
  ['dino','Dino','🦖','Hər birbaşa vuruş +2 baza hasarı yığır (maksimum +24, ümumi baza maksimum 200).'],
  ['tenta','Tenta','✋','Birbaşa vuruş 4 əlavə yaxın hədəfə 25% hasar sıçradır; bu 5 hədəf 1s 25% yavaşlayır.'],
  ['fire-archer','Fire Archer','🏹','Hər 4-cü hücumdan sonra 3s +70% hücum sürəti. Ümumi bonus maksimum 90%.'],
  ['shadow-reaper','Shadow Reaper','☾','İlk vuruş mütləq kritikdir. Öldürmədən sonra növbəti vuruş rəqibin maksimum canının 15%-i qədər əlavə hasar verir.'],
  ['voltriker','Voltriker','ϟ','Hər 4-cü vuruş 3×3 (120px) sahədə maksimum 3 əlavə rəqibə eyni hasar verir.'],
  ['frostmaw','Frostmaw','❅','Vuruşlar rəqibin hərəkətini 2s 20% azaldır.'],
  ['hexon','Hexon','✦','Hər 4-cü vuruş hədəfi 0,6s sərsəmlədir.'],
  ['mecha-shield','Mecha Shield','⬡','Hər 21s sənə və yaxın yoldaşlara 25 qalxan verir. İlk seçim 25 qalxan tutumu da açır.'],
  ['astranova','Astranova','✺','Hər 10-cu hücum növbəti vuruşda 5×5 (200px) sahədə +400% əlavə hasar partlayışı yaradır.'],
  ['kai','Kai','🥋','Hər 3-cü vuruş ətrafı 0,8s sərsəmlədir. Alınan hər 10 hasar 20 yük; 100 yükdə növbəti vuruş +60% hasar və 3 karo itələmə.'],
  ['cassandra','Cassandra','♫','Sənə və yoldaşlara üstünlük: nəzarət müddəti 20% azalır. Hər saniyə +1 maksimum can (passiv maksimum +50) və yaxın rəqiblərə 1 hasar.'],
  ['charge-siphon','Yük sorucusu','◈','Hər 4,8s rəqiblərin aktiv yüklərinin 10%-ni oğurlayır. 100 yükdə bütün rəqibləri 12s susturur.'],
  ['arcanyx','Arcanyx','🌱','Hər birbaşa vuruş 60% əlavə sahə hasarı verir. Vuruşdan sonrakı 5s sən və yaxın yoldaşlar +4 can/s bərpa edir.'],
  ['leafshade','Leafshade','🍃','Qalxandan keçər. Hər 7s +1% can çalma şansı (passiv maksimum +25%).'],
  ['jestro','Jestro','🔮','6% şansla 5s susturur. Can 75%-dən aşağı düşəndə Cratex tələsi çağırır (6s təkrar).'],
  ['cratex','Cratex','📦','Hər 6s yaxınlıq tələsi qoyur. Rəqib toxunanda 12 hasar və 1,3s sərsəmlətmə.'],
  ['tphoenix','Tphoenix','🔥','Alınan hasarın 10%-ni qaytarır. Can 25%-ə düşəndə Fire Egg; 12s sağ qalsa Phoenix olur. Yumurta qırılsa 40% canla Tphoenix-ə qayıdır. Təkrar barama: 30s.'],
  ['fire-egg','Fire Egg','🥚','Can 25%-ə düşəndə 12s hərəkətsiz yumurtaya çevrilir. Sağ qalsa Phoenix, qırılsa 40% canla əvvəlki forma. Təkrar: 30s.'],
  ['phoenix','Phoenix','🦅','Vuruşlar qalxandan keçir, hər birbaşa vuruş +1 baza hasarı qazandırır (maksimum 200).'],
  ['corsair-crew','Corsair Crew','↩','Rəqib mərmisini 5 + yayınma + kritik şansı ilə geri qaytarır (maksimum 100%).'],
  ['pirate-girls','Pirate Girls','🏴','Uzaq rəqibə məsafəyə görə +75%-ə qədər hasar.'],
  ['ship-cannoneer','Ship Cannoneer','⚓','İtirilmiş qalxanın 10%-i qədər hücum sürəti; ümumi bonus maksimum 90%.'],
  ['lumina','Lumina','☀','Yaxın rəqiblərə hər 0,25s maksimum canlarının 1%-i qədər hasar verir.'],
  ['hell-boy','Hell boy','😈','Hər 5-ci vuruşdan sonra 3s qəzəb: hər vuruş rəqibin maksimum canının 5%-i qədər əlavə hasar.'],
  ['slasherx','SlasherX','✂','1 + mövcud qalxan miqdarı (%) ehtimalı ilə hədəfi edam edir (maksimum 100%). 500 DPS limiti saxlanır.'],
  ['sheriff','Sheriff','☆','10000 vahid (1000px) daxilində ən çox canlı 6 rəqibi işarələyir və onlara +25% hasar verir.'],
  ['nurse','Nurse','💉','Hər uğurlu can çalma 10s +2 baza hasarı (maksimum +20). Yüklər ayrı bitir.'],
  ['tribe','Tribe','🔱','8 yük/s. 100 yükdə mızraq vuruşu +200% hasar və 0,5 karo itələmə; digər silah +100%. Hədəf canı 70%-dən azdırsa 5s qanama.'],
  ['earthshakers','Earthshakers','⛰','Hər 4-cü hücum yaxın 3×3 (120px) ərazini 1,5s sərsəmlədir; sonra 2s 30% yavaşlatma.'],
  ['whisper','Whisper','👻','Hər 20s bir rəqibi 14 + kritik şansı saniyəlik dost vahidə çevirir; müddət bitəndə o yox olur. Oyunçu yox olmur.'],
  ['roguex','RogueX','◉','Hər birbaşa vuruş 50% şansla 7s kor edir.'],
  ['void-striker','Void Striker','🌌','Hər 18s növbəti hücuma +20% sürət; növbəti vuruş 0,8s 10% yavaşladır.'],
  ['nightfang','Nightfang','🌑','Passivi aldıqdan sonra ilk 12s görünməzlik; hər 60-cı vuruşda yenidən 3s. Vuruşlar bu müddəti bitirmir.'],
  ['sunrise','Sunrise','🌅','Hərəkətdə keçən hər 0,6s +1 maksimum can (passiv maksimum +210, ümumi 1000).'],
  ['shellbyte','Shellbyte','🐚','Yaxında rəqib yoxdursa hər 0,225s 3 yük. 100 yükdə 4500 vahiddə ən az canlı hədəfə atılır; ilk vuruş +50% hasar.'],
  ['wong','Wong','🥋','Vuruş başına 25 yük. 100 yükdə növbəti vuruş 3 karo itələyir, 1s sərsəmlədir. Can 40%-ə düşəndə ətrafı 5 karo itələyir və 0,4s aralı 8 dəfə 8 hasar verir (30s təkrar).'],
  ['tempo','Zamanla güclənmə','⏱','Hər 6 saniyə +25 sürət və +1% hücum sürəti yığır. Sürət 5000, hücum bonusu 90% limitini keçmir.'],
  ['sophie','Sophie','🪓','Hər hücum 25% şansla balta atır: 1,25s sərsəmlətmə, 1,5 karodan uzaqda əlavə 1,75s. Balta qayıdana qədər -60% hasar, +40% hücum sürəti.'],
].forEach(args => survivalRegisterTrait(...args));

function survivalTraitMemory(id) {
  const st = survivalState;
  return st.traits.memory[id] ||= { acquired:st.elapsed, clock:0, hits:0, value:0, charge:0, ready:false, until:0, stacks:[] };
}
function survivalTraitsInit() {
  return { memory:{}, lastDamage:0, firstHit:true, attacks:0, hits:0, distance:0, phase:'base', eggUntil:0,
    eggCooldown:0, stealthUntil:0, hotUntil:0, chronoUntil:0, traps:[], pending:[], deathDone:false };
}
function survivalTraitEvery(id, dt, period, fn) {
  if (!survivalPassiveLevel(id)) return;
  const m = survivalTraitMemory(id); m.clock += dt;
  for (let i=0; m.clock + 1e-9 >= period && i<64; i++) { m.clock -= period; fn(m); }
}
function survivalTraitStacks(id) {
  const m=survivalTraitMemory(id);
  m.stacks=m.stacks.filter(s=>s.until>survivalState.elapsed);
  return m.stacks.reduce((n,s)=>n+s.value,0);
}
function survivalTraitStack(id, value, duration, max) {
  const m=survivalTraitMemory(id); survivalTraitStacks(id);
  if (m.stacks.length < max/value) m.stacks.push({value,until:survivalState.elapsed+duration});
}
function survivalGrantStat(id, amount) {
  const st=survivalState, old=st.stats[id];
  st.stats[id]=survivalClampStat(id,old+amount);
  if(id==='health') {st.cfg.maxHealth=st.stats.health;if(st.player.hp>0)st.player.hp=Math.min(st.stats.health,st.player.hp+st.stats.health-old);}
  if(id==='shield') st.player.shield=Math.min(st.stats.shield,st.player.shield+st.stats.shield-old);
}
function survivalTraitAcquire(id) {
  const st=survivalState, m=survivalTraitMemory(id);
  if(id==='nightfang') st.traits.stealthUntil=st.elapsed+12;
  if(id==='twins') survivalSummon('Twin',{kind:'twin',emoji:'♊',life:Infinity,hp:st.stats.health,damage:st.stats.damage});
  if(id==='turtle-kin') survivalSummon('Turtle',{kind:'turtle',emoji:'🐢',life:Infinity,hp:80,damage:4});
  if(id==='turtle' && st.stats.shield<75) survivalGrantStat('shield',75-st.stats.shield);
  if(id==='mecha-shield' && st.stats.shield<25) survivalGrantStat('shield',25-st.stats.shield);
  if(id==='freak') m.used=false;
}
function survivalTraitCrit() {
  const st=survivalState;
  let chance=st.stats.criticalChance;
  if(survivalPassiveLevel('hailey')) chance+=survivalTraitMemory('hailey').value;
  if(survivalPassiveLevel('bethe')) chance+=survivalTraitStacks('bethe');
  if(survivalPassiveLevel('srail')) {
    const facing=st.player.facing||0;
    const front=st.enemies.filter(e=>e.hp>0&&survivalInSweep(e,st.player,facing,180,400)).length;
    chance+=Math.min(80,front*8);
  }
  return Math.min(100,chance);
}
function survivalTraitLifestealChance() {
  const st=survivalState;
  return Math.min(100,st.stats.lifestealChance+
    (survivalPassiveLevel('ironjaw')?survivalTraitMemory('ironjaw').value:0)+
    (survivalPassiveLevel('leafshade')?survivalTraitMemory('leafshade').value:0));
}
function survivalTraitHaste() {
  const st=survivalState, now=st.elapsed;
  let bonus=st.traits.chronoUntil>now?25:0;
  for(const [id,value] of [['fire-archer',70],['sophie',40]]) if(survivalPassiveLevel(id)&&survivalTraitMemory(id).until>now)bonus+=value;
  if(survivalPassiveLevel('deadscope')&&survivalTraitMemory('deadscope').ready)bonus+=20;
  if(survivalPassiveLevel('void-striker')&&survivalTraitMemory('void-striker').ready)bonus+=20;
  if(survivalPassiveLevel('ship-cannoneer'))bonus+=(st.stats.shield-st.player.shield)*0.1;
  if(survivalPassiveLevel('trac'))bonus+=survivalTraitMemory('trac').value;
  if(survivalPassiveLevel('tempo'))bonus+=survivalTraitMemory('tempo').value;
  return bonus;
}
function survivalTraitSpeed() {
  const st=survivalState;
  if(st.traits.phase==='egg')return 0;
  let bonus=st.traits.chronoUntil>st.elapsed?0.25:0;
  if(survivalPassiveLevel('feral-wolf')&&st.elapsed-survivalTraitMemory('feral-wolf').acquired<16)bonus+=1;
  return Math.min(5000,st.stats.speed*(1+bonus))/5;
}
function survivalIsHidden() {
  const st=survivalState;
  return st.traits.stealthUntil>st.elapsed || (survivalPassiveLevel('nightprowler')&&st.elapsed-st.traits.lastDamage>=2);
}
function survivalTraitDefense(enemy) {
  const st=survivalState;
  let multiplier=1;
  if(survivalPassiveLevel('hornets')) {
    if(enemy.flying)multiplier*=0.5;
    if(enemy.species==='Animal')multiplier*=0.75;
  }
  if(enemy.unluckyUntil>st.elapsed)multiplier*=0.75;
  if(survivalPassiveLevel('aegis-guard'))multiplier*=0.85;
  if(survivalPassiveLevel('boomix')&&st.bullets.some(b=>b.boomerang))multiplier*=0.8;
  return multiplier;
}
function survivalTraitBaseDamage(enemy) {
  const st=survivalState;
  let bonus=0;
  for(const id of ['dino','phoenix']) if(survivalPassiveLevel(id)||(id==='phoenix'&&st.traits.phase==='phoenix'))bonus+=survivalTraitMemory(id).value;
  if(survivalPassiveLevel('albert')) {const m=survivalTraitMemory('albert');if(m.target===enemy)bonus+=Math.min(3,m.value);}
  if(survivalPassiveLevel('nurse'))bonus+=survivalTraitStacks('nurse');
  if(survivalPassiveLevel('tornado')&&st.player.hp<st.stats.health*0.5)bonus+=2;
  return Math.min(200,st.stats.damage+bonus);
}
function survivalTraitBeforeHit(enemy) {
  const st=survivalState, idle=st.elapsed-st.traits.lastDamage;
  const out={bonus:0,flat:0,pierce:0,shieldMultiplier:1,forceCrit:false,idle};
  if(survivalPassiveLevel('executioner')&&enemy.hp<enemy.maxHp*0.5)out.bonus+=1;
  if(survivalPassiveLevel('soldier')&&enemy.flying)out.bonus+=0.33;
  if(survivalPassiveLevel('pirate-girls'))out.bonus+=0.75*Math.min(1,Math.hypot(enemy.x-st.player.x,enemy.y-st.player.y)/500);
  if(survivalPassiveLevel('nyra')) {out.bonus+=Math.min(1,Math.floor(st.traits.distance/1000)*0.2);if(st.traits.distance>=5000)out.pierce=1;}
  if(survivalPassiveLevel('x-bot'))out.bonus+=Math.min(2,Math.floor(idle/2)*0.05);
  if(survivalPassiveLevel('frostshot')&&idle>=18)out.bonus+=2.75;
  if(survivalPassiveLevel('feral-wolf')&&survivalTraitMemory('feral-wolf').hits===0)out.bonus+=0.3;
  if(survivalPassiveLevel('shellbyte')&&survivalTraitMemory('shellbyte').ready)out.bonus+=0.5;
  if(survivalPassiveLevel('kai')&&survivalTraitMemory('kai').charge>=100)out.bonus+=0.6;
  if(survivalPassiveLevel('tribe')&&survivalTraitMemory('tribe').charge>=100)out.bonus+=(st.traits.attackWeapon||st.cfg.weapon)==='spear'?2:1;
  if(survivalPassiveLevel('shadow-reaper')) {const m=survivalTraitMemory('shadow-reaper');out.forceCrit=m.hits===0;if(m.ready)out.flat+=enemy.maxHp*0.15;}
  if(survivalPassiveLevel('hell-boy')&&survivalTraitMemory('hell-boy').until>st.elapsed)out.flat+=enemy.maxHp*0.05;
  if(survivalPassiveLevel('slasherx')&&Math.random()*100<Math.min(100,1+st.player.shield))out.flat+=enemy.hp+(enemy.shield||0);
  if(survivalPassiveLevel('sheriff')&&st.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-st.player.x,e.y-st.player.y)<=1000)
    .sort((a,b)=>b.hp-a.hp).slice(0,6).includes(enemy))out.bonus+=0.25;
  if(survivalPassiveLevel('sophie')&&survivalTraitMemory('sophie').until>st.elapsed)out.bonus-=0.6;
  if(survivalPassiveLevel('leafshade')||survivalPassiveLevel('snaykies')||survivalPassiveLevel('phoenix')||st.traits.phase==='phoenix')out.pierce=1;
  if(survivalPassiveLevel('phewphew'))out.shieldMultiplier=2;
  return out;
}
function survivalSetSlow(e, amount, duration) {
  e.slowAmount=Math.max(e.slowTime>0?e.slowAmount||0:0,amount);
  e.slowTime=Math.max(e.slowTime||0,duration);
}
function survivalKnock(e, distance) {
  const p=survivalState.player, dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;
  e.x+=dx/d*distance;e.y+=dy/d*distance;
}
function survivalTraitDot(e,id,dps,duration,color) {
  e.dots ||= {};
  e.dots[id]={dps,time:duration,color};
}
function survivalTraitArea(x,y,radius,damage,exclude=null,limit=Infinity) {
  const st=survivalState;
  const targets=st.enemies.filter(e=>e.hp>0&&e!==exclude&&Math.hypot(e.x-x,e.y-y)<=radius+(e.radius||0))
    .sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)).slice(0,limit);
  targets.forEach(e=>survivalDamageEnemy(e,typeof damage==='function'?damage(e):damage,'#c4b5fd',false));
  return targets;
}
function survivalTraitStatusArea(radius,stun,slow=0,duration=0) {
  const st=survivalState;
  st.enemies.forEach(e=>{if(e.hp>0&&Math.hypot(e.x-st.player.x,e.y-st.player.y)<=radius){
    e.stunTime=Math.max(e.stunTime||0,stun);if(slow)survivalSetSlow(e,slow,duration+stun);
  }});
  survivalRing(st.player.x,st.player.y,'#93c5fd',radius,0.4);
}
function survivalTraitsOnAttack(weapon) {
  const st=survivalState;st.traits.attacks++;st.traits.attackWeapon=weapon.id;
  for(const id of ['chrono-mage','fire-archer','astranova','earthshakers']) {
    if(!survivalPassiveLevel(id))continue;
    const m=survivalTraitMemory(id);m.hits++;
    if(id==='chrono-mage'&&m.hits%5===0){st.traits.chronoUntil=st.elapsed+5;survivalTraitStatusArea(300,0,0.25,8);}
    if(id==='fire-archer'&&m.hits%4===0)m.until=st.elapsed+3;
    if(id==='astranova'&&m.hits%10===0)m.ready=true;
    if(id==='earthshakers'&&m.hits%4===0)survivalTraitStatusArea(120,1.5,0.3,2);
  }
  if(survivalPassiveLevel('sophie')&&Math.random()<0.25){
    const t=survivalNearestEnemy(survivalWeaponRange(weapon));
    if(t){t.stunTime=Math.max(t.stunTime||0,1.25+(Math.hypot(t.x-st.player.x,t.y-st.player.y)>60?1.75:0));survivalTraitMemory('sophie').until=st.elapsed+1.25;survivalRing(t.x,t.y,'#fda4af',25,0.3);}
  }
}
function survivalTraitsFinishAttack(weapon = null) {
  if(weapon && !weapon.didAttack)return;
  for(const id of ['deadscope','void-striker']) if(survivalPassiveLevel(id)){
    const m=survivalTraitMemory(id);if(m.ready){m.ready=false;if(id==='void-striker')m.slowReady=true;}
  }
}
function survivalTraitsOnHit(enemy,actual,mod) {
  const st=survivalState;st.traits.hits++;
  if(survivalPassiveLevel('fen'))enemy.blindTime=7;
  if(survivalPassiveLevel('roguex')&&Math.random()<0.5)enemy.blindTime=7;
  if(survivalPassiveLevel('ben')){enemy.wounds=(enemy.wounds||0)+1;if(enemy.wounds%4===0)survivalTraitDot(enemy,'bleed',4,2,'#fb7185');}
  if(survivalPassiveLevel('nightprowler')&&mod.idle>=2)enemy.unluckyUntil=st.elapsed+4;
  if(survivalPassiveLevel('snaykies'))survivalTraitDot(enemy,'snaykies',4,2,'#a3e635');
  if(survivalPassiveLevel('frostshot'))survivalSetSlow(enemy,0.4,3);
  if(survivalPassiveLevel('frostmaw'))survivalSetSlow(enemy,0.2,2);
  for(const id of ['feral-wolf','shadow-reaper'])if(survivalPassiveLevel(id))survivalTraitMemory(id).hits++;
  if(survivalPassiveLevel('hailey')){
    const m=survivalTraitMemory('hailey');m.value=Math.min(100,m.value+0.5);
    survivalTraitArea(st.player.x,st.player.y,110,actual*0.25,enemy);
    survivalRing(st.player.x,st.player.y,'#e9d5ff',110,0.2);
  }
  if(survivalPassiveLevel('ironjaw')){const m=survivalTraitMemory('ironjaw');m.value=Math.min(25,m.value+0.5);}
  if(survivalPassiveLevel('dino')){const m=survivalTraitMemory('dino');m.value=Math.min(24,m.value+2);}
  if(survivalPassiveLevel('phoenix')||st.traits.phase==='phoenix'){const m=survivalTraitMemory('phoenix');m.value=Math.min(200,m.value+1);}
  if(survivalPassiveLevel('albert')){const m=survivalTraitMemory('albert');m.value=m.target===enemy?Math.min(3,m.value+1):1;m.target=enemy;}
  if(survivalPassiveLevel('tenta')){
    const targets=survivalTraitArea(enemy.x,enemy.y,180,actual*0.25,enemy,4);
    [enemy,...targets].forEach(e=>survivalSetSlow(e,0.25,1));
  }
  if(survivalPassiveLevel('shadow-reaper'))survivalTraitMemory('shadow-reaper').ready=false;
  if(survivalPassiveLevel('arcanyx')){survivalTraitArea(enemy.x,enemy.y,100,actual*0.6,enemy);survivalDamageEnemy(enemy,actual*0.6,'#86efac',false);st.traits.hotUntil=st.elapsed+5;}
  if(survivalPassiveLevel('jestro')&&Math.random()<0.06)enemy.silenceTime=5;
  for(const [id,period] of [['voltriker',4],['hexon',4],['kai',3],['hell-boy',5]]){
    if(!survivalPassiveLevel(id))continue;
    const m=survivalTraitMemory(id);m.hits++;
    if(m.hits%period===0){
      if(id==='voltriker')survivalTraitArea(enemy.x,enemy.y,120,actual,enemy,3);
      if(id==='hexon')enemy.stunTime=Math.max(enemy.stunTime||0,0.6);
      if(id==='kai')survivalTraitStatusArea(120,0.8);
      if(id==='hell-boy')m.until=st.elapsed+3;
    }
  }
  if(survivalPassiveLevel('astranova')){const m=survivalTraitMemory('astranova');if(m.ready){m.ready=false;survivalTraitArea(enemy.x,enemy.y,200,actual*4);survivalRing(enemy.x,enemy.y,'#f0abfc',200,0.4);}}
  if(survivalPassiveLevel('kai')){const m=survivalTraitMemory('kai');if(m.charge>=100){m.charge-=100;survivalKnock(enemy,120);}}
  if(survivalPassiveLevel('tribe')){const m=survivalTraitMemory('tribe');if(m.charge>=100){m.charge-=100;if(enemy.hp<enemy.maxHp*0.7)survivalTraitDot(enemy,'tribe',4,5,'#fb7185');survivalKnock(enemy,20);}}
  if(survivalPassiveLevel('wong')){const m=survivalTraitMemory('wong');if(m.charge>=100){m.charge-=100;survivalKnock(enemy,120);enemy.stunTime=Math.max(enemy.stunTime||0,1);}m.charge=Math.min(200,m.charge+25);}
  if(survivalPassiveLevel('shellbyte'))survivalTraitMemory('shellbyte').ready=false;
  if(survivalPassiveLevel('void-striker')){const m=survivalTraitMemory('void-striker');if(m.slowReady){m.slowReady=false;survivalSetSlow(enemy,0.1,0.8);}}
  if(survivalPassiveLevel('nightfang')){const m=survivalTraitMemory('nightfang');m.hits++;if(m.hits%60===0)st.traits.stealthUntil=st.elapsed+3;}
}

function survivalSummon(name, options={}) {
  const st=survivalState;
  if(st.companions.filter(a=>a.hp>0).length>=12)return null;
  const angle=Math.random()*Math.PI*2, hp=options.hp||30;
  const ally={name,kind:options.kind||'ally',emoji:options.emoji||'✧',x:st.player.x+Math.cos(angle)*35,y:st.player.y+Math.sin(angle)*35,
    hp,maxHp:hp,shield:0,damage:options.damage||5,life:options.life??12,cd:0,radius:10, ...options};
  st.companions.push(ally);return ally;
}
function survivalTwinBuff() {
  const m=survivalTraitMemory('twins');if(m.used)return;
  m.used=true;survivalGrantStat('health',survivalState.stats.health*2);
  survivalGrantStat('damage',survivalState.stats.damage);
}
function survivalKillCompanion(ally, reason='damage') {
  if(ally.dead)return;
  const st=survivalState;ally.hp=0;ally.dead=true;
  if(ally.kind==='mini') {survivalTraitArea(ally.x,ally.y,100,50);survivalRing(ally.x,ally.y,'#fb923c',100,0.4);}
  if(ally.kind==='chicken') {const big=Math.random()<0.8,range=big?180:80;survivalTraitArea(ally.x,ally.y,range,big?100:20);survivalRing(ally.x,ally.y,'#fbbf24',range,0.4);}
  if(ally.kind==='angel')st.companions.filter(a=>a.kind==='angel'&&a.hp>0).forEach(a=>a.damage=Math.min(200,a.damage+1));
  if(ally.kind==='twin'&&reason!=='transfer')survivalTwinBuff();
  if(ally.kind==='turtle'&&!survivalTraitMemory('turtle-kin').used){survivalTraitMemory('turtle-kin').used=true;survivalGrantStat('damage',st.stats.damage);}
}
function survivalEnterEgg() {
  const st=survivalState;
  st.traits.phase='egg';st.traits.eggUntil=st.elapsed+12;
  st.player.hp=Math.max(1,st.stats.health*0.35);st.player.contactCd=1000;
  survivalText(st.player.x,st.player.y-35,'FIRE EGG','#fb923c');
}
function survivalTraitRescue() {
  const st=survivalState;
  if(st.player.hp>0)return false;
  if(st.traits.phase==='egg'){
    st.traits.phase='base';st.traits.eggCooldown=st.elapsed+30;st.player.hp=st.stats.health*0.4;st.player.contactCd=1000;return true;
  }
  if((survivalPassiveLevel('tphoenix')||survivalPassiveLevel('fire-egg'))&&st.traits.phase==='base'&&st.elapsed>=st.traits.eggCooldown){survivalEnterEgg();return true;}
  if(survivalPassiveLevel('freak')&&!survivalTraitMemory('freak').used){
    survivalTraitMemory('freak').used=true;st.traits.phase='mini';
    st.stats.health=Math.max(1,st.stats.health/2);st.cfg.maxHealth=st.stats.health;st.player.hp=st.stats.health;st.player.contactCd=1000;
    survivalSummon('Mini Freak',{kind:'mini',emoji:'🧬',life:Infinity,hp:st.stats.health,damage:st.stats.damage});
    survivalText(st.player.x,st.player.y-35,'MINI FREAK ×2','#a3e635');return true;
  }
  if(survivalPassiveLevel('twins')&&!survivalTraitMemory('twins').used){
    const twin=st.companions.find(a=>a.kind==='twin'&&a.hp>0);
    if(twin){st.player.x=twin.x;st.player.y=twin.y;survivalKillCompanion(twin,'transfer');survivalTwinBuff();st.player.hp=st.stats.health;st.player.contactCd=1000;return true;}
  }
  return false;
}
function survivalTraitDeath() {
  const st=survivalState;
  if(st.traits.deathDone)return;
  st.traits.deathDone=true;
  if(st.traits.phase==='mini'||survivalPassiveLevel('mini-freaks'))survivalTraitArea(st.player.x,st.player.y,100,50);
  if(survivalPassiveLevel('chicken')){const big=Math.random()<0.8;survivalTraitArea(st.player.x,st.player.y,big?180:80,big?100:20);}
}
function survivalTraitHurt(enemy, actual, previousShield) {
  const st=survivalState,p=st.player;
  if(survivalPassiveLevel('trac')){const m=survivalTraitMemory('trac');m.charge+=actual;while(m.charge>=24){m.charge-=24;m.value=Math.min(90,m.value+0.5);}}
  if(survivalPassiveLevel('kai')){const m=survivalTraitMemory('kai');m.value+=actual;while(m.value>=10){m.value-=10;m.charge=Math.min(200,m.charge+20);}}
  if(survivalPassiveLevel('tphoenix'))survivalDamageEnemy(enemy.source||enemy,actual*0.1,'#fb923c',false);
  if(survivalPassiveLevel('turtle')&&previousShield>0&&p.shield<=0){const m=survivalTraitMemory('turtle');if(st.elapsed>=m.until){m.restore=75;m.restoreTime=3;m.until=st.elapsed+12;}}
  for(const [id,threshold,cooldown] of [['cryon',0.2,30],['last-stand',0.3,20],['wong',0.4,30]]){
    if(!survivalPassiveLevel(id)||p.hp>=st.stats.health*threshold)continue;
    const m=survivalTraitMemory(id);if(m.until>st.elapsed)continue;m.until=st.elapsed+cooldown;
    if(id==='cryon')survivalTraitStatusArea(220,12);
    else {st.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<220).forEach(e=>survivalKnock(e,id==='wong'?200:120));
      if(id==='wong')for(let i=0;i<8;i++)st.traits.pending.push({at:st.elapsed+i*0.4,kind:'wong'});}
  }
  if((survivalPassiveLevel('tphoenix')||survivalPassiveLevel('fire-egg'))&&st.traits.phase==='base'&&p.hp>0&&p.hp<st.stats.health*0.25&&st.elapsed>=st.traits.eggCooldown)survivalEnterEgg();
  if(p.hp<=0&&!survivalTraitRescue())survivalTraitDeath();
}
function survivalTraitsOnKill(enemy) {
  const st=survivalState;
  if(survivalPassiveLevel('bethe'))survivalTraitStack('bethe',5,10,100);
  for(const id of ['deadscope','shadow-reaper'])if(survivalPassiveLevel(id))survivalTraitMemory(id).ready=true;
}
function survivalTraitLifesteal() {if(survivalPassiveLevel('nurse'))survivalTraitStack('nurse',2,10,20);}
function survivalPlaceTrap() {
  const st=survivalState;
  if(st.traits.traps.length<8)st.traits.traps.push({x:st.player.x,y:st.player.y,life:12});
}
function survivalTraitsTick(dt) {
  const st=survivalState,p=st.player;
  if(survivalPassiveLevel('freak'))survivalHeal(dt);
  if(st.traits.hotUntil>st.elapsed){survivalHeal(4*dt);st.companions.forEach(a=>{if(Math.hypot(a.x-p.x,a.y-p.y)<200)a.hp=Math.min(a.maxHp,a.hp+4*dt);});}
  if(st.traits.phase==='egg'&&st.elapsed+1e-9>=st.traits.eggUntil){st.traits.phase='phoenix';p.hp=st.stats.health;survivalRing(p.x,p.y,'#fb923c',120,0.6);}
  survivalTraitEvery('warborn',dt,6,()=>survivalRestoreShield((st.stats.shield-p.shield)*0.2));
  survivalTraitEvery('m-manager',dt,9,()=>{p.mana=Math.min(st.stats.mana,p.mana+1);});
  survivalTraitEvery('leafshade',dt,7,m=>{m.value=Math.min(25,m.value+1);});
  survivalTraitEvery('void-striker',dt,18,m=>{m.ready=true;});
  survivalTraitEvery('tempo',dt,6,m=>{m.value=Math.min(90,m.value+1);survivalGrantStat('speed',25);});
  survivalTraitEvery('mecha-shield',dt,21,()=>{survivalRestoreShield(25);st.companions.forEach(a=>a.shield=Math.min(1000,a.shield+25));});
  survivalTraitEvery('cassandra',dt,1,m=>{if(m.value<50){survivalGrantStat('health',1);m.value++;}st.companions.forEach(a=>{a.maxHp=Math.min(1000,a.maxHp+1);a.hp=Math.min(a.maxHp,a.hp+1);});survivalTraitArea(p.x,p.y,160,1);});
  survivalTraitEvery('lumina',dt,0.25,()=>survivalTraitArea(p.x,p.y,150,e=>e.maxHp*0.01));
  survivalTraitEvery('tribe',dt,1,m=>{m.charge=Math.min(200,m.charge+8);});
  survivalTraitEvery('mini-freaks',dt,12,()=>survivalSummon('Mini Freak',{kind:'mini',emoji:'🧬',damage:5,hp:20,life:12}));
  survivalTraitEvery('bees',dt,3,()=>survivalSummon('Bee',{kind:'bee',emoji:'🐝',damage:1,hp:1,life:8}));
  survivalTraitEvery('chicken',dt,8,()=>survivalSummon('Chicken',{kind:'chicken',emoji:'🐔',damage:2,hp:10,life:8}));
  survivalTraitEvery('angels',dt,0.4,()=>{if(st.companions.filter(a=>a.kind==='angel'&&a.hp>0).length<6)survivalSummon('Angel',{kind:'angel',emoji:'👼',damage:3,hp:12,life:8});});
  survivalTraitEvery('cratex',dt,6,survivalPlaceTrap);
  survivalTraitEvery('jestro',dt,6,()=>{if(p.hp<st.stats.health*0.75)survivalPlaceTrap();});
  survivalTraitEvery('tornado',dt,6,()=>{const e=survivalNearestEnemy(350);if(e){e.vortexTime=2;survivalTraitDot(e,'tornado',4,2,'#c4b5fd');}});
  survivalTraitEvery('whisper',dt,20,()=>{
    const e=survivalNearestEnemy(400);
    if(e){const ally=survivalSummon('Whisper',{kind:'controlled',emoji:'👻',hp:e.hp,damage:e.damage||8,life:Math.min(200,14+survivalTraitCrit())});if(ally){ally.x=e.x;ally.y=e.y;st.enemies=st.enemies.filter(other=>other!==e);}}
  });
  survivalTraitEvery('charge-siphon',dt,4.8,m=>{
    st.enemies.forEach(e=>{const charge=(e.charge||0)*0.1;e.charge=Math.max(0,(e.charge||0)-charge);m.charge+=charge;});
    if(m.charge>=100){m.charge-=100;st.enemies.forEach(e=>e.silenceTime=12);survivalRing(p.x,p.y,'#c4b5fd',700,0.5);}
  });
  if(survivalPassiveLevel('turtle')){const m=survivalTraitMemory('turtle');if(m.restoreTime>0){const amount=Math.min(dt,m.restoreTime)*25;survivalRestoreShield(amount);m.restoreTime=Math.max(0,m.restoreTime-dt);}}
  if(survivalPassiveLevel('shellbyte')){
    const m=survivalTraitMemory('shellbyte');
    if(!survivalNearestEnemy(150)){m.clock+=dt;while(m.clock>=0.225){m.clock-=0.225;m.charge=Math.min(100,m.charge+3);}}
    if(m.charge>=100){const target=st.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<=450).sort((a,b)=>a.hp-b.hp)[0];
      if(target){m.charge=0;m.ready=true;p.x=Math.max(18,Math.min(942,target.x-30));p.y=Math.max(18,Math.min(522,target.y));}}
  }
  st.traits.pending=st.traits.pending.filter(task=>{if(task.at>st.elapsed)return true;
    if(task.kind==='wong'){const e=survivalNearestEnemy(450);if(e)survivalDamageEnemy(e,8,'#fbbf24',false);}return false;
  });
  st.traits.traps=st.traits.traps.filter(trap=>{trap.life-=dt;const e=st.enemies.find(e=>e.hp>0&&Math.hypot(e.x-trap.x,e.y-trap.y)<35);
    if(e){survivalDamageEnemy(e,12,'#c4b5fd',false);e.stunTime=Math.max(e.stunTime||0,1.3);survivalRing(trap.x,trap.y,'#c4b5fd',40,0.2);return false;}return trap.life>0;
  });
}
function survivalTraitMoved(distance,dt) {
  const st=survivalState;st.traits.distance+=distance;
  if(survivalPassiveLevel('sunrise')&&distance>0){const m=survivalTraitMemory('sunrise');m.clock+=dt;while(m.clock>=0.6&&m.value<210){m.clock-=0.6;m.value++;survivalGrantStat('health',1);}}
}
function survivalTraitsEnemyTick(e,dt) {
  const st=survivalState;
  for(const dot of Object.values(e.dots||{})){
    const active=Math.min(dt,dot.time);if(active>0)survivalDamageEnemy(e,dot.dps*active,dot.color,false,true);
    dot.time=Math.max(0,dot.time-dt);
  }
  const vortex=Math.min(dt,e.vortexTime||0);e.vortexTime=Math.max(0,(e.vortexTime||0)-dt);
  if(vortex>0){
    const p=st.player,dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1,travel=Math.min(Math.max(0,d-60),vortex*150);
    e.x+=dx/d*travel;e.y+=dy/d*travel;
    if(e.vortexTime===0)survivalKnock(e,140);
  }
  for(const key of ['blindTime','silenceTime']){e[key]=Math.max(0,(e[key]||0)-dt);if(e[key]<1e-9)e[key]=0;}
  return vortex;
}

function survivalEnemyTarget(enemy) {
  const st=survivalState;
  let target=survivalIsHidden()?null:st.player;
  let best=target?Math.hypot(enemy.x-target.x,enemy.y-target.y):Infinity;
  st.companions.forEach(a=>{const d=Math.hypot(enemy.x-a.x,enemy.y-a.y);if(a.hp>0&&d<best){best=d;target=a;}});
  return target;
}
function survivalTickCompanions(dt) {
  const st=survivalState;
  st.companions.forEach(a=>{
    if(a.hp<=0){survivalKillCompanion(a);return;}
    a.life-=dt;if(a.life<=0){survivalKillCompanion(a,'expiry');return;}
    const e=survivalNearestEnemy(450,a.x,a.y), target=e||st.player;
    const dx=target.x-a.x,dy=target.y-a.y,d=Math.hypot(dx,dy)||1;
    const speed=180*(st.traits.chronoUntil>st.elapsed?1.25:1);
    if(d>(e?24:50)){a.x+=dx/d*Math.min(d,speed*dt);a.y+=dy/d*Math.min(d,speed*dt);}
    a.x=Math.max(10,Math.min(950,a.x));a.y=Math.max(10,Math.min(530,a.y));
    a.cd-=dt;
    if(e&&Math.hypot(e.x-a.x,e.y-a.y)<40&&a.cd<=0){
      if(a.kind==='bee'){survivalTraitDot(e,'bee',8,2,'#a3e635');survivalKillCompanion(a,'sacrifice');}
      else {survivalDamageEnemy(e,a.damage,'#fde68a',false);a.cd=0.8/(st.traits.chronoUntil>st.elapsed?1.25:1);}
    }
  });
  st.companions=st.companions.filter(a=>a.hp>0);
}
function survivalHitCompanion(ally,enemy,dt) {
  const st=survivalState;
  enemy.allyContactCd=Math.max(0,(enemy.allyContactCd||0)-dt);
  if(enemy.allyContactCd>0)return;
  enemy.allyContactCd=0.6;
  let amount=(enemy.damage||8)*(survivalPassiveLevel('aegis-guard')&&Math.hypot(ally.x-st.player.x,ally.y-st.player.y)<200?0.85:1);
  const blocked=Math.min(ally.shield,amount);ally.shield-=blocked;amount-=blocked;ally.hp-=amount;
  if(ally.hp<=0)survivalKillCompanion(ally);
}
function survivalEnemyAbility(e,dt,target) {
  const st=survivalState;
  if(e.silenceTime>0)return;
  e.charge=Math.min(100,(e.charge||0)+dt*8);
  e.shotCd=(e.shotCd??1.5)-dt;
  if(!e.ranged||!target||e.shotCd>0||e.blindTime>0||st.enemyBullets.length>=160)return;
  const dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy)||1;
  const empowered=e.charge>=100;e.charge=empowered?0:e.charge;e.shotCd=2.5;
  st.enemyBullets.push({x:e.x,y:e.y,prevX:e.x,prevY:e.y,vx:dx/d*170,vy:dy/d*170,radius:5,
    damage:empowered?12:4,life:6,source:e,species:e.species,flying:e.flying,criticalChance:e.criticalChance||0,criticDamage:1.5,projectile:true});
}
function survivalTickEnemyBullets(dt) {
  const st=survivalState,p=st.player;
  st.enemyBullets=st.enemyBullets.filter(b=>{
    b.life-=dt;b.prevX=b.x;b.prevY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(b.life<=0)return false;
    const ally=st.companions.find(a=>a.hp>0&&survivalSegmentDistance(a.x,a.y,b.prevX,b.prevY,b.x,b.y)<=a.radius+b.radius);
    if(ally){survivalHitCompanion(ally,b,1);return false;}
    if(!survivalIsHidden()&&survivalSegmentDistance(p.x,p.y,b.prevX,b.prevY,b.x,b.y)<=st.cfg.radius+b.radius){
      if(survivalPassiveLevel('corsair-crew')&&Math.random()*100<Math.min(100,5+st.stats.dodge+survivalTraitCrit())){
        if(st.bullets.length<900)st.bullets.push({x:b.x,y:b.y,vx:-b.vx,vy:-b.vy,speed:170,radius:5,damage:b.damage,
          remaining:800,pierce:1,targets:new Set(),color:'#67e8f9',secondary:true});
        survivalText(p.x,p.y-25,'↩','#67e8f9');
      } else survivalTakeDamage(b);
      return false;
    }
    return b.x>-30&&b.x<990&&b.y>-30&&b.y<570;
  });
}
function survivalTraitsRender(ctx) {
  const st=survivalState;
  ctx.font='19px serif';ctx.textAlign='center';ctx.textBaseline='middle';
  st.companions.forEach(a=>{
    ctx.fillStyle='#fde68a';ctx.fillText(a.emoji,a.x,a.y);
    ctx.fillStyle='#262435';ctx.fillRect(a.x-12,a.y-18,24,3);
    ctx.fillStyle='#86efac';ctx.fillRect(a.x-12,a.y-18,24*Math.max(0,a.hp/a.maxHp),3);
  });
  st.traits.traps.forEach(t=>{ctx.strokeStyle='#c4b5fd';ctx.strokeRect(t.x-10,t.y-10,20,20);});
  st.enemyBullets.forEach(b=>{ctx.fillStyle='#f87171';ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,Math.PI*2);ctx.fill();});
}

/* Horde survival: independent weapons, Codex-inspired passives and paused level choices. */
const SURVIVAL_W = 960;
const SURVIVAL_H = 540;

const SURVIVAL_MAX_WEAPONS = 4;
const SURVIVAL_MAX_PASSIVES = 4;
const SURVIVAL_MAX_WEAPON_LEVEL = 8;
const SURVIVAL_MAX_PASSIVE_LEVEL = 5;
const SURVIVAL_CONTACT_DMG = 8;
const SURVIVAL_CONTACT_CD = 600;
function survivalEnemyHP(elapsed) { return 8 + Math.floor(elapsed / 12) * 2; }
function survivalSpawnInterval(elapsed) { return Math.max(300, 1400 - elapsed * 8); }
function survivalEnemySpeed(elapsed) { return Math.min(150, 70 + elapsed * 0.6); }
function survivalXpToNext(level) { return 5 + level * 3; }

let survivalPickerBuilt = false;
let survivalState = null;
let survivalRAF = null;
let survivalInput = { x: 0, y: 0 };
let survivalKeys = {};
let survivalVisible = false;
const survivalImgCache = {};
const survivalReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let survivalRosterLoading = false;
let survivalRosterFailed = [];
async function survivalLoadCharacters() {
  if (survivalRosterLoading) return;
  survivalRosterLoading = true;
  document.getElementById('survival-roster-status').textContent = 'Kartlar yüklənir…';
  const targets = survivalRosterFailed.length ? survivalRosterFailed : SURVIVAL_RARITIES;
  const results = await Promise.allSettled(targets.map(async rarity => {
    const response = await fetch(`rarity/${rarity}.json`);
    if (!response.ok) throw new Error(`${rarity}: HTTP ${response.status}`);
    const cards = await response.json();
    if (!Array.isArray(cards)) throw new Error('Kart siyahısı oxunmadı');
    cards.forEach(card => {
      if (card.id && card.name) SURVIVAL_CHARACTERS[card.id] = survivalCardConfig(card);
    });
  }));
  survivalRosterFailed = targets.filter((_, i) => results[i].status === 'rejected');
  survivalRosterLoading = false;
  buildSurvivalPicker();
  document.getElementById('survival-roster-status').textContent = `${Object.keys(SURVIVAL_CHARACTERS).length} xarakter` +
    (survivalRosterFailed.length ? ` · ${survivalRosterFailed.length} rarity yüklənmədi.` : ' · Bütün rarity-lər hazırdır.');
  document.getElementById('survival-roster-retry').hidden = !survivalRosterFailed.length;
}
function initSurvival() {
  survivalSetVisible(true);
  if (survivalPickerBuilt) return;
  survivalPickerBuilt = true;
  buildSurvivalPicker();
  setupSurvivalControls();
  document.getElementById('survival-character-search').addEventListener('input', buildSurvivalPicker);
  document.getElementById('survival-rarity-filter').addEventListener('change', buildSurvivalPicker);
  document.getElementById('survival-roster-retry').addEventListener('click', survivalLoadCharacters);
  survivalLoadCharacters();
}
function survivalEscape(text) {
  return String(text).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
}
function buildSurvivalPicker() {
  const grid = document.getElementById('survival-picker-grid');
  const search = document.getElementById('survival-character-search').value.trim().toLowerCase();
  const rarity = document.getElementById('survival-rarity-filter').value;
  grid.replaceChildren();
  const characters = Object.values(SURVIVAL_CHARACTERS).filter(ch =>
    ch.name.toLowerCase().includes(search) && (rarity === 'all' || ch.rarity === rarity));
  characters.forEach(ch => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'survival-char-card';
    card.style.setProperty('--char-color', ch.color);
    card.innerHTML = `<span class="survival-char-avatar"><span>${ch.emoji}</span><img loading="lazy" alt="" src="${survivalEscape(getCardImg({ group: ch.cardGroup, name: ch.cardName }))}"></span>
      <span class="survival-char-rarity">${survivalEscape(ch.rarity)} · ${survivalEscape(ch.role)}</span>
      <span class="survival-char-name">${survivalEscape(ch.name)}</span>
      <span class="survival-char-desc">${survivalEscape(ch.desc)}</span>
      <span class="survival-char-hp">❤ ${ch.stats.health} · 🛡 ${ch.stats.shield} · 💥 ${ch.stats.damage}</span>`;
    card.querySelector('img').addEventListener('error', event => { event.target.hidden = true; });
    card.addEventListener('click', () => startSurvivalRun(ch.id));
    grid.appendChild(card);
  });
  document.getElementById('survival-roster-count').textContent = `${characters.length} / ${Object.keys(SURVIVAL_CHARACTERS).length}`;
  if (!characters.length) grid.textContent = 'Bu axtarışa uyğun xarakter yoxdur.';
}

function survivalResetInput() {
  survivalKeys = {};
  survivalInput = { x: 0, y: 0 };
  const knob = document.getElementById('survival-joystick-knob');
  if (knob) knob.style.transform = 'translate(0px, 0px)';
}
function survivalSetVisible(visible) {
  survivalVisible = visible;
  survivalResetInput();
  if (visible && survivalState?.choosing) survivalFocusChoice();
}
function survivalIsPaused() {
  return !survivalVisible || document.hidden || survivalState.paused || survivalState.choosing;
}
function survivalFocusChoice() {
  document.querySelector('#survival-choices button')?.focus({ preventScroll: true });
}
function survivalTogglePause() {
  if (!survivalState || survivalState.over || survivalState.choosing) return;
  survivalState.paused = !survivalState.paused;
  survivalResetInput();
  document.getElementById('survival-pause-btn').textContent = survivalState.paused ? '▶ Davam et' : 'Ⅱ Fasilə';
  document.getElementById('survival-paused').hidden = !survivalState.paused;
}
function setupSurvivalControls() {
  window.addEventListener('keydown', e => {
    if (!survivalVisible || !survivalState || survivalState.over) return;
    if (e.target.matches('input, textarea, select')) return;
    const key = e.key.toLowerCase();
    if (survivalState.choosing) {
      if (key === 'tab') {
        const buttons = [...document.querySelectorAll('#survival-choices button')];
        const index = buttons.indexOf(document.activeElement);
        e.preventDefault();
        buttons[(index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
      }
      if (['1', '2', '3'].includes(key) && !e.repeat) {
        e.preventDefault();
        survivalChooseUpgrade(Number(key) - 1);
      }
      return;
    }
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
    if ((key === 'p' || key === 'escape') && !e.repeat) survivalTogglePause();
    if (key === ' ' && !e.repeat && e.target.id === 'survival-canvas') survivalCastMana();
    survivalKeys[key] = true;
  });
  window.addEventListener('keyup', e => { delete survivalKeys[e.key.toLowerCase()]; });
  window.addEventListener('blur', () => {
    survivalResetInput();
    if (survivalState && !survivalState.over && !survivalState.paused && !survivalState.choosing) survivalTogglePause();
  });
  document.addEventListener('visibilitychange', survivalResetInput);
  document.getElementById('survival-mana-btn').addEventListener('click', survivalCastMana);
  document.getElementById('survival-pause-btn').addEventListener('click', survivalTogglePause);
  document.getElementById('survival-resume-btn').addEventListener('click', survivalTogglePause);
  document.getElementById('survival-exit-btn').addEventListener('click', survivalExitRun);
  document.getElementById('survival-restart-btn').addEventListener('click', () => startSurvivalRun(survivalState.charId));
  document.getElementById('survival-menu-btn').addEventListener('click', survivalExitRun);

  const stick = document.getElementById('survival-joystick');
  const knob = document.getElementById('survival-joystick-knob');
  let dragging = false;
  stick.addEventListener('pointerdown', e => {
    if (!survivalState || survivalIsPaused() || survivalState.over) return;
    dragging = true;
    stick.setPointerCapture(e.pointerId);
    move(e);
  });
  function move(e) {
    if (!dragging || survivalIsPaused()) return;
    const rect = stick.getBoundingClientRect();
    let dx = e.clientX - rect.left - rect.width / 2;
    let dy = e.clientY - rect.top - rect.height / 2;
    const distance = Math.hypot(dx, dy);
    const maxR = rect.width * 0.35;
    if (distance > maxR) { dx *= maxR / distance; dy *= maxR / distance; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    survivalInput = { x: dx / maxR, y: dy / maxR };
  }
  stick.addEventListener('pointermove', move);
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(event => stick.addEventListener(event, () => {
    dragging = false;
    survivalResetInput();
  }));
}

function survivalExitRun() {
  if (survivalRAF) cancelAnimationFrame(survivalRAF);
  if (survivalState) survivalState.over = true;
  survivalResetInput();
  document.getElementById('survival-levelup').hidden = true;
  document.getElementById('survival-game').style.display = 'none';
  document.getElementById('survival-gameover').style.display = 'none';
  document.getElementById('survival-picker').style.display = 'block';
  document.querySelector('.survival-char-card')?.focus({ preventScroll: true });
}
function survivalCreateWeapon(id) { return { id, level: 1, cd: 0, shotsLeft: 0, shotCd: 0 }; }
function startSurvivalRun(charId) {
  if (survivalRAF) cancelAnimationFrame(survivalRAF);
  survivalResetInput();
  const cfg = JSON.parse(JSON.stringify(SURVIVAL_CHARACTERS[charId]));
  survivalState = {
    charId, cfg,
    player: { x: SURVIVAL_W / 2, y: SURVIVAL_H / 2, hp: cfg.maxHealth, shield: cfg.stats.shield, mana: cfg.stats.mana, lastDamage: -10, slowTime: 0, contactCd: 0, level: 1, xp: 0, xpToNext: survivalXpToNext(1) },
    stats: { ...cfg.stats }, haste: 0,
    weapons: [survivalCreateWeapon(cfg.weapon)],
    passives: [], choices: [], choosing: false, paused: false,
    traits: survivalTraitsInit(), companions: [], enemyBullets: [],
    damageLog: [], manaBuff: 0, neonTime: 0, pulseCd: 0,
    passiveTimers: { demotron: 10, ali: 15, untouch: 0 },
    enemies: [], bullets: [], effects: [], particles: [], texts: [],
    elapsed: 0, spawnCd: 500, kills: 0, shake: 0, over: false,
  };
  if (cfg.innate) survivalAddPassive(cfg.innate);
  const image = new Image();
  image.src = getCardImg({ group: cfg.cardGroup, name: cfg.cardName });
  survivalImgCache[charId] = image;
  document.getElementById('survival-picker').style.display = 'none';
  document.getElementById('survival-gameover').style.display = 'none';
  document.getElementById('survival-game').style.display = 'block';
  document.getElementById('survival-levelup').hidden = true;
  document.getElementById('survival-paused').hidden = true;
  document.getElementById('survival-pause-btn').textContent = 'Ⅱ Fasilə';
  document.getElementById('survival-pause-btn').disabled = false;
  const canvas = document.getElementById('survival-canvas');
  canvas.width = SURVIVAL_W;
  canvas.height = SURVIVAL_H;
  const ctx = canvas.getContext('2d');
  survivalUpdateLoadout();
  updateSurvivalHUD();
  canvas.focus({ preventScroll: true });
  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (survivalState.over) return;
    survivalUpdate(dt);
    survivalRender(ctx);
    if (!survivalState.over) survivalRAF = requestAnimationFrame(loop);
  }
  survivalRAF = requestAnimationFrame(loop);
}

/* ── Upgrade selection: one offer per category while available, then fill
   from the remaining eligible pool. Never offer a fifth weapon/passive. */
function survivalUpgradePool() {
  const st = survivalState;
  const pool = [];
  Object.entries(SURVIVAL_WEAPONS).forEach(([id, def]) => {
    const owned = st.weapons.find(w => w.id === id);
    if (owned ? owned.level >= SURVIVAL_MAX_WEAPON_LEVEL : st.weapons.length >= SURVIVAL_MAX_WEAPONS) return;
    pool.push({ key: `weapon:${id}`, type: 'weapon', id, icon: def.icon, name: def.name, color: def.color,
      label: owned ? `Silah · Sv. ${owned.level} → ${owned.level + 1}` : 'Yeni silah',
      desc: survivalWeaponDescription(id, (owned?.level || 0) + 1) });
  });
  Object.entries(SURVIVAL_STAT_DEFS).forEach(([id, def]) => {
    const value = st.stats[id];
    if (def.derived || (id === 'attackSpeed' ? st.haste >= 90 : def.lower ? value <= def.min : value >= def.cap)) return;
    const next = survivalNextStat(id);
    pool.push({ key: `stat:${id}`, type: 'stat', id, icon: def.icon, name: def.name, color: def.color, label: 'Stat artımı',
      desc: `${survivalFormat(value)}${def.unit} → ${survivalFormat(next)}${def.unit} · ${def.info}${id === 'attackSpeed' ? ` Bonus: +${Math.min(90, st.haste + def.step)}% / 90%.` : ` Limit: ${def.cap}${def.unit}.`}` });
  });
  Object.entries(SURVIVAL_PASSIVES).forEach(([id, def]) => {
    const owned = st.passives.find(p => p.id === id);
    if (owned ? owned.level >= (def.maxLevel || SURVIVAL_MAX_PASSIVE_LEVEL) : st.passives.length >= SURVIVAL_MAX_PASSIVES) return;
    pool.push({ key: `passive:${id}`, type: 'passive', id, icon: def.icon, name: def.name, color: def.color,
      label: owned ? `Passiv · Sv. ${owned.level} → ${owned.level + 1}` : (def.maxLevel === 1 ? 'Yeni passiv · Tək səviyyə' : 'Yeni passiv'),
      desc: def.desc((owned?.level || 0) + 1) });
  });
  // At full progression, useful one-time effects keep all three choices valid.
  const supplies = [
    { id: 'heal', icon: '♥', name: 'İkinci nəfəs', desc: 'Maksimum canın 35%-ni bərpa et.' },
    { id: 'barrier', icon: '⬡', name: 'Mana sipəri', desc: '8 saniyəlik toxunulmazlıq qazan.' },
    { id: 'blast', icon: '✺', name: 'Təmizlənmə', desc: 'Arenadakı bütün rəqiblərə maksimum canlarının 50%-i qədər hasar ver.' },
  ];
  if (pool.length < 3) supplies.forEach(s => pool.push({ ...s, key: `supply:${s.id}`, type: 'supply', color: '#6ee7b7', label: 'Birdəfəlik yardım' }));
  return pool;
}
function survivalWeaponDescription(id, level) {
  const def = SURVIVAL_WEAPONS[id];
  const factor = survivalState ? survivalState.stats.damage / SURVIVAL_WEAPONS[survivalState.cfg.weapon].damage : 1;
  const damage = +(def.damage * (1 + (level - 1) * 0.3) * factor).toFixed(1);
  const details = {
    rifle: `${survivalState ? survivalBurstCount({id, level}) : 3 + Math.floor((level - 1) / 3)} güllə eyni nöqtəyə`,
    hammer: '1×1 (40×40 piksel) sahəyə ağır zərbə',
    bow: 'Uzaq mənzilli ox',
    lightAxe: 'Yalnız bir hədəfə çevik balta zərbəsi',
    sword: '135° sahədəki bütün rəqiblərə qılınc zərbəsi',
    dualSwords: '90° sahəyə ardıcıl 2 zərbə',
    scythe: '360° ətraf sahədəki bütün rəqiblərə oraq zərbəsi',
    spear: 'Uzun və dar xətdə bütün rəqiblərə mızraq zərbəsi',
    axe: 'Yaxındakı bir rəqibə balta zərbəsi',
    wand: 'Rəqiblərdən keçən mana mərmisi',
    orbit: `${2 + Math.floor((level - 1) / 2)} fırlanan kürə`,
    nova: 'Ətrafdakı bütün rəqibləri vuran alov halqası',
    lightning: `${3 + Math.floor((level - 1) / 2)} rəqibə qədər sıçrayan şimşək`,
  };
  const weapon = {id, level};
  const interval = survivalState ? survivalWeaponInterval(weapon) : def.interval;
  const range = survivalState ? ` · ${Math.round(survivalWeaponRange(weapon) * 10)} mənzil` : '';
  const recovery = def.recovery ? ` · Cütlükdən sonra ${(survivalState ? survivalWeaponRecovery(weapon) / 1000 : def.recovery / 1000).toFixed(2)} san fasilə` : '';
  return `${details[id]} · ${def.kind === 'twin-sweep' ? '2 × ' : ''}${damage} hasar · ${(interval / 1000).toFixed(2)} san${range}${recovery}. Sv. ${level}/${SURVIVAL_MAX_WEAPON_LEVEL}.`;
}
function survivalSample(list) { return list[Math.floor(Math.random() * list.length)]; }
function survivalLevelUp() {
  const st = survivalState, p = st.player;
  if (st.over || st.choosing || p.xp < p.xpToNext) return false;
  p.xp -= p.xpToNext;
  p.level++;
  p.xpToNext = survivalXpToNext(p.level);
  st.choosing = true;
  survivalResetInput();
  const pool = survivalUpgradePool();
  const selected = [];
  ['weapon', 'stat', 'passive'].forEach(type => {
    let options = pool.filter(c => c.type === type);
    if (type === 'passive') {
      const discoveries = options.filter(c => !st.passives.some(p => p.id === c.id));
      if (discoveries.length) options = discoveries;
    }
    if (options.length) selected.push(survivalSample(options));
  });
  while (selected.length < 3) selected.push(survivalSample(pool.filter(c => !selected.includes(c))));
  // Shuffle positions so the passive is not permanently the third button.
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }
  st.choices = selected;
  survivalRenderChoices();
  updateSurvivalHUD();
  return true;
}
function survivalRenderChoices() {
  const st = survivalState;
  document.getElementById('survival-levelup-title').textContent = `Səviyyə ${st.player.level} — gücünü seç`;
  document.getElementById('survival-choice-slots').textContent = `Silah ${st.weapons.length}/4 · Passiv ${st.passives.length}/4 · Yalnız 1 seçim`;
  const container = document.getElementById('survival-choices');
  container.replaceChildren();
  st.choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `survival-choice survival-choice--${choice.type}`;
    button.style.setProperty('--choice-color', choice.color);
    button.innerHTML = `<span class="survival-choice-type">${choice.label}</span>
      <span class="survival-choice-icon">${choice.icon}</span><strong>${choice.name}</strong>
      <span class="survival-choice-desc">${choice.desc}</span><span class="survival-choice-key">${index + 1} · Seç</span>`;
    button.addEventListener('click', () => survivalChooseUpgrade(index));
    container.appendChild(button);
  });
  document.getElementById('survival-levelup').hidden = false;
  document.getElementById('survival-pause-btn').disabled = true;
  survivalFocusChoice();
}
function survivalChooseUpgrade(index) {
  const st = survivalState;
  if (!st || st.over || !st.choosing || !st.choices[index]) return;
  const choice = st.choices[index];
  // Recheck eligibility instead of trusting a stale UI offer.
  if (!survivalUpgradePool().some(c => c.key === choice.key)) return;
  if (choice.type === 'weapon' || choice.type === 'passive') {
    const collection = choice.type === 'weapon' ? st.weapons : st.passives;
    if (choice.type === 'passive') survivalAddPassive(choice.id);
    else {
      const owned = collection.find(item => item.id === choice.id);
      if (owned) owned.level++;
      else collection.push(survivalCreateWeapon(choice.id));
    }
  } else if (choice.type === 'stat') {
    const oldValue = st.stats[choice.id];
    st.stats[choice.id] = survivalNextStat(choice.id);
    if (choice.id === 'attackSpeed') st.haste = Math.min(90, st.haste + SURVIVAL_STAT_DEFS.attackSpeed.step);
    if (choice.id === 'health') {
      st.cfg.maxHealth = st.stats.health;
      st.player.hp = Math.min(st.stats.health, st.player.hp + st.stats.health - oldValue);
    }
    if (choice.id === 'shield') st.player.shield = Math.min(st.stats.shield, st.player.shield + st.stats.shield - oldValue);
    if (choice.id === 'mana') st.player.mana = Math.min(st.stats.mana, st.player.mana + st.stats.mana - oldValue);
  } else if (choice.id === 'heal') {
    survivalHeal(st.stats.health * 0.35);
  } else if (choice.id === 'barrier') {
    st.player.contactCd = Math.max(st.player.contactCd, 8000);
  } else if (choice.id === 'blast') {
    st.enemies.forEach(e => { if (e.hp > 0) survivalDamageEnemy(e, e.maxHp * 0.5, '#6ee7b7', false); });
  }
  st.choosing = false;
  st.choices = [];
  survivalResetInput();
  survivalRing(st.player.x, st.player.y, '#fcd34d', 100, 0.6);
  survivalUpdateLoadout();
  document.getElementById('survival-levelup').hidden = true;
  document.getElementById('survival-pause-btn').disabled = false;
  // Overflow XP produces sequential choices, never free or lost upgrades.
  if (!survivalLevelUp()) document.getElementById('survival-canvas').focus({ preventScroll: true });
  updateSurvivalHUD();
}
function survivalUpdateLoadout() {
  const st = survivalState;
  const slots = (items, defs, kind) => Array.from({ length: 4 }, (_, i) => {
    const item = items[i], def = item && defs[item.id];
    const desc = item ? (kind === 'weapon' ? survivalWeaponDescription(item.id, item.level) : def.desc(item.level)) : 'Boş yuva';
    if (!item) return '<span class="survival-slot"><b>＋</b><span>Boş yuva</span></span>';
    return `<details class="survival-slot is-filled"><summary><b>${def.icon}</b><span>${def.name}<small>Sv. ${item.level}</small></span></summary><p>${desc}</p></details>`;
  }).join('');
  document.getElementById('survival-weapons').innerHTML = slots(st.weapons, SURVIVAL_WEAPONS, 'weapon');
  document.getElementById('survival-passives').innerHTML = slots(st.passives, SURVIVAL_PASSIVES, 'passive');
  document.getElementById('survival-weapon-count').textContent = `${st.weapons.length}/4`;
  document.getElementById('survival-passive-count').textContent = `${st.passives.length}/4`;
  document.getElementById('survival-stat-list').innerHTML = SURVIVAL_STAT_GROUPS.map(group =>
    `<section class="survival-stat-group"><h4>${group.name}</h4>${group.defs.map(({key: id}) => {
      const def = SURVIVAL_STAT_DEFS[id];
      return `<span class="survival-stat" title="${survivalEscape(def.info)}">${def.icon} ${def.name}
        <b id="survival-stat-${id}">${survivalFormat(st.stats[id])}${def.unit}</b><small> / ${def.cap}${def.unit}${def.lower ? ' ↓ yaxşıdır' : ''}</small></span>`;
    }).join('')}</section>`).join('');
}

function survivalFormat(value) { return Number(value.toFixed(2)).toString(); }
function survivalNextStat(id) {
  const st = survivalState, def = SURVIVAL_STAT_DEFS[id];
  if (id === 'attackSpeed') return st.cfg.stats.attackSpeed / (1 + Math.min(90, st.haste + def.step) / 100);
  return def.lower ? Math.max(def.min, st.stats[id] - def.step) : Math.min(def.cap, +(st.stats[id] + def.step).toFixed(4));
}
function survivalAddPassive(id) {
  const st = survivalState, owned = st.passives.find(p => p.id === id);
  if (owned ? owned.level >= (SURVIVAL_PASSIVES[id].maxLevel || SURVIVAL_MAX_PASSIVE_LEVEL) : st.passives.length >= SURVIVAL_MAX_PASSIVES) return;
  if (owned) owned.level++;
  else { st.passives.push({ id, level: 1 }); survivalTraitAcquire(id); }
  for (const [key, amount] of Object.entries(SURVIVAL_PASSIVES[id].grant || {})) {
    const before = st.stats[key];
    st.stats[key] = survivalClampStat(key, before + amount);
    if (key === 'shield') st.player.shield = Math.min(st.stats.shield, st.player.shield + st.stats.shield - before);
  }
}
function survivalHeal(amount) {
  const st = survivalState;
  if (st.player.hp <= 0) return 0;
  const healed = Math.min(st.stats.health - st.player.hp, amount * (1 + st.stats.healBonus / 100));
  st.player.hp += Math.max(0, healed);
  return healed;
}
function survivalRestoreShield(amount) {
  const st = survivalState;
  st.player.shield = Math.min(st.stats.shield, st.player.shield + amount);
}
function survivalWeaponRange(weapon) {
  const st = survivalState, def = SURVIVAL_WEAPONS[weapon.id];
  const base = weapon.id === st.cfg.weapon ? st.cfg.stats.range / 10 : def.range;
  return Math.min(st.stats.vision / 10, base * st.stats.range / st.cfg.stats.range + (def.kind === 'nova' ? (weapon.level - 1) * 7 : 0));
}
function survivalHaste() {
  const st = survivalState, missing = 1 - st.player.hp / st.stats.health;
  return Math.min(90, st.haste + (st.neonTime > 0 ? survivalPassiveLevel('neon-droid') * 10 : 0) + survivalPassiveLevel('lyra') * 5 * missing + survivalTraitHaste());
}
function survivalWeaponInterval(weapon) {
  const st = survivalState;
  return Math.max(50, SURVIVAL_WEAPONS[weapon.id].interval / SURVIVAL_WEAPONS[st.cfg.weapon].interval *
    st.cfg.stats.attackSpeed * 1000 / (1 + survivalHaste() / 100));
}
function survivalDamageRate() {
  const st = survivalState;
  st.damageLog = st.damageLog.filter(hit => st.elapsed - hit.time < 1 - 1e-9);
  st.stats.sps = Math.min(500, st.damageLog.reduce((total, hit) => total + hit.damage, 0));
  return st.stats.sps;
}
function survivalCastMana() {
  const st = survivalState;
  if (!st || st.over || survivalIsPaused() || st.player.mana < 3 || st.pulseCd > 0) return;
  st.player.mana -= 3;
  st.pulseCd = 1;
  st.manaBuff = st.stats.life;
  const range = Math.min(st.stats.range / 10, st.stats.vision / 10);
  survivalRing(st.player.x, st.player.y, '#a78bfa', range, 0.5);
  st.enemies.forEach(e => {
    if (Math.hypot(e.x - st.player.x, e.y - st.player.y) <= range) survivalDamageEnemy(e, st.stats.damage, '#a78bfa');
  });
  updateSurvivalHUD();
}
function survivalTickPassives(dt) {
  const st = survivalState;
  survivalTraitsTick(dt);
  for (const key of ['demotron', 'ali', 'untouch']) st.passiveTimers[key] -= dt;
  if (survivalPassiveLevel('demotron') && st.passiveTimers.demotron <= 0) {
    survivalHeal((st.stats.health - st.player.hp) * (5 + survivalPassiveLevel('demotron') * 3) / 100);
    st.passiveTimers.demotron = 10;
  }
  if (survivalPassiveLevel('ali') && st.passiveTimers.ali <= 0) {
    st.player.contactCd = Math.max(st.player.contactCd, (1 + survivalPassiveLevel('ali') * 0.2) * 1000);
    survivalRing(st.player.x, st.player.y, '#fde68a', 45, 0.4);
    st.passiveTimers.ali = 15;
  }
}
function survivalTakeDamage(enemy) {
  const st = survivalState, p = st.player, stats = st.stats;
  if (p.contactCd > 0 || p.hp <= 0) return;
  p.contactCd = SURVIVAL_CONTACT_CD;
  if ((enemy.blindTime > 0 && Math.random() < 0.5) || Math.random() * 100 < stats.dodge) { survivalText(p.x, p.y - 25, 'YAYINDI', '#c4b5fd'); return; }
  const critical = Math.random() * 100 < (enemy.criticalChance || 0);
  const multiplier = critical ? 1 + ((enemy.criticDamage || 1.5) - 1) * (1 - stats.criticdamageminimiser / 100) : 1;
  const reduction = Math.min(90, stats.damageminimiser + survivalPassiveLevel('reacher') * 3 + (survivalPassiveLevel('trac') ? survivalTraitMemory('trac').value : 0));
  let damage = (enemy.damage || SURVIVAL_CONTACT_DMG) * multiplier * Math.max(0.1, (1 - reduction / 100) * survivalTraitDefense(enemy));
  const previousShield = p.shield;
  const shieldFactor = Math.max(0.1, stats.shieldtakendamage / 100);
  const shieldLoss = Math.min(p.shield, damage * shieldFactor);
  p.shield -= shieldLoss;
  damage = Math.max(0, damage - shieldLoss / shieldFactor);
  p.hp = Math.max(0, p.hp - damage);
  p.lastDamage = st.elapsed;
  st.shake = 5;
  survivalText(p.x, p.y - 25, shieldLoss > 0 ? `🛡 −${survivalFormat(shieldLoss)}` : `−${survivalFormat(damage)}`, shieldLoss > 0 ? '#60a5fa' : '#f87171');
  survivalRing(p.x, p.y, shieldLoss > 0 ? '#60a5fa' : '#f87171', 40, 0.25);
  if (enemy.chill && !(enemy.silenceTime > 0)) p.slowTime = Math.max(p.slowTime, 2 * (1 - stats.flexibility / 100) * (survivalPassiveLevel('cassandra') ? 0.8 : 1));
  survivalTraitHurt(enemy, damage + shieldLoss, previousShield);
  if (p.hp > 0 && p.hp < stats.health * 0.25 && survivalPassiveLevel('untouch') && st.passiveTimers.untouch <= 0) {
    p.contactCd = 2000;
    st.passiveTimers.untouch = 22 - survivalPassiveLevel('untouch') * 2;
  }
}

/* ── Combat ── */
function survivalPassiveLevel(id) { return survivalState.passives.find(p => p.id === id)?.level || 0; }
function survivalNearestEnemy(range, x = survivalState.player.x, y = survivalState.player.y, excluded = new Set()) {
  let best = null, distance = range;
  survivalState.enemies.forEach(e => {
    const d = Math.hypot(e.x - x, e.y - y);
    if (e.hp > 0 && !excluded.has(e) && d <= distance) { best = e; distance = d; }
  });
  return best;
}
function survivalDamageEnemy(enemy, amount, color, onHit = true, quiet = false) {
  if (!Number.isFinite(enemy.hp) || enemy.hp <= 0) return 0;
  const st = survivalState, stats = st.stats;
  const trait = onHit ? survivalTraitBeforeHit(enemy) : null;
  const crit = onHit && (trait.forceCrit || Math.random() * 100 < survivalTraitCrit());
  let damage = amount;
  if (onHit) {
    let bonus = (st.manaBuff > 0 ? 0.25 : 0) + trait.bonus;
    if (st.player.shield > 0) bonus += survivalPassiveLevel('azrith') * 0.1;
    bonus += survivalPassiveLevel('lyra') * 0.06 * (1 - st.player.hp / stats.health);
    bonus += survivalPassiveLevel('skyhunter') * 0.08 * Math.min(1, Math.hypot(enemy.x - st.player.x, enemy.y - st.player.y) / 500);
    damage = damage * survivalTraitBaseDamage(enemy) / SURVIVAL_WEAPONS[st.cfg.weapon].damage * (1 + bonus) * (crit ? stats.criticDamage : 1) + trait.flat;
  }
  if (enemy.curseTime > 0) damage *= 1 + survivalPassiveLevel('artist') * 0.1;
  damage = Math.max(0, Math.min(damage, SURVIVAL_STAT_DEFS.sps.cap - survivalDamageRate()));
  if (damage <= 0) return 0;
  const pierce = onHit ? trait.pierce : 0;
  const shieldMultiplier = onHit ? trait.shieldMultiplier : 1;
  // Extra shield damage consumes the same real 500/s budget as health damage.
  const shieldLoss = Math.min(enemy.shield || 0, damage * (1 - pierce) * shieldMultiplier, SURVIVAL_STAT_DEFS.sps.cap - survivalDamageRate());
  const hpLoss = Math.min(enemy.hp, Math.max(0, damage - shieldLoss / shieldMultiplier), Math.max(0, SURVIVAL_STAT_DEFS.sps.cap - survivalDamageRate() - shieldLoss));
  enemy.shield = Math.max(0, (enemy.shield || 0) - shieldLoss);
  enemy.hp -= hpLoss;
  const actual = hpLoss + shieldLoss;
  const lastDamage = st.damageLog.at(-1);
  if(lastDamage && lastDamage.time===st.elapsed)lastDamage.damage+=actual;
  else st.damageLog.push({ time: st.elapsed, damage: actual });
  survivalDamageRate();
  st.traits.lastDamage = st.elapsed;
  if (!quiet) {
    enemy.flash = 0.12;
    survivalText(enemy.x, enemy.y - 15, `${crit ? '✦ ' : ''}${survivalFormat(actual)}`, crit ? '#fde68a' : color);
    survivalParticles(enemy.x, enemy.y, color, crit ? 7 : 3);
  }
  if (!onHit) return actual;
  if (hpLoss > 0 && Math.random() * 100 < survivalTraitLifestealChance()) { survivalHeal(hpLoss * stats.lifesteal / 100); survivalTraitLifesteal(); }
  const slow = survivalPassiveLevel('venomora');
  if (slow) { enemy.slowTime = 2; enemy.slowAmount = (25 + (slow - 1) * 5) / 100; }
  const poison = survivalPassiveLevel('toxic');
  if (poison) { enemy.poisonTime = 3; enemy.poisonDps = 2 * poison; }
  const burn = survivalPassiveLevel('magmara');
  if (burn) { enemy.burnTime = 2; enemy.burnDps = 3 * burn; }
  const knockback = survivalPassiveLevel('aeralis');
  if (knockback) {
    const dx = enemy.x - st.player.x, dy = enemy.y - st.player.y;
    const d = Math.hypot(dx, dy) || 1;
    enemy.x += dx / d * (12 + (knockback - 1) * 5);
    enemy.y += dy / d * (12 + (knockback - 1) * 5);
  }
  const spikes = survivalPassiveLevel('venomspikes');
  if (spikes) {
    enemy.toxinHits = (enemy.toxinHits || 0) + 1;
    if (enemy.toxinHits % 5 === 0) {
      survivalDamageEnemy(enemy, enemy.maxHp * (8 + (spikes - 1) * 3) / 100, '#f0abfc', false);
      survivalRing(enemy.x, enemy.y, '#f0abfc', 32, 0.3);
    }
  }
  survivalTraitsOnHit(enemy, actual, trait);
  if (survivalPassiveLevel('neon-droid')) st.neonTime = 3;
  if (survivalPassiveLevel('artist')) {
    enemy.inkHits = (enemy.inkHits || 0) + 1;
    if (enemy.inkHits % 4 === 0) enemy.curseTime = 3;
  }
  const storm = survivalPassiveLevel('stormblade');
  if (storm) {
    st.enemies.forEach(other => {
      if (other !== enemy && other.hp > 0 && Math.hypot(other.x - enemy.x, other.y - enemy.y) <= 70 + storm * 10)
        survivalDamageEnemy(other, actual * (15 + storm * 5) / 100, '#93c5fd', false);
    });
    survivalRing(enemy.x, enemy.y, '#93c5fd', 70 + storm * 10, 0.2);
  }
  return actual;
}

function survivalBurstCount(weapon) {
  const st = survivalState;
  return Math.min(15, 3 + Math.floor((weapon.level - 1) / 3) + Math.max(0, st.stats.number - st.cfg.stats.number));
}
function survivalShoot(weapon) {
  const st = survivalState, def = SURVIVAL_WEAPONS[weapon.id], p = st.player;
  if (st.bullets.length >= 900) return;
  const range = survivalWeaponRange(weapon);
  const targets = st.enemies.filter(e => e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) <= range)
    .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
  if (weapon.id === 'rifle' && !weapon.aim) {
    if (!targets.length) return;
    weapon.aim = { x: targets[0].x, y: targets[0].y };
  }
  if (weapon.id !== 'rifle' && !targets.length) return;
  const count = weapon.id === 'rifle' ? 1 : st.stats.number;
  for (let i = 0; i < count && st.bullets.length < 900; i++) {
    // A rifle volley keeps its original world-space aim point even if the
    // target moves or dies. Wand projectiles can still select separate targets.
    const target = weapon.id === 'rifle' ? weapon.aim : targets[i % targets.length];
    const dx = target.x - p.x, dy = target.y - p.y, d = Math.hypot(dx, dy) || 1;
    p.facing=Math.atan2(dy,dx);
    const speed = weapon.id === 'wand' ? 420 : weapon.id === 'bow' ? 700 : 560;
    st.bullets.push({ x: p.x, y: p.y, prevX: p.x, prevY: p.y,
      vx: dx / d * speed, vy: dy / d * speed, radius: weapon.id === 'wand' ? 7 : 4,
      damage: def.damage * (1 + (weapon.level - 1) * 0.3), color: def.color,
      arrow: weapon.id === 'bow', boomerang: !!survivalPassiveLevel('boomix'), ttl: 6, remaining: range, speed, pierce: weapon.id === 'wand' ? 2 + Math.floor(weapon.level / 3) : 1, targets: new Set() });
  }
  survivalParticles(p.x, p.y, def.color, 3);
}
function survivalWeaponRecovery(weapon) {
  const def = SURVIVAL_WEAPONS[weapon.id];
  return (def.recovery || 0) * survivalWeaponInterval(weapon) / def.interval;
}
function survivalWeaponCycleInterval(weapon) {
  return survivalWeaponInterval(weapon) + survivalWeaponRecovery(weapon);
}
function survivalInSweep(enemy, origin, angle, arc, range) {
  const dx = enemy.x - origin.x, dy = enemy.y - origin.y, radius = enemy.radius || 0;
  const distance = Math.hypot(dx, dy);
  if (distance > range + radius) return false;
  if (arc >= 360 || distance <= radius) return true;
  const half = arc * Math.PI / 360;
  const difference = Math.atan2(Math.sin(Math.atan2(dy, dx) - angle), Math.cos(Math.atan2(dy, dx) - angle));
  if (Math.abs(difference) <= half + 1e-9) return true;
  const edge = angle + (difference < 0 ? -half : half);
  return survivalSegmentDistance(enemy.x, enemy.y, origin.x, origin.y,
    origin.x + Math.cos(edge) * range, origin.y + Math.sin(edge) * range) <= radius + 1e-9;
}
function survivalMeleeHit(weapon, angle) {
  const st = survivalState, def = SURVIVAL_WEAPONS[weapon.id], p = st.player;
  const range = survivalWeaponRange(weapon);
  const damage = def.damage * (1 + (weapon.level - 1) * 0.3) * (1 + Math.max(0, st.stats.number - st.cfg.stats.number) * 0.08);
  const end = { x: p.x + Math.cos(angle) * range, y: p.y + Math.sin(angle) * range };
  st.enemies.forEach(enemy => {
    const hits = def.kind === 'thrust' ?
      survivalSegmentDistance(enemy.x, enemy.y, p.x, p.y, end.x, end.y) <= def.width / 2 + (enemy.radius || 0) :
      survivalInSweep(enemy, p, angle, def.arc, range);
    if (hits) survivalDamageEnemy(enemy, damage, def.color);
  });
  if (st.effects.length < 100) st.effects.push({
    kind: def.kind === 'thrust' ? 'thrust' : 'sweep', x: p.x, y: p.y, x2: end.x, y2: end.y,
    angle, arc: def.arc, radius: range, color: def.color, life: 0.22, maxLife: 0.22,
  });
}
function survivalOrbitPositions(weapon) {
  const p = survivalState.player, time = survivalState.elapsed;
  const count = Math.min(15, 2 + Math.floor((weapon.level - 1) / 2) + survivalState.stats.number - 1);
  const radius = survivalWeaponRange(weapon);
  return Array.from({ length: count }, (_, i) => ({
    x: p.x + Math.cos(time * 2.8 + i * Math.PI * 2 / count) * radius,
    y: p.y + Math.sin(time * 2.8 + i * Math.PI * 2 / count) * radius,
  }));
}
function survivalAttack(weapon) {
  const st = survivalState, def = SURVIVAL_WEAPONS[weapon.id], p = st.player;
  const damage = def.damage * (1 + (weapon.level - 1) * 0.3);
  weapon.didAttack=!!survivalNearestEnemy(survivalWeaponRange(weapon)+(def.kind==='orbit'?30:0));
  if(weapon.didAttack)survivalTraitsOnAttack(weapon);
  if (def.kind === 'burst') {
    const target = survivalNearestEnemy(survivalWeaponRange(weapon));
    weapon.aim = target ? { x: target.x, y: target.y } : null;
    weapon.shotsLeft = target ? survivalBurstCount(weapon) : 0;
    weapon.shotCd = 0;
  } else if (def.kind === 'sweep' || def.kind === 'twin-sweep' || def.kind === 'thrust') {
    const target = survivalNearestEnemy(survivalWeaponRange(weapon));
    const angle = target ? Math.atan2(target.y - p.y, target.x - p.x) : p.facing || 0;
    p.facing=angle;
    survivalMeleeHit(weapon, angle);
    if (def.kind === 'twin-sweep') weapon.combo = { timer: survivalWeaponInterval(weapon), angle };

  } else if (def.kind === 'slam') {
    const target = survivalNearestEnemy(survivalWeaponRange(weapon));
    if (!target) return;
    const center = {x: target.x, y: target.y};
    st.enemies.forEach(e => {
      if (Math.hypot(Math.max(0,Math.abs(e.x-center.x)-def.size/2),Math.max(0,Math.abs(e.y-center.y)-def.size/2)) <= (e.radius||0))
        survivalDamageEnemy(e, damage, def.color);
    });
    if (st.effects.length < 100) st.effects.push({kind:'slam', x:center.x, y:center.y, size:def.size, color:def.color, life:0.35, maxLife:0.35});
    st.shake = 4;
  } else if (def.kind === 'bolt' || def.kind === 'arrow') survivalShoot(weapon);
  else if (def.kind === 'strike' || def.kind === 'single-strike') {
    const targets = st.enemies.filter(e => e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) <= survivalWeaponRange(weapon))
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, def.kind === 'single-strike' ? 1 : st.stats.number);
    targets.forEach(target => {
      survivalDamageEnemy(target, damage, def.color);
      if (st.effects.length < 100) st.effects.push({ kind: 'line', x: p.x, y: p.y, x2: target.x, y2: target.y, color: def.color, life: 0.2, maxLife: 0.2, width: 6 });
    });
  } else if (def.kind === 'nova') {
    const range = survivalWeaponRange(weapon);
    survivalRing(p.x, p.y, def.color, range, 0.45);
    st.enemies.forEach(e => { if (Math.hypot(e.x - p.x, e.y - p.y) <= range + e.radius) survivalDamageEnemy(e, damage * (1 + (st.stats.number - 1) * 0.08), def.color); });
  } else if (def.kind === 'orbit') {
    const orbs = survivalOrbitPositions(weapon);
    st.enemies.forEach(e => {
      if (orbs.some(o => Math.hypot(e.x - o.x, e.y - o.y) <= e.radius + 12)) survivalDamageEnemy(e, damage, def.color);
    });
  } else if (def.kind === 'chain') {
    let x = p.x, y = p.y;
    const hit = new Set();
    for (let i = 0; i < Math.min(15, 3 + Math.floor((weapon.level - 1) / 2) + st.stats.number - 1); i++) {
      const target = survivalNearestEnemy(i === 0 ? survivalWeaponRange(weapon) : Math.min(180 * st.stats.range / st.cfg.stats.range, st.stats.vision / 10), x, y, hit);
      if (!target) break;
      hit.add(target);
      if (st.effects.length < 100) st.effects.push({ kind: 'line', x, y, x2: target.x, y2: target.y, color: def.color, life: 0.22, maxLife: 0.22, width: 3 });
      x = target.x; y = target.y;
      survivalDamageEnemy(target, damage, def.color);
    }
  }
}

function survivalSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - x1 - t * dx, py - y1 - t * dy);
}
function survivalUpdate(dt) {
  const st = survivalState;
  if (!st || st.over || survivalIsPaused()) return;
  const cfg = st.cfg, p = st.player;
  // XP may arrive from several kills in the previous frame or a supply effect.
  if (survivalLevelUp()) return;
  st.elapsed += dt;
  st.shake = Math.max(0, st.shake - dt * 18);
  survivalDamageRate();
  st.manaBuff = Math.max(0, st.manaBuff - dt);
  st.neonTime = Math.max(0, st.neonTime - dt);
  st.pulseCd = Math.max(0, st.pulseCd - dt);
  survivalHeal(st.stats.healrecovery * dt);
  if (st.elapsed - p.lastDamage >= 3) survivalRestoreShield(st.stats.shieldrecovery * dt);
  p.mana = Math.min(st.stats.mana, p.mana + dt * 0.5);
  survivalTickPassives(dt);
  survivalTickCompanions(dt);
  const oldPosition = {x:p.x,y:p.y};
  let ix = survivalInput.x, iy = survivalInput.y;
  if (survivalKeys.a || survivalKeys.arrowleft) ix -= 1;
  if (survivalKeys.d || survivalKeys.arrowright) ix += 1;
  if (survivalKeys.w || survivalKeys.arrowup) iy -= 1;
  if (survivalKeys.s || survivalKeys.arrowdown) iy += 1;
  const slowActive = Math.min(dt, p.slowTime);
  p.slowTime = Math.max(0, p.slowTime - dt);
  const mag = Math.hypot(ix, iy), speed = survivalTraitSpeed() * (1 - (dt > 0 ? slowActive / dt * 0.25 : 0));
  if (mag > 0.05) {
    p.x += ix / Math.max(1, mag) * speed * dt;
    p.y += iy / Math.max(1, mag) * speed * dt;
    p.facing = Math.atan2(iy, ix);
  }
  p.x = Math.max(cfg.radius, Math.min(SURVIVAL_W - cfg.radius, p.x));
  p.y = Math.max(cfg.radius, Math.min(SURVIVAL_H - cfg.radius, p.y));
  survivalTraitMoved(Math.hypot(p.x-oldPosition.x,p.y-oldPosition.y),dt);
  st.spawnCd -= dt * 1000;
  if (st.spawnCd <= 0) { survivalSpawnEnemy(); st.spawnCd = survivalSpawnInterval(st.elapsed); }

  if (st.traits.phase !== 'egg') st.weapons.forEach(w => {
    // Tick existing combos before starting attacks: a newly queued second hit
    // must not consume the first hit's frame or fire early.
    if (w.combo) {
      w.combo.timer -= dt * 1000;
      if (w.combo.timer <= 1e-9) { survivalMeleeHit(w, w.combo.angle); w.combo = null; }
    }
    w.cd -= dt * 1000;
    if (w.cd <= 1e-9 && !w.shotsLeft && !w.combo && w.windup == null) w.windup = st.stats.delay;
    if (w.windup != null) {
      w.windup -= dt * 1000;
      if (w.windup <= 0) {
        survivalAttack(w);
        w.windup = null;
        w.cd = survivalWeaponCycleInterval(w);
        survivalTraitsFinishAttack(w);
      }
    }
    if (w.shotsLeft > 0) {
      w.shotCd -= dt * 1000;
      if (w.shotCd <= 0) {
        survivalShoot(w); w.shotsLeft--;
        w.shotCd = Math.min(120 / (1 + survivalHaste() / 100), survivalWeaponInterval(w) / (survivalBurstCount(w) + 1));
      }
    }
  });
  st.bullets.forEach(b => {
    b.ttl = (b.ttl ?? 6) - dt;
    if(b.returning){const dx=p.x-b.x,dy=p.y-b.y,d=Math.hypot(dx,dy)||1;b.vx=dx/d*b.speed;b.vy=dy/d*b.speed;b.remaining=d+30;if(d<cfg.radius)b.pierce=0;}
    b.prevX = b.x; b.prevY = b.y;
    const distance = Math.min(b.remaining, b.speed * dt);
    b.x += b.vx / b.speed * distance; b.y += b.vy / b.speed * distance; b.remaining -= distance;
    // Swept collision avoids skipping enemies between frames. Resolve nearest first.
    const hits = st.enemies.filter(e => e.hp > 0 && !b.targets.has(e) &&
      survivalSegmentDistance(e.x, e.y, b.prevX, b.prevY, b.x, b.y) <= e.radius + b.radius)
      .sort((a, c) => Math.hypot(a.x - b.prevX, a.y - b.prevY) - Math.hypot(c.x - b.prevX, c.y - b.prevY));
    for (const e of hits) {
      if (b.pierce <= 0) break;
      survivalDamageEnemy(e, b.damage, b.color, !b.secondary);
      b.targets.add(e); if(!b.boomerang) b.pierce--;
    }
  });
  st.bullets.forEach(b=>{if(b.boomerang&&!b.returning&&(b.remaining<=0||b.x<0||b.x>SURVIVAL_W||b.y<0||b.y>SURVIVAL_H)){
    b.returning=true;b.targets.clear();b.remaining=Math.hypot(p.x-b.x,p.y-b.y)+30;b.x=Math.max(0,Math.min(SURVIVAL_W,b.x));b.y=Math.max(0,Math.min(SURVIVAL_H,b.y));
  }});
  st.bullets = st.bullets.filter(b => b.ttl > 0 && b.pierce > 0 && b.remaining > 0 && b.x > -30 && b.x < SURVIVAL_W + 30 && b.y > -30 && b.y < SURVIVAL_H + 30);

  p.contactCd -= dt * 1000;
  st.enemies.forEach(e => {
    if (e.hp <= 0) return;
    e.flash = Math.max(0, (e.flash || 0) - dt);
    for (const [timer, dps, color] of [['poisonTime', 'poisonDps', '#a3e635'], ['burnTime', 'burnDps', '#fb923c']]) {
      const active = Math.min(dt, e[timer] || 0);
      if (active > 0) {
        // Integrate exactly to expiry; show periodic text instead of 60 labels/sec.
        survivalDamageEnemy(e, e[dps] * active, color, false, true);
        e.dotText = (e.dotText || 0) + active;
        if (e.dotText >= 0.5) { survivalText(e.x, e.y - 22, '•', color); e.dotText = 0; }
        e[timer] = Math.max(0, e[timer] - dt);
      }
    }
    if (e.hp <= 0) return;
    const vortex = survivalTraitsEnemyTick(e, dt);
    if(e.hp<=0)return;
    const stunned = Math.max(vortex, Math.min(dt, e.stunTime || 0));
    e.stunTime = Math.max(0, (e.stunTime || 0) - dt);
    e.curseTime = Math.max(0, (e.curseTime || 0) - dt);
    const slowActive = Math.min(dt - stunned, e.slowTime || 0);
    const travel = survivalEnemySpeed(st.elapsed) * (dt - stunned - slowActive * (e.slowAmount || 0));
    e.slowTime = Math.max(0, (e.slowTime || 0) - dt);
    const target = survivalEnemyTarget(e);
    const dx = target ? target.x-e.x : Math.cos(st.elapsed+e.y), dy = target ? target.y-e.y : Math.sin(st.elapsed+e.x), dist = Math.hypot(dx,dy)||1;
    const blind = e.blindTime > 0;
    e.x += (blind ? Math.cos(st.elapsed*2) : dx/dist)*travel; e.y += (blind ? Math.sin(st.elapsed*2) : dy/dist)*travel;
    if(!e.stunTime && stunned===0){
      survivalEnemyAbility(e,dt,target);
      if(target && Math.hypot(target.x-e.x,target.y-e.y)<e.radius+(target.radius||cfg.radius)){
        if(target===p)survivalTakeDamage(e);else survivalHitCompanion(target,e,dt);
      }
    }
  });
  survivalTickEnemyBullets(dt);
  const dead = st.enemies.filter(e => e.hp <= 0);
  dead.forEach(e => {
    survivalTraitsOnKill(e);
    survivalParticles(e.x, e.y, e.poisonTime > 0 ? '#a3e635' : '#fbbf24', 10);
    survivalRing(e.x, e.y, '#a78bfa', 22, 0.25);
    survivalText(e.x, e.y, '+1 XP', '#c4b5fd');
  });
  st.enemies = st.enemies.filter(e => e.hp > 0);
  st.kills += dead.length; p.xp += dead.length;
  // Death takes priority over healing or a new selection on the same frame.
  if (p.hp <= 0) { updateSurvivalHUD(); survivalGameOver(); return; }
  const heal = dead.length * survivalPassiveLevel('clara');
  if (heal && p.hp < cfg.maxHealth) {
    survivalHeal(heal);
    survivalText(p.x, p.y - 35, `+${heal} ❤`, '#6ee7b7');
  }
  if (dead.length) {
    p.mana = Math.min(st.stats.mana, p.mana + dead.length * survivalPassiveLevel('collector') * 0.3);
    survivalRestoreShield(dead.length * survivalPassiveLevel('blesser') * 2);
  }
  st.effects.forEach(e => e.life -= dt);
  st.effects = st.effects.filter(e => e.life > 0);
  st.particles.forEach(e => { e.life -= dt; e.x += e.vx * dt; e.y += e.vy * dt; });
  st.particles = st.particles.filter(e => e.life > 0);
  st.texts.forEach(e => { e.life -= dt; e.y -= dt * 28; });
  st.texts = st.texts.filter(e => e.life > 0);
  survivalLevelUp();
  updateSurvivalHUD();
}
function survivalSpawnEnemy() {
  if(survivalState.enemies.length>=180)return;
  const st = survivalState, edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = Math.random() * SURVIVAL_W; y = -20; }
  else if (edge === 1) { x = SURVIVAL_W + 20; y = Math.random() * SURVIVAL_H; }
  else if (edge === 2) { x = Math.random() * SURVIVAL_W; y = SURVIVAL_H + 20; }
  else { x = -20; y = Math.random() * SURVIVAL_H; }
  const hp = survivalEnemyHP(st.elapsed);
  const armored = st.elapsed > 20 && Math.random() < 0.25;
  const chill = st.elapsed > 30 && Math.random() < 0.2;
  const variant = st.elapsed > 5 ? Math.random() : 1;
  st.enemies.push({ flying:variant<0.2, species:variant>=0.2&&variant<0.4?'Animal':'Human', ranged:variant>=0.4&&variant<0.55, charge:0, x, y, radius: 16, hp, maxHp: hp, shield: armored ? hp * 0.5 : 0, maxShield: armored ? hp * 0.5 : 0,
    criticalChance: Math.min(25, Math.floor(st.elapsed / 20) * 3), criticDamage: 1.5, chill });
}

/* ── Bounded effects: no timers or DOM nodes per hit. ── */
function survivalParticles(x, y, color, count) {
  if (survivalReducedMotion) return;
  const particles = survivalState.particles;
  for (let i = 0; i < count && particles.length < 240; i++) {
    const angle = Math.random() * Math.PI * 2, speed = 30 + Math.random() * 100;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color, life: 0.35, maxLife: 0.35 });
  }
}
function survivalText(x, y, text, color) {
  if (survivalState.texts.length < 70) survivalState.texts.push({ x, y, text, color, life: 0.7, maxLife: 0.7 });
}
function survivalRing(x, y, color, radius, life) {
  if (survivalState.effects.length < 100) survivalState.effects.push({ kind: 'ring', x, y, color, radius, life, maxLife: life });
}
function survivalRender(ctx) {
  const st = survivalState, cfg = st.cfg, p = st.player;
  ctx.clearRect(0, 0, SURVIVAL_W, SURVIVAL_H);
  ctx.save();
  if (st.shake > 0 && !survivalReducedMotion && !survivalIsPaused()) ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);
  const gradient = ctx.createRadialGradient(p.x, p.y, 30, SURVIVAL_W / 2, SURVIVAL_H / 2, 650);
  gradient.addColorStop(0, '#17213b'); gradient.addColorStop(1, '#080b18');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, SURVIVAL_W, SURVIVAL_H);
  ctx.strokeStyle = 'rgba(120,145,210,0.09)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < SURVIVAL_W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, SURVIVAL_H); }
  for (let y = 0; y < SURVIVAL_H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(SURVIVAL_W, y); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(167,139,250,0.14)';
  ctx.setLineDash([4, 8]);
  ctx.beginPath(); ctx.arc(p.x, p.y, survivalWeaponRange(st.weapons[0]), 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  st.effects.forEach(e => {
    ctx.globalAlpha = Math.max(0, e.life / e.maxLife);
    ctx.strokeStyle = e.color; ctx.lineWidth = e.width || 3;
    ctx.beginPath();
    if (e.kind === 'ring') ctx.arc(e.x, e.y, e.radius * (1 - e.life / e.maxLife), 0, Math.PI * 2);
    else if (e.kind === 'slam') {
      ctx.strokeRect(e.x-e.size/2, e.y-e.size/2, e.size, e.size);
      ctx.globalAlpha *= 0.25; ctx.fillStyle=e.color;
      ctx.fillRect(e.x-e.size/2, e.y-e.size/2, e.size, e.size);
    } else if (e.kind === 'sweep') {
      const half = e.arc * Math.PI / 360;
      if (e.arc < 360) ctx.moveTo(e.x, e.y);
      ctx.arc(e.x, e.y, e.radius, e.angle - half, e.angle + half);
      if (e.arc < 360) ctx.closePath();
      const alpha = ctx.globalAlpha;
      ctx.globalAlpha = alpha * 0.16; ctx.fillStyle = e.color; ctx.fill(); ctx.globalAlpha = alpha;
      ctx.lineWidth = 3;
    } else if (e.kind === 'thrust') {
      ctx.lineWidth = 6;
      ctx.moveTo(e.x, e.y); ctx.lineTo(e.x2, e.y2);
      ctx.moveTo(e.x2 - Math.cos(e.angle - 0.5) * 18, e.y2 - Math.sin(e.angle - 0.5) * 18);
      ctx.lineTo(e.x2, e.y2);
      ctx.lineTo(e.x2 - Math.cos(e.angle + 0.5) * 18, e.y2 - Math.sin(e.angle + 0.5) * 18);
    } else {
      ctx.moveTo(e.x, e.y);
      ctx.lineTo((e.x + e.x2) / 2 + 8, (e.y + e.y2) / 2 - 8);
      ctx.lineTo(e.x2, e.y2);
    }
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  st.bullets.forEach(b => {
    ctx.strokeStyle = b.color; ctx.lineWidth = b.radius;
    ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.025, b.y - b.vy * 0.025); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath();
    if (b.arrow) {
      const angle = Math.atan2(b.vy,b.vx);
      ctx.moveTo(b.x+Math.cos(angle)*7,b.y+Math.sin(angle)*7);
      ctx.lineTo(b.x+Math.cos(angle+2.5)*7,b.y+Math.sin(angle+2.5)*7);
      ctx.lineTo(b.x+Math.cos(angle-2.5)*7,b.y+Math.sin(angle-2.5)*7);ctx.closePath();
    } else ctx.arc(b.x, b.y, b.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  st.enemies.forEach(e => {
    if (e.slowTime > 0 || e.poisonTime > 0 || e.burnTime > 0) {
      ctx.strokeStyle = e.slowTime > 0 ? '#67e8f9' : e.poisonTime > 0 ? '#a3e635' : '#fb923c';
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 3, 0, Math.PI * 2); ctx.stroke();
      ctx.font = '11px sans-serif';
      const status = `${e.slowTime > 0 ? '❄' : ''}${e.poisonTime > 0 ? '☠' : ''}${e.burnTime > 0 ? '♨' : ''}`;
      ctx.fillStyle = '#fff'; ctx.fillText(status, e.x, e.y + 26);
    }
    ctx.font = '28px serif'; ctx.fillText(e.flying ? '🦇' : e.species==='Animal' ? '🐺' : e.ranged ? '💀' : e.chill ? '🥶' : e.shield > 0 ? '🛡' : '🧟', e.x, e.y);
    if(e.blindTime>0||e.silenceTime>0||e.dots){ctx.font='11px serif';ctx.fillStyle='#c4b5fd';ctx.fillText(`${e.blindTime>0?'◉':''}${e.silenceTime>0?'⊘':''}${Object.values(e.dots||{}).some(d=>d.time>0)?'🩸':''}`,e.x,e.y+35);}
    if (e.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(e.x, e.y, 14, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#262435'; ctx.fillRect(e.x - 14, e.y - 28, 28, 4);
    ctx.fillStyle = '#f87171'; ctx.fillRect(e.x - 14, e.y - 28, 28 * Math.max(0, e.hp / e.maxHp), 4);
    if (e.maxShield > 0) { ctx.fillStyle = '#60a5fa'; ctx.fillRect(e.x - 14, e.y - 34, 28 * Math.max(0, e.shield / e.maxShield), 3); }
    if (e.stunTime > 0 || e.curseTime > 0) { ctx.font = '12px serif'; ctx.fillStyle = '#e9d5ff'; ctx.fillText(e.stunTime > 0 ? '❅' : '✒', e.x, e.y + 28); }
  });
  survivalTraitsRender(ctx);
  const orbit = st.weapons.find(w => w.id === 'orbit');
  if (orbit) survivalOrbitPositions(orbit).forEach(o => {
    ctx.fillStyle = '#fcd34d'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(o.x, o.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  });
  ctx.fillStyle = cfg.glow;
  ctx.beginPath(); ctx.arc(p.x, p.y, cfg.radius + 6, 0, Math.PI * 2); ctx.fill();
  const img = survivalImgCache[st.charId];
  if (survivalIsHidden()) ctx.globalAlpha = 0.35;
  if(st.traits.phase!=='base'){ctx.font='30px serif';ctx.fillText(st.traits.phase==='egg'?'🥚':st.traits.phase==='phoenix'?'🦅':'🧬',p.x,p.y);}
  else if (img && img.complete && img.naturalWidth > 0) {
    ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, cfg.radius, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(img, p.x - cfg.radius, p.y - cfg.radius, cfg.radius * 2, cfg.radius * 2); ctx.restore();
  } else { ctx.font = '30px serif'; ctx.fillText(cfg.emoji, p.x, p.y); }
  ctx.globalAlpha=1;
  ctx.strokeStyle = p.contactCd > 0 ? '#fef3c7' : cfg.color; ctx.lineWidth = p.contactCd > 600 ? 4 : 2;
  ctx.beginPath(); ctx.arc(p.x, p.y, cfg.radius + 2, 0, Math.PI * 2); ctx.stroke();
  if (p.shield > 0) {
    ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, cfg.radius + 9, 0, Math.PI * 2 * p.shield / Math.max(1, st.stats.shield)); ctx.stroke();
  }
  if (st.manaBuff > 0) {
    ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, cfg.radius + 14, 0, Math.PI * 2); ctx.stroke();
  }
  st.particles.forEach(e => {
    ctx.globalAlpha = Math.max(0, e.life / e.maxLife); ctx.fillStyle = e.color; ctx.fillRect(e.x, e.y, 3, 3);
  });
  ctx.font = 'bold 13px sans-serif';
  st.texts.forEach(e => {
    ctx.globalAlpha = Math.max(0, e.life / e.maxLife); ctx.fillStyle = e.color; ctx.fillText(e.text, e.x, e.y);
  });
  ctx.restore();
}
function updateSurvivalHUD() {
  const st = survivalState, p = st.player;
  const chargeInfo=st.passives.filter(p=>['tribe','kai','wong','shellbyte','charge-siphon'].includes(p.id)).map(p=>`${SURVIVAL_PASSIVES[p.id].name}: ${Math.floor(survivalTraitMemory(p.id).charge)}/100`).join(' · ');
  document.getElementById('survival-trait-status').textContent = `${st.companions.length}/12 yoldaş${survivalIsHidden()?' · Görünməz':''}${st.traits.phase==='egg'?' · Yumurta '+Math.ceil(st.traits.eggUntil-st.elapsed)+'s':''}${chargeInfo?' · '+chargeInfo:''}`;
  document.getElementById('survival-shield-fill').style.width = (st.stats.shield ? p.shield / st.stats.shield * 100 : 0) + '%';
  document.getElementById('survival-shield-text').textContent = `${Math.ceil(p.shield)} / ${st.stats.shield}`;
  document.getElementById('survival-mana-text').textContent = `${p.mana.toFixed(1)} / ${st.stats.mana}`;
  const manaButton = document.getElementById('survival-mana-btn');
  manaButton.disabled = survivalIsPaused() || p.mana < 3 || st.pulseCd > 0;
  manaButton.textContent = st.manaBuff > 0 ? `✦ Gücləndirmə ${Math.ceil(st.manaBuff)}s · 3 💧` : '✦ Mana dalğası · 3 💧';
  const liveStats={...st.stats, criticalChance:survivalTraitCrit(), lifestealChance:survivalTraitLifestealChance(),
    damage:survivalTraitBaseDamage(null), speed:survivalTraitSpeed()*5, attackSpeed:survivalWeaponInterval(st.weapons[0])/1000};
  for(const [key,value] of Object.entries(liveStats)){
    const node=document.getElementById(`survival-stat-${key}`), def=SURVIVAL_STAT_DEFS[key];
    const text=survivalFormat(value)+def.unit;if(node && node.textContent!==text)node.textContent=text;
  }
  const dps = document.getElementById('survival-stat-sps');
  if (dps) dps.textContent = survivalFormat(st.stats.sps);
  document.getElementById('survival-haste-text').textContent = `+${survivalFormat(survivalHaste())}% hücum sürəti / 90%`;
  document.getElementById('survival-hp-fill').style.width = Math.max(0, p.hp / st.cfg.maxHealth * 100) + '%';
  document.getElementById('survival-hp-text').textContent = `${Math.ceil(p.hp)} / ${Math.round(st.cfg.maxHealth)}`;
  document.getElementById('survival-xp-fill').style.width = Math.min(100, p.xp / p.xpToNext * 100) + '%';
  document.getElementById('survival-xp-text').textContent = `${p.xp} / ${p.xpToNext} XP`;
  document.getElementById('survival-level').textContent = p.level;
  document.getElementById('survival-timer').textContent = survivalTime(st.elapsed);
  document.getElementById('survival-kills').textContent = `${st.kills} öldürmə`;
}
function survivalTime(elapsed) { return `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}`; }
function survivalGameOver() {
  const st = survivalState;
  st.over = true; st.choosing = false;
  survivalResetInput();
  if (survivalRAF) cancelAnimationFrame(survivalRAF);
  document.getElementById('survival-levelup').hidden = true;
  document.getElementById('survival-game').style.display = 'none';
  document.getElementById('survival-gameover').style.display = 'block';
  document.getElementById('survival-final-stats').textContent =
    `${st.cfg.name} · Sv. ${st.player.level} · ${survivalTime(st.elapsed)} sağ qaldı · ${st.kills} öldürmə`;
  document.getElementById('survival-restart-btn').focus({ preventScroll: true });
}
