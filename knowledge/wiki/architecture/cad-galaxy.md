---
title: CAD Galaxy — Architecture Map
type: architecture
domain: cad
slot: delta
maintainer: delta
seeded_by: alpha
created: 2026-06-01
tags: [cad, feature-recognition, step-ap242, dfm, fusion-live, electrode, galaxy, delta]
---

# CAD Galaxy — Architecture Map

The CAD galaxy (owned by **slot:delta**) turns a print/model into machine-intelligible geometry + manufacturing features: STEP AP242 round-trip, feature recognition, DFM, electrode/trilobe generation, and the live Fusion 360 bridge. It is the geometry stage of PRISM's print-to-program pipeline. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/cad/MEMORY.md` · doctrine: `mcp-server/src/engines/cad/CLAUDE.md`

## Position in the pipeline

```
blueprint/print (xray OCR)  ─►  CAD (delta: feature-recognition + STEP round-trip)  ─►  CAM strategy (kilo)
            │                              │                                                  │
            │                              ├─► quoting (charlie: auto-quote from print)        │
            └─ multi-PDF / OCR              └─► academy (CAD examples → training corpus)        └─► toolpath
```

CAD ↔ cam (strategy input) · CAD ↔ quoting (auto-quote) · CAD ↔ academy (training corpus) · CAD ↔ NN/GNN (CAD-RAG + CAD-train).

## Engines / surface (canonical counts in the brain)

Per the master-index back-pointer: **75/75 engines wired** across `cad_atomic_ops` + `cad_creo_ribbon` dispatcher surfaces; feature-recognition + STEP AP242 round-trip + electrode/trilobe gen. Filename heuristic for the domain: `cad, dfm, tolerance, feature-recognition, blueprint, assembly, step, iges, parasolid, fusion-live, cad-rag`. Long-running CAD/Fusion session pattern is its own sub-brain (`cad-fusion-live`). Domain guards: a `delta-cad-awareness-inject` hook + a `cad-step-lint` guard (per the delta galaxy card).

## Knowledge indexes

CAD corpus + launcher path atlas: `mcp-server/src/engines/cad/PATHS.md` (129K files / seats / launchers) · CAD-file native reading atlas: [[reference_blueprint_ocr_cad_reading_atlas_2026_05_27]].

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/cad/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`
- [[galaxy-context-federation]] — cad is a federation spoke; rolls up to the master brain
- [[feedback_psn_definition]] — delta is the CAD brain on the PSN engine axis

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the delta galaxy card + master-index back-pointer. Domain owner (delta) refines._
