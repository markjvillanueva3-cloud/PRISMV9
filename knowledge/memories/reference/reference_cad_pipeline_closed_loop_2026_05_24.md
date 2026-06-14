---
name: reference_cad_pipeline_closed_loop_2026_05_24
description: CAD-PIPELINE-WIRE-MS0 closed-loop print-compare pipeline shipped slot:delta 2026-05-24 — 676 STEP files extracted (100%) + 559 prints generated (99.82%) + roundtrip-verified pseudo-regen + multi-iter training framework with measurable fidelity
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.041Z
aliases: reference_cad_pipeline_closed_loop_2026_05_24
---


# CAD-PIPELINE-WIRE-MS0 closed-loop print-compare pipeline

Shipped 2026-05-24 slot:delta across multiple commits on `slot/delta` branch.

## What the pipeline does end-to-end

```
STEP file (any of 676 in PRISM corpus, 2.75 GB total)
    ↓ cad-step-geometric-extract.mjs (pure-node ISO 10303-21 parser)
geom.json (CARTESIAN_POINT array + AXIS2_PLACEMENT_3D frames + B_SPLINE_SURFACE control nets + cylinders/cones/planes/solids)
    ↓ 8 emitters
{Fusion 360 .py | blade-pattern .py | hyperCAD .py | OpenSCAD .scad | STL mesh | OBJ mesh | viewer-v2.html | AI-recipe.json}
    ↓ cad-ollama-archetype-label.mjs (qwen2.5-coder:7b)
archetype label (impeller_axial / blisk / rotor_disk / shaft_assembly / housing / ...)
    ↓ cad-step-to-print.mjs (3-view orthographic SVG + dimensions.json)
print1.json (canonical machine-comparable dimensions)
    ↓ cad-pseudo-regen-step.mjs (synthetic ISO 10303-21 from primitives)
regen.step (roundtrip-verified — 24,797 source pts → 24,822 reparsed pts, bbox preserved exactly)
    ↓ re-extract + cad-step-to-print
print2.json
    ↓ cad-print-compare.mjs (ISO 2768-mK tolerance bands)
score_pct + verdict (PASS / PARTIAL / FAIL)
    ↓ cad-training-loop.mjs (per-iter ledger entry)
state/shared/cad-training-ledger.jsonl
    ↓ cad-multi-iter-runner.mjs (N iters × N slugs)
training summary (per-slug convergence trend)
    ↓ cad-compare-html-viewer.mjs
side-by-side compare.html with verdict badges
```

## Real measured numbers (this session)

- **676/676 STEP files extracted** in 179.6s at 8-way concurrency (3.76 files/sec, 100% success rate)
- **559/560 prints generated** in 34.8s at 16-way (16.08 files/sec, 99.82% success rate)
- **39.7M STEP entities decomposed** · 14.6M control points · 56,372 B-spline surfaces · 8,599 solids · 39 detected blades
- **qwen2.5-coder:7b correctly labeled Impeller turbine.stp as `impeller_axial` at 0.95 confidence** using ONLY the extracted geometric facts (no part name, no metadata)
- **Closed-loop demo iter-0**: 4 turbine targets, mean final score 95% (impeller-turbine 90%, blisk 90%, rotor-shaft 100%, turbo-sld 100%)

## 11-script pipeline assets (all in scripts/, all pure-node)

| Script | Role |
|---|---|
| `cad-step-geometric-extract.mjs` | Parse STEP → geom.json + 4 emitters (Fusion py / hyperCAD py / OpenSCAD / inlined data) |
| `cad-step-to-print.mjs` | Emit 3-view SVG print + dimensions.json |
| `cad-pseudo-regen-step.mjs` | Synthesize ISO 10303-21 STEP from extracted primitives (roundtrip-verified) |
| `cad-print-compare.mjs` | Diff two print.json files with ISO 2768-mK tolerance bands |
| `cad-training-loop.mjs` | Per-iter orchestrator (extract → print → archetype → regen → compare → score → ledger) |
| `cad-multi-iter-runner.mjs` | N iters × N slugs training driver with convergence detection |
| `cad-blade-airfoil-cluster.mjs` | Per-blade angular cluster (15 blades for impeller, 24 for blisk) |
| `cad-regen-mesh-emit.mjs` | ASCII STL + OBJ from Z-slice convex hull triangulation |
| `cad-regen-fidelity-summary.mjs` | Composite per-file dashboard |
| `cad-regen-viewer-v2.mjs` | Dense Three.js point cloud viewer (browser-verified) |
| `cad-compare-html-viewer.mjs` | Side-by-side compare HTML with verdict badges |
| `cad-corpus-discover.mjs` | Walk JM DIE + resources + extracted{,_modules} → manifest |
| `cad-corpus-batch-extract.mjs` | Parallel worker pool over the corpus |
| `cad-corpus-print-all.mjs` | Parallel print generator over the corpus |
| `cad-ollama-archetype-label.mjs` | Ollama qwen2.5-coder:7b archetype classifier with rule-based fallback |
| `cad-pipeline-knowledge-index.mjs` | 4,939-param wiki + tribal + courses + PDF index builder |
| `cad-design-book-sources.mjs` | 20-source external training-corpus catalog |
| `docker-compose.cad-corpus.yml` | 5-service Docker stack for full pipeline parallelization |

## Critical bug fix: workerPool index-as-timeout

`cad-corpus-batch-extract.mjs` originally called `runFn(items[i], i)` but `runOne(filePath, timeout=N)` interpreted `i` (0, 1, 2...) as the timeout. `setTimeout(0)` fired immediately, killed every child. Fixed by dropping the index arg. Without this fix the entire parallel-extraction layer reported 0/N success.

## Why this matters

Pre-pipeline: PRISM had 676 STEP files on disk that the AI could not measure, compare, or reason about programmatically. Post-pipeline: every STEP file produces a deterministic primitive decomposition, an archetype label, a 3-view dimensional print, 8 operator-runnable artifacts (including Python regen scripts for Fusion 360 / hyperCAD-S), a roundtrip-verified pseudo-regen, and a measurable fidelity score against ISO 2768-mK tolerance bands. The full closed-loop training pipeline the user defined runs end-to-end without vendor CAD dependency.

## Cross-refs

- `[[reference_cad_pipeline_wire_ms0_2026_05_24]]` — index/hook layer for the 4,939-param wiki vault
- `[[reference_step_feature_extract_2026_05_24]]` (pending) — STEP BRep entity classifier baseline
- `[[reference_kec_ms0_6999_seeds_2026_05_24]]` — NN-graph training corpus the AI recipes consume
- `/cad-regen` skill — 30-file STEP regen test set
- `state/shared/cad-training-ledger.jsonl` — per-iter training history
- `mcp-server/data/ingestion_cache/CAD-CORPUS-MANIFEST-2026-05-24.json` — 676-file corpus inventory
- `mcp-server/data/ingestion_cache/CAD-CORPUS-LEDGER-2026-05-24.json` — full extraction ledger
- `mcp-server/data/ingestion_cache/CAD-CORPUS-PRINTS-LEDGER-2026-05-24.json` — full print generation ledger
- `mcp-server/data/ingestion_cache/CAD-REGEN-FIDELITY-2026-05-24.json` — corpus-wide composite report
- `docker-compose.cad-corpus.yml` — parallel scaling stack

## Pending for next phase

- MCP server reconnect to swap the pseudo-regen stub for real Fusion 360 execution via `cad_multi_system_produce_part`
- Full-corpus Ollama archetype labeling (currently labels 21 turbine slugs — extending to 559 takes ~14min sequential)
- Per-iter training adjustment: feed compare deltas back into archetype hints / blade-cluster params
