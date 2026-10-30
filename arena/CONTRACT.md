# Arena implementation contract

Separate static ES-module entry at `arena/index.html`. Do not change Codex JSON.
UI English, native abilities unmodified, no emoji. Source points /1000 = tiles.

## Shared modules

- `js/rules.mjs`: RULES constants, STAT_KEYS, num(), burst(), energyForMana().
- `js/map.mjs`: MAP, routeFor(lane,side), routeLength(points), pointOnRoute(lane,side,walkingDistance), closestRoute(point), courtyardFor(side), isCourtyard(point,side), isWalkable(point), isDeployable(point,side,buildings=[]), distance(a,b), projectSegment(point,a,b).
- `js/vision.mjs`: visibilitySources(state,side) -> `{x,y,radius}[]`, isPointVisible(state,side,point,sources=null), isEntityVisible(state,side,entity,sources=null). Shared by engine, renderer and app; side0 is the player.
- `js/camera.mjs`: ArenaCamera, CAMERA. Presentation-only world-space center, active close battle/lobby overview, resize(), focus(point), home(side=0), panBy(screenDX,screenDY), zoomBy(factor,localScreenAnchor), worldAt(localX,localY), view getter. Center bounded inside MAP; zoom0.8..1.6. Resize preserves focus/zoom; setActive resets view. No simulation mutations.
- `js/catalog.mjs`: loadCatalog(baseURL default relative repository URL), buildCatalog(rawCards,rawSpells), imageFor(raw,parent), formatStat(key,value). Returns `{cards,spells,byId,spellById,forms}`; maps are Maps. Root card has `{id,name,raw,rarity,image,type,stats,attack,combat,forms,ready,reasons}`. stats numeric raw points incl all24 keys; attack `{count,damage,interval,delay}`; combat raw point dimensions. Preserve raw and all authored ability fields. Nested IDs `parent/form-slug`.
- `js/abilities.mjs`: ABILITIES object keyed by card ID; supports hooks `spawn(ctx,u)`, `tick(ctx,u,dt)`, `attack(ctx,u,target,hit)`, `hit(ctx,u,target,result,hit)`, `incoming(ctx,u,source,hit)`, `damaged(ctx,u,source,result,hit)`, `death(ctx,u,killer)`. `attack` and `incoming` mutate hit `{damage,kind,bypassShield,critical,secondary,burstIndex}`. Registry exported with readiness reasons; unsupported/missing essential source facts must lock cards honestly. Do not execute stale effects generically.
- `js/engine.mjs`: ArenaEngine({cards,spells,deck:[id],spellDeck:[id],seed=1,bot=true}). `.state` has `{time,phase,remaining,paused,winner,teams,castles,units,projectiles,effects,events}`. phase regulation/overtime/ended. `.deploy(side,handIndex,{x,y})`, `.cast(side,{x,y})` return `{ok,error,...}`; `.step(dt)` advances fixed ticks, `.setPaused(bool)`. Side0 blue,1 red. Team `{mana,energy,hand:[id],queue:[id],spellIds:[id],spellIndex}`. Same decks/economy for AI.
- `js/renderer.mjs`: ArenaRenderer(canvas); `.draw(stateOrNull,ui={})`, `.worldAt(clientX,clientY)`, `.resize()`, `.destroy()`. `.setBattleView(active)`, `.focusAt(point)`, `.home()`, `.panBy(dx,dy)`, `.zoomBy(factor,anchor)` sync camera projection; `.drawMinimap(canvas,state,side=0)`, `.minimapWorldAt(canvas,clientX,clientY)` share that projection. UI `{placement:{x,y,valid},selectedCard,selectedUnitId,spellSelected}`. Renderer tolerates missing images and empty state, scales to canvas CSS size / DPR. Full-island terrain atlas cached at maximum zoom; pan only transforms it. Fog cache includes camera scale/offset; minimap retains independent full-map fog and viewport rectangle.
- `js/app.mjs` controls entry, load/deck/inspection/HUD/pause/result/UI, imports above. HTML/CSS owned with app.

## Engine/ability context

Context is engine. Getters `time`, `units`, `castles`, `teams`; `random()` deterministic RNG. Methods:

- `damage(source,target,amount,options={kind:'attack',bypassShield:false,critical:false,secondary:false})` -> `{healthDamage,shieldDamage,total,killed}`. Handles reduction/shield/dodge and incoming/damaged; attack resolution calls ability hit exactly once for direct actual hits.
- `heal(target,amount,source=null)`, `giveShield(target,amount)`.
- `status(target,kind,duration,magnitude=0,source=null,extra={})` adds/refreshes status `{kind,until,magnitude,sourceId,...extra}`.
- `near(point,radius,filter=null)` living units only. `spawn(def,side,point,lane,opts={count,groupId})` returns units; no resource reward for summons.
- `canTarget(source,target)` checks enemy layer, concealment and current team sight. Use for native mechanics that choose an individual enemy (Sheriff marks, Shellbyte leap); unfiltered `near` remains appropriate for auras and area damage.
- `fx(type,x,y,opts={})`, `push(target,awayFrom,distance)`.

Unit `{id,def,side,lane,x,y,radius,hp,maxHp,shield,maxShield,stats,alive,born,hits,shots,memory:{},statuses:[],groupId,targetId}`. Numeric stats cloned, never mutate definitions. Castles separate from units, have `isCastle:true` and same health fields. Normalized nested definitions available at `u.def.forms`.

## Agreed rules

20 max mana,12 start,1 mana/1.3s; zero energy/no cap; each paid card deployment earns round((cost/18)*20)/20. 8 unique root cards,4 hand FIFO; selected spells charge sum<=5,one active FIFO after successful cast, energy paid,no invented cooldown. Castle1000 HP,25damage/1s,7.5tile range,target both. Main300s+always120s overtime if castles live,mana x2. After overtime compare castleHP, equal draw; simultaneous castle death draw.

3 nodes,5s uncontested capture,radius1.25; contested freezes progress, absent attacker resets progress. Owner retained until capture. Each held node +2% regen additive, max6%; no bonus spawn zones.

Map43x28, castles(4,14)/(39,14). Center straight35tiles, centerwell17.5walkingtilesfromeithercastle. Outerroads46.45536tiles, outerwells23.22768walkingtilesfromeithercastle; do notbendcentertoequalizelengths. Ground/hover follow roadsORcourtyards,hover ground-effect immune,flying direct over terrain. Deploy only withinowncastle7.5radius onroadsORcourtyard, no unit/tower overlap, no full road block. Castlebodyradius1.05; courtyard rear1/front2.5/side1 margins frombody, clearancesCANdeploy. AI same rules, no hidden-hand reads. BrowserimportmapversionsALLmodulesincludingvision/cameraatomicallyv5tokeepcachedpriorreleasesfrommixinggeometry.

Battle camera close enough to require panning on every screen; lobby overview fits island. Mouse/touch movement>6px pans and never deploys/inspects on release; short tap places/inspects; hand-to-map drag still deploys. Pointer capture, cancel/lost-capture cleanup prevent stuck gestures. Minimap input moves camera only; no unit/spell action. WASD/arrows/scroll pan; Home/Space returns home; +/- or Ctrl/Meta-wheel zoom. Form/modal keyboard input unaffected. Minimap enemy markers/ownership follow the same team-vision predicates; no sight gained from camera position.

Current-sight fog: alliedlivingcards reveal8tiles, ownedpumps4tiles, ownlivingcastle7.5tiles (startingvision). Unionofcircles; noexploredmemory, losingsourcehidesagain. Radius is independent of sourcecardVisioncombatstat. UnseenmapopaqueBLACK; hiddenenemyunits/castles/projectiles/effects notdrawn. Sharedvisionpredicate gatesenemyacquisition/AIknowledge/clickinspection/selection. UnseenenemycastleHP='?', healthbar0, data-visible=false; unseenwellHUDdata-owner='unknown', noprogress/owner/capturingleak. Concealed statuses apply in entitypredicate. Placementpreview usesonlyvisibleoccupants. Noeventsfeedmayleakunseenactions. Fullmappreviewallowedinlobby; finalcastlestatsallowedafterended. Debugenginestateislocalnotasecurityboundary.

A×B=count×per-hit for ALL cards, including Soldier15x3, target locked through burst. delay in seconds. Numeric source DPS informational, actual damage from timing. Shield split uses shieldtakendamage%, remainder HP, overflow HP. Missing essential attack distance/area/native mechanic locks card; established single-target width fallback500 allowed; '-' inactive stat=0, no Life limit unless authored. Stat ratings aren't gameplay normalization.

Ranged firing reach=_range(u), including authored Vision/blindness caps; melee reach=attackDistance/1000. Ranged shots travel max(authored attackDistance/1000,current firing reach), preventing a 500-point source travel value from forcing a 4000-Range marksman into contact. Separate ranged multi-target acquisition uses firing reach and team sight. Source combatStats/stat values are never rewritten. Ranged portrait bodies use an aimed emitter/muzzle flash; melee bodies retain blades.

Global engine defaults: projectiles8tiles/s; nearby aura radius uses authored Range unless an explicit ability radius exists; no arbitrary missing ability magnitude/duration. No card-only instakill/conversion/copy effects on castles or objectives. Critical resistance reduces critical bonus; flexibility shortens finite negative status duration. Castle shots and spell targeting documented in guide.
