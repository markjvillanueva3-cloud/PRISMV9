---
title: CAM Galaxy — Architecture Map
type: architecture
domain: cam
slot: kilo
maintainer: kilo
seeded_by: alpha
created: 2026-06-01
tags: [cam, toolpath, strategy, hypermill, mastercam, cross-vendor, galaxy, kilo]
---

# CAM Galaxy — Architecture Map

The CAM galaxy (owned by **slot:kilo**) selects machining strategy and generates + validates toolpaths, then transfers them across vendor CAM systems. It sits between CAD geometry and post-processor emission. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/cam/MEMORY.md` · doctrine: `mcp-server/src/engines/cam/CLAUDE.md`

## Position in the pipeline

```
CAD geometry (delta)  ─►  CAM (kilo: strategy → toolpath → collision-check)  ─►  post-processor (echo)
        │                          │                                                  │
        └─ features                ├─ feed/speed from speed-feed (oscar)              └─► machine-ready NC
                                   └─ workholding / fixture
```

CAM ↔ cad · CAM ↔ mill/lathe/wedm · CAM ↔ post-processor · CAM ↔ NN/GNN. Echo consumes kilo's toolpaths; kilo consumes oscar's feed/speed.

## Engines / surface (canonical counts in the brain)

Per the master-index back-pointer: **60+ `CAM*.ts` engines + the hyperMILL family, 6 tier-1 CAM bridges** (Fusion 360, hyperMILL, Mastercam, Esprit, Inventor HSM, SolidWorks), and the **`prism_cam` triad** `cam_strategy_recommend → toolpath_generate → collision_check_full`. Filename heuristic: `cam, toolpath, strategy, hypermill, fusion-cam, mastercam, esprit, nx-cam, powermill, workholding, fixture`. Corpus paths: [[reference_cam_corpus_locations]] (Mastercam X8 + hyperMILL 31/33 + OPEN MIND E-Learning + JM Die in-house — read before webscraping CAM samples).

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/cam/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`
- [[galaxy-context-federation]] — cam is a federation spoke; rolls up to the master brain
- [[feedback_psn_definition]] — kilo is the CAM brain on the PSN engine axis

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the kilo galaxy card + master-index back-pointer. Domain owner (kilo) refines._
