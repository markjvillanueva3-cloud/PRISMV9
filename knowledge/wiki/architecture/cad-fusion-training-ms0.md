# CAD-Fusion Training MS0 — CAD-drawing pattern-recognition training run

**Date:** 2026-05-18 · **Session:** bf6ec9af · **Branch:** `cad-fusion-live-ms0` · **Mode:** `/goal /loop`

## Goal

Train PRISM's CAD-drawing AI models for Fusion 360 using system-viz + Obsidian + PRISM AI/learning systems, from the available prints, programs, and CAD files.

## Fusion-cloud constraint

Fusion 360 designs are stored in Autodesk's cloud (Fusion Team / Autodesk Drive). Programmatic access requires Autodesk Platform Services (Forge) OAuth credentials — a registered app with client ID/secret. Not available; only 2 `.f3d` files exist locally. **The training pivoted to the real local corpus.**

## Why the pivot is sound

CAD pattern recognition operates on **B-rep solid geometry** — faces, edges, surfaces, volumes — which is authoring-app-agnostic. STEP/IGES are neutral interchange formats carrying the identical geometry any CAD would produce. So feature recognition, part classification, GD&T extraction, and DFM patterns trained on Inventor/Mastercam/STEP **transfer directly to Fusion parts**. The only Fusion-specific surface is the *output adapter* (`f360_live_*`, `print_to_fusion360`) — that is code (an API mapping), not a data-hungry training corpus.

## Corpus

| Format | Count | Parseable for geometry |
|---|---|---|
| `.ipt` Inventor part | 5,877 | binary — path-embedding only |
| `.iam` Inventor assembly | 669 | binary — path-embedding only |
| `.idw` Inventor drawing | 309 | — |
| `.sldprt` SolidWorks | 517 | binary — path-embedding only |
| `.dxf`/`.dwg` 2D prints | ~3,100 | text (DXF) |
| `.step`/`.stp`/`.igs` neutral | ~665 | **yes — STEPGeometryParserEngine** |
| `.f3d` Fusion | 2 | — |

11 part-classes, die-dominant (JM Die's core business): die 3,239 · extrude_punch 88 · shaft 71 · plate 51 · casing 19 · bushing/bracket/valve_body/blisk/impeller.

## Two models trained

**1. Similarity-search index** — `cad_training_start` (`CADTrainingPipelineOrchestratorEngine`) over `H:/prism/JM DIE`: scan → ingest → embed → index → validate. 11,762 files → VP-tree 384-d path/filename embedding index. Validation passed (avg similarity 0.544). Queryable via `cad_index_query`, `cad_index_stats`, `cad_training_status`.

**2. Geometry feature corpus** — `mine-step-geometry-evidence.ts` was capped at 50 files/class (only 128 files mined). The cap was made env-overridable (`PRISM_STEP_MINE_CAP`) and a full mine run: **662/665 STEP files parsed (99.5%)**, real per-class B-rep feature prevalences written to `cad-corpus-step-geometry-report.json`.

Sample learned prevalences (count of files showing the feature ÷ class size):

| Class | Top feature evidence |
|---|---|
| die (75) | central_oil_hole 0.95 · bevel_face_chamfer 0.51 · stepped_revolved_axis 0.47 · working_tip_taper 0.44 |
| general (559) | central_oil_hole 0.96 · stepped_revolved_axis 0.90 · cross_drilled_relief_holes 0.84 · bevel 0.75 |
| plate (6) | central_oil_hole 1.00 · stepped_revolved_axis 0.83 · cross_drilled 0.83 |

## Validation result

The mined geometry **confirms** the hand-tuned `CADClassFeatureLibrary` templates — die `central_oil_hole` hand-tuned 0.9 vs geometry-measured 0.947 (within 5%). `cad_class_build_sequence` produces per-class CAD modeling sequences with build hints + rationale (the "how to draw this part" output).

## All-vendor expansion (continuation)

The first training run covered only `H:/prism/JM DIE` and the scanner's `SUPPORTED_EXTENSIONS` was geometry-formats-only — so **Mastercam, Fusion, and hyperCAD project files were silently excluded**. Discovered on a follow-up request to "learn from all the Mastercam files."

Repo file census: **17,346 Mastercam** (`.mcx-8` 14,560 · `.mcx` 2,678 · `.mcx-6` 107 · `.mcam` 1), **888 hyperCAD** `.hmc`, **3 Fusion** `.f3d`.

Fix: `CADTrainingCorpusOrchestratorEngine.SUPPORTED_EXTENSIONS` extended with `.mcx`, `.mcx-5..9`, `.mcam`, `.f3d`, `.f3z`, `.hmc` (CAM-vendor project files carry geometry + toolpaths). The whole repo was re-scanned through `tsx` (the live MCP server runs stale compiled `dist/`, so the source edit was exercised via `tsx`), producing a 31,177-entry corpus, ingested into the live index via `cad_index_ingest`.

**Live index: 31,177 entries** — `.ipt` 10,200 · `.mcx-8` 14,560 · `.mcx` 2,678 · `.iam` 1,175 · `.hmc` 888 · `.sldprt` 525 · `.step` 529 · `.stp` 253 · `.mcx-6` 107 · `.x_b` 107 · `.sldasm` 94 · `.igs` 27 · `.x_t` 25 · `.catpart` 3 · `.f3d` 3 · `.iges` 2.

Caveat: `.mcx`/`.f3d`/`.hmc` are binary CAM project files — the index learns them at the path/name level (part number, customer, operation tokens). Deep toolpath/geometry extraction needs the authoring app's automation API.

## Honest gaps (follow-up units)

- **Wire-to-inference:** `cad_corpus_learn_prevalence` reads the manifest (filename tokens → ~0 signal). The geometry report is the real model but is not auto-blended into the live build-sequence templates; `cad_corpus_apply_learned` blends in-memory with no persistence path. A follow-up should persist the blended model and have `cad_class_build_sequence` read it.
- **Binary CAD:** `.ipt`/`.sldprt` cannot be geometry-parsed without the authoring app — geometry training caps at ~665 STEP files; the other ~11k feed only the path-embedding index.
- **Print↔program join:** mostly miss (55 training triples of 74,809 join rows). Pairing geometry with its NC program is the highest-value future training signal (teaches geometry → operations) — a separate, larger gap.

## Artifacts

- `mcp-server/data/state/CAD_CORPUS_CADPIPE-*.jsonl` — similarity-index corpus
- `mcp-server/data/state/cad-corpus-step-geometry-report.json` — geometry feature-prevalence model (662 files)
- `mcp-server/scripts/mine-step-geometry-evidence.ts` — geometry miner (cap now env-overridable)

Memory: [[reference_cad_fusion_training_2026_05_18]]
