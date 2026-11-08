# Book2.xlsx card import

The workbook adds **29 root cards**, bringing the Codex to **167 roots** and
**232 definitions** including forms and partners. Sheet names determine rarity;
the stale headings in the Ascendant and Emergent sheets do not override them.

Existing JSON definitions take precedence. All 138 existing cards retain their
stats, native Azerbaijani abilities, lore, classes, artwork paths, upgrades and
combat profiles. Only the two requested rarity values change:

| Card | Previous rarity | New rarity |
| --- | --- | --- |
| Stormblade | Apex | Mundane |
| Umbra | Apex | Arcane |

Their IDs and Arena behavior remain unchanged. In particular, the workbook does
not revert XII Josh to three units, Ase Form II to its old Range/Speed, the Ray
charge rules, or any recent balance and ability updates.

## New cards

| Rarity | Added root cards |
| --- | --- |
| Mundane | Cow, Trainer, Burglar |
| Familiar | Dr. Golbert, Indi, Punchman |
| Arcane | Leader, Hostess, Mystic Magician, Kitsune, Mertel |
| Relic | Captain Vane, Spiritcaller, Bolt |
| Ascendant | Atlas, Great Stan, Marcy, Shield Maiden, ShockWave |
| Apex | Cloud, Esma, Legendary Warrior, Lily |
| Emergent | Huáng-chén, Servant, Survivor, Little Princess, Three Wise Monkeys |
| Ethereal | Dragon |

The user clarified that the Arcane row named Marcy is **Mertel**. Ascendant
**Marcy** is a separate card and retains Dracula as its partner.

Cloud's second and third phases are nested forms. Volt is nested under Bolt;
the pair is not imported as two independently costed deck cards. Dragon has
Light and Dark choices under one Ethereal root, with the shared 16 Mana cost.

The new Ascendant cards retain both workbook stat sets and partner links:

| Card | Partner in the deck |
| --- | --- |
| Atlas | Stella |
| Great Stan | Jestro |
| Marcy | Dracula |
| Shield Maiden | Legendary Warrior |
| ShockWave | Bolt, with Volt as its companion |

## Data handling

Count, Health, Shield, Damage, informational DPS, attack intervals, Delay, Mana,
Range, Speed, Critical Chance and Lifesteal Chance come from the new rows. Hit
formats such as `6x2` stay intact; Great Stan's `0.165s` interval keeps its full
precision. Fractional probabilities become percentages.

The newer rows express small Range and Speed values in tiles. They are converted
to source points at 1000 points per tile: `3.25` Range becomes `3250`, and `1.05`
Speed becomes `1050`. Atlas's `1,000/2,600` Range uses comma thousands, while its
`0,90/1,15` intervals use comma decimals. Those become `1000/2600` and
`0.90s/1.15s` respectively.

New native abilities remain in their original language. The workbook's names
inside ability prose, including the Hostess reference to Sophie, are retained.
No factions, classes, lore, art or unprovided combat dimensions are invented.
Unprovided stats display as dashes. Each new definition records the source sheet
and row in `sourceWorkbook`; the full inventory is in
[the machine-readable import record](../../data/card-imports/book2.json).

The existing 138 Arena cards remain playable. The 29 new roots can be inspected
using the library's **All** filter; they show explicit missing combat-profile and
native-ability reasons until those details are completed. Survival continues to
use its generic loadout rules for imported cards, rather than claiming to run
their new native abilities.

Regression checks retain hashes of all original definitions apart from their
allowed root rarity values, the original ability-text fingerprint, and the
historical Power-scoring baseline. The shared Power formula is unchanged.

Subsequent user-authorized audit corrections update Tphoenix's area targeting,
Ironjaw's native description to clarify an additional +25% Lifesteal Chance,
and Deadscope/Naar's reference DPS. Historical import checks restore only these
explicit edits before comparing the original fingerprints.
