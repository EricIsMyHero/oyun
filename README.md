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
