# Arena artwork

The five WebP terrain paintings and transparent structure atlas are stored
locally; rendering does not depend on an external image host. They were created
for this project from the arena layout guides and the user's visual references.
The combined download is approximately 3.9 MiB.

- `maps/verdant-basin.webp`: forest cliffs, three roads, streams and bridges.
- `maps/cascade-hollow.webp`: portrait canyon, two fords, central rock and falls.
- `maps/ember-rift.webp`: portrait volcanic canyon, single road and cooled basin.
- `maps/hollowfen.webp`: swamp, one main road and two hollow-tree side paths.
- `maps/ironveil-prison.webp`: prison cells, three roads and open gate sockets.
- `materials/molten-lava.webp`: drifting molten material for the live lava basin.
- `sprites/arena-structures.webp`: two castles, mana pump and cascade shrine.

Source registration dimensions and pad anchors live in `js/scene-art.mjs`.
A small affine triangle mesh registers measured court centers, well pads and
both bridge entries to the unchanged combat coordinates. The forest bridges
carry traffic along the northern and southern roads, with the creek below the
deck. Their entry coordinates and painted walking polygons are recorded in
`PAINTED_BRIDGES` and checked against the real routes. Castles, wells, capture progress and ownership
are drawn separately, as are active lava, water glints, projectiles and units.
Structure placement uses the center of the stone ground ellipse in each atlas
cell. It does not align the image's bottom edge with the courtyard center.
Castle crops also exclude glow from the next atlas row. The alpha-fit browser
check measures the stone bases independently and verifies the actual draw calls
on all three maps at 50%, 100% and 160% zoom.

`js/projection.mjs` shares each map's transform between rendering, camera input,
fog, deployment fields and minimap. The new maps face north vertically; the
original map keeps its isometric orientation. If a local artwork file cannot
load, the procedural terrain and structures remain available as a fallback.

The hollow trees are static painted scenery with live portal effects at their
registered floor centers. Prison gates are separate animated geometry aligned
to the road graph. Their iron bars and state lights share the camera, minimap
and fog projection; gate state is never baked into the background painting.
