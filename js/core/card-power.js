/* Shared Codex power calculation: the same 100–1000 scale in every mode. */
(function(root){
'use strict';
function _toNum(v) {
  if (!v || v === '-') return 0;
  const s = String(v).split('/')[0].replace(',', '.').replace(/[s%x]/gi, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function _parseSec(v) {
  if (!v || v === '-') return 0;
  const s = String(v).split('/')[0].replace(',', '.').replace('s', '').trim();
  const n = parseFloat(s);
  return (isNaN(n) || n < 0) ? 0 : n;
}

function _parseDmg(v) {
  // Returns { count, perHit }
  if (!v || v === '-') return { count: 1, perHit: 0 };
  const first = String(v).split('/')[0].trim();
  if (first.includes('x')) {
    const [a, b] = first.split('x');
    return { count: parseFloat(a) || 1, perHit: parseFloat(b) || 0 };
  }
  const n = parseFloat(first.replace(',', '.'));
  return { count: 1, perHit: isNaN(n) ? 0 : n };
}

function _calcDPS(stats) {
  const { count, perHit } = _parseDmg(stats.damage);
  const aspd  = _parseSec(stats.attackSpeed);  // saniyə / güllə
  const delay = _parseSec(stats.delay);          // hücumlar arası gözləmə

  const totalDmg       = count * perHit;
  const attackDuration = count * aspd;           // bütün güllələrin vaxtı
  const fullCycle      = attackDuration + delay;  // tam hücum dövrü

  return fullCycle > 0 ? totalDmg / fullCycle : totalDmg;
}

function _calcEffectBonus(card) {
  let bonus = 0;
  if (Array.isArray(card.effects)) {
    for (const eff of card.effects) {
      const dur    = _toNum(eff.duration)        || 1;
      const pct    = _toNum(eff.percentage)      || 1;
      const dps    = _toNum(eff.damagePerSecond) || 0;
      const chance = _toNum(eff.chance)          || 100;
      const amount = _toNum(eff.amount)          || 0;
      const cln    = _toNum(eff.cooldown)        || 1;
      const cm     = chance / 100;

      // damage sahəsi AxB formatında ola bilər: "2x5" → 10
      let effDmg = 0;
      if (eff.damage) {
        const raw = String(eff.damage).trim();
        if (raw.includes('x')) {
          const [a, b] = raw.split('x');
          effDmg = (parseFloat(a) || 0) * (parseFloat(b) || 0);
        } else {
          effDmg = _toNum(raw);
        }
      }

      switch (eff.type) {
        case 'burn': case 'poison':
          bonus += effDmg > 0 ? effDmg * 1.2 * cm
                 : dps   > 0 ? dps * dur * 1.2 * cm
                 :              pct * dur * 1.2 * cm;
          break;
        case 'slow':           bonus += pct * dur * 1.5 * cm; break;
        case 'silence':        bonus += dur * 40 * cm; break;
        case 'blind':          bonus += dur * 30 * cm; break;
        case 'stun':           bonus += dur * 50 * cm; break;
        case 'curse':          bonus += pct * dur * 2.0 * cm; break;
        case 'heal':           bonus += dps > 0 ? dps * dur * 0.5 : amount * 0.5; break;
        case 'stat-reduction': bonus += amount * 0.6 * cm; break;
        case 'shield-grant':   bonus += (amount / cln) * 0.4; break;
      }
    }
  }
  const mech  = card.mechanic || '';
  const mstat = card.mechanicStats || {};
  switch (mech) {
    case 'mind-control': bonus += 200 + _toNum(mstat.controlDuration) * 35; break;
    case 'suicide': case 'burst': {
      const minD = _toNum(mstat.minBurstDamage);
      const maxD = _toNum(mstat.maxBurstDamage) || minD;
      bonus += ((maxD > minD ? (minD + maxD) / 2 : minD)) * 3.5; break;
    }
    case 'summon': bonus += (60 / (_toNum(mstat.intervalSeconds) || 14)) * (_toNum(mstat.summonCount) || 1) * 25; break;
    case 'transform': bonus += _toNum(mstat.transformPower) || 80; break;
    case 'stealth':   bonus += _toNum(mstat.stealthDuration) * 20; break;
    case 'area-denial': bonus += _toNum(mstat.burstDamage) * 2 + _toNum(mstat.duration) * 10; break;
  }
  return bonus;
}

function calcCardPower(card) {
  const s  = card.stats || {};
  const as = card.additionalStats || {};
  const hp      = _toNum(s.health);
  const shield  = _toNum(s.shield);
  const count   = _toNum(s.number) || 1;
  const dps     = _calcDPS(s);
  const range   = _toNum(as.range);
  const speed   = _toNum(as.speed);
  const crit    = _toNum(as.criticalChance);
  const critDmg = _toNum(as.criticDamage) || 1.5;
  const dodge   = _toNum(as.dodge);
  const ls      = _toNum(as.lifesteal);
  const dmgMin  = _toNum(as.damageminimiser);

  let base =
    (hp + shield) * 0.45 +
    dps * 7 +
    range / 120 +
    speed / 25 +
    dodge * 4 +
    ls * 2 +
    dmgMin * 5;
  base *= 1 + (crit / 100) * (critDmg - 1);
  if (count > 1) base *= 1 + (count - 1) * 0.6;
  base += _calcEffectBonus(card);
  return Math.round(base);
}

/* Raw power scores are computed once after all cards load, then scaled 100–1000 */


function powerRange(cards) {
  /* Flatten: normal cards + forms inside dual cards */
  const flat = [];
  for (const c of cards) {
    if (c.isDual) {
      if (c.type1) flat.push(c.type1);
      if (c.type2) flat.push(c.type2);
    } else {
      flat.push(c);
    }
  }
  const raws = flat.map(calcCardPower).filter(p => p > 0);
  return { min:Math.min(...raws), max:Math.max(...raws) };
}

function scaledPower(card, {min:_minPow,max:_maxPow}) {
  let raw;
  if (card.isDual) {
    const p1 = card.type1 ? calcCardPower(card.type1) : 0;
    const p2 = card.type2 ? calcCardPower(card.type2) : 0;
    raw = Math.round((p1 + p2) / 2);
  } else {
    raw = calcCardPower(card);
  }
  if (_maxPow === _minPow) return 550;
  return Math.round(100 + ((raw - _minPow) / (_maxPow - _minPow)) * 900);
}


root.ClashCardPower=Object.freeze({number:_toNum,damagePerSecond:_calcDPS,raw:calcCardPower,scorer(cards){const range=powerRange(cards);return card=>scaledPower(card,range);}});
})(globalThis);
