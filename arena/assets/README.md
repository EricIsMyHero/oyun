# Arena artwork

The three WebP terrain paintings and transparent structure atlas are stored
locally; rendering does not depend on an external image host. They were created
for this project from the arena layout guides and the user's visual references.
The combined download is approximately 2.7 MiB.

- `maps/verdant-basin.webp`: forest cliffs, three roads, streams and bridges.
- `maps/cascade-hollow.webp`: portrait canyon, two fords, central rock and falls.
- `maps/ember-rift.webp`: portrait volcanic canyon, single road and cooled basin.
- `materials/molten-lava.webp`: drifting molten material for the live lava basin.
- `sprites/arena-structures.webp`: two castles, mana pump and cascade shrine.

Source registration dimensions and pad anchors live in `js/scene-art.mjs`.
A small affine triangle mesh registers the painted courts and well pads to the
unchanged combat coordinates. Castles, wells, capture progress and ownership
are drawn separately, as are active lava, water glints, projectiles and units.

`js/projection.mjs` shares each map's transform between rendering, camera input,
fog, deployment fields and minimap. The new maps face north vertically; the
original map keeps its isometric orientation. If a local artwork file cannot
load, the procedural terrain and structures remain available as a fallback.
