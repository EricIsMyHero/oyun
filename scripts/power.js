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
    .split("/")[0]           // "24/2x8" → "24" (take first value)
    .replace(",", ".")       // "1,10s" → "1.10s"
    .replace(/[s%x]/gi, "")  // strip units
    .trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function attackSpeed(v) {
  if (!v || v === "-") return 1;
  const s = String(v)
    .split("/")[0]
    .replace(",", ".")
    .replace("s", "")
    .trim();
  const n = parseFloat(s);
  return isNaN(n) || n <= 0 ? 1 : n;
}

function damage(v) {
  if (!v || v === "-") return 0;
  const first = String(v).split("/")[0].trim();  // "24/2x8" → "24"
  if (first.includes("x")) {
    const [a, b] = first.split("x");
    return (parseFloat(a) || 1) * (parseFloat(b) || 1);
  }
  return toNum(first);
}

// ─── Raw Power Score (absolute) ──────────────────────────────────
function calcRawPower(card) {
  if (!card.stats || !card.additionalStats) return 0;

  const hp      = toNum(card.stats.health);
  const shield  = toNum(card.stats.shield);
  const atk     = damage(card.stats.damage);
  const aspd    = attackSpeed(card.stats.attackSpeed);
  const count   = toNum(card.stats.number) || 1;  // multi-unit cards

  const dps     = aspd > 0 ? atk / aspd : 0;

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
