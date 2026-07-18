# BLACKWELL-DB-GEN-MS0/U-CGP-CONCURRENCY — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-DB-GEN-MS0]/U-CGP-CONCURRENCY (slot:romeo): wire host-GPU-profile concurrency into the batch vision-OCR extractor — the real Blackwell DB-gen win (Fusion/hyperMILL/Mastercam/SFC catalog extraction).

**Commit:** `c0ce903f3593` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T08:34:48-05:00
**Tags:** blackwell-db-gen-ms0, u-cgp-concurrency, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-DB-GEN-MS0]/U-CGP-CONCURRENCY (slot:romeo): wire host-GPU-profile concurrency into the batch vision-OCR extractor — the real Blackwell DB-gen win (Fusion/hyperMILL/Mastercam/SFC catalog extraction).

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-DB-GEN-MS0]/U-CGP-CONCURRENCY (slot:romeo): wire host-GPU-profile concurrency into the batch vision-OCR extractor — the real Blackwell DB-gen win (Fusion/hyperMILL/Mastercam/SFC catalog extraction).

Converts the serial spawnSync loop (one catalog/blueprint print at a time) into a BOUNDED ASYNC WORKER POOL driven by catalog-gpu-profile.detectGpuTier().concurrency: 96GB Blackwell -> N parallel vision-OCR workers, 16GB host stays x1 (behaviorally identical to the old serial loop). Closes the R12 gap where the profile *recommended* x3 but nothing consumed it (fabricated speedup).

HONEST inference bound (2-arm scrutiny P0, both reviewers): the x N inference win only materializes up to the Ollama server's OLLAMA_NUM_PARALLEL slots (client can't raise it mid-run). New resolveOllamaParallel(env) reads the live value; main() reports the slot-bounded truth in all 3 cases (slots>=workers -> true xN; slots<workers -> inference SERIALIZES to xslots, only CPU render/IO overlaps; unset -> UNVERIFIED). estimateExtractionPlan now bounds concurrencySpeedup = min(workers, ollamaParallel), never workers. On THIS host (OLLAMA_NUM_PARALLEL=2) the blackwell tier honestly reports x2 effective, not x3.

Contention gate (scrutiny P1): a CPU-spilled (non-resident) VL model forces serial — reuses the existing claimGpu /api/ps residency probe, no new I/O. Structural fail-soft: worker() try/catch so a rejecting runImpl can never abort the pool (in-flight progress checkpointed). SHA-checkpoint/resume, --limit, time-budget, dry-run all preserved; claim is atomic (no await in claimNext).

+11 tests batch (41/41) +3 profile (29/29). Per-file 2-arm scrutiny: PASS/PASS after a FAIL->fix->re-dispatch cycle (reviewer B caught the OLLAMA_NUM_PARALLEL honesty gap; fixed + re-verified). --concurrency N override; deps injectable for hermetic tests.
```

## Files touched (5)
- scripts/batch-ollama-vision-extract.mjs      | 225 ++++++++++++++++++++++++++++++++++++++++--------
- scripts/batch-ollama-vision-extract.test.mjs | 227 ++++++++++++++++++++++++++++++++++++++++++++++++-
- scripts/lib/catalog-gpu-profile.mjs          |  31 +++++--
- scripts/lib/catalog-gpu-profile.test.mjs     |  24 ++++++
- 4 files changed, 464 insertions(+), 43 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c0ce903f3593`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-DB-GEN-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._