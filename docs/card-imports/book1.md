# Book1.xlsx — new cards

Book1 adds **9 root cards**, bringing the Codex to **176 roots** and **241
records** including forms and partner upgrades. Only these nine additions are
imported. All previous 167 roots, native abilities, combat profiles, stats,
rarities, artwork metadata, nested forms and Power scores remain unchanged.

| Rarity | New cards | Editorial passive points / 200 |
| --- | --- | --- |
| Mundane | Erica | 150 |
| Familiar | Witch, Bro, Tooni, Spinata | 125, 100, 125, 100 |
| Arcane | Nancy, Veronica | 100, 125 |
| Apex | Radglic | 150 |
| Emergent | Plauge | 150 |

The spelling **Plauge** is retained exactly as supplied. **Martel**, Arcane row
33, has the same stats and native passive as the existing **Mertel**; it is
recorded as an alias and neither creates a duplicate nor renames Mertel.
Existing Ascendant partner labels and Ethereal T1/T2 rows are existing forms,
not new roots. The worksheet names determine rarity; stale title cells do not.
Only the first 16 columns are read; an isolated value in column AMM is ignored.

The sheet includes older versions of existing mechanics and stats. Importing it
does not revert Gloop's 100-second lifetime, XII Josh's Count of one, Dumpsy's
5% scaling, Ase Form II's Range/Speed, Ray charge/fusion rules or any other
previously edited JSON. It also does not replace Three Wise Monkeys' existing
ability with the workbook variant; this request adds new cards only.

## Imported data

Each card retains its workbook Count, Health, Shield, burst Damage, reference
DPS, Attack Speed, Delay, Mana, Range, Speed, Critical Chance and Lifesteal
Chance. Numeric chances are converted from fractions to percent strings.
Attack intervals and Delay use seconds; spatial values remain source points
(1,000 points per tile). Informational source DPS is retained rather than
rewriting authored burst timing to force a match. Ability prose stays in its
original Azerbaijani. The manifest records the file hash, sheet, row and all
16 source values for each new card.

Unprovided stats, lore, class, faction and combat dimensions remain unspecified.
No fictional artwork path or combat profile is assigned. The archive and
Survival picker include all nine cards. Survival uses its generic loadout rules,
not implementations of these new native abilities.

The Arena library's All filter displays the new cards with their source stats,
Power breakdown and explicit missing-data reasons. They remain **locked for
battle** until their combat profiles (attack type, width, travel distance,
shape, movement, target layers, weight) and native behaviors are specified and
implemented. The existing 138 ready roots remain playable; 38 roots now have
incomplete battle data. Plauge's text refers to the existing Weakness and
Absolute Weakness effects, but importing prose alone does not activate attacks.

## Reproduce and verify

Requires Python with openpyxl. Run from the repository root:

```sh
python scripts/import-book1.py /path/to/Book1.xlsx
node scripts/power.js
node --test tests/*.test.cjs
node tests/card-modal.browser.cjs
node tests/arena.browser.cjs
```

The import can be repeated without duplicating entries. It refuses to overwrite
an existing new-card ID with different data. Passive scores are explicit
editorial assignments in `js/core/passive-power.js`, not inferred from worksheet
text. See [the full Power rules and rating table](../card-power.md) and
[the source manifest](../../data/card-imports/book1.json).

Regression fixtures fingerprint every pre-import root and Power score. Tests
also verify exact new rows, chance conversion, stable old mechanics, aliases,
rarity membership, reviewed passive scores, missing-data locks and rejection of
an incomplete card in an Arena deck.

## Subsequent role audit

The user subsequently requested a full class/subclass review. Only these role
labels may differ from the historical import description above; missing roles
are now filled and misleading labels corrected. Source stats, abilities and
combat profiles remain unchanged. See [the full role audit](../card-roles.md).
