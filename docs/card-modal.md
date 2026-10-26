# Card modal and combat profiles

The portrait fills the left side of the modal without empty bands. The name,
class/subclass and faction sit over the artwork, with a dark gradient behind the
text and an inset angular frame. Creature type and flight status appear at the
bottom. Rarity colors from `styles/main.css` tint the outer frame; a bright
highlight travels around it on an eight-second cycle. There is no visible rarity
text badge. The light and close button remain on the frame while content scrolls;
reduced-motion preferences stop the animation.

The portrait uses `object-fit: cover`. Its expand button opens the original image
in a separate, uncropped `contain` viewer. Escape returns to the card and restores
focus to the expand button. Broken artwork hides the expand control and shows an
outline placeholder. The modal, shared spell views and archive tiles use inline
SVG outline icons instead of emoji or an external icon font. Stat values use a
clear system font, with the Codex display face retained for the portrait name.

The four section controls sit on the right on desktop and form a compact row
below the image on phones:

| Button | Contents |
| --- | --- |
| Stats | All 24 numeric stats and the combat profile, arranged into three numbered pages |
| Ability | The passive description, ability name and Emergent turn controls |
| Star Levels | All three upgrade descriptions and before/after values |
| Lore | The complete story, read inside the modal |

Arrow keys move between sections, and between numbered Stats pages. Section and
page selection survive form changes; opening another card starts at Stats page
1. Escape closes the card and restores focus to its opener. Spell dialogs retain
the shared fullscreen Lore reader, with Escape returning to the spell first.

## Stats pages

| Page | Contents |
| --- | --- |
| 1 | Health / Shield; Damage / DPS; Attack Speed / Delay; Mana / Count; Range / Speed; Critical Damage / Critical Chance; Lifesteal / Lifesteal Chance |
| 2 | Dodge / Vision; Healing Bonus / Rejuvenation; Fortification / Damage Reduction; Critical Resistance / Flexibility; Shield Depletion / Life |
| 3 | Multiple targets, attack width, attack distance/type, attack shape, flight, weight, targets and creature type |

Zero values are shown. Missing or inapplicable data is displayed as `—`.
Values keep their original units and burst format, such as `2x6`.
Five crystals replace stat bars. Each crystal represents one fifth of the
reference scale in the existing stat definitions. Attack interval, volley delay,
mana cost and shield depletion use the inverse scale: lower values rank higher.
Volley delay uses a 5-second reference scale for the archive. For slash-separated
values, the first variant supplies the crystal rating; the full value remains
visible. Crystal ratings are a display comparison, not a combat multiplier.

## Editable card fields

All 138 cards and their nested forms (192 objects total) now have a `combatStats`
object in `rarity/*.json`. Store it directly on each form, including `type1`,
`type2`, `forms[]` and `upgradedsecondForm`, so transformations can differ.
The profiles are initial design values based on the existing card descriptions
and the requested weapon assignments. Weight is a design category, not a
calculation from Health. Edit these values to refine balance.

```json
"combatStats": {
  "attackType": "melee",
  "multiTarget": true,
  "maxTargets": null,
  "attackShape": "cone",
  "attackWidth": "135°",
  "flight": "ground",
  "weight": "medium",
  "targets": "ground"
}
```

| Field | Accepted values / meaning |
| --- | --- |
| `attackType` | `melee`, `ranged`, `mixed`, `none` |
| `multiTarget` | Boolean: can the attack damage more than one enemy? |
| `maxTargets` | `1` for single target, a number such as `5`, `null` for enemies inside the area, `0` for a non-attacker |
| `multiTargetCondition` | Optional activation rule, e.g. `Hər 4-cü vuruşda.` for a conditional area attack |
| `attackShape` | `single`, `cone`, `circle`, `line`, `square`, `multi`, `none` |
| `attackWidth` | Readable angle/area, e.g. `90°`, `360°`, `1 × 1 karo`, `Dar xətt` |
| `flight` | `ground`, `flying`, `conditional` |
| `flightCondition` | Required explanation for `conditional`, e.g. XII Josh's low-health flight |
| `weight` | `very-light`, `light`, `medium`, `heavy`, `very-heavy` |
| `targets` | `ground`, `air`, `both`, `none` |

**Count** (`stats.number`) is the number of deployed units. Burst damage such as
`3x5` describes successive hits. Neither means three simultaneous targets.
For example, Soldier remains single target, Tenta targets five enemies, and the
two Mr. Ray types have separate circular and single-target profiles.

These fields describe the Codex card. They do not alter Battle or Survival's
existing combat simulation; Survival continues to use its own weapon geometry,
loadout and upgrade rules. Original numeric stats, lore, abilities and level
bonuses are preserved.

## Verification

```sh
node --test tests/*.test.cjs
node tests/card-modal.browser.cjs
```

The browser check requires Playwright and Chromium (`/usr/bin/chromium` by
default; override with `CHROMIUM_PATH`). It serves the real app on a temporary
localhost port, stubs external art/font requests, renders all cards/forms, checks
eight rarity skins, six viewport sizes, the inline header, right-hand navigation,
keyboard tabs, Lore, transformations, the travelling light and reduced-motion fallback,
missing artwork, and the shared spell and Survival entry points.
