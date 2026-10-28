# Clash-A-Mana — Official Codex

## File Structure

```
clash-a-mana/
│
├── index.html              ← Main entry point (clean HTML skeleton only)
│
├── styles/
│   ├── main.css            ← Shared styles and CSS variables
│   ├── card-modal.css      ← Card portrait, rarity glow and paged stats
│   ├── nav.css             ← Navigation packages (Archive / Game dropdowns)
│   └── towerguns.css       ← Tower Guns section
│
├── js/
│   ├── core/
│   │   ├── particles.js    ← Ambient particle canvas background
│   │   ├── navigation.js   ← Section routing, portal control, scroll reveal
│   │   └── modal.js        ← Card detail overlay
│   │
│   └── modules/
│       ├── cards.js        ← Card database fetch, filter, render
│       ├── spells.js       ← Spell archive fetch, filter, render
│       ├── towerguns.js    ← Tower Guns fetch + render
│       └── info.js         ← Codex / info section
│
├── data/
│   ├── spells.json         ← All spell cards
│   ├── towerguns.json      ← All tower guns (empty list until filled in)
│   ├── info.json           ← Codex sections (rules, mechanics)
│   └── groups.json         ← Faction / group definitions
│
├── rarity/
│   ├── mundane.json        ← Mundane tier cards
│   ├── familiar.json       ← Familiar tier cards
│   ├── arcane.json         ← Arcane tier cards
│   ├── relic.json          ← Relic tier cards
│   ├── ascendant.json      ← Ascendant tier cards
│   ├── apex.json           ← Apex tier cards
│   ├── emergent.json       ← Emergent tier cards
│   └── ethereal.json       ← Ethereal tier cards
│
└── assets/
    └── {group-name}/
        └── {card-name}.jpg ← Card artwork images
```

## Navigation Packages

The top bar has two dropdown packages instead of one long row of buttons:

| Package     | Sections                                                                   |
|-------------|----------------------------------------------------------------------------|
| **Archive** | Lore, Cards, Spells, Tower Guns                                            |
| **Game**    | Battle Arena, Survival, Codex, Power Up, Shop, Mana Pass, Trophy Road      |

To move a section between packages, move its `<li><button class="nav-btn" data-section="...">`
line inside the other `<ul class="nav-menu">` in `index.html`. Nothing else has to change.

## Tower Gun JSON Format

`data/towerguns.json` is a list. Any key inside `stats` is shown as a stat row.

```json
[
  {
    "name": "Gun Name",
    "rarity": "common | rare | epic | legendary",
    "trait": "What the gun does.",
    "stats": {
      "damage": "120",
      "range": "7500",
      "attackSpeed": "1.2",
      "health": "2000"
    }
  }
]
```

## Image Path Convention

Card artwork is served from Cloudflare R2. `getCardImg()` in
`js/modules/cards.js` builds `{R2 base}/{group}/{id}.jpg` using transliterated,
lowercase slugs. Nested forms fall back to their parent group. Failed artwork
requests show the rarity icon.

## Card JSON Format

```json
{
  "id": "example",
  "name": "Card Name",
  "rarity": "Mundane",
  "group": "Group Name",
  "type": ["Human"],
  "story": "Lore opened by the Lore button.",
  "trait": "Special ability description.",
  "stats": {
    "health": "120", "shield": "40", "damage": "12", "sps": "10",
    "attackSpeed": "1.25s", "delay": "-", "mana": "3", "number": "1"
  },
  "additionalStats": {
    "range": "1500", "speed": "1000", "criticDamage": "1.5x",
    "criticalChance": "5%", "lifesteal": "25%", "lifestealChance": "0%"
  },
  "combatStats": {
    "attackType": "melee", "multiTarget": true, "maxTargets": null,
    "attackShape": "cone", "attackWidth": null, "attackDistance": null,
    "attackDistanceMatchesRange": false, "attackAngle": 135,
    "movementType": "ground", "groundEffectImmune": false,
    "weight": "medium", "targets": "ground"
  }
}
```

The card modal places the name, class/subclass and faction over framed artwork,
with **Stats / Ability / Star Levels / Lore** controls on the right. The portrait
fills its area; an expand control opens the full, uncropped image. Inline SVG
icons replace emoji in the modal and archive tiles. Stats
has three numbered pages covering all 24 numeric stats and the combat profile.
Five crystals replace bars, and a moving rarity light traces the frame.
All 138 cards and their forms have editable
combat profiles. See [the modal and profile guide](docs/card-modal.md) for field
values, conditional flight/area attacks, stat ordering and validation commands.

The new card interface uses English labels while ability names, descriptions,
turn abilities and star upgrade text remain in their original language. Range,
projectile width and attack travel distance are separate values. Movement is
Ground, Flying or Hovering; hovering follows the ground layer with immunity to
ground-only spells and effects. See the profile guide for the exact card rosters.

Spatial values stay in source points: **1,000 points = 1 tile**. The card modal
shows Range only on the first Stats page and converts Speed to tiles per second.
An unauthored single-target projectile width defaults to **500 points / 0.5 tiles**;
explicit per-card values, including Henry's width, take priority. Mundane widths,
travel distances and the requested shape, target, arc and weight overrides are
stored in `rarity/mundane.json`; other stats and abilities are preserved.

## Spell JSON Format

```json
{
  "name": "Spell Name",
  "rarity": "common | rare | epic | legendary",
  "type": "normal | building",
  "treat": "Description of what the spell does.",
  "stats": {
    "energy": 4,
    "damageToCard": "250",
    "damageToCastle": "100",
    "range": "800"
  }
}
```

## Running Locally

Open with any local server (required for fetch() calls to JSON files):

```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .

# VS Code
Use the Live Server extension
```

Then open: `http://localhost:8080`

> ⚠️ Do NOT open `index.html` directly as a file (`file://`).
> The JSON fetches require a local HTTP server.

## Survival Arena

Serve the repository over HTTP, open **Game → Survival**, and pick a character.
The picker loads all **138 Codex cards** from the eight `rarity/*.json` files,
with search and rarity filters. Failed files can be retried without losing the
available roster. Multi-form cards start in their first form. Except for the
explicit loadouts below, Range ≤1500 selects melee (axe / Dumpsy orbits);
longer range selects a wand for Mage/Support or a rifle for other classes. These are arena adaptations, not implementations of all
138 original card traits. Cards with a supported passive start with it equipped. There are now **91 passives**; see the full [passive catalog](docs/survival-passives.md).

Move using WASD / arrows or the joystick. Attacks are automatic. **P / Esc**
pauses; leaving Survival or hiding the tab freezes combat. **Space** with the
canvas focused, or **Mana dalğası**, spends 3 mana on an area hit and a +25%
damage buff. Mana regenerates at 0.5/s; the Life stat controls buff duration.

Every level pauses the run and offers **3 upgrades; choose exactly one** by
click/touch or keys 1–3. Excess XP opens successive choices. A run holds **4
weapons including the starting weapon**, and **4 passives including any innate
passive**. Full slots allow equipped upgrades only. Weapons reach level 8 and
the 18 scalable passives level 5. The 73 exact-rule passives are single-rank; maxed options disappear. Consumable choices remain available
at full progression. Inspect an equipped item by clicking or tapping its slot.

Weapons: Soldier rifle, Henry axe, heavy hammer, bow, light axe, sword, dual swords, scythe, spear, mana wand,
Dumpsy orbits, fire nova and chain lightning. The rifle fires three sequential
bullets at a single point locked at volley start; death or movement of the target
does not redirect later bullets. Count upgrades add shots to that volley, rather
than spreading each shot among targets. The next volley can select a new point.

| Weapon | Base attack | Timing | Starting cards |
|--------|-------------|--------|----------------|
| Sword | 12 damage to all enemies in a 135° sector; 150px range | 1.25s | King, Mimic, Blesser, XII Josh, Bio Mech, Stormblade, Azrith, Fallen Angel, Ali, SlasherX |
| Dual swords | 2×6 damage in a locked 90° sector; 135px range | First hit, second hit 0.50s later, then 0.75s recovery before the next pair | Nightprowler, Malvaris |
| Scythe | 28 damage to all enemies within a 360° area; 160px range | 2.00s | Hailey, Shadow Reaper, Bloodraider |
| Heavy hammer | 90 damage in a 40×40px (1×1) square centered on its target; 120px reach | 3.00s | Lord, Trac, Earthshakers, Warborn |
| Bow | 8 damage per arrow; 600px range | 0.80s | Hunter, JS, Skyhunter, Fire Archer, Nyra |
| Light axe | 6 damage, exactly one target; 130px range | 0.75s | Hell boy, Collector |
| Spear | 20 damage through a narrow 24px-wide thrust; 240px reach | 1.75s | Wong, Void Striker, Tribe, Lumina |

These explicit loadouts replace only the starting offensive stats and range;
health, shields and additional stats still come from each card. Listed damage is
base damage before upgrades, critical hits and passive modifiers. Dual-sword
recovery is a weapon combo timer, separate from the general Delay wind-up stat.
Haste speeds up both the gap between hits and the recovery; pausing freezes both.
All enemies intersecting a melee sector/line can be hit. Additional Count upgrades
add +8% damage per Count to the new melee area weapons.

Passives: Venomora, Toxic, Magmara, Aeralis, Clara, Venomspikes,
Frostshot, Stormblade, Collector, Blesser, Azrith, Neon Droid, Skyhunter,
Demotron, Untouch, Artist, Lyra, Ali, Snaykies and Reacher, plus 71 additional passives listed in the catalog. Passive descriptions
show exact arena effects. Repeated poison/burn/slow hits refresh their duration;
splash and damage-over-time do not recursively trigger hit passives or lifesteal.

All 24 stat keys, labels, colors and maximum values come from the Codex's
`STAT_DEFS`, `ADD_STAT_DEFS` and `EXTRA_STAT_DEFS` in `js/core/modal.js`.
`survival-data.js` supplies arena mechanics and upgrade increments; the source
rarity JSON is never mutated. Stats are absolute values, not percentage bonuses.

| Group | Maximum values |
|-------|----------------|
| Primary | Health 1000, Shield 1000, Damage 200, Attack Speed 5s, Delay 200ms, DPS 500, Mana 20, Count 15 |
| Additional | Range 30000, Speed 5000, Critical Chance 100%, Critical Damage 5×, Lifesteal Chance 100%, Lifesteal 100%, Dodge 70%, Vision 8000 |
| Bonus | Healing Bonus 100%, Rejuvenation 10/s, Fortification 10/s, Critical Resistance 90%, Damage Reduction 90%, Flexibility 80%, Shield Depletion 100%, Life 200s |

Arena interpretations:

- Attack Speed is the interval between attacks: **lower is faster**. Upgrade
  selections add +10% haste up to **+90%**, including temporary passive haste.
  The panel shows the resulting interval. Delay is a separate wind-up; upgrades
  reduce it to 0ms. JSON volley gaps are included in the starting interval.
- Range / Vision use 10 Codex units per canvas pixel; Speed uses 5 units per
  pixel/second. Range improves every weapon; Vision limits target acquisition.
- Count extends rifle volleys, adds wand projectiles, axe targets, orbitals and
  lightning bounces (up to 15); nova gains +8% damage per additional Count.
  The new melee area weapons gain +8% damage per Count above their starting Count.
- Shield absorbs hits before health with correct overflow. Shield Depletion is
  the percentage of blocked damage spent as shield; upgrades reduce it toward
  10%. Fortification starts 3 seconds after the last non-dodged hit.
- Critical Chance and Critical Damage affect outgoing hits. Lifesteal uses
  actual health damage (excluding shields and overkill). Healing Bonus applies
  to all healing. Critical Resistance reduces the extra portion of enemy crits;
  Damage Reduction and Reacher share a 90% ceiling. Flexibility shortens enemy
  chill duration. Armored / chilling / critical enemies appear as time increases.
- DPS is **measured**, includes shield damage and DoT, excludes overkill, and is
  capped by a 500-damage budget over a rolling second. It is not an upgrade.
- Life controls the mana buff duration, not a forced player death timer.

New runs reset stats, resources, passive timers and loadouts. Canvas effects
include shield arcs, range circles, projectile trails, hit/death flashes, damage
numbers and status marks. Reduced motion disables particles and screen shake.
Card artwork remains optional; emoji avatars work when remote artwork fails.

Run dependency-free regression tests with Node.js:

```bash
node --test tests/survival.test.cjs
```

Browser smoke check: search/filter the roster; start both a normal card and a
multi-form card; verify movement, natural kills/XP, paused upgrade choices,
resource HUD, mana ability, shield overflow, restart/menu, and mobile joystick.

The extended passives use per-run counters, expiring stacks, charges, traps and
companions. Enemy variants include flying units, animals and ranged attackers,
so anti-air, type resistances, blindness, silence and projectile reflection have
real combat targets. The HUD shows companions, invisibility, egg timer and active
charge meters; the stat panel includes temporary critical/lifesteal/damage bonuses.
Companions and secondary area/DoT effects share the DPS budget but do not trigger
recursive hit-passive chains. World actors and effect arrays are bounded.

Survival's passive definitions and runtime are included in `js/modules/survival.js`.
Only `survival-data.js` followed by `survival.js` is needed for this mode, after
the existing Codex scripts. There is no separate passive-runtime download. The
HTML versions the engine URL so deployments fetch the corrected script. Replace
the ZIP contents together, including `index.html`; keep serving them over HTTP.
