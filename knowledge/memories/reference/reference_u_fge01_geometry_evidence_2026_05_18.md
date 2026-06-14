---
name: reference_u_fge01_geometry_evidence_2026_05_18
description: "U-FGE01 (commit 62b5794101, slot mike 2026-05-18 iter 1) — wires the trained STEP geometry corpus (cad-corpus-step-geometry-report.json, 662/665 files, evidence counts per part_class) into CADClassFeatureLibraryEngine.buildSequenceFor inference. Closes the gap named in [[reference_cad_fusion_training_2026_05_18]]: 'geometry model not auto-wired into build-sequence inference'."
aliases: reference_u_fge01_geometry_evidence_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.001Z
---


**Date:** 2026-05-18 slot mike, `/checkin-mike /loop` autonomous /loop iter 1.

**Context:** User goal — "train cad and cam ai systems so they can accurately read prints, generate cad files relative to prints then generate cnc programs with cam. start with fusion360." [[reference_cad_fusion_training_2026_05_18]] named the gap left by yesterday's training run.

**What ships (3 files, commit 62b5794101):**

- **`mcp-server/src/engines/CADClassFeatureLibraryEngine.ts`** — new public method `buildSequenceForEvidence(partClass, opts)`. Same intent as the existing `buildSequenceFor` but ranks features by LIVE corpus evidence (`count / files_examined`) instead of static template prevalence. Pure (no I/O — caller injects `corpus_report`). Fallback to template prevalence with R12-honest caveat when corpus missing/sparse/malformed. **Drift caveats** fire when `template_prevalence ≥ 0.7` but `corpus_evidence_ratio < min_evidence_ratio` (signals retrain need). New exported types `CADCorpusStepGeometryReport`, `BuildSequenceEvidenceOpts`, `BuildSequenceEvidenceResult`. New module-level const `DRIFT_TEMPLATE_PREVALENCE_THRESHOLD = 0.7` (no inline magic per engines.md).
- **`mcp-server/src/tools/dispatchers/cadDispatcher.ts`** — new action `cad_class_build_sequence_evidence` added to z.enum + new case block. Loads `mcp-server/data/state/cad-corpus-step-geometry-report.json` with: **16MB byte cap** (matches `ask-ollama.mjs` / `regen-viz` V8 string-cap class — three prior fixes this month for the same bug), **fs.stat pre-check + shape validation** (`per_class must be Array`), **CWD-independent path resolution** via `import.meta.url` (process.cwd() flakes when launched from service wrappers), **R12 fail-loud**: `success: false` when read fails so callers don't silently consume template-fallback thinking it's evidence-driven. Returns `{success, data: {sequence, count, caveats, corpus_class_found, corpus_report_path, corpus_read_error, degraded}, error?}`.
- **`mcp-server/src/__tests__/CADClassFeatureLibraryEngine.test.ts`** — 13 new test cases under `describe("CADClassFeatureLibraryEngine.buildSequenceForEvidence")`: rank-by-ratio, default 0.3 filter, custom threshold, drift caveats firing, null corpus fallback, no-class fallback, plate-with-no-template fallback, malformed corpus, divide-by-zero (`files_examined=0`), sparse corpus fallback-with-corpus_class_found=true, tie-break by template prevalence, diagnostic surface invariants, **NaN-poison regression** (corrupt counts like `{nested: 5}` or `"garbage"` → `Number({...}) = NaN` → drift surface silently suppressed without the `Number.isFinite` guard). 35/35 total tests PASS (34 existing + 1 new — vitest counts them as 35 incl. the parent describe block).

**Per-file scrutiny round 1 — 2 reviewers (`code-analyzer` arm A + `reviewer` arm B):**
- A verdict: FAIL with 2 P0 + 2 P1 — DoS risk on unbounded JSON.parse, CWD-dependent silent-degrade, R12 success-on-read-fail, NaN-poison drift suppression.
- B verdict: PASS with 4 P1 (same observations less aggressively framed) — `as never` cast hiding type integrity, NaN propagation in evidence_ratio, CWD coupling, undocumented drift threshold.

All 4 P0/P1 findings addressed pre-commit:
1. 16MB byte cap + fs.stat (DoS guard)
2. import.meta.url anchoring (CWD-independent)
3. `success: false` on read failure (R12)
4. `safeCount()` helper with `Number.isFinite` guard (NaN-poison defense) + extracted `DRIFT_TEMPLATE_PREVALENCE_THRESHOLD` constant

**Lessons:**
- **R8 dedup-preflight via /master-index NOT engine-list grep**: `cad_class_build_sequence` exists; my new action is `cad_class_build_sequence_evidence` (additive, _evidence suffix). Same engine, new method, new dispatcher action — preserves the existing API exactly.
- **Test data MUST match the actual template**: my first cut used `part_class: "die"` for a corpus with `central_oil_hole` counts — but the `die` template doesn't have `central_oil_hole` (only `stepped_revolved_axis`, `ejector_pin_hole`, `vent_groove`, `datum_relief`). 5 tests failed before I read the template definition. Switched to `extrude_punch` which actually has those features. **Read the template before writing the test corpus.**
- **Drift caveat must run BEFORE the early-return for empty ranked**: first cut returned early when `ranked.length === 0` (fallback path) without running the drift loop — but that's exactly when drift signal is most useful (corpus says feature is rare). Moved drift loop above the early return.

**Companion this session:** [[reference_u_bpa_consumer_2026_05_18]] (sibling unit iter 2 — the closed-loop activator for the OCR/RAG/LoRA infra).

## Related
[[reference_cad_fusion_training_2026_05_18]] · [[feedback_always_build]] · [[reference_u_bpa_consumer_2026_05_18]]
