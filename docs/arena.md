# Clash-A-Mana Arena

The standalone game lives at **`arena/index.html`**. Serve the repository over
HTTP and open `/arena/`; it also works beneath a project subdirectory, such as
`/oyun/arena/`. It has no build step, backend, account requirement or multiplayer
service. The opponent is a local tactical bot.

The original Codex, turn-based Battle Arena and Survival entry points remain
separate. Arena loads the same card and spell JSON files without changing them.
New controls and labels are English. Authored ability descriptions retain their
original language; they are not translated at runtime.

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

Use the **+ / −** buttons (or keyboard keys) to zoom from 80% to 160%; Ctrl/Command
plus the mouse wheel zooms around the pointer. Even the widest battle setting
requires panning. Resizing retains your camera focus and zoom. Starting or
restarting a match restores the home camera; the lobby shows the complete island.
Camera movement does not alter combat positions, deployment range or team sight.

Battles use current team vision, with **opaque black fog** outside all friendly
vision sources:

| Vision source | Reveal radius |
| --- | --- |
| Living allied card | 8 tiles |
| Owned crystal well | 4 tiles |
| Living allied castle | 7.5 tiles |

The castle supplies starting vision before the first card is deployed. Each
team's visible area is the union of its source circles. There is no permanent
explored-map memory: an area returns to black immediately after its last vision
source leaves, dies or changes owner. These scouting radii are separate from
individual cards' authored Vision and Range combat stats.

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

## Codex fidelity and locked cards

The authored status timing completes three additional native card profiles:
**Snaykies**, **Bees** and **Toxic**. There are now **58 playable root cards** and
**17 playable spells**, including **Giga Bomb**. Poison packets use the native
A × B hit-count rule: Snaykies 2 × 4, Bees 8 × 2, Toxic 2 × 3, one tick each
0.75 seconds. Each successful hit keeps its own packet. Bees sacrifice themselves
after the first successful hit; their poison continues and keeps its original
caster attribution. Giga Bomb deals its immediate source damage and then ten
one-second Burn ticks: 25 to affected units, 5 to the affected castle per tick.

All 138 root cards appear in the library, including unavailable cards. A card is
playable only when the source data and its native behavior are sufficiently
defined for this simulator. Locked entries explain the missing fact rather than
substituting invented combat values. Required child forms must also be complete.

Authored `combatStats` fields take priority over class labels and artwork.
Existing single-target projectile width fallback is 500 points. Missing essential
travel distance, unresolved attack variants, absent health, or an unspecified
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
  weapon timings.
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

## Status effects

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
| Cleanse | Removes every current negative, restores temporary conversion, and cancels Frozen's pending slow. |
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
| Curse | Multiplies incoming damage from every source. |
| Stun | Stops movement and attacks. |
| Bleeding | One tick of 1% effective maximum health each second; blocks all healing. |
| Misfortune | At least 10% miss chance for basic attacks and triggered abilities, including buffs and healing. A missed action applies no damage or effects. |
| Imprisonment | Prevents acquisition, incoming damage, outgoing damage and active actions. |
| Root | Stops voluntary movement; attacks and forced displacement remain possible. |
| Airborne | Stops movement, actions and outgoing damage; visually lifts the unit without changing its authored target layer. |
| Betrayal | Makes the card target and damage its own allied cards while retaining ownership; its own castle is excluded. |
| Knockback | Immediately displaces the target by the supplied tile distance; Predominance blocks it. |
| Frozen | Stops movement and actions, then applies 25% Slow for three seconds after thawing. |

Flexibility reduces finite negative durations, including the follow-up Slow.
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
engine.useAbility(caster, () => { /* one shared accuracy roll for this action */ });
```

Card-only execution, possession and copying do not target castles or crystal
wells. Deaths and secondary effects resolve through the simulation event order,
avoiding repeated kill credit or reflection loops. The bot uses the same selected
deck, costs, mana, energy, capture and placement rules as the player.

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
```

The browser check uses Playwright and Chromium (`/usr/bin/chromium`, or set
`CHROMIUM_PATH`). It serves the real application under a project prefix, stubs
external artwork, and exercises deck building, locked-card explanations, resource
accounting, deployment, spell targeting, fog visibility, hidden-enemy inspection,
pause, restart and small-screen layouts. Browser import mappings version every
arena module together, including vision, so a previous cached geometry cannot
mix with the current map or renderer.
The test writes preview screenshots under `/tmp` for visual review.
