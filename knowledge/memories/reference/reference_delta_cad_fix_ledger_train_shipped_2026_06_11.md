---
name: reference_delta_cad_fix_ledger_train_shipped_2026_06_11
description: SHIPPED -- delta's CAD closed-loop persist->retrain arc closed on real data. cad-fix-training-ledger.jsonl (80 corrections) -> 27 CAD-gen LoRA pairs in the fleet corpus. Supersedes the stale 'fix-ledger absent' premise.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.541Z
aliases: reference_delta_cad_fix_ledger_train_shipped_2026_06_11
---


**SHIPPED (slot:india, 2026-06-11, commit U-CAD-FIX-LEDGER-TRAIN):** closed delta's CAD closed-loop persist->retrain arc on REAL data. This SUPERSEDES [[reference_delta_cad_learn_loop_persistence_gap_2026_06_11]]'s "fix-ledger absent" premise (which copied the DELTA-CONTEXT-LEDGER §3 A3 stale claim -- R12: "read the body, not the title").

**The real state (verified):** `state/shared/cad-fix-training-ledger.jsonl` DOES exist -- 80 rows, all `kind:"missing-feature"`, all `trainsCadGen:true`, 5 parts (die/plate/casing/extrude_punch/bracket). Schema: `{v,ts,domain,kind,part,field,wrong,right,source,note,cycleId,trainsPrintReader,trainsCadGen,trainsCam}`. Delta's loop (`cad-fusion-correction-loop-live.mjs` :18365) persists each verified correction here (with before/after scorePct in `cad-correction-loop-live-ledger.json`). The OPEN arc was: NO consumer + NOT a registered training source -> the 80 corrections evaporated (never reached the CAD-gen LoRA corpus).

**Built (R15 wire+test+validate):** `scripts/lib/cad-fix-ledger-to-training.mjs` (pure converter, 8/8 tests) reads the REAL schema -> CAD-gen Alpaca pairs, gated on `trainsCadGen`, kind-aware (missing-feature explicit + generic fallback so a future kind isn't dropped). `scripts/build-cad-fix-training-dataset.mjs` producer -> `state/shared/lora/cad-fix-training-dataset.jsonl`. Registered `cad-fix-training-corrections` as an advisory (0.5) lora-training-jsonl source in `build-fleet-training-corpus-inventory.mjs` -> `assemble-fleet-lora-corpus.mjs` auto-folds (manifest-driven, no assembler change). VALIDATED LIVE: 80 corrections -> **27 unique CAD-gen pairs** (53 dup = same feature re-corrected across cycles, 0 invalid); fleet corpus **1192->1219**, trainingReady true, 34 galaxies. Sample pair: instruction "CAD generation from print -- die part. Is the 'central_oil_hole' feature required?" -> output "Yes. REQUIRED (evidence_ratio 0.95). A prior regeneration omitted it; the generator must model this feature."

**Net:** the CAD generator's LoRA now trains on its OWN measured mistakes -> self-improving ACROSS sessions, not just within one. This is the same outcome->training pattern as the fleet [[reference_dream_cycle_galaxy_cascade_2026_06_11]] / U-OUTCOME-LORA-WIRE work, cloned to the CAD grain. REMAINING (delta/operator lane, gated): the GPU LoRA fine-tune RUN (cu128 venv -- py3.14 has no sm_120 wheels) that consumes this corpus; GPU CAD-RAG re-embed (768d->1024d); operator-gated C1 `U-MERGE-SLOT-DELTA` (unlocks 410 commits). The "100% accuracy" target is bounded by the proven ~1.5% NURBS-regen ceiling (exact = re-import, not regeneration) -- this closes the LEARNING arc, which is the buildable meaning of "complete the closed loop".

**Lesson:** when a ledger says an artifact "doesn't exist," GLOB for it before believing the doc -- it may have been built since. The arc was 90% there (measure+correct+persist); only the consumer (persist->train) was missing. Find the real data, build on it, don't re-plan around a stale absence claim.
