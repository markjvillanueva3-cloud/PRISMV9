---
name: reference_lora_corpus_wire_2026_06_10
description: "LoRA training corpus measurably grown 746->758 rows (slot:tango 2026-06-10) by wiring fresh galaxy-synthesis data to the CANONICAL path the inventory reads. Found 2 orphans: bridge-reasoning sweep output (35 pairs) is an unregistered inventory source; corpus at 758/1000 for trainingReady. R15 WIRE step for india's LoRA pipeline."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.648Z
aliases: reference_lora_corpus_wire_2026_06_10
---


**LoRA training corpus measurably improved 746 -> 758 rows** (slot:tango, 2026-06-10) -- the R15 WIRE step that makes generated LoRA data actually reach the corpus the GPU fine-tune consumes.

## The pipeline (verified)
producer `scripts/vault-to-lora-dataset.mjs` -> inventory `scripts/build-fleet-training-corpus-inventory.mjs` (static SOURCES array) -> consumer `scripts/assemble-fleet-lora-corpus.mjs` -> `state/shared/lora/fleet-lora-combined.jsonl` (the staged corpus india's GPU fine-tune reads; assembly is read-only, NOT training).

## What I fixed (measured)
The inventory reads the CANONICAL `state/shared/lora/vault-galaxy-synthesis-dataset.jsonl`, but an earlier `--out` wrote to a dated path (`galaxy-synthesis-lora-2026-06-10.jsonl`) the inventory never reads -> the assembler used a stale 501-row version. Regenerated to the canonical path (513 rows) + re-assembled: combined **746 -> 758** (galaxy-synthesis 501->513, 34/34 galaxies covered, feedback 245).

## Two remaining orphans (for india / next pass)
1. **bridge-reasoning sweep output is an UNREGISTERED source.** The `galaxy-reasoning-bridge` LoRA emit (PRISM_GALAXY_BRIDGE_LORA_EMIT=1) writes per-galaxy `state/shared/lora/bridge-reasoning/<galaxy>.jsonl` (35 pairs from the 2026-06-10 sweep), but `build-fleet-training-corpus-inventory.mjs` SOURCES has NO entry for it -> it never reaches the combined corpus. WIRE: concatenate -> one jsonl + add a `{kind:'lora-training-jsonl', advisory:true}` SOURCES entry. Adds 35 (more per sweep -- repeatable, varied questions = distinct deduped pairs).
2. **trainingReady gate: corpus 758 / minTrainingRows 1000.** Needs +242 rows to flip trainingReady False->True. Levers: wire bridge-reasoning (+35), repeated bridge sweeps with varied questions, grow the vault (more feedback/synthesis memories).

## Honest
This is a measured PIPELINE improvement (more assembled training rows, fresh data wired). It is NOT a model-capability lift -- the GPU fine-tune that consumes this corpus is india's lane. trainingReady is still False (758<1000).

## UPDATE -- orphan #1 FIXED (U-FLOR-BRIDGE-LORA-WIRE, commit 4aedb8ab94)
Wired the bridge-reasoning source: galaxy-reasoning-bridge.mjs now ALSO emits each LoRA pair to a single combined sink (state/shared/lora/bridge-reasoning-combined.jsonl, fresh every sweep), + a new SOURCES entry `bridge-reasoning-lora` (advisory:true). MEASURED: combined corpus **758 -> 793 rows**, sources **2 -> 3** (feedback 245 + galaxy-synthesis 513 + bridge-reasoning 35), 34/34 galaxies. Bridge 17/17 tests pass. Remaining: corpus 793/1000 for trainingReady (need +207 -- repeated bridge sweeps w/ varied questions, or vault growth). The orphan is closed; the GPU fine-tune that consumes the corpus stays india's lane.

## UPDATE 2 -- corpus-push attempt (R12 honest: measured growth, trainingReady NOT reached)
Ran a bounded background sweep (8 distinct questions x 34 galaxies, gpt-oss:20b, LoRA-emit on) to push the corpus past the 1000 trainingReady gate. MEASURED: combined corpus 793 -> 823 (+30); bridge-reasoning source 35 -> 65. trainingReady STILL False (823/1000). FINDING: the sweep had LOW distinct-pair yield -- the fast model gave many similar/duplicate grounded answers across varied questions, so ~30 distinct pairs from ~200+ reasons (heavy (instruction,output) dedup). Reaching 1000 via repeated reasoning sweeps is IMPRACTICAL (diminishing returns); the efficient lever is MORE DIVERSE SOURCE CONTENT (vault/feedback growth), not re-reasoning the same per-galaxy doctrine. Stopped the job (R14) vs grinding hours for marginal gain. Net measured LoRA-corpus improvement this session: 746 -> 823 rows (+77, +1 source wired, 34/34 galaxies).
