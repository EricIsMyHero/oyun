/* Explicit editorial passive ratings (0–200). See docs/card-power.md.
   Change an entry after reviewing the native ability; never parse prose for points. */
(function(root){
'use strict';
root.ClashPassivePower=Object.freeze([
  {
    "key": "azrith",
    "name": "Azrith",
    "score": 125,
    "signature": "[\"azrith\",\"Azrith\",\"Qalxanı olduğu müddətcə ətrafındakı 2x2 karo sahədə dost kartlara +10% Hasar qazandırar. Qalxanı ilk dəfə qırıldıqda həmin yerləşdirmədə yalnız bir Bannerox yaradar.\"]",
    "derived": false
  },
  {
    "key": "azrith/forms/0",
    "name": "Bannerox",
    "score": 75,
    "signature": "[\"\",\"Bannerox\",\"Ətrafındakı 2x2 karo sahədə dost kartlara +10% Hücum Sürəti qazandırar.\"]",
    "derived": false
  },
  {
    "key": "untouch",
    "name": "Untouch",
    "score": 150,
    "signature": "[\"untouch\",\"Untouch\",\"Bu dözümlü döyüşçünün canı hər 20% azaldıqda o, bədənini qoruyan xüsusi bir fazaya keçər və 2 saniyəlik tam toxunulmazlıq statusu qazanar. Bu toxunulmazlıq müddəti bitdikdən sonra edəcəyi ilk vuruşu rəqibə əlavə +20% hasar yetirər. Bu qabiliyyət onu kritik anlarda həm qoruyur, həm də əks-hücum üçün gücləndirir.\"]",
    "derived": false
  },
  {
    "key": "heartix",
    "name": "Heartix",
    "score": 150,
    "signature": "[\"heartix\",\"Heartix\",\"Hər 24 saniyədə bir sonrakı atışı qarşıdakı rəqib kartı 8 saniyəlik öz tərəfinə çəkər\"]",
    "derived": false
  },
  {
    "key": "r-1",
    "name": "R-1",
    "score": 50,
    "signature": "[\"r-1\",\"R-1\",\"3% şansla növbəti ardıcıl atış seriyasının bütün güllələri +10% hasar, +200% ölçü və +100% menzil qazanar.\"]",
    "derived": false
  },
  {
    "key": "blank",
    "name": "Blank",
    "score": 50,
    "signature": "[\"blank\",\"Blank\",\"Hər rəqib kart öldürdükdə +1 Hasar bonusu (Max: 5)\"]",
    "derived": false
  },
  {
    "key": "magmara",
    "name": "Magmara",
    "score": 100,
    "signature": "[\"magmara\",\"Magmara\",\"Rəqib kartlara ekstra 3x10 Yanma Hasarı verər\"]",
    "derived": false
  },
  {
    "key": "willowshade",
    "name": "Willowshade",
    "score": 125,
    "signature": "[\"willowshade\",\"Willowshade\",\"Vuruşları qalxandan keçər, öləndə \\\"Octarion\\\"-a dönüşər\"]",
    "derived": false
  },
  {
    "key": "willowshade/forms/0",
    "name": "Octarion",
    "score": 50,
    "signature": "[\"\",\"Octarion\",\"Öldükdə 1.5x1.5 karo sahədə 3 saniyə qalan zəhər buraxar. Həmin müddətdə sahəyə daxil olan yerüstü rəqiblərə də 3x5 Zəhər Hasarı verər.\"]",
    "derived": false
  },
  {
    "key": "collector",
    "name": "Collector",
    "score": 100,
    "signature": "[\"collector\",\"Collector\",\"Öldürdüyü hər rəqib kart üçün +2 Mana qazanar\"]",
    "derived": false
  },
  {
    "key": "sushu",
    "name": "Sushu",
    "score": 150,
    "signature": "[\"sushu\",\"Sushu\",\"Görünməz olar və toxunduğu rəqibin içinə girər. İçəridə hədəfalına bilməz və hər saniyə 16 hasar verər. Rəqib öldükdə Sushu da yox olar.\"]",
    "derived": false
  },
  {
    "key": "cloud",
    "name": "Cloud",
    "score": 150,
    "signature": "[\"cloud\",\"Cloud\",\"Döyüşə başladıqda hədəf alına bilməz. İlk 20 saniyə yağış formasında qalar. Bu müddətdə sadəcə altındakı kartlara hasar verə bilər. Hasar verdikdə rəqib kartların saldırı hızlarını 20% azaldar\"]",
    "derived": false
  },
  {
    "key": "cloud/forms/0",
    "name": "Cloud (form 2)",
    "score": 175,
    "signature": "[\"cloud-form-2\",\"Cloud (form 2)\",\"Sonrakı 16 saniyə yağanaq formasında qalar. Hasarı +100% Buludun ölçüsü +50% artar. Hasar verdikdə rəqib kartların saldırı hızlarını 25% azaldar\"]",
    "derived": false
  },
  {
    "key": "cloud/forms/1",
    "name": "Cloud (form 3)",
    "score": 200,
    "signature": "[\"cloud-form-3\",\"Cloud (form 3)\",\"Sonrakı 12 saniyə tufan formasında qalar. Hasarı +100% Buludun ölçüsü +33% artar. Hasar verdikdə rəqib kartların saldırı hızlarını 30% azaldar\"]",
    "derived": false
  },
  {
    "key": "thief",
    "name": "Thief",
    "score": 175,
    "signature": "[\"thief\",\"Thief\",\"Qabağında 15 karo məsafədə ilk görünən rəqibin passivini oğurlayar. Rəqib həmin passivi itirər. Hər yerləşdirmədə yalnız bir dəfə oğurluq edə bilər.\"]",
    "derived": false
  },
  {
    "key": "rotlings",
    "name": "Rotlings",
    "score": 125,
    "signature": "[\"rotlings\",\"Rotlings\",\"Yerləşdirildikdə 3 Rotlings və 3 Mini Rotters birlikdə yaranar. Ölən hər rəqib kart üçün +1 Hasar bonusu qazanarlar. Hər bonus ayrıca 20 saniyə davam edər.\"]",
    "derived": false
  },
  {
    "key": "rotlings/forms/0",
    "name": "Mini Rotters",
    "score": 50,
    "signature": "[\"\",\"Mini Rotters\",\"3 Mini Rotters, 3 Rotlings ilə birlikdə yaranar. Öldükdə 2x2 karo sahədə 5 saniyə qalan sis yaradar. Sis içindəki rəqib kartların menzili və görüşü 25% azalar; sisdən çıxanda təsir bitər.\"]",
    "derived": false
  },
  {
    "key": "esma",
    "name": "Esma",
    "score": 75,
    "signature": "[\"esma\",\"Esma\",\"Vuruşları qalxandan keçər. Rəqib karta hər hasar verdikdə həm rəqib kart həmdə özü +12 qalxan qazanar,\"]",
    "derived": false
  },
  {
    "key": "venom-fangs",
    "name": "Venom Fangs",
    "score": 125,
    "signature": "[\"venom-fangs\",\"Venom Fangs\",\"Vuruşları qalxandan keçər və rəqib kartdan +0,5% Kritik Şansı oğurlayarlar\"]",
    "derived": false
  },
  {
    "key": "skyhunter",
    "name": "Skyhunter",
    "score": 100,
    "signature": "[\"skyhunter\",\"Skyhunter\",\"Skyhunter rəqibləri ilə arasındakı məsafəni öz xeyrinə istifadə edən peşəkar bir ovçudur. O, hədəf aldığı rəqib kart ilə öz arasındakı hər karo üçün +10% hasar bonusu qazanar. Rəqib ondan nə qədər uzaq olarsa, Skyhunter-in oxları bir o qədər dağıdıcı gücə sahib olur. Bu xüsusiyyət onu arxa cəbhədən düşmənin əsas qüvvələrini zərərsizləşdirmək üçün mükəmməl bir uzaq məsafəli karta çevirir.\"]",
    "derived": false
  },
  {
    "key": "rockback",
    "name": "Rockback",
    "score": 125,
    "signature": "[\"rockback\",\"Rockback\",\"Rockback rəqib karta doğru irəliləyərkən böyük bir impuls yığar və hədəfə yaxınlaşana qədər +50% sürət qazanar. Bu sürətlə etdiyi ilk vuruşu düşmənə əlavə +150% hasar vurar. Üstəlik, onun qoruyucu qalxanı qırıldıqdan sonrakı 6 saniyə ərzində etdiyi hər bir vuruş ona +10 Qalxan bərpa edər.\"]",
    "derived": false
  },
  {
    "key": "neon-droid",
    "name": "Neon Droid",
    "score": 100,
    "signature": "[\"neon-droid\",\"Neon Droid\",\"Hasar verdikcə 3 saniyəlik +20% Saldırı Hızı qazanar (Max: 60%)\"]",
    "derived": false
  },
  {
    "key": "void-wraith",
    "name": "Void Wraith",
    "score": 125,
    "signature": "[\"void-wraith\",\"Void Wraith\",\"Yaxındakı hər rəqib kartın Hasarının 20%-ni azaldaraq özünə çəkər. Əlavə Hasar maksimum +16-dır. Bağlanan rəqib 6 karo uzaqlaşdıqda həmin təsir silinər.\"]",
    "derived": false
  },
  {
    "key": "bio-mech",
    "name": "Bio Mech",
    "score": 100,
    "signature": "[\"bio-mech\",\"Bio Mech\",\"Hər hasar aldıqda yaxın dost kartlar maksimum Qalxan miqdarlarının 3%-i qədər Qalxan qazanar. Qalxanı olmayan kartlar +5 Qalxan qazanar.\"]",
    "derived": false
  },
  {
    "key": "mixela",
    "name": "Mixela",
    "score": 175,
    "signature": "[\"mixela\",\"Mixela\",\"Yaxınında ölən dost və rəqib kartların maksimum Canının 60%-i qədər daimi maksimum və cari Can qazanar.\"]",
    "derived": false
  },
  {
    "key": "laura",
    "name": "Laura",
    "score": 150,
    "signature": "[\"laura\",\"Laura\",\"Hər saniyə +8 yük qazanar. 100 yükdə ətrafındakı dost kartlara 30 saniyəlik +25% Hasar, +25% Hücum Sürəti və +25% Hərəkət Sürəti qazandırar. Təkrar tətbiq müddəti yeniləyər, bonuslar toplanmaz.\"]",
    "derived": false
  },
  {
    "key": "legendary-warrior",
    "name": "Legendary Warrior",
    "score": 125,
    "signature": "[\"legendary-warrior\",\"Legendary Warrior\",\"Qorxusuz effekti qazanar. Hər 4-cü vuruş krtitik vurar. Bu vuruşda rəqib kartın qalxanını qırarsa 12 saniyəlik +20% Saldırı hızı qazanar\"]",
    "derived": false
  },
  {
    "key": "lily",
    "name": "Lily",
    "score": 175,
    "signature": "[\"lily\",\"Lily\",\"Lily öldükdə bir müddət daha yaşayar. Bu müddətdə hədəf alına bilməz. Daha sonra 15 karo qabağa qədər gedər. Öldüyü yerin 5 karo uzaqlığında canavar yaranar. Bu canavar Lily-ə doğru qaçaraq yolu ustündəki rəqib kartlara 125+(Rəqib kartın maksimum qalxanının 30%-i qədər) hasar verər. Sonda Lily-i tutaraq partlayar və yaxınlığındakı rəqib kartlara 100+(Rəqib kartın maksimum canının 25%-i qədər) hasar verər.\"]",
    "derived": false
  },
  {
    "key": "arcanyx",
    "name": "Arcanyx",
    "score": 150,
    "signature": "[\"arcanyx\",\"Arcanyx\",\"Arcanyx-in atdığı hər bir toxum hədəfə dəydikdə partlayış törədər və əlavə +60% hasar verər. Eyni zamanda, bu partlayışdan yayılan zərif enerji yaxınlıqdakı dost kartları 5 saniyə ərzində hər saniyə +4 Can bərpa edərək sağaldır.\"]",
    "derived": false
  },
  {
    "key": "leafshade",
    "name": "Leafshade",
    "score": 100,
    "signature": "[\"leafshade\",\"Leafshade\",\"Vuruşları qalxandan keçər, hər 7 saniyədə +1% Can Çalma Şansı qazanar. (Max:25%)\"]",
    "derived": false
  },
  {
    "key": "jestro",
    "name": "Jestro",
    "score": 100,
    "signature": "[\"jestro\",\"Jestro\",\"6% Şansla rəqibi 5 saniyəlik susturar. Canı 75%-dən aşağı olduqda *Cratex* buraxar\"]",
    "derived": false
  },
  {
    "key": "jestro/forms/0",
    "name": "Cratex",
    "score": 75,
    "signature": "[\"\",\"Cratex\",\"Rəqib kart yaxına gələrsə açılaraq hasar verər və 1,3 saniyə sərsəmlətər\"]",
    "derived": false
  },
  {
    "key": "tphoenix",
    "name": "Tphoenix",
    "score": 150,
    "signature": "[\"tphoenix\",\"Tphoenix\",\"Bu qədim insan bədənini bürüyən alovlar sayəsində döyüş boyu aldığı hasarın 10%-ni eynilə hücum edən rəqibə geri ötürər. Canı 25%-in altına düşdükdə ölümdən qaçmaq üçün Fire Egg formasına dönüşər. Bu çevrilmə hər yerləşdirmədə yalnız bir dəfə baş verə bilər.\"]",
    "derived": false
  },
  {
    "key": "tphoenix/forms/0",
    "name": "Fire Egg",
    "score": 100,
    "signature": "[\"\",\"Fire Egg\",\"Fire Egg formasında kart müdafiə mövqeyinə keçir və döyüş meydanında 10 saniyə boyunca sağ qalmağa çalışar. Əgər bu 10 saniyə ərzində rəqiblər tərəfindən qırılmazsa, daha güclü olan Phoenix formasına keçid edər. Əgər bu müddət bitmədən qırılarsa, maksimum canının 25%-i ilə əvvəlki Tphoenix formasına geri qayıdar (120 / 480 Can). Geri qayıdan Tphoenix həmin yerləşdirmə ərzində yenidən Fire Egg ola bilməz.\"]",
    "derived": false
  },
  {
    "key": "tphoenix/forms/1",
    "name": "Phoenix",
    "score": 150,
    "signature": "[\"\",\"Phoenix\",\"Yenidən doğulan əfsanəvi Phoenix-in odlu hücumları rəqiblərin aktiv qalxanlarını tamamilə görməzdən gələr və birbaşa cana işləyər. O, döyüş meydanında qaldığı müddətcə hər uğurlu zərbəsində öz hücum gücünü daha da artıraraq əlavə +1 hasar qazanar.\"]",
    "derived": false
  },
  {
    "key": "corsair-crew",
    "name": "Corsair Crew",
    "score": 150,
    "signature": "[\"corsair-crew\",\"Corsair Crew\",\"Yerləşdirildikdə özü ilə birlikdə iki Pirate Girls gətirər. 5 + Kaçınma Şansı + Kritik Şansı faizlik ehtimalla rəqibin mərmisini zərər almadan atıcısına geri qaytarar (maksimum 100%).\"]",
    "derived": false
  },
  {
    "key": "corsair-crew/forms/0",
    "name": "Pirate Girls",
    "score": 100,
    "signature": "[\"\",\"Pirate Girls\",\"Rəqib nə qədər uzaqdadırsa ona o qədər çox hasar verər. Məsafə bonusu 0 karoda 0%-dən 2.75 karoda +75%-ə qədər düz xətt üzrə artar (maksimum +75%).\"]",
    "derived": false
  },
  {
    "key": "ship-cannoneer",
    "name": "Ship Cannoneer",
    "score": 100,
    "signature": "[\"ship-cannoneer\",\"Ship Cannoneer\",\"İtirdiyi qalxanının 10%-i qədər saldırı hızı qazanar.\"]",
    "derived": false
  },
  {
    "key": "toxic",
    "name": "Toxic",
    "score": 50,
    "signature": "[\"toxic\",\"Toxic\",\"Rəqib kartları zəhərləyərək ekstra 2x3 Hasar verər\"]",
    "derived": false
  },
  {
    "key": "lumina",
    "name": "Lumina",
    "score": 175,
    "signature": "[\"lumina\",\"Lumina\",\"Yaxındakı rəqib kartlara hər 0,25 saniyə ərzində maksimum canlarının 1%-i  Hasar verər\"]",
    "derived": false
  },
  {
    "key": "hell-boy",
    "name": "Hell boy",
    "score": 125,
    "signature": "[\"hell-boy\",\"Hell boy\",\"Hər 5-ci vuruşda 3 saniyə qəzəblənər və vuruşları ekstra rəqib kartın maksimum canının 5%-i qədər hasar verər\"]",
    "derived": false
  },
  {
    "key": "slasherx",
    "name": "SlasherX",
    "score": 175,
    "signature": "[\"slasherx\",\"SlasherX\",\"1+(Qalxan miqdarı)% Şansla rəqibi anında öldürər\"]",
    "derived": false
  },
  {
    "key": "sheriff",
    "name": "Sheriff",
    "score": 100,
    "signature": "[\"sheriff\",\"Sheriff\",\"10,000 Karo uzaqdakı maksimum 6 rəqibi işarətləyər və onlara ekstra +25% Hasar verər\"]",
    "derived": false
  },
  {
    "key": "nurse",
    "name": "Nurse",
    "score": 100,
    "signature": "[\"nurse\",\"Nurse\",\"Hər Can Çalanda 10 saniyəlik +2 Hasar bonusu qazanar (Max: 20)\"]",
    "derived": false
  },
  {
    "key": "tribe",
    "name": "Tribe",
    "score": 125,
    "signature": "[\"tribe\",\"Tribe\",\"Hər saniyə 8 yük qazanarlar. 100 yükdə eyni hədəfə xəncərlilər bıçaqlarını atar və ekstra +100% Hasar verərlər. Əgər rəqib kartın canı 70%-dən azdırsa 5 saniyəlik qanayar, mızraqlılar isə mızraqlarını fırladar və ekstra +200% Hasar verərək rəqib kartı 0.5 karo geri itələyər.\"]",
    "derived": false
  },
  {
    "key": "earthshakers",
    "name": "Earthshakers",
    "score": 125,
    "signature": "[\"earthshakers\",\"Earthshakers\",\"Hər 4-cü zərbədə ağır gürzlərini yerə çırpırlar. Bu zərbə 3x3 ərazidəki bütün rəqibləri 1,5 saniyəlik sərsəmlədir. Vurulan rəqiblərin hərəkət sürəti sonrakı 2 saniyə ərzində 30% azalar.\"]",
    "derived": false
  },
  {
    "key": "whisper",
    "name": "Whisper",
    "score": 200,
    "signature": "[\"whisper\",\"Whisper\",\"Whisper kritik hasar verə bilməz. Mövcud və sonradan qazandığı hər 1 faiz Kritik Şansı avtomatik olaraq 1 saniyəlik nəzarət bonusuna çevirər. Fiziki bədənini itirərək hədəf aldığı rəqib kartın daxilinə sızar və onu 14 saniyə + çevrilmiş saniyələr qədər idarə edər; nəzarət zamanı qazandığı bonus da müddəti uzadar. Başlamış nəzarət heç bir effektlə ləğv oluna bilməz. Misfortune sızmanı qaçırdacağı halda və ya hədəfdə Predominance olduqda müddət yalnız bir dəfə 25% azalar; iki səbəb birlikdə olsa da azalma toplanmaz. Müddət bitəndə hədəf hazırkı can və qalxanı ilə əvvəlki sahibinə qayıdar, Whisper isə yox olar. Hədəf daha tez ölərsə, Whisper də yox olar.\"]",
    "derived": false
  },
  {
    "key": "roguex",
    "name": "RogueX",
    "score": 100,
    "signature": "[\"roguex\",\"RogueX\",\"Uğurlu vuruşu 50% şansla rəqib kartı 7 saniyəlik kor edər: rəqibin menzili və görüşü 25% azalar.\"]",
    "derived": false
  },
  {
    "key": "void-striker",
    "name": "Void Striker",
    "score": 50,
    "signature": "[\"void-striker\",\"Void Striker\",\"Hər 18 saniyədə bir növbəti atışı +20% Saldırı Hızı ilə vurar və rəqibi 0,8 saniyəlik 10% yavaşladar\"]",
    "derived": false
  },
  {
    "key": "nightfang",
    "name": "Nightfang",
    "score": 100,
    "signature": "[\"nightfang\",\"Nightfang\",\"Döyüş meydanının gizli qatili olan Nightfang, qarşıdurma başlayan kimi ilk 12 saniyə ərzində tamamilə görünməz olar. O, sürətli zərbələri ilə kölgələrdə qalmağı bacarır; döyüş ərzində etdiyi hər 60-cı vuruşda yenidən ekstra 3 saniyəlik görünməzlik statusu qazanar. Bu mexanika onu tutulması qeyri-mümkün olan bir təhlükəyə çevirir.\"]",
    "derived": false
  },
  {
    "key": "sunrise",
    "name": "Sunrise",
    "score": 100,
    "signature": "[\"sunrise\",\"Sunrise\",\"Hərəkət etdikcə hər 0,6 saniyə ərzində +1 maksimum və cari Can qazanar. Əlavə Can bonusu maksimum +210 olar (155 → 365).\"]",
    "derived": false
  },
  {
    "key": "shellbyte",
    "name": "Shellbyte",
    "score": 100,
    "signature": "[\"shellbyte\",\"Shellbyte\",\"Ətrafında rəqib kart yoxdursa hər 0,225 saniyədə 3 yük qazanar, 100 yük olduqda ən az canlı rəqibin üstünə hoppanar və ilk vuruşu ekstra +50% Hasar verər (Menzil: 4500)\"]",
    "derived": false
  },
  {
    "key": "wong",
    "name": "Wong",
    "score": 150,
    "signature": "[\"wong\",\"Wong\",\"Hasar verdikdə 25 yük qazanar. 100 yükdə ilk vuruşu rəqibi 3 karo geri ataraq 1 saniyəlik sərsəmlətər. Canı 40%-in altına düşdükdə ətrafındakı rəqibləri 5 karo geri itələyər, silahını çıxarıb 0,4 saniyə aralıqlarla 8 dəfə 8 hasar verər, sonra yaxın döyüşə qayıdar. Bu xüsusi seriya hər yerləşdirmədə yalnız bir dəfə işləyər.\"]",
    "derived": false
  },
  {
    "key": "umbra",
    "name": "Umbra",
    "score": 75,
    "signature": "[\"umbra\",\"Umbra\",\"Canı 75% olduqda 3 saniyəlik görünməz olar, 50% olduqda 7,500 Karo geriyə gedər\"]",
    "derived": false
  },
  {
    "key": "leader",
    "name": "Leader",
    "score": 75,
    "signature": "[\"leader\",\"Leader\",\"Hər 6 saniyədə +0,025 sürət və +0,01 saldırı hızı qazanar\"]",
    "derived": false
  },
  {
    "key": "hostess",
    "name": "Hostess",
    "score": 100,
    "signature": "[\"hostess\",\"Hostess\",\"25% Şansla əlindəki baltanı ən yaxın rəqib karta ataraq 1,25 saniyəlik sərsəmlədər. Əgər balta atılan kart 1.5 karo uzaqdadırsa balta ekstra 1,75 saniyə sərsəmlədər. Bu müddətdə Sophie baltasına doğru hərəkət edər. Yolu üstündə başqa bir rəqib kart varsa baltasını alana qədər hasarı -60% azalar amma ekstra +40% Saldırı hızı qazanar\"]",
    "derived": false
  },
  {
    "key": "mystic-magician",
    "name": "Mystic Magician",
    "score": 175,
    "signature": "[\"mystic-magician\",\"Mystic Magician\",\"Hər atış bir element atışı olar. Hər 4 atışda başqa bir elementin gücünə sahib olar. Alov - rəqib kartı yandırar və ekstra 2x6 hasar verər. Buz - rəqib kartı dondurar. Zəhər - rəqib kartı zəhərləyərək ekstra 6x3 hasar verər. Boşluq - rəqib kartın maksimum canının 10%-i qədər ekstra hasar verər.\"]",
    "derived": false
  },
  {
    "key": "kitsune",
    "name": "Kitsune",
    "score": 150,
    "signature": "[\"kitsune\",\"Kitsune\",\"Görünməz olar maksimum 3 rəqib kartın içindən keçər və yox olar. İçindən keçdiyi rəəqib  kartların bir sonraki 3 vuruşu -99% daha az hasar verər.\"]",
    "derived": false
  },
  {
    "key": "mertel",
    "name": "Mertel",
    "score": 125,
    "signature": "[\"mertel\",\"Mertel\",\"Qazanacağı hər kritik şansı can çalma şansına çevrilər. Qazandığı hər +1% can çalma şansı üçün ekstra +1% maksimum can qazanar.\"]",
    "derived": false
  },
  {
    "key": "reacher",
    "name": "Reacher",
    "score": 75,
    "signature": "[\"reacher\",\"Reacher\",\"Reacher komanda işinə fokuslanmış bir döyüşçüdür. Yanında olan hər bir dost kart üçün +2% hasar azaltma qazanar. Bu effekt maksimum 16%-ə qədər yüksələ bilər. O, ətrafında nə qədər çox müttəfiq olarsa, bir o qədər sarsılmaz bir qüvvəyə çevrilər. Dost bonusu kartın ətrafındakı 3×3 karo sahədə hesablanar.\"]",
    "derived": false
  },
  {
    "key": "reacher/upgradedsecondForm",
    "name": "Reacher",
    "score": 100,
    "signature": "[\"\",\"Reacher\",\"Reacher komanda işinə fokuslanmış bir döyüşçüdür. Yanında olan hər bir dost kart üçün +3% hasar azaltma qazanar. Bu effekt maksimum 24%-ə qədər yüksələ bilər. O, ətrafında nə qədər çox müttəfiq olarsa xüsusilədə Soldier, bir o qədər sarsılmaz bir qüvvəyə çevrilər. Dost bonusu kartın ətrafındakı 3×3 karo sahədə hesablanar.\"]",
    "derived": false
  },
  {
    "key": "bastra",
    "name": "Bastra",
    "score": 100,
    "signature": "[\"bastra\",\"Bastra\",\"Atışları qalxandan keçər. Yanındakı dost başına ekstra +2% Saldırı Hızı qazanar Dost bonusu kartın ətrafındakı 3×3 karo sahədə hesablanar.\"]",
    "derived": false
  },
  {
    "key": "bastra/upgradedsecondForm",
    "name": "Bastra",
    "score": 125,
    "signature": "[\"\",\"Bastra\",\"Atışları qalxandan keçər. Yanındakı dost başına ekstra +3% Saldırı Hızı qazanar Dost bonusu kartın ətrafındakı 3×3 karo sahədə hesablanar.\"]",
    "derived": false
  },
  {
    "key": "maapp",
    "name": "Maapp",
    "score": 75,
    "signature": "[\"maapp\",\"Maapp\",\"8% şansla rəqibin hasarını 2 saniyəlik -75% azaldar\"]",
    "derived": false
  },
  {
    "key": "maapp/upgradedsecondForm",
    "name": "Maapp",
    "score": 100,
    "signature": "[\"\",\"Maapp\",\"10% şansla rəqibin hasarını 3 saniyəlik -80% azaldar\"]",
    "derived": false
  },
  {
    "key": "avara",
    "name": "Avara",
    "score": 125,
    "signature": "[\"avara\",\"Avara\",\"İlk hücum qarşısındakı 2,5×5 karo sahəyə hasar verər və rəqibləri 2,5 saniyəlik 40% yavaşladar. İkinci hücumda moruq ataraq rəqibi 2,5 karo geri itələyər. Üçüncü hücumda avokado toxumu ataraq rəqibi 0,75 saniyəlik sərsəmlədər. Dördüncü hücum hədəfin üzərindəki 5×2,5 karo sahədə bütün rəqiblərə hasar verər. Hər hücumdan sonra 1,45 saniyə gecikmə tətbiq olunar.\"]",
    "derived": false
  },
  {
    "key": "avara/upgradedsecondForm",
    "name": "Avara",
    "score": 150,
    "signature": "[\"\",\"Avara\",\"İlk hücum qarşısındakı 2,5×5 karo sahəyə hasar verər və rəqibləri 2,75 saniyəlik 50% yavaşladar. İkinci hücumda moruq ataraq rəqibi 3 karo geri itələyər. Üçüncü hücumda avokado toxumu ataraq rəqibi 1,25 saniyəlik sərsəmlədər. Dördüncü hücum hədəfin üzərindəki 5×2,5 karo sahədə bütün rəqiblərə hasar verər. Hər hücumdan sonra 1,45 saniyə gecikmə tətbiq olunar.\"]",
    "derived": false
  },
  {
    "key": "john-reynolds",
    "name": "John Reynolds",
    "score": 125,
    "signature": "[\"john-reynolds\",\"John Reynolds\",\"Vuruşları kritik vurduqda rəqibin qalxanının içindən keçər. Canı hər 8% azaldıqda atı kişniyərək yaxındakı rəqib kartları 3 saniyəlik üstünə çəkər və bu müddətdə 25% hasar azaltma qazanar.\"]",
    "derived": false
  },
  {
    "key": "john-reynolds/upgradedsecondForm",
    "name": "John Reynolds",
    "score": 150,
    "signature": "[\"\",\"John Reynolds\",\"Vuruşları kritik vurduqda rəqibin qalxanının içindən keçər. Canı hər 8% azaldıqda atı kişniyərək yaxındakı rəqib kartları 5 saniyəlik üstünə çəkər və bu müddətdə 30% hasar azaltma qazanar.\"]",
    "derived": false
  },
  {
    "key": "atlas",
    "name": "Atlas",
    "score": 125,
    "signature": "[\"atlas\",\"Atlas\",\"Hər bir atışı o rəqib karta 8 yük, vuruşu isə 14 yük qazandırar. 100 yük olduqda o kartı 6 saniyəlik hipnoz edər, hipnoz edilən kart eyni zamanda dost karta doğru hərəkət edər\"]",
    "derived": false
  },
  {
    "key": "atlas/upgradedsecondForm",
    "name": "Atlas",
    "score": 150,
    "signature": "[\"atlas\",\"Atlas\",\"Hər bir atışı o rəqib karta 10 yük, vuruşu isə 16 yük qazandırar. 100 yük olduqda o kartı 8 saniyəlik hipnoz edər, hipnoz edilən kart eyni zamanda dost karta doğru hərəkət edər\"]",
    "derived": false
  },
  {
    "key": "great-stan",
    "name": "Great Stan",
    "score": 100,
    "signature": "[\"great-stan\",\"Great Stan\",\"Rəqib karta hər hasar verdikdə rəqib karta 4 yük qazandırar. 100 yük olduqda bir sonrakı 4 atış +125% hasar verər (18) və rəqib kart 24 saniyəlik qanama qazanar\"]",
    "derived": false
  },
  {
    "key": "great-stan/upgradedsecondForm",
    "name": "Great Stan",
    "score": 150,
    "signature": "[\"great-stan\",\"Great Stan\",\"Rəqib karta hər hasar verdikdə rəqib karta 6 yük qazandırar. 100 yük olduqda bir sonrakı 4 atış +200% hasar verər (72) və rəqib kart 96 saniyəlik qanama qazanar\"]",
    "derived": false
  },
  {
    "key": "marcy",
    "name": "Marcy",
    "score": 75,
    "signature": "[\"marcy\",\"Marcy\",\"Hər can çaldıqda 2 saniyəlik +20% Saldırı hızı qazanar\"]",
    "derived": false
  },
  {
    "key": "marcy/upgradedsecondForm",
    "name": "Marcy",
    "score": 100,
    "signature": "[\"marcy\",\"Marcy\",\"Hər can çaldıqda 2 saniyəlik +25% Saldırı hızı qazanar\"]",
    "derived": false
  },
  {
    "key": "shield-maiden",
    "name": "Shield Maiden",
    "score": 50,
    "signature": "[\"shield-maiden\",\"Shield Maiden\",\"Ətrafındakı dost kartlara qalxan yenilənmə effekti qazandırar (+2/5s)\"]",
    "derived": false
  },
  {
    "key": "shield-maiden/upgradedsecondForm",
    "name": "Shield Maiden",
    "score": 75,
    "signature": "[\"shield-maiden\",\"Shield Maiden\",\"Ətrafındakı dost kartlara qalxan yenilənmə effekti qazandırar (+4/5s)\"]",
    "derived": false
  },
  {
    "key": "shockwave",
    "name": "ShockWave",
    "score": 75,
    "signature": "[\"shockwave\",\"ShockWave\",\"Hər 9 saniyədə ətrafına enerji dalğası yayar bu dalğa rəqib kartları 1 saniyə sərsəmlədər və 12 hasar verər\"]",
    "derived": false
  },
  {
    "key": "shockwave/upgradedsecondForm",
    "name": "ShockWave",
    "score": 100,
    "signature": "[\"shockwave\",\"ShockWave\",\"Hər 9 saniyədə ətrafına enerji dalğası yayar bu dalğa rəqib kartları 1 saniyə sərsəmlədər və 18 hasar verər\"]",
    "derived": false
  },
  {
    "key": "xii-josh",
    "name": "XII Josh",
    "score": 150,
    "signature": "[\"xii-josh\",\"XII Josh\",\"Ətrafındakı 2x2 karo sahədə yalnız rəqib kartların manasının 50%-i qədər Hücum Sürəti bonusu qazanar. Canı 10%-in altına düşdükdə 10 saniyə uçar, sonra enərək 1.5x1.5 karo sahədə 24 hasar verər. Taxtaya hər 3-cü qoyuluşda vuruşları 33% şansla müddətsiz 15% Misfortune verər.\"]",
    "derived": false
  },
  {
    "key": "dumpsy",
    "name": "Dumpsy",
    "score": 175,
    "signature": "[\"dumpsy\",\"Dumpsy\",\"3 yaxın əşya ilə başlayar; bu əşyalar 0.90 saniyəlik hücum sürəti ilə ətrafında dönər. Ölən hər kartdan əlavə əşya qazanar (maksimum 12). Qazandığı əşyaları hər 1.15 saniyədə uzaqdakı rəqiblərə atar; ilk 3 əşyanı ata bilməz. Eyni hədəfə ardıcıl uğurlu vuruşların hasarı hər dəfə 5% artar, limit yoxdur. Taxtaya hər 2-ci qoyuluşda hər əşya 25% şansla təsadüfi element qazanar: 3 saniyəlik 25% Slow, 7x2 Zəhər və ya 3x5 Yanma.\"]",
    "derived": false
  },
  {
    "key": "blesser",
    "name": "Blesser",
    "score": 150,
    "signature": "[\"blesser\",\"Blesser\",\"İlk 12 saniyə olduğu yerdə qalar və hücum etməz. Bu müddətdə 12 karo yaxınlığındakı Güc göstəricisi ən yüksək olan dost kartı seçib 3 saniyə ərzində ona kutsama hazırlayar. Seçilmiş kart işarələnər; hədəf məhv olsa, uzaqlaşsa və ya rəqibə çevrilsə yeni dost seçilər və hazırlıq yenidən başlayar. Hazırlıq bitdikdə bir dəfə təsadüfi kutsama verər: bütün döyüş statlarına +20% (mana, say və ömür xaric), maksimum canının 25%-i qədər əlavə qalxan və bu qalxana vuranlara 1 saniyəlik Qanama, yaxud 1.75x1.75 karo görünməz tələ. Tələyə girən ilk rəqib 3 karo geri itilər və 2 saniyə Stun alar. İkinci qoyuluşda bonuslar 22.5%, 28.5%, 3 saniyə; üçüncü və sonrakılarda 25%, 32%, 4 saniyə olar. Kutsama verildikdə dost kartın üzərində təsdiq işarəsi görünər.\"]",
    "derived": false
  },
  {
    "key": "js",
    "name": "JS",
    "score": 125,
    "signature": "[\"js\",\"JS\",\"Vuruşları 8 saniyəlik +25% Curse verər. Hazırda itirdiyi hər 2% can üçün +0.025 karo menzil qazanar. Taxtaya hər 5-ci qoyuluşda Curse rəqibin aldığı hasarı 75% artırar.\"]",
    "derived": false
  },
  {
    "key": "mimic",
    "name": "Mimic",
    "score": 200,
    "signature": "[\"mimic\",\"Mimic\",\"Hər rəqibdən maksimum iki klon yaradar: onun qalxanını ilk dəfə qırdıqda bir dəfə, öz vuruşları ilə maksimum canının 20%-ni azaltdıqda bir dəfə. Klonun yalnız Canı, Qalxanı və Hasarı 30% az olar; passivi kopyalanar və ölənədək qalar. Taxtaya hər 3-cü qoyuluşda Predominance qazanar və gələn mənfi effekti 50% şansla rəqibə ötürər.\"]",
    "derived": false
  },
  {
    "key": "the-seven-sins",
    "name": "The Seven Sins",
    "score": 125,
    "signature": "[\"the-seven-sins\",\"The Seven Sins\",\"Taxtaya hər qoyuluşda 7 ölümcül günahdan biri təsadüfi seçilir və kart həmin formaya çevrilir. 1% Şansla insan formuna çevrilər\"]",
    "derived": false
  },
  {
    "key": "the-seven-sins/forms/0",
    "name": "Pride",
    "score": 75,
    "signature": "[\"pride\",\"Pride\",\"Yaxınlığında heç bir dost kart yoxdursa, +25% Hasar qazanar. Canı özünkündən daha az olan rəqib kartlara ekstra +25% Hasar verər\"]",
    "derived": false
  },
  {
    "key": "the-seven-sins/forms/1",
    "name": "Greed",
    "score": 150,
    "signature": "[\"greed\",\"Greed\",\"Hər saniyə yaxınındakı dost və rəqib kartların cari canının 1%-ni özünə çəkər. Hər kart öldükdə onun maksimum canının 5%-i qədər maksimum və cari Can qazanar.\"]",
    "derived": false
  },
  {
    "key": "the-seven-sins/forms/2",
    "name": "Lust",
    "score": 75,
    "signature": "[\"lust\",\"Lust\",\"Ətrafındakı 3x3 karo sahədə rəqiblərə Taunt verər. Cari canı ən az olan yaxın dost karta bağlanar; hər ikisi 5% daha az hasar alar. Dostu öldükdə 2 saniyə sonra yenidən bağlanar.\"]",
    "derived": false
  },
  {
    "key": "the-seven-sins/forms/3",
    "name": "Envy",
    "score": 125,
    "signature": "[\"envy\",\"Envy\",\"Qarşısındakı rəqibin hasarını və hücum formatını kopyalayar: AxB vuruş sayı və hasarı, Hücum Sürəti, Gecikmə və Menzil. Canlı növünü kopyalamaz.\"]",
    "derived": false
  },
  {
    "key": "the-seven-sins/forms/4",
    "name": "Gluttony",
    "score": 75,
    "signature": "[\"gluttony\",\"Gluttony\",\"Oğurladığı canın 50%-i qədər qalxan qazanar.\"]",
    "derived": false
  },
  {
    "key": "the-seven-sins/forms/5",
    "name": "Wrath",
    "score": 125,
    "signature": "[\"wrath\",\"Wrath\",\"Canı azaldıqca Berserk moduna keçər. Canı 10%-in altına düşdükdə maksimum +80% Hasar və +60% Saldırı Hızı qazanar.\"]",
    "derived": false
  },
  {
    "key": "the-seven-sins/forms/6",
    "name": "Sloth",
    "score": 25,
    "signature": "[\"sloth\",\"Sloth\",\"Çox yavaş hərəkət edər, hər 12 saniyədə +10 Qalxan qazanar.\"]",
    "derived": false
  },
  {
    "key": "the-seven-sins/forms/7",
    "name": "Human",
    "score": 0,
    "signature": "[\"human\",\"Human\",\"-\"]",
    "derived": false
  },
  {
    "key": "stella",
    "name": "Stella",
    "score": 100,
    "signature": "[\"stella\",\"Stella\",\"Hər yerləşdirmədə planörlə enərək 1.5x1.5 karo sahədə 20 hasar verər. Sonra 2 karo enində planör 3 karo irəliləyərək 12 hasar verər. İkinci yerləşdirmədən planörün hasarı və uçuş məsafəsi hər dəfə 10% artar (maksimum +50%); eniş hasarı 20 qalar.\"]",
    "derived": false
  },
  {
    "key": "huang-chen",
    "name": "Huáng-chén",
    "score": 175,
    "signature": "[\"huang-chen\",\"Huáng-chén\",\"Usta Huáng-chén canı 40%-in altına düşdüşdə 8 saniyəlik odaklanmaya girər bu müddətdə +90% Hasar azaltma qazanaraq hər saniyə itirdiyi maksimum canın 10%-i qədər can yeniləyər. Hər 2-ci taxtaya qoyuluşda odaklanma müddəstində alınan hasarın 10%-ni rəqib karta geri göndərər.\"]",
    "derived": false
  },
  {
    "key": "servant",
    "name": "Servant",
    "score": 125,
    "signature": "[\"servant\",\"Servant\",\"Hər atışda rəqib kartı 0,25 saniyə sərsəmlədər, Hər taxtaya qoyuluşda bu müddət +0,015 artar (Max: 0,75)\"]",
    "derived": false
  },
  {
    "key": "survivor",
    "name": "Survivor",
    "score": 150,
    "signature": "[\"survivor\",\"Survivor\",\"Qarşısına çıxan bütün kartlara hasar verər. (arxaya hərəkət edə və hasar verə bilməz) Hər saniyə -2 can itirər, bir kart öldürdükdə +75% can yeniləyər və maksimum canı +30 artar, Arxadan bir karta ekstra +100% hasar verər. Taxtaya hər 5-ci qoyuluşda +80% saldırı hızı və +35% hasar qazanar\"]",
    "derived": false
  },
  {
    "key": "little-princess",
    "name": "Little Princess",
    "score": 150,
    "signature": "[\"little-princess\",\"Little Princess\",\"Həyatda qaldığı müddətcə ağ atlı şəhzadəsini gözləyər. Hər saniyə +1% hasar və +0,5% Saldırı hızı qazanar (Max: 80%/40%). Hər taxtaya qoyuluşda bonuslar +0,2% və +0,1% artar. 1 - 1%/+0,5% , 80%/40% ; 2- 1,2%/+0,6% , 96%/48% ; 3 - 1,4%/+0,7% , 112%/56% ; 4 - 1,6%/+0,8% , 128%/64% ; 5 -  1,8%/+0,9% , 144%/72% ; 6 -  2%/+1% , 160%/80%\"]",
    "derived": false
  },
  {
    "key": "three-wise-monkeys",
    "name": "Three Wise Monkeys",
    "score": 100,
    "signature": "[\"three-wise-monkeys\",\"Three Wise Monkeys\",\"Biri rəqib kartı 3 saniyəlik kor edər, Biri rəqib kartı 3 saniyəlik susturar, Biri rəqib karta bədbəxtlik effekti verər.\"]",
    "derived": false
  },
  {
    "key": "ase",
    "name": "Ase",
    "score": 0,
    "signature": "[\"ase\",\"Ase\",\"\"]",
    "derived": true
  },
  {
    "key": "ase/type1",
    "name": "Ase",
    "score": 125,
    "signature": "[\"ase\",\"Ase\",\"Hər 7 saniyədə bir parça qazanar 4 parça olduqda bir böyük robot yaradar\"]",
    "derived": false
  },
  {
    "key": "ase/type1/forms/0",
    "name": "Giga-R",
    "score": 50,
    "signature": "[\"giga-r\",\"Giga-R\",\"İlk 22 saniyə 10% Hasar Azaltma qazanar\"]",
    "derived": false
  },
  {
    "key": "ase/type2",
    "name": "Ase",
    "score": 125,
    "signature": "[\"ase\",\"Ase\",\"Hər 7 saniyədə bir parça qazanar 4 parça olduqda bir böyük robot yaradar\"]",
    "derived": false
  },
  {
    "key": "ase/type2/forms/0",
    "name": "Giga-R",
    "score": 75,
    "signature": "[\"giga-r-2\",\"Giga-R\",\"Hər kart öldürdükdə +3% Saldırı Hızı bonusu (Max:30%)\"]",
    "derived": false
  },
  {
    "key": "leno",
    "name": "Leno",
    "score": 0,
    "signature": "[\"leno\",\"Leno\",\"\"]",
    "derived": true
  },
  {
    "key": "leno/type1",
    "name": "Leno",
    "score": 75,
    "signature": "[\"leno\",\"Leno\",\"İlk 25 saniyə +45% Kritik Şansı daha sonra +15% Kritik şansı qazanar\"]",
    "derived": false
  },
  {
    "key": "leno/type2",
    "name": "Leno",
    "score": 75,
    "signature": "[\"leno\",\"Leno\",\"(Heyvan,Robot,Ölü,Ruh,Uzaylı,Varlıq) tipli kartlara ekstra +40% Hasar verir\"]",
    "derived": false
  },
  {
    "key": "king",
    "name": "King",
    "score": 0,
    "signature": "[\"king\",\"King\",\"\"]",
    "derived": true
  },
  {
    "key": "king/type1",
    "name": "King",
    "score": 125,
    "signature": "[\"king\",\"King\",\"King döyüş meydanında əsl orxu kimi çıxış edir. Onun varlığı ətrafındakı bütün dost kartları ruhlandıraraq onlara +25% hücum sürəti bonusu bəxş edər.\"]",
    "derived": false
  },
  {
    "key": "king/type2",
    "name": "King",
    "score": 150,
    "signature": "[\"king\",\"King\",\"King ikinci formasına keçdikdə müdafiə taktikasına üstünlük verir. O, döyüş meydanında sabit qalaraq hər 12 saniyədə bir Guard çağırar. Eyni zamanda, bu çağırış anında özünə 2 saniyəlik 15% hasar azaltma qalxanı qazandırar.\"]",
    "derived": false
  },
  {
    "key": "king/type2/forms/0",
    "name": "Guard",
    "score": 50,
    "signature": "[\"guard\",\"Guard\",\"King-in sadiq mühafizəçisi rəqiblərin müdafiə xətlərini yarmaq üçün proqramlaşdırılıb. Onun etdiyi bütün zərbələr aktiv qalxanı olan rəqib kartlara qarşı ekstra +30% hasar bonusu qazanar. Bu xüsusiyyət onu ön cəbhədə böyük qalxanlarla gizlənən tankları və müdafiə vahidlərini sürətlə zərərsizləşdirmək üçün effektiv bir köməkçi karta çevirir.\"]",
    "derived": false
  },
  {
    "key": "dracula",
    "name": "Dracula",
    "score": 0,
    "signature": "[\"dracula\",\"Dracula\",\"\"]",
    "derived": true
  },
  {
    "key": "dracula/type1",
    "name": "Dracula",
    "score": 100,
    "signature": "[\"dracula\",\"Dracula\",\"Hər uğurlu vuruşda +1% əlavə Can Çalma Şansı qazanar. Əlavə bonus maksimum +25%-dir; baza 25% ilə birlikdə ümumi şans 50%-ə çatar.\"]",
    "derived": false
  },
  {
    "key": "dracula/type2",
    "name": "Dracula",
    "score": 125,
    "signature": "[\"dracula\",\"Dracula\",\"İtirdiyi hər 10% Can üçün ekstra +5% Hasar Azaltma qazanar, Öləndə içindən *Bats* çıxar\"]",
    "derived": false
  },
  {
    "key": "dracula/type2/forms/0",
    "name": "Bats",
    "score": 50,
    "signature": "[\"bats\",\"Bats\",\"İlk vuruşu ekstra +40% Hasar verər\"]",
    "derived": false
  },
  {
    "key": "leila",
    "name": "Leila",
    "score": 0,
    "signature": "[\"leila\",\"Leila\",\"\"]",
    "derived": true
  },
  {
    "key": "leila/type1",
    "name": "Leila",
    "score": 75,
    "signature": "[\"leila\",\"Leila\",\"Hər 24 uğurlu güllədən sonra 3x3 karo sahəyə 12 hasar verən bomba atar. Vurulan rəqiblərin menzili və görüşü 4 saniyəlik 12.5% azalar.\"]",
    "derived": false
  },
  {
    "key": "leila/type2",
    "name": "Leila",
    "score": 100,
    "signature": "[\"leila\",\"Leila\",\"Hər 5-ci vuruşu +20% daha geniş bir əraziyə yayılar və rəqib kartları 8 saniyəlik qanadar\"]",
    "derived": false
  },
  {
    "key": "lord",
    "name": "Lord",
    "score": 0,
    "signature": "[\"lord\",\"Lord\",\"\"]",
    "derived": true
  },
  {
    "key": "lord/type1",
    "name": "Lord",
    "score": 175,
    "signature": "[\"lord\",\"Lord\",\"Canı 5%-in altına düşdükdə hər yerləşdirmədə bir dəfə 5 saniyəlik Immortal qazanar. Bu müddətdə həmin anda çatışmayan canının 25%-ni bərpa edər.\"]",
    "derived": false
  },
  {
    "key": "lord/type2",
    "name": "Lord",
    "score": 150,
    "signature": "[\"lord\",\"Lord\",\"Transformasiyadan sonra Lord daha dayanıqlı formaya keçər və hər saniyə +1 can yeniləyər. Üstəlik, onun canı hər 10% düşdükdə kölgələrdən onu qorumaq üçün bir Rider çağırar (Maksimum: 5 Rider çağırıla bilər).\"]",
    "derived": false
  },
  {
    "key": "lord/type2/forms/0",
    "name": "Rider",
    "score": 75,
    "signature": "[\"rider\",\"Rider\",\"Rider müdafiəsini itirdikdə daha ölümcül bir qüvvəyə çevrilər. Öz qoruyucu qalxanı tam qırıldıqdan sonra hücum gücünü kəskin şəkildə artıraraq əlavə +50% hasar qazanar. Bu qabiliyyət onu müdafiəsiz qaldığı anlarda belə rəqib üçün ciddi bir təhlükəyə çevirir.\"]",
    "derived": false
  },
  {
    "key": "hunter",
    "name": "Hunter",
    "score": 0,
    "signature": "[\"hunter\",\"Hunter\",\"\"]",
    "derived": true
  },
  {
    "key": "hunter/type1",
    "name": "Hunter",
    "score": 100,
    "signature": "[\"hunter\",\"Hunter\",\"Heyvan tipli kartlara +60% Hasar bonusu, öləndə dönüşər\"]",
    "derived": false
  },
  {
    "key": "hunter/type1/forms/0",
    "name": "Wolf",
    "score": 50,
    "signature": "[\"wolf\",\"Wolf\",\"Qalxana ekstra +50% Hasar bonusu\"]",
    "derived": false
  },
  {
    "key": "hunter/type2",
    "name": "Hunter",
    "score": 100,
    "signature": "[\"hunter\",\"Hunter\",\"İnsan tipli kartlara +50% Hasar bonusu, öləndə dönüşər\"]",
    "derived": false
  },
  {
    "key": "hunter/type2/forms/0",
    "name": "Eagle",
    "score": 75,
    "signature": "[\"eagle\",\"Eagle\",\"Vuruşları qalxandan keçər\"]",
    "derived": false
  },
  {
    "key": "soul-master",
    "name": "Soul Master",
    "score": 0,
    "signature": "[\"soul-master\",\"Soul Master\",\"\"]",
    "derived": true
  },
  {
    "key": "soul-master/type1",
    "name": "Soul Master",
    "score": 125,
    "signature": "[\"soul-master\",\"Soul Master\",\"Ölən hər kart ruh buraxar, hər 10 ruhda +25% Hasar bonusu\"]",
    "derived": false
  },
  {
    "key": "soul-master/type2",
    "name": "Soul Master",
    "score": 125,
    "signature": "[\"soul-master\",\"Soul Master\",\"Ölən hər kart ruh buraxar, hər 8 ruhda qarşıdakı ən yaxın ilk rəqib M.Canının 10%-i qədər hasar alar\"]",
    "derived": false
  },
  {
    "key": "mr-and-mrs-ray",
    "name": "Mr. and Mrs. Ray",
    "score": 0,
    "signature": "[\"mr-and-mrs-ray\",\"Mr. and Mrs. Ray\",\"\"]",
    "derived": true
  },
  {
    "key": "mr-and-mrs-ray/type1",
    "name": "Mr. Ray",
    "score": 175,
    "signature": "[\"the-rays\",\"Mr. Ray\",\"Cütlük bir-birindən maksimum 2.5 karo uzaqda olarkən hər biri saniyədə 6 yük qazanar. Hər ikisi 100 yükdə olarkən menzildə vura bildikləri görünən rəqib kart varsa 5 saniyəlik bir bədənə birləşər və canlarını ortaqlaşdırar. Birləşmiş halda 360° sahədə hər 0.25 saniyədə 5 hasar verər və 3 Can bərpa edər. Bu müddətdə 25% hasar azaltma qazanar. Ulti bitdikdə ortaq can nisbəti ilə ayrılarlar.\"]",
    "derived": false
  },
  {
    "key": "mr-and-mrs-ray/type1/forms/0",
    "name": "Mrs. Ray",
    "score": 175,
    "signature": "[\"the-rays\",\"Mrs. Ray\",\"Cütlük bir-birindən maksimum 2.5 karo uzaqda olarkən hər biri saniyədə 6 yük qazanar. Hər ikisi 100 yükdə olarkən menzildə vura bildikləri görünən rəqib kart varsa 5 saniyəlik bir bədənə birləşər və canlarını ortaqlaşdırar. Birləşmiş halda 360° sahədə hər 0.25 saniyədə 5 hasar verər və 3 Can bərpa edər. Bu müddətdə 25% hasar azaltma qazanar. Ulti bitdikdə ortaq can nisbəti ilə ayrılarlar.\"]",
    "derived": false
  },
  {
    "key": "mr-and-mrs-ray/type2",
    "name": "Mr. Ray",
    "score": 175,
    "signature": "[\"the-rays\",\"Mr. Ray\",\"Tək hədəfə hasar verər. Cütlük maksimum 2.5 karo məsafədə saniyədə 6 yük qazanar. Hər ikisi 100 yükdə olarkən menzildə vura bildikləri görünən rəqib kart varsa bir bədənə birləşər və canlarını ortaqlaşdırar. Birləşmiş halda ən yaxın uyğun rəqibə doğru 3.75 saniyədə ən çox 5 karo irəliləyər; 2x5 karo keçid sahəsində içindən keçdikləri hər rəqibə bir dəfə cəmi 75 hasar verərlər. İrəliləmə müddətində 75% hasar azaltma qazanarlar. Bu müddətdə ortaq can 20%-dən aşağı düşərsə çatışmayan canın 75%-ni bərpa edərlər; sağalma cütlüyün hər yerləşdirilməsində yalnız bir dəfə işləyər. Keçilə bilən yolun sərhədində dayanarlar və xəritədən kənara çıxmazlar. Ulti bitdikdə ortaq can nisbəti ilə ayrılarlar.\"]",
    "derived": false
  },
  {
    "key": "mr-and-mrs-ray/type2/forms/0",
    "name": "Mrs. Ray",
    "score": 175,
    "signature": "[\"the-rays\",\"Mrs. Ray\",\"Tək hədəfə hasar verər. Cütlük maksimum 2.5 karo məsafədə saniyədə 6 yük qazanar. Hər ikisi 100 yükdə olarkən menzildə vura bildikləri görünən rəqib kart varsa bir bədənə birləşər və canlarını ortaqlaşdırar. Birləşmiş halda ən yaxın uyğun rəqibə doğru 3.75 saniyədə ən çox 5 karo irəliləyər; 2x5 karo keçid sahəsində içindən keçdikləri hər rəqibə bir dəfə cəmi 75 hasar verərlər. İrəliləmə müddətində 75% hasar azaltma qazanarlar. Bu müddətdə ortaq can 20%-dən aşağı düşərsə çatışmayan canın 75%-ni bərpa edərlər; sağalma cütlüyün hər yerləşdirilməsində yalnız bir dəfə işləyər. Keçilə bilən yolun sərhədində dayanarlar və xəritədən kənara çıxmazlar. Ulti bitdikdə ortaq can nisbəti ilə ayrılarlar.\"]",
    "derived": false
  },
  {
    "key": "dragon",
    "name": "Dragon",
    "score": 0,
    "signature": "[\"dragon\",\"Dragon\",\"\"]",
    "derived": true
  },
  {
    "key": "dragon/type1",
    "name": "Dragon (Light)",
    "score": 175,
    "signature": "[\"dragon-light\",\"Dragon (Light)\",\"Canı 25%-in altına düşdükdə 3 saniyəlik toxunulmaz olaraq yuxarı uçar və yox olar. 4 saniyə sonra qalanın ən arxasından olduğu kolidor boyunca olduğu yerə qədər gələr və alta doğru alov atar. Alov 24 hasar verərə və rəqib kartın statlarını 10% azaldar\"]",
    "derived": false
  },
  {
    "key": "dragon/type2",
    "name": "Dragon (Dark)",
    "score": 175,
    "signature": "[\"dragon-dark\",\"Dragon (Dark)\",\"Canı 25%-in altına düşdükdə 3 saniyəlik toxunulmaz olaraq yuxarı uçar və yox olar. 4 saniyə sonra qalanın ən arxasından olduğu kolidor boyunca olduğu yerə qədər gələr və alta doğru alov atar. Alov 48  hasar verərə və rəqib kartı 30 saniyəlik lənətləyər\"]",
    "derived": false
  },
  {
    "key": "albert",
    "name": "Albert",
    "score": 50,
    "signature": "[\"albert\",\"Albert\",\"Eyni rəqibə hər uğurlu vuruşdan sonra hasarı +1 artar (maksimum əlavə bonus: +3). Hədəf dəyişdikdə bonus sıfırlanar.\"]",
    "derived": false
  },
  {
    "key": "chicken",
    "name": "Chicken",
    "score": 175,
    "signature": "[\"chicken\",\"Chicken\",\"Chicken rəqibə toxunduqda və ya öldürüldükdə bir dəfə partlayar. Adi partlayış 2×2 karo sahədə 100 hasar verər. 80% şansla partlayışın sahəsi 3.5×3.5 karo, hasarı isə əlavə +400% bonusla 500 olar. Adi hücum etmir. Henry-nin laboratoriyasından çıxan ən təhlükəli canlı bəlkə də budur.\"]",
    "derived": false
  },
  {
    "key": "frostshot",
    "name": "Frostshot",
    "score": 125,
    "signature": "[\"frostshot\",\"Frostshot\",\"Atışları rəqib kartı <b>3</b> saniyəlik <b>40%</b> yavaşladar, <b>18</b> saniyə hasar verməzsə hasarı <b>+275%</b> artar\"]",
    "derived": false
  },
  {
    "key": "hornets",
    "name": "Hornets",
    "score": 75,
    "signature": "[\"hornets\",\"Hornets\",\"Uçan kartlardan <b>-50%</b>, Heyvan tipli kartlardan <b>-25%</b> daha az hasar alar\"]",
    "derived": false
  },
  {
    "key": "warborn",
    "name": "Warborn",
    "score": 75,
    "signature": "[\"warborn\",\"Warborn\",\"Hər 6 saniyədə itirilmiş qalxan miqdarının 20%-ni yeniləyər\"]",
    "derived": false
  },
  {
    "key": "x-bot",
    "name": "X-Bot",
    "score": 50,
    "signature": "[\"x-bot\",\"X-Bot\",\"Hər 2 saniyədə +5% Hasar bonusu qazanar, hasar verəndə bu bonus silinər\"]",
    "derived": false
  },
  {
    "key": "nyra",
    "name": "Nyra",
    "score": 100,
    "signature": "[\"nyra\",\"Nyra\",\"<b>25,000</b> karo gedərsə <b>+100%</b> Hasar bonusu qazanar\"]",
    "derived": false
  },
  {
    "key": "deadscope",
    "name": "Deadscope",
    "score": 50,
    "signature": "[\"deadscope\",\"Deadscope\",\"Deadscope dəqiqliyini sürətlə birləşdirir. Bir rəqib kartı məhv etdikdən dərhal sonra qazandığı momentum sayəsində növbəti atışı üçün +20% hücum sürəti bonusu əldə edər. Bu, ona hədəfləri ard-arda, sürətli şəkildə zərərsizləşdirmək imkanı verir.\"]",
    "derived": false
  },
  {
    "key": "turtle",
    "name": "Turtle",
    "score": 100,
    "signature": "[\"turtle\",\"Turtle\",\"Qalxanı qırıldıqdan sonrakı <b>3</b> saniyə ərzində <b>+75</b> Qalxan qazanar\"]",
    "derived": false
  },
  {
    "key": "turtle/forms/0",
    "name": "Mini Turtles",
    "score": 75,
    "signature": "[\"\",\"Mini Turtles\",\"<b>*Turtle*</b> ölərsə <b>+100%</b> Hasar bonusu qazanar, <b>*Turtle*</b>-nın arxasında gələrlər\"]",
    "derived": false
  },
  {
    "key": "feral-wolf",
    "name": "Feral Wolf",
    "score": 75,
    "signature": "[\"feral-wolf\",\"Feral Wolf\",\"İlk <b>16</b> saniyə <b>+100%</b> Hız bonusu, ilk vuruşu ekstra <b>+30%</b> Hasar bonusu qazanar\"]",
    "derived": false
  },
  {
    "key": "trac",
    "name": "Trac",
    "score": 150,
    "signature": "[\"trac\",\"Trac\",\"Trac döyüş meydanında aldığı hər bir zərbə ilə daha da təhlükəli və dayanıqlı bir döyüşçüyə çevrilir. O, aldığı hər 24 hasardan sonra daimi olaraq +0,5% hasar azaltma və +0,5% hücum sürəti qazanar. Uzunmüddətli qarşıdurmalarda Trac həm keçilməz bir sipərə, həm də sürətli bir hücumçuya çevrilər.\"]",
    "derived": false
  },
  {
    "key": "tornado",
    "name": "Tornado",
    "score": 150,
    "signature": "[\"tornado\",\"Tornado\",\"Tornado 1.2 karo radiusa daxil olan mərkəzi hədəfi içinə çəkər; həmin kart hərəkət və hasar verə bilməz. Hər 0.25 saniyədə mərkəzi hədəfə 4, radiusdakı digər rəqiblərə 2 hasar verər. Canı 50% və ya daha aşağı olduqda bu hasarlar müvafiq olaraq 6 və 3 olar; bonus toplanmır. 10-cu vuruşdan sonra sağ qalan mərkəzi hədəfi 3.5 karo uzağa atar və 1.25 saniyə gecikmə qazanar.\"]",
    "derived": false
  },
  {
    "key": "dino",
    "name": "Dino",
    "score": 100,
    "signature": "[\"dino\",\"Dino\",\"Hər hasar verdikdə <b>+2</b> Hasar bonusu <b>(Max:24)</b>\"]",
    "derived": false
  },
  {
    "key": "tenta",
    "name": "Tenta",
    "score": 100,
    "signature": "[\"tenta\",\"Tenta\",\"Eyni anda <b>5</b> fərqli rəqibə hasar verər və <b>1</b> saniyəlik <b>25%</b> yavaşladar\"]",
    "derived": false
  },
  {
    "key": "fire-archer",
    "name": "Fire Archer",
    "score": 125,
    "signature": "[\"fire-archer\",\"Fire Archer\",\"Royal Blood qrupunun bu uzaq məsafəli nişançısı hər atışında yayını daha da qızışdırır. Etdiyi hər 4-cü atışdan sonra onun silahı tam alovlanar və ona 3 saniyəlik +70% hücum sürəti qazandırar. Bu qısamüddətli partlayış mexanikası rəqib xətlərini ox yağışına tutmaq üçün mükəmməldir.\"]",
    "derived": false
  },
  {
    "key": "shadow-reaper",
    "name": "Shadow Reaper",
    "score": 150,
    "signature": "[\"shadow-reaper\",\"Shadow Reaper\",\"Shadow Reaper döyüşə kölgələrin arasından qəfil bir zərbə ilə başlayır və onun ilk vuruşu hər zaman kritik hasar vurər. Üstəlik, o, hər hansı bir rəqib kartı məhv etdikdə qurbanının ruhunu udar. Bu enerji sayəsində onun növbəti vuruşu hədəfinə rəqibin maksimum canının 15%-i qədər əlavə hasar verər. Tank xarakterləri sürətlə əritmək üçün mükəmməl passiv qabiliyyətdir.\"]",
    "derived": false
  },
  {
    "key": "voltriker",
    "name": "Voltriker",
    "score": 75,
    "signature": "[\"voltriker\",\"Voltriker\",\"Hər <b>4</b>-cü vuruş <b>3x3</b> yanındakı <b>3</b> karta Hasar verər\"]",
    "derived": false
  },
  {
    "key": "frostmaw",
    "name": "Frostmaw",
    "score": 75,
    "signature": "[\"frostmaw\",\"Frostmaw\",\"Vuruşları 8% şansla <b>5</b> saniyəlik rəqibi susturar\"]",
    "derived": false
  },
  {
    "key": "hexon",
    "name": "Hexon",
    "score": 75,
    "signature": "[\"hexon\",\"Hexon\",\"Hər <b>4</b>-cü vuruş <b>0.60s</b> saniyəlik rəqibləri sərsəmlətər\"]",
    "derived": false
  },
  {
    "key": "mecha-shield",
    "name": "Mecha Shield",
    "score": 75,
    "signature": "[\"mecha-shield\",\"Mecha Shield\",\"Bu mexaniki qoruyucu ətrafındakı müttəfiqlərini qorumaq üçün təyin olunub. O, özünə yaxın məsafədə yerləşən bütün dost kartlara hər 21 saniyədə bir +25 Qalxan bəxş edər.Bu periodik enerji dalğası ön cəbhədəki döyüşçülərin (xüsusilə Angels və Trac kimi kartların) sağ qalma şansını kəskin şəkildə artırır.\"]",
    "derived": false
  },
  {
    "key": "venomspikes",
    "name": "Venomspikes",
    "score": 125,
    "signature": "[\"venomspikes\",\"Venomspikes\",\"Venomspikes hər uğurlu vuruşunda rəqib kartın bədəninə xüsusi bir toksin yeridərək onu zəhərləyər. Bu zəhər effekti eyni hədəf üzərində üst-üstə yığılar. Rəqib kart tam 5 dəfə zəhərləndikdə bədəndəki toksinlər reaksiyaya girərək partlayış törədər. Bu an rəqib öz maksimum canının 8%-i qədər birbaşa böyük hasar alar. Yüksək cana malik olan dözümlü tankları və böyük vahidləri zamanla əritmək üçün mükəmməl bir passiv mexanikadır.\"]",
    "derived": false
  },
  {
    "key": "astranova",
    "name": "Astranova",
    "score": 125,
    "signature": "[\"astranova\",\"Astranova\",\"Hər <b>10</b>-cu atış <b>5x5</b> yaxındakı rəqib kartlara <b>+400%</b> Hasar bonusu verər\"]",
    "derived": false
  },
  {
    "key": "kai",
    "name": "Kai",
    "score": 125,
    "signature": "[\"kai\",\"Kai\",\"Hər 3-cü vuruşu ətrafdakı rəqibləri 0,8 saniyəlik sərsəmlətər, Hər 10 hasar aldıqda 20 yük qazanar. 100 yükdə ilk vuruşu +60% ekstra hasar verər və rəqibi 3 karo geri itər\"]",
    "derived": false
  },
  {
    "key": "cassandra",
    "name": "Cassandra",
    "score": 175,
    "signature": "[\"cassandra\",\"Cassandra\",\"Özünə və ətrafındakı dost kartlara üstünlük effekti verər, ətrafına hər saniyə musiqi yayar, bu musiqi dost kartlara hər saniyə +1 M. Can verər (Max: 50), eyni zamanda rəqib kartlara 1 hasar verər\"]",
    "derived": false
  },
  {
    "key": "dr-golbert",
    "name": "Dr. Golbert",
    "score": 150,
    "signature": "[\"dr-golbert\",\"Dr. Golbert\",\"Rəqib kartların aktiv yüklərinin 10%-ni hər 4,8 saniyədə özünə çəkər. 100 yük olduqda taxtada olan bütün rəqib kartları 12 saniyəlik susturar\"]",
    "derived": false
  },
  {
    "key": "indi",
    "name": "Indi",
    "score": 100,
    "signature": "[\"indi\",\"Indi\",\"Rəqib karta bir ilan göndərər. İlan bir rəqibə yapışaraq ona 8 saniyəlik qanama verər. Əgər yaxında başqa bir rəqib kart varsa ona keçər, olmasa eyni kartı bir daha 8 saniyəlik qanadar. Bunu maksimum 3 dəfə edə bilər.\"]",
    "derived": false
  },
  {
    "key": "punchman",
    "name": "Punchman",
    "score": 75,
    "signature": "[\"punchman\",\"Punchman\",\"Hər vuruşda +2 Hasar bonusu qazanar amma saldırı hızı -0,1 azalar\"]",
    "derived": false
  },
  {
    "key": "hammies",
    "name": "Hammies",
    "score": 25,
    "signature": "[\"hammies\",\"Hammies\",\"<b>İlk 12</b> saniyə <b>+20%</b> Hız bonusu qazanar\"]",
    "derived": false
  },
  {
    "key": "b-b",
    "name": "B-B",
    "score": 75,
    "signature": "[\"b-b\",\"B-B\",\"<b>*Heyvan*</b> tipli kartlardan <b>-60%</b> daha az hasar alar\"]",
    "derived": false
  },
  {
    "key": "scrapy",
    "name": "Scrapy",
    "score": 100,
    "signature": "[\"scrapy\",\"Scrapy\",\"<b>25%</b> şansla ekstra <b>+50%</b> Hasar verər, atışları qalxandan keçər\"]",
    "derived": false
  },
  {
    "key": "nitrox",
    "name": "Nitrox",
    "score": 75,
    "signature": "[\"nitrox\",\"Nitrox\",\"Yaxındakı kartlara ekstra <b>+12%</b> Saldırı Hızı qazanar\"]",
    "derived": false
  },
  {
    "key": "nortex",
    "name": "Nortex",
    "score": 75,
    "signature": "[\"nortex\",\"Nortex\",\"Hər 3 gülləlik seriyada sonrakı atışlar əsas hasarın +40%-i qədər əlavə bonus qazanar: 5 → 7 → 9 hasar. Hər yeni seriyada bonus sıfırlanar.\"]",
    "derived": false
  },
  {
    "key": "gloop",
    "name": "Gloop",
    "score": 175,
    "signature": "[\"gloop\",\"Gloop\",\"Gloop toxunduğu bütün uyğun rəqib kartları öz yapışqan kütləsinin içinə çəkərək onları hərəkətsiz qoyar, hücum etmələrinə mane olar və davamlı hasar verər. Onun döyüş meydanında 100 saniyəlik məhdud ömrü var və hər saniyə maksimum canının 1%-ni itirər. Ömrü başa çatdıqda və ya məhv edildikdə içindəki sağ qalan kartlar azad olar, daxili enerjisi isə partlayaraq ətrafındakı bütün rəqiblərə 150 hasar yetirər.\"]",
    "derived": false
  },
  {
    "key": "henry",
    "name": "Henry",
    "score": 50,
    "signature": "[\"henry\",\"Henry\",\"Fermadakı dəhşətlərin yaradıcısı olan Henry, öz yaratdıqlarını və digər vəhşi heyvanları necə idarə edəcəyini yaxşı bilir. O, \\\"Heyvan\\\" tipli bütün rəqib kartlara qarşı əlavə +40% hasar verər. Bu xüsusiyyət onu heyvan mənşəli varlıqlara qarşı ən qorxulu ovçuya çevirir.\"]",
    "derived": false
  },
  {
    "key": "venomora",
    "name": "Venomora",
    "score": 75,
    "signature": "[\"venomora\",\"Venomora\",\"Atışları rəqibləri <b>2</b> saniyəlik <b>25%</b> yavaşladar\"]",
    "derived": false
  },
  {
    "key": "blocker",
    "name": "Blocker",
    "score": 125,
    "signature": "[\"blocker\",\"Blocker\",\"Müasir ağır qalxan və zirehlə təchiz olunmuş Blocker qarşıdan gələn bütün birbaşa hasarları -30% azaldar. Onun yaratdığı texnoloji maneə yaxınlıqdakı dost kartları qoruyaraq, büyülərdən -20% daha az hasar almalarını təmin edər.\"]",
    "derived": false
  },
  {
    "key": "fen",
    "name": "Fen",
    "score": 100,
    "signature": "[\"fen\",\"Fen\",\"Atışları rəqib kartları 7 saniyəlik kor edər: menzilləri və görüşləri 12,5% azalar.\"]",
    "derived": false
  },
  {
    "key": "ben",
    "name": "Ben",
    "score": 75,
    "signature": "[\"ben\",\"Ben\",\"Atışları rəqib kartları yaralayar, hər 4-cü yarada 2 saniyəlik qanama effekti verər\"]",
    "derived": false
  },
  {
    "key": "freak",
    "name": "Freak",
    "score": 125,
    "signature": "[\"freak\",\"Freak\",\"Freak qeyri-adi regenerasiya qabiliyyətinə malikdir və döyüş boyu hər saniyə +1 can bərpa edər. Bu bədheybət ölümcül zərbə aldıqda tamamilə məhv olmur; bədəni iki yerə parçalanaraq döyüşü davam etdirmək üçün iki yeni Mini Freak formalaşdırar.\"]",
    "derived": false
  },
  {
    "key": "freak/forms/0",
    "name": "Mini Freaks",
    "score": 75,
    "signature": "[\"\",\"Mini Freaks\",\"Freak-in parçalanmasından yaranan bu kiçik varlıqlar olduqca aqressiv və qeyri-sabitdir. Onlar döyüş meydanında məhv edildiyi an partlayar və yaxınlıqdakı rəqib kartlara birbaşa 50 hasar verərlər.\"]",
    "derived": false
  },
  {
    "key": "nightprowler",
    "name": "Nightprowler",
    "score": 100,
    "signature": "[\"nightprowler\",\"Nightprowler\",\"2 saniyə ərzində hasar vermədikdə və almadıqda görünməz olar. Görünməzlikdən ilk uğurlu hücumu rəqib kartlara 8 saniyəlik bədbəxtlik verər: hücumlarının və özəlliklərinin 10% şansla boşa çıxmasına səbəb olar. Hasar verdikdə və ya aldıqda görünməzliyi itirər və 2 saniyəlik sayğac sıfırlanar.\"]",
    "derived": false
  },
  {
    "key": "twins",
    "name": "Twins",
    "score": 125,
    "signature": "[\"twins\",\"Twins\",\"Biri ölərsə digəri <b>+200%</b> Can və <b>+100%</b> Hasar bonusu qazanar\"]",
    "derived": false
  },
  {
    "key": "bethe",
    "name": "Bethe",
    "score": 75,
    "signature": "[\"bethe\",\"Bethe\",\"Texnoloji dahi olan Bethe döyüş meydanında məhv edilən hər bir rəqib kartın enerjisini öz sisteminə inteqrasiya edir. Öldürdüyü hər bir rəqib kartdan sonra 10 saniyəlik +5% kritik hasar şansı qazanar. Bu effekt üst-üstə yığıla bildiyi üçün, kütləvi döyüşlərdə Bethe getdikcə daha ölümcül bir qüvvəyə çevrilir.\"]",
    "derived": false
  },
  {
    "key": "snaykies",
    "name": "Snaykies",
    "score": 100,
    "signature": "[\"snaykies\",\"Snaykies\",\"Vuruşları qalxandan keçər, vuruşları ekstra <b>2x4</b> Zəhər Hasarı verər\"]",
    "derived": false
  },
  {
    "key": "soldier",
    "name": "Soldier",
    "score": 50,
    "signature": "[\"soldier\",\"Soldier\",\"Soldier döyüş meydanındakı hava təhlükələrini zərərsizləşdirmək üçün xüsusi sursatdan istifadə edir. Göydə uçan bütün rəqib kartlara qarşı əlavə +33% hasar verər.\"]",
    "derived": false
  },
  {
    "key": "bees",
    "name": "Bees",
    "score": 75,
    "signature": "[\"bees\",\"Bees\",\"Bu mutasiya olunmuş arı sürüsü intihar hücumu həyata keçirir. Onların ilk vuruşu rəqib kartı dərhal zəhərləyər və əlavə 8x2 hasar verər. Lakin bu ölümcül zərbədən sonra arılar özləri də tələf olurlar. Bu kart rəqib kartların ən güclü döyüşçülərini zəiflətmək üçün strateji bir \\\"fəda\\\" kartıdır.\"]",
    "derived": false
  },
  {
    "key": "hailey",
    "name": "Hailey",
    "score": 100,
    "signature": "[\"hailey\",\"Hailey\",\"<b>360°</b> Hasar verər, hasar verdikcə <b>+0,5%</b> Kritik Şansı qazanar.\"]",
    "derived": false
  },
  {
    "key": "angels",
    "name": "Angels",
    "score": 125,
    "signature": "[\"angels\",\"Angels\",\"Cəmi 10 mələk yaranar. İlk mələk dərhal, ikinci 0,40 saniyə sonra yaranar; hər sonrakı mələk üçün fasilə 0,05 saniyə artar: 0,40 → 0,45 → 0,50 saniyə və s. Onuncu mələkdən sonra axın dayanar. Meydandakı hər bir Angels vahidi məhv edildikdə, meydanda sağ qalan digər dost Angels vahidləri daimi +2 hasar qazanar.\"]",
    "derived": false
  },
  {
    "key": "boomix",
    "name": "Boomix",
    "score": 100,
    "signature": "[\"boomix\",\"Boomix\",\"Atışı hədəfin olduğu nöqtəyə çatdıqda geri dönər və hər iki istiqamətdə hasar verər. Hər istiqamətdə tək hədəfə bir dəfə hasar verə bilər. Silah havada olduğu müddətdə 20% daha az hasar alar. 2,40 saniyəlik hücum intervalı atış anından hesablanar; silah hələ qayıtmayıbsa, növbəti atış üçün onun qayıtmasını gözləyər.\"]",
    "derived": false
  },
  {
    "key": "phewphew",
    "name": "PhewPhew",
    "score": 75,
    "signature": "[\"phewphew\",\"PhewPhew\",\"Qalxana ekstra <b>+100%</b> Hasar bonusu verər\"]",
    "derived": false
  },
  {
    "key": "chrono-mage",
    "name": "Chrono Mage",
    "score": 125,
    "signature": "[\"chrono-mage\",\"Chrono Mage\",\"Chrono Mage zamanın axınını manipulyasiya edərək hər beçinci atışında bir dalğa yaradar. Bu dalğa dost kartlar üçün zamanı sürətləndirərək onlara 5 saniyəlik +25% sürət və hücum bonusu verər, rəqiblər üçün isə zamanı ağırlaşdıraraq onları 8 saniyəlik -25% yavaşladar.\"]",
    "derived": false
  },
  {
    "key": "aegis-guard",
    "name": "Aegis Guard",
    "score": 75,
    "signature": "[\"aegis-guard\",\"Aegis Guard\",\"Aegis Guard ön xətt qoruyucusu kimi yaxınlıqdakı dost kartların -15% daha az hasar almasını təmin edər. Bu taktiki mövqe komandanın döyüş meydanında itkisiz irəliləməsinə şərait yaradar.\"]",
    "derived": false
  },
  {
    "key": "ironjaw",
    "name": "Ironjaw",
    "score": 100,
    "signature": "[\"ironjaw\",\"Ironjaw\",\"Hər uğurlu vuruşda Can Çalma Şansı +0,5% artar. Əlavə bonus maksimum +25%-dir; başlanğıc 25% ilə ümumi şans 50%-ə çatar.\"]",
    "derived": false
  },
  {
    "key": "m-manager",
    "name": "M-Manager",
    "score": 100,
    "signature": "[\"m-manager\",\"M-Manager\",\"Həyatda qaldığı hər <b>9</b> saniyə üçün <b>+1</b> Mana verər\"]",
    "derived": false
  },
  {
    "key": "srail",
    "name": "Srail",
    "score": 100,
    "signature": "[\"srail\",\"Srail\",\"Qarşısındakı hər bir rəqib kart üçün +8% Kritik Şansı qazanar (Max:80%)\"]",
    "derived": false
  },
  {
    "key": "cryon",
    "name": "Cryon",
    "score": 150,
    "signature": "[\"cryon\",\"Cryon\",\"Canı 20%-in altına düşdükdə masqasını çıxarar və yaxınında olan bütün kartları 12 saniyəlik sərsəmlədər\"]",
    "derived": false
  },
  {
    "key": "cow",
    "name": "Cow",
    "score": 75,
    "signature": "[\"cow\",\"Cow\",\"Canı 50%-dən aşağı olan rəqib kartlara ekstra +100% hasar verər\"]",
    "derived": false
  },
  {
    "key": "trainer",
    "name": "Trainer",
    "score": 75,
    "signature": "[\"trainer\",\"Trainer\",\"Canı 30%-in altına düşdükdə ətrafındakı bütün rəqib kartları 3 karo geri itər\"]",
    "derived": false
  },
  {
    "key": "burglar",
    "name": "Burglar",
    "score": 75,
    "signature": "[\"burglar\",\"Burglar\",\"Rəqib kartın üstünə bir siçan atar. Bu siçan rəqib karta ekstra 2 hasar verər və onu 2 saniyəlik zəhərləyərək hər saniyə 6 hasar verər, 10% Şansla siçanın zəhər müddəti +150% artar\"]",
    "derived": false
  },
  {
    "key": "stormblade",
    "name": "Stormblade",
    "score": 125,
    "signature": "[\"stormblade\",\"Stormblade\",\"Əsas hədəfdən 3 karo məsafədə maksimum 3 əlavə rəqibə hasar sıçrayar. Sıçrayan hasar əsas hasarın 50%-idir; cəmi maksimum 4 rəqibə hasar verər.\"]",
    "derived": false
  },
  {
    "key": "stacy",
    "name": "Stacy",
    "score": 125,
    "signature": "[\"stacy\",\"Stacy\",\"Hər uğurlu vuruşu rəqibi yandırar və hər saniyə 8 olmaqla 4 dəfə yanma hasarı verər. Canı 10%-in altına düşdükdə menzili +10% artar.\"]",
    "derived": false
  },
  {
    "key": "death",
    "name": "Death",
    "score": 150,
    "signature": "[\"death\",\"Death\",\"Ölən hər dost və rəqib kart üçün +2 Hasar bonusu qazanar. Bonus maksimum +80 Hasara çatar; əsas 25 Hasar ilə birlikdə maksimum 105 Hasar verər.\"]",
    "derived": false
  },
  {
    "key": "sylviana",
    "name": "Sylviana",
    "score": 100,
    "signature": "[\"sylviana\",\"Sylviana\",\"Öləndə içindən *Butterflies* çıxar, *Uzaylı* tipli kartlardan -20% daha az hasar alar.\"]",
    "derived": false
  },
  {
    "key": "sylviana/forms/0",
    "name": "Butterflies",
    "score": 75,
    "signature": "[\"\",\"Butterflies\",\"Öləndə ətrafındakı 1,5 × 1,5 karo sahəsində olan dost kartların maksimum canını və cari canını +10 artırar. Məsələn, 100/100 canı olan dost kart 110/110 cana çatar.\"]",
    "derived": false
  },
  {
    "key": "malvaris",
    "name": "Malvaris",
    "score": 175,
    "signature": "[\"malvaris\",\"Malvaris\",\"Malvaris zərbə vurduğu hər bir rəqib kartı 2 saniyəlik xüsusi bir ruh damğası ilə işarələyər. Bu işarəni daşıyan rəqib kartlar hər hansı bir səbəbdən öldükdə, onların ruhları dərhal qaranlıq tərəfə keçərək bir \\\"Phantomis\\\"-ə çevrilər. O, döyüş meydanında fədakarlığı mükafatlandırır; ölən hər bir dost kart Malvaris-in qəzəbini alovlandıraraq onun kritik şans göstəricisini +0,5% artırar. Əlavə kritik şans bonusu maksimum +75%-ə çatar; əsas 5% kritik şansı ilə birlikdə yekun kritik şansı 80% olar.\"]",
    "derived": false
  },
  {
    "key": "malvaris/forms/0",
    "name": "Phantomis",
    "score": 100,
    "signature": "[\"\",\"Phantomis\",\"Eyni tərəfdəki hər bir əlavə Phantomis üçün bütün dost Phantomis-lər +10% Hasar və +5% Hücum Sürəti qazanar. Fərqli Malvaris-lərin yaratdığı Phantomis-lər də birlikdə sayılar. Bonuslar toplanar: 3 Phantomis olduqda hər biri +20% Hasar və +10% Hücum Sürəti qazanar.\"]",
    "derived": false
  },
  {
    "key": "etheris",
    "name": "Etheris",
    "score": 75,
    "signature": "[\"etheris\",\"Etheris\",\"İki Etheris bir-biri və yaxındakı bir dost kartla bağ qurar. Bağlanan kartların can və qalxan ehtiyatlarının 90%-i bir ortaq ehtiyatda birləşər. Birinə hasar dəydikdə hamısının ortaq canı və qalxanı azalar. Ortaq can sıfırlananda bağlı kartların hamısı ölər.\"]",
    "derived": false
  },
  {
    "key": "magma",
    "name": "Magma",
    "score": 100,
    "signature": "[\"magma\",\"Magma\",\"Hərəkət etdikcə arxasında 1,5 karo enində və 10 saniyə davam edən alov izi buraxar. Alov üzərindəki rəqib yer kartlarına hər saniyə 3 hasar verər. Uçan və süzülən kartlar bu yer effektindən təsirlənməz.\"]",
    "derived": false
  },
  {
    "key": "avalith",
    "name": "Avalith",
    "score": 150,
    "signature": "[\"avalith\",\"Avalith\",\"33% şansla gələn hasardan yayınar. Atışı hədəfə çatanda geri dönər və hər iki istiqamətdə hasar verər. Atış özünə qayıdana qədər yeni atış etməz; qayıtdıqdan sonra hücum intervalını gözləyər. Rəqib 1 karo və ya daha yaxında olduqda hücum intervalı 60% azalar. Bu azalma məsafəyə görə xətti şəkildə dəyişərək 3,75 karoda 0%-ə enər.\"]",
    "derived": false
  },
  {
    "key": "far",
    "name": "Far",
    "score": 125,
    "signature": "[\"far\",\"Far\",\"Hər uğurlu vuruşunda 8% şansla rəqib kartı 10 saniyəlik başqa ölçüyə göndərər. Kart həmin müddətdə döyüş meydanından yox olar. Müddət bitdikdə istənilən kolidorda başqa boş mövqeyə qayıdar və maksimum canının 12%-i qədər hasar alar.\"]",
    "derived": false
  },
  {
    "key": "demotron",
    "name": "Demotron",
    "score": 75,
    "signature": "[\"demotron\",\"Demotron\",\"Demotron hər 10 saniyədə bir həmin anda çatışmayan canının 10%-ni bərpa edər. Məsələn, 100 can çatışmırsa 10 can, daha sonra 90 can çatışmırsa 9 can yeniləyər.\"]",
    "derived": false
  },
  {
    "key": "format",
    "name": "Format",
    "score": 175,
    "signature": "[\"format\",\"Format\",\"15 karo qabaqdakı ən güclü görünən rəqib karta 3 saniyə ərzində dönüşər. Hədəf saytdakı 1000 ballıq güc göstəricisinə görə seçilər. Dönüşənə qədər hasar verməz; dönüşəndə hədəfin statlarını və döyüş formasını alar, canı və qalxanı tam dolar. Həmin rəqibi özü öldürərsə kopyalanmış statları yenilənər və +100% güclənər.\"]",
    "derived": false
  },
  {
    "key": "pyhsic",
    "name": "Pyhsic",
    "score": 175,
    "signature": "[\"pyhsic\",\"Pyhsic\",\"Hər 22 saniyədə qarşısındakı 7,5 karo məsafədə görünən rəqib karta 50 hasar verər. Onu 20 + (rəqibin maksimum canının 10%-i) faiz şansla məhv edər; maksimum şans 100%-dir. Məsələn, maksimum can 200 olduqda şans 40%, 800 və daha çox olduqda 100% olar.\"]",
    "derived": false
  },
  {
    "key": "naar",
    "name": "Naar",
    "score": 150,
    "signature": "[\"naar\",\"Naar\",\"Canı 40%-dən aşağı düşəndə 10 saniyə ərzində 20 nar atar; hər nar 1,25 × 1,25 karo sahəsində 4 hasar verər. Bu ulti nəticəsində məhv olan rəqib kartlar partlayaraq 2,5 × 2,5 karo sahəsindəki digər rəqib kartlara 40 hasar verər və zəncirvari partlayış yarada bilər. Canı 40%-ə və ya yuxarıya qalxıb yenidən aşağı düşəndə ulti təkrar aktivləşər; bir Naar maksimum 3 dəfə ulti aktivləşdirə bilər.\"]",
    "derived": false
  },
  {
    "key": "lyra",
    "name": "Lyra",
    "score": 100,
    "signature": "[\"lyra\",\"Lyra\",\"Hazırda itirdiyi canın hər 10%-i üçün +8% Hasar və Hücum Sürəti bonusu qazanar (maksimum +40%). Hücum dövrü: ilk iki hücumun hərəsində bir dəfə 5 hasar, üçüncü hücumda isə ardıcıl 3 dəfə 5 hasar verər. Hücumlar arasındakı əsas interval 0,20 saniyə, hücumun sonundakı gecikmə 0,90 saniyədir.\"]",
    "derived": false
  },
  {
    "key": "aeralis",
    "name": "Aeralis",
    "score": 75,
    "signature": "[\"aeralis\",\"Aeralis\",\"Aeralis etdiyi hər bir uzaq məsafəli atışla hədəf aldığı rəqibləri 0,1 karo geri itələyər. O, yüksək konsentrasiya sayəsində 12% şansla bu effekti gücləndirərək rəqibi normal məsafədən 4 dəfə daha çox, yəni birbaşa 0,4 karo geri fırladar. Bu mexanika yaxın məsafəli döyüşçüləri uzaqda saxlamaq üçün əvəzsizdir.\"]",
    "derived": false
  },
  {
    "key": "dark-necromancer",
    "name": "Dark Necromancer",
    "score": 175,
    "signature": "[\"dark-necromancer\",\"Dark Necromancer\",\"Dark Necromancer-in etdiyi uzaq məsafəli atışlar qaranlıq enerji daşıyır və hədəf aldığı rəqib kartları 17% şansla 10 saniyəlik susturar. Ölülər dünyası ilə birbaşa əlaqəsi olan bu sehrbaz, döyüş meydanında tək qalmır. O, hər 14 saniyədə bir kölgələrdən yeni bir döyüşçü vahid yaradar. Çağırılan kartların şans göstəriciləri aşağıdakı kimidir:Bladeknight: 40%,Stormbow: 35%,Ironhide: 25%\"]",
    "derived": false
  },
  {
    "key": "dark-necromancer/forms/0",
    "name": "Bladeknight",
    "score": 75,
    "signature": "[\"\",\"Bladeknight\",\"Bu qaranlıq cəngavərin qılıncı mistik bir enerji ilə yüklənib. Onun etdiyi bütün zərbələr rəqib kartların aktiv qalxanlarını tamamilə görməzdən gələrək birbaşa onların canına hasar vurar. Qalxan arxasında gizlənən tankları sıradan çıxarmaq üçün idealdır.\"]",
    "derived": false
  },
  {
    "key": "dark-necromancer/forms/1",
    "name": "Stormbow",
    "score": 50,
    "signature": "[\"\",\"Stormbow\",\"Kölgə oxçusu hər atışında rəqib xətlərini atəşə tutmağa çalışır. O, 35% şansla hədəfə doğru alovlu ox ataraq düşmən kartı yandırar və zamanla ona əlavə 2x4 hasar verər.\"]",
    "derived": false
  },
  {
    "key": "dark-necromancer/forms/2",
    "name": "Ironhide",
    "score": 75,
    "signature": "[\"\",\"Ironhide\",\"Qrupun ən ağır və dözümlü qoruyucusu olan Ironhide, bədənini bürüyən qaranlıq zireh sayəsində rəqibdən gələn hər 4-cü hasarı tamamilə görməzdən gələr. Ön xətdə vaxt qazanmaq və hücumları sormaq üçün mükəmməl bir sipərdir.\"]",
    "derived": false
  },
  {
    "key": "shine",
    "name": "Shine",
    "score": 100,
    "signature": "[\"shine\",\"Shine\",\"Hər 5 saniyədə özünün və yaxın dost kartların əsas maksimum canını +4% artırar (maksimum bonus: +20%). Qazanılan can bonusu cari cana da əlavə olunar.\"]",
    "derived": false
  },
  {
    "key": "bloodraider",
    "name": "Bloodraider",
    "score": 125,
    "signature": "[\"bloodraider\",\"Bloodraider\",\"Hər uğurlu vuruşda maksimum canının 4%-ni itirər. Hasarı hər dəfə yuvarlaqlaşdırılmamış əvvəlki hasarına görə +10% artar; vuruş hasarı ən yaxın tam ədədə yuvarlaqlaşdırılar.\"]",
    "derived": false
  },
  {
    "key": "fallen-angel",
    "name": "Fallen Angel",
    "score": 100,
    "signature": "[\"fallen-angel\",\"Fallen Angel\",\"Fallen Angel önündəki 7,5 karo məsafədə görünən və hazırkı canı ən yüksək olan rəqib yer kartını əsas hədəf seçər. Seçilmiş hədəfə hər uğurlu vuruşu +1% hücum sürəti qazandırar (maksimum +80%). Hədəf dəyişəndə və ya məhv olanda sürət yığımı sıfırlanar.\"]",
    "derived": false
  },
  {
    "key": "worms",
    "name": "Worms",
    "score": 75,
    "signature": "[\"worms\",\"Worms\",\"Worms döyüş meydanında hərəkət edərkən yerin altında gizlənir. İlk vuruşunu etmək üçün qəfildən yerin altından çıxar və bu gözlənilməz hücum hədəf aldığı rəqib kartları 0,8 saniyəlik sarsıdar. Düşmən müdafiəsini iflic etmək üçün mükəmməl bir başlanğıc kartıdır.\"]",
    "derived": false
  },
  {
    "key": "unara",
    "name": "Unara",
    "score": 125,
    "signature": "[\"unara\",\"Unara\",\"Hər uğurlu vuruşunda 9 yük qazanar. 100 yük xərclədikdə yaxın rəqib kartları 2 karo geri itələyər və onlara növbə ilə 30 sehrli orb atar. Hər orb 2 hasar verər və orblar arasında 0,1 saniyə fasilə olar. Orblar yeni yük qazandırmaz.\"]",
    "derived": false
  },
  {
    "key": "ali",
    "name": "Ali",
    "score": 150,
    "signature": "[\"ali\",\"Ali\",\"Yaxında dost kart varsa hər bir kart üçün hər saniyə 4 yük qazanar. 100 yük olduqda özü və ətrafındakı dost kartlar 3 saniyəlik toxunulmaz olar\"]",
    "derived": false
  },
  {
    "key": "clara",
    "name": "Clara",
    "score": 100,
    "signature": "[\"clara\",\"Clara\",\"Yaxındakı hər bir görünən rəqib kart üçün hər saniyə 20 yük qazanar. 100 yük xərclədikdə yaxın rəqiblərə 7 saniyəlik Taunt tətbiq edər: rəqiblər hücumlarını yalnız Clara-ya yönəldərlər. Clara həmin 7 saniyə boyunca hər 0,25 saniyədə özünün 3 canını bərpa edər.\"]",
    "derived": false
  },
  {
    "key": "artist",
    "name": "Artist",
    "score": 175,
    "signature": "[\"artist\",\"Artist\",\"Rəqib kartlara mürəkkəb atar və bu mürəkkəblər rəqib kartın üstündə qalar. Hər bir mürəkkəb rəqib kartı 3% yavaşladar, 21 mürəkkəb bulaşdırdıqdan sonra rəqib kartı lənətləyər. Lənət bütün mənbələrdən alınan hasarı 25% artırar. Lənətlənən kart öldükdə 2×2 karo sahədəki bütün rəqib kartlara 4 mürəkkəb bulaşdırar. Lənətlənən hər bir kart başına Artist 10 yük qazanar. Artist öldükdə Quzğun sürüsünə dönüşər. Quzğunların canı yoxdur, uçar və hədəfə alına bilməzlər; 4 karo görüş verər və ən azı 7 saniyə qalarlar. Hər 20 yük Quzğun sürüsünün müddətini +1 saniyə, sayını isə +2 artırar. Yük maksimum 100-dür və zamanla silinməz.\"]",
    "derived": false
  },
  {
    "key": "artist/forms/0",
    "name": "Flock of Ravens",
    "score": 0,
    "signature": "[\"\",\"Flock of Ravens\",\"-\"]",
    "derived": false
  },
  {
    "key": "captain-vane",
    "name": "Captain Vane",
    "score": 75,
    "signature": "[\"captain-vane\",\"Captain Vane\",\"Uzaqdakı 3 rəqib kartın yerini göstərər. Bu kartlara ekstra +19% Hasar verər\"]",
    "derived": false
  },
  {
    "key": "spiritcaller",
    "name": "Spiritcaller",
    "score": 175,
    "signature": "[\"spiritcaller\",\"Spiritcaller\",\"Taxtaya qoyulduqdan 3 saniyə sonra bir totem yerləşdirər öldükdə bu totemdə yenidən doğular. Hər 15 saniyədə bir totem yerə buraxar, bu totem 3x3 ərazidə dost kartlara +10% Hasar azaltma qazandırar.\"]",
    "derived": false
  },
  {
    "key": "bolt",
    "name": "Bolt",
    "score": 125,
    "signature": "[\"bolt\",\"Bolt\",\"Bolt Voltdan daha kiçik olduğu üçün ilk rəqib karta tez çatar onun üstünə hoppanar və ekstra +200% hasar verər. Ardınca onu Volt gələnə qədər kökləyər. Bu müddətdə rəqibin üstündə qalar və +20% hasar azaltma qazanar.\"]",
    "derived": false
  },
  {
    "key": "bolt/forms/0",
    "name": "Volt",
    "score": 100,
    "signature": "[\"volt\",\"Volt\",\"Volt Boltdan daha böyükdür. Boltun olduğu rəqibin üstünə gələrək ona hoppanar və ekstra +200% hasar verər. Bu müddətdə rəqib kart 5 karo geri gedər və bolt rəqib üstündən düşər\"]",
    "derived": false
  },
  {
    "key": "radglic",
    "name": "Radglic",
    "score": 150,
    "signature": "[\"radglic\",\"Radglic\",\"Rəqib karta onun maksimum canının 20%-i qədər hasar verdikdə onu 12 saniyəlik bədbəxtlik effektinə salar (75%)\"]",
    "derived": false
  },
  {
    "key": "nancy",
    "name": "Nancy",
    "score": 100,
    "signature": "[\"nancy\",\"Nancy\",\"5 saniyə hasar verməzsə hızı +25% artar. Bu müddətdə ilk rəqib karta doğru gedər və onu 2 karo geri itər və 3 saniyəlik sərsəmlədər.\"]",
    "derived": false
  },
  {
    "key": "veronica",
    "name": "Veronica",
    "score": 125,
    "signature": "[\"veronica\",\"Veronica\",\"Ətrafındakı dost katlara 10+(kartın maksimum canının 10%-i) yenilənə bilən qalxan verər. Qalxan qırıldıqdan 12 saniyə sonra yenilənər.\"]",
    "derived": false
  },
  {
    "key": "plauge",
    "name": "Plauge",
    "score": 150,
    "signature": "[\"plauge\",\"Plauge\",\"Atışları rəqib kartlara 3,2 saniyəlik acizlik effekti verər. Hər 3-cü qoyuluşda rəqib kartlara 3,2 saniyəlik mütləq acizlik effekti verər.\"]",
    "derived": false
  },
  {
    "key": "witch",
    "name": "Witch",
    "score": 125,
    "signature": "[\"witch\",\"Witch\",\"Canı 15%-in altına düşdükdə 4 dəfə rəqib kartın içindən keçər və hər bir vuruş 12 hasar verər. Bu müddətdə ölümsüz olar.\"]",
    "derived": false
  },
  {
    "key": "bro",
    "name": "Bro",
    "score": 100,
    "signature": "[\"bro\",\"Bro\",\"Hər zaman hasar verər. Menzilindəki hər rəqib kart üçün ekstra +50% Hasar bonusu qazanar (Max:250%)\"]",
    "derived": false
  },
  {
    "key": "tooni",
    "name": "Tooni",
    "score": 125,
    "signature": "[\"tooni\",\"Tooni\",\"Hər saniyə +2 menzildəki hər rəqib kart üçün isə ekstra +3 yük qazanar. 100 yükdə menzilindəki bütün rəqib kartlara 34 hasar verər və sürətlərini 3 saniyəlik -33% azaldar.\"]",
    "derived": false
  },
  {
    "key": "spinata",
    "name": "Spinata",
    "score": 100,
    "signature": "[\"spinata\",\"Spinata\",\"Canı 75%-dən aşağı düşdükdə üstünlük effekti qazanar. Hər vuruşda can çalma şansı +1% artar (Max: 15%)\"]",
    "derived": false
  },
  {
    "key": "erica",
    "name": "Erica",
    "score": 150,
    "signature": "[\"erica\",\"Erica\",\"Saqqızlar hər rəqib karta dəydikdə rəqib hər saqqız üçün 10 yük qazanar. 100 yükdə rəqib kart 8 saniyəlik həbs olunar.\"]",
    "derived": false
  }
].map(entry=>Object.freeze(entry)));
})(globalThis);
