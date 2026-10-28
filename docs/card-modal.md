# Card modal and combat profiles

The portrait fills the left side of the modal without empty bands. The name,
class/subclass and faction sit over the artwork, with a dark gradient behind the
text and an inset angular frame. Creature type and movement type appear at the
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
| 3 | Attack travel distance, projectile width, attack arc/shape/type, multiple targets, target layers, movement, ground-effect immunity, weight, creature type, impact area and endpoint effect |

Zero values are shown. Missing or inapplicable data is displayed as `—`.
Distance and movement values use **1,000 points = 1 tile**. Range is displayed
only on page 1: `5000` becomes `5 tiles`. Speed uses the same scale per second:
`1500` becomes `1.5 tiles/s`. Projectile widths and attack distances use the same
conversion, so `500` points is `0.5 tiles`. Slash-separated values retain every
variant, for example `1000/2500` displays as `1 / 2.5 tiles`.

JSON stores the original point values, and crystal ratings still compare those
raw values against their original caps. Other stats and burst values such as
`2x6` keep their existing display. Impact areas already authored in tiles and
attack angles in degrees keep those units.
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

The updated interface, tooltips and accessible labels are English. Ability names,
`trait`, Emergent `turns`, star upgrade text and conditional ability descriptions
stay exactly as authored. Ability content is marked `lang="az"`; do not translate
it unless the user explicitly requests that change.

```json
"combatStats": {
  "attackType": "melee",
  "multiTarget": false,
  "maxTargets": 1,
  "attackShape": "single",
  "attackWidth": 1200,
  "attackDistance": 1250,
  "attackDistanceMatchesRange": false,
  "attackAngle": null,
  "impactSize": null,
  "projectileEndEffect": null,
  "movementType": "ground",
  "groundEffectImmune": false,
  "weight": "heavy",
  "targets": "ground"
}
```

| Field | Accepted values / meaning |
| --- | --- |
| `attackType` | `melee`, `ranged`, `mixed`, `none` |
| `multiTarget` | Whether one attack can damage more than one enemy |
| `maxTargets` | `1` for single target, a count such as `5`, `null` for targets inside an area, `0` for a non-attacker |
| `multiTargetCondition` | Optional ability activation rule, preserved in its original language |
| `attackShape` | `single`, `cone`, `circle`, `line`, `square`, `multi`, `none` |
| `attackWidth` | Width of one projectile or strike in source points; an unspecified single-target width defaults to `500` (0.5 tiles). Explicit widths always take precedence. |
| `attackDistance` | Maximum travel distance of one attack in source points; independent of Range; `null` when not specified |
| `attackDistanceMatchesRange` | Resolves travel distance from the current maximum `additionalStats.range`, including slash-separated variants |
| `attackAngle` | Sweep angle in degrees, e.g. `135` or `360`; independent of width |
| `impactSize` | Impact area dimensions such as `1 × 1 tiles`; separate from projectile width |
| `projectileEndEffect` | `explode` for an explosion at the travel endpoint; `null` when not specified |
| `movementType` | `ground`, `flying`, `hovering` |
| `groundEffectImmune` | True for hovering and airborne cards, which are not affected by ground-only effects |
| `movementCondition` | Optional temporary movement ability description, kept in its original language |
| `weight` | `very-light`, `light`, `medium`, `heavy`, `very-heavy` |
| `targets` | Target layers: `ground`, `air`, `both`, `none`; independent of the attacker's movement |

**Range** controls target acquisition and when a card can start attacking.
**Attack Distance** is how far a single attack can travel. **Projectile Width**
is the width of that attack; sweep angles and impact areas have their own fields.
Henry's authored width remains **1200 points (1.2 tiles)** and his travel distance
**1250 points (1.25 tiles)**. His existing Range stays **1200 points**, shown as
**1.2 tiles** on page 1. Arcanyx's travel distance follows his current maximum
Range (**2100 points / 2.1 tiles** in the current data), and his attack explodes
at its endpoint. Unspecified travel distances remain `null`. Single-target
attacks without an authored width use **500 points / 0.5 tiles**; non-attackers
and unknown multi-target widths receive no invented width. Width changes do not
rewrite `multiTarget`, `maxTargets` or other unspecified combat fields.

The Mundane overrides are stored in `rarity/mundane.json`, including Mini Freaks.
Scrapy and Fen use the Cone shape; Nitrox and Ben target Ground. Freak, Mini
Freaks, Ironjaw and M-Manager are Heavy. Nightprowler and Bethe use a 75° arc;
Bethe uses the final requested weight, Medium. Henry retains his earlier values.
Unmentioned stats, ability text and level bonuses stay unchanged.

**Hovering** cards move on the **ground** layer while ignoring ground-only spells
and effects: Cryon, Tornado, Astranova, Whisper, Fallen Angel and Void Wraith.
**Flying** cards use the **air** layer: Bees, Angels, Hornets, Venom Fangs, Bats
and Butterflies. Every other base form is Ground. Temporary flight remains in
its original ability description and does not introduce a fourth movement type.

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
missing artwork, and the shared spell and Survival entry points. Additional checks cover English UI labels,
unchanged ability content, point-to-tile conversion, raw-value crystal ratings,
single-target width defaults, all Mundane overrides, Henry's independent
dimensions, Arcanyx's dynamic travel limit and the exact hovering/flying rosters.
