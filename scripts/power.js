import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rarityDir = path.join(__dirname, "..", "rarity");
const outputDir = path.join(__dirname, "..", "output");

// ─── Helper parsers ──────────────────────────────────────────────
function toNum(v) {
  if (!v || v === "-") return 0;
  const s = String(v)
    .split("/")[0]
    .replace(",", ".")
    .replace(/[s%x]/gi, "")
    .trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseSec(v) {
  // "0.10s", "1,60s", "0,80" → float seconds. "-" → 0
  if (!v || v === "-") return 0;
  const s = String(v).split("/")[0].replace(",", ".").replace("s", "").trim();
  const n = parseFloat(s);
  return isNaN(n) || n < 0 ? 0 : n;
}

// Returns { count, perHit } — e.g. "10x7" → {count:10, perHit:7}, "32" → {count:1, perHit:32}
function parseDamage(v) {
  if (!v || v === "-") return { count: 1, perHit: 0 };
  const first = String(v).split("/")[0].trim();
  if (first.includes("x")) {
    const [a, b] = first.split("x");
    return { count: parseFloat(a) || 1, perHit: parseFloat(b) || 0 };
  }
  const n = parseFloat(first.replace(",", "."));
  return { count: 1, perHit: isNaN(n) ? 0 : n };
}

// Real DPS:
//   total_dmg        = count × perHit
//   attack_duration  = count × attackSpeed   (güllələr arası vaxt × güllə sayı)
//   full_cycle       = attack_duration + delay
//   DPS              = total_dmg / full_cycle
function calcDPS(stats) {
  const { count, perHit } = parseDamage(stats.damage);
  const aspd  = parseSec(stats.attackSpeed);   // saniyə / güllə
  const delay = parseSec(stats.delay);          // hücumlar arası gözləmə

  const totalDmg       = count * perHit;
  const attackDuration = count * aspd;
  const fullCycle      = attackDuration + delay;

  return fullCycle > 0 ? totalDmg / fullCycle : totalDmg;
}

// ─── Effect / Mechanic bonus ──────────────────────────────────────
// JSON-da "effects" array və ya "mechanic"+"mechanicStats" varsa hesablanır.
// Heç biri yoxdursa 0 qaytarır — mövcud kartlara heç bir təsiri yoxdur.
function calcEffectBonus(card) {
  let bonus = 0;

  // ── effects array ─────────────────────────────────────────────
  // Nümunə: [{ "type": "burn", "damagePerSecond": 15, "duration": 3 }, ...]
  if (Array.isArray(card.effects)) {
    for (const eff of card.effects) {
      const dur = toNum(eff.duration);
      switch (eff.type) {
        case "burn":
        case "poison":
          bonus += toNum(eff.damagePerSecond) * dur * 1.2;
          break;
        case "slow":
          bonus += toNum(eff.percentage) * dur * 1.5;
          break;
        case "silence":
          bonus += toNum(eff.percentage) * dur * 3.0;
          break;
        case "blind":
          bonus += toNum(eff.percentage) * dur * 1.7;
          break;
        case "curse":
          bonus += toNum(eff.percentage) * dur * 2.0;
          break;
        case "stun":
          bonus += toNum(eff.percentage) * dur * 2.5;
          break;
        case "heal":
          bonus += toNum(eff.amount) * 0.5;
          break;
        case "stat-reduction":
          bonus += toNum(eff.amount) * 0.6;
          break;
        case "shield-grant":
          bonus += toNum(eff.amount) * 0.4;
          break;
      }
    }
  }

  // ── mechanic (xüsusi mexanika tipləri) ───────────────────────
  // Nümunə: "mechanic": "mind-control", "mechanicStats": { "controlDuration": 14 }
  const mech  = card.mechanic || "";
  const mstat = card.mechanicStats || {};

  switch (mech) {
    case "mind-control": {
      // Whisper tipi: rəqibi tam idarə etmə
      const dur = toNum(mstat.controlDuration);
      bonus += 200 + dur * 35;
      break;
    }
    case "suicide":
    case "burst": {
      // Chicken tipi: ölümdə partlayış hasarı
      const minD = toNum(mstat.minBurstDamage);
      const maxD = toNum(mstat.maxBurstDamage) || minD;
      const effective = maxD > minD ? (minD + maxD) / 2 : minD;
      bonus += effective * 3.5;
      break;
    }
    case "summon": {
      // Kart çağıran mexanika (Dark Necromancer tipi)
      const interval = toNum(mstat.intervalSeconds) || 14;
      const count    = toNum(mstat.summonCount) || 1;
      bonus += (60 / interval) * count * 25;
      break;
    }
    case "transform": {
      // Format / Tphoenix tipi: başqa karta dönüşmə
      bonus += toNum(mstat.transformPower) || 80;
      break;
    }
    case "stealth": {
      // Görünməzlik mexanikası
      const dur = toNum(mstat.stealthDuration);
      bonus += dur * 20;
      break;
    }
    case "area-denial": {
      // Gloop tipi: sahə nəzarəti
      const dmg = toNum(mstat.burstDamage);
      const dur  = toNum(mstat.duration);
      bonus += dmg * 2 + dur * 10;
      break;
    }
  }

  return bonus;
}
function calcRawPower(card) {
  if (!card.stats || !card.additionalStats) return 0;

  const hp      = toNum(card.stats.health);
  const shield  = toNum(card.stats.shield);
  const count   = toNum(card.stats.number) || 1;

  const dps     = calcDPS(card.stats);

  const range   = toNum(card.additionalStats.range);
  const speed   = toNum(card.additionalStats.speed);
  const crit    = toNum(card.additionalStats.criticalChance);
  const critDmg = toNum(card.additionalStats.criticDamage) || 1.5;
  const dodge   = toNum(card.additionalStats.dodge);
  const ls      = toNum(card.additionalStats.lifesteal);
  const dmgMin  = toNum(card.additionalStats.damageminimiser);

  let base =
    (hp + shield) * 0.45 +
    dps * 7 +
    range / 120 +
    speed / 25 +
    dodge * 4 +
    ls * 2 +
    dmgMin * 5;

  // Crit multiplier
  base *= 1 + (crit / 100) * (critDmg - 1);

  // Multi-unit bonus (not full linear — diminishing returns)
  if (count > 1) base *= 1 + (count - 1) * 0.6;

  // Effects & mechanic bonus (0 əgər JSON-da yoxdursa)
  base += calcEffectBonus(card);

  return Math.round(base);
}

// ─── Process one card entry (handles dual / forms) ───────────────
function processCard(card, rarityLabel) {
  const result = {
    name:   card.name,
    rarity: rarityLabel || card.rarity || "Unknown",
    class:  card.class || "Unknown",
  };

  // Dual cards (isDual) — average type1 + type2
  if (card.isDual && card.type1 && card.type2) {
    const p1 = calcRawPower(card.type1);
    const p2 = calcRawPower(card.type2);
    result.rawPower = Math.round((p1 + p2) / 2);
    result.isDual   = true;
    result.forms    = [
      { name: card.type1.name + " (Mode 1)", rawPower: p1 },
      { name: card.type2.name + " (Mode 2)", rawPower: p2 },
    ];
    // Recurse into forms-inside-type
    ["type1", "type2"].forEach(t => {
      if (card[t].forms) {
        card[t].forms.forEach(f => {
          result.forms.push({ name: f.name + ` (${t})`, rawPower: calcRawPower(f) });
        });
      }
    });
    return result;
  }

  // Normal card
  result.rawPower = calcRawPower(card);
  const mana = toNum(card.stats?.mana);
  if (mana > 0) result.manaEfficiency = +(result.rawPower / mana).toFixed(2);

  // Sub-forms (e.g. Freak → Mini Freaks)
  if (card.forms && card.forms.length) {
    result.forms = card.forms.map(f => ({
      name:     f.name,
      rawPower: calcRawPower(f),
    }));
  }

  // Ascendant upgraded second form
  if (card.upgradedsecondForm) {
    result.upgradedForm = {
      name:     card.upgradedsecondForm.name,
      rawPower: calcRawPower(card.upgradedsecondForm),
    };
  }

  return result;
}

// ─── Collect all cards from all rarity files ─────────────────────
const rarityFiles = [
  "mundane", "familiar", "arcane", "relic", "apex", "ascendant", "ethereal",
];

const RARITY_ORDER = {
  mundane: 1, familiar: 2, arcane: 3, relic: 4, apex: 5, ascendant: 6, ethereal: 7,
};

let allCards = [];

for (const rarity of rarityFiles) {
  const filePath = path.join(rarityDir, `${rarity}.json`);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠ Fayl tapılmadı: ${rarity}.json`);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  for (const card of data) {
    allCards.push(processCard(card, rarity.charAt(0).toUpperCase() + rarity.slice(1)));
  }
}

// ─── Relative scaling: weakest = 100, strongest = 1000 ──────────
const powers = allCards.map(c => c.rawPower).filter(p => p > 0);
const minP   = Math.min(...powers);
const maxP   = Math.max(...powers);

function scale(raw) {
  if (maxP === minP) return 550; // edge case: all same
  return Math.round(100 + ((raw - minP) / (maxP - minP)) * 900);
}

for (const card of allCards) {
  card.powerScore = scale(card.rawPower);
  card.efficiency = +(card.powerScore / 10).toFixed(1); // out of 100

  // Scale sub-form powers too
  if (card.forms) {
    card.forms = card.forms.map(f => ({
      ...f,
      powerScore: scale(f.rawPower),
    }));
  }
  if (card.upgradedForm) {
    card.upgradedForm.powerScore = scale(card.upgradedForm.rawPower);
  }
}

// ─── Sort by powerScore desc ─────────────────────────────────────
allCards.sort((a, b) => b.powerScore - a.powerScore);

// ─── Add rank ───────────────────────────────────────────────────
allCards.forEach((c, i) => { c.rank = i + 1; });

// ─── Write output ───────────────────────────────────────────────
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, "cards-with-power.json"),
  JSON.stringify(allCards, null, 2),
  "utf8"
);

// ─── Print summary table ─────────────────────────────────────────
console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║              CARD POWER SCORE RANKING                       ║");
console.log("╠═══╦══════════════════════╦══════════╦══════════╦════════════╣");
console.log("║ # ║ Card                 ║ Rarity   ║ Power    ║ Raw        ║");
console.log("╠═══╬══════════════════════╬══════════╬══════════╬════════════╣");

for (const c of allCards) {
  const rank    = String(c.rank).padStart(2);
  const name    = c.name.padEnd(20).slice(0, 20);
  const rarity  = c.rarity.padEnd(8).slice(0, 8);
  const power   = String(c.powerScore).padStart(6);
  const raw     = String(c.rawPower).padStart(8);
  console.log(`║ ${rank} ║ ${name} ║ ${rarity} ║ ${power}/1000 ║ ${raw}     ║`);
}

console.log("╚═══╩══════════════════════╩══════════╩══════════╩════════════╝");

// ─── Stats summary ───────────────────────────────────────────────
const byRarity = {};
for (const c of allCards) {
  if (!byRarity[c.rarity]) byRarity[c.rarity] = [];
  byRarity[c.rarity].push(c.powerScore);
}

console.log("\n📊 RARITY AVERAGE POWER:");
for (const [rarity, scores] of Object.entries(byRarity)
    .sort((a, b) => (RARITY_ORDER[a[0].toLowerCase()] || 9) - (RARITY_ORDER[b[0].toLowerCase()] || 9))) {
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  console.log(`  ${rarity.padEnd(12)}: avg=${avg}  min=${min}  max=${max}  (${scores.length} cards)`);
}

// ─── Top 10 & Bottom 10 ──────────────────────────────────────────
console.log("\n🏆 TOP 10 STRONGEST:");
allCards.slice(0, 10).forEach(c =>
  console.log(`  ${String(c.rank).padStart(2)}. ${c.name.padEnd(22)} ${c.powerScore}/1000  [${c.rarity}]`)
);

console.log("\n💀 BOTTOM 10 WEAKEST:");
allCards.slice(-10).forEach(c =>
  console.log(`  ${String(c.rank).padStart(2)}. ${c.name.padEnd(22)} ${c.powerScore}/1000  [${c.rarity}]`)
);

// ─── OP kart xəbərdarlığı ────────────────────────────────────────
const opThreshold = 850;
const opCards = allCards.filter(c => c.powerScore >= opThreshold);
if (opCards.length) {
  console.log(`\n⚠️  POTENTIALLY OP CARDS (Power ≥ ${opThreshold}):`);
  opCards.forEach(c => console.log(`  → ${c.name} [${c.rarity}]: ${c.powerScore}/1000`));
}

console.log(`\n✅ Nəticə: output/cards-with-power.json faylına yazıldı (${allCards.length} kart)\n`);
