# Card Power

Power is an absolute reference score out of **1,000**, shared by the archive,
modal, Arena catalog, Blesser target selection, Format target selection and
`scripts/power.js`. Adding another card never rescales an existing card.
It evaluates authored base stats and an editorial passive rating, rather than
live damage, current Health, temporary buffs or predicted match win rate.

| Group | Entries | Budget | Minimum per entry | Maximum per entry |
| --- | ---: | ---: | ---: | ---: |
| Primary | 10 | 500 | 10 | 50 |
| Recovery & Defense | 9 | 100 | 1 | 100/9 ≈ 11.11 |
| Combat Profile | 9 | 200 | 1 | 200/9 ≈ 22.22 |
| Passive | 1 | 200 | 0 | 200 |

Each numerical contribution is `floor + (ceiling − floor) × strength`.
Strength is clamped to 0–1. Keep full precision through all groups; round only
the final sum to an integer. An ideal card can reach 1,000. The theoretical
minimum with every contribution at its floor and no passive is **118**.
Actual cards need not occupy the full scale.

## Primary entries

| Entry | Strength calculation |
| --- | --- |
| Health | Health / 1,000 |
| Shield | Shield / 1,000 |
| Damage | Full burst damage / 200; `3×6` contributes 18 damage |
| Attack Speed + Delay | Inverse normalized full attack cycle, detailed below |
| Mana | 1 − Mana / 20; cheaper cards score higher |
| Count | Deployed Count / 15; distinct from hits per burst |
| Range | Range / 15,000 |
| Speed | Speed / 3,000 |
| Critical Chance + Damage | (Chance / 100) × ((Critical Damage − 1) / 4) |
| Lifesteal Chance + Lifesteal | (Chance / 100) × (Lifesteal / 100) |

For a burst of `N` hits, the actual cycle is `N × Attack Speed + Delay`.
The best reference is `N × 0.10 seconds`; the worst is `N × 50 seconds`.
When an extra Delay exists, add 0.10 seconds to the best reference and
5 seconds to the worst. Strength is
`1 − (actual − best) / (worst − best)`. No authored attack interval means
minimum attack-cycle points. A zero or absent Delay adds no delay penalty.
Chance and magnitude operands are individually clamped to their reference
ranges before multiplying. A zero chance gives no extra points for magnitude.

## Recovery & Defense

The nine entries are Dodge (70), Vision (21,000), Healing Bonus (100),
Rejuvenation (10/s), Fortification (10/s), Critical Resistance (90),
Damage Reduction (90), Flexibility (80), and Shield Depletion (100).
Numbers in parentheses are reference maxima. Divide the value by its maximum;
Shield Depletion uses `1 − value / 100` because lower depletion is better.
An unauthored depletion split uses the existing 70% default.
Periodic recovery such as `6/6s` is converted to `1/s`, not six per second.
**DPS and Life do not add separate Power points.** Their display references are
2,000 DPS and 200 seconds. This avoids adding derived damage twice.

## Combat Profile

Attack Type, Targets, Movement and Creature Type do not contribute directly.
The nine scored entries are:

| Entry | Best reference / calculation |
| --- | --- |
| Attack Distance | 15,000 source points / 15 tiles |
| Projectile Width | 5,000 source points / 5 tiles |
| Attack Arc | 360 degrees |
| Attack Coverage | Strike area / 25 square tiles |
| Multiple Targets | Authored maximum / 15; uncapped area attacks reach the reference maximum |
| Ground Effect Immunity | Yes = full strength; No = zero |
| Weight | Very light 0, Light .25, Medium .5, Heavy .75, Very heavy 1, based on resistance to displacement |
| Impact Area | Area / 25 square tiles; 5×5 tiles is full strength |
| End of Attack | Explosion = full strength; no endpoint effect = zero |

Attack Coverage uses physical geometry rather than a ranking of shape names:
cones use `πr² × arc/360`; circles use `πr²`; lines use distance × width;
square attacks use their impact dimensions, or distance × width when absent.
A `multi` shape uses the authored target count as its coverage proxy (maximum
reference 15); a single-target shape has no area bonus. Cone arcs can be derived
from width and distance when no angle is authored. A single-target projectile
with no specified width uses the existing 500-point default. Other missing
profile fields receive minimum points. An explicit range-matched attack uses
its authored Range. An authored attack sequence averages each step's profile.

Source values are never clamped or rewritten: only their score contributions
saturate at the reference maxima. These are scoring references, not Arena
combat limits. Survival retains its existing independent gameplay limits.

## Passive ratings

`js/core/passive-power.js` contains an explicit editorial rating for all
241 root/form/partner-upgrade records. The table below makes them reviewable.
Ratings are assigned to native ability text, independently of rarity and base
stats. They are balancing judgments, not measured win probabilities.

The rubric uses 0 for no passive, 25 for a small situational advantage, 50–75
for limited or conditional utility, 100–125 for substantial combat/economy
utility, 150–175 for strong control, support, scaling or multi-stage effects,
and 200 for exceptional repeatable copying or unbreakable control. Conditions,
drawbacks, ramp-up, cooldowns and consistency affect the rating.

A rating is matched by card ID, name and native ability text. Stat rebalances
retain it; changed/new abilities display **Passive rating pending** and receive
zero passive points until explicitly reviewed. No prose is automatically parsed
into scores. Dual-card parent ratings are derived from their two forms. Attack
modes separated by `/` average complete, unrounded mode breakdowns. This also
keeps the score of an individually selected Ethereal form accurate.

`node scripts/power.js` exports all 241 scored records and their full breakdowns
to the ignored `output/cards-with-power.json`. Tests cover fixed budgets, the
1,000 ceiling, all floors, chance pairs, attack cycles, periodic recovery,
geometry, mode averages, catalog invariance and reviewed passive coverage.

## Individual passive ratings

| Card / form key | Name | Passive / 200 |
| --- | --- | ---: |
| azrith | Azrith | 125 |
| azrith/forms/0 | Bannerox | 75 |
| untouch | Untouch | 150 |
| heartix | Heartix | 150 |
| r-1 | R-1 | 50 |
| blank | Blank | 50 |
| magmara | Magmara | 100 |
| willowshade | Willowshade | 125 |
| willowshade/forms/0 | Octarion | 50 |
| collector | Collector | 100 |
| sushu | Sushu | 150 |
| cloud | Cloud | 150 |
| cloud/forms/0 | Cloud (form 2) | 175 |
| cloud/forms/1 | Cloud (form 3) | 200 |
| thief | Thief | 175 |
| rotlings | Rotlings | 125 |
| rotlings/forms/0 | Mini Rotters | 50 |
| esma | Esma | 75 |
| venom-fangs | Venom Fangs | 125 |
| skyhunter | Skyhunter | 100 |
| rockback | Rockback | 125 |
| neon-droid | Neon Droid | 100 |
| void-wraith | Void Wraith | 125 |
| bio-mech | Bio Mech | 100 |
| mixela | Mixela | 175 |
| laura | Laura | 150 |
| legendary-warrior | Legendary Warrior | 125 |
| lily | Lily | 175 |
| arcanyx | Arcanyx | 150 |
| leafshade | Leafshade | 100 |
| jestro | Jestro | 100 |
| jestro/forms/0 | Cratex | 75 |
| tphoenix | Tphoenix | 150 |
| tphoenix/forms/0 | Fire Egg | 100 |
| tphoenix/forms/1 | Phoenix | 150 |
| corsair-crew | Corsair Crew | 150 |
| corsair-crew/forms/0 | Pirate Girls | 100 |
| ship-cannoneer | Ship Cannoneer | 100 |
| toxic | Toxic | 50 |
| lumina | Lumina | 175 |
| hell-boy | Hell boy | 125 |
| slasherx | SlasherX | 175 |
| sheriff | Sheriff | 100 |
| nurse | Nurse | 100 |
| tribe | Tribe | 125 |
| earthshakers | Earthshakers | 125 |
| whisper | Whisper | 200 |
| roguex | RogueX | 100 |
| void-striker | Void Striker | 50 |
| nightfang | Nightfang | 100 |
| sunrise | Sunrise | 100 |
| shellbyte | Shellbyte | 100 |
| wong | Wong | 150 |
| umbra | Umbra | 75 |
| leader | Leader | 75 |
| hostess | Hostess | 100 |
| mystic-magician | Mystic Magician | 175 |
| kitsune | Kitsune | 150 |
| mertel | Mertel | 125 |
| reacher | Reacher | 75 |
| reacher/upgradedsecondForm | Reacher | 100 |
| bastra | Bastra | 100 |
| bastra/upgradedsecondForm | Bastra | 125 |
| maapp | Maapp | 75 |
| maapp/upgradedsecondForm | Maapp | 100 |
| avara | Avara | 125 |
| avara/upgradedsecondForm | Avara | 150 |
| john-reynolds | John Reynolds | 125 |
| john-reynolds/upgradedsecondForm | John Reynolds | 150 |
| atlas | Atlas | 125 |
| atlas/upgradedsecondForm | Atlas | 150 |
| great-stan | Great Stan | 100 |
| great-stan/upgradedsecondForm | Great Stan | 150 |
| marcy | Marcy | 75 |
| marcy/upgradedsecondForm | Marcy | 100 |
| shield-maiden | Shield Maiden | 50 |
| shield-maiden/upgradedsecondForm | Shield Maiden | 75 |
| shockwave | ShockWave | 75 |
| shockwave/upgradedsecondForm | ShockWave | 100 |
| xii-josh | XII Josh | 150 |
| dumpsy | Dumpsy | 175 |
| blesser | Blesser | 150 |
| js | JS | 125 |
| mimic | Mimic | 200 |
| the-seven-sins | The Seven Sins | 125 |
| the-seven-sins/forms/0 | Pride | 75 |
| the-seven-sins/forms/1 | Greed | 150 |
| the-seven-sins/forms/2 | Lust | 75 |
| the-seven-sins/forms/3 | Envy | 125 |
| the-seven-sins/forms/4 | Gluttony | 75 |
| the-seven-sins/forms/5 | Wrath | 125 |
| the-seven-sins/forms/6 | Sloth | 25 |
| the-seven-sins/forms/7 | Human | 0 |
| stella | Stella | 100 |
| huang-chen | Huáng-chén | 175 |
| servant | Servant | 125 |
| survivor | Survivor | 150 |
| little-princess | Little Princess | 150 |
| three-wise-monkeys | Three Wise Monkeys | 100 |
| ase | Ase | Mean of forms |
| ase/type1 | Ase | 125 |
| ase/type1/forms/0 | Giga-R | 50 |
| ase/type2 | Ase | 125 |
| ase/type2/forms/0 | Giga-R | 75 |
| leno | Leno | Mean of forms |
| leno/type1 | Leno | 75 |
| leno/type2 | Leno | 75 |
| king | King | Mean of forms |
| king/type1 | King | 125 |
| king/type2 | King | 150 |
| king/type2/forms/0 | Guard | 50 |
| dracula | Dracula | Mean of forms |
| dracula/type1 | Dracula | 100 |
| dracula/type2 | Dracula | 125 |
| dracula/type2/forms/0 | Bats | 50 |
| leila | Leila | Mean of forms |
| leila/type1 | Leila | 75 |
| leila/type2 | Leila | 100 |
| lord | Lord | Mean of forms |
| lord/type1 | Lord | 175 |
| lord/type2 | Lord | 150 |
| lord/type2/forms/0 | Rider | 75 |
| hunter | Hunter | Mean of forms |
| hunter/type1 | Hunter | 100 |
| hunter/type1/forms/0 | Wolf | 50 |
| hunter/type2 | Hunter | 100 |
| hunter/type2/forms/0 | Eagle | 75 |
| soul-master | Soul Master | Mean of forms |
| soul-master/type1 | Soul Master | 125 |
| soul-master/type2 | Soul Master | 125 |
| mr-and-mrs-ray | Mr. and Mrs. Ray | Mean of forms |
| mr-and-mrs-ray/type1 | Mr. Ray | 175 |
| mr-and-mrs-ray/type1/forms/0 | Mrs. Ray | 175 |
| mr-and-mrs-ray/type2 | Mr. Ray | 175 |
| mr-and-mrs-ray/type2/forms/0 | Mrs. Ray | 175 |
| dragon | Dragon | Mean of forms |
| dragon/type1 | Dragon (Light) | 175 |
| dragon/type2 | Dragon (Dark) | 175 |
| albert | Albert | 50 |
| chicken | Chicken | 175 |
| frostshot | Frostshot | 125 |
| hornets | Hornets | 75 |
| warborn | Warborn | 75 |
| x-bot | X-Bot | 50 |
| nyra | Nyra | 100 |
| deadscope | Deadscope | 50 |
| turtle | Turtle | 100 |
| turtle/forms/0 | Mini Turtles | 75 |
| feral-wolf | Feral Wolf | 75 |
| trac | Trac | 150 |
| tornado | Tornado | 150 |
| dino | Dino | 100 |
| tenta | Tenta | 100 |
| fire-archer | Fire Archer | 125 |
| shadow-reaper | Shadow Reaper | 150 |
| voltriker | Voltriker | 75 |
| frostmaw | Frostmaw | 75 |
| hexon | Hexon | 75 |
| mecha-shield | Mecha Shield | 75 |
| venomspikes | Venomspikes | 125 |
| astranova | Astranova | 125 |
| kai | Kai | 125 |
| cassandra | Cassandra | 175 |
| dr-golbert | Dr. Golbert | 150 |
| indi | Indi | 100 |
| punchman | Punchman | 75 |
| hammies | Hammies | 25 |
| b-b | B-B | 75 |
| scrapy | Scrapy | 100 |
| nitrox | Nitrox | 75 |
| nortex | Nortex | 75 |
| gloop | Gloop | 175 |
| henry | Henry | 50 |
| venomora | Venomora | 75 |
| blocker | Blocker | 125 |
| fen | Fen | 100 |
| ben | Ben | 75 |
| freak | Freak | 125 |
| freak/forms/0 | Mini Freaks | 75 |
| nightprowler | Nightprowler | 100 |
| twins | Twins | 125 |
| bethe | Bethe | 75 |
| snaykies | Snaykies | 100 |
| soldier | Soldier | 50 |
| bees | Bees | 75 |
| hailey | Hailey | 100 |
| angels | Angels | 125 |
| boomix | Boomix | 100 |
| phewphew | PhewPhew | 75 |
| chrono-mage | Chrono Mage | 125 |
| aegis-guard | Aegis Guard | 75 |
| ironjaw | Ironjaw | 100 |
| m-manager | M-Manager | 100 |
| srail | Srail | 100 |
| cryon | Cryon | 150 |
| cow | Cow | 75 |
| trainer | Trainer | 75 |
| burglar | Burglar | 75 |
| stormblade | Stormblade | 125 |
| stacy | Stacy | 125 |
| death | Death | 150 |
| sylviana | Sylviana | 100 |
| sylviana/forms/0 | Butterflies | 75 |
| malvaris | Malvaris | 175 |
| malvaris/forms/0 | Phantomis | 100 |
| etheris | Etheris | 75 |
| magma | Magma | 100 |
| avalith | Avalith | 150 |
| far | Far | 125 |
| demotron | Demotron | 75 |
| format | Format | 175 |
| pyhsic | Pyhsic | 175 |
| naar | Naar | 150 |
| lyra | Lyra | 100 |
| aeralis | Aeralis | 75 |
| dark-necromancer | Dark Necromancer | 175 |
| dark-necromancer/forms/0 | Bladeknight | 75 |
| dark-necromancer/forms/1 | Stormbow | 50 |
| dark-necromancer/forms/2 | Ironhide | 75 |
| shine | Shine | 100 |
| bloodraider | Bloodraider | 125 |
| fallen-angel | Fallen Angel | 100 |
| worms | Worms | 75 |
| unara | Unara | 125 |
| ali | Ali | 150 |
| clara | Clara | 100 |
| artist | Artist | 175 |
| artist/forms/0 | Flock of Ravens | 0 |
| captain-vane | Captain Vane | 75 |
| spiritcaller | Spiritcaller | 175 |
| bolt | Bolt | 125 |
| bolt/forms/0 | Volt | 100 |
| radglic | Radglic | 150 |
| nancy | Nancy | 100 |
| veronica | Veronica | 125 |
| plauge | Plauge | 150 |
| witch | Witch | 125 |
| bro | Bro | 100 |
| tooni | Tooni | 125 |
| spinata | Spinata | 100 |
| erica | Erica | 150 |
