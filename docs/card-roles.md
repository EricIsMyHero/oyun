# Card class and subclass audit

All **176 root cards and 241 definitions** were reviewed individually against
current native ability prose, base stats and authored attack profiles. **157
class/subclass pairs changed**; 84 existing pairs were retained after review.
Previously, 57 records had no class and 73 had no subclass. Invalid placeholders
such as `Suicide Assassin`, `Ölü` and `-` are removed from current role fields.
Creature type remains a separate property.

Class identifies the primary battlefield job; subclass identifies its
specialization. Labels are English and never translate or rewrite native
Azerbaijani ability descriptions. Rarity, faction and a creature's appearance do
not determine its class. Durable fighters with no ambush or execution kit are
not classified as Assassins just because they use melee weapons. Summons,
upgrades, rebirth stages and Ethereal forms have their own explicit roles.

The JSON remains the live source for each assignment. The taxonomy is documented
in [card-roles.json](../data/card-roles.json); all original labels, new labels and
review reasons are preserved in [card-role-audit.json](../data/card-role-audit.json).
The Codex's Card Roles page explains the seven primary roles.

## Examples of corrected roles

| Card / form | Corrected role | Why |
| --- | --- | --- |
| Bastra, including partner upgrade | Marksman / Piercer | Ranged shield-piercing attacks; not a frontline tank. |
| Maapp, including partner upgrade | Mage / Debuffer | Radial attacks weaken enemy Damage. |
| Avara, including partner upgrade | Mage / Controller | Alternates area attacks, Slow, Knockback and Stun. |
| Cassandra | Support / Buffer | Predominance and allied Health growth are the central utility. |
| Etheris | Support / Guardian | Links defensive reserves rather than reflecting damage. |
| Stormblade | Fighter / Sweeper | Authored melee cone and chain damage; not a marksman. |
| Butterflies | Support / Healer | Death grants current and maximum allied Health; no suicide attack. |
| Phantomis | Fighter / Swarm | Sustained summoned melee fighters scale together. |
| Flock of Ravens | Specialist / Swarm | Healthless timed swarm, not a suicide assassin. |
| Bladeknight, Stormbow, Ironhide | Fighter / Piercer, Marksman / Igniter, Tank / Bulwark | Each summon has a combat role; Undead is a creature type. |
| Mr. and Mrs. Ray | Fighter / Sweeper or Fighter / Charger | Both selected forms fight in melee; they are not marksmen. |

## Behavior and compatibility

Only `class` and `subclass` change inside card definitions. All other source
fields, native abilities, stats, combat profiles, forms and Power values remain
identical. There are still 138 battle-ready roots and 38 roots with incomplete
battle data. Filling role labels does not invent combat facts or unlock those
cards automatically. Imported cards receive editorial roles based on the
available source mechanics, while missing combat geometry remains unspecified.

The archive and Arena role filters match either selectable Ethereal form.
For example, King appears under Support for Form I and Tank for Form II. The
unselected Arena tile lists the available role pairs; selecting a form displays
that form's role. Nested summons do not change the filter role of their parent
card. Root Ethereal labels follow their default first form.

Arena rendering and the existing bot may read the updated roles. No direct
combat-stat or native-ability changes are introduced. Survival's historical
fallback starting weapons are pinned independently of editorial role changes;
all 176 initial gameplay configurations remain identical apart from their
role labels. Explicit user-authored weapon assignments retain precedence.

Historical Book1/Book2 fingerprint tests restore only these authorized role
fields before checking their older snapshots. A new regression fixture protects
every other source field, every Power score and every Survival gameplay config.

## Class definitions and compatible subclasses

### Tank

Frontline durability, protection, engagement or sustained control.

- **Absorber** — Weakens nearby enemy attack power while gaining drained power.
- **Anchor** — Holds the frontline through defensive team synergy or repeated taunts.
- **Bulwark** — Relies on large defensive reserves or strong incoming-damage prevention.
- **Commander** — Combines a durable defensive presence with summoned reinforcements.
- **Igniter** — Adds repeated burning damage or leaves damaging fire zones.
- **Immortal** — Survives lethal damage through a conditional Immortal window.
- **Juggernaut** — Maintains prolonged offensive pressure through exceptional or growing durability.
- **Phaser** — Uses recurring conditional invulnerability windows to survive exchanges.
- **Protector** — Reduces damage suffered by nearby allies while occupying the frontline.
- **Reborn** — Survives or changes bodies through a rebirth lifecycle.
- **Regenerator** — Recovers Health or Shield over time or through sustained combat conditions.
- **Stunner** — Uses repeated stun effects to disrupt enemies at close range.
- **Vanguard** — Draws enemy attacks or initiates frontline control while sustaining itself.
- **Warden** — Contains enemies or repels threats through defensive crowd control.

### Fighter

Sustained close combat, dueling and offensive scaling.

- **Berserker** — Gains offensive power when Health or Shield is lost or a combat partner falls.
- **Bloodpact** — Trades its own Health for progressively increasing attack damage.
- **Brawler** — An all-round sustained close-combat fighter.
- **Breaker** — Deals increased damage to shields or shielded targets.
- **Bulwark** — Relies on large defensive reserves or strong incoming-damage prevention.
- **Burst** — Concentrates attack damage in volleys or heavy individual shots.
- **Charger** — Closes distance or rushes through targets with an empowered opening or dash.
- **Duelist** — Builds an advantage against a focused target or in isolated fights.
- **Flurry** — Alternates normal strikes with rapid multi-hit attack sequences.
- **Harvester** — Gains offensive strength or resources from deaths, souls or kills.
- **Piercer** — Bypasses shields or penetrates targets through the authored attack profile.
- **Poisoner** — Adds poison damage or toxin stacks to repeated attacks.
- **Rampager** — Increases attack damage with each successful damage event.
- **Reborn** — Survives or changes bodies through a rebirth lifecycle.
- **Regenerator** — Recovers Health or Shield over time or through sustained combat conditions.
- **Scavenger** — Converts enemy kills into Mana while fighting at close range.
- **Silencer** — Repeatedly prevents enemies from activating abilities.
- **Siphon** — Steals combat stats from enemies rather than relying on opening burst damage.
- **Skirmisher** — Combines close fighting with movement, repositioning or mobility-related growth.
- **Slayer** — Gains special damage advantages against durable targets or particular creature categories.
- **Snowballer** — Accumulates offensive bonuses through time, repeated success or kills.
- **Summoner** — Creates allied reinforcements or defensive summons as part of its combat plan.
- **Survivor** — Uses defensive triggers, reflection or body changes to stay in prolonged fights.
- **Swarm** — Fights through several fragile bodies or gains strength from related units.
- **Sweeper** — Deals close-range damage across arcs, circles or chained nearby targets.
- **Vampire** — Sustains itself through lifesteal or turns successful healing into offensive growth.

### Assassin

Ambushes, infiltration, diving or decisive execution attacks.

- **Ambusher** — Gains an opening advantage through concealment, surprise or enhanced first strikes.
- **Diver** — Reaches priority targets through leaps, charges or repeated passing attacks.
- **Executioner** — Uses critical opening strikes, finishing damage or instant-kill mechanics.
- **Infiltrator** — Enters an enemy body and deals damage from within.
- **Phantom** — Uses stealth and repositioning to escape or reset an engagement.

### Marksman

Repeated ranged weapon attacks, precision shooting and projectile pressure.

- **Artillery** — Projects heavy or broad attack damage, bombs or deployment strikes into an area.
- **Bleeder** — Applies bleeding damage and its associated healing denial.
- **Boomerang** — Damages enemies on outward and returning projectile paths.
- **Breaker** — Deals increased damage to shields or shielded targets.
- **Burst** — Concentrates attack damage in volleys or heavy individual shots.
- **Debuffer** — Reduces enemy combat effectiveness or increases the damage enemies receive.
- **Harvester** — Gains offensive strength or resources from deaths, souls or kills.
- **Igniter** — Adds repeated burning damage or leaves damaging fire zones.
- **Marker** — Marks multiple enemies to increase subsequent damage against them.
- **Overclocker** — Builds or triggers temporary attack-speed boosts through repeated attacks.
- **Piercer** — Bypasses shields or penetrates targets through the authored attack profile.
- **Poisoner** — Adds poison damage or toxin stacks to repeated attacks.
- **Repeller** — Keeps enemies at distance with repeated forced displacement.
- **Sharpshooter** — Maintains precise repeated ranged damage, often supported by critical hits.
- **Slayer** — Gains special damage advantages against durable targets or particular creature categories.
- **Sniper** — Uses long range, distance scaling or prepared precision shots to strike safely.
- **Snowballer** — Accumulates offensive bonuses through time, repeated success or kills.
- **Tracker** — Specializes in hunting selected enemy creature types.
- **Wanderer** — Converts movement or distance traveled into greater offensive strength.

### Mage

Ability-driven burst, area damage, damage over time or enemy control.

- **Bleeder** — Applies bleeding damage and its associated healing denial.
- **Controller** — Controls enemy movement or actions through roots, slows, stuns, taunts or imprisonment.
- **Deathcaller** — Threatens periodic lethal executions tied to the victim’s Health.
- **Debuffer** — Reduces enemy combat effectiveness or increases the damage enemies receive.
- **Elementalist** — Cycles through distinct elemental attacks with different status effects.
- **Enthraller** — Temporarily turns enemy cards against their original team.
- **Nuker** — Delivers concentrated ability volleys, bursts or chained area explosions.
- **Poisoner** — Adds poison damage or toxin stacks to repeated attacks.

### Support

Ally buffs, healing, protection, resources, vision or utility-focused disruption.

- **Buffer** — Strengthens nearby allies with offensive, mobility or beneficial status effects.
- **Disruptor** — Disables enemies or interferes with their actions, vision, resources or combat flow.
- **Guardian** — Protects allies through immunity or linked defensive reserves.
- **Healer** — Restores allied current Health, including paired current-and-maximum Health growth.
- **Resourcer** — Produces deployment resources for the team.
- **Scout** — Reveals or marks distant enemies to provide information.
- **Shieldbearer** — Grants or replenishes allied shields.

### Specialist

Distinct deployment, summoning, copying, transformation or expendable-unit mechanics.

- **Constructor** — Accumulates components to build a larger allied unit.
- **Disruptor** — Disables enemies or interferes with their actions, vision, resources or combat flow.
- **Mimic** — Copies an enemy body, weapon or combat statistics.
- **Possessor** — Takes temporary direct control of an enemy body.
- **Saboteur** — Trades an expendable body for an opening, death or one-off damage/debuff payload.
- **Splitter** — Splits into additional combat units when its original body dies.
- **Summoner** — Creates allied reinforcements or defensive summons as part of its combat plan.
- **Swarm** — Fights through several fragile bodies or gains strength from related units.
- **Transformer** — Selects or changes into a different combat form as its defining mechanic.
- **Trapper** — Waits for nearby enemies to trigger an area attack or control effect.
- **Trickster** — Steals an enemy’s native passive ability.

## Full review roster

| Key | Name | Before | After | Result |
| --- | --- | --- | --- | --- |
| azrith | Azrith | Support / Banner | Support / Buffer | Updated |
| azrith/forms/0 | Bannerox | — / — | Support / Buffer | Updated |
| untouch | Untouch | Tank / Phaser | Tank / Phaser | Retained |
| heartix | Heartix | Mage / Enthraller | Mage / Enthraller | Retained |
| r-1 | R-1 | Marksman / Piercer | Marksman / Burst | Updated |
| blank | Blank | Marksman / Snowballer | Marksman / Snowballer | Retained |
| magmara | Magmara | Tank / Igniter | Tank / Igniter | Retained |
| willowshade | Willowshade | Assassin / Reborn | Fighter / Piercer | Updated |
| willowshade/forms/0 | Octarion | — / — | Specialist / Saboteur | Updated |
| collector | Collector | Fighter / Scavenger | Fighter / Scavenger | Retained |
| sushu | Sushu | Assassin / Infiltrator | Assassin / Infiltrator | Retained |
| cloud | Cloud | — / — | Mage / Controller | Updated |
| cloud/forms/0 | Cloud (form 2) | — / — | Mage / Controller | Updated |
| cloud/forms/1 | Cloud (form 3) | — / — | Mage / Controller | Updated |
| thief | Thief | Specialist / Trickster | Specialist / Trickster | Retained |
| rotlings | Rotlings | Fighter / Harvester | Fighter / Harvester | Retained |
| rotlings/forms/0 | Mini Rotters | — / — | Support / Disruptor | Updated |
| esma | Esma | — / — | Fighter / Piercer | Updated |
| venom-fangs | Venom Fangs | Assassin / Siphon | Fighter / Siphon | Updated |
| skyhunter | Skyhunter | Marksman / Sniper | Marksman / Sniper | Retained |
| rockback | Rockback | Fighter / Charger | Fighter / Charger | Retained |
| neon-droid | Neon Droid | Marksman / Overclocker | Marksman / Overclocker | Retained |
| void-wraith | Void Wraith | Tank / Absorber | Tank / Absorber | Retained |
| bio-mech | Bio Mech | Support / Shieldbearer | Support / Shieldbearer | Retained |
| mixela | Mixela | Mage / Lifedrainer | Tank / Juggernaut | Updated |
| laura | Laura | Support / Empowerer | Support / Buffer | Updated |
| legendary-warrior | Legendary Warrior | — / — | Fighter / Duelist | Updated |
| lily | Lily | — / — | Specialist / Saboteur | Updated |
| radglic | Radglic | — / — | Marksman / Debuffer | Updated |
| arcanyx | Arcanyx | Mage / Nuker | Mage / Nuker | Retained |
| leafshade | Leafshade | Assassin / Executioner | Fighter / Vampire | Updated |
| jestro | Jestro | Specialist / Disruptor | Specialist / Disruptor | Retained |
| jestro/forms/0 | Cratex | Fighter / — | Specialist / Trapper | Updated |
| tphoenix | Tphoenix | Fighter / Reborn | Fighter / Reborn | Retained |
| tphoenix/forms/0 | Fire Egg | Tank / — | Tank / Reborn | Updated |
| tphoenix/forms/1 | Phoenix | Fighter / — | Fighter / Piercer | Updated |
| corsair-crew | Corsair Crew | Fighter / Survivor | Fighter / Survivor | Retained |
| corsair-crew/forms/0 | Pirate Girls | Marksman / — | Marksman / Sniper | Updated |
| ship-cannoneer | Ship Cannoneer | Marksman / Burst | Marksman / Burst | Retained |
| toxic | Toxic | Marksman / Sharpshooter | Marksman / Poisoner | Updated |
| lumina | Lumina | Tank / Pure | Tank / Juggernaut | Updated |
| hell-boy | Hell boy | Fighter / Brawler | Fighter / Slayer | Updated |
| slasherx | SlasherX | Assassin / Reaper | Assassin / Executioner | Updated |
| sheriff | Sheriff | Marksman / Marker | Marksman / Marker | Retained |
| nurse | Nurse | Assassin / Vampire | Fighter / Vampire | Updated |
| tribe | Tribe | Fighter / Burst | Fighter / Burst | Retained |
| earthshakers | Earthshakers | Tank / Stunner | Tank / Stunner | Retained |
| whisper | Whisper | Specialist / Possessor | Specialist / Possessor | Retained |
| roguex | RogueX | Marksman / Absorber | Marksman / Debuffer | Updated |
| void-striker | Void Striker | Fighter / Berserker | Fighter / Burst | Updated |
| nightfang | Nightfang | Marksman / Sharpshooter | Marksman / Sniper | Updated |
| sunrise | Sunrise | Fighter / Regenerator | Fighter / Regenerator | Retained |
| shellbyte | Shellbyte | Fighter / Ambusher | Assassin / Diver | Updated |
| wong | Wong | Fighter / Juggernaut | Fighter / Brawler | Updated |
| umbra | Umbra | Assassin / Phantom | Assassin / Phantom | Retained |
| leader | Leader | — / — | Fighter / Snowballer | Updated |
| hostess | Hostess | — / — | Fighter / Skirmisher | Updated |
| mystic-magician | Mystic Magician | — / — | Mage / Elementalist | Updated |
| kitsune | Kitsune | — / — | Specialist / Saboteur | Updated |
| mertel | Mertel | — / — | Fighter / Vampire | Updated |
| nancy | Nancy | — / — | Fighter / Charger | Updated |
| veronica | Veronica | — / — | Support / Shieldbearer | Updated |
| reacher | Reacher | Tank / Anchor | Tank / Anchor | Retained |
| reacher/upgradedsecondForm | Reacher | Suicide Assassin / — | Tank / Anchor | Updated |
| bastra | Bastra | Tank / Vanguard | Marksman / Piercer | Updated |
| bastra/upgradedsecondForm | Bastra | Suicide Assassin / — | Marksman / Piercer | Updated |
| maapp | Maapp | Tank / Warden | Mage / Debuffer | Updated |
| maapp/upgradedsecondForm | Maapp | Suicide Assassin / — | Mage / Debuffer | Updated |
| avara | Avara | Tank / Controller | Mage / Controller | Updated |
| avara/upgradedsecondForm | Avara | Suicide Assassin / — | Mage / Controller | Updated |
| john-reynolds | John Reynolds | Tank / Anchor | Tank / Anchor | Retained |
| john-reynolds/upgradedsecondForm | John Reynolds | Suicide Assassin / — | Tank / Anchor | Updated |
| atlas | Atlas | — / — | Mage / Controller | Updated |
| atlas/upgradedsecondForm | Atlas | — / — | Mage / Controller | Updated |
| great-stan | Great Stan | — / — | Marksman / Bleeder | Updated |
| great-stan/upgradedsecondForm | Great Stan | — / — | Marksman / Bleeder | Updated |
| marcy | Marcy | — / — | Fighter / Vampire | Updated |
| marcy/upgradedsecondForm | Marcy | — / — | Fighter / Vampire | Updated |
| shield-maiden | Shield Maiden | — / — | Support / Shieldbearer | Updated |
| shield-maiden/upgradedsecondForm | Shield Maiden | — / — | Support / Shieldbearer | Updated |
| shockwave | ShockWave | — / — | Mage / Controller | Updated |
| shockwave/upgradedsecondForm | ShockWave | — / — | Mage / Controller | Updated |
| xii-josh | XII Josh | — / — | Fighter / Skirmisher | Updated |
| dumpsy | Dumpsy | — / — | Tank / Juggernaut | Updated |
| blesser | Blesser | — / — | Support / Buffer | Updated |
| js | JS | — / — | Marksman / Debuffer | Updated |
| mimic | Mimic | — / — | Specialist / Mimic | Updated |
| the-seven-sins | The Seven Sins | Specialist / Emergent Vessel | Specialist / Transformer | Updated |
| the-seven-sins/forms/0 | Pride | Tank / Prideful | Fighter / Duelist | Updated |
| the-seven-sins/forms/1 | Greed | Marksman / Hoarder | Tank / Regenerator | Updated |
| the-seven-sins/forms/2 | Lust | Support / Enthraller | Tank / Warden | Updated |
| the-seven-sins/forms/3 | Envy | Assassin / Mirror | Specialist / Mimic | Updated |
| the-seven-sins/forms/4 | Gluttony | Tank / Devourer | Tank / Bulwark | Updated |
| the-seven-sins/forms/5 | Wrath | Fighter / Berserker | Fighter / Berserker | Retained |
| the-seven-sins/forms/6 | Sloth | Tank / Dormant | Tank / Regenerator | Updated |
| the-seven-sins/forms/7 | Human | Fighter / Human | Fighter / Brawler | Updated |
| stella | Stella | — / — | Marksman / Artillery | Updated |
| huang-chen | Huáng-chén | — / — | Tank / Regenerator | Updated |
| servant | Servant | — / — | Support / Disruptor | Updated |
| survivor | Survivor | — / — | Fighter / Harvester | Updated |
| little-princess | Little Princess | — / — | Fighter / Snowballer | Updated |
| three-wise-monkeys | Three Wise Monkeys | — / — | Support / Disruptor | Updated |
| plauge | Plauge | — / — | Mage / Debuffer | Updated |
| ase | Ase | Marksman / Constructor | Specialist / Constructor | Updated |
| ase/type1 | Ase | Marksman / Constructor | Specialist / Constructor | Updated |
| ase/type1/forms/0 | Giga-R | Tank / Bulwark | Tank / Bulwark | Retained |
| ase/type2 | Ase | Marksman / Constructor | Specialist / Constructor | Updated |
| ase/type2/forms/0 | Giga-R | Marksman / Ravager | Marksman / Snowballer | Updated |
| leno | Leno | Marksman / Sharpshooter | Marksman / Sharpshooter | Retained |
| leno/type1 | Leno | Marksman / Sharpshooter | Marksman / Sharpshooter | Retained |
| leno/type2 | Leno | Marksman / Slayer | Marksman / Slayer | Retained |
| king | King | Tank / Monarch | Support / Buffer | Updated |
| king/type1 | King | Tank / Monarch | Support / Buffer | Updated |
| king/type2 | King | Tank / Warden | Tank / Commander | Updated |
| king/type2/forms/0 | Guard | Fighter / Breaker | Fighter / Breaker | Retained |
| dracula | Dracula | Fighter / Vampire | Fighter / Vampire | Retained |
| dracula/type1 | Dracula | Fighter / Vampire | Fighter / Vampire | Retained |
| dracula/type2 | Dracula | Fighter / Undying | Fighter / Survivor | Updated |
| dracula/type2/forms/0 | Bats | Marksman / Swarmer | Fighter / Swarm | Updated |
| leila | Leila | Marksman / Trapper | Marksman / Artillery | Updated |
| leila/type1 | Leila | Marksman / Trapper | Marksman / Artillery | Updated |
| leila/type2 | Leila | Marksman / Bleeder | Marksman / Bleeder | Retained |
| lord | Lord | Tank / Immortal | Tank / Immortal | Retained |
| lord/type1 | Lord | Tank / Immortal | Tank / Immortal | Retained |
| lord/type2 | Lord | Tank / Warlord | Tank / Commander | Updated |
| lord/type2/forms/0 | Rider | Fighter / Berserker | Fighter / Berserker | Retained |
| hunter | Hunter | Marksman / Tracker | Marksman / Tracker | Retained |
| hunter/type1 | Hunter | Marksman / Tracker | Marksman / Tracker | Retained |
| hunter/type1/forms/0 | Wolf | Tank / Ripper | Fighter / Breaker | Updated |
| hunter/type2 | Hunter | Marksman / Tracker | Marksman / Tracker | Retained |
| hunter/type2/forms/0 | Eagle | Marksman / Piercer | Fighter / Piercer | Updated |
| soul-master | Soul Master | Marksman / Reaper | Marksman / Harvester | Updated |
| soul-master/type1 | Soul Master | Marksman / Reaper | Marksman / Harvester | Updated |
| soul-master/type2 | Soul Master | Marksman / Harvester | Marksman / Harvester | Retained |
| mr-and-mrs-ray | Mr. and Mrs. Ray | Marksman / Twinshot | Fighter / Sweeper | Updated |
| mr-and-mrs-ray/type1 | Mr. Ray | Marksman / Twinshot | Fighter / Sweeper | Updated |
| mr-and-mrs-ray/type1/forms/0 | Mrs. Ray | Tank / Twinshot | Fighter / Sweeper | Updated |
| mr-and-mrs-ray/type2 | Mr. Ray | Marksman / Twinshot | Fighter / Charger | Updated |
| mr-and-mrs-ray/type2/forms/0 | Mrs. Ray | Marksman / Twinshot | Fighter / Charger | Updated |
| dragon | Dragon | — / — | Mage / Debuffer | Updated |
| dragon/type1 | Dragon (Light) | — / — | Mage / Debuffer | Updated |
| dragon/type2 | Dragon (Dark) | — / — | Mage / Debuffer | Updated |
| albert | Albert | Fighter / Berserker | Fighter / Duelist | Updated |
| chicken | Chicken | Assassin / Suicide | Specialist / Saboteur | Updated |
| frostshot | Frostshot | Marksman / Sniper | Marksman / Sniper | Retained |
| hornets | Hornets | Fighter / Bulwark | Fighter / Bulwark | Retained |
| warborn | Warborn | Fighter / Brawler | Tank / Regenerator | Updated |
| x-bot | X-Bot | Fighter / Brawler | Fighter / Brawler | Retained |
| nyra | Nyra | Marksman / Wanderer | Marksman / Wanderer | Retained |
| deadscope | Deadscope | Marksman / Sharpshooter | Marksman / Sniper | Updated |
| turtle | Turtle | Tank / Regenerator | Tank / Regenerator | Retained |
| turtle/forms/0 | Mini Turtles | Fighter / — | Fighter / Berserker | Updated |
| feral-wolf | Feral Wolf | Assassin / Ambusher | Assassin / Ambusher | Retained |
| trac | Trac | Tank / Brawler | Tank / Juggernaut | Updated |
| tornado | Tornado | Specialist / Disruptor | Specialist / Disruptor | Retained |
| dino | Dino | Fighter / Rampager | Fighter / Rampager | Retained |
| tenta | Tenta | Specialist / Multistriker | Mage / Controller | Updated |
| fire-archer | Fire Archer | Marksman / Burst | Marksman / Burst | Retained |
| shadow-reaper | Shadow Reaper | Assassin / Executioner | Assassin / Executioner | Retained |
| voltriker | Voltriker | Mage / Nuker | Mage / Nuker | Retained |
| frostmaw | Frostmaw | Fighter / Silencer | Fighter / Silencer | Retained |
| hexon | Hexon | Mage / Controller | Mage / Controller | Retained |
| mecha-shield | Mecha Shield | Tank / Pure | Tank / Protector | Updated |
| venomspikes | Venomspikes | Assassin / Poisoner | Fighter / Poisoner | Updated |
| astranova | Astranova | Mage / Nuker | Mage / Nuker | Retained |
| kai | Kai | Fighter / Brawler | Fighter / Brawler | Retained |
| cassandra | Cassandra | Fighter / Brawler | Support / Buffer | Updated |
| dr-golbert | Dr. Golbert | — / — | Specialist / Disruptor | Updated |
| indi | Indi | — / — | Mage / Bleeder | Updated |
| punchman | Punchman | — / — | Fighter / Snowballer | Updated |
| witch | Witch | — / — | Assassin / Diver | Updated |
| bro | Bro | — / — | Tank / Juggernaut | Updated |
| tooni | Tooni | — / — | Mage / Controller | Updated |
| spinata | Spinata | — / — | Fighter / Vampire | Updated |
| hammies | Hammies | Fighter / Skirmisher | Fighter / Skirmisher | Retained |
| b-b | B-B | Tank / Brawler | Tank / Bulwark | Updated |
| scrapy | Scrapy | Marksman / Piercer | Marksman / Piercer | Retained |
| nitrox | Nitrox | Support / Buffer | Support / Buffer | Retained |
| nortex | Nortex | Marksman / Stacker | Marksman / Burst | Updated |
| gloop | Gloop | Tank / Pure | Tank / Warden | Updated |
| henry | Henry | Fighter / Berserker | Fighter / Slayer | Updated |
| venomora | Venomora | Mage / Controller | Mage / Controller | Retained |
| blocker | Blocker | Tank / Protector | Tank / Protector | Retained |
| fen | Fen | Fighter / Blinder | Marksman / Debuffer | Updated |
| ben | Ben | Fighter / Bleeder | Marksman / Bleeder | Updated |
| freak | Freak | Specialist / Splitter | Specialist / Splitter | Retained |
| freak/forms/0 | Mini Freaks | Assassin / Suicide | Specialist / Saboteur | Updated |
| nightprowler | Nightprowler | Assassin / Executioner | Assassin / Ambusher | Updated |
| twins | Twins | Fighter / Berserker | Fighter / Berserker | Retained |
| bethe | Bethe | Assassin / Ravager | Fighter / Snowballer | Updated |
| snaykies | Snaykies | Assassin / Poisoner | Fighter / Poisoner | Updated |
| soldier | Soldier | Marksman / Burst | Marksman / Burst | Retained |
| bees | Bees | Assassin / Suicide | Specialist / Saboteur | Updated |
| hailey | Hailey | Fighter / Berserker | Fighter / Sweeper | Updated |
| angels | Angels | Specialist / Swarm | Specialist / Swarm | Retained |
| boomix | Boomix | Marksman / Piercer | Marksman / Boomerang | Updated |
| phewphew | PhewPhew | Marksman / Breaker | Marksman / Breaker | Retained |
| chrono-mage | Chrono Mage | Mage / Debuffer | Support / Buffer | Updated |
| aegis-guard | Aegis Guard | Tank / Protector | Tank / Protector | Retained |
| ironjaw | Ironjaw | Assassin / Vampire | Fighter / Vampire | Updated |
| m-manager | M-Manager | Support / Resourcer | Support / Resourcer | Retained |
| srail | Srail | Marksman / Sharpshooter | Marksman / Sharpshooter | Retained |
| cryon | Cryon | Specialist / Stunner | Mage / Controller | Updated |
| cow | Cow | — / — | Tank / Juggernaut | Updated |
| trainer | Trainer | — / — | Tank / Warden | Updated |
| burglar | Burglar | — / — | Mage / Poisoner | Updated |
| stormblade | Stormblade | Marksman / Splasher | Fighter / Sweeper | Updated |
| erica | Erica | — / — | Mage / Controller | Updated |
| stacy | Stacy | Marksman / Burst | Marksman / Igniter | Updated |
| death | Death | Fighter / Harvester | Fighter / Harvester | Retained |
| sylviana | Sylviana | Specialist / Summoner | Specialist / Summoner | Retained |
| sylviana/forms/0 | Butterflies | Suicide Assassin / — | Support / Healer | Updated |
| malvaris | Malvaris | Fighter / Summoner | Fighter / Summoner | Retained |
| malvaris/forms/0 | Phantomis | Suicide Assassin / — | Fighter / Swarm | Updated |
| etheris | Etheris | Tank / Reflector | Support / Guardian | Updated |
| magma | Magma | Tank / Igniter | Tank / Igniter | Retained |
| avalith | Avalith | Marksman / Evader | Marksman / Boomerang | Updated |
| far | Far | Marksman / Disabler | Specialist / Disruptor | Updated |
| demotron | Demotron | Tank / Regenerator | Tank / Regenerator | Retained |
| format | Format | Specialist / Mimic | Specialist / Mimic | Retained |
| pyhsic | Pyhsic | Mage / Deathcaller | Mage / Deathcaller | Retained |
| naar | Naar | Mage / Nuker | Mage / Nuker | Retained |
| lyra | Lyra | Fighter / Flurry | Fighter / Flurry | Retained |
| aeralis | Aeralis | Marksman / Repeller | Marksman / Repeller | Retained |
| dark-necromancer | Dark Necromancer | Fighter / Summoner | Specialist / Summoner | Updated |
| dark-necromancer/forms/0 | Bladeknight | - / — | Fighter / Piercer | Updated |
| dark-necromancer/forms/1 | Stormbow | Ölü / — | Marksman / Igniter | Updated |
| dark-necromancer/forms/2 | Ironhide | Ölü / — | Tank / Bulwark | Updated |
| shine | Shine | Support / Healer | Support / Healer | Retained |
| bloodraider | Bloodraider | Assassin / Bloodpact | Fighter / Bloodpact | Updated |
| fallen-angel | Fallen Angel | Assassin / Hunter | Fighter / Duelist | Updated |
| worms | Worms | Assassin / Ambusher | Assassin / Ambusher | Retained |
| unara | Unara | Mage / Bomber | Mage / Nuker | Updated |
| ali | Ali | Support / Guardian | Support / Guardian | Retained |
| clara | Clara | Specialist / Screamer | Tank / Vanguard | Updated |
| artist | Artist | Specialist / Summoner | Specialist / Summoner | Retained |
| artist/forms/0 | Flock of Ravens | Suicide Assassin / — | Specialist / Swarm | Updated |
| captain-vane | Captain Vane | — / — | Support / Scout | Updated |
| spiritcaller | Spiritcaller | — / — | Specialist / Summoner | Updated |
| bolt | Bolt | — / — | Fighter / Charger | Updated |
| bolt/forms/0 | Volt | — / — | Fighter / Charger | Updated |
