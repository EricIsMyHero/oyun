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
