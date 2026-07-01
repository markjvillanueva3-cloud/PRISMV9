---
name: cad-fusion-training-2026-05-18
description: "CAD-drawing AI training run — 11,762-file similarity index + 662-file STEP geometry corpus; Fusion cloud unreachable, pivoted to Inventor/STEP (transferable at B-rep level)"
aliases: reference_cad_fusion_training_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.494Z
---


2026-05-18 (session bf6ec9af, `/goal /loop`). Trained PRISM's CAD-drawing pattern-recognition models from the JM Die corpus, on branch `cad-fusion-live-ms0`.

**Fusion cloud — unreachable.** Fusion 360 designs live in Autodesk's cloud; programmatic access needs Autodesk Platform Services (Forge) OAuth credentials. Only 2 `.f3d` files exist locally. **Pivoted to the real corpus** — Inventor-dominant: 5,877 `.ipt`, 669 `.iam`, 309 `.idw`, 517 `.sldprt`, ~3,100 `.dxf`/`.dwg`, ~665 STEP. Transferable because CAD pattern recognition runs on **B-rep solid geometry**, which is authoring-app-agnostic (STEP/IGES are neutral). The Fusion-specific layer is the *output adapter* (`f360_live_*`, `print_to_fusion360`) — code, not a training corpus.

**Trained — two complementary models:**
1. **Similarity-search index** — `prism_cad:cad_training_start` rootPath=`H:/prism/JM DIE` → scanned 11,762 CAD files → VP-tree 384-d path/filename embedding index. Validation passed (avg sim 0.544). Live: `cad_index_query` / `cad_index_stats` / `cad_training_status`. Corpus JSONL: `mcp-server/data/state/CAD_CORPUS_CADPIPE-*.jsonl`.
2. **Geometry feature corpus** — made `mine-step-geometry-evidence.ts` cap env-overridable (`PRISM_STEP_MINE_CAP`, was hardcoded 50/class) and ran a full mine: **662/665 STEP files parsed (99.5%)**, real per-class B-rep feature prevalences → `mcp-server/data/state/cad-corpus-step-geometry-report.json` (was only 128 files). die: `central_oil_hole` 0.95, `bevel_face_chamfer` 0.51, `stepped_revolved_axis` 0.47. general (559 files): `central_oil_hole` 0.96, `stepped_revolved_axis` 0.90.

**Validation finding:** mined geometry **confirms** the hand-tuned `CADClassFeatureLibrary` templates (die `central_oil_hole`: hand-tuned 0.9 vs geometry-measured 0.947 — within 5%). `cad_class_build_sequence` produces per-class CAD modeling sequences (the "how to draw it" output: e.g. punch = revolveStepProfile → tip taper → oil hole → cross-drills → base chamfer → shoulder fillets).

**All-vendor expansion (follow-up — user: "learn from all the Mastercam files... same for Fusion, hyperCAD, SolidWorks, STEP, IGES, Inventor"):** the scanner's `SUPPORTED_EXTENSIONS` was geometry-only → Mastercam/Fusion/hyperCAD silently excluded. Census: 17,346 Mastercam (`.mcx-8` 14,560 / `.mcx` 2,678 / `.mcx-6` 107 / `.mcam` 1), 888 hyperCAD `.hmc`, 3 Fusion `.f3d`. Extended `CADTrainingCorpusOrchestratorEngine.SUPPORTED_EXTENSIONS` with `.mcx`/`.mcx-5..9`/`.mcam`/`.f3d`/`.f3z`/`.hmc`; re-scanned the whole repo via `tsx` (live MCP runs stale `dist/`) → 31,177-entry corpus → `cad_index_ingest` into the live index. **Live index now 31,177 entries** covering every vendor. `.mcx`/`.f3d`/`.hmc` are binary — learned at path/name level only.

**Honest gaps / follow-ups (R12):**
- `cad_corpus_learn_prevalence` reads the manifest (filename tokens) → ~0 signal. The geometry report is the real model but is **not auto-blended into the live build-sequence templates** — `cad_corpus_apply_learned` does an in-memory blend with no persistence path. Wire-to-inference is a real follow-up unit.
- `.ipt`/`.sldprt` are binary → geometry parsing caps at the ~665 neutral STEP files; the other ~11k feed only the path-embedding index.
- print↔program join is mostly miss (55 training triples of 74,809 rows) — separate, larger gap; the highest-value future training signal (geometry → operations).

Related: [[reference_feature_gap_audit_cad_dedup_wins_2026_05_18]] · [[feedback_ai_training_first_before_revenue]]
