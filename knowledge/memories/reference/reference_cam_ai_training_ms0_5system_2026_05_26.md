---
name: reference-cam-ai-training-ms0-5system-2026-05-26
description: "CAM-AI-TRAINING-MS0 closeout — 5-system catalog (141 templates), 3766-tuple MASTER LoRA training set across 8 tracks (template + physics + param + cross-system + ISO 286 + finish + coolant + operator-gate), 100% real-data provenance, 29/29 integration tests, train/holdout split stratified."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.047Z
aliases: reference_cam_ai_training_ms0_5system_2026_05_26
---


# CAM-AI-TRAINING-MS0 closeout reference (2026-05-26, slot kilo, /goal 100-iter)

Final corpus state after kilo iter 22-93 of the YOLO sleep-run:

## 5-system catalog
hyperMILL 23 ops · Mastercam 17 · Esprit 18 · Fusion 360 48 · NX CAM 35 = **141 CamTemplates**, all with real-data provenance.

NX CAM was added iter 74 as a 5th system after the initial 4-system close-out — richest catalog in the fleet (37 ops, 495 flattened params, 95% mapped). Brought 493 real catalog defaults to the parameter-recommendation track (was 0/143 before).

## MASTER training set: 3766 LoRA tuples across 8 tracks
1. **template-lora-v2** (987) — 7 prompt patterns × 141 templates × 5 systems
2. **physics-grounded** (1520) — sub-merged: 210 speeds-feeds + 726 tool-life + 264 Kienzle + 320 deflection
3. **param-recommendation** (691) — per-(op,parameter) with NX CAM's real catalog defaults
4. **cross-system-translation** (108) — vendor-to-vendor operation equivalence
5. **iso286-fit** (312) — ISO 286-1 IT-grade classification (13 bands × 8 grades × 3 prompts)
6. **surface-finish** (52) — Ra → finishing-strategy mapping
7. **coolant-decision** (54) — 18 cases × 3 prompts (all 10 priority-chain rules)
8. **operator-gate** (42) — 12 pre-cut checklist items × 3 prompts + 6 S(x) scenarios

Zero dupes after dedup by `JSON.stringify(messages)`. Track-annotated for ablation studies.

## Stratified train/holdout
3206 train + 560 holdout (85.1/14.9). Every track present in both splits (zero zero-holdout tracks). Deterministic sha256(track::idx::prompt) bucket. See `cam-master-split-summary.json`.

## Real-data discipline
[[feedback_real_data_only_2026_05_25]] — operator HARD constraint *"no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)"* enforced via `validate-cam-master-corpus.mjs` (iter 91): **3766/3766 pass** — every tuple carries verbatim provenance.

## Physics constants are real
- Kienzle kc1.1 per ISO group: P=1800, M=2100, K=1100, N=700, S=2800, H=3200 (PRISM canonical)
- Taylor V*T^n=C tabled per material; family multipliers from CAMTaylorToolLifeEngine
- Euler-Bernoulli δ=FL³/(3EI), I=πd⁴/64, E moduli: carbide 580, HSS 210, tool steel 200, cobalt HSS 220, PCD 1050 GPa
- ISO 286-1:2010 Annex B IT-grade µm table verbatim across 13 size bands × 8 grades

## Integration test surface
`mcp-server/src/__tests__/CAMCorpusInventoryIntegrationTest.test.ts` — **29/29 PASS**. Asserts exact counts per track, provenance fields, train+holdout=master, manifest v2.0.0, every CamTemplate + every physics tuple carries the operator constraint.

## Files (state/shared/corpus/)
Inventory: `CORPUS-INVENTORY-2026-05-26.md` (kept fresh through iter 92).
Master jsonl: `cam-master-training-set.jsonl` (3766 tuples, ~3.4 MB).
Master split: `cam-master-train.jsonl` (3206) + `cam-master-holdout.jsonl` (560).
Validation report: `cam-master-corpus-validation.json` (100% pass).
Training manifest: `cam-training-manifest.json` schemaVersion 2.0.0.

## What this corpus does NOT cover (deferred)
- The 100k+ STEP/CAD-files accuracy run depends on **delta's CAD ingest** which is still in progress; CADAccuracyScorerEngine + BlueprintCalloutParserEngine (iter 45-46) are ready to score once delta lands files.
- MCP dispatcher TypeScript wiring (camAITrainingDispatcher.ts) deferred — dispatcher manifest + action schemas (60 actions) shipped iter 58/66 as build-ready stubs; TS dispatcher implementation is cross-milestone.
- NN/GNN tier-5 wiring of the master training set into PRISM's wiring-inference cascade is out of scope for MS0 — sits with the NN-GRAPH team.

## Regen path
Every emitter is idempotent and runnable independently. Full regen sequence documented in `CORPUS-INVENTORY-2026-05-26.md` §Regen commands. `verify-cam-training-corpus.mjs` runs the full health check post-regen.
