export const RULES = Object.freeze({
  maxMana:20, startMana:12, manaInterval:1.3, regulation:300, overtime:120,
  castleHealth:1000, castleDamage:25, castleInterval:1, castleRange:4,
  captureTime:5, captureRadius:1.25, nodeBonus:0.02, deckSize:8, handSize:4,
  spellBudget:5, fixedStep:1/30, projectileSpeed:8,
});
export const STAT_KEYS = ['health','shield','damage','attackSpeed','delay','sps','mana','number','range','speed','criticalChance','criticDamage','lifestealChance','lifesteal','dodge','vision','healBonus','healrecovery','shieldrecovery','criticdamageminimiser','damageminimiser','flexibility','shieldtakendamage','life'];
export function num(value, fallback=0) {
  if(value == null || /^\s*[-—–]?\s*$/.test(String(value))) return fallback;
  const n=parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n)?n:fallback;
}
export function burst(value) {
  const text=String(value??'').trim().replace(',', '.');
  if(text.includes('/')) return null;
  const match=text.match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)$/i);
  if(match) return {count:num(match[1]),damage:num(match[2])};
  return {count:1,damage:num(value)};
}
export const energyForMana = cost => Math.round((cost/18)*20)/20;
export const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
