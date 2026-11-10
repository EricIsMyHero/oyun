# Clash-A-Mana Arena

The standalone game lives at **`arena/index.html`**. Serve the repository over
HTTP and open `/arena/`; it also works beneath a project subdirectory, such as
`/oyun/arena/`. It has no build step, backend, account requirement or multiplayer
service. The opponent is a local tactical bot.

The original Codex, turn-based Battle Arena and Survival entry points remain
separate. Arena loads the same card and spell JSON files without changing them.
New controls and labels are English. Authored ability descriptions retain their
original language; they are not translated at runtime.

## Arena artwork

The forest uses shaded evergreen and broadleaf canopies, soft ground shadows,
mossy boulders, ferns and small mushrooms. Roads have individually shaded paving
stones; riverbanks and cliff faces carry layered rock and vegetation. Citadels
use cut-stone masonry, tiled roofs, warm windows and orbiting crystal light.
Mana wells have luminous liquid, rising bubbles and engraved capture rings.

Unit portraits sit in metallic team-colored frames. Moving units step, archers
carry bows, heavy fighters carry hammers, and mages have illuminated staves.
Shield halos, frozen portraits, poison and fire motes make combat status easier
to read. Projectiles leave light trails, impacts scatter sparks and melee arcs
follow the attack direction. Command panels use matching brass and glass shading.

Scenery is drawn once into a cached terrain atlas, so panning and zooming reuse
the artwork. Card portraits are cropped into small cached textures once after
loading; terrain blits use only the visible atlas region. The scenery generator
has its own deterministic seeds; drawing does not advance combat or change any
card statistics. Fog covers the final world
image, including every new light and particle effect. Artwork is procedural and
requires no additional external image service.

## Match rules

| Rule | Value |
| --- | --- |
| Unit deck | Eight different root cards |
| Hand | Four cards; a successful deployment moves its card to the back of the queue |
| Spell deck | Combined Charge must be at most five |
| Active spell | One at a time; a successful cast advances to the next equipped spell |
| Starting mana | 12 |
| Maximum mana | 20 |
| Mana recovery | One mana every 1.3 seconds |
| Starting spell energy | Zero |
| Spell energy limit | No separate cap |
| Paid deployment reward | `Math.round((manaSpent / 18) * 20) / 20` energy |
| Castle | 1,000 health, 25 damage every second, 7.5-tile range, ground and air targets |
| Regulation | Five minutes |
| Overtime | Two minutes if both castles survive regulation; mana recovery doubles |
| Victory | Destroy the opposing castle, or retain more castle health at the end of overtime |
| Draw | Equal castle health after overtime, or both castles destroyed in the same simulation step |

For example, spending 18 mana on a deployment earns one energy; spending 17
earns 0.95. Rounding happens for each successful deployment. Summons and free
transformations do not produce energy. Failed placement, cancellation and an
unaffordable action do not spend resources or advance either queue.

Energy pays the active spell's **Energy** price. **Charge** is deck capacity,
not mana, a casting delay, a cooldown, or a limited number of casts. Two spells
with Charge two fit together; a Charge-five spell fills the complete capacity.
Spells can be used again when their turn returns and sufficient energy exists.

## Three-route battlefield

The original illustrated map places the Azure Core castle at the southwest and
the Crimson Crown castle at the northeast. The central road and two outer roads
connect them through a forest island with rivers, cliffs and three crystal wells.
The battlefield spans **43 × 28 world tiles**, with castles at `(4,14)` and
`(39,14)`. The central road is a **straight 35-tile route**; its well is exactly
**17.5 walking tiles from either castle**. Each outer forest road is about
**46.46 tiles** long, placing its well about **23.23 walking tiles from either
castle**. Outer roads intentionally take longer routes; the center is not bent
to equalize travel times. World coordinates remain independent of the isometric
screen projection.

Deploy units and spell buildings only on roads or your castle courtyard **within
7.5 tiles of the castle centre**. The courtyard has **one tile of clear space
behind the castle body and 2.5 tiles ahead**, facing the opposing castle, plus a
one-tile side margin. Rear and front clearances are walkable and deployable;
the castle body and occupied building footprints remain blocked. The deployment
radius does not make surrounding forest walkable. Capturing a well does not
unlock an extra deployment zone; normal spells retain their usual target areas.

The castle acquires visible ground or flying targets whose center is within
7.5 tiles. Its shots track that target through lateral movement, rather than
continuing toward an outdated position. Shots remain inside the 7.5-tile radial
boundary and expire if their target dies, becomes concealed or leaves range;
they cannot switch to another unit. The same rules apply to both teams.

Each well takes **five uncontested seconds** to capture within its 1.25-tile
radius. Living units, including flying units and summons, can capture; buildings
cannot. Contested progress pauses. If the attacker leaves, its progress resets.
Ownership remains until an opponent finishes a capture. Each owned well adds
**2% mana recovery speed**, up to 6%; overtime doubles the resulting recovery.

All units advance along the corridor where they were deployed. Flying units
follow its bends, engage valid enemies they encounter, and return to that
corridor after pursuit. They can fly over terrain while engaging. Hovering units
follow the ground routes but ignore ground-only effects. Target layers and
ground immunity remain independent: a hovering unit belongs to the ground layer.

Gloop engulfs eligible enemy cards on body contact. Captives travel inside it,
cannot move, attack, scout, or contest wells, and receive Gloop's current Damage
at its current Attack Speed. Their sprites disappear; Gloop displays a captive
count, and its inspector lists the held cards. Outside attacks cannot hit them.
Cleanse releases a captive, and Predominance prevents engulfing. Surviving cards
are released onto the road when Gloop falls, before its existing 150-damage
death explosion. Silence pauses engulfing and digestion but never blocks release.
Gloop lives at most **100 seconds**, losing **1% of its maximum health each
second** regardless of shields, damage reduction, or combat immunities. Healing
can offset that health loss but cannot extend its lifetime. Pausing the match
freezes both clocks. Native ability text remains Azerbaijani.

## Fog of war and scouting

The battle camera shows a close portion of the island. Drag with a mouse or
swipe with one finger to move it; a short click/tap places the selected card or
inspects a visible unit. Dragging the battlefield never deploys a card, even
while one is selected. Cards can also be dragged from the hand onto the map.
Scroll or use **WASD / arrow keys** to pan. **Home / Space**, or the citadel
button beside the minimap, returns to your castle. Click or drag the minimap
to travel directly to another area; its frame shows your current viewport.

Use the **+ / −** buttons (or keyboard keys) to step through **100%, 90%, 80%,
75%, 70%, 60%, and 50%** when zooming out. Zooming in can continue to 120%, 140%,
and 160%. Ctrl/Command plus the mouse wheel uses the same steps around the
pointer. Even the widest battle setting requires panning. Resizing retains your
camera focus and zoom. Starting or
restarting a match restores the home camera; the lobby shows the complete island.
Camera movement does not alter combat positions, deployment range or team sight.

Battles use current team vision, with **opaque black fog** outside all friendly
vision sources:

| Vision source | Reveal radius |
| --- | --- |
| Living allied card | 8 tiles |
| Artist raven | 4 tiles |
| Owned crystal well | 4 tiles |
| Living allied castle | 7.5 tiles |

The castle supplies starting vision before the first card is deployed. Each
team's visible area is the union of its source circles. There is no permanent
explored-map memory: an area returns to black immediately after its last vision
source leaves, dies or changes owner. These scouting radii are separate from
individual cards' authored Vision and Range combat stats. Artist's timed raven form explicitly overrides scouting to four tiles.

Enemies outside current vision are not drawn, targetable or inspectable. Normal
invisibility, untargetability and imprisonment also conceal enemies according to
their active status. Hidden enemy castle health is shown as `?`, its health bar
is empty, and unseen well ownership and capture progress are not disclosed.
Friendly units remain inspectable. Placement previews do not use concealed enemy
occupancy to expose their positions. Spells may still be aimed at unseen ground;
casting does not by itself reveal the area or produce hidden-enemy UI reports.
Fog and invisibility prevent acquired targets, not incidental projectile hits or
area damage. A cone, splash, damage field or blind skillshot can still hit an
unseen enemy without revealing the ground around it.

The bot uses its own team vision for enemy-aware decisions. The illustrated lobby
preview shows the full arena before battle; match results may show final castle
health after the battle has ended. This is a local single-player simulation, not
a server security boundary; UI and simulation consumers share the same sight
predicates rather than implementing separate reveal rules.
The minimap uses that same current sight: enemy markers, well ownership and
terrain outside vision remain hidden there too. Moving the camera into fog
does not reveal that area. Static terrain is cached separately from the camera
so scrolling does not regenerate the illustrated forest.

## Emergent deployment progression

The seven Emergent roots use the authored geometry from `rarity/emergent.json`.
Each player has an independent counter for each root card. A counter advances
only after a successful, paid deployment: failed placements, summons and clones
do not advance it. Every body in one paid formation receives the same ordinal.
Counters reset each match. Third/fifth/even-deployment enhancements apply only
to the matching placements, rather than becoming permanent account upgrades.
The hand and inspector show placement ordinals and the relevant live state.

- **XII Josh:** one hovering body with a 1000-point-wide, 1000-point
  attack. Only enemy Mana in a centered 2 × 2 square grants haste: half the summed
  Mana in percentage points. Falling below 10% Health triggers ten seconds of
  flight, followed by a 24-Damage landing in 1.5 × 1.5 tiles. Landing still ends
  flight under Silence, but Silence prevents its damage. Every third deployment
  gains a 33% on-hit chance to apply 15% Misfortune indefinitely; Cleanse works.
- **Dumpsy:** three non-throwable inner objects orbit on a 0.90s weapon cycle.
  Deaths generate collectible outer objects, capped at twelve, which can be
  thrown at most once per 1.15s. Basic orbital weapons continue under Silence;
  passive growth and elemental applications do not. Consecutive successful hits
  on one target compound +5% Damage without an authored cap. Every even
  deployment gives each new object a 25% chance of a random element: three
  seconds of 25% Slow, a 7 × 2 Poison packet or a 3 × 5 Burn packet. Objects have
  a 500-point width/travel profile; the source targeting ranges remain 1 / 3.2
  tiles. There are no stored instant volleys after a long period without loot.
- **Blesser:** the 1000-wide, 2000-distance cone is **45°**. It prepares for
  twelve seconds without moving or attacking. During that preparation it locks
  the highest-Power ally within twelve tiles and channels for three seconds
  before granting one random blessing. Power uses the shared Codex score rather
  than current Health. Losing the target restarts the channel on a new ally;
  control effects pause progress. A gold tether, outline and progress ring mark
  the selection, followed by a five-second Blessed icon and confirmation burst. Tier I/II/III grant
  20/22.5/25% all-stat bonuses, 25/28.5/32% of maximum Health as Shield, or a
  1.75-square trap with 2/3/4s Stun and three-tile Knockback. Tier III is the cap.
  Stat blessings exclude Mana, Count and Life; attack/delay intervals improve
  in the correct direction and percentage chances retain their normal caps.
  Blessed Shield retaliates with one second of Bleeding when its layer is hit.
- **JS:** eight-second Curse increases incoming damage by 25%, or 75% for every
  fifth deployment. Each currently missing 2% Health grants 25 points / 0.025
  tiles of Range. Healing removes the corresponding conditional Range bonus.
- **Mimic:** a 75° cone, width 1000 and travel 2750. Each victim can produce at
  most two permanent clones: one for its first shield break and one after
  Mimic's cumulative Health damage reaches 20% of that victim's maximum Health.
  Clones retain native abilities, with Health, Shield and Damage reduced 30%.
  Every third deployment grants permanent Predominance and 50% negative-status
  reflection. Reflections cannot recursively reflect one another. Whisper's
  priority possession remains unbreakable and receives its existing penalty.
- **The Seven Sins:** a 1% Human roll, otherwise an equally likely one of the
  seven manifestations. Human has 100 Health, 100 Shield, 10 Damage, a one-second
  attack, 500/500 geometry and no passive. Pride, Greed, Lust, Envy, Gluttony,
  Wrath and Sloth use their native rules. Greed drains current Health and grows
  both Health caps on deaths. Lust applies Taunt in a 3 × 3 square and bonds to
  a weak ally, with a two-second rebind delay. Envy copies burst count/damage,
  interval, delay and Range rather than creature type. It restores its base
  weapon under Silence. Native manifestation rolls never advance deployments.
- **Stella:** a fixed 20-Damage landing in 1.5 × 1.5 tiles, followed by a visible
  two-tile-wide glider dealing 12 Damage over three tiles. Starting with the
  second deployment, only glider Damage and travel gain 10% per placement,
  capped at +50%. Ordinary seven-shot attacks retain their 500/500 geometry.

## Ethereal forms

All nine Ethereal roots have two complete, selectable forms. Choose an available
form in the card inspector before adding the card to the deck. The selection is
saved with the deck and may be changed before battle. The chosen form's exact
stats, class, native passive and summons are used for every deployment of that
root in the match. Combat cannot change the choice. The bot chooses legal forms
for its independently generated deck; it does not copy the player's choices.

- **Ase:** gains one part each seven seconds and spends four to summon the
  selected Giga-R every 28 seconds. Form II has 2500-point Range and 1050-point
  Speed (2.5 tiles and 1.05 tiles/s); its melee strike distance stays 500 points.
  Form I's melee robot has 22s of 10% protection;
  Form II's ranged robot gains 3% haste per kill, capped at +30%.
- **Leno:** both forms target ground. Form I gains +45 Critical Chance for 25s,
  then +15. Form II has 1000-point Range and +40% Damage against the six listed
  non-Human creature types. Both use 500/500 projectile geometry.
- **King:** both forms use 1000/1000, 180° cones. Form I grants nearby allies
  25% haste. Stationary Form II calls one Guard every twelve seconds and gains
  two seconds of 15% protection. Guards deal +30% Damage to shielded enemies.
- **Dracula:** Form I hovers and steals up to 25 additional Lifesteal Chance
  points, reaching 50% with its original 25%. Flying Form II gains five Damage
  Reduction points per missing 10% Health and creates ten very-light flying Bats
  on death. Each Bat's first landed strike deals +40% Damage.
- **Leila:** Form I throws a 12-Damage, 3 × 3 bomb after 24 successful bullets,
  inflicting four seconds of 12.5% Blind. Form II explodes in 1 × 1 tiles; each
  fifth strike expands to 1.2 × 1.2 and applies eight seconds of Bleeding.
- **Lord:** Form I triggers five seconds of Immortal once per deployment below
  5% Health, including a lethal crossing, then heals a quarter of the Health
  missing at that instant over five pulses. Form II regenerates one Health each
  second and summons up to five Riders from 10% Health-loss thresholds. Riders
  permanently gain 50% Damage when their Shield first breaks.
- **Hunter:** Form I targets ground and deals +60% to Animals, becoming Wolf on
  death. Form II deals +50% to Humans and becomes a flying Eagle. Wolf hits
  shields harder; Eagle bypasses Shield. These are native death summons, not
  changes to the selected prematch form.
- **Soul Master:** deaths grant souls. Form I gains +25% Damage per ten souls;
  Form II spends eight souls to deal 10% of a frontal target's maximum Health.
- **Mr. and Mrs. Ray:** each form deploys its matching couple. Within 2.5 tiles
  measured between their centers, both gain six charge/s in either form. Both
  partners in each form have 1250-point normal attack width. At 100 each, the
  couple holds its charge until a visible, hittable enemy troop is in the fusion
  leader's effective attack Range. Buildings, castles, healthless units and
  targets excluded by their ground targeting cannot trigger it. Blind and Taunt
  also apply. Form I
  fuses into one target for five seconds, sharing summed Health while retaining
  individual shields. Twenty quarter-second pulses deal five Damage and heal
  three; protection is 25%. Splitting preserves the pooled Health fraction.
  Form II also fuses into one body with shared Health, then aims toward the
  selected enemy and advances up to five tiles in 3.75s through a two-tile-wide
  corridor. Each crossed enemy takes 75 total
  Damage once, with 75% protection during the dash. Below 20% shared Health, the
  pair may heal 75% of missing Health once per deployment. The dash crosses troop
  bodies but stops at the first road or courtyard boundary. The corridor preview
  uses that shortened travel distance, and the fusion still lasts 3.75s. A blocked
  dash that cannot move does not spend charge. Fusion cleanup handles deaths and control
  changes without leaving hidden bodies or shared Health behind. Ground fields
  affect the merged body once; existing ailments on either partner continue
  against shared Health with the fusion's protection.

The original 193 definitions include the authored Human manifestation. With the
Book2 import, the Codex now contains 232 definitions across 167 root cards.
Missing
Shield-absorption values use the game's standard 70%; authored zeroes remain
zero. Source DPS remains informational. Native abilities stay Azerbaijani.
Original Power scoring is unchanged; regression baselines restore only the
explicitly rebalanced original stats when checking historical scores.

## Apex cards

The original 21 Apex roots and their reachable forms remain battle-ready,
including Stormblade (now Mundane) and Umbra (now Arcane). Projectile width,
attack travel distance and targeting Range remain independent, using 1000 points
per tile. Stormblade has 1.2-tile Range and 2.5-tile attack distance. Blank uses a
0.75-tile line; Willowshade and Collector use 125° and 75° cones. Heartix explodes
in a 1.5 × 1.5 square. Neon Droid flies; Venom Fangs can target ground and air.

- **R-1:** each completed three-bullet series rolls once at 3% to enhance the
  next series. Every bullet of that series gains 10% Damage, triple width
  (0.5 → 1.5 tiles), and double Range (2.3 → 4.6 tiles). Gold projectiles show
  the larger size. Canceled bursts lose their active enhancement. Silence stops
  enhancement. The old shield bypass and Human damage reduction are removed.
- **Azrith / Bannerox:** centered 2 × 2-square auras grant allies 10% Damage
  while Azrith has Shield, and 10% Attack Speed around his stationary banner.
  Only the first shield break creates a banner, even if his Shield recovers.
- **Untouch:** losing 20% maximum Health cumulatively triggers two seconds of
  immunity. After expiry, the next successful strike deals 20% extra Damage.
  Shield absorption alone does not count; lethal packets are not prevented.
- **Heartix:** after 24 seconds, the next launch can convert its primary enemy
  for eight seconds. Other splash victims take damage without conversion.
  Conversion restores the previous team with current Health and resets routing.
- **Blank:** personal enemy kills add one Damage, up to +5. **Magmara:** each
  hit applies an independent three-tick Burn packet, 10 Damage per second.
  **Collector:** personal kills restore two Mana, limited to 20, without Energy.
- **Willowshade / Octarion:** Willowshade bypasses Shield and creates one
  Octarion on death. Octarion leaves a 1.5 × 1.5 poison cloud for three seconds.
  Each grounded enemy entering it receives one 3 × 5 Poison packet, ticking
  every 0.75s; late entrants also receive the packet, which can finish after
  the cloud expires. Hovering/flying cards are immune to the ground cloud.
  Cleanse removes the packet; the same cloud does not reapply it to that card.
- **Sushu:** enters a touched enemy and deals 16 Damage every second. Inside,
  it has no targetable body, vision, collisions or objective presence. It follows
  its host and vanishes when the host dies. Cleanse removes the parasite;
  Predominance prevents entry. Whisper's separate priority possession is unchanged.
- **Umbra:** once per deployment, hides for three seconds at 75% Health and
  retreats 7.5 tiles along its own lane at 50%, stopping outside its castle.
- **Thief:** uses melee nearby and a ranged weapon at distance. Once per
  deployment it steals the first visible passive ahead within 15 tiles; the
  victim loses its native passive permanently. The thief retains its body,
  source stats and weapon while adopting the native handler and its required
  forms. Existing projectiles keep their launch payloads.
- **Rotlings / Mini Rotters:** one nine-Mana deployment creates three adults
  and three minis together, with legal placement reserved for all six bodies.
  Each enemy card death grants each living Rotlings +1 Damage for 20 seconds;
  every stack expires independently. Adult deaths do not create extra minis.
  Mini Rotters retain their own form and no longer mature into adults. On death,
  each creates a 2 × 2-tile mist lasting five seconds. Enemies inside lose 25%
  Range and Vision, including late entrants, flyers and hovering cards. The
  Blind ends on exit or mist expiry; overlapping mists do not multiply strength.
  Predominance prevents it, while Cleanse clears it until the next aura update
  if the enemy remains inside. Pausing freezes mist and bonus timers.
- **Stormblade:** a main hit can jump to three additional enemies within three
  tiles of the main target. Secondary hits deal 50% Damage. Four victims total;
  secondary hits cannot recursively bounce. Critical damage is applied once to
  each victim, with that victim's normal defenses.
- **Venom Fangs:** bypass Shield and transfer up to 0.5 Critical Chance points
  from each victim, respecting available chance and the 100% ceiling.
  **Skyhunter:** launch Damage increases 10% per tile of target distance.
- **Rockback:** gains 50% movement speed while approaching its first target;
  its first landed hit deals +150% Damage. For six seconds after a shield break,
  successful hits restore 10 Shield, without exceeding current maximum Shield.
- **Neon Droid:** successful hits grant independently expiring three-second
  20% Attack Speed stacks, up to 60%.
- **Void Wraith:** acquires enemy links within its 1.8-tile Range, reducing each
  victim's Damage by 20% and gaining that amount, capped at +16 Damage. Each
  link ends at six tiles; Silence/death lets its debuff expire within 0.2s.
- **Bio Mech:** each damage event shields nearby allies for 3% of each
  recipient's maximum Shield. Intrinsically shieldless allies gain five instead.
- **Mixela:** nearby allied or enemy deaths permanently increase maximum and
  current Health by 60% of the dead card's maximum Health. Buildings and
  healthless forms do not count. Each death is processed once.
- **Laura:** gains eight charge per second. At 100 charge, allies in Range gain
  25% Damage, Attack Speed and Movement Speed for 30 seconds. Further pulses
  refresh the same bonus rather than stacking it.

Apex tests exercise the real engine in `tests/arena-apex.test.cjs`, including
native handlers, timing boundaries, statuses, death cleanup, geometry, source
stat preservation, and multi-card interactions. Original ability prose stays
Azerbaijani in both Codex and Arena; live inspection notes are English.

Freak restores one Health in a single pulse each second. Its native regeneration
respects healing bonuses, Burn, Bleeding, Silence and pause, and does not emit
fractional healing effects every simulation frame. Small positive healing
amounts display as `+<1` rather than `+0`.

## Codex fidelity and locked cards

All **138 original root cards** remain battle-ready. The 29 Book2 additions are
listed with their current missing-data reasons. **Nightfang** completes the
original roster with
**500 Projectile Width**, **500 Attack Distance**, and **12,500 Vision**. The
Vision stat also gives his team a **12.5-tile scouting radius**, including while
he is invisible; his existing **12,000 target-acquisition Range** is unchanged.
Blind reduces both his sight and acquisition range normally. His native Eternal
Shroud grants **12 seconds of invisibility on arrival**, then **3 seconds on
every 60th successful hit**. Misses and fully prevented damage do not advance
the counter. Outgoing attacks retain stealth; incoming damage breaks it under
the shared Invisibility rule. Silence prevents renewal, and each deployed body
starts its own hit counter. Native ability prose stays in Azerbaijani.

The authored status timing completes three additional native card profiles:
**Snaykies**, **Bees** and **Toxic**. There are now **138 playable root cards** and
**17 playable spells**, including **Giga Bomb**. Poison packets use the native
A × B hit-count rule: Snaykies 2 × 4, Bees 8 × 2, Toxic 2 × 3, one tick each
0.75 seconds. Each successful hit keeps its own packet. Bees sacrifice themselves
after the first successful hit; their poison continues and keeps its original
caster attribution. Giga Bomb deals its immediate source damage and then ten
one-second Burn ticks: 25 to affected units, 5 to the affected castle per tick.

Three more Mundane roots have native rules ready:

- **Nortex** fires **5 → 7 → 9** in every three-shot series: each subsequent shot
  adds 40% of base Damage. The next series restarts at five; losing or changing
  the burst target starts a fresh series too. Misses consume their shot position.
  Native growth never mutates base Damage, Attack Speed, Delay or source DPS.
- **Fen** applies **12.5% Blind for seven seconds** on a damaging hit. Range,
  combat Vision and team scouting shrink by that percentage. Further hits from
  the same Fen refresh one entry; Cleanse, Predominance and Flexibility follow
  the usual rules. An applied Blind persists after Fen dies.
- **Nightprowler** becomes invisible after **two seconds without dealing or
  taking damage**. Real damage in either direction ends stealth and restarts
  recovery; zero damage, misses and dodges do not. The first successful attack
  from stealth applies **10% Misfortune for eight seconds** to cards it hits,
  including cone victims. Missed or fully prevented attacks retain the ambush.
  Silence blocks new stealth and Misfortune, but cannot prevent an existing
  conditional stealth state from ending on damage. Pause freezes all timers.
  The inspector shows the recovery countdown or active invisibility.

The last two Mundane profiles are now complete, so **every Mundane root is
battle-ready**:

- **Angels** is one prepaid ten-body reinforcement stream. The first arrives
  immediately. Subsequent gaps are **0.40, 0.45, 0.50 … 0.80 seconds**, giving
  scheduled arrival times **0, 0.40, 0.85, 1.35, 1.90, 2.50, 3.15, 3.85, 4.60,
  5.40 seconds**. Fixed-step emission rounds up by at most one simulation tick
  without accumulating delay. The ten-body Count and eight-mana cost stay intact;
  only the initial body needs a deployment position. Reinforcements arrive at
  that position on the selected corridor, independently of the first body's
  survival or control effects. After ten, the stream stops. Pause freezes it.
- Each fallen friendly Angel grants **+2 permanent Damage** to currently living
  friendly Angels across deployment groups. Enemy or unrelated deaths do not
  grant it. Future arrivals start with base Damage, because they were not yet on
  the field when those earlier Angels died. Native ability suppression follows
  Silence/Misfortune. The inspector shows arrivals, the next deadline and bonus.
- **Boomix** travels to the target's launch-time position and returns to its
  moving owner. It retains the single-target profile: at most one victim on each
  leg, with a fresh hit budget on return. The same target can take both hits.
  During flight its native passive reduces incoming damage by **20%**. Its
  **2.40-second attack interval begins at launch**; catching a weapon early
  preserves the remaining cooldown, while a late return delays the next launch
  until the weapon is caught. Only one weapon can be airborne, including during
  a Format promotion. Pause, death and Silence retain normal behavior. Avalith
  keeps its separate recovery-after-catch rule.

Two more Familiar roots are complete:

- **Albert** adds **+1 Damage after each successful hit on its current target**,
  capped at **+3 bonus Damage**. Its successive hits start **7, 8, 9, 10** and
  stay at ten while that target remains selected, including across twelve-hit
  series. Shield damage counts; misses and fully blocked hits do not. Selecting
  a different target or losing the current target resets the bonus, including
  while silenced. Count, burst interval, delay, mana and source DPS stay intact.
  The live inspector shows the current bonus and effective per-hit damage.
- **Chicken** has no normal basic attack and no invented Attack Speed. It
  approaches a legal ground target until the bodies touch, then sacrifices
  itself. Contact and externally caused death resolve the same **single**
  explosion. One roll chooses **100 Damage in a 2 × 2-tile square** (20%) or
  **500 Damage in a 3.5 × 3.5-tile square** (80%, a +400% bonus). The square is
  centered on Chicken and includes overlapping enemy bodies, grounded buildings
  and castles; flying cards and allies are excluded. Hovering is still a ground
  target. Shield, Damage Reduction, immunity, Silence and Misfortune follow
  normal rules; a missed death explosion is consumed once, without a reroll for
  each victim. Control effects prevent contact activation while active. Paid
  deployment still costs six mana once. Source combat dimensions and the blank
  Attack Speed remain available in the Codex.

**Tornado** completes the original Familiar roster, so all original Mundane and
Familiar root cards remain battle-ready. Its ten-hit attack uses a **0.25-second interval** and
**1.25-second additional delay**, with a **1.2-tile acquisition and attack reach**.
A successful central hit pulls that one target inside the vortex; it cannot
move, scout, be selected by outsiders, or deal damage, including from existing
projectiles, damage-over-time and persistent flame fields. Tornado continues its
series against its own captive. Each strike deals
four central Damage and **two to every other enemy in the 1.2-tile radius**, or
**six central and three surrounding Damage** at 50% Health or less. Surrounding
enemies are not captured. The bonus does not stack and ends after healing above
the threshold. The tenth attack attempt releases any
survivor and throws it **3.5 tiles from the vortex centre** along its original
approach direction, projected onto the lane for ground movement.
Release still happens if the last attack misses or Silence prevents the final
native effect. Cleanse, changing targets and the captor's death also release
survivors. Predominance prevents capture, while ordinary immunity, Dodge and
Misfortune can prevent the successful hit needed to capture. The inspector shows
the held target and burst progress.

The **Tphoenix → Fire Egg → Phoenix** chain is also battle-ready:

- Tphoenix reflects **10% of damage actually received**, including Shield damage,
  once to its attacker. Reflected damage cannot bounce recursively. Crossing
  strictly below **25% Max Health**, including a lethal damage packet, changes the
  same actor into a full **360-Health Fire Egg**. Transformation does not count as
  a kill, trigger death effects, change the selected corridor or spend extra mana.
- Fire Egg remains stationary and cannot attack. Surviving **ten game seconds**
  changes it into a full **240-Health Phoenix**. Pause freezes the clock. Silence
  can postpone an eligible hatch and suppress the native rescue if the egg breaks.
- A broken egg changes back into Tphoenix at **25% of its effective Max Health**:
  normally **120 / 480 Health**. Fire Egg is available **once per deployment**.
  Later damage or healing cannot rearm it; Format promotion and ownership changes
  retain that consumed allowance. Existing status modifiers are retained;
  airborne forms discard effects explicitly limited to the ground. Format copies
  retain their own copied root
  profile throughout these transformations.
- Phoenix flies along the selected corridor, bypasses shields and gains **+1
  permanent Damage per successful hit**. The source does not author a growth cap.
  Each form has its own Codex statistics, portrait and movement profile. The live
  inspector shows the hatch countdown and completed rebirth cycles.

**Corsair Crew** and **RogueX** complete two more Arcane profiles:

- One **12-mana Corsair Crew** deployment immediately creates the captain and two
  **Pirate Girls** on the selected corridor, with shared group identity. Formation
  validation reserves three legal, separated positions inside the deployment
  zone before spending mana or cycling the hand. The girls start behind the
  captain where space permits. Their survival is independent of the captain.
  Source Count remains one captain and two girls. Format copies summon the pair
  once; promotion does not create another pair.
- The captain intercepts a physical enemy projectile with probability
  **5 + effective Dodge Chance + effective Critical Chance percent**, capped at
  100%. This roll precedes ordinary Dodge. Success cancels the incoming projectile
  without health/shield damage or on-hit effects and launches a visible return to
  its shooter. The returned payload retains its damage and rolled critical
  multiplier, while the recipient's normal mitigation still applies. It can
  return to an airborne shooter or castle without changing the captain's ordinary
  ground-only melee targeting. Already reflected shots cannot bounce recursively.
  Melee, direct spells and damage-over-time do not use this interception. Silence
  or Misfortune can suppress it. Returning-weapon owners keep their weapon lock
  until the reflected shot finishes; pause and fizzle cleanup retain that rule.
- Pirate Girls gain a launch-distance bonus rising linearly from **0% at zero
  tiles** to **+75% at 2.75 tiles**, capped there. Their 16 base Damage becomes
  **22 at 1.375 tiles** and **28 at 2.75 tiles** before normal criticals and target
  mitigation. Their base statistic stays unchanged. The inspector shows the last
  launch's distance bonus.
- RogueX has a **50% chance** after a successful hit to apply **seven seconds of
  Blind**, reducing Range and Vision by **25%**. Fully blocked/missed hits do not
  trigger it. Predominance and normal native-ability suppression still apply.

**Reacher**, **Bastra**, **Maapp**, **Avara** and **John Reynolds** are battle-ready, including
partner forms. Partner activation is based on each team's original eight-card
deck, never on the current hand, deployment, proximity or a surviving partner:

| Card | Any qualifying partner | Base → empowered mana |
| --- | --- | --- |
| Reacher | Soldier | 11 → 15 |
| Bastra | Maapp or Avara | 9 → 11 |
| Maapp | Bastra or Avara | 4 → 7 |
| Avara | Bastra or Maapp | 15 → 18 |
| John Reynolds | Sheriff | 13 → 15 |

The source `upgradedsecondForm` supplies all empowered stats; multiple partners
never stack the upgrade. Both teams, deployment affordability/energy, cycle,
deck average, catalog, hand and bot mana planning use the same resolution.
Empowered forms cannot be selected directly as independent deck cards.
Unspecified additional stats in the five empowered forms retain the base values.
The existing website Power formula remains unchanged.

- Reacher keeps its 500-point attack width and travel distance. It acquires
  targets up to 2.2 tiles away and uses ranged bursts even against close flyers.
  A ground target within its authored one-tile melee mode switches it to a
  hand strike, approaching to its actual 0.5-tile strike distance. Base modes:
  24 melee damage/1.2s, or two 8-damage shots/.2s plus .8s delay. Empowered modes:
  32 melee/1.1s, or two 12-damage shots/.4s plus .6s delay. Switching cancels the
  unfinished burst without resetting the recovery; launched projectiles retain
  their own damage. Weapon selection remains available while silenced.
- Reacher counts other living allied units with centers inside a 3 × 3 square
  around itself: +2% Damage Reduction per ally, capped at 16%, or +3% capped at
  24% when empowered. Bastra uses the same square and gains +2%/+3% attack haste
  per ally. Its 70-damage ranged shots bypass shields. Silence disables these
  proximity bonuses and shield bypass. Buildings and absent bodies do not count.
- Maapp is light, with 5,000-point width and travel distance, five-tile Range
  and 360° coverage. Its .30s attack pulses around itself, including enemies
  behind it and flyers. Each successful hit has an 8% chance to reduce the
  victim's Damage by 75% for 2s; the empowered form uses 10% for 3s with an
  80% reduction. This uses
  the standard Stat Reduction, immunity, duration and Cleanse rules.
- John Reynolds has a 1,000-point strike width, 1,250-point attack distance and
  180° forward cone against ground targets. Critical basic attacks bypass
  shields; Silence disables that native bypass while critical damage remains a
  base stat. Each cumulative 8% of maximum Health actually lost triggers a
  horse call: Taunt in the authored 1.25-tile Range and 25% protection for 3s.
  The source empowered form uses 30% protection and 5s. Shield loss does not
  advance the counter. Large packets consume all complete 8% portions but
  refresh one effect, without stacking protection or multiplying its duration.
  Repeated Health loss after healing can trigger again; lethal damage does not
  trigger the call. Standard immunity, targeting and Cleanse rules apply.
- Avara cycles 22/44/64/92 damage, or 26/52/76/108 empowered. The corresponding
  acquisition ranges are 2.2/2.4/4.2/5 tiles, with intervals 1.35/.75/.85/1.75s.
  **Every attack adds the authored 1.45s delay**: 2.8/2.2/2.3/3.2s between attacks.
  Attack one instantly strikes a forward rectangle 2.5 tiles wide and five deep;
  attack four instantly strikes a rectangle five wide and 2.5 deep centered on
  the selected enemy. Both rectangles align with the direction of attack.
  Attack one slows all victims by 40% for 2.5s (empowered: 50%, 2.75s). Attack
  two fires a raspberry, pushing its victim 2.5 tiles (empowered: 3). Attack
  three fires an avocado seed, stunning for .75s (empowered: 1.25). The two
  single-target projectiles retain their .5-tile width and travel profile.
  Their effects use the launch step even if Avara's sequence has advanced.

The Codex and Arena inspectors show both area dimensions; battle inspection
shows current attack mode, next sequence step and partner activation. Native
ability descriptions remain Azerbaijani; interface text remains English.

**Sunrise** and **Wong** are battle-ready:

- Sunrise gains +1 maximum and current Health for each 0.6 seconds actually
  moving, up to **+210 additional Health** (155 → 365 before other modifiers).
  Idle time, combat stops, Root and pause do not advance its movement clock;
  Silence blocks new growth without accumulating a deferred award. This is a
  capacity increase, not a heal multiplied by Healing Bonus. Its original
  Shield, attack profile and source stats remain unchanged.
- Wong gains 25 charge per successful damage event, capped at 100. Its next
  charged attack consumes the charge; a successful hit pushes the enemy three
  tiles and stuns it for one second. Buildings are unaffected by this control.
- Below 40% current Health, Wong kicks nearby enemy units five tiles away and
  enters a temporary firearm stance: **8 shots × 8 damage**, with a 0.4-second
  base interval. It retains its authored one-tile Range and target layers. It
  waits for a legal target and follows normal movement, fog and combat rules.
  Missed shots consume ammunition. Stun pauses attacks; Silence cannot leave
  it permanently in firearm mode. After shot eight it restores its original
  melee profile, 28 base damage and 1.1-second base interval.
- Wong's special is available **once per deployment**. Healing above 40% and
  crossing the threshold again cannot rearm it. Form changes clear active
  stances and preserve the actor's used allowance, including Format promotion.
  The inspector shows Sunrise's earned Health and Wong's charge, remaining
  ammunition and spent special. Native ability descriptions remain Azerbaijani.

**Whisper** is battle-ready with locked, priority possession:

- The six-mana hovering card has no basic attack or invented attack interval.
  It selects a visible, targetable enemy unit inside its 1.8-tile acquisition
  range. Buildings, healthless forms and units already held by another Whisper
  are not possession targets. Silence or crowd control can prevent activation
  while Whisper still has a physical body.
- Every **one percentage point of current or newly gained Critical Chance** is
  consumed into **one stored second**, leaving its ordinary Critical Chance at
  zero. The base duration is **14 seconds plus stored seconds**. Further grants
  extend an active possession once, rather than being counted repeatedly each
  tick. Whisper cannot deal critical damage, including a forced critical packet.
  The host retains its own statistics and critical attacks.
- Starting control changes the host's team without healing it or replacing its
  identity, group, lane or native form. Whisper loses its physical presence: it
  cannot be seen, targeted, damaged, buffed, collide, scout or capture a well.
  The host supplies its own normal vision and combat. A violet timer and live
  inspector panel show remaining control and converted seconds.
- **Started control cannot be dispelled or overwritten.** Cleanse, ordinary
  conversion, Flexibility and host crowd control do not cancel ownership or
  shorten the timer. Ordinary combat effects can still affect the host. Expiry
  or the host's death ends the link.
- A Misfortune roll that would have caused the cast to miss instead applies a
  **single 25% duration penalty**. Predominance already on the host applies the
  same penalty. They never stack. Predominance gained later shortens remaining
  time by 25% once; repeated aura refreshes cannot compound it. Further critical
  seconds use the resulting 75% duration factor.
- At expiry the same host returns to its previous owner at its **current health
  and shield**, current location and current native form. A lower-priority
  temporary conversion keeps its original underlying expiry, without overriding
  active Whisper control. Form changes such as Format and Fire Egg preserve the
  locked possession. If the host dies sooner, Whisper vanishes immediately too.
- Whisper's disappearance has no killer and never damages a living host. If it
  belonged to Etheris's shared reserve, losing its physical body removes its
  contribution proportionally without killing the remaining partners. The former
  reserve can no longer end active possession by killing the hidden controller.
  The hidden controller, priority timer,
  conversion bank and nested-link cleanup are fixed-step simulation state; pause
  freezes them. The bot avoids wasting Illustration Spell on a locked host.

All twenty-three Relic roots now have their native abilities implemented: **Stacy**,
**Death**, **Demotron**, **Aeralis**, **Dark Necromancer**, **Ali**, **Worms**,
**Bloodraider**, **Shine**, **Avalith**, **Malvaris**, **Sylviana**, **Pyhsic**,
**Unara**, **Clara**, **Far**, **Lyra**, **Naar**, **Etheris**, **Format**, **Artist**, **Magma** and **Fallen Angel**.

- Stacy adds four one-second Burn ticks of eight damage after each successful
  hit. Independent packets stack and continue after her death. Below 10% health,
  her acquisition Range increases by 10%; healing above that threshold removes
  the bonus. Her base projectile geometry remains unchanged.
- Death gains two damage for each allied or enemy unit death, including summons.
  The bonus caps at 80, for 105 total base damage. Castles and buildings do not
  grant stacks. The `unitDeath` native hook dispatches each resolved death once
  to living observers through the usual Silence and Misfortune rules.
- Demotron restores 10% of its **currently missing** health every ten active
  seconds. With 100 health missing it restores ten, then nine at the following
  interval if no other damage or healing occurs. Normal healing modifiers apply.
- Aeralis pushes victims 0.1 tiles per hit, with a 12% chance to push 0.4 tiles.
  His and Stacy's ranged cones widen toward their authored projectile width;
  they can damage multiple enemies inside the fan.
- Dark Necromancer has a 17% chance to Silence a victim for ten seconds and
  summons one unit every fourteen active seconds: Bladeknight 40%, Stormbow 35%,
  Ironhide 25%. Bladeknight bypasses shields, Stormbow has a 35% chance to add
  two Burn ticks of four damage, and Ironhide blocks every fourth damage event.
- Ali gains four charge per second for each other nearby ally. At 100 charge,
  he and nearby allies receive three seconds of Untouchable immunity.
- Worms deploy as six concealed units. Each emerges on its first successful
  strike and stuns its victim for 0.8 seconds. Normal spell and incidental area
  damage can break Invisibility according to the shared status rules.
- Bloodraider compounds its unrounded damage by 10% per successful victim and
  rounds delivered damage to the nearest integer. A hypothetical base of 20
  produces 22, 24 and 27; the underlying values remain 22, 24.2 and 26.62.
  Each successful victim costs 4% of its current maximum health. This health
  cost bypasses shields and damage reduction; Immortal can preserve the last
  health point. Failed or prevented hits grant no growth and spend no health.
- Shine adds 4% of base maximum health to itself and nearby allies every five
  active seconds, adding the same amount to their current health. Each recipient
  has a shared five-stack cap (+20%), even with overlapping Shines. Other maximum
  health bonuses remain separate. Enemies and castles receive no bonus.
- Avalith avoids incoming damage with a 33% chance. Its piercing line shot turns
  at the aimed target position and returns to its moving owner, hitting each
  eligible ground target once per leg. It cannot throw another shot before
  catching the first. Actual flight time replaces the fixed Delay; the next
  attack interval starts after the catch, using normal projectile speed.
  The interval is reduced 60% at one tile or closer, scaling linearly to no
  reduction at 3.75 tiles: 0.32s, 0.56s and 0.80s at 1, 2.375 and 3.75 tiles.
  Slow and Haste still apply. The source 1.30s Delay remains reference data and
  is not added again on top of flight time. Pause freezes flight; Silence does
  not strand an already-thrown weapon, and death or timeout clears its lock.
- Malvaris marks successful hits for two seconds, including killing blows. A
  marked unit's death summons one allied Phantomis per active caster mark,
  regardless of the killer. Repeated hits refresh that caster's mark. Expiry,
  Cleanse and Predominance prevent conversion; castles and buildings cannot be
  marked. Flexibility shortens the mark, while an already-applied mark persists
  through its caster's Silence or death. Each allied unit death grants Malvaris
  +0.5 percentage points of critical chance, capped at **+75 bonus**, for **80%**
  total with its base 5%. Friendly Phantomis from all summoners count together:
  each additional one grants +10% damage and +5% attack speed, added together.
  Three therefore give each +20% damage and +10% attack speed. The bonuses
  recalculate as allies die; enemy Phantomis do not contribute.
- Sylviana takes 20% less damage from Alien units and creates four flying
  Butterflies on death. Each Butterfly's death adds ten maximum and current
  health to living friends in a centered **1.5 × 1.5-tile square**. A full-health
  100/100 ally becomes 110/110; an injured 70/100 ally becomes 80/110. The bonus
  stacks across deaths, excludes enemies and castles, and cannot revive dead
  units. Its green area effect displays the actual square footprint.
- Pyhsic attempts its special attack every 22 active seconds against a visible
  frontal enemy unit within 7.5 tiles. It deals 50 damage, then has a
  `min(100, 20 + maximumHealth × 0.1)` percent chance to execute a surviving
  target: 40% at 200 maximum health and 100% at 800 or more. Executions respect
  damage immunity and Immortal, exclude structures, and are not basic-hit procs.
- Unara gains nine charge per successful basic hit. Spending 100 charge pushes
  nearby visible enemy units two tiles away and starts 30 homing orbs, one every
  0.1 seconds for two damage each. The initial targets rotate in a queue starting
  with the nearest; dead, concealed or unavailable targets leave it. The native
  orb range includes the two-tile push, and shots track only their assigned
  target. Orbs keep the base weapon separate and never generate charge or repeat
  basic-hit abilities. Twelve basic hits fill the 100-charge cap; activation leaves zero charge.
  Misfortune is checked once at launch, while global pause or Silence freezes
  new launches. A valid Taunt redirects subsequent orbs to its caster.
- Clara gains 20 charge per visible nearby enemy per second, including flyers.
  Spending 100 applies seven seconds of Taunt and seven seconds of self-healing:
  three health every 0.25 seconds, for 28 ticks and 84 base healing. Bleeding,
  Burn and healing bonuses retain their normal effects. Taunt changes attack
  targets rather than immobilizing enemies. Recasting refreshes existing victims
  and affects newly nearby enemies without stacking duplicate regeneration.
- Far has an 8% chance on a successful hit to banish an enemy unit for ten
  seconds. The victim cannot move, attack, take combat damage, receive normal
  buffs, scout, contest wells, block bodies or appear on either team's map.
  On return it moves to another legal position on any of the three corridors,
  using the match's seeded randomness and retaining its team and formation.
  It takes 12% of its current maximum health as damage through normal shields.
  Flexibility shortens banishment. Cleanse cannot remove its higher-priority
  Imprisonment; Predominance prevents it or releases the unit immediately
  without the exit penalty. The applied effect survives
  the caster's death; pause freezes its timer.
- Lyra cycles **5 → 5 → 3 × 5**. Every mode uses a 0.20s hit interval and 0.90s
  end delay, producing five base strikes in a 3.70s repeating cycle. The triple
  burst locks one target; losing that target cancels the burst and advances the
  cycle. Each currently missing 10% health adds 8% damage and attack speed,
  capped at +40%; healing removes the corresponding bonus. Base source DPS
  remains seven and is reference data.
- Naar activates below 40% health and throws twenty four-damage grenades over
  ten active seconds, one every 0.5 seconds. Grenades use a **1.25 × 1.25-tile**
  square. Ultimate victims explode for 40 damage in a **2.5 × 2.5-tile** square;
  those kills can chain, with each victim exploding once. Friends and structures
  are excluded. Healing to at least 40% rearms the trigger; one Naar can activate
  at most **three times total**. Overlapping activations retain their own twenty
  throws. Silence pauses new throws, while pause freezes all combat. The normal
  120-damage shot retains its original 1 × 1-tile impact and has no death chain.

- Etheris links its two deployed bodies and the first eligible nearby ally in
  acquisition Range. Ninety percent of their current and maximum health/shield
  becomes one reserve, mirrored by all three. Damage to one subtracts once;
  healing and shield restoration affect the reserve. Zero shared health kills
  every linked body once. The link persists when bodies move apart. An available
  ally can join later; a body cannot belong to two reserves.
- Format cannot attack before transforming. It channels for three active seconds
  on the strongest visible enemy ahead within 15 tiles, using the **same scaled
  Codex Power score** as the website. Lost targets restart the channel. It copies
  current numeric stats, attack sequences, movement and native ability, with full
  health/shield. Killing that original target refreshes the copied stats at
  double strength once; attack intervals and Delay halve. Another ally's kill
  does not activate this bonus. Original source definitions stay immutable.
- Artist's successful basic impacts add permanent, source-specific ink. Each ink
  gives **3% Slow**; **21 ink** applies a **25% Curse** to damage from every source
  and grants that Artist **10 charge** once. The cursed victim's death spreads
  **4 ink** to every enemy in a **2 × 2-tile** square. Existing curses and their
  attributed spread survive Artist's death. Cleanse removes ink/Curse and
  Predominance prevents them. Different Artists keep separate charge and stacks.
- Artist's death replaces it with **six ravens for seven seconds**. Every complete
  **20 charge** adds **two ravens and one second**: 20 charge means eight ravens
  for eight seconds, 40 means ten for nine. Bonuses are sampled at Artist's
  death. Ravens have no authored health, fly along their deployed lane, attack
  legal opponents, are visible but intrinsically untargetable, and ignore damage
  and negative effects. Each reveals exactly **four tiles**. The violet overhead
  bar shows remaining lifetime; the inspector shows health/shield as a dash.
  The simulation uses an internal liveness sentinel, never an invented health
  stat. Pause freezes their expiry with every other combat timer.

- Magma replaces its former health drain and ally Burn aura with a **1.5-tile
  flame trail**. Only actual walking lays fire; standing still, crowd separation,
  knockback and teleports do not. Each piece lasts **ten seconds**. Grounded enemy
  units touching the trail take **three damage per second** of continuous exposure.
  Hovering/flying units, allies and structures are excluded. Leaving resets the
  exposure timer; no extra Burn persists off the trail. Overlapping pieces from
  one Magma do not multiply damage; separate Magmas have independent trails.
  Existing fire keeps its original team and lifetime after caster death,
  conversion or crowd control. Silence prevents new fire; pause freezes it all.
- Fallen Angel initially chooses the visible grounded enemy ahead within **7.5
  tiles** with the greatest **current health**, ignoring maximum health, shields
  and proximity except to break ties. It retains that target while legal/visible.
  Each successful impact on that target grants **1% attack speed**, capped at
  **80%** (0.80s becomes approximately 0.444s). Cone collateral does not grant
  stacks. Target death, concealment, loss of legal targeting, or a Taunt changing
  the target resets the bonus. Native prioritization respects fog and Silence;
  the inspector displays the marked target and current stacks. Melee pursuit
  stops only inside the actual attack area, so Fallen Angel reaches its
  0.5-tile strike distance before swinging; the same boundary applies to cone,
  line and circle melee attacks.

The live unit inspector displays native stat growth as well as status modifiers,
so Malvaris's critical stacks and Phantomis army bonuses appear in their values.

All 167 root cards appear when the library's readiness filter is set to All;
the 138 original cards remain playable. The 29 Book2 additions preserve their
workbook stats and native prose, with unavailable combat facts left unspecified.
Stormblade moves to Mundane and Umbra to Arcane without changing their identities,
artwork paths or behavior. Arcane Mertel is separate from Ascendant Marcy.
See [the import record](card-imports/book2.md). Readiness still
requires complete source data and native behavior, including required child
forms. Incomplete spells retain explicit lock reasons; removing a lock never
substitutes invented values.

Authored `combatStats` fields take priority over class labels and artwork.
Existing single-target projectile width fallback is 500 points. Missing essential
travel distance, unresolved attack variants, absent health (except explicitly authored timed, healthless forms), or an unspecified
ability magnitude/trigger can prevent deployment. A dash for a stat that does
not apply is not, by itself, grounds for locking a card. The library and inspector
are the current readiness report; source data is never rewritten to mark cards.

The engine keeps these quantities separate:

- **1,000 points = one tile.** Spatial source values retain their original units
  in data; movement and collision use tiles.
- **Range** acquires a target and sets a ranged card's firing distance, limited
  by its Vision and blindness. Ranged cards hold position and launch projectiles
  when a target enters that range; a short recorded Attack Distance never forces
  them into melee. Their projectile travel budget is the greater of Attack
  Distance and the current firing range, so a shot can reach its acquired target.
  Melee cards still approach until their authored **Attack Distance** can connect.
  Source JSON values, projectile widths, bursts and impact geometry are retained.
- **Projectile Width** describes one strike or projectile. Arc and impact area
  are independent dimensions. Numeric spell Range is a radius; rectangular
  dimensions are full width and height, and Global covers the arena.
- **A × B** means A successive hits for B damage each, including Soldier's
  `15x3`. It does not mean A units or A different enemies. A burst keeps its target.
- **Attack Speed** is the interval between successive hits, in seconds. After
  the final hit, the normal interval plus **Delay** elapses before a new burst.
  A complete repeating burst therefore takes `hitCount × AttackSpeed + Delay`,
  matching the Codex's damage calculation rather than Survival's separate
  weapon timings. Native returning weapons such as Avalith instead wait for
  their actual round trip, followed by their distance-dependent attack interval.
- **Count** is the number of deployed units. Summoning and transformations follow
  the particular card's native rules.
- **DPS** is source reference data. Actual damage per second follows damage,
  intervals, burst timing and effects; the displayed DPS is not multiplied into
  damage a second time. Stat comparison scales are not normalization formulas.

All 24 numeric stats remain available to the simulator and inspector. Shields
share incoming damage with health: at Shield Depletion 70%, 70% goes to shield
and 30% to health. Unabsorbed shield overflow goes to health. Critical resistance
reduces the extra critical portion; Flexibility shortens finite negative-effect
duration. A missing Life limit does not force a unit to expire.

Status definitions follow the Codex: Slow affects movement and attack speed;
Bleeding deals 1% maximum health per second and blocks healing; Poison also
slows movement by 10%; Burn reduces healing by 20%; Invisibility breaks on incoming
damage; Silence disables abilities, rather than ordinary movement or attacks.
The partially outdated generic `effects` arrays are not automatically executed
on top of native card handlers.

## Native charge and card balance

A small charge bar and numerical counter now sit above the Health/Shield bars of
**Laura, Kai, Wong, Tribe, Shellbyte, Ali, Unara, Clara, Artist, Ase and both Ray
forms/partners**. These read the native instance's current counters: earning,
spending, pause and copied/stolen passives are reflected immediately. Non-charge
cards and stripped passives do not show a meter. A full stored charge glows gold;
ordinary meters show `current/100`, Ase shows robot parts out of four, and Artist
shows a stable current/100 ink meter. All charge pools stop at 100 and have no
age-based decay. Laura holds a full charge if no ally can receive her pulse;
Clara holds it without enemies. Charge is spent by the relevant ability use,
including the normal accuracy rules, rather than discarded by time. Artist's
maximum 100 ink yields at most sixteen ravens for twelve seconds. Ase's parts
remain a separate four-part resource. Active Ray fusions show an ACTIVE duration
bar after spending their charge, so activation is distinct from stored charge.
Status icons move above the charge bar. The live inspector includes a
matching labeled progress bar. Rendering remains subject to entity visibility.

The requested card rebalances apply to both Codex data and Arena:

| Card | Updated values |
| --- | --- |
| Frostshot | 0.25s Attack Speed, 1.40s Delay; still 2 × 11 Damage |
| Deadscope | 125 Damage, 5.25s Attack Speed, 7-tile Range, 23.81 reference DPS |
| Avalith | Up to 60% interval reduction near the target |
| Naar | 96 Damage, 3.75s Attack Speed, 25.6 reference DPS |
| Lyra | 180 Health, 45 Shield |
| Mr. and Mrs. Ray | Both forms gain 6 charge/s within 2.5 tiles; 100 each waits for a valid enemy in attack range; 1250-point attack width |
| XII Josh | One body per deployment |
| Ase Form II | 2.5-tile Range, 1.05 tiles/s Speed |

Ray's authored form IDs are retained, including the shared `the-rays` image IDs;
Arena's normalized parent paths keep both partners and forms distinct. Native
ability prose remains Azerbaijani. Unmentioned stats and the shared Power
formula are preserved; source DPS remains informational.

The card audit also corrects four native interactions:

- Arcanyx fires one seed whose 1.5 × 1.5 impact hits every eligible ground
  target once. The intrinsic splash remains under Silence; its +60% Damage and
  native healing still require the passive.
- Tphoenix's melee strike resolves its authored 1 × 1 impact once, without a
  second direct hit. Ground targeting, shields, dodge, immunity and critical
  damage use the normal damage pipeline.
- Venom Fangs transfers 0.5 effective Critical Chance points per successful hit.
  A permanent per-unit adjustment survives Leno I, Bethe and Srail recomputing
  their base chance, as well as Cleanse or the thief dying. Transfers stop at
  zero for the victim or 100 for the recipient. Hailey can earn stolen points
  back with new hits. Mimic and Format snapshot the current effective chance;
  a fresh form does not apply the previous body's adjustment twice.
- Ironjaw's +25% is an additional bonus. Fifty successful hits add 0.5 points
  each to the authored 25%, reaching 50%. Copied/stolen versions receive the
  same additional cap relative to their own starting chance.

Deadscope and Naar's source DPS now uses their base Damage divided by their
attack cycle, rounded to two decimals. It excludes criticals, passives and
additional targets. Damage, intervals and the shared Power formula are unchanged.

## Status effects

The battlefield uses hand-drawn vector status symbols instead of colored dots.
Frozen, Slow, Poison, Burn, Stun, Root, Silence, Blind and other conditions have
separate silhouettes and colors, shared with the live inspector's text labels.
Crowd control takes priority above a card; repeated packets share one icon with
a stack count, and excess conditions use a `+N` badge. Minor stat-bonus icons
appear on selected cards to keep armies readable. Frozen bodies gain faceted ice,
Slow draws a foot ring, Stun has orbiting stars, and Root wraps the feet in vines.
First applications emit a short pulse; refreshing an existing effect does not
spam particles. Thawing sheds ice while retaining the existing follow-up Slow.

Persistent **Roots**, **Nightfall Curse**, **Spirit of the Wild**, **Octarion
poison clouds** and **Mini Rotter mist** now draw their actual circle/rectangle
throughout their lifetime. Color, interior texture, a team-colored boundary and
a diminishing perimeter trace distinguish the areas. A label shows the name and
seconds remaining; mobile and zoomed-out views use the symbol and seconds only.
Expiration removes the area. Fog masks areas and their labels; these visuals do
not grant sight. All animation and countdowns use paused simulation time.

Lifetime Health loss, including Gloop's ageing, uses a **red negative number and
hourglass**. Healing retains green positive numbers. Spell footprints, radial
waves, leap trails, poison motes, shield impacts and critical-hit text have
separate visual treatments. These are presentation changes; authored card
statistics, damage amounts and ability prose are preserved.


`data/info.json` contains the readable rules. `arena/js/statuses.mjs` defines the
canonical names, intervals and stat modifiers; native cards supply their own
strengths, durations, radii and health thresholds. A listed minimum does not
invent an unknown card's actual strength: Fen and RogueX still need their authored
Blind percentage, for example. Card ability names and descriptions retain their
original language. The Codex's map and victory text describes the existing three
routes and guaranteed two-minute overtime; those game rules have not changed.

| Effect | Arena behavior |
| --- | --- |
| Heal | Timed health recovery; healing bonus applies. |
| Untouchable | Blocks all incoming damage; the unit may still be targeted. |
| Immortal | Incoming damage leaves at least one health. Authored lifetime limits still expire. |
| Predominance | Clears current negatives and blocks new negatives during its duration. |
| Fearless | Uses the supplied reduction when no other allied cards are nearby or more than five enemies are nearby. |
| Taunt | Nearby legal enemies focus the taunter, interrupting a different burst target; immunity, sight and target layers still apply. |
| Cleanse | Removes lower-priority negatives, restores temporary conversion and cancels a cleansed Frozen's pending slow. Cannot remove Betrayal, Airborne or Imprisonment. Positive buffs remain. |
| Berserk | Applies supplied damage and/or attack-rate bonuses below a supplied health fraction. |
| Invisibility | Prevents enemy acquisition until expiry or actual incoming damage. Area hits can still connect. |
| Untargetable | Prevents enemy acquisition and every incoming damage type. |
| Reflection | Returns the damage actually received to its attacker once, including spell and DOT damage; reflected damage does not bounce. |
| Burn | One tick each second and 20% less healing received. |
| Poison | One tick each 0.75 seconds and 10% less movement speed. |
| Slow | At least 10% less movement and attack rate. |
| Silence | Disables native abilities, while normal attacks and movement continue. |
| Blind | At least 12.5% less attack range, combat vision and the card's scouting radius. |
| Stat Reduction | Temporary flat or proportional reductions, applied on top of live stat growth; expiry preserves the underlying stats. |
| Curse | Multiplies incoming damage from every source by at least 25%. |
| Stun | Stops movement and attacks. |
| Bleeding | One tick of 1% effective maximum health each second; blocks all healing. |
| Misfortune | At least 10% miss chance for basic attacks and triggered abilities, including buffs and healing. A missed action applies no damage or effects. |
| Imprisonment | Prevents acquisition, incoming damage, outgoing damage and active actions. |
| Root | Stops voluntary movement; attacks and forced displacement remain possible. |
| Airborne | Stops movement, actions and outgoing damage; visually lifts the unit without changing its authored target layer. |
| Betrayal | Makes the card target and damage its own allied cards while retaining ownership; its own castle is excluded. |
| Knockback | Immediately displaces the target by the supplied tile distance; Predominance blocks it. |
| Frozen | Stops movement and actions, then applies 25% Slow for three seconds after thawing. |

| Weakness | Incoming negative Control / Crowd Control durations ×1.25; negative Stacking durations ×1.33. |
| Absolute Weakness | Incoming negative Control / Crowd Control durations ×1.33; negative Stacking durations ×1.50. Blocks applying all status effects and reduces bonuses from active and new numerical buffs by 30%. |

Priority resolves **removal and immunity interactions only**. Stun and Heal can
coexist; a higher-priority status does not erase unrelated effects. The tiers,
from strongest to weakest, are:

1. Untargetable, Untouchable, Immortal.
2. Predominance (clears and blocks all ordinary negatives).
3. Betrayal, Airborne, Imprisonment.
4. Cleanse (instant removal of lower-priority negatives only).
5. Root, Misfortune, Stun, Curse, Blind, Stat Reduction, Slow, Burn, Poison,
   Frozen, Bleeding, Knockback, Taunt; Silence and both Weakness effects use this
   ordinary-negative tier.
6. Invisibility, Reflection, Fearless, Berserk, Heal.

Whisper's explicitly unbreakable native possession remains a separate exception:
Predominance imposes its existing 25% duration penalty, and Cleanse cannot end it.

Every effect has Positive / Negative polarity and a Control, Crowd Control or
Stacking up status category. **Only Burn, Poison, Bleeding, Slow and Frozen** are
Stacking; this category does not invent extra stacks for an ability. Berserk,
Untargetable, Reflection, Fearless, Imprisonment and Betrayal are single-target
only. `statusMany` selects one eligible target for these effects; explicit
`area:true` application is rejected. Other area effects receive Crowd Control
metadata; area Slow remains in the Stacking category.

Vulnerability extends newly applied negative durations only. When both Weakness
effects exist, Absolute Weakness wins without combining their multipliers.
Indefinite durations remain indefinite. Flexibility then reduces the resulting
finite duration, including the follow-up Slow. Existing effects are not extended
retroactively. Buff potency is evaluated dynamically: +20% becomes +14%, and
returns to normal after Absolute Weakness ends if the buff is still active.
Native permanent gains, including Dino damage, Mixela Health and Ironjaw
Lifesteal Chance, remain unchanged. Absolute Weakness does not disable ordinary
damage, movement or previously applied damage-over-time packets.

Both new effects have distinct vector icons and inspector descriptions. The
inspector also exposes polarity, category and single-target restrictions.
No card or spell gains either new effect without an authored assignment.

Timed damage includes the final due tick. Clocks run on the fixed simulation
step, so a 0.75-second event is resolved on the first step at or after its due
time. Pausing freezes status clocks. Damage packets retain a caster reference
outside serializable match state, with references released after the last packet
expires. In-flight effects are not rerolled for Misfortune after they were cast.

The inspector shows active effects, remaining durations and changed numerical
stats. Health and shield bars use their current effective caps. Deploying a card
still uses its source Mana and Count; temporary instance effects do not rewrite
the deck or the source JSON.

Engine API examples (magnitudes use fractions unless a stat uses source points):

```js
engine.status(unit, 'Poison', 1.5, 0, caster, {amount:4, stack:true});
engine.status(unit, 'Berserk', 5, 0, caster, {
  threshold:.3, damageBonus:.5, attackSpeedBonus:.25
});
engine.status(unit, 'Stat Reduction', 4, 0, caster, {
  stats:{damage:5, speed:500}
});
engine.status(unit, 'Stat Reduction', 4, 0, caster, {
  stats:{damage:.2, range:.25}, percent:true
});
engine.status(taunter, 'Taunt', 3, 0, taunter, {radius:3});
engine.status(enemy, 'Knockback', 0, 3, caster);
engine.status(enemy, 'Weakness', 4, 0, caster);
engine.status(enemy, 'Absolute Weakness', 3, 0, caster);
engine.statusMany(enemies, 'Stun', 1.5, 0, caster);
engine.useAbility(caster, () => { /* one shared accuracy roll for this action */ });
```

Card-only execution, possession and copying do not target castles or crystal
wells. Deaths and secondary effects resolve through the simulation event order,
avoiding repeated kill credit or reflection loops.

## Opponent decisions

Each match draws the bot's own eight-card deck from playable root cards, plus an
independent spell cycle within the five-charge budget. The draw mixes affordable
cards, a frontline, ranged support and an answer to flying targets when available;
it does not copy or inspect the player's selected deck. A different match seed
draws a different combination; identical seeds reproduce the same decisions.

The bot saves mana for a chosen deployment instead of automatically cycling any
affordable card. Ordinary attacks keep up to four mana in reserve and leave at
least 3.5 seconds between deployments. Existing forces can finish capturing a
well while the bot banks mana. It adds ranged support behind a tank and chooses
cards that can actually hit visible threats. An under-defended castle can
interrupt a saved plan and spend the reserve on a faster response; emergency
deployments still have a 1.25-second minimum gap. Spell decisions conserve energy
when healing is unnecessary or an expensive attack would hit only a weak target.

The bot follows the same mana, energy, capture, target-layer and placement rules
as the player. It receives no extra resources and reads enemy units only through
its own team vision; camera movement and hidden player hands give it no knowledge.

## Running and checking

From the repository root, run a static server, for example:

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080/arena/`. Card artwork uses the Codex's existing
Cloudflare R2 URLs; unavailable artwork has a local visual fallback.

```sh
node --test tests/*.test.cjs
node tests/arena.browser.cjs
node tests/arena-effects.browser.cjs
node tests/arena-casting.browser.cjs
node tests/arena-card-fixes.browser.cjs
```

The browser check uses Playwright and Chromium (`/usr/bin/chromium`, or set
`CHROMIUM_PATH`). It serves the real application under a project prefix, stubs
external artwork, and exercises deck building, complete troop availability,
incomplete-spell explanations, resource accounting, deployment, spell targeting,
fog visibility, hidden-enemy inspection,
pause, restart and small-screen layouts. Browser import mappings version every
arena module together, including vision, so a previous cached geometry cannot
mix with the current map or renderer.
The test writes preview screenshots under `/tmp` for visual review.

The effects browser check also compares rendered pixels at each active area
boundary, expired areas and hidden fog, and checks status icons, inspector labels,
50% zoom and a phone viewport. Set `ARENA_EFFECTS_URL` to test a deployed Arena.

The casting browser check verifies Blesser selection/channel/receipt pixels and
icons, one visible Ray body in both forms, shared Health, waiting for an enemy at
full charge, the 2×5 dash and its shortened boundary path, the requested source
stats, held charge, and Dumpsy's 5% sequence. Set `ARENA_CASTING_URL` for a
deployed build.

The card-fixes browser check exercises both impact areas, persistent Critical
Chance theft and live inspector values, Ironjaw's 50% cap, and the corrected
source DPS. Set `ARENA_CARD_FIXES_URL` to check a deployed Arena.
