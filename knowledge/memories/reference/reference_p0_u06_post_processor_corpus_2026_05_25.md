---
name: reference-p0-u06-post-processor-corpus-2026-05-25
description: P0-U06 PRISM-LAUNCH-READINESS-MS0 — post-processor cross-controller validation corpus shipped slot india 2026-05-25
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.263Z
aliases: reference_p0_u06_post_processor_corpus_2026_05_25
---


# P0-U06 — Post-Processor Cross-Controller Validation Corpus

**Shipped:** 2026-05-25 (slot:india /loop continuation of 2026-05-24 PRISM-LAUNCH-READINESS-MS0 Phase 1)
**Milestone:** PRISM-LAUNCH-READINESS-MS0
**Unit:** P0-U06 (post-processor 800-scenario corpus across Fanuc/Okuma/Haas/Heidenhain/Mitsubishi)
**Status:** Phase 1 (400/800 scenarios) — batch-001 v1 (200) + batch-002 v2 (200) both STRUCTURAL 200/200 PASS

## What shipped

3 new files supporting fleet-wide post-processor corpus generation:

1. **`scripts/lib/post-processor-catalog.mjs`** (9 exports) — controller-features catalog (7 dialects), spindle-taper catalog (8 standards), 16 controller-gated optional features, `featureValidForController()` cross-map guard, gwizard machine loader.
2. **`scripts/generate-post-processor-scenarios.mjs`** (v1+v2 dual schema) — stratified parametric generator. v1 = 5-dialect envelope-class; v2 = 7-dialect × 99-real-machine × spindle × controller-gated-features.
3. **`scripts/post-processor-validate-corpus.mjs`** (structural-only + full-runtime modes) — invokes compiled `masterPostProcessorUnifiedAGIEngine.generatePost()` per scenario, emits POST-PROCESSOR-PROVE-OUT-<date>.{json,md}.

Plus 2 batches on disk: `state/shared/scenarios/post-processor/batch-{001,002}/` (manifest + 200 scenarios + index.jsonl each).

## Schema versions

- **v1.0.0 (batch-001):** controller × envelope × cycle × material × axis_count × dialect_features. 5 dialects (fanuc/okuma/haas/heidenhain/mitsubishi). Composite coverage 99.4%.
- **v2.0.0 (batch-002):** + real machine (gwizard) + spindle (taper/rpm/hp/drive_type) + 16 controller-gated optional features + 7 dialects (added siemens + mazak). Composite coverage 91.8% across 9 axes.

## Why batch-002 caught a bug + fixed it the same iteration

First batch-002 run: **29/200 FAIL, all heidenhain** — structural cross-dialect guard fired on `expected_G54_in_heidenhain`. Root cause: `generateCorpus()` force-path flipped `controller.dialect` after 3 retries exhausted, but left `expected_gcode_shape.must_contain` filled with the original sample's fanuc-style tokens. Fix re-derives expected_gcode_shape + re-gates optional_features + re-augments dialect tokens on every force event. Re-run: **200/200 PASS**.

Full tribal entry with 7-step re-derive recipe + anti-regression test: `H:/prism/knowledge/wiki/code-tribal/post-processor-cross-controller-corpus.md`.

## Runtime gap (P0-U06.5, tracked)

Runtime validation against `master_post_generate` returns 0/200 PASS because the engine is a POST-processor — it transforms toolpath SEGMENTS into dialect-correct G-code. My scenarios encode the expected OUTPUT, not INPUT. P0-U06.5 builds the toolpath-stub bridge that synthesizes minimal toolpath segments per scenario operation/cycle for runtime validation to flip from gated to PASS.

## Cross-session impact

- **3 dispatcher wires recommended (audit-derived):** `prism_cam:post_processor_scenario_generate`, `prism_cam:post_processor_validate_corpus`, `prism_dev:post_processor_catalog_query`. Lifts CLI to fleet-wide MCP-callable.
- **3 skills to splice (audit-derived):** `/post-generate`, `/post-validate`, `/post-harden` should invoke these scripts as substeps.
- **1 viz roost extension:** `ghost.post_processor_corpus` — extend `scripts/generate-launch-readiness-features.mjs` to surface batch coverage + pass-rate per controller.
- **Catalog dedup opportunity:** `CONTROLLER_FEATURES` const in catalog lib is a partial reimplementation of `ControllerFeatureMatrixEngine.CONTROLLER_MATRIX` (15+ variants). Future iteration should thin-adapter over the engine catalog.
- **Machine catalog upgrade path:** gwizard-machines.json (99 entries) is the thinnest available. Richer options: `machine-post-enriched.ts` (381K, post-processor-relevant), `machine-kinematics-catalog.ts` (5-axis), `jm-die-profile.ts` (canonical 21-machine test shop per CLAUDE.md §TEST SHOP).

## Slot owner

`india` per [[reference_juliett_12chat_allocation_2026_05_17|JULIETT-12CHAT-ALLOCATION]]-MS0 (post-processor + master-post specialty). All ship + scrutiny + handoff under india slot per soul §1-4.

## How to continue

```bash
# Generate next batches (003/004/005) toward 800-scenario target — different seeds for variance
node H:/prism/scripts/generate-post-processor-scenarios.mjs --target 200 --seed 211 --batch 003
node H:/prism/scripts/generate-post-processor-scenarios.mjs --target 200 --seed 271 --batch 004
node H:/prism/scripts/generate-post-processor-scenarios.mjs --target 200 --seed 397 --batch 005

# Validate (structural-only until P0-U06.5 ships toolpath-stub bridge)
node H:/prism/scripts/post-processor-validate-corpus.mjs --batch 003 --structural-only
```

## Related

- [[reference_launch_readiness_ms0_2026_05_24]] — parent milestone audit
- [[feedback_psn_definition]] — PSN 11-leg taxonomy (this work touches legs 1/3/4/5/6/7)
- [[feedback_parallel_scrutiny_per_file]] — per-file scrutiny that triggered the audit cascade
