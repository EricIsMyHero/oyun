/* Arena metadata uses the same keys, labels, icons and caps as the Codex modal.
   JSON remains the source of character stats; no Codex combat scripts are run. */
const SURVIVAL_STAT_RULES = {
  health: { step: 25, initial: 100, info: 'Maksimum can.' },
  shield: { step: 25, initial: 0, info: 'Hasar əvvəl qalxana dəyir, artıq hissə cana keçir.' },
  damage: { step: 3, initial: 10, info: 'Başlanğıc silahın baza hasarı; digər silahlar da buna uyğun güclənir.' },
  attackSpeed: { step: 10, initial: 1.25, unit: 's', info: 'Hücum intervalı: az olması yaxşıdır. Sürət bonusu maksimum +90%.' },
  delay: { step: 20, initial: 0, unit: 'ms', lower: true, min: 0, info: 'Zərbədən əvvəl hazırlıq vaxtı. Az olması yaxşıdır.' },
  sps: { derived: true, initial: 0, info: 'Son 1 saniyədə real vurulan hasar. Ümumi DPS büdcəsi maksimum 500.' },
  mana: { step: 2, initial: 6, info: 'Mana tutumu. Mana dalğası 3 mana xərcləyir; hər saniyə 0,5 mana bərpa olunur.' },
  number: { step: 1, initial: 1, info: 'Tüfəng dəstəsinə əlavə güllə, əsaya əlavə mərmi verir. Orbit və şimşək sayını artırır; sahəvi yaxın silahlara əlavə Count başına +8% hasar verir.' },
  range: { step: 400, initial: 2500, info: '10 mənzil vahidi = 1 arena pikseli. Bütün silahların mənzilini artırır.' },
  speed: { step: 150, initial: 1000, info: '5 sürət vahidi = 1 piksel/saniyə.' },
  criticalChance: { step: 5, initial: 5, info: 'Kritik vuruş ehtimalı.' },
  criticDamage: { step: 0.25, initial: 1.5, info: 'Kritik vuruşun hasar əmsalı.' },
  lifestealChance: { step: 10, initial: 0, info: 'Birbaşa vuruşdan can oğurlama ehtimalı.' },
  lifesteal: { step: 5, initial: 25, info: 'Real vurulan hasarın bu faizi qədər sağal.' },
  dodge: { step: 5, initial: 0, info: 'Təmas zərbəsindən tam yayınma ehtimalı.' },
  vision: { step: 500, initial: 8000, info: '10 görüş vahidi = 1 piksel. Avtomatik hədəf tapmanın uzaqlıq limiti.' },
  healBonus: { step: 10, initial: 0, info: 'Bütün sağalma mənbələrini gücləndirir.' },
  healrecovery: { step: 0.5, initial: 0, info: 'Hər saniyə can bərpası.' },
  shieldrecovery: { step: 0.5, initial: 0, info: 'Son zərbədən 3 saniyə sonra hər saniyə qalxan bərpası.' },
  criticdamageminimiser: { step: 10, initial: 0, info: 'Rəqibin kritik zərbəsinin əlavə hasarını azaldır.' },
  damageminimiser: { step: 5, initial: 0, info: 'Alınan bütün təmas hasarını azaldır.' },
  flexibility: { step: 10, initial: 0, info: 'Rəqibin verdiyi yavaşlatmanın müddətini azaldır.' },
  shieldtakendamage: { step: 5, initial: 70, lower: true, min: 10, info: 'Qalxana ötürülən hasar faizi. Az olması yaxşıdır; minimum 10%.' },
  life: { step: 5, initial: 5, info: 'Mana dalğasının +25% hasar gücləndirməsinin müddəti; xarakterin ömrü deyil.' },
};
const SURVIVAL_STAT_GROUPS = [
  { name: 'Əsas statlar', defs: STAT_DEFS },
  { name: 'Əlavə statlar', defs: ADD_STAT_DEFS },
  { name: 'Bonus statlar', defs: EXTRA_STAT_DEFS },
];
const SURVIVAL_STAT_DEFS = Object.fromEntries(SURVIVAL_STAT_GROUPS.flatMap(group => group.defs.map(def =>
  [def.key, { ...SURVIVAL_STAT_RULES[def.key], name: def.label, icon: def.icon, cap: def.max, color: def.color,
    unit: def.suffix || SURVIVAL_STAT_RULES[def.key].unit || '' }])));
const SURVIVAL_WEAPONS = {
  rifle: { name: 'Soldier tüfəngi', icon: '🔫', color: '#a5b4fc', kind: 'burst', damage: 5, interval: 2000, range: 480 },
  hammer: { name: 'Ağır çəkic', icon: '🔨', color: '#fbbf24', kind: 'slam', damage: 90, interval: 3000, range: 120, size: 40 },
  bow: { name: 'Yay və ox', icon: '🏹', color: '#86efac', kind: 'arrow', damage: 8, interval: 800, range: 600 },
  lightAxe: { name: 'Yüngül balta', icon: '🪓', color: '#fda4af', kind: 'single-strike', damage: 6, interval: 750, range: 130 },
  sword: { name: 'Qılınc', icon: '⚔', color: '#fcd34d', kind: 'sweep', damage: 12, interval: 1250, range: 150, arc: 135 },
  dualSwords: { name: 'İkili qılınc', icon: '🗡', color: '#93c5fd', kind: 'twin-sweep', damage: 6, interval: 500, recovery: 750, range: 135, arc: 90 },
  scythe: { name: 'Oraq', icon: '☽', color: '#e9d5ff', kind: 'sweep', damage: 28, interval: 2000, range: 160, arc: 360 },
  spear: { name: 'Mızraq', icon: '🔱', color: '#6ee7b7', kind: 'thrust', damage: 20, interval: 1750, range: 240, width: 24 },
  axe: { name: 'Henry baltası', icon: '🪓', color: '#fda4af', kind: 'strike', damage: 10, interval: 1250, range: 150 },
  wand: { name: 'Mana əsası', icon: '✦', color: '#c4b5fd', kind: 'bolt', damage: 9, interval: 1400, range: 520 },
  orbit: { name: 'Dumpsy orbitləri', icon: '◈', color: '#fcd34d', kind: 'orbit', damage: 6, interval: 450, range: 82 },
  nova: { name: 'Alov halqası', icon: '🔥', color: '#fb923c', kind: 'nova', damage: 10, interval: 2600, range: 120 },
  lightning: { name: 'Zəncir şimşək', icon: 'ϟ', color: '#67e8f9', kind: 'chain', damage: 8, interval: 2200, range: 350 },
};
const SURVIVAL_PASSIVES = {
  venomora: { name: 'Venomora', icon: '❄', color: '#67e8f9', desc: l => `Vuruşlar rəqibi 2 saniyə ${25 + (l - 1) * 5}% yavaşladır.` },
  toxic: { name: 'Toxic', icon: '☠', color: '#a3e635', desc: l => `Vuruşlar 3 saniyə ərzində hər saniyə ${2 * l} zəhər hasarı verir. Müddət yenilənir, üst-üstə yığılmır.` },
  magmara: { name: 'Magmara', icon: '♨', color: '#fb923c', desc: l => `Vuruşlar 2 saniyə ərzində hər saniyə ${3 * l} yanma hasarı verir. Müddət yenilənir, üst-üstə yığılmır.` },
  aeralis: { name: 'Aeralis', icon: '≋', color: '#c4b5fd', desc: l => `Vuruşlar rəqibi ${12 + (l - 1) * 5} piksel geri itələyir.` },
  clara: { name: 'Clara', icon: '✚', color: '#6ee7b7', desc: l => `Hər öldürmə ${l} can bərpa edir.` },
  venomspikes: { name: 'Venomspikes', icon: '✹', color: '#f0abfc', desc: l => `Eyni rəqibə hər 5-ci vuruş maksimum canının ${8 + (l - 1) * 3}%-i qədər əlavə hasar verir.` },
  frostshot: { name: 'Frostshot', icon: '❅', color: '#bae6fd', desc: l => `Vuruşlar ${10 + l * 5}% şansla rəqibi 0,5 saniyə dondurur.` },
  stormblade: { name: 'Stormblade', icon: 'ϟ', color: '#93c5fd', desc: l => `Birbaşa vuruş hasarının ${15 + l * 5}%-i ${70 + l * 10} piksel yaxınlıqdakı rəqiblərə sıçrayır.` },
  collector: { name: 'Collector', icon: '💧', color: '#7dd3fc', desc: l => `Hər öldürmə ${(l * 0.3).toFixed(1)} mana bərpa edir.` },
  blesser: { name: 'Blesser', icon: '⬡', color: '#60a5fa', grant: { shield: 20 }, desc: l => `Hər passiv səviyyəsi +20 maksimum qalxan verir. Hər öldürmə ${l * 2} qalxan bərpa edir.` },
  azrith: { name: 'Azrith', icon: '⚑', color: '#fbbf24', desc: l => `Qalxanın olduğu müddətdə +${l * 10}% hasar.` },
  'neon-droid': { name: 'Neon Droid', icon: '⚡', color: '#2dd4bf', desc: l => `Vuruşlar 3 saniyəlik +${l * 10}% hücum sürəti verir. Ümumi bonus +90%-i keçmir.` },
  skyhunter: { name: 'Skyhunter', icon: '🏹', color: '#a5b4fc', desc: l => `Uzaqdakı rəqiblərə məsafəyə görə +${l * 8}%-ə qədər hasar.` },
  demotron: { name: 'Demotron', icon: '⚙', color: '#86efac', desc: l => `Hər 10 saniyədə itirilmiş canın ${5 + l * 3}%-ni bərpa edir.` },
  untouch: { name: 'Untouch', icon: '◌', color: '#e9d5ff', desc: l => `Can 25%-dən aşağı düşəndə 2 saniyə toxunulmazlıq. Təkrar: ${22 - l * 2} saniyə.` },
  artist: { name: 'Artist', icon: '✒', color: '#c084fc', desc: l => `Hər 4-cü vuruş rəqibi 3 saniyə damğalayır: +${l * 10}% hasar alır.` },
  lyra: { name: 'Lyra', icon: '☄', color: '#fb7185', desc: l => `Can azaldıqca +${l * 6}%-ə qədər hasar və +${l * 5}%-ə qədər hücum sürəti.` },
  ali: { name: 'Ali', icon: '✧', color: '#fde68a', desc: l => `Hər 15 saniyədə ${(1 + l * 0.2).toFixed(1)} saniyəlik toxunulmazlıq.` },
  snaykies: { name: 'Snaykies', icon: '🐍', color: '#bef264', desc: l => `Birbaşa hasarın ${l * 20}%-i rəqibin qalxanından keçir.` },
  reacher: { name: 'Reacher', icon: '🔰', color: '#facc15', desc: l => `+${l * 3}% hasar azaltma. Ümumi azaltma 90%-i keçmir.` },
};
const SURVIVAL_RARITIES = ['mundane','familiar','arcane','relic','ascendant','apex','emergent','ethereal'];
const SURVIVAL_RARITY_COLORS = ['#94a3b8','#4ade80','#60a5fa','#c084fc','#fbbf24','#fb7185','#2dd4bf','#f0abfc'];
function survivalNumber(raw, fallback = 0) {
  const n = parseFloat(String(raw ?? '').split('/')[0].replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}
function survivalClampStat(id, value) {
  return Math.max(id === 'health' ? 1 : 0, Math.min(SURVIVAL_STAT_DEFS[id].cap, value));
}
// Explicit equipment takes precedence over the general range-based archetype.
const SURVIVAL_MELEE_RANGE = 1500;
const SURVIVAL_STARTING_WEAPONS = {
  lord: 'hammer', trac: 'hammer', earthshakers: 'hammer', warborn: 'hammer',
  hunter: 'bow', js: 'bow', skyhunter: 'bow', 'fire-archer': 'bow', nyra: 'bow',
  'hell-boy': 'lightAxe', collector: 'lightAxe',
  king: 'sword', mimic: 'sword', blesser: 'sword', 'xii-josh': 'sword',
  'bio-mech': 'sword', stormblade: 'sword', azrith: 'sword', 'fallen-angel': 'sword', ali: 'sword', slasherx: 'sword',
  nightprowler: 'dualSwords', malvaris: 'dualSwords',
  hailey: 'scythe', 'shadow-reaper': 'scythe', bloodraider: 'scythe',
  wong: 'spear', 'void-striker': 'spear', tribe: 'spear', lumina: 'spear',
};
function survivalChooseStartingWeapon(card, stats, role) {
  if (SURVIVAL_STARTING_WEAPONS[card.id]) return SURVIVAL_STARTING_WEAPONS[card.id];
  if (stats.range <= SURVIVAL_MELEE_RANGE) return card.id === 'dumpsy' ? 'orbit' : 'axe';
  return /mage|support/.test(role) ? 'wand' : 'rifle';
}
function survivalCardConfig(card) {
  const form = card.type1 || (card.turns && Object.values(card.turns)[0]) || card;
  const source = { ...form.stats, ...card.stats };
  const extra = { ...form.additionalStats, ...card.additionalStats };
  const stats = Object.fromEntries(Object.entries(SURVIVAL_STAT_DEFS).map(([id, def]) =>
    [id, survivalClampStat(id, survivalNumber(source[id] ?? extra[id], def.initial))]));
  const rawDamage = String(source.damage || '10').split('/')[0].split('x');
  stats.damage = Math.max(1, survivalClampStat('damage', survivalNumber(rawDamage.at(-1), 10)));
  stats.number = Math.max(1, Math.min(15, stats.number * (rawDamage.length > 1 ? survivalNumber(rawDamage[0], 1) : 1)));
  // Burst card intervals include the gap between volleys. Delay is represented
  // separately as a bounded arena wind-up in milliseconds.
  stats.attackSpeed = Math.max(0.2, Math.min(5, stats.attackSpeed + (rawDamage.length > 1 ? survivalNumber(source.delay) : 0)));
  stats.delay = Math.min(200, survivalNumber(source.delay) * 1000);
  stats.range = Math.max(500, stats.range);
  stats.speed = Math.max(500, stats.speed);
  stats.vision = Math.max(1000, stats.vision);
  stats.mana = Math.max(3, stats.mana);
  stats.criticDamage = Math.max(1, stats.criticDamage);
  stats.life = Math.max(5, stats.life);
  stats.sps = 0; // measured damage, never trusted from a theoretical Codex value
  const role = String(card.class || form.class || '').toLowerCase();
  const weapon = survivalChooseStartingWeapon(card, stats, role);
  const equipment = SURVIVAL_WEAPONS[weapon];
  if (SURVIVAL_STARTING_WEAPONS[card.id]) {
    // The user's arena loadouts replace these offensive Codex values only.
    stats.damage = equipment.damage;
    stats.attackSpeed = equipment.interval / 1000;
    stats.delay = 0; // twin-sword recovery is separate from stat wind-up
    stats.number = equipment.kind === 'twin-sweep' ? 2 : 1;
    stats.range = equipment.range * 10;
  } else if (weapon === 'rifle') {
    stats.number = 3; // one projectile per shot, three shots per base volley
  }
  const rarity = String(card.rarity || 'mundane').toLowerCase();
  const color = SURVIVAL_RARITY_COLORS[SURVIVAL_RARITIES.indexOf(rarity)] || '#a5b4fc';
  const innate = SURVIVAL_PASSIVES[card.id] ? card.id : null;
  return { id: card.id, name: card.name, cardName: card.name, cardGroup: card.group || form.group,
    rarity, role: card.class || form.class || 'Specialist', stats, weapon, innate,
    maxHealth: stats.health, speed: stats.speed / 5, radius: 18,
    emoji: SURVIVAL_WEAPONS[weapon].icon, color, glow: color + '66',
    desc: `${SURVIVAL_WEAPONS[weapon].name} · ${innate ? SURVIVAL_PASSIVES[innate].name + ' passivi' : 'Sərbəst passiv quruluşu'}` };
}
// Available even if a rarity request fails; successful requests replace these
// with the repository data. Form cards use their first form, not invented stats.
const SURVIVAL_CHARACTERS = Object.fromEntries([
  { id:'soldier', name:'Soldier', group:'mission-1', rarity:'Mundane', class:'Marksman', stats:{health:140,shield:120,damage:5,attackSpeed:2,mana:9}, additionalStats:{range:4000,speed:1050} },
  { id:'henry', name:'Henry', group:'twisted-farm', rarity:'Mundane', class:'Fighter', stats:{health:440,damage:45,attackSpeed:0.9,mana:9}, additionalStats:{range:1200,speed:800} },
].map(card => [card.id, survivalCardConfig(card)]));
