---
title: Mill Galaxy — Architecture Map
type: architecture
domain: mill
slot: foxtrot
maintainer: foxtrot
seeded_by: alpha
created: 2026-06-01
tags: [mill, milling, vmc, kienzle, jm-die, galaxy, foxtrot]
---

# Mill Galaxy — Architecture Map

The mill galaxy (owned by **slot:foxtrot**) is PRISM's milling-domain intelligence: 3/4/5-axis milling strategy, force/deflection/thermal physics, and the JM Die VMC fleet. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/mill/MEMORY.md` · doctrine: `mcp-server/src/engines/mill/CLAUDE.md`

## Position in the pipeline

```
CAD (delta) ─► CAM strategy (kilo) ─► mill physics + machine (foxtrot) ─► post (echo)
                          │                      │
       feed/speed (oscar) ┘                      └─ JM Die VMC-01..05 (5-VMC fleet)
```

Mill consumes CAM strategy (kilo) + feed/speed (oscar); it owns mill-specific force/deflection/thermal and the VMC machine profiles. Mill ↔ lathe (mill-turn bridges: `Fusion360MillTurnBridgeEngine`, `HyperMillMillTurnBridge`).

## Engines / surface (canonical counts in the brain)

Per the master-index back-pointer: **~222 engines (+17 hyperMILL), `prism_mill` 49 actions, JM Die VMC-01..05**, plus 8 schemas/registries. Full entry-point atlas: [[reference_mill_domain_atlas_for_foxtrot_2026_05_27]]. Physics constants (Kienzle kc1.1, Taylor) import ONLY from `mcp-server/src/physics/constants.ts` — never inline (root CLAUDE.md §SAFETY).

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/mill/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`
- [[galaxy-context-federation]] — mill is a federation spoke; rolls up to the master brain
- [[feedback_psn_definition]] — foxtrot is the mill brain on the PSN engine axis

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the foxtrot galaxy card + master-index back-pointer. Domain owner (foxtrot) refines._
