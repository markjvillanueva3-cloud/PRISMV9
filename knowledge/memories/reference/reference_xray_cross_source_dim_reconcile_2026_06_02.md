---
name: reference_xray_cross_source_dim_reconcile_2026_06_02
description: CrossSourceDimensionReconciliationEngine — fuses print-OCR + CAD-geometry + CNC-toolpath dim candidates into consensus dims + flagged conflicts; wired prism_cad cad_dimension_reconcile
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.067Z
aliases: reference_xray_cross_source_dim_reconcile_2026_06_02
---


**XRAY cross-source dimension determination** (commit `a57ef19c2d`, slot:xray, 2026-06-02). The verifiable CORE of the active goal "use all JM prints + CAD models + CNC programs to determine dimensions."

`mcp-server/src/engines/CrossSourceDimensionReconciliationEngine.ts` — PURE reconciliation math (no I/O, no VLM). Candidates `{value_mm,type,source:"print"|"cad"|"cnc",confidence?,label?}` in → `ReconciliationReport {dimensions,conflicts,coverage}` out.
- **Cluster** within `type` by value-within-tolerance (single-linkage, sorted) → one `ReconciledDimension` per cluster.
- **Consensus value** = confidence-weighted mean (a more-trusted source pulls the value toward its reading).
- **Confidence** = noisy-OR `1−Π(1−cᵢ)` over DISTINCT sources only (two reads from one source are NOT independent corroboration), capped 0.99. 3 agreeing sources → 0.99 confirmed; 2 → 0.985; lone source → its prior.
- **Per-source priors** `{cad:0.95, cnc:0.90, print:0.70}` (CAD = authoritative model; CNC = actual cut w/ approach noise; print OCR = operator-confirm floor). Caller overrides per-candidate.
- **Tolerance** mirrors the proven OCR scorer band: 1% relative + 0.05mm absolute floor; angular = 0.5° band. NOT physics constants.
- **Conflicts** = same `label` landing in ≥2 distinct clusters → flagged `DimConflict` (operator review), **never averaged** (R12). Unlabeled same-type features → distinct dims, no false conflict.
- Drops non-finite / invalid-source candidates and COUNTS them (`candidates_dropped`) — surfaced, not hidden.

Wired: `prism_cad:cad_dimension_reconcile` (3 additive edits to `cadDispatcher.ts` — import + ACTIONS entry + switch case; no `cadActionSchemas` entry needed — `validateActionParams` passes through unmapped actions). Tests: 19 engine (`CrossSourceDimensionReconciliationEngine.test.ts`) + 3 round-trip (`cadDispatcher.dimensionReconcile.test.ts`) = 22/22.

**Gotcha:** the dispatcher runs results through `slimResponse()` (`responseSlimmer.ts:24`) which STRIPS empty arrays — so an empty report returns `dimensions`/`conflicts` ABSENT, not `[]`. Round-trip tests must assert `res.data.dimensions ?? []`. Strict `[]==[]` lives in the engine test (direct).

Composes with `BlueprintProgramJoinEngine` (joins print↔program by part-number) — join answers "which sources are the same part", this engine answers "what is the consensus dim + where do they conflict."

**NEXT ITER (real-candidate sourcing — the integration layer atop this core):** build 3 thin source-adapters feeding `DimCandidate[]` — (a) print: from the existing OCR extraction store (NEVER re-OCR; search `mcp-server/data/jm-die-database/` + Docustrata + Qdrant); (b) cad: STEP/solid geometry measure (INCH→mm normalize, JM STEP is `CONVERSION_BASED_UNIT 25.4`); (c) cnc: G-code coordinate-span analysis. A survey workflow over JM parts that have all 3 sources is the beneficial-workflow candidate. Builds on `[[reference_xray_ocr_closed_loop_2026_06_01]]`.

Pre-existing (NOT mine): 7 tsc errors in `cadDispatcher.ts` (LoRATrainingPair/CapabilityAccuracyOptions/DrawAnyPartInput at lines 3262/4086-4091/4708) — unrelated type debt, untouched.
