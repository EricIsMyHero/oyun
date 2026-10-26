# Card modal and combat profiles

The archive modal uses the rarity colors in `styles/main.css` for its border,
outer glow and ambient light. No rarity text badge is rendered for cards.
Rarity remains available in the dialog's accessible label. The same skin is
updated when choosing an Ethereal type, switching a summoned form, or viewing
an Ascendant upgrade. Spell dialogs reset the skin using their own rarity.

The portrait uses `object-fit: contain` and never zooms or crops. On a wide
screen it stays visible while the modal scrolls. On a phone it sits above the
content. **Lore** opens the existing story in a separate reader; Escape returns
to the card, and a second Escape closes the card. Keyboard focus stays inside
the active dialog and returns to its opener.

## Stats pages

A single expandable **Stats** control contains four numbered pages:

| Page | Contents |
| --- | --- |
| 1 | Health / Shield; Damage / DPS; Attack Speed / Delay; Mana / Count; Range / Speed; Critical Damage / Critical Chance; Lifesteal / Lifesteal Chance |
| 2 | Dodge / Vision; Healing Bonus / Rejuvenation; Fortification / Damage Reduction; Critical Resistance / Flexibility; Shield Depletion / Life |
| 3 | Multiple targets, attack width, attack distance/type, attack shape, flight, weight, targets and creature type |
| 4 | All three star level descriptions and their before/after values |

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
eight rarity skins, six viewport sizes, keyboard tabs, Lore, transformations,
missing artwork, and the shared spell and Survival entry points.
