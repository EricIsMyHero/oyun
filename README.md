# Clash-A-Mana — Official Codex

## File Structure

```
clash-a-mana/
│
├── index.html              ← Main entry point (clean HTML skeleton only)
│
├── styles/
│   ├── main.css            ← All visual styles and CSS variables
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

Images are loaded automatically based on card data:

```
assets/{group}/{card-name}.jpg
```

Example: a card with `"group": "Constructs"` and `"name": "Iron Golem"`
will look for: `assets/constructs/iron-golem.jpg`

- Group and name are lowercased
- Spaces become hyphens
- Special characters are stripped

## Card JSON Format

```json
{
  "name": "Card Name",
  "rarity": "mundane | familiar | arcane | relic | ascendant | apex | ethereal",
  "group": "Group Name",
  "story": "Lore text shown in the modal.",
  "trait": "Special ability description.",
  "stats": {
    "mana": 3,
    "health": 1000,
    "damage": 100,
    "shield": 200,
    "speed": 150,
    "range": 500,
    "sps": 80
  }
}
```

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
available roster. Multi-form cards start in their first form; class selects an
arena weapon archetype. These are arena adaptations, not implementations of all
138 original card traits. The 20 supported names start with their own passive.

Move using WASD / arrows or the joystick. Attacks are automatic. **P / Esc**
pauses; leaving Survival or hiding the tab freezes combat. **Space** with the
canvas focused, or **Mana dalğası**, spends 3 mana on an area hit and a +25%
damage buff. Mana regenerates at 0.5/s; the Life stat controls buff duration.

Every level pauses the run and offers **3 upgrades; choose exactly one** by
click/touch or keys 1–3. Excess XP opens successive choices. A run holds **4
weapons including the starting weapon**, and **4 passives including any innate
passive**. Full slots allow equipped upgrades only. Weapons reach level 8 and
passives level 5; maxed options disappear. Consumable choices remain available
at full progression. Inspect an equipped item by clicking or tapping its slot.

Weapons: Soldier rifle, Henry axe, mana wand, Dumpsy orbits, fire nova and chain
lightning. Passives: Venomora, Toxic, Magmara, Aeralis, Clara, Venomspikes,
Frostshot, Stormblade, Collector, Blesser, Azrith, Neon Droid, Skyhunter,
Demotron, Untouch, Artist, Lyra, Ali, Snaykies and Reacher. Passive descriptions
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
- Count adds projectiles, melee targets, orbitals and lightning bounces (up to
  15); nova gains +8% damage per additional Count.
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
