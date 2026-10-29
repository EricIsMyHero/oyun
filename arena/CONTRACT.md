# Arena implementation contract

Separate static ES-module entry at `arena/index.html`. Do not change Codex JSON.
UI English, native abilities unmodified, no emoji. Source points /1000 = tiles.

## Shared modules

- `js/rules.mjs`: RULES constants, STAT_KEYS, num(), burst(), energyForMana().
- `js/map.mjs`: MAP, routeFor(lane,side), closestRoute(point), isDeployable(point,side,buildings=[]), distance(a,b), projectSegment(point,a,b).
- `js/catalog.mjs`: loadCatalog(baseURL default relative repository URL), buildCatalog(rawCards,rawSpells), imageFor(raw,parent), formatStat(key,value). Returns `{cards,spells,byId,spellById,forms}`; maps are Maps. Root card has `{id,name,raw,rarity,image,type,stats,attack,combat,forms,ready,reasons}`. stats numeric raw points incl all24 keys; attack `{count,damage,interval,delay}`; combat raw point dimensions. Preserve raw and all authored ability fields. Nested IDs `parent/form-slug`.
- `js/abilities.mjs`: ABILITIES object keyed by card ID; supports hooks `spawn(ctx,u)`, `tick(ctx,u,dt)`, `attack(ctx,u,target,hit)`, `hit(ctx,u,target,result,hit)`, `incoming(ctx,u,source,hit)`, `damaged(ctx,u,source,result,hit)`, `death(ctx,u,killer)`. `attack` and `incoming` mutate hit `{damage,kind,bypassShield,critical,secondary,burstIndex}`. Registry exported with readiness reasons; unsupported/missing essential source facts must lock cards honestly. Do not execute stale effects generically.
- `js/engine.mjs`: ArenaEngine({cards,spells,deck:[id],spellDeck:[id],seed=1,bot=true}). `.state` has `{time,phase,remaining,paused,winner,teams,castles,units,projectiles,effects,events}`. phase regulation/overtime/ended. `.deploy(side,handIndex,{x,y})`, `.cast(side,{x,y})` return `{ok,error,...}`; `.step(dt)` advances fixed ticks, `.setPaused(bool)`. Side0 blue,1 red. Team `{mana,energy,hand:[id],queue:[id],spellIds:[id],spellIndex}`. Same decks/economy for AI.
- `js/renderer.mjs`: ArenaRenderer(canvas); `.draw(stateOrNull,ui={})`, `.worldAt(clientX,clientY)`, `.resize()`, `.destroy()`. UI `{placement:{x,y,valid},selectedCard,selectedUnitId,spellSelected}`. Renderer tolerates missing images and empty state, scales to canvas CSS size / DPR.
- `js/app.mjs` controls entry, load/deck/inspection/HUD/pause/result/UI, imports above. HTML/CSS owned with app.

## Engine/ability context

Context is engine. Getters `time`, `units`, `castles`, `teams`; `random()` deterministic RNG. Methods:

- `damage(source,target,amount,options={kind:'attack',bypassShield:false,critical:false,secondary:false})` -> `{healthDamage,shieldDamage,total,killed}`. Handles reduction/shield/dodge and incoming/damaged; attack resolution calls ability hit exactly once for direct actual hits.
- `heal(target,amount,source=null)`, `giveShield(target,amount)`.
- `status(target,kind,duration,magnitude=0,source=null,extra={})` adds/refreshes status `{kind,until,magnitude,sourceId,...extra}`.
- `near(point,radius,filter=null)` living units only. `spawn(def,side,point,lane,opts={count,groupId})` returns units; no resource reward for summons.
- `fx(type,x,y,opts={})`, `push(target,awayFrom,distance)`.

Unit `{id,def,side,lane,x,y,radius,hp,maxHp,shield,maxShield,stats,alive,born,hits,shots,memory:{},statuses:[],groupId,targetId}`. Numeric stats cloned, never mutate definitions. Castles separate from units, have `isCastle:true` and same health fields. Normalized nested definitions available at `u.def.forms`.

## Agreed rules

20 max mana,12 start,1 mana/1.3s; zero energy/no cap; each paid card deployment earns round((cost/18)*20)/20. 8 unique root cards,4 hand FIFO; selected spells charge sum<=5,one active FIFO after successful cast, energy paid,no invented cooldown. Castle1000 HP,25damage/1s,4tile range,target both. Main300s+always120s overtime if castles live,mana x2. After overtime compare castleHP, equal draw; simultaneous castle death draw.

3 nodes,5s uncontested capture,radius1.25; contested freezes progress, absent attacker resets progress. Owner retained until capture. Each held node +2% regen additive, max6%; no bonus spawn zones. All living nonbuilding units can capture incl flying/summons. Ground/hover follow paths,hover ground-effect immune,flying direct over terrain. Deploy only own-half roads, no unit/tower overlap, no full road block. AI same rules, no hidden-hand reads.

A×B=count×per-hit for ALL cards, including Soldier15x3, target locked through burst. delay in seconds. Numeric source DPS informational, actual damage from timing. Shield split uses shieldtakendamage%, remainder HP, overflow HP. Missing essential attack distance/area/native mechanic locks card; established single-target width fallback500 allowed; '-' inactive stat=0, no Life limit unless authored. Stat ratings aren't gameplay normalization.

Global engine defaults: projectiles8tiles/s; nearby aura radius uses authored Range unless an explicit ability radius exists; no arbitrary missing ability magnitude/duration. No card-only instakill/conversion/copy effects on castles or objectives. Critical resistance reduces critical bonus; flexibility shortens finite negative status duration. Castle shots and spell targeting documented in guide.
