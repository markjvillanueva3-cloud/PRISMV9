---
name: reference_closed_loop_outcome_thin_data_2026_06_13
description: "The closed-loop outcomes-dataset \"11 rows\" is thin/repetitive SOURCE DATA, not a converter bug -- real fix is upstream outcome-emit enrichment. slot:india 2026-06-13."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.519Z
aliases: reference_closed_loop_outcome_thin_data_2026_06_13
---


# Closed-loop "starvation" (outcomes-dataset 11 rows) = thin source data, NOT a converter bug

Investigated as part of AI-SYSTEMS-MAXOUT. The recurring claim that the closed-loop LoRA dataset is "starved" (`state/shared/lora/outcomes-dataset.jsonl` = 11 rows despite 70K `outcome-bus.jsonl` events) is a **misdiagnosis**. Do NOT patch the converter to emit more rows -- that fabricates training signal from duplicates (R9 garbage-in, exactly what the converter's learnability gate correctly prevents).

## Evidence (live, 2026-06-13)
`node scripts/build-outcomes-lora-dataset.mjs --json`:
- `speed_feed.jsonl`: 10,834 converted -> **10,823 duplicates -> 11 unique**.
- `sinker_edm.jsonl`: 1,231 -> 0 (correctly skipped: `cross_process_stage_complete` pipeline-stage events have no input->output to learn).
- mill/lathe/wedm/grinder/welder: tiny counts, all skipped (non-recommendation events).

Deeper analysis of `state/outcomes/speed_feed.jsonl` (10,834 events):
- **distinct full-context signatures = 3** (context = `{machine_id, engine, action}` only -- e.g. `haas-vf-2 / MachineAwareSpeedFeedEngine / constrain`).
- **distinct recommended-output signatures = 11**.
- The events are the SAME ~11 scenarios repeated thousands of times (repetitive engine/test-loop calls). `context` NEVER carries the determining inputs (material / tool / operation / actual feeds); those would distinguish examples.
- Full event: `recommended.raw` = {unconstrained rpm/feed/power/torque, constrained {...}, constraints.limitingFactor, machine.constraints}. Only ~11 distinct unconstrained-input combos exist in the whole file.

## Verdict
`scripts/lib/outcome-to-alpaca-converter.mjs` + `build-outcomes-lora-dataset.mjs` are **honest by construction**. 11 unique pairs from ~11 distinct real scenarios is correct. The converter is registered `advisory:true` (0.5 weight) so even these are down-weighted.

## REAL fix (upstream, cross-galaxy -- NOT india's converter)
1. The outcome-EMITTING engines (e.g. MachineAwareSpeedFeedEngine -> `state/outcomes/speed_feed.jsonl`) must log the **determining inputs** (material, tool, operation, DOC/WOC, target feeds) in `context`, not just `{machine_id, engine, action}` -- so each calc is a distinct learnable example.
2. Capture **diverse real outcomes** (shop-floor / varied calc inputs), not repetitive test-loop calls.
This is a domain-engine + outcome-tap change (oscar/speed-feed galaxy + the outcome-bus producers), tracked separately. Until then, the closed-loop LoRA signal is honestly thin. [[reference_corpus_rag_pipeline_2026_06_13]] · [[feedback_psn_definition]]
