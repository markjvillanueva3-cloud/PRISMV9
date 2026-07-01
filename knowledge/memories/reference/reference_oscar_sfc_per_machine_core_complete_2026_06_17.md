---
name: reference_oscar_sfc_per_machine_core_complete_2026_06_17
description: "SFC per-machine CORE full-combination sweep is 100% COMPLETE (19.6M cells, 0 failed); concurrency oversubscription fixed; 222GB fleet outcome-ledger orphan found"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.710Z
aliases: reference_oscar_sfc_per_machine_core_complete_2026_06_17
---


SFC per-machine full-combination sweep — CORE space **100% COMPLETE** (2026-06-17, slot:oscar).

**What is done (do NOT re-grind):**
- **CORE space = 200/200 shards, 19,574,784 cells, 0 failed.** This is the *achievable complete* per-machine combination space (Path 1). Proven by the rollup: `state/outcomes/sfc-per-machine-rollup.json` folds exactly 19,574,784 rows / 12 machines / 0 dead / 0 malformed — count == cardinality (R12 proof, not "looks done").
- **Covering-array (Path 3) = DONE** (commit `20203ca93e`): 808 rows, 100% pairwise (t=2) DOE coverage of the 7.3T FULL space, with an independent `verifyCoverage` oracle.
- Raw per-cell corpus: 200 × ~61MB ≈ **12GB** of `state/outcomes/sfc-per-machine-core.shard*of200.jsonl` (gitignored; the closed-loop training corpus / evidence).
- Durable scheduled task `PRISM SFC Per-Machine Sweep` re-registered, correctly tuned, dormant (confirm-complete ticks are cheap = 0 grind children; auto-resumes if outcomes are ever reset).

**Concurrency oversubscription fix** (commits `2889b4d5a6` + `4b01e9a51f`):
- `DEFAULT_CONCURRENCY` was `os.cpus().length - 4` = **28** on the 9950X3D (32 logical / **16 physical** cores). 28 CPU-bound JS shard children on 16 physical cores (shared box) **collapsed throughput** (live: conc-28 thrashed; conc-12 ran clean ~2.7x). Fixed → pure `safeConcurrency()` = PHYSICAL cores (logical/2) − 2 headroom = **14** on this box.
- Also closed a silent-no-op (R12): a garbage `--concurrency`/`PRISM_SFC_PM_CONCURRENCY` override → `NaN` → `runPool` 0 workers → dead-tick. Fixed → pure `resolveConcurrency()` (never NaN) + loud stderr warn + NaN-safe runPool clamp. 13/13 tests; 3-of-3 PASS (full UUID `3441c192-7f7a-4e0b-8bf4-5b5a9b1eb28e`).

**Honest framing (the math/physics, accepted by operator "1 and 3 it is"):**
- FULL space (7,302,960,000,000 cells) is NOT brute-forceable (~86 yr single-thread + petabytes of disk). CORE (19.6M, ~achievable) + covering-array DOE coverage IS the answer.
- **GPU is genuinely NOT a lever** for this sweep — the SFC physics (Kienzle/Taylor/Merchant/Altintas via `SpeedFeedNineAxisOrchestratorEngine`) is pure-CPU JS. "Utilize the box fully" = peak CPU throughput at ~physical-core concurrency; oversubscription REDUCES it. Do not fake GPU use for this sweep (GPU serves Ollama/NN/LoRA elsewhere).

**RESOLVED — the 222GB outcome-ledger (root-caused + fixed + reclaimed).** `state/outcomes/speed_feed.jsonl` had grown to **221.5GB** (PowerShell ground-truth). **R12 CORRECTION of an earlier-in-session claim:** the per-machine sweep DOES write it — transitively. `UltimateSpeedFeedEngine.calculate` -> `captureSFC` (`src/middleware/sfcOutcomeWire.ts`) -> `OutcomeCaptureBusEngine` appends a `recommendation_emitted` row to the global per-domain shard on EVERY calculate (unless `input.fast_bulk`, which skips it — `UltimateSpeedFeedEngine.ts:3223`). The 19.6M-cell sweep (no fast_bulk) appended ~19.6M x ~11KB ~= 215GB, redundantly duplicating the per-shard core ledgers. Fix (commits `43e12ec7af` + `4578cd6c6f`): env-gated `PRISM_SFC_DISABLE_OUTCOME_CAPTURE=1` guard in `captureSFC` (default OFF; single chokepoint covers all 6 SFC engines); the 4 bulk enumerators self-suppress (`sfc-per-machine-sweep`, `sfc-covering-array`, `sfc-all-axis-sweep`, `sfc-full-logical-sweep`) — the 2 fast_bulk ones (`sfc-fullspace-sweep` 1.46B, `sfc-batch-worker` 20M) were already safe. Verified e2e (103 cells, ledger delta 0). The 221.5GB reclaimed (oscar-domain shard, regenerable; consumer `SpeedFeedPSNDecisionPriorEngine` tolerates absence). H: free 1268 -> 1490 GB. See [[feedback_sfc_test_every_variation_per_machine]] · [[feedback_git_bash_large_file_garbage]].

Mandate doctrine (persisted prior session): `mcp-server/src/engines/speed-feed/CLAUDE.md` §0, `speed-feed/MEMORY.md` ⭐ STANDING MANDATE, spec `state/shared/specs/SFC-PER-MACHINE-FULLSPACE-MANDATE-2026-06-17.md`.
